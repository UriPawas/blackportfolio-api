import base64
import hashlib
import hmac
import json
import os
import secrets
import struct
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Callable
from urllib.parse import quote

import firebase_admin
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, create_engine, delete, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "portify-6467f")

# Limiter compartido entre api.py y los routers de este módulo, para que los
# endpoints sensibles de 2FA cuenten con el mismo control de tasa que el resto.
def _client_ip(request: Request) -> str:
    """IP real del cliente. uvicorn corre con --proxy-headers --forwarded-allow-ips "*",
    así que ya resuelve request.client.host tomando la PRIMERA entrada de
    X-Forwarded-For, que en el edge de Railway es la IP real del cliente. La versión
    anterior de esta función reparseaba el header a mano y tomaba la ÚLTIMA entrada
    -un salto interno de Railway que cambia en cada petición-, lo que apagaba el
    rate limit por completo (auditoría 2026-09-03: 45/45 y 70/70 peticiones sin un
    solo 429). No hace falta tocar el header: dejar que uvicorn lo resuelva."""
    return get_remote_address(request)


limiter = Limiter(key_func=_client_ip, default_limits=["200/minute"])

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


# Cuota diaria de llamadas a IA por usuario (todas las funciones de IA comparten
# el mismo contador). El rate-limit por IP no basta para controlar el gasto de
# OpenRouter: esta cuota es por uid y es autoritativa en el servidor.
# Sobreescribible por entorno: AI_DAILY_LIMIT_EXPLORER, AI_DAILY_LIMIT_INVESTOR,
# AI_DAILY_LIMIT_ADVISOR_PRO, AI_DAILY_LIMIT_WEALTH_DESK.
AI_DAILY_LIMITS = {
    "Explorer": 5,
    "Investor": 25,
    "Advisor Pro": 60,
    "Wealth Desk": 120,
}


def ai_daily_limit(plan: str) -> int:
    plan = normalize_plan(plan)
    env_key = "AI_DAILY_LIMIT_" + plan.upper().replace(" ", "_")
    try:
        return int(os.environ.get(env_key, "") or AI_DAILY_LIMITS[plan])
    except ValueError:
        return AI_DAILY_LIMITS[plan]


# Cuentas demo de solo lectura: la contraseña del demo es pública, así que sin
# esto cualquiera podría vandalizar el portafolio que ve el siguiente visitante
# (o activarle 2FA y bloquear el acceso demo para todos).
DEMO_READONLY_EMAILS = {
    e.strip().lower()
    for e in os.environ.get("DEMO_READONLY_EMAILS", "demo@blackportfolio.ai").split(",")
    if e.strip()
}


def is_demo_account(token: dict[str, Any]) -> bool:
    return (token.get("email") or "").strip().lower() in DEMO_READONLY_EMAILS


def ensure_writable_account(token: dict[str, Any]) -> None:
    if is_demo_account(token):
        raise HTTPException(
            status_code=403,
            detail="La cuenta demo es de solo lectura. Crea tu propia cuenta para guardar cambios.",
        )


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
    # Cifrados en reposo (Fernet). 255 y no 64: el texto cifrado de un secreto
    # base32 de 32 caracteres ocupa ~140. Ver _totp_encrypt/_totp_decrypt.
    secret: Mapped[str | None] = mapped_column(String(255))
    pending_secret: Mapped[str | None] = mapped_column(String(255))
    enabled: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class TotpBackupCode(Base):
    """Códigos de respaldo de un solo uso para el 2FA. Se guardan SOLO como hash
    (SHA-256); el texto plano se muestra al usuario una única vez al generarlos.
    Permiten recuperar el acceso si pierde el autenticador."""
    __tablename__ = "totp_backup_codes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    firebase_uid: Mapped[str] = mapped_column(String(128), index=True)
    code_hash: Mapped[str] = mapped_column(String(64))
    used: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Feedback(Base):
    """Feedback in-app enviado por usuarios durante la beta. El email/nombre/plan
    se capturan server-side desde app_users (no se confía en el cliente)."""
    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    firebase_uid: Mapped[str] = mapped_column(String(128), index=True)
    email: Mapped[str | None] = mapped_column(String(320))
    display_name: Mapped[str | None] = mapped_column(String(200))
    plan: Mapped[str | None] = mapped_column(String(80))
    category: Mapped[str] = mapped_column(String(40), default="general")
    message: Mapped[str] = mapped_column(Text)
    page: Mapped[str | None] = mapped_column(String(200))
    user_agent: Mapped[str | None] = mapped_column(String(400))
    app_version: Mapped[str | None] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(20), default="new", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class BetaAllowlist(Base):
    """Correos autorizados para la beta CERRADA. Si BETA_CLOSED está activo, solo
    estos correos (más admins y exentos) pueden usar la app. El email se guarda
    en minúsculas para comparación case-insensitive."""
    __tablename__ = "beta_allowlist"

    email: Mapped[str] = mapped_column(String(320), primary_key=True)
    added_by: Mapped[str | None] = mapped_column(String(320))
    note: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class BetaCode(Base):
    """Códigos de invitación a la beta. El usuario los canjea al registrarse y
    obtiene un plan completo por `duration_days` (sin pagar). A diferencia de los
    promo codes de Stripe (descuento en checkout), esto otorga acceso inmediato:
    suma el correo a la allowlist y eleva el plan con caducidad. Si después el
    usuario paga por Stripe, el plan real (billingStatus="active") prevalece."""
    __tablename__ = "beta_codes"

    code: Mapped[str] = mapped_column(String(40), primary_key=True)
    plan: Mapped[str] = mapped_column(String(80), default="Advisor Pro")
    duration_days: Mapped[int] = mapped_column(Integer, default=30)
    max_redemptions: Mapped[int] = mapped_column(Integer, default=1)
    redemptions: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(default=True)
    created_by: Mapped[str | None] = mapped_column(String(320))
    note: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class PortfolioShare(Base):
    """Enlace público de solo lectura de un portafolio. El token es opaco y mapea
    a (uid, portfolio_id). Revocable. La vista pública sanea los datos: muestra
    asignación y desempeño, nunca credenciales ni datos de cuenta."""
    __tablename__ = "portfolio_shares"

    token: Mapped[str] = mapped_column(String(32), primary_key=True)
    firebase_uid: Mapped[str] = mapped_column(String(128), index=True)
    portfolio_id: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class UserAlert(Base):
    """Alerta de precio definida por el usuario. Un scheduler la evalúa
    periódicamente y, al dispararse, genera una notificación in-app (y email si
    SMTP está configurado)."""
    __tablename__ = "user_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    firebase_uid: Mapped[str] = mapped_column(String(128), index=True)
    symbol: Mapped[str] = mapped_column(String(40))
    kind: Mapped[str] = mapped_column(String(20), default="price_above")  # price_above | price_below
    threshold: Mapped[float] = mapped_column(Float)
    note: Mapped[str | None] = mapped_column(String(120), nullable=True)
    active: Mapped[bool] = mapped_column(default=True)
    triggered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class UserNotification(Base):
    """Notificación in-app para el usuario (p. ej. una alerta disparada)."""
    __tablename__ = "user_notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    firebase_uid: Mapped[str] = mapped_column(String(128), index=True)
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str | None] = mapped_column(String(400), nullable=True)
    kind: Mapped[str] = mapped_column(String(30), default="alert")
    read: Mapped[bool] = mapped_column(default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AnalyticsEvent(Base):
    """Analítica de producto first-party (sin dependencias externas). Registra qué
    hacen los usuarios durante la beta (qué módulos usan, dónde abandonan). El uid y
    el plan se toman server-side; el cliente solo envía el nombre del evento y props."""
    __tablename__ = "analytics_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    firebase_uid: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    event: Mapped[str] = mapped_column(String(60), index=True)
    props: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    plan: Mapped[str | None] = mapped_column(String(80), nullable=True)
    path: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class AiUsage(Base):
    """Contador diario de llamadas a IA por usuario (control de gasto OpenRouter).
    Clave compuesta (uid, día UTC); todas las funciones de IA suman aquí."""
    __tablename__ = "ai_usage"

    firebase_uid: Mapped[str] = mapped_column(String(128), primary_key=True)
    day: Mapped[str] = mapped_column(String(10), primary_key=True)  # YYYY-MM-DD (UTC)
    count: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AiCache(Base):
    """Respuestas de IA cacheadas por hash del payload (kind|lang|modelo|datos).
    Si el portafolio no cambió, se sirve el análisis guardado en vez de pagar
    otra llamada a OpenRouter. Un cache hit NO consume cuota diaria."""
    __tablename__ = "ai_cache"

    cache_key: Mapped[str] = mapped_column(String(64), primary_key=True)
    model: Mapped[str | None] = mapped_column(String(120))
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


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
        _engine = create_engine(
            _database_url(),
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            pool_recycle=300,
        )
        _session_factory = sessionmaker(bind=_engine, expire_on_commit=False)
    return _engine


def create_tables() -> None:
    engine = get_engine()
    Base.metadata.create_all(engine)
    _widen_totp_secret_columns(engine)


def _widen_totp_secret_columns(engine) -> None:
    """create_all no altera columnas existentes, y el secreto TOTP cifrado ya no
    cabe en los VARCHAR(64) originales. Idempotente; SQLite no aplica longitud."""
    if engine.dialect.name != "postgresql":
        return
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            for column in ("secret", "pending_secret"):
                conn.execute(text(
                    f"ALTER TABLE totp_credentials ALTER COLUMN {column} TYPE VARCHAR(255)"
                ))
    except Exception as exc:
        print(f"[2fa] no se pudo ampliar totp_credentials: {exc}", flush=True)


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


# Cache corto de tokens ya verificados. verify_id_token(check_revoked=True)
# hace un round-trip a la API de Firebase en CADA request autenticado; con el
# cache solo se paga una vez por minuto por usuario. TTL corto a propósito:
# una revocación de sesión tarda ≤60 s en surtir efecto.
_TOKEN_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
_TOKEN_CACHE_TTL = 60
_TOKEN_CACHE_MAX = 512


def verify_firebase_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticacion requerido.")
    raw_token = authorization[7:]
    cache_key = hashlib.sha256(raw_token.encode()).hexdigest()
    now = time.time()
    cached = _TOKEN_CACHE.get(cache_key)
    if cached and now - cached[0] < _TOKEN_CACHE_TTL:
        return cached[1]
    try:
        initialize_firebase_admin()
        decoded = firebase_auth.verify_id_token(raw_token, check_revoked=True)
    except Exception:
        _TOKEN_CACHE.pop(cache_key, None)
        raise HTTPException(status_code=401, detail="Sesion invalida o expirada.")
    if len(_TOKEN_CACHE) >= _TOKEN_CACHE_MAX:
        cutoff = now - _TOKEN_CACHE_TTL
        for k in [k for k, v in _TOKEN_CACHE.items() if v[0] < cutoff]:
            _TOKEN_CACHE.pop(k, None)
        if len(_TOKEN_CACHE) >= _TOKEN_CACHE_MAX:
            _TOKEN_CACHE.clear()
    _TOKEN_CACHE[cache_key] = (now, decoded)
    return decoded


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def portfolio_checksum(portfolios: list[dict[str, Any]]) -> str:
    canonical = json.dumps(portfolios, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


# Longitud maxima por campo de texto libre. Un nombre de 1 MB cabia de sobra en
# el limite de 5 MB del snapshot y reventaba el layout de quien lo abriera.
_TEXT_LIMITS = {"name": 120, "description": 500, "ticker": 40, "note": 2000, "type": 20}


def _strip_markup(value: Any, limit: int) -> Any:
    """Quita `<` y `>` y recorta. No rechaza ni convierte tipos."""
    if not isinstance(value, str):
        return value
    clean = value.replace("<", "").replace(">", "")
    return clean[:limit]


def sanitize_portfolios(portfolios: list[Any]) -> list[Any]:
    """Sanea EN SITIO los campos de texto que el frontend pinta como HTML.

    Por que asi y no con un esquema estricto: rechazar una escritura mal formada
    dejaria fuera de servicio a cualquier usuario cuyo snapshot ya guardado no
    cumpla el esquema nuevo — no podria volver a guardar nunca. Aqui se limpia y
    se deja pasar, que es fail-open en disponibilidad y fail-closed en inyeccion.
    Tampoco se tocan las claves desconocidas: borrarlas seria perder datos.

    El frontend ya escapa al pintar; esto cubre a cualquier otro cliente y a los
    snapshots que ya esten envenenados.
    """
    if not isinstance(portfolios, list):
        return portfolios
    for portfolio in portfolios:
        if not isinstance(portfolio, dict):
            continue
        for key in ("name", "description"):
            if key in portfolio:
                portfolio[key] = _strip_markup(portfolio[key], _TEXT_LIMITS[key])
        for position in (portfolio.get("positions") or []):
            if not isinstance(position, dict):
                continue
            if "ticker" in position:
                position["ticker"] = _strip_markup(position["ticker"], _TEXT_LIMITS["ticker"])
            if "note" in position:
                position["note"] = _strip_markup(position["note"], _TEXT_LIMITS["note"])
        for tx in (portfolio.get("transactions") or []):
            if not isinstance(tx, dict):
                continue
            for key in ("ticker", "type"):
                if key in tx:
                    tx[key] = _strip_markup(tx[key], _TEXT_LIMITS[key])
    return portfolios


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
        _maybe_expire_beta_grant(user)
    return user


def _maybe_expire_beta_grant(user: "AppUser") -> None:
    """Si el usuario tiene un acceso de beta caducado (y no pagó por Stripe),
    lo degrada a Explorer. Se evalúa de forma perezosa en cada bootstrap/escritura,
    así no hace falta un job en segundo plano."""
    profile = user.profile_data or {}
    grant = profile.get("betaGrant")
    if not grant or grant.get("expired"):
        return
    if profile.get("billingStatus") == "active":
        return  # pagó por Stripe: el plan real manda sobre la beta
    expires_at = grant.get("expiresAt")
    try:
        expired = bool(expires_at) and datetime.fromisoformat(expires_at) < utc_now()
    except (ValueError, TypeError):
        expired = False
    if not expired:
        return
    profile = dict(profile)
    grant = dict(grant)
    grant["expired"] = True
    profile["betaGrant"] = grant
    profile["billingStatus"] = "beta_expired"
    user.profile_data = profile
    user.plan = "Explorer"


def redeem_beta_code(session: Session, token: dict[str, Any], raw_code: str) -> dict[str, Any]:
    """Canjea un código de beta: eleva el plan del usuario por `duration_days`,
    lo añade a la allowlist (para pasar el gate de beta cerrada) y consume un uso
    del código. Idempotente frente a doble-canje: rechaza si ya hay beta activa."""
    code = (raw_code or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Código requerido.")
    bc = session.get(BetaCode, code)
    if bc is None or not bc.active:
        raise HTTPException(status_code=404, detail="Código inválido o inactivo.")
    if bc.redemptions >= bc.max_redemptions:
        raise HTTPException(status_code=409, detail="Este código ya alcanzó su límite de usos.")

    user = upsert_user(session, token)
    profile = dict(user.profile_data or {})
    grant = profile.get("betaGrant")
    if grant and not grant.get("expired") and profile.get("billingStatus") == "beta":
        raise HTTPException(status_code=409, detail="Ya tienes un acceso de beta activo.")

    plan = normalize_plan(bc.plan)
    granted_at = utc_now()
    expires_at = granted_at + timedelta(days=max(1, bc.duration_days))
    profile["betaGrant"] = {
        "code": code,
        "plan": plan,
        "grantedAt": granted_at.isoformat(),
        "expiresAt": expires_at.isoformat(),
        "expired": False,
    }
    profile["billingStatus"] = "beta"
    user.profile_data = profile
    user.plan = plan

    email = (user.email or token.get("email") or "").strip().lower()
    if email and session.get(BetaAllowlist, email) is None:
        session.add(BetaAllowlist(
            email=email,
            added_by=f"beta_code:{code}",
            note="canje de código de beta",
            created_at=granted_at,
        ))

    bc.redemptions += 1
    session.add(SecurityActivity(
        firebase_uid=user.firebase_uid,
        event="beta_code_redeemed",
        detail=f"code={code}; plan={plan}; expires={expires_at.isoformat()}",
        created_at=granted_at,
    ))
    session.commit()
    return {"ok": True, "plan": plan, "expiresAt": expires_at.isoformat()}


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


# ── Cifrado del secreto TOTP en reposo ───────────────────────────────────────
# El secreto TOTP es equivalente al segundo factor: quien lo lee genera códigos
# válidos para siempre. Guardarlo en claro significa que cualquier lectura de la
# base (o de un respaldo, que incluye esta tabla) clona el 2FA de todos.
#
# Clave DEDICADA, distinta de BACKUP_ENCRYPTION_KEY y de TWOFA_SECRET: filtrar
# una no debe entregar las otras. Sin ella el servicio arranca igual y las filas
# heredadas en claro siguen funcionando, pero no se cifra nada nuevo: se avisa
# fuerte en el log en vez de romper el 2FA de quien ya lo tiene activo.
_TOTP_FERNET: Any = None
_TOTP_FERNET_READY = False


def _totp_cipher():
    global _TOTP_FERNET, _TOTP_FERNET_READY
    if not _TOTP_FERNET_READY:
        _TOTP_FERNET_READY = True
        raw = os.environ.get("TOTP_ENCRYPTION_KEY", "").strip()
        if raw:
            try:
                from cryptography.fernet import Fernet
                _TOTP_FERNET = Fernet(raw.encode("ascii"))
            except Exception as exc:
                print(f"[2fa] TOTP_ENCRYPTION_KEY inválida ({exc}): los secretos "
                      "NO se cifrarán en reposo.", flush=True)
        else:
            print("[2fa] TOTP_ENCRYPTION_KEY no configurada: los secretos TOTP "
                  "NO se cifrarán en reposo.", flush=True)
    return _TOTP_FERNET


def _totp_encrypt(secret: str | None) -> str | None:
    """Texto cifrado listo para guardar. Sin clave devuelve el valor tal cual."""
    if not secret:
        return None
    cipher = _totp_cipher()
    if cipher is None:
        return secret
    return cipher.encrypt(secret.encode("ascii")).decode("ascii")


def _totp_decrypt(stored: str | None) -> str | None:
    """Secreto en claro a partir de lo guardado.

    Tolera las filas heredadas sin cifrar para no dejar fuera a quien ya tenía
    2FA activo antes de esta migración: si no descifra, se asume que el valor ya
    era el secreto en claro. Un texto cifrado con otra clave cae en esa rama y
    falla después en _b32_decode, así que no abre ningún atajo de verificación.
    """
    if not stored:
        return None
    cipher = _totp_cipher()
    if cipher is not None:
        try:
            return cipher.decrypt(stored.encode("ascii")).decode("ascii")
        except Exception:
            pass
    return stored


def _encrypt_legacy_totp_secrets() -> None:
    """Cifra de una vez las filas que quedaron en claro. Idempotente."""
    if _totp_cipher() is None:
        return
    scope = get_session()
    session = next(scope)
    try:
        migrated = 0
        for cred in session.execute(select(TotpCredential)).scalars().all():
            changed = False
            for field in ("secret", "pending_secret"):
                value = getattr(cred, field)
                if not value:
                    continue
                # Ya cifrado si descifra limpio; si no, es una fila heredada.
                try:
                    _TOTP_FERNET.decrypt(value.encode("ascii"))
                    continue
                except Exception:
                    pass
                setattr(cred, field, _totp_encrypt(value))
                changed = True
            if changed:
                migrated += 1
        if migrated:
            session.commit()
            print(f"[2fa] {migrated} credencial(es) TOTP cifradas en reposo.", flush=True)
    except Exception as exc:
        session.rollback()
        print(f"[2fa] no se pudieron cifrar los secretos heredados: {exc}", flush=True)
    finally:
        session.close()


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


# ── Códigos de respaldo (recuperación si se pierde el autenticador) ───────────
_BACKUP_CODE_COUNT = 10


def _hash_backup_code(code: str) -> str:
    norm = (code or "").strip().lower().replace(" ", "").replace("-", "")
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()


def _generate_backup_codes(n: int = _BACKUP_CODE_COUNT) -> list[str]:
    codes: list[str] = []
    for _ in range(n):
        s = base64.b32encode(os.urandom(5)).decode("ascii").rstrip("=").lower()[:8]
        codes.append(f"{s[:4]}-{s[4:8]}")
    return codes


def _store_backup_codes(session: Session, uid: str, codes: list[str]) -> None:
    session.execute(delete(TotpBackupCode).where(TotpBackupCode.firebase_uid == uid))
    now = utc_now()
    for c in codes:
        session.add(TotpBackupCode(
            firebase_uid=uid, code_hash=_hash_backup_code(c), used=False, created_at=now,
        ))


def _consume_backup_code(session: Session, uid: str, code: str) -> bool:
    """Si `code` coincide con un código de respaldo sin usar, lo marca usado y
    devuelve True. Un solo uso. NO hace commit (lo hace el endpoint)."""
    code = (code or "").strip()
    if not code or len(code.replace("-", "").replace(" ", "")) < 6:
        return False
    row = session.execute(
        select(TotpBackupCode).where(
            TotpBackupCode.firebase_uid == uid,
            TotpBackupCode.code_hash == _hash_backup_code(code),
            TotpBackupCode.used == False,  # noqa: E712
        )
    ).scalars().first()
    if not row:
        return False
    row.used = True
    row.used_at = utc_now()
    session.add(row)
    return True


def _backup_codes_remaining(session: Session, uid: str) -> int:
    return len(session.execute(
        select(TotpBackupCode.id).where(
            TotpBackupCode.firebase_uid == uid,
            TotpBackupCode.used == False,  # noqa: E712
        )
    ).scalars().all())


# Token de sesión "2FA verificado": prueba que el usuario pasó el segundo factor.
# Se exige en los endpoints de datos cuando la cuenta tiene 2FA activo, de modo
# que tener solo la contraseña (token Firebase) NO basta para leer/escribir datos.
# 7 días fijos desde que se verifica el código en ese dispositivo: el usuario solo
# lo re-escribe una vez por semana y por dispositivo. Mantener alineado con
# TRUSTED_DEVICE_TTL_MS (login.js) y el atajo de confianza de main.js.
_TWOFA_TTL_SECONDS = 7 * 24 * 3600


def _twofa_signing_key() -> bytes:
    # Falla cerrado: sin una clave real configurada, los tokens de sesión 2FA
    # serían falsificables. No usamos un fallback hardcodeado.
    raw = os.environ.get("TWOFA_SECRET") or os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    if not raw:
        raise RuntimeError(
            "2FA signing key no configurada: define TWOFA_SECRET "
            "(o FIREBASE_SERVICE_ACCOUNT_JSON) en el entorno."
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


# ── Beta cerrada (allowlist) ──────────────────────────────────────────────────
# Mientras BETA_CLOSED esté activo (def. cerrada), solo los correos en la tabla
# beta_allowlist —más admins y exentos— pueden usar la app. Para abrir a GA basta
# definir BETA_CLOSED=0 en el entorno; no requiere cambios de código.
BETA_CLOSED = os.environ.get("BETA_CLOSED", "1").strip().lower() not in ("0", "false", "no", "off")

# Admins y la cuenta demo nunca quedan fuera de la beta.
_BETA_EXEMPT_EMAILS = {
    e.strip().lower()
    for e in (
        os.environ.get("ADMIN_EMAILS", "furielpacheco@gmail.com")
        + "," + os.environ.get("EMAIL_VERIFY_EXEMPT_EMAILS", "demo@blackportfolio.ai")
    ).split(",")
    if e.strip()
}


def is_beta_allowed(session: Session, email: str | None) -> bool:
    if not BETA_CLOSED:
        return True
    em = (email or "").strip().lower()
    if not em:
        return False
    if em in _BETA_EXEMPT_EMAILS:
        return True
    return session.get(BetaAllowlist, em) is not None


def _enforce_2fa(session: Session, token: dict[str, Any], x_2fa_token: str | None) -> None:
    """Si la cuenta tiene 2FA activo, exige un token de sesión 2FA válido.
    Las cuentas sin 2FA pasan sin fricción."""
    cred = session.get(TotpCredential, token["uid"])
    if cred and cred.enabled:
        if not verify_2fa_token(x_2fa_token or "", token["uid"]):
            raise HTTPException(status_code=403, detail="2fa_required")


def require_2fa(
    token: dict[str, Any] = Depends(verify_firebase_user),
    session: Session = Depends(get_session),
    x_2fa_token: str | None = Header(default=None, alias="X-2FA-Token"),
) -> dict[str, Any]:
    """Como verify_firebase_user, pero si la cuenta tiene 2FA activo exige además
    un token de sesión 2FA válido. Cuentas sin 2FA pasan sin fricción. Además, si
    la beta está cerrada, exige que el correo esté en la allowlist."""
    _enforce_2fa(session, token, x_2fa_token)
    if not is_beta_allowed(session, token.get("email")):
        raise HTTPException(status_code=403, detail="beta_closed")
    return token


def require_2fa_billing(
    token: dict[str, Any] = Depends(verify_firebase_user),
    session: Session = Depends(get_session),
    x_2fa_token: str | None = Header(default=None, alias="X-2FA-Token"),
) -> dict[str, Any]:
    """El segundo factor SIN el gate de beta cerrada, para las rutas de cobro.

    Contratar es una vía de entrada legítima, así que no puede depender de estar
    ya en la allowlist. Y al revés importa todavía más: quien perdiera el acceso
    a la beta con una suscripción viva tiene que poder entrar al portal de Stripe
    a cancelarla; bloquearlo ahí lo dejaría pagando sin forma de parar.
    """
    _enforce_2fa(session, token, x_2fa_token)
    return token


# Cuentas exentas de la verificación de email (cuenta demo, soporte). Los inicios
# con Google ya llegan con email_verified=True; esto solo cubre email/contraseña.
_VERIFY_EXEMPT_EMAILS = {
    e.strip().lower()
    for e in os.environ.get("EMAIL_VERIFY_EXEMPT_EMAILS", "demo@blackportfolio.ai").split(",")
    if e.strip()
}


def require_verified_email(token: dict[str, Any] = Depends(require_2fa)) -> dict[str, Any]:
    """Como require_2fa, pero además exige que el correo esté verificado. Bloquea
    las escrituras y funciones premium hasta confirmar el email (anti-spam/abuso)."""
    if token.get("email_verified") or (token.get("email") or "").lower() in _VERIFY_EXEMPT_EMAILS:
        return token
    raise HTTPException(status_code=403, detail="email_verification_required")


def require_plan(*allowed_plans: str) -> Callable:
    allowed = {normalize_plan(plan) for plan in allowed_plans}

    def dependency(
        token: dict[str, Any] = Depends(require_verified_email),
        session: Session = Depends(get_session),
    ) -> dict[str, Any]:
        user = upsert_user(session, token)
        session.commit()
        if normalize_plan(user.plan) not in allowed:
            raise HTTPException(status_code=403, detail="Tu plan no incluye esta funcion.")
        return token

    return dependency


def current_plan(
    token: dict[str, Any] = Depends(require_verified_email),
    session: Session = Depends(get_session),
) -> str:
    """Dependencia de IA: exige email verificado (cualquier plan) y devuelve el
    plan normalizado del usuario, para elegir el modelo de OpenRouter por plan."""
    user = upsert_user(session, token)
    session.commit()
    return normalize_plan(user.plan)


def current_ai_user(
    token: dict[str, Any] = Depends(require_verified_email),
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Dependencia de IA: usuario con email verificado + plan normalizado.
    Devuelve uid y plan para aplicar cuota diaria y elegir modelo por plan."""
    user = upsert_user(session, token)
    session.commit()
    return {"uid": token["uid"], "plan": normalize_plan(user.plan)}


def consume_ai_quota(session: Session, uid: str, plan: str) -> int:
    """Consume 1 llamada de la cuota diaria de IA del usuario. Devuelve cuántas
    le quedan; lanza 429 si la cuota del día está agotada."""
    limit = ai_daily_limit(plan)
    now = utc_now()
    day = now.strftime("%Y-%m-%d")
    row = session.get(AiUsage, (uid, day))
    if row is None:
        row = AiUsage(firebase_uid=uid, day=day, count=0, updated_at=now)
        session.add(row)
    if row.count >= limit:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Alcanzaste el límite diario de análisis con IA de tu plan ({limit}/día). "
                "Vuelve mañana o mejora tu plan para ampliar la cuota."
            ),
        )
    row.count += 1
    row.updated_at = now
    session.commit()
    return limit - row.count


AI_CACHE_TTL_SECONDS = int(os.environ.get("AI_CACHE_TTL_SECONDS", str(24 * 3600)))


def ai_cache_get(session: Session, cache_key: str) -> dict[str, Any] | None:
    row = session.get(AiCache, cache_key)
    if row is None:
        return None
    created = row.created_at
    if created is not None and created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    if created is None or (utc_now() - created).total_seconds() > AI_CACHE_TTL_SECONDS:
        session.delete(row)
        session.commit()
        return None
    return {"text": row.text, "model": row.model}


def ai_cache_put(session: Session, cache_key: str, model: str | None, text: str) -> None:
    now = utc_now()
    row = session.get(AiCache, cache_key)
    if row is None:
        session.add(AiCache(cache_key=cache_key, model=(model or "")[:120], text=text, created_at=now))
    else:
        row.model = (model or "")[:120]
        row.text = text
        row.created_at = now
    session.commit()


class TotpCodeBody(BaseModel):
    code: str = ""


class TotpMigrateBody(BaseModel):
    secret: str = ""


# Freno de fuerza bruta por CUENTA para códigos TOTP/backup. El rate limit por IP
# no basta: un atacante distribuido (o falsificando X-Forwarded-For) lo evade.
# Ventana deslizante en memoria (una sola instancia en Railway): tras
# _TOTP_MAX_FAILURES fallos en _TOTP_WINDOW_SECONDS se responde 429 hasta que la
# ventana expira. Un código correcto resetea el contador, así que un usuario
# legítimo con typos nunca queda bloqueado de forma permanente.
_TOTP_MAX_FAILURES = 8
_TOTP_WINDOW_SECONDS = 10 * 60
_totp_failures: dict[str, list[float]] = {}


def _totp_guard(uid: str) -> None:
    now = time.time()
    fails = [t for t in _totp_failures.get(uid, []) if now - t < _TOTP_WINDOW_SECONDS]
    if fails:
        _totp_failures[uid] = fails
    else:
        _totp_failures.pop(uid, None)
    if len(fails) >= _TOTP_MAX_FAILURES:
        raise HTTPException(
            status_code=429,
            detail="Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.",
        )


def _totp_fail(uid: str) -> None:
    if len(_totp_failures) > 10_000:  # cota de memoria ante abuso masivo
        _totp_failures.clear()
    _totp_failures.setdefault(uid, []).append(time.time())


def _totp_ok(uid: str) -> None:
    _totp_failures.pop(uid, None)


twofa_router = APIRouter(prefix="/api/2fa", tags=["2fa"])


@twofa_router.get("/status")
def twofa_status(
    token: dict[str, Any] = Depends(verify_firebase_user),
    session: Session = Depends(get_session),
):
    cred = session.get(TotpCredential, token["uid"])
    enabled = bool(cred and cred.enabled)
    return {
        "enabled": enabled,
        "backupCodesRemaining": _backup_codes_remaining(session, token["uid"]) if enabled else 0,
    }


_TWOFA_ALREADY_ON = "El 2FA ya está activo en esta cuenta. Para cambiar de autenticador, desactívalo primero con un código."


@twofa_router.post("/setup")
@limiter.limit("10/minute")
def twofa_setup(
    request: Request,
    token: dict[str, Any] = Depends(verify_firebase_user),
    session: Session = Depends(get_session),
):
    ensure_writable_account(token)
    uid = token["uid"]
    cred = session.get(TotpCredential, uid)
    # Con 2FA ya activo NO se puede iniciar otro alta: /setup + /verify-setup solo piden la sesión de
    # Firebase, así que con solo la contraseña se reemplazaba el autenticador del dueño y se obtenía un
    # token 2FA nuevo (bypass total, auditoría nov-2026). Para cambiar de autenticador: /disable (pide
    # código o código de respaldo) y luego alta nueva.
    if cred is not None and cred.enabled:
        raise HTTPException(status_code=409, detail=_TWOFA_ALREADY_ON)
    secret = _generate_totp_secret()
    now = utc_now()
    if cred is None:
        cred = TotpCredential(
            firebase_uid=uid, secret=None, pending_secret=_totp_encrypt(secret),
            enabled=False, created_at=now, updated_at=now,
        )
        session.add(cred)
    else:
        cred.pending_secret = _totp_encrypt(secret)
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
@limiter.limit("5/minute")
def twofa_verify_setup(
    request: Request,
    body: TotpCodeBody,
    token: dict[str, Any] = Depends(verify_firebase_user),
    session: Session = Depends(get_session),
):
    uid = token["uid"]
    _totp_guard(uid)
    cred = session.get(TotpCredential, uid)
    if cred is not None and cred.enabled:
        raise HTTPException(status_code=409, detail=_TWOFA_ALREADY_ON)  # defensa en profundidad: nunca reemplaza un secreto activo
    if not cred or not cred.pending_secret:
        raise HTTPException(status_code=400, detail="Sin proceso de activación pendiente. Reinícialo.")
    if not _verify_totp(_totp_decrypt(cred.pending_secret), body.code):
        _totp_fail(uid)
        raise HTTPException(status_code=400, detail="Código incorrecto. Intenta de nuevo.")
    _totp_ok(uid)
    cred.secret = cred.pending_secret
    cred.pending_secret = None
    cred.enabled = True
    cred.updated_at = utc_now()
    session.add(SecurityActivity(
        firebase_uid=uid, event="2fa_enabled", detail="totp", created_at=utc_now(),
    ))
    codes = _generate_backup_codes()
    _store_backup_codes(session, uid, codes)
    session.commit()
    return {"ok": True, "token": issue_2fa_token(uid), "backupCodes": codes}


@twofa_router.post("/verify")
@limiter.limit("5/minute")
def twofa_verify(
    request: Request,
    body: TotpCodeBody,
    token: dict[str, Any] = Depends(verify_firebase_user),
    session: Session = Depends(get_session),
):
    uid = token["uid"]
    _totp_guard(uid)
    cred = session.get(TotpCredential, uid)
    if not cred or not cred.enabled or not cred.secret:
        raise HTTPException(status_code=400, detail="2FA no está activo en esta cuenta.")
    if _verify_totp(_totp_decrypt(cred.secret), body.code):
        _totp_ok(uid)
        return {"valid": True, "token": issue_2fa_token(uid)}
    # Plan B: código de respaldo de un solo uso (recuperación sin autenticador).
    if _consume_backup_code(session, uid, body.code):
        _totp_ok(uid)
        session.add(SecurityActivity(
            firebase_uid=uid, event="2fa_backup_used", detail="login", created_at=utc_now(),
        ))
        session.commit()
        return {
            "valid": True,
            "token": issue_2fa_token(uid),
            "usedBackupCode": True,
            "backupCodesRemaining": _backup_codes_remaining(session, uid),
        }
    _totp_fail(uid)
    return {"valid": False}


@twofa_router.post("/disable")
@limiter.limit("5/minute")
def twofa_disable(
    request: Request,
    body: TotpCodeBody,
    token: dict[str, Any] = Depends(verify_firebase_user),
    session: Session = Depends(get_session),
):
    uid = token["uid"]
    _totp_guard(uid)
    cred = session.get(TotpCredential, uid)
    if not cred or not cred.enabled or not cred.secret:
        raise HTTPException(status_code=400, detail="No hay 2FA activo.")
    if not (_verify_totp(_totp_decrypt(cred.secret), body.code) or _consume_backup_code(session, uid, body.code)):
        _totp_fail(uid)
        raise HTTPException(status_code=400, detail="Código incorrecto. Intenta de nuevo.")
    _totp_ok(uid)
    cred.secret = None
    cred.pending_secret = None
    cred.enabled = False
    cred.updated_at = utc_now()
    session.execute(delete(TotpBackupCode).where(TotpBackupCode.firebase_uid == uid))
    session.add(SecurityActivity(
        firebase_uid=uid, event="2fa_disabled", detail="totp", created_at=utc_now(),
    ))
    session.commit()
    return {"ok": True}


@twofa_router.post("/backup-codes/regenerate")
@limiter.limit("5/minute")
def twofa_regenerate_backup_codes(
    request: Request,
    body: TotpCodeBody,
    token: dict[str, Any] = Depends(verify_firebase_user),
    session: Session = Depends(get_session),
):
    """Genera un juego nuevo de códigos de respaldo (invalida los anteriores).
    Requiere un código TOTP válido del autenticador para autorizar."""
    uid = token["uid"]
    _totp_guard(uid)
    cred = session.get(TotpCredential, uid)
    if not cred or not cred.enabled or not cred.secret:
        raise HTTPException(status_code=400, detail="2FA no está activo en esta cuenta.")
    if not _verify_totp(_totp_decrypt(cred.secret), body.code):
        _totp_fail(uid)
        raise HTTPException(status_code=400, detail="Código incorrecto. Intenta de nuevo.")
    _totp_ok(uid)
    codes = _generate_backup_codes()
    _store_backup_codes(session, uid, codes)
    session.add(SecurityActivity(
        firebase_uid=uid, event="2fa_backup_regenerated", detail="totp", created_at=utc_now(),
    ))
    session.commit()
    return {"ok": True, "backupCodes": codes}


@twofa_router.post("/migrate")
@limiter.limit("5/minute")
def twofa_migrate(
    request: Request,
    body: TotpMigrateBody,
    token: dict[str, Any] = Depends(verify_firebase_user),
    session: Session = Depends(get_session),
):
    """Importa el secreto TOTP heredado del doc Firestore al servidor, una sola vez.
    El cliente envía el secreto que ya tenía (y luego lo borra de Firestore)."""
    ensure_writable_account(token)
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
            firebase_uid=uid, secret=_totp_encrypt(secret), pending_secret=None,
            enabled=True, created_at=now, updated_at=now,
        )
        session.add(cred)
    else:
        cred.secret = _totp_encrypt(secret)
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
    # Version del snapshot que el cliente leyo en su bootstrap. Si el servidor ya
    # avanzo (otra pestana/dispositivo guardo despues), la escritura se rechaza con
    # 409 en vez de sobreescribir lo nuevo con una copia vieja. Las migraciones la
    # omiten a proposito (sobreescriben de forma deliberada).
    baseVersion: int | None = None


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
    token: dict[str, Any] = Depends(require_verified_email),
    session: Session = Depends(get_session),
):
    ensure_writable_account(token)
    encoded_size = len(json.dumps(payload.portfolios, ensure_ascii=False).encode("utf-8"))
    if encoded_size > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El portafolio excede el limite de 5 MB.")

    uid = token["uid"]
    current_time = utc_now()
    user = upsert_user(session, token)
    # Saneado ANTES del checksum: lo que se guarda y lo que se firma tienen que
    # ser lo mismo, o el 409 por version se dispararia solo (P0.1).
    sanitize_portfolios(payload.portfolios)
    checksum = portfolio_checksum(payload.portfolios)
    snapshot = session.get(PortfolioSnapshot, uid)

    # Control de concurrencia: sin esto, la ultima escritura gana a ciegas y una
    # pestana con datos viejos borra posiciones que el usuario nunca elimino.
    # Si el checksum coincide la escritura es un no-op, asi que no hay conflicto.
    if (
        snapshot is not None
        and payload.baseVersion is not None
        and snapshot.checksum != checksum
        and snapshot.version != payload.baseVersion
    ):
        raise HTTPException(status_code=409, detail="portfolio_version_conflict")

    # Fail-closed: un cliente que no manda version no puede demostrar que su copia
    # esta al dia, y escribir a ciegas es justo lo que borro posiciones. Se permite
    # sin version solo cuando no hay nada que pisar (primer guardado), cuando la
    # migracion sobreescribe a proposito, o cuando el guardado no cambia nada.
    if (
        snapshot is not None
        and payload.baseVersion is None
        and snapshot.checksum != checksum
        and not payload.source.startswith("migration")
    ):
        raise HTTPException(status_code=409, detail="portfolio_version_required")

    # La cuenta de administrador (cuenta maestra) no tiene tope de portafolios ni de
    # posiciones, sea cual sea el plan guardado: el plan es para clientes.
    if str(getattr(user, "role", "") or "").strip().lower() == "admin":
        limits = {"max_portfolios": None, "max_positions": None}
    else:
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


# ── Compartir portafolio (#12) ─────────────────────────────────────────────
def _find_portfolio(session: Session, uid: str, portfolio_id: str):
    snapshot = session.get(PortfolioSnapshot, uid)
    portfolios = snapshot.data if snapshot and isinstance(snapshot.data, list) else []
    return next((p for p in portfolios if str(p.get("id")) == str(portfolio_id)), None)


@router.post("/portfolios/{portfolio_id}/share")
def create_share(
    portfolio_id: str,
    token: dict[str, Any] = Depends(require_verified_email),
    session: Session = Depends(get_session),
):
    ensure_writable_account(token)
    uid = token["uid"]
    if _find_portfolio(session, uid, portfolio_id) is None:
        raise HTTPException(status_code=404, detail="Portafolio no encontrado.")
    existing = session.execute(
        select(PortfolioShare).where(
            PortfolioShare.firebase_uid == uid,
            PortfolioShare.portfolio_id == str(portfolio_id),
        )
    ).scalar_one_or_none()
    if existing:
        return {"token": existing.token}
    tok = secrets.token_urlsafe(16)[:22]
    session.add(PortfolioShare(
        token=tok, firebase_uid=uid, portfolio_id=str(portfolio_id), created_at=utc_now(),
    ))
    session.commit()
    return {"token": tok}


@router.get("/portfolios/{portfolio_id}/share")
def get_share(
    portfolio_id: str,
    token: dict[str, Any] = Depends(require_2fa),
    session: Session = Depends(get_session),
):
    existing = session.execute(
        select(PortfolioShare).where(
            PortfolioShare.firebase_uid == token["uid"],
            PortfolioShare.portfolio_id == str(portfolio_id),
        )
    ).scalar_one_or_none()
    return {"token": existing.token if existing else None}


@router.delete("/portfolios/{portfolio_id}/share")
def revoke_share(
    portfolio_id: str,
    token: dict[str, Any] = Depends(require_verified_email),
    session: Session = Depends(get_session),
):
    session.execute(delete(PortfolioShare).where(
        PortfolioShare.firebase_uid == token["uid"],
        PortfolioShare.portfolio_id == str(portfolio_id),
    ))
    session.commit()
    return {"ok": True}


# ── Alertas de precio (#5) ─────────────────────────────────────────────────
class AlertCreate(BaseModel):
    symbol: str
    kind: str = "price_above"  # price_above | price_below
    threshold: float
    note: str | None = None


def _alert_to_dict(a: "UserAlert") -> dict[str, Any]:
    return {
        "id": a.id,
        "symbol": a.symbol,
        "kind": a.kind,
        "threshold": a.threshold,
        "note": a.note,
        "active": a.active,
        "triggeredAt": a.triggered_at.isoformat() if a.triggered_at else None,
        "createdAt": a.created_at.isoformat() if a.created_at else None,
    }


@router.get("/alerts")
def list_alerts(
    token: dict[str, Any] = Depends(require_2fa),
    session: Session = Depends(get_session),
):
    rows = session.execute(
        select(UserAlert).where(UserAlert.firebase_uid == token["uid"]).order_by(UserAlert.created_at.desc())
    ).scalars().all()
    return {"alerts": [_alert_to_dict(a) for a in rows]}


@router.post("/alerts")
@limiter.limit("30/minute")
def create_alert(
    request: Request,
    body: AlertCreate,
    token: dict[str, Any] = Depends(require_verified_email),
    session: Session = Depends(get_session),
):
    ensure_writable_account(token)
    symbol = (body.symbol or "").strip().upper()[:40]
    if not symbol:
        raise HTTPException(status_code=400, detail="Símbolo requerido.")
    if body.kind not in ("price_above", "price_below"):
        raise HTTPException(status_code=400, detail="Tipo de alerta no válido.")
    if not (body.threshold and body.threshold > 0):
        raise HTTPException(status_code=400, detail="El umbral debe ser mayor a 0.")
    count = session.execute(
        select(UserAlert).where(UserAlert.firebase_uid == token["uid"], UserAlert.active == True)  # noqa: E712
    ).scalars().all()
    if len(count) >= 50:
        raise HTTPException(status_code=403, detail="Límite de 50 alertas activas alcanzado.")
    alert = UserAlert(
        firebase_uid=token["uid"], symbol=symbol, kind=body.kind,
        threshold=float(body.threshold), note=(body.note or "")[:120] or None,
        active=True, created_at=utc_now(),
    )
    session.add(alert)
    session.commit()
    return {"alert": _alert_to_dict(alert)}


@router.delete("/alerts/{alert_id}")
def delete_alert(
    alert_id: int,
    token: dict[str, Any] = Depends(require_2fa),
    session: Session = Depends(get_session),
):
    session.execute(delete(UserAlert).where(
        UserAlert.id == alert_id, UserAlert.firebase_uid == token["uid"],
    ))
    session.commit()
    return {"ok": True}


# ── Notificaciones in-app (#5) ──────────────────────────────────────────────
@router.get("/notifications")
def list_notifications(
    token: dict[str, Any] = Depends(require_2fa),
    session: Session = Depends(get_session),
):
    rows = session.execute(
        select(UserNotification).where(UserNotification.firebase_uid == token["uid"])
        .order_by(UserNotification.created_at.desc()).limit(50)
    ).scalars().all()
    unread = sum(1 for n in rows if not n.read)
    return {
        "unread": unread,
        "notifications": [
            {
                "id": n.id, "title": n.title, "body": n.body, "kind": n.kind,
                "read": n.read, "createdAt": n.created_at.isoformat() if n.created_at else None,
            }
            for n in rows
        ],
    }


@router.post("/notifications/read")
def mark_notifications_read(
    token: dict[str, Any] = Depends(require_2fa),
    session: Session = Depends(get_session),
):
    rows = session.execute(
        select(UserNotification).where(
            UserNotification.firebase_uid == token["uid"], UserNotification.read == False,  # noqa: E712
        )
    ).scalars().all()
    for n in rows:
        n.read = True
    session.commit()
    return {"ok": True, "marked": len(rows)}


@router.get("/export")
@limiter.limit("5/minute")
def account_export(
    request: Request,
    token: dict[str, Any] = Depends(require_2fa),
    session: Session = Depends(get_session),
):
    """Exporta TODOS los datos personales del usuario (portabilidad / GDPR).
    No incluye el secreto TOTP. Requiere 2FA si la cuenta lo tiene activo."""
    uid = token["uid"]
    user = session.get(AppUser, uid)
    if user is None:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada.")
    snapshot = session.get(PortfolioSnapshot, uid)
    activity = session.execute(
        select(SecurityActivity).where(SecurityActivity.firebase_uid == uid)
        .order_by(SecurityActivity.created_at.desc())
    ).scalars().all()
    feedback = session.execute(
        select(Feedback).where(Feedback.firebase_uid == uid)
        .order_by(Feedback.created_at.desc())
    ).scalars().all()
    return {
        "exportedAt": utc_now().isoformat(),
        "account": {
            "id": user.firebase_uid,
            "email": user.email,
            "displayName": user.display_name,
            "emailVerified": user.email_verified,
            "role": user.role,
            "plan": user.plan,
            "createdAt": user.created_at.isoformat() if user.created_at else None,
            "lastSeenAt": user.last_seen_at.isoformat() if user.last_seen_at else None,
            "profile": user.profile_data or {},
        },
        "portfolios": snapshot.data if snapshot else [],
        "securityActivity": [
            {
                "event": a.event,
                "detail": a.detail,
                "createdAt": a.created_at.isoformat() if a.created_at else None,
            }
            for a in activity
        ],
        "feedback": [
            {
                "category": f.category,
                "message": f.message,
                "status": f.status,
                "createdAt": f.created_at.isoformat() if f.created_at else None,
            }
            for f in feedback
        ],
    }


@router.delete("")
@limiter.limit("3/minute")
def account_delete(
    request: Request,
    token: dict[str, Any] = Depends(require_2fa),
    session: Session = Depends(get_session),
):
    """Borra permanentemente la cuenta: datos en PostgreSQL + cuenta de Firebase Auth.
    Requiere 2FA si la cuenta lo tiene activo. Acción irreversible."""
    ensure_writable_account(token)
    uid = token["uid"]
    session.execute(delete(PortfolioSnapshot).where(PortfolioSnapshot.firebase_uid == uid))
    session.execute(delete(SecurityActivity).where(SecurityActivity.firebase_uid == uid))
    session.execute(delete(Feedback).where(Feedback.firebase_uid == uid))
    session.execute(delete(TotpCredential).where(TotpCredential.firebase_uid == uid))
    session.execute(delete(TotpBackupCode).where(TotpBackupCode.firebase_uid == uid))
    user = session.get(AppUser, uid)
    if user is not None:
        session.delete(user)
    session.commit()
    # La cuenta de autenticación se borra al final (best-effort): los datos ya no existen.
    try:
        initialize_firebase_admin()
        firebase_auth.delete_user(uid)
    except Exception:
        pass
    return {"ok": True}


def purge_user(session: Session, uid: str | None = None, email: str | None = None) -> dict[str, Any]:
    """Borra un usuario POR COMPLETO: filas en PostgreSQL + cuenta de Firebase Auth
    + entrada en la allowlist. Acepta uid y/o email. Pensado para limpieza
    administrativa (p.ej. cuentas de prueba). Resuelve el uid desde Firebase cuando
    solo se da el correo, de modo que limpia identidades cuya fila ya no existe en
    Postgres. Best-effort en Firebase: continúa aunque la cuenta ya no exista allí."""
    email_l = (email or "").strip().lower() or None
    uids: set[str] = set()
    if uid:
        uids.add(uid)

    # Resuelve el uid de Firebase a partir del correo (caso típico: la fila de
    # Postgres ya se borró a mano, pero la identidad sigue viva en Firebase Auth).
    try:
        initialize_firebase_admin()
        if email_l:
            try:
                uids.add(firebase_auth.get_user_by_email(email_l).uid)
            except Exception:
                pass
    except Exception:
        pass

    # Añade uids que coincidan por correo en Postgres.
    if email_l:
        for u in session.query(AppUser).filter(AppUser.email == email_l).all():
            uids.add(u.firebase_uid)

    for u in uids:
        session.execute(delete(PortfolioSnapshot).where(PortfolioSnapshot.firebase_uid == u))
        session.execute(delete(SecurityActivity).where(SecurityActivity.firebase_uid == u))
        session.execute(delete(Feedback).where(Feedback.firebase_uid == u))
        session.execute(delete(TotpCredential).where(TotpCredential.firebase_uid == u))
        session.execute(delete(TotpBackupCode).where(TotpBackupCode.firebase_uid == u))
        app_user = session.get(AppUser, u)
        if app_user is not None:
            if not email_l:
                email_l = (app_user.email or "").strip().lower() or None
            session.delete(app_user)

    # Quita el correo de la allowlist para que no quede autorizado tras el borrado.
    if email_l:
        entry = session.get(BetaAllowlist, email_l)
        if entry is not None:
            session.delete(entry)
    session.commit()

    # Borra cada identidad de Firebase Auth (best-effort, ya sin datos en Postgres).
    fb_deleted: list[str] = []
    for u in uids:
        try:
            initialize_firebase_admin()
            firebase_auth.delete_user(u)
            fb_deleted.append(u)
        except Exception:
            pass

    return {
        "ok": True,
        "email": email_l,
        "uidsRemoved": sorted(uids),
        "firebaseDeleted": fb_deleted,
    }


class FeedbackBody(BaseModel):
    category: str = "general"
    message: str = ""
    page: str = ""
    userAgent: str = ""
    appVersion: str = ""


feedback_router = APIRouter(prefix="/api", tags=["feedback"])


@feedback_router.post("/feedback")
@limiter.limit("10/minute")
def submit_feedback(
    request: Request,
    body: FeedbackBody,
    token: dict[str, Any] = Depends(verify_firebase_user),
    session: Session = Depends(get_session),
):
    """Recibe feedback in-app. Solo exige autenticación Firebase (no 2FA) para que
    cualquier usuario logueado pueda enviarlo sin fricción. Los datos de identidad
    se toman del registro server-side, no del cliente."""
    message = (body.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío.")
    user = upsert_user(session, token)
    fb = Feedback(
        firebase_uid=token["uid"],
        email=user.email,
        display_name=user.display_name,
        plan=normalize_plan(user.plan),
        category=(body.category or "general")[:40],
        message=message[:4000],
        page=((body.page or "")[:200] or None),
        user_agent=((body.userAgent or "")[:400] or None),
        app_version=((body.appVersion or "")[:40] or None),
        status="new",
        created_at=utc_now(),
    )
    session.add(fb)
    session.commit()
    return {"ok": True, "id": fb.id}


# ── Vista pública de portafolio compartido (#12) ────────────────────────────
public_router = APIRouter(prefix="/api/public", tags=["public"])

# El nombre del portafolio, el del dueño y los tickers los escribe un usuario y
# los lee cualquier visitante del enlace. Defensa en profundidad frente a XSS:
# aunque p.html ya escapa al pintar, la API no publica marcado en bruto.
_SAFE_TEXT = str.maketrans({"<": "", ">": "", '"': "", "'": ""})


def _clean(value: Any, limit: int = 80) -> str:
    return str(value or "").translate(_SAFE_TEXT)[:limit]


@public_router.get("/portfolio/{token}")
@limiter.limit("60/minute")
def public_portfolio(request: Request, token: str, session: Session = Depends(get_session)):
    share = session.get(PortfolioShare, token)
    if not share:
        raise HTTPException(status_code=404, detail="Enlace no válido o revocado.")
    p = _find_portfolio(session, share.firebase_uid, share.portfolio_id)
    if not p:
        raise HTTPException(status_code=404, detail="El portafolio ya no está disponible.")
    owner = session.get(AppUser, share.firebase_uid)
    # P1.13: el modal de compartir promete "no se muestran datos de tu cuenta" y
    # esta respuesta traía `quantity` y `avgPrice` de cada posición, con los que
    # p.html pintaba un KPI "Valor estimado". Quien recibiera el enlace sabía
    # cuánto dinero tienes y en qué, para siempre, hasta revocarlo.
    #
    # Por omisión ya no se publica ningún importe: sólo proporciones. El dueño
    # puede activar "incluir montos" desde el Tracker, y entonces la copia del
    # modal dice exactamente eso. La preferencia viaja dentro del portafolio
    # (`shareIncludeAmounts`), así que apagarla afecta al enlace ya repartido.
    include_amounts = bool(p.get("shareIncludeAmounts"))
    raw = []
    cost_total = 0.0
    qty_total = 0.0
    for pos in (p.get("positions") or []):
        try:
            qty = float(pos.get("quantity") or 0)
            avg = float(pos.get("avgPrice") or 0)
        except (TypeError, ValueError):
            qty, avg = 0, 0
        if qty <= 0:
            continue
        raw.append((
            _clean(pos.get("ticker"), 40),
            qty,
            max(avg, 0.0),
            _clean(pos.get("currency") or p.get("currency") or "USD", 10),
        ))
        cost_total += qty * max(avg, 0.0)
        qty_total += qty

    # `relQty` es la cantidad NORMALIZADA por la base de costo: sirve para que la
    # vista pública valore con precios en vivo y saque pesos de mercado exactos,
    # y de ella no se puede despejar ni la cantidad ni el precio. `costWeight` es
    # el respaldo cuando algún precio no llega. Ninguno de los dos es dinero.
    divisor = cost_total if cost_total > 0 else (qty_total or 1.0)
    positions = []
    for ticker, qty, avg, cur in raw:
        item = {"ticker": ticker, "currency": cur}
        if include_amounts:
            item["quantity"] = qty
            item["avgPrice"] = avg
        else:
            item["relQty"] = qty / divisor
            item["costWeight"] = (qty * avg / cost_total * 100) if cost_total > 0 else (qty / (qty_total or 1.0) * 100)
        positions.append(item)

    return {
        "name": _clean(p.get("name")) or "Portafolio",
        "currency": _clean(p.get("currency", "USD"), 10),
        "ownerName": _clean(owner.display_name if owner else None) or "Un inversor",
        "positions": positions,
        "includesAmounts": include_amounts,
        "sharedAt": share.created_at.isoformat() if share.created_at else None,
    }


def install_persistence(app) -> None:
    app.include_router(router)
    app.include_router(twofa_router)
    app.include_router(feedback_router)
    app.include_router(public_router)

    @app.on_event("startup")
    def initialize_persistence_tables():
        if DATABASE_URL:
            create_tables()
            _encrypt_legacy_totp_secrets()
