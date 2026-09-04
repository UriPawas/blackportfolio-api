"""Regresiones del sistema de pagos, salidas de la auditoría de seguridad.

Cada caso reproduce un defecto que llegó a producción. Reutiliza el arnés de
test_billing_webhook.py: webhook firmado de verdad, Stripe simulado, SQLite.
"""
import pytest
from fastapi.testclient import TestClient

import persistence
from conftest import FakeAuth

try:
    import api
except Exception as e:  # pragma: no cover
    pytest.skip(f"no se pudo importar api.py: {e}", allow_module_level=True)

from test_billing_webhook import (  # noqa: E402
    _checkout_event, _mock_stripe, _plan_in_db, _profile, _seed_user,
    _send_event, _set_profile,
)


@pytest.fixture
def auth():
    return FakeAuth(uid="user_pay", email="payer@example.com")


@pytest.fixture
def client(auth):
    api.app.dependency_overrides[persistence.verify_firebase_user] = auth
    with TestClient(api.app) as c:
        yield c
    api.app.dependency_overrides.clear()


def _subscription_event(event_id, *, status="active", metadata=None,
                        created=None, **campos):
    obj = {
        "object": "subscription",
        "id": "sub_test_123",
        "status": status,
        "customer": "cus_test_123",
        "metadata": {"uid": "user_pay"} if metadata is None else metadata,
    }
    obj.update(campos)
    evento = {
        "id": event_id,
        "object": "event",
        "type": "customer.subscription.updated",
        "data": {"object": obj},
    }
    if created is not None:
        evento["created"] = created
    return evento


# ── El recibo de un cobro no es un entitlement ────────────────────────────────

def test_confirm_no_revive_el_plan_de_una_suscripcion_cancelada(client, monkeypatch):
    """Una sesión de checkout conserva payment_status="paid" PARA SIEMPRE.

    Quien cancelaba su suscripción recuperaba el plan de pago gratis con solo
    reabrir success.html?session_id=… desde el historial del navegador.
    """
    _seed_user(client)
    _mock_stripe(monkeypatch)
    assert client.post("/api/billing/stripe/confirm", json={"sessionId": "cs_1"}).status_code == 200
    assert _plan_in_db("user_pay") == "Advisor Pro"

    _send_event(client, {
        "id": "evt_del", "object": "event", "type": "customer.subscription.deleted",
        "data": {"object": {"object": "subscription", "id": "sub_test_123",
                            "customer": "cus_test_123", "metadata": {"uid": "user_pay"}}},
    })
    assert _plan_in_db("user_pay") == "Explorer"

    # Replay: el recibo sigue pagado, la suscripción ya no está viva.
    _mock_stripe(monkeypatch, subscription={"status": "canceled"})
    r = client.post("/api/billing/stripe/confirm", json={"sessionId": "cs_1"})
    assert r.status_code == 409, r.text
    assert _plan_in_db("user_pay") == "Explorer"


# ── Un evento sin plan no puede degradar a quien paga ─────────────────────────

def test_subscription_updated_sin_plan_no_degrada_a_quien_paga(client):
    """Stripe emite subscription.updated por muchas razones y no siempre trae
    metadata. `normalize_plan(None)` devuelve "Explorer": aplicarlo dejaba a un
    cliente que está pagando con 1 portafolio y 10 posiciones.
    """
    _seed_user(client)
    _send_event(client, _checkout_event("evt_pro", "user_pay", "Advisor Pro"))
    assert _plan_in_db("user_pay") == "Advisor Pro"

    r = _send_event(client, _subscription_event(
        "evt_upd_sin_meta", metadata={}, current_period_end=1800000000))
    assert r.status_code == 200, r.text
    assert _plan_in_db("user_pay") == "Advisor Pro"          # NO degradado
    assert _profile("user_pay")["billingStatus"] == "active"


def test_subscription_updated_con_plan_si_lo_aplica(client):
    """El caso legítimo sigue funcionando: con plan en el evento, manda el evento."""
    _seed_user(client)
    _send_event(client, _checkout_event("evt_inv", "user_pay", "Investor"))
    _send_event(client, _subscription_event(
        "evt_sube", metadata={"uid": "user_pay", "plan": "Wealth Desk"}))
    assert _plan_in_db("user_pay") == "Wealth Desk"


# ── Stripe no garantiza el orden de entrega ───────────────────────────────────

def test_evento_fuera_de_orden_no_revierte_el_estado(client):
    _seed_user(client)
    _send_event(client, _checkout_event("evt_base", "user_pay", "Advisor Pro"))

    assert _send_event(client, _subscription_event(
        "evt_nuevo", created=2000, metadata={"uid": "user_pay", "plan": "Advisor Pro"},
    )).status_code == 200
    assert _plan_in_db("user_pay") == "Advisor Pro"

    # Llega tarde un evento anterior que decía "unpaid".
    assert _send_event(client, _subscription_event(
        "evt_viejo", created=1000, status="unpaid",
        metadata={"uid": "user_pay", "plan": "Advisor Pro"},
    )).status_code == 200
    assert _plan_in_db("user_pay") == "Advisor Pro"
    assert _profile("user_pay")["billingStatus"] == "active"


# ── Cancelación programada: la app tiene que decirlo ──────────────────────────

def test_cancelacion_al_final_del_periodo_queda_registrada(client):
    """Cancelar en el portal deja la suscripción "active" con fecha de fin.
    Sin guardarlo, Ajustes decía sólo "Activo" y el usuario no se enteraba."""
    _seed_user(client)
    _send_event(client, _checkout_event("evt_c", "user_pay", "Investor"))
    _send_event(client, _subscription_event(
        "evt_cancel_periodo",
        metadata={"uid": "user_pay", "plan": "Investor"},
        cancel_at_period_end=True, current_period_end=1800000000,
    ))
    perfil = _profile("user_pay")
    assert perfil["cancelAtPeriodEnd"] is True
    assert perfil["billingCurrentPeriodEnd"] == 1800000000
    assert _plan_in_db("user_pay") == "Investor"


# ── Resolver al usuario sin recorrer toda la tabla ────────────────────────────

def test_webhook_encuentra_al_usuario_por_customer_id(client):
    """invoice.paid llega sin uid: hay que resolver por customer. Antes se
    traían TODAS las filas de app_users a memoria en cada webhook."""
    _seed_user(client)
    _set_profile("user_pay", stripeCustomerId="cus_solo_customer")
    r = _send_event(client, {
        "id": "evt_invoice", "object": "event", "type": "invoice.paid",
        "data": {"object": {"object": "invoice", "customer": "cus_solo_customer"}},
    })
    assert r.status_code == 200, r.text
    assert _profile("user_pay")["billingStatus"] == "active"


def test_customer_desconocido_no_toca_a_nadie(client):
    _seed_user(client)
    _set_profile("user_pay", stripeCustomerId="cus_mio")
    r = _send_event(client, {
        "id": "evt_ajeno", "object": "event", "type": "invoice.paid",
        "data": {"object": {"object": "invoice", "customer": "cus_de_otro"}},
    })
    assert r.status_code == 200
    assert _profile("user_pay").get("billingStatus") is None


# ── Dos suscripciones = dos cobros ────────────────────────────────────────────

def test_no_deja_abrir_un_segundo_checkout_con_suscripcion_viva(client, monkeypatch):
    _seed_user(client)
    _set_profile("user_pay", stripeSubscriptionId="sub_test_123")
    monkeypatch.setattr(api.stripe, "api_key", "sk_test_x")
    monkeypatch.setattr(api.stripe, "Subscription",
                        type("S", (), {"retrieve": staticmethod(lambda *a, **k: {"status": "active"})}))

    r = client.post("/api/billing/stripe/create-checkout-session",
                    json={"plan": "Wealth Desk", "billingCycle": "monthly"})
    assert r.status_code == 409, r.text
    assert "Gestionar suscripción" in r.json()["detail"]


def test_con_la_suscripcion_cancelada_si_deja_volver_a_contratar(client, monkeypatch):
    _seed_user(client)
    _set_profile("user_pay", stripeSubscriptionId="sub_viejo")
    monkeypatch.setattr(api.stripe, "api_key", "sk_test_x")
    monkeypatch.setattr(api.stripe, "Subscription",
                        type("S", (), {"retrieve": staticmethod(lambda *a, **k: {"status": "canceled"})}))
    creadas = []
    monkeypatch.setattr(api.stripe.checkout.Session, "create", staticmethod(
        lambda **kw: creadas.append(kw) or type("S", (), {"url": "https://checkout"})()))

    r = client.post("/api/billing/stripe/create-checkout-session",
                    json={"plan": "Investor", "billingCycle": "monthly"})
    assert r.status_code == 200, r.text
    assert len(creadas) == 1


# ── El segundo factor cubre también la facturación ────────────────────────────

def test_facturacion_exige_el_segundo_factor(client):
    """Con sólo la contraseña se abría el portal de Stripe: historial de
    facturación, últimos 4 dígitos de la tarjeta y el botón de cancelar."""
    _seed_user(client)
    persistence.get_engine()
    with persistence._session_factory() as s:
        s.add(persistence.TotpCredential(
            firebase_uid="user_pay", secret="JBSWY3DPEHPK3PXP", pending_secret=None,
            enabled=True, created_at=persistence.utc_now(), updated_at=persistence.utc_now(),
        ))
        s.commit()

    for ruta, cuerpo in (
        ("/api/billing/stripe/portal", None),
        ("/api/billing/stripe/confirm", {"sessionId": "cs_x"}),
        ("/api/billing/stripe/create-checkout-session",
         {"plan": "Investor", "billingCycle": "monthly"}),
    ):
        r = client.post(ruta, json=cuerpo)
        assert r.status_code == 403, f"{ruta} -> {r.status_code} {r.text}"
        assert r.json()["detail"] == "2fa_required"

    # Con el token del segundo factor el guardia deja pasar (lo que falle
    # después es Stripe sin configurar, no la autorización).
    r = client.post("/api/billing/stripe/portal",
                    headers={"X-2FA-Token": persistence.issue_2fa_token("user_pay")})
    assert r.status_code != 403, r.text


def test_el_webhook_no_pide_segundo_factor(client):
    """Lo firma Stripe, no un usuario: exigirle 2FA lo rompería."""
    _seed_user(client)
    r = _send_event(client, _checkout_event("evt_sin_2fa", "user_pay", "Investor"))
    assert r.status_code == 200, r.text
    assert _plan_in_db("user_pay") == "Investor"
