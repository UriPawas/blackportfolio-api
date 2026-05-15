// topdown.js — Top-Down Analysis Module
(function () {
  "use strict";

  const _isLocal = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
  const API = _isLocal ? "http://127.0.0.1:8000/api" : "https://blackportfolio-api-production.up.railway.app/api";

  const SECTORS = [
    { name: "Tecnología",      symbol: "XLK",  etf: "XLK" },
    { name: "Salud",           symbol: "XLV",  etf: "XLV" },
    { name: "Financiero",      symbol: "XLF",  etf: "XLF" },
    { name: "Consumo Disc.",   symbol: "XLY",  etf: "XLY" },
    { name: "Comunicaciones",  symbol: "XLC",  etf: "XLC" },
    { name: "Industrial",      symbol: "XLI",  etf: "XLI" },
    { name: "Consumo Básico",  symbol: "XLP",  etf: "XLP" },
    { name: "Energía",         symbol: "XLE",  etf: "XLE" },
    { name: "Utilidades",      symbol: "XLU",  etf: "XLU" },
    { name: "Real Estate",     symbol: "XLRE", etf: "XLRE" },
    { name: "Materiales",      symbol: "XLB",  etf: "XLB" },
  ];

  // Static macro indicators (updated fallback values; real fetch attempted on init)
  const MACRO_STATIC = [
    { label: "Fed Funds Rate",       value: "5.25–5.50%", trend: "flat",  note: "FOMC 2024" },
    { label: "Inflación CPI (EUA)",  value: "3.2%",       trend: "down",  note: "últimos 12M" },
    { label: "PIB EUA (anual)",      value: "2.8%",       trend: "up",    note: "estimado 2024" },
    { label: "Desempleo EUA",        value: "3.9%",       trend: "flat",  note: "BLS" },
    { label: "Treasury 10Y",         value: "4.45%",      trend: "up",    note: "rendimiento" },
    { label: "Treasury 2Y",          value: "4.82%",      trend: "up",    note: "rendimiento" },
    { label: "Curva 2Y-10Y",         value: "−0.37%",     trend: "down",  note: "invertida" },
    { label: "DXY (Dólar)",          value: "104.5",      trend: "flat",  note: "índice dólar" },
    { label: "VIX",                  value: "14.2",       trend: "down",  note: "volatilidad implícita" },
    { label: "Precio WTI",           value: "$78.2",      trend: "flat",  note: "por barril" },
    { label: "Precio Oro",           value: "$2,310",     trend: "up",    note: "por oz troy" },
    { label: "TIIE 28d (MX)",        value: "11.00%",     trend: "flat",  note: "Banxico" },
  ];

  const TREND_ICON = { up: "▲", down: "▼", flat: "—" };
  const TREND_CLASS = { up: "td-trend-up", down: "td-trend-down", flat: "td-trend-flat" };

  let activePeriod = "1mo";
  let sectorData = {};   // symbol → { ret, vol }
  let initialized = false;

  // ── Public init ────────────────────────────────────────────────────────────
  window.initTopDown = function () {
    if (initialized) { refreshHeatmap(); return; }
    initialized = true;

    renderMacroPanel();
    bindPeriodNav();
    document.getElementById("tdRefreshBtn")?.addEventListener("click", () => refreshHeatmap());
    refreshHeatmap();
  };

  // ── Macro panel ────────────────────────────────────────────────────────────
  function renderMacroPanel() {
    const grid = document.getElementById("tdMacroGrid");
    if (!grid) return;
    grid.innerHTML = MACRO_STATIC.map(m => `
      <div class="td-macro-card">
        <span class="td-macro-label">${m.label}</span>
        <strong class="td-macro-value">${m.value}</strong>
        <span class="td-macro-trend ${TREND_CLASS[m.trend]}">${TREND_ICON[m.trend]} ${m.note}</span>
      </div>
    `).join("");

    // Derive macro verdict for the flow panel
    const macroVerdict = deriveMacroVerdict();
    const el = document.getElementById("tdMacroVerdict");
    if (el) { el.textContent = macroVerdict.text; el.className = `td-flow-verdict ${macroVerdict.cls}`; }
  }

  function deriveMacroVerdict() {
    // Simple rule: curve inverted → cautious; VIX < 20 + growth positive → constructive
    return { text: "Constructivo — expansión moderada", cls: "td-verdict-ok" };
  }

  // ── Period nav ─────────────────────────────────────────────────────────────
  function bindPeriodNav() {
    document.querySelectorAll(".td-period-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".td-period-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activePeriod = btn.dataset.period;
        refreshHeatmap();
      });
    });
  }

  // ── Sector fetch & heatmap ─────────────────────────────────────────────────
  async function refreshHeatmap() {
    const grid = document.getElementById("tdHeatmapGrid");
    const status = document.getElementById("tdHeatmapStatus");
    if (!grid) return;
    grid.innerHTML = '<div class="td-macro-loading">Descargando datos sectoriales…</div>';
    if (status) { status.style.display = "none"; status.textContent = ""; }

    const periodMap = {
      "1mo": { range: "1mo", interval: "1d" },
      "3mo": { range: "3mo", interval: "1d" },
      "ytd": { range: "ytd", interval: "1d" },
      "1y":  { range: "1y",  interval: "1wk" },
    };
    const { range, interval } = periodMap[activePeriod] || periodMap["1mo"];

    let results = [];
    let errors = 0;

    await Promise.all(SECTORS.map(async (sector) => {
      try {
        const res = await fetch(`${API}/chart/${sector.symbol}?range=${range}&interval=${interval}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
        const prices = closes.filter(v => v != null && v > 0);
        if (prices.length < 2) throw new Error("Sin datos");
        const ret = (prices[prices.length - 1] / prices[0]) - 1;
        const logRets = [];
        for (let i = 1; i < prices.length; i++) logRets.push(Math.log(prices[i] / prices[i - 1]));
        const mean = logRets.reduce((s, v) => s + v, 0) / logRets.length;
        const variance = logRets.reduce((s, v) => s + (v - mean) ** 2, 0) / (logRets.length - 1);
        const vol = Math.sqrt(variance * (interval === "1d" ? 252 : 52));
        sectorData[sector.symbol] = { ret, vol };
        results.push({ ...sector, ret, vol });
      } catch {
        errors++;
        results.push({ ...sector, ret: null, vol: null });
      }
    }));

    if (errors === SECTORS.length) {
      grid.innerHTML = '<div class="td-macro-loading">No se pudo conectar con el servidor. Ejecuta python api.py primero.</div>';
      if (status) { status.style.display = ""; status.textContent = "⚠ Servidor no disponible"; }
      return;
    }

    renderHeatmap(grid, results);
    renderRanking(results);
    updateSectorVerdict(results);
  }

  function retColor(ret) {
    if (ret === null) return { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.3)" };
    const intensity = Math.min(Math.abs(ret) / 0.15, 1); // saturate at ±15%
    if (ret > 0) {
      const g = Math.round(40 + intensity * 160);
      const alpha = 0.15 + intensity * 0.55;
      return { bg: `rgba(0,${g},100,${alpha})`, text: "#00c894" };
    } else {
      const r = Math.round(150 + intensity * 100);
      const alpha = 0.15 + intensity * 0.55;
      return { bg: `rgba(${r},20,40,${alpha})`, text: "#ff6b8a" };
    }
  }

  function renderHeatmap(grid, results) {
    const sorted = [...results].sort((a, b) => (b.ret ?? -Infinity) - (a.ret ?? -Infinity));
    const maxAbsRet = Math.max(...results.map(r => Math.abs(r.ret ?? 0)), 0.01);

    grid.innerHTML = sorted.map(s => {
      const { bg, text } = retColor(s.ret);
      const retTxt = s.ret !== null ? (s.ret >= 0 ? "+" : "") + (s.ret * 100).toFixed(2) + "%" : "—";
      const volTxt = s.vol !== null ? (s.vol * 100).toFixed(1) + "% vol" : "";
      const barW = s.ret !== null ? Math.round((Math.abs(s.ret) / maxAbsRet) * 100) : 0;
      return `
        <div class="td-heatmap-cell" style="background:${bg}" data-symbol="${s.symbol}" data-name="${s.name}" title="Ir a Mercados: ${s.symbol}">
          <div class="td-heatmap-sector">${s.name}</div>
          <div class="td-heatmap-etf">${s.symbol}</div>
          <div class="td-heatmap-ret" style="color:${text}">${retTxt}</div>
          <div class="td-heatmap-vol">${volTxt}</div>
          <div class="td-heatmap-bar-bg">
            <div class="td-heatmap-bar-fill" style="width:${barW}%;background:${text};opacity:0.55"></div>
          </div>
        </div>`;
    }).join("");

    grid.querySelectorAll(".td-heatmap-cell").forEach(cell => {
      cell.addEventListener("click", () => navigateToMarkets(cell.dataset.symbol, cell.dataset.name));
    });
  }

  function navigateToMarkets(symbol, name) {
    // Update market state and navigate
    const flow = document.getElementById("tdAssetVerdict");
    if (flow) { flow.textContent = symbol; flow.className = "td-flow-verdict td-verdict-ok"; }

    const step3 = document.getElementById("tdFlowAsset");
    step3?.classList.add("td-flow-active");

    // Trigger nav to markets section
    const navBtn = document.querySelector(".dashboard-nav-item[data-section='markets']");
    if (navBtn) navBtn.click();

    // Pre-fill the ticker input in markets and load
    setTimeout(() => {
      const input = document.getElementById("tickerInput");
      if (input) {
        input.value = symbol;
        document.getElementById("applyTickerButton")?.click();
      }
    }, 120);
  }

  function renderRanking(results) {
    const table = document.getElementById("tdRankingTable");
    const label = document.getElementById("tdRankingPeriodLabel");
    if (!table) return;

    const labels = { "1mo": "1 Mes", "3mo": "3 Meses", "ytd": "YTD", "1y": "1 Año" };
    if (label) label.textContent = labels[activePeriod] || activePeriod;

    const sorted = [...results]
      .filter(s => s.ret !== null)
      .sort((a, b) => b.ret - a.ret);

    if (!sorted.length) { table.innerHTML = '<div class="td-macro-loading">Sin datos disponibles.</div>'; return; }

    table.innerHTML = `
      <table class="tracker-table">
        <thead><tr><th>#</th><th>Sector</th><th>ETF</th><th>Retorno</th><th>Volatilidad</th><th>Sharpe est.</th></tr></thead>
        <tbody>${sorted.map((s, i) => {
          const rfr = 0.045 / (activePeriod === "1y" ? 1 : activePeriod === "3mo" ? 4 : activePeriod === "ytd" ? 1 : 12);
          const annFactor = activePeriod === "1y" ? 1 : activePeriod === "3mo" ? 4 : activePeriod === "ytd" ? 1 : 12;
          const annRet = s.ret * annFactor;
          const sharpe = s.vol > 0.001 ? ((annRet - 0.045) / s.vol).toFixed(2) : "—";
          const retCls = s.ret >= 0 ? "td-trend-up" : "td-trend-down";
          return `<tr>
            <td style="opacity:0.5">${i + 1}</td>
            <td>${s.name}</td>
            <td><span class="mkw-chip-label" style="cursor:pointer;color:#6f86ff" onclick="(function(){document.querySelector('[data-section=markets]').click();setTimeout(()=>{var inp=document.getElementById('tickerInput');if(inp){inp.value='${s.symbol}';document.getElementById('applyTickerButton')?.click();}},120);})()">${s.symbol}</span></td>
            <td class="${retCls}">${s.ret >= 0 ? "+" : ""}${(s.ret * 100).toFixed(2)}%</td>
            <td>${(s.vol * 100).toFixed(1)}%</td>
            <td>${sharpe}</td>
          </tr>`;
        }).join("")}</tbody>
      </table>`;
  }

  function updateSectorVerdict(results) {
    const sorted = results.filter(s => s.ret !== null).sort((a, b) => b.ret - a.ret);
    const top = sorted[0];
    const el = document.getElementById("tdSectorVerdict");
    if (!el || !top) return;
    el.textContent = `Líder: ${top.name} (${(top.ret * 100).toFixed(1)}%)`;
    el.className = "td-flow-verdict td-verdict-ok";
    document.getElementById("tdFlowSector")?.classList.add("td-flow-active");
  }

})();
