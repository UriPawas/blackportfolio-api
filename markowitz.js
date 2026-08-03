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
  let mkwMaxCap = null; // per-asset weight cap (fraction) or null; set at start of each run
  let mkwInitialized = false;
  let mkwForecastYears = 5;
  let mkwRfrData = { rate: 9.0, label: "fallback", date: null, source: "fallback" };
  let mkwAbortController = null;       // aborts in-flight fetches on a new run
  let mkwActiveWorker = null;          // tracks the active Monte Carlo Web Worker
  let mkwLastWeights = null;           // last {p,title} drawn in the weights panel (for theme redraw)
  const mkwOhlcvCache = new Map();     // key: "period|TICKER,TICKER" → { ticker: { closes, timestamps } }

  // Re-render charts on theme switch (called from applyTheme in main.js)
  window.redrawMarkowitzCharts = function () {
    if (!mkwResult) return;
    try {
      drawFrontier();
      drawForecast();
      if (mkwLastWeights) renderWeightsPanel(mkwLastWeights.p, mkwLastWeights.title);
    } catch { /* canvas not ready */ }
  };

  // ── Public init (called once when section is activated) ────────────────────
  window.initMarkowitz = function () {
    if (mkwInitialized) {
      // Re-draw frontier in case canvas resized
      if (mkwResult) drawFrontier();
      return;
    }
    mkwInitialized = true;
    bindEvents();
    loadDraft();
    renderAssetList();
    refreshSavedSelect();
    fetchMkwRfr();
    updateModeDesc(getActiveMode());
    updateRunBtnState();
  };

  // ── Mode description + run-button gating ────────────────────────────────────
  const MODE_DESCRIPTIONS = {
    mvo: "Optimización clásica riesgo-retorno (Markowitz). Ideal para empezar: encuentra la mejor mezcla con tus datos históricos.",
    smartbeta: "Inclina el portafolio hacia factores como momentum o baja volatilidad. Para usuarios que quieren un sesgo sistemático.",
    blacklitterman: "Combina el equilibrio de mercado con tus propias expectativas (views). Avanzado: requiere definir retornos esperados."
  };

  function updateModeDesc(mode) {
    const el = document.getElementById("mkwModeDesc");
    if (el) el.textContent = MODE_DESCRIPTIONS[mode] || MODE_DESCRIPTIONS.mvo;
  }

  function updateRunBtnState() {
    const btn = document.getElementById("mkwRunBtn");
    if (!btn) return;
    const enough = mkwAssets.length >= 2;
    btn.disabled = !enough;
    btn.title = enough ? "" : "Agrega al menos 2 activos para optimizar";
  }

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
    document.querySelectorAll(".mkw-preset-card").forEach(btn => {
      btn.addEventListener("click", () => {
        mkwAssets = [];
        btn.dataset.tickers.split(",").forEach(t => addAsset(t.trim()));
        updateFiNote();
        saveDraft();
      });
    });

    // Advanced params toggle
    document.getElementById("mkwAdvToggle")?.addEventListener("click", e => {
      const btn = e.currentTarget;
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      document.getElementById("mkwAdvGrid")?.classList.toggle("hidden", expanded);
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

    // Per-asset max weight cap toggle
    document.getElementById("mkwMaxWeightEnabled")?.addEventListener("change", e => {
      document.getElementById("mkwMaxWeightOptions")?.classList.toggle("hidden", !e.target.checked);
      updateMaxWeightNote();
    });
    document.getElementById("mkwMaxWeight")?.addEventListener("input", updateMaxWeightNote);

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
        updateModeDesc(mode);
        updateRunBtnState();
      });
    });

    // Black-Litterman: add view button
    document.getElementById("mkwBLAddViewBtn")?.addEventListener("click", addBLView);

    // Saved portfolios + export
    document.getElementById("mkwSaveBtn")?.addEventListener("click", saveCurrentPortfolio);
    document.getElementById("mkwLoadBtn")?.addEventListener("click", loadSelectedPortfolio);
    document.getElementById("mkwDeleteSavedBtn")?.addEventListener("click", deleteSelectedPortfolio);
    document.getElementById("mkwExportCsvBtn")?.addEventListener("click", exportResultCsv);

    // Compare saved portfolios
    document.getElementById("mkwCompareBtn")?.addEventListener("click", openCompareModal);
    document.getElementById("mkwCompareCloseBtn")?.addEventListener("click", closeCompareModal);
    document.getElementById("mkwCompareRunBtn")?.addEventListener("click", runComparison);
    document.getElementById("mkwCompareModal")?.addEventListener("click", e => {
      if (e.target.id === "mkwCompareModal") closeCompareModal();
    });
    document.getElementById("mkwCompareList")?.addEventListener("change", e => {
      if (e.target.classList.contains("mkw-compare-check")) updateCompareHint();
    });

    // Auto-persist the working draft (asset list + params) so it survives reloads
    ["mkwPeriod", "mkwRfr", "mkwNSim", "mkwVarConf", "mkwFiEnabled", "mkwFiMin",
     "mkwFiMax", "mkwMaxWeightEnabled", "mkwMaxWeight"].forEach(id => {
      document.getElementById(id)?.addEventListener("change", saveDraft);
    });
    document.querySelectorAll(".mkw-mode-tab").forEach(b => b.addEventListener("click", saveDraft));
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

  // Per-asset max weight cap (fraction). Returns null if disabled.
  // Clamps to the feasible minimum 1/N so the simplex (Σw=1) always has a solution.
  function getMaxWeightCap() {
    const enabled = document.getElementById("mkwMaxWeightEnabled")?.checked;
    if (!enabled) return null;
    const n = mkwAssets.length;
    if (n === 0) return null;
    let pct = parseFloat(document.getElementById("mkwMaxWeight")?.value);
    if (!isFinite(pct) || pct <= 0) return null;
    let cap = Math.min(1, pct / 100);
    const minFeasible = 1 / n;
    if (cap < minFeasible) cap = minFeasible;
    return cap;
  }

  function updateMaxWeightNote() {
    const note = document.getElementById("mkwMaxWeightNote");
    if (!note) return;
    const enabled = document.getElementById("mkwMaxWeightEnabled")?.checked;
    if (!enabled) { note.textContent = ""; return; }
    const n = mkwAssets.length;
    const pct = parseFloat(document.getElementById("mkwMaxWeight")?.value);
    if (document.getElementById("mkwFiEnabled")?.checked) {
      note.textContent = "Nota: el tope por activo no se combina con las restricciones de renta fija (estas tienen prioridad).";
      return;
    }
    if (n >= 2 && isFinite(pct) && pct / 100 < 1 / n - 1e-9) {
      note.textContent = `Con ${n} activos, el mínimo viable es ${(100 / n).toFixed(1)}% por activo. Se usará ese valor.`;
    } else {
      note.textContent = "Ningún activo podrá superar este porcentaje del portafolio.";
    }
  }

  // ── Per-asset cap helpers ─────────────────────────────────────────────────
  // Project w onto { 0 ≤ w_i ≤ cap, Σw_i = 1 } via water-filling: violators are
  // fixed at the cap permanently and the remaining mass is shared among the rest
  // in proportion to the original weights, re-checking until none exceed the cap.
  function projectSimplexCapped(w, cap) {
    const n = w.length;
    if (cap * n < 1) cap = 1 / n;
    let s0 = 0;
    const orig = w.map(x => { const v = Math.max(0, x); s0 += v; return v; });
    if (s0 < 1e-12) return Array(n).fill(1 / n);
    const normOrig = orig.map(x => x / s0);

    const fixed = Array(n).fill(false);
    let v = normOrig.slice();
    for (let iter = 0; iter <= n; iter++) {
      const fixedMass = fixed.reduce((acc, f) => acc + (f ? cap : 0), 0);
      const remaining = Math.max(0, 1 - fixedMass);
      let freeSum = 0, freeCount = 0;
      for (let i = 0; i < n; i++) if (!fixed[i]) { freeSum += normOrig[i]; freeCount++; }

      v = normOrig.map((x, i) => {
        if (fixed[i]) return cap;
        return freeSum > 1e-12 ? (x / freeSum) * remaining : (freeCount > 0 ? remaining / freeCount : 0);
      });

      let newViolator = false;
      for (let i = 0; i < n; i++) {
        if (!fixed[i] && v[i] > cap + 1e-9) { fixed[i] = true; newViolator = true; }
      }
      if (!newViolator) break;
    }
    return v.map(x => Math.min(cap, x));
  }

  function randomWeightsCapped(n, cap) {
    return projectSimplexCapped(randomWeights(n), cap);
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
      flashInput();
      showInputMsg(`${ticker} ya está en la lista.`, "warn");
      return;
    }
    if (mkwAssets.length >= 12) {
      showInputMsg("Máximo 12 activos por portafolio.", "warn"); return;
    }
    const isFi = meta.quoteType
      ? detectFiFromMeta(meta.quoteType, meta.name || "", ticker)
      : isFixedIncome(ticker);
    mkwAssets.push({ ticker, color: PALETTE[mkwAssets.length % PALETTE.length], isFi, name: meta.name || "" });
    renderAssetList();
    updateFiNote();
    saveDraft();
    showInputMsg("", "");
    // If added manually (no API metadata), enrich async
    if (!meta.quoteType) enrichAssetMeta(ticker);
  }

  // Inline validation message under the ticker input
  function showInputMsg(msg, type) {
    const el = document.getElementById("mkwInputMsg");
    if (!el) return;
    el.textContent = msg;
    el.className = "mkw-input-msg" + (type ? " mkw-input-msg-" + type : "");
    el.style.display = msg ? "block" : "none";
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
      const asset = mkwAssets.find(a => a.ticker === ticker);
      if (!asset) return;
      if (!match) {
        showInputMsg(`No encontramos "${ticker}" en Yahoo Finance. Verifica el símbolo (ej. BTC-USD, BRK-B).`, "warn");
        return;
      }
      const name = match.longname || match.shortname || "";
      const detected = detectFiFromMeta(match.quoteType || "", name, ticker);
      const changed = detected !== asset.isFi || name !== asset.name;
      asset.isFi = detected;
      asset.name = name;
      if (changed) { renderAssetList(); updateFiNote(); }
    } catch { /* API offline — keep pattern-based result */ }
  }

  function removeAsset(ticker) {
    mkwAssets = mkwAssets.filter(a => a.ticker !== ticker);
    mkwAssets.forEach((a, i) => { a.color = PALETTE[i % PALETTE.length]; });
    renderAssetList();
    updateFiNote();
    saveDraft();
  }

  function renderAssetList() {
    const list = document.getElementById("mkwAssetList");
    const countEl = document.getElementById("mkwAssetCount");
    if (countEl) countEl.textContent = `${mkwAssets.length} / 12`;
    if (!list) return;

    if (mkwAssets.length === 0) {
      list.innerHTML = '<p class="mkw-empty-assets">Agrega al menos 2 activos para optimizar.</p>';
      updateRunBtnState();
      return;
    }

    list.innerHTML = mkwAssets.map(a => {
      const shortName = a.name ? String(a.name).split("-")[0].trim().slice(0, 22) : "";
      return `<div class="mkw-asset-chip"${shortName ? ` title="${a.name.replace(/"/g, "&quot;")}"` : ""}>
        <span class="mkw-chip-dot" style="background:${a.color}"></span>
        <span class="mkw-chip-label">${a.ticker}</span>
        ${shortName ? `<span class="mkw-chip-name">${shortName}</span>` : ''}
        ${a.isFi ? '<span class="mkw-chip-fi">RF</span>' : ''}
        <button class="mkw-chip-remove" data-ticker="${a.ticker}" type="button" aria-label="Quitar ${a.ticker}">×</button>
      </div>`;
    }).join("");

    list.querySelectorAll(".mkw-chip-remove").forEach(btn => {
      btn.addEventListener("click", () => removeAsset(btn.dataset.ticker));
    });
    updateRunBtnState();
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
    const cap = (!hasFiConstraint && mkwMaxCap) ? mkwMaxCap : null;
    const project = hasFiConstraint
      ? w => projectConstrainedSimplex(w, fiIdx, fiMin, fiMax)
      : cap
        ? w => projectSimplexCapped(w, cap)
        : w => projectSimplex(w);
    let w = hasFiConstraint
      ? randomWeightsConstrained(n, fiIdx, (fiMin + fiMax) / 2, (fiMin + fiMax) / 2)
      : cap
        ? randomWeightsCapped(n, cap)
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
    const cap = (!hasFiConstraint && mkwMaxCap) ? mkwMaxCap : null;
    const project = hasFiConstraint
      ? w => projectConstrainedSimplex(w, fiIdx, fiMin, fiMax)
      : cap
        ? w => projectSimplexCapped(w, cap)
        : w => projectSimplex(w);
    const genSeed = () => hasFiConstraint
      ? randomWeightsConstrained(n, fiIdx, fiMin, fiMax)
      : cap
        ? randomWeightsCapped(n, cap)
        : randomWeights(n);

    const candidates = [hasFiConstraint ? randomWeightsConstrained(n, fiIdx, (fiMin + fiMax) / 2, (fiMin + fiMax) / 2) : (cap ? randomWeightsCapped(n, cap) : Array(n).fill(1 / n))];
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

  function setActiveMode(mode) {
    const btn = document.querySelector(`.mkw-mode-tab[data-mode="${mode}"]`);
    if (btn && !btn.classList.contains("mkw-mode-active")) btn.click();
  }

  // ── Shared OHLCV fetch with per-(period+tickers) cache and abort ────────────
  // Fetches weekly closes for every asset in parallel. Cached by period + symbol
  // set so switching modes (MVO → Smart Beta → BL) reuses the same download.
  async function fetchOHLCVMap(tickers, period, signal) {
    const cacheKey = period + "|" + [...tickers].sort().join(",");
    if (mkwOhlcvCache.has(cacheKey)) {
      // Return a shallow copy so callers can't mutate the cached arrays.
      const cached = mkwOhlcvCache.get(cacheKey);
      return Object.fromEntries(tickers.map(t => [t, cached[t]]));
    }
    const dataMap = {};
    await Promise.all(tickers.map(async ticker => {
      const res = await fetch(`${API_BASE_URL}/chart/${ticker}?range=${period}&interval=1wk`, { signal });
      if (!res.ok) throw new Error(`No se pudieron obtener datos para ${ticker} (HTTP ${res.status})`);
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      const rawTs    = result?.timestamp ?? [];
      const rawClose = result?.indicators?.quote?.[0]?.close ?? [];
      // Keep only pairs where close is valid (non-null, positive)
      const pairs = rawTs.map((ts, i) => ({ ts, price: rawClose[i] }))
                         .filter(p => p.price != null && p.price > 0);
      dataMap[ticker] = { timestamps: pairs.map(p => p.ts), closes: pairs.map(p => p.price) };
      if (dataMap[ticker].closes.length < 40)
        throw new Error(`Datos insuficientes para ${ticker} (${dataMap[ticker].closes.length} velas)`);
      // Reject incomplete/placeholder feeds: a real instrument is never perfectly
      // flat over a multi-month window. A flat series means Yahoo returned partial
      // data — bail before caching (mkwOhlcvCache.set runs only after all resolve)
      // so a retry recovers instead of collapsing the whole frontier to one point.
      const cl = dataMap[ticker].closes;
      const lo = Math.min(...cl), hi = Math.max(...cl);
      if (hi - lo < hi * 1e-4)
        throw new Error(`Datos de mercado incompletos para ${ticker} (serie plana). Reintenta en unos segundos.`);
    }));
    mkwOhlcvCache.set(cacheKey, dataMap);
    return Object.fromEntries(tickers.map(t => [t, dataMap[t]]));
  }

  // Start a fresh run: abort in-flight fetches AND any live MC worker.
  function beginRun() {
    if (mkwAbortController) mkwAbortController.abort();
    if (mkwActiveWorker) { mkwActiveWorker.terminate(); mkwActiveWorker = null; }
    mkwAbortController = new AbortController();
    return mkwAbortController.signal;
  }
  function isAbortError(err) {
    return err && (err.name === "AbortError" || String(err.message || "").includes("aborted"));
  }

  // ── P1-4: Timestamp alignment ─────────────────────────────────────────────
  // Intersects weekly timestamps across all tickers so returns are date-matched
  // rather than tail-aligned (which mis-pairs weeks when assets have different
  // histories or missing bars).
  function alignAndComputeReturns(dataMap, tickers) {
    // Build timestamp→price maps per ticker
    const maps = tickers.map(t => {
      const m = new Map();
      const { timestamps, closes } = dataMap[t];
      timestamps.forEach((ts, i) => m.set(ts, closes[i]));
      return m;
    });
    // Intersect: only keep timestamps present in every ticker
    const sets = maps.map(m => new Set(m.keys()));
    let common = [...sets[0]];
    for (let i = 1; i < sets.length; i++) common = common.filter(ts => sets[i].has(ts));
    common.sort((a, b) => a - b);
    if (common.length < 42) return null; // need ≥41 prices for ≥40 returns

    const aligned = tickers.map((_, i) => common.map(ts => maps[i].get(ts)));
    // Log-returns from aligned prices
    const returnsMatrix = aligned.map(prices => {
      const r = [];
      for (let j = 1; j < prices.length; j++) r.push(Math.log(prices[j] / prices[j - 1]));
      return r;
    });
    return { returnsMatrix, commonDates: common };
  }

  // ── P1-5: Ledoit-Wolf shrinkage (Oracle Approximating Shrinkage) ─────────
  // Shrinks the sample covariance toward (tr(S)/p)·I to reduce estimation
  // error in short windows. Prevents extreme concentrated weights from noisy Σ.
  function shrinkLW(S, nObs) {
    const p = S.length;
    if (p <= 1 || nObs <= p) return S; // degenerate: no shrinkage
    let trS = 0, trSS = 0;
    for (let i = 0; i < p; i++) {
      trS += S[i][i];
      for (let j = 0; j < p; j++) trSS += S[i][j] * S[i][j];
    }
    const trS2 = trS * trS;
    const num = (1 - 2 / p) * trSS + trS2;
    const den = (nObs + 1 - 2 / p) * (trSS - trS2 / p);
    const rho = den > 1e-14 ? Math.max(0, Math.min(1, num / den)) : 1;
    const mu = trS / p; // target = mu·I
    return S.map((row, i) => row.map((v, j) => (1 - rho) * v + (i === j ? rho * mu : 0)));
  }

  // ── P1-7: Analytical closed-form solutions ────────────────────────────────
  // Used when there are no active constraints (no FI band, no weight cap).
  // Replaces the gradient descent loops → O(p³) one-shot vs 3000-4000 iters.
  function matVecMkw(M, v) {
    return M.map(row => row.reduce((s, x, j) => s + x * v[j], 0));
  }
  // Returns safe inverse or null if matrix is (near-)singular.
  function matInvSafe(A) {
    const p = A.length;
    const M = A.map((r, i) => [...r, ...Array.from({ length: p }, (_, j) => i === j ? 1 : 0)]);
    for (let col = 0; col < p; col++) {
      let pivot = col;
      for (let r = col + 1; r < p; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
      [M[col], M[pivot]] = [M[pivot], M[col]];
      const d = M[col][col];
      if (Math.abs(d) < 1e-12) return null;
      for (let j = 0; j < 2 * p; j++) M[col][j] /= d;
      for (let r = 0; r < p; r++) {
        if (r === col) continue;
        const f = M[r][col];
        for (let j = 0; j < 2 * p; j++) M[r][j] -= f * M[col][j];
      }
    }
    return M.map(r => r.slice(p));
  }
  // Global minimum variance portfolio: w = Σ⁻¹·1 / (1ᵀ·Σ⁻¹·1), projected to Δ₊
  function analyticalMinVarW(cov) {
    const inv = matInvSafe(cov);
    if (!inv) return null;
    let w = matVecMkw(inv, Array(cov.length).fill(1));
    const s = w.reduce((a, b) => a + b, 0);
    if (Math.abs(s) < 1e-12) return null;
    return projectSimplex(w.map(x => x / s));
  }
  // Tangency portfolio: w = Σ⁻¹·(μ−rf) / (1ᵀ·Σ⁻¹·(μ−rf)), projected to Δ₊
  function analyticalMaxSharpeW(mu, cov, rfr) {
    const inv = matInvSafe(cov);
    if (!inv) return null;
    const excess = mu.map(m => m - rfr);
    let w = matVecMkw(inv, excess);
    const s = w.reduce((a, b) => a + b, 0);
    if (Math.abs(s) < 1e-12 || s < 0) return null; // all-negative excess → infeasible
    return projectSimplex(w.map(x => x / s));
  }

  // ── P1-7: Async Monte Carlo via Web Worker (non-blocking) ────────────────
  // Serializes the needed pure functions into an inline Blob worker so the
  // 10k–75k simulation loop runs off the main thread.
  function buildMkwWorker() {
    const fns = [dot, portfolioStats,
                 randomWeights, randomWeightsConstrained, randomWeightsCapped,
                 projectSimplex, projectSimplexCapped, projectConstrainedSimplex
                ].map(f => f.toString()).join('\n');
    const body = fns + `
      self.onmessage = function(e) {
        var d = e.data;
        var portfolios = [];
        for (var s = 0; s < d.nSim; s++) {
          var w = d.useFi ? randomWeightsConstrained(d.n, d.fiIdx, d.fiMin, d.fiMax)
                          : d.mkwMaxCap ? randomWeightsCapped(d.n, d.mkwMaxCap)
                          : randomWeights(d.n);
          var stats = portfolioStats(w, d.mu, d.cov);
          portfolios.push({ w: w, ret: stats.ret, vol: stats.vol,
                            sharpe: (stats.ret - d.rfr) / (stats.vol + 1e-12) });
        }
        self.postMessage(portfolios);
      };
    `;
    try {
      return new Worker(URL.createObjectURL(new Blob([body], { type: 'application/javascript' })));
    } catch { return null; }
  }
  function runMonteCarloPar(params) {
    const worker = buildMkwWorker();
    if (!worker) {
      // Fallback: synchronous (old browsers / strict CSP)
      const { mu, cov, n, rfr, nSim, useFi, fiIdx, fiMin, fiMax, mkwMaxCap: cap } = params;
      const portfolios = [];
      for (let s = 0; s < nSim; s++) {
        const w = useFi ? randomWeightsConstrained(n, fiIdx, fiMin, fiMax)
                        : cap ? randomWeightsCapped(n, cap) : randomWeights(n);
        const { ret, vol } = portfolioStats(w, mu, cov);
        portfolios.push({ w, ret, vol, sharpe: (ret - rfr) / (vol + 1e-12) });
      }
      return Promise.resolve(portfolios);
    }
    mkwActiveWorker = worker;
    return new Promise((resolve, reject) => {
      worker.onmessage = e => { worker.terminate(); mkwActiveWorker = null; resolve(e.data); };
      worker.onerror  = e => {
        worker.terminate(); mkwActiveWorker = null;
        if (e.message) { reject(new Error(e.message)); return; }
        // Worker blocked (e.g. CSP) — fall back to synchronous computation
        const { mu, cov, n, rfr, nSim, useFi, fiIdx, fiMin, fiMax, mkwMaxCap: cap } = params;
        const portfolios = [];
        for (let s = 0; s < nSim; s++) {
          const w = useFi ? randomWeightsConstrained(n, fiIdx, fiMin, fiMax)
                          : cap ? randomWeightsCapped(n, cap) : randomWeights(n);
          const { ret, vol } = portfolioStats(w, mu, cov);
          portfolios.push({ w, ret, vol, sharpe: (ret - rfr) / (vol + 1e-12) });
        }
        resolve(portfolios);
      };
      worker.postMessage(params);
    });
  }

  // ── Persistence (per-user, namespaced — never touches tracker/user keys) ────
  function mkwUid() {
    try { return window.BlackPortfolioAuth?.getSession()?.id || "anonymous"; }
    catch { return "anonymous"; }
  }
  function draftKey() { return `bp-mkw-draft-${mkwUid()}`; }
  function savedKey() { return `bp-mkw-saved-${mkwUid()}`; }

  function readParams() {
    return {
      mode: getActiveMode(),
      period: document.getElementById("mkwPeriod")?.value,
      rfr: document.getElementById("mkwRfr")?.value,
      nSim: document.getElementById("mkwNSim")?.value,
      varConf: document.getElementById("mkwVarConf")?.value,
      fiEnabled: !!document.getElementById("mkwFiEnabled")?.checked,
      fiMin: document.getElementById("mkwFiMin")?.value,
      fiMax: document.getElementById("mkwFiMax")?.value,
      maxWeightEnabled: !!document.getElementById("mkwMaxWeightEnabled")?.checked,
      maxWeight: document.getElementById("mkwMaxWeight")?.value,
    };
  }
  function applyParams(p) {
    if (!p) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.value = v; };
    set("mkwPeriod", p.period); set("mkwRfr", p.rfr); set("mkwNSim", p.nSim); set("mkwVarConf", p.varConf);
    set("mkwFiMin", p.fiMin); set("mkwFiMax", p.fiMax); set("mkwMaxWeight", p.maxWeight);
    const fiEl = document.getElementById("mkwFiEnabled");
    if (fiEl) { fiEl.checked = !!p.fiEnabled; document.getElementById("mkwFiOptions")?.classList.toggle("hidden", !p.fiEnabled); }
    const mwEl = document.getElementById("mkwMaxWeightEnabled");
    if (mwEl) { mwEl.checked = !!p.maxWeightEnabled; document.getElementById("mkwMaxWeightOptions")?.classList.toggle("hidden", !p.maxWeightEnabled); }
    if (p.mode) setActiveMode(p.mode);
    updateMkwRfrLabel();
    updateFiNote();
    updateMaxWeightNote();
  }

  function saveDraft() {
    try { localStorage.setItem(draftKey(), JSON.stringify({ assets: mkwAssets, params: readParams() })); }
    catch { /* storage full / unavailable — non-fatal */ }
  }
  function loadDraft() {
    try {
      const raw = localStorage.getItem(draftKey());
      if (!raw) return;
      const d = JSON.parse(raw);
      if (Array.isArray(d.assets) && d.assets.length) {
        mkwAssets = d.assets
          .filter(a => a && a.ticker)
          .slice(0, 12)
          .map((a, i) => ({ ticker: String(a.ticker).toUpperCase(), color: PALETTE[i % PALETTE.length], isFi: !!a.isFi, name: a.name || "" }));
        renderAssetList();
        updateFiNote();
      }
      if (d.params) applyParams(d.params);
    } catch { /* corrupt draft — ignore */ }
  }

  function getSavedPortfolios() {
    try { return JSON.parse(localStorage.getItem(savedKey())) ?? []; } catch { return []; }
  }
  function setSavedPortfolios(list) {
    try { localStorage.setItem(savedKey(), JSON.stringify(list)); } catch { /* non-fatal */ }
  }
  function refreshSavedSelect(selectIndex) {
    const sel = document.getElementById("mkwSavedSelect");
    if (!sel) return;
    const list = getSavedPortfolios();
    sel.innerHTML = '<option value="">Portafolios guardados…</option>' +
      list.map((s, i) => `<option value="${i}">${escapeHtmlMkw(s.name)}</option>`).join("");
    if (selectIndex != null) sel.value = String(selectIndex);
  }
  function escapeHtmlMkw(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function saveCurrentPortfolio() {
    if (mkwAssets.length < 2) { showStatus("Agrega al menos 2 activos antes de guardar.", "warn"); return; }
    const fallback = mkwAssets.map(a => a.ticker).slice(0, 3).join("-");
    const name = (prompt("Nombre del portafolio:", fallback) || "").trim();
    if (!name) return;
    const list = getSavedPortfolios();
    const entry = {
      name,
      assets: mkwAssets.map(a => ({ ticker: a.ticker, isFi: a.isFi })),
      params: readParams(),
      savedAt: Date.now(),
    };
    const existing = list.findIndex(s => s.name === name);
    if (existing >= 0) list[existing] = entry; else list.push(entry);
    setSavedPortfolios(list);
    refreshSavedSelect(existing >= 0 ? existing : list.length - 1);
    showStatus(`Portafolio "${name}" guardado.`, "success");
  }
  function loadSelectedPortfolio() {
    const sel = document.getElementById("mkwSavedSelect");
    const idx = parseInt(sel?.value, 10);
    const list = getSavedPortfolios();
    if (isNaN(idx) || !list[idx]) { showStatus("Selecciona un portafolio guardado.", "warn"); return; }
    const s = list[idx];
    mkwAssets = (s.assets || [])
      .filter(a => a && a.ticker)
      .slice(0, 12)
      .map((a, i) => ({ ticker: String(a.ticker).toUpperCase(), color: PALETTE[i % PALETTE.length], isFi: !!a.isFi }));
    renderAssetList();
    updateFiNote();
    applyParams(s.params);
    saveDraft();
    showStatus(`"${s.name}" cargado. Pulsa Optimizar para ejecutar.`, "success");
  }
  function deleteSelectedPortfolio() {
    const sel = document.getElementById("mkwSavedSelect");
    const idx = parseInt(sel?.value, 10);
    const list = getSavedPortfolios();
    if (isNaN(idx) || !list[idx]) { showStatus("Selecciona un portafolio guardado para eliminar.", "warn"); return; }
    const name = list[idx].name;
    if (!confirm(`¿Eliminar el portafolio guardado "${name}"?`)) return;
    list.splice(idx, 1);
    setSavedPortfolios(list);
    refreshSavedSelect();
    showStatus(`"${name}" eliminado.`, "");
  }

  // ── CSV export of the optimized result ──────────────────────────────────────
  function exportResultCsv() {
    if (!mkwResult) { showStatus("Ejecuta una optimización antes de exportar.", "warn"); return; }
    const { tickers, minVarPortfolio, maxSharpePortfolio, mu, cov, rfr } = mkwResult;
    const pct = x => (x * 100).toFixed(2);
    const stat = p => {
      const vol = p.vol, ret = p.ret;
      return { ret: pct(ret), vol: pct(vol), sharpe: ((ret - rfr) / vol).toFixed(3) };
    };
    const ms = stat(maxSharpePortfolio), mv = stat(minVarPortfolio);

    const rows = [];
    rows.push(["BlackPortfolio — Resultado de optimización"]);
    rows.push(["Generado", new Date().toLocaleString()]);
    rows.push(["Modo", getActiveMode()]);
    rows.push(["Tasa libre de riesgo (%)", (rfr * 100).toFixed(2)]);
    rows.push([]);
    rows.push(["Métrica", "Máx. Sharpe", "Mín. Varianza"]);
    rows.push(["Retorno esperado (%)", ms.ret, mv.ret]);
    rows.push(["Volatilidad (%)", ms.vol, mv.vol]);
    rows.push(["Sharpe", ms.sharpe, mv.sharpe]);
    rows.push([]);
    rows.push(["Activo", "Retorno esp. anual (%)", "Peso Máx. Sharpe (%)", "Peso Mín. Varianza (%)"]);
    tickers.forEach((t, i) => {
      rows.push([t, pct(mu[i]), pct(maxSharpePortfolio.w[i]), pct(minVarPortfolio.w[i])]);
    });

    const csv = rows.map(r => r.map(cellCsv).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `portafolio_${tickers.join("-")}_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showStatus("CSV exportado.", "success");
  }
  function cellCsv(v) {
    const s = String(v ?? "");
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  // ── Core optimization ──────────────────────────────────────────────────────
  async function runOptimization() {
    if (mkwAssets.length < 2) {
      showStatus("Agrega al menos 2 activos.", "error"); return;
    }
    const mode = getActiveMode();
    window.bpTrack?.("optimize_run", { mode, assets: mkwAssets.length });
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
    mkwMaxCap = getMaxWeightCap();
    const signal = beginRun();

    try {
      // ── 1. Fetch OHLCV (cached per period+tickers, abortable) ──────────
      const dataMap = await fetchOHLCVMap(mkwAssets.map(a => a.ticker), period, signal);

      showStatus("Alineando fechas y calculando retornos...", "loading");

      // ── 2. Timestamp-aligned returns (P1-4) ───────────────────────────
      const tickers = mkwAssets.map(a => a.ticker);
      const N = tickers.length;
      const aligned = alignAndComputeReturns(dataMap, tickers);
      if (!aligned) throw new Error("No hay suficientes fechas comunes entre los activos seleccionados (mínimo 40 semanas alineadas).");
      const { returnsMatrix, commonDates } = aligned;
      const T = returnsMatrix[0].length;

      // Annualised mean (×52 for weekly)
      const mu = returnsMatrix.map(r => (r.reduce((s, v) => s + v, 0) / T) * 52);

      // Annualised sample covariance (×52), then Ledoit-Wolf shrinkage (P1-5)
      const covRaw = Array.from({ length: N }, (_, i) =>
        Array.from({ length: N }, (_, j) => {
          const ri = returnsMatrix[i], rj = returnsMatrix[j];
          const mi = mu[i] / 52, mj = mu[j] / 52;
          return (ri.reduce((s, v, k) => s + (v - mi) * (rj[k] - mj), 0) / (T - 1)) * 52;
        })
      );
      const cov = shrinkLW(covRaw, T); // shrunk covariance used for optimization

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
      const hasConstraints = useFi || !!mkwMaxCap;

      showStatus(`Simulando ${nSim.toLocaleString()} portafolios (worker)...`, "loading");

      // ── 3. Monte Carlo via Web Worker — non-blocking (P1-7) ────────────
      const portfolios = await runMonteCarloPar({
        mu, cov, n: N, rfr, nSim, useFi,
        fiIdx: useFi ? fiIdx : [],
        fiMin, fiMax, mkwMaxCap: mkwMaxCap || null
      });

      showStatus("Calculando portafolios óptimos...", "loading");

      // ── 4. Optimal portfolios: analytical (unconstrained) or gradient ──
      // P1-7: closed-form Σ⁻¹ solution is instant and exact for long-only
      // unconstrained case; fall back to gradient descent when constraints active.
      let minVarPortfolio, maxSharpePortfolio;
      if (!hasConstraints) {
        const mvW = analyticalMinVarW(cov);
        const msW = analyticalMaxSharpeW(mu, cov, rfr);
        // Analytical gives exact long-only solution when all weights ≥ 0;
        // if projection flipped signs we still want gradient refinement as fallback.
        const useAnalytical = mvW && msW;
        if (useAnalytical) {
          const mvStats = portfolioStats(mvW, mu, cov);
          const msStats = portfolioStats(msW, mu, cov);
          minVarPortfolio    = { w: mvW, ret: mvStats.ret, vol: mvStats.vol, sharpe: (mvStats.ret - rfr) / mvStats.vol };
          maxSharpePortfolio = { w: msW, ret: msStats.ret, vol: msStats.vol, sharpe: (msStats.ret - rfr) / msStats.vol };
        } else {
          minVarPortfolio    = refineMinVariance(mu, cov, N, rfr, null, 0, 1);
          maxSharpePortfolio = refineMaxSharpe(mu, cov, N, rfr, null, 0, 1);
        }
      } else {
        minVarPortfolio    = refineMinVariance(mu, cov, N, rfr, useFi ? fiIdx : null, fiMin, fiMax);
        maxSharpePortfolio = refineMaxSharpe(mu, cov, N, rfr, useFi ? fiIdx : null, fiMin, fiMax);
      }

      mkwResult = { portfolios, minVarPortfolio, maxSharpePortfolio, mu, cov, covRaw, tickers, rfr, returnsMatrix, commonDates, nObs: T };

      // ── 5. Render ──────────────────────────────────────────────────────
      showStatus("", "");
      showResults(true);
      drawFrontier();
      renderMuWarning();
      renderOptimalCards();
      renderWeightsPanel(maxSharpePortfolio, "Máx. Sharpe (Tangencia)");
      renderCalcSection();
      drawForecast();
      renderBacktestCard();

    } catch (err) {
      if (isAbortError(err)) return;  // superseded by a newer run
      const msg = String(err.message || err);
      if (msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("networkerror") || msg.toLowerCase().includes("failed to fetch")) {
        showStatus("No se pudo conectar con el servidor. Ejecuta 'python api.py' primero.", "error");
      } else {
        showStatus(msg, "error");
      }
    } finally {
      if (!signal?.aborted) {
        runBtn.disabled = false;
        runBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polygon points="5 3 19 12 5 21 5 3"/></svg> Optimizar portafolio`;
      }
    }
  }

  // ── Headless optimizer (no DOM/UI side-effects) ────────────────────────────
  // Reuses the same μ/Σ + Markowitz pipeline as runOptimization, but returns
  // plain data so other modules (the tracker's Rebalanceo tab) can request
  // optimal weights without opening the optimizer section.
  window.computeOptimalWeights = async function ({ tickers, mode = "maxsharpe", period = "2y", rfr, cap = 0.35, currentWeights = null } = {}) {
    const syms = [...new Set((tickers || []).map(t => String(t).toUpperCase()).filter(Boolean))].slice(0, 12);
    if (syms.length < 2) return { ok: false, error: "Se necesitan al menos 2 activos con precio para optimizar." };

    if (rfr == null) {
      const r = parseFloat(mkwRfrData?.rate);
      rfr = isFinite(r) ? r / 100 : 0.045;
    }

    // Resilient per-ticker fetch: drop symbols without enough history instead of
    // failing the whole run (one illiquid/unknown ticker shouldn't block it).
    const dataMap = {};
    const skipped = [];
    await Promise.all(syms.map(async sym => {
      try {
        const res = await fetch(`${API_BASE_URL}/chart/${sym}?range=${period}&interval=1wk`);
        if (!res.ok) { skipped.push(sym); return; }
        const json = await res.json();
        const result = json?.chart?.result?.[0];
        const rawTs = result?.timestamp ?? [];
        const rawClose = result?.indicators?.quote?.[0]?.close ?? [];
        const pairs = rawTs.map((ts, i) => ({ ts, price: rawClose[i] })).filter(p => p.price != null && p.price > 0);
        if (pairs.length < 40) { skipped.push(sym); return; }
        dataMap[sym] = { timestamps: pairs.map(p => p.ts), closes: pairs.map(p => p.price) };
      } catch { skipped.push(sym); }
    }));

    const usable = syms.filter(s => dataMap[s]);
    if (usable.length < 2) return { ok: false, error: "No hay suficiente historial entre tus activos para optimizar (mín. 40 semanas).", skipped };

    const aligned = alignAndComputeReturns(dataMap, usable);
    if (!aligned) return { ok: false, error: "No hay suficientes fechas comunes (mín. 40 semanas) entre los activos.", skipped };
    const { returnsMatrix } = aligned;
    const N = usable.length, T = returnsMatrix[0].length;

    const mu = returnsMatrix.map(r => (r.reduce((s, v) => s + v, 0) / T) * 52);
    const covRaw = Array.from({ length: N }, (_, i) =>
      Array.from({ length: N }, (_, j) => {
        const ri = returnsMatrix[i], rj = returnsMatrix[j];
        const mi = mu[i] / 52, mj = mu[j] / 52;
        return (ri.reduce((s, v, k) => s + (v - mi) * (rj[k] - mj), 0) / (T - 1)) * 52;
      })
    );
    const cov = shrinkLW(covRaw, T);

    // Diversification cap so no single name dominates (water-filling projection).
    mkwMaxCap = (cap && cap > 0 && cap < 1) ? Math.max(cap, 1 / N) : null;
    const opt = mode === "minvar"
      ? refineMinVariance(mu, cov, N, rfr, null, 0, 1)
      : refineMaxSharpe(mu, cov, N, rfr, null, 0, 1);
    mkwMaxCap = null;

    const weights = {};
    usable.forEach((s, i) => { weights[s] = opt.w[i]; });

    // Stats of the user's current allocation on the same μ/Σ → honest before/after.
    let current = null;
    if (currentWeights) {
      const cw = usable.map(s => Math.max(0, currentWeights[s] || 0));
      const sum = cw.reduce((a, b) => a + b, 0);
      if (sum > 1e-9) {
        const st = portfolioStats(cw.map(x => x / sum), mu, cov);
        current = { ret: st.ret, vol: st.vol, sharpe: (st.ret - rfr) / (st.vol || 1e-9) };
      }
    }

    return {
      ok: true, mode, period, rfr, nObs: T,
      tickers: usable, skipped, weights,
      optimal: { ret: opt.ret, vol: opt.vol, sharpe: opt.sharpe },
      current,
    };
  };

  // ── Theme-aware chart palette (works in both dark and light themes) ────────
  /* Los neutros replican los tokens `--v4-*` de main-v4-shell.css: el CSS no
     entra a un <canvas>, así que ejes, rejilla y rótulos tienen que repetir
     aquí los mismos valores. Si allá cambian, aquí también. Los colores de
     SERIE (mv/ms, degradado de Sharpe) son dato y no se tocan. */
  function chartColors() {
    /* Misma fuente que main-v4-*.css (`html[data-theme]`), no
       `body.light-mode`: son mecanismos distintos y pueden divergir. */
    const light = document.documentElement.dataset.theme === "light";
    return {
      light,
      grid:      light ? "#E4E9EF"              : "#1A2739",
      gridBold:  light ? "#D6DDE6"              : "#22314A",
      tick:      light ? "#5A6980"              : "#8C9BB3",
      axis:      light ? "#33415A"              : "#B4C1D5",
      ink:       light ? "#0B1524"              : "#E9EEF6",
      legend:    light ? "#33415A"              : "#B4C1D5",
      halo:      light ? "#FFFFFF"              : "#101B2B",
      baseline:  light ? "#B5C0CE"              : "#364964",
      startDot:  light ? "#5A6980"              : "#8C9BB3",
      panel:     light ? "rgba(255,255,255,0.9)" : "rgba(16,27,43,0.9)",
      mv: "#6f86ff",
      ms: "#f5b84c",
      // Sharpe gradient endpoints (low → high)
      lo: [244, 84, 110],
      hi: light ? [16, 170, 120] : [0, 210, 150],
    };
  }

  // Round-rect helper for pill labels
  function roundRectMkw(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Upper-left efficient frontier envelope: max return per volatility bin
  function efficientEnvelope(portfolios, nBins) {
    if (!portfolios.length) return [];
    const vols = portfolios.map(p => p.vol);
    const vMin = Math.min(...vols), vMax = Math.max(...vols);
    if (vMax - vMin < 1e-9) return [];
    const bins = new Array(nBins).fill(null);
    portfolios.forEach(p => {
      const k = Math.min(nBins - 1, Math.floor(((p.vol - vMin) / (vMax - vMin)) * nBins));
      if (!bins[k] || p.ret > bins[k].ret) bins[k] = { vol: p.vol, ret: p.ret };
    });
    // Keep only the non-decreasing upper hull (drop points dominated from the left)
    const pts = bins.filter(Boolean);
    const hull = [];
    let maxRet = -Infinity;
    for (const pt of pts) { if (pt.ret >= maxRet) { hull.push(pt); maxRet = pt.ret; } }
    return hull;
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

    let minVol = Math.min(...allVols, minVarPortfolio.vol, maxSharpePortfolio.vol) * 0.88;
    let maxVol = Math.max(...allVols, minVarPortfolio.vol, maxSharpePortfolio.vol) * 1.06;
    const minRet = Math.min(...allRets, minVarPortfolio.ret, maxSharpePortfolio.ret);
    const maxRet = Math.max(...allRets, minVarPortfolio.ret, maxSharpePortfolio.ret);
    const retPad = (maxRet - minRet) * 0.12;
    let minRetP = minRet - retPad;
    let maxRetP = maxRet + retPad;

    // Guard against degenerate (near-zero) spans — when all portfolios share an
    // almost-identical return or volatility the scale collapses, division by zero
    // pushes every point off-canvas and the frontier appears blank. Expand around
    // the center so markers and the scatter always render.
    if (maxRetP - minRetP < 1e-6) {
      const c = (maxRetP + minRetP) / 2 || 0.01;
      minRetP = c - Math.max(Math.abs(c) * 0.1, 0.005);
      maxRetP = c + Math.max(Math.abs(c) * 0.1, 0.005);
    }
    if (maxVol - minVol < 1e-6) {
      const c = (maxVol + minVol) / 2 || 0.01;
      minVol = c - Math.max(Math.abs(c) * 0.1, 0.005);
      maxVol = c + Math.max(Math.abs(c) * 0.1, 0.005);
    }
    const minSharpe = Math.min(...allSharpes);
    const maxSharpe = Math.max(...allSharpes);

    const pad = { t: 28, r: 24, b: 48, l: 64 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    const xScale = v => pad.l + ((v - minVol) / (maxVol - minVol)) * pw;
    const yScale = r => pad.t + ph - ((r - minRetP) / (maxRetP - minRetP)) * ph;

    ctx.clearRect(0, 0, W, H);
    const C = chartColors();
    const lerp = (a, b, t) => Math.round(a + (b - a) * t);
    const sharpeRGB = t => [lerp(C.lo[0], C.hi[0], t), lerp(C.lo[1], C.hi[1], t), lerp(C.lo[2], C.hi[2], t)];

    // ── Grid ───────────────────────────────────────────────────────────────
    ctx.lineWidth = 1;
    ctx.font = "10px 'Libre Franklin', system-ui, sans-serif";

    const nGridY = 5, nGridX = 5;
    for (let i = 0; i <= nGridY; i++) {
      const y = pad.t + (ph / nGridY) * i;
      ctx.strokeStyle = C.grid;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke();
      const val = maxRetP - ((maxRetP - minRetP) / nGridY) * i;
      ctx.fillStyle = C.tick;
      ctx.textAlign = "right";
      ctx.fillText((val * 100).toFixed(1) + "%", pad.l - 6, y + 3.5);
    }
    for (let i = 0; i <= nGridX; i++) {
      const x = pad.l + (pw / nGridX) * i;
      ctx.strokeStyle = C.grid;
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ph); ctx.stroke();
      const val = minVol + ((maxVol - minVol) / nGridX) * i;
      ctx.fillStyle = C.tick;
      ctx.textAlign = "center";
      ctx.fillText((val * 100).toFixed(1) + "%", x, pad.t + ph + 15);
    }

    // ── Axis labels ────────────────────────────────────────────────────────
    ctx.fillStyle = C.axis;
    ctx.font = "11px 'Libre Franklin', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Volatilidad anualizada", pad.l + pw / 2, H - 6);
    ctx.save();
    ctx.translate(13, pad.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Retorno anualizado", 0, 0);
    ctx.restore();

    // ── Scatter: Monte Carlo portfolios ────────────────────────────────────
    const dense = portfolios.length > 8000;
    portfolios.forEach(p => {
      const x = xScale(p.vol);
      const y = yScale(p.ret);
      const t = (p.sharpe - minSharpe) / (maxSharpe - minSharpe + 1e-12);
      const [r, g, b] = sharpeRGB(t);
      ctx.beginPath();
      ctx.arc(x, y, dense ? 1.8 : 2.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${dense ? 0.32 : 0.42})`;
      ctx.fill();
    });

    // ── Efficient frontier envelope (upper-left hull) ──────────────────────
    const hull = efficientEnvelope(portfolios, 48);
    if (hull.length >= 3) {
      ctx.beginPath();
      hull.forEach((pt, i) => ctx[i === 0 ? "moveTo" : "lineTo"](xScale(pt.vol), yScale(pt.ret)));
      ctx.strokeStyle = C.light ? "rgba(16,170,120,0.9)" : "rgba(0,210,150,0.85)";
      ctx.lineWidth = 2.4; ctx.lineJoin = "round"; ctx.shadowColor = "rgba(0,210,150,0.4)"; ctx.shadowBlur = 6;
      ctx.stroke(); ctx.shadowBlur = 0;
    }

    // ── Markers with pill labels ───────────────────────────────────────────
    function marker(p, color, label, txtColor) {
      const x = xScale(p.vol), y = yScale(p.ret);
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = C.halo; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = "bold 9px 'Libre Franklin', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const tw = ctx.measureText(label).width;
      const py = y - 16;
      roundRectMkw(ctx, x - tw / 2 - 5, py - 7, tw + 10, 14, 4);
      ctx.fillStyle = color; ctx.fill();
      ctx.fillStyle = txtColor; ctx.fillText(label, x, py);
      ctx.textBaseline = "alphabetic";
    }
    marker(minVarPortfolio, C.mv, "MV", "#fff");
    marker(maxSharpePortfolio, C.ms, "MS", "#1a1205");

    // ── Legend (with backing panel for contrast) ───────────────────────────
    const legendItems = [
      { color: `rgb(${C.lo.join(",")})`, label: "Bajo Sharpe" },
      { color: `rgb(${C.hi.join(",")})`, label: "Alto Sharpe" },
      { color: C.mv, label: "MV — Mín. Varianza" },
      { color: C.ms, label: "MS — Máx. Sharpe" },
    ];
    ctx.font = "10px 'Libre Franklin', system-ui, sans-serif";
    const legW = 142, legH = legendItems.length * 17 + 12;
    const legendX = pad.l + pw - legW + 14;
    const legendY = pad.t + 14;
    roundRectMkw(ctx, legendX - 14, legendY - 12, legW, legH, 8);
    ctx.fillStyle = C.panel; ctx.fill();
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.stroke();
    legendItems.forEach((item, i) => {
      const lx = legendX, ly = legendY + i * 17;
      ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2);
      ctx.fillStyle = item.color; ctx.fill();
      ctx.fillStyle = C.legend;
      ctx.textAlign = "left"; ctx.fillText(item.label, lx + 10, ly + 3.5);
    });

    // ── Degenerate-data banner ─────────────────────────────────────────────
    // If every portfolio collapses to one point (identical asset series), the
    // frontier has no shape to show — tell the user instead of leaving it blank.
    const volSpread = Math.max(...allVols) - Math.min(...allVols);
    const retSpread = Math.max(...allRets) - Math.min(...allRets);
    if (volSpread < 1e-4 && retSpread < 1e-4) {
      ctx.font = "12px 'Libre Franklin', system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.fillStyle = C.axis;
      ctx.fillText("Los activos tienen series casi idénticas — sin dispersión que graficar.", pad.l + pw / 2, pad.t + ph / 2 - 8);
      ctx.fillStyle = C.tick; ctx.font = "11px 'Libre Franklin', system-ui, sans-serif";
      ctx.fillText("Prueba con activos más diversos o recarga (Ctrl+Shift+R) si los datos llegaron incompletos.", pad.l + pw / 2, pad.t + ph / 2 + 12);
    }
  }

  // ── Optimal portfolio cards ────────────────────────────────────────────────
  function renderMuWarning() {
    const id = "mkwMuWarning";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.className = "mkw-mu-warning";
      // Insert before the optimal-cards row
      const row = document.querySelector(".mkw-optimal-row");
      if (row) row.parentNode.insertBefore(el, row);
      else document.getElementById("mkwResultsSection")?.prepend(el);
    }
    const T = mkwResult?.nObs ?? 0;
    el.innerHTML = `
      <span class="mkw-mu-icon">ⓘ</span>
      <span><strong>Máx. Sharpe es sensible a μ histórico</strong> — los retornos esperados estimados con ${T} semanas tienen alta varianza estadística.
      El portafolio de <strong>Mín. Varianza es más robusto</strong> porque no depende de μ.
      Black-Litterman mitiga esto incorporando un prior de equilibrio.</span>
    `;
  }

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
      <!-- El color identifica la cartera (mismo que su marcador en la
           frontera): va en la marca, no en el texto. Escrito en el título,
           #f5b84c medía 1.9:1 sobre la lámina clara. -->
      <div class="mkw-optimal-title"><i class="mkw-optimal-mark" style="background:${color}" aria-hidden="true"></i>${title}</div>
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
    mkwLastWeights = { p, title };
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

    const C = chartColors();
    const cx = size / 2, cy = size / 2;
    const outerR = cx - 8;
    const innerR = outerR * 0.58;
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
      // Thin separator between slices for a crisp, professional look
      ctx.strokeStyle = C.light ? "rgba(255,255,255,0.9)" : "rgba(12,15,26,0.9)";
      ctx.lineWidth = 2; ctx.stroke();
      angle += sweep;
    });

    // Donut hole — matches the card surface in each theme
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = C.light ? "#f4f6fb" : "#0c0f1a";
    ctx.fill();

    ctx.fillStyle = C.axis;
    ctx.font = "bold 11px 'Libre Franklin', system-ui, sans-serif";
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
    // Canvas visual heatmap (added after renderMatrix so it prepends above the table)
    const corrMatrix = Array.from({ length: N }, (_, i) =>
      Array.from({ length: N }, (_, j) => cov[i][j] / (vols2[i] * vols2[j]))
    );
    drawCorrHeatmapCanvas(tickers, corrMatrix);

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
        const { bg } = colorFn(v);
        /* Sin `color:` en línea: el estilo en línea le gana a cualquier hoja,
           y el texto blanco fijo era ilegible sobre las celdas pálidas del
           tema claro. La tinta la pone main-v4-markowitz.css (`--v4-ink`),
           que además repinta sola al cambiar de tema. El fondo SÍ sigue aquí:
           es el valor de la matriz. */
        return `<td style="background:${bg}">${formatFn(v)}</td>`;
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

  /* El tope de tinte (0.52 como máximo) no es estético: por encima de ~0.6 hay
     una franja donde ni la tinta clara ni la oscura llegan a 4.5:1 sobre la
     celda. Con este tope, `--v4-ink` mide 6.0:1 en oscuro y 9.8:1 en claro,
     así que una sola tinta sirve para los dos temas. */
  const HEAT_ALPHA_BASE = 0.10;
  const HEAT_ALPHA_RANGE = 0.42;

  function covHeatColor(t) {
    // t ∈ [-1, 1] normalized by maxAbs
    const a = Math.abs(t);
    const alpha = HEAT_ALPHA_BASE + a * HEAT_ALPHA_RANGE;
    if (t >= 0) {
      const r = Math.round(30 + (0 - 30) * a);
      const g = Math.round(30 + (200 - 30) * a);
      const b = Math.round(60 + (148 - 60) * a);
      return { bg: `rgba(${r},${g},${b},${alpha})` };
    } else {
      const r = Math.round(30 + (220 - 30) * a);
      const g = Math.round(30 + (50 - 30) * a);
      const b = Math.round(60 + (80 - 60) * a);
      return { bg: `rgba(${r},${g},${b},${alpha})` };
    }
  }

  function corrHeatColor(v) {
    v = Math.max(-1, Math.min(1, v));
    const t = Math.abs(v);
    const alpha = HEAT_ALPHA_BASE + t * HEAT_ALPHA_RANGE;
    if (v >= 0) {
      const r = Math.round(20 + (111 - 20) * t);
      const g = Math.round(20 + (134 - 20) * t);
      const b = Math.round(40 + (255 - 40) * t);
      return { bg: `rgba(${r},${g},${b},${alpha})` };
    } else {
      const r = Math.round(20 + (242 - 20) * t);
      const g = Math.round(20 + (77 - 20) * t);
      const b = Math.round(40 + (106 - 40) * t);
      return { bg: `rgba(${r},${g},${b},${alpha})` };
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
    if (!el) return;
    el.style.display = visible ? "" : "none";
    if (visible && window.innerWidth <= 1000) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
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
    const C = chartColors();
    const lerpF = (a, b, t) => Math.round(a + (b - a) * t);

    // Grid
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const v = yMin + (vRange / gridSteps) * i;
      const y = toY(v);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + cW, y);
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = C.tick; ctx.font = "10px 'Libre Franklin',sans-serif";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(fmtCompact(v), padL - 5, y);
    }

    // X axis labels (years)
    ctx.fillStyle = C.tick; ctx.font = "10px 'Libre Franklin',sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (let yr = 0; yr <= years; yr++) {
      ctx.fillText(yr === 0 ? "Hoy" : `Año ${yr}`, toX(yr * 12), padTop + cH + 5);
    }

    // S0 baseline dashed
    ctx.beginPath(); ctx.moveTo(padL, toY(S0)); ctx.lineTo(padL + cW, toY(S0));
    ctx.strokeStyle = C.baseline; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke();
    ctx.setLineDash([]);

    // Cloud paths
    paths.forEach(({ path, sharpe }) => {
      const t = (sharpe - minS) / (maxS - minS + 1e-12);
      const r = lerpF(C.lo[0], C.hi[0], t), g = lerpF(C.lo[1], C.hi[1], t), b = lerpF(C.lo[2], C.hi[2], t);
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) ctx[i === 0 ? "moveTo" : "lineTo"](toX(i), toY(path[i]));
      ctx.strokeStyle = `rgba(${r},${g},${b},${C.light ? 0.22 : 0.16})`;
      ctx.lineWidth = 1; ctx.lineJoin = "round"; ctx.stroke();
    });

    // Min Variance — blue thick
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) ctx[i === 0 ? "moveTo" : "lineTo"](toX(i), toY(mvPath[i]));
    ctx.strokeStyle = C.mv; ctx.lineWidth = 2.4; ctx.lineJoin = "round";
    ctx.shadowColor = C.light ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.45)"; ctx.shadowBlur = 3; ctx.stroke(); ctx.shadowBlur = 0;

    // Max Sharpe — gold thick
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) ctx[i === 0 ? "moveTo" : "lineTo"](toX(i), toY(msPath[i]));
    ctx.strokeStyle = C.ms; ctx.lineWidth = 2.4; ctx.lineJoin = "round";
    ctx.shadowColor = C.light ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.45)"; ctx.shadowBlur = 3; ctx.stroke(); ctx.shadowBlur = 0;

    // End-point labels
    function endLabel(path, label, color) {
      const v = path[steps];
      const x = toX(steps) + 5;
      const y = toY(v);
      ctx.fillStyle = color; ctx.font = "bold 10px 'Libre Franklin',sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(`${label} ${fmtCompact(v)}`, x, y);
    }
    endLabel(mvPath, "MV", C.mv);
    endLabel(msPath, "MS", C.ms);

    // Starting dot
    ctx.beginPath(); ctx.arc(toX(0), toY(S0), 4, 0, Math.PI * 2);
    ctx.fillStyle = C.startDot; ctx.fill();

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
    mkwMaxCap = getMaxWeightCap();
    const signal = beginRun();

    try {
      const dataMap = await fetchOHLCVMap(mkwAssets.map(a => a.ticker), period, signal);

      showStatus("Calculando scores de factores...", "loading");

      const tickers = mkwAssets.map(a => a.ticker);
      const N = tickers.length;

      // Timestamp-aligned returns (P1-4)
      const alignedSB = alignAndComputeReturns(dataMap, tickers);
      if (!alignedSB) throw new Error("No hay suficientes fechas comunes entre los activos seleccionados.");
      const { returnsMatrix } = alignedSB;
      const T = returnsMatrix[0].length;

      // Annualized mean + shrunk covariance (P1-5)
      const mu = returnsMatrix.map(r => (r.reduce((s, v) => s + v, 0) / T) * 52);
      const covRawSB = Array.from({ length: N }, (_, i) =>
        Array.from({ length: N }, (_, j) => {
          const ri = returnsMatrix[i], rj = returnsMatrix[j];
          const mi = mu[i] / 52, mj = mu[j] / 52;
          return (ri.reduce((s, v, k) => s + (v - mi) * (rj[k] - mj), 0) / (T - 1)) * 52;
        })
      );
      const cov = shrinkLW(covRawSB, T);

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

      showStatus(`Simulando ${nSim.toLocaleString()} portafolios con retornos ajustados por factor (worker)...`, "loading");

      // Monte Carlo via Web Worker (P1-7) + analytical optimal (P1-7)
      const portfolios = await runMonteCarloPar({
        mu: muAdj, cov, n: N, rfr, nSim,
        useFi: false, fiIdx: [], fiMin: 0, fiMax: 1,
        mkwMaxCap: mkwMaxCap || null
      });

      // Unconstrained analytical solution first; gradient as fallback
      const sbMvW = !mkwMaxCap ? analyticalMinVarW(cov) : null;
      const sbMsW = !mkwMaxCap ? analyticalMaxSharpeW(muAdj, cov, rfr) : null;
      let minVarPortfolio, maxSharpePortfolio;
      if (sbMvW && sbMsW) {
        const mvSt = portfolioStats(sbMvW, muAdj, cov);
        const msSt = portfolioStats(sbMsW, muAdj, cov);
        minVarPortfolio    = { w: sbMvW, ret: mvSt.ret, vol: mvSt.vol, sharpe: (mvSt.ret - rfr) / mvSt.vol };
        maxSharpePortfolio = { w: sbMsW, ret: msSt.ret, vol: msSt.vol, sharpe: (msSt.ret - rfr) / msSt.vol };
      } else {
        minVarPortfolio    = refineMinVariance(muAdj, cov, N, rfr, null, 0, 1);
        maxSharpePortfolio = refineMaxSharpe(muAdj, cov, N, rfr, null, 0, 1);
      }

      mkwResult = { portfolios, minVarPortfolio, maxSharpePortfolio, mu: muAdj, cov, tickers, rfr, returnsMatrix, nObs: T };

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
      renderMuWarning();
      renderOptimalCards();
      renderWeightsPanel(maxSharpePortfolio, "Smart Beta — Máx. Sharpe");
      renderCalcSection();
      renderSmartBetaScoreCard();
      drawForecast();
      renderBacktestCard();

    } catch (err) {
      if (isAbortError(err)) return;  // superseded by a newer run
      const msg = String(err.message || err);
      showStatus(msg.toLowerCase().includes("fetch") ? "No se pudo conectar con el servidor. Ejecuta 'python api.py' primero." : msg, "error");
    } finally {
      if (!signal?.aborted) {
        runBtn.disabled = false;
        runBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polygon points="5 3 19 12 5 21 5 3"/></svg> Aplicar Smart Beta`;
      }
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
    mkwMaxCap = getMaxWeightCap();

    const signal = beginRun();

    try {
      const dataMap = await fetchOHLCVMap(mkwAssets.map(a => a.ticker), period, signal);

      showStatus("Computando retornos de equilibrio...", "loading");

      const tickers = mkwAssets.map(a => a.ticker);
      const N = tickers.length;

      // Timestamp-aligned returns (P1-4)
      const alignedBL = alignAndComputeReturns(dataMap, tickers);
      if (!alignedBL) throw new Error("No hay suficientes fechas comunes entre los activos seleccionados.");
      const { returnsMatrix } = alignedBL;
      const T = returnsMatrix[0].length;
      const mu_hist = returnsMatrix.map(r => (r.reduce((s, v) => s + v, 0) / T) * 52);

      // Shrunk covariance (P1-5) — BL uses it for prior + posterior + optimization
      const covRawBL = Array.from({ length: N }, (_, i) =>
        Array.from({ length: N }, (_, j) => {
          const ri = returnsMatrix[i], rj = returnsMatrix[j];
          const mi = mu_hist[i] / 52, mj = mu_hist[j] / 52;
          return (ri.reduce((s, v, k) => s + (v - mi) * (rj[k] - mj), 0) / (T - 1)) * 52;
        })
      );
      const cov = shrinkLW(covRawBL, T);

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

      showStatus(`Simulando ${nSim.toLocaleString()} portafolios BL (worker)...`, "loading");

      // Monte Carlo via Web Worker (P1-7)
      const portfolios = await runMonteCarloPar({
        mu: mu_bl, cov, n: N, rfr, nSim,
        useFi: false, fiIdx: [], fiMin: 0, fiMax: 1,
        mkwMaxCap: mkwMaxCap || null
      });

      // Analytical optimal portfolios (P1-7)
      const blMvW = !mkwMaxCap ? analyticalMinVarW(cov) : null;
      const blMsW = !mkwMaxCap ? analyticalMaxSharpeW(mu_bl, cov, rfr) : null;
      let minVarPortfolio, maxSharpePortfolio;
      if (blMvW && blMsW) {
        const mvSt = portfolioStats(blMvW, mu_bl, cov);
        const msSt = portfolioStats(blMsW, mu_bl, cov);
        minVarPortfolio    = { w: blMvW, ret: mvSt.ret, vol: mvSt.vol, sharpe: (mvSt.ret - rfr) / mvSt.vol };
        maxSharpePortfolio = { w: blMsW, ret: msSt.ret, vol: msSt.vol, sharpe: (msSt.ret - rfr) / msSt.vol };
      } else {
        minVarPortfolio    = refineMinVariance(mu_bl, cov, N, rfr, null, 0, 1);
        maxSharpePortfolio = refineMaxSharpe(mu_bl, cov, N, rfr, null, 0, 1);
      }

      mkwResult = {
        portfolios, minVarPortfolio, maxSharpePortfolio,
        mu: mu_bl, mu_hist, mu_eq: Pi, cov, tickers, rfr, returnsMatrix, nObs: T
      };

      showStatus("", "");
      showResults(true);
      drawFrontier();
      renderMuWarning();
      renderOptimalCards();
      renderWeightsPanel(maxSharpePortfolio, "Black-Litterman — Máx. Sharpe");
      renderCalcSection();
      renderBLReturnComparisonCard(tickers, Pi, mu_hist, mu_bl);
      drawForecast();
      renderBacktestCard();

    } catch (err) {
      if (isAbortError(err)) return;  // superseded by a newer run
      const msg = String(err.message || err);
      showStatus(msg.toLowerCase().includes("fetch") ? "No se pudo conectar con el servidor. Ejecuta 'python api.py' primero." : msg, "error");
    } finally {
      if (!signal?.aborted) {
        runBtn.disabled = false;
        runBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polygon points="5 3 19 12 5 21 5 3"/></svg> Aplicar Black-Litterman`;
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── BACKTEST HISTÓRICO (#3) ───────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  function renderBacktestCard() {
    const container = document.getElementById("mkwResultsSection");
    if (!container || !mkwResult) return;

    let card = document.getElementById("mkwBacktestCard");
    if (!card) {
      card = document.createElement("div");
      card.id = "mkwBacktestCard";
      card.className = "dashboard-card";
      const weightsCard = container.querySelector(".mkw-weights-card");
      if (weightsCard) container.insertBefore(card, weightsCard);
      else container.appendChild(card);
    }

    card.innerHTML = `
      <div class="card-header">
        <h3>Backtest Walk-Forward</h3>
        <span>Reoptimización periódica sobre ventana móvil · con costos de transacción · vs 1/N y S&amp;P 500</span>
      </div>
      <div class="mkw-bt-controls">
        <div class="mkw-bt-control">
          <label for="mkwBtRebal">Rebalanceo</label>
          <select id="mkwBtRebal">
            <option value="4">Mensual</option>
            <option value="13" selected>Trimestral</option>
            <option value="26">Semestral</option>
          </select>
        </div>
        <div class="mkw-bt-control">
          <label for="mkwBtCost">Costo por rebalanceo</label>
          <select id="mkwBtCost">
            <option value="0">0 bps</option>
            <option value="5">5 bps</option>
            <option value="10" selected>10 bps</option>
            <option value="25">25 bps</option>
          </select>
        </div>
      </div>
      <div class="mkw-forecast-legend">
        <span class="mc-legend-item"><span class="mc-legend-swatch" style="background:#f5b84c;height:3px;width:22px"></span>Máx. Sharpe</span>
        <span class="mc-legend-item"><span class="mc-legend-swatch" style="background:#6f86ff;height:3px;width:22px"></span>Mín. Varianza</span>
        <span class="mc-legend-item"><span class="mc-legend-swatch" style="background:#32d6a2;height:3px;width:22px"></span>1/N (igual peso)</span>
        <span class="mc-legend-item"><span class="mc-legend-swatch" style="background:transparent;border-top:2px dashed currentColor;opacity:.6;width:22px;display:inline-block;vertical-align:middle;margin-right:4px"></span>S&amp;P 500</span>
      </div>
      <div class="mc-chart-wrap"><canvas id="mkwBacktestCanvas"></canvas></div>
      <div id="mkwBacktestStatus" class="perf-chart-status">Cargando benchmark…</div>
      <div id="mkwBacktestMetrics"></div>`;

    card.querySelector("#mkwBtRebal")?.addEventListener("change", runBacktest);
    card.querySelector("#mkwBtCost")?.addEventListener("change", runBacktest);

    runBacktest();
  }

  // Annualized mean & shrunk covariance from a weekly log-returns matrix (N × T)
  function muCovFromReturns(retMatrix) {
    const N = retMatrix.length;
    const T = retMatrix[0].length;
    const mu = retMatrix.map(r => (r.reduce((s, v) => s + v, 0) / T) * 52);
    const covRaw = Array.from({ length: N }, (_, i) =>
      Array.from({ length: N }, (_, j) => {
        const ri = retMatrix[i], rj = retMatrix[j];
        const mi = mu[i] / 52, mj = mu[j] / 52;
        return (ri.reduce((s, v, k) => s + (v - mi) * (rj[k] - mj), 0) / (T - 1)) * 52;
      })
    );
    return { mu, cov: shrinkLW(covRaw, T) };
  }

  async function runBacktest() {
    const canvas = document.getElementById("mkwBacktestCanvas");
    const statusEl = document.getElementById("mkwBacktestStatus");
    const metricsEl = document.getElementById("mkwBacktestMetrics");
    if (!canvas || !mkwResult || !statusEl) return;

    const { returnsMatrix, tickers, rfr, commonDates } = mkwResult;
    const period = document.getElementById("mkwPeriod")?.value || "2y";
    const R = parseInt(document.getElementById("mkwBtRebal")?.value, 10) || 13;       // rebalance every R weeks
    const costRate = (parseFloat(document.getElementById("mkwBtCost")?.value) || 0) / 10000; // bps → fraction

    try {
      const N = returnsMatrix.length;
      const T = returnsMatrix[0].length;

      // ── Rolling-window split: initial lookback L, test = weeks [L, T) ─────────
      let L = Math.max(52, Math.floor(T * 0.5));
      L = Math.min(L, T - Math.max(R, 12));
      const testLen = T - L;
      if (L < 30 || testLen < Math.max(R, 8)) {
        statusEl.textContent = "Período insuficiente para un backtest walk-forward (usa un rango más largo).";
        if (metricsEl) metricsEl.innerHTML = "";
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      // Simple (arithmetic) weekly returns — needed for compounding & weight drift
      const simpleMatrix = returnsMatrix.map(r => r.map(v => Math.exp(v) - 1));

      const fiConstraint = getFiConstraints();
      const fiIdx = tickers.map((t, i) => mkwAssets[i]?.isFi ? i : -1).filter(i => i >= 0);
      const useFi = fiConstraint && fiIdx.length > 0;
      const fiMin = fiConstraint ? fiConstraint.min : 0;
      const fiMax = fiConstraint ? fiConstraint.max : 1;

      // Weight rules: reoptimize on the trailing window [t-L, t)
      const wfMaxSharpe = win => { const { mu, cov } = muCovFromReturns(win); return refineMaxSharpe(mu, cov, N, rfr, useFi ? fiIdx : null, fiMin, fiMax).w; };
      const wfMinVar    = win => { const { mu, cov } = muCovFromReturns(win); return refineMinVariance(mu, cov, N, rfr, useFi ? fiIdx : null, fiMin, fiMax).w; };
      const wfEqual     = () => new Array(N).fill(1 / N);

      // Walk forward: rebalance every R weeks using a trailing L-week window.
      // Weights drift between rebalances; turnover at each rebalance pays costRate.
      function walkForward(weightFn) {
        const cum = [1], rets = [];
        let curW = null, turnover = 0, rebalances = 0;
        for (let t = L; t < T; t++) {
          if ((t - L) % R === 0) {
            const win = returnsMatrix.map(r => r.slice(t - L, t));
            const target = weightFn(win);
            let tov = 0;
            if (curW) { for (let i = 0; i < N; i++) tov += Math.abs(target[i] - curW[i]); }
            else { tov = 1; } // initial deployment from cash
            turnover += tov; rebalances++;
            cum[cum.length - 1] *= (1 - tov * costRate);
            curW = target.slice();
          }
          let pr = 0; for (let i = 0; i < N; i++) pr += curW[i] * simpleMatrix[i][t];
          const nc = cum[cum.length - 1] * (1 + pr);
          cum.push(nc); rets.push(pr);
          for (let i = 0; i < N; i++) curW[i] = curW[i] * (1 + simpleMatrix[i][t]) / (1 + pr); // drift
        }
        return { cum, rets, turnover, rebalances };
      }

      const ms = walkForward(wfMaxSharpe);
      const mv = walkForward(wfMinVar);
      const eq = walkForward(wfEqual);

      // ── Benchmark: SPY buy & hold over the same test window ──────────────────
      const res = await fetch(`${API_BASE_URL}/chart/SPY?range=${period}&interval=1wk`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const spyResult = json?.chart?.result?.[0];
      const spyTs = spyResult?.timestamp ?? [];
      const spyCl = spyResult?.indicators?.quote?.[0]?.close ?? [];

      // Align SPY to the portfolio's exact common dates (by timestamp) so the
      // benchmark return at week t is measured over the same interval as the
      // strategies. Falls back to positional alignment if too few timestamps
      // match (e.g. weekend-stamped crypto weeks vs SPY's weekday bars).
      let spyRaw = [];
      let spyPrices = null;
      if (Array.isArray(commonDates) && commonDates.length === T + 1) {
        const spyMap = new Map();
        spyTs.forEach((ts, i) => { if (spyCl[i] != null && spyCl[i] > 0) spyMap.set(ts, spyCl[i]); });
        const matched = commonDates.map(ts => spyMap.get(ts) ?? null);
        const hits = matched.filter(v => v != null).length;
        if (hits >= commonDates.length * 0.8) {
          // Forward/back-fill the few gaps so we keep one price per common date.
          const firstVal = matched.find(v => v != null);
          let last = firstVal;
          spyPrices = matched.map(v => { if (v != null) last = v; return last; });
        }
      }
      if (spyPrices) {
        for (let t = 0; t < T; t++) spyRaw.push(Math.log(spyPrices[t + 1] / spyPrices[t]));
      } else {
        const spyFiltered = spyCl.filter(v => v != null && v > 0);
        const spyLen = Math.min(spyFiltered.length, T + 1);
        for (let i = 1; i < spyLen; i++) spyRaw.push(Math.log(spyFiltered[i] / spyFiltered[i - 1]));
      }

      const spyCum = [1 * (1 - costRate)], spyRets = [];
      for (let t = L; t < T; t++) {
        const r = spyRaw[t] != null ? Math.exp(spyRaw[t]) - 1 : 0;
        spyCum.push(spyCum[spyCum.length - 1] * (1 + r));
        spyRets.push(r);
      }

      const len = ms.cum.length - 1;
      if (len < 4) { statusEl.textContent = "Datos insuficientes en la ventana de prueba."; return; }

      drawBacktestChart(canvas, ms.cum, mv.cum, eq.cum, spyCum);

      function totRet(c) { return c[c.length - 1] - 1; }
      function cagr(c) {
        const weeks = c.length - 1;
        if (weeks <= 0 || c[c.length - 1] <= 0) return 0;
        return Math.pow(c[c.length - 1], 52 / weeks) - 1;
      }
      function maxDraw(c) {
        let pk = c[0], dd = 0;
        for (const v of c) { if (v > pk) pk = v; const d = (pk - v) / pk; if (d > dd) dd = d; }
        return dd;
      }
      function sharpe(rets, r0 = rfr) {
        if (!rets.length) return 0;
        const m = rets.reduce((s, v) => s + v, 0) / rets.length;
        const vari = rets.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, rets.length - 1);
        return (m * 52 - r0) / Math.max(1e-9, Math.sqrt(vari * 52));
      }

      const fmtP = v => (v >= 0 ? "+" : "") + (v * 100).toFixed(1) + "%";
      const cls = v => v >= 0 ? "mkw-pos" : "mkw-neg";

      if (metricsEl) {
        metricsEl.innerHTML = `
          <div class="mkw-weights-table-shell tracker-table-shell" style="margin-top:14px">
            <table class="tracker-table mkw-calc-table">
              <thead><tr>
                <th>Métrica (fuera de muestra)</th>
                <th style="color:#f5b84c">Máx. Sharpe</th>
                <th style="color:#6f86ff">Mín. Varianza</th>
                <th style="color:#32d6a2">1/N</th>
                <th>S&amp;P 500</th>
              </tr></thead>
              <tbody>
                <tr><td>Retorno total (neto)</td>
                  <td class="${cls(totRet(ms.cum))}">${fmtP(totRet(ms.cum))}</td>
                  <td class="${cls(totRet(mv.cum))}">${fmtP(totRet(mv.cum))}</td>
                  <td class="${cls(totRet(eq.cum))}">${fmtP(totRet(eq.cum))}</td>
                  <td class="${cls(totRet(spyCum))}">${fmtP(totRet(spyCum))}</td>
                </tr>
                <tr><td>CAGR (anualizado)</td>
                  <td class="${cls(cagr(ms.cum))}">${fmtP(cagr(ms.cum))}</td>
                  <td class="${cls(cagr(mv.cum))}">${fmtP(cagr(mv.cum))}</td>
                  <td class="${cls(cagr(eq.cum))}">${fmtP(cagr(eq.cum))}</td>
                  <td class="${cls(cagr(spyCum))}">${fmtP(cagr(spyCum))}</td>
                </tr>
                <tr><td>Max Drawdown</td>
                  <td class="mkw-neg">-${(maxDraw(ms.cum)*100).toFixed(1)}%</td>
                  <td class="mkw-neg">-${(maxDraw(mv.cum)*100).toFixed(1)}%</td>
                  <td class="mkw-neg">-${(maxDraw(eq.cum)*100).toFixed(1)}%</td>
                  <td class="mkw-neg">-${(maxDraw(spyCum)*100).toFixed(1)}%</td>
                </tr>
                <tr><td>Sharpe</td>
                  <td>${sharpe(ms.rets).toFixed(3)}</td>
                  <td>${sharpe(mv.rets).toFixed(3)}</td>
                  <td>${sharpe(eq.rets).toFixed(3)}</td>
                  <td>${sharpe(spyRets).toFixed(3)}</td>
                </tr>
                <tr><td>Turnover total · rebalanceos</td>
                  <td>${(ms.turnover*100).toFixed(0)}% · ${ms.rebalances}</td>
                  <td>${(mv.turnover*100).toFixed(0)}% · ${mv.rebalances}</td>
                  <td>${(eq.turnover*100).toFixed(0)}% · ${eq.rebalances}</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="mkw-calc-matrix-note" style="margin-top:10px">Walk-forward: cada ${R} semanas se reoptimizan los pesos usando solo las ${L} semanas previas, se aplican hacia adelante y se cobra el costo de transacción sobre el turnover de cada rebalanceo. 1/N (igual peso, mismo calendario de rebalanceo) y S&amp;P 500 (comprar y mantener) son las líneas base. Todo es fuera de muestra: la optimización nunca ve los datos sobre los que se mide.</p>`;
      }

      statusEl.textContent = `Ventana móvil: ${L} sem · prueba: ${len} sem · rebalanceo cada ${R} sem · costo ${(costRate*10000).toFixed(0)} bps · base 100`;
    } catch (err) {
      if (statusEl) statusEl.textContent = "Backtest no disponible: " + err.message;
    }
  }

  function drawBacktestChart(canvas, msCum, mvCum, eqCum, spyCum) {
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth || 680;
    const H = Math.max(240, Math.round(W * 0.38));
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const C = chartColors();
    const T = msCum.length;
    const pad = { t: 16, r: 20, b: 30, l: 64 };
    const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;

    const all = [...msCum, ...mvCum, ...eqCum, ...spyCum];
    const yMin = Math.min(...all) * 0.97, yMax = Math.max(...all) * 1.03;
    const toX = i => pad.l + (i / (T - 1)) * cW;
    const toY = v => pad.t + cH - ((v - yMin) / (yMax - yMin || 1)) * cH;

    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i <= 5; i++) {
      const v = yMin + (yMax - yMin) / 5 * i;
      const y = toY(v);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cW, y);
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = C.tick; ctx.font = "10px 'Libre Franklin',sans-serif";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText((v * 100).toFixed(0), pad.l - 5, y);
    }

    ctx.save(); ctx.fillStyle = C.tick; ctx.font = "10px 'Libre Franklin',sans-serif";
    ctx.textAlign = "center"; ctx.translate(14, pad.t + cH / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText("Valor (base 100)", 0, 0); ctx.restore();

    const weeks = T - 1, years = Math.max(1, Math.round(weeks / 52));
    ctx.fillStyle = C.tick; ctx.font = "10px 'Libre Franklin',sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (let yr = 0; yr <= years; yr++) {
      const idx = Math.min(Math.round(yr * weeks / years), weeks);
      ctx.fillText(yr === 0 ? "Inicio" : `${yr}a`, toX(idx), pad.t + cH + 5);
    }

    ctx.beginPath(); ctx.moveTo(pad.l, toY(1)); ctx.lineTo(pad.l + cW, toY(1));
    ctx.strokeStyle = C.baseline; ctx.lineWidth = 1; ctx.stroke();

    ctx.beginPath();
    spyCum.forEach((v, i) => ctx[i === 0 ? "moveTo" : "lineTo"](toX(i), toY(v)));
    ctx.strokeStyle = C.tick; ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);

    ctx.beginPath();
    eqCum.forEach((v, i) => ctx[i === 0 ? "moveTo" : "lineTo"](toX(i), toY(v)));
    ctx.strokeStyle = "#32d6a2"; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();

    ctx.beginPath();
    mvCum.forEach((v, i) => ctx[i === 0 ? "moveTo" : "lineTo"](toX(i), toY(v)));
    ctx.strokeStyle = "#6f86ff"; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();

    ctx.beginPath();
    msCum.forEach((v, i) => ctx[i === 0 ? "moveTo" : "lineTo"](toX(i), toY(v)));
    ctx.strokeStyle = "#f5b84c"; ctx.lineWidth = 2.2; ctx.lineJoin = "round"; ctx.stroke();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── HEATMAP DE CORRELACIÓN CANVAS (#4) ───────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  function drawCorrHeatmapCanvas(tickers, corrMatrix) {
    const container = document.getElementById("mkwCalcCorrContent");
    if (!container) return;
    const N = tickers.length;
    const maxFit = Math.min(window.innerWidth * 0.42, 520);
    const cellSize = Math.max(38, Math.min(72, Math.floor(maxFit / (N + 1))));
    const labelPad = cellSize;
    const totalSize = labelPad + N * cellSize;

    let canvas = container.querySelector(".mkw-corr-heatmap-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "mkw-corr-heatmap-canvas";
      canvas.style.cssText = "display:block;margin:0 auto 16px;border-radius:8px;max-width:100%";
      container.prepend(canvas);
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalSize * dpr; canvas.height = totalSize * dpr;
    canvas.style.width = totalSize + "px"; canvas.style.height = totalSize + "px";

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, totalSize, totalSize);

    const CH = chartColors();
    const fontSize = Math.max(9, Math.round(cellSize * 0.18));
    ctx.font = `${fontSize}px 'Libre Franklin',sans-serif`;

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const v = Math.max(-1, Math.min(1, corrMatrix[i][j]));
        const { bg } = corrHeatColor(v);
        const x = labelPad + j * cellSize;
        const y = labelPad + i * cellSize;
        ctx.fillStyle = bg;
        ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
        /* Una sola tinta para los dos temas: con el tope de tinte de
           `corrHeatColor` la celda nunca se oscurece lo bastante como para
           necesitar texto blanco en claro (ni al revés). */
        ctx.fillStyle = CH.ink;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(v.toFixed(2), x + cellSize / 2 - 0.5, y + cellSize / 2);
      }
    }

    ctx.fillStyle = CH.tick;
    ctx.font = `${Math.max(8, fontSize - 1)}px 'Libre Franklin',sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    tickers.forEach((t, j) => {
      const label = t.length > 6 ? t.slice(0, 5) + "…" : t;
      ctx.fillText(label, labelPad + j * cellSize + cellSize / 2, labelPad / 2);
    });
    ctx.textAlign = "right";
    tickers.forEach((t, i) => {
      const label = t.length > 6 ? t.slice(0, 5) + "…" : t;
      ctx.fillText(label, labelPad - 5, labelPad + i * cellSize + cellSize / 2);
    });
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

  // ── #8 Comparador de portafolios guardados ─────────────────────────────────
  // Optimiza cada portafolio guardado con la misma pipeline μ/Σ y los muestra
  // lado a lado (retorno, volatilidad, Sharpe, composición). Reutiliza
  // window.computeOptimalWeights, así que no necesita ejecutar la sección.
  function openCompareModal() {
    const modal = document.getElementById("mkwCompareModal");
    const listEl = document.getElementById("mkwCompareList");
    const resultEl = document.getElementById("mkwCompareResult");
    if (!modal || !listEl) return;
    const saved = getSavedPortfolios();
    resultEl.innerHTML = "";
    if (saved.length < 2) {
      listEl.innerHTML = `<p class="mkw-empty-assets">Necesitas al menos 2 portafolios guardados para comparar. Guarda un par desde la barra "Portafolios guardados".</p>`;
    } else {
      listEl.innerHTML = saved.map((s, i) => `
        <label class="mkw-compare-item">
          <input type="checkbox" class="mkw-compare-check" value="${i}">
          <span class="mkw-compare-item-name">${escapeHtmlMkw(s.name)}</span>
          <span class="mkw-compare-item-sub">${(s.assets || []).length} activos · ${(s.assets || []).map(a => a.ticker).slice(0, 4).join(", ")}${(s.assets || []).length > 4 ? "…" : ""}</span>
        </label>`).join("");
    }
    modal.classList.remove("hidden");
    updateCompareHint();
  }
  function closeCompareModal() {
    document.getElementById("mkwCompareModal")?.classList.add("hidden");
  }
  function getCompareSelection() {
    return [...document.querySelectorAll(".mkw-compare-check:checked")].map(c => parseInt(c.value, 10));
  }
  function updateCompareHint() {
    const hint = document.getElementById("mkwCompareHint");
    const runBtn = document.getElementById("mkwCompareRunBtn");
    if (!hint) return;
    const n = getCompareSelection().length;
    hint.textContent = n ? `${n} seleccionado${n === 1 ? "" : "s"}` : "";
    // Cap selection at 3 to keep the table readable
    if (n >= 3) {
      document.querySelectorAll(".mkw-compare-check:not(:checked)").forEach(c => { c.disabled = true; });
    } else {
      document.querySelectorAll(".mkw-compare-check").forEach(c => { c.disabled = false; });
    }
    if (runBtn) runBtn.disabled = n < 2;
  }
  async function runComparison() {
    const resultEl = document.getElementById("mkwCompareResult");
    const runBtn = document.getElementById("mkwCompareRunBtn");
    if (!resultEl) return;
    const sel = getCompareSelection();
    if (sel.length < 2) { resultEl.innerHTML = `<p class="mkw-compare-warn">Selecciona al menos 2 portafolios.</p>`; return; }
    if (typeof window.computeOptimalWeights !== "function") {
      resultEl.innerHTML = `<p class="mkw-compare-warn">El motor de optimización no está disponible. Recarga la página.</p>`;
      return;
    }
    const saved = getSavedPortfolios();
    const mode = document.getElementById("mkwCompareMode")?.value || "maxsharpe";
    const orig = runBtn ? runBtn.innerHTML : "";
    if (runBtn) { runBtn.disabled = true; runBtn.innerHTML = `<span class="mkw-spinner"></span> Comparando…`; }
    resultEl.innerHTML = `<p class="perf-chart-status">Optimizando ${sel.length} portafolios con datos históricos…</p>`;

    try {
      const results = [];
      for (const idx of sel) {
        const p = saved[idx];
        if (!p) continue;
        const tickers = (p.assets || []).map(a => a.ticker);
        const period = p.params?.period || "2y";
        let res;
        try { res = await window.computeOptimalWeights({ tickers, mode, period }); }
        catch (e) { res = { ok: false, error: e.message || String(e) }; }
        results.push({ name: p.name, period, res });
      }

      const ok = results.filter(r => r.res?.ok);
      if (!ok.length) {
        resultEl.innerHTML = `<p class="mkw-compare-warn">No se pudo optimizar ninguno de los portafolios seleccionados (historial insuficiente o sin datos).</p>`;
        return;
      }

      // Best Sharpe / lowest vol highlight
      const bestSharpe = Math.max(...ok.map(r => r.res.optimal.sharpe));
      const pctF = x => (x * 100).toFixed(1) + "%";
      const cols = results.map(r => {
        if (!r.res?.ok) {
          return `<th class="mkw-cmp-col"><span class="mkw-cmp-name">${escapeHtmlMkw(r.name)}</span><span class="mkw-cmp-err">sin datos</span></th>`;
        }
        const best = Math.abs(r.res.optimal.sharpe - bestSharpe) < 1e-9;
        return `<th class="mkw-cmp-col${best ? " mkw-cmp-best" : ""}"><span class="mkw-cmp-name">${escapeHtmlMkw(r.name)}</span>${best ? `<span class="mkw-cmp-badge">Mejor Sharpe</span>` : ""}</th>`;
      }).join("");

      const cell = (r, fn) => r.res?.ok ? fn(r.res) : `<td class="muted-val">—</td>`;
      const rowRet = results.map(r => cell(r, d => `<td>${pctF(d.optimal.ret)}</td>`)).join("");
      const rowVol = results.map(r => cell(r, d => `<td>${pctF(d.optimal.vol)}</td>`)).join("");
      const rowShp = results.map(r => cell(r, d => `<td><strong>${d.optimal.sharpe.toFixed(2)}</strong></td>`)).join("");
      const rowN   = results.map(r => cell(r, d => `<td>${d.tickers.length}${d.skipped?.length ? ` <span class="muted-val">(+${d.skipped.length} sin datos)</span>` : ""}</td>`)).join("");
      const rowTop = results.map(r => cell(r, d => {
        const top = d.tickers
          .map(t => ({ t, w: d.weights[t] || 0 }))
          .sort((a, b) => b.w - a.w)
          .slice(0, 4)
          .map(x => `${x.t} ${(x.w * 100).toFixed(0)}%`)
          .join(", ");
        return `<td class="mkw-cmp-top">${top}</td>`;
      })).join("");

      const objLabel = mode === "minvar" ? "Mínima volatilidad" : "Máx. Sharpe";
      resultEl.innerHTML = `
        <div class="mkw-weights-table-shell tracker-table-shell" style="margin-top:14px">
          <table class="tracker-table mkw-calc-table mkw-cmp-table">
            <thead><tr><th>Métrica (${objLabel})</th>${cols}</tr></thead>
            <tbody>
              <tr><td>Retorno esperado anual</td>${rowRet}</tr>
              <tr><td>Volatilidad anual</td>${rowVol}</tr>
              <tr><td>Sharpe (rent./riesgo)</td>${rowShp}</tr>
              <tr><td>Activos</td>${rowN}</tr>
              <tr><td>Composición (top)</td>${rowTop}</tr>
            </tbody>
          </table>
        </div>
        <p class="mkw-calc-matrix-note" style="margin-top:10px">Cada portafolio se optimizó con su propio periodo guardado y la misma pipeline (media-varianza con shrinkage Ledoit-Wolf, tope 35% por activo). Cifras esperadas a partir de datos históricos; el desempeño pasado no garantiza resultados futuros.</p>`;
    } catch (e) {
      resultEl.innerHTML = `<p class="mkw-compare-warn">Error al comparar: ${escapeHtmlMkw(e.message || String(e))}</p>`;
    } finally {
      if (runBtn) { runBtn.disabled = false; runBtn.innerHTML = orig; }
    }
  }
})();
