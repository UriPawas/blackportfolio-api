/* Campo · Tracker, inicio ("Portafolios"): modelo de datos (window.CampoTracker), cabecera y bloque consolidado
   (cifras + área apilada por portafolio). La lista y el detalle (#tkList, #tkDetail) los pinta _dev_proto-campo-tracker-list.js.
   En producción, con los datos reales de campo/datos.js. Contrato: docs/rediseno-gbm-2026-11/16-spec-tracker-inicio.md. Expone window.CampoTracker y window.__tracker. */
(function () {
  'use strict';
  var D = window.PORTIFY_DEMO, doc = document, root = doc.documentElement;
  var sec = doc.getElementById('secTracker');
  if (!D || !sec) return;
  var fmt = D.fmt, TOT = 252, LAST = TOT - 1;
  var rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
  function reduce() { return rmq.matches; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function easeOut(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 4); } /* ~ cubic-bezier(.23,1,.32,1) */
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* ============================== modelo ============================== */
  /* producción: window.CAMPO_REAL (campo/datos.js) trae portafolios, libros y trayectorias de precio REALES; nada se sintetiza */
  var REAL = window.CAMPO_REAL || null;
  function readonly() { var t = doc.getElementById('toast'); if (t && REAL) { t.textContent = REAL.readonlyMsg; t.classList.add('on'); clearTimeout(readonly.t); readonly.t = setTimeout(function () { t.classList.remove('on'); }, 4200); } }
  var dates = D.series.dates.slice(0, TOT);
  var fxHist = D.markets.filter(function (m) { return m.sym === 'USD/MXN'; })[0].hist;
  var fxSeries = new Float64Array(TOT);
  for (var i = 0; i < TOT; i++) fxSeries[i] = fxHist[i] / fxHist[LAST] * D.usdmxn; /* USD/MXN de CADA fecha, anclado al de hoy */

  /* ===== Generador ÚNICO de trayectorias (lo usan Inicio, Tracker y todas las pestañas del portafolio) =====
     Modelo de factores sobre rendimientos log diarios REALIZADOS, en moneda local de cada activo:
       r(i,t) = α_i + β_SP·SP_t + β_IPC·IPC_t + β_BTC·BTC_t + β_TEC·TEC_t + s_i·ε(i,t)
     SP = S&P 500 en dólares, IPC = S&P/BMV IPC, BTC = Bitcoin en dólares (los tres del panel de Mercados);
     TEC = lo que el Nasdaq 100 hace de más o de menos que el S&P (Nasdaq − S&P); ε = idiosincrático sembrado por ticker.
     Corrección 22-nov: antes los factores se estandarizaban (media 0), así que la tendencia del mercado NO llegaba a las
     posiciones: VOO en pesos no se parecía al S&P en pesos del Inicio. Ahora VOO ≈ S&P y BTC = Bitcoin de Mercados.
     La trayectoria termina EXACTAMENTE en el precio y en la variación de hoy (d1). */
  function lr(a) { var r = new Float64Array(TOT); for (var i = 1; i < TOT; i++) r[i] = Math.log(a[i] / a[i - 1]); return r; }
  function mkt(sym) { var h = D.markets.filter(function (m) { return m.sym === sym; })[0].hist; return h.slice(h.length - TOT); }
  var FAC = null;
  function factors() {
    if (FAC) return FAC;
    var S = lr(mkt('S&P 500')), N = lr(mkt('Nasdaq 100')), t = new Float64Array(TOT);
    for (var i = 1; i < TOT; i++) t[i] = N[i] - S[i];
    return (FAC = { M: S, I: lr(mkt('S&P/BMV IPC')), B: lr(mkt('Bitcoin')), T: t });
  }
  /* [α diaria, β S&P, β IPC, β Bitcoin, β tecnología, σ idiosincrática diaria] — σ total resultante ≈ la de cada activo */
  var FM = { VOO: [0, 1, 0, 0, 0, .0005], IVV: [0, 1, 0, 0, 0, .0006],
    NVDA: [.0006, 1.5, 0, 0, 2.2, .017], MSFT: [.0001, 1.05, 0, 0, 1.2, .0085], AMZN: [.0002, 1.15, 0, 0, 1.1, .0105],
    WALMEX: [-.0003, .2, .85, 0, 0, .0095], GFNORTEO: [.0002, .25, 1.05, 0, 0, .0095], FIBRAMQ: [0, .1, .55, 0, 0, .0085],
    'CETES 28': [.000278, 0, 0, 0, 0, .00002], BONDDIA: [.000271, 0, 0, 0, 0, .00004],
    BTC: [0, 0, 0, 1, 0, 0], ETH: [-.0003, 0, 0, 1.15, 0, .02], SOL: [-.0002, 0, 0, 1.3, 0, .03],
    QQQ: [0, 1, 0, 0, 1, .001], NAFTRAC: [0, 0, 1, 0, 0, .001] };
  /* emisoras sin fila propia (las que el usuario compra desde el catálogo): betas típicas de su clase */
  var FMCLS = { 'Acción EE. UU.': [.0001, 1.1, 0, 0, .6, .012], ETF: [0, 1, 0, 0, 0, .001], 'Acción MX': [0, .2, .9, 0, 0, .011], FIBRA: [0, .1, .55, 0, 0, .0085],
    Cripto: [0, 0, 0, 1.2, 0, .03], Deuda: [.000275, 0, 0, 0, 0, .00003] };
  function fmFor(p) { return FM[p.ticker] || FMCLS[p.cls || (CAT_BY[p.ticker] || {}).cls] || (p.currency === 'USD' ? FMCLS['Acción EE. UU.'] : [0, .8, 0, 0, 0, .012]); }
  var pathCache = {}, mxnCache = {};
  function localPath(p) {
    if (REAL) {
      var tk = typeof p === 'string' ? p : p && p.ticker, e = tk && REAL.paths[tk]; if (e) return e.path;
      if (typeof p === 'string' || !p || !(p.price > 0)) return null;
      var fk = 'flat|' + p.ticker + '|' + p.price; if (pathCache[fk]) return pathCache[fk];
      return (pathCache[fk] = new Float64Array(TOT).fill(p.price));
    }
    if (typeof p === 'string') { var f = null; SEED.forEach(function (s) { s.positions.forEach(function (x) { if (x.ticker === p && !f) f = x; }); }); if (!f && CAT_BY[p]) f = CAT_BY[p]; p = f; if (!p) return null; }
    var key = p.ticker + '|' + p.price + '|' + p.d1; if (pathCache[key]) return pathCache[key];
    var m = fmFor(p), F = factors(), r = mulberry32(hashStr(p.ticker + '·tk2')), a = new Float64Array(TOT), rr = new Float64Array(TOT), i;
    for (i = 1; i < TOT; i++) rr[i] = m[0] + m[1] * F.M[i] + m[2] * F.I[i] + m[3] * F.B[i] + m[4] * F.T[i] + m[5] * gauss(r);
    a[LAST] = p.price; a[LAST - 1] = p.price / (1 + p.d1 / 100);
    for (i = LAST - 1; i > 0; i--) a[i - 1] = a[i] * Math.exp(-rr[i]);
    return (pathCache[key] = a);
  }
  function mxnPath(p) { /* la misma trayectoria en MXN, con el USD/MXN de CADA fecha para las posiciones en USD */
    var lp = localPath(p); if (!lp) return null; if (typeof p === 'string') p = { ticker: p };
    if (REAL) { /* producción: en la MONEDA BASE de la vista (T.base), con el tipo de cambio de cada fecha */
      var rc = p.currency || (REAL.paths[p.ticker] && REAL.paths[p.ticker].ccy) || 'MXN', rk = T.base + '|' + p.ticker + '|' + rc + '|' + lp[LAST];
      if (mxnCache[rk]) return mxnCache[rk];
      var b = new Float64Array(TOT); for (var j = 0; j < TOT; j++) b[j] = lp[j] * T.rate(rc, j);
      return (mxnCache[rk] = b);
    }
    var key = p.ticker + '|' + lp[LAST] + '|' + lp[LAST - 1]; if (mxnCache[key]) return mxnCache[key];
    var cur = p.currency || (REAL && REAL.paths[p.ticker] && REAL.paths[p.ticker].ccy); if (!cur) SEED.forEach(function (s) { s.positions.forEach(function (x) { if (x.ticker === p.ticker) cur = x.currency; }); }); if (!cur && CAT_BY[p.ticker]) cur = CAT_BY[p.ticker].currency;
    var a = new Float64Array(TOT); for (var i = 0; i < TOT; i++) a[i] = lp[i] * (cur === 'USD' ? fxSeries[i] : 1);
    return (mxnCache[key] = a);
  }

  var SEED = REAL ? REAL.portfolios : [
    { id: 'principal', name: 'Principal', desc: 'Mi portafolio de largo plazo', color: 1, currency: 'MXN', created: '2025-02-10', benchmark: 'S&P 500', cash: 0, realized: 18400,
      positions: D.positions.map(function (p) { return { ticker: p.ticker, name: p.name, qty: p.qty, avg: p.avg, price: p.price, currency: p.ccy, d1: p.d1 }; }) },
    { id: 'retiro', name: 'Retiro', desc: 'Ahorro para el retiro', color: 2, currency: 'MXN', created: '2023-11-21', benchmark: 'S&P 500', cash: 1800, realized: 9200,
      positions: [
        { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', qty: 20, avg: 431.0, price: 512.3, currency: 'USD', d1: 0.31 },
        { ticker: 'IVV', name: 'iShares Core S&P 500', qty: 10, avg: 470.4, price: 558.7, currency: 'USD', d1: 0.29 },
        { ticker: 'CETES 28', name: 'Cetes 28 días', qty: 6000, avg: 9.7, price: 10.0, currency: 'MXN', d1: 0.03 },
        { ticker: 'BONDDIA', name: 'Fondo de deuda gubernamental', qty: 20000, avg: 1.581, price: 1.6345, currency: 'MXN', d1: 0.02 },
        { ticker: 'FIBRAMQ', name: 'Fibra Macquarie', qty: 800, avg: 24.1, price: 26.4, currency: 'MXN', d1: -0.34 }] },
    { id: 'cripto', name: 'Cripto', desc: 'Posiciones de alto riesgo', color: 3, currency: 'MXN', created: '2025-06-03', benchmark: 'Bitcoin', cash: 600, realized: -2300,
      positions: [
        { ticker: 'BTC', name: 'Bitcoin', qty: 0.014, avg: 58000, price: 91450, currency: 'USD', d1: -2.71 },
        { ticker: 'ETH', name: 'Ethereum', qty: 0.35, avg: 2410, price: 3185, currency: 'USD', d1: -3.4 },
        { ticker: 'SOL', name: 'Solana', qty: 4, avg: 120, price: 178, currency: 'USD', d1: -4.1 }] }
  ];

  /* ===== Movimientos del usuario (compra, venta, aportación, retiro, dividendo) =====
     Se guardan ENCIMA de la semilla (localStorage campo.tx.v1). build() aplica los movimientos a la semilla para tener las
     posiciones y el efectivo de hoy; el libro (CampoPfResumen.buildLedger) usa la semilla para la historia previa y agrega
     cada movimiento en SU fecha, con SU precio y SU tipo de cambio. Las dos vías comparten e.mxn, así que cuadran al centavo. */
  var TXK = 'campo.tx.v1', USER = {}, BASE = {};
  try { USER = JSON.parse(localStorage.getItem(TXK) || '{}') || {}; } catch (e) { USER = {}; }
  function saveTx() { try { localStorage.setItem(TXK, JSON.stringify(USER)); } catch (e) { } }
  function applyUser(spec, list) {
    var pos = spec.positions.map(function (x) { var o = {}; for (var k in x) o[k] = x[k]; return o; }), cash = spec.cash || 0, real = spec.realized || 0;
    (list || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.seq - b.seq; }).forEach(function (u) {
      var x = null; pos.forEach(function (q) { if (q.ticker === u.tk) x = q; });
      if (u.t === 'dep' || u.t === 'div') cash += u.mxn; else if (u.t === 'wd') cash -= u.mxn;
      else if (u.t === 'buy') {
        cash -= u.mxn;
        if (x) { x.avg = (x.qty * x.avg + u.qty * u.px) / (x.qty + u.qty); x.qty = +(x.qty + u.qty).toFixed(8); }
        else { var c = CAT_BY[u.tk] || {}; pos.push({ ticker: u.tk, name: u.name || c.name || u.tk, qty: u.qty, avg: u.px, price: c.price != null ? c.price : u.px, currency: u.ccy, d1: c.d1 || 0, cls: c.cls }); }
      } else if (u.t === 'sell' && x) {
        cash += u.mxn; real += u.qty * (u.px - x.avg) * (u.fx || 1) - (u.fee || 0); x.qty = +(x.qty - u.qty).toFixed(8);
        if (x.qty <= 1e-9) pos.splice(pos.indexOf(x), 1);
      }
    });
    return { positions: pos, cash: cash, realized: real };
  }
  /* portafolio REAL: la serie es el patrimonio diario del libro (posiciones según sus lotes + efectivo), no las cantidades de hoy
     proyectadas hacia atrás; el costo es el de lo que sigue abierto (en pesos al TC de cada compra) más el efectivo */
  function buildReal(spec) {
    BASE[spec.id] = spec;
    var L = REAL.rebase(spec.ledger0, T.base), V = L.V, pos = L.rows.map(function (r) { return { ticker: r.ticker, name: r.name, qty: r.qty, avg: r.avg, price: r.price, currency: r.ccy, d1: r.d1, cls: r.cls, stale: r.stale }; });
    var real = 0, openCost = 0, acc = {};
    L.events.forEach(function (e) {
      if (!e.tk || (e.t !== 'buy' && e.t !== 'sell')) return; var o = acc[e.tk] || (acc[e.tk] = { q: 0, c: 0 });
      if (e.t === 'buy') { o.q += e.qty; o.c += e.mxn; } else { var f = o.q > 0 ? Math.min(1, e.qty / o.q) : 0, cb = o.c * f; real += e.mxn - cb; o.c -= cb; o.q -= e.qty; }
    });
    Object.keys(acc).forEach(function (k) { if (acc[k].q > 1e-9) openCost += acc[k].c; });
    var cash = L.cashAt[LAST], amt = V[LAST] - V[LAST - 1] - L.F[LAST];
    return { id: spec.id, name: spec.name, desc: spec.desc || '', color: 'var(--pf-' + spec.color + ')', slot: spec.color, currency: spec.currency, created: spec.created, benchmark: spec.benchmark,
      positions: pos, cash: cash, value: V[LAST], cost: cash + openCost, realized: real, ledger: L, flows: L.F,
      seedPositions: pos, seedCash: cash, seedRealized: real, userTx: [],
      day: { amt: amt, pct: V[LAST - 1] + L.F[LAST] ? amt / (V[LAST - 1] + L.F[LAST]) * 100 : 0 },
      ret: { amt: V[LAST] + real - cash - openCost, pct: openCost ? (V[LAST] + real - cash - openCost) / openCost * 100 : 0 },
      share: 0, contrib: amt, series: V, usdLocal: L.usdLocal, fxMissing: 0 };
  }
  function build(spec) {
    if (spec.ledger0) return buildReal(spec);
    BASE[spec.id] = spec;
    var user = (USER[spec.id] || []).slice(), eff = applyUser(spec, user), base = spec;
    spec = { id: base.id, name: base.name, desc: base.desc, color: base.color, currency: base.currency, created: base.created, benchmark: base.benchmark, positions: eff.positions, cash: eff.cash, realized: eff.realized };
    var n = TOT, series = new Float64Array(n), usd = new Float64Array(n), cost = spec.cash || 0;
    for (var i = 0; i < n; i++) series[i] = spec.cash || 0;
    spec.positions.forEach(function (p) {
      var lp = localPath(p), isUsd = p.currency === 'USD', fxm = isUsd ? D.usdmxn : 1;
      cost += p.qty * p.avg * fxm;
      for (var i = 0; i < n; i++) { series[i] += p.qty * lp[i] * (isUsd ? fxSeries[i] : 1); if (isUsd) usd[i] += p.qty * lp[i]; }
    });
    var amt = series[LAST] - series[LAST - 1];
    return { id: spec.id, name: spec.name, desc: spec.desc || '', color: 'var(--pf-' + spec.color + ')', slot: spec.color, currency: spec.currency, created: spec.created, benchmark: spec.benchmark,
      positions: spec.positions, cash: spec.cash || 0, value: series[LAST], cost: cost, realized: spec.realized || 0,
      seedPositions: base.positions, seedCash: base.cash || 0, seedRealized: base.realized || 0, userTx: user,
      day: { amt: amt, pct: series[LAST - 1] ? amt / series[LAST - 1] * 100 : 0 },
      ret: { amt: series[LAST] + (spec.realized || 0) - cost, pct: cost ? (series[LAST] + (spec.realized || 0) - cost) / cost * 100 : 0 },
      share: 0, contrib: amt, series: series, usdLocal: usd, fxMissing: 0 };
  }

  /* catálogo de muestra para el buscador de "Agregar movimiento": lo que ya existe en la semilla + emisoras comunes (precios ficticios al 18-nov-2026) */
  var CATALOG = [], CAT_BY = {}, CLSX = { IVV: 'ETF', BONDDIA: 'Deuda', FIBRAMQ: 'FIBRA', ETH: 'Cripto', SOL: 'Cripto', 'CETES 28': 'Deuda' };
  if (REAL) REAL.catalog.forEach(function (c) { CAT_BY[c.ticker] = c; CATALOG.push(c); });
  else SEED.forEach(function (s) { s.positions.forEach(function (x) {
    if (CAT_BY[x.ticker]) return; var dp = D.positions.filter(function (d) { return d.ticker === x.ticker; })[0];
    var cls = (dp && dp.cls) || CLSX[x.ticker] || (x.currency === 'USD' ? 'Acción EE. UU.' : 'Acción MX');
    CAT_BY[x.ticker] = { ticker: x.ticker, name: x.name, cls: cls, currency: x.currency, price: x.price, d1: x.d1 }; CATALOG.push(CAT_BY[x.ticker]);
  }); });
  [['AAPL', 'Apple', 'Acción EE. UU.', 'USD', 228.4, 0.41], ['GOOGL', 'Alphabet', 'Acción EE. UU.', 'USD', 176.9, -0.62], ['META', 'Meta Platforms', 'Acción EE. UU.', 'USD', 563.1, 0.95],
    ['KO', 'Coca-Cola', 'Acción EE. UU.', 'USD', 64.8, 0.12], ['QQQ', 'Invesco QQQ Trust', 'ETF', 'USD', 503.2, -0.33], ['TSLA', 'Tesla', 'Acción EE. UU.', 'USD', 338.6, 1.8],
    ['FEMSAUBD', 'FEMSA', 'Acción MX', 'MXN', 171.4, -0.21], ['CEMEXCPO', 'Cemex', 'Acción MX', 'MXN', 11.9, 1.02], ['BIMBOA', 'Grupo Bimbo', 'Acción MX', 'MXN', 57.3, -0.4],
    ['AMXB', 'América Móvil', 'Acción MX', 'MXN', 15.2, 0.3], ['FUNO11', 'Fibra Uno', 'FIBRA', 'MXN', 21.8, -0.15], ['NAFTRAC', 'iShares NAFTRAC', 'ETF', 'MXN', 60.4, 0.38]
  ].forEach(function (a) { if (REAL || CAT_BY[a[0]]) return; CAT_BY[a[0]] = { ticker: a[0], name: a[1], cls: a[2], currency: a[3], price: a[4], d1: a[5] }; CATALOG.push(CAT_BY[a[0]]); });

  var T = {
    base: 'MXN', dates: dates, fx: { usdmxn: D.usdmxn, series: fxSeries },
    portfolios: [], total: null, limit: REAL ? REAL.limit : { plan: 'Investor', max: 3 }, route: null, readonly: !!(REAL && REAL.readonly)
  };
  var LS = 'campo.tracker.v1', listeners = { change: [], hover: [], route: [], import: [], create: [] }, nextId = 1;
  function emit(evt, payload) { (listeners[evt] || []).slice().forEach(function (fn) { try { fn(payload); } catch (e) { if (window.console) console.error(e); } }); }
  function store(read) {
    try { if (read) return JSON.parse(localStorage.getItem(LS) || 'null') || {}; localStorage.setItem(LS, JSON.stringify({ order: T.order(), names: names() })); } catch (e) { return {}; }
  }
  function names() { var o = {}; T.portfolios.forEach(function (p) { if (/^(principal|retiro|cripto)$/.test(p.id)) o[p.id] = p.name; }); return o; }

  /* métricas de UN día (i = 0..251): una sola fórmula de rendimiento, (valor + realizado − costo) / costo */
  function metricsAt(i) {
    var ps = T.portfolios, v = 0, vp = 0, cost = 0, real = 0, usdL = 0, effect = 0, fx = fxSeries[i], fxp = fxSeries[Math.max(0, i - 1)];
    var fl = 0; /* aportaciones y retiros del día no son ganancia ni pérdida */
    ps.forEach(function (p) { v += p.series[i]; vp += p.series[Math.max(0, i - 1)]; cost += p.cost; real += p.realized; usdL += p.usdLocal[i]; effect += p.usdLocal[Math.max(0, i - 1)] * (fx - fxp); if (p.flows && i > 0) fl += p.flows[i]; });
    vp += fl;
    var day = i > 0 ? v - vp : 0, r = v + real - cost;
    return { value: v, day: day, dayPct: i > 0 && vp ? day / vp * 100 : 0, ret: r, retPct: cost ? r / cost * 100 : 0, fx: fx, usdShare: v ? usdL * fx / v : 0, fxEffect: effect, idx: i };
  }
  function recompute() {
    var ps = T.portfolios, tv = 0, cost = 0, real = 0, ser = new Float64Array(TOT);
    ps.forEach(function (p) { tv += p.value; cost += p.cost; real += p.realized; for (var i = 0; i < TOT; i++) ser[i] += p.series[i]; });
    ps.forEach(function (p) { p.share = tv ? p.value / tv : 0; p.contrib = p.day.amt; });
    var m = T.metricsAt(LAST);
    T.total = { value: m.value, cost: cost, day: { amt: m.day, pct: m.dayPct }, ret: { amt: m.ret, pct: m.retPct }, series: ser, usdShare: m.usdShare, fxEffectToday: m.fxEffect, count: ps.length };
  }
  function seedAll(ids, usePersisted) {
    var st = usePersisted ? store(true) : {}, list = SEED.filter(function (s) { return !ids || ids.indexOf(s.id) >= 0; }).map(function (s) {
      var p = build(s); if (st.names && st.names[s.id]) p.name = st.names[s.id]; return p;
    });
    if (st.order && st.order.length) list.sort(function (a, b) { var x = st.order.indexOf(a.id), y = st.order.indexOf(b.id); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); });
    T.portfolios.length = 0; list.forEach(function (p) { T.portfolios.push(p); });
    recompute();
  }

  T.order = function () { return T.portfolios.map(function (p) { return p.id; }); };
  T.get = function (id) { for (var i = 0; i < T.portfolios.length; i++) if (T.portfolios[i].id === id) return T.portfolios[i]; return null; };
  T.setOrder = function (ids) {
    var by = {}; T.portfolios.forEach(function (p) { by[p.id] = p; });
    var next = []; (ids || []).forEach(function (id) { if (by[id]) { next.push(by[id]); delete by[id]; } });
    Object.keys(by).forEach(function (k) { next.push(by[k]); });
    T.portfolios.length = 0; next.forEach(function (p) { T.portfolios.push(p); });
    store(); emit('change', { type: 'order' });
  };
  /* producción: crear, renombrar y borrar se GUARDAN (campo/datos.js → PUT con baseVersion) y devuelven una promesa { ok } | { error } */
  var W8 = REAL && REAL.write;
  T.canWrite = !!W8;
  T.rename = function (id, name) {
    if (T.readonly) { readonly(); return false; }
    var p = T.get(id), n = String(name == null ? '' : name).trim().slice(0, 40); if (!p || !n || n === p.name) return false;
    if (W8) { var old = p.name; p.name = n; emit('change', { type: 'rename', id: id }); return W8.renamePortfolio(id, n).then(function (r) { if (r && r.error) { var q = T.get(id); if (q) q.name = old; emit('change', { type: 'rename', id: id }); } return r; }); }
    p.name = n; store(); emit('change', { type: 'rename', id: id }); return true;
  };
  T.remove = function (id) {
    if (T.readonly) { readonly(); return false; }
    var i = T.order().indexOf(id); if (i < 0) return false;
    if (W8) return W8.deletePortfolio(id);
    T.portfolios.splice(i, 1); recompute(); store(); emit('change', { type: 'remove', id: id }); return true;
  };
  T.add = function (o) {
    if (T.readonly) { readonly(); return null; }
    o = o || {};
    if (W8) return W8.createPortfolio(o);
    var used = {}; T.portfolios.forEach(function (p) { used[p.slot] = 1; });
    var slot = 1; while (used[slot] && slot <= 6) slot++; if (slot > 6) slot = (T.portfolios.length % 6) + 1;
    var p = build({ id: 'pf-' + (nextId++) + '-' + Date.now().toString(36), name: String(o.name || 'Nuevo portafolio').trim().slice(0, 40) || 'Nuevo portafolio', desc: o.desc || '',
      color: slot, currency: o.currency || 'MXN', created: new Date().toISOString().slice(0, 10), benchmark: o.benchmark || 'S&P 500', cash: 0, realized: 0, positions: o.positions || [] });
    T.portfolios.push(p); recompute(); emit('change', { type: 'add', id: p.id }); return p;
  };
  /* datos nuevos del servidor (después de guardar): se rearman los portafolios con el MISMO orden, nombres y moneda de vista */
  T.resetData = function (specs) {
    if (SEED !== specs) { SEED.length = 0; specs.forEach(function (s) { SEED.push(s); }); }
    if (REAL) { Object.keys(CAT_BY).forEach(function (k) { delete CAT_BY[k]; }); CATALOG.length = 0; REAL.catalog.forEach(function (c) { CAT_BY[c.ticker] = c; CATALOG.push(c); }); }
    pathCache = {}; mxnCache = {}; T.txVersion++;
    seedAll(null, true); emit('change', { type: 'data' });
  };
  T.restore = function () { try { localStorage.removeItem(LS); } catch (e) { } seedAll(null, false); emit('change', { type: 'restore' }); };
  T.state = function (name) {
    if (name === 'single') seedAll(['principal'], true); else if (name === 'empty') { T.portfolios.length = 0; recompute(); } else seedAll(null, true);
    emit('change', { type: 'state', state: name });
  };
  T.on = function (evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); return function () { var a = listeners[evt], i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); }; };
  T.emit = emit;
  var hoverId = null;
  T.hover = function (id) { id = id || null; if (id === hoverId) return; hoverId = id; emit('hover', id); };
  T.hovered = function () { return hoverId; };
  T.open = function (id) { var h = '#tracker/' + encodeURIComponent(id); if (window.CampoSections) window.CampoSections.navigate(h, false); else location.hash = h; };
  T.back = function () { if (window.CampoSections) window.CampoSections.navigate('#tracker', false); else location.hash = '#tracker'; };
  T.metricsAt = metricsAt;
  T.txVersion = 0;
  function idxOn(iso) { var k = -1; for (var i = 0; i < TOT; i++) if (dates[i] <= iso) k = i; return k; }
  function priceAt(tk, iso) { var c = CAT_BY[tk], lp = c ? localPath(c) : localPath(tk), i = idxOn(iso); if (!lp || i < 0) return null; var cur = (REAL && REAL.paths[tk] && (REAL.paths[tk].origCcy || REAL.paths[tk].ccy)) || (c && c.currency) || 'MXN'; return { idx: i, date: dates[i], px: lp[i], fx: REAL ? T.rate(cur, i) : cur === 'USD' ? fxSeries[i] : 1, currency: cur }; }
  function heldQty(p, tk) { var q = 0; (p.positions || []).forEach(function (x) { if (x.ticker === tk) q += x.qty; }); return q; }
  function rebuild(id) {
    var i = T.order().indexOf(id), old = T.portfolios[i], spec = BASE[id]; if (i < 0 || !spec) return null;
    var p = build(spec); p.name = old.name; p.slot = old.slot; p.color = old.color; T.portfolios[i] = p; T.txVersion++; recompute(); emit('change', { type: 'tx', id: id }); return p;
  }
  /* u: { t: 'buy'|'sell'|'dep'|'wd'|'div', date, tk, name, qty, px (moneda local), ccy, fee (MXN), amount (MXN, para dep/wd/div), fund (aporta lo que falte) } */
  function normalize(p, u) {
    var o = { t: u.t, date: String(u.date || dates[LAST]).slice(0, 10), note: u.note || '' };
    if (o.date > dates[LAST]) return { error: 'La fecha no puede ser futura.' };
    if (o.date < dates[0]) return { error: 'Solo hay datos desde el ' + dates[0] + '.' };
    var i = idxOn(o.date); o.date = dates[i];
    if (u.t === 'dep' || u.t === 'wd' || u.t === 'div') {
      o.mxn = Math.round((+u.amount || 0) * 100) / 100; if (!(o.mxn > 0)) return { error: 'Escribe un monto mayor a cero.' };
      if (u.t === 'div') { o.tk = u.tk; if (!heldQty(p, u.tk)) return { error: 'El dividendo debe ser de una posición que tienes.' }; }
      return o;
    }
    var c = CAT_BY[u.tk] || {}; o.tk = u.tk; o.name = u.name || c.name || u.tk; o.ccy = u.ccy || c.currency || 'MXN'; o.qty = +u.qty; o.px = +u.px;
    if (!(o.qty > 0)) return { error: 'Escribe una cantidad mayor a cero.' }; if (!(o.px > 0)) return { error: 'Escribe un precio mayor a cero.' };
    o.fx = o.ccy === 'USD' ? fxSeries[i] : 1; o.fee = Math.max(0, +u.fee || 0); var gross = o.qty * o.px * o.fx;
    if (u.t === 'sell') { var h = heldQty(p, u.tk); if (o.qty > h + 1e-9) return { error: 'Solo tienes ' + h + ' de ' + u.tk + '.' }; o.mxn = Math.round((gross - o.fee) * 100) / 100; }
    else o.mxn = Math.round((gross + o.fee) * 100) / 100;
    return o;
  }
  /* el historial debe seguir siendo posible en orden de fechas: ninguna venta de algo que aún no tenías, ningún efectivo negativo */
  function fdate(iso) { return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, ''); }
  function checkList(spec, list) {
    var pos = {}, cash = spec.cash || 0, err = null;
    spec.positions.forEach(function (x) { pos[x.ticker] = (pos[x.ticker] || 0) + x.qty; });
    list.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.seq - b.seq; }).forEach(function (u) {
      if (err) return;
      if (u.t === 'dep' || u.t === 'div') cash += u.mxn; else if (u.t === 'wd') cash -= u.mxn;
      else if (u.t === 'buy') { cash -= u.mxn; pos[u.tk] = (pos[u.tk] || 0) + u.qty; }
      else if (u.t === 'sell') { if ((pos[u.tk] || 0) + 1e-9 < u.qty) { err = 'La venta de ' + u.tk + ' del ' + fdate(u.date) + ' depende de esa compra: bórrala primero.'; return; } pos[u.tk] -= u.qty; cash += u.mxn; }
      if (cash < -0.005) err = 'Sin ese movimiento, el efectivo quedaría en negativo el ' + fdate(u.date) + '. Borra primero lo que depende de él.';
    });
    return err;
  }
  T.tx = {
    list: function (id) { return (USER[id] || []).slice(); },
    preview: function (id, u) {
      if (W8) { /* producción: la misma intención que se guardaría, sobre una copia (moneda del portafolio) */
        var r = W8.preview(id, u); if (!r || r.error) return { error: (r && r.error) || 'No se pudo calcular.' };
        return { ev: { t: u.t, mxn: r.amount, ccy: r.posCcy || r.ccy, tk: r.tk, qty: r.qty }, cashBefore: r.cashBefore, cashAfter: r.cashAfter, fund: 0, external: r.external || 0,
          qtyAfter: r.qtyAfter, avgAfter: r.avgAfter, realized: r.realized, tax: r.tax, taxRate: r.taxRate, pfCcy: r.ccy };
      }
      var p = T.get(id); if (!p) return { error: 'Portafolio no encontrado.' };
      var o = normalize(p, u); if (o.error) return o;
      var out = { ev: o, cashBefore: p.cash, cashAfter: p.cash, fund: 0 };
      if (o.t === 'dep' || o.t === 'div') out.cashAfter += o.mxn;
      else if (o.t === 'wd') { out.cashAfter -= o.mxn; if (out.cashAfter < -0.005) out.error = 'No tienes suficiente efectivo: $' + Math.round(p.cash) + ' MXN.'; }
      else if (o.t === 'buy') {
        out.cashAfter -= o.mxn; if (out.cashAfter < -0.005) out.fund = Math.round(-out.cashAfter * 100) / 100;
        var x = null; p.positions.forEach(function (q) { if (q.ticker === o.tk) x = q; });
        out.qtyAfter = (x ? x.qty : 0) + o.qty; out.avgAfter = x ? (x.qty * x.avg + o.qty * o.px) / (x.qty + o.qty) : o.px;
      } else if (o.t === 'sell') {
        out.cashAfter += o.mxn; var y = null; p.positions.forEach(function (q) { if (q.ticker === o.tk) y = q; });
        out.qtyAfter = y.qty - o.qty;
        /* ganancia realizada estimada con el costo promedio en pesos del libro */
        var R = window.CampoPfResumen, basis = null;
        try { var L = R.calc.buildLedger(T, p), r = L.rows.filter(function (z) { return z.ticker === o.tk; })[0]; if (r && r.qty) basis = r.cost / r.qty * o.qty; } catch (e) { }
        if (basis == null) basis = y.avg * o.qty * (o.ccy === 'USD' ? T.fx.usdmxn : 1);
        out.realized = o.mxn - basis; var cls = y.cls || (CAT_BY[o.tk] || {}).cls || '';
        out.taxRate = /Cripto/.test(cls) ? 0.30 : /Deuda/.test(cls) ? 0 : 0.10; out.tax = Math.max(0, out.realized) * out.taxRate;
      }
      return out;
    },
    add: function (id, u) {
      if (T.readonly) { readonly(); return { error: REAL.readonlyMsg }; }
      if (W8) return W8.addTx(id, u); /* promesa { ok, ... } | { error } */
      var pv = T.tx.preview(id, u); if (pv.error) return pv;
      var list = USER[id] || (USER[id] = []), seq = list.reduce(function (m, x) { return Math.max(m, x.seq || 0); }, 0) + 1, made = [];
      if (pv.ev.t === 'buy' && pv.fund > 0) {
        if (!u.fund) return { error: 'Te faltan $' + pv.fund.toFixed(2) + ' MXN de efectivo.', fund: pv.fund };
        var f = { id: 'u' + Date.now().toString(36) + 'f', t: 'dep', date: pv.ev.date, mxn: pv.fund, note: 'Aportación para la compra de ' + pv.ev.tk, seq: seq++, auto: true }; list.push(f); made.push(f.id);
      }
      var e = pv.ev; e.id = 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); e.seq = seq; list.push(e); made.push(e.id);
      var bad = BASE[id] ? checkList(BASE[id], list) : null;
      if (bad) { USER[id] = list.filter(function (x) { return made.indexOf(x.id) < 0; }); return { error: bad.replace('depende de esa compra: bórrala primero.', 'no es posible en esa fecha: aún no tenías esa cantidad.') }; }
      saveTx(); rebuild(id); return { ok: true, ids: made, ev: e };
    },
    remove: function (id, ids) {
      if (T.readonly) { readonly(); return { error: REAL.readonlyMsg }; }
      ids = [].concat(ids); var list = USER[id] || [], next = list.filter(function (x) { return ids.indexOf(x.id) < 0; });
      var bad = BASE[id] ? checkList(BASE[id], next) : null; if (bad) return { error: bad };
      USER[id] = next; saveTx(); rebuild(id); return { ok: true };
    },
    clear: function (id) { if (T.readonly) { readonly(); return; } if (id) { delete USER[id]; saveTx(); rebuild(id); } else { USER = {}; saveTx(); seedAll(null, true); T.txVersion++; emit('change', { type: 'tx' }); } }
  };
  T.catalog = CATALOG; T.priceAt = priceAt;
  T.searchTickers = function (q) {
    q = String(q || '').trim().toLowerCase();
    var out = CATALOG.filter(function (c) { return !q || c.ticker.toLowerCase().indexOf(q) >= 0 || c.name.toLowerCase().indexOf(q) >= 0; });
    out.sort(function (a, b) { var x = a.ticker.toLowerCase().indexOf(q) === 0 ? 0 : 1, y = b.ticker.toLowerCase().indexOf(q) === 0 ? 0 : 1; return x - y || a.ticker.localeCompare(b.ticker); });
    return out.slice(0, 12);
  };
  T.pricePath = localPath; T.pricePathMxn = mxnPath; /* trayectoria de 252 puntos: local / en la moneda base con el TC de cada fecha; acepta {ticker, price, d1, currency} o un ticker de la semilla */

  /* ============================== moneda base de la vista ==============================
     Inicio, lista y "Todos": la moneda del consolidado (la del portafolio que más pesa, o la que elija el usuario).
     Detalle de un portafolio: SU moneda, o la que elija el usuario para ver la equivalencia. Al cambiar, cada libro se
     vuelve a expresar en esa moneda con el tipo de cambio de cada fecha (no es dividir entre el TC de hoy).
     T.rate(ccy, i): unidades de la base por 1 unidad de ccy en la sesión i. T.fx.series: la de la moneda "de fuera"
     (USD si la base no es USD; MXN si la base es USD), que es la que mueve el efecto cambiario. */
  var CK = 'campo.ccy';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function okCcy(c) { return !!c && !!REAL && REAL.currencies.indexOf(c) >= 0; }
  T.currencies = function () { return REAL ? REAL.currencies.slice() : ['MXN']; };
  T.consolidatedCcy = function () { var c = lsGet(CK); return okCcy(c) ? c : (REAL ? REAL.defaultCcy : 'MXN'); };
  T.viewCcy = function (id) {
    if (!id || id === 'todos') return T.consolidatedCcy();
    var c = lsGet(CK + '.' + id), s = BASE[id]; return okCcy(c) ? c : (s && okCcy(s.currency) ? s.currency : T.consolidatedCcy());
  };
  T.rate = function (ccy, i) {
    if (i == null) i = LAST;
    if (!REAL) return ccy === 'USD' ? fxSeries[i] : 1;
    return REAL.mxnPer(ccy, i) / REAL.mxnPer(T.base, i);
  };
  function applyFx() { var FOR = REAL.foreignOf(T.base); for (var k = 0; k < TOT; k++) fxSeries[k] = T.rate(FOR, k); T.fx.usdmxn = fxSeries[LAST]; T.fx.foreign = FOR; }
  T.setBase = function (B, quiet) { /* quiet: la ruta pinta el detalle; los demás solo actualizan sus números */
    if (!REAL || !okCcy(B) || B === T.base) return false;
    T.base = B; D.base = B; applyFx(); mxnCache = {};
    T.portfolios.forEach(function (p, k) { var s = BASE[p.id]; if (!s) return; var q = build(s); q.name = p.name; q.slot = p.slot; q.color = p.color; T.portfolios[k] = q; });
    T.txVersion++; recompute(); emit('change', { type: 'base', base: B, quiet: !!quiet }); return true;
  };
  /* el usuario elige la moneda de una vista ('todos' = consolidado); se recuerda en este navegador */
  T.setViewCcy = function (id, ccy) {
    if (!okCcy(ccy)) return;
    lsSet(!id || id === 'todos' ? CK : CK + '.' + id, ccy);
    if (!T.setBase(ccy)) emit('change', { type: 'base', base: ccy });
  };
  if (REAL) { T.base = T.consolidatedCcy(); D.base = T.base; applyFx(); }

  seedAll(null, true);
  window.CampoTracker = T; window.__tracker = T;

  /* ============================== ruta ============================== */
  function idFromHash() { var m = /^#tracker(?:\/([\w%.-]+)(?:\/[\w-]+)?)?$/.exec(location.hash); return m ? (m[1] ? decodeURIComponent(m[1]) : null) : undefined; }
  window.addEventListener('campo:route', function (e) {
    if (!e.detail || e.detail.sec !== 'tracker') return;
    var id = idFromHash(); if (id === undefined) id = null;
    if (REAL) T.setBase(T.viewCcy(id), !!id); /* cada vista en su moneda, ANTES de pintarla */
    T.route = id; sec.dataset.view = id ? 'detail' : 'list'; emit('route', id);
    if (!id) { hoverId = null; schedule(); }
  });
  /* fuera del Tracker (Inicio, Informes, Ajustes) manda la moneda del consolidado */
  window.addEventListener('campo:section', function (e) { if (REAL && e.detail && e.detail.sec !== 'tracker') T.setBase(T.consolidatedCcy()); });
  sec.dataset.view = 'list';

  /* ============================== DOM ============================== */
  var PERIODS = [['1M', 21], ['3M', 63], ['6M', 126], ['1A', 252], ['Todo', 252]];
  var Pi = 1, SAMPLES = 120;
  sec.innerHTML =
    '<header class="app-head tk-head"><div><h1 tabindex="-1">Portafolios</h1><p class="asof" id="tkSub"></p></div>' +
    '<div class="tk-acts"><div class="tk-ccy" id="tkCcy"></div><a class="btn btn-secondary btn-sm tk-old" href="main-clasico.html">Editar en la versión anterior</a><button class="btn btn-secondary btn-sm" type="button" data-tk="import">Importar CSV</button>' +
    '<button class="btn btn-primary btn-sm" type="button" data-tk="create">Nuevo portafolio<span class="tk-chip" id="tkChip" title=""></span></button></div></header>' +
    '<section class="tk-hero panel" id="tkHero" data-mode="multi" aria-label="Patrimonio consolidado"><div class="tk-in">' +
    '<div class="tk-fig"><p class="tk-k" id="tkK">Patrimonio total</p><p class="tk-v num" id="tkV">' + SYM() + '0</p><p class="tk-when" id="tkWhen"></p>' +
    '<dl class="tk-rows"><div><dt>Cambio del día</dt><dd><span class="delta" id="tkDay"></span></dd></div>' +
    '<div><dt>Rentabilidad<span class="tk-tipw"><button class="tk-info" type="button" aria-label="Cómo se calcula la rentabilidad" aria-describedby="tkTip">i</button>' +
    '<span class="tk-tip" role="tooltip" id="tkTip">Ganancia total ÷ capital aportado, en la moneda base. Ganancia total = patrimonio + retiros − aportaciones (incluye realizado, dividendos y tipo de cambio). Es la misma fórmula aquí, en la lista y en cada portafolio.</span></span></dt><dd><span class="delta" id="tkRet"></span></dd></div></dl>' +
    '<p class="tk-fx" id="tkFx"></p>' +
    '<button class="btn btn-secondary btn-sm tk-all" type="button" id="tkAll">Ver análisis consolidado<svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg></button></div>' +
    '<div class="tk-chart"><div class="tk-ctop"><div class="seg tk-per" id="tkPer" role="group" aria-label="Periodo"></div></div>' +
    '<div class="tk-stage" id="tkStage" tabindex="0" role="group" aria-label="Patrimonio por portafolio. Con las flechas izquierda y derecha lees cada día."><canvas id="tkCanvas" aria-hidden="true"></canvas></div>' +
    '<ul class="tk-leg" id="tkLeg" aria-label="Portafolios"></ul><p class="tk-sr" id="tkSr" aria-live="polite"></p></div></div>' +
    '<div class="tk-empty"><h2>Aún no tienes portafolios</h2><p>' + (T.readonly ? 'Por ahora los portafolios se crean en la versión anterior de la app; aquí aparecen en cuanto existen.' : 'Crea uno desde cero o importa tus posiciones desde un archivo CSV para ver tu patrimonio consolidado.') + '</p>' +
    '<div class="tk-acts"><a class="btn btn-secondary btn-sm tk-old" href="main-clasico.html">Editar en la versión anterior</a><button class="btn btn-primary btn-sm" type="button" data-tk="create">Nuevo portafolio</button><button class="btn btn-secondary btn-sm" type="button" data-tk="import">Importar CSV</button></div></div></section>' +
    '<section id="tkList" aria-label="Lista de portafolios"></section><section id="tkDetail" hidden></section>';

  var $ = function (s) { return sec.querySelector(s); };
  var hero = $('#tkHero'), stage = $('#tkStage'), canvas = $('#tkCanvas'), ctx = canvas.getContext('2d');
  var elV = $('#tkV'), elWhen = $('#tkWhen'), elDay = $('#tkDay'), elRet = $('#tkRet'), elFx = $('#tkFx'), elK = $('#tkK'), perEl = $('#tkPer'), legEl = $('#tkLeg'), srEl = $('#tkSr'), allBtn = $('#tkAll');

  perEl.style.setProperty('--n', PERIODS.length);
  perEl.innerHTML = '<span class="seg-pill" aria-hidden="true"></span>' + PERIODS.map(function (p, i) { return '<button type="button" data-i="' + i + '" aria-pressed="' + (i === Pi) + '">' + p[0] + '</button>'; }).join('');
  function pill() { perEl.style.setProperty('--i', Pi); Array.prototype.forEach.call(perEl.querySelectorAll('button'), function (b, i) { b.setAttribute('aria-pressed', String(i === Pi)); }); }
  pill();

  sec.addEventListener('click', function (e) { var b = e.target.closest('[data-tk]'); if (b && sec.contains(b)) emit(b.dataset.tk, {}); });
  allBtn.addEventListener('click', function () { T.open('todos'); });

  /* ---------- texto de las cifras ---------- */
  function sgn(v) { return v > 0.0049 ? '+' : v < -0.0049 ? '−' : ''; }
  function money(v) { return fmt.mxn(Math.abs(v)); }
  function signedMoney(v) { return sgn(v) + money(v); }
  function cls(v) { return v > 0.0049 ? 'gain' : v < -0.0049 ? 'loss' : 'flat'; }
  function dateTxt(i, short) { var dt = dates[i]; return dt ? new Date(dt + 'T12:00:00').toLocaleDateString('es-MX', short ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '') : ''; }
  var single = false, shown = null;
  function paintLead(m, when) {
    shown = m;
    elV.textContent = fmt.mxn(m.value); elWhen.textContent = when;
    elDay.className = 'delta ' + cls(m.day); elDay.textContent = signedMoney(m.day) + ' (' + fmt.pct(m.dayPct) + ')';
    elRet.className = 'delta ' + cls(m.ret); elRet.textContent = signedMoney(m.ret) + ' (' + fmt.pct(m.retPct) + ')';
    var atNow = m.idx === LAST;
    elFx.textContent = ((T.fx.foreign === 'MXN' && T.base === 'USD' && m.fx > 0) ? 'USD/MXN ' + fmt.num(1 / m.fx, 2) : (T.fx.foreign || 'USD') + '/' + (T.base || 'MXN') + ' ' + fmt.num(m.fx, 2)) + ' · ' + Math.round(m.usdShare * 100) + ' % de ' + (single ? 'este portafolio' : 'tu patrimonio') + ' está en ' + (T.fx.foreign === 'MXN' ? 'pesos' : 'dólares') + ' · efecto cambiario ' + (atNow ? 'hoy ' : 'ese día ') + signedMoney(m.fxEffect);
  }
  function whenNow() { return 'Hoy · ' + D.asOf.replace(/ \d\d:\d\d$/, ''); }
  var tweenId = 0;
  function every(fn) { var done = false, r = 0, t = 0; (function run() { if (done) return; cancelAnimationFrame(r); clearTimeout(t); if (fn() === false) { done = true; return; } r = requestAnimationFrame(run); t = setTimeout(run, 50); })(); }
  function tweenLead(from, to, dur, when) {
    var my = ++tweenId; if (reduce() || !from || dur <= 0) { paintLead(to, when); return; }
    var t0 = performance.now(), keys = ['value', 'day', 'dayPct', 'ret', 'retPct', 'fx', 'usdShare', 'fxEffect'];
    every(function () {
      if (my !== tweenId) return false;
      var e = easeOut((performance.now() - t0) / dur), m = { idx: to.idx };
      keys.forEach(function (k) { m[k] = from[k] + (to[k] - from[k]) * e; });
      paintLead(e >= 1 ? to : m, when); if (e >= 1) return false;
    });
  }

  /* ---------- cabecera, modo y leyenda ---------- */
  function renderChrome() {
    var n = T.portfolios.length, mode = n === 0 ? 'empty' : n === 1 ? 'single' : 'multi';
    single = mode === 'single'; hero.dataset.mode = mode;
    $('#tkSub').textContent = n === 0 ? 'Aún no tienes portafolios · base ' + T.base : n + (n === 1 ? ' portafolio' : ' portafolios') + ' · base ' + T.base + ' · precios al ' + D.asOf;
    var chip = $('#tkChip'); chip.hidden = !isFinite(T.limit.max) || T.limit.max >= 99; chip.textContent = n + ' de ' + T.limit.max; chip.title = 'Plan ' + T.limit.plan + ': ' + n + ' de ' + T.limit.max + ' portafolios';
    elK.textContent = single ? 'Patrimonio · ' + T.portfolios[0].name : 'Patrimonio total';
    allBtn.hidden = n < 2;
    legEl.innerHTML = T.portfolios.map(function (p) {
      return '<li><button type="button" data-id="' + esc(p.id) + '" aria-label="Abrir ' + esc(p.name) + '"><i class="tk-sw" style="--c:' + p.color + '"></i><span class="tk-ln">' + esc(p.name) + '</span><span class="tk-lv num" data-lv></span></button></li>';
    }).join('');
    legEl.hidden = n < 2;
  }
  function paintLegend(i) {
    Array.prototype.forEach.call(legEl.querySelectorAll('button'), function (b) {
      var p = T.get(b.dataset.id), v = b.querySelector('[data-lv]'); if (p && v) v.textContent = fmt.mxn(p.series[i]);
      b.classList.toggle('is-on', b.dataset.id === hoverId); b.classList.toggle('is-dim', !!hoverId && b.dataset.id !== hoverId);
    });
  }
  legEl.addEventListener('pointerover', function (e) { var b = e.target.closest('button'); if (b && e.pointerType !== 'touch') T.hover(b.dataset.id); });
  legEl.addEventListener('pointerleave', function () { T.hover(null); });
  legEl.addEventListener('focusin', function (e) { var b = e.target.closest('button'); if (b) T.hover(b.dataset.id); });
  legEl.addEventListener('focusout', function () { T.hover(null); });
  legEl.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) T.open(b.dataset.id); });

  /* ============================== gráfica ============================== */
  var W = 0, H = 0, dpr = 1, RT = 54, TP = 8, BT = 22, sized = false, ff = '', colors = {};
  var bands = [], ymaxCur = 1, ymaxFrom = 1, ymaxTo = 1, mt0 = 0, mdur = 0, ent0 = 0, entDone = false, firstShown = false;
  var xTicks = { cur: [], prev: [], key: '' }, yTicks = { cur: [], prev: [], key: '' }, tickT0 = 0;
  var hIdx = -1, kbIdx = -1, lastHoverCol = -1, pending = false, rid = 0, tid = 0, lastT = 0;

  function win() { var N = PERIODS[Pi][1]; return { N: N, start: Math.max(0, TOT - N) }; }
  function sample(arr, start, j) { var f = start + (LAST - start) * j / (SAMPLES - 1), a = Math.floor(f), b = Math.min(LAST, a + 1), t = f - a; return arr[a] * (1 - t) + arr[b] * t; }
  function niceStep(max, n) {
    var raw = max / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag, s = r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10; return s * mag;
  }
  function SYM() { var d = window.PORTIFY_DEMO; return d && d.fmt && d.fmt.sym ? d.fmt.sym() : '$'; }
  function compact(v) {
    if (v >= 1e6) { var m = v / 1e6; return SYM() + (m >= 10 || Math.abs(m - Math.round(m)) < 0.005 ? String(Math.round(m * 10) / 10) : m.toFixed(2)).replace(/\.0$/, '') + ' M'; }
    if (v >= 1e3) return SYM() + Math.round(v / 1e3) + ' mil';
    return SYM() + Math.round(v);
  }
  function mkY(ymax) {
    var st = niceStep(ymax, 4), out = []; for (var v = 0; v <= ymax * 1.001; v += st) out.push(v); return out;
  }
  function mkX(start) {
    var fr = [0, 1 / 3, 2 / 3, 1], out = [], long = PERIODS[Pi][1] > 126;
    fr.forEach(function (f, k) {
      var d = Math.round(start + (LAST - start) * f), dt = dates[d]; if (!dt) return;
      var o = long ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' };
      out.push({ f: f, d: d, text: new Date(dt + 'T12:00:00').toLocaleDateString('es-MX', o).replace(/\./g, ''), al: k === 0 ? 'left' : k === 3 ? 'right' : 'center' });
    });
    return out;
  }

  /* fija el objetivo de la composición (periodo, orden, alta o baja); anim=false salta directo */
  function retarget(anim) {
    var now = performance.now(), w = win(), ps = T.portfolios, ids = {}, k;
    var dur = anim && !reduce() && firstShown ? 360 : 0;
    /* congela lo que se ve ahora como punto de partida */
    bands.forEach(function (b) { b.fLo = b.lo.slice(); b.fUp = b.up.slice(); b.aFrom = b.a; });
    ymaxFrom = ymaxCur; var cum = new Float64Array(SAMPLES), maxTot = 0;
    var cumMax = 0;
    ps.forEach(function (p, idx) {
      ids[p.id] = 1;
      var b = null; for (k = 0; k < bands.length; k++) if (bands[k].id === p.id) b = bands[k];
      var lo = new Float64Array(SAMPLES), up = new Float64Array(SAMPLES);
      for (var j = 0; j < SAMPLES; j++) { lo[j] = cum[j]; up[j] = cum[j] + sample(p.series, w.start, j); cum[j] = up[j]; if (up[j] > cumMax) cumMax = up[j]; }
      if (!b) { b = { id: p.id, lo: lo.slice(), up: lo.slice(), fLo: lo.slice(), fUp: lo.slice(), a: 0, aFrom: 0, dim: 0 }; bands.push(b); }
      b.tLo = lo; b.tUp = up; b.aTo = 1; b.rank = idx; b.color = p.color; b.dead = false;
    });
    bands.forEach(function (b) { if (!ids[b.id]) { b.tLo = b.lo.slice(); b.tUp = b.lo.slice(); b.aTo = 0; b.dead = true; b.rank = 99; } });
    ymaxTo = Math.max(1, cumMax * 1.06); if (!bands.length) ymaxTo = 1;
    mt0 = now; mdur = dur;
    var kx = w.start + ':' + PERIODS[Pi][1], ky = mkY(ymaxTo).join(',');
    if (xTicks.key !== kx) { xTicks.prev = xTicks.cur; xTicks.cur = mkX(w.start); xTicks.key = kx; }
    if (yTicks.key !== ky) { yTicks.prev = yTicks.cur; yTicks.cur = mkY(ymaxTo); yTicks.key = ky; }
    tickT0 = now; if (!dur) { xTicks.prev = []; yTicks.prev = []; }
    if (!dur) step(now + 1e6, true); /* salto directo */
    schedule();
  }

  function size() {
    var r = stage.getBoundingClientRect(); if (r.width < 4 || r.height < 4) { sized = false; return; }
    dpr = Math.min(window.devicePixelRatio || 1, 2); W = r.width; H = r.height;
    var cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    RT = W < 420 ? 64 : 66; sized = true;
  }
  function readColors() {
    var cs = getComputedStyle(stage), g = function (n) { return cs.getPropertyValue(n).trim(); };
    colors = { text: g('--text'), t2: g('--text-2'), t3: g('--text-3'), line: g('--line'), grid: g('--grid'), s1: g('--s1'), s2: g('--s2'), acc: g('--accent-ink'), pf: [] };
    for (var i = 1; i <= 6; i++) colors.pf[i] = g('--pf-' + i);
    ff = cs.fontFamily;
  }

  /* un paso de animación: interpola bandas, escala y marcas. Devuelve true si falta movimiento. */
  function step(now, force) {
    var e = mdur ? easeOut((now - mt0) / mdur) : 1, more = e < 1, dt = lastT ? clamp(now - lastT, 0, 64) : 16; lastT = now;
    bands.forEach(function (b) {
      for (var j = 0; j < SAMPLES; j++) { b.lo[j] = b.fLo[j] + (b.tLo[j] - b.fLo[j]) * e; b.up[j] = b.fUp[j] + (b.tUp[j] - b.fUp[j]) * e; }
      b.a = b.aFrom + (b.aTo - b.aFrom) * e;
      var tgt = hoverId && hoverId !== b.id ? 1 : 0, d = tgt - b.dim, sp = dt / (reduce() ? 1 : 160);
      if (Math.abs(d) > 0.001) { b.dim += clamp(d, -sp, sp); if (Math.abs(tgt - b.dim) > 0.001) more = true; } else b.dim = tgt;
    });
    ymaxCur = ymaxFrom + (ymaxTo - ymaxFrom) * e;
    if (e >= 1) { bands = bands.filter(function (b) { return !(b.dead && b.a <= 0.001); }); xTicks.prev = []; yTicks.prev = []; }
    if (ent0 && !entDone) { var el = now - ent0; if (el < 600 + 110 * Math.max(0, bands.length - 1) + 40) more = true; else entDone = true; }
    return more;
  }

  function draw(now) {
    if (!sized || !colors.s1) return;
    var w = win(), PL = 0, PR = W - RT, PT = TP, PB = H - BT, ph = PB - PT, pw = PR - PL;
    function X(f) { return PL + f * pw; }
    function Y(v) { return PB - v / ymaxCur * ph; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.font = '400 11px ' + ff;
    var te = mdur ? easeOut((now - mt0) / mdur) : 1;

    /* rejilla y rótulos del eje Y (los viejos se desvanecen) */
    function drawY(list, a) {
      if (a <= 0.01) return; ctx.globalAlpha = a; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      list.forEach(function (v) {
        var y = Y(v); if (y < PT - 1 || y > PB + 1) return;
        ctx.strokeStyle = v === 0 ? colors.line : colors.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PL, Math.round(y) + 0.5); ctx.lineTo(PR, Math.round(y) + 0.5); ctx.stroke();
        if (v > 0) { ctx.fillStyle = colors.t3; ctx.fillText(compact(v), PL + 2, y - 3); }
      });
      ctx.globalAlpha = 1;
    }
    drawY(yTicks.prev, 1 - te); drawY(yTicks.cur, yTicks.prev.length ? te : 1);

    /* orden de apilado por posición actual; la entrada hace crecer el grosor de cada banda, escalonada */
    var list = bands.slice().sort(function (a, b) { return a.lo[SAMPLES - 1] - b.lo[SAMPLES - 1] || a.rank - b.rank; });
    var entT = ent0 ? now - ent0 : 0, entering = ent0 && !entDone;
    var ef = list.map(function (b, k) { return entering ? easeOut((entT - 110 * k) / 600) : 1; });
    var drawn = list.map(function () { return { lo: new Float64Array(SAMPLES), up: new Float64Array(SAMPLES) }; });
    for (var j = 0; j < SAMPLES; j++) {
      var acc = 0;
      list.forEach(function (b, k) { var th = Math.max(0, b.up[j] - b.lo[j]) * ef[k]; drawn[k].lo[j] = entering ? acc : b.lo[j]; acc = entering ? acc + th : b.up[j]; drawn[k].up[j] = acc; });
    }
    /* los más recientes de la baja van debajo de todo: se pintan primero */
    var seq = list.map(function (b, k) { return k; }).sort(function (a, b) { return (list[b].dead ? 1 : 0) - (list[a].dead ? 1 : 0); });
    seq.forEach(function (k) {
      var b = list[k], d = drawn[k], dimA = 1 - 0.65 * b.dim, c = colors.pf[(/\d/.exec(b.color) || [1])[0]] || colors.acc;
      ctx.beginPath();
      for (var j = 0; j < SAMPLES; j++) { var x = X(j / (SAMPLES - 1)), y = Y(d.up[j]); if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      for (j = SAMPLES - 1; j >= 0; j--) ctx.lineTo(X(j / (SAMPLES - 1)), Y(d.lo[j]));
      ctx.closePath(); ctx.globalAlpha = 0.8 * b.a * dimA; ctx.fillStyle = c; ctx.fill();
      /* línea superior de la banda */
      ctx.beginPath();
      for (j = 0; j < SAMPLES; j++) { var x2 = X(j / (SAMPLES - 1)), y2 = Y(d.up[j]); if (j) ctx.lineTo(x2, y2); else ctx.moveTo(x2, y2); }
      ctx.globalAlpha = b.a * dimA; ctx.strokeStyle = colors.s1; ctx.lineWidth = 3.4; ctx.stroke();
      ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.stroke(); ctx.globalAlpha = 1;
    });

    /* eje X (el anterior se desvanece) */
    function drawX(list, a) {
      if (a <= 0.01) return; ctx.globalAlpha = a; ctx.fillStyle = colors.t3; ctx.textBaseline = 'top';
      list.forEach(function (t) { ctx.textAlign = t.al; ctx.fillText(t.text, X(t.f), PB + 6); }); ctx.globalAlpha = 1;
    }
    drawX(xTicks.prev, 1 - te); drawX(xTicks.cur, xTicks.prev.length ? te : 1);

    /* etiqueta del total al borde derecho */
    if (bands.length) {
      var topV = 0; bands.forEach(function (b) { if (!b.dead && b.up[SAMPLES - 1] > topV) topV = b.up[SAMPLES - 1]; });
      var ty = clamp(Y(topV), PT + 9, PB - 9), txt = compact(topV), tw = ctx.measureText(txt).width + 12;
      ctx.fillStyle = colors.s2; ctx.strokeStyle = colors.line; ctx.lineWidth = 1; ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(PR + 4, ty - 9, Math.min(tw, RT - 2), 18, 5); else ctx.rect(PR + 4, ty - 9, Math.min(tw, RT - 2), 18);
      ctx.fill(); ctx.stroke(); ctx.fillStyle = colors.text; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, PR + 10, ty + 0.5);
    }

    /* cruz de lectura */
    var ci = hIdx >= 0 ? hIdx : kbIdx;
    if (ci >= w.start && bands.length) {
      var f = (ci - w.start) / (LAST - w.start), x = Math.round(X(f)) + 0.5;
      ctx.strokeStyle = colors.t2; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, PT); ctx.lineTo(x, PB); ctx.stroke(); ctx.setLineDash([]);
      var jj = Math.round(f * (SAMPLES - 1)), topY = 0; bands.forEach(function (b) { if (b.up[jj] > topY) topY = b.up[jj]; });
      ctx.fillStyle = colors.text; ctx.strokeStyle = colors.s1; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, Y(topY), 3.5, 0, 6.2832); ctx.stroke(); ctx.fill();
      var lab = dateTxt(ci, true), lw = ctx.measureText(lab).width + 12, lx = clamp(x - lw / 2, PL, PR - lw);
      ctx.fillStyle = colors.s2; ctx.strokeStyle = colors.line; ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(lx, PB + 2, lw, 18, 5); else ctx.rect(lx, PB + 2, lw, 18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = colors.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lab, lx + lw / 2, PB + 11.5);
    }
  }

  function frame() {
    cancelAnimationFrame(rid); clearTimeout(tid); pending = false;
    var now = performance.now();
    if (!sized) size();
    if (sized && !colors.s1) readColors();
    if (sized && !firstShown && !sec.hidden && sec.dataset.view !== 'detail' && hero.dataset.mode !== 'empty') {
      firstShown = true; ent0 = reduce() ? 0 : now; entDone = reduce(); retarget(false);
      if (!reduce()) tweenLead({ value: 0, day: 0, dayPct: 0, ret: 0, retPct: 0, fx: T.fx.usdmxn, usdShare: 0, fxEffect: 0, idx: LAST }, T.metricsAt(LAST), 700, whenNow());
    }
    var more = step(now); draw(now); lastT = more ? lastT : 0;
    if (more) schedule();
  }
  function schedule() { if (pending) return; pending = true; rid = requestAnimationFrame(frame); tid = setTimeout(frame, 50); }

  /* ---------- puntero y teclado ---------- */
  function pointerAt(e) {
    var r = stage.getBoundingClientRect(), w = win(), pw = W - RT, x = e.clientX - r.left, y = e.clientY - r.top;
    if (x < 0 || x > pw || !bands.length) { clearHover(); return; }
    var f = clamp(x / pw, 0, 1), idx = Math.round(w.start + f * (LAST - w.start)); hIdx = idx; kbIdx = -1;
    var j = Math.round(f * (SAMPLES - 1)), PT = TP, ph = H - BT - PT, found = null;
    bands.forEach(function (b) { if (b.dead) return; var yu = H - BT - b.up[j] / ymaxCur * ph, yl = H - BT - b.lo[j] / ymaxCur * ph; if (y >= yu - 1 && y <= yl + 1) found = b.id; });
    T.hover(found); readout(idx); schedule();
  }
  function readout(idx) {
    tweenId++; paintLead(T.metricsAt(idx), idx === LAST ? whenNow() : dateTxt(idx)); paintLegend(idx);
    srEl.textContent = dateTxt(idx) + ': ' + fmt.mxn(T.total.series[idx]);
  }
  function clearHover() {
    var was = hIdx >= 0 || kbIdx >= 0; hIdx = -1; kbIdx = -1; T.hover(null);
    if (was) { tweenLead(shown, T.metricsAt(LAST), 220, whenNow()); paintLegend(LAST); }
    schedule();
  }
  stage.addEventListener('pointermove', pointerAt);
  stage.addEventListener('pointerdown', pointerAt);
  stage.addEventListener('pointerleave', clearHover);
  stage.addEventListener('pointerup', function (e) { if (e.pointerType === 'touch') clearHover(); });
  stage.addEventListener('pointercancel', clearHover);
  stage.addEventListener('blur', clearHover);
  stage.addEventListener('keydown', function (e) {
    var w = win(), cur = kbIdx >= 0 ? kbIdx : LAST, st = e.shiftKey ? 5 : 1, n = cur;
    if (e.key === 'ArrowLeft') n = cur - st; else if (e.key === 'ArrowRight') n = cur + st; else if (e.key === 'Home') n = w.start; else if (e.key === 'End') n = LAST; else if (e.key === 'Escape') { clearHover(); return; } else return;
    e.preventDefault(); kbIdx = clamp(n, w.start, LAST); hIdx = -1; readout(kbIdx); schedule();
  });
  perEl.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]'); if (!b) return; var i = +b.dataset.i; if (i === Pi) return;
    Pi = i; pill(); if (hIdx >= 0 || kbIdx >= 0) clearHover(); retarget(true);
  });

  /* ---------- eventos del modelo ---------- */
  T.on('hover', function () { paintLegend(hIdx >= 0 ? hIdx : kbIdx >= 0 ? kbIdx : LAST); schedule(); });
  T.on('change', function () {
    var from = shown; hIdx = -1; kbIdx = -1; renderChrome();
    if (!T.portfolios.length) { bands = []; paintLead(T.metricsAt(LAST), whenNow()); paintLegend(LAST); schedule(); return; }
    if (hoverId && !T.get(hoverId)) hoverId = null;
    tweenLead(from && from.idx === LAST ? from : T.metricsAt(LAST), T.metricsAt(LAST), 360, whenNow());
    paintLegend(LAST); if (firstShown) retarget(true); else schedule();
  });

  renderChrome(); paintLead(T.metricsAt(LAST), whenNow()); paintLegend(LAST); retarget(false);
  if (window.ResizeObserver) new ResizeObserver(function () { size(); schedule(); }).observe(stage);
  window.addEventListener('resize', function () { size(); schedule(); });
  new MutationObserver(function () { colors = {}; schedule(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  if (rmq.addEventListener) rmq.addEventListener('change', function () { schedule(); });
  schedule();
})();
