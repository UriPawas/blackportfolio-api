from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
from collections import OrderedDict
import requests
import yfinance as yf
import numpy as np
import pandas as pd
import os
import stripe
import time as _time_module

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

_ALL_CACHES = [
    _CHART_CACHE, _SEASONALITY_CACHE_V2, _CALENDAR_CACHE_V2, _TIIE_CACHE_V2,
    _SEARCH_CACHE, _INFO_CACHE, _FINANCIALS_CACHE, _HOLDINGS_CACHE,
    _DIVIDENDS_CACHE, _NEWS_CACHE,
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

stripe.api_key = "sk_test_51TXCZHCZ7HiRNXSJvHBpx27n0KyRK0E61XHSs297tf7JQXanCsLZKAhm0nqsz2o24oakXa5fTsAyfsMeylvlqGWG00dKIszZWb"

PLAN_PRICES = {
    "Free":               {"monthly": 0,     "yearly": 0},
    "Investor":           {"monthly": 2900,  "yearly": 2300},
    "Advisor Pro":        {"monthly": 7900,  "yearly": 6400},
    "Institutional Desk": {"monthly": 14900, "yearly": 11900},
}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/search")
def search(q: str):
    cached = _SEARCH_CACHE.get(q)
    if cached is not None:
        return cached
    url = f"https://query1.finance.yahoo.com/v1/finance/search?q={q}&quotesCount=8&newsCount=0"
    res = _HTTP_SESSION.get(url)
    data = res.json()
    _SEARCH_CACHE.set(q, data)
    return data

@app.get("/api/info/{symbol}")
def info(symbol: str):
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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/financials/{symbol}")
def financials(symbol: str):
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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/holdings/{symbol}")
def holdings(symbol: str):
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
        raise HTTPException(status_code=500, detail=str(e))

def _valid_price(v):
    return v is not None and isinstance(v, (int, float)) and v == v and v > 0

def _price_for_ticker(symbol: str):
    """Return float price or None. Tries fast_info first, then history."""
    p, _ = _price_and_prev_for_ticker(symbol)
    return p

def _price_and_prev_for_ticker(symbol: str):
    """Return (price, prev_close) as floats, or (None, None) on failure."""
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
def price(symbol: str):
    p, prev = _price_and_prev_for_ticker(symbol)
    if p is not None:
        return {"symbol": symbol, "price": p, "previousClose": prev}
    raise HTTPException(status_code=404, detail="Precio no disponible")

@app.get("/api/prices")
def prices_batch(symbols: str):
    """Batch price fetch. Returns {sym: {price, prev}} with previousClose when available."""
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not symbol_list:
        return {}
    result = {}
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

RAPIDAPI_KEY  = os.environ.get("RAPIDAPI_KEY", "03aab7a2aamsh5f6964b96339010p1ec652jsnbff2ece7211e")
PEXELS_KEY    = os.environ.get("PEXELS_API_KEY", "")
RAPIDAPI_BOND_HOST = "bond-details.p.rapidapi.com"

# ── Banxico SIE ──────────────────────────────────────────────────────────────
BANXICO_TOKEN = "475407b727d8a30912b641a7dce2924cd6156262a00a5b01b111e34d58bd8d60"
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
def banxico_bond(isin: str):
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
def bond_info(isin: str):
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
def intraday_chart(symbol: str, period: str = "1D"):
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
        raise HTTPException(status_code=503, detail=f"Error de conexión con RapidAPI: {e}")

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
def dividends(symbol: str):
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
        raise HTTPException(status_code=500, detail=str(e))


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
def stock_news(symbol: str, language: str = "es"):
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
        raise HTTPException(status_code=503, detail=str(e))

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
def calendar(symbols: str = ""):
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
def seasonality(symbol: str):
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
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chart/{symbol}")
def chart(symbol: str, range: str = "1d", interval: str = "5m"):
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
class CheckoutRequest(BaseModel):
    plan: str = "Advisor Pro"
    billingCycle: str = "monthly"
    user: Optional[dict] = None

@app.post("/api/billing/stripe/create-checkout-session")
async def stripe_create_session(request: Request, body: CheckoutRequest):
    if body.plan == "Free":
        raise HTTPException(status_code=400, detail="El plan Free no requiere pago.")
    try:
        prices = PLAN_PRICES.get(body.plan, PLAN_PRICES["Advisor Pro"])
        amount = prices["yearly"] if body.billingCycle == "yearly" else prices["monthly"]
        interval = "year" if body.billingCycle == "yearly" else "month"
        user_email = (body.user or {}).get("email")

        base = str(request.base_url).rstrip("/")
        params = dict(
            mode="subscription",
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": amount,
                    "recurring": {"interval": interval},
                    "product_data": {"name": f"BlackPortfolio {body.plan}"},
                },
                "quantity": 1,
            }],
            success_url=f"{base}/success.html?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{base}/index.html#plans",
            metadata={"plan": body.plan, "billing_cycle": body.billingCycle},
        )
        if user_email:
            params["customer_email"] = user_email

        session = stripe.checkout.Session.create(**params)
        return {"url": session.url}
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e.user_message or e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Servir archivos estáticos del frontend solo si existe index.html (modo local)
static_dir = os.path.dirname(os.path.abspath(__file__))
if os.path.exists(os.path.join(static_dir, "index.html")):
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
