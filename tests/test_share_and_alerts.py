"""Smoke test de las features nuevas: compartir portafolio (#12) y alertas (#5).

Ejercita los routers de persistence.py sobre SQLite con auth simulada, igual que
test_account_flow.py. No depende de api.py (yfinance/pandas).
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


def _seed_portfolio(client, include_amounts=None):
    portfolio = {
        "id": "p1", "name": "Mi cartera", "currency": "USD",
        "positions": [
            {"ticker": "AAPL", "quantity": 10, "avgPrice": 150, "currency": "USD"},
            {"ticker": "MSFT", "quantity": 5, "avgPrice": 300, "currency": "USD"},
        ],
    }
    if include_amounts is not None:
        portfolio["shareIncludeAmounts"] = include_amounts
    boot = client.get("/api/account/bootstrap").json()
    payload = {"portfolios": [portfolio]}
    # Reescribir exige la version leida: el control de concurrencia rechaza (409)
    # una escritura basada en datos viejos.
    if boot.get("portfolioVersion"):
        payload["baseVersion"] = boot["portfolioVersion"]
    r = client.put("/api/account/portfolios", json=payload)
    assert r.status_code == 200, r.text


# ── Compartir (#12) ─────────────────────────────────────────────────────────

def test_compartir_crea_y_expone_vista_publica(client):
    _seed_portfolio(client)
    r = client.post("/api/account/portfolios/p1/share")
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    assert token

    # Idempotente: vuelve el mismo token
    assert client.post("/api/account/portfolios/p1/share").json()["token"] == token

    # Vista pública (sin auth necesaria en el override, pero el endpoint no la exige)
    pub = client.get(f"/api/public/portfolio/{token}")
    assert pub.status_code == 200, pub.text
    body = pub.json()
    assert body["name"] == "Mi cartera"
    assert body["positions"][0]["ticker"] == "AAPL"
    # No se filtran datos de cuenta
    assert "email" not in body


def test_vista_publica_no_publica_importes_por_omision(client):
    """P1.13: el modal promete que no se muestran datos de cuenta; la respuesta
    traía `quantity` y `avgPrice`, con los que la vista pública pintaba el
    patrimonio. Por omisión sólo salen proporciones."""
    _seed_portfolio(client)
    token = client.post("/api/account/portfolios/p1/share").json()["token"]
    body = client.get(f"/api/public/portfolio/{token}").json()

    assert body["includesAmounts"] is False
    for pos in body["positions"]:
        assert "quantity" not in pos
        assert "avgPrice" not in pos
        assert pos["relQty"] > 0
        assert pos["costWeight"] > 0

    # Los pesos por costo siguen sumando 100 % y respetan la proporción real:
    # AAPL 10 x 150 = 1500 contra MSFT 5 x 300 = 1500.
    weights = {p["ticker"]: p["costWeight"] for p in body["positions"]}
    assert round(sum(weights.values())) == 100
    assert round(weights["AAPL"], 4) == round(weights["MSFT"], 4)

    # `relQty` no permite despejar la cantidad: es la cantidad entre la base de
    # costo (3000), no la cantidad.
    rel = {p["ticker"]: p["relQty"] for p in body["positions"]}
    assert abs(rel["AAPL"] - 10 / 3000) < 1e-9
    assert abs(rel["MSFT"] - 5 / 3000) < 1e-9


def test_vista_publica_con_montos_si_el_dueno_lo_activa(client):
    _seed_portfolio(client, include_amounts=True)
    token = client.post("/api/account/portfolios/p1/share").json()["token"]
    body = client.get(f"/api/public/portfolio/{token}").json()

    assert body["includesAmounts"] is True
    aapl = next(p for p in body["positions"] if p["ticker"] == "AAPL")
    assert aapl["quantity"] == 10
    assert aapl["avgPrice"] == 150


def test_apagar_los_montos_afecta_al_enlace_ya_repartido(client):
    """La preferencia vive dentro del portafolio, no en el token: apagarla no
    exige revocar y volver a generar el enlace."""
    _seed_portfolio(client, include_amounts=True)
    token = client.post("/api/account/portfolios/p1/share").json()["token"]
    assert client.get(f"/api/public/portfolio/{token}").json()["includesAmounts"] is True

    _seed_portfolio(client, include_amounts=False)
    body = client.get(f"/api/public/portfolio/{token}").json()
    assert body["includesAmounts"] is False
    assert "quantity" not in body["positions"][0]


def test_compartir_portafolio_inexistente_404(client):
    client.get("/api/account/bootstrap")
    r = client.post("/api/account/portfolios/nope/share")
    assert r.status_code == 404


def test_revocar_share_invalida_enlace(client):
    _seed_portfolio(client)
    token = client.post("/api/account/portfolios/p1/share").json()["token"]
    assert client.delete("/api/account/portfolios/p1/share").status_code == 200
    assert client.get(f"/api/public/portfolio/{token}").status_code == 404


# ── Alertas (#5) ────────────────────────────────────────────────────────────

def test_alertas_crud(client):
    client.get("/api/account/bootstrap")
    assert client.get("/api/account/alerts").json()["alerts"] == []

    r = client.post("/api/account/alerts", json={"symbol": "aapl", "kind": "price_above", "threshold": 250})
    assert r.status_code == 200, r.text
    alert = r.json()["alert"]
    assert alert["symbol"] == "AAPL"  # se normaliza a mayúsculas
    assert alert["active"] is True

    lst = client.get("/api/account/alerts").json()["alerts"]
    assert len(lst) == 1

    assert client.delete(f"/api/account/alerts/{alert['id']}").status_code == 200
    assert client.get("/api/account/alerts").json()["alerts"] == []


def test_alerta_umbral_invalido_400(client):
    client.get("/api/account/bootstrap")
    r = client.post("/api/account/alerts", json={"symbol": "AAPL", "kind": "price_above", "threshold": 0})
    assert r.status_code == 400


def test_alerta_tipo_invalido_400(client):
    client.get("/api/account/bootstrap")
    r = client.post("/api/account/alerts", json={"symbol": "AAPL", "kind": "bogus", "threshold": 10})
    assert r.status_code == 400


# ── Notificaciones (#5) ─────────────────────────────────────────────────────

def test_notificaciones_vacias_y_mark_read(client):
    client.get("/api/account/bootstrap")
    data = client.get("/api/account/notifications").json()
    assert data["unread"] == 0
    assert data["notifications"] == []
    assert client.post("/api/account/notifications/read").json()["ok"] is True


# ── Evaluación del scheduler: alerta disparada → notificación (#5) ───────────

def test_evaluacion_dispara_alerta_y_crea_notificacion(client, auth, monkeypatch):
    """El núcleo de #5: cuando el precio cruza el umbral, la alerta se desactiva
    y se genera una notificación in-app. Se mockea el precio (sin red)."""
    import api

    client.get("/api/account/bootstrap")  # crea el usuario
    uid = auth.token["uid"]

    # Sembrar una alerta directamente en la BD de prueba
    Session = persistence.sessionmaker(bind=persistence.get_engine())
    with Session() as s:
        s.add(persistence.UserAlert(
            firebase_uid=uid, symbol="AAPL", kind="price_above",
            threshold=100.0, active=True, created_at=persistence.utc_now(),
        ))
        s.commit()

    # Precio actual por encima del umbral → debe dispararse
    monkeypatch.setattr(api, "_price_and_prev_for_ticker", lambda sym: (150.0, 149.0))
    triggered = api._evaluate_alerts_once()
    assert triggered == 1

    # La alerta quedó desactivada y existe una notificación no leída
    data = client.get("/api/account/notifications").json()
    assert data["unread"] == 1
    assert "AAPL" in data["notifications"][0]["title"]
    assert client.get("/api/account/alerts").json()["alerts"][0]["active"] is False
