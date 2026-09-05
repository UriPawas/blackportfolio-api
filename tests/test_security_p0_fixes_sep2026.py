"""Regresión de los 4 críticos de la auditoría 2026-09-03 (todos "esfuerzo bajo"):
rate limit apagado en producción, /api/2fa/migrate sin guarda de demo, y sin tope
de body. El de logout (bp-2fa-token / totp_trusted_<uid>) es JS puro y se valida
a mano en el navegador, no aquí."""
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import api
import persistence
from conftest import FakeAuth


def test_client_ip_ya_no_reparsea_x_forwarded_for():
    """La versión rota tomaba la ÚLTIMA entrada de X-Forwarded-For a mano -un salto
    interno de Railway que cambia en cada petición- y eso apagaba el rate limit
    (45/45 y 70/70 peticiones sin un solo 429, auditoría 2026-09-03). Ahora debe
    delegar por completo en get_remote_address / request.client.host."""
    fake_request = SimpleNamespace(
        client=SimpleNamespace(host="203.0.113.9"),
        headers={"x-forwarded-for": "9.9.9.9, 8.8.8.8, 7.7.7.7"},
    )
    assert persistence._client_ip(fake_request) == "203.0.113.9"


@pytest.fixture
def demo_client():
    app_ = api.app
    app_.dependency_overrides[persistence.verify_firebase_user] = FakeAuth(
        uid="demo_uid", email="demo@blackportfolio.ai", name="Demo",
    )
    with TestClient(app_) as c:
        yield c
    app_.dependency_overrides.pop(persistence.verify_firebase_user, None)


def test_2fa_migrate_rechaza_a_la_cuenta_demo(demo_client):
    r = demo_client.post("/api/2fa/migrate", json={"secret": "JBSWY3DPEHPK3PXP"})
    assert r.status_code == 403
    assert "solo lectura" in r.json()["detail"]


def test_body_gigante_se_rechaza_antes_de_llegar_al_endpoint():
    """Sin autenticar y sin importar el endpoint: el middleware debe cortar por
    Content-Length antes de que el body llegue a parsearse (antes: 20 MB sin
    autenticar se buferizaba igual, auditoría 2026-09-03 hallazgo #4)."""
    with TestClient(api.app) as c:
        oversized = b"x" * (3 * 1024 * 1024)
        r = c.post("/api/beta/redeem", content=oversized,
                    headers={"content-type": "application/json"})
    assert r.status_code == 413
