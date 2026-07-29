# Data Contract

This mirrors the **real** return shape of `computeHistoricalReport(portfolio, startStr, endStr)` in main.js, plus the additions this skill introduces (`meta` scoping fields, `tone`, `news`). Write a thin adapter that maps the function's actual return object into this shape — don't reshape the report template around whatever's convenient, and don't invent fields the tracker doesn't compute.

```json
{
  "meta": {
    "portfolio_id": "string — portfolio.id, the ONLY scoping key",
    "owner_uid": "string — resolved server-side from the Firebase ID token, never client-supplied",
    "portfolio_name": "string",
    "currency": "USD",
    "period_label": "string, localized to `lang`, e.g. '1 ene 2026 – 30 jun 2026'",
    "generated_at": "2026-07-23",
    "tone": "brand (default) | gradient | premium-dark | editorial | institutional | minimal",
    "lang": "es | en | fr — the app's currentLang at generation time; drives every static string AND the AI narrative language"
  },
  "kpis": {
    "totalValueEnd": 0,
    "totalCostEnd": 0,
    "cashAtEnd": 0,
    "periodReturnPct": 0,
    "cagrPct": 0,
    "periodResultAmt": 0,
    "periodResultPct": 0,
    "periodCapitalBase": 0
  },
  "risk_metrics": {
    "sharpe": 0,
    "sortino": 0,
    "volatility": 0,
    "var": 0,
    "beta": 0,
    "currentWeightedBeta": 0,
    "historicalBeta": 0,
    "maxDD": 0
  },
  "performance_series": {
    "equityCurve": [{ "date": "MM-DD", "value": 0 }],
    "benchCurve": [{ "date": "MM-DD", "value": 0 }],
    "benchmarkLabel": "string",
    "sessions": 0
  },
  "composition": {
    "posData": [
      {
        "pos": { "ticker": "string", "quantity": 0, "avgPrice": 0, "currency": "USD", "purchaseDate": "2026-01-01" },
        "currentValuePf": 0,
        "costInPf": 0,
        "pnlAmt": 0,
        "pnlPct": 0,
        "periodPnl": 0
      }
    ],
    "fxExposure": { "USD": 0 }
  },
  "activity": {
    "closedTradesInWindow": [],
    "totalRealizedPnl": 0,
    "totalRealizedCost": 0,
    "totalRealizedProceeds": 0,
    "txInWindow": [],
    "totalTxCount": 0,
    "totalComm": 0,
    "dividends": [],
    "totalDividends": 0
  },
  "data_quality": {
    "missingPrices": ["ticker, if a price couldn't be resolved as-of a date"]
  },
  "news": [
    {
      "ticker": "string",
      "contribution_pp": 0,
      "direction": "positive | negative",
      "headlines": [
        { "title": "string", "source": "string", "published_at": "2026-06-15" }
      ]
    }
  ],
  "highlights": [
    { "headline": "string, stated finding not a topic label", "body": "one supporting sentence" }
  ],
  "footnotes": [
    "Definitions and calculation notes — same role as the numbered notes in the reference decks."
  ]
}
```

## Notes

- `meta.portfolio_id` + `meta.owner_uid` are **not** decorative — every render must verify these actually match the authenticated caller before any data leaves the server. See `references/architecture.md` for the ownership-check pattern already used elsewhere in the API.
- `composition.posData` is the same row shape `computeHistoricalReport` already produces — don't rename fields when mapping.
- **Never flag a currency mismatch from `pos.currency` alone.** A position's stored `currency` is not authoritative — see `references/architecture.md`'s FX section for `getPosCurrency`/`detectCurrencyFromTicker`. Checking only `pos.currency` (e.g. "this `.MX` ticker says USD, that looks wrong") produces false positives on positions the app already converts correctly via the ticker-suffix rule. Only flag `data_quality` issues that are real after applying suffix-based currency detection + live FX conversion, not before.
- `news` is populated by `scripts/fetch_position_news.py` per `references/news-research.md`. Only the top ~3 positive and top ~3 negative contributors get an entry; everything else is omitted, not zero-filled.
- `highlights` can come directly from `/api/ai/insights` (parsed via the existing `_parseAISections` keyword parser: Tesis/Atribución/Riesgos/Desempeño/Rebalanceo) — this contract doesn't replace that parsing, it's what gets handed to it as grounding input alongside the metrics.
- Every field is per-render data. None of it belongs hardcoded in a template or script.
