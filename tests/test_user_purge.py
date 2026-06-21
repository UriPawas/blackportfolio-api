"""purge_user: borra por completo un usuario de PostgreSQL + allowlist (las llamadas
a Firebase Auth fallan-graciosamente sin credenciales, como en el resto de la suite).
Cubre el caso real: una identidad cuyo correo sigue 'registrado' tras borrar datos."""
import pytest

import persistence
from persistence import (
    AppUser, PortfolioSnapshot, SecurityActivity, BetaAllowlist,
    purge_user, upsert_user, utc_now,
)


@pytest.fixture(autouse=True)
def _no_firebase_network(monkeypatch):
    """Evita llamadas de red reales a Firebase Auth (sin credenciales colgaría el
    test con reintentos). purge_user las envuelve en try/except, así que basta con
    que fallen rápido para ejercitar la limpieza de PostgreSQL/allowlist."""
    monkeypatch.setattr(persistence, "initialize_firebase_admin", lambda: None)

    def _boom(*a, **k):
        raise RuntimeError("firebase deshabilitado en pruebas")

    monkeypatch.setattr(persistence.firebase_auth, "get_user_by_email", _boom)
    monkeypatch.setattr(persistence.firebase_auth, "delete_user", _boom)


def _session():
    persistence.get_engine()
    return persistence._session_factory()


def _token(uid="u1", email="tester@example.com"):
    return {"uid": uid, "email": email, "email_verified": True, "name": "Tester"}


def _seed_user(uid="u1", email="tester@example.com"):
    with _session() as s:
        upsert_user(s, _token(uid, email))
        s.add(PortfolioSnapshot(
            firebase_uid=uid, data=[], checksum="x", version=1, source="app",
            created_at=utc_now(), updated_at=utc_now(),
        ))
        s.add(SecurityActivity(firebase_uid=uid, event="login", detail="", created_at=utc_now()))
        s.add(BetaAllowlist(email=email.lower(), created_at=utc_now()))
        s.commit()


def test_purge_por_email_borra_todo():
    _seed_user(email="tester@example.com")
    with _session() as s:
        out = purge_user(s, email="tester@example.com")
    assert out["ok"] is True
    with _session() as s:
        assert s.get(AppUser, "u1") is None
        assert s.get(PortfolioSnapshot, "u1") is None
        assert s.get(BetaAllowlist, "tester@example.com") is None
        assert s.query(SecurityActivity).filter_by(firebase_uid="u1").count() == 0


def test_purge_por_uid_borra_todo_y_resuelve_email_para_allowlist():
    _seed_user(uid="u2", email="otro@example.com")
    with _session() as s:
        purge_user(s, uid="u2")
    with _session() as s:
        assert s.get(AppUser, "u2") is None
        # El email se resolvió desde la fila de Postgres → la allowlist también se limpió.
        assert s.get(BetaAllowlist, "otro@example.com") is None


def test_purge_correo_inexistente_no_falla():
    with _session() as s:
        out = purge_user(s, email="nadie@example.com")
    assert out["ok"] is True
    assert out["uidsRemoved"] == []
