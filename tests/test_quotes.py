"""El precio actual sale de la cotización en vivo, no del último cierre diario.

Regresión real: `/api/prices` tomaba el último cierre DIARIO de Yahoo. Como la
vela del día viene con close=null hasta bien entrada la noche, el Tracker
mostraba el cierre de AYER como precio de hoy (MSFT en 496.82 cuando cerró en
510.12 y cotizaba a 509.40 en el after-hours), y con él quedaban mal "Cambio
hoy", "Valor actual", "Retorno" y "vs Bench.".

Las respuestas de Yahoo van simuladas: la suite no debe depender de la red ni de
que el mercado esté abierto.
"""
import pytest

import api


class _FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload


def _meta(**campos):
    return {"chart": {"result": [{"meta": campos}]}}


@pytest.fixture(autouse=True)
def caché_limpia():
    """Sin esto, un caso contamina al siguiente por la caché de 45 s."""
    api._QUOTE_CACHE._store.clear()
    yield
    api._QUOTE_CACHE._store.clear()


@pytest.fixture
def yahoo(monkeypatch):
    """Sustituye la llamada saliente y registra las URLs pedidas."""
    llamadas = []

    def _fake_get(url, **kwargs):
        llamadas.append((url, kwargs.get("params") or {}))
        return _FakeResponse(_fake_get.payload)

    _fake_get.payload = _meta()
    monkeypatch.setattr(api._HTTP_SESSION, "get", _fake_get)
    _fake_get.llamadas = llamadas
    return _fake_get


def test_prefiere_el_precio_extendido_sobre_el_cierre_regular(yahoo):
    """fulldayPrice incluye pre y post mercado: es lo que el usuario ve en Yahoo."""
    yahoo.payload = _meta(
        regularMarketPrice=510.12,      # cierre de la sesión regular
        fulldayPrice=509.40,            # último negociado, ya en after-hours
        chartPreviousClose=496.82,
        regularMarketChangePercent=2.677,
    )
    precio, previo = api._quote_from_chart("MSFT")
    assert precio == 509.40
    assert previo == 496.82


def test_cae_al_precio_regular_si_no_hay_mercado_extendido(yahoo):
    """Mercados sin pre/post (o valores ilíquidos) no traen fulldayPrice."""
    yahoo.payload = _meta(
        regularMarketPrice=14.30,
        chartPreviousClose=14.27,
    )
    precio, previo = api._quote_from_chart("FMTY14.MX")
    assert precio == 14.30
    assert previo == 14.27


def test_deriva_el_cierre_previo_cuando_yahoo_no_lo_manda(yahoo):
    """Último recurso: reconstruirlo desde el cambio porcentual de la sesión."""
    yahoo.payload = _meta(
        regularMarketPrice=510.12,
        regularMarketChangePercent=2.677,
    )
    _precio, previo = api._quote_from_chart("MSFT")
    assert previo == pytest.approx(496.82, abs=0.01)


def test_pide_a_yahoo_el_mercado_extendido(yahoo):
    """Sin includePrePost, la cotización de after-hours no llega."""
    yahoo.payload = _meta(regularMarketPrice=100.0, chartPreviousClose=99.0)
    api._quote_from_chart("AAPL")
    _url, params = yahoo.llamadas[0]
    assert params.get("includePrePost") == "true"


def test_no_inventa_precio_si_yahoo_no_responde(yahoo):
    """Devolver (None, None) deja que el llamador caiga al respaldo de yfinance."""
    yahoo.payload = {"chart": {"result": []}}
    assert api._quote_from_chart("NOEXISTE") == (None, None)

    yahoo.payload = _meta(regularMarketPrice=0)     # precio inválido
    assert api._quote_from_chart("RARO") == (None, None)


def test_la_cache_evita_repetir_la_llamada(yahoo):
    yahoo.payload = _meta(regularMarketPrice=100.0, chartPreviousClose=99.0)
    api._quote_from_chart("AAPL")
    api._quote_from_chart("AAPL")
    assert len(yahoo.llamadas) == 1


def test_el_lote_usa_la_cotizacion_en_vivo_y_topa_la_lista(monkeypatch):
    """`/api/prices` es lo que llena la columna "Precio actual" del Tracker."""
    vistos = []

    def _fake_quote(sym):
        vistos.append(sym)
        return 509.40, 496.82

    monkeypatch.setattr(api, "_quote_from_chart", _fake_quote)

    # No se puede lanzar aquí para detectarlo: prices_batch envuelve el respaldo
    # en `except Exception: pass` y se tragaría la excepción del test.
    descargas = []
    monkeypatch.setattr(api.yf, "download", lambda *a, **k: descargas.append(a) or None)

    from fastapi import Request
    peticion = Request({"type": "http", "headers": [], "method": "GET", "path": "/api/prices"})
    salida = api.prices_batch.__wrapped__(peticion, "MSFT,ADBE,MSFT")

    assert salida["MSFT"] == {"price": 509.40, "prev": 496.82}
    assert vistos == ["MSFT", "ADBE"]           # sin duplicados
    assert descargas == []                      # nunca por los cierres diarios

    vistos.clear()
    api.prices_batch.__wrapped__(peticion, ",".join(f"T{i}" for i in range(200)))
    assert len(vistos) == 60                    # tope de símbolos por petición
