from fastapi import FastAPI, HTTPException, Request, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
from collections import OrderedDict
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from persistence import (
    install_persistence, verify_firebase_user, require_2fa, get_session,
    AppUser, PortfolioSnapshot, SecurityActivity, BillingEvent, Feedback,
    BetaAllowlist, BETA_CLOSED,
    normalize_plan, require_plan, upsert_user, utc_now, limiter,
)
import requests
import yfinance as yf
import numpy as np
import pandas as pd
import os
import json
import secrets
import string
import stripe
import time as _time_module
from backup_service import start_backup_scheduler

# ── HTTP session singleton (connection pool reutilizado entre requests) ────────
_HTTP_SESSION = requests.Session()
_HTTP_SESSION.headers.update({"User-Agent": "Mozilla/5.0"})

# ── LRU cache con TTL ─────────────────────────────────────────────────────────
class _TTLCache:
    def __init__(self, maxsize: int, ttl: int):
        self._store: OrderedDict = OrderedDict()
        self._maxsize = maxsize
        self._ttl = ttl

    def get(self, key):
        entry = self._store.get(key)
        if not entry:
            return None
        if _time_module.time() - entry["ts"] > self._ttl:
            self._store.pop(key, None)
            return None
        self._store.move_to_end(key)
        return entry["data"]

    def set(self, key, data):
        if key in self._store:
            self._store.move_to_end(key)
        elif len(self._store) >= self._maxsize:
            self._store.popitem(last=False)
        self._store[key] = {"ts": _time_module.time(), "data": data}

    def purge_expired(self):
        now = _time_module.time()
        expired = [k for k, v in self._store.items() if now - v["ts"] > self._ttl]
        for k in expired:
            self._store.pop(k, None)

_CHART_CACHE          = _TTLCache(maxsize=100, ttl=300)    # 5 min
_SEASONALITY_CACHE_V2 = _TTLCache(maxsize=50,  ttl=86400) # 24 h
_CALENDAR_CACHE_V2    = _TTLCache(maxsize=30,  ttl=3600)  # 1 h
_TIIE_CACHE_V2        = _TTLCache(maxsize=1,   ttl=86400) # 24 h
_SEARCH_CACHE         = _TTLCache(maxsize=200, ttl=120)   # 2 min — autocomplete
_INFO_CACHE           = _TTLCache(maxsize=100, ttl=900)   # 15 min — ticker info
_FINANCIALS_CACHE     = _TTLCache(maxsize=50,  ttl=86400) # 24 h — datos trimestrales
_HOLDINGS_CACHE       = _TTLCache(maxsize=50,  ttl=86400) # 24 h — composición fondos
_DIVIDENDS_CACHE      = _TTLCache(maxsize=100, ttl=3600)  # 1 h
_NEWS_CACHE           = _TTLCache(maxsize=100, ttl=900)   # 15 min
_BINANCE_PRICE_CACHE  = _TTLCache(maxsize=200, ttl=30)    # 30 s  — precios crypto

_ALL_CACHES = [
    _CHART_CACHE, _SEASONALITY_CACHE_V2, _CALENDAR_CACHE_V2, _TIIE_CACHE_V2,
    _SEARCH_CACHE, _INFO_CACHE, _FINANCIALS_CACHE, _HOLDINGS_CACHE,
    _DIVIDENDS_CACHE, _NEWS_CACHE, _BINANCE_PRICE_CACHE,
]

def _cache_cleanup_loop():
    import threading
    def _run():
        while True:
            _time_module.sleep(600)  # cada 10 minutos
            for c in _ALL_CACHES:
                c.purge_expired()
    t = threading.Thread(target=_run, daemon=True)
    t.start()

_cache_cleanup_loop()

# ── Crypto routing: Binance.US (velas finas + volumen) con CoinGecko de respaldo
#    Binance.com da HTTP 451 desde IPs de Railway/US; Binance.US sí las permite. ─

_CRYPTO_BASE_SYMBOLS = {
    "BTC","ETH","BNB","ADA","XRP","SOL","DOT","DOGE","AVAX","MATIC","LINK",
    "UNI","ATOM","LTC","BCH","ALGO","VET","TRX","ETC","XLM","AAVE","EOS",
    "CAKE","NEO","MKR","COMP","SAND","MANA","ENJ","EGLD","NEAR","FTM","HBAR",
    "GRT","RUNE","FLOW","XTZ","ZIL","DASH","ZEC","BAT","SNX","YFI","SUSHI",
    "CRV","RNDR","INJ","APE","LDO","ARB","OP","PEPE","SHIB","FLOKI","WIF",
    "TON","SUI","SEI","TIA","PYTH","JUP","BOME","NOT","TAO","BONK","BRETT",
}

# Símbolo → ID de CoinGecko
_COINGECKO_ID = {
    "BTC":"bitcoin","ETH":"ethereum","BNB":"binancecoin","ADA":"cardano",
    "XRP":"ripple","SOL":"solana","DOT":"polkadot","DOGE":"dogecoin",
    "AVAX":"avalanche-2","MATIC":"matic-network","LINK":"chainlink",
    "UNI":"uniswap","ATOM":"cosmos","LTC":"litecoin","BCH":"bitcoin-cash",
    "ALGO":"algorand","VET":"vechain","TRX":"tron","ETC":"ethereum-classic",
    "XLM":"stellar","AAVE":"aave","EOS":"eos","NEO":"neo","MKR":"maker",
    "COMP":"compound-governance-token","SAND":"the-sandbox","MANA":"decentraland",
    "ENJ":"enjincoin","EGLD":"elrond-erd-2","NEAR":"near","FTM":"fantom",
    "HBAR":"hedera-hashgraph","GRT":"the-graph","RUNE":"thorchain","FLOW":"flow",
    "XTZ":"tezos","ZIL":"zilliqa","DASH":"dash","ZEC":"zcash",
    "BAT":"basic-attention-token","SNX":"havven","YFI":"yearn-finance",
    "SUSHI":"sushi","CRV":"curve-dao-token","RNDR":"render-token",
    "INJ":"injective-protocol","APE":"apecoin","LDO":"lido-dao",
    "ARB":"arbitrum","OP":"optimism","PEPE":"pepe","SHIB":"shiba-inu",
    "FLOKI":"floki","WIF":"dogwifcoin","TON":"the-open-network","SUI":"sui",
    "SEI":"sei-network","TIA":"celestia","PYTH":"pyth-network",
    "JUP":"jupiter-exchange-solana","TAO":"bittensor","BONK":"bonk",
    "CAKE":"pancakeswap-token",
}

# range de Yahoo Finance → parámetro days de CoinGecko (free tier: max=365)
_RANGE_TO_CG_DAYS = {
    "1d":1,"5d":7,"1mo":30,"3mo":90,"6mo":180,
    "1y":365,"2y":365,"5y":365,"10y":365,"30y":365,"max":365,
}

def _is_crypto(symbol: str) -> bool:
    base = symbol.upper().split("-")[0]
    return base in _CRYPTO_BASE_SYMBOLS

def _crypto_base(symbol: str) -> str:
    return symbol.upper().split("-")[0]

def _coingecko_ohlc(symbol: str, yf_range: str) -> list:
    """Devuelve lista de velas [[ts_ms, o, h, l, c], ...] desde CoinGecko."""
    cg_id = _COINGECKO_ID.get(_crypto_base(symbol))
    if not cg_id:
        return []
    days = _RANGE_TO_CG_DAYS.get(yf_range, 365)
    res = _HTTP_SESSION.get(
        f"https://api.coingecko.com/api/v3/coins/{cg_id}/ohlc",
        params={"vs_currency": "usd", "days": days},
        timeout=12,
    )
    res.raise_for_status()
    return res.json()

def _coingecko_ohlc_to_yahoo(candles: list, symbol: str) -> dict:
    timestamps, opens, highs, lows, closes = [], [], [], [], []
    for c in candles:
        timestamps.append(int(c[0]) // 1000)
        opens.append(float(c[1]))
        highs.append(float(c[2]))
        lows.append(float(c[3]))
        closes.append(float(c[4]))
    last = closes[-1] if closes else 0
    prev = closes[-2] if len(closes) >= 2 else last
    return {
        "chart": {
            "result": [{
                "meta": {
                    "symbol": symbol.upper(),
                    "shortName": symbol.upper(),
                    "longName": f"{symbol.upper()} / USD",
                    "currency": "USD",
                    "fullExchangeName": "CoinGecko",
                    "exchangeName": "CoinGecko",
                    "instrumentType": "CRYPTOCURRENCY",
                    "regularMarketPrice": last,
                    "previousClose": prev,
                    "chartPreviousClose": prev,
                },
                "timestamp": timestamps,
                "indicators": {
                    "quote": [{"open": opens, "high": highs,
                               "low": lows, "close": closes,
                               "volume": [None] * len(closes)}]
                },
            }],
            "error": None,
        }
    }

# range de Yahoo Finance → (intervalo Binance, nº de velas). limit máx Binance = 1000.
_RANGE_TO_BINANCE = {
    "1d":  ("5m", 288),   "5d":  ("15m", 480),  "1mo": ("1h", 720),
    "3mo": ("4h", 540),   "6mo": ("12h", 360),  "1y":  ("1d", 365),
    "2y":  ("1d", 730),   "5y":  ("1w", 260),   "10y": ("1w", 520),
    "30y": ("1M", 360),   "max": ("1M", 1000),
}

def _binanceus_klines(symbol: str, yf_range: str) -> list:
    """Velas [openTime, O, H, L, C, volume, ...] desde Binance.US (IPs US permitidas)."""
    interval, limit = _RANGE_TO_BINANCE.get(yf_range, ("1d", 365))
    pair = f"{_crypto_base(symbol)}USDT"
    res = _HTTP_SESSION.get(
        "https://api.binance.us/api/v3/klines",
        params={"symbol": pair, "interval": interval, "limit": limit},
        timeout=12,
    )
    res.raise_for_status()
    return res.json()

def _binance_klines_to_yahoo(klines: list, symbol: str) -> dict:
    timestamps, opens, highs, lows, closes, volumes = [], [], [], [], [], []
    for k in klines:
        timestamps.append(int(k[0]) // 1000)
        opens.append(float(k[1]))
        highs.append(float(k[2]))
        lows.append(float(k[3]))
        closes.append(float(k[4]))
        volumes.append(float(k[5]))
    last = closes[-1] if closes else 0
    prev = closes[-2] if len(closes) >= 2 else last
    return {
        "chart": {
            "result": [{
                "meta": {
                    "symbol": symbol.upper(),
                    "shortName": symbol.upper(),
                    "longName": f"{symbol.upper()} / USD",
                    "currency": "USD",
                    "fullExchangeName": "Binance",
                    "exchangeName": "Binance",
                    "instrumentType": "CRYPTOCURRENCY",
                    "regularMarketPrice": last,
                    "previousClose": prev,
                    "chartPreviousClose": prev,
                },
                "timestamp": timestamps,
                "indicators": {
                    "quote": [{"open": opens, "high": highs,
                               "low": lows, "close": closes,
                               "volume": volumes}]
                },
            }],
            "error": None,
        }
    }

def _crypto_price_and_prev(symbol: str):
    """Precio + prevClose desde Binance.US (24h ticker). CoinGecko de respaldo. Cacheado 30 s."""
    cached = _BINANCE_PRICE_CACHE.get(symbol)
    if cached:
        return cached["price"], cached["prev"]
    pair = f"{_crypto_base(symbol)}USDT"
    try:
        res = _HTTP_SESSION.get(
            "https://api.binance.us/api/v3/ticker/24hr",
            params={"symbol": pair},
            timeout=8,
        )
        res.raise_for_status()
        d = res.json()
        price = float(d["lastPrice"])
        prev  = float(d["openPrice"])   # precio de hace 24 h
        _BINANCE_PRICE_CACHE.set(symbol, {"price": price, "prev": prev})
        return price, prev
    except Exception:
        return _coingecko_price_and_prev(symbol)

def _coingecko_price_and_prev(symbol: str):
    """Respaldo: precio + prevClose de CoinGecko."""
    cg_id = _COINGECKO_ID.get(_crypto_base(symbol))
    if not cg_id:
        return None, None
    try:
        res = _HTTP_SESSION.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": cg_id, "vs_currencies": "usd", "include_24hr_change": "true"},
            timeout=8,
        )
        res.raise_for_status()
        d = res.json().get(cg_id, {})
        price = float(d.get("usd", 0))
        chg   = float(d.get("usd_24h_change", 0))
        denom = 1 + chg / 100
        prev  = round(price / denom, 8) if denom else price
        _BINANCE_PRICE_CACHE.set(symbol, {"price": price, "prev": prev})
        return price, prev
    except Exception:
        return None, None

def _crypto_prices_batch(symbols: list) -> dict:
    """Batch de precios crypto desde Binance.US (24h ticker). CoinGecko de respaldo."""
    if not symbols:
        return {}
    pair_to_sym = {f"{_crypto_base(s)}USDT": s for s in symbols}
    try:
        res = _HTTP_SESSION.get(
            "https://api.binance.us/api/v3/ticker/24hr",
            params={"symbols": json.dumps(list(pair_to_sym.keys()), separators=(",", ":"))},
            timeout=10,
        )
        res.raise_for_status()
        result = {}
        for d in res.json():
            sym = pair_to_sym.get(d.get("symbol"))
            if not sym:
                continue
            price = float(d["lastPrice"])
            prev  = float(d["openPrice"])
            _BINANCE_PRICE_CACHE.set(sym, {"price": price, "prev": prev})
            result[sym] = {"price": price, "prev": prev}
        # Símbolos que Binance.US no lista → respaldo CoinGecko
        missing = [s for s in symbols if s not in result]
        if missing:
            result.update(_coingecko_prices_batch(missing))
        return result
    except Exception:
        return _coingecko_prices_batch(symbols)

def _coingecko_prices_batch(symbols: list) -> dict:
    """Respaldo: batch de precios crypto desde CoinGecko."""
    sym_to_id = {s: _COINGECKO_ID.get(_crypto_base(s)) for s in symbols}
    sym_to_id = {s: cid for s, cid in sym_to_id.items() if cid}
    if not sym_to_id:
        return {}
    id_to_sym = {cid: s for s, cid in sym_to_id.items()}
    try:
        res = _HTTP_SESSION.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": ",".join(set(sym_to_id.values())),
                    "vs_currencies": "usd", "include_24hr_change": "true"},
            timeout=10,
        )
        res.raise_for_status()
        result = {}
        for cg_id, sym in id_to_sym.items():
            d = res.json().get(cg_id, {})
            if "usd" not in d:
                continue
            price = float(d["usd"])
            chg   = float(d.get("usd_24h_change", 0))
            denom = 1 + chg / 100
            prev  = round(price / denom, 8) if denom else price
            _BINANCE_PRICE_CACHE.set(sym, {"price": price, "prev": prev})
            result[sym] = {"price": price, "prev": prev}
        return result
    except Exception:
        return {}

# ─────────────────────────────────────────────────────────────────────────────

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_BASE_URL = os.environ.get("FRONTEND_BASE_URL", "https://portify-6467f.web.app").rstrip("/")

PLAN_PRICES = {
    "Explorer":    {"monthly": 0,     "yearly": 0},
    "Investor":    {"monthly": 1900,  "yearly": 18000},
    "Advisor Pro": {"monthly": 5900,  "yearly": 56400},
    "Wealth Desk": {"monthly": 12900, "yearly": 123600},
}

# ── Monitoreo de errores (Sentry) ─────────────────────────────────────────────
# No-op si SENTRY_DSN no está configurado, de modo que local/dev no requiere nada.
_SENTRY_DSN = os.environ.get("SENTRY_DSN", "").strip()
if _SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        sentry_sdk.init(
            dsn=_SENTRY_DSN,
            integrations=[FastApiIntegration()],
            environment=os.environ.get("RAILWAY_ENVIRONMENT", "production"),
            traces_sample_rate=float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
            send_default_pii=False,
        )
    except Exception as _e:
        print(f"Sentry no se inicializó: {_e}")

# ── Errores: loguear el detalle técnico, devolver mensaje genérico ────────────
# Evita filtrar internals (rutas, SQL, nombres de tablas) al cliente. El detalle
# queda en los logs y en Sentry para diagnóstico; el usuario ve algo genérico.
import logging
logger = logging.getLogger("blackportfolio.api")

def _safe_error(exc: Exception, status_code: int = 500,
                public_detail: str = "Error interno del servidor. Intenta de nuevo.") -> HTTPException:
    logger.exception("Error en endpoint: %s", exc)
    if _SENTRY_DSN:
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(exc)
        except Exception:
            pass
    return HTTPException(status_code=status_code, detail=public_detail)

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://portify-6467f.web.app",
        "https://portify-6467f.firebaseapp.com",
    ],
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
)

install_persistence(app)


@app.on_event("startup")
def initialize_backup_scheduler():
    start_backup_scheduler()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/search")
@limiter.limit("60/minute")
def search(request: Request, q: str):
    cached = _SEARCH_CACHE.get(q)
    if cached is not None:
        return cached
    url = f"https://query1.finance.yahoo.com/v1/finance/search?q={q}&quotesCount=8&newsCount=0"
    res = _HTTP_SESSION.get(url)
    data = res.json()

    # Inject Binance crypto matches at the top of results
    q_up = q.upper().strip()
    crypto_hits = sorted(
        b for b in _CRYPTO_BASE_SYMBOLS
        if q_up and (b.startswith(q_up) or q_up in b)
    )[:4]
    if crypto_hits:
        existing_syms = {(r.get("symbol") or "").upper() for r in (data.get("quotes") or [])}
        crypto_quotes = [
            {
                "symbol": f"{b}-USD",
                "shortname": f"{b} USD",
                "longname": f"{b} / USD (Binance)",
                "quoteType": "CRYPTOCURRENCY",
                "exchange": "Binance",
                "typeDisp": "Cripto",
            }
            for b in crypto_hits
            if f"{b}-USD" not in existing_syms
        ]
        if crypto_quotes:
            data = dict(data)
            data["quotes"] = crypto_quotes + (data.get("quotes") or [])

    _SEARCH_CACHE.set(q, data)
    return data

@app.get("/api/info/{symbol}")
@limiter.limit("30/minute")
def info(request: Request, symbol: str):
    cached = _INFO_CACHE.get(symbol)
    if cached is not None:
        return cached
    try:
        data = yf.Ticker(symbol).info
        if not data or "symbol" not in data:
            raise HTTPException(status_code=404, detail="Ticker no encontrado")
        _INFO_CACHE.set(symbol, data)
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise _safe_error(e)

@app.get("/api/financials/{symbol}")
@limiter.limit("20/minute")
def financials(request: Request, symbol: str):
    cached = _FINANCIALS_CACHE.get(symbol)
    if cached is not None:
        return cached
    try:
        t = yf.Ticker(symbol)

        def safe_val(v, kind):
            try:
                if v is None or (isinstance(v, float) and np.isnan(v)):
                    return None
                if kind == "eps":
                    return round(float(v), 2)
                return int(v / 1000)  # convert to thousands
            except Exception:
                return None

        def df_to_rows(df, keys, date_fmt="annual"):
            if df is None or df.empty:
                return None, []
            if date_fmt == "quarterly":
                dates = []
                for c in df.columns:
                    if hasattr(c, "month"):
                        q = (c.month - 1) // 3 + 1
                        dates.append(f"Q{q} {c.year}")
                    else:
                        dates.append(str(c)[:10])
            else:
                dates = [f"{c.month}/{c.day}/{c.year}" if hasattr(c, "month") else str(c)[:10] for c in df.columns]
            rows = []
            for entry in keys:
                label, kind, *candidates = entry
                for key in candidates:
                    if key in df.index:
                        vals = [safe_val(v, kind) for v in df.loc[key].values]
                        rows.append({"label": label, "kind": kind, "values": vals})
                        break
            return dates, rows

        def compute_ttm(df_q, keys):
            """Sum last 4 quarters for income/cashflow rows."""
            if df_q is None or df_q.empty:
                return {}
            q4 = df_q.iloc[:, :4]
            ttm = {}
            for entry in keys:
                label, kind, *candidates = entry
                for key in candidates:
                    if key in q4.index:
                        if kind == "eps":
                            ttm[label] = round(float(q4.loc[key].mean(skipna=True)), 2) if kind == "eps" else None
                        else:
                            s = q4.loc[key].dropna()
                            ttm[label] = int(s.sum() / 1000) if len(s) else None
                        break
            return ttm

        def build_section(annual_df, quarterly_df, keys, use_ttm=True, ttm_mode="sum"):
            dates, rows = df_to_rows(annual_df, keys, "annual")

            # Build quarterly section independently
            q_dates, q_rows = df_to_rows(quarterly_df, keys, "quarterly")
            quarterly_section = {"dates": q_dates or [], "rows": q_rows or []}

            if dates is None:
                return {"dates": [], "rows": [], "quarterly": quarterly_section}

            if use_ttm and quarterly_df is not None and not quarterly_df.empty:
                ttm_map = {}
                q4 = quarterly_df.iloc[:, :4]
                for entry in keys:
                    label, kind, *candidates = entry
                    for key in candidates:
                        if key in q4.index:
                            s = q4.loc[key].dropna()
                            if kind == "eps":
                                ttm_map[label] = round(float(q4.loc[key].mean(skipna=True)), 2)
                            elif ttm_mode == "last":
                                ttm_map[label] = safe_val(q4.loc[key].iloc[0], kind)
                            else:
                                ttm_map[label] = int(s.sum() / 1000) if len(s) else None
                            break

                full_dates = ["TTM"] + dates
                for row in rows:
                    row["values"] = [ttm_map.get(row["label"])] + row["values"]
            else:
                full_dates = dates

            return {"dates": full_dates, "rows": rows, "quarterly": quarterly_section}

        INCOME_KEYS = [
            ("Ingresos Totales",         "num",  "Total Revenue"),
            ("Costo de Ingresos",        "num",  "Cost Of Revenue", "Cost of Revenue"),
            ("Utilidad Bruta",           "num",  "Gross Profit"),
            ("Gastos Operativos",        "num",  "Operating Expense", "Total Operating Expenses"),
            ("Utilidad Operativa",       "num",  "Operating Income", "EBIT"),
            ("Ing. No Operativo Neto",   "num",  "Net Non Operating Interest Income Expense", "Non Operating Income"),
            ("Otros Ingresos/Gastos",    "num",  "Other Income Expense", "Other Non Operating Income Expense", "Other Income Expense Net"),
            ("Ing. antes Impuestos",     "num",  "Pretax Income"),
            ("Provisión Impuestos",      "num",  "Tax Provision"),
            ("Utilidad Neta",            "num",  "Net Income Common Stockholders", "Net Income"),
            ("EPS Básico",               "eps",  "Basic EPS"),
            ("EPS Diluido",              "eps",  "Diluted EPS"),
            ("Acciones Básicas (M)",     "num",  "Basic Average Shares"),
            ("Acciones Diluidas (M)",    "num",  "Diluted Average Shares"),
            ("EBIT",                     "num",  "EBIT"),
            ("EBITDA",                   "num",  "EBITDA"),
        ]
        BALANCE_KEYS = [
            ("Activos Totales",          "num",  "Total Assets"),
            ("Activos Corrientes",       "num",  "Current Assets"),
            ("Efectivo y Equiv.",        "num",  "Cash And Cash Equivalents", "Cash"),
            ("Activos No Corrientes",    "num",  "Total Non Current Assets"),
            ("Pasivos Totales",          "num",  "Total Liabilities Net Minority Interest", "Total Liab"),
            ("Pasivos Corrientes",       "num",  "Current Liabilities"),
            ("Deuda Total",              "num",  "Total Debt"),
            ("Deuda Largo Plazo",        "num",  "Long Term Debt"),
            ("Patrimonio Total",         "num",  "Stockholders Equity", "Total Stockholder Equity"),
            ("Capital Pagado",           "num",  "Common Stock Equity"),
            ("Utilidades Retenidas",     "num",  "Retained Earnings"),
        ]
        CASHFLOW_KEYS = [
            ("Flujo Operativo",          "num",  "Operating Cash Flow", "Total Cash From Operating Activities"),
            ("Depreciación y Amort.",    "num",  "Depreciation And Amortization", "Depreciation"),
            ("Cambio Capital Trabajo",   "num",  "Changes In Working Capital", "Change In Working Capital"),
            ("Flujo de Inversión",       "num",  "Investing Cash Flow", "Total Cash From Investing Activities"),
            ("Cap. Inversión (CapEx)",   "num",  "Capital Expenditure", "Capital Expenditures"),
            ("Flujo Libre",              "num",  "Free Cash Flow"),
            ("Flujo de Financiamiento",  "num",  "Financing Cash Flow", "Total Cash From Financing Activities"),
            ("Dividendos Pagados",       "num",  "Cash Dividends Paid", "Dividends Paid"),
            ("Recompra Acciones",        "num",  "Repurchase Of Capital Stock", "Repurchase of Common Stock"),
        ]

        income  = build_section(t.financials,    t.quarterly_financials,  INCOME_KEYS,   use_ttm=True,  ttm_mode="sum")
        balance = build_section(t.balance_sheet, t.quarterly_balance_sheet, BALANCE_KEYS, use_ttm=True,  ttm_mode="last")
        cashflow= build_section(t.cashflow,      t.quarterly_cashflow,    CASHFLOW_KEYS, use_ttm=True,  ttm_mode="sum")

        result = {"income": income, "balance": balance, "cashflow": cashflow}
        _FINANCIALS_CACHE.set(symbol, result)
        return result
    except Exception as e:
        raise _safe_error(e)

@app.get("/api/holdings/{symbol}")
@limiter.limit("20/minute")
def holdings(request: Request, symbol: str):
    cached = _HOLDINGS_CACHE.get(symbol)
    if cached is not None:
        return cached
    try:
        result = []

        # Primary: yfinance funds_data
        try:
            df = yf.Ticker(symbol).funds_data.top_holdings
            if df is not None and not df.empty:
                pct_col = next((c for c in df.columns if "percent" in c.lower() or "weight" in c.lower()), None)
                name_col = next((c for c in df.columns if "name" in c.lower()), None)
                for idx, row in df.head(10).iterrows():
                    sym = str(idx)
                    name = str(row[name_col]) if name_col else sym
                    weight = float(row[pct_col]) if pct_col else 0.0
                    result.append({"symbol": sym, "name": name, "weight": weight})
        except Exception:
            pass

        # Fallback: yfinance info dict
        if not result:
            try:
                info = yf.Ticker(symbol).info
                for h in (info.get("holdings") or info.get("topHoldings") or [])[:10]:
                    result.append({
                        "symbol": h.get("symbol", ""),
                        "name": h.get("holdingName", h.get("symbol", "")),
                        "weight": float(h.get("holdingPercent", 0))
                    })
            except Exception:
                pass

        out = {"holdings": result}
        _HOLDINGS_CACHE.set(symbol, out)
        return out
    except Exception as e:
        raise _safe_error(e)

def _valid_price(v):
    return v is not None and isinstance(v, (int, float)) and v == v and v > 0

def _price_for_ticker(symbol: str):
    """Return float price or None. Tries fast_info first, then history."""
    p, _ = _price_and_prev_for_ticker(symbol)
    return p

def _price_and_prev_for_ticker(symbol: str):
    """Return (price, prev_close) as floats, or (None, None) on failure."""
    if _is_crypto(symbol):
        p, prev = _crypto_price_and_prev(symbol)
        if p is not None:
            return p, prev
    try:
        t = yf.Ticker(symbol)
        fast = t.fast_info
        p = getattr(fast, "last_price", None) or getattr(fast, "regular_market_price", None)
        prev = getattr(fast, "previous_close", None)
        has_price = _valid_price(p)
        has_prev = _valid_price(prev)
        if has_price and has_prev:
            return float(p), float(prev)
        hist = t.history(period="5d", interval="1d")
        if not hist.empty:
            closes = hist["Close"].dropna()
            if len(closes) >= 2:
                return float(closes.iloc[-1]), float(closes.iloc[-2])
            elif len(closes) == 1:
                return float(closes.iloc[-1]), None
        if has_price:
            return float(p), None
    except Exception:
        pass
    return None, None

@app.get("/api/price/{symbol}")
@limiter.limit("60/minute")
def price(request: Request, symbol: str):
    p, prev = _price_and_prev_for_ticker(symbol)
    if p is not None:
        return {"symbol": symbol, "price": p, "previousClose": prev}
    raise HTTPException(status_code=404, detail="Precio no disponible")

@app.get("/api/prices")
@limiter.limit("30/minute")
def prices_batch(request: Request, symbols: str):
    """Batch price fetch. Returns {sym: {price, prev}} with previousClose when available."""
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not symbol_list:
        return {}
    result = {}

    # Split crypto vs traditional
    crypto_syms = [s for s in symbol_list if _is_crypto(s)]
    trad_syms   = [s for s in symbol_list if not _is_crypto(s)]

    if crypto_syms:
        result.update(_crypto_prices_batch(crypto_syms))

    if not trad_syms:
        return result

    symbol_list = trad_syms  # continue with Yahoo Finance for the rest
    try:
        df = yf.download(symbol_list, period="5d", interval="1d",
                         auto_adjust=True, progress=False, threads=True)
        if not df.empty:
            if isinstance(df.columns, pd.MultiIndex):
                closes = df["Close"]
            else:
                closes = df.rename(columns={"Close": symbol_list[0]})[symbol_list] if len(symbol_list) == 1 else df
            for sym in symbol_list:
                col = sym if sym in closes.columns else sym.upper()
                if col in closes.columns:
                    vals = closes[col].dropna()
                    if not vals.empty:
                        price_val = float(vals.iloc[-1])
                        prev_val = float(vals.iloc[-2]) if len(vals) >= 2 else None
                        result[sym] = {"price": price_val, "prev": prev_val}
    except Exception:
        pass
    missing = [s for s in symbol_list if s not in result]
    for sym in missing:
        p, prev = _price_and_prev_for_ticker(sym)
        if p is not None:
            result[sym] = {"price": p, "prev": prev}
    return result

# ── Panel de administración ───────────────────────────────────────────────────
# Solo el/los correos en ADMIN_EMAILS pueden consultar el resumen de portafolios.
# Por defecto el admin del proyecto (mismo correo que en firestore.rules).
ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.environ.get("ADMIN_EMAILS", "furielpacheco@gmail.com").split(",")
    if e.strip()
}

def require_admin(token: dict = Depends(require_2fa)) -> dict:
    if (token.get("email") or "").lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Acceso restringido a administradores.")
    return token

def _bulk_price_map(symbols: list) -> dict:
    """{TICKER: precio_actual} para una lista de tickers (crypto + tradicionales)."""
    symbols = list({s.strip().upper() for s in symbols if s and s.strip()})
    out: dict = {}
    if not symbols:
        return out
    crypto = [s for s in symbols if _is_crypto(s)]
    trad   = [s for s in symbols if not _is_crypto(s)]
    for sym, d in _crypto_prices_batch(crypto).items():
        out[sym] = d["price"]
    if trad:
        try:
            df = yf.download(trad, period="5d", interval="1d",
                             auto_adjust=True, progress=False, threads=True)
            if not df.empty:
                if isinstance(df.columns, pd.MultiIndex):
                    closes = df["Close"]
                else:
                    closes = df.rename(columns={"Close": trad[0]})[trad] if len(trad) == 1 else df
                for sym in trad:
                    col = sym if sym in closes.columns else sym.upper()
                    if col in closes.columns:
                        vals = closes[col].dropna()
                        if not vals.empty:
                            out[sym] = float(vals.iloc[-1])
        except Exception:
            pass
    for sym in symbols:
        if sym not in out:
            p, _ = _price_and_prev_for_ticker(sym)
            if p is not None:
                out[sym] = p
    return out

@app.get("/api/admin/portfolio-overview")
def admin_portfolio_overview(token: dict = Depends(require_admin), session=Depends(get_session)):
    """Por usuario: nº de portafolios, posiciones, valor total y rendimiento (% no realizado
    sobre el capital invertido en posiciones con precio). El % se aproxima sin conversión de
    divisa, por lo que portafolios con activos en monedas distintas pueden distorsionarlo."""
    snapshots = session.query(PortfolioSnapshot).all()
    users = {u.firebase_uid: u for u in session.query(AppUser).all()}

    tickers = set()
    for snap in snapshots:
        for pf in (snap.data or []):
            for pos in (pf.get("positions") or []):
                t = (pos.get("ticker") or "").strip().upper()
                if t and float(pos.get("quantity") or 0) > 0:
                    tickers.add(t)
    prices = _bulk_price_map(list(tickers))

    rows = []
    for snap in snapshots:
        portfolios = snap.data or []
        position_count = 0
        priced_cost = 0.0
        positions_value = 0.0
        cash_total = 0.0
        for pf in portfolios:
            for pos in (pf.get("positions") or []):
                qty = float(pos.get("quantity") or 0)
                if qty <= 0:
                    continue
                position_count += 1
                avg = float(pos.get("avgPrice") or 0)
                pr = prices.get((pos.get("ticker") or "").strip().upper())
                if pr is not None and avg > 0:
                    priced_cost += qty * avg
                    positions_value += qty * pr
            cash_total += float(pf.get("cashBalance") or 0)
        return_pct = ((positions_value - priced_cost) / priced_cost * 100) if priced_cost > 0 else None
        user = users.get(snap.firebase_uid)
        rows.append({
            "uid": snap.firebase_uid,
            "email": user.email if user else None,
            "portfolioCount": len(portfolios),
            "positionCount": position_count,
            "totalValue": round(positions_value + cash_total, 2),
            "returnPct": round(return_pct, 2) if return_pct is not None else None,
        })
    return {"users": rows, "pricedTickers": len(prices), "generatedAt": int(_time_module.time())}

# ── Perfil de usuario (Postgres app_users) — reemplaza Firestore users/{uid} ───
# El blob de perfil (fullName, avatarId, investorProfile, checkoutReady, etc.) vive
# en app_users.profile_data. El plan AUTORITATIVO (entitlement) es app_users.plan y
# solo lo fija Stripe (/billing/stripe/confirm) o el admin; el cliente nunca lo toca.

# Claves que NUNCA deben vivir en profile_data ni llegar al cliente: el secreto
# TOTP es server-only (tabla totp_credentials). Son restos de la migración Firestore.
_PROFILE_SECRET_KEYS = (
    "totpSecret", "totpPendingSecret", "totpEnabled",
    "stripeCustomerId", "stripeSubscriptionId",
)
_PROFILE_SERVER_KEYS = (
    "plan", "selectedPlan", "checkoutReady",
    "stripeCustomerId", "stripeSubscriptionId",
    "billingStatus", "billingCycle", "billingCurrentPeriodEnd",
)

@app.get("/api/account/profile")
def account_profile(token: dict = Depends(verify_firebase_user), session=Depends(get_session)):
    user = upsert_user(session, token)
    session.commit()
    data = {k: v for k, v in (user.profile_data or {}).items() if k not in _PROFILE_SECRET_KEYS}
    data.setdefault("fullName", user.display_name)
    data.setdefault("email", user.email)
    data["plan"] = normalize_plan(user.plan)
    data["selectedPlan"] = normalize_plan(user.plan)
    return data

@app.patch("/api/account/profile")
def account_profile_patch(
    body: dict = Body(default={}),
    token: dict = Depends(verify_firebase_user),
    session=Depends(get_session),
):
    user = upsert_user(session, token)
    incoming = dict(body or {})
    incoming.pop("plan", None)  # el entitlement nunca se fija desde el cliente
    for k in (*_PROFILE_SECRET_KEYS, *_PROFILE_SERVER_KEYS):
        incoming.pop(k, None)
    merged = {k: v for k, v in (user.profile_data or {}).items() if k not in _PROFILE_SECRET_KEYS[:3]}
    merged.update(incoming)
    user.profile_data = merged
    if incoming.get("fullName"):
        user.display_name = incoming["fullName"]
    user.last_seen_at = utc_now()
    session.commit()
    return {"ok": True}

@app.get("/api/admin/users")
def admin_users(token: dict = Depends(require_admin), session=Depends(get_session)):
    out = []
    for u in session.query(AppUser).all():
        pd = u.profile_data or {}
        out.append({
            "uid": u.firebase_uid,
            "fullName": pd.get("fullName") or u.display_name,
            "email": u.email,
            "selectedPlan": u.plan,
            "isDemo": bool(pd.get("isDemo")),
            "createdAt": pd.get("createdAt") or (u.created_at.isoformat() if u.created_at else None),
            "lastSeen": pd.get("lastSeen") or (u.last_seen_at.isoformat() if u.last_seen_at else None),
        })
    return {"users": out}

class AdminPlanBody(BaseModel):
    plan: str = ""

@app.put("/api/admin/users/{uid}/plan")
def admin_set_plan(
    uid: str,
    body: AdminPlanBody,
    token: dict = Depends(require_admin),
    session=Depends(get_session),
):
    body.plan = normalize_plan(body.plan)
    if body.plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="Plan no válido.")
    user = session.get(AppUser, uid)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    user.plan = body.plan
    session.add(SecurityActivity(
        firebase_uid=uid, event="plan_changed_by_admin",
        detail=f"plan={body.plan}; by={token.get('email')}", created_at=utc_now(),
    ))
    session.commit()
    return {"ok": True, "plan": body.plan}

# ── Cupones / Promotion Codes ─────────────────────────────────────────────────
# Cada código que genera el admin es un Promotion Code ÚNICO (max_redemptions
# configurable) sobre un Coupon reutilizable. El admin elige el tipo de descuento
# (porcentaje o monto fijo en USD), el valor y la duración. El checkout acepta
# promotion codes (allow_promotion_codes=True): el usuario lo teclea en
# "Añadir código de promoción".
#
# Los Coupons de Stripe son inmutables: reutilizamos uno por (tipo, valor,
# duración) usando un id determinista con prefijo "bp_". Cada código generado es
# un Promotion Code distinto, así que dos códigos del mismo descuento no chocan.

def _coupon_id(discount_type: str, value: int, duration_months: int) -> str:
    dur = f"{duration_months}m" if duration_months > 0 else "forever"
    if discount_type == "amount":
        return f"bp_amt{value}_usd_{dur}"   # value en centavos USD
    return f"bp_pct{value}_{dur}"           # value en %

def _get_or_create_coupon(discount_type: str, value: int, duration_months: int) -> str:
    coupon_id = _coupon_id(discount_type, value, duration_months)
    try:
        stripe.Coupon.retrieve(coupon_id)
    except stripe.StripeError:
        if discount_type == "amount":
            params = dict(id=coupon_id, amount_off=value, currency="usd",
                          name=f"BlackPortfolio -${value/100:.2f} USD")
        else:
            params = dict(id=coupon_id, percent_off=value,
                          name=f"BlackPortfolio -{value}%")
        if duration_months > 0:
            params.update(duration="repeating", duration_in_months=duration_months)
        else:
            params.update(duration="forever")
        stripe.Coupon.create(**params)
    return coupon_id

def _gen_promo_code() -> str:
    # Sin caracteres ambiguos (O/0, I/1) para que sea fácil de dictar.
    alphabet = "".join(c for c in (string.ascii_uppercase + string.digits) if c not in "O0I1")
    return "BP-" + "".join(secrets.choice(alphabet) for _ in range(8))

def _to_plain(obj) -> dict:
    """Convierte un objeto Stripe en un dict plano y recursivo. En stripe>=8 los
    StripeObject NO son dict ni tienen .get(); str(obj) los serializa a JSON."""
    if obj is None:
        return {}
    if isinstance(obj, dict):
        return obj
    return json.loads(str(obj))

def _promo_coupon(pc: dict) -> dict:
    """El cupón del promotion code. En la API nueva vive en promotion.coupon
    (objeto expandido o, sin expand, solo el id como string)."""
    cpn = (pc.get("promotion") or {}).get("coupon")
    return {"id": cpn} if isinstance(cpn, str) else (cpn or {})

def _promo_to_dict(pc) -> dict:
    pc = _to_plain(pc)
    cpn = _promo_coupon(pc)
    return {
        "id": pc.get("id"),
        "code": pc.get("code"),
        "active": pc.get("active"),
        "timesRedeemed": pc.get("times_redeemed", 0),
        "maxRedemptions": pc.get("max_redemptions"),
        "createdAt": pc.get("created"),
        "duration": cpn.get("duration"),
        "durationInMonths": cpn.get("duration_in_months"),
        "percentOff": cpn.get("percent_off"),
        "amountOff": cpn.get("amount_off"),
        "currency": cpn.get("currency"),
    }

class PromoCodeBody(BaseModel):
    code: str = ""
    discountType: str = "percent"   # "percent" | "amount"
    percentOff: int = 100
    amountOff: float = 0            # en USD (dólares); se convierte a centavos
    durationMonths: int = 0
    maxRedemptions: int = 1

@app.post("/api/admin/promo-codes")
def admin_create_promo_code(body: PromoCodeBody, token: dict = Depends(require_admin)):
    if not stripe.api_key:
        raise HTTPException(status_code=503, detail="Stripe no esta configurado.")
    duration = max(0, int(body.durationMonths or 0))
    max_red = max(1, int(body.maxRedemptions or 1))
    dtype = "amount" if body.discountType == "amount" else "percent"
    if dtype == "amount":
        value = int(round(float(body.amountOff or 0) * 100))
        if value <= 0:
            raise HTTPException(status_code=400, detail="El monto de descuento debe ser mayor a 0.")
    else:
        value = int(body.percentOff or 0)
        if value < 1 or value > 100:
            raise HTTPException(status_code=400, detail="El porcentaje debe estar entre 1 y 100.")
    code = (body.code or "").strip().upper() or _gen_promo_code()
    try:
        coupon_id = _get_or_create_coupon(dtype, value, duration)
        promo = stripe.PromotionCode.create(
            promotion={"type": "coupon", "coupon": coupon_id},
            code=code,
            max_redemptions=max_red,
            metadata={"beta": "true", "by": token.get("email") or ""},
            expand=["promotion.coupon"],
        )
    except stripe.StripeError as e:
        # Stripe rechaza códigos duplicados (uniqueness) → 400 con mensaje claro.
        raise HTTPException(status_code=400, detail=str(e.user_message or e))
    return _promo_to_dict(promo)

@app.get("/api/admin/promo-codes")
def admin_list_promo_codes(token: dict = Depends(require_admin)):
    if not stripe.api_key:
        raise HTTPException(status_code=503, detail="Stripe no esta configurado.")
    out = []
    try:
        codes = stripe.PromotionCode.list(limit=100, expand=["data.promotion.coupon"])
        for pc in codes.auto_paging_iter():
            pc = _to_plain(pc)
            if str(_promo_coupon(pc).get("id") or "").startswith("bp_"):
                out.append(_promo_to_dict(pc))
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e.user_message or e))
    return {"codes": out}

@app.post("/api/admin/promo-codes/{promo_id}/deactivate")
def admin_deactivate_promo_code(promo_id: str, token: dict = Depends(require_admin)):
    if not stripe.api_key:
        raise HTTPException(status_code=503, detail="Stripe no esta configurado.")
    try:
        promo = stripe.PromotionCode.modify(promo_id, active=False, expand=["promotion.coupon"])
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e.user_message or e))
    return _promo_to_dict(promo)

# ── Feedback in-app (beta) ────────────────────────────────────────────────────
@app.get("/api/admin/feedback")
def admin_list_feedback(token: dict = Depends(require_admin), session=Depends(get_session)):
    rows = session.query(Feedback).order_by(Feedback.created_at.desc()).limit(500).all()
    out = [{
        "id": f.id,
        "uid": f.firebase_uid,
        "email": f.email,
        "displayName": f.display_name,
        "plan": f.plan,
        "category": f.category,
        "message": f.message,
        "page": f.page,
        "userAgent": f.user_agent,
        "appVersion": f.app_version,
        "status": f.status,
        "createdAt": f.created_at.isoformat() if f.created_at else None,
    } for f in rows]
    new_count = sum(1 for f in rows if f.status == "new")
    return {"feedback": out, "newCount": new_count}

class FeedbackStatusBody(BaseModel):
    status: str = "new"

@app.put("/api/admin/feedback/{feedback_id}/status")
def admin_set_feedback_status(
    feedback_id: int,
    body: FeedbackStatusBody,
    token: dict = Depends(require_admin),
    session=Depends(get_session),
):
    if body.status not in ("new", "read", "resolved"):
        raise HTTPException(status_code=400, detail="Estado no válido.")
    fb = session.get(Feedback, feedback_id)
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback no encontrado.")
    fb.status = body.status
    session.commit()
    return {"ok": True, "id": fb.id, "status": fb.status}

# ── Beta cerrada: gestión de la allowlist (solo admin) ────────────────────────
class BetaAllowlistBody(BaseModel):
    email: str = ""
    note: str = ""

@app.get("/api/admin/beta-allowlist")
def admin_list_beta_allowlist(token: dict = Depends(require_admin), session=Depends(get_session)):
    rows = session.query(BetaAllowlist).order_by(BetaAllowlist.created_at.desc()).all()
    return {
        "betaClosed": BETA_CLOSED,
        "emails": [{
            "email": r.email,
            "addedBy": r.added_by,
            "note": r.note,
            "createdAt": r.created_at.isoformat() if r.created_at else None,
        } for r in rows],
    }

@app.post("/api/admin/beta-allowlist")
def admin_add_beta_allowlist(body: BetaAllowlistBody, token: dict = Depends(require_admin), session=Depends(get_session)):
    email = (body.email or "").strip().lower()
    if "@" not in email or len(email) > 320:
        raise HTTPException(status_code=400, detail="Correo no válido.")
    entry = session.get(BetaAllowlist, email)
    if entry is None:
        entry = BetaAllowlist(
            email=email,
            added_by=token.get("email"),
            note=(body.note or "").strip()[:200] or None,
            created_at=utc_now(),
        )
        session.add(entry)
        session.commit()
    return {"ok": True, "email": email}

@app.delete("/api/admin/beta-allowlist/{email}")
def admin_remove_beta_allowlist(email: str, token: dict = Depends(require_admin), session=Depends(get_session)):
    em = (email or "").strip().lower()
    entry = session.get(BetaAllowlist, em)
    if entry is None:
        raise HTTPException(status_code=404, detail="Correo no encontrado en la allowlist.")
    session.delete(entry)
    session.commit()
    return {"ok": True, "email": em}

RAPIDAPI_KEY  = os.environ.get("RAPIDAPI_KEY", "")
PEXELS_KEY    = os.environ.get("PEXELS_API_KEY", "")
RAPIDAPI_BOND_HOST = "bond-details.p.rapidapi.com"

# ── Banxico SIE ──────────────────────────────────────────────────────────────
BANXICO_TOKEN = os.environ.get("BANXICO_TOKEN", "")
BANXICO_BASE  = "https://www.banxico.org.mx/SieAPIRest/service/v1"

_MX_ISIN_PREFIXES = [
    ("MX0DI",  "CETES",    "Certificados de la Tesorería de la Federación"),
    ("MX0MGO", "BONO",     "Bono de desarrollo del gobierno federal (tasa fija)"),
    ("MX0M5",  "BONO",     "Bono de desarrollo del gobierno federal (tasa fija)"),
    ("MX0MUD", "UDIBONO",  "Bono de desarrollo del gobierno federal denominado en UDIs"),
    ("MX0BPA", "BPAG",     "Bono de desarrollo del gobierno federal con tasa flotante (BPAG91)"),
    ("MX0MBD", "BONDE_D",  "Bono de desarrollo del gobierno federal (Bonde D)"),
    ("MX0MBF", "BONDE_F",  "Bono de desarrollo del gobierno federal (Bonde F)"),
]

_BANXICO_SERIES = {
    "CETES": [
        {"id": "SF43936", "label": "CETES 28 días",  "term": "28d"},
        {"id": "SF43939", "label": "CETES 91 días",  "term": "91d"},
        {"id": "SF43942", "label": "CETES 182 días", "term": "182d"},
        {"id": "SF43945", "label": "CETES 364 días", "term": "364d"},
    ],
    "BONO": [
        {"id": "SF60640", "label": "Bono M 3 años",   "term": "3Y"},
        {"id": "SF60641", "label": "Bono M 5 años",   "term": "5Y"},
        {"id": "SF60643", "label": "Bono M 10 años",  "term": "10Y"},
        {"id": "SF60644", "label": "Bono M 20 años",  "term": "20Y"},
    ],
    "UDIBONO": [
        {"id": "SF60637", "label": "UDIBONO 10 años", "term": "10Y"},
        {"id": "SF60638", "label": "UDIBONO 20 años", "term": "20Y"},
        {"id": "SF60639", "label": "UDIBONO 30 años", "term": "30Y"},
    ],
    "BONDE_D": [
        {"id": "SF60650", "label": "Bondes D 1 año",  "term": "1Y"},
        {"id": "SF60651", "label": "Bondes D 3 años", "term": "3Y"},
        {"id": "SF60652", "label": "Bondes D 5 años", "term": "5Y"},
    ],
}

def _classify_mx_isin(isin: str):
    for prefix, bond_type, desc in _MX_ISIN_PREFIXES:
        if isin.startswith(prefix):
            return bond_type, desc
    return "MX_GOV", "Valor gubernamental mexicano"

@app.get("/api/banxico/bond/{isin}")
@limiter.limit("20/minute")
def banxico_bond(request: Request, isin: str):
    isin = isin.upper()
    bond_type, description = _classify_mx_isin(isin)
    series_list = _BANXICO_SERIES.get(bond_type, [])

    if not series_list:
        return {"isin": isin, "type": bond_type, "description": description, "rates": []}

    ids_str = ",".join(s["id"] for s in series_list)
    url = f"{BANXICO_BASE}/series/{ids_str}/datos/oportuno"
    res = _HTTP_SESSION.get(url, headers={"Bmx-Token": BANXICO_TOKEN})

    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail="Error al consultar Banxico SIE")

    api_series = res.json().get("bmx", {}).get("series", [])
    by_id = {s.get("idSerie"): s for s in api_series}
    rates = []
    for meta in series_list:
        serie = by_id.get(meta["id"], {})
        datos = serie.get("datos") or []
        latest = datos[0] if datos else {}
        rates.append({
            "label":     meta["label"],
            "term":      meta["term"],
            "date":      latest.get("fecha", ""),
            "rate":      latest.get("dato", "N/D"),
            "series_id": meta["id"],
            "title":     (serie.get("titulo") or "").strip(),
        })

    return {"isin": isin, "type": bond_type, "description": description, "rates": rates}

@app.get("/api/bond/{isin}")
@limiter.limit("20/minute")
def bond_info(request: Request, isin: str):
    url = f"https://{RAPIDAPI_BOND_HOST}/Detailed_Bond"
    res = _HTTP_SESSION.get(url, params={"ISIN": isin}, headers={
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_BOND_HOST,
    })
    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail="Error al consultar datos del bono")
    data = res.json()
    if isinstance(data, list) and len(data) == 0:
        raise HTTPException(status_code=404, detail=f"No se encontraron datos para el ISIN {isin}. Esta API cubre bonos del mercado indio (NSDL/BSE/NSE).")
    return data[0] if isinstance(data, list) else data

RAPIDAPI_FINANCE_HOST = "real-time-finance-data.p.rapidapi.com"
RAPIDAPI_MORNINGSTAR_HOST = "morning-star.p.rapidapi.com"

YAHOO_EXCHANGE_MAP = {
    "NMS": "NASDAQ", "NGM": "NASDAQ", "NCM": "NASDAQ",
    "NYQ": "NYSE",   "PCX": "NYSEARCA",
    "ASE": "AMEX",   "BTS": "BATS",   "TOR": "TSX",
    "MEX": "BMV",    "LSE": "LSE",
}


@app.get("/api/intraday/{symbol}")
@limiter.limit("20/minute")
def intraday_chart(request: Request, symbol: str, period: str = "1D"):
    from datetime import datetime

    try:
        from zoneinfo import ZoneInfo
        _tz = ZoneInfo("America/New_York")
        def to_ts(s: str) -> int:
            return int(datetime.strptime(s, "%Y-%m-%d %H:%M:%S").replace(tzinfo=_tz).timestamp())
    except Exception:
        def to_ts(s: str) -> int:
            return int(datetime.strptime(s, "%Y-%m-%d %H:%M:%S").timestamp()) - 18000

    try:
        ex_code = yf.Ticker(symbol).fast_info.exchange or ""
        exchange = YAHOO_EXCHANGE_MAP.get(ex_code, "NASDAQ")
    except Exception:
        exchange = "NASDAQ"

    rapid_symbol = f"{symbol}:{exchange}"
    url = f"https://{RAPIDAPI_FINANCE_HOST}/stock-time-series"

    try:
        res = _HTTP_SESSION.get(
            url,
            params={"symbol": rapid_symbol, "period": period, "language": "en"},
            headers={"x-rapidapi-key": RAPIDAPI_KEY, "x-rapidapi-host": RAPIDAPI_FINANCE_HOST},
            timeout=12,
        )
    except Exception as e:
        raise _safe_error(e, 503, "Servicio de datos no disponible temporalmente. Intenta más tarde.")

    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail=f"RapidAPI error {res.status_code}")

    raw = res.json()
    data = raw.get("data", {})
    ts_list = data.get("time_series", [])

    if not ts_list:
        raise HTTPException(status_code=404, detail="Sin datos intraday para este ticker en RapidAPI")

    # time_series is a dict {datetime_str: {price, change, volume, ...}}
    if isinstance(ts_list, dict):
        bars_iter = sorted(ts_list.items(), key=lambda x: x[0])
    else:
        bars_iter = [(bar.get("datetime", ""), bar) for bar in ts_list]

    candles, closes, volumes = [], [], []
    for dt_str, bar in bars_iter:
        try:
            t = to_ts(dt_str)
            p = float(bar.get("price") or bar.get("close") or bar.get("open") or 0)
            if p == 0:
                continue
            v = int(bar.get("volume", 0) or 0)
            # Use price as all OHLC values (tick data — no separate OHLCV bars)
            candles.append({"time": t, "open": p, "high": p, "low": p, "close": p})
            closes.append({"time": t, "value": p})
            if v > 0:
                volumes.append({"time": t, "value": v})
        except Exception:
            continue

    if not candles:
        raise HTTPException(status_code=404, detail="No se pudieron procesar los datos intraday")

    return {
        "meta": {
            "symbol": symbol,
            "currency": "USD",
            "shortName": symbol,
            "fullExchangeName": exchange,
            "regularMarketPrice": float(data.get("price") or candles[-1]["close"]),
            "previousClose": float(data.get("previous_close") or 0),
        },
        "candles": candles,
        "closes": closes,
        "volumes": volumes,
    }

@app.get("/api/dividends/{symbol}")
@limiter.limit("30/minute")
def dividends(request: Request, symbol: str):
    cached = _DIVIDENDS_CACHE.get(symbol)
    if cached is not None:
        return cached
    try:
        t = yf.Ticker(symbol)
        info = t.info or {}

        div_yield   = info.get("dividendYield") or info.get("trailingAnnualDividendYield")
        div_rate    = info.get("dividendRate")  or info.get("trailingAnnualDividendRate")
        payout      = info.get("payoutRatio")
        five_yr_avg = info.get("fiveYearAvgDividendYield")
        ex_date_ts  = info.get("exDividendDate")
        frequency   = None
        if div_rate and div_yield and div_yield > 0:
            approx_payments = round(div_rate / (info.get("regularMarketPrice", 1) * div_yield)) if info.get("regularMarketPrice") else None
            freq_map = {1: "Anual", 2: "Semestral", 4: "Trimestral", 12: "Mensual"}
            frequency = freq_map.get(approx_payments)

        ex_date_str = None
        if ex_date_ts:
            from datetime import datetime, timezone
            try:
                ex_date_str = datetime.fromtimestamp(ex_date_ts, tz=timezone.utc).strftime("%Y-%m-%d")
            except Exception:
                pass

        summary = {
            "forward":   div_rate,
            "yield":     div_yield,
            "payout":    payout,
            "fiveYrAvg": five_yr_avg,
            "exDate":    ex_date_str,
            "frequency": frequency,
        }

        # Historical dividends from yfinance
        div_series = t.dividends
        history = []
        if div_series is not None and not div_series.empty:
            for dt_idx, amount in div_series.sort_index(ascending=False).items():
                try:
                    date_str = dt_idx.strftime("%Y-%m-%d") if hasattr(dt_idx, "strftime") else str(dt_idx)[:10]
                except Exception:
                    date_str = str(dt_idx)[:10]
                history.append({"date": date_str, "amount": float(amount)})

        out = {"summary": summary, "history": history[:40]}
        _DIVIDENDS_CACHE.set(symbol, out)
        return out

    except Exception as e:
        raise _safe_error(e)


@app.get("/api/risk-free-rate")
def risk_free_rate():
    """
    Devuelve la TIIE a 28 días desde Banxico (serie SF43783).
    Cacheado 24 h. Si falla, devuelve fallback 9.0%.
    """
    cached = _TIIE_CACHE_V2.get("tiie")
    if cached is not None:
        return cached

    fallback = {"rate": 9.0, "label": "Tasa libre de riesgo (fallback)", "date": None, "source": "fallback"}
    try:
        url = f"{BANXICO_BASE}/series/SF43783/datos/oportuno"
        res = _HTTP_SESSION.get(url, headers={"Bmx-Token": BANXICO_TOKEN, "Accept": "application/json"}, timeout=8)
        if res.status_code != 200:
            return fallback
        j = res.json()
        serie = j["bmx"]["series"][0]
        dato = serie["datos"][0]
        rate = float(str(dato["dato"]).replace(",", ""))
        out = {"rate": rate, "label": "TIIE 28 (Banxico)", "date": dato.get("fecha"), "source": "banxico"}
        _TIIE_CACHE_V2.set("tiie", out)
        return out
    except Exception:
        return fallback


@app.get("/api/news/{symbol}")
@limiter.limit("20/minute")
def stock_news(request: Request, symbol: str, language: str = "es"):
    cache_key = f"{symbol}:{language}"
    cached = _NEWS_CACHE.get(cache_key)
    if cached is not None:
        return cached
    try:
        ex_code = yf.Ticker(symbol).fast_info.exchange or ""
        exchange = YAHOO_EXCHANGE_MAP.get(ex_code, "NASDAQ")
    except Exception:
        exchange = "NASDAQ"

    rapid_symbol = f"{symbol}:{exchange}"
    url = f"https://{RAPIDAPI_FINANCE_HOST}/stock-news"

    try:
        res = _HTTP_SESSION.get(
            url,
            params={"symbol": rapid_symbol, "language": language},
            headers={"x-rapidapi-key": RAPIDAPI_KEY, "x-rapidapi-host": RAPIDAPI_FINANCE_HOST},
            timeout=10,
        )
    except Exception as e:
        raise _safe_error(e, 503, "Servicio de datos no disponible temporalmente. Intenta más tarde.")

    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail=f"RapidAPI error {res.status_code}")

    raw = res.json()
    news_list = raw.get("data", {}).get("news", [])
    out = {"news": news_list[:10]}
    _NEWS_CACHE.set(cache_key, out)
    return out


def _next_first_friday(year: int, month: int):
    from datetime import date, timedelta
    d = date(year, month, 1)
    d += timedelta(days=(4 - d.weekday()) % 7)
    return d

def _build_economic_events():
    """Curated upcoming US macro events (next ~60 days)."""
    from datetime import date, timedelta
    today = date.today()
    out = []
    # FOMC meetings (2026 schedule)
    fomc_2026 = ["2026-01-28", "2026-03-18", "2026-04-29", "2026-06-17",
                 "2026-07-29", "2026-09-16", "2026-10-28", "2026-12-09"]
    for d in fomc_2026:
        from datetime import datetime as _dt
        dt = _dt.strptime(d, "%Y-%m-%d").date()
        if today <= dt <= today + timedelta(days=120):
            out.append({"date": d, "title": "FOMC Meeting", "category": "Política Monetaria",
                        "country": "US", "importance": "high"})
    # NFP first Friday + CPI ~12th of each upcoming month
    for offset in range(0, 4):
        m = today.month + offset
        y = today.year + (m - 1) // 12
        m = ((m - 1) % 12) + 1
        nfp = _next_first_friday(y, m)
        if nfp >= today:
            out.append({"date": nfp.isoformat(), "title": "Non-Farm Payrolls",
                        "category": "Empleo", "country": "US", "importance": "high"})
        cpi = date(y, m, 12)
        if cpi >= today:
            out.append({"date": cpi.isoformat(), "title": "CPI Release",
                        "category": "Inflación", "country": "US", "importance": "high"})
        gdp = date(y, m, 28)
        if gdp >= today and m in (1, 4, 7, 10):
            out.append({"date": gdp.isoformat(), "title": "GDP (Quarterly)",
                        "category": "Crecimiento", "country": "US", "importance": "medium"})
    out.sort(key=lambda e: e["date"])
    return out

@app.get("/api/calendar")
@limiter.limit("20/minute")
def calendar(request: Request, symbols: str = ""):
    """Returns upcoming earnings + economic events. `symbols` is a comma-separated ticker list."""
    from datetime import date, timedelta
    syms = [s.strip().upper() for s in symbols.split(",") if s.strip()][:25]
    cache_key = ",".join(sorted(syms))
    cached = _CALENDAR_CACHE_V2.get(cache_key)
    if cached is not None:
        return cached

    earnings = []
    today = date.today()
    horizon = today + timedelta(days=120)
    default_syms = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JPM"]
    targets = syms or default_syms
    for sym in targets:
        try:
            cal = yf.Ticker(sym).calendar
            ed = None
            if isinstance(cal, dict):
                ed = cal.get("Earnings Date")
            if ed is None:
                continue
            if isinstance(ed, list) and ed:
                ed = ed[0]
            try:
                ed_str = ed.strftime("%Y-%m-%d") if hasattr(ed, "strftime") else str(ed)[:10]
            except Exception:
                continue
            from datetime import datetime as _dt
            try:
                edt = _dt.strptime(ed_str, "%Y-%m-%d").date()
            except Exception:
                continue
            if today <= edt <= horizon:
                earnings.append({"date": ed_str, "symbol": sym, "title": f"Reporte {sym}",
                                 "category": "Earnings", "importance": "medium"})
        except Exception:
            continue
    earnings.sort(key=lambda e: e["date"])

    data = {"earnings": earnings, "economic": _build_economic_events()}
    _CALENDAR_CACHE_V2.set(cache_key, data)
    return data

@app.get("/api/seasonality/{symbol}")
@limiter.limit("10/minute")
def seasonality(request: Request, symbol: str):
    cached = _SEASONALITY_CACHE_V2.get(symbol)
    if cached is not None:
        return cached

    try:
        t = yf.Ticker(symbol)
        hist = t.history(period="10y")
        if hist.empty:
            raise HTTPException(status_code=404, detail="Sin datos históricos")

        hist.index = pd.to_datetime(hist.index)
        if hist.index.tz is not None:
            hist.index = hist.index.tz_convert(None)
        try:
            monthly = hist["Close"].resample("ME").last().dropna()
        except ValueError:
            monthly = hist["Close"].resample("M").last().dropna()
        monthly_ret = monthly.pct_change() * 100

        result_years = {}
        for year in sorted(monthly.index.year.unique()):
            year_data = monthly_ret[monthly_ret.index.year == year]
            if len(year_data) < 6:
                continue
            monthly_returns = []
            for m in range(1, 13):
                vals = year_data[year_data.index.month == m]
                v = float(vals.iloc[0]) if len(vals) else None
                monthly_returns.append(round(v, 2) if v is not None and not np.isnan(v) else None)
            cumulative = [0.0]
            running = 1.0
            for r in monthly_returns:
                if r is not None:
                    running *= (1 + r / 100)
                cumulative.append(round((running - 1) * 100, 2))
            result_years[str(year)] = {"monthly_returns": monthly_returns, "cumulative": cumulative}

        all_monthly = [v["monthly_returns"] for v in result_years.values()]
        avg_monthly = []
        for mi in range(12):
            vals = [row[mi] for row in all_monthly if row[mi] is not None]
            avg_monthly.append(round(float(np.nanmean(vals)), 2) if vals else None)
        avg_cum = [0.0]
        running = 1.0
        for r in avg_monthly:
            if r is not None:
                running *= (1 + r / 100)
            avg_cum.append(round((running - 1) * 100, 2))

        result = {
            "years": sorted(result_years.keys()),
            "data": result_years,
            "average": {"monthly_returns": avg_monthly, "cumulative": avg_cum},
        }
        _SEASONALITY_CACHE_V2.set(symbol, result)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise _safe_error(e)


@app.get("/api/chart/{symbol}")
@limiter.limit("30/minute")
def chart(request: Request, symbol: str, range: str = "1d", interval: str = "5m"):
    # Crypto: separate CoinGecko cache — never serve stale Yahoo Finance fallback
    if _is_crypto(symbol):
        crypto_key = f"crypto:{symbol}:{range}"
        crypto_cached = _CHART_CACHE.get(crypto_key)
        if crypto_cached is not None:
            return crypto_cached
        # 1) Binance.US — velas finas con volumen real
        try:
            klines = _binanceus_klines(symbol, range)
            if klines:
                data = _binance_klines_to_yahoo(klines, symbol)
                _CHART_CACHE.set(crypto_key, data)
                return data
        except Exception as _bus_err:
            import logging as _log
            _log.warning("Binance.US fallback for %s: %s", symbol, _bus_err)
        # 2) CoinGecko — respaldo (sin volumen, granularidad gruesa)
        try:
            candles = _coingecko_ohlc(symbol, range)
            if candles:
                data = _coingecko_ohlc_to_yahoo(candles, symbol)
                _CHART_CACHE.set(crypto_key, data)
                return data
        except Exception as _cg_err:
            import logging as _log
            _log.warning("CoinGecko fallback for %s: %s", symbol, _cg_err)
        # 3) Yahoo Finance — último recurso, NO cacheado para reintentar fuentes crypto
        _RANGE_SECONDS_CG = {
            "1d": 86400, "5d": 432000, "1mo": 2592000, "3mo": 7776000,
            "6mo": 15552000, "1y": 31536000, "2y": 63072000, "5y": 157680000,
            "10y": 315360000, "30y": 946080000,
        }
        now_cg = int(_time_module.time())
        if range in _RANGE_SECONDS_CG:
            p1_cg = now_cg - _RANGE_SECONDS_CG[range]
            url_cg = (f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
                      f"?period1={p1_cg}&period2={now_cg}&interval={interval}"
                      f"&includePrePost=false&events=div%2Csplits")
        else:
            url_cg = (f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
                      f"?range={range}&interval={interval}"
                      f"&includePrePost=false&events=div%2Csplits")
        res_cg = _HTTP_SESSION.get(url_cg)
        if res_cg.status_code != 200:
            raise HTTPException(status_code=res_cg.status_code, detail="Error de Yahoo Finance")
        yf_data = res_cg.json()
        # Override "CCC" so UI always shows "Crypto" even on Yahoo Finance fallback
        try:
            for r in yf_data.get("chart", {}).get("result", []):
                if r.get("meta", {}).get("fullExchangeName") == "CCC":
                    r["meta"]["fullExchangeName"] = "Crypto"
                    r["meta"]["exchangeName"] = "Crypto"
        except Exception:
            pass
        return yf_data  # not cached — forces CoinGecko retry on next request

    cache_key = f"{symbol}:{range}:{interval}"
    cached = _CHART_CACHE.get(cache_key)
    if cached is not None:
        return cached

    _RANGE_SECONDS = {
        "1d": 86400, "5d": 432000, "1mo": 2592000, "3mo": 7776000,
        "6mo": 15552000, "1y": 31536000, "2y": 63072000, "5y": 157680000,
        "10y": 315360000, "30y": 946080000,
    }
    now = int(_time_module.time())
    if range in _RANGE_SECONDS:
        p1 = now - _RANGE_SECONDS[range]
        url = (f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
               f"?period1={p1}&period2={now}&interval={interval}"
               f"&includePrePost=false&events=div%2Csplits")
    else:
        url = (f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
               f"?range={range}&interval={interval}"
               f"&includePrePost=false&events=div%2Csplits")
    res = _HTTP_SESSION.get(url)
    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail="Error de Yahoo Finance")
    data = res.json()
    _CHART_CACHE.set(cache_key, data)
    return data

# ── Pexels gallery proxy (la clave nunca sale al frontend) ────────────────────
@app.get("/api/gallery")
def gallery():
    if not PEXELS_KEY:
        return {"photos": [], "videos": []}
    headers = {"Authorization": PEXELS_KEY}
    try:
        photos_res = _HTTP_SESSION.get(
            "https://api.pexels.com/v1/search",
            params={"query": "stock market trading finance charts",
                    "per_page": 4, "orientation": "landscape"},
            headers=headers, timeout=10,
        )
        videos_res = _HTTP_SESSION.get(
            "https://api.pexels.com/videos/search",
            params={"query": "stock market trading finance",
                    "per_page": 2, "size": "medium"},
            headers=headers, timeout=10,
        )
        photos = photos_res.json() if photos_res.status_code == 200 else {}
        videos = videos_res.json() if videos_res.status_code == 200 else {}
        return {"photos": photos.get("photos", []), "videos": videos.get("videos", [])}
    except Exception:
        return {"photos": [], "videos": []}


# ── Stripe ───────────────────────────────────────────────────────────────────
@app.post("/api/billing/stripe/webhook")
async def stripe_webhook(request: Request, session=Depends(get_session)):
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook no configurado")
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(status_code=400, detail="Payload inválido")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Firma inválida")

    event_id = event["id"]
    if session.get(BillingEvent, event_id):
        return {"received": True, "duplicate": True}

    event_type = event["type"]
    obj = _to_plain(event["data"]["object"])
    metadata = obj.get("metadata") or {}
    uid = metadata.get("uid") or obj.get("client_reference_id")
    customer_id = obj.get("customer")
    user = session.get(AppUser, uid) if uid else None
    if user is None and customer_id:
        for candidate in session.query(AppUser).all():
            if (candidate.profile_data or {}).get("stripeCustomerId") == customer_id:
                user = candidate
                uid = candidate.firebase_uid
                break

    if user is not None:
        profile = dict(user.profile_data or {})
        if customer_id:
            profile["stripeCustomerId"] = customer_id
        if event_type == "checkout.session.completed":
            plan = normalize_plan(metadata.get("plan"))
            # "no_payment_required" = checkout liquidado con cupón 100% off (beta).
            if obj.get("payment_status") in ("paid", "no_payment_required") and plan != "Explorer":
                user.plan = plan
                profile.update({
                    "stripeSubscriptionId": obj.get("subscription"),
                    "billingStatus": "active",
                    "billingCycle": metadata.get("billing_cycle", "monthly"),
                })
        elif event_type == "customer.subscription.updated":
            status = obj.get("status") or "unknown"
            profile.update({
                "stripeSubscriptionId": obj.get("id"),
                "billingStatus": status,
                "billingCurrentPeriodEnd": obj.get("current_period_end"),
            })
            plan = normalize_plan(metadata.get("plan"))
            if status in {"active", "trialing"}:
                user.plan = plan
            elif status in {"canceled", "unpaid", "incomplete_expired"}:
                user.plan = "Explorer"
        elif event_type == "customer.subscription.deleted":
            user.plan = "Explorer"
            profile.update({"billingStatus": "canceled", "stripeSubscriptionId": obj.get("id")})
        elif event_type == "invoice.payment_failed":
            profile["billingStatus"] = "past_due"
        elif event_type == "invoice.paid":
            profile["billingStatus"] = "active"
        user.profile_data = profile
        user.last_seen_at = utc_now()

    session.add(BillingEvent(
        stripe_event_id=event_id,
        event_type=event_type,
        firebase_uid=uid,
        created_at=utc_now(),
    ))
    session.commit()
    return {"received": True}


class CheckoutRequest(BaseModel):
    plan: str = "Advisor Pro"
    billingCycle: str = "monthly"

@app.post("/api/billing/stripe/create-checkout-session")
async def stripe_create_session(
    request: Request,
    body: CheckoutRequest,
    token: dict = Depends(verify_firebase_user),
    db_session=Depends(get_session),
):
    plan = normalize_plan(body.plan)
    if plan == "Explorer":
        raise HTTPException(status_code=400, detail="El plan Explorer no requiere pago.")
    if plan not in PLAN_PRICES or body.billingCycle not in {"monthly", "yearly"}:
        raise HTTPException(status_code=400, detail="Plan o ciclo de cobro no valido.")
    if not stripe.api_key:
        raise HTTPException(status_code=503, detail="Stripe no esta configurado.")
    try:
        user = upsert_user(db_session, token)
        db_session.commit()
        prices = PLAN_PRICES[plan]
        amount = prices["yearly"] if body.billingCycle == "yearly" else prices["monthly"]
        interval = "year" if body.billingCycle == "yearly" else "month"
        uid = token["uid"]
        profile = user.profile_data or {}

        params = dict(
            mode="subscription",
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": amount,
                    "recurring": {"interval": interval},
                    "product_data": {"name": f"BlackPortfolio {plan}"},
                },
                "quantity": 1,
            }],
            success_url=f"{FRONTEND_BASE_URL}/success.html?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_BASE_URL}/index.html#plans",
            client_reference_id=uid,
            metadata={"plan": plan, "billing_cycle": body.billingCycle, "uid": uid},
            subscription_data={"metadata": {"plan": plan, "billing_cycle": body.billingCycle, "uid": uid}},
            allow_promotion_codes=True,
        )
        if profile.get("stripeCustomerId"):
            params["customer"] = profile["stripeCustomerId"]
        elif token.get("email"):
            params["customer_email"] = token["email"]

        checkout_session = stripe.checkout.Session.create(**params)
        return {"url": checkout_session.url}
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e.user_message or e))
    except Exception as e:
        raise _safe_error(e)


class StripeConfirmRequest(BaseModel):
    sessionId: str = ""

@app.post("/api/billing/stripe/confirm")
def stripe_confirm(
    request: Request,
    body: StripeConfirmRequest,
    token: dict = Depends(verify_firebase_user),
    session=Depends(get_session),
):
    """Verifica server-side la sesión de Stripe y fija el plan del usuario en Postgres.
    Reemplaza la Cloud Function confirmStripePayment (que exigía plan Blaze)."""
    uid = token["uid"]
    if not body.sessionId:
        raise HTTPException(status_code=400, detail="Session ID requerido.")
    try:
        checkout = _to_plain(stripe.checkout.Session.retrieve(body.sessionId))
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e.user_message or e))

    # "no_payment_required" = cupón 100% off (beta); el checkout sí se completó.
    if checkout.get("payment_status") not in ("paid", "no_payment_required"):
        raise HTTPException(status_code=402, detail="El pago no fue completado.")
    ref = checkout.get("client_reference_id")
    if ref != uid:
        raise HTTPException(status_code=403, detail="Esta sesión no corresponde al usuario actual.")
    plan = normalize_plan((checkout.get("metadata") or {}).get("plan"))
    if plan not in PLAN_PRICES or plan == "Explorer":
        raise HTTPException(status_code=400, detail="Plan no válido en la sesión de pago.")

    user = upsert_user(session, token)
    user.plan = plan
    profile = dict(user.profile_data or {})
    profile.update({
        "stripeCustomerId": checkout.get("customer"),
        "stripeSubscriptionId": checkout.get("subscription"),
        "billingStatus": "active",
        "billingCycle": (checkout.get("metadata") or {}).get("billing_cycle", "monthly"),
    })
    user.profile_data = profile
    session.add(SecurityActivity(
        firebase_uid=uid, event="plan_activated",
        detail=f"plan={plan}; session={body.sessionId[:40]}", created_at=utc_now(),
    ))
    session.commit()
    return {"plan": plan, "checkoutReady": True}


@app.post("/api/billing/stripe/portal")
def stripe_customer_portal(
    token: dict = Depends(verify_firebase_user),
    session=Depends(get_session),
):
    user = upsert_user(session, token)
    customer_id = (user.profile_data or {}).get("stripeCustomerId")
    if not customer_id:
        raise HTTPException(status_code=404, detail="No hay una suscripcion de Stripe asociada.")
    try:
        portal = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{FRONTEND_BASE_URL}/main.html#settings",
        )
        return {"url": portal.url}
    except stripe.StripeError as exc:
        raise HTTPException(status_code=400, detail=str(exc.user_message or exc))

# ── AI Insights (OpenRouter) ──────────────────────────────────────────────────
# Proxy server-side: la API key NUNCA llega al navegador. Configúrala en Railway:
#   OPENROUTER_API_KEY  (obligatoria)
#   OPENROUTER_MODEL    (opcional) — cadena de modelos separada por comas; se intenta
#                       en orden hasta que uno responda. Por defecto prueba el modelo
#                       gratuito y, si está saturado (429), cae al de pago equivalente
#                       (≈ $0.00006 por reporte). Así el resumen casi siempre aparece.
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL   = os.environ.get(
    "OPENROUTER_MODEL",
    "google/gemma-4-26b-a4b-it:free,google/gemma-4-26b-a4b-it",
)

class InsightsRequest(BaseModel):
    metrics: dict
    lang: str = "es"

def _openrouter_chat(models, messages):
    """Intenta cada modelo en orden; devuelve (texto, modelo_usado) o (None, detalle_error)."""
    last_detail = "sin modelos configurados"
    for model in models:
        try:
            r = _HTTP_SESSION.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://portify-6467f.web.app",
                    "X-Title": "BlackPortfolio",
                },
                json={"model": model, "messages": messages,
                      "temperature": 0.4, "max_tokens": 1500},
                timeout=45,
            )
        except requests.RequestException as e:
            last_detail = f"{model}: red ({e})"
            continue
        if r.status_code == 200:
            text = (r.json().get("choices") or [{}])[0].get("message", {}).get("content", "").strip()
            if text:
                return text, model
            last_detail = f"{model}: respuesta vacía"
            continue
        # 429 (saturado), 404 (no disponible), 5xx… → probar el siguiente modelo de la cadena
        last_detail = f"{model}: HTTP {r.status_code} {r.text[:160]}"
    return None, last_detail

@app.post("/api/ai/insights")
@limiter.limit("10/minute")
def ai_insights(
    request: Request,
    body: InsightsRequest,
    _user: dict = Depends(require_plan("Advisor Pro", "Wealth Desk")),
):
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=503, detail="AI no configurada (falta OPENROUTER_API_KEY)")

    models = [m.strip() for m in OPENROUTER_MODEL.split(",") if m.strip()]
    lang_name = "español" if str(body.lang).startswith("es") else "inglés"
    system_msg = (
        "Eres un analista financiero senior (CFA), objetivo y prudente, que redacta el análisis "
        "de un reporte profesional para un gestor de inversión. "
        "No das recomendaciones personalizadas de compra/venta ni garantías de rentabilidad; "
        "ofreces observaciones educativas y accionables sobre riesgo, diversificación, atribución "
        "y estructura del portafolio. Te apoyas SIEMPRE en los números provistos y citas cifras "
        "concretas. No inventes datos que no estén en el JSON."
    )
    user_msg = (
        f"Analiza el siguiente portafolio y redacta el análisis en {lang_name}, en Markdown, "
        "organizado EXACTAMENTE en estas secciones con encabezado '## ':\n"
        "## Tesis y diagnóstico — 2-3 frases sobre el estado general (retorno, riesgo, perfil).\n"
        "## Atribución de resultados — qué posiciones aportaron o restaron más al retorno (usa los datos de 'atribucion').\n"
        "## Riesgos clave — concentración, volatilidad, drawdown, divisa; nombra la posición/sector causante.\n"
        "## Desempeño vs benchmark — compara retorno, exceso (alpha) y tracking error si hay datos.\n"
        "## Acciones de rebalanceo sugeridas — 2-3 viñetas concretas (sobreponderar/reducir y por qué), en términos educativos, sin órdenes de compra/venta personalizadas.\n\n"
        "Cada sección: 1-3 viñetas breves con cifras. Sé concreto, profesional y conciso. "
        "Omite una sección solo si no hay datos para ella.\n\n"
        f"Datos del portafolio (JSON):\n{json.dumps(body.metrics, ensure_ascii=False)}"
    )

    text, info = _openrouter_chat(models, [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg},
    ])
    if not text:
        raise HTTPException(status_code=502, detail=f"OpenRouter sin respuesta. {info}")
    return {"insights": text, "model": info}


class AnalyzerAIRequest(BaseModel):
    assets: list
    portfolio: Optional[dict] = None
    lang: str = "es"

@app.post("/api/ai/analyzer")
@limiter.limit("8/minute")
def ai_analyzer(
    request: Request,
    body: AnalyzerAIRequest,
    _user: dict = Depends(require_plan("Advisor Pro", "Wealth Desk")),
):
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=503, detail="AI no configurada (falta OPENROUTER_API_KEY)")
    if not body.assets:
        raise HTTPException(status_code=400, detail="Sin activos para analizar")

    models = ["deepseek/deepseek-v4-flash"]
    lang_name = "español" if str(body.lang).startswith("es") else "inglés"
    system_msg = (
        "Eres un analista financiero senior (CFA) con experiencia en research de buy-side, objetivo y "
        "prudente. Recibes la salida de un motor cuantitativo que integra: valoración DCF multi-escenario, "
        "simulación Monte Carlo, fundamentales completos, análisis técnico (tendencia, RSI, medias móviles, "
        "rango de 52 semanas, momentum), consenso de analistas de Wall Street con precios objetivo, un "
        "precio objetivo consolidado (mezcla ponderada de DCF, Monte Carlo y analistas) y un score "
        "multifactor. Redactas un veredicto de inversión institucional, profundo y educativo. "
        "Reglas: (1) Te apoyas SIEMPRE en las cifras del JSON y las citas explícitamente con valores y "
        "porcentajes. (2) NUNCA inventes datos que no estén en el JSON. (3) Triangulas: contrasta lo que "
        "dice la valoración intrínseca (DCF) con lo estocástico (Monte Carlo), lo técnico y el consenso de "
        "analistas — señala cuándo coinciden (alta convicción) y cuándo divergen (señal de cautela). "
        "(4) No das órdenes personalizadas ni garantías de rentabilidad; ofreces observaciones de "
        "valoración, riesgo, calidad y timing. (5) Si un activo no tiene DCF (ETF/cripto), apóyate en "
        "Monte Carlo, técnico, analistas y fundamentales disponibles."
    )
    payload = {"activos": body.assets}
    if body.portfolio:
        payload["portafolio"] = body.portfolio
    user_msg = (
        f"Redacta un veredicto MUY COMPLETO en {lang_name}, en Markdown, con esta estructura usando "
        "encabezados '## ':\n\n"
        "## Resumen ejecutivo — 3-4 frases sintetizando el conjunto: qué activo luce mejor posicionado y "
        "por qué, con la cifra clave (upside del objetivo consolidado) de cada uno.\n\n"
        "Luego, para CADA activo, una sección '## <TICKER> — <veredicto en 2-4 palabras> (convicción: "
        "Alta/Media/Baja)'. Dentro, usa estas sub-secciones con encabezado '### ':\n"
        "### Valoración — intrínseco DCF (base/optimista/conservador) vs. precio, upside, WACC y crecimiento; "
        "margen de seguridad.\n"
        "### Riesgo y probabilidad — Monte Carlo: prob. de subida a 12m, P10/mediana/P90, volatilidad anual y "
        "qué implica.\n"
        "### Técnico — tendencia (golden/death cross), RSI (sobrecompra/sobreventa), posición en el rango de "
        "52 semanas, momentum; ¿el timing acompaña a la tesis?\n"
        "### Analistas y precio objetivo — recomendación de consenso, nº de analistas, objetivo medio/alto/bajo "
        "y su upside; compáralo con el DCF.\n"
        "### Veredicto — 2-3 frases que integren todo, cita el **precio objetivo consolidado** y su upside, el "
        "score del modelo, y enumera 1-2 catalizadores y 1-2 riesgos principales.\n\n"
        "Si hay datos de portafolio, añade '## Portafolio y diversificación' comentando correlación, beneficio "
        "de diversificación y prob. de subida del conjunto.\n\n"
        "Cierra con '## Conclusión y ranking' — ordena los activos de mejor a peor posicionado por relación "
        "riesgo/recompensa, justificando con cifras, en términos educativos.\n\n"
        "Sé concreto, profesional y cuantitativo; cita SIEMPRE cifras. Omite una sub-sección solo si no hay "
        "datos para ella. Mantén un tono institucional pero claro.\n\n"
        f"Datos (JSON):\n{json.dumps(payload, ensure_ascii=False)}"
    )

    text, info = _openrouter_chat(models, [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg},
    ])
    if not text:
        raise HTTPException(status_code=502, detail=f"OpenRouter sin respuesta. {info}")
    return {"verdict": text, "model": info}


# Servir estáticos solo en local — en Railway lo hace Firebase Hosting
static_dir = os.path.dirname(os.path.abspath(__file__))
_on_railway = bool(os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("RAILWAY_SERVICE_ID"))
if not _on_railway and os.path.exists(os.path.join(static_dir, "index.html")):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    import subprocess
    import sys

    def free_port(port: int):
        try:
            result = subprocess.run(
                ["netstat", "-ano"],
                capture_output=True, text=True
            )
            for line in result.stdout.splitlines():
                if f":{port}" in line and "LISTENING" in line:
                    pid = line.strip().split()[-1]
                    subprocess.run(
                        ["taskkill", "/PID", pid, "/F"],
                        capture_output=True
                    )
                    print(f"Puerto {port} liberado (PID {pid}).")
                    break
        except Exception as e:
            print(f"No se pudo liberar el puerto {port}: {e}", file=sys.stderr)

    free_port(8000)
    uvicorn.run(app, host="127.0.0.1", port=8000)
