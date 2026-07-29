# "Qué movió al mercado" — from headlines to portfolio insight

`references/news-research.md` covers *fetching* headlines. This file covers the part that failed in review: a deck slide that printed three headlines and stopped. A headline is raw material, not an insight. **A headline without a quantified effect on this portfolio does not ship.**

## The unit: a mover card

One card per mover (top 3 contributors and bottom 3 detractors, materiality-filtered per `news-research.md`). Every card is the same four-bullet structure, and **every bullet is anchored to a number that exists in the data contract**:

```json
{
  "ticker": "ASR.MX",
  "direction": "negative",
  "contribution_pp": -1.8,
  "pnl_amount": -412.40,
  "price_move_pct": -12.3,
  "weight_start_pct": 14.2,
  "weight_end_pct": 11.9,
  "event":     { "text": "...", "source": "Barron's", "date": "2026-06-10", "url": "https://..." },
  "mechanism": { "text": "...", "grounded_in": "event | metrics" },
  "impact":    { "text": "..." },
  "watch":     { "text": "...", "trigger": "reporte 2T · 22 jul" }
}
```

### Bullet 1 — Evento (what happened)

Dated and sourced, ≤18 words, plus the position's own move in the window.
> **10 jun · Barron's** — Tensión en Medio Oriente y costo del combustible llevan a aerolíneas y aeropuertos a mínimos. La posición cedió **−12.3%** en el periodo.

### Bullet 2 — Mecanismo (why the price reacted)

The causal chain, and it may **only** use what the fetched article actually says. This is where invented causality usually creeps in.
> El combustible es ~30% del costo operativo de las aerolíneas; menos vuelos programados se traduce directo en menos pasajeros por terminal, que es la base tarifaria del operador aeroportuario.

**No news for that ticker?** Do not guess and do not skip the bullet — replace it with a metrics-grounded explanation, and mark `grounded_in: "metrics"`:
> Sin catalizador propio identificado: cayó **−12.3%** con beta **1.4** mientras el índice cedió **−6.1%** — el movimiento es ~2x el del mercado, consistente con su beta, no con una noticia específica.

### Bullet 3 — Impacto en el portafolio (the bullet that was missing)

**Money first, then percentage** — same rule the api.py system prompt already enforces. Always three quantities: dollars, contribution in pp of the period return, and the weight shift.
> Restó **US$ 412** al resultado del periodo: **−1.8 pp** del **−3.2%** total. Su peso bajó de **14.2%** a **11.9%**, así que la concentración se corrigió sola — sin vender una acción.

### Bullet 4 — A vigilar (optional, only when there's a real trigger)

A dated catalyst (`Ticker.calendar` gives the next earnings date) or a metric level that would change the reading. Never a recommendation to buy/sell.
> Próximo reporte trimestral **22 jul**: el tráfico de pasajeros mensual es el dato que confirma o desmiente la tesis.

---

## The section, not just the cards

Three slides, in this order:

1. **Contexto de mercado** (strip slide) — what the window looked like *outside* the portfolio: benchmark return, the FX move for every currency with ≥5% exposure, and the rate/macro fact if it's material. This is what lets the next slide say "el mercado explicó X, tú explicaste Y".
2. **Ganadores** — `cards-3`, positive movers.
3. **Detractores** — `cards-3`, negative movers.

Close the section with a **decomposition line** that is itself an insight, not a summary:
> El mercado explicó **−1.9 pp** de tu **−3.2%**; los **−1.3 pp** restantes vinieron de la concentración en aeropuertos mexicanos. **4 de 6** movimientos tienen catalizador identificable.

### Deck rendering of a card

Card = ticker + direction chip + the big contribution figure (`−1.8 pp`, gradient-clipped) + a `sparkline` of that position across the window + the four bullets. Hover expands to show source, date and a link to the article; the sparkline gets a crosshair. The three cards share one baseline so the figures align optically.

Copy discipline for the deck: each bullet ≤ 2 lines at 20–22px. If a bullet needs three lines, it belongs in the PDF — the deck carries the compressed version, the PDF runs the full prose.

---

## Enrichment beyond the headline

`Ticker.news` items carry more than a title. Use it:

- `content.summary` / `content.description` → the raw material for the **mechanism** bullet. Never write a mechanism the summary doesn't support.
- `content.canonicalUrl.url` / `clickThroughUrl` → the hover link (attribution, and it makes the claim auditable).
- `content.provider.displayName` + `pubDate` → source + date, both mandatory on screen.
- `Ticker.calendar` → next earnings date for the **watch** bullet.
- `Ticker.info` → `sector` / `industry`, which feeds both the sector context line and the Pexels query for that section's imagery.

When generating a report interactively (agent in the loop, not the in-app pipeline), a `WebSearch`/`WebFetch` pass on the mover's ticker + period is allowed to confirm or deepen the mechanism — **cache it, cite the source on the card, and never let it invent an event that no source states**. The in-app pipeline stays on yfinance only; treat web enrichment as a generation-time bonus, not a dependency.

## AI prompt shape

Ask the model for the card JSON above, not for prose — the deck needs bullets and the parser shouldn't be guessing at paragraph boundaries. Append to the existing `/api/ai/insights` system prompt (don't replace its rigor rules):

- The `news` array is the **only** admissible source for causal claims; a mover with no headline gets `grounded_in: "metrics"`.
- Every bullet cites at least one figure from the metrics payload; the impact bullet must contain money, pp and the weight shift.
- Two-line maximum per bullet, in `lang`.
- No buy/sell/hold recommendations, no price targets, no "diversifica más" boilerplate — the existing prompt already forbids generic advice; this extends it to the news section.

**Fallback is mandatory and deterministic.** If the model chain fails entirely, build the cards from the metrics alone: event bullet = the headline (if any) rendered verbatim with source/date, mechanism = the metrics-grounded template, impact = a formatted string from `periodPnl` / contribution pp / weights. The section always renders. A blank "qué movió al mercado" is a failed build, not a degraded one.

## Anti-patterns (each one observed in review)

- **Headline dump** — three titles, no effect on the portfolio. This is the failure this file exists to prevent.
- **Unquantified causality** — "la tensión geopolítica afectó al portafolio" with no dollars and no pp.
- **One macro cause for every ticker** — if three unrelated positions all "cayeron por las tasas", at least two of those claims are invented.
- **Stale headline passed off as the cause** — a headline from outside the window (±a few days' grace) doesn't explain a move inside it.
- **Recommendation dressed as analysis** — "conviene reducir aeropuertos" is not an insight, it's unlicensed advice the prompt already forbids.
- **Ticker with no news rendered as an empty card** — omit the card, or render it with the metrics-grounded mechanism. Never an empty slot.
