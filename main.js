const navItems = document.querySelectorAll(".dashboard-nav-item");
const sections = document.querySelectorAll(".dashboard-section");
const logoutButton = document.getElementById("logoutButton");
const logoutButtonSecondary = document.getElementById("logoutButtonSecondary");

const sidebarUserName = document.getElementById("sidebarUserName");
const sidebarUserPlan = document.getElementById("sidebarUserPlan");
const topbarUserName = document.getElementById("topbarUserName");
const topbarPlan = document.getElementById("topbarPlan");
const settingsUser = document.getElementById("settingsUser");
const settingsEmail = document.getElementById("settingsEmail");
const settingsPlan = document.getElementById("settingsPlan");
const settingsType = document.getElementById("settingsType");

const mainHeading = document.getElementById("mainHeading");
const resetHomeButton = document.getElementById("resetHomeButton");

const tickerInput = document.getElementById("tickerInput");
const applyTickerButton = document.getElementById("applyTickerButton");
const tickerSuggestions = document.getElementById("tickerSuggestions");
const saveTickerButton = document.getElementById("saveTickerButton");
const rangeSegmented = document.getElementById("rangeSegmented");
const chartTypeMenuButton = document.getElementById("chartTypeMenuButton");
const chartTypeButtonIcon = document.getElementById("chartTypeButtonIcon");
const indicatorMenuButton = document.getElementById("indicatorMenuButton");
const marketMenuButtons = document.querySelectorAll("[data-menu-target]");
const marketMenus = document.querySelectorAll(".market-menu");
const indicatorCheckboxes = document.querySelectorAll("#indicatorMenu input[type='checkbox']");
const chartSymbolLabel = document.getElementById("chartSymbolLabel");
const chartMetaLabel = document.getElementById("chartMetaLabel");
const chartPriceLabel = document.getElementById("chartPriceLabel");
const marketChartStatus = document.getElementById("marketChartStatus");
const marketChartContainer = document.getElementById("marketChart");
const marketChartOverlay = document.getElementById("marketChartOverlay");
const marketChartOverlayMsg = document.getElementById("marketChartOverlayMsg");

const marketStorageKey = "blackportfolio-market-state";
const hubStorageKey = "blackportfolio-hub-state";
const HOME_HEADING = "Centro de inversión";

const rangeConfigs = {
  // ── Intraday vía RapidAPI ────────────────────────────────────────────────
  "HOY": { label: "HOY", rapidPeriod: "1D", source: "rapid" },
  "5D":  { label: "5D",  rapidPeriod: "5D", source: "rapid" },
  // ── Velas diarias/semanales/mensuales vía Yahoo Finance ─────────────────
  "1H":  { label: "1H",  range: "2y",   interval: "1h"  },
  "1D":  { label: "1D",  range: "30y",  interval: "1d"  },
  "1W":  { label: "1W",  range: "30y",  interval: "1wk" },
  "1M":  { label: "1M",  range: "max",  interval: "1mo" },
  "3M":  { label: "3M",  range: "30y",  interval: "3mo" },
  "6M":  { label: "6M",  range: "6mo",  interval: "1d"  },
  "1Y":  { label: "1Y",  range: "1y",   interval: "1wk" },
  "2Y":  { label: "2Y",  range: "2y",   interval: "1wk" },
  "5Y":  { label: "5Y",  range: "5y",   interval: "1mo" },
  "MAX": { label: "MAX", range: "max",  interval: "1mo" },
};

const chartTypeIcons = {
  candlestick: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 5v14M5 9h4v6H5zM17 4v16M15 7h4v8h-4z"></path>
    </svg>
  `,
  bars: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 4v16M4 7h4M4 14h4M18 4v16M16 9h4M16 16h4"></path>
    </svg>
  `,
  line: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 15l5-5 4 3 7-8"></path>
    </svg>
  `,
  area: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 17l5-6 4 2 7-7"></path>
      <path d="M4 20h16L20 6"></path>
    </svg>
  `,
  volheatmap: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="8" width="4" height="8" rx="0.5" fill="#089981" opacity="0.4"/>
      <line x1="5" y1="5" x2="5" y2="8" stroke="#089981" opacity="0.4" stroke-width="1.5"/>
      <line x1="5" y1="16" x2="5" y2="19" stroke="#089981" opacity="0.4" stroke-width="1.5"/>
      <rect x="10" y="5" width="4" height="10" rx="0.5" fill="#089981"/>
      <line x1="12" y1="3" x2="12" y2="5" stroke="#089981" stroke-width="1.5"/>
      <line x1="12" y1="15" x2="12" y2="20" stroke="#089981" stroke-width="1.5"/>
      <rect x="17" y="10" width="4" height="6" rx="0.5" fill="#f23445" opacity="0.7"/>
      <line x1="19" y1="7" x2="19" y2="10" stroke="#f23445" opacity="0.7" stroke-width="1.5"/>
      <line x1="19" y1="16" x2="19" y2="19" stroke="#f23445" opacity="0.7" stroke-width="1.5"/>
    </svg>
  `
};

const indicatorDefinitions = {
  sma20:  { label: "SMA 20",   type: "sma",  period: 20,  color: "#39d0ff" },
  ema20:  { label: "EMA 20",   type: "ema",  period: 20,  color: "#00e5ff" },
  ema50:  { label: "EMA 50",   type: "ema",  period: 50,  color: "#f5b84c" },
  sma50:  { label: "SMA 50",   type: "sma",  period: 50,  color: "#ff6b8a" },
  sma200: { label: "SMA 200",  type: "sma",  period: 200, color: "#9f7aea" },
  wma50:  { label: "WMA 50",   type: "wma",  period: 50,  color: "#c0a0ff" },
  bb:     { label: "BB (20,2)",type: "bb",   period: 20,  mult: 2,
            colors: { upper: "#ff6b8a", mid: "#6f86ff", lower: "#00c894" } },
  vwap:   { label: "VWAP",     type: "vwap", color: "#ff8c42" },
  rsi:    { label: "RSI (14)", type: "panel", panelType: "rsi",   period: 14,  color: "#f5b84c" },
  macd:   { label: "MACD",     type: "panel", panelType: "macd",
            colors: { macd: "#6f86ff", signal: "#ff6b8a", histUp: "#00c894", histDown: "#ff4d6a" } },
  stoch:  { label: "Estocástico", type: "panel", panelType: "stoch", k: 14, d: 3, smooth: 3,
            colors: { k: "#00c894", d: "#f5a623" } },
  cci:    { label: "CCI (20)", type: "panel", panelType: "cci",   period: 20,  color: "#f5a623" },
  atr:    { label: "ATR (14)", type: "panel", panelType: "atr",   period: 14,  color: "#ff8c42" },
  momentum: { label: "Momentum (10)", type: "panel", panelType: "momentum", period: 10, color: "#c084fc" },
  vol:    { label: "Volumen",  type: "panel", panelType: "vol" },
  vp:     { label: "Volume Profile", type: "primitive" },
  gaps:   { label: "Gaps", type: "primitive",
            colors: { upBorder: "rgba(0,200,148,0.9)", upFill: "rgba(0,200,148,0.14)",
                      downBorder: "rgba(255,77,106,0.9)", downFill: "rgba(255,77,106,0.14)" } },
  psar:   { label: "SAR Parabólico", type: "psar", step: 0.02, max: 0.2,
            colors: { up: "#32d6a2", down: "#ff6b81" } },
  fiboext:{ label: "Fib. Extensión", type: "fiboext", lookback: 60,
            color: "#f5b84c" },
  ichimoku: { label: "Ichimoku Cloud", type: "ichimoku", tenkan: 9, kijun: 26, senkou: 52,
            colors: { tenkan: "#39d0ff", kijun: "#ff6b8a", spanA: "#00c894", spanB: "#ff8c42",
                      cloudUp: "rgba(0,200,148,0.14)", cloudDown: "rgba(255,107,138,0.14)", chikou: "#c0a0ff" } },
  supertrend: { label: "SuperTrend", type: "supertrend", period: 10, mult: 3,
            colors: { up: "#00c894", down: "#ff4d6a" } },
  pivots: { label: "Pivot Points", type: "pivots",
            colors: { pp: "#f5b84c", r: "#ff6b8a", s: "#00c894" } },
  adx:    { label: "ADX / DMI", type: "panel", panelType: "adx", period: 14,
            colors: { adx: "#f5a623", plusDi: "#00c894", minusDi: "#ff4d6a" } },
  obv:    { label: "OBV", type: "panel", panelType: "obv", color: "#6f86ff" },
  mfi:    { label: "MFI (14)", type: "panel", panelType: "mfi", period: 14, color: "#c084fc" },
  willr:  { label: "Williams %R", type: "panel", panelType: "willr", period: 14, color: "#39d0ff" },
  roc:    { label: "ROC (12)", type: "panel", panelType: "roc", period: 12, color: "#f5a623" }
};

const PANEL_HEIGHTS = { vol: 0.13, rsi: 0.17, macd: 0.19, stoch: 0.15, cci: 0.15, atr: 0.13, momentum: 0.15,
  adx: 0.16, obv: 0.13, mfi: 0.15, willr: 0.15, roc: 0.15 };
const PANEL_GAP = 0.01;

// ── Plan restriction system ───────────────────────────────────────────────────
const _ALL_CHART_TYPES = ["candlestick", "bars", "line", "area", "volheatmap"];

const PLAN_LIMITS = {
  "-1": { // Free
    sections: ["home", "tracker", "settings"],
    ranges: ["1D", "1W", "1M"],
    chartTypes: ["line", "area"],
    indicators: ["sma20", "vol"],
    maxIndicators: 1,
    maxPortfolios: 1
  },
  0: { // Demo
    sections: ["home", "markets", "settings"],
    ranges: ["1D", "1W", "1M"],
    chartTypes: ["line", "area"],
    indicators: ["sma20", "ema20", "rsi", "vol"],
    maxIndicators: 2,
    maxPortfolios: 0
  },
  1: { // Investor
    sections: ["home", "tracker", "markets", "settings"],
    ranges: ["1D", "1W", "1M", "3M", "6M", "1Y", "2Y"],
    chartTypes: _ALL_CHART_TYPES,
    indicators: ["sma20", "ema20", "ema50", "sma50", "sma200", "bb", "rsi", "macd", "vol",
      "ichimoku", "supertrend", "pivots", "adx", "obv", "mfi", "willr", "roc"],
    maxIndicators: 5,
    maxPortfolios: 3
  },
  2: { // Advisor Pro
    sections: null, ranges: null, chartTypes: null, indicators: null,
    maxIndicators: Infinity, maxPortfolios: Infinity
  },
  3: { // Institutional Desk
    sections: null, ranges: null, chartTypes: null, indicators: null,
    maxIndicators: Infinity, maxPortfolios: Infinity
  }
};

function getPlanLevel(session) {
  if (!session || session.isDemo) return 0;
  return { "Free": -1, "Investor": 1, "Advisor Pro": 2, "Institutional Desk": 3 }[session.selectedPlan] ?? 1;
}

function showPlanToast(message) {
  document.getElementById("planToast")?.remove();
  const toast = document.createElement("div");
  toast.id = "planToast";
  toast.className = "plan-toast";
  toast.innerHTML = `🔒 ${message} &nbsp;<a href="index.html#plans" style="color:#6f86ff;font-weight:600">Ver planes →</a>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

function showUpgradeOverlay(sectionId) {
  const names = { tracker: "Portafolio Tracker", markowitz: "Creación de portafolio", analyzer: "Analizador de Activos", markets: "Mercados", topdown: "Análisis Top-Down" };
  const required = { tracker: "Investor", markowitz: "Advisor Pro", analyzer: "Advisor Pro", markets: "Investor", topdown: "Advisor Pro" };
  document.getElementById("planUpgradeOverlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "planUpgradeOverlay";
  overlay.className = "plan-upgrade-overlay";
  overlay.innerHTML = `
    <div class="plan-upgrade-card">
      <div class="plan-upgrade-icon">🔒</div>
      <h3>${names[sectionId] || sectionId}</h3>
      <p>Esta sección requiere el plan <strong>${required[sectionId] || "superior"}</strong> o mayor.</p>
      <a class="button primary" href="index.html#plans">Ver planes →</a>
    </div>`;
  document.querySelector(".dashboard-content-shell").appendChild(overlay);
}

function applyPlanRestrictions(session) {
  const level = getPlanLevel(session);
  const limits = PLAN_LIMITS[level];
  window._planLimits = limits;
  window._planLevel = level;

  // Nav items
  navItems.forEach((item) => {
    const id = item.dataset.section;
    const locked = limits.sections !== null && !limits.sections.includes(id);
    item.dataset.locked = locked ? "1" : "0";
    item.classList.toggle("nav-item-locked", locked);
    item.querySelector(".nav-lock-icon")?.remove();
    if (locked) {
      const icon = document.createElement("span");
      icon.className = "nav-lock-icon";
      icon.setAttribute("aria-hidden", "true");
      item.appendChild(icon);
    }
  });

  // Range buttons
  document.querySelectorAll("#rangeSegmented [data-range]").forEach((btn) => {
    const locked = limits.ranges !== null && !limits.ranges.includes(btn.dataset.range);
    btn.disabled = locked;
    btn.classList.toggle("menu-item-locked", locked);
  });

  // Chart type buttons
  document.querySelectorAll("#chartTypeMenu .market-menu-item[data-chart-type]").forEach((btn) => {
    const locked = limits.chartTypes !== null && !limits.chartTypes.includes(btn.dataset.chartType);
    btn.disabled = locked;
    btn.classList.toggle("menu-item-locked", locked);
  });

  // Indicator rows
  document.querySelectorAll("#indicatorMenu .indicator-row[data-ind]").forEach((row) => {
    const locked = limits.indicators !== null && !limits.indicators.includes(row.dataset.ind);
    const cb = row.querySelector("input[type='checkbox']");
    row.classList.toggle("ind-row-locked", locked);
    if (cb) cb.disabled = locked;
  });

  // Clamp current market state to allowed values
  if (limits.ranges && !limits.ranges.includes(marketState.range)) {
    marketState.range = limits.ranges[0] || "1D";
    persistMarketState();
  }
  if (limits.chartTypes && !limits.chartTypes.includes(marketState.chartType)) {
    marketState.chartType = limits.chartTypes[0] || "line";
    persistMarketState();
  }
  if (limits.indicators) {
    const filtered = marketState.indicators
      .filter(ind => limits.indicators.includes(ind))
      .slice(0, limits.maxIndicators);
    if (filtered.length !== marketState.indicators.length) {
      marketState.indicators = filtered;
      persistMarketState();
    }
  }
}
// ─────────────────────────────────────────────────────────────────────────────

function getPanelLayout() {
  const active = marketState.indicators.filter((k) => k in PANEL_HEIGHTS);
  if (!active.length) return { mainBottom: 0.02, positions: {} };

  const positions = {};
  let bottomCursor = 0.02;
  for (const key of [...active].reverse()) {
    const h = PANEL_HEIGHTS[key];
    positions[key] = { top: 1 - bottomCursor - h, bottom: bottomCursor };
    bottomCursor += h + PANEL_GAP;
  }
  return { mainBottom: Math.min(bottomCursor, 0.72), positions };
}

const defaultMarketState = {
  symbol: "TTWO",
  range: "1D",
  chartType: "candlestick",
  indicators: [],
  favorites: [],
  indicatorSettings: {},
  compareSymbols: []
};

const _IS_LOCAL = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
const _API_HOST = _IS_LOCAL
  ? "http://127.0.0.1:8000"
  : "https://blackportfolio-api-production.up.railway.app";
const API_BASE_URL = `${_API_HOST}/api`;
// Warm-up ping en producción para evitar cold-start delays en Railway
if (!_IS_LOCAL) fetch(`${_API_HOST}/health`).catch(() => {});

let marketState = getStoredMarketState();
let activeSection = "home";
let tvChart = null;
let mainSeries;
let indicatorSeries = [];
let vpPrimitive = null;
let gapsPrimitive = null;
let ichimokuCloudPrimitive = null;
let fiboPriceLines = [];
let lastCandles = [];
let lastHighs = [];
let lastLows = [];
let lastCloses = [];
let lastVolumes = [];
let computedIndicatorData = {};
let activeLegendSettingsKey = null;
let marketListenersAttached = false;
let marketInitialized = false;
let chartAbortController;
let suggestionAbortController;
let suggestionDebounce;
let lastSuggestions = [];
let _compareSeriesArr = [];
let _mktPriceTimer = null;
let _mktWlTimer = null;
let _mktOverviewTimer = null;
let _fngTimer = null;

function getSessionOrRedirect() {
  window.BlackPortfolioAuth.ensureDemoUser();
  const session = window.BlackPortfolioAuth.getSession();

  if (!session) {
    window.location.href = "login.html";
    throw new Error("Sesion no disponible");
  }

  return session;
}

function getStoredMarketState() {
  try {
    return {
      ...defaultMarketState,
      ...(JSON.parse(localStorage.getItem(marketStorageKey)) ?? {})
    };
  } catch {
    return { ...defaultMarketState };
  }
}

function persistMarketState() {
  localStorage.setItem(marketStorageKey, JSON.stringify(marketState));
}

function renderUser(session) {
  [sidebarUserName, sidebarUserPlan, topbarUserName, topbarPlan].forEach(el => el.classList.remove("is-skeleton"));
  sidebarUserName.textContent = session.fullName;
  sidebarUserPlan.textContent = session.selectedPlan;
  topbarUserName.textContent = session.fullName;
  topbarPlan.textContent = session.selectedPlan;
  settingsUser.textContent = session.fullName;
  settingsEmail.textContent = session.email;
  settingsPlan.textContent = session.selectedPlan;
  settingsType.textContent = session.isDemo ? "Demo" : "Registrado";
  const displayEl = document.getElementById("settingsUserDisplay");
  if (displayEl) displayEl.textContent = session.fullName;
}

function updateHeading(sectionId) {
  const sectionHeadings = {
    home: HOME_HEADING,
    tracker: "Portafolio Tracker",
    markowitz: "Creación de portafolio",
    topdown: "Análisis Top-Down",
    markets: "Mercados",
    analyzer: "Analizador de Activos",
    settings: "Ajustes"
  };

  mainHeading.textContent = sectionHeadings[sectionId] ?? "Centro de control";
}

function activateSection(sectionId) {
  document.getElementById("planUpgradeOverlay")?.remove();
  const navItem = document.querySelector(`.dashboard-nav-item[data-section="${sectionId}"]`);
  if (navItem?.dataset.locked === "1") {
    showUpgradeOverlay(sectionId);
    return;
  }

  // Save drawings and stop timers when leaving markets
  if (activeSection === "markets" && sectionId !== "markets") {
    if (drawingEngine && marketState.symbol) saveDrawingsForSymbol(marketState.symbol);
    stopMarketPriceRefresh();
    stopMarketWlRefresh();
    stopMarketOverviewRefresh();
  }

  activeSection = sectionId;
  updateHeading(sectionId);

  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.section === sectionId);
  });

  sections.forEach((section) => {
    section.classList.toggle("active", section.id === `section-${sectionId}`);
  });

  if (sectionId === "markets") {
    requestAnimationFrame(() => {
      resizeChart();
      initializeMarketModule();
      initDrawingEngine();
    });
  }

  if (sectionId === "tracker") {
    initializeTrackerModule();
    showTrackerListView();
  }

  if (sectionId === "markowitz") {
    if (typeof initMarkowitz === "function") initMarkowitz();
  }

  if (sectionId === "analyzer") {
    if (typeof AnalyzerModule !== "undefined") AnalyzerModule.init();
  }

  if (sectionId === "topdown") {
    if (typeof initTopDown === "function") initTopDown();
  }
}

function handleLogout() {
  window.BlackPortfolioAuth.stopSessionTimeout();
  window.BlackPortfolioAuth.clearSession();
  window.location.href = "login.html";
}

function normalizeSymbol(rawValue) {
  return rawValue.trim().toUpperCase();
}

function isISIN(query) {
  return /^[A-Z]{2}[A-Z0-9]{10}$/i.test(query.trim());
}

function describeMxISIN(isin) {
  const u = isin.toUpperCase();
  if (u.startsWith("MX0DI"))  return "CETES — Certificado de la Tesorería";
  if (u.startsWith("MX0MGO") || u.startsWith("MX0M5")) return "M-Bono — Tasa fija";
  if (u.startsWith("MX0MUD")) return "UDIBONO — Bono en UDIs";
  if (u.startsWith("MX0BPA")) return "BPAG — Tasa flotante (BPAG91)";
  if (u.startsWith("MX0MBD")) return "Bonde D";
  if (u.startsWith("MX0MBF")) return "Bonde F";
  if (u.startsWith("MX"))    return "Valor gubernamental mexicano";
  return "Ver detalles del bono";
}

function renderBanxicoBondInfo(data) {
  const palette = {
    CETES:   "#32d6a2", BONO: "#6f86ff", UDIBONO: "#f5b84c",
    BPAG:    "#39d0ff", BONDE_D: "#ff6b81", BONDE_F: "#9f7aea",
    MX_GOV:  "#8892a4",
  };
  const color = palette[data.type] || "#8892a4";

  const ratesHtml = (data.rates || []).map(r => {
    const raw = r.rate;
    const display = (raw === "N/D" || raw == null || raw === "")
      ? "—"
      : `${parseFloat(raw).toFixed(4)} %`;
    return `
      <div class="bond-row">
        <span class="bond-label">${r.label}</span>
        <span class="bond-value" style="color:${color};font-variant-numeric:tabular-nums">${display}</span>
      </div>`;
  }).join("");

  const lastDate = data.rates?.find(r => r.date)?.date || "";

  return `
    <div class="company-info-header">
      <div class="company-title-row"><h2>${data.description}</h2></div>
      <div class="bond-isin-badge" style="background:${color}20;color:${color};border-color:${color}40">${data.type}</div>
    </div>
    <div class="bond-row">
      <span class="bond-label">ISIN</span>
      <span class="bond-value" style="font-family:monospace;font-size:0.85em">${data.isin}</span>
    </div>
    ${lastDate ? `<div class="bond-row"><span class="bond-label">Última subasta</span><span class="bond-value">${lastDate}</span></div>` : ""}
    ${ratesHtml
      ? `<div style="margin-top:0.5rem">
           <div class="bond-label" style="font-size:0.7rem;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.35rem">Tasas — subasta primaria (Banxico SIE)</div>
           ${ratesHtml}
         </div>`
      : `<div class="company-info-error" style="margin-top:.75rem">Sin series disponibles para este tipo de instrumento.</div>`
    }`;
}

function updateIndicatorBadge() {
  const badge = document.getElementById("indicatorCount");
  if (!badge) return;
  const n = marketState.indicators.length;
  badge.textContent = n;
  badge.classList.toggle("hidden", n === 0);
}

function syncIndicatorRows() {
  document.querySelectorAll(".indicator-row[data-ind]").forEach((row) => {
    row.classList.toggle("active", marketState.indicators.includes(row.dataset.ind));
  });
  indicatorCheckboxes.forEach((cb) => { cb.checked = marketState.indicators.includes(cb.value); });
}

function renderMarketToolbar() {
  tickerInput.value = marketState.symbol;
  document.querySelectorAll("#rangeSegmented [data-range]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.range === marketState.range);
  });
  chartTypeButtonIcon.innerHTML = chartTypeIcons[marketState.chartType] ?? chartTypeIcons.candlestick;
  saveTickerButton.classList.toggle("active", marketState.favorites.includes(marketState.symbol));
  saveTickerButton.title = marketState.favorites.includes(marketState.symbol)
    ? "Quitar ticker guardado"
    : "Guardar ticker";
  syncIndicatorRows();
  updateIndicatorBadge();
}

function getAllMenus() {
  return document.querySelectorAll(".market-menu, .indicator-panel");
}

function openMenu(menuId) {
  getAllMenus().forEach((menu) => {
    menu.classList.toggle("hidden", menu.id !== menuId);
  });
  const backdrop = document.getElementById("indicatorBackdrop");
  if (backdrop) backdrop.classList.toggle("hidden", menuId !== "indicatorMenu");
}

function closeMenus() {
  getAllMenus().forEach((menu) => menu.classList.add("hidden"));
  const backdrop = document.getElementById("indicatorBackdrop");
  if (backdrop) backdrop.classList.add("hidden");
}

function showChartStatus(message, type = "info") {
  marketChartStatus.textContent = message;
  marketChartStatus.style.color = type === "error" ? "#ff8ca4" : "var(--muted)";
}

function showChartOverlay(message) {
  marketChartOverlayMsg.textContent = message;
  marketChartOverlay.classList.remove("hidden");
}

function hideChartOverlay() {
  marketChartOverlay.classList.add("hidden");
}

function formatPrice(value, currency) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: value >= 100 ? 2 : 4
  }).format(value);
}

function getYahooSearchUrl(query) {
  return `${API_BASE_URL}/search?q=${encodeURIComponent(query)}`;
}

function getYahooChartUrl(symbol, rangeConfig) {
  const { range, interval } = rangeConfig;
  return `${API_BASE_URL}/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
}

async function fetchSuggestions(query) {
  if (suggestionAbortController) {
    suggestionAbortController.abort();
  }

  suggestionAbortController = new AbortController();
  const response = await fetch(getYahooSearchUrl(query), {
    signal: suggestionAbortController.signal
  });

  if (!response.ok) {
    throw new Error("No fue posible consultar Yahoo Finance.");
  }

  const payload = await response.json();
  return (payload.quotes ?? [])
    .filter((quote) => quote.symbol && quote.isYahooFinance)
    .slice(0, 8)
    .map((quote) => ({
      symbol: quote.symbol,
      name: quote.longname || quote.shortname || "Activo sin nombre",
      exchange: quote.exchDisp || quote.exchange || "Mercado",
      type: quote.typeDisp || quote.quoteType || ""
    }));
}

const TWELVE_DATA_API_KEY = "03aab7a2aamsh5f6964b96339010p1ec652jsnbff2ece7211e";
const TWELVE_DATA_LOGO_BASE = "https://twelve-data1.p.rapidapi.com/logo";

async function fetchTickerLogo(symbol) {
  try {
    const res = await fetch(`${TWELVE_DATA_LOGO_BASE}?symbol=${encodeURIComponent(symbol)}`, {
      headers: {
        "x-rapidapi-host": "twelve-data1.p.rapidapi.com",
        "x-rapidapi-key": TWELVE_DATA_API_KEY
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.url || null;
  } catch { return null; }
}

function renderSuggestions(suggestions) {
  lastSuggestions = suggestions;

  if (!suggestions.length) {
    tickerSuggestions.innerHTML = "";
    tickerSuggestions.classList.add("hidden");
    return;
  }

  tickerSuggestions.innerHTML = suggestions
    .map(
      (item) => `
        <button class="ticker-suggestion-item" type="button" data-symbol="${item.symbol}"${item.type === "BOND" ? ` data-isin="${item.symbol}"` : ""}>
          <div class="ticker-logo-wrap">
            <div class="ticker-logo-fallback">${item.symbol.slice(0, 2)}</div>
            <img class="ticker-logo" alt="" data-logo-symbol="${item.symbol}">
          </div>
          <div class="ticker-info">
            <div class="ticker-symbol">${item.symbol}${item.type === "BOND" ? ' <span class="bond-badge">BONO</span>' : ""}</div>
            <div class="ticker-name">${item.name}</div>
          </div>
          <div class="ticker-exchange">${item.exchange}</div>
        </button>
      `
    )
    .join("");

  tickerSuggestions.classList.remove("hidden");

  tickerSuggestions.querySelectorAll("[data-symbol]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.isin) {
        renderSuggestions([]);
        loadBondInfo(button.dataset.isin);
      } else {
        selectTicker(button.dataset.symbol);
      }
    });
  });

  tickerSuggestions.querySelectorAll("img[data-logo-symbol]").forEach(async (img) => {
    const symbol = img.dataset.logoSymbol;
    const url = await fetchTickerLogo(symbol);
    if (!url || !img.isConnected) return;
    img.onload = () => {
      img.classList.add("loaded");
    };
    img.onerror = () => {
      img.remove();
    };
    img.src = url;
  });
}

function scheduleSuggestions() {
  const query = tickerInput.value.trim();

  if (suggestionDebounce) {
    window.clearTimeout(suggestionDebounce);
  }

  if (!query) {
    renderSuggestions([]);
    return;
  }

  if (isISIN(query)) {
    const isinUp = query.toUpperCase();
    renderSuggestions([{
      symbol: isinUp,
      name: describeMxISIN(isinUp),
      exchange: isinUp.startsWith("MX") ? "Banxico SIE" : "ISIN",
      type: "BOND"
    }]);
    return;
  }

  suggestionDebounce = window.setTimeout(async () => {
    try {
      const suggestions = await fetchSuggestions(query);
      renderSuggestions(suggestions);
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      renderSuggestions([]);
    }
  }, 220);
}

function selectTicker(symbol) {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) {
    return;
  }

  if (drawingEngine && marketState.symbol) {
    saveDrawingsForSymbol(marketState.symbol);
  }

  marketState.symbol = normalized;
  persistMarketState();
  renderMarketToolbar();
  renderSuggestions([]);

  document.querySelectorAll(".market-wl-item").forEach(row => {
    row.classList.toggle("active", row.dataset.sym === normalized);
  });
  document.querySelectorAll(".mkt-index-tile").forEach(tile => {
    tile.classList.toggle("active-tile", tile.dataset.sym === normalized);
  });

  if (companyInfoVisible) {
    loadCompanyInfo(normalized);
  }
  loadMarketChart();
  loadTickerNews(normalized);
}

async function loadTickerNews(symbol) {
  const section = document.getElementById("tickerNewsSection");
  const list = document.getElementById("tickerNewsList");
  const title = document.getElementById("tickerNewsTitle");
  if (!section || !list) return;

  list.innerHTML = "";
  title.textContent = `Noticias · ${symbol}`;
  section.classList.remove("hidden");

  const showEmpty = (msg) => {
    list.innerHTML = `<p class="ticker-news-empty">${msg}</p>`;
  };

  try {
    const res = await fetch(`${API_BASE_URL}/news/${encodeURIComponent(symbol)}`);
    if (!res.ok) { showEmpty(`No se pudieron cargar noticias para ${symbol}.`); return; }
    const { news } = await res.json();
    if (!news || news.length === 0) { showEmpty(`Sin noticias recientes para ${symbol}.`); return; }

    news.forEach(item => {
      const card = document.createElement("a");
      card.className = "news-card";
      card.href = item.article_url || "#";
      card.target = "_blank";
      card.rel = "noopener noreferrer";

      const img = item.article_photo_url
        ? `<img class="news-thumb" src="${item.article_photo_url}" alt="" loading="lazy" onerror="this.style.display='none'">`
        : "";
      const time = item.post_time_utc
        ? `<span class="news-time">${new Date(item.post_time_utc).toLocaleDateString("es-MX", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>`
        : "";

      card.innerHTML = `
        ${img}
        <div class="news-body">
          <span class="news-source">${item.source || ""}</span>
          <p class="news-headline">${item.article_title || ""}</p>
          ${time}
        </div>`;
      list.appendChild(card);
    });

  } catch (_) {
    showEmpty(`No se pudieron cargar noticias para ${symbol}.`);
  }
}

function toggleFavorite() {
  const favorites = new Set(marketState.favorites);
  if (favorites.has(marketState.symbol)) {
    favorites.delete(marketState.symbol);
  } else {
    favorites.add(marketState.symbol);
  }

  marketState.favorites = [...favorites];
  persistMarketState();
  renderMarketToolbar();
}

function ensureChart() {
  if (!window.LightweightCharts) {
    showChartStatus("No se pudo cargar la libreria del grafico.", "error");
    return false;
  }

  if (tvChart) {
    return true;
  }

  tvChart = window.LightweightCharts.createChart(marketChartContainer, {
    autoSize: true,
    layout: {
      background: { color: "#131722" },
      textColor: "#b2b5be",
      fontSize: 12,
      fontFamily: "'Inter', 'Trebuchet MS', sans-serif"
    },
    grid: {
      vertLines: { color: "rgba(42,46,57,0.8)", style: 0 },
      horzLines: { color: "rgba(42,46,57,0.8)", style: 0 }
    },
    crosshair: {
      mode: 1,
      vertLine: {
        color: "rgba(177,181,195,0.5)",
        width: 1,
        style: 1,
        labelBackgroundColor: "#2a2e39"
      },
      horzLine: {
        color: "rgba(177,181,195,0.5)",
        width: 1,
        style: 1,
        labelBackgroundColor: "#2a2e39"
      }
    },
    rightPriceScale: {
      borderColor: "rgba(42,46,57,1)",
      scaleMargins: { top: 0.1, bottom: 0.1 }
    },
    timeScale: {
      borderColor: "rgba(42,46,57,1)",
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 5,
      barSpacing: 6,
      minBarSpacing: 2
    },
    handleScroll: { mouseWheel: true, pressedMouseMove: true },
    handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true }
  });

  tvChart.subscribeCrosshairMove(handleCrosshairMove);

  return true;
}

function handleCrosshairMove(param) {
  const ohlcEl = document.getElementById("crosshairOhlc");
  if (!param || !param.time || !lastCandles.length) {
    if (ohlcEl) ohlcEl.innerHTML = "";
    renderIndicatorLegend();
    return;
  }
  const candle = lastCandles.find(c => c.time === param.time);
  if (candle && ohlcEl) {
    const isUp = candle.close >= candle.open;
    const cls = isUp ? "pos" : "neg";
    const vol = lastVolumes.find(v => v.time === param.time)?.value;
    ohlcEl.innerHTML =
      `<span>O <b class="${cls}">${fmtVal(candle.open)}</b></span>` +
      `<span>H <b class="${cls}">${fmtVal(candle.high)}</b></span>` +
      `<span>L <b class="${cls}">${fmtVal(candle.low)}</b></span>` +
      `<span>C <b class="${cls}">${fmtVal(candle.close)}</b></span>` +
      (vol != null ? `<span>Vol <b>${formatCompactNumber(vol)}</b></span>` : "");
  }
  renderIndicatorLegend(param.time);
}

function formatCompactNumber(n) {
  if (!isFinite(n)) return "—";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return String(n);
}

function resizeChart() {
  if (!tvChart) {
    return;
  }
  tvChart.applyOptions({ autoSize: true });
}

// ── Volume Profile Plugin ────────────────────────────────────────────────────
class VolumeProfileRenderer {
  constructor() { this._data = null; }
  setData(data) { this._data = data; }
  draw(target) {
    if (!this._data) return;
    const { bins, series, opts } = this._data;
    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      const maxW = mediaSize.width * opts.barWidth;
      bins.forEach((bin) => {
        const y1 = series.priceToCoordinate(bin.priceTop);
        const y2 = series.priceToCoordinate(bin.priceBot);
        if (y1 === null || y2 === null) return;
        const top = Math.min(y1, y2);
        const h = Math.max(Math.abs(y2 - y1), 1);
        const w = Math.max(1, Math.round(bin.fraction * maxW));
        ctx.fillStyle = bin.isPOC ? opts.pocColor : opts.barColor;
        ctx.fillRect(0, top, w, h);
        if (bin.isPOC) {
          ctx.strokeStyle = opts.pocColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(w, top + h / 2);
          ctx.lineTo(maxW * 1.05, top + h / 2);
          ctx.stroke();
        }
      });
    });
  }
}

class VolumeProfilePaneView {
  constructor() { this._renderer = new VolumeProfileRenderer(); }
  renderer() { return this._renderer; }
  zOrder() { return "bottom"; }
  update(data) { this._renderer.setData(data); }
}

class VolumeProfilePlugin {
  constructor(candles, volumes, options = {}) {
    this._candles = candles;
    this._volumes = volumes;
    this._opts = {
      bins: 52,
      barWidth: 0.26,
      barColor: "rgba(111,134,255,0.28)",
      pocColor: "rgba(50,214,162,0.75)",
      ...options
    };
    this._series = null;
    this._paneView = new VolumeProfilePaneView();
  }
  attached({ series }) { this._series = series; this._build(); }
  detached() { this._series = null; this._paneView.update(null); }
  updateAllViews() { this._build(); }
  paneViews() { return [this._paneView]; }
  _build() {
    if (!this._series || !this._candles.length) return;
    const N = this._opts.bins;
    let lo = Infinity, hi = -Infinity;
    this._candles.forEach((c) => { if (c.low < lo) lo = c.low; if (c.high > hi) hi = c.high; });
    const step = (hi - lo) / N;
    if (step <= 0) return;
    const volMap = new Map(this._volumes.map((v) => [v.time, v.value]));
    const buckets = new Array(N).fill(0);
    this._candles.forEach((c) => {
      const vol = volMap.get(c.time) || 0;
      if (!vol) return;
      const bLo = Math.max(0, Math.floor((c.low - lo) / step));
      const bHi = Math.min(N - 1, Math.floor((c.high - lo) / step));
      const spread = bHi - bLo + 1;
      for (let b = bLo; b <= bHi; b++) buckets[b] += vol / spread;
    });
    const maxVol = Math.max(...buckets);
    const pocIdx = buckets.indexOf(maxVol);
    const bins = buckets.map((vol, i) => ({
      priceBot: lo + i * step,
      priceTop: lo + (i + 1) * step,
      fraction: maxVol > 0 ? vol / maxVol : 0,
      isPOC: i === pocIdx
    }));
    this._paneView.update({ bins, series: this._series, opts: this._opts });
  }
}
class GapsRenderer {
  constructor() { this._data = null; }
  setData(data) { this._data = data; }
  draw(target) {
    if (!this._data || !this._data.gaps.length) return;
    const { gaps, series, opts } = this._data;
    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      gaps.forEach((gap) => {
        const y1 = series.priceToCoordinate(gap.priceTop);
        const y2 = series.priceToCoordinate(gap.priceBottom);
        if (y1 === null || y2 === null) return;
        const x1 = tvChart.timeScale().timeToCoordinate(gap.startTime);
        if (x1 === null) return;
        const x2 = gap.isOpen ? mediaSize.width : tvChart.timeScale().timeToCoordinate(gap.endTime);
        if (x2 === null) return;
        const top = Math.min(y1, y2);
        const h = Math.max(Math.abs(y2 - y1), 1);
        const left = Math.max(0, x1);
        const width = Math.max(1, (x2 ?? mediaSize.width) - left);
        const isUp = gap.type === "up";
        ctx.fillStyle = isUp ? opts.upFill : opts.downFill;
        ctx.strokeStyle = isUp ? opts.upBorder : opts.downBorder;
        ctx.lineWidth = 1;
        ctx.fillRect(left, top, width, h);
        ctx.strokeRect(left + 0.5, top + 0.5, width - 1, h - 1);
      });
    });
  }
}

class GapsPaneView {
  constructor() { this._renderer = new GapsRenderer(); }
  renderer() { return this._renderer; }
  zOrder() { return "bottom"; }
  update(data) { this._renderer.setData(data); }
}

class GapsPrimitive {
  constructor(candles, options = {}) {
    this._candles = candles;
    this._opts = {
      upBorder: "rgba(0,200,148,0.9)", upFill: "rgba(0,200,148,0.14)",
      downBorder: "rgba(255,77,106,0.9)", downFill: "rgba(255,77,106,0.14)",
      maxGaps: 15, minDevFraction: 0.30,
      ...options
    };
    this._series = null;
    this._paneView = new GapsPaneView();
  }
  attached({ series }) { this._series = series; this._build(); }
  detached() { this._series = null; this._paneView.update(null); }
  updateAllViews() { this._build(); }
  paneViews() { return [this._paneView]; }
  _build() {
    if (!this._series || !this._candles.length) return;
    const candles = this._candles;
    const n = candles.length;
    const lookback = Math.min(14, n);
    const avgHL = candles.slice(-lookback).reduce((s, c) => s + (c.high - c.low), 0) / lookback;
    const minDev = this._opts.minDevFraction * avgHL;

    const rawGaps = [];
    for (let i = 1; i < n; i++) {
      const cur = candles[i], prev = candles[i - 1];
      if (cur.low > prev.high && cur.low - prev.high >= minDev) {
        rawGaps.push({ type: "up", priceTop: cur.low, priceBottom: prev.high, startTime: cur.time, startIdx: i });
      } else if (cur.high < prev.low && prev.low - cur.high >= minDev) {
        rawGaps.push({ type: "down", priceTop: prev.low, priceBottom: cur.high, startTime: cur.time, startIdx: i });
      }
    }

    const limited = rawGaps.slice(-this._opts.maxGaps);
    const processed = limited.map((gap) => {
      for (let i = gap.startIdx + 1; i < n; i++) {
        const c = candles[i];
        if (gap.type === "up" && c.low <= gap.priceBottom) {
          return { ...gap, endTime: candles[i].time, isOpen: false };
        }
        if (gap.type === "down" && c.high >= gap.priceTop) {
          return { ...gap, endTime: candles[i].time, isOpen: false };
        }
      }
      return { ...gap, endTime: candles[n - 1].time, isOpen: true };
    });

    this._paneView.update({ gaps: processed, series: this._series, opts: this._opts });
  }
}
// ─────────────────────────────────────────────────────────────────────────────

function clearIndicatorSeries() {
  if (tvChart) {
    indicatorSeries.forEach((series) => tvChart.removeSeries(series));
    if (vpPrimitive && mainSeries) {
      try { mainSeries.detachPrimitive(vpPrimitive); } catch (_) {}
      vpPrimitive = null;
    }
    if (gapsPrimitive && mainSeries) {
      try { mainSeries.detachPrimitive(gapsPrimitive); } catch (_) {}
      gapsPrimitive = null;
    }
    if (ichimokuCloudPrimitive && mainSeries) {
      try { mainSeries.detachPrimitive(ichimokuCloudPrimitive); } catch (_) {}
      ichimokuCloudPrimitive = null;
    }
    if (fiboPriceLines.length && mainSeries) {
      fiboPriceLines.forEach((pl) => { try { mainSeries.removePriceLine(pl); } catch (_) {} });
    }
  }
  indicatorSeries = [];
  fiboPriceLines = [];
}

function computeVolumeHeatmap(candles, volumes, period = 20) {
  const volMap = new Map(volumes.map(v => [v.time, v.value]));
  const volArr = candles.map(c => volMap.get(c.time) ?? 0);

  const lv1 = 1.2, lv2 = 2.0, lv3 = 3.0, lv4 = 4.5;
  const bullR = 8,  bullG = 153, bullB = 129;
  const bearR = 242, bearG = 54,  bearB = 69;

  return candles.map((c, i) => {
    const start = Math.max(0, i - period + 1);
    const slice = volArr.slice(start, i + 1);
    const avgVol = slice.reduce((a, b) => a + b, 0) / slice.length;
    const ratio  = avgVol > 0 ? volArr[i] / avgVol : 0;

    const isBull = c.close >= c.open;
    const r = isBull ? bullR : bearR;
    const g = isBull ? bullG : bearG;
    const b = isBull ? bullB : bearB;

    let br, alpha;
    if      (ratio >= lv4) { br = 0.40; alpha = 1; }
    else if (ratio >= lv3) { br = 0.70; alpha = 1; }
    else if (ratio >= lv2) { br = 1;    alpha = 1; }
    else if (ratio >= lv1) { br = 1;    alpha = 0.70; }
    else                   { br = 1;    alpha = 0.25; }

    const color = `rgba(${Math.round(r*br)},${Math.round(g*br)},${Math.round(b*br)},${alpha})`;
    return { ...c, color, wickColor: color, borderColor: color };
  });
}

function buildMainSeries() {
  if (mainSeries) {
    tvChart.removeSeries(mainSeries);
    mainSeries = null;
  }

  clearIndicatorSeries();

  if (marketState.chartType === "volheatmap") {
    mainSeries = tvChart.addCandlestickSeries({
      upColor: "#089981",
      downColor: "#f23445",
      wickUpColor: "#089981",
      wickDownColor: "#f23445",
      borderVisible: false
    });
    return;
  }

  if (marketState.chartType === "line") {
    mainSeries = tvChart.addLineSeries({
      color: "#6f86ff",
      lineWidth: 2,
      priceLineColor: "#6f86ff"
    });
    return;
  }

  if (marketState.chartType === "area") {
    mainSeries = tvChart.addAreaSeries({
      lineColor: "#39d0ff",
      topColor: "rgba(57, 208, 255, 0.28)",
      bottomColor: "rgba(57, 208, 255, 0.03)",
      priceLineColor: "#39d0ff"
    });
    return;
  }

  if (marketState.chartType === "bars") {
    mainSeries = tvChart.addBarSeries({
      upColor: "#32d6a2",
      downColor: "#ff6b81"
    });
    return;
  }

  mainSeries = tvChart.addCandlestickSeries({
    upColor: "#32d6a2",
    downColor: "#ff6b81",
    wickUpColor: "#32d6a2",
    wickDownColor: "#ff6b81",
    borderVisible: false
  });
}

function computeSMA(data, period) {
  const result = [];
  let rollingSum = 0;

  for (let index = 0; index < data.length; index += 1) {
    rollingSum += data[index].value;

    if (index >= period) {
      rollingSum -= data[index - period].value;
    }

    if (index >= period - 1) {
      result.push({
        time: data[index].time,
        value: rollingSum / period
      });
    }
  }

  return result;
}

function computeEMA(data, period) {
  const result = [];
  const multiplier = 2 / (period + 1);
  let emaValue = data[0]?.value;

  data.forEach((point, index) => {
    if (index === 0) {
      emaValue = point.value;
    } else {
      emaValue = (point.value - emaValue) * multiplier + emaValue;
    }

    result.push({
      time: point.time,
      value: emaValue
    });
  });

  return result;
}

function computeRSI(closes, period = 14) {
  const result = [];
  if (closes.length < period + 1) return result;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i].value - closes[i - 1].value;
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < closes.length; i++) {
    if (i > period) {
      const diff = closes[i].value - closes[i - 1].value;
      avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    }
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    result.push({ time: closes[i].time, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + rs) });
  }
  return result;
}

function computeMACD(closes) {
  if (closes.length < 35) return { macdLine: [], signalLine: [], histogram: [] };

  const fast = computeEMA(closes, 12);
  const slow = computeEMA(closes, 26);
  const WARMUP = 25;

  const macdRaw = fast.slice(WARMUP).map((p, i) => ({
    time: p.time,
    value: p.value - slow[WARMUP + i].value
  }));

  const signalRaw = computeEMA(macdRaw, 9);
  const SIG_WARMUP = 8;
  const signalLine = signalRaw.slice(SIG_WARMUP);
  const macdLine = macdRaw.slice(SIG_WARMUP);
  const histogram = macdLine.map((p, i) => ({ time: p.time, value: p.value - signalLine[i].value }));

  return { macdLine, signalLine, histogram };
}

function computeWMA(data, period) {
  const result = [];
  const denom = period * (period + 1) / 2;
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - (period - 1 - j)].value * (j + 1);
    result.push({ time: data[i].time, value: sum / denom });
  }
  return result;
}

function computeBB(data, period, mult) {
  const upper = [], mid = [], lower = [];
  const sma = computeSMA(data, period);
  sma.forEach((pt, i) => {
    const slice = data.slice(i, i + period).map(d => d.value);
    const mean = pt.value;
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper.push({ time: pt.time, value: mean + mult * sd });
    mid.push({ time: pt.time, value: mean });
    lower.push({ time: pt.time, value: mean - mult * sd });
  });
  return { upper, mid, lower };
}

function computeVWAP(candles, volumes) {
  const result = [];
  let cumTPV = 0, cumVol = 0;
  candles.forEach((c, i) => {
    const vol = volumes[i]?.value ?? 0;
    const tp = (c.high + c.low + c.close) / 3;
    cumTPV += tp * vol;
    cumVol += vol;
    result.push({ time: c.time, value: cumVol > 0 ? cumTPV / cumVol : tp });
  });
  return result;
}

function computeStoch(highs, lows, closes, k = 14, d = 3, smooth = 3) {
  const fastK = [];
  for (let i = k - 1; i < closes.length; i++) {
    const hs = highs.slice(i - k + 1, i + 1).map(v => v.value);
    const ls = lows.slice(i - k + 1, i + 1).map(v => v.value);
    const hh = Math.max(...hs), ll = Math.min(...ls);
    const range = hh - ll;
    fastK.push({ time: closes[i].time, value: range === 0 ? 50 : (closes[i].value - ll) / range * 100 });
  }
  const slowK = computeSMA(fastK, smooth);
  const slowD = computeSMA(slowK, d);
  return { k: slowK, d: slowD };
}

function computePSAR(candles, step = 0.02, maxAf = 0.2) {
  if (candles.length < 2) return [];
  const result = [];
  let trend = candles[1].close >= candles[0].close ? 1 : -1;
  let af = step;
  let ep = trend === 1 ? candles[0].high : candles[0].low;
  let sar = trend === 1 ? candles[0].low : candles[0].high;
  result.push({ time: candles[0].time, value: sar, trend });

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    sar = sar + af * (ep - sar);
    if (trend === 1) {
      const prevLow = candles[i - 1].low;
      const prevPrevLow = i >= 2 ? candles[i - 2].low : prevLow;
      sar = Math.min(sar, prevLow, prevPrevLow);
      if (c.low < sar) {
        trend = -1; sar = ep; ep = c.low; af = step;
      } else if (c.high > ep) {
        ep = c.high; af = Math.min(af + step, maxAf);
      }
    } else {
      const prevHigh = candles[i - 1].high;
      const prevPrevHigh = i >= 2 ? candles[i - 2].high : prevHigh;
      sar = Math.max(sar, prevHigh, prevPrevHigh);
      if (c.high > sar) {
        trend = 1; sar = ep; ep = c.high; af = step;
      } else if (c.low < ep) {
        ep = c.low; af = Math.min(af + step, maxAf);
      }
    }
    result.push({ time: c.time, value: sar, trend });
  }
  return result;
}

function computeAutoFibExtension(candles, lookback = 60) {
  const n = candles.length;
  if (n < 5) return null;
  const start = Math.max(0, n - lookback);
  const slice = candles.slice(start);
  let hiIdx = 0, loIdx = 0;
  for (let i = 1; i < slice.length; i++) {
    if (slice[i].high > slice[hiIdx].high) hiIdx = i;
    if (slice[i].low  < slice[loIdx].low)  loIdx = i;
  }
  const hi = slice[hiIdx].high;
  const lo = slice[loIdx].low;
  if (hi === lo) return null;
  const direction = hiIdx > loIdx ? "up" : "down";
  const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.618, 2, 2.618];
  const levels = ratios.map((r) => {
    const price = direction === "up" ? lo + (hi - lo) * r : hi - (hi - lo) * r;
    return { ratio: r, price };
  });
  return { direction, hi, lo, levels };
}

function computeATR(highs, lows, closes, period = 14) {
  const trs = [];
  for (let i = 1; i < closes.length; i++) {
    const h = highs[i].value, l = lows[i].value, pc = closes[i - 1].value;
    trs.push({ time: closes[i].time, value: Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)) });
  }
  return computeEMA(trs, period);
}

function computeCCI(highs, lows, closes, period = 20) {
  const result = [];
  const tps = closes.map((c, i) => ({ time: c.time, value: (highs[i].value + lows[i].value + c.value) / 3 }));
  for (let i = period - 1; i < tps.length; i++) {
    const slice = tps.slice(i - period + 1, i + 1).map(t => t.value);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const md = slice.reduce((a, b) => a + Math.abs(b - mean), 0) / period;
    result.push({ time: tps[i].time, value: md === 0 ? 0 : (tps[i].value - mean) / (0.015 * md) });
  }
  return result;
}

function computeADX(highs, lows, closes, period = 14) {
  const n = closes.length;
  if (n < period + 1) return { adx: [], plusDi: [], minusDi: [] };
  const trs = [], plusDms = [], minusDms = [];
  for (let i = 1; i < n; i++) {
    const h = highs[i].value, l = lows[i].value, ph = highs[i - 1].value, pl = lows[i - 1].value, pc = closes[i - 1].value;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    const upMove = h - ph, downMove = pl - l;
    plusDms.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDms.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }
  const smooth = (arr) => {
    const out = [];
    let sum = arr.slice(0, period).reduce((a, b) => a + b, 0);
    out.push(sum);
    for (let i = period; i < arr.length; i++) {
      sum = sum - sum / period + arr[i];
      out.push(sum);
    }
    return out;
  };
  const trSm = smooth(trs), plusSm = smooth(plusDms), minusSm = smooth(minusDms);
  const plusDi = [], minusDi = [], dx = [];
  for (let i = 0; i < trSm.length; i++) {
    const time = closes[i + period].time;
    const pDi = trSm[i] === 0 ? 0 : (plusSm[i] / trSm[i]) * 100;
    const mDi = trSm[i] === 0 ? 0 : (minusSm[i] / trSm[i]) * 100;
    plusDi.push({ time, value: pDi });
    minusDi.push({ time, value: mDi });
    const sum = pDi + mDi;
    dx.push({ time, value: sum === 0 ? 0 : Math.abs(pDi - mDi) / sum * 100 });
  }
  const adx = computeSMA(dx, period);
  return { adx, plusDi, minusDi };
}

function computeOBV(closes, volumes) {
  const result = [];
  let obv = 0;
  closes.forEach((c, i) => {
    if (i > 0) {
      const vol = volumes[i]?.value ?? 0;
      if (c.value > closes[i - 1].value) obv += vol;
      else if (c.value < closes[i - 1].value) obv -= vol;
    }
    result.push({ time: c.time, value: obv });
  });
  return result;
}

function computeMFI(highs, lows, closes, volumes, period = 14) {
  const n = closes.length;
  const tps = closes.map((c, i) => (highs[i].value + lows[i].value + c.value) / 3);
  const result = [];
  for (let i = period; i < n; i++) {
    let posFlow = 0, negFlow = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const vol = volumes[j]?.value ?? 0;
      const flow = tps[j] * vol;
      if (tps[j] > tps[j - 1]) posFlow += flow;
      else if (tps[j] < tps[j - 1]) negFlow += flow;
    }
    const mr = negFlow === 0 ? 100 : posFlow / negFlow;
    result.push({ time: closes[i].time, value: negFlow === 0 ? 100 : 100 - 100 / (1 + mr) });
  }
  return result;
}

function computeWilliamsR(highs, lows, closes, period = 14) {
  const result = [];
  for (let i = period - 1; i < closes.length; i++) {
    const hs = highs.slice(i - period + 1, i + 1).map(v => v.value);
    const ls = lows.slice(i - period + 1, i + 1).map(v => v.value);
    const hh = Math.max(...hs), ll = Math.min(...ls);
    const range = hh - ll;
    result.push({ time: closes[i].time, value: range === 0 ? -50 : ((hh - closes[i].value) / range) * -100 });
  }
  return result;
}

function computeROC(closes, period = 12) {
  const result = [];
  for (let i = period; i < closes.length; i++) {
    const prev = closes[i - period].value;
    result.push({ time: closes[i].time, value: prev === 0 ? 0 : ((closes[i].value - prev) / prev) * 100 });
  }
  return result;
}

function computeSuperTrend(candles, period = 10, mult = 3) {
  const n = candles.length;
  if (n < period + 1) return [];
  const closesArr = candles.map(c => ({ time: c.time, value: c.close }));
  const highsArr = candles.map(c => ({ time: c.time, value: c.high }));
  const lowsArr = candles.map(c => ({ time: c.time, value: c.low }));
  const atr = computeATR(highsArr, lowsArr, closesArr, period);
  const atrMap = new Map(atr.map(p => [p.time, p.value]));
  const result = [];
  let prevUpperBand = null, prevLowerBand = null, prevSt = null, trend = 1;
  for (let i = 0; i < n; i++) {
    const c = candles[i];
    const a = atrMap.get(c.time);
    if (a === undefined) continue;
    const mid = (c.high + c.low) / 2;
    let upperBand = mid + mult * a;
    let lowerBand = mid - mult * a;
    if (prevUpperBand !== null) {
      upperBand = (upperBand < prevUpperBand || candles[i - 1].close > prevUpperBand) ? upperBand : prevUpperBand;
      lowerBand = (lowerBand > prevLowerBand || candles[i - 1].close < prevLowerBand) ? lowerBand : prevLowerBand;
    }
    if (prevSt === null) {
      trend = c.close <= upperBand ? -1 : 1;
    } else if (trend === 1 && c.close < lowerBand) {
      trend = -1;
    } else if (trend === -1 && c.close > upperBand) {
      trend = 1;
    }
    const value = trend === 1 ? lowerBand : upperBand;
    result.push({ time: c.time, value, trend });
    prevUpperBand = upperBand; prevLowerBand = lowerBand; prevSt = value;
  }
  return result;
}

function computeIchimoku(candles, tenkanP = 9, kijunP = 26, senkouP = 52) {
  const n = candles.length;
  const donchian = (period, idx) => {
    const start = Math.max(0, idx - period + 1);
    const slice = candles.slice(start, idx + 1);
    if (!slice.length) return null;
    const hh = Math.max(...slice.map(c => c.high));
    const ll = Math.min(...slice.map(c => c.low));
    return (hh + ll) / 2;
  };
  const tenkan = [], kijun = [], spanA = [], spanB = [], chikou = [];
  for (let i = 0; i < n; i++) {
    const t = donchian(tenkanP, i);
    const k = donchian(kijunP, i);
    if (t !== null && i >= tenkanP - 1) tenkan.push({ time: candles[i].time, value: t });
    if (k !== null && i >= kijunP - 1) kijun.push({ time: candles[i].time, value: k });
  }
  const tenkanMap = new Map(tenkan.map(p => [p.time, p.value]));
  const kijunMap = new Map(kijun.map(p => [p.time, p.value]));
  for (let i = 0; i < n; i++) {
    const t = tenkanMap.get(candles[i].time);
    const k = kijunMap.get(candles[i].time);
    if (t !== undefined && k !== undefined) {
      const shiftIdx = i + kijunP;
      const futureTime = shiftIdx < n ? candles[shiftIdx].time : candles[i].time + (kijunP * 86400);
      spanA.push({ time: futureTime, value: (t + k) / 2 });
    }
    const sb = donchian(senkouP, i);
    if (sb !== null && i >= senkouP - 1) {
      const shiftIdx = i + kijunP;
      const futureTime = shiftIdx < n ? candles[shiftIdx].time : candles[i].time + (kijunP * 86400);
      spanB.push({ time: futureTime, value: sb });
    }
    if (i >= kijunP) chikou.push({ time: candles[i - kijunP].time, value: candles[i].close });
  }
  return { tenkan, kijun, spanA, spanB, chikou };
}

function computePivotPoints(candles) {
  if (candles.length < 2) return [];
  const result = [];
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const pp = (prev.high + prev.low + prev.close) / 3;
    const r1 = 2 * pp - prev.low, s1 = 2 * pp - prev.high;
    const r2 = pp + (prev.high - prev.low), s2 = pp - (prev.high - prev.low);
    result.push({ time: candles[i].time, pp, r1, r2, s1, s2 });
  }
  return result;
}

function addPanelLineSeries(scaleId, pos, opts) {
  const s = tvChart.addLineSeries({ priceScaleId: scaleId, priceLineVisible: false, lastValueVisible: false, ...opts });
  s.priceScale().applyOptions({ scaleMargins: pos, borderVisible: false });
  indicatorSeries.push(s);
  return s;
}

function renderVolumePanel(volumeData, pos) {
  if (!volumeData.length) return;
  const s = tvChart.addHistogramSeries({
    priceScaleId: "vol",
    priceFormat: { type: "volume" },
    color: "rgba(111,134,255,0.45)",
    priceLineVisible: false,
    lastValueVisible: false
  });
  s.priceScale().applyOptions({ scaleMargins: pos, borderVisible: false });
  s.setData(volumeData);
  indicatorSeries.push(s);
}

function computeMomentum(closes, period = 10) {
  const result = [];
  for (let i = period; i < closes.length; i++) {
    result.push({ time: closes[i].time, value: closes[i].value - closes[i - period].value });
  }
  return result;
}

function renderMomentumPanel(closes, pos) {
  const cfg = getIndicatorCfg("momentum");
  const period = cfg.period ?? 10;
  const data = computeMomentum(closes, period);
  if (!data.length) return;
  const color = cfg.color ?? "#c084fc";

  // Coloring: positive = bullish, negative = bearish
  const hist = tvChart.addHistogramSeries({ priceScaleId: "momentum", priceLineVisible: false, lastValueVisible: true,
    color });
  hist.priceScale().applyOptions({ scaleMargins: pos, borderVisible: false });
  hist.setData(data.map(p => ({ time: p.time, value: p.value,
    color: p.value >= 0 ? "rgba(0,200,148,0.7)" : "rgba(255,77,106,0.7)" })));
  indicatorSeries.push(hist);

  // Zero line
  addPanelLineSeries("momentum", pos, { color: "rgba(255,255,255,0.15)", lineWidth: 1 })
    .setData(data.map(p => ({ time: p.time, value: 0 })));

  computedIndicatorData.momentum = data;
}

function renderRSIPanel(closes, pos) {
  const cfg = getIndicatorCfg("rsi");
  const period = cfg.period ?? 14;
  const data = computeRSI(closes, period);
  if (!data.length) return;
  const color = cfg.color ?? "#f5b84c";
  addPanelLineSeries("rsi", pos, { color, lineWidth: 1.5, lastValueVisible: true }).setData(data);
  addPanelLineSeries("rsi", pos, { color: "rgba(255,107,129,0.45)", lineWidth: 1, lineStyle: 2 })
    .setData(data.map((p) => ({ time: p.time, value: 70 })));
  addPanelLineSeries("rsi", pos, { color: "rgba(50,214,162,0.45)", lineWidth: 1, lineStyle: 2 })
    .setData(data.map((p) => ({ time: p.time, value: 30 })));
  computedIndicatorData.rsi = data;
}

function renderMACDPanel(closes, pos, cfg) {
  const { macdLine, signalLine, histogram } = computeMACD(closes);
  if (!macdLine.length) return;
  const c = cfg.colors || indicatorDefinitions.macd.colors;
  const hist = tvChart.addHistogramSeries({ priceScaleId: "macd", priceLineVisible: false, lastValueVisible: false });
  hist.priceScale().applyOptions({ scaleMargins: pos, borderVisible: false });
  hist.setData(histogram.map(p => ({ time: p.time, value: p.value, color: p.value >= 0 ? c.histUp + "88" : c.histDown + "88" })));
  indicatorSeries.push(hist);
  addPanelLineSeries("macd", pos, { color: c.macd, lineWidth: 1.5, lastValueVisible: true }).setData(macdLine);
  addPanelLineSeries("macd", pos, { color: c.signal, lineWidth: 1 }).setData(signalLine);
  computedIndicatorData.macd = { macdLine, signalLine, histogram };
}

function renderStochPanel(highs, lows, closes, pos, cfg) {
  const kPeriod = cfg.k ?? 14, dPeriod = cfg.d ?? 3, smooth = cfg.smooth ?? 3;
  const { k, d } = computeStoch(highs, lows, closes, kPeriod, dPeriod, smooth);
  if (!k.length) return;
  const c = cfg.colors || indicatorDefinitions.stoch.colors;
  addPanelLineSeries("stoch", pos, { color: c.k, lineWidth: 1.5, lastValueVisible: true }).setData(k);
  addPanelLineSeries("stoch", pos, { color: c.d, lineWidth: 1 }).setData(d);
  computedIndicatorData.stoch = { k, d };
}

function renderCCIPanel(highs, lows, closes, pos, cfg) {
  const period = cfg.period ?? 20;
  const data = computeCCI(highs, lows, closes, period);
  if (!data.length) return;
  const color = cfg.color ?? indicatorDefinitions.cci.color;
  addPanelLineSeries("cci", pos, { color, lineWidth: 1.5, lastValueVisible: true }).setData(data);
  // Zero line
  addPanelLineSeries("cci", pos, { color: "rgba(255,255,255,0.12)", lineWidth: 1 }).setData(data.map(p => ({ time: p.time, value: 0 })));
  // OB/OS levels
  addPanelLineSeries("cci", pos, { color: "rgba(255,77,106,0.3)", lineWidth: 1, lineStyle: 1 }).setData(data.map(p => ({ time: p.time, value: 100 })));
  addPanelLineSeries("cci", pos, { color: "rgba(0,200,148,0.3)", lineWidth: 1, lineStyle: 1 }).setData(data.map(p => ({ time: p.time, value: -100 })));
  computedIndicatorData.cci = data;
}

function renderATRPanel(highs, lows, closes, pos, cfg) {
  const period = cfg.period ?? 14;
  const data = computeATR(highs, lows, closes, period);
  if (!data.length) return;
  const color = cfg.color ?? indicatorDefinitions.atr.color;
  addPanelLineSeries("atr", pos, { color, lineWidth: 1.5, lastValueVisible: true }).setData(data);
  computedIndicatorData.atr = data;
}

function renderADXPanel(highs, lows, closes, pos, cfg) {
  const period = cfg.period ?? 14;
  const { adx, plusDi, minusDi } = computeADX(highs, lows, closes, period);
  if (!adx.length) return;
  const c = cfg.colors || indicatorDefinitions.adx.colors;
  addPanelLineSeries("adx", pos, { color: c.adx, lineWidth: 1.5, lastValueVisible: true }).setData(adx);
  addPanelLineSeries("adx", pos, { color: c.plusDi, lineWidth: 1 }).setData(plusDi);
  addPanelLineSeries("adx", pos, { color: c.minusDi, lineWidth: 1 }).setData(minusDi);
  computedIndicatorData.adx = { adx, plusDi, minusDi };
}

function renderOBVPanel(closes, volumes, pos, cfg) {
  const data = computeOBV(closes, volumes);
  if (!data.length) return;
  const color = cfg.color ?? indicatorDefinitions.obv.color;
  addPanelLineSeries("obv", pos, { color, lineWidth: 1.5, lastValueVisible: true }).setData(data);
  computedIndicatorData.obv = data;
}

function renderMFIPanel(highs, lows, closes, volumes, pos, cfg) {
  const period = cfg.period ?? 14;
  const data = computeMFI(highs, lows, closes, volumes, period);
  if (!data.length) return;
  const color = cfg.color ?? indicatorDefinitions.mfi.color;
  addPanelLineSeries("mfi", pos, { color, lineWidth: 1.5, lastValueVisible: true }).setData(data);
  addPanelLineSeries("mfi", pos, { color: "rgba(255,107,129,0.45)", lineWidth: 1, lineStyle: 2 })
    .setData(data.map(p => ({ time: p.time, value: 80 })));
  addPanelLineSeries("mfi", pos, { color: "rgba(50,214,162,0.45)", lineWidth: 1, lineStyle: 2 })
    .setData(data.map(p => ({ time: p.time, value: 20 })));
  computedIndicatorData.mfi = data;
}

function renderWillRPanel(highs, lows, closes, pos, cfg) {
  const period = cfg.period ?? 14;
  const data = computeWilliamsR(highs, lows, closes, period);
  if (!data.length) return;
  const color = cfg.color ?? indicatorDefinitions.willr.color;
  addPanelLineSeries("willr", pos, { color, lineWidth: 1.5, lastValueVisible: true }).setData(data);
  addPanelLineSeries("willr", pos, { color: "rgba(255,107,129,0.45)", lineWidth: 1, lineStyle: 2 })
    .setData(data.map(p => ({ time: p.time, value: -20 })));
  addPanelLineSeries("willr", pos, { color: "rgba(50,214,162,0.45)", lineWidth: 1, lineStyle: 2 })
    .setData(data.map(p => ({ time: p.time, value: -80 })));
  computedIndicatorData.willr = data;
}

function renderROCPanel(closes, pos, cfg) {
  const period = cfg.period ?? 12;
  const data = computeROC(closes, period);
  if (!data.length) return;
  const color = cfg.color ?? indicatorDefinitions.roc.color;
  addPanelLineSeries("roc", pos, { color, lineWidth: 1.5, lastValueVisible: true }).setData(data);
  addPanelLineSeries("roc", pos, { color: "rgba(255,255,255,0.12)", lineWidth: 1 })
    .setData(data.map(p => ({ time: p.time, value: 0 })));
  computedIndicatorData.roc = data;
}

function renderSuperTrend(cfg) {
  if (!lastCandles.length) return;
  const period = cfg.period ?? 10, mult = cfg.mult ?? 3;
  const data = computeSuperTrend(lastCandles, period, mult);
  if (!data.length) return;
  const c = cfg.colors || indicatorDefinitions.supertrend.colors;
  const upData = data.map(p => p.trend === 1 ? { time: p.time, value: p.value } : { time: p.time });
  const dnData = data.map(p => p.trend === -1 ? { time: p.time, value: p.value } : { time: p.time });
  const sUp = tvChart.addLineSeries({ color: c.up, lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
  const sDn = tvChart.addLineSeries({ color: c.down, lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
  sUp.setData(upData); sDn.setData(dnData);
  indicatorSeries.push(sUp, sDn);
  computedIndicatorData.supertrend = data;
}

// ── Ichimoku Cloud fill primitive ────────────────────────────────────────────
class IchimokuCloudRenderer {
  constructor() { this._data = null; }
  setData(data) { this._data = data; }
  draw(target) {
    if (!this._data || !this._data.spanA.length) return;
    const { spanA, spanB, series, colorUp, colorDown } = this._data;
    const bMap = new Map(spanB.map(p => [p.time, p.value]));
    target.useMediaCoordinateSpace(({ context: ctx }) => {
      let i = 0;
      while (i < spanA.length) {
        let j = i;
        const segUp = spanA[i].value >= (bMap.get(spanA[i].time) ?? spanA[i].value);
        while (j < spanA.length) {
          const bv = bMap.get(spanA[j].time);
          if (bv === undefined) break;
          const isUp = spanA[j].value >= bv;
          if (isUp !== segUp) break;
          j++;
        }
        const seg = spanA.slice(i, j);
        if (seg.length > 1) {
          ctx.beginPath();
          let started = false;
          seg.forEach((p) => {
            const x = tvChart.timeScale().timeToCoordinate(p.time);
            const y = series.priceToCoordinate(p.value);
            if (x === null || y === null) return;
            if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
          });
          for (let k = seg.length - 1; k >= 0; k--) {
            const bv = bMap.get(seg[k].time);
            const x = tvChart.timeScale().timeToCoordinate(seg[k].time);
            const y = bv !== undefined ? series.priceToCoordinate(bv) : null;
            if (x === null || y === null) continue;
            ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fillStyle = segUp ? colorUp : colorDown;
          ctx.fill();
        }
        i = j > i ? j : i + 1;
      }
    });
  }
}
class IchimokuCloudPaneView {
  constructor() { this._renderer = new IchimokuCloudRenderer(); }
  renderer() { return this._renderer; }
  zOrder() { return "bottom"; }
  update(data) { this._renderer.setData(data); }
}
class IchimokuCloudPrimitive {
  constructor(spanA, spanB, options = {}) {
    this._spanA = spanA;
    this._spanB = spanB;
    this._opts = { colorUp: "rgba(0,200,148,0.14)", colorDown: "rgba(255,107,138,0.14)", ...options };
    this._series = null;
    this._paneView = new IchimokuCloudPaneView();
  }
  attached({ series }) { this._series = series; this._build(); }
  detached() { this._series = null; this._paneView.update(null); }
  updateAllViews() { this._build(); }
  paneViews() { return [this._paneView]; }
  _build() {
    if (!this._series) return;
    this._paneView.update({ spanA: this._spanA, spanB: this._spanB, series: this._series,
      colorUp: this._opts.colorUp, colorDown: this._opts.colorDown });
  }
}

function renderIchimoku(cfg) {
  if (!lastCandles.length) return;
  const { tenkan: tP = 9, kijun: kP = 26, senkou: sP = 52 } = cfg;
  const { tenkan, kijun, spanA, spanB, chikou } = computeIchimoku(lastCandles, tP, kP, sP);
  const c = cfg.colors || indicatorDefinitions.ichimoku.colors;
  if (tenkan.length) {
    const s = tvChart.addLineSeries({ color: c.tenkan, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
    s.setData(tenkan); indicatorSeries.push(s);
  }
  if (kijun.length) {
    const s = tvChart.addLineSeries({ color: c.kijun, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
    s.setData(kijun); indicatorSeries.push(s);
  }
  if (chikou.length) {
    const s = tvChart.addLineSeries({ color: c.chikou, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
    s.setData(chikou); indicatorSeries.push(s);
  }
  if (spanA.length) {
    const sA = tvChart.addLineSeries({ color: c.spanA, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    sA.setData(spanA); indicatorSeries.push(sA);
  }
  if (spanB.length) {
    const sB = tvChart.addLineSeries({ color: c.spanB, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    sB.setData(spanB); indicatorSeries.push(sB);
  }
  if (spanA.length && spanB.length && mainSeries) {
    ichimokuCloudPrimitive = new IchimokuCloudPrimitive(spanA, spanB, { colorUp: c.cloudUp, colorDown: c.cloudDown });
    mainSeries.attachPrimitive(ichimokuCloudPrimitive);
  }
  computedIndicatorData.ichimoku = { tenkan, kijun, spanA, spanB, chikou };
}

function renderPivots(cfg) {
  if (!lastCandles.length || !mainSeries) return;
  const data = computePivotPoints(lastCandles);
  if (!data.length) return;
  const last = data[data.length - 1];
  const c = cfg.colors || indicatorDefinitions.pivots.colors;
  const lvls = [
    { price: last.r2, color: c.r, title: "R2" }, { price: last.r1, color: c.r, title: "R1" },
    { price: last.pp,  color: c.pp, title: "PP" },
    { price: last.s1, color: c.s, title: "S1" }, { price: last.s2, color: c.s, title: "S2" }
  ];
  lvls.forEach(({ price, color, title }) => {
    const pl = mainSeries.createPriceLine({ price, color, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title });
    fiboPriceLines.push(pl);
  });
  computedIndicatorData.pivots = last;
}

function getIndicatorCfg(key) {
  return { ...indicatorDefinitions[key], ...(marketState.indicatorSettings?.[key] ?? {}) };
}

function renderIndicators(closeData, volumeData) {
  clearIndicatorSeries();
  computedIndicatorData = {};

  const { mainBottom, positions } = getPanelLayout();
  if (mainSeries) {
    mainSeries.priceScale().applyOptions({ scaleMargins: { top: 0.02, bottom: mainBottom } });
  }

  marketState.indicators.forEach((key) => {
    const def = indicatorDefinitions[key];
    if (!def) return;
    const cfg = getIndicatorCfg(key);

    // ── Overlay indicators ──────────────────────────────────────────────────
    if (def.type === "sma") {
      const data = computeSMA(closeData, cfg.period);
      if (!data.length) return;
      const s = tvChart.addLineSeries({ color: cfg.color, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
      s.setData(data); indicatorSeries.push(s);
      computedIndicatorData[key] = data;
      return;
    }
    if (def.type === "ema") {
      const data = computeEMA(closeData, cfg.period);
      if (!data.length) return;
      const s = tvChart.addLineSeries({ color: cfg.color, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
      s.setData(data); indicatorSeries.push(s);
      computedIndicatorData[key] = data;
      return;
    }
    if (def.type === "wma") {
      const data = computeWMA(closeData, cfg.period);
      if (!data.length) return;
      const s = tvChart.addLineSeries({ color: cfg.color, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
      s.setData(data); indicatorSeries.push(s);
      computedIndicatorData[key] = data;
      return;
    }
    if (def.type === "bb") {
      const { upper, mid, lower } = computeBB(closeData, cfg.period, cfg.mult);
      if (!upper.length) return;
      const c = cfg.colors || def.colors;
      const sU = tvChart.addLineSeries({ color: c.upper, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
      const sM = tvChart.addLineSeries({ color: c.mid,   lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
      const sL = tvChart.addLineSeries({ color: c.lower, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
      sU.setData(upper); sM.setData(mid); sL.setData(lower);
      indicatorSeries.push(sU, sM, sL);
      computedIndicatorData[key] = { upper, mid, lower };
      return;
    }
    if (def.type === "vwap") {
      if (!lastCandles.length) return;
      const data = computeVWAP(lastCandles, volumeData);
      if (!data.length) return;
      const s = tvChart.addLineSeries({ color: cfg.color, lineWidth: 2, lineStyle: 0, priceLineVisible: false, lastValueVisible: true });
      s.setData(data); indicatorSeries.push(s);
      computedIndicatorData[key] = data;
      return;
    }

    if (def.type === "psar") {
      if (!lastCandles.length) return;
      const sar = computePSAR(lastCandles, cfg.step ?? 0.02, cfg.max ?? 0.2);
      const c = cfg.colors || def.colors;
      const upData = sar.map((p) => p.trend === 1 ? { time: p.time, value: p.value } : { time: p.time });
      const dnData = sar.map((p) => p.trend === -1 ? { time: p.time, value: p.value } : { time: p.time });
      const sUp = tvChart.addLineSeries({ color: c.up, lineWidth: 1, lineVisible: false, pointMarkersVisible: true, pointMarkersRadius: 2, priceLineVisible: false, lastValueVisible: false });
      const sDn = tvChart.addLineSeries({ color: c.down, lineWidth: 1, lineVisible: false, pointMarkersVisible: true, pointMarkersRadius: 2, priceLineVisible: false, lastValueVisible: false });
      sUp.setData(upData); sDn.setData(dnData);
      indicatorSeries.push(sUp, sDn);
      computedIndicatorData[key] = sar;
      return;
    }
    if (def.type === "supertrend") {
      renderSuperTrend(cfg);
      return;
    }
    if (def.type === "ichimoku") {
      renderIchimoku(cfg);
      return;
    }
    if (def.type === "pivots") {
      renderPivots(cfg);
      return;
    }
    if (def.type === "fiboext") {
      if (!lastCandles.length) return;
      const fib = computeAutoFibExtension(lastCandles, cfg.lookback ?? 60);
      if (!fib) return;
      const color = cfg.color ?? def.color;
      fib.levels.forEach((lvl) => {
        const pl = mainSeries.createPriceLine({
          price: lvl.price,
          color,
          lineWidth: 1,
          lineStyle: lvl.ratio === 0 || lvl.ratio === 1 ? 0 : 2,
          axisLabelVisible: true,
          title: `Fib ${(lvl.ratio * 100).toFixed(1)}%`
        });
        fiboPriceLines.push(pl);
      });
      computedIndicatorData[key] = fib;
      return;
    }

    // ── Primitive ───────────────────────────────────────────────────────────
    if (def.type === "primitive") {
      if (key === "vp" && lastCandles.length && volumeData.length) {
        vpPrimitive = new VolumeProfilePlugin(lastCandles, volumeData);
        mainSeries.attachPrimitive(vpPrimitive);
      }
      if (key === "gaps" && lastCandles.length) {
        const c = cfg.colors || def.colors;
        gapsPrimitive = new GapsPrimitive(lastCandles, {
          upBorder: c.upBorder, upFill: c.upFill,
          downBorder: c.downBorder, downFill: c.downFill
        });
        mainSeries.attachPrimitive(gapsPrimitive);
      }
      return;
    }

    // ── Panel indicators ────────────────────────────────────────────────────
    const pos = positions[key];
    if (!pos) return;
    if (key === "vol")   renderVolumePanel(volumeData, pos);
    else if (key === "rsi")  renderRSIPanel(closeData, pos);
    else if (key === "macd") renderMACDPanel(closeData, pos, cfg);
    else if (key === "stoch") renderStochPanel(lastHighs, lastLows, closeData, pos, cfg);
    else if (key === "cci")   renderCCIPanel(lastHighs, lastLows, closeData, pos, cfg);
    else if (key === "atr")   renderATRPanel(lastHighs, lastLows, closeData, pos, cfg);
    else if (key === "momentum") renderMomentumPanel(closeData, pos);
    else if (key === "adx")   renderADXPanel(lastHighs, lastLows, closeData, pos, cfg);
    else if (key === "obv")   renderOBVPanel(closeData, volumeData, pos, cfg);
    else if (key === "mfi")   renderMFIPanel(lastHighs, lastLows, closeData, volumeData, pos, cfg);
    else if (key === "willr") renderWillRPanel(lastHighs, lastLows, closeData, pos, cfg);
    else if (key === "roc")   renderROCPanel(closeData, pos, cfg);
  });

  renderIndicatorLegend();
}

function transformChartPayload(payload) {
  const result = payload.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const timestamps = result?.timestamp ?? [];

  if (!result || !quote || !timestamps.length) {
    throw new Error("Yahoo Finance no devolvio datos para este ticker.");
  }

  const candles = [];
  const closes = [];
  const volumes = [];

  timestamps.forEach((timestamp, index) => {
    const open = quote.open?.[index];
    const high = quote.high?.[index];
    const low = quote.low?.[index];
    const close = quote.close?.[index];
    const volume = quote.volume?.[index];

    if (![open, high, low, close].every((value) => Number.isFinite(value))) {
      return;
    }

    candles.push({ time: timestamp, open, high, low, close });
    closes.push({ time: timestamp, value: close });
    if (Number.isFinite(volume) && volume > 0) {
      volumes.push({ time: timestamp, value: volume });
    }
  });

  if (!candles.length || !closes.length) {
    throw new Error("No hay suficientes puntos para construir el grafico.");
  }

  return { meta: result.meta, candles, closes, volumes };
}

async function loadMarketChart() {
  if (!ensureChart()) {
    return;
  }

  const rangeConfig = rangeConfigs[marketState.range] ?? rangeConfigs["1D"];
  const symbol = marketState.symbol;

  if (chartAbortController) {
    chartAbortController.abort();
  }

  chartAbortController = new AbortController();
  hideChartOverlay();
  const isIntraday = rangeConfig.source === "rapid";
  const _CRYPTO_BASES = new Set(["BTC","ETH","BNB","ADA","XRP","SOL","DOT","DOGE","AVAX","MATIC","LINK","UNI","ATOM","LTC","BCH","ALGO","VET","TRX","ETC","XLM","AAVE","EOS","CAKE","NEO","MKR","COMP","SAND","MANA","ENJ","EGLD","NEAR","FTM","HBAR","GRT","RUNE","FLOW","XTZ","ZIL","DASH","ZEC","BAT","SNX","YFI","SUSHI","CRV","RNDR","INJ","APE","LDO","ARB","OP","PEPE","SHIB","FLOKI","WIF","TON","SUI","SEI","TIA","PYTH","JUP","BOME","NOT","TAO","BONK","BRETT"]);
  const _symBase = symbol.toUpperCase().split("-")[0];
  const isCrypto = _CRYPTO_BASES.has(_symBase);
  const dataSource = isIntraday ? "RapidAPI" : isCrypto ? "CoinGecko" : "Yahoo Finance";
  showChartStatus(`Cargando datos de ${dataSource}...`);
  chartSymbolLabel.textContent = symbol;
  chartMetaLabel.textContent = `${rangeConfig.label} · ${dataSource}`;
  chartPriceLabel.textContent = "--";

  try {
    let meta, candles, closes, volumes;

    if (isIntraday) {
      const response = await fetch(
        `${API_BASE_URL}/intraday/${encodeURIComponent(symbol)}?period=${rangeConfig.rapidPeriod}`,
        { signal: chartAbortController.signal }
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Error ${response.status}: No se pudieron obtener datos intraday.`);
      }
      ({ meta, candles, closes, volumes } = await response.json());
    } else {
      const response = await fetch(getYahooChartUrl(symbol, rangeConfig), {
        signal: chartAbortController.signal
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: No se pudo obtener la información del activo.`);
      }
      const payload = await response.json();
      ({ meta, candles, closes, volumes } = transformChartPayload(payload));
    }
    lastCandles = candles;
    lastCloses = closes;
    lastVolumes = volumes;
    lastHighs = candles.map(c => ({ time: c.time, value: c.high }));
    lastLows  = candles.map(c => ({ time: c.time, value: c.low }));

    buildMainSeries();

    if (marketState.chartType === "volheatmap") {
      mainSeries.setData(computeVolumeHeatmap(candles, volumes));
    } else if (marketState.chartType === "candlestick" || marketState.chartType === "bars") {
      mainSeries.setData(candles);
    } else {
      mainSeries.setData(closes);
    }

    renderIndicators(closes, volumes);
    tvChart.timeScale().fitContent();

    chartSymbolLabel.textContent = meta.symbol || symbol;
    chartMetaLabel.textContent = `${meta.shortName || meta.longName || symbol} · ${meta.fullExchangeName || meta.exchangeName || "Mercado"} · ${rangeConfig.label}`;
    chartPriceLabel.textContent = formatPrice(meta.regularMarketPrice, meta.currency);
    showChartStatus("Datos actualizados correctamente.");

    // Enriched header: change % and 52-week bar
    const chgPct = meta.regularMarketChangePercent;
    const chgEl = document.getElementById("chartChangePct");
    if (chgEl && chgPct != null) {
      chgEl.textContent = `${chgPct >= 0 ? "+" : ""}${chgPct.toFixed(2)}%`;
      chgEl.className = `chart-change-pct ${chgPct >= 0 ? "pos" : "neg"}`;
    } else if (chgEl) { chgEl.textContent = ""; }

    const w52Low  = meta.fiftyTwoWeekLow;
    const w52High = meta.fiftyTwoWeekHigh;
    const curPrice = meta.regularMarketPrice;
    const barEl  = document.getElementById("chart52wBar");
    const fillEl = document.getElementById("chart52wFill");
    const highEl = document.getElementById("chart52wHigh");
    if (barEl && fillEl && highEl && w52Low != null && w52High != null && curPrice != null) {
      const pct = Math.max(0, Math.min(100, ((curPrice - w52Low) / (w52High - w52Low)) * 100));
      fillEl.style.width = pct + "%";
      highEl.textContent = formatPrice(w52High, meta.currency);
      barEl.classList.remove("hidden");
    } else if (barEl) { barEl.classList.add("hidden"); }

    // Load drawings for this symbol, compare series, event markers, start live refresh
    loadDrawingsForSymbol(symbol);
    loadCompareSeries();
    loadChartEvents(symbol);
    startMarketPriceRefresh();
    renderStatsRail(symbol);
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    if (error.message.includes("Failed to fetch")) {
      const msg = "No se pudo conectar con el servidor API.\nAsegúrate de que el servidor Python esté corriendo:\n python api.py";
      showChartStatus("Error de conexión con el servidor API.", "error");
      showChartOverlay(msg);
      return;
    }

    showChartStatus(error.message, "error");
    showChartOverlay(error.message);
  }
}

// ── Drawing Persistence ───────────────────────────────────────────────────────
const DRAWINGS_KEY_PREFIX = "bp-drawings";
function _drawingsKey(symbol) {
  const session = window.BlackPortfolioAuth.getSession();
  return `${DRAWINGS_KEY_PREFIX}-${session?.id || "anon"}-${symbol}`;
}
function saveDrawingsForSymbol(symbol) {
  if (!drawingEngine || !symbol) return;
  try { localStorage.setItem(_drawingsKey(symbol), JSON.stringify(drawingEngine.drawings)); } catch {}
}
function loadDrawingsForSymbol(symbol) {
  if (!drawingEngine || !symbol) return;
  try {
    const raw = localStorage.getItem(_drawingsKey(symbol));
    drawingEngine.drawings = raw ? JSON.parse(raw) : [];
    drawingEngine._redraw();
  } catch { drawingEngine.drawings = []; drawingEngine._redraw(); }
}

// ── Live Price Refresh ────────────────────────────────────────────────────────
async function refreshLivePrice() {
  const sym = marketState.symbol;
  if (!sym || !chartPriceLabel) return;
  try {
    const res = await fetch(`${API_BASE_URL}/price/${encodeURIComponent(sym)}`);
    if (!res.ok) return;
    const data = await res.json();
    const price = data?.price;
    if (!price) return;
    const newText = formatPrice(price, data?.currency || "USD");
    const oldText = chartPriceLabel.textContent;
    if (newText !== oldText) {
      chartPriceLabel.textContent = newText;
      const prev = data?.previousClose;
      if (prev && prev > 0) {
        const isUp = price >= prev;
        chartPriceLabel.classList.remove("flash-up", "flash-down");
        void chartPriceLabel.offsetWidth;
        chartPriceLabel.classList.add(isUp ? "flash-up" : "flash-down");
        const pct = ((price - prev) / prev) * 100;
        const chgEl = document.getElementById("chartChangePct");
        if (chgEl) {
          chgEl.textContent = `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
          chgEl.className = `chart-change-pct ${pct >= 0 ? "pos" : "neg"}`;
        }
      }
    }
  } catch {}
}
function startMarketPriceRefresh() {
  if (_mktPriceTimer) clearInterval(_mktPriceTimer);
  _mktPriceTimer = setInterval(refreshLivePrice, 60000);
}
function stopMarketPriceRefresh() {
  if (_mktPriceTimer) { clearInterval(_mktPriceTimer); _mktPriceTimer = null; }
}

// ── Watchlist Sidebar ─────────────────────────────────────────────────────────
function renderMarketWlSidebar() {
  const el = document.getElementById("marketWlItems");
  if (!el) return;
  const list = getWatchlist();
  if (!list.length) {
    el.innerHTML = '<p class="market-wl-empty">Sin tickers.<br>Usa + para agregar el activo actual.</p>';
    return;
  }
  el.innerHTML = list.map(sym => `
    <div class="market-wl-item${sym === marketState.symbol ? " active" : ""}" data-sym="${sym}">
      <span class="market-wl-sym">${sym}</span>
      <div class="market-wl-right">
        <span class="market-wl-price" id="mwlp-${sym.replace(/[^a-z0-9]/gi,"_")}">…</span>
        <span class="market-wl-chg"   id="mwlc-${sym.replace(/[^a-z0-9]/gi,"_")}">…</span>
      </div>
      <button class="market-wl-rm" data-rm="${sym}" type="button" title="Quitar">✕</button>
    </div>`).join("");

  el.querySelectorAll(".market-wl-item").forEach(row => {
    row.addEventListener("click", e => {
      if (e.target.closest(".market-wl-rm")) return;
      selectTicker(row.dataset.sym);
    });
  });
  el.querySelectorAll(".market-wl-rm").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      removeFromWatchlist(btn.dataset.rm);
      renderMarketWlSidebar();
    });
  });

  fetchPricesBatch(list).then(priceMap => {
    list.forEach(sym => {
      const id = sym.replace(/[^a-z0-9]/gi, "_");
      const pEl = document.getElementById(`mwlp-${id}`);
      const cEl = document.getElementById(`mwlc-${id}`);
      if (!pEl || !cEl) return;
      const price = priceMap[sym] ?? getCachedPrice(sym);
      const prev  = getCachedPrev(sym);
      if (price == null) { pEl.textContent = "—"; cEl.textContent = "—"; return; }
      pEl.textContent = formatPrice(price, detectCurrencyFromTicker(sym) || "USD");
      if (prev && prev > 0) {
        const pct = ((price - prev) / prev) * 100;
        cEl.textContent = `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
        cEl.className   = `market-wl-chg ${pct >= 0 ? "pos" : "neg"}`;
      } else { cEl.textContent = "—"; }
    });
  });
}
function startMarketWlRefresh() {
  if (_mktWlTimer) clearInterval(_mktWlTimer);
  renderMarketWlSidebar();
  _mktWlTimer = setInterval(renderMarketWlSidebar, 60000);
}
function stopMarketWlRefresh() {
  if (_mktWlTimer) { clearInterval(_mktWlTimer); _mktWlTimer = null; }
}

// ── Market Overview Bar ───────────────────────────────────────────────────────
const MKT_OVERVIEW_INDICES = [
  { sym: "^GSPC",   label: "S&P 500"  },
  { sym: "^IXIC",   label: "NASDAQ"   },
  { sym: "^DJI",    label: "Dow Jones" },
  { sym: "GLD",     label: "Oro"       },
  { sym: "BTC-USD", label: "Bitcoin"   },
  { sym: "^MXX",    label: "IPC MX"   },
];
const _mktOverviewSparkCache = {};
const MKT_SPARK_TTL = 10 * 60 * 1000;
function sparklinePoints(closes) {
  if (!closes || closes.length < 2) return null;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const w = 64, h = 22;
  return closes.map((v, i) => {
    const x = (i / (closes.length - 1)) * w;
    const y = h - ((v - min) / span) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}
async function fetchSparkline(sym) {
  const cached = _mktOverviewSparkCache[sym];
  if (cached && Date.now() - cached.ts < MKT_SPARK_TTL) return cached.closes;
  try {
    const res = await fetch(getYahooChartUrl(sym, { range: "1mo", interval: "1d" }));
    if (!res.ok) throw new Error("bad response");
    const data = await res.json();
    const r = data?.chart?.result?.[0];
    const closes = (r?.indicators?.quote?.[0]?.close ?? []).filter(v => typeof v === "number");
    _mktOverviewSparkCache[sym] = { closes, ts: Date.now() };
    return closes;
  } catch {
    return cached?.closes ?? null;
  }
}
async function renderMarketOverviewBar() {
  const bar = document.getElementById("marketOverviewBar");
  if (!bar) return;
  bar.innerHTML = MKT_OVERVIEW_INDICES.map(({ sym, label }) => {
    const id = sym.replace(/[^a-z0-9]/gi, "_");
    return `<button class="mkt-index-tile${sym === marketState.symbol ? " active-tile" : ""}" data-sym="${sym}" type="button">
      <span class="mkt-index-label">${label}</span>
      <span class="mkt-index-price" id="mio-${id}">…</span>
      <span class="mkt-index-chg"   id="mic-${id}">…</span>
      <svg class="mkt-index-spark" id="mis-${id}" viewBox="0 0 64 22" preserveAspectRatio="none"><polyline points=""/></svg>
    </button>`;
  }).join("");
  bar.querySelectorAll(".mkt-index-tile").forEach(btn => {
    btn.addEventListener("click", () => selectTicker(btn.dataset.sym));
  });
  const priceMap = await fetchPricesBatch(MKT_OVERVIEW_INDICES.map(i => i.sym));
  MKT_OVERVIEW_INDICES.forEach(({ sym }) => {
    const id = sym.replace(/[^a-z0-9]/gi, "_");
    const pEl = document.getElementById(`mio-${id}`);
    const cEl = document.getElementById(`mic-${id}`);
    if (!pEl || !cEl) return;
    const price = priceMap[sym] ?? getCachedPrice(sym);
    const prev  = getCachedPrev(sym);
    if (!price) { pEl.textContent = "—"; cEl.textContent = "—"; return; }
    pEl.textContent = formatPrice(price, "USD");
    if (prev && prev > 0) {
      const pct = ((price - prev) / prev) * 100;
      cEl.textContent = `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
      cEl.className   = `mkt-index-chg ${pct >= 0 ? "pos" : "neg"}`;
    } else { cEl.textContent = "—"; }
  });
  MKT_OVERVIEW_INDICES.forEach(async ({ sym }) => {
    const id = sym.replace(/[^a-z0-9]/gi, "_");
    const svg = document.getElementById(`mis-${id}`);
    if (!svg) return;
    const closes = await fetchSparkline(sym);
    const poly = svg.querySelector("polyline");
    if (!poly || !closes || closes.length < 2) return;
    poly.setAttribute("points", sparklinePoints(closes));
    poly.setAttribute("class", closes[closes.length - 1] >= closes[0] ? "pos" : "neg");
  });
  const upd = document.getElementById("marketUpdated");
  if (upd) {
    const t = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    upd.textContent = `Actualizado ${t}`;
  }
}
async function renderFngGauge() {
  const el = document.getElementById("fngGauge");
  if (!el) return;
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1");
    if (!res.ok) throw new Error("bad response");
    const json = await res.json();
    const entry = json?.data?.[0];
    const value = parseInt(entry?.value, 10);
    if (!Number.isFinite(value)) throw new Error("no value");
    const label = entry.value_classification || "";
    const angle = (value / 100) * 180;
    const color = value < 25 ? "#ff4d6a" : value < 45 ? "#ffb347" : value < 55 ? "#e8e8e8" : value < 75 ? "#9be37a" : "#00c894";
    el.innerHTML = `
      <svg viewBox="0 0 100 56" class="fng-gauge-svg">
        <path d="M8 52 A42 42 0 0 1 92 52" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="8" stroke-linecap="round"/>
        <path d="M8 52 A42 42 0 0 1 92 52" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"
          stroke-dasharray="${(angle / 180) * 132} 132"/>
        <line x1="50" y1="52" x2="${50 + 34 * Math.cos(Math.PI - (angle * Math.PI / 180))}" y2="${52 - 34 * Math.sin(Math.PI - (angle * Math.PI / 180))}" stroke="#fff" stroke-width="2"/>
        <circle cx="50" cy="52" r="3" fill="#fff"/>
      </svg>
      <div class="fng-gauge-label">
        <span class="fng-gauge-value" style="color:${color}">${value}</span>
        <span class="fng-gauge-text">${label}</span>
      </div>`;
  } catch {
    el.innerHTML = "";
  }
}
function startMarketOverviewRefresh() {
  if (_mktOverviewTimer) clearInterval(_mktOverviewTimer);
  renderMarketOverviewBar();
  renderFngGauge();
  _mktOverviewTimer = setInterval(renderMarketOverviewBar, 60000);
  if (_fngTimer) clearInterval(_fngTimer);
  _fngTimer = setInterval(renderFngGauge, 5 * 60000);
}
function stopMarketOverviewRefresh() {
  if (_mktOverviewTimer) { clearInterval(_mktOverviewTimer); _mktOverviewTimer = null; }
  if (_fngTimer) { clearInterval(_fngTimer); _fngTimer = null; }
}

// ── Stats Rail ───────────────────────────────────────────────────────────────
async function renderStatsRail(symbol) {
  const body = document.getElementById("marketStatsRailBody");
  if (!body) return;
  body.innerHTML = '<p class="stats-rail-empty">Cargando…</p>';
  try {
    const res = await fetch(`${API_BASE_URL}/info/${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error("no data");
    const data = await res.json();
    const yieldRaw = data.dividendYield;
    const yieldPct = yieldRaw != null && !isNaN(yieldRaw) ? (yieldRaw > 1 ? yieldRaw : yieldRaw * 100) : null;
    const items = [
      { label: "Cap. Mercado", value: formatLargeNumber(data.marketCap) },
      { label: "P/E Ratio", value: data.trailingPE != null ? data.trailingPE.toFixed(2) : "—" },
      { label: "Beta", value: data.beta != null ? data.beta.toFixed(2) : "—" },
      { label: "Máx. 52S", value: formatPrice(data.fiftyTwoWeekHigh, data.currency) },
      { label: "Mín. 52S", value: formatPrice(data.fiftyTwoWeekLow, data.currency) },
      { label: "Vol. Promedio", value: formatLargeNumber(data.averageVolume) },
      { label: "Div. Yield", value: yieldPct != null ? `${yieldPct.toFixed(2)}%` : "—" },
    ];
    body.innerHTML = items.map(it => `
      <div class="stats-rail-item">
        <span class="stats-rail-label">${it.label}</span>
        <span class="stats-rail-value">${it.value}</span>
      </div>`).join("");
  } catch {
    body.innerHTML = '<p class="stats-rail-empty">Sin datos disponibles.</p>';
  }
}

// ── Compare Series ────────────────────────────────────────────────────────────
function renderCompareBar() {
  const chips = document.getElementById("compareChips");
  if (!chips) return;
  const COLORS = ["#a5b4ff", "#f5b84c", "#32d6a2", "#ff6b81"];
  const syms = marketState.compareSymbols || [];
  chips.innerHTML = syms.map((sym, i) => `
    <span class="compare-chip" style="--cc:${COLORS[i % COLORS.length]}">
      <span class="compare-chip-sym">${sym}</span>
      <button class="compare-chip-rm" data-csym="${sym}" type="button">✕</button>
    </span>`).join("");
  chips.querySelectorAll(".compare-chip-rm").forEach(btn => {
    btn.addEventListener("click", () => {
      marketState.compareSymbols = (marketState.compareSymbols || []).filter(s => s !== btn.dataset.csym);
      persistMarketState();
      renderCompareBar();
      loadMarketChart();
    });
  });
}
async function loadCompareSeries() {
  _compareSeriesArr.forEach(s => { try { tvChart.removeSeries(s); } catch {} });
  _compareSeriesArr = [];
  if (!tvChart || !mainSeries) return;

  const syms = marketState.compareSymbols || [];
  const rangeConfig = rangeConfigs[marketState.range] ?? rangeConfigs["1D"];
  const isIntraday = rangeConfig.source === "rapid";

  if (!syms.length || isIntraday) {
    try { tvChart.priceScale("right").applyOptions({ mode: 0 }); } catch {}
    if (syms.length && isIntraday) {
      showPlanToast("La comparación no está disponible en rangos intradía (HOY/5D).");
    }
    return;
  }

  try { tvChart.priceScale("right").applyOptions({ mode: 2 }); } catch {}
  const COLORS = ["#a5b4ff", "#f5b84c", "#32d6a2", "#ff6b81"];

  for (let i = 0; i < Math.min(syms.length, 4); i++) {
    try {
      const res = await fetch(getYahooChartUrl(syms[i], rangeConfig));
      if (!res.ok) continue;
      const { closes } = transformChartPayload(await res.json());
      if (!closes.length) continue;
      const s = tvChart.addLineSeries({
        color: COLORS[i % COLORS.length], lineWidth: 2,
        lastValueVisible: true, priceLineVisible: false, title: syms[i]
      });
      s.setData(closes);
      _compareSeriesArr.push(s);
    } catch {}
  }
  if (_compareSeriesArr.length) tvChart.timeScale().fitContent();
}

// ── Dividend / Event Markers ──────────────────────────────────────────────────
async function loadChartEvents(symbol) {
  if (!tvChart || !mainSeries || !lastCandles.length) return;
  try {
    const res = await fetch(`${API_BASE_URL}/dividends/${encodeURIComponent(symbol)}`);
    if (!res.ok) return;
    const data = await res.json();
    const divs = data?.dividends || [];
    if (!divs.length) return;
    const firstTime = lastCandles[0].time;
    const lastTime  = lastCandles[lastCandles.length - 1].time;
    const markers = divs
      .filter(d => d.date >= firstTime && d.date <= lastTime)
      .map(d => ({
        time: d.date,
        position: "belowBar",
        color: "#32d6a2",
        shape: "arrowUp",
        text: `Div $${Number(d.amount).toFixed(3)}`
      }))
      .sort((a, b) => a.time - b.time);
    if (markers.length) mainSeries.setMarkers(markers);
  } catch {}
}

function attachMarketListeners() {
  if (marketListenersAttached) {
    return;
  }

  tickerInput.addEventListener("input", () => {
    tickerInput.value = tickerInput.value.toUpperCase();
    scheduleSuggestions();
  });

  tickerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const query = tickerInput.value.trim();
      if (isISIN(query)) {
        renderSuggestions([]);
        loadBondInfo(query.toUpperCase());
      } else {
        const firstSuggestion = lastSuggestions[0]?.symbol;
        selectTicker(firstSuggestion || query);
      }
    }
  });

  applyTickerButton.addEventListener("click", () => {
    const query = tickerInput.value.trim();
    if (isISIN(query)) {
      renderSuggestions([]);
      loadBondInfo(query.toUpperCase());
    } else {
      selectTicker(query);
    }
  });

  saveTickerButton.addEventListener("click", toggleFavorite);

  marketMenuButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const targetMenu = button.dataset.menuTarget;
      const menu = document.getElementById(targetMenu);
      const isHidden = menu.classList.contains("hidden");
      closeMenus();
      if (isHidden) {
        openMenu(targetMenu);
      }
    });
  });

  document.querySelectorAll("[data-range]").forEach((button) => {
    button.addEventListener("click", () => {
      marketState.range = button.dataset.range;
      persistMarketState();
      renderMarketToolbar();
      closeMenus();
      loadMarketChart();
    });
  });

  document.querySelectorAll("[data-chart-type]").forEach((button) => {
    button.addEventListener("click", () => {
      marketState.chartType = button.dataset.chartType;
      persistMarketState();
      renderMarketToolbar();
      closeMenus();
      loadMarketChart();
    });
  });

  indicatorCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        const maxInd = window._planLimits?.maxIndicators ?? Infinity;
        const activeCount = [...indicatorCheckboxes].filter(cb => cb !== checkbox && cb.checked).length;
        if (activeCount >= maxInd) {
          checkbox.checked = false;
          showPlanToast(`Tu plan permite hasta ${maxInd} indicadores activos.`);
          return;
        }
      }
      const selectedIndicators = [...indicatorCheckboxes]
        .filter((item) => item.checked)
        .map((item) => item.value);
      marketState.indicators = selectedIndicators;
      persistMarketState();
      syncIndicatorRows();
      updateIndicatorBadge();
      loadMarketChart();
    });
  });

  document.getElementById("indicatorBackdrop")?.addEventListener("click", () => {
    closeMenus();
  });

  document.getElementById("closeIndicatorsBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    closeMenus();
  });

  document.getElementById("clearIndicatorsBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    marketState.indicators = [];
    persistMarketState();
    syncIndicatorRows();
    updateIndicatorBadge();
    loadMarketChart();
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".market-menu-group")) {
      closeMenus();
    }

    if (!event.target.closest(".market-search-shell")) {
      renderSuggestions([]);
    }
  });

  // Compare bar listeners
  document.getElementById("compareToggleBtn")?.addEventListener("click", () => {
    const bar = document.getElementById("compareBar");
    if (!bar) return;
    const isOpen = !bar.classList.contains("hidden");
    bar.classList.toggle("hidden", isOpen);
    document.getElementById("compareToggleBtn").classList.toggle("active", !isOpen);
    closeMenus();
  });
  document.getElementById("compareCloseBtn")?.addEventListener("click", () => {
    document.getElementById("compareBar")?.classList.add("hidden");
    document.getElementById("compareToggleBtn")?.classList.remove("active");
  });
  const addCompareSymbol = () => {
    const input = document.getElementById("compareInput");
    if (!input) return;
    const sym = normalizeSymbol(input.value.trim());
    if (!sym || sym === marketState.symbol) { input.value = ""; return; }
    const cur = marketState.compareSymbols || [];
    if (!cur.includes(sym) && cur.length < 4) {
      marketState.compareSymbols = [...cur, sym];
      persistMarketState();
      renderCompareBar();
      loadMarketChart();
    }
    input.value = "";
  };
  document.getElementById("compareAddBtn")?.addEventListener("click", addCompareSymbol);
  document.getElementById("compareInput")?.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); addCompareSymbol(); }
  });
  document.getElementById("compareInput")?.addEventListener("input", e => {
    e.target.value = e.target.value.toUpperCase();
  });

  // Watchlist sidebar add button
  document.getElementById("mktWlAddBtn")?.addEventListener("click", () => {
    addToWatchlist(marketState.symbol);
    renderMarketWlSidebar();
  });

  marketListenersAttached = true;
}

function initializeMarketModule() {
  if (marketInitialized) {
    startMarketWlRefresh();
    startMarketOverviewRefresh();
    return;
  }

  renderMarketToolbar();
  attachMarketListeners();
  attachSettingsPanelListeners();
  renderCompareBar();
  loadMarketChart();
  loadTickerNews(marketState.symbol);
  startMarketWlRefresh();
  startMarketOverviewRefresh();
  marketInitialized = true;
}

// ── Indicator Legend ─────────────────────────────────────────────────────────
function getLastVal(arr) {
  if (!arr || !arr.length) return null;
  const last = arr[arr.length - 1];
  return last?.value ?? null;
}

function getValAt(arr, time) {
  if (!arr || !arr.length) return null;
  if (time == null) return getLastVal(arr);
  let lo = 0, hi = arr.length - 1, ans = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].time <= time) { ans = arr[mid]; lo = mid + 1; } else hi = mid - 1;
  }
  return ans ? ans.value : null;
}

function fmtVal(v, decimals = 2) {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  return v.toFixed(decimals);
}

function getIndicatorDisplayColor(key) {
  const cfg = getIndicatorCfg(key);
  if (cfg.colors) return cfg.colors.mid ?? cfg.colors.macd ?? cfg.colors.k ?? cfg.colors.adx ?? cfg.colors.tenkan ?? cfg.colors.pp ?? cfg.colors.up ?? Object.values(cfg.colors)[0];
  return cfg.color ?? "#6f86ff";
}

function getIndicatorLegendValue(key, atTime) {
  const data = computedIndicatorData[key];
  if (!data) return "—";
  if (Array.isArray(data)) {
    if (atTime == null) {
      const last = data[data.length - 1];
      if (last && last.trend !== undefined) return `${fmtVal(last.value)} ${last.trend === 1 ? "↑" : "↓"}`;
    }
    return fmtVal(getValAt(data, atTime));
  }
  if (data.upper) return `↑${fmtVal(getValAt(data.upper, atTime))} ${fmtVal(getValAt(data.mid, atTime))} ↓${fmtVal(getValAt(data.lower, atTime))}`;
  if (data.macdLine) return `${fmtVal(getValAt(data.macdLine, atTime))} · ${fmtVal(getValAt(data.signalLine, atTime))}`;
  if (data.k) return `K:${fmtVal(getValAt(data.k, atTime))} D:${fmtVal(getValAt(data.d, atTime))}`;
  if (data.adx) return `ADX:${fmtVal(getValAt(data.adx, atTime))} +DI:${fmtVal(getValAt(data.plusDi, atTime))} -DI:${fmtVal(getValAt(data.minusDi, atTime))}`;
  if (data.tenkan) return `T:${fmtVal(getValAt(data.tenkan, atTime))} K:${fmtVal(getValAt(data.kijun, atTime))}`;
  if (data.pp !== undefined) return `PP:${fmtVal(data.pp)} R1:${fmtVal(data.r1)} S1:${fmtVal(data.s1)}`;
  return "—";
}

function renderIndicatorLegend(crosshairTime) {
  const legend = document.getElementById("indicatorLegend");
  if (!legend) return;
  const active = marketState.indicators.filter(k => k !== "vp");
  if (!active.length) { legend.innerHTML = ""; return; }

  legend.innerHTML = active.map(key => {
    const cfg = getIndicatorCfg(key);
    const color = getIndicatorDisplayColor(key);
    const val = getIndicatorLegendValue(key, crosshairTime);
    const chipAccent = color.startsWith("#") ? `${color}55` : color;
    return `<div class="ind-leg-item" data-key="${key}" style="--chip-accent:${chipAccent}">
      <span class="ind-leg-dot" style="background:${color}"></span>
      <span class="ind-leg-name">${cfg.label}</span>
      <span class="ind-leg-val">${val}</span>
      <button class="ind-leg-settings" data-key="${key}" title="Configurar" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
      <button class="ind-leg-remove" data-key="${key}" title="Quitar" type="button">×</button>
    </div>`;
  }).join("");

  legend.querySelectorAll(".ind-leg-settings").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); openIndicatorSettings(btn.dataset.key); });
  });
  legend.querySelectorAll(".ind-leg-remove").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const k = btn.dataset.key;
      marketState.indicators = marketState.indicators.filter(x => x !== k);
      persistMarketState();
      syncIndicatorRows();
      updateIndicatorBadge();
      loadMarketChart();
    });
  });
}

// ── Indicator Settings Panel ─────────────────────────────────────────────────
function buildSettingsFields(key) {
  const cfg = getIndicatorCfg(key);
  const def = indicatorDefinitions[key];
  const rows = [];

  const field = (label, html) => `<div class="ind-sf-row"><label class="ind-sf-label">${label}</label>${html}</div>`;
  const numInput = (name, val, min = 1, max = 500) =>
    `<input class="ind-sf-num" type="number" name="${name}" value="${val}" min="${min}" max="${max}">`;
  const colorInput = (name, val) =>
    `<input class="ind-sf-color" type="color" name="${name}" value="${val}">`;

  // Period
  if (def.period !== undefined)   rows.push(field("Período", numInput("period", cfg.period)));
  if (def.mult !== undefined)     rows.push(field("Desviaciones (σ)", numInput("mult", cfg.mult, 0.5, 5)));
  if (def.k !== undefined)        rows.push(field("Período %K", numInput("k", cfg.k)));
  if (def.d !== undefined)        rows.push(field("Período %D", numInput("d", cfg.d)));
  if (def.smooth !== undefined)   rows.push(field("Suavizado", numInput("smooth", cfg.smooth)));
  if (def.step !== undefined)     rows.push(field("Paso (AF)", `<input class="ind-sf-num" type="number" name="step" value="${cfg.step}" min="0.001" max="0.5" step="0.01">`));
  if (def.max !== undefined)      rows.push(field("AF máximo", `<input class="ind-sf-num" type="number" name="max" value="${cfg.max}" min="0.05" max="1" step="0.05">`));
  if (def.lookback !== undefined) rows.push(field("Ventana (barras)", numInput("lookback", cfg.lookback, 5, 500)));
  if (def.tenkan !== undefined)   rows.push(field("Tenkan-sen", numInput("tenkan", cfg.tenkan, 2, 100)));
  if (def.kijun !== undefined)    rows.push(field("Kijun-sen", numInput("kijun", cfg.kijun, 2, 200)));
  if (def.senkou !== undefined)   rows.push(field("Senkou Span B", numInput("senkou", cfg.senkou, 2, 400)));

  // Colors
  if (def.colors) {
    Object.entries(cfg.colors || def.colors).forEach(([cKey, cVal]) => {
      const labels = { upper:"Color superior", lower:"Color inferior", mid:"Color medio",
                       macd:"Color MACD", signal:"Color señal", histUp:"Histograma +", histDown:"Histograma −",
                       k:"Color %K", d:"Color %D", up:"Color alcista", down:"Color bajista",
                       tenkan:"Tenkan-sen", kijun:"Kijun-sen", spanA:"Senkou A", spanB:"Senkou B",
                       cloudUp:"Nube alcista", cloudDown:"Nube bajista", chikou:"Chikou Span",
                       adx:"Color ADX", plusDi:"Color +DI", minusDi:"Color -DI",
                       pp:"Color pivote", r:"Color resistencia", s:"Color soporte" };
      rows.push(field(labels[cKey] ?? cKey, colorInput("color_" + cKey, cVal)));
    });
  } else if (def.color !== undefined) {
    rows.push(field("Color", colorInput("color", cfg.color ?? def.color)));
  }

  return rows.join("");
}

function openIndicatorSettings(key) {
  const panel = document.getElementById("indSettingsPanel");
  const body  = document.getElementById("indSettingsPanelBody");
  const title = document.getElementById("indSettingsPanelTitle");
  if (!panel) return;

  activeLegendSettingsKey = key;
  title.textContent = indicatorDefinitions[key]?.label ?? key;
  body.innerHTML = buildSettingsFields(key);

  // Position near the legend item
  const legendItem = document.querySelector(`.ind-leg-item[data-key="${key}"]`);
  if (legendItem) {
    const rect = legendItem.getBoundingClientRect();
    panel.style.top = Math.min(rect.bottom + 6, window.innerHeight - 320) + "px";
    panel.style.left = rect.left + "px";
  } else {
    panel.style.top = "120px";
    panel.style.left = "80px";
  }
  panel.classList.remove("hidden");
}

function closeIndicatorSettings() {
  document.getElementById("indSettingsPanel")?.classList.add("hidden");
  activeLegendSettingsKey = null;
}

function applyIndicatorSettings() {
  const key = activeLegendSettingsKey;
  if (!key) return;
  const body = document.getElementById("indSettingsPanelBody");
  const inputs = body.querySelectorAll("input");
  const overrides = { ...((marketState.indicatorSettings ?? {})[key] ?? {}) };

  inputs.forEach(input => {
    const n = input.name;
    if (n.startsWith("color_")) {
      const cKey = n.slice(6);
      if (!overrides.colors) overrides.colors = { ...(indicatorDefinitions[key].colors ?? {}) };
      overrides.colors[cKey] = input.value;
    } else if (n === "color") {
      overrides.color = input.value;
    } else {
      const numVal = parseFloat(input.value);
      if (isFinite(numVal)) overrides[n] = numVal;
    }
  });

  if (!marketState.indicatorSettings) marketState.indicatorSettings = {};
  marketState.indicatorSettings[key] = overrides;
  persistMarketState();
  closeIndicatorSettings();
  loadMarketChart();
}

function resetIndicatorSettings() {
  const key = activeLegendSettingsKey;
  if (!key) return;
  if (marketState.indicatorSettings) delete marketState.indicatorSettings[key];
  persistMarketState();
  openIndicatorSettings(key); // re-open with defaults
}

function attachSettingsPanelListeners() {
  document.getElementById("indSettingsApplyBtn")?.addEventListener("click", applyIndicatorSettings);
  document.getElementById("indSettingsResetBtn")?.addEventListener("click", resetIndicatorSettings);
  document.getElementById("indSettingsCloseBtn")?.addEventListener("click", closeIndicatorSettings);
  // Close on outside click
  document.addEventListener("click", e => {
    const panel = document.getElementById("indSettingsPanel");
    if (panel && !panel.contains(e.target) && !e.target.closest(".ind-leg-settings")) {
      closeIndicatorSettings();
    }
  });
}

// ── Chart Drawing Engine ─────────────────────────────────────────────────────
class ChartDrawingEngine {
  constructor(canvas, container) {
    this.canvas = canvas;
    this.container = container;
    this.ctx = canvas.getContext("2d");
    this.activeTool = null;
    this.drawings = [];
    this.currentDrawing = null;
    this.isDrawing = false;
    this._resizeObserver = null;
    this._syncSize();
    this._bindEvents();
    this._observeResize();
  }

  _syncSize() {
    const r = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = r.width * dpr;
    this.canvas.height = r.height * dpr;
    this.canvas.style.width = r.width + "px";
    this.canvas.style.height = r.height + "px";
    this.ctx.scale(dpr, dpr);
    this._w = r.width;
    this._h = r.height;
    this._redraw();
  }

  _observeResize() {
    this._resizeObserver = new ResizeObserver(() => this._syncSize());
    this._resizeObserver.observe(this.container);
  }

  _coords(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _toolColor(tool) {
    if (tool === "long-position") return "#00c894";
    if (tool === "short-position") return "#ff4d6a";
    if (tool === "fib-retracement" || tool === "fib-extension" || tool === "fib-fan") return "#f5a623";
    if (tool === "measure") return "#a78bfa";
    if (tool === "time-ruler") return "#f59e0b";
    if (tool === "abcd" || tool === "harmonic") return "#f5a623";
    return "#6f86ff";
  }

  setTool(tool) {
    this.activeTool = tool;
    this.canvas.style.pointerEvents = tool ? "auto" : "none";
    const cursors = { brush: "crosshair", text: "text" };
    this.canvas.style.cursor = tool ? (cursors[tool] || "crosshair") : "default";
  }

  undo() { this.drawings.pop(); this._redraw(); }
  clear() { this.drawings = []; this._redraw(); }

  _bindEvents() {
    this.canvas.addEventListener("mousedown", e => this._onDown(e));
    this.canvas.addEventListener("mousemove", e => this._onMove(e));
    this.canvas.addEventListener("mouseup",   e => this._onUp(e));
    this.canvas.addEventListener("mouseleave", e => { if (this.isDrawing) this._onUp(e); });
  }

  _onDown(e) {
    if (!this.activeTool) return;
    if (this.activeTool === "text") { this._placeTextInput(this._coords(e)); return; }
    this.isDrawing = true;
    const p = this._coords(e);
    this.currentDrawing = {
      type: this.activeTool,
      start: { ...p }, end: { ...p },
      color: this._toolColor(this.activeTool),
      points: [{ ...p }]
    };
  }

  _onMove(e) {
    if (!this.isDrawing || !this.currentDrawing) return;
    const p = this._coords(e);
    this.currentDrawing.end = { ...p };
    if (this.activeTool === "brush") this.currentDrawing.points.push({ ...p });
    this._redraw();
    this._draw(this.currentDrawing, true);
  }

  _onUp(e) {
    if (!this.isDrawing || !this.currentDrawing) return;
    this.isDrawing = false;
    const p = this._coords(e);
    this.currentDrawing.end = { ...p };
    const dx = p.x - this.currentDrawing.start.x;
    const dy = p.y - this.currentDrawing.start.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3 || this.activeTool === "brush")
      this.drawings.push({ ...this.currentDrawing, points: this.currentDrawing.points ? [...this.currentDrawing.points] : undefined });
    this.currentDrawing = null;
    this._redraw();
  }

  _redraw() {
    this.ctx.clearRect(0, 0, this._w, this._h);
    this.drawings.forEach(d => this._draw(d, false));
  }

  _draw(d, preview) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = d.color;
    ctx.fillStyle = d.color;
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (preview) ctx.globalAlpha = 0.75;

    switch (d.type) {
      case "trendline": this._drawTrendLine(d); break;
      case "hline":     this._drawHLine(d); break;
      case "vline":     this._drawVLine(d); break;
      case "ray":       this._drawRay(d); break;
      case "fib-retracement": this._drawFibRet(d); break;
      case "fib-extension":   this._drawFibExt(d); break;
      case "fib-fan":   this._drawFibFan(d); break;
      case "brush":     this._drawBrush(d); break;
      case "rectangle": this._drawRect(d); break;
      case "ellipse":   this._drawEllipse(d); break;
      case "long-position":  this._drawLong(d); break;
      case "short-position": this._drawShort(d); break;
      case "measure":   this._drawMeasure(d); break;
      case "time-ruler":this._drawTimeRuler(d); break;
      case "abcd":      this._drawABCD(d); break;
      case "harmonic":  this._drawHarmonic(d); break;
      case "text-label":this._drawTextLabel(d); break;
    }
    ctx.restore();
  }

  _drawTrendLine(d) {
    const c = this.ctx;
    c.beginPath(); c.moveTo(d.start.x, d.start.y); c.lineTo(d.end.x, d.end.y); c.stroke();
    [d.start, d.end].forEach(p => { c.beginPath(); c.arc(p.x, p.y, 3, 0, Math.PI * 2); c.fill(); });
  }

  _drawHLine(d) {
    const c = this.ctx;
    c.setLineDash([6, 3]);
    c.beginPath(); c.moveTo(0, d.start.y); c.lineTo(this._w, d.start.y); c.stroke();
    c.setLineDash([]);
    c.beginPath(); c.arc(d.start.x, d.start.y, 3, 0, Math.PI * 2); c.fill();
  }

  _drawVLine(d) {
    const c = this.ctx;
    c.setLineDash([6, 3]);
    c.beginPath(); c.moveTo(d.start.x, 0); c.lineTo(d.start.x, this._h); c.stroke();
    c.setLineDash([]);
    c.beginPath(); c.arc(d.start.x, d.start.y, 3, 0, Math.PI * 2); c.fill();
  }

  _drawRay(d) {
    const c = this.ctx;
    const dx = d.end.x - d.start.x, dy = d.end.y - d.start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;
    const s = Math.max(this._w, this._h) * 3 / len;
    c.beginPath(); c.moveTo(d.start.x, d.start.y); c.lineTo(d.start.x + dx * s, d.start.y + dy * s); c.stroke();
    c.beginPath(); c.arc(d.start.x, d.start.y, 3, 0, Math.PI * 2); c.fill();
  }

  _drawFibRet(d) {
    const c = this.ctx;
    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const colors = ["#ff8c42","#f5a623","#ffd166","#6f86ff","#00c894","#a78bfa","#ff4d6a"];
    const dy = d.end.y - d.start.y;
    c.font = "10px system-ui";
    levels.forEach((lv, i) => {
      const y = d.start.y + dy * lv;
      c.strokeStyle = colors[i]; c.fillStyle = colors[i];
      c.globalAlpha = 0.75; c.lineWidth = i === 0 || i === levels.length - 1 ? 1.5 : 1;
      c.beginPath(); c.moveTo(0, y); c.lineTo(this._w, y); c.stroke();
      c.globalAlpha = 0.9;
      const label = `${(lv * 100).toFixed(1)}%`;
      const mx = c.measureText(label);
      c.fillStyle = "rgba(8,8,12,0.8)";
      c.fillRect(d.end.x + 4, y - 12, mx.width + 8, 14);
      c.fillStyle = colors[i];
      c.fillText(label, d.end.x + 8, y - 1);
    });
    c.strokeStyle = d.color; c.globalAlpha = 0.3; c.lineWidth = 1; c.setLineDash([4,3]);
    c.beginPath(); c.moveTo(d.start.x, d.start.y); c.lineTo(d.end.x, d.end.y); c.stroke();
    c.setLineDash([]);
  }

  _drawFibExt(d) {
    const c = this.ctx;
    const levels = [0, 0.236, 0.382, 0.5, 0.618, 1, 1.272, 1.618, 2, 2.618];
    const dy = d.end.y - d.start.y;
    c.font = "10px system-ui";
    levels.forEach(lv => {
      const y = d.start.y + dy * lv;
      c.strokeStyle = lv > 1 ? "#a78bfa" : d.color;
      c.fillStyle = c.strokeStyle;
      c.globalAlpha = lv > 1 ? 0.8 : 0.65; c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, y); c.lineTo(this._w, y); c.stroke();
      const label = lv.toFixed(3);
      const mx = c.measureText(label);
      c.fillStyle = "rgba(8,8,12,0.8)";
      c.fillRect(d.end.x + 4, y - 12, mx.width + 8, 14);
      c.fillStyle = c.strokeStyle;
      c.fillText(label, d.end.x + 8, y - 1);
    });
    c.setLineDash([]);
  }

  _drawFibFan(d) {
    const c = this.ctx;
    const ratios = [0, 0.382, 0.5, 0.618, 1];
    const dy = d.end.y - d.start.y, dx = d.end.x - d.start.x;
    const BIG = Math.max(this._w, this._h) * 3;
    c.font = "10px system-ui";
    ratios.forEach((r, i) => {
      const tx = d.start.x + dx, ty = d.start.y + dy * r;
      const vx = tx - d.start.x, vy = ty - d.start.y;
      const vl = Math.sqrt(vx*vx + vy*vy); if (!vl) return;
      c.strokeStyle = d.color; c.globalAlpha = 0.6 - i * 0.08; c.lineWidth = 1;
      c.beginPath(); c.moveTo(d.start.x, d.start.y);
      c.lineTo(d.start.x + vx/vl*BIG, d.start.y + vy/vl*BIG); c.stroke();
      c.fillStyle = d.color; c.globalAlpha = 0.9;
      c.fillText(`${(r*100).toFixed(0)}%`, d.start.x + vx/vl*80 + 4, d.start.y + vy/vl*80);
    });
    c.beginPath(); c.arc(d.start.x, d.start.y, 3, 0, Math.PI*2); c.fill();
  }

  _drawBrush(d) {
    if (!d.points || d.points.length < 2) return;
    const c = this.ctx;
    c.beginPath(); c.moveTo(d.points[0].x, d.points[0].y);
    d.points.forEach(p => c.lineTo(p.x, p.y)); c.stroke();
  }

  _drawRect(d) {
    const c = this.ctx;
    const w = d.end.x - d.start.x, h = d.end.y - d.start.y;
    c.strokeRect(d.start.x, d.start.y, w, h);
    c.globalAlpha = 0.07; c.fillRect(d.start.x, d.start.y, w, h);
  }

  _drawEllipse(d) {
    const c = this.ctx;
    const cx = (d.start.x + d.end.x) / 2, cy = (d.start.y + d.end.y) / 2;
    const rx = Math.abs(d.end.x - d.start.x) / 2, ry = Math.abs(d.end.y - d.start.y) / 2;
    c.beginPath(); c.ellipse(cx, cy, rx || 1, ry || 1, 0, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = 0.06; c.fill();
  }

  _drawRiskZones(d, isLong) {
    const c = this.ctx;
    const x = Math.min(d.start.x, d.end.x);
    const w = Math.abs(d.end.x - d.start.x) || 100;
    const entryY = d.start.y, targetY = d.end.y;
    const rr = 0.5;
    const stopY = isLong ? entryY + (entryY - targetY) * rr : entryY - (targetY - entryY) * rr;
    const [tpColor, slColor] = isLong ? ["#00c894","#ff4d6a"] : ["#ff4d6a","#00c894"];

    c.globalAlpha = 0.14;
    c.fillStyle = tpColor;
    c.fillRect(x, isLong ? targetY : entryY, w, isLong ? entryY - targetY : targetY - entryY);
    c.fillStyle = slColor;
    c.fillRect(x, isLong ? entryY : stopY, w, isLong ? stopY - entryY : entryY - stopY);
    c.globalAlpha = 1;

    c.lineWidth = 1.5; c.strokeStyle = "#ffd166";
    c.beginPath(); c.moveTo(x, entryY); c.lineTo(x + w, entryY); c.stroke();
    c.lineWidth = 1.5; c.strokeStyle = tpColor;
    c.beginPath(); c.moveTo(x, targetY); c.lineTo(x + w, targetY); c.stroke();
    c.lineWidth = 1; c.strokeStyle = slColor; c.setLineDash([4, 3]);
    c.beginPath(); c.moveTo(x, stopY); c.lineTo(x + w, stopY); c.stroke();
    c.setLineDash([]);

    c.font = "bold 11px system-ui";
    c.fillStyle = tpColor; c.fillText("TP", x + 5, isLong ? targetY - 4 : targetY + 12);
    c.fillStyle = "#ffd166"; c.fillText("Entrada", x + 5, entryY - 4);
    c.fillStyle = slColor; c.fillText("SL", x + 5, isLong ? stopY + 12 : stopY - 4);
  }

  _drawLong(d)  { this._drawRiskZones(d, true); }
  _drawShort(d) { this._drawRiskZones(d, false); }

  _drawMeasure(d) {
    const c = this.ctx;
    const dy = d.end.y - d.start.y;
    const pct = Math.abs(dy / (d.start.y || 1) * 100).toFixed(2);
    c.strokeStyle = "#a78bfa"; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(d.start.x, d.start.y); c.lineTo(d.end.x, d.end.y); c.stroke();
    c.lineWidth = 1; c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(d.end.x, d.start.y); c.lineTo(d.end.x, d.end.y); c.stroke();
    c.beginPath(); c.moveTo(d.start.x, d.start.y); c.lineTo(d.end.x, d.start.y); c.stroke();
    c.setLineDash([]);
    c.font = "11px system-ui"; c.fillStyle = "#a78bfa";
    const mx = (d.start.x + d.end.x) / 2, my = (d.start.y + d.end.y) / 2;
    const lbl = `${pct}%`;
    const tw = c.measureText(lbl).width;
    c.fillStyle = "rgba(8,8,14,0.88)"; c.fillRect(mx - tw/2 - 4, my - 13, tw + 8, 16);
    c.fillStyle = "#a78bfa"; c.fillText(lbl, mx - tw/2, my);
  }

  _drawTimeRuler(d) {
    const c = this.ctx;
    const x1 = d.start.x, x2 = d.end.x, y = d.start.y;
    c.strokeStyle = "#f59e0b"; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x1, y); c.lineTo(x2, y); c.stroke();
    c.lineWidth = 1;
    [[x1, 8],[x2, 8]].forEach(([x, half]) => { c.beginPath(); c.moveTo(x, y-half); c.lineTo(x, y+half); c.stroke(); });
    for (let i = 1; i < 5; i++) {
      const tx = x1 + (x2 - x1) * (i / 5);
      c.beginPath(); c.moveTo(tx, y - 4); c.lineTo(tx, y + 4); c.stroke();
    }
    c.font = "11px system-ui";
    const lbl = `${Math.round(Math.abs(x2 - x1))}px`;
    const tw = c.measureText(lbl).width, mx = (x1 + x2) / 2;
    c.fillStyle = "rgba(8,8,14,0.88)"; c.fillRect(mx - tw/2 - 4, y - 22, tw + 8, 15);
    c.fillStyle = "#f59e0b"; c.fillText(lbl, mx - tw/2, y - 11);
  }

  _drawABCD(d) {
    const c = this.ctx;
    const { start: s, end: e } = d;
    const bx = s.x + (e.x - s.x) * 0.33, by = s.y + (e.y - s.y) * -0.6;
    const cx2 = s.x + (e.x - s.x) * 0.66, cy = by + (e.y - by) * 0.38;
    const pts = [[s.x, s.y],[bx, by],[cx2, cy],[e.x, e.y]];
    c.strokeStyle = "#f5a623"; c.lineWidth = 1.5;
    c.beginPath(); pts.forEach(([x, y], i) => i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)); c.stroke();
    c.font = "bold 11px system-ui"; c.fillStyle = "#f5a623";
    ["A","B","C","D"].forEach((lbl, i) => {
      c.beginPath(); c.arc(pts[i][0], pts[i][1], 3, 0, Math.PI*2); c.fill();
      c.fillText(lbl, pts[i][0] + 5, pts[i][1] - 5);
    });
  }

  _drawHarmonic(d) {
    const c = this.ctx;
    const { start: s, end: e } = d;
    const w = e.x - s.x, h = e.y - s.y;
    const pts = [
      [s.x, s.y],
      [s.x + w * 0.25, s.y + h],
      [s.x + w * 0.5,  s.y + h * 0.38],
      [s.x + w * 0.75, s.y + h],
      [e.x, s.y + h * 0.12]
    ];
    c.strokeStyle = "#f59e0b"; c.lineWidth = 1.5;
    c.beginPath(); pts.forEach(([x, y], i) => i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)); c.stroke();
    c.font = "bold 11px system-ui"; c.fillStyle = "#f59e0b";
    ["X","A","B","C","D"].forEach((lbl, i) => {
      c.beginPath(); c.arc(pts[i][0], pts[i][1], 3, 0, Math.PI*2); c.fill();
      c.fillText(lbl, pts[i][0] + 5, pts[i][1] - 5);
    });
  }

  _drawTextLabel(d) {
    const c = this.ctx;
    c.font = "13px system-ui"; c.fillStyle = "#dce5ff";
    c.fillText(d.text, d.pos.x, d.pos.y);
  }

  _placeTextInput(pos) {
    const input = document.createElement("input");
    input.type = "text";
    Object.assign(input.style, {
      position: "absolute", left: pos.x + "px", top: (pos.y - 16) + "px",
      background: "rgba(8,8,14,0.92)", color: "#dce5ff",
      border: "1px solid rgba(111,134,255,0.5)", borderRadius: "4px",
      padding: "3px 7px", fontSize: "13px", fontFamily: "system-ui",
      zIndex: "50", minWidth: "90px", outline: "none"
    });
    this.container.appendChild(input);
    input.focus();
    const finalize = () => {
      const text = input.value.trim();
      if (text) { this.drawings.push({ type: "text-label", pos: { ...pos }, text, color: "#dce5ff" }); this._redraw(); }
      input.remove();
    };
    input.addEventListener("blur", finalize);
    input.addEventListener("keydown", e => { if (e.key === "Enter") finalize(); if (e.key === "Escape") input.remove(); });
  }
}

let drawingEngine = null;

function initDrawingEngine() {
  if (drawingEngine) return;
  const canvas = document.getElementById("drawingCanvas");
  const container = document.getElementById("marketChart");
  if (!canvas || !container) return;
  drawingEngine = new ChartDrawingEngine(canvas, container);

  const toolbar = document.getElementById("chartDrawingToolbar");
  if (!toolbar) return;

  toolbar.addEventListener("click", e => {
    const btn = e.target.closest(".cdt-btn");
    if (!btn) return;
    const tool = btn.dataset.tool;

    if (tool === "__undo") { drawingEngine.undo(); return; }
    if (tool === "__clear") { drawingEngine.clear(); return; }

    toolbar.querySelectorAll(".cdt-btn").forEach(b => b.classList.remove("cdt-active"));
    btn.classList.add("cdt-active");
    drawingEngine.setTool(tool || null);
  });
}

let _appInitialized = false;

function detectBrowser(ua) {
  if (/Edg\//.test(ua)) return "Microsoft Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/Chrome\//.test(ua)) return "Google Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "Navegador";
}
function detectOS(ua) {
  if (/Windows NT/.test(ua)) return "Windows";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad/.test(ua)) return "iOS";
  if (/Linux/.test(ua)) return "Linux";
  return "SO desconocido";
}
function recordActivityEntry(uid) {
  try {
    const key = `bp-activity-${uid}`;
    const entries = JSON.parse(localStorage.getItem(key) || "[]");
    const ua = navigator.userAgent;
    const browser = detectBrowser(ua);
    const os = detectOS(ua);
    entries.unshift({ date: new Date().toISOString(), device: `${browser} · ${os}` });
    if (entries.length > 20) entries.length = 20;
    localStorage.setItem(key, JSON.stringify(entries));
  } catch {}
}

window.BlackPortfolioAuth.firebaseAuth.onAuthStateChanged(async function(user) {
  if (!user) { window.location.href = "login.html"; return; }
  // Gate 2FA: si el usuario tiene 2FA activo pero no lo verificó en esta sesión,
  // forzar el paso por login.html (impide entrar navegando directo a main.html).
  if (sessionStorage.getItem("totp_verified") !== user.uid) {
    let isDemo = false;
    try { isDemo = JSON.parse(localStorage.getItem("bp-extra-" + user.uid) || "{}").isDemo === true; } catch {}
    if (!isDemo && await window.BlackPortfolioAuth.isTwoFactorEnabled(user.uid)) {
      window.location.href = "login.html";
      return;
    }
    sessionStorage.setItem("totp_verified", user.uid);
  }
  const session = window.BlackPortfolioAuth.buildSession(user);
  renderUser(session);
  applyPlanRestrictions(session);
  if (!_appInitialized) {
    _appInitialized = true;
    updateHeading("home");
    window.BlackPortfolioAuth.startSessionTimeout();
    recordActivityEntry(user.uid);
  }
});

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    activateSection(item.dataset.section);
    if (isMobileViewport() && mobileSidebarOpen) {
      mobileSidebarOpen = false;
      hideMobileSidebar();
    }
  });
});

resetHomeButton.addEventListener("click", () => {
  if (confirm("¿Restablecer el inicio? Se perderán todos los espacios y tarjetas personalizadas.")) {
    localStorage.removeItem(hubStorageKey);
    location.reload();
  }
});

logoutButton.addEventListener("click", handleLogout);
logoutButtonSecondary.addEventListener("click", handleLogout);

// ── Sidebar Toggle ────────────────────────────────────────────────────────────
const dashboardMain = document.querySelector(".dashboard-main");
const dashboardSidebarShell = document.querySelector(".dashboard-sidebar-shell");

const sidebarBackdrop = document.createElement("div");
sidebarBackdrop.className = "sidebar-backdrop";
dashboardMain.appendChild(sidebarBackdrop);

const isMobileViewport = () => window.innerWidth <= 1100;

function hideMobileSidebar() {
  dashboardSidebarShell.style.transition = "none";
  dashboardSidebarShell.style.transform = "translateX(-110%)";
  dashboardSidebarShell.style.pointerEvents = "none";
  sidebarBackdrop.classList.remove("active");
}

function showMobileSidebar() {
  dashboardSidebarShell.style.transition = "transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)";
  dashboardSidebarShell.getBoundingClientRect(); // force reflow so browser records new transition before transform change
  dashboardSidebarShell.style.transform = "translateX(0)";
  dashboardSidebarShell.style.pointerEvents = "auto";
  sidebarBackdrop.classList.add("active");
}

function clearMobileStyles() {
  dashboardSidebarShell.style.transform = "";
  dashboardSidebarShell.style.transition = "";
  dashboardSidebarShell.style.pointerEvents = "";
}

if (isMobileViewport()) {
  hideMobileSidebar();
} else if (localStorage.getItem("bp_sidebar_collapsed") === "1") {
  dashboardMain.classList.add("sidebar-collapsed");
}

let mobileSidebarOpen = false;

function handleSidebarToggle() {
  if (isMobileViewport()) {
    mobileSidebarOpen = !mobileSidebarOpen;
    if (mobileSidebarOpen) showMobileSidebar(); else hideMobileSidebar();
  } else {
    const collapsed = dashboardMain.classList.toggle("sidebar-collapsed");
    localStorage.setItem("bp_sidebar_collapsed", collapsed ? "1" : "0");
  }
}

document.getElementById("sidebarToggleBtn").addEventListener("click", handleSidebarToggle);
document.getElementById("sidebarCloseBtn").addEventListener("click", handleSidebarToggle);

sidebarBackdrop.addEventListener("click", () => {
  mobileSidebarOpen = false;
  hideMobileSidebar();
});

let wasDesktop = !isMobileViewport();
window.addEventListener("resize", () => {
  const isDesktopNow = !isMobileViewport();
  if (isDesktopNow && !wasDesktop) {
    mobileSidebarOpen = false;
    clearMobileStyles();
    sidebarBackdrop.classList.remove("active");
    if (localStorage.getItem("bp_sidebar_collapsed") === "1") {
      dashboardMain.classList.add("sidebar-collapsed");
    } else {
      dashboardMain.classList.remove("sidebar-collapsed");
    }
  } else if (!isDesktopNow && wasDesktop) {
    mobileSidebarOpen = false;
    hideMobileSidebar();
  }
  wasDesktop = isDesktopNow;
});

// ── Theme Toggle ──────────────────────────────────────────────────────────────

const themeStorageKey = "blackportfolio-theme";

function initializeTheme() {
  const savedTheme = localStorage.getItem(themeStorageKey) || "dark";
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("light-mode", !isDark);
  localStorage.setItem(themeStorageKey, theme);
  updateThemeButton(theme);
  window.redrawMarkowitzCharts?.();
}

function toggleTheme() {
  const currentTheme = document.body.classList.contains("light-mode") ? "light" : "dark";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(newTheme);
}

function updateThemeButton(theme) {
  const btn = document.getElementById("themeToggleButton");
  if (!btn) return;
  const isDark = theme === "dark";
  btn.querySelector(".theme-icon").textContent = isDark ? "🌙" : "☀️";
  btn.querySelector(".theme-label").textContent = isDark ? "Tema oscuro" : "Tema claro";
}

initializeTheme();
document.getElementById("themeToggleButton")?.addEventListener("click", toggleTheme);

// ── Company Info Toggle ───────────────────────────────────────────────────────

let companyInfoVisible = false;

function formatLargeNumber(n) {
  if (!n || isNaN(n)) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString();
}

function formatPercent(n) {
  if (n == null || isNaN(n)) return "—";
  return `${(n * 100).toFixed(2)}%`;
}

let financialsCache = null;
let financialsSymbol = null;
let financialsPeriod = "annual";
let seasonalityCache = null;
let seasonalitySymbol = null;
let seasonalityPeriod = 20;
let seasonalityView = "chart";

function extractDomain(website) {
  try { return new URL(website).hostname.replace(/^www\./, ""); } catch { return null; }
}

function logoImgHtml(domain) {
  if (!domain) return "";
  const primary = `https://logo.clearbit.com/${domain}?size=64`;
  const fallback = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  return `<img class="company-logo" src="${primary}" data-fb="${fallback}" onerror="var f=this.getAttribute('data-fb');if(f){this.removeAttribute('data-fb');this.src=f;}else{this.style.display='none';}" alt="">`;
}

function getFundFamilyDomain(fundFamily) {
  if (!fundFamily) return null;
  const f = fundFamily.toLowerCase();
  const map = [
    ["vanguard", "vanguard.com"],
    ["ishares by blackrock", "ishares.com"],
    ["ishares", "ishares.com"],
    ["spdr", "ssga.com"],
    ["state street", "ssga.com"],
    ["fidelity", "fidelity.com"],
    ["invesco", "invesco.com"],
    ["charles schwab", "schwab.com"],
    ["schwab", "schwab.com"],
    ["proshares", "proshares.com"],
    ["ark investment", "ark-funds.com"],
    ["ark", "ark-funds.com"],
    ["wisdomtree", "wisdomtree.com"],
    ["vaneck", "vaneck.com"],
    ["first trust", "ftportfolios.com"],
    ["global x", "globalxetfs.com"],
    ["direxion", "direxion.com"],
    ["t. rowe price", "troweprice.com"],
    ["american funds", "americanfunds.com"],
    ["pimco", "pimco.com"],
    ["dimensional", "dimensional.com"],
    ["blackrock", "blackrock.com"],
    ["nuveen", "nuveen.com"],
    ["j.p. morgan", "am.jpmorgan.com"],
    ["jpmorgan", "am.jpmorgan.com"],
    ["goldman sachs", "gsam.com"],
    ["morgan stanley", "morganstanley.com"],
    ["franklin templeton", "franklintempleton.com"],
    ["franklin", "franklintempleton.com"],
    ["templeton", "franklintempleton.com"],
    ["columbia", "columbiathreadneedleus.com"],
    ["calvert", "calvert.com"],
  ];
  for (const [key, domain] of map) {
    if (f.includes(key)) return domain;
  }
  return null;
}

async function loadCompanyInfo(symbol) {
  const content = document.getElementById("companyInfoContent");
  content.innerHTML = '<div class="company-info-animation"><iframe src="Resourses/Finance Loader.html" frameborder="0" scrolling="no" title="Cargando información financiera"></iframe></div>';

  try {
    const res = await fetch(`${API_BASE_URL}/info/${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error("Error al obtener datos");
    const data = await res.json();

    if (!data || !data.symbol) throw new Error("Sin datos disponibles para este ticker");

    const change = data.regularMarketChange;
    const changePct = data.regularMarketChangePercent;
    const isPositive = change >= 0;

    const stats = [
      { label: "Precio", value: formatPrice(data.regularMarketPrice ?? data.currentPrice, data.currency) },
      { label: "Cambio", value: change != null ? `${isPositive ? "+" : ""}${change.toFixed(2)} (${formatPercent(changePct)})` : "—", cls: isPositive ? "positive" : "negative" },
      { label: "Cap. Mercado", value: formatLargeNumber(data.marketCap) },
      { label: "P/E Ratio", value: data.trailingPE?.toFixed(2) ?? "—" },
      { label: "Beta", value: data.beta?.toFixed(2) ?? "—" },
      { label: "Div. Yield", value: data.dividendYield != null && !isNaN(data.dividendYield) ? `${(data.dividendYield > 1 ? data.dividendYield : data.dividendYield * 100).toFixed(2)}%` : null },
      { label: "Sector", value: data.sector || "—" },
      { label: "Industria", value: data.industry || "—" },
      { label: "Empleados", value: data.fullTimeEmployees?.toLocaleString() ?? "—" },
      { label: "País", value: data.country || "—" },
    ].filter(s => s.value !== "—");

    const description = data.longBusinessSummary;
    const isFund = data.quoteType === "ETF" || data.quoteType === "MUTUALFUND";
    const domain = data.website
      ? extractDomain(data.website)
      : (isFund ? getFundFamilyDomain(data.fundFamily) : null);

    content.innerHTML = `
      <div class="company-info-header">
        <div class="company-title-row">
          ${logoImgHtml(domain)}
          <h2>${data.longName || data.shortName || symbol}</h2>
        </div>
        <div class="company-meta">
          ${data.exchange ? `<span class="company-meta-tag">${data.exchange}</span>` : ""}
          ${data.quoteType ? `<span class="company-meta-tag">${data.quoteType}</span>` : ""}
          ${data.website ? `<span class="company-meta-tag"><a href="${data.website}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;">${data.website.replace(/^https?:\/\//, "")}</a></span>` : ""}
        </div>
      </div>
      ${description ? `
      <div class="company-description">
        <p>${description}</p>
      </div>` : ""}
      <div class="company-stats-grid">
        ${stats.map(s => `
          <div class="company-stat-card">
            <span class="company-stat-label">${s.label}</span>
            <span class="company-stat-value${s.cls ? " " + s.cls : ""}">${s.value}</span>
          </div>`).join("")}
      </div>
      ${isFund ? `
      <div class="financials-section etf-holdings-section">
        <div class="financials-header">
          <h3>Top 10 Holdings</h3>
        </div>
        <div id="etfHoldingsContent" class="etf-holdings-content">
          <div class="company-info-animation small"><iframe src="Resourses/Finance Loader.html" frameborder="0" scrolling="no" title="Cargando holdings"></iframe></div>
        </div>
      </div>
      ` : `
      <div class="financials-section">
        <div class="financials-header">
          <h3>Estados Financieros</h3>
          <div class="financials-controls">
            <div class="fin-period-toggle">
              <button class="fin-period active" data-period="annual">Anual</button>
              <button class="fin-period" data-period="quarterly">Trimestral</button>
            </div>
            <div class="financials-tabs">
              <button class="fin-tab active" data-fin-tab="income">Ingresos</button>
              <button class="fin-tab" data-fin-tab="balance">Balance</button>
              <button class="fin-tab" data-fin-tab="cashflow">Flujo de Caja</button>
              <button class="fin-tab" data-fin-tab="dividends">Dividendos</button>
              <button class="fin-tab" data-fin-tab="seasonal">Estacionales</button>
            </div>
          </div>
        </div>
        <div id="financialsContent" class="financials-content">
          <div class="company-info-animation small"><iframe src="Resourses/Finance Loader.html" frameborder="0" scrolling="no" title="Cargando estados financieros"></iframe></div>
        </div>
      </div>
      `}
    `;

    if (isFund) {
      loadEtfHoldings(symbol);
    } else {
      content.querySelectorAll(".fin-tab").forEach(btn => {
        btn.addEventListener("click", () => {
          content.querySelectorAll(".fin-tab").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          const tab = btn.dataset.finTab;
          const periodToggle = content.querySelector(".fin-period-toggle");
          if (periodToggle) periodToggle.style.visibility = (tab === "dividends" || tab === "seasonal") ? "hidden" : "";
          if (tab === "dividends") {
            loadDividends(symbol);
          } else if (tab === "seasonal") {
            loadSeasonality(symbol);
          } else if (financialsCache && financialsSymbol === symbol) {
            renderFinancials(financialsCache, tab, financialsPeriod);
          }
        });
      });

      content.querySelectorAll(".fin-period").forEach(btn => {
        btn.addEventListener("click", () => {
          content.querySelectorAll(".fin-period").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          financialsPeriod = btn.dataset.period;
          const activeTab = content.querySelector(".fin-tab.active")?.dataset.finTab || "income";
          if (activeTab !== "dividends" && financialsCache && financialsSymbol === symbol) {
            renderFinancials(financialsCache, activeTab, financialsPeriod);
          }
        });
      });

      const fvHtml = renderFairValue(data);
      if (fvHtml) {
        const finSection = content.querySelector(".financials-section");
        if (finSection) finSection.insertAdjacentHTML("beforebegin", fvHtml);
      }

      loadFinancials(symbol);
    }
  } catch (err) {
    content.innerHTML = `<div class="company-info-error">No fue posible cargar la información: ${err.message}</div>`;
  }
}

function renderFairValue(data) {
  const price = data.regularMarketPrice ?? data.currentPrice;
  const targetMean = data.targetMeanPrice;
  const targetLow = data.targetLowPrice;
  const targetHigh = data.targetHighPrice;
  const analystCount = data.numberOfAnalystOpinions;
  const w52Low = data.fiftyTwoWeekLow;
  const w52High = data.fiftyTwoWeekHigh;
  const currency = data.currency || "USD";

  if (!targetMean && !w52Low) return "";

  const upside = targetMean && price ? ((targetMean - price) / price * 100) : null;
  const upsideText = upside != null ? `${upside >= 0 ? "+" : ""}${upside.toFixed(1)}% al alza` : null;
  const upsideClass = upside != null ? (upside >= 0 ? "fv-pos" : "fv-neg") : "";

  let risk = null, riskClass = "";
  const beta = data.beta;
  if (beta != null) {
    if (beta < 0.8) { risk = "BAJO"; riskClass = "fv-risk-low"; }
    else if (beta < 1.4) { risk = "MEDIO"; riskClass = "fv-risk-mid"; }
    else { risk = "ALTO"; riskClass = "fv-risk-high"; }
  }

  const allLows  = [targetLow, w52Low].filter(v => v != null);
  const allHighs = [targetHigh, w52High].filter(v => v != null);
  const spreadLow  = allLows.length  ? Math.min(...allLows)  : null;
  const spreadHigh = allHighs.length ? Math.max(...allHighs) : null;

  const fmt = (v) => v != null && isFinite(v)
    ? new Intl.NumberFormat("en-US", { style:"currency", currency, maximumFractionDigits: 2 }).format(v)
    : "--";

  function rangeBar(dotVal, low, high) {
    if (low == null || high == null || dotVal == null) return "";
    const range = high - low;
    if (range <= 0) return "";
    const pct = Math.max(2, Math.min(98, ((dotVal - low) / range) * 100)).toFixed(1);
    return `<div class="fv-bar-current">${fmt(dotVal)}</div>
      <div class="fv-bar-track"><div class="fv-bar-dot" style="left:${pct}%"></div></div>
      <div class="fv-bar-ends"><span>${fmt(low)}</span><span>${fmt(high)}</span></div>`;
  }

  const rows = [];
  if (w52Low != null && w52High != null && price != null) {
    rows.push(`<div class="fv-row">
      <div class="fv-row-meta"><span class="fv-row-name">Rango de mercado</span><span class="fv-row-sub">52 semanas</span></div>
      <div class="fv-row-bar">${rangeBar(price, w52Low, w52High)}</div>
    </div>`);
  }
  if (targetLow != null && targetHigh != null && targetMean != null) {
    rows.push(`<div class="fv-row">
      <div class="fv-row-meta"><span class="fv-row-name">Objetivo de analistas</span>${analystCount ? `<span class="fv-row-sub">${analystCount} analistas</span>` : ""}</div>
      <div class="fv-row-bar">${rangeBar(targetMean, targetLow, targetHigh)}</div>
    </div>`);
  }

  const eps = data.trailingEps;
  if (eps > 0 && price != null) {
    const models = [eps * 12, eps * 18, eps * 25].filter(v => v > price * 0.1 && v < price * 10);
    if (targetMean) models.push(targetMean);
    if (models.length >= 2) {
      const mLow  = Math.min(...models);
      const mHigh = Math.max(...models);
      const mMean = models.reduce((a, b) => a + b, 0) / models.length;
      rows.push(`<div class="fv-row">
        <div class="fv-row-meta"><span class="fv-row-name">Modelos de valoración</span><span class="fv-row-sub">${models.length} modelos</span></div>
        <div class="fv-row-bar">${rangeBar(mMean, mLow, mHigh)}</div>
      </div>`);
    }
  }

  if (!rows.length) return "";

  return `<div class="fv-section">
    <div class="fv-header"><h3>Valor razonable</h3></div>
    <div class="fv-kpi-row">
      ${targetMean != null ? `<div class="fv-kpi">
        <span class="fv-kpi-label">Promedio</span>
        <span class="fv-kpi-value fv-pos">${fmt(targetMean)}</span>
        ${upsideText ? `<span class="fv-kpi-sub ${upsideClass}">${upsideText}</span>` : ""}
      </div>` : ""}
      ${risk ? `<div class="fv-kpi fv-kpi-sep">
        <span class="fv-kpi-label">Riesgo</span>
        <span class="fv-kpi-value ${riskClass}">${risk}</span>
      </div>` : ""}
      ${spreadLow != null && spreadHigh != null ? `<div class="fv-kpi fv-kpi-sep">
        <span class="fv-kpi-label">Spread</span>
        <span class="fv-kpi-value fv-spread">${fmt(spreadLow)} – ${fmt(spreadHigh)}</span>
      </div>` : ""}
    </div>
    <div class="fv-rows">${rows.join("")}</div>
  </div>`;
}

async function loadFinancials(symbol) {
  const container = document.getElementById("financialsContent");
  if (!container) return;

  if (financialsSymbol === symbol && financialsCache) {
    renderFinancials(financialsCache, "income", financialsPeriod);
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/financials/${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error("Sin datos financieros");
    const data = await res.json();
    if (!data?.income) throw new Error("Sin datos financieros");

    financialsCache = data;
    financialsSymbol = symbol;
    renderFinancials(data, "income", financialsPeriod);
  } catch (err) {
    if (container) container.innerHTML = `<div class="company-info-error">${err.message}</div>`;
  }
}

let dividendsCache = null;
let dividendsSymbol = null;

async function loadDividends(symbol) {
  const container = document.getElementById("financialsContent");
  if (!container) return;

  container.innerHTML = '<div class="company-info-animation small"><iframe src="Resourses/Finance Loader.html" frameborder="0" scrolling="no" title="Cargando dividendos"></iframe></div>';

  if (dividendsSymbol === symbol && dividendsCache) {
    renderDividends(dividendsCache);
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/dividends/${encodeURIComponent(symbol)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Sin datos de dividendos");
    }
    const data = await res.json();
    dividendsCache = data;
    dividendsSymbol = symbol;
    renderDividends(data);
  } catch (err) {
    if (container) container.innerHTML = `<div class="company-info-error">${err.message}</div>`;
  }
}

function renderDividends(data) {
  const container = document.getElementById("financialsContent");
  if (!container) return;

  const { summary = {}, history = [] } = data;

  // yfinance returns yield/fiveYrAvg as %-already (0.38 = 0.38%), payout as decimal (0.13 = 13%)
  const fmtYield  = v => (v != null && isFinite(v)) ? `${Number(v).toFixed(2)}%` : "—";
  const fmtPayout = v => (v != null && isFinite(v)) ? `${(v * 100).toFixed(2)}%` : "—";
  const fmtUSD    = v => (v != null && isFinite(v)) ? `$${Number(v).toFixed(2)}` : "—";

  const kpis = [
    { label: "Dividendo Anual",    value: fmtUSD(summary.forward ?? summary.trailing) },
    { label: "Yield",              value: fmtYield(summary.yield) },
    { label: "Payout Ratio",       value: fmtPayout(summary.payout) },
    { label: "Yield Promedio 5A",  value: fmtYield(summary.fiveYrAvg) },
    { label: "Fecha Ex-Dividendo", value: summary.exDate || "—" },
    { label: "Frecuencia",         value: summary.frequency || "—" },
  ];

  const hasHistory = history.length > 0;
  const histRows = hasHistory ? history.map(h => {
    const amt = h.amount != null ? `$${Number(h.amount).toFixed(2)}` : "—";
    return `<tr>
      <td style="text-align:left;color:rgba(200,210,240,.75)">${h.date || "—"}</td>
      <td>${amt}</td>
    </tr>`;
  }).join("") : "";

  container.innerHTML = `
    <div class="div-kpi-row">
      ${kpis.map(k => `
        <div class="div-kpi">
          <span class="div-kpi-label">${k.label}</span>
          <span class="div-kpi-value">${k.value}</span>
        </div>`).join("")}
    </div>
    ${hasHistory ? `
    <div class="fin-note">Historial de dividendos · Fuente: Yahoo Finance</div>
    <div class="fin-table-wrap">
      <table class="fin-table" style="min-width:0">
        <thead><tr>
          <th style="text-align:left">Fecha Ex-Div</th>
          <th>Monto</th>
        </tr></thead>
        <tbody>${histRows}</tbody>
      </table>
    </div>` : `<div class="company-info-error">Sin historial de dividendos disponible.</div>`}
  `;
}

async function loadSeasonality(symbol) {
  const container = document.getElementById("financialsContent");
  if (!container) return;
  container.innerHTML = '<div class="company-info-animation small"><iframe src="Resourses/Finance Loader.html" frameborder="0" scrolling="no" title="Cargando estacionales"></iframe></div>';
  if (seasonalitySymbol === symbol && seasonalityCache) {
    renderSeasonality(seasonalityCache);
    return;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/seasonality/${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error("Sin datos de estacionalidad");
    const data = await res.json();
    seasonalityCache = data;
    seasonalitySymbol = symbol;
    renderSeasonality(data);
  } catch (err) {
    if (container) container.innerHTML = `<div class="company-info-error">${err.message}</div>`;
  }
}

function renderSeasonality(data) {
  const container = document.getElementById("financialsContent");
  if (!container) return;
  const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const allYears = (data.years || []).slice().sort();
  const filtered = seasonalityPeriod === 0 ? allYears : allYears.slice(-seasonalityPeriod);

  container.innerHTML = `
    <div class="seasonal-toolbar">
      <div class="seasonal-view-toggle">
        <button class="seas-view-btn${seasonalityView === "chart" ? " active" : ""}" data-view="chart" title="Gráfica">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><polyline points="1,13 5,7 8,9 12,4 15,6" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="seas-view-btn${seasonalityView === "table" ? " active" : ""}" data-view="table" title="Tabla">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="1" y1="5.5" x2="15" y2="5.5" stroke="currentColor" stroke-width="1.2"/><line x1="1" y1="9.5" x2="15" y2="9.5" stroke="currentColor" stroke-width="1.2"/><line x1="5" y1="5.5" x2="5" y2="15" stroke="currentColor" stroke-width="1.2"/></svg>
        </button>
      </div>
      <div class="seasonal-period-btns">
        ${[5,10,20,0].map(p => `<button class="seas-period-btn${seasonalityPeriod === p ? " active" : ""}" data-period="${p}">${p === 0 ? "Todo" : p + "A"}</button>`).join("")}
      </div>
    </div>
    <div id="seasonalContent"></div>
  `;

  container.querySelectorAll(".seas-view-btn").forEach(btn => {
    btn.addEventListener("click", () => { seasonalityView = btn.dataset.view; renderSeasonality(data); });
  });
  container.querySelectorAll(".seas-period-btn").forEach(btn => {
    btn.addEventListener("click", () => { seasonalityPeriod = parseInt(btn.dataset.period); renderSeasonality(data); });
  });

  const inner = document.getElementById("seasonalContent");
  if (seasonalityView === "chart") renderSeasonalChart(data, filtered, MONTHS, inner);
  else renderSeasonalTable(data, filtered, MONTHS, inner);
}

function renderSeasonalChart(data, years, MONTHS, container) {
  const PALETTE = [
    "#6f86ff","#ff6b81","#2ec4b6","#c77dff","#66bb6a","#ef5350","#42a5f5","#ffa726",
    "#ec407a","#4dd0e1","#d4e157","#ff7043","#26a69a","#7e57c2","#29b6f6","#5c6bc0",
    "#f06292","#ffca28","#a5d6a7","#ce93d8","#80cbc4","#ff8a65","#9ccc65","#78909c",
  ];

  container.innerHTML = `
    <div class="seasonal-canvas-wrap">
      <canvas id="seasonalCanvas"></canvas>
      <div id="seasonalTooltip" class="seas-tooltip"></div>
    </div>
    <div class="fin-note" style="margin-top:8px">Retorno acumulado desde inicio de año · Promedio en dorado · Fuente: Yahoo Finance</div>
  `;

  const wrap = container.querySelector(".seasonal-canvas-wrap");
  const canvas = document.getElementById("seasonalCanvas");
  const tooltip = document.getElementById("seasonalTooltip");

  const dpr = window.devicePixelRatio || 1;
  const CW = wrap.offsetWidth || 700;
  const CH = 340;
  canvas.width = CW * dpr;
  canvas.height = CH * dpr;
  canvas.style.width = CW + "px";
  canvas.style.height = CH + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const PAD = { top: 24, right: 120, bottom: 42, left: 56 };
  const plotW = CW - PAD.left - PAD.right;
  const plotH = CH - PAD.top - PAD.bottom;

  const allVals = [];
  years.forEach(yr => { if (data.data[yr]?.cumulative) allVals.push(...data.data[yr].cumulative); });
  if (data.average?.cumulative) allVals.push(...data.average.cumulative);
  if (!allVals.length) { container.innerHTML = '<div class="company-info-error">Sin datos suficientes.</div>'; return; }

  const rawMin = Math.min(...allVals), rawMax = Math.max(...allVals);
  const span = rawMax - rawMin;
  const rawStep = span < 12 ? 2 : span < 40 ? 5 : span < 100 ? 10 : span < 200 ? 20 : 50;
  const yMin = Math.floor((rawMin - rawStep * 0.6) / rawStep) * rawStep;
  const yMax = Math.ceil((rawMax + rawStep * 0.6) / rawStep) * rawStep;
  const yRange = yMax - yMin;

  const xPos = i => PAD.left + (i / 12) * plotW;
  const yPos = v => PAD.top + plotH - ((v - yMin) / yRange) * plotH;

  const lineData = years.map((yr, i) => ({
    yr, color: PALETTE[i % PALETTE.length], pts: data.data[yr]?.cumulative
  })).filter(d => d.pts);

  function draw(hSeg, hYr) {
    ctx.clearRect(0, 0, CW, CH);

    // Plot area subtle bg
    ctx.fillStyle = "rgba(255,255,255,0.012)";
    ctx.beginPath(); ctx.roundRect(PAD.left, PAD.top, plotW, plotH, 6); ctx.fill();

    // Horizontal grid + Y labels
    for (let v = yMin; v <= yMax; v += rawStep) {
      const y = yPos(v);
      const isZ = v === 0;
      ctx.strokeStyle = isZ ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.055)";
      ctx.lineWidth = isZ ? 1 : 0.7;
      ctx.setLineDash(isZ ? [5, 5] : []);
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + plotW, y); ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = isZ ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.28)";
      ctx.font = `${isZ ? 500 : 400} 10px Inter,sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText((v > 0 ? "+" : "") + v + "%", PAD.left - 7, y + 3.5);
    }

    // Vertical segments
    for (let i = 0; i <= 12; i++) {
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(xPos(i), PAD.top); ctx.lineTo(xPos(i), PAD.top + plotH); ctx.stroke();
    }

    // Hover segment highlight + crosshair
    if (hSeg >= 0) {
      const x1 = hSeg > 0 ? xPos(hSeg - 0.5) : PAD.left;
      const x2 = hSeg < 12 ? xPos(hSeg + 0.5) : PAD.left + plotW;
      ctx.fillStyle = "rgba(111,134,255,0.07)";
      ctx.fillRect(Math.max(PAD.left, x1), PAD.top, Math.min(x2, PAD.left + plotW) - Math.max(PAD.left, x1), plotH);
      ctx.strokeStyle = "rgba(111,134,255,0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      const xc = xPos(hSeg);
      ctx.beginPath(); ctx.moveTo(xc, PAD.top); ctx.lineTo(xc, PAD.top + plotH); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Year lines
    lineData.forEach(d => {
      const isH = hYr === d.yr;
      const dimmed = hYr && !isH;
      ctx.strokeStyle = d.color + (dimmed ? "25" : isH ? "ff" : "68");
      ctx.lineWidth = isH ? 2.2 : 1.05;
      if (isH) { ctx.shadowColor = d.color; ctx.shadowBlur = 10; }
      ctx.beginPath();
      d.pts.forEach((v, j) => { j === 0 ? ctx.moveTo(xPos(j), yPos(v)) : ctx.lineTo(xPos(j), yPos(v)); });
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Average line
    if (data.average?.cumulative) {
      const avgPts = data.average.cumulative;
      const dimAvg = hYr && hYr !== "__avg__";
      ctx.strokeStyle = dimAvg ? "#ffd16630" : "#ffd166";
      ctx.lineWidth = dimAvg ? 1.2 : 2.6;
      if (!dimAvg) { ctx.shadowColor = "#ffd166cc"; ctx.shadowBlur = 8; }
      ctx.beginPath();
      avgPts.forEach((v, j) => { j === 0 ? ctx.moveTo(xPos(j), yPos(v)) : ctx.lineTo(xPos(j), yPos(v)); });
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (!dimAvg) {
        const last = avgPts[12];
        ctx.fillStyle = "#ffd166";
        ctx.beginPath(); ctx.arc(xPos(12), yPos(last), 3.5, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Dot on hovered year at hovered segment
    if (hSeg >= 0 && hYr && hYr !== "__avg__") {
      const d = lineData.find(d => d.yr === hYr);
      if (d?.pts[hSeg] !== undefined) {
        ctx.fillStyle = d.color; ctx.shadowColor = d.color; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(xPos(hSeg), yPos(d.pts[hSeg]), 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    if (hSeg >= 0 && data.average?.cumulative && (hYr === "__avg__" || !hYr)) {
      const av = data.average.cumulative[hSeg];
      ctx.fillStyle = "#ffd166"; ctx.shadowColor = "#ffd166"; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(xPos(hSeg), yPos(av), 4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // X labels
    MONTHS.forEach((m, i) => {
      const isH = hSeg === i + 1;
      ctx.fillStyle = isH ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.3)";
      ctx.font = `${isH ? 600 : 400} 10.5px Inter,sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(m, xPos(i + 0.5), CH - PAD.bottom + 16);
    });

    // Legend — sorted by final return desc, up to 16
    const sorted = [...lineData].sort((a, b) => b.pts[12] - a.pts[12]).slice(0, 16);
    const legX = CW - PAD.right + 12;
    // Average first
    if (data.average?.cumulative) {
      const av = data.average.cumulative[12];
      const isH = hYr === "__avg__";
      ctx.fillStyle = isH ? "#ffd166" : "#ffd16688";
      ctx.beginPath(); ctx.arc(legX + 4, PAD.top + 8, isH ? 4 : 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = isH ? "rgba(255,209,102,0.95)" : "rgba(255,209,102,0.5)";
      ctx.font = `${isH ? 600 : 500} 9.5px Inter,sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(`Prom  ${av >= 0 ? "+" : ""}${av.toFixed(1)}%`, legX + 13, PAD.top + 12);
    }
    sorted.forEach((d, li) => {
      const final = d.pts[12];
      const isH = hYr === d.yr;
      const legY = PAD.top + 24 + li * 15;
      ctx.fillStyle = isH ? d.color : d.color + "88";
      ctx.beginPath(); ctx.arc(legX + 4, legY - 2.5, isH ? 4 : 2.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = isH ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.38)";
      ctx.font = `${isH ? 600 : 400} 9.5px Inter,sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(`${d.yr}  ${final >= 0 ? "+" : ""}${final.toFixed(1)}%`, legX + 13, legY);
    });
  }

  draw(-1, null);

  canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const seg = Math.max(0, Math.min(12, Math.round((mx - PAD.left) / plotW * 12)));

    // Find closest line at this segment
    let closest = null, minDist = 24;
    lineData.forEach(d => {
      const dist = Math.abs(my - yPos(d.pts[seg]));
      if (dist < minDist) { minDist = dist; closest = d.yr; }
    });
    if (data.average?.cumulative) {
      if (Math.abs(my - yPos(data.average.cumulative[seg])) < minDist) closest = "__avg__";
    }

    draw(seg, closest);

    // Tooltip
    const label = seg === 0 ? "Inicio de año" : MONTHS[seg - 1];
    const topLines = [...lineData].sort((a, b) => b.pts[seg] - a.pts[seg]);
    const rows = topLines.map(d => {
      const v = d.pts[seg];
      const isH = d.yr === closest;
      return `<div class="seas-tt-row${isH ? " seas-tt-hl" : ""}">
        <span><span class="seas-tt-dot" style="background:${d.color}"></span>${d.yr}</span>
        <span class="${v >= 0 ? "seas-pos" : "seas-neg"}">${v >= 0 ? "+" : ""}${v.toFixed(2)}%</span>
      </div>`;
    });
    if (data.average?.cumulative) {
      const av = data.average.cumulative[seg];
      const isH = closest === "__avg__";
      rows.unshift(`<div class="seas-tt-row seas-tt-avg${isH ? " seas-tt-hl" : ""}">
        <span><span class="seas-tt-dot" style="background:#ffd166"></span>Promedio</span>
        <span style="color:#ffd166">${av >= 0 ? "+" : ""}${av.toFixed(2)}%</span>
      </div>`);
    }
    tooltip.innerHTML = `<div class="seas-tt-label">${label}</div>${rows.join("")}`;
    tooltip.style.display = "block";
    const ttW = tooltip.offsetWidth;
    const tx = mx + ttW + 20 > CW ? mx - ttW - 12 : mx + 16;
    tooltip.style.left = tx + "px";
    tooltip.style.top = Math.max(4, my - 24) + "px";
  });

  canvas.addEventListener("mouseleave", () => {
    tooltip.style.display = "none";
    draw(-1, null);
  });
}

function renderSeasonalTable(data, years, MONTHS, container) {
  const fmtPct = v => {
    if (v === null || v === undefined) return '<span class="fin-null">—</span>';
    const cls = v > 0 ? "seas-pos" : v < 0 ? "seas-neg" : "";
    return `<span class="${cls}">${v >= 0 ? "+" : ""}${v.toFixed(2)}%</span>`;
  };
  const avgM = data.average?.monthly_returns || [];
  const avgC = data.average?.cumulative || [];

  const headerCols = [...years, "Prom."].map(y => `<th>${y}</th>`).join("");
  const monthRows = MONTHS.map((m, mi) => {
    const cells = years.map(yr => `<td>${fmtPct(data.data[yr]?.monthly_returns?.[mi] ?? null)}</td>`).join("");
    return `<tr><td class="fin-row-label">${m}</td>${cells}<td class="seas-avg-col">${fmtPct(avgM[mi] ?? null)}</td></tr>`;
  }).join("");
  const totalCells = years.map(yr => {
    const c = data.data[yr]?.cumulative;
    return `<td>${fmtPct(c ? c[c.length - 1] : null)}</td>`;
  }).join("");

  container.innerHTML = `
    <div class="fin-note">Retorno mensual % · Fuente: Yahoo Finance</div>
    <div class="fin-table-wrap">
      <table class="fin-table seas-table">
        <thead><tr><th class="fin-th-label">Mes</th>${headerCols}</tr></thead>
        <tbody>
          ${monthRows}
          <tr class="fin-row-bold seas-total-row">
            <td class="fin-row-label">Año Completo</td>
            ${totalCells}
            <td class="seas-avg-col">${fmtPct(avgC[12] ?? null)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function formatFinVal(v, kind) {
  if (v === null || v === undefined) return '<span class="fin-null">—</span>';
  if (kind === "eps") return `<span class="fin-eps">${v >= 0 ? "" : ""}${v.toFixed(2)}</span>`;
  const abs = Math.abs(v);
  const formatted = abs.toLocaleString("en-US");
  return v < 0 ? `<span class="fin-neg">(${formatted})</span>` : formatted;
}

const FIN_BOLD_ROWS = new Set([
  "Ingresos Totales", "Utilidad Bruta", "Utilidad Operativa",
  "Ing. antes Impuestos", "Utilidad Neta", "Flujo Operativo",
  "Flujo Libre", "Activos Totales", "Pasivos Totales", "Patrimonio Total",
]);

function renderFinancials(data, tab, period = "annual") {
  const container = document.getElementById("financialsContent");
  if (!container) return;

  const section = data[tab];
  if (!section) {
    container.innerHTML = '<div class="company-info-error">Sin datos disponibles.</div>';
    return;
  }

  const src = period === "quarterly" && section.quarterly?.dates?.length
    ? section.quarterly
    : section;

  if (!src.dates.length || !src.rows.length) {
    container.innerHTML = '<div class="company-info-error">Sin datos disponibles.</div>';
    return;
  }

  const { dates, rows } = src;

  container.innerHTML = `
    <div class="fin-note">En miles (USD) · Fuente: Yahoo Finance</div>
    <div class="fin-table-wrap">
      <table class="fin-table">
        <thead><tr>
          <th class="fin-th-label">Concepto</th>
          ${dates.map((d, i) => `<th class="${i === 0 && d === "TTM" ? "fin-th-ttm" : ""}">${d}</th>`).join("")}
        </tr></thead>
        <tbody>
          ${rows.map(row => {
            const bold = FIN_BOLD_ROWS.has(row.label);
            return `<tr class="${bold ? "fin-row-bold" : ""}">
              <td class="fin-row-label">${row.label}</td>
              ${row.values.map(v => `<td>${formatFinVal(v, row.kind)}</td>`).join("")}
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function loadEtfHoldings(symbol) {
  const container = document.getElementById("etfHoldingsContent");
  if (!container) return;
  try {
    const res = await fetch(`${API_BASE_URL}/holdings/${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error("Sin datos de holdings");
    const data = await res.json();
    if (!data?.holdings?.length) throw new Error("Sin holdings disponibles");
    renderEtfHoldingsChart(data.holdings);
  } catch (err) {
    if (container) container.innerHTML = `<div class="company-info-error">${err.message}</div>`;
  }
}

function renderEtfHoldingsChart(holdings) {
  const container = document.getElementById("etfHoldingsContent");
  if (!container) return;

  const COLORS = [
    "#6f86ff","#39d0ff","#32d6a2","#f5b84c","#ff6b81",
    "#9f7aea","#f687b3","#48bb78","#ed8936","#4299e1"
  ];

  container.innerHTML = `
    <div class="etf-holdings-chart-wrap" style="position:relative">
      <canvas id="etfHoldingsCanvas" style="display:block;width:100%"></canvas>
      <div id="etfHoldingsTooltip" class="etf-tooltip"></div>
    </div>
    <div class="fin-note">Ponderación actual · Fuente: Yahoo Finance</div>
  `;

  const canvas = document.getElementById("etfHoldingsCanvas");
  const tooltip = document.getElementById("etfHoldingsTooltip");
  const wrap = canvas.parentElement;

  const dpr = window.devicePixelRatio || 1;
  const padL = 72, padR = 70, padT = 12, padB = 12;
  const barH = 26, barGap = 10;
  const n = holdings.length;

  function roundRect(ctx, x, y, w, h, r) {
    if (w < r * 2) r = w / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function draw(hoverIdx) {
    const W = wrap.clientWidth || 500;
    const H = padT + n * (barH + barGap) - barGap + padB;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const maxW = holdings.reduce((m, h) => Math.max(m, h.weight), 0);
    const barMaxW = W - padL - padR;

    holdings.forEach((h, i) => {
      const y = padT + i * (barH + barGap);
      const bw = Math.max(4, (h.weight / maxW) * barMaxW);
      const isHover = i === hoverIdx;
      const color = COLORS[i % COLORS.length];

      ctx.globalAlpha = isHover ? 1 : 0.78;
      ctx.fillStyle = color;
      roundRect(ctx, padL, y, bw, barH, 5);
      ctx.fill();
      ctx.globalAlpha = 1;

      // glow on hover
      if (isHover) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        roundRect(ctx, padL, y, bw, barH, 5);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // symbol label (left)
      ctx.font = `600 11px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
      ctx.fillStyle = isHover ? "#fff" : "rgba(220,229,255,0.85)";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(h.symbol, padL - 8, y + barH / 2);

      // pct label (right of bar)
      const pct = h.weight <= 1 ? (h.weight * 100).toFixed(2) : h.weight.toFixed(2);
      ctx.font = `500 11px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
      ctx.fillStyle = isHover ? "#fff" : "rgba(190,205,240,0.65)";
      ctx.textAlign = "left";
      ctx.fillText(`${pct}%`, padL + bw + 8, y + barH / 2);
    });
  }

  draw(-1);

  canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    const my = e.clientY - rect.top;
    let hoveredIdx = -1;
    holdings.forEach((_, i) => {
      const y = padT + i * (barH + barGap);
      if (my >= y && my <= y + barH) hoveredIdx = i;
    });
    draw(hoveredIdx);
    if (hoveredIdx >= 0) {
      const h = holdings[hoveredIdx];
      const pct = h.weight <= 1 ? (h.weight * 100).toFixed(2) : h.weight.toFixed(2);
      tooltip.style.display = "block";
      const wrapRect = wrap.getBoundingClientRect();
      tooltip.style.left = (e.clientX - wrapRect.left + 14) + "px";
      tooltip.style.top = (e.clientY - wrapRect.top - 40) + "px";
      tooltip.innerHTML = `<strong>${h.symbol}</strong> — ${h.name}<br><span style="color:#6f86ff">${pct}%</span>`;
    } else {
      tooltip.style.display = "none";
    }
  });

  canvas.addEventListener("mouseleave", () => {
    tooltip.style.display = "none";
    draw(-1);
  });

  window.addEventListener("resize", () => draw(-1), { passive: true });
}

function renderBondInfo(data, isin) {
  const val = (v) => (v != null && v !== "" && v !== "NA" ? v : "—");

  const fieldMap = [
    ["ISIN",                 "ISIN"],
    ["Empresa / Emisor",     "COMPANY"],
    ["Instrumento",          "NAME_OF_THE_INSTRUMENT"],
    ["Debenture",            "NAME_OF_DEBENTURE"],
    ["Descripción NSDL",     "DESCRIPTION_IN_NSDL"],
    ["Precio Emisión",       "ISSUE_PRICE"],
    ["Valor Nominal",        "FACE_VALUE"],
    ["Fecha Emisión",        "DATE_OF_ALLOTMENT"],
    ["Fecha Redención",      "REDEMPTION"],
    ["Tasa Cupón",           "COUPON_RATE"],
    ["Frecuencia Pago",      "FREQUENCY_OF_THE_INTEREST_PAYMENT"],
    ["Opción Put/Call",      "PUT_CALL_OPTION"],
    ["Tamaño Emisión",       "TOTAL_ISSUE_SIZE"],
    ["Calificación Credit.", "CREDIT_RATING_CREDIT_RATING_AGENCY"],
    ["Registrador",          "REGISTRAR_WITH_BP_ID_NO"],
    ["En Mora",              "DEFAULTED_IN_REDEMPTION"],
    ["Observaciones",        "REMARKS"],
  ];

  const rows = fieldMap.map(([label, key]) => {
    const v = data[key];
    const display = val(v);
    if (display === "—") return "";
    return `<div class="bond-row"><span class="bond-label">${label}</span><span class="bond-value">${display}</span></div>`;
  }).join("");

  const knownKeys = new Set(fieldMap.map(([, k]) => k));
  const extras = Object.entries(data)
    .filter(([k, v]) => !knownKeys.has(k) && v != null && v !== "" && v !== "NA" && typeof v !== "object")
    .map(([k, v]) => `<div class="bond-row"><span class="bond-label">${k}</span><span class="bond-value">${v}</span></div>`)
    .join("");

  const title = data.NAME_OF_THE_INSTRUMENT || data.COMPANY || data.NAME_OF_DEBENTURE || isin;

  return `
    <div class="company-info-header">
      <div class="company-title-row">
        <h2>${title}</h2>
      </div>
      <div class="bond-isin-badge">${data.ISIN || isin}</div>
    </div>
    <div class="bond-details">${rows || extras}</div>
  `;
}

async function loadBondInfo(isin) {
  const panel = document.getElementById("companyInfoPanel");
  const content = document.getElementById("companyInfoContent");
  const btn = document.getElementById("companyInfoButton");

  panel.classList.remove("hidden");
  companyInfoVisible = true;
  if (btn) btn.classList.add("active");

  content.innerHTML = '<div class="company-info-animation"><iframe src="Resourses/Finance Loader.html" frameborder="0" scrolling="no" title="Cargando bono"></iframe></div>';

  const isMexican = isin.toUpperCase().startsWith("MX");
  const endpoint = isMexican
    ? `${API_BASE_URL}/banxico/bond/${encodeURIComponent(isin)}`
    : `${API_BASE_URL}/bond/${encodeURIComponent(isin)}`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    content.innerHTML = isMexican ? renderBanxicoBondInfo(data) : renderBondInfo(data, isin);
  } catch (err) {
    content.innerHTML = `<div class="company-info-error">No fue posible cargar el bono: ${err.message}</div>`;
  }
}

function toggleCompanyInfo() {
  const btn = document.getElementById("companyInfoButton");
  const panel = document.getElementById("companyInfoPanel");

  companyInfoVisible = !companyInfoVisible;

  panel.classList.toggle("hidden", !companyInfoVisible);
  const lbl = btn.querySelector("span") || btn;
  lbl.textContent = companyInfoVisible ? "Gráfico" : "Más info";
  btn.classList.toggle("active", companyInfoVisible);
  closeMenus();

  if (companyInfoVisible) {
    loadCompanyInfo(marketState.symbol);
  }
}

document.getElementById("companyInfoButton")?.addEventListener("click", toggleCompanyInfo);

// ── Tracker Module ────────────────────────────────────────────────────────────

const TRACKER_KEY_PREFIX = "blackportfolio-tracker-portfolios";
const PRICE_CACHE_KEY = "blackportfolio-price-cache-v2";

function getTrackerKey() {
  const session = window.BlackPortfolioAuth.getSession();
  const uid = session?.id || "anonymous";
  return `${TRACKER_KEY_PREFIX}-${uid}`;
}
const PRICE_CACHE_TTL = 60 * 60 * 1000;
const CHART_COLORS = [
  "#6f86ff", "#39d0ff", "#32d6a2", "#f5b84c", "#ff6b81",
  "#9f7aea", "#f687b3", "#48bb78", "#ed8936", "#4299e1",
  "#667eea", "#fc8181", "#68d391", "#fbd38d", "#76e4f7"
];
const BENCHMARKS = {
  "^GSPC": "S&P 500", "^IXIC": "NASDAQ 100", "^DJI": "Dow Jones",
  "URTH": "MSCI World", "EEM": "MSCI EM", "^MXX": "IPC Mexico",
  "^FTSE": "FTSE 100", "^N225": "Nikkei 225", "none": "Sin referencia"
};
const CURRENCY_SYMBOLS = { USD: "$", MXN: "$", EUR: "€", GBP: "£", CAD: "CA$", BRL: "R$" };

const SECTOR_MAP = {
  AAPL:"Tecnología",MSFT:"Tecnología",GOOGL:"Tecnología",GOOG:"Tecnología",META:"Tecnología",NVDA:"Tecnología",AMD:"Tecnología",
  INTC:"Tecnología",ORCL:"Tecnología",CRM:"Tecnología",ADBE:"Tecnología",NFLX:"Tecnología",TSM:"Tecnología",AVGO:"Tecnología",
  QCOM:"Tecnología",TXN:"Tecnología",VGT:"Tecnología",XLK:"Tecnología",SOXX:"Tecnología",QQQ:"Tecnología",ARKK:"Tecnología",SMH:"Tecnología",
  AMZN:"Consumo disc.",TSLA:"Consumo disc.",HD:"Consumo disc.",MCD:"Consumo disc.",NKE:"Consumo disc.",SBUX:"Consumo disc.",
  LOW:"Consumo disc.",TGT:"Consumo disc.",BKNG:"Consumo disc.",XLY:"Consumo disc.",VCR:"Consumo disc.",
  WMT:"Consumo básico",COST:"Consumo básico",PG:"Consumo básico",KO:"Consumo básico",PEP:"Consumo básico",PM:"Consumo básico",
  CL:"Consumo básico",XLP:"Consumo básico",VDC:"Consumo básico",
  "BIMBOA.MX":"Consumo básico","FEMSAUBD.MX":"Consumo básico","WALMEX.MX":"Consumo básico",
  JPM:"Finanzas",BAC:"Finanzas",WFC:"Finanzas",GS:"Finanzas",MS:"Finanzas","BRK.B":"Finanzas","BRK.A":"Finanzas",
  V:"Finanzas",MA:"Finanzas",AXP:"Finanzas",C:"Finanzas",BLK:"Finanzas",XLF:"Finanzas",VFH:"Finanzas",KRE:"Finanzas",
  "GFINBURO.MX":"Finanzas","GFNORTEO.MX":"Finanzas",
  JNJ:"Salud",PFE:"Salud",UNH:"Salud",ABBV:"Salud",MRK:"Salud",ABT:"Salud",TMO:"Salud",DHR:"Salud",
  LLY:"Salud",GILD:"Salud",AMGN:"Salud",ISRG:"Salud",XLV:"Salud",VHT:"Salud",
  XOM:"Energía",CVX:"Energía",COP:"Energía",SLB:"Energía",OXY:"Energía",PSX:"Energía",VLO:"Energía",XLE:"Energía",VDE:"Energía",USO:"Energía",
  GE:"Industrial",CAT:"Industrial",BA:"Industrial",HON:"Industrial",MMM:"Industrial",UPS:"Industrial",
  RTX:"Industrial",LMT:"Industrial",DE:"Industrial",FDX:"Industrial",XLI:"Industrial",VIS:"Industrial",
  "ASURB.MX":"Industrial","OMAB.MX":"Industrial",
  AMT:"Inmobiliario",PLD:"Inmobiliario",CCI:"Inmobiliario",EQIX:"Inmobiliario",O:"Inmobiliario",
  SPG:"Inmobiliario",VNQ:"Inmobiliario",IYR:"Inmobiliario","FIBRAMQ12.MX":"Inmobiliario",
  LIN:"Materiales",APD:"Materiales",FCX:"Materiales",NEM:"Materiales",XLB:"Materiales",VAW:"Materiales",
  GLD:"Materiales",IAU:"Materiales",SLV:"Materiales",GDX:"Materiales","GMEXICOB.MX":"Materiales",
  NEE:"Utilities",D:"Utilities",DUK:"Utilities",SO:"Utilities",AEP:"Utilities",EXC:"Utilities",XLU:"Utilities",VPU:"Utilities",
  T:"Comunicación",VZ:"Comunicación",CMCSA:"Comunicación",TMUS:"Comunicación",DIS:"Comunicación",XLC:"Comunicación",VOX:"Comunicación",
  "AMXL.MX":"Comunicación",
  SPY:"Mercado amplio",IVV:"Mercado amplio",VOO:"Mercado amplio",VTI:"Mercado amplio",SCHB:"Mercado amplio",ITOT:"Mercado amplio",NAFTRAC:"Mercado amplio",
  VEA:"Internacional",VWO:"Internacional",EFA:"Internacional",EEM:"Internacional",ACWI:"Internacional",
  VT:"Internacional",VEU:"Internacional",VXUS:"Internacional",IEFA:"Internacional",
  FXI:"Internacional",EWG:"Internacional",EWU:"Internacional",VGK:"Internacional",AAXJ:"Internacional",EWJ:"Internacional",
};

const GEO_MAP = {
  AAPL:"EE.UU.",MSFT:"EE.UU.",GOOGL:"EE.UU.",GOOG:"EE.UU.",AMZN:"EE.UU.",META:"EE.UU.",NVDA:"EE.UU.",TSLA:"EE.UU.",
  AMD:"EE.UU.",INTC:"EE.UU.",ORCL:"EE.UU.",CRM:"EE.UU.",ADBE:"EE.UU.",NFLX:"EE.UU.",QCOM:"EE.UU.",TXN:"EE.UU.",AVGO:"EE.UU.",
  JPM:"EE.UU.",BAC:"EE.UU.",WFC:"EE.UU.",GS:"EE.UU.",MS:"EE.UU.","BRK.B":"EE.UU.","BRK.A":"EE.UU.",
  V:"EE.UU.",MA:"EE.UU.",AXP:"EE.UU.",C:"EE.UU.",BLK:"EE.UU.",
  JNJ:"EE.UU.",PFE:"EE.UU.",UNH:"EE.UU.",ABBV:"EE.UU.",MRK:"EE.UU.",ABT:"EE.UU.",TMO:"EE.UU.",DHR:"EE.UU.",
  LLY:"EE.UU.",GILD:"EE.UU.",AMGN:"EE.UU.",ISRG:"EE.UU.",
  XOM:"EE.UU.",CVX:"EE.UU.",COP:"EE.UU.",OXY:"EE.UU.",GE:"EE.UU.",CAT:"EE.UU.",BA:"EE.UU.",HON:"EE.UU.",
  MMM:"EE.UU.",UPS:"EE.UU.",RTX:"EE.UU.",LMT:"EE.UU.",WMT:"EE.UU.",COST:"EE.UU.",HD:"EE.UU.",TGT:"EE.UU.",
  MCD:"EE.UU.",NKE:"EE.UU.",SBUX:"EE.UU.",KO:"EE.UU.",PEP:"EE.UU.",PG:"EE.UU.",T:"EE.UU.",VZ:"EE.UU.",
  DIS:"EE.UU.",CMCSA:"EE.UU.",NEE:"EE.UU.",D:"EE.UU.",AMT:"EE.UU.",PLD:"EE.UU.",O:"EE.UU.",SPG:"EE.UU.",
  EQIX:"EE.UU.",FCX:"EE.UU.",NEM:"EE.UU.",GLD:"EE.UU.",IAU:"EE.UU.",SLV:"EE.UU.",GDX:"EE.UU.",
  SPY:"EE.UU.",IVV:"EE.UU.",VOO:"EE.UU.",VTI:"EE.UU.",SCHB:"EE.UU.",QQQ:"EE.UU.",ARKK:"EE.UU.",VGT:"EE.UU.",
  XLK:"EE.UU.",XLF:"EE.UU.",XLV:"EE.UU.",XLE:"EE.UU.",XLY:"EE.UU.",XLP:"EE.UU.",XLI:"EE.UU.",XLB:"EE.UU.",
  XLU:"EE.UU.",XLC:"EE.UU.",VNQ:"EE.UU.",USO:"EE.UU.",SOXX:"EE.UU.",SMH:"EE.UU.",VHT:"EE.UU.",VDE:"EE.UU.",
  VCR:"EE.UU.",VDC:"EE.UU.",VFH:"EE.UU.",VPU:"EE.UU.",VIS:"EE.UU.",VAW:"EE.UU.",VOX:"EE.UU.",KRE:"EE.UU.",
  NAFTRAC:"México","BIMBOA.MX":"México","FEMSAUBD.MX":"México","AMXL.MX":"México","WALMEX.MX":"México",
  "GMEXICOB.MX":"México","FIBRAMQ12.MX":"México","GFINBURO.MX":"México","GFNORTEO.MX":"México",
  "ASURB.MX":"México","OMAB.MX":"México",
  VT:"Global",ACWI:"Global",VEU:"Global",VXUS:"Global",
  EFA:"Europa",IEFA:"Europa",VEA:"Europa",VGK:"Europa",EWG:"Alemania",EWU:"R. Unido",
  TSM:"Asia-Pacífico",AAXJ:"Asia-Pacífico",EWJ:"Japón",
  BABA:"China",JD:"China",PDD:"China",FXI:"China",
  VWO:"Mercados em.",EEM:"Mercados em.",
};

let activePortfolioId = null;
let pendingDeleteId = null;
let trackerInitialized = false;
let _dashRefreshTimer = null;
let perfTabLoaded = false;
let perfDailyReturns = null;
let perfCurrentConf = 0.95;
let mcTabLoaded = false;
let corrTabLoaded = false;
let whatifRafId = null;
let mcYears = 10;
let mcRafId = null;
let _lastPortfolioCurrentValue = null;
let perfMetricsData = null;
let perfReportData = null; // series + extras para el reporte PDF (curva, benchmark, drawdown)
let perfVarHorizon = "daily"; // "daily" | "annual"
let perfRfr = { rate: 9.0, label: "Tasa libre de riesgo (fallback)", date: null, source: "fallback" };
let perfRfrFetched = false;

async function fetchRiskFreeRate() {
  try {
    const res = await fetch(`${API_BASE_URL}/risk-free-rate`);
    if (!res.ok) return;
    const data = await res.json();
    if (data && typeof data.rate === "number" && isFinite(data.rate)) {
      perfRfr = data;
      // Solo marcar como definitivo si vino de Banxico; si es fallback, reintentar la próxima vez
      if (data.source === "banxico") perfRfrFetched = true;
    }
  } catch { /* keep fallback, allow retry */ }
}

function updateSharpeRfrLabel() {
  const el = document.getElementById("sharpeRfrLabel");
  if (!el) return;
  const dateTxt = perfRfr.date ? ` · ${perfRfr.date}` : "";
  el.textContent = `Tasa libre de riesgo: ${perfRfr.rate.toFixed(2)}% (${perfRfr.label}${dateTxt})`;
}

function getPortfolios() {
  try { return JSON.parse(localStorage.getItem(getTrackerKey())) ?? []; }
  catch { return []; }
}

// ── Cloud sync (Firestore) ────────────────────────────────────────────────────
let _cloudSyncTimer = null;

async function pushPortfoliosToCloud(portfolios) {
  try {
    const db = window.BlackPortfolioAuth?.db;
    const session = window.BlackPortfolioAuth?.getSession();
    if (!db || !session?.id || session.id === "anonymous") return;
    await db.collection("portfolios").doc(session.id).set({
      data: portfolios,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (_) { /* localStorage es fuente de verdad, fallar silenciosamente */ }
}

async function syncPortfoliosFromCloud() {
  try {
    const db = window.BlackPortfolioAuth?.db;
    const session = window.BlackPortfolioAuth?.getSession();
    if (!db || !session?.id || session.id === "anonymous") return false;
    const doc = await db.collection("portfolios").doc(session.id).get();
    if (!doc.exists) return false;
    const cloudData = doc.data()?.data;
    if (!Array.isArray(cloudData)) return false;
    const local = getPortfolios();
    // La nube gana si tiene más portafolios o el contenido es diferente
    const changed =
      cloudData.length > local.length ||
      (cloudData.length === local.length && JSON.stringify(cloudData) !== JSON.stringify(local));
    if (changed) {
      localStorage.setItem(getTrackerKey(), JSON.stringify(cloudData));
      return true;
    }
    return false;
  } catch (_) { return false; }
}

function savePortfolios(portfolios) {
  localStorage.setItem(getTrackerKey(), JSON.stringify(portfolios));
  // Debounce: espera 1.5s antes de escribir a Firestore para agrupar cambios rápidos
  if (_cloudSyncTimer) clearTimeout(_cloudSyncTimer);
  _cloudSyncTimer = setTimeout(() => pushPortfoliosToCloud(portfolios), 1500);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function recordTransaction(portfolio, type, ticker, quantity, price, commissionPercent, currency, opts) {
  if (!portfolio.transactions) portfolio.transactions = [];
  const commCost = price * quantity * (commissionPercent / 100);
  const gross = price * quantity;
  const net = type === "COMPRA" ? gross + commCost : gross - commCost;
  portfolio.transactions.unshift({
    id: generateId(),
    date: (opts && opts.date) || new Date().toISOString(),
    type,
    ticker,
    quantity,
    price,
    commissionPercent,
    commCost,
    net,
    currency: currency || "USD"
  });
}

// ── Portfolio Export ──────────────────────────────────────────────────────────

function exportTransactionsCSV() {
  const portfolio = getPortfolios().find(p => p.id === activePortfolioId);
  if (!portfolio) return;
  const txs = portfolio.transactions || [];
  if (!txs.length) { alert("No hay transacciones para exportar."); return; }
  const rows = [["Fecha","Tipo","Ticker","Cantidad","Precio","Moneda","Comisión (%)","Costo comisión","Neto"]];
  txs.forEach(tx => {
    const date = new Date(tx.date).toLocaleDateString("es-MX", { year:"numeric", month:"2-digit", day:"2-digit" });
    rows.push([
      date,
      tx.type,
      tx.ticker,
      tx.quantity,
      tx.price,
      tx.currency || "USD",
      (tx.commissionPercent || 0).toFixed(2),
      (tx.commCost || 0).toFixed(2),
      (tx.net || 0).toFixed(2)
    ]);
  });
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(portfolio.name || "portafolio").replace(/[^\w\s-]/gi, "").trim().replace(/\s+/g, "_")}_transacciones.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Exporta posiciones en un CSV reimportable (cabeceras alineadas con importPositionsCSV)
function exportPositionsCSV() {
  const portfolio = getPortfolios().find(p => p.id === activePortfolioId);
  if (!portfolio) return;
  const positions = (portfolio.positions || []).filter(p => (p.quantity || 0) > 0);
  if (!positions.length) { alert("No hay posiciones para exportar."); return; }
  const rows = [["Ticker", "Cantidad", "Precio promedio", "Moneda", "Fecha compra", "Comision %", "Aplica IVA", "Tasa IVA %"]];
  positions.forEach(p => {
    rows.push([
      p.ticker,
      p.quantity,
      p.avgPrice ?? "",
      getPosCurrency(p, portfolio.currency || "USD"),
      p.purchaseDate || "",
      (p.commissionPercent || 0),
      p.applyIva ? "si" : "no",
      (p.ivaRate || 0)
    ]);
  });
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(portfolio.name || "portafolio").replace(/[^\w\s-]/gi, "").trim().replace(/\s+/g, "_")}_posiciones.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Parser CSV simple con soporte de comillas
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* ignore */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Importa posiciones desde CSV creando SIEMPRE un portafolio nuevo (nunca toca los existentes)
function importPositionsCSV(file) {
  const maxP = window._planLimits?.maxPortfolios ?? Infinity;
  const existing = getPortfolios();
  if (existing.length >= maxP) {
    showPlanToast(`Tu plan permite hasta ${maxP} portafolio${maxP !== 1 ? "s" : ""}. Actualiza a Advisor Pro para portafolios ilimitados.`);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = String(reader.result || "").replace(/^﻿/, "");
      const rows = parseCSV(text).filter(r => r.some(c => String(c).trim() !== ""));
      if (rows.length < 2) { alert("El CSV no contiene posiciones."); return; }
      const header = rows[0].map(h => h.trim().toLowerCase());
      const idx = (names) => header.findIndex(h => names.some(n => h.includes(n)));
      // Alias ampliados para reconocer exportaciones de brokers (GBM, IBKR, Binance, eToro, etc.)
      const iTicker = idx(["ticker", "simbolo", "símbolo", "symbol", "clave", "emisora", "activo", "instrument", "instrumento", "asset", "coin", "contract"]);
      const iQty = idx(["cantidad", "quantity", "qty", "unidades", "acciones", "titulos", "títulos", "shares", "units", "position", "posicion", "posición", "amount", "saldo"]);
      const iPrice = idx(["precio promedio", "precio prom", "costo promedio", "avg price", "average price", "cost basis", "precio", "price", "costo", "cost", "basis", "avg", "purchase price"]);
      const iCur = idx(["moneda", "divisa", "currency", "ccy"]);
      const iDate = idx(["fecha", "date", "purchase date", "trade date"]);
      const iComm = idx(["comision", "comisión", "commission", "fee", "fees"]);
      const iIva = idx(["aplica iva"]);
      const iIvaRate = idx(["tasa iva", "tasa de iva"]);
      if (iTicker === -1 || iQty === -1 || iPrice === -1) {
        alert("El CSV debe incluir al menos las columnas: Ticker, Cantidad, Precio promedio.");
        return;
      }
      const validCur = new Set(["USD", "MXN", "EUR", "GBP", "CAD", "BRL"]);
      const positions = [];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const ticker = (row[iTicker] || "").trim().toUpperCase();
        const quantity = parseFloat(row[iQty]);
        const avgPrice = parseFloat(row[iPrice]);
        if (!ticker || !isFinite(quantity) || quantity <= 0 || !isFinite(avgPrice) || avgPrice <= 0) continue;
        let currency = iCur !== -1 ? (row[iCur] || "").trim().toUpperCase() : "";
        if (!validCur.has(currency)) currency = detectCurrencyFromTicker(ticker) || "USD";
        let purchaseDate = iDate !== -1 ? (row[iDate] || "").trim() : "";
        if (purchaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
          const d = new Date(purchaseDate);
          purchaseDate = isNaN(d) ? "" : d.toISOString().slice(0, 10);
        }
        const commissionPercent = iComm !== -1 ? (parseFloat(row[iComm]) || 0) : 0;
        const ivaRaw = iIva !== -1 ? (row[iIva] || "").trim().toLowerCase() : "";
        const applyIva = ["si", "sí", "yes", "true", "1"].includes(ivaRaw);
        const ivaRate = iIvaRate !== -1 ? (parseFloat(row[iIvaRate]) || 0) : 0;
        positions.push({ id: generateId(), ticker, avgPrice, quantity, commissionPercent, applyIva, ivaRate, purchaseDate, currency });
      }
      if (!positions.length) { alert("No se encontraron posiciones válidas en el CSV."); return; }
      const baseName = file.name.replace(/\.csv$/i, "").trim() || "Importado";
      const portfolios = getPortfolios();
      portfolios.push({
        id: generateId(),
        name: `${baseName} (importado)`,
        description: "Importado desde CSV",
        benchmark: "^GSPC",
        currency: positions[0].currency,
        createdAt: new Date().toISOString(),
        positions
      });
      savePortfolios(portfolios);
      renderPortfolioCards();
      alert(`Portafolio creado con ${positions.length} posición(es).`);
    } catch (err) {
      alert("No se pudo leer el CSV. Verifica el formato.");
    }
  };
  reader.readAsText(file);
}

function _pdfBuildAllocationSVG(posData, totalCurrentValue) {
  if (!posData.length) return "";
  const COLORS = ["#6f86ff","#a78bfa","#34d399","#f59e0b","#f87171","#38bdf8","#fb923c","#e879f9"];
  const barH = 22, gap = 9, labelW = 72, chartW = 380, pctW = 48;
  const svgW = labelW + chartW + pctW + 10;
  const svgH = posData.length * (barH + gap);
  const maxVal = posData[0].currentValuePf || 1;
  const bars = posData.map(({ pos, currentValuePf }, i) => {
    const pct = totalCurrentValue > 0 ? currentValuePf / totalCurrentValue : 0;
    const barW = Math.max(3, (currentValuePf / maxVal) * chartW);
    const y = i * (barH + gap);
    const color = COLORS[i % COLORS.length];
    const label = (pos.ticker || "").substring(0, 9);
    return `<text x="0" y="${y + barH * 0.73}" font-size="11" fill="#222" font-weight="700" font-family="Segoe UI,Arial,sans-serif">${label}</text><rect x="${labelW}" y="${y + 2}" width="${barW}" height="${barH - 4}" fill="${color}" rx="3" opacity="0.9"/><text x="${labelW + barW + 6}" y="${y + barH * 0.73}" font-size="11" fill="#555" font-family="Segoe UI,Arial,sans-serif">${(pct * 100).toFixed(1)}%</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">${bars}</svg>`;
}

async function fetchAIInsights(metrics, lang) {
  const res = await fetch(`${API_BASE_URL}/ai/insights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metrics, lang: lang || "es" }),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  return { text: (data.insights || "").trim(), model: data.model || "" };
}

// Convierte markdown (encabezados ##, viñetas, **negritas**) a HTML seguro para el reporte.
// Tolera tanto el formato antiguo (solo viñetas) como el nuevo (secciones con encabezados).
function _mdToBulletsHtml(md) {
  const esc  = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const bold = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const lines = md.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let html = "", openUl = false;
  const closeUl = () => { if (openUl) { html += "</ul>"; openUl = false; } };
  lines.forEach(l => {
    const h  = l.match(/^#{2,4}\s+(.*)$/);
    const li = l.match(/^([-*•]|\d+\.)\s+(.*)$/);
    if (h) {
      closeUl();
      html += `<div class="ai-h">${bold(h[1].replace(/[:：]\s*$/, ""))}</div>`;
    } else if (li) {
      if (!openUl) { html += `<ul style="margin:4px 0 0;padding-left:18px;line-height:1.65">`; openUl = true; }
      html += `<li>${bold(li[2])}</li>`;
    } else {
      closeUl();
      html += `<p style="margin:0 0 8px">${bold(l)}</p>`;
    }
  });
  closeUl();
  return html || `<p>${bold(md)}</p>`;
}

// Separa el análisis de IA (markdown con encabezados ##) en secciones temáticas
// para intercalarlas junto a los gráficos relevantes. Tolera el formato antiguo
// (sin encabezados) devolviéndolo como { general }.
function _parseAISections(md) {
  if (!md || !md.trim()) return {};
  const lines = md.split(/\r?\n/);
  const blocks = []; let cur = null;
  lines.forEach(l => {
    const h = l.match(/^#{2,4}\s+(.*)$/);
    if (h) { cur = { title: h[1].trim(), body: [] }; blocks.push(cur); }
    else { if (!cur) { cur = { title: "", body: [] }; blocks.push(cur); } cur.body.push(l); }
  });
  const keyFor = t => {
    const s = (t || "").toLowerCase();
    if (/tesis|diagn[oó]stico/.test(s)) return "tesis";
    if (/atribuci[oó]n|resultado/.test(s)) return "atribucion";
    if (/riesgo/.test(s)) return "riesgos";
    if (/benchmark|desempe[ñn]o/.test(s)) return "benchmark";
    if (/rebalanc|acci[oó]n|recomend/.test(s)) return "rebalanceo";
    return "general";
  };
  const map = {}; let anyKeyed = false;
  blocks.forEach(b => {
    const body = b.body.join("\n").trim();
    if (!body && !b.title) return;
    const k = b.title ? keyFor(b.title) : "general";
    if (k !== "general") anyKeyed = true;
    map[k] = (map[k] || "") + _mdToBulletsHtml(body || b.title);
  });
  // Sin encabezados reconocibles → todo como bloque general
  if (!anyKeyed) return { general: _mdToBulletsHtml(md) };
  return map;
}

// ── Gráficos SVG para el reporte PDF ───────────────────────────────────────────

// Barras horizontales genéricas (sector, región, divisa). rows: [{label, value, pct}]
function _pdfBuildBarsSVG(rows, opts = {}) {
  if (!rows.length) return "";
  const COLORS = ["#6f86ff","#a78bfa","#34d399","#f59e0b","#f87171","#38bdf8","#fb923c","#e879f9","#4ade80","#94a3b8"];
  const barH = 20, gap = 8, labelW = opts.labelW || 96, chartW = 300, pctW = 50;
  const svgW = labelW + chartW + pctW + 10;
  const svgH = rows.length * (barH + gap);
  const maxPct = Math.max(...rows.map(r => r.pct)) || 1;
  const bars = rows.map((r, i) => {
    const barW = Math.max(3, (r.pct / maxPct) * chartW);
    const y = i * (barH + gap);
    const color = r.color || COLORS[i % COLORS.length];
    const label = String(r.label || "").substring(0, 16);
    return `<text x="0" y="${y + barH * 0.72}" font-size="10.5" fill="#222" font-weight="600" font-family="Segoe UI,Arial,sans-serif">${label}</text><rect x="${labelW}" y="${y + 2}" width="${barW}" height="${barH - 4}" fill="${color}" rx="3" opacity="0.9"/><text x="${labelW + barW + 6}" y="${y + barH * 0.72}" font-size="10.5" fill="#555" font-family="Segoe UI,Arial,sans-serif">${r.pct.toFixed(1)}%</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">${bars}</svg>`;
}

// Curva de valor acumulado: portafolio vs benchmark. series: [{date, value(%)}]
function _pdfBuildLineSVG(port, bench, portLabel, benchLabel) {
  if (!port || port.length < 2) return "";
  const W = 520, H = 200, padL = 42, padR = 12, padT = 14, padB = 24;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const all = port.map(p => p.value).concat((bench || []).map(b => b.value));
  let lo = Math.min(...all, 0), hi = Math.max(...all, 0);
  if (hi === lo) { hi += 1; lo -= 1; }
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const x = i => padL + (i / (port.length - 1)) * innerW;
  const y = v => padT + (1 - (v - lo) / (hi - lo)) * innerH;
  const pathFrom = arr => arr.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const zeroY = y(0);
  // Gridlines: 0%, max, min
  const grid = [hi, (hi + lo) / 2, lo].map(v =>
    `<line x1="${padL}" y1="${y(v).toFixed(1)}" x2="${W - padR}" y2="${y(v).toFixed(1)}" stroke="#eef0f8" stroke-width="1"/><text x="${padL - 5}" y="${(y(v) + 3).toFixed(1)}" font-size="8.5" fill="#aaa" text-anchor="end" font-family="Segoe UI,Arial,sans-serif">${v >= 0 ? "+" : ""}${v.toFixed(0)}%</text>`
  ).join("");
  const benchPath = bench && bench.length > 1
    ? `<path d="${pathFrom(bench)}" fill="none" stroke="#94a3b8" stroke-width="1.6" stroke-dasharray="4 3"/>` : "";
  const lastP = port[port.length - 1].value;
  const portColor = lastP >= 0 ? "#00a870" : "#d94040";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${grid}
    <line x1="${padL}" y1="${zeroY.toFixed(1)}" x2="${W - padR}" y2="${zeroY.toFixed(1)}" stroke="#d8dcec" stroke-width="1"/>
    ${benchPath}
    <path d="${pathFrom(port)}" fill="none" stroke="${portColor}" stroke-width="2.2"/>
    <g font-family="Segoe UI,Arial,sans-serif" font-size="9.5">
      <rect x="${padL + 4}" y="${padT + 2}" width="10" height="10" fill="${portColor}" rx="2"/><text x="${padL + 18}" y="${padT + 11}" fill="#444">${portLabel} (${lastP >= 0 ? "+" : ""}${lastP.toFixed(1)}%)</text>
      ${bench && bench.length > 1 ? `<rect x="${padL + 4}" y="${padT + 16}" width="10" height="10" fill="#94a3b8" rx="2"/><text x="${padL + 18}" y="${padT + 25}" fill="#444">${benchLabel} (${bench[bench.length-1].value >= 0 ? "+" : ""}${bench[bench.length-1].value.toFixed(1)}%)</text>` : ""}
    </g>
  </svg>`;
}

// Curva de drawdown (underwater). dailyReturns: [r,...]
function _pdfBuildDrawdownSVG(dailyReturns) {
  if (!dailyReturns || dailyReturns.length < 2) return "";
  let cum = 1, peak = 1; const dd = [];
  dailyReturns.forEach(r => { cum *= (1 + r); if (cum > peak) peak = cum; dd.push(-(peak - cum) / peak * 100); });
  const W = 520, H = 130, padL = 42, padR = 12, padT = 10, padB = 18;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const lo = Math.min(...dd, 0), hi = 0;
  const x = i => padL + (i / (dd.length - 1)) * innerW;
  const y = v => padT + (1 - (v - lo) / (hi - lo || 1)) * innerH;
  const path = dd.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = `M${x(0).toFixed(1)},${y(0).toFixed(1)} ${path.replace(/^M/, "L")} L${x(dd.length-1).toFixed(1)},${y(0).toFixed(1)} Z`;
  const minDD = lo;
  const grid = [0, lo / 2, lo].map(v =>
    `<line x1="${padL}" y1="${y(v).toFixed(1)}" x2="${W - padR}" y2="${y(v).toFixed(1)}" stroke="#f3eef0" stroke-width="1"/><text x="${padL - 5}" y="${(y(v) + 3).toFixed(1)}" font-size="8.5" fill="#bbb" text-anchor="end" font-family="Segoe UI,Arial,sans-serif">${v.toFixed(0)}%</text>`
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${grid}
    <path d="${area}" fill="#d94040" opacity="0.12"/>
    <path d="${path}" fill="none" stroke="#d94040" stroke-width="1.8"/>
    <text x="${W - padR}" y="${padT + 9}" font-size="9" fill="#d94040" text-anchor="end" font-family="Segoe UI,Arial,sans-serif">Drawdown máx: ${minDD.toFixed(1)}%</text>
  </svg>`;
}

// Barras de contribución al P&L (positivas/negativas). rows: [{ticker, value}]
function _pdfBuildContribSVG(rows) {
  if (!rows.length) return "";
  const barH = 18, gap = 8, labelW = 70, axisX = labelW + 130, half = 120;
  const svgW = labelW + 260, svgH = rows.length * (barH + gap);
  const maxAbs = Math.max(...rows.map(r => Math.abs(r.value))) || 1;
  const bars = rows.map((r, i) => {
    const y = i * (barH + gap);
    const w = Math.max(1, Math.abs(r.value) / maxAbs * half);
    const pos = r.value >= 0;
    const rx = pos ? axisX : axisX - w;
    const color = pos ? "#00a870" : "#d94040";
    const valTxt = (pos ? "+" : "") + r.value.toFixed(2) + " pp";
    const tx = pos ? rx + w + 5 : rx - 5;
    const anchor = pos ? "start" : "end";
    return `<text x="0" y="${y + barH * 0.72}" font-size="10.5" fill="#222" font-weight="600" font-family="Segoe UI,Arial,sans-serif">${(r.ticker||"").substring(0,9)}</text><rect x="${rx.toFixed(1)}" y="${y + 2}" width="${w.toFixed(1)}" height="${barH - 4}" fill="${color}" rx="2" opacity="0.9"/><text x="${tx.toFixed(1)}" y="${y + barH * 0.72}" font-size="9.5" fill="${color}" text-anchor="${anchor}" font-family="Segoe UI,Arial,sans-serif">${valTxt}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}"><line x1="${axisX}" y1="0" x2="${axisX}" y2="${svgH}" stroke="#d8dcec" stroke-width="1"/>${bars}</svg>`;
}

// Fecha más antigua del portafolio (compra/transacción) en formato YYYY-MM-DD.
function _portfolioEarliestDate(portfolio) {
  const dates = [];
  (portfolio.positions || []).forEach(p => { if (p.purchaseDate) dates.push(String(p.purchaseDate).slice(0, 10)); });
  (portfolio.transactions || []).forEach(t => { if (t.date) { try { dates.push(new Date(t.date).toISOString().slice(0, 10)); } catch {} } });
  return dates.length ? dates.sort()[0] : null;
}

function openReportRangeModal() {
  const portfolio = getPortfolios().find(p => p.id === activePortfolioId);
  if (!portfolio) return;
  const modal = document.getElementById("reportRangeModal");
  const fromI = document.getElementById("reportFromInput");
  const toI   = document.getElementById("reportToInput");
  const err   = document.getElementById("reportRangeError");
  if (!modal || !fromI || !toI) return;
  const today = new Date().toISOString().slice(0, 10);
  const earliest = _portfolioEarliestDate(portfolio) || today;
  fromI.min = earliest; fromI.max = today;
  toI.min = earliest;   toI.max = today;
  if (!fromI.value) fromI.value = earliest;
  if (!toI.value)   toI.value = today;
  err?.classList.add("hidden");
  modal.classList.remove("hidden");
}

let _reportModalWired = false;
function _wireReportRangeModal() {
  if (_reportModalWired) return;
  const modal = document.getElementById("reportRangeModal");
  if (!modal) return;
  _reportModalWired = true;
  const fromI = document.getElementById("reportFromInput");
  const toI   = document.getElementById("reportToInput");
  const err   = document.getElementById("reportRangeError");
  const close = () => modal.classList.add("hidden");
  document.getElementById("closeReportRangeBtn")?.addEventListener("click", close);
  modal.addEventListener("click", e => { if (e.target === modal) close(); });

  document.getElementById("reportPresets")?.addEventListener("click", e => {
    const b = e.target.closest(".report-preset"); if (!b) return;
    e.preventDefault();
    const preset = b.dataset.preset;
    const today = new Date();
    const end = today.toISOString().slice(0, 10);
    const d = new Date(today);
    let start;
    if (preset === "1mo")      { d.setMonth(d.getMonth() - 1); start = d.toISOString().slice(0, 10); }
    else if (preset === "3mo") { d.setMonth(d.getMonth() - 3); start = d.toISOString().slice(0, 10); }
    else if (preset === "6mo") { d.setMonth(d.getMonth() - 6); start = d.toISOString().slice(0, 10); }
    else if (preset === "1y")  { d.setFullYear(d.getFullYear() - 1); start = d.toISOString().slice(0, 10); }
    else if (preset === "ytd") { start = today.getFullYear() + "-01-01"; }
    else { // all
      const portfolio = getPortfolios().find(p => p.id === activePortfolioId);
      start = (portfolio && _portfolioEarliestDate(portfolio)) || fromI.min || end;
    }
    if (fromI.min && start < fromI.min) start = fromI.min;
    fromI.value = start; toI.value = end;
    err?.classList.add("hidden");
  });

  document.getElementById("reportRangeForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const start = fromI.value, end = toI.value;
    if (!start || !end) return;
    if (start > end) { if (err) { err.textContent = "La fecha 'Desde' debe ser anterior a 'Hasta'."; err.classList.remove("hidden"); } return; }
    err?.classList.add("hidden");
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const _t = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Generando…"; }
    try { await exportPortfolioPDF(start, end); close(); }
    finally { if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = _t; } }
  });
}

// Reconstruye el portafolio a un rango de fechas histórico: tenencias, precios de
// cierre, valor, P&L, métricas y series — todo "as of" [startStr, endStr].
async function computeHistoricalReport(portfolio, startStr, endStr) {
  const currency = portfolio.currency || "USD";
  const todayStr = new Date().toISOString().slice(0, 10);
  const isEndToday = endStr >= todayStr;
  const allLots = buildAllPositionHistory(portfolio); // {ticker, avgPrice, quantity, currency, purchaseDate, sellDate}
  const tickers = [...new Set(allLots.map(l => l.ticker))];

  // Rango de descarga que cubra startStr
  const spanDays = Math.max(1, (Date.now() - new Date(startStr).getTime()) / 86400000);
  const range = spanDays <= 32 ? "3mo" : spanDays <= 95 ? "6mo" : spanDays <= 250 ? "1y"
              : spanDays <= 500 ? "2y" : spanDays <= 1300 ? "5y" : "max";
  const interval = spanDays <= 500 ? "1d" : "1wk";

  // Asegurar tipos de cambio en caché (usa los más recientes como aproximación)
  await fetchExchangeRates(allLots.map(l => l.currency), currency);

  const benchSym = portfolio.benchmark && portfolio.benchmark !== "none" ? portfolio.benchmark : null;
  const [histArr, benchHist] = await Promise.all([
    Promise.all(tickers.map(t => fetchHistoricalCloses(t, range, interval).then(h => ({ t, h })))),
    benchSym ? fetchHistoricalCloses(benchSym, range, interval) : Promise.resolve([]),
  ]);

  const dateMap = {}, sortedDates = {};
  histArr.forEach(({ t, h }) => {
    dateMap[t] = {};
    h.forEach(d => { dateMap[t][new Date(d.ts).toISOString().slice(0, 10)] = d.close; });
    sortedDates[t] = Object.keys(dateMap[t]).sort();
  });
  // Último cierre en o antes de `day`
  const priceAsOf = (t, day) => {
    const ds = sortedDates[t]; if (!ds || !ds.length) return null;
    let lo = 0, hi = ds.length - 1, res = null;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (ds[mid] <= day) { res = ds[mid]; lo = mid + 1; } else hi = mid - 1; }
    return res ? dateMap[t][res] : null;
  };
  const benchMap = {}; benchHist.forEach(d => { benchMap[new Date(d.ts).toISOString().slice(0, 10)] = d.close; });
  const benchDates = Object.keys(benchMap).sort();
  const benchAsOf = day => {
    if (!benchDates.length) return null;
    let lo = 0, hi = benchDates.length - 1, res = null;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (benchDates[mid] <= day) { res = benchDates[mid]; lo = mid + 1; } else hi = mid - 1; }
    return res ? benchMap[res] : null;
  };

  // ── Tenencias AL endStr (qty + costo por ticker) ──────────────────────────
  const heldAtEnd = allLots.filter(l => (l.purchaseDate || "0000-00-00") <= endStr && (!l.sellDate || l.sellDate > endStr));
  const byTicker = {};
  heldAtEnd.forEach(l => {
    const b = byTicker[l.ticker] || (byTicker[l.ticker] = { ticker: l.ticker, qty: 0, cost: 0, currency: l.currency, earliest: l.purchaseDate || endStr });
    b.qty += l.quantity;
    b.cost += (l.avgPrice || 0) * l.quantity; // costo en divisa del lote
    if ((l.purchaseDate || "9999") < b.earliest) b.earliest = l.purchaseDate || b.earliest;
  });

  let totalValueEnd = 0, totalCostEnd = 0;
  const missingPrices = [];
  const posData = Object.values(byTicker).map(b => {
    const priceEnd = priceAsOf(b.ticker, endStr);
    if (priceEnd === null) missingPrices.push(b.ticker);
    const valLocal = priceEnd !== null ? priceEnd * b.qty : null;
    const valPf = valLocal !== null ? (convertAmount(valLocal, b.currency, currency) ?? valLocal) : null;
    const costPf = convertAmount(b.cost, b.currency, currency) ?? b.cost;
    const pnlAmt = valPf !== null ? valPf - costPf : null;
    const pnlPct = pnlAmt !== null && costPf > 0 ? pnlAmt / costPf * 100 : null;
    // P&L del periodo: precio en max(start, fecha de entrada) → end
    const refDay = b.earliest > startStr ? b.earliest : startStr;
    const priceRef = priceAsOf(b.ticker, refDay);
    let periodPnl = null;
    if (priceEnd !== null && priceRef !== null) {
      const gainLocal = (priceEnd - priceRef) * b.qty;
      periodPnl = convertAmount(gainLocal, b.currency, currency) ?? gainLocal;
    }
    if (valPf !== null) totalValueEnd += valPf;
    totalCostEnd += costPf;
    return {
      pos: { ticker: b.ticker, quantity: b.qty, avgPrice: b.qty > 0 ? b.cost / b.qty : 0, currency: b.currency, commissionPercent: 0, purchaseDate: b.earliest },
      currency: b.currency, priceEnd, currentValuePf: valPf, costInPf: costPf, pnlAmt, pnlPct, periodPnl,
    };
  });
  const cashAtEnd = isEndToday ? (portfolio.cashBalance || 0) : 0;
  totalValueEnd += cashAtEnd;

  // ── Serie de retornos ponderados por costo dentro de [start,end] ──────────
  const activeInWindow = allLots.filter(l => (l.purchaseDate || "0000-00-00") <= endStr && (!l.sellDate || l.sellDate >= startStr));
  let totalAllCost = 0;
  activeInWindow.forEach(l => { const c = convertAmount((l.avgPrice || 0) * l.quantity, l.currency, currency) ?? ((l.avgPrice || 0) * l.quantity); l._cost = c; totalAllCost += c; });
  activeInWindow.forEach(l => { l._weight = totalAllCost > 0 ? l._cost / totalAllCost : 0; });

  const dateSet = new Set();
  tickers.forEach(t => (sortedDates[t] || []).forEach(d => { if (d >= startStr && d <= endStr) dateSet.add(d); }));
  const windowDates = [...dateSet].sort();

  const dailyReturns = [], equityCurve = [], benchCurve = [], benchDaily = [];
  let cum = 0, cumB = 0;
  for (let i = 1; i < windowDates.length; i++) {
    const d0 = windowDates[i - 1], d1 = windowDates[i];
    let r = 0;
    activeInWindow.forEach(l => {
      const act = (l.purchaseDate || "0000-00-00") <= d1 && (!l.sellDate || d1 <= l.sellDate);
      if (!act) return;
      const c0 = priceAsOf(l.ticker, d0), c1 = priceAsOf(l.ticker, d1);
      if (c0 && c1 && c0 > 0) r += l._weight * (c1 - c0) / c0;
    });
    dailyReturns.push(r);
    cum = (1 + cum / 100) * (1 + r) * 100 - 100;
    equityCurve.push({ date: d1.slice(5), value: cum });
    const b0 = benchAsOf(d0), b1 = benchAsOf(d1);
    if (b0 && b1 && b0 > 0) { const br = (b1 - b0) / b0; benchDaily.push(br); cumB = (1 + cumB / 100) * (1 + br) * 100 - 100; }
    else benchDaily.push(0);
    benchCurve.push({ date: d1.slice(5), value: cumB });
  }

  // ── Métricas del periodo ──────────────────────────────────────────────────
  const m = calcMetrics(dailyReturns, perfCurrentConf);
  const maxDD = calcMaxDrawdown(dailyReturns);
  const beta = benchHist.length > 1 && benchDaily.length >= 2 ? calcBeta(dailyReturns, benchDaily) : null;
  let sortino = null;
  if (dailyReturns.length >= 2) {
    const daily_rfr = (perfRfr.rate / 100) / 252;
    const negR = dailyReturns.filter(x => x < daily_rfr);
    if (negR.length) {
      const dd = Math.sqrt(negR.reduce((s, x) => s + (x - daily_rfr) ** 2, 0) / negR.length);
      const mean = dailyReturns.reduce((s, x) => s + x, 0) / dailyReturns.length;
      sortino = dd > 0 ? (mean - daily_rfr) / dd * Math.sqrt(252) : 0;
    }
  }
  const periodReturnPct = equityCurve.length ? equityCurve[equityCurve.length - 1].value : null;
  const years = Math.max(0.0001, (new Date(endStr) - new Date(startStr)) / (1000 * 60 * 60 * 24 * 365.25));
  const cagrPct = (periodReturnPct !== null && years > 0.02) ? (Math.pow(1 + periodReturnPct / 100, 1 / years) - 1) * 100 : null;

  // ── Transacciones, comisiones y dividendos del periodo ────────────────────
  const _day = tx => { try { return new Date(tx.date).toISOString().slice(0, 10); } catch { return ""; } };
  const allTx = (portfolio.transactions || []).filter(tx => tx.date);
  const txInWindow = allTx.filter(tx => { const d = _day(tx); return d >= startStr && d <= endStr; })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalComm = txInWindow.filter(tx => tx.type === "COMPRA" || tx.type === "VENTA")
    .reduce((s, tx) => s + (convertAmount(tx.commCost || 0, tx.currency || currency, currency) ?? (tx.commCost || 0)), 0);
  const dividends = txInWindow.filter(tx => tx.type === "DIVIDENDO");
  const totalDividends = dividends.reduce((s, tx) => s + (convertAmount(tx.net || 0, tx.currency || currency, currency) ?? (tx.net || 0)), 0);

  // Exposición por divisa (al end)
  const fxExposure = {};
  posData.forEach(d => { if (d.currentValuePf !== null) fxExposure[d.currency] = (fxExposure[d.currency] || 0) + d.currentValuePf; });

  return {
    currency, startStr, endStr, isEndToday, todayStr,
    posData, totalValueEnd, totalCostEnd, cashAtEnd,
    metrics: { sharpe: m.sharpe, volatility: m.volatility, var: m.var, beta, maxDD, sortino },
    equityCurve, benchCurve, dailyReturns, benchDaily,
    benchmarkLabel: (typeof BENCHMARKS !== "undefined" && BENCHMARKS[portfolio.benchmark]) || benchSym || "Benchmark",
    sessions: windowDates.length, periodReturnPct, cagrPct,
    txInWindow, totalTxCount: allTx.length, totalComm, dividends, totalDividends,
    missingPrices, fxExposure,
  };
}

async function exportPortfolioPDF(startStr, endStr) {
  const portfolio = getPortfolios().find(p => p.id === activePortfolioId);
  if (!portfolio) return;

  // Abrir la ventana YA (dentro del gesto del click) para evitar el bloqueo de popups.
  const win = window.open("", "_blank");
  if (!win) { alert("Permite ventanas emergentes para exportar el PDF."); return; }
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Generando reporte…</title><style>body{font-family:Segoe UI,Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#444}.sp{width:34px;height:34px;border:3px solid #e6e8f5;border-top-color:#6f86ff;border-radius:50%;animation:r .8s linear infinite;margin:0 auto 14px}@keyframes r{to{transform:rotate(360deg)}}</style></head><body><div style="text-align:center"><div class="sp"></div><div>Generando reporte con análisis de IA…</div></div></body></html>');

  const currency = portfolio.currency || "USD";
  const today    = new Date().toLocaleDateString("es-MX", { year:"numeric", month:"long", day:"numeric" });

  // Reconstrucción histórica del portafolio al rango [startStr, endStr]
  let data;
  try {
    data = await computeHistoricalReport(portfolio, startStr, endStr);
  } catch (e) {
    win.document.body.innerHTML = '<div style="font-family:Segoe UI,Arial;padding:40px;color:#a44;text-align:center">No se pudo generar el reporte.<br><small>' + ((e && e.message) || e) + '</small></div>';
    return;
  }

  const benchmark = data.benchmarkLabel;
  const positions = data.posData;          // tenencias reconstruidas al endStr
  const posData = data.posData;
  const totalCurrentValue = data.totalValueEnd;
  const fmtPct2 = v => (v === null || v === undefined) ? "—" : (v >= 0 ? "+" : "") + v.toFixed(2) + "%";

  // KPIs (al rango de fechas)
  const totalInvestedTxt = formatCurrency(data.totalCostEnd, currency);
  const currentValueTxt  = formatCurrency(data.totalValueEnd, currency);
  const _retAmt = data.totalValueEnd - data.totalCostEnd;
  const returnAmtTxt = (_retAmt >= 0 ? "+" : "") + formatCurrency(_retAmt, currency);
  const returnPctTxt = data.totalCostEnd > 0 ? fmtPct2(_retAmt / data.totalCostEnd * 100) : "—";

  // Métricas del periodo (como texto)
  const sharpe      = data.metrics.sharpe     !== null ? data.metrics.sharpe.toFixed(2)        : "—";
  const sortinoText = data.metrics.sortino    !== null ? data.metrics.sortino.toFixed(2)       : "—";
  const volatility  = data.metrics.volatility !== null ? data.metrics.volatility.toFixed(1) + "%" : "—";
  const varVal      = data.metrics.var        !== null ? "-" + Math.abs(data.metrics.var).toFixed(2) + "%" : "—";
  const beta        = data.metrics.beta       !== null ? data.metrics.beta.toFixed(2)          : "—";
  const maxDrawdown = data.metrics.maxDD      !== null ? "-" + data.metrics.maxDD.toFixed(2) + "%" : "—";

  const posRows = posData.map(({ pos, currentValuePf, pnlAmt, pnlPct }) => {
    const weight = totalCurrentValue > 0 && currentValuePf !== null ? (currentValuePf / totalCurrentValue * 100) : null;
    const pnlColor = pnlAmt === null ? "#333" : pnlAmt >= 0 ? "#00a870" : "#d94040";
    return `<tr>
      <td><strong>${pos.ticker}</strong></td>
      <td>${getPosCurrency(pos, currency)}</td>
      <td>${(pos.avgPrice || 0).toLocaleString("es-MX", { minimumFractionDigits:2, maximumFractionDigits:4 })}</td>
      <td>${(pos.quantity || 0).toLocaleString("es-MX", { maximumFractionDigits:4 })}</td>
      <td style="color:${pnlColor};font-weight:600">${pnlAmt !== null ? (pnlAmt >= 0 ? "+" : "") + formatCurrency(pnlAmt, currency) : "—"}</td>
      <td style="color:${pnlColor};font-weight:600">${pnlPct !== null ? (pnlPct >= 0 ? "+" : "") + pnlPct.toFixed(2) + "%" : "—"}</td>
      <td>${weight !== null ? weight.toFixed(1) + "%" : "—"}</td>
      <td>${pos.purchaseDate ? new Date(pos.purchaseDate).toLocaleDateString("es-MX") : "—"}</td>
    </tr>`;
  }).join("");

  // Allocation SVG (top 8 por valor)
  const sortedForChart = [...posData]
    .filter(d => d.currentValuePf !== null && d.currentValuePf > 0)
    .sort((a, b) => b.currentValuePf - a.currentValuePf)
    .slice(0, 8);
  const svgChart = _pdfBuildAllocationSVG(sortedForChart, totalCurrentValue);

  const totalComm = data.totalComm;
  const cagrText = data.cagrPct !== null ? (data.cagrPct >= 0 ? "+" : "") + data.cagrPct.toFixed(2) + "%" : "—";

  const fxExposure = data.fxExposure;
  const fxRows = Object.entries(fxExposure)
    .sort((a, b) => b[1] - a[1])
    .map(([cur, val]) => {
      const pct = totalCurrentValue > 0 ? (val / totalCurrentValue * 100).toFixed(1) : "—";
      return `<tr><td><strong>${cur}</strong></td><td>${formatCurrency(val, currency)}</td><td>${pct}%</td></tr>`;
    }).join("");

  const dividendTxs = data.dividends;
  const totalDividends = data.totalDividends;

  // ── Analítica avanzada para el reporte ────────────────────────────────────
  const _num = s => { const n = parseFloat(String(s).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? null : n; };
  const totInvNum = data.totalCostEnd;

  // #3 Atribución de resultados — contribución de cada posición al retorno del periodo (en pp)
  const attribAll = posData
    .filter(d => (d.periodPnl ?? d.pnlAmt) !== null)
    .map(d => {
      const gain = d.periodPnl ?? d.pnlAmt;
      return { ticker: d.pos.ticker, pnlAmt: gain, pp: totInvNum > 0 ? (gain / totInvNum * 100) : 0 };
    })
    .sort((a, b) => b.pp - a.pp);
  const attribTop = attribAll.slice(0, 5);
  const attribBottom = attribAll.slice(-5).filter(d => d.pp < 0 && !attribTop.includes(d));
  const attribChartRows = [...attribTop, ...attribBottom]
    .filter((d, i, arr) => arr.indexOf(d) === i)
    .sort((a, b) => b.pp - a.pp);
  const attribSVG = _pdfBuildContribSVG(attribChartRows.map(d => ({ ticker: d.ticker, value: d.pp })));

  // #4 Concentración y diversificación
  const weights = posData
    .filter(d => d.currentValuePf !== null && d.currentValuePf > 0)
    .map(d => ({ ticker: d.pos.ticker, w: d.currentValuePf / totalCurrentValue }));
  const hhi = weights.reduce((s, x) => s + x.w * x.w, 0);
  const effN = hhi > 0 ? 1 / hhi : 0;
  const sortedW = [...weights].sort((a, b) => b.w - a.w);
  const top3W = sortedW.slice(0, 3).reduce((s, x) => s + x.w, 0) * 100;
  const maxW = sortedW.length ? sortedW[0].w * 100 : 0;
  const concLabel = hhi > 0.25 ? "alta" : hhi > 0.15 ? "moderada" : "baja";
  // Sector / región por valor actual
  const _bucketBy = (fn) => {
    const b = {};
    posData.forEach(d => { if (d.currentValuePf > 0) { const k = fn(d.pos.ticker); b[k] = (b[k] || 0) + d.currentValuePf; } });
    if ((portfolio.cashBalance || 0) > 0) b["Cash"] = (b["Cash"] || 0) + portfolio.cashBalance;
    return Object.entries(b).sort((a, b2) => b2[1] - a[1])
      .map(([label, value]) => ({ label, value, pct: totalCurrentValue > 0 ? value / totalCurrentValue * 100 : 0 }));
  };
  const sectorRows = _bucketBy(getTickerSector);
  const geoRows = _bucketBy(getTickerGeo);
  const sectorSVG = _pdfBuildBarsSVG(sectorRows);
  const geoSVG = _pdfBuildBarsSVG(geoRows);
  const concAlerts = [];
  if (maxW > 25) concAlerts.push(`La mayor posición (${sortedW[0].ticker}) representa ${maxW.toFixed(1)}% del portafolio — riesgo de concentración.`);
  if (top3W > 60) concAlerts.push(`Las 3 mayores posiciones suman ${top3W.toFixed(1)}% — diversificación limitada.`);
  if (sectorRows.length && sectorRows[0].pct > 40 && sectorRows[0].label !== "Cash") concAlerts.push(`Sobreexposición a "${sectorRows[0].label}" (${sectorRows[0].pct.toFixed(1)}%).`);

  // #5 Comparación vs benchmark (series reconstruidas al rango por el motor)
  let benchCompare = null, eqSVG = "", ddSVG = "", benchMetricsHtml = "", perfSessions = 0;
  if (data.equityCurve && data.equityCurve.length > 1) {
    const eq = data.equityCurve;
    const bm = data.benchCurve || [];
    const portRet = eq[eq.length - 1].value;
    const hasBench = bm.length > 1 && bm.some(p => p.value !== 0);
    const benchRet = hasBench ? bm[bm.length - 1].value : null;
    const active = hasBench ? portRet - benchRet : null;
    let trackingError = null;
    if (hasBench && data.benchDaily && data.benchDaily.length > 1) {
      const dp = data.dailyReturns, db = data.benchDaily;
      const n = Math.min(dp.length, db.length);
      const diff = []; for (let i = 0; i < n; i++) diff.push(dp[i] - db[i]);
      const m = diff.reduce((s, r) => s + r, 0) / n;
      const v = diff.reduce((s, r) => s + (r - m) ** 2, 0) / Math.max(1, n - 1);
      trackingError = Math.sqrt(v) * Math.sqrt(252) * 100;
    }
    perfSessions = data.sessions || 0;
    benchCompare = { portRet, benchRet, active, trackingError, beta: data.metrics.beta, label: data.benchmarkLabel };
    eqSVG = _pdfBuildLineSVG(eq, hasBench ? bm : [], "Portafolio", data.benchmarkLabel || "Benchmark");
    ddSVG = _pdfBuildDrawdownSVG(data.dailyReturns);
    const cell = (lbl, val, color) => `<div class="metric"><span>${lbl}</span><strong${color ? ` style="color:${color}"` : ""}>${val}</strong></div>`;
    const fmtPct = v => v === null ? "—" : (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
    benchMetricsHtml = `<div class="metrics m4">
    ${cell("Retorno portafolio", fmtPct(portRet), portRet >= 0 ? "#00a870" : "#d94040")}
    ${cell("Retorno benchmark", fmtPct(benchRet))}
    ${cell("Exceso (alpha activo)", fmtPct(active), active === null ? "" : active >= 0 ? "#00a870" : "#d94040")}
    ${cell("Tracking error", trackingError === null ? "—" : trackingError.toFixed(2) + "%")}
  </div>`;
  }

  // #7 Riesgo interpretado en lenguaje de cliente
  const _sh = _num(sharpe), _vol = _num(volatility), _var = _num(varVal), _mdd = _num(maxDrawdown), _bt = _num(beta);
  const riskBullets = [];
  if (_var !== null) {
    const varAmt = totalCurrentValue > 0 ? formatCurrency(Math.abs(_var) / 100 * totalCurrentValue, currency) : "—";
    riskBullets.push(`**VaR 95%:** en un mal día (1 de cada 20) el portafolio podría perder hasta ~<strong>${Math.abs(_var).toFixed(2)}%</strong> (≈ ${varAmt}).`);
  }
  if (_mdd !== null) riskBullets.push(`**Máxima caída histórica:** desde su punto más alto el portafolio llegó a caer <strong>${Math.abs(_mdd).toFixed(2)}%</strong>; mide la peor racha sufrida.`);
  if (_vol !== null) riskBullets.push(`**Volatilidad:** ${_vol.toFixed(1)}% anual — ${_vol > 25 ? "alta, esperar oscilaciones amplias" : _vol > 15 ? "moderada" : "contenida"}.`);
  if (_sh !== null) riskBullets.push(`**Sharpe ${_sh.toFixed(2)}:** ${_sh > 1 ? "buen retorno por unidad de riesgo" : _sh > 0 ? "retorno ajustado al riesgo modesto" : "el retorno no compensó el riesgo asumido"}.`);
  if (_bt !== null) riskBullets.push(`**Beta ${_bt.toFixed(2)}:** el portafolio se mueve ${_bt > 1.1 ? "más" : _bt < 0.9 ? "menos" : "en línea"} que el mercado de referencia.`);
  const riskInterpHtml = riskBullets.length
    ? `<div class="callout"><div class="callout-h">¿Qué significan estas métricas?</div>${_mdToBulletsHtml(riskBullets.map(b => "- " + b).join("\n"))}</div>`
    : "";

  // Executive summary
  const sharpeNum = parseFloat(sharpe);
  const riskLabel = isNaN(sharpeNum) ? "sin datos" : sharpeNum > 1 ? "buena" : sharpeNum > 0 ? "moderada" : "baja";
  const execSummary = `Portafolio <strong>${portfolio.name}</strong> con <strong>${positions.length}</strong> posición${positions.length !== 1 ? "es" : ""} activa${positions.length !== 1 ? "s" : ""} en ${currency}. Retorno total: <strong>${returnAmtTxt} (${returnPctTxt})</strong>. CAGR estimado: <strong>${cagrText}</strong>. Relación riesgo/retorno <strong>${riskLabel}</strong> · Sharpe ${sharpe} · Sortino ${sortinoText}.`;

  // ── #8 Periodo del reporte (del rango seleccionado) ────────────────────────
  const _fmtD = d => { try { return new Date(d + "T00:00:00").toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" }); } catch { return d; } };
  const periodLabel = `${_fmtD(data.startStr)} – ${_fmtD(data.endStr)}`;

  // ── #11 Frescura / vigencia de los datos ───────────────────────────────────
  const dataAsOf = `cierre del ${_fmtD(data.endStr)}${data.isEndToday ? " (más reciente)" : ""}`;
  const missingPrices = data.missingPrices || [];

  // ── #8 Transacciones del periodo ───────────────────────────────────────────
  const txs = data.txInWindow.slice(0, 80);
  const totalTxCount = data.totalTxCount;
  const txRows = txs.map(tx => {
    const date = new Date(tx.date).toLocaleDateString("es-MX");
    const typeColor = tx.type === "COMPRA" ? "#00a870" : tx.type === "DIVIDENDO" ? "#d4890a" : "#d94040";
    return `<tr>
      <td>${date}</td>
      <td style="color:${typeColor};font-weight:600">${tx.type}</td>
      <td><strong>${tx.ticker}</strong></td>
      <td>${tx.quantity}</td>
      <td>${(tx.price || 0).toLocaleString("es-MX", { minimumFractionDigits:2, maximumFractionDigits:4 })}</td>
      <td>${(tx.commCost || 0).toFixed(2)}</td>
      <td>${(tx.net || 0).toFixed(2)}</td>
    </tr>`;
  }).join("");
  const txCaption = `${txs.length} en el periodo${data.txInWindow.length > txs.length ? ` (de ${data.txInWindow.length})` : ""} · ${totalTxCount} históricas`;

  // ── Insights con IA (OpenRouter vía backend de Railway) ────────────────────
  const aiMetrics = {
    portafolio: portfolio.name,
    moneda: currency,
    periodo_reporte: periodLabel,
    retorno_periodo_pct: data.periodReturnPct !== null ? +data.periodReturnPct.toFixed(2) : null,
    posiciones_activas: positions.length,
    total_invertido: totalInvestedTxt,
    valor_actual: currentValueTxt,
    retorno: `${returnAmtTxt} (${returnPctTxt})`,
    cagr_estimado: cagrText,
    sharpe, sortino: sortinoText, volatilidad: volatility,
    var_95: varVal, beta, max_drawdown: maxDrawdown, benchmark,
    comisiones_totales: formatCurrency(totalComm, currency),
    dividendos_cobrados: dividendTxs.length ? formatCurrency(totalDividends, currency) : "0",
    posiciones: posData
      .filter(d => d.currentValuePf !== null)
      .sort((a, b) => (b.currentValuePf || 0) - (a.currentValuePf || 0))
      .slice(0, 15)
      .map(d => ({
        ticker: d.pos.ticker,
        peso_pct: totalCurrentValue > 0 ? +(d.currentValuePf / totalCurrentValue * 100).toFixed(1) : null,
        pnl_pct: d.pnlPct !== null ? +d.pnlPct.toFixed(2) : null,
        divisa: getPosCurrency(d.pos, currency),
      })),
    exposicion_divisa: Object.entries(fxExposure).map(([cur, val]) => ({
      divisa: cur,
      peso_pct: totalCurrentValue > 0 ? +(val / totalCurrentValue * 100).toFixed(1) : null,
    })),
    concentracion: {
      hhi: +hhi.toFixed(3),
      nivel: concLabel,
      holdings_efectivos: +effN.toFixed(1),
      top3_peso_pct: +top3W.toFixed(1),
      mayor_posicion_pct: +maxW.toFixed(1),
    },
    exposicion_sector: sectorRows.slice(0, 8).map(r => ({ sector: r.label, peso_pct: +r.pct.toFixed(1) })),
    exposicion_region: geoRows.slice(0, 8).map(r => ({ region: r.label, peso_pct: +r.pct.toFixed(1) })),
    atribucion: {
      mayores_contribuidores: attribAll.slice(0, 3).map(d => ({ ticker: d.ticker, contribucion_pp: +d.pp.toFixed(2) })),
      mayores_detractores: attribAll.slice(-3).filter(d => d.pp < 0).map(d => ({ ticker: d.ticker, contribucion_pp: +d.pp.toFixed(2) })),
    },
    comparacion_benchmark: benchCompare ? {
      retorno_portafolio_pct: +benchCompare.portRet.toFixed(2),
      retorno_benchmark_pct: benchCompare.benchRet === null ? null : +benchCompare.benchRet.toFixed(2),
      exceso_pp: benchCompare.active === null ? null : +benchCompare.active.toFixed(2),
      tracking_error_pct: benchCompare.trackingError === null ? null : +benchCompare.trackingError.toFixed(2),
      beta: benchCompare.beta === null || benchCompare.beta === undefined ? null : +benchCompare.beta.toFixed(2),
    } : null,
  };

  let aiSections = {}, aiModel = "";
  try {
    const ai = await fetchAIInsights(aiMetrics, "es");
    if (ai.text) { aiSections = _parseAISections(ai.text); aiModel = ai.model || ""; }
  } catch (_) { /* Sin insights: el PDF se genera igual. */ }
  // Nota de IA intercalable junto a un gráfico/sección
  const aiNote = (key) => aiSections[key]
    ? `<div class="ai-note"><div class="ai-note-h">★ Análisis IA</div>${aiSections[key]}</div>` : "";
  const aiHasAny = Object.keys(aiSections).length > 0;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte — ${portfolio.name}</title>
  <style>
    :root{
      --ink:#1b1f2e; --muted:#6b7280; --faint:#9aa1b2;
      --pri:#5b6ef5; --pri-dk:#4453d6; --soft:#f6f7fb; --soft2:#eef1fb;
      --border:#e6e9f4; --green:#00a870; --red:#d94040; --amber:#f5b84c;
    }
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:var(--ink);padding:30px 38px;font-size:12.5px;line-height:1.45}
    h1,h2,h3{font-weight:700}
    /* Cover */
    .cover{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;padding:0 0 16px;margin-bottom:6px;border-bottom:3px solid var(--pri)}
    .brand{font-size:25px;font-weight:800;letter-spacing:-.6px;color:var(--ink)}
    .brand span{color:var(--pri)}
    .brand-sub{font-size:10.5px;color:var(--faint);margin-top:3px;letter-spacing:.5px;text-transform:uppercase}
    .cover-right{text-align:right}
    .cover-name{font-size:20px;font-weight:800;color:var(--ink);margin-bottom:3px}
    .cover-meta{font-size:10.5px;color:var(--muted);line-height:1.65}
    .cover-meta b{color:var(--ink);font-weight:600}
    /* Freshness ribbon */
    .ribbon{display:flex;gap:14px;flex-wrap:wrap;font-size:10px;color:var(--muted);padding:8px 0 0;margin-bottom:18px}
    .ribbon .pill{background:var(--soft);border:1px solid var(--border);border-radius:20px;padding:3px 11px}
    .warn{background:#fff3f3;border:1px solid #f3c9c9;color:#a44;border-radius:7px;padding:8px 12px;font-size:10.5px;margin-bottom:16px}
    /* Sections */
    .sec{display:flex;align-items:center;gap:9px;font-size:12px;font-weight:700;color:var(--ink);text-transform:uppercase;letter-spacing:.6px;margin:0 0 12px;padding-bottom:7px;border-bottom:1px solid var(--border)}
    .sec .n{display:inline-flex;align-items:center;justify-content:center;width:19px;height:19px;border-radius:6px;background:var(--pri);color:#fff;font-size:11px;font-weight:800;letter-spacing:0}
    .sec .hint{margin-left:auto;font-size:9.5px;font-weight:500;color:var(--faint);text-transform:none;letter-spacing:0}
    section{margin-bottom:26px}
    /* Grids */
    .g2{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start}
    .g-perf{display:grid;grid-template-columns:1.55fr 1fr;gap:18px;align-items:start}
    .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;align-items:start}
    /* Text blocks */
    .exec{background:var(--soft2);border-left:3px solid var(--pri);border-radius:7px;padding:13px 16px;font-size:12.5px;line-height:1.6;color:#2c3142}
    .ai-note{background:#f7f9ff;border:1px solid #dde4ff;border-left:3px solid var(--pri);border-radius:7px;padding:12px 14px;font-size:11.5px;color:#2a2f45}
    .ai-note-h{font-size:9.5px;font-weight:800;color:var(--pri-dk);text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px}
    .ai-note ul{margin:2px 0 0;padding-left:16px;line-height:1.55}
    .callout{background:#fbfcff;border:1px solid var(--border);border-radius:7px;padding:12px 14px;font-size:11.5px;color:#333}
    .callout-h{font-size:10px;font-weight:800;color:var(--ink);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
    .ai-h{font-size:11px;font-weight:700;color:var(--pri-dk);margin:10px 0 3px}
    .ai-h:first-child{margin-top:0}
    /* KPIs / metrics */
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
    .kpi{background:linear-gradient(180deg,#f8f9ff,#f3f5fc);border:1px solid var(--border);border-radius:9px;padding:13px 15px;border-top:3px solid var(--pri)}
    .kpi span{font-size:9.5px;color:var(--muted);display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px}
    .kpi strong{font-size:17px;font-weight:800;color:var(--ink)}
    .metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:9px;margin-bottom:12px}
    .metrics.m4{grid-template-columns:repeat(4,1fr)}
    .metric{background:var(--soft);border:1px solid var(--border);border-radius:8px;padding:10px 8px;text-align:center}
    .metric span{font-size:8.5px;color:var(--muted);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.3px}
    .metric strong{font-size:14px;font-weight:800;color:var(--ink)}
    /* Charts */
    .chart{background:#fff;border:1px solid var(--border);border-radius:8px;padding:13px 15px}
    .chart-h{font-size:9.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;font-weight:600}
    .chart svg{max-width:100%;height:auto}
    .cap{font-size:9px;color:var(--faint);margin-top:8px}
    /* Stats list */
    .stat-box{background:var(--soft);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:9px}
    .stat-box span{font-size:9.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;display:block;margin-bottom:3px}
    .stat-box strong{font-size:14px;font-weight:800;color:var(--ink)}
    /* Tables */
    table{width:100%;border-collapse:collapse;font-size:11px}
    thead th{background:var(--soft2);color:#4a5168;font-size:9px;font-weight:700;text-transform:uppercase;padding:7px 9px;text-align:left;letter-spacing:.3px}
    tbody td{border-bottom:1px solid #edeef4;padding:6px 9px}
    tbody tr:last-child td{border-bottom:none}
    /* Glossary */
    .gloss{columns:2;column-gap:24px;font-size:10.5px;color:#444}
    .gloss div{break-inside:avoid;margin-bottom:8px}
    .gloss b{color:var(--ink)}
    .disclaimer{background:#fff8e7;border-left:3px solid var(--amber);border-radius:6px;padding:10px 13px;margin-bottom:16px;font-size:10.5px;color:#7a6020}
    .alerts{background:#fff3f3;border:1px solid #f3c9c9;border-left:3px solid var(--red);border-radius:7px;padding:9px 13px;font-size:10.5px;color:#a44;margin-bottom:12px;line-height:1.7}
    .footer{margin-top:8px;padding-top:11px;border-top:1px solid var(--border);font-size:9.5px;color:var(--faint);display:flex;justify-content:space-between;align-items:center}
    @media print{
      body{padding:18px 22px}
      section,.kpis,.metrics,.g2,.g-perf,.g3,.chart,.kpi,.metric{page-break-inside:avoid}
      .sec{page-break-after:avoid}
      table{page-break-inside:auto}
      tr{page-break-inside:avoid}
      thead{display:table-header-group}
    }
  </style>
</head>
<body>
  <header class="cover">
    <div>
      <div class="brand"><span>B</span>lackPortfolio</div>
      <div class="brand-sub">Reporte de portafolio · Para uso del asesor</div>
    </div>
    <div class="cover-right">
      <div class="cover-name">${portfolio.name}</div>
      <div class="cover-meta"><b>Periodo:</b> ${periodLabel}</div>
      <div class="cover-meta">Benchmark: ${benchmark} &nbsp;·&nbsp; Moneda: ${currency}</div>
      <div class="cover-meta">Generado el ${today}</div>
    </div>
  </header>
  <div class="ribbon">
    <span class="pill">📅 Periodo: ${periodLabel}</span>
    <span class="pill">🔄 Valuado al ${dataAsOf}</span>
    <span class="pill">📊 ${positions.length} posiciones · ${currency}</span>
    ${!data.isEndToday ? `<span class="pill">🕑 Reconstruido a fecha histórica</span>` : ""}
  </div>
  ${missingPrices.length ? `<div class="warn">⚠ ${missingPrices.length} posición(es) sin precio de cierre en la fecha (${missingPrices.slice(0,6).join(", ")}${missingPrices.length>6?"…":""}); quedan en "—". Puede deberse a tickers sin histórico disponible para el rango.</div>` : ""}
  ${!data.isEndToday ? `<div class="warn" style="background:#fff8e7;border-color:#f0d9a8;color:#7a6020">ℹ El saldo en efectivo (Cash) solo se incluye cuando la fecha final es hoy; en reportes históricos el valor refleja únicamente las posiciones.</div>` : ""}

  <!-- 1. Resumen ejecutivo -->
  <section>
    <h2 class="sec"><span class="n">1</span>Resumen ejecutivo</h2>
    <div class="${(aiSections.tesis || aiSections.general) ? "g2" : ""}" style="margin-bottom:16px">
      <div class="exec">${execSummary}</div>
      ${aiNote("tesis") || (aiSections.general ? `<div class="ai-note"><div class="ai-note-h">★ Análisis IA</div>${aiSections.general}</div>` : "")}
    </div>
    <div class="kpis">
      <div class="kpi"><span>Total invertido</span><strong>${totalInvestedTxt}</strong></div>
      <div class="kpi"><span>Valor actual</span><strong>${currentValueTxt}</strong></div>
      <div class="kpi"><span>Retorno $</span><strong>${returnAmtTxt}</strong></div>
      <div class="kpi"><span>Retorno %</span><strong>${returnPctTxt}</strong></div>
    </div>
  </section>

  <!-- 2. Rendimiento vs benchmark -->
  <section>
    <h2 class="sec"><span class="n">2</span>Rendimiento vs benchmark<span class="hint">${perfSessions ? perfSessions + " sesiones · " + periodLabel : periodLabel}</span></h2>
    ${eqSVG ? `<div class="g-perf">
      <div class="chart"><div class="chart-h">Valor acumulado · Portafolio vs ${benchCompare?.label || "Benchmark"}</div>${eqSVG}<div class="cap">Retorno compuesto acumulado en el periodo. Línea punteada = benchmark.</div></div>
      <div>
        ${benchMetricsHtml}
        ${aiNote("benchmark")}
      </div>
    </div>` : `<div class="callout">No hay suficientes datos de precios históricos para construir la serie en el rango seleccionado. Prueba un rango más amplio o verifica que los tickers tengan histórico disponible.</div>`}
  </section>

  <!-- 3. Riesgo -->
  <section>
    <h2 class="sec"><span class="n">3</span>Riesgo y volatilidad</h2>
    <div class="metrics">
      <div class="metric"><span>Sharpe</span><strong>${sharpe}</strong></div>
      <div class="metric"><span>Sortino</span><strong>${sortinoText}</strong></div>
      <div class="metric"><span>Volatilidad</span><strong>${volatility}</strong></div>
      <div class="metric"><span>VaR (95%)</span><strong>${varVal}</strong></div>
      <div class="metric"><span>Beta</span><strong>${beta}</strong></div>
      <div class="metric"><span>Max Drawdown</span><strong>${maxDrawdown}</strong></div>
    </div>
    <div class="${ddSVG ? "g2" : ""}">
      ${ddSVG ? `<div class="chart"><div class="chart-h">Drawdown · caídas desde máximos</div>${ddSVG}</div>` : ""}
      <div>
        ${riskInterpHtml}
        ${aiNote("riesgos")}
      </div>
    </div>
  </section>

  <!-- 4. Distribución y diversificación -->
  <section>
    <h2 class="sec"><span class="n">4</span>Distribución y diversificación</h2>
    <div class="metrics m4">
      <div class="metric"><span>Concentración (HHI)</span><strong>${hhi.toFixed(3)} · ${concLabel}</strong></div>
      <div class="metric"><span>Holdings efectivos</span><strong>${effN.toFixed(1)}</strong></div>
      <div class="metric"><span>Top 3 (peso)</span><strong>${top3W.toFixed(1)}%</strong></div>
      <div class="metric"><span>Mayor posición</span><strong>${maxW.toFixed(1)}%</strong></div>
    </div>
    ${concAlerts.length ? `<div class="alerts">${concAlerts.map(a => "• " + a).join("<br>")}</div>` : ""}
    <div class="g2" style="margin-bottom:14px">
      <div class="chart"><div class="chart-h">Distribución por posición (top ${sortedForChart.length})</div>${svgChart || "<span style='color:#aaa;font-size:11px'>Sin precios en caché para graficar</span>"}</div>
      <div>
        <div class="stat-box"><span>CAGR estimado</span><strong>${cagrText}</strong></div>
        <div class="stat-box"><span>Comisiones totales</span><strong>${formatCurrency(totalComm, currency)}</strong></div>
        ${dividendTxs.length ? `<div class="stat-box"><span>Dividendos cobrados (${dividendTxs.length} pagos)</span><strong>${formatCurrency(totalDividends, currency)}</strong></div>` : ""}
      </div>
    </div>
    <div class="g3">
      <div class="chart"><div class="chart-h">Por sector</div>${sectorSVG || "<span style='color:#aaa;font-size:11px'>Sin datos</span>"}</div>
      <div class="chart"><div class="chart-h">Por región</div>${geoSVG || "<span style='color:#aaa;font-size:11px'>Sin datos</span>"}</div>
      <div class="chart"><div class="chart-h">Por divisa</div>${fxRows ? `<table style="margin:0"><thead><tr><th>Divisa</th><th>Valor</th><th>Peso</th></tr></thead><tbody>${fxRows}</tbody></table>` : "<span style='color:#aaa;font-size:11px'>—</span>"}</div>
    </div>
  </section>

  <!-- 5. Atribución -->
  ${attribChartRows.length ? `<section>
    <h2 class="sec"><span class="n">5</span>Atribución de resultados<span class="hint">contribución al retorno, en puntos %</span></h2>
    <div class="${aiSections.atribucion ? "g-perf" : ""}">
      <div class="chart">${attribSVG}<div class="cap">Aporte de cada posición al retorno sobre el capital invertido. Verde = sumó, rojo = restó.</div></div>
      ${aiNote("atribucion")}
    </div>
  </section>` : ""}

  <!-- 6. Posiciones -->
  ${posRows ? `<section>
    <h2 class="sec"><span class="n">6</span>Posiciones al ${_fmtD(data.endStr)}<span class="hint">${positions.length} posiciones · precios al cierre</span></h2>
    <table>
      <thead><tr><th>Ticker</th><th>Divisa</th><th>Costo prom.</th><th>Cantidad</th><th>P&L $</th><th>P&L %</th><th>Peso</th><th>1ª compra</th></tr></thead>
      <tbody>${posRows}</tbody>
    </table>
  </section>` : ""}

  <!-- 7. Transacciones -->
  ${txRows ? `<section>
    <h2 class="sec"><span class="n">7</span>Historial de transacciones<span class="hint">${txCaption}</span></h2>
    <table>
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Ticker</th><th>Cantidad</th><th>Precio</th><th>Comisión $</th><th>Neto</th></tr></thead>
      <tbody>${txRows}</tbody>
    </table>
  </section>` : ""}

  <!-- 8. Recomendaciones IA -->
  ${aiSections.rebalanceo ? `<section>
    <h2 class="sec"><span class="n">8</span>Acciones de rebalanceo sugeridas<span class="hint">generado por IA</span></h2>
    <div class="ai-note"><div class="ai-note-h">★ Análisis IA · educativo, no es asesoría</div>${aiSections.rebalanceo}</div>
  </section>` : ""}

  <!-- 9. Glosario y metodología -->
  <section>
    <h2 class="sec"><span class="n">${aiSections.rebalanceo ? 9 : 8}</span>Glosario y metodología</h2>
    <div class="gloss">
      <div><b>CAGR</b> — tasa de crecimiento anual compuesta del valor del portafolio desde la primera operación.</div>
      <div><b>Sharpe</b> — retorno por unidad de riesgo total: (retorno − tasa libre de riesgo) ÷ volatilidad. Mayor es mejor.</div>
      <div><b>Sortino</b> — variante del Sharpe que solo penaliza la volatilidad a la baja (caídas).</div>
      <div><b>Volatilidad</b> — desviación estándar anualizada de los retornos diarios; mide cuánto oscila el valor.</div>
      <div><b>VaR 95%</b> — pérdida máxima esperada en el 95% de los días; en 1 de cada 20 días podría superarse.</div>
      <div><b>Beta</b> — sensibilidad del portafolio frente al benchmark. 1 = se mueve igual; &gt;1 = amplifica.</div>
      <div><b>Max Drawdown</b> — mayor caída desde un máximo histórico hasta el siguiente mínimo.</div>
      <div><b>Alpha (exceso)</b> — retorno del portafolio por encima del benchmark en el periodo.</div>
      <div><b>Tracking error</b> — desviación estándar anualizada de la diferencia portafolio − benchmark.</div>
      <div><b>HHI</b> — índice de concentración (suma de pesos²). Mayor = más concentrado; &gt;0.25 se considera alto.</div>
      <div><b>Holdings efectivos</b> — 1 ÷ HHI; número equivalente de posiciones igualmente ponderadas.</div>
      <div><b>Atribución (pp)</b> — contribución de cada posición al retorno total, en puntos porcentuales sobre el capital invertido.</div>
    </div>
    <div style="font-size:9.5px;color:var(--faint);margin-top:10px">Tasa libre de riesgo: ${perfRfr.rate.toFixed(2)}% (${perfRfr.label}). Métricas de riesgo calculadas sobre ${periodLabel}.${aiModel ? ` Secciones marcadas ★ generadas por IA (${aiModel}).` : ""}</div>
  </section>

  <div class="disclaimer">Este reporte es generado automáticamente con fines informativos. No constituye asesoría de inversión ni recomendación de compra o venta de valores. Las observaciones de IA pueden contener errores; verifica las cifras antes de tomar decisiones.</div>
  <div class="footer">
    <span>BlackPortfolio · blackportfolio.ai</span>
    <span>Generado el ${today}</span>
  </div>
  <script>setTimeout(function(){window.focus();window.print();},350);<\/script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

function renderTransactionsTab() {
  const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
  const allTxs = portfolio ? (portfolio.transactions || []) : [];
  const tbody = document.getElementById("txTableBody");
  const noMsg = document.getElementById("noTxMsg");
  const shell = document.getElementById("txTableShell");
  const countLabel = document.getElementById("txCountLabel");

  const filterType   = (document.getElementById("txFilterType")?.value   || "").trim();
  const filterTicker = (document.getElementById("txFilterTicker")?.value || "").trim().toUpperCase();
  const filterFrom   = document.getElementById("txFilterFrom")?.value  || "";
  const filterTo     = document.getElementById("txFilterTo")?.value    || "";

  const txs = allTxs.filter((tx) => {
    if (filterType   && tx.type !== filterType) return false;
    if (filterTicker && !tx.ticker.toUpperCase().includes(filterTicker)) return false;
    const txDay = tx.date.slice(0, 10);
    if (filterFrom && txDay < filterFrom) return false;
    if (filterTo   && txDay > filterTo)   return false;
    return true;
  });

  const hasFilters = filterType || filterTicker || filterFrom || filterTo;
  if (allTxs.length) {
    countLabel.textContent = hasFilters
      ? `${txs.length} de ${allTxs.length} transacción(es)`
      : `${allTxs.length} transacción(es)`;
  } else {
    countLabel.textContent = "";
  }

  if (!allTxs.length) {
    shell.style.display = "none";
    noMsg.classList.remove("hidden");
    return;
  }
  shell.style.display = "";
  noMsg.classList.add("hidden");

  if (!txs.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">Sin resultados para los filtros aplicados.</td></tr>`;
    return;
  }

  tbody.innerHTML = txs.map((tx) => {
    const date = new Date(tx.date).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
    const typeClass = tx.type === "COMPRA" ? "tx-buy" : tx.type === "DIVIDENDO" ? "tx-dividend" : "tx-sell";
    const sym = CURRENCY_SYMBOLS[tx.currency] || "$";
    return `<tr>
      <td>${date}</td>
      <td><span class="tx-badge ${typeClass}">${tx.type}</span></td>
      <td><strong>${tx.ticker}</strong></td>
      <td>${tx.quantity}</td>
      <td>${sym}${tx.price.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
      <td>${sym}${tx.commCost.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${tx.commissionPercent.toFixed(2)}%)</td>
      <td><strong>${sym}${tx.net.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
    </tr>`;
  }).join("");
}

function clearTxFilters() {
  const type   = document.getElementById("txFilterType");
  const ticker = document.getElementById("txFilterTicker");
  const from   = document.getElementById("txFilterFrom");
  const to     = document.getElementById("txFilterTo");
  if (type)   type.value   = "";
  if (ticker) ticker.value = "";
  if (from)   from.value   = "";
  if (to)     to.value     = "";
  renderTransactionsTab();
}

function formatCurrency(n, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || "$";
  if (!Number.isFinite(n)) return sym + "0.00";
  return sym + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getPriceCache() {
  try { return JSON.parse(localStorage.getItem(PRICE_CACHE_KEY)) ?? {}; }
  catch { return {}; }
}

function savePriceCache(cache) {
  localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(cache));
}

function mergePriceCache(entries) {
  const cache = getPriceCache();
  Object.assign(cache, entries);
  savePriceCache(cache);
}

function getCachedPrice(ticker) {
  const entry = getPriceCache()[ticker];
  return entry ? entry.price : null;
}

function getCachedPrev(ticker) {
  const entry = getPriceCache()[ticker];
  return entry ? (entry.prev ?? null) : null;
}

async function fetchLatestPrice(ticker) {
  const entry = getPriceCache()[ticker];
  if (entry && Date.now() - entry.ts < PRICE_CACHE_TTL && "prev" in entry) return entry.price;
  try {
    const res = await fetch(`${API_BASE_URL}/price/${encodeURIComponent(ticker)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.price;
    if (price == null || typeof price !== "number" || !isFinite(price) || price <= 0) return null;
    mergePriceCache({ [ticker]: { price, prev: data.previousClose ?? null, ts: Date.now() } });
    return price;
  } catch { return null; }
}

async function fetchPricesBatch(tickers) {
  if (!tickers.length) return {};
  const cache = getPriceCache();
  const now = Date.now();
  const fresh = {};
  const stale = [];
  for (const t of tickers) {
    const e = cache[t];
    if (e && now - e.ts < PRICE_CACHE_TTL && "prev" in e) fresh[t] = e.price;
    else stale.push(t);
  }
  if (!stale.length) return fresh;
  try {
    const res = await fetch(`${API_BASE_URL}/prices?symbols=${stale.map(encodeURIComponent).join(",")}`);
    if (res.ok) {
      const data = await res.json();
      const newEntries = {};
      for (const [sym, entry] of Object.entries(data)) {
        const price = typeof entry === "number" ? entry : entry?.price;
        const prev = typeof entry === "object" ? (entry?.prev ?? null) : null;
        if (typeof price === "number" && isFinite(price) && price > 0) {
          newEntries[sym] = { price, prev, ts: now };
          fresh[sym] = price;
        }
      }
      mergePriceCache(newEntries);
    }
  } catch {}
  return fresh;
}

function calcPositionTotals(pos) {
  const invested = (pos.avgPrice || 0) * (pos.quantity || 0);
  const commPercent = pos.commissionPercent || 0;
  const comm = invested * commPercent / 100;
  const iva = pos.applyIva ? comm * (pos.ivaRate || 0) / 100 : 0;
  return { invested, comm, iva, total: invested + comm + iva };
}

function getCachedExchangeRate(from, to) {
  if (from === to) return 1;
  return getCachedPrice(`${from}${to}=X`);
}

function convertAmount(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;
  const rate = getCachedExchangeRate(fromCurrency, toCurrency);
  return rate !== null ? amount * rate : null;
}

async function fetchExchangeRates(fromCurrencies, toCurrency) {
  const unique = [...new Set(fromCurrencies)].filter(c => c && c !== toCurrency);
  if (!unique.length) return;
  await Promise.all(unique.map(from => fetchLatestPrice(`${from}${toCurrency}=X`)));
}

const TICKER_CURRENCY_SUFFIXES = {
  ".MX": "MXN", ".SA": "BRL", ".L": "GBP", ".IL": "GBP",
  ".PA": "EUR", ".DE": "EUR", ".MC": "EUR", ".MI": "EUR",
  ".AS": "EUR", ".BR": "EUR", ".LS": "EUR", ".VI": "EUR",
  ".TO": "CAD", ".V": "CAD",
  ".AX": "AUD", ".NZ": "NZD",
  ".HK": "HKD", ".T": "JPY", ".SS": "CNY", ".SZ": "CNY",
};

function detectCurrencyFromTicker(ticker) {
  if (!ticker) return null;
  const t = ticker.toUpperCase();
  for (const [suffix, cur] of Object.entries(TICKER_CURRENCY_SUFFIXES)) {
    if (t.endsWith(suffix.toUpperCase())) return cur;
  }
  return null;
}

function getPosCurrency(pos, fallback) {
  return pos.currency || detectCurrencyFromTicker(pos.ticker) || fallback || "USD";
}

function reconstructRealizedPnL(portfolio) {
  if (!portfolio.transactions || !portfolio.transactions.length) return 0;
  const portfolioCur = portfolio.currency || "USD";
  const txs = [...portfolio.transactions]
    .filter(tx => tx.type === "COMPRA" || tx.type === "VENTA")
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const costBasis = {};
  let total = 0;
  for (const tx of txs) {
    const ticker = tx.ticker;
    const txCur = tx.currency || portfolioCur;
    if (!costBasis[ticker]) costBasis[ticker] = { qty: 0, totalCost: 0 };
    const cb = costBasis[ticker];
    if (tx.type === "COMPRA") {
      cb.qty += tx.quantity || 0;
      cb.totalCost += tx.net || 0;
    } else if (tx.type === "VENTA" && cb.qty > 0) {
      const avgCost = cb.totalCost / cb.qty;
      const costOfSold = avgCost * (tx.quantity || 0);
      const proceeds = tx.net || 0;
      const pnlInTxCur = proceeds - costOfSold;
      total += txCur !== portfolioCur ? (convertAmount(pnlInTxCur, txCur, portfolioCur) ?? pnlInTxCur) : pnlInTxCur;
      cb.totalCost = Math.max(0, cb.totalCost - costOfSold);
      cb.qty = Math.max(0, cb.qty - (tx.quantity || 0));
    }
  }
  return total;
}

function calcPortfolioTotals(positions, portfolioCurrency) {
  let totalInvested = 0, totalComm = 0, totalIva = 0;
  const pCur = portfolioCurrency || "USD";
  (positions || []).forEach((pos) => {
    const t = calcPositionTotals(pos);
    const posCur = getPosCurrency(pos, pCur);
    totalInvested += convertAmount(t.total, posCur, pCur) ?? t.total;
    totalComm += convertAmount(t.comm, posCur, pCur) ?? t.comm;
    totalIva += convertAmount(t.iva, posCur, pCur) ?? t.iva;
  });
  return { totalInvested, totalComm, totalIva };
}

function showTrackerListView() {
  if (_dashRefreshTimer) { clearInterval(_dashRefreshTimer); _dashRefreshTimer = null; }
  document.getElementById("trackerListView").classList.remove("hidden");
  document.getElementById("trackerDashView").classList.add("hidden");
  renderPortfolioCards();
  renderWatchlist();
}

function _invalidatePriceCache(portfolioId) {
  const portfolio = getPortfolios().find((p) => p.id === portfolioId);
  if (!portfolio) return;
  const tickers = [...new Set((portfolio.positions || []).map((p) => p.ticker))];
  if (!tickers.length) return;
  const cache = getPriceCache();
  tickers.forEach(t => { if (cache[t]) cache[t].ts = 0; });
  savePriceCache(cache);
}

function showTrackerDashView(portfolioId) {
  if (_dashRefreshTimer) { clearInterval(_dashRefreshTimer); _dashRefreshTimer = null; }
  activePortfolioId = portfolioId;
  perfTabLoaded = false;
  perfDailyReturns = null;
  perfReportData = null;
  mcTabLoaded = false;
  _invalidatePriceCache(portfolioId);
  // Reset to Summary tab
  document.querySelectorAll(".tracker-tab-btn").forEach((b) => b.classList.remove("active"));
  const summaryBtn = document.querySelector(".tracker-tab-btn[data-tab='summary']");
  if (summaryBtn) summaryBtn.classList.add("active");
  document.getElementById("tabPanelSummary").style.display = "";
  document.getElementById("tabPanelDesempeno").style.display = "none";
  document.getElementById("tabPanelTransacciones").style.display = "none";
  document.getElementById("tabPanelProyeccion").style.display = "none";
  document.getElementById("tabPanelDividendos").style.display = "none";
  document.getElementById("tabPanelRebalanceo").style.display = "none";
  document.getElementById("tabPanelCorrelacion").style.display = "none";
  document.getElementById("tabPanelWhatif").style.display = "none";
  corrTabLoaded = false;
  document.getElementById("trackerListView").classList.add("hidden");
  document.getElementById("trackerDashView").classList.remove("hidden");
  renderPortfolioDashboard();
  _dashRefreshTimer = setInterval(() => {
    const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
    if (!portfolio) return;
    const tickers = [...new Set((portfolio.positions || []).map((p) => p.ticker))];
    if (!tickers.length) return;
    const cache = getPriceCache();
    tickers.forEach(t => { if (cache[t]) cache[t].ts = 0; });
    savePriceCache(cache);
    renderPortfolioDashboard();
  }, 5 * 60 * 1000);
}

function renderPortfolioCards() {
  const portfolios = getPortfolios();
  const grid = document.getElementById("portfolioCardsGrid");
  const emptyMsg = document.getElementById("noPortfoliosMsg");

  if (!portfolios.length) {
    grid.innerHTML = "";
    emptyMsg.classList.remove("hidden");
    return;
  }

  emptyMsg.classList.add("hidden");
  grid.innerHTML = portfolios.map((p) => {
    const positions = p.positions || [];
    const { totalInvested } = calcPortfolioTotals(positions, p.currency);
    const date = new Date(p.createdAt).toLocaleDateString("es-MX", {
      day: "2-digit", month: "short", year: "numeric"
    });
    const benchLabel = BENCHMARKS[p.benchmark] || "";
    const currLabel = p.currency || "USD";
    return `
      <button class="portfolio-card" type="button" data-portfolio-id="${p.id}">
        <div class="portfolio-card-header">
          <h3>${p.name}</h3>
          <span role="button" class="portfolio-card-delete" data-delete-id="${p.id}" data-delete-name="${p.name}" title="Eliminar portafolio" tabindex="0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </span>
        </div>
        <div class="portfolio-card-footer">
          <span class="portfolio-card-date">Creado ${date}</span>
          <span class="portfolio-card-cta">Ver portafolio →</span>
        </div>
      </button>
    `;
  }).join("");

  grid.querySelectorAll("[data-portfolio-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (e.target.closest("[data-delete-id]")) return;
      showTrackerDashView(btn.dataset.portfolioId);
    });
  });

  grid.querySelectorAll("[data-delete-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      pendingDeleteId = btn.dataset.deleteId;
      document.getElementById("deletePortfolioNameLabel").textContent = btn.dataset.deleteName || "este portafolio";
      document.getElementById("deletePortfolioModal").classList.remove("hidden");
    });
  });
}

function setDashPriceStatus(msg, type) {
  const el = document.getElementById("dashPriceStatus");
  if (!el) return;
  el.textContent = msg;
  el.className = "tracker-price-status-msg" + (type ? " " + type : "");
}

async function renderPortfolioDashboard() {
  let portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
  if (!portfolio) { showTrackerListView(); return; }

  // Invalidar métricas de desempeño al cambiar posiciones
  perfTabLoaded = false;
  perfDailyReturns = null;
  perfReportData = null;

  _doRenderDashboard(portfolio);
  const tickers = [...new Set((portfolio.positions || []).map((p) => p.ticker))];
  if (!tickers.length) return;

  setDashPriceStatus("Obteniendo precios de mercado...", "loading");
  const posCurrencies = (portfolio.positions || []).map(p => getPosCurrency(p, portfolio.currency || "USD"));
  const [priceMap] = await Promise.all([
    fetchPricesBatch(tickers),
    fetchExchangeRates(posCurrencies, portfolio.currency || "USD")
  ]);
  const results = tickers.map(t => ({ t, p: priceMap[t] ?? null }));
  const failed = results.filter((r) => r.p === null).map((r) => r.t);

  // Sincronizar dividendos automáticamente (necesita FX cargado para conversión)
  const portfolios = getPortfolios();
  const stored = portfolios.find((p) => p.id === activePortfolioId);
  if (stored) {
    const divChanged = await syncDividends(stored);
    if (divChanged) {
      savePortfolios(portfolios);
      portfolio = stored;
      // Si la pestaña de transacciones está visible, refrescarla
      const txPanel = document.getElementById("tabPanelTransacciones");
      if (txPanel && txPanel.style.display !== "none") renderTransactionsTab();
    }
  }
  _doRenderDashboard(portfolio);

  const portfolioCur = portfolio.currency || "USD";
  const needsFx = (portfolio.positions || []).some(p => getPosCurrency(p, portfolioCur) !== portfolioCur);
  const fxNote = needsFx ? " · tipos de cambio aplicados" : "";
  if (failed.length === tickers.length) {
    setDashPriceStatus("No se pudieron obtener precios. Intenta de nuevo en un momento.", "error");
  } else if (failed.length) {
    setDashPriceStatus(`Precios actualizados${fxNote}. Sin datos para: ${failed.join(", ")}`, "warn");
  } else {
    const now = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    setDashPriceStatus(`Precios actualizados${fxNote} · ${now}`, "ok");
  }

  // Si el tab de desempeño está activo, recalcular métricas con las nuevas posiciones
  const activeTab = document.querySelector(".tracker-tab-btn.active");
  if (activeTab && activeTab.dataset.tab === "desempeno") {
    const updatedPortfolio = getPortfolios().find((p) => p.id === activePortfolioId);
    if (updatedPortfolio) loadPerformanceTab(updatedPortfolio);
  }
}

// ── XIRR (Newton-Raphson) ──────────────────────────────────────────────────
function _xirrNpv(amounts, yrs, rate) {
  let npv = 0, dnpv = 0;
  for (let j = 0; j < amounts.length; j++) {
    const f = Math.pow(1 + rate, yrs[j]);
    if (!isFinite(f) || f === 0) return { npv: NaN, dnpv: NaN };
    npv  += amounts[j] / f;
    dnpv -= yrs[j] * amounts[j] / (f * (1 + rate));
  }
  return { npv, dnpv };
}

function calcXirr(cashFlows) {
  if (!cashFlows || cashFlows.length < 2) return null;
  if (!cashFlows.some(f => f.amount < 0) || !cashFlows.some(f => f.amount > 0)) return null;
  const t0      = cashFlows[0].date.getTime();
  const amounts = cashFlows.map(f => f.amount);
  const yrs     = cashFlows.map(f => (f.date.getTime() - t0) / (365.25 * 864e5));
  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const { npv, dnpv } = _xirrNpv(amounts, yrs, rate);
    if (!isFinite(npv) || Math.abs(dnpv) < 1e-12) return null;
    const delta = npv / dnpv;
    rate -= delta;
    if (Math.abs(delta) < 1e-7) return isFinite(rate) && rate > -1 ? rate : null;
  }
  return null;
}

function buildXirrFlows(portfolio, currentValue) {
  const txs = (portfolio.transactions || [])
    .filter(t => t.date && t.net != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!txs.length || currentValue <= 0) return null;
  const flows = txs.map(tx => ({
    amount: tx.type === "COMPRA" ? -Math.abs(tx.net) : Math.abs(tx.net),
    date: new Date(tx.date)
  }));
  flows.push({ amount: currentValue, date: new Date() });
  return flows;
}

// ── Sparklines ─────────────────────────────────────────────────────────────
const _sparklineCache = {};

async function drawAllSparklines(positions) {
  const tickers = [...new Set(positions.map(p => p.ticker))];
  await Promise.all(tickers.map(async (ticker) => {
    const canvases = [...document.querySelectorAll(".pos-sparkline")].filter(c => c.dataset.ticker === ticker);
    if (!canvases.length) return;
    let closes = _sparklineCache[ticker];
    if (!closes) {
      try {
        const res = await fetch(`${API_BASE_URL}/chart/${encodeURIComponent(ticker)}?range=1mo&interval=1d`);
        if (!res.ok) return;
        const data = await res.json();
        const result = data?.chart?.result?.[0];
        if (!result) return;
        const raw = result.indicators?.quote?.[0]?.close || [];
        closes = raw.filter(v => v !== null && v !== undefined && isFinite(v));
        if (closes.length >= 2) _sparklineCache[ticker] = closes;
        else return;
      } catch { return; }
    }
    canvases.forEach(c => _drawSparkline(c, closes));
  }));
}

function _drawSparkline(canvas, values) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const min  = Math.min(...values);
  const max  = Math.max(...values);
  const rng  = max - min || 1;
  const isUp = values[values.length - 1] >= values[0];
  const col  = isUp ? "#32d6a2" : "#ff6b81";
  const pts  = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: h - ((v - min) / rng) * (h - 4) - 2
  }));
  ctx.beginPath();
  ctx.moveTo(pts[0].x, h);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, h);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, isUp ? "rgba(50,214,162,0.2)" : "rgba(255,107,129,0.2)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = col;
  ctx.lineWidth   = 1.5;
  ctx.lineJoin    = "round";
  ctx.stroke();
}

// ── KPI flash animation ─────────────────────────────────────────────────────
function flashKpi(el, isPositive) {
  if (!el) return;
  el.classList.remove("kpi-flash-pos", "kpi-flash-neg");
  void el.offsetWidth;
  el.classList.add(isPositive ? "kpi-flash-pos" : "kpi-flash-neg");
}

function _doRenderDashboard(portfolio) {
  const positions = portfolio.positions || [];
  const currency = portfolio.currency || "USD";
  const { totalInvested, totalComm, totalIva } = calcPortfolioTotals(positions, currency);

  let totalCurrentValue = 0;
  let totalCostPriced = 0;
  let hasAnyPrice = false;
  positions.forEach((pos) => {
    const price = getCachedPrice(pos.ticker);
    const posCur = getPosCurrency(pos, currency);
    if (price !== null) {
      hasAnyPrice = true;
      totalCurrentValue += convertAmount(price * (pos.quantity || 0), posCur, currency) ?? (price * (pos.quantity || 0));
      totalCostPriced += convertAmount(calcPositionTotals(pos).total, posCur, currency) ?? calcPositionTotals(pos).total;
    }
  });

  const cashBalance = portfolio.cashBalance || 0;
  const realizedPnL = portfolio.realizedPnL !== undefined
    ? portfolio.realizedPnL
    : reconstructRealizedPnL(portfolio);

  const displayCurrentValue = (hasAnyPrice ? totalCurrentValue : 0) + cashBalance;
  _lastPortfolioCurrentValue = displayCurrentValue > 0 ? displayCurrentValue : null;
  const unrealizedPnL = hasAnyPrice ? totalCurrentValue - totalCostPriced : 0;
  const showReturn = hasAnyPrice || (!positions.length && realizedPnL !== 0);
  const returnAmt = showReturn ? unrealizedPnL + realizedPnL : null;
  const returnPct = returnAmt !== null && displayCurrentValue > 0
    ? (returnAmt / displayCurrentValue * 100)
    : null;

  document.getElementById("dashPortfolioName").textContent = portfolio.name;
  document.getElementById("dashTotalInvested").textContent = formatCurrency(totalInvested, currency);
  document.getElementById("dashPositionCount").textContent = positions.length;
  document.getElementById("dashTotalCommissions").textContent = formatCurrency(totalComm, currency);
  document.getElementById("dashTotalIva").textContent = formatCurrency(totalIva, currency);
  document.getElementById("dashBenchmark").textContent = BENCHMARKS[portfolio.benchmark] || "—";

  const cvEl = document.getElementById("dashCurrentValue");
  cvEl.textContent = (hasAnyPrice || cashBalance > 0) ? formatCurrency(displayCurrentValue, currency) : "—";

  const retAmtEl = document.getElementById("dashReturnAmt");
  const retPctEl = document.getElementById("dashReturnPct");
  if (returnAmt !== null) {
    const sign = returnAmt >= 0 ? "+" : "";
    retAmtEl.textContent = sign + formatCurrency(returnAmt, currency);
    retAmtEl.className = returnAmt >= 0 ? "return-pos" : "return-neg";
    retPctEl.textContent = sign + returnPct.toFixed(2) + "%";
    retPctEl.className = returnPct >= 0 ? "return-pos" : "return-neg";
    if (hasAnyPrice) flashKpi(retAmtEl, returnAmt >= 0);
  } else {
    retAmtEl.textContent = "—"; retAmtEl.className = "";
    retPctEl.textContent = "—"; retPctEl.className = "";
  }

  // XIRR
  const xirrEl = document.getElementById("dashXirr");
  if (xirrEl) {
    const flows = buildXirrFlows(portfolio, displayCurrentValue);
    const xirrRate = flows ? calcXirr(flows) : null;
    if (xirrRate !== null) {
      const sign2 = xirrRate >= 0 ? "+" : "";
      xirrEl.textContent = sign2 + (xirrRate * 100).toFixed(2) + "%";
      xirrEl.className = xirrRate >= 0 ? "return-pos" : "return-neg";
    } else {
      xirrEl.textContent = "—";
      xirrEl.className = "";
    }
  }

  renderSummaryTable(positions, totalInvested, currency, cashBalance);
  renderPositionsTable(positions, totalInvested, currency, portfolio.transactions || []);
  if (positions.length) drawAllSparklines(positions);
  drawDonutChart(document.getElementById("portfolioDonutChart"), positions, totalInvested, currency, cashBalance);
  renderDonutLegend(positions, totalInvested, currency, cashBalance);
  drawHoldingsBarChart(document.getElementById("holdingsBarChart"), positions, currency);
  renderAllocationCharts(positions, totalInvested, currency, cashBalance);
}

function renderSummaryTable(positions, totalInvested, currency, cashBalance) {
  const tbody = document.getElementById("summaryTableBody");
  const emptyMsg = document.getElementById("noPositionsSummaryMsg");
  const cash = cashBalance || 0;

  if (!positions.length && cash <= 0) {
    tbody.innerHTML = "";
    emptyMsg.classList.remove("hidden");
    return;
  }
  emptyMsg.classList.add("hidden");

  const rows = positions.map((pos, i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const posCur = getPosCurrency(pos, currency);
    const price = getCachedPrice(pos.ticker);
    const prev = getCachedPrev(pos.ticker);
    const currTag = posCur !== currency ? ` <small class="fx-tag">${posCur}</small>` : "";

    let priceCell = "—";
    let changeAbsCell = "—";
    let changePctCell = "—";
    let posValueCell = "—";

    if (price !== null) {
      const priceConverted = convertAmount(price, posCur, currency) ?? price;
      priceCell = formatCurrency(priceConverted, currency);
      const posValueRaw = convertAmount(price * pos.quantity, posCur, currency) ?? (price * pos.quantity);
      posValueCell = formatCurrency(posValueRaw, currency);

      if (prev !== null && prev > 0) {
        const dailyChangeRaw = price - prev;
        const dailyChangePct = dailyChangeRaw / prev * 100;
        const dailyChangeConverted = convertAmount(dailyChangeRaw * pos.quantity, posCur, currency) ?? (dailyChangeRaw * pos.quantity);
        const cls = dailyChangeRaw >= 0 ? "return-pos" : "return-neg";
        const sign = dailyChangeRaw >= 0 ? "+" : "";
        changeAbsCell = `<span class="${cls}">${sign}${formatCurrency(dailyChangeConverted, currency)}</span>`;
        changePctCell = `<span class="${cls}">${sign}${dailyChangePct.toFixed(2)}%</span>`;
      }
    }

    return `<tr>
      <td><span class="pos-ticker-dot" style="background:${color}"></span>${pos.ticker}${currTag}</td>
      <td>${priceCell}</td>
      <td>${changeAbsCell}</td>
      <td>${changePctCell}</td>
      <td>${posValueCell}</td>
    </tr>`;
  });

  if (cash > 0) {
    rows.push(`<tr>
      <td><span class="pos-ticker-dot" style="background:#4ade80"></span><strong>Cash</strong></td>
      <td>—</td>
      <td>—</td>
      <td>—</td>
      <td>${formatCurrency(cash, currency)}</td>
    </tr>`);
  }

  tbody.innerHTML = rows.join("");
}

function renderPositionsTable(positions, totalInvested, currency, transactions) {
  const tbody = document.getElementById("positionsTableBody");
  const tableShell = document.getElementById("positionsTableShell");
  const emptyMsg = document.getElementById("noPositionsMsg");

  if (!positions.length) {
    tableShell.classList.add("hidden");
    emptyMsg.classList.remove("hidden");
    return;
  }
  tableShell.classList.remove("hidden");
  emptyMsg.classList.add("hidden");
  tableShell.classList.add("is-loading-prices");

  tbody.innerHTML = positions.map((pos, i) => {
    const t = calcPositionTotals(pos);
    const posCur = getPosCurrency(pos, currency);
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const currentPrice = getCachedPrice(pos.ticker);
    const currentValueRaw = currentPrice !== null ? currentPrice * pos.quantity : null;
    const currentValue = currentValueRaw !== null ? (convertAmount(currentValueRaw, posCur, currency) ?? currentValueRaw) : null;
    const costConverted = convertAmount(t.total, posCur, currency) ?? t.total;
    const dateStr = pos.purchaseDate
      ? new Date(pos.purchaseDate + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
      : "—";
    let retCell = "—";
    if (currentValue !== null && costConverted > 0) {
      const retAmt = currentValue - costConverted;
      const retPct = retAmt / costConverted * 100;
      const sign = retAmt >= 0 ? "+" : "";
      retCell = `<span class="${retAmt >= 0 ? "return-pos" : "return-neg"}">${sign}${retPct.toFixed(2)}%<br><small>${sign}${formatCurrency(retAmt, currency)}</small></span>`;
    }
    const currTag = posCur !== currency ? ` <small class="fx-tag">${posCur}</small>` : "";

    // Lots sub-rows from transaction history
    const txs = (transactions || [])
      .filter(tx => tx.ticker === pos.ticker)
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const lotsHtml = txs.length ? `<tr class="pos-lots-row" data-lots-for="${pos.id}" style="display:none">
      <td colspan="10" class="pos-lots-cell"><div class="pos-lots-inner">
        <table class="pos-lots-table">
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Precio</th><th>Total neto</th></tr></thead>
          <tbody>${txs.map(tx => {
            const d = tx.date ? new Date(tx.date.includes("T") ? tx.date : tx.date + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";
            const tc = tx.type === "COMPRA" ? "compra" : tx.type === "VENTA" ? "venta" : "dividendo";
            return `<tr><td>${d}</td><td><span class="lot-type-badge lot-type-${tc}">${tx.type}</span></td><td>${parseFloat((tx.quantity || 0).toFixed(5))}</td><td>${formatCurrency(tx.price || 0, tx.currency || posCur)}</td><td>${formatCurrency(Math.abs(tx.net || 0), tx.currency || posCur)}</td></tr>`;
          }).join("")}</tbody>
        </table>
      </div></td></tr>` : "";

    return `<tr class="pos-row">
      <td>
        ${txs.length ? `<button class="pos-expand-btn" type="button" data-lots-for="${pos.id}" aria-label="Ver lotes"><svg class="pos-expand-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>` : ""}
        <span class="pos-ticker-dot" style="background:${color}"></span><strong>${pos.ticker}</strong>${currTag}
      </td>
      <td class="td-sparkline"><canvas class="pos-sparkline" data-ticker="${pos.ticker}" width="80" height="28"></canvas></td>
      <td>${dateStr}</td>
      <td>${formatCurrency(pos.avgPrice, posCur)}</td>
      <td>${currentPrice !== null ? formatCurrency(currentPrice, posCur) : '<span class="muted-val">…</span>'}</td>
      <td>${parseFloat(pos.quantity.toFixed(5))}</td>
      <td>${formatCurrency(costConverted, currency)}</td>
      <td>${currentValue !== null ? formatCurrency(currentValue, currency) : '<span class="muted-val">…</span>'}</td>
      <td>${retCell}</td>
      <td class="pos-actions-cell">
        <button class="pos-withdraw-btn" type="button" data-pos-id="${pos.id}" title="Retirar posicion">Retirar</button>
        <button class="pos-delete-btn" type="button" data-pos-id="${pos.id}" title="Eliminar">✕</button>
      </td>
    </tr>${lotsHtml}`;
  }).join("");

  // Remove skeleton once prices are in the DOM
  if (positions.some(p => getCachedPrice(p.ticker) !== null)) {
    tableShell.classList.remove("is-loading-prices");
  }

  tbody.querySelectorAll(".pos-expand-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lotsRow = tbody.querySelector(`[data-lots-for="${btn.dataset.lotsFor}"]`);
      if (!lotsRow) return;
      const open = lotsRow.style.display !== "none";
      lotsRow.style.display = open ? "none" : "";
      btn.classList.toggle("is-expanded", !open);
    });
  });

  tbody.querySelectorAll(".pos-withdraw-btn").forEach((btn) => {
    btn.addEventListener("click", () => openWithdrawModal(btn.dataset.posId));
  });

  tbody.querySelectorAll(".pos-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const portfolios = getPortfolios();
      const portfolio = portfolios.find((p) => p.id === activePortfolioId);
      if (!portfolio) return;
      portfolio.positions = (portfolio.positions || []).filter((p) => p.id !== btn.dataset.posId);
      savePortfolios(portfolios);
      renderPortfolioDashboard();
    });
  });
}

function openWithdrawModal(posId) {
  const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
  if (!portfolio) return;
  const pos = (portfolio.positions || []).find((p) => p.id === posId);
  if (!pos) return;
  const posCur = getPosCurrency(pos, portfolio.currency || "USD");
  const cachedPrice = getCachedPrice(pos.ticker);

  document.getElementById("withdrawPosId").value = posId;
  document.getElementById("withdrawTickerDisplay").textContent = pos.ticker + (posCur !== (portfolio.currency || "USD") ? ` (${posCur})` : "");
  const fillPrice = cachedPrice !== null ? cachedPrice : pos.avgPrice;
  document.getElementById("withdrawSellPriceInput").value = parseFloat(fillPrice.toFixed(4));
  document.getElementById("withdrawQuantityInput").value = pos.quantity;
  document.getElementById("withdrawMaxQtyNote").textContent = `Máx: ${pos.quantity}`;
  document.getElementById("withdrawCommissionInput").value = pos.commissionPercent || 0;
  document.getElementById("withdrawIvaCheck").checked = pos.applyIva || false;
  document.getElementById("withdrawIvaRateInput").value = pos.ivaRate || 16;
  document.getElementById("withdrawIvaRateRow").classList.toggle("hidden", !pos.applyIva);
  updateWithdrawPreview(pos, portfolio.currency || "USD");
  document.getElementById("withdrawPositionModal").classList.remove("hidden");
}

function calcWithdrawNet(sellPrice, qty, commPct, applyIva, ivaRate) {
  const gross = sellPrice * qty;
  const comm = gross * commPct / 100;
  const iva = applyIva ? comm * ivaRate / 100 : 0;
  return gross - comm - iva;
}

function updateWithdrawPreview(pos, portfolioCurrency) {
  const sellPrice = parseFloat(document.getElementById("withdrawSellPriceInput").value) || 0;
  const qty = parseFloat(document.getElementById("withdrawQuantityInput").value) || 0;
  const commPct = parseFloat(document.getElementById("withdrawCommissionInput").value) || 0;
  const applyIva = document.getElementById("withdrawIvaCheck").checked;
  const ivaRate = applyIva ? parseFloat(document.getElementById("withdrawIvaRateInput").value) || 0 : 0;
  const posCur = pos ? getPosCurrency(pos, portfolioCurrency) : portfolioCurrency;
  const net = calcWithdrawNet(sellPrice, qty, commPct, applyIva, ivaRate);
  const netConverted = posCur !== portfolioCurrency ? (convertAmount(net, posCur, portfolioCurrency) ?? net) : net;
  const el = document.getElementById("withdrawNetPreview");
  el.textContent = net > 0 ? formatCurrency(netConverted, portfolioCurrency) : "—";
}

async function syncDividends(portfolio) {
  if (!portfolio.positions?.length) return false;
  if (!portfolio.transactions) portfolio.transactions = [];
  const portfolioCur = portfolio.currency || "USD";
  const todayStr = new Date().toISOString().slice(0, 10);

  // Index ya-registrados (ticker|fecha) para idempotencia
  const existing = new Set(
    portfolio.transactions
      .filter((t) => t.type === "DIVIDENDO")
      .map((t) => `${t.ticker}|${(t.date || "").slice(0, 10)}`)
  );

  let changed = false;
  // Agrupar por ticker para evitar fetch duplicado si hay múltiples lotes del mismo activo
  const tickers = [...new Set(portfolio.positions.map((p) => p.ticker))];

  for (const ticker of tickers) {
    let history;
    try {
      const res = await fetch(`${API_BASE_URL}/dividends/${encodeURIComponent(ticker)}`);
      if (!res.ok) continue;
      const data = await res.json();
      history = data?.history || [];
    } catch { continue; }
    if (!history.length) continue;

    const positionsForTicker = portfolio.positions.filter((p) => p.ticker === ticker);

    for (const div of history) {
      if (!div.date || div.amount == null) continue;
      if (div.date > todayStr) continue;
      const key = `${ticker}|${div.date}`;
      if (existing.has(key)) continue;

      // Sumar cantidad de las posiciones cuyo purchaseDate es <= ex-date
      let qtyAtExDate = 0;
      let posCur = portfolioCur;
      for (const pos of positionsForTicker) {
        if (!pos.purchaseDate) continue;
        if (pos.purchaseDate <= div.date) {
          qtyAtExDate += pos.quantity || 0;
          posCur = getPosCurrency(pos, portfolioCur);
        }
      }
      if (qtyAtExDate <= 0) continue;

      const perShare = Number(div.amount);
      const gross = perShare * qtyAtExDate;
      const grossInPortfolioCur = posCur !== portfolioCur
        ? (convertAmount(gross, posCur, portfolioCur) ?? gross)
        : gross;

      portfolio.transactions.unshift({
        id: `div_${ticker}_${div.date}`,
        date: new Date(div.date + "T12:00:00").toISOString(),
        type: "DIVIDENDO",
        ticker,
        quantity: qtyAtExDate,
        price: perShare,
        commissionPercent: 0,
        commCost: 0,
        net: gross,
        currency: posCur,
      });
      portfolio.cashBalance = (portfolio.cashBalance || 0) + grossInPortfolioCur;
      existing.add(key);
      changed = true;
    }
  }

  if (changed) {
    portfolio.transactions.sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  return changed;
}

// ── Tab: Dividendos ───────────────────────────────────────────────────────────
function renderDividendsTab() {
  const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
  if (!portfolio) return;
  const cur = portfolio.currency || "USD";
  renderDividendForecast(portfolio, cur);
  const divs = (portfolio.transactions || []).filter((t) => t.type === "DIVIDENDO");
  const tbody = document.querySelector("#divByTickerTable tbody");
  const emptyMsg = document.getElementById("divEmptyMsg");
  const table = document.getElementById("divByTickerTable");

  const conv = (amt, from) => convertAmount(amt, from || cur, cur) ?? amt;
  const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  let totalReceived = 0, trailing12 = 0;
  const byTicker = {};
  divs.forEach((tx) => {
    const amt = conv(tx.net || 0, tx.currency);
    totalReceived += amt;
    if (new Date(tx.date) >= oneYearAgo) trailing12 += amt;
    if (!byTicker[tx.ticker]) byTicker[tx.ticker] = { count: 0, total: 0, last: null, trailing: 0 };
    const b = byTicker[tx.ticker];
    b.count++; b.total += amt;
    if (new Date(tx.date) >= oneYearAgo) b.trailing += amt;
    if (!b.last || tx.date > b.last) b.last = tx.date;
  });

  // Costo invertido por ticker (para yield sobre costo)
  const investedByTicker = {};
  (portfolio.positions || []).forEach((pos) => {
    const t = calcPositionTotals(pos);
    const posCur = getPosCurrency(pos, cur);
    investedByTicker[pos.ticker] = (investedByTicker[pos.ticker] || 0) + (convertAmount(t.total, posCur, cur) ?? t.total);
  });
  const totalInvested = Object.values(investedByTicker).reduce((s, v) => s + v, 0);

  document.getElementById("divTotalReceived").textContent = formatCurrency(totalReceived, cur);
  document.getElementById("divTrailing12").textContent = formatCurrency(trailing12, cur);
  document.getElementById("divPayerCount").textContent = Object.keys(byTicker).length;
  document.getElementById("divYieldOnCost").textContent =
    totalInvested > 0 ? `${(trailing12 / totalInvested * 100).toFixed(2)}%` : "—";

  const tickers = Object.keys(byTicker).sort((a, b) => byTicker[b].total - byTicker[a].total);
  if (!tickers.length) {
    table.style.display = "none";
    emptyMsg.style.display = "";
    tbody.innerHTML = "";
    return;
  }
  table.style.display = "";
  emptyMsg.style.display = "none";
  tbody.innerHTML = tickers.map((tk) => {
    const b = byTicker[tk];
    const inv = investedByTicker[tk] || 0;
    const yoc = inv > 0 ? `${(b.trailing / inv * 100).toFixed(2)}%` : "—";
    const last = b.last ? new Date(b.last).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" }) : "—";
    return `<tr><td><strong>${tk}</strong></td><td>${b.count}</td><td>${formatCurrency(b.total, cur)}</td><td>${last}</td><td>${yoc}</td></tr>`;
  }).join("");
}

// ── Calendario de dividendos futuros (proyección 12m) ──────────────────────────
let _divForecastToken = 0;
async function renderDividendForecast(portfolio, cur) {
  const token = ++_divForecastToken;
  const tbody = document.querySelector("#divForecastTable tbody");
  const status = document.getElementById("divForecastStatus");
  const fcastEl = document.getElementById("divForecast12");
  if (!tbody || !status || !fcastEl) return;

  const qtyByTicker = {}, curByTicker = {};
  (portfolio.positions || []).forEach((pos) => {
    if ((pos.quantity || 0) <= 0) return;
    qtyByTicker[pos.ticker] = (qtyByTicker[pos.ticker] || 0) + pos.quantity;
    curByTicker[pos.ticker] = getPosCurrency(pos, cur);
  });
  const tickers = Object.keys(qtyByTicker);
  if (!tickers.length) {
    tbody.innerHTML = ""; fcastEl.textContent = "—";
    status.style.display = ""; status.textContent = "Agrega posiciones para estimar tus próximos dividendos.";
    return;
  }

  status.style.display = ""; status.textContent = "Estimando próximos pagos…";
  const todayStr = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const horizon = new Date(); horizon.setFullYear(horizon.getFullYear() + 1);
  const events = [];
  let forecast12 = 0;

  for (const ticker of tickers) {
    let history = [];
    try {
      const res = await fetch(`${API_BASE_URL}/dividends/${encodeURIComponent(ticker)}`);
      if (res.ok) history = (await res.json())?.history || [];
    } catch { /* ignore */ }
    if (token !== _divForecastToken) return;
    const past = history
      .filter((d) => d.date && d.amount != null && d.date <= todayStr)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    if (past.length < 2) continue;

    const last = past[past.length - 1];
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 13);
    const recent = past.filter((d) => new Date(d.date) >= cutoff);
    const perYear = Math.min(12, Math.max(1, recent.length || 1));
    const intervalMonths = Math.max(1, Math.round(12 / perYear));
    const sample = recent.length ? recent : past.slice(-4);
    const perShare = sample.reduce((s, d) => s + Number(d.amount), 0) / sample.length;

    const qty = qtyByTicker[ticker];
    const posCur = curByTicker[ticker] || cur;
    let next = new Date(last.date + "T12:00:00");
    next.setMonth(next.getMonth() + intervalMonths);
    let guard = 0;
    while (next <= horizon && guard < 24) {
      guard++;
      if (next > now) {
        const gross = perShare * qty;
        const grossCur = posCur !== cur ? (convertAmount(gross, posCur, cur) ?? gross) : gross;
        forecast12 += grossCur;
        events.push({ date: new Date(next), ticker, perShare, qty, amount: grossCur, posCur });
      }
      next = new Date(next); next.setMonth(next.getMonth() + intervalMonths);
    }
  }
  if (token !== _divForecastToken) return;

  events.sort((a, b) => a.date - b.date);
  fcastEl.textContent = events.length ? formatCurrency(forecast12, cur) : "—";
  if (!events.length) {
    tbody.innerHTML = "";
    status.style.display = ""; status.textContent = "No hay historial suficiente para proyectar dividendos de tus activos.";
    return;
  }
  status.style.display = "none";
  tbody.innerHTML = events.map((e) => {
    const d = e.date.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" });
    return `<tr><td>${d}</td><td><strong>${e.ticker}</strong></td><td>${formatCurrency(e.perShare, e.posCur)}</td><td>${e.qty}</td><td>${formatCurrency(e.amount, cur)}</td></tr>`;
  }).join("");
}

// ── Tab: Correlación / diversificación ─────────────────────────────────────────
function _pearson(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  let sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
  const ma = sa / n, mb = sb / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const xa = a[i] - ma, xb = b[i] - mb; num += xa * xb; da += xa * xa; db += xb * xb; }
  const den = Math.sqrt(da * db);
  return den > 0 ? num / den : 0;
}
function _corrColor(c) {
  const t = Math.max(-1, Math.min(1, c));
  if (t >= 0) {
    const r = Math.round(80 + t * 150), g = Math.round(185 - t * 150);
    return `rgba(${r},${g},90,${0.22 + 0.55 * t})`;
  }
  const b = Math.round(120 + (-t) * 120);
  return `rgba(70,120,${b},${0.22 + 0.45 * (-t)})`;
}
async function renderCorrelationTab(portfolio) {
  corrTabLoaded = true;
  const wrap = document.getElementById("corrMatrixWrap");
  const status = document.getElementById("corrStatus");
  const setMetric = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  ["corrAvgValue", "corrDivScore", "corrMaxPair", "corrMaxVal"].forEach((id) => setMetric(id, "—"));
  setMetric("corrDivLabel", "—");

  const tickers = [...new Set((portfolio.positions || []).filter((p) => (p.quantity || 0) > 0).map((p) => p.ticker))];
  if (tickers.length < 2) {
    wrap.innerHTML = "";
    status.style.display = ""; status.textContent = "Necesitas al menos 2 activos para calcular correlaciones.";
    corrTabLoaded = false; return;
  }
  status.style.display = ""; status.textContent = "Descargando históricos y calculando correlaciones…";
  wrap.innerHTML = "";

  const histories = await Promise.all(tickers.map((t) => fetchHistoricalCloses(t, "1y", "1d").then((h) => ({ t, h }))));
  const maps = {};
  histories.forEach(({ t, h }) => {
    maps[t] = {};
    (h || []).forEach((d) => { maps[t][new Date(d.ts).toISOString().slice(0, 10)] = d.close; });
  });
  const valid = tickers.filter((t) => Object.keys(maps[t]).length > 5);
  if (valid.length < 2) { status.textContent = "No se pudieron obtener suficientes datos históricos."; corrTabLoaded = false; return; }

  const sets = valid.map((t) => new Set(Object.keys(maps[t])));
  const common = [...sets[0]].filter((d) => sets.every((s) => s.has(d))).sort();
  if (common.length < 3) { status.textContent = "Fechas en común insuficientes para calcular correlaciones."; corrTabLoaded = false; return; }

  const rets = {};
  valid.forEach((t) => {
    const r = [];
    for (let i = 1; i < common.length; i++) { const c0 = maps[t][common[i - 1]], c1 = maps[t][common[i]]; r.push(c0 > 0 ? (c1 - c0) / c0 : 0); }
    rets[t] = r;
  });

  const n = valid.length, M = [];
  let sumPairs = 0, cntPairs = 0, maxV = -2, maxPair = "";
  for (let i = 0; i < n; i++) {
    M[i] = [];
    for (let j = 0; j < n; j++) {
      const c = i === j ? 1 : _pearson(rets[valid[i]], rets[valid[j]]);
      M[i][j] = c;
      if (j > i) { sumPairs += c; cntPairs++; if (c > maxV) { maxV = c; maxPair = `${valid[i]} · ${valid[j]}`; } }
    }
  }
  const avg = cntPairs ? sumPairs / cntPairs : 0;
  const score = Math.round((1 - Math.max(0, avg)) * 100);
  setMetric("corrAvgValue", avg.toFixed(2));
  setMetric("corrDivScore", score + "/100");
  setMetric("corrDivLabel", score >= 70 ? "Bien diversificado" : score >= 45 ? "Diversificación media" : "Concentrado / correlacionado");
  setMetric("corrMaxPair", maxPair || "—");
  setMetric("corrMaxVal", maxV > -2 ? maxV.toFixed(2) : "—");

  let html = '<table class="corr-matrix"><thead><tr><th></th>' + valid.map((t) => `<th>${t}</th>`).join("") + "</tr></thead><tbody>";
  for (let i = 0; i < n; i++) {
    html += `<tr><th>${valid[i]}</th>`;
    for (let j = 0; j < n; j++) {
      const c = M[i][j];
      html += `<td style="background:${_corrColor(c)};color:${Math.abs(c) > 0.6 ? "#fff" : "var(--text)"}" title="${valid[i]} vs ${valid[j]}: ${c.toFixed(2)}">${c.toFixed(2)}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  wrap.innerHTML = html;
  status.style.display = "none";
}

// ── Watchlist global (vigilar sin poseer) ──────────────────────────────────────
function getWatchlistKey() {
  const session = window.BlackPortfolioAuth.getSession();
  return `blackportfolio-watchlist-${session?.id || "anonymous"}`;
}
function getWatchlist() {
  try { return JSON.parse(localStorage.getItem(getWatchlistKey())) ?? []; } catch { return []; }
}
function saveWatchlist(list) { localStorage.setItem(getWatchlistKey(), JSON.stringify(list)); }

async function renderWatchlist() {
  const tbody = document.getElementById("watchlistTableBody");
  const empty = document.getElementById("watchlistEmptyMsg");
  const shell = document.getElementById("watchlistTableShell");
  if (!tbody || !empty || !shell) return;
  const list = getWatchlist();
  if (!list.length) { tbody.innerHTML = ""; shell.style.display = "none"; empty.style.display = ""; return; }
  shell.style.display = ""; empty.style.display = "none";
  tbody.innerHTML = list.map((tk) =>
    `<tr data-wl="${tk}" class="wl-row"><td><strong>${tk}</strong></td><td class="wl-price">…</td><td class="wl-chg">…</td>` +
    `<td><button class="wl-remove" data-wl-remove="${tk}" title="Quitar de la lista" type="button">✕</button></td></tr>`
  ).join("");

  const priceMap = await fetchPricesBatch(list);
  list.forEach((tk) => {
    const row = tbody.querySelector(`tr[data-wl="${CSS.escape(tk)}"]`);
    if (!row) return;
    const price = priceMap[tk] ?? getCachedPrice(tk);
    const prev = getCachedPrev(tk);
    const priceEl = row.querySelector(".wl-price");
    const chgEl = row.querySelector(".wl-chg");
    if (price == null) { priceEl.textContent = "—"; chgEl.textContent = "—"; return; }
    const cur = detectCurrencyFromTicker(tk) || "USD";
    priceEl.textContent = formatCurrency(price, cur);
    if (prev != null && prev > 0) {
      const chg = price - prev, pct = (chg / prev) * 100, sign = chg >= 0 ? "+" : "";
      chgEl.textContent = `${sign}${pct.toFixed(2)}%`;
      chgEl.className = "wl-chg " + (chg >= 0 ? "return-pos" : "return-neg");
    } else { chgEl.textContent = "—"; }
  });
}

function addToWatchlist(raw) {
  const sym = normalizeSymbol((raw || "").trim());
  if (!sym) return;
  const list = getWatchlist();
  if (list.includes(sym)) return;
  list.push(sym);
  saveWatchlist(list);
  renderWatchlist();
}
function removeFromWatchlist(sym) {
  saveWatchlist(getWatchlist().filter((t) => t !== sym));
  renderWatchlist();
}
function watchlistOpenInMarkets(symbol) {
  const navItem = document.querySelector('.dashboard-nav-item[data-section="markets"]');
  if (navItem?.dataset.locked === "1") { showUpgradeOverlay("markets"); return; }
  activateSection("markets");
  requestAnimationFrame(() => selectTicker(symbol));
}

// ── Tab: What-If (backtest comparativo) ────────────────────────────────────────
function drawWhatIfChart(dates, a, b, cur, altLabel) {
  const canvas = document.getElementById("whatifCanvas");
  if (!canvas) return;
  if (whatifRafId) cancelAnimationFrame(whatifRafId);
  const wrap = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const W = wrap.clientWidth || 600, H = 300;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + "px"; canvas.style.height = H + "px";
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const padL = 70, padR = 16, padT = 22, padB = 24;
  const all = a.concat(b);
  let mn = Math.min(...all), mx = Math.max(...all);
  if (mn === mx) { mn *= 0.99; mx *= 1.01; }
  const x = (i) => padL + (W - padL - padR) * (dates.length > 1 ? i / (dates.length - 1) : 0);
  const y = (v) => padT + (H - padT - padB) * (1 - (v - mn) / (mx - mn));
  const css = getComputedStyle(document.documentElement);
  const grid = (css.getPropertyValue("--border") || "").trim() || "rgba(150,150,150,0.2)";
  const txt = (css.getPropertyValue("--muted") || "").trim() || "#9aa";
  ctx.font = "11px system-ui";
  for (let g = 0; g <= 4; g++) {
    const yy = padT + (H - padT - padB) * g / 4;
    ctx.strokeStyle = grid; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(W - padR, yy); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = txt; ctx.fillText(formatCurrency(mx - (mx - mn) * g / 4, cur), 6, yy + 3);
  }
  const line = (arr, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
    arr.forEach((v, i) => { const px = x(i), py = y(v); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.stroke();
  };
  line(a, "#6f86ff");
  line(b, "#32d6a2");
  ctx.font = "12px system-ui";
  ctx.fillStyle = "#6f86ff"; ctx.fillRect(padL, padT - 12, 12, 4);
  ctx.fillStyle = txt; ctx.fillText("Tu portafolio", padL + 18, padT - 5);
  ctx.fillStyle = "#32d6a2"; ctx.fillRect(padL + 150, padT - 12, 12, 4);
  ctx.fillStyle = txt; ctx.fillText(altLabel, padL + 168, padT - 5);
}

async function runWhatIf() {
  const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
  if (!portfolio) return;
  const status = document.getElementById("whatifStatus");
  const statsGrid = document.getElementById("whatifStatsGrid");
  const cur = portfolio.currency || "USD";
  statsGrid.innerHTML = "";
  const altTicker = normalizeSymbol((document.getElementById("whatifTicker").value || "").trim());
  const amount = parseFloat(document.getElementById("whatifAmount").value) || 0;
  if (!altTicker) { status.style.display = ""; status.textContent = "Ingresa un activo alternativo válido."; return; }
  if (amount <= 0) { status.style.display = ""; status.textContent = "Ingresa un monto inicial mayor a cero."; return; }
  const posTickers = [...new Set((portfolio.positions || []).filter((p) => (p.quantity || 0) > 0).map((p) => p.ticker))];
  if (!posTickers.length) { status.style.display = ""; status.textContent = "Tu portafolio no tiene posiciones para comparar."; return; }

  const btn = document.querySelector("#whatifPeriodNav .perf-period-btn.active");
  const range = btn?.dataset.range || "1y";
  const interval = btn?.dataset.interval || "1d";
  status.style.display = ""; status.textContent = "Simulando…";

  const allTickers = [...new Set([...posTickers, altTicker])];
  const histories = await Promise.all(allTickers.map((t) => fetchHistoricalCloses(t, range, interval).then((h) => ({ t, h }))));
  const maps = {};
  histories.forEach(({ t, h }) => { maps[t] = {}; (h || []).forEach((d) => { maps[t][new Date(d.ts).toISOString().slice(0, 10)] = d.close; }); });
  if (!Object.keys(maps[altTicker] || {}).length) { status.textContent = `No se encontraron datos para ${altTicker}.`; return; }

  const weights = {}; let totalCost = 0;
  (portfolio.positions || []).filter((p) => (p.quantity || 0) > 0).forEach((p) => {
    const posCur = getPosCurrency(p, cur);
    const cost = convertAmount((p.avgPrice || 0) * p.quantity, posCur, cur) ?? (p.avgPrice || 0) * p.quantity;
    weights[p.ticker] = (weights[p.ticker] || 0) + cost; totalCost += cost;
  });
  Object.keys(weights).forEach((t) => { weights[t] = totalCost > 0 ? weights[t] / totalCost : 0; });

  const need = [...posTickers, altTicker].filter((t) => Object.keys(maps[t] || {}).length > 1);
  const sets = need.map((t) => new Set(Object.keys(maps[t])));
  const common = sets.length ? [...sets[0]].filter((d) => sets.every((s) => s.has(d))).sort() : [];
  if (common.length < 2) { status.textContent = "Datos históricos en común insuficientes para el periodo elegido."; return; }

  const portSeries = common.map((d) => {
    let idx = 0;
    posTickers.forEach((t) => { const c0 = maps[t][common[0]], c1 = maps[t][d]; if (c0 > 0) idx += (weights[t] || 0) * (c1 / c0); });
    return idx;
  });
  const altSeries = common.map((d) => maps[altTicker][d] / maps[altTicker][common[0]]);
  const portVals = portSeries.map((v) => v * amount);
  const altVals = altSeries.map((v) => v * amount);

  drawWhatIfChart(common, portVals, altVals, cur, altTicker);

  const portFinal = portVals[portVals.length - 1], altFinal = altVals[altVals.length - 1];
  const portRet = (portFinal / amount - 1) * 100, altRet = (altFinal / amount - 1) * 100;
  const diff = altFinal - portFinal;
  status.style.display = "none";
  const cls = (v) => (v >= 0 ? "return-pos" : "return-neg");
  statsGrid.innerHTML =
    `<div class="perf-metric-card dashboard-card"><div class="perf-metric-header"><span class="perf-metric-label">Tu portafolio</span></div><strong class="perf-metric-value">${formatCurrency(portFinal, cur)}</strong><span class="perf-metric-sub ${cls(portRet)}">${portRet >= 0 ? "+" : ""}${portRet.toFixed(2)}%</span></div>` +
    `<div class="perf-metric-card dashboard-card"><div class="perf-metric-header"><span class="perf-metric-label">${altTicker} (buy & hold)</span></div><strong class="perf-metric-value">${formatCurrency(altFinal, cur)}</strong><span class="perf-metric-sub ${cls(altRet)}">${altRet >= 0 ? "+" : ""}${altRet.toFixed(2)}%</span></div>` +
    `<div class="perf-metric-card dashboard-card"><div class="perf-metric-header"><span class="perf-metric-label">Diferencia</span></div><strong class="perf-metric-value ${cls(diff)}">${diff >= 0 ? "+" : ""}${formatCurrency(diff, cur)}</strong><span class="perf-metric-sub">${diff >= 0 ? altTicker + " habría rendido más" : "tu portafolio habría rendido más"}</span></div>`;
}

// ── Tab: Rebalanceo (solo simulación, no modifica el portafolio) ───────────────
let rebalTargets = {};
function getRebalRows() {
  const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
  if (!portfolio) return { rows: [], cur: "USD", totalValue: 0 };
  const cur = portfolio.currency || "USD";
  const rows = [];
  (portfolio.positions || []).filter((p) => (p.quantity || 0) > 0).forEach((pos) => {
    const posCur = getPosCurrency(pos, cur);
    const price = getCachedPrice(pos.ticker);
    const priceConv = price !== null ? (convertAmount(price, posCur, cur) ?? price) : null;
    const value = priceConv !== null ? priceConv * pos.quantity : null;
    rows.push({ ticker: pos.ticker, quantity: pos.quantity, priceConv, value: value ?? 0, hasPrice: priceConv !== null });
  });
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  return { rows, cur, totalValue };
}

function renderRebalanceTab() {
  const { rows, cur, totalValue } = getRebalRows();
  const tbody = document.querySelector("#rebalTable tbody");
  const table = document.getElementById("rebalTable");
  const emptyMsg = document.getElementById("rebalEmptyMsg");
  const note = document.getElementById("rebalNote");

  if (!rows.length || totalValue <= 0) {
    table.style.display = "none";
    emptyMsg.style.display = "";
    note.textContent = "";
    return;
  }
  table.style.display = "";
  emptyMsg.style.display = "none";

  // Inicializar objetivos con pesos actuales si no existen para estos tickers
  rows.forEach((r) => {
    if (rebalTargets[r.ticker] == null) rebalTargets[r.ticker] = (r.value / totalValue) * 100;
  });

  tbody.innerHTML = rows.map((r) => {
    const curW = (r.value / totalValue) * 100;
    return `<tr data-ticker="${r.ticker}">
      <td><strong>${r.ticker}</strong></td>
      <td>${formatCurrency(r.value, cur)}</td>
      <td>${curW.toFixed(1)}%</td>
      <td><input class="rebal-target-input" type="number" step="0.1" min="0" max="100" value="${rebalTargets[r.ticker].toFixed(1)}" data-ticker="${r.ticker}"></td>
      <td class="rebal-target-val">—</td>
      <td class="rebal-action">—</td>
    </tr>`;
  }).join("");

  note.textContent = "El rebalanceo redistribuye el valor actual del portafolio (más el aporte adicional) hacia los pesos objetivo. Las acciones son aproximadas según el último precio en caché.";
  recomputeRebalance();
}

function recomputeRebalance() {
  const { rows, cur, totalValue } = getRebalRows();
  if (!rows.length || totalValue <= 0) return;
  const extra = parseFloat(document.getElementById("rebalExtraCash").value) || 0;
  const targetTotal = totalValue + extra;
  const byTicker = Object.fromEntries(rows.map((r) => [r.ticker, r]));

  let weightSum = 0;
  document.querySelectorAll("#rebalTable tbody tr").forEach((tr) => {
    const tk = tr.dataset.ticker;
    const input = tr.querySelector(".rebal-target-input");
    const target = parseFloat(input.value) || 0;
    rebalTargets[tk] = target;
    weightSum += target;
    const r = byTicker[tk];
    const targetVal = targetTotal * (target / 100);
    const delta = targetVal - r.value;
    tr.querySelector(".rebal-target-val").textContent = formatCurrency(targetVal, cur);
    const actionCell = tr.querySelector(".rebal-action");
    if (!r.hasPrice) {
      actionCell.innerHTML = `<span class="muted-val">Sin precio</span>`;
    } else if (Math.abs(delta) < targetTotal * 0.005) {
      actionCell.innerHTML = `<span class="muted-val">Mantener</span>`;
    } else {
      const shares = Math.abs(delta) / r.priceConv;
      const verb = delta > 0 ? "Comprar" : "Vender";
      const cls = delta > 0 ? "return-pos" : "return-neg";
      actionCell.innerHTML = `<span class="${cls}">${verb} ${formatCurrency(Math.abs(delta), cur)} (~${shares.toFixed(3)} u.)</span>`;
    }
  });

  const sumEl = document.getElementById("rebalWeightSum");
  const off = Math.abs(weightSum - 100) > 0.1;
  sumEl.textContent = `Suma objetivo: ${weightSum.toFixed(1)}%`;
  sumEl.style.color = off ? "var(--danger, #ff6b81)" : "var(--success, #32d6a2)";
}

function drawDonutChart(canvas, positions, totalInvested, currency, cashBalance) {
  const dpr = window.devicePixelRatio || 1;
  const size = 200;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = cx - 8;
  const innerR = outerR * 0.58;

  ctx.clearRect(0, 0, size, size);

  const cash = cashBalance || 0;
  const grandTotal = totalInvested + cash;

  if ((!positions.length && cash <= 0) || grandTotal <= 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Sin datos", cx, cy);
    return;
  }

  const sliceCount = positions.length + (cash > 0 ? 1 : 0);
  const gap = sliceCount > 1 ? 0.025 : 0;
  let startAngle = -Math.PI / 2;

  positions.forEach((pos, i) => {
    const t = calcPositionTotals(pos);
    const posCur = getPosCurrency(pos, currency);
    const posTotal = convertAmount(t.total, posCur, currency) ?? t.total;
    const sweep = Math.max(0, (posTotal / grandTotal) * Math.PI * 2 - gap);
    if (sweep <= 0) return;
    const endAngle = startAngle + sweep;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, endAngle);
    ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fill();
    startAngle = endAngle + gap;
  });

  if (cash > 0) {
    const sweep = Math.max(0, (cash / grandTotal) * Math.PI * 2 - gap);
    if (sweep > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, startAngle + sweep);
      ctx.arc(cx, cy, innerR, startAngle + sweep, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = "#4ade80";
      ctx.fill();
    }
  }

  ctx.fillStyle = "#dce5ff";
  ctx.font = "bold 15px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const assetLabel = positions.length + (positions.length === 1 ? " activo" : " activos");
  ctx.fillText(assetLabel, cx, cy - 9);
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.font = "11px Inter, sans-serif";
  ctx.fillText(formatCurrency(grandTotal), cx, cy + 11);
}

function renderDonutLegend(positions, totalInvested, currency, cashBalance) {
  const legend = document.getElementById("donutLegend");
  const cash = cashBalance || 0;
  if (!positions.length && cash <= 0) { legend.innerHTML = ""; return; }
  const grandTotal = totalInvested + cash;
  let rows = positions.map((pos, i) => {
    const t = calcPositionTotals(pos);
    const posCur = getPosCurrency(pos, currency);
    const posTotal = convertAmount(t.total, posCur, currency) ?? t.total;
    const weight = grandTotal > 0 ? (posTotal / grandTotal * 100).toFixed(1) : "0.0";
    return `<div class="donut-legend-item">
      <span class="donut-legend-dot" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></span>
      <span class="donut-legend-ticker">${pos.ticker}</span>
      <span class="donut-legend-weight">${weight}%</span>
    </div>`;
  });
  if (cash > 0) {
    const cashWeight = grandTotal > 0 ? (cash / grandTotal * 100).toFixed(1) : "0.0";
    rows.push(`<div class="donut-legend-item">
      <span class="donut-legend-dot" style="background:#4ade80"></span>
      <span class="donut-legend-ticker">Cash</span>
      <span class="donut-legend-weight">${cashWeight}%</span>
    </div>`);
  }
  legend.innerHTML = rows.join("");
}

function getTickerSector(ticker) {
  if (SECTOR_MAP[ticker]) return SECTOR_MAP[ticker];
  if (ticker.endsWith(".MX")) return "México";
  if (ticker.endsWith(".L") || ticker.endsWith(".PA") || ticker.endsWith(".DE") || ticker.endsWith(".MI")) return "Europa";
  return "Otro";
}

function getTickerGeo(ticker) {
  if (GEO_MAP[ticker]) return GEO_MAP[ticker];
  if (ticker.endsWith(".MX")) return "México";
  if (ticker.endsWith(".L")) return "R. Unido";
  if (ticker.endsWith(".PA")) return "Francia";
  if (ticker.endsWith(".DE")) return "Alemania";
  if (ticker.endsWith(".MI")) return "Italia";
  if (ticker.endsWith(".HK")) return "Hong Kong";
  if (ticker.endsWith(".T")) return "Japón";
  if (ticker.endsWith(".TO")) return "Canadá";
  if (ticker.endsWith(".AX")) return "Australia";
  return "Otro";
}

const ALLOC_COLORS = [
  "#6f86ff","#39d0ff","#32d6a2","#f5b84c","#ff6b81",
  "#9f7aea","#f687b3","#48bb78","#ed8936","#4299e1","#667eea","#fc8181"
];

function buildAllocationData(positions, totalInvested, currency, labelFn, cashBalance) {
  const buckets = {};
  positions.forEach((pos) => {
    const t = calcPositionTotals(pos);
    const posCur = getPosCurrency(pos, currency);
    const val = convertAmount(t.total, posCur, currency) ?? t.total;
    const label = labelFn(pos.ticker);
    buckets[label] = (buckets[label] || 0) + val;
  });
  if (cashBalance > 0) {
    buckets["Cash"] = (buckets["Cash"] || 0) + cashBalance;
  }
  return Object.entries(buckets)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: label === "Cash" ? "#4ade80" : ALLOC_COLORS[i % ALLOC_COLORS.length] }));
}

function drawAllocationDonut(canvas, data, total, centerWord) {
  const dpr = window.devicePixelRatio || 1;
  const size = 160;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const cx = size / 2, cy = size / 2;
  const outerR = cx - 8, innerR = outerR * 0.58;
  ctx.clearRect(0, 0, size, size);
  if (!data.length || total <= 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "bold 12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Sin datos", cx, cy);
    return;
  }
  const gap = data.length > 1 ? 0.025 : 0;
  let startAngle = -Math.PI / 2;
  data.forEach(({ value, color }) => {
    const sweep = Math.max(0, (value / total) * Math.PI * 2 - gap);
    if (sweep <= 0) return;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, startAngle + sweep);
    ctx.arc(cx, cy, innerR, startAngle + sweep, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    startAngle += sweep + gap;
  });
  ctx.fillStyle = "#dce5ff";
  ctx.font = "bold 11px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(data.length + " " + (centerWord || "grupos"), cx, cy);
}

function renderAllocationLegend(el, data, total) {
  if (!el) return;
  if (!data.length) { el.innerHTML = ""; return; }
  el.innerHTML = data.map(({ label, value, color }) => {
    const pct = total > 0 ? (value / total * 100).toFixed(1) : "0.0";
    return `<div class="alloc-legend-item">
      <span class="alloc-legend-dot" style="background:${color}"></span>
      <span class="alloc-legend-label">${label}</span>
      <span class="alloc-legend-pct">${pct}%</span>
    </div>`;
  }).join("");
}

function renderAllocationCharts(positions, totalInvested, currency, cashBalance) {
  const sectorCanvas = document.getElementById("sectorDonutChart");
  const geoCanvas = document.getElementById("geoDonutChart");
  if (!sectorCanvas || !geoCanvas) return;
  const cash = cashBalance || 0;
  const grandTotal = totalInvested + cash;
  const sectorData = buildAllocationData(positions, totalInvested, currency, getTickerSector, cash);
  const geoData = buildAllocationData(positions, totalInvested, currency, getTickerGeo, cash);
  drawAllocationDonut(sectorCanvas, sectorData, grandTotal, "sectores");
  renderAllocationLegend(document.getElementById("sectorDonutLegend"), sectorData, grandTotal);
  drawAllocationDonut(geoCanvas, geoData, grandTotal, "regiones");
  renderAllocationLegend(document.getElementById("geoDonutLegend"), geoData, grandTotal);
}

function drawHoldingsBarChart(canvas, positions, currency) {
  const container = canvas.parentElement;
  const w = container.clientWidth || 560;
  const barH = 30;
  const barGap = 8;
  const padR = 56;
  const padTop = 12;
  const padBot = 12;

  const withValue = positions.map((pos, i) => {
    const price = getCachedPrice(pos.ticker) ?? pos.avgPrice;
    const posCur = getPosCurrency(pos, currency);
    const rawValue = price * pos.quantity;
    const value = convertAmount(rawValue, posCur, currency) ?? rawValue;
    return { ticker: pos.ticker, value, colorIndex: i };
  }).sort((a, b) => b.value - a.value).slice(0, 10);

  const totalVal = withValue.reduce((s, p) => s + p.value, 0);
  const n = withValue.length;

  if (!n || totalVal <= 0) {
    canvas.width = 0; canvas.height = 0;
    document.getElementById("holdingsBarSubtitle").textContent = "Agrega posiciones para ver este grafico";
    return;
  }

  document.getElementById("holdingsBarSubtitle").textContent = "Por valor actual (estimado)";
  const h = padTop + n * (barH + barGap) - barGap + padBot;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  // Ancho dinámico del label: el ticker más largo + holgura
  ctx.font = "bold 12px Inter, sans-serif";
  const maxTickerW = withValue.reduce((m, it) => Math.max(m, ctx.measureText(it.ticker).width), 0);
  const padL = Math.max(72, Math.ceil(maxTickerW) + 16);

  const barW = w - padL - padR;

  withValue.forEach((item, i) => {
    const y = padTop + i * (barH + barGap);
    const pct = item.value / totalVal;
    const fillW = Math.max(3, barW * pct);
    const color = CHART_COLORS[item.colorIndex % CHART_COLORS.length];

    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(padL, y, barW, barH);

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.82;
    ctx.fillRect(padL, y, fillW, barH);
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(220,229,255,0.88)";
    ctx.font = "bold 12px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(item.ticker, padL - 8, y + barH / 2);

    ctx.fillStyle = "rgba(220,229,255,0.62)";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText((pct * 100).toFixed(1) + "%", padL + barW + 6, y + barH / 2);
  });
}

function openModal(id) { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }

function initCustomSelects() {
  document.querySelectorAll(".custom-select:not([data-cs-init])").forEach((wrapper) => {
    wrapper.dataset.csInit = "1";
    const trigger = wrapper.querySelector(".custom-select-trigger");
    const list = wrapper.querySelector(".custom-select-list");
    const hidden = wrapper.querySelector("input[type=hidden]");

    trigger.addEventListener("click", () => {
      const isOpen = wrapper.classList.contains("is-open");
      document.querySelectorAll(".custom-select.is-open").forEach((el) => el.classList.remove("is-open"));
      if (!isOpen) wrapper.classList.add("is-open");
    });

    list.querySelectorAll("li").forEach((li) => {
      li.addEventListener("click", () => {
        list.querySelectorAll("li").forEach((el) => el.classList.remove("is-active"));
        li.classList.add("is-active");
        trigger.querySelector("span").textContent = li.textContent;
        hidden.value = li.dataset.value;
        wrapper.classList.remove("is-open");
      });
    });
  });

  if (!document._csDocListener) {
    document._csDocListener = true;
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".custom-select")) {
        document.querySelectorAll(".custom-select.is-open").forEach((el) => el.classList.remove("is-open"));
      }
    });
  }
}

function initializeTrackerModule() {
  if (trackerInitialized) return;

  // Sincronizar desde Firestore (no bloquea el render inicial desde localStorage)
  syncPortfoliosFromCloud().then(changed => { if (changed) renderPortfolioCards(); });

  initCustomSelects();

  document.getElementById("newPortfolioBtn").addEventListener("click", () => openModal("newPortfolioModal"));
  document.getElementById("importCsvBtn")?.addEventListener("click", () => document.getElementById("importCsvInput").click());
  document.getElementById("importCsvInput")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importPositionsCSV(file);
    e.target.value = "";
  });
  document.getElementById("closePortfolioModalBtn").addEventListener("click", () => closeModal("newPortfolioModal"));
  document.getElementById("newPortfolioModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal("newPortfolioModal");
  });

  document.getElementById("newPortfolioForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("portfolioNameInput").value.trim();
    const desc = document.getElementById("portfolioDescInput").value.trim();
    if (!name) return;
    const portfolios = getPortfolios();
    const maxP = window._planLimits?.maxPortfolios ?? Infinity;
    if (portfolios.length >= maxP) {
      showPlanToast(`Tu plan permite hasta ${maxP} portafolio${maxP !== 1 ? "s" : ""}. Actualiza a Advisor Pro para portafolios ilimitados.`);
      closeModal("newPortfolioModal");
      return;
    }
    const benchmark = document.getElementById("portfolioBenchmarkInput").value;
    const currency = document.getElementById("portfolioCurrencyInput").value;
    portfolios.push({ id: generateId(), name, description: desc, benchmark, currency, createdAt: new Date().toISOString(), positions: [] });
    savePortfolios(portfolios);
    closeModal("newPortfolioModal");
    e.target.reset();
    renderPortfolioCards();
  });

  // ── Confirmar eliminación de portafolio ───────────────────────────────────
  document.getElementById("deletePortfolioModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      pendingDeleteId = null;
      document.getElementById("deletePortfolioModal").classList.add("hidden");
    }
  });
  document.getElementById("deletePortfolioCancelBtn").addEventListener("click", () => {
    pendingDeleteId = null;
    document.getElementById("deletePortfolioModal").classList.add("hidden");
  });
  document.getElementById("deletePortfolioConfirmBtn").addEventListener("click", () => {
    if (!pendingDeleteId) return;
    const portfolios = getPortfolios().filter((p) => p.id !== pendingDeleteId);
    savePortfolios(portfolios);
    pendingDeleteId = null;
    document.getElementById("deletePortfolioModal").classList.add("hidden");
    renderPortfolioCards();
  });

  // ── Rename portafolio ─────────────────────────────────────────────────────
  document.getElementById("renamePortfolioBtn").addEventListener("click", () => {
    const portfolios = getPortfolios();
    const portfolio = portfolios.find((p) => p.id === activePortfolioId);
    if (!portfolio) return;
    const h2 = document.getElementById("dashPortfolioName");
    const current = portfolio.name;
    const input = document.createElement("input");
    input.type = "text";
    input.value = current;
    input.className = "portfolio-rename-input";
    h2.replaceWith(input);
    input.focus();
    input.select();
    const save = () => {
      const newName = input.value.trim();
      if (newName && newName !== current) {
        portfolio.name = newName;
        savePortfolios(portfolios);
      }
      const newH2 = document.createElement("h2");
      newH2.id = "dashPortfolioName";
      newH2.className = "tracker-dash-title";
      newH2.textContent = portfolio.name;
      input.replaceWith(newH2);
    };
    input.addEventListener("blur", save);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); input.blur(); }
      if (e.key === "Escape") { input.value = current; input.blur(); }
    });
  });

  document.getElementById("exportCsvBtn")?.addEventListener("click", exportTransactionsCSV);
  document.getElementById("exportPdfBtn")?.addEventListener("click", openReportRangeModal);
  _wireReportRangeModal();
  document.getElementById("exportPositionsBtn")?.addEventListener("click", exportPositionsCSV);

  // ── Watchlist ──────────────────────────────────────────────────────────────
  document.getElementById("watchlistForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("watchlistInput");
    addToWatchlist(input.value);
    input.value = "";
  });
  document.getElementById("watchlistTableBody")?.addEventListener("click", (e) => {
    const rm = e.target.closest("[data-wl-remove]");
    if (rm) { e.stopPropagation(); removeFromWatchlist(rm.dataset.wlRemove); return; }
    const row = e.target.closest("tr[data-wl]");
    if (row) watchlistOpenInMarkets(row.dataset.wl);
  });

  // ── What-If ────────────────────────────────────────────────────────────────
  document.getElementById("whatifRunBtn")?.addEventListener("click", runWhatIf);
  document.getElementById("whatifTicker")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); runWhatIf(); }
  });
  document.getElementById("whatifPeriodNav")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".perf-period-btn");
    if (!btn) return;
    document.querySelectorAll("#whatifPeriodNav .perf-period-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    if ((document.getElementById("whatifTicker").value || "").trim()) runWhatIf();
  });

  // ── Rebalanceo: controles ─────────────────────────────────────────────────
  document.getElementById("rebalEqualBtn")?.addEventListener("click", () => {
    const { rows } = getRebalRows();
    if (!rows.length) return;
    const eq = 100 / rows.length;
    rows.forEach((r) => { rebalTargets[r.ticker] = eq; });
    renderRebalanceTab();
  });
  document.getElementById("rebalCurrentBtn")?.addEventListener("click", () => {
    const { rows, totalValue } = getRebalRows();
    if (!rows.length || totalValue <= 0) return;
    rows.forEach((r) => { rebalTargets[r.ticker] = (r.value / totalValue) * 100; });
    renderRebalanceTab();
  });
  document.getElementById("rebalExtraCash")?.addEventListener("input", recomputeRebalance);
  document.querySelector("#rebalTable")?.addEventListener("input", (e) => {
    if (e.target.classList.contains("rebal-target-input")) recomputeRebalance();
  });
  document.getElementById("backToListBtn").addEventListener("click", showTrackerListView);
  document.getElementById("refreshPricesBtn").addEventListener("click", () => {
    perfTabLoaded = false;
    perfDailyReturns = null;
    perfReportData = null;
    _invalidatePriceCache(activePortfolioId);
    renderPortfolioDashboard();
    // If desempeño tab is active, reload it after prices refresh
    const activeTab = document.querySelector(".tracker-tab-btn.active");
    if (activeTab && activeTab.dataset.tab === "desempeno") {
      const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
      if (portfolio) loadPerformanceTab(portfolio);
    }
  });

  document.getElementById("addPositionBtn").addEventListener("click", () => openModal("addPositionModal"));
  document.getElementById("closePositionModalBtn").addEventListener("click", () => closeModal("addPositionModal"));
  document.getElementById("addPositionModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal("addPositionModal");
  });

  document.getElementById("posIvaCheck").addEventListener("change", (e) => {
    document.getElementById("posIvaRateRow").classList.toggle("hidden", !e.target.checked);
  });

  let posTickerDebounce;
  let posTickerAbortCtrl;
  const posTickerSugg = document.getElementById("posTickerSuggestions");

  document.getElementById("posTickerInput").addEventListener("input", (e) => {
    e.target.value = e.target.value.toUpperCase();
    const query = e.target.value.trim();
    if (posTickerDebounce) clearTimeout(posTickerDebounce);
    if (!query) { posTickerSugg.innerHTML = ""; posTickerSugg.classList.add("hidden"); return; }
    posTickerDebounce = setTimeout(async () => {
      try {
        if (posTickerAbortCtrl) posTickerAbortCtrl.abort();
        posTickerAbortCtrl = new AbortController();
        const res = await fetch(getYahooSearchUrl(query), { signal: posTickerAbortCtrl.signal });
        if (!res.ok) throw new Error();
        const payload = await res.json();
        const items = (payload.quotes ?? []).filter((q) => q.symbol && q.isYahooFinance).slice(0, 8);
        if (!items.length) { posTickerSugg.innerHTML = ""; posTickerSugg.classList.add("hidden"); return; }
        posTickerSugg.innerHTML = items.map((item) => `
          <button class="ticker-suggestion-item" type="button" data-symbol="${item.symbol}">
            <div>
              <div class="ticker-symbol">${item.symbol}</div>
              <div class="ticker-name">${item.longname || item.shortname || "Activo sin nombre"}</div>
            </div>
            <div class="ticker-exchange">${item.exchDisp || item.exchange || "Mercado"}</div>
          </button>
        `).join("");
        posTickerSugg.classList.remove("hidden");
        posTickerSugg.querySelectorAll("[data-symbol]").forEach((btn) => {
          btn.addEventListener("click", () => {
            document.getElementById("posTickerInput").value = btn.dataset.symbol;
            posTickerSugg.innerHTML = "";
            posTickerSugg.classList.add("hidden");
          });
        });
      } catch (err) {
        if (err.name !== "AbortError") { posTickerSugg.innerHTML = ""; posTickerSugg.classList.add("hidden"); }
      }
    }, 220);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".pos-ticker-shell")) {
      posTickerSugg.innerHTML = "";
      posTickerSugg.classList.add("hidden");
    }
  });

  document.getElementById("addPositionForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const ticker = document.getElementById("posTickerInput").value.trim().toUpperCase();
    const avgPrice = parseFloat(document.getElementById("posAvgPriceInput").value) || 0;
    const quantity = parseFloat(document.getElementById("posQuantityInput").value) || 0;
    const commissionPercent = parseFloat(document.getElementById("posCommissionInput").value) || 0;
    const applyIva = document.getElementById("posIvaCheck").checked;
    const ivaRate = applyIva ? parseFloat(document.getElementById("posIvaRateInput").value) || 0 : 0;

    if (!ticker || avgPrice <= 0 || quantity <= 0) return;

    const portfolios = getPortfolios();
    const portfolio = portfolios.find((p) => p.id === activePortfolioId);
    if (!portfolio) return;
    if (!portfolio.positions) portfolio.positions = [];

    const purchaseDate = document.getElementById("posPurchaseDateInput").value;
    const posCurrency = document.getElementById("posCurrencyInput").value || "USD";

    // Buscar posición existente del mismo ticker
    const existingPos = portfolio.positions.find((p) => p.ticker === ticker);

    if (existingPos) {
      // Ponderar precio promedio y comisión
      const oldInvested = existingPos.avgPrice * existingPos.quantity;
      const newInvested = avgPrice * quantity;
      const totalQuantity = existingPos.quantity + quantity;
      const newAvgPrice = (oldInvested + newInvested) / totalQuantity;

      // Comisión ponderada: suma de costos de comisión / total invertido
      const oldCommCost = oldInvested * (existingPos.commissionPercent || 0) / 100;
      const newCommCost = newInvested * commissionPercent / 100;
      const totalInvested = oldInvested + newInvested;
      const newCommissionPercent = totalInvested > 0 ? (oldCommCost + newCommCost) / totalInvested * 100 : commissionPercent;

      // Actualizar posición existente
      existingPos.avgPrice = newAvgPrice;
      existingPos.quantity = totalQuantity;
      existingPos.commissionPercent = newCommissionPercent;
      existingPos.applyIva = applyIva;
      existingPos.ivaRate = ivaRate;
      existingPos.purchaseDate = purchaseDate;
    } else {
      // Agregar nueva posición
      portfolio.positions.push({
        id: generateId(),
        ticker,
        avgPrice,
        quantity,
        commissionPercent,
        applyIva,
        ivaRate,
        purchaseDate,
        currency: posCurrency
      });
    }

    // Deduct purchase cost from cash balance (cash first, remainder is new injection)
    const { total: purchaseCostInPosCur } = calcPositionTotals({ avgPrice, quantity, commissionPercent, applyIva, ivaRate });
    const portfolioCur = portfolio.currency || "USD";
    const purchaseCostInPortfolioCur = posCurrency !== portfolioCur
      ? (convertAmount(purchaseCostInPosCur, posCurrency, portfolioCur) ?? purchaseCostInPosCur)
      : purchaseCostInPosCur;
    const currentCash = portfolio.cashBalance || 0;
    if (currentCash > 0) {
      portfolio.cashBalance = Math.max(0, currentCash - purchaseCostInPortfolioCur);
    }

    recordTransaction(portfolio, "COMPRA", ticker, quantity, avgPrice, commissionPercent, posCurrency);
    savePortfolios(portfolios);
    closeModal("addPositionModal");
    e.target.reset();
    document.getElementById("posIvaRateRow").classList.add("hidden");
    renderPortfolioDashboard();
  });

  // ── Tab switching ────────────────────────────────────────────────────────
  // ── Retirar posicion modal ───────────────────────────────────────────────
  document.getElementById("closeWithdrawModalBtn").addEventListener("click", () => closeModal("withdrawPositionModal"));
  document.getElementById("withdrawPositionModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal("withdrawPositionModal");
  });

  ["withdrawSellPriceInput", "withdrawQuantityInput", "withdrawCommissionInput", "withdrawIvaRateInput"].forEach((id) => {
    document.getElementById(id).addEventListener("input", () => {
      const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
      const posId = document.getElementById("withdrawPosId").value;
      const pos = portfolio ? (portfolio.positions || []).find((p) => p.id === posId) : null;
      updateWithdrawPreview(pos, portfolio ? portfolio.currency || "USD" : "USD");
    });
  });

  document.getElementById("withdrawIvaCheck").addEventListener("change", (e) => {
    document.getElementById("withdrawIvaRateRow").classList.toggle("hidden", !e.target.checked);
    const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
    const posId = document.getElementById("withdrawPosId").value;
    const pos = portfolio ? (portfolio.positions || []).find((p) => p.id === posId) : null;
    updateWithdrawPreview(pos, portfolio ? portfolio.currency || "USD" : "USD");
  });

  document.getElementById("withdrawPositionForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const posId = document.getElementById("withdrawPosId").value;
    const sellPrice = parseFloat(document.getElementById("withdrawSellPriceInput").value) || 0;
    const qty = parseFloat(document.getElementById("withdrawQuantityInput").value) || 0;
    const commPct = parseFloat(document.getElementById("withdrawCommissionInput").value) || 0;
    const applyIva = document.getElementById("withdrawIvaCheck").checked;
    const ivaRate = applyIva ? parseFloat(document.getElementById("withdrawIvaRateInput").value) || 0 : 0;

    if (sellPrice <= 0 || qty <= 0) return;

    const portfolios = getPortfolios();
    const portfolio = portfolios.find((p) => p.id === activePortfolioId);
    if (!portfolio) return;
    const pos = (portfolio.positions || []).find((p) => p.id === posId);
    if (!pos || qty > pos.quantity) return;

    const posCur = getPosCurrency(pos, portfolio.currency || "USD");
    const portfolioCur = portfolio.currency || "USD";
    const net = calcWithdrawNet(sellPrice, qty, commPct, applyIva, ivaRate);
    const netInPortfolioCur = posCur !== portfolioCur ? (convertAmount(net, posCur, portfolioCur) ?? net) : net;

    const t = calcPositionTotals(pos);
    const costPerUnit = pos.quantity > 0 ? t.total / pos.quantity : 0;
    const costBasisSoldInPosCur = costPerUnit * qty;
    const costBasisSoldInPortfolioCur = posCur !== portfolioCur
      ? (convertAmount(costBasisSoldInPosCur, posCur, portfolioCur) ?? costBasisSoldInPosCur)
      : costBasisSoldInPosCur;
    portfolio.realizedPnL = (portfolio.realizedPnL !== undefined
      ? portfolio.realizedPnL
      : reconstructRealizedPnL(portfolio)) + (netInPortfolioCur - costBasisSoldInPortfolioCur);

    if (qty >= pos.quantity) {
      portfolio.positions = (portfolio.positions || []).filter((p) => p.id !== posId);
    } else {
      pos.quantity = parseFloat((pos.quantity - qty).toFixed(10));
    }

    portfolio.cashBalance = (portfolio.cashBalance || 0) + netInPortfolioCur;
    recordTransaction(portfolio, "VENTA", pos.ticker, qty, sellPrice, commPct, posCur);
    savePortfolios(portfolios);
    closeModal("withdrawPositionModal");
    renderPortfolioDashboard();
  });

  document.querySelectorAll(".tracker-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tracker-tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      document.getElementById("tabPanelSummary").style.display = tab === "summary" ? "" : "none";
      document.getElementById("tabPanelDesempeno").style.display = tab === "desempeno" ? "" : "none";
      document.getElementById("tabPanelTransacciones").style.display = tab === "transacciones" ? "" : "none";
      document.getElementById("tabPanelProyeccion").style.display = tab === "proyeccion" ? "" : "none";
      document.getElementById("tabPanelDividendos").style.display = tab === "dividendos" ? "" : "none";
      document.getElementById("tabPanelRebalanceo").style.display = tab === "rebalanceo" ? "" : "none";
      document.getElementById("tabPanelCorrelacion").style.display = tab === "correlacion" ? "" : "none";
      document.getElementById("tabPanelWhatif").style.display = tab === "whatif" ? "" : "none";
      if (tab === "transacciones") renderTransactionsTab();
      if (tab === "dividendos") renderDividendsTab();
      if (tab === "rebalanceo") renderRebalanceTab();
      if (tab === "correlacion" && !corrTabLoaded) {
        const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
        if (portfolio) renderCorrelationTab(portfolio);
      }
      if (tab === "desempeno" && !perfTabLoaded) {
        const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
        if (portfolio) loadPerformanceTab(portfolio);
      }
      if (tab === "proyeccion" && !mcTabLoaded) {
        const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
        if (portfolio) loadMonteCarloTab(portfolio);
      }
    });
  });

  // ── Monte Carlo year buttons ─────────────────────────────────────────────
  document.getElementById("mcYearNav").addEventListener("click", (e) => {
    const btn = e.target.closest(".var-conf-btn");
    if (!btn || !btn.dataset.years) return;
    document.querySelectorAll("#mcYearNav .var-conf-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    mcYears = parseInt(btn.dataset.years, 10);
    mcTabLoaded = false;
    const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
    if (portfolio) loadMonteCarloTab(portfolio);
  });

  // ── Monte Carlo projection controls ──────────────────────────────────────
  const mcReload = () => {
    mcTabLoaded = false;
    const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
    if (portfolio) loadMonteCarloTab(portfolio);
  };
  ["mcHistRange", "mcModel", "mcContribution", "mcGoal"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", mcReload);
  });
  document.getElementById("mcInflEnabled")?.addEventListener("change", (e) => {
    const rate = document.getElementById("mcInflRate");
    if (rate) rate.disabled = !e.target.checked;
    mcReload();
  });
  document.getElementById("mcInflRate")?.addEventListener("change", () => {
    if (document.getElementById("mcInflEnabled")?.checked) mcReload();
  });

  // ── VaR confidence buttons ────────────────────────────────────────────────
  document.getElementById("varConfBtns").addEventListener("click", (e) => {
    const btn = e.target.closest(".var-conf-btn");
    if (!btn) return;
    document.querySelectorAll("#varConfBtns .var-conf-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    perfCurrentConf = parseFloat(btn.dataset.conf);
    updateVarDisplay();
  });

  // ── VaR horizon buttons (diario / anualizado) ────────────────────────────
  document.getElementById("varHorizonBtns").addEventListener("click", (e) => {
    const btn = e.target.closest(".var-conf-btn");
    if (!btn) return;
    document.querySelectorAll("#varHorizonBtns .var-conf-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    perfVarHorizon = btn.dataset.horizon;
    updateVarDisplay();
  });

  // ── Period buttons ────────────────────────────────────────────────────────
  document.getElementById("tabPanelDesempeno").addEventListener("click", (e) => {
    const btn = e.target.closest(".perf-period-btn");
    if (!btn) return;
    document.querySelectorAll(".perf-period-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    perfTabLoaded = false;
    const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
    if (portfolio) loadPerformanceTab(portfolio);
  });

  trackerInitialized = true;
}

// ── Performance tab helpers ───────────────────────────────────────────────────

async function fetchHistoricalCloses(symbol, range, interval) {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
    try {
      const res = await fetch(`${API_BASE_URL}/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`);
      if (!res.ok) continue;
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) continue;
      const timestamps = result.timestamp || [];
      const closes = result.indicators?.quote?.[0]?.close || [];
      const out = [];
      for (let i = 0; i < timestamps.length; i++) {
        const c = closes[i];
        if (c !== null && c !== undefined && isFinite(c)) {
          out.push({ ts: timestamps[i] * 1000, close: c });
        }
      }
      if (out.length > 0) return out.sort((a, b) => a.ts - b.ts);
    } catch {}
  }
  return [];
}

function updateVarDisplay() {
  const labelEl = document.getElementById("varConfLabel");
  const horizonText = perfVarHorizon === "annual" ? "Anual" : "Diario";
  labelEl.textContent = `Nivel de confianza: ${Math.round(perfCurrentConf * 100)}% · ${horizonText}`;
  const valEl = document.getElementById("varValue");
  if (!perfDailyReturns || !perfDailyReturns.length) { valEl.textContent = "—"; return; }
  const m = calcMetrics(perfDailyReturns, perfCurrentConf);
  if (m.var === null) { valEl.textContent = "—"; return; }
  // Anualización por raíz del tiempo (sqrt(252) días bursátiles)
  const v = perfVarHorizon === "annual" ? m.var * Math.sqrt(252) : m.var;
  valEl.textContent = v.toFixed(2) + "%";
}

function calcMetrics(dailyReturns, confidenceLevel) {
  if (!dailyReturns || dailyReturns.length < 2) {
    return { sharpe: null, volatility: null, var: null };
  }
  const n = dailyReturns.length;
  const mean = dailyReturns.reduce((s, r) => s + r, 0) / n;
  const variance = dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1);
  const std = Math.sqrt(variance);
  const daily_rfr = (perfRfr.rate / 100) / 252;
  const sharpe = std > 0 ? (mean - daily_rfr) / std * Math.sqrt(252) : 0;
  const volatility = std * Math.sqrt(252) * 100;
  const sorted = [...dailyReturns].sort((a, b) => a - b);
  const varIdx = Math.floor((1 - confidenceLevel) * sorted.length);
  const varVal = -(sorted[Math.max(0, varIdx)] * 100);
  return { sharpe, volatility, var: varVal };
}

function calcBeta(portfolioReturns, benchmarkReturns) {
  const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
  if (n < 2) return null;
  const pR = portfolioReturns.slice(-n);
  const bR = benchmarkReturns.slice(-n);
  const meanP = pR.reduce((s, r) => s + r, 0) / n;
  const meanB = bR.reduce((s, r) => s + r, 0) / n;
  const cov = pR.reduce((s, r, i) => s + (r - meanP) * (bR[i] - meanB), 0) / (n - 1);
  const varB = bR.reduce((s, r) => s + (r - meanB) ** 2, 0) / (n - 1);
  return varB > 0 ? cov / varB : null;
}

function calcMaxDrawdown(dailyReturns) {
  if (!dailyReturns || dailyReturns.length < 2) return null;
  let cumReturn = 1;
  let peak = 1;
  let maxDD = 0;
  dailyReturns.forEach((r) => {
    cumReturn *= (1 + r);
    if (cumReturn > peak) peak = cumReturn;
    const dd = (peak - cumReturn) / peak;
    if (dd > maxDD) maxDD = dd;
  });
  return maxDD * 100;
}

function getPerfChartColors() {
  const isLight = document.body.classList.contains("light-mode");
  return {
    grid:       isLight ? "rgba(0,0,0,0.07)"   : "rgba(255,255,255,0.07)",
    baseline:   isLight ? "rgba(0,0,0,0.2)"    : "rgba(255,255,255,0.25)",
    axisLabel:  isLight ? "rgba(0,0,0,0.4)"    : "rgba(255,255,255,0.38)",
    portfolio:  "#6f86ff",
    benchmark:  isLight ? "rgba(0,0,0,0.35)"   : "rgba(255,255,255,0.42)",
    fillFrom:   isLight ? "rgba(111,134,255,0.15)" : "rgba(111,134,255,0.18)",
    fillTo:     "rgba(111,134,255,0)",
    crosshair:  isLight ? "rgba(0,0,0,0.18)"   : "rgba(255,255,255,0.2)",
    dotBorder:  isLight ? "#fff"               : "#0d0d14",
  };
}

function drawPerfChart(canvasEl, portfolioCumulative, benchmarkCumulative, _labels, portfolioLabel, benchmarkLabel) {
  const wrap = canvasEl.parentElement;
  const W = wrap.clientWidth || 700;
  const H = 288;
  const padL = 56, padR = 20, padTop = 40, padBot = 38;
  const chartW = W - padL - padR;
  const chartH = H - padTop - padBot;
  const total = portfolioCumulative.length;
  if (!total) return;

  const allVals = [
    ...portfolioCumulative.map(d => d.value),
    ...benchmarkCumulative.map(d => d.value)
  ];
  const rawMin = Math.min(0, ...allVals);
  const rawMax = Math.max(0, ...allVals);
  const yPad = (rawMax - rawMin) * 0.12 || 1;
  const yMin = rawMin - yPad;
  const yMax = rawMax + yPad;
  const yRange = yMax - yMin;

  const toX = i => (i / Math.max(total - 1, 1)) * chartW;
  const toY = v => chartH * (1 - (v - yMin) / yRange);

  const NS = "http://www.w3.org/2000/svg";
  const mkEl = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (k === "style") e.style.cssText = String(v);
      else e.setAttribute(k, String(v));
    }
    return e;
  };
  const uid = `pc${(Date.now() % 1e7).toString(36)}`;

  const isLight = document.body.classList.contains("light-mode");
  const portColor = "#6f86ff";
  const bmColor   = isLight ? "rgba(0,0,0,0.45)"  : "rgba(255,255,255,0.45)";
  const gridClr   = isLight ? "rgba(0,0,0,0.07)"  : "rgba(255,255,255,0.07)";
  const blClr     = isLight ? "rgba(0,0,0,0.18)"  : "rgba(255,255,255,0.22)";
  const axClr     = isLight ? "rgba(0,0,0,0.4)"   : "rgba(255,255,255,0.38)";
  const xhClr     = isLight ? "rgba(0,0,0,0.2)"   : "rgba(255,255,255,0.25)";
  const dotBg     = isLight ? "#ffffff"            : "#0d0d14";

  // Path data
  const portPathD = portfolioCumulative.map((d, i) =>
    `${i ? "L" : "M"}${toX(i).toFixed(1)},${toY(d.value).toFixed(1)}`
  ).join(" ");
  const portAreaD = `${portPathD} L${toX(total - 1).toFixed(1)},${toY(0).toFixed(1)} L${toX(0).toFixed(1)},${toY(0).toFixed(1)} Z`;
  const bmPathD = benchmarkCumulative.length
    ? benchmarkCumulative.map((d, i) =>
        `${i ? "L" : "M"}${toX(i).toFixed(1)},${toY(d.value).toFixed(1)}`
      ).join(" ")
    : null;

  // ── SVG root ──────────────────────────────────────────────────────────────
  const svg = mkEl("svg", {
    id: "perfLineChart", width: W, height: H,
    viewBox: `0 0 ${W} ${H}`,
    style: "display:block;width:100%;user-select:none;overflow:visible;"
  });

  // ── Defs ──────────────────────────────────────────────────────────────────
  const defs = mkEl("defs");

  // Portfolio area fill gradient (top-opaque → bottom-transparent)
  const fillGrad = mkEl("linearGradient", { id: `${uid}f`, x1:"0", y1:"0", x2:"0", y2:"1" });
  [[0, 0.22], [1, 0]].forEach(([off, op]) => {
    fillGrad.appendChild(mkEl("stop", { offset: `${off * 100}%`, "stop-color": portColor, "stop-opacity": op }));
  });
  defs.appendChild(fillGrad);

  // Portfolio line stroke gradient (fade left/right edges)
  const strokeGrad = mkEl("linearGradient", { id: `${uid}s`, x1:"0", y1:"0", x2:"1", y2:"0" });
  [["0%",0],["8%",1],["92%",1],["100%",0]].forEach(([off, op]) => {
    strokeGrad.appendChild(mkEl("stop", { offset: off, "stop-color": portColor, "stop-opacity": op }));
  });
  defs.appendChild(strokeGrad);

  // Benchmark line gradient
  const bmGrad = mkEl("linearGradient", { id: `${uid}b`, x1:"0", y1:"0", x2:"1", y2:"0" });
  [["0%",0],["8%",1],["92%",1],["100%",0]].forEach(([off, op]) => {
    bmGrad.appendChild(mkEl("stop", { offset: off, "stop-color": bmColor, "stop-opacity": op }));
  });
  defs.appendChild(bmGrad);

  // Grid fade mask
  const gGrad = mkEl("linearGradient", { id: `${uid}g`, x1:"0", y1:"0", x2:"1", y2:"0" });
  [["0%",0],["8%",1],["92%",1],["100%",0]].forEach(([off, op]) => {
    gGrad.appendChild(mkEl("stop", { offset: off, "stop-color": "white", "stop-opacity": op }));
  });
  defs.appendChild(gGrad);
  const gMask = mkEl("mask", { id: `${uid}m` });
  gMask.appendChild(mkEl("rect", { x: 0, y: 0, width: chartW, height: chartH, fill: `url(#${uid}g)` }));
  defs.appendChild(gMask);

  // Crosshair gradient (fade top/bottom)
  const xhGrad = mkEl("linearGradient", { id: `${uid}x`, x1:"0", y1:"0", x2:"0", y2:"1" });
  [["0%",0],["12%",1],["88%",1],["100%",0]].forEach(([off, op]) => {
    xhGrad.appendChild(mkEl("stop", { offset: off, "stop-color": xhClr, "stop-opacity": op }));
  });
  defs.appendChild(xhGrad);

  // Clip path for chart area
  const clipPath = mkEl("clipPath", { id: `${uid}c` });
  clipPath.appendChild(mkEl("rect", { x: 0, y: -4, width: chartW, height: chartH + 8 }));
  defs.appendChild(clipPath);

  svg.appendChild(defs);

  // ── Chart group (translated to chart origin) ──────────────────────────────
  const g = mkEl("g", { transform: `translate(${padL},${padTop})` });

  // Grid lines (masked for edge fade)
  const gridG = mkEl("g", { mask: `url(#${uid}m)` });
  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const v = yMin + (yRange / gridSteps) * i;
    const y = toY(v).toFixed(1);
    gridG.appendChild(mkEl("line", {
      x1: 0, y1: y, x2: chartW, y2: y,
      stroke: gridClr, "stroke-width": "1", "stroke-dasharray": "4,4"
    }));
  }
  g.appendChild(gridG);

  // Y=0 baseline dashed
  g.appendChild(mkEl("line", {
    x1: 0, y1: toY(0).toFixed(1), x2: chartW, y2: toY(0).toFixed(1),
    stroke: blClr, "stroke-width": "1", "stroke-dasharray": "4,4"
  }));

  // Benchmark line
  if (bmPathD) {
    g.appendChild(mkEl("path", {
      d: bmPathD, fill: "none",
      stroke: `url(#${uid}b)`, "stroke-width": "1.5",
      "stroke-linejoin": "round", "stroke-linecap": "round",
      "clip-path": `url(#${uid}c)`
    }));
  }

  // Portfolio area fill
  g.appendChild(mkEl("path", { d: portAreaD, fill: `url(#${uid}f)`, "clip-path": `url(#${uid}c)` }));

  // Portfolio line
  g.appendChild(mkEl("path", {
    d: portPathD, fill: "none",
    stroke: `url(#${uid}s)`, "stroke-width": "2",
    "stroke-linejoin": "round", "stroke-linecap": "round",
    "clip-path": `url(#${uid}c)`
  }));

  svg.appendChild(g);

  // ── Y-axis labels (in full SVG coords, outside chart group) ───────────────
  for (let i = 0; i <= gridSteps; i++) {
    const v = yMin + (yRange / gridSteps) * i;
    const t = mkEl("text", {
      x: padL - 8, y: (toY(v) + padTop).toFixed(1),
      "text-anchor": "end", "dominant-baseline": "middle",
      fill: axClr, "font-size": "10", "font-family": "Inter, sans-serif"
    });
    t.textContent = (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
    svg.appendChild(t);
  }

  // ── X-axis labels ──────────────────────────────────────────────────────────
  const xStep = Math.max(1, Math.floor(total / 7));
  for (let i = 0; i < total; i += xStep) {
    const t = mkEl("text", {
      x: (toX(i) + padL).toFixed(1), y: padTop + chartH + 16,
      "text-anchor": "middle",
      fill: axClr, "font-size": "10", "font-family": "Inter, sans-serif"
    });
    t.textContent = portfolioCumulative[i].date;
    svg.appendChild(t);
  }

  // ── Legend (top-right) ────────────────────────────────────────────────────
  const legendItems = [[portfolioLabel, portColor]];
  if (benchmarkCumulative.length) legendItems.push([benchmarkLabel, bmColor]);
  let lx = padL + chartW;
  const ly = padTop - 18;
  for (let i = legendItems.length - 1; i >= 0; i--) {
    const [lbl, col] = legendItems[i];
    const tw = lbl.length * 6.4;
    lx -= tw;
    const lt = mkEl("text", {
      x: lx.toFixed(1), y: ly,
      "dominant-baseline": "middle",
      fill: axClr, "font-size": "11", "font-family": "Inter, sans-serif"
    });
    lt.textContent = lbl;
    svg.appendChild(lt);
    lx -= 11;
    svg.appendChild(mkEl("circle", { cx: lx.toFixed(1), cy: ly, r: "4", fill: col }));
    lx -= 16;
  }

  // ── Crosshair + dots (CSS-transitioned via transform on <g>) ──────────────
  const SPRING = "transition:transform 0.12s cubic-bezier(0.4,0,0.2,1),opacity 0.1s;pointer-events:none;will-change:transform;";

  const xhairG = mkEl("g", { style: `opacity:0;${SPRING}` });
  xhairG.appendChild(mkEl("rect", {
    x: "-0.5", y: 0, width: "1", height: chartH,
    fill: `url(#${uid}x)`
  }));
  svg.appendChild(xhairG);

  const makeDot = color => {
    const dg = mkEl("g", { style: `opacity:0;${SPRING}` });
    dg.appendChild(mkEl("circle", { cx: 0, cy: 0, r: "5.5", fill: dotBg }));
    dg.appendChild(mkEl("circle", { cx: 0, cy: 0, r: "3.5", fill: color }));
    svg.appendChild(dg);
    return dg;
  };
  const dotPort = makeDot(portColor);
  const dotBm = benchmarkCumulative.length ? makeDot(bmColor) : null;

  // Invisible interaction rect on top of everything
  const iRect = mkEl("rect", {
    x: padL, y: padTop, width: chartW, height: chartH,
    fill: "transparent", style: "cursor:crosshair;"
  });
  svg.appendChild(iRect);

  // ── Replace existing element ───────────────────────────────────────────────
  wrap.replaceChild(svg, canvasEl);

  const tooltip  = document.getElementById("perfChartTooltip");
  const datePill = document.getElementById("perfDatePill");

  // ── Hover handler ──────────────────────────────────────────────────────────
  function onHover(idx) {
    if (idx === null) {
      xhairG.style.opacity = "0";
      dotPort.style.opacity = "0";
      if (dotBm) dotBm.style.opacity = "0";
      tooltip.classList.add("hidden");
      if (datePill) datePill.classList.add("hidden");
      return;
    }

    const hx = toX(idx);
    const pY = toY(portfolioCumulative[idx].value);
    const absX = padL + hx;
    const absY = padTop + pY;

    xhairG.style.transform  = `translate(${absX.toFixed(1)}px,${padTop}px)`;
    xhairG.style.opacity     = "1";
    dotPort.style.transform  = `translate(${absX.toFixed(1)}px,${absY.toFixed(1)}px)`;
    dotPort.style.opacity    = "1";

    if (dotBm && benchmarkCumulative[idx]) {
      const bY = toY(benchmarkCumulative[idx].value);
      dotBm.style.transform = `translate(${absX.toFixed(1)}px,${(padTop + bY).toFixed(1)}px)`;
      dotBm.style.opacity   = "1";
    }

    // Tooltip content
    const pd  = portfolioCumulative[idx];
    const bd  = benchmarkCumulative[idx];
    const fmt = v => (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
    let html = `<div class="perf-tooltip-date">${pd.date}</div>
      <div class="perf-tooltip-row">
        <span class="perf-tooltip-dot" style="background:${portColor}"></span>
        <span class="perf-tooltip-label">${portfolioLabel}</span>
        <span class="perf-tooltip-value ${pd.value >= 0 ? "perf-pos" : "perf-neg"}">${fmt(pd.value)}</span>
      </div>`;
    if (bd) html += `<div class="perf-tooltip-row">
        <span class="perf-tooltip-dot" style="background:${bmColor}"></span>
        <span class="perf-tooltip-label">${benchmarkLabel}</span>
        <span class="perf-tooltip-value ${bd.value >= 0 ? "perf-pos" : "perf-neg"}">${fmt(bd.value)}</span>
      </div>`;
    tooltip.innerHTML = html;
    tooltip.classList.remove("hidden");

    // Flip tooltip left/right
    const TW = tooltip.offsetWidth || 160;
    const mg = 14;
    const tx = (absX + mg + TW > W - padR) ? absX - TW - mg : absX + mg;
    tooltip.style.left = tx + "px";
    tooltip.style.top  = padTop + "px";

    // Date pill
    if (datePill) {
      datePill.textContent = pd.date;
      datePill.classList.remove("hidden");
      const pw = datePill.offsetWidth || 80;
      const px = Math.max(padL, Math.min(W - padR - pw, absX - pw / 2));
      datePill.style.left   = px + "px";
      datePill.style.bottom = "4px";
    }
  }

  svg.addEventListener("mousemove", e => {
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left - padL;
    if (mx < 0 || mx > chartW) { onHover(null); return; }
    onHover(Math.max(0, Math.min(total - 1, Math.round(mx / chartW * (total - 1)))));
  });
  svg.addEventListener("mouseleave", () => onHover(null));
  svg.addEventListener("touchmove", e => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = svg.getBoundingClientRect();
    const mx = touch.clientX - rect.left - padL;
    if (mx < 0 || mx > chartW) { onHover(null); return; }
    onHover(Math.max(0, Math.min(total - 1, Math.round(mx / chartW * (total - 1)))));
  }, { passive: false });
  svg.addEventListener("touchend", () => onHover(null));
}

function buildAllPositionHistory(portfolio) {
  const portfolioCur = portfolio.currency || "USD";
  const result = [];

  // Open positions
  for (const pos of (portfolio.positions || [])) {
    result.push({
      ticker: pos.ticker,
      avgPrice: pos.avgPrice || 0,
      quantity: pos.quantity || 0,
      currency: getPosCurrency(pos, portfolioCur),
      purchaseDate: pos.purchaseDate || null,
      sellDate: null
    });
  }

  // Reconstruct closed positions from VENTA transactions
  if (!portfolio.transactions?.length) return result;
  const txsSorted = [...portfolio.transactions]
    .filter(tx => tx.type === "COMPRA" || tx.type === "VENTA")
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const runningLots = {}; // ticker -> [{qty, price, date, currency}]
  for (const tx of txsSorted) {
    const ticker = tx.ticker;
    const txCur = tx.currency || portfolioCur;
    if (!runningLots[ticker]) runningLots[ticker] = [];
    if (tx.type === "COMPRA") {
      runningLots[ticker].push({ qty: tx.quantity || 0, price: tx.price || 0, date: (tx.date || "").slice(0, 10), currency: txCur });
    } else if (tx.type === "VENTA") {
      const lots = runningLots[ticker];
      if (!lots.length) continue;
      const totalQty = lots.reduce((s, l) => s + l.qty, 0);
      const totalCost = lots.reduce((s, l) => s + l.qty * l.price, 0);
      const avgPrice = totalQty > 0 ? totalCost / totalQty : (tx.price || 0);
      const earliestDate = lots.reduce((min, l) => l.date < min ? l.date : min, lots[0].date);
      result.push({
        ticker,
        avgPrice,
        quantity: tx.quantity || 0,
        currency: lots[0].currency || txCur,
        purchaseDate: earliestDate || null,
        sellDate: (tx.date || "").slice(0, 10)
      });
      // Reduce lots (FIFO)
      let rem = tx.quantity || 0;
      runningLots[ticker] = lots.reduce((acc, lot) => {
        if (rem <= 0) { acc.push(lot); return acc; }
        const used = Math.min(lot.qty, rem);
        rem -= used;
        if (lot.qty - used > 0.0001) acc.push({ ...lot, qty: lot.qty - used });
        return acc;
      }, []);
    }
  }
  return result;
}

async function loadPerformanceTab(portfolio) {
  perfTabLoaded = true;
  const statusEl = document.getElementById("perfChartStatus");
  const canvas = document.getElementById("perfLineChart");

  const activePeriodBtn = document.querySelector(".perf-period-btn.active");
  const range = activePeriodBtn?.dataset.range || "1y";
  const interval = activePeriodBtn?.dataset.interval || "1d";

  // Refrescar TIIE 28 (Banxico) la primera vez en la sesión
  if (!perfRfrFetched) await fetchRiskFreeRate();
  updateSharpeRfrLabel();

  statusEl.textContent = "Calculando rendimiento histórico...";
  document.getElementById("sharpeValue").textContent = "—";
  document.getElementById("volatilityValue").textContent = "—";
  document.getElementById("varValue").textContent = "—";
  document.getElementById("betaValue").textContent = "—";
  document.getElementById("maxDrawdownValue").textContent = "—";

  const positions = portfolio.positions || [];
  const allPositions = buildAllPositionHistory(portfolio);
  if (!allPositions.length) {
    statusEl.textContent = "Agrega posiciones para ver el rendimiento.";
    return;
  }

  const portfolioCur = portfolio.currency || "USD";
  const uniqueTickers = [...new Set(allPositions.map((p) => p.ticker))];

  // Fetch all historical data in parallel + Yahoo beta per active ticker
  const activeTickersForBeta = [...new Set(allPositions.filter((p) => !p.sellDate).map((p) => p.ticker))];
  const [tickerHistories, benchmarkHistory, yahooBetaResults] = await Promise.all([
    Promise.all(uniqueTickers.map((t) => fetchHistoricalCloses(t, range, interval).then((h) => ({ t, h })))),
    portfolio.benchmark && portfolio.benchmark !== "none"
      ? fetchHistoricalCloses(portfolio.benchmark, range, interval)
      : Promise.resolve([]),
    Promise.all(activeTickersForBeta.map((t) =>
      fetch(`${API_BASE_URL}/info/${encodeURIComponent(t)}`)
        .then((r) => r.ok ? r.json() : null)
        .then((d) => ({ t, beta: d?.beta ?? null }))
        .catch(() => ({ t, beta: null }))
    ))
  ]);
  const yahooBetas = {};
  yahooBetaResults.forEach(({ t, beta }) => { yahooBetas[t] = beta; });

  // Fallback: tickers sin beta de Yahoo → regresión vs ^GSPC (mensual → semanal → diario)
  const missingBetaTickers = activeTickersForBeta.filter((t) => yahooBetas[t] == null);
  if (missingBetaTickers.length > 0) {
    const fallbackConfigs = [
      { range: "5y", interval: "1mo", sliceKey: 7, minPairs: 3 },
      { range: "2y", interval: "1wk", sliceKey: 10, minPairs: 10 },
      { range: "1y", interval: "1d",  sliceKey: 10, minPairs: 20 },
    ];
    for (const cfg of fallbackConfigs) {
      const stillMissing = missingBetaTickers.filter((t) => yahooBetas[t] == null);
      if (!stillMissing.length) break;
      const [bmData, ...tickerDatas] = await Promise.all([
        fetchHistoricalCloses("^GSPC", cfg.range, cfg.interval),
        ...stillMissing.map((t) => fetchHistoricalCloses(t, cfg.range, cfg.interval))
      ]);
      const bmDateMap = {};
      bmData.forEach((d) => { bmDateMap[new Date(d.ts).toISOString().slice(0, cfg.sliceKey)] = d.close; });
      const bmKeys = Object.keys(bmDateMap).sort();
      const bmReturns = bmKeys.slice(1).map((k, i) => {
        const c0 = bmDateMap[bmKeys[i]], c1 = bmDateMap[k];
        return c0 > 0 ? (c1 - c0) / c0 : 0;
      });
      stillMissing.forEach((ticker, idx) => {
        const tDateMap = {};
        (tickerDatas[idx] || []).forEach((d) => { tDateMap[new Date(d.ts).toISOString().slice(0, cfg.sliceKey)] = d.close; });
        const pairs = bmKeys.slice(1).reduce((acc, k, i) => {
          const c0 = tDateMap[bmKeys[i]], c1 = tDateMap[k];
          if (c0 && c1 && c0 > 0) acc.push([(c1 - c0) / c0, bmReturns[i]]);
          return acc;
        }, []);
        if (pairs.length >= cfg.minPairs) {
          yahooBetas[ticker] = calcBeta(pairs.map((p) => p[0]), pairs.map((p) => p[1]));
        }
      });
    }
  }

  const histMap = {};
  tickerHistories.forEach(({ t, h }) => { histMap[t] = h; });

  // Build date→close maps per ticker
  const tickerDateMaps = {};
  uniqueTickers.forEach((t) => {
    tickerDateMaps[t] = {};
    (histMap[t] || []).forEach((d) => {
      const dateStr = new Date(d.ts).toISOString().slice(0, 10);
      tickerDateMaps[t][dateStr] = d.close;
    });
  });

  // Intersection of dates across all tickers with data
  const tickersWithData = uniqueTickers.filter((t) => (histMap[t] || []).length > 1);
  if (!tickersWithData.length) {
    statusEl.textContent = "No se pudieron obtener datos históricos.";
    const retryBtn = document.createElement("button");
    retryBtn.className = "button ghost";
    retryBtn.style.cssText = "margin-left:8px;padding:0.2rem 0.7rem;font-size:0.8rem;vertical-align:middle";
    retryBtn.textContent = "↻ Reintentar";
    retryBtn.addEventListener("click", () => {
      perfTabLoaded = false;
      const p = getPortfolios().find(q => q.id === activePortfolioId);
      if (p) loadPerformanceTab(p);
    });
    statusEl.appendChild(retryBtn);
    perfTabLoaded = false;
    return;
  }

  const dateSets = tickersWithData.map((t) => new Set(Object.keys(tickerDateMaps[t])));
  let commonDates = [...dateSets[0]].filter((d) => dateSets.every((s) => s.has(d))).sort();
  if (commonDates.length < 2) {
    statusEl.textContent = "Fechas insuficientes para calcular rendimiento.";
    return;
  }

  // Compute cost basis per position (in portfolio currency) for date-aware weighting
  let totalAllCost = 0;
  allPositions.forEach((pos) => {
    const posCur = pos.currency || portfolioCur;
    const cost = convertAmount(pos.avgPrice * pos.quantity, posCur, portfolioCur) ?? (pos.avgPrice * pos.quantity);
    pos._cost = cost;
    totalAllCost += cost;
  });
  allPositions.forEach((pos) => {
    pos._weight = totalAllCost > 0 ? pos._cost / totalAllCost : 0;
  });

  // Calculate daily portfolio returns with date-aware weights
  // Sold positions contribute 0% (cash) after their sell date
  const dailyPortfolioReturns = [];
  for (let i = 1; i < commonDates.length; i++) {
    const d0 = commonDates[i - 1];
    const d1 = commonDates[i];
    let portReturn = 0;
    allPositions.forEach((pos) => {
      const isActive = !pos.sellDate || d1 <= pos.sellDate;
      if (!isActive) return;
      const c0 = tickerDateMaps[pos.ticker]?.[d0];
      const c1 = tickerDateMaps[pos.ticker]?.[d1];
      if (c0 && c1 && c0 > 0) {
        portReturn += pos._weight * (c1 - c0) / c0;
      }
    });
    dailyPortfolioReturns.push(portReturn);
  }

  perfDailyReturns = dailyPortfolioReturns;

  // Cumulative returns
  const portfolioCumulative = [];
  let cumPort = 0;
  const returnDates = commonDates.slice(1);
  returnDates.forEach((d, i) => {
    cumPort = (1 + cumPort / 100) * (1 + dailyPortfolioReturns[i]) * 100 - 100;
    const label = d.slice(5); // MM-DD
    portfolioCumulative.push({ date: label, value: cumPort });
  });

  // Benchmark cumulative + daily returns for Beta
  let benchmarkCumulative = [];
  const dailyBenchmarkReturns = [];
  if (benchmarkHistory.length > 1) {
    const bmDateMap = {};
    benchmarkHistory.forEach((d) => {
      const dateStr = new Date(d.ts).toISOString().slice(0, 10);
      bmDateMap[dateStr] = d.close;
    });
    let cumBm = 0;
    returnDates.forEach((d, i) => {
      const d0 = commonDates[i];
      const c0 = bmDateMap[d0];
      const c1 = bmDateMap[d];
      if (c0 && c1 && c0 > 0) {
        const bmR = (c1 - c0) / c0;
        cumBm = (1 + cumBm / 100) * (1 + bmR) * 100 - 100;
        dailyBenchmarkReturns.push(bmR);
      } else {
        dailyBenchmarkReturns.push(0);
      }
      benchmarkCumulative.push({ date: d.slice(5), value: cumBm });
    });
  }

  // Metrics
  const metrics = calcMetrics(dailyPortfolioReturns, perfCurrentConf);
  document.getElementById("sharpeValue").textContent = metrics.sharpe !== null ? metrics.sharpe.toFixed(2) : "—";
  document.getElementById("volatilityValue").textContent = metrics.volatility !== null ? metrics.volatility.toFixed(1) + "%" : "—";
  updateVarDisplay();

  const beta = dailyBenchmarkReturns.length >= 2 ? calcBeta(dailyPortfolioReturns, dailyBenchmarkReturns) : null;
  const benchmarkLabel = BENCHMARKS[portfolio.benchmark] || "Benchmark";
  document.getElementById("betaBenchmarkLabel").textContent = `vs ${benchmarkLabel}`;

  const maxDD = calcMaxDrawdown(dailyPortfolioReturns);
  document.getElementById("maxDrawdownValue").textContent = maxDD !== null ? "-" + maxDD.toFixed(2) + "%" : "—";

  // Compute per-asset beta vs benchmark for info popup
  const assetBetas = [];
  if (dailyBenchmarkReturns.length >= 2) {
    // Only include currently held positions (no sellDate) and re-normalize weights
    const activePositions = allPositions.filter((pos) => !pos.sellDate);
    const activeTotalCost = activePositions.reduce((s, pos) => s + (pos._cost || 0), 0);
    const tickerWeights = {};
    activePositions.forEach((pos) => {
      if (!tickerWeights[pos.ticker]) tickerWeights[pos.ticker] = 0;
      tickerWeights[pos.ticker] += activeTotalCost > 0 ? (pos._cost || 0) / activeTotalCost : 0;
    });
    // Mapa de closes del benchmark por fecha (para fallback de beta)
    const bmCloseMap = {};
    benchmarkHistory.forEach((d) => { bmCloseMap[new Date(d.ts).toISOString().slice(0, 10)] = d.close; });

    const activeTickers = [...new Set(Object.keys(tickerWeights))];
    const missingHistTickers = activeTickers.filter((t) => !tickersWithData.includes(t) && yahooBetas[t] == null);
    let extraMonthlyBetas = {};
    if (missingHistTickers.length > 0) {
      const fbConfigs = [
        { range: "5y", interval: "1mo", sliceKey: 7, minPairs: 3 },
        { range: "2y", interval: "1wk", sliceKey: 10, minPairs: 10 },
        { range: "1y", interval: "1d",  sliceKey: 10, minPairs: 20 },
      ];
      for (const cfg of fbConfigs) {
        const still = missingHistTickers.filter((t) => extraMonthlyBetas[t] == null);
        if (!still.length) break;
        const [bmD, ...tDs] = await Promise.all([
          fetchHistoricalCloses("^GSPC", cfg.range, cfg.interval),
          ...still.map((t) => fetchHistoricalCloses(t, cfg.range, cfg.interval))
        ]);
        const bmDM = {};
        bmD.forEach((d) => { bmDM[new Date(d.ts).toISOString().slice(0, cfg.sliceKey)] = d.close; });
        const bmKs = Object.keys(bmDM).sort();
        const bmR = bmKs.slice(1).map((k, i) => { const c0 = bmDM[bmKs[i]], c1 = bmDM[k]; return c0 > 0 ? (c1 - c0) / c0 : 0; });
        still.forEach((ticker, idx) => {
          const tDM = {};
          (tDs[idx] || []).forEach((d) => { tDM[new Date(d.ts).toISOString().slice(0, cfg.sliceKey)] = d.close; });
          const pairs = bmKs.slice(1).reduce((acc, k, i) => {
            const c0 = tDM[bmKs[i]], c1 = tDM[k];
            if (c0 && c1 && c0 > 0) acc.push([(c1 - c0) / c0, bmR[i]]);
            return acc;
          }, []);
          if (pairs.length >= cfg.minPairs) extraMonthlyBetas[ticker] = calcBeta(pairs.map((p) => p[0]), pairs.map((p) => p[1]));
        });
      }
    }
    activeTickers.forEach((ticker) => {
      const w = tickerWeights[ticker] || 0;
      let assetBeta = yahooBetas[ticker] ?? extraMonthlyBetas[ticker] ?? null;
      if (assetBeta === null && benchmarkHistory.length > 1) {
        const tMap = tickerDateMaps[ticker] || {};
        const tDates = Object.keys(tMap).sort();
        const tRets = [], bmRets = [];
        for (let i = 1; i < tDates.length; i++) {
          const tc0 = tMap[tDates[i - 1]], tc1 = tMap[tDates[i]];
          const bc0 = bmCloseMap[tDates[i - 1]], bc1 = bmCloseMap[tDates[i]];
          if (tc0 > 0 && tc1 > 0 && bc0 > 0 && bc1 > 0) {
            tRets.push((tc1 - tc0) / tc0);
            bmRets.push((bc1 - bc0) / bc0);
          }
        }
        if (tRets.length >= 2) assetBeta = calcBeta(tRets, bmRets);
      }
      assetBetas.push({ ticker, weight: w, beta: assetBeta, contribution: assetBeta !== null ? assetBeta * w : null });
    });
    assetBetas.sort((a, b) => Math.abs(b.contribution ?? 0) - Math.abs(a.contribution ?? 0));
  }

  // Show weighted sum of current positions as the main beta card value
  const weightedBeta = assetBetas.length > 0
    ? assetBetas.reduce((s, a) => s + (a.contribution ?? 0), 0)
    : null;
  document.getElementById("betaValue").textContent = weightedBeta !== null ? weightedBeta.toFixed(2) : (beta !== null ? beta.toFixed(2) : "—");

  // Store for info popup
  const n = dailyPortfolioReturns.length;
  const mean = n > 0 ? dailyPortfolioReturns.reduce((s, r) => s + r, 0) / n : 0;
  const variance = n > 1 ? dailyPortfolioReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1) : 0;
  const std = Math.sqrt(variance);
  const daily_rfr = (perfRfr.rate / 100) / 252;
  perfMetricsData = {
    sharpe: metrics.sharpe,
    volatility: metrics.volatility,
    var: metrics.var,
    beta,
    maxDD,
    n,
    mean,
    std,
    daily_rfr,
    rfr_pct: perfRfr.rate,
    rfr_label: perfRfr.label || "Tasa libre de riesgo",
    conf: perfCurrentConf,
    horizon: perfVarHorizon,
    benchmarkLabel,
    assetBetas,
  };

  // Persistir series + extras para el reporte PDF
  perfReportData = {
    equityCurve: portfolioCumulative,         // [{date:'MM-DD', value: cum %}]
    benchmarkCurve: benchmarkCumulative,      // [{date:'MM-DD', value: cum %}]
    returnDates,                               // ['YYYY-MM-DD', ...]
    dailyPortfolioReturns,
    dailyBenchmarkReturns,
    benchmarkLabel,
    weightedBeta: weightedBeta ?? beta,
    assetBetas,
    sessions: returnDates.length,
  };

  drawPerfChart(canvas, portfolioCumulative, benchmarkCumulative, returnDates, portfolio.name, benchmarkLabel);
  statusEl.textContent = `${returnDates.length} sesiones · ${tickersWithData.length} ticker(s)`;
}

// ── Monte Carlo simulation ────────────────────────────────────────────────────

function boxMullerRand() {
  let u, v, s;
  do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; s = u * u + v * v; }
  while (s >= 1 || s === 0);
  return u * Math.sqrt(-2 * Math.log(s) / s);
}

// Gamma(shape,1) via Marsaglia-Tsang — used to build Student-t draws
function randGamma(shape) {
  if (shape < 1) return randGamma(1 + shape) * Math.pow(Math.random(), 1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do { x = boxMullerRand(); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

// Standard Student-t draw with `df` degrees of freedom
function randStudentT(df) {
  const z = boxMullerRand();
  const chi2 = randGamma(df / 2) * 2;
  return z / Math.sqrt(chi2 / df);
}

function runMonteCarlo(dailyReturns, initVal, years, opts = {}) {
  const {
    numSims = 4000,
    contribution = 0,   // monthly cashflow in portfolio currency (negative = retiro)
    model = "gbm",      // 'gbm' | 'bootstrap' | 't'
    inflationRate = 0,  // annual decimal; >0 expresses results in today's money
    goal = null,        // target final value (today's money if inflation on)
  } = opts;

  const n = dailyReturns.length;
  const logReturns = dailyReturns.map((r) => Math.log(1 + Math.max(r, -0.9999)));
  const mu = logReturns.reduce((s, r) => s + r, 0) / n;
  const variance = logReturns.reduce((s, r) => s + (r - mu) ** 2, 0) / (n - 1);
  const sigma = Math.sqrt(variance);

  // Monthly steps: dt = 21 trading days
  const steps = years * 12;
  const drift = mu * 21 - 0.5 * sigma * sigma * 21;
  const diffusion = sigma * Math.sqrt(21);

  // Student-t df from sample excess kurtosis (excess = 6/(df-4))
  let dfT = 30;
  if (model === "t") {
    const m4 = logReturns.reduce((s, r) => s + (r - mu) ** 4, 0) / n;
    const exKurt = variance > 0 ? m4 / (variance * variance) - 3 : 0;
    dfT = exKurt > 0.1 ? Math.min(30, Math.max(3, 6 / exKurt + 4)) : 30;
  }
  const tScale = Math.sqrt((dfT - 2) / dfT); // rescale t to unit variance

  function monthlyStep() {
    if (model === "bootstrap") {
      // empirical: sum 21 daily log-returns sampled with replacement (keeps fat tails/skew)
      let s = 0;
      for (let k = 0; k < 21; k++) s += logReturns[(Math.random() * n) | 0];
      return s;
    }
    if (model === "t") return drift + diffusion * randStudentT(dfT) * tScale;
    return drift + diffusion * boxMullerRand();
  }

  // Simulate paths; capture percentile snapshots and per-path max drawdown
  const snapshots = Array.from({ length: steps + 1 }, () => new Float32Array(numSims));
  const maxDD = new Float32Array(numSims);
  for (let sim = 0; sim < numSims; sim++) {
    let val = initVal, peak = initVal, dd = 0;
    snapshots[0][sim] = val;
    for (let t = 1; t <= steps; t++) {
      val = val * Math.exp(monthlyStep()) + contribution;
      if (val < 0) val = 0;
      if (val > peak) peak = val;
      else if (peak > 0) { const cur = (peak - val) / peak; if (cur > dd) dd = cur; }
      snapshots[t][sim] = val;
    }
    maxDD[sim] = dd;
  }

  // Compute percentiles [5,10,25,50,75,90,95] at each time step
  const pctLevels = [5, 10, 25, 50, 75, 90, 95];
  const bands = pctLevels.map(() => new Float32Array(steps + 1));
  const sorted = new Float32Array(numSims);
  for (let t = 0; t <= steps; t++) {
    sorted.set(snapshots[t]);
    sorted.sort();
    pctLevels.forEach((p, i) => {
      bands[i][t] = sorted[Math.round((p / 100) * (numSims - 1))];
    });
  }

  // Inflation: deflate to today's purchasing power
  let deflator = null;
  if (inflationRate > 0) {
    const mInfl = Math.pow(1 + inflationRate, 1 / 12) - 1;
    deflator = new Float32Array(steps + 1);
    for (let t = 0; t <= steps; t++) deflator[t] = 1 / Math.pow(1 + mInfl, t);
    for (let i = 0; i < bands.length; i++)
      for (let t = 0; t <= steps; t++) bands[i][t] *= deflator[t];
  }

  // Final-value distribution (real if inflation on) for exact stats
  const dfac = deflator ? deflator[steps] : 1;
  const finals = new Float32Array(numSims);
  for (let s = 0; s < numSims; s++) finals[s] = snapshots[steps][s] * dfac;

  return {
    bands, steps, numSims, mu, sigma, initVal, finals, maxDD,
    contribution, totalContributed: contribution * steps,
    model, dfT, inflationRate, goal, years,
  };
}

async function computeDailyReturnsForMC(portfolio, histRange = "1y") {
  const positions = portfolio.positions || [];
  if (!positions.length) return null;
  const portfolioCur = portfolio.currency || "USD";
  const allPositions = buildAllPositionHistory(portfolio);
  if (!allPositions.length) return null;

  const uniqueTickers = [...new Set(allPositions.map((p) => p.ticker))];
  const tickerHistories = await Promise.all(
    uniqueTickers.map((t) => fetchHistoricalCloses(t, histRange, "1d").then((h) => ({ t, h })))
  );
  const histMap = {};
  tickerHistories.forEach(({ t, h }) => { histMap[t] = h; });

  const tickerDateMaps = {};
  uniqueTickers.forEach((t) => {
    tickerDateMaps[t] = {};
    (histMap[t] || []).forEach((d) => {
      tickerDateMaps[t][new Date(d.ts).toISOString().slice(0, 10)] = d.close;
    });
  });

  const tickersWithData = uniqueTickers.filter((t) => (histMap[t] || []).length > 1);
  if (!tickersWithData.length) return null;

  const dateSets = tickersWithData.map((t) => new Set(Object.keys(tickerDateMaps[t])));
  const commonDates = [...dateSets[0]].filter((d) => dateSets.every((s) => s.has(d))).sort();
  if (commonDates.length < 20) return null;

  // Forward projection uses CURRENT market-value weights (held positions only),
  // not historical cost weights — this is the allocation the investor holds today.
  let totalMV = 0;
  allPositions.forEach((pos) => {
    const posCur = pos.currency || portfolioCur;
    const hist = histMap[pos.ticker] || [];
    const lastClose = hist.length ? hist[hist.length - 1].close : pos.avgPrice;
    const mv = convertAmount(lastClose * pos.quantity, posCur, portfolioCur) ?? (lastClose * pos.quantity);
    pos._mv = pos.sellDate ? 0 : mv; // sold positions carry no current weight
    totalMV += pos._mv;
  });
  if (totalMV <= 0) return null;
  allPositions.forEach((pos) => { pos._weight = pos._mv / totalMV; });

  const dailyReturns = [];
  for (let i = 1; i < commonDates.length; i++) {
    const d0 = commonDates[i - 1], d1 = commonDates[i];
    let r = 0;
    allPositions.forEach((pos) => {
      if (pos.sellDate && d1 > pos.sellDate) return;
      const c0 = tickerDateMaps[pos.ticker]?.[d0];
      const c1 = tickerDateMaps[pos.ticker]?.[d1];
      if (c0 && c1 && c0 > 0) r += pos._weight * (c1 - c0) / c0;
    });
    dailyReturns.push(r);
  }
  return dailyReturns;
}

async function loadMonteCarloTab(portfolio) {
  mcTabLoaded = true;
  const statusEl = document.getElementById("mcStatus");
  const canvas = document.getElementById("mcCanvas");
  const statsGrid = document.getElementById("mcStatsGrid");

  statusEl.textContent = "Calculando simulación...";
  statsGrid.innerHTML = "";

  // Read projection controls
  const histRange = document.getElementById("mcHistRange")?.value || "2y";
  const model = document.getElementById("mcModel")?.value || "gbm";
  const contribution = parseFloat(document.getElementById("mcContribution")?.value) || 0;
  const goalRaw = parseFloat(document.getElementById("mcGoal")?.value);
  const goal = isFinite(goalRaw) && goalRaw > 0 ? goalRaw : null;
  const inflEnabled = document.getElementById("mcInflEnabled")?.checked;
  const inflRate = inflEnabled ? (parseFloat(document.getElementById("mcInflRate")?.value) || 0) / 100 : 0;

  const rangeLabel = { "1y": "1 año", "2y": "2 años", "5y": "5 años" }[histRange] || histRange;
  statusEl.textContent = `Obteniendo datos históricos (${rangeLabel})...`;
  const dailyReturns = await computeDailyReturnsForMC(portfolio, histRange);

  if (!dailyReturns || dailyReturns.length < 20) {
    statusEl.textContent = "Datos históricos insuficientes para calcular riesgo.";
    return;
  }

  // Use current market value if available, else total invested
  const cur = portfolio.currency || "USD";
  const initVal = (_lastPortfolioCurrentValue && _lastPortfolioCurrentValue > 0)
    ? _lastPortfolioCurrentValue
    : (() => {
        const { totalInvested } = calcPortfolioTotals(portfolio.positions || [], cur);
        return totalInvested;
      })();

  if (initVal <= 0) {
    statusEl.textContent = "El portafolio no tiene valor actual. Agrega posiciones primero.";
    return;
  }

  const numSims = 4000;
  const sim = runMonteCarlo(dailyReturns, initVal, mcYears, {
    numSims, contribution, model, inflationRate: inflRate, goal,
  });
  drawMonteCarloChart(canvas, sim, mcYears, cur);
  renderMCStats(sim, mcYears, cur, initVal);
  const annRet = ((Math.exp(sim.mu * 252) - 1) * 100).toFixed(1);
  const annVol = (sim.sigma * Math.sqrt(252) * 100).toFixed(1);
  const modelLabel = { gbm: "GBM normal", bootstrap: "bootstrap histórico", t: `t-Student (df≈${sim.dfT.toFixed(1)})` }[model];
  const parts = [
    `${numSims.toLocaleString()} trayectorias · ${modelLabel}`,
    `retorno anual: ${annRet}% · volatilidad: ${annVol}%`,
    `${dailyReturns.length} sesiones (${rangeLabel})`,
  ];
  if (contribution) parts.push(`aporte mensual: ${formatCurrency(contribution, cur)}`);
  if (inflRate) parts.push(`valores en poder adquisitivo de hoy (infl. ${(inflRate * 100).toFixed(1)}%)`);
  statusEl.textContent = parts.join(" · ");
}

function drawMonteCarloChart(canvas, sim, years, currency) {
  const { bands, steps } = sim;
  const wrap = canvas.parentElement;
  const W = wrap.clientWidth || 700;
  const H = 300;
  const dpr = window.devicePixelRatio || 1;
  const padL = 72, padR = 20, padTop = 20, padBot = 32;
  const chartW = W - padL - padR;
  const chartH = H - padTop - padBot;

  // Cancel any in-flight reveal animation before redrawing
  if (mcRafId != null) { cancelAnimationFrame(mcRafId); mcRafId = null; }
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + "px"; canvas.style.height = H + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const minV = Math.min(...Array.from(bands[0]));
  const maxV = Math.max(...Array.from(bands[6]));
  const vRange = maxV - minV || 1;

  const toX = (t) => padL + (t / steps) * chartW;
  const toY = (v) => padTop + chartH - ((v - minV) / vRange) * chartH;

  const C = getPerfChartColors();

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const v = minV + (vRange / gridSteps) * i;
      const y = toY(v);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + chartW, y);
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = C.axisLabel; ctx.font = "10px Inter, sans-serif";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(formatCurrencyCompact(v, currency), padL - 6, y);
    }
    ctx.fillStyle = C.axisLabel; ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (let yr = 0; yr <= years; yr++) {
      const t = yr * 12;
      ctx.fillText(yr === 0 ? "Hoy" : `Año ${yr}`, toX(t), padTop + chartH + 5);
    }
  }

  function drawData(progress) {
    const revealW = chartW * progress;

    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, padTop - 1, revealW, chartH + 2);
    ctx.clip();

    function drawBand(upperArr, lowerArr, color) {
      ctx.beginPath();
      for (let t = 0; t <= steps; t++) ctx[t === 0 ? "moveTo" : "lineTo"](toX(t), toY(upperArr[t]));
      for (let t = steps; t >= 0; t--) ctx.lineTo(toX(t), toY(lowerArr[t]));
      ctx.closePath();
      ctx.fillStyle = color; ctx.fill();
    }

    drawBand(bands[6], bands[0], "rgba(111,134,255,0.10)");
    drawBand(bands[5], bands[1], "rgba(111,134,255,0.16)");
    drawBand(bands[4], bands[2], "rgba(111,134,255,0.24)");

    ctx.beginPath();
    for (let t = 0; t <= steps; t++) ctx[t === 0 ? "moveTo" : "lineTo"](toX(t), toY(bands[3][t]));
    ctx.strokeStyle = "#6f86ff"; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.stroke();

    ctx.restore();

    // Starting dot always visible
    ctx.beginPath();
    ctx.arc(toX(0), toY(bands[3][0]), 4, 0, Math.PI * 2);
    ctx.fillStyle = "#6f86ff"; ctx.fill();
  }

  const duration = 900;
  const startTime = performance.now();

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function frame(now) {
    const p = easeOut(Math.min((now - startTime) / duration, 1));
    drawStatic();
    drawData(p);
    mcRafId = p < 1 ? requestAnimationFrame(frame) : null;
  }

  mcRafId = requestAnimationFrame(frame);
}

function formatCurrencyCompact(value, currency) {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + "B";
  if (value >= 1e6) return (value / 1e6).toFixed(1) + "M";
  if (value >= 1e3) return (value / 1e3).toFixed(0) + "K";
  return value.toFixed(0);
}

function renderMCStats(sim, years, currency, initVal) {
  const grid = document.getElementById("mcStatsGrid");
  const { bands, steps, numSims, finals, maxDD, totalContributed, goal, inflationRate } = sim;
  const last = steps;
  const yLbl = `${years} año${years > 1 ? "s" : ""}`;

  const median = bands[3][last];
  const p5 = bands[0][last];
  const p95 = bands[6][last];
  const p25 = bands[2][last];
  const p75 = bands[4][last];

  // Baseline = total capital deployed (initial + periodic contributions)
  const invested = initVal + (totalContributed || 0);
  const pctChange = (v) => {
    const pct = ((v - invested) / invested) * 100;
    return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
  };

  const annRet = ((Math.exp(sim.mu * 252) - 1) * 100);
  const annRetStr = (annRet >= 0 ? "+" : "") + annRet.toFixed(2) + "% anual";

  // Exact probabilities straight from the simulated final-value distribution
  let posCount = 0, goalCount = 0;
  for (let i = 0; i < numSims; i++) {
    if (finals[i] > invested) posCount++;
    if (goal != null && finals[i] >= goal) goalCount++;
  }
  const probPos = Math.round((posCount / numSims) * 100);

  // Median worst drawdown across paths
  const ddSorted = Float32Array.from(maxDD).sort();
  const medDD = ddSorted[Math.round(0.5 * (numSims - 1))] * 100;

  const cards = [
    { label: `Mediana en ${yLbl}`, value: formatCurrency(median, currency), sub: pctChange(median), cls: median >= invested ? "pos" : "neg" },
    { label: "Escenario pesimista (5%)", value: formatCurrency(p5, currency), sub: pctChange(p5), cls: p5 >= invested ? "pos" : "neg" },
    { label: "Rango intercuartil (25–75%)", value: `${formatCurrencyCompact(p25, currency)} – ${formatCurrencyCompact(p75, currency)}`, sub: `${pctChange(p25)} a ${pctChange(p75)}`, cls: "" },
    { label: "Escenario optimista (95%)", value: formatCurrency(p95, currency), sub: pctChange(p95), cls: p95 >= invested ? "pos" : "neg" },
    { label: "Retorno anual esperado", value: annRetStr, sub: "Media log-normal anualizada", cls: annRet >= 0 ? "pos" : "neg" },
    { label: "Prob. retorno positivo", value: `${probPos}%`, sub: `vs. capital aportado, en ${yLbl}`, cls: probPos >= 50 ? "pos" : "neg" },
    { label: "Drawdown máximo esperado", value: `−${medDD.toFixed(1)}%`, sub: "caída mediana entre escenarios", cls: "neg" },
  ];

  if (totalContributed) {
    cards.push({ label: "Capital aportado", value: formatCurrency(invested, currency), sub: `inicial ${formatCurrencyCompact(initVal, currency)} + aportes`, cls: "" });
  }
  if (goal != null) {
    const probGoal = Math.round((goalCount / numSims) * 100);
    cards.push({ label: "Prob. alcanzar meta", value: `${probGoal}%`, sub: `meta de ${formatCurrencyCompact(goal, currency)}${inflationRate ? " (hoy)" : ""}`, cls: probGoal >= 50 ? "pos" : "neg" });
  }

  grid.innerHTML = cards.map((c) => `
    <div class="mc-stat-card">
      <div class="mc-stat-label">${c.label}</div>
      <div class="mc-stat-value ${c.cls}">${c.value}</div>
      <div class="mc-stat-sub">${c.sub}</div>
    </div>
  `).join("");
}

function normalCDF(z) {
  // Abramowitz & Stegun approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

// ── Perf info popup ───────────────────────────────────────────────────────────

function buildPerfInfoContent(metric) {
  const d = perfMetricsData;
  if (!d) return { title: "Sin datos", body: "<p class='perf-info-note'>Carga el análisis de desempeño primero.</p>" };

  const fmt = (v, decimals = 6) => v !== null && v !== undefined ? v.toFixed(decimals) : "—";
  const pct = (v, decimals = 4) => v !== null && v !== undefined ? (v * 100).toFixed(decimals) + "%" : "—";

  if (metric === "sharpe") {
    const annMean = d.mean * 252;
    const annStd = d.std * Math.sqrt(252);
    const annRfr = d.rfr_pct / 100;
    return {
      title: "Sharpe Ratio — Cálculo",
      body: `
        <div class="perf-info-formula">S = (R̄ₚ − Rƒ) / σₚ × √252</div>
        <div class="perf-info-values">
          <div class="perf-info-row"><span class="perf-info-row-label">Retorno diario promedio (R̄ₚ)</span><span class="perf-info-row-val">${pct(d.mean, 4)}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Tasa libre de riesgo diaria (Rƒ)</span><span class="perf-info-row-val">${pct(d.daily_rfr, 4)}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Tasa libre de riesgo anual (${d.rfr_label})</span><span class="perf-info-row-val">${d.rfr_pct.toFixed(2)}%</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Desv. estándar diaria (σ_diaria)</span><span class="perf-info-row-val">${pct(d.std, 4)}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Desv. estándar anualizada (σₚ)</span><span class="perf-info-row-val">${(d.std * Math.sqrt(252) * 100).toFixed(4)}%</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Observaciones (días)</span><span class="perf-info-row-val">${d.n}</span></div>
        </div>
        <div class="perf-info-formula">S = (${pct(d.mean, 4)} − ${pct(d.daily_rfr, 4)}) / ${pct(d.std, 4)} × √252
  = (${(annMean * 100).toFixed(4)}% − ${(annRfr * 100).toFixed(4)}%) / ${(annStd * 100).toFixed(4)}%</div>
        <div class="perf-info-result">Sharpe Ratio = ${d.sharpe !== null ? d.sharpe.toFixed(4) : "—"}</div>
        <p class="perf-info-note">Un Sharpe &gt; 1 indica retorno ajustado por riesgo favorable. &gt; 2 es excelente. Valores negativos implican que el activo libre de riesgo superó al portafolio.</p>
      `
    };
  }

  if (metric === "volatility") {
    return {
      title: "Volatilidad Anualizada — Cálculo",
      body: `
        <div class="perf-info-formula">σ_anual = σ_diaria × √252</div>
        <div class="perf-info-values">
          <div class="perf-info-row"><span class="perf-info-row-label">Desv. estándar diaria (σ_diaria)</span><span class="perf-info-row-val">${pct(d.std, 4)}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Factor de anualización</span><span class="perf-info-row-val">√252 = ${Math.sqrt(252).toFixed(4)}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Observaciones (días)</span><span class="perf-info-row-val">${d.n}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Varianza diaria</span><span class="perf-info-row-val">${(d.std ** 2 * 10000).toFixed(4)} (×10⁻⁴)</span></div>
        </div>
        <div class="perf-info-formula">σ_anual = ${pct(d.std, 4)} × ${Math.sqrt(252).toFixed(4)}</div>
        <div class="perf-info-result">Volatilidad Anualizada = ${d.volatility !== null ? d.volatility.toFixed(2) + "%" : "—"}</div>
        <p class="perf-info-note">Calculada como desviación estándar de los retornos diarios del portafolio, anualizada multiplicando por √252 (días hábiles en un año). Mide la dispersión total del retorno.</p>
      `
    };
  }

  if (metric === "var") {
    const confPct = (d.conf * 100).toFixed(0);
    const tail = ((1 - d.conf) * 100).toFixed(0);
    const varDaily = d.var;
    const varAnnual = varDaily !== null ? varDaily * Math.sqrt(252) : null;
    const displayed = d.horizon === "annual" ? varAnnual : varDaily;
    return {
      title: "VaR (Valor en Riesgo) — Cálculo",
      body: `
        <div class="perf-info-formula">VaR = −percentil(${tail}%) de retornos históricos diarios</div>
        <div class="perf-info-values">
          <div class="perf-info-row"><span class="perf-info-row-label">Método</span><span class="perf-info-row-val">Histórico (no paramétrico)</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Nivel de confianza</span><span class="perf-info-row-val">${confPct}%</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Observaciones (días)</span><span class="perf-info-row-val">${d.n}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Retornos en la cola inferior (${tail}%)</span><span class="perf-info-row-val">≈ ${Math.floor((1 - d.conf) * d.n)} días</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">VaR diario (${confPct}% conf.)</span><span class="perf-info-row-val">${varDaily !== null ? varDaily.toFixed(4) + "%" : "—"}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">VaR anualizado (×√252)</span><span class="perf-info-row-val">${varAnnual !== null ? varAnnual.toFixed(4) + "%" : "—"}</span></div>
        </div>
        <div class="perf-info-result">VaR ${d.horizon === "annual" ? "Anualizado" : "Diario"} (${confPct}%) = ${displayed !== null ? displayed.toFixed(2) + "%" : "—"}</div>
        <p class="perf-info-note">Con ${confPct}% de confianza, la pérdida máxima esperada en un día no superará el valor mostrado. Se ordena el historial de retornos y se toma el percentil ${tail}% inferior. VaR histórico no asume distribución normal.</p>
      `
    };
  }

  if (metric === "beta") {
    const hasBenchmark = d.beta !== null;
    const assetRows = d.assetBetas.map((a) =>
      `<tr>
        <td>${a.ticker}</td>
        <td>${(a.weight * 100).toFixed(2)}%</td>
        <td>${a.beta !== null ? a.beta.toFixed(4) : "—"}</td>
        <td>${a.contribution !== null ? a.contribution.toFixed(4) : "—"}</td>
      </tr>`
    ).join("");
    const weightedSum = d.assetBetas.reduce((s, a) => s + (a.contribution ?? 0), 0);
    return {
      title: "Beta del Portafolio — Cálculo",
      body: `
        <div class="perf-info-formula">β_portafolio = Cov(Rₚ, Rₘ) / Var(Rₘ)</div>
        <div class="perf-info-values">
          <div class="perf-info-row"><span class="perf-info-row-label">Benchmark</span><span class="perf-info-row-val">${d.benchmarkLabel}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Suma ponderada — posiciones actuales (Σ wᵢ·βᵢ)</span><span class="perf-info-row-val">${hasBenchmark ? weightedSum.toFixed(4) : "—"}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Beta histórica (regresión)</span><span class="perf-info-row-val">${hasBenchmark ? d.beta.toFixed(4) : "—"}</span></div>
        </div>
        ${hasBenchmark && assetRows ? `
        <table class="perf-beta-table">
          <thead><tr><th>Ticker</th><th>Peso (wᵢ)</th><th>Beta (βᵢ)</th><th>wᵢ · βᵢ</th></tr></thead>
          <tbody>${assetRows}</tbody>
          <tfoot><tr><td>Total</td><td>100%</td><td></td><td>${weightedSum.toFixed(4)}</td></tr></tfoot>
        </table>` : "<p class='perf-info-note'>Configura un benchmark en Ajustes para ver la beta.</p>"}
        <div class="perf-info-result">Beta del portafolio = ${hasBenchmark ? weightedSum.toFixed(4) : "—"}</div>
        <p class="perf-info-note">β &lt; 1: portafolio menos volátil que el mercado. β &gt; 1: más volátil. β = 1: movimiento igual al benchmark. La beta mostrada refleja tus posiciones actuales (suma ponderada). La beta histórica por regresión incluye períodos con posiciones ya cerradas.</p>
      `
    };
  }

  if (metric === "maxdd") {
    return {
      title: "Max Drawdown — Cálculo",
      body: `
        <div class="perf-info-formula">MDD = (Valle − Pico) / Pico × 100</div>
        <div class="perf-info-values">
          <div class="perf-info-row"><span class="perf-info-row-label">Método</span><span class="perf-info-row-val">Retorno acumulado pico a valle</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Observaciones (días)</span><span class="perf-info-row-val">${d.n}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Máx. caída registrada</span><span class="perf-info-row-val">${d.maxDD !== null ? "-" + d.maxDD.toFixed(4) + "%" : "—"}</span></div>
        </div>
        <div class="perf-info-formula">Algoritmo:
  cumReturn = Π (1 + rᵢ)
  peak = max(cumReturn hasta tᵢ)
  dd(tᵢ) = (peak − cumReturn) / peak
  MDD = max(dd) × 100</div>
        <div class="perf-info-result">Max Drawdown = ${d.maxDD !== null ? "-" + d.maxDD.toFixed(2) + "%" : "—"}</div>
        <p class="perf-info-note">Representa la mayor caída porcentual desde un máximo histórico hasta el punto más bajo subsiguiente, en el período analizado. No indica cuándo ocurrió ni cuánto tardó en recuperarse.</p>
      `
    };
  }

  return { title: "", body: "" };
}

function openPerfInfoPopup(metric) {
  const overlay = document.getElementById("perfInfoOverlay");
  const titleEl = document.getElementById("perfInfoTitle");
  const bodyEl = document.getElementById("perfInfoBody");
  if (!overlay) return;
  const { title, body } = buildPerfInfoContent(metric);
  titleEl.textContent = title;
  bodyEl.innerHTML = body;
  overlay.classList.remove("hidden");
}

function closePerfInfoPopup() {
  const overlay = document.getElementById("perfInfoOverlay");
  if (overlay) overlay.classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".perf-info-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openPerfInfoPopup(btn.dataset.metric);
    });
  });

  const closeBtn = document.getElementById("perfInfoClose");
  if (closeBtn) closeBtn.addEventListener("click", closePerfInfoPopup);

  const overlay = document.getElementById("perfInfoOverlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closePerfInfoPopup();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePerfInfoPopup();
  });
});

// ── i18n ──────────────────────────────────────────────────────────────────────

const langStorageKey = "blackportfolio-lang";

const translations = {
  es: {
    nav_home: "Inicio",
    nav_tracker: "Portafolio Tracker",
    nav_markets: "Mercados",
    nav_settings: "Ajustes",
    sidebar_back: "Volver a landing",
    sidebar_logout: "Cerrar sesión",
    settings_session_title: "Datos de sesión",
    settings_session_sub: "Resumen del usuario",
    settings_email_label: "Correo",
    settings_plan_label: "Plan",
    settings_type_label: "Tipo",
    settings_user_label: "Usuario",
    settings_password_label: "Contraseña",
    settings_credentials_btn: "Credenciales de acceso",
    settings_change_password: "Cambiar contraseña",
    settings_current_password: "Contraseña actual",
    settings_new_password: "Nueva contraseña",
    settings_confirm_password: "Confirmar contraseña",
    settings_save_password: "Guardar contraseña",
    settings_cancel: "Cancelar",
    settings_actions_title: "Acciones",
    settings_actions_sub: "Utilidades rapidas",
    settings_reset_home: "Restablecer inicio",
    settings_lang_title: "Idioma",
    settings_lang_sub: "Selecciona el idioma de la interfaz",
    theme_dark: "Tema oscuro",
    theme_light: "Tema claro",
    heading_settings: "Ajustes",
    heading_markets: "Mercados",
    heading_tracker: "Portafolio Tracker"
  },
  en: {
    nav_home: "Home",
    nav_tracker: "Portfolio Tracker",
    nav_markets: "Markets",
    nav_settings: "Settings",
    sidebar_back: "Back to landing",
    sidebar_logout: "Log out",
    settings_session_title: "Session data",
    settings_session_sub: "User summary",
    settings_email_label: "Email",
    settings_plan_label: "Plan",
    settings_type_label: "Type",
    settings_user_label: "User",
    settings_password_label: "Password",
    settings_credentials_btn: "Access credentials",
    settings_change_password: "Change password",
    settings_current_password: "Current password",
    settings_new_password: "New password",
    settings_confirm_password: "Confirm password",
    settings_save_password: "Save password",
    settings_cancel: "Cancel",
    settings_actions_title: "Actions",
    settings_actions_sub: "Quick utilities",
    settings_reset_home: "Reset home",
    settings_lang_title: "Language",
    settings_lang_sub: "Select interface language",
    theme_dark: "Dark theme",
    theme_light: "Light theme",
    heading_settings: "Settings",
    heading_markets: "Markets",
    heading_tracker: "Portfolio Tracker"
  },
  fr: {
    nav_home: "Accueil",
    nav_tracker: "Suivi de portefeuille",
    nav_markets: "Marchés",
    nav_settings: "Paramètres",
    sidebar_back: "Retour à l'accueil",
    sidebar_logout: "Se déconnecter",
    settings_session_title: "Données de session",
    settings_session_sub: "Résumé utilisateur",
    settings_email_label: "Email",
    settings_plan_label: "Plan",
    settings_type_label: "Type",
    settings_user_label: "Utilisateur",
    settings_password_label: "Mot de passe",
    settings_credentials_btn: "Identifiants d'accès",
    settings_change_password: "Changer le mot de passe",
    settings_current_password: "Mot de passe actuel",
    settings_new_password: "Nouveau mot de passe",
    settings_confirm_password: "Confirmer le mot de passe",
    settings_save_password: "Enregistrer",
    settings_cancel: "Annuler",
    settings_actions_title: "Actions",
    settings_actions_sub: "Utilitaires rapides",
    settings_reset_home: "Réinitialiser l'accueil",
    settings_lang_title: "Langue",
    settings_lang_sub: "Sélectionner la langue",
    theme_dark: "Thème sombre",
    theme_light: "Thème clair",
    heading_settings: "Paramètres",
    heading_markets: "Marchés",
    heading_tracker: "Suivi de portefeuille"
  }
};

let currentLang = localStorage.getItem(langStorageKey) || "es";

function applyLanguage(lang) {
  const t = translations[lang] || translations.es;
  currentLang = lang;
  localStorage.setItem(langStorageKey, lang);

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (t[key]) el.textContent = t[key];
  });

  // update heading for active section
  const sectionHeadings = {
    tracker: t.heading_tracker,
    markets: t.heading_markets,
    settings: t.heading_settings
  };
  if (sectionHeadings[activeSection]) {
    mainHeading.textContent = sectionHeadings[activeSection];
  }

  // update theme button label without touching icon
  const isDark = !document.body.classList.contains("light-mode");
  const themeLabel = document.querySelector("#themeToggleButton .theme-label");
  if (themeLabel) themeLabel.textContent = isDark ? t.theme_dark : t.theme_light;

  // mark active lang button
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
}

document.querySelectorAll(".lang-btn").forEach(btn => {
  btn.addEventListener("click", () => applyLanguage(btn.dataset.lang));
});

applyLanguage(currentLang);

// ── Credentials Panel ─────────────────────────────────────────────────────────

const credentialsToggleBtn = document.getElementById("credentialsToggleBtn");
const credentialsPanel = document.getElementById("credentialsPanel");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const changePasswordForm = document.getElementById("changePasswordForm");
const cancelPasswordBtn = document.getElementById("cancelPasswordBtn");
const passwordChangeMessage = document.getElementById("passwordChangeMessage");

credentialsToggleBtn.addEventListener("click", () => {
  const open = credentialsPanel.classList.toggle("hidden");
  const t = translations[currentLang] || translations.es;
  credentialsToggleBtn.textContent = open
    ? t.settings_credentials_btn
    : (currentLang === "fr" ? "Masquer les identifiants" : currentLang === "en" ? "Hide credentials" : "Ocultar credenciales");
  if (!open) {
    // populate username on open
    const session = window.BlackPortfolioAuth.getSession();
    if (session) document.getElementById("settingsUser").textContent = session.fullName;
  }
  changePasswordForm.classList.add("hidden");
  passwordChangeMessage.textContent = "";
});

changePasswordBtn.addEventListener("click", () => {
  changePasswordForm.classList.toggle("hidden");
  passwordChangeMessage.textContent = "";
});

cancelPasswordBtn.addEventListener("click", () => {
  changePasswordForm.classList.add("hidden");
  changePasswordForm.reset();
  passwordChangeMessage.textContent = "";
});

changePasswordForm.addEventListener("submit", async e => {
  e.preventDefault();
  const t = translations[currentLang] || translations.es;
  const session = window.BlackPortfolioAuth.getSession();
  if (!session) return;

  const current = document.getElementById("currentPasswordInput").value;
  const next = document.getElementById("newPasswordInput").value;
  const confirm = document.getElementById("confirmPasswordInput").value;

  if (next !== confirm) {
    passwordChangeMessage.className = "form-message error";
    passwordChangeMessage.textContent = currentLang === "fr"
      ? "Les mots de passe ne correspondent pas."
      : currentLang === "en"
      ? "Passwords do not match."
      : "Las contraseñas no coinciden.";
    return;
  }

  const result = await window.BlackPortfolioAuth.changePassword(session.email, current, next);
  if (result.ok) {
    passwordChangeMessage.className = "form-message success";
    passwordChangeMessage.textContent = currentLang === "fr"
      ? "Mot de passe mis à jour."
      : currentLang === "en"
      ? "Password updated successfully."
      : "Contraseña actualizada correctamente.";
    changePasswordForm.reset();
    setTimeout(() => { passwordChangeMessage.textContent = ""; }, 3000);
  } else {
    passwordChangeMessage.className = "form-message error";
    passwordChangeMessage.textContent = result.error;
  }
});

// ── Two-Factor Auth management (Settings section) ────────────────────────────
(function init2FASettings() {
  const statusEl  = document.getElementById("twoFaStatus");
  const actionsEl = document.getElementById("twoFaActions");

  function makeOtpBoxListeners(boxes, syncFn, clearFn) {
    boxes.forEach((box, i) => {
      box.addEventListener("input", () => {
        box.value = box.value.replace(/\D/g, "").slice(-1);
        clearFn();
        if (box.value && i < 5) boxes[i + 1].focus();
        syncFn();
      });
      box.addEventListener("keydown", e => {
        if (e.key === "Backspace" && !box.value && i > 0) boxes[i - 1].focus();
        else if (e.key === "ArrowLeft"  && i > 0) boxes[i - 1].focus();
        else if (e.key === "ArrowRight" && i < 5) boxes[i + 1].focus();
      });
      box.addEventListener("paste", e => {
        e.preventDefault();
        const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        digits.split("").forEach((d, j) => { if (boxes[j]) boxes[j].value = d; });
        clearFn();
        syncFn();
        const next = boxes.findIndex(b => !b.value);
        (next === -1 ? boxes[5] : boxes[next]).focus();
      });
    });
  }

  async function refresh2FAStatus() {
    const session = window.BlackPortfolioAuth.getSession();
    if (!session || session.isDemo) {
      statusEl.textContent = "El usuario demo no requiere 2FA.";
      actionsEl.innerHTML = "";
      return;
    }

    const enabled = await window.BlackPortfolioAuth.isTwoFactorEnabled(session.id);

    if (enabled) {
      statusEl.innerHTML = '<span style="color:var(--success)">● Activo</span> — Tu cuenta está protegida con Google Authenticator.';
      actionsEl.innerHTML = '<button id="disable2FABtn" class="button secondary" type="button" style="color:#ff8ca4;border-color:#ff8ca4">Desactivar 2FA</button>';
      document.getElementById("disable2FABtn").addEventListener("click", openDisableModal);
    } else {
      statusEl.innerHTML = '<span style="color:var(--warning)">● Inactivo</span> — Tu cuenta no tiene verificación en dos pasos.';
      actionsEl.innerHTML = '<button id="enable2FABtn" class="button primary" type="button">Activar Google Authenticator</button>';
      document.getElementById("enable2FABtn").addEventListener("click", openSetupModal);
    }
  }

  function openSetupModal() {
    const modal     = document.getElementById("mainTotpSetupModal");
    const loading   = document.getElementById("mainTotpLoading");
    const content   = document.getElementById("mainTotpContent");
    const qrImg     = document.getElementById("mainTotpQrImg");
    const manualKey = document.getElementById("mainTotpManualKey");
    const grid      = document.getElementById("mainTotpOtpGrid");
    const verifyBtn = document.getElementById("mainTotpVerifyBtn");
    const cancelBtn = document.getElementById("mainTotpCancelBtn");
    const msg       = document.getElementById("mainTotpMsg");
    const boxes     = Array.from(grid.querySelectorAll(".otp-box"));

    boxes.forEach(b => { b.value = ""; b.classList.remove("otp-box--complete", "otp-box--error"); });
    msg.textContent = "";
    msg.className = "totp-setup-msg";
    verifyBtn.disabled = true;
    verifyBtn.textContent = "Activar 2FA";
    modal.classList.remove("hidden");
    loading.classList.remove("hidden");
    content.classList.add("hidden");

    window.BlackPortfolioAuth.setupTwoFactor().then(result => {
      loading.classList.add("hidden");
      if (!result.ok) {
        content.classList.remove("hidden");
        msg.textContent = "Error al generar el QR. Intenta de nuevo.";
        msg.className = "totp-setup-msg form-message error";
        return;
      }
      if (typeof QRCode !== "undefined") {
        QRCode.toDataURL(result.otpauthUri, { width: 200, margin: 2 }, function(err, url) {
          qrImg.src = err ? "" : url;
        });
      } else {
        qrImg.style.display = "none";
      }
      manualKey.textContent = result.manualKey;
      content.classList.remove("hidden");
    });

    makeOtpBoxListeners(boxes,
      () => { verifyBtn.disabled = !boxes.every(b => b.value !== ""); },
      () => { msg.textContent = ""; msg.className = "totp-setup-msg"; boxes.forEach(b => b.classList.remove("otp-box--error")); }
    );

    verifyBtn.onclick = async () => {
      const code = boxes.map(b => b.value).join("");
      verifyBtn.disabled = true;
      verifyBtn.textContent = "Verificando…";

      const result = await window.BlackPortfolioAuth.verifyTwoFactorSetup(code);
      if (result.ok) {
        msg.textContent = "✓ 2FA activado correctamente.";
        msg.className = "totp-setup-msg form-message success";
        setTimeout(() => { modal.classList.add("hidden"); refresh2FAStatus(); }, 1200);
        return;
      }

      msg.textContent = result.error || "Código incorrecto.";
      msg.className = "totp-setup-msg form-message error";
      boxes.forEach(b => { b.value = ""; b.classList.add("otp-box--error"); });
      verifyBtn.textContent = "Activar 2FA";
      verifyBtn.disabled = true;
      boxes[0].focus();
    };

    cancelBtn.onclick = () => modal.classList.add("hidden");
  }

  function openDisableModal() {
    const modal      = document.getElementById("mainTotpDisableModal");
    const grid       = document.getElementById("mainDisableOtpGrid");
    const confirmBtn = document.getElementById("mainDisableConfirmBtn");
    const cancelBtn  = document.getElementById("mainDisableCancelBtn");
    const msg        = document.getElementById("mainDisableMsg");
    const boxes      = Array.from(grid.querySelectorAll(".otp-box"));

    boxes.forEach(b => { b.value = ""; b.classList.remove("otp-box--complete", "otp-box--error"); });
    msg.textContent = "";
    msg.className = "totp-setup-msg";
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Confirmar desactivación";
    modal.classList.remove("hidden");

    makeOtpBoxListeners(boxes,
      () => { confirmBtn.disabled = !boxes.every(b => b.value !== ""); },
      () => { msg.textContent = ""; msg.className = "totp-setup-msg"; boxes.forEach(b => b.classList.remove("otp-box--error")); }
    );

    confirmBtn.onclick = async () => {
      const code = boxes.map(b => b.value).join("");
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Desactivando…";

      const result = await window.BlackPortfolioAuth.disableTwoFactor(code);
      if (result.ok) {
        msg.textContent = "2FA desactivado.";
        msg.className = "totp-setup-msg form-message success";
        setTimeout(() => { modal.classList.add("hidden"); refresh2FAStatus(); }, 1000);
        return;
      }

      msg.textContent = result.error || "Código incorrecto.";
      msg.className = "totp-setup-msg form-message error";
      boxes.forEach(b => { b.value = ""; b.classList.add("otp-box--error"); });
      confirmBtn.textContent = "Confirmar desactivación";
      confirmBtn.disabled = true;
      boxes[0].focus();
    };

    cancelBtn.onclick = () => modal.classList.add("hidden");
  }

  // Load 2FA status when user navigates to settings
  document.querySelectorAll(".dashboard-nav-item[data-section='settings']").forEach(btn => {
    btn.addEventListener("click", refresh2FAStatus);
  });

  // Also load if settings is the active section on init
  if (document.getElementById("section-settings")?.classList.contains("active")) {
    refresh2FAStatus();
  }
})();

// ── Hub: customizable home with spaces + free-drag widgets ───────────────
(function initHub() {
  const tabsEl = document.getElementById("hubTabs");
  const canvasEl = document.getElementById("hubCanvas");
  const emptyEl = document.getElementById("hubEmpty");
  const addSpaceBtn = document.getElementById("hubAddSpaceBtn");
  const addWidgetBtn = document.getElementById("hubAddWidgetBtn");
  const addWidgetMenu = document.getElementById("hubAddWidgetMenu");
  const exportBtn = document.getElementById("hubExportBtn");
  const helpBtn = document.getElementById("hubHelpBtn");
  if (!tabsEl || !canvasEl) return;

  const DEFAULT_STATE = () => ({
    activeSpaceId: "s1",
    spaces: [{ id: "s1", name: "Espacio 1", widgets: [] }]
  });

  let state = loadHubState();
  const widgetRefs = new Map(); // widget.id → { el, chart, series, fetcher }

  function loadHubState() {
    try {
      const raw = localStorage.getItem(hubStorageKey);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && Array.isArray(s.spaces) && s.spaces.length) return s;
      }
    } catch {}
    return DEFAULT_STATE();
  }
  let _hubSyncTimer = null;
  async function pushHubStateToCloud(s) {
    try {
      const db = window.BlackPortfolioAuth?.db;
      const session = window.BlackPortfolioAuth?.getSession();
      if (!db || !session?.id || session.id === "anonymous") return;
      await db.collection("hubState").doc(session.id).set({
        data: s,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (_) {}
  }
  async function syncHubStateFromCloud() {
    try {
      const db = window.BlackPortfolioAuth?.db;
      const session = window.BlackPortfolioAuth?.getSession();
      if (!db || !session?.id || session.id === "anonymous") return false;
      const doc = await db.collection("hubState").doc(session.id).get();
      if (!doc.exists) return false;
      const cloudData = doc.data()?.data;
      if (!cloudData || !Array.isArray(cloudData.spaces) || !cloudData.spaces.length) return false;
      if (JSON.stringify(cloudData) !== JSON.stringify(state)) {
        state = cloudData;
        localStorage.setItem(hubStorageKey, JSON.stringify(state));
        return true;
      }
      return false;
    } catch (_) { return false; }
  }
  function saveHubState() {
    localStorage.setItem(hubStorageKey, JSON.stringify(state));
    if (_hubSyncTimer) clearTimeout(_hubSyncTimer);
    _hubSyncTimer = setTimeout(() => pushHubStateToCloud(state), 1500);
  }
  function activeSpace() { return state.spaces.find(s => s.id === state.activeSpaceId) || state.spaces[0]; }
  function uid() { return Math.random().toString(36).slice(2, 10); }

  // ── Tabs ────────────────────────────────────────────────────────────────
  function renderTabs() {
    tabsEl.innerHTML = "";
    state.spaces.forEach(sp => {
      const tab = document.createElement("div");
      tab.className = "hub-tab" + (sp.id === state.activeSpaceId ? " active" : "");
      tab.dataset.spaceId = sp.id;
      const nameInput = document.createElement("input");
      nameInput.className = "hub-tab-name";
      nameInput.value = sp.name;
      nameInput.size = Math.max(sp.name.length, 6);
      nameInput.addEventListener("click", e => {
        if (sp.id !== state.activeSpaceId) { e.preventDefault(); switchSpace(sp.id); }
      });
      nameInput.addEventListener("input", () => {
        sp.name = nameInput.value || "Espacio";
        nameInput.size = Math.max(sp.name.length, 6);
        saveHubState();
      });
      tab.appendChild(nameInput);
      if (state.spaces.length > 1) {
        const closeBtn = document.createElement("button");
        closeBtn.className = "hub-tab-close";
        closeBtn.type = "button";
        closeBtn.innerHTML = "×";
        closeBtn.title = "Cerrar espacio";
        closeBtn.addEventListener("click", e => {
          e.stopPropagation();
          if (!confirm(`¿Cerrar "${sp.name}"? Sus tarjetas se perderán.`)) return;
          state.spaces = state.spaces.filter(x => x.id !== sp.id);
          if (state.activeSpaceId === sp.id) state.activeSpaceId = state.spaces[0].id;
          saveHubState();
          renderAll();
        });
        tab.appendChild(closeBtn);
      }
      tab.addEventListener("mousedown", e => {
        if (e.target === nameInput) return;
        switchSpace(sp.id);
      });
      tabsEl.appendChild(tab);
    });
  }

  function switchSpace(spaceId) {
    if (state.activeSpaceId === spaceId) return;
    state.activeSpaceId = spaceId;
    saveHubState();
    renderAll();
  }

  addSpaceBtn.addEventListener("click", () => {
    const id = "s" + (state.spaces.length + 1) + "_" + uid().slice(0, 4);
    const sp = { id, name: `Espacio ${state.spaces.length + 1}`, widgets: [] };
    state.spaces.push(sp);
    state.activeSpaceId = id;
    saveHubState();
    renderAll();
  });

  // ── Add widget menu ─────────────────────────────────────────────────────
  addWidgetBtn.addEventListener("click", e => {
    e.stopPropagation();
    addWidgetMenu.classList.toggle("hidden");
  });
  document.addEventListener("click", e => {
    if (!addWidgetMenu.contains(e.target) && e.target !== addWidgetBtn) {
      addWidgetMenu.classList.add("hidden");
    }
  });
  addWidgetMenu.querySelectorAll("button[data-widget-type]").forEach(btn => {
    btn.addEventListener("click", () => {
      addWidget(btn.dataset.widgetType);
      addWidgetMenu.classList.add("hidden");
    });
  });

  function addWidget(type) {
    const sp = activeSpace();
    const defaults = {
      chart:     { w: 380, h: 280, title: "AAPL", config: { symbol: "AAPL", range: "6mo", interval: "1d" } },
      watchlist: { w: 320, h: 320, title: "Lista de seguimiento", config: { symbols: ["AAPL", "MSFT", "NVDA"] } },
      calendar:  { w: 380, h: 360, title: "Calendario de eventos", config: { tab: "earnings" } },
      note:      { w: 260, h: 180, title: "Nota", config: { text: "Escribe aquí…" } },
      heatmap:   { w: 660, h: 440, title: "Mapa de calor", config: { index: "SP500", sector: "Todos" } },
      portfolio: { w: 340, h: 320, title: "Resumen de cartera", config: { portfolioId: null } }
    }[type];
    if (!defaults) return;
    const offset = sp.widgets.length * 24;
    const widget = {
      id: uid(),
      type,
      title: defaults.title,
      x: 24 + (offset % 200),
      y: 24 + (offset % 200),
      w: defaults.w,
      h: defaults.h,
      config: defaults.config
    };
    sp.widgets.push(widget);
    saveHubState();
    renderWidget(widget);
    updateEmpty();
  }

  // ── Widget rendering ────────────────────────────────────────────────────
  function renderAll() {
    // Tear down existing widget DOM and refs
    widgetRefs.forEach(ref => {
      if (ref.cleanup) try { ref.cleanup(); } catch {}
    });
    widgetRefs.clear();
    canvasEl.querySelectorAll(".hub-widget").forEach(el => el.remove());
    renderTabs();
    activeSpace().widgets.forEach(renderWidget);
    updateEmpty();
  }

  function updateEmpty() {
    emptyEl.classList.toggle("hidden", activeSpace().widgets.length > 0);
  }

  function renderWidget(widget) {
    const el = document.createElement("div");
    el.className = "hub-widget hub-widget-" + widget.type;
    el.dataset.widgetId = widget.id;
    el.style.left = widget.x + "px";
    el.style.top = widget.y + "px";
    el.style.width = widget.w + "px";
    el.style.height = widget.h + "px";

    const header = document.createElement("div");
    header.className = "hub-widget-header";
    const titleInput = document.createElement("input");
    titleInput.className = "hub-widget-title";
    titleInput.value = widget.title;
    titleInput.addEventListener("input", () => {
      widget.title = titleInput.value;
      saveHubState();
    });
    titleInput.addEventListener("mousedown", e => e.stopPropagation());
    header.appendChild(titleInput);

    const controls = document.createElement("div");
    controls.className = "hub-widget-controls";
    const refreshBtn = mkBtn(`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`, "Actualizar");
    refreshBtn.addEventListener("click", e => { e.stopPropagation(); const r = widgetRefs.get(widget.id); if (r && r.refresh) r.refresh(); });
    controls.appendChild(refreshBtn);
    const closeBtn = mkBtn("×", "Eliminar tarjeta", true);
    closeBtn.addEventListener("click", e => {
      e.stopPropagation();
      if (!confirm("¿Eliminar esta tarjeta?")) return;
      const sp = activeSpace();
      sp.widgets = sp.widgets.filter(w => w.id !== widget.id);
      saveHubState();
      const ref = widgetRefs.get(widget.id);
      if (ref && ref.cleanup) try { ref.cleanup(); } catch {}
      widgetRefs.delete(widget.id);
      el.remove();
      updateEmpty();
    });
    controls.appendChild(closeBtn);
    header.appendChild(controls);
    el.appendChild(header);

    const body = document.createElement("div");
    body.className = "hub-widget-body";
    if (widget.type === "chart" || widget.type === "calendar" || widget.type === "heatmap") body.classList.add("no-padding");
    el.appendChild(body);

    const resize = document.createElement("div");
    resize.className = "hub-resize-handle";
    el.appendChild(resize);

    canvasEl.appendChild(el);

    // Drag
    header.addEventListener("mousedown", e => {
      if (e.target === titleInput || controls.contains(e.target)) return;
      startDrag(e, widget, el);
    });
    // Resize
    resize.addEventListener("mousedown", e => startResize(e, widget, el));

    // Render type
    const ref = { el };
    widgetRefs.set(widget.id, ref);
    renderWidgetBody(widget, body, ref);
  }

  function mkBtn(html, title, danger) {
    const b = document.createElement("button");
    b.className = "hub-widget-btn" + (danger ? " danger" : "");
    b.type = "button";
    b.title = title;
    b.innerHTML = html;
    return b;
  }

  // ── Drag / Resize ───────────────────────────────────────────────────────
  function startDrag(e, widget, el) {
    e.preventDefault();
    el.classList.add("dragging");
    const startX = e.clientX, startY = e.clientY;
    const origX = widget.x, origY = widget.y;
    function onMove(ev) {
      widget.x = Math.max(0, origX + (ev.clientX - startX));
      widget.y = Math.max(0, origY + (ev.clientY - startY));
      el.style.left = widget.x + "px";
      el.style.top = widget.y + "px";
    }
    function onUp() {
      el.classList.remove("dragging");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      saveHubState();
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function startResize(e, widget, el) {
    e.preventDefault();
    e.stopPropagation();
    el.classList.add("resizing");
    const startX = e.clientX, startY = e.clientY;
    const origW = widget.w, origH = widget.h;
    function onMove(ev) {
      widget.w = Math.max(220, origW + (ev.clientX - startX));
      widget.h = Math.max(140, origH + (ev.clientY - startY));
      el.style.width = widget.w + "px";
      el.style.height = widget.h + "px";
      const ref = widgetRefs.get(widget.id);
      if (ref && ref.onResize) ref.onResize();
    }
    function onUp() {
      el.classList.remove("resizing");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      saveHubState();
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // ── Widget body renderers ───────────────────────────────────────────────
  function renderWidgetBody(widget, body, ref) {
    if (widget.type === "chart") return renderChartWidget(widget, body, ref);
    if (widget.type === "watchlist") return renderWatchlistWidget(widget, body, ref);
    if (widget.type === "calendar") return renderCalendarWidget(widget, body, ref);
    if (widget.type === "note") return renderNoteWidget(widget, body, ref);
    if (widget.type === "heatmap") return renderHeatmapWidget(widget, body, ref);
    if (widget.type === "portfolio") return renderPortfolioWidget(widget, body, ref);
  }

  // Chart widget
  function renderChartWidget(widget, body, ref) {
    const meta = document.createElement("div");
    meta.className = "hw-chart-meta";
    meta.innerHTML = `<span class="hw-chart-price">—</span><span class="hw-chart-change">—</span>`;
    const inputBar = document.createElement("div");
    inputBar.style.cssText = "display:flex;gap:6px;padding:0 12px 6px;align-items:flex-start;";

    // Wrapper for ticker input + suggestions dropdown
    const tickerWrap = document.createElement("div");
    tickerWrap.style.cssText = "flex:1;position:relative;";

    const tickerInp = document.createElement("input");
    tickerInp.type = "text";
    tickerInp.value = widget.config.symbol;
    tickerInp.placeholder = "Buscar ticker…";
    tickerInp.style.cssText = "width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:4px 8px;color:inherit;font-size:11px;box-sizing:border-box;";

    const suggestionsEl = document.createElement("div");
    suggestionsEl.className = "hw-ticker-suggestions hidden";
    suggestionsEl.style.cssText = "position:absolute;top:calc(100% + 4px);left:0;right:0;max-height:220px;overflow-y:auto;background:rgba(10,10,12,0.98);border:1px solid rgba(255,255,255,0.1);border-radius:10px;z-index:9999;padding:4px;";

    tickerWrap.appendChild(tickerInp);
    tickerWrap.appendChild(suggestionsEl);

    const rangeSel = document.createElement("select");
    rangeSel.style.cssText = "background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:4px 6px;color:inherit;font-size:11px;";
    [["1mo","1d","1M"],["6mo","1d","6M"],["1y","1wk","1Y"],["5y","1mo","5Y"]].forEach(([r, i, l]) => {
      const o = document.createElement("option");
      o.value = r + "|" + i; o.textContent = l;
      if (r === widget.config.range) o.selected = true;
      rangeSel.appendChild(o);
    });
    inputBar.appendChild(tickerWrap);
    inputBar.appendChild(rangeSel);
    body.appendChild(meta);
    body.appendChild(inputBar);
    const chartHost = document.createElement("div");
    chartHost.className = "hw-chart-canvas";
    chartHost.style.cssText = "flex:1;min-height:60px;position:relative;";
    body.style.display = "flex";
    body.style.flexDirection = "column";
    body.appendChild(chartHost);

    let chart = null;
    let series = null;
    let hwSuggestDebounce = null;
    let hwSuggestAbort = null;

    function hideSuggestions() {
      suggestionsEl.innerHTML = "";
      suggestionsEl.classList.add("hidden");
    }

    function applySymbol(symbol, name) {
      widget.config.symbol = symbol;
      tickerInp.value = symbol;
      // Use the friendly name as the widget title
      const displayName = name || symbol;
      widget.title = displayName;
      widget.config.displayName = displayName;
      const titleEl = ref.el.querySelector(".hub-widget-title");
      if (titleEl) titleEl.value = displayName;
      hideSuggestions();
      saveHubState();
      fetchAndDraw();
    }

    function showSuggestions(items) {
      if (!items.length) { hideSuggestions(); return; }
      suggestionsEl.innerHTML = items.map(item => `
        <button type="button" data-symbol="${item.symbol}" data-name="${item.name.replace(/"/g,'&quot;')}"
          style="width:100%;display:flex;align-items:center;gap:8px;text-align:left;padding:6px 10px;border-radius:8px;background:transparent;border:none;color:inherit;cursor:pointer;font-size:11px;">
          <div style="flex:0 0 auto;width:24px;height:24px;border-radius:50%;background:rgba(111,134,255,0.2);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#6f86ff;">${item.symbol.slice(0,2)}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;color:#fff;">${item.symbol}</div>
            <div style="color:#9aa3b8;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</div>
          </div>
          <div style="color:#6f86ff;font-size:10px;flex-shrink:0;">${item.exchange}</div>
        </button>`).join("");
      suggestionsEl.classList.remove("hidden");
      suggestionsEl.querySelectorAll("button[data-symbol]").forEach(btn => {
        btn.addEventListener("mousedown", e => {
          e.preventDefault();
          applySymbol(btn.dataset.symbol, btn.dataset.name);
        });
        btn.addEventListener("mouseover", () => { btn.style.background = "rgba(111,134,255,0.1)"; });
        btn.addEventListener("mouseout", () => { btn.style.background = "transparent"; });
      });
    }

    tickerInp.addEventListener("mousedown", e => e.stopPropagation());
    tickerInp.addEventListener("input", () => {
      const q = tickerInp.value.trim();
      if (hwSuggestDebounce) clearTimeout(hwSuggestDebounce);
      if (!q) { hideSuggestions(); return; }
      hwSuggestDebounce = setTimeout(async () => {
        try {
          if (hwSuggestAbort) hwSuggestAbort.abort();
          hwSuggestAbort = new AbortController();
          const res = await fetch(getYahooSearchUrl(q), { signal: hwSuggestAbort.signal });
          if (!res.ok) return;
          const payload = await res.json();
          const items = (payload.quotes || [])
            .filter(qt => qt.symbol && qt.isYahooFinance)
            .slice(0, 6)
            .map(qt => ({ symbol: qt.symbol, name: qt.longname || qt.shortname || qt.symbol, exchange: qt.exchDisp || qt.exchange || "" }));
          showSuggestions(items);
        } catch (err) { if (err.name !== "AbortError") hideSuggestions(); }
      }, 280);
    });
    tickerInp.addEventListener("blur", () => { setTimeout(hideSuggestions, 150); });
    tickerInp.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        const sym = tickerInp.value.trim().toUpperCase() || "AAPL";
        applySymbol(sym, null);
      }
      if (e.key === "Escape") hideSuggestions();
    });

    function makeChart() {
      if (chart) try { chart.remove(); } catch {}
      const w = chartHost.clientWidth || widget.w - 4;
      const h = chartHost.clientHeight || 100;
      if (!window.LightweightCharts || w < 20 || h < 20) return;
      chart = LightweightCharts.createChart(chartHost, {
        width: w, height: h,
        layout: { background: { color: "transparent" }, textColor: "#9aa3b8", fontSize: 10 },
        grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
        timeScale: { borderColor: "rgba(255,255,255,0.08)", timeVisible: false },
        crosshair: { mode: 0 },
        handleScroll: false, handleScale: false,
      });
      series = chart.addAreaSeries({
        lineColor: "#6f86ff", topColor: "rgba(111,134,255,0.4)", bottomColor: "rgba(111,134,255,0.0)",
        lineWidth: 2,
      });
    }

    async function fetchAndDraw() {
      try {
        const res = await fetch(`${API_BASE_URL}/chart/${encodeURIComponent(widget.config.symbol)}?range=${widget.config.range}&interval=${widget.config.interval}`);
        const j = await res.json();
        const r = j.chart && j.chart.result && j.chart.result[0];
        if (!r) throw new Error("Sin datos");
        const ts = r.timestamp || [];
        const closes = (r.indicators && r.indicators.quote && r.indicators.quote[0] && r.indicators.quote[0].close) || [];
        const data = [];
        for (let k = 0; k < ts.length; k++) {
          if (closes[k] != null) data.push({ time: ts[k], value: closes[k] });
        }
        if (!chart) makeChart();
        if (!chart) return;
        series.setData(data);
        chart.timeScale().fitContent();
        const last = data[data.length - 1];
        const first = data[0];
        if (last && first) {
          const ch = ((last.value - first.value) / first.value) * 100;
          const cls = ch >= 0 ? "up" : "down";
          meta.innerHTML = `<span class="hw-chart-price">${last.value.toFixed(2)}</span><span class="hw-chart-change ${cls}">${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%</span>`;
        }
      } catch (err) {
        meta.innerHTML = `<span style="color:#f87171;font-size:11px;">Error: ${err.message}</span>`;
      }
    }

    rangeSel.addEventListener("change", () => {
      const [r, i] = rangeSel.value.split("|");
      widget.config.range = r; widget.config.interval = i;
      saveHubState();
      fetchAndDraw();
    });

    // Restore display name in title if already stored
    requestAnimationFrame(() => {
      if (widget.config.displayName) {
        const titleEl = ref.el.querySelector(".hub-widget-title");
        if (titleEl && titleEl.value === widget.config.symbol) titleEl.value = widget.config.displayName;
        widget.title = widget.config.displayName;
      }
      makeChart();
      fetchAndDraw();
    });
    ref.refresh = fetchAndDraw;
    ref.onResize = () => {
      if (chart) chart.applyOptions({ width: chartHost.clientWidth, height: chartHost.clientHeight });
    };
    const interval = setInterval(fetchAndDraw, 60000);
    ref.cleanup = () => {
      clearInterval(interval);
      if (hwSuggestDebounce) clearTimeout(hwSuggestDebounce);
      if (hwSuggestAbort) hwSuggestAbort.abort();
      if (chart) try { chart.remove(); } catch {}
    };
  }

  // Watchlist widget
  function renderWatchlistWidget(widget, body, ref) {
    // Init column config for existing widgets that were saved without it
    if (!widget.config.columns) {
      widget.config.columns = { ytd: false, mktcap: false };
    }

    // ── Toolbar: input + add + config ─────────────────────────────────
    const toolbar = document.createElement("div");
    toolbar.className = "hw-watchlist-toolbar";

    const inp = document.createElement("input");
    inp.placeholder = "Agregar ticker (ej. TSLA)";
    inp.maxLength = 12;

    const addBtn = document.createElement("button");
    addBtn.type = "button"; addBtn.textContent = "+";
    addBtn.className = "hw-wl-add-btn";

    const cfgBtn = document.createElement("button");
    cfgBtn.type = "button"; cfgBtn.className = "hw-wl-cfg-btn";
    cfgBtn.title = "Configurar columnas";
    cfgBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

    toolbar.appendChild(inp);
    toolbar.appendChild(addBtn);
    toolbar.appendChild(cfgBtn);
    body.appendChild(toolbar);

    // ── Inline config section (toggles on gear click) ──────────────────
    const cfgSection = document.createElement("div");
    cfgSection.className = "hw-wl-cfg-section hidden";
    cfgSection.innerHTML = `
      <div class="hw-wl-cfg-title">Columnas visibles</div>
      <label class="hw-wl-cfg-row hw-wl-cfg-disabled">
        <span style="font-size:10px;color:#6f86ff">✓</span><span>Precio</span>
        <span class="hw-wl-cfg-lock">siempre</span>
      </label>
      <label class="hw-wl-cfg-row hw-wl-cfg-disabled">
        <span style="font-size:10px;color:#6f86ff">✓</span><span>Cambio diario</span>
        <span class="hw-wl-cfg-lock">siempre</span>
      </label>
      <label class="hw-wl-cfg-row">
        <input type="checkbox" data-col="ytd" ${widget.config.columns.ytd ? "checked" : ""}>
        <span>YTD Return</span>
      </label>
      <label class="hw-wl-cfg-row">
        <input type="checkbox" data-col="mktcap" ${widget.config.columns.mktcap ? "checked" : ""}>
        <span>Market Cap</span>
      </label>`;
    cfgSection.addEventListener("mousedown", e => e.stopPropagation());
    body.appendChild(cfgSection);

    cfgBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      cfgSection.classList.toggle("hidden");
    });

    cfgSection.querySelector('[data-col="ytd"]').addEventListener("change", (e) => {
      widget.config.columns.ytd = e.target.checked;
      saveHubState();
      if (e.target.checked) fetchOptional(); else render();
    });
    cfgSection.querySelector('[data-col="mktcap"]').addEventListener("change", (e) => {
      widget.config.columns.mktcap = e.target.checked;
      saveHubState();
      if (e.target.checked) fetchOptional(); else render();
    });

    // ── List container ─────────────────────────────────────────────────
    const list = document.createElement("div");
    list.className = "hw-watchlist";
    body.appendChild(list);

    // ── Helpers ────────────────────────────────────────────────────────
    const PALETTE = [
      ["rgba(111,134,255,0.8)", "rgba(111,134,255,0.45)"],
      ["rgba(159,122,234,0.8)", "rgba(159,122,234,0.45)"],
      ["rgba(0,186,136,0.8)",   "rgba(0,186,136,0.45)"],
      ["rgba(245,158,11,0.8)",  "rgba(245,158,11,0.45)"],
      ["rgba(239,68,68,0.75)",  "rgba(239,68,68,0.4)"],
      ["rgba(14,165,233,0.8)",  "rgba(14,165,233,0.45)"],
    ];
    function tickerBg(sym) {
      const h = sym.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      return PALETTE[h % PALETTE.length];
    }
    const INDEX_FLAGS = {
      '^GSPC':'us','^SPX':'us','^DJI':'us','^IXIC':'us','^NDX':'us','^RUT':'us','^VIX':'us','^TNX':'us','^TYX':'us',
      '^MXX':'mx','^IPC':'mx',
      '^FTSE':'gb',
      '^DAX':'de',
      '^FCHI':'fr',
      '^IBEX':'es','^IBEX35':'es',
      '^AEX':'nl',
      '^N225':'jp',
      '^HSI':'hk',
      '^SSEC':'cn','^SSE':'cn',
      '^BVSP':'br',
      '^MERV':'ar',
      '^IPSA':'cl',
      '^KS11':'kr','^KOSPI':'kr',
      '^STI':'sg',
      '^TWII':'tw',
      '^NSEI':'in','^BSESN':'in',
      '^AXJO':'au','^AORD':'au',
      '^NZ50':'nz',
      '^FTMIB':'it',
      '^ATX':'at',
      '^OMXS30':'se',
      '^OSEBX':'no',
      '^OMXC25':'dk',
      '^OMXH25':'fi','^HEX':'fi',
      '^SMI':'ch',
      '^JSE':'za','^J203':'za',
      '^SET':'th',
      '^JKSE':'id',
      '^KLSE':'my',
      '^PSI20':'pt',
      '^BEL20':'be',
      '^XU100':'tr',
      '^TA125':'il',
      '^CASE30':'eg',
    };
    function buildLogoHtml(sym, bg, border, initials) {
      const esc = initials.replace(/'/g, "\\'");
      const bgEsc = bg.replace(/'/g, "\\'");
      if (sym.startsWith('^')) {
        const cc = INDEX_FLAGS[sym];
        if (cc) {
          return `<div class="hw-wl-logo hw-wl-logo--flag" style="border-color:${border}">` +
            `<img src="https://flagcdn.com/w40/${cc}.png" alt="" ` +
            `onerror="this.parentElement.className='hw-wl-logo';this.parentElement.style.background='${bgEsc}';this.parentElement.style.borderColor='${border}';this.parentElement.textContent='${esc}'">` +
            `</div>`;
        }
      } else {
        return `<div class="hw-wl-logo hw-wl-logo--img" style="border-color:${border}">` +
          `<img src="https://assets.parqet.com/logos/symbol/${sym}?format=png" alt="" ` +
          `onerror="this.parentElement.className='hw-wl-logo';this.parentElement.style.background='${bgEsc}';this.parentElement.style.borderColor='${border}';this.parentElement.style.padding='';this.parentElement.textContent='${esc}'">` +
          `</div>`;
      }
      return `<div class="hw-wl-logo" style="background:${bg};border-color:${border}">${initials}</div>`;
    }
    function fmtPrice(p) {
      if (p == null) return "—";
      return p >= 1000 ? p.toFixed(0) : p >= 10 ? p.toFixed(2) : p.toFixed(3);
    }
    function fmtMktCap(v) {
      if (!v || v <= 0) return "—";
      if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
      if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
      if (v >= 1e6)  return `$${(v / 1e6).toFixed(1)}M`;
      return `$${Math.round(v).toLocaleString()}`;
    }

    // ── Symbol add logic ───────────────────────────────────────────────
    function addSym() {
      const s = inp.value.trim().toUpperCase();
      if (!s) return;
      if (!widget.config.symbols.includes(s)) {
        widget.config.symbols.push(s);
        saveHubState();
        fetchPrices();
      }
      inp.value = "";
    }
    addBtn.addEventListener("click", addSym);
    inp.addEventListener("keydown", e => { if (e.key === "Enter") addSym(); });
    inp.addEventListener("mousedown", e => e.stopPropagation());

    // ── Cache & data fetching ──────────────────────────────────────────
    let cache = {}; // sym → { price, prev, name, ytdReturn, ytdFetched, mktcap, mktcapFetched }

    async function fetchPrices() {
      const syms = widget.config.symbols;
      if (!syms.length) { render(); return; }
      await Promise.all(syms.map(async sym => {
        try {
          const r = await fetch(`${API_BASE_URL}/chart/${encodeURIComponent(sym)}?range=5d&interval=1d`);
          const j = await r.json();
          const result = j.chart?.result?.[0];
          if (!result) return;
          const closes = (result.indicators?.quote?.[0]?.close || []).filter(v => v != null);
          if (!cache[sym]) cache[sym] = {};
          if (!cache[sym].name) cache[sym].name = result.meta?.shortName || null;
          if (closes.length >= 2) {
            cache[sym].price = closes[closes.length - 1];
            cache[sym].prev  = closes[closes.length - 2];
          } else if (closes.length === 1) {
            cache[sym].price = closes[0];
            cache[sym].prev  = closes[0];
          }
        } catch {}
      }));
      await fetchOptional();
    }

    async function fetchOptional() {
      const syms = widget.config.symbols;
      const cols = widget.config.columns;
      const tasks = [];

      if (cols.ytd) {
        tasks.push(...syms.map(async sym => {
          if (cache[sym]?.ytdFetched) return;
          try {
            const r = await fetch(`${API_BASE_URL}/chart/${encodeURIComponent(sym)}?range=ytd&interval=1mo`);
            const j = await r.json();
            const result = j.chart?.result?.[0];
            if (!result) return;
            const closes = (result.indicators?.quote?.[0]?.close || []).filter(v => v != null);
            if (!cache[sym]) cache[sym] = {};
            if (closes.length >= 2) {
              cache[sym].ytdReturn = ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;
            }
            cache[sym].ytdFetched = true;
          } catch {}
        }));
      }

      if (cols.mktcap) {
        tasks.push(...syms.map(async sym => {
          if (cache[sym]?.mktcapFetched) return;
          try {
            const r = await fetch(`${API_BASE_URL}/info/${encodeURIComponent(sym)}`);
            const j = await r.json();
            if (!cache[sym]) cache[sym] = {};
            cache[sym].mktcap = j.marketCap || null;
            if (!cache[sym].name) cache[sym].name = j.shortName || j.longName || null;
            cache[sym].mktcapFetched = true;
          } catch {}
        }));
      }

      await Promise.all(tasks);
      render();
    }

    // ── Render ─────────────────────────────────────────────────────────
    function render() {
      list.innerHTML = "";
      if (!widget.config.symbols.length) {
        list.innerHTML = `<div class="hw-wl-empty">Sin tickers. Agrega uno arriba.</div>`;
        return;
      }
      const cols = widget.config.columns;
      widget.config.symbols.forEach(sym => {
        const row = document.createElement("div");
        row.className = "hw-watchlist-row";

        const c = cache[sym] || {};
        const priceStr = fmtPrice(c.price);
        let chgPct = null;
        if (c.price != null && c.prev != null && c.prev > 0) {
          chgPct = ((c.price - c.prev) / c.prev) * 100;
        }
        const chgStr = chgPct != null ? (chgPct >= 0 ? "+" : "") + chgPct.toFixed(2) + "%" : "—";
        const chgCls = chgPct == null ? "neutral" : chgPct >= 0 ? "positive" : "negative";

        const [bg, border] = tickerBg(sym);
        const initials = sym.replace(/[^A-Z]/g, "").slice(0, 2) || sym.slice(0, 2).toUpperCase();

        let html = buildLogoHtml(sym, bg, border, initials) + `
          <div class="hw-wl-info">
            <span class="hw-wl-sym">${sym}</span>
            ${c.name ? `<span class="hw-wl-name">${c.name}</span>` : ""}
          </div>`;

        if (cols.ytd) {
          const ytdCls = c.ytdReturn == null ? "neutral" : c.ytdReturn >= 0 ? "positive" : "negative";
          const ytdStr = c.ytdReturn != null
            ? "YTD " + (c.ytdReturn >= 0 ? "+" : "") + c.ytdReturn.toFixed(1) + "%"
            : "YTD —";
          html += `<span class="hw-wl-badge ${ytdCls}">${ytdStr}</span>`;
        }

        if (cols.mktcap) {
          html += `<div class="hw-wl-col">
            <span class="hw-wl-mktcap-val">${fmtMktCap(c.mktcap)}</span>
            <span class="hw-wl-col-label">Cap</span>
          </div>`;
        }

        html += `<div class="hw-wl-col">
          <span class="hw-wl-price-val">${priceStr}</span>
          <span class="hw-wl-col-label">Precio</span>
        </div>
        <span class="hw-wl-badge ${chgCls}">${chgStr}</span>`;

        row.innerHTML = html;

        const del = document.createElement("button");
        del.className = "hw-wl-del"; del.type = "button"; del.innerHTML = "×";
        del.addEventListener("click", () => {
          widget.config.symbols = widget.config.symbols.filter(s => s !== sym);
          delete cache[sym];
          saveHubState();
          render();
        });
        row.appendChild(del);
        list.appendChild(row);
      });
    }

    render();
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    ref.refresh = fetchPrices;
    ref.cleanup = () => clearInterval(interval);
  }

  // Calendar widget
  function renderCalendarWidget(widget, body, ref) {
    body.classList.remove("no-padding");
    body.style.padding = "10px 12px";
    const tabBar = document.createElement("div");
    tabBar.className = "hw-cal-tab-bar";
    const tEarn = document.createElement("button");
    tEarn.className = "hw-cal-tab" + (widget.config.tab === "earnings" ? " active" : "");
    tEarn.type = "button"; tEarn.textContent = "Earnings";
    const tEcon = document.createElement("button");
    tEcon.className = "hw-cal-tab" + (widget.config.tab === "economic" ? " active" : "");
    tEcon.type = "button"; tEcon.textContent = "Economía";
    tabBar.appendChild(tEarn); tabBar.appendChild(tEcon);
    body.appendChild(tabBar);

    const list = document.createElement("div");
    list.className = "hw-calendar-list";
    body.appendChild(list);

    let data = { earnings: [], economic: [] };

    async function fetchData() {
      try {
        // Pull symbols from any watchlist widgets in this space
        const sp = activeSpace();
        const syms = new Set();
        sp.widgets.forEach(w => {
          if (w.type === "watchlist" && Array.isArray(w.config.symbols)) {
            w.config.symbols.forEach(s => syms.add(s));
          }
          if (w.type === "chart" && w.config.symbol) syms.add(w.config.symbol);
        });
        const q = syms.size ? `?symbols=${[...syms].join(",")}` : "";
        const r = await fetch(`${API_BASE_URL}/calendar${q}`);
        data = await r.json();
        render();
      } catch (err) {
        list.innerHTML = `<div style="opacity:0.5;padding:8px;font-size:11px;">Error cargando eventos: ${err.message}</div>`;
      }
    }

    function fmtDate(iso) {
      const [y, m, d] = iso.split("-");
      const months = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
      return `<div>${d}</div><div style="opacity:0.7;font-size:9px;">${months[parseInt(m,10)-1]}</div>`;
    }

    function render() {
      list.innerHTML = "";
      const items = widget.config.tab === "earnings" ? data.earnings : data.economic;
      if (!items || !items.length) {
        list.innerHTML = `<div style="opacity:0.5;padding:8px;text-align:center;font-size:11px;">Sin eventos próximos.</div>`;
        return;
      }
      items.slice(0, 30).forEach(ev => {
        const row = document.createElement("div");
        row.className = "hw-calendar-row";
        const imp = ev.importance || "medium";
        const sub = ev.symbol ? ev.symbol : (ev.country || "");
        row.innerHTML = `
          <div class="hw-cal-date">${fmtDate(ev.date)}</div>
          <div><div class="hw-cal-title">${ev.title}</div><div class="hw-cal-cat">${ev.category || ""} ${sub ? "· " + sub : ""}</div></div>
          <div class="hw-cal-badge ${imp}">${imp === "high" ? "Alta" : imp === "medium" ? "Media" : "Baja"}</div>
        `;
        list.appendChild(row);
      });
    }

    tEarn.addEventListener("click", () => {
      widget.config.tab = "earnings";
      tEarn.classList.add("active"); tEcon.classList.remove("active");
      saveHubState(); render();
    });
    tEcon.addEventListener("click", () => {
      widget.config.tab = "economic";
      tEcon.classList.add("active"); tEarn.classList.remove("active");
      saveHubState(); render();
    });

    fetchData();
    // Poll every 10 minutes
    const interval = setInterval(fetchData, 600000);
    ref.refresh = fetchData;
    ref.cleanup = () => clearInterval(interval);
  }

  // Note widget
  function renderNoteWidget(widget, body, ref) {
    const ta = document.createElement("textarea");
    ta.className = "hw-note-textarea";
    ta.value = widget.config.text || "";
    ta.addEventListener("input", () => {
      widget.config.text = ta.value;
      saveHubState();
    });
    ta.addEventListener("mousedown", e => e.stopPropagation());
    body.appendChild(ta);
  }

  // Heatmap widget – native canvas treemap, multi-index, zoom+pan
  function renderHeatmapWidget(widget, body, ref) {
    const INDICES = {
      SP500: { label: "S&P 500", cur: "$", stocks: [
        // ── Tecnología ────────────────────────────────────────────────
        { s:"AAPL",  d:"AAPL",  n:"Apple",                sec:"Tecnología",     w:7.5 },
        { s:"NVDA",  d:"NVDA",  n:"NVIDIA",               sec:"Tecnología",     w:6.2 },
        { s:"MSFT",  d:"MSFT",  n:"Microsoft",            sec:"Tecnología",     w:6.0 },
        { s:"AVGO",  d:"AVGO",  n:"Broadcom",             sec:"Tecnología",     w:1.4 },
        { s:"ORCL",  d:"ORCL",  n:"Oracle",               sec:"Tecnología",     w:0.8 },
        { s:"NOW",   d:"NOW",   n:"ServiceNow",           sec:"Tecnología",     w:0.5 },
        { s:"ACN",   d:"ACN",   n:"Accenture",            sec:"Tecnología",     w:0.5 },
        { s:"AMD",   d:"AMD",   n:"AMD",                  sec:"Tecnología",     w:0.5 },
        { s:"CRM",   d:"CRM",   n:"Salesforce",           sec:"Tecnología",     w:0.5 },
        { s:"IBM",   d:"IBM",   n:"IBM",                  sec:"Tecnología",     w:0.45 },
        { s:"INTU",  d:"INTU",  n:"Intuit",               sec:"Tecnología",     w:0.42 },
        { s:"QCOM",  d:"QCOM",  n:"Qualcomm",             sec:"Tecnología",     w:0.40 },
        { s:"TXN",   d:"TXN",   n:"Texas Instruments",    sec:"Tecnología",     w:0.38 },
        { s:"AMAT",  d:"AMAT",  n:"Applied Materials",    sec:"Tecnología",     w:0.37 },
        { s:"PANW",  d:"PANW",  n:"Palo Alto Networks",   sec:"Tecnología",     w:0.36 },
        { s:"ANET",  d:"ANET",  n:"Arista Networks",      sec:"Tecnología",     w:0.28 },
        { s:"CSCO",  d:"CSCO",  n:"Cisco",                sec:"Tecnología",     w:0.35 },
        { s:"LRCX",  d:"LRCX",  n:"Lam Research",         sec:"Tecnología",     w:0.34 },
        { s:"KLAC",  d:"KLAC",  n:"KLA Corp",             sec:"Tecnología",     w:0.33 },
        { s:"MU",    d:"MU",    n:"Micron Technology",    sec:"Tecnología",     w:0.32 },
        { s:"ADI",   d:"ADI",   n:"Analog Devices",       sec:"Tecnología",     w:0.30 },
        { s:"SNPS",  d:"SNPS",  n:"Synopsys",             sec:"Tecnología",     w:0.28 },
        { s:"CDNS",  d:"CDNS",  n:"Cadence Design",       sec:"Tecnología",     w:0.27 },
        { s:"CRWD",  d:"CRWD",  n:"CrowdStrike",          sec:"Tecnología",     w:0.22 },
        { s:"MSI",   d:"MSI",   n:"Motorola Solutions",   sec:"Tecnología",     w:0.18 },
        { s:"INTC",  d:"INTC",  n:"Intel",                sec:"Tecnología",     w:0.17 },
        { s:"FTNT",  d:"FTNT",  n:"Fortinet",             sec:"Tecnología",     w:0.16 },
        { s:"ADSK",  d:"ADSK",  n:"Autodesk",             sec:"Tecnología",     w:0.14 },
        { s:"ON",    d:"ON",    n:"ON Semiconductor",     sec:"Tecnología",     w:0.14 },
        { s:"KEYS",  d:"KEYS",  n:"Keysight",             sec:"Tecnología",     w:0.14 },
        { s:"CTSH",  d:"CTSH",  n:"Cognizant",            sec:"Tecnología",     w:0.13 },
        { s:"MPWR",  d:"MPWR",  n:"Monolithic Power",     sec:"Tecnología",     w:0.12 },
        { s:"HPQ",   d:"HPQ",   n:"HP Inc.",              sec:"Tecnología",     w:0.12 },
        { s:"HPE",   d:"HPE",   n:"HP Enterprise",        sec:"Tecnología",     w:0.12 },
        { s:"WDC",   d:"WDC",   n:"Western Digital",      sec:"Tecnología",     w:0.11 },
        { s:"NTAP",  d:"NTAP",  n:"NetApp",               sec:"Tecnología",     w:0.11 },
        { s:"ZBRA",  d:"ZBRA",  n:"Zebra Technologies",   sec:"Tecnología",     w:0.10 },
        { s:"TER",   d:"TER",   n:"Teradyne",             sec:"Tecnología",     w:0.10 },
        { s:"FSLR",  d:"FSLR",  n:"First Solar",          sec:"Tecnología",     w:0.09 },
        { s:"ENPH",  d:"ENPH",  n:"Enphase Energy",       sec:"Tecnología",     w:0.08 },
        { s:"CDW",   d:"CDW",   n:"CDW Corp",             sec:"Tecnología",     w:0.08 },
        { s:"LDOS",  d:"LDOS",  n:"Leidos Holdings",      sec:"Tecnología",     w:0.08 },
        { s:"TRMB",  d:"TRMB",  n:"Trimble",              sec:"Tecnología",     w:0.08 },
        { s:"PAYX",  d:"PAYX",  n:"Paychex",              sec:"Tecnología",     w:0.08 },
        { s:"BR",    d:"BR",    n:"Broadridge Financial",  sec:"Tecnología",     w:0.08 },
        { s:"AKAM",  d:"AKAM",  n:"Akamai",               sec:"Tecnología",     w:0.08 },
        { s:"VRSN",  d:"VRSN",  n:"VeriSign",             sec:"Tecnología",     w:0.08 },
        { s:"JNPR",  d:"JNPR",  n:"Juniper Networks",     sec:"Tecnología",     w:0.07 },
        { s:"FFIV",  d:"FFIV",  n:"F5 Inc.",              sec:"Tecnología",     w:0.07 },
        { s:"PTC",   d:"PTC",   n:"PTC Inc.",             sec:"Tecnología",     w:0.07 },
        { s:"TYL",   d:"TYL",   n:"Tyler Technologies",   sec:"Tecnología",     w:0.07 },
        { s:"ANSS",  d:"ANSS",  n:"ANSYS",                sec:"Tecnología",     w:0.07 },
        { s:"EPAM",  d:"EPAM",  n:"EPAM Systems",         sec:"Tecnología",     w:0.07 },
        { s:"FI",    d:"FI",    n:"Fiserv",               sec:"Tecnología",     w:0.22 },
        { s:"GDDY",  d:"GDDY",  n:"GoDaddy",              sec:"Tecnología",     w:0.07 },
        { s:"PAYC",  d:"PAYC",  n:"Paycom Software",      sec:"Tecnología",     w:0.07 },
        { s:"GEN",   d:"GEN",   n:"Gen Digital",          sec:"Tecnología",     w:0.06 },
        { s:"SWKS",  d:"SWKS",  n:"Skyworks Solutions",   sec:"Tecnología",     w:0.10 },
        // ── Comunicación ─────────────────────────────────────────────
        { s:"META",  d:"META",  n:"Meta Platforms",       sec:"Comunicación",   w:2.9 },
        { s:"GOOGL", d:"GOOGL", n:"Alphabet A",           sec:"Comunicación",   w:2.1 },
        { s:"GOOG",  d:"GOOG",  n:"Alphabet C",           sec:"Comunicación",   w:1.8 },
        { s:"NFLX",  d:"NFLX",  n:"Netflix",              sec:"Comunicación",   w:0.68 },
        { s:"CMCSA", d:"CMCSA", n:"Comcast",              sec:"Comunicación",   w:0.35 },
        { s:"T",     d:"T",     n:"AT&T",                 sec:"Comunicación",   w:0.42 },
        { s:"VZ",    d:"VZ",    n:"Verizon",              sec:"Comunicación",   w:0.12 },
        { s:"TMUS",  d:"TMUS",  n:"T-Mobile US",          sec:"Comunicación",   w:0.12 },
        { s:"DIS",   d:"DIS",   n:"Walt Disney",          sec:"Comunicación",   w:0.24 },
        { s:"CHTR",  d:"CHTR",  n:"Charter Comm.",        sec:"Comunicación",   w:0.16 },
        { s:"EA",    d:"EA",    n:"Electronic Arts",      sec:"Comunicación",   w:0.14 },
        { s:"TTWO",  d:"TTWO",  n:"Take-Two Interactive", sec:"Comunicación",   w:0.10 },
        { s:"LYV",   d:"LYV",   n:"Live Nation",          sec:"Comunicación",   w:0.10 },
        { s:"OMC",   d:"OMC",   n:"Omnicom",              sec:"Comunicación",   w:0.09 },
        { s:"IPG",   d:"IPG",   n:"Interpublic",          sec:"Comunicación",   w:0.09 },
        { s:"MTCH",  d:"MTCH",  n:"Match Group",          sec:"Comunicación",   w:0.09 },
        { s:"FOXA",  d:"FOXA",  n:"Fox Corp A",           sec:"Comunicación",   w:0.08 },
        { s:"FOX",   d:"FOX",   n:"Fox Corp B",           sec:"Comunicación",   w:0.08 },
        { s:"NWSA",  d:"NWSA",  n:"News Corp A",          sec:"Comunicación",   w:0.08 },
        { s:"WBD",   d:"WBD",   n:"Warner Bros. Discovery",sec:"Comunicación",  w:0.08 },
        // ── Finanzas ─────────────────────────────────────────────────
        { s:"BRK-B", d:"BRK.B", n:"Berkshire Hathaway",   sec:"Finanzas",       w:1.75 },
        { s:"JPM",   d:"JPM",   n:"JPMorgan Chase",       sec:"Finanzas",       w:1.35 },
        { s:"V",     d:"V",     n:"Visa",                 sec:"Finanzas",       w:0.95 },
        { s:"MA",    d:"MA",    n:"Mastercard",           sec:"Finanzas",       w:0.88 },
        { s:"GS",    d:"GS",    n:"Goldman Sachs",        sec:"Finanzas",       w:0.56 },
        { s:"BAC",   d:"BAC",   n:"Bank of America",      sec:"Finanzas",       w:0.55 },
        { s:"SPGI",  d:"SPGI",  n:"S&P Global",           sec:"Finanzas",       w:0.48 },
        { s:"MS",    d:"MS",    n:"Morgan Stanley",       sec:"Finanzas",       w:0.46 },
        { s:"AXP",   d:"AXP",   n:"American Express",     sec:"Finanzas",       w:0.44 },
        { s:"BLK",   d:"BLK",   n:"BlackRock",            sec:"Finanzas",       w:0.42 },
        { s:"WFC",   d:"WFC",   n:"Wells Fargo",          sec:"Finanzas",       w:0.40 },
        { s:"CB",    d:"CB",    n:"Chubb",                sec:"Finanzas",       w:0.34 },
        { s:"AON",   d:"AON",   n:"Aon",                  sec:"Finanzas",       w:0.32 },
        { s:"MMC",   d:"MMC",   n:"Marsh McLennan",       sec:"Finanzas",       w:0.30 },
        { s:"ICE",   d:"ICE",   n:"Intercontinental Exch",sec:"Finanzas",       w:0.30 },
        { s:"SCHW",  d:"SCHW",  n:"Charles Schwab",       sec:"Finanzas",       w:0.30 },
        { s:"CME",   d:"CME",   n:"CME Group",            sec:"Finanzas",       w:0.29 },
        { s:"MCO",   d:"MCO",   n:"Moody's",              sec:"Finanzas",       w:0.26 },
        { s:"PNC",   d:"PNC",   n:"PNC Financial",        sec:"Finanzas",       w:0.26 },
        { s:"USB",   d:"USB",   n:"U.S. Bancorp",         sec:"Finanzas",       w:0.25 },
        { s:"COF",   d:"COF",   n:"Capital One",          sec:"Finanzas",       w:0.22 },
        { s:"TFC",   d:"TFC",   n:"Truist Financial",     sec:"Finanzas",       w:0.20 },
        { s:"AJG",   d:"AJG",   n:"Arthur J. Gallagher",  sec:"Finanzas",       w:0.20 },
        { s:"BK",    d:"BK",    n:"BNY Mellon",           sec:"Finanzas",       w:0.17 },
        { s:"AFL",   d:"AFL",   n:"Aflac",                sec:"Finanzas",       w:0.17 },
        { s:"AMP",   d:"AMP",   n:"Ameriprise Financial", sec:"Finanzas",       w:0.16 },
        { s:"ALL",   d:"ALL",   n:"Allstate",             sec:"Finanzas",       w:0.16 },
        { s:"AIG",   d:"AIG",   n:"American Intl Group",  sec:"Finanzas",       w:0.16 },
        { s:"STT",   d:"STT",   n:"State Street",         sec:"Finanzas",       w:0.14 },
        { s:"HIG",   d:"HIG",   n:"Hartford Financial",   sec:"Finanzas",       w:0.14 },
        { s:"TROW",  d:"TROW",  n:"T. Rowe Price",        sec:"Finanzas",       w:0.13 },
        { s:"PRU",   d:"PRU",   n:"Prudential Financial", sec:"Finanzas",       w:0.12 },
        { s:"MET",   d:"MET",   n:"MetLife",              sec:"Finanzas",       w:0.12 },
        { s:"WTW",   d:"WTW",   n:"Willis Towers Watson", sec:"Finanzas",       w:0.10 },
        { s:"NDAQ",  d:"NDAQ",  n:"Nasdaq Inc.",          sec:"Finanzas",       w:0.09 },
        { s:"CBOE",  d:"CBOE",  n:"Cboe Global Markets",  sec:"Finanzas",       w:0.09 },
        { s:"RE",    d:"RE",    n:"Everest Re Group",     sec:"Finanzas",       w:0.09 },
        { s:"CINF",  d:"CINF",  n:"Cincinnati Financial", sec:"Finanzas",       w:0.09 },
        { s:"DFS",   d:"DFS",   n:"Discover Financial",   sec:"Finanzas",       w:0.09 },
        { s:"GL",    d:"GL",    n:"Globe Life",           sec:"Finanzas",       w:0.09 },
        { s:"L",     d:"L",     n:"Loews",                sec:"Finanzas",       w:0.09 },
        { s:"PFG",   d:"PFG",   n:"Principal Financial",  sec:"Finanzas",       w:0.08 },
        { s:"MTB",   d:"MTB",   n:"M&T Bank",             sec:"Finanzas",       w:0.08 },
        { s:"RF",    d:"RF",    n:"Regions Financial",    sec:"Finanzas",       w:0.08 },
        { s:"FITB",  d:"FITB",  n:"Fifth Third Bancorp",  sec:"Finanzas",       w:0.08 },
        { s:"HBAN",  d:"HBAN",  n:"Huntington Bancshares",sec:"Finanzas",       w:0.08 },
        { s:"CFG",   d:"CFG",   n:"Citizens Financial",   sec:"Finanzas",       w:0.08 },
        { s:"SYF",   d:"SYF",   n:"Synchrony Financial",  sec:"Finanzas",       w:0.07 },
        { s:"IVZ",   d:"IVZ",   n:"Invesco",              sec:"Finanzas",       w:0.07 },
        { s:"BEN",   d:"BEN",   n:"Franklin Resources",   sec:"Finanzas",       w:0.07 },
        { s:"FDS",   d:"FDS",   n:"FactSet Research",     sec:"Finanzas",       w:0.07 },
        { s:"MKTX",  d:"MKTX",  n:"MarketAxess",          sec:"Finanzas",       w:0.07 },
        { s:"ALLY",  d:"ALLY",  n:"Ally Financial",       sec:"Finanzas",       w:0.07 },
        { s:"KEY",   d:"KEY",   n:"KeyCorp",              sec:"Finanzas",       w:0.07 },
        { s:"CMA",   d:"CMA",   n:"Comerica",             sec:"Finanzas",       w:0.06 },
        { s:"ZION",  d:"ZION",  n:"Zions Bancorporation", sec:"Finanzas",       w:0.06 },
        { s:"UNM",   d:"UNM",   n:"Unum Group",           sec:"Finanzas",       w:0.06 },
        { s:"LNC",   d:"LNC",   n:"Lincoln National",     sec:"Finanzas",       w:0.06 },
        // ── Salud ─────────────────────────────────────────────────────
        { s:"LLY",   d:"LLY",   n:"Eli Lilly",            sec:"Salud",          w:1.20 },
        { s:"UNH",   d:"UNH",   n:"UnitedHealth",         sec:"Salud",          w:0.85 },
        { s:"ABBV",  d:"ABBV",  n:"AbbVie",               sec:"Salud",          w:0.62 },
        { s:"JNJ",   d:"JNJ",   n:"Johnson & Johnson",    sec:"Salud",          w:0.62 },
        { s:"ABT",   d:"ABT",   n:"Abbott Labs",          sec:"Salud",          w:0.55 },
        { s:"MRK",   d:"MRK",   n:"Merck",                sec:"Salud",          w:0.55 },
        { s:"ISRG",  d:"ISRG",  n:"Intuitive Surgical",   sec:"Salud",          w:0.48 },
        { s:"BMY",   d:"BMY",   n:"Bristol-Myers Squibb", sec:"Salud",          w:0.26 },
        { s:"PFE",   d:"PFE",   n:"Pfizer",               sec:"Salud",          w:0.26 },
        { s:"AMGN",  d:"AMGN",  n:"Amgen",                sec:"Salud",          w:0.38 },
        { s:"VRTX",  d:"VRTX",  n:"Vertex Pharma",        sec:"Salud",          w:0.35 },
        { s:"REGN",  d:"REGN",  n:"Regeneron",            sec:"Salud",          w:0.30 },
        { s:"GILD",  d:"GILD",  n:"Gilead Sciences",      sec:"Salud",          w:0.30 },
        { s:"DHR",   d:"DHR",   n:"Danaher",              sec:"Salud",          w:0.35 },
        { s:"BSX",   d:"BSX",   n:"Boston Scientific",    sec:"Salud",          w:0.34 },
        { s:"SYK",   d:"SYK",   n:"Stryker",              sec:"Salud",          w:0.32 },
        { s:"MDT",   d:"MDT",   n:"Medtronic",            sec:"Salud",          w:0.30 },
        { s:"ELV",   d:"ELV",   n:"Elevance Health",      sec:"Salud",          w:0.24 },
        { s:"CI",    d:"CI",    n:"Cigna",                sec:"Salud",          w:0.24 },
        { s:"HCA",   d:"HCA",   n:"HCA Healthcare",       sec:"Salud",          w:0.24 },
        { s:"ZTS",   d:"ZTS",   n:"Zoetis",               sec:"Salud",          w:0.20 },
        { s:"GEHC",  d:"GEHC",  n:"GE HealthCare",        sec:"Salud",          w:0.18 },
        { s:"A",     d:"A",     n:"Agilent Technologies", sec:"Salud",          w:0.16 },
        { s:"IDXX",  d:"IDXX",  n:"IDEXX Laboratories",   sec:"Salud",          w:0.15 },
        { s:"BDX",   d:"BDX",   n:"Becton Dickinson",     sec:"Salud",          w:0.16 },
        { s:"BAX",   d:"BAX",   n:"Baxter",               sec:"Salud",          w:0.15 },
        { s:"ZBH",   d:"ZBH",   n:"Zimmer Biomet",        sec:"Salud",          w:0.14 },
        { s:"EW",    d:"EW",    n:"Edwards Lifesciences", sec:"Salud",          w:0.14 },
        { s:"DXCM",  d:"DXCM",  n:"Dexcom",               sec:"Salud",          w:0.13 },
        { s:"CVS",   d:"CVS",   n:"CVS Health",           sec:"Salud",          w:0.12 },
        { s:"MCK",   d:"MCK",   n:"McKesson",             sec:"Salud",          w:0.12 },
        { s:"IQV",   d:"IQV",   n:"IQVIA Holdings",       sec:"Salud",          w:0.12 },
        { s:"BIIB",  d:"BIIB",  n:"Biogen",               sec:"Salud",          w:0.12 },
        { s:"ABC",   d:"ABC",   n:"AmerisourceBergen",    sec:"Salud",          w:0.11 },
        { s:"CAH",   d:"CAH",   n:"Cardinal Health",      sec:"Salud",          w:0.11 },
        { s:"HOLX",  d:"HOLX",  n:"Hologic",              sec:"Salud",          w:0.11 },
        { s:"RMD",   d:"RMD",   n:"ResMed",               sec:"Salud",          w:0.10 },
        { s:"STE",   d:"STE",   n:"STERIS",               sec:"Salud",          w:0.10 },
        { s:"DGX",   d:"DGX",   n:"Quest Diagnostics",    sec:"Salud",          w:0.10 },
        { s:"LH",    d:"LH",    n:"Labcorp",              sec:"Salud",          w:0.10 },
        { s:"MRNA",  d:"MRNA",  n:"Moderna",              sec:"Salud",          w:0.09 },
        { s:"PODD",  d:"PODD",  n:"Insulet Corp",         sec:"Salud",          w:0.09 },
        { s:"INCY",  d:"INCY",  n:"Incyte",               sec:"Salud",          w:0.09 },
        { s:"VTRS",  d:"VTRS",  n:"Viatris",              sec:"Salud",          w:0.08 },
        { s:"TFX",   d:"TFX",   n:"Teleflex",             sec:"Salud",          w:0.08 },
        { s:"ALGN",  d:"ALGN",  n:"Align Technology",     sec:"Salud",          w:0.08 },
        { s:"XRAY",  d:"XRAY",  n:"Dentsply Sirona",      sec:"Salud",          w:0.07 },
        { s:"CTLT",  d:"CTLT",  n:"Catalent",             sec:"Salud",          w:0.07 },
        { s:"TECH",  d:"TECH",  n:"Bio-Techne",           sec:"Salud",          w:0.07 },
        // ── Consumo discrecional ──────────────────────────────────────
        { s:"AMZN",  d:"AMZN",  n:"Amazon",               sec:"Consumo disc.",  w:3.80 },
        { s:"TSLA",  d:"TSLA",  n:"Tesla",                sec:"Consumo disc.",  w:1.62 },
        { s:"HD",    d:"HD",    n:"Home Depot",           sec:"Consumo disc.",  w:0.60 },
        { s:"BKNG",  d:"BKNG",  n:"Booking Holdings",     sec:"Consumo disc.",  w:0.55 },
        { s:"TJX",   d:"TJX",   n:"TJX Companies",        sec:"Consumo disc.",  w:0.36 },
        { s:"LOW",   d:"LOW",   n:"Lowe's",               sec:"Consumo disc.",  w:0.28 },
        { s:"MCD",   d:"MCD",   n:"McDonald's",           sec:"Consumo disc.",  w:0.38 },
        { s:"ROST",  d:"ROST",  n:"Ross Stores",          sec:"Consumo disc.",  w:0.28 },
        { s:"NKE",   d:"NKE",   n:"Nike",                 sec:"Consumo disc.",  w:0.24 },
        { s:"ABNB",  d:"ABNB",  n:"Airbnb",               sec:"Consumo disc.",  w:0.22 },
        { s:"HLT",   d:"HLT",   n:"Hilton Worldwide",     sec:"Consumo disc.",  w:0.22 },
        { s:"MAR",   d:"MAR",   n:"Marriott",             sec:"Consumo disc.",  w:0.22 },
        { s:"CMG",   d:"CMG",   n:"Chipotle",             sec:"Consumo disc.",  w:0.20 },
        { s:"TGT",   d:"TGT",   n:"Target",               sec:"Consumo disc.",  w:0.20 },
        { s:"ORLY",  d:"ORLY",  n:"O'Reilly Auto",        sec:"Consumo disc.",  w:0.20 },
        { s:"AZO",   d:"AZO",   n:"AutoZone",             sec:"Consumo disc.",  w:0.18 },
        { s:"DLTR",  d:"DLTR",  n:"Dollar Tree",          sec:"Consumo disc.",  w:0.14 },
        { s:"YUM",   d:"YUM",   n:"Yum! Brands",          sec:"Consumo disc.",  w:0.14 },
        { s:"EBAY",  d:"EBAY",  n:"eBay",                 sec:"Consumo disc.",  w:0.14 },
        { s:"RCL",   d:"RCL",   n:"Royal Caribbean",      sec:"Consumo disc.",  w:0.14 },
        { s:"CCL",   d:"CCL",   n:"Carnival",             sec:"Consumo disc.",  w:0.13 },
        { s:"GRMN",  d:"GRMN",  n:"Garmin",               sec:"Consumo disc.",  w:0.10 },
        { s:"EXPE",  d:"EXPE",  n:"Expedia",              sec:"Consumo disc.",  w:0.10 },
        { s:"TSCO",  d:"TSCO",  n:"Tractor Supply",       sec:"Consumo disc.",  w:0.10 },
        { s:"BBY",   d:"BBY",   n:"Best Buy",             sec:"Consumo disc.",  w:0.09 },
        { s:"DRI",   d:"DRI",   n:"Darden Restaurants",   sec:"Consumo disc.",  w:0.09 },
        { s:"DHI",   d:"DHI",   n:"D.R. Horton",          sec:"Consumo disc.",  w:0.09 },
        { s:"LEN",   d:"LEN",   n:"Lennar",               sec:"Consumo disc.",  w:0.09 },
        { s:"PHM",   d:"PHM",   n:"PulteGroup",           sec:"Consumo disc.",  w:0.09 },
        { s:"F",     d:"F",     n:"Ford Motor",           sec:"Consumo disc.",  w:0.09 },
        { s:"GM",    d:"GM",    n:"General Motors",       sec:"Consumo disc.",  w:0.09 },
        { s:"NCLH",  d:"NCLH",  n:"Norwegian Cruise",     sec:"Consumo disc.",  w:0.08 },
        { s:"APTV",  d:"APTV",  n:"Aptiv",                sec:"Consumo disc.",  w:0.08 },
        { s:"BWA",   d:"BWA",   n:"BorgWarner",           sec:"Consumo disc.",  w:0.08 },
        { s:"POOL",  d:"POOL",  n:"Pool Corp",            sec:"Consumo disc.",  w:0.08 },
        { s:"ULTA",  d:"ULTA",  n:"Ulta Beauty",          sec:"Consumo disc.",  w:0.08 },
        { s:"NVR",   d:"NVR",   n:"NVR Inc.",             sec:"Consumo disc.",  w:0.08 },
        { s:"TOL",   d:"TOL",   n:"Toll Brothers",        sec:"Consumo disc.",  w:0.08 },
        { s:"ETSY",  d:"ETSY",  n:"Etsy",                 sec:"Consumo disc.",  w:0.08 },
        { s:"RL",    d:"RL",    n:"Ralph Lauren",         sec:"Consumo disc.",  w:0.08 },
        { s:"TPR",   d:"TPR",   n:"Tapestry",             sec:"Consumo disc.",  w:0.08 },
        { s:"PVH",   d:"PVH",   n:"PVH Corp",             sec:"Consumo disc.",  w:0.08 },
        { s:"HAS",   d:"HAS",   n:"Hasbro",               sec:"Consumo disc.",  w:0.08 },
        { s:"WHR",   d:"WHR",   n:"Whirlpool",            sec:"Consumo disc.",  w:0.08 },
        { s:"LKQ",   d:"LKQ",   n:"LKQ Corp",             sec:"Consumo disc.",  w:0.08 },
        { s:"MHK",   d:"MHK",   n:"Mohawk Industries",    sec:"Consumo disc.",  w:0.08 },
        { s:"NWL",   d:"NWL",   n:"Newell Brands",        sec:"Consumo disc.",  w:0.07 },
        { s:"VFC",   d:"VFC",   n:"VF Corporation",       sec:"Consumo disc.",  w:0.07 },
        // ── Bienes básicos ────────────────────────────────────────────
        { s:"WMT",   d:"WMT",   n:"Walmart",              sec:"Bienes básicos", w:0.95 },
        { s:"COST",  d:"COST",  n:"Costco",               sec:"Bienes básicos", w:0.68 },
        { s:"PG",    d:"PG",    n:"Procter & Gamble",     sec:"Bienes básicos", w:0.62 },
        { s:"KO",    d:"KO",    n:"Coca-Cola",            sec:"Bienes básicos", w:0.38 },
        { s:"PEP",   d:"PEP",   n:"PepsiCo",              sec:"Bienes básicos", w:0.38 },
        { s:"MNST",  d:"MNST",  n:"Monster Beverage",     sec:"Bienes básicos", w:0.26 },
        { s:"MO",    d:"MO",    n:"Altria",               sec:"Bienes básicos", w:0.24 },
        { s:"PM",    d:"PM",    n:"Philip Morris",        sec:"Bienes básicos", w:0.20 },
        { s:"MDLZ",  d:"MDLZ",  n:"Mondelez",             sec:"Bienes básicos", w:0.20 },
        { s:"CL",    d:"CL",    n:"Colgate-Palmolive",    sec:"Bienes básicos", w:0.20 },
        { s:"KMB",   d:"KMB",   n:"Kimberly-Clark",       sec:"Bienes básicos", w:0.18 },
        { s:"STZ",   d:"STZ",   n:"Constellation Brands", sec:"Bienes básicos", w:0.18 },
        { s:"KR",    d:"KR",    n:"Kroger",               sec:"Bienes básicos", w:0.16 },
        { s:"WBA",   d:"WBA",   n:"Walgreens",            sec:"Bienes básicos", w:0.14 },
        { s:"HSY",   d:"HSY",   n:"Hershey",              sec:"Bienes básicos", w:0.14 },
        { s:"GIS",   d:"GIS",   n:"General Mills",        sec:"Bienes básicos", w:0.14 },
        { s:"MKC",   d:"MKC",   n:"McCormick",            sec:"Bienes básicos", w:0.11 },
        { s:"ADM",   d:"ADM",   n:"Archer-Daniels-Midland",sec:"Bienes básicos",w:0.10 },
        { s:"TSN",   d:"TSN",   n:"Tyson Foods",          sec:"Bienes básicos", w:0.10 },
        { s:"CAG",   d:"CAG",   n:"Conagra Brands",       sec:"Bienes básicos", w:0.10 },
        { s:"HRL",   d:"HRL",   n:"Hormel Foods",         sec:"Bienes básicos", w:0.10 },
        { s:"SJM",   d:"SJM",   n:"J.M. Smucker",         sec:"Bienes básicos", w:0.10 },
        { s:"CPB",   d:"CPB",   n:"Campbell Soup",        sec:"Bienes básicos", w:0.10 },
        { s:"K",     d:"K",     n:"Kellanova",            sec:"Bienes básicos", w:0.09 },
        { s:"BG",    d:"BG",    n:"Bunge",                sec:"Bienes básicos", w:0.09 },
        { s:"LW",    d:"LW",    n:"Lamb Weston",          sec:"Bienes básicos", w:0.09 },
        // ── Industriales ──────────────────────────────────────────────
        { s:"RTX",   d:"RTX",   n:"RTX Corp",             sec:"Industriales",   w:0.42 },
        { s:"CAT",   d:"CAT",   n:"Caterpillar",          sec:"Industriales",   w:0.40 },
        { s:"HON",   d:"HON",   n:"Honeywell",            sec:"Industriales",   w:0.38 },
        { s:"DE",    d:"DE",    n:"Deere & Co.",          sec:"Industriales",   w:0.36 },
        { s:"ETN",   d:"ETN",   n:"Eaton",                sec:"Industriales",   w:0.28 },
        { s:"TT",    d:"TT",    n:"Trane Technologies",   sec:"Industriales",   w:0.28 },
        { s:"GE",    d:"GE",    n:"GE Aerospace",         sec:"Industriales",   w:0.26 },
        { s:"UPS",   d:"UPS",   n:"United Parcel Service",sec:"Industriales",   w:0.28 },
        { s:"WM",    d:"WM",    n:"Waste Management",     sec:"Industriales",   w:0.26 },
        { s:"NSC",   d:"NSC",   n:"Norfolk Southern",     sec:"Industriales",   w:0.25 },
        { s:"CSX",   d:"CSX",   n:"CSX Corp",             sec:"Industriales",   w:0.24 },
        { s:"PCAR",  d:"PCAR",  n:"PACCAR",               sec:"Industriales",   w:0.24 },
        { s:"MMM",   d:"MMM",   n:"3M",                   sec:"Industriales",   w:0.22 },
        { s:"EMR",   d:"EMR",   n:"Emerson Electric",     sec:"Industriales",   w:0.22 },
        { s:"ITW",   d:"ITW",   n:"Illinois Tool Works",  sec:"Industriales",   w:0.22 },
        { s:"CTAS",  d:"CTAS",  n:"Cintas",               sec:"Industriales",   w:0.22 },
        { s:"PH",    d:"PH",    n:"Parker Hannifin",      sec:"Industriales",   w:0.20 },
        { s:"LMT",   d:"LMT",   n:"Lockheed Martin",      sec:"Industriales",   w:0.14 },
        { s:"NOC",   d:"NOC",   n:"Northrop Grumman",     sec:"Industriales",   w:0.14 },
        { s:"GD",    d:"GD",    n:"General Dynamics",     sec:"Industriales",   w:0.14 },
        { s:"BA",    d:"BA",    n:"Boeing",               sec:"Industriales",   w:0.14 },
        { s:"LHX",   d:"LHX",   n:"L3Harris Technologies",sec:"Industriales",   w:0.14 },
        { s:"GWW",   d:"GWW",   n:"W.W. Grainger",        sec:"Industriales",   w:0.18 },
        { s:"TDG",   d:"TDG",   n:"TransDigm",            sec:"Industriales",   w:0.16 },
        { s:"FDX",   d:"FDX",   n:"FedEx",                sec:"Industriales",   w:0.18 },
        { s:"ODFL",  d:"ODFL",  n:"Old Dominion Freight", sec:"Industriales",   w:0.18 },
        { s:"CARR",  d:"CARR",  n:"Carrier Global",       sec:"Industriales",   w:0.16 },
        { s:"PWR",   d:"PWR",   n:"Quanta Services",      sec:"Industriales",   w:0.15 },
        { s:"WAB",   d:"WAB",   n:"Wabtec",               sec:"Industriales",   w:0.14 },
        { s:"HWM",   d:"HWM",   n:"Howmet Aerospace",     sec:"Industriales",   w:0.14 },
        { s:"IR",    d:"IR",    n:"Ingersoll Rand",       sec:"Industriales",   w:0.14 },
        { s:"AME",   d:"AME",   n:"AMETEK",               sec:"Industriales",   w:0.10 },
        { s:"ROP",   d:"ROP",   n:"Roper Technologies",   sec:"Industriales",   w:0.10 },
        { s:"FTV",   d:"FTV",   n:"Fortive",              sec:"Industriales",   w:0.09 },
        { s:"FAST",  d:"FAST",  n:"Fastenal",             sec:"Industriales",   w:0.14 },
        { s:"DOV",   d:"DOV",   n:"Dover",                sec:"Industriales",   w:0.14 },
        { s:"XYL",   d:"XYL",   n:"Xylem",                sec:"Industriales",   w:0.10 },
        { s:"VRSK",  d:"VRSK",  n:"Verisk Analytics",     sec:"Industriales",   w:0.09 },
        { s:"CPRT",  d:"CPRT",  n:"Copart",               sec:"Industriales",   w:0.09 },
        { s:"AXON",  d:"AXON",  n:"Axon Enterprise",      sec:"Industriales",   w:0.09 },
        { s:"GNRC",  d:"GNRC",  n:"Generac Holdings",     sec:"Industriales",   w:0.09 },
        { s:"MAS",   d:"MAS",   n:"Masco",                sec:"Industriales",   w:0.09 },
        { s:"SWK",   d:"SWK",   n:"Stanley Black & Decker",sec:"Industriales",  w:0.09 },
        { s:"NDSN",  d:"NDSN",  n:"Nordson",              sec:"Industriales",   w:0.09 },
        { s:"VLTO",  d:"VLTO",  n:"Veralto",              sec:"Industriales",   w:0.09 },
        { s:"DAL",   d:"DAL",   n:"Delta Air Lines",      sec:"Industriales",   w:0.09 },
        { s:"LUV",   d:"LUV",   n:"Southwest Airlines",   sec:"Industriales",   w:0.08 },
        { s:"UAL",   d:"UAL",   n:"United Airlines",      sec:"Industriales",   w:0.08 },
        { s:"AAL",   d:"AAL",   n:"American Airlines",    sec:"Industriales",   w:0.06 },
        { s:"SNA",   d:"SNA",   n:"Snap-on",              sec:"Industriales",   w:0.08 },
        { s:"BAH",   d:"BAH",   n:"Booz Allen Hamilton",  sec:"Industriales",   w:0.08 },
        { s:"SAIC",  d:"SAIC",  n:"Science Applications", sec:"Industriales",   w:0.08 },
        { s:"HII",   d:"HII",   n:"Huntington Ingalls",   sec:"Industriales",   w:0.08 },
        { s:"J",     d:"J",     n:"Jacobs Solutions",     sec:"Industriales",   w:0.08 },
        { s:"JBHT",  d:"JBHT",  n:"J.B. Hunt Transport",  sec:"Industriales",   w:0.08 },
        { s:"EXPD",  d:"EXPD",  n:"Expeditors Intl.",     sec:"Industriales",   w:0.07 },
        { s:"CHRW",  d:"CHRW",  n:"C.H. Robinson",        sec:"Industriales",   w:0.07 },
        { s:"GXO",   d:"GXO",   n:"GXO Logistics",        sec:"Industriales",   w:0.07 },
        { s:"RHI",   d:"RHI",   n:"Robert Half",          sec:"Industriales",   w:0.07 },
        // ── Energía ───────────────────────────────────────────────────
        { s:"XOM",   d:"XOM",   n:"ExxonMobil",           sec:"Energía",        w:0.74 },
        { s:"CVX",   d:"CVX",   n:"Chevron",              sec:"Energía",        w:0.55 },
        { s:"COP",   d:"COP",   n:"ConocoPhillips",       sec:"Energía",        w:0.30 },
        { s:"EOG",   d:"EOG",   n:"EOG Resources",        sec:"Energía",        w:0.27 },
        { s:"OKE",   d:"OKE",   n:"ONEOK",                sec:"Energía",        w:0.22 },
        { s:"WMB",   d:"WMB",   n:"Williams Companies",   sec:"Energía",        w:0.20 },
        { s:"SLB",   d:"SLB",   n:"SLB (Schlumberger)",   sec:"Energía",        w:0.18 },
        { s:"PSX",   d:"PSX",   n:"Phillips 66",          sec:"Energía",        w:0.18 },
        { s:"MPC",   d:"MPC",   n:"Marathon Petroleum",   sec:"Energía",        w:0.18 },
        { s:"KMI",   d:"KMI",   n:"Kinder Morgan",        sec:"Energía",        w:0.15 },
        { s:"VLO",   d:"VLO",   n:"Valero Energy",        sec:"Energía",        w:0.15 },
        { s:"TRGP",  d:"TRGP",  n:"Targa Resources",      sec:"Energía",        w:0.14 },
        { s:"OXY",   d:"OXY",   n:"Occidental Petroleum", sec:"Energía",        w:0.14 },
        { s:"HAL",   d:"HAL",   n:"Halliburton",          sec:"Energía",        w:0.14 },
        { s:"BKR",   d:"BKR",   n:"Baker Hughes",         sec:"Energía",        w:0.13 },
        { s:"DVN",   d:"DVN",   n:"Devon Energy",         sec:"Energía",        w:0.13 },
        { s:"FANG",  d:"FANG",  n:"Diamondback Energy",   sec:"Energía",        w:0.13 },
        { s:"HES",   d:"HES",   n:"Hess Corporation",     sec:"Energía",        w:0.12 },
        { s:"MRO",   d:"MRO",   n:"Marathon Oil",         sec:"Energía",        w:0.09 },
        { s:"APA",   d:"APA",   n:"APA Corporation",      sec:"Energía",        w:0.08 },
        { s:"CTRA",  d:"CTRA",  n:"Coterra Energy",       sec:"Energía",        w:0.08 },
        // ── Materiales ────────────────────────────────────────────────
        { s:"LIN",   d:"LIN",   n:"Linde",                sec:"Materiales",     w:0.36 },
        { s:"SHW",   d:"SHW",   n:"Sherwin-Williams",     sec:"Materiales",     w:0.27 },
        { s:"APD",   d:"APD",   n:"Air Products",         sec:"Materiales",     w:0.24 },
        { s:"FCX",   d:"FCX",   n:"Freeport-McMoRan",     sec:"Materiales",     w:0.26 },
        { s:"ECL",   d:"ECL",   n:"Ecolab",               sec:"Materiales",     w:0.20 },
        { s:"NEM",   d:"NEM",   n:"Newmont",              sec:"Materiales",     w:0.16 },
        { s:"DOW",   d:"DOW",   n:"Dow",                  sec:"Materiales",     w:0.15 },
        { s:"DD",    d:"DD",    n:"DuPont",               sec:"Materiales",     w:0.14 },
        { s:"NUE",   d:"NUE",   n:"Nucor",                sec:"Materiales",     w:0.14 },
        { s:"PPG",   d:"PPG",   n:"PPG Industries",       sec:"Materiales",     w:0.12 },
        { s:"RS",    d:"RS",    n:"Reliance Steel",       sec:"Materiales",     w:0.10 },
        { s:"IFF",   d:"IFF",   n:"Intl. Flavors & Frag.",sec:"Materiales",     w:0.10 },
        { s:"ALB",   d:"ALB",   n:"Albemarle",            sec:"Materiales",     w:0.10 },
        { s:"STLD",  d:"STLD",  n:"Steel Dynamics",       sec:"Materiales",     w:0.10 },
        { s:"CF",    d:"CF",    n:"CF Industries",        sec:"Materiales",     w:0.10 },
        { s:"MOS",   d:"MOS",   n:"Mosaic",               sec:"Materiales",     w:0.10 },
        { s:"AVY",   d:"AVY",   n:"Avery Dennison",       sec:"Materiales",     w:0.10 },
        { s:"PKG",   d:"PKG",   n:"Packaging Corp.",      sec:"Materiales",     w:0.10 },
        { s:"IP",    d:"IP",    n:"International Paper",  sec:"Materiales",     w:0.10 },
        { s:"RPM",   d:"RPM",   n:"RPM International",    sec:"Materiales",     w:0.08 },
        { s:"CE",    d:"CE",    n:"Celanese",             sec:"Materiales",     w:0.08 },
        { s:"BALL",  d:"BALL",  n:"Ball Corporation",     sec:"Materiales",     w:0.08 },
        { s:"CCK",   d:"CCK",   n:"Crown Holdings",       sec:"Materiales",     w:0.08 },
        { s:"SEE",   d:"SEE",   n:"Sealed Air",           sec:"Materiales",     w:0.07 },
        { s:"SON",   d:"SON",   n:"Sonoco Products",      sec:"Materiales",     w:0.07 },
        { s:"X",     d:"X",     n:"U.S. Steel",           sec:"Materiales",     w:0.07 },
        // ── Bienes raíces ─────────────────────────────────────────────
        { s:"PLD",   d:"PLD",   n:"Prologis",             sec:"Bienes raíces",  w:0.34 },
        { s:"WELL",  d:"WELL",  n:"Welltower",            sec:"Bienes raíces",  w:0.26 },
        { s:"SPG",   d:"SPG",   n:"Simon Property",       sec:"Bienes raíces",  w:0.20 },
        { s:"PSA",   d:"PSA",   n:"Public Storage",       sec:"Bienes raíces",  w:0.20 },
        { s:"O",     d:"O",     n:"Realty Income",        sec:"Bienes raíces",  w:0.18 },
        { s:"CCI",   d:"CCI",   n:"Crown Castle",         sec:"Bienes raíces",  w:0.16 },
        { s:"EQIX",  d:"EQIX",  n:"Equinix",              sec:"Bienes raíces",  w:0.16 },
        { s:"IRM",   d:"IRM",   n:"Iron Mountain",        sec:"Bienes raíces",  w:0.14 },
        { s:"DLR",   d:"DLR",   n:"Digital Realty",       sec:"Bienes raíces",  w:0.14 },
        { s:"VTR",   d:"VTR",   n:"Ventas",               sec:"Bienes raíces",  w:0.12 },
        { s:"EQR",   d:"EQR",   n:"Equity Residential",   sec:"Bienes raíces",  w:0.12 },
        { s:"AVB",   d:"AVB",   n:"AvalonBay",            sec:"Bienes raíces",  w:0.12 },
        { s:"ARE",   d:"ARE",   n:"Alexandria RE",        sec:"Bienes raíces",  w:0.12 },
        { s:"ESS",   d:"ESS",   n:"Essex Property",       sec:"Bienes raíces",  w:0.10 },
        { s:"MAA",   d:"MAA",   n:"Mid-America Apt.",     sec:"Bienes raíces",  w:0.10 },
        { s:"PEAK",  d:"PEAK",  n:"Healthpeak Properties",sec:"Bienes raíces",  w:0.10 },
        { s:"CPT",   d:"CPT",   n:"Camden Property",      sec:"Bienes raíces",  w:0.10 },
        { s:"KIM",   d:"KIM",   n:"Kimco Realty",         sec:"Bienes raíces",  w:0.10 },
        { s:"REG",   d:"REG",   n:"Regency Centers",      sec:"Bienes raíces",  w:0.10 },
        { s:"UDR",   d:"UDR",   n:"UDR Inc.",             sec:"Bienes raíces",  w:0.09 },
        { s:"HST",   d:"HST",   n:"Host Hotels",          sec:"Bienes raíces",  w:0.09 },
        { s:"FRT",   d:"FRT",   n:"Federal Realty",       sec:"Bienes raíces",  w:0.09 },
        { s:"WPC",   d:"WPC",   n:"W. P. Carey",          sec:"Bienes raíces",  w:0.08 },
        { s:"NNN",   d:"NNN",   n:"NNN REIT",             sec:"Bienes raíces",  w:0.08 },
        // ── Utilidades ────────────────────────────────────────────────
        { s:"NEE",   d:"NEE",   n:"NextEra Energy",       sec:"Utilidades",     w:0.38 },
        { s:"DUK",   d:"DUK",   n:"Duke Energy",          sec:"Utilidades",     w:0.32 },
        { s:"SO",    d:"SO",    n:"Southern Company",     sec:"Utilidades",     w:0.30 },
        { s:"CEG",   d:"CEG",   n:"Constellation Energy", sec:"Utilidades",     w:0.22 },
        { s:"D",     d:"D",     n:"Dominion Energy",      sec:"Utilidades",     w:0.20 },
        { s:"SRE",   d:"SRE",   n:"Sempra",               sec:"Utilidades",     w:0.18 },
        { s:"AEP",   d:"AEP",   n:"American Electric Power",sec:"Utilidades",   w:0.16 },
        { s:"EXC",   d:"EXC",   n:"Exelon",               sec:"Utilidades",     w:0.16 },
        { s:"XEL",   d:"XEL",   n:"Xcel Energy",          sec:"Utilidades",     w:0.14 },
        { s:"ED",    d:"ED",    n:"Consolidated Edison",  sec:"Utilidades",     w:0.14 },
        { s:"AEE",   d:"AEE",   n:"Ameren",               sec:"Utilidades",     w:0.13 },
        { s:"WEC",   d:"WEC",   n:"WEC Energy",           sec:"Utilidades",     w:0.13 },
        { s:"PPL",   d:"PPL",   n:"PPL Corp",             sec:"Utilidades",     w:0.13 },
        { s:"ETR",   d:"ETR",   n:"Entergy",              sec:"Utilidades",     w:0.12 },
        { s:"FE",    d:"FE",    n:"FirstEnergy",          sec:"Utilidades",     w:0.12 },
        { s:"PCG",   d:"PCG",   n:"PG&E Corp",            sec:"Utilidades",     w:0.12 },
        { s:"EIX",   d:"EIX",   n:"Edison International", sec:"Utilidades",     w:0.12 },
        { s:"NI",    d:"NI",    n:"NiSource",             sec:"Utilidades",     w:0.10 },
        { s:"CNP",   d:"CNP",   n:"CenterPoint Energy",   sec:"Utilidades",     w:0.10 },
        { s:"CMS",   d:"CMS",   n:"CMS Energy",           sec:"Utilidades",     w:0.10 },
        { s:"ATO",   d:"ATO",   n:"Atmos Energy",         sec:"Utilidades",     w:0.10 },
        { s:"AWK",   d:"AWK",   n:"American Water Works", sec:"Utilidades",     w:0.10 },
      ]},
      BMV: { label: "BMV IPC", cur: "$MXN", stocks: [
        { s:"AMXL.MX",     d:"AMXL",    n:"América Móvil",        sec:"Comunicación",   w:9.0 },
        { s:"WALMEX.MX",   d:"WALMEX",  n:"Walmart México",       sec:"Bienes básicos", w:7.0 },
        { s:"GFNORTEO.MX", d:"BANORTE", n:"Banorte",              sec:"Finanzas",       w:6.5 },
        { s:"GMEXICOB.MX", d:"GMEX",    n:"Grupo México",         sec:"Materiales",     w:6.0 },
        { s:"FEMSAUBD.MX", d:"FEMSA",   n:"FEMSA",                sec:"Bienes básicos", w:5.5 },
        { s:"CEMEXCPO.MX", d:"CEMEX",   n:"CEMEX",                sec:"Materiales",     w:4.5 },
        { s:"AC.MX",       d:"AC",      n:"Arca Continental",     sec:"Bienes básicos", w:4.0 },
        { s:"BIMBOA.MX",   d:"BIMBO",   n:"Grupo Bimbo",          sec:"Bienes básicos", w:3.8 },
        { s:"KIMBERA.MX",  d:"KIMBER",  n:"Kimberly-Clark MX",    sec:"Bienes básicos", w:3.2 },
        { s:"ASURB.MX",    d:"ASUR",    n:"ASUR",                 sec:"Industriales",   w:3.0 },
        { s:"GRUMAB.MX",   d:"GRUMA",   n:"Gruma",                sec:"Bienes básicos", w:2.8 },
        { s:"GAPB.MX",     d:"GAP",     n:"Grupo Aerop. Pacífico",sec:"Industriales",   w:2.8 },
        { s:"CHDRAUIB.MX", d:"CHEDRAUI",n:"Chedraui",             sec:"Bienes básicos", w:2.5 },
        { s:"OMAB.MX",     d:"OMA",     n:"OMA",                  sec:"Industriales",   w:2.2 },
        { s:"ORBIA.MX",    d:"ORBIA",   n:"Orbia",                sec:"Materiales",     w:2.0 },
        { s:"MEGACPO.MX",  d:"MEGA",    n:"Megacable",            sec:"Comunicación",   w:1.8 },
        { s:"LIVEPOL1.MX", d:"LPOOL",   n:"El Puerto de Liverpool",sec:"Consumo disc.", w:1.8 },
        { s:"ALSEA.MX",    d:"ALSEA",   n:"Alsea",                sec:"Consumo disc.",  w:1.6 },
        { s:"PINFRA.MX",   d:"PINFRA",  n:"Pinfra",               sec:"Industriales",   w:1.5 },
        { s:"GFINBURO.MX", d:"INBURSA", n:"Inbursa",              sec:"Finanzas",       w:1.5 },
        { s:"GCARSO.MX",   d:"GCARSO",  n:"Grupo Carso",          sec:"Industriales",   w:1.3 },
        { s:"ELEKTRA.MX",  d:"ELEKTRA", n:"Grupo Elektra",        sec:"Consumo disc.",  w:1.2 },
        { s:"CUERVO.MX",   d:"CUERVO",  n:"José Cuervo",          sec:"Bienes básicos", w:1.2 },
        { s:"LALAB.MX",    d:"LALA",    n:"Grupo Lala",           sec:"Bienes básicos", w:1.0 },
        { s:"Q.MX",        d:"Q",       n:"Qualitas Controladora", sec:"Finanzas",      w:1.0 },
        { s:"BOLSAA.MX",   d:"BOLSA",   n:"Bolsa Mexicana",       sec:"Finanzas",       w:0.9 },
        { s:"VOLAR.MX",    d:"VOLAR",   n:"Volaris",              sec:"Industriales",   w:0.8 },
        { s:"BACHOCOB.MX", d:"BACHOCO", n:"Industrias Bachoco",   sec:"Bienes básicos", w:0.7 },
        { s:"VESTA.MX",    d:"VESTA",   n:"Corp. Inmob. Vesta",   sec:"Bienes raíces",  w:0.7 },
        { s:"MFRISCO.MX",  d:"MFRISCO", n:"Minera Frisco",        sec:"Materiales",     w:0.6 },
        { s:"SITES.MX",    d:"SITES",   n:"Sites",                sec:"Comunicación",   w:0.5 },
        { s:"POCHTECB.MX", d:"POCHTE",  n:"Pochteca",             sec:"Materiales",     w:0.4 },
        { s:"JAVER.MX",    d:"JAVER",   n:"Javer",                sec:"Bienes raíces",  w:0.4 },
        { s:"LABB.MX",     d:"LABB",    n:"Genomma Lab",          sec:"Salud",          w:0.4 },
        { s:"HCITY.MX",    d:"HCITY",   n:"Hotel City Express",   sec:"Consumo disc.",  w:0.3 },
      ]},
      DAX: { label: "DAX 40", cur: "€", stocks: [
        { s:"SAP.DE",   d:"SAP",    n:"SAP SE",                   sec:"Tecnología",    w:9.0 },
        { s:"SIE.DE",   d:"SIE",    n:"Siemens",                  sec:"Industriales",  w:6.5 },
        { s:"ALV.DE",   d:"ALV",    n:"Allianz",                  sec:"Finanzas",      w:5.5 },
        { s:"RHM.DE",   d:"RHM",    n:"Rheinmetall",              sec:"Industriales",  w:5.0 },
        { s:"DTE.DE",   d:"DTE",    n:"Deutsche Telekom",         sec:"Comunicación",  w:5.0 },
        { s:"MUV2.DE",  d:"MUV2",   n:"Munich Re",                sec:"Finanzas",      w:4.5 },
        { s:"SHL.DE",   d:"SHL",    n:"Siemens Healthineers",     sec:"Salud",         w:3.8 },
        { s:"ADS.DE",   d:"ADS",    n:"Adidas",                   sec:"Consumo disc.", w:3.2 },
        { s:"DB1.DE",   d:"DB1",    n:"Deutsche Börse",           sec:"Finanzas",      w:3.0 },
        { s:"BMW.DE",   d:"BMW",    n:"BMW",                      sec:"Consumo disc.", w:2.8 },
        { s:"MBG.DE",   d:"MBG",    n:"Mercedes-Benz",            sec:"Consumo disc.", w:2.6 },
        { s:"MRK.DE",   d:"MRKG",   n:"Merck KGaA",               sec:"Salud",         w:2.5 },
        { s:"DHL.DE",   d:"DHL",    n:"DHL Group",                sec:"Industriales",  w:2.5 },
        { s:"HNR1.DE",  d:"HNR1",   n:"Hannover Re",              sec:"Finanzas",      w:2.4 },
        { s:"BAS.DE",   d:"BAS",    n:"BASF",                     sec:"Materiales",    w:2.2 },
        { s:"BAYN.DE",  d:"BAYN",   n:"Bayer",                    sec:"Salud",         w:2.0 },
        { s:"IFX.DE",   d:"IFX",    n:"Infineon Technologies",    sec:"Tecnología",    w:2.0 },
        { s:"VOW3.DE",  d:"VOW3",   n:"Volkswagen",               sec:"Consumo disc.", w:1.8 },
        { s:"MTX.DE",   d:"MTX",    n:"MTU Aero Engines",         sec:"Industriales",  w:1.8 },
        { s:"EOAN.DE",  d:"E.ON",   n:"E.ON",                     sec:"Utilidades",    w:1.7 },
        { s:"RWE.DE",   d:"RWE",    n:"RWE",                      sec:"Utilidades",    w:1.7 },
        { s:"P911.DE",  d:"P911",   n:"Porsche AG",               sec:"Consumo disc.", w:1.6 },
        { s:"DTG.DE",   d:"DTG",    n:"Daimler Truck",            sec:"Industriales",  w:1.5 },
        { s:"DBK.DE",   d:"DBK",    n:"Deutsche Bank",            sec:"Finanzas",      w:1.5 },
        { s:"HEI.DE",   d:"HEI",    n:"Heidelberg Materials",     sec:"Materiales",    w:1.4 },
        { s:"ENR.DE",   d:"ENR",    n:"Siemens Energy",           sec:"Industriales",  w:1.3 },
        { s:"BEI.DE",   d:"BEI",    n:"Beiersdorf",               sec:"Bienes básicos",w:1.3 },
        { s:"VNA.DE",   d:"VNA",    n:"Vonovia",                  sec:"Bienes raíces", w:1.2 },
        { s:"SY1.DE",   d:"SY1",    n:"Symrise",                  sec:"Materiales",    w:1.2 },
        { s:"PAH3.DE",  d:"PAH3",   n:"Porsche SE",               sec:"Consumo disc.", w:1.1 },
        { s:"FRE.DE",   d:"FRE",    n:"Fresenius",                sec:"Salud",         w:1.0 },
        { s:"SRT3.DE",  d:"SRT3",   n:"Sartorius",                sec:"Salud",         w:1.0 },
        { s:"CBK.DE",   d:"CBK",    n:"Commerzbank",              sec:"Finanzas",      w:1.0 },
        { s:"CON.DE",   d:"CON",    n:"Continental",              sec:"Consumo disc.", w:0.9 },
        { s:"BNR.DE",   d:"BNR",    n:"Brenntag",                 sec:"Materiales",    w:0.9 },
        { s:"FME.DE",   d:"FME",    n:"Fresenius Medical Care",   sec:"Salud",         w:0.8 },
        { s:"QGEN.DE",  d:"QGEN",   n:"Qiagen",                   sec:"Salud",         w:0.8 },
        { s:"PUM.DE",   d:"PUM",    n:"Puma",                     sec:"Consumo disc.", w:0.7 },
        { s:"ZAL.DE",   d:"ZAL",    n:"Zalando",                  sec:"Consumo disc.", w:0.6 },
        { s:"1COV.DE",  d:"1COV",   n:"Covestro",                 sec:"Materiales",    w:0.5 },
      ]},
      Nikkei: { label: "Nikkei 225", cur: "¥", stocks: [
        { s:"7203.T",  d:"Toyota",  n:"Toyota Motor",           sec:"Consumo disc.", w:4.5 },
        { s:"6758.T",  d:"Sony",    n:"Sony Group",             sec:"Tecnología",    w:3.5 },
        { s:"8306.T",  d:"MUFG",   n:"Mitsubishi UFJ Fin.",    sec:"Finanzas",      w:3.0 },
        { s:"9984.T",  d:"SoftBk", n:"SoftBank Group",         sec:"Tecnología",    w:2.8 },
        { s:"6861.T",  d:"Keyenc", n:"Keyence",                sec:"Tecnología",    w:2.5 },
        { s:"9983.T",  d:"FastRet",n:"Fast Retailing",         sec:"Consumo disc.", w:2.3 },
        { s:"7974.T",  d:"Nintnd", n:"Nintendo",               sec:"Tecnología",    w:2.0 },
        { s:"8035.T",  d:"TokElec",n:"Tokyo Electron",         sec:"Tecnología",    w:1.9 },
        { s:"7267.T",  d:"Honda",  n:"Honda Motor",            sec:"Consumo disc.", w:1.8 },
        { s:"4519.T",  d:"Chugai", n:"Chugai Pharma",          sec:"Salud",         w:1.8 },
        { s:"8316.T",  d:"SMFG",   n:"Sumitomo Mitsui",        sec:"Finanzas",      w:1.6 },
        { s:"4568.T",  d:"Daiichi",n:"Daiichi Sankyo",         sec:"Salud",         w:1.5 },
        { s:"4502.T",  d:"Takeda", n:"Takeda Pharma",          sec:"Salud",         w:1.5 },
        { s:"6367.T",  d:"Daikin", n:"Daikin Industries",      sec:"Industriales",  w:1.4 },
        { s:"8766.T",  d:"TokMar", n:"Tokio Marine",           sec:"Finanzas",      w:1.4 },
        { s:"4063.T",  d:"ShinEtsu",n:"Shin-Etsu Chemical",    sec:"Materiales",    w:1.3 },
        { s:"9433.T",  d:"KDDI",   n:"KDDI",                   sec:"Comunicación",  w:1.3 },
        { s:"3382.T",  d:"7&I",    n:"Seven & I Holdings",     sec:"Bienes básicos",w:1.2 },
        { s:"9432.T",  d:"NTT",    n:"NTT",                    sec:"Comunicación",  w:1.2 },
        { s:"6098.T",  d:"Recruit",n:"Recruit Holdings",       sec:"Industriales",  w:1.1 },
        { s:"6501.T",  d:"Hitachi",n:"Hitachi",                sec:"Industriales",  w:1.1 },
        { s:"7741.T",  d:"HOYA",   n:"HOYA",                   sec:"Salud",         w:1.0 },
        { s:"4661.T",  d:"OLC",    n:"Oriental Land",          sec:"Consumo disc.", w:0.9 },
        { s:"9434.T",  d:"SBCorp", n:"SoftBank Corp",          sec:"Comunicación",  w:0.9 },
        { s:"8411.T",  d:"Mizuho", n:"Mizuho Financial",       sec:"Finanzas",      w:0.9 },
        { s:"6954.T",  d:"Fanuc",  n:"Fanuc",                  sec:"Industriales",  w:0.9 },
        { s:"7751.T",  d:"Canon",  n:"Canon",                  sec:"Tecnología",    w:0.8 },
        { s:"8001.T",  d:"Itochu", n:"Itochu",                 sec:"Industriales",  w:0.8 },
        { s:"8058.T",  d:"MitCorp",n:"Mitsubishi Corp.",       sec:"Industriales",  w:0.8 },
        { s:"8031.T",  d:"Mitsui", n:"Mitsui & Co.",           sec:"Industriales",  w:0.8 },
        { s:"6301.T",  d:"Komatsu",n:"Komatsu",                sec:"Industriales",  w:0.7 },
        { s:"5108.T",  d:"Bridge", n:"Bridgestone",            sec:"Consumo disc.", w:0.7 },
        { s:"9613.T",  d:"NTTData",n:"NTT DATA",               sec:"Tecnología",    w:0.7 },
        { s:"6857.T",  d:"Advnst", n:"Advantest",              sec:"Tecnología",    w:0.7 },
        { s:"8750.T",  d:"DaiiLfe",n:"Dai-ichi Life",          sec:"Finanzas",      w:0.7 },
        { s:"9020.T",  d:"JREast", n:"JR East",                sec:"Industriales",  w:0.7 },
        { s:"6702.T",  d:"Fujitsu",n:"Fujitsu",                sec:"Tecnología",    w:0.7 },
        { s:"4452.T",  d:"Kao",    n:"Kao Corp",               sec:"Bienes básicos",w:0.6 },
        { s:"2914.T",  d:"JapTob", n:"Japan Tobacco",          sec:"Bienes básicos",w:0.6 },
        { s:"7269.T",  d:"Suzuki", n:"Suzuki Motor",           sec:"Consumo disc.", w:0.6 },
        { s:"8267.T",  d:"AEON",   n:"AEON",                   sec:"Bienes básicos",w:0.6 },
        { s:"4901.T",  d:"Fujiflm",n:"Fujifilm Holdings",      sec:"Tecnología",    w:0.6 },
        { s:"7832.T",  d:"Bandai", n:"Bandai Namco",           sec:"Consumo disc.", w:0.6 },
        { s:"2503.T",  d:"Kirin",  n:"Kirin Holdings",         sec:"Bienes básicos",w:0.5 },
        { s:"6503.T",  d:"MitElec",n:"Mitsubishi Electric",    sec:"Industriales",  w:0.5 },
        { s:"5401.T",  d:"NipStl", n:"Nippon Steel",           sec:"Materiales",    w:0.5 },
        { s:"7201.T",  d:"Nissan", n:"Nissan Motor",           sec:"Consumo disc.", w:0.5 },
        { s:"8053.T",  d:"SumCorp",n:"Sumitomo Corp.",         sec:"Industriales",  w:0.5 },
        { s:"8002.T",  d:"Marube", n:"Marubeni",               sec:"Industriales",  w:0.5 },
        { s:"6971.T",  d:"Kyocera",n:"Kyocera",                sec:"Tecnología",    w:0.5 },
        { s:"2802.T",  d:"Ajinom", n:"Ajinomoto",              sec:"Bienes básicos",w:0.5 },
        { s:"6645.T",  d:"Omron",  n:"Omron",                  sec:"Industriales",  w:0.5 },
        { s:"4523.T",  d:"Eisai",  n:"Eisai",                  sec:"Salud",         w:0.5 },
        { s:"6762.T",  d:"TDK",    n:"TDK",                    sec:"Tecnología",    w:0.5 },
        { s:"9022.T",  d:"JRTok",  n:"JR Tokai",               sec:"Industriales",  w:0.5 },
        { s:"7270.T",  d:"Subaru", n:"Subaru",                 sec:"Consumo disc.", w:0.4 },
        { s:"4307.T",  d:"NRI",    n:"Nomura Research Inst.",  sec:"Tecnología",    w:0.4 },
        { s:"9021.T",  d:"JRWest", n:"JR West",                sec:"Industriales",  w:0.4 },
        { s:"7733.T",  d:"Olympus",n:"Olympus",                sec:"Salud",         w:0.4 },
        { s:"4151.T",  d:"KyowaK", n:"Kyowa Kirin",            sec:"Salud",         w:0.4 },
        { s:"4704.T",  d:"Trend",  n:"Trend Micro",            sec:"Tecnología",    w:0.4 },
        { s:"5020.T",  d:"ENEOS",  n:"ENEOS Holdings",         sec:"Energía",       w:0.4 },
        { s:"1925.T",  d:"DaiwHs", n:"Daiwa House Industry",   sec:"Bienes raíces", w:0.4 },
        { s:"8028.T",  d:"FamMart",n:"FamilyMart",             sec:"Bienes básicos",w:0.4 },
        { s:"3659.T",  d:"Nexon",  n:"Nexon",                  sec:"Comunicación",  w:0.4 },
        { s:"4021.T",  d:"NissanC",n:"Nissan Chemical",        sec:"Materiales",    w:0.3 },
        { s:"6724.T",  d:"Seiko",  n:"Seiko Epson",            sec:"Tecnología",    w:0.3 },
        { s:"5411.T",  d:"JFE",    n:"JFE Steel",              sec:"Materiales",    w:0.3 },
        { s:"6770.T",  d:"Alps",   n:"Alps Alpine",            sec:"Tecnología",    w:0.3 },
        { s:"7912.T",  d:"DNP",    n:"Dai Nippon Printing",    sec:"Industriales",  w:0.3 },
        { s:"7911.T",  d:"Toppan", n:"Toppan Inc.",            sec:"Industriales",  w:0.3 },
        { s:"9001.T",  d:"Tobu",   n:"Tobu Railway",           sec:"Industriales",  w:0.3 },
        { s:"9005.T",  d:"Tokyu",  n:"Tokyu Corp",             sec:"Industriales",  w:0.3 },
        { s:"4183.T",  d:"MitsCh", n:"Mitsui Chemicals",       sec:"Materiales",    w:0.3 },
        { s:"6305.T",  d:"HitCon", n:"Hitachi Construction",   sec:"Industriales",  w:0.3 },
        { s:"2282.T",  d:"NHFds",  n:"NH Foods",               sec:"Bienes básicos",w:0.3 },
        { s:"4005.T",  d:"SumChem",n:"Sumitomo Chemical",      sec:"Materiales",    w:0.3 },
        { s:"7211.T",  d:"MitMot", n:"Mitsubishi Motors",      sec:"Consumo disc.", w:0.2 },
        { s:"9031.T",  d:"NishiRR",n:"Nishi-Nippon Railroad",  sec:"Industriales",  w:0.2 },
        { s:"3289.T",  d:"Tokyu R",n:"Tokyu Fudosan",          sec:"Bienes raíces", w:0.2 },
      ]},
      KOSPI: { label: "KOSPI 100", cur: "₩", stocks: [
        { s:"005930.KS", d:"Samsng",  n:"Samsung Electronics",    sec:"Tecnología",    w:5.0 },
        { s:"000660.KS", d:"SKHynix", n:"SK Hynix",               sec:"Tecnología",    w:3.0 },
        { s:"005380.KS", d:"Hyundai", n:"Hyundai Motor",          sec:"Consumo disc.", w:2.5 },
        { s:"035420.KS", d:"NAVER",   n:"NAVER",                  sec:"Comunicación",  w:2.0 },
        { s:"000270.KS", d:"Kia",     n:"Kia Corp",               sec:"Consumo disc.", w:1.8 },
        { s:"207940.KS", d:"SamBio",  n:"Samsung Biologics",      sec:"Salud",         w:1.6 },
        { s:"051910.KS", d:"LGChem",  n:"LG Chem",                sec:"Materiales",    w:1.5 },
        { s:"006400.KS", d:"SamSDI",  n:"Samsung SDI",            sec:"Tecnología",    w:1.4 },
        { s:"035720.KS", d:"Kakao",   n:"Kakao",                  sec:"Comunicación",  w:1.3 },
        { s:"068270.KS", d:"Celltrn", n:"Celltrion",              sec:"Salud",         w:1.2 },
        { s:"028260.KS", d:"SamC&T",  n:"Samsung C&T",            sec:"Industriales",  w:1.1 },
        { s:"066570.KS", d:"LGElec",  n:"LG Electronics",         sec:"Tecnología",    w:1.0 },
        { s:"003550.KS", d:"LGCorp",  n:"LG Corp",                sec:"Industriales",  w:1.0 },
        { s:"105560.KS", d:"KB Fin",  n:"KB Financial",           sec:"Finanzas",      w:1.0 },
        { s:"055550.KS", d:"Shinhan", n:"Shinhan Financial",      sec:"Finanzas",      w:0.9 },
        { s:"047050.KS", d:"POSCO",   n:"POSCO Holdings",         sec:"Materiales",    w:0.9 },
        { s:"034730.KS", d:"SK Inc",  n:"SK Inc.",                sec:"Industriales",  w:0.8 },
        { s:"086790.KS", d:"Hana",    n:"Hana Financial",         sec:"Finanzas",      w:0.8 },
        { s:"012330.KS", d:"HynMobs", n:"Hyundai Mobis",          sec:"Consumo disc.", w:0.7 },
        { s:"000810.KS", d:"SamFire", n:"Samsung Fire & Marine",  sec:"Finanzas",      w:0.7 },
        { s:"096770.KS", d:"SKInno",  n:"SK Innovation",          sec:"Energía",       w:0.7 },
        { s:"017670.KS", d:"SKTel",   n:"SK Telecom",             sec:"Comunicación",  w:0.7 },
        { s:"032830.KS", d:"SamLife", n:"Samsung Life Insurance", sec:"Finanzas",      w:0.6 },
        { s:"030200.KS", d:"KTCorp",  n:"KT Corp",                sec:"Comunicación",  w:0.6 },
        { s:"015760.KS", d:"KEPCO",   n:"Korea Electric Power",   sec:"Utilidades",    w:0.6 },
        { s:"259960.KS", d:"Krafton", n:"Krafton",                sec:"Comunicación",  w:0.6 },
        { s:"009150.KS", d:"SamElMc", n:"Samsung Electro-Mec.",   sec:"Tecnología",    w:0.5 },
        { s:"033780.KS", d:"KT&G",    n:"KT&G",                   sec:"Bienes básicos",w:0.5 },
        { s:"352820.KS", d:"HYBE",    n:"HYBE",                   sec:"Comunicación",  w:0.5 },
        { s:"090430.KS", d:"Amore",   n:"Amorepacific",           sec:"Bienes básicos",w:0.5 },
        { s:"036570.KS", d:"NCSOFT",  n:"NCSOFT",                 sec:"Comunicación",  w:0.5 },
        { s:"018260.KS", d:"SamSDS",  n:"Samsung SDS",            sec:"Tecnología",    w:0.5 },
        { s:"323410.KS", d:"KakaoBk", n:"Kakao Bank",             sec:"Finanzas",      w:0.5 },
        { s:"010130.KS", d:"KorZinc", n:"Korea Zinc",             sec:"Materiales",    w:0.5 },
        { s:"036460.KS", d:"KorGas",  n:"Korea Gas Corp",         sec:"Utilidades",    w:0.4 },
        { s:"009830.KS", d:"HanwhSl", n:"Hanwha Solutions",       sec:"Materiales",    w:0.4 },
        { s:"071050.KS", d:"KorInvst",n:"Korea Investment Hold.", sec:"Finanzas",      w:0.4 },
        { s:"010950.KS", d:"S-Oil",   n:"S-Oil",                  sec:"Energía",       w:0.4 },
        { s:"000720.KS", d:"HynE&C",  n:"Hyundai E&C",            sec:"Industriales",  w:0.4 },
        { s:"011200.KS", d:"HMM",     n:"HMM",                    sec:"Industriales",  w:0.4 },
        { s:"003490.KS", d:"KorAir",  n:"Korean Air",             sec:"Industriales",  w:0.4 },
        { s:"024110.KS", d:"IBKBank", n:"Industrial Bank of Korea",sec:"Finanzas",     w:0.4 },
        { s:"034020.KS", d:"DsEnrgy", n:"Doosan Enerbility",      sec:"Industriales",  w:0.4 },
        { s:"008770.KS", d:"HotShil", n:"Hotel Shilla",           sec:"Consumo disc.", w:0.3 },
        { s:"042660.KS", d:"DaeShip", n:"Hanwha Ocean",           sec:"Industriales",  w:0.3 },
        { s:"006800.KS", d:"Mirae",   n:"Mirae Asset Securities", sec:"Finanzas",      w:0.3 },
        { s:"010140.KS", d:"SamHI",   n:"Samsung Heavy Industries",sec:"Industriales", w:0.3 },
        { s:"002380.KS", d:"KCCCrp",  n:"KCC Corp",               sec:"Materiales",    w:0.3 },
        { s:"000100.KS", d:"Yuhan",   n:"Yuhan Corporation",      sec:"Salud",         w:0.3 },
        { s:"011210.KS", d:"HynWia",  n:"Hyundai WIA",            sec:"Industriales",  w:0.3 },
        { s:"000150.KS", d:"DooSn",   n:"Doosan Corp",            sec:"Industriales",  w:0.2 },
      ]},
      IBEX: { label: "IBEX 35", cur: "€", stocks: [
        { s:"SAN.MC",   d:"SAN",    n:"Santander",               sec:"Finanzas",      w:8.0 },
        { s:"BBVA.MC",  d:"BBVA",   n:"BBVA",                    sec:"Finanzas",      w:7.5 },
        { s:"ITX.MC",   d:"ITX",    n:"Inditex",                 sec:"Consumo disc.", w:7.0 },
        { s:"IBE.MC",   d:"IBE",    n:"Iberdrola",               sec:"Utilidades",    w:6.5 },
        { s:"TEF.MC",   d:"TEF",    n:"Telefónica",              sec:"Comunicación",  w:4.0 },
        { s:"CLNX.MC",  d:"CLNX",   n:"Cellnex Telecom",         sec:"Comunicación",  w:3.5 },
        { s:"AMS.MC",   d:"AMS",    n:"Amadeus IT",              sec:"Tecnología",    w:3.2 },
        { s:"AENA.MC",  d:"AENA",   n:"Aena",                    sec:"Industriales",  w:3.0 },
        { s:"REP.MC",   d:"REP",    n:"Repsol",                  sec:"Energía",       w:3.0 },
        { s:"FER.MC",   d:"FER",    n:"Ferrovial",               sec:"Industriales",  w:2.8 },
        { s:"CABK.MC",  d:"CABK",   n:"CaixaBank",               sec:"Finanzas",      w:2.5 },
        { s:"IAG.MC",   d:"IAG",    n:"IAG (Iberia/BA)",         sec:"Industriales",  w:2.2 },
        { s:"ACS.MC",   d:"ACS",    n:"ACS",                     sec:"Industriales",  w:2.0 },
        { s:"MTS.MC",   d:"MTS",    n:"ArcelorMittal",           sec:"Materiales",    w:1.8 },
        { s:"ELE.MC",   d:"ELE",    n:"Endesa",                  sec:"Utilidades",    w:1.6 },
        { s:"NTGY.MC",  d:"NTGY",   n:"Naturgy",                 sec:"Utilidades",    w:1.5 },
        { s:"ANA.MC",   d:"ANA",    n:"Acciona",                 sec:"Industriales",  w:1.4 },
        { s:"ANE.MC",   d:"ANE",    n:"Acciona Energía",         sec:"Utilidades",    w:1.2 },
        { s:"IDR.MC",   d:"IDR",    n:"Indra Sistemas",          sec:"Tecnología",    w:1.0 },
        { s:"ENG.MC",   d:"ENG",    n:"Enagás",                  sec:"Utilidades",    w:0.9 },
        { s:"RED.MC",   d:"RED",    n:"Redeia (Red Eléctrica)",  sec:"Utilidades",    w:0.9 },
        { s:"LOG.MC",   d:"LOG",    n:"Logista",                 sec:"Industriales",  w:0.9 },
        { s:"MAP.MC",   d:"MAP",    n:"Mapfre",                  sec:"Finanzas",      w:0.8 },
        { s:"COL.MC",   d:"COL",    n:"Colonial Inmobiliaria",   sec:"Bienes raíces", w:0.8 },
        { s:"CIE.MC",   d:"CIE",    n:"CIE Automotive",          sec:"Consumo disc.", w:0.8 },
        { s:"SAB.MC",   d:"SAB",    n:"Banco Sabadell",          sec:"Finanzas",      w:0.7 },
        { s:"GRF.MC",   d:"GRF",    n:"Grifols",                 sec:"Salud",         w:0.7 },
        { s:"VIS.MC",   d:"VIS",    n:"Viscofan",                sec:"Bienes básicos",w:0.7 },
        { s:"MRL.MC",   d:"MRL",    n:"Merlin Properties",       sec:"Bienes raíces", w:0.7 },
        { s:"SCYR.MC",  d:"SCYR",   n:"Sacyr",                   sec:"Industriales",  w:0.6 },
        { s:"BKT.MC",   d:"BKT",    n:"Bankinter",               sec:"Finanzas",      w:0.6 },
        { s:"UNI.MC",   d:"UNI",    n:"Unicaja Banco",           sec:"Finanzas",      w:0.5 },
        { s:"MEL.MC",   d:"MEL",    n:"Meliá Hotels",            sec:"Consumo disc.", w:0.5 },
        { s:"ACX.MC",   d:"ACX",    n:"Acerinox",                sec:"Materiales",    w:0.5 },
        { s:"SOL.MC",   d:"SOL",    n:"Solaria",                 sec:"Utilidades",    w:0.4 },
      ]},
    };

    // Persist selections in widget.config
    if (!widget.config.index) widget.config.index = "SP500";
    if (!widget.config.sector) widget.config.sector = "Todos";

    // DOM
    body.style.cssText = "padding:0;display:flex;flex-direction:column;overflow:hidden;";
    const toolbar = document.createElement("div");
    toolbar.style.cssText = "display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0;flex-wrap:wrap;";
    const selStyle = "background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:5px;padding:3px 7px;color:inherit;font-size:11px;outline:none;cursor:pointer;";

    const indexSel = document.createElement("select");
    indexSel.style.cssText = selStyle;
    Object.entries(INDICES).forEach(([key, cfg]) => {
      const o = document.createElement("option");
      o.value = key; o.textContent = cfg.label;
      if (key === widget.config.index) o.selected = true;
      indexSel.appendChild(o);
    });

    const sectorSel = document.createElement("select");
    sectorSel.style.cssText = selStyle + "flex:1;max-width:150px;";

    const statusEl = document.createElement("span");
    statusEl.style.cssText = "font-size:10px;opacity:0.45;margin-left:auto;white-space:nowrap;";
    statusEl.textContent = "Cargando…";

    toolbar.appendChild(indexSel);
    toolbar.appendChild(sectorSel);
    toolbar.appendChild(statusEl);
    body.appendChild(toolbar);

    const wrap = document.createElement("div");
    wrap.style.cssText = "position:relative;flex:1;min-height:0;overflow:hidden;";
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;width:100%;height:100%;cursor:crosshair;";
    const tip = document.createElement("div");
    tip.style.cssText = "position:absolute;background:rgba(8,10,18,0.96);border:1px solid rgba(255,255,255,0.14);border-radius:7px;padding:7px 11px;font-size:11.5px;line-height:1.5;pointer-events:none;display:none;z-index:20;white-space:nowrap;";
    wrap.appendChild(canvas); wrap.appendChild(tip);
    body.appendChild(wrap);

    let prices = {};
    let layoutCells = [];
    let layoutW = 0, layoutH = 0;

    // ── Zoom/pan state ──────────────────────────────────────────────
    let zoom = 1, panX = 0, panY = 0;
    let isPanning = false, panStartX = 0, panStartY = 0, panOriX = 0, panOriY = 0;

    function currentStocks() { return INDICES[widget.config.index].stocks; }
    function currentCur()    { return INDICES[widget.config.index].cur; }

    function resetView() { zoom = 1; panX = 0; panY = 0; canvas.style.cursor = "crosshair"; }

    function clampPan(cw, ch) {
      panX = Math.max(0, Math.min(panX, cw * (zoom - 1)));
      panY = Math.max(0, Math.min(panY, ch * (zoom - 1)));
    }

    function rebuildSectorSel() {
      sectorSel.innerHTML = "";
      const sectors = ["Todos", ...new Set(currentStocks().map(s => s.sec))];
      sectors.forEach(sec => {
        const o = document.createElement("option");
        o.value = sec; o.textContent = sec;
        if (sec === widget.config.sector) o.selected = true;
        sectorSel.appendChild(o);
      });
    }
    rebuildSectorSel();

    function pctColor(p) {
      if (p == null) return "#111827";           // sin datos
      const a = Math.abs(p);
      if (a < 0.15) return "#374151";            // neutral ≈ 0%
      if (p > 0) {
        if (p < 0.5)  return "#14532d";          // +0.15–0.5%
        if (p < 1.0)  return "#166534";          // +0.5–1%
        if (p < 2.0)  return "#15803d";          // +1–2%
        if (p < 3.5)  return "#16a34a";          // +2–3.5%
        if (p < 5.0)  return "#22c55e";          // +3.5–5%
        if (p < 7.0)  return "#4ade80";          // +5–7%
        return "#86efac";                        // >+7%
      } else {
        if (p > -0.5)  return "#4a0d0d";         // -0.15–-0.5%
        if (p > -1.0)  return "#7f1d1d";         // -0.5–-1%
        if (p > -2.0)  return "#991b1b";         // -1–-2%
        if (p > -3.5)  return "#b91c1c";         // -2–-3.5%
        if (p > -5.0)  return "#dc2626";         // -3.5–-5%
        if (p > -7.0)  return "#ef4444";         // -5–-7%
        return "#fca5a5";                        // >-7%
      }
    }

    function squarify(data, x, y, w, h) {
      const out = [];
      if (!data.length || w < 1 || h < 1) return out;
      const totalW = data.reduce((s, d) => s + d.w, 0);
      const totalA = w * h;
      const items = data.map(d => ({ ...d, a: (d.w / totalW) * totalA }));
      function worst(row, side) {
        const s = row.reduce((a, b) => a + b.a, 0);
        const max = Math.max(...row.map(i => i.a));
        const min = Math.min(...row.map(i => i.a));
        return Math.max(side * side * max / (s * s), s * s / (side * side * min));
      }
      function place(it, rx, ry, rw, rh) {
        if (!it.length) return;
        if (it.length === 1) { out.push({ ...it[0], x: rx, y: ry, w: rw, h: rh }); return; }
        const horiz = rw >= rh, side = horiz ? rh : rw;
        let strip = [it[0]], i = 1;
        while (i < it.length) {
          const cand = [...strip, it[i]];
          if (worst(cand, side) <= worst(strip, side)) { strip = cand; i++; } else break;
        }
        const sA = strip.reduce((s, xv) => s + xv.a, 0);
        const totA = it.reduce((s, xv) => s + xv.a, 0);
        const frac = sA / totA;
        if (horiz) {
          const sw = frac * rw; let py = ry;
          strip.forEach(xv => { const ih = (xv.a / sA) * rh; out.push({ ...xv, x: rx, y: py, w: sw, h: ih }); py += ih; });
          place(it.slice(strip.length), rx + sw, ry, rw - sw, rh);
        } else {
          const sh = frac * rh; let px = rx;
          strip.forEach(xv => { const iw = (xv.a / sA) * rw; out.push({ ...xv, x: px, y: ry, w: iw, h: sh }); px += iw; });
          place(it.slice(strip.length), rx, ry + sh, rw, rh - sh);
        }
      }
      place(items, x, y, w, h);
      return out;
    }

    function computeLayout(cw, ch) {
      const sec = widget.config.sector;
      const vis = (sec === "Todos" ? [...currentStocks()] : currentStocks().filter(s => s.sec === sec))
        .sort((a, b) => b.w - a.w);
      layoutCells = squarify(vis, 0, 0, cw, ch);
      layoutW = cw; layoutH = ch;
    }

    // ── Logo cache (lazy-load, no CORS needed for drawImage) ───────
    const logoCache = new Map(); // sym -> HTMLImageElement | 'loading' | 'error'
    let logoRedrawTimer = null;
    function scheduleLogoRedraw() {
      if (logoRedrawTimer) return;
      logoRedrawTimer = setTimeout(() => { logoRedrawTimer = null; draw(); }, 80);
    }
    function loadLogo(sym) {
      if (logoCache.has(sym)) return;
      logoCache.set(sym, 'loading');
      const img = new Image();
      img.onload = () => { logoCache.set(sym, img); scheduleLogoRedraw(); };
      img.onerror = () => { logoCache.set(sym, 'error'); };
      img.src = `https://assets.parqet.com/logos/symbol/${encodeURIComponent(sym)}?format=png`;
    }

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const cw = wrap.clientWidth, ch = wrap.clientHeight;
      if (cw < 10 || ch < 10) return;
      canvas.width = cw * dpr; canvas.height = ch * dpr;
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cw, ch);

      if (layoutW !== cw || layoutH !== ch) {
        computeLayout(cw, ch);
        clampPan(cw, ch);
      }

      const pad = 1.5;
      layoutCells.forEach(cell => {
        const info = prices[cell.s];
        const pct = info ? info.pct : null;

        const sx = cell.x * zoom - panX;
        const sy = cell.y * zoom - panY;
        const sw = cell.w * zoom;
        const sh = cell.h * zoom;
        if (sx + sw < 0 || sx > cw || sy + sh < 0 || sy > ch) return;

        const bx = sx + pad, by = sy + pad, bw = sw - pad * 2, bh = sh - pad * 2;
        if (bw < 2 || bh < 2) return;

        ctx.fillStyle = pctColor(pct);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, Math.min(3, bw * 0.12, bh * 0.12));
        else ctx.rect(bx, by, bw, bh);
        ctx.fill();

        if (bw < 12 || bh < 8) return;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const cx = bx + bw / 2, cy = by + bh / 2;
        const label = cell.d;

        if (bh >= 58 && bw >= 48) {
          // Large tile: logo + ticker + %change
          const logoEntry = logoCache.get(cell.s);
          if (!logoEntry) loadLogo(cell.s);
          const hasLogo = logoEntry instanceof HTMLImageElement;
          const logoSize = Math.min(bw * 0.44, bh * 0.30, 34);
          const logoTop = by + bh * 0.07;
          const logoCY = logoTop + logoSize / 2;

          if (hasLogo) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, logoCY, logoSize / 2 + 3, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.13)";
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx, logoCY, logoSize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(logoEntry, cx - logoSize / 2, logoTop, logoSize, logoSize);
            ctx.restore();
          }

          const textTop = by + bh * 0.44;
          const fs = Math.min(bw / (label.length + 1) * 1.4, bh * 0.22, 17);
          ctx.font = `700 ${fs}px Inter,sans-serif`;
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.fillText(label, cx, textTop + fs * 0.5);
          const pctStr = pct != null ? (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%" : "—";
          ctx.font = `${Math.max(8, fs * 0.72)}px Inter,sans-serif`;
          ctx.fillStyle = "rgba(255,255,255,0.72)";
          ctx.fillText(pctStr, cx, textTop + fs * 1.9);
        } else if (bh >= 38 && bw >= 30) {
          const fs = Math.min(bw / (label.length + 1) * 1.4, bh * 0.28, 18);
          ctx.font = `700 ${fs}px Inter,sans-serif`;
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.fillText(label, cx, cy - fs * 0.55);
          const pctStr = pct != null ? (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%" : "—";
          ctx.font = `${Math.max(8, fs * 0.72)}px Inter,sans-serif`;
          ctx.fillStyle = "rgba(255,255,255,0.72)";
          ctx.fillText(pctStr, cx, cy + fs * 0.65);
        } else if (bh >= 14 && bw >= 14) {
          const fs = Math.min(bw / (label.length + 1) * 1.3, bh * 0.46, 13);
          ctx.font = `700 ${fs}px Inter,sans-serif`;
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.fillText(label, cx, cy);
        }
      });

      // Zoom hint overlay
      if (zoom > 1.05) {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, ch - 20, cw, 20);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "10px Inter,sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${zoom.toFixed(1)}×  •  Rueda: zoom  •  Arrastrar: mover  •  Doble clic: reset`, cw / 2, ch - 10);
        ctx.restore();
      }
    }

    // ── Fetch prices in batches of 100 to avoid URL length limits ──
    async function fetchAll() {
      prices = {};
      statusEl.textContent = "Cargando…";
      draw();
      const syms = currentStocks().map(s => s.s);
      const BATCH = 100;
      try {
        for (let i = 0; i < syms.length; i += BATCH) {
          const chunk = syms.slice(i, i + BATCH);
          const r = await fetch(`${API_BASE_URL}/prices?symbols=${encodeURIComponent(chunk.join(","))}`);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const j = await r.json();
          Object.entries(j).forEach(([sym, data]) => {
            if (data.price != null) {
              const pct = (data.prev != null && data.prev > 0)
                ? ((data.price - data.prev) / data.prev) * 100
                : null;
              prices[sym] = { price: data.price, pct };
            }
          });
        }
      } catch (err) {
        statusEl.textContent = "Error al cargar datos";
        draw();
        return;
      }
      const n = Object.keys(prices).length;
      statusEl.textContent = `${n} valores · ${new Date().toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"})}`;
      draw();
    }

    // ── Zoom (wheel) ────────────────────────────────────────────────
    canvas.addEventListener("wheel", e => {
      e.preventDefault();
      e.stopPropagation();
      const r = canvas.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const cw = wrap.clientWidth, ch = wrap.clientHeight;
      const factor = e.deltaY < 0 ? 1.15 : (1 / 1.15);
      const newZoom = Math.max(1, Math.min(32, zoom * factor));
      if (newZoom === zoom) return;
      panX = mx + (panX - mx) * (newZoom / zoom);
      panY = my + (panY - my) * (newZoom / zoom);
      zoom = newZoom;
      clampPan(cw, ch);
      canvas.style.cursor = zoom > 1 ? "grab" : "crosshair";
      draw();
    }, { passive: false });

    // ── Pan (drag) ──────────────────────────────────────────────────
    canvas.addEventListener("mousedown", e => {
      if (e.button !== 0 || zoom <= 1) return;
      isPanning = true;
      panStartX = e.clientX; panStartY = e.clientY;
      panOriX = panX; panOriY = panY;
      canvas.style.cursor = "grabbing";
      e.stopPropagation();
    });
    function onPanMove(e) {
      if (!isPanning) return;
      const cw = wrap.clientWidth, ch = wrap.clientHeight;
      panX = panOriX - (e.clientX - panStartX);
      panY = panOriY - (e.clientY - panStartY);
      clampPan(cw, ch);
      tip.style.display = "none";
      draw();
    }
    function onPanUp() {
      if (!isPanning) return;
      isPanning = false;
      canvas.style.cursor = zoom > 1 ? "grab" : "crosshair";
    }
    document.addEventListener("mousemove", onPanMove);
    document.addEventListener("mouseup", onPanUp);

    // ── Double-click: reset zoom ────────────────────────────────────
    canvas.addEventListener("dblclick", e => {
      resetView();
      draw();
      e.stopPropagation();
    });

    // ── Tooltip (uses world coords) ─────────────────────────────────
    canvas.addEventListener("mousemove", e => {
      if (isPanning) return;
      const r = canvas.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const wx = (mx + panX) / zoom, wy = (my + panY) / zoom;
      const cell = layoutCells.find(c => wx >= c.x && wx <= c.x + c.w && wy >= c.y && wy <= c.y + c.h);
      if (!cell) { tip.style.display = "none"; return; }
      const info = prices[cell.s];
      const pct = info ? ((info.pct >= 0 ? "+" : "") + info.pct.toFixed(2) + "%") : "Sin datos";
      const pc = info ? (info.pct >= 0 ? "#4caf50" : "#ef5350") : "#888";
      const priceStr = info ? `${currentCur()} ${info.price.toLocaleString("es", {minimumFractionDigits:2,maximumFractionDigits:2})}  ` : "";
      tip.innerHTML = `<strong>${cell.d}</strong> <span style="opacity:.6">${cell.n}</span><br><span style="opacity:.5">${cell.sec}</span>  ${priceStr}<span style="color:${pc}">${pct}</span>`;
      tip.style.display = "block";
      let tx = mx + 14, ty = my - 10;
      if (tx + 250 > r.width) tx = mx - 255;
      if (ty + 60 > r.height) ty = my - 64;
      tip.style.left = tx + "px"; tip.style.top = ty + "px";
    });
    canvas.addEventListener("mouseleave", () => { tip.style.display = "none"; });

    indexSel.addEventListener("change", () => {
      widget.config.index = indexSel.value;
      widget.config.sector = "Todos";
      resetView(); layoutW = 0;
      rebuildSectorSel();
      saveHubState();
      fetchAll();
    });
    sectorSel.addEventListener("change", () => {
      widget.config.sector = sectorSel.value;
      resetView(); layoutW = 0;
      saveHubState();
      draw();
    });
    [indexSel, sectorSel].forEach(el => el.addEventListener("mousedown", e => e.stopPropagation()));

    const ro = new ResizeObserver(() => { layoutW = 0; draw(); });
    ro.observe(wrap);

    ref.refresh = fetchAll;
    ref.onResize = () => { layoutW = 0; draw(); };
    ref.cleanup = () => {
      ro.disconnect();
      document.removeEventListener("mousemove", onPanMove);
      document.removeEventListener("mouseup", onPanUp);
    };

    fetchAll();
  }

  // Portfolio summary widget
  function renderPortfolioWidget(widget, body, ref) {
    if (!widget.config) widget.config = {};
    body.classList.add("hw-portfolio-body");
    const wid = widget.id;

    // ── Header row: label + selector ────────────────────────────────
    const headerRow = document.createElement("div");
    headerRow.className = "hw-pb-header";
    const balanceLabel = document.createElement("span");
    balanceLabel.className = "hw-pb-label";
    balanceLabel.textContent = "Balance";
    const sel = document.createElement("select");
    sel.className = "hw-pb-sel";
    sel.addEventListener("mousedown", e => e.stopPropagation());
    sel.addEventListener("change", () => {
      widget.config.portfolioId = sel.value || null;
      saveHubState();
      renderPortfolioData();
    });
    headerRow.appendChild(balanceLabel);
    headerRow.appendChild(sel);
    body.appendChild(headerRow);

    // ── Amount + return row ──────────────────────────────────────────
    const amountRow = document.createElement("div");
    amountRow.className = "hw-pb-amount-row";
    amountRow.innerHTML = `
      <span class="hw-pb-amount" id="hwp-value-${wid}">—</span>
      <span class="hw-pb-return" id="hwp-return-${wid}"></span>`;
    body.appendChild(amountRow);

    // ── Segmented bar ────────────────────────────────────────────────
    const bar = document.createElement("div");
    bar.className = "hw-pb-bar";
    body.appendChild(bar);

    // ── Ticker grid ──────────────────────────────────────────────────
    const grid = document.createElement("div");
    grid.className = "hw-pb-grid";
    body.appendChild(grid);

    function populateSelector() {
      const portfolios = getPortfolios();
      sel.innerHTML = portfolios.length
        ? portfolios.map(p => `<option value="${p.id}">${p.name}</option>`).join("")
        : `<option value="">Sin portafolios</option>`;
      if (widget.config.portfolioId && portfolios.find(p => p.id === widget.config.portfolioId)) {
        sel.value = widget.config.portfolioId;
      } else if (portfolios.length) {
        sel.value = portfolios[0].id;
        widget.config.portfolioId = portfolios[0].id;
        saveHubState();
      }
    }

    function renderPortfolioData() {
      const portfolioId = widget.config.portfolioId;
      const portfolio = portfolioId ? getPortfolios().find(p => p.id === portfolioId) : null;
      const valueEl = document.getElementById(`hwp-value-${wid}`);
      const retEl = document.getElementById(`hwp-return-${wid}`);

      if (!portfolio) {
        if (valueEl) valueEl.textContent = "—";
        if (retEl) { retEl.textContent = ""; retEl.className = "hw-pb-return"; }
        bar.innerHTML = `<div class="hw-pb-bar-seg" style="flex:1;background:rgba(255,255,255,0.06)"></div>`;
        grid.innerHTML = `<span class="hw-pb-empty">Sin portafolio</span>`;
        return;
      }

      const positions = portfolio.positions || [];
      const currency = portfolio.currency || "USD";
      const { totalInvested } = calcPortfolioTotals(positions, currency);
      const cashBalance = portfolio.cashBalance || 0;

      // Current value + return
      let totalCurrentValue = 0, totalCostPriced = 0, hasAnyPrice = false;
      positions.forEach(pos => {
        const price = getCachedPrice(pos.ticker);
        const posCur = getPosCurrency(pos, currency);
        if (price !== null) {
          hasAnyPrice = true;
          totalCurrentValue += convertAmount(price * (pos.quantity || 0), posCur, currency) ?? (price * (pos.quantity || 0));
          totalCostPriced += convertAmount(calcPositionTotals(pos).total, posCur, currency) ?? calcPositionTotals(pos).total;
        }
      });
      const displayCurrentValue = (hasAnyPrice ? totalCurrentValue : 0) + cashBalance;
      if (valueEl) valueEl.textContent = (hasAnyPrice || cashBalance > 0) ? formatCurrency(displayCurrentValue, currency) : formatCurrency(totalInvested, currency);

      const realizedPnL = portfolio.realizedPnL !== undefined ? portfolio.realizedPnL : reconstructRealizedPnL(portfolio);
      const unrealizedPnL = hasAnyPrice ? totalCurrentValue - totalCostPriced : 0;
      const returnAmt = hasAnyPrice ? unrealizedPnL + realizedPnL : null;
      const returnPct = returnAmt !== null && displayCurrentValue > 0 ? (returnAmt / displayCurrentValue * 100) : null;
      if (retEl) {
        if (returnPct !== null) {
          const sign = returnPct >= 0 ? "+" : "";
          retEl.textContent = sign + returnPct.toFixed(2) + "%";
          retEl.className = "hw-pb-return " + (returnPct >= 0 ? "pos" : "neg");
        } else {
          retEl.textContent = ""; retEl.className = "hw-pb-return";
        }
      }

      // Build segments from invested totals
      const cash = cashBalance || 0;
      const grandTotal = totalInvested + cash;

      if (!positions.length && cash <= 0) {
        bar.innerHTML = `<div class="hw-pb-bar-seg" style="flex:1;background:rgba(255,255,255,0.06)"></div>`;
        grid.innerHTML = `<span class="hw-pb-empty">Sin posiciones</span>`;
        return;
      }

      // Segmented bar
      const segs = positions.map((pos, i) => {
        const t = calcPositionTotals(pos);
        const posCur = getPosCurrency(pos, currency);
        const posTotal = convertAmount(t.total, posCur, currency) ?? t.total;
        const pct = grandTotal > 0 ? posTotal / grandTotal : 0;
        return { ticker: pos.ticker, pct, color: CHART_COLORS[i % CHART_COLORS.length] };
      });
      if (cash > 0) segs.push({ ticker: "Cash", pct: grandTotal > 0 ? cash / grandTotal : 0, color: "#4ade80" });

      const SMALL_THRESHOLD = 0.05; // < 5% → tooltip only, no label

      // Tooltip element (shared)
      let tooltip = bar.querySelector(".hw-pb-tip");
      if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.className = "hw-pb-tip";
        bar.parentElement.style.position = "relative";
        bar.parentElement.appendChild(tooltip);
      }

      bar.innerHTML = "";
      segs.forEach(s => {
        const seg = document.createElement("div");
        seg.className = "hw-pb-bar-seg";
        seg.style.flex = s.pct.toFixed(4);
        seg.style.background = s.color;
        seg.addEventListener("mouseenter", e => {
          tooltip.textContent = `${s.ticker}  ${(s.pct * 100).toFixed(1)}%`;
          tooltip.style.color = s.color;
          tooltip.classList.add("visible");
          const barRect = bar.getBoundingClientRect();
          const segRect = seg.getBoundingClientRect();
          const cx = segRect.left + segRect.width / 2 - barRect.left;
          tooltip.style.left = Math.min(Math.max(cx, 30), bar.clientWidth - 30) + "px";
        });
        seg.addEventListener("mouseleave", () => tooltip.classList.remove("visible"));
        bar.appendChild(seg);
      });

      // Ticker grid — hide items below threshold (they're visible via bar tooltip)
      grid.innerHTML = segs
        .filter(s => s.pct >= SMALL_THRESHOLD)
        .map(s => `<div class="hw-pb-grid-item">
          <span class="hw-pb-grid-ticker">${s.ticker}</span>
          <span class="hw-pb-grid-pct" style="color:${s.color}">${(s.pct * 100).toFixed(1)}%</span>
        </div>`).join("");
    }

    async function refresh() {
      // Sync from Firestore first if local is empty or stale
      const localEmpty = !getPortfolios().length;
      if (localEmpty) {
        const synced = await syncPortfoliosFromCloud();
        if (synced) populateSelector();
      }
      renderPortfolioData();
      const portfolio = widget.config.portfolioId ? getPortfolios().find(p => p.id === widget.config.portfolioId) : null;
      if (!portfolio || !portfolio.positions?.length) return;
      const tickers = [...new Set(portfolio.positions.map(p => p.ticker))];
      const cache = getPriceCache();
      tickers.forEach(t => { if (cache[t]) cache[t].ts = 0; });
      savePriceCache(cache);
      const posCurrencies = portfolio.positions.map(p => getPosCurrency(p, portfolio.currency || "USD"));
      await Promise.all([fetchPricesBatch(tickers), fetchExchangeRates(posCurrencies, portfolio.currency || "USD")]);
      renderPortfolioData();
    }

    populateSelector();
    renderPortfolioData();

    // Wait for Firebase auth to resolve, then sync portfolios from Firestore
    async function initCloudSync() {
      const firebaseAuth = window.BlackPortfolioAuth?.firebaseAuth;
      if (!firebaseAuth) return;

      const doSync = async () => {
        const synced = await syncPortfoliosFromCloud();
        if (synced) populateSelector();
        renderPortfolioData();
        const portfolio = widget.config.portfolioId ? getPortfolios().find(p => p.id === widget.config.portfolioId) : null;
        if (!portfolio?.positions?.length) return;
        const tickers = [...new Set(portfolio.positions.map(p => p.ticker))];
        const posCurrencies = portfolio.positions.map(p => getPosCurrency(p, portfolio.currency || "USD"));
        Promise.all([fetchPricesBatch(tickers), fetchExchangeRates(posCurrencies, portfolio.currency || "USD")])
          .then(() => renderPortfolioData());
      };

      // If user is already resolved, run immediately; otherwise wait for auth state
      if (firebaseAuth.currentUser) {
        doSync();
      } else {
        const unsub = firebaseAuth.onAuthStateChanged(user => {
          unsub();
          if (user) doSync();
        });
        ref._authUnsub = unsub;
      }
    }
    initCloudSync();

    const _origCleanup = ref.cleanup;
    ref.cleanup = () => {
      if (ref._authUnsub) try { ref._authUnsub(); } catch {}
      if (_origCleanup) _origCleanup();
    };

    ref.refresh = refresh;
  }

  // ── Toolbar actions ─────────────────────────────────────────────────────
  exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "hub-config.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  helpBtn.addEventListener("click", () => {
    alert("Hub:\n\n• Arrastra el encabezado para mover.\n• Arrastra la esquina inferior derecha para redimensionar.\n• Doble clic en el título para renombrar.\n• Cambia entre espacios con las pestañas superiores.\n• Las gráficas y precios se actualizan automáticamente cada minuto.");
  });

  renderAll();

  // Sync hub state from Firestore after Firebase auth resolves
  (async () => {
    const firebaseAuth = window.BlackPortfolioAuth?.firebaseAuth;
    if (!firebaseAuth) return;
    const doSync = async () => {
      const synced = await syncHubStateFromCloud();
      if (synced) renderAll();
    };
    if (firebaseAuth.currentUser) {
      doSync();
    } else {
      firebaseAuth.onAuthStateChanged(user => { if (user) doSync(); });
    }
  })();
})();

// ── KPI info-button: tap/click toggle for touch devices ──────────────────────
(function initKpiTooltips() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".kpi-info-btn");
    document.querySelectorAll(".kpi-info-btn.is-active").forEach(b => {
      if (b !== btn) b.classList.remove("is-active");
    });
    if (btn) {
      btn.classList.toggle("is-active");
      e.stopPropagation();
    }
  });
})();

// ── Empty-state CTA → opens add-widget menu ──────────────────────────────────
(function initEmptyStateCta() {
  const cta = document.getElementById("hubEmptyCta");
  const addBtn = document.getElementById("hubAddWidgetBtn");
  if (cta && addBtn) cta.addEventListener("click", () => addBtn.click());
})();

// ── Settings Enhancements ─────────────────────────────────────────────────────
(function initSettingsEnhancements() {
  const CURRENCY_KEY = "bp-currency";

  // ── Email verified badge ─────────────────────────────────────────────────
  function refreshVerifiedBadge() {
    const user = window.BlackPortfolioAuth.firebaseAuth.currentUser;
    const badge = document.getElementById("emailVerifiedBadge");
    if (!badge || !user) return;
    if (user.emailVerified) {
      badge.textContent = "✓ Verificado";
      badge.className = "settings-verified-badge settings-verified-badge--ok";
    } else {
      badge.textContent = "Sin verificar";
      badge.className = "settings-verified-badge settings-verified-badge--warn";
    }
  }

  // ── Profile name editing ─────────────────────────────────────────────────
  const editNameBtn     = document.getElementById("editNameBtn");
  const editNameForm    = document.getElementById("editNameForm");
  const cancelNameBtn   = document.getElementById("cancelNameBtn");
  const newNameInput    = document.getElementById("newNameInput");
  const nameChangeMsg   = document.getElementById("nameChangeMessage");

  editNameBtn?.addEventListener("click", () => {
    const session = window.BlackPortfolioAuth.getSession();
    if (session) newNameInput.value = session.fullName || "";
    editNameForm.classList.remove("hidden");
    editNameBtn.classList.add("hidden");
    newNameInput.focus();
  });
  cancelNameBtn?.addEventListener("click", () => {
    editNameForm.classList.add("hidden");
    editNameBtn.classList.remove("hidden");
    if (nameChangeMsg) nameChangeMsg.textContent = "";
  });
  editNameForm?.addEventListener("submit", async e => {
    e.preventDefault();
    const newName = newNameInput.value.trim();
    if (!newName) return;
    const submitBtn = editNameForm.querySelector("[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Guardando…";
    if (nameChangeMsg) nameChangeMsg.textContent = "";
    try {
      const user = window.BlackPortfolioAuth.firebaseAuth.currentUser;
      if (!user) throw new Error("No autenticado.");
      await user.updateProfile({ displayName: newName });
      try {
        const extra = JSON.parse(localStorage.getItem(`bp-extra-${user.uid}`) || "{}");
        extra.fullName = newName;
        localStorage.setItem(`bp-extra-${user.uid}`, JSON.stringify(extra));
      } catch {}
      const db = window.BlackPortfolioAuth?.db;
      if (db) db.collection("users").doc(user.uid).update({ fullName: newName }).catch(() => {});
      const session = window.BlackPortfolioAuth.buildSession(user);
      renderUser(session);
      if (nameChangeMsg) { nameChangeMsg.className = "form-message success"; nameChangeMsg.textContent = "✓ Nombre actualizado."; }
      setTimeout(() => {
        editNameForm.classList.add("hidden");
        editNameBtn.classList.remove("hidden");
        if (nameChangeMsg) nameChangeMsg.textContent = "";
      }, 1500);
    } catch (err) {
      if (nameChangeMsg) { nameChangeMsg.className = "form-message error"; nameChangeMsg.textContent = err.message || "Error al actualizar."; }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Guardar nombre";
    }
  });

  // ── Plan & billing ───────────────────────────────────────────────────────
  function renderPlanBilling(session) {
    if (!session) return;
    const planName        = document.getElementById("billingPlanName");
    const renewalDate     = document.getElementById("billingRenewalDate");
    const billingStatus   = document.getElementById("billingStatus");
    const billingPayment  = document.getElementById("billingPaymentMethod");
    const upgradeBtn      = document.getElementById("upgradePlanBtn");

    if (planName) planName.textContent = session.selectedPlan || "—";
    if (billingStatus) billingStatus.innerHTML = '<span style="color:var(--success)">● Activo</span>';
    if (billingPayment) billingPayment.textContent = session.isDemo ? "—" : "•••• 4242";

    if (renewalDate) {
      const base = session.createdAt ? new Date(session.createdAt) : new Date();
      const next = new Date(base);
      next.setMonth(next.getMonth() + 1);
      while (next < new Date()) next.setMonth(next.getMonth() + 1);
      renewalDate.textContent = next.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
    }

    const planLevels = { "Free": 0, "Investor": 1, "Advisor Pro": 2, "Institutional Desk": 3 };
    const level = planLevels[session.selectedPlan] ?? 0;
    if (upgradeBtn) {
      if (level >= 3 || session.isDemo) {
        upgradeBtn.textContent = "Plan máximo activo";
        upgradeBtn.disabled = true;
      } else {
        upgradeBtn.onclick = () => { window.location.href = "index.html#pricing"; };
      }
    }
  }

  document.getElementById("invoiceHistoryBtn")?.addEventListener("click", function() {
    this.textContent = "Sin facturas disponibles";
    setTimeout(() => { this.textContent = "Ver facturas"; }, 2000);
  });

  // ── Active sessions ──────────────────────────────────────────────────────
  function renderActiveSessions(session) {
    const browserEl    = document.getElementById("sessionBrowser");
    const loginTimeEl  = document.getElementById("sessionLoginTime");
    const ua = navigator.userAgent;
    if (browserEl) browserEl.textContent = `${detectBrowser(ua)} · ${detectOS(ua)}`;
    if (loginTimeEl && session?.id) {
      const entries = JSON.parse(localStorage.getItem(`bp-activity-${session.id}`) || "[]");
      if (entries.length > 0) {
        const d = new Date(entries[0].date);
        loginTimeEl.textContent = "Último acceso: " + d.toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      }
    }
  }

  document.getElementById("closeAllSessionsBtn")?.addEventListener("click", () => {
    if (confirm("¿Cerrar sesión en todos los dispositivos?")) {
      window.BlackPortfolioAuth.stopSessionTimeout();
      window.BlackPortfolioAuth.clearSession();
      window.location.href = "login.html";
    }
  });

  // ── Currency preference ──────────────────────────────────────────────────
  function getCurrency(uid) {
    return localStorage.getItem(`${CURRENCY_KEY}-${uid}`) || "USD";
  }
  function renderCurrencyBtns(session) {
    if (!session) return;
    const current = getCurrency(session.id);
    document.querySelectorAll("#currencyBtnGroup [data-currency]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.currency === current);
      btn.addEventListener("click", () => {
        localStorage.setItem(`${CURRENCY_KEY}-${session.id}`, btn.dataset.currency);
        document.querySelectorAll("#currencyBtnGroup [data-currency]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }

  // ── Activity log ─────────────────────────────────────────────────────────
  function renderActivityLog(session) {
    const container = document.getElementById("activityLogContent");
    if (!container || !session?.id) return;
    const entries = JSON.parse(localStorage.getItem(`bp-activity-${session.id}`) || "[]");
    if (entries.length === 0) {
      container.innerHTML = '<p class="activity-log-empty">No hay actividad registrada todavía. Se registrará a partir de tu próximo inicio de sesión.</p>';
      return;
    }
    const rows = entries.map(e => {
      const d = new Date(e.date);
      const dateStr = d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
      const timeStr = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
      return `<tr><td>${dateStr}</td><td>${timeStr}</td><td>${e.device || "—"}</td><td><span class="activity-status-ok">● Exitoso</span></td></tr>`;
    }).join("");
    container.innerHTML = `<table class="activity-log-table"><thead><tr><th>Fecha</th><th>Hora</th><th>Dispositivo</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  // ── Refresh on nav click ─────────────────────────────────────────────────
  function refresh() {
    const user = window.BlackPortfolioAuth.firebaseAuth.currentUser;
    if (!user) return;
    const session = window.BlackPortfolioAuth.buildSession(user);
    refreshVerifiedBadge();
    renderPlanBilling(session);
    renderActiveSessions(session);
    renderCurrencyBtns(session);
    renderActivityLog(session);
  }

  document.querySelectorAll(".dashboard-nav-item[data-section='settings']").forEach(btn => {
    btn.addEventListener("click", refresh);
  });
  if (document.getElementById("section-settings")?.classList.contains("active")) {
    refresh();
  }
})();

// ── Tooltips: convert native title= to styled data-tooltip ───────────────────
(function initTooltips() {
  document.querySelectorAll("[title]").forEach((el) => {
    const txt = el.getAttribute("title");
    if (!txt) return;
    el.setAttribute("data-tooltip", txt);
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", txt);
    el.removeAttribute("title"); // suppress duplicate native tooltip
  });
})();
