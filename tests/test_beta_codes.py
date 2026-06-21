"""Códigos de beta: canje (eleva plan + allowlist), límite de usos, doble-canje y
expiración perezosa. Corre contra SQLite temporal — no toca producción."""
from datetime import timedelta

import pytest
from fastapi import HTTPException

import persistence
from persistence import (
    BetaCode, BetaAllowlist, AppUser, redeem_beta_code, upsert_user, utc_now,
)


def _session():
    persistence.get_engine()
    return persistence._session_factory()


def _make_code(code="BETA-TEST123", plan="Advisor Pro", duration_days=30, max_redemptions=1):
    with _session() as s:
        s.add(BetaCode(
            code=code, plan=plan, duration_days=duration_days,
            max_redemptions=max_redemptions, redemptions=0, active=True,
            created_at=utc_now(),
        ))
        s.commit()


def _token(uid="u1", email="tester@example.com"):
    return {"uid": uid, "email": email, "email_verified": True, "name": "Tester"}


def test_canje_eleva_plan_y_anade_a_allowlist():
    _make_code()
    with _session() as s:
        out = redeem_beta_code(s, _token(), "beta-test123")  # case-insensitive
    assert out["plan"] == "Advisor Pro"
    with _session() as s:
        user = s.get(AppUser, "u1")
        assert user.plan == "Advisor Pro"
        assert user.profile_data["betaGrant"]["code"] == "BETA-TEST123"
        assert user.profile_data["billingStatus"] == "beta"
        assert s.get(BetaAllowlist, "tester@example.com") is not None
        assert s.get(BetaCode, "BETA-TEST123").redemptions == 1


def test_codigo_invalido_404():
    with _session() as s, pytest.raises(HTTPException) as e:
        redeem_beta_code(s, _token(), "NO-EXISTE")
    assert e.value.status_code == 404


def test_codigo_agotado_409():
    _make_code(max_redemptions=1)
    with _session() as s:
        redeem_beta_code(s, _token(uid="u1", email="a@example.com"), "BETA-TEST123")
    with _session() as s, pytest.raises(HTTPException) as e:
        redeem_beta_code(s, _token(uid="u2", email="b@example.com"), "BETA-TEST123")
    assert e.value.status_code == 409


def test_doble_canje_mismo_usuario_409():
    _make_code(max_redemptions=5)
    with _session() as s:
        redeem_beta_code(s, _token(), "BETA-TEST123")
    with _session() as s, pytest.raises(HTTPException) as e:
        redeem_beta_code(s, _token(), "BETA-TEST123")
    assert e.value.status_code == 409


def test_grant_caducado_degrada_a_explorer_en_bootstrap():
    _make_code()
    with _session() as s:
        redeem_beta_code(s, _token(), "BETA-TEST123")
    # Fuerza la caducidad: expiresAt en el pasado.
    with _session() as s:
        user = s.get(AppUser, "u1")
        profile = dict(user.profile_data)
        grant = dict(profile["betaGrant"])
        grant["expiresAt"] = (utc_now() - timedelta(days=1)).isoformat()
        profile["betaGrant"] = grant
        user.profile_data = profile
        s.commit()
    # upsert_user (lo llama bootstrap) debe degradar a Explorer.
    with _session() as s:
        user = upsert_user(s, _token())
        s.commit()
        assert user.plan == "Explorer"
        assert user.profile_data["billingStatus"] == "beta_expired"
        assert user.profile_data["betaGrant"]["expired"] is True


def test_grant_activo_no_se_degrada():
    _make_code()
    with _session() as s:
        redeem_beta_code(s, _token(), "BETA-TEST123")
    with _session() as s:
        user = upsert_user(s, _token())
        s.commit()
        assert user.plan == "Advisor Pro"  # aún vigente
