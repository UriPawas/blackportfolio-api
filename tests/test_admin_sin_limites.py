"""La cuenta de administrador no tiene tope de portafolios ni de posiciones.

El plan (Explorer: 1 portafolio y 10 posiciones) es para clientes. Antes, una
cuenta admin con plan Explorer recibía 403 al guardar su segundo portafolio.
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


def _set_user(uid, **fields):
    gen = persistence.get_session()
    session = next(gen)
    try:
        user = session.get(persistence.AppUser, uid)
        for k, v in fields.items():
            setattr(user, k, v)
        session.commit()
    finally:
        gen.close()


def _portafolios(n, posiciones=1):
    return [{"id": f"p{i}", "name": f"P{i}", "positions": [
        {"id": f"x{i}-{j}", "ticker": f"T{j}", "quantity": 1} for j in range(posiciones)
    ]} for i in range(n)]


def test_explorer_sigue_limitado_a_un_portafolio(client, auth):
    client.get("/api/account/bootstrap")
    _set_user(auth.token["uid"], plan="Explorer", role="user")
    r = client.put("/api/account/portfolios", json={"portfolios": _portafolios(2)})
    assert r.status_code == 403


def test_admin_con_plan_explorer_no_tiene_tope(client, auth):
    client.get("/api/account/bootstrap")
    _set_user(auth.token["uid"], plan="Explorer", role="admin")
    r = client.put("/api/account/portfolios", json={"portfolios": _portafolios(4, posiciones=12)})
    assert r.status_code == 200, r.text
    assert len(client.get("/api/account/bootstrap").json()["portfolios"]) == 4
