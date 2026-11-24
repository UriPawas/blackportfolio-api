/* Campo · Portafolio individual · pestaña "Desempeño". Expone window.CampoPfDesempeno.render(mount, portfolio|'todos', CampoTracker) -> { destroy } y .calc para pruebas.
   Reutiliza el libro de CampoPfResumen.calc (V, F por portafolio en MXN a su fecha, twr/twrSeries, benchOf) y su `held` (posiciones por lote) para la contribución.
   Una sola serie de rendimientos r_t = V_t / (V_{t−1} + F_t) − 1 (neutraliza aportaciones y retiros) y UNA sola ventana alimentan volatilidad, Sharpe, Sortino,
   beta, alfa, tracking error, captura, VaR y caídas: la beta se calcula una vez. En producción, con los datos reales de campo/datos.js. */
(function () {
  'use strict';
  var D = window.PORTIFY_DEMO, R = window.CampoPfResumen;
  if (!D || !R || !R.calc) return;
  var doc = typeof document !== 'undefined' ? document : null, root = doc && doc.documentElement;
  var TOT = 252, LAST = TOT - 1, S = 120, MIN_N = 40, MIN_YEARS = 1; /* anualizar sólo periodos de 1 año o más: con menos se extrapola */
  var rmq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduce() { return !!rmq.matches; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 4); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function isoMs(s) { return Date.parse(s + 'T00:00:00Z'); }
  var HOVER = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)').matches : false;
  var EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';

  /* ============================== formato ============================== */
  var nf0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
  function BS() { var t = window.CampoTracker; return (t && t.base) || 'MXN'; }
  function SYM() { var d = window.PORTIFY_DEMO; return d && d.fmt && d.fmt.sym ? d.fmt.sym() : '$'; }
  function fM(v) { var a = Math.round(Math.abs(v)); return (v < 0 && a > 0 ? '−' : '') + SYM() + nf0.format(a); }
  function fS(v) { var a = Math.round(Math.abs(v)); return (a === 0 ? '' : v < 0 ? '−' : '+') + SYM() + nf0.format(a); }
  var nfc = {};
  function fN(v, d) { var k = d; if (!nfc[k]) nfc[k] = new Intl.NumberFormat('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d }); return nfc[k].format(v); }
  function sgn(v, d, unit) { var a = Math.abs(v), z = a < 0.5 * Math.pow(10, -d); return (z ? '' : v < 0 ? '−' : '+') + fN(a, d) + (unit || ''); }
  function fP(v, d) { return sgn(v, d == null ? 2 : d, ' %'); }          /* con signo */
  function fPu(v, d) { return (v < 0 && Math.abs(v) >= 0.5 * Math.pow(10, -(d == null ? 1 : d)) ? '−' : '') + fN(Math.abs(v), d == null ? 1 : d) + ' %'; } /* sin signo + */
  function sgnCls(v) { return v > 0.0049 ? 'gain' : v < -0.0049 ? 'loss' : 'flat'; }
  function dTxt(iso, short) { return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', short ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, ''); }
  function niceStep(span, n) { var raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag; return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag; }
  function compact(v) { var a = Math.abs(v), s = v < 0 ? '−' : ''; if (a >= 1e6) return s + SYM() + (Math.round(a / 1e4) / 100).toString().replace('.', ',') + ' M'; if (a >= 1e3) return s + SYM() + Math.round(a / 1e3) + ' mil'; return s + SYM() + Math.round(a); }
  var MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  var MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  /* tasa libre de riesgo por divisa base del portafolio (de muestra) */
  var RF = { MXN: [7.25, 'CETES 28'], USD: [4.30, 'T-Bill 3M'], EUR: [2.15, '€STR'], GBP: [4.00, 'SONIA'], CAD: [3.00, 'CORRA'], BRL: [14.5, 'Selic'] };
  var PERIODS = [['1M', 21], ['3M', 63], ['6M', 126], ['1A', LAST], ['Todo', LAST]];

  /* ============================== cálculo ============================== */
  function context(T, L, pf) {
    var ccy = (T && T.base) || (pf && pf !== 'todos' && pf.currency ? pf.currency : 'MXN'), rf = RF[ccy] || RF.MXN, /* la tasa de la moneda en la que ves las cifras */ crypto = L.rows.length > 0 && L.rows.every(function (r) { return r.cls === 'Cripto'; });
    var hasCrypto = L.rows.some(function (r) { return r.cls === 'Cripto'; });
    return { T: T, L: L, V: L.V, F: L.F, dates: T.dates, bench: R.calc.benchOf(T, L.benchmark), crypto: crypto, hasCrypto: hasCrypto, rf: rf[0] / 100, rfName: rf[1], ccy: RF[ccy] ? ccy : 'MXN' };
  }
  function yearsBetween(C, s, e) { return (isoMs(C.dates[e]) - isoMs(C.dates[s])) / 864e5 / 365; }
  function annual(r, years) { return years >= MIN_YEARS ? Math.pow(1 + r, 1 / years) - 1 : null; }
  function startOfYtd(C) { var y = C.dates[LAST].slice(0, 4), s = 0; for (var t = 0; t <= LAST; t++) if (C.dates[t].slice(0, 4) < y) s = t; return s; }

  /* rendimiento por periodo: cartera TWR vs benchmark (mismas fechas, en MXN) */
  function periodRows(C) {
    var defs = [['1M', 'Último mes', Math.max(0, LAST - 21)], ['3M', '3 meses', Math.max(0, LAST - 63)], ['6M', '6 meses', Math.max(0, LAST - 126)], ['YTD', 'En el año', startOfYtd(C)], ['1A', '1 año', 0], ['INI', 'Desde el inicio', 0]];
    return defs.map(function (d, k) {
      var s = d[2], yrs = yearsBetween(C, s, LAST), p = R.calc.twr(C.V, C.F, s, LAST), b = C.bench.a[LAST] / C.bench.a[s] - 1, net = 0, n = 0;
      for (var t = s + 1; t <= LAST; t++) if (Math.abs(C.F[t]) > 0.004) { net += C.F[t]; n++; }
      return { id: d[0], name: d[1], s: s, years: yrs, p: p, b: b, diff: (p - b) * 100, pa: annual(p, yrs), ba: annual(b, yrs), vS: C.V[s], vE: C.V[LAST], net: net, n: n, ini: k === 5 };
    });
  }

  function drawdown(g) { /* g: índice TWR base 100 */
    var n = g.length, dd = new Float64Array(n), pk = 0, pkAt = 0, min = 0, mp = 0, mt = 0;
    for (var k = 0; k < n; k++) { if (g[k] > pk) { pk = g[k]; pkAt = k; } dd[k] = pk ? g[k] / pk - 1 : 0; if (dd[k] < min) { min = dd[k]; mp = pkAt; mt = k; } }
    var rec = null; if (min < 0) for (var j = mt + 1; j < n; j++) if (g[j] >= g[mp]) { rec = j; break; }
    return { dd: dd, max: min, peak: mp, trough: mt, rec: rec };
  }

  /* todas las métricas de riesgo de UNA ventana [s, LAST]: una sola serie de rendimientos, una sola beta */
  function stats(C, s) {
    var V = C.V, F = C.F, b = C.bench.a, rp = [], rb = [], dt = [], idx = [], t, i;
    for (t = s + 1; t <= LAST; t++) {
      var den = V[t - 1] + F[t]; if (!(den > 0)) continue;
      rp.push(V[t] / den - 1); rb.push(b[t] / b[t - 1] - 1); idx.push(t);
      dt.push(C.crypto ? Math.max(1, (isoMs(C.dates[t]) - isoMs(C.dates[t - 1])) / 864e5) / 365 : 1 / 252);
    }
    var N = rp.length, Tt = 0, sp = 0, sb = 0; for (i = 0; i < N; i++) { Tt += dt[i]; sp += rp[i]; sb += rb[i]; }
    var st = { s: s, n: N, short: N < MIN_N, years: yearsBetween(C, s, LAST), ppy: C.crypto ? 365 : 252, rf: C.rf };
    st.mu = Tt ? sp / Tt : 0; st.muB = Tt ? sb / Tt : 0;
    var v = 0, dd2 = 0, mp = sp / (N || 1), mbb = sb / (N || 1), cov = 0, vb = 0, ta = 0, a = [], upP = 0, upB = 0, nu = 0, dnP = 0, dnB = 0, nd = 0, ex = 0, exb = 0;
    for (i = 0; i < N; i++) {
      v += Math.pow(rp[i] - st.mu * dt[i], 2) / dt[i]; var m = Math.min(0, rp[i] - C.rf * dt[i]); dd2 += m * m / dt[i];
      cov += (rp[i] - mp) * (rb[i] - mbb); vb += Math.pow(rb[i] - mbb, 2); a.push(rp[i] - rb[i]); ta += a[i];
      ex += rp[i] - C.rf * dt[i]; exb += rb[i] - C.rf * dt[i];
      if (rb[i] > 0) { upP += rp[i]; upB += rb[i]; nu++; } else if (rb[i] < 0) { dnP += rp[i]; dnB += rb[i]; nd++; }
    }
    st.vol = N > 1 ? Math.sqrt(v / (N - 1)) : null; st.sd = N > 1 ? st.vol : null;
    st.dd = N ? Math.sqrt(dd2 / N) : null;
    st.sharpe = !st.short && st.vol ? (st.mu - C.rf) / st.vol : null;
    st.sortino = !st.short && st.dd ? (st.mu - C.rf) / st.dd : null;
    st.cov = N > 1 ? cov / (N - 1) : null; st.varB = N > 1 ? vb / (N - 1) : null;
    st.beta = !st.short && st.varB ? st.cov / st.varB : null;
    st.alpha = !st.short && st.beta != null && Tt ? (ex - st.beta * exb) / Tt : null;
    var muA = Tt ? ta / Tt : 0, te = 0; for (i = 0; i < N; i++) te += Math.pow(a[i] - muA * dt[i], 2) / dt[i];
    st.muA = muA; st.te = N > 1 ? Math.sqrt(te / (N - 1)) : null; if (st.short) st.te = null;
    st.ir = st.te ? muA / st.te : null;
    st.up = nu >= 3 && upB ? upP / upB : null; st.down = nd >= 3 && dnB ? dnP / dnB : null; if (st.short) { st.up = null; st.down = null; }
    var sorted = rp.slice().sort(function (x, y) { return x - y; }), q = 0;
    if (N >= 5) { var pos = 0.05 * (N - 1), lo = Math.floor(pos); q = sorted[lo] + (sorted[Math.min(N - 1, lo + 1)] - sorted[lo]) * (pos - lo); }
    st.varPct = N >= 5 ? Math.max(0, -q) : null; st.varAmt = st.varPct != null ? st.varPct * V[LAST] : null; st.q = q;
    st.g = R.calc.twrSeries(V, F, s); st.twr = st.g[st.g.length - 1] / 100 - 1; st.bret = b[LAST] / b[s] - 1;
    st.dr = drawdown(st.g);
    st.ann = annual(st.twr, st.years);
    st.calmar = st.ann != null && st.dr.max < 0 ? st.ann / Math.abs(st.dr.max) : null;
    st.sumP = sp; st.sumB = sb; st.T = Tt;
    return st;
  }

  /* rendimiento por mes calendario (TWR) y por año */
  function monthly(C) {
    var d = C.dates, out = [], j;
    for (var t = 0; t <= LAST; t++) { var k = d[t].slice(0, 7); if (!out.length || out[out.length - 1].key !== k) out.push({ key: k, y: +k.slice(0, 4), m: +k.slice(5, 7) - 1, a: t, b: t }); else out[out.length - 1].b = t; }
    out.forEach(function (o, i) {
      o.s0 = i ? out[i - 1].b : 0; o.r = R.calc.twr(C.V, C.F, o.s0, o.b); o.rb = C.bench.a[o.b] / C.bench.a[o.s0] - 1;
      var dim = new Date(o.y, o.m + 1, 0).getDate(); o.partial = i === 0 || (dim - +d[o.b].slice(8)) > 3; o.first = i === 0;
      var net = 0; for (var q = o.s0 + 1; q <= o.b; q++) net += C.F[q]; o.net = net;
    });
    var years = [], by = {};
    out.forEach(function (o) { if (!by[o.y]) { by[o.y] = { y: o.y, a: o.a, b: o.b, s0: o.s0 }; years.push(by[o.y]); } else by[o.y].b = o.b; });
    years.forEach(function (y, i) { y.s0 = i ? years[i - 1].b : 0; y.r = R.calc.twr(C.V, C.F, y.s0, y.b); });
    return { months: out, years: years };
  }

  /* contribución de cada posición al TWR del periodo. Numerador diario por activo (en MXN): Δvalor − (compras − ventas) + dividendos;
     su suma sobre activos es V_t − V_{t−1} − F_t. Encadenado con g_{t−1}: la suma de contribuciones = TWR del portafolio (exacto). */
  function perAsset(C) {
    var acc = {}, fxs = C.T.fx.series, parts = C.L.parts || [C.L];
    parts.forEach(function (L) {
      (L.held || []).forEach(function (h) {
        var o = acc[h.ticker] || (acc[h.ticker] = { tk: h.ticker, name: h.ticker, val: new Float64Array(TOT), flow: new Float64Array(TOT), div: new Float64Array(TOT), cls: '' });
        for (var t = 0; t < TOT; t++) { var q = 0; h.lots.forEach(function (l) { if (l.idx <= t) q += l.q; }); if (q) o.val[t] += q * h.path[t] * (C.T.rate ? C.T.rate(h.ccy, t) : (h.ccy === 'USD' ? fxs[t] : 1)); }
      });
      L.events.forEach(function (e) {
        if (e.idx < 0 || !e.tk) return; var o = acc[e.tk]; if (!o) return; if (e.name) o.name = e.name;
        if (e.t === 'buy') o.flow[e.idx] += e.mxn; else if (e.t === 'sell') o.flow[e.idx] -= e.mxn; else if (e.t === 'div') o.div[e.idx] += e.mxn;
      });
      L.rows.forEach(function (r) { if (acc[r.ticker]) { acc[r.ticker].cls = r.cls; acc[r.ticker].name = r.name; } });
    });
    return acc;
  }
  function contributions(C, acc, s) {
    var V = C.V, F = C.F, g = R.calc.twrSeries(V, F, s), keys = Object.keys(acc), c = {}, w = {}, n = {}, rows = [], total = 0, t;
    keys.forEach(function (k) { c[k] = 0; w[k] = 0; n[k] = 0; });
    for (t = s + 1; t <= LAST; t++) {
      var den = V[t - 1] + F[t]; if (!(den > 0)) continue; var gw = g[t - 1 - s] / 100;
      keys.forEach(function (k) { var o = acc[k], num = o.val[t] - o.val[t - 1] - o.flow[t] + o.div[t]; c[k] += gw * num / den; w[k] += o.val[t - 1] / den; n[k]++; });
    }
    keys.forEach(function (k) {
      var o = acc[k], wb = n[k] ? w[k] / n[k] : 0, closed = o.val[LAST] < 0.005;
      if (Math.abs(c[k]) < 1e-9 && wb < 1e-6) return;
      total += c[k]; rows.push({ tk: k, name: o.name, cls: o.cls || (closed ? 'Cerrada' : ''), c: c[k] * 100, w: wb * 100, ret: wb > 1e-4 ? c[k] / wb * 100 : null, closed: closed });
    });
    return { rows: rows, total: total * 100, twr: (g[g.length - 1] / 100 - 1) * 100 };
  }

  /* ============================== DOM auxiliar ============================== */
  var uid = 0;
  function every(fn) { var done = false, r = 0, t = 0; (function run() { if (done) return; cancelAnimationFrame(r); clearTimeout(t); if (fn() === false) { done = true; return; } r = requestAnimationFrame(run); t = setTimeout(run, 50); })(); }
  function mark(t) { return window.CampoMarks ? window.CampoMarks.svg(t, 24) : '<span class="pfd-chip">' + esc(String(t).charAt(0)) + '</span>'; }
  function li(k, a, b, cls) { return '<li class="pfd-fl' + (cls ? ' ' + cls : '') + '" style="--i:' + k + '">' + (b == null ? '<span class="pfd-fx">' + a + '</span>' : '<span>' + a + '</span><span class="num">' + b + '</span>') + '</li>'; }
  function lines(arr) { return arr.map(function (r, k) { return li(k, r[0], r[1], r[2]); }).join(''); }
  function dxHTML(did, label, arr) {
    return '<button type="button" class="pfd-q" aria-expanded="false" aria-controls="' + did + '">¿Cómo se calcula?<svg class="pfd-qi" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></button>' +
      '<div class="pfd-dx" id="' + did + '" role="region" aria-label="' + esc(label) + '"><div class="pfd-dxi"><ul class="pfd-fls" data-lines>' + lines(arr) + '</ul></div></div>';
  }

  /* ============================== gráfico genérico (lienzo nítido) ============================== */
  function Chart(stage, spec, getDead) {
    var canvas = stage.querySelector('canvas'), ctx = canvas.getContext('2d'), W = 0, H = 0, dpr = 1, RT = 8, PT = 10, BT = 26, sized = false, colors = null, ff = '';
    var cur = null, from = null, to = null, t0 = 0, dur = 0, started = false, revT0 = 0, revDone = false, raw = null, hIdx = -1, kbIdx = -1, pend = false, rid = 0, tid = 0, tkFrom = [], tkTo = [], xTk = [], markA = 1;
    function samp(arr) { var n = arr.length, out = new Float64Array(S); for (var j = 0; j < S; j++) { var f = j / (S - 1) * (n - 1), a = Math.floor(f), b = Math.min(n - 1, a + 1), t = f - a; out[j] = arr[a] * (1 - t) + arr[b] * t; } return out; }
    function mk(s) {
      var tg = spec.build(s), lo = Infinity, hi = -Infinity, i;
      tg.lines.forEach(function (l) { for (i = 0; i < l.a.length; i++) { if (l.a[i] < lo) lo = l.a[i]; if (l.a[i] > hi) hi = l.a[i]; } });
      (tg.include || []).forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); });
      var pad = (hi - lo || Math.abs(hi) * 0.02 || 1) * 0.12; if (tg.fixHi != null) { hi = tg.fixHi; lo -= pad; } else { lo -= pad; hi += pad; }
      var st = niceStep(hi - lo, 4), ticks = []; for (var v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) ticks.push(+v.toFixed(8));
      var per = (LAST - s) > 126, xt = [];
      [0, 1 / 3, 2 / 3, 1].forEach(function (f, k) { var d = Math.round(s + (LAST - s) * f); xt.push({ f: f, text: new Date(spec.dates[d] + 'T12:00:00').toLocaleDateString('es-MX', per ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' }).replace(/\./g, ''), al: k === 0 ? 'left' : k === 3 ? 'right' : 'center' }); });
      raw = { s: s, lines: tg.lines, mark: tg.mark || null, tg: tg };
      return { l: tg.lines.map(function (l) { return samp(l.a); }), lo: lo, hi: hi, ticks: ticks.map(function (v) { return { v: v, text: tg.fmtY(v) }; }), xt: xt };
    }
    function retarget(s, anim) {
      var now = performance.now(); from = cur ? { l: cur.l.map(function (a) { return a.slice(); }), lo: cur.lo, hi: cur.hi } : null; tkFrom = tkTo;
      to = mk(s); tkTo = to.ticks; xTk = to.xt; t0 = now; dur = anim && started && !reduce() && from ? 360 : 0; markA = dur ? 0 : 1;
      if (!dur || !from) { tkFrom = []; cur = { l: to.l.map(function (a) { return a.slice(); }), lo: to.lo, hi: to.hi }; from = null; }
      paint(); schedule();
    }
    function paint() { var i = hIdx >= 0 ? hIdx : kbIdx >= 0 ? kbIdx : -1; if (raw) spec.read(i >= raw.s ? i : -1, raw); }
    function step(now) {
      if (!to) return false; var e = dur ? easeOut((now - t0) / dur) : 1;
      if (from) { for (var k = 0; k < cur.l.length; k++) for (var j = 0; j < S; j++) cur.l[k][j] = from.l[k][j] + (to.l[k][j] - from.l[k][j]) * e; cur.lo = from.lo + (to.lo - from.lo) * e; cur.hi = from.hi + (to.hi - from.hi) * e; }
      markA = dur ? clamp((e - 0.55) / 0.45, 0, 1) : 1; if (e >= 1) { tkFrom = []; from = null; dur = 0; markA = 1; return false || (started && !revDone); }
      var more = true; return more;
    }
    function size() {
      var r = stage.getBoundingClientRect(); if (r.width < 4 || r.height < 4) { sized = false; return; }
      dpr = Math.min(window.devicePixelRatio || 1, 2); W = r.width; H = r.height;
      var cw = Math.round(W * dpr), ch = Math.round(H * dpr); if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      RT = 8; sized = true;
    }
    function readColors() {
      var cs = getComputedStyle(stage), g = function (n) { return cs.getPropertyValue(n).trim(); };
      colors = { text: g('--text'), t2: g('--text-2'), t3: g('--text-3'), line: g('--line'), grid: g('--grid'), s1: g('--s1'), s2: g('--s2'), acc: g('--accent-ink'), loss: g('--loss'), gain: g('--gain') }; ff = cs.fontFamily;
    }
    function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
    function draw(now) {
      if (!sized || !colors || !to || !cur) return;
      var PL = 0, PR = W - RT, PB = H - BT, ph = PB - PT, pw = PR - PL, span = (cur.hi - cur.lo) || 1;
      function X(f) { return PL + f * pw; } function Y(v) { return PB - (v - cur.lo) / span * ph; }
      var te = from && dur ? easeOut((now - t0) / dur) : 1, rv = started ? (revDone ? 1 : easeOut((now - revT0) / 600)) : 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.font = '400 11px ' + ff;
      function grid(list, a) {
        if (a <= 0.01) return; ctx.globalAlpha = a; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        list.forEach(function (t) { var y = Y(t.v); if (y < PT - 1 || y > PB + 1) return; ctx.strokeStyle = colors.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PL, Math.round(y) + 0.5); ctx.lineTo(PR, Math.round(y) + 0.5); ctx.stroke(); ctx.fillStyle = colors.t3; ctx.fillText(t.text, PL + 2, y - 3); });
        ctx.globalAlpha = 1;
      }
      grid(tkFrom, 1 - te); grid(tkTo, tkFrom.length ? te : 1);
      ctx.strokeStyle = colors.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PL, Math.round(PB) + 0.5); ctx.lineTo(PR, Math.round(PB) + 0.5); ctx.stroke();
      xTk.forEach(function (t) { ctx.fillStyle = colors.t3; ctx.textBaseline = 'top'; ctx.textAlign = t.al; ctx.fillText(t.text, X(t.f), PB + 8); });
      var tg = raw.tg, rng = LAST - raw.s || 1;
      if (tg.zero != null) { var yz = Y(tg.zero); if (yz > PT && yz < PB + 1) { ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = colors.t3; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(PL, Math.round(yz) + 0.5); ctx.lineTo(PR, Math.round(yz) + 0.5); ctx.stroke(); ctx.restore(); } }
      /* episodio resaltado */
      var mkx = raw.mark; if (mkx && markA > 0.01 && rv >= 0.98) {
        var xa = X((mkx.peak - raw.s) / rng), xt = X((mkx.trough - raw.s) / rng), xr = mkx.rec != null ? X((mkx.rec - raw.s) / rng) : PR;
        ctx.save(); ctx.globalAlpha = 0.1 * markA; ctx.fillStyle = colors.loss; ctx.fillRect(xa, PT, Math.max(1, xr - xa), PB - PT);
        ctx.globalAlpha = 0.16 * markA; ctx.fillRect(xa, PT, Math.max(1, xt - xa), PB - PT); ctx.restore();
        ctx.save(); ctx.globalAlpha = markA; ctx.font = '500 11px ' + ff; ctx.textBaseline = 'top';
        ctx.fillStyle = colors.t2; ctx.textAlign = 'left'; ctx.fillText('Pico', Math.min(xa + 4, PR - 30), PT + 4);
        if (xr - xt > 58) { ctx.textAlign = 'right'; ctx.fillStyle = colors.t2; ctx.fillText(mkx.rec != null ? 'Recuperación' : 'Sin recuperar', xr - 4, PT + 4); }
        var ty = Y(mkx.val), lab = mkx.label, lw = ctx.measureText(lab).width + 12, lx = clamp(xt - lw / 2, PL, PR - lw), ly = clamp(ty + 8, PT + 18, PB - 22);
        ctx.fillStyle = colors.s2; ctx.strokeStyle = colors.line; rr(lx, ly, lw, 18, 5); ctx.fill(); ctx.stroke(); ctx.fillStyle = colors.loss; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lab, lx + lw / 2, ly + 9.5);
        ctx.restore();
      }
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, PL + (PR - PL) * rv + 2, H); ctx.clip();
      raw.lines.forEach(function (ln, k) {
        var arr = cur.l[k], col = colors[ln.col] || colors.acc, base = tg.zero != null ? Y(tg.zero) : PB;
        if (ln.fill) { ctx.globalAlpha = 0.18; ctx.fillStyle = colors[ln.fill]; ctx.beginPath(); ctx.moveTo(X(0), base); for (var j = 0; j < S; j++) ctx.lineTo(X(j / (S - 1)), Y(arr[j])); ctx.lineTo(X(1), base); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
        if (ln.halo) { ctx.strokeStyle = colors.s1; ctx.lineWidth = ln.w + 2; ctx.beginPath(); for (var j2 = 0; j2 < S; j2++) { var x2 = X(j2 / (S - 1)), y2 = Y(arr[j2]); if (j2) ctx.lineTo(x2, y2); else ctx.moveTo(x2, y2); } ctx.stroke(); }
        ctx.strokeStyle = col; ctx.lineWidth = ln.w; if (ln.dash) ctx.setLineDash(ln.dash); ctx.beginPath(); for (var j3 = 0; j3 < S; j3++) { var x3 = X(j3 / (S - 1)), y3 = Y(arr[j3]); if (j3) ctx.lineTo(x3, y3); else ctx.moveTo(x3, y3); } ctx.stroke(); ctx.setLineDash([]);
      });
      ctx.restore();
      var ci = hIdx >= 0 ? hIdx : kbIdx;
      if (ci >= raw.s && te >= 1 && rv >= 1) {
        var f = (ci - raw.s) / rng, xc = Math.round(X(f)) + 0.5, k0 = ci - raw.s;
        ctx.strokeStyle = colors.t2; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xc, PT); ctx.lineTo(xc, PB); ctx.stroke(); ctx.setLineDash([]);
        raw.lines.forEach(function (ln) { ctx.fillStyle = colors[ln.col] || colors.acc; ctx.strokeStyle = colors.s1; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(xc, Y(ln.a[k0]), 3.6, 0, 6.2832); ctx.stroke(); ctx.fill(); });
        var lb = dTxtS(spec.dates[ci]), lw2 = ctx.measureText(lb).width + 12, lx2 = clamp(xc - lw2 / 2, PL, PR - lw2);
        ctx.fillStyle = colors.s2; ctx.strokeStyle = colors.line; ctx.lineWidth = 1; rr(lx2, PB + 3, lw2, 18, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = colors.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lb, lx2 + lw2 / 2, PB + 12.5);
      }
    }
    function dTxtS(iso) { return dTxt(iso, true); }
    function frame() {
      cancelAnimationFrame(rid); clearTimeout(tid); pend = false; if (getDead()) return; var now = performance.now();
      if (!sized) size(); if (sized && !colors) readColors();
      var more = step(now); if (started && !revDone) { if (reduce() || now - revT0 >= 640) revDone = true; else more = true; }
      draw(now); if (more) schedule();
    }
    function schedule() { if (pend || getDead()) return; pend = true; rid = requestAnimationFrame(frame); tid = setTimeout(frame, 50); }
    function pointerAt(e) {
      var r = stage.getBoundingClientRect(), pw = W - RT, x = e.clientX - r.left; if (!raw || x < 0 || x > pw) { clearHover(); return; }
      hIdx = Math.round(raw.s + clamp(x / pw, 0, 1) * (LAST - raw.s)); kbIdx = -1; paint(); schedule();
    }
    function clearHover() { var was = hIdx >= 0 || kbIdx >= 0; hIdx = -1; kbIdx = -1; if (was) paint(); schedule(); }
    stage.addEventListener('pointermove', pointerAt); stage.addEventListener('pointerdown', pointerAt); stage.addEventListener('pointerleave', clearHover); stage.addEventListener('pointercancel', clearHover);
    stage.addEventListener('pointerup', function (e) { if (e.pointerType === 'touch') clearHover(); }); stage.addEventListener('blur', clearHover);
    stage.addEventListener('keydown', function (e) {
      if (!raw) return; var c = kbIdx >= 0 ? kbIdx : LAST, st = e.shiftKey ? 5 : 1, n = c;
      if (e.key === 'ArrowLeft') n = c - st; else if (e.key === 'ArrowRight') n = c + st; else if (e.key === 'Home') n = raw.s; else if (e.key === 'End') n = LAST; else if (e.key === 'Escape') { clearHover(); return; } else return;
      e.preventDefault(); kbIdx = clamp(n, raw.s, LAST); hIdx = -1; paint(); schedule();
    });
    return {
      set: retarget, size: function () { size(); schedule(); }, schedule: schedule, theme: function () { colors = null; schedule(); },
      start: function () { if (started) return; started = true; revT0 = performance.now(); if (reduce()) revDone = true; schedule(); }, started: function () { return started; }, stop: function () { cancelAnimationFrame(rid); clearTimeout(tid); }
    };
  }

  /* ============================== render ============================== */
  function render(mount, portfolio, T) {
    var off = [], dead = false, getDead = function () { return dead; };
    var pf = portfolio === 'todos' || (portfolio && portfolio.cons) ? 'todos' : (typeof portfolio === 'string' ? T.get(portfolio) : portfolio);
    var L = pf === 'todos' ? R.calc.aggregate(T) : (pf ? R.calc.buildLedger(T, pf) : null);
    function destroy() { if (dead) return; dead = true; off.forEach(function (f) { try { f(); } catch (e) { } }); off = []; if (mount) mount.innerHTML = ''; }
    var api = { destroy: destroy, ledger: L };
    if (!L || (!L.rows.length && Math.abs(L.cashEnd) < 0.005)) {
      mount.innerHTML = '<div class="pfd"><div class="pfd-empty"><strong>Este portafolio aún no tiene historial</strong><p>Cuando agregues posiciones o importes un CSV, aquí verás rendimiento por periodo, riesgo, caídas, meses y la contribución de cada activo.</p></div></div>';
      return api;
    }
    var id = 'pfd' + (++uid), C = context(T, L, pf), dates = C.dates, bench = C.bench, V = C.V, F = C.F;
    var Pi = 3, st = stats(C, Math.max(0, LAST - PERIODS[Pi][1])), per = periodRows(C), mo = monthly(C), acc = perAsset(C), started = false;
    function sIdx() { return Math.max(0, LAST - PERIODS[Pi][1]); }
    var rfTxt = fN(C.rf * 100, 2) + ' % anual · ' + C.rfName + ' (supuesto)';
    var scaleTxt = C.crypto ? 'Δt = días calendario ÷ 365 (portafolio solo cripto, mercado 24/7)' : 'Δt = 1 ÷ 252 por cierre (serie de días hábiles' + (C.hasCrypto ? '; cartera mixta, la cripto entra con su cierre de día hábil' : '') + ')';
    var volSub = C.crypto ? 'Anualizada · 365 días (solo cripto)' : C.hasCrypto ? 'Anualizada · días hábiles, √252 (cartera mixta)' : 'Anualizada · √252';

    /* ---------- bloque 1: rendimiento por periodo ---------- */
    var rollReg = [];
    function perLines() {
      var a = [['TWR = ∏ [ V<sub>t</sub> ÷ (V<sub>t−1</sub> + F<sub>t</sub>) ] − 1 · Benchmark = P<sub>fin</sub> ÷ P<sub>ini</sub> − 1 (en ' + BS() + ')'], ['Anualizado = (1 + r)<sup>1 ÷ años</sup> − 1, solo si el periodo dura 1 año o más']];
      per.forEach(function (r) {
        a.push([r.name + ' · ' + dTxt(dates[r.s], true) + ' → ' + dTxt(dates[LAST], true), fN(r.years, 2) + ' años']);
        a.push(['Patrimonio ' + fM(r.vS) + ' → ' + fM(r.vE) + ' · flujos netos ' + fS(r.net) + ' (' + r.n + ')', fP(r.p * 100)]);
      });
      a.push(['El 1A y “Desde el inicio” coinciden: la historia disponible empieza el ' + dTxt(dates[0]) + '.']);
      return a;
    }
    function cellN(v, kind, extra) { return '<span class="num pfd-cv ' + (kind === 'diff' ? sgnCls(v) : '') + '" data-roll="' + rollReg.length + '">' + '</span>'; }
    var rows1 = per.map(function (r, k) {
      var rid_ = rollReg.length; rollReg.push({ v: r.p * 100, f: function (v) { return fP(v); } }, { v: r.b * 100, f: function (v) { return fP(v); } }, { v: r.diff, f: function (v) { return sgn(v, 1, ' pts'); } });
      return '<tr class="pfd-tr" style="--i:' + k + '"><th scope="row"><span class="pfd-pn">' + esc(r.name) + '</span><span class="pfd-ps">' + (r.ini ? 'desde ' + dTxt(dates[0], true) + ' ' + dates[0].slice(0, 4) : dTxt(dates[r.s], true)) + '</span></th>' +
        '<td><span class="num pfd-cv ' + sgnCls(r.p) + '" data-r="' + rid_ + '">' + fP(r.p * 100) + '</span>' + (r.pa != null ? '<span class="pfd-an num">' + fP(r.pa * 100) + ' anualizado</span>' : '') + '</td>' +
        '<td><span class="num pfd-cv ' + sgnCls(r.b) + '" data-r="' + (rid_ + 1) + '">' + fP(r.b * 100) + '</span>' + (r.ba != null ? '<span class="pfd-an num">' + fP(r.ba * 100) + ' anualizado</span>' : '') + '</td>' +
        '<td><span class="num pfd-cv ' + sgnCls(r.diff) + '" data-r="' + (rid_ + 2) + '">' + sgn(r.diff, 1, ' pts') + '</span></td></tr>';
    }).join('');
    var perHTML = '<section class="pfd-s panel" aria-labelledby="' + id + 'h1"><div class="panel-head"><h2 id="' + id + 'h1">Rendimiento por periodo</h2><span class="muted">TWR · cartera frente a ' + esc(bench.name) + ' en ' + BS() + '</span></div>' +
      '<div class="pfd-tw"><table class="pfd-tb"><thead><tr><th scope="col">Periodo</th><th scope="col">Cartera</th><th scope="col">' + esc(bench.name) + '</th><th scope="col">Diferencia</th></tr></thead><tbody>' + rows1 + '</tbody></table></div>' + dxHTML(id + '-d1', 'Cálculo del rendimiento por periodo', perLines()) + '</section>';

    /* ---------- bloque 2: métricas de riesgo ---------- */
    function shortSub(extra) { return st.short ? 'Muestra corta (' + st.n + ' días): se muestra desde ' + MIN_N : extra; }
    function dr() { return st.dr; }
    function metricDefs() {
      var s = st, rp = dTxt(dates[s.s]) + ' → ' + dTxt(dates[LAST]), d = dr(), nn = [['Periodo', rp], ['Observaciones (n)', String(s.n)]], b = bench.name;
      var base = ['Σ F<sub>i</sub>: los rendimientos r<sub>i</sub> = V<sub>t</sub> ÷ (V<sub>t−1</sub> + F<sub>t</sub>) − 1 neutralizan aportaciones y retiros'];
      var out = [
        { id: 'vol', name: 'Volatilidad', to: s.vol == null ? null : s.vol * 100, fmt: function (v) { return fN(v, 1) + ' %'; }, sub: volSub,
          lines: [['σ = √[ Σ (r<sub>i</sub> − μ·Δt<sub>i</sub>)² ÷ Δt<sub>i</sub> ÷ (n − 1) ]'], nn[0], nn[1], ['Escala de tiempo', scaleTxt], ['Rendimiento medio anualizado (μ)', fP(s.mu * 100)], ['Volatilidad anualizada', s.vol == null ? '—' : fPu(s.vol * 100, 2), 'res'], base] },
        { id: 'sha', name: 'Sharpe', to: s.sharpe, fmt: function (v) { return fN(v, 2); }, sub: shortSub('Libre de riesgo ' + fN(C.rf * 100, 2) + ' % · ' + C.rfName + ' (supuesto)'),
          lines: [['(μ − tasa libre de riesgo) ÷ σ'], nn[0], ['Rendimiento medio anualizado (μ)', fP(s.mu * 100)], ['Tasa libre de riesgo (' + C.ccy + ')', rfTxt], ['Exceso de rendimiento', fP((s.mu - C.rf) * 100)], ['Volatilidad (σ)', s.vol == null ? '—' : fPu(s.vol * 100, 2)], ['Sharpe', s.sharpe == null ? '—' : fN(s.sharpe, 2), 'res'], [s.short ? 'Con menos de ' + MIN_N + ' observaciones el cociente es demasiado ruidoso para mostrarlo.' : 'La tasa depende de la divisa base del portafolio (' + C.ccy + ').']] },
        { id: 'sor', name: 'Sortino', to: s.sortino, fmt: function (v) { return fN(v, 2); }, sub: shortSub('Penaliza solo la volatilidad a la baja'),
          lines: [['(μ − tasa libre de riesgo) ÷ desviación a la baja'], nn[0], ['Exceso de rendimiento', fP((s.mu - C.rf) * 100)], ['Desviación a la baja = √[ Σ mín(0, r<sub>i</sub> − rf·Δt<sub>i</sub>)² ÷ Δt<sub>i</sub> ÷ n ]', s.dd == null ? '—' : fPu(s.dd * 100, 2)], ['Sortino', s.sortino == null ? '—' : fN(s.sortino, 2), 'res']] },
        { id: 'mdd', name: 'Máxima caída', to: d.max * 100, fmt: function (v) { return fPu(v, 1); }, sign: true, sub: d.max < 0 ? 'Pico ' + dTxt(dates[s.s + d.peak], true) + ' → valle ' + dTxt(dates[s.s + d.trough], true) + (d.rec != null ? ' · recuperada ' + dTxt(dates[s.s + d.rec], true) : ' · sin recuperar') : 'Sin caídas en el periodo',
          lines: d.max < 0 ? [['Mín<sub>t</sub> [ g<sub>t</sub> ÷ máx<sub>u≤t</sub> g<sub>u</sub> − 1 ] sobre el índice TWR'], ['Pico (índice ' + fN(s.g[d.peak], 1) + ')', dTxt(dates[s.s + d.peak])], ['Valle (índice ' + fN(s.g[d.trough], 1) + ')', dTxt(dates[s.s + d.trough])], ['Recuperación', d.rec != null ? dTxt(dates[s.s + d.rec]) : 'Sin recuperar'], ['Duración pico → valle', (d.trough - d.peak) + ' sesiones'], ['Máxima caída', fPu(d.max * 100, 2), 'res'], ['Se mide sobre el índice TWR, no sobre el patrimonio: una aportación no “tapa” una caída.']] : [['No hubo caídas desde máximos en el periodo.']] },
        { id: 'bet', name: 'Beta', to: s.beta, fmt: function (v) { return fN(v, 2); }, sub: shortSub('vs ' + b + ' · la misma en toda la pestaña'),
          lines: [['β = Cov(r<sub>cartera</sub>, r<sub>' + esc(b) + '</sub>) ÷ Var(r<sub>' + esc(b) + '</sub>)'], nn[0], nn[1], ['Benchmark', esc(b) + ' en ' + BS()], ['Covarianza diaria', s.cov == null ? '—' : fN(s.cov * 1e4, 3) + ' × 10⁻⁴'], ['Varianza del benchmark', s.varB == null ? '—' : fN(s.varB * 1e4, 3) + ' × 10⁻⁴'], ['Beta', s.beta == null ? '—' : fN(s.beta, 3), 'res'], ['Se calcula una sola vez, con estos mismos rendimientos y esta ventana; Alfa, captura y tracking error usan la misma serie.']] },
        { id: 'alp', name: 'Alfa de Jensen', to: s.alpha == null ? null : s.alpha * 100, fmt: function (v) { return fP(v, 1); }, sign: true, sub: shortSub('vs ' + b + ' · anualizada'),
          lines: [['α = [ Σ (r<sub>i</sub> − rf·Δt<sub>i</sub>) − β · Σ (r<sub>b,i</sub> − rf·Δt<sub>i</sub>) ] ÷ Σ Δt<sub>i</sub>'], ['Σ exceso de la cartera', fP((s.sumP - C.rf * s.T) * 100)], ['Σ exceso del benchmark', fP((s.sumB - C.rf * s.T) * 100)], ['β (la misma de Beta)', s.beta == null ? '—' : fN(s.beta, 3)], ['Tasa libre de riesgo', rfTxt], ['Alfa anualizada', s.alpha == null ? '—' : fP(s.alpha * 100, 2), 'res']] },
        { id: 'te', name: 'Tracking error', to: s.te == null ? null : s.te * 100, fmt: function (v) { return fN(v, 1) + ' %'; }, sub: shortSub('Desviación del rendimiento activo vs ' + b),
          lines: [['TE = desviación anualizada de (r<sub>cartera</sub> − r<sub>' + esc(b) + '</sub>)'], nn[0], ['Rendimiento activo medio anualizado', fP(s.muA * 100)], ['Tracking error', s.te == null ? '—' : fPu(s.te * 100, 2), 'res']] },
        { id: 'ir', name: 'Information ratio', to: s.ir, fmt: function (v) { return fN(v, 2); }, sub: shortSub('Rendimiento activo ÷ tracking error'),
          lines: [['IR = rendimiento activo anualizado ÷ TE'], ['Rendimiento activo', fP(s.muA * 100)], ['Tracking error', s.te == null ? '—' : fPu(s.te * 100, 2)], ['Information ratio', s.ir == null ? '—' : fN(s.ir, 2), 'res']] },
        { id: 'cal', name: 'Calmar', to: s.calmar, fmt: function (v) { return fN(v, 2); }, sub: s.ann == null ? 'Necesita 1 año de historia' : (d.max < 0 ? 'Rendimiento anualizado ÷ máxima caída' : 'Sin caídas: no aplica'),
          lines: [['Calmar = TWR anualizado ÷ |máxima caída|'], ['Años del periodo', fN(s.years, 2)], ['TWR anualizado', s.ann == null ? '— (menos de ' + fN(MIN_YEARS, 2) + ' años)' : fP(s.ann * 100)], ['Máxima caída', fPu(d.max * 100, 2)], ['Calmar', s.calmar == null ? '—' : fN(s.calmar, 2), 'res']] },
        { id: 'cap', name: 'Captura ↑ / ↓', to: null, text: s.up == null || s.down == null ? '—' : fN(s.up * 100, 0) + ' / ' + fN(s.down * 100, 0), sub: shortSub('Mercado al alza / a la baja, % del benchmark'),
          lines: [['Captura = media de la cartera ÷ media del benchmark, en días de alza (↑) o baja (↓) del benchmark'], ['Captura al alza', s.up == null ? '—' : fN(s.up * 100, 1) + ' %'], ['Captura a la baja', s.down == null ? '—' : fN(s.down * 100, 1) + ' %'], ['Mejor: alta captura al alza y baja captura a la baja.']] },
        { id: 'var', name: 'VaR 95 % (1 día)', to: s.varPct == null ? null : s.varPct * 100, fmt: function (v) { return fN(v, 2) + ' %'; }, sub: s.varAmt == null ? 'Muestra insuficiente' : 'Pérdida diaria no superada el 95 % de las veces · ' + fM(s.varAmt),
          lines: [['VaR histórico = −percentil 5 de los rendimientos diarios r<sub>i</sub>'], nn[0], ['Percentil 5 de r<sub>i</sub>', s.varPct == null ? '—' : fP(s.q * 100, 2)], ['Patrimonio al ' + dTxt(dates[LAST], true), fM(V[LAST])], ['VaR 1 día', s.varAmt == null ? '—' : fM(s.varAmt), 'res'], ['Es un estimador histórico: no dice cuánto se puede perder en el peor día.']] }
      ];
      return out;
    }
    var M = metricDefs();
    function mHTML(k, n) {
      var did = id + '-m' + n, txt = k.text != null ? k.text : (k.to == null ? '—' : k.fmt(k.to));
      return '<article class="pfd-k" data-k="' + k.id + '"><h3 class="pfd-kn">' + esc(k.name) + '</h3><p class="pfd-kv num ' + (k.sign && k.to != null ? sgnCls(k.to) : (txt === '—' ? 'flat' : '')) + '" data-kv>' + esc(txt) + '</p><p class="pfd-ks" data-ks>' + k.sub + '</p>' + dxHTML(did, 'Cálculo de ' + k.name, k.lines) + '</article>';
    }
    var riskHTML = '<section class="pfd-s panel" aria-labelledby="' + id + 'h2"><div class="panel-head"><h2 id="' + id + 'h2">Riesgo</h2><span class="muted" data-riskp>Periodo ' + PERIODS[Pi][0] + ' · frente a ' + esc(bench.name) + '</span></div><div class="pfd-led" data-led>' + M.map(mHTML).join('') + '</div></section>';

    /* ---------- selector compartido ---------- */
    var barHTML = '<div class="pfd-bar" role="group" aria-label="Periodo del análisis"><span class="pfd-barl">Periodo del análisis</span><div class="seg pfd-sp" role="group" aria-label="Periodo" style="--n:5;--i:' + Pi + '"><span class="seg-pill" aria-hidden="true"></span>' + PERIODS.map(function (p, i) { return '<button type="button" data-p="' + i + '" aria-pressed="' + (i === Pi) + '">' + p[0] + '</button>'; }).join('') + '</div><span class="pfd-barn" data-barn></span></div>';

    /* ---------- bloque 3: caídas ---------- */
    function ddLines() {
      var d = st.dr, a = [['Caída<sub>t</sub> = g<sub>t</sub> ÷ máx<sub>u≤t</sub> g<sub>u</sub> − 1, con g = índice TWR base 100'], ['Periodo', dTxt(dates[st.s]) + ' → ' + dTxt(dates[LAST])]];
      if (d.max < 0) { a.push(['Máxima caída', fPu(d.max * 100, 2), 'res'], ['Pico', dTxt(dates[st.s + d.peak])], ['Valle', dTxt(dates[st.s + d.trough])], ['Recuperación', d.rec != null ? dTxt(dates[st.s + d.rec]) : 'Sin recuperar']); } else a.push(['Sin caídas desde máximos', '0,0 %', 'res']);
      a.push(['Caída actual', fPu(st.dr.dd[st.dr.dd.length - 1] * 100, 2)]); return a;
    }
    var ddHTML = '<section class="pfd-s panel pfd-ch" aria-labelledby="' + id + 'h3"><div class="pfd-ctop"><h2 id="' + id + 'h3">Caídas desde máximos</h2><span class="muted">Qué tan abajo estuvo la cartera de su máximo previo</span></div>' +
      '<dl class="pfd-ro" data-ro="dd"><div><dt>Fecha</dt><dd data-r="a"></dd></div><div><dt>Caída</dt><dd data-r="b"></dd></div><div><dt>Índice TWR</dt><dd data-r="c"></dd></div><div><dt>Máximo previo</dt><dd data-r="d"></dd></div></dl>' +
      '<div class="pfd-stage" tabindex="0" role="group" aria-labelledby="' + id + 'h3" aria-describedby="' + id + 'k3" data-st="dd"><canvas aria-hidden="true"></canvas></div><p class="pfd-sr" id="' + id + 'k3" aria-live="polite" data-sr="dd">Con las flechas izquierda y derecha lees cada día.</p>' +
      dxHTML(id + '-d3', 'Cálculo de la gráfica de caídas', ddLines()) + '</section>';

    /* ---------- bloque 4: mapa de calor mensual ---------- */
    var cap = 2; mo.months.forEach(function (o) { cap = Math.max(cap, Math.abs(o.r) * 100); }); cap = Math.ceil(cap);
    function mixOf(r) { return (6 + 44 * Math.min(1, Math.abs(r) * 100 / cap)).toFixed(1) + '%'; }
    var byYM = {}; mo.months.forEach(function (o) { byYM[o.y + '-' + o.m] = o; });
    var hmHTML = '<section class="pfd-s panel pfd-hmp" aria-labelledby="' + id + 'h4"><div class="panel-head"><h2 id="' + id + 'h4">Rendimientos mensuales</h2><span class="muted">TWR por mes, en %</span></div>' +
      '<div class="pfd-hmw"><div class="pfd-hm" role="table" aria-label="Rendimiento mensual por año" data-hm style="--ny:' + mo.years.length + '"></div><div class="pfd-tip" role="status" data-tip hidden></div></div>' +
      '<div class="pfd-hl" aria-hidden="true"><span>−' + cap + ' %</span><i class="pfd-hlb"></i><span>+' + cap + ' %</span><span class="pfd-hlm"><i class="pfd-gl best"></i> mejor mes <i class="pfd-gl worst"></i> peor mes <i class="pfd-gl part"></i> mes parcial</span></div>' +
      '<p class="pfd-hs" data-hms></p>' + dxHTML(id + '-d4', 'Cálculo de los rendimientos mensuales', [['TWR del mes = ∏ [ V<sub>t</sub> ÷ (V<sub>t−1</sub> + F<sub>t</sub>) ] − 1 entre el último cierre del mes anterior y el último del mes'], ['Año = TWR encadenado entre el último cierre del año anterior y el último del año'], ['Escala de color', 'simétrica en ±' + cap + ' % (el máximo mensual de la serie), la misma para todos los periodos'], ['Mes parcial', 'el primer mes empieza el ' + dTxt(dates[0], true) + ' y el último llega al ' + dTxt(dates[LAST], true)], ['Meses atenuados', 'terminan antes del periodo elegido arriba'], ['Mejor y peor mes se marcan solo entre los meses del periodo.']]) + '</section>';

    /* ---------- bloque 5: contribución ---------- */
    var sortKey = 'c', sortDir = -1, CB = null;
    var contHTML = '<section class="pfd-s panel pfd-cp" aria-labelledby="' + id + 'h5"><div class="panel-head"><h2 id="' + id + 'h5">Contribución por posición</h2><span class="muted" data-cs></span></div>' +
      '<div class="pfd-ch5" role="group" aria-label="Ordenar"><button type="button" class="pfd-sh" data-s="tk"><span>Activo</span><svg class="pfd-si" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M7 14l5 5 5-5"/></svg></button><span class="pfd-axl" aria-hidden="true">Resta · suma</span><button type="button" class="pfd-sh" data-s="w"><span>Peso medio</span><svg class="pfd-si" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M7 14l5 5 5-5"/></svg></button><button type="button" class="pfd-sh" data-s="c"><span>Contribución</span><svg class="pfd-si" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M7 14l5 5 5-5"/></svg></button></div>' +
      '<ul class="pfd-cl" role="list" data-cl></ul><p class="pfd-sum" data-sum></p><div class="pfd-tip" role="status" data-tip2 hidden></div>' +
      dxHTML(id + '-d5', 'Cálculo de la contribución', [['c<sub>i</sub> = Σ<sub>t</sub> g<sub>t−1</sub> ÷ g<sub>ini</sub> × n<sub>i,t</sub> ÷ (V<sub>t−1</sub> + F<sub>t</sub>)'], ['n<sub>i,t</sub> (por activo y día)', 'Δ valor − (compras − ventas) + dividendos, en ' + BS() + ' al tipo de cambio del día'], ['Suma de n<sub>i,t</sub> sobre activos', 'V<sub>t</sub> − V<sub>t−1</sub> − F<sub>t</sub> (el efectivo no contribuye)'], ['Método', 'aritmético encadenado con el índice TWR: la suma de contribuciones es el TWR del periodo, sin residuo'], ['Peso medio', 'promedio diario de V<sub>i,t−1</sub> ÷ (V<sub>t−1</sub> + F<sub>t</sub>)'], ['Rentabilidad de la posición ≈ contribución ÷ peso medio'], ['Incluye posiciones vendidas dentro del periodo y dividendos cobrados.']]) + '</section>';

    /* ---------- bloque extra: capital vs mercado ---------- */
    var cvHTML = '<section class="pfd-s panel pfd-ch" aria-labelledby="' + id + 'h6"><div class="pfd-ctop"><div class="pfd-ct"><h2 id="' + id + 'h6">Capital aportado vs valor de mercado</h2><ul class="pfd-key" aria-hidden="true"><li><i class="pfd-ln1"></i>Valor de mercado</li><li><i class="pfd-ln2"></i>Capital neto aportado</li></ul></div></div>' +
      '<dl class="pfd-ro" data-ro="cv"><div><dt>Fecha</dt><dd data-r="a"></dd></div><div><dt>Valor</dt><dd data-r="b"></dd></div><div><dt>Capital neto</dt><dd data-r="c"></dd></div><div><dt>Ganancia de mercado</dt><dd data-r="d"></dd></div></dl>' +
      '<div class="pfd-stage" tabindex="0" role="group" aria-labelledby="' + id + 'h6" aria-describedby="' + id + 'k6" data-st="cv"><canvas aria-hidden="true"></canvas></div><p class="pfd-sr" id="' + id + 'k6" aria-live="polite" data-sr="cv">Con las flechas izquierda y derecha lees cada día.</p>' +
      dxHTML(id + '-d6', 'Cálculo de capital contra mercado', [['Ganancia de mercado = valor − capital neto aportado'], ['Capital neto aportado', 'Σ aportaciones − Σ retiros hasta cada fecha, cada flujo en ' + BS() + ' al tipo de cambio de su fecha'], ['Valor', 'patrimonio con efectivo, igual que en Resumen'], ['La brecha entre las dos líneas es lo que ganó (o perdió) el mercado, no lo que pusiste.']]) + '</section>';

    mount.innerHTML = '<div class="pfd" id="' + id + '"><p class="pfd-tag">Base ' + BS() + ' · tasa libre de riesgo ' + esc(rfTxt) + ' · benchmark ' + esc(bench.name) + ' en ' + BS() + '</p>' + perHTML + barHTML + riskHTML +
      '<div class="pfd-cols">' + ddHTML + hmHTML + '</div><div class="pfd-cols pfd-cols-b">' + contHTML + cvHTML + '</div></div>';
    var $ = function (s, r) { return (r || mount).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || mount).querySelectorAll(s)); };
    var rootEl = $('.pfd');

    /* ---------- divulgación ---------- */
    var supportsIS = !!(window.CSS && CSS.supports && CSS.supports('interpolate-size', 'allow-keywords'));
    mount.addEventListener('click', function (e) {
      var b = e.target.closest('.pfd-q'); if (!b) return;
      var dx = doc.getElementById(b.getAttribute('aria-controls')), open = b.getAttribute('aria-expanded') !== 'true'; if (!dx) return;
      b.setAttribute('aria-expanded', String(open));
      if (!supportsIS && !reduce() && dx.animate) {
        if (open) { dx.setAttribute('data-open', ''); var h = dx.scrollHeight; dx.animate([{ height: '0px' }, { height: h + 'px' }], { duration: 300, easing: EXPO }); }
        else { var h0 = dx.offsetHeight; dx.removeAttribute('data-open'); dx.animate([{ height: h0 + 'px' }, { height: '0px' }], { duration: 240, easing: EXPO }); }
      } else if (open) dx.setAttribute('data-open', ''); else dx.removeAttribute('data-open');
    });

    /* ---------- rodar cifras ---------- */
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
    function paintSign(el, v) { el.classList.remove('gain', 'loss', 'flat'); el.classList.add(v == null ? 'flat' : sgnCls(v)); }

    /* ---------- métricas: actualizar al cambiar de periodo ---------- */
    function ledOf(k) { return $('[data-k="' + k + '"]'); }
    function applyMetrics(animate) {
      var old = {}; M.forEach(function (k) { old[k.id] = k; });
      M = metricDefs();
      M.forEach(function (k, n) {
        var cell = ledOf(k.id), kv = $('[data-kv]', cell), prev = old[k.id];
        $('[data-ks]', cell).innerHTML = k.sub; $('[data-lines]', cell).innerHTML = lines(k.lines);
        if (k.text != null) { kv.textContent = k.text; paintSign(kv, null); if (k.text === '—') kv.classList.add('flat'); else kv.classList.remove('flat'); return; }
        if (k.to == null) { kv.textContent = '—'; kv.classList.remove('gain', 'loss'); kv.classList.add('flat'); return; }
        kv.classList.remove('flat'); if (k.sign) paintSign(kv, k.to); else kv.classList.remove('gain', 'loss');
        var from = prev && prev.to != null ? prev.to : k.to; roll(kv, from, k.to, k.fmt, animate ? 360 : 0, 0);
      });
      var rp = $('[data-riskp]'); rp.textContent = 'Periodo ' + PERIODS[Pi][0] + ' · frente a ' + bench.name;
      $('[data-barn]').textContent = dTxt(dates[st.s], true) + ' ' + dates[st.s].slice(0, 4) + ' → ' + dTxt(dates[LAST], true) + ' ' + dates[LAST].slice(0, 4) + ' · ' + st.n + ' sesiones' + (PERIODS[Pi][0] === 'Todo' ? ' (toda la historia disponible)' : '');
    }

    /* ---------- gráficas ---------- */
    var roDD = $('[data-ro="dd"]'), roCV = $('[data-ro="cv"]');
    function setRO(el, srEl, a, b, c, d, cls, sr) {
      var arr = [a, b, c, d], k = ['a', 'b', 'c', 'd']; k.forEach(function (n, i) { var e = el.querySelector('[data-r="' + n + '"]'); e.textContent = arr[i]; e.className = (i === 1 && cls) ? cls : ''; });
      if (srEl) srEl.textContent = sr || '';
    }
    var ddChart = Chart($('[data-st="dd"]'), {
      dates: dates,
      build: function (s) {
        var dd = st.dr, a = new Float64Array(dd.dd.length), i; for (i = 0; i < a.length; i++) a[i] = dd.dd[i] * 100;
        var mk = dd.max < 0 ? { peak: s + dd.peak, trough: s + dd.trough, rec: dd.rec != null ? s + dd.rec : null, val: dd.max * 100, label: fPu(dd.max * 100, 1) } : null;
        return { lines: [{ a: a, col: 'loss', w: 2, fill: 'loss', halo: true }], fixHi: 0, include: [0, Math.min(-1, dd.max * 100)], zero: 0, mark: mk, fmtY: function (v) { return fPu(v, v !== 0 && Math.abs(v) < 2 ? 1 : 0); } };
      },
      read: function (i, raw) {
        var sr = $('[data-sr="dd"]');
        if (i < 0) { var d0 = st.dr, e = LAST; if (d0.max < 0) setRO(roDD, sr, dTxt(dates[e]), fPu(d0.dd[d0.dd.length - 1] * 100, 1), fN(st.g[st.g.length - 1], 1), fN(st.g[st.g.length - 1] / (1 + d0.dd[d0.dd.length - 1]), 1), 'loss', ''); else setRO(roDD, sr, dTxt(dates[e]), '0,0 %', fN(st.g[st.g.length - 1], 1), fN(st.g[st.g.length - 1], 1), '', ''); return; }
        var k = i - raw.s, dv = st.dr.dd[k] * 100, g = st.g[k], pk = g / (1 + st.dr.dd[k]);
        setRO(roDD, sr, dTxt(dates[i]), fPu(dv, 1), fN(g, 1), fN(pk, 1), dv < -0.05 ? 'loss' : 'flat', dTxt(dates[i]) + ': caída ' + fPu(dv, 1) + ', índice ' + fN(g, 1) + ', máximo previo ' + fN(pk, 1));
      }
    }, getDead);
    var cvChart = Chart($('[data-st="cv"]'), {
      dates: dates,
      build: function (s) {
        var n = LAST - s + 1, v = new Float64Array(n), c = new Float64Array(n); for (var i = 0; i < n; i++) { v[i] = V[s + i]; c[i] = L.Dc[s + i] - L.Wc[s + i]; }
        return { lines: [{ a: c, col: 't2', w: 1.6, dash: [5, 4] }, { a: v, col: 'acc', w: 2.2, halo: true }], fmtY: function (x) { return compact(x); } };
      },
      read: function (i) {
        var sr = $('[data-sr="cv"]'), j = i < 0 ? LAST : i, v = V[j], c = L.Dc[j] - L.Wc[j], g = v - c;
        setRO(roCV, sr, dTxt(dates[j]), fM(v), fM(c), fS(g) + ' · ' + fP(c ? g / c * 100 : 0, 1), sgnCls(g) === 'flat' ? '' : '', i < 0 ? '' : dTxt(dates[j]) + ': valor ' + fM(v) + ', capital neto ' + fM(c) + ', ganancia de mercado ' + fS(g));
        roCV.querySelector('[data-r="d"]').className = sgnCls(g);
      }
    }, getDead);

    /* ---------- mapa de calor ---------- */
    var hmEl = $('[data-hm]'), tipEl = $('[data-tip]'), hmCells = [];
    (function buildHeat() {
      var h = '<div class="pfd-hr" role="row"><span class="pfd-hh" role="columnheader"><span class="pfd-sr">Año</span></span>' + MES.map(function (m) { return '<span class="pfd-hh" role="columnheader">' + m + '</span>'; }).join('') + '<span class="pfd-hh pfd-hy" role="columnheader">Año</span></div>';
      mo.years.forEach(function (y, yi) {
        h += '<div class="pfd-hr" role="row"><span class="pfd-hh pfd-hyl" role="rowheader">' + y.y + '</span>';
        for (var m = 0; m < 12; m++) {
          var o = byYM[y.y + '-' + m];
          if (!o) { h += '<span class="pfd-hc pfd-hn" role="cell" aria-label="' + MESL[m] + ' ' + y.y + ', sin datos"></span>'; continue; }
          h += '<button type="button" class="pfd-hc ' + (o.r >= 0 ? 'gain' : 'loss') + (o.partial ? ' part' : '') + '" role="cell" data-y="' + y.y + '" data-m="' + m + '" style="--mix:' + mixOf(o.r) + ';--d:' + ((yi + m) * 8) + 'ms" aria-label="' + MESL[m] + ' ' + y.y + ', ' + fP(o.r * 100, 2) + (o.partial ? ', mes parcial' : '') + '"><span class="num">' + sgn(o.r * 100, 1) + '</span></button>';
        }
        h += '<span class="pfd-hc pfd-hy ' + (y.r >= 0 ? 'gain' : 'loss') + '" role="cell" style="--mix:' + mixOf(y.r) + '"><span class="num">' + sgn(y.r * 100, 1) + '</span></span></div>';
      });
      hmEl.innerHTML = h; hmCells = $$('.pfd-hc[data-m]', hmEl);
    })();
    function paintHeat() {
      var s = st.s, best = null, worst = null;
      mo.months.forEach(function (o) { if (o.b > s) { if (!best || o.r > best.r) best = o; if (!worst || o.r < worst.r) worst = o; } });
      if (best === worst) worst = null;
      hmCells.forEach(function (c) {
        var o = byYM[c.dataset.y + '-' + c.dataset.m], out = o.b <= s; c.classList.toggle('out', out); c.classList.toggle('best', !out && o === best); c.classList.toggle('worst', !out && o === worst);
      });
      var sm = $('[data-hms]'); sm.textContent = best ? 'Mejor mes: ' + MESL[best.m] + ' ' + best.y + ' (' + fP(best.r * 100, 1) + ')' + (worst ? ' · peor mes: ' + MESL[worst.m] + ' ' + worst.y + ' (' + fP(worst.r * 100, 1) + ')' : '') + '.' : 'Sin meses completos en el periodo.';
    }
    function showTip(el, html, host, tip) {
      tip.innerHTML = html; tip.hidden = false; var hr = host.getBoundingClientRect(), r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
      var x = clamp(r.left - hr.left + r.width / 2 - tw / 2, 0, Math.max(0, hr.width - tw)), y = r.top - hr.top - th - 8; if (y < 0) y = r.bottom - hr.top + 8;
      tip.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    }
    function hideTip(tip) { tip.hidden = true; }
    function heatTip(c) {
      var o = byYM[c.dataset.y + '-' + c.dataset.m], tag = c.classList.contains('best') ? ' · mejor mes' : c.classList.contains('worst') ? ' · peor mes' : '';
      showTip(c, '<strong>' + MESL[o.m] + ' ' + o.y + tag + '</strong><span>Cartera <b class="num ' + sgnCls(o.r) + '">' + fP(o.r * 100, 2) + '</b></span><span>' + esc(bench.name) + ' <b class="num ' + sgnCls(o.rb) + '">' + fP(o.rb * 100, 2) + '</b></span><span>Flujos netos <b class="num">' + fS(o.net) + '</b></span>' + (o.partial ? '<span class="pfd-tp">' + (o.first ? 'Mes parcial: desde el ' + dTxt(dates[0], true) : 'Mes parcial: hasta el ' + dTxt(dates[o.b], true)) + '</span>' : ''), hmEl.parentNode, tipEl);
    }
    if (HOVER) { hmEl.addEventListener('pointerover', function (e) { var c = e.target.closest('.pfd-hc[data-m]'); if (c) heatTip(c); }); hmEl.addEventListener('pointerleave', function () { hideTip(tipEl); }); }
    hmEl.addEventListener('focusin', function (e) { var c = e.target.closest('.pfd-hc[data-m]'); if (c) heatTip(c); });
    hmEl.addEventListener('focusout', function () { hideTip(tipEl); });
    hmEl.addEventListener('click', function (e) { var c = e.target.closest('.pfd-hc[data-m]'); if (c) { if (tipEl.hidden || tipEl._c !== c) { heatTip(c); tipEl._c = c; } else { hideTip(tipEl); tipEl._c = null; } } });
    var onDoc = function (e) { if (!mount.contains(e.target)) { hideTip(tipEl); hideTip($('[data-tip2]')); } }; doc.addEventListener('pointerdown', onDoc); off.push(function () { doc.removeEventListener('pointerdown', onDoc); });

    /* ---------- contribución ---------- */
    var clEl = $('[data-cl]'), tip2 = $('[data-tip2]');
    function contRow(r) {
      var tt = r.ret == null ? '' : '';
      return '<li class="pfd-cr' + (r.closed ? ' closed' : '') + '" data-t="' + esc(r.tk) + '"><button type="button" class="pfd-crb"><span class="pfd-ca">' + mark(r.tk) + '<span class="pfd-cn"><strong>' + esc(r.tk) + '</strong><span>' + esc(r.name) + (r.closed ? ' · vendida' : '') + '</span></span></span>' +
        '<span class="pfd-cb" aria-hidden="true"><i class="pfd-bn"></i><i class="pfd-bp"></i></span><span class="pfd-cw num">' + fN(r.w, 1) + ' %</span><span class="pfd-cv2 num" data-cv></span></button></li>';
    }
    function sortedRows(rows) { return rows.slice().sort(function (a, b) { var x = a[sortKey === 'tk' ? 'tk' : sortKey], y = b[sortKey === 'tk' ? 'tk' : sortKey]; if (sortKey === 'tk') return sortDir * String(x).localeCompare(String(y)); return sortDir * (x - y) || a.tk.localeCompare(b.tk); }); }
    var contState = {}, contBuilt = false;
    function applyCont(animate) {
      CB = contributions(C, acc, st.s); var rows = CB.rows, maxAbs = 0; rows.forEach(function (r) { maxAbs = Math.max(maxAbs, Math.abs(r.c)); }); maxAbs = maxAbs || 1;
      var by = {}; $$('.pfd-cr', clEl).forEach(function (n) { by[n.dataset.t] = n; });
      var tops = {}; Object.keys(by).forEach(function (k) { tops[k] = by[k].getBoundingClientRect().top; });
      var want = sortedRows(rows), keep = {}; want.forEach(function (r) { keep[r.tk] = 1; });
      Object.keys(by).forEach(function (k) { if (!keep[k]) { by[k].remove(); delete by[k]; } });
      want.forEach(function (r) {
        var n = by[r.tk]; if (!n) { var t = doc.createElement('div'); t.innerHTML = contRow(r); n = t.firstChild; by[r.tk] = n; }
        clEl.appendChild(n); n._r = r;
        var cvEl = n.querySelector('[data-cv]'), bp = n.querySelector('.pfd-bp'), bn = n.querySelector('.pfd-bn'), w = Math.abs(r.c) / maxAbs * 100;
        bp.style.setProperty('--w', (r.c > 0 ? w : 0).toFixed(2) + '%'); bn.style.setProperty('--w', (r.c < 0 ? w : 0).toFixed(2) + '%');
        n.querySelector('.pfd-cw').textContent = fN(r.w, 1) + ' %';
        var prevC = contState[r.tk] == null ? 0 : contState[r.tk]; cvEl.className = 'pfd-cv2 num ' + sgnCls(r.c); roll(cvEl, prevC, r.c, function (v) { return sgn(v, 2, ' pts'); }, animate ? 360 : 0, 0); contState[r.tk] = r.c;
        n.querySelector('.pfd-crb').setAttribute('aria-label', r.tk + ', ' + r.name + '. Peso medio ' + fN(r.w, 1) + ' por ciento' + (r.ret != null ? ', rentabilidad ' + fN(r.ret, 1) + ' por ciento' : '') + ', contribución ' + sgn(r.c, 2, ' puntos') + '.');
      });
      Object.keys(contState).forEach(function (k) { if (!keep[k]) delete contState[k]; });
      if (animate && !reduce()) $$('.pfd-cr', clEl).forEach(function (n) { var o = tops[n.dataset.t]; if (o == null) { if (n.animate) n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: EXPO }); return; } var d = o - n.getBoundingClientRect().top; if (Math.abs(d) > 1 && n.animate) n.animate([{ transform: 'translateY(' + d + 'px)' }, { transform: 'none' }], { duration: 300, easing: EXPO }); });
      var sumC = CB.total, diff = Math.abs(sumC - CB.twr);
      $('[data-sum]').innerHTML = 'Suma de contribuciones <b class="num ' + sgnCls(sumC) + '">' + sgn(sumC, 2, ' pts') + '</b> = TWR del periodo <b class="num ' + sgnCls(CB.twr) + '">' + fP(CB.twr, 2) + '</b><em class="pfd-ok' + (diff < 0.005 ? '' : ' bad') + '">' + (diff < 0.005 ? 'Cuadra' : 'Diferencia ' + fN(diff, 3) + ' pts') + '</em> <span class="pfd-sumn">El efectivo contribuye 0.</span>';
      $('[data-cs]').textContent = PERIODS[Pi][0] + ' · en puntos porcentuales del TWR';
      $$('.pfd-sh', mount).forEach(function (b) { var on = b.dataset.s === sortKey; b.classList.toggle('is-on', on); b.dataset.dir = on ? (sortDir > 0 ? 'asc' : 'desc') : ''; b.setAttribute('aria-label', 'Ordenar por ' + b.textContent + (on ? (sortDir > 0 ? ', ascendente' : ', descendente') : '')); });
    }
    function contTip(n) {
      var r = n._r; if (!r) return;
      showTip(n, '<strong>' + esc(r.tk) + '</strong><span>Peso medio <b class="num">' + fN(r.w, 1) + ' %</b> × rentabilidad <b class="num ' + (r.ret == null ? '' : sgnCls(r.ret)) + '">' + (r.ret == null ? '—' : fP(r.ret, 1)) + '</b></span><span>≈ <b class="num ' + sgnCls(r.c) + '">' + sgn(r.c, 2, ' pts') + '</b> al TWR</span>', clEl.parentNode, tip2);
    }
    if (HOVER) { clEl.addEventListener('pointerover', function (e) { var n = e.target.closest('.pfd-cr'); if (n) contTip(n); }); clEl.addEventListener('pointerleave', function () { hideTip(tip2); }); }
    clEl.addEventListener('focusin', function (e) { var n = e.target.closest('.pfd-cr'); if (n) contTip(n); }); clEl.addEventListener('focusout', function () { hideTip(tip2); });
    clEl.addEventListener('click', function (e) { var n = e.target.closest('.pfd-cr'); if (n) contTip(n); });
    $('.pfd-ch5').addEventListener('click', function (e) { var b = e.target.closest('.pfd-sh'); if (!b) return; var k = b.dataset.s; if (k === sortKey) sortDir = -sortDir; else { sortKey = k; sortDir = k === 'tk' ? 1 : -1; } applyCont(true); });

    /* ---------- selector de periodo ---------- */
    var segP = $('.pfd-sp');
    segP.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-p]'); if (!b) return; var i = +b.dataset.p; if (i === Pi) return; Pi = i;
      $$('button', segP).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); segP.style.setProperty('--i', Pi);
      st = stats(C, sIdx()); hideTip(tipEl); hideTip(tip2);
      applyMetrics(true); ddChart.set(st.s, true); cvChart.set(st.s, true); paintHeat(); applyCont(true);
      $('#' + id + '-d3').querySelector('[data-lines]').innerHTML = lines(ddLines());
    });

    /* ---------- primera vista ---------- */
    function visible() { return mount.offsetWidth > 0 && mount.offsetHeight > 0; }
    function start() {
      if (started || dead) return; started = true;
      var secs = $$('.pfd > .pfd-s, .pfd > .pfd-bar, .pfd > .pfd-cols > .pfd-s');
      if (!reduce()) {
        secs.forEach(function (s, i) { if (s.animate) s.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: i * 40, easing: EXPO, fill: 'backwards' }); });
        rollReg.forEach(function (r, k) { var el = $('[data-r="' + k + '"]'); if (el) roll(el, 0, r.v, r.f, 700, 120 + Math.floor(k / 3) * 40); });
        M.forEach(function (k, n) { if (k.to == null || k.text != null) return; roll($('[data-k="' + k.id + '"] [data-kv]'), 0, k.to, k.fmt, 700, 160 + n * 40); });
        hmCells.forEach(function (c) { if (c.animate) c.animate([{ opacity: 0 }, { opacity: c.classList.contains('out') ? 0.3 : 1 }], { duration: 300, delay: 200 + parseFloat(c.style.getPropertyValue('--d')), easing: EXPO, fill: 'backwards' }); });
        $$('.pfd-cr', clEl).forEach(function (n, i) { var b = n.querySelector('.pfd-bp'), bn = n.querySelector('.pfd-bn'); [b, bn].forEach(function (x) { if (x.animate) x.animate([{ transform: 'scaleX(0)' }, { transform: 'none' }], { duration: 500, delay: 260 + i * 40, easing: EXPO, fill: 'backwards' }); }); });
      }
      ddChart.start(); cvChart.start();
    }
    if (mount.animate && !reduce()) mount.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EXPO });
    applyMetrics(false); ddChart.set(st.s, false); cvChart.set(st.s, false); paintHeat(); applyCont(false);
    if (window.ResizeObserver) { var ro = new ResizeObserver(function () { ddChart.size(); cvChart.size(); if (!started && visible()) start(); }); $$('.pfd-stage').forEach(function (s) { ro.observe(s); }); ro.observe(mount); off.push(function () { ro.disconnect(); }); }
    var resz = function () { ddChart.size(); cvChart.size(); }; window.addEventListener('resize', resz); off.push(function () { window.removeEventListener('resize', resz); });
    var mob = new MutationObserver(function () { ddChart.theme(); cvChart.theme(); }); mob.observe(root, { attributes: true, attributeFilter: ['data-theme'] }); off.push(function () { mob.disconnect(); });
    var onRm = function () { ddChart.schedule(); cvChart.schedule(); }; if (rmq.addEventListener) { rmq.addEventListener('change', onRm); off.push(function () { rmq.removeEventListener('change', onRm); }); }
    off.push(function () { ddChart.stop(); cvChart.stop(); });
    ddChart.size(); cvChart.size(); if (visible()) start(); else setTimeout(function () { ddChart.size(); cvChart.size(); if (!started && visible()) start(); }, 0);
    api.stats = function () { return st; }; api.contributions = function () { return CB; };
    return api;
  }

  window.CampoPfDesempeno = { render: render, calc: { context: context, stats: stats, periodRows: periodRows, monthly: monthly, perAsset: perAsset, contributions: contributions, drawdown: drawdown } };
})();
