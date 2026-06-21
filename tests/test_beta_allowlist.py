"""Gate de beta cerrada: solo los correos en la allowlist (o exentos) pasan.

Cierra la beta vía monkeypatch (persistence.BETA_CLOSED) — la suite corre con la
beta ABIERTA por defecto (ver conftest), así que aquí la cerramos explícitamente.
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

import persistence
from persistence import BetaAllowlist, utc_now
from conftest import FakeAuth


@pytest.fixture
def auth():
    return FakeAuth()


@pytest.fixture
def client(auth, monkeypatch):
    monkeypatch.setattr(persistence, "BETA_CLOSED", True)
    app = FastAPI()
    app.state.limiter = persistence.limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    persistence.install_persistence(app)
    app.dependency_overrides[persistence.verify_firebase_user] = auth
    with TestClient(app) as c:
        yield c


def _allow(email: str):
    persistence.get_engine()
    with persistence._session_factory() as s:
        s.add(BetaAllowlist(email=email.lower(), created_at=utc_now()))
        s.commit()


def test_beta_cerrada_bloquea_correo_no_invitado(client):
    r = client.get("/api/account/bootstrap")
    assert r.status_code == 403
    assert r.json()["detail"] == "beta_closed"


def test_beta_cerrada_permite_correo_en_allowlist(client):
    _allow("tester@example.com")
    r = client.get("/api/account/bootstrap")
    assert r.status_code == 200, r.text
    assert r.json()["user"]["email"] == "tester@example.com"


def test_beta_cerrada_exime_a_admin(client, auth, monkeypatch):
    monkeypatch.setattr(persistence, "_BETA_EXEMPT_EMAILS", {"admin@example.com"})
    auth.token["email"] = "admin@example.com"
    r = client.get("/api/account/bootstrap")
    assert r.status_code == 200, r.text
