"""El token de sesión 2FA (dispositivo de confianza) vale 7 días exactos desde que
se verifica el código: ni se renueva solo ni se acorta a la mitad (antes 3.5 días)."""
import persistence

SEMANA = 7 * 24 * 3600
T0 = 1_800_000_000


def _a(monkeypatch, instante):
    monkeypatch.setattr(persistence.time, "time", lambda: instante)


def test_token_2fa_vale_siete_dias(monkeypatch):
    _a(monkeypatch, T0)
    token = persistence.issue_2fa_token("uid-a")

    _a(monkeypatch, T0 + SEMANA - 60)
    assert persistence.verify_2fa_token(token, "uid-a")

    _a(monkeypatch, T0 + SEMANA + 60)
    assert not persistence.verify_2fa_token(token, "uid-a")


def test_token_2fa_es_de_un_solo_usuario(monkeypatch):
    _a(monkeypatch, T0)
    token = persistence.issue_2fa_token("uid-a")
    assert not persistence.verify_2fa_token(token, "uid-b")
