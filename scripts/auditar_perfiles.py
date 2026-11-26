"""Busca perfiles manipulados por el hueco de mass assignment de PATCH /api/account/profile.

Hasta el arreglo de nov-2026 el cliente podía escribir en app_users.profile_data claves que
son del servidor. Este script es SOLO LECTURA y marca lo sospechoso:

  · billingEventAt en el futuro  → congelaba los webhooks de Stripe de esa cuenta
  · betaGrant sin código de beta, o que vence mucho después de lo que da cualquier código
  · cancelAtPeriodEnd sin suscripción de Stripe
  · 2FA reemplazado: alta repetida sin una baja en medio (el bypass de /2fa/setup)

Requiere DATABASE_URL (corre en Railway):

    railway run python scripts/auditar_perfiles.py
"""
import os
import sys
import time
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select

from persistence import AppUser, BetaCode, SecurityActivity, get_engine, get_session

MARGEN_FUTURO_S = 3600          # un evento de Stripe no puede ser "de mañana"
VENCE_DE_MAS_DIAS = 400         # más allá de esto no hay código de beta legítimo


def _fecha(txt):
    try:
        d = datetime.fromisoformat(txt)
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None


def main() -> int:
    get_engine()
    s = next(get_session())
    codigos = {c.code: c for c in s.execute(select(BetaCode)).scalars()}
    ahora = time.time()
    marcados = 0
    for u in s.execute(select(AppUser)).scalars():
        p = u.profile_data or {}
        motivos = []
        ev = p.get("billingEventAt")
        if isinstance(ev, (int, float)) and ev > ahora + MARGEN_FUTURO_S:
            motivos.append(f"billingEventAt en el futuro ({datetime.fromtimestamp(ev, timezone.utc):%Y-%m-%d})")
        elif ev is not None and not isinstance(ev, (int, float)):
            motivos.append(f"billingEventAt con tipo raro ({type(ev).__name__})")
        g = p.get("betaGrant")
        if isinstance(g, dict):
            code = g.get("code")
            if not code or code not in codigos:
                motivos.append("betaGrant sin un código de beta existente")
            ini, fin = _fecha(g.get("grantedAt")), _fecha(g.get("expiresAt"))
            if fin and (fin - (ini or datetime.now(timezone.utc))).days > VENCE_DE_MAS_DIAS:
                motivos.append(f"betaGrant vence {fin:%Y-%m-%d} ({(fin - datetime.now(timezone.utc)).days} días)")
        elif g is not None:
            motivos.append("betaGrant con tipo raro")
        if p.get("cancelAtPeriodEnd") and not p.get("stripeSubscriptionId"):
            motivos.append("cancelAtPeriodEnd sin suscripción de Stripe")
        if motivos:
            marcados += 1
            print(f"{u.firebase_uid}  plan={u.plan}  " + " | ".join(motivos))
    # 2FA reemplazado: dos altas ('2fa_enabled') seguidas sin una baja ('2fa_disabled') en medio solo eran posibles
    # con el hueco de /2fa/setup + /verify-setup (o, raro, tras una migración); el dueño legítimo siempre pasaba por /disable.
    hist = {}
    for a in s.execute(select(SecurityActivity).order_by(SecurityActivity.created_at)).scalars():
        if a.event in ("2fa_enabled", "2fa_disabled", "2fa_migrated"):
            hist.setdefault(a.firebase_uid, []).append(a)
    for uid, evs in hist.items():
        activo, repetido = False, None
        for a in evs:
            if a.event == "2fa_disabled":
                activo = False
            else:
                if activo and a.event == "2fa_enabled":
                    repetido = a.created_at
                activo = True
        if repetido:
            marcados += 1
            print(f"{uid}  2FA reemplazado sin desactivarlo antes (alta repetida el {repetido:%Y-%m-%d %H:%M})")
    print(f"\n{marcados} cuenta(s) sospechosa(s). Revísalas a mano antes de tocar nada: este script no modifica la base.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
