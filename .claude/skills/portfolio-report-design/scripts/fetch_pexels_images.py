"""
Pexels image search/download helper for the portfolio report.

The key EXISTS: `PEXELS_API_KEY` is configured on the Railway service
`blackportfolio-api` (api.py reads it for the `/api/gallery` proxy). Run this
with the key injected, never pasted:

    railway run --service blackportfolio-api -- python scripts/fetch_pexels_images.py

In-app, imagery must go through the existing `/api/gallery` proxy so the key
never reaches the browser.

Usage rules (see SKILL.md and references/html-presentation.md § Imagery):
- Query terms must stay generic/financial ("city skyline finance", "minimal
  architecture", "market data screen") — never search for or use images of
  identifiable real people.
- Cache results by query; don't refetch on every report render.
- Graceful degradation: if the key is missing or the request fails, callers
  should fall back to a solid-color/gradient cover (tone-driven, see
  assets/tone-tokens.css) rather than fail the report.
"""

import os
import json
import hashlib
from pathlib import Path

import requests

PEXELS_API_KEY = os.environ.get("PEXELS_API_KEY", "")
PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search"

CACHE_DIR = Path(__file__).resolve().parent.parent / ".cache" / "pexels"

# Generic, tone-agnostic fallback queries — pick per-tone imagery density from
# assets/tone-tokens.css (--tone-imagery-density) before deciding whether to
# call this at all; `minimal`/`institutional` tones want zero or one image.
DEFAULT_QUERIES = [
    "city skyline finance",
    "minimal architecture",
    "market data screen",
    "modern office glass",
]

# Sector → query. Derive the report's imagery from the portfolio's actual
# holdings so the cover/dividers relate to what the report is about, instead of
# the same generic skyline on every render. Keys match yfinance's `sector`
# strings (Ticker.info) plus a few local asset classes.
SECTOR_QUERIES = {
    "Technology": "data center server room",
    "Communication Services": "fiber optic network abstract",
    "Energy": "oil refinery night",
    "Financial Services": "city skyline finance",
    "Real Estate": "modern architecture facade",
    "Consumer Cyclical": "retail store shelves",
    "Consumer Defensive": "supermarket aisle products",
    "Healthcare": "laboratory research equipment",
    "Industrials": "factory automation robotic arm",
    "Basic Materials": "steel mill industrial",
    "Utilities": "power transmission lines dusk",
    "crypto": "abstract digital network",
    "etf": "stock exchange building",
}


def query_for_sectors(sectors: list[str]) -> str:
    """Picks the query for the portfolio's dominant sector, generic fallback."""
    for s in sectors:
        if s in SECTOR_QUERIES:
            return SECTOR_QUERIES[s]
    return DEFAULT_QUERIES[0]


def _cache_path(query: str) -> Path:
    key = hashlib.sha256(query.encode("utf-8")).hexdigest()
    return CACHE_DIR / f"{key}.json"


def search_photos(query: str, per_page: int = 5) -> list[dict]:
    """Returns a list of {id, url, photographer, src} dicts, or [] on any failure."""
    if not PEXELS_API_KEY:
        return []

    cache_file = _cache_path(query)
    if cache_file.exists():
        try:
            return json.loads(cache_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass

    try:
        r = requests.get(
            PEXELS_SEARCH_URL,
            headers={"Authorization": PEXELS_API_KEY},
            params={"query": query, "per_page": per_page, "orientation": "landscape"},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
    except requests.RequestException:
        return []

    photos = [
        {
            "id": p["id"],
            "photographer": p.get("photographer", ""),
            "src": p.get("src", {}).get("large2x") or p.get("src", {}).get("large"),
            "avg_color": p.get("avg_color"),
        }
        for p in data.get("photos", [])
    ]

    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_file.write_text(json.dumps(photos, ensure_ascii=False), encoding="utf-8")
    except OSError:
        pass

    return photos


def pick_cover_image(tone: str, section_hint: str = "") -> dict | None:
    """Picks one image appropriate for the report cover, respecting tone density."""
    zero_imagery_tones = {"minimal"}
    if tone in zero_imagery_tones:
        return None

    query = section_hint or DEFAULT_QUERIES[0]
    photos = search_photos(query, per_page=3)
    return photos[0] if photos else None
