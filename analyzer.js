// ============================================================
// BlackPortfolio — Analyzer Module
// DCF Valuation · Monte Carlo Simulation · Asset Comparison
// ============================================================

const AnalyzerModule = (() => {
  "use strict";

  // ── Constants ──────────────────────────────────────────────
  const API          = "http://127.0.0.1:8000/api";
  const MAX_ASSETS   = 3;
  const RF           = 0.045;   // Risk-free rate (US 10Y Treasury)
  const ERP          = 0.055;   // Equity risk premium
  const TV_GROWTH    = 0.025;   // Terminal growth rate (perpetuity)
  const TAX          = 0.21;    // Corporate tax rate
  const PROJ_YEARS   = 10;      // DCF horizon (years)
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
    const [info, financials, chart] = await Promise.all([
      apiFetch(`/info/${symbol}`),
      apiFetch(`/financials/${symbol}`),
      apiFetch(`/chart/${symbol}?range=1y&interval=1d`),
    ]);
    return { symbol, info, financials, chart };
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

  // ── Scoring / Decision ───────────────────────────────────────
  function scoreAsset(dcf, mc, info) {
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

    const table = [
      { min:  6, label: "COMPRAR FUERTE", color: "#00e676", icon: "🚀" },
      { min:  3, label: "COMPRAR",        color: "#32d6a2", icon: "▲"  },
      { min:  1, label: "MANTENER",       color: "#f5b84c", icon: "◆"  },
      { min: -1, label: "PRECAUCIÓN",     color: "#ff9966", icon: "▼"  },
      { min: -9, label: "VENDER",         color: "#ff4d6d", icon: "⚠"  },
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

  // ── Render: decision panel ───────────────────────────────────
  function renderDecisionPanel() {
    const grid = $("decisionGrid");
    if (!grid) return;

    grid.innerHTML = assets.map((a, i) => {
      const { symbol, info, dcf, mc } = a;
      const { score, recommendation: rec, signals } = scoreAsset(dcf, mc, info || {});
      const color  = ASSET_COLORS[i];
      const name   = info?.shortName || info?.longName || symbol;
      const pctBar = Math.max(4, Math.round(((score + 6) / 14) * 100));

      const sigHtml = signals.slice(0, 6).map(s =>
        `<div class="anlz-signal anlz-signal-${s.type}">
          <span class="anlz-sig-dot"></span>${s.text}
        </div>`
      ).join("");

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
    $("analyzerResults").classList.add("hidden");
  }

  function removeAsset(symbol) {
    assets = assets.filter(a => a.symbol !== symbol);
    renderAssetCards();
    updateRunBtn();
    if (!assets.length) $("analyzerResults").classList.add("hidden");
    else if ($("analyzerResults").classList.contains("hidden") === false) {
      // Re-render with remaining assets
      renderDCFResults();
      renderMCResults();
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

      assets.forEach(a => {
        if (a.financials?.income) {
          a.dcf = runDCFAnalysis(a);
        }
        if (a.chart) {
          const stats = calcHistStats(a.chart);
          if (stats) a.mc = runMonteCarlo(stats);
        }
      });

      renderAssetCards();
      renderDCFResults();
      renderMCResults();
      renderComparisonTable();
      renderDecisionPanel();
      results?.classList.remove("hidden");

    } catch (err) {
      console.error("Analyzer error:", err);
      toast("Error cargando datos. ¿Está el servidor activo?");
    } finally {
      loading?.classList.add("hidden");
      if (runBtn) { runBtn.disabled = false; updateRunBtn(); }
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

    renderAssetCards();
    updateRunBtn();
  }

  return { init };
})();
