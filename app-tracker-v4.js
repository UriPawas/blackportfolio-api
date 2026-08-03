/* ==========================================================================
   BlackPortfolio — Portafolio Tracker v4 (prototipo)

   Sólo presentación. No hay cálculo de negocio aquí: las cifras son de muestra
   y están precomputadas para ser internamente consistentes (los pesos suman
   100%, la contribución suma la P/L no realizada, el cambio del día suma el
   cambio del día de la cartera). Los identificadores de los controles son los
   que ya usa `main.js`, así que el trasplante sustituye marcado, no lógica.

   Las gráficas leen los tokens de CSS en tiempo de ejecución y se repintan al
   cambiar de tema: no hay un solo color literal en este archivo.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ------------------------------------------------------- 1. Formato   */

  var nfMoney = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
  var nfMoney0 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  var nfNum = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 4 });

  function money(v) { return nfMoney.format(v); }
  function money0(v) { return nfMoney0.format(v); }
  // Rótulo de eje: nunca compite con la cifra de la lámina, así que se abrevia.
  // "US$87,934" no cabe en el margen izquierdo de una gráfica de 300 px de alto.
  function moneyK(v) {
    var a = Math.abs(v);
    if (a >= 1e6) return '$' + (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
    if (a >= 1e3) return '$' + (v / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'k';
    return '$' + v.toFixed(0);
  }
  function signed(v, f) { return (v > 0 ? '+' : v < 0 ? '−' : '') + (f || money)(Math.abs(v)); }
  function pct(v, d) { return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d === undefined ? 2 : d) + '%'; }
  function cls(v) { return v > 0 ? 'pos' : v < 0 ? 'neg' : ''; }
  function arrow(v) { return v > 0 ? 'sign sign--up' : v < 0 ? 'sign sign--down' : 'sign'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  /* --------------------------------------------------- 2. Datos muestra  */

  // Generador determinista: la misma cartera en cada carga y en cada tema.
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Camino aleatorio con deriva, reescalado para empezar y terminar en los
  // valores que ya publican las cifras de la cabecera.
  function walk(n, seed, from, to, vol) {
    var r = rng(seed), s = [0], i;
    for (i = 1; i < n; i++) s.push(s[i - 1] + (r() - 0.5) * (vol || 1));
    var lo = Math.min.apply(null, s), hi = Math.max.apply(null, s);
    var span = (hi - lo) || 1;
    var norm = s.map(function (v) { return (v - lo) / span; });
    // El ancla lineal garantiza que el primer y el último punto sean exactos.
    var a = norm[0], b = norm[n - 1];
    return norm.map(function (v, k) {
      var trend = from + (to - from) * (k / (n - 1));
      var wobble = (v - (a + (b - a) * (k / (n - 1)))) * (to - from) * 0.55;
      return trend + wobble;
    });
  }

  var POSITIONS = [
    { t: 'VOO',        name: 'Vanguard S&P 500 ETF', klass: 'ETF',    sector: 'Diversificado', geo: 'EE. UU.', qty: 42,   avg: 402.15,   px: 511.40,   day: 0.62,  date: '2023-03-14', bench: 6.1,  seed: 11 },
    { t: 'AAPL',       name: 'Apple Inc.',           klass: 'Acción', sector: 'Tecnología',    geo: 'EE. UU.', qty: 60,   avg: 168.90,   px: 214.05,   day: 1.18,  date: '2022-11-08', bench: 4.4,  seed: 23 },
    { t: 'MSFT',       name: 'Microsoft Corp.',      klass: 'Acción', sector: 'Tecnología',    geo: 'EE. UU.', qty: 28,   avg: 289.40,   px: 424.80,   day: 0.44,  date: '2023-01-19', bench: 18.2, seed: 37 },
    { t: 'NVDA',       name: 'NVIDIA Corp.',         klass: 'Acción', sector: 'Semiconductores', geo: 'EE. UU.', qty: 35, avg: 44.20,    px: 118.60,   day: 3.85,  date: '2023-06-02', bench: 131.7, seed: 51 },
    { t: 'BTC-USD',    name: 'Bitcoin',              klass: 'Cripto', sector: 'Cripto',        geo: 'Global',  qty: 0.42, avg: 38900.00, px: 61240.00, day: 2.55,  date: '2024-01-11', bench: 34.9, seed: 67 },
    { t: 'NAFTRAC.MX', name: 'NAFTRAC · IPC',        klass: 'ETF',    sector: 'Diversificado', geo: 'México',  qty: 1800, avg: 2.85,     px: 3.06,     day: -0.16, date: '2024-04-03', bench: -9.4, seed: 83 }
  ];

  POSITIONS.forEach(function (p) {
    p.cost = p.qty * p.avg;
    p.value = p.qty * p.px;
    p.ret = (p.px / p.avg - 1) * 100;
    p.pnl = p.value - p.cost;
    p.dayAmt = p.value * p.day / 100;
  });

  var TOTAL_COST = POSITIONS.reduce(function (a, p) { return a + p.cost; }, 0);   // 58 142.50
  var TOTAL_VALUE = POSITIONS.reduce(function (a, p) { return a + p.value; }, 0); // 81 596.00
  var DAY_AMT = POSITIONS.reduce(function (a, p) { return a + p.dayAmt; }, 0);
  var CASH = 3412.65;

  var VALUE_SERIES     = walk(180, 7, 63704.53, 85008.65, 1.0);
  var INVESTED_SERIES  = walk(180, 19, 48120.00, 58391.44, 0.28).map(function (v, i, a) {
    // El capital invertido no baja: sólo escalona hacia arriba.
    return i === 0 ? v : Math.max(v, a[i - 1]);
  });
  var BENCH_SERIES     = walk(180, 29, 100, 121.60, 0.8);
  var PORT_BASE100     = walk(180, 7, 100, 138.42, 1.0);
  var WHATIF_SERIES    = walk(180, 41, 58142, 71980, 0.9);

  var WATCHLIST = [
    { t: 'TSLA', name: 'Tesla Inc.',        px: 246.80, day: -1.42, seed: 91 },
    { t: 'SPY',  name: 'SPDR S&P 500',      px: 556.10, day: 0.58,  seed: 97 },
    { t: 'ETH-USD', name: 'Ethereum',       px: 3218.40, day: 3.11, seed: 103 },
    { t: 'GLD',  name: 'SPDR Gold Shares',  px: 227.35, day: -0.24, seed: 109 }
  ];

  var PORTFOLIOS = [
    { name: 'Núcleo global',   sub: '6 posiciones · USD · S&P 500', value: 85008.65, day: 1.39,  ret: 42.55, seed: 7 },
    { name: 'Renta mexicana',  sub: '5 posiciones · MXN · IPC',     value: 31226.40, day: 0.42,  ret: 18.30, seed: 13 },
    { name: 'Apuesta cripto',  sub: '3 posiciones · USD · sin ref.', value: 11705.13, day: 3.08, ret: 61.20, seed: 17 }
  ];

  var TRANSACTIONS = [
    { d: '2026-07-18', ty: 'DIVIDENDO', t: 'VOO',        q: 42,   px: 1.84,   comm: 0,     net: 77.28 },
    { d: '2026-06-02', ty: 'COMPRA',    t: 'NVDA',       q: 10,   px: 112.40, comm: 6.74,  net: -1130.74 },
    { d: '2026-05-15', ty: 'VENTA',     t: 'TSLA',       q: 12,   px: 252.10, comm: 18.15, net: 3007.05 },
    { d: '2026-05-09', ty: 'DIVIDENDO', t: 'AAPL',       q: 60,   px: 0.26,   comm: 0,     net: 15.60 },
    { d: '2026-04-03', ty: 'COMPRA',    t: 'NAFTRAC.MX', q: 800,  px: 2.91,   comm: 9.31,  net: -2337.31 },
    { d: '2026-02-20', ty: 'COMPRA',    t: 'BTC-USD',    q: 0.12, px: 52400,  comm: 31.44, net: -6319.44 },
    { d: '2026-01-14', ty: 'DIVIDENDO', t: 'MSFT',       q: 28,   px: 0.83,   comm: 0,     net: 23.24 },
    { d: '2025-11-06', ty: 'VENTA',     t: 'META',       q: 8,    px: 561.20, comm: 26.94, net: 4462.66 },
    { d: '2025-09-22', ty: 'COMPRA',    t: 'MSFT',       q: 12,   px: 372.80, comm: 13.42, net: -4487.02 },
    { d: '2025-07-30', ty: 'COMPRA',    t: 'VOO',        q: 14,   px: 468.20, comm: 19.66, net: -6574.46 }
  ];

  var CLOSED = [
    { t: 'TSLA', buy: '2024-08-12', sell: '2026-05-15', hold: '21 meses', q: 12, pb: 194.30, ps: 252.10, pl: 693.60, r: 29.75 },
    { t: 'META', buy: '2025-02-04', sell: '2025-11-06', hold: '9 meses',  q: 8,  pb: 486.40, ps: 561.20, pl: 598.40, r: 15.38 },
    { t: 'PYPL', buy: '2025-03-19', sell: '2025-08-01', hold: '4 meses',  q: 30, pb: 68.20,  ps: 68.06,  pl: -7.70,  r: -0.38 }
  ];

  var DIV_BY_TICKER = [
    { t: 'VOO',        n: 14, total: 928.44, last: '18 jul 2026', y: 1.62 },
    { t: 'MSFT',       n: 12, total: 384.20, last: '14 ene 2026', y: 1.18 },
    { t: 'AAPL',       n: 13, total: 342.60, last: '09 may 2026', y: 0.94 },
    { t: 'NAFTRAC.MX', n: 4,  total: 186.92, last: '30 jun 2026', y: 3.64 }
  ];

  var DIV_FORECAST = [
    { d: '02 oct 2026', t: 'VOO',        ps: 1.86, q: 42,   est: 78.12 },
    { d: '10 oct 2026', t: 'MSFT',       ps: 0.86, q: 28,   est: 24.08 },
    { d: '13 nov 2026', t: 'AAPL',       ps: 0.27, q: 60,   est: 16.20 },
    { d: '29 dic 2026', t: 'NAFTRAC.MX', ps: 0.05, q: 1800, est: 90.00 },
    { d: '05 ene 2027', t: 'VOO',        ps: 1.88, q: 42,   est: 78.96 }
  ];

  var DIV_MONTHLY = [
    { m: 'ago', v: 61.4, f: false }, { m: 'sep', v: 24.1, f: false }, { m: 'oct', v: 96.3, f: false },
    { m: 'nov', v: 18.4, f: false }, { m: 'dic', v: 88.7, f: false }, { m: 'ene', v: 42.9, f: false },
    { m: 'feb', v: 15.6, f: false }, { m: 'mar', v: 79.2, f: false }, { m: 'abr', v: 96.1, f: false },
    { m: 'may', v: 33.8, f: false }, { m: 'jun', v: 91.4, f: false }, { m: 'jul', v: 77.3, f: false },
    { m: 'ago', v: 64.0, f: true },  { m: 'sep', v: 26.0, f: true },  { m: 'oct', v: 102.2, f: true },
    { m: 'nov', v: 19.8, f: true },  { m: 'dic', v: 93.4, f: true },  { m: 'ene', v: 45.1, f: true }
  ];

  var CORR_KEYS = POSITIONS.map(function (p) { return p.t; });
  var CORR = [
    [1.00, 0.71, 0.86, 0.64, 0.28, 0.52],
    [0.71, 1.00, 0.78, 0.59, 0.31, 0.41],
    [0.86, 0.78, 1.00, 0.68, 0.26, 0.44],
    [0.64, 0.59, 0.68, 1.00, 0.39, 0.33],
    [0.28, 0.31, 0.26, 0.39, 1.00, 0.11],
    [0.52, 0.41, 0.44, 0.33, 0.11, 1.00]
  ];

  var RISK_CONTRIB = [
    { t: 'BTC-USD', risk: 44.8, w: 31.52 }, { t: 'NVDA', risk: 14.1, w: 5.09 },
    { t: 'VOO', risk: 17.6, w: 26.32 },     { t: 'MSFT', risk: 11.2, w: 14.58 },
    { t: 'AAPL', risk: 9.4, w: 15.74 },     { t: 'NAFTRAC.MX', risk: 2.9, w: 6.75 }
  ];

  var MC_STATS = [
    ['Mediana a 10 años', '$268,400', 'p50'],
    ['Escenario malo (p10)', '$142,700', 'p10'],
    ['Escenario bueno (p90)', '$521,300', 'p90'],
    ['Probabilidad de meta', '73%', 'meta $250,000'],
    ['Aportes acumulados', '$60,000', '$500 × 120 meses'],
    ['Retorno anual mediano', '+9.8%', 'nominal']
  ];

  var GOAL_STATS = [
    ['Faltan', '$164,991.35', '66.0% del objetivo'],
    ['Aporte necesario', '$412 / mes', 'para 90% de probabilidad'],
    ['Año mediano de llegada', '2033', 'con el aporte actual'],
    ['Peor escenario (p10)', '2041', 'o no se alcanza']
  ];

  var WHATIF_STATS = [
    ['Tu cartera', '+38.42%', '$80,483 finales'],
    ['QQQ comprado y mantenido', '+23.80%', '$71,980 finales'],
    ['Diferencia', '+14.62 pp', 'a favor de tu cartera'],
    ['Volatilidad comparada', '18.6% vs 21.4%', 'tu cartera oscila menos']
  ];

  /* -------------------------------------------------------- 3. Tokens    */

  var T = {};
  function readTokens() {
    var cs = getComputedStyle(root);
    ['ink', 'ink-2', 'ink-3', 'rule', 'rule-soft', 'rule-strong', 'surface', 'sunken', 'paper',
     'cobalt', 'cobalt-line', 'cobalt-tint', 'pos', 'neg',
     'ramp-1', 'ramp-2', 'ramp-3', 'ramp-4', 'ramp-5', 'ramp-6'].forEach(function (k) {
      T[k] = cs.getPropertyValue('--' + k).trim();
    });
    T.ramp = [T['ramp-1'], T['ramp-2'], T['ramp-3'], T['ramp-4'], T['ramp-5'], T['ramp-6']];
  }
  function alpha(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* ------------------------------------------------------- 4. Lienzo     */

  var painters = [];
  function register(canvas, fn) {
    if (!canvas) return;
    painters.push({ c: canvas, fn: fn });
  }
  function prep(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    return { ctx: ctx, w: r.width, h: r.height };
  }
  function repaint() {
    readTokens();
    painters.forEach(function (p) {
      if (p.c.offsetParent === null && p.c.getBoundingClientRect().width === 0) return;
      var s = prep(p.c);
      if (s) p.fn(s.ctx, s.w, s.h);
    });
  }

  // Ejes en --ink-3 a 11 px, rejilla en --rule, serie en --cobalt-line.
  function axes(ctx, w, h, pad, min, max, fmt, ticks) {
    var n = ticks || 4, i, y, v;
    ctx.font = '11px "Libre Franklin", system-ui, sans-serif';
    ctx.fillStyle = T['ink-3'];
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    for (i = 0; i <= n; i++) {
      v = min + (max - min) * (i / n);
      y = h - pad.b - (h - pad.t - pad.b) * (i / n);
      ctx.strokeStyle = i === 0 ? T['rule-strong'] : T.rule;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.l, Math.round(y) + 0.5);
      ctx.lineTo(w - pad.r, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.fillText(fmt(v), pad.l - 6, y);
    }
    ctx.textAlign = 'left';
  }

  function plot(ctx, series, w, h, pad, min, max) {
    var n = series.length;
    return series.map(function (v, i) {
      return [
        pad.l + (w - pad.l - pad.r) * (i / (n - 1)),
        h - pad.b - (h - pad.t - pad.b) * ((v - min) / (max - min || 1))
      ];
    });
  }
  function stroke(ctx, pts, color, width, dash) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1.75;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    ctx.stroke();
    ctx.restore();
  }
  function fillUnder(ctx, pts, h, pad, color) {
    ctx.save();
    ctx.beginPath();
    pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    ctx.lineTo(pts[pts.length - 1][0], h - pad.b);
    ctx.lineTo(pts[0][0], h - pad.b);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }
  function bounds() {
    var lo = Infinity, hi = -Infinity;
    Array.prototype.slice.call(arguments).forEach(function (s) {
      s.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; });
    });
    var pad = (hi - lo) * 0.12 || 1;
    return [lo - pad, hi + pad];
  }

  /* ------------------------------------- 5. LA FIRMA: la regla es la serie */

  register($('#ledgerSpark'), function (ctx, w, h) {
    // Sin margen inferior: el mínimo de la serie ES el borde de la lámina. Con
    // `bounds()` la línea flotaría y volvería a leerse como adorno.
    var s = VALUE_SERIES;
    var lo = Math.min.apply(null, s), hi = Math.max.apply(null, s);
    var pad = { l: 0, r: 0, t: 9, b: 0 };
    var pts = plot(ctx, s, w, h, pad, lo, hi);
    fillUnder(ctx, pts, h, pad, alpha(T['cobalt-line'], root.getAttribute('data-theme') === 'dark' ? 0.14 : 0.09));
    stroke(ctx, pts, T['cobalt-line'], 1);
    // La marca del cierre: el punto donde la regla se convierte en la cifra.
    var last = pts[pts.length - 1];
    ctx.fillStyle = T['cobalt-line'];
    ctx.fillRect(w - 2, last[1] - 1, 2, h - last[1] + 1);
  });

  /* --------------------------------------------------- 6. Vista Resumen  */

  var valueMode = 'value';
  register($('#portfolioValueChart'), function (ctx, w, h) {
    var pad = { l: 46, r: 12, t: 12, b: 22 };
    var b, pts, second;
    if (valueMode === 'benchmark') {
      b = bounds(PORT_BASE100, BENCH_SERIES);
      axes(ctx, w, h, pad, b[0], b[1], function (v) { return v.toFixed(0); });
      second = plot(ctx, BENCH_SERIES, w, h, pad, b[0], b[1]);
      stroke(ctx, second, T['ink-3'], 1.25, [4, 3]);
      pts = plot(ctx, PORT_BASE100, w, h, pad, b[0], b[1]);
    } else if (valueMode === 'invested') {
      b = bounds(VALUE_SERIES, INVESTED_SERIES);
      axes(ctx, w, h, pad, b[0], b[1], moneyK);
      second = plot(ctx, INVESTED_SERIES, w, h, pad, b[0], b[1]);
      fillUnder(ctx, second, h, pad, alpha(T['ink-3'], 0.12));
      stroke(ctx, second, T['ink-3'], 1.25, [4, 3]);
      pts = plot(ctx, VALUE_SERIES, w, h, pad, b[0], b[1]);
    } else {
      b = bounds(VALUE_SERIES);
      axes(ctx, w, h, pad, b[0], b[1], moneyK);
      pts = plot(ctx, VALUE_SERIES, w, h, pad, b[0], b[1]);
      fillUnder(ctx, pts, h, pad, alpha(T['cobalt-line'], 0.13));
    }
    stroke(ctx, pts, T['cobalt-line'], 2);

    ctx.font = '11px "Libre Franklin", system-ui, sans-serif';
    ctx.fillStyle = T['ink-3'];
    ctx.textBaseline = 'top';
    ['ago 25', 'nov 25', 'feb 26', 'may 26', 'jul 26'].forEach(function (lab, i, a) {
      var x = pad.l + (w - pad.l - pad.r) * (i / (a.length - 1));
      ctx.textAlign = i === 0 ? 'left' : i === a.length - 1 ? 'right' : 'center';
      ctx.fillText(lab, x, h - pad.b + 6);
    });
  });

  function donut(ctx, w, h, slices, thick) {
    var cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 4, inner = r * (thick || 0.62), a = -Math.PI / 2;
    slices.forEach(function (s, i) {
      var sweep = s.w / 100 * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, a, a + sweep);
      ctx.arc(cx, cy, inner, a + sweep, a, true);
      ctx.closePath();
      ctx.fillStyle = T.ramp[i % 6];
      ctx.fill();
      ctx.strokeStyle = T.surface;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      a += sweep;
    });
  }

  var compBase = 'current';
  function weights() {
    var key = compBase === 'current' ? 'value' : 'cost';
    var tot = compBase === 'current' ? TOTAL_VALUE : TOTAL_COST;
    return POSITIONS.map(function (p) { return { t: p.t, w: p[key] / tot * 100, v: p[key] }; })
      .sort(function (a, b) { return b.w - a.w; });
  }

  register($('#portfolioDonutChart'), function (ctx, w, h) { donut(ctx, w, h, weights()); });

  register($('#holdingsBarChart'), function (ctx, w, h) {
    var ws = weights(), max = ws[0].w, pad = { l: 74, r: 46, t: 4, b: 4 };
    var rowH = (h - pad.t - pad.b) / ws.length;
    ctx.font = '11px "Libre Franklin", system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ws.forEach(function (s, i) {
      var y = pad.t + rowH * i + rowH / 2;
      var bw = (w - pad.l - pad.r) * (s.w / max);
      ctx.fillStyle = T.ramp[i % 6];
      ctx.fillRect(pad.l, y - 7, bw, 14);
      ctx.fillStyle = T['ink-2'];
      ctx.textAlign = 'right';
      ctx.fillText(s.t, pad.l - 8, y);
      ctx.fillStyle = T.ink;
      ctx.textAlign = 'left';
      ctx.fillText(s.w.toFixed(1) + '%', pad.l + bw + 6, y);
    });
  });

  register($('#assetClassDonutChart'), function (ctx, w, h) {
    donut(ctx, w, h, groupBy('klass').map(function (g) { return { w: g.w }; }));
  });
  register($('#sectorDonutChart'), function (ctx, w, h) {
    donut(ctx, w, h, groupBy('sector').map(function (g) { return { w: g.w }; }));
  });

  function groupBy(key) {
    var map = {};
    POSITIONS.forEach(function (p) { map[p[key]] = (map[p[key]] || 0) + p.value; });
    return Object.keys(map).map(function (k) {
      return { k: k, w: map[k] / TOTAL_VALUE * 100 };
    }).sort(function (a, b) { return b.w - a.w; });
  }

  register($('#perfLineChart'), function (ctx, w, h) {
    var pad = { l: 44, r: 12, t: 12, b: 22 };
    var b = bounds(PORT_BASE100, BENCH_SERIES);
    axes(ctx, w, h, pad, b[0], b[1], function (v) { return v.toFixed(0); });
    stroke(ctx, plot(ctx, BENCH_SERIES, w, h, pad, b[0], b[1]), T['ink-3'], 1.25, [4, 3]);
    stroke(ctx, plot(ctx, PORT_BASE100, w, h, pad, b[0], b[1]), T['cobalt-line'], 2);
    ctx.font = '11px "Libre Franklin", system-ui, sans-serif';
    ctx.fillStyle = T['ink-3'];
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('Cartera 138.4', pad.l + 6, pad.t + 8);
    ctx.fillText('S&P 500 121.6', pad.l + 6, pad.t + 24);
  });

  register($('#investmentValueChart'), function (ctx, w, h) {
    var pad = { l: 46, r: 12, t: 12, b: 20 };
    var b = bounds(VALUE_SERIES, INVESTED_SERIES);
    axes(ctx, w, h, pad, b[0], b[1], moneyK, 3);
    var inv = plot(ctx, INVESTED_SERIES, w, h, pad, b[0], b[1]);
    var val = plot(ctx, VALUE_SERIES, w, h, pad, b[0], b[1]);
    // La distancia entre las dos líneas es la ganancia no realizada: se tiñe.
    ctx.save();
    ctx.beginPath();
    val.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    for (var i = inv.length - 1; i >= 0; i--) ctx.lineTo(inv[i][0], inv[i][1]);
    ctx.closePath();
    ctx.fillStyle = alpha(T.pos, 0.14);
    ctx.fill();
    ctx.restore();
    stroke(ctx, inv, T['ink-3'], 1.25, [4, 3]);
    stroke(ctx, val, T['cobalt-line'], 2);
  });

  register($('#mcCanvas'), function (ctx, w, h) {
    var pad = { l: 48, r: 14, t: 12, b: 22 }, n = 121, i, k;
    var start = 85008.65, dark = root.getAttribute('data-theme') === 'dark';
    var qs = [[0.05, 0.95, 0.13], [0.10, 0.90, 0.26], [0.25, 0.75, 0.42]];
    var band = function (lo, hi) {
      var l = [], u = [];
      for (i = 0; i < n; i++) {
        var y = i / (n - 1) * 10;
        l.push(start * Math.pow(1 + (0.098 + (lo - 0.5) * 0.34), y) + 500 * 12 * y * (0.6 + lo * 0.8));
        u.push(start * Math.pow(1 + (0.098 + (hi - 0.5) * 0.34), y) + 500 * 12 * y * (0.6 + hi * 0.8));
      }
      return [l, u];
    };
    var all = [];
    var made = qs.map(function (q) { var bb = band(q[0], q[1]); all.push(bb[0], bb[1]); return { b: bb, a: q[2] }; });
    var med = band(0.5, 0.5)[0];
    all.push(med);
    var b = bounds.apply(null, all);
    b[0] = 0;
    axes(ctx, w, h, pad, b[0], b[1], moneyK, 4);
    made.forEach(function (m) {
      var lo = plot(ctx, m.b[0], w, h, pad, b[0], b[1]);
      var hi = plot(ctx, m.b[1], w, h, pad, b[0], b[1]);
      ctx.beginPath();
      hi.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
      for (k = lo.length - 1; k >= 0; k--) ctx.lineTo(lo[k][0], lo[k][1]);
      ctx.closePath();
      ctx.fillStyle = alpha(T['cobalt-line'], m.a * (dark ? 0.8 : 1));
      ctx.fill();
    });
    stroke(ctx, plot(ctx, med, w, h, pad, b[0], b[1]), T['cobalt-line'], 2);
    // La meta: línea punteada rotulada, no un color más en la leyenda.
    var gy = h - pad.b - (h - pad.t - pad.b) * (250000 - b[0]) / (b[1] - b[0]);
    stroke(ctx, [[pad.l, gy], [w - pad.r, gy]], T.ink, 1, [5, 4]);
    ctx.font = '11px "Libre Franklin", system-ui, sans-serif';
    ctx.fillStyle = T.ink;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Meta $250,000', w - pad.r, gy - 4);
  });

  register($('#whatifCanvas'), function (ctx, w, h) {
    var pad = { l: 46, r: 12, t: 12, b: 22 };
    var mine = VALUE_SERIES.map(function (v) { return v - CASH; });
    var b = bounds(mine, WHATIF_SERIES);
    axes(ctx, w, h, pad, b[0], b[1], moneyK, 4);
    stroke(ctx, plot(ctx, WHATIF_SERIES, w, h, pad, b[0], b[1]), T['ink-3'], 1.5, [4, 3]);
    stroke(ctx, plot(ctx, mine, w, h, pad, b[0], b[1]), T['cobalt-line'], 2);
    ctx.font = '11px "Libre Franklin", system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = T['cobalt-ink'] || T['cobalt-line'];
    ctx.fillText('Tu cartera', pad.l + 6, pad.t + 8);
    ctx.fillStyle = T['ink-3'];
    ctx.fillText('QQQ', pad.l + 6, pad.t + 24);
  });

  register($('#divMonthlyChart'), function (ctx, w, h) {
    var pad = { l: 44, r: 10, t: 10, b: 20 };
    var max = Math.max.apply(null, DIV_MONTHLY.map(function (d) { return d.v; })) * 1.15;
    axes(ctx, w, h, pad, 0, max, function (v) { return '$' + v.toFixed(0); }, 3);
    var step = (w - pad.l - pad.r) / DIV_MONTHLY.length;
    ctx.font = '10px "Libre Franklin", system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    DIV_MONTHLY.forEach(function (d, i) {
      var x = pad.l + step * i + step * 0.18;
      var bw = step * 0.64;
      var bh = (h - pad.t - pad.b) * (d.v / max);
      var y = h - pad.b - bh;
      if (d.f) {
        // Estimado: contorno punteado. Nunca se pinta como si fuera un hecho.
        ctx.save();
        ctx.setLineDash([3, 2]);
        ctx.strokeStyle = T['cobalt-line'];
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
        ctx.fillStyle = alpha(T['cobalt-line'], 0.13);
        ctx.fillRect(x, y, bw, bh);
        ctx.restore();
      } else {
        ctx.fillStyle = T['cobalt-line'];
        ctx.fillRect(x, y, bw, bh);
      }
      if (i % 2 === 0) {
        ctx.fillStyle = T['ink-3'];
        ctx.fillText(d.m, x + bw / 2, h - pad.b + 5);
      }
    });
  });

  /* ------------------------------------------------- 7. Minigráficas     */

  function sparkPath(seed, up) {
    var r = rng(seed), pts = [], i, v = 50;
    for (i = 0; i < 30; i++) { v += (r() - 0.5) * 14 + (up ? 0.9 : -0.9); pts.push(v); }
    var lo = Math.min.apply(null, pts), hi = Math.max.apply(null, pts), sp = (hi - lo) || 1;
    return pts.map(function (p, i) {
      return (i / 29 * 60 + 1).toFixed(1) + ',' + (16 - (p - lo) / sp * 14).toFixed(1);
    }).join(' ');
  }
  function spark(seed, up) {
    return '<svg class="spark" viewBox="0 0 62 18" aria-hidden="true" focusable="false">' +
      '<polyline fill="none" stroke="' + (up ? 'var(--pos)' : 'var(--neg)') + '" stroke-width="1.25" ' +
      'stroke-linejoin="round" stroke-linecap="round" points="' + sparkPath(seed, up) + '"/></svg>';
  }

  /* --------------------------------------------------- 8. Renderizado    */

  function badge(t) { return '<span class="tk__badge" aria-hidden="true">' + esc(t.slice(0, 2)) + '</span>'; }

  function renderPortfolios() {
    var tb = $('#portfolioCardsGrid tbody');
    if (!tb) return;
    tb.innerHTML = PORTFOLIOS.map(function (p) {
      return '<tr tabindex="0" data-open-dash>' +
        '<td><span class="tk">' + badge(p.name) + '<span><span class="tk__sym">' + esc(p.name) + '</span>' +
          '<span class="tk__name">' + esc(p.sub) + '</span></span></span></td>' +
        '<td class="th-spark">' + spark(p.seed, p.ret > 0) + '</td>' +
        '<td class="n">' + money(p.value) + '</td>' +
        '<td class="n ' + cls(p.day) + '"><span class="' + arrow(p.day) + '">' + pct(p.day) + '</span></td>' +
        '<td class="n ' + cls(p.ret) + '">' + pct(p.ret) + '</td>' +
        '<td><button class="row-act" type="button" aria-label="Opciones de ' + esc(p.name) + '">' +
          '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/></svg>' +
        '</button></td></tr>';
    }).join('');
  }

  function renderWatchlist() {
    var tb = $('#watchlistTableBody');
    if (!tb) return;
    tb.innerHTML = WATCHLIST.map(function (a) {
      return '<tr>' +
        '<td><span class="tk">' + badge(a.t) + '<span><span class="tk__sym">' + esc(a.t) + '</span>' +
          '<span class="tk__name">' + esc(a.name) + '</span></span></span></td>' +
        '<td class="th-spark">' + spark(a.seed, a.day > 0) + '</td>' +
        '<td class="n">' + money(a.px) + '</td>' +
        '<td class="n ' + cls(a.day) + '"><span class="' + arrow(a.day) + '">' + pct(a.day) + '</span></td>' +
        '<td><button class="row-act" type="button" aria-label="Quitar ' + esc(a.t) + ' de la lista">' +
          '<svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>' +
        '</button></td></tr>';
    }).join('');
  }

  var sortKey = 'value', sortDir = -1, search = '';
  var SORTERS = {
    ticker: function (p) { return p.t; }, date: function (p) { return p.date; },
    avg: function (p) { return p.avg; }, price: function (p) { return p.px; },
    day: function (p) { return p.day; }, qty: function (p) { return p.qty; },
    cost: function (p) { return p.cost; }, value: function (p) { return p.value; },
    return: function (p) { return p.ret; }
  };

  function renderPositions() {
    var tb = $('#positionsTableBody');
    if (!tb) return;
    var rows = POSITIONS.filter(function (p) {
      return !search || p.t.toLowerCase().indexOf(search) >= 0 || p.name.toLowerCase().indexOf(search) >= 0;
    }).slice().sort(function (a, b) {
      var ka = SORTERS[sortKey](a), kb = SORTERS[sortKey](b);
      return (ka < kb ? -1 : ka > kb ? 1 : 0) * sortDir;
    });

    $('#posCountLabel').textContent = rows.length + (rows.length === 1 ? ' activo' : ' activos');
    $('#noPositionsMsg').hidden = rows.length > 0;
    $('#positionsTableShell').hidden = rows.length === 0;

    tb.innerHTML = rows.map(function (p) {
      return '<tr>' +
        '<th scope="row" class="th-freeze"><span class="tk">' + badge(p.t) +
          '<span><span class="tk__sym">' + esc(p.t) + '</span><span class="tk__name">' + esc(p.name) + '</span></span></span></th>' +
        '<td class="th-spark">' + spark(p.seed, p.ret > 0) + '</td>' +
        '<td>' + p.date.split('-').reverse().join('/') + '</td>' +
        '<td class="n">' + money(p.avg) + '</td>' +
        '<td class="n js-px">' + money(p.px) + '</td>' +
        '<td class="n js-px ' + cls(p.day) + '"><span class="' + arrow(p.day) + '">' + pct(p.day) + '</span></td>' +
        '<td class="n">' + nfNum.format(p.qty) + '</td>' +
        '<td class="n">' + money(p.cost) + '</td>' +
        '<td class="n js-px">' + money(p.value) + '</td>' +
        '<td class="n ' + cls(p.ret) + '">' + pct(p.ret) + '<span class="tk__name">' + signed(p.pnl) + '</span></td>' +
        '<td class="n ' + cls(p.bench) + '">' + pct(p.bench, 1) + ' pp</td>' +
        '<td><button class="row-act" type="button" aria-label="Opciones de ' + esc(p.t) + '">' +
          '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/></svg>' +
        '</button></td></tr>';
    }).join('');
  }

  function renderLegend(el, rows, withValue) {
    if (!el) return;
    el.innerHTML = rows.map(function (r, i) {
      return '<li><i style="background:' + T.ramp[i % 6] + '"></i><b>' + esc(r.k) + '</b>' +
        (withValue ? '<span class="n">' + money0(r.v) + '</span>' : '') +
        '<span class="n n--w">' + r.w.toFixed(1) + '%</span></li>';
    }).join('');
  }

  function renderComposition() {
    renderLegend($('#donutLegend'), weights().map(function (s) { return { k: s.t, w: s.w, v: s.v }; }), true);
    renderLegend($('#assetClassDonutLegend'), groupBy('klass'));
    renderLegend($('#sectorDonutLegend'), groupBy('sector'));
    $('#compositionSub').textContent = compBase === 'current' ? 'Sobre el valor actual' : 'Sobre el capital invertido';
    $('#holdingsBarSubtitle').textContent = compBase === 'current' ? 'Por valor actual' : 'Por capital invertido';

    // Mapa de calor: el área es el peso, el color es el retorno del día.
    var tm = $('#holdingsTreemap');
    if (tm) {
      var ws = weights();
      tm.innerHTML = ws.map(function (s) {
        var p = POSITIONS.filter(function (x) { return x.t === s.t; })[0];
        var span = Math.max(2, Math.round(s.w / 100 * 12));
        var rows = s.w > 20 ? 3 : s.w > 10 ? 2 : 1;
        var mag = Math.min(0.3 + Math.abs(p.day) / 4 * 0.7, 1);
        return '<div class="treemap__cell tint tint--' + (p.day >= 0 ? 'pos' : 'neg') + '" ' +
          'style="grid-column:span ' + span + ';grid-row:span ' + rows + ';--m:' + mag.toFixed(3) + '" ' +
          'title="' + esc(p.t) + ' · ' + s.w.toFixed(1) + '% · ' + pct(p.day) + ' hoy">' +
          '<b>' + esc(s.t) + '</b><span>' + pct(p.day) + '</span></div>';
      }).join('');
    }
  }

  function renderAttribution() {
    var el = $('#attributionChartWrap');
    if (!el) return;
    var rows = POSITIONS.map(function (p) { return { t: p.t, v: p.pnl / TOTAL_COST * 100 }; })
      .sort(function (a, b) { return b.v - a.v; });
    var max = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.v); }));
    el.innerHTML = rows.map(function (r) {
      var w = Math.abs(r.v) / max * 50;
      return '<div class="bars__row"><span class="bars__lab">' + esc(r.t) + '</span>' +
        '<span class="bars__track"><span class="bars__zero" style="left:50%"></span>' +
        '<span class="bars__fill bars__fill--' + (r.v >= 0 ? 'pos' : 'neg') + '" style="' +
        (r.v >= 0 ? 'left:50%;width:' + w + '%' : 'left:' + (50 - w) + '%;width:' + w + '%') + '"></span></span>' +
        '<span class="bars__val ' + cls(r.v) + '">' + pct(r.v) + ' pp</span></div>';
    }).join('');
  }

  function renderRisk() {
    var el = $('#riskContribWrap');
    if (!el) return;
    var max = Math.max.apply(null, RISK_CONTRIB.map(function (r) { return Math.max(r.risk, r.w); })) * 1.1;
    // Todas las barras van en cobalto: el rojo de esta paleta significa pérdida
    // y BTC-USD es el mayor ganador de la cartera. El exceso de riesgo se dice
    // con palabras y con la marca del peso, no repintando la barra.
    el.innerHTML = RISK_CONTRIB.slice().sort(function (a, b) { return b.risk - a.risk; }).map(function (r) {
      var gap = r.risk - r.w;
      return '<div class="bars__row"><span class="bars__lab">' + esc(r.t) + '</span>' +
        '<span class="bars__track"><span class="bars__fill bars__fill--seq" style="left:0;width:' + (r.risk / max * 100) + '%"></span>' +
        '<span class="bars__mark" style="left:' + (r.w / max * 100) + '%" title="Peso en capital ' + r.w.toFixed(1) + '%"></span></span>' +
        '<span class="bars__val">' + r.risk.toFixed(1) + '%<span class="tk__name' + (gap > 3 ? ' neg' : '') + '">' +
        (gap > 3 ? '+' + gap.toFixed(1) + ' pp sobre su peso' : 'peso ' + r.w.toFixed(1) + '%') + '</span></span></div>';
    }).join('');
  }

  function renderCorr() {
    var wrap = $('#corrMatrixWrap');
    if (!wrap) return;
    var head = '<tr><th scope="col"></th>' + CORR_KEYS.map(function (k) { return '<th scope="col">' + esc(k) + '</th>'; }).join('') + '</tr>';
    var body = CORR.map(function (row, i) {
      return '<tr><th scope="row">' + esc(CORR_KEYS[i]) + '</th>' + row.map(function (v, j) {
        if (i === j) return '<td class="is-self">—</td>';
        // La intensidad va en `--m`; el tope por tema lo pone `app-ui-v4.css`.
        return '<td class="tint' + (v >= 0 ? '' : ' tint--neg') + '" style="--m:' +
          Math.min(Math.abs(v), 1).toFixed(3) + '">' + v.toFixed(2) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    wrap.innerHTML = '<table class="corr"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>';

    var pairs = [];
    CORR.forEach(function (row, i) {
      row.forEach(function (v, j) { if (j > i) pairs.push({ a: CORR_KEYS[i], b: CORR_KEYS[j], v: v }); });
    });
    pairs.sort(function (x, y) { return y.v - x.v; });
    $('#corrTopPairs').innerHTML = '<ul class="top-pairs">' + pairs.slice(0, 3).map(function (p) {
      return '<li><span>' + esc(p.a) + ' y ' + esc(p.b) + '</span><b>' + p.v.toFixed(2) + '</b></li>';
    }).join('') + pairs.slice(-1).map(function (p) {
      return '<li><span>Menos correlacionado: ' + esc(p.a) + ' y ' + esc(p.b) + '</span><b>' + p.v.toFixed(2) + '</b></li>';
    }).join('') + '</ul>';
  }

  function renderRebal() {
    var tb = $('#rebalTable tbody');
    if (!tb) return;
    var targets = { 'VOO': 30, 'AAPL': 15, 'MSFT': 15, 'NVDA': 8, 'BTC-USD': 22, 'NAFTRAC.MX': 10 };
    tb.innerHTML = POSITIONS.slice().sort(function (a, b) { return b.value - a.value; }).map(function (p) {
      var w = p.value / TOTAL_VALUE * 100;
      var tgt = targets[p.t];
      var tv = TOTAL_VALUE * tgt / 100;
      var diff = tgt - w;
      var act = Math.abs(diff) < 1
        ? '<span class="tag">Mantener</span>'
        : '<span class="tag ' + (diff > 0 ? 'tag--ok' : 'tag--warn') + '">' + (diff > 0 ? 'Comprar ' : 'Vender ') + money0(Math.abs(tv - p.value)) + '</span>';
      return '<tr><th scope="row" class="th-freeze">' + esc(p.t) + '</th>' +
        '<td class="n">' + money(p.value) + '</td>' +
        '<td class="n">' + w.toFixed(2) + '%</td>' +
        '<td class="n">' + tgt.toFixed(2) + '%</td>' +
        '<td class="n">' + money(tv) + '</td>' +
        '<td class="n ' + cls(diff) + '">' + pct(diff) + '</td>' +
        '<td>' + act + '</td></tr>';
    }).join('');
  }

  function renderTx() {
    var tb = $('#txTableBody');
    if (!tb) return;
    var f = {
      ty: $('#txFilterType').value, t: $('#txFilterTicker').value.trim().toUpperCase(),
      from: $('#txFilterFrom').value, to: $('#txFilterTo').value
    };
    var n = 0;
    ['ty', 't', 'from', 'to'].forEach(function (k) { if (f[k]) n++; });
    var count = $('#txFiltersCount');
    count.hidden = n === 0;
    count.textContent = n;

    var rows = TRANSACTIONS.filter(function (x) {
      return (!f.ty || x.ty === f.ty) && (!f.t || x.t.indexOf(f.t) >= 0) &&
             (!f.from || x.d >= f.from) && (!f.to || x.d <= f.to);
    });
    $('#txCountLabel').textContent = rows.length + ' movimientos · de nov 2022 a jul 2026';
    $('#noTxMsg').hidden = rows.length > 0;
    $('#txTableShell').hidden = rows.length === 0;

    tb.innerHTML = rows.map(function (x) {
      var tone = x.ty === 'VENTA' ? 'tag--warn' : x.ty === 'DIVIDENDO' ? 'tag--ok' : '';
      return '<tr><th scope="row" class="th-freeze">' + x.d.split('-').reverse().join('/') + '</th>' +
        '<td><span class="tag ' + tone + '">' + x.ty.toLowerCase() + '</span></td>' +
        '<td><span class="tk__sym">' + esc(x.t) + '</span></td>' +
        '<td class="n">' + nfNum.format(x.q) + '</td>' +
        '<td class="n">' + money(x.px) + '</td>' +
        '<td class="n">' + (x.comm ? money(x.comm) : '—') + '</td>' +
        '<td class="n ' + cls(x.net) + '">' + signed(x.net) + '</td>' +
        '<td><button class="row-act" type="button" aria-label="Opciones del movimiento">' +
          '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/></svg>' +
        '</button></td></tr>';
    }).join('');
  }

  function renderClosed() {
    var tb = $('#closedTradesBody');
    if (!tb) return;
    tb.innerHTML = CLOSED.map(function (c) {
      return '<tr><th scope="row" class="th-freeze">' + esc(c.t) + '</th>' +
        '<td>' + c.buy.split('-').reverse().join('/') + '</td>' +
        '<td>' + c.sell.split('-').reverse().join('/') + '</td>' +
        '<td class="n">' + c.hold + '</td>' +
        '<td class="n">' + nfNum.format(c.q) + '</td>' +
        '<td class="n">' + money(c.pb) + '</td>' +
        '<td class="n">' + money(c.ps) + '</td>' +
        '<td class="n ' + cls(c.pl) + '">' + signed(c.pl) + '</td>' +
        '<td class="n ' + cls(c.r) + '">' + pct(c.r) + '</td></tr>';
    }).join('');
  }

  function renderDividends() {
    var a = $('#divByTickerTable tbody');
    if (a) a.innerHTML = DIV_BY_TICKER.map(function (d) {
      return '<tr><td><span class="tk__sym">' + esc(d.t) + '</span></td>' +
        '<td class="n">' + d.n + '</td><td class="n">' + money(d.total) + '</td>' +
        '<td>' + d.last + '</td><td class="n">' + d.y.toFixed(2) + '%</td></tr>';
    }).join('');
    var b = $('#divForecastTable tbody');
    if (b) b.innerHTML = DIV_FORECAST.map(function (d) {
      return '<tr><td>' + d.d + '</td><td><span class="tk__sym">' + esc(d.t) + '</span></td>' +
        '<td class="n">' + money(d.ps) + '</td><td class="n">' + nfNum.format(d.q) + '</td>' +
        '<td class="n">' + money(d.est) + '</td></tr>';
    }).join('');
  }

  function renderGeo() {
    var el = $('#geoWorldMap');
    if (!el) return;
    var g = groupBy('geo');
    el.innerHTML = g.map(function (x) {
      return '<div class="geo__row"><span class="geo__bar" style="width:' + x.w.toFixed(1) + '%"></span></div>';
    }).join('');
    renderLegend($('#geoDonutLegend'), g);
  }

  function renderStats(el, rows) {
    if (!el) return;
    el.innerHTML = '<div class="ledger__row">' + rows.map(function (r) {
      return '<div class="ledger__cell"><dt>' + esc(r[0]) + '</dt><dd><b>' + esc(r[1]) + '</b><em>' + esc(r[2]) + '</em></dd></div>';
    }).join('') + '</div>';
  }

  /* ----------------------------------------------------- 9. Pestañas     */

  var tabs = $$('.tabs__btn'), strip = $('#trackerTabs'), ink = $('.tabs__ink');

  function moveInk(instant) {
    var on = strip.querySelector('[aria-selected="true"]');
    if (!on || !ink) return;
    if (instant) ink.style.transition = 'none';
    ink.style.transform = 'translateX(' + on.offsetLeft + 'px) scaleX(' + on.offsetWidth + ')';
    if (instant) { void ink.offsetWidth; ink.style.transition = ''; }
  }

  function selectTab(btn, focus) {
    tabs.forEach(function (b) {
      var on = b === btn;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(b.getAttribute('aria-controls'));
      if (!panel) return;
      panel.hidden = !on;
      if (on) {
        panel.setAttribute('data-entering', '');
        window.setTimeout(function () { panel.removeAttribute('data-entering'); }, 240);
      }
    });
    moveInk(false);
    btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (focus) btn.focus();
    repaint();
  }

  tabs.forEach(function (b, i) {
    b.addEventListener('click', function () { selectTab(b, false); });
    b.addEventListener('keydown', function (e) {
      var next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1
        : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
      if (next < 0 || next >= tabs.length) return;
      e.preventDefault();
      selectTab(tabs[next], true);
    });
  });

  /* ------------------------------------------- 10. Segmentos y periodos  */

  function moveThumb(seg, instant) {
    var thumb = seg.querySelector('.seg__thumb');
    var on = seg.querySelector('button[aria-pressed="true"]');
    if (!thumb || !on) return;
    if (instant) thumb.style.transition = 'none';
    thumb.style.transform = 'translateX(' + (on.offsetLeft - 2) + 'px) scaleX(' + on.offsetWidth + ')';
    if (instant) { void thumb.offsetWidth; thumb.style.transition = ''; }
  }

  function wireSeg(seg, onChange) {
    if (!seg) return;
    var btns = $$('button', seg);
    btns.forEach(function (b, i) {
      b.tabIndex = b.getAttribute('aria-pressed') === 'true' ? 0 : -1;
      b.addEventListener('click', function () {
        btns.forEach(function (o) {
          var on = o === b;
          o.setAttribute('aria-pressed', String(on));
          o.tabIndex = on ? 0 : -1;
        });
        moveThumb(seg, false);
        if (onChange) onChange(b);
      });
      b.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
        if (n < 0 || n >= btns.length) return;
        e.preventDefault();
        btns[n].click();
        btns[n].focus();
      });
    });
    moveThumb(seg, true);
  }

  $$('.periods').forEach(function (g) {
    $$('button', g).forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.id === 'valueCustomBtn') {
          var pop = $('#valueCustomPopover');
          pop.hidden = !pop.hidden;
          if (!pop.hidden) $('#valueCustomFrom').focus();
          return;
        }
        $$('button', g).forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        var pop2 = $('#valueCustomPopover');
        if (pop2) pop2.hidden = true;
      });
    });
  });

  wireSeg($('#valueSeriesToggle'), function (b) {
    valueMode = b.dataset.series;
    var st = $('#valueChartStatus');
    st.textContent = valueMode === 'benchmark'
      ? 'Ambas series en base 100 desde el 30 de julio de 2025. La punteada es el S&P 500.'
      : valueMode === 'invested'
        ? 'La banda punteada es el capital invertido acumulado; la distancia es la ganancia no realizada.'
        : 'Valor de mercado de las posiciones más el efectivo.';
    repaint();
  });
  wireSeg($('#donutBaseToggle'), function (b) { compBase = b.dataset.base; renderComposition(); repaint(); });
  wireSeg($('#compositionToggle'), function (b) {
    var card = $('#compositionCard');
    card.dataset.comp = b.dataset.comp;
    $$('.comp[data-comp-panel]', card).forEach(function (p) { p.hidden = p.dataset.compPanel !== b.dataset.comp; });
    repaint();
  });
  wireSeg($('#posReturnPeriodToggle'), function (b) {
    var map = { total: 'Retorno', '1d': 'Retorno 1D', '1w': 'Retorno 1S', '1m': 'Retorno 1M', ytd: 'Retorno YTD' };
    $('#thPosReturn .th-sort').firstChild.nodeValue = map[b.dataset.period];
  });

  /* ------------------------------------------------- 11. Tabla: orden    */

  $$('.th-sort[data-sort]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.dataset.sort;
      if (sortKey === k) sortDir *= -1;
      else { sortKey = k; sortDir = (k === 'ticker' || k === 'date') ? 1 : -1; }
      $$('#positionsTable thead th').forEach(function (th) { th.removeAttribute('aria-sort'); });
      b.closest('th').setAttribute('aria-sort', sortDir === 1 ? 'ascending' : 'descending');
      renderPositions();
    });
  });

  var searchInput = $('#positionsSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      search = searchInput.value.trim().toLowerCase();
      renderPositions();
    });
  }

  var densityBtn = $('#positionsDensityBtn');
  if (densityBtn) {
    densityBtn.addEventListener('click', function () {
      var dense = densityBtn.getAttribute('aria-pressed') !== 'true';
      densityBtn.setAttribute('aria-pressed', String(dense));
      $('#tabPanelSummary').classList.toggle('is-dense', dense);
    });
  }

  $$('#txFiltersPanel input, #txFiltersPanel select').forEach(function (el) {
    el.addEventListener('input', renderTx);
    el.addEventListener('change', renderTx);
  });
  var txClear = $('#txFilterClear');
  if (txClear) {
    txClear.addEventListener('click', function () {
      $$('#txFiltersPanel input, #txFiltersPanel select').forEach(function (el) { el.value = ''; });
      renderTx();
    });
  }
  var txToggle = $('#txFiltersToggleBtn');
  if (txToggle) {
    txToggle.addEventListener('click', function () {
      var panel = $('#txFiltersPanel');
      panel.hidden = !panel.hidden;
      txToggle.setAttribute('aria-expanded', String(!panel.hidden));
    });
  }

  /* --------------------------------------------------- 12. Interacción   */

  // Cambio de vista
  function showView(which) {
    $('#trackerListView').hidden = which !== 'list';
    $('#trackerDashView').hidden = which !== 'dash';
    window.scrollTo({ top: 0, behavior: 'auto' });
    repaint();
  }
  $('#backToListBtn').addEventListener('click', function () { showView('list'); });
  document.addEventListener('click', function (e) {
    var row = e.target.closest('[data-open-dash]');
    if (row && !e.target.closest('.row-act')) showView('dash');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var row = e.target.closest && e.target.closest('[data-open-dash]');
    if (row) { e.preventDefault(); showView('dash'); }
  });

  // Menú de exportación
  var menuTrigger = $('#exportMenuTrigger'), menuList = $('#trackerExportMenu .menu__list');
  menuTrigger.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = menuList.hidden;
    menuList.hidden = !open;
    menuTrigger.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', function () {
    if (!menuList.hidden) { menuList.hidden = true; menuTrigger.setAttribute('aria-expanded', 'false'); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menuList.hidden) { menuList.hidden = true; menuTrigger.setAttribute('aria-expanded', 'false'); menuTrigger.focus(); }
  });

  // Diálogos
  function openDlg(id) {
    var d = document.getElementById(id);
    d.hidden = false;
    d.dataset.returnTo = document.activeElement && document.activeElement.id;
    // El foco entra en el primer campo, no en la equis: una lista de selectores
    // CSS empata por orden del documento, y ahí el botón de cerrar va primero.
    var f = d.querySelector('input:not([type=hidden]), select, textarea') || d.querySelector('button');
    if (f) f.focus();
  }
  function closeDlg(d) {
    d.hidden = true;
    var back = d.dataset.returnTo && document.getElementById(d.dataset.returnTo);
    if (back) back.focus();
  }
  $('#addPositionBtn').addEventListener('click', function () { openDlg('addPositionModal'); });
  $('#newPortfolioBtn').addEventListener('click', function () { openDlg('newPortfolioModal'); });
  $$('.dlg').forEach(function (d) {
    d.addEventListener('mousedown', function (e) { if (e.target === d) closeDlg(d); });
    $$('[data-close-dlg], #closePositionModalBtn, #closePortfolioModalBtn', d).forEach(function (b) {
      b.addEventListener('click', function () { closeDlg(d); });
    });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeDlg(d); return; }
      if (e.key !== 'Tab') return;
      var f = $$('button, input, select, textarea, a[href]', d).filter(function (x) { return !x.disabled && x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    var form = d.querySelector('form');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); closeDlg(d); });
  });
  var ivaCheck = $('#posIvaCheck');
  if (ivaCheck) ivaCheck.addEventListener('change', function () { $('#posIvaRateRow').hidden = !ivaCheck.checked; });
  var mcInfl = $('#mcInflEnabled');
  if (mcInfl) mcInfl.addEventListener('change', function () { $('#mcInflRate').disabled = !mcInfl.checked; });

  // Destello del dato actualizado: el único movimiento que celebra un cambio.
  var refresh = $('#refreshPricesBtn'), status = $('#dashPriceStatus');
  refresh.addEventListener('click', function () {
    refresh.disabled = true;
    refresh.setAttribute('aria-busy', 'true');
    status.textContent = 'Consultando Yahoo Finance y CoinGecko…';
    window.setTimeout(function () {
      refresh.disabled = false;
      refresh.removeAttribute('aria-busy');
      status.textContent = 'Precios al ' + new Date().toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' · Yahoo Finance y CoinGecko';
      $$('.js-px, .ledger__fig').forEach(function (el) {
        el.classList.remove('is-fresh');
        void el.offsetWidth;
        el.classList.add('is-fresh');
      });
    }, 900);
  });

  // Notas de ayuda: burbuja anclada al signo, fuera del recorte de la tabla.
  var pop = null;
  function hidePop() { if (pop) { pop.remove(); pop = null; } }
  document.addEventListener('pointerover', function (e) {
    var h = e.target.closest && e.target.closest('.hint');
    if (!h) return;
    hidePop();
    pop = document.createElement('div');
    pop.className = 'hint-pop';
    pop.textContent = h.dataset.hint;
    document.body.appendChild(pop);
    var r = h.getBoundingClientRect(), pr = pop.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(window.innerWidth - pr.width - 8, r.left - pr.width / 2 + r.width / 2)) + 'px';
    pop.style.top = (r.top > pr.height + 12 ? r.top - pr.height - 8 : r.bottom + 8) + 'px';
  });
  document.addEventListener('pointerout', function (e) { if (e.target.closest && e.target.closest('.hint')) hidePop(); });
  document.addEventListener('focusin', function (e) { if (!e.target.closest || !e.target.closest('.hint')) hidePop(); });

  // Asistente
  var assist = $('#aiChatPanel');
  $('#trackerAiChatBtn').addEventListener('click', function () {
    assist.hidden = false;
    assist.classList.remove('assist--min');
    if (!$('#aiChatMessages').children.length) {
      say('bot', 'Leo esta cartera: 6 posiciones, $85,008.65 y 31.5% en BTC-USD. Pregúntame lo que quieras sobre su composición o su riesgo.');
    }
    $('#aiChatInput').focus();
  });
  $('#aiChatCloseBtn').addEventListener('click', function () { assist.hidden = true; $('#trackerAiChatBtn').focus(); });
  $('#aiChatMinBtn').addEventListener('click', function () { assist.classList.toggle('assist--min'); });
  function say(who, text) {
    var d = document.createElement('div');
    d.className = 'assist__msg assist__msg--' + who;
    d.textContent = text;
    $('#aiChatMessages').appendChild(d);
    $('#aiChatMessages').scrollTop = 1e6;
  }
  $$('#aiChatSuggestions button').forEach(function (b) {
    b.addEventListener('click', function () { ask(b.dataset.q); });
  });
  $('#aiChatForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('#aiChatInput').value.trim();
    if (v) { ask(v); $('#aiChatInput').value = ''; }
  });
  function ask(q) {
    say('me', q);
    window.setTimeout(function () {
      say('bot', 'En el prototipo no hay llamada al modelo. En la app real esta respuesta viene de /api/ai/insights con los pesos y las métricas de la cartera — nunca con tu nombre ni tu correo.');
    }, 500);
  }

  /* ------------------------------------------------ 13. Estados (proto)  */

  var protoBar = $('#protoBar');
  $('#protoStatesBtn').addEventListener('click', function () { protoBar.hidden = !protoBar.hidden; });
  $('#protoClose').addEventListener('click', function () { protoBar.hidden = true; });

  function setState(state) {
    var panel = $('#tabPanelSummary');
    var shell = $('#positionsTableShell');
    var empty = $('#noPositionsMsg');
    // Se limpia siempre antes de aplicar: los estados no se acumulan.
    $$('.notice', panel).forEach(function (n) { n.remove(); });
    panel.classList.remove('is-loading');
    shell.hidden = false;
    empty.hidden = true;

    if (state === 'loading') {
      shell.hidden = true;
      var sk = document.createElement('div');
      sk.className = 'notice';
      sk.innerHTML = '<b>Cargando posiciones</b><p><span class="skel skel--line" style="width:60%"></span><br>' +
        '<span class="skel skel--line" style="width:80%"></span><br><span class="skel skel--line" style="width:45%"></span></p>';
      panel.appendChild(sk);
    } else if (state === 'empty') {
      shell.hidden = true;
      empty.hidden = false;
    } else if (state === 'error') {
      shell.hidden = true;
      var er = document.createElement('div');
      er.className = 'notice';
      er.innerHTML = '<b>No pudimos traer los precios</b>' +
        '<p>Yahoo Finance no respondió en 10 segundos. Las cantidades y los costos que ves siguen siendo correctos; sólo faltan los precios de mercado.</p>' +
        '<button class="btn btn--quiet btn--sm" type="button">Reintentar</button>';
      panel.appendChild(er);
      $('#dashPriceStatus').textContent = 'Precios sin actualizar desde hace 3 horas';
      $('#dashPriceStatus').classList.add('is-stale');
    } else if (state === 'locked') {
      shell.hidden = true;
      var lk = document.createElement('div');
      lk.className = 'notice notice--plan';
      lk.innerHTML = '<b>El detalle por posición es del plan Advisor</b>' +
        '<p>Tu plan Starter incluye el valor, el retorno y la composición de hasta dos carteras. El desglose por posición, el rebalanceo y el reporte PDF vienen con Advisor.</p>' +
        '<a class="btn btn--primary btn--sm" href="planes-v4.html">Ver los planes</a>';
      panel.appendChild(lk);
    } else {
      $('#dashPriceStatus').classList.remove('is-stale');
    }
    $$('#protoBar button[data-state]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.state === state));
    });
  }
  $$('#protoBar button[data-state]').forEach(function (b) {
    b.addEventListener('click', function () { setState(b.dataset.state); });
  });

  /* ----------------------------------------------------- 14. Tema        */

  var themeBtn = $('#themeToggle');
  function applyTheme(theme, animate) {
    if (animate) {
      root.classList.add('is-theming');
      window.setTimeout(function () { root.classList.remove('is-theming'); }, 340);
    }
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('bp-theme', theme); } catch (e) { /* sin almacenamiento */ }
    var dark = theme === 'dark';
    themeBtn.setAttribute('aria-pressed', String(dark));
    themeBtn.setAttribute('aria-label', dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    readTokens();
    renderComposition();
    renderCorr();
    renderGeo();
    repaint();
  }
  themeBtn.addEventListener('click', function () {
    applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
  });

  /* --------------------------------------------------- 15. Arranque      */

  readTokens();
  renderPortfolios();
  renderWatchlist();
  renderPositions();
  renderComposition();
  renderAttribution();
  renderRisk();
  renderCorr();
  renderRebal();
  renderTx();
  renderClosed();
  renderDividends();
  renderGeo();
  renderStats($('#mcStatsGrid'), MC_STATS);
  renderStats($('#goalStatsGrid'), GOAL_STATS);
  renderStats($('#whatifStatsGrid'), WHATIF_STATS);
  applyTheme(root.getAttribute('data-theme') || 'light', false);

  var raf = null;
  function schedule() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () {
      raf = null;
      moveInk(true);
      $$('.seg').forEach(function (s) { moveThumb(s, true); });
      repaint();
    });
  }
  window.addEventListener('resize', schedule);
  if (window.ResizeObserver) new ResizeObserver(schedule).observe(document.body);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  schedule();
})();
