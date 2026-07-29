# Interactive HTML presentation — build spec

This is the binding spec for the **horizontal animated deck** deliverable (the PDF is a different document; see `design-system.md`). It exists because the first builds failed in five specific, repeatable ways:

| Failure observed | Root cause | Fixed by |
|---|---|---|
| Charts looked like library defaults | Chart.js used with stock styling | [Charts](#charts) — hand-rolled animated SVG, zero library defaults |
| Typography small and inert | Sizes authored in viewport-relative guesswork | [Stage model](#stage-model) + [Type scale](#type-scale) |
| Motion only on slide change | Motion treated as a transition, not a choreography | [Motion](#motion-choreography) |
| Big empty areas | One centered block per slide | [Density](#density--slide-grammar) — 4-layer grammar, ≥78% fill |
| Imagery missing | Skill wrongly claimed no Pexels key existed | [Imagery](#imagery-pexels) |
| Headlines with no insight | News fetched but never tied to the portfolio | `references/market-narrative.md` |

Anything below stated as a number (78%, 16px, 900ms) is a floor/ceiling, not a suggestion.

---

## Stage model

**Every slide is a fixed 1600×900 design canvas scaled to fit the viewport.** Never author a slide in viewport units and hope it lands.

```css
.stage { width:1600px; height:900px; transform: scale(var(--fit)); transform-origin: center; }
```
```js
const fit = Math.min(innerWidth / 1600, innerHeight / 900);
document.documentElement.style.setProperty('--fit', fit);
```

Why this is non-negotiable:

- A 68px number is 68px *of the design canvas* — it stays proportionally huge on a 13" laptop and on a projector. This is the actual fix for "tipografía muy chica"; type-size rules mean nothing without a fixed canvas behind them.
- Layout math becomes absolute (a chart is 880×420, not "about 60%"), so the density rules below are checkable.
- One breakpoint instead of six. Below 900px wide (phones), fall back to a vertically stacked, scroll-through variant of the same slides — don't try to scale 1600px onto a 390px screen.

The deck is **always landscape**. If the viewport is portrait, show a rotate hint over a still-usable stacked fallback.

---

## Type scale

Design pixels on the 1600×900 stage. `font-variant-numeric: tabular-nums` on every number, always.

| Role | Size / weight | Notes |
|---|---|---|
| Cover title | 132–168 / 800 | letter-spacing −.03em, 2 lines max |
| Hero figure (verdict slide) | 150–190 / 800 | the single biggest thing in the deck |
| KPI value | 68–84 / 800 | tile numbers, tabular, aligned baselines |
| Slide headline (stated finding) | 46–56 / 700 | line-height 1.08, max ~14 words |
| Deck / section number | 34–40 / 800 | tone accent |
| Subhead / lede | 24–26 / 500 | one sentence, muted |
| Body / bullet | 20–22 / 400–500 | **never below 20 for content** |
| Label / legend / axis | 16–17 / 600 | absolute floor is 16 |
| Eyebrow | 13–14 / 700 | uppercase, letter-spacing .18em |
| Footnote / source | 13 / 400 | `--tone-footnote-color`, ~55% opacity |

**Nothing renders below 16 design px. No exceptions** — not axis ticks, not photo credits.

### Attention devices (this is what "que retenga" means)

At least **three** of these on every deck, at most **two per slide**:

1. **Gradient-clipped hero figures** — `background:linear-gradient(...);-webkit-background-clip:text;color:transparent` using `--tone-accent` → `--tone-accent-2`.
2. **Ghost watermark** — the slide's key ticker or figure repeated at 300–420px, weight 800, 4–6% opacity, clipped by the slide, sitting behind content. Instantly kills dead space.
3. **Mask-reveal headlines** — each line wrapped in a span, revealed with `clip-path: inset(0 100% 0 0)` → `inset(0)` at 320ms, 60ms stagger.
4. **Colored key phrase** — the one phrase the headline argues, in `--tone-accent`, inline (editorial-tone trick, works in every tone).
5. **Drawn accent rule** — a 4px rule under the headline that animates `scaleX(0)→1` from the left, 420ms.
6. **Delta chips** — `▲ +12.4%` pill, semantic color, next to the figure it qualifies, never on its own line.
7. **Display/text font pairing** — `--tone-font-display` for figures and headlines, `--tone-font-body` for everything else. Load real webfonts (Manrope/Inter, or the tone's serif) with a system fallback stack that still looks deliberate.

Banned: centered body paragraphs, all-caps sentences, drop shadows on text over flat backgrounds, more than two type sizes inside one block.

---

## Density & slide grammar

The whitespace problem is structural, not aesthetic. Rules:

- **12-column × 8-row grid**, 24px gutters, 72px safe margin (full-bleed slides excepted).
- **Content must cover ≥78% of the stage.** Measure it: sum the bounding boxes of the content blocks. A chart floating in the middle with 300px of nothing around it fails.
- **Every content slide carries all four layers.** Missing a layer means the slide is under-built — merge it with its neighbor rather than padding it out:
  1. **Chrome** — eyebrow + section number + period pill + slide counter (same corners on every slide).
  2. **Claim** — headline as a stated finding ("La concentración, no el mercado, explicó el trimestre"), never a topic label ("Composición").
  3. **Primary visual** — chart, table or image occupying 6–8 columns and ≥55% of the stage height.
  4. **Support strip** — 3–5 micro-KPIs, mover chips, or a rail of 3 bullets + footnote. This is the layer that was missing in every empty-looking build.
- **Canonical layouts** (pick one per slide, repeat them; consistency is what reads as institutional):
  - `chart-rail`: visual 8 cols / insight rail 4 cols (finding + 3 bullets + footnote).
  - `kpi-quad`: 2×2 or 1×4 tiles with sparklines + a full-width takeaway bar underneath.
  - `split-image`: full-bleed image 5 cols / content 7 cols.
  - `cards-3`: three equal cards, each with figure + 3 bullets (mover slides use this).
  - `full-bleed`: cover, dividers, closing only.
- **≥3 numbers per slide, ≤7 numbers per slide.** Below 3 it's a poster; above 7 it's the PDF.
- **Whitespace is only legitimate on a divider** — and a divider must be a full-bleed photo with one line of text, never an empty color field.

---

## Slide outline & metric selection

14–18 slides. This is the default running order; conditional slides drop out entirely when their condition fails (see rules below) — **never render a slide, tile or cell showing "—", "N/A" or 0 for missing data; remove it and rebalance the grid.**

| # | Slide | Layout | Data (from `data-contract.md`) |
|---|---|---|---|
| 1 | Cover | full-bleed | name, `period_label`, 3 headline figures (valor final, retorno %, resultado $) |
| 2 | Verdict | hero + kpi-quad | one stated finding + `periodReturnPct`, `periodResultAmt`, `totalValueEnd`, alpha vs benchmark |
| 3 | Rendimiento vs benchmark | chart-rail | `equityCurve` + `benchCurve`, alpha pp, mejor/peor sesión, `sessions` |
| 4 | Crecimiento del capital | chart-rail | equity curve annotated with aportes/dividendos/eventos de noticias |
| 5 | Atribución | chart-rail (waterfall) | start value → per-position contribution → end value |
| 6 | Ganadores y perdedores | cards-3 ×2 | top 3 / bottom 3 by `periodPnl`, $ + pp + peso |
| 7–8 | Qué movió el mercado | cards-3 | see `references/market-narrative.md` — **the depth spec lives there** |
| 9 | Composición | chart-rail (donut) | weights, top-5, HHI gauge, "otros (n)" grouping |
| 10 | Exposición FX / sector | chart-rail (stacked) | `fxExposure`, sector split |
| 11 | Riesgo | kpi-quad (gauges) | ≤5 metrics, each with an interpretation word |
| 12 | Drawdown y recuperación | chart-rail (underwater) | `maxDD`, fecha del mínimo, días de recuperación |
| 13 | Actividad | table + kpis | `closedTradesInWindow`, `totalRealizedPnl`, `totalDividends`, `totalComm` |
| 14 | Calidad de datos | rail | only if `missingPrices` non-empty |
| 15 | Qué vigilar | cards-3 | 3 AI actions, each with the metric that triggers it |
| 16 | Cierre | full-bleed | marca, periodo, disclaimer, CTA al PDF |

### Metric selection rules — "usa las más relevantes"

The tracker computes far more than a deck can carry. Include a metric only when it earns its slot:

- **Benchmark-dependent** (`beta`, alpha, `benchCurve`): only if a benchmark exists. No benchmark → slide 3 becomes a pure equity-curve slide, no empty comparison.
- **`sortino`**: only if `|sortino − sharpe| ≥ 0.3`. Otherwise it's a redundant second view of the same fact.
- **`var`**: only if `sessions ≥ 60`. Below that it's noise dressed as risk.
- **`cagrPct`**: only if the window ≥ 9 months. Annualizing a 3-month window produces theater, and the deck's credibility dies with the first absurd number.
- **`historicalBeta` vs `currentWeightedBeta`**: show both only if they differ by ≥0.15; otherwise show `currentWeightedBeta` alone.
- **Activity slide**: only if `totalTxCount ≥ 1`. **Dividends**: only if `totalDividends > 0`. **FX slide**: only if ≥2 currencies with ≥5% weight each.
- **Positions**: rank by `|contribution pp|`; everything under 0.5pp collapses into a single "Otros (n)" row. A deck never lists 30 tickers.
- **Risk slide caps at 5 gauges.** Priority: `sharpe` → `volatility` → `maxDD` → `beta` → (`sortino` | `var`).
- Every metric shown gets an **interpretation word** ("Sharpe 1.42 · Sólido") using the ranges already encoded in the api.py system prompt — a bare ratio means nothing to the viewer.

---

## Charts

**Hand-rolled inline SVG. No Chart.js in the deck.** The library's defaults are exactly the "muy básicas" look, and its animation/hover surface can't do draw-in strokes, gradient glows, synced legends and slide-triggered choreography without fighting it. `assets/deck-charts.js` is the reference implementation — copy it into the deliverable and inline it.

Universal contract (all eight renderers):

- Colors come from `--tone-chart-1/-2`, `--tone-accent`, `--tone-up`, `--tone-down` read off the element — **never a literal hex in chart code**.
- `viewBox` + `width:100%` for resolution independence; no `<canvas>` (crisp on projectors, printable, inspectable).
- Renders instantly in its **pre-animation state**, exposes `el._play()`; the deck runs it when the slide activates, not at page load.
- `prefers-reduced-motion: reduce` → mount in final state, `_play()` is a no-op.
- Tabular numerals on every label. Units inline (`US$`, `%`, `pp`, `x`).
- Max 4 gridlines, 1px dashed at 8% ink, labels outside the plot. No chart junk, no 3D, no legend box borders.
- One shared tooltip node, positioned in stage coordinates.

| Renderer | Used for | Required effects |
|---|---|---|
| `area` | equity vs benchmark | gradient fill (accent 38%→0), 2.5px stroke drawn in via `stroke-dashoffset` 900ms `cubic-bezier(.16,1,.3,1)`, blurred duplicate stroke as glow, pulsing end-dot + value pill, dashed benchmark line, shaded max-drawdown band, crosshair + tooltip on `pointermove` (nearest index) |
| `waterfall` | attribution | bars grow from baseline (`scaleY`, origin bottom) with 60ms stagger, dashed connectors, value labels above, hover lifts the bar and reveals that position's card. **Scale rule:** if the contributions are small next to the opening value (typical — a 7% quarter on a six-figure book), the per-position bars render as slivers. In that case drop the start/end totals and plot a **contribution-only** waterfall from 0 (bars = each position's P&L, final bar = total period result); never break the axis to fake magnitude |
| `diverging` | winners / losers | bars grow from a center axis outward, ticker + $ + pp, hover reveals the news chip |
| `donut` | composition | arcs sweep in via `stroke-dashoffset`, 26px stroke, 2° gaps, center label swaps from total to hovered slice (peso, valor, P&L), legend rows highlight-synced both ways |
| `gauge` | risk metrics | 240° arc, colored reference bands, progress + needle animate ease-out 800ms, value in center, interpretation word beneath |
| `sparkline` | KPI tiles | 900ms draw-in, end dot, ±color by sign |
| `underwater` | drawdown | filled negative area, deepest point annotated with a leader line (fecha + profundidad) |
| `stacked` | FX / sector | segments grow left→right with stagger, labels inside segments ≥12%, rest in legend |

Chart hover is not optional: **if an element shows a number, hovering it must give context** (exact date/value, the position's detail, the metric's definition).

---

## Motion choreography

One choreography, run on slide activation, identical on every slide (consistency is what makes it feel designed rather than decorated):

| t (ms) | What |
|---|---|
| 0 | Outgoing slide: `opacity 1→0`, `scale(1→.985)`, 380ms. Background image starts ken-burns `scale(1.06→1)` over 1200ms |
| 80 | Eyebrow + chrome: fade + rise 12px |
| 160 | Headline: per-line mask reveal, 320ms each, 60ms stagger |
| 260 | Accent rule: `scaleX(0→1)` 420ms |
| 340 | Figures: count-up 900ms ease-out (money in locale format, % to 1 decimal, width locked with tabular-nums so nothing reflows) |
| 420 | Chart: `_play()` |
| 620 | Support strip: stagger 70ms per item |
| 900 | Footnote settles to 55% opacity |

Plus:

- **Transitions**: horizontal translate with depth — outgoing slide scales to .96 and blurs 2px, incoming slides in from 4% offset, 420ms `cubic-bezier(.22,1,.36,1)`.
- **Persistent chrome**: progress bar filling across the top, `07 / 16` counter, arrows, dot rail. All animate their state changes.
- **Keep-going cue**: next-arrow pulses after 4s of idle on a slide.
- **Navigation**: ←/→/space/PageUp/PageDown/Home/End, click arrows, touch swipe, dot rail, mouse wheel with a 700ms lock. Sync `location.hash` so `#5` deep-links a slide.
- **Ambient**: at most one per slide (ken-burns on the image, or a slow gradient-mesh drift, or the ghost watermark parallaxing ~8px with pointer). Never two.
- **Revisit**: re-trigger entrances at 60% duration, no count-up restart.
- **`prefers-reduced-motion: reduce`**: all entrances become instant final states, ken-burns and pulses off, transitions become a 120ms opacity fade. Content parity is mandatory — nothing is only reachable through motion.

Restraint rule: motion sells the data, never competes with it. If two things animate at the same instant, one of them is wrong.

---

## Imagery (Pexels)

**The key exists.** `PEXELS_API_KEY` is set on the Railway service `blackportfolio-api` (verified jul-2026), and api.py already proxies Pexels at `GET /api/gallery`. Earlier builds skipped imagery because this skill wrongly documented the key as missing. Get it into the generation process without ever printing it:

```bash
railway run --service blackportfolio-api -- python .claude/skills/portfolio-report-design/scripts/fetch_pexels_images.py
```

In-app (when the deck becomes a real feature), go through the existing `/api/gallery` proxy — extended with a server-side-whitelisted `query` param — so the key never reaches the browser.

- **Where images go**: cover (full-bleed), each section divider (full-bleed), one context panel on the market-narrative section, closing. **Never behind a chart.**
- **What to search**: derive queries from the portfolio's actual sectors — tech → "data center server room", energía → "oil refinery night", financieras → "city skyline finance", FIBRA/REIT → "modern architecture facade", consumo → "retail store shelves", salud → "laboratory research", industriales → "factory automation", cripto → "abstract digital network", ETF amplio → "stock exchange building". Generic financial/architectural only — **never images of identifiable people, never brand logos**.
- **Treatment**: duotone or grayscale + tone-accent overlay for cohesion; scrim `linear-gradient(90deg, rgba(bg,.94), rgba(bg,.30))` so text over image clears AA contrast; `avg_color` painted as the background before load; cover eager, the rest lazy.
- **Density by tone** (`--tone-imagery-density`): `minimal` → zero images, type only; `institutional` → cover only; `premium-dark` → cover + one abstract macro; `brand` / `gradient` / `editorial` → cover + dividers + context panel.
- **Attribution** is a license requirement: photographer credit at 13px muted on each image slide, plus a "Fotografías: Pexels" line in the closing footnotes.
- **Degradation**: no key, no network, or a failed request → tone gradient-mesh cover. Never a blank panel, never a broken `<img>`.

---

## Delivery

- **Single self-contained `.html`** — CSS, JS, chart lib, data and fonts inlined (fonts either as a `<link>` with a real fallback stack, or base64 woff2 for offline). Pexels images may stay as CDN URLs; if the deck must work offline, base64 them.
- Data is injected as one `const DECK_DATA = {...}` block that mirrors `data-contract.md`. **No portfolio-specific value anywhere else in the file** — no ticker in a class name, no hardcoded total in the markup.
- `data-tone` baked onto the root at build time. **Zero tone-switching UI in the artifact** (`references/tone-selector.md`).
- All static strings from a per-language map keyed by `lang` (es/en/fr).
- Start from `assets/deck-shell.html` + `assets/deck-charts.js` — they already implement the stage, nav, choreography, count-up, reduced-motion and the eight renderers.

## QA gate — check every one before calling a deck done

1. No text below 16 design px anywhere.
2. No slide, tile or cell showing "—", "N/A", `NaN`, `Infinity` or an empty chart.
3. Every content slide has all four grammar layers and ≥78% fill.
4. Every entrance fires on activation *and* on revisit; nothing appears pre-animated at load.
5. Reduced-motion pass shows 100% of the content.
6. Keyboard, wheel, swipe, dot rail and `#hash` deep-link all navigate correctly.
7. Every text-over-image block passes AA contrast (4.5:1).
8. Charts are pixel-crisp at 1280×720, 1920×1080 and 2560×1440; no scrollbars, no clipped slide.
9. Kill the network → deck still renders (fonts fall back, images fall back to tone gradient, no broken icons).
10. Every mover card carries a quantified portfolio impact (`market-narrative.md` rule) — headlines alone fail the gate.
11. Currency figures cross-checked against the live dashboard for that portfolio (`architecture.md` FX section), not against `pos.currency`.
12. Rendered with two different portfolios (one losing period, one without benchmark) and two tones.
