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


def create_backup(*, force: bool = False, upload: bool = True, output_dir: str | None = None) -> dict:
    bucket = _firebase_bucket() if upload else None
    interval_hours = max(1, int(os.environ.get("BACKUP_INTERVAL_HOURS", "24")))
    if bucket and not force:
        latest = max(bucket.list_blobs(prefix=BACKUP_PREFIX), key=lambda blob: blob.time_created, default=None)
        if latest:
            age = datetime.now(timezone.utc) - latest.time_created
            if age.total_seconds() < interval_hours * 3600:
                return {"skipped": True, "reason": "recent_backup", "name": latest.name}

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
    if bucket:
        remote_name = BACKUP_PREFIX + filename
        blob = bucket.blob(remote_name)
        blob.metadata = {"sha256": checksum, "schemaVersion": str(payload["schemaVersion"])}
        blob.upload_from_string(encrypted, content_type="application/octet-stream")
        retention = max(2, int(os.environ.get("BACKUP_RETENTION_COUNT", "30")))
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
    if not os.environ.get("BACKUP_ENCRYPTION_KEY") or not os.environ.get("FIREBASE_BACKUP_BUCKET"):
        LOGGER.warning("Backups desactivados: faltan BACKUP_ENCRYPTION_KEY o FIREBASE_BACKUP_BUCKET.")
        return False

    def worker():
        while True:
            try:
                LOGGER.info("Resultado de respaldo: %s", create_backup())
            except Exception:
                LOGGER.exception("No se pudo crear el respaldo cifrado.")
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
