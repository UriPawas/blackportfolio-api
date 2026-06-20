import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from firebase_admin import auth as firebase_auth
from firebase_admin import firestore

from persistence import (
    AppUser,
    PortfolioSnapshot,
    SecurityActivity,
    create_tables,
    get_session,
    initialize_firebase_admin,
    normalize_plan,
    portfolio_checksum,
)


def now():
    return datetime.now(timezone.utc)


def json_safe(value):
    return json.loads(json.dumps(value, default=lambda item: item.isoformat() if hasattr(item, "isoformat") else str(item)))


def list_auth_users():
    page = firebase_auth.list_users()
    while page:
        yield from page.users
        page = page.get_next_page()


def main():
    parser = argparse.ArgumentParser(description="Migra usuarios y portafolios sin borrar Firestore.")
    parser.add_argument("--apply", action="store_true", help="Aplica la migracion; por defecto solo valida.")
    args = parser.parse_args()

    if not os.environ.get("DATABASE_URL"):
        raise RuntimeError("DATABASE_URL es obligatorio.")
    initialize_firebase_admin()
    create_tables()
    firestore_db = firestore.client()
    auth_users = list(list_auth_users())
    profiles = {doc.id: json_safe(doc.to_dict()) for doc in firestore_db.collection("users").stream()}
    portfolio_docs = {doc.id: json_safe(doc.to_dict()) for doc in firestore_db.collection("portfolios").stream()}
    print(f"Detectados: {len(auth_users)} usuarios, {len(profiles)} perfiles y {len(portfolio_docs)} documentos de portafolio.")

    if not args.apply:
        print("Validacion terminada; no se escribio ni elimino ningun dato.")
        return 0

    session_scope = get_session()
    session = next(session_scope)
    migrated_users = 0
    migrated_portfolios = 0
    conflicts = []
    try:
        for auth_user in auth_users:
            uid = auth_user.uid
            profile = profiles.get(uid, {})
            current_time = now()
            user = session.get(AppUser, uid)
            if user is None:
                created_ms = getattr(auth_user.user_metadata, "creation_timestamp", None)
                user = AppUser(
                    firebase_uid=uid,
                    email=auth_user.email,
                    display_name=auth_user.display_name or profile.get("fullName"),
                    email_verified=bool(auth_user.email_verified),
                    role=profile.get("role", "user"),
                    plan=normalize_plan(profile.get("selectedPlan")),
                    created_at=datetime.fromtimestamp(created_ms / 1000, timezone.utc) if created_ms else current_time,
                    last_seen_at=current_time,
                    profile_data=profile,
                )
                session.add(user)
            else:
                user.email = auth_user.email or user.email
                user.display_name = auth_user.display_name or profile.get("fullName") or user.display_name
                user.email_verified = bool(auth_user.email_verified)
                user.role = profile.get("role", user.role)
                user.plan = normalize_plan(profile.get("selectedPlan", user.plan))
                user.profile_data = profile
            session.flush()
            migrated_users += 1

            portfolios = portfolio_docs.get(uid, {}).get("data")
            if not isinstance(portfolios, list):
                continue
            checksum = portfolio_checksum(portfolios)
            snapshot = session.get(PortfolioSnapshot, uid)
            if snapshot is None:
                session.add(PortfolioSnapshot(
                    firebase_uid=uid,
                    data=portfolios,
                    checksum=checksum,
                    version=1,
                    source="migration_firestore",
                    created_at=current_time,
                    updated_at=current_time,
                ))
                migrated_portfolios += 1
            elif snapshot.checksum == checksum:
                migrated_portfolios += 1
            else:
                conflicts.append(uid)

        session.add(SecurityActivity(
            firebase_uid="system",
            event="firestore_migration",
            detail=f"users={migrated_users}; portfolios={migrated_portfolios}; conflicts={len(conflicts)}",
            created_at=now(),
        ))
        session.commit()
        for uid in conflicts:
            print(f"CONFLICTO {uid}: PostgreSQL contiene datos distintos y no fue sobrescrito.")
        print(f"Migracion verificada: {migrated_users} usuarios y {migrated_portfolios} portafolios.")
        print("Firestore no fue modificado ni eliminado.")
        return 2 if conflicts else 0
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
        session_scope.close()


if __name__ == "__main__":
    raise SystemExit(main())
