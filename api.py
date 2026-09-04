from fastapi import FastAPI, HTTPException, Request, Depends, Body, Response
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
    BetaAllowlist, BetaCode, BETA_CLOSED, redeem_beta_code,
    normalize_plan, require_plan, current_plan, upsert_user, utc_now, limiter, purge_user,
    UserAlert, UserNotification, AnalyticsEvent,
    current_ai_user, consume_ai_quota, ai_cache_get, ai_cache_put, ensure_writable_account,
)
import hashlib
import requests
import os
import json
import secrets
import string
import stripe
import time as _time_module
from urllib.parse import quote
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from backup_service import start_backup_scheduler

# ── Import perezoso de librerías pesadas (pandas/numpy/yfinance ≈250 MB) ───────
# Sólo se usan en endpoints de mercado. Cargarlas al primer acceso (no al boot)
# evita reservar esa RAM en un proceso que casi siempre está inactivo (beta
# cerrada). El proxy es transparente: yf.Ticker / pd.MultiIndex / np.array siguen
# funcionando igual; la importación real ocurre en la primera petición de Markets.
class _LazyModule:
    def __init__(self, name):
        object.__setattr__(self, "_name", name)
        object.__setattr__(self, "_mod", None)

    def _load(self):
        mod = object.__getattribute__(self, "_mod")
        if mod is None:
            import importlib
            mod = importlib.import_module(object.__getattribute__(self, "_name"))
            object.__setattr__(self, "_mod", mod)
        return mod

    def __getattr__(self, attr):
        return getattr(self._load(), attr)

yf = _LazyModule("yfinance")
np = _LazyModule("numpy")
pd = _LazyModule("pandas")

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
# Imágenes del reporte: metadatos diminutos y de larga vida; bytes pocos y de
# vida corta — un JPEG grande pesa cientos de KB y esto corre con la RAM justa.
_REPORT_IMG_META      = _TTLCache(maxsize=40,  ttl=86400) # 24 h — id/autor/color
_REPORT_IMG_BYTES     = _TTLCache(maxsize=12,  ttl=3600)  # 1 h  — JPEG del reporte
_BINANCE_PRICE_CACHE  = _TTLCache(maxsize=200, ttl=30)    # 30 s  — precios crypto
_TICKER_LOGO_CACHE    = _TTLCache(maxsize=300, ttl=86400) # 24 h  — URL de logo
# PNG del logo. Un logo pesa 3-15 KB, así que 150 caben en ~1.5 MB: barato
# comparado con dejar que cada fila del Tracker salga a internet por su cuenta.
_LOGO_BYTES_CACHE     = _TTLCache(maxsize=150, ttl=86400) # 24 h  — PNG de logo

_ALL_CACHES = [
    _CHART_CACHE, _SEASONALITY_CACHE_V2, _CALENDAR_CACHE_V2, _TIIE_CACHE_V2,
    _SEARCH_CACHE, _INFO_CACHE, _FINANCIALS_CACHE, _HOLDINGS_CACHE,
    _DIVIDENDS_CACHE, _NEWS_CACHE, _BINANCE_PRICE_CACHE,
    _REPORT_IMG_META, _REPORT_IMG_BYTES, _TICKER_LOGO_CACHE,
    _LOGO_BYTES_CACHE,
]

def _make_malloc_trim():
    # glibc no devuelve al SO la memoria que libera pandas/yfinance tras un
    # request; queda como "marca de agua" y la RAM idle sube y no baja. malloc_trim
    # fuerza esa devolución. Sólo aplica en Linux/glibc (Railway); no-op en local.
    try:
        import ctypes
        libc = ctypes.CDLL("libc.so.6", use_errno=True)
        return lambda: libc.malloc_trim(0)
    except Exception:
        return lambda: None

_malloc_trim = _make_malloc_trim()

def _cache_cleanup_loop():
    import threading
    def _run():
        while True:
            _time_module.sleep(600)  # cada 10 minutos
            for c in _ALL_CACHES:
                c.purge_expired()
            _malloc_trim()  # devolver RAM liberada al SO tras la limpieza
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

# Sin documentación pública: /docs, /redoc y /openapi.json expondrían el mapa
# completo del API en la URL de Railway.
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
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
async def expand_threadpool():
    # Los endpoints síncronos (def) corren en el threadpool de anyio, que por
    # defecto tiene 40 hilos; yfinance retiene un hilo 1-3 s y el chat de IA
    # hasta 45 s, así que con varios usuarios concurrentes el pool se agota.
    import anyio
    # 32 basta para la concurrencia de una beta cerrada y limita el nº de hilos
    # → menos arenas de malloc y menor marca de agua de RAM. Ajustable por env.
    tokens = max(8, int(os.environ.get("THREADPOOL_TOKENS", "32")))
    anyio.to_thread.current_default_thread_limiter().total_tokens = tokens


@app.on_event("startup")
def initialize_backup_scheduler():
    start_backup_scheduler()


@app.on_event("startup")
def initialize_alerts_scheduler():
    start_alerts_scheduler()

@app.on_event("startup")
def initialize_digest_scheduler():
    start_digest_scheduler()

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


# ── Cotización en vivo, con pre y post mercado ────────────────────────────────
# El precio NO puede salir de los cierres diarios. Yahoo publica la vela diaria
# de hoy con close=null hasta bien entrada la noche, así que tomar el último
# cierre diario devolvía el cierre de AYER como precio de hoy: el Tracker
# mostraba MSFT en 496.82 cuando cerró en 510.12 y cotizaba a 509.40 en el
# after-hours. El error iba de -3% a +2.6% según el ticker, y arrastraba a
# "Cambio hoy", "Valor actual", "Retorno" y "vs Bench.".
#
# El chart v8 con includePrePost sí trae el estado real en 1.3 KB:
#   regularMarketPrice        precio de la sesión regular (o su cierre)
#   fulldayPrice              último negociado INCLUYENDO pre/post mercado
#   regularMarketChangePercent  variación de la sesión regular
# El cierre previo se deriva de esos dos últimos porque `previousClose` no viene
# con granularidad diaria; `chartPreviousClose` queda de respaldo.
#
# Se usa `fulldayPrice` y no la última vela de 1 min: en papeles poco líquidos
# una sola operación fuera de horario se aleja varios puntos del mercado (ASR
# imprimió 263.65 con la acción en 257.03). Yahoo ya filtra eso en fulldayPrice,
# y es además el número que el usuario ve en la página de Yahoo.
_QUOTE_CACHE = _TTLCache(maxsize=400, ttl=45)   # 45 s — cotización en vivo
_ALL_CACHES.append(_QUOTE_CACHE)

_YF_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/"


def _quote_from_chart(symbol: str):
    """(precio, cierre_previo) desde el chart de Yahoo, con pre/post mercado.

    Devuelve (None, None) si Yahoo no responde o el símbolo no existe, para que
    el llamador caiga a yfinance.
    """
    sym = (symbol or "").strip().upper()
    if not sym:
        return None, None
    cached = _QUOTE_CACHE.get(sym)
    if cached is not None:
        return cached

    try:
        res = _HTTP_SESSION.get(
            _YF_CHART_URL + quote(sym, safe=""),
            params={"range": "1d", "interval": "1d", "includePrePost": "true"},
            timeout=(3, 8),
        )
        if res.status_code != 200:
            return None, None
        meta = ((res.json().get("chart") or {}).get("result") or [{}])[0].get("meta") or {}
    except Exception:
        return None, None

    regular = meta.get("regularMarketPrice")
    extended = meta.get("fulldayPrice")
    price = extended if _valid_price(extended) else regular
    if not _valid_price(price):
        return None, None

    # `chartPreviousClose` es el cierre publicado, exacto. Derivarlo del cambio
    # porcentual funciona igual de bien pero arrastra ruido de coma flotante
    # (496.82012524713423 en vez de 496.82), así que queda de último recurso.
    prev = meta.get("previousClose")
    if not _valid_price(prev):
        prev = meta.get("chartPreviousClose")
    if not _valid_price(prev):
        pct = meta.get("regularMarketChangePercent")
        if _valid_price(regular) and isinstance(pct, (int, float)) and pct == pct and pct > -100:
            prev = regular / (1 + pct / 100)

    out = (float(price), float(prev) if _valid_price(prev) else None)
    _QUOTE_CACHE.set(sym, out)
    return out


def _price_and_prev_for_ticker(symbol: str):
    """Return (price, prev_close) as floats, or (None, None) on failure."""
    if _is_crypto(symbol):
        p, prev = _crypto_price_and_prev(symbol)
        if p is not None:
            return p, prev
    p, prev = _quote_from_chart(symbol)
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
    # Tope de símbolos: sin él, una lista de miles de tickers se convierte en una
    # sola petición carísima contra Yahoo y retiene un hilo del pool.
    symbol_list = list(dict.fromkeys(
        s.strip().upper() for s in symbols.split(",") if s.strip()
    ))[:60]
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

    # Cotización en vivo (incluye pre/post mercado). Una petición por símbolo,
    # en paralelo y con caché de 45 s: Yahoo no ofrece un endpoint por lotes que
    # devuelva el precio extendido sin credenciales.
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=min(8, len(trad_syms))) as pool:
        for sym, (p, prev) in zip(trad_syms, pool.map(_quote_from_chart, trad_syms)):
            if p is not None:
                result[sym] = {"price": p, "prev": prev}

    symbol_list = [s for s in trad_syms if s not in result]
    if not symbol_list:
        return result

    # Respaldo para lo que Yahoo no cotizó en vivo: cierres diarios.
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


# ── Alertas de precio: email (SMTP pluggable) + scheduler (#5) ─────────────────
# El email es OPCIONAL: si no hay SMTP_HOST configurado, las alertas siguen
# funcionando como notificaciones in-app (degradación elegante, igual que los
# backups). Para activar el correo, define SMTP_HOST/PORT/USER/PASS/FROM.
def _send_email(to_addr: str, subject: str, body_text: str) -> bool:
    host = os.environ.get("SMTP_HOST", "").strip()
    if not host or not to_addr:
        return False
    import smtplib
    from email.message import EmailMessage
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASS", "").strip()
    sender = os.environ.get("SMTP_FROM", user or "no-reply@blackportfolio.ai").strip()
    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = sender
        msg["To"] = to_addr
        msg.set_content(body_text)
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.ehlo()
            try:
                server.starttls()
                server.ehlo()
            except Exception:
                pass
            if user and password:
                server.login(user, password)
            server.send_message(msg)
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"[alerts] email a {to_addr} falló: {exc}", flush=True)
        return False


def _evaluate_alerts_once() -> int:
    """Evalúa todas las alertas activas una vez. Devuelve cuántas se dispararon."""
    from sqlalchemy import select
    gen = get_session()
    session = next(gen)
    triggered = 0
    try:
        alerts = session.execute(
            select(UserAlert).where(UserAlert.active == True)  # noqa: E712
        ).scalars().all()
        if not alerts:
            return 0
        symbols = sorted({a.symbol for a in alerts if a.symbol})
        prices: dict[str, float] = {}
        for sym in symbols:
            p, _prev = _price_and_prev_for_ticker(sym)
            if p is not None:
                prices[sym] = float(p)
        now = utc_now()
        for a in alerts:
            price = prices.get(a.symbol)
            if price is None:
                continue
            hit = (a.kind == "price_above" and price >= a.threshold) or \
                  (a.kind == "price_below" and price <= a.threshold)
            if not hit:
                continue
            arrow = "subió a" if a.kind == "price_above" else "bajó a"
            title = f"{a.symbol} {arrow} {price:,.2f}"
            cond = "por encima de" if a.kind == "price_above" else "por debajo de"
            body = f"Tu alerta para {a.symbol} se activó: el precio ({price:,.2f}) está {cond} {a.threshold:,.2f}."
            session.add(UserNotification(
                firebase_uid=a.firebase_uid, title=title, body=body, kind="alert",
                read=False, created_at=now,
            ))
            a.active = False
            a.triggered_at = now
            triggered += 1
            owner = session.get(AppUser, a.firebase_uid)
            if owner and owner.email:
                _send_email(owner.email, f"🔔 Alerta de precio: {title}", body)
        session.commit()
        return triggered
    except Exception as exc:  # noqa: BLE001
        print(f"[alerts] evaluación falló: {exc}", flush=True)
        try:
            session.rollback()
        except Exception:
            pass
        return 0
    finally:
        try:
            gen.close()
        except Exception:
            pass


def start_alerts_scheduler() -> bool:
    if os.environ.get("ALERTS_ENABLED", "1") not in ("1", "true", "True"):
        return False
    if not os.environ.get("DATABASE_URL"):
        return False
    import threading

    interval_min = max(1, int(os.environ.get("ALERT_INTERVAL_MINUTES", "15")))

    def worker():
        # Espera inicial para no competir con el arranque
        threading.Event().wait(60)
        while True:
            try:
                n = _evaluate_alerts_once()
                if n:
                    print(f"[alerts] {n} alerta(s) disparada(s)", flush=True)
            except Exception as exc:  # noqa: BLE001
                print(f"[alerts] ciclo falló: {exc}", flush=True)
            threading.Event().wait(interval_min * 60)

    threading.Thread(target=worker, name="price-alerts", daemon=True).start()
    print(f"[alerts] scheduler iniciado (cada {interval_min} min)", flush=True)
    return True


# ── Digest semanal por email (retención) ───────────────────────────────────────
# Resumen semanal del portafolio por correo. Reusa el SMTP de las alertas y
# UserNotification (kind="digest") como marcador del último envío, así el
# scheduler sobrevive reinicios sin tabla nueva. Se desactiva con DIGEST_ENABLED=0
# o simplemente no configurando SMTP_HOST.
_DIGEST_KIND = "digest"

def _digest_summary_for_snapshot(portfolios: list, prices: dict) -> dict | None:
    """Resumen agregado de todos los portafolios de un usuario.

    `prices` es {TICKER: (precio_actual, cierre_previo|None)}. Devuelve None si
    no hay ninguna posición valuable. Los totales se agrupan por divisa para no
    sumar peras con manzanas.
    """
    totals: dict[str, dict] = {}   # currency -> {value, cost}
    movers: list[tuple[str, float]] = []  # (ticker, % día)
    n_positions = 0
    for p in (portfolios or []):
        p_currency = p.get("currency") or "USD"
        for pos in (p.get("positions") or []):
            try:
                qty = float(pos.get("quantity") or 0)
                avg = float(pos.get("avgPrice") or 0)
            except (TypeError, ValueError):
                continue
            ticker = str(pos.get("ticker") or "").upper()
            if qty <= 0 or not ticker:
                continue
            entry = prices.get(ticker)
            if not entry or entry[0] is None:
                continue
            price, prev = entry
            currency = pos.get("currency") or p_currency
            bucket = totals.setdefault(currency, {"value": 0.0, "cost": 0.0})
            bucket["value"] += qty * float(price)
            bucket["cost"] += qty * avg
            n_positions += 1
            if prev:
                try:
                    movers.append((ticker, (float(price) - float(prev)) / float(prev) * 100.0))
                except ZeroDivisionError:
                    pass
    if n_positions == 0:
        return None
    best = max(movers, key=lambda m: m[1], default=None)
    worst = min(movers, key=lambda m: m[1], default=None)
    return {"totals": totals, "best": best, "worst": worst, "positions": n_positions}


def _digest_email_body(display_name: str | None, summary: dict) -> str:
    lines = [f"Hola {display_name or 'inversor'},", "",
             "Este es el resumen semanal de tu portafolio en BlackPortfolio:", ""]
    for currency, t in summary["totals"].items():
        pnl = t["value"] - t["cost"]
        pct = (pnl / t["cost"] * 100.0) if t["cost"] else 0.0
        sign = "+" if pnl >= 0 else "−"
        lines.append(
            f"  • Valor actual: {t['value']:,.2f} {currency} — "
            f"P&L total: {sign}{abs(pnl):,.2f} {currency} ({sign}{abs(pct):.1f}%)"
        )
    lines.append(f"  • Posiciones seguidas: {summary['positions']}")
    if summary.get("best"):
        t, chg = summary["best"]
        lines.append(f"  • Mejor movimiento del día: {t} {chg:+.1f}%")
    if summary.get("worst") and summary["worst"] != summary.get("best"):
        t, chg = summary["worst"]
        lines.append(f"  • Peor movimiento del día: {t} {chg:+.1f}%")
    lines += ["",
              "Entra a tu panel para ver el análisis completo (riesgo, atribución y más):",
              "https://portify-6467f.web.app/main.html", "",
              "— BlackPortfolio",
              "Recibes este resumen por tener una cuenta con portafolio activo. "
              "Si no quieres recibirlo, responde a este correo y lo desactivamos."]
    return "\n".join(lines)


def _send_digests_once() -> int:
    """Envía el digest a los usuarios que no lo han recibido en ~1 semana."""
    from sqlalchemy import select
    from persistence import DEMO_READONLY_EMAILS
    gen = get_session()
    session = next(gen)
    sent = 0
    try:
        rows = session.execute(
            select(AppUser, PortfolioSnapshot).join(
                PortfolioSnapshot, PortfolioSnapshot.firebase_uid == AppUser.firebase_uid
            )
        ).all()
        now = utc_now()
        candidates = []
        symbols: set[str] = set()
        for user, snapshot in rows:
            email = (user.email or "").strip().lower()
            if not email or email in DEMO_READONLY_EMAILS or not user.email_verified:
                continue
            last = session.execute(
                select(UserNotification.created_at)
                .where(UserNotification.firebase_uid == user.firebase_uid,
                       UserNotification.kind == _DIGEST_KIND)
                .order_by(UserNotification.created_at.desc()).limit(1)
            ).scalar()
            if last is not None:
                if last.tzinfo is None:
                    from datetime import timezone as _tz
                    last = last.replace(tzinfo=_tz.utc)
                if (now - last).total_seconds() < 6.5 * 86400:
                    continue
            portfolios = snapshot.data if isinstance(snapshot.data, list) else []
            for p in portfolios:
                for pos in (p.get("positions") or []):
                    t = str(pos.get("ticker") or "").upper()
                    if t:
                        symbols.add(t)
            candidates.append((user, portfolios))
        if not candidates:
            return 0
        prices = {}
        for sym in sorted(symbols):
            try:
                prices[sym] = _price_and_prev_for_ticker(sym)
            except Exception:
                continue
        for user, portfolios in candidates:
            summary = _digest_summary_for_snapshot(portfolios, prices)
            if not summary:
                continue
            body = _digest_email_body(user.display_name, summary)
            if not _send_email(user.email, "📊 Tu portafolio esta semana — BlackPortfolio", body):
                continue
            session.add(UserNotification(
                firebase_uid=user.firebase_uid,
                title="Resumen semanal enviado a tu correo",
                body="Te mandamos el digest semanal de tu portafolio.",
                kind=_DIGEST_KIND, read=False, created_at=now,
            ))
            sent += 1
        session.commit()
        return sent
    except Exception as exc:  # noqa: BLE001
        print(f"[digest] envío falló: {exc}", flush=True)
        try:
            session.rollback()
        except Exception:
            pass
        return sent
    finally:
        try:
            gen.close()
        except Exception:
            pass


def start_digest_scheduler() -> bool:
    if os.environ.get("DIGEST_ENABLED", "1") not in ("1", "true", "True"):
        return False
    if not os.environ.get("DATABASE_URL") or not os.environ.get("SMTP_HOST"):
        print("[digest] desactivado: falta DATABASE_URL o SMTP_HOST", flush=True)
        return False
    import threading
    from datetime import datetime as _dt, timezone as _tz

    weekday = int(os.environ.get("DIGEST_WEEKDAY", "0"))      # 0 = lunes
    hour_utc = int(os.environ.get("DIGEST_HOUR_UTC", "13"))   # ~7-8am México

    def worker():
        threading.Event().wait(120)
        while True:
            try:
                now = _dt.now(_tz.utc)
                # La deduplicación real es por usuario (última notificación kind
                # "digest"); la ventana horaria solo evita mandar a media noche.
                if now.weekday() == weekday and now.hour == hour_utc:
                    n = _send_digests_once()
                    if n:
                        print(f"[digest] {n} resumen(es) semanal(es) enviados", flush=True)
            except Exception as exc:  # noqa: BLE001
                print(f"[digest] ciclo falló: {exc}", flush=True)
            threading.Event().wait(1800)  # cada 30 min

    threading.Thread(target=worker, name="weekly-digest", daemon=True).start()
    print(f"[digest] scheduler iniciado (weekday={weekday}, {hour_utc}:00 UTC)", flush=True)
    return True


# ── Panel de administración ───────────────────────────────────────────────────
# Solo el/los correos en ADMIN_EMAILS pueden consultar el resumen de portafolios.
# Por defecto el admin del proyecto (mismo correo que en firestore.rules).
ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.environ.get("ADMIN_EMAILS", "furielpacheco@gmail.com").split(",")
    if e.strip()
}

def require_admin(token: dict = Depends(require_2fa)) -> dict:
    # email_verified: el admin se decide por correo, así que además exigimos que
    # Firebase haya verificado ese correo (Google sign-in ya llega verificado).
    if (token.get("email") or "").lower() not in ADMIN_EMAILS or not token.get("email_verified"):
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
    ensure_writable_account(token)
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

@app.delete("/api/admin/users/{uid}")
def admin_delete_user(uid: str, token: dict = Depends(require_admin), session=Depends(get_session)):
    """Elimina un usuario por completo (PostgreSQL + Firebase Auth + allowlist).
    Tras esto, ese correo vuelve a comportarse como NO registrado."""
    if uid == token.get("uid"):
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta de admin desde aquí.")
    return purge_user(session, uid=uid)

class PurgeEmailBody(BaseModel):
    email: str = ""

@app.post("/api/admin/users/purge-by-email")
def admin_purge_user_by_email(body: PurgeEmailBody, token: dict = Depends(require_admin), session=Depends(get_session)):
    """Purga una identidad por correo, incluso si ya no tiene fila en Postgres
    (resuelve el uid desde Firebase Auth). Para limpiar cuentas de prueba que
    'siguen registradas' porque solo se borró la fila de la base de datos."""
    em = (body.email or "").strip().lower()
    if "@" not in em or len(em) > 320:
        raise HTTPException(status_code=400, detail="Correo no válido.")
    if em == (token.get("email") or "").strip().lower():
        raise HTTPException(status_code=400, detail="No puedes purgar tu propia cuenta de admin.")
    return purge_user(session, email=em)

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

# ── Analítica de producto first-party (#1) ────────────────────────────────────
# Ingesta server-side (sin servicios externos): el cliente solo manda el nombre
# del evento; uid y plan se resuelven aquí. Permite saber qué módulos usa la beta.
class AnalyticsEventBody(BaseModel):
    event: str = ""
    props: Optional[dict] = None
    path: Optional[str] = None

@app.post("/api/analytics/event")
def track_event(
    body: AnalyticsEventBody,
    token: dict = Depends(verify_firebase_user),
    session=Depends(get_session),
):
    name = (body.event or "").strip()[:60]
    if not name:
        raise HTTPException(status_code=400, detail="Falta el nombre del evento.")
    uid = token.get("uid")
    user = session.get(AppUser, uid) if uid else None
    ev = AnalyticsEvent(
        firebase_uid=uid,
        event=name,
        props=body.props if isinstance(body.props, dict) else None,
        plan=normalize_plan(user.plan) if user else None,
        path=(body.path or "").strip()[:200] or None,
        created_at=utc_now(),
    )
    session.add(ev)
    session.commit()
    return {"ok": True}

@app.get("/api/admin/analytics")
def admin_analytics(token: dict = Depends(require_admin), session=Depends(get_session)):
    from sqlalchemy import func
    from datetime import timedelta

    total = session.query(func.count(AnalyticsEvent.id)).scalar() or 0
    active_users = session.query(
        func.count(func.distinct(AnalyticsEvent.firebase_uid))
    ).scalar() or 0

    rows = (
        session.query(
            AnalyticsEvent.event,
            func.count(AnalyticsEvent.id),
            func.count(func.distinct(AnalyticsEvent.firebase_uid)),
        )
        .group_by(AnalyticsEvent.event)
        .order_by(func.count(AnalyticsEvent.id).desc())
        .all()
    )
    by_event = [{"event": e, "count": c, "users": u} for e, c, u in rows]

    # Últimos 7 días: agrupamos en Python para no depender del dialecto (SQLite/PG).
    since = utc_now() - timedelta(days=7)
    recent_rows = (
        session.query(AnalyticsEvent)
        .filter(AnalyticsEvent.created_at >= since)
        .order_by(AnalyticsEvent.created_at.desc())
        .all()
    )
    by_day: dict[str, int] = {}
    for ev in recent_rows:
        if not ev.created_at:
            continue
        day = ev.created_at.date().isoformat()
        by_day[day] = by_day.get(day, 0) + 1
    last7 = [{"day": d, "count": by_day[d]} for d in sorted(by_day.keys())]

    recent = [{
        "event": ev.event,
        "uid": ev.firebase_uid,
        "plan": ev.plan,
        "path": ev.path,
        "createdAt": ev.created_at.isoformat() if ev.created_at else None,
    } for ev in recent_rows[:40]]

    return {
        "total": total,
        "activeUsers": active_users,
        "byEvent": by_event,
        "last7Days": last7,
        "recent": recent,
    }

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


# ── Códigos de beta: el usuario los canjea al registrarse (acceso completo temporal) ─
def _gen_beta_code() -> str:
    alphabet = "".join(c for c in (string.ascii_uppercase + string.digits) if c not in "O0I1")
    return "BETA-" + "".join(secrets.choice(alphabet) for _ in range(8))

def _beta_code_dict(bc: BetaCode) -> dict:
    return {
        "code": bc.code,
        "plan": bc.plan,
        "durationDays": bc.duration_days,
        "maxRedemptions": bc.max_redemptions,
        "redemptions": bc.redemptions,
        "active": bc.active,
        "note": bc.note,
        "createdBy": bc.created_by,
        "createdAt": bc.created_at.isoformat() if bc.created_at else None,
    }

class BetaRedeemBody(BaseModel):
    code: str = ""

@app.post("/api/beta/redeem")
@limiter.limit("10/minute")
def beta_redeem(request: Request, body: BetaRedeemBody,
                token: dict = Depends(verify_firebase_user), session=Depends(get_session)):
    # Usa verify_firebase_user (no require_2fa): el usuario aún no está en la
    # allowlist, así que el gate de beta cerrada lo bloquearía antes de canjear.
    return redeem_beta_code(session, token, body.code)

class BetaCodeBody(BaseModel):
    code: str = ""
    plan: str = "Advisor Pro"
    durationDays: int = 30
    maxRedemptions: int = 1
    note: str = ""

@app.post("/api/admin/beta-codes")
def admin_create_beta_code(body: BetaCodeBody, token: dict = Depends(require_admin), session=Depends(get_session)):
    plan = normalize_plan(body.plan)
    code = (body.code or "").strip().upper() or _gen_beta_code()
    if session.get(BetaCode, code) is not None:
        raise HTTPException(status_code=409, detail="Ese código ya existe.")
    bc = BetaCode(
        code=code,
        plan=plan,
        duration_days=max(1, int(body.durationDays or 30)),
        max_redemptions=max(1, int(body.maxRedemptions or 1)),
        redemptions=0,
        active=True,
        created_by=token.get("email"),
        note=(body.note or "").strip()[:200] or None,
        created_at=utc_now(),
    )
    session.add(bc)
    session.commit()
    return _beta_code_dict(bc)

@app.get("/api/admin/beta-codes")
def admin_list_beta_codes(token: dict = Depends(require_admin), session=Depends(get_session)):
    rows = session.query(BetaCode).order_by(BetaCode.created_at.desc()).all()
    return {"codes": [_beta_code_dict(r) for r in rows]}

@app.post("/api/admin/beta-codes/{code}/deactivate")
def admin_deactivate_beta_code(code: str, token: dict = Depends(require_admin), session=Depends(get_session)):
    bc = session.get(BetaCode, (code or "").strip().upper())
    if bc is None:
        raise HTTPException(status_code=404, detail="Código no encontrado.")
    bc.active = False
    session.commit()
    return _beta_code_dict(bc)

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

RAPIDAPI_TWELVE_HOST = "twelve-data1.p.rapidapi.com"


@app.get("/api/ticker-logo/{symbol}")
@limiter.limit("120/minute")
def ticker_logo(request: Request, symbol: str):
    """URL del logo de un ticker.

    Existe para que la clave de RapidAPI no viaje al navegador: antes el
    front la llevaba incrustada y cualquiera podía extraerla del bundle.
    Devuelve siempre 200 con `url: null` cuando no hay logo — es decoración,
    un fallo aquí no debe ensuciar la consola del cliente.
    """
    sym = (symbol or "").strip().upper()[:20]
    if not sym or not all(c.isalnum() or c in ".-^=" for c in sym):
        return {"url": None}

    cached = _TICKER_LOGO_CACHE.get(sym)
    if cached is not None:
        return {"url": cached or None}
    if not RAPIDAPI_KEY:
        return {"url": None}

    try:
        res = _HTTP_SESSION.get(
            f"https://{RAPIDAPI_TWELVE_HOST}/logo",
            params={"symbol": sym},
            headers={
                "x-rapidapi-key": RAPIDAPI_KEY,
                "x-rapidapi-host": RAPIDAPI_TWELVE_HOST,
            },
            timeout=8,
        )
        url = res.json().get("url") if res.status_code == 200 else None
    except Exception:
        url = None

    # Cachea también el vacío: evita repreguntar por tickers sin logo.
    _TICKER_LOGO_CACHE.set(sym, url or "")
    return {"url": url or None}


_LOGO_UPSTREAM = "https://assets.parqet.com/logos/symbol/"
_LOGO_HEADERS = {"Cache-Control": "public, max-age=604800, immutable"}


@app.get("/api/logo/{symbol}")
@limiter.limit("240/minute")
def ticker_logo_image(request: Request, symbol: str):
    """Bytes del logo de un ticker, servidos desde aquí.

    Antes cada fila del Tracker pedía el PNG directamente al CDN del
    proveedor, así que un tercero veía la cartera completa de quien abriera
    la sección. Ahora el navegador sólo habla con esta API y el símbolo no
    sale de nuestra infraestructura salvo en esta llamada de servidor.

    El símbolo se valida contra una lista blanca de caracteres y se
    concatena a un prefijo fijo: no se acepta una URL arbitraria (SSRF).
    """
    sym = (symbol or "").strip().upper()[:20]
    if not sym or not all(c.isalnum() or c in ".-" for c in sym):
        raise HTTPException(status_code=404, detail="Simbolo no valido")
    base = sym.split(".")[0]  # el CDN indexa por raíz: FMTY14.MX → FMTY14
    if not base:
        raise HTTPException(status_code=404, detail="Simbolo no valido")

    cached = _LOGO_BYTES_CACHE.get(base)
    if cached is not None:
        if not cached:
            raise HTTPException(status_code=404, detail="Sin logo")
        return Response(content=cached, media_type="image/png", headers=_LOGO_HEADERS)

    try:
        res = _HTTP_SESSION.get(
            _LOGO_UPSTREAM + base,
            params={"format": "png", "size": 64},
            timeout=8,
        )
        ok = (res.status_code == 200 and res.content
              and res.headers.get("content-type", "").startswith("image/")
              and len(res.content) <= 300_000)
        data = res.content if ok else b""
    except Exception:
        data = b""

    # Cachea también el vacío: sin esto, una cartera con diez tickers sin
    # logo sale a internet diez veces en cada render.
    _LOGO_BYTES_CACHE.set(base, data)
    if not data:
        raise HTTPException(status_code=404, detail="Sin logo")
    return Response(content=data, media_type="image/png", headers=_LOGO_HEADERS)


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


def _chart_has_usable_closes(data) -> bool:
    """True if a Yahoo chart payload has enough real price variation to be worth
    caching. Guards against intermittent empty/flat/placeholder responses that
    would otherwise be pinned for the full cache TTL."""
    try:
        r = data["chart"]["result"][0]
        closes = [c for c in (r["indicators"]["quote"][0].get("close") or [])
                  if c is not None and c > 0]
        if len(closes) < 5:
            return False
        return (max(closes) - min(closes)) > max(closes) * 1e-6
    except Exception:
        return False


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
    # Only cache responses that carry usable price history. Yahoo intermittently
    # returns 200s with empty/flat/placeholder closes; caching those would pin the
    # bad data for the full TTL and make charts/optimizer fail across reloads.
    if _chart_has_usable_closes(data):
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


# ── Imágenes del reporte PDF (Pexels) ────────────────────────────────────────
# El navegador no puede convertir una foto de Pexels a data URI por su cuenta:
# la CSP de Firebase Hosting no lleva images.pexels.com en `connect-src`, y sin
# data URI html2canvas descarta la imagen al generar el PDF. Por eso los bytes
# salen por aquí (mismo origen que el resto de la API, ya permitido) y la clave
# de Pexels sigue sin tocar el frontend.
#
# Metadatos y bytes van en cachés separadas a propósito: los metadatos son
# diminutos y duran un día; los bytes pesan y se guardan pocos y por poco
# tiempo, para no inflar la RAM en reposo del servicio.
# Sector → búsqueda. Las CLAVES son las etiquetas que produce getTickerSector
# en main.js (SECTOR_MAP está en español); las inglesas de yfinance van también
# por si un consumidor server-side las manda. Consultas genéricas, financieras o
# arquitectónicas: nunca personas identificables ni logos de marca.
SECTOR_IMAGE_QUERIES = {
    # etiquetas de la app
    "Tecnología": "data center server room",
    "Comunicación": "fiber optic network abstract",
    "Energía": "oil refinery night",
    "Finanzas": "city skyline finance",
    "Inmobiliario": "modern architecture facade",
    "Consumo disc.": "retail store shelves",
    "Consumo básico": "supermarket aisle products",
    "Salud": "laboratory research equipment",
    "Industrial": "factory automation robotic arm",
    "Materiales": "steel mill industrial",
    "Utilities": "power transmission lines dusk",
    "Mercado amplio": "stock exchange building",
    "Internacional": "container port aerial",
    "México": "mexico city architecture",
    "Europa": "european city architecture",
    "Canadá": "toronto skyline",
    "Cash": "bank vault interior",
    # equivalentes de yfinance
    "Technology": "data center server room",
    "Communication Services": "fiber optic network abstract",
    "Energy": "oil refinery night",
    "Financial Services": "city skyline finance",
    "Real Estate": "modern architecture facade",
    "Consumer Cyclical": "retail store shelves",
    "Consumer Defensive": "supermarket aisle products",
    "Healthcare": "laboratory research equipment",
    "Industrials": "factory automation robotic arm",
    "Basic Materials": "steel mill industrial",
    "crypto": "abstract digital network",
    "etf": "stock exchange building",
}
_GENERIC_IMAGE_QUERIES = [
    "city skyline finance", "minimal architecture", "modern office glass",
    "market data screen", "abstract geometric building",
]
# Whitelist: el cliente elige *entre estas*, nunca escribe la búsqueda.
_ALLOWED_IMAGE_QUERIES = set(SECTOR_IMAGE_QUERIES.values()) | set(_GENERIC_IMAGE_QUERIES)
_PEXELS_SIZES = {"large2x", "large", "medium", "small"}


def _pexels_search(query: str, per_page: int = 6):
    """[{id, by, avg}] para una búsqueda de la whitelist. [] ante cualquier fallo."""
    if not PEXELS_KEY or query not in _ALLOWED_IMAGE_QUERIES:
        return []
    cached = _REPORT_IMG_META.get(query)
    if cached is not None:
        return cached
    try:
        res = _HTTP_SESSION.get(
            "https://api.pexels.com/v1/search",
            params={"query": query, "per_page": per_page, "orientation": "landscape"},
            headers={"Authorization": PEXELS_KEY}, timeout=10,
        )
        if res.status_code != 200:
            return []
        photos = [
            {"id": p["id"], "by": p.get("photographer", ""), "avg": p.get("avg_color") or "#8a94a6"}
            for p in res.json().get("photos", []) if p.get("id")
        ]
    except Exception:
        return []
    _REPORT_IMG_META.set(query, photos)
    return photos


@app.get("/api/report/imagery")
@limiter.limit("30/minute")
def report_imagery(request: Request, sectors: str = ""):
    """Metadatos de las fotos del reporte, por hueco de la maqueta.

    `sectors` es una lista separada por comas con los sectores dominantes del
    portafolio; se traducen a búsquedas de la whitelist. Sin bytes aquí: el
    cliente pide cada foto por id a /api/report/photo/{id}.
    """
    if not PEXELS_KEY:
        return {"slots": {}}

    wanted = [s.strip() for s in (sectors or "").split(",") if s.strip()][:3]
    queries = []
    for s in wanted:
        q = SECTOR_IMAGE_QUERIES.get(s)
        if q and q not in queries:
            queries.append(q)
    for q in _GENERIC_IMAGE_QUERIES:
        if len(queries) >= 4:
            break
        if q not in queries:
            queries.append(q)

    pool = []
    for q in queries:
        for photo in _pexels_search(q):
            if all(photo["id"] != p["id"] for p in pool):
                pool.append(photo)
    if not pool:
        return {"slots": {}}

    # Un hueco por patrón de la maqueta (ver references/pdf-document.md §5).
    slots, names = {}, ["cover", "opener", "rail", "band", "closing"]
    for i, name in enumerate(names):
        p = pool[i % len(pool)]
        slots[name] = {"id": p["id"], "by": p["by"], "avg": p["avg"]}
    return {"slots": slots}


@app.get("/api/report/photo/{photo_id}")
@limiter.limit("60/minute")
def report_photo(request: Request, photo_id: int, size: str = "large"):
    """Bytes de una foto de Pexels por id.

    El cliente sólo manda un entero: la URL real se resuelve contra la API
    oficial de Pexels, nunca se acepta una URL arbitraria (evita SSRF).
    """
    if not PEXELS_KEY:
        raise HTTPException(status_code=404, detail="Sin galería configurada")
    if size not in _PEXELS_SIZES:
        size = "large"

    key = f"{photo_id}:{size}"
    cached = _REPORT_IMG_BYTES.get(key)
    if cached is not None:
        return Response(content=cached, media_type="image/jpeg",
                        headers={"Cache-Control": "public, max-age=86400"})
    try:
        meta = _HTTP_SESSION.get(
            f"https://api.pexels.com/v1/photos/{photo_id}",
            headers={"Authorization": PEXELS_KEY}, timeout=10,
        )
        if meta.status_code != 200:
            raise HTTPException(status_code=404, detail="Foto no encontrada")
        src = (meta.json().get("src") or {}).get(size)
        if not src or not src.startswith("https://images.pexels.com/"):
            raise HTTPException(status_code=404, detail="Foto no disponible")
        img = _HTTP_SESSION.get(src, timeout=15)
        if img.status_code != 200 or not img.content:
            raise HTTPException(status_code=502, detail="No se pudo descargar la foto")
    except HTTPException:
        raise
    except Exception as e:
        raise _safe_error(e, 503, "Galería no disponible temporalmente.")

    _REPORT_IMG_BYTES.set(key, img.content)
    return Response(content=img.content, media_type="image/jpeg",
                    headers={"Cache-Control": "public, max-age=86400"})


# ── Stripe ───────────────────────────────────────────────────────────────────

# Estados en los que Stripe considera que la suscripción sigue dando derecho al
# plan. "past_due" entra a propósito: el cobro falló pero Stripe aún reintenta y
# quitarle el plan a alguien que está a media reintento es la peor experiencia
# posible. Cuando de verdad se acaba, llega subscription.deleted.
_LIVE_SUBSCRIPTION_STATES = {"active", "trialing", "past_due"}


def _has_live_subscription(user) -> bool:
    """¿La cuenta ya tiene una suscripción de Stripe vigente?

    Se consulta a Stripe, no al perfil: el perfil puede ir por detrás si un
    webhook se perdió, y de eso depende que no cobremos dos veces.
    """
    profile = user.profile_data or {}
    sub_id = profile.get("stripeSubscriptionId")
    if not sub_id or not stripe.api_key:
        return False
    try:
        sub = _to_plain(stripe.Subscription.retrieve(sub_id))
    except Exception:  # noqa: BLE001
        # Esto es una protección contra el doble cobro, no un control de acceso:
        # si Stripe no contesta, dejar comprar es mejor que dejar a un cliente
        # sin poder pagar. El duplicado, si lo hubiera, se resuelve reembolsando.
        return False
    return sub.get("status") in _LIVE_SUBSCRIPTION_STATES


# Eventos que mueven dinero o entitlement: si llegan sin una cuenta a la que
# aplicarlos, alguien pagó y no recibió su plan. No pueden pasar en silencio.
_BILLING_EVENTS_THAT_NEED_A_USER = {
    "checkout.session.completed",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
}


def _user_by_stripe_customer(session, customer_id: str):
    """Cuenta dueña de un customer de Stripe.

    Antes esto traía TODAS las filas de app_users a memoria y las recorría en
    Python en cada webhook sin uid. La consulta filtra en la base y funciona
    igual en PostgreSQL (->>) que en SQLite (json_extract).
    """
    if not customer_id:
        return None
    try:
        return session.execute(
            select(AppUser).where(
                AppUser.profile_data["stripeCustomerId"].as_string() == customer_id
            ).limit(1)
        ).scalars().first()
    except Exception as exc:  # noqa: BLE001 — dialecto sin soporte de JSON path
        logger.warning("Búsqueda por stripeCustomerId falló (%s); se recorre la tabla.", exc)
        session.rollback()
        for candidate in session.execute(select(AppUser)).scalars():
            if (candidate.profile_data or {}).get("stripeCustomerId") == customer_id:
                return candidate
        return None


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
    # `event` es un StripeObject, no un dict: no tiene .get() (ver stripe>=8).
    try:
        event_created = int(event["created"] or 0)
    except Exception:
        event_created = 0
    obj = _to_plain(event["data"]["object"])
    metadata = obj.get("metadata") or {}
    uid = metadata.get("uid") or obj.get("client_reference_id")
    customer_id = obj.get("customer")
    user = session.get(AppUser, uid) if uid else None
    if user is None and customer_id:
        user = _user_by_stripe_customer(session, customer_id)
        if user is not None:
            uid = user.firebase_uid

    if user is not None:
        profile = dict(user.profile_data or {})
        if customer_id:
            profile["stripeCustomerId"] = customer_id

        # Stripe NO garantiza el orden de entrega. Sin este freno, un
        # "subscription.updated" viejo que llega tarde revierte el estado al de
        # hace horas: el usuario paga y se queda degradado sin motivo visible.
        # Se compara contra el último evento aplicado a ESTA cuenta.
        stale = event_created and event_created < (profile.get("billingEventAt") or 0)
        if stale:
            logger.info("Webhook %s (%s) ignorado por llegar fuera de orden.", event_id, event_type)
        else:
            profile["billingEventAt"] = event_created or profile.get("billingEventAt")

            if event_type == "checkout.session.completed":
                plan = normalize_plan(metadata.get("plan"))
                # "no_payment_required" = checkout liquidado con cupón 100% off.
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
                    # El portal de Stripe permite cancelar al final del periodo:
                    # la suscripción sigue "active" pero ya tiene fecha de fin.
                    # Sin esto la app decía "Activo" y el usuario no se enteraba.
                    "cancelAtPeriodEnd": bool(obj.get("cancel_at_period_end")),
                })
                if status in {"active", "trialing"}:
                    # El plan sale del metadata de la suscripción. Si el evento
                    # llega sin él (suscripción tocada desde el panel de Stripe,
                    # creada fuera del flujo normal), normalize_plan devolvería
                    # "Explorer" y DEGRADARÍA a un cliente que está pagando. Sin
                    # plan en el evento no se toca el que ya tiene.
                    if metadata.get("plan"):
                        user.plan = normalize_plan(metadata["plan"])
                elif status in {"canceled", "unpaid", "incomplete_expired"}:
                    user.plan = "Explorer"
            elif event_type == "customer.subscription.deleted":
                user.plan = "Explorer"
                profile.update({
                    "billingStatus": "canceled",
                    "stripeSubscriptionId": obj.get("id"),
                    "cancelAtPeriodEnd": False,
                })
            elif event_type == "invoice.payment_failed":
                profile["billingStatus"] = "past_due"
            elif event_type == "invoice.paid":
                profile["billingStatus"] = "active"

        user.profile_data = profile
        user.last_seen_at = utc_now()
    elif event_type in _BILLING_EVENTS_THAT_NEED_A_USER:
        # Un cobro sin cuenta a la que aplicarlo: el usuario pagó y no recibe su
        # plan. Antes se registraba el evento y ahí moría. Hay que enterarse.
        logger.error("Webhook %s (%s) sin usuario: uid=%s customer=%s",
                     event_id, event_type, uid, customer_id)
        if _SENTRY_DSN:
            try:
                import sentry_sdk
                sentry_sdk.capture_message(
                    f"Stripe {event_type} sin usuario (uid={uid}, customer={customer_id})",
                    level="error",
                )
            except Exception:
                pass

    session.add(BillingEvent(
        stripe_event_id=event_id,
        event_type=event_type,
        firebase_uid=uid,
        created_at=utc_now(),
    ))
    try:
        session.commit()
    except IntegrityError:
        # Dos entregas del mismo evento a la vez: la clave primaria de
        # billing_events las serializa. La que pierde no reintenta nada.
        session.rollback()
        return {"received": True, "duplicate": True}
    return {"received": True}


class CheckoutRequest(BaseModel):
    plan: str = "Advisor Pro"
    billingCycle: str = "monthly"

@app.post("/api/billing/stripe/create-checkout-session")
async def stripe_create_session(
    request: Request,
    body: CheckoutRequest,
    token: dict = Depends(require_2fa),
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

        # Un segundo checkout sobre una suscripción vigente deja al usuario con
        # DOS suscripciones y dos cobros al mes. El cambio de plan se hace en el
        # portal de Stripe, que prorratea; aquí se corta antes de cobrar de más.
        if _has_live_subscription(user):
            raise HTTPException(
                status_code=409,
                detail=("Ya tienes una suscripción activa. Cambia de plan desde "
                        "Ajustes → Gestionar suscripción para no pagar dos veces."),
            )

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
    except HTTPException:
        raise  # el 409 de suscripción duplicada no es un fallo interno
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
    token: dict = Depends(require_2fa),
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

    # Una sesión de checkout conserva payment_status="paid" PARA SIEMPRE. Sin
    # esta comprobación, quien cancelara su suscripción recuperaba el plan de
    # pago gratis con solo volver a abrir success.html?session_id=… (la URL
    # sigue en su historial). El entitlement lo manda la suscripción viva, no
    # el recibo de un cobro que ya pasó.
    subscription_id = checkout.get("subscription")
    period_end = None
    cancel_at_period_end = False
    verificada = False
    if subscription_id:
        try:
            sub = _to_plain(stripe.Subscription.retrieve(subscription_id))
        except stripe.StripeError as e:
            raise HTTPException(status_code=400, detail=str(e.user_message or e))
        if sub.get("status") not in _LIVE_SUBSCRIPTION_STATES:
            raise HTTPException(
                status_code=409,
                detail="Esta suscripción ya no está vigente. Reactívala desde Ajustes.",
            )
        period_end = sub.get("current_period_end")
        cancel_at_period_end = bool(sub.get("cancel_at_period_end"))
        verificada = True

    user = upsert_user(session, token)
    user.plan = plan
    profile = dict(user.profile_data or {})
    profile.update({
        "stripeCustomerId": checkout.get("customer"),
        "stripeSubscriptionId": subscription_id,
        "billingStatus": "active",
        "billingCycle": (checkout.get("metadata") or {}).get("billing_cycle", "monthly"),
    })
    # Sin esto, la fecha de renovación quedaba en "—" hasta que Stripe mandara
    # el primer subscription.updated, que puede tardar un mes.
    if verificada:
        profile["cancelAtPeriodEnd"] = cancel_at_period_end
        if period_end is not None:
            profile["billingCurrentPeriodEnd"] = period_end
    user.profile_data = profile
    session.add(SecurityActivity(
        firebase_uid=uid, event="plan_activated",
        detail=f"plan={plan}; session={body.sessionId[:40]}", created_at=utc_now(),
    ))
    session.commit()
    return {"plan": plan, "checkoutReady": True}


@app.post("/api/billing/stripe/portal")
def stripe_customer_portal(
    token: dict = Depends(require_2fa),
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
#                       en orden hasta que uno responda. Por defecto usa Claude Sonnet
#                       vía OpenRouter; en Railway puedes reemplazarlo con otra cadena.
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL   = os.environ.get(
    "OPENROUTER_MODEL",
    "anthropic/claude-sonnet-5",
)

# ── Modelo de IA por plan ──────────────────────────────────────────────────────
# Cada plan tiene acceso a la IA, pero con un modelo distinto según su nivel.
# Orden de menor a mayor. Un plan usa su modelo y, si falla (429/404/5xx), cae a
# los modelos de planes INFERIORES (nunca a los superiores) para degradar sin
# encarecer. Cada modelo se puede sobreescribir en Railway con una variable:
#   OPENROUTER_MODEL_EXPLORER, OPENROUTER_MODEL_INVESTOR,
#   OPENROUTER_MODEL_ADVISOR_PRO, OPENROUTER_MODEL_WEALTH_DESK
_PLAN_MODEL_TIERS = [
    ("Explorer",    "google/gemini-2.5-flash-lite"),
    ("Investor",    "deepseek/deepseek-v4-flash"),
    ("Advisor Pro", "anthropic/claude-sonnet-5"),
    ("Wealth Desk", "anthropic/claude-opus-4.8"),
]
_PLAN_TIER_INDEX = {name: i for i, (name, _) in enumerate(_PLAN_MODEL_TIERS)}

def models_for_plan(plan: str) -> list[str]:
    """Devuelve la cadena de modelos de OpenRouter a intentar para un plan."""
    plan = normalize_plan(plan)
    idx = _PLAN_TIER_INDEX.get(plan, 0)
    env_key = "OPENROUTER_MODEL_" + plan.upper().replace(" ", "_")
    override = os.environ.get(env_key, "").strip()
    if override:
        top = [m.strip() for m in override.split(",") if m.strip()]
    else:
        top = [_PLAN_MODEL_TIERS[idx][1]]
    # Fallbacks: modelos de planes inferiores, de mayor a menor
    fallbacks = [_PLAN_MODEL_TIERS[i][1] for i in range(idx - 1, -1, -1)]
    chain: list[str] = []
    for m in top + fallbacks:
        if m and m not in chain:
            chain.append(m)
    return chain

class InsightsRequest(BaseModel):
    metrics: dict
    lang: str = "es"

# Límite del payload que se envía a la IA. Sin esto, un cliente podría mandar
# JSONs gigantes que se pagan como tokens de entrada en OpenRouter.
_AI_MAX_PAYLOAD_BYTES = int(os.environ.get("AI_MAX_PAYLOAD_BYTES", str(64 * 1024)))

def _ai_serialize_payload(obj) -> str:
    """Serializa el payload de la IA (orden estable para la clave de caché) y
    rechaza los que exceden el límite de tamaño."""
    text = json.dumps(obj, ensure_ascii=False, sort_keys=True)
    if len(text.encode("utf-8")) > _AI_MAX_PAYLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Los datos enviados a la IA exceden el límite de {_AI_MAX_PAYLOAD_BYTES // 1024} KB.",
        )
    return text

def _ai_cache_key(kind: str, lang: str, models: list, payload_text: str) -> str:
    top_model = models[0] if models else ""
    return hashlib.sha256(f"{kind}|{lang}|{top_model}|{payload_text}".encode("utf-8")).hexdigest()

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
                      "temperature": 0.4, "max_tokens": 2200},
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
    ai_user: dict = Depends(current_ai_user),
    session=Depends(get_session),
):
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=503, detail="AI no configurada (falta OPENROUTER_API_KEY)")

    models = models_for_plan(ai_user["plan"])
    payload_text = _ai_serialize_payload(body.metrics)
    cache_key = _ai_cache_key("insights", body.lang, models, payload_text)
    cached = ai_cache_get(session, cache_key)
    if cached:
        return {"insights": cached["text"], "model": cached["model"], "cached": True}
    consume_ai_quota(session, ai_user["uid"], ai_user["plan"])
    _lang = str(body.lang or "es")
    lang_name = "francés" if _lang.startswith("fr") else "inglés" if _lang.startswith("en") else "español"
    system_msg = (
        "Eres un analista financiero senior (CFA), objetivo y prudente, que redacta la sección de "
        "análisis de un reporte profesional para un gestor de inversión.\n"
        "Reglas de estilo y rigor:\n"
        "1) Escribe en PROSA narrativa que EXPLIQUE qué pasó con el dinero, contando una historia "
        "con causa y efecto — no listas de datos sueltos ni frases inconexas.\n"
        "2) Traduce SIEMPRE los porcentajes y los puntos de contribución (pp) a dinero real usando "
        "'capital_base_periodo', 'resultado_periodo' y 'valor_actual' en la moneda del portafolio. Di primero el dinero y luego "
        "el porcentaje: 'ganó $X (Y%)'.\n"
        "3) Cada frase debe apoyarse en una cifra concreta del JSON. Prohibido el lenguaje de plantilla "
        "y los consejos genéricos ('es importante diversificar', 'mantener una cartera equilibrada'). "
        "Si no hay dato para algo, no lo menciones.\n"
        "4) Da SIGNIFICADO a cada métrica, no la cites sin interpretar: Sharpe <1 pobre / 1-2 aceptable / "
        ">2 excelente; Sortino se lee igual pero solo penaliza caídas; HHI >0.25 = concentrado; beta >1 = "
        "más volátil que el mercado; interpreta el drawdown frente al retorno logrado.\n"
        "5) Prioriza lo material: posición >10% del portafolio, contribución >1 pp, exposición por divisa/"
        "sector/región >20%. No repartas atención por igual entre cosas irrelevantes.\n"
        "6) En atribución explica la cadena causa→efecto: por qué una posición aportó o restó "
        "('pesaba Z% y se movió W%, por eso aportó N pp ≈ $M').\n"
        "7) No das recomendaciones personalizadas de compra/venta ni garantías de rentabilidad; tus "
        "observaciones son educativas. No inventes datos que no estén en el JSON.\n"
        "8) Si existen 'ventas_realizadas', separa P&L realizado de P&L abierto; no lo mezcles con "
        "el valor actual de posiciones abiertas.\n"
        "9) Usa 'beta_actual' para hablar de la beta visible del portafolio y 'beta_historica_periodo' "
        "solo como dato metodológico del rango seleccionado.\n"
        "10) NOTICIAS: 'noticias' (si viene) es la ÚNICA fuente admisible para atribuir un movimiento a un "
        "hecho del mundo. Cita el titular con su fecha y su medio. Si una posición no trae noticia, explica "
        "su movimiento solo con sus propias cifras (peso, precio, contribución) y dilo así; jamás inventes "
        "un evento, una cifra de resultados ni una razón de mercado que no esté en esa lista.\n"
        "11) CONTRAFACTUAL: cuando exista un detractor material, calcula y menciona cuánto habría rendido el "
        "periodo sin él (resultado del periodo menos su contribución en pp). Es la frase que convierte la "
        "atribución en una decisión."
    )
    user_msg = (
        f"Analiza el siguiente portafolio y redacta el análisis en {lang_name}, en Markdown, "
        "organizado EXACTAMENTE en estas secciones con encabezado '## '. Cada sección (salvo la última) "
        "es un PÁRRAFO narrativo de 3-5 frases, NO viñetas:\n"
        "## Tesis y diagnóstico — Estado general en dinero y en perfil: capital base del periodo, "
        "valor actual, resultado del periodo (en $ y %) y qué tipo de portafolio es (riesgo, concentración, CAGR).\n"
        "## Puente del dinero — Reconstruye paso a paso qué pasó con el capital usando 'resultado_periodo', "
        "'pnl_abierto_periodo', 'pnl_realizado_ventas_periodo', 'dividendos_cobrados' y 'comisiones_totales'. "
        "Si hubo ventas, menciona el P&L realizado de esas operaciones; si no hubo, dilo brevemente sin inventar.\n"
        "## Atribución de resultados — Qué posiciones movieron la aguja, con la cadena causa→efecto "
        "(peso × movimiento → contribución en pp y en $). Nombra los mayores contribuidores y detractores "
        "de 'atribucion' y explica el porqué.\n"
        "## Riesgos clave — Concentración (HHI, top3, mayor posición), volatilidad, drawdown, VaR y riesgo "
        "divisa/sector/región. Nombra la posición, divisa o sector causante e interpreta si el nivel es alto "
        "o razonable.\n"
        "## Desempeño vs benchmark — Compara el retorno del portafolio vs el benchmark, el exceso (alpha) en "
        "pp y en $, el tracking error, la beta actual y la beta histórica del periodo. Di si se batió al mercado y a costa de cuánto riesgo "
        "relativo. Omite esta sección solo si 'comparacion_benchmark' es null.\n"
        "## Qué movió a tus posiciones — Solo si viene 'noticias'. Una viñeta por posición de la lista, en "
        "este orden y sin saltarse ninguno: **evento** (titular, medio y fecha, tal como aparece en "
        "'noticias'), **mecanismo** (por qué ese hecho mueve el precio; si el titular no lo explica, dilo y "
        "quédate en las cifras), **impacto** (cuánto aportó o restó esa posición a ESTE portafolio, en dinero "
        "y en pp) y **a vigilar** (el umbral concreto que hay que seguir). Nunca uses un titular sin cerrar "
        "con su impacto cuantificado.\n"
        "## Acciones de rebalanceo sugeridas — 2-3 viñetas concretas (qué sobreponderar o reducir y por qué), "
        "en términos educativos, sin órdenes de compra/venta personalizadas.\n\n"
        "Sé concreto y profesional. Omite una sección solo si de verdad no hay datos para ella.\n\n"
        f"Datos del portafolio (JSON):\n{json.dumps(body.metrics, ensure_ascii=False)}"
    )

    text, info = _openrouter_chat(models, [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg},
    ])
    if not text:
        raise HTTPException(status_code=502, detail=f"OpenRouter sin respuesta. {info}")
    ai_cache_put(session, cache_key, info, text)
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
    ai_user: dict = Depends(current_ai_user),
    session=Depends(get_session),
):
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=503, detail="AI no configurada (falta OPENROUTER_API_KEY)")
    if not body.assets:
        raise HTTPException(status_code=400, detail="Sin activos para analizar")

    models = models_for_plan(ai_user["plan"])
    _cache_payload = {"activos": body.assets, "portafolio": body.portfolio}
    payload_text = _ai_serialize_payload(_cache_payload)
    cache_key = _ai_cache_key("analyzer", body.lang, models, payload_text)
    cached = ai_cache_get(session, cache_key)
    if cached:
        return {"verdict": cached["text"], "model": cached["model"], "cached": True}
    consume_ai_quota(session, ai_user["uid"], ai_user["plan"])
    _lang = str(body.lang or "es")
    lang_name = "francés" if _lang.startswith("fr") else "inglés" if _lang.startswith("en") else "español"
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
    ai_cache_put(session, cache_key, info, text)
    return {"verdict": text, "model": info}


class RebalanceAIRequest(BaseModel):
    metrics: dict
    lang: str = "es"

@app.post("/api/ai/rebalance")
@limiter.limit("10/minute")
def ai_rebalance(
    request: Request,
    body: RebalanceAIRequest,
    ai_user: dict = Depends(current_ai_user),
    session=Depends(get_session),
):
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=503, detail="AI no configurada (falta OPENROUTER_API_KEY)")

    models = models_for_plan(ai_user["plan"])
    payload_text = _ai_serialize_payload(body.metrics)
    cache_key = _ai_cache_key("rebalance", body.lang, models, payload_text)
    cached = ai_cache_get(session, cache_key)
    if cached:
        return {"explanation": cached["text"], "model": cached["model"], "cached": True}
    consume_ai_quota(session, ai_user["uid"], ai_user["plan"])
    _lang = str(body.lang or "es")
    lang_name = "francés" if _lang.startswith("fr") else "inglés" if _lang.startswith("en") else "español"
    periodo = body.metrics.get("periodo", "el periodo analizado")
    system_msg = (
        "Eres un analista financiero senior (CFA), objetivo y prudente. Recibes el resultado de un "
        "optimizador de portafolio media-varianza (Markowitz) que propone una redistribución de pesos a "
        "partir de retornos, volatilidades y correlaciones históricas. Explicas, en términos educativos, "
        "por qué el rebalanceo sugerido tiene sentido. Reglas: (1) Te apoyas SIEMPRE en las cifras del JSON "
        "y las citas. (2) NUNCA inventes datos que no estén en el JSON. (3) NO das órdenes personalizadas de "
        "compra/venta ni garantías de rentabilidad. (4) Recuerda explícitamente que se basa en datos "
        "históricos y que el desempeño pasado no garantiza resultados futuros."
    )
    user_msg = (
        f"Explica el siguiente rebalanceo en {lang_name}, en Markdown, en 3-5 viñetas concretas. "
        "Comenta: (a) cómo cambia el perfil riesgo/retorno (retorno esperado, volatilidad y Sharpe) entre "
        "'actual' y 'sugerido', citando las cifras; (b) qué posiciones se sobreponderan o se reducen "
        "(usa 'movimientos': actual_pct vs sugerido_pct) y la lógica (diversificación, menor volatilidad o "
        "mejor relación rentabilidad/riesgo); (c) cierra con una advertencia breve de que se basa en datos de "
        f"{periodo} y en factores económicos vigentes, y que los rendimientos pasados no garantizan "
        "rendimientos futuros. Sé conciso, profesional y cita SIEMPRE cifras.\n\n"
        f"Datos (JSON):\n{json.dumps(body.metrics, ensure_ascii=False)}"
    )

    text, info = _openrouter_chat(models, [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg},
    ])
    if not text:
        raise HTTPException(status_code=502, detail=f"OpenRouter sin respuesta. {info}")
    ai_cache_put(session, cache_key, info, text)
    return {"explanation": text, "model": info}


# ── Asistente IA conversacional (OpenRouter · DeepSeek v4 Flash) ───────────────
# Chat del Portafolio Tracker. Recibe un snapshot del portafolio (context) y el
# historial de la conversación (messages); responde anclado SIEMPRE a esas cifras.
class ChatAIRequest(BaseModel):
    context: dict
    messages: list
    lang: str = "es"

@app.post("/api/ai/chat")
@limiter.limit("20/minute")
def ai_chat(
    request: Request,
    body: ChatAIRequest,
    ai_user: dict = Depends(current_ai_user),
    session=Depends(get_session),
):
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=503, detail="AI no configurada (falta OPENROUTER_API_KEY)")
    _ai_serialize_payload(body.context)  # solo valida tamaño; el chat no se cachea

    # Sanear el historial: solo roles válidos, recortar longitud y conservar los últimos turnos
    history = []
    for m in body.messages[-12:]:
        if not isinstance(m, dict):
            continue
        role = m.get("role")
        if role not in ("user", "assistant"):
            role = "user"
        content = str(m.get("content", "")).strip()[:4000]
        if content:
            history.append({"role": role, "content": content})
    if not history:
        raise HTTPException(status_code=400, detail="Sin mensajes")

    consume_ai_quota(session, ai_user["uid"], ai_user["plan"])
    models = models_for_plan(ai_user["plan"])
    _lang = str(body.lang or "es")
    lang_name = "francés" if _lang.startswith("fr") else "inglés" if _lang.startswith("en") else "español"
    system_msg = (
        "Eres el asistente de inversión de BlackPortfolio: un analista financiero senior (CFA), "
        "objetivo, prudente y didáctico, que conversa con el dueño de un portafolio dentro de la "
        f"aplicación. Respondes SIEMPRE en {lang_name}, de forma breve y clara (Markdown con "
        "viñetas y **negritas** cuando ayuden). Reglas estrictas: (1) Te apoyas EXCLUSIVAMENTE en "
        "los datos del portafolio del JSON de contexto y citas cifras concretas (pesos, P/L, "
        "concentración, sectores, etc.). (2) NUNCA inventes posiciones, precios ni cifras que no "
        "estén en el contexto; si falta un dato, dilo y sugiere dónde verlo en la app (pestañas "
        "Desempeño, Correlación, Monte Carlo…). (3) Ofreces observaciones educativas sobre riesgo, "
        "diversificación, concentración, atribución y estructura; NO das órdenes personalizadas de "
        "compra/venta ni garantías de rentabilidad. (4) Si preguntan algo ajeno al portafolio o a "
        "finanzas, responde con brevedad y reconduce al análisis del portafolio. (5) Al dar "
        "perspectivas a futuro, recuerda que el desempeño pasado no garantiza resultados futuros.\n\n"
        f"CONTEXTO DEL PORTAFOLIO (JSON):\n{json.dumps(body.context, ensure_ascii=False)}"
    )

    text, info = _openrouter_chat(models, [{"role": "system", "content": system_msg}] + history)
    if not text:
        raise HTTPException(status_code=502, detail=f"OpenRouter sin respuesta. {info}")
    return {"reply": text, "model": info}


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
