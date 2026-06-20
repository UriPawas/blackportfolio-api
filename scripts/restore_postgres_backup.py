import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backup_service import MODEL_TABLES, decrypt_backup
from persistence import Base


def database_url(raw: str) -> str:
    if raw.startswith("postgres://"):
        return "postgresql+psycopg://" + raw[len("postgres://"):]
    if raw.startswith("postgresql://"):
        return "postgresql+psycopg://" + raw[len("postgresql://"):]
    return raw


def decode_value(value):
    if isinstance(value, dict) and set(value) == {"__datetime__"}:
        return datetime.fromisoformat(value["__datetime__"])
    return value


def main() -> int:
    parser = argparse.ArgumentParser(description="Valida o restaura un respaldo cifrado de BlackPortfolio.")
    parser.add_argument("backup")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--confirm", default="")
    parser.add_argument("--allow-production", action="store_true")
    args = parser.parse_args()

    payload, checksum = decrypt_backup(Path(args.backup).read_bytes())
    counts = {name: len(payload["tables"].get(name, [])) for name, _ in MODEL_TABLES}
    print(json.dumps({"checksum": checksum, "schemaVersion": payload["schemaVersion"], "tables": counts}, indent=2))
    if not args.apply:
        print("Validacion terminada; no se escribio ningun dato.")
        return 0
    if args.confirm != checksum[:12]:
        raise RuntimeError(f"Usa --confirm {checksum[:12]} para aplicar este respaldo.")

    raw_target = os.environ.get("RESTORE_DATABASE_URL", "").strip()
    if not raw_target:
        raise RuntimeError("RESTORE_DATABASE_URL es obligatoria.")
    source = os.environ.get("DATABASE_URL", "").strip()
    if source and database_url(source) == database_url(raw_target) and not args.allow_production:
        raise RuntimeError("La restauracion sobre DATABASE_URL requiere --allow-production.")

    engine = create_engine(database_url(raw_target), pool_pre_ping=True)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)
    with Session() as session:
        for table_name, model in MODEL_TABLES:
            for row in payload["tables"].get(table_name, []):
                session.merge(model(**{key: decode_value(value) for key, value in row.items()}))
        session.commit()
    print("Restauracion aplicada y confirmada.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
