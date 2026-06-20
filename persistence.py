import hashlib
import json
import os
from datetime import datetime, timezone
from typing import Any

import firebase_admin
from fastapi import APIRouter, Depends, Header, HTTPException
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from pydantic import BaseModel
from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "portify-6467f")


class Base(DeclarativeBase):
    pass


class AppUser(Base):
    __tablename__ = "app_users"

    firebase_uid: Mapped[str] = mapped_column(String(128), primary_key=True)
    email: Mapped[str | None] = mapped_column(String(320), index=True)
    display_name: Mapped[str | None] = mapped_column(String(200))
    email_verified: Mapped[bool] = mapped_column(default=False)
    role: Mapped[str] = mapped_column(String(40), default="user")
    plan: Mapped[str] = mapped_column(String(80), default="Free")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    profile_data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)


class PortfolioSnapshot(Base):
    __tablename__ = "portfolio_snapshots"

    firebase_uid: Mapped[str] = mapped_column(
        ForeignKey("app_users.firebase_uid", ondelete="CASCADE"), primary_key=True
    )
    data: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    checksum: Mapped[str] = mapped_column(String(64))
    version: Mapped[int] = mapped_column(Integer, default=1)
    source: Mapped[str] = mapped_column(String(40), default="app")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SecurityActivity(Base):
    __tablename__ = "security_activity"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    firebase_uid: Mapped[str] = mapped_column(String(128), index=True)
    event: Mapped[str] = mapped_column(String(80))
    detail: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


def _database_url() -> str:
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="PostgreSQL no esta configurado.")
    if DATABASE_URL.startswith("postgres://"):
        return "postgresql+psycopg://" + DATABASE_URL[len("postgres://"):]
    if DATABASE_URL.startswith("postgresql://"):
        return "postgresql+psycopg://" + DATABASE_URL[len("postgresql://"):]
    return DATABASE_URL


_engine = None
_session_factory = None


def get_engine():
    global _engine, _session_factory
    if _engine is None:
        _engine = create_engine(_database_url(), pool_pre_ping=True)
        _session_factory = sessionmaker(bind=_engine, expire_on_commit=False)
    return _engine


def create_tables() -> None:
    Base.metadata.create_all(get_engine())


def get_session():
    if _session_factory is None:
        get_engine()
    with _session_factory() as session:
        yield session


def initialize_firebase_admin() -> None:
    if firebase_admin._apps:
        return
    service_account = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    if service_account:
        cred = credentials.Certificate(json.loads(service_account))
        firebase_admin.initialize_app(cred, {"projectId": FIREBASE_PROJECT_ID})
    else:
        firebase_admin.initialize_app(options={"projectId": FIREBASE_PROJECT_ID})


def verify_firebase_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticacion requerido.")
    try:
        initialize_firebase_admin()
        return firebase_auth.verify_id_token(authorization[7:], check_revoked=True)
    except Exception:
        raise HTTPException(status_code=401, detail="Sesion invalida o expirada.")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def portfolio_checksum(portfolios: list[dict[str, Any]]) -> str:
    canonical = json.dumps(portfolios, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def upsert_user(session: Session, token: dict[str, Any]) -> AppUser:
    uid = token["uid"]
    current_time = utc_now()
    user = session.get(AppUser, uid)
    if user is None:
        user = AppUser(
            firebase_uid=uid,
            email=token.get("email"),
            display_name=token.get("name"),
            email_verified=bool(token.get("email_verified")),
            role="user",
            plan="Free",
            created_at=current_time,
            last_seen_at=current_time,
            profile_data={},
        )
        session.add(user)
    else:
        user.email = token.get("email") or user.email
        user.display_name = token.get("name") or user.display_name
        user.email_verified = bool(token.get("email_verified"))
        user.last_seen_at = current_time
    return user


class PortfolioWrite(BaseModel):
    portfolios: list[dict[str, Any]]
    source: str = "app"


router = APIRouter(prefix="/api/account", tags=["account"])


@router.get("/bootstrap")
def account_bootstrap(
    token: dict[str, Any] = Depends(verify_firebase_user),
    session: Session = Depends(get_session),
):
    user = upsert_user(session, token)
    snapshot = session.get(PortfolioSnapshot, token["uid"])
    session.commit()
    return {
        "user": {
            "id": user.firebase_uid,
            "email": user.email,
            "displayName": user.display_name,
            "emailVerified": user.email_verified,
            "role": user.role,
            "plan": user.plan,
        },
        "portfolios": snapshot.data if snapshot else None,
        "portfolioChecksum": snapshot.checksum if snapshot else None,
        "portfolioVersion": snapshot.version if snapshot else 0,
        "portfolioSource": snapshot.source if snapshot else None,
    }


@router.put("/portfolios")
def replace_portfolios(
    payload: PortfolioWrite,
    token: dict[str, Any] = Depends(verify_firebase_user),
    session: Session = Depends(get_session),
):
    encoded_size = len(json.dumps(payload.portfolios, ensure_ascii=False).encode("utf-8"))
    if encoded_size > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El portafolio excede el limite de 5 MB.")

    uid = token["uid"]
    current_time = utc_now()
    upsert_user(session, token)
    checksum = portfolio_checksum(payload.portfolios)
    snapshot = session.get(PortfolioSnapshot, uid)
    if snapshot is None:
        snapshot = PortfolioSnapshot(
            firebase_uid=uid,
            data=payload.portfolios,
            checksum=checksum,
            version=1,
            source=payload.source[:40],
            created_at=current_time,
            updated_at=current_time,
        )
        session.add(snapshot)
        event = "portfolio_migrated" if payload.source.startswith("migration") else "portfolio_created"
    elif snapshot.checksum == checksum:
        session.commit()
        return {"ok": True, "checksum": checksum, "version": snapshot.version, "unchanged": True}
    else:
        snapshot.data = payload.portfolios
        snapshot.checksum = checksum
        snapshot.version += 1
        snapshot.source = payload.source[:40]
        snapshot.updated_at = current_time
        event = "portfolio_updated"

    session.add(SecurityActivity(
        firebase_uid=uid,
        event=event,
        detail=f"source={payload.source[:40]}; portfolios={len(payload.portfolios)}; checksum={checksum}",
        created_at=current_time,
    ))
    session.commit()
    return {"ok": True, "checksum": checksum, "version": snapshot.version, "unchanged": False}


def install_persistence(app) -> None:
    app.include_router(router)

    @app.on_event("startup")
    def initialize_persistence_tables():
        if DATABASE_URL:
            create_tables()
