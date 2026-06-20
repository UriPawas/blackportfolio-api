# BlackPortfolio Landing

Landing page moderna para presentar una plataforma de creacion y gestion de portafolios de inversion.

## Incluye

- Hero visual con enfoque financiero
- Seccion de beneficios para riesgo, asignacion y reportes
- Planes con cambio mensual y anual
- Formulario de creacion de cuenta con persistencia en `localStorage`
- Hook listo para checkout con PayPal, Stripe o gateway propio
- Barra de navegacion corregida para no tapar contenido al desplazarse
- Pagina `login.html` con acceso para usuario demo y usuarios registrados
- Pagina `main.html` protegida con inicio personalizable y seccion `Portafolio Tracker`
- Seccion `Mercados` con buscador de tickers, autocompletado de Yahoo Finance, grafico interactivo e indicadores

## Abrir localmente

Abre `index.html` directamente en tu navegador.

## Punto de integracion de pagos

La integracion esta preparada en `app.js` mediante:

```js
window.BlackPortfolioPayments.startCheckout({ gateway, plan, user })
```

Y cada proveedor base usa un endpoint sugerido:

- PayPal: `/api/billing/paypal/create-order`
- Stripe: `/api/billing/stripe/create-checkout-session`
- Custom: `/api/billing/custom/checkout`

## Credenciales demo

- Correo: `demo@blackportfolio.ai`
- Contrasena: `Black2026!`

## Respaldos y restauración (PostgreSQL)

Los respaldos cifrados se generan automáticamente al arrancar la API (`start_backup_scheduler`),
cada `BACKUP_INTERVAL_HOURS` (def. 24), conservando `BACKUP_RETENTION_COUNT` (def. 30) en el
bucket de Firebase Storage. Variables requeridas (ya configuradas en Railway):
`BACKUP_ENCRYPTION_KEY` (Fernet), `FIREBASE_BACKUP_BUCKET`, `BACKUP_INTERVAL_HOURS`,
`BACKUP_RETENTION_COUNT`, `FIREBASE_SERVICE_ACCOUNT_JSON`.

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
