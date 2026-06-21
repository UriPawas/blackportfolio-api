"""Consulta el plan autoritativo de un usuario en PostgreSQL (verificación del webhook).

Tras un checkout (real o con cupón de beta), úsalo para confirmar que el webhook
elevó/degradó el plan en app_users. Requiere DATABASE_URL (corre en Railway):

    railway run python scripts/check_user_plan.py payer@example.com
    railway run python scripts/check_user_plan.py --uid <firebase_uid>
"""
import argparse
import json
import os
import sys

# Permite ejecutar el script desde scripts/ o desde la raíz del repo.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select

from persistence import AppUser, BillingEvent, get_engine, get_session


def main() -> int:
    p = argparse.ArgumentParser(description="Muestra plan y estado de billing de un usuario.")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("email", nargs="?", help="Email del usuario")
    g.add_argument("--uid", help="Firebase UID del usuario")
    args = p.parse_args()

    get_engine()
    scope = get_session()
    session = next(scope)
    try:
        if args.uid:
            user = session.get(AppUser, args.uid)
        else:
            user = session.execute(
                select(AppUser).where(AppUser.email == args.email)
            ).scalars().first()

        if user is None:
            print("Usuario no encontrado.")
            return 1

        profile = user.profile_data or {}
        print(json.dumps({
            "uid": user.firebase_uid,
            "email": user.email,
            "plan": user.plan,
            "billingStatus": profile.get("billingStatus"),
            "billingCycle": profile.get("billingCycle"),
            "stripeCustomerId": profile.get("stripeCustomerId"),
            "stripeSubscriptionId": profile.get("stripeSubscriptionId"),
        }, indent=2, ensure_ascii=False))

        events = session.execute(
            select(BillingEvent).where(BillingEvent.firebase_uid == user.firebase_uid)
            .order_by(BillingEvent.created_at.desc()).limit(5)
        ).scalars().all()
        if events:
            print("\nÚltimos eventos de billing:")
            for e in events:
                print(f"  {e.created_at}  {e.event_type}  ({e.stripe_event_id})")
        return 0
    finally:
        session.close()
        scope.close()


if __name__ == "__main__":
    sys.exit(main())
