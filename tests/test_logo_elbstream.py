"""/api/logo/{symbol}: el CDN de logos (Elbstream) indexa el ticker CON su sufijo de
bolsa (WALMEX.MX sí, WALMEX no) y las criptos sin la divisa (BTC, no BTC-USD).
Se sustituye la sesión HTTP: ninguna prueba sale a internet."""
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import api

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32


@pytest.fixture
def upstream(monkeypatch):
    """Registra las URLs pedidas; responde PNG solo para los símbolos de `tiene`."""
    estado = SimpleNamespace(llamadas=[], tiene=set())

    def get(url, params=None, timeout=None):
        estado.llamadas.append(url.rsplit("/", 1)[1])
        ok = estado.llamadas[-1] in estado.tiene
        return SimpleNamespace(
            status_code=200 if ok else 404,
            content=PNG if ok else b"",
            headers={"content-type": "image/png" if ok else "text/plain"},
        )

    monkeypatch.setattr(api._HTTP_SESSION, "get", get)
    return estado


@pytest.fixture
def client():
    return TestClient(api.app)


def test_ticker_mexicano_conserva_el_sufijo(client, upstream):
    upstream.tiene = {"TLOGO1.MX"}
    r = client.get("/api/logo/tlogo1.mx")
    assert r.status_code == 200 and r.content == PNG
    assert upstream.llamadas == ["TLOGO1.MX"]  # no se recorta a TLOGO1


def test_cripto_de_yahoo_cae_al_simbolo_sin_divisa(client, upstream):
    upstream.tiene = {"TCRIPT"}
    r = client.get("/api/logo/TCRIPT-USD")
    assert r.status_code == 200
    assert upstream.llamadas == ["TCRIPT-USD", "TCRIPT"]


def test_sin_logo_da_404_y_se_cachea(client, upstream):
    assert client.get("/api/logo/TNOHAY.MX").status_code == 404
    assert client.get("/api/logo/TNOHAY.MX").status_code == 404
    assert upstream.llamadas == ["TNOHAY.MX"]  # la segunda salió de la caché


def test_simbolo_invalido_no_llega_al_proveedor(client, upstream):
    for malo in ("-ABC", ".."):
        assert client.get(f"/api/logo/{malo}").status_code == 404
    assert upstream.llamadas == []
