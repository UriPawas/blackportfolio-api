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

## Despliegue — regla dura

**Nunca despliegues desde esta máquina.** No ejecutes `firebase deploy` ni `railway up`, ni siquiera "solo esta vez" o para "probar rápido". La única vía de publicación es GitHub.

Cuando el usuario diga que despliegue, el procedimiento completo es:

1. `git add` de lo que corresponda y commit en la rama de trabajo.
2. Llevar el cambio a `master` (`git merge` o fast-forward; `master` es la rama de producción).
3. `git push origin master`.
4. Verificar que los workflows pasaron: `gh run list --limit 5` y `gh run watch <id>`.
5. Confirmar contra el sitio real antes de decir que quedó.

A partir del push, GitHub se encarga:

| Qué | Cómo se publica | Se dispara con |
|---|---|---|
| Frontend (Firebase Hosting) | `.github/workflows/deploy-hosting.yml` | push a `master` que toque archivos del sitio |
| Backend (Railway) | Integración nativa de Railway con GitHub | push a `master` que toque `api.py`, `persistence.py`, `requirements.txt`, `Procfile`, `tests/**`… (ver `watchPatterns` del servicio) |
| Pruebas del backend | `.github/workflows/pruebas-backend.yml` | igual que el backend |

**Por qué esta regla existe.** Durante meses se desplegó con `firebase deploy` y `railway up` desde el disco local. El resultado: el frontend en producción no correspondía a ningún commit (existía solo dentro de Hosting), `master` se quedó 25 commits atrás mientras Railway seguía apuntándole, y el sitio publicó 2 180 objetos del repositorio git al internet público. Nada de eso es visible desde la máquina que despliega; todo es obvio cuando el despliegue sale de un checkout limpio.

**Corolarios que no se negocian:**

- No aflojes el `ignore` de `firebase.json`. `"**/.*"` **no** excluye el contenido de un directorio oculto: en `.git/HEAD` el basename es `HEAD`. Por eso hacen falta `.git/**` y `**/.*/**`. El workflow aborta si faltan.
- Si algo se despliega, tiene que estar commiteado antes. Un árbol de trabajo sucio no se publica.
- La etiqueta `produccion/frontend-2026-09-01` marca el estado verificado byte a byte que servía Hosting el 2026-09-01. Es el punto de retorno si un despliegue sale mal.

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

`auth.js` is shared across all pages via `window.BlackPortfolioAuth`. Auth is **Firebase Authentication** (email/password + Google sign-in), not localStorage. `localStorage` is only a cache; the source of truth is the backend (PostgreSQL on Railway). Server-side **2FA (TOTP)** is enforced — the secret never reaches the client.

### Backend API (`api.py` + `persistence.py`) — FastAPI on Railway
- `GET /api/search`, `GET /api/chart/{symbol}` — Yahoo Finance / CoinGecko market data
- `GET /api/account/bootstrap`, `PUT /api/account/portfolios` — portfolio persistence (PostgreSQL); plan limits enforced server-side via `PLAN_LIMITS`
- `POST /api/2fa/*` — server-side TOTP setup/verify/disable (rate-limited)
- `/api/admin/*` — admin panel (gated by `require_admin`)
- Auth: Firebase ID token verified with `verify_id_token(check_revoked=True)`; sensitive endpoints additionally require a valid 2FA session token (`require_2fa`).

### Billing (Stripe — live, not stubs)
- `POST /api/billing/stripe/create-checkout-session`, `/confirm`, `/portal`, `/webhook`
- The Stripe webhook is signature-verified; the user's `plan` is authoritative in PostgreSQL (`app_users.plan`), never trusted from the client.
- Frontend entry point: `window.BlackPortfolioPayments.startCheckout({ gateway, plan, user })` in `app.js`.

## Demo Credentials
- Email: `demo@blackportfolio.ai`
- Password: `Black2026!`

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
