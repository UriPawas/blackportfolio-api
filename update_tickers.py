"""Refresca tickers.json con precios actuales desde Yahoo Finance.

Uso:
    python update_tickers.py

Ejecutar diariamente (manual o via cron/Task Scheduler) para mantener los
precios del ticker bar del index.html actualizados.
"""
import json
import os
import sys
from datetime import datetime, timezone

import requests

SYMBOLS = [
    "^GSPC", "^DJI", "^IXIC",
    "AAPL", "NVDA", "MSFT", "TSLA",
    "BTC-USD", "ETH-USD",
    "EURUSD=X", "GBPUSD=X", "USDJPY=X",
    "GC=F", "CL=F",
    "^FTSE", "^N225", "^HSI", "EWZ",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    )
}

BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"


def fetch_quote(symbol: str) -> dict | None:
    url = BASE_URL.format(symbol=symbol)
    try:
        res = requests.get(
            url,
            params={"range": "5d", "interval": "1d", "includePrePost": "false"},
            headers=HEADERS,
            timeout=10,
        )
        res.raise_for_status()
        meta = res.json()["chart"]["result"][0]["meta"]
        price = meta.get("regularMarketPrice")
        prev = meta.get("previousClose") or meta.get("chartPreviousClose")
        if price is None or prev is None:
            return None
        return {"symbol": symbol, "price": price, "previousClose": prev}
    except Exception as exc:
        print(f"  ✗ {symbol}: {exc}", file=sys.stderr)
        return None


def main() -> int:
    print(f"Actualizando {len(SYMBOLS)} tickers...")
    tickers = []
    failed = []
    for sym in SYMBOLS:
        data = fetch_quote(sym)
        if data:
            change_pct = ((data["price"] - data["previousClose"]) / data["previousClose"]) * 100
            arrow = "▲" if change_pct >= 0 else "▼"
            print(f"  ✓ {sym:<10} {data['price']:>12.2f}  {arrow} {abs(change_pct):.2f}%")
            tickers.append(data)
        else:
            failed.append(sym)

    if not tickers:
        print("ERROR: no se obtuvo ningún ticker", file=sys.stderr)
        return 1

    payload = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "tickers": tickers,
    }

    base = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(base, "tickers.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    js_path = os.path.join(base, "tickers-data.js")
    with open(js_path, "w", encoding="utf-8") as f:
        f.write("// Auto-generado por update_tickers.py — no editar manualmente\n")
        f.write(f"window.TICKERS_DATA = {json.dumps(payload, ensure_ascii=False)};\n")

    print(f"\n✓ {len(tickers)}/{len(SYMBOLS)} tickers guardados en {out_path}")
    if failed:
        print(f"⚠ Fallaron: {', '.join(failed)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
