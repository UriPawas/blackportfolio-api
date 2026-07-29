# Position-level news research

> This file covers **fetching** headlines. Turning them into insight — the event → mechanism → portfolio-impact → watch structure, the quantification rules, and the rendering of mover cards — is `references/market-narrative.md`. A report that prints headlines without a quantified portfolio impact fails review.

Goal: a fast, cheap, grounded answer to "what happened in the market that specifically moved this portfolio's winners and losers this period" — not a general news feed, and not the LLM guessing at causes.

## Selection — don't fetch news for every holding

1. Start from `composition.posData` (or the equivalent attribution rows already computed by `computeHistoricalReport`).
2. Rank by `periodPnl` (or attribution pp if available).
3. Take the **top 3 positive** and **top 3 negative** contributors. Fewer if the portfolio has fewer than ~6 positions.
4. Drop anything with negligible contribution (< ~0.5pp or an immaterial dollar amount relative to portfolio value) — matches the materiality thresholds the existing AI system prompt already enforces (position >10%, contribution >1pp). Don't burn a news lookup on noise.

This keeps the news step to at most ~6 tickers per report regardless of portfolio size.

## Fetching — no new API key required

`yfinance` is already a project dependency (`requirements.txt`). Use `Ticker(symbol).news`:

```python
import yfinance as yf

def fetch_ticker_news(symbol: str, start_date: str, end_date: str, max_items: int = 3):
    items = yf.Ticker(symbol).news or []
    out = []
    for it in items:
        content = it.get("content", it)  # yfinance news schema has shifted across versions — check both shapes
        title = content.get("title")
        pub_date = content.get("pubDate") or content.get("providerPublishTime")
        if not title:
            continue
        # keep headlines from roughly the report window, with a few days' grace
        # (news that explains a move often posts a day or two before/after the price reaction)
        out.append({"title": title, "source": (content.get("provider") or {}).get("displayName", ""), "published_at": pub_date})
        if len(out) >= max_items:
            break
    return out
```

Verify the exact response shape against the installed `yfinance==0.2.61` at implementation time — its news schema has changed between versions before. If `Ticker.news` returns nothing (thin coverage — small caps, some ETFs/crypto), **omit that ticker's news entirely**. Never fabricate a headline or an event.

## Caching

Cache per `(ticker, date)` for the day — a report re-rendered multiple times in one session (tone changes, plan changes) shouldn't refetch news each time. This mirrors the existing `ai_cache_get`/insights caching pattern in api.py.

## Feeding it to the AI prompt

Pass the `news` array (see `references/data-contract.md`) as compact, structured JSON alongside the existing metrics payload — not as raw prose. Keep it tight: title + source + date per headline, capped at 3 headlines per ticker, capped at ~6 tickers. This is deliberately small relative to `_AI_MAX_PAYLOAD_BYTES` (64KB default) so it doesn't crowd out the metrics payload it's meant to support.

Tell the model explicitly (in the system or user message) that these headlines are the *only* source of "why" it's allowed to cite for a specific ticker's move — if a mover has no news entry, the model should describe the move in terms of the metrics themselves, not speculate about a cause. This directly extends the existing system prompt's rule #3 ("cada frase debe apoyarse en una cifra concreta del JSON") to also cover causal claims about news events.
