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

  // Benchmark para fuerza relativa (RS)
  const BENCHMARK = { name: "S&P 500", symbol: "^GSPC" };

  // Indicadores macro de mercado — datos LIVE vía /api/chart (Yahoo). Sin API key, gratis.
  const MACRO_MARKET = [
    { key: "us10y", label: "Treasury 10Y", symbol: "^TNX",     unit: "%",  note: "rendimiento" },
    { key: "us3m",  label: "Treasury 3M",  symbol: "^IRX",     unit: "%",  note: "T-bill 13s (≈ Fed)" },
    { key: "us30y", label: "Treasury 30Y", symbol: "^TYX",     unit: "%",  note: "rendimiento" },
    { key: "vix",   label: "VIX",          symbol: "^VIX",     unit: "",   note: "volatilidad implícita" },
    { key: "dxy",   label: "DXY (Dólar)",  symbol: "DX-Y.NYB", unit: "",   note: "índice dólar" },
    { key: "wti",   label: "Petróleo WTI", symbol: "CL=F",     unit: "$",  note: "por barril" },
    { key: "gold",  label: "Oro",          symbol: "GC=F",     unit: "$",  note: "por oz troy" },
  ];

  // Régimen económico → sectores históricamente favorecidos
  const REGIME_SECTORS = {
    EARLY:     ["Financiero", "Industrial", "Consumo Disc.", "Materiales", "Tecnología"],
    MID:       ["Tecnología", "Comunicaciones", "Industrial", "Energía"],
    LATE:      ["Energía", "Materiales", "Salud", "Consumo Básico", "Utilidades"],
    DEFENSIVE: ["Consumo Básico", "Salud", "Utilidades", "Real Estate"],
  };

  const TREND_ICON  = { up: "▲", down: "▼", flat: "—" };
  const TREND_CLASS = { up: "td-trend-up", down: "td-trend-down", flat: "td-trend-flat" };

  let activePeriod = "1mo";
  let sectorData = {};        // symbol → { ret, vol, annRet, rs }
  let favoredSectors = [];    // nombres de sectores favorecidos por el régimen vigente
  let riskFreeRate = 0.045;   // tasa libre de riesgo anual — se actualiza con Treasury 3M live
  let lastUpdated = null;     // timestamp de la última descarga macro
  let initialized = false;

  // ── Public init ────────────────────────────────────────────────────────────
  window.initTopDown = async function () {
    if (initialized) { refreshHeatmap(); return; }
    initialized = true;

    bindPeriodNav();
    document.getElementById("tdRefreshBtn")?.addEventListener("click", async () => {
      await renderMacroPanel();
      refreshHeatmap();
    });
    await renderMacroPanel();
    refreshHeatmap();
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  async function fetchSeries(symbol, range = "1mo", interval = "1d") {
    const res = await fetch(`${API}/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    return closes.filter(v => v != null && v > 0);
  }

  function fmtValue(v, unit) {
    if (unit === "%") return v.toFixed(2) + "%";
    if (unit === "$") return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 2 });
    return v.toFixed(2);
  }

  function pct(x) { return (x >= 0 ? "+" : "") + (x * 100).toFixed(2) + "%"; }

  function sparkline(series, color) {
    if (!series || series.length < 2) return "";
    // Downsample a ~40 puntos para mantener el SVG ligero
    let s = series;
    if (series.length > 40) {
      const step = series.length / 40;
      s = Array.from({ length: 40 }, (_, i) => series[Math.floor(i * step)]);
    }
    const w = 100, h = 22;
    const min = Math.min(...s), max = Math.max(...s);
    const range = (max - min) || 1;
    const pts = s.map((v, i) => {
      const x = (i / (s.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return `<svg class="td-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
  }

  // ── Macro panel (datos live) ─────────────────────────────────────────────────
  async function renderMacroPanel() {
    const grid = document.getElementById("tdMacroGrid");
    if (!grid) return;
    grid.innerHTML = '<div class="td-macro-loading">Descargando indicadores en vivo…</div>';

    const v = {};
    await Promise.all(MACRO_MARKET.map(async (m) => {
      try {
        const s = await fetchSeries(m.symbol);
        if (s.length < 2) throw new Error("sin datos");
        const last = s[s.length - 1], first = s[0];
        const chgPct = (last / first - 1) * 100;
        v[m.key] = { last, chgPct, spark: s };
      } catch { v[m.key] = null; }
    }));

    // TIIE 28d desde Banxico (endpoint ya desplegado)
    let tiie = null;
    try {
      const r = await fetch(`${API}/risk-free-rate`);
      if (r.ok) { const j = await r.json(); tiie = { rate: j.rate, date: j.date }; }
    } catch { /* opcional */ }

    // Curva 3M-10Y derivada (señal de recesión)
    let curve = null;
    if (v.us10y && v.us3m) curve = v.us10y.last - v.us3m.last;

    // Tasa libre de riesgo live: Treasury 3M (USD) para los ETFs sectoriales US
    if (v.us3m && v.us3m.last > 0) riskFreeRate = v.us3m.last / 100;
    lastUpdated = new Date();

    // ── Construir tarjetas ──
    const cards = [];
    const failed = MACRO_MARKET.filter(m => !v[m.key]).length;

    MACRO_MARKET.forEach((m) => {
      const d = v[m.key];
      if (!d) {
        cards.push(macroCard(m.label, "—", "flat", "sin datos", null));
        return;
      }
      const trend = d.chgPct > 0.3 ? "up" : d.chgPct < -0.3 ? "down" : "flat";
      const noteTxt = `${(d.chgPct >= 0 ? "+" : "") + d.chgPct.toFixed(1)}% · 30d`;
      const color = trend === "up" ? "#00c894" : trend === "down" ? "#ff6b8a" : "rgba(255,255,255,0.4)";
      cards.push(macroCard(m.label, fmtValue(d.last, m.unit), trend, noteTxt, sparkline(d.spark, color), m.note));
    });

    // Curva como tarjeta derivada
    if (curve != null) {
      const inverted = curve < 0;
      cards.push(macroCard(
        "Curva 3M-10Y",
        (curve >= 0 ? "+" : "") + curve.toFixed(2) + " pp",
        inverted ? "down" : "up",
        inverted ? "invertida ⚠" : "pendiente positiva",
        null
      ));
    }
    // TIIE
    if (tiie && tiie.rate != null) {
      cards.push(macroCard("TIIE 28d (MX)", tiie.rate.toFixed(2) + "%", "flat", `Banxico ${tiie.date || ""}`, null));
    }

    grid.innerHTML = cards.join("");

    if (failed === MACRO_MARKET.length) {
      grid.innerHTML = '<div class="td-macro-loading">No se pudo conectar con el servidor de datos. Intenta de nuevo en unos segundos.</div>';
      return;
    }

    // ── Régimen + veredicto ──
    const regime = classifyRegime(v, curve);
    favoredSectors = regime.sectors;
    renderRegimeBanner(regime, curve, v.vix);

    const el = document.getElementById("tdMacroVerdict");
    if (el) {
      const vixTxt = v.vix ? ` · VIX ${v.vix.last.toFixed(1)}` : "";
      const curveTxt = curve != null ? ` · curva ${(curve >= 0 ? "+" : "") + curve.toFixed(2)}pp` : "";
      el.textContent = `${regime.label}${curveTxt}${vixTxt}`;
      el.className = `td-flow-verdict td-verdict-${regime.cls}`;
    }

    const tsEl = document.getElementById("tdLastUpdated");
    if (tsEl && lastUpdated) {
      tsEl.textContent = `Actualizado ${lastUpdated.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} · tasa libre de riesgo ${(riskFreeRate * 100).toFixed(2)}%`;
    }
  }

  function macroCard(label, value, trend, note, sparkSvg, subnote) {
    return `
      <div class="td-macro-card">
        <span class="td-macro-label">${label}</span>
        <strong class="td-macro-value">${value}</strong>
        <span class="td-macro-trend ${TREND_CLASS[trend]}">${TREND_ICON[trend]} ${note}</span>
        ${subnote ? `<span class="td-macro-sub">${subnote}</span>` : ""}
        ${sparkSvg || ""}
      </div>`;
  }

  // Implicaciones accionables por régimen
  const REGIME_PLAYBOOK = {
    DEFENSIVE: ["Sobrepondera defensivos: consumo básico, salud, utilities", "Reduce beta y duración larga", "Prioriza calidad y flujo de caja estable"],
    LATE:      ["Favorece energía y materiales (cobertura de inflación)", "Toma ganancias en cíclicos de alto beta", "Vigila la inversión de la curva de tasas"],
    EARLY:     ["Sobrepondera cíclicos: financiero, industrial, consumo disc.", "Aprovecha la relajación monetaria en duración", "Aumenta exposición a small-cap / value"],
    MID:       ["Mantén crecimiento: tecnología y comunicaciones", "Equilibra cíclicos con posiciones de calidad", "El momentum sigue vigente — no luches contra la tendencia"],
  };

  // Nivel de confianza: cuántas señales macro son fuertes y concordantes
  function regimeConfidence(curve, vix, rateTrend) {
    let strong = 0;
    if (curve != null && Math.abs(curve) > 0.2) strong++;
    if (vix != null && (vix > 22 || vix < 14)) strong++;
    if (rateTrend != null && Math.abs(rateTrend) > 1.5) strong++;
    return strong >= 2 ? { label: "Alta", cls: "ok" } : strong === 1 ? { label: "Media", cls: "warn" } : { label: "Baja", cls: "flat" };
  }

  // Clasificación de régimen a partir de datos en vivo (curva + VIX + tendencia de tasas)
  function classifyRegime(v, curve) {
    const vix = v.vix ? v.vix.last : null;
    const rateTrend = v.us3m ? v.us3m.chgPct : null;  // dirección de la tasa corta
    const conf = regimeConfidence(curve, vix, rateTrend);
    const build = (label, cls, key) => ({ label, cls, sectors: REGIME_SECTORS[key], playbook: REGIME_PLAYBOOK[key], confidence: conf });

    if (curve != null && curve < 0) {
      if (vix != null && vix > 22) return build("Riesgo de recesión", "bad", "DEFENSIVE");
      return build("Fin de ciclo (late-cycle)", "warn", "LATE");
    }
    if (curve != null && curve >= 0) {
      if (rateTrend != null && rateTrend < -1.5) return build("Recuperación / relajación monetaria", "ok", "EARLY");
      if (vix != null && vix > 22) return build("Expansión con estrés de mercado", "warn", "LATE");
      return build("Expansión moderada", "ok", "MID");
    }
    return { label: "Datos insuficientes", cls: "flat", sectors: [], playbook: [], confidence: { label: "—", cls: "flat" } };
  }

  function renderRegimeBanner(regime, curve, vixObj) {
    const el = document.getElementById("tdRegimeBanner");
    if (!el) return;
    if (!regime.sectors.length) { el.innerHTML = ""; return; }
    const chips = regime.sectors.map(s => `<span class="td-regime-chip">${s}</span>`).join("");
    const conf = regime.confidence || { label: "—", cls: "flat" };
    const play = (regime.playbook || []).map(p => `<li>${p}</li>`).join("");
    el.innerHTML = `
      <div class="td-regime-row">
        <span class="td-regime-pill td-regime-${regime.cls}">${regime.label}</span>
        <span class="td-regime-conf" title="Confianza según cuántas señales macro (curva, VIX, tasas) son fuertes y concuerdan">Confianza: <strong class="td-conf-${conf.cls}">${conf.label}</strong></span>
      </div>
      ${play ? `<div class="td-regime-play"><span class="td-regime-meta">Qué implica para tu posicionamiento:</span><ul class="td-play-list">${play}</ul></div>` : ""}
      <div class="td-regime-row" style="margin-top:8px"><span class="td-regime-meta">Sectores favorecidos por el ciclo actual:</span></div>
      <div class="td-regime-sectors">${chips}</div>`;
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
    const perYear = interval === "1d" ? 252 : 52;

    // Benchmark para fuerza relativa
    let spyRet = null;
    try {
      const sp = await fetchSeries(BENCHMARK.symbol, range, interval);
      if (sp.length >= 2) spyRet = sp[sp.length - 1] / sp[0] - 1;
    } catch { /* RS quedará no disponible */ }

    let results = [];
    let errors = 0;

    await Promise.all(SECTORS.map(async (sector) => {
      try {
        const prices = await fetchSeries(sector.symbol, range, interval);
        if (prices.length < 2) throw new Error("Sin datos");
        const ret = (prices[prices.length - 1] / prices[0]) - 1;
        const logRets = [];
        for (let i = 1; i < prices.length; i++) logRets.push(Math.log(prices[i] / prices[i - 1]));
        const mean = logRets.reduce((s, x) => s + x, 0) / logRets.length;
        const variance = logRets.reduce((s, x) => s + (x - mean) ** 2, 0) / (logRets.length - 1);
        const vol = Math.sqrt(variance * perYear);                 // volatilidad anualizada
        const annFactor = perYear / (prices.length - 1);
        const annRet = Math.pow(1 + ret, annFactor) - 1;           // retorno anualizado (geométrico)
        const rs = spyRet != null ? ret - spyRet : null;           // fuerza relativa vs S&P
        sectorData[sector.symbol] = { ret, vol, annRet, rs };
        results.push({ ...sector, ret, vol, annRet, rs, spark: prices });
      } catch {
        errors++;
        results.push({ ...sector, ret: null, vol: null, annRet: null, rs: null, spark: null });
      }
    }));

    if (errors === SECTORS.length) {
      grid.innerHTML = '<div class="td-macro-loading">No se pudo conectar con el servidor de Railway. Intenta de nuevo en unos segundos.</div>';
      if (status) { status.style.display = ""; status.textContent = "⚠ API no disponible"; }
      return;
    }

    renderHeatmap(grid, results);
    renderScatter(results);
    renderTopPicks(results);
    renderRanking(results, spyRet);
    updateSectorVerdict(results);
  }

  // ── Scatter Riesgo/Retorno (mejora 2) ───────────────────────────────────────
  function renderScatter(results) {
    const host = document.getElementById("tdScatter");
    if (!host) return;
    const valid = results.filter(s => s.ret !== null && s.vol !== null);
    if (valid.length < 2) { host.innerHTML = '<div class="td-macro-loading">Sin datos para el cuadrante.</div>'; return; }

    const W = 640, H = 380, padL = 52, padR = 18, padT = 18, padB = 42;
    const plotW = W - padL - padR, plotH = H - padT - padB;

    const vols = valid.map(s => s.vol);
    const rets = valid.map(s => s.ret);
    const xMax = Math.max(...vols) * 1.12 || 0.1;
    const yAbs = Math.max(Math.abs(Math.min(...rets)), Math.abs(Math.max(...rets)), 0.01) * 1.15;
    const yMin = -yAbs, yMax = yAbs;

    const X = v => padL + (v / xMax) * plotW;
    const Y = v => padT + (1 - (v - yMin) / (yMax - yMin)) * plotH;

    const y0 = Y(0); // línea de retorno cero
    const sharpes = valid.map(s => (s.vol > 0.001 && s.annRet != null) ? (s.annRet - riskFreeRate) / s.vol : 0);
    const maxSharpe = Math.max(...sharpes.map(Math.abs), 0.5);

    // Grid y ejes
    let svg = `<svg viewBox="0 0 ${W} ${H}" class="td-scatter-svg" role="img" aria-label="Cuadrante riesgo retorno sectorial">`;
    svg += `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="rgba(255,255,255,0.18)"/>`;
    svg += `<line x1="${padL}" y1="${y0}" x2="${W - padR}" y2="${y0}" stroke="rgba(255,255,255,0.18)" stroke-dasharray="3 3"/>`;
    // ticks Y
    [yMax, yMax / 2, 0, yMin / 2, yMin].forEach(t => {
      const yy = Y(t);
      svg += `<text x="${padL - 8}" y="${yy + 3}" text-anchor="end" class="td-scatter-tick">${(t * 100).toFixed(0)}%</text>`;
    });
    // ticks X
    [0, xMax / 2, xMax].forEach(t => {
      const xx = X(t);
      svg += `<text x="${xx}" y="${H - padB + 16}" text-anchor="middle" class="td-scatter-tick">${(t * 100).toFixed(0)}%</text>`;
    });
    svg += `<text x="${padL + plotW / 2}" y="${H - 6}" text-anchor="middle" class="td-scatter-axis">Volatilidad anualizada (riesgo) →</text>`;
    svg += `<text x="14" y="${padT + plotH / 2}" text-anchor="middle" class="td-scatter-axis" transform="rotate(-90 14 ${padT + plotH / 2})">Retorno del período →</text>`;

    valid.forEach((s, i) => {
      const cx = X(s.vol), cy = Y(s.ret);
      const sh = sharpes[i];
      const inten = Math.min(Math.abs(sh) / maxSharpe, 1);
      const col = sh >= 0 ? `rgba(0,200,148,${0.35 + inten * 0.55})` : `rgba(255,107,138,${0.35 + inten * 0.55})`;
      const fav = favoredSectors.includes(s.name);
      const r = 7 + inten * 5;
      svg += `<g class="td-scatter-pt" data-symbol="${s.symbol}" data-name="${s.name}" style="cursor:pointer">`;
      svg += `<title>${s.name} (${s.symbol}) · Ret ${pct(s.ret)} · Vol ${(s.vol * 100).toFixed(1)}% · Sharpe ${sh.toFixed(2)}${fav ? " · ★ favorecido por el régimen" : ""}</title>`;
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}" stroke="${fav ? "#f5b84c" : "rgba(255,255,255,0.4)"}" stroke-width="${fav ? 2 : 1}"/>`;
      if (fav) svg += `<text x="${cx}" y="${cy - r - 3}" text-anchor="middle" class="td-scatter-star">★</text>`;
      svg += `<text x="${cx}" y="${cy + r + 11}" text-anchor="middle" class="td-scatter-lbl">${s.symbol}</text>`;
      svg += `</g>`;
    });
    svg += `</svg>`;
    host.innerHTML = svg;
    host.querySelectorAll(".td-scatter-pt").forEach(g => {
      g.addEventListener("click", () => navigateToMarkets(g.dataset.symbol, g.dataset.name));
    });
  }

  // ── Top picks: cruce régimen ∩ momentum (mejora 4) ──────────────────────────
  function renderTopPicks(results) {
    const host = document.getElementById("tdTopPicks");
    if (!host) return;
    const valid = results.filter(s => s.ret !== null);
    if (!favoredSectors.length || !valid.length) { host.innerHTML = ""; return; }

    const picks = valid
      .filter(s => favoredSectors.includes(s.name) && s.ret > 0)
      .sort((a, b) => b.ret - a.ret)
      .slice(0, 3);
    if (!picks.length) { host.innerHTML = `<div class="td-picks-empty">Ningún sector favorecido por el régimen muestra momentum positivo en este período — señal de cautela.</div>`; return; }

    const cards = picks.map(s => {
      const sharpe = (s.vol > 0.001 && s.annRet != null) ? ((s.annRet - riskFreeRate) / s.vol).toFixed(2) : "—";
      const rsTxt = s.rs != null ? pct(s.rs) : "—";
      const rsCls = s.rs != null && s.rs >= 0 ? "td-trend-up" : "td-trend-down";
      return `<div class="td-pick-card" data-symbol="${s.symbol}" data-name="${s.name}" title="Ver ${s.symbol} en Mercados">
        <div class="td-pick-top"><span class="td-pick-star">★</span><span class="td-pick-name">${s.name}</span><span class="td-pick-etf">${s.symbol}</span></div>
        <div class="td-pick-ret td-trend-up">${pct(s.ret)}</div>
        <div class="td-pick-meta"><span class="${rsCls}">vs S&P ${rsTxt}</span><span>Sharpe ${sharpe}</span></div>
      </div>`;
    }).join("");
    host.innerHTML = `<div class="td-picks-head">⭐ Mejores candidatos — alineados al régimen y con momentum</div><div class="td-picks-grid">${cards}</div>`;
    host.querySelectorAll(".td-pick-card").forEach(c => {
      c.addEventListener("click", () => navigateToMarkets(c.dataset.symbol, c.dataset.name));
    });
  }

  // Color de TEXTO del retorno (verde/rojo según signo del retorno absoluto)
  function retTextColor(ret) {
    if (ret === null) return "rgba(255,255,255,0.3)";
    return ret >= 0 ? "#00c894" : "#ff6b8a";
  }

  // Color de FONDO según fuerza relativa (RS) vs S&P — desacopla color (liderazgo) de orden (retorno).
  // Si no hay RS disponible, cae a intensidad por retorno absoluto.
  function rsColor(rs, ret) {
    if (rs == null && ret === null) return "rgba(255,255,255,0.06)";
    const metric = rs != null ? rs : ret;
    const intensity = Math.min(Math.abs(metric) / 0.08, 1); // satura a ±8% de diferencial
    if (metric >= 0) {
      const alpha = 0.12 + intensity * 0.5;
      return `rgba(0,200,148,${alpha})`;
    }
    const alpha = 0.12 + intensity * 0.5;
    return `rgba(255,107,138,${alpha})`;
  }

  function renderHeatmap(grid, results) {
    const sorted = [...results].sort((a, b) => (b.ret ?? -Infinity) - (a.ret ?? -Infinity));
    const maxAbsRet = Math.max(...results.map(r => Math.abs(r.ret ?? 0)), 0.01);

    grid.innerHTML = sorted.map(s => {
      const text = retTextColor(s.ret);
      const bg = rsColor(s.rs, s.ret);
      const retTxt = s.ret !== null ? pct(s.ret) : "—";
      const volTxt = s.vol !== null ? (s.vol * 100).toFixed(1) + "% vol" : "";
      const barW = s.ret !== null ? Math.round((Math.abs(s.ret) / maxAbsRet) * 100) : 0;
      const fav = favoredSectors.includes(s.name);
      const rsTxt = s.rs != null
        ? `<div class="td-heatmap-rs ${s.rs >= 0 ? "td-trend-up" : "td-trend-down"}">vs S&P ${pct(s.rs)}</div>`
        : "";
      const spark = s.spark ? sparkline(s.spark, text) : "";
      return `
        <div class="td-heatmap-cell${fav ? " td-heatmap-fav" : ""}" style="background:${bg}" data-symbol="${s.symbol}" data-name="${s.name}" title="${fav ? "Favorecido por el régimen — " : ""}Ir a Mercados: ${s.symbol}">
          ${fav ? '<span class="td-fav-badge" title="Favorecido por el régimen macro">★</span>' : ""}
          <div class="td-heatmap-sector">${s.name}</div>
          <div class="td-heatmap-etf">${s.symbol}</div>
          <div class="td-heatmap-ret" style="color:${text}">${retTxt}</div>
          ${rsTxt}
          <div class="td-heatmap-vol">${volTxt}</div>
          ${spark}
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
    const flow = document.getElementById("tdAssetVerdict");
    if (flow) { flow.textContent = symbol; flow.className = "td-flow-verdict td-verdict-ok"; flow.dataset.picked = "1"; }

    document.getElementById("tdFlowAsset")?.classList.add("td-flow-active");

    const navBtn = document.querySelector(".dashboard-nav-item[data-section='markets']");
    if (navBtn) navBtn.click();

    setTimeout(() => {
      const input = document.getElementById("tickerInput");
      if (input) {
        input.value = symbol;
        document.getElementById("applyTickerButton")?.click();
      }
    }, 120);
  }

  function renderRanking(results, spyRet) {
    const table = document.getElementById("tdRankingTable");
    const label = document.getElementById("tdRankingPeriodLabel");
    if (!table) return;

    const labels = { "1mo": "1 Mes", "3mo": "3 Meses", "ytd": "YTD", "1y": "1 Año" };
    if (label) label.textContent = labels[activePeriod] || activePeriod;

    const sorted = [...results].filter(s => s.ret !== null).sort((a, b) => b.ret - a.ret);
    if (!sorted.length) { table.innerHTML = '<div class="td-macro-loading">Sin datos disponibles.</div>'; return; }

    const rfr = riskFreeRate; // tasa libre de riesgo anual (Treasury 3M live)
    const rfrTxt = (rfr * 100).toFixed(2);
    table.innerHTML = `
      <table class="tracker-table">
        <thead><tr><th>#</th><th>Sector</th><th>ETF</th><th>Retorno</th>
          <th><span class="td-th-info" title="Fuerza relativa: retorno del sector menos el del S&P 500 en el período. Positivo = el sector supera al índice.">vs S&P ⓘ</span></th>
          <th><span class="td-th-info" title="Volatilidad anualizada de los retornos diarios. Mayor = más riesgo/oscilación.">Volatilidad ⓘ</span></th>
          <th><span class="td-th-info" title="Sharpe estimado = (retorno anualizado − tasa libre de riesgo ${rfrTxt}%) / volatilidad. Retorno ajustado por riesgo; mayor es mejor.">Sharpe est. ⓘ</span></th></tr></thead>
        <tbody>${sorted.map((s, i) => {
          const sharpe = (s.vol > 0.001 && s.annRet != null) ? ((s.annRet - rfr) / s.vol).toFixed(2) : "—";
          const retCls = s.ret >= 0 ? "td-trend-up" : "td-trend-down";
          const rsCls = s.rs == null ? "" : (s.rs >= 0 ? "td-trend-up" : "td-trend-down");
          const rsTxt = s.rs == null ? "—" : pct(s.rs);
          const fav = favoredSectors.includes(s.name);
          return `<tr>
            <td style="opacity:0.5">${i + 1}</td>
            <td>${fav ? '<span class="td-fav-inline" title="Favorecido por el régimen">★</span> ' : ""}${s.name}</td>
            <td><span class="td-rank-ticker" data-symbol="${s.symbol}" data-name="${s.name}">${s.symbol}</span></td>
            <td class="${retCls}">${pct(s.ret)}</td>
            <td class="${rsCls}">${rsTxt}</td>
            <td>${(s.vol * 100).toFixed(1)}%</td>
            <td>${sharpe}</td>
          </tr>`;
        }).join("")}</tbody>
      </table>`;

    table.querySelectorAll(".td-rank-ticker").forEach(el => {
      el.addEventListener("click", () => navigateToMarkets(el.dataset.symbol, el.dataset.name));
    });
  }

  function updateSectorVerdict(results) {
    const valid = results.filter(s => s.ret !== null).sort((a, b) => b.ret - a.ret);
    const el = document.getElementById("tdSectorVerdict");
    if (!el || !valid.length) return;

    const topOverall = valid[0];
    const fav = valid.filter(s => favoredSectors.includes(s.name));
    const topFav = fav[0];

    let txt, cls;
    if (topFav && topFav.name === topOverall.name) {
      txt = `${topFav.name} lidera y está alineado al régimen (${pct(topFav.ret)})`; cls = "ok";
    } else if (topFav) {
      txt = `Alineado al régimen: ${topFav.name} (${pct(topFav.ret)}) · líder absoluto: ${topOverall.name}`; cls = "ok";
    } else {
      txt = `Líder: ${topOverall.name} (${pct(topOverall.ret)}) — fuera del sesgo del régimen`; cls = "warn";
    }
    el.textContent = txt;
    el.className = `td-flow-verdict td-verdict-${cls}`;
    document.getElementById("tdFlowSector")?.classList.add("td-flow-active");

    // Paso 3: sugerir automáticamente el ETF del sector líder alineado al régimen
    const assetEl = document.getElementById("tdAssetVerdict");
    if (assetEl && !assetEl.dataset.picked) {
      const lead = topFav || topOverall;
      assetEl.textContent = `${lead.symbol} sugerido (${lead.name})`;
      assetEl.className = "td-flow-verdict td-verdict-ok";
      document.getElementById("tdFlowAsset")?.classList.add("td-flow-active");
    }
  }

})();
