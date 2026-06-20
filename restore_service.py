"""Restaura (o sólo valida) un respaldo cifrado creado por backup_service.py.

Por defecto NUNCA toca PostgreSQL: descifra el .bpbackup, verifica el checksum
y reporta cuántas filas trae cada tabla. Sólo con --apply se escriben los datos,
y se exige --yes para confirmar que se sobreescribirá producción.

Uso:
  python restore_service.py --file backups/blackportfolio-...bpbackup      # sólo valida
  python restore_service.py --latest                                       # baja el más reciente del bucket y valida
  python restore_service.py --file <archivo> --apply --yes                 # restaura a PostgreSQL
"""
import argparse
import json
from datetime import datetime

from backup_service import _firebase_bucket, decrypt_backup, BACKUP_PREFIX, MODEL_TABLES
from persistence import create_tables, get_session


def _revive_value(value):
    if isinstance(value, dict) and "__datetime__" in value:
        return datetime.fromisoformat(value["__datetime__"])
    return value


def load_encrypted(*, file: str | None, latest: bool, remote: str | None) -> bytes:
    if file:
        with open(file, "rb") as handle:
            return handle.read()
    bucket = _firebase_bucket()
    if remote:
        name = remote if remote.startswith(BACKUP_PREFIX) else BACKUP_PREFIX + remote
        return bucket.blob(name).download_as_bytes()
    if latest:
        blobs = list(bucket.list_blobs(prefix=BACKUP_PREFIX))
        if not blobs:
            raise RuntimeError("No hay respaldos en el bucket.")
        newest = max(blobs, key=lambda blob: blob.time_created)
        print(f"Respaldo seleccionado: {newest.name}")
        return newest.download_as_bytes()
    raise RuntimeError("Indica --file, --latest o --remote.")


def restore(payload: dict) -> dict:
    create_tables()
    scope = get_session()
    session = next(scope)
    applied = {}
    try:
        models = dict(MODEL_TABLES)
        # Orden de inserción: usuarios primero (FK de portfolio_snapshots).
        for table_name, model in MODEL_TABLES:
            rows = payload["tables"].get(table_name, [])
            for row in rows:
                session.merge(model(**{k: _revive_value(v) for k, v in row.items()}))
            applied[table_name] = len(rows)
        session.commit()
        return applied
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
        scope.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Valida o restaura un respaldo cifrado.")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--file", help="Ruta local del archivo .bpbackup")
    source.add_argument("--latest", action="store_true", help="Usa el respaldo más reciente del bucket")
    source.add_argument("--remote", help="Nombre del respaldo en el bucket")
    parser.add_argument("--apply", action="store_true", help="Escribe los datos en PostgreSQL (por defecto sólo valida)")
    parser.add_argument("--yes", action="store_true", help="Confirma la sobreescritura de producción")
    args = parser.parse_args()

    encrypted = load_encrypted(file=args.file, latest=args.latest, remote=args.remote)
    payload, checksum = decrypt_backup(encrypted)
    counts = {name: len(rows) for name, rows in payload["tables"].items()}
    print(json.dumps({
        "checksum": checksum,
        "schemaVersion": payload.get("schemaVersion"),
        "createdAt": payload.get("createdAt"),
        "tables": counts,
        "valid": True,
    }, indent=2))

    if not args.apply:
        print("\nValidación correcta. Para restaurar a PostgreSQL: --apply --yes")
        return 0
    if not args.yes:
        print("\n--apply requiere --yes para sobreescribir producción. Cancelado.")
        return 1

    applied = restore(payload)
    print("\nRestauración aplicada:")
    print(json.dumps(applied, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
