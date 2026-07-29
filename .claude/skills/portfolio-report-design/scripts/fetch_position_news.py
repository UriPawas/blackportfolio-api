"""
Per-ticker news fetcher for the portfolio report's top movers.

Not wired into the app yet — reference implementation for when the report's
AI insights step gets extended with news grounding (see
references/news-research.md). Uses yfinance, already a project dependency
(requirements.txt) — no new API key required.

Selection is the caller's job: pass in only the top ~3 positive and top ~3
negative contributors for the reported period (by periodPnl/attribution pp),
already filtered for materiality. This module does not rank positions itself.
"""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

import yfinance as yf

CACHE_DIR = Path(__file__).resolve().parent.parent / ".cache" / "news"
CACHE_TTL_SECONDS = 24 * 60 * 60  # one day — matches "per (ticker, date)" caching rule


def _cache_path(ticker: str, day: str) -> Path:
    key = hashlib.sha256(f"{ticker}|{day}".encode("utf-8")).hexdigest()
    return CACHE_DIR / f"{key}.json"


def fetch_ticker_news(symbol: str, as_of_day: str, max_items: int = 3) -> list[dict]:
    """Returns up to `max_items` headline dicts, or [] if none/failed.

    Each item: {title, source, published_at, summary, url}. `summary` and `url`
    are what turn a headline into an insight — the summary is the only
    admissible raw material for the "mechanism" bullet, and the url makes the
    claim auditable on hover. See references/market-narrative.md.

    Never raises — a missing-news ticker should be omitted from the report,
    not treated as an error.
    """
    cache_file = _cache_path(symbol, as_of_day)
    if cache_file.exists() and (time.time() - cache_file.stat().st_mtime) < CACHE_TTL_SECONDS:
        try:
            return json.loads(cache_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass

    out: list[dict] = []
    try:
        raw = yf.Ticker(symbol).news or []
    except Exception:
        raw = []

    for item in raw:
        # yfinance's news schema has shifted across versions — some releases
        # nest fields under "content", older ones don't. Check both.
        content = item.get("content", item) if isinstance(item, dict) else {}
        title = content.get("title")
        if not title:
            continue
        provider = content.get("provider") or {}
        published = content.get("pubDate") or content.get("providerPublishTime") or ""
        canonical = content.get("canonicalUrl") or content.get("clickThroughUrl") or {}
        url = canonical.get("url", "") if isinstance(canonical, dict) else (canonical or "")
        summary = content.get("summary") or content.get("description") or ""
        out.append({
            "title": title,
            "source": provider.get("displayName", "") if isinstance(provider, dict) else "",
            "published_at": published,
            # trimmed: the mechanism bullet needs a couple of sentences, not the
            # whole article — and _AI_MAX_PAYLOAD_BYTES is shared with the metrics
            "summary": (summary or "")[:400],
            "url": url,
        })
        if len(out) >= max_items:
            break

    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_file.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    except OSError:
        pass

    return out


def next_catalyst(symbol: str) -> str:
    """Next scheduled earnings date, for the mover card's 'a vigilar' bullet.

    Returns "" when yfinance has no calendar for the symbol (common for ETFs,
    FIBRAs and crypto) — in that case the card simply omits that bullet.
    """
    try:
        cal = yf.Ticker(symbol).calendar or {}
        dates = cal.get("Earnings Date") if isinstance(cal, dict) else None
        if isinstance(dates, list) and dates:
            return str(dates[0])
        return str(dates) if dates else ""
    except Exception:
        return ""


def build_news_context(movers: list[dict], as_of_day: str, max_items_per_ticker: int = 3) -> list[dict]:
    """movers: [{ticker, contribution_pp, direction}] — already selected/filtered by the caller.

    Returns the `news` array shape from references/data-contract.md, omitting
    any ticker with no headlines found rather than zero-filling it.
    """
    result = []
    for mover in movers:
        headlines = fetch_ticker_news(mover["ticker"], as_of_day, max_items_per_ticker)
        if not headlines:
            continue
        result.append({
            "ticker": mover["ticker"],
            "contribution_pp": mover.get("contribution_pp"),
            "direction": mover.get("direction"),
            "headlines": headlines,
            "next_catalyst": next_catalyst(mover["ticker"]),
        })
    return result
