"""Tests del digest semanal: resumen agregado y cuerpo del email (sin red)."""
import api


PORTFOLIOS = [
    {
        "id": "p1", "name": "Growth", "currency": "USD",
        "positions": [
            {"ticker": "AAPL", "quantity": 10, "avgPrice": 150.0},
            {"ticker": "MSFT", "quantity": 5, "avgPrice": 300.0, "currency": "USD"},
            {"ticker": "SIN_PRECIO", "quantity": 3, "avgPrice": 10.0},
            {"ticker": "VACIA", "quantity": 0, "avgPrice": 10.0},
        ],
    },
    {
        "id": "p2", "name": "MX", "currency": "MXN",
        "positions": [
            {"ticker": "NAFTRAC", "quantity": 100, "avgPrice": 50.0},
        ],
    },
]

PRICES = {
    "AAPL": (200.0, 190.0),      # +5.26% día
    "MSFT": (280.0, 285.0),      # -1.75% día
    "NAFTRAC": (55.0, None),     # sin previo → no cuenta como mover
}


def test_digest_summary_agrupa_por_divisa_y_detecta_movers():
    s = api._digest_summary_for_snapshot(PORTFOLIOS, PRICES)
    assert s is not None
    assert s["positions"] == 3  # SIN_PRECIO y VACIA se descartan
    usd = s["totals"]["USD"]
    assert usd["value"] == 10 * 200.0 + 5 * 280.0
    assert usd["cost"] == 10 * 150.0 + 5 * 300.0
    mxn = s["totals"]["MXN"]
    assert mxn["value"] == 100 * 55.0
    assert s["best"][0] == "AAPL" and s["best"][1] > 5
    assert s["worst"][0] == "MSFT" and s["worst"][1] < 0


def test_digest_summary_none_sin_posiciones_valuables():
    assert api._digest_summary_for_snapshot([], PRICES) is None
    assert api._digest_summary_for_snapshot(
        [{"positions": [{"ticker": "XXX", "quantity": 1, "avgPrice": 1}]}], {}
    ) is None


def test_digest_email_body_incluye_totales_y_movers():
    s = api._digest_summary_for_snapshot(PORTFOLIOS, PRICES)
    body = api._digest_email_body("Uriel", s)
    assert "Hola Uriel" in body
    assert "USD" in body and "MXN" in body
    assert "AAPL" in body and "MSFT" in body
    assert "main.html" in body
