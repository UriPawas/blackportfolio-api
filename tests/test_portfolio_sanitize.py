"""El PUT de portafolios sanea el texto que el frontend pinta como HTML (P0.1).

El vector real no es auto-infligido: el portafolio importado se bautiza con el
NOMBRE DEL ARCHIVO CSV, y la zona de importación acepta arrastrar y soltar. Un
archivo recibido por correo alcanzaba para inyectar marcado que se guardaba en
PostgreSQL y se volvía a ejecutar en cada carga.

Lo que se prueba aquí es la red de seguridad del servidor. La corrección
principal —escapar al pintar— vive en main.js.
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

import persistence
from conftest import FakeAuth


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


PAYLOAD_XSS = "Cartera</h3><img src=x onerror=alert(1)>"


def test_nombre_y_ticker_pierden_el_marcado(client):
    client.get("/api/account/bootstrap")
    r = client.put("/api/account/portfolios", json={"portfolios": [{
        "id": "p1",
        "name": PAYLOAD_XSS,
        "description": "<script>fetch('//evil')</script>",
        "positions": [{"id": "x1", "ticker": "<img src=x>AAPL", "note": "<b>nota</b>", "quantity": 3}],
        "transactions": [{"id": "t1", "ticker": "<svg onload=1>", "type": "COMPRA<", "net": 10}],
    }]})
    assert r.status_code == 200, r.text

    stored = client.get("/api/account/bootstrap").json()["portfolios"][0]
    for value in (stored["name"], stored["description"],
                  stored["positions"][0]["ticker"], stored["positions"][0]["note"],
                  stored["transactions"][0]["ticker"], stored["transactions"][0]["type"]):
        assert "<" not in value and ">" not in value

    # Se limpia, no se borra: el texto legible sobrevive.
    assert stored["name"].startswith("Cartera")
    assert "AAPL" in stored["positions"][0]["ticker"]


def test_no_se_pierden_campos_desconocidos_ni_numeros(client):
    """Sanear no puede convertirse en pérdida de datos.

    Un esquema estricto habría sido la corrección "limpia", y también la que
    deja fuera de servicio a quien ya tenga guardado un snapshot que no lo
    cumple: no podría volver a guardar nunca. Aquí se limpia y se deja pasar.
    """
    client.get("/api/account/bootstrap")
    payload = {"portfolios": [{
        "id": "p1",
        "name": "Cartera",
        "campoQueElBackendNoConoce": {"anidado": [1, 2, 3]},
        "cashBalance": 1234.56,
        "positions": [{"id": "x1", "ticker": "AAPL", "quantity": 2.5, "avgPrice": 190.25,
                       "splitsApplied": ["2026-08-31"]}],
    }]}
    assert client.put("/api/account/portfolios", json=payload).status_code == 200

    stored = client.get("/api/account/bootstrap").json()["portfolios"][0]
    assert stored["campoQueElBackendNoConoce"] == {"anidado": [1, 2, 3]}
    assert stored["cashBalance"] == 1234.56
    assert stored["positions"][0]["quantity"] == 2.5
    assert stored["positions"][0]["splitsApplied"] == ["2026-08-31"]


def test_comillas_y_acentos_sobreviven(client):
    """Sólo se quitan `<` y `>`.

    Quitar comillas también habría sido más seguro sobre el papel y habría
    mutilado nombres legítimos. Las comillas las neutraliza el escape al pintar.
    """
    client.get("/api/account/bootstrap")
    nombre = 'Cartera de mamá "largo plazo" & cía'
    assert client.put("/api/account/portfolios", json={
        "portfolios": [{"id": "p1", "name": nombre, "positions": []}]
    }).status_code == 200
    assert client.get("/api/account/bootstrap").json()["portfolios"][0]["name"] == nombre


def test_textos_enormes_se_recortan(client):
    client.get("/api/account/bootstrap")
    assert client.put("/api/account/portfolios", json={
        "portfolios": [{"id": "p1", "name": "A" * 5000, "positions": []}]
    }).status_code == 200
    assert len(client.get("/api/account/bootstrap").json()["portfolios"][0]["name"]) == 120


def test_saneado_no_dispara_conflicto_de_version(client):
    """El checksum se calcula DESPUÉS de sanear.

    Si se firmara el payload crudo y se guardara el saneado, el siguiente PUT
    del mismo cliente vería un checksum distinto al suyo y el control de
    concurrencia devolvería 409 sin que nadie hubiera tocado nada.
    """
    client.get("/api/account/bootstrap")
    r1 = client.put("/api/account/portfolios", json={
        "portfolios": [{"id": "p1", "name": PAYLOAD_XSS, "positions": []}]
    })
    version = r1.json()["version"]

    # El cliente vuelve a guardar lo que el servidor le devolvió, con su versión.
    stored = client.get("/api/account/bootstrap").json()["portfolios"]
    r2 = client.put("/api/account/portfolios", json={
        "portfolios": stored, "baseVersion": version
    })
    assert r2.status_code == 200, r2.text
    assert r2.json()["unchanged"] is True
