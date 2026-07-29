# Tone selector — forward-looking spec (not built yet)

This documents what the in-app tone/style selector needs to do once it's actually built. It does not exist in the app today — there is no UI for it, and the interactive HTML report mode it belongs to doesn't exist either (today there's only the PDF export path via `reportRangeModal` → `exportPortfolioPDF`). Treat this file as a spec to implement against later, not a description of current behavior.

**Non-negotiable: the selector lives in the app's report-generation flow, never inside the rendered report.** The user picks a tone *before* the PDF/HTML is generated (e.g. alongside the date-range picker in `reportRangeModal`); the resulting artifact is rendered with that tone already baked in and carries zero UI for changing it afterward. An evaluation prototype of this skill (jul-2026) briefly added a live tone-switcher *inside* the rendered HTML purely so a human reviewer could compare all five tones in one file without regenerating five times — that was a testing convenience only and must never ship. If you're building the real feature and find yourself adding switch-tone controls to the report template itself, stop — that control belongs one level up, in the generation UI.

## What "tone" controls

A single `tone` value (one of `brand | gradient | premium-dark | editorial | institutional | minimal`, see `references/design-system.md`; `brand` = BlackPortfolio's own palette and the default) drives exactly two things from one data contract (`references/data-contract.md`) — the metrics computation never changes per tone:

1. **Presentation layer** — which `assets/tone-tokens.css` custom-property block is active (`data-tone="..."` on the report root), controlling palette, typography weight, and imagery density.
2. **AI narrative voice** — a short instruction appended to the existing `/api/ai/insights` system prompt (see `references/model-tiers.md` for why it must stay terse), changing sentence length/warmth/formality without touching the prompt's non-negotiable rigor rules (money-first phrasing, materiality thresholds, no generic advice).

## Where it plugs in (when built)

- A tone-select control near the existing report entry point (`reportRangeModal`, opened via `openReportRangeModal()` in main.js) — a small set of swatches/labels, not a full settings page.
- Selection is **per-render, not persisted** — the user picks a tone each time they generate/view a report, the same way they already pick a date range. No new column/preference needs to be added to the portfolio or user record for this.
- Default tone: **`brand`** — BlackPortfolio's own palette (`#6f86ff` family, see `assets/tone-tokens.css` `:root`). A user who never touches the selector gets a report that looks like this app, not like Nu or any other reference deck.
- The interactive HTML report itself is new feature work (an in-app view, distinct from the download-a-PDF flow) — building it is a prerequisite for the tone selector to have somewhere to live beyond the PDF export. Scope that as its own phase; don't bolt a tone selector onto the PDF-only flow as a stopgap unless the user explicitly asks for that narrower version first.

## Planned: user palette customization (separate future section)

The user has stated they will design an in-app customization section later where users personalize the report's colors/style themselves. Implications for anything built now:

- Tone presets are the **first layer**; user customization becomes an **override layer** on top of exactly the `--tone-*` custom properties in `assets/tone-tokens.css`. Keep every color/font/imagery-density decision flowing through those tokens — a template that hardcodes even one hex value breaks the future override.
- Don't build that customization UI preemptively; just don't paint it into a corner. When it arrives, its storage/scoping (per-user vs per-portfolio) gets decided then.

## Non-goals

- No per-tone data differences. If a future tone needs a metric none of the others use, that's a data-contract change that should apply to all tones, not a tone-specific carve-out.
