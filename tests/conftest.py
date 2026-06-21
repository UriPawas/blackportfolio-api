"""Configuración compartida de las pruebas.

Las pruebas corren contra una base SQLite temporal y aislada — NUNCA tocan
PostgreSQL de producción. La autenticación de Firebase se sustituye por un token
falso (dependency override) y las llamadas a Stripe se simulan, de modo que la
suite corre sin DATABASE_URL, sin credenciales de Firebase y sin Stripe CLI.

    pip install -r requirements-dev.txt
    pytest -q
"""
import os
import pathlib
import tempfile

# ── Entorno de prueba: debe fijarse ANTES de importar persistence/api ──────────
_TEST_DB = pathlib.Path(tempfile.gettempdir()) / "blackportfolio_test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB.as_posix()}"
os.environ["TWOFA_SECRET"] = "test-2fa-signing-key-not-for-prod"
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_test_dummy_secret")
# Sin SENTRY_DSN / BACKUP_* / STRIPE_SECRET_KEY: todo eso queda en no-op.

import pytest  # noqa: E402
import persistence  # noqa: E402

# Desactiva el rate-limiting durante las pruebas (si no, llamadas repetidas a los
# endpoints 2FA agotarían el límite entre tests y devolverían 429).
try:
    persistence.limiter.enabled = False
except Exception:
    pass


@pytest.fixture(autouse=True)
def fresh_db():
    """Base limpia por prueba: aislamiento total entre casos."""
    engine = persistence.get_engine()
    persistence.Base.metadata.drop_all(engine)
    persistence.Base.metadata.create_all(engine)
    yield
    persistence.Base.metadata.drop_all(engine)


class FakeAuth:
    """Token de Firebase simulado y mutable: las pruebas ajustan uid/email/verified."""

    def __init__(self, uid="user_test", email="tester@example.com",
                 email_verified=True, name="Tester"):
        self.token = {
            "uid": uid,
            "email": email,
            "email_verified": email_verified,
            "name": name,
        }

    def __call__(self):
        return dict(self.token)


def totp_now(secret: str) -> str:
    """Código TOTP válido para 'ahora', usando la misma lógica que el servidor."""
    import time
    return persistence._hotp(secret, int(time.time() // 30))
