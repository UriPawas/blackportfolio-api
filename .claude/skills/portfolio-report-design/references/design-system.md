# Design System — five tones extracted from real investor decks

Extracted by rendering and visually reviewing every page of five earnings/investor presentations: AMD Q1 2026 Financial Results, Grupo Bimbo Q1 2026 Investor Presentation, American Express Q1 2026 Earnings, JPMorgan Chase 2Q26 Financial Results, and Nu Holdings Q4 2025 Earnings Presentation. Each deck turned out to occupy a genuinely distinct point in the design space — that's what makes them useful as five selectable tones rather than one style with variations.

## Two mediums, one anatomy vocabulary — but different grammar

Every layout pattern below (cover, section divider, KPI grid, data slide, closing) comes from slide-shaped source decks. The two deliverables borrow that vocabulary differently — **orientation, text density, and interaction model are all fixed per medium, not stylistic choices**:

| | PDF | Interactive HTML |
|---|---|---|
| Orientation | **Portrait (vertical), always** | **Landscape (horizontal), always** |
| Reading model | Formal document you study | Presentation you flip through |
| Text | Long-form — full AI prose, complete tables, footnoted methodology. This is the only deliverable allowed to run paragraphs. | Compressed — stated-finding headline + key figure per slide. Long-form never appears here; it lives in the PDF. |
| Structure | Running sections with color-blocked openers, cover imagery, charts inline with narrative | One full-viewport slide per idea, next/prev navigation |
| Motion | None (it's print) | Mandatory — see "Motion & interactivity" below |

Never build one by mechanically converting the other (print-CSS on the presentation, or rotating document pages into slides). If a build of the two looks like the same layout rotated 90°, it's wrong. They're two renderers over one data contract.

## Motion & interactivity (HTML presentation only)

> **The binding spec for the deck is `references/html-presentation.md`** — stage model, type scale, density rules, the eight chart renderers, the exact choreography timeline and the QA gate. Read it before building any HTML presentation; what follows is the short version.

The presentation's job is momentum — each slide should pull the viewer to the next. Motion is how it earns that, and it's part of the spec, not garnish:

- **Entrance animations, triggered when a slide becomes active** (not all at page load): KPI numbers count up from 0 to their value (~600–900ms, ease-out); bars grow from the baseline; the performance line draws in (`stroke-dashoffset` animation); text blocks fade/rise in with slight stagger (~80ms between siblings). Re-triggering on revisit is fine but keep it subtle the second time.
- **Hover states everywhere data lives:** chart points reveal a tooltip with the exact date/value; composition bars highlight and show the position's full detail; mover/news cards lift (translateY + shadow) and reveal the headline's source/date; KPI cells brighten. If an element shows a number, hovering it should give more context.
- **Slide transitions:** smooth scroll-snap or a short slide/fade between slides (~350–500ms). Progress dots and arrows animate their state changes.
- **A "keep going" cue:** subtle pulsing affordance on the next-arrow (or a "1/16" counter tick) so the viewer always knows there's more.
- **Implementation:** CSS-first (transitions, `@keyframes`, IntersectionObserver to trigger entrances). No animation library needed. Everything must respect `prefers-reduced-motion: reduce` — swap animations for instant states, never strobe.
- **Restraint rule:** one entrance choreography per slide, consistent throughout the deck. Motion sells the data; it never competes with it.

## Default tone: `brand` (BlackPortfolio itself)

The five deck-derived tones below are **opt-in alternates**. The default, applied whenever no tone is explicitly chosen, is the app's own identity — palette from styles.css (`--primary: #6f86ff`, `--primary-strong: #556eff`, `--accent: #7892ff`), dark-friendly neutrals, same typography discipline as `gradient` (confident numbers, eyebrow labels) but in BlackPortfolio blue. Reports must read as *this product's* output by default — never as Nu's, AMD's, or any reference company's. A future in-app customization section will let users override the palette (see `references/tone-selector.md`); keep every color reference going through the tone tokens so that swap costs nothing.

## Cross-deck patterns (apply regardless of tone)

These held true across all five decks and should hold in every tone:

- **Cover = one visual anchor, not a collage.** A single full-bleed image or a single brand mark on a solid/gradient field, big title top-left or centered, period label small underneath. Never multiple competing images on the cover.
- **Headlines are stated findings, not topic labels.** "Solid Gross Profit Growth Underpinned by Diversified Value Drivers", not "Gross Profit". Every data slide title is a claim you could argue with.
- **Numbers always carry their unit inline** — US$MM, %, x, pp — never a bare number a reader has to guess the meaning of.
- **KPI grids give every cell equal visual weight.** 3–6 metrics, each cell = big number + small trend indicator, no cell dominates via size or color.
- **A small consistent pill/badge** (period + page number, or a colored category tag) appears in the same corner of every content slide — it's what makes a single long HTML page still read as a structured, numbered document.
- **Footnotes are legitimately tiny and low-contrast**, sitting at the bottom of data sections, defining non-obvious metrics and citing sources. This one detail is what separates "institutional report" from "dashboard screenshot".
- **Section dividers are deliberately empty** — solid color/photo block, one short title, nothing else. They exist to let the reader breathe between dense data sections. CSS gotcha (hit during the jul-2026 evaluation): give the divider's background rule a selector at least as specific as the page/slide container's own background rule (e.g. `.page.divider`, not a bare `.divider`) — at equal specificity the later-loaded rule silently wins, which can leave a divider rendering white-on-white with no visible error.

## The five tones

### 1. `premium-dark` — inspired by AMD

**Mood:** engineering-grade, high-confidence, tech-premium. Use as the "flagship metrics" tone — biggest numbers get the most visual weight.

- **Palette:** near-black background (`#0B0B0C`), slightly lighter panel gray (`#1C1C1E`), warm gold accent (`#C9A227`), white/off-white text, muted gray secondary text.
- **Typography:** bold geometric sans for headline numbers at large size; the gold accent is used sparingly — for the current-period bar in a chart, for section labels, for the small "Strategic Highlights" tag boxes. Never more than one gold element competing for attention per slide.
- **Imagery:** almost none. Only abstract product/hardware macro shots on a "strategic pillars" style slide — imagery is not load-bearing here, data density is. Cover is a brand mark on a black gradient, nothing else.
- **Charts:** simple two-bar or two-column comparisons (prior period vs. current), value labels printed directly above bars, gold = current period, gray = prior period. A one-line takeaway sentence directly under each chart, in a slightly muted panel.
- **Layout anatomy:** dark full-bleed cover → agenda-less dive straight into KPIs → repeated "metric + one-liner + footnote" data slides → closing mark mirrors the cover.
- **Copy voice:** short, declarative, confidence-forward ("Driven primarily by strong growth in..."). No hedging language.

### 2. `editorial` — inspired by Grupo Bimbo

**Mood:** warm, consumer-facing, human. Use when the report should feel approachable rather than clinical — good default for a lower-intensity/casual plan tier or a "friendly summary" audience.

- **Palette:** white/near-white background, each section owns **one** accent color from a warm multi-color set (blue `#1E4FBE`, purple `#6A3FD1`, orange `#F0862B`, pink `#E8437C`, green `#2FA36B`) — sections are color-coded, not the whole deck.
- **Typography:** rounded/humanist sans, larger line-height than the other tones, generous use of bold colored spans inline within headlines to highlight the key phrase.
- **Imagery:** heavy — real photography (product/lifestyle), rounded icon badges, map illustrations with dot-density markers, pill-shaped stat badges layered directly over or beside photos. This is the only tone where photography and data visualization share a slide as equals.
- **Charts:** rounded bar charts, generous padding, colored per data series matching the section's accent, small circular data-callout badges rather than plain axis labels.
- **Layout anatomy:** photo-led cover → recurring "agenda" divider slides (re-shown at each new act, current step highlighted) → mixed photo+data slides → warm "Thank you" closer with a soft photo.
- **Copy voice:** benefit-forward, slightly promotional but grounded in a number right after the claim ("Mexico grows 1.5x faster than F&B industry average").

### 3. `institutional` — inspired by American Express

**Mood:** formal, chart-forward, banking-grade. Good default for a mid/professional plan tier — serious without being austere.

- **Palette:** navy primary (`#0B2559`), white background, single light-blue secondary accent (`#4C7EF3`) for a second data series, near-black body text.
- **Typography:** clean serif or geometric sans for slide titles (navy, top-left, consistent position every slide), smaller sans for the always-present data table beneath each chart.
- **Imagery:** minimal — cover only, a soft gradient/product photo treatment; every other slide is pure chart+table.
- **Charts:** line or bar chart on top, a compact YoY comparison table directly below it with the exact same metric broken out by sub-segment — the chart tells the trend, the table gives the auditable numbers.
- **Layout anatomy:** photo cover → dense business-highlights bullet slide → repeated chart-over-table data slides → solid-navy annex divider → appendix pages with even denser tables.
- **Copy voice:** neutral, metric-led, minimal adjectives — the table does the persuading, not the prose.

### 4. `minimal` — inspired by JPMorgan Chase

**Mood:** restrained, regulatory-grade, maximum whitespace. Use as the "minimalista" option the user explicitly asked for — the tone with the least visual noise.

- **Palette:** warm off-white/cream background (`#FAF7F2`), near-black text, a single thin rust/brown rule (`#8B4A32`) under the title as the only color accent on most slides. Occasional small muted colored pill top-right to tag a business segment.
- **Typography:** plain serif for the cover title, plain sans everywhere else, no bold color blocking anywhere.
- **Imagery:** none. Zero photography across the entire deck — hierarchy comes purely from typography, whitespace, and table structure.
- **Charts:** small, grayscale-leaning tables are actually favored over charts; when a chart does appear it's a plain line/bar with muted blue, no gradient fills, no decorative elements.
- **Layout anatomy:** title-only cover with a thin rule → dense financial-highlights table → repeated segment-performance tables (each tagged with a small colored business-unit pill) → long dense legal/notes pages as the closer, no "thank you" slide.
- **Copy voice:** terse, table-first — most slides carry almost no prose at all, just labeled numbers.

### 5. `gradient` — inspired by Nu Holdings (default)

**Mood:** modern fintech, glossy, premium-consumer. This is the tone closest to BlackPortfolio's current purple brand identity — keep it the default unless a feature/user picks otherwise.

- **Palette:** purple gradient field (`#6A3FD1` → `#8B5CF6` → `#B794F6`), white cards/panels, deep purple for chart bars.
- **Typography:** geometric sans, large confident numbers, small caps section eyebrow labels.
- **Imagery:** glossy product photography (cards on marble/fabric surfaces) for cover and section dividers; portrait photography for narrative "welcome"/executive-intro style dividers when a human voice is being introduced.
- **Charts:** purple-gradient bar charts with a thin trend line overlay, small percentage-change annotations between bars.
- **Layout anatomy:** photo cover → portrait-led narrative divider → KPI overview strip → repeated purple-bar data slides → glossary/definitions-heavy appendix (this deck is the most thorough about defining every non-obvious metric — worth keeping regardless of tone, see `references/data-contract.md` footnotes).
- **Copy voice:** confident and finding-forward, same "stated claim, not topic" headline discipline as the others, slightly more premium/aspirational adjectives than `institutional` or `minimal`.

## Tone → CSS mapping

Each tone above corresponds 1:1 to a `data-tone` value and CSS custom-property block in `assets/tone-tokens.css`. The report template should read tone-dependent values (`--tone-bg`, `--tone-accent`, `--tone-text`, `--tone-panel`, `--tone-imagery-density`) from there — never hardcode a color in the report markup itself.
