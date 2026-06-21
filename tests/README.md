# Pruebas pre-beta (P0)

Cubre los 3 chequeos críticos antes de invitar usuarios a la beta cerrada.

---

## 1. Smoke tests automatizados (flujo crítico)

Corren contra **SQLite temporal** con autenticación de Firebase simulada y firma
de Stripe real. **No tocan producción** ni requieren credenciales.

```bash
pip install -r requirements-dev.txt
python -m pytest tests/ -q
```

Qué verifican:

- **Cuenta** (`test_account_flow.py`): alta/bootstrap → guardar portafolio →
  límites de plan (portafolios y posiciones de Explorer) → gating por email
  verificado → flujo 2FA completo (setup → verify → el token de sesión 2FA es
  obligatorio para leer datos) → export/delete GDPR (el secreto TOTP nunca se exporta).
- **Billing** (`test_billing_webhook.py`): firma del webhook (válida vs. inválida) →
  `checkout.session.completed` eleva el plan en `app_users` → **cupón 100%-off de beta**
  (`payment_status=no_payment_required`) también activa el plan → idempotencia →
  cancelación degrada a Explorer → `/confirm` valida la sesión server-side.

---

## 2. Webhook E2E real con Stripe CLI + cupón de descuento

Verifica la cadena completa **Stripe → Railway → plan en PostgreSQL** sin gastar dinero,
usando un código de descuento 100%-off (los pagos reales ya están activos).

### a) Crear el cupón de beta (una vez)

En el panel admin (`admin.html` → Códigos de descuento) crea uno **100% off**, o por API:

```bash
curl -X POST https://<tu-backend>.railway.app/api/admin/promo-codes \
  -H "Authorization: Bearer <ID_TOKEN_ADMIN>" \
  -H "X-2FA-Token: <TOKEN_2FA>" \
  -H "Content-Type: application/json" \
  -d '{"code":"BETA100","discountType":"percent","percentOff":100,"maxRedemptions":50}'
```

### b) Reenviar webhooks a Railway y disparar la firma

```bash
stripe login
# Reenvía los eventos reales del checkout al backend en producción/staging:
stripe listen --forward-to https://<tu-backend>.railway.app/api/billing/stripe/webhook
# (Imprime un whsec_…; debe coincidir con STRIPE_WEBHOOK_SECRET en Railway.)
```

### c) Checkout real con el cupón

1. En la app, inicia el upgrade a un plan de pago (p. ej. Advisor Pro).
2. En Stripe Checkout, introduce **BETA100** → el total queda en $0
   (`payment_status=no_payment_required`).
3. Stripe envía `checkout.session.completed` → `stripe listen` lo reenvía al webhook.

### d) Confirmar que el plan se actualizó en la base autoritativa

```bash
railway run python scripts/check_user_plan.py <email_del_tester>
```

Debe mostrar `"plan": "Advisor Pro"` y `"billingStatus": "active"`. Repite con una
cancelación desde el portal de Stripe y confirma que vuelve a `Explorer`.

> Prueba rápida solo-de-firma (sin actualizar un usuario real): `stripe trigger
> checkout.session.completed`. Valida que el endpoint recibe y verifica la firma,
> pero el evento sintético no trae tu `uid`/`plan`, así que no cambia ningún plan.

---

## 3. Respaldos en volumen de Railway (sin Firebase Blaze)

Firebase Storage exige el plan Blaze, así que los respaldos se guardan en un
**volumen persistente de Railway**. El destino lo decide `BACKUP_DIR`:
si está definido se usa el disco local (Railway); si no, se intenta Firebase.
Mismo cifrado Fernet, misma retención (`BACKUP_RETENTION_COUNT`) y misma validación.

### a) Crear el volumen y la variable (una vez)

1. Railway → tu servicio → **Variables** → añade `BACKUP_DIR=/data/backups`.
2. Railway → tu servicio → pestaña **Volumes** → **New Volume**, mount path **`/data`**.
3. (Opcional) elimina `FIREBASE_BACKUP_BUCKET` para que no haya ambigüedad.
   `BACKUP_ENCRYPTION_KEY` ya está configurada y se sigue usando.

Tras el redeploy, el scheduler escribe un `.bpbackup` cifrado en `/data/backups`
cada `BACKUP_INTERVAL_HOURS`.

### b) Forzar un respaldo y validarlo (sin tocar PostgreSQL)

```bash
railway run python backup_service.py --force        # crea uno ahora en BACKUP_DIR
railway run python restore_service.py --latest      # descifra + verifica checksum
```

Salida esperada del restore: JSON con `"valid": true`, `checksum`, `createdAt` y el
conteo de filas por tabla. **No usar `--apply`** salvo que quieras sobreescribir
producción (eso además exige `--yes`).

> Probado en local con SQLite + carpeta temporal: backup → volumen → `restore --latest`
> valida con checksum correcto.
