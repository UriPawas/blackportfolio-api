const navItems = document.querySelectorAll(".dashboard-nav-item");
const sections = document.querySelectorAll(".dashboard-section");
const mobileBottomNavItems = document.querySelectorAll("[data-mobile-section]");
const mobileMoreButton = document.getElementById("mobileMoreButton");
const mobileActionDock = document.getElementById("mobileActionDock");
const mobilePrimaryAction = document.getElementById("mobilePrimaryAction");
const mobilePrimaryActionLabel = document.getElementById("mobilePrimaryActionLabel");
const mobileDataStatus = document.getElementById("mobileDataStatus");
const mobileDataStatusText = document.getElementById("mobileDataStatusText");
const mobileDataRetryButton = document.getElementById("mobileDataRetryButton");
const logoutButton = document.getElementById("logoutButton");
const logoutButtonSecondary = document.getElementById("logoutButtonSecondary");

const sidebarUserName = document.getElementById("sidebarUserName");
const sidebarUserPlan = document.getElementById("sidebarUserPlan");
const sidebarUserAvatar = document.getElementById("sidebarUserAvatar");
const topbarUserName = document.getElementById("topbarUserName");
const topbarPlan = document.getElementById("topbarPlan");
const topbarUserAvatar = document.getElementById("topbarUserAvatar");

const AVATAR_PRESETS = [
  { id: "1", emoji: "🦊", colors: ["#ff7b54", "#ffb26b"] },
  { id: "2", emoji: "🐯", colors: ["#ffd166", "#ef476f"] },
  { id: "3", emoji: "🦉", colors: ["#6f86ff", "#39d0ff"] },
  { id: "4", emoji: "🐬", colors: ["#00c2cb", "#1a8fe3"] },
  { id: "5", emoji: "🦁", colors: ["#f9844a", "#f3722c"] },
  { id: "6", emoji: "🐼", colors: ["#4361ee", "#7209b7"] },
  { id: "7", emoji: "🦄", colors: ["#f72585", "#7209b7"] },
  { id: "8", emoji: "🐺", colors: ["#43aa8b", "#577590"] }
];

function getAvatarPreset(avatarId) {
  return AVATAR_PRESETS.find(a => a.id === avatarId) || AVATAR_PRESETS[0];
}

function renderAvatarInto(el, session) {
  if (!el) return;
  if (session.photoURL) {
    el.style.background = "none";
    el.innerHTML = `<img src="${session.photoURL}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
  } else {
    const preset = getAvatarPreset(session.avatarId);
    el.style.background = `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})`;
    el.textContent = preset.emoji;
  }
}
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
const chartFullscreenBtn = document.getElementById("chartFullscreenBtn");
const marketChartShell = document.querySelector(".market-chart-shell");

const marketStorageKey = "blackportfolio-market-state";
function getHubStorageKey() {
  const session = window.BlackPortfolioAuth?.getSession();
  return `blackportfolio-hub-state-${session?.id || "anonymous"}`;
}
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
  `,
  heikinashi: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3v18M17 3v18"></path>
      <rect x="5" y="8" width="4" height="6" rx="2"></rect>
      <rect x="15" y="9" width="4" height="8" rx="2"></rect>
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
  stochrsi: { label: "Stoch RSI (14,14,3,3)", type: "panel", panelType: "stochrsi",
            rsiPeriod: 14, period: 14, kSmooth: 3, dSmooth: 3,
            colors: { k: "#39d0ff", d: "#ff8c42" } },
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
  fiboret:{ label: "Fib. Retroceso", type: "fiboret", lookback: 60,
            color: "#39d0ff" },
  srlevels: { label: "Soportes / Resistencias", type: "srlevels", lookback: 200, strength: 3, maxLevels: 3,
            colors: { support: "#32d6a2", resistance: "#ff6b81" } },
  divergence: { label: "Divergencias RSI", type: "divergence", strength: 5, lookback: 150, color: "#c084fc" },
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
  roc:    { label: "ROC (12)", type: "panel", panelType: "roc", period: 12, color: "#f5a623" },
  bbpercent: { label: "BB %B", type: "panel", panelType: "bbpercent", period: 20, mult: 2, color: "#6f86ff" },
  bbwidth:   { label: "BB Width", type: "panel", panelType: "bbwidth", period: 20, mult: 2, color: "#f5a623" }
};

const PANEL_HEIGHTS = { vol: 0.13, rsi: 0.17, macd: 0.19, stoch: 0.15, stochrsi: 0.15, cci: 0.15, atr: 0.13, momentum: 0.15,
  adx: 0.16, obv: 0.13, mfi: 0.15, willr: 0.15, roc: 0.15, bbpercent: 0.15, bbwidth: 0.13 };
const PANEL_GAP = 0.01;

// ── Plan restriction system ───────────────────────────────────────────────────
const _ALL_CHART_TYPES = ["candlestick", "bars", "line", "area", "volheatmap", "heikinashi"];

const PLAN_LIMITS = {
  "-1": { // Explorer
    sections: ["home", "tracker", "markowitz", "analyzer", "settings"],
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
    sections: ["home", "tracker", "markets", "markowitz", "analyzer", "settings"],
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
  3: { // Wealth Desk
    sections: null, ranges: null, chartTypes: null, indicators: null,
    maxIndicators: Infinity, maxPortfolios: Infinity
  }
};

function getPlanLevel(session) {
  if (!session || session.isDemo) return 0;
  return { "Explorer": -1, "Investor": 1, "Advisor Pro": 2, "Wealth Desk": 3 }[session.selectedPlan] ?? -1;
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

// Toast genérico. opts: { type: "info"|"error"|"success", actionLabel, onAction, duration }
function showToast(message, opts = {}) {
  document.getElementById("appToast")?.remove();
  const toast = document.createElement("div");
  toast.id = "appToast";
  toast.className = "app-toast" + (opts.type ? " app-toast--" + opts.type : "");
  toast.setAttribute("role", "status");
  const span = document.createElement("span");
  span.textContent = message;
  toast.appendChild(span);
  let timer;
  if (opts.actionLabel && typeof opts.onAction === "function") {
    const btn = document.createElement("button");
    btn.className = "app-toast-action";
    btn.type = "button";
    btn.textContent = opts.actionLabel;
    btn.addEventListener("click", () => {
      clearTimeout(timer);
      toast.remove();
      opts.onAction();
    });
    toast.appendChild(btn);
  }
  document.body.appendChild(toast);
  timer = setTimeout(() => toast.remove(), opts.duration ?? 4500);
  return toast;
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
  syncMobileNavigationRestrictions();

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
let _markerSources = {};

function applyAllMarkers() {
  if (!mainSeries) return;
  const all = Object.values(_markerSources).flat().sort((a, b) => a.time - b.time);
  mainSeries.setMarkers(all);
}
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

  [sidebarUserAvatar, topbarUserAvatar].forEach(el => el?.classList.remove("is-skeleton"));
  renderAvatarInto(sidebarUserAvatar, session);
  renderAvatarInto(topbarUserAvatar, session);
  const settingsPreview = document.getElementById("settingsAvatarPreview");
  const avatarHint = document.getElementById("settingsAvatarHint");
  const editAvatarBtn = document.getElementById("editAvatarBtn");
  if (settingsPreview) renderAvatarInto(settingsPreview, session);
  if (avatarHint) avatarHint.textContent = session.isGoogle ? "Foto de tu cuenta de Google" : "Predeterminado";
  if (editAvatarBtn) editAvatarBtn.classList.toggle("hidden", !!session.isGoogle);
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

function syncMobileNavigationRestrictions() {
  mobileBottomNavItems.forEach((item) => {
    const source = document.querySelector(`.dashboard-nav-item[data-section="${item.dataset.mobileSection}"]`);
    const locked = source?.dataset.locked === "1";
    item.classList.toggle("is-locked", locked);
    item.setAttribute("aria-disabled", locked ? "true" : "false");
  });
}

function syncMobileNavigation(sectionId) {
  mobileBottomNavItems.forEach((item) => {
    const selected = item.dataset.mobileSection === sectionId;
    item.classList.toggle("active", selected);
    item.setAttribute("aria-current", selected ? "page" : "false");
  });
  const secondarySection = !["home", "tracker", "markets"].includes(sectionId);
  mobileMoreButton?.classList.toggle("active", secondarySection);
  mobileMoreButton?.setAttribute("aria-current", secondarySection ? "page" : "false");
}

function getMobilePrimaryAction(sectionId) {
  if (sectionId === "home") return { target: "hubAddWidgetBtn", label: "Agregar widget" };
  if (sectionId === "tracker") {
    const detailOpen = !document.getElementById("trackerDashView")?.classList.contains("hidden");
    return detailOpen
      ? { target: "addPositionBtn", label: "Agregar posición" }
      : { target: "newPortfolioBtn", label: "Nuevo portafolio" };
  }
  if (sectionId === "markets") return { target: "tickerInput", label: "Buscar activo", focus: true };
  if (sectionId === "markowitz") return { target: "mkwRunBtn", label: "Optimizar portafolio" };
  if (sectionId === "analyzer") return { target: "analyzerRunBtn", label: "Analizar activos" };
  return null;
}

let _mobileDockObserver = null;
let _mobileDockTargetVisible = false;

function syncMobilePrimaryAction(sectionId = activeSection) {
  const config = getMobilePrimaryAction(sectionId);
  const target = config ? document.getElementById(config.target) : null;
  const eligible = window.innerWidth <= 720 && Boolean(target);

  // Oculta el dock flotante mientras el CTA inline equivalente ya es visible
  // en pantalla, para no duplicar el botón ni tapar contenido al final del
  // scroll (bug #3). Se reobserva el target cada vez que cambia.
  _mobileDockObserver?.disconnect();
  _mobileDockObserver = null;
  _mobileDockTargetVisible = false;
  if (eligible && "IntersectionObserver" in window) {
    _mobileDockObserver = new IntersectionObserver((entries) => {
      _mobileDockTargetVisible = entries[0]?.isIntersecting ?? false;
      mobileActionDock?.classList.toggle("hidden", !eligible || _mobileDockTargetVisible);
    }, { threshold: 0.1 });
    _mobileDockObserver.observe(target);
  }

  mobileActionDock?.classList.toggle("hidden", !eligible || _mobileDockTargetVisible);
  if (!eligible || !mobilePrimaryAction) return;
  mobilePrimaryAction.dataset.target = config.target;
  mobilePrimaryAction.dataset.focusTarget = config.focus ? "1" : "0";
  mobilePrimaryAction.disabled = Boolean(target.disabled);
  mobilePrimaryActionLabel.textContent = config.label;
}

function initMobileDisclosures() {
  const analyzerCards = Array.from(document.querySelectorAll("#analyzerResults > .anlz-card"))
    .filter((card, index) => index > 0 && !card.classList.contains("anlz-decision-card") && !card.classList.contains("anlz-ai-card"));
  const cards = [
    document.getElementById("mkwCalcCard"),
    document.getElementById("marketWlSidebar"),
    document.getElementById("marketStatsRail"),
    ...analyzerCards
  ].filter(Boolean);

  cards.forEach((card, index) => {
    if (card.dataset.mobileDisclosure === "ready") return;
    card.dataset.mobileDisclosure = "ready";
    card.classList.add("mobile-collapsible");
    const header = card.querySelector(":scope > .card-header, :scope > .anlz-card-header, :scope > .market-wl-head, :scope > .stats-rail-head");
    if (!header) return;
    const button = document.createElement("button");
    button.className = "mobile-disclosure-toggle";
    button.type = "button";
    const heading = header.querySelector("h2, h3, h4")?.textContent?.trim() || `sección ${index + 1}`;
    button.setAttribute("aria-label", `Mostrar detalles de ${heading}`);
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = '<span>Mostrar</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>';
    button.addEventListener("click", () => {
      const collapsed = card.classList.toggle("is-mobile-collapsed");
      button.setAttribute("aria-expanded", collapsed ? "false" : "true");
      button.setAttribute("aria-label", `${collapsed ? "Mostrar" : "Ocultar"} detalles de ${heading}`);
      button.querySelector("span").textContent = collapsed ? "Mostrar" : "Ocultar";
    });
    header.appendChild(button);
  });

  const mobileQuery = window.matchMedia("(max-width: 720px)");
  const applyMode = () => {
    const mobile = mobileQuery.matches;
    cards.forEach((card) => {
      const button = card.querySelector(":scope > .card-header .mobile-disclosure-toggle, :scope > .anlz-card-header .mobile-disclosure-toggle, :scope > .market-wl-head .mobile-disclosure-toggle, :scope > .stats-rail-head .mobile-disclosure-toggle");
      if (!button) return;
      card.classList.toggle("is-mobile-collapsed", mobile);
      button.setAttribute("aria-expanded", mobile ? "false" : "true");
      const heading = card.querySelector(":scope > .card-header h2, :scope > .card-header h3, :scope > .anlz-card-header h2, :scope > .anlz-card-header h3")?.textContent?.trim() || "esta sección";
      button.setAttribute("aria-label", `${mobile ? "Mostrar" : "Ocultar"} detalles de ${heading}`);
      button.querySelector("span").textContent = mobile ? "Mostrar" : "Ocultar";
    });
  };
  applyMode();
  if (mobileQuery.addEventListener) mobileQuery.addEventListener("change", applyMode);
  else mobileQuery.addListener(applyMode);
}

let mobileDataStatusTimer = null;
function showMobileDataStatus(message, state = "info", persistent = false) {
  if (!mobileDataStatus || !mobileDataStatusText) return;
  clearTimeout(mobileDataStatusTimer);
  mobileDataStatusText.textContent = message;
  mobileDataStatus.dataset.state = state;
  mobileDataStatus.classList.remove("hidden");
  mobileDataRetryButton.hidden = state !== "offline" && state !== "error";
  if (!persistent) {
    mobileDataStatusTimer = setTimeout(() => mobileDataStatus.classList.add("hidden"), 2800);
  }
}

function retryMobileData() {
  if (!navigator.onLine) {
    showMobileDataStatus("Sigues sin conexión. Revisa tu red e inténtalo nuevamente.", "offline", true);
    return;
  }
  const targets = {
    tracker: "refreshPricesBtn",
    markets: "applyTickerButton",
    topdown: "tdRefreshBtn",
    markowitz: "mkwRunBtn",
    analyzer: "analyzerRunBtn"
  };
  if (activeSection === "home") {
    document.querySelectorAll('.hub-widget-btn[title="Actualizar"]').forEach((button) => button.click());
  } else {
    const target = document.getElementById(targets[activeSection]);
    if (target && !target.disabled) target.click();
  }
  showMobileDataStatus("Reintento solicitado. Conservamos los últimos datos visibles.", "loading");
}

function initMobileDataStatus() {
  window.addEventListener("offline", () => {
    showMobileDataStatus("Sin conexión. Se muestran los últimos datos disponibles.", "offline", true);
  });
  window.addEventListener("online", () => {
    showMobileDataStatus("Conexión restablecida. Puedes actualizar los datos.", "online");
  });
  mobileDataRetryButton?.addEventListener("click", retryMobileData);
  document.addEventListener("click", (event) => {
    if (!event.target.closest?.("#refreshPricesBtn, #applyTickerButton, #tdRefreshBtn, .hub-widget-btn[title='Actualizar']")) return;
    showMobileDataStatus("Actualizando datos…", "loading");
  });
  ["dashPriceStatus", "marketChartStatus", "perfChartStatus", "investmentValueStatus"].forEach((id) => {
    const source = document.getElementById(id);
    if (!source) return;
    const reflectStatus = () => {
      const message = source.textContent.trim();
      if (!message) return;
      if (/error|no se pudo|no disponible|desactualiz/i.test(message)) {
        showMobileDataStatus(`${message} Puedes reintentar sin perder la vista actual.`, "error", true);
      } else if (/actualizad|correctamente|completad/i.test(message)) {
        showMobileDataStatus(message, "online");
      }
    };
    new MutationObserver(reflectStatus).observe(source, { childList: true, characterData: true, subtree: true, attributes: true });
  });
  if (!navigator.onLine) {
    showMobileDataStatus("Sin conexión. Se muestran los últimos datos disponibles.", "offline", true);
  }
}

function initMobileQuickStart() {
  document.getElementById("mobileQuickStart")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mobile-quick]");
    if (!button) return;
    const action = button.dataset.mobileQuick;
    if (action === "tracker") {
      activateSection("tracker");
      requestAnimationFrame(() => document.getElementById("newPortfolioBtn")?.click());
      return;
    }
    if (action === "profile") {
      activateSection("settings");
      requestAnimationFrame(() => {
        document.querySelector("[data-settings-tab='investor']")?.click();
        document.getElementById("startInvestorProfileBtn")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    if (action === "markets") {
      activateSection("markets");
      requestAnimationFrame(() => {
        const input = document.getElementById("tickerInput");
        input?.scrollIntoView({ behavior: "smooth", block: "center" });
        input?.focus();
      });
    }
  });
}

// Oculta la barra de inicio rápido móvil una vez que el usuario ya tiene al
// menos un portafolio: el chip "Crear portafolio" deja de ser relevante y
// competía con el contenido del tracker (bug #7 / móvil-tablet #9).
function updateMobileQuickStartVisibility() {
  const el = document.getElementById("mobileQuickStart");
  if (!el || typeof getPortfolios !== "function") return;
  el.classList.toggle("is-dismissed", getPortfolios().length > 0);
}

function applyMobileTableLabels() {
  const labelSets = [
    ["#positionsTableBody > .pos-row", ["Activo", "Fecha", "Precio prom.", "Precio actual", "Cantidad", "Costo total", "Valor actual", "Retorno", "Acciones"]],
    ["#txTableBody > tr", ["Fecha", "Tipo", "Ticker", "Cantidad", "Precio", "Comision", "Total neto", "Acciones"]],
    ["#summaryTableBody > tr", ["Activo", "Valor", "Peso"]],
    ["#watchlistTableBody > tr", ["Activo", "Precio", "Cambio", "Acciones"]],
    ["#divByTickerTable tbody > tr", ["Ticker", "Dividendos", "Monto", "Ultimo pago"]],
    ["#divForecastTable tbody > tr", ["Ticker", "Fecha", "Monto estimado", "Estado"]],
    ["#rebalTable tbody > tr", ["Activo", "Actual", "Objetivo", "Diferencia", "Operacion"]]
  ];
  labelSets.forEach(([selector, labels]) => {
    document.querySelectorAll(selector).forEach((row) => {
      Array.from(row.children).forEach((cell, index) => {
        if (cell.tagName !== "TD" || cell.dataset.label) return;
        cell.dataset.label = labels[index] || "";
      });
    });
  });
}

function initMobileTableLabels() {
  applyMobileTableLabels();
  ["positionsTableBody", "txTableBody", "summaryTableBody", "watchlistTableBody", "divByTickerTable", "divForecastTable", "rebalTable"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) new MutationObserver(applyMobileTableLabels).observe(element, { childList: true, subtree: true });
  });
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
  window.bpTrack?.("section_view", { section: sectionId });

  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.section === sectionId);
  });

  sections.forEach((section) => {
    section.classList.toggle("active", section.id === `section-${sectionId}`);
  });

  syncMobileNavigation(sectionId);
  syncMobilePrimaryAction(sectionId);

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

function computeHeikinAshi(candles) {
  const result = [];
  let prevOpen, prevClose;
  candles.forEach((c, i) => {
    const close = (c.open + c.high + c.low + c.close) / 4;
    const open = i === 0 ? (c.open + c.close) / 2 : (prevOpen + prevClose) / 2;
    const high = Math.max(c.high, open, close);
    const low = Math.min(c.low, open, close);
    result.push({ time: c.time, open, high, low, close });
    prevOpen = open; prevClose = close;
  });
  return result;
}

function computeStochRSI(closes, rsiPeriod = 14, stochPeriod = 14, kSmooth = 3, dSmooth = 3) {
  const rsi = computeRSI(closes, rsiPeriod);
  if (rsi.length < stochPeriod) return { k: [], d: [] };
  const fastK = [];
  for (let i = stochPeriod - 1; i < rsi.length; i++) {
    const window = rsi.slice(i - stochPeriod + 1, i + 1).map(v => v.value);
    const hh = Math.max(...window), ll = Math.min(...window);
    const range = hh - ll;
    fastK.push({ time: rsi[i].time, value: range === 0 ? 50 : (rsi[i].value - ll) / range * 100 });
  }
  const slowK = computeSMA(fastK, kSmooth);
  const slowD = computeSMA(slowK, dSmooth);
  return { k: slowK, d: slowD };
}

function computeBBDerived(closeData, period, mult) {
  const { upper, mid, lower } = computeBB(closeData, period, mult);
  if (!upper.length) return { percentB: [], width: [] };
  const closeMap = new Map(closeData.map(d => [d.time, d.value]));
  const percentB = [], width = [];
  for (let i = 0; i < upper.length; i++) {
    const range = upper[i].value - lower[i].value;
    const close = closeMap.get(upper[i].time);
    percentB.push({ time: upper[i].time, value: range === 0 ? 0.5 : (close - lower[i].value) / range });
    width.push({ time: upper[i].time, value: mid[i].value === 0 ? 0 : (range / mid[i].value) * 100 });
  }
  return { percentB, width };
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

function findSwingPoints(candles, strength = 3) {
  const highs = [], lows = [];
  for (let i = strength; i < candles.length - strength; i++) {
    const c = candles[i];
    let isHigh = true, isLow = true;
    for (let j = i - strength; j <= i + strength; j++) {
      if (j === i) continue;
      if (candles[j].high >= c.high) isHigh = false;
      if (candles[j].low <= c.low) isLow = false;
    }
    if (isHigh) highs.push(c.high);
    if (isLow) lows.push(c.low);
  }
  return { highs, lows };
}

function clusterLevels(values, tolerancePct) {
  if (!values.length) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const clusters = [];
  let current = { sum: sorted[0], count: 1 };
  for (let i = 1; i < sorted.length; i++) {
    const v = sorted[i];
    const center = current.sum / current.count;
    if (Math.abs(v - center) / center <= tolerancePct) {
      current.sum += v; current.count++;
    } else {
      clusters.push(current);
      current = { sum: v, count: 1 };
    }
  }
  clusters.push(current);
  return clusters.map((c) => ({ price: c.sum / c.count, touches: c.count }));
}

function computeSupportResistance(candles, lookback = 200, strength = 3, maxLevels = 3) {
  const n = candles.length;
  if (n < strength * 2 + 5) return { support: [], resistance: [] };
  const start = Math.max(0, n - lookback);
  const slice = candles.slice(start);
  const { highs, lows } = findSwingPoints(slice, strength);
  const currentPrice = candles[n - 1].close;
  const tolerancePct = 0.012;
  const resistance = clusterLevels(highs, tolerancePct)
    .filter((c) => c.price > currentPrice)
    .sort((a, b) => b.touches - a.touches || a.price - b.price)
    .slice(0, maxLevels);
  const support = clusterLevels(lows, tolerancePct)
    .filter((c) => c.price < currentPrice)
    .sort((a, b) => b.touches - a.touches || b.price - a.price)
    .slice(0, maxLevels);
  return { support, resistance };
}

function findPivots(values, strength) {
  const highs = [], lows = [];
  for (let i = strength; i < values.length - strength; i++) {
    let isHigh = true, isLow = true;
    for (let j = i - strength; j <= i + strength; j++) {
      if (j === i) continue;
      if (values[j].value >= values[i].value) isHigh = false;
      if (values[j].value <= values[i].value) isLow = false;
    }
    if (isHigh) highs.push(i);
    if (isLow) lows.push(i);
  }
  return { highs, lows };
}

function computeDivergences(closeData, rsiData, strength = 5, lookback = 150) {
  if (closeData.length < strength * 2 + 10 || rsiData.length < strength * 2 + 10) return [];
  const rsiMap = new Map(rsiData.map((p) => [p.time, p.value]));
  const n = closeData.length;
  const start = Math.max(0, n - lookback);
  const points = closeData.slice(start)
    .filter((p) => rsiMap.has(p.time))
    .map((p) => ({ time: p.time, price: p.value, rsi: rsiMap.get(p.time) }));
  const priceVals = points.map((p) => ({ time: p.time, value: p.price }));
  const { highs: priceHighs, lows: priceLows } = findPivots(priceVals, strength);
  const markers = [];

  for (let k = 1; k < priceHighs.length; k++) {
    const i1 = priceHighs[k - 1], i2 = priceHighs[k];
    if (points[i2].price > points[i1].price && points[i2].rsi < points[i1].rsi) {
      markers.push({ time: points[i2].time, position: "aboveBar", color: "#ff4d6a", shape: "arrowDown", text: "Div ↓" });
    }
  }
  for (let k = 1; k < priceLows.length; k++) {
    const i1 = priceLows[k - 1], i2 = priceLows[k];
    if (points[i2].price < points[i1].price && points[i2].rsi > points[i1].rsi) {
      markers.push({ time: points[i2].time, position: "belowBar", color: "#32d6a2", shape: "arrowUp", text: "Div ↑" });
    }
  }
  return markers;
}

function computeTechnicalRating(closes, highs, lows, volumes) {
  const last = (arr) => arr.length ? arr[arr.length - 1].value : null;
  const oscVotes = [];

  const rsi = last(computeRSI(closes, 14));
  if (rsi != null) oscVotes.push(rsi < 30 ? 1 : rsi > 70 ? -1 : 0);

  const stochK = last(computeStoch(highs, lows, closes, 14, 3, 3).k);
  if (stochK != null) oscVotes.push(stochK < 20 ? 1 : stochK > 80 ? -1 : 0);

  const cci = last(computeCCI(highs, lows, closes, 20));
  if (cci != null) oscVotes.push(cci < -100 ? 1 : cci > 100 ? -1 : 0);

  const macd = computeMACD(closes);
  if (macd.macdLine.length) {
    const m = macd.macdLine[macd.macdLine.length - 1].value;
    const s = macd.signalLine[macd.signalLine.length - 1].value;
    oscVotes.push(m > s ? 1 : m < s ? -1 : 0);
  }

  const adxData = computeADX(highs, lows, closes, 14);
  if (adxData.adx.length) {
    const adx = adxData.adx[adxData.adx.length - 1].value;
    const pdi = adxData.plusDi[adxData.plusDi.length - 1].value;
    const mdi = adxData.minusDi[adxData.minusDi.length - 1].value;
    oscVotes.push(adx > 20 ? (pdi > mdi ? 1 : pdi < mdi ? -1 : 0) : 0);
  }

  const willr = last(computeWilliamsR(highs, lows, closes, 14));
  if (willr != null) oscVotes.push(willr < -80 ? 1 : willr > -20 ? -1 : 0);

  const roc = last(computeROC(closes, 12));
  if (roc != null) oscVotes.push(roc > 0 ? 1 : roc < 0 ? -1 : 0);

  const mfi = last(computeMFI(highs, lows, closes, volumes, 14));
  if (mfi != null) oscVotes.push(mfi < 20 ? 1 : mfi > 80 ? -1 : 0);

  const maVotes = [];
  const price = closes[closes.length - 1]?.value;
  if (price != null) {
    [10, 20, 30, 50, 100, 200].forEach((p) => {
      const sma = last(computeSMA(closes, p));
      if (sma != null) maVotes.push(price > sma ? 1 : price < sma ? -1 : 0);
      if (closes.length >= p) {
        const ema = last(computeEMA(closes, p));
        if (ema != null) maVotes.push(price > ema ? 1 : price < ema ? -1 : 0);
      }
    });
  }

  const count = (arr, v) => arr.filter((x) => x === v).length;
  const allVotes = [...oscVotes, ...maVotes];
  const buy = count(allVotes, 1), sell = count(allVotes, -1), neutral = count(allVotes, 0);
  const total = allVotes.length;
  const score = total ? (buy - sell) / total : 0;

  let label, cls;
  if (score >= 0.5) { label = "Compra fuerte"; cls = "strong-buy"; }
  else if (score >= 0.1) { label = "Compra"; cls = "buy"; }
  else if (score <= -0.5) { label = "Venta fuerte"; cls = "strong-sell"; }
  else if (score <= -0.1) { label = "Venta"; cls = "sell"; }
  else { label = "Neutral"; cls = "neutral"; }

  return {
    label, cls, score,
    oscillators: { buy: count(oscVotes, 1), sell: count(oscVotes, -1), neutral: count(oscVotes, 0) },
    movingAverages: { buy: count(maVotes, 1), sell: count(maVotes, -1), neutral: count(maVotes, 0) }
  };
}

function renderTechnicalRating() {
  const el = document.getElementById("technicalRatingCard");
  if (!el) return;
  if (!lastCloses.length) { el.innerHTML = ""; return; }
  const r = computeTechnicalRating(lastCloses, lastHighs, lastLows, lastVolumes);
  const pct = Math.max(0, Math.min(100, ((r.score + 1) / 2) * 100));
  el.innerHTML = `
    <div class="tr-head">
      <span class="tr-title">Calificación técnica</span>
      <span class="tr-badge tr-${r.cls}">${r.label}</span>
    </div>
    <div class="tr-gauge">
      <div class="tr-gauge-track">
        <div class="tr-gauge-marker" style="left:${pct}%"></div>
      </div>
      <div class="tr-gauge-labels"><span>Venta</span><span>Neutral</span><span>Compra</span></div>
    </div>
    <div class="tr-breakdown">
      <div class="tr-bd-row"><span>Osciladores</span><strong>${r.oscillators.buy}C / ${r.oscillators.neutral}N / ${r.oscillators.sell}V</strong></div>
      <div class="tr-bd-row"><span>Medias móviles</span><strong>${r.movingAverages.buy}C / ${r.movingAverages.neutral}N / ${r.movingAverages.sell}V</strong></div>
    </div>
  `;
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

function renderStochRSIPanel(closes, pos, cfg) {
  const rsiPeriod = cfg.rsiPeriod ?? 14, stochPeriod = cfg.period ?? 14;
  const kSmooth = cfg.kSmooth ?? 3, dSmooth = cfg.dSmooth ?? 3;
  const { k, d } = computeStochRSI(closes, rsiPeriod, stochPeriod, kSmooth, dSmooth);
  if (!k.length) return;
  const c = cfg.colors || indicatorDefinitions.stochrsi.colors;
  addPanelLineSeries("stochrsi", pos, { color: c.k, lineWidth: 1.5, lastValueVisible: true }).setData(k);
  addPanelLineSeries("stochrsi", pos, { color: c.d, lineWidth: 1 }).setData(d);
  addPanelLineSeries("stochrsi", pos, { color: "rgba(255,107,129,0.4)", lineWidth: 1, lineStyle: 2 })
    .setData(k.map(p => ({ time: p.time, value: 80 })));
  addPanelLineSeries("stochrsi", pos, { color: "rgba(50,214,162,0.4)", lineWidth: 1, lineStyle: 2 })
    .setData(k.map(p => ({ time: p.time, value: 20 })));
  computedIndicatorData.stochrsi = { k, d };
}

function renderBBPercentPanel(closes, pos, cfg) {
  const period = cfg.period ?? 20, mult = cfg.mult ?? 2;
  const { percentB } = computeBBDerived(closes, period, mult);
  if (!percentB.length) return;
  const color = cfg.color ?? indicatorDefinitions.bbpercent.color;
  addPanelLineSeries("bbpercent", pos, { color, lineWidth: 1.5, lastValueVisible: true }).setData(percentB);
  addPanelLineSeries("bbpercent", pos, { color: "rgba(255,107,129,0.4)", lineWidth: 1, lineStyle: 2 })
    .setData(percentB.map(p => ({ time: p.time, value: 1 })));
  addPanelLineSeries("bbpercent", pos, { color: "rgba(50,214,162,0.4)", lineWidth: 1, lineStyle: 2 })
    .setData(percentB.map(p => ({ time: p.time, value: 0 })));
  computedIndicatorData.bbpercent = percentB;
}

function renderBBWidthPanel(closes, pos, cfg) {
  const period = cfg.period ?? 20, mult = cfg.mult ?? 2;
  const { width } = computeBBDerived(closes, period, mult);
  if (!width.length) return;
  const color = cfg.color ?? indicatorDefinitions.bbwidth.color;
  addPanelLineSeries("bbwidth", pos, { color, lineWidth: 1.5, lastValueVisible: true }).setData(width);
  computedIndicatorData.bbwidth = width;
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
  _markerSources.divergence = [];

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
    if (def.type === "fiboret") {
      if (!lastCandles.length) return;
      const fib = computeAutoFibExtension(lastCandles, cfg.lookback ?? 60);
      if (!fib) return;
      const color = cfg.color ?? def.color;
      fib.levels.filter((lvl) => lvl.ratio <= 1).forEach((lvl) => {
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
    if (def.type === "srlevels") {
      if (!lastCandles.length) return;
      const { support, resistance } = computeSupportResistance(lastCandles, cfg.lookback ?? 200, cfg.strength ?? 3, cfg.maxLevels ?? 3);
      const c = cfg.colors || def.colors;
      resistance.forEach((lvl) => {
        const pl = mainSeries.createPriceLine({
          price: lvl.price, color: c.resistance, lineWidth: 1, lineStyle: 2,
          axisLabelVisible: true, title: `R ${lvl.touches}x`
        });
        fiboPriceLines.push(pl);
      });
      support.forEach((lvl) => {
        const pl = mainSeries.createPriceLine({
          price: lvl.price, color: c.support, lineWidth: 1, lineStyle: 2,
          axisLabelVisible: true, title: `S ${lvl.touches}x`
        });
        fiboPriceLines.push(pl);
      });
      computedIndicatorData[key] = { support, resistance };
      return;
    }
    if (def.type === "divergence") {
      if (!closeData.length) return;
      const rsiData = computeRSI(closeData, 14);
      const markers = computeDivergences(closeData, rsiData, cfg.strength ?? 5, cfg.lookback ?? 150);
      _markerSources.divergence = markers;
      computedIndicatorData[key] = markers;
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
    else if (key === "stochrsi") renderStochRSIPanel(closeData, pos, cfg);
    else if (key === "bbpercent") renderBBPercentPanel(closeData, pos, cfg);
    else if (key === "bbwidth") renderBBWidthPanel(closeData, pos, cfg);
    else if (key === "cci")   renderCCIPanel(lastHighs, lastLows, closeData, pos, cfg);
    else if (key === "atr")   renderATRPanel(lastHighs, lastLows, closeData, pos, cfg);
    else if (key === "momentum") renderMomentumPanel(closeData, pos);
    else if (key === "adx")   renderADXPanel(lastHighs, lastLows, closeData, pos, cfg);
    else if (key === "obv")   renderOBVPanel(closeData, volumeData, pos, cfg);
    else if (key === "mfi")   renderMFIPanel(lastHighs, lastLows, closeData, volumeData, pos, cfg);
    else if (key === "willr") renderWillRPanel(lastHighs, lastLows, closeData, pos, cfg);
    else if (key === "roc")   renderROCPanel(closeData, pos, cfg);
  });

  applyAllMarkers();
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
    } else if (marketState.chartType === "heikinashi") {
      mainSeries.setData(computeHeikinAshi(candles));
    } else if (marketState.chartType === "candlestick" || marketState.chartType === "bars") {
      mainSeries.setData(candles);
    } else {
      mainSeries.setData(closes);
    }

    _markerSources = {};
    renderIndicators(closes, volumes);
    renderTechnicalRating();
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
    const label = entry.value_classification || "—";
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
  } catch (err) {
    console.error("FNG gauge error:", err);
    el.innerHTML = `
      <div class="fng-gauge-label">
        <span class="fng-gauge-value" style="color:#999">—</span>
        <span class="fng-gauge-text">F&amp;G</span>
      </div>`;
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
  _markerSources.dividends = [];
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
    _markerSources.dividends = markers;
    applyAllMarkers();
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
    // Dispositivo de confianza (verificó el código hace <3.5 días) con token de
    // sesión 2FA vivo: no rebotar al login, el backend valida el token igualmente.
    let trusted = false;
    try {
      const ts = parseInt(localStorage.getItem("totp_trusted_" + user.uid) || "", 10);
      trusted = Number.isFinite(ts)
        && (Date.now() - ts) <= 3.5 * 24 * 60 * 60 * 1000
        && !!localStorage.getItem("bp-2fa-token");
    } catch {}
    if (!isDemo && !trusted && await window.BlackPortfolioAuth.isTwoFactorEnabled(user.uid)) {
      window.location.href = "login.html";
      return;
    }
    sessionStorage.setItem("totp_verified", user.uid);
  }
  await window.BlackPortfolioAuth.syncFromFirestore(user.uid);
  await syncPortfoliosFromCloud();
  updateMobileQuickStartVisibility();
  const session = window.BlackPortfolioAuth.buildSession(user);
  renderUser(session);
  applyPlanRestrictions(session);
  if (!_appInitialized) {
    _appInitialized = true;
    updateHeading("home");
    window.BlackPortfolioAuth.startSessionTimeout();
    recordActivityEntry(user.uid);
    maybeStartOnboarding(user.uid);
    initNotifications();
    initAlertsUI();
  }
});

document.getElementById("replayTourButton")?.addEventListener("click", () => startOnboarding());

// ── #3 Onboarding / tour de bienvenida ─────────────────────────────────────
const ONBOARDING_STEPS = [
  { selector: null, title: "Bienvenido a BlackPortfolio", text: "Te muestro en 30 segundos las herramientas clave. Puedes saltar el tour cuando quieras." },
  { selector: '.dashboard-nav-item[data-section="tracker"]', title: "Portafolio Tracker", text: "Registra tus posiciones reales y sigue rendimiento, XIRR, dividendos, correlación y rebalanceo." },
  { selector: '.dashboard-nav-item[data-section="markowitz"]', title: "Creación de portafolio", text: "Optimiza la mezcla riesgo/retorno (Markowitz) y valídala con un backtest walk-forward." },
  { selector: '.dashboard-nav-item[data-section="topdown"]', title: "Análisis Top-Down", text: "Lee el régimen macro del mercado y el mapa de fuerza relativa por sectores." },
  { selector: '.dashboard-nav-item[data-section="markets"]', title: "Mercados", text: "Busca cualquier ticker y analiza su gráfico con más de 12 indicadores técnicos." },
  { selector: '.dashboard-nav-item[data-section="analyzer"]', title: "Analizador", text: "Valora una acción por flujos descontados (DCF) y simula su precio con Monte Carlo." },
  { selector: null, title: "¿Lo probamos con un ejemplo?", text: "Cargo un portafolio de muestra en “Creación de portafolio” y ejecuto una optimización para que lo veas en acción.", cta: "Cargar ejemplo" },
];
let _onbIdx = 0;
function onboardingKey(uid) { return `bp-onboarding-done-${uid || "anon"}`; }
function _currentUid() {
  try { return window.BlackPortfolioAuth?.firebaseAuth?.currentUser?.uid || "anon"; } catch { return "anon"; }
}
function maybeStartOnboarding(uid) {
  try { if (localStorage.getItem(onboardingKey(uid))) return; } catch {}
  setTimeout(() => startOnboarding(), 600); // deja que el layout/sidebar pinte
}
function startOnboarding() {
  if (document.getElementById("bpOnbOverlay")) return;
  _onbIdx = 0;
  const overlay = document.createElement("div");
  overlay.id = "bpOnbOverlay";
  overlay.innerHTML = `
    <div id="bpOnbRing"></div>
    <div id="bpOnbTip" role="dialog" aria-modal="true">
      <div id="bpOnbStepCount"></div>
      <h3 id="bpOnbTitle"></h3>
      <p id="bpOnbText"></p>
      <div class="bp-onb-actions">
        <button id="bpOnbSkip" class="bp-onb-skip" type="button">Saltar</button>
        <div class="bp-onb-nav">
          <button id="bpOnbPrev" class="button ghost" type="button">Atrás</button>
          <button id="bpOnbNext" class="button primary" type="button">Siguiente</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById("bpOnbSkip").addEventListener("click", () => endOnboarding(true));
  document.getElementById("bpOnbPrev").addEventListener("click", () => { if (_onbIdx > 0) { _onbIdx--; renderOnboardingStep(); } });
  document.getElementById("bpOnbNext").addEventListener("click", onboardingNext);
  overlay.addEventListener("click", e => { if (e.target.id === "bpOnbOverlay") endOnboarding(true); });
  window.addEventListener("resize", _onbReposition);
  document.addEventListener("keydown", _onbKey);
  renderOnboardingStep();
}
function onboardingNext() {
  const step = ONBOARDING_STEPS[_onbIdx];
  if (step.cta) { loadOnboardingExample(); return; }
  if (_onbIdx < ONBOARDING_STEPS.length - 1) { _onbIdx++; renderOnboardingStep(); }
  else endOnboarding(true);
}
function _onbKey(e) {
  if (e.key === "Escape") endOnboarding(true);
  else if (e.key === "ArrowRight" || e.key === "Enter") onboardingNext();
  else if (e.key === "ArrowLeft" && _onbIdx > 0) { _onbIdx--; renderOnboardingStep(); }
}
function renderOnboardingStep() {
  const step = ONBOARDING_STEPS[_onbIdx];
  if (!document.getElementById("bpOnbTip")) return;
  document.getElementById("bpOnbStepCount").textContent = `Paso ${_onbIdx + 1} de ${ONBOARDING_STEPS.length}`;
  document.getElementById("bpOnbTitle").textContent = step.title;
  document.getElementById("bpOnbText").textContent = step.text;
  document.getElementById("bpOnbPrev").style.visibility = _onbIdx === 0 ? "hidden" : "visible";
  document.getElementById("bpOnbNext").textContent = step.cta ? step.cta : (_onbIdx === ONBOARDING_STEPS.length - 1 ? "Finalizar" : "Siguiente");
  _onbReposition();
}
function _onbReposition() {
  const step = ONBOARDING_STEPS[_onbIdx];
  const tip = document.getElementById("bpOnbTip");
  const ring = document.getElementById("bpOnbRing");
  if (!tip || !ring) return;
  const target = step.selector ? document.querySelector(step.selector) : null;
  const r = target ? target.getBoundingClientRect() : null;
  if (r && r.width > 0 && r.left >= 0) {
    const pad = 6;
    ring.classList.remove("bp-onb-ring-center");
    ring.style.top = `${r.top - pad}px`;
    ring.style.left = `${r.left - pad}px`;
    ring.style.width = `${r.width + pad * 2}px`;
    ring.style.height = `${r.height + pad * 2}px`;
    tip.style.transform = "none";
    const tipW = 320;
    let left = r.right + 16, top = r.top;
    if (left + tipW > window.innerWidth - 12) { left = Math.min(r.left, window.innerWidth - tipW - 12); top = r.bottom + 14; }
    top = Math.max(12, Math.min(top, window.innerHeight - 230));
    tip.style.left = `${Math.max(12, left)}px`;
    tip.style.top = `${top}px`;
  } else {
    ring.classList.add("bp-onb-ring-center");
    tip.style.left = "50%"; tip.style.top = "50%";
    tip.style.transform = "translate(-50%, -50%)";
  }
}
function endOnboarding(markDone) {
  window.removeEventListener("resize", _onbReposition);
  document.removeEventListener("keydown", _onbKey);
  document.getElementById("bpOnbOverlay")?.remove();
  if (markDone) { try { localStorage.setItem(onboardingKey(_currentUid()), "1"); } catch {} }
}
function loadOnboardingExample() {
  endOnboarding(true);
  activateSection("markowitz");
  setTimeout(() => {
    document.querySelector('#section-markowitz .mkw-preset-card')?.click();
    setTimeout(() => document.getElementById("mkwRunBtn")?.click(), 350);
  }, 250);
}

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    activateSection(item.dataset.section);
    if (isMobileViewport() && mobileSidebarOpen) {
      mobileSidebarOpen = false;
      hideMobileSidebar();
    }
  });
});

mobileBottomNavItems.forEach((item) => {
  item.addEventListener("click", () => {
    activateSection(item.dataset.mobileSection);
    mainHeading.setAttribute("tabindex", "-1");
    mainHeading.focus({ preventScroll: true });
  });
});

mobileMoreButton?.addEventListener("click", () => {
  dismissMoreHint();
  if (!mobileSidebarOpen) handleSidebarToggle();
});

// ── Hint de descubrimiento del menú "Más" (una sola vez) ──────────────────────
// 4 de 7 secciones viven tras "Más"; sin una pista, un usuario nuevo en móvil
// no descubre que existen. Mostramos un globo la primera vez y lo recordamos.
const MORE_HINT_KEY = "bp-more-hint-seen";
let _moreHintEl = null;

function dismissMoreHint() {
  try { localStorage.setItem(MORE_HINT_KEY, "1"); } catch {}
  mobileMoreButton?.classList.remove("more-hint-pulse");
  if (_moreHintEl) { _moreHintEl.remove(); _moreHintEl = null; }
}

function initMobileMoreHint() {
  if (!mobileMoreButton || window.innerWidth > 1100) return;
  try { if (localStorage.getItem(MORE_HINT_KEY)) return; } catch { return; }

  const tip = document.createElement("div");
  tip.className = "more-hint-bubble";
  tip.setAttribute("role", "status");
  tip.textContent = "Aquí están tus demás secciones: Creación de portafolio, Top-Down y Analizador.";
  document.body.appendChild(tip);
  _moreHintEl = tip;
  mobileMoreButton.classList.add("more-hint-pulse");

  requestAnimationFrame(() => {
    const r = mobileMoreButton.getBoundingClientRect();
    tip.style.right = Math.max(10, Math.round(window.innerWidth - r.right - 6)) + "px";
    tip.style.bottom = Math.round(window.innerHeight - r.top + 10) + "px";
    tip.classList.add("visible");
  });

  tip.addEventListener("click", dismissMoreHint);
  setTimeout(dismissMoreHint, 7000);
}

mobilePrimaryAction?.addEventListener("click", () => {
  const target = document.getElementById(mobilePrimaryAction.dataset.target || "");
  if (!target || target.disabled) return;
  if (mobilePrimaryAction.dataset.focusTarget === "1") {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.focus();
    return;
  }
  target.click();
});

["trackerListView", "trackerDashView", "analyzerRunBtn"].forEach((id) => {
  const element = document.getElementById(id);
  if (element) new MutationObserver(() => syncMobilePrimaryAction()).observe(element, { attributes: true, attributeFilter: ["class", "disabled"] });
});
syncMobileNavigation(activeSection);
syncMobilePrimaryAction(activeSection);
initMobileDisclosures();
initMobileDataStatus();
initMobileQuickStart();
initMobileTableLabels();
initMobileMoreHint();

resetHomeButton.addEventListener("click", () => {
  if (confirm("¿Restablecer el inicio? Se perderán todos los espacios y tarjetas personalizadas.")) {
    localStorage.removeItem(getHubStorageKey());
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
  document.querySelectorAll('[aria-controls="dashboardSidebar"]').forEach((control) => control.setAttribute("aria-expanded", "false"));
}

function showMobileSidebar() {
  dashboardSidebarShell.style.transition = "transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)";
  dashboardSidebarShell.getBoundingClientRect(); // force reflow so browser records new transition before transform change
  dashboardSidebarShell.style.transform = "translateX(0)";
  dashboardSidebarShell.style.pointerEvents = "auto";
  sidebarBackdrop.classList.add("active");
  document.querySelectorAll('[aria-controls="dashboardSidebar"]').forEach((control) => control.setAttribute("aria-expanded", "true"));
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
  syncMobilePrimaryAction();
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
// Semantic gain/loss colors read from CSS tokens (--gain/--loss) so canvas
// charts stay consistent with the rest of the UI and any future theming.
function _cssColor(name, fallback) {
  try {
    // Lee de <body> (no <html>): los tokens de light-mode se sobreescriben en
    // `body.light-mode`, y las variables custom no heredan hacia el ancestro
    // <html> — leer de documentElement siempre devolvía el valor de dark mode.
    const v = getComputedStyle(document.body).getPropertyValue(name).trim();
    return v || fallback;
  } catch { return fallback; }
}
const GAIN_COLOR = _cssColor("--gain", "#32d6a2");
const LOSS_COLOR = _cssColor("--loss", "#ff6b81");
const BENCHMARKS = {
  "^GSPC": "S&P 500", "^IXIC": "NASDAQ 100", "^DJI": "Dow Jones",
  "URTH": "MSCI World", "EEM": "MSCI EM", "^MXX": "IPC Mexico",
  "^FTSE": "FTSE 100", "^N225": "Nikkei 225", "none": "Sin referencia"
};
const CURRENCY_SYMBOLS = { USD: "$", MXN: "$", EUR: "€", GBP: "£", CAD: "CA$", BRL: "R$", JPY: "¥", CNY: "¥", AUD: "AU$", CHF: "CHF " };

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
// Portafolio consolidado navegable (P0.4): id sintético + estado de sólo lectura.
const CONSOLIDATED_ID = "__ALL__";
let _consolidatedActive = false;
let _consolidatedPortfolio = null;
let _dashRefreshTimer = null;
let perfTabLoaded = false;
let summaryValueLoaded = false;
let perfDailyReturns = null;
let perfCurrentConf = 0.95;
let mcTabLoaded = false;
let corrTabLoaded = false;
let goalTabLoaded = false;
let whatifRafId = null;
let mcYears = 10;
let mcRafId = null;
let _lastPortfolioCurrentValue = null;
let perfMetricsData = null;
let perfReportData = null; // series + extras para el reporte PDF (curva, benchmark, drawdown)
let perfVarHorizon = "daily"; // "daily" | "annual"
let posSort = { key: null, dir: "asc" };   // ordenamiento tabla de posiciones (L2.2)
let posReturnPeriod = "total"; // "total" | "1d" | "1w" | "1m" | "ytd" — periodo del retorno por posición (P1.1)
let posSearch = "";                          // búsqueda tabla de posiciones (L2.2)
let txSort = { key: "date", dir: "desc" };  // ordenamiento tabla de transacciones (L2.2)
const TX_PAGE_SIZE = 40; // paginación de transacciones (P0): evita pintar cientos de filas de golpe
let _txVisibleCount = TX_PAGE_SIZE;
let _txLastFilterKey = "";
let donutBase = "invested";                  // base del donut de ponderación: "invested" | "current" (L2.3)

// Valor de una posición para el donut según la base seleccionada (L2.3)
function _donutPosValue(pos, currency) {
  const t = calcPositionTotals(pos);
  const posCur = getPosCurrency(pos, currency);
  const cost = convertAmount(t.total, posCur, currency) ?? t.total;
  if (donutBase === "current") {
    const price = getCachedPrice(pos.ticker);
    if (price !== null) return convertAmount(price * (pos.quantity || 0), posCur, currency) ?? price * (pos.quantity || 0);
    return cost; // sin precio: usar costo como respaldo
  }
  return cost;
}
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

let _portfolioMemory = [];
let _portfolioLoaded = false;
// Distinto de _portfolioLoaded: se marca true tras CUALQUIER intento de sync
// (éxito o error), para no dejar el skeleton de carga infinito si el backend
// falla y el fallback local también está vacío (bug #5).
let _portfolioSyncAttempted = false;
let _portfolioSaveInFlight = null;
let _portfolioPendingSnapshot = null;

function clonePortfolios(portfolios) {
  return JSON.parse(JSON.stringify(Array.isArray(portfolios) ? portfolios : []));
}

function getPortfolios() {
  // En modo consolidado se antepone el portafolio sintético "Todos" para que
  // TODAS las búsquedas por id lo encuentren, sin tocarlo nunca en disco (P0.4).
  if (_consolidatedActive && _consolidatedPortfolio) return [_consolidatedPortfolio, ..._portfolioMemory];
  return _portfolioMemory;
}

// Construye un portafolio sintético que agrega posiciones/transacciones de todos
// los portafolios reales, fusionando por ticker+divisa. Sólo lectura (P0.4).
function buildConsolidatedPortfolio() {
  const reals = _portfolioMemory || [];
  if (reals.length < 2) return null;

  // Divisa base = la más frecuente entre los portafolios
  const counts = {};
  reals.forEach((p) => { const c = p.currency || "USD"; counts[c] = (counts[c] || 0) + 1; });
  const base = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || "USD";

  // Benchmark = el más frecuente distinto de "none"
  const benchCounts = {};
  reals.forEach((p) => { const b = p.benchmark; if (b && b !== "none") benchCounts[b] = (benchCounts[b] || 0) + 1; });
  const benchmark = Object.keys(benchCounts).sort((a, b) => benchCounts[b] - benchCounts[a])[0] || "^GSPC";

  const merged = {}; // key ticker|cur -> { ticker, cur, qty, totalCost, earliest }
  const allTx = [];
  let earliestCreated = null;
  let cash = 0;

  reals.forEach((p) => {
    const pCur = p.currency || "USD";
    if (p.createdAt && (!earliestCreated || p.createdAt < earliestCreated)) earliestCreated = p.createdAt;
    (p.positions || []).forEach((pos) => {
      const cur = getPosCurrency(pos, pCur);
      const key = `${pos.ticker}|${cur}`;
      const totals = calcPositionTotals(pos);
      if (!merged[key]) merged[key] = { ticker: pos.ticker, cur, qty: 0, totalCost: 0, earliest: pos.purchaseDate || null };
      const m = merged[key];
      m.qty += pos.quantity || 0;
      m.totalCost += totals.total;
      if (pos.purchaseDate && (!m.earliest || pos.purchaseDate < m.earliest)) m.earliest = pos.purchaseDate;
    });
    (p.transactions || []).forEach((tx) => {
      allTx.push({ ...tx, currency: tx.currency || pCur });
    });
    const c = convertAmount(p.cashBalance || 0, pCur, base);
    if (c !== null && isFinite(c)) cash += c;
  });

  const positions = Object.values(merged)
    .filter((m) => m.qty > 0)
    .map((m) => ({
      id: `cons_${m.ticker}_${m.cur}`,
      ticker: m.ticker,
      quantity: m.qty,
      avgPrice: m.qty > 0 ? m.totalCost / m.qty : 0, // ya incluye comisión/IVA en el costo total
      commissionPercent: 0,
      applyIva: false,
      currency: m.cur,
      purchaseDate: m.earliest
    }));

  if (!positions.length) return null;

  allTx.sort((a, b) => (a.date < b.date ? 1 : -1));
  return {
    id: CONSOLIDATED_ID,
    name: "Todos los portafolios",
    description: `Vista consolidada de ${reals.length} portafolios`,
    currency: base,
    benchmark,
    positions,
    transactions: allTx,
    cashBalance: cash,
    createdAt: earliestCreated || new Date().toISOString(),
    _consolidated: true
  };
}

async function portfolioApiRequest(path, options = {}) {
  const user = window.BlackPortfolioAuth?.firebaseAuth?.currentUser;
  if (!user) throw new Error("No hay una sesion autenticada.");
  const token = await user.getIdToken();
  const twofaToken = localStorage.getItem("bp-2fa-token");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(twofaToken ? { "X-2FA-Token": twofaToken } : {}),
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    // La cuenta tiene 2FA activo pero falta verificarlo en esta sesión: re-loguear.
    if (response.status === 403 && body.detail === "2fa_required") {
      sessionStorage.removeItem("totp_verified");
      localStorage.removeItem("bp-2fa-token"); // token muerto: fuerza re-emisión vía OTP, evita el bucle login↔main
      sessionStorage.removeItem("bp-2fa-token");
      window.location.href = "login.html";
      throw new Error("Verificación 2FA requerida.");
    }
    // Beta cerrada: el correo no está en la allowlist. Cerrar sesión y enviar al login.
    if (response.status === 403 && body.detail === "beta_closed") {
      try { await window.BlackPortfolioAuth?.firebaseAuth?.signOut(); } catch {}
      sessionStorage.clear();
      window.location.href = "login.html?beta=closed";
      throw new Error("beta_closed");
    }
    // Email sin verificar: no se permite escribir/usar funciones premium.
    if (response.status === 403 && body.detail === "email_verification_required") {
      window.showToast?.("Verifica tu correo para guardar cambios. Revisa tu bandeja o reenvía el correo desde Ajustes.", "error");
      const err = new Error("email_verification_required");
      err.code = "email_verification_required";
      throw err;
    }
    throw new Error(body.detail || `Error de persistencia (${response.status}).`);
  }
  return response.json();
}

async function readLegacyPortfolioCandidate() {
  let local = [];
  try { local = JSON.parse(localStorage.getItem(getTrackerKey())) ?? []; }
  catch { local = []; }

  let firestore = [];
  try {
    const db = window.BlackPortfolioAuth?.db;
    const uid = window.BlackPortfolioAuth?.firebaseAuth?.currentUser?.uid;
    if (db && uid) {
      const doc = await db.collection("portfolios").doc(uid).get();
      if (doc.exists && Array.isArray(doc.data()?.data)) firestore = doc.data().data;
    }
  } catch {}
  return { local, firestore };
}

async function writePortfoliosToPostgres(portfolios, source = "app") {
  return portfolioApiRequest("/account/portfolios", {
    method: "PUT",
    body: JSON.stringify({ portfolios, source })
  });
}

async function syncPortfoliosFromCloud() {
  if (_portfolioLoaded) return false;
  const legacy = await readLegacyPortfolioCandidate();
  const previous = JSON.stringify(_portfolioMemory);
  try {
    let bootstrap = await portfolioApiRequest("/account/bootstrap");
    const serverHasData = Array.isArray(bootstrap.portfolios);
    const localDiffers = legacy.local.length &&
      JSON.stringify(legacy.local) !== JSON.stringify(bootstrap.portfolios);

    if (serverHasData && bootstrap.portfolioSource === "migration_firestore" && localDiffers) {
      await writePortfoliosToPostgres(legacy.local, "migration_local_override");
      bootstrap = await portfolioApiRequest("/account/bootstrap");
    } else if (!serverHasData) {
      const candidate = legacy.local.length ? legacy.local : legacy.firestore;
      if (candidate.length) {
        const source = legacy.local.length ? "migration_local" : "migration_firestore_client";
        await writePortfoliosToPostgres(candidate, source);
        bootstrap = await portfolioApiRequest("/account/bootstrap");
      }
    }

    const verified = Array.isArray(bootstrap.portfolios) ? bootstrap.portfolios : [];
    const expected = serverHasData && !(bootstrap.portfolioSource === "migration_firestore" && localDiffers)
      ? verified
      : (legacy.local.length ? legacy.local : legacy.firestore);
    if (expected.length && JSON.stringify(verified) !== JSON.stringify(expected)) {
      throw new Error("La verificacion de migracion no coincide.");
    }

    _portfolioMemory = clonePortfolios(verified);
    _portfolioLoaded = true;
    _portfolioSyncAttempted = true;
    localStorage.removeItem(getTrackerKey());
    return previous !== JSON.stringify(_portfolioMemory);
  } catch (error) {
    const fallback = legacy.local.length ? legacy.local : legacy.firestore;
    _portfolioMemory = clonePortfolios(fallback);
    _portfolioLoaded = false;
    _portfolioSyncAttempted = true;
    console.error("PostgreSQL portfolio sync failed; legacy data preserved.", error);
    return previous !== JSON.stringify(_portfolioMemory);
  }
}

async function flushPortfolioSaveQueue() {
  if (_portfolioSaveInFlight || !_portfolioPendingSnapshot) return;
  const snapshot = _portfolioPendingSnapshot;
  _portfolioPendingSnapshot = null;
  _portfolioSaveInFlight = writePortfoliosToPostgres(snapshot)
    .catch((error) => {
      console.error("No se pudo guardar el portafolio en PostgreSQL.", error);
      setTimeout(() => {
        if (!_portfolioPendingSnapshot) _portfolioPendingSnapshot = clonePortfolios(_portfolioMemory);
        void flushPortfolioSaveQueue();
      }, 5000);
    })
    .finally(() => {
      _portfolioSaveInFlight = null;
      if (_portfolioPendingSnapshot) flushPortfolioSaveQueue();
    });
  await _portfolioSaveInFlight;
}

function savePortfolios(portfolios) {
  // Blindaje P0.4: el portafolio sintético "Todos" jamás se persiste.
  const clean = (Array.isArray(portfolios) ? portfolios : []).filter((p) => p && p.id !== CONSOLIDATED_ID);
  _portfolioMemory = clonePortfolios(clean);
  _portfolioPendingSnapshot = clonePortfolios(clean);
  void flushPortfolioSaveQueue();
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

// Normaliza números de exportaciones de brokers: quita símbolos de moneda y
// resuelve separadores de miles/decimales en formato US ("1,234.56") y EU ("1.234,56").
function _csvNum(raw) {
  if (raw == null) return NaN;
  let s = String(raw).trim().replace(/[^0-9,.\-]/g, "");
  if (s === "") return NaN;
  const hasComma = s.includes(","), hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // El último separador que aparece es el decimal.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    // Solo coma: decimal si hay 1-2 dígitos al final, si no es separador de miles.
    s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
  }
  return parseFloat(s);
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
        const quantity = _csvNum(row[iQty]);
        const avgPrice = _csvNum(row[iPrice]);
        if (!ticker || !isFinite(quantity) || quantity <= 0 || !isFinite(avgPrice) || avgPrice <= 0) continue;
        let currency = iCur !== -1 ? (row[iCur] || "").trim().toUpperCase() : "";
        if (!validCur.has(currency)) currency = detectCurrencyFromTicker(ticker) || "USD";
        let purchaseDate = iDate !== -1 ? (row[iDate] || "").trim() : "";
        if (purchaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
          const d = new Date(purchaseDate);
          purchaseDate = isNaN(d) ? "" : d.toISOString().slice(0, 10);
        }
        const commissionPercent = iComm !== -1 ? (_csvNum(row[iComm]) || 0) : 0;
        const ivaRaw = iIva !== -1 ? (row[iIva] || "").trim().toLowerCase() : "";
        const applyIva = ["si", "sí", "yes", "true", "1"].includes(ivaRaw);
        const ivaRate = iIvaRate !== -1 ? (_csvNum(row[iIvaRate]) || 0) : 0;
        positions.push({ id: generateId(), ticker, avgPrice, quantity, commissionPercent, applyIva, ivaRate, purchaseDate, currency });
      }
      if (!positions.length) { alert("No se encontraron posiciones válidas en el CSV."); return; }
      // Registrar una COMPRA por posición para que las transacciones sean la fuente de
      // verdad del P/L realizado (L1.3) — necesario para ventas futuras de lo importado.
      const transactions = positions.map((p) => {
        const { total } = calcPositionTotals(p);
        const comm = p.avgPrice * p.quantity * ((p.commissionPercent || 0) / 100);
        return {
          id: generateId(),
          date: p.purchaseDate ? new Date(p.purchaseDate + "T12:00:00").toISOString() : new Date().toISOString(),
          type: "COMPRA", ticker: p.ticker, quantity: p.quantity, price: p.avgPrice,
          commissionPercent: p.commissionPercent || 0, commCost: comm, net: total, currency: p.currency
        };
      }).sort((a, b) => b.date.localeCompare(a.date));
      const baseName = file.name.replace(/\.csv$/i, "").trim() || "Importado";
      const portfolios = getPortfolios();
      portfolios.push({
        id: generateId(),
        name: `${baseName} (importado)`,
        description: "Importado desde CSV",
        benchmark: "^GSPC",
        currency: positions[0].currency,
        createdAt: new Date().toISOString(),
        positions,
        transactions
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

async function fetchAIInsights(metrics, lang) {
  const user = window.BlackPortfolioAuth?.firebaseAuth?.currentUser;
  if (!user) throw new Error("No hay una sesion autenticada.");
  const token = await user.getIdToken();
  const twofaToken = localStorage.getItem("bp-2fa-token");
  const res = await fetch(`${API_BASE_URL}/ai/insights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(twofaToken ? { "X-2FA-Token": twofaToken } : {})
    },
    body: JSON.stringify({ metrics, lang: lang || "es" }),
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).detail || ""; } catch (_) {}
    throw new Error(`HTTP ${res.status}${detail ? " — " + detail : ""}`);
  }
  const data = await res.json();
  return { text: (data.insights || "").trim(), model: data.model || "" };
}

// ── Asistente IA conversacional (Portafolio Tracker · DeepSeek) ────────────────
let aiChatHistory = [];   // [{ role: "user"|"assistant"|"typing", content }]
let aiChatBusy = false;
let aiChatWelcomed = false;

function _aiChatEsc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Snapshot ligero del portafolio activo para anclar las respuestas del modelo.
function buildChatContext() {
  const portfolio = getPortfolios().find(p => p.id === activePortfolioId);
  if (!portfolio) return null;
  const currency = portfolio.currency || "USD";
  const positions = (portfolio.positions || []).filter(p => (p.quantity || 0) > 0);

  let totalInvested = 0, totalCurrent = 0, priced = 0;
  const rows = positions.map(pos => {
    const posCur = getPosCurrency(pos, currency);
    const t = calcPositionTotals(pos);
    const invested = convertAmount(t.total, posCur, currency) ?? t.total;
    totalInvested += invested;
    const price = getCachedPrice(pos.ticker);
    let curVal = null, pnlPct = null;
    if (price !== null) {
      curVal = convertAmount(price * (pos.quantity || 0), posCur, currency) ?? price * (pos.quantity || 0);
      totalCurrent += curVal;
      priced++;
      pnlPct = invested > 0 ? +(((curVal - invested) / invested) * 100).toFixed(2) : null;
    }
    return { pos, posCur, invested, curVal, pnlPct };
  });

  const cash = portfolio.cashBalance || 0;
  const valued = rows.filter(r => r.curVal !== null && r.curVal > 0);
  const hhi = totalCurrent > 0 ? valued.reduce((s, r) => s + Math.pow(r.curVal / totalCurrent, 2), 0) : 0;
  const sortedW = [...valued].sort((a, b) => b.curVal - a.curVal);
  const base = totalCurrent > 0 ? totalCurrent : totalInvested;

  return {
    portafolio: portfolio.name,
    moneda: currency,
    benchmark: portfolio.benchmark || null,
    posiciones_activas: positions.length,
    efectivo: +cash.toFixed(2),
    total_invertido: +totalInvested.toFixed(2),
    valor_actual: +(totalCurrent + cash).toFixed(2),
    retorno_total_pct: (totalInvested > 0 && totalCurrent > 0)
      ? +(((totalCurrent - totalInvested) / totalInvested) * 100).toFixed(2) : null,
    precios_disponibles: `${priced}/${positions.length}`,
    concentracion: {
      hhi: +hhi.toFixed(3),
      nivel: hhi > 0.25 ? "alta" : hhi > 0.15 ? "moderada" : "baja",
      holdings_efectivos: hhi > 0 ? +(1 / hhi).toFixed(1) : null,
      mayor_posicion_pct: (sortedW.length && totalCurrent > 0)
        ? +((sortedW[0].curVal / totalCurrent) * 100).toFixed(1) : null,
    },
    posiciones: rows
      .sort((a, b) => (b.curVal ?? b.invested) - (a.curVal ?? a.invested))
      .slice(0, 25)
      .map(r => ({
        ticker: r.pos.ticker,
        divisa: r.posCur,
        cantidad: r.pos.quantity,
        precio_promedio: r.pos.avgPrice,
        peso_pct: base > 0 ? +(((r.curVal ?? r.invested) / base) * 100).toFixed(1) : null,
        pnl_pct: r.pnlPct,
        sector: getTickerSector(r.pos.ticker),
      })),
  };
}

function _aiChatRender() {
  const box = document.getElementById("aiChatMessages");
  if (!box) return;
  box.innerHTML = aiChatHistory.map(m => {
    if (m.role === "user") {
      return `<div class="ai-chat-msg ai-chat-msg-user"><div class="ai-chat-bubble">${_aiChatEsc(m.content)}</div></div>`;
    }
    if (m.role === "typing") {
      return `<div class="ai-chat-msg ai-chat-msg-bot"><div class="ai-chat-bubble ai-chat-typing"><span></span><span></span><span></span></div></div>`;
    }
    const html = (typeof _mdToBulletsHtml === "function") ? _mdToBulletsHtml(m.content) : _aiChatEsc(m.content);
    return `<div class="ai-chat-msg ai-chat-msg-bot"><div class="ai-chat-bubble ai-chat-bubble-bot">${html}</div></div>`;
  }).join("");
  box.scrollTop = box.scrollHeight;
}

async function _aiChatSend(text) {
  text = (text || "").trim();
  if (!text || aiChatBusy) return;
  const ctx = buildChatContext();
  if (!ctx) {
    aiChatHistory.push({ role: "assistant", content: "Abre un portafolio con posiciones para que pueda analizarlo." });
    _aiChatRender();
    return;
  }

  aiChatHistory.push({ role: "user", content: text });
  aiChatHistory.push({ role: "typing", content: "" });
  _aiChatRender();
  const sugg = document.getElementById("aiChatSuggestions");
  if (sugg) sugg.style.display = "none";
  aiChatBusy = true;
  const sendBtn = document.getElementById("aiChatSendBtn");
  if (sendBtn) sendBtn.disabled = true;

  const apiMessages = aiChatHistory
    .filter(m => m.role === "user" || m.role === "assistant")
    .map(m => ({ role: m.role, content: m.content }));

  try {
    const user = window.BlackPortfolioAuth?.firebaseAuth?.currentUser;
    if (!user) throw new Error("sin sesión");
    const token = await user.getIdToken();
    const twofaToken = localStorage.getItem("bp-2fa-token");
    const res = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(twofaToken ? { "X-2FA-Token": twofaToken } : {}),
      },
      body: JSON.stringify({ context: ctx, messages: apiMessages, lang: "es" }),
    });
    aiChatHistory = aiChatHistory.filter(m => m.role !== "typing");
    if (res.status === 403) {
      aiChatHistory.push({ role: "assistant", content: "Para usar el **Asistente IA** necesitas verificar tu correo. Revisa tu email o reenvía la verificación desde Ajustes." });
    } else if (res.status === 503) {
      aiChatHistory.push({ role: "assistant", content: "El asistente aún no está configurado en el servidor. Inténtalo más tarde." });
    } else if (!res.ok) {
      aiChatHistory.push({ role: "assistant", content: "No pude generar una respuesta ahora mismo. Inténtalo de nuevo en unos segundos." });
    } else {
      const data = await res.json();
      aiChatHistory.push({ role: "assistant", content: (data.reply || "").trim() || "No recibí contenido del modelo." });
    }
  } catch (_) {
    aiChatHistory = aiChatHistory.filter(m => m.role !== "typing");
    aiChatHistory.push({ role: "assistant", content: "Error de conexión con el asistente. Revisa tu red e inténtalo de nuevo." });
  } finally {
    aiChatBusy = false;
    if (sendBtn) sendBtn.disabled = false;
    _aiChatRender();
  }
}

function _aiChatOpen() {
  const panel = document.getElementById("aiChatPanel");
  if (!panel) return;
  panel.classList.add("open");
  panel.classList.remove("minimized");
  panel.setAttribute("aria-hidden", "false");
  if (!aiChatWelcomed) {
    const portfolio = getPortfolios().find(p => p.id === activePortfolioId);
    const name = portfolio ? portfolio.name : "tu portafolio";
    aiChatHistory.push({ role: "assistant", content: `¡Hola! Soy tu asistente de inversión. Puedo analizar **${name}**: diversificación, concentración, riesgo, atribución de resultados y más. ¿Qué te gustaría saber?` });
    aiChatWelcomed = true;
    _aiChatRender();
  }
  setTimeout(() => document.getElementById("aiChatInput")?.focus(), 60);
}

function _aiChatClose() {
  const panel = document.getElementById("aiChatPanel");
  if (!panel) return;
  panel.classList.remove("open");
  panel.setAttribute("aria-hidden", "true");
}

function _aiChatRestore() {
  const panel = document.getElementById("aiChatPanel");
  if (!panel) return;
  panel.classList.remove("minimized");
  setTimeout(() => document.getElementById("aiChatInput")?.focus(), 60);
}

function initAiChat() {
  const btn = document.getElementById("trackerAiChatBtn");
  const panel = document.getElementById("aiChatPanel");
  if (!btn || !panel) return;
  // Reubicar el panel como hijo directo de <body>: así el position:fixed es
  // relativo al viewport (sigue el scroll) y no queda atrapado por un ancestro
  // con transform/filter dentro del dashboard.
  if (panel.parentElement !== document.body) document.body.appendChild(panel);

  btn.addEventListener("click", () => {
    if (panel.classList.contains("open")) {
      if (panel.classList.contains("minimized")) _aiChatRestore();
      else _aiChatClose();
    } else {
      _aiChatOpen();
    }
  });
  document.getElementById("aiChatMinBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.toggle("minimized");
  });
  // Restaurar al hacer clic en la barra de cabecera (no en sus botones) cuando está minimizado
  document.getElementById("aiChatHeader")?.addEventListener("click", (e) => {
    if (panel.classList.contains("minimized") && !e.target.closest("button")) _aiChatRestore();
  });
  document.getElementById("aiChatCloseBtn")?.addEventListener("click", _aiChatClose);
  const form = document.getElementById("aiChatForm");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("aiChatInput");
    const v = input.value;
    input.value = "";
    input.style.height = "auto";
    _aiChatSend(v);
  });
  const input = document.getElementById("aiChatInput");
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form?.requestSubmit(); }
  });
  input?.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });
  document.getElementById("aiChatSuggestions")?.addEventListener("click", (e) => {
    const chip = e.target.closest(".ai-chat-chip");
    if (chip) _aiChatSend(chip.dataset.q);
  });
}

// Convierte markdown (encabezados ##, viñetas, **negritas**) a HTML seguro para el reporte.
// Tolera tanto el formato antiguo (solo viñetas) como el nuevo (secciones con encabezados).
function _mdToBulletsHtml(md) {
  const esc  = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Normaliza <strong>/<b> literales (propios o de la IA) a ** para que no se
  // muestren escapados como texto en el PDF.
  const bold = s => esc(s.replace(/<\/?(?:strong|b)>/gi, "**")).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
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
    // Antes que "resultado": el título de esta sección lo contiene y si no va
    // primero, las tarjetas de movers acabarían dentro de "atribucion".
    if (/movi[oó]|qu[eé] movi/.test(s)) return "movers";
    if (/puente|reconcil|capital/.test(s)) return "atribucion";
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

  // ── Beta actual ponderada por posiciones abiertas al cierre ───────────────
  const betaInfo = {};
  await Promise.all(Object.values(byTicker).map(async (b) => {
    try {
      const r = await fetch(`${API_BASE_URL}/info/${encodeURIComponent(b.ticker)}`);
      const j = r.ok ? await r.json() : null;
      if (j && j.beta != null && isFinite(j.beta)) betaInfo[b.ticker] = Number(j.beta);
    } catch (_) {}
  }));

  // ── Serie de retornos ponderados por costo dentro de [start,end] ──────────
  const activeInWindow = allLots.filter(l => (l.purchaseDate || "0000-00-00") <= endStr && (!l.sellDate || l.sellDate >= startStr));
  let totalAllCost = 0;
  activeInWindow.forEach(l => { const c = convertAmount((l.avgPrice || 0) * l.quantity, l.currency, currency) ?? ((l.avgPrice || 0) * l.quantity); l._cost = c; totalAllCost += c; });
  activeInWindow.forEach(l => { l._weight = totalAllCost > 0 ? l._cost / totalAllCost : 0; });

  const tickersWithData = tickers.filter(t => (sortedDates[t] || []).filter(d => d >= startStr && d <= endStr).length > 1);
  let windowDates = [];
  if (tickersWithData.length) {
    const dateSets = tickersWithData.map(t => new Set((sortedDates[t] || []).filter(d => d >= startStr && d <= endStr)));
    windowDates = [...dateSets[0]].filter(d => dateSets.every(s => s.has(d))).sort();
  }
  if (windowDates.length < 2) {
    const dateSet = new Set();
    tickers.forEach(t => (sortedDates[t] || []).forEach(d => { if (d >= startStr && d <= endStr) dateSet.add(d); }));
    windowDates = [...dateSet].sort();
  }

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
    // `date` (MM-DD) se conserva por compatibilidad; `iso` es la fecha completa
    // que necesita el reporte largo para ejes, meses y crónica de la caída.
    equityCurve.push({ date: d1.slice(5), iso: d1, value: cum });
    const b0 = benchAsOf(d0), b1 = benchAsOf(d1);
    if (b0 && b1 && b0 > 0) { const br = (b1 - b0) / b0; benchDaily.push(br); cumB = (1 + cumB / 100) * (1 + br) * 100 - 100; }
    else benchDaily.push(0);
    benchCurve.push({ date: d1.slice(5), iso: d1, value: cumB });
  }

  // ── Métricas del periodo ──────────────────────────────────────────────────
  const m = calcMetrics(dailyReturns, perfCurrentConf);
  const maxDD = calcMaxDrawdown(dailyReturns);
  const historicalBeta = benchHist.length > 1 && benchDaily.length >= 2 ? calcBeta(dailyReturns, benchDaily) : null;
  if (benchHist.length > 1) {
    const activeBetaBase = posData
      .filter(d => d.currentValuePf !== null && d.costInPf > 0)
      .reduce((s, d) => s + d.costInPf, 0);
    if (activeBetaBase > 0) {
      posData.forEach(d => {
        if (betaInfo[d.pos.ticker] != null) return;
        const tMap = dateMap[d.pos.ticker] || {};
        const tDates = Object.keys(tMap).filter(day => day >= startStr && day <= endStr).sort();
        const tRets = [], bmRets = [];
        for (let i = 1; i < tDates.length; i++) {
          const tc0 = tMap[tDates[i - 1]], tc1 = tMap[tDates[i]];
          const bc0 = benchAsOf(tDates[i - 1]), bc1 = benchAsOf(tDates[i]);
          if (tc0 > 0 && tc1 > 0 && bc0 > 0 && bc1 > 0) {
            tRets.push((tc1 - tc0) / tc0);
            bmRets.push((bc1 - bc0) / bc0);
          }
        }
        if (tRets.length >= 2) betaInfo[d.pos.ticker] = calcBeta(tRets, bmRets);
      });
    }
  }
  const betaWeightedRows = posData.filter(d => betaInfo[d.pos.ticker] != null && d.costInPf > 0);
  const betaWeightBase = betaWeightedRows.reduce((s, d) => s + d.costInPf, 0);
  const currentWeightedBeta = betaWeightBase > 0
    ? betaWeightedRows.reduce((s, d) => s + betaInfo[d.pos.ticker] * (d.costInPf / betaWeightBase), 0)
    : null;
  const beta = currentWeightedBeta ?? historicalBeta;
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
  const closedTradesInWindow = computeClosedTrades(portfolio)
    .filter(tr => tr.sellDate >= startStr && tr.sellDate <= endStr);
  const totalRealizedPnl = closedTradesInWindow.reduce((s, tr) => s + (tr.pnl || 0), 0);
  const totalRealizedCost = closedTradesInWindow.reduce((s, tr) => s + (tr.cost || 0), 0);
  const totalRealizedProceeds = closedTradesInWindow.reduce((s, tr) => s + (tr.proceeds || 0), 0);
  const openPeriodPnl = posData.reduce((s, d) => s + (d.periodPnl || 0), 0);
  const periodCapitalBase = totalAllCost || totalCostEnd || totalRealizedCost;
  const periodResultAmt = openPeriodPnl + totalRealizedPnl + totalDividends;
  const periodResultPct = periodCapitalBase > 0 ? periodResultAmt / periodCapitalBase * 100 : null;

  // Exposición por divisa (al end)
  const fxExposure = {};
  posData.forEach(d => { if (d.currentValuePf !== null) fxExposure[d.currency] = (fxExposure[d.currency] || 0) + d.currentValuePf; });

  // ── Derivados del reporte largo ───────────────────────────────────────────
  // Todo sale de lo que ya está en memoria: ni un fetch adicional.
  // Ver .claude/skills/portfolio-report-design/references/pdf-document.md §6.

  // Retorno por mes calendario (§III Cronología): compone el acumulado de cierre
  // de cada mes contra el del mes anterior.
  const monthlyReturns = [];
  if (equityCurve.length) {
    const lastOfMonth = new Map();
    equityCurve.forEach(p => lastOfMonth.set(p.iso.slice(0, 7), p.value));
    let prev = 0;
    [...lastOfMonth.keys()].sort().forEach(ym => {
      const v = lastOfMonth.get(ym);
      // Mejor y peor posición del mes por retorno de precio (primer → último
      // día con cotización dentro del mes). Da la columna narrativa de §III.
      let best = null, worst = null;
      Object.keys(byTicker).forEach(tk => {
        const tMap = dateMap[tk] || {};
        const days = Object.keys(tMap).filter(x => x.slice(0, 7) === ym && x >= startStr && x <= endStr).sort();
        if (days.length < 2) return;
        const p0 = tMap[days[0]], p1 = tMap[days[days.length - 1]];
        if (!p0 || p0 <= 0) return;
        const ret = (p1 - p0) / p0 * 100;
        if (!best || ret > best.pct) best = { ticker: tk, pct: ret };
        if (!worst || ret < worst.pct) worst = { ticker: tk, pct: ret };
      });
      monthlyReturns.push({ ym, value: (1 + v / 100) / (1 + prev / 100) * 100 - 100, best, worst });
      prev = v;
    });
  }

  // Crónica de la caída (§VIII): fechas de pico y mínimo, profundidad real
  // ((1+v)/(1+pico)−1, no la resta de acumulados) y recuperación.
  let drawdown = null;
  if (equityCurve.length > 1) {
    let peak = -Infinity, peakIso = null, peakIdx = 0, worst = null;
    equityCurve.forEach((p, i) => {
      if (p.value > peak) { peak = p.value; peakIso = p.iso; peakIdx = i; }
      const dd = (1 + p.value / 100) / (1 + peak / 100) * 100 - 100;
      if (!worst || dd < worst.depthPct) worst = { depthPct: dd, troughIso: p.iso, troughIdx: i, peakIso, peakIdx, peakValue: peak };
    });
    if (worst && worst.depthPct < -0.01) {
      let recoveredIso = null, recoveredIdx = null;
      for (let i = worst.troughIdx + 1; i < equityCurve.length; i++) {
        if (equityCurve[i].value >= worst.peakValue) { recoveredIso = equityCurve[i].iso; recoveredIdx = i; break; }
      }
      drawdown = {
        depthPct: worst.depthPct,
        depthAmt: Math.abs(worst.depthPct) / 100 * ((totalAllCost || totalCostEnd) * (1 + worst.peakValue / 100)),
        peakIso: worst.peakIso, troughIso: worst.troughIso, recoveredIso,
        peakIdx: worst.peakIdx, troughIdx: worst.troughIdx,
        sessionsUnder: (recoveredIdx ?? equityCurve.length - 1) - worst.peakIdx,
        recovered: !!recoveredIso,
      };
    }
  }

  // Mejor y peor sesión (§IV): dailyReturns[i] corresponde a windowDates[i+1].
  let bestSession = null, worstSession = null;
  dailyReturns.forEach((r, i) => {
    const s = { iso: windowDates[i + 1] || endStr, pct: r * 100 };
    if (!bestSession || s.pct > bestSession.pct) bestSession = s;
    if (!worstSession || s.pct < worstSession.pct) worstSession = s;
  });

  // Contribución en pp y serie normalizada por posición (§V, §VII).
  const attribBase = totalCostEnd;
  posData.forEach(d => {
    const gain = d.periodPnl ?? d.pnlAmt;
    d.contributionPp = (gain !== null && attribBase > 0) ? gain / attribBase * 100 : null;
    const tMap = dateMap[d.pos.ticker] || {};
    const days = Object.keys(tMap).filter(x => x >= startStr && x <= endStr).sort();
    const s = [];
    if (days.length > 1 && tMap[days[0]] > 0) {
      const base = tMap[days[0]], step = Math.max(1, Math.floor(days.length / 40));
      for (let i = 0; i < days.length; i += step) s.push(+(tMap[days[i]] / base * 100).toFixed(2));
      const last = +(tMap[days[days.length - 1]] / base * 100).toFixed(2);
      if (s[s.length - 1] !== last) s.push(last);
    }
    d.series = s;
  });
  const attribution = posData
    .filter(d => d.contributionPp !== null)
    .map(d => ({ ticker: d.pos.ticker, pnl: d.periodPnl ?? d.pnlAmt, pp: d.contributionPp }))
    .sort((a, b) => b.pp - a.pp);
  // Movers: los que superan el umbral de materialidad de 0.5pp (§ eligibility).
  const movers = {
    up: attribution.filter(a => a.pp >= 0.5).slice(0, 3),
    down: attribution.filter(a => a.pp <= -0.5).slice(-3).reverse(),
  };

  return {
    monthlyReturns, drawdown, bestSession, worstSession, attribution, movers,
    currency, startStr, endStr, isEndToday, todayStr,
    posData, totalValueEnd, totalCostEnd, cashAtEnd,
    metrics: { sharpe: m.sharpe, volatility: m.volatility, var: m.var, beta, currentWeightedBeta, historicalBeta, maxDD, sortino },
    equityCurve, benchCurve, dailyReturns, benchDaily,
    benchmarkLabel: (typeof BENCHMARKS !== "undefined" && BENCHMARKS[portfolio.benchmark]) || benchSym || "Benchmark",
    sessions: windowDates.length, periodReturnPct, cagrPct,
    periodCapitalBase, periodResultAmt, periodResultPct, openPeriodPnl,
    closedTradesInWindow, totalRealizedPnl, totalRealizedCost, totalRealizedProceeds,
    txInWindow, totalTxCount: allTx.length, totalComm, dividends, totalDividends,
    missingPrices, fxExposure,
  };
}

// Carga perezosa de un script propio (mismo origen) en la ventana principal.
function _loadLocalScript(src, globalName) {
  if (globalName && window[globalName]) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("No se pudo cargar " + src));
    document.head.appendChild(s);
  });
}

// Fotografía del reporte: el backend proxea los bytes de Pexels (la CSP de
// Hosting no permite fetch a images.pexels.com, y sin data URI html2canvas
// descarta la imagen al rasterizar). Cualquier fallo devuelve {} y el documento
// cae al degradado del tono: nunca un hueco en blanco ni un <img> roto.
async function _fetchReportImagery(sectors) {
  const out = {};
  try {
    const res = await fetch(`${API_BASE_URL}/report/imagery?sectors=${encodeURIComponent(sectors.join(","))}`);
    if (!res.ok) return out;
    const slots = (await res.json()).slots || {};
    const sizeFor = { cover: "large2x", opener: "large", closing: "large", band: "large", rail: "medium", inset: "medium" };
    await Promise.all(Object.entries(slots).map(async ([slot, meta]) => {
      try {
        const r = await fetch(`${API_BASE_URL}/report/photo/${meta.id}?size=${sizeFor[slot] || "large"}`);
        if (!r.ok) return;
        const blob = await r.blob();
        out[slot] = {
          src: await new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(blob); }),
          by: meta.by, avg: meta.avg,
        };
      } catch (_) { /* ese hueco se queda sin foto */ }
    }));
  } catch (_) { /* sin galería: el reporte se genera igual */ }
  return out;
}

// Noticias de las posiciones que movieron el periodo. Reusa /api/news/{symbol}
// (ya cacheado 15 min en el backend); se limita a los movers materiales para no
// gastar la cuota de RapidAPI ni inflar el payload de la IA. Cualquier fallo
// deja esa posición sin noticia: la tarjeta se explica solo con sus cifras.
async function _fetchMoverNews(tickers, startStr, endStr) {
  const out = {};
  await Promise.all(tickers.slice(0, 6).map(async ticker => {
    try {
      const res = await fetch(`${API_BASE_URL}/news/${encodeURIComponent(ticker)}?language=${currentLang || "es"}`);
      if (!res.ok) return;
      const items = ((await res.json()).news || [])
        .map(n => ({
          title: n.article_title || "",
          source: n.source || "",
          url: n.article_url || n.url || "",
          date: n.post_time_utc ? String(n.post_time_utc).slice(0, 10) : "",
        }))
        .filter(n => n.title)
        // Dentro de la ventana del reporte (con margen: una noticia del día
        // anterior al cierre sigue explicando el periodo).
        .filter(n => !n.date || (n.date >= startStr && n.date <= endStr))
        .slice(0, 2);
      if (items.length) out[ticker] = items;
    } catch (_) { /* sin noticia para ese ticker */ }
  }));
  return out;
}

async function exportPortfolioPDF(startStr, endStr) {
  const portfolio = getPortfolios().find(p => p.id === activePortfolioId);
  if (!portfolio) return;
  const currency = portfolio.currency || "USD";

  // Reconstrucción histórica del portafolio al rango [startStr, endStr]
  let data;
  try {
    data = await computeHistoricalReport(portfolio, startStr, endStr);
  } catch (e) {
    alert("No se pudo generar el reporte: " + ((e && e.message) || e));
    return;
  }

  const fmtPct2 = v => (v === null || v === undefined) ? "—" : (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
  const totalCurrentValue = data.totalValueEnd;
  const base = data.periodCapitalBase || data.totalCostEnd;
  const retAmt = data.periodResultAmt ?? (data.totalValueEnd - data.totalCostEnd);
  const retPct = data.periodResultPct ?? (data.totalCostEnd > 0 ? retAmt / data.totalCostEnd * 100 : null);
  const m = data.metrics;
  const _fmtD = d => {
    if (!d) return "—";
    try {
      const dt = new Date(d + "T00:00:00");
      return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString(currentLang === "en" ? "en-US" : currentLang === "fr" ? "fr-FR" : "es-MX",
        { year: "numeric", month: "short", day: "numeric" });
    } catch { return d; }
  };
  const periodLabel = `${_fmtD(data.startStr)} – ${_fmtD(data.endStr)}`;

  // Concentración (también la recalcula el constructor; aquí solo para la IA).
  const weights = data.posData
    .filter(d => d.currentValuePf !== null && d.currentValuePf > 0)
    .map(d => ({ ticker: d.pos.ticker, w: d.currentValuePf / totalCurrentValue }))
    .sort((a, b) => b.w - a.w);
  const hhi = weights.reduce((s, x) => s + x.w * x.w, 0);
  const top3W = weights.slice(0, 3).reduce((s, x) => s + x.w, 0) * 100;
  const maxW = weights.length ? weights[0].w * 100 : 0;
  const concLabel = hhi > 0.25 ? "alta" : hhi > 0.15 ? "moderada" : "baja";
  const _bucketPct = (fn) => {
    const b = {};
    data.posData.forEach(d => { if (d.currentValuePf > 0) { const k = fn(d.pos.ticker); b[k] = (b[k] || 0) + d.currentValuePf; } });
    return Object.entries(b).sort((a, b2) => b2[1] - a[1])
      .map(([label, value]) => ({ label, pct: totalCurrentValue > 0 ? value / totalCurrentValue * 100 : 0 }));
  };

  // Noticias de los movers: alimentan tanto el prompt de la IA como las
  // tarjetas de la sección VI del documento.
  const moverNews = await _fetchMoverNews(
    [...(data.movers?.up || []), ...(data.movers?.down || [])].map(a => a.ticker),
    startStr, endStr);

  // ── Insights con IA (OpenRouter vía backend) — mismo payload que ya
  //    entiende el system prompt de api.py; no cambiar los nombres de clave.
  const aiMetrics = {
    portafolio: portfolio.name,
    moneda: currency,
    periodo_reporte: periodLabel,
    retorno_periodo_pct: retPct != null ? +retPct.toFixed(2) : null,
    twr_periodo_pct: data.periodReturnPct !== null ? +data.periodReturnPct.toFixed(2) : null,
    posiciones_activas: data.posData.length,
    capital_base_periodo: formatCurrency(base, currency),
    valor_actual: formatCurrency(data.totalValueEnd, currency),
    resultado_periodo: `${retAmt >= 0 ? "+" : ""}${formatCurrency(retAmt, currency)} (${fmtPct2(retPct)})`,
    pnl_abierto_periodo: `${(data.openPeriodPnl || 0) >= 0 ? "+" : ""}${formatCurrency(data.openPeriodPnl || 0, currency)}`,
    pnl_realizado_ventas_periodo: `${(data.totalRealizedPnl || 0) >= 0 ? "+" : ""}${formatCurrency(data.totalRealizedPnl || 0, currency)}`,
    cagr_estimado: data.cagrPct !== null ? fmtPct2(data.cagrPct) : "—",
    sharpe: m.sharpe != null ? m.sharpe.toFixed(2) : "—",
    sortino: m.sortino != null ? m.sortino.toFixed(2) : "—",
    volatilidad: m.volatility != null ? m.volatility.toFixed(1) + "%" : "—",
    var_95: m.var != null ? "-" + Math.abs(m.var).toFixed(2) + "%" : "—",
    beta_actual: m.beta != null ? m.beta.toFixed(2) : "—",
    beta_historica_periodo: m.historicalBeta != null ? m.historicalBeta.toFixed(2) : "—",
    max_drawdown_periodo: m.maxDD != null ? "-" + m.maxDD.toFixed(2) + "%" : "—",
    benchmark: data.benchmarkLabel,
    comisiones_totales: formatCurrency(data.totalComm, currency),
    dividendos_cobrados: data.dividends.length ? formatCurrency(data.totalDividends, currency) : "0",
    ventas_realizadas: (data.closedTradesInWindow || []).slice(0, 30).map(tr => ({
      ticker: tr.ticker, fecha_venta: tr.sellDate,
      costo: +((tr.cost || 0).toFixed(2)), ingreso: +((tr.proceeds || 0).toFixed(2)),
      pnl: +((tr.pnl || 0).toFixed(2)), pnl_pct: tr.pnlPct != null ? +(tr.pnlPct.toFixed(2)) : null,
    })),
    posiciones: data.posData
      .filter(d => d.currentValuePf !== null)
      .sort((a, b) => (b.currentValuePf || 0) - (a.currentValuePf || 0))
      .slice(0, 15)
      .map(d => ({
        ticker: d.pos.ticker,
        peso_pct: totalCurrentValue > 0 ? +(d.currentValuePf / totalCurrentValue * 100).toFixed(1) : null,
        pnl_pct: d.pnlPct !== null ? +d.pnlPct.toFixed(2) : null,
        divisa: getPosCurrency(d.pos, currency),
      })),
    exposicion_divisa: Object.entries(data.fxExposure).map(([cur, val]) => ({
      divisa: cur, peso_pct: totalCurrentValue > 0 ? +(val / totalCurrentValue * 100).toFixed(1) : null,
    })),
    concentracion: {
      hhi: +hhi.toFixed(3), nivel: concLabel,
      holdings_efectivos: +(hhi > 0 ? 1 / hhi : 0).toFixed(1),
      top3_peso_pct: +top3W.toFixed(1), mayor_posicion_pct: +maxW.toFixed(1),
    },
    exposicion_sector: _bucketPct(getTickerSector).slice(0, 8).map(r => ({ sector: r.label, peso_pct: +r.pct.toFixed(1) })),
    exposicion_region: _bucketPct(getTickerGeo).slice(0, 8).map(r => ({ region: r.label, peso_pct: +r.pct.toFixed(1) })),
    atribucion: {
      mayores_contribuidores: (data.movers?.up || []).map(a => ({ ticker: a.ticker, contribucion_pp: +a.pp.toFixed(2) })),
      mayores_detractores: (data.movers?.down || []).map(a => ({ ticker: a.ticker, contribucion_pp: +a.pp.toFixed(2) })),
    },
    // Única fuente admisible para atribuir un movimiento a un hecho del mundo
    // (regla 10 del system prompt). Sin esto, la IA no debe inventar eventos.
    noticias: Object.entries(moverNews).map(([ticker, items]) => ({
      ticker,
      titulares: items.map(n => ({ titular: n.title, medio: n.source, fecha: n.date })),
    })),
    cronologia_mensual: (data.monthlyReturns || []).map(x => ({ mes: x.ym, retorno_pct: +x.value.toFixed(2) })),
    caida_maxima: data.drawdown ? {
      profundidad_pct: +data.drawdown.depthPct.toFixed(2),
      profundidad_dinero: formatCurrency(data.drawdown.depthAmt, currency),
      fecha_pico: data.drawdown.peakIso, fecha_minimo: data.drawdown.troughIso,
      sesiones_bajo_el_agua: data.drawdown.sessionsUnder, recuperada: data.drawdown.recovered,
    } : null,
    comparacion_benchmark: (data.equityCurve && data.equityCurve.length > 1) ? {
      retorno_portafolio_pct: +data.equityCurve[data.equityCurve.length - 1].value.toFixed(2),
      retorno_benchmark_pct: (data.benchCurve && data.benchCurve.length > 1)
        ? +data.benchCurve[data.benchCurve.length - 1].value.toFixed(2) : null,
      beta_actual: m.beta == null ? null : +m.beta.toFixed(2),
      beta_historica_periodo: m.historicalBeta == null ? null : +m.historicalBeta.toFixed(2),
    } : null,
  };

  let aiSections = {}, aiModel = "", aiError = "";
  try {
    const ai = await fetchAIInsights(aiMetrics, currentLang || "es");
    if (ai.text) { aiSections = _parseAISections(ai.text); aiModel = ai.model || ""; }
    if (!Object.keys(aiSections).length) aiError = "la IA devolvió una respuesta vacía";
  } catch (e) {
    aiError = (e && e.message) || String(e);
    console.warn("[Reporte PDF] Análisis IA no disponible:", aiError);
  }

  // Fotografía por sector dominante (en paralelo no: la IA ya terminó y esto
  // tarda poco; si falla, el documento sale con el degradado del tono).
  const domSectors = _bucketPct(getTickerSector).slice(0, 3).map(r => r.label);
  const images = await _fetchReportImagery(domSectors);

  // ── Construcción del documento paginado ───────────────────────────────────
  let built;
  try {
    await _loadLocalScript("assets/pdf-report.js?v=2", "BPPdfReport");
    built = window.BPPdfReport.build({
      data, portfolio, tone: "brand", lang: currentLang || "es", images, news: moverNews,
      ai: { sections: aiSections, model: aiModel, error: aiError },
      fmt: { money: (v, c) => formatCurrency(v, c || currency) },
      helpers: {
        posCurrency: pos => getPosCurrency(pos, currency),
        sector: t => getTickerSector(t),
        geo: t => getTickerGeo(t),
      },
      rfr: perfRfr,
    });
  } catch (e) {
    alert("No se pudo construir el reporte: " + ((e && e.message) || e));
    return;
  }

  // Render + paginación + PDF (implementación única en assets/pdf-report.js).
  try {
    const out = await window.BPPdfReport.renderToPdf({
      built, host: document, assets: "assets/", currency,
      locale: currentLang === "en" ? "en-US" : currentLang === "fr" ? "fr-FR" : "es-MX",
    });
    if (out.pdfPages !== out.pages) {
      console.warn(`[Reporte PDF] ${out.pages} páginas maquetadas vs ${out.pdfPages} en el PDF`);
    }
    const safeName = (portfolio.name || "portafolio").replace(/[^\wáéíóúñÁÉÍÓÚÑ-]+/g, "_");
    const url = URL.createObjectURL(out.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Reporte_${safeName}_${startStr}_a_${endStr}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    console.error("[Reporte PDF]", e);
    alert("No se pudo descargar el PDF: " + ((e && e.message) || e));
  }
}

// Marca la flecha de orden en el encabezado activo (L2.2)
function _markSortIndicators(selector, attr, sortState) {
  document.querySelectorAll(selector).forEach((th) => {
    const key = th.dataset[attr];
    th.classList.toggle("sort-asc", sortState.key === key && sortState.dir === "asc");
    th.classList.toggle("sort-desc", sortState.key === key && sortState.dir === "desc");
  });
}

// Marca las tablas que realmente desbordan horizontalmente para mostrar un
// indicio visual de scroll (bug #6): evita el "scrollbar apenas se nota".
function _updateTableOverflowHint(shell) {
  if (!shell) return;
  requestAnimationFrame(() => {
    shell.classList.toggle("has-h-scroll", shell.scrollWidth > shell.clientWidth + 2);
  });
}

const TX_MONTH_LABELS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// Filtros de transacciones colapsados tras un botón en móvil (móvil/tablet #7):
// en desktop el panel siempre está visible (la clase .is-collapsed se ignora
// por CSS a partir de 721px).
function initTxFiltersToggle() {
  const btn = document.getElementById("txFiltersToggleBtn");
  const panel = document.getElementById("txFiltersPanel");
  if (!btn || !panel || btn.dataset.wired) return;
  btn.dataset.wired = "1";
  btn.addEventListener("click", () => {
    const collapsed = panel.classList.toggle("is-collapsed");
    btn.setAttribute("aria-expanded", String(!collapsed));
  });
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

  // Ordenamiento (L2.2)
  const txSortVal = (tx, key) => {
    switch (key) {
      case "date": return tx.date || "";
      case "type": return tx.type || "";
      case "ticker": return tx.ticker || "";
      case "quantity": return tx.quantity || 0;
      case "price": return tx.price || 0;
      case "comm": return tx.commCost || 0;
      case "net": return tx.net || 0;
      default: return 0;
    }
  };
  txs.sort((a, b) => {
    const va = txSortVal(a, txSort.key), vb = txSortVal(b, txSort.key);
    let cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
    return txSort.dir === "asc" ? cmp : -cmp;
  });
  _markSortIndicators("[data-txsort]", "txsort", txSort);

  // Paginación (P0): resetea a la primera página cuando cambian filtros/orden/
  // portafolio; se conserva al hacer clic en "Cargar más".
  const filterKey = JSON.stringify({ filterType, filterTicker, filterFrom, filterTo, k: txSort.key, d: txSort.dir, pid: activePortfolioId });
  if (filterKey !== _txLastFilterKey) {
    _txVisibleCount = TX_PAGE_SIZE;
    _txLastFilterKey = filterKey;
  }

  const hasFilters = filterType || filterTicker || filterFrom || filterTo;
  if (allTxs.length) {
    countLabel.textContent = hasFilters
      ? `${txs.length} de ${allTxs.length} transacción(es)`
      : `${allTxs.length} transacción(es)`;
  } else {
    countLabel.textContent = "";
  }

  // Badge de filtros activos sobre el botón "Filtros" (móvil/tablet #7).
  const activeFilterCount = [filterType, filterTicker, filterFrom, filterTo].filter(Boolean).length;
  const filtersCountEl = document.getElementById("txFiltersCount");
  if (filtersCountEl) {
    filtersCountEl.textContent = activeFilterCount || "";
    filtersCountEl.classList.toggle("hidden", !activeFilterCount);
  }

  if (!allTxs.length) {
    shell.style.display = "none";
    noMsg.classList.remove("hidden");
    return;
  }
  shell.style.display = "";
  noMsg.classList.add("hidden");

  if (!txs.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--muted)">Sin resultados para los filtros aplicados.</td></tr>`;
    return;
  }

  // Agrupar por mes solo cuando el orden efectivo es por fecha (P0): con
  // cientos de transacciones (p. ej. dividendos auto-sincronizados), agrupar
  // por mes + paginar hace el historial navegable en vez de una lista plana.
  const groupByMonth = txSort.key === "date";
  const visibleTxs = txs.slice(0, _txVisibleCount);
  const remaining = txs.length - visibleTxs.length;

  const typeClassMap = { COMPRA: "tx-buy", DIVIDENDO: "tx-dividend", DEPOSITO: "tx-deposit", RETIRO: "tx-withdraw" };
  let lastMonthKey = null;
  const rowsHtml = visibleTxs.map((tx) => {
    const d = new Date(tx.date);
    const date = d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
    let monthHeaderHtml = "";
    if (groupByMonth) {
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthKey !== lastMonthKey) {
        lastMonthKey = monthKey;
        monthHeaderHtml = `<tr class="tx-month-header"><td colspan="8">${TX_MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}</td></tr>`;
      }
    }
    const typeClass = typeClassMap[tx.type] || "tx-sell";
    const sym = CURRENCY_SYMBOLS[tx.currency] || "$";
    const isCash = tx.type === "DEPOSITO" || tx.type === "RETIRO";
    return `${monthHeaderHtml}<tr>
      <td data-label="Fecha">${date}</td>
      <td data-label="Tipo"><span class="tx-badge ${typeClass}">${tx.type}</span></td>
      <td data-label="Activo"><strong>${isCash ? "Efectivo" : tx.ticker}</strong></td>
      <td data-label="Cantidad">${isCash ? "—" : tx.quantity}</td>
      <td data-label="Precio">${isCash ? "—" : sym + tx.price.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
      <td data-label="Comisión">${isCash ? "—" : sym + tx.commCost.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ` (${tx.commissionPercent.toFixed(2)}%)`}</td>
      <td data-label="Total"><strong>${sym}${tx.net.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
      <td data-label="Acciones" class="tx-actions-cell">
        <button type="button" class="tx-action-btn" onclick="openEditTxModal('${tx.id}')" title="Editar" aria-label="Editar">✎</button>
        <button type="button" class="tx-action-btn tx-action-del" onclick="confirmDeleteTx('${tx.id}')" title="Eliminar" aria-label="Eliminar">🗑</button>
      </td>
    </tr>`;
  }).join("");

  const loadMoreHtml = remaining > 0
    ? `<tr class="tx-load-more-row"><td colspan="8"><button type="button" id="txLoadMoreBtn" class="tx-load-more-btn">Cargar ${Math.min(remaining, TX_PAGE_SIZE)} más (${remaining} restantes)</button></td></tr>`
    : "";

  tbody.innerHTML = rowsHtml + loadMoreHtml;

  document.getElementById("txLoadMoreBtn")?.addEventListener("click", () => {
    _txVisibleCount += TX_PAGE_SIZE;
    renderTransactionsTab();
  });
  _updateTableOverflowHint(shell);

  renderClosedTradesTab(portfolio);
}

// ── Operaciones cerradas / round-trips (#7) ─────────────────────────────────
// Empareja cada VENTA con sus COMPRAS por FIFO y calcula P/L realizada,
// retorno y tiempo de tenencia por operación. Convierte a la moneda del portafolio.
function computeClosedTrades(portfolio) {
  const cur = (portfolio && portfolio.currency) || "USD";
  const txs = (portfolio && portfolio.transactions ? portfolio.transactions : [])
    .filter((t) => t.type === "COMPRA" || t.type === "VENTA")
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const lots = {}; // ticker -> [{qty, unitCost, cur, date}]
  const trades = [];
  for (const tx of txs) {
    const tkr = tx.ticker;
    const txCur = tx.currency || cur;
    if (!lots[tkr]) lots[tkr] = [];
    if (tx.type === "COMPRA") {
      const qty = tx.quantity || 0;
      if (qty <= 0) continue;
      lots[tkr].push({ qty, unitCost: (tx.net || 0) / qty, cur: txCur, date: (tx.date || "").slice(0, 10) });
    } else { // VENTA
      const sellQty = tx.quantity || 0;
      if (sellQty <= 0) continue;
      const sellDate = (tx.date || "").slice(0, 10);
      const proceedsTotal = convertAmount(tx.net || 0, txCur, cur) ?? (tx.net || 0);
      const sellPricePer = convertAmount(tx.price || 0, txCur, cur) ?? (tx.price || 0);
      const arr = lots[tkr];
      let remaining = sellQty;
      let matchedCost = 0, matchedQty = 0, weightedDays = 0, earliestBuy = null;
      while (remaining > 1e-8 && arr.length) {
        const lot = arr[0];
        const use = Math.min(lot.qty, remaining);
        matchedCost += convertAmount(lot.unitCost * use, lot.cur, cur) ?? (lot.unitCost * use);
        matchedQty += use;
        weightedDays += Math.max(0, (new Date(sellDate) - new Date(lot.date)) / 86400000) * use;
        if (!earliestBuy || (lot.date && lot.date < earliestBuy)) earliestBuy = lot.date;
        lot.qty -= use;
        remaining -= use;
        if (lot.qty <= 1e-8) arr.shift();
      }
      if (matchedQty <= 0) continue;
      const proceeds = proceedsTotal * (matchedQty / sellQty);
      const pnl = proceeds - matchedCost;
      trades.push({
        ticker: tkr,
        buyDate: earliestBuy,
        sellDate,
        qty: matchedQty,
        buyPrice: matchedCost / matchedQty,
        sellPrice: sellPricePer,
        cost: matchedCost,
        proceeds,
        pnl,
        pnlPct: matchedCost > 0 ? pnl / matchedCost * 100 : null,
        holdingDays: Math.round(weightedDays / matchedQty),
      });
    }
  }
  return trades.sort((a, b) => new Date(b.sellDate) - new Date(a.sellDate));
}

function _fmtHolding(days) {
  if (days == null || !isFinite(days)) return "—";
  if (days < 31) return `${days} d`;
  if (days < 365) return `${Math.round(days / 30.44)} m`;
  const y = days / 365.25;
  return `${y.toFixed(1)} a`;
}

function renderClosedTradesTab(portfolio) {
  portfolio = portfolio || getPortfolios().find((p) => p.id === activePortfolioId);
  const body = document.getElementById("closedTradesBody");
  const shell = document.getElementById("closedTradesShell");
  const emptyMsg = document.getElementById("noClosedTradesMsg");
  const summary = document.getElementById("closedTradesSummary");
  if (!body || !portfolio) return;
  const cur = portfolio.currency || "USD";
  const trades = computeClosedTrades(portfolio);

  if (!trades.length) {
    body.innerHTML = "";
    if (shell) shell.classList.add("hidden");
    if (summary) summary.innerHTML = "";
    if (emptyMsg) emptyMsg.style.display = "";
    return;
  }
  if (shell) shell.classList.remove("hidden");
  if (emptyMsg) emptyMsg.style.display = "none";

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const totalCost = trades.reduce((s, t) => s + t.cost, 0);
  const winners = trades.filter((t) => t.pnl > 0).length;
  const winRate = trades.length ? winners / trades.length * 100 : 0;
  const avgHold = trades.reduce((s, t) => s + (t.holdingDays || 0), 0) / trades.length;
  const best = trades.reduce((m, t) => (t.pnlPct != null && (m == null || t.pnlPct > m.pnlPct)) ? t : m, null);
  const totalRetPct = totalCost > 0 ? totalPnl / totalCost * 100 : null;

  if (summary) {
    const pnlCls = totalPnl >= 0 ? "return-pos" : "return-neg";
    summary.innerHTML = `
      <div class="cts-item"><span>Operaciones</span><strong>${trades.length}</strong></div>
      <div class="cts-item"><span>P/L realizada</span><strong class="${pnlCls}">${totalPnl >= 0 ? "+" : ""}${formatCurrency(totalPnl, cur)}</strong></div>
      <div class="cts-item"><span>Retorno realizado</span><strong class="${totalRetPct != null && totalRetPct >= 0 ? "return-pos" : "return-neg"}">${totalRetPct != null ? (totalRetPct >= 0 ? "+" : "") + totalRetPct.toFixed(2) + "%" : "—"}</strong></div>
      <div class="cts-item"><span>Tasa de acierto</span><strong>${winRate.toFixed(0)}% <small class="cts-days">(${winners}/${trades.length})</small></strong></div>
      <div class="cts-item"><span>Tenencia prom.</span><strong>${_fmtHolding(avgHold)}</strong></div>
      <div class="cts-item"><span>Mejor operación</span><strong class="return-pos">${best && best.pnlPct != null ? best.ticker + " +" + best.pnlPct.toFixed(1) + "%" : "—"}</strong></div>`;
  }

  body.innerHTML = trades.map((t) => {
    const cls = t.pnl >= 0 ? "return-pos" : "return-neg";
    const sign = t.pnl >= 0 ? "+" : "";
    const buyD = t.buyDate ? new Date(t.buyDate + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" }) : "—";
    const sellD = t.sellDate ? new Date(t.sellDate + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" }) : "—";
    const qtyStr = t.qty.toLocaleString("es-MX", { maximumFractionDigits: 6 });
    return `<tr>
      <td data-label="Ticker"><strong>${t.ticker}</strong></td>
      <td data-label="Compra">${buyD}</td>
      <td data-label="Venta">${sellD}</td>
      <td data-label="Tenencia"><span class="cts-days">${_fmtHolding(t.holdingDays)}</span></td>
      <td data-label="Cantidad">${qtyStr}</td>
      <td data-label="P. compra">${formatCurrency(t.buyPrice, cur)}</td>
      <td data-label="P. venta">${formatCurrency(t.sellPrice, cur)}</td>
      <td data-label="P/L realizada"><span class="${cls}">${sign}${formatCurrency(t.pnl, cur)}</span></td>
      <td data-label="Retorno"><span class="${cls}">${t.pnlPct != null ? sign + t.pnlPct.toFixed(2) + "%" : "—"}</span></td>
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

// ── Editar / Eliminar transacciones ───────────────────────────────────────────
// Modelo: las transacciones son la bitácora; las posiciones se guardan aparte.
// avgPrice y commissionPercent son promedios ponderados SOLO por compras (no
// cambian al vender). Al editar/eliminar una COMPRA/VENTA reconstruimos la
// posición del activo afectado replayando su historial y sembrando un "baseline"
// para la porción importada por CSV que no tiene transacción asociada.

// Efecto neto de una transacción sobre el efectivo, en moneda del portafolio.
function txCashEffect(tx, portfolioCur) {
  const cur = tx.currency || portfolioCur;
  const net = tx.net || 0;
  const conv = cur !== portfolioCur ? (convertAmount(net, cur, portfolioCur) ?? net) : net;
  const sign = (tx.type === "COMPRA" || tx.type === "RETIRO") ? -1 : 1; // VENTA/DIVIDENDO/DEPOSITO suman
  return sign * conv;
}

// Porción de una posición NO representada en el historial de transacciones
// (p. ej. importada por CSV). Se calcula ANTES de mutar las transacciones.
function captureTickerBaseline(portfolio, ticker) {
  const pos = (portfolio.positions || []).find((p) => p.ticker === ticker);
  if (!pos) return null;
  const txs = (portfolio.transactions || []).filter((t) => t.ticker === ticker && (t.type === "COMPRA" || t.type === "VENTA"));
  let txBoughtQty = 0, txBoughtInvested = 0, txBoughtComm = 0, txSoldQty = 0;
  for (const t of txs) {
    if (t.type === "COMPRA") {
      txBoughtQty += t.quantity || 0;
      txBoughtInvested += (t.price || 0) * (t.quantity || 0);
      txBoughtComm += t.commCost || 0;
    } else {
      txSoldQty += t.quantity || 0;
    }
  }
  const boughtQtyBefore = (pos.quantity || 0) + txSoldQty; // cantidad total comprada = actual + vendida
  const baselineQty = boughtQtyBefore - txBoughtQty;
  if (baselineQty <= 1e-9) {
    return { qty: 0, invested: 0, comm: 0, currency: getPosCurrency(pos, portfolio.currency || "USD"),
             applyIva: pos.applyIva, ivaRate: pos.ivaRate, purchaseDate: pos.purchaseDate, id: pos.id };
  }
  // Reversa exacta del avg/comisión ponderados para aislar la porción baseline.
  const baselineInvested = (pos.avgPrice || 0) * (baselineQty + txBoughtQty) - txBoughtInvested;
  const baselineComm = (pos.commissionPercent || 0) / 100 * (pos.avgPrice || 0) * (baselineQty + txBoughtQty) - txBoughtComm;
  return {
    qty: baselineQty,
    invested: Math.max(0, baselineInvested),
    comm: Math.max(0, baselineComm),
    currency: getPosCurrency(pos, portfolio.currency || "USD"),
    applyIva: pos.applyIva, ivaRate: pos.ivaRate, purchaseDate: pos.purchaseDate, id: pos.id
  };
}

// Reconstruye la posición abierta de un ticker replayando su historial con la
// MISMA semántica de promedio móvil incremental que usa addPosition/withdraw:
// la compra pondera contra la cantidad tenida al momento; la venta solo reduce
// cantidad (avg y comisión no cambian). Se siembra con la porción baseline
// (importada por CSV) si existe.
function rebuildOpenPositionForTicker(portfolio, ticker, baseline) {
  const txs = (portfolio.transactions || [])
    .filter((t) => t.ticker === ticker && (t.type === "COMPRA" || t.type === "VENTA"))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let qty = 0, avg = 0, commPct = 0;
  let currency = portfolio.currency || "USD";
  let earliestDate = null;
  if (baseline && baseline.qty > 1e-9) {
    qty = baseline.qty;
    avg = baseline.invested / baseline.qty;
    commPct = baseline.invested > 0 ? (baseline.comm / baseline.invested) * 100 : 0;
    currency = baseline.currency;
    earliestDate = baseline.purchaseDate || null;
  }

  for (const tx of txs) {
    currency = tx.currency || currency;
    if (tx.type === "COMPRA") {
      // Si la posición estaba en cero, esta compra reinicia el tramo de
      // tenencia actual: la fecha debe reflejar desde cuándo se sostiene la
      // posición ACTUAL, no la primera compra de todos los tiempos. Sin esto,
      // vender todo y recomprar después dejaba `purchaseDate` "vieja", y el
      // historial (buildAllPositionHistory) contaba el hueco sin acciones
      // como si se tuviera la cantidad actual — inflaba el gráfico de valor.
      const wasEmpty = qty <= 1e-9;
      const oldInvested = avg * qty;
      const newInvested = (tx.price || 0) * (tx.quantity || 0);
      const oldComm = oldInvested * commPct / 100;
      const newComm = tx.commCost || 0;
      qty += tx.quantity || 0;
      avg = qty > 0 ? (oldInvested + newInvested) / qty : 0;
      const totInvested = oldInvested + newInvested;
      commPct = totInvested > 0 ? (oldComm + newComm) / totInvested * 100 : commPct;
      const d = (tx.date || "").slice(0, 10);
      if (d && (wasEmpty || !earliestDate)) earliestDate = d;
      else if (d && d < earliestDate) earliestDate = d;
    } else { // VENTA: solo reduce cantidad (igual que el handler de retiro)
      qty = Math.max(0, qty - (tx.quantity || 0));
    }
  }

  qty = parseFloat(qty.toFixed(10));
  const positions = portfolio.positions || (portfolio.positions = []);
  const idx = positions.findIndex((p) => p.ticker === ticker);

  if (qty <= 1e-9) {
    if (idx !== -1) positions.splice(idx, 1); // posición cerrada
    return;
  }

  if (idx !== -1) {
    positions[idx].quantity = qty;
    positions[idx].avgPrice = avg;
    positions[idx].commissionPercent = commPct;
    positions[idx].currency = currency;
    if (earliestDate) positions[idx].purchaseDate = earliestDate;
  } else {
    positions.push({
      id: generateId(),
      ticker,
      avgPrice: avg,
      quantity: qty,
      commissionPercent: commPct,
      applyIva: baseline ? baseline.applyIva || false : false,
      ivaRate: baseline ? baseline.ivaRate || 0 : 0,
      purchaseDate: earliestDate,
      currency
    });
  }
}

// Aplica una edición (newTx) o eliminación (newTx === null) de una transacción,
// recalculando posición(es) y efectivo afectados.
function applyTxMutation(portfolio, oldTx, newTx) {
  const portfolioCur = portfolio.currency || "USD";
  portfolio.transactions = portfolio.transactions || [];

  // Tickers cuya posición hay que reconstruir (solo COMPRA/VENTA afectan posición).
  const affected = new Set();
  if (oldTx.type === "COMPRA" || oldTx.type === "VENTA") affected.add(oldTx.ticker);
  if (newTx && (newTx.type === "COMPRA" || newTx.type === "VENTA")) affected.add(newTx.ticker);

  // Baselines calculados con el estado PRE-edición.
  const baselines = {};
  affected.forEach((tk) => { baselines[tk] = captureTickerBaseline(portfolio, tk); });

  // Ajuste de efectivo por el delta del efecto de la transacción (nunca negativo,
  // igual que el resto de la app).
  const cashDelta = (newTx ? txCashEffect(newTx, portfolioCur) : 0) - txCashEffect(oldTx, portfolioCur);
  portfolio.cashBalance = Math.max(0, (portfolio.cashBalance || 0) + cashDelta);

  // Mutar el arreglo de transacciones.
  const i = portfolio.transactions.findIndex((t) => t.id === oldTx.id);
  if (i === -1) return false;
  if (newTx) portfolio.transactions[i] = newTx;
  else portfolio.transactions.splice(i, 1);

  // Reconstruir posiciones afectadas.
  affected.forEach((tk) => rebuildOpenPositionForTicker(portfolio, tk, baselines[tk]));

  // El P/L realizado es función pura de las transacciones.
  portfolio.realizedPnL = reconstructRealizedPnL(portfolio);
  return true;
}

// Muestra/oculta campos del modal según el tipo de transacción.
function updateEditTxFields(type) {
  const isCash = type === "DEPOSITO" || type === "RETIRO";
  const isDiv = type === "DIVIDENDO";
  document.getElementById("editTxTickerRow").classList.toggle("hidden", isCash);
  document.getElementById("editTxQtyRow").classList.toggle("hidden", isCash);
  document.getElementById("editTxCommRow").classList.toggle("hidden", isCash || isDiv);
  document.getElementById("editTxPriceLabel").textContent =
    isCash ? "Monto" : (isDiv ? "Dividendo por acción" : "Precio");
}

function openEditTxModal(txId) {
  const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
  const tx = portfolio ? (portfolio.transactions || []).find((t) => t.id === txId) : null;
  if (!tx) return;
  document.getElementById("editTxId").value = tx.id;
  document.getElementById("editTxType").value = tx.type;
  document.getElementById("editTxDate").value = (tx.date || "").slice(0, 10);
  document.getElementById("editTxTicker").value = (tx.type === "DEPOSITO" || tx.type === "RETIRO") ? "" : (tx.ticker || "");
  document.getElementById("editTxQuantity").value = tx.quantity ?? "";
  document.getElementById("editTxPrice").value = tx.price ?? "";
  document.getElementById("editTxCommission").value = tx.commissionPercent ?? 0;
  document.getElementById("editTxError").classList.add("hidden");
  updateEditTxFields(tx.type);
  openModal("editTxModal");
}

// Construye el objeto de transacción a partir de los campos del formulario.
function buildTxFromForm(oldTx, type, dateStr, ticker, quantity, price, commissionPercent) {
  const base = { id: oldTx.id, date: new Date(dateStr + "T12:00:00").toISOString(), type, currency: oldTx.currency || "USD" };
  if (type === "DEPOSITO" || type === "RETIRO") {
    return { ...base, ticker: "CASH", quantity: 1, price, commissionPercent: 0, commCost: 0, net: price };
  }
  if (type === "DIVIDENDO") {
    return { ...base, ticker, quantity, price, commissionPercent: 0, commCost: 0, net: price * quantity };
  }
  const commCost = price * quantity * (commissionPercent / 100);
  const gross = price * quantity;
  const net = type === "COMPRA" ? gross + commCost : gross - commCost;
  return { ...base, ticker, quantity, price, commissionPercent, commCost, net };
}

function confirmDeleteTx(txId) {
  const portfolios = getPortfolios();
  const portfolio = portfolios.find((p) => p.id === activePortfolioId);
  const tx = portfolio ? (portfolio.transactions || []).find((t) => t.id === txId) : null;
  if (!tx) return;
  const label = (tx.type === "DEPOSITO" || tx.type === "RETIRO") ? tx.type : `${tx.type} ${tx.ticker}`;
  if (!confirm(`¿Eliminar la transacción "${label}"? Se recalcularán la posición y el efectivo afectados.`)) return;
  applyTxMutation(portfolio, tx, null);
  savePortfolios(portfolios);
  renderPortfolioDashboard();
  renderTransactionsTab();
  showToast("Transacción eliminada.", { type: "success" });
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

// Etiqueta de frescura del precio cacheado (L2.10)
function _priceFreshnessLabel(ticker, cache) {
  const entry = (cache || getPriceCache())[ticker];
  if (!entry || !entry.ts) return { title: "Precio no disponible", cls: "stale" };
  const ageMin = (Date.now() - entry.ts) / 60000;
  const when = new Date(entry.ts).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  const rel = ageMin < 1 ? "hace segundos" : ageMin < 60 ? `hace ${Math.round(ageMin)} min` : `hace ${Math.round(ageMin / 60)} h`;
  const cls = ageMin > 60 ? "stale" : ageMin > 15 ? "aging" : "fresh";
  return { title: `Actualizado ${when} · ${rel}`, cls };
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

// ── Equivalencia del portafolio en otra moneda (no altera el valor real) ──
const DASH_ALT_CURRENCIES = ["USD", "EUR", "MXN", "GBP", "JPY", "CAD", "BRL", "CNY", "AUD", "CHF"];

function getDashAltCurrency(portfolioCurrency) {
  return localStorage.getItem(`bp_dashAltCurrency_${activePortfolioId}`) || "";
}

function setDashAltCurrency(value) {
  if (value) localStorage.setItem(`bp_dashAltCurrency_${activePortfolioId}`, value);
  else localStorage.removeItem(`bp_dashAltCurrency_${activePortfolioId}`);
}

function populateDashAltCurrencySelect(portfolioCurrency) {
  const sel = document.getElementById("dashAltCurrencySelect");
  if (!sel) return;
  const selected = getDashAltCurrency(portfolioCurrency);
  const options = ["", ...DASH_ALT_CURRENCIES.filter(c => c !== portfolioCurrency)];
  sel.innerHTML = options.map(c => `<option value="${c}">${c || "Sin equivalencia"}</option>`).join("");
  sel.value = selected && options.includes(selected) ? selected : "";
}

function convertAmount(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;
  const rate = getCachedExchangeRate(fromCurrency, toCurrency);
  return rate !== null ? amount * rate : null;
}

function formatDashExchangeRate(fromCurrency, toCurrency) {
  if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return "";
  const rate = getCachedExchangeRate(fromCurrency, toCurrency);
  if (rate === null) return "Tipo de cambio pendiente";
  const decimals = rate >= 100 ? 2 : rate >= 10 ? 4 : 6;
  return `TC usado: 1 ${fromCurrency} = ${rate.toFixed(decimals)} ${toCurrency}`;
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
  // El sufijo del ticker (.MX, .DE, etc.) es autoritativo: Yahoo cotiza esos
  // mercados SIEMPRE en su divisa local, sin importar lo que se haya guardado.
  return detectCurrencyFromTicker(pos.ticker) || pos.currency || fallback || "USD";
}

// Precio promedio EFECTIVO por acción: incluye comisión de entrada e IVA,
// para acercarse al costo real que reporta el broker. No altera avgPrice.
function effectiveAvgPrice(pos) {
  const qty = pos.quantity || 0;
  if (qty <= 0) return pos.avgPrice || 0;
  return calcPositionTotals(pos).total / qty;
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

// Resumen financiero de un portafolio usando precios en caché (sin fetch).
// Reutilizado por las tarjetas de la lista y la barra de patrimonio consolidado.
function computePortfolioSnapshot(portfolio) {
  const positions = portfolio.positions || [];
  const currency = portfolio.currency || "USD";
  let totalCurrentValue = 0, totalCostPriced = 0, prevValue = 0, hasAnyPrice = false;
  positions.forEach((pos) => {
    const price = getCachedPrice(pos.ticker);
    if (price === null) return;
    const posCur = getPosCurrency(pos, currency);
    const qty = pos.quantity || 0;
    hasAnyPrice = true;
    totalCurrentValue += convertAmount(price * qty, posCur, currency) ?? (price * qty);
    const cost = calcPositionTotals(pos).total;
    totalCostPriced += convertAmount(cost, posCur, currency) ?? cost;
    const prev = getCachedPrev(pos.ticker);
    const pv = (prev !== null ? prev : price) * qty;
    prevValue += convertAmount(pv, posCur, currency) ?? pv;
  });
  const cashBalance = portfolio.cashBalance || 0;
  // Fuente única de verdad: el P/L realizado se reconstruye siempre desde las transacciones
  const realizedPnL = reconstructRealizedPnL(portfolio);
  const currentValue = (hasAnyPrice ? totalCurrentValue : 0) + cashBalance;
  const unrealizedPnL = hasAnyPrice ? totalCurrentValue - totalCostPriced : 0;
  const returnAmt = (hasAnyPrice || (!positions.length && realizedPnL !== 0))
    ? unrealizedPnL + realizedPnL : null;
  // Retorno % sobre el costo invertido (base de costo), no sobre el valor actual
  const returnCostBasis = totalCostPriced > 0 ? totalCostPriced : 0;
  const returnPct = returnAmt !== null && returnCostBasis > 0 ? returnAmt / returnCostBasis * 100 : null;
  const dayChangeAmt = hasAnyPrice ? totalCurrentValue - prevValue : null;
  const dayChangePct = dayChangeAmt !== null && prevValue > 0 ? dayChangeAmt / prevValue * 100 : null;
  return {
    currency, currentValue, hasAnyPrice, returnAmt, returnPct,
    dayChangeAmt, dayChangePct, positionCount: positions.length,
  };
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
  // Salir de modo consolidado (P0.4)
  _consolidatedActive = false;
  _consolidatedPortfolio = null;
  document.getElementById("trackerDashView").classList.remove("is-consolidated");
  document.getElementById("trackerListView").classList.remove("hidden");
  document.getElementById("trackerDashView").classList.add("hidden");
  renderPortfolioCards();
  renderWatchlist();
  loadListViewData();
}

// Abre la vista consolidada navegable (P0.4)
function showConsolidatedDashView() {
  const synthetic = buildConsolidatedPortfolio();
  if (!synthetic) { showToast("Necesitas al menos 2 portafolios con posiciones para consolidar.", { type: "warn" }); return; }
  showTrackerDashView(CONSOLIDATED_ID);
  window.bpTrack?.("consolidated_view_open");
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
  // Modo consolidado (P0.4): construir el sintético ANTES de cualquier búsqueda por id.
  _consolidatedActive = (portfolioId === CONSOLIDATED_ID);
  _consolidatedPortfolio = _consolidatedActive ? buildConsolidatedPortfolio() : null;
  if (_consolidatedActive && !_consolidatedPortfolio) { showTrackerListView(); return; }
  document.getElementById("trackerDashView").classList.toggle("is-consolidated", _consolidatedActive);
  // Reiniciar búsqueda/orden de la tabla de posiciones al abrir un portafolio (L2.2)
  posSearch = "";
  posSort = { key: null, dir: "asc" };
  const _posSearchEl = document.getElementById("positionsSearchInput");
  if (_posSearchEl) _posSearchEl.value = "";
  perfTabLoaded = false;
  summaryValueLoaded = false;
  perfDailyReturns = null;
  perfReportData = null;
  mcTabLoaded = false;
  // Reiniciar el toggle de serie del gráfico hero a "Valor" (P0.3)
  summaryChartMode = "value";
  _summaryChartData = null;
  _valueCustomRange = null; // limpiar rango personalizado (P1.8)
  // Reiniciar el toggle de composición a "Ponderación" (Visual 1)
  _compositionMode = "donut";
  document.querySelectorAll("#compositionToggle .comp-btn").forEach((b) => b.classList.toggle("active", b.dataset.comp === "donut"));
  document.querySelectorAll("#compositionCard .comp-panel").forEach((p) => p.classList.toggle("hidden", p.dataset.compPanel !== "donut"));
  const _compCard = document.getElementById("compositionCard");
  if (_compCard) _compCard.dataset.comp = "donut";
  document.querySelectorAll("#valueSeriesToggle .value-series-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.series === "value"));
  _invalidatePriceCache(portfolioId);
  // Reset to Summary tab
  document.querySelectorAll(".tracker-tab-btn").forEach((b) => b.classList.remove("active"));
  const summaryBtn = document.querySelector(".tracker-tab-btn[data-tab='summary']");
  if (summaryBtn) summaryBtn.classList.add("active");
  document.getElementById("tabPanelSummary").style.display = "";
  document.getElementById("tabPanelDesempeno").style.display = "none";
  document.getElementById("tabPanelTransacciones").style.display = "none";
  document.getElementById("tabPanelProyeccion").style.display = "none";
  document.getElementById("tabPanelMetas").style.display = "none";
  document.getElementById("tabPanelDividendos").style.display = "none";
  document.getElementById("tabPanelRebalanceo").style.display = "none";
  document.getElementById("tabPanelCorrelacion").style.display = "none";
  document.getElementById("tabPanelWhatif").style.display = "none";
  corrTabLoaded = false;
  goalTabLoaded = false;
  document.getElementById("trackerListView").classList.add("hidden");
  document.getElementById("trackerDashView").classList.remove("hidden");
  renderPortfolioDashboard();
  // Restaurar la última pestaña activa de este portafolio (L2.4)
  try {
    const savedTab = localStorage.getItem(`bp_activeTab_${portfolioId}`);
    if (savedTab && savedTab !== "summary") {
      const tabBtn = document.querySelector(`.tracker-tab-btn[data-tab='${savedTab}']`);
      if (tabBtn) tabBtn.click();
    }
  } catch {}
  // Cargar la gráfica de valor si el Resumen quedó visible (#1)
  if (!summaryValueLoaded && document.getElementById("tabPanelSummary").style.display !== "none") {
    const p = getPortfolios().find((q) => q.id === portfolioId);
    if (p) loadSummaryValueChart(p);
  }
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
  updateMobileQuickStartVisibility();

  // Evita el parpadeo de "Aún no tienes portafolios" mientras el bootstrap a
  // Postgres sigue en curso (bug #5): muestra un skeleton hasta que resuelva
  // (éxito o error; _portfolioSyncAttempted evita un skeleton infinito si el
  // backend falla y no hay datos locales de respaldo).
  if (!portfolios.length && !_portfolioSyncAttempted) {
    emptyMsg.classList.add("hidden");
    grid.innerHTML = Array.from({ length: 2 }).map(() => `
      <div class="portfolio-card portfolio-card-skeleton" aria-hidden="true">
        <div class="skel-line skel-line--title"></div>
        <div class="skel-line skel-line--value"></div>
        <div class="skel-line skel-line--stats"></div>
      </div>
    `).join("");
    return;
  }

  if (!portfolios.length) {
    grid.innerHTML = "";
    emptyMsg.classList.remove("hidden");
    return;
  }

  emptyMsg.classList.add("hidden");
  grid.innerHTML = portfolios.map((p) => {
    const date = new Date(p.createdAt).toLocaleDateString("es-MX", {
      day: "2-digit", month: "short", year: "numeric"
    });
    const currLabel = p.currency || "USD";
    const snap = computePortfolioSnapshot(p);
    const valueStr = snap.hasAnyPrice || snap.currentValue > 0
      ? formatCurrency(snap.currentValue, currLabel) : "—";
    let dayHtml = "";
    if (snap.dayChangePct !== null) {
      const up = snap.dayChangePct >= 0;
      dayHtml = `<span class="pc-day ${up ? "return-pos" : "return-neg"}">${up ? "▲" : "▼"} ${up ? "+" : ""}${snap.dayChangePct.toFixed(2)}% hoy</span>`;
    }
    let retHtml = "—";
    if (snap.returnPct !== null) {
      const up = snap.returnPct >= 0;
      retHtml = `<em class="${up ? "return-pos" : "return-neg"}">${up ? "+" : ""}${snap.returnPct.toFixed(2)}%</em>`;
    }
    return `
      <button class="portfolio-card" type="button" data-portfolio-id="${p.id}">
        <div class="portfolio-card-header">
          <h3>${p.name}</h3>
          <span role="button" class="portfolio-card-delete" data-delete-id="${p.id}" data-delete-name="${p.name}" title="Eliminar portafolio" tabindex="0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </span>
        </div>
        <div class="portfolio-card-value">
          <strong>${valueStr}</strong>
          ${dayHtml}
        </div>
        <div class="portfolio-card-stats">
          <span class="pc-stat">Retorno ${retHtml}</span>
          <span class="pc-stat">${snap.positionCount} ${snap.positionCount === 1 ? "posición" : "posiciones"}</span>
          <span class="pc-curr">${currLabel}</span>
        </div>
        <div class="portfolio-card-footer">
          <span class="portfolio-card-date">Creado ${date}</span>
          <span class="portfolio-card-cta">Ver portafolio →</span>
        </div>
      </button>
    `;
  }).join("");

  renderConsolidatedBar(portfolios);

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

// ── Barra de patrimonio consolidado (suma de todos los portafolios) ──────────
function renderConsolidatedBar(portfolios) {
  const bar = document.getElementById("consolidatedBar");
  if (!bar) return;
  portfolios = portfolios || getPortfolios();
  if (portfolios.length < 1) { bar.classList.add("hidden"); bar.innerHTML = ""; return; }

  // Moneda base = la más frecuente entre los portafolios
  const counts = {};
  portfolios.forEach(p => { const c = p.currency || "USD"; counts[c] = (counts[c] || 0) + 1; });
  const base = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || "USD";

  let totalValue = 0, totalDay = 0, totalPrevDay = 0, totalReturn = 0;
  let anyValue = false, anyDay = false, anyReturn = false, fxMissing = false;
  portfolios.forEach((p) => {
    const snap = computePortfolioSnapshot(p);
    const cur = snap.currency;
    const conv = (amt) => {
      if (amt === null) return null;
      const v = convertAmount(amt, cur, base);
      if (v === null) { fxMissing = true; return null; }
      return v;
    };
    if (snap.hasAnyPrice || snap.currentValue > 0) {
      const v = conv(snap.currentValue);
      if (v !== null) { totalValue += v; anyValue = true; }
    }
    if (snap.dayChangeAmt !== null) {
      const d = conv(snap.dayChangeAmt);
      const prev = conv(snap.currentValue - snap.dayChangeAmt);
      if (d !== null && prev !== null) { totalDay += d; totalPrevDay += prev; anyDay = true; }
    }
    if (snap.returnAmt !== null) {
      const r = conv(snap.returnAmt);
      if (r !== null) { totalReturn += r; anyReturn = true; }
    }
  });

  if (!anyValue) { bar.classList.add("hidden"); bar.innerHTML = ""; return; }

  const dayPct = anyDay && totalPrevDay > 0 ? totalDay / totalPrevDay * 100 : null;
  const retPct = anyReturn && (totalValue - totalReturn) > 0 ? totalReturn / (totalValue - totalReturn) * 100 : null;
  const metric = (label, valueHtml) => `<div class="cbar-metric"><span class="cbar-label">${label}</span><strong class="cbar-value">${valueHtml}</strong></div>`;
  const signed = (amt, pct) => {
    const up = amt >= 0;
    const cls = up ? "return-pos" : "return-neg";
    const pctStr = pct !== null ? ` <em class="${cls}">(${up ? "+" : ""}${pct.toFixed(2)}%)</em>` : "";
    return `<span class="${cls}">${up ? "+" : ""}${formatCurrency(amt, base)}</span>${pctStr}`;
  };

  bar.innerHTML = `
    <div class="cbar-metric cbar-metric--primary">
      <span class="cbar-label">Patrimonio total · ${portfolios.length} ${portfolios.length === 1 ? "portafolio" : "portafolios"}</span>
      <strong class="cbar-value cbar-value--lg">${formatCurrency(totalValue, base)} <small>${base}</small></strong>
    </div>
    ${anyDay ? metric("Cambio hoy", signed(totalDay, dayPct)) : ""}
    ${anyReturn ? metric("Retorno total", signed(totalReturn, retPct)) : ""}
    ${fxMissing ? `<div class="cbar-note">Algunos valores aún sin tipo de cambio</div>` : ""}
    ${portfolios.length >= 2 ? `<button id="consolidatedOpenBtn" class="button primary cbar-cta" type="button">Ver análisis consolidado →</button>` : ""}
  `;
  bar.classList.remove("hidden");
  document.getElementById("consolidatedOpenBtn")?.addEventListener("click", showConsolidatedDashView);
}

// Carga precios+FX de todos los portafolios y refresca tarjetas + barra consolidada
async function loadListViewData() {
  const portfolios = getPortfolios();
  if (!portfolios.length) return;
  const tickers = [...new Set(portfolios.flatMap(p => (p.positions || []).map(pos => pos.ticker)))];
  if (!tickers.length) return;
  const counts = {};
  portfolios.forEach(p => { const c = p.currency || "USD"; counts[c] = (counts[c] || 0) + 1; });
  const base = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || "USD";
  // Pares FX: posición→moneda-del-portafolio (para snapshot) y moneda-del-portafolio→base (para consolidar)
  const fxJobs = [];
  portfolios.forEach((p) => {
    const cur = p.currency || "USD";
    const posCurs = (p.positions || []).map(pos => getPosCurrency(pos, cur));
    fxJobs.push(fetchExchangeRates(posCurs, cur));
  });
  fxJobs.push(fetchExchangeRates(portfolios.map(p => p.currency || "USD"), base));
  try {
    await Promise.all([fetchPricesBatch(tickers), ...fxJobs]);
  } catch {}
  // Solo re-renderizar si seguimos en la vista de lista
  if (!document.getElementById("trackerListView").classList.contains("hidden")) {
    renderPortfolioCards();
  }
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

  const altCurrency = getDashAltCurrency(portfolio.currency || "USD");
  if (altCurrency) {
    fetchExchangeRates([portfolio.currency || "USD"], altCurrency).then(() => _doRenderDashboard(portfolio));
  }

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

  // Consolidado: reconstruir con FX ya cargado para que el efectivo agregado sea exacto.
  if (_consolidatedActive) {
    _consolidatedPortfolio = buildConsolidatedPortfolio() || _consolidatedPortfolio;
    portfolio = _consolidatedPortfolio;
  }

  // Sincronizar dividendos automáticamente (necesita FX cargado para conversión).
  // En modo consolidado no se sincroniza: es sólo lectura y ya se sincroniza por portafolio.
  const portfolios = getPortfolios();
  const stored = portfolios.find((p) => p.id === activePortfolioId);
  if (stored && !_consolidatedActive) {
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
  // Si el portafolio gestiona efectivo (aportes/retiros), usar el modelo de flujos de caja:
  // los aportes (−) y retiros (+) son los flujos externos; compras/ventas son movimientos
  // internos (efectivo↔activo) y no se cuentan para evitar doble conteo.
  const hasCashFlows = txs.some(t => t.type === "DEPOSITO" || t.type === "RETIRO");
  let flows;
  if (hasCashFlows) {
    flows = txs
      .filter(tx => tx.type === "DEPOSITO" || tx.type === "RETIRO")
      .map(tx => ({
        amount: tx.type === "DEPOSITO" ? -Math.abs(tx.net) : Math.abs(tx.net),
        date: new Date(tx.date)
      }));
  } else {
    flows = txs.map(tx => ({
      amount: tx.type === "COMPRA" ? -Math.abs(tx.net) : Math.abs(tx.net),
      date: new Date(tx.date)
    }));
  }
  if (!flows.length) return null;
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
  const col  = isUp ? GAIN_COLOR : LOSS_COLOR;
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
  let prevValue = 0;
  let hasAnyPrice = false;
  let pricedCount = 0;
  positions.forEach((pos) => {
    const price = getCachedPrice(pos.ticker);
    const posCur = getPosCurrency(pos, currency);
    if (price !== null) {
      hasAnyPrice = true;
      pricedCount++;
      const qty = pos.quantity || 0;
      totalCurrentValue += convertAmount(price * qty, posCur, currency) ?? (price * qty);
      totalCostPriced += convertAmount(calcPositionTotals(pos).total, posCur, currency) ?? calcPositionTotals(pos).total;
      const prev = getCachedPrev(pos.ticker);
      const pv = (prev !== null ? prev : price) * qty;
      prevValue += convertAmount(pv, posCur, currency) ?? pv;
    }
  });

  const cashBalance = portfolio.cashBalance || 0;
  // Fuente única de verdad: el P/L realizado se reconstruye siempre desde las transacciones
  const realizedPnL = reconstructRealizedPnL(portfolio);

  const displayCurrentValue = (hasAnyPrice ? totalCurrentValue : 0) + cashBalance;
  _lastPortfolioCurrentValue = displayCurrentValue > 0 ? displayCurrentValue : null;
  const unrealizedPnL = hasAnyPrice ? totalCurrentValue - totalCostPriced : 0;
  const showReturn = hasAnyPrice || (!positions.length && realizedPnL !== 0);
  const returnAmt = showReturn ? unrealizedPnL + realizedPnL : null;
  // Retorno % sobre el costo invertido de las posiciones con precio (base de costo), no sobre el valor actual
  const returnCostBasis = totalCostPriced > 0 ? totalCostPriced : 0;
  const returnPct = returnAmt !== null && returnCostBasis > 0
    ? (returnAmt / returnCostBasis * 100)
    : null;

  document.getElementById("dashPortfolioName").textContent = portfolio.name;
  document.getElementById("dashTotalInvested").textContent = formatCurrency(totalInvested, currency);
  document.getElementById("dashPositionCount").textContent = positions.length;
  document.getElementById("dashTotalCommissions").textContent = formatCurrency(totalComm, currency);
  document.getElementById("dashTotalIva").textContent = formatCurrency(totalIva, currency);
  document.getElementById("dashBenchmark").textContent = BENCHMARKS[portfolio.benchmark] || "—";

  // Efectivo disponible en el portafolio (L1.10)
  const cashEl = document.getElementById("dashCashBalance");
  if (cashEl) cashEl.textContent = formatCurrency(cashBalance, currency);

  // Aviso de alcance: valor y retorno excluyen posiciones sin precio (L1.7)
  const investedNoteEl = document.getElementById("dashInvestedNote");
  if (investedNoteEl) {
    const unpriced = positions.length - pricedCount;
    investedNoteEl.textContent = (positions.length && unpriced > 0)
      ? `Valor y retorno excluyen ${unpriced} sin precio`
      : "";
  }

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

  // ── Equivalencia en otra moneda (solo informativa, no altera el valor real) ──
  populateDashAltCurrencySelect(currency);
  const altCurrency = getDashAltCurrency(currency);
  const cvAltEl = document.getElementById("dashCurrentValueAlt");
  const retAltEl = document.getElementById("dashReturnAmtAlt");
  const fxRateEl = document.getElementById("dashAltFxRate");
  if (altCurrency && altCurrency !== currency) {
    const cvConverted = (hasAnyPrice || cashBalance > 0) ? convertAmount(displayCurrentValue, currency, altCurrency) : null;
    cvAltEl.textContent = cvConverted !== null ? `≈ ${formatCurrency(cvConverted, altCurrency)}` : "";
    if (fxRateEl) fxRateEl.textContent = formatDashExchangeRate(currency, altCurrency);
    if (returnAmt !== null) {
      const retConverted = convertAmount(returnAmt, currency, altCurrency);
      const sign = returnAmt >= 0 ? "+" : "";
      retAltEl.textContent = retConverted !== null ? `≈ ${sign}${formatCurrency(retConverted, altCurrency)}` : "";
    } else {
      retAltEl.textContent = "";
    }
  } else {
    cvAltEl.textContent = "";
    retAltEl.textContent = "";
    if (fxRateEl) fxRateEl.textContent = "";
  }

  // P/L no realizada vs realizada
  const setPnlKpi = (id, value, show) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!show) { el.textContent = "—"; el.className = ""; return; }
    const sign = value >= 0 ? "+" : "";
    el.textContent = sign + formatCurrency(value, currency);
    el.className = value >= 0 ? "return-pos" : "return-neg";
  };
  setPnlKpi("dashUnrealizedPnL", unrealizedPnL, hasAnyPrice);
  setPnlKpi("dashRealizedPnL", realizedPnL, realizedPnL !== 0);

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

  // ── Cambio de hoy (variación vs cierre anterior, solo posiciones con precio) ──
  const dayAmtEl = document.getElementById("dashDayChangeAmt");
  const dayPctEl = document.getElementById("dashDayChangePct");
  if (dayAmtEl && dayPctEl) {
    const dayChangeAmt = hasAnyPrice ? totalCurrentValue - prevValue : null;
    const dayChangePct = dayChangeAmt !== null && prevValue > 0 ? dayChangeAmt / prevValue * 100 : null;
    if (dayChangeAmt !== null) {
      const sign = dayChangeAmt >= 0 ? "+" : "";
      dayAmtEl.textContent = sign + formatCurrency(dayChangeAmt, currency);
      dayAmtEl.className = dayChangeAmt >= 0 ? "return-pos" : "return-neg";
      if (dayChangePct !== null) {
        dayPctEl.textContent = `${sign}${dayChangePct.toFixed(2)}% hoy`;
        dayPctEl.className = dayChangePct >= 0 ? "return-pos" : "return-neg";
      } else {
        dayPctEl.textContent = "";
        dayPctEl.className = "";
      }
    } else {
      dayAmtEl.textContent = "—"; dayAmtEl.className = "";
      dayPctEl.textContent = ""; dayPctEl.className = "";
    }
  }

  renderSummaryTable(positions, totalInvested, currency, cashBalance);
  renderPositionsTable(positions, totalInvested, currency, portfolio.transactions || []);
  if (positions.length) drawAllSparklines(positions);
  if (positions.length) renderPositionBenchmarkDeltas(portfolio);
  if (positions.length) renderPositionsReturnPeriod(portfolio);
  updateTrackerTabCounts(portfolio);
  // Composición consolidada (Visual 1): sólo se dibuja el panel activo; los demás
  // se dibujan al alternar (evita lienzos con tamaño 0 por estar ocultos).
  _compositionCtx = { positions, totalInvested, currency, cashBalance };
  renderCompositionPanel(_compositionMode);
  renderAllocationCharts(positions, totalInvested, currency, cashBalance);
}

// ── Panel de composición: ponderación / Top 10 / mapa de calor (Visual 1) ──────
let _compositionMode = "donut";
let _compositionCtx = null;

function renderCompositionPanel(which) {
  _compositionMode = which || _compositionMode;
  const ctx = _compositionCtx;
  if (!ctx) return;
  const { positions, totalInvested, currency, cashBalance } = ctx;
  if (_compositionMode === "donut") {
    drawDonutChart(document.getElementById("portfolioDonutChart"), positions, totalInvested, currency, cashBalance);
    renderDonutLegend(positions, totalInvested, currency, cashBalance);
  } else if (_compositionMode === "bars") {
    drawHoldingsBarChart(document.getElementById("holdingsBarChart"), positions, currency);
  } else if (_compositionMode === "heatmap") {
    renderHoldingsTreemap(positions, currency);
  }
}

function renderSummaryTable(positions, totalInvested, currency, cashBalance) {
  const tbody = document.getElementById("summaryTableBody");
  const emptyMsg = document.getElementById("noPositionsSummaryMsg");
  if (!tbody) return; // La tabla "Cambio diario" se fusionó en Posiciones (Visual 1)
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
      <td data-label="Activo"><span class="pos-ticker-dot" style="background:${color}"></span>${pos.ticker}${currTag}</td>
      <td data-label="Precio">${priceCell}</td>
      <td data-label="Cambio">${changeAbsCell}</td>
      <td data-label="Cambio %">${changePctCell}</td>
      <td data-label="Valor">${posValueCell}</td>
    </tr>`;
  });

  if (cash > 0) {
    rows.push(`<tr>
      <td data-label="Activo"><span class="pos-ticker-dot" style="background:#4ade80"></span><strong>Cash</strong></td>
      <td data-label="Precio">—</td>
      <td data-label="Cambio">—</td>
      <td data-label="Cambio %">—</td>
      <td data-label="Valor">${formatCurrency(cash, currency)}</td>
    </tr>`);
  }

  tbody.innerHTML = rows.join("");
}

function posTickerLogoHtml(ticker, fallbackColor) {
  const sym = (ticker || "").split(".")[0];
  const initials = (ticker || "").slice(0, 2);
  return `<span class="pos-ticker-logo" style="--pos-logo-bg:${fallbackColor}">` +
    `<img src="https://assets.parqet.com/logos/symbol/${encodeURIComponent(sym)}?format=png" alt="" ` +
    `onerror="this.parentElement.classList.add('pos-ticker-logo--fallback');this.remove();this.parentElement.textContent='${initials}';">` +
    `</span>`;
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

  // Búsqueda + ordenamiento (L2.2)
  let rows = positions.slice();
  if (posSearch) rows = rows.filter((p) => p.ticker.toUpperCase().includes(posSearch.toUpperCase()));
  if (posSort.key) {
    const sortVal = (pos, key) => {
      const t = calcPositionTotals(pos);
      const posCur = getPosCurrency(pos, currency);
      const price = getCachedPrice(pos.ticker);
      const cost = convertAmount(t.total, posCur, currency) ?? t.total;
      const value = price !== null ? (convertAmount(price * pos.quantity, posCur, currency) ?? price * pos.quantity) : -Infinity;
      const prevClose = getCachedPrev(pos.ticker);
      const dayPct = (price !== null && prevClose !== null && prevClose > 0) ? (price - prevClose) / prevClose : -Infinity;
      switch (key) {
        case "ticker": return pos.ticker || "";
        case "date": return pos.purchaseDate || "";
        case "avg": return effectiveAvgPrice(pos);
        case "price": return price ?? -Infinity;
        case "day": return dayPct;
        case "qty": return pos.quantity || 0;
        case "cost": return cost;
        case "value": return value;
        case "return": return value !== -Infinity && cost > 0 ? (value - cost) / cost : -Infinity;
        default: return 0;
      }
    };
    rows.sort((a, b) => {
      const va = sortVal(a, posSort.key), vb = sortVal(b, posSort.key);
      let cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
      return posSort.dir === "asc" ? cmp : -cmp;
    });
  }
  _markSortIndicators(".tracker-table--positions [data-sort]", "sort", posSort);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:24px;color:var(--muted)">Sin posiciones que coincidan con "${posSearch}".</td></tr>`;
    tableShell.classList.remove("is-loading-prices");
    return;
  }

  tbody.innerHTML = rows.map((pos, i) => {
    const t = calcPositionTotals(pos);
    const posCur = getPosCurrency(pos, currency);
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const currentPrice = getCachedPrice(pos.ticker);
    const prevClose = getCachedPrev(pos.ticker);
    const fr = currentPrice !== null ? _priceFreshnessLabel(pos.ticker) : null;
    let dayCell = '<span class="muted-val">—</span>';
    if (currentPrice !== null && prevClose !== null && prevClose > 0) {
      const dPct = (currentPrice - prevClose) / prevClose * 100;
      const dCls = dPct >= 0 ? "return-pos" : "return-neg";
      const dSign = dPct >= 0 ? "+" : "";
      dayCell = `<span class="${dCls}">${dSign}${dPct.toFixed(2)}%</span>`;
    }
    const currentValueRaw = currentPrice !== null ? currentPrice * pos.quantity : null;
    const currentValue = currentValueRaw !== null ? (convertAmount(currentValueRaw, posCur, currency) ?? currentValueRaw) : null;
    const costConverted = convertAmount(t.total, posCur, currency) ?? t.total;
    const dateStr = pos.purchaseDate
      ? new Date(pos.purchaseDate + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
      : "—";
    let retCell = "—";
    if (posReturnPeriod === "total") {
      if (currentValue !== null && costConverted > 0) {
        const retAmt = currentValue - costConverted;
        const retPct = retAmt / costConverted * 100;
        const sign = retAmt >= 0 ? "+" : "";
        retCell = `<span class="${retAmt >= 0 ? "return-pos" : "return-neg"}">${sign}${retPct.toFixed(2)}%<br><small>${sign}${formatCurrency(retAmt, currency)}</small></span>`;
      }
    } else {
      // Se completa async por renderPositionsReturnPeriod (P1.1): requiere el
      // cierre histórico del ticker en la fecha de referencia del periodo.
      retCell = '<span class="muted-val">…</span>';
    }
    const currTag = posCur !== currency ? ` <small class="fx-tag">${posCur}</small>` : "";

    // Lots sub-rows from transaction history
    const txs = (transactions || [])
      .filter(tx => tx.ticker === pos.ticker)
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const lotsHtml = txs.length ? `<tr class="pos-lots-row" data-lots-for="${pos.id}" style="display:none">
      <td colspan="12" class="pos-lots-cell"><div class="pos-lots-inner">
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
      <td data-label="Activo">
        <button class="pos-expand-btn" type="button" data-lots-for="${pos.id}" data-has-lots="${txs.length ? "1" : "0"}" aria-label="Ver detalle" aria-expanded="false"><svg class="pos-expand-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>
        ${posTickerLogoHtml(pos.ticker, color)}<strong>${pos.ticker}</strong>${currTag}${pos.note ? `<span class="pos-note-dot" title="${_aiChatEsc(pos.note).replace(/"/g, "&quot;")}">✎</span>` : ""}
      </td>
      <td class="td-sparkline" data-label="30 días"><canvas class="pos-sparkline" data-ticker="${pos.ticker}" width="80" height="28"></canvas></td>
      <td data-label="Fecha">${dateStr}</td>
      <td data-label="Precio promedio">${formatCurrency(effectiveAvgPrice(pos), posCur)}<small class="fx-tag" title="Incluye comisión de entrada e IVA">c/com</small></td>
      <td data-label="Precio actual">${currentPrice !== null ? `<span class="price-fresh-dot price-fresh-dot--${fr.cls}" title="${fr.title}"></span>` + formatCurrency(currentPrice, posCur) : '<span class="muted-val" title="Precio cargando o no disponible">…</span>'}</td>
      <td data-label="Cambio hoy">${dayCell}</td>
      <td data-label="Cantidad">${parseFloat(pos.quantity.toFixed(5))}</td>
      <td data-label="Costo total">${formatCurrency(costConverted, currency)}</td>
      <td data-label="Valor actual">${currentValue !== null ? formatCurrency(currentValue, currency) : '<span class="muted-val">…</span>'}</td>
      <td data-label="Retorno" data-ticker="${pos.ticker}">${retCell}</td>
      <td class="td-vs-bench" data-label="vs Bench." data-bench-ticker="${pos.ticker}"><span class="muted-val">…</span></td>
      <td class="pos-actions-cell" data-label="Acciones">
        <div class="pos-action-menu">
          <button class="pos-action-trigger" type="button" data-menu-for="${pos.id}" aria-haspopup="true" aria-expanded="false" aria-label="Acciones de ${pos.ticker}" title="Acciones">⋯</button>
          <div class="pos-action-dropdown" data-menu-id="${pos.id}" role="menu" hidden>
            <button type="button" role="menuitem" data-act="buy" data-pos-id="${pos.id}" data-ticker="${pos.ticker}">Comprar más</button>
            <button type="button" role="menuitem" data-act="sell" data-pos-id="${pos.id}">Vender</button>
            <button type="button" role="menuitem" data-act="dividend" data-pos-id="${pos.id}" data-ticker="${pos.ticker}">Registrar dividendo</button>
            <button type="button" role="menuitem" data-act="alert" data-pos-id="${pos.id}" data-ticker="${pos.ticker}">Crear alerta</button>
            <button type="button" role="menuitem" data-act="note" data-pos-id="${pos.id}" data-ticker="${pos.ticker}">${pos.note ? "Editar nota" : "Agregar nota"}</button>
            <button type="button" role="menuitem" data-act="market" data-ticker="${pos.ticker}">Ver en Mercados</button>
            <button type="button" role="menuitem" class="pos-action-danger" data-act="delete" data-pos-id="${pos.id}">Eliminar</button>
          </div>
        </div>
      </td>
    </tr>${lotsHtml}`;
  }).join("");

  // Remove skeleton once prices are in the DOM
  if (positions.some(p => getCachedPrice(p.ticker) !== null)) {
    tableShell.classList.remove("is-loading-prices");
  }

  // Chevron por posición: en móvil revela los campos secundarios de la fila
  // (Fecha, Precio prom., Cantidad, Costo total, vs Bench.); si hay lotes,
  // también despliega el historial de transacciones (bug #2 / P0).
  tbody.querySelectorAll(".pos-expand-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest("tr.pos-row");
      if (!row) return;
      const expanded = row.classList.toggle("is-row-expanded");
      btn.classList.toggle("is-expanded", expanded);
      btn.setAttribute("aria-expanded", String(expanded));
      const lotsRow = tbody.querySelector(`tr.pos-lots-row[data-lots-for="${btn.dataset.lotsFor}"]`);
      if (lotsRow) lotsRow.style.display = expanded ? "" : "none";
    });
  });

  _updateTableOverflowHint(tableShell);

  // ── Menú de acciones por posición (P0.1) ───────────────────────────────────
  tbody.querySelectorAll(".pos-action-trigger").forEach((trigger) => {
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = trigger.dataset.menuFor;
      const dd = tbody.querySelector(`.pos-action-dropdown[data-menu-id="${id}"]`);
      const isOpen = dd && !dd.hidden;
      _closeAllPosMenus();
      if (dd && !isOpen) {
        dd.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
      }
    });
  });

  tbody.querySelectorAll(".pos-action-dropdown [data-act]").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      _closeAllPosMenus();
      handlePositionAction(item.dataset.act, item.dataset.posId, item.dataset.ticker);
    });
  });
}

// ── Retorno de cada posición vs benchmark desde su fecha de compra (#8) ──────
const _benchHistCache = {};
async function renderPositionBenchmarkDeltas(portfolio) {
  const cells = [...document.querySelectorAll("#positionsTableBody .td-vs-bench[data-bench-ticker]")];
  if (!cells.length) return;
  const benchSym = (portfolio.benchmark && portfolio.benchmark !== "none") ? portfolio.benchmark : null;
  if (!benchSym) { cells.forEach((c) => { c.innerHTML = '<span class="muted-val" title="Configura un benchmark en Ajustes del portafolio">—</span>'; }); return; }

  let benchHist = _benchHistCache[benchSym];
  if (!benchHist) {
    try {
      const h = await fetchHistoricalCloses(benchSym, "max", "1wk");
      benchHist = (h || []).map((d) => ({ t: new Date(d.ts).getTime(), c: d.close }))
        .filter((d) => isFinite(d.c) && d.c > 0).sort((a, b) => a.t - b.t);
      _benchHistCache[benchSym] = benchHist;
    } catch { benchHist = []; }
  }
  // La tabla pudo re-renderizarse mientras descargábamos; re-consultar celdas vivas.
  const liveCells = [...document.querySelectorAll("#positionsTableBody .td-vs-bench[data-bench-ticker]")];
  if (!benchHist.length) { liveCells.forEach((c) => { c.innerHTML = '<span class="muted-val">—</span>'; }); return; }
  const benchNow = benchHist[benchHist.length - 1].c;
  const closeOnOrBefore = (tMs) => {
    let lo = 0, hi = benchHist.length - 1, res = null;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (benchHist[mid].t <= tMs) { res = benchHist[mid].c; lo = mid + 1; } else hi = mid - 1; }
    return res;
  };
  const positions = portfolio.positions || [];
  liveCells.forEach((cell) => {
    const ticker = cell.dataset.benchTicker;
    const pos = positions.find((p) => p.ticker === ticker);
    const price = pos ? getCachedPrice(pos.ticker) : null;
    const buyPrice = pos ? (pos.avgPrice || 0) : 0;
    if (!pos || price === null || !pos.purchaseDate || buyPrice <= 0) { cell.innerHTML = '<span class="muted-val">—</span>'; return; }
    const posReturn = price / buyPrice - 1;
    const bAtBuy = closeOnOrBefore(new Date(pos.purchaseDate + "T12:00:00").getTime());
    if (!bAtBuy) { cell.innerHTML = '<span class="muted-val" title="Sin dato del benchmark en esa fecha">—</span>'; return; }
    const benchReturn = benchNow / bAtBuy - 1;
    const deltaPp = (posReturn - benchReturn) * 100;
    const cls = deltaPp >= 0 ? "return-pos" : "return-neg";
    const sign = deltaPp >= 0 ? "+" : "";
    const arrow = deltaPp >= 0 ? "▲" : "▼";
    cell.innerHTML = `<span class="${cls}" title="Tu posición ${(posReturn * 100).toFixed(1)}% vs ${BENCHMARKS[benchSym] || benchSym} ${(benchReturn * 100).toFixed(1)}% desde ${pos.purchaseDate}">${arrow} ${sign}${deltaPp.toFixed(1)} pp</span>`;
  });
}

// ── Retorno por posición con periodo seleccionable: 1D/1S/1M/YTD (P1.1) ─────
const _posReturnHistCache = {}; // ticker -> [{t,c}] cierres diarios (1 año), ordenados

function _posReturnRefDate(period) {
  const now = new Date();
  if (period === "1w") { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
  if (period === "1m") { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d; }
  if (period === "ytd") return new Date(now.getFullYear(), 0, 1);
  return null;
}

function _posReturnRenderCell(cell, pos, currency, refPrice) {
  const price = getCachedPrice(pos.ticker);
  if (price === null || !refPrice || refPrice <= 0) { cell.innerHTML = '<span class="muted-val">—</span>'; return; }
  const posCur = getPosCurrency(pos, currency);
  const retPct = (price - refPrice) / refPrice * 100;
  const retAmtRaw = (price - refPrice) * (pos.quantity || 0);
  const retAmt = convertAmount(retAmtRaw, posCur, currency) ?? retAmtRaw;
  const sign = retAmt >= 0 ? "+" : "";
  cell.innerHTML = `<span class="${retAmt >= 0 ? "return-pos" : "return-neg"}">${sign}${retPct.toFixed(2)}%<br><small>${sign}${formatCurrency(retAmt, currency)}</small></span>`;
}

async function renderPositionsReturnPeriod(portfolio) {
  const period = posReturnPeriod;
  if (period === "total") return; // ya se pinta síncrono en renderPositionsTable
  const currency = portfolio.currency || "USD";
  const cells = [...document.querySelectorAll('#positionsTableBody td[data-label="Retorno"][data-ticker]')];
  if (!cells.length) return;

  if (period === "1d") {
    cells.forEach((cell) => {
      const pos = (portfolio.positions || []).find((p) => p.ticker === cell.dataset.ticker);
      const prev = pos ? getCachedPrev(pos.ticker) : null;
      if (!pos || prev === null) { cell.innerHTML = '<span class="muted-val">—</span>'; return; }
      _posReturnRenderCell(cell, pos, currency, prev);
    });
    return;
  }

  const refDate = _posReturnRefDate(period);
  const uniqueTickers = [...new Set(cells.map((c) => c.dataset.ticker))];
  await Promise.all(uniqueTickers.map(async (ticker) => {
    if (_posReturnHistCache[ticker]) return;
    try {
      const h = await fetchHistoricalCloses(ticker, "1y", "1d");
      _posReturnHistCache[ticker] = (h || []).map((d) => ({ t: new Date(d.ts).getTime(), c: d.close }))
        .filter((d) => isFinite(d.c) && d.c > 0).sort((a, b) => a.t - b.t);
    } catch { _posReturnHistCache[ticker] = []; }
  }));

  // El usuario pudo cambiar de periodo o re-renderizar la tabla mientras
  // descargábamos: re-consultar celdas vivas y abortar si el modo cambió.
  if (posReturnPeriod !== period) return;
  const liveCells = [...document.querySelectorAll('#positionsTableBody td[data-label="Retorno"][data-ticker]')];
  liveCells.forEach((cell) => {
    const pos = (portfolio.positions || []).find((p) => p.ticker === cell.dataset.ticker);
    const hist = pos ? _posReturnHistCache[pos.ticker] : null;
    if (!pos || !hist || !hist.length) { cell.innerHTML = '<span class="muted-val">—</span>'; return; }
    const closeOnOrBefore = (tMs) => {
      let lo = 0, hi = hist.length - 1, res = null;
      while (lo <= hi) { const mid = (lo + hi) >> 1; if (hist[mid].t <= tMs) { res = hist[mid].c; lo = mid + 1; } else hi = mid - 1; }
      return res;
    };
    // No usar una fecha anterior a la compra: si la posición es más nueva que
    // el periodo (p. ej. YTD con compra en junio), usar la fecha de compra.
    const purchaseMs = pos.purchaseDate ? new Date(pos.purchaseDate + "T12:00:00").getTime() : 0;
    const effMs = Math.max(refDate.getTime(), purchaseMs);
    const refPrice = closeOnOrBefore(effMs) ?? hist[0].c;
    _posReturnRenderCell(cell, pos, currency, refPrice);
  });
}

// ── Contadores en las pestañas (rediseño visual #3) ─────────────────────────
function updateTrackerTabCounts(portfolio) {
  const txs = portfolio.transactions || [];
  const counts = {
    transacciones: txs.length,
    dividendos: txs.filter((t) => t.type === "DIVIDENDO").length
  };
  Object.entries(counts).forEach(([tab, n]) => {
    const btn = document.querySelector(`.tracker-tab-btn[data-tab='${tab}']`);
    if (!btn) return;
    let badge = btn.querySelector(".tab-count");
    if (n > 0) {
      if (!badge) { badge = document.createElement("span"); badge.className = "tab-count"; btn.appendChild(badge); }
      badge.textContent = n > 99 ? "99+" : n;
    } else if (badge) {
      badge.remove();
    }
  });
}

function _closeAllPosMenus() {
  document.querySelectorAll(".pos-action-dropdown").forEach((d) => { d.hidden = true; });
  document.querySelectorAll(".pos-action-trigger[aria-expanded='true']").forEach((t) => t.setAttribute("aria-expanded", "false"));
}
// Cierra los menús al hacer clic fuera
if (!document._posMenuDocListener) {
  document._posMenuDocListener = true;
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".pos-action-menu")) _closeAllPosMenus();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") _closeAllPosMenus(); });
}

function handlePositionAction(act, posId, ticker) {
  if (act === "sell") { openWithdrawModal(posId); return; }
  if (act === "buy") { openBuyMoreModal(posId, ticker); return; }
  if (act === "dividend") { openDividendModal(posId, ticker); return; }
  if (act === "alert") { openCreateAlertFor(ticker); return; }
  if (act === "note") { openPositionNoteModal(posId, ticker); return; }
  if (act === "market") { watchlistOpenInMarkets(ticker); return; }
  if (act === "delete") { deletePositionWithUndo(posId); return; }
}

function deletePositionWithUndo(posId) {
  const portfolios = getPortfolios();
  const portfolio = portfolios.find((p) => p.id === activePortfolioId);
  if (!portfolio) return;
  const allPos = portfolio.positions || [];
  const idx = allPos.findIndex((p) => p.id === posId);
  if (idx === -1) return;
  const [removed] = allPos.splice(idx, 1);  // conserva orden para restaurar
  savePortfolios(portfolios);
  renderPortfolioDashboard();
  // Toast con opción de deshacer (L2.1)
  showToast(`Posición ${removed.ticker} eliminada.`, {
    actionLabel: "Deshacer",
    duration: 7000,
    onAction: () => {
      const ps = getPortfolios();
      const p = ps.find((q) => q.id === activePortfolioId);
      if (!p) return;
      if (!p.positions) p.positions = [];
      p.positions.splice(Math.min(idx, p.positions.length), 0, removed);
      savePortfolios(ps);
      renderPortfolioDashboard();
    }
  });
}

// "Comprar más": abre el modal de agregar posición con el ticker precargado.
function openBuyMoreModal(posId, ticker) {
  const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
  const pos = portfolio && (portfolio.positions || []).find((p) => p.id === posId);
  const dateInput = document.getElementById("posPurchaseDateInput");
  if (dateInput) { dateInput.max = new Date().toISOString().slice(0, 10); dateInput.value = new Date().toISOString().slice(0, 10); }
  const tickerInput = document.getElementById("posTickerInput");
  if (tickerInput) tickerInput.value = ticker || (pos && pos.ticker) || "";
  const curSel = document.getElementById("posCurrencyInput");
  if (curSel && pos) curSel.value = getPosCurrency(pos, portfolio.currency || "USD");
  const priceInput = document.getElementById("posAvgPriceInput");
  if (priceInput) {
    const cached = getCachedPrice(ticker);
    priceInput.value = cached !== null ? parseFloat(cached.toFixed(4)) : "";
  }
  openModal("addPositionModal");
}

// "Crear alerta": lleva a Ajustes, precarga el símbolo y enfoca el precio objetivo.
function openCreateAlertFor(ticker) {
  activateSection("settings");
  requestAnimationFrame(() => {
    const symInput = document.getElementById("alertSymbol");
    const alertsCard = document.querySelector(".alerts-card");
    if (symInput) symInput.value = (ticker || "").toUpperCase();
    if (alertsCard) alertsCard.scrollIntoView({ behavior: "smooth", block: "center" });
    const thr = document.getElementById("alertThreshold");
    if (thr) thr.focus();
  });
}

// "Ajustes del portafolio" (P0.5): editar nombre, descripción, benchmark y moneda.
function openEditPortfolioModal() {
  const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
  if (!portfolio) return;
  document.getElementById("editPortfolioName").value = portfolio.name || "";
  document.getElementById("editPortfolioDesc").value = portfolio.description || "";
  document.getElementById("editPortfolioBenchmark").value = portfolio.benchmark || "^GSPC";
  document.getElementById("editPortfolioCurrency").value = portfolio.currency || "USD";
  openModal("editPortfolioModal");
}

// "Registrar dividendo": modal ligero que crea una transacción DIVIDENDO.
function openDividendModal(posId, ticker) {
  const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
  const pos = portfolio && (portfolio.positions || []).find((p) => p.id === posId);
  if (!portfolio || !pos) return;
  const posCur = getPosCurrency(pos, portfolio.currency || "USD");
  document.getElementById("dividendPosId").value = posId;
  const qty = parseFloat(pos.quantity.toFixed(5));
  document.getElementById("dividendTickerDisplay").textContent =
    `${pos.ticker} · ${qty} acciones` + (posCur !== (portfolio.currency || "USD") ? ` (${posCur})` : "");
  document.getElementById("dividendPerShareInput").value = "";
  const dateEl = document.getElementById("dividendDateInput");
  dateEl.value = new Date().toISOString().slice(0, 10);
  dateEl.max = new Date().toISOString().slice(0, 10);
  document.getElementById("dividendTotalNote").textContent = "";
  document.getElementById("dividendError").classList.add("hidden");
  openModal("dividendModal");
}

function openPositionNoteModal(posId, ticker) {
  const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
  const pos = portfolio && (portfolio.positions || []).find((p) => p.id === posId);
  if (!portfolio || !pos) return;
  document.getElementById("positionNotePosId").value = posId;
  document.getElementById("positionNoteTickerDisplay").textContent = ticker || pos.ticker;
  document.getElementById("positionNoteInput").value = pos.note || "";
  openModal("positionNoteModal");
  requestAnimationFrame(() => document.getElementById("positionNoteInput")?.focus());
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

  // Ingreso mensual recibido (últimos 12 meses) para el gráfico de barras (P1.6)
  const receivedByMonth = {};
  divs.forEach((tx) => {
    const k = (tx.date || "").slice(0, 7); // YYYY-MM
    if (!k) return;
    receivedByMonth[k] = (receivedByMonth[k] || 0) + conv(tx.net || 0, tx.currency);
  });
  _divReceivedByMonth = receivedByMonth;
  renderDividendMonthlyChart(receivedByMonth, _divProjectedByMonth || {}, cur);

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

// ── Gráfico de barras: ingreso mensual por dividendos (P1.6) ───────────────────
let _divReceivedByMonth = null;
let _divProjectedByMonth = null;

function _monthKeyOffset(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function renderDividendMonthlyChart(receivedByMonth, projectedByMonth, cur) {
  const canvas = document.getElementById("divMonthlyChart");
  const status = document.getElementById("divMonthlyStatus");
  if (!canvas) return;
  // Ventana: 11 meses atrás → 12 meses adelante (24 barras)
  const months = [];
  for (let off = -11; off <= 12; off++) months.push(_monthKeyOffset(off));
  const buckets = months.map((k) => ({
    key: k,
    received: receivedByMonth[k] || 0,
    projected: projectedByMonth[k] || 0
  }));
  const maxV = Math.max(1, ...buckets.map((b) => Math.max(b.received, b.projected)));
  const hasData = buckets.some((b) => b.received > 0 || b.projected > 0);
  if (status) status.style.display = hasData ? "none" : "";
  if (!hasData) { const c = canvas.getContext("2d"); c && c.clearRect(0, 0, canvas.width, canvas.height); return; }

  const width = canvas.parentElement?.clientWidth || 700;
  const height = width < 560 ? 220 : 260;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr; canvas.height = height * dpr;
  canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const lightMode = document.body.classList.contains("light-mode");
  const pad = { left: 56, right: 14, top: 16, bottom: 40 };
  const cw = width - pad.left - pad.right, ch = height - pad.top - pad.bottom;
  const axisColor = lightMode ? "rgba(23,32,51,0.5)" : "rgba(226,232,255,0.45)";
  const gridColor = lightMode ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.07)";

  ctx.font = "500 10px Inter, sans-serif";
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  for (let s = 0; s <= 4; s++) {
    const v = (maxV / 4) * s, y = pad.top + ch * (1 - s / 4);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y);
    ctx.strokeStyle = gridColor; ctx.lineWidth = 1; ctx.setLineDash([4, 5]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = axisColor; ctx.fillText(formatCurrencyCompact(v, cur), pad.left - 8, y);
  }

  const slot = cw / buckets.length;
  const barW = Math.min(18, slot * 0.6);
  buckets.forEach((b, i) => {
    const cx = pad.left + slot * i + slot / 2;
    const drawBar = (val, color) => {
      if (val <= 0) return;
      const h = ch * (val / maxV);
      ctx.fillStyle = color;
      ctx.fillRect(cx - barW / 2, pad.top + ch - h, barW, h);
    };
    drawBar(b.received, GAIN_COLOR);
    if (b.projected > 0 && b.received <= 0) {
      // Proyección: barra con relieve más tenue (activo punteado)
      const h = ch * (b.projected / maxV);
      ctx.fillStyle = "rgba(111,134,255,0.45)";
      ctx.fillRect(cx - barW / 2, pad.top + ch - h, barW, h);
      ctx.strokeStyle = "#6f86ff"; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
      ctx.strokeRect(cx - barW / 2, pad.top + ch - h, barW, h); ctx.setLineDash([]);
    }
    // Etiqueta de mes cada 3 barras
    if (i % 3 === 0) {
      const [yy, mm] = b.key.split("-");
      const lbl = new Date(+yy, +mm - 1, 1).toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
      ctx.save();
      ctx.fillStyle = axisColor; ctx.font = "500 9px Inter, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(lbl, cx, height - pad.bottom + 8);
      ctx.restore();
    }
  });
  // Leyenda
  ctx.font = "600 10px Inter, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = GAIN_COLOR; ctx.fillRect(pad.left, height - 12, 10, 10);
  ctx.fillStyle = axisColor; ctx.fillText("Recibido", pad.left + 16, height - 7);
  ctx.fillStyle = "rgba(111,134,255,0.6)"; ctx.fillRect(pad.left + 90, height - 12, 10, 10);
  ctx.fillStyle = axisColor; ctx.fillText("Proyectado", pad.left + 106, height - 7);
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

  // Alimenta el gráfico de barras mensual con la proyección (P1.6)
  const projectedByMonth = {};
  events.forEach((e) => {
    const k = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, "0")}`;
    projectedByMonth[k] = (projectedByMonth[k] || 0) + e.amount;
  });
  _divProjectedByMonth = projectedByMonth;
  renderDividendMonthlyChart(_divReceivedByMonth || {}, projectedByMonth, cur);

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
function _corrColor(c, isDiag) {
  if (isDiag) return "rgba(120,146,255,0.09)";
  const t = Math.max(-1, Math.min(1, c));
  const neg = [88, 124, 240];
  const mid = [134, 142, 158];
  const pos = [232, 104, 126];
  const mix = (a, b, f) => a.map((v, i) => Math.round(v + (b[i] - v) * f));
  const rgb = t >= 0 ? mix(mid, pos, t) : mix(mid, neg, -t);
  const alpha = 0.12 + 0.72 * Math.abs(t);
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}
async function renderCorrelationTab(portfolio) {
  corrTabLoaded = true;
  const wrap = document.getElementById("corrMatrixWrap");
  const status = document.getElementById("corrStatus");
  const setMetric = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  ["corrAvgValue", "corrDivScore", "corrMaxPair", "corrMaxVal"].forEach((id) => setMetric(id, "—"));
  setMetric("corrDivLabel", "—");
  const rcWrap = document.getElementById("riskContribWrap");
  const rcStatus = document.getElementById("riskContribStatus");
  if (rcWrap) rcWrap.innerHTML = "";
  if (rcStatus) { rcStatus.style.display = ""; rcStatus.textContent = "Calculando contribución al riesgo…"; }

  const tickers = [...new Set((portfolio.positions || []).filter((p) => (p.quantity || 0) > 0).map((p) => p.ticker))];
  if (tickers.length < 2) {
    wrap.innerHTML = "";
    status.style.display = ""; status.textContent = "Necesitas al menos 2 activos para calcular correlaciones.";
    if (rcStatus) rcStatus.textContent = "Necesitas al menos 2 activos para calcular la contribución al riesgo.";
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
  if (valid.length < 2) { status.textContent = "No se pudieron obtener suficientes datos históricos."; if (rcStatus) rcStatus.textContent = "No se pudieron obtener suficientes datos históricos."; corrTabLoaded = false; return; }

  const sets = valid.map((t) => new Set(Object.keys(maps[t])));
  const common = [...sets[0]].filter((d) => sets.every((s) => s.has(d))).sort();
  if (common.length < 3) { status.textContent = "Fechas en común insuficientes para calcular correlaciones."; if (rcStatus) rcStatus.textContent = "Fechas insuficientes para la contribución al riesgo."; corrTabLoaded = false; return; }

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
      const c = M[i][j], diag = i === j, abs = Math.abs(c);
      const highPos = !diag && c >= 0.55, highNeg = !diag && c <= -0.55;
      const cls = [diag ? "corr-diag" : "", highPos ? "corr-high-pos" : "", highNeg ? "corr-high-neg" : ""].filter(Boolean).join(" ");
      const textColor = (highPos || highNeg) ? "#fff" : "var(--text)";
      const strength = !diag ? (abs >= 0.7 ? " ▲" : abs >= 0.4 ? " ●" : "") : "";
      const label = diag ? "—" : `${c.toFixed(2)}${strength}`;
      const tipText = diag ? `${valid[i]} (auto-correlación)` : `${valid[i]} vs ${valid[j]}: ${c.toFixed(2)} · ${abs>=0.7?"Alta":abs>=0.4?"Moderada":"Baja"} correlación ${c>=0?"positiva":"negativa"}`;
      html += `<td class="${cls}" style="background:${_corrColor(c, diag)};color:${textColor}" title="${tipText}">${label}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  wrap.innerHTML = html;
  status.style.display = "none";

  // Lista compacta de pares (mejor lectura en móvil que la matriz completa) — Mobile 2
  renderCorrelationTopPairs(valid, M);

  try { renderRiskContribution(portfolio, valid, rets, M, { days: common.length - 1, excluded: tickers.filter((t) => !valid.includes(t)) }); }
  catch (e) { if (rcStatus) { rcStatus.style.display = ""; rcStatus.textContent = "No se pudo calcular la contribución al riesgo."; } }
}

// Top pares por correlación absoluta — lista legible en móvil (Mobile 2)
function renderCorrelationTopPairs(valid, M) {
  const el = document.getElementById("corrTopPairs");
  if (!el) return;
  const pairs = [];
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      pairs.push({ a: valid[i], b: valid[j], c: M[i][j] });
    }
  }
  if (!pairs.length) { el.innerHTML = ""; return; }
  pairs.sort((x, y) => Math.abs(y.c) - Math.abs(x.c));
  const top = pairs.slice(0, 6);
  el.innerHTML =
    `<div class="corr-pairs-title">Pares más relacionados</div>` +
    top.map((p) => {
      const strong = Math.abs(p.c) >= 0.7, mod = Math.abs(p.c) >= 0.4;
      const cls = p.c >= 0 ? "return-pos" : "return-neg";
      const lvl = strong ? "Alta" : mod ? "Moderada" : "Baja";
      return `<div class="corr-pair-row">
        <span class="corr-pair-names">${p.a} · ${p.b}</span>
        <span class="corr-pair-val ${cls}">${p.c >= 0 ? "+" : ""}${p.c.toFixed(2)}<small>${lvl}</small></span>
      </div>`;
    }).join("");
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
    `<tr data-wl="${tk}" class="wl-row">` +
    `<td data-label="Ticker"><strong>${tk}</strong></td>` +
    `<td class="td-sparkline" data-label="30 días"><canvas class="pos-sparkline wl-sparkline" data-ticker="${tk}" width="80" height="28"></canvas></td>` +
    `<td class="wl-price" data-label="Precio">…</td>` +
    `<td class="wl-chg" data-label="Cambio diario">…</td>` +
    `<td class="wl-actions" data-label="Acciones">` +
      `<button class="wl-buy" data-wl-buy="${tk}" title="Comprar / agregar a un portafolio" type="button">Comprar</button>` +
      `<button class="wl-alert" data-wl-alert="${tk}" title="Crear alerta de precio" type="button" aria-label="Crear alerta">🔔</button>` +
      `<button class="wl-remove" data-wl-remove="${tk}" title="Quitar de la lista" type="button" aria-label="Quitar">✕</button>` +
    `</td></tr>`
  ).join("");

  // Sparklines de 30 días (reutiliza el mismo motor que la tabla de posiciones)
  drawAllSparklines(list.map((tk) => ({ ticker: tk })));

  // Acciones de fila: comprar / alerta / quitar
  tbody.querySelectorAll("[data-wl-buy]").forEach((btn) =>
    btn.addEventListener("click", () => openBuyMoreModal(null, btn.dataset.wlBuy)));
  tbody.querySelectorAll("[data-wl-alert]").forEach((btn) =>
    btn.addEventListener("click", () => openCreateAlertFor(btn.dataset.wlAlert)));

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
  ["rebalOptSummary", "rebalAiPanel", "rebalDisclaimer"].forEach((id) => {
    const e = document.getElementById(id);
    if (e) e.style.display = "none";
  });
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

// Reescala los objetivos para que sumen 100% conservando sus proporciones relativas.
function normalizeRebalTargets() {
  const { rows, totalValue } = getRebalRows();
  if (!rows.length || totalValue <= 0) return;
  const sum = rows.reduce((s, r) => s + (rebalTargets[r.ticker] || 0), 0);
  if (sum <= 0) {
    const eq = 100 / rows.length;
    rows.forEach((r) => { rebalTargets[r.ticker] = eq; });
  } else {
    rows.forEach((r) => { rebalTargets[r.ticker] = ((rebalTargets[r.ticker] || 0) / sum) * 100; });
  }
  renderRebalanceTab();
}

// Exporta el plan de rebalanceo (objetivos vs actual + acciones) como CSV.
function exportRebalancePlan() {
  const { rows, cur, totalValue } = getRebalRows();
  if (!rows.length || totalValue <= 0) {
    showRebalOptMsg("Agrega posiciones con precio antes de exportar el plan.", "warn");
    return;
  }
  const extra = parseFloat(document.getElementById("rebalExtraCash")?.value) || 0;
  const targetTotal = totalValue + extra;
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [];
  lines.push(["Plan de rebalanceo · BlackPortfolio"]);
  lines.push(["Generado", new Date().toLocaleString()]);
  lines.push(["Moneda", cur]);
  lines.push(["Valor actual", totalValue.toFixed(2), "Aporte adicional", extra.toFixed(2), "Valor objetivo", targetTotal.toFixed(2)]);
  lines.push([]);
  lines.push(["Ticker", "Valor actual", "Peso actual %", "Objetivo %", "Valor objetivo", "Accion", "Monto", "Unidades aprox."]);
  rows.forEach((r) => {
    const curW = (r.value / totalValue) * 100;
    const target = rebalTargets[r.ticker] || 0;
    const targetVal = targetTotal * (target / 100);
    const delta = targetVal - r.value;
    let accion = "Mantener", monto = 0, unidades = "";
    if (!r.hasPrice) { accion = "Sin precio"; }
    else if (Math.abs(delta) >= targetTotal * 0.005) {
      accion = delta > 0 ? "Comprar" : "Vender";
      monto = Math.abs(delta);
      unidades = (Math.abs(delta) / r.priceConv).toFixed(4);
    }
    lines.push([r.ticker, r.value.toFixed(2), curW.toFixed(1), target.toFixed(1), targetVal.toFixed(2), accion, monto ? monto.toFixed(2) : "", unidades]);
  });
  const csv = lines.map((row) => row.map(esc).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rebalanceo_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Rebalanceo asistido: optimización cuantitativa + explicación con IA ────────
const REBAL_OPT_PERIOD = "2y";
function rebalPeriodLabel(p) {
  return ({
    "1y": "el último año", "2y": "los últimos 2 años",
    "5y": "los últimos 5 años", "10y": "los últimos 10 años",
  })[p] || "el periodo analizado";
}
function showRebalOptMsg(msg, type) {
  const el = document.getElementById("rebalOptSummary");
  if (!el) return;
  el.className = "rebal-opt-summary" + (type ? " rebal-opt-" + type : "");
  el.innerHTML = `<div class="rebal-opt-msg">${msg}</div>`;
  el.style.display = "";
}

async function runRebalanceOptimization() {
  const btn = document.getElementById("rebalOptimizeBtn");
  const { rows, cur, totalValue } = getRebalRows();
  const priced = rows.filter((r) => r.hasPrice);
  if (priced.length < 2 || totalValue <= 0) {
    showRebalOptMsg("Necesitas al menos 2 posiciones con precio actualizado para optimizar.", "warn");
    return;
  }
  if (typeof window.computeOptimalWeights !== "function") {
    showRebalOptMsg("El motor de optimización no está disponible. Recarga la página.", "warn");
    return;
  }
  const mode = document.getElementById("rebalOptMode")?.value || "maxsharpe";
  const currentWeights = {};
  priced.forEach((r) => { currentWeights[r.ticker] = r.value / totalValue; });

  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="mkw-spinner"></span> Optimizando…`;
  try {
    const res = await window.computeOptimalWeights({
      tickers: priced.map((r) => r.ticker),
      mode, period: REBAL_OPT_PERIOD, cap: 0.35, currentWeights,
    });
    if (!res.ok) { showRebalOptMsg(res.error || "No se pudo optimizar.", "warn"); return; }

    // Reserva el peso actual de los activos sin datos y reparte el presupuesto
    // restante según los pesos óptimos (la suma objetivo se mantiene ≈100%).
    const skippedSet = new Set(res.skipped || []);
    let skippedW = 0;
    priced.forEach((r) => { if (skippedSet.has(r.ticker)) skippedW += r.value / totalValue; });
    const budget = Math.max(0, 1 - skippedW);
    priced.forEach((r) => {
      rebalTargets[r.ticker] = skippedSet.has(r.ticker)
        ? (r.value / totalValue) * 100
        : (res.weights[r.ticker] || 0) * budget * 100;
    });

    renderRebalanceTab();
    renderRebalSummary(res, cur);
    renderRebalDisclaimer(res);
    fetchRebalanceExplanation(res, priced, totalValue);
  } catch (e) {
    showRebalOptMsg("Error al optimizar: " + (e.message || e), "warn");
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

function renderRebalSummary(res, cur) {
  const el = document.getElementById("rebalOptSummary");
  if (!el) return;
  const pct = (x) => (x * 100).toFixed(1) + "%";
  const o = res.optimal, c = res.current;
  el.className = "rebal-opt-summary";
  el.innerHTML = `
    <div class="rebal-opt-summary-title">Proyección con datos de ${rebalPeriodLabel(res.period)} · ${res.tickers.length} activos${res.skipped.length ? ` · ${res.skipped.length} sin datos (peso sin cambios)` : ""}</div>
    <table class="rebal-opt-table">
      <thead><tr><th>Métrica</th><th>Actual</th><th>Sugerido</th></tr></thead>
      <tbody>
        <tr><td>Retorno esperado anual</td><td>${c ? pct(c.ret) : "—"}</td><td>${pct(o.ret)}</td></tr>
        <tr><td>Volatilidad anual</td><td>${c ? pct(c.vol) : "—"}</td><td>${pct(o.vol)}</td></tr>
        <tr><td>Sharpe (rentabilidad/riesgo)</td><td>${c ? c.sharpe.toFixed(2) : "—"}</td><td>${o.sharpe.toFixed(2)}</td></tr>
      </tbody>
    </table>`;
  el.style.display = "";
}

function renderRebalDisclaimer(res) {
  const el = document.getElementById("rebalDisclaimer");
  if (!el) return;
  el.textContent =
    `Las opciones presentadas se basan en datos históricos de ${rebalPeriodLabel(res.period)} y en las condiciones económicas vigentes ` +
    `(tasa libre de riesgo, volatilidad y correlaciones observadas en ese periodo). Los rendimientos pasados no garantizan rendimientos futuros. ` +
    `Esta es una herramienta de simulación educativa: no constituye asesoría de inversión ni una recomendación personalizada de compra o venta.`;
  el.style.display = "";
}

async function fetchRebalanceExplanation(res, priced, totalValue) {
  const panel = document.getElementById("rebalAiPanel");
  const body = document.getElementById("rebalAiBody");
  if (!panel || !body) return;
  const user = window.BlackPortfolioAuth?.firebaseAuth?.currentUser;
  if (!user) return; // sin sesión: la parte cuantitativa ya se mostró
  panel.style.display = "";
  body.innerHTML = `<span class="mkw-spinner"></span> Generando explicación…`;

  const moves = res.tickers.map((t) => {
    const r = priced.find((x) => x.ticker === t);
    const curW = r ? r.value / totalValue : 0;
    return {
      ticker: t,
      actual_pct: +(curW * 100).toFixed(1),
      sugerido_pct: +((res.weights[t] || 0) * 100).toFixed(1),
    };
  });
  const metrics = {
    objetivo: res.mode === "minvar" ? "mínima volatilidad" : "máxima relación rentabilidad/riesgo (Sharpe)",
    periodo: rebalPeriodLabel(res.period),
    actual: res.current ? {
      retorno_anual_pct: +(res.current.ret * 100).toFixed(1),
      volatilidad_pct: +(res.current.vol * 100).toFixed(1),
      sharpe: +res.current.sharpe.toFixed(2),
    } : null,
    sugerido: {
      retorno_anual_pct: +(res.optimal.ret * 100).toFixed(1),
      volatilidad_pct: +(res.optimal.vol * 100).toFixed(1),
      sharpe: +res.optimal.sharpe.toFixed(2),
    },
    movimientos: moves,
  };

  try {
    const token = await user.getIdToken();
    const twofaToken = localStorage.getItem("bp-2fa-token");
    const r = await fetch(`${API_BASE_URL}/ai/rebalance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(twofaToken ? { "X-2FA-Token": twofaToken } : {}),
      },
      body: JSON.stringify({ metrics, lang: "es" }),
    });
    if (r.status === 403) {
      body.innerHTML = `<p class="rebal-ai-locked">Para la explicación con IA necesitas verificar tu correo. La optimización cuantitativa de arriba funciona igualmente.</p>`;
      return;
    }
    if (!r.ok) {
      body.innerHTML = `<p class="rebal-ai-locked">No se pudo generar la explicación (HTTP ${r.status}).</p>`;
      return;
    }
    const data = await r.json();
    body.innerHTML = _mdToBulletsHtml((data.explanation || "").trim());
  } catch {
    body.innerHTML = `<p class="rebal-ai-locked">No se pudo generar la explicación con IA en este momento.</p>`;
  }
}

const portfolioDonutStates = new WeakMap();

function paintPortfolioDonut(canvas) {
  const state = portfolioDonutStates.get(canvas);
  if (!state) return;
  const { size, dpr, cx, cy, outerR, innerR, entries, grandTotal, positionsCount, currency, hoverIndex } = state;
  const ctx = canvas.getContext("2d");
  const lightMode = document.body.classList.contains("light-mode");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  if (grandTotal <= 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    ctx.fillStyle = lightMode ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.fillStyle = lightMode ? "rgba(15,23,42,0.42)" : "rgba(255,255,255,0.32)";
    ctx.font = "600 13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Sin datos", cx, cy);
    return;
  }

  entries.forEach((entry, index) => {
    if (entry.endAngle <= entry.startAngle) return;
    const isActive = hoverIndex === index;
    const radius = outerR + (isActive ? 5 : 0);
    ctx.save();
    ctx.globalAlpha = hoverIndex === null || isActive ? 1 : 0.34;
    if (isActive) {
      ctx.shadowColor = entry.color;
      ctx.shadowBlur = 14;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, radius, entry.startAngle, entry.endAngle);
    ctx.arc(cx, cy, innerR, entry.endAngle, entry.startAngle, true);
    ctx.closePath();
    ctx.fillStyle = entry.color;
    ctx.fill();
    ctx.restore();
  });

  const activeEntry = hoverIndex === null ? null : entries[hoverIndex];
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = lightMode ? "#172033" : "#e8edff";
  ctx.font = "700 16px Inter, sans-serif";
  ctx.fillText(activeEntry ? activeEntry.label : `${positionsCount} ${positionsCount === 1 ? "activo" : "activos"}`, cx, cy - 10);
  ctx.fillStyle = lightMode ? "rgba(23,32,51,0.58)" : "rgba(226,232,255,0.5)";
  ctx.font = "500 11px Inter, sans-serif";
  ctx.fillText(activeEntry ? `${(activeEntry.value / grandTotal * 100).toFixed(1)}% del total` : formatCurrency(grandTotal, currency), cx, cy + 12);
}

function setPortfolioDonutHover(canvas, index, point) {
  const state = portfolioDonutStates.get(canvas);
  if (!state) return;
  if (state.hoverIndex !== index) {
    state.hoverIndex = index;
    paintPortfolioDonut(canvas);
    document.querySelectorAll("#donutLegend .donut-legend-item").forEach((item) => {
      item.classList.toggle("is-highlighted", index !== null && Number(item.dataset.index) === index);
    });
  }
  const tooltip = document.getElementById("portfolioDonutTooltip");
  if (!tooltip) return;
  if (index === null || !state.entries[index]) {
    tooltip.classList.add("hidden");
    return;
  }
  const entry = state.entries[index];
  tooltip.innerHTML = "<strong></strong><span></span><small></small>";
  tooltip.querySelector("strong").textContent = entry.label;
  tooltip.querySelector("span").textContent = `${(entry.value / state.grandTotal * 100).toFixed(1)}%`;
  tooltip.querySelector("small").textContent = formatCurrency(entry.value, state.currency);
  const displayScale = canvas.getBoundingClientRect().width / state.size;
  const displaySize = state.size * displayScale;
  const tooltipX = (point?.x ?? state.cx) * displayScale;
  const tooltipY = (point?.y ?? state.cy) * displayScale;
  tooltip.style.left = `${Math.min(Math.max(tooltipX, 72), displaySize - 72)}px`;
  tooltip.style.top = `${Math.max(tooltipY, 62)}px`;
  tooltip.classList.remove("hidden");
}

function ensurePortfolioDonutInteractions(canvas) {
  if (canvas.dataset.interactive === "true") return;
  canvas.dataset.interactive = "true";
  const updateFromPointer = (event) => {
    const state = portfolioDonutStates.get(canvas);
    if (!state) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (state.size / rect.width);
    const y = (event.clientY - rect.top) * (state.size / rect.height);
    const distance = Math.hypot(x - state.cx, y - state.cy);
    let angle = Math.atan2(y - state.cy, x - state.cx);
    while (angle < -Math.PI / 2) angle += Math.PI * 2;
    const index = distance >= state.innerR && distance <= state.outerR + 7
      ? state.entries.findIndex((entry) => angle >= entry.startAngle && angle <= entry.endAngle)
      : -1;
    canvas.style.cursor = index >= 0 ? "pointer" : "default";
    setPortfolioDonutHover(canvas, index >= 0 ? index : null, { x, y });
  };
  canvas.addEventListener("pointerdown", updateFromPointer);
  canvas.addEventListener("pointermove", updateFromPointer);
  canvas.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "touch") return;
    canvas.style.cursor = "default";
    setPortfolioDonutHover(canvas, null);
  });
  document.addEventListener("pointerdown", (event) => {
    if (event.target !== canvas && !event.target.closest?.("#donutLegend .donut-legend-item")) {
      setPortfolioDonutHover(canvas, null);
    }
  });
  document.addEventListener("pointermove", (event) => {
    if (event.target !== canvas && !event.target.closest?.("#donutLegend .donut-legend-item")) {
      canvas.style.cursor = "default";
      setPortfolioDonutHover(canvas, null);
    }
  });
}

function drawDonutChart(canvas, positions, totalInvested, currency, cashBalance) {
  if (!canvas) return;
  canvas.style.cursor = "default";
  document.getElementById("portfolioDonutTooltip")?.classList.add("hidden");
  document.querySelectorAll("#donutLegend .donut-legend-item").forEach((item) => item.classList.remove("is-highlighted"));
  const dpr = window.devicePixelRatio || 1;
  const size = 220;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";
  const cx = size / 2;
  const cy = size / 2;
  const outerR = cx - 12;
  const innerR = outerR * 0.61;
  const cash = cashBalance || 0;
  const posVals = positions.map((position) => _donutPosValue(position, currency));
  const entries = positions.map((position, index) => ({
    label: position.ticker,
    value: posVals[index],
    color: CHART_COLORS[index % CHART_COLORS.length]
  }));
  if (cash > 0) entries.push({ label: "Efectivo", value: cash, color: "#4ade80" });
  const grandTotal = entries.reduce((sum, entry) => sum + entry.value, 0);
  const visibleEntries = entries.filter((entry) => entry.value > 0).length;
  const gap = visibleEntries > 1 ? 0.025 : 0;
  let startAngle = -Math.PI / 2;
  entries.forEach((entry) => {
    const sweep = grandTotal > 0 ? Math.max(0, (entry.value / grandTotal) * Math.PI * 2 - gap) : 0;
    entry.startAngle = startAngle;
    entry.endAngle = startAngle + sweep;
    if (sweep > 0) startAngle = entry.endAngle + gap;
  });
  portfolioDonutStates.set(canvas, {
    size, dpr, cx, cy, outerR, innerR, entries, grandTotal,
    positionsCount: positions.length, currency, hoverIndex: null
  });
  ensurePortfolioDonutInteractions(canvas);
  paintPortfolioDonut(canvas);
}

function renderDonutLegend(positions, totalInvested, currency, cashBalance) {
  const legend = document.getElementById("donutLegend");
  const cash = cashBalance || 0;
  if (!positions.length && cash <= 0) { legend.innerHTML = ""; return; }
  const posVals = positions.map((p) => _donutPosValue(p, currency));
  const grandTotal = posVals.reduce((s, v) => s + v, 0) + cash;
  let rows = positions.map((pos, i) => {
    const posTotal = posVals[i];
    const weight = grandTotal > 0 ? (posTotal / grandTotal * 100).toFixed(1) : "0.0";
    return `<button class="donut-legend-item" type="button" data-index="${i}">
      <span class="donut-legend-dot" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></span>
      <span class="donut-legend-ticker">${pos.ticker}</span>
      <span class="donut-legend-value">${formatCurrency(posTotal, currency)}</span>
      <span class="donut-legend-weight">${weight}%</span>
    </button>`;
  });
  if (cash > 0) {
    const cashWeight = grandTotal > 0 ? (cash / grandTotal * 100).toFixed(1) : "0.0";
    rows.push(`<button class="donut-legend-item" type="button" data-index="${positions.length}">
      <span class="donut-legend-dot" style="background:#4ade80"></span>
      <span class="donut-legend-ticker">Efectivo</span>
      <span class="donut-legend-value">${formatCurrency(cash, currency)}</span>
      <span class="donut-legend-weight">${cashWeight}%</span>
    </button>`);
  }
  legend.innerHTML = rows.join("");
  const canvas = document.getElementById("portfolioDonutChart");
  legend.querySelectorAll(".donut-legend-item").forEach((item) => {
    const index = Number(item.dataset.index);
    item.addEventListener("mouseenter", () => setPortfolioDonutHover(canvas, index));
    item.addEventListener("mouseleave", () => setPortfolioDonutHover(canvas, null));
    item.addEventListener("focus", () => setPortfolioDonutHover(canvas, index));
    item.addEventListener("blur", () => setPortfolioDonutHover(canvas, null));
  });
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
  // Sin sufijo de bolsa extranjera reconocido: se asume listado en EE.UU. (caso más común).
  return "EE.UU.";
}

// Conjuntos curados para clasificar la clase de activo (heurística, como SECTOR_MAP/GEO_MAP).
const BOND_ETFS = new Set([
  "BND","AGG","TLT","IEF","SHY","LQD","HYG","TIP","BNDX","VGIT","VCIT","MUB","BIL",
  "GOVT","SCHZ","SPTL","VGLT","VGSH","EMB","JNK","VTEB","MBB","IGSB","SHV","VCSH",
  "CETETRC.MX","CETETRCISHRS.MX"
]);
const EQUITY_ETFS = new Set([
  "SPY","IVV","VOO","VTI","SCHB","ITOT","QQQ","ARKK","VGT","XLK","SOXX","SMH",
  "XLF","XLV","XLE","XLY","XLP","XLI","XLB","XLU","XLC","VNQ","IYR","USO","GLD","IAU","SLV","GDX",
  "VEA","VWO","EFA","EEM","ACWI","VT","VEU","VXUS","IEFA","FXI","EWG","EWU","VGK","AAXJ","EWJ",
  "VHT","VDE","VCR","VDC","VFH","VPU","VIS","VAW","VOX","KRE","NAFTRAC.MX","NAFTRAC"
]);

// Devuelve la clase de activo de un ticker: Cripto, ETF, Bonos o Acciones.
function getTickerAssetClass(ticker) {
  const t = (ticker || "").toUpperCase();
  const base = t.split(".")[0];
  if (t.endsWith("-USD") || t.endsWith("-USDT") || t.endsWith("-USDC")) return "Cripto";
  if (BOND_ETFS.has(t) || BOND_ETFS.has(base)) return "Bonos";
  if (EQUITY_ETFS.has(t) || EQUITY_ETFS.has(base)) return "ETF";
  return "Acciones";
}

const ASSET_CLASS_COLORS = {
  "Acciones": "#6f86ff",
  "ETF": "#39d0ff",
  "Cripto": "#f5b84c",
  "Bonos": "#32d6a2",
  "Cash": "#4ade80",
};

const ALLOC_COLORS = [
  "#6f86ff","#39d0ff","#32d6a2","#f5b84c","#ff6b81",
  "#9f7aea","#f687b3","#48bb78","#ed8936","#4299e1","#667eea","#fc8181"
];

// Región -> códigos ISO 3166-1 numéricos de los países a iluminar en el mapa.
const GEO_REGION_IDS = {
  "EE.UU.": ["840"],
  "Canadá": ["124"],
  "México": ["484"],
  "R. Unido": ["826"],
  "Alemania": ["276"],
  "Francia": ["250"],
  "Italia": ["380"],
  "Europa": ["826", "276", "250", "380", "724", "528", "756", "752", "578", "208", "246", "056", "040", "616", "620", "372", "300"],
  "China": ["156"],
  "Hong Kong": ["156"],
  "Japón": ["392"],
  "Asia-Pacífico": ["156", "392", "410", "158", "360", "458", "764", "704", "608", "554", "036"],
  "Australia": ["036", "554"],
  "Mercados em.": ["076", "356", "710", "643", "484", "792", "156", "608", "360"],
};

function buildAllocationData(positions, totalInvested, currency, labelFn, cashBalance, includeCash = true) {
  const buckets = {};
  positions.forEach((pos) => {
    const t = calcPositionTotals(pos);
    const posCur = getPosCurrency(pos, currency);
    const val = convertAmount(t.total, posCur, currency) ?? t.total;
    const label = labelFn(pos.ticker);
    buckets[label] = (buckets[label] || 0) + val;
  });
  if (includeCash && cashBalance > 0) {
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

function renderGeoWorldMap(container, data, total) {
  if (!container) return;
  const countries = window.WORLD_COUNTRIES || {};
  const ids = Object.keys(countries);
  if (!data.length || total <= 0 || !ids.length) {
    container.innerHTML = '<div class="geo-map-empty">Sin datos</div>';
    return;
  }
  // Color por país según la región con exposición (gana el mayor peso si hay solape).
  const highlight = {};
  data.forEach((d) => {
    const regionIds = GEO_REGION_IDS[d.label];
    if (!regionIds) return;
    const pct = (d.value / total) * 100;
    regionIds.forEach((id) => {
      if (countries[id] && (!highlight[id] || pct > highlight[id].pct)) {
        highlight[id] = { color: d.color, pct, label: d.label };
      }
    });
  });
  const base = ids.map((id) => `<path d="${countries[id]}"/>`).join("");
  const lit = Object.entries(highlight)
    .map(([id, h]) => `<path d="${countries[id]}" fill="${h.color}" fill-opacity="0.9" stroke="rgba(255,255,255,0.8)" stroke-width="0.7"><title>${h.label}: ${h.pct.toFixed(1)}%</title></path>`)
    .join("");
  // viewBox recortado (sin Antártida ni polo norte vacío) para encuadrar mejor el mapa.
  container.innerHTML = `
    <svg viewBox="0 22 1000 392" class="geo-world-map-svg" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <g class="geo-base" fill="rgba(255,255,255,0.05)" stroke="rgba(140,160,220,0.16)" stroke-width="0.5" stroke-linejoin="round">${base}</g>
      <g class="geo-lit" stroke-linejoin="round">${lit}</g>
    </svg>`;
}

function renderAllocationCharts(positions, totalInvested, currency, cashBalance) {
  const sectorCanvas = document.getElementById("sectorDonutChart");
  const geoMapEl = document.getElementById("geoWorldMap");
  if (!sectorCanvas || !geoMapEl) return;
  const cash = cashBalance || 0;
  const grandTotal = totalInvested + cash;
  const sectorData = buildAllocationData(positions, totalInvested, currency, getTickerSector, cash);
  const geoData = buildAllocationData(positions, totalInvested, currency, getTickerGeo, cash, false);
  drawAllocationDonut(sectorCanvas, sectorData, grandTotal, "sectores");
  renderAllocationLegend(document.getElementById("sectorDonutLegend"), sectorData, grandTotal);
  renderGeoWorldMap(geoMapEl, geoData, totalInvested);
  renderAllocationLegend(document.getElementById("geoDonutLegend"), geoData, totalInvested);

  // ── Clase de activo (#3): colores estables por clase ──
  const assetCanvas = document.getElementById("assetClassDonutChart");
  if (assetCanvas) {
    const assetData = buildAllocationData(positions, totalInvested, currency, getTickerAssetClass, cash)
      .map((d) => ({ ...d, color: ASSET_CLASS_COLORS[d.label] || d.color }));
    drawAllocationDonut(assetCanvas, assetData, grandTotal, "clases");
    renderAllocationLegend(document.getElementById("assetClassDonutLegend"), assetData, grandTotal);
  }
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

// ── #1 Contribución al retorno (attribution) ───────────────────────────────────
function renderAttributionChart(portfolio) {
  const wrap = document.getElementById("attributionChartWrap");
  const status = document.getElementById("attributionStatus");
  if (!wrap) return;
  const currency = portfolio.currency || "USD";
  const positions = (portfolio.positions || []).filter((p) => (p.quantity || 0) > 0);

  const byTicker = {};
  let totalCostPriced = 0;
  positions.forEach((pos) => {
    const price = getCachedPrice(pos.ticker);
    if (price === null) return;
    const posCur = getPosCurrency(pos, currency);
    const cost = convertAmount(calcPositionTotals(pos).total, posCur, currency) ?? calcPositionTotals(pos).total;
    const value = convertAmount(price * pos.quantity, posCur, currency) ?? (price * pos.quantity);
    totalCostPriced += cost;
    if (!byTicker[pos.ticker]) byTicker[pos.ticker] = { ticker: pos.ticker, pnl: 0 };
    byTicker[pos.ticker].pnl += (value - cost);
  });

  const rows = Object.values(byTicker);
  if (!rows.length || totalCostPriced <= 0) {
    wrap.innerHTML = "";
    if (status) { status.style.display = ""; status.textContent = "Actualiza precios para ver la contribución de cada activo."; }
    return;
  }
  rows.forEach((r) => { r.pp = r.pnl / totalCostPriced * 100; });
  rows.sort((a, b) => b.pp - a.pp);
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.pp)), 0.01);

  wrap.innerHTML = rows.map((r) => {
    const pos = r.pp >= 0;
    const w = Math.max(2, Math.abs(r.pp) / maxAbs * 50);
    return `<div class="attrib-row">
      <span class="attrib-ticker" title="${r.ticker}">${r.ticker}</span>
      <span class="attrib-track"><span class="attrib-bar ${pos ? "pos" : "neg"}" style="width:${w.toFixed(1)}%"></span></span>
      <span class="attrib-val ${pos ? "pos" : "neg"}">${pos ? "+" : ""}${r.pp.toFixed(2)} pp</span>
    </div>`;
  }).join("");

  if (status) {
    const totalPp = rows.reduce((s, r) => s + r.pp, 0);
    status.style.display = "";
    status.textContent = `Contribución total no realizada: ${totalPp >= 0 ? "+" : ""}${totalPp.toFixed(2)} pp · sobre el costo invertido de posiciones con precio`;
  }
}

// ── #4 Mapa de calor (treemap squarificado) ────────────────────────────────────
function _treemapHeatColor(chg) {
  if (chg === null || isNaN(chg)) return "rgba(120,128,150,0.55)";
  const c = Math.max(-3, Math.min(3, chg)) / 3;
  const a = (0.32 + Math.abs(c) * 0.5).toFixed(2);
  return c >= 0 ? `rgba(0,168,112,${a})` : `rgba(217,64,64,${a})`;
}

function _squarify(items, x, y, w, h) {
  const result = [];
  const data = items.slice();
  const worst = (row, len) => {
    const areaSum = row.reduce((s, r) => s + r.area, 0);
    const maxA = Math.max(...row.map((r) => r.area));
    const minA = Math.min(...row.map((r) => r.area));
    const len2 = len * len, areaSum2 = areaSum * areaSum;
    if (areaSum2 === 0 || minA === 0) return Infinity;
    return Math.max(len2 * maxA / areaSum2, areaSum2 / (len2 * minA));
  };
  let rx = x, ry = y, rw = w, rh = h, i = 0;
  while (i < data.length) {
    const vertical = rw >= rh;
    const len = vertical ? rh : rw;
    if (len <= 0) break;
    let row = [data[i]]; i++;
    while (i < data.length && worst(row, len) >= worst(row.concat(data[i]), len)) {
      row = row.concat(data[i]); i++;
    }
    const rowArea = row.reduce((s, r) => s + r.area, 0);
    const thick = rowArea / len;
    let off = vertical ? ry : rx;
    row.forEach((r) => {
      const cell = thick > 0 ? r.area / thick : 0;
      if (vertical) result.push({ ...r, x: rx, y: off, w: thick, h: cell });
      else result.push({ ...r, x: off, y: ry, w: cell, h: thick });
      off += cell;
    });
    if (vertical) { rx += thick; rw -= thick; } else { ry += thick; rh -= thick; }
  }
  return result;
}

function renderHoldingsTreemap(positions, currency) {
  const el = document.getElementById("holdingsTreemap");
  const empty = document.getElementById("heatmapEmptyMsg");
  if (!el) return;

  const byTicker = {};
  (positions || []).forEach((pos) => {
    const price = getCachedPrice(pos.ticker);
    if (price === null || !(pos.quantity > 0)) return;
    const posCur = getPosCurrency(pos, currency);
    const value = convertAmount(price * pos.quantity, posCur, currency) ?? (price * pos.quantity);
    const prev = getCachedPrev(pos.ticker);
    const chg = (prev !== null && prev > 0) ? (price - prev) / prev * 100 : null;
    if (!byTicker[pos.ticker]) byTicker[pos.ticker] = { ticker: pos.ticker, value: 0, chgW: 0, chgV: 0 };
    const t = byTicker[pos.ticker];
    t.value += value;
    if (chg !== null) { t.chgW += chg * value; t.chgV += value; }
  });

  const items = Object.values(byTicker)
    .filter((t) => t.value > 0)
    .map((t) => ({ ticker: t.ticker, value: t.value, chg: t.chgV > 0 ? t.chgW / t.chgV : null }))
    .sort((a, b) => b.value - a.value);

  if (!items.length) {
    el.innerHTML = ""; el.style.display = "none";
    if (empty) empty.classList.remove("hidden");
    return;
  }
  el.style.display = ""; if (empty) empty.classList.add("hidden");

  const W = el.clientWidth || 600, H = el.clientHeight || 280;
  const total = items.reduce((s, t) => s + t.value, 0);
  const scaled = items.map((t) => ({ ...t, area: t.value / total * W * H }));
  const tiles = _squarify(scaled, 0, 0, W, H);

  el.innerHTML = tiles.map((t) => {
    const small = (t.w < 56 || t.h < 42);
    const tiny = (t.w < 40 || t.h < 26);
    const cls = ["treemap-tile", small ? "is-small" : "", tiny ? "is-tiny" : ""].filter(Boolean).join(" ");
    const chgTxt = t.chg !== null ? `${t.chg >= 0 ? "+" : ""}${t.chg.toFixed(2)}%` : "—";
    const pctPort = (t.value / total * 100).toFixed(1);
    return `<div class="${cls}" style="left:${t.x.toFixed(1)}px;top:${t.y.toFixed(1)}px;width:${t.w.toFixed(1)}px;height:${t.h.toFixed(1)}px;background:${_treemapHeatColor(t.chg)}" title="${t.ticker} · ${pctPort}% del portafolio · hoy ${chgTxt}">
      <span class="treemap-tile-ticker">${t.ticker}</span>
      <span class="treemap-tile-chg">${chgTxt}</span>
    </div>`;
  }).join("");
}

// ── #7 Contribución al riesgo por posición ─────────────────────────────────────
function renderRiskContribution(portfolio, valid, rets, M, meta = {}) {
  const wrap = document.getElementById("riskContribWrap");
  const status = document.getElementById("riskContribStatus");
  if (!wrap) return;
  const currency = portfolio.currency || "USD";

  const valueByTicker = {};
  (portfolio.positions || []).forEach((pos) => {
    if (!valid.includes(pos.ticker) || !(pos.quantity > 0)) return;
    const posCur = getPosCurrency(pos, currency);
    const price = getCachedPrice(pos.ticker);
    const raw = price !== null ? price * pos.quantity : calcPositionTotals(pos).total;
    const val = convertAmount(raw, posCur, currency) ?? raw;
    valueByTicker[pos.ticker] = (valueByTicker[pos.ticker] || 0) + val;
  });
  const totalVal = valid.reduce((s, t) => s + (valueByTicker[t] || 0), 0);
  if (totalVal <= 0) {
    wrap.innerHTML = "";
    if (status) { status.style.display = ""; status.textContent = "Actualiza precios para calcular la contribución al riesgo."; }
    return;
  }
  const w = valid.map((t) => (valueByTicker[t] || 0) / totalVal);
  const sigma = valid.map((t) => {
    const r = rets[t], n = r.length, m = r.reduce((s, x) => s + x, 0) / n;
    return Math.sqrt(r.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, n - 1));
  });
  const n = valid.length;
  const Sw = new Array(n).fill(0);
  let portVar = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) Sw[i] += w[j] * (M[i][j] * sigma[i] * sigma[j]);
    portVar += w[i] * Sw[i];
  }
  if (portVar <= 0) {
    wrap.innerHTML = "";
    if (status) { status.style.display = ""; status.textContent = "Datos insuficientes para la contribución al riesgo."; }
    return;
  }
  const ANN = Math.sqrt(252);
  const rcAll = valid.map((t, i) => ({
    ticker: t,
    weight: w[i] * 100,
    risk: w[i] * Sw[i] / portVar * 100,
    sigmaAnn: sigma[i] * ANN * 100,
  }));
  const hidden = rcAll.filter((r) => r.weight < 0.05 && Math.abs(r.risk) < 0.05);
  const rc = rcAll.filter((r) => !hidden.includes(r)).sort((a, b) => b.risk - a.risk);
  const maxV = Math.max(...rc.map((r) => Math.max(Math.abs(r.risk), r.weight)), 1);

  // KPIs: vol anualizada del portafolio, vol "sin diversificar" y ahorro por diversificación
  const portVolAnn = Math.sqrt(portVar) * ANN * 100;
  const standaloneDaily = w.reduce((s, x, i) => s + x * sigma[i], 0);
  const standaloneAnn = standaloneDaily * ANN * 100;
  const divBenefit = standaloneDaily > 0 ? Math.max(0, (1 - Math.sqrt(portVar) / standaloneDaily) * 100) : 0;

  const kpis = `<div class="rc-kpis">
    <div class="rc-kpi"><span class="rc-kpi-label">Volatilidad del portafolio</span><strong>${portVolAnn.toFixed(1)}%</strong><span class="rc-kpi-sub">anualizada</span></div>
    <div class="rc-kpi"><span class="rc-kpi-label">Sin diversificación</span><strong>${standaloneAnn.toFixed(1)}%</strong><span class="rc-kpi-sub">suma ponderada de σ</span></div>
    <div class="rc-kpi rc-kpi-good"><span class="rc-kpi-label">Ahorro por diversificar</span><strong>−${divBenefit.toFixed(0)}%</strong><span class="rc-kpi-sub">menos volatilidad</span></div>
  </div>`;

  const rows = rc.map((r) => {
    const ratio = r.weight > 0 ? r.risk / r.weight : 0;
    const alert = r.weight >= 0.5 && ratio >= 1.5 && r.risk >= 3;
    const hedge = r.risk < 0;
    const tip = `${r.ticker} — peso ${r.weight.toFixed(1)}% · riesgo ${r.risk.toFixed(1)}%${r.weight > 0 ? ` (${ratio.toFixed(1)}× su peso)` : ""} · σ anualizada ${r.sigmaAnn.toFixed(0)}%${hedge ? " · reduce el riesgo total (cobertura)" : ""}`;
    return `<div class="rc-row${alert ? " rc-alert" : ""}" title="${tip}">
      <div class="rc-id">
        <span class="rc-ticker-line"><span class="rc-ticker">${r.ticker}</span>${alert ? `<span class="rc-badge">${ratio.toFixed(1)}×</span>` : ""}</span>
        <span class="rc-sigma">σ ${r.sigmaAnn.toFixed(0)}%</span>
      </div>
      <div class="rc-track">
        <span class="rc-fill${hedge ? " hedge" : ""}" style="width:${(Math.abs(r.risk) / maxV * 100).toFixed(1)}%"></span>
        <span class="rc-marker" style="left:${Math.min(100, r.weight / maxV * 100).toFixed(1)}%"></span>
      </div>
      <div class="rc-nums"><strong>${r.risk.toFixed(1)}%</strong><span>peso ${r.weight.toFixed(1)}%</span></div>
    </div>`;
  }).join("");

  const days = meta.days || 0;
  const excluded = meta.excluded || [];
  const warn = days > 0 && days < 60 ? `<div class="rc-warn">Solo ${days} retornos diarios comunes entre todos los activos — toma estos resultados con cautela.</div>` : "";
  const legend = `<div class="rc-legend">
    <span><i class="rc-i-fill"></i>Contribución al riesgo</span>
    <span><i class="rc-i-marker"></i>Peso (capital)</span>
    <span><i class="rc-i-warn"></i>Riesgo desproporcionado vs peso</span>
  </div>`;
  const notes = [];
  if (days > 0) notes.push(`Calculado con ${days} retornos diarios comunes (1 año)`);
  if (excluded.length) notes.push(`Excluidos por falta de histórico: ${excluded.join(", ")}`);
  if (hidden.length) notes.push(`${hidden.length} posición${hidden.length > 1 ? "es" : ""} con peso ~0% omitida${hidden.length > 1 ? "s" : ""}`);
  const note = notes.length ? `<div class="rc-note">${notes.join(" · ")}</div>` : "";

  wrap.innerHTML = kpis + `<div class="rc-list">${rows}</div>` + warn + legend + note;
  if (status) status.style.display = "none";
}

function openModal(id) { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }

// ── Compartir portafolio (#12) ─────────────────────────────────────────────
function _shareUrlForToken(tok) {
  return `${window.location.origin}/p.html?t=${encodeURIComponent(tok)}`;
}

function _wireShareModal() {
  if (_wireShareModal._done) return;
  _wireShareModal._done = true;
  document.querySelector('#shareModal [data-close-modal="shareModal"]')
    ?.addEventListener("click", () => closeModal("shareModal"));
  document.getElementById("shareModal")?.addEventListener("click", (e) => {
    if (e.target.id === "shareModal") closeModal("shareModal");
  });
  document.getElementById("shareCopyBtn")?.addEventListener("click", async () => {
    const inp = document.getElementById("shareLinkInput");
    if (!inp.value) return;
    try {
      await navigator.clipboard.writeText(inp.value);
      const btn = document.getElementById("shareCopyBtn");
      btn.textContent = "✓ Copiado";
      setTimeout(() => { btn.textContent = "Copiar"; }, 1800);
    } catch {
      inp.select();
      showToast("Copia el enlace manualmente (Ctrl+C).", { type: "info" });
    }
  });
  document.getElementById("shareRevokeBtn")?.addEventListener("click", async () => {
    if (!activePortfolioId) return;
    const statusEl = document.getElementById("shareModalStatus");
    statusEl.textContent = "Revocando…";
    try {
      await portfolioApiRequest(`/account/portfolios/${activePortfolioId}/share`, { method: "DELETE" });
      closeModal("shareModal");
      showToast("Enlace revocado. Ya no es accesible.", { type: "success" });
    } catch (err) {
      statusEl.textContent = "No se pudo revocar el enlace.";
    }
  });
}

async function openShareModal() {
  if (!activePortfolioId) return;
  const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
  if (!portfolio || !(portfolio.positions || []).length) {
    showToast("Agrega al menos una posición antes de compartir.", { type: "info" });
    return;
  }
  const inp = document.getElementById("shareLinkInput");
  const statusEl = document.getElementById("shareModalStatus");
  const openLink = document.getElementById("shareOpenLink");
  inp.value = "";
  statusEl.textContent = "";
  openModal("shareModal");
  inp.placeholder = "Generando enlace…";
  try {
    const res = await portfolioApiRequest(`/account/portfolios/${activePortfolioId}/share`, { method: "POST" });
    const url = _shareUrlForToken(res.token);
    inp.value = url;
    openLink.href = url;
    statusEl.textContent = "Enlace activo · cualquiera con él puede ver este portafolio.";
  } catch (err) {
    statusEl.textContent = "No se pudo generar el enlace. Intenta de nuevo.";
    inp.placeholder = "—";
  }
}

// ── Notificaciones in-app (#5) ─────────────────────────────────────────────
let _notifTimer = null;

function _timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} d`;
}

async function refreshNotifications() {
  try {
    const data = await portfolioApiRequest("/account/notifications");
    const badge = document.getElementById("notifBadge");
    const list = document.getElementById("notifList");
    const empty = document.getElementById("notifEmpty");
    if (badge) {
      if (data.unread > 0) { badge.textContent = data.unread > 9 ? "9+" : String(data.unread); badge.hidden = false; }
      else { badge.hidden = true; }
    }
    const notifs = data.notifications || [];
    if (list) {
      list.innerHTML = notifs.map((n) => `
        <div class="notif-item ${n.read ? "" : "is-unread"}">
          <div class="notif-item-title">${(n.title || "").replace(/</g, "&lt;")}</div>
          ${n.body ? `<div class="notif-item-body">${n.body.replace(/</g, "&lt;")}</div>` : ""}
          <div class="notif-item-time">${_timeAgo(n.createdAt)}</div>
        </div>`).join("");
    }
    if (empty) empty.style.display = notifs.length ? "none" : "";
  } catch { /* silencioso: no romper el dashboard si falla */ }
}

function initNotifications() {
  const bell = document.getElementById("notifBellBtn");
  const panel = document.getElementById("notifPanel");
  if (!bell || !panel) return;

  bell.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = panel.classList.toggle("hidden");
    bell.setAttribute("aria-expanded", String(!open));
    if (!open) refreshNotifications();
  });
  document.addEventListener("click", (e) => {
    if (!panel.classList.contains("hidden") && !panel.contains(e.target) && e.target !== bell) {
      panel.classList.add("hidden");
      bell.setAttribute("aria-expanded", "false");
    }
  });
  document.getElementById("notifMarkRead")?.addEventListener("click", async () => {
    try {
      await portfolioApiRequest("/account/notifications/read", { method: "POST" });
      refreshNotifications();
    } catch {}
  });

  refreshNotifications();
  if (_notifTimer) clearInterval(_notifTimer);
  _notifTimer = setInterval(refreshNotifications, 120000); // cada 2 min
}

// ── Alertas de precio (#5) ─────────────────────────────────────────────────
function _alertLabel(a) {
  const cond = a.kind === "price_above" ? "≥" : "≤";
  return `${a.symbol} ${cond} ${Number(a.threshold).toLocaleString("es-MX")}`;
}

async function refreshAlerts() {
  const list = document.getElementById("alertsList");
  const empty = document.getElementById("alertsEmpty");
  if (!list) return;
  try {
    const data = await portfolioApiRequest("/account/alerts");
    const alerts = data.alerts || [];
    list.innerHTML = alerts.map((a) => `
      <div class="alert-item ${a.active ? "" : "is-triggered"}">
        <div class="alert-item-main">
          <span class="alert-item-label">${_alertLabel(a)}</span>
          <span class="alert-item-status">${a.active ? "Activa" : "Disparada · " + _timeAgo(a.triggeredAt)}</span>
        </div>
        <button class="alert-del-btn" type="button" data-alert-id="${a.id}" aria-label="Eliminar alerta">✕</button>
      </div>`).join("");
    if (empty) empty.style.display = alerts.length ? "none" : "";
    list.querySelectorAll(".alert-del-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await portfolioApiRequest(`/account/alerts/${btn.dataset.alertId}`, { method: "DELETE" });
          refreshAlerts();
        } catch { showToast("No se pudo eliminar la alerta.", { type: "error" }); }
      });
    });
  } catch { /* silencioso */ }
}

function initAlertsUI() {
  const form = document.getElementById("alertForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById("alertFormStatus");
    const symbol = (document.getElementById("alertSymbol").value || "").trim().toUpperCase();
    const kind = document.getElementById("alertKind").value;
    const threshold = parseFloat(document.getElementById("alertThreshold").value);
    if (!symbol) { statusEl.textContent = "Ingresa un activo."; return; }
    if (!isFinite(threshold) || threshold <= 0) { statusEl.textContent = "Ingresa un precio objetivo válido."; return; }
    statusEl.textContent = "Creando…";
    try {
      await portfolioApiRequest("/account/alerts", {
        method: "POST",
        body: JSON.stringify({ symbol, kind, threshold }),
      });
      form.reset();
      statusEl.textContent = "Alerta creada ✓";
      refreshAlerts();
      setTimeout(() => { statusEl.textContent = ""; }, 2500);
    } catch (err) {
      statusEl.textContent = err.message || "No se pudo crear la alerta.";
    }
  });
  refreshAlerts();
}

function initCustomSelects() {
  document.querySelectorAll(".custom-select:not([data-cs-init])").forEach((wrapper) => {
    wrapper.dataset.csInit = "1";
    const trigger = wrapper.querySelector(".custom-select-trigger");
    const list = wrapper.querySelector(".custom-select-list");
    const hidden = wrapper.querySelector("input[type=hidden]");

    const openList = () => {
      document.querySelectorAll(".custom-select.is-open").forEach((el) => el.classList.remove("is-open"));
      wrapper.classList.add("is-open");
    };
    const closeList = () => wrapper.classList.remove("is-open");

    trigger.addEventListener("click", () => {
      const isOpen = wrapper.classList.contains("is-open");
      document.querySelectorAll(".custom-select.is-open").forEach((el) => el.classList.remove("is-open"));
      if (!isOpen) wrapper.classList.add("is-open");
    });

    const items = [...list.querySelectorAll("li")];
    items.forEach((li) => { li.tabIndex = -1; });

    const selectItem = (li) => {
      items.forEach((el) => el.classList.remove("is-active"));
      li.classList.add("is-active");
      trigger.querySelector("span").textContent = li.textContent;
      hidden.value = li.dataset.value;
      closeList();
      trigger.focus();
      hidden.dispatchEvent(new Event("change", { bubbles: true }));
    };
    items.forEach((li) => li.addEventListener("click", () => selectItem(li)));

    // Teclado en el botón (L2.6)
    trigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        openList();
        (items.find((el) => el.classList.contains("is-active")) || items[0])?.focus();
      }
    });
    // Teclado dentro de la lista (L2.6)
    list.addEventListener("keydown", (e) => {
      const idx = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); items[Math.min(items.length - 1, idx + 1)]?.focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); items[Math.max(0, idx - 1)]?.focus(); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (items[idx]) selectItem(items[idx]); }
      else if (e.key === "Escape") { e.preventDefault(); closeList(); trigger.focus(); }
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

  // Sincronizar desde Firestore (no bloquea el render inicial desde localStorage).
  // Siempre re-renderiza al resolver (no solo si `changed`) para limpiar el
  // skeleton de "cargando" incluso cuando el resultado final sigue vacío (bug #5).
  syncPortfoliosFromCloud().then(() => {
    if (!document.getElementById("trackerListView").classList.contains("hidden")) {
      renderPortfolioCards();
    }
  });

  initCustomSelects();
  initTxFiltersToggle();

  document.getElementById("newPortfolioBtn").addEventListener("click", () => openModal("newPortfolioModal"));

  // ── Enlace al comparador de escenarios de Markowitz (P2.2) ─────────────────
  document.getElementById("trackerGoCompareBtn")?.addEventListener("click", () => {
    activateSection("markowitz");
    requestAnimationFrame(() => document.getElementById("mkwCompareBtn")?.click());
  });
  document.getElementById("importCsvBtn")?.addEventListener("click", () => document.getElementById("importCsvInput").click());
  document.getElementById("importCsvInput")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importPositionsCSV(file);
    e.target.value = "";
  });

  // ── Drag & drop de CSV sobre la vista de lista (#12) ────────────────────────
  const listView = document.getElementById("trackerListView");
  if (listView && !listView.dataset.csvDropInit) {
    listView.dataset.csvDropInit = "1";
    const overlay = document.createElement("div");
    overlay.className = "csv-drop-overlay";
    overlay.innerHTML = `<div class="csv-drop-inner">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      <strong>Suelta tu CSV para importar</strong>
      <span>GBM, IBKR, Binance, eToro y otros formatos de broker</span>
    </div>`;
    listView.appendChild(overlay);
    let dragDepth = 0;
    const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files");
    listView.addEventListener("dragenter", (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth++; listView.classList.add("is-dragging-csv"); });
    listView.addEventListener("dragover", (e) => { if (hasFiles(e)) e.preventDefault(); });
    listView.addEventListener("dragleave", (e) => { if (!hasFiles(e)) return; dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) listView.classList.remove("is-dragging-csv"); });
    listView.addEventListener("drop", (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth = 0;
      listView.classList.remove("is-dragging-csv");
      const file = Array.from(e.dataTransfer.files || []).find((f) => /\.csv$/i.test(f.name) || f.type === "text/csv");
      if (file) importPositionsCSV(file);
      else showToast("Suelta un archivo .csv válido.", { type: "error" });
    });
  }

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
    window.bpTrack?.("portfolio_created", { benchmark, currency });
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

  // ── Modal: Registrar dividendo (P0.1) ──────────────────────────────────────
  document.getElementById("closeDividendModalBtn")?.addEventListener("click", () => closeModal("dividendModal"));
  document.getElementById("dividendModal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal("dividendModal");
  });
  document.getElementById("dividendPerShareInput")?.addEventListener("input", () => {
    const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
    const pos = portfolio && (portfolio.positions || []).find((p) => p.id === document.getElementById("dividendPosId").value);
    const note = document.getElementById("dividendTotalNote");
    const perShare = parseFloat(document.getElementById("dividendPerShareInput").value);
    if (pos && isFinite(perShare) && perShare > 0) {
      const posCur = getPosCurrency(pos, portfolio.currency || "USD");
      note.textContent = `Total estimado: ${formatCurrency(perShare * pos.quantity, posCur)}`;
    } else if (note) note.textContent = "";
  });
  document.getElementById("dividendForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const errEl = document.getElementById("dividendError");
    const portfolios = getPortfolios();
    const portfolio = portfolios.find((p) => p.id === activePortfolioId);
    const posId = document.getElementById("dividendPosId").value;
    const pos = portfolio && (portfolio.positions || []).find((p) => p.id === posId);
    const perShare = parseFloat(document.getElementById("dividendPerShareInput").value);
    const date = document.getElementById("dividendDateInput").value;
    if (!portfolio || !pos) { closeModal("dividendModal"); return; }
    if (!isFinite(perShare) || perShare <= 0) { errEl.textContent = "Ingresa un dividendo por acción válido."; errEl.classList.remove("hidden"); return; }
    if (!date) { errEl.textContent = "Ingresa la fecha de pago."; errEl.classList.remove("hidden"); return; }
    const posCur = getPosCurrency(pos, portfolio.currency || "USD");
    recordTransaction(portfolio, "DIVIDENDO", pos.ticker, pos.quantity, perShare, 0, posCur, { date: new Date(date + "T12:00:00").toISOString() });
    savePortfolios(portfolios);
    closeModal("dividendModal");
    renderPortfolioDashboard();
    showToast(`Dividendo de ${pos.ticker} registrado.`, { duration: 4000 });
    window.bpTrack?.("dividend_recorded", { ticker: pos.ticker });
  });

  // ── Modal: Nota / tesis de inversión por posición (P1.4) ───────────────────
  document.getElementById("closePositionNoteModalBtn")?.addEventListener("click", () => closeModal("positionNoteModal"));
  document.getElementById("positionNoteModal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal("positionNoteModal");
  });
  document.getElementById("positionNoteForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const portfolios = getPortfolios();
    const portfolio = portfolios.find((p) => p.id === activePortfolioId);
    const posId = document.getElementById("positionNotePosId").value;
    const pos = portfolio && (portfolio.positions || []).find((p) => p.id === posId);
    if (!portfolio || !pos) { closeModal("positionNoteModal"); return; }
    const note = document.getElementById("positionNoteInput").value.trim();
    pos.note = note || undefined;
    savePortfolios(portfolios);
    closeModal("positionNoteModal");
    renderPortfolioDashboard();
    showToast(note ? `Nota guardada para ${pos.ticker}.` : `Nota eliminada de ${pos.ticker}.`, { duration: 3000 });
  });

  // ── Modal: Editar ajustes del portafolio (P0.5) ────────────────────────────
  document.getElementById("editPortfolioSettingsBtn")?.addEventListener("click", openEditPortfolioModal);
  document.getElementById("closeEditPortfolioBtn")?.addEventListener("click", () => closeModal("editPortfolioModal"));
  document.getElementById("editPortfolioModal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal("editPortfolioModal");
  });
  document.getElementById("editPortfolioForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const portfolios = getPortfolios();
    const portfolio = portfolios.find((p) => p.id === activePortfolioId);
    if (!portfolio) { closeModal("editPortfolioModal"); return; }
    const name = document.getElementById("editPortfolioName").value.trim();
    if (name) portfolio.name = name;
    portfolio.description = document.getElementById("editPortfolioDesc").value.trim();
    portfolio.benchmark = document.getElementById("editPortfolioBenchmark").value;
    portfolio.currency = document.getElementById("editPortfolioCurrency").value;
    savePortfolios(portfolios);
    closeModal("editPortfolioModal");
    const nameEl = document.getElementById("dashPortfolioName");
    if (nameEl) nameEl.textContent = portfolio.name;
    renderPortfolioDashboard();
    showToast("Ajustes del portafolio actualizados.", { duration: 3500 });
    window.bpTrack?.("portfolio_edited");
  });

  document.getElementById("exportCsvBtn")?.addEventListener("click", exportTransactionsCSV);
  document.getElementById("exportPdfBtn")?.addEventListener("click", () => { window.bpTrack?.("pdf_report_open"); openReportRangeModal(); });
  _wireReportRangeModal();
  document.getElementById("exportPositionsBtn")?.addEventListener("click", exportPositionsCSV);
  document.getElementById("sharePortfolioBtn")?.addEventListener("click", openShareModal);
  _wireShareModal();
  initAiChat();

  // ── Menú desplegable de exportación (agrupación #3) ─────────────────────────
  const exportMenu = document.getElementById("trackerExportMenu");
  const exportTrigger = document.getElementById("exportMenuTrigger");
  if (exportMenu && exportTrigger) {
    const dropdown = exportMenu.querySelector(".tracker-export-dropdown");
    const closeExportMenu = () => { dropdown.hidden = true; exportTrigger.setAttribute("aria-expanded", "false"); };
    exportTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = dropdown.hidden;
      dropdown.hidden = !willOpen;
      exportTrigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
    // Cerrar el menú al elegir una opción o hacer clic fuera / Escape.
    dropdown.querySelectorAll("[role='menuitem']").forEach((item) => item.addEventListener("click", closeExportMenu));
    document.addEventListener("click", (e) => { if (!exportMenu.contains(e.target)) closeExportMenu(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeExportMenu(); });
  }

  // ── Toggle de densidad de la tabla de posiciones (rediseño visual #4) ───────
  const densityBtn = document.getElementById("positionsDensityBtn");
  if (densityBtn) {
    const applyDensity = (compact) => {
      const shell = document.getElementById("positionsTableShell");
      if (shell) shell.classList.toggle("is-compact", compact);
      densityBtn.setAttribute("aria-pressed", compact ? "true" : "false");
      densityBtn.classList.toggle("is-active", compact);
    };
    let compact = false;
    try { compact = localStorage.getItem("bp_posDensityCompact") === "1"; } catch {}
    applyDensity(compact);
    densityBtn.addEventListener("click", () => {
      compact = !compact;
      applyDensity(compact);
      try { localStorage.setItem("bp_posDensityCompact", compact ? "1" : "0"); } catch {}
    });
  }

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
    // Los botones de acción (comprar / alerta) manejan su propio click; no abrir Mercados.
    if (e.target.closest("[data-wl-buy], [data-wl-alert]")) return;
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
  document.getElementById("rebalNormalizeBtn")?.addEventListener("click", normalizeRebalTargets);
  document.getElementById("rebalExportBtn")?.addEventListener("click", exportRebalancePlan);
  document.getElementById("rebalExtraCash")?.addEventListener("input", recomputeRebalance);
  document.querySelector("#rebalTable")?.addEventListener("input", (e) => {
    if (e.target.classList.contains("rebal-target-input")) recomputeRebalance();
  });
  document.getElementById("rebalOptimizeBtn")?.addEventListener("click", runRebalanceOptimization);
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

  document.getElementById("dashAltCurrencySelect")?.addEventListener("change", (e) => {
    setDashAltCurrency(e.target.value);
    const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
    if (!portfolio) return;
    _doRenderDashboard(portfolio);
    const altCurrency = e.target.value;
    if (altCurrency) fetchExchangeRates([portfolio.currency || "USD"], altCurrency).then(() => _doRenderDashboard(portfolio));
  });

  document.getElementById("addPositionBtn").addEventListener("click", () => {
    const dateInput = document.getElementById("posPurchaseDateInput");
    if (dateInput) dateInput.max = new Date().toISOString().slice(0, 10);  // sin fechas futuras (L1.6)
    openModal("addPositionModal");
  });
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

    // Validación: la fecha de compra no puede ser futura (L1.6)
    const todayStr = new Date().toISOString().slice(0, 10);
    if (purchaseDate && purchaseDate > todayStr) {
      showToast("La fecha de compra no puede ser futura.", { type: "error" });
      return;
    }

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
      document.getElementById("tabPanelMetas").style.display = tab === "metas" ? "" : "none";
      document.getElementById("tabPanelDividendos").style.display = tab === "dividendos" ? "" : "none";
      document.getElementById("tabPanelRebalanceo").style.display = tab === "rebalanceo" ? "" : "none";
      document.getElementById("tabPanelCorrelacion").style.display = tab === "correlacion" ? "" : "none";
      document.getElementById("tabPanelWhatif").style.display = tab === "whatif" ? "" : "none";
      // Recordar la pestaña activa por portafolio (L2.4)
      try { localStorage.setItem(`bp_activeTab_${activePortfolioId}`, tab); } catch {}
      if (tab === "summary" && !summaryValueLoaded) {
        const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
        if (portfolio) loadSummaryValueChart(portfolio);
      }
      if (tab === "transacciones") renderTransactionsTab();
      if (tab === "dividendos") renderDividendsTab();
      if (tab === "rebalanceo") renderRebalanceTab();
      if (tab === "correlacion" && !corrTabLoaded) {
        const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
        const cs = document.getElementById("corrStatus");
        if (cs) cs.innerHTML = `<span class="inline-spinner"></span> Calculando correlaciones…`;
        if (portfolio) renderCorrelationTab(portfolio);
      }
      if (tab === "desempeno" && !perfTabLoaded) {
        const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
        const ps = document.getElementById("perfChartStatus");
        if (ps) ps.innerHTML = `<span class="inline-spinner"></span> Calculando rendimiento histórico…`;
        if (portfolio) loadPerformanceTab(portfolio);
      }
      if (tab === "proyeccion" && !mcTabLoaded) {
        const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
        const ms = document.getElementById("mcStatus");
        if (ms) ms.innerHTML = `<span class="inline-spinner"></span> Simulando escenarios…`;
        if (portfolio) loadMonteCarloTab(portfolio);
      }
      if (tab === "metas" && !goalTabLoaded) {
        const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
        if (portfolio) initGoalsTab(portfolio);
      }
    });
  });

  // ── Búsqueda de posiciones (L2.2) ──────────────────────────────────────────
  document.getElementById("positionsSearchInput")?.addEventListener("input", (e) => {
    posSearch = e.target.value.trim();
    const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
    if (portfolio) {
      const { totalInvested } = calcPortfolioTotals(portfolio.positions || [], portfolio.currency || "USD");
      renderPositionsTable(portfolio.positions || [], totalInvested, portfolio.currency || "USD", portfolio.transactions || []);
      drawAllSparklines((portfolio.positions || []));
    }
  });

  // ── Ordenamiento de la tabla de posiciones (L2.2) ──────────────────────────
  document.querySelector(".tracker-table--positions thead")?.addEventListener("click", (e) => {
    const th = e.target.closest("[data-sort]");
    if (!th) return;
    const key = th.dataset.sort;
    if (posSort.key === key) posSort.dir = posSort.dir === "asc" ? "desc" : "asc";
    else { posSort.key = key; posSort.dir = key === "ticker" || key === "date" ? "asc" : "desc"; }
    const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
    if (portfolio) {
      const { totalInvested } = calcPortfolioTotals(portfolio.positions || [], portfolio.currency || "USD");
      renderPositionsTable(portfolio.positions || [], totalInvested, portfolio.currency || "USD", portfolio.transactions || []);
      drawAllSparklines((portfolio.positions || []));
    }
  });

  // ── Ordenamiento de la tabla de transacciones (L2.2) ───────────────────────
  document.querySelector("#txTableShell thead")?.addEventListener("click", (e) => {
    const th = e.target.closest("[data-txsort]");
    if (!th) return;
    const key = th.dataset.txsort;
    if (txSort.key === key) txSort.dir = txSort.dir === "asc" ? "desc" : "asc";
    else { txSort.key = key; txSort.dir = (key === "ticker" || key === "type") ? "asc" : "desc"; }
    renderTransactionsTab();
  });

  // ── Toggle base del donut de ponderación (L2.3) ────────────────────────────
  document.getElementById("donutBaseToggle")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".donut-base-btn");
    if (!btn) return;
    donutBase = btn.dataset.base;
    document.querySelectorAll("#donutBaseToggle .donut-base-btn").forEach((b) => {
      const isActive = b === btn;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-pressed", String(isActive));
    });
    const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
    if (portfolio) {
      const { totalInvested } = calcPortfolioTotals(portfolio.positions || [], portfolio.currency || "USD");
      const cashBalance = portfolio.cashBalance || 0;
      drawDonutChart(document.getElementById("portfolioDonutChart"), portfolio.positions || [], totalInvested, portfolio.currency || "USD", cashBalance);
      renderDonutLegend(portfolio.positions || [], totalInvested, portfolio.currency || "USD", cashBalance);
    }
  });

  // ── Toggle de periodo del retorno por posición (P1.1) ──────────────────────
  document.getElementById("posReturnPeriodToggle")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".pos-period-btn");
    if (!btn) return;
    posReturnPeriod = btn.dataset.period;
    document.querySelectorAll("#posReturnPeriodToggle .pos-period-btn").forEach((b) => b.classList.toggle("active", b === btn));
    const thLabels = { total: "Retorno", "1d": "Retorno (1D)", "1w": "Retorno (1S)", "1m": "Retorno (1M)", ytd: "Retorno (YTD)" };
    const th = document.getElementById("thPosReturn");
    if (th) th.textContent = thLabels[posReturnPeriod] || "Retorno";
    const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
    if (portfolio) _doRenderDashboard(portfolio);
  });

  // ── Gestión de efectivo (L1.10) ────────────────────────────────────────────
  _wireCashModal();

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
    document.querySelectorAll("#tabPanelDesempeno .perf-period-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    perfTabLoaded = false;
    const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
    if (portfolio) loadPerformanceTab(portfolio);
  });

  // ── Period buttons de la gráfica de valor del Resumen (#1) ─────────────────
  document.getElementById("valueChartPeriodNav")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".perf-period-btn");
    if (!btn) return;
    const pop = document.getElementById("valueCustomPopover");
    // Botón "Personalizado" (P1.8): abre/cierra el selector de fechas, no recarga aún.
    if (btn.dataset.range === "custom") {
      if (pop) {
        pop.classList.toggle("hidden");
        if (!pop.classList.contains("hidden")) {
          const fromEl = document.getElementById("valueCustomFrom");
          const toEl = document.getElementById("valueCustomTo");
          const today = new Date().toISOString().slice(0, 10);
          if (toEl && !toEl.value) toEl.value = today;
          if (fromEl && !fromEl.value) { const d = new Date(); d.setMonth(d.getMonth() - 6); fromEl.value = d.toISOString().slice(0, 10); }
          if (fromEl) fromEl.max = today;
          if (toEl) toEl.max = today;
        }
      }
      return;
    }
    if (pop) pop.classList.add("hidden");
    _valueCustomRange = null;
    document.querySelectorAll("#valueChartPeriodNav .perf-period-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    summaryValueLoaded = false;
    const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
    if (portfolio) loadSummaryValueChart(portfolio);
  });

  // Aplicar rango personalizado del gráfico hero (P1.8)
  document.getElementById("valueCustomApply")?.addEventListener("click", () => {
    const from = document.getElementById("valueCustomFrom")?.value;
    const to = document.getElementById("valueCustomTo")?.value;
    const err = document.getElementById("valueCustomError");
    if (!from || !to) { if (err) err.textContent = "Elige ambas fechas."; return; }
    if (from > to) { if (err) err.textContent = "La fecha inicial debe ser anterior a la final."; return; }
    if (err) err.textContent = "";
    _valueCustomRange = { from, to };
    document.getElementById("valueCustomPopover")?.classList.add("hidden");
    document.querySelectorAll("#valueChartPeriodNav .perf-period-btn").forEach((b) => b.classList.remove("active"));
    document.getElementById("valueCustomBtn")?.classList.add("active");
    summaryValueLoaded = false;
    const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
    if (portfolio) loadSummaryValueChart(portfolio);
  });

  // Toggle de serie del gráfico hero (Valor / vs Invertido / vs Benchmark) — P0.3
  document.getElementById("valueSeriesToggle")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".value-series-btn");
    if (!btn) return;
    document.querySelectorAll("#valueSeriesToggle .value-series-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    summaryChartMode = btn.dataset.series;
    drawSummaryChartForMode();
  });

  // Toggle de composición (Ponderación / Top 10 / Mapa de calor) — Visual 1
  document.getElementById("compositionToggle")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".comp-btn");
    if (!btn) return;
    const which = btn.dataset.comp;
    document.querySelectorAll("#compositionToggle .comp-btn").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll("#compositionCard .comp-panel").forEach((p) => p.classList.toggle("hidden", p.dataset.compPanel !== which));
    const card = document.getElementById("compositionCard");
    if (card) card.dataset.comp = which;
    const sub = document.getElementById("compositionSub");
    if (sub) sub.textContent = which === "donut" ? "Distribución por posición"
      : which === "bars" ? "Top 10 por valor actual"
      : "Tamaño = peso · color = cambio de hoy";
    renderCompositionPanel(which);
  });

  // ── Accesibilidad: cerrar cualquier modal del tracker con ESC (L2.6) ───────
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    let closedAny = false;
    document.querySelectorAll(".tracker-modal-backdrop:not(.hidden)").forEach((m) => {
      m.classList.add("hidden");
      closedAny = true;
    });
    // También cerrar el modal de eliminar portafolio (usa hidden directo)
    const delModal = document.getElementById("deletePortfolioModal");
    if (delModal && !delModal.classList.contains("hidden")) { delModal.classList.add("hidden"); pendingDeleteId = null; closedAny = true; }
    if (closedAny) document.querySelectorAll(".custom-select.is-open").forEach((el) => el.classList.remove("is-open"));
  });

  // Al abrir un modal, enfocar su primer campo (L2.6)
  document.querySelectorAll(".tracker-modal-backdrop").forEach((backdrop) => {
    const obs = new MutationObserver(() => {
      if (!backdrop.classList.contains("hidden")) {
        const focusable = backdrop.querySelector("input:not([type=hidden]), select, button.button");
        if (focusable) setTimeout(() => focusable.focus(), 30);
      }
    });
    obs.observe(backdrop, { attributes: true, attributeFilter: ["class"] });
  });

  trackerInitialized = true;
}

// ── Modal de gestión de efectivo (L1.10) ──────────────────────────────────────
function _wireCashModal() {
  const open = () => {
    const portfolio = getPortfolios().find((p) => p.id === activePortfolioId);
    if (!portfolio) return;
    document.getElementById("cashAmountInput").value = "";
    document.getElementById("cashDateInput").value = new Date().toISOString().slice(0, 10);
    document.getElementById("cashError").classList.add("hidden");
    document.getElementById("cashOpInput").value = "DEPOSITO";
    document.querySelectorAll("#cashModal .cash-op-btn").forEach((b) => b.classList.toggle("active", b.dataset.op === "DEPOSITO"));
    openModal("cashModal");
  };
  document.getElementById("manageCashBtn")?.addEventListener("click", open);
  document.getElementById("closeCashModalBtn")?.addEventListener("click", () => closeModal("cashModal"));
  document.getElementById("cashModal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal("cashModal");
  });
  document.querySelectorAll("#cashModal .cash-op-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#cashModal .cash-op-btn").forEach((b) => b.classList.toggle("active", b === btn));
      document.getElementById("cashOpInput").value = btn.dataset.op;
    });
  });
  document.getElementById("cashForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const op = document.getElementById("cashOpInput").value;
    const amount = parseFloat(document.getElementById("cashAmountInput").value) || 0;
    const dateStr = document.getElementById("cashDateInput").value;
    const errEl = document.getElementById("cashError");
    const showErr = (msg) => { errEl.textContent = msg; errEl.classList.remove("hidden"); };

    if (amount <= 0) return showErr("Ingresa un monto mayor a cero.");
    const todayStr = new Date().toISOString().slice(0, 10);
    if (dateStr && dateStr > todayStr) return showErr("La fecha no puede ser futura.");

    const portfolios = getPortfolios();
    const portfolio = portfolios.find((p) => p.id === activePortfolioId);
    if (!portfolio) return;
    const cur = portfolio.currency || "USD";
    const currentCash = portfolio.cashBalance || 0;
    if (op === "RETIRO" && amount > currentCash + 1e-9) {
      return showErr(`No puedes retirar más del efectivo disponible (${formatCurrency(currentCash, cur)}).`);
    }

    portfolio.cashBalance = op === "DEPOSITO" ? currentCash + amount : currentCash - amount;
    if (!portfolio.transactions) portfolio.transactions = [];
    const isoDate = dateStr ? new Date(dateStr + "T12:00:00").toISOString() : new Date().toISOString();
    portfolio.transactions.unshift({
      id: generateId(), date: isoDate, type: op, ticker: "CASH",
      quantity: 1, price: amount, commissionPercent: 0, commCost: 0, net: amount, currency: cur
    });
    savePortfolios(portfolios);
    closeModal("cashModal");
    showToast(op === "DEPOSITO" ? `Aporte de ${formatCurrency(amount, cur)} registrado.` : `Retiro de ${formatCurrency(amount, cur)} registrado.`, { type: "success" });
    renderPortfolioDashboard();
  });

  // ── Editar transacción ──────────────────────────────────────────────────
  document.getElementById("closeEditTxModalBtn")?.addEventListener("click", () => closeModal("editTxModal"));
  document.getElementById("editTxModal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal("editTxModal");
  });
  document.getElementById("editTxType")?.addEventListener("change", (e) => updateEditTxFields(e.target.value));
  document.getElementById("editTxForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const errEl = document.getElementById("editTxError");
    const showErr = (msg) => { errEl.textContent = msg; errEl.classList.remove("hidden"); };
    errEl.classList.add("hidden");

    const txId = document.getElementById("editTxId").value;
    const type = document.getElementById("editTxType").value;
    const dateStr = document.getElementById("editTxDate").value;
    const ticker = document.getElementById("editTxTicker").value.trim().toUpperCase();
    const quantity = parseFloat(document.getElementById("editTxQuantity").value) || 0;
    const price = parseFloat(document.getElementById("editTxPrice").value) || 0;
    const commissionPercent = parseFloat(document.getElementById("editTxCommission").value) || 0;

    if (!dateStr) return showErr("Ingresa una fecha.");
    if (dateStr > new Date().toISOString().slice(0, 10)) return showErr("La fecha no puede ser futura.");
    const isCash = type === "DEPOSITO" || type === "RETIRO";
    if (!isCash && !ticker) return showErr("Ingresa el ticker del activo.");
    if (!isCash && quantity <= 0) return showErr("La cantidad debe ser mayor a cero.");
    if (price <= 0) return showErr(isCash ? "El monto debe ser mayor a cero." : "El precio debe ser mayor a cero.");

    const portfolios = getPortfolios();
    const portfolio = portfolios.find((p) => p.id === activePortfolioId);
    if (!portfolio) return;
    const oldTx = (portfolio.transactions || []).find((t) => t.id === txId);
    if (!oldTx) return showErr("No se encontró la transacción.");

    const newTx = buildTxFromForm(oldTx, type, dateStr, ticker, quantity, price, commissionPercent);
    applyTxMutation(portfolio, oldTx, newTx);
    savePortfolios(portfolios);
    closeModal("editTxModal");
    renderPortfolioDashboard();
    renderTransactionsTab();
    showToast("Transacción actualizada.", { type: "success" });
  });
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

const investmentValueChartStates = new WeakMap();

function buildInvestmentValueSeries(allPositions, dates, tickerDateMaps, portfolioCurrency) {
  if (!dates.length) return [];
  return dates.map((date) => {
    let invested = 0;
    let market = 0;
    allPositions.forEach((position) => {
      const purchaseDate = position.purchaseDate ? String(position.purchaseDate).slice(0, 10) : dates[0];
      const sellDate = position.sellDate ? String(position.sellDate).slice(0, 10) : null;
      if (date < purchaseDate || (sellDate && date > sellDate)) return;
      const close = tickerDateMaps[position.ticker]?.[date];
      const quantity = Number(position.quantity) || 0;
      const averagePrice = Number(position.avgPrice) || 0;
      if (!Number.isFinite(close) || close <= 0 || quantity <= 0) return;
      const positionCurrency = position.currency || portfolioCurrency;
      const conversion = convertAmount(1, positionCurrency, portfolioCurrency) ?? 1;
      invested += averagePrice * quantity * conversion;
      market += close * quantity * conversion;
    });
    return { date, invested, market };
  }).filter((point) => point.invested > 0 || point.market > 0);
}

function paintInvestmentValueChart(canvas) {
  const state = investmentValueChartStates.get(canvas);
  if (!state) return;
  const { width, height, dpr, points, currency, hoverIndex } = state;
  const ctx = canvas.getContext("2d");
  const lightMode = document.body.classList.contains("light-mode");
  const pad = { left: 64, right: 20, top: 22, bottom: 38 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  if (!points.length) {
    ctx.fillStyle = lightMode ? "rgba(23,32,51,0.5)" : "rgba(226,232,255,0.45)";
    ctx.font = "500 13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Sin datos históricos suficientes", width / 2, height / 2);
    return;
  }

  const values = points.flatMap((point) => [point.invested, point.market]);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const valuePadding = (rawMax - rawMin) * 0.12 || Math.max(rawMax * 0.08, 1);
  const minValue = Math.max(0, rawMin - valuePadding);
  const maxValue = rawMax + valuePadding;
  const valueRange = Math.max(maxValue - minValue, 1);
  const toX = (index) => pad.left + (index / Math.max(points.length - 1, 1)) * chartWidth;
  const toY = (value) => pad.top + chartHeight * (1 - (value - minValue) / valueRange);
  state.toX = toX;
  state.toY = toY;
  state.pad = pad;
  state.chartWidth = chartWidth;
  state.chartHeight = chartHeight;

  const gridColor = lightMode ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.07)";
  const axisColor = lightMode ? "rgba(23,32,51,0.48)" : "rgba(226,232,255,0.42)";
  ctx.font = "500 10px Inter, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let step = 0; step <= 4; step++) {
    const value = minValue + (valueRange / 4) * step;
    const y = toY(value);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = axisColor;
    ctx.fillText(formatCurrencyCompact(value, currency), pad.left - 10, y);
  }

  const labelIndexes = [...new Set([0, Math.round((points.length - 1) * 0.25), Math.round((points.length - 1) * 0.5), Math.round((points.length - 1) * 0.75), points.length - 1])];
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  labelIndexes.forEach((index) => {
    const date = new Date(`${points[index].date}T12:00:00`);
    ctx.fillStyle = axisColor;
    ctx.fillText(date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }), toX(index), height - pad.bottom + 12);
  });

  const marketGradient = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
  marketGradient.addColorStop(0, lightMode ? "rgba(111,134,255,0.18)" : "rgba(111,134,255,0.24)");
  marketGradient.addColorStop(1, "rgba(111,134,255,0)");
  ctx.beginPath();
  points.forEach((point, index) => ctx[index ? "lineTo" : "moveTo"](toX(index), toY(point.market)));
  ctx.lineTo(toX(points.length - 1), height - pad.bottom);
  ctx.lineTo(toX(0), height - pad.bottom);
  ctx.closePath();
  ctx.fillStyle = marketGradient;
  ctx.fill();

  const drawLine = (key, color, dashed = false) => {
    ctx.beginPath();
    points.forEach((point, index) => ctx[index ? "lineTo" : "moveTo"](toX(index), toY(point[key])));
    ctx.strokeStyle = color;
    ctx.lineWidth = key === "market" ? 2.5 : 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.setLineDash(dashed ? [6, 5] : []);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  drawLine("invested", "#f5b84c", true);
  drawLine("market", "#6f86ff");

  if (hoverIndex !== null && points[hoverIndex]) {
    const point = points[hoverIndex];
    const x = toX(hoverIndex);
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, height - pad.bottom);
    ctx.strokeStyle = lightMode ? "rgba(15,23,42,0.22)" : "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    [[point.invested, "#f5b84c"], [point.market, "#6f86ff"]].forEach(([value, color]) => {
      ctx.beginPath();
      ctx.arc(x, toY(value), 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = lightMode ? "#ffffff" : "#0d0f17";
      ctx.stroke();
    });
  }
}

function setInvestmentValueHover(canvas, index) {
  const state = investmentValueChartStates.get(canvas);
  if (!state) return;
  if (state.hoverIndex !== index) {
    state.hoverIndex = index;
    paintInvestmentValueChart(canvas);
  }
  const tooltip = document.getElementById("investmentValueTooltip");
  if (!tooltip) return;
  if (index === null || !state.points[index]) {
    tooltip.classList.add("hidden");
    return;
  }
  const point = state.points[index];
  const difference = point.market - point.invested;
  tooltip.innerHTML = `<strong>${new Date(point.date + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</strong>
    <span><i class="is-invested"></i>Capital invertido <b>${formatCurrency(point.invested, state.currency)}</b></span>
    <span><i class="is-market"></i>Valor de mercado <b>${formatCurrency(point.market, state.currency)}</b></span>
    <small class="${difference >= 0 ? "return-pos" : "return-neg"}">Diferencia: ${difference >= 0 ? "+" : ""}${formatCurrency(difference, state.currency)}</small>`;
  const x = state.toX(index);
  tooltip.style.left = `${Math.min(Math.max(x + 12, 12), state.width - 196)}px`;
  tooltip.style.top = `${Math.max(12, state.toY(Math.max(point.invested, point.market)) - 18)}px`;
  tooltip.classList.remove("hidden");
}

function ensureInvestmentValueInteractions(canvas) {
  if (canvas.dataset.interactive === "true") return;
  canvas.dataset.interactive = "true";
  const updateFromPointer = (event) => {
    const state = investmentValueChartStates.get(canvas);
    if (!state || !state.points.length) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (state.width / rect.width);
    if (x < state.pad.left || x > state.width - state.pad.right) {
      setInvestmentValueHover(canvas, null);
      return;
    }
    const index = Math.max(0, Math.min(state.points.length - 1, Math.round((x - state.pad.left) / state.chartWidth * (state.points.length - 1))));
    setInvestmentValueHover(canvas, index);
  };
  canvas.addEventListener("pointerdown", updateFromPointer);
  canvas.addEventListener("pointermove", updateFromPointer);
  canvas.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "touch") setInvestmentValueHover(canvas, null);
  });
  document.addEventListener("pointerdown", (event) => {
    if (event.target !== canvas) setInvestmentValueHover(canvas, null);
  });
  document.addEventListener("pointermove", (event) => {
    if (event.target !== canvas) setInvestmentValueHover(canvas, null);
  });
}

function drawInvestmentValueChart(canvas, points, currency) {
  if (!canvas) return;
  const width = canvas.parentElement?.clientWidth || 700;
  const height = width < 560 ? 260 : 300;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  investmentValueChartStates.set(canvas, { width, height, dpr, points, currency, hoverIndex: null });
  document.getElementById("investmentValueTooltip")?.classList.add("hidden");
  ensureInvestmentValueInteractions(canvas);
  paintInvestmentValueChart(canvas);
}

// Fecha desde la que se sostiene CONTINUAMENTE la posición actual de un
// ticker (bug del gráfico de valor): si se vendió todo y se recompró después,
// `pos.purchaseDate` puede seguir apuntando a la primera compra de todos los
// tiempos (dato ya guardado, de antes del fix en rebuildOpenPositionForTicker).
// Se recalcula replayando COMPRA/VENTA y tomando la fecha de la última compra
// que arrancó desde cantidad cero. Devuelve null si no hay transacciones para
// ese ticker (posiciones importadas por CSV sin historial completo).
function _effectiveOpenPurchaseDate(transactions, ticker) {
  const txs = (transactions || [])
    .filter((t) => t.ticker === ticker && (t.type === "COMPRA" || t.type === "VENTA"))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!txs.length) return null;
  let qty = 0;
  let since = null;
  for (const tx of txs) {
    if (tx.type === "COMPRA") {
      if (qty <= 1e-9) since = (tx.date || "").slice(0, 10);
      qty += tx.quantity || 0;
    } else {
      qty = Math.max(0, qty - (tx.quantity || 0));
    }
  }
  return since;
}

function buildAllPositionHistory(portfolio) {
  const portfolioCur = portfolio.currency || "USD";
  const result = [];

  // Open positions
  for (const pos of (portfolio.positions || [])) {
    const effectiveDate = _effectiveOpenPurchaseDate(portfolio.transactions, pos.ticker);
    result.push({
      ticker: pos.ticker,
      avgPrice: pos.avgPrice || 0,
      quantity: pos.quantity || 0,
      currency: getPosCurrency(pos, portfolioCur),
      purchaseDate: effectiveDate || pos.purchaseDate || null,
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

// ── Gráfica de valor del portafolio (Resumen, #1) ───────────────────────────
const portfolioValueChartStates = new WeakMap();

// ── Toggle de serie del gráfico hero del Resumen (P0.3) ─────────────────────
let summaryChartMode = "value"; // "value" | "invested" | "benchmark"
let _summaryChartData = null;
let _valueCustomRange = null; // {from, to} — rango personalizado del gráfico (P1.8)

async function drawSummaryChartForMode() {
  const data = _summaryChartData;
  const canvas = document.getElementById("portfolioValueChart");
  if (!data || !canvas) return;
  const { points, currency } = data;
  const statusEl = document.getElementById("valueChartStatus");

  if (summaryChartMode === "invested") {
    drawPortfolioValueChart(canvas, points, currency, {
      points: points.map((p) => ({ value: p.invested })),
      color: "#f5b84c", label: "Capital invertido"
    });
    if (statusEl) statusEl.textContent = "Naranja punteado = capital invertido acumulado.";
    return;
  }

  if (summaryChartMode === "benchmark") {
    if (!data.benchmark) {
      drawPortfolioValueChart(canvas, points, currency);
      if (statusEl) statusEl.textContent = "Sin índice de referencia. Configúralo en Ajustes del portafolio.";
      return;
    }
    if (!data.benchPoints) {
      try {
        const h = await fetchHistoricalCloses(data.benchmark, data.range, data.interval);
        const map = {};
        (h || []).forEach((d) => { map[new Date(d.ts).toISOString().slice(0, 10)] = d.close; });
        let lastClose = null;
        const aligned = points.map((p) => {
          if (map[p.date] != null) lastClose = map[p.date];
          return lastClose;
        });
        const base = aligned.find((v) => v != null);
        const startVal = points[0].value;
        data.benchPoints = aligned.map((v) => (v != null && base) ? { value: v / base * startVal } : { value: null });
      } catch { data.benchPoints = null; }
    }
    drawPortfolioValueChart(canvas, points, currency, data.benchPoints ? {
      points: data.benchPoints, color: "#39d0ff", label: `${data.benchName} (equiv.)`
    } : null);
    if (statusEl) statusEl.textContent = data.benchPoints
      ? `Azul punteado = ${data.benchName} con el mismo valor inicial (equivalencia).`
      : "No se pudo cargar el índice de referencia.";
    return;
  }

  drawPortfolioValueChart(canvas, points, currency);
  if (statusEl) statusEl.textContent = "Valor de mercado de tus posiciones + efectivo a lo largo del tiempo.";
}

async function loadSummaryValueChart(portfolio) {
  portfolio = portfolio || getPortfolios().find((p) => p.id === activePortfolioId);
  if (!portfolio) return;
  summaryValueLoaded = true;
  const canvas = document.getElementById("portfolioValueChart");
  const statusEl = document.getElementById("valueChartStatus");
  const latestEl = document.getElementById("valueChartLatest");
  const deltaEl = document.getElementById("valueChartDelta");
  if (!canvas) return;
  const portfolioCur = portfolio.currency || "USD";
  const activeBtn = document.querySelector("#valueChartPeriodNav .perf-period-btn.active");
  let range = activeBtn?.dataset.range || "1y";
  let interval = activeBtn?.dataset.interval || "1d";
  // Rango personalizado (P1.8): se descarga un periodo amplio y se recorta en cliente,
  // sin depender de que el backend acepte fechas arbitrarias.
  const cr = (range === "custom") ? _valueCustomRange : null;
  if (cr) {
    const spanDays = (new Date(cr.to) - new Date(cr.from)) / 86400000;
    const fromAgeDays = (Date.now() - new Date(cr.from)) / 86400000;
    if (fromAgeDays > 730 || spanDays > 365 * 2) { range = "max"; interval = spanDays > 365 * 3 ? "1wk" : "1d"; }
    else if (spanDays > 365) { range = "2y"; interval = "1d"; }
    else { range = "1y"; interval = "1d"; }
  }

  const resetReadout = (msg) => {
    drawPortfolioValueChart(canvas, [], portfolioCur);
    if (statusEl) statusEl.textContent = msg;
    if (latestEl) latestEl.textContent = "—";
    if (deltaEl) { deltaEl.textContent = ""; deltaEl.className = "value-chart-delta"; }
  };

  const allPositions = buildAllPositionHistory(portfolio);
  if (!allPositions.length) {
    resetReadout("Agrega posiciones para ver la evolución de tu portafolio.");
    return;
  }
  if (statusEl) statusEl.innerHTML = `<span class="inline-spinner"></span> Calculando evolución del valor…`;

  const uniqueTickers = [...new Set(allPositions.map((p) => p.ticker))];
  // Asegura el tipo de cambio ANTES de convertir (bug de valores inflados):
  // showTrackerDashView dispara este render en paralelo con renderPortfolioDashboard
  // (que también hace fetchExchangeRates), así que sin este await la conversión
  // podía correr con el caché de FX vacío → convertAmount devolvía null →
  // conversion caía a 1 (sin convertir) para posiciones en otra moneda.
  const posCurrencies = [...new Set(allPositions.map((p) => p.currency))];
  const [histories] = await Promise.all([
    Promise.all(uniqueTickers.map((t) =>
      fetchHistoricalCloses(t, range, interval).then((h) => ({ t, h })).catch(() => ({ t, h: [] }))
    )),
    fetchExchangeRates(posCurrencies, portfolioCur)
  ]);

  const tickerDateMaps = {};
  const allDates = new Set();
  histories.forEach(({ t, h }) => {
    tickerDateMaps[t] = {};
    (h || []).forEach((d) => {
      const ds = new Date(d.ts).toISOString().slice(0, 10);
      tickerDateMaps[t][ds] = d.close;
      allDates.add(ds);
    });
  });
  const dates = [...allDates].sort();
  // Forward-fill: cada ticker toma su último cierre conocido en las fechas sin dato,
  // evitando caídas falsas cuando los calendarios de bolsa difieren (p. ej. .MX vs EE.UU.).
  histories.forEach(({ t }) => {
    const map = tickerDateMaps[t];
    let last = null;
    for (const ds of dates) {
      if (map[ds] != null) last = map[ds];
      else if (last != null) map[ds] = last;
    }
  });
  // Recorta al rango personalizado tras el forward-fill (así los días no bursátiles
  // dentro de la ventana ya heredaron su último cierre conocido).
  const windowDates = cr ? dates.filter((d) => d >= cr.from && d <= cr.to) : dates;
  const series = buildInvestmentValueSeries(allPositions, windowDates, tickerDateMaps, portfolioCur);
  // El efectivo ACTUAL se suma como constante al valor de mercado (no al
  // invertido), para que el punto más reciente coincida con el KPI "Valor
  // actual" (bug #4), que también lo incluye. No se intenta reconstruir un
  // efectivo histórico por fecha: replayar cada COMPRA/VENTA como si saliera
  // de una caja que arranca en $0 ignora que la mayoría de las posiciones no
  // tienen un DEPOSITO previo registrado, y el acumulado se iba muy negativo
  // (viz. hallazgo real: infló/desinfló el gráfico muy por debajo del KPI).
  const cashBalance = portfolio.cashBalance || 0;
  // Conserva `invested` alineado por índice para la serie de comparación (P0.3).
  const points = series
    .map((p) => ({ date: p.date, value: p.market + cashBalance, invested: p.invested }))
    .filter((p) => p.value > 0);

  if (points.length < 2) {
    resetReadout("No hay suficientes datos históricos para este periodo.");
    summaryValueLoaded = false;
    return;
  }

  // Guarda el contexto para poder redibujar al cambiar de serie sin re-descargar.
  _summaryChartData = {
    points, currency: portfolioCur, range, interval,
    benchmark: (portfolio.benchmark && portfolio.benchmark !== "none") ? portfolio.benchmark : null,
    benchName: BENCHMARKS[portfolio.benchmark] || portfolio.benchmark || "Benchmark",
    benchPoints: null
  };
  await drawSummaryChartForMode();
  const first = points[0].value, last = points[points.length - 1].value;
  const diff = last - first;
  const pct = first > 0 ? diff / first * 100 : 0;
  if (latestEl) latestEl.textContent = formatCurrency(last, portfolioCur);
  if (deltaEl) {
    const up = diff >= 0;
    deltaEl.textContent = `${up ? "+" : ""}${formatCurrency(diff, portfolioCur)} (${up ? "+" : ""}${pct.toFixed(2)}%) · ${activeBtn?.textContent || ""}`;
    deltaEl.className = "value-chart-delta " + (up ? "return-pos" : "return-neg");
  }
  if (statusEl) statusEl.textContent = "";
}

// Paso "redondo" (1/2/5 × potencia de 10) para el eje Y de un gráfico (bug #9).
function _niceAxisStep(range, targetTicks = 4) {
  const rough = range / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(rough || 1)));
  const norm = rough / mag;
  let step;
  if (norm < 1.5) step = 1;
  else if (norm < 3) step = 2;
  else if (norm < 7) step = 5;
  else step = 10;
  return step * mag;
}

function drawPortfolioValueChart(canvas, points, currency, compare) {
  if (!canvas) return;
  const width = canvas.parentElement?.clientWidth || 700;
  const height = width < 560 ? 240 : 300;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  // `compare` (opcional): { points:[{value}] alineado por índice, color, label }
  portfolioValueChartStates.set(canvas, { width, height, dpr, points, currency, hoverIndex: null, compare: compare || null });
  document.getElementById("portfolioValueTooltip")?.classList.add("hidden");
  paintPortfolioValueChart(canvas);
  ensurePortfolioValueInteractions(canvas);
}

function paintPortfolioValueChart(canvas) {
  const state = portfolioValueChartStates.get(canvas);
  if (!state) return;
  const { width, height, dpr, points, currency, hoverIndex, compare } = state;
  const ctx = canvas.getContext("2d");
  const lightMode = document.body.classList.contains("light-mode");
  const pad = { left: 64, right: 20, top: 20, bottom: 34 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (points.length < 2) {
    ctx.fillStyle = lightMode ? "rgba(23,32,51,0.5)" : "rgba(226,232,255,0.45)";
    ctx.font = "500 13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Sin datos históricos suficientes", width / 2, height / 2);
    return;
  }
  const values = points.map((p) => p.value);
  const cmpValues = compare && compare.points ? compare.points.map((p) => (p ? p.value : null)).filter((v) => v != null && isFinite(v)) : [];
  const rawMin = Math.min(...values, ...cmpValues), rawMax = Math.max(...values, ...cmpValues);
  const valPad = (rawMax - rawMin) * 0.12 || Math.max(rawMax * 0.08, 1);
  const paddedMin = Math.max(0, rawMin - valPad), paddedMax = rawMax + valPad;
  // Ticks "redondos" en vez de dividir el rango crudo en 4 (bug #9): antes
  // producía valores como 18K/16K/14K/11K/9K sin ningún patrón.
  const axisStep = _niceAxisStep(paddedMax - paddedMin || paddedMax || 1);
  const minV = Math.floor(paddedMin / axisStep) * axisStep;
  const maxV = Math.ceil(paddedMax / axisStep) * axisStep;
  const vRange = Math.max(maxV - minV, 1);
  const toX = (i) => pad.left + (i / Math.max(points.length - 1, 1)) * chartWidth;
  const toY = (v) => pad.top + chartHeight * (1 - (v - minV) / vRange);
  state.toX = toX; state.toY = toY; state.pad = pad; state.chartWidth = chartWidth;

  const up = values[values.length - 1] >= values[0];
  const lineColor = up ? "#32d6a2" : "#ff6b81";
  const gridColor = lightMode ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.07)";
  const axisColor = lightMode ? "rgba(23,32,51,0.48)" : "rgba(226,232,255,0.42)";

  ctx.font = "500 10px Inter, sans-serif";
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  for (let v = minV; v <= maxV + axisStep * 1e-6; v += axisStep) {
    const y = toY(v);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y);
    ctx.strokeStyle = gridColor; ctx.lineWidth = 1; ctx.setLineDash([4, 5]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = axisColor; ctx.fillText(formatCurrencyCompact(v, currency), pad.left - 10, y);
  }
  const labelIdx = [...new Set([0, Math.round((points.length - 1) * 0.25), Math.round((points.length - 1) * 0.5), Math.round((points.length - 1) * 0.75), points.length - 1])];
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  labelIdx.forEach((i) => {
    const d = new Date(points[i].date + "T12:00:00");
    ctx.fillStyle = axisColor;
    ctx.fillText(d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }), toX(i), height - pad.bottom + 10);
  });

  const grad = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
  grad.addColorStop(0, up ? "rgba(50,214,162,0.22)" : "rgba(255,107,129,0.20)");
  grad.addColorStop(1, up ? "rgba(50,214,162,0)" : "rgba(255,107,129,0)");
  ctx.beginPath();
  points.forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](toX(i), toY(p.value)));
  ctx.lineTo(toX(points.length - 1), height - pad.bottom);
  ctx.lineTo(toX(0), height - pad.bottom);
  ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

  ctx.beginPath();
  points.forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](toX(i), toY(p.value)));
  ctx.strokeStyle = lineColor; ctx.lineWidth = 2.4; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();

  // Serie de comparación (opcional): línea secundaria punteada, sin relleno.
  if (compare && compare.points && compare.points.length === points.length) {
    ctx.beginPath();
    let started = false;
    compare.points.forEach((p, i) => {
      if (!p || !isFinite(p.value)) return;
      if (!started) { ctx.moveTo(toX(i), toY(p.value)); started = true; }
      else ctx.lineTo(toX(i), toY(p.value));
    });
    ctx.strokeStyle = compare.color || "#8aa0ff";
    ctx.lineWidth = 1.8; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
    // Etiqueta de la serie de comparación
    ctx.font = "600 11px Inter, sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillStyle = compare.color || "#8aa0ff";
    ctx.fillText(compare.label || "", pad.left + 6, pad.top + 2);
  }

  if (hoverIndex !== null && points[hoverIndex]) {
    const x = toX(hoverIndex);
    ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, height - pad.bottom);
    ctx.strokeStyle = lightMode ? "rgba(15,23,42,0.22)" : "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x, toY(points[hoverIndex].value), 4, 0, Math.PI * 2);
    ctx.fillStyle = lineColor; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = lightMode ? "#ffffff" : "#0d0f17"; ctx.stroke();
  }
}

function setPortfolioValueHover(canvas, index) {
  const state = portfolioValueChartStates.get(canvas);
  if (!state) return;
  if (state.hoverIndex !== index) { state.hoverIndex = index; paintPortfolioValueChart(canvas); }
  const tip = document.getElementById("portfolioValueTooltip");
  if (!tip) return;
  if (index === null || !state.points[index]) { tip.classList.add("hidden"); return; }
  const p = state.points[index];
  tip.innerHTML = `<strong>${new Date(p.date + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</strong><span>${formatCurrency(p.value, state.currency)}</span>`;
  const x = state.toX(index);
  tip.style.left = `${Math.min(Math.max(x + 12, 12), state.width - 150)}px`;
  tip.style.top = `${Math.max(12, state.toY(p.value) - 16)}px`;
  tip.classList.remove("hidden");
}

function ensurePortfolioValueInteractions(canvas) {
  if (canvas.dataset.interactive === "true") return;
  canvas.dataset.interactive = "true";
  const upd = (e) => {
    const state = portfolioValueChartStates.get(canvas);
    if (!state || state.points.length < 2) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (state.width / rect.width);
    if (x < state.pad.left || x > state.width - state.pad.right) { setPortfolioValueHover(canvas, null); return; }
    const i = Math.max(0, Math.min(state.points.length - 1, Math.round((x - state.pad.left) / state.chartWidth * (state.points.length - 1))));
    setPortfolioValueHover(canvas, i);
  };
  canvas.addEventListener("pointerdown", upd);
  canvas.addEventListener("pointermove", upd);
  canvas.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch") setPortfolioValueHover(canvas, null); });
}

async function loadPerformanceTab(portfolio) {
  perfTabLoaded = true;
  const statusEl = document.getElementById("perfChartStatus");
  const canvas = document.getElementById("perfLineChart");
  const investmentCanvas = document.getElementById("investmentValueChart");
  const investmentStatus = document.getElementById("investmentValueStatus");
  const portfolioCur = portfolio.currency || "USD";
  if (investmentStatus) investmentStatus.textContent = "Calculando evolución del capital...";

  const activePeriodBtn = document.querySelector("#tabPanelDesempeno .perf-period-btn.active");
  const range = activePeriodBtn?.dataset.range || "1y";
  const interval = activePeriodBtn?.dataset.interval || "1d";

  // Refrescar TIIE 28 (Banxico) la primera vez en la sesión
  if (!perfRfrFetched) await fetchRiskFreeRate();
  updateSharpeRfrLabel();

  statusEl.textContent = "Calculando rendimiento histórico...";
  const twrResetEl = document.getElementById("twrValue");
  if (twrResetEl) { twrResetEl.textContent = "—"; twrResetEl.className = "perf-metric-value"; }
  document.getElementById("sharpeValue").textContent = "—";
  document.getElementById("volatilityValue").textContent = "—";
  document.getElementById("varValue").textContent = "—";
  document.getElementById("betaValue").textContent = "—";
  document.getElementById("maxDrawdownValue").textContent = "—";
  ["sortinoValue", "calmarValue", "alphaValue", "infoRatioValue", "captureValue"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) { el.textContent = "—"; el.className = "perf-metric-value"; }
  });

  const positions = portfolio.positions || [];
  renderAttributionChart(portfolio);
  const allPositions = buildAllPositionHistory(portfolio);
  if (!allPositions.length) {
    statusEl.textContent = "Agrega posiciones para ver el rendimiento.";
    drawInvestmentValueChart(investmentCanvas, [], portfolioCur);
    if (investmentStatus) investmentStatus.textContent = "Agrega posiciones para ver esta comparación.";
    return;
  }

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
    drawInvestmentValueChart(investmentCanvas, [], portfolioCur);
    if (investmentStatus) investmentStatus.textContent = "No se pudieron obtener datos históricos.";
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
    drawInvestmentValueChart(investmentCanvas, [], portfolioCur);
    if (investmentStatus) investmentStatus.textContent = "Fechas insuficientes para comparar valores.";
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

  // Tracking error: desviación estándar anualizada de la diferencia diaria (portafolio − benchmark)
  let trackingError = null;
  if (dailyBenchmarkReturns.length >= 2) {
    const nTE = Math.min(dailyPortfolioReturns.length, dailyBenchmarkReturns.length);
    const diff = [];
    for (let i = 0; i < nTE; i++) diff.push(dailyPortfolioReturns[i] - dailyBenchmarkReturns[i]);
    const mTE = diff.reduce((s, r) => s + r, 0) / nTE;
    const vTE = diff.reduce((s, r) => s + (r - mTE) ** 2, 0) / Math.max(1, nTE - 1);
    trackingError = Math.sqrt(vTE) * Math.sqrt(252) * 100;
  }
  document.getElementById("trackingErrorValue").textContent = trackingError !== null ? trackingError.toFixed(2) + "%" : "—";
  document.getElementById("trackingErrorLabel").textContent = `vs ${benchmarkLabel}`;

  // TWR (Time-Weighted Return): acumulado del periodo y, si abarca ~1 año o más, anualizado (L1.8)
  const twrEl = document.getElementById("twrValue");
  const twrSubEl = document.getElementById("twrSubLabel");
  if (twrEl) {
    const twrTotalPct = portfolioCumulative.length ? portfolioCumulative[portfolioCumulative.length - 1].value : null;
    if (twrTotalPct !== null && returnDates.length >= 2) {
      const firstD = new Date(returnDates[0]);
      const lastD = new Date(returnDates[returnDates.length - 1]);
      const years = (lastD - firstD) / (365.25 * 864e5);
      const twrTotal = twrTotalPct / 100;
      // Etiqueta del periodo activo (1M/3M/6M/1A/Máx) para no confundir el TWR
      // con el "Retorno total" (que es sobre costo, sin ventana de tiempo) (bug #9).
      const periodTag = activePeriodBtn?.textContent ? ` · ${activePeriodBtn.textContent}` : "";
      if (years >= 0.95 && twrTotal > -1) {
        const ann = Math.pow(1 + twrTotal, 1 / years) - 1;
        twrEl.textContent = (ann >= 0 ? "+" : "") + (ann * 100).toFixed(2) + "%";
        if (twrSubEl) twrSubEl.textContent = `Anualizado · ${twrTotalPct >= 0 ? "+" : ""}${twrTotalPct.toFixed(2)}% acum.${periodTag}`;
      } else {
        twrEl.textContent = (twrTotalPct >= 0 ? "+" : "") + twrTotalPct.toFixed(2) + "%";
        if (twrSubEl) twrSubEl.textContent = `Acumulado en el periodo${periodTag}`;
      }
      twrEl.className = "perf-metric-value " + (twrTotal >= 0 ? "return-pos" : "return-neg");
    } else {
      twrEl.textContent = "—";
      twrEl.className = "perf-metric-value";
      if (twrSubEl) twrSubEl.textContent = "Ponderado por tiempo";
    }
  }

  // ── #2/#6 Métricas adicionales: Sortino, Calmar, Alpha, Information Ratio, Captura ──
  const _nR = dailyPortfolioReturns.length;
  const _meanP = _nR ? dailyPortfolioReturns.reduce((s, r) => s + r, 0) / _nR : 0;
  const _dailyRfr = (perfRfr.rate / 100) / 252;
  const setMetricCard = (id, txt, signVal) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = txt;
    el.className = "perf-metric-value" + (signVal === null || signVal === undefined ? "" : (signVal >= 0 ? " return-pos" : " return-neg"));
  };

  // Sortino: exceso de retorno ÷ desviación a la baja (respecto a la tasa libre de riesgo)
  let sortino = null;
  {
    const downs = dailyPortfolioReturns.filter((r) => r < _dailyRfr);
    const dd = downs.length ? Math.sqrt(downs.reduce((s, r) => s + (r - _dailyRfr) ** 2, 0) / downs.length) : 0;
    sortino = dd > 0 ? (_meanP - _dailyRfr) / dd * Math.sqrt(252) : null;
  }
  setMetricCard("sortinoValue", sortino !== null ? sortino.toFixed(2) : "—", sortino);

  // Retorno anualizado del periodo (para Calmar)
  let annReturn = null;
  if (portfolioCumulative.length && returnDates.length >= 2) {
    const totPct = portfolioCumulative[portfolioCumulative.length - 1].value / 100;
    const yrs = (new Date(returnDates[returnDates.length - 1]) - new Date(returnDates[0])) / (365.25 * 864e5);
    if (yrs > 0.02 && totPct > -1) annReturn = Math.pow(1 + totPct, 1 / yrs) - 1;
  }
  // Calmar = retorno anualizado ÷ |Max Drawdown|
  let calmar = null;
  if (annReturn !== null && maxDD !== null && maxDD > 0) calmar = annReturn / (maxDD / 100);
  setMetricCard("calmarValue", calmar !== null ? calmar.toFixed(2) : "—", calmar);

  // Métricas relativas al benchmark (Alpha, IR, Captura)
  let alpha = null, infoRatio = null, upCapture = null, downCapture = null;
  const hasBench = dailyBenchmarkReturns.length >= 2;
  if (hasBench) {
    const nB = Math.min(_nR, dailyBenchmarkReturns.length);
    const pR = dailyPortfolioReturns.slice(-nB);
    const bR = dailyBenchmarkReturns.slice(-nB);
    const meanB = bR.reduce((s, r) => s + r, 0) / nB;
    // Alpha de Jensen anualizado: α = R̄ₚ − [Rƒ + β(R̄ₘ − Rƒ)]
    if (beta !== null) alpha = ((_meanP - _dailyRfr) - beta * (meanB - _dailyRfr)) * 252 * 100;
    // Information Ratio: retorno activo medio ÷ desviación del activo, anualizado
    const active = pR.map((r, i) => r - bR[i]);
    const meanAct = active.reduce((s, r) => s + r, 0) / nB;
    const stdAct = Math.sqrt(active.reduce((s, r) => s + (r - meanAct) ** 2, 0) / Math.max(1, nB - 1));
    infoRatio = stdAct > 0 ? meanAct / stdAct * Math.sqrt(252) : null;
    // Captura al alza / a la baja
    let upP = 0, upB = 0, upN = 0, dnP = 0, dnB = 0, dnN = 0;
    for (let i = 0; i < nB; i++) {
      if (bR[i] > 0) { upP += pR[i]; upB += bR[i]; upN++; }
      else if (bR[i] < 0) { dnP += pR[i]; dnB += bR[i]; dnN++; }
    }
    if (upN && upB !== 0) upCapture = (upP / upN) / (upB / upN) * 100;
    if (dnN && dnB !== 0) downCapture = (dnP / dnN) / (dnB / dnN) * 100;
  }
  setMetricCard("alphaValue", alpha !== null ? (alpha >= 0 ? "+" : "") + alpha.toFixed(2) + "%" : "—", alpha);
  const alphaLbl = document.getElementById("alphaLabel");
  if (alphaLbl) alphaLbl.textContent = hasBench ? `vs ${benchmarkLabel} · anualizado` : "Requiere benchmark";
  setMetricCard("infoRatioValue", infoRatio !== null ? infoRatio.toFixed(2) : "—", infoRatio);
  const irLbl = document.getElementById("infoRatioLabel");
  if (irLbl) irLbl.textContent = hasBench ? "Retorno activo ÷ Tracking Error" : "Requiere benchmark";
  const capEl = document.getElementById("captureValue");
  if (capEl) capEl.textContent = (upCapture !== null && downCapture !== null)
    ? `${upCapture.toFixed(0)}% / ${downCapture.toFixed(0)}%` : "—";
  const capLbl = document.getElementById("captureLabel");
  if (capLbl) capLbl.textContent = hasBench ? "Mercado al alza vs a la baja" : "Requiere benchmark";

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
    trackingError,
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
    sortino,
    calmar,
    annReturn,
    alpha,
    infoRatio,
    upCapture,
    downCapture,
    hasBench,
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
  const investmentValueSeries = buildInvestmentValueSeries(allPositions, commonDates, tickerDateMaps, portfolioCur);
  drawInvestmentValueChart(investmentCanvas, investmentValueSeries, portfolioCur);
  if (investmentStatus) investmentStatus.textContent = investmentValueSeries.length
    ? `${investmentValueSeries.length} sesiones · Valores expresados en ${portfolioCur}`
    : "Sin datos históricos suficientes para comparar valores.";
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

// ── Metas financieras (#6) ────────────────────────────────────────────────
// Reutiliza el motor Monte Carlo (runMonteCarlo + computeDailyReturnsForMC) para
// estimar la probabilidad de alcanzar una meta y el aporte mensual requerido.
let _goalsWired = false;

function initGoalsTab(portfolio) {
  goalTabLoaded = true;
  const goal = portfolio.goal || null;

  // Poblar el formulario con la meta guardada (si existe)
  const nameEl = document.getElementById("goalName");
  const targetEl = document.getElementById("goalTarget");
  const yearsEl = document.getElementById("goalYears");
  const monthlyEl = document.getElementById("goalMonthly");
  const inflEl = document.getElementById("goalInflEnabled");
  const clearBtn = document.getElementById("goalClearBtn");

  if (goal) {
    nameEl.value = goal.name || "";
    targetEl.value = goal.target ?? "";
    yearsEl.value = goal.years ?? 10;
    monthlyEl.value = goal.monthly ?? 0;
    inflEl.checked = !!goal.inflation;
    clearBtn.style.display = "";
  } else {
    nameEl.value = ""; targetEl.value = ""; yearsEl.value = 10;
    monthlyEl.value = 0; inflEl.checked = false;
    clearBtn.style.display = "none";
  }

  // Conectar los handlers una sola vez
  if (!_goalsWired) {
    _goalsWired = true;
    document.getElementById("goalForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const p = getPortfolios().find((pp) => pp.id === activePortfolioId);
      if (p) renderGoalsTab(p, { save: true });
    });
    clearBtn.addEventListener("click", () => {
      const p = getPortfolios().find((pp) => pp.id === activePortfolioId);
      if (!p) return;
      delete p.goal;
      savePortfolios(getPortfolios());
      document.getElementById("goalForm").reset();
      document.getElementById("goalYears").value = 10;
      document.getElementById("goalResult").style.display = "none";
      document.getElementById("goalEmptyState").style.display = "";
      document.getElementById("goalStatus").textContent = "";
      clearBtn.style.display = "none";
    });
  }

  // Si ya hay meta guardada, calcular automáticamente al abrir
  if (goal && goal.target > 0) {
    renderGoalsTab(portfolio, { save: false });
  } else {
    document.getElementById("goalResult").style.display = "none";
    document.getElementById("goalEmptyState").style.display = "";
  }
}

// Aporte mensual requerido (anualidad: FV = PV·(1+i)^n + PMT·[((1+i)^n−1)/i])
function requiredMonthlyContribution(initVal, target, years, annualReturn) {
  const n = Math.max(1, Math.round(years * 12));
  const i = Math.pow(1 + annualReturn, 1 / 12) - 1;
  const fvInitial = initVal * Math.pow(1 + i, n);
  const remaining = target - fvInitial;
  if (remaining <= 0) return 0; // el capital inicial solo ya basta
  if (Math.abs(i) < 1e-9) return remaining / n;
  return (remaining * i) / (Math.pow(1 + i, n) - 1);
}

async function renderGoalsTab(portfolio, { save } = { save: false }) {
  const statusEl = document.getElementById("goalStatus");
  const resultEl = document.getElementById("goalResult");
  const emptyEl = document.getElementById("goalEmptyState");
  const clearBtn = document.getElementById("goalClearBtn");

  const name = (document.getElementById("goalName").value || "").trim();
  const target = parseFloat(document.getElementById("goalTarget").value);
  const years = Math.max(1, Math.min(40, parseInt(document.getElementById("goalYears").value, 10) || 10));
  const monthly = parseFloat(document.getElementById("goalMonthly").value) || 0;
  const inflation = document.getElementById("goalInflEnabled").checked;

  if (!isFinite(target) || target <= 0) {
    statusEl.textContent = "Ingresa un monto objetivo válido.";
    return;
  }

  // Persistir la meta en el portafolio
  if (save) {
    portfolio.goal = { name, target, years, monthly, inflation };
    savePortfolios(getPortfolios());
    clearBtn.style.display = "";
  }

  emptyEl.style.display = "none";
  resultEl.style.display = "none";
  statusEl.innerHTML = `<span class="inline-spinner"></span> Calculando probabilidad…`;

  const cur = portfolio.currency || "USD";
  const dailyReturns = await computeDailyReturnsForMC(portfolio, "2y");
  if (!dailyReturns || dailyReturns.length < 20) {
    statusEl.textContent = "Datos históricos insuficientes. Agrega posiciones con histórico de precios.";
    return;
  }

  const initVal = (_lastPortfolioCurrentValue && _lastPortfolioCurrentValue > 0)
    ? _lastPortfolioCurrentValue
    : calcPortfolioTotals(portfolio.positions || [], cur).totalInvested;

  if (initVal <= 0) {
    statusEl.textContent = "El portafolio no tiene valor actual. Agrega posiciones primero.";
    return;
  }

  const inflRate = inflation ? 0.035 : 0;
  const sim = runMonteCarlo(dailyReturns, initVal, years, {
    numSims: 4000, contribution: monthly, model: "gbm", inflationRate: inflRate, goal: target,
  });

  // Probabilidad de alcanzar la meta desde la distribución simulada
  let goalCount = 0;
  for (let k = 0; k < sim.finals.length; k++) if (sim.finals[k] >= target) goalCount++;
  const prob = Math.round((goalCount / sim.finals.length) * 100);

  // Retorno anual (real si se ajusta por inflación) para el aporte requerido
  const nominalAnnual = Math.exp(sim.mu * 252) - 1;
  const annualForCalc = inflation ? (1 + nominalAnnual) / (1 + inflRate) - 1 : nominalAnnual;
  const reqMonthly = requiredMonthlyContribution(initVal, target, years, annualForCalc);

  const median = sim.bands[3][sim.steps];
  const progressPct = Math.min(100, Math.max(0, (initVal / target) * 100));

  // ── Render tarjeta de progreso ──
  document.getElementById("goalProgressName").textContent = name || "Tu meta";
  document.getElementById("goalProgressCurrent").textContent = formatCurrency(initVal, cur);
  document.getElementById("goalProgressTarget").textContent = `de ${formatCurrency(target, cur)}`;
  document.getElementById("goalProgressFill").style.width = progressPct.toFixed(1) + "%";

  const probValEl = document.getElementById("goalProbValue");
  probValEl.textContent = prob + "%";
  const badge = document.getElementById("goalProbBadge");
  badge.classList.remove("is-high", "is-mid", "is-low");
  badge.classList.add(prob >= 70 ? "is-high" : prob >= 40 ? "is-mid" : "is-low");

  const metaBits = [`${progressPct.toFixed(0)}% del objetivo ya cubierto con tu valor actual`];
  if (monthly > 0) metaBits.push(`aportando ${formatCurrency(monthly, cur)}/mes durante ${years} año${years > 1 ? "s" : ""}`);
  document.getElementById("goalProgressMeta").textContent = metaBits.join(" · ");

  // ── Tarjetas de estadísticas ──
  const cards = [
    { label: "Probabilidad de lograrla", value: prob + "%", sub: inflation ? "en poder adquisitivo de hoy" : `en ${years} año${years > 1 ? "s" : ""}`, cls: prob >= 50 ? "pos" : "neg" },
    { label: "Proyección mediana", value: formatCurrency(median, cur), sub: median >= target ? "supera la meta" : "por debajo de la meta", cls: median >= target ? "pos" : "neg" },
  ];

  if (reqMonthly <= 0) {
    cards.push({ label: "Aporte mensual requerido", value: formatCurrency(0, cur), sub: "tu capital actual ya alcanza la meta", cls: "pos" });
  } else {
    const delta = reqMonthly - monthly;
    cards.push({
      label: "Aporte mensual requerido",
      value: formatCurrency(reqMonthly, cur),
      sub: monthly > 0 && delta > 1 ? `${formatCurrency(delta, cur)} más que tu aporte actual` : "para llegar en el horizonte fijado",
      cls: delta <= 1 ? "pos" : "neg",
    });
  }
  cards.push({ label: "Faltante hoy", value: formatCurrency(Math.max(0, target - initVal), cur), sub: `meta: ${formatCurrencyCompact(target, cur)}`, cls: "" });

  document.getElementById("goalStatsGrid").innerHTML = cards.map((c) => `
    <div class="mc-stat-card">
      <div class="mc-stat-label">${c.label}</div>
      <div class="mc-stat-value ${c.cls}">${c.value}</div>
      <div class="mc-stat-sub">${c.sub}</div>
    </div>
  `).join("");

  resultEl.style.display = "";
  statusEl.textContent = save ? "Meta guardada ✓" : "";
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

  if (metric === "twr") {
    return {
      title: "Retorno TWR (Time-Weighted) — Cálculo",
      body: `
        <div class="perf-info-formula">TWR = ∏(1 + rₜ) − 1 ; anualizado = (1 + TWR)^(1/años) − 1</div>
        <p class="perf-info-note">El retorno ponderado por tiempo encadena los retornos diarios del portafolio (con pesos por costo y posiciones vendidas aportando 0% tras su venta), eliminando el efecto del momento y tamaño de tus aportes. Es la métrica estándar para comparar contra un benchmark.</p>
        <p class="perf-info-note">A diferencia del XIRR (ponderado por dinero), el TWR responde "¿qué tan bien se comportó la estrategia?" en lugar de "¿cuánto gané yo según cuándo aporté?". Si el periodo abarca ~1 año o más se muestra anualizado; si es menor, se muestra el acumulado del periodo.</p>
      `
    };
  }

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

  if (metric === "trackingerror") {
    return {
      title: "Tracking Error — Cálculo",
      body: `
        <div class="perf-info-formula">TE = σ(r_port − r_bench) × √252 × 100</div>
        <div class="perf-info-values">
          <div class="perf-info-row"><span class="perf-info-row-label">Benchmark</span><span class="perf-info-row-val">${d.benchmarkLabel}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Observaciones (días)</span><span class="perf-info-row-val">${d.n}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Factor de anualización</span><span class="perf-info-row-val">√252</span></div>
        </div>
        <div class="perf-info-formula">Algoritmo:
  dₜ = r_portₜ − r_benchₜ
  σ = desviación estándar muestral de dₜ
  TE = σ × √252 × 100</div>
        <div class="perf-info-result">Tracking Error = ${d.trackingError !== null && d.trackingError !== undefined ? d.trackingError.toFixed(2) + "%" : "—"}</div>
        <p class="perf-info-note">Mide qué tan de cerca sigue el portafolio a su benchmark: es la volatilidad anualizada de la diferencia de retornos diarios. Un valor bajo indica seguimiento estrecho; uno alto, una gestión más activa que se aparta del índice. Requiere un benchmark configurado en Ajustes.</p>
      `
    };
  }

  if (metric === "sortino") {
    return {
      title: "Sortino Ratio — Cálculo",
      body: `
        <div class="perf-info-formula">Sortino = (R̄ₚ − Rƒ) / σ_downside × √252</div>
        <div class="perf-info-values">
          <div class="perf-info-row"><span class="perf-info-row-label">Retorno diario promedio (R̄ₚ)</span><span class="perf-info-row-val">${pct(d.mean, 4)}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Tasa libre de riesgo diaria (Rƒ)</span><span class="perf-info-row-val">${pct(d.daily_rfr, 4)}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Observaciones (días)</span><span class="perf-info-row-val">${d.n}</span></div>
        </div>
        <div class="perf-info-result">Sortino Ratio = ${d.sortino !== null && d.sortino !== undefined ? d.sortino.toFixed(2) : "—"}</div>
        <p class="perf-info-note">Igual que el Sharpe, pero penaliza solo la volatilidad <strong>a la baja</strong> (retornos por debajo de la tasa libre de riesgo), ignorando las subidas. Es más justo para portafolios con retornos asimétricos: un Sortino más alto que el Sharpe indica que la volatilidad proviene sobre todo de movimientos al alza.</p>
      `
    };
  }

  if (metric === "calmar") {
    return {
      title: "Calmar Ratio — Cálculo",
      body: `
        <div class="perf-info-formula">Calmar = Retorno anualizado / |Max Drawdown|</div>
        <div class="perf-info-values">
          <div class="perf-info-row"><span class="perf-info-row-label">Retorno anualizado del periodo</span><span class="perf-info-row-val">${d.annReturn !== null && d.annReturn !== undefined ? (d.annReturn * 100).toFixed(2) + "%" : "—"}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Max Drawdown</span><span class="perf-info-row-val">${d.maxDD !== null ? "-" + d.maxDD.toFixed(2) + "%" : "—"}</span></div>
        </div>
        <div class="perf-info-result">Calmar Ratio = ${d.calmar !== null && d.calmar !== undefined ? d.calmar.toFixed(2) : "—"}</div>
        <p class="perf-info-note">Mide el retorno obtenido por cada unidad de la peor caída sufrida. Un Calmar &gt; 1 es sólido; cuanto más alto, mejor recompensa el portafolio el riesgo de caída máxima. Muy usado para estrategias donde importa el dolor de las pérdidas, no solo la volatilidad.</p>
      `
    };
  }

  if (metric === "alpha") {
    return {
      title: "Alpha de Jensen — Cálculo",
      body: `
        <div class="perf-info-formula">α = R̄ₚ − [Rƒ + β·(R̄ₘ − Rƒ)] (anualizado)</div>
        <div class="perf-info-values">
          <div class="perf-info-row"><span class="perf-info-row-label">Benchmark</span><span class="perf-info-row-val">${d.benchmarkLabel}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Beta (regresión)</span><span class="perf-info-row-val">${d.beta !== null ? d.beta.toFixed(4) : "—"}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Observaciones (días)</span><span class="perf-info-row-val">${d.n}</span></div>
        </div>
        <div class="perf-info-result">Alpha anualizada = ${d.alpha !== null && d.alpha !== undefined ? (d.alpha >= 0 ? "+" : "") + d.alpha.toFixed(2) + "%" : "—"}</div>
        <p class="perf-info-note">El exceso de retorno del portafolio por encima de lo que "debería" rendir según su beta y el comportamiento del mercado. Alpha positiva = valor añadido frente a simplemente replicar el índice con el mismo riesgo sistemático. ${d.hasBench ? "" : "Requiere un benchmark configurado en el portafolio."}</p>
      `
    };
  }

  if (metric === "inforatio") {
    return {
      title: "Information Ratio — Cálculo",
      body: `
        <div class="perf-info-formula">IR = (R̄ₚ − R̄ₘ) / σ(Rₚ − Rₘ) × √252</div>
        <div class="perf-info-values">
          <div class="perf-info-row"><span class="perf-info-row-label">Benchmark</span><span class="perf-info-row-val">${d.benchmarkLabel}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Tracking Error</span><span class="perf-info-row-val">${d.trackingError !== null && d.trackingError !== undefined ? d.trackingError.toFixed(2) + "%" : "—"}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Observaciones (días)</span><span class="perf-info-row-val">${d.n}</span></div>
        </div>
        <div class="perf-info-result">Information Ratio = ${d.infoRatio !== null && d.infoRatio !== undefined ? d.infoRatio.toFixed(2) : "—"}</div>
        <p class="perf-info-note">Retorno activo (por encima del benchmark) por cada unidad de riesgo activo (tracking error). Responde: ¿la desviación respecto al índice está siendo recompensada? IR &gt; 0.5 es bueno; &gt; 1 es excelente y raro. ${d.hasBench ? "" : "Requiere un benchmark configurado."}</p>
      `
    };
  }

  if (metric === "capture") {
    return {
      title: "Captura al alza / a la baja — Cálculo",
      body: `
        <div class="perf-info-formula">Captura ↑ = R̄ₚ(días ↑) / R̄ₘ(días ↑) · Captura ↓ = R̄ₚ(días ↓) / R̄ₘ(días ↓)</div>
        <div class="perf-info-values">
          <div class="perf-info-row"><span class="perf-info-row-label">Benchmark</span><span class="perf-info-row-val">${d.benchmarkLabel}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Captura al alza</span><span class="perf-info-row-val">${d.upCapture !== null && d.upCapture !== undefined ? d.upCapture.toFixed(1) + "%" : "—"}</span></div>
          <div class="perf-info-row"><span class="perf-info-row-label">Captura a la baja</span><span class="perf-info-row-val">${d.downCapture !== null && d.downCapture !== undefined ? d.downCapture.toFixed(1) + "%" : "—"}</span></div>
        </div>
        <p class="perf-info-note">Compara cómo se mueve tu portafolio los días que el mercado sube vs los días que baja. Lo ideal: captura al alza &gt; 100% (subes más que el índice) y captura a la baja &lt; 100% (caes menos). Una captura a la baja de 70% significa que cuando el mercado cae 1%, tú caes ~0.7%. ${d.hasBench ? "" : "Requiere un benchmark configurado."}</p>
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
// ── Códigos de respaldo 2FA: render + acciones (copiar / descargar) ──────────
function _bpRenderBackupCodes(codes, gridEl) {
  if (!gridEl) return;
  gridEl.innerHTML = "";
  (codes || []).forEach(c => {
    const span = document.createElement("span");
    span.className = "backup-code-chip";
    span.textContent = c;
    gridEl.appendChild(span);
  });
}

function _bpWireBackupActions(codes, copyBtn, downloadBtn) {
  if (copyBtn) copyBtn.onclick = async () => {
    try { await navigator.clipboard.writeText((codes || []).join("\n")); copyBtn.textContent = "✓ Copiado"; }
    catch { copyBtn.textContent = "No se pudo copiar"; }
    setTimeout(() => { copyBtn.textContent = "Copiar"; }, 1500);
  };
  if (downloadBtn) downloadBtn.onclick = () => {
    const text = "BlackPortfolio · Códigos de respaldo 2FA\n"
      + "Cada código sirve UNA sola vez. Guárdalos en un lugar seguro.\n\n"
      + (codes || []).join("\n") + "\n";
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "blackportfolio-codigos-respaldo.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  };
}

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
      let remainingNote = "";
      try {
        const st = await window.BlackPortfolioAuth.getTwoFactorStatus();
        if (typeof st.backupCodesRemaining === "number") {
          const n = st.backupCodesRemaining;
          const warn = n <= 2;
          remainingNote = `<div style="margin-top:8px;font-size:0.82rem;color:${warn ? "var(--warning)" : "var(--muted)"}">`
            + `Códigos de respaldo disponibles: <strong>${n}</strong>`
            + (warn ? " — te quedan pocos, conviene regenerarlos." : "")
            + `</div>`;
        }
      } catch {}
      statusEl.innerHTML = '<span style="color:var(--success)">● Activo</span> — Tu cuenta está protegida con Google Authenticator.' + remainingNote;
      actionsEl.innerHTML =
        '<button id="regenBackupBtn" class="button secondary" type="button">Regenerar códigos de respaldo</button>'
        + '<button id="disable2FABtn" class="button secondary" type="button" style="color:#ff8ca4;border-color:#ff8ca4">Desactivar 2FA</button>';
      document.getElementById("disable2FABtn").addEventListener("click", openDisableModal);
      document.getElementById("regenBackupBtn").addEventListener("click", openRegenModal);
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
        const backupView = document.getElementById("mainTotpBackupView");
        if (backupView && (result.backupCodes || []).length) {
          _bpRenderBackupCodes(result.backupCodes, document.getElementById("mainTotpBackupCodes"));
          _bpWireBackupActions(
            result.backupCodes,
            document.getElementById("mainTotpBackupCopy"),
            document.getElementById("mainTotpBackupDownload"),
          );
          content.classList.add("hidden");
          backupView.classList.remove("hidden");
          document.getElementById("mainTotpBackupDone").onclick = () => {
            modal.classList.add("hidden");
            backupView.classList.add("hidden");
            content.classList.remove("hidden");
            refresh2FAStatus();
            window.BlackPortfolioRefreshSettings?.();
          };
        } else {
          msg.textContent = "✓ 2FA activado correctamente.";
          msg.className = "totp-setup-msg form-message success";
          setTimeout(() => { modal.classList.add("hidden"); refresh2FAStatus(); window.BlackPortfolioRefreshSettings?.(); }, 1200);
        }
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
        setTimeout(() => { modal.classList.add("hidden"); refresh2FAStatus(); window.BlackPortfolioRefreshSettings?.(); }, 1000);
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

  function openRegenModal() {
    const modal      = document.getElementById("mainBackupRegenModal");
    const formView   = document.getElementById("mainBackupRegenForm");
    const resultView = document.getElementById("mainBackupRegenResult");
    const grid       = document.getElementById("mainBackupRegenOtpGrid");
    const confirmBtn = document.getElementById("mainBackupRegenConfirm");
    const cancelBtn  = document.getElementById("mainBackupRegenCancel");
    const msg        = document.getElementById("mainBackupRegenMsg");
    const boxes      = Array.from(grid.querySelectorAll(".otp-box"));

    boxes.forEach(b => { b.value = ""; b.classList.remove("otp-box--complete", "otp-box--error"); });
    msg.textContent = "";
    msg.className = "totp-setup-msg";
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Generar nuevos";
    formView.classList.remove("hidden");
    resultView.classList.add("hidden");
    modal.classList.remove("hidden");

    makeOtpBoxListeners(boxes,
      () => { confirmBtn.disabled = !boxes.every(b => b.value !== ""); },
      () => { msg.textContent = ""; msg.className = "totp-setup-msg"; boxes.forEach(b => b.classList.remove("otp-box--error")); }
    );

    confirmBtn.onclick = async () => {
      const code = boxes.map(b => b.value).join("");
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Generando…";

      const result = await window.BlackPortfolioAuth.regenerateBackupCodes(code);
      if (result.ok) {
        _bpRenderBackupCodes(result.backupCodes, document.getElementById("mainBackupRegenCodes"));
        _bpWireBackupActions(
          result.backupCodes,
          document.getElementById("mainBackupRegenCopy"),
          document.getElementById("mainBackupRegenDownload"),
        );
        formView.classList.add("hidden");
        resultView.classList.remove("hidden");
        document.getElementById("mainBackupRegenDone").onclick = () => {
          modal.classList.add("hidden");
          refresh2FAStatus();
        };
        return;
      }
      msg.textContent = result.error || "Código incorrecto.";
      msg.className = "totp-setup-msg form-message error";
      boxes.forEach(b => { b.value = ""; b.classList.add("otp-box--error"); });
      confirmBtn.textContent = "Generar nuevos";
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
    // Legacy: el Hub usaba una clave global compartida entre cuentas del mismo
    // navegador. La eliminamos para que cada usuario arranque con su propio estado.
    try { localStorage.removeItem("blackportfolio-hub-state"); } catch {}
    try {
      const raw = localStorage.getItem(getHubStorageKey());
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
        localStorage.setItem(getHubStorageKey(), JSON.stringify(state));
        return true;
      }
      return false;
    } catch (_) { return false; }
  }
  function saveHubState() {
    localStorage.setItem(getHubStorageKey(), JSON.stringify(state));
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
      portfolio: { w: 340, h: 320, title: "Resumen de cartera", config: { portfolioId: null } },
      risk:      { w: 380, h: 340, title: "Riesgo de cartera", config: { portfolioId: null } },
      dividends: { w: 380, h: 360, title: "Dividendos y flujo", config: { portfolioId: null } },
      sentiment: { w: 420, h: 360, title: "Noticias y sentimiento", config: { source: "auto" } },
      macro:     { w: 420, h: 360, title: "Mapa macro", config: { symbols: ["^VIX", "DX-Y.NYB", "^TNX", "CL=F", "GC=F", "MXN=X"] } }
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
    [
      { direction: -1, label: "Subir widget", icon: "↑" },
      { direction: 1, label: "Bajar widget", icon: "↓" }
    ].forEach(({ direction, label, icon }) => {
      const orderBtn = mkBtn(icon, label);
      orderBtn.classList.add("hub-mobile-order-btn");
      orderBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        const widgets = activeSpace().widgets;
        const index = widgets.findIndex((item) => item.id === widget.id);
        const nextIndex = index + direction;
        if (index < 0 || nextIndex < 0 || nextIndex >= widgets.length) return;
        [widgets[index], widgets[nextIndex]] = [widgets[nextIndex], widgets[index]];
        saveHubState();
        renderAll();
      });
      controls.appendChild(orderBtn);
    });
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
    b.setAttribute("aria-label", title);
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
    if (widget.type === "risk") return renderRiskWidget(widget, body, ref);
    if (widget.type === "dividends") return renderDividendsWidget(widget, body, ref);
    if (widget.type === "sentiment") return renderSentimentWidget(widget, body, ref);
    if (widget.type === "macro") return renderMacroWidget(widget, body, ref);
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

    const inputWrap = document.createElement("div");
    inputWrap.className = "hw-wl-input-wrap";
    const suggestionsEl = document.createElement("div");
    suggestionsEl.className = "hw-ticker-suggestions hidden";
    suggestionsEl.style.cssText = "position:absolute;top:calc(100% + 4px);left:0;right:0;max-height:220px;overflow-y:auto;background:rgba(10,10,12,0.98);border:1px solid rgba(255,255,255,0.1);border-radius:10px;z-index:9999;padding:4px;";
    inputWrap.appendChild(inp);
    inputWrap.appendChild(suggestionsEl);

    const addBtn = document.createElement("button");
    addBtn.type = "button"; addBtn.textContent = "+";
    addBtn.className = "hw-wl-add-btn";

    const cfgBtn = document.createElement("button");
    cfgBtn.type = "button"; cfgBtn.className = "hw-wl-cfg-btn";
    cfgBtn.title = "Configurar columnas";
    cfgBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

    toolbar.appendChild(inputWrap);
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
    let hwSuggestDebounce = null;
    let hwSuggestAbort = null;

    function hideSuggestions() {
      suggestionsEl.innerHTML = "";
      suggestionsEl.classList.add("hidden");
    }

    function addSym(symbol, name) {
      const raw = typeof symbol === "string" ? symbol : inp.value;
      const s = raw.trim().toUpperCase();
      if (!s) return;
      if (!widget.config.symbols.includes(s)) {
        widget.config.symbols.push(s);
        if (name) cache[s] = { ...(cache[s] || {}), name };
        saveHubState();
        fetchPrices();
      }
      inp.value = "";
      hideSuggestions();
    }

    function showSuggestions(items) {
      if (!items.length) { hideSuggestions(); return; }
      suggestionsEl.innerHTML = items.map(item => `
        <button type="button" data-symbol="${item.symbol}" data-name="${item.name.replace(/"/g, '&quot;')}"
          style="width:100%;display:flex;align-items:center;gap:8px;text-align:left;padding:6px 10px;border-radius:8px;background:transparent;border:none;color:inherit;cursor:pointer;font-size:11px;">
          <div style="flex:0 0 auto;width:24px;height:24px;border-radius:50%;background:rgba(111,134,255,0.2);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#6f86ff;">${item.symbol.slice(0, 2)}</div>
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
          addSym(btn.dataset.symbol, btn.dataset.name);
        });
        btn.addEventListener("mouseover", () => { btn.style.background = "rgba(111,134,255,0.1)"; });
        btn.addEventListener("mouseout", () => { btn.style.background = "transparent"; });
      });
    }
    addBtn.addEventListener("click", addSym);
    inp.addEventListener("input", () => {
      const q = inp.value.trim();
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
    inp.addEventListener("keydown", e => {
      if (e.key === "Enter") addSym();
      if (e.key === "Escape") hideSuggestions();
    });
    inp.addEventListener("blur", () => { setTimeout(hideSuggestions, 150); });
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
    ref.cleanup = () => {
      clearInterval(interval);
      if (hwSuggestDebounce) clearTimeout(hwSuggestDebounce);
      if (hwSuggestAbort) hwSuggestAbort.abort();
    };
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
    statusEl.style.cssText = "font-size:10px;opacity:0.6;margin-left:auto;white-space:nowrap;display:inline-flex;align-items:center;";
    const HEAT_LOADING = '<span class="inline-spinner" style="width:9px;height:9px;border-width:2px;margin-right:5px;vertical-align:0"></span>Cargando…';
    statusEl.innerHTML = HEAT_LOADING;

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
      statusEl.innerHTML = HEAT_LOADING;
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

  function hubEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function hubPct(value, digits = 1) {
    if (!Number.isFinite(value)) return "--";
    return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
  }

  function hubPopulatePortfolioSelect(sel, widget) {
    const portfolios = getPortfolios();
    sel.innerHTML = portfolios.length
      ? portfolios.map(p => `<option value="${hubEscape(p.id)}">${hubEscape(p.name)}</option>`).join("")
      : `<option value="">Sin portafolios</option>`;
    if (widget.config.portfolioId && portfolios.find(p => p.id === widget.config.portfolioId)) {
      sel.value = widget.config.portfolioId;
    } else if (portfolios.length) {
      sel.value = portfolios[0].id;
      widget.config.portfolioId = portfolios[0].id;
      saveHubState();
    }
    return portfolios;
  }

  function hubPositionValue(pos, portfolioCurrency) {
    const qty = pos.quantity || 0;
    const price = getCachedPrice(pos.ticker);
    const posCur = getPosCurrency(pos, portfolioCurrency);
    const value = price !== null ? price * qty : calcPositionTotals(pos).total;
    return convertAmount(value, posCur, portfolioCurrency) ?? value;
  }

  function hubPortfolioRows(portfolio) {
    const currency = portfolio?.currency || "USD";
    return (portfolio?.positions || []).map((pos, index) => ({
      pos,
      ticker: String(pos.ticker || "").toUpperCase(),
      value: hubPositionValue(pos, currency),
      color: CHART_COLORS[index % CHART_COLORS.length],
      price: getCachedPrice(pos.ticker),
      prev: getCachedPrev(pos.ticker)
    }));
  }

  async function hubRefreshPortfolioPrices(portfolio) {
    if (!portfolio?.positions?.length) return;
    const tickers = [...new Set(portfolio.positions.map(p => p.ticker).filter(Boolean))];
    const currencies = portfolio.positions.map(p => getPosCurrency(p, portfolio.currency || "USD"));
    await Promise.all([fetchPricesBatch(tickers), fetchExchangeRates(currencies, portfolio.currency || "USD")]);
  }

  function hubRenderEmpty(body, message) {
    body.innerHTML = `<div class="hw-insight-empty">${hubEscape(message)}</div>`;
  }

  function renderRiskWidget(widget, body, ref) {
    if (!widget.config) widget.config = {};
    body.classList.add("hw-insight-body");
    body.innerHTML = `
      <div class="hw-insight-toolbar">
        <select class="hw-insight-select" aria-label="Portafolio"></select>
      </div>
      <div class="hw-risk-score">
        <div><span>Nivel de riesgo</span><strong id="hwr-score-${widget.id}">--</strong></div>
        <em id="hwr-label-${widget.id}">Calculando</em>
      </div>
      <div class="hw-risk-grid" id="hwr-grid-${widget.id}"></div>
      <div class="hw-risk-bars" id="hwr-bars-${widget.id}"></div>`;

    const sel = body.querySelector("select");
    sel.addEventListener("mousedown", e => e.stopPropagation());
    sel.addEventListener("change", () => {
      widget.config.portfolioId = sel.value || null;
      saveHubState();
      renderData();
    });

    function renderData() {
      const portfolios = hubPopulatePortfolioSelect(sel, widget);
      const portfolio = portfolios.find(p => p.id === widget.config.portfolioId);
      const scoreEl = document.getElementById(`hwr-score-${widget.id}`);
      const labelEl = document.getElementById(`hwr-label-${widget.id}`);
      const gridEl = document.getElementById(`hwr-grid-${widget.id}`);
      const barsEl = document.getElementById(`hwr-bars-${widget.id}`);
      if (!portfolio) {
        if (scoreEl) scoreEl.textContent = "--";
        if (labelEl) labelEl.textContent = "Sin cartera";
        if (gridEl) gridEl.innerHTML = "";
        if (barsEl) barsEl.innerHTML = `<div class="hw-insight-empty">Agrega un portafolio para medir riesgo.</div>`;
        return;
      }

      const rows = hubPortfolioRows(portfolio).filter(r => r.value > 0);
      const total = rows.reduce((sum, r) => sum + r.value, 0) + (portfolio.cashBalance || 0);
      const top = rows.reduce((max, r) => r.value > max.value ? r : max, { value: 0, ticker: "--" });
      const topWeight = total > 0 ? top.value / total : 0;
      const missing = rows.filter(r => r.price === null).length;
      const weightedMove = rows.reduce((sum, r) => {
        if (!r.price || !r.prev || r.prev <= 0 || total <= 0) return sum;
        return sum + Math.abs((r.price - r.prev) / r.prev) * (r.value / total);
      }, 0);
      const diversificationPenalty = Math.max(0, 8 - rows.length) * 5;
      const concentrationPenalty = Math.max(0, topWeight - 0.25) * 120;
      const pricePenalty = rows.length ? (missing / rows.length) * 15 : 10;
      const movePenalty = Math.min(25, weightedMove * 250);
      const score = Math.max(0, Math.round(100 - diversificationPenalty - concentrationPenalty - pricePenalty - movePenalty));
      const label = score >= 75 ? "Controlado" : score >= 55 ? "Moderado" : "Alto";

      if (scoreEl) scoreEl.textContent = `${score}/100`;
      if (labelEl) {
        labelEl.textContent = label;
        labelEl.className = score >= 75 ? "ok" : score >= 55 ? "warn" : "bad";
      }
      if (gridEl) {
        gridEl.innerHTML = `
          <div><span>Mayor posicion</span><strong>${hubEscape(top.ticker)}</strong><small>${(topWeight * 100).toFixed(1)}%</small></div>
          <div><span>Activos</span><strong>${rows.length}</strong><small>${missing ? `${missing} sin precio` : "precios listos"}</small></div>
          <div><span>Volatilidad proxy</span><strong>${(weightedMove * 100).toFixed(2)}%</strong><small>mov. ponderado dia</small></div>`;
      }
      if (barsEl) {
        barsEl.innerHTML = rows
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)
          .map(r => {
            const pct = total > 0 ? r.value / total * 100 : 0;
            return `<div class="hw-risk-bar-row"><span>${hubEscape(r.ticker)}</span><div><i style="width:${Math.min(100, pct)}%;background:${r.color}"></i></div><strong>${pct.toFixed(1)}%</strong></div>`;
          }).join("") || `<div class="hw-insight-empty">Sin posiciones.</div>`;
      }
    }

    async function refresh() {
      const portfolio = getPortfolios().find(p => p.id === widget.config.portfolioId);
      await hubRefreshPortfolioPrices(portfolio);
      renderData();
    }
    ref.refresh = refresh;
    renderData();
    refresh();
  }

  const HUB_DIVIDEND_YIELDS = {
    AAPL: 0.005, MSFT: 0.007, NVDA: 0.001, QQQ: 0.006, SPY: 0.013, VOO: 0.013,
    KO: 0.031, PEP: 0.029, PG: 0.024, JNJ: 0.03, PFE: 0.055, T: 0.06,
    VZ: 0.065, JPM: 0.024, BAC: 0.026, XOM: 0.032, CVX: 0.041, WMT: 0.011,
    COST: 0.006, "GFNORTEO.MX": 0.045, "WALMEX.MX": 0.018, "FEMSAUBD.MX": 0.017,
    "BIMBOA.MX": 0.015, "CEMEXCPO.MX": 0.006
  };
  const HUB_SECTOR_YIELDS = {
    "Finanzas": 0.025, "Energia": 0.035, "Consumo basico": 0.018,
    "Consumo bÃ¡sico": 0.018, "Salud": 0.022, "TecnologÃ­a": 0.006, "Tecnologia": 0.006
  };

  function hubDividendYield(ticker) {
    const t = String(ticker || "").toUpperCase();
    if (HUB_DIVIDEND_YIELDS[t] != null) return HUB_DIVIDEND_YIELDS[t];
    const sector = SECTOR_MAP[t] || "";
    return HUB_SECTOR_YIELDS[sector] ?? 0;
  }

  function renderDividendsWidget(widget, body, ref) {
    if (!widget.config) widget.config = {};
    body.classList.add("hw-insight-body");
    body.innerHTML = `
      <div class="hw-insight-toolbar"><select class="hw-insight-select" aria-label="Portafolio"></select></div>
      <div class="hw-dividend-hero">
        <span>Flujo anual estimado</span>
        <strong id="hwd-annual-${widget.id}">--</strong>
        <small id="hwd-monthly-${widget.id}">-- mensual</small>
      </div>
      <div class="hw-dividend-list" id="hwd-list-${widget.id}"></div>
      <p class="hw-insight-note">Estimacion beta con yields internos/proxy; no sustituye calendario oficial de dividendos.</p>`;

    const sel = body.querySelector("select");
    sel.addEventListener("mousedown", e => e.stopPropagation());
    sel.addEventListener("change", () => {
      widget.config.portfolioId = sel.value || null;
      saveHubState();
      renderData();
    });

    function renderData() {
      const portfolios = hubPopulatePortfolioSelect(sel, widget);
      const portfolio = portfolios.find(p => p.id === widget.config.portfolioId);
      const annualEl = document.getElementById(`hwd-annual-${widget.id}`);
      const monthlyEl = document.getElementById(`hwd-monthly-${widget.id}`);
      const listEl = document.getElementById(`hwd-list-${widget.id}`);
      if (!portfolio) {
        if (annualEl) annualEl.textContent = "--";
        if (monthlyEl) monthlyEl.textContent = "-- mensual";
        if (listEl) listEl.innerHTML = `<div class="hw-insight-empty">Agrega un portafolio para estimar flujo.</div>`;
        return;
      }
      const currency = portfolio.currency || "USD";
      const rows = hubPortfolioRows(portfolio)
        .map(r => ({ ...r, yield: hubDividendYield(r.ticker) }))
        .filter(r => r.value > 0 && r.yield > 0);
      const annual = rows.reduce((sum, r) => sum + r.value * r.yield, 0);
      if (annualEl) annualEl.textContent = formatCurrency(annual, currency);
      if (monthlyEl) monthlyEl.textContent = `${formatCurrency(annual / 12, currency)} mensual estimado`;
      if (listEl) {
        if (!rows.length) {
          listEl.innerHTML = `<div class="hw-insight-empty">Sin activos con supuesto de dividendo.</div>`;
          return;
        }
        listEl.innerHTML = rows
          .sort((a, b) => (b.value * b.yield) - (a.value * a.yield))
          .slice(0, 5)
          .map((r, index) => {
            const d = new Date();
            d.setMonth(d.getMonth() + index + 1);
            const when = d.toLocaleDateString("es-MX", { month: "short", day: "2-digit" });
            return `<div class="hw-dividend-row">
              <div><strong>${hubEscape(r.ticker)}</strong><span>${when} proxy</span></div>
              <em>${(r.yield * 100).toFixed(1)}% yield</em>
              <b>${formatCurrency(r.value * r.yield / 4, currency)}</b>
            </div>`;
          }).join("");
      }
    }

    async function refresh() {
      const portfolio = getPortfolios().find(p => p.id === widget.config.portfolioId);
      await hubRefreshPortfolioPrices(portfolio);
      renderData();
    }
    ref.refresh = refresh;
    renderData();
    refresh();
  }

  function hubCollectSentimentSymbols() {
    const symbols = new Set();
    activeSpace().widgets.forEach(w => {
      if (w.type === "watchlist" && Array.isArray(w.config?.symbols)) w.config.symbols.forEach(s => symbols.add(s));
      if (w.type === "chart" && w.config?.symbol) symbols.add(w.config.symbol);
    });
    getPortfolios().forEach(p => (p.positions || []).forEach(pos => symbols.add(pos.ticker)));
    return [...symbols].filter(Boolean).slice(0, 12);
  }

  function renderSentimentWidget(widget, body, ref) {
    body.classList.add("hw-insight-body");
    body.innerHTML = `
      <div class="hw-sentiment-head">
        <div><span>Sentimiento agregado</span><strong id="hws-score-${widget.id}">--</strong></div>
        <em id="hws-badge-${widget.id}">Leyendo senales</em>
      </div>
      <div class="hw-sentiment-list" id="hws-list-${widget.id}"></div>
      <p class="hw-insight-note">Feed beta basado en watchlist, cartera y movimientos de precio; integracion de noticias reales queda lista para API futura.</p>`;

    async function renderData(fetchFresh = false) {
      const symbols = hubCollectSentimentSymbols();
      const listEl = document.getElementById(`hws-list-${widget.id}`);
      const scoreEl = document.getElementById(`hws-score-${widget.id}`);
      const badgeEl = document.getElementById(`hws-badge-${widget.id}`);
      if (!symbols.length) {
        if (scoreEl) scoreEl.textContent = "--";
        if (badgeEl) badgeEl.textContent = "Sin universo";
        if (listEl) listEl.innerHTML = `<div class="hw-insight-empty">Agrega una watchlist o portafolio para generar senales.</div>`;
        return;
      }
      if (fetchFresh) await fetchPricesBatch(symbols);
      const rows = symbols.map(sym => {
        const price = getCachedPrice(sym);
        const prev = getCachedPrev(sym);
        const pct = price && prev ? (price - prev) / prev * 100 : 0;
        return { sym, price, prev, pct };
      });
      const avg = rows.reduce((sum, r) => sum + r.pct, 0) / rows.length;
      const positive = rows.filter(r => r.pct > 0.2).length;
      const negative = rows.filter(r => r.pct < -0.2).length;
      if (scoreEl) scoreEl.textContent = avg >= 0 ? "Positivo" : "Defensivo";
      if (badgeEl) {
        badgeEl.textContent = `${positive} alcistas / ${negative} bajistas`;
        badgeEl.className = avg >= 0 ? "ok" : "bad";
      }
      if (listEl) {
        listEl.innerHTML = rows
          .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
          .slice(0, 6)
          .map(r => {
            const cls = r.pct >= 0 ? "positive" : "negative";
            const title = Math.abs(r.pct) >= 2
              ? (r.pct >= 0 ? "Impulso positivo" : "Presion vendedora")
              : "Seguimiento neutral";
            const copy = r.price ? `Precio ${r.price.toFixed(2)} | ${hubPct(r.pct, 2)} vs previo` : "Precio pendiente de actualizar";
            return `<div class="hw-sentiment-row">
              <div><strong>${title}: ${hubEscape(r.sym)}</strong><span>${copy}</span></div>
              <em class="${cls}">${hubPct(r.pct, 1)}</em>
            </div>`;
          }).join("");
      }
    }

    ref.refresh = () => renderData(true);
    renderData(false);
    renderData(true);
  }

  const HUB_MACRO = [
    { symbol: "^VIX", label: "VIX", detail: "miedo mercado", kind: "number" },
    { symbol: "DX-Y.NYB", label: "DXY", detail: "dolar global", kind: "number" },
    { symbol: "^TNX", label: "US 10Y", detail: "tasas largas", kind: "yield" },
    { symbol: "CL=F", label: "Petroleo", detail: "energia", kind: "usd" },
    { symbol: "GC=F", label: "Oro", detail: "refugio", kind: "usd" },
    { symbol: "MXN=X", label: "USD/MXN", detail: "tipo de cambio", kind: "number" }
  ];

  function hubFormatMacroValue(item, value) {
    if (!Number.isFinite(value)) return "--";
    if (item.kind === "yield") return `${(value / 10).toFixed(2)}%`;
    if (item.kind === "usd") return `$${value.toFixed(value > 100 ? 0 : 2)}`;
    return value.toFixed(value > 100 ? 1 : 2);
  }

  function hubMacroSignal(item, value) {
    if (!Number.isFinite(value)) return "Sin dato";
    if (item.symbol === "^VIX") return value > 25 ? "Riesgo alto" : value > 16 ? "Cautela" : "Riesgo bajo";
    if (item.symbol === "^TNX") return value > 45 ? "Tasas exigentes" : value > 35 ? "Tasas firmes" : "Tasas suaves";
    if (item.symbol === "DX-Y.NYB") return value > 105 ? "Dolar fuerte" : value < 100 ? "Dolar debil" : "Neutral";
    if (item.symbol === "GC=F") return "Refugio";
    if (item.symbol === "CL=F") return "Inflacion energia";
    if (item.symbol === "MXN=X") return value > 19 ? "MXN presionado" : "MXN estable";
    return "Neutral";
  }

  function renderMacroWidget(widget, body, ref) {
    body.classList.add("hw-insight-body");
    body.innerHTML = `
      <div class="hw-macro-grid" id="hwm-grid-${widget.id}"></div>
      <p class="hw-insight-note">Lectura macro con proxies de Yahoo Finance cuando hay precio disponible.</p>`;
    const grid = document.getElementById(`hwm-grid-${widget.id}`);

    function renderData() {
      if (!grid) return;
      grid.innerHTML = HUB_MACRO.map(item => {
        const price = getCachedPrice(item.symbol);
        const prev = getCachedPrev(item.symbol);
        const pct = price && prev ? (price - prev) / prev * 100 : null;
        const cls = pct === null ? "neutral" : pct >= 0 ? "positive" : "negative";
        return `<div class="hw-macro-card">
          <span>${hubEscape(item.label)}</span>
          <strong>${hubFormatMacroValue(item, price)}</strong>
          <small>${hubEscape(item.detail)}</small>
          <em class="${cls}">${pct === null ? hubMacroSignal(item, price) : `${hubMacroSignal(item, price)} | ${hubPct(pct, 1)}`}</em>
        </div>`;
      }).join("");
    }

    async function refresh() {
      await fetchPricesBatch(HUB_MACRO.map(item => item.symbol));
      renderData();
    }
    ref.refresh = refresh;
    renderData();
    refresh();
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

      const realizedPnL = reconstructRealizedPnL(portfolio);
      const unrealizedPnL = hasAnyPrice ? totalCurrentValue - totalCostPriced : 0;
      const returnAmt = hasAnyPrice ? unrealizedPnL + realizedPnL : null;
      const returnPct = returnAmt !== null && totalCostPriced > 0 ? (returnAmt / totalCostPriced * 100) : null;
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

(function initSettingsTabs() {
  const grid = document.querySelector("#section-settings .settings-grid");
  const tabs = Array.from(document.querySelectorAll("[data-settings-tab]"));
  if (!grid || tabs.length === 0) return;

  function activate(view) {
    grid.classList.remove("settings-view-account", "settings-view-security", "settings-view-preferences", "settings-view-investor");
    grid.classList.add(`settings-view-${view}`);
    tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.settingsTab === view));
    window.BlackPortfolioRefreshSettings?.();
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => activate(tab.dataset.settingsTab));
  });
})();

// ── Feedback in-app (beta) ────────────────────────────────────────────────────
(function initFeedback() {
  const openBtn   = document.getElementById("feedbackOpenBtn");
  const modal     = document.getElementById("feedbackModal");
  const closeBtn  = document.getElementById("feedbackCloseBtn");
  const form      = document.getElementById("feedbackForm");
  const category  = document.getElementById("feedbackCategory");
  const message   = document.getElementById("feedbackMessage");
  const submitBtn = document.getElementById("feedbackSubmitBtn");
  const msgEl     = document.getElementById("feedbackMsg");
  if (!openBtn || !modal || !form) return;

  function open() {
    if (msgEl) { msgEl.textContent = ""; msgEl.style.color = ""; }
    modal.classList.remove("hidden");
  }
  function close() { modal.classList.add("hidden"); }

  openBtn.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

  // Botón flotante de feedback (siempre visible durante la beta).
  document.getElementById("feedbackFab")?.addEventListener("click", open);

  // Bienvenida a la beta: se muestra una sola vez por dispositivo.
  (function initBetaWelcome() {
    const wm = document.getElementById("betaWelcomeModal");
    if (!wm) return;
    const KEY = "bp-beta-welcome-v1";
    const dismiss = () => { wm.classList.add("hidden"); try { localStorage.setItem(KEY, "1"); } catch {} };
    document.getElementById("betaWelcomeStart")?.addEventListener("click", dismiss);
    document.getElementById("betaWelcomeClose")?.addEventListener("click", dismiss);
    wm.addEventListener("click", (e) => { if (e.target === wm) dismiss(); });
    document.getElementById("betaWelcomeFeedback")?.addEventListener("click", () => { dismiss(); open(); });
    let seen = false;
    try { seen = localStorage.getItem(KEY) === "1"; } catch {}
    if (!seen) {
      const sess = window.BlackPortfolioAuth?.getSession?.();
      if (!sess || !sess.isDemo) setTimeout(() => wm.classList.remove("hidden"), 700);
    }
  })();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = (message?.value || "").trim();
    if (!text) { message?.focus(); return; }

    const user = window.BlackPortfolioAuth?.firebaseAuth?.currentUser;
    if (!user) {
      if (msgEl) { msgEl.style.color = "#ff6b6b"; msgEl.textContent = "Inicia sesión para enviar feedback."; }
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando…";
    try {
      const idToken = await user.getIdToken();
      const twofaToken = localStorage.getItem("bp-2fa-token");
      const activeSection = document.querySelector(".dashboard-nav-item.active")?.dataset.section || "";
      const res = await fetch(`${API_BASE_URL}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          ...(twofaToken ? { "X-2FA-Token": twofaToken } : {}),
        },
        body: JSON.stringify({
          category: category?.value || "general",
          message: text,
          page: (activeSection ? `${activeSection} · ` : "") + location.pathname,
          userAgent: navigator.userAgent,
          appVersion: "beta",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      window.showToast?.("¡Gracias! Tu feedback fue enviado.", "success");
      form.reset();
      close();
    } catch (err) {
      if (msgEl) { msgEl.style.color = "#ff6b6b"; msgEl.textContent = "No se pudo enviar: " + err.message; }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar";
    }
  });
})();

// ── Settings Enhancements ─────────────────────────────────────────────────────
(function initSettingsEnhancements() {
  const CURRENCY_KEY = "bp-currency";

  // ── Email verified badge ─────────────────────────────────────────────────
  function refreshVerifiedBadge() {
    const user = window.BlackPortfolioAuth.firebaseAuth.currentUser;
    const badge = document.getElementById("emailVerifiedBadge");
    const resendBtn = document.getElementById("resendVerifyBtn");
    if (!badge || !user) return false;
    if (user.emailVerified) {
      badge.textContent = "✓ Verificado";
      badge.className = "settings-verified-badge settings-verified-badge--ok";
      if (resendBtn) resendBtn.classList.add("hidden");
      return true;
    } else {
      badge.textContent = "Sin verificar";
      badge.className = "settings-verified-badge settings-verified-badge--warn";
      if (resendBtn) resendBtn.classList.remove("hidden");
      return false;
    }
  }

  (function initResendVerify() {
    const resendBtn = document.getElementById("resendVerifyBtn");
    if (!resendBtn) return;
    resendBtn.addEventListener("click", async () => {
      resendBtn.disabled = true;
      const original = resendBtn.textContent;
      resendBtn.textContent = "Enviando…";
      const r = await window.BlackPortfolioAuth.resendEmailVerification();
      if (r.ok) {
        window.showToast?.("Correo de verificación enviado. Revisa tu bandeja.", "success");
        resendBtn.textContent = "Enviado ✓";
      } else {
        window.showToast?.(r.error || "No se pudo enviar el correo.", "error");
        resendBtn.textContent = original;
        resendBtn.disabled = false;
      }
    });
  })();

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function getLastActivity(session) {
    if (!session?.id) return null;
    const entries = JSON.parse(localStorage.getItem(`bp-activity-${session.id}`) || "[]");
    return entries.length ? entries[0] : null;
  }

  function setSecurityCheck(id, ok) {
    document.getElementById(id)?.classList.toggle("is-ok", !!ok);
  }

  function renderSettingsOverview(session, flags = {}) {
    if (!session) return;
    const emailVerified = !!flags.emailVerified;
    const twoFactorEnabled = !!flags.twoFactorEnabled;
    const securityPoints = 45 + (emailVerified ? 25 : 0) + (twoFactorEnabled ? 30 : 0);
    const securityLabel = securityPoints >= 90 ? "Alto" : securityPoints >= 70 ? "Bueno" : "Basico";
    const lastActivity = getLastActivity(session);
    const lastActivityDate = lastActivity ? new Date(lastActivity.date) : null;

    setText("settingsOverviewEmail", session.email || "--");
    setText("settingsOverviewEmailStatus", emailVerified ? "Email verificado" : "Pendiente de verificacion");
    setText("settingsOverviewPlan", session.selectedPlan || "--");
    setText("settingsOverviewType", session.isDemo ? "Cuenta demo" : "Cuenta registrada");
    setText("settingsSecurityScore", `${securityPoints}%`);
    setText("settingsSecurityScoreMain", `${securityPoints}%`);
    setText("settingsSecurityBadge", `Nivel ${securityLabel}`);
    setText("settingsSecurityLevel", securityLabel);
    setText("settingsOverviewLastLogin", lastActivityDate
      ? lastActivityDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
      : "Sin registro");
    setText("settingsOverviewDevice", lastActivity?.device || "Este dispositivo");

    setSecurityCheck("securityEmailCheck", emailVerified);
    setSecurityCheck("securityTwoFaCheck", twoFactorEnabled);
    setSecurityCheck("securitySessionCheck", true);
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
      window.BlackPortfolioAuth?.setExtra?.(user.uid, { fullName: newName });
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

  // ── Avatar picker ─────────────────────────────────────────────────────────
  const editAvatarBtn      = document.getElementById("editAvatarBtn");
  const avatarPickerPanel  = document.getElementById("avatarPickerPanel");
  const avatarPickerGrid   = document.getElementById("avatarPickerGrid");
  const closeAvatarPickerBtn = document.getElementById("closeAvatarPickerBtn");

  if (avatarPickerGrid && !avatarPickerGrid.children.length) {
    AVATAR_PRESETS.forEach(preset => {
      const opt = document.createElement("button");
      opt.type = "button";
      opt.className = "avatar-picker-option";
      opt.style.background = `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})`;
      opt.textContent = preset.emoji;
      opt.dataset.avatarId = preset.id;
      opt.addEventListener("click", () => {
        window.BlackPortfolioAuth.setAvatar(preset.id);
        const session = window.BlackPortfolioAuth.getSession();
        renderUser(session);
        avatarPickerGrid.querySelectorAll(".avatar-picker-option").forEach(o =>
          o.classList.toggle("is-selected", o.dataset.avatarId === preset.id)
        );
      });
      avatarPickerGrid.appendChild(opt);
    });
  }

  editAvatarBtn?.addEventListener("click", () => {
    const session = window.BlackPortfolioAuth.getSession();
    avatarPickerGrid?.querySelectorAll(".avatar-picker-option").forEach(o =>
      o.classList.toggle("is-selected", o.dataset.avatarId === session?.avatarId)
    );
    avatarPickerPanel?.classList.remove("hidden");
  });
  closeAvatarPickerBtn?.addEventListener("click", () => {
    avatarPickerPanel?.classList.add("hidden");
  });

  // ── Plan & billing ───────────────────────────────────────────────────────
  async function openStripePortal() {
    const user = window.BlackPortfolioAuth.firebaseAuth.currentUser;
    if (!user) throw new Error("No autenticado.");
    const token = await user.getIdToken();
    const response = await fetch(`${API_BASE_URL}/billing/stripe/portal`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || "No se pudo abrir Stripe.");
    window.location.href = body.url;
  }

  function renderPlanBilling(session) {
    if (!session) return;
    const planName        = document.getElementById("billingPlanName");
    const renewalDate     = document.getElementById("billingRenewalDate");
    const billingStatus   = document.getElementById("billingStatus");
    const billingPayment  = document.getElementById("billingPaymentMethod");
    const upgradeBtn      = document.getElementById("upgradePlanBtn");

    if (planName) planName.textContent = session.selectedPlan || "—";

    // Clasificación del estado para evitar el confuso "Pendiente":
    //  - active  → suscripción de Stripe vigente
    //  - demo    → cuenta demo con acceso completo
    //  - granted → plan de pago sin Stripe = acceso beta/otorgado
    //  - free    → plan Explorer gratuito
    //  - canceled/past_due → estado real de Stripe, en texto legible
    const isActive   = session.billingStatus === "active";
    const isFree     = (session.selectedPlan || "Explorer") === "Explorer";
    const isGranted  = !isActive && !isFree && !session.isDemo;
    const STATUS_LABELS = { canceled: "Cancelada", past_due: "Pago pendiente" };

    if (billingStatus) {
      let html;
      if (isActive)          html = '<span style="color:var(--success)">● Activo</span>';
      else if (session.isDemo) html = '<span style="color:var(--success)">● Demo · acceso completo</span>';
      else if (isGranted)    html = '<span style="color:var(--accent, #6f86ff)">● Acceso beta</span>';
      else if (isFree)       html = "Plan gratuito";
      else                   html = STATUS_LABELS[session.billingStatus] || "Sin suscripción activa";
      billingStatus.innerHTML = html;
    }

    if (billingPayment) {
      billingPayment.textContent = isActive ? "Stripe"
        : (session.isDemo || isGranted) ? "No aplica" : "—";
    }

    if (renewalDate) {
      const next = session.billingCurrentPeriodEnd
        ? new Date(Number(session.billingCurrentPeriodEnd) * 1000)
        : null;
      renewalDate.textContent = next
        ? next.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
        : (session.isDemo || isGranted) ? "Sin vencimiento" : "—";
    }

    const planLevels = { "Explorer": 0, "Investor": 1, "Advisor Pro": 2, "Wealth Desk": 3 };
    const level = planLevels[session.selectedPlan] ?? 0;
    if (upgradeBtn) {
      if (session.isDemo) {
        upgradeBtn.textContent = "Plan máximo activo";
        upgradeBtn.disabled = true;
      } else if (level === 0) {
        upgradeBtn.textContent = "Mejorar plan";
        upgradeBtn.disabled = false;
        upgradeBtn.onclick = () => { window.location.href = "index.html#plans"; };
      } else {
        upgradeBtn.textContent = "Gestionar suscripción";
        upgradeBtn.disabled = false;
        upgradeBtn.onclick = () => openStripePortal().catch(error => showToast(error.message, { type: "error" }));
      }
    }
  }

  document.getElementById("invoiceHistoryBtn")?.addEventListener("click", async function() {
    const original = this.textContent;
    this.disabled = true;
    this.textContent = "Abriendo…";
    try {
      await openStripePortal();
    } catch (error) {
      showToast(error.message, { type: "error" });
      this.disabled = false;
      this.textContent = original;
    }
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

  // ── Datos y privacidad: exportar / eliminar cuenta ───────────────────────
  const dataMsg = document.getElementById("dataPrivacyMessage");
  function setDataMsg(text, kind = "") {
    if (!dataMsg) return;
    dataMsg.textContent = text;
    dataMsg.className = "form-message" + (kind ? ` form-message--${kind}` : "");
  }

  document.getElementById("exportAccountDataBtn")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = "Generando…";
    setDataMsg("");
    try {
      const data = await portfolioApiRequest("/account/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `blackportfolio-datos-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDataMsg("Datos exportados correctamente.", "ok");
    } catch (err) {
      if (err?.code !== "email_verification_required") {
        setDataMsg(err?.message || "No se pudo exportar. Intenta de nuevo.", "error");
      }
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  document.getElementById("deleteAccountBtn")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    if (!confirm("¿Eliminar tu cuenta de forma permanente? Esto borra tu perfil, portafolios y toda tu actividad. Esta acción es irreversible.")) return;
    const typed = prompt('Escribe ELIMINAR (en mayúsculas) para confirmar:');
    if ((typed || "").trim() !== "ELIMINAR") {
      setDataMsg("Eliminación cancelada.", "");
      return;
    }
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = "Eliminando…";
    setDataMsg("");
    try {
      await portfolioApiRequest("/account", { method: "DELETE" });
      try { await window.BlackPortfolioAuth.firebaseAuth.signOut(); } catch {}
      window.BlackPortfolioAuth.stopSessionTimeout?.();
      window.BlackPortfolioAuth.clearSession?.();
      alert("Tu cuenta ha sido eliminada. Gracias por probar BlackPortfolio.");
      window.location.href = "index.html";
    } catch (err) {
      setDataMsg(err?.message || "No se pudo eliminar la cuenta. Intenta de nuevo.", "error");
      btn.disabled = false;
      btn.textContent = original;
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
    const rows = entries.slice(-3).map(e => {
      const d = new Date(e.date);
      const dateStr = d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
      const timeStr = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
      return `<tr><td>${dateStr}</td><td>${timeStr}</td><td>${e.device || "—"}</td><td><span class="activity-status-ok">● Exitoso</span></td></tr>`;
    }).join("");
    container.innerHTML = `<table class="activity-log-table"><thead><tr><th>Fecha</th><th>Hora</th><th>Dispositivo</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  // ── Refresh on nav click ─────────────────────────────────────────────────
  async function refresh() {
    const user = window.BlackPortfolioAuth.firebaseAuth.currentUser;
    if (!user) return;
    const session = window.BlackPortfolioAuth.buildSession(user);
    const emailVerified = refreshVerifiedBadge();
    let twoFactorEnabled = false;
    try {
      twoFactorEnabled = await window.BlackPortfolioAuth.isTwoFactorEnabled(session.id);
    } catch {
      twoFactorEnabled = false;
    }
    renderSettingsOverview(session, { emailVerified, twoFactorEnabled });
    renderPlanBilling(session);
    renderActiveSessions(session);
    renderCurrencyBtns(session);
    renderActivityLog(session);
  }
  window.BlackPortfolioRefreshSettings = refresh;

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

// ── Chart fullscreen mode ────────────────────────────────────────────────────────
(function initChartFullscreen() {
  const marketMainCol = document.querySelector(".market-main-col");
  if (!chartFullscreenBtn || !marketMainCol) return;

  function toggleFullscreen() {
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);

    if (!isFullscreen) {
      const enterFS = marketMainCol.requestFullscreen || marketMainCol.webkitRequestFullscreen || marketMainCol.mozRequestFullScreen || marketMainCol.msRequestFullscreen;
      if (enterFS) {
        enterFS.call(marketMainCol).catch(() => {
          // Fallback to class-only fullscreen
          syncFullscreenClass(true);
        });
      } else {
        // Fallback for browsers without fullscreen API
        syncFullscreenClass(true);
      }
    } else {
      const exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
      if (exitFS) {
        exitFS.call(document).catch(() => {
          // Fallback to class-only fullscreen
          syncFullscreenClass(false);
        });
      } else {
        // Fallback
        syncFullscreenClass(false);
      }
    }
  }

  function syncFullscreenClass(forceState) {
    const isFullscreen = typeof forceState === "boolean" ? forceState : !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);

    if (isFullscreen) {
      marketMainCol.classList.add("market-chart-fullscreen");
      document.body.style.overflow = "hidden";
      chartFullscreenBtn.title = "Salir de pantalla completa";
    } else {
      marketMainCol.classList.remove("market-chart-fullscreen");
      document.body.style.overflow = "";
      chartFullscreenBtn.title = "Pantalla completa";
    }

    if (tvChart) {
      setTimeout(() => tvChart.applyOptions({ timeScale: { timeVisible: true } }), 100);
    }
  }

  chartFullscreenBtn.addEventListener("click", toggleFullscreen);

  // Sync state on native fullscreen change (e.g. if user presses Escape)
  document.addEventListener("fullscreenchange", () => syncFullscreenClass());
  document.addEventListener("webkitfullscreenchange", () => syncFullscreenClass());
  document.addEventListener("mozfullscreenchange", () => syncFullscreenClass());
  document.addEventListener("MSFullscreenChange", () => syncFullscreenClass());

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && marketMainCol.classList.contains("market-chart-fullscreen")) {
      const isNativeFS = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      if (!isNativeFS) {
        // Fallback manual exit for browsers without native fullscreen
        syncFullscreenClass(false);
      }
    }
  });
})();

// Investor Profile Questionnaire
(function initInvestorProfile() {
  const modal = document.getElementById("investorProfileModal");
  const questionStage = document.getElementById("investorProfileQuestionStage");
  const resultStage = document.getElementById("investorProfileResultStage");
  const title = document.getElementById("investorProfileModalTitle");
  const help = document.getElementById("investorProfileQuestionHelp");
  const options = document.getElementById("investorProfileOptions");
  const progressLabel = document.getElementById("investorProfileProgressLabel");
  const progressBar = document.getElementById("investorProfileProgressBar");
  const backBtn = document.getElementById("investorProfileBackBtn");
  const laterBtn = document.getElementById("investorProfileLaterBtn");
  const nextBtn = document.getElementById("investorProfileNextBtn");
  const closeBtn = document.getElementById("closeInvestorProfileBtn");
  if (!modal || !questionStage || !resultStage || !options) return;

  const questions = [
    {
      title: "¿Cuál es tu principal objetivo de inversión?",
      help: "Selecciona la opción que mejor representa el propósito de este capital.",
      options: [
        ["Preservar capital", "Priorizar estabilidad y disponibilidad.", 0],
        ["Generar ingresos", "Buscar flujos periódicos con variación limitada.", 1],
        ["Equilibrar crecimiento y estabilidad", "Combinar apreciación con control de riesgo.", 2],
        ["Maximizar crecimiento", "Priorizar apreciación de largo plazo.", 3]
      ]
    },
    {
      title: "¿Cuándo esperas utilizar la mayor parte de este capital?",
      help: "El horizonte determina cuánto tiempo tiene la estrategia para atravesar ciclos de mercado.",
      options: [
        ["En menos de 2 años", "Necesidad de liquidez en el corto plazo.", 0],
        ["Entre 2 y 5 años", "Horizonte corto a medio.", 1],
        ["Entre 5 y 10 años", "Horizonte suficiente para tolerar ciclos.", 2],
        ["En más de 10 años", "Objetivo claramente orientado al largo plazo.", 3]
      ]
    },
    {
      title: "¿Qué parte podrías necesitar durante los próximos 12 meses?",
      help: "Considera gastos importantes, emergencias y compromisos ya previstos.",
      options: [
        ["Más del 50%", "Una parte considerable debe permanecer disponible.", 0],
        ["Entre 20% y 50%", "Existe una necesidad relevante de liquidez.", 1],
        ["Menos del 20%", "La mayor parte puede mantenerse invertida.", 2],
        ["Ninguna", "Cuentas con liquidez separada para imprevistos.", 3]
      ]
    },
    {
      title: "¿Qué experiencia tienes administrando inversiones?",
      help: "Evalúa tu familiaridad práctica con fluctuaciones, diversificación y riesgo.",
      options: [
        ["Ninguna", "Estoy comenzando a invertir.", 0],
        ["Básica", "Conozco los conceptos principales.", 1],
        ["Intermedia", "He gestionado una cartera durante varios ciclos.", 2],
        ["Avanzada", "Analizo riesgo, asignación y rebalanceo con regularidad.", 3]
      ]
    },
    {
      title: "¿Cuál es el instrumento de renta variable más sofisticado en el que has invertido?",
      help: "Considera únicamente operaciones realizadas por ti, no productos que solo conoces de forma teórica.",
      options: [
        ["Ninguno", "No he invertido en instrumentos de renta variable.", 0],
        ["Fondos o ETF de renta variable", "He utilizado vehículos diversificados que agrupan múltiples emisoras.", 1],
        ["Acciones individuales o FIBRAs / REIT", "He seleccionado y administrado posiciones directas.", 2],
        ["Opciones, futuros o productos apalancados", "He operado instrumentos complejos con riesgos adicionales.", 3]
      ]
    },
    {
      title: "¿Cuál es el instrumento de renta fija más sofisticado en el que has invertido?",
      help: "Selecciona la opción de mayor complejidad que hayas utilizado directamente.",
      options: [
        ["Ninguno", "No he invertido en instrumentos de renta fija.", 0],
        ["CETES, pagarés o depósitos a plazo", "He utilizado instrumentos de deuda de estructura sencilla.", 1],
        ["Bonos, fondos o ETF de deuda", "He invertido considerando plazo, duración o calidad crediticia.", 2],
        ["Deuda privada, alto rendimiento o estructurados", "He evaluado instrumentos con riesgo crediticio o estructuras complejas.", 3]
      ]
    },
    {
      title: "Tu portafolio cae 15% en tres meses. ¿Qué harías?",
      help: "Responde según tu reacción más probable, no según lo que consideres ideal.",
      options: [
        ["Vendería la mayor parte", "Buscaría detener las pérdidas cuanto antes.", 0],
        ["Reduciría parcialmente", "Disminuiría exposición para sentir mayor control.", 1],
        ["Mantendría la estrategia", "Esperaría sin cambiar la asignación.", 2],
        ["Aumentaría la inversión", "Aprovecharía precios menores si el plan no cambió.", 3]
      ]
    },
    {
      title: "¿Qué caída temporal podrías tolerar sin abandonar el plan?",
      help: "Las pérdidas temporales forman parte de invertir; elige un límite realista.",
      options: [
        ["Hasta 5%", "Prefiero variaciones muy reducidas.", 0],
        ["Hasta 10%", "Acepto fluctuaciones moderadas.", 1],
        ["Hasta 20%", "Tolero periodos relevantes de pérdida.", 2],
        ["Más de 20%", "Acepto alta volatilidad por mayor crecimiento potencial.", 3]
      ]
    }
  ];

  const profiles = [
    { max: 5, key: "conservative", name: "Conservador", description: "Prioriza la preservación del capital y una variación reducida, manteniendo exposición limitada al crecimiento.", allocation: { equity: 20, fixedIncome: 70, cash: 10 } },
    { max: 11, key: "moderate", name: "Moderado", description: "Busca crecimiento gradual con una base amplia de estabilidad y liquidez para amortiguar fluctuaciones.", allocation: { equity: 40, fixedIncome: 55, cash: 5 } },
    { max: 16, key: "balanced", name: "Balanceado", description: "Equilibra crecimiento de largo plazo y control de riesgo mediante una distribución diversificada.", allocation: { equity: 60, fixedIncome: 35, cash: 5 } },
    { max: 20, key: "growth", name: "Crecimiento", description: "Prioriza la apreciación del capital y acepta fluctuaciones relevantes con un horizonte amplio.", allocation: { equity: 80, fixedIncome: 15, cash: 5 } },
    { max: 24, key: "aggressive", name: "Agresivo", description: "Busca máximo crecimiento potencial y puede sostener periodos prolongados de alta volatilidad.", allocation: { equity: 95, fixedIncome: 5, cash: 0 } }
  ];

  const allocationLabels = {
    equity: "Renta variable",
    fixedIncome: "Renta fija",
    cash: "Efectivo"
  };

  let step = 0;
  let answers = new Array(questions.length).fill(null);
  let pendingProfile = null;
  let showingResult = false;

  function getDeferredKey() {
    const uid = window.BlackPortfolioAuth.firebaseAuth.currentUser?.uid || "guest";
    return `bp-investor-profile-deferred-${uid}`;
  }

  function allocationMarkup(allocation) {
    return Object.entries(allocation).map(([key, value]) => `
      <div class="investor-allocation-item">
        <div class="investor-allocation-label"><span>${allocationLabels[key]}</span><strong>${value}%</strong></div>
        <div class="investor-allocation-bar"><span style="width:${value}%"></span></div>
      </div>`).join("");
  }

  function calculateProfile() {
    const score = answers.reduce((sum, value) => sum + Number(value || 0), 0);
    let profileIndex = profiles.findIndex(profile => score <= profile.max);
    if (profileIndex < 0) profileIndex = profiles.length - 1;
    const initialIndex = profileIndex;
    if (answers[1] === 0 || answers[2] === 0 || answers[7] === 0) profileIndex = Math.min(profileIndex, 0);
    else {
      if (answers[1] === 1) profileIndex = Math.min(profileIndex, 2);
      if (answers[2] === 1 || answers[6] === 0 || answers[7] === 1) profileIndex = Math.min(profileIndex, 1);
    }
    const definition = profiles[profileIndex];
    return {
      version: 2,
      score,
      maxScore: questions.length * 3,
      riskLevel: profileIndex + 1,
      constraintApplied: profileIndex < initialIndex,
      key: definition.key,
      name: definition.name,
      description: definition.description,
      allocation: definition.allocation,
      answers: [...answers],
      updatedAt: new Date().toISOString()
    };
  }

  function renderQuestion() {
    showingResult = false;
    pendingProfile = null;
    questionStage.classList.remove("hidden");
    resultStage.classList.add("hidden");
    const question = questions[step];
    progressLabel.textContent = `Pregunta ${step + 1} de ${questions.length}`;
    progressBar.style.width = `${((step + 1) / questions.length) * 100}%`;
    title.textContent = question.title;
    help.textContent = question.help;
    options.innerHTML = question.options.map(([label, detail, score]) => `
      <button class="investor-option${answers[step] === score ? " is-selected" : ""}" type="button" role="radio" aria-checked="${answers[step] === score}" data-score="${score}">
        <span class="investor-option-marker" aria-hidden="true"></span>
        <span><strong>${label}</strong><small>${detail}</small></span>
      </button>`).join("");
    backBtn.disabled = step === 0;
    laterBtn.classList.remove("hidden");
    nextBtn.disabled = answers[step] === null;
    nextBtn.textContent = step === questions.length - 1 ? "Ver resultado" : "Continuar";
  }

  function renderResult() {
    showingResult = true;
    pendingProfile = calculateProfile();
    questionStage.classList.add("hidden");
    resultStage.classList.remove("hidden");
    progressLabel.textContent = "Evaluación completada";
    progressBar.style.width = "100%";
    resultStage.innerHTML = `
      <span class="settings-kicker">Resultado orientativo</span>
      <h2>${pendingProfile.name}</h2>
      <p>${pendingProfile.description}${pendingProfile.constraintApplied ? " La recomendación fue moderada por tu horizonte, liquidez o tolerancia declarada." : ""}</p>
      <div class="investor-allocation-grid">${allocationMarkup(pendingProfile.allocation)}</div>
      <p class="investor-profile-disclaimer">Esta asignación es una referencia educativa basada en tus respuestas. No recomienda activos específicos ni sustituye asesoría financiera profesional.</p>`;
    backBtn.disabled = false;
    laterBtn.classList.add("hidden");
    nextBtn.disabled = false;
    nextBtn.textContent = "Guardar perfil";
  }

  function renderSettingsSummary() {
    const profile = window.BlackPortfolioAuth.getInvestorProfile?.();
    const empty = document.getElementById("investorProfileEmpty");
    const summary = document.getElementById("investorProfileSummary");
    const status = document.getElementById("investorProfileStatus");
    if (!empty || !summary || !status) return;
    empty.classList.toggle("hidden", !!profile);
    summary.classList.toggle("hidden", !profile);
    status.textContent = profile ? "Completado" : "Pendiente";
    status.classList.toggle("is-complete", !!profile);
    if (!profile) return;
    document.getElementById("investorProfileName").textContent = profile.name;
    document.getElementById("investorProfileScore").textContent = `Nivel ${profile.riskLevel}/5`;
    document.getElementById("investorProfileDescription").textContent = profile.description;
    document.getElementById("investorAllocationGrid").innerHTML = allocationMarkup(profile.allocation);
    document.getElementById("investorProfileUpdated").textContent = `Actualizado: ${new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(profile.updatedAt))}`;
  }

  function openProfile() {
    const saved = window.BlackPortfolioAuth.getInvestorProfile?.();
    answers = Array.isArray(saved?.answers) && saved.answers.length === questions.length
      ? [...saved.answers]
      : new Array(questions.length).fill(null);
    step = 0;
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    renderQuestion();
    setTimeout(() => options.querySelector(".investor-option")?.focus(), 50);
  }

  function closeProfile(defer = false) {
    if (defer && !window.BlackPortfolioAuth.getInvestorProfile?.()) {
      localStorage.setItem(getDeferredKey(), "1");
    }
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  options.addEventListener("click", event => {
    const option = event.target.closest(".investor-option");
    if (!option) return;
    answers[step] = Number(option.dataset.score);
    options.querySelectorAll(".investor-option").forEach(item => {
      const selected = item === option;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-checked", String(selected));
    });
    nextBtn.disabled = false;
  });

  nextBtn.addEventListener("click", async () => {
    if (showingResult) {
      nextBtn.disabled = true;
      nextBtn.textContent = "Guardando...";
      try {
        await window.BlackPortfolioAuth.saveInvestorProfile(pendingProfile);
        localStorage.removeItem(getDeferredKey());
        renderSettingsSummary();
        closeProfile();
        window.showToast?.("Perfil de inversionista guardado.", "success");
      } catch {
        nextBtn.disabled = false;
        nextBtn.textContent = "Guardar perfil";
        window.showToast?.("No fue posible guardar el perfil. Intenta de nuevo.", "error");
      }
      return;
    }
    if (answers[step] === null) return;
    if (step < questions.length - 1) {
      step += 1;
      renderQuestion();
    } else {
      renderResult();
    }
  });

  backBtn.addEventListener("click", () => {
    if (showingResult) {
      step = questions.length - 1;
      renderQuestion();
    } else if (step > 0) {
      step -= 1;
      renderQuestion();
    }
  });

  laterBtn.addEventListener("click", () => closeProfile(true));
  closeBtn.addEventListener("click", () => closeProfile(true));
  document.getElementById("startInvestorProfileBtn")?.addEventListener("click", openProfile);
  document.getElementById("retakeInvestorProfileBtn")?.addEventListener("click", openProfile);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) closeProfile(true);
  });

  window.BlackPortfolioAuth.firebaseAuth.onAuthStateChanged(user => {
    if (!user) return;
    renderSettingsSummary();
    const session = window.BlackPortfolioAuth.buildSession(user);
    if (!session.isDemo && !window.BlackPortfolioAuth.getInvestorProfile?.() && !localStorage.getItem(getDeferredKey())) {
      setTimeout(() => {
        if (window.BlackPortfolioAuth.firebaseAuth.currentUser?.uid === user.uid) openProfile();
      }, 800);
    }
  });
})();
