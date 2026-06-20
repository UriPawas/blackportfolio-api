// ============================================================
// BlackPortfolio — Analyzer Monte Carlo Worker
// Corre las simulaciones pesadas (GBM por activo + portafolio
// correlacionado vía Cholesky) fuera del hilo principal.
// Protocolo:
//   in : { C:{MC_SIMS,MC_STEPS,CHART_SAMPLE}, assets:[{symbol,stats,closes}] }
//   out: { mc:[<resultado>|null], portfolio:{...}|null }
// ============================================================
"use strict";

let MC_SIMS = 5000, MC_STEPS = 252, CHART_SAMPLE = 5;

function boxMuller() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function runMonteCarlo(stats) {
  const { lastPrice, muAnnual, sigmaAnnual } = stats;
  const dt        = 1 / 252;
  const drift     = (muAnnual - 0.5 * sigmaAnnual ** 2) * dt;
  const diffusion = sigmaAnnual * Math.sqrt(dt);
  const nChartPts = Math.floor(MC_STEPS / CHART_SAMPLE) + 1;

  const stepBuckets = Array.from({ length: nChartPts }, () => new Array(MC_SIMS));
  const finalPrices = new Array(MC_SIMS);

  for (let sim = 0; sim < MC_SIMS; sim++) {
    let price = lastPrice;
    stepBuckets[0][sim] = price;
    for (let t = 1; t <= MC_STEPS; t++) {
      price *= Math.exp(drift + diffusion * boxMuller());
      if (t % CHART_SAMPLE === 0) stepBuckets[t / CHART_SAMPLE][sim] = price;
    }
    finalPrices[sim] = price;
  }

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
    p10:  finalPrices[Math.floor(MC_SIMS * 0.10)],
    p25:  finalPrices[Math.floor(MC_SIMS * 0.25)],
    p50:  finalPrices[Math.floor(MC_SIMS * 0.50)],
    p75:  finalPrices[Math.floor(MC_SIMS * 0.75)],
    p90:  finalPrices[Math.floor(MC_SIMS * 0.90)],
    mean: finalPrices.reduce((a, b) => a + b, 0) / MC_SIMS,
    upsideProb: finalPrices.filter(p => p > lastPrice).length / MC_SIMS,
    fanPaths, nChartPts,
    currentPrice: lastPrice,
    sigmaAnnual, muAnnual,
  };
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

// entries: [{symbol, closes, mc}]  (mc ya calculado por este worker)
function runPortfolioAnalysis(entries) {
  const series = entries.map(a => {
    const closes = a.closes;
    return closes && closes.length >= 30 ? logReturnsFrom(closes) : null;
  });
  if (series.some(s => s === null)) return null;

  const N = entries.length;
  const corr = Array.from({ length: N }, (_, i) =>
    Array.from({ length: N }, (_, j) => i === j ? 1 : pearson(series[i], series[j]))
  );

  const stats = entries.map(a => a.mc);
  if (stats.some(s => !s)) return null;

  const weights = new Array(N).fill(1 / N);
  const L       = cholesky(corr);
  const dt      = 1 / 252;
  const muD     = stats.map(s => s.muAnnual * dt);
  const sigD    = stats.map(s => s.sigmaAnnual * Math.sqrt(dt));
  const driftD  = stats.map((s, i) => muD[i] - 0.5 * stats[i].sigmaAnnual ** 2 * dt);

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

  const wAvgVol = stats.reduce((s, st, i) => s + weights[i] * st.sigmaAnnual, 0);
  let portVar = 0;
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++)
      portVar += weights[i] * weights[j] * stats[i].sigmaAnnual * stats[j].sigmaAnnual * corr[i][j];
  const portVol = Math.sqrt(Math.max(0, portVar));

  const pAt = p => finals[Math.floor(MC_SIMS * p)];
  return {
    symbols: entries.map(a => a.symbol),
    corr,
    p10: pAt(0.10), p50: pAt(0.50), p90: pAt(0.90),
    upsideProb: finals.filter(v => v > 1).length / MC_SIMS,
    wAvgVol, portVol,
    diversification: wAvgVol > 0 ? (wAvgVol - portVol) / wAvgVol : 0,
  };
}

self.onmessage = (e) => {
  const { C, assets } = e.data || {};
  if (C) { MC_SIMS = C.MC_SIMS; MC_STEPS = C.MC_STEPS; CHART_SAMPLE = C.CHART_SAMPLE; }

  const mc = (assets || []).map(a => a.stats ? runMonteCarlo(a.stats) : null);

  const entries = (assets || [])
    .map((a, i) => ({ symbol: a.symbol, closes: a.closes, mc: mc[i] }))
    .filter(a => a.mc && a.closes);
  const portfolio = entries.length >= 2 ? runPortfolioAnalysis(entries) : null;

  self.postMessage({ mc, portfolio });
};
