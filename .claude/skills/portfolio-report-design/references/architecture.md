# Architecture — where the real report pipeline lives

Read this before touching any report code. The project already has a working, production report — the job is to extend it, not replace it with a parallel system.

## Frontend (main.js)

- **Entry point:** the report button opens `reportRangeModal` via `openReportRangeModal()`, wired in `_wireReportRangeModal()`. User picks a date range (calendar inputs + 1M/3M/6M/YTD/1A/Todo presets), submit calls `exportPortfolioPDF(startStr, endStr)`.
- **Data computation:** `computeHistoricalReport(portfolio, startStr, endStr)` — the single source of truth for report metrics. It reconstructs holdings *as of* `endStr` (via `buildAllPositionHistory` filtered by purchase/sell dates), fetches as-of closing prices, and computes value/P&L, period attribution, a cost-weighted daily-return series inside the window, risk metrics (Sharpe/Sortino/volatility/VaR/beta/max drawdown via `calcMetrics`/`calcMaxDrawdown`/`calcBeta`), benchmark comparison, transactions/dividends/commissions in the period, and FX exposure. It takes the `portfolio` object directly — **this is the existing scoping mechanism**: whatever portfolio object gets passed in is the only data that can appear in the report. Cash is only included if `endStr` is today (no historical cash reconstruction). FX uses current rates as an approximation for historical conversions.
- **Return shape:** see `references/data-contract.md` for the exact fields — it's a direct mirror of this function's return object, not an invented shape.
- **Rendering:** `exportPortfolioPDF` builds an HTML string with numbered sections (Diagnóstico ejecutivo, Rendimiento vs benchmark, Riesgo y volatilidad, Distribución y diversificación, Atribución de resultados, Operaciones cerradas, Posiciones, Historial de transacciones, Calidad de datos y supuestos, Acciones de rebalanceo IA, Glosario y metodología), renders it inside a hidden iframe sized to A4 at 96dpi (794px), then downloads it directly via `html2pdf.js` loaded lazily from a CDN (`_loadHtml2Pdf`). It does **not** open a new tab or use `window.print()`.
- **Charts:** inline SVG helpers — `_pdfBuildAllocationSVG`, `_pdfBuildLineSVG`, `_pdfBuildDrawdownSVG`, `_pdfBuildContribSVG`, `_pdfBuildBarsSVG`. Each expects a specific row shape; e.g. `_pdfBuildContribSVG` requires `{ticker, value}` (not `{ticker, pp}`) — passing the wrong shape throws, and the export handler wraps the whole flow in try/finally **without a catch**, so a thrown error hangs the UI on the loading spinner instead of surfacing an error. Any new chart helper must follow the same defensive shape-checking the others do, or must not be called from inside that try/finally without its own guard.
- **Page-break gotcha:** page-break CSS rules must live **outside** `@media print` blocks — `html2pdf.js` renders the iframe at normal screen size, not in an actual print context, so `@media print` rules never apply during export.

## Internationalization (i18n)

The app already has a language system — reports must plug into it, not invent one:

- **`currentLang`** (main.js ~14796): `localStorage.getItem(langStorageKey) || "es"`, switched from Settings ("Idioma" section, ~14722). Supported values: **es, en, fr** — note French exists; a report i18n map that only covers es/en is incomplete.
- The existing PDF export hardcodes Spanish section titles ("Diagnóstico ejecutivo", "Glosario y metodología", …) and `es-MX` date formatting — that's pre-existing debt the redesign must fix, not replicate. All static report strings (section titles, KPI labels, chart legends, footnote boilerplate, glossary entries) belong in a per-language map keyed by `currentLang`; dates/numbers format via `toLocaleDateString`/`Intl.NumberFormat` with the matching locale.
- The AI side already supports this: `InsightsRequest.lang` (api.py ~2547, default `"es"`) — pass `currentLang` through so narrative matches the UI. The system prompt's language line handles es/en today; extend it for fr when wiring this up.

## Currency conversion (FX) — the part that's easy to get wrong

A position's stored `currency` field is **not authoritative** and must never be trusted on its own — this bit a first evaluation prototype of this skill (see the jul-2026 evaluation: it reported a portfolio worth $5,466 when the real value was ~$1,300, because the prototype read `position.currency` directly instead of replicating this logic).

- **`detectCurrencyFromTicker(ticker)`** (main.js ~8149) maps ticker suffixes to their real trading currency via `TICKER_CURRENCY_SUFFIXES` (`.MX`→MXN, `.SA`→BRL, `.L`/`.IL`→GBP, `.PA`/`.DE`/`.MC`/`.MI`/`.AS`/`.BR`/`.LS`/`.VI`→EUR, `.TO`/`.V`→CAD, `.AX`→AUD, `.NZ`→NZD, `.HK`→HKD, `.T`→JPY, `.SS`/`.SZ`→CNY).
- **`getPosCurrency(pos, fallback)`** (main.js ~8158) = `detectCurrencyFromTicker(pos.ticker) || pos.currency || fallback`. The code comment states the rule explicitly: *"El sufijo del ticker (.MX, .DE, etc.) es autoritativo: Yahoo cotiza esos mercados SIEMPRE en su divisa local, sin importar lo que se haya guardado."* — the ticker suffix wins over whatever was saved on the position, every time. A position can have `currency: "USD"` stored (e.g. a data-entry default that was never corrected) while actually trading in MXN on Yahoo — `getPosCurrency` silently and correctly overrides this. **Any report implementation must call the equivalent of `getPosCurrency`, never read a position's raw `currency` field directly.**
- **`buildAllPositionHistory`** (main.js ~12974, feeds `computeHistoricalReport`) already calls `getPosCurrency(pos, portfolioCur)` when building each lot — so the production report pipeline gets this right today. A reimplementation (Python, or any other language/runtime) must replicate `TICKER_CURRENCY_SUFFIXES` + the suffix-first precedence, not just port the stored field.
- **`convertAmount(amount, fromCurrency, toCurrency)`** (main.js ~8120) = `amount * getCachedExchangeRate(fromCurrency, toCurrency)`, or the amount unchanged if `fromCurrency === toCurrency`.
- **`fetchExchangeRates(fromCurrencies, toCurrency)`** (main.js ~8134) fetches each pair as a synthetic ticker `${from}${toCurrency}=X` (e.g. `MXNUSD=X`) through the same Yahoo Finance price endpoint used for equities — no separate FX API/key. A Python reimplementation can fetch the identical symbol via `yf.Ticker(f"{from}{to}=X")`.
- **Historical reports use *today's* FX rate as an approximation**, not the rate on the historical date — already noted in memory/CLAUDE.md context. Don't try to backfill historical FX rates; match existing behavior.
- **Worked example (Uriel GBM, jul-2026 eval):** `FMTY14.MX` — a BMV-listed FIBRA — was stored with `currency: "USD"` and `avgPrice: 14.91` (that number is actually its MXN quote). `getPosCurrency` correctly resolves its currency to `MXN` from the `.MX` suffix regardless of the stored field, so `computeHistoricalReport` fetches its native MXN price and converts via `MXNUSD=X` (~0.054), landing near the position's true ~$240 USD value instead of treating 298 shares × ~$14.80 as if it were already USD (~$4,410 — the wrong number the prototype produced).

## Backend (api.py)

- **AI insights endpoint:** `POST /api/ai/insights` (~line 2597). Gated by `current_ai_user` (auth + plan check) and `consume_ai_quota`. Responses are cached by a hash of `(kind, lang, top_model, payload_text)` via `ai_cache_get`/the cache-key helper — identical inputs don't re-spend quota or tokens.
- **Per-plan model routing:** `models_for_plan(plan)` (~line 2527) resolves a plan (`Explorer` / `Investor` / `Advisor Pro` / `Wealth Desk`) to an ordered model chain: the plan's own model first, then every model from *lower* tiers as fallback (never upward — a cheap plan never silently gets billed at a premium model, and a premium plan never silently downgrades except on failure). Default chain (overridable per-tier via `OPENROUTER_MODEL_*` env vars):
  - Explorer → `google/gemini-2.5-flash-lite`
  - Investor → `deepseek/deepseek-v4-flash`
  - Advisor Pro → `anthropic/claude-sonnet-5`
  - Wealth Desk → `anthropic/claude-opus-4.8`
  `_openrouter_chat(models, messages)` walks the chain in order, moving to the next model on network error, non-200, or an empty response. **Reuse this function and this chain — do not build a second model-selection path for the redesigned report.**
- **System prompt today:** already enforces narrative prose (not bullet lists), money-before-percent phrasing using `capital_base_periodo`/`resultado_periodo`/`valor_actual`, one concrete figure per sentence, materiality thresholds (position >10%, contribution >1pp, exposure >20%), causal attribution explanations, and metric-interpretation ranges for Sharpe/Sortino/HHI/beta. New tone voice modifiers and news-grounding context should be **appended** to this system prompt, not used to replace its rigor rules.
- **Payload limits:** `_AI_MAX_PAYLOAD_BYTES` (default 64KB) caps what can be sent to the model — keep any added news/context payload compact (see `references/news-research.md` for the size discipline).
- **Failure mode today:** if every model in the chain fails, the PDF still generates — it shows the failure reason (`aiError`) in a `.warn` block in the executive summary instead of blocking the whole report. Any new AI-dependent step (news-grounded insights, tone-specific narrative) must degrade the same way.

## Pexels imagery — the key exists (corrected jul-2026)

An earlier version of this file claimed no `PEXELS_API_KEY` was configured. **That was wrong**, and it's why the first deck builds shipped with no photography at all:

- `PEXELS_API_KEY` is set on the Railway service **`blackportfolio-api`** (verified with `railway variables --service blackportfolio-api`).
- api.py already uses it: `PEXELS_KEY` (~line 1706) backs `GET /api/gallery` (~line 2274), which proxies Pexels photo+video search so the key never reaches the browser. That endpoint's query is currently hardcoded (`"stock market trading finance charts"`) — extend it with a server-side-whitelisted `query` param rather than adding a second proxy.
- For **offline/generation-time** work (an agent building a deck outside the app), inject the key without ever printing it:
  ```bash
  railway run --service blackportfolio-api -- python .claude/skills/portfolio-report-design/scripts/fetch_pexels_images.py
  ```
- Degradation is still mandatory: no key, no network, or a failed request → tone gradient cover, never a blank or broken panel.

## Scoping — the non-negotiable part

`computeHistoricalReport`/`exportPortfolioPDF` only ever see the one `portfolio` object the caller passes in, resolved from `activePortfolioId` in an already-authenticated session. Any **new** server endpoint this feature needs (e.g. to serve an interactive HTML report, or to run the news-fetch/AI step server-side instead of client-side) must follow the same pattern the rest of the API already uses: verify the Firebase ID token, resolve `uid`, and confirm the requested `portfolio_id` actually belongs to that `uid` server-side before returning or computing anything — never trust a client-supplied portfolio id or user id for data selection. Match the pattern already used by `/api/account/bootstrap` and `PUT /api/account/portfolios`.

## What this project does *not* have (don't assume it)

- No Python headless-browser PDF renderer (no Playwright/WeasyPrint/wkhtmltopdf). PDF export is 100% client-side via `html2pdf.js`. Don't introduce a server-side render step for PDF.
- No news API integration yet. `yfinance` is already a dependency (`requirements.txt`) — its `Ticker.news` property is the free option, see `references/news-research.md`.
- No interactive-HTML report mode in the app yet — today there's only the PDF export path. Building the in-app interactive view (with a tone selector) is new feature work, not a restyle of something that exists.
