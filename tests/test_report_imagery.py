"""Imágenes del reporte PDF: whitelist de búsquedas, huecos de la maqueta,
proxy de bytes por id y degradación cuando falta la clave o falla Pexels.

Ningún caso sale a la red: `_HTTP_SESSION` se sustituye por un doble que
devuelve respuestas fijas. Corre contra SQLite temporal — no toca producción.
"""
import pytest
from fastapi.testclient import TestClient

import api


class _Res:
    def __init__(self, status_code=200, payload=None, content=b""):
        self.status_code = status_code
        self._payload = payload if payload is not None else {}
        self.content = content

    def json(self):
        return self._payload


class _FakeSession:
    """Sustituto de requests.Session: registra las llamadas y responde por URL."""

    def __init__(self, routes):
        self.routes = routes
        self.calls = []

    def get(self, url, **kwargs):
        self.calls.append((url, kwargs))
        for prefix, res in self.routes.items():
            if url.startswith(prefix):
                return res(kwargs) if callable(res) else res
        return _Res(404)


@pytest.fixture
def client():
    return TestClient(api.app)


@pytest.fixture(autouse=True)
def clear_caches():
    api._REPORT_IMG_META._store.clear()
    api._REPORT_IMG_BYTES._store.clear()
    yield
    api._REPORT_IMG_META._store.clear()
    api._REPORT_IMG_BYTES._store.clear()


def _photos(n=6):
    return {"photos": [
        {"id": 1000 + i, "photographer": f"Autor {i}", "avg_color": "#99ADB4"} for i in range(n)
    ]}


# ── /api/report/imagery ───────────────────────────────────────────────────────

def test_imagery_sin_clave_devuelve_slots_vacios(client, monkeypatch):
    """Sin PEXELS_API_KEY el reporte debe seguir generándose: slots vacíos, no 500."""
    monkeypatch.setattr(api, "PEXELS_KEY", "")
    r = client.get("/api/report/imagery?sectors=Tecnología")
    assert r.status_code == 200
    assert r.json() == {"slots": {}}


def test_imagery_traduce_sector_de_la_app_a_su_busqueda(client, monkeypatch):
    """Las claves del mapa son las etiquetas de getTickerSector (español)."""
    fake = _FakeSession({"https://api.pexels.com/v1/search": _Res(200, _photos())})
    monkeypatch.setattr(api, "PEXELS_KEY", "k")
    monkeypatch.setattr(api, "_HTTP_SESSION", fake)

    r = client.get("/api/report/imagery?sectors=Tecnología,Finanzas")
    assert r.status_code == 200
    queries = [kw["params"]["query"] for _, kw in fake.calls]
    assert "data center server room" in queries       # Tecnología
    assert "city skyline finance" in queries          # Finanzas


def test_imagery_ignora_sectores_fuera_de_la_whitelist(client, monkeypatch):
    """Un sector desconocido no puede inyectar una búsqueda arbitraria."""
    fake = _FakeSession({"https://api.pexels.com/v1/search": _Res(200, _photos())})
    monkeypatch.setattr(api, "PEXELS_KEY", "k")
    monkeypatch.setattr(api, "_HTTP_SESSION", fake)

    r = client.get("/api/report/imagery?sectors=' OR 1=1;--,swimsuit models")
    assert r.status_code == 200
    for _, kw in fake.calls:
        assert kw["params"]["query"] in api._ALLOWED_IMAGE_QUERIES


def test_imagery_devuelve_un_hueco_por_patron(client, monkeypatch):
    monkeypatch.setattr(api, "PEXELS_KEY", "k")
    monkeypatch.setattr(api, "_HTTP_SESSION",
                        _FakeSession({"https://api.pexels.com/v1/search": _Res(200, _photos())}))
    slots = client.get("/api/report/imagery?sectors=Tecnología").json()["slots"]
    # Un hueco por patrón de la maqueta: portada, portadilla, riel, banda y cierre.
    assert set(slots) == {"cover", "opener", "rail", "band", "closing"}
    for s in slots.values():
        assert isinstance(s["id"], int) and s["by"] and s["avg"].startswith("#")


def test_imagery_cachea_la_busqueda(client, monkeypatch):
    """Dos reportes seguidos del mismo sector no re-consultan a Pexels."""
    fake = _FakeSession({"https://api.pexels.com/v1/search": _Res(200, _photos())})
    monkeypatch.setattr(api, "PEXELS_KEY", "k")
    monkeypatch.setattr(api, "_HTTP_SESSION", fake)

    client.get("/api/report/imagery?sectors=Tecnología")
    n = len(fake.calls)
    client.get("/api/report/imagery?sectors=Tecnología")
    assert len(fake.calls) == n


def test_imagery_degrada_si_pexels_falla(client, monkeypatch):
    monkeypatch.setattr(api, "PEXELS_KEY", "k")
    monkeypatch.setattr(api, "_HTTP_SESSION",
                        _FakeSession({"https://api.pexels.com": _Res(503, {})}))
    r = client.get("/api/report/imagery?sectors=Tecnología")
    assert r.status_code == 200 and r.json() == {"slots": {}}


# ── /api/report/photo/{id} ────────────────────────────────────────────────────

def test_photo_devuelve_bytes_jpeg(client, monkeypatch):
    jpeg = b"\xff\xd8\xff\xe0fake-jpeg"
    fake = _FakeSession({
        "https://api.pexels.com/v1/photos/": _Res(200, {"src": {"large": "https://images.pexels.com/p/1.jpg"}}),
        "https://images.pexels.com/": _Res(200, content=jpeg),
    })
    monkeypatch.setattr(api, "PEXELS_KEY", "k")
    monkeypatch.setattr(api, "_HTTP_SESSION", fake)

    r = client.get("/api/report/photo/1234?size=large")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/jpeg"
    assert r.content == jpeg


def test_photo_solo_acepta_urls_del_cdn_de_pexels(client, monkeypatch):
    """SSRF: aunque la API devolviera otro host, no se descarga."""
    fake = _FakeSession({
        "https://api.pexels.com/v1/photos/": _Res(200, {"src": {"large": "http://169.254.169.254/latest/meta-data/"}}),
    })
    monkeypatch.setattr(api, "PEXELS_KEY", "k")
    monkeypatch.setattr(api, "_HTTP_SESSION", fake)

    r = client.get("/api/report/photo/1234")
    assert r.status_code == 404
    assert all("169.254" not in url for url, _ in fake.calls)


def test_photo_tamano_invalido_cae_a_large(client, monkeypatch):
    fake = _FakeSession({
        "https://api.pexels.com/v1/photos/": _Res(200, {"src": {"large": "https://images.pexels.com/p/1.jpg"}}),
        "https://images.pexels.com/": _Res(200, content=b"jpeg"),
    })
    monkeypatch.setattr(api, "PEXELS_KEY", "k")
    monkeypatch.setattr(api, "_HTTP_SESSION", fake)

    assert client.get("/api/report/photo/1?size=../../etc/passwd").status_code == 200


def test_photo_cachea_los_bytes(client, monkeypatch):
    fake = _FakeSession({
        "https://api.pexels.com/v1/photos/": _Res(200, {"src": {"large": "https://images.pexels.com/p/1.jpg"}}),
        "https://images.pexels.com/": _Res(200, content=b"jpeg"),
    })
    monkeypatch.setattr(api, "PEXELS_KEY", "k")
    monkeypatch.setattr(api, "_HTTP_SESSION", fake)

    client.get("/api/report/photo/77")
    n = len(fake.calls)
    client.get("/api/report/photo/77")
    assert len(fake.calls) == n


def test_photo_sin_clave_es_404(client, monkeypatch):
    monkeypatch.setattr(api, "PEXELS_KEY", "")
    assert client.get("/api/report/photo/1").status_code == 404
