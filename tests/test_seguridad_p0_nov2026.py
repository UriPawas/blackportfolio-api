"""Regresión de los dos P0 de código de la auditoría de nov-2026:

1. Bypass del 2FA: /api/2fa/setup + /verify-setup solo piden la sesión de Firebase, así que
   con la contraseña se REEMPLAZABA el autenticador de una cuenta que ya tenía 2FA activo.
2. Mass assignment en PATCH /api/account/profile: el cliente podía escribir en el perfil
   claves que son del servidor (billingEventAt, betaGrant, cancelAtPeriodEnd...)."""
import json
import urllib.parse

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

import api
import persistence
from conftest import FakeAuth, totp_now

AHORA = 1_800_000_000


@pytest.fixture
def auth():
    return FakeAuth(uid="uid_dueno", email="dueno@example.test", name="Dueño")


@pytest.fixture
def client(auth):
    app_ = api.app
    app_.dependency_overrides[persistence.verify_firebase_user] = auth
    with TestClient(app_) as c:
        yield c
    app_.dependency_overrides.pop(persistence.verify_firebase_user, None)


def _secreto(resp_json):
    uri = resp_json["otpauthUri"]
    return urllib.parse.parse_qs(urllib.parse.urlparse(uri).query)["secret"][0]


def _activar_2fa(client):
    s = client.post("/api/2fa/setup")
    assert s.status_code == 200
    secret = _secreto(s.json())
    v = client.post("/api/2fa/verify-setup", json={"code": totp_now(secret)})
    assert v.status_code == 200
    return secret


def _cred():
    with Session(persistence.get_engine()) as s:
        c = s.get(persistence.TotpCredential, "uid_dueno")
        return c.enabled, c.secret, c.pending_secret


# ── 1. 2FA ───────────────────────────────────────────────────────────────────
def test_setup_con_2fa_activo_se_rechaza_y_no_cambia_el_secreto(client):
    secret = _activar_2fa(client)
    antes = _cred()

    r = client.post("/api/2fa/setup")  # el atacante, con solo la sesión de Firebase
    assert r.status_code == 409
    assert "ya está activo" in r.json()["detail"]
    assert _cred() == antes                      # ni secreto ni pendiente cambiaron
    ok = client.post("/api/2fa/verify", json={"code": totp_now(secret)})
    assert ok.json()["valid"] is True             # el autenticador del dueño sigue valiendo


def test_verify_setup_nunca_reemplaza_un_secreto_activo(client):
    secret = _activar_2fa(client)
    # estado "viejo" (de antes del arreglo): hay un pendiente aunque el 2FA está activo
    nuevo = persistence._generate_totp_secret()
    with Session(persistence.get_engine()) as s:
        c = s.get(persistence.TotpCredential, "uid_dueno")
        c.pending_secret = persistence._totp_encrypt(nuevo)
        s.commit()
    antes = _cred()

    r = client.post("/api/2fa/verify-setup", json={"code": totp_now(nuevo)})
    assert r.status_code == 409
    assert _cred() == antes
    assert client.post("/api/2fa/verify", json={"code": totp_now(secret)}).json()["valid"] is True


def test_el_alta_normal_y_el_cambio_de_autenticador_siguen_funcionando(client):
    secret = _activar_2fa(client)
    assert client.post("/api/2fa/disable", json={"code": totp_now(secret)}).status_code == 200
    _activar_2fa(client)  # tras desactivar con código, se puede dar de alta otro


# ── 2. Perfil ────────────────────────────────────────────────────────────────
def _perfil():
    with Session(persistence.get_engine()) as s:
        u = s.get(persistence.AppUser, "uid_dueno")
        return dict(u.profile_data or {})


def _sembrar_perfil_del_servidor():
    """Claves que SOLO escribe el servidor (Stripe / betas), ya presentes en el perfil."""
    with Session(persistence.get_engine()) as s:
        u = s.get(persistence.AppUser, "uid_dueno")
        u.profile_data = {
            "billingEventAt": 111, "betaGrant": {"expiresAt": "2026-12-31", "expired": False},
            "cancelAtPeriodEnd": False, "billingStatus": "beta", "createdAt": "2026-01-01T00:00:00Z",
        }
        s.commit()


def test_patch_ignora_las_claves_del_servidor(client):
    client.patch("/api/account/profile", json={"fullName": "Ana"})  # crea el usuario
    _sembrar_perfil_del_servidor()

    r = client.patch("/api/account/profile", json={
        "fullName": "Ana Pérez",
        "billingEventAt": 4_102_444_800,                      # congelaría los webhooks de Stripe
        "betaGrant": {"expiresAt": "2099-01-01", "expired": False},
        "cancelAtPeriodEnd": True, "billingStatus": "active", "plan": "Wealth Desk",
        "isDemo": True, "totpSecret": "JBSWY3DPEHPK3PXP", "inventada": {"x": 1},
        "createdAt": "1999-01-01T00:00:00Z",
    })
    assert r.status_code == 200
    p = _perfil()
    assert p["fullName"] == "Ana Pérez"                      # lo permitido sí se guarda
    assert p["billingEventAt"] == 111                         # lo del servidor, intacto
    assert p["betaGrant"] == {"expiresAt": "2026-12-31", "expired": False}
    assert p["cancelAtPeriodEnd"] is False and p["billingStatus"] == "beta"
    assert p["createdAt"] == "2026-01-01T00:00:00Z"           # la fecha de alta se fija una vez
    for ajena in ("isDemo", "totpSecret", "inventada", "plan"):
        assert ajena not in p


def test_patch_guarda_lo_que_la_app_realmente_manda(client):
    r = client.patch("/api/account/profile", json={
        "fullName": "Ana", "avatarId": "3", "lastSeen": "2026-11-26T10:00:00Z",
        "planSelectionCompleted": True, "requestedPlan": "Investor",
        "createdAt": "2026-11-26T09:00:00Z", "investorProfile": {"riesgo": "moderado"},
    })
    assert r.status_code == 200
    p = _perfil()
    assert p["avatarId"] == "3" and p["planSelectionCompleted"] is True
    assert p["investorProfile"] == {"riesgo": "moderado"} and p["createdAt"] == "2026-11-26T09:00:00Z"


def test_patch_descarta_valores_de_tipo_incorrecto_y_rechaza_cuerpos_enormes(client):
    client.patch("/api/account/profile", json={"fullName": "Ana"})
    client.patch("/api/account/profile", json={
        "avatarId": True, "planSelectionCompleted": 1, "fullName": "x" * 5000, "investorProfile": "no-dict",
    })
    p = _perfil()
    assert p["fullName"] == "Ana"                              # el nombre gigante se descartó
    assert not {"avatarId", "planSelectionCompleted", "investorProfile"} & p.keys()

    r = client.patch("/api/account/profile", json={"investorProfile": {"k": "x" * 40_000}})
    assert r.status_code == 413
    assert "k" not in json.dumps(_perfil().get("investorProfile", {}))
