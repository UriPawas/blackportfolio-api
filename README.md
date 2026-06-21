# BlackPortfolio Landing

Landing page moderna para presentar una plataforma de creacion y gestion de portafolios de inversion.

## Incluye

- Hero visual con enfoque financiero
- Seccion de beneficios para riesgo, asignacion y reportes
- Planes con cambio mensual y anual
- Autenticación con **Firebase** (correo/contraseña + Google) y **2FA TOTP server-side**
- Checkout real con **Stripe** (webhook firmado); el plan es autoritativo en PostgreSQL
- Persistencia de portafolios en **PostgreSQL** (Railway); `localStorage` solo como caché
- Pagina `login.html` con acceso para usuario demo y usuarios registrados
- Pagina `main.html` protegida con inicio personalizable y seccion `Portafolio Tracker`
- Seccion `Mercados` con buscador de tickers, autocompletado de Yahoo Finance, grafico interactivo e indicadores

## Abrir localmente

Abre `index.html` directamente en tu navegador.

## Pagos (Stripe — en producción)

El frontend inicia el checkout en `app.js` mediante:

```js
window.BlackPortfolioPayments.startCheckout({ gateway, plan, user })
```

Endpoints reales del backend (FastAPI en Railway):

- `POST /api/billing/stripe/create-checkout-session`
- `POST /api/billing/stripe/confirm`
- `POST /api/billing/stripe/portal`
- `POST /api/billing/stripe/webhook` (verificado por firma)

El plan del usuario es autoritativo en PostgreSQL (`app_users.plan`); nunca se confía en el cliente.

## Credenciales demo

- Correo: `demo@blackportfolio.ai`
- Contrasena: `Black2026!`

## Respaldos y restauración (PostgreSQL)

Los respaldos cifrados se generan automáticamente al arrancar la API (`start_backup_scheduler`),
cada `BACKUP_INTERVAL_HOURS` (def. 24), conservando `BACKUP_RETENTION_COUNT` (def. 30).

**Destino:** si `BACKUP_DIR` está definido (recomendado: volumen persistente de Railway,
p. ej. `/data/backups`), los respaldos se guardan en disco — no requiere Firebase Blaze.
Si no, se usa `FIREBASE_BACKUP_BUCKET` (Firebase Storage, exige plan Blaze).
Variable común requerida: `BACKUP_ENCRYPTION_KEY` (Fernet).

Crear un respaldo manual:

```bash
python backup_service.py --force --output-dir backups
```

Validar un respaldo SIN tocar producción (descifra + verifica checksum + cuenta filas):

```bash
python restore_service.py --latest                 # el más reciente del bucket
python restore_service.py --file backups/<archivo>.bpbackup
```

Restaurar a PostgreSQL (sobreescribe; exige confirmación explícita):

```bash
python restore_service.py --latest --apply --yes
```

## Planes y límites (autoritativos en el servidor)

El plan real vive en `app_users.plan` (PostgreSQL), nunca en el cliente. El frontend sólo
lo muestra; `PUT /api/portfolios` valida portafolios/posiciones contra `PLAN_LIMITS` y los
parches de perfil descartan `plan`. Cambiar el plan de un usuario: `PUT /api/admin/users/{uid}/plan`.
