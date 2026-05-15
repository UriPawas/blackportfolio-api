// markowitz.js — Markowitz Mean-Variance Portfolio Optimization
(function () {
  "use strict";

  // ── Palette & state ────────────────────────────────────────────────────────
  const PALETTE = [
    "#6f86ff", "#00c894", "#f5b84c", "#ff6b8a", "#9f7aea",
    "#ff8c42", "#32d6a2", "#c084fc", "#39d0ff", "#f5a623",
    "#ff4d6a", "#00e5ff"
  ];

  // Known fixed-income ETFs and instruments (auto-detected, no manual tagging needed)
  const FIXED_INCOME_SYMBOLS = new Set([
    "TLT","IEF","SHY","GOVT","TIP","STIP","VTIP","VGLT","VGIT","VGSH",
    "SCHO","SCHR","SCHQ","SPTL","SPTI","SPTS","BIL","SHV","TBIL","TFLO",
    "BND","AGG","BNDX","BOND",
    "LQD","VCIT","VCSH","IGIB","IGSB","SLQD","IGLB",
    "HYG","JNK","FALN","ANGL","USHY","SHYG","HYLB",
    "MUB","VTEB","TFI","HYD",
    "EMB","PCY","LEMB","IAGG","BWX","IGOV",
    "BSV","ISTB","SPSB","NEAR","GSY","ICSH","MINT","JPST","GBIL",
    "FLOT","FLRN","USFR",
    "PFF","PFFD","PSK",
    "LTPZ","SPIP","TIPX",
    "JAAA","AAA","CLOA",
    "MBONO","UDIBONO",
  ]);

  // Mexican bond fund families — prefix covers all series (A, B, B2, etc.)
  const MX_BOND_FUND_PREFIXES = /^(GBMF|GBMM|GBMRETO|GBMPAT|GBMGUB|GBMGUBL|MPAGORF|ACTIG|ACTIREN|ACTIMED|ALTERN|VALMER|HMXB|STBF|BSMX|DINBF|CIBFON|SCOTIAF|NAFINSA|DEUDAOP|FONSER|ST&ER|SAMCAP|STEREAL|STERGOB|STRGOB|SVIVE)/i;

  function isFixedIncome(ticker) {
    const t = ticker.toUpperCase();
    // Strip exchange suffix (.MX, .BA, etc.) for prefix checks
    const base = t.replace(/\.[A-Z]+$/, "");
    if (FIXED_INCOME_SYMBOLS.has(t)) return true;
    // Known Mexican bond fund families (all series)
    if (MX_BOND_FUND_PREFIXES.test(base)) return true;
    // Mexican bond ETF duration patterns: "+nB" (ACTIG+2B.MX) or "nBF" (GBMF3BF.MX)
    if (/\+\d+[BM](\.[A-Z]+)?$/.test(t)) return true;
    if (/\d+B[A-Z]*\.MX$/i.test(t)) return true;
    // General bond naming patterns
    if (/(BOND|BONO|GOVT|TREAS|FIXED|DEUDA|CETE|CRDT|CREDIT)/i.test(t)) return true;
    return false;
  }

  let mkwAssets = [];   // [{ ticker, color, isFi }]
  let mkwResult = null; // computed on run
  let mkwInitialized = false;
  let mkwForecastYears = 5;
  let mkwRfrData = { rate: 9.0, label: "fallback", date: null, source: "fallback" };

  // ── Public init (called once when section is activated) ────────────────────
  window.initMarkowitz = function () {
    if (mkwInitialized) {
      // Re-draw frontier in case canvas resized
      if (mkwResult) drawFrontier();
      return;
    }
    mkwInitialized = true;
    bindEvents();
    renderAssetList();
    fetchMkwRfr();
  };

  // ── Event wiring ───────────────────────────────────────────────────────────
  function bindEvents() {
    // Add button
    document.getElementById("mkwAddAssetBtn")
      ?.addEventListener("click", () => addFromInput());

    // Enter key in input
    document.getElementById("mkwTickerInput")
      ?.addEventListener("keydown", e => { if (e.key === "Enter") addFromInput(); });

    // Autocomplete
    document.getElementById("mkwTickerInput")
      ?.addEventListener("input", onTickerInput);

    document.addEventListener("click", e => {
      if (!e.target.closest("#mkwTickerSuggestions") && !e.target.closest("#mkwTickerInput")) {
        hideSuggestions();
      }
    });

    // Presets
    document.querySelectorAll(".mkw-preset-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        mkwAssets = [];
        btn.dataset.tickers.split(",").forEach(t => addAsset(t.trim()));
        updateFiNote();
      });
    });

    // Run
    document.getElementById("mkwRunBtn")
      ?.addEventListener("click", runOptimization);

    // VaR confidence live update
    document.getElementById("mkwVarConf")
      ?.addEventListener("change", () => {
        if (!mkwResult) return;
        renderOptimalCards();
        renderVaRPanel();
      });

    // FI constraints toggle
    document.getElementById("mkwFiEnabled")
      ?.addEventListener("change", e => {
        const opts = document.getElementById("mkwFiOptions");
        if (opts) opts.classList.toggle("hidden", !e.target.checked);
      });

    // FI min/max cross-validation
    document.getElementById("mkwFiMin")?.addEventListener("input", () => clampFiInputs());
    document.getElementById("mkwFiMax")?.addEventListener("input", () => clampFiInputs());

    // Mode selector
    document.querySelectorAll(".mkw-mode-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".mkw-mode-tab").forEach(b => b.classList.remove("mkw-mode-active"));
        btn.classList.add("mkw-mode-active");
        const mode = btn.dataset.mode;
        document.getElementById("mkwSmartBetaPanel")?.classList.toggle("hidden", mode !== "smartbeta");
        document.getElementById("mkwBLPanel")?.classList.toggle("hidden", mode !== "blacklitterman");
        const runBtn = document.getElementById("mkwRunBtn");
        if (runBtn) {
          const labels = { mvo: "Optimizar portafolio", smartbeta: "Aplicar Smart Beta", blacklitterman: "Aplicar Black-Litterman" };
          runBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polygon points="5 3 19 12 5 21 5 3"/></svg> ${labels[mode] || labels.mvo}`;
        }
      });
    });

    // Black-Litterman: add view button
    document.getElementById("mkwBLAddViewBtn")?.addEventListener("click", addBLView);
  }

  function clampFiInputs() {
    const minEl = document.getElementById("mkwFiMin");
    const maxEl = document.getElementById("mkwFiMax");
    if (!minEl || !maxEl) return;
    let min = parseFloat(minEl.value) || 0;
    let max = parseFloat(maxEl.value) || 100;
    if (min > max) maxEl.value = min;
  }

  function updateFiNote() {
    const note = document.getElementById("mkwFiNote");
    if (!note) return;
    const fiAssets = mkwAssets.filter(a => a.isFi).map(a => a.ticker);
    if (fiAssets.length === 0) {
      note.textContent = "Ningún activo en la lista es renta fija (TLT, BND, HYG…)";
    } else {
      note.textContent = `Renta fija detectada: ${fiAssets.join(", ")}`;
    }
  }

  function getFiConstraints() {
    const enabled = document.getElementById("mkwFiEnabled")?.checked;
    if (!enabled) return null;
    const min = Math.max(0, Math.min(100, parseFloat(document.getElementById("mkwFiMin")?.value) || 0)) / 100;
    const max = Math.max(0, Math.min(100, parseFloat(document.getElementById("mkwFiMax")?.value) || 100)) / 100;
    return { min: Math.min(min, max), max: Math.max(min, max) };
  }

  // ── Autocomplete ───────────────────────────────────────────────────────────
  let mkwSearchTimer = null;

  function onTickerInput(e) {
    const q = e.target.value.trim();
    clearTimeout(mkwSearchTimer);
    if (q.length < 1) { hideSuggestions(); return; }
    mkwSearchTimer = setTimeout(() => fetchSuggestions(q), 280);
  }

  async function fetchSuggestions(q) {
    try {
      const res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const payload = await res.json();
      const items = (payload.quotes ?? [])
        .filter(it => it.symbol && it.isYahooFinance)
        .slice(0, 6)
        .map(it => ({
          symbol: it.symbol,
          name: it.longname || it.shortname || "",
          quoteType: it.quoteType || "",
        }));
      showSuggestions(items);
    } catch { /* API offline — no suggestions */ }
  }

  // ── Banxico risk-free rate ─────────────────────────────────────────────────
  async function fetchMkwRfr() {
    try {
      const res = await fetch(`${API_BASE_URL}/risk-free-rate`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && typeof data.rate === "number" && isFinite(data.rate)) {
        mkwRfrData = data;
        const input = document.getElementById("mkwRfr");
        if (input) input.value = data.rate.toFixed(2);
        updateMkwRfrLabel();
      }
    } catch { /* keep default */ }
  }

  function updateMkwRfrLabel() {
    const el = document.getElementById("mkwRfrLabel");
    if (!el) return;
    const dateTxt = mkwRfrData.date ? ` · ${mkwRfrData.date}` : "";
    el.textContent = `${mkwRfrData.rate.toFixed(2)}% · ${mkwRfrData.label}${dateTxt}`;
  }

  function showSuggestions(items) {
    const box = document.getElementById("mkwTickerSuggestions");
    if (!box || !items.length) { hideSuggestions(); return; }
    box.innerHTML = items.map(it =>
      `<div class="ticker-suggestion-item"
            data-symbol="${it.symbol}"
            data-quote-type="${it.quoteType || ""}"
            data-name="${(it.name || "").replace(/"/g, "&quot;")}">
        <strong>${it.symbol}</strong><span>${it.name || ""}</span>
      </div>`
    ).join("");
    box.classList.remove("hidden");
    box.querySelectorAll(".ticker-suggestion-item").forEach(row => {
      row.addEventListener("click", () => {
        addAsset(row.dataset.symbol, { quoteType: row.dataset.quoteType, name: row.dataset.name });
        document.getElementById("mkwTickerInput").value = "";
        hideSuggestions();
      });
    });
  }

  function hideSuggestions() {
    document.getElementById("mkwTickerSuggestions")?.classList.add("hidden");
  }

  // ── Asset list management ──────────────────────────────────────────────────
  function addFromInput() {
    const input = document.getElementById("mkwTickerInput");
    const val = input?.value.trim().toUpperCase();
    if (!val) return;
    addAsset(val);
    input.value = "";
    hideSuggestions();
  }

  function addAsset(ticker, meta = {}) {
    ticker = ticker.toUpperCase();
    if (!ticker) return;
    if (mkwAssets.find(a => a.ticker === ticker)) {
      flashInput(); return;
    }
    if (mkwAssets.length >= 12) {
      showStatus("Máximo 12 activos.", "warn"); return;
    }
    const isFi = meta.quoteType
      ? detectFiFromMeta(meta.quoteType, meta.name || "", ticker)
      : isFixedIncome(ticker);
    mkwAssets.push({ ticker, color: PALETTE[mkwAssets.length % PALETTE.length], isFi });
    renderAssetList();
    updateFiNote();
    // If added manually (no API metadata), enrich async
    if (!meta.quoteType) enrichAssetMeta(ticker);
  }

  // Determine fixed income from Yahoo Finance quoteType + instrument name
  function detectFiFromMeta(quoteType, name, ticker) {
    if (quoteType === "BOND") return true;
    const BOND_KEYWORDS = /bond|bono|bonos|treasury|treasuries|renta fija|fixed income|deuda|debt|income|credit|tips|inflation|duration|gilt|soberan|gubernamental|obligacion/i;
    if ((quoteType === "ETF" || quoteType === "MUTUALFUND") && BOND_KEYWORDS.test(name)) return true;
    // Fallback to symbol patterns
    return isFixedIncome(ticker);
  }

  // Fetch Yahoo Finance metadata for a manually-typed ticker and update isFi
  async function enrichAssetMeta(ticker) {
    try {
      const res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(ticker)}`);
      if (!res.ok) return;
      const payload = await res.json();
      const match = (payload.quotes ?? []).find(q => q.symbol?.toUpperCase() === ticker);
      if (!match) return;
      const asset = mkwAssets.find(a => a.ticker === ticker);
      if (!asset) return;
      const detected = detectFiFromMeta(match.quoteType || "", match.longname || match.shortname || "", ticker);
      if (detected !== asset.isFi) {
        asset.isFi = detected;
        renderAssetList();
        updateFiNote();
      }
    } catch { /* API offline — keep pattern-based result */ }
  }

  function removeAsset(ticker) {
    mkwAssets = mkwAssets.filter(a => a.ticker !== ticker);
    mkwAssets.forEach((a, i) => { a.color = PALETTE[i % PALETTE.length]; });
    renderAssetList();
    updateFiNote();
  }

  function renderAssetList() {
    const list = document.getElementById("mkwAssetList");
    const countEl = document.getElementById("mkwAssetCount");
    if (countEl) countEl.textContent = `${mkwAssets.length} / 12`;
    if (!list) return;

    if (mkwAssets.length === 0) {
      list.innerHTML = '<p class="mkw-empty-assets">Agrega al menos 2 activos para optimizar.</p>';
      return;
    }

    list.innerHTML = mkwAssets.map(a =>
      `<div class="mkw-asset-chip">
        <span class="mkw-chip-dot" style="background:${a.color}"></span>
        <span class="mkw-chip-label">${a.ticker}</span>
        ${a.isFi ? '<span class="mkw-chip-fi">RF</span>' : ''}
        <button class="mkw-chip-remove" data-ticker="${a.ticker}" type="button" aria-label="Quitar ${a.ticker}">×</button>
      </div>`
    ).join("");

    list.querySelectorAll(".mkw-chip-remove").forEach(btn => {
      btn.addEventListener("click", () => removeAsset(btn.dataset.ticker));
    });
  }

  function flashInput() {
    const input = document.getElementById("mkwTickerInput");
    if (!input) return;
    input.classList.add("mkw-input-flash");
    setTimeout(() => input.classList.remove("mkw-input-flash"), 600);
  }

  // ── Fixed-income constraint helpers ───────────────────────────────────────
  function randomWeightsConstrained(n, fiIdx, fiMin, fiMax) {
    const eqIdx = Array.from({ length: n }, (_, i) => i).filter(i => !fiIdx.includes(i));
    const fiTotal = fiMin + Math.random() * (fiMax - fiMin);
    const eqTotal = 1 - fiTotal;
    const w = Array(n).fill(0);

    if (fiIdx.length > 0 && fiTotal > 0) {
      const raw = fiIdx.map(() => -Math.log(Math.random() + 1e-12));
      const s = raw.reduce((a, b) => a + b, 0);
      fiIdx.forEach((idx, k) => { w[idx] = (raw[k] / s) * fiTotal; });
    }
    if (eqIdx.length > 0 && eqTotal > 0) {
      const raw = eqIdx.map(() => -Math.log(Math.random() + 1e-12));
      const s = raw.reduce((a, b) => a + b, 0);
      eqIdx.forEach((idx, k) => { w[idx] = (raw[k] / s) * eqTotal; });
    }
    return w;
  }

  // Project onto simplex while keeping FI group weight in [fiMin, fiMax]
  function projectConstrainedSimplex(w, fiIdx, fiMin, fiMax) {
    if (!fiIdx || fiIdx.length === 0) return projectSimplex(w);
    const n = w.length;
    const eqIdx = Array.from({ length: n }, (_, i) => i).filter(i => !fiIdx.includes(i));
    const clipped = w.map(v => Math.max(0, v));
    const total = clipped.reduce((a, b) => a + b, 0);
    if (total < 1e-12) return randomWeightsConstrained(n, fiIdx, fiMin, fiMax);
    const wn = clipped.map(v => v / total);
    const fiSum = fiIdx.reduce((s, i) => s + wn[i], 0);
    const eqSum = eqIdx.reduce((s, i) => s + wn[i], 0);
    const fiTarget = Math.min(fiMax, Math.max(fiMin, fiSum));
    const eqTarget = 1 - fiTarget;
    const result = Array(n).fill(0);
    if (fiSum > 1e-12) {
      fiIdx.forEach(i => { result[i] = (wn[i] / fiSum) * fiTarget; });
    } else if (fiIdx.length > 0) {
      fiIdx.forEach(i => { result[i] = fiTarget / fiIdx.length; });
    }
    if (eqSum > 1e-12) {
      eqIdx.forEach(i => { result[i] = (wn[i] / eqSum) * eqTarget; });
    } else if (eqIdx.length > 0) {
      eqIdx.forEach(i => { result[i] = eqTarget / eqIdx.length; });
    }
    return result;
  }

  // ── Math helpers ───────────────────────────────────────────────────────────
  function dot(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  function portfolioStats(w, mu, cov) {
    const ret = dot(w, mu);
    let variance = 0;
    for (let i = 0; i < w.length; i++)
      for (let j = 0; j < w.length; j++)
        variance += w[i] * w[j] * cov[i][j];
    return { ret, vol: Math.sqrt(Math.max(0, variance)) };
  }

  // Dirichlet-uniform sample → random point on the simplex with long-tail diversity
  function randomWeights(n) {
    const raw = Array.from({ length: n }, () => -Math.log(Math.random() + 1e-12));
    const sum = raw.reduce((a, b) => a + b, 0);
    return raw.map(v => v / sum);
  }

  // Project onto probability simplex (w_i ≥ 0, Σw_i = 1)
  function projectSimplex(w) {
    const clipped = w.map(v => Math.max(0, v));
    const s = clipped.reduce((a, b) => a + b, 0);
    if (s < 1e-12) {
      const n = w.length;
      return Array(n).fill(1 / n);
    }
    return clipped.map(v => v / s);
  }

  // ── Gradient descent: minimum variance ────────────────────────────────────
  function refineMinVariance(mu, cov, n, rfr, fiIdx, fiMin, fiMax) {
    const hasFiConstraint = fiIdx && fiIdx.length > 0;
    const project = hasFiConstraint
      ? w => projectConstrainedSimplex(w, fiIdx, fiMin, fiMax)
      : w => projectSimplex(w);
    let w = hasFiConstraint
      ? randomWeightsConstrained(n, fiIdx, (fiMin + fiMax) / 2, (fiMin + fiMax) / 2)
      : Array(n).fill(1 / n);
    const lr = 0.02;
    const iters = 3000;

    for (let iter = 0; iter < iters; iter++) {
      const grad = Array(n).fill(0);
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++)
          grad[i] += 2 * cov[i][j] * w[j];

      const step = iter < 1500 ? lr : lr * 0.3;
      w = project(w.map((wi, i) => wi - step * grad[i]));
    }

    const { ret, vol } = portfolioStats(w, mu, cov);
    return { w, ret, vol, sharpe: (ret - rfr) / vol };
  }

  // ── Gradient ascent: maximum Sharpe ───────────────────────────────────────
  function refineMaxSharpe(mu, cov, n, rfr, fiIdx, fiMin, fiMax) {
    const hasFiConstraint = fiIdx && fiIdx.length > 0;
    const project = hasFiConstraint
      ? w => projectConstrainedSimplex(w, fiIdx, fiMin, fiMax)
      : w => projectSimplex(w);
    const genSeed = () => hasFiConstraint
      ? randomWeightsConstrained(n, fiIdx, fiMin, fiMax)
      : randomWeights(n);

    const candidates = [hasFiConstraint ? randomWeightsConstrained(n, fiIdx, (fiMin + fiMax) / 2, (fiMin + fiMax) / 2) : Array(n).fill(1 / n)];
    for (let s = 0; s < 5; s++) candidates.push(genSeed());

    let best = null;

    candidates.forEach(seed => {
      let w = [...seed];
      const lr = 0.008;
      const iters = 4000;
      const eps = 1e-9;

      for (let iter = 0; iter < iters; iter++) {
        const { ret, vol } = portfolioStats(w, mu, cov);
        if (vol < eps) break;

        const sigmaW = Array(n).fill(0);
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++)
            sigmaW[i] += cov[i][j] * w[j];

        const vol2 = vol * vol;
        const excess = ret - rfr;
        const grad = Array.from({ length: n }, (_, i) =>
          (mu[i] * vol - excess * sigmaW[i] / vol) / vol2
        );

        const step = iter < 2000 ? lr : lr * 0.4;
        w = project(w.map((wi, i) => wi + step * grad[i]));
      }

      const { ret, vol } = portfolioStats(w, mu, cov);
      const sharpe = (ret - rfr) / vol;
      if (!best || sharpe > best.sharpe) best = { w, ret, vol, sharpe };
    });

    return best;
  }

  function getActiveMode() {
    return document.querySelector(".mkw-mode-tab.mkw-mode-active")?.dataset.mode || "mvo";
  }

  // ── Core optimization ──────────────────────────────────────────────────────
  async function runOptimization() {
    if (mkwAssets.length < 2) {
      showStatus("Agrega al menos 2 activos.", "error"); return;
    }
    const mode = getActiveMode();
    if (mode === "smartbeta") { await runSmartBeta(); return; }
    if (mode === "blacklitterman") { await runBlackLitterman(); return; }


    const runBtn = document.getElementById("mkwRunBtn");
    runBtn.disabled = true;
    runBtn.innerHTML = `<span class="mkw-spinner"></span> Optimizando...`;
    showStatus("Descargando datos históricos...", "loading");
    showResults(false);
    mkwResult = null;

    const period = document.getElementById("mkwPeriod")?.value || "2y";
    const rfr = parseFloat(document.getElementById("mkwRfr")?.value ?? "4.5") / 100;
    const nSim = parseInt(document.getElementById("mkwNSim")?.value || "5000");

    try {
      // ── 1. Fetch OHLCV ─────────────────────────────────────────────────
      const dataMap = {};
      await Promise.all(mkwAssets.map(async ({ ticker }) => {
        const res = await fetch(`${API_BASE_URL}/chart/${ticker}?range=${period}&interval=1wk`);
        if (!res.ok) throw new Error(`No se pudieron obtener datos para ${ticker} (HTTP ${res.status})`);
        const json = await res.json();
        const chartResult = json?.chart?.result?.[0];
        const closes = chartResult?.indicators?.quote?.[0]?.close ?? [];
        dataMap[ticker] = closes.filter(v => v != null && v > 0);
        if (dataMap[ticker].length < 40)
          throw new Error(`Datos insuficientes para ${ticker} (${dataMap[ticker].length} velas)`);
      }));

      showStatus("Calculando retornos y covarianza...", "loading");

      // ── 2. Align & compute returns ─────────────────────────────────────
      const tickers = mkwAssets.map(a => a.ticker);
      const N = tickers.length;
      const minLen = Math.min(...tickers.map(t => dataMap[t].length));

      // Weekly log-returns: r_t = ln(P_t / P_{t-1})
      const returnsMatrix = tickers.map(t => {
        const prices = dataMap[t].slice(-minLen);
        const r = [];
        for (let i = 1; i < prices.length; i++)
          r.push(Math.log(prices[i] / prices[i - 1]));
        return r;
      }); // shape: N × (T-1)

      const T = returnsMatrix[0].length;

      // Annualised mean (×52 for weekly)
      const mu = returnsMatrix.map(r => (r.reduce((s, v) => s + v, 0) / T) * 52);

      // Annualised covariance (×52)
      const cov = Array.from({ length: N }, (_, i) =>
        Array.from({ length: N }, (_, j) => {
          const ri = returnsMatrix[i], rj = returnsMatrix[j];
          const mi = mu[i] / 52, mj = mu[j] / 52;
          const c = ri.reduce((s, v, k) => s + (v - mi) * (rj[k] - mj), 0) / (T - 1);
          return c * 52;
        })
      );

      // ── FI constraint setup ────────────────────────────────────────────
      const fiConstraint = getFiConstraints();
      const fiIdx = tickers
        .map((t, i) => mkwAssets[i].isFi ? i : -1)
        .filter(i => i >= 0);

      if (fiConstraint && fiIdx.length === 0) {
        showStatus("Restricción de renta fija activa pero ningún activo en la lista es renta fija (TLT, BND, HYG…). Agrega al menos uno o desactiva la restricción.", "error");
        runBtn.disabled = false;
        runBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polygon points="5 3 19 12 5 21 5 3"/></svg> Optimizar portafolio`;
        return;
      }

      const fiMin = fiConstraint ? fiConstraint.min : 0;
      const fiMax = fiConstraint ? fiConstraint.max : 1;
      const useFi = fiConstraint && fiIdx.length > 0;

      showStatus(`Simulando ${nSim.toLocaleString()} portafolios...`, "loading");

      // ── 3. Monte Carlo ─────────────────────────────────────────────────
      const portfolios = [];
      for (let s = 0; s < nSim; s++) {
        const w = useFi
          ? randomWeightsConstrained(N, fiIdx, fiMin, fiMax)
          : randomWeights(N);
        const { ret, vol } = portfolioStats(w, mu, cov);
        const sharpe = (ret - rfr) / (vol + 1e-12);
        portfolios.push({ w, ret, vol, sharpe });
      }

      showStatus("Refinando portafolios óptimos...", "loading");

      // ── 4. Analytical refinement ───────────────────────────────────────
      const minVarPortfolio = refineMinVariance(mu, cov, N, rfr, useFi ? fiIdx : null, fiMin, fiMax);
      const maxSharpePortfolio = refineMaxSharpe(mu, cov, N, rfr, useFi ? fiIdx : null, fiMin, fiMax);

      mkwResult = { portfolios, minVarPortfolio, maxSharpePortfolio, mu, cov, tickers, rfr, returnsMatrix };

      // ── 5. Render ──────────────────────────────────────────────────────
      showStatus("", "");
      showResults(true);
      drawFrontier();
      renderOptimalCards();
      renderWeightsPanel(maxSharpePortfolio, "Máx. Sharpe (Tangencia)");
      renderCalcSection();
      drawForecast();

    } catch (err) {
      const msg = String(err.message || err);
      if (msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("networkerror") || msg.toLowerCase().includes("failed to fetch")) {
        showStatus("No se pudo conectar con el servidor. Ejecuta 'python api.py' primero.", "error");
      } else {
        showStatus(msg, "error");
      }
    } finally {
      runBtn.disabled = false;
      runBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polygon points="5 3 19 12 5 21 5 3"/></svg> Optimizar portafolio`;
    }
  }

  // ── Efficient frontier scatter chart ──────────────────────────────────────
  function drawFrontier() {
    const canvas = document.getElementById("mkwFrontierCanvas");
    if (!canvas || !mkwResult) return;

    const { portfolios, minVarPortfolio, maxSharpePortfolio } = mkwResult;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth || 640;
    const H = Math.max(320, Math.round(W * 0.52));
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    // ── Bounds ─────────────────────────────────────────────────────────────
    const allVols = portfolios.map(p => p.vol);
    const allRets = portfolios.map(p => p.ret);
    const allSharpes = portfolios.map(p => p.sharpe);

    const minVol = Math.min(...allVols, minVarPortfolio.vol) * 0.88;
    const maxVol = Math.max(...allVols) * 1.06;
    const minRet = Math.min(...allRets, minVarPortfolio.ret);
    const maxRet = Math.max(...allRets, maxSharpePortfolio.ret);
    const retPad = (maxRet - minRet) * 0.12;
    const minRetP = minRet - retPad;
    const maxRetP = maxRet + retPad;
    const minSharpe = Math.min(...allSharpes);
    const maxSharpe = Math.max(...allSharpes);

    const pad = { t: 28, r: 24, b: 48, l: 64 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    const xScale = v => pad.l + ((v - minVol) / (maxVol - minVol)) * pw;
    const yScale = r => pad.t + ph - ((r - minRetP) / (maxRetP - minRetP)) * ph;

    ctx.clearRect(0, 0, W, H);

    // ── Grid ───────────────────────────────────────────────────────────────
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.font = "10px Inter, system-ui, sans-serif";

    const nGridY = 5, nGridX = 5;
    for (let i = 0; i <= nGridY; i++) {
      const y = pad.t + (ph / nGridY) * i;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke();
      const val = maxRetP - ((maxRetP - minRetP) / nGridY) * i;
      ctx.fillStyle = "rgba(255,255,255,0.38)";
      ctx.textAlign = "right";
      ctx.fillText((val * 100).toFixed(1) + "%", pad.l - 6, y + 3.5);
    }
    for (let i = 0; i <= nGridX; i++) {
      const x = pad.l + (pw / nGridX) * i;
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ph); ctx.stroke();
      const val = minVol + ((maxVol - minVol) / nGridX) * i;
      ctx.fillStyle = "rgba(255,255,255,0.38)";
      ctx.textAlign = "center";
      ctx.fillText((val * 100).toFixed(1) + "%", x, pad.t + ph + 15);
    }

    // ── Axis labels ────────────────────────────────────────────────────────
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Volatilidad anualizada", pad.l + pw / 2, H - 6);
    ctx.save();
    ctx.translate(13, pad.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Retorno anualizado", 0, 0);
    ctx.restore();

    // ── Scatter: Monte Carlo portfolios ────────────────────────────────────
    portfolios.forEach(p => {
      const x = xScale(p.vol);
      const y = yScale(p.ret);
      const t = (p.sharpe - minSharpe) / (maxSharpe - minSharpe + 1e-12);
      // Red (low Sharpe) → Green (high Sharpe)
      const r = Math.round(242 + (0 - 242) * t);
      const g = Math.round(77 + (200 - 77) * t);
      const b = Math.round(106 + (148 - 106) * t);
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},0.45)`;
      ctx.fill();
    });

    // ── Marker: Min Variance ───────────────────────────────────────────────
    {
      const x = xScale(minVarPortfolio.vol);
      const y = yScale(minVarPortfolio.ret);
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#6f86ff"; ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = "bold 9px Inter, sans-serif";
      ctx.textAlign = "center"; ctx.fillText("MV", x, y - 12);
    }

    // ── Marker: Max Sharpe ─────────────────────────────────────────────────
    {
      const x = xScale(maxSharpePortfolio.vol);
      const y = yScale(maxSharpePortfolio.ret);
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fillStyle = "#f5b84c"; ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.fillStyle = "#111"; ctx.font = "bold 9px Inter, sans-serif";
      ctx.textAlign = "center"; ctx.fillText("MS", x, y + 3.5);
    }

    // ── Legend ─────────────────────────────────────────────────────────────
    const legendX = pad.l + pw - 130;
    const legendY = pad.t + 8;
    const legendItems = [
      { color: "#f24d6a", label: "Bajo Sharpe" },
      { color: "#00c894", label: "Alto Sharpe" },
      { color: "#6f86ff", label: "MV — Mín. Varianza" },
      { color: "#f5b84c", label: "MS — Máx. Sharpe" },
    ];
    ctx.font = "10px Inter, system-ui, sans-serif";
    legendItems.forEach((item, i) => {
      const lx = legendX, ly = legendY + i * 17;
      ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2);
      ctx.fillStyle = item.color; ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.textAlign = "left"; ctx.fillText(item.label, lx + 10, ly + 3.5);
    });
  }

  // ── Optimal portfolio cards ────────────────────────────────────────────────
  function renderOptimalCards() {
    if (!mkwResult) return;
    const { minVarPortfolio, maxSharpePortfolio } = mkwResult;
    buildOptimalCard("mkwMinVarCard", minVarPortfolio, "Mínima Varianza", "#6f86ff", "minVar");
    buildOptimalCard("mkwMaxSharpeCard", maxSharpePortfolio, "Máximo Sharpe (Tangencia)", "#f5b84c", "maxSharpe");
  }

  function buildOptimalCard(id, p, title, color, which) {
    const card = document.getElementById(id);
    if (!card) return;
    const conf = selectedVarConf();
    const pv = parametricVaR(p.ret, p.vol, conf);
    const hv = mkwResult?.returnsMatrix ? historicalVaR(p.w, mkwResult.returnsMatrix, conf) : null;
    const varLine = hv !== null
      ? `<div class="mkw-metric mkw-var-metric">
          <span>VaR ${(conf * 100).toFixed(0)}% <span class="mkw-var-badge">Param.</span></span><strong class="${pv > 0 ? "mkw-neg" : "mkw-pos"}">${(pv * 100).toFixed(2)}%</strong>
         </div>
         <div class="mkw-metric mkw-var-metric">
          <span>VaR ${(conf * 100).toFixed(0)}% <span class="mkw-var-badge mkw-var-badge-hist">Hist.</span></span><strong class="${hv > 0 ? "mkw-neg" : "mkw-pos"}">${(hv * 100).toFixed(2)}%</strong>
         </div>`
      : "";
    card.innerHTML = `
      <div class="mkw-optimal-title" style="color:${color}">${title}</div>
      <div class="mkw-optimal-metrics">
        <div class="mkw-metric"><span>Retorno esp.</span><strong class="${p.ret >= 0 ? "mkw-pos" : "mkw-neg"}">${(p.ret * 100).toFixed(2)}%</strong></div>
        <div class="mkw-metric"><span>Volatilidad</span><strong>${(p.vol * 100).toFixed(2)}%</strong></div>
        <div class="mkw-metric"><span>Sharpe</span><strong>${p.sharpe.toFixed(3)}</strong></div>
        ${varLine}
      </div>
      <button class="button secondary mkw-select-btn" data-which="${which}" type="button">Ver ponderaciones</button>
    `;
    card.querySelector(".mkw-select-btn").addEventListener("click", e => {
      const w = e.target.dataset.which;
      const portfolio = w === "minVar" ? mkwResult.minVarPortfolio : mkwResult.maxSharpePortfolio;
      renderWeightsPanel(portfolio, title);
    });
  }

  // ── Weights panel ──────────────────────────────────────────────────────────
  function renderWeightsPanel(p, title) {
    if (!p || !mkwResult) return;
    const { tickers } = mkwResult;

    const titleEl = document.getElementById("mkwWeightsPanelTitle");
    if (titleEl) titleEl.textContent = `Ponderaciones — ${title}`;

    // Pie
    const pieCanvas = document.getElementById("mkwWeightsPie");
    if (pieCanvas) drawWeightsPie(pieCanvas, p.w, tickers);

    // Table
    const tbody = document.getElementById("mkwWeightsTableBody");
    if (!tbody) return;

    const rows = tickers
      .map((t, i) => ({ ticker: t, weight: p.w[i], color: mkwAssets[i]?.color || PALETTE[i % PALETTE.length] }))
      .filter(r => r.weight > 0.0005)
      .sort((a, b) => b.weight - a.weight);

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td><span class="mkw-table-dot" style="background:${r.color}"></span>${r.ticker}</td>
        <td>${(r.weight * 100).toFixed(2)}%</td>
        <td class="mkw-bar-cell">
          <div class="mkw-weight-bar-bg">
            <div class="mkw-weight-bar-fill" style="width:${Math.min(100, r.weight * 100).toFixed(2)}%;background:${r.color}"></div>
          </div>
        </td>
      </tr>
    `).join("");
  }

  function drawWeightsPie(canvas, weights, tickers) {
    const dpr = window.devicePixelRatio || 1;
    const size = 180;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const cx = size / 2, cy = size / 2;
    const outerR = cx - 8;
    const innerR = outerR * 0.55;
    let angle = -Math.PI / 2;

    weights.forEach((w, i) => {
      if (w < 0.001) return;
      const color = mkwAssets[i]?.color || PALETTE[i % PALETTE.length];
      const sweep = w * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, angle, angle + sweep);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      angle += sweep;
    });

    // Donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(12,12,15,1)";
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "bold 11px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Pesos", cx, cy);
  }

  // ── VaR helpers ───────────────────────────────────────────────────────────
  const VAR_Z = { 0.90: 1.2816, 0.95: 1.6449, 0.99: 2.3263 };

  function parametricVaR(ret, vol, conf) {
    const z = VAR_Z[conf] ?? 1.6449;
    return -(ret - z * vol); // positive = expected annual loss
  }

  function historicalVaR(weights, returnsMatrix, conf) {
    const T = returnsMatrix[0].length;
    const weeklyReturns = Array.from({ length: T }, (_, t) =>
      weights.reduce((s, w, i) => s + w * returnsMatrix[i][t], 0)
    );
    weeklyReturns.sort((a, b) => a - b);
    const idx = Math.max(0, Math.floor((1 - conf) * weeklyReturns.length) - 1);
    return -weeklyReturns[idx] * Math.sqrt(52); // annualized by √T
  }

  function selectedVarConf() {
    return parseFloat(document.getElementById("mkwVarConf")?.value ?? "0.95");
  }

  function renderVaRPanel() {
    const el = document.getElementById("mkwCalcVarContent");
    if (!el || !mkwResult) return;
    const { minVarPortfolio, maxSharpePortfolio, returnsMatrix } = mkwResult;
    const confs = [0.90, 0.95, 0.99];
    const items = [
      { name: "Mín. Varianza", color: "#6f86ff", p: minVarPortfolio },
      { name: "Máx. Sharpe", color: "#f5b84c", p: maxSharpePortfolio }
    ];

    const thConfs = confs.map(c =>
      `<th colspan="2" class="mkw-var-conf-header">VaR ${(c * 100).toFixed(0)}%</th>`
    ).join("");
    const thSub = confs.map(() =>
      `<th class="mkw-var-sub">Paramétrico</th><th class="mkw-var-sub">Histórico</th>`
    ).join("");

    const rows = items.map(({ name, color, p }) => {
      const cells = confs.map(conf => {
        const pv = parametricVaR(p.ret, p.vol, conf);
        const hv = historicalVaR(p.w, returnsMatrix, conf);
        const fmtPv = (pv * 100).toFixed(2) + "%";
        const fmtHv = (hv * 100).toFixed(2) + "%";
        return `<td class="${pv > 0 ? "mkw-neg" : "mkw-pos"}">${fmtPv}</td>
                <td class="${hv > 0 ? "mkw-neg" : "mkw-pos"}">${fmtHv}</td>`;
      }).join("");
      return `<tr>
        <td><span class="mkw-table-dot" style="background:${color}"></span>${name}</td>
        ${cells}
      </tr>`;
    }).join("");

    el.innerHTML = `
      <div class="mkw-weights-table-shell tracker-table-shell mkw-var-table-wrap">
        <table class="tracker-table mkw-calc-table mkw-var-table">
          <thead>
            <tr><th rowspan="2">Portafolio</th>${thConfs}</tr>
            <tr>${thSub}</tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="mkw-calc-matrix-note" style="margin-top:12px">VaR = pérdida máxima esperada con el nivel de confianza dado en un horizonte anual. Valores positivos indican pérdida; negativos indican que el portafolio es rentable incluso en el escenario adverso.</p>`;
  }

  // ── Calculations section ──────────────────────────────────────────────────
  function renderCalcSection() {
    if (!mkwResult) return;
    const { mu, cov, tickers, rfr } = mkwResult;
    const N = tickers.length;

    // Bind tab switching (once)
    const card = document.getElementById("mkwCalcCard");
    if (card && !card.dataset.tabsBound) {
      card.dataset.tabsBound = "1";
      card.querySelectorAll(".mkw-calc-tab").forEach(btn => {
        btn.addEventListener("click", () => {
          card.querySelectorAll(".mkw-calc-tab").forEach(b => b.classList.remove("mkw-calc-tab-active"));
          card.querySelectorAll(".mkw-calc-panel").forEach(p => p.classList.remove("mkw-calc-panel-active"));
          btn.classList.add("mkw-calc-tab-active");
          document.getElementById("mkwCalcPanel" + capitalize(btn.dataset.tab))?.classList.add("mkw-calc-panel-active");
        });
      });
    }

    // Stats table
    const statsEl = document.getElementById("mkwCalcStatsContent");
    if (statsEl) {
      const vols = cov.map((row, i) => Math.sqrt(Math.max(0, row[i])));
      const rows = tickers.map((t, i) => {
        const ret = mu[i];
        const vol = vols[i];
        const sharpe = vol > 1e-9 ? (ret - rfr) / vol : 0;
        const color = mkwAssets[i]?.color || PALETTE[i % PALETTE.length];
        return `<tr>
          <td><span class="mkw-table-dot" style="background:${color}"></span>${t}</td>
          <td class="${ret >= 0 ? "mkw-pos" : "mkw-neg"}">${(ret * 100).toFixed(2)}%</td>
          <td>${(vol * 100).toFixed(2)}%</td>
          <td>${sharpe.toFixed(3)}</td>
        </tr>`;
      }).join("");
      statsEl.innerHTML = `
        <div class="mkw-weights-table-shell tracker-table-shell">
          <table class="tracker-table mkw-calc-table">
            <thead><tr><th>Activo</th><th>Retorno esp. anual</th><th>Volatilidad anual</th><th>Sharpe</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }

    // Covariance matrix
    const flatCov = cov.flat();
    const maxAbsCov = Math.max(...flatCov.map(Math.abs));
    renderMatrix("mkwCalcCovContent", tickers, (i, j) => cov[i][j],
      v => (v * 1e4).toFixed(2),
      v => covHeatColor(v / maxAbsCov));

    // Correlation matrix
    const vols2 = cov.map((row, i) => Math.sqrt(Math.max(1e-12, row[i])));
    renderMatrix("mkwCalcCorrContent", tickers, (i, j) => cov[i][j] / (vols2[i] * vols2[j]),
      v => v.toFixed(3),
      v => corrHeatColor(v));

    // VaR panel
    renderVaRPanel();
  }

  function renderMatrix(elId, tickers, valueFn, formatFn, colorFn) {
    const el = document.getElementById(elId);
    if (!el) return;
    const N = tickers.length;
    const headerCells = tickers.map(t => `<th>${t}</th>`).join("");
    const bodyRows = tickers.map((t, i) => {
      const cells = tickers.map((_, j) => {
        const v = valueFn(i, j);
        const { bg, text } = colorFn(v);
        return `<td style="background:${bg};color:${text}">${formatFn(v)}</td>`;
      }).join("");
      return `<tr><th>${t}</th>${cells}</tr>`;
    }).join("");
    el.innerHTML = `
      <div class="mkw-matrix-wrap">
        <table class="mkw-matrix-table">
          <thead><tr><th></th>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`;
  }

  function covHeatColor(t) {
    // t ∈ [-1, 1] normalized by maxAbs
    const a = Math.abs(t);
    if (t >= 0) {
      const r = Math.round(30 + (0 - 30) * a);
      const g = Math.round(30 + (200 - 30) * a);
      const b = Math.round(60 + (148 - 60) * a);
      return { bg: `rgba(${r},${g},${b},${0.15 + a * 0.55})`, text: a > 0.4 ? "#e0ffe8" : "rgba(255,255,255,0.7)" };
    } else {
      const r = Math.round(30 + (220 - 30) * a);
      const g = Math.round(30 + (50 - 30) * a);
      const b = Math.round(60 + (80 - 60) * a);
      return { bg: `rgba(${r},${g},${b},${0.15 + a * 0.55})`, text: a > 0.4 ? "#ffe0e8" : "rgba(255,255,255,0.7)" };
    }
  }

  function corrHeatColor(v) {
    v = Math.max(-1, Math.min(1, v));
    if (v >= 0) {
      const t = v;
      const r = Math.round(20 + (111 - 20) * t);
      const g = Math.round(20 + (134 - 20) * t);
      const b = Math.round(40 + (255 - 40) * t);
      return { bg: `rgba(${r},${g},${b},${0.12 + t * 0.65})`, text: t > 0.5 ? "#d0e8ff" : "rgba(255,255,255,0.7)" };
    } else {
      const t = -v;
      const r = Math.round(20 + (242 - 20) * t);
      const g = Math.round(20 + (77 - 20) * t);
      const b = Math.round(40 + (106 - 40) * t);
      return { bg: `rgba(${r},${g},${b},${0.12 + t * 0.65})`, text: t > 0.5 ? "#ffe0e8" : "rgba(255,255,255,0.7)" };
    }
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ── UI helpers ─────────────────────────────────────────────────────────────
  function showStatus(msg, type) {
    const el = document.getElementById("mkwStatus");
    if (!el) return;
    el.textContent = msg;
    el.className = "mkw-status" + (type ? " mkw-status-" + type : "");
    el.style.display = msg ? "block" : "none";
  }

  function showResults(visible) {
    const el = document.getElementById("mkwResultsSection");
    if (el) el.style.display = visible ? "" : "none";
  }

  // Year selector for forecast
  document.getElementById("mkwForecastYearNav")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".var-conf-btn");
    if (!btn || !btn.dataset.years) return;
    document.querySelectorAll("#mkwForecastYearNav .var-conf-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    mkwForecastYears = parseInt(btn.dataset.years, 10);
    drawForecast();
  });

  // Re-draw frontier on window resize (canvas needs explicit sizing)
  window.addEventListener("resize", () => {
    if (mkwResult) { drawFrontier(); drawForecast(); }
  });

  // ── Forecast: GBM path projections ────────────────────────────────────────
  function boxMullerMkw() {
    let u, v, s;
    do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; s = u * u + v * v; }
    while (s >= 1 || s === 0);
    return u * Math.sqrt(-2 * Math.log(s) / s);
  }

  function drawForecast() {
    const canvas = document.getElementById("mkwForecastCanvas");
    const statusEl = document.getElementById("mkwForecastStatus");
    if (!canvas || !mkwResult) return;

    const { portfolios, minVarPortfolio, maxSharpePortfolio } = mkwResult;
    const years = mkwForecastYears;
    const S0 = 10000;
    const steps = years * 12; // monthly

    const allSharpes = portfolios.map(p => p.sharpe);
    const minS = Math.min(...allSharpes);
    const maxS = Math.max(...allSharpes);

    // Sample up to 300 portfolios — stratified across Sharpe range
    const sorted = [...portfolios].sort((a, b) => a.sharpe - b.sharpe);
    const sampleN = Math.min(300, sorted.length);
    const step = sorted.length / sampleN;
    const sampled = Array.from({ length: sampleN }, (_, i) => sorted[Math.floor(i * step)]);

    // Compute one stochastic GBM path per sampled portfolio
    function gbmPath(ret, vol) {
      const driftM = (ret - 0.5 * vol * vol) / 12;
      const diffM = vol / Math.sqrt(12);
      const path = new Float32Array(steps + 1);
      path[0] = S0;
      let val = S0;
      for (let t = 1; t <= steps; t++) {
        val *= Math.exp(driftM + diffM * boxMullerMkw());
        path[t] = val;
      }
      return path;
    }

    const paths = sampled.map(p => ({ path: gbmPath(p.ret, p.vol), sharpe: p.sharpe }));
    const mvPath = gbmPath(minVarPortfolio.ret, minVarPortfolio.vol);
    const msPath = gbmPath(maxSharpePortfolio.ret, maxSharpePortfolio.vol);

    // Canvas setup
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth || 680;
    const H = Math.max(340, Math.round(W * 0.55));
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const padL = 72, padR = 20, padTop = 16, padBot = 30;
    const cW = W - padL - padR;
    const cH = H - padTop - padBot;

    // Y range: across all paths
    let yMin = S0, yMax = S0;
    paths.forEach(({ path }) => { for (let t = 0; t <= steps; t++) { if (path[t] < yMin) yMin = path[t]; if (path[t] > yMax) yMax = path[t]; } });
    [mvPath, msPath].forEach(p => { for (let t = 0; t <= steps; t++) { if (p[t] < yMin) yMin = p[t]; if (p[t] > yMax) yMax = p[t]; } });
    const vRange = yMax - yMin || 1;

    const toX = t => padL + (t / steps) * cW;
    const toY = v => padTop + cH - ((v - yMin) / vRange) * cH;

    ctx.clearRect(0, 0, W, H);

    // Grid
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const v = yMin + (vRange / gridSteps) * i;
      const y = toY(v);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + cW, y);
      ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.38)"; ctx.font = "10px Inter,sans-serif";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(fmtCompact(v), padL - 5, y);
    }

    // X axis labels (years)
    ctx.fillStyle = "rgba(255,255,255,0.38)"; ctx.font = "10px Inter,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (let yr = 0; yr <= years; yr++) {
      ctx.fillText(yr === 0 ? "Hoy" : `Año ${yr}`, toX(yr * 12), padTop + cH + 5);
    }

    // S0 baseline dashed
    ctx.beginPath(); ctx.moveTo(padL, toY(S0)); ctx.lineTo(padL + cW, toY(S0));
    ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke();
    ctx.setLineDash([]);

    // Cloud paths
    paths.forEach(({ path, sharpe }) => {
      const t = (sharpe - minS) / (maxS - minS + 1e-12);
      const r = Math.round(242 + (0 - 242) * t);
      const g = Math.round(77 + (200 - 77) * t);
      const b = Math.round(106 + (148 - 106) * t);
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) ctx[i === 0 ? "moveTo" : "lineTo"](toX(i), toY(path[i]));
      ctx.strokeStyle = `rgba(${r},${g},${b},0.18)`;
      ctx.lineWidth = 1; ctx.lineJoin = "round"; ctx.stroke();
    });

    // Min Variance — blue thick
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) ctx[i === 0 ? "moveTo" : "lineTo"](toX(i), toY(mvPath[i]));
    ctx.strokeStyle = "#6f86ff"; ctx.lineWidth = 2.2; ctx.lineJoin = "round"; ctx.stroke();

    // Max Sharpe — gold thick
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) ctx[i === 0 ? "moveTo" : "lineTo"](toX(i), toY(msPath[i]));
    ctx.strokeStyle = "#f5b84c"; ctx.lineWidth = 2.2; ctx.lineJoin = "round"; ctx.stroke();

    // End-point labels
    function endLabel(path, label, color) {
      const v = path[steps];
      const x = toX(steps) + 5;
      const y = toY(v);
      ctx.fillStyle = color; ctx.font = "bold 10px Inter,sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(`${label} ${fmtCompact(v)}`, x, y);
    }
    endLabel(mvPath, "MV", "#6f86ff");
    endLabel(msPath, "MS", "#f5b84c");

    // Starting dot
    ctx.beginPath(); ctx.arc(toX(0), toY(S0), 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fill();

    statusEl.textContent = `${sampleN} trayectorias de ${portfolios.length.toLocaleString()} portafolios simulados · inicio normalizado $${S0.toLocaleString()}`;
  }

  function fmtCompact(v) {
    if (v >= 1e6) return "$" + (v / 1e6).toFixed(1) + "M";
    if (v >= 1e3) return "$" + (v / 1e3).toFixed(0) + "K";
    return "$" + v.toFixed(0);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── SMART BETA ────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  async function runSmartBeta() {
    const runBtn = document.getElementById("mkwRunBtn");
    runBtn.disabled = true;
    runBtn.innerHTML = `<span class="mkw-spinner"></span> Calculando factores...`;
    showStatus("Descargando datos históricos...", "loading");
    showResults(false);
    mkwResult = null;

    const period = document.getElementById("mkwPeriod")?.value || "2y";
    const rfr = parseFloat(document.getElementById("mkwRfr")?.value ?? "4.5") / 100;
    const nSim = parseInt(document.getElementById("mkwNSim")?.value || "10000");

    try {
      const dataMap = {};
      await Promise.all(mkwAssets.map(async ({ ticker }) => {
        const res = await fetch(`${API_BASE_URL}/chart/${ticker}?range=${period}&interval=1wk`);
        if (!res.ok) throw new Error(`No se pudieron obtener datos para ${ticker} (HTTP ${res.status})`);
        const json = await res.json();
        const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
        dataMap[ticker] = closes.filter(v => v != null && v > 0);
        if (dataMap[ticker].length < 40)
          throw new Error(`Datos insuficientes para ${ticker} (${dataMap[ticker].length} velas)`);
      }));

      showStatus("Calculando scores de factores...", "loading");

      const tickers = mkwAssets.map(a => a.ticker);
      const N = tickers.length;
      const minLen = Math.min(...tickers.map(t => dataMap[t].length));

      // Build log-returns
      const returnsMatrix = tickers.map(t => {
        const prices = dataMap[t].slice(-minLen);
        const r = [];
        for (let i = 1; i < prices.length; i++) r.push(Math.log(prices[i] / prices[i - 1]));
        return r;
      });
      const T = returnsMatrix[0].length;

      // Annualized mean and cov (same as MVO)
      const mu = returnsMatrix.map(r => (r.reduce((s, v) => s + v, 0) / T) * 52);
      const cov = Array.from({ length: N }, (_, i) =>
        Array.from({ length: N }, (_, j) => {
          const ri = returnsMatrix[i], rj = returnsMatrix[j];
          const mi = mu[i] / 52, mj = mu[j] / 52;
          return (ri.reduce((s, v, k) => s + (v - mi) * (rj[k] - mj), 0) / (T - 1)) * 52;
        })
      );

      // ── Factor scores ──────────────────────────────────────────────────────
      const useMom    = document.getElementById("sbMomentum")?.checked;
      const useLowVol = document.getElementById("sbLowVol")?.checked;
      const useMeanRev = document.getElementById("sbMeanRev")?.checked;

      if (!useMom && !useLowVol && !useMeanRev) {
        showStatus("Selecciona al menos un factor.", "error");
        runBtn.disabled = false;
        runBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polygon points="5 3 19 12 5 21 5 3"/></svg> Aplicar Smart Beta`;
        return;
      }

      const wMom    = useMom    ? (parseFloat(document.getElementById("sbMomentumW")?.value) || 40) : 0;
      const wLowVol = useLowVol ? (parseFloat(document.getElementById("sbLowVolW")?.value)    || 40) : 0;
      const wMeanRev = useMeanRev ? (parseFloat(document.getElementById("sbMeanRevW")?.value) || 20) : 0;
      const totalFactorW = wMom + wLowVol + wMeanRev || 1;

      const scores = tickers.map((_, i) => {
        const r = returnsMatrix[i];
        const T52 = Math.min(r.length, 52);  // last ~12m for momentum
        const T4  = Math.min(r.length, 4);   // last ~1m for mean-reversion

        // Momentum: 12-month cumulative log-return
        const momentum = r.slice(-T52).reduce((s, v) => s + v, 0);

        // Low-vol: inverse of annualized std-dev
        const mean = r.reduce((s, v) => s + v, 0) / r.length;
        const variance = r.reduce((s, v) => s + (v - mean) ** 2, 0) / (r.length - 1);
        const vol = Math.sqrt(variance * 52);
        const lowVol = vol > 1e-9 ? 1 / vol : 0;

        // Mean-reversion: negative of 1-month return
        const shortRet = r.slice(-T4).reduce((s, v) => s + v, 0);
        const meanRev = -shortRet;

        return { momentum, lowVol, meanRev };
      });

      // Normalize each factor to [0,1] cross-sectionally
      function normalizeScores(vals) {
        const min = Math.min(...vals), max = Math.max(...vals);
        const range = max - min;
        if (range < 1e-12) return vals.map(() => 1 / vals.length);
        return vals.map(v => (v - min) / range);
      }

      const normMom    = normalizeScores(scores.map(s => s.momentum));
      const normLowVol = normalizeScores(scores.map(s => s.lowVol));
      const normMeanRev = normalizeScores(scores.map(s => s.meanRev));

      // Composite score
      const composite = scores.map((_, i) =>
        (normMom[i] * wMom + normLowVol[i] * wLowVol + normMeanRev[i] * wMeanRev) / totalFactorW
      );

      // Use composite score as tilted expected returns for MVO
      // Scale to have same mean as historical mu
      const compSum = composite.reduce((s, v) => s + v, 0);
      const muMean = mu.reduce((s, v) => s + v, 0) / N;
      const muAdj = composite.map(c => (compSum > 0 ? c / compSum : 1 / N) * muMean * N);

      showStatus(`Simulando ${nSim.toLocaleString()} portafolios con retornos ajustados por factor...`, "loading");

      // Monte Carlo with factor-tilted mu
      const portfolios = [];
      for (let s = 0; s < nSim; s++) {
        const w = randomWeights(N);
        const { ret, vol } = portfolioStats(w, muAdj, cov);
        portfolios.push({ w, ret, vol, sharpe: (ret - rfr) / (vol + 1e-12) });
      }

      const minVarPortfolio = refineMinVariance(muAdj, cov, N, rfr, null, 0, 1);
      const maxSharpePortfolio = refineMaxSharpe(muAdj, cov, N, rfr, null, 0, 1);

      mkwResult = { portfolios, minVarPortfolio, maxSharpePortfolio, mu: muAdj, cov, tickers, rfr, returnsMatrix };

      // Attach factor scores to result for display
      mkwResult.smartBetaScores = tickers.map((t, i) => ({
        ticker: t,
        composite: composite[i],
        momentum: normMom[i],
        lowVol: normLowVol[i],
        meanRev: normMeanRev[i],
      }));

      showStatus("", "");
      showResults(true);
      drawFrontier();
      renderOptimalCards();
      renderWeightsPanel(maxSharpePortfolio, "Smart Beta — Máx. Sharpe");
      renderCalcSection();
      renderSmartBetaScoreCard();
      drawForecast();

    } catch (err) {
      const msg = String(err.message || err);
      showStatus(msg.toLowerCase().includes("fetch") ? "No se pudo conectar con el servidor. Ejecuta 'python api.py' primero." : msg, "error");
    } finally {
      runBtn.disabled = false;
      runBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polygon points="5 3 19 12 5 21 5 3"/></svg> Aplicar Smart Beta`;
    }
  }

  function renderSmartBetaScoreCard() {
    if (!mkwResult?.smartBetaScores) return;
    const existing = document.getElementById("mkwSBScoreCard");
    const container = document.getElementById("mkwResultsSection");
    if (!container) return;

    const card = existing || (() => {
      const c = document.createElement("div");
      c.id = "mkwSBScoreCard";
      c.className = "dashboard-card";
      container.appendChild(c);
      return c;
    })();

    const rows = mkwResult.smartBetaScores
      .sort((a, b) => b.composite - a.composite)
      .map((s, i) => {
        const color = mkwAssets.find(a => a.ticker === s.ticker)?.color || PALETTE[i % PALETTE.length];
        const pct = n => (n * 100).toFixed(1) + "%";
        const bar = n => `<div style="width:${(n * 100).toFixed(1)}%;background:${color};height:6px;border-radius:3px;opacity:0.8"></div>`;
        return `<tr>
          <td><span class="mkw-table-dot" style="background:${color}"></span>${s.ticker}</td>
          <td>${pct(s.composite)}<br>${bar(s.composite)}</td>
          <td>${pct(s.momentum)}<br>${bar(s.momentum)}</td>
          <td>${pct(s.lowVol)}<br>${bar(s.lowVol)}</td>
          <td>${pct(s.meanRev)}<br>${bar(s.meanRev)}</td>
        </tr>`;
      }).join("");

    card.innerHTML = `
      <div class="card-header"><h3>Scores de Factores — Smart Beta</h3><span>Ranking por score compuesto (normalizado 0–100%)</span></div>
      <div class="mkw-weights-table-shell tracker-table-shell">
        <table class="tracker-table mkw-calc-table">
          <thead><tr><th>Activo</th><th>Score Compuesto</th><th>Momentum</th><th>Low-Vol</th><th>Mean-Rev</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── BLACK-LITTERMAN ────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  let blViews = [];  // [{ type: "relative"|"absolute", asset1, asset2, value, confidence }]

  function addBLView() {
    const tickers = mkwAssets.map(a => a.ticker);
    if (tickers.length < 1) { showStatus("Agrega activos primero.", "warn"); return; }

    const id = Date.now();
    blViews.push({ id, type: "relative", asset1: tickers[0], asset2: tickers[1] || tickers[0], value: 5, confidence: 50 });
    renderBLViews();
  }

  function removeBLView(id) {
    blViews = blViews.filter(v => v.id !== id);
    renderBLViews();
  }

  function renderBLViews() {
    const container = document.getElementById("mkwBLViews");
    if (!container) return;
    const tickers = mkwAssets.map(a => a.ticker);

    if (!blViews.length) {
      container.innerHTML = '<p class="mkw-fi-note" style="margin:0">Sin views. El modelo usará retornos de equilibrio CAPM puro.</p>';
      return;
    }

    container.innerHTML = blViews.map(v => {
      const opts = tickers.map(t => `<option value="${t}" ${t === v.asset1 ? "selected" : ""}>${t}</option>`).join("");
      const opts2 = tickers.map(t => `<option value="${t}" ${t === v.asset2 ? "selected" : ""}>${t}</option>`).join("");
      const isRel = v.type === "relative";
      return `
        <div class="mkw-bl-view" data-id="${v.id}">
          <div class="mkw-bl-view-row">
            <select class="bl-type-sel" data-id="${v.id}">
              <option value="relative" ${isRel ? "selected" : ""}>Relativo</option>
              <option value="absolute" ${!isRel ? "selected" : ""}>Absoluto</option>
            </select>
            <select class="bl-asset1-sel" data-id="${v.id}">${opts}</select>
            ${isRel ? `<span class="bl-view-op">supera a</span><select class="bl-asset2-sel" data-id="${v.id}">${opts2}</select>` : ""}
            <span class="bl-view-op">en</span>
            <input class="bl-value-inp mkw-sb-weight" type="number" step="0.5" value="${v.value}" data-id="${v.id}" style="width:60px"> <span class="mkw-sb-pct">%</span>
          </div>
          <div class="mkw-bl-view-row" style="gap:8px;margin-top:4px">
            <span class="mkw-fi-note" style="margin:0">Confianza:</span>
            <input type="range" min="10" max="100" step="10" value="${v.confidence}" class="bl-conf-range" data-id="${v.id}" style="flex:1">
            <span class="bl-conf-label">${v.confidence}%</span>
            <button class="button ghost" style="padding:2px 8px;font-size:11px" data-remove="${v.id}">✕</button>
          </div>
        </div>`;
    }).join("");

    // Wire events
    container.querySelectorAll(".bl-type-sel").forEach(sel => {
      sel.addEventListener("change", () => {
        const v = blViews.find(x => x.id === +sel.dataset.id);
        if (v) { v.type = sel.value; renderBLViews(); }
      });
    });
    container.querySelectorAll(".bl-asset1-sel").forEach(sel => {
      sel.addEventListener("change", () => {
        const v = blViews.find(x => x.id === +sel.dataset.id);
        if (v) v.asset1 = sel.value;
      });
    });
    container.querySelectorAll(".bl-asset2-sel").forEach(sel => {
      sel.addEventListener("change", () => {
        const v = blViews.find(x => x.id === +sel.dataset.id);
        if (v) v.asset2 = sel.value;
      });
    });
    container.querySelectorAll(".bl-value-inp").forEach(inp => {
      inp.addEventListener("input", () => {
        const v = blViews.find(x => x.id === +inp.dataset.id);
        if (v) v.value = parseFloat(inp.value) || 0;
      });
    });
    container.querySelectorAll(".bl-conf-range").forEach(inp => {
      inp.addEventListener("input", () => {
        const v = blViews.find(x => x.id === +inp.dataset.id);
        if (v) { v.confidence = +inp.value; renderBLViews(); }
      });
    });
    container.querySelectorAll("[data-remove]").forEach(btn => {
      btn.addEventListener("click", () => removeBLView(+btn.dataset.remove));
    });
  }

  // ── Matrix operations for BL ───────────────────────────────────────────────
  function matMul(A, B) {
    const rows = A.length, cols = B[0].length, inner = B.length;
    return Array.from({ length: rows }, (_, i) =>
      Array.from({ length: cols }, (_, j) =>
        Array.from({ length: inner }, (_, k) => A[i][k] * B[k][j]).reduce((s, v) => s + v, 0)
      )
    );
  }

  function matAdd(A, B) {
    return A.map((row, i) => row.map((v, j) => v + B[i][j]));
  }

  function matScale(A, s) {
    return A.map(row => row.map(v => v * s));
  }

  function transpose(A) {
    return A[0].map((_, j) => A.map(row => row[j]));
  }

  // Gaussian elimination inverse for small matrices
  function matInv(A) {
    const n = A.length;
    const aug = A.map((row, i) => {
      const ext = Array(n).fill(0);
      ext[i] = 1;
      return [...row, ...ext];
    });

    for (let col = 0; col < n; col++) {
      let pivot = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) pivot = row;
      }
      [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
      const scale = aug[col][col];
      if (Math.abs(scale) < 1e-14) throw new Error("Matriz singular — views redundantes o activos perfectamente correlacionados");
      for (let j = 0; j < 2 * n; j++) aug[col][j] /= scale;
      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = aug[row][col];
        for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
      }
    }
    return aug.map(row => row.slice(n));
  }

  async function runBlackLitterman() {
    const runBtn = document.getElementById("mkwRunBtn");
    runBtn.disabled = true;
    runBtn.innerHTML = `<span class="mkw-spinner"></span> Calculando Black-Litterman...`;
    showStatus("Descargando datos históricos...", "loading");
    showResults(false);
    mkwResult = null;

    const period = document.getElementById("mkwPeriod")?.value || "2y";
    const rfr    = parseFloat(document.getElementById("mkwRfr")?.value ?? "4.5") / 100;
    const nSim   = parseInt(document.getElementById("mkwNSim")?.value || "10000");
    const tau    = parseFloat(document.getElementById("blTau")?.value ?? "0.05");
    const delta  = parseFloat(document.getElementById("blDelta")?.value ?? "2.5");

    try {
      const dataMap = {};
      await Promise.all(mkwAssets.map(async ({ ticker }) => {
        const res = await fetch(`${API_BASE_URL}/chart/${ticker}?range=${period}&interval=1wk`);
        if (!res.ok) throw new Error(`No se pudieron obtener datos para ${ticker} (HTTP ${res.status})`);
        const json = await res.json();
        const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
        dataMap[ticker] = closes.filter(v => v != null && v > 0);
        if (dataMap[ticker].length < 40)
          throw new Error(`Datos insuficientes para ${ticker} (${dataMap[ticker].length} velas)`);
      }));

      showStatus("Computando retornos de equilibrio...", "loading");

      const tickers = mkwAssets.map(a => a.ticker);
      const N = tickers.length;
      const minLen = Math.min(...tickers.map(t => dataMap[t].length));

      const returnsMatrix = tickers.map(t => {
        const prices = dataMap[t].slice(-minLen);
        const r = [];
        for (let i = 1; i < prices.length; i++) r.push(Math.log(prices[i] / prices[i - 1]));
        return r;
      });
      const T = returnsMatrix[0].length;
      const mu_hist = returnsMatrix.map(r => (r.reduce((s, v) => s + v, 0) / T) * 52);

      const cov = Array.from({ length: N }, (_, i) =>
        Array.from({ length: N }, (_, j) => {
          const ri = returnsMatrix[i], rj = returnsMatrix[j];
          const mi = mu_hist[i] / 52, mj = mu_hist[j] / 52;
          return (ri.reduce((s, v, k) => s + (v - mi) * (rj[k] - mj), 0) / (T - 1)) * 52;
        })
      );

      // ── Black-Litterman ────────────────────────────────────────────────────
      // Prior: equal-weight market portfolio
      const wEq = Array(N).fill(1 / N);

      // Implied equilibrium returns: Π = δ × Σ × w_eq
      const covW = cov.map(row => row.reduce((s, v, j) => s + v * wEq[j], 0));
      const Pi = covW.map(v => delta * v);

      // Build views (P, Q, Omega)
      const K = blViews.length;
      let mu_bl;

      if (K === 0) {
        // No views → use equilibrium returns as mu
        mu_bl = Pi;
      } else {
        // P: K×N pick matrix; Q: K×1 view returns; Omega: K×K uncertainty diagonal
        const P = blViews.map(v => {
          const row = Array(N).fill(0);
          const i1 = tickers.indexOf(v.asset1);
          if (i1 < 0) return row;
          if (v.type === "relative") {
            const i2 = tickers.indexOf(v.asset2);
            row[i1] = 1;
            if (i2 >= 0 && i2 !== i1) row[i2] = -1;
          } else {
            row[i1] = 1;
          }
          return row;
        });

        const Q = blViews.map(v => v.value / 100);

        // Omega = diag(conf^{-1} * tau * P × Σ × P')
        const PtauSig = matMul(P, matScale(cov, tau));
        const PtauSigPt = matMul(PtauSig, transpose(P));
        const Omega = Array.from({ length: K }, (_, i) => {
          const row = Array(K).fill(0);
          const confScale = (100 / (blViews[i].confidence || 50));  // higher confidence → lower omega
          row[i] = PtauSigPt[i][i] * confScale;
          return row;
        });

        try {
          // BL posterior: μ_BL = [(τΣ)⁻¹ + P'Ω⁻¹P]⁻¹ × [(τΣ)⁻¹Π + P'Ω⁻¹Q]
          const tauSig    = matScale(cov, tau);
          const tauSigInv = matInv(tauSig);
          const OmegaInv  = matInv(Omega);

          const PtOmInv   = matMul(transpose(P), OmegaInv);
          const PtOmInvP  = matMul(PtOmInv, P);
          const A         = matAdd(tauSigInv, PtOmInvP);
          const Ainv      = matInv(A);

          const tauSigInvPi = tauSigInv.map(row => row.reduce((s, v, j) => s + v * Pi[j], 0));
          const PtOmInvQ    = PtOmInv.map(row => row.reduce((s, v, j) => s + v * Q[j], 0));
          const rhs         = tauSigInvPi.map((v, i) => v + PtOmInvQ[i]);

          mu_bl = Ainv.map(row => row.reduce((s, v, j) => s + v * rhs[j], 0));
        } catch (invErr) {
          showStatus(`Error en BL: ${invErr.message}`, "error");
          runBtn.disabled = false;
          runBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polygon points="5 3 19 12 5 21 5 3"/></svg> Aplicar Black-Litterman`;
          return;
        }
      }

      showStatus(`Simulando ${nSim.toLocaleString()} portafolios con retornos BL...`, "loading");

      // MVO with BL returns
      const portfolios = [];
      for (let s = 0; s < nSim; s++) {
        const w = randomWeights(N);
        const { ret, vol } = portfolioStats(w, mu_bl, cov);
        portfolios.push({ w, ret, vol, sharpe: (ret - rfr) / (vol + 1e-12) });
      }

      const minVarPortfolio   = refineMinVariance(mu_bl, cov, N, rfr, null, 0, 1);
      const maxSharpePortfolio = refineMaxSharpe(mu_bl, cov, N, rfr, null, 0, 1);

      mkwResult = {
        portfolios, minVarPortfolio, maxSharpePortfolio,
        mu: mu_bl, mu_hist, mu_eq: Pi, cov, tickers, rfr, returnsMatrix
      };

      showStatus("", "");
      showResults(true);
      drawFrontier();
      renderOptimalCards();
      renderWeightsPanel(maxSharpePortfolio, "Black-Litterman — Máx. Sharpe");
      renderCalcSection();
      renderBLReturnComparisonCard(tickers, Pi, mu_hist, mu_bl);
      drawForecast();

    } catch (err) {
      const msg = String(err.message || err);
      showStatus(msg.toLowerCase().includes("fetch") ? "No se pudo conectar con el servidor. Ejecuta 'python api.py' primero." : msg, "error");
    } finally {
      runBtn.disabled = false;
      runBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polygon points="5 3 19 12 5 21 5 3"/></svg> Aplicar Black-Litterman`;
    }
  }

  function renderBLReturnComparisonCard(tickers, Pi, mu_hist, mu_bl) {
    const container = document.getElementById("mkwResultsSection");
    if (!container) return;
    const existing = document.getElementById("mkwBLCompCard");
    const card = existing || (() => {
      const c = document.createElement("div");
      c.id = "mkwBLCompCard";
      c.className = "dashboard-card";
      container.appendChild(c);
      return c;
    })();

    const rows = tickers.map((t, i) => {
      const color = mkwAssets.find(a => a.ticker === t)?.color || PALETTE[i % PALETTE.length];
      const fmt = v => (v >= 0 ? "+" : "") + (v * 100).toFixed(2) + "%";
      const cls = v => v >= 0 ? "mkw-pos" : "mkw-neg";
      return `<tr>
        <td><span class="mkw-table-dot" style="background:${color}"></span>${t}</td>
        <td class="${cls(mu_hist[i])}">${fmt(mu_hist[i])}</td>
        <td class="${cls(Pi[i])}">${fmt(Pi[i])}</td>
        <td class="${cls(mu_bl[i])}"><strong>${fmt(mu_bl[i])}</strong></td>
        <td class="${cls(mu_bl[i] - Pi[i])}">${fmt(mu_bl[i] - Pi[i])}</td>
      </tr>`;
    }).join("");

    card.innerHTML = `
      <div class="card-header"><h3>Retornos Esperados — Black-Litterman</h3><span>Comparación: histórico · equilibrio (CAPM) · posterior BL</span></div>
      <div class="mkw-weights-table-shell tracker-table-shell">
        <table class="tracker-table mkw-calc-table">
          <thead><tr><th>Activo</th><th>Histórico</th><th>Equilibrio Π</th><th>BL Posterior μ</th><th>Ajuste</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="mkw-calc-matrix-note" style="margin-top:10px">τ = ${document.getElementById("blTau")?.value || 0.05} · δ = ${document.getElementById("blDelta")?.value || 2.5} · Views: ${blViews.length}. El posterior BL combina el equilibrio de mercado con las views del inversor ponderadas por confianza.</p>`;
  }
})();
