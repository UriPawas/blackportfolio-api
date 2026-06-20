// ============================================================
// BlackPortfolio — Analyzer Module
// DCF Valuation · Monte Carlo Simulation · Asset Comparison
// ============================================================

const AnalyzerModule = (() => {
  "use strict";

  // ── Constants ──────────────────────────────────────────────
  const _isLocal     = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
  const API          = _isLocal ? "http://127.0.0.1:8000/api" : "https://blackportfolio-api-production.up.railway.app/api";
  const MAX_ASSETS   = 3;
  // Editable assumptions (#5) — defaults; overridable via the "Avanzado" panel
  const DEFAULTS = { RF: 0.045, ERP: 0.055, TV_GROWTH: 0.025, TAX: 0.21, PROJ_YEARS: 10 };
  let   RF           = DEFAULTS.RF;          // Risk-free rate (US 10Y Treasury)
  let   ERP          = DEFAULTS.ERP;         // Equity risk premium
  let   TV_GROWTH    = DEFAULTS.TV_GROWTH;   // Terminal growth rate (perpetuity)
  let   TAX          = DEFAULTS.TAX;         // Corporate tax rate
  let   PROJ_YEARS   = DEFAULTS.PROJ_YEARS;  // DCF horizon (years)
  const MC_SIMS      = 5000;    // Monte Carlo paths
  const MC_STEPS     = 252;     // Trading days in 1 year
  const CHART_SAMPLE = 5;       // Sample every N steps for fan chart

  const ASSET_COLORS = ["#6f86ff", "#32d6a2", "#f5b84c"];

  // ── State ───────────────────────────────────────────────────
  let assets          = [];
  let activeScenario  = "base";
  let dcfChartInst    = null;
  let mcChartInst     = null;
  let searchTimeout   = null;
  let initialized     = false;
  let lastPortfolio   = null;   // último análisis de portafolio (para el veredicto IA)

  // Caché de datos de mercado por símbolo (evita re-fetch en la misma sesión) (#2)
  const DATA_TTL   = 10 * 60 * 1000; // 10 min
  const _dataCache = new Map();
  // Persistencia (#2)
  const LS_STATE_KEY = "bp_analyzer_state";

  // ── DOM helpers ─────────────────────────────────────────────
  const $  = id  => document.getElementById(id);
  const $q = sel => document.querySelector(sel);

  // ── API ─────────────────────────────────────────────────────
  async function apiFetch(path) {
    const r = await fetch(`${API}${path}`);
    if (!r.ok) throw new Error(`HTTP ${r.status} — ${path}`);
    return r.json();
  }

  async function loadAssetData(symbol) {
    // Caché de sesión (#2) — el backend ya cachea, esto evita el round-trip de red
    const cached = _dataCache.get(symbol);
    if (cached && Date.now() - cached.ts < DATA_TTL) return cached.data;

    const [info, financials, chart] = await Promise.all([
      apiFetch(`/info/${symbol}`),
      apiFetch(`/financials/${symbol}`),
      apiFetch(`/chart/${symbol}?range=1y&interval=1d`),
    ]);
    const data = { symbol, info, financials, chart };
    _dataCache.set(symbol, data);
    return data;
  }

  // ── Asset-type guard (#5) ────────────────────────────────────
  function quoteType(info) {
    return String(info?.quoteType || "").toUpperCase();
  }
  function isEquity(info) {
    const qt = quoteType(info);
    return qt === "EQUITY" || qt === ""; // desconocido → asumir acción
  }
  function typeLabel(qt) {
    return {
      ETF: "ETF", MUTUALFUND: "fondo mutuo", CRYPTOCURRENCY: "criptomoneda",
      INDEX: "índice", CURRENCY: "divisa", FUTURE: "futuro", OPTION: "opción",
    }[qt] || "este tipo de activo";
  }

  // ── Data extraction helpers ──────────────────────────────────
  function extractRow(section, label) {
    const row = (section?.rows || []).find(r => r.label === label);
    if (!row?.values?.length) return null;
    return row.values.find(v => v !== null && v !== undefined) ?? null;
  }

  function extractRowHistory(section, label) {
    const row = (section?.rows || []).find(r => r.label === label);
    return (row?.values || []).filter(v => v !== null && v !== undefined);
  }

  function n(v, fallback = 0) {
    const x = parseFloat(v);
    return isNaN(x) || !isFinite(x) ? fallback : x;
  }

  // ── DCF ──────────────────────────────────────────────────────
  function calcWACC(info, financials) {
    const beta       = Math.max(0.5, Math.min(3.0, n(info.beta, 1.0)));
    const costOfEq   = RF + beta * ERP;

    const mktCap     = n(info.marketCap, 0);
    const totalDebt  = n(info.totalDebt, 0);
    const totalCap   = mktCap + totalDebt;
    if (totalCap === 0) return Math.max(0.08, costOfEq);

    const eqW  = mktCap    / totalCap;
    const debtW= totalDebt / totalCap;

    // Estimate cost of debt
    let costOfDebt = 0.05;
    if (totalDebt > 0) {
      const interestExp = extractRow(financials.income, "Ing. No Operativo Neto");
      if (interestExp !== null) {
        const implied = Math.abs(interestExp * 1000) / totalDebt;
        if (implied > 0.01 && implied < 0.20) costOfDebt = implied;
      }
    }

    const wacc = eqW * costOfEq + debtW * costOfDebt * (1 - TAX);
    return Math.max(0.06, Math.min(0.25, wacc));
  }

  function estimateGrowthRates(info, financials) {
    // Historical revenue CAGR from annual data
    const revHistory = extractRowHistory(financials.income, "Ingresos Totales");
    let histCAGR = 0.05;
    if (revHistory.length >= 3) {
      // Skip TTM (index 0), use next positions for annual history
      const newest = revHistory[1] ?? revHistory[0];
      const oldest = revHistory[revHistory.length - 1];
      const years  = Math.max(1, revHistory.length - 2);
      if (oldest > 0 && newest > 0) {
        histCAGR = Math.pow(newest / oldest, 1 / years) - 1;
        histCAGR = Math.max(-0.25, Math.min(0.70, histCAGR));
      }
    }

    // Analyst forward estimates (from yfinance info)
    const analystEPS = n(info.earningsGrowth,  null);
    const analystRev = n(info.revenueGrowth,   null);
    const analystFwd = analystEPS !== 0
      ? analystEPS
      : analystRev !== 0 ? analystRev : null;

    // Blend: 40% historical + 60% analyst (if available)
    const blended = analystFwd !== null
      ? histCAGR * 0.40 + analystFwd * 0.60
      : histCAGR;

    return {
      bear: Math.max(0.00, blended * 0.45),
      base: Math.max(0.01, Math.min(0.35, blended)),
      bull: Math.min(0.55, Math.max(blended * 1.50, blended + 0.06)),
    };
  }

  function getBaseFCF(financials) {
    // 1. Direct free cash flow (in thousands)
    const fcfDirect = extractRow(financials.cashflow, "Flujo Libre");
    if (fcfDirect !== null && fcfDirect > 0) return fcfDirect * 1000;

    // 2. Operating CF − CapEx
    const opCF  = extractRow(financials.cashflow, "Flujo Operativo");
    const capex = extractRow(financials.cashflow, "Cap. Inversión (CapEx)");
    if (opCF !== null) {
      const fcfCalc = (n(opCF) + n(capex, 0)) * 1000;
      if (fcfCalc > 0) return fcfCalc;
    }

    // 3. Net income proxy (conservative)
    const netInc = extractRow(financials.income, "Utilidad Neta");
    if (netInc !== null && netInc > 0) return netInc * 1000 * 0.75;

    return null;
  }

  function runDCFScenario(baseFCF, growthRates, wacc, shares, totalDebt, totalCash, key) {
    const g0     = growthRates[key];
    let   fcf    = baseFCF;
    let   pvSum  = 0;
    const pvByYear = [];

    for (let y = 1; y <= PROJ_YEARS; y++) {
      // Smooth decay from g0 → TV_GROWTH over the projection window
      const t       = (y - 1) / (PROJ_YEARS - 1);
      const growthY = g0 * (1 - t) + TV_GROWTH * t;
      fcf  *= (1 + growthY);
      const pv = fcf / Math.pow(1 + wacc, y);
      pvSum += pv;
      pvByYear.push(Math.round(pv / 1e6)); // store in $M for chart
    }

    // Gordon Growth terminal value
    const termFCF   = fcf * (1 + TV_GROWTH);
    const termVal   = termFCF / Math.max(0.001, wacc - TV_GROWTH);
    const pvTermVal = termVal / Math.pow(1 + wacc, PROJ_YEARS);

    const enterpriseVal = pvSum + pvTermVal;
    const equityVal     = enterpriseVal - totalDebt + totalCash;
    const intrinsic     = shares > 0 ? equityVal / shares : 0;

    return {
      intrinsic:   Math.max(0, intrinsic),
      pvSum,
      pvTermVal,
      enterpriseVal,
      equityVal,
      pvByYear,
      growthStart: g0,
    };
  }

  // Parametrized intrinsic value — used by the sensitivity matrix (#3)
  function computeIntrinsicValue(baseFCF, g0, wacc, tvGrowth, shares, totalDebt, totalCash) {
    if (wacc <= tvGrowth) return null; // Gordon Growth undefined
    let fcf = baseFCF, pvSum = 0;
    for (let y = 1; y <= PROJ_YEARS; y++) {
      const t       = (y - 1) / (PROJ_YEARS - 1);
      const growthY = g0 * (1 - t) + tvGrowth * t;
      fcf  *= (1 + growthY);
      pvSum += fcf / Math.pow(1 + wacc, y);
    }
    const termVal   = (fcf * (1 + tvGrowth)) / (wacc - tvGrowth);
    const pvTermVal = termVal / Math.pow(1 + wacc, PROJ_YEARS);
    const equityVal = (pvSum + pvTermVal) - totalDebt + totalCash;
    return shares > 0 ? Math.max(0, equityVal / shares) : 0;
  }

  // Build a WACC × terminal-growth grid of intrinsic values (#3)
  function buildSensitivity(asset) {
    const { dcf, info, financials } = asset;
    if (!dcf?.scenarios) return null;

    const baseFCF   = getBaseFCF(financials);
    const shares    = n(info.sharesOutstanding || info.impliedSharesOutstanding, 0);
    const totalDebt = n(info.totalDebt, 0);
    const totalCash = n(info.totalCash || info.cash, 0);
    const curPrice  = n(info.currentPrice || info.regularMarketPrice, 0);
    const g0        = dcf.growthRates.base;
    if (!baseFCF || baseFCF <= 0 || shares === 0 || curPrice === 0) return null;

    const waccAxis = [-0.02, -0.01, 0, 0.01, 0.02].map(d => dcf.wacc + d).filter(w => w > 0.02);
    const tvAxis   = [-0.01, -0.005, 0, 0.005, 0.01].map(d => TV_GROWTH + d).filter(g => g >= 0);

    const grid = waccAxis.map(w => tvAxis.map(g => {
      const iv = computeIntrinsicValue(baseFCF, g0, w, g, shares, totalDebt, totalCash);
      return iv === null ? null : { iv, upside: (iv - curPrice) / curPrice };
    }));

    return { waccAxis, tvAxis, grid, curPrice, baseWacc: dcf.wacc, baseTv: TV_GROWTH };
  }

  function runDCFAnalysis(asset) {
    const { info, financials } = asset;

    const wacc        = calcWACC(info, financials);
    const growthRates = estimateGrowthRates(info, financials);
    const baseFCF     = getBaseFCF(financials);

    if (!baseFCF || baseFCF <= 0) {
      return { error: "FCF negativo o no disponible — DCF no aplicable", wacc, growthRates };
    }

    const shares     = n(info.sharesOutstanding || info.impliedSharesOutstanding, 0);
    const totalDebt  = n(info.totalDebt, 0);
    const totalCash  = n(info.totalCash || info.cash, 0);
    const curPrice   = n(info.currentPrice || info.regularMarketPrice, 0);

    if (shares === 0 || curPrice === 0) {
      return { error: "Datos de acciones/precio insuficientes", wacc, growthRates };
    }

    const scenarios = {};
    for (const k of ["bear", "base", "bull"]) {
      const s   = runDCFScenario(baseFCF, growthRates, wacc, shares, totalDebt, totalCash, k);
      s.upside  = (s.intrinsic - curPrice) / curPrice;
      s.curPrice = curPrice;
      scenarios[k] = s;
    }

    return { scenarios, wacc, growthRates, baseFCF };
  }

  // ── Monte Carlo (Geometric Brownian Motion) ──────────────────
  function boxMuller() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  function calcHistStats(chartData) {
    // Support both { c: [...] } and raw Yahoo Finance v8 response
    const closes =
      chartData?.c ??
      chartData?.chart?.result?.[0]?.indicators?.adjclose?.[0]?.adjclose ??
      chartData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    if (!closes || closes.length < 30) return null;

    const logReturns = [];
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > 0 && closes[i - 1] > 0) {
        logReturns.push(Math.log(closes[i] / closes[i - 1]));
      }
    }
    if (logReturns.length < 20) return null;

    const m    = logReturns.length;
    const mean = logReturns.reduce((a, b) => a + b, 0) / m;
    const vari = logReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (m - 1);
    const sigD = Math.sqrt(vari);

    return {
      lastPrice:   closes[closes.length - 1],
      muAnnual:    mean  * 252,
      sigmaAnnual: sigD  * Math.sqrt(252),
      muDaily:     mean,
      sigmaDaily:  sigD,
    };
  }

  function runMonteCarlo(stats) {
    const { lastPrice, muAnnual, sigmaAnnual } = stats;
    const dt        = 1 / 252;
    const drift     = (muAnnual - 0.5 * sigmaAnnual ** 2) * dt;
    const diffusion = sigmaAnnual * Math.sqrt(dt);
    const nChartPts = Math.floor(MC_STEPS / CHART_SAMPLE) + 1;

    // Pre-allocate step buckets for fan chart (sample every CHART_SAMPLE days)
    const stepBuckets = Array.from({ length: nChartPts }, () => new Array(MC_SIMS));

    const finalPrices = new Array(MC_SIMS);

    for (let sim = 0; sim < MC_SIMS; sim++) {
      let price = lastPrice;
      stepBuckets[0][sim] = price;

      for (let t = 1; t <= MC_STEPS; t++) {
        price *= Math.exp(drift + diffusion * boxMuller());
        if (t % CHART_SAMPLE === 0) {
          stepBuckets[t / CHART_SAMPLE][sim] = price;
        }
      }
      finalPrices[sim] = price;
    }

    // Compute percentile paths
    const pctOf = (arr, pct) => {
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(MC_SIMS * pct)];
    };

    const fanPaths = { p10: [], p25: [], p50: [], p75: [], p90: [] };
    for (let i = 0; i < nChartPts; i++) {
      fanPaths.p10.push(pctOf(stepBuckets[i], 0.10));
      fanPaths.p25.push(pctOf(stepBuckets[i], 0.25));
      fanPaths.p50.push(pctOf(stepBuckets[i], 0.50));
      fanPaths.p75.push(pctOf(stepBuckets[i], 0.75));
      fanPaths.p90.push(pctOf(stepBuckets[i], 0.90));
    }

    finalPrices.sort((a, b) => a - b);

    return {
      p10:        finalPrices[Math.floor(MC_SIMS * 0.10)],
      p25:        finalPrices[Math.floor(MC_SIMS * 0.25)],
      p50:        finalPrices[Math.floor(MC_SIMS * 0.50)],
      p75:        finalPrices[Math.floor(MC_SIMS * 0.75)],
      p90:        finalPrices[Math.floor(MC_SIMS * 0.90)],
      mean:       finalPrices.reduce((a, b) => a + b, 0) / MC_SIMS,
      upsideProb: finalPrices.filter(p => p > lastPrice).length / MC_SIMS,
      fanPaths,
      nChartPts,
      currentPrice: lastPrice,
      sigmaAnnual,
      muAnnual,
    };
  }

  // ── Correlation & portfolio Monte Carlo (#4) ─────────────────
  function extractCloses(chartData) {
    return chartData?.c ??
      chartData?.chart?.result?.[0]?.indicators?.adjclose?.[0]?.adjclose ??
      chartData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? null;
  }

  function logReturnsFrom(closes) {
    const r = [];
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > 0 && closes[i - 1] > 0) r.push(Math.log(closes[i] / closes[i - 1]));
      else r.push(0);
    }
    return r;
  }

  function pearson(a, b) {
    const m = Math.min(a.length, b.length);
    if (m < 20) return 0;
    const ax = a.slice(a.length - m), bx = b.slice(b.length - m);
    const ma = ax.reduce((s, v) => s + v, 0) / m;
    const mb = bx.reduce((s, v) => s + v, 0) / m;
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < m; i++) {
      const x = ax[i] - ma, y = bx[i] - mb;
      num += x * y; da += x * x; db += y * y;
    }
    const den = Math.sqrt(da * db);
    return den === 0 ? 0 : Math.max(-1, Math.min(1, num / den));
  }

  // Cholesky decomposition of a symmetric PSD matrix → lower triangular L
  function cholesky(M) {
    const n = M.length;
    const L = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = M[i][j];
        for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
        if (i === j) L[i][j] = Math.sqrt(Math.max(1e-12, sum));
        else         L[i][j] = sum / (L[j][j] || 1e-9);
      }
    }
    return L;
  }

  // Build correlation matrix + correlated equal-weight portfolio simulation
  function runPortfolioAnalysis(validAssets) {
    const series = validAssets.map(a => {
      const closes = extractCloses(a.chart);
      return closes && closes.length >= 30 ? logReturnsFrom(closes) : null;
    });
    if (series.some(s => s === null)) return null;

    const N = validAssets.length;
    // Correlation matrix
    const corr = Array.from({ length: N }, (_, i) =>
      Array.from({ length: N }, (_, j) => i === j ? 1 : pearson(series[i], series[j]))
    );

    // Per-asset stats from each asset's MC (already computed)
    const stats = validAssets.map(a => a.mc);
    if (stats.some(s => !s)) return null;

    const weights  = new Array(N).fill(1 / N);
    const L        = cholesky(corr);
    const dt       = 1 / 252;
    const muD      = stats.map(s => s.muAnnual    * dt);
    const sigD     = stats.map(s => s.sigmaAnnual * Math.sqrt(dt));
    const driftD   = stats.map((s, i) => muD[i] - 0.5 * stats[i].sigmaAnnual ** 2 * dt);

    const finals = new Array(MC_SIMS);
    const z = new Array(N), corrZ = new Array(N), prices = new Array(N);

    for (let sim = 0; sim < MC_SIMS; sim++) {
      for (let i = 0; i < N; i++) prices[i] = 1;
      for (let t = 0; t < MC_STEPS; t++) {
        for (let i = 0; i < N; i++) z[i] = boxMuller();
        for (let i = 0; i < N; i++) {
          let c = 0;
          for (let k = 0; k <= i; k++) c += L[i][k] * z[k];
          corrZ[i] = c;
          prices[i] *= Math.exp(driftD[i] + sigD[i] * corrZ[i]);
        }
      }
      let pv = 0;
      for (let i = 0; i < N; i++) pv += weights[i] * prices[i];
      finals[sim] = pv;
    }
    finals.sort((a, b) => a - b);

    // Diversification: weighted-avg vol vs portfolio vol (analytic, annual)
    const wAvgVol = stats.reduce((s, st, i) => s + weights[i] * st.sigmaAnnual, 0);
    let portVar = 0;
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++)
        portVar += weights[i] * weights[j] * stats[i].sigmaAnnual * stats[j].sigmaAnnual * corr[i][j];
    const portVol = Math.sqrt(Math.max(0, portVar));

    const pAt = p => finals[Math.floor(MC_SIMS * p)];
    return {
      symbols:    validAssets.map(a => a.symbol),
      corr,
      p10: pAt(0.10), p50: pAt(0.50), p90: pAt(0.90),
      upsideProb: finals.filter(v => v > 1).length / MC_SIMS,
      wAvgVol, portVol,
      diversification: wAvgVol > 0 ? (wAvgVol - portVol) / wAvgVol : 0,
    };
  }

  // ── Monte Carlo en Web Worker (#3) ───────────────────────────
  let _mcWorker; // undefined = sin intentar, false = no disponible
  function getWorker() {
    if (_mcWorker === undefined) {
      try { _mcWorker = window.Worker ? new Worker("analyzer-mc.worker.js") : false; }
      catch { _mcWorker = false; }
    }
    return _mcWorker || null;
  }

  // Fallback síncrono (si no hay Worker) — reutiliza las funciones del módulo
  function runSimsInline(payload) {
    const mc = payload.assets.map(a => a.stats ? runMonteCarlo(a.stats) : null);
    const objs = payload.assets.map((a, i) => ({
      symbol: a.symbol, chart: a.closes ? { c: a.closes } : null, mc: mc[i],
    }));
    const valid = objs.filter(a => a.mc && a.chart);
    const portfolio = valid.length >= 2 ? runPortfolioAnalysis(valid) : null;
    return { mc, portfolio };
  }

  function runSimsAsync(payload) {
    return new Promise(resolve => {
      const w = getWorker();
      if (!w) { resolve(runSimsInline(payload)); return; }
      const onMsg = e => { w.removeEventListener("message", onMsg); resolve(e.data); };
      const onErr = () => { w.removeEventListener("message", onMsg); _mcWorker = false; resolve(runSimsInline(payload)); };
      w.addEventListener("message", onMsg);
      w.addEventListener("error", onErr, { once: true });
      w.postMessage(payload);
    });
  }

  // ── Technical analysis (from 1y daily closes) ────────────────
  const _clamp01 = x => Math.max(0, Math.min(1, x));

  const REC_MAP = {
    strong_buy:  { label: "Compra Fuerte", color: "#00e676" },
    buy:         { label: "Compra",        color: "#32d6a2" },
    outperform:  { label: "Superior",      color: "#32d6a2" },
    hold:        { label: "Mantener",      color: "#f5b84c" },
    neutral:     { label: "Neutral",       color: "#f5b84c" },
    underperform:{ label: "Inferior",      color: "#ff9966" },
    sell:        { label: "Venta",         color: "#ff9966" },
    strong_sell: { label: "Venta Fuerte",  color: "#ff4d6d" },
    none:        { label: "Sin consenso",  color: "#6b7280" },
  };

  function calcRSI(closes, period = 14) {
    if (!closes || closes.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const d = closes[i] - closes[i - 1];
      if (d >= 0) gains += d; else losses -= d;
    }
    const avgGain = gains / period, avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    return 100 - 100 / (1 + avgGain / avgLoss);
  }

  function sma(arr, p) {
    if (!arr || arr.length < p) return null;
    const slice = arr.slice(-p);
    return slice.reduce((a, b) => a + b, 0) / p;
  }

  function calcTechnicals(chartData, info) {
    const raw    = extractCloses(chartData);
    const closes = raw ? raw.filter(c => c > 0) : [];
    const price  = closes.length ? closes[closes.length - 1] : n(info.currentPrice || info.regularMarketPrice, 0);
    if (!price) return null;

    const sma50  = sma(closes, 50)  ?? (n(info.fiftyDayAverage, 0)       || null);
    const sma200 = sma(closes, 200) ?? (n(info.twoHundredDayAverage, 0)  || null);
    const rsi    = calcRSI(closes, 14);

    let w52High = closes.length ? Math.max(...closes) : (n(info.fiftyTwoWeekHigh, 0) || null);
    let w52Low  = closes.length ? Math.min(...closes) : (n(info.fiftyTwoWeekLow, 0)  || null);
    if (n(info.fiftyTwoWeekHigh, 0) > 0) w52High = Math.max(w52High || 0, info.fiftyTwoWeekHigh);
    if (n(info.fiftyTwoWeekLow, 0)  > 0) w52Low  = w52Low ? Math.min(w52Low, info.fiftyTwoWeekLow) : info.fiftyTwoWeekLow;

    const w52Pos = (w52High && w52Low && w52High > w52Low) ? _clamp01((price - w52Low) / (w52High - w52Low)) : null;

    // Momentum vs 1-month ago (~21 trading days)
    const mom1m = closes.length > 22 ? (price - closes[closes.length - 22]) / closes[closes.length - 22] : null;

    let trend = "neutral", trendLabel = "Lateral";
    if (sma50 && sma200) {
      if (price > sma50 && sma50 > sma200)        { trend = "bull";      trendLabel = "Alcista (Golden Cross)"; }
      else if (price < sma50 && sma50 < sma200)   { trend = "bear";      trendLabel = "Bajista (Death Cross)"; }
      else if (price > sma200)                    { trend = "bull-soft"; trendLabel = "Alcista moderada"; }
      else                                        { trend = "bear-soft"; trendLabel = "Bajista moderada"; }
    }
    const rsiZone = rsi == null ? "neutral" : rsi >= 70 ? "overbought" : rsi <= 30 ? "oversold" : "neutral";

    return { price, sma50, sma200, rsi, rsiZone, w52High, w52Low, w52Pos, mom1m, trend, trendLabel };
  }

  // ── Analyst consensus & price targets (from yfinance info) ───
  function extractAnalyst(info) {
    const price        = n(info.currentPrice || info.regularMarketPrice, 0);
    const targetMean   = n(info.targetMeanPrice, 0)   || null;
    const targetHigh   = n(info.targetHighPrice, 0)   || null;
    const targetLow    = n(info.targetLowPrice, 0)    || null;
    const targetMedian = n(info.targetMedianPrice, 0) || null;
    const recKey       = info.recommendationKey || null;
    const recMean      = n(info.recommendationMean, 0) || null;
    const numAnalysts  = n(info.numberOfAnalystOpinions, 0) || null;
    if (!targetMean && !recKey) return null;
    const upside = (targetMean && price) ? (targetMean - price) / price : null;
    return { price, targetMean, targetHigh, targetLow, targetMedian, recKey, recMean, numAnalysts, upside };
  }

  // ── Consolidated target price (blend of DCF · MC · analysts) ─
  function consolidatedTarget(asset) {
    const price = n(asset.info?.currentPrice || asset.info?.regularMarketPrice, 0);
    const parts = [];
    if (asset.dcf?.scenarios?.base?.intrinsic > 0) parts.push({ v: asset.dcf.scenarios.base.intrinsic, w: 0.40, src: "DCF" });
    if (asset.mc?.p50 > 0)                          parts.push({ v: asset.mc.p50,                       w: 0.25, src: "Monte Carlo" });
    if (asset.analyst?.targetMean > 0)              parts.push({ v: asset.analyst.targetMean,           w: 0.35, src: "Analistas" });
    if (!parts.length || !price) return null;
    const wSum   = parts.reduce((s, p) => s + p.w, 0);
    const target = parts.reduce((s, p) => s + p.v * p.w, 0) / wSum;
    return { target, upside: (target - price) / price, price, parts };
  }

  // ── Scoring / Decision ───────────────────────────────────────
  function scoreAsset(asset) {
    const dcf  = asset.dcf;
    const mc   = asset.mc;
    const info = asset.info || {};
    const tech    = asset.technicals;
    const analyst = asset.analyst;
    let score = 0;
    const signals = [];

    // DCF base scenario
    if (dcf?.scenarios?.base) {
      const up = dcf.scenarios.base.upside;
      if      (up > 0.30)  { score += 2; signals.push({ text: `DCF upside ${pct(up)} vs. precio actual`, type: "positive" }); }
      else if (up > 0.10)  { score += 1; signals.push({ text: `DCF upside moderado ${pct(up)}`, type: "positive" }); }
      else if (up > -0.10) {             signals.push({ text: `DCF cerca del precio justo (${pct(up)})`, type: "neutral" }); }
      else                 { score -= 1; signals.push({ text: `DCF sobrevaluado en ${pct(Math.abs(up))}`, type: "negative" }); }

      // Bull/bear spread as quality signal
      const spread = (dcf.scenarios.bull.intrinsic - dcf.scenarios.bear.intrinsic) / dcf.scenarios.base.curPrice;
      if (spread < 0.30) signals.push({ text: "Estimaciones con bajo rango de incertidumbre", type: "positive" });
      else if (spread > 0.80) signals.push({ text: "Alta incertidumbre en proyecciones DCF", type: "neutral" });
    }

    // Monte Carlo upside probability
    if (mc?.upsideProb !== undefined) {
      const p = mc.upsideProb;
      if      (p > 0.65)  { score += 2; signals.push({ text: `${pct(p)} probabilidad de subida (MC)`, type: "positive" }); }
      else if (p > 0.52)  { score += 1; signals.push({ text: `${pct(p)} probabilidad de subida (MC)`, type: "positive" }); }
      else if (p > 0.40)  {             signals.push({ text: `${pct(p)} probabilidad de subida (MC)`, type: "neutral" }); }
      else                { score -= 1; signals.push({ text: `Solo ${pct(p)} prob. de subida en MC`, type: "negative" }); }

      // Volatility risk
      if (mc.sigmaAnnual > 0.50) signals.push({ text: `Volatilidad muy alta: σ=${pct(mc.sigmaAnnual)}`, type: "negative" });
      else if (mc.sigmaAnnual < 0.20) signals.push({ text: `Baja volatilidad: σ=${pct(mc.sigmaAnnual)}`, type: "positive" });
    }

    // Profitability & balance
    const roe    = n(info.returnOnEquity,  null);
    const roa    = n(info.returnOnAssets,  null);
    const de     = n(info.debtToEquity,    null);
    const margin = n(info.profitMargins,   null);
    const rev_g  = n(info.revenueGrowth,   null);

    if (roe !== null)    { if (roe > 0.20)  { score += 1; signals.push({ text: `ROE sólido: ${pct(roe)}`, type: "positive" }); }
                           else if (roe < 0) { score -= 1; signals.push({ text: `ROE negativo: ${pct(roe)}`, type: "negative" }); } }
    if (de !== null)     { if (de < 0.5 && de >= 0) { score += 1; signals.push({ text: `Bajo apalancamiento D/E: ${de.toFixed(2)}`, type: "positive" }); }
                           else if (de > 2.5)        { score -= 1; signals.push({ text: `Alto apalancamiento D/E: ${de.toFixed(2)}`, type: "negative" }); } }
    if (margin !== null) { if (margin > 0.15)  { score += 1; signals.push({ text: `Margen neto: ${pct(margin)}`, type: "positive" }); }
                           else if (margin < 0) { score -= 1; signals.push({ text: `Margen neto negativo: ${pct(margin)}`, type: "negative" }); } }
    if (rev_g !== null && rev_g > 0.15) { score += 1; signals.push({ text: `Crecimiento de ingresos: ${pct(rev_g)}`, type: "positive" }); }

    // Analyst consensus & price targets
    if (analyst) {
      if (analyst.upside !== null) {
        if      (analyst.upside > 0.20)  { score += 2; signals.push({ text: `Objetivo analistas +${pct(analyst.upside)}${analyst.numAnalysts ? ` (${analyst.numAnalysts} analistas)` : ""}`, type: "positive" }); }
        else if (analyst.upside > 0.05)  { score += 1; signals.push({ text: `Objetivo analistas +${pct(analyst.upside)}`, type: "positive" }); }
        else if (analyst.upside < -0.05) { score -= 1; signals.push({ text: `Objetivo analistas ${pct(analyst.upside)} (bajo precio)`, type: "negative" }); }
      }
      if (analyst.recKey) {
        if      (["strong_buy", "buy", "outperform"].includes(analyst.recKey)) { score += 1; signals.push({ text: `Consenso Wall Street: ${(REC_MAP[analyst.recKey] || REC_MAP.none).label}`, type: "positive" }); }
        else if (["sell", "strong_sell", "underperform"].includes(analyst.recKey)) { score -= 1; signals.push({ text: `Consenso Wall Street: ${(REC_MAP[analyst.recKey] || REC_MAP.none).label}`, type: "negative" }); }
      }
    }

    // Technical trend & momentum
    if (tech) {
      if      (tech.trend === "bull") { score += 1; signals.push({ text: "Tendencia alcista (precio > SMA50 > SMA200)", type: "positive" }); }
      else if (tech.trend === "bear") { score -= 1; signals.push({ text: "Tendencia bajista (Death Cross)", type: "negative" }); }
      if (tech.rsi !== null) {
        if      (tech.rsiZone === "overbought") signals.push({ text: `RSI ${tech.rsi.toFixed(0)} — zona de sobrecompra`, type: "neutral" });
        else if (tech.rsiZone === "oversold")   signals.push({ text: `RSI ${tech.rsi.toFixed(0)} — zona de sobreventa`, type: "neutral" });
      }
    }

    const table = [
      { min:  7, label: "COMPRAR FUERTE", color: "#00e676", icon: "🚀" },
      { min:  4, label: "COMPRAR",        color: "#32d6a2", icon: "▲"  },
      { min:  1, label: "MANTENER",       color: "#f5b84c", icon: "◆"  },
      { min: -1, label: "PRECAUCIÓN",     color: "#ff9966", icon: "▼"  },
      { min: -99,label: "VENDER",         color: "#ff4d6d", icon: "⚠"  },
    ];
    const rec = table.find(r => score >= r.min) || table[table.length - 1];
    return { score, recommendation: rec, signals };
  }

  // ── Format helpers ───────────────────────────────────────────
  function fmt(v, d = 2) {
    if (v === null || v === undefined || isNaN(v)) return "N/D";
    return v.toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function pct(v, d = 1) { return `${(v * 100).toFixed(d)}%`; }
  function fmtBig(v) {
    if (!v || isNaN(v)) return "N/D";
    const a = Math.abs(v);
    if (a >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
    if (a >= 1e9)  return `$${(v / 1e9 ).toFixed(2)}B`;
    if (a >= 1e6)  return `$${(v / 1e6 ).toFixed(2)}M`;
    return `$${v.toFixed(0)}`;
  }

  // ── Render: asset cards ──────────────────────────────────────
  function renderAssetCards() {
    const el = $("analyzerAssetCards");
    if (!el) return;

    if (!assets.length) {
      el.innerHTML = `<p class="analyzer-empty-hint">Agrega hasta ${MAX_ASSETS} activos para comparar</p>`;
      return;
    }

    el.innerHTML = assets.map((a, i) => {
      const info   = a.info || {};
      const price  = n(info.currentPrice || info.regularMarketPrice, 0);
      const chg    = n(info.regularMarketChangePercent, 0) * 100;
      const name   = info.shortName || info.longName || a.symbol;
      const sector = info.sector || info.quoteType || "";
      const color  = ASSET_COLORS[i];
      const cap    = fmtBig(n(info.marketCap, 0));

      return `<div class="anlz-asset-card" style="--ac:${color}">
        <button class="anlz-asset-rm" data-sym="${a.symbol}" title="Quitar">✕</button>
        <div class="anlz-asset-sym">${a.symbol}</div>
        <div class="anlz-asset-name">${name}</div>
        <div class="anlz-asset-price">${price > 0 ? "$" + fmt(price) : "—"}</div>
        <div class="anlz-asset-chg ${chg >= 0 ? "pos" : "neg"}">${chg >= 0 ? "▲" : "▼"} ${Math.abs(chg).toFixed(2)}%</div>
        <div class="anlz-asset-meta">${sector ? sector + " · " : ""}Cap: ${cap}</div>
      </div>`;
    }).join("");

    el.querySelectorAll(".anlz-asset-rm").forEach(btn =>
      btn.addEventListener("click", () => removeAsset(btn.dataset.sym))
    );
  }

  // ── Render: DCF ──────────────────────────────────────────────
  function renderDCFResults() {
    const grid = $("dcfResultsGrid");
    if (!grid) return;

    grid.innerHTML = assets.map((a, i) => {
      const color = ASSET_COLORS[i];
      const { dcf, info, symbol } = a;

      if (!dcf || dcf.error) {
        return `<div class="anlz-dcf-card" style="--ac:${color}">
          <div class="anlz-dcf-sym">${symbol}</div>
          <div class="anlz-dcf-err">${dcf?.error || "Sin datos"}</div>
        </div>`;
      }

      const s      = dcf.scenarios[activeScenario];
      const upDir  = s.upside >= 0 ? "pos" : "neg";
      const mSafe  = dcf.scenarios.bear.upside;
      const mSafeC = mSafe >= 0 ? "pos" : "neg";

      return `<div class="anlz-dcf-card" style="--ac:${color}">
        <div class="anlz-dcf-sym">${symbol}</div>
        <div class="anlz-dcf-row">
          <div class="anlz-dcf-block">
            <span>Valor intrínseco</span>
            <strong>$${fmt(s.intrinsic)}</strong>
          </div>
          <div class="anlz-dcf-block">
            <span>Precio actual</span>
            <strong>$${fmt(s.curPrice)}</strong>
          </div>
        </div>
        <div class="anlz-dcf-upside ${upDir}">
          ${s.upside >= 0 ? "▲" : "▼"} ${pct(Math.abs(s.upside))} ${s.upside >= 0 ? "potencial upside" : "sobrevaluado"}
        </div>
        <div class="anlz-dcf-meta-row">
          <span class="anlz-tag">WACC ${pct(dcf.wacc)}</span>
          <span class="anlz-tag">g₀ ${pct(dcf.growthRates[activeScenario])}</span>
          <span class="anlz-tag anlz-tag-sm">Margen seg. (bear): <span class="${mSafeC}">${pct(mSafe)}</span></span>
        </div>
        <div class="anlz-dcf-tv-split">
          <div class="anlz-tv-bar-wrap" title="Proyecciones vs. Valor Terminal">
            <div class="anlz-tv-bar-proj" style="width:${Math.min(95, s.pvSum / (s.pvSum + s.pvTermVal) * 100).toFixed(0)}%"></div>
          </div>
          <div class="anlz-tv-labels">
            <span>Proyecciones: ${fmtBig(s.pvSum)}</span>
            <span>Valor terminal: ${fmtBig(s.pvTermVal)}</span>
          </div>
        </div>
      </div>`;
    }).join("");

    renderDCFChart();
  }

  function renderDCFChart() {
    const canvas = $("dcfWaterfallChart");
    if (!canvas || !window.Chart) return;
    if (dcfChartInst) { dcfChartInst.destroy(); dcfChartInst = null; }

    const valid = assets.filter(a => a.dcf?.scenarios);
    if (!valid.length) return;

    const labels       = valid.map(a => a.symbol);
    const scenKeys     = ["bear", "base", "bull"];
    const scenLabels   = { bear: "Conservador", base: "Base", bull: "Optimista" };
    const scenColors   = { bear: "rgba(255,77,109,0.72)", base: "rgba(111,134,255,0.82)", bull: "rgba(50,214,162,0.72)" };

    const datasets = [
      {
        label: "Precio actual",
        data: valid.map(a => n(a.info.currentPrice || a.info.regularMarketPrice, 0)),
        backgroundColor: "rgba(255,255,255,0.12)",
        borderColor: "rgba(255,255,255,0.45)",
        borderWidth: 2,
        borderDash: [5, 3],
        borderSkipped: false,
        borderRadius: 4,
      },
      ...scenKeys.map(k => ({
        label: scenLabels[k],
        data: valid.map(a => a.dcf.scenarios[k]?.intrinsic ?? 0),
        backgroundColor: scenColors[k],
        borderRadius: 6,
        borderSkipped: false,
      })),
    ];

    dcfChartInst = new window.Chart(canvas, {
      type: "bar",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: "#b0b8c8", font: { size: 12, family: "Inter" } } },
          tooltip: { callbacks: { label: c => `${c.dataset.label}: $${c.parsed.y.toFixed(2)}` } },
        },
        scales: {
          x: { ticks: { color: "#8892a4", font: { size: 12 } }, grid: { color: "rgba(255,255,255,0.05)" } },
          y: { ticks: { color: "#8892a4", callback: v => `$${v.toFixed(0)}` }, grid: { color: "rgba(255,255,255,0.05)" } },
        },
      },
    });
  }

  // ── Render: Monte Carlo ──────────────────────────────────────
  function renderMCResults() {
    const grid = $("mcResultsGrid");
    if (!grid) return;

    grid.innerHTML = assets.map((a, i) => {
      const color = ASSET_COLORS[i];
      const { mc, symbol } = a;

      if (!mc) {
        return `<div class="anlz-mc-card" style="--ac:${color}">
          <div class="anlz-mc-sym">${symbol}</div>
          <div class="anlz-dcf-err">Datos históricos insuficientes</div>
        </div>`;
      }

      const probC = mc.upsideProb > 0.55 ? "pos" : mc.upsideProb < 0.45 ? "neg" : "neutral";
      const skew  = (mc.mean - mc.p50) / mc.p50; // positive = right-skewed (good)
      const skewLabel = skew > 0.02 ? "Sesgo positivo" : skew < -0.02 ? "Sesgo negativo" : "Distribución simétrica";

      return `<div class="anlz-mc-card" style="--ac:${color}">
        <div class="anlz-mc-sym">${symbol}</div>
        <div class="anlz-mc-prob ${probC}">${pct(mc.upsideProb, 1)}<span>prob. de subida</span></div>
        <div class="anlz-mc-pcts">
          <div class="anlz-mc-pct"><span>P10</span><strong>$${fmt(mc.p10)}</strong></div>
          <div class="anlz-mc-pct anlz-mc-mid"><span>Mediana</span><strong>$${fmt(mc.p50)}</strong></div>
          <div class="anlz-mc-pct"><span>P90</span><strong>$${fmt(mc.p90)}</strong></div>
        </div>
        <div class="anlz-mc-meta-row">
          <span class="anlz-tag">σ anual ${pct(mc.sigmaAnnual)}</span>
          <span class="anlz-tag">μ anual ${pct(mc.muAnnual)}</span>
          <span class="anlz-tag anlz-tag-sm">${skewLabel}</span>
        </div>
      </div>`;
    }).join("");

    renderMCChart();
  }

  function renderMCChart() {
    const canvas = $("monteCarloChart");
    if (!canvas || !window.Chart) return;
    if (mcChartInst) { mcChartInst.destroy(); mcChartInst = null; }

    const valid = assets.filter(a => a.mc?.fanPaths);
    if (!valid.length) return;

    const nPts    = valid[0].mc.nChartPts;
    const labels  = Array.from({ length: nPts }, (_, k) => {
      const d = k * CHART_SAMPLE;
      return d % (CHART_SAMPLE * 10) === 0 ? `${Math.round(d / 21)}M` : "";
    });

    const datasets = [];
    valid.forEach((a, i) => {
      const { mc, symbol } = a;
      const c = ASSET_COLORS[i];

      if (i === 0) {
        // Full fan for the first (or only) asset
        datasets.push({ label: `${symbol} P90`,    data: mc.fanPaths.p90, borderColor: `${c}88`, borderWidth: 1, borderDash: [4,3], fill: "+2", backgroundColor: `${c}14`, tension: 0.4, pointRadius: 0 });
        datasets.push({ label: `${symbol} P75`,    data: mc.fanPaths.p75, borderColor: `${c}aa`, borderWidth: 1, fill: "+1",  backgroundColor: `${c}22`, tension: 0.4, pointRadius: 0 });
        datasets.push({ label: `${symbol} Mediana`,data: mc.fanPaths.p50, borderColor: c, borderWidth: 2.5, fill: false, backgroundColor: "transparent", tension: 0.4, pointRadius: 0 });
        datasets.push({ label: `${symbol} P25`,    data: mc.fanPaths.p25, borderColor: `${c}aa`, borderWidth: 1, fill: false, backgroundColor: "transparent", tension: 0.4, pointRadius: 0 });
        datasets.push({ label: `${symbol} P10`,    data: mc.fanPaths.p10, borderColor: `${c}88`, borderWidth: 1, borderDash: [4,3], fill: false, backgroundColor: "transparent", tension: 0.4, pointRadius: 0 });
      } else {
        // Only median for other assets
        datasets.push({ label: `${symbol} Mediana`, data: mc.fanPaths.p50, borderColor: c, borderWidth: 2.5, fill: false, tension: 0.4, pointRadius: 0 });
      }
    });

    mcChartInst = new window.Chart(canvas, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            labels: {
              color: "#b0b8c8",
              font: { size: 11, family: "Inter" },
              filter: item => item.text.includes("Mediana") || item.text.includes("P90") || item.text.includes("P10"),
            },
          },
          tooltip: { callbacks: { label: c => `${c.dataset.label}: $${c.parsed.y.toFixed(2)}` } },
        },
        scales: {
          x: { ticks: { color: "#8892a4", maxTicksLimit: 13 }, grid: { color: "rgba(255,255,255,0.04)" } },
          y: { ticks: { color: "#8892a4", callback: v => `$${v.toFixed(0)}` }, grid: { color: "rgba(255,255,255,0.04)" } },
        },
      },
    });
  }

  // ── Render: DCF sensitivity matrix (#3) ──────────────────────
  function upsideColor(up) {
    // Clamp to ±50% for the color ramp
    const x = Math.max(-0.5, Math.min(0.5, up)) / 0.5;
    if (x >= 0) return `rgba(50,214,162,${(0.10 + x * 0.45).toFixed(3)})`;
    return `rgba(255,77,109,${(0.10 + (-x) * 0.45).toFixed(3)})`;
  }

  function renderSensitivity() {
    const grid = $("sensitivityGrid");
    if (!grid) return;

    const valid = assets.filter(a => a.sensitivity);
    if (!valid.length) {
      grid.innerHTML = `<p class="analyzer-empty-hint">Sensibilidad no disponible (datos de FCF insuficientes)</p>`;
      return;
    }

    grid.innerHTML = valid.map((a, idx) => {
      const i = assets.indexOf(a);
      const color = ASSET_COLORS[i];
      const s = a.sensitivity;

      const head = s.tvAxis.map(g => `<th>g ${pct(g, 1)}</th>`).join("");
      const rows = s.waccAxis.map((w, ri) => {
        const cells = s.grid[ri].map(cell => {
          if (!cell) return `<td class="sens-na">—</td>`;
          const isBase = Math.abs(w - s.baseWacc) < 1e-9;
          return `<td style="background:${upsideColor(cell.upside)}" title="Upside ${pct(cell.upside)}">
            <strong>$${fmt(cell.iv, 0)}</strong><span>${cell.upside >= 0 ? "+" : ""}${pct(cell.upside, 0)}</span>
          </td>`;
        }).join("");
        return `<tr><th class="sens-wacc">WACC ${pct(w, 1)}</th>${cells}</tr>`;
      }).join("");

      return `<div class="anlz-sens-card" style="--ac:${color}">
        <div class="anlz-sens-sym">${a.symbol} <span class="anlz-sens-cur">Precio actual $${fmt(s.curPrice)}</span></div>
        <div class="anlz-sens-scroll">
          <table class="anlz-sens-table">
            <thead><tr><th class="sens-corner">WACC \\ g</th>${head}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
    }).join("");
  }

  // ── Render: correlation & portfolio MC (#4) ──────────────────
  function corrColor(v) {
    if (v >= 0) return `rgba(255,77,109,${(0.08 + v * 0.5).toFixed(3)})`;   // high corr = red (bad for diversification)
    return `rgba(50,214,162,${(0.08 + (-v) * 0.5).toFixed(3)})`;            // negative corr = green
  }

  function renderCorrelation(port) {
    const section = $("correlationSection");
    if (!section) return;

    if (!port || port.symbols.length < 2) { section.classList.add("hidden"); return; }
    section.classList.remove("hidden");

    const syms = port.symbols;
    const head = syms.map((s, i) => `<th style="color:${ASSET_COLORS[i]}">${s}</th>`).join("");
    const rows = syms.map((s, ri) => {
      const cells = port.corr[ri].map((v, ci) =>
        ri === ci
          ? `<td class="corr-diag">1.00</td>`
          : `<td style="background:${corrColor(v)}">${v.toFixed(2)}</td>`
      ).join("");
      return `<tr><th style="color:${ASSET_COLORS[ri]}">${s}</th>${cells}</tr>`;
    }).join("");

    const divPct  = pct(port.diversification, 1);
    const probC   = port.upsideProb > 0.55 ? "pos" : port.upsideProb < 0.45 ? "neg" : "neutral";

    const grid = $("correlationGrid");
    if (grid) grid.innerHTML = `
      <div class="anlz-corr-matrix-wrap">
        <table class="anlz-corr-table">
          <thead><tr><th class="corr-corner"></th>${head}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="anlz-corr-hint">Correlación de retornos diarios (1 año). Verde = baja/negativa (mejor diversificación), rojo = alta.</p>
      </div>
      <div class="anlz-port-stats">
        <div class="anlz-port-stat">
          <span>Beneficio de diversificación</span>
          <strong class="pos">−${divPct} riesgo</strong>
          <small>Vol. portafolio ${pct(port.portVol)} vs. promedio ponderado ${pct(port.wAvgVol)}</small>
        </div>
        <div class="anlz-port-stat">
          <span>Portafolio equiponderado (12m, MC correlacionado)</span>
          <strong class="${probC}">${pct(port.upsideProb)} prob. de subida</strong>
          <small>Retorno P10 ${pct(port.p10 - 1)} · Mediana ${pct(port.p50 - 1)} · P90 ${pct(port.p90 - 1)}</small>
        </div>
      </div>`;
  }

  // ── Render: comparison table ─────────────────────────────────
  function renderComparisonTable() {
    const wrap = $("comparisonTable");
    if (!wrap || !assets.length) return;

    const metrics = [
      { key: "trailingPE",                         label: "P/E (TTM)",          fmt: v => v > 0 ? fmt(v,1) : "N/D",         lowerBetter: true  },
      { key: "forwardPE",                           label: "P/E Forward",        fmt: v => v > 0 ? fmt(v,1) : "N/D",         lowerBetter: true  },
      { key: "priceToBook",                         label: "P/B",                fmt: v => v > 0 ? fmt(v,2) : "N/D",         lowerBetter: true  },
      { key: "priceToSalesTrailingTwelveMonths",    label: "P/S (TTM)",          fmt: v => v > 0 ? fmt(v,2) : "N/D",         lowerBetter: true  },
      { key: "enterpriseToEbitda",                  label: "EV/EBITDA",          fmt: v => v > 0 ? fmt(v,1) : "N/D",         lowerBetter: true  },
      { key: "returnOnEquity",                      label: "ROE",                fmt: v => v != null ? pct(v) : "N/D",        lowerBetter: false },
      { key: "returnOnAssets",                      label: "ROA",                fmt: v => v != null ? pct(v) : "N/D",        lowerBetter: false },
      { key: "profitMargins",                       label: "Margen neto",        fmt: v => v != null ? pct(v) : "N/D",        lowerBetter: false },
      { key: "grossMargins",                        label: "Margen bruto",       fmt: v => v != null ? pct(v) : "N/D",        lowerBetter: false },
      { key: "operatingMargins",                    label: "Margen operativo",   fmt: v => v != null ? pct(v) : "N/D",        lowerBetter: false },
      { key: "debtToEquity",                        label: "Deuda/Capital",      fmt: v => v != null ? fmt(v,2) : "N/D",      lowerBetter: true  },
      { key: "currentRatio",                        label: "Ratio corriente",    fmt: v => v > 0 ? fmt(v,2) : "N/D",         lowerBetter: false },
      { key: "revenueGrowth",                       label: "Crecim. ingresos",   fmt: v => v != null ? pct(v) : "N/D",        lowerBetter: false },
      { key: "earningsGrowth",                      label: "Crecim. utilidades", fmt: v => v != null ? pct(v) : "N/D",        lowerBetter: false },
      { key: "beta",                                label: "Beta",               fmt: v => v != null ? fmt(v,2) : "N/D",      lowerBetter: true  },
      { key: "dividendYield",                       label: "Rend. dividendo",    fmt: v => v > 0 ? pct(v,2) : "—",           lowerBetter: false },
      { key: "freeCashflow",                        label: "FCF",                fmt: v => v != null ? fmtBig(v) : "N/D",     lowerBetter: false },
    ];

    const headerRow = `<div class="cmp-row cmp-header">
      <div class="cmp-cell cmp-metric-cell">Métrica</div>
      ${assets.map((a, i) => `<div class="cmp-cell" style="color:${ASSET_COLORS[i]};font-weight:600">${a.symbol}</div>`).join("")}
    </div>`;

    const dataRows = metrics.map(m => {
      const rawVals = assets.map(a => {
        const v = a.info[m.key];
        return (v !== undefined && v !== null) ? parseFloat(v) : null;
      });

      // Determine best value
      const validNums = rawVals.filter(v => v !== null && !isNaN(v));
      let bestVal = null;
      if (validNums.length > 1) {
        bestVal = m.lowerBetter ? Math.min(...validNums) : Math.max(...validNums);
        // If best is 0 or negative and lowerBetter=false, skip highlighting
        if (!m.lowerBetter && bestVal <= 0) bestVal = null;
        if (m.lowerBetter && bestVal <= 0) bestVal = null;
      }

      const cells = rawVals.map((v, i) => {
        const formatted = m.fmt(v);
        const isBest    = bestVal !== null && v !== null && Math.abs(v - bestVal) < 1e-9 && formatted !== "N/D";
        return `<div class="cmp-cell ${isBest ? "cmp-best" : ""}">${formatted}</div>`;
      }).join("");

      return `<div class="cmp-row"><div class="cmp-cell cmp-metric-cell">${m.label}</div>${cells}</div>`;
    }).join("");

    wrap.setAttribute("data-cols", assets.length);
    wrap.innerHTML = `<div class="cmp-table" style="--cols:${assets.length}">${headerRow}${dataRows}</div>`;
  }

  // ── Render: analyst consensus & technical analysis ───────────
  function renderAnalystTechnical() {
    const grid = $("analystTechGrid");
    if (!grid) return;

    grid.innerHTML = assets.map((a, i) => {
      const color = ASSET_COLORS[i];
      const t     = a.technicals;
      const an    = a.analyst;
      const price = n(a.info?.currentPrice || a.info?.regularMarketPrice, 0);

      if (!t && !an) {
        return `<div class="anlz-at-card" style="--ac:${color}">
          <div class="anlz-at-sym">${a.symbol}</div>
          <div class="anlz-dcf-err">Sin datos técnicos ni de analistas</div>
        </div>`;
      }

      // ── Analyst block ──
      let analystHtml = `<div class="anlz-at-empty">Sin cobertura de analistas</div>`;
      if (an && an.targetMean) {
        const rec   = REC_MAP[an.recKey] || REC_MAP.none;
        const lo    = an.targetLow  || Math.min(an.targetMean, price || an.targetMean);
        const hi    = an.targetHigh || Math.max(an.targetMean, price || an.targetMean);
        const range = (hi - lo) || 1;
        const posMean  = _clamp01((an.targetMean - lo) / range) * 100;
        const posPrice = price ? _clamp01((price - lo) / range) * 100 : null;
        analystHtml = `
          <div class="anlz-at-rec" style="color:${rec.color};border-color:${rec.color}44;background:${rec.color}14">
            ${rec.label}${an.numAnalysts ? ` · ${an.numAnalysts} analistas` : ""}
          </div>
          <div class="anlz-at-target">
            <div class="anlz-at-bar">
              ${posPrice !== null ? `<span class="anlz-at-bar-price" style="left:${posPrice}%" title="Precio actual $${fmt(price)}"></span>` : ""}
              <span class="anlz-at-bar-mean" style="left:${posMean}%" title="Objetivo medio $${fmt(an.targetMean)}"></span>
            </div>
            <div class="anlz-at-bar-labels">
              <span>$${fmt(lo)}</span>
              <span class="anlz-at-bar-mid">obj. $${fmt(an.targetMean)}</span>
              <span>$${fmt(hi)}</span>
            </div>
          </div>
          ${an.upside !== null ? `<div class="anlz-at-upside ${an.upside >= 0 ? "pos" : "neg"}">${an.upside >= 0 ? "▲" : "▼"} ${pct(Math.abs(an.upside))} vs. precio actual $${fmt(price)}</div>` : ""}`;
      }

      // ── Technical block ──
      let techHtml = `<div class="anlz-at-empty">Datos técnicos insuficientes</div>`;
      if (t) {
        const trendColor = t.trend.startsWith("bull") ? "#32d6a2" : t.trend.startsWith("bear") ? "#ff4d6d" : "#f5b84c";
        const rsiColor   = t.rsiZone === "overbought" ? "#ff9966" : t.rsiZone === "oversold" ? "#32d6a2" : "#6f86ff";
        const momColor   = t.mom1m == null ? "" : t.mom1m >= 0 ? "pos" : "neg";
        techHtml = `
          <div class="anlz-at-tech">
            <div class="anlz-at-ti"><span>Tendencia</span><strong style="color:${trendColor}">${t.trendLabel}</strong></div>
            ${t.rsi != null   ? `<div class="anlz-at-ti"><span>RSI (14)</span><strong style="color:${rsiColor}">${t.rsi.toFixed(0)}</strong></div>` : ""}
            ${t.mom1m != null ? `<div class="anlz-at-ti"><span>Momentum 1M</span><strong class="${momColor}">${t.mom1m >= 0 ? "+" : ""}${pct(t.mom1m)}</strong></div>` : ""}
            ${t.sma50  ? `<div class="anlz-at-ti"><span>SMA 50</span><strong>$${fmt(t.sma50)}</strong></div>` : ""}
            ${t.sma200 ? `<div class="anlz-at-ti"><span>SMA 200</span><strong>$${fmt(t.sma200)}</strong></div>` : ""}
          </div>
          ${t.w52Pos != null ? `
          <div class="anlz-at-52">
            <div class="anlz-at-52-track"><span class="anlz-at-52-fill" style="width:${t.w52Pos * 100}%"></span></div>
            <div class="anlz-at-52-labels">
              <span>$${fmt(t.w52Low)}</span>
              <span class="anlz-at-52-pos">${pct(t.w52Pos, 0)} del rango 52s</span>
              <span>$${fmt(t.w52High)}</span>
            </div>
          </div>` : ""}`;
      }

      return `<div class="anlz-at-card" style="--ac:${color}">
        <div class="anlz-at-sym">${a.symbol}</div>
        <div class="anlz-at-label">Consenso de analistas</div>
        ${analystHtml}
        <div class="anlz-at-label">Análisis técnico</div>
        ${techHtml}
      </div>`;
    }).join("");
  }

  // ── Render: decision panel ───────────────────────────────────
  function renderDecisionPanel() {
    const grid = $("decisionGrid");
    if (!grid) return;

    grid.innerHTML = assets.map((a, i) => {
      const { symbol, info, dcf, mc } = a;
      const { score, recommendation: rec, signals } = scoreAsset(a);
      const color  = ASSET_COLORS[i];
      const name   = info?.shortName || info?.longName || symbol;
      const pctBar = Math.max(4, Math.min(100, Math.round(((score + 8) / 20) * 100)));
      const ct     = consolidatedTarget(a);

      const sigHtml = signals.slice(0, 8).map(s =>
        `<div class="anlz-signal anlz-signal-${s.type}">
          <span class="anlz-sig-dot"></span>${s.text}
        </div>`
      ).join("");

      const targetHtml = ct ? `
        <div class="anlz-dec-target">
          <div class="anlz-dec-target-main">
            <span>Precio objetivo consolidado</span>
            <strong>$${fmt(ct.target)} <em class="${ct.upside >= 0 ? "pos" : "neg"}">${ct.upside >= 0 ? "▲ +" : "▼ "}${pct(Math.abs(ct.upside))}</em></strong>
          </div>
          <div class="anlz-dec-target-srcs">${ct.parts.map(p => `<span title="${p.src}">${p.src}: $${fmt(p.v)}</span>`).join("")}</div>
        </div>` : "";

      return `<div class="anlz-decision-item" style="--ac:${color}">
        <div class="anlz-dec-top">
          <div>
            <div class="anlz-dec-sym">${symbol}</div>
            <div class="anlz-dec-name">${name}</div>
          </div>
          <div class="anlz-rec-badge" style="color:${rec.color};border-color:${rec.color}30;background:${rec.color}10">
            <span>${rec.icon}</span> ${rec.label}
          </div>
        </div>
        <div class="anlz-score-row">
          <div class="anlz-score-track">
            <div class="anlz-score-fill" style="width:${pctBar}%;background:${rec.color}"></div>
          </div>
          <span class="anlz-score-num">Score: ${score > 0 ? "+" : ""}${score}</span>
        </div>
        ${targetHtml}
        <div class="anlz-signals">${sigHtml}</div>
      </div>`;
    }).join("");
  }

  // ── Search ───────────────────────────────────────────────────
  async function fetchSuggestions(query) {
    try {
      const data = await apiFetch(`/search?q=${encodeURIComponent(query)}`);
      return (data.quotes || []).filter(q => q.isYahooFinance).slice(0, 6);
    } catch { return []; }
  }

  function renderSuggestions(list) {
    const box = $("analyzerSuggestions");
    if (!box) return;
    if (!list.length) { box.classList.add("hidden"); return; }

    box.innerHTML = list.map(s =>
      `<div class="anlz-sugg-item" data-sym="${s.symbol}">
        <span class="anlz-sugg-sym">${s.symbol}</span>
        <span class="anlz-sugg-name">${s.shortname || s.longname || ""}</span>
        <span class="anlz-sugg-type">${s.quoteType || ""}</span>
      </div>`
    ).join("");
    box.classList.remove("hidden");

    box.querySelectorAll(".anlz-sugg-item").forEach(item =>
      item.addEventListener("click", () => addAsset(item.dataset.sym))
    );
  }

  function updateRunBtn() {
    const btn = $("analyzerRunBtn");
    if (!btn) return;
    btn.disabled    = assets.length === 0;
    btn.textContent = assets.length > 0
      ? `Analizar ${assets.length} activo${assets.length > 1 ? "s" : ""}`
      : "Agrega activos para analizar";
  }

  function toast(msg) {
    const el = Object.assign(document.createElement("div"), { className: "anlz-toast", textContent: msg });
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 2400);
  }

  function addAsset(symbol) {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    $("analyzerInput").value = "";
    $("analyzerSuggestions").classList.add("hidden");

    if (assets.length >= MAX_ASSETS) { toast(`Máximo ${MAX_ASSETS} activos`); return; }
    if (assets.find(a => a.symbol === sym)) { toast(`${sym} ya está agregado`); return; }

    assets.push({ symbol: sym, info: {}, financials: {}, chart: null, dcf: null, mc: null });
    renderAssetCards();
    updateRunBtn();
    saveState();
    $("analyzerResults").classList.add("hidden");
  }

  function removeAsset(symbol) {
    assets = assets.filter(a => a.symbol !== symbol);
    renderAssetCards();
    updateRunBtn();
    saveState();
    if (!assets.length) $("analyzerResults").classList.add("hidden");
    else if ($("analyzerResults").classList.contains("hidden") === false) {
      // Re-render with remaining assets
      const validForPort = assets.filter(a => a.mc && a.chart);
      const portfolio = validForPort.length >= 2 ? runPortfolioAnalysis(validForPort) : null;
      renderDCFResults();
      renderSensitivity();
      renderMCResults();
      renderCorrelation(portfolio);
      renderAnalystTechnical();
      renderComparisonTable();
      renderDecisionPanel();
    }
  }

  // ── Run analysis ─────────────────────────────────────────────
  async function runAnalysis() {
    if (!assets.length) return;

    const loading = $("analyzerLoading");
    const results = $("analyzerResults");
    const runBtn  = $("analyzerRunBtn");

    loading?.classList.remove("hidden");
    results?.classList.add("hidden");
    if (runBtn) runBtn.disabled = true;

    try {
      const fetched = await Promise.allSettled(assets.map(a => loadAssetData(a.symbol)));

      fetched.forEach((res, i) => {
        if (res.status === "fulfilled") {
          Object.assign(assets[i], res.value);
        } else {
          console.warn(`Failed to load ${assets[i].symbol}:`, res.reason);
        }
      });

      // DCF + sensibilidad — solo para acciones individuales (#5)
      assets.forEach(a => {
        if (!isEquity(a.info)) {
          a.dcf = { error: `DCF no aplica a ${typeLabel(quoteType(a.info))} — el modelo de flujos descontados solo es válido para acciones individuales`, skipType: true };
          a.sensitivity = null;
        } else if (a.financials?.income) {
          a.dcf = runDCFAnalysis(a);
          a.sensitivity = buildSensitivity(a);
        }
      });

      // Monte Carlo + portafolio correlacionado en Web Worker (#3, #4)
      const sim = await runSimsAsync({
        C: { MC_SIMS, MC_STEPS, CHART_SAMPLE },
        assets: assets.map(a => ({
          symbol: a.symbol,
          stats:  a.chart ? calcHistStats(a.chart) : null,
          closes: a.chart ? extractCloses(a.chart) : null,
        })),
      });
      assets.forEach((a, i) => { a.mc = sim.mc[i] || null; });
      const portfolio = sim.portfolio || null;
      lastPortfolio = portfolio;

      // Technical analysis + analyst consensus (no extra fetch — uses info + chart)
      assets.forEach(a => {
        a.technicals = calcTechnicals(a.chart, a.info || {});
        a.analyst    = extractAnalyst(a.info || {});
      });

      renderAssetCards();
      renderDCFResults();
      renderSensitivity();
      renderMCResults();
      renderCorrelation(portfolio);
      renderAnalystTechnical();
      renderComparisonTable();
      renderDecisionPanel();
      resetAIVerdict();
      await renderAnalyzerNews();
      saveState();
      results?.classList.remove("hidden");

    } catch (err) {
      console.error("Analyzer error:", err);
      toast("Error cargando datos. ¿Está el servidor activo?");
    } finally {
      loading?.classList.add("hidden");
      if (runBtn) { runBtn.disabled = false; updateRunBtn(); }
    }
  }

  // ── Editable assumptions (#5) ────────────────────────────────
  function readAssumptionInputs() {
    const num = (id, def, min, max) => {
      const el = $(id);
      if (!el) return def;
      const v = parseFloat(el.value);
      return (isNaN(v) || v < min || v > max) ? def : v;
    };
    RF         = num("asmRf",   DEFAULTS.RF * 100,        0,  20) / 100;
    ERP        = num("asmErp",  DEFAULTS.ERP * 100,       0,  20) / 100;
    TV_GROWTH  = num("asmTv",   DEFAULTS.TV_GROWTH * 100, 0,  10) / 100;
    TAX        = num("asmTax",  DEFAULTS.TAX * 100,       0,  60) / 100;
    PROJ_YEARS = Math.round(num("asmYears", DEFAULTS.PROJ_YEARS, 3, 20));
  }

  function applyAssumptions() {
    readAssumptionInputs();
    // Recompute DCF + sensitivity from already-fetched data (no re-fetch)
    let any = false;
    assets.forEach(a => {
      if (isEquity(a.info) && a.financials?.income) {
        a.dcf = runDCFAnalysis(a);
        a.sensitivity = buildSensitivity(a);
        any = true;
      }
    });
    if (any && !$("analyzerResults").classList.contains("hidden")) {
      renderDCFResults();
      renderSensitivity();
      renderDecisionPanel();
      saveState();
    }
  }

  function resetAssumptions() {
    const set = (id, v) => { const el = $(id); if (el) el.value = v; };
    set("asmRf",   (DEFAULTS.RF * 100).toFixed(1));
    set("asmErp",  (DEFAULTS.ERP * 100).toFixed(1));
    set("asmTv",   (DEFAULTS.TV_GROWTH * 100).toFixed(1));
    set("asmTax",  (DEFAULTS.TAX * 100).toFixed(0));
    set("asmYears", DEFAULTS.PROJ_YEARS);
    applyAssumptions();
  }

  // ── Persistencia (#2) ────────────────────────────────────────
  function saveState() {
    const state = {
      symbols: assets.map(a => a.symbol),
      assumptions: { RF, ERP, TV_GROWTH, TAX, PROJ_YEARS },
      ts: Date.now(),
    };
    try { localStorage.setItem(LS_STATE_KEY, JSON.stringify(state)); } catch { /* cuota */ }
    try {
      const db = window.BlackPortfolioAuth?.db;
      const session = window.BlackPortfolioAuth?.getSession?.();
      if (db && session?.id && session.id !== "anonymous") {
        db.collection("analyzerState").doc(session.id).set({
          data: state,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
      }
    } catch { /* nube opcional */ }
  }

  async function restoreState() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem(LS_STATE_KEY) || "null"); } catch { /* ignore */ }
    try {
      const db = window.BlackPortfolioAuth?.db;
      const session = window.BlackPortfolioAuth?.getSession?.();
      if (db && session?.id && session.id !== "anonymous") {
        const doc = await db.collection("analyzerState").doc(session.id).get();
        if (doc.exists && doc.data()?.data) state = doc.data().data;
      }
    } catch { /* nube opcional */ }

    if (!state || !Array.isArray(state.symbols) || !state.symbols.length) return;

    assets = state.symbols.slice(0, MAX_ASSETS).map(s => ({
      symbol: s, info: {}, financials: {}, chart: null, dcf: null, mc: null,
    }));

    if (state.assumptions) {
      const a = state.assumptions;
      const set = (id, v) => { const el = $(id); if (el) el.value = v; };
      set("asmRf",   (a.RF * 100).toFixed(1));
      set("asmErp",  (a.ERP * 100).toFixed(1));
      set("asmTv",   (a.TV_GROWTH * 100).toFixed(1));
      set("asmTax",  (a.TAX * 100).toFixed(0));
      set("asmYears", a.PROJ_YEARS);
      readAssumptionInputs();
    }

    renderAssetCards();
    updateRunBtn();
  }

  // ── Veredicto con IA (#1) ────────────────────────────────────
  const round = (v, d = 2) => (v == null || isNaN(v)) ? null : +(+v).toFixed(d);

  function mdToHtml(md) {
    const esc  = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const bold = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    const lines = String(md || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let html = "", openUl = false;
    const closeUl = () => { if (openUl) { html += "</ul>"; openUl = false; } };
    lines.forEach(l => {
      const h  = l.match(/^#{2,4}\s+(.*)$/);
      const li = l.match(/^([-*•]|\d+\.)\s+(.*)$/);
      if (h)        { closeUl(); html += `<h4 class="anlz-ai-h">${bold(h[1].replace(/[:：]\s*$/, ""))}</h4>`; }
      else if (li)  { if (!openUl) { html += `<ul class="anlz-ai-ul">`; openUl = true; } html += `<li>${bold(li[2])}</li>`; }
      else          { closeUl(); html += `<p class="anlz-ai-p">${bold(l)}</p>`; }
    });
    closeUl();
    return html || `<p class="anlz-ai-p">${bold(md)}</p>`;
  }

  function buildAISummary() {
    return assets.map(a => {
      const info = a.info || {};
      const s    = a.dcf?.scenarios;
      const sc   = scoreAsset(a);
      const ct   = consolidatedTarget(a);
      const t    = a.technicals;
      const an   = a.analyst;
      return {
        ticker: a.symbol,
        nombre: info.shortName || info.longName || a.symbol,
        tipo:   isEquity(info) ? "acción" : typeLabel(quoteType(info)),
        sector: info.sector || null,
        precio_actual: round(n(info.currentPrice || info.regularMarketPrice, 0)),
        dcf: s ? {
          intrinseco_base: round(s.base.intrinsic),
          upside_base:     round(s.base.upside, 3),
          intrinseco_optimista:   round(s.bull.intrinsic),
          intrinseco_conservador: round(s.bear.intrinsic),
          wacc:            round(a.dcf.wacc, 4),
          crecimiento_base: round(a.dcf.growthRates?.base, 4),
        } : (a.dcf?.error || "no aplicable"),
        monte_carlo: a.mc ? {
          prob_subida_12m: round(a.mc.upsideProb, 3),
          p10: round(a.mc.p10), mediana: round(a.mc.p50), p90: round(a.mc.p90),
          volatilidad_anual: round(a.mc.sigmaAnnual, 3),
          retorno_esperado_anual: round(a.mc.muAnnual, 3),
        } : null,
        fundamentales: {
          pe: round(info.trailingPE, 1),
          pe_forward: round(info.forwardPE, 1),
          ev_ebitda: round(info.enterpriseToEbitda, 1),
          roe: round(info.returnOnEquity, 3),
          margen_neto: round(info.profitMargins, 3),
          margen_operativo: round(info.operatingMargins, 3),
          deuda_capital: round(info.debtToEquity, 2),
          ratio_corriente: round(info.currentRatio, 2),
          crecimiento_ingresos: round(info.revenueGrowth, 3),
          crecimiento_utilidades: round(info.earningsGrowth, 3),
          rend_dividendo: round(info.dividendYield, 3),
          beta: round(info.beta, 2),
        },
        tecnico: t ? {
          tendencia: t.trendLabel,
          rsi_14: round(t.rsi, 0),
          momentum_1m: round(t.mom1m, 3),
          sma50: round(t.sma50),
          sma200: round(t.sma200),
          posicion_rango_52s: round(t.w52Pos, 2),
          rango_52s: { bajo: round(t.w52Low), alto: round(t.w52High) },
        } : null,
        analistas: an ? {
          recomendacion: an.recKey,
          num_analistas: an.numAnalysts,
          objetivo_medio: round(an.targetMean),
          objetivo_alto: round(an.targetHigh),
          objetivo_bajo: round(an.targetLow),
          upside_objetivo: round(an.upside, 3),
        } : null,
        precio_objetivo_consolidado: ct ? {
          valor: round(ct.target),
          upside: round(ct.upside, 3),
          componentes: ct.parts.map(p => ({ fuente: p.src, valor: round(p.v), peso: p.w })),
        } : null,
        score_modelo: { score: sc.score, recomendacion: sc.recommendation.label },
      };
    });
  }

  function resetAIVerdict() {
    const body = $("aiVerdictBody");
    const btn  = $("aiVerdictBtn");
    if (btn)  btn.disabled = false;
    if (body) body.innerHTML = `<p class="anlz-ai-empty">Genera un veredicto redactado por IA a partir del DCF, Monte Carlo y fundamentales de los activos analizados.</p>`;
  }

  async function generateAIVerdict() {
    const body = $("aiVerdictBody");
    const btn  = $("aiVerdictBtn");
    if (!body || !assets.length) return;
    body.innerHTML = `<div class="anlz-news-loading">Generando análisis con IA…</div>`;
    if (btn) btn.disabled = true;
    try {
      const payload = { assets: buildAISummary(), lang: "es" };
      if (lastPortfolio) {
        payload.portfolio = {
          activos: lastPortfolio.symbols,
          correlacion: lastPortfolio.corr,
          beneficio_diversificacion: round(lastPortfolio.diversification, 3),
          vol_portafolio: round(lastPortfolio.portVol, 3),
          prob_subida_12m: round(lastPortfolio.upsideProb, 3),
        };
      }
      const _user = window.BlackPortfolioAuth?.firebaseAuth?.currentUser;
      if (!_user) throw new Error("No hay una sesion autenticada.");
      const _idToken = await _user.getIdToken();
      const _twofaToken = sessionStorage.getItem("bp-2fa-token");
      const r = await fetch(`${API}/ai/analyzer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${_idToken}`,
          ...(_twofaToken ? { "X-2FA-Token": _twofaToken } : {})
        },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const data = await r.json();
      body.innerHTML = mdToHtml(data.verdict || "");
    } catch (err) {
      console.warn("AI verdict error:", err);
      body.innerHTML = `<p class="anlz-ai-empty" style="opacity:.7">No se pudo generar el veredicto en este momento. Intenta de nuevo en unos segundos.</p>`;
      if (btn) btn.disabled = false;
    }
  }

  // ── Init ─────────────────────────────────────────────────────
  function init() {
    if (initialized) return;
    initialized = true;

    const input   = $("analyzerInput");
    const sugBox  = $("analyzerSuggestions");

    if (input) {
      input.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        const val = input.value.trim();
        if (!val) { sugBox?.classList.add("hidden"); return; }
        searchTimeout = setTimeout(async () => renderSuggestions(await fetchSuggestions(val)), 280);
      });
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") { const v = input.value.trim(); if (v) addAsset(v); }
        if (e.key === "Escape") sugBox?.classList.add("hidden");
      });
    }

    $("analyzerAddBtn")?.addEventListener("click", () => {
      const v = $("analyzerInput")?.value?.trim();
      if (v) addAsset(v);
    });

    $("analyzerRunBtn")?.addEventListener("click", runAnalysis);

    document.addEventListener("click", e => {
      if (!e.target.closest("#analyzerInput") && !e.target.closest("#analyzerSuggestions")) {
        sugBox?.classList.add("hidden");
      }
    });

    document.querySelectorAll(".anlz-scen-tab").forEach(tab =>
      tab.addEventListener("click", () => {
        document.querySelectorAll(".anlz-scen-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        activeScenario = tab.dataset.scenario;
        if (assets.some(a => a.dcf?.scenarios)) renderDCFResults();
      })
    );

    // Assumptions panel (#5)
    $("asmToggle")?.addEventListener("click", () => {
      $("asmPanel")?.classList.toggle("hidden");
      $("asmToggle")?.classList.toggle("open");
    });
    $("asmApplyBtn")?.addEventListener("click", applyAssumptions);
    $("asmResetBtn")?.addEventListener("click", resetAssumptions);
    ["asmRf","asmErp","asmTv","asmTax","asmYears"].forEach(id =>
      $(id)?.addEventListener("keydown", e => { if (e.key === "Enter") applyAssumptions(); })
    );

    // Veredicto IA (#1)
    $("aiVerdictBtn")?.addEventListener("click", generateAIVerdict);

    renderAssetCards();
    updateRunBtn();
    restoreState(); // (#2) recupera tickers y supuestos de la sesión anterior
  }

  // ── Analyzer news feed (#5) ──────────────────────────────────
  async function renderAnalyzerNews() {
    const section = $("analyzerNewsSection");
    if (!section) return;
    if (!assets.length) { section.classList.add("hidden"); return; }

    section.classList.remove("hidden");
    const list = $("analyzerNewsList");
    if (list) list.innerHTML = '<div class="anlz-news-loading">Cargando noticias…</div>';

    const allArticles = [];
    await Promise.all(assets.slice(0, 3).map(async (a, i) => {
      try {
        const res = await fetch(`${API}/news/${encodeURIComponent(a.symbol)}`);
        if (!res.ok) return;
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.articles || data.news || []);
        items.slice(0, 4).forEach(n => allArticles.push({ ...n, _ticker: a.symbol, _color: ASSET_COLORS[i] }));
      } catch { /* skip */ }
    }));

    if (!list) return;
    if (!allArticles.length) {
      list.innerHTML = '<div class="anlz-news-loading" style="opacity:0.45">Sin noticias disponibles en este momento.</div>';
      return;
    }

    allArticles.sort((a, b) => (b.publishedAt || b.published || 0) > (a.publishedAt || a.published || 0) ? 1 : -1);

    list.innerHTML = allArticles.slice(0, 9).map(n => {
      const headline = n.title || n.headline || "Sin título";
      const source   = n.source?.name || n.publisher || n.source || "";
      const url      = n.url || n.link || "#";
      const thumb    = n.urlToImage || n.thumbnail || "";
      const ts       = n.publishedAt || n.published || n.providerPublishTime;
      const timeStr  = ts ? new Date(Number.isFinite(+ts) && ts < 1e12 ? ts * 1000 : ts).toLocaleDateString("es-MX", { month:"short", day:"numeric" }) : "";
      const chip     = `<span class="anlz-news-ticker-label" style="background:${n._color}22;color:${n._color};border:1px solid ${n._color}44">${n._ticker}</span>`;
      return `<a class="news-card" href="${url}" target="_blank" rel="noopener noreferrer">
        ${thumb ? `<img class="news-thumb" src="${thumb}" alt="" loading="lazy" onerror="this.style.display='none'">` : ""}
        <div class="news-body">
          <div class="news-source">${chip}${source}</div>
          <div class="news-headline">${headline}</div>
          ${timeStr ? `<div class="news-time">${timeStr}</div>` : ""}
        </div>
      </a>`;
    }).join("");
  }

  return { init };
})();
