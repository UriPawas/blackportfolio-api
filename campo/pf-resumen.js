/* Campo · Portafolio individual · pestaña "Resumen". Expone window.CampoPfResumen.render(mount, portfolio|'todos', CampoTracker) -> { destroy }.
   Modelo: un LIBRO de movimientos de muestra por portafolio (aportaciones, compras, ventas, dividendos, retiros), coherente con las posiciones,
   el costo, lo realizado y la serie de 252 puntos de CampoTracker. Cada flujo se convierte a MXN con el USD/MXN de SU fecha.
   Convención de flujos: un movimiento del índice t ocurre al ABRIR el día t y se ejecuta al cierre de t−1; por eso el TWR
   ∏ V_t / (V_{t−1} + F_t) − 1 es exacto. En producción, con los datos reales de campo/datos.js. También expone window.CampoPfResumen.calc para pruebas. */
(function () {
  'use strict';
  var D = window.PORTIFY_DEMO;
  if (!D) return;
  var doc = typeof document !== 'undefined' ? document : null, root = doc && doc.documentElement;
  var TOT = 252, LAST = TOT - 1, S = 120;
  var rmq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduce() { return !!rmq.matches; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 4); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function isoMs(s) { return Date.parse(s + 'T00:00:00Z'); }
  function isoAdd(s, d) { return new Date(isoMs(s) + d * 864e5).toISOString().slice(0, 10); }
  function wkFwd(s) { var w = new Date(isoMs(s)).getUTCDay(); return w === 6 ? isoAdd(s, 2) : w === 0 ? isoAdd(s, 1) : s; }

  /* ============================== formato ============================== */
  var nf0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }), nf2 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function fM(v) { var a = Math.round(Math.abs(v)); return (v < 0 && a > 0 ? '−' : '') + '$' + nf0.format(a); }
  function fS(v) { var a = Math.round(Math.abs(v)); return (a === 0 ? '' : v < 0 ? '−' : '+') + '$' + nf0.format(a); }
  function fM2(v) { var a = Math.abs(v); return (v < 0 && a >= 0.005 ? '−' : '') + '$' + nf2.format(a); }
  function fS2(v) { var a = Math.abs(v); return (a < 0.005 ? '' : v < 0 ? '−' : '+') + '$' + nf2.format(a); }
  function fP(v, d) { return D.fmt.pct(v, d == null ? 2 : d); }
  function fN(v, d) { return new Intl.NumberFormat('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v); }
  function sgnCls(v) { return v > 0.0049 ? 'gain' : v < -0.0049 ? 'loss' : 'flat'; }
  function dTxt(iso, short) { return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', short ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, ''); }
  function compact(v) {
    if (v >= 1e6) { var m = v / 1e6; return '$' + (Math.round(m * 100) / 100).toString().replace('.', ',') + ' M'; }
    if (v >= 1e3) return '$' + Math.round(v / 1e3) + ' mil';
    return '$' + Math.round(v);
  }
  function niceStep(span, n) { var raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag; return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag; }

  /* ============================== modelo ============================== */
  /* la trayectoria local de cada posición viene del generador ÚNICO de CampoTracker (modelo de factores): suma exacta con su serie */
  function trackerPath(x, T) { return T.pricePath(x); }
  function freePath(tk, p0, v) { var r = mulberry32(hashStr(tk + '·pf')), a = new Float64Array(TOT); a[0] = p0; for (var i = 1; i < TOT; i++) a[i] = a[i - 1] * (1 + v[1] + v[0] * gauss(r)); return a; }

  /* posición cerrada por portafolio: compra antes de la ventana, venta (dentro o fuera) que produce lo realizado de la semilla */
  var CLOSED = {
    principal: { ticker: 'TSLA', name: 'Tesla', ccy: 'USD', qty: 12, p0: 182, vol: [.026, .0006], buy: '2025-04-14', sellIdx: 118 },
    retiro: { ticker: 'GMEXICOB', name: 'Grupo México', ccy: 'MXN', qty: 400, buy: '2024-03-12', sellDate: '2025-08-20', sellPx: 118.5 },
    cripto: { ticker: 'XRP', name: 'XRP', ccy: 'USD', qty: 800, p0: 2.1, vol: [.04, .0005], buy: '2025-09-15', sellIdx: 150 }
  };
  var DPS = { VOO: 1.78, IVV: 1.74, MSFT: 0.83, WALMEX: 0.58, GFNORTEO: 2.1, FIBRAMQ: 0.47 }; /* por acción y trimestre, en moneda local */
  var CLS_OF = {}; (D.positions || []).forEach(function (p) { CLS_OF[p.ticker] = p.cls; });
  var CLS_X = { IVV: 'ETF', BONDDIA: 'Deuda', FIBRAMQ: 'FIBRA', ETH: 'Cripto', SOL: 'Cripto' };
  function clsOf(t) { var c = CLS_OF[t] || CLS_X[t]; if (!c && window.CampoTracker && window.CampoTracker.catalog) window.CampoTracker.catalog.forEach(function (x) { if (x.ticker === t) c = x.cls; }); return c || 'Otros'; }

  function buildLedger(T, p) {
    /* producción: el libro ya viene armado con las transacciones REALES (campo/datos.js); aquí solo se le calculan los totales.
       Copia superficial: finish() agrega campos y nadie debe poder alterar el libro original. */
    if (p && p.ledger) {
      var R0 = p.ledger;
      return finish({ id: p.id, name: p.name, events: R0.events.slice(), rows: R0.rows.map(function (r) { var o = {}; for (var k in r) o[k] = r[k]; return o; }),
        V: R0.V, F: R0.F, Dc: R0.Dc, Wc: R0.Wc, cashAt: R0.cashAt, dates: R0.dates, fxLast: R0.fxLast, fxPrev: R0.fxPrev, benchmark: p.benchmark || R0.benchmark, held: R0.held });
    }
    var dates = T.dates, fxs = T.fx.series, ev = [], seq = 0, held = [], rows = [], rng = mulberry32(hashStr(p.id + '·led'));
    var w0 = isoMs(dates[0]), created = p.created || dates[0];
    function fxAt(date) {
      var i = dates.indexOf(date); if (i >= 0) return fxs[i];
      var yrs = (w0 - isoMs(date)) / 31557600000, wob = (hashStr(date) % 1000 / 1000 - .5) * 0.03;
      return fxs[0] * Math.exp(-0.028 * yrs + wob);
    }
    function add(e) { e.seq = seq++; e.pf = p.id; if (e.idx >= 0) e.date = dates[e.idx]; ev.push(e); return e; }
    var span = Math.floor((w0 - isoMs(created)) / 864e5) - 1;
    function preDate(frac) { return span < 2 ? isoAdd(dates[0], -1) : wkFwd(isoAdd(created, Math.round(span * frac))); }

    var seedPos = p.seedPositions || p.positions || [], seedCash = p.seedCash != null ? p.seedCash : (p.cash || 0), seedReal = p.seedRealized != null ? p.seedRealized : (p.realized || 0);
    seedPos.forEach(function (x) {
      var isU = x.currency === 'USD', path = trackerPath(x, T), qty = x.qty, tot = qty * x.avg, q1 = 0, i1 = -1, pw = 0, step = qty >= 5 ? 1 : qty >= 1 ? 0.05 : 0.001;
      var qq = Math.max(step, Math.round(qty * (0.12 + 0.1 * rng()) / step) * step), ix = 12 + Math.floor(rng() * 215);
      if (hashStr(p.id + x.ticker) % 3 !== 1 && qq < qty * 0.5 && (tot - qq * path[ix - 1]) / (qty - qq) > 0.3 * x.avg) { q1 = +qq.toFixed(6); i1 = ix; pw = path[ix - 1]; }
      var q0 = +(qty - q1).toFixed(6), cost0 = tot - q1 * pw, a0 = cost0 / q0;
      var l1 = +(Math.round(q0 * 0.6 / step) * step).toFixed(6), l2 = +(q0 - l1).toFixed(6), p1 = a0 * (0.93 + 0.05 * rng()), p2 = l2 > 0 ? (cost0 - l1 * p1) / l2 : a0;
      var lots = [];
      if (l1 > 0 && l2 > 0 && p2 > 0 && l1 < q0) { lots.push({ idx: -1, date: preDate(0), q: l1, px: p1 }, { idx: -1, date: preDate(0.4 + 0.35 * rng()), q: l2, px: p2 }); }
      else lots.push({ idx: -1, date: preDate(0), q: q0, px: a0 });
      if (i1 >= 0) lots.push({ idx: i1, date: dates[i1], q: q1, px: pw, exec: i1 - 1 });
      var cost = 0;
      lots.forEach(function (l) {
        var fx = isU ? (l.idx < 0 ? fxAt(l.date) : fxs[l.exec]) : 1; l.fx = fx; l.mxn = r2(l.q * l.px * fx); cost += l.mxn;
        add({ t: 'dep', idx: l.idx, date: l.date, mxn: l.mxn, note: 'Aportación' });
        add({ t: 'buy', idx: l.idx, date: l.date, mxn: l.mxn, tk: x.ticker, name: x.name, qty: l.q, px: l.px, ccy: x.currency, fx: fx, note: 'Compra ' + x.ticker });
      });
      var h = lots.map(function (l) { return { idx: l.idx, q: l.q }; });
      held.push({ ticker: x.ticker, name: x.name, ccy: x.currency, path: path, lots: h, price: x.price, d1: x.d1 });
      /* dividendos trimestrales con la cantidad que se tenía ese día */
      if (DPS[x.ticker]) for (var k = 0, di = 6 + hashStr(x.ticker + '·div') % 57; di < LAST - 8; k++, di += 63) {
        var qh = 0; h.forEach(function (l) { if (l.idx <= di) qh += l.q; });
        var fxd = isU ? fxs[di] : 1, m = r2(qh * DPS[x.ticker] * fxd);
        if (m > 0) add({ t: 'div', idx: di, mxn: m, tk: x.ticker, name: x.name, qty: qh, px: DPS[x.ticker], ccy: x.currency, fx: fxd, note: 'Dividendo ' + x.ticker });
      }
    });

    var cl = CLOSED[p.id];
    if (cl && seedReal !== 0) {
      var isU2 = cl.ccy === 'USD', bq = cl.qty, sellIdx = cl.sellIdx != null ? cl.sellIdx : -1, sdate = sellIdx >= 0 ? dates[sellIdx] : cl.sellDate, spx, sfx, path2 = null;
      if (sellIdx >= 0) { path2 = freePath(cl.ticker, cl.p0, cl.vol); spx = path2[sellIdx - 1]; sfx = isU2 ? fxs[sellIdx - 1] : 1; } else { spx = cl.sellPx; sfx = isU2 ? fxAt(sdate) : 1; }
      var proceeds = r2(bq * spx * sfx), bcost = r2(proceeds - seedReal), bfx = isU2 ? fxAt(cl.buy) : 1;
      add({ t: 'dep', idx: -1, date: cl.buy, mxn: bcost, note: 'Aportación' });
      add({ t: 'buy', idx: -1, date: cl.buy, mxn: bcost, tk: cl.ticker, name: cl.name, qty: bq, px: bcost / (bq * bfx), ccy: cl.ccy, fx: bfx, note: 'Compra ' + cl.ticker, closed: true });
      add({ t: 'sell', idx: sellIdx, date: sdate, mxn: proceeds, tk: cl.ticker, name: cl.name, qty: bq, px: spx, ccy: cl.ccy, fx: sfx, note: 'Venta ' + cl.ticker, closed: true });
      var wi = sellIdx >= 0 ? sellIdx + 3 : -1;
      add({ t: 'wd', idx: wi, date: wi >= 0 ? dates[wi] : isoAdd(sdate, 5), mxn: proceeds, note: 'Retiro de lo vendido' });
      if (path2) held.push({ ticker: cl.ticker, ccy: cl.ccy, path: path2, lots: [{ idx: -1, q: bq }, { idx: sellIdx, q: -bq }] });
    }

    function eff(e) { return e.t === 'dep' || e.t === 'sell' || e.t === 'div' ? e.mxn : -e.mxn; }
    function sortEv() { ev.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.seq - b.seq; }); }
    var raw = 0; ev.forEach(function (e) { raw += eff(e); });
    var diff = r2(raw - seedCash);
    if (Math.abs(diff) >= 0.005) add(diff > 0 ? { t: 'wd', idx: LAST - 4, mxn: diff, note: 'Retiro de efectivo' } : { t: 'dep', idx: LAST - 4, mxn: -diff, note: 'Aportación de efectivo' });

    /* movimientos del USUARIO (CampoTracker.tx): cada uno en su fecha, con su precio y su TC; el lote entra a la posición que corresponda */
    (p.userTx || []).forEach(function (u) {
      var i = -1; for (var k = 0; k < TOT; k++) if (dates[k] <= u.date) i = k; if (i < 0) return;
      var e = { t: u.t, idx: i, mxn: u.mxn, note: u.note || '', user: true, uid: u.id, auto: !!u.auto };
      if (u.tk) { e.tk = u.tk; e.name = u.name; }
      if (u.t === 'buy' || u.t === 'sell') {
        e.qty = u.qty; e.px = u.px; e.ccy = u.ccy; e.fx = u.fx; e.fee = u.fee || 0; e.note = (u.t === 'buy' ? 'Compra ' : 'Venta ') + u.tk;
        var hp = null; held.forEach(function (h) { if (h.ticker === u.tk && !hp) hp = h; });
        if (!hp) { var cat = null; (T.catalog || []).forEach(function (c) { if (c.ticker === u.tk) cat = c; }); var pth = T.pricePath(cat || { ticker: u.tk, price: u.px, d1: 0, currency: u.ccy }); hp = { ticker: u.tk, name: u.name, ccy: u.ccy, path: pth, lots: [], price: cat ? cat.price : u.px, d1: cat ? cat.d1 : 0 }; held.push(hp); }
        hp.lots.push({ idx: i, q: u.t === 'buy' ? u.qty : -u.qty });
      } else if (u.t === 'div') { e.note = 'Dividendo ' + (u.tk || ''); e.qty = 0; e.px = 0; e.ccy = 'MXN'; e.fx = 1; }
      else e.note = u.note || (u.t === 'dep' ? 'Aportación' : 'Retiro');
      add(e);
    });
    sortEv();

    /* renglones de HOY desde los lotes (cantidad final) y el costo promedio en pesos de cada posición */
    var avg = {}; ev.forEach(function (e) {
      if (!e.tk || (e.t !== 'buy' && e.t !== 'sell')) return; var o = avg[e.tk] || (avg[e.tk] = { q: 0, c: 0 });
      if (e.t === 'buy') { o.q += e.qty; o.c += e.mxn; } else { var f = o.q > 0 ? Math.min(1, e.qty / o.q) : 0; o.c -= o.c * f; o.q -= e.qty; }
    });
    rows.length = 0;
    held.forEach(function (h) {
      var q = 0; h.lots.forEach(function (l) { q += l.q; }); q = +q.toFixed(8); if (q <= 1e-9 || h.price == null) return;
      var isU = h.ccy === 'USD', fxN = isU ? T.fx.usdmxn : 1;
      rows.push({ ticker: h.ticker, name: h.name || h.ticker, cls: clsOf(h.ticker), qty: q, price: h.price, prev: h.path[LAST - 1], d1: h.d1 || 0, ccy: h.ccy, isU: isU,
        cost: r2((avg[h.ticker] || { c: 0 }).c), mv: q * h.price * fxN, local: q * h.price });
    });

    var V = new Float64Array(TOT), F = new Float64Array(TOT), cashAt = new Float64Array(TOT), c0 = 0, add_ = new Float64Array(TOT), Dc = new Float64Array(TOT), Wc = new Float64Array(TOT), dA = new Float64Array(TOT), wA = new Float64Array(TOT), d0 = 0, w0_ = 0;
    ev.forEach(function (e) {
      if (e.idx < 0) { c0 += eff(e); if (e.t === 'dep') d0 += e.mxn; else if (e.t === 'wd') w0_ += e.mxn; }
      else { add_[e.idx] += eff(e); if (e.t === 'dep') { F[e.idx] += e.mxn; dA[e.idx] += e.mxn; } else if (e.t === 'wd') { F[e.idx] -= e.mxn; wA[e.idx] += e.mxn; } }
    });
    for (var q = 0, cd = d0, cw = w0_; q < TOT; q++) { cd += dA[q]; cw += wA[q]; Dc[q] = cd; Wc[q] = cw; }
    var c = c0;
    for (var t = 0; t < TOT; t++) {
      c += add_[t]; cashAt[t] = c; var v = c;
      held.forEach(function (hp) { var q = 0; hp.lots.forEach(function (l) { if (l.idx <= t) q += l.q; }); if (q) v += q * hp.path[t] * (hp.ccy === 'USD' ? fxs[t] : 1); });
      V[t] = v;
    }
    return finish({ id: p.id, name: p.name, events: ev, rows: rows, V: V, F: F, Dc: Dc, Wc: Wc, cashAt: cashAt, dates: dates, fxLast: T.fx.usdmxn, fxPrev: fxs[LAST - 1], benchmark: p.benchmark, held: held });
  }

  function finish(L) {
    var D_ = 0, W_ = 0, Div = 0, B = 0, S_ = 0, openCost = 0, closedCost = 0, first = null, realized = 0, pos = {};
    L.events.forEach(function (e) {
      if (e.t === 'dep') { D_ += e.mxn; if (!first || e.date < first) first = e.date; } else if (e.t === 'wd') W_ += e.mxn; else if (e.t === 'div') Div += e.mxn;
      else if (e.t === 'buy') { B += e.mxn; if (!L.parts) { var o = pos[e.tk] || (pos[e.tk] = { q: 0, c: 0 }); o.q += e.qty; o.c += e.mxn; } }
      else if (e.t === 'sell') { S_ += e.mxn; if (!L.parts) { var o2 = pos[e.tk] || (pos[e.tk] = { q: 0, c: 0 }), f = o2.q > 0 ? Math.min(1, e.qty / o2.q) : 0, cb = o2.c * f; realized += e.mxn - cb; closedCost += cb; o2.c -= cb; o2.q -= e.qty; } }
    });
    /* costo promedio en pesos: lo vendido se lleva su parte proporcional del costo; en "Todos" se suman los de cada portafolio */
    if (L.parts) L.parts.forEach(function (P) { realized += P.realized; openCost += P.openCost; closedCost += P.closedCost; });
    else Object.keys(pos).forEach(function (k) { if (pos[k].q > 1e-9) openCost += pos[k].c; });
    var mvPos = 0, prevVal = 0, dayAmt = 0, fxEff = 0;
    L.rows.forEach(function (r) { mvPos += r.mv; var f = r.isU ? L.fxLast : 1; prevVal += r.qty * r.prev * f; dayAmt += r.qty * (r.price - r.prev) * f; if (r.isU) fxEff += r.qty * r.prev * (L.fxLast - L.fxPrev); });
    L.dep = D_; L.wd = W_; L.div = Div; L.sells = S_; L.buys = B; L.openCost = openCost; L.closedCost = closedCost; L.first = first;
    L.mvPos = mvPos; L.cashEnd = L.cashAt[LAST]; L.value = L.V[LAST]; L.realized = realized; L.unrealized = mvPos - openCost; L.gain = L.value + W_ - D_;
    L.dayTot = dayAmt + fxEff; L.dayTotPct = L.V[LAST - 1] ? L.dayTot / L.V[LAST - 1] * 100 : 0;
    L.prevVal = prevVal; L.dayAmt = dayAmt; L.dayPct = prevVal ? dayAmt / prevVal * 100 : 0; L.fxEffect = fxEff;
    return L;
  }

  function aggregate(T) {
    var Ls = T.portfolios.map(function (p) { return buildLedger(T, p); }), ev = [], by = {}, rows = [];
    var V = new Float64Array(TOT), F = new Float64Array(TOT), cashAt = new Float64Array(TOT), Dc = new Float64Array(TOT), Wc = new Float64Array(TOT);
    Ls.forEach(function (L) {
      L.events.forEach(function (e) { ev.push(e); });
      for (var i = 0; i < TOT; i++) { V[i] += L.V[i]; F[i] += L.F[i]; Dc[i] += L.Dc[i]; Wc[i] += L.Wc[i]; cashAt[i] += L.cashAt[i]; }
      L.rows.forEach(function (r) {
        var m = by[r.ticker];
        if (!m) { m = by[r.ticker] = { ticker: r.ticker, name: r.name, cls: r.cls, qty: 0, price: r.price, prev: r.prev, d1: r.d1, ccy: r.ccy, isU: r.isU, cost: 0, mv: 0, local: 0 }; rows.push(m); }
        m.qty += r.qty; m.cost += r.cost; m.mv += r.mv; m.local += r.local;
      });
    });
    ev.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.seq - b.seq; });
    var T0 = T.portfolios[0];
    return finish({ id: 'todos', name: 'Todos los portafolios', events: ev, rows: rows, V: V, F: F, Dc: Dc, Wc: Wc, cashAt: cashAt, dates: T.dates, fxLast: T.fx.usdmxn, fxPrev: T.fx.series[LAST - 1], benchmark: 'S&P 500', parts: Ls });
  }

  /* ============================== cálculos ============================== */
  function twr(V, F, s, e) { var g = 1; for (var t = s + 1; t <= e; t++) { var den = V[t - 1] + F[t]; if (den > 0) g *= V[t] / den; } return g - 1; }
  function twrSeries(V, F, s) { var out = new Float64Array(LAST - s + 1), g = 100; out[0] = 100; for (var t = s + 1; t <= LAST; t++) { var den = V[t - 1] + F[t]; if (den > 0) g *= V[t] / den; out[t - s] = g; } return out; }
  function npv(fl, r) { var t0 = fl[0].t, s = 0; for (var i = 0; i < fl.length; i++) s += fl[i].a / Math.pow(1 + r, (fl[i].t - t0) / 864e5 / 365); return s; }
  function solveXirr(fl) {
    if (fl.length < 2) return null;
    var lo = -0.95, hi = 50, flo = npv(fl, lo), fhi = npv(fl, hi); if (!(flo * fhi < 0)) return null;
    for (var i = 0; i < 200; i++) { var mid = (lo + hi) / 2, fm = npv(fl, mid); if (flo * fm <= 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; } }
    return (lo + hi) / 2;
  }
  function xirrOf(L) {
    var fl = [], dates = L.dates;
    L.events.forEach(function (e) { if (e.t === 'dep') fl.push({ t: isoMs(e.date), a: -e.mxn }); else if (e.t === 'wd') fl.push({ t: isoMs(e.date), a: e.mxn }); });
    var tEnd = isoMs(dates[LAST]); fl.push({ t: tEnd, a: L.value }); fl.sort(function (a, b) { return a.t - b.t; });
    var years = L.first ? (tEnd - isoMs(L.first)) / 864e5 / 365 : 0;
    if (years < 1) return { r: null, years: years, flows: fl };
    return { r: solveXirr(fl), years: years, flows: fl };
  }

  function benchOf(T, name) {
    var map = { 'S&P 500': 'S&P 500', 'NASDAQ 100': 'Nasdaq 100', 'S&P/BMV IPC': 'S&P/BMV IPC', 'Bitcoin': 'Bitcoin' }, want = map[name] || 'S&P 500', mk = null;
    /* S&P 500: la MISMA serie en MXN que usa la gráfica del Inicio, para que ambas pantallas cuenten lo mismo */
    var sb = D.series && D.series.benchmark;
    if (want === 'S&P 500' && sb && sb.length >= TOT) return { name: 'S&P 500', a: Float64Array.from(sb.slice(-TOT)) };
    D.markets.forEach(function (m) { if (m.sym === want) mk = m; });
    var usd = !/IPC/.test(mk.sym), a = new Float64Array(TOT);
    for (var i = 0; i < TOT; i++) a[i] = mk.hist[i] * (usd ? T.fx.series[i] : 1);
    return { name: mk.sym, a: a };
  }

  /* ============================== utilidades de DOM ============================== */
  var uid = 0;
  function toast(m) { var t = doc.getElementById('toast'); if (!t) return; t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('on'); }, 2800); }
  function every(fn) { var done = false, r = 0, t = 0; (function run() { if (done) return; cancelAnimationFrame(r); clearTimeout(t); if (fn() === false) { done = true; return; } r = requestAnimationFrame(run); t = setTimeout(run, 50); })(); }
  var DEMO_TICKERS = {}; (D.positions || []).forEach(function (p) { DEMO_TICKERS[p.ticker] = 1; });
  var HOVER = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)').matches : false;
  var EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
  function mark(t) { return window.CampoMarks ? window.CampoMarks.svg(t, 24) : '<span class="pfr-chip">' + esc(String(t).charAt(0)) + '</span>'; }

  /* ============================== render ============================== */
  function render(mount, portfolio, T) {
    var off = [], dead = false; install(T);
    var pf = portfolio === 'todos' || (portfolio && portfolio.cons) ? 'todos' : (typeof portfolio === 'string' ? T.get(portfolio) : portfolio);
    var L = pf === 'todos' ? aggregate(T) : (pf ? buildLedger(T, pf) : null);
    function destroy() { if (dead) return; dead = true; off.forEach(function (f) { try { f(); } catch (e) { } }); off = []; if (mount) mount.innerHTML = ''; }
    var api = { destroy: destroy, ledger: L };
    if (!L || (!L.rows.length && Math.abs(L.cashEnd) < 0.005)) {
      mount.innerHTML = '<div class="pfr"><div class="pfr-empty"><strong>Este portafolio aún no tiene movimientos</strong><p>Agrega una posición o importa un CSV y aquí verás tu patrimonio, tu rendimiento frente al índice y la composición.</p></div></div>';
      return api;
    }
    var id = 'pfr' + (++uid), dates = T.dates, fx0 = T.fx.usdmxn;
    var bench = benchOf(T, L.benchmark), V = L.V, F = L.F;
    var PERIODS = [['1M', 21], ['3M', 63], ['6M', 126], ['1A', LAST]], Pi = 3, mode = 'rend';
    function startIdx() { return Math.max(0, LAST - PERIODS[Pi][1]); }

    /* ---------- KPIs ---------- */
    var X = xirrOf(L);
    function li(k, a, b, cls) { return '<li class="pfr-fl' + (cls ? ' ' + cls : '') + '" style="--i:' + k + '">' + (b == null ? '<span class="pfr-fx">' + a + '</span>' : '<span>' + a + '</span><span class="num">' + b + '</span>') + '</li>'; }
    function lines(arr) { return arr.map(function (r, k) { return li(k, r[0], r[1], r[2]); }).join(''); }
    function twrInfo() {
      var s = startIdx(), val = twr(V, F, s, LAST) * 100, net = 0, n = 0;
      for (var t = s + 1; t <= LAST; t++) if (Math.abs(F[t]) > 0.004) { net += F[t]; n++; }
      var dV = V[LAST] - V[s], arr = [['∏ [ V<sub>t</sub> ÷ (V<sub>t−1</sub> + F<sub>t</sub>) ] − 1'], ['Periodo', dTxt(dates[s]) + ' → ' + dTxt(dates[LAST])], ['Patrimonio inicial', fM2(V[s])], ['Patrimonio final', fM2(V[LAST])],
        ['Flujos netos del periodo (' + n + (n === 1 ? ' movimiento)' : ' movimientos)'), fS2(net)], ['Cambio de patrimonio', fS2(dV)], ['… del que no es aportación (mercado, dividendos, TC)', fS2(dV - net)]];
      if (!n) arr.push(['Sin flujos: V final ÷ V inicial − 1', fP(val)]);
      arr.push(['TWR · ' + PERIODS[Pi][0], fP(val), 'res']);
      return { val: val, lines: arr };
    }
    var ledgerM = (function () {
      var usdLocal = 0, usdMxn = 0, mxnLoc = 0; L.rows.forEach(function (r) { if (r.isU) { usdLocal += r.local; usdMxn += r.mv; } else mxnLoc += r.local; });
      var rent = L.dep ? L.gain / L.dep * 100 : 0, tw = twrInfo();
      var K = [
        { id: 'pat', name: 'Patrimonio', to: L.value, fmt: fM, sign: false, sub: 'Posiciones ' + fM(L.mvPos) + ' · efectivo ' + fM(L.cashEnd),
          lines: [['Σ cantidad × precio × TC + efectivo'], ['Posiciones en USD (' + fM2(usdLocal).replace('$', '$') + ' USD × ' + fN(fx0, 4) + ')', fM2(usdMxn)], ['Posiciones en MXN', fM2(mxnLoc)], ['Efectivo', fM2(L.cashEnd)], ['Patrimonio', fM2(L.value), 'res'],
            ['TC USD/MXN ' + fN(fx0, 4) + ' al ' + dTxt(dates[LAST]) + ' (último dato).']] },
        { id: 'hoy', name: 'Hoy', to: L.dayTot, fmt: fS, sign: true, sub: fP(L.dayTotPct) + ' vs cierre anterior · precio y tipo de cambio',
          lines: [['Efecto precio + efecto cambiario'], ['Patrimonio al cierre anterior (con efectivo)', fM2(L.V[LAST - 1])], ['Efecto precio: Σ cantidad × (precio − cierre anterior) × TC de hoy', fS2(L.dayAmt)], ['Efecto cambiario: USD × (TC de hoy − TC anterior)', fS2(L.fxEffect)], ['Cambio total', fS2(L.dayTot), 'res'],
            ['Hoy = cambio total ÷ patrimonio anterior', fP(L.dayTotPct)]] },
        { id: 'gan', name: 'Ganancia total', to: L.gain, fmt: fS, sign: true, sub: 'Realizada, no realizada, dividendos y tipo de cambio',
          lines: [['Patrimonio + retiros acumulados − aportaciones acumuladas'], ['Patrimonio', fM2(L.value)], ['+ Retiros acumulados', fM2(L.wd)], ['− Aportaciones acumuladas', fM2(L.dep)], ['Ganancia total', fS2(L.gain), 'res'],
            ['Desglose: no realizada (valor − costo de lotes abiertos, a su TC)', fS2(L.unrealized)], ['Realizada (ventas − su costo)', fS2(L.realized)], ['Dividendos cobrados', fS2(L.div)],
            ['Suma del desglose', fS2(L.unrealized + L.realized + L.div)]] },
        { id: 'ren', name: 'Rentabilidad', to: rent, fmt: function (v) { return fP(v); }, sign: true, sub: 'Sobre ' + fM(L.dep) + ' aportados',
          lines: [['Ganancia total ÷ capital aportado'], ['Ganancia total', fS2(L.gain)], ['Capital aportado (Σ aportaciones)', fM2(L.dep)], ['Rentabilidad', fP(rent), 'res'], ['El denominador es todo lo aportado, no solo el costo de lo que sigue abierto.']] },
        { id: 'twr', name: 'TWR · ' + PERIODS[Pi][0], to: tw.val, fmt: function (v) { return fP(v); }, sign: true, sub: 'Ponderado por tiempo, sin efecto de las aportaciones', lines: tw.lines },
        { id: 'xir', name: 'XIRR anualizado', to: X.r == null ? null : X.r * 100, fmt: function (v) { return fP(v); }, sign: true, sub: X.r == null ? (X.years < 1 ? 'Necesita 1 año de historia' : 'No hay solución real con estos flujos') : 'Ponderado por dinero · desde ' + dTxt(L.first),
          lines: (function () {
            var nd = 0, nw = 0; L.events.forEach(function (e) { if (e.t === 'dep') nd++; else if (e.t === 'wd') nw++; });
            var a = [['Σ F<sub>i</sub> ÷ (1 + r)<sup>(d<sub>i</sub> − d<sub>0</sub>)/365</sup> = 0'], ['Primer flujo', dTxt(L.first)], ['Flujos', nd + ' aportaciones y ' + nw + ' retiros, en MXN al TC de su fecha'], ['Valor final (patrimonio)', fM2(L.value) + ' · ' + dTxt(dates[LAST])], ['Historia', fN(X.years, 2) + ' años']];
            a.push(X.r == null ? [X.years < 1 ? 'Con menos de 1 año el anualizado engaña: se muestra desde que haya 1 año de historia.' : 'Sin cambio de signo en los flujos.'] : ['XIRR (r)', fP(X.r * 100), 'res']);
            return a;
          })() }
      ];
      return { K: K, twr: tw };
    })();
    var K = ledgerM.K;

    var recLhs = r2(L.dep) - r2(L.wd) + r2(L.gain), recOk = Math.abs(recLhs - r2(L.value)) < 0.005;
    var recHTML = '<span>Aportado <b class="num">' + fM2(L.dep) + '</b></span> − <span>retirado <b class="num">' + fM2(L.wd) + '</b></span> + <span>ganancia <b class="num">' + fS2(L.gain).replace('+', '') + '</b></span> = <span>patrimonio <b class="num">' + fM2(L.value) + '</b></span>' +
      '<em class="pfr-ok' + (recOk ? '' : ' bad') + '">' + (recOk ? 'Cuadra al centavo' : 'No cuadra: ' + fM2(recLhs - L.value)) + '</em>';

    var ledHTML = K.map(function (k, n) {
      var did = id + '-d' + n;
      return '<article class="pfr-k" data-k="' + k.id + '"><h3 class="pfr-kn">' + esc(k.name) + '</h3><p class="pfr-kv num" data-kv>' + (k.to == null ? '—' : esc(k.fmt(k.to))) + '</p><p class="pfr-ks">' + k.sub + '</p>' +
        '<button type="button" class="pfr-q" aria-expanded="false" aria-controls="' + did + '">¿Cómo se calcula?<svg class="pfr-qi" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></button>' +
        '<div class="pfr-dx" id="' + did + '" role="region" aria-label="Cálculo de ' + esc(k.name) + '"><div class="pfr-dxi"><ul class="pfr-fls" data-lines>' + lines(k.lines) + '</ul></div></div></article>';
    }).join('');

    /* ---------- composición y posiciones ---------- */
    var cashW = L.value ? Math.max(0, L.cashEnd) / L.value : 0, byCls = {}, order = [];
    L.rows.forEach(function (r) { r.w = L.value ? r.mv / L.value : 0; r.gp = r.cost ? (r.mv / r.cost - 1) * 100 : 0; byCls[r.cls] = (byCls[r.cls] || 0) + r.mv; });
    Object.keys(byCls).forEach(function (c) { order.push({ name: c, mv: byCls[c] }); });
    order.sort(function (a, b) { return b.mv - a.mv; });
    order.forEach(function (c, i) { c.w = L.value ? c.mv / L.value : 0; c.col = 'var(--pf-' + (i % 6 + 1) + ')'; });
    if (L.cashEnd > 0.005) order.push({ name: 'Efectivo', mv: L.cashEnd, w: cashW, col: 'color-mix(in oklch, var(--text-3) 55%, var(--s1))', cash: true });
    var segs = order.map(function (c) { return '<button type="button" class="pfr-seg" data-c="' + esc(c.name) + '" style="--w:' + (c.w * 100).toFixed(3) + ';--c:' + c.col + '" aria-label="' + esc(c.name) + ' ' + fN(c.w * 100, 1) + ' %"></button>'; }).join('');
    var leg = order.map(function (c) { return '<li><button type="button" class="pfr-lg" data-c="' + esc(c.name) + '"><i class="pfr-sw" style="--c:' + c.col + '"></i><span class="pfr-ln">' + esc(c.name) + '</span><span class="pfr-lv num">' + fN(c.w * 100, 1) + ' %</span></button></li>'; }).join('');
    var top = L.rows.slice().sort(function (a, b) { return b.mv - a.mv; }).slice(0, 5), topMax = top.length ? top[0].w : 1;
    var topHTML = top.map(function (r) { return '<li class="pfr-tw" data-t="' + esc(r.ticker) + '" data-c="' + esc(r.cls) + '"><span class="pfr-twn">' + esc(r.ticker) + '</span><span class="pfr-twb" aria-hidden="true"><i style="--w:' + (r.w / topMax * 100).toFixed(1) + '%"></i></span><span class="pfr-twv num">' + fN(r.w * 100, 1) + ' %</span></li>'; }).join('');

    var sortKey = 'mv', sortDir = -1;
    var COLS = [['ticker', 'Activo', 1], ['w', 'Peso', 0], ['mv', 'Valor', 0], ['d1', 'Día', 0], ['gp', 'Ganancia', 0]];
    var heads = COLS.map(function (c) { return '<button type="button" class="pfr-sh" data-s="' + c[0] + '" data-c="' + c[0] + '"><span>' + c[1] + '</span><svg class="pfr-si" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M7 14l5 5 5-5"/></svg></button>'; }).join('');
    function rowHTML(r) {
      return '<li class="pfr-prow" data-t="' + esc(r.ticker) + '" data-c="' + esc(r.cls) + '"><button type="button" class="pfr-pr" aria-label="' + esc(r.ticker) + ', ' + esc(r.name) + '. Ver ficha"><span class="pfr-pa">' + mark(r.ticker) + '<span class="pfr-pn"><strong>' + esc(r.ticker) + '</strong><span>' + esc(r.name) + '</span></span></span>' +
        '<span class="pfr-pw num">' + fN(r.w * 100, 1) + ' %</span><span class="pfr-pv num">' + fM(r.mv) + '</span><span class="pfr-pd num ' + sgnCls(r.d1) + '">' + fP(r.d1) + '</span><span class="pfr-pg num ' + sgnCls(r.gp) + '">' + fP(r.gp, 1) + '</span></button></li>';
    }
    function sorted() { return L.rows.slice().sort(function (a, b) { var x = a[sortKey], y = b[sortKey]; if (sortKey === 'ticker') return sortDir * String(x).localeCompare(String(y)); return sortDir * (x - y) || a.ticker.localeCompare(b.ticker); }); }

    var benchLabel = bench.name === 'S&P 500' ? 'S&P 500 en MXN' : bench.name + (/IPC/.test(bench.name) ? '' : ' en MXN');
    mount.innerHTML = '<div class="pfr" id="' + id + '" data-mode="rend">' +
      '<p class="pfr-tag">Base MXN · USD/MXN ' + fN(fx0, 2) + ' al ' + dTxt(dates[LAST]) + ' · cada flujo con el tipo de cambio de su fecha</p>' +
      '<section class="pfr-led" aria-label="Indicadores del portafolio">' + ledHTML + '</section>' +
      '<p class="pfr-rec" aria-label="Conciliación">' + recHTML + '</p>' +
      '<section class="pfr-ch panel" aria-label="Gráfico"><div class="pfr-ctop"><div class="pfr-ct"><h2 id="' + id + 'h">Rendimiento frente a ' + esc(bench.name) + '</h2>' +
      '<ul class="pfr-key" aria-hidden="true"><li><i class="pfr-ln1"></i>Cartera</li><li data-key-b><i class="pfr-ln2"></i>' + esc(benchLabel) + '</li><li data-key-f hidden><i class="pfr-tk"></i>Aportación<i class="pfr-tk pfr-tkd"></i>Retiro</li></ul></div>' +
      '<div class="pfr-ctl"><div class="seg pfr-sm" role="group" aria-label="Qué mostrar" style="--n:2"><span class="seg-pill" aria-hidden="true"></span><button type="button" data-m="rend" aria-pressed="true">Rendimiento</button><button type="button" data-m="valor" aria-pressed="false">Valor en MXN</button></div>' +
      '<div class="seg pfr-sp" role="group" aria-label="Periodo" style="--n:4"><span class="seg-pill" aria-hidden="true"></span>' + PERIODS.map(function (p, i) { return '<button type="button" data-p="' + i + '" aria-pressed="' + (i === Pi) + '">' + p[0] + '</button>'; }).join('') + '</div></div></div>' +
      '<dl class="pfr-ro" data-ro><div><dt>Fecha</dt><dd data-r="a"></dd></div><div><dt data-rl="b">Cartera</dt><dd data-r="b"></dd></div><div><dt data-rl="c">' + esc(bench.name) + '</dt><dd data-r="c"></dd></div><div><dt data-rl="d">Diferencia</dt><dd data-r="d"></dd></div></dl>' +
      '<div class="pfr-stage" tabindex="0" role="group" aria-labelledby="' + id + 'h" aria-describedby="' + id + 'k"><canvas aria-hidden="true"></canvas></div>' +
      '<p class="pfr-sr" id="' + id + 'k" aria-live="polite">Con las flechas izquierda y derecha lees cada día.</p></section>' +
      '<div class="pfr-cols"><section class="pfr-comp panel" aria-label="Composición"><div class="panel-head"><h2>Composición</h2><span class="muted">Por tipo de activo</span></div><div class="pfr-bar" data-bar>' + segs + '</div><ul class="pfr-leg" role="list">' + leg + '</ul>' +
      '<h3 class="pfr-h3">Mayores pesos</h3><ul class="pfr-top" role="list">' + topHTML + '</ul></section>' +
      '<section class="pfr-pos panel" aria-label="Posiciones"><div class="panel-head"><h2>Posiciones</h2><span class="muted">' + L.rows.length + (L.rows.length === 1 ? ' activo' : ' activos') + ' · peso sobre el patrimonio</span>' + (window.CampoTxSheet ? '<button type="button" class="btn btn-secondary btn-sm pfr-addtx" data-addtx>Agregar movimiento</button>' : '') + '</div><div class="pfr-ph" role="group" aria-label="Ordenar">' + heads + '</div><ul class="pfr-pl" role="list" data-pl>' + sorted().map(rowHTML).join('') + '</ul></section></div></div>';

    var $ = function (s) { return mount.querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || mount).querySelectorAll(s)); };
    var rootEl = $('.pfr');

    /* ---------- divulgación animada ---------- */
    var supportsIS = !!(window.CSS && CSS.supports && CSS.supports('interpolate-size', 'allow-keywords'));
    $$('.pfr-q').forEach(function (b) {
      b.addEventListener('click', function () {
        var dx = doc.getElementById(b.getAttribute('aria-controls')), open = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', String(open));
        if (!supportsIS && !reduce() && dx.animate) {
          if (open) { dx.setAttribute('data-open', ''); var h = dx.scrollHeight; dx.animate([{ height: '0px' }, { height: h + 'px' }], { duration: 300, easing: EXPO }); }
          else { var h0 = dx.offsetHeight; dx.removeAttribute('data-open'); dx.animate([{ height: h0 + 'px' }, { height: '0px' }], { duration: 240, easing: EXPO }); }
        } else if (open) dx.setAttribute('data-open', ''); else dx.removeAttribute('data-open');
      });
    });

    /* ---------- rodar cifras ---------- */
    function kEl(id_) { return $('[data-k="' + id_ + '"] [data-kv]'); }
    var rollId = 0;
    function roll(el, from, to, fmt, dur, delay) {
      var my = ++rollId; el._r = my;
      if (reduce() || from === to || dur <= 0) { el.textContent = fmt(to); return; }
      var t0 = performance.now() + (delay || 0);
      every(function () {
        if (dead || el._r !== my) return false;
        var k = (performance.now() - t0) / dur; if (k < 0) return true;
        var e = 1 - Math.pow(1 - clamp(k, 0, 1), 3); el.textContent = fmt(from + (to - from) * e); if (k >= 1) { el.textContent = fmt(to); return false; }
      });
    }
    function paintSign(el, v) { el.classList.remove('gain', 'loss', 'flat'); el.classList.add(sgnCls(v)); }
    K.forEach(function (k) { var el = kEl(k.id); if (k.sign && k.to != null) paintSign(el, k.to); else if (k.to == null) el.classList.add('flat'); });
    function rollKpis() {
      K.forEach(function (k, n) { var el = kEl(k.id); if (k.to == null) return; var f = k.fmt; roll(el, 0, k.to, f, 700, n * 40); });
    }

    /* ---------- gráfico ---------- */
    var stage = $('.pfr-stage'), canvas = stage.querySelector('canvas'), ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1, RT = 62, PT = 10, BT = 26, sized = false, colors = null, ff = '';
    var cur = { p: new Float64Array(S), b: new Float64Array(S), lo: 0, hi: 1, ba: 1 }, from = null, to = null, t0 = 0, dur = 0, started = false, revT0 = 0, revDone = false;
    var raw = null, hIdx = -1, kbIdx = -1, pending = false, rid = 0, tid = 0, roEl = $('[data-ro]'), srEl = $('.pfr-sr');
    var tkFrom = [], tkTo = [], xTk = [];

    function samp(arr) { var n = arr.length, out = new Float64Array(S); for (var j = 0; j < S; j++) { var f = j / (S - 1) * (n - 1), a = Math.floor(f), b = Math.min(n - 1, a + 1), t = f - a; out[j] = arr[a] * (1 - t) + arr[b] * t; } return out; }
    function mkTarget() {
      var s = startIdx(), P, B = null, i;
      if (mode === 'rend') { P = twrSeries(V, F, s); B = new Float64Array(LAST - s + 1); for (i = 0; i <= LAST - s; i++) B[i] = 100 * bench.a[s + i] / bench.a[s]; }
      else P = V.subarray(s);
      var lo = Infinity, hi = -Infinity;
      for (i = 0; i < P.length; i++) { if (P[i] < lo) lo = P[i]; if (P[i] > hi) hi = P[i]; }
      if (B) for (i = 0; i < B.length; i++) { if (B[i] < lo) lo = B[i]; if (B[i] > hi) hi = B[i]; }
      if (mode === 'rend') { lo = Math.min(lo, 100); hi = Math.max(hi, 100); }
      var pad = (hi - lo || hi * 0.02 || 1) * 0.12; lo -= pad; hi += pad;
      var st = niceStep(hi - lo, 4), ticks = []; for (var v = Math.ceil(lo / st) * st; v <= hi; v += st) ticks.push(+v.toFixed(6));
      var dec = mode === 'rend' ? (st < 1 ? 1 : 0) : 0, per = PERIODS[Pi][1] > 126, xt = [];
      [0, 1 / 3, 2 / 3, 1].forEach(function (f, k) { var d = Math.round(s + (LAST - s) * f); xt.push({ f: f, text: new Date(dates[d] + 'T12:00:00').toLocaleDateString('es-MX', per ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' }).replace(/\./g, ''), al: k === 0 ? 'left' : k === 3 ? 'right' : 'center' }); });
      raw = { s: s, P: P, B: B };
      return { p: samp(P), b: B ? samp(B) : samp(P), lo: lo, hi: hi, ba: B ? 1 : 0, ticks: ticks.map(function (v) { return { v: v, text: mode === 'rend' ? fN(v, dec) : compact(v) }; }), xt: xt };
    }
    function retarget(anim) {
      var now = performance.now(); from = { p: cur.p.slice(), b: cur.b.slice(), lo: cur.lo, hi: cur.hi, ba: cur.ba }; tkFrom = tkTo;
      to = mkTarget(); tkTo = to.ticks; xTk = to.xt; t0 = now; dur = anim && started && !reduce() ? 360 : 0;
      if (!dur) { tkFrom = []; cur.p = to.p.slice(); cur.b = to.b.slice(); cur.lo = to.lo; cur.hi = to.hi; cur.ba = to.ba; }
      paintRO(hIdx >= 0 ? hIdx : kbIdx >= 0 ? kbIdx : -1); schedule();
    }
    function step(now) {
      if (!to) return false;
      var e = dur ? easeOut((now - t0) / dur) : 1;
      for (var j = 0; j < S; j++) { cur.p[j] = from.p[j] + (to.p[j] - from.p[j]) * e; cur.b[j] = from.b[j] + (to.b[j] - from.b[j]) * e; }
      cur.lo = from.lo + (to.lo - from.lo) * e; cur.hi = from.hi + (to.hi - from.hi) * e; cur.ba = from.ba + (to.ba - from.ba) * e;
      if (e >= 1) tkFrom = []; var more = e < 1;
      if (started && !revDone) { if (reduce() || now - revT0 >= 640) revDone = true; else more = true; }
      return more;
    }
    function size() {
      var r = stage.getBoundingClientRect(); if (r.width < 4 || r.height < 4) { sized = false; return; }
      dpr = Math.min(window.devicePixelRatio || 1, 2); W = r.width; H = r.height;
      var cw = Math.round(W * dpr), ch = Math.round(H * dpr); if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      RT = W < 420 ? 58 : 64; sized = true;
    }
    function readColors() {
      var cs = getComputedStyle(stage), g = function (n) { return cs.getPropertyValue(n).trim(); };
      colors = { text: g('--text'), t2: g('--text-2'), t3: g('--text-3'), line: g('--line'), grid: g('--grid'), s1: g('--s1'), s2: g('--s2'), acc: g('--accent-ink') }; ff = cs.fontFamily;
    }
    function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
    function draw(now) {
      if (!sized || !colors || !to) return;
      var PL = 0, PR = W - RT, PB = H - BT, ph = PB - PT, pw = PR - PL, span = (cur.hi - cur.lo) || 1;
      function X(f) { return PL + f * pw; } function Y(v) { return PB - (v - cur.lo) / span * ph; }
      var te = dur ? easeOut((now - t0) / dur) : 1, rv = started ? (revDone ? 1 : easeOut((now - revT0) / 600)) : 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.font = '400 11px ' + ff;
      function grid(list, a) {
        if (a <= 0.01) return; ctx.globalAlpha = a; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        list.forEach(function (t) { var y = Y(t.v); if (y < PT - 1 || y > PB + 1) return; ctx.strokeStyle = colors.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PL, Math.round(y) + 0.5); ctx.lineTo(PR, Math.round(y) + 0.5); ctx.stroke(); ctx.fillStyle = colors.t3; ctx.fillText(t.text, PL + 2, y - 3); });
        ctx.globalAlpha = 1;
      }
      grid(tkFrom, 1 - te); grid(tkTo, tkFrom.length ? te : 1);
      ctx.strokeStyle = colors.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PL, Math.round(PB) + 0.5); ctx.lineTo(PR, Math.round(PB) + 0.5); ctx.stroke();
      if (mode === 'rend' || cur.ba > 0.02) { /* línea base 100 */
        var y100 = Y(100); if (mode === 'rend' && y100 > PT && y100 < PB) { ctx.save(); ctx.globalAlpha = 0.9 * cur.ba; ctx.setLineDash([4, 4]); ctx.strokeStyle = colors.t3; ctx.beginPath(); ctx.moveTo(PL, Math.round(y100) + 0.5); ctx.lineTo(PR, Math.round(y100) + 0.5); ctx.stroke(); ctx.restore(); }
      }
      xTk.forEach(function (t) { ctx.fillStyle = colors.t3; ctx.globalAlpha = 1; ctx.textBaseline = 'top'; ctx.textAlign = t.al; ctx.fillText(t.text, X(t.f), PB + 8); });
      /* marcas de flujo sobre el eje (solo Valor) */
      var fa = 1 - cur.ba;
      if (fa > 0.02 && raw) {
        ctx.globalAlpha = fa; ctx.strokeStyle = colors.t2; ctx.lineWidth = 1.5;
        for (var t = raw.s + 1; t <= LAST; t++) {
          var fv = F[t]; if (Math.abs(fv) < 0.004) continue; var x = Math.round(X((t - raw.s) / (LAST - raw.s))) + 0.5;
          ctx.beginPath(); if (fv > 0) { ctx.moveTo(x, PB); ctx.lineTo(x, PB - 8); } else { ctx.moveTo(x, PB); ctx.lineTo(x, PB + 6); } ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      /* líneas, reveladas de izquierda a derecha */
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, PL + (PR - PL) * rv + 2, H); ctx.clip();
      function line(arr, col, w, a) { ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); for (var j = 0; j < S; j++) { var x = X(j / (S - 1)), y = Y(arr[j]); if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); ctx.globalAlpha = 1; }
      if (cur.ba > 0.01) line(cur.b, colors.t2, 1.6, cur.ba);
      line(cur.p, colors.s1, 4.2, 1); line(cur.p, colors.acc, 2.2, 1);
      ctx.restore();
      /* etiquetas al borde derecho */
      if (rv >= 0.98 && raw) {
        var tags = [{ y: Y(cur.p[S - 1]), text: mode === 'rend' ? fN(raw.P[raw.P.length - 1], 1) : compact(raw.P[raw.P.length - 1]), col: colors.acc, a: 1 }];
        if (cur.ba > 0.02) tags.push({ y: Y(cur.b[S - 1]), text: raw.B ? fN(raw.B[raw.B.length - 1], 1) : '', col: colors.t2, a: cur.ba });
        tags.sort(function (a, b) { return a.y - b.y; });
        for (var k = 0; k < tags.length; k++) { tags[k].y = clamp(tags[k].y, PT + 9, PB - 9); if (k && tags[k].y - tags[k - 1].y < 20) tags[k].y = tags[k - 1].y + 20; }
        tags.forEach(function (g) {
          if (!g.text) return; ctx.globalAlpha = g.a; var tw = Math.min(ctx.measureText(g.text).width + 12, RT - 2);
          ctx.fillStyle = colors.s2; ctx.strokeStyle = colors.line; ctx.lineWidth = 1; rr(PR + 4, g.y - 9, tw, 18, 5); ctx.fill(); ctx.stroke();
          ctx.fillStyle = g.col; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(g.text, PR + 10, g.y + 0.5); ctx.globalAlpha = 1;
        });
      }
      /* cruz de lectura */
      var ci = hIdx >= 0 ? hIdx : kbIdx;
      if (raw && ci >= raw.s && te >= 1 && rv >= 1) {
        var f = (ci - raw.s) / (LAST - raw.s), xc = Math.round(X(f)) + 0.5, k0 = ci - raw.s;
        ctx.strokeStyle = colors.t2; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xc, PT); ctx.lineTo(xc, PB); ctx.stroke(); ctx.setLineDash([]);
        function dot(v, col) { ctx.fillStyle = col; ctx.strokeStyle = colors.s1; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(xc, Y(v), 3.6, 0, 6.2832); ctx.stroke(); ctx.fill(); }
        if (raw.B) dot(raw.B[k0], colors.t2); dot(raw.P[k0], colors.acc);
        var lab = dTxt(dates[ci], true), lw = ctx.measureText(lab).width + 12, lx = clamp(xc - lw / 2, PL, PR - lw);
        ctx.fillStyle = colors.s2; ctx.strokeStyle = colors.line; ctx.lineWidth = 1; rr(lx, PB + 3, lw, 18, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = colors.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lab, lx + lw / 2, PB + 12.5);
      }
    }
    function frame() {
      cancelAnimationFrame(rid); clearTimeout(tid); pending = false;
      if (dead) return; var now = performance.now();
      if (!sized) size(); if (sized && !colors) readColors();
      var more = step(now); draw(now); if (more) schedule();
    }
    function schedule() { if (pending || dead) return; pending = true; rid = requestAnimationFrame(frame); tid = setTimeout(frame, 50); }

    /* lectura fija (cuatro celdas de ancho constante) */
    function paintRO(idx) {
      if (!raw) return; var s = raw.s, i = idx >= s ? idx : LAST, k = i - s, set = function (n, t, c) { var e = roEl.querySelector('[data-r="' + n + '"]'); e.textContent = t; e.className = c || ''; };
      var dt = dTxt(dates[i]) + (i === LAST && idx < s ? '' : '');
      if (mode === 'rend') {
        var p = raw.P[k], b = raw.B[k], d = p - b;
        roEl.querySelector('[data-rl="b"]').textContent = 'Cartera'; roEl.querySelector('[data-rl="c"]').textContent = bench.name; roEl.querySelector('[data-rl="d"]').textContent = 'Diferencia';
        set('a', dt); set('b', fN(p, 1) + ' · ' + fP(p - 100, 1), ''); set('c', fN(b, 1) + ' · ' + fP(b - 100, 1), ''); set('d', (d > 0.049 ? '+' : d < -0.049 ? '−' : '') + fN(Math.abs(d), 1) + ' pts', sgnCls(d));
        srEl.textContent = dt + ': cartera ' + fN(p, 1) + ', ' + bench.name + ' ' + fN(b, 1) + ', diferencia ' + fN(d, 1) + ' puntos';
      } else {
        var v = raw.P[k], dv = v - raw.P[0], fl = F[i], flt = i > s && Math.abs(fl) > 0.004 ? (fl > 0 ? 'Aportación ' + fM(fl) : 'Retiro ' + fM(-fl)) : '—';
        roEl.querySelector('[data-rl="b"]').textContent = 'Valor'; roEl.querySelector('[data-rl="c"]').textContent = 'Cambio en el periodo'; roEl.querySelector('[data-rl="d"]').textContent = 'Flujo del día';
        set('a', dt); set('b', fM(v)); set('c', fS(dv) + ' · ' + fP(raw.P[0] ? dv / raw.P[0] * 100 : 0, 1), sgnCls(dv)); set('d', flt);
        srEl.textContent = dt + ': valor ' + fM(v) + ', cambio ' + fS(dv) + ', flujo ' + flt;
      }
    }
    function pointerAt(e) {
      var r = stage.getBoundingClientRect(), pw = W - RT, x = e.clientX - r.left; if (!raw || x < 0 || x > pw) { clearHover(); return; }
      hIdx = Math.round(raw.s + clamp(x / pw, 0, 1) * (LAST - raw.s)); kbIdx = -1; paintRO(hIdx); schedule();
    }
    function clearHover() { var was = hIdx >= 0 || kbIdx >= 0; hIdx = -1; kbIdx = -1; if (was) paintRO(-1); schedule(); }
    stage.addEventListener('pointermove', pointerAt); stage.addEventListener('pointerdown', pointerAt); stage.addEventListener('pointerleave', clearHover); stage.addEventListener('pointercancel', clearHover);
    stage.addEventListener('pointerup', function (e) { if (e.pointerType === 'touch') clearHover(); }); stage.addEventListener('blur', clearHover);
    stage.addEventListener('keydown', function (e) {
      if (!raw) return; var c = kbIdx >= 0 ? kbIdx : LAST, st = e.shiftKey ? 5 : 1, n = c;
      if (e.key === 'ArrowLeft') n = c - st; else if (e.key === 'ArrowRight') n = c + st; else if (e.key === 'Home') n = raw.s; else if (e.key === 'End') n = LAST; else if (e.key === 'Escape') { clearHover(); return; } else return;
      e.preventDefault(); kbIdx = clamp(n, raw.s, LAST); hIdx = -1; paintRO(kbIdx); schedule();
    });
    function pill(seg, i) { seg.style.setProperty('--i', i); }
    var segM = $('.pfr-sm'), segP = $('.pfr-sp'); pill(segM, 0); pill(segP, Pi);
    segM.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-m]'); if (!b || b.dataset.m === mode) return; mode = b.dataset.m; rootEl.setAttribute('data-mode', mode);
      $$('button', segM).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); pill(segM, mode === 'rend' ? 0 : 1);
      $('#' + id + 'h').textContent = mode === 'rend' ? 'Rendimiento frente a ' + bench.name : 'Valor del portafolio en MXN';
      $('[data-key-b]').hidden = mode !== 'rend'; $('[data-key-f]').hidden = mode === 'rend'; if (hIdx >= 0 || kbIdx >= 0) { hIdx = -1; kbIdx = -1; } retarget(true);
    });
    segP.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-p]'); if (!b) return; var i = +b.dataset.p; if (i === Pi) return; var old = twrInfo().val; Pi = i;
      $$('button', segP).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); pill(segP, Pi); hIdx = -1; kbIdx = -1; retarget(true);
      var info = twrInfo(), k = K[4]; k.to = info.val; k.name = 'TWR · ' + PERIODS[Pi][0]; k.lines = info.lines;
      var cell = $('[data-k="twr"]'); cell.querySelector('.pfr-kn').textContent = k.name; cell.querySelector('[data-lines]').innerHTML = lines(info.lines); paintSign(kEl('twr'), info.val);
      roll(kEl('twr'), old, info.val, k.fmt, 360, 0);
    });

    /* ---------- composición ↔ posiciones ---------- */
    var hl = null, pinned = null;
    function setHL(c) {
      if (c === hl) return; hl = c; if (c) rootEl.setAttribute('data-hl', ''); else rootEl.removeAttribute('data-hl');
      $$('.pfr-prow,.pfr-tw').forEach(function (r) { r.classList.toggle('is-hl', !!c && r.dataset.c === c); });
      $$('.pfr-seg,.pfr-lg').forEach(function (s) { s.classList.toggle('is-on', !!c && s.dataset.c === c); });
    }
    function hlBind(sel) {
      $$(sel).forEach(function (b) {
        if (HOVER) { b.addEventListener('pointerenter', function () { if (!pinned) setHL(b.dataset.c); }); b.addEventListener('pointerleave', function () { if (!pinned) setHL(null); }); }
        b.addEventListener('focus', function () { if (!pinned) setHL(b.dataset.c); }); b.addEventListener('blur', function () { if (!pinned) setHL(null); });
        b.addEventListener('click', function () { pinned = pinned === b.dataset.c ? null : b.dataset.c; setHL(pinned); });
      });
    }
    hlBind('.pfr-seg'); hlBind('.pfr-lg');
    var plEl = $('[data-pl]');
    if (HOVER) { plEl.addEventListener('pointerover', function (e) { var r = e.target.closest('.pfr-prow'); if (r && !pinned) setHL(r.dataset.c); }); plEl.addEventListener('pointerleave', function () { if (!pinned) setHL(null); }); }
    plEl.addEventListener('click', function (e) {
      var r = e.target.closest('.pfr-prow'); if (!r) return; var t = r.dataset.t;
      doc.dispatchEvent(new CustomEvent('campo:open-position', { detail: { ticker: t } })); /* la ficha ya lee del Tracker: abre cualquier posición del portafolio */
    });
    function paintSort() {
      $$('.pfr-sh').forEach(function (b) {
        var on = b.dataset.s === sortKey; b.classList.toggle('is-on', on); b.dataset.dir = on ? (sortDir > 0 ? 'asc' : 'desc') : '';
        b.setAttribute('aria-label', 'Ordenar por ' + b.textContent + (on ? (sortDir > 0 ? ', ascendente' : ', descendente') : ''));
      });
    }
    paintSort();
    $('.pfr-ph').addEventListener('click', function (e) {
      var b = e.target.closest('.pfr-sh'); if (!b) return; var k = b.dataset.s;
      if (k === sortKey) sortDir = -sortDir; else { sortKey = k; sortDir = k === 'ticker' ? 1 : -1; }
      var tops = {}; $$('.pfr-prow', plEl).forEach(function (r) { tops[r.dataset.t] = r.getBoundingClientRect().top; });
      var by = {}; $$('.pfr-prow', plEl).forEach(function (r) { by[r.dataset.t] = r; });
      sorted().forEach(function (r) { plEl.appendChild(by[r.ticker]); });
      paintSort();
      if (!reduce()) $$('.pfr-prow', plEl).forEach(function (r) { var d = tops[r.dataset.t] - r.getBoundingClientRect().top; if (Math.abs(d) > 1 && r.animate) r.animate([{ transform: 'translateY(' + d + 'px)' }, { transform: 'none' }], { duration: 300, easing: EXPO }); });
    });

    /* ---------- primera vista ---------- */
    function start() {
      if (started || dead) return; started = true; revT0 = performance.now();
      if (!reduce()) {
        rollKpis();
        var bar = $('[data-bar]'); if (bar.animate) bar.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 600, easing: EXPO, delay: 120, fill: 'backwards' });
        $$('.pfr-tw i').forEach(function (i, n) { if (i.animate) i.animate([{ transform: 'scaleX(0)' }, { transform: 'none' }], { duration: 500, easing: EXPO, delay: 160 + n * 40, fill: 'backwards' }); });
      } else revDone = true;
      schedule();
    }
    function visible() { return mount.offsetWidth > 0 && mount.offsetHeight > 0; }
    if (mount.animate && !reduce()) mount.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: EXPO });
    retarget(false); paintRO(-1);
    if (window.ResizeObserver) { var ro = new ResizeObserver(function () { size(); if (!started && visible()) start(); schedule(); }); ro.observe(stage); ro.observe(mount); off.push(function () { ro.disconnect(); }); }
    var resz = function () { size(); schedule(); }; window.addEventListener('resize', resz); off.push(function () { window.removeEventListener('resize', resz); });
    var mo = new MutationObserver(function () { colors = null; schedule(); }); mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] }); off.push(function () { mo.disconnect(); });
    var onRm = function () { schedule(); }; if (rmq.addEventListener) { rmq.addEventListener('change', onRm); off.push(function () { rmq.removeEventListener('change', onRm); }); }
    off.push(function () { cancelAnimationFrame(rid); clearTimeout(tid); });
    size(); if (visible()) start(); else setTimeout(function () { size(); if (!started && visible()) start(); }, 0);
    schedule();
    return api;
  }

  /* UNA definición para Hoy (precio + TC) y Rentabilidad (ganancia total ÷ aportado): se impone a CampoTracker (hero, cruz, lista y encabezado) */
  var cKey = '', cAgg = null, applying = false;
  function ledgers(T) {
    var key = (T.txVersion || 0) + '#' + T.portfolios.map(function (p) { return p.id + ':' + (p.positions || []).length + ':' + (p.cash || 0); }).join('|');
    if (key !== cKey || !cAgg) { cKey = key; cAgg = aggregate(T); } return cAgg;
  }
  function retOf(L) { return { amt: L.gain, pct: L.dep ? L.gain / L.dep * 100 : 0 }; }
  function same(a, b) { return a && Math.abs(a.amt - b.amt) < 0.004 && Math.abs(a.pct - b.pct) < 1e-6; }
  function applyDefinition(T) {
    if (applying) return; applying = true;
    try {
      var agg = ledgers(T), changed = false;
      agg.parts.forEach(function (L, i) { var p = T.portfolios[i], r = retOf(L); if (p && !same(p.ret, r)) { p.ret = r; changed = true; } });
      if (T.total) { var rt = retOf(agg); if (!same(T.total.ret, rt)) { T.total.ret = rt; changed = true; } }
      if (changed) T.emit('change', { type: 'ret' });
    } finally { applying = false; }
  }
  function install(T) {
    if (!T || T.__pfDef) return; T.__pfDef = true; var base = T.metricsAt;
    T.metricsAt = function (i) {
      var m = base(i); try { var a = ledgers(T), d = a.Dc[i], g = a.V[i] + a.Wc[i] - d; m.ret = g; m.retPct = d ? g / d * 100 : 0; } catch (e) { }
      return m;
    };
    T.on('change', function () { applyDefinition(T); }); applyDefinition(T);
  }
  install(window.CampoTracker);

  /* El Inicio cuenta la MISMA historia que el Tracker: D.series.portfolio pasa a ser el índice TWR de Principal (sin el salto
     de aportaciones y retiros), escalado para terminar en su valor de hoy. Se reescribe en sitio antes de que lo lean el
     comparador del acceso, el cargador y las gráficas del Inicio. Antes era una serie aleatoria aparte (+30 % contra +9.7 %). */
  function syncInicio() {
    var T0 = window.CampoTracker, REAL0 = !!window.CAMPO_REAL, P0 = T0 && T0.get && (REAL0 ? { positions: [].concat.apply([], T0.portfolios.map(function (p) { return p.positions || []; })) } : T0.get('principal')), sp = D.series && D.series.portfolio;
    if (!P0 || !sp || sp.length < TOT) return;
    try {
      /* producción: el Inicio es TODO el patrimonio (todos los portafolios), no un portafolio "principal" */
      var L0 = REAL0 ? aggregate(T0) : buildLedger(T0, P0), ix = twrSeries(L0.V, L0.F, 0), k = L0.value / ix[LAST], off = sp.length - TOT; for (var q = 0; q < TOT; q++) sp[off + q] = ix[q] * k;
      /* y los KPI del Inicio con las MISMAS definiciones del Tracker: hoy con efecto cambiario; ganancia = valor + retiros − aportaciones */
      D.dayChange = L0.dayTot; D.dayChangePct = L0.dayTotPct; D.pnl = L0.gain; D.pnlPct = L0.dep ? L0.gain / L0.dep * 100 : 0; D.invested = L0.dep - L0.wd; D.total = L0.value;
      /* posiciones del Inicio = renglones del libro de Principal (en sitio): cantidad, costo en pesos al TC de cada compra,
         ganancia no realizada en pesos y peso sobre el patrimonio — lo mismo que muestran la ficha y el Tracker */
      var by = {}; D.positions.forEach(function (x) { by[x.ticker] = x; });
      var next = L0.rows.map(function (r) {
        var x = by[r.ticker] || { ticker: r.ticker }, pp = null; (P0.positions || []).forEach(function (z) { if (z.ticker === r.ticker) pp = z; });
        x.name = r.name; x.cls = x.cls || r.cls; x.ccy = r.ccy; x.qty = r.qty; x.avg = pp ? pp.avg : x.avg; x.price = r.price; x.d1 = r.d1;
        x.value = r.mv; x.cost = r.cost; x.pnl = r.mv - r.cost; x.pnlPct = r.cost ? (r.mv / r.cost - 1) * 100 : 0; x.weight = L0.value ? r.mv / L0.value * 100 : 0;
        return x;
      });
      D.positions.length = 0; next.forEach(function (x) { D.positions.push(x); });
    } catch (e) { }
  }
  syncInicio();
  if (window.CampoTracker && window.CampoTracker.on) window.CampoTracker.on('change', function (ev) { if (ev && ev.type === 'tx' && (window.CAMPO_REAL || ev.id === 'principal')) syncInicio(); });

  window.CampoPfResumen = { render: render, calc: { DPS: DPS, clsOf: clsOf, buildLedger: buildLedger, aggregate: aggregate, twr: twr, twrSeries: twrSeries, xirrOf: xirrOf, solveXirr: solveXirr, npv: npv, benchOf: benchOf } };
})();
