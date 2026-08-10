"""Recupera el portafolio de UN usuario desde los respaldos cifrados.

Existe porque `restore_service.py --apply` sobreescribe TODAS las tablas de
producción: demasiado brusco para devolver unas posiciones perdidas. Esto opera
sobre un solo renglón de portfolio_snapshots y por defecto no escribe nada.

    # 1) Ver qué respaldos hay y qué posiciones tiene cada uno para ese correo
    railway run python scripts/recover_portfolio.py tu@correo.com --list

    # 2) Ver el detalle de un respaldo concreto
    railway run python scripts/recover_portfolio.py tu@correo.com --file <ruta.bpbackup>

    # 3) Guardar ese estado en un JSON local (sin tocar la base)
    railway run python scripts/recover_portfolio.py tu@correo.com --file <ruta> --dump rescate.json

    # 4) Escribirlo de vuelta en PostgreSQL (sólo ese usuario)
    railway run python scripts/recover_portfolio.py tu@correo.com --file <ruta> --apply --yes

Requiere DATABASE_URL y BACKUP_ENCRYPTION_KEY (por eso corre con `railway run`).
"""
import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backup_service import _backup_dir, _local_backups, decrypt_backup
from persistence import PortfolioSnapshot, get_session, portfolio_checksum, utc_now


def _rows(payload, table):
    return payload["tables"].get(table, [])


def _uid_for_email(payload, email):
    target = email.strip().lower()
    for row in _rows(payload, "app_users"):
        if (row.get("email") or "").strip().lower() == target:
            return row.get("firebase_uid")
    return None


def _snapshot_for(payload, uid):
    for row in _rows(payload, "portfolio_snapshots"):
        if row.get("firebase_uid") == uid:
            return row
    return None


def _describe(data):
    """Resumen legible: por portafolio, sus tickers y cuántas transacciones trae."""
    out = []
    for p in data or []:
        positions = p.get("positions") or []
        out.append({
            "id": p.get("id"),
            "nombre": p.get("name"),
            "posiciones": len(positions),
            "tickers": sorted({str(x.get("ticker") or x.get("symbol") or "?") for x in positions}),
            "transacciones": len(p.get("transactions") or []),
            "efectivo": p.get("cashBalance"),
        })
    return out


def _load(path):
    payload, _ = decrypt_backup(Path(path).read_bytes())
    return payload


def cmd_list(email):
    backup_dir = _backup_dir()
    if not backup_dir:
        print("No hay BACKUP_DIR configurado; no puedo listar respaldos locales.")
        return 1
    files = _local_backups(backup_dir)
    if not files:
        print(f"No hay respaldos en {backup_dir}.")
        return 1
    print(f"{len(files)} respaldo(s) en {backup_dir}\n")
    # Del más reciente al más viejo: el estado bueno suele estar justo antes de la pérdida.
    for f in reversed(files):
        try:
            payload = _load(f)
        except Exception as exc:
            print(f"{f.name}: NO SE PUDO LEER ({exc})")
            continue
        uid = _uid_for_email(payload, email)
        if not uid:
            print(f"{f.name}: el correo no aparece en este respaldo")
            continue
        snapshot = _snapshot_for(payload, uid)
        if not snapshot:
            print(f"{f.name}: sin portafolios guardados")
            continue
        resumen = _describe(snapshot.get("data"))
        print(f"{f.name}  (creado {payload.get('createdAt')}, version {snapshot.get('version')})")
        for r in resumen:
            print(f"    - {r['nombre']}: {r['posiciones']} posiciones {r['tickers']}, "
                  f"{r['transacciones']} transacciones, efectivo {r['efectivo']}")
        print()
    return 0


def cmd_inspect(email, file, dump, apply_it, yes):
    payload = _load(file)
    uid = _uid_for_email(payload, email)
    if not uid:
        print(f"El correo {email} no está en ese respaldo.")
        return 1
    snapshot = _snapshot_for(payload, uid)
    if not snapshot:
        print(f"{email} no tenía portafolios en ese respaldo.")
        return 1
    data = snapshot.get("data")
    print(json.dumps({
        "respaldo": payload.get("createdAt"),
        "uid": uid,
        "version": snapshot.get("version"),
        "portafolios": _describe(data),
    }, indent=2, ensure_ascii=False))

    if dump:
        Path(dump).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\nEstado completo escrito en {dump}")

    if not apply_it:
        print("\nSólo lectura. Para escribirlo en PostgreSQL: --apply --yes")
        return 0
    if not yes:
        print("\n--apply requiere --yes. Cancelado.")
        return 1

    scope = get_session()
    session = next(scope)
    try:
        current = session.get(PortfolioSnapshot, uid)
        if current is None:
            print("Ese usuario no tiene renglón en portfolio_snapshots; no lo creo desde aquí.")
            return 1
        # Se deja rastro del estado que se reemplaza, por si hay que volver atrás.
        previo = Path(f"portfolio-previo-{uid}.json")
        previo.write_text(json.dumps(current.data, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\nEstado ANTERIOR respaldado en {previo}")
        current.data = data
        current.checksum = portfolio_checksum(data)
        current.version += 1  # avanza la versión: las pestañas viejas recibirán 409
        current.source = "manual_recovery"
        current.updated_at = utc_now()
        session.commit()
        print(f"Restaurado. Nueva version: {current.version}")
        print("Recarga la app (Ctrl+Shift+R) y cierra las demas sesiones abiertas.")
        return 0
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
        scope.close()


def main():
    parser = argparse.ArgumentParser(description="Recupera el portafolio de un solo usuario desde un respaldo.")
    parser.add_argument("email", help="Correo de la cuenta a recuperar")
    parser.add_argument("--list", action="store_true", help="Lista los respaldos y qué tenía el usuario en cada uno")
    parser.add_argument("--file", help="Respaldo .bpbackup a inspeccionar")
    parser.add_argument("--dump", help="Escribe el estado completo en este JSON")
    parser.add_argument("--apply", action="store_true", help="Escribe el estado en PostgreSQL (sólo ese usuario)")
    parser.add_argument("--yes", action="store_true", help="Confirma la escritura")
    args = parser.parse_args()

    if not os.environ.get("BACKUP_ENCRYPTION_KEY"):
        print("Falta BACKUP_ENCRYPTION_KEY. Corre esto con `railway run ...`.")
        return 1
    if args.list:
        return cmd_list(args.email)
    if not args.file:
        parser.error("Indica --list o --file.")
    return cmd_inspect(args.email, args.file, args.dump, args.apply, args.yes)


if __name__ == "__main__":
    raise SystemExit(main())
