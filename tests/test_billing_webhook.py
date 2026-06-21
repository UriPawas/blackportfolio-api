"""Smoke test del billing de Stripe: webhook firmado → plan autoritativo en DB.

Verifica la lógica del servidor sin red ni cuenta de Stripe:
  - Firma del webhook (válida vs. inválida) usando el secreto de prueba.
  - checkout.session.completed (pagado) eleva el plan en app_users.
  - Ruta de cupón 100%-off de beta: payment_status='no_payment_required'.
  - Idempotencia (mismo event id no se reprocesa).
  - subscription canceled degrada a Explorer.
  - /confirm verifica server-side la sesión (Stripe.retrieve simulado).
"""
import hashlib
import hmac
import json
import time

import pytest
from fastapi.testclient import TestClient

import persistence
from conftest import FakeAuth

try:
    import api
except Exception as e:  # pragma: no cover
    pytest.skip(f"no se pudo importar api.py: {e}", allow_module_level=True)

WEBHOOK_SECRET = "whsec_test_dummy_secret"  # debe coincidir con conftest


@pytest.fixture
def auth():
    return FakeAuth(uid="user_pay", email="payer@example.com")


@pytest.fixture
def client(auth):
    api.app.dependency_overrides[persistence.verify_firebase_user] = auth
    with TestClient(api.app) as c:
        yield c
    api.app.dependency_overrides.clear()


def _sign(payload: str, secret: str = WEBHOOK_SECRET) -> str:
    t = int(time.time())
    signed = f"{t}.{payload}".encode()
    sig = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return f"t={t},v1={sig}"


def _send_event(client, event: dict):
    payload = json.dumps(event)
    return client.post(
        "/api/billing/stripe/webhook",
        content=payload,
        headers={"stripe-signature": _sign(payload), "content-type": "application/json"},
    )


def _plan_in_db(uid: str) -> str:
    persistence.get_engine()
    with persistence._session_factory() as s:
        user = s.get(persistence.AppUser, uid)
        return user.plan if user else None


def _seed_user(client):
    """Crea el AppUser vía bootstrap (sin 2FA todavía)."""
    r = client.get("/api/account/bootstrap")
    assert r.status_code == 200


def _checkout_event(event_id, uid, plan, payment_status="paid"):
    return {
        "id": event_id,
        "object": "event",
        "type": "checkout.session.completed",
        "data": {"object": {
            "object": "checkout.session",
            "payment_status": payment_status,
            "client_reference_id": uid,
            "customer": "cus_test_123",
            "subscription": "sub_test_123",
            "metadata": {"uid": uid, "plan": plan, "billing_cycle": "monthly"},
        }},
    }


# ── Firma ──────────────────────────────────────────────────────────────────────

def test_webhook_firma_invalida_rechazada(client):
    payload = json.dumps(_checkout_event("evt_bad", "user_pay", "Advisor Pro"))
    r = client.post(
        "/api/billing/stripe/webhook",
        content=payload,
        headers={"stripe-signature": "t=1,v1=deadbeef", "content-type": "application/json"},
    )
    assert r.status_code == 400


# ── Pago real → eleva plan ──────────────────────────────────────────────────────

def test_checkout_completado_eleva_plan(client):
    _seed_user(client)
    assert _plan_in_db("user_pay") == "Explorer"
    r = _send_event(client, _checkout_event("evt_paid_1", "user_pay", "Advisor Pro"))
    assert r.status_code == 200, r.text
    assert r.json()["received"] is True
    assert _plan_in_db("user_pay") == "Advisor Pro"


# ── Cupón 100%-off (beta): no_payment_required también activa el plan ───────────

def test_cupon_100_off_activa_plan(client):
    _seed_user(client)
    r = _send_event(client, _checkout_event(
        "evt_coupon_1", "user_pay", "Investor", payment_status="no_payment_required"))
    assert r.status_code == 200, r.text
    assert _plan_in_db("user_pay") == "Investor"


# ── Idempotencia ─────────────────────────────────────────────────────────────────

def test_webhook_idempotente(client):
    _seed_user(client)
    ev = _checkout_event("evt_dup", "user_pay", "Advisor Pro")
    first = _send_event(client, ev)
    assert first.status_code == 200 and first.json().get("duplicate") is not True
    second = _send_event(client, ev)
    assert second.status_code == 200
    assert second.json().get("duplicate") is True
    assert _plan_in_db("user_pay") == "Advisor Pro"


# ── Cancelación degrada a Explorer ──────────────────────────────────────────────

def test_subscription_cancelada_degrada(client):
    _seed_user(client)
    _send_event(client, _checkout_event("evt_up", "user_pay", "Advisor Pro"))
    assert _plan_in_db("user_pay") == "Advisor Pro"

    canceled = {
        "id": "evt_cancel",
        "object": "event",
        "type": "customer.subscription.updated",
        "data": {"object": {
            "object": "subscription",
            "id": "sub_test_123",
            "status": "canceled",
            "customer": "cus_test_123",
            "metadata": {"uid": "user_pay", "plan": "Advisor Pro"},
        }},
    }
    r = _send_event(client, canceled)
    assert r.status_code == 200, r.text
    assert _plan_in_db("user_pay") == "Explorer"


# ── /confirm verifica server-side la sesión (Stripe.retrieve simulado) ──────────

def test_confirm_eleva_plan(client, monkeypatch):
    _seed_user(client)

    def fake_retrieve(session_id, **kwargs):
        return {
            "payment_status": "paid",
            "client_reference_id": "user_pay",
            "customer": "cus_test_123",
            "subscription": "sub_test_123",
            "metadata": {"plan": "Advisor Pro", "billing_cycle": "monthly"},
        }

    monkeypatch.setattr(api.stripe.checkout.Session, "retrieve", staticmethod(fake_retrieve))
    r = client.post("/api/billing/stripe/confirm", json={"sessionId": "cs_test_abc"})
    assert r.status_code == 200, r.text
    assert r.json()["plan"] == "Advisor Pro"
    assert _plan_in_db("user_pay") == "Advisor Pro"


def test_confirm_sesion_de_otro_usuario_rechazada(client, monkeypatch):
    _seed_user(client)

    def fake_retrieve(session_id, **kwargs):
        return {
            "payment_status": "paid",
            "client_reference_id": "otro_uid",
            "metadata": {"plan": "Advisor Pro"},
        }

    monkeypatch.setattr(api.stripe.checkout.Session, "retrieve", staticmethod(fake_retrieve))
    r = client.post("/api/billing/stripe/confirm", json={"sessionId": "cs_test_abc"})
    assert r.status_code == 403
