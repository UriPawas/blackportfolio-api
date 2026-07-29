# PDF document — build spec

Binding spec for the **vertical formal document** deliverable. The interactive deck has its own (`html-presentation.md`); this one exists for the same reason: the PDF that ships today (`exportPortfolioPDF`, main.js ~6773) fails in six specific, repeatable ways.

| Failure observed | Root cause | Fixed by |
|---|---|---|
| Information cut mid-block across page boundaries | One continuous flow sliced blindly by html2pdf at 1123px intervals; `page-break-inside:avoid` can't save a block taller than what's left | [Page model](#1-page-model) + [Pagination engine](#2-pagination-engine) — measured pagination into explicit fixed pages |
| Reads like a dashboard dump, not a document | KPI tiles + tables with one-line captions; no chronicle, no per-position depth | [Document outline](#6-document-outline) + [Narrative depth](#7-narrative-depth) |
| Zero photography | Imagery treated as a deck-only feature | [Imagery](#5-imagery--layout-patterns) — 7 print-native image/text patterns |
| One font, one accent, uniform gray | Literal hexes and `'Segoe UI'` hardcoded; tone tokens never read | [Type](#3-type) + [Color](#4-color) |
| Same 11 sections regardless of the portfolio | No eligibility rules — a 3-month window still prints CAGR, an empty benchmark still prints a comparison | [Section eligibility](#section-eligibility) |
| Spanish + `es-MX` hardcoded | Pre-existing debt | `architecture.md` § i18n — every string from the `currentLang` map |

Numbers below (698px, 78 chars, 90 words, 7.5px) are floors/ceilings, not suggestions.

---

## 1. Page model

**The document is a stack of fixed-size page elements, not a flow that gets sliced.** This is the single change that fixes cut content — everything else in this spec depends on it.

```
A4 @ 96dpi        794 × 1123 px
margins           top 58 · right 48 · bottom 65 · left 48
content box       698 × 1000 px   ← every measurement in this spec is against this
header band       top 24px, height 22px   (pages ≥ 2, inside the top margin)
footer band       bottom 26px, height 22px (all pages except full-bleed)
column grid       12 cols × 46px + 16px gutters = 698
prose measure     380–500px (58–76 chars at 11.5px) — never full 698 for body text
```

```html
<div class="page">                     <!-- exactly 794×1123, overflow:hidden -->
  <div class="page-head">…</div>        <!-- running header, absolute -->
  <div class="page-body">…</div>        <!-- 698×1000, the only place content lands -->
  <div class="page-foot">…</div>        <!-- folio · section · n / N -->
</div>
```

```css
.page { width:794px; height:1123px; position:relative; overflow:hidden; background:var(--pdf-paper); }
.page-body { position:absolute; left:48px; top:58px; width:698px; height:1000px; }
.page-body > :first-child { margin-top:0 !important; }
/* NO page-break-before / break-before anywhere. See below — it doubles the PDF. */
```

- **Never put `page-break-before`/`break-before` on `.page`, and never use html2pdf's `pagebreak.before`.** Measured jul-2026 with html2pdf 0.10.2: html2pdf's `css` pagebreak mode reacts to those rules by injecting a spacer element that pads to the *next* page boundary — and since a `.page` already starts exactly on a boundary, every break rule buys a **blank page**. A 3-page fixture rendered 5 PDF pages; the 11-page reference document rendered 21. With the rules removed and `pagebreak:{mode:[]}`, the fixture renders 3/3 and the document 11/11, identical at `scale:1` and `scale:2`. The geometry alone does the pagination: html2pdf slices the canvas every `canvas.width × (pageHeight/pageWidth)` px, which with `format:[794,1123]` is exactly 1123 CSS px — one `.page` per PDF page.
- Page CSS lives **outside `@media print`**. html2pdf renders in screen media; `@media print` rules never apply (already documented in `architecture.md`, still true).
- **Full-bleed pages** (cover, section openers, closing) skip `.page-body` and paint edge to edge: `.page.bleed > *` positioned against the 794×1123 box directly. They are authored by hand, never fed to the paginator.
- Every page carries chrome except the cover: header = portfolio name · period · section title; footer = folio (`BP-XXXXX-YYYYMMDD`) · `n / N`. Chrome is stamped **after** pagination, when `N` is known.
- html2pdf config that matches this model exactly:

```js
{ margin: 0,                                    // margins live in .page-body, not in jsPDF
  image: { type:'jpeg', quality:0.96 },
  html2canvas: { scale:2, useCORS:true, backgroundColor:'#ffffff', logging:false },
  jsPDF: { unit:'px', format:[794,1123], orientation:'portrait', hotfixes:['px_scaling'] },
  pagebreak: { mode:[] } }                      // geometry paginates; see the break-rule note above
```

Two settings in there are load-bearing, both measured:

- **`margin: 0`.** Any non-zero jsPDF margin re-introduces slicing offsets and breaks the 1:1 mapping. Margins live in `.page-body`.
- **`html2canvas.scale` must be an integer** (1, 2 or 3 — use 2). html2pdf slices at `floor(canvas.width × pageHeight/pageWidth)` = `floor(1123 × scale)`. At `scale:2` that's exactly 2246 and 11 pages render as 11; at `scale:1.6` it's `floor(1796.8) = 1796`, the 9px of accumulated truncation spill past the last page, and the same document renders **12** pages with a near-blank last one. Verified both ways.

Verify the mapping in code — `pdf.internal.getNumberOfPages()` must equal the number of `.page` elements (QA gate item 2); a mismatch means a break rule, a fractional scale or a stray margin crept back in.

---

## 2. Pagination engine

`assets/pdf-paginate.js` is the reference implementation — use it, don't re-derive it. It measures blocks in the live DOM and distributes them into pages, so a block is either fully on a page or moved whole to the next.

**Contract — every top-level block declares how it may break:**

| Attribute | Meaning |
|---|---|
| *(none)* | **Atom.** Never split. Moves whole to the next page if it doesn't fit. Charts, KPI rows, cards, images, callouts. |
| `data-flow="split"` | **Container splittable at its children.** The container is cloned (classes, styles, grid) onto each page it spans; children are distributed. Prose stacks, card grids, glossary. |
| `data-flow="table"` | **Table splittable at `<tbody>` rows.** `<thead>` is repeated on every continuation, and each continuation gets a `(continúa)` caption. Minimum 2 rows per chunk. |
| `data-keep-with-next` | **Binds to the following block.** Section headers, chart captions, lede paragraphs. If the pair doesn't fit, both move. |
| `data-break="page"` | Force a new page before this block. |
| `data-min-space="N"` | Only start this block if ≥N px remain; otherwise push. Use for section headers (`160`) and dossier cards (`220`). |

**Readiness gate — measuring before this point produces wrong pages:**

1. `await doc.fonts.ready` (webfont metrics shift line counts).
2. `await Promise.all([...imgs].map(i => i.decode().catch(()=>{})))`.
3. **Every `<img>` carries explicit `width`/`height` attributes.** An image without intrinsic size measures 0 before load and the page it lands on will overflow. Non-negotiable.
4. Charts render synchronously as static SVG with fixed `height` (see [Charts](#8-charts-in-print)).

**Rules the engine enforces (and QA re-checks):**

- A page never overflows: `pageBody.scrollHeight <= 1000` for every page. This is the assertion that replaces eyeballing.
- An atom taller than 1000px is a **build error** (`data-oversize` is stamped on it): split it into two blocks or shrink it. Never ship it.
- Orphans/widows are prevented structurally, not with CSS hints: paragraphs are atoms and are capped at 90 words (§7), so a paragraph never straddles a page and never leaves one line behind.
- A section header is never the last thing on a page (`data-min-space="160"` + `data-keep-with-next`).
- Balance rule: if the last page of the document is <25% full, merge it back — pull the previous section's tail or let the glossary flow up.

---

## 3. Type

Print px at 96dpi (`pt = px × 0.75`). `font-variant-numeric: tabular-nums` on every figure, everywhere.

| Role | px / weight | Notes |
|---|---|---|
| Cover title | 46 / 800 | display font, letter-spacing −.02em, ≤2 lines |
| Cover headline figure | 40 / 800 | one per cover, the period result |
| Section opener numeral | 132 / 800 | ghost, 8–12% ink, behind the opener title |
| Section title | 20 / 750 | display font |
| Verdict headline | 24 / 750 | line-height 1.15, ≤14 words, a **stated finding** |
| Subsection (H3) | 12 / 750 | uppercase, letter-spacing .09em, accent color |
| Lede / standfirst | 13.5 / 400 | italic optional, 1 sentence, muted |
| Body prose | 11.5 / 400 | line-height 1.62, measure 380–500px |
| Drop cap | 3 lines (~34px) / 800 | first paragraph of the letter only |
| KPI value | 19 / 800 | tabular, baselines aligned across the row |
| KPI label | 7.8 / 700 | uppercase, letter-spacing .06em |
| Table header | 8 / 700 | uppercase |
| Table cell | 9.2 / 400 | numbers tabular + right-aligned |
| Chart label / axis | 8.5–9.5 / 600 | authored 1:1, see §8 |
| Sidenote | 8.8 / 400 | outer rail, hangs beside the paragraph it annotates |
| Footnote / photo credit | 7.5 / 400 | `--pdf-ink-faint` |

- **Absolute floor 7.5px** (credits/footnotes only). Body prose never below 11px, table cells never below 9px.
- **Two families, always paired**: `--tone-font-display` for titles/figures/section numerals, `--tone-font-body` for prose/tables/labels. A document set entirely in one face is a failed build; three families is also a failed build.
- Devices that carry the "juego tipográfico" — use **at least four** across the document, at most **two per page**: drop cap (letter only) · ghost section numeral · hanging sidenotes in the outer rail · pull quote at 18px over a duotone band · a colored key phrase inside the verdict headline · small-caps eyebrow with a 2px accent rule that runs to the page edge · oversized delta figure (`▲ +12.4%`) set against the paragraph explaining it · tabular figure columns aligned on the decimal.
- Banned: centered body paragraphs, justified text without hyphenation, all-caps sentences, italic runs over 2 lines, more than two type sizes inside one card, text set over an unscrimmed photo.

---

## 4. Color

The PDF is read on paper and on white screens — its palette is a **paper palette**, derived from the tone but not identical to the deck's.

```css
--pdf-paper:#ffffff;  --pdf-paper-2:var(--tone-panel);   /* panel fills, 4–6% ink   */
--pdf-ink:var(--tone-text);      --pdf-ink-soft:#4b5163;  /* body prose             */
--pdf-ink-muted:var(--tone-text-muted); --pdf-ink-faint:var(--tone-footnote-color);
--pdf-rule:#e3e7f2;               /* hairlines, 1px, never darker                    */
--pdf-accent:var(--tone-accent);  --pdf-accent-2:var(--tone-accent-2);
--pdf-up:var(--tone-up);          --pdf-down:var(--tone-down);
--pdf-section-1..5                /* section accent rotation, see below              */
```

- **Section accent rotation.** Each numbered section gets one accent from `--pdf-section-1..5` (defined per tone in `assets/tone-tokens.css`), applied to: the opener numeral, the section rule, the H3s, the chart's primary series and the KPI top-border of that section. Sections repeat the rotation after 5. This is what makes a 20-page document navigable by thumb — and it's the "juego de colores" the brief asks for, without turning the report into a rainbow.
- **Color must encode something.** Green/red only for sign (`--pdf-up`/`--pdf-down`), accent only for the section's own furniture and its primary data series, amber only for warnings. A colored element that encodes nothing is decoration and gets removed.
- **Ink budget: ≤35% of any content page covered by saturated fill.** Full-bleed image pages and section openers are exempt. Panels use tints (`--pdf-paper-2`), not solid accent.
- Hairlines are 1px `--pdf-rule`. No box shadows anywhere (they render as gray mud through html2canvas). Depth comes from rules, tints and whitespace.
- Dark tones (`premium-dark`) invert: the paper stays dark, but **tables and dense prose always sit on a light panel** — 9px white-on-black body text is unreadable in print.

---

## 5. Imagery — layout patterns

Photography is a first-class layout element here, not a cover decoration. `PEXELS_API_KEY` lives on Railway (`blackportfolio-api`); fetch via `scripts/fetch_pexels_images.py`, in-app via the `/api/gallery` proxy. Queries derive from the portfolio's dominant sectors (`SECTOR_QUERIES`).

**The seven print patterns** (geometry is binding; each is implemented in `assets/pdf-shell.html`):

| Pattern | Geometry | Where | Text relationship |
|---|---|---|---|
| `cover-bleed` | 794×520, full-bleed top | cover only | Title block sits in the lower 380px on paper, image above; or full-page image with a 94%-opacity paper card overlapping its lower third |
| `opener-half` | 794×360, full-bleed | each section opener page | Ghost section numeral over the image, section title + lede on paper below |
| `band` | 794×150, full-bleed | between two sections on the same page | Carries one pull quote (18px) over a 0.55 scrim — the only text allowed on it |
| `rail-figure` | 219×280, in the outer rail | narrative pages | Prose runs in the 450px column beside it; caption 7.5px directly under the image, never floating |
| `duotone-quote` | 698×190, inset | letter, closing | Duotone image + 18px pull quote, left-aligned in the first 400px, image detail visible on the right |
| `inset-square` | 96×96, rounded 8px | position dossier cards | Sector-derived image at the card's leading corner; ticker + figures to its right |
| `closing-bleed` | 794×430, bottom-anchored | last page | Disclaimer and credits on paper above it |

Rules:

- **Max one image per content page** (cover, openers, closing and `band` are exempt as they *are* the page or the divider).
- **Never behind a chart, a table or body prose.** Text over an image only in `cover-bleed`, `opener-half`, `band`, `duotone-quote`, and always over a scrim reaching ≥0.82 effective contrast (AA 4.5:1 measured, not eyeballed).
- **Treatment for cohesion**: 82% desaturation + `--pdf-accent` multiply overlay at 18%, or a true duotone (accent → paper). Paint `avg_color` as the element background before load so a failed image degrades to a colored panel, never a white hole.
- **Embed as data URIs before export.** html2canvas taints on cross-origin images and silently drops them; `fetch → blob → FileReader.readAsDataURL` at build time, then swap `src`. If the fetch fails (CORS/offline), fall back to the tone gradient panel — never a broken `<img>`.
- **Explicit `width`/`height` on every `<img>`** (pagination depends on it, §2).
- **Credit every photo** (`Foto: <photographer> · Pexels`, 7.5px) and list all photographers once in the closing page. License requirement, not a nicety.
- Never images of identifiable people, never brand logos, never anything that implies an endorsement or a real event. Generic financial/architectural/industrial only.
- Tone density (`--tone-imagery-density`): `none` → zero images, the document leans entirely on type and rules; `minimal` → cover only; `high`/`heavy` → all seven patterns available.

---

## 6. Document outline

16–24 pages. Roman-numbered sections; each starts on its own `opener-half` page **only** when the section carries ≥1.5 pages of content — otherwise it opens inline with a rule + numeral.

| § | Section | Required blocks | Depth |
|---|---|---|---|
| — | **Cover** | `cover-bleed`, portfolio name, `period_label`, 3 headline figures (valor final · resultado $ · resultado %), folio, generation date | — |
| — | **Índice + cómo leer** | section list with page numbers, 4-line reading guide, the one-line verdict | — |
| I | **El periodo en una página** | verdict headline (stated finding) · 4 diagnostic cards · **money bridge** waterfall (capital base → mercado → dividendos → aportes/retiros → comisiones → valor final) · 6 KPIs | 1 paragraph, ≤90 words |
| II | **Carta del periodo** | drop-cap narrative · sidenote rail with 3 figures · `rail-figure` · `duotone-quote` | 320–520 words (§7) |
| III | **Cronología** | monthly-return column chart · month-by-month chronicle (one row per month: retorno, mejor/peor posición, eventos) | 18–35 words per month |
| IV | **Rendimiento vs benchmark** | equity chart (portfolio · benchmark · capital invertido) · alpha/tracking-error strip · mejor y peor sesión · rolling note | 2 paragraphs |
| V | **Atribución** | contribution waterfall · winners/losers diverging bars · full contribution table ($ and pp) · counterfactual | 2 paragraphs + counterfactual |
| VI | **Qué movió a tus posiciones** | one half-page per mover: sparkline, `evento → mecanismo → impacto cuantificado → a vigilar`, source + date | see `market-narrative.md` |
| VII | **Dossier por posición** | 2 cards per page: `inset-square`, sparkline, coste medio, peso, P&L periodo, contribución pp, divisa, próxima fecha de resultados, valoración en 1 frase | 25–45 words per position |
| VIII | **Riesgo** | ≤5 metrics with interpretation words · underwater chart · drawdown chronicle (pico, mínimo, profundidad, días de recuperación) · VaR expressed in money | 2 paragraphs |
| IX | **Composición y exposición** | donut + top-5 · sector bars · región bars · FX table · HHI/holdings efectivos/top-3 · concentration alerts | 1–2 paragraphs |
| X | **Actividad del periodo** | closed trades table · transactions table (`data-flow="table"`) · dividendos · comisiones · flujo neto | 1 paragraph |
| XI | **Calidad de datos y metodología** | supuestos (FX de hoy, cash sólo si `isEndToday`, precios faltantes) · fuentes · fórmulas · modelo de IA usado | list |
| XII | **Glosario** | 2 columns, `data-flow="split"` | — |
| — | **Cierre** | `closing-bleed`, disclaimer, créditos de fotografía, folio | — |

### Section eligibility

Never print a section, card or cell that would read "—", "N/A", `NaN` or 0 for missing data. Drop it and rebalance.

- **Benchmark-dependent** (alpha, tracking error, beta vs índice): only with a benchmark series. Without it §IV becomes a pure equity-curve section.
- **`cagrPct`**: window ≥ 9 months. **`var`**: `sessions ≥ 60`. **`sortino`**: only if `|sortino − sharpe| ≥ 0.3`.
- **§III Cronología**: window ≥ 3 months (below that, one row per week or drop the section).
- **§VI movers**: only positions with `|contribution| ≥ 0.5pp`; cap 3 up + 3 down.
- **§VII dossiers**: positions with weight ≥2% **or** `|contribution| ≥ 0.5pp`; cap 8, sorted by weight.
- **§X**: only if `totalTxCount ≥ 1`; dividends block only if `totalDividends > 0`.
- **FX table**: only if ≥2 currencies with ≥5% weight each.
- **§XI missing prices**: always present, but the missing-price list only when non-empty.
- Every ratio shown carries an **interpretation word** ("Sharpe 1.42 · sólido") using the ranges already encoded in the api.py system prompt.

---

## 7. Narrative depth

"Detallar con lujo de detalle" is a measurable requirement, not a vibe. The PDF is the only place the analysis is allowed to run long — this is what fills it.

**Carta del periodo (§II) — 320–520 words, 4–6 paragraphs, each ≤90 words** (the cap is also what makes pagination safe):

1. **Qué pasó** — the period's result in money before percent, against the capital base.
2. **Por qué** — attribution: which positions produced it, with $ and pp.
3. **Contexto de mercado** — grounded *only* in the fetched news (`news-research.md`); no unsourced causal claims.
4. **Riesgo asumido** — what the return cost in volatility/drawdown, in money where possible.
5. **Contrafactual** — "sin *X*, el periodo habría sido *Y*" (compute it: period result minus that position's `periodPnl`).
6. **A vigilar** — 2–3 forward items, each tied to a metric and its trigger level.

**Every paragraph carries at least one figure from the data contract, money before percent.** A paragraph with no number is deleted.

**Cronología (§III)** — one entry per month in the window: `Mes · retorno % · resultado $ · mejor posición (pp) · peor posición (pp) · eventos (compras/ventas/dividendos)`, plus 18–35 words naming what drove that month. Months with no activity still get their return and driver.

**Movers (§VI)** — the four-bullet card from `market-narrative.md`, 16–28 words per bullet. The impact bullet must carry **both** money and pp for *this* portfolio; the event bullet carries the source and date. Headlines without a portfolio impact fail QA.

**Dossier (§VII)** — 25–45 words per position, citing its weight, its period contribution and one specific risk (concentration, FX, earnings date, liquidity). No boilerplate reused across positions.

**Drawdown chronicle (§VIII)** — dates of peak and trough, depth in % *and* money, days under water, whether it recovered inside the window.

Anti-patterns that fail review: "el portafolio tuvo un buen desempeño" (no figure) · the same sentence rephrased across sections · advice ("deberías vender") · causal claims not traceable to a fetched headline · percentages without their money equivalent · a section that just re-labels a table.

---

## 8. Charts in print

`assets/pdf-charts.js` — static SVG, **authored 1:1 at the pixel width of its slot**. No animation, no tooltips, no library defaults, no `<canvas>`.

- **Deterministic height.** Every renderer sets an explicit `height` on the SVG. The paginator measures before anything async could change it.
- **Author at the render size.** A deck chart with a 1000px viewBox squeezed into a 339px slot renders its 16px labels at 5.4px — that's the "tipografía ilegible" failure, transplanted. Pass the slot width; labels stay 8.5–9.5px on paper.

| Slot | Width | Typical height | Renderers |
|---|---|---|---|
| Full | 698 | 200–260 | `equity`, `waterfall`, `monthly`, `underwater` |
| Half | 339 | 170–200 | `donut`, `diverging`, `bars` |
| Third | 219 | 140–160 | `bars`, `donut` |
| Inline | 96–140 | 26–34 | `sparkline` |

- Colors from tone tokens read off the node (`--pdf-section-N` for the section's primary series, `--pdf-up`/`--pdf-down` for sign). **Never a literal hex in chart code.**
- ≤4 gridlines, 1px dashed at 8% ink, labels outside the plot. Direct labels on the series beat a legend box; when a legend is unavoidable it's a single row of 9px chips, no border.
- Annotate the one thing the chart is *for*: the equity chart marks the max-drawdown band and the final value; the underwater chart annotates the trough with a leader line (date + depth); the waterfall labels every bar with money and pp.
- Same waterfall scale rule as the deck: when per-position contributions are slivers next to the opening value, plot a **contribution-only** waterfall from 0. Never break the axis.
- Charts print in color but must survive grayscale: never rely on hue alone to distinguish two series — the benchmark is dashed, the portfolio is solid.

---

## 9. Tables

- `data-flow="table"`, `<thead>` repeated on every continuation, `(continúa)` caption on chunks 2..n, minimum 2 rows per chunk.
- Numbers right-aligned + tabular; tickers left; one hairline under the header, hairlines between rows at 6% ink, no vertical rules, no zebra striping (it turns to mud at scale 2).
- Row height ≥17px, cell padding 5px 7px, cell font 9.2px.
- Cap the transaction table at 80 rows and state the truncation in the caption (`80 de 214 · las más recientes`), exactly as the current export does.
- A table wider than 698px is a build error — drop a column or move it to the appendix.

---

## 10. Build & delivery

- Stays a **client-side render** through the existing `html2pdf.js` pipeline (`_loadHtml2Pdf`), inside the hidden iframe, with the settings in §1. No server-side/headless renderer.
- Order of operations, strictly: build DOM → embed images as data URIs → `fonts.ready` → `img.decode()` → **paginate** → stamp chrome (`n / N`) → `html2pdf(...)`.
- `data-tone` is baked on the root before rendering; the artifact contains **zero** tone/style UI.
- All static strings come from the `currentLang` map (es/en/fr); dates/numbers via `toLocaleDateString`/`Intl.NumberFormat` with the matching locale; the AI narrative requested with the same `lang`.
- Failure isolation: the AI step, the news step and the image step each degrade independently (`architecture.md`) — the document always renders. Wrap the whole export in try/**catch**/finally; the current code's `try/finally` with no catch hangs the spinner on any throw.
- Filename unchanged: `Reporte_<portafolio>_<start>_a_<end>.pdf`.

---

## QA gate — check every one before calling a PDF done

1. **`pageBody.scrollHeight <= 1000` on every page.** Assert it in code, don't eyeball it.
2. PDF page count === `.page` count. No blank leading/trailing page.
3. No block cut across a page boundary; no section header alone at a page bottom; no table continuation without a repeated header.
4. No "—", "N/A", `NaN`, `Infinity` or an empty chart anywhere — the section was dropped instead (§ eligibility).
5. Nothing below 7.5px; body prose ≥11px; every figure tabular.
6. Two font families, ≥4 typographic devices across the document, ≤2 per page.
7. Section accent rotation applied and consistent (opener, rule, H3s, primary series, KPI border).
8. Every image: explicit width/height, embedded as a data URI, credited, AA-contrast text if any, and none behind a chart/table/prose.
9. Every §II paragraph and every mover bullet carries a figure; the counterfactual is present and computed.
10. Currency figures cross-checked against the live dashboard for that portfolio (`architecture.md` § FX), not against `pos.currency`.
11. Kill the network → the document still builds (fonts fall back, images fall back to tone panels, AI block shows the existing `aiError` notice).
12. Rendered with ≥2 portfolios (one losing period, one without benchmark, one with a single holding) and ≥2 tones.
