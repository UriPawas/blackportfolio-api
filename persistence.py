import base64
import hashlib
import hmac
import json
import os
import struct
import time
from datetime import datetime, timezone
from typing import Any, Callable
from urllib.parse import quote

import firebase_admin
from fastapi import APIRouter, Depends, Header, HTTPException
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from pydantic import BaseModel
from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "portify-6467f")

PLAN_ALIASES = {
    "Free": "Explorer",
    "Institutional Desk": "Wealth Desk",
}
PLAN_LIMITS = {
    "Explorer": {"max_portfolios": 1, "max_positions": 10},
    "Investor": {"max_portfolios": 3, "max_positions": 50},
    "Advisor Pro": {"max_portfolios": None, "max_positions": None},
    "Wealth Desk": {"max_portfolios": None, "max_positions": None},
}


def normalize_plan(plan: str | None) -> str:
    canonical = PLAN_ALIASES.get(str(plan or "").strip(), str(plan or "").strip())
    return canonical if canonical in PLAN_LIMITS else "Explorer"


class Base(DeclarativeBase):
    pass


class AppUser(Base):
    __tablename__ = "app_users"

    firebase_uid: Mapped[str] = mapped_column(String(128), primary_key=True)
    email: Mapped[str | None] = mapped_column(String(320), index=True)
    display_name: Mapped[str | None] = mapped_column(String(200))
    email_verified: Mapped[bool] = mapped_column(default=False)
    role: Mapped[str] = mapped_column(String(40), default="user")
    plan: Mapped[str] = mapped_column(String(80), default="Explorer")
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


class BillingEvent(Base):
    __tablename__ = "billing_events"

    stripe_event_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    event_type: Mapped[str] = mapped_column(String(120), index=True)
    firebase_uid: Mapped[str | None] = mapped_column(String(128), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class TotpCredential(Base):
    """Secreto TOTP del 2FA. Vive SOLO en el servidor: el cliente nunca lo lee.
    Reemplaza el esquema anterior (secreto en el doc Firestore del usuario,
    legible por el navegador y verificado en JS)."""
    __tablename__ = "totp_credentials"

    firebase_uid: Mapped[str] = mapped_column(String(128), primary_key=True)
    secret: Mapped[str | None] = mapped_column(String(64))
    pending_secret: Mapped[str | None] = mapped_column(String(64))
    enabled: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


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
            plan="Explorer",
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
        user.plan = normalize_plan(user.plan)
    return user


# ── 2FA / TOTP (server-side, sin dependencias externas) ───────────────────────

def _b32_decode(secret: str) -> bytes | None:
    s = (secret or "").strip().upper().replace(" ", "")
    s += "=" * ((8 - len(s) % 8) % 8)
    try:
        return base64.b32decode(s)
    except Exception:
        return None


def _generate_totp_secret() -> str:
    return base64.b32encode(os.urandom(20)).decode("ascii").rstrip("=")


def _hotp(secret: str, counter: int) -> str | None:
    key = _b32_decode(secret)
    if not key:
        return None
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = (
        (digest[offset] & 0x7F) << 24
        | (digest[offset + 1] & 0xFF) << 16
        | (digest[offset + 2] & 0xFF) << 8
        | (digest[offset + 3] & 0xFF)
    ) % 1_000_000
    return f"{code:06d}"


def _verify_totp(secret: str, token: str) -> bool:
    token = (token or "").strip()
    if len(token) != 6 or not token.isdigit():
        return False
    counter = int(time.time() // 30)
    for drift in (-1, 0, 1):  # tolera reloj desfasado ±30 s
        expected = _hotp(secret, counter + drift)
        if expected and hmac.compare_digest(expected, token):
            return True
    return False


# Token de sesión "2FA verificado": prueba que el usuario pasó el segundo factor.
# Se exige en los endpoints de datos cuando la cuenta tiene 2FA activo, de modo
# que tener solo la contraseña (token Firebase) NO basta para leer/escribir datos.
_TWOFA_TTL_SECONDS = 12 * 3600


def _twofa_signing_key() -> bytes:
    raw = (
        os.environ.get("TWOFA_SECRET")
        or os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        or "blackportfolio-2fa-fallback-key"
    )
    return hashlib.sha256(raw.encode("utf-8")).digest()


def issue_2fa_token(uid: str) -> str:
    exp = int(time.time()) + _TWOFA_TTL_SECONDS
    payload = f"{uid}:{exp}"
    sig = hmac.new(_twofa_signing_key(), payload.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{payload}:{sig}".encode()).decode("ascii")


def verify_2fa_token(raw_token: str, uid: str) -> bool:
    if not raw_token:
        return False
    try:
        decoded = base64.urlsafe_b64decode(raw_token.encode()).decode("utf-8")
        token_uid, exp_str, sig = decoded.rsplit(":", 2)
        if token_uid != uid or int(exp_str) < int(time.time()):
            return False
        expected = hmac.new(
            _twofa_signing_key(), f"{token_uid}:{exp_str}".encode(), hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, sig)
    except Exception:
        return False


def require_2fa(
    token: dict[str, Any] = Depends(verify_firebase_user),
    session: Session = Depends(get_session),
    x_2fa_token: str | None = Header(default=None, alias="X-2FA-Token"),
) -> dict[str, Any]:
    """Como verify_firebase_user, pero si la cuenta tiene 2FA activo exige además
    un token de sesión 2FA válido. Cuentas sin 2FA pasan sin fricción."""
    cred = session.get(TotpCredential, token["uid"])
    if cred and cred.enabled:
        if not verify_2fa_token(x_2fa_token or "", token["uid"]):
            raise HTTPException(status_code=403, detail="2fa_required")
    return token


def require_plan(*allowed_plans: str) -> Callable:
    allowed = {normalize_plan(plan) for plan in allowed_plans}

    def dependency(
        token: dict[str, Any] = Depends(require_2fa),
        session: Session = Depends(get_session),
    ) -> dict[str, Any]:
        user = upsert_user(session, token)
        session.commit()
        if normalize_plan(user.plan) not in allowed:
            raise HTTPException(status_code=403, detail="Tu plan no incluye esta funcion.")
        return token

    return dependency


class TotpCodeBody(BaseModel):
    code: str = ""


class TotpMigrateBody(BaseModel):
    secret: str = ""


twofa_router = APIRouter(prefix="/api/2fa", tags=["2fa"])


@twofa_router.get("/status")
def twofa_status(
    token: dict[str, Any] = Depends(verify_firebase_user),
    session: Session = Depends(get_session),
):
    cred = session.get(TotpCredential, token["uid"])
    return {"enabled": bool(cred and cred.enabled)}


@twofa_router.post("/setup")
def twofa_setup(
    token: dict[str, Any] = Depends(verify_firebase_user),
    session: Session = Depends(get_session),
):
    uid = token["uid"]
    secret = _generate_totp_secret()
    now = utc_now()
    cred = session.get(TotpCredential, uid)
    if cred is None:
        cred = TotpCredential(
            firebase_uid=uid, secret=None, pending_secret=secret,
            enabled=False, created_at=now, updated_at=now,
        )
        session.add(cred)
    else:
        cred.pending_secret = secret
        cred.updated_at = now
    session.commit()
    label = token.get("email") or uid
    uri = (
        f"otpauth://totp/BlackPortfolio:{quote(label)}?secret={secret}"
        f"&issuer=BlackPortfolio&algorithm=SHA1&digits=6&period=30"
    )
    manual = " ".join(secret[i:i + 4] for i in range(0, len(secret), 4))
    return {"otpauthUri": uri, "manualKey": manual}


@twofa_router.post("/verify-setup")
def twofa_verify_setup(
    body: TotpCodeBody,
    token: dict[str, Any] = Depends(verify_firebase_user),
    session: Session = Depends(get_session),
):
    uid = token["uid"]
    cred = session.get(TotpCredential, uid)
    if not cred or not cred.pending_secret:
        raise HTTPException(status_code=400, detail="Sin proceso de activación pendiente. Reinícialo.")
    if not _verify_totp(cred.pending_secret, body.code):
        raise HTTPException(status_code=400, detail="Código incorrecto. Intenta de nuevo.")
    cred.secret = cred.pending_secret
    cred.pending_secret = None
    cred.enabled = True
    cred.updated_at = utc_now()
    session.add(SecurityActivity(
        firebase_uid=uid, event="2fa_enabled", detail="totp", created_at=utc_now(),
    ))
    session.commit()
    return {"ok": True, "token": issue_2fa_token(uid)}


@twofa_router.post("/verify")
def twofa_verify(
    body: TotpCodeBody,
    token: dict[str, Any] = Depends(verify_firebase_user),
    session: Session = Depends(get_session),
):
    uid = token["uid"]
    cred = session.get(TotpCredential, uid)
    if not cred or not cred.enabled or not cred.secret:
        raise HTTPException(status_code=400, detail="2FA no está activo en esta cuenta.")
    if not _verify_totp(cred.secret, body.code):
        return {"valid": False}
    return {"valid": True, "token": issue_2fa_token(uid)}


@twofa_router.post("/disable")
def twofa_disable(
    body: TotpCodeBody,
    token: dict[str, Any] = Depends(verify_firebase_user),
    session: Session = Depends(get_session),
):
    uid = token["uid"]
    cred = session.get(TotpCredential, uid)
    if not cred or not cred.enabled or not cred.secret:
        raise HTTPException(status_code=400, detail="No hay 2FA activo.")
    if not _verify_totp(cred.secret, body.code):
        raise HTTPException(status_code=400, detail="Código incorrecto. Intenta de nuevo.")
    cred.secret = None
    cred.pending_secret = None
    cred.enabled = False
    cred.updated_at = utc_now()
    session.add(SecurityActivity(
        firebase_uid=uid, event="2fa_disabled", detail="totp", created_at=utc_now(),
    ))
    session.commit()
    return {"ok": True}


@twofa_router.post("/migrate")
def twofa_migrate(
    body: TotpMigrateBody,
    token: dict[str, Any] = Depends(verify_firebase_user),
    session: Session = Depends(get_session),
):
    """Importa el secreto TOTP heredado del doc Firestore al servidor, una sola vez.
    El cliente envía el secreto que ya tenía (y luego lo borra de Firestore)."""
    uid = token["uid"]
    cred = session.get(TotpCredential, uid)
    if cred and cred.enabled:
        return {"ok": True, "enabled": True}  # ya migrado
    secret = (body.secret or "").strip().upper().replace(" ", "")
    if not secret or _b32_decode(secret) is None:
        raise HTTPException(status_code=400, detail="Secreto inválido.")
    now = utc_now()
    if cred is None:
        cred = TotpCredential(
            firebase_uid=uid, secret=secret, pending_secret=None,
            enabled=True, created_at=now, updated_at=now,
        )
        session.add(cred)
    else:
        cred.secret = secret
        cred.pending_secret = None
        cred.enabled = True
        cred.updated_at = now
    session.add(SecurityActivity(
        firebase_uid=uid, event="2fa_migrated", detail="from_firestore", created_at=now,
    ))
    session.commit()
    return {"ok": True, "enabled": True}


class PortfolioWrite(BaseModel):
    portfolios: list[dict[str, Any]]
    source: str = "app"


router = APIRouter(prefix="/api/account", tags=["account"])


@router.get("/bootstrap")
def account_bootstrap(
    token: dict[str, Any] = Depends(require_2fa),
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
    token: dict[str, Any] = Depends(require_2fa),
    session: Session = Depends(get_session),
):
    encoded_size = len(json.dumps(payload.portfolios, ensure_ascii=False).encode("utf-8"))
    if encoded_size > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El portafolio excede el limite de 5 MB.")

    uid = token["uid"]
    current_time = utc_now()
    user = upsert_user(session, token)
    checksum = portfolio_checksum(payload.portfolios)
    snapshot = session.get(PortfolioSnapshot, uid)
    limits = PLAN_LIMITS[normalize_plan(user.plan)]
    existing_portfolios = snapshot.data if snapshot and isinstance(snapshot.data, list) else []
    existing_count = len(existing_portfolios)
    incoming_count = len(payload.portfolios)
    max_portfolios = limits["max_portfolios"]
    if max_portfolios is not None and incoming_count > max(max_portfolios, existing_count):
        raise HTTPException(status_code=403, detail=f"Tu plan permite hasta {max_portfolios} portafolio(s).")

    max_positions = limits["max_positions"]
    if max_positions is not None:
        existing_by_id = {
            str(portfolio.get("id", "")): len(portfolio.get("positions") or [])
            for portfolio in existing_portfolios
        }
        for portfolio in payload.portfolios:
            position_count = len(portfolio.get("positions") or [])
            grandfathered = existing_by_id.get(str(portfolio.get("id", "")), 0)
            if position_count > max(max_positions, grandfathered):
                raise HTTPException(
                    status_code=403,
                    detail=f"Tu plan permite hasta {max_positions} posiciones por portafolio.",
                )
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
    app.include_router(twofa_router)

    @app.on_event("startup")
    def initialize_persistence_tables():
        if DATABASE_URL:
            create_tables()
