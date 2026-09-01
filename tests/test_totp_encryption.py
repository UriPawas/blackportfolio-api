"""El secreto TOTP no debe quedar legible en la base.

Cubre las tres situaciones que importan: cifrado al escribir, compatibilidad con
las filas heredadas en claro (nadie con 2FA activo puede quedar fuera), y la
migración de una sola pasada que cifra lo que quedó.
"""
import base64
import hmac
import hashlib
import struct
import time

import pytest
from cryptography.fernet import Fernet

import persistence


def _code_for(secret: str) -> str:
    """Código TOTP válido ahora mismo para ese secreto."""
    key = persistence._b32_decode(secret)
    digest = hmac.new(key, struct.pack(">Q", int(time.time() // 30)), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = (
        (digest[offset] & 0x7F) << 24
        | (digest[offset + 1] & 0xFF) << 16
        | (digest[offset + 2] & 0xFF) << 8
        | (digest[offset + 3] & 0xFF)
    ) % 1_000_000
    return f"{code:06d}"


@pytest.fixture
def cipher_on(monkeypatch):
    """Activa el cifrado con una clave de prueba y limpia el estado global."""
    monkeypatch.setenv("TOTP_ENCRYPTION_KEY", Fernet.generate_key().decode())
    monkeypatch.setattr(persistence, "_TOTP_FERNET", None, raising=False)
    monkeypatch.setattr(persistence, "_TOTP_FERNET_READY", False, raising=False)
    yield
    persistence._TOTP_FERNET = None
    persistence._TOTP_FERNET_READY = False


def test_secreto_no_queda_en_claro(cipher_on):
    secret = persistence._generate_totp_secret()
    stored = persistence._totp_encrypt(secret)
    assert stored != secret
    assert secret not in stored
    assert persistence._totp_decrypt(stored) == secret


def test_cifrado_cabe_en_la_columna(cipher_on):
    """La columna se amplió a 255 justo por esto: en 64 no cabía."""
    stored = persistence._totp_encrypt(persistence._generate_totp_secret())
    assert len(stored) <= 255
    assert len(stored) > 64  # confirma que el ALTER TABLE era necesario


def test_fila_heredada_en_claro_sigue_validando(cipher_on):
    """Quien ya tenía 2FA antes de la migración no puede quedar bloqueado."""
    legacy = persistence._generate_totp_secret()
    assert persistence._totp_decrypt(legacy) == legacy
    assert persistence._verify_totp(persistence._totp_decrypt(legacy), _code_for(legacy))


def test_sin_clave_no_rompe_el_2fa(monkeypatch):
    """Sin TOTP_ENCRYPTION_KEY se guarda como antes en vez de tirar el servicio."""
    monkeypatch.delenv("TOTP_ENCRYPTION_KEY", raising=False)
    monkeypatch.setattr(persistence, "_TOTP_FERNET", None, raising=False)
    monkeypatch.setattr(persistence, "_TOTP_FERNET_READY", False, raising=False)
    try:
        secret = persistence._generate_totp_secret()
        assert persistence._totp_encrypt(secret) == secret
        assert persistence._totp_decrypt(secret) == secret
    finally:
        persistence._TOTP_FERNET = None
        persistence._TOTP_FERNET_READY = False


def test_secreto_de_otra_clave_no_valida(cipher_on):
    """Un texto cifrado con otra clave cae en la rama 'heredado' pero no valida."""
    secret = persistence._generate_totp_secret()
    ajeno = Fernet(Fernet.generate_key()).encrypt(secret.encode()).decode()
    assert persistence._verify_totp(persistence._totp_decrypt(ajeno), _code_for(secret)) is False


def test_migracion_cifra_lo_heredado_y_es_idempotente(cipher_on):
    """_encrypt_legacy_totp_secrets deja la fila cifrada y no la re-cifra."""
    uid = "uid-migracion-totp"
    legacy = persistence._generate_totp_secret()
    now = persistence.utc_now()

    scope = persistence.get_session()
    session = next(scope)
    session.merge(persistence.TotpCredential(
        firebase_uid=uid, secret=legacy, pending_secret=None,
        enabled=True, created_at=now, updated_at=now,
    ))
    session.commit()
    session.close()

    persistence._encrypt_legacy_totp_secrets()

    scope = persistence.get_session()
    session = next(scope)
    stored = session.get(persistence.TotpCredential, uid).secret
    session.close()
    assert stored != legacy, "la fila heredada debió quedar cifrada"
    assert persistence._totp_decrypt(stored) == legacy

    # Segunda pasada: no debe volver a cifrar lo ya cifrado.
    persistence._encrypt_legacy_totp_secrets()
    scope = persistence.get_session()
    session = next(scope)
    again = session.get(persistence.TotpCredential, uid).secret
    session.close()
    assert again == stored
    assert persistence._totp_decrypt(again) == legacy
