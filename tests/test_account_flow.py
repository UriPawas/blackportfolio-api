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


def test_escritura_con_version_vieja_no_borra_posiciones(client):
    """Regresión: una pestaña con datos viejos NO debe sobreescribir lo nuevo.

    Reproduce la pérdida real: la pestaña A carga el portafolio, la pestaña B
    agrega posiciones, y luego A guarda su copia vieja. Antes ganaba A y las
    posiciones nuevas desaparecían sin que nadie las borrara.
    """
    client.get("/api/account/bootstrap")
    # Pestaña A guarda el estado inicial y se queda con esa versión.
    r = client.put("/api/account/portfolios",
                   json={"portfolios": [{"id": "p1", "positions": [{"symbol": "SAN"}]}]})
    version_vieja = r.json()["version"]

    # Pestaña B (ya al día) compra VISA y MSFT y liquida SAN.
    nuevas = [{"symbol": "V"}, {"symbol": "MSFT"}]
    r = client.put("/api/account/portfolios",
                   json={"portfolios": [{"id": "p1", "positions": nuevas}],
                         "baseVersion": version_vieja})
    assert r.status_code == 200, r.text

    # Pestaña A guarda su copia vieja: debe rechazarse.
    r = client.put("/api/account/portfolios",
                   json={"portfolios": [{"id": "p1", "positions": [{"symbol": "SAN"}]}],
                         "baseVersion": version_vieja})
    assert r.status_code == 409
    assert r.json()["detail"] == "portfolio_version_conflict"

    # Y lo nuevo sigue intacto en el servidor.
    b = client.get("/api/account/bootstrap").json()
    assert [p["symbol"] for p in b["portfolios"][0]["positions"]] == ["V", "MSFT"]


def test_reescribir_lo_mismo_no_es_conflicto(client):
    """Un PUT idempotente (mismo checksum) no debe fallar aunque la versión difiera."""
    client.get("/api/account/bootstrap")
    payload = {"portfolios": [{"id": "p1", "positions": [{"symbol": "V"}]}]}
    client.put("/api/account/portfolios", json=payload)
    r = client.put("/api/account/portfolios", json={**payload, "baseVersion": 999})
    assert r.status_code == 200, r.text
    assert r.json()["unchanged"] is True


def test_cliente_sin_version_no_puede_sobreescribir(client):
    """Blindaje de transicion: un cliente viejo (sin baseVersion) no puede pisar datos.

    El cliente anterior al arreglo no manda version, asi que el servidor no puede
    saber si su copia esta al dia: se rechaza en vez de escribir a ciegas.
    """
    client.get("/api/account/bootstrap")
    # Primer guardado: no hay nada que pisar, se permite sin version.
    r = client.put("/api/account/portfolios",
                   json={"portfolios": [{"id": "p1", "positions": [{"symbol": "V"}]}]})
    assert r.status_code == 200, r.text

    # Segundo guardado con datos distintos y sin version: rechazado.
    r = client.put("/api/account/portfolios",
                   json={"portfolios": [{"id": "p1", "positions": [{"symbol": "SAN"}]}]})
    assert r.status_code == 409
    assert r.json()["detail"] == "portfolio_version_required"

    # Y no toco nada.
    b = client.get("/api/account/bootstrap").json()
    assert [p["symbol"] for p in b["portfolios"][0]["positions"]] == ["V"]


def test_migracion_sin_baseversion_sigue_sobreescribiendo(client):
    """Las migraciones omiten baseVersion a propósito: no deben romperse."""
    client.get("/api/account/bootstrap")
    client.put("/api/account/portfolios",
               json={"portfolios": [{"id": "p1", "positions": [{"symbol": "SAN"}]}]})
    r = client.put("/api/account/portfolios",
                   json={"portfolios": [{"id": "p1", "positions": [{"symbol": "V"}]}],
                         "source": "migration_local_override"})
    assert r.status_code == 200, r.text


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
