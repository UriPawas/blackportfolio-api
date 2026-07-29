# Model tiers — every plan must get a usable report

The report's AI narrative must work end-to-end on the cheapest configured model (`google/gemini-2.5-flash-lite`, the Explorer tier) and get progressively richer — never differently *broken* — on higher tiers. Reuse `models_for_plan(plan)` in api.py; do not build a second model-selection mechanism for this feature.

## Why this matters here specifically

The user's plans map directly to model cost/quality:

| Plan | Model | |
|---|---|---|
| Explorer | `google/gemini-2.5-flash-lite` | cheapest/fastest, weakest reasoning |
| Investor | `deepseek/deepseek-v4-flash` | |
| Advisor Pro | `anthropic/claude-sonnet-5` | |
| Wealth Desk | `anthropic/claude-opus-4.8` | strongest |

A redesigned report that only reads well when tested against Sonnet/Opus but breaks or produces garbage on `gemini-2.5-flash-lite` fails the majority of actual users, since Explorer is presumably the largest and most price-sensitive tier.

## How to keep weaker models usable

- **Keep the section-header contract fixed and explicit.** The existing prompt already asks for parseable sections (Tesis/Atribución/Riesgos/Desempeño/Rebalanceo, consumed by `_parseAISections`'s keyword parser). Don't add open-ended or multi-step meta-reasoning instructions ("first think about X, then decide Y, then write Z") — cheaper models follow a flat, explicit format instruction far more reliably than a reasoning chain.
- **Give the tone voice modifier and news grounding as short, direct instructions**, not as stylistic essays — e.g. "Tono minimalista: sin adjetivos de marketing, oraciones cortas" rather than a paragraph describing the JPMorgan Chase deck's philosophy. The design-system detail in `references/design-system.md` is for you (the implementer) to translate into a terse instruction, not to paste verbatim into the prompt.
- **The existing fallback chain already covers hard failures** (429/404/5xx → next model down). What this feature must additionally handle: a *successful* response from a weak model that's too short, ignores the requested tone, or drops required sections. Validate the parsed output has the expected sections before treating it as success; if not, that's a soft failure — fall back to the tracker's own numbers with no narrative (same as the existing `aiError` path), don't silently ship a malformed report.

## How to spend extra budget on higher tiers

- Longer, more nuanced prose — already a natural consequence of a stronger model with the same `max_tokens` ceiling (2200 today); don't raise `max_tokens` per-tier unless testing shows it's actually needed, since that's a direct cost lever.
- More elaborate tone-specific phrasing (`editorial` tone leaning into warmer language, `institutional` leaning into more precise causal chains) — stronger models follow nuanced style instructions more faithfully, so it's reasonable to give richer voice instructions *only* when the resolved top-of-chain model is Advisor Pro or Wealth Desk.
- Do **not** gate the news-grounding step itself behind plan tier — every plan should get news-grounded "why" narratives for their top movers; that's a data-quality improvement, not a premium feature. What can reasonably scale with plan is depth (e.g. Wealth Desk could get 3 headlines per ticker where Explorer gets 1) if cost/testing warrants trimming it down for the cheapest tier — but starting point should be uniform.

## Testing checklist before shipping a change here

- [ ] Simulate an Explorer-plan user (or explicitly force the model chain to `["google/gemini-2.5-flash-lite"]`) and confirm the report still renders with valid sections.
- [ ] Simulate every model in the chain failing and confirm the report still renders with the existing `aiError`-style notice, not a blank/broken page.
- [ ] Confirm output stays parseable by `_parseAISections` across at least two different tones on at least two different models.
