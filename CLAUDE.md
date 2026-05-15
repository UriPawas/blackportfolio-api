# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Behavioral Rules

**Responses:** 1–3 sentences max. No preamble, no trailing summary, no sycophantic openers ("Great question", "Perfect", etc.).

**Before coding:** Read relevant files, check context. If context is insufficient, ask — don't assume.

**Edits:** Use `Edit` (partial replacement) for existing files. Only use `Write` if the change covers >80% of the file. Touch only what's needed — no surrounding cleanup.

**Don't re-read:** If a file was already read this conversation, don't read it again unless it changed.

**Validate:** After any change, verify it works (run the server, open the page, check for errors). Never say "done" without evidence.

**Simple solutions:** Implement the minimum that solves the problem. No extra abstractions, helpers, or features beyond what was asked.

**Don't debate:** If the user says "do it this way", do it. One sentence if you have a concern, then proceed.

**Tool efficiency:**
- Parallelize independent reads — don't do them one by one.
- Use `Grep`/`Glob`/`Read` directly when the target is known. Spawn `Agent` only for broad, multi-step searches.
- Use `offset`/`limit` on `Read` when you only need a section.
- Don't echo edited/created files back in text — the user sees the diff.
- Don't narrate the plan before executing. Just execute.

---

## Project Overview

**BlackPortfolio Landing** — landing page and protected dashboard for an investment portfolio platform. Vanilla HTML/CSS/JS frontend + Python FastAPI backend.

## Running the App

**Frontend only** (landing page, login — no backend needed):
```
Open index.html directly in a browser.
```

**Full stack** (Markets section requires the API for ticker search and chart data):
```bash
python api.py
```
Auto-detects a free port. Assumes `fastapi` and `uvicorn` are installed. Serves static files + API from the same process.

## Architecture

### Pages → Scripts
| Page | Script | Responsibility |
|---|---|---|
| `index.html` | `app.js` | Pricing toggle, payment modal, signup form |
| `login.html` | `login.js` | Demo and registered user login |
| `main.html` | `main.js` | Protected dashboard — portfolio tracker, markets, settings |

`auth.js` is shared across all pages via `window.BlackPortfolioAuth`. All user data persists in `localStorage` — there is no backend auth.

### Backend API (`api.py`)
- `GET /api/search?q=<ticker>` — Yahoo Finance ticker autocomplete
- `GET /api/chart/{symbol}?range=<range>&interval=<interval>` — Historical OHLCV data

Payment endpoints (`/api/billing/paypal/...`, `/api/billing/stripe/...`, `/api/billing/custom/...`) are **stubs** — not implemented yet.

### Payment Hook
`window.BlackPortfolioPayments.startCheckout({ gateway, plan, user })` in `app.js` — handles gateway selection and payload construction. The actual HTTP calls target the stub endpoints above.

## Demo Credentials
- Email: `demo@blackportfolio.ai`
- Password: `Black2026!`
