"""Smoke test del flujo crítico de cuenta: alta/login → 2FA → guardar portafolio.

Ejercita el backend real (routers de persistence.py) sobre SQLite, con la
autenticación de Firebase sustituida por un token falso. No depende de api.py
(yfinance/pandas) para arrancar rápido y de forma estable.
"""
import urllib.parse

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

import persistence
from conftest import FakeAuth, totp_now


@pytest.fixture
def auth():
    return FakeAuth()


@pytest.fixture
def client(auth):
    app = FastAPI()
    app.state.limiter = persistence.limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    persistence.install_persistence(app)
    app.dependency_overrides[persistence.verify_firebase_user] = auth
    with TestClient(app) as c:
        yield c


def _secret_from_setup(resp_json):
    uri = resp_json["otpauthUri"]
    qs = urllib.parse.urlparse(uri).query
    return urllib.parse.parse_qs(qs)["secret"][0]


# ── Alta / bootstrap ──────────────────────────────────────────────────────────

def test_bootstrap_crea_usuario_explorer(client):
    r = client.get("/api/account/bootstrap")
    assert r.status_code == 200
    body = r.json()
    assert body["user"]["plan"] == "Explorer"
    assert body["user"]["email"] == "tester@example.com"
    assert body["portfolios"] is None


# ── Guardar portafolio + límites de plan (autoritativos en servidor) ───────────

def test_guardar_portafolio_ok(client):
    client.get("/api/account/bootstrap")
    payload = {"portfolios": [{"id": "p1", "name": "Mi cartera", "positions": [{"symbol": "AAPL"}]}]}
    r = client.put("/api/account/portfolios", json=payload)
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is True

    # Persistió: bootstrap lo devuelve
    b = client.get("/api/account/bootstrap").json()
    assert b["portfolios"][0]["id"] == "p1"


def test_limite_de_portafolios_explorer(client):
    client.get("/api/account/bootstrap")
    payload = {"portfolios": [
        {"id": "p1", "name": "A", "positions": []},
        {"id": "p2", "name": "B", "positions": []},  # Explorer permite 1
    ]}
    r = client.put("/api/account/portfolios", json=payload)
    assert r.status_code == 403
    assert "portafolio" in r.json()["detail"].lower()


def test_limite_de_posiciones_explorer(client):
    client.get("/api/account/bootstrap")
    positions = [{"symbol": f"T{i}"} for i in range(11)]  # Explorer permite 10
    payload = {"portfolios": [{"id": "p1", "name": "A", "positions": positions}]}
    r = client.put("/api/account/portfolios", json=payload)
    assert r.status_code == 403
    assert "posiciones" in r.json()["detail"].lower()


def test_email_no_verificado_no_puede_escribir(client, auth):
    auth.token["email_verified"] = False
    client.get("/api/account/bootstrap")  # bootstrap no exige email verificado
    r = client.put("/api/account/portfolios",
                   json={"portfolios": [{"id": "p1", "positions": []}]})
    assert r.status_code == 403
    assert r.json()["detail"] == "email_verification_required"


# ── 2FA: setup → verify → gating de datos ──────────────────────────────────────

def test_flujo_2fa_completo_y_gating(client):
    # 1) status: desactivado
    assert client.get("/api/2fa/status").json()["enabled"] is False

    # 2) setup → obtenemos el secreto
    setup = client.post("/api/2fa/setup")
    assert setup.status_code == 200
    secret = _secret_from_setup(setup.json())

    # 3) verify-setup con código válido → activa y entrega token de sesión 2FA
    vr = client.post("/api/2fa/verify-setup", json={"code": totp_now(secret)})
    assert vr.status_code == 200, vr.text
    twofa_token = vr.json()["token"]
    assert client.get("/api/2fa/status").json()["enabled"] is True

    # 4) Con 2FA activo, bootstrap SIN token de sesión → 403 (la contraseña no basta)
    no_token = client.get("/api/account/bootstrap")
    assert no_token.status_code == 403
    assert no_token.json()["detail"] == "2fa_required"

    # 5) Con el token de sesión 2FA válido → 200
    ok = client.get("/api/account/bootstrap", headers={"X-2FA-Token": twofa_token})
    assert ok.status_code == 200


def test_2fa_verify_setup_codigo_invalido(client):
    client.post("/api/2fa/setup")
    r = client.post("/api/2fa/verify-setup", json={"code": "000000"})
    assert r.status_code == 400


# ── GDPR: export / delete ──────────────────────────────────────────────────────

def test_export_y_delete(client):
    client.get("/api/account/bootstrap")
    client.put("/api/account/portfolios", json={"portfolios": [{"id": "p1", "positions": []}]})

    ex = client.get("/api/account/export")
    assert ex.status_code == 200
    data = ex.json()
    assert data["account"]["email"] == "tester@example.com"
    assert len(data["portfolios"]) == 1
    assert "totpSecret" not in data["account"]  # el secreto NUNCA se exporta

    # delete borra los datos; el borrado de Firebase Auth es best-effort (no falla)
    d = client.delete("/api/account")
    assert d.status_code == 200
    assert d.json()["ok"] is True
