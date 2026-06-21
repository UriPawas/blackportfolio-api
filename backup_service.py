import argparse
import gzip
import hashlib
import json
import logging
import os
import threading
from datetime import datetime, timezone
from pathlib import Path

from cryptography.fernet import Fernet
from firebase_admin import storage
from sqlalchemy import inspect

from persistence import (
    AppUser,
    BillingEvent,
    PortfolioSnapshot,
    SecurityActivity,
    TotpCredential,
    get_session,
    initialize_firebase_admin,
)


LOGGER = logging.getLogger("blackportfolio.backups")
BACKUP_PREFIX = "postgres-backups/"
MODEL_TABLES = (
    ("app_users", AppUser),
    ("portfolio_snapshots", PortfolioSnapshot),
    ("security_activity", SecurityActivity),
    ("totp_credentials", TotpCredential),
    ("billing_events", BillingEvent),
)


def _json_value(value):
    if isinstance(value, datetime):
        return {"__datetime__": value.astimezone(timezone.utc).isoformat()}
    return value


def _backup_key() -> bytes:
    raw = os.environ.get("BACKUP_ENCRYPTION_KEY", "").strip()
    if not raw:
        raise RuntimeError("BACKUP_ENCRYPTION_KEY no esta configurada.")
    key = raw.encode("ascii")
    Fernet(key)
    return key


def export_database() -> dict:
    scope = get_session()
    session = next(scope)
    try:
        tables = {}
        for table_name, model in MODEL_TABLES:
            columns = [column.key for column in inspect(model).columns]
            rows = []
            for item in session.query(model).all():
                rows.append({column: _json_value(getattr(item, column)) for column in columns})
            tables[table_name] = rows
        return {
            "schemaVersion": 1,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "tables": tables,
        }
    finally:
        session.close()
        scope.close()


def encrypt_backup(payload: dict) -> tuple[bytes, str]:
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    checksum = hashlib.sha256(canonical).hexdigest()
    envelope = json.dumps(
        {"checksum": checksum, "payload": payload},
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    encrypted = Fernet(_backup_key()).encrypt(gzip.compress(envelope, compresslevel=9))
    return encrypted, checksum


def decrypt_backup(encrypted: bytes) -> tuple[dict, str]:
    envelope = json.loads(gzip.decompress(Fernet(_backup_key()).decrypt(encrypted)))
    payload = envelope["payload"]
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    checksum = hashlib.sha256(canonical).hexdigest()
    if checksum != envelope.get("checksum"):
        raise RuntimeError("El checksum del respaldo no coincide.")
    return payload, checksum


def _firebase_bucket():
    bucket_name = os.environ.get("FIREBASE_BACKUP_BUCKET", "").strip().removeprefix("gs://")
    if not bucket_name:
        raise RuntimeError("FIREBASE_BACKUP_BUCKET no esta configurado.")
    initialize_firebase_admin()
    return storage.bucket(bucket_name)


def _backup_dir() -> str:
    """Directorio de respaldos en disco (volumen persistente de Railway). Si está
    definido, los respaldos se guardan aquí EN VEZ de Firebase Storage (que exige
    el plan Blaze). Tiene prioridad sobre FIREBASE_BACKUP_BUCKET."""
    return os.environ.get("BACKUP_DIR", "").strip()


def _local_backups(directory: str) -> list:
    """Archivos .bpbackup del directorio, del más antiguo al más reciente."""
    base = Path(directory)
    if not base.exists():
        return []
    return sorted(base.glob("*.bpbackup"), key=lambda f: f.stat().st_mtime)


def create_backup(*, force: bool = False, upload: bool = True, output_dir: str | None = None) -> dict:
    backup_dir = _backup_dir()
    use_local = bool(backup_dir) and upload
    # Firebase solo si NO hay BACKUP_DIR (el volumen de Railway tiene prioridad).
    bucket = _firebase_bucket() if (upload and not backup_dir) else None
    interval_hours = max(1, int(os.environ.get("BACKUP_INTERVAL_HOURS", "24")))
    retention = max(2, int(os.environ.get("BACKUP_RETENTION_COUNT", "30")))

    if not force and (use_local or bucket):
        latest_time = latest_name = None
        if use_local:
            files = _local_backups(backup_dir)
            if files:
                latest_time = datetime.fromtimestamp(files[-1].stat().st_mtime, timezone.utc)
                latest_name = files[-1].name
        elif bucket:
            latest = max(bucket.list_blobs(prefix=BACKUP_PREFIX), key=lambda blob: blob.time_created, default=None)
            if latest:
                latest_time, latest_name = latest.time_created, latest.name
        if latest_time and (datetime.now(timezone.utc) - latest_time).total_seconds() < interval_hours * 3600:
            return {"skipped": True, "reason": "recent_backup", "name": latest_name}

    payload = export_database()
    encrypted, checksum = encrypt_backup(payload)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    filename = f"blackportfolio-{timestamp}-{checksum[:12]}.bpbackup"

    local_path = None
    if output_dir:
        target = Path(output_dir)
        target.mkdir(parents=True, exist_ok=True)
        local_path = target / filename
        local_path.write_bytes(encrypted)

    remote_name = None
    if use_local:
        base = Path(backup_dir)
        base.mkdir(parents=True, exist_ok=True)
        dest = base / filename
        dest.write_bytes(encrypted)
        remote_name = str(dest)
        files = sorted(_local_backups(backup_dir), key=lambda f: f.stat().st_mtime, reverse=True)
        for old in files[retention:]:
            old.unlink(missing_ok=True)
    elif bucket:
        remote_name = BACKUP_PREFIX + filename
        blob = bucket.blob(remote_name)
        blob.metadata = {"sha256": checksum, "schemaVersion": str(payload["schemaVersion"])}
        blob.upload_from_string(encrypted, content_type="application/octet-stream")
        blobs = sorted(bucket.list_blobs(prefix=BACKUP_PREFIX), key=lambda item: item.time_created, reverse=True)
        for old_blob in blobs[retention:]:
            old_blob.delete()

    return {
        "skipped": False,
        "checksum": checksum,
        "localPath": str(local_path) if local_path else None,
        "remoteName": remote_name,
        "tables": {name: len(rows) for name, rows in payload["tables"].items()},
    }


def start_backup_scheduler() -> bool:
    if not os.environ.get("BACKUP_ENCRYPTION_KEY") or not (
        os.environ.get("FIREBASE_BACKUP_BUCKET") or os.environ.get("BACKUP_DIR")
    ):
        LOGGER.warning(
            "Backups desactivados: faltan BACKUP_ENCRYPTION_KEY o un destino "
            "(BACKUP_DIR para volumen Railway, o FIREBASE_BACKUP_BUCKET)."
        )
        return False

    def worker():
        while True:
            try:
                LOGGER.info("Resultado de respaldo: %s", create_backup())
            except Exception as exc:
                # No dejar que el respaldo falle en silencio: además del log,
                # reportar a Sentry si está configurado (p. ej. bucket inexistente).
                LOGGER.exception("No se pudo crear el respaldo cifrado.")
                if os.environ.get("SENTRY_DSN"):
                    try:
                        import sentry_sdk
                        sentry_sdk.capture_exception(exc)
                    except Exception:
                        pass
            threading.Event().wait(max(1, int(os.environ.get("BACKUP_INTERVAL_HOURS", "24"))) * 3600)

    threading.Thread(target=worker, name="postgres-backup", daemon=True).start()
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Crea un respaldo cifrado de PostgreSQL.")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--no-upload", action="store_true")
    parser.add_argument("--output-dir", default="backups")
    args = parser.parse_args()
    print(json.dumps(create_backup(force=args.force, upload=not args.no_upload, output_dir=args.output_dir), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
