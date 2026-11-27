"""/api/news/{symbol}: son titulares accesorios. Si el proveedor falla (timeout, 429, 5xx) la respuesta es
200 con la lista vacía —no un 503 que ensucie la pantalla—, se reintenta una vez en inglés y el fallo se
recuerda un minuto para no martillar al proveedor. Ninguna prueba sale a internet."""
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import api

ARTICULO = {"article_title": "Titular", "article_url": "https://example.test/a"}


@pytest.fixture
def proveedor(monkeypatch):
    """`respuestas` es la cola de lo que contestará el proveedor: un int = estado sin cuerpo, una excepción
    se lanza, una lista = 200 con esos artículos. `llamadas` guarda el idioma pedido en cada intento."""
    estado = SimpleNamespace(llamadas=[], respuestas=[])
    monkeypatch.setattr(api, "yf", SimpleNamespace(Ticker=lambda s: SimpleNamespace(fast_info=SimpleNamespace(exchange="NMS"))))

    def get(url, params=None, headers=None, timeout=None):
        estado.llamadas.append(params["language"])
        r = estado.respuestas.pop(0)
        if isinstance(r, Exception):
            raise r
        if isinstance(r, int):
            return SimpleNamespace(status_code=r, json=lambda: {})
        return SimpleNamespace(status_code=200, json=lambda: {"data": {"news": r}})

    monkeypatch.setattr(api._HTTP_SESSION, "get", get)
    for c in (api._NEWS_CACHE, api._NEWS_FAIL_CACHE):
        c.clear() if hasattr(c, "clear") else None
    return estado


@pytest.fixture
def client():
    return TestClient(api.app)


def test_exito_se_cachea(client, proveedor):
    proveedor.respuestas = [[ARTICULO] * 12]
    r = client.get("/api/news/TNEWSOK?language=es")
    assert r.status_code == 200 and len(r.json()["news"]) == 10 and "unavailable" not in r.json()
    assert client.get("/api/news/TNEWSOK?language=es").json() == r.json()
    assert proveedor.llamadas == ["es"]  # la segunda salió de la caché


@pytest.mark.parametrize("sym,falla", [("TNEWSK1", 503), ("TNEWSK2", 429), ("TNEWSK3", 500), ("TNEWSK4", TimeoutError("sin red"))])
def test_proveedor_caido_responde_200_vacio_no_503(client, proveedor, sym, falla):
    proveedor.respuestas = [falla, falla]  # un símbolo por caso: el fallo se recuerda 1 minuto
    r = client.get(f"/api/news/{sym}?language=es")
    assert r.status_code == 200
    assert r.json() == {"news": [], "unavailable": True}
    assert proveedor.llamadas == ["es", "en"]  # reintentó una vez en inglés


def test_si_falla_es_responde_en_ingles(client, proveedor):
    proveedor.respuestas = [503, [ARTICULO]]
    r = client.get("/api/news/TNEWSEN?language=es")
    assert r.status_code == 200 and r.json()["news"] == [ARTICULO]
    assert proveedor.llamadas == ["es", "en"]


def test_el_fallo_se_recuerda_un_minuto(client, proveedor):
    proveedor.respuestas = [503, 503]
    client.get("/api/news/TNEWSMEM?language=es")
    antes = len(proveedor.llamadas)
    r = client.get("/api/news/TNEWSMEM?language=es")
    assert r.json() == {"news": [], "unavailable": True}
    assert len(proveedor.llamadas) == antes  # no volvió a llamar al proveedor
