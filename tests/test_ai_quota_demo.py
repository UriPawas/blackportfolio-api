"""Pruebas de las protecciones pre-beta: cuota diaria de IA por usuario,
caché de respuestas de IA por checksum y cuenta demo de solo lectura."""
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy.orm import Session

import persistence
from conftest import FakeAuth


@pytest.fixture
def demo_auth():
    return FakeAuth(uid="demo_uid", email="demo@blackportfolio.ai", name="Demo")


@pytest.fixture
def demo_client(demo_auth):
    app = FastAPI()
    app.state.limiter = persistence.limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    persistence.install_persistence(app)
    app.dependency_overrides[persistence.verify_firebase_user] = demo_auth
    with TestClient(app) as c:
        yield c


@pytest.fixture
def db_session():
    with Session(persistence.get_engine()) as session:
        yield session


# ── Cuenta demo: solo lectura ──────────────────────────────────────────────────

def test_demo_puede_leer_bootstrap(demo_client):
    r = demo_client.get("/api/account/bootstrap")
    assert r.status_code == 200


def test_demo_no_puede_guardar_portafolio(demo_client):
    r = demo_client.put("/api/account/portfolios", json={"portfolios": [{"id": "x", "positions": []}]})
    assert r.status_code == 403
    assert "solo lectura" in r.json()["detail"]


def test_demo_no_puede_activar_2fa(demo_client):
    r = demo_client.post("/api/2fa/setup")
    assert r.status_code == 403


def test_demo_no_puede_borrar_cuenta(demo_client):
    r = demo_client.delete("/api/account")
    assert r.status_code == 403


def test_demo_no_puede_crear_alertas(demo_client):
    r = demo_client.post("/api/account/alerts", json={"symbol": "AAPL", "kind": "price_above", "threshold": 500})
    assert r.status_code == 403


# ── Cuota diaria de IA por usuario ─────────────────────────────────────────────

def test_cuota_ia_explorer_se_agota(db_session):
    limit = persistence.ai_daily_limit("Explorer")
    for i in range(limit):
        remaining = persistence.consume_ai_quota(db_session, "uid_quota", "Explorer")
        assert remaining == limit - i - 1
    with pytest.raises(HTTPException) as exc:
        persistence.consume_ai_quota(db_session, "uid_quota", "Explorer")
    assert exc.value.status_code == 429


def test_cuota_ia_es_por_usuario(db_session):
    limit = persistence.ai_daily_limit("Explorer")
    for _ in range(limit):
        persistence.consume_ai_quota(db_session, "uid_a", "Explorer")
    # Otro usuario conserva su cuota intacta
    assert persistence.consume_ai_quota(db_session, "uid_b", "Explorer") == limit - 1


def test_cuota_ia_mayor_en_planes_altos():
    assert persistence.ai_daily_limit("Wealth Desk") > persistence.ai_daily_limit("Explorer")


# ── Caché de respuestas de IA ─────────────────────────────────────────────────

def test_ai_cache_roundtrip(db_session):
    persistence.ai_cache_put(db_session, "k" * 64, "modelo/x", "texto cacheado")
    hit = persistence.ai_cache_get(db_session, "k" * 64)
    assert hit == {"text": "texto cacheado", "model": "modelo/x"}


def test_ai_cache_miss(db_session):
    assert persistence.ai_cache_get(db_session, "no-existe") is None


def test_ai_cache_expira(db_session, monkeypatch):
    persistence.ai_cache_put(db_session, "exp", "m", "t")
    monkeypatch.setattr(persistence, "AI_CACHE_TTL_SECONDS", -1)
    assert persistence.ai_cache_get(db_session, "exp") is None
