/* Campo · app: ficha de posición, búsqueda Ctrl+K y menú contextual (después de -mkt.js).
   Integra: window.CampoMarks (opcional) y el evento 'campo:open-position' {detail:{ticker}}.
   La ficha lee del Tracker: posición, costo y valor salen del libro del portafolio en el que estás (CampoModel.ledger),
   y el precio de CampoTracker.pricePath (la misma serie de todas las pestañas). PORTIFY_DEMO queda solo como respaldo. */
(function () {
  'use strict';
  var D = window.PORTIFY_DEMO; if (!D) return;
  var F = D.fmt;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var rmq = window.matchMedia('(prefers-reduced-motion: reduce)'), reduce = function () { return rmq.matches; };
  var mob = window.matchMedia('(max-width: 640px)');
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  var MOD = isMac ? '⌘' : 'Ctrl';
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var viewApp = $('#view-app'), root = document.documentElement;
  var inApp = function () { return document.body.dataset.view === 'app'; };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* ---------- la posición, desde el Tracker ----------
     Contexto: el portafolio de la ruta #tracker/<id> ('todos' si es el consolidado); fuera del Tracker (Inicio), Principal.
     Cifras del libro: cantidad de hoy, costo en pesos al TC de cada compra, valor, ganancia no realizada y peso sobre el patrimonio. */
  function ctxPf() {
    var T = window.CampoTracker; if (!T) return null;
    var inTk = /^#tracker\/[^/]+/.test(location.hash || '');
    if (inTk && T.route === 'todos') return 'todos';
    if (inTk && T.route && T.get(T.route)) return T.get(T.route);
    return T.get('principal') || T.portfolios[0] || null;
  }
  var rcache = {};
  function rowsOf(pf) {
    var T = window.CampoTracker, M = window.CampoModel; if (!T || !M || !pf) return null;
    var id = pf === 'todos' ? 'todos' : pf.id, key = (T.txVersion || 0) + '|' + id + '|' + T.portfolios.length;
    if (rcache[id] && rcache[id].key === key) return rcache[id].rows;
    var L = M.ledger(pf); if (!L) return null;
    var tot = L.value || 1, scope = pf === 'todos' ? T.portfolios : [pf], out = [];
    L.rows.forEach(function (r) {
      var q = 0, c = 0, where = [];
      scope.forEach(function (P) { (P.positions || []).forEach(function (x) { if (x.ticker === r.ticker) { q += x.qty; c += x.qty * x.avg; if (where.indexOf(P.name) < 0) where.push(P.name); } }); });
      out.push({ ticker: r.ticker, name: r.name, cls: r.cls, ccy: r.ccy, qty: r.qty, avg: q ? c / q : r.price, price: r.price, d1: r.d1, value: r.mv, cost: r.cost,
        pnl: r.mv - r.cost, pnlPct: r.cost ? (r.mv / r.cost - 1) * 100 : 0, weight: r.mv / tot * 100, where: where, scope: pf === 'todos' ? 'Todos tus portafolios' : pf.name });
    });
    out.sort(function (a, b) { return b.value - a.value; });
    rcache[id] = { key: key, rows: out }; return out;
  }
  function byTicker(t) {
    var rows = rowsOf(ctxPf()), f = rows && rows.filter(function (r) { return r.ticker === t; })[0];
    if (!f) { var all = rowsOf('todos'); f = all && all.filter(function (r) { return r.ticker === t; })[0]; } /* no está aquí: la de todos tus portafolios */
    return f || D.positions.filter(function (p) { return p.ticker === t; })[0];
  }
  function sgn(v) { return v > 0 ? '+' : v < 0 ? '−' : ''; }
  function delta(v, text) { return '<span class="delta ' + (v > 0 ? 'gain' : v < 0 ? 'loss' : 'flat') + '"><i class="arw" aria-hidden="true">' + (v > 0 ? '▲' : v < 0 ? '▼' : '▪') + '</i><span>' + text + '</span></span>'; }
  function numDec(v) { return v >= 10000 ? 0 : v >= 100 ? 1 : 2; }
  function nf(v, d) { return F.num(v, d == null ? (v >= 1000 ? 0 : 2) : d); }
  var ICON = {
    search: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14 6-6 6 6 6"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m10 6 6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    act: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
  };

  /* ---------- marcas (CampoMarks si existe, círculo neutro con inicial si no) ---------- */
  function mark(sym, size) {
    var M = window.CampoMarks;
    if (M && typeof M.svg === 'function') { try { var s = M.svg(sym, size); if (s) return s; } catch (e) { } }
    return '<span class="mk-fb" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.max(8, Math.round(size * 0.46)) + 'px" aria-hidden="true">' + esc(String(sym).trim().charAt(0).toUpperCase()) + '</span>';
  }
  function stacked(syms, size) { return '<span class="mk-st" aria-hidden="true">' + syms.map(function (s) { return '<span>' + mark(s, size) + '</span>'; }).join('') + '</span>'; }

  /* ---------- aviso ---------- */
  var toastT = 0;
  function toast(msg) { var t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2400); }
  var REAL = !!window.CAMPO_REAL; /* con la cuenta real no hay alertas de precio aquí: se ocultan en vez de avisar de algo que no existe */
  var PENDING = ' · las alertas de precio siguen en la versión anterior de la app';
  function goSec(name, hash) { var S = window.CampoSections; if (S && S.show) S.show(name, hash); }
  function openMk(sym) { if (window.CampoMercados && sym) window.CampoMercados.open(sym); else goSec('mercados'); }
  function copyText(txt) {
    function fb() { var a = document.createElement('textarea'); a.value = txt; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;opacity:0;top:0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) { } a.remove(); }
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).catch(fb); else fb(); } catch (e) { fb(); }
  }

  /* ---------- serie sintética determinista por posición (dato de muestra) ---------- */
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function volOf(p) { return /Cripto/.test(p.cls) ? 0.03 : /ETF/.test(p.cls) ? 0.008 : /CETES|Bono|Deuda/i.test(p.cls + p.ticker) ? 0.0004 : 0.015; }
  var scache = {};
  function series(p) {
    /* el MISMO precio que el Tracker (modelo de factores); la serie sintética de abajo solo queda como respaldo */
    var TK = window.CampoTracker, lp = TK && TK.pricePath ? TK.pricePath({ ticker: p.ticker, price: p.price, d1: p.d1, currency: p.ccy, cls: p.cls }) : null;
    if (lp && lp.length === D.series.dates.length) return Array.prototype.slice.call(lp);
    if (scache[p.ticker]) return scache[p.ticker];
    var n = D.series.dates.length, r = rng(hash(p.ticker));
    var g = function () { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    var vol = volOf(p);
    var w = [0], i; for (i = 1; i < n; i++) w.push(w[i - 1] + g() * vol);
    var l0 = Math.log(p.avg), l1 = Math.log(p.price), out = [];
    for (i = 0; i < n; i++) out.push(Math.exp(l0 + (l1 - l0) * i / (n - 1) + (w[i] - i / (n - 1) * w[n - 1])));
    var off = Math.log(p.price / (1 + p.d1 / 100)) - Math.log(out[n - 2]);
    for (var k = 0; k < 12; k++) out[n - 2 - k] *= Math.exp(off * (1 - k / 12));
    out[0] = p.avg; out[n - 1] = p.price;
    return (scache[p.ticker] = out);
  }
  var PER = [{ id: '1S', l: '1S', n: 5, name: '1 semana' }, { id: '1M', l: '1M', n: 21, name: '1 mes' }, { id: '3M', l: '3M', n: 63, name: '3 meses' }, { id: '6M', l: '6M', n: 126, name: '6 meses' }, { id: 'MAX', l: '1A', n: 251, name: '1 año' }];
  function dlabel(d) { return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function ago(m) { return m <= 0 ? '' : m < 60 ? 'hace ' + m + ' min' : 'hace ' + Math.round(m / 60) + ' h'; }

  /* ================= FICHA ================= */
  var MODE_KEY = 'campo.fi.mode', FG = 28; /* FG: pasos finos (intradía) por día */
  function loadMode() { try { return localStorage.getItem(MODE_KEY) === 'candle' ? 'candle' : 'line'; } catch (e) { return 'line'; } }
  function saveMode(m) { try { localStorage.setItem(MODE_KEY, m); } catch (e) { } }
  var st = { open: false, ticker: null, order: [], per: '3M', mode: window.CAMPO_REAL ? 'line' : loadMode(), trigger: null, view: null, hi: null, swapT: 0, dir: 1, pv: null };
  var back, fi, fiC, fiCnt, cs, box, cv, cx2, built = false;
  var cur = null, tr = null, intro = null, loopR = 0, loopT = 0, colC = null, W = 0, H = 0, dpr = 1;
  var PT = 12, PB = 8;
  var NC = { '1S': 35, '1M': 42, '3M': 42, '6M': 42, 'MAX': 50 };
  var CAPT = { '1S': '1 hora', '1M': '12 horas', '3M': '1,5 días', '6M': '3 días', 'MAX': '5 días' };
  var CAP0 = window.CAMPO_REAL ? 'Cierres diarios del último año; hoy, el último precio. La misma serie que usan Portafolios y sus pestañas.' : 'Precio de muestra: la misma serie que usan el Tracker y sus pestañas. No es historial real.';

  /* ---------- utilidades de movimiento ---------- */
  function bezF(x1, y1, x2, y2) {
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var t = x, i, dx, d;
      for (i = 0; i < 8; i++) {
        dx = 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t - x; if (Math.abs(dx) < 1e-5) break;
        d = 3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2); if (Math.abs(d) < 1e-6) break;
        t = clamp(t - dx / d, 0, 1);
      }
      return 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
    };
  }
  var easeOut = bezF(0.23, 1, 0.32, 1);
  var lerp = function (a, b, e) { return a + (b - a) * e; };
  function stopLoop() { cancelAnimationFrame(loopR); clearTimeout(loopT); loopR = loopT = 0; }
  function sched(fn) { stopLoop(); loopR = requestAnimationFrame(fn); loopT = setTimeout(fn, 50); }
  function every(fn) { /* rAF con respaldo de temporizador (si la pestaña no pinta) */
    var done = false, r = 0, t = 0;
    (function run() { if (done) return; cancelAnimationFrame(r); clearTimeout(t); if (fn() === false) { done = true; return; } r = requestAnimationFrame(run); t = setTimeout(run, 50); })();
  }
  function roll(el, a, b, fmt) {
    if (!el || a == null || a === b || reduce()) return;
    var t0 = performance.now();
    every(function () { var e = (performance.now() - t0) / 300; if (e >= 1) { el.textContent = fmt(b); return false; } el.textContent = fmt(a + (b - a) * easeOut(e)); });
  }

  /* ---------- serie intradía sintética (misma semilla; pasa exactamente por los cierres diarios) ---------- */
  var fcache = {};
  function fine(p) {
    if (fcache[p.ticker]) return fcache[p.ticker];
    var s = series(p), n = s.length, r = rng(hash(p.ticker + '·i')), G = FG, vol = volOf(p), out = new Float64Array((n - 1) * G + 1), w = new Float64Array(G + 1), d, j;
    var g = function () { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    var sg = window.CAMPO_REAL ? 0 : vol * 0.7 / Math.sqrt(G); /* producción: entre cierres reales, recta (no se inventa intradía) */
    for (d = 0; d < n - 1; d++) {
      var a = Math.log(s[d]), b = Math.log(s[d + 1]);
      for (j = 1; j <= G; j++) w[j] = w[j - 1] + g();
      for (j = 0; j < G; j++) out[d * G + j] = Math.exp(a + (b - a) * j / G + sg * (w[j] - j / G * w[G]));
    }
    out[(n - 1) * G] = s[n - 1];
    return (fcache[p.ticker] = out);
  }
  function niceStep(raw) { var mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag; return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag; }
  var vcache = {};
  function perOf(id) { return PER.filter(function (x) { return x.id === id; })[0]; }
  function buildView(p, perId) {
    var key = p.ticker + '|' + perId; if (vcache[key]) return vcache[key];
    var d = perOf(perId), f = fine(p), nD = D.series.dates.length, L = d.n * FG, S0 = (nD - 1 - d.n) * FG, K = 96, nc = NC[perId], i, j, v, mn = Infinity, mx = -Infinity;
    for (i = 0; i <= L; i++) { v = f[S0 + i]; if (v < mn) mn = v; if (v > mx) mx = v; }
    var pad = (mx - mn) * 0.1 || mx * 0.01; mn -= pad; mx += pad;
    var yn = function (x) { return (mx - x) / (mx - mn); };
    var lv = [], ly = [], raw = [], cand = [];
    for (i = 0; i < K; i++) { var u = i / (K - 1) * L, i0 = Math.floor(u), fr = u - i0, a = f[S0 + i0], b = f[S0 + Math.min(i0 + 1, L)]; v = a + (b - a) * fr; lv.push(v); ly.push(yn(v)); }
    for (i = 0; i < nc; i++) {
      var a0 = S0 + Math.round(i * L / nc), a1 = S0 + Math.round((i + 1) * L / nc), hi = -Infinity, lo = Infinity;
      for (j = a0; j <= a1; j++) { if (f[j] > hi) hi = f[j]; if (f[j] < lo) lo = f[j]; }
      var o = f[a0], c = f[a1];
      raw.push({ o: o, h: hi, l: lo, c: c, i0: a0 });
      cand.push({ cx: (i + 0.5) / nc, w: 1 / nc, o: yn(o), h: yn(hi), l: yn(lo), c: yn(c), u: c >= o ? 1 : 0 });
    }
    var step = niceStep((mx - mn) / 3.5), dec = Math.max(0, Math.min(4, Math.ceil(-Math.log10(step) - 1e-9))), ticks = [];
    for (var tv = Math.ceil(mn / step) * step; tv <= mx; tv += step) { var ty = yn(tv); if (ty > 0.06 && ty < 0.94) ticks.push({ p: tv, label: F.num(tv, dec), y: ty, a: 1 }); }
    var base = { asset: p.ticker, per: perId, d: d, nc: nc, K: K, L: L, S0: S0, mn: mn, mx: mx, lv: lv, ly: ly, raw: raw, cand: cand, ticks: ticks.slice(0, 4), base: yn(lv[0]), upf: lv[K - 1] >= lv[0] ? 1 : 0, m: 0 };
    base.sL = base; base.sC = Object.assign({}, base, { m: 1 });
    return (vcache[key] = base);
  }
  /* mezcla de dos escenas (o instantáneas) en espacio normalizado; e en 0..1 */
  function mix(A, B, e) {
    if (e <= 0) return A; if (e >= 1) return B;
    var K = A.ly.length, ly = new Array(K), i, same = A.asset === B.asset;
    for (i = 0; i < K; i++) ly[i] = lerp(A.ly[i], B.ly[i], e);
    var na = A.cand.length, nb = B.cand.length, M = Math.max(na, nb), cand = [];
    for (i = 0; i < M; i++) {
      var a = A.cand[Math.min(na - 1, Math.floor((i + 0.5) * na / M))], b = B.cand[Math.min(nb - 1, Math.floor((i + 0.5) * nb / M))];
      cand.push({ cx: lerp(a.cx, b.cx, e), w: lerp(a.w, b.w, e), o: lerp(a.o, b.o, e), h: lerp(a.h, b.h, e), l: lerp(a.l, b.l, e), c: lerp(a.c, b.c, e), u: lerp(a.u, b.u, e) });
    }
    var mn = lerp(A.mn, B.mn, e), mx = lerp(A.mx, B.mx, e), ticks = [], bm = {}, used = {};
    var yIn = function (S, p) { return (S.mx - p) / (S.mx - S.mn); };
    B.ticks.forEach(function (t) { bm[t.label] = t; });
    A.ticks.forEach(function (t) {
      var b = same ? bm[t.label] : null;
      if (b) { used[t.label] = 1; ticks.push({ p: t.p, label: t.label, y: lerp(t.y, b.y, e), a: lerp(t.a, b.a, e) }); }
      else ticks.push({ p: t.p, label: t.label, y: same ? lerp(t.y, yIn(B, t.p), e) : t.y, a: t.a * (1 - e) });
    });
    B.ticks.forEach(function (t) {
      if (same && used[t.label]) return;
      ticks.push({ p: t.p, label: t.label, y: same ? lerp(yIn(A, t.p), t.y, e) : t.y, a: t.a * e });
    });
    return { asset: B.asset, mn: mn, mx: mx, ly: ly, cand: cand, ticks: ticks, base: lerp(A.base, B.base, e), upf: lerp(A.upf, B.upf, e), m: lerp(A.m, B.m, e) };
  }

  /* ---------- lienzo ---------- */
  var px1c = document.createElement('canvas'); px1c.width = px1c.height = 1;
  var px1 = px1c.getContext('2d', { willReadFrequently: true });
  function rgba(css) { px1.clearRect(0, 0, 1, 1); px1.fillStyle = '#000'; px1.fillStyle = css; px1.fillRect(0, 0, 1, 1); var d = px1.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; }
  function colors() {
    if (colC) return colC;
    var cs_ = getComputedStyle(root), g = function (n) { return cs_.getPropertyValue(n).trim(); };
    return (colC = { gain: rgba(g('--gain')), loss: rgba(g('--loss')), line: rgba(g('--line')), t3: rgba(g('--text-3')), font: getComputedStyle(box).fontFamily || 'sans-serif' });
  }
  function rs(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + clamp(a * c[3], 0, 1).toFixed(3) + ')'; }
  function mixc(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), 1]; }
  function sizeCanvas() {
    if (!box) return; W = Math.round(box.clientWidth); H = Math.round(box.clientHeight); dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(W * dpr), h = Math.round(H * dpr); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }
  function draw(sc, iv) {
    if (!cx2 || !W || !H || !sc) return;
    var C = colors(), ph = H - PT - PB, Y = function (y) { return PT + y * ph; }, ta = iv ? iv.ta : 1, m = sc.m, anim = !!(tr || iv), i;
    var lc = mixc(C.loss, C.gain, sc.upf);
    cx2.setTransform(dpr, 0, 0, dpr, 0, 0); cx2.clearRect(0, 0, W, H);
    cx2.font = '11px ' + C.font; cx2.textBaseline = 'alphabetic'; cx2.textAlign = 'left';
    sc.ticks.forEach(function (t) {
      var a = t.a * ta, y = Y(t.y); if (a < 0.01 || y < PT - 4 || y > H - PB + 4) return;
      cx2.globalAlpha = a; cx2.fillStyle = rs(C.line, 0.7); cx2.fillRect(0, Math.round(y), W, 1);
      cx2.fillStyle = rs(C.t3, 1); cx2.fillText(t.label, 0, Math.round(y) - 4);
    });
    cx2.globalAlpha = ta; cx2.setLineDash([3, 4]); cx2.lineWidth = 1; cx2.strokeStyle = rs(C.line, 1);
    cx2.beginPath(); cx2.moveTo(0, Math.round(Y(sc.base)) + 0.5); cx2.lineTo(W, Math.round(Y(sc.base)) + 0.5); cx2.stroke(); cx2.setLineDash([]);
    var la = clamp(1 - m * 1.25, 0, 1), M = sc.cand.length;
    if (la > 0.005 && (!iv || iv.r > 0)) {
      var K = sc.ly.length, xs = [], ys = [];
      for (i = 0; i < K; i++) {
        var x0 = i / (K - 1), y0 = sc.ly[i];
        if (m > 0) { var cd = sc.cand[Math.min(M - 1, Math.floor(x0 * M))]; x0 = lerp(x0, cd.cx, m); y0 = lerp(y0, cd.c, m); }
        xs.push(x0 * W); ys.push(Y(y0));
      }
      cx2.save();
      if (iv && iv.r < 1) { cx2.beginPath(); cx2.rect(0, 0, W * iv.r, H); cx2.clip(); }
      cx2.globalAlpha = la;
      cx2.beginPath(); cx2.moveTo(xs[0], ys[0]); for (i = 1; i < K; i++) cx2.lineTo(xs[i], ys[i]);
      cx2.lineTo(xs[K - 1], Y(1)); cx2.lineTo(xs[0], Y(1)); cx2.closePath();
      var gr = cx2.createLinearGradient(0, PT, 0, H - PB); gr.addColorStop(0, rs(lc, 0.24)); gr.addColorStop(1, rs(lc, 0.02));
      cx2.fillStyle = gr; cx2.fill();
      cx2.beginPath(); cx2.moveTo(xs[0], ys[0]); for (i = 1; i < K; i++) cx2.lineTo(xs[i], ys[i]);
      cx2.lineWidth = 1.75; cx2.lineJoin = 'round'; cx2.lineCap = 'round'; cx2.strokeStyle = rs(lc, 1); cx2.stroke();
      cx2.restore();
    }
    var ca = clamp(m * 1.25 - 0.25, 0, 1);
    if (ca > 0.005) {
      cx2.globalAlpha = ca;
      sc.cand.forEach(function (c, k) {
        var g = iv ? iv.g(k) : 1; if (g <= 0) return;
        var cl = c.c, o = cl + (c.o - cl) * m, h = cl + (c.h - cl) * m, l = cl + (c.l - cl) * m;
        if (g < 1) { cl = o + (cl - o) * g; h = o + (h - o) * g; l = o + (l - o) * g; }
        var x = c.cx * W, w = Math.max(1, c.w * W * 0.62), yo = Y(o), yc = Y(cl), yh = Y(h), yl = Y(l), top = Math.min(yo, yc), bh = Math.max(1, Math.abs(yo - yc)), wx = x - 0.5, bx = x - w / 2;
        if (!anim) { w = Math.max(1, Math.round(w)); wx = Math.round(x - 0.5); bx = Math.round(x - w / 2); top = Math.round(top); bh = Math.max(1, Math.round(bh)); yh = Math.round(yh); yl = Math.round(yl); }
        cx2.fillStyle = rs(mixc(C.loss, C.gain, c.u), 1);
        cx2.fillRect(wx, yh, 1, Math.max(1, yl - yh)); cx2.fillRect(bx, top, w, bh);
      });
    }
    cx2.globalAlpha = 1;
  }
  function frame() {
    stopLoop();
    var now = performance.now(), busy = false, sc = cur, iv = null;
    if (tr) { var e = (now - tr.t0) / tr.dur; if (e >= 1) { cur = sc = tr.to; tr = null; } else { cur = sc = mix(tr.from, tr.to, easeOut(e)); busy = true; } }
    if (intro) {
      if (intro.t0 == null) iv = { r: 0, ta: 0, g: function () { return 0; } };
      else {
        var t = now - intro.t0;
        if (t >= Math.max(500, 320 + 12 * (st.view ? st.view.nc : 40))) intro = null;
        else { iv = { r: easeOut(clamp(t / 500, 0, 1)), ta: clamp(t / 300, 0, 1), g: function (k) { return easeOut(clamp((t - k * 12) / 320, 0, 1)); } }; busy = true; }
      }
    }
    draw(sc, iv); if (busy) sched(frame);
  }
  function setScene(how) {
    var p = curP(), v = buildView(p, st.per), sc = st.mode === 'candle' ? v.sC : v.sL;
    st.view = v; sizeCanvas(); updateLabels(p, v); hvRest();
    if (how === 'init' || reduce() || !cur || (intro && intro.t0 == null)) { tr = null; cur = sc; if (how === 'init') intro = { t0: null }; else if (!intro || intro.t0 != null) intro = null; frame(); }
    else { intro = null; tr = { from: cur, to: sc, t0: performance.now(), dur: how === 'mode' ? 320 : 360 }; frame(); }
  }
  function startIntro() { if (!st.open) return; if (reduce()) { intro = null; frame(); return; } intro = { t0: performance.now() }; frame(); }
  function introAfterSlide() {
    var done = false, tm = 0;
    function go() { if (done) return; done = true; fi.removeEventListener('transitionend', h); clearTimeout(tm); startIntro(); }
    function h(e) { if (e.target === fi && e.propertyName === 'transform') go(); }
    fi.addEventListener('transitionend', h); tm = setTimeout(go, 360);
  }
  function updateLabels(p, v) {
    var s = series(p), pe = $('#fiPer', cs);
    pe.style.setProperty('--i', PER.indexOf(v.d));
    $$('button', pe).forEach(function (b, j) {
      var d2 = PER[j], r = (s[s.length - 1] / s[s.length - 1 - d2.n] - 1) * 100, em = b.lastChild;
      b.setAttribute('aria-pressed', d2.id === st.per); b.setAttribute('aria-label', d2.name + ', ' + F.pct(r, 1));
      em.className = r > 0 ? 'gain' : r < 0 ? 'loss' : 'flat'; em.textContent = F.pct(r, 1);
    });
    var md = $('#fiMode', cs); md.style.setProperty('--i', st.mode === 'candle' ? 1 : 0);
    $$('button', md).forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.m === st.mode); });
    $('#fiCtl', cs).textContent = st.mode === 'candle' ? 'Velas de ' + CAPT[st.per] : 'Precio';
    $('#fiCap', cs).textContent = CAP0 + (st.mode === 'candle' ? ' Cada vela agrupa ' + CAPT[st.per] + '.' : '');
    cs.setAttribute('aria-label', 'Gráfica de ' + p.ticker);
    box.setAttribute('aria-label', (window.CAMPO_REAL ? 'Gráfica de ' : 'Gráfica de muestra de ') + p.ticker + ', ' + v.d.name + ': de ' + nf(v.lv[0]) + ' a ' + nf(v.lv[v.K - 1]) + ' ' + p.ccy + '. Con la gráfica enfocada, ← → exploran los puntos.');
  }

  /* ---------- cursor / lectura ---------- */
  function tlabel(v, fx_) {
    var nD = D.series.dates.length, day = Math.floor(fx_ / FG), fr = (fx_ - day * FG) / FG; if (day >= nD - 1) { day = nD - 1; fr = 0; }
    var s = new Date(D.series.dates[day] + 'T12:00:00').toLocaleDateString('es-MX', (v.per === '6M' || v.per === 'MAX') ? { day: 'numeric', month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' });
    if (v.per === '1S' || v.per === '1M') { var h = 9 + Math.min(7, Math.round(fr * 7)); s += ' · ' + (h < 10 ? '0' : '') + h + ':00'; }
    return s;
  }
  function hvRest() {
    if (!cs) return; var v = st.view, ro = $('#fiRo', cs); st.hi = null; box.classList.remove('hv'); if (!v) return;
    var dates = D.series.dates, nD = dates.length;
    ro.className = 'fi-ro'; ro.innerHTML = '<span>' + v.d.name.charAt(0).toUpperCase() + v.d.name.slice(1) + ' · ' + dlabel(dates[nD - 1 - v.d.n]) + ' a ' + dlabel(dates[nD - 1]) + '</span>';
  }
  function hvAt(i) {
    var v = st.view, p = curP(); if (!v || !p) return;
    var ro = $('#fiRo', cs), cd = st.mode === 'candle', xN, n = cd ? v.nc : v.K, xh = $('.fi-xh', box), dot = $('.fi-dot', box);
    i = clamp(i, 0, n - 1);
    if (cd) {
      var r = v.raw[i]; xN = v.cand[i].cx; ro.className = 'fi-ro oh';
      ro.innerHTML = '<span>' + tlabel(v, r.i0) + '</span><span><i>A</i>' + nf(r.o) + '</span><span><i>Máx</i>' + nf(r.h) + '</span><span><i>Mín</i>' + nf(r.l) + '</span><span><i>C</i>' + nf(r.c) + '</span>';
    } else {
      var val = v.lv[i]; xN = i / (n - 1); ro.className = 'fi-ro';
      ro.innerHTML = '<span>' + tlabel(v, v.S0 + Math.round(xN * v.L)) + '</span><span><b>' + nf(val) + ' ' + p.ccy + '</b> · ' + F.pct((val / v.lv[0] - 1) * 100, 1) + '</span>';
      dot.style.transform = 'translate(' + (xN * W) + 'px,' + (PT + v.ly[i] * (H - PT - PB)) + 'px)';
    }
    box.classList.toggle('cd', cd); xh.style.transform = 'translateX(' + Math.round(xN * W) + 'px)'; box.classList.add('hv'); st.hi = i;
  }
  function hvX(e) {
    var r = box.getBoundingClientRect(), u = clamp((e.clientX - r.left) / r.width, 0, 1), v = st.view; if (!v) return;
    hvAt(st.mode === 'candle' ? Math.min(v.nc - 1, Math.floor(u * v.nc)) : Math.round(u * (v.K - 1)));
  }

  function build() {
    if (built) return; built = true;
    back = document.createElement('div'); back.className = 'fi-back'; back.setAttribute('aria-hidden', 'true');
    fi = document.createElement('aside'); fi.className = 'fi'; fi.setAttribute('role', 'dialog'); fi.setAttribute('aria-modal', 'true'); fi.setAttribute('aria-labelledby', 'fiT'); fi.tabIndex = -1;
    fi.innerHTML = '<div class="fi-grab" data-grab aria-hidden="true"><i></i></div>' +
      '<div class="fi-bar" data-grab><span class="fi-cnt" id="fiCnt"></span><div class="fi-nav">' +
      '<button type="button" class="icon-btn" data-fi="prev" aria-label="Posición anterior">' + ICON.prev + '</button>' +
      '<button type="button" class="icon-btn" data-fi="next" aria-label="Posición siguiente">' + ICON.next + '</button>' +
      '<button type="button" class="icon-btn" data-fi="close" aria-label="Cerrar ficha">' + ICON.close + '</button></div></div>' +
      '<div class="fi-scroll"><div class="fi-c" id="fiC"></div></div>';
    document.body.appendChild(back); document.body.appendChild(fi);
    fiC = $('#fiC', fi); fiCnt = $('#fiCnt', fi);
    /* sección de gráfica persistente: sobrevive a los cambios de posición para poder animarse */
    cs = document.createElement('section'); cs.className = 'fi-cs';
    cs.innerHTML = '<div class="fi-top"><span class="fi-ctl" id="fiCtl"></span><div class="seg fi-mode" id="fiMode" role="group" aria-label="Tipo de gráfica" style="--n:2"><i class="seg-pill" aria-hidden="true"></i>' +
      '<button type="button" data-m="line" aria-pressed="true">Línea</button><button type="button" data-m="candle" aria-pressed="false">Velas</button></div></div>' +
      '<div class="fi-ro" id="fiRo"></div><div class="fi-chart" id="fiChart" tabindex="0" role="group"><canvas aria-hidden="true"></canvas><i class="fi-xh"></i><i class="fi-dot"></i></div>' +
      '<div class="fi-per" id="fiPer" role="group" aria-label="Periodo y rendimiento"><i class="fi-pill" aria-hidden="true"></i></div><p class="fi-cap" id="fiCap"></p>';
    box = $('#fiChart', cs); cv = $('canvas', box); cx2 = cv.getContext('2d');
    var per = $('#fiPer', cs);
    PER.forEach(function (d) {
      var b = document.createElement('button'); b.type = 'button'; b.dataset.p = d.id; b.innerHTML = '<span>' + d.l + '</span><em></em>';
      b.addEventListener('click', function () { if (st.per === d.id) return; st.per = d.id; setScene('period'); });
      per.appendChild(b);
    });
    $$('#fiMode button', cs).forEach(function (b) { b.addEventListener('click', function () { if (st.mode === b.dataset.m) return; st.mode = b.dataset.m; saveMode(st.mode); setScene('mode'); }); });
    box.addEventListener('pointermove', hvX); box.addEventListener('pointerdown', hvX);
    box.addEventListener('pointerleave', hvRest); box.addEventListener('pointercancel', hvRest); box.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') hvRest(); });
    box.addEventListener('blur', hvRest);
    box.addEventListener('keydown', function (e) {
      var k = e.key, v = st.view; if (!v || e.ctrlKey || e.metaKey || e.altKey) return;
      var n = st.mode === 'candle' ? v.nc : v.K, i = st.hi == null ? n - 1 : st.hi;
      if (k === 'ArrowLeft') i = st.hi == null ? n - 1 : i - 1; else if (k === 'ArrowRight') i = st.hi == null ? n - 1 : i + 1; else if (k === 'Home') i = 0; else if (k === 'End') i = n - 1; else return;
      e.preventDefault(); e.stopPropagation(); hvAt(i);
    });
    if (window.ResizeObserver) new ResizeObserver(function () { sizeCanvas(); frame(); }).observe(box);
    new MutationObserver(function () { colC = null; if (st.open) frame(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    back.addEventListener('click', function () { close(); });
    fi.addEventListener('click', function (e) {
      var b = e.target.closest('[data-fi]'); if (!b) return;
      if (b.dataset.fi === 'close') close(); else if (b.dataset.fi === 'prev') nav(-1); else if (b.dataset.fi === 'next') nav(1);
    });
    fi.addEventListener('keydown', trap);
    initDrag();
  }
  function focusables(root_) { return $$('button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])', root_).filter(function (e) { return e.offsetParent !== null || e === document.activeElement; }); }
  function trap(e) {
    if (e.key !== 'Tab') return;
    var f = focusables(fi); if (!f.length) return;
    var first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (a === fi) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }
  function curP() { return byTicker(st.ticker); }
  function keyRow(label, val, sub, cls) { return '<div><dt>' + label + '</dt><dd' + (cls ? ' class="' + cls + '"' : '') + '>' + val + (sub || '') + '</dd></div>'; }
  function mxn0(v) { return F.mxn(Math.abs(v), 0); }
  /* Registrar compra / venta desde la ficha: abre CampoTxSheet con el portafolio de la ruta, o el primero que tenga el ticker */
  function pfHolding(tk) { var T = window.CampoTracker, r = []; if (T) T.portfolios.forEach(function (q) { if ((q.positions || []).some(function (x) { return x.ticker === tk; })) r.push(q.id); }); return r; }
  function txBtns(tk) {
    if (!window.CampoTxSheet || !window.CampoTracker) return '';
    return '<div class="fi-tx" style="grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px"><button type="button" class="btn btn-secondary btn-sm" data-tx="buy" data-tk="' + esc(tk) + '">Registrar compra</button>' +
      (pfHolding(tk).length ? '<button type="button" class="btn btn-secondary btn-sm" data-tx="sell" data-tk="' + esc(tk) + '">Registrar venta</button>' : '') + '</div>';
  }
  function txPf(tk, type) {
    var T = window.CampoTracker, held = pfHolding(tk), r = T.route && T.get(T.route) ? T.route : null;
    if (r && (type === 'buy' || held.indexOf(r) >= 0)) return r;
    return held[0] || (T.get('principal') ? 'principal' : (T.portfolios[0] && T.portfolios[0].id) || null);
  }
  function html(p) {
    var amt = p.price - p.price / (1 + p.d1 / 100);
    var news = D.news.filter(function (x) { return x.ticker === p.ticker; });
    var pl = p.pnl;
    var fx = p.ccy !== ((window.CampoTracker && window.CampoTracker.base) || 'MXN') ? '<span class="fi-sub muted">USD/MXN ' + F.num(D.usdmxn, 2) + '</span>' : '';
    return '<header class="fi-sym">' + '<span aria-hidden="true">' + mark(p.ticker, 36) + '</span>' +
      '<h2 id="fiT">' + esc(p.ticker) + '<span class="fi-nm">' + esc(p.name) + '</span></h2>' +
      '<p class="fi-meta"><span>' + esc(p.cls) + ' · ' + esc(p.ccy) + '</span>' + (p.where && p.where.length ? '<span>En ' + esc(p.where.join(' y ')) + '</span>' : '') + '<span class="fi-tag">' + (window.CAMPO_REAL ? 'Precio al ' + esc(D.asOf) : 'Datos de muestra') + '</span></p></header>' +
      '<div class="fi-px"><b class="num"><span data-roll="price">' + nf(p.price, 2) + '</span><small>' + esc(p.ccy) + '</small></b>' + delta(p.d1, sgn(amt) + F.num(Math.abs(amt), 2) + ' (' + F.pct(p.d1) + ') hoy') + '</div>' +
      '<div id="fiSlot"></div>' +
      '<section aria-labelledby="fiHk"><h3 class="fi-h" id="fiHk">Datos clave</h3><dl class="fi-k num">' +
      keyRow('Cantidad', nf(p.qty, p.qty < 1 ? 2 : 0), '<small>' + esc(p.ticker) + '</small>') +
      keyRow('Costo promedio', nf(p.avg), '<small>' + esc(p.ccy) + '</small>') +
      keyRow('Valor', '<span data-roll="value">' + mxn0(p.value) + '</span>', '<small>' + ((window.CampoTracker && window.CampoTracker.base) || 'MXN') + '</small>') +
      keyRow('Ganancia no realizada', sgn(pl) + mxn0(pl), '<span class="fi-sub">' + F.pct(p.pnlPct, 1) + '</span>', pl >= 0 ? 'gain' : 'loss') +
      keyRow(p.scope ? 'Peso en ' + esc(p.scope) : 'Peso', F.num(p.weight, 1), '<small>%</small>') +
      keyRow('Divisa', esc(p.ccy), fx) + '</dl></section>' +
      (window.CAMPO_REAL && !news.length ? '' : '<section aria-labelledby="fiNw"><h3 class="fi-h" id="fiNw">Noticias de ' + esc(p.ticker) + '</h3>' +
      (news.length ? '<div class="fi-nw">' + news.map(function (x) {
        return '<article class="fi-n"><div class="fi-n-top">' + stacked([x.ticker], 18) + '<span>' + [esc(x.kind), ago(x.mins), esc(x.source)].filter(Boolean).join(' · ') + '</span></div><p>' + esc(x.title) + '</p></article>';
      }).join('') + '</div>' : '<p class="fi-none">No hay noticias para ' + esc(p.ticker) + '.</p>') + '</section>') +
      '<div class="fi-act">' +
      (window.CampoTxSheet && window.CampoTracker ? '<button type="button" class="btn btn-primary" data-tx="buy" data-tk="' + esc(p.ticker) + '">Registrar compra</button>' +
        (pfHolding(p.ticker).length ? '<button type="button" class="btn btn-secondary" data-tx="sell" data-tk="' + esc(p.ticker) + '">Registrar venta</button>' : '') : '') +
      (REAL ? '' : '<button type="button" class="btn btn-secondary" data-act="Crear alerta para ' + esc(p.ticker) + '">Crear alerta</button>') +
      '<button type="button" class="btn btn-secondary" data-mk="' + esc(p.ticker) + '">Ver en Mercados</button></div>';
  }
  function setCount() { var i = st.order.indexOf(st.ticker); fiCnt.innerHTML = '<b>' + (i + 1) + '</b> de ' + st.order.length + '<span class="only-hover"> · ← → cambian de posición</span>'; }
  function rowFor(t) {
    var rs_ = $$('#hub [data-ticker]').filter(function (r) { return r.dataset.ticker === t; });
    return rs_.filter(function (r) { return /(^|\s)w1-/.test(r.className) || r.closest('[class*="w1-"]'); })[0] || rs_[0] || null;
  }
  function markRow() {
    $$('#hub .fi-row').forEach(function (r) { r.classList.remove('fi-row'); });
    var row = rowFor(st.ticker); if (row) row.classList.add('fi-row');
  }
  function render(animRoll) {
    var p = curP(); if (!p) return;
    var pv = st.pv; st.pv = { price: p.price, value: p.value };
    fiC.innerHTML = html(p); $('#fiSlot', fiC).replaceWith(cs);
    setCount();
    $$('[data-tx]', fiC).forEach(function (b) { b.addEventListener('click', function () { window.CampoTxSheet.open({ pfId: txPf(b.dataset.tk, b.dataset.tx), type: b.dataset.tx, ticker: b.dataset.tk, from: b }); }); });
    $$('[data-act]', fiC).forEach(function (b) { b.addEventListener('click', function () { toast(b.dataset.act + PENDING); }); });
    $$('[data-mk]', fiC).forEach(function (b) { b.addEventListener('click', function () { var s = b.dataset.mk; close({ noFocus: true }); openMk(s); }); });
    $('.fi-scroll', fi).scrollTop = 0; markRow();
    if (animRoll && pv) {
      roll($('[data-roll="price"]', fiC), pv.price, p.price, function (v) { return nf(v, 2); });
      roll($('[data-roll="value"]', fiC), pv.value, p.value, function (v) { return mxn0(v); });
    }
  }
  /* cambio de posición con la ficha abierta: la gráfica se transforma; el texto hace un fundido vertical corto */
  function fade(els, dir, out) {
    els.forEach(function (e) {
      var mv = e.classList.contains('fi-sym') || e.classList.contains('fi-px'), y = 8 * dir;
      e.animate(out ? [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: mv ? 'translateY(' + (-y) + 'px)' : 'none' }]
        : [{ opacity: 0, transform: mv ? 'translateY(' + y + 'px)' : 'none' }, { opacity: 1, transform: 'none' }],
        { duration: out ? 90 : 110, easing: out ? 'ease-in' : 'cubic-bezier(0.23,1,0.32,1)', fill: out ? 'forwards' : 'none' });
    });
  }
  function others() { return Array.prototype.filter.call(fiC.children, function (e) { return e !== cs; }); }
  function goTo(ticker, dir) {
    st.ticker = ticker; st.dir = dir; setCount(); markRow(); setScene('pos');
    if (reduce() || !fiC.animate) { render(false); return; }
    if (st.swapT) return;
    fade(others(), dir, true);
    st.swapT = setTimeout(function () { st.swapT = 0; render(true); fade(others(), st.dir, false); }, 90);
  }
  function nav(dir) {
    if (!st.open || st.order.length < 2) return;
    goTo(st.order[(st.order.indexOf(st.ticker) + dir + st.order.length) % st.order.length], dir);
  }
  function tableOrder() {
    var rows = rowsOf(ctxPf()); if (rows && rows.length) return rows.map(function (r) { return r.ticker; });
    return D.positions.map(function (p) { return p.ticker; });
  }
  function open(ticker, trigger) {
    if (!inApp() || !byTicker(ticker)) return;
    build();
    if (st.open) {
      if (st.ticker !== ticker) { if (st.order.indexOf(ticker) < 0) st.order = tableOrder(); goTo(ticker, st.order.indexOf(ticker) >= st.order.indexOf(st.ticker) ? 1 : -1); }
      return;
    }
    st.open = true; st.ticker = ticker; st.order = tableOrder(); st.pv = null;
    st.trigger = trigger || document.activeElement;
    if (st.order.indexOf(ticker) < 0) st.order.push(ticker);
    render(false);
    viewApp.inert = true; document.body.classList.add('fi-open'); root.classList.add('fi-lock');
    back.classList.add('on'); fi.classList.add('on');
    fi.focus({ preventScroll: true });
    setScene('init'); introAfterSlide();
  }
  if (window.CampoTracker && window.CampoTracker.on) window.CampoTracker.on('change', function () {
    rcache = {}; if (!st.open) return;
    if (!curP()) { close(); return; }
    st.order = tableOrder(); if (st.order.indexOf(st.ticker) < 0) st.order.push(st.ticker); render(true);
  });
  function close(opts) {
    if (!st.open) return; st.open = false;
    stopLoop(); tr = null; intro = null; clearTimeout(st.swapT); st.swapT = 0;
    fi.classList.remove('on'); back.classList.remove('on'); fi.style.transform = ''; fi.style.transition = ''; back.style.opacity = '';
    viewApp.inert = false; document.body.classList.remove('fi-open'); root.classList.remove('fi-lock');
    $$('#hub .fi-row').forEach(function (r) { r.classList.remove('fi-row'); });
    if (opts && opts.noFocus) return;
    var t = st.trigger; if (!t || !t.isConnected || t === document.body || !viewApp.contains(t)) t = rowFor(st.ticker) || pkBtn;
    if (t && t.focus) t.focus({ preventScroll: true });
  }
  /* bottom sheet: arrastrar el asa o la barra; cierra por distancia o velocidad */
  function initDrag() {
    var d = null;
    fi.addEventListener('pointerdown', function (e) {
      if (!mob.matches || !e.target.closest('[data-grab]') || e.target.closest('button')) return;
      d = { y: e.clientY, dy: 0, s: [[e.timeStamp, e.clientY]], id: e.pointerId };
      try { fi.setPointerCapture(e.pointerId); } catch (x) { }
      fi.style.transition = 'none';
    });
    fi.addEventListener('pointermove', function (e) {
      if (!d || e.pointerId !== d.id) return;
      var dy = e.clientY - d.y; d.dy = dy < 0 ? dy * 0.12 : dy;
      d.s.push([e.timeStamp, e.clientY]); if (d.s.length > 6) d.s.shift();
      fi.style.transform = 'translateY(' + d.dy + 'px)';
      back.style.opacity = String(clamp(1 - d.dy / fi.offsetHeight, 0.2, 1));
    });
    function end(e) {
      if (!d || e.pointerId !== d.id) return;
      var a = d.s[0], b = d.s[d.s.length - 1], v = b[0] > a[0] ? (b[1] - a[1]) / (b[0] - a[0]) : 0, dy = d.dy; d = null;
      fi.style.transition = ''; back.style.opacity = '';
      if (dy > fi.offsetHeight * 0.3 || v > 0.55) { close(); } else { fi.style.transform = ''; }
    }
    fi.addEventListener('pointerup', end); fi.addEventListener('pointercancel', end);
  }

  /* ================= BÚSQUEDA ================= */
  /* portafolio "actual": el abierto en el Tracker o, si no hay, el primero */
  function curPf() { var T = window.CampoTracker; if (!T || !T.portfolios.length) return null; return (T.route && T.get(T.route)) || T.portfolios[0]; }
  function topTk() { var b = null; D.positions.forEach(function (p) { if (!b || p.weight > b.weight) b = p; }); return b ? b.ticker : ''; }
  function scrollNews() { /* el panel de noticias de Mercados aparece cuando llega la respuesta */
    var n = 0; (function w() { var el = $('#mkNews'); if (el && !el.hidden && el.offsetParent) { el.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' }); return; } if (++n < 12) setTimeout(w, 350); })();
  }
  var ACTIONS = [
    { id: 'home', label: 'Ir a Inicio', kw: 'inicio resumen portafolio', keys: ['R'], run: function () { var S = window.CampoSections; if (S && S.current() !== 'inicio') S.show('inicio'); else window.scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' }); } },
    { id: 'theme', label: function () { return 'Cambiar a tema ' + (root.dataset.theme === 'light' ? 'oscuro' : 'claro'); }, kw: 'tema claro oscuro dark light apariencia', keys: ['T'], run: function () { var C = window.__campo; if (C && C.setTheme) C.setTheme(root.dataset.theme === 'light' ? 'dark' : 'light'); } },
    { id: 'mc', label: 'Abrir Monte Carlo', kw: 'simulacion proyeccion futuro montecarlo', keys: ['M'], run: function () { var p = curPf(); if (p) goSec('tracker', '#tracker/' + encodeURIComponent(p.id) + '/montecarlo'); else toast('Crea un portafolio para ver su Monte Carlo'); } },
    { id: 'news', label: function () { var t = topTk(); return t ? 'Ver noticias de ' + t : 'Ver noticias'; }, kw: 'noticias titulares', keys: ['N'], run: function () { var t = topTk(); if (t) { openMk(t); scrollNews(); } else goSec('mercados'); } },
    { id: 'new', label: 'Crear portafolio', kw: 'nuevo agregar portafolio', keys: [], run: function () { var T = window.CampoTracker; if (T) T.emit('create'); } },
    { id: 'out', label: 'Cerrar sesión', kw: 'salir logout', keys: [], run: function () { $('#logout').click(); } }
  ];
  /* secciones y pestañas a las que se salta con la búsqueda */
  var SECS = [['inicio', 'Inicio', 'resumen hub', ''], ['tracker', 'Portafolios', 'tracker posiciones', '#tracker'], ['mercados', 'Mercados', 'cotizaciones indices divisas', '#mercados'], ['informes', 'Informes', 'reportes pdf', '#informes'],
    ['ajustes', 'Ajustes', 'cuenta perfil', '#ajustes'], ['ajustes', 'Plan y facturación', 'plan suscripcion pago limites', '#ajustes/plan'], ['ajustes', 'Seguridad', 'contrasena 2fa verificacion', '#ajustes/seguridad'],
    ['ajustes', 'Preferencias', 'tema apariencia moneda', '#ajustes/preferencias']];
  var PTABS = [['desempeno', 'Desempeño', 'rendimiento retorno'], ['correlacion', 'Correlación', ''], ['rebalanceo', 'Rebalanceo', 'pesos objetivo'], ['montecarlo', 'Monte Carlo', 'simulacion proyeccion'], ['metas', 'Metas', 'objetivos'], ['whatif', 'Escenarios', 'escenarios'], ['transacciones', 'Transacciones', 'movimientos compras ventas'], ['dividendos', 'Dividendos', 'ingresos']];
  function navItems() {
    var out = SECS.map(function (x) { return { sec: x[0], label: x[1], kw: x[2], hash: x[3], kind: 'Sección' }; }), p = curPf();
    if (p) PTABS.forEach(function (t) { out.push({ sec: 'tracker', label: t[1] + ' · ' + p.name, kw: t[2], hash: '#tracker/' + encodeURIComponent(p.id) + '/' + t[0], kind: 'Pestaña' }); });
    return out;
  }
  function alabel(a) { return typeof a.label === 'function' ? a.label() : a.label; }
  function mkind(s) { return /USD\/|\/MXN|MXN/.test(s) ? 'Divisa' : /Bitcoin|BTC/.test(s) ? 'Cripto' : /Oro/.test(s) ? 'Materia prima' : /Bono/.test(s) ? 'Bono' : 'Índice'; }
  function norm(s) { return String(s).split('').map(function (c) { return c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().charAt(0) || c; }).join(''); }
  function hl(text, q) {
    if (!q) return esc(text); var i = norm(text).indexOf(q); if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }
  var pk, pkIn, pkList, pkHl, pkLive, pkBtn, pkOpen = false, pkItems = [], pkSel = 0, pkPrev = null;
  function score(q, fields) {
    var best = 0; fields.forEach(function (f, i) { var n = norm(f), k = n.indexOf(q); if (k < 0) return; var s = (i === 0 ? 100 : 40) - k + (k === 0 ? 30 : 0); if (s > best) best = s; });
    return best;
  }
  function groups(q) {
    q = norm(q.trim());
    var pos = D.positions.map(function (p) { return { t: 'pos', p: p, s: q ? score(q, [p.ticker, p.name, p.cls]) : 1 }; });
    var mk = D.markets.map(function (m) { return { t: 'mkt', m: m, s: q ? score(q, [m.sym, mkind(m.sym)]) : 1 }; });
    var ac = ACTIONS.map(function (a) { return { t: 'act', a: a, s: q ? score(q, [alabel(a), a.kw]) : 1 }; });
    var T = window.CampoTracker;
    var pfs = (T ? T.portfolios : []).map(function (p) { return { t: 'pf', p: p, s: q ? score(q, [p.name, 'portafolio']) : 1 }; });
    var nv = navItems().map(function (n) { return { t: 'nav', n: n, s: q ? score(q, [n.label, n.kw]) : 1 }; });
    var held = {}; D.positions.forEach(function (p) { held[p.ticker] = 1; });
    var rm = (rem.q === q ? rem.items : []).filter(function (r) { return !held[r.ticker]; }).map(function (r) { return { t: 'rem', r: r, s: 1 }; });
    var cmp = function (x, y) { return y.s - x.s; };
    var pick = function (l) { return l.filter(function (x) { return x.s > 0; }).sort(q ? cmp : function () { return 0; }); };
    if (!q) {
      var top3 = D.positions.slice().sort(function (a, b) { return b.weight - a.weight; }).slice(0, 3).map(function (p) { return { t: 'pos', p: p }; });
      var m2 = D.markets.filter(function (m) { return /S&P 500|USD\/MXN/.test(m.sym); }).map(function (m) { return { t: 'mkt', m: m }; });
      return [{ title: 'Populares', items: top3.concat(m2) }, { title: 'Acciones', items: ACTIONS.map(function (a) { return { t: 'act', a: a }; }) }];
    }
    return [{ title: 'Tus posiciones', items: pick(pos) }, { title: 'Portafolios', items: pick(pfs) }, { title: 'Mercados', items: pick(mk) }, { title: 'Instrumentos', items: rm },
      { title: 'Ir a', items: pick(nv).slice(0, 6) }, { title: 'Acciones', items: pick(ac) }].filter(function (g) { return g.items.length; });
  }
  function itemKey(it) { return it.t + ':' + (it.p ? (it.p.ticker || it.p.id) : it.m ? it.m.sym : it.a ? it.a.id : it.n ? it.n.hash + it.n.label : it.r ? it.r.ticker : ''); }
  /* instrumentos del buscador de Mercados (/api/search): llegan después de teclear y se suman a la lista sin mover la selección */
  var rem = { q: '', items: [] }, remT = 0, remSeq = 0;
  function remoteQuery() {
    clearTimeout(remT); var raw = pkIn.value.trim(), q = norm(raw), RW = window.CAMPO_REAL && window.CAMPO_REAL.write;
    if (!RW || !RW.search || q.length < 2) { remSeq++; rem = { q: '', items: [] }; return; }
    remT = setTimeout(function () {
      var my = ++remSeq;
      RW.search(raw).then(function (items) {
        if (my !== remSeq || !pkOpen || norm(pkIn.value.trim()) !== q) return;
        var cur = pkItems[pkSel]; rem = { q: q, items: (items || []).slice(0, 6) }; pkRender(cur && itemKey(cur));
      }, function () { });
    }, 260);
  }
  function ks(keys) { return keys.length ? '<span class="pk-ks">' + keys.map(function (k) { return '<kbd>' + k + '</kbd>'; }).join('') + '</span>' : ''; }
  function row(it, q, idx) {
    var inner, id = 'pk-o' + idx;
    if (it.t === 'pos') {
      var p = it.p;
      inner = '<span class="pk-mk">' + mark(p.ticker, 18) + '</span><span class="pk-tx"><b class="pk-tk">' + hl(p.ticker, q) + '</b><span class="pk-nm">' + hl(p.name, q) + '</span></span><span class="pk-ch">' + esc(p.cls) + '</span>' +
        '<span class="pk-rt"><span>' + nf(p.price) + '</span>' + delta(p.d1, F.pct(p.d1)) + '</span>';
    } else if (it.t === 'mkt') {
      var m = it.m;
      inner = '<span class="pk-mk">' + mark(m.sym, 18) + '</span><span class="pk-tx"><b class="pk-tk">' + hl(m.sym, q) + '</b></span><span class="pk-ch">' + mkind(m.sym) + '</span>' +
        '<span class="pk-rt"><span>' + nf(m.last, numDec(m.last)) + (m.unit ? ' ' + m.unit : '') + '</span>' + delta(m.chg, F.pct(m.chg)) + '</span>';
    } else if (it.t === 'pf') {
      inner = '<span class="pk-mk">' + ICON.act + '</span><span class="pk-tx"><b class="pk-tk" style="font-weight:500">' + hl(it.p.name, q) + '</b></span><span class="pk-ch">Portafolio</span>';
    } else if (it.t === 'nav') {
      inner = '<span class="pk-mk">' + ICON.act + '</span><span class="pk-tx"><b class="pk-tk" style="font-weight:500">' + hl(it.n.label, q) + '</b></span><span class="pk-ch">' + it.n.kind + '</span>';
    } else if (it.t === 'rem') {
      var r = it.r;
      inner = '<span class="pk-mk">' + mark(r.ticker, 18) + '</span><span class="pk-tx"><b class="pk-tk">' + hl(r.ticker, q) + '</b><span class="pk-nm">' + hl(r.name || '', q) + '</span></span><span class="pk-ch">' + esc(r.cls || '') + '</span>';
    } else {
      inner = '<span class="pk-mk">' + ICON.act + '</span><span class="pk-tx"><b class="pk-tk" style="font-weight:500">' + hl(alabel(it.a), q) + '</b></span>' + ks(it.a.keys);
    }
    return '<div class="pk-it" role="option" id="' + id + '" data-i="' + idx + '" aria-selected="false">' + inner + '</div>';
  }
  function pkRender(keepKey) {
    var qraw = pkIn.value, q = norm(qraw.trim()), gs = groups(qraw), idx = 0, h = '';
    pkItems = [];
    gs.forEach(function (g, gi) {
      h += '<div role="group" aria-labelledby="pk-g' + gi + '"><div class="pk-gh" id="pk-g' + gi + '">' + g.title + '</div>';
      g.items.forEach(function (it) { pkItems.push(it); h += row(it, q, idx++); });
      h += '</div>';
    });
    if (!pkItems.length) h = '<div class="pk-empty">Sin resultados para «' + esc(qraw.trim()) + '». Prueba con un ticker o con el nombre de una acción.</div>';
    pkList.innerHTML = h + '<div class="pk-hl nt" aria-hidden="true"></div>'; pkHl = $('.pk-hl', pkList);
    pkLive.textContent = pkItems.length ? pkItems.length + (pkItems.length === 1 ? ' resultado' : ' resultados') : 'Sin resultados';
    var at = 0; if (keepKey) pkItems.some(function (it, i) { if (itemKey(it) === keepKey) { at = i; return true; } return false; });
    pkSet(at, true);
  }
  function pkSet(i, instant) {
    if (!pkItems.length) { pkHl.style.display = 'none'; pkIn.removeAttribute('aria-activedescendant'); return; }
    pkSel = (i + pkItems.length) % pkItems.length;
    $$('.pk-it', pkList).forEach(function (e, k) { e.setAttribute('aria-selected', k === pkSel); });
    var el = $('#pk-o' + pkSel, pkList); pkIn.setAttribute('aria-activedescendant', 'pk-o' + pkSel);
    pkHl.style.display = '';
    if (instant) pkHl.classList.add('nt');
    pkHl.style.height = el.offsetHeight + 'px'; pkHl.style.transform = 'translateY(' + el.offsetTop + 'px)';
    if (instant) { void pkHl.offsetWidth; pkHl.classList.remove('nt'); }
    el.scrollIntoView({ block: 'nearest' });
  }
  function pkRun(i) {
    var it = pkItems[i]; if (!it) return;
    var prev = pkPrev; pkClose(it.t !== 'act');
    if (it.t === 'pos') open(it.p.ticker, prev);
    else if (it.t === 'mkt') openMk(it.m.y);
    else if (it.t === 'rem') openMk(it.r.ticker);
    else if (it.t === 'pf') goSec('tracker', '#tracker/' + encodeURIComponent(it.p.id));
    else if (it.t === 'nav') goSec(it.n.sec, it.n.hash);
    else it.a.run();
  }
  function pkBuild() {
    if (pk) return;
    var wrap = document.createElement('div'); wrap.className = 'pk-wrap';
    wrap.innerHTML = '<div class="pk" role="dialog" aria-modal="true" aria-label="Buscar en Portify">' +
      '<div class="pk-top">' + ICON.search + '<input class="pk-in" type="text" role="combobox" aria-expanded="true" aria-controls="pkList" aria-autocomplete="list" aria-label="Buscar posiciones, mercados y acciones" placeholder="Buscar posiciones, mercados y acciones" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go"><kbd>Esc</kbd></div>' +
      '<div class="pk-list" id="pkList" role="listbox" aria-label="Resultados"></div>' +
      '<div class="pk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> moverse</span><span><kbd>↵</kbd> abrir</span><span><kbd>Esc</kbd> cerrar</span></div>' +
      '<div class="sr" role="status" aria-live="polite" id="pkLive"></div></div>';
    document.body.appendChild(wrap); pk = wrap;
    pkIn = $('.pk-in', wrap); pkList = $('#pkList', wrap); pkLive = $('#pkLive', wrap);
    wrap.addEventListener('pointerdown', function (e) { if (e.target === wrap) pkClose(); });
    pkIn.addEventListener('input', function () { pkRender(); remoteQuery(); });
    pkIn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); pkSet(pkSel + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); pkSet(pkSel - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); pkRun(pkSel); }
      else if (e.key === 'Tab') e.preventDefault();
    });
    var lastX = -1, lastY = -1;
    pkList.addEventListener('pointermove', function (e) {
      if (e.clientX === lastX && e.clientY === lastY) return; lastX = e.clientX; lastY = e.clientY;
      var it = e.target.closest('.pk-it'); if (it && +it.dataset.i !== pkSel) pkSet(+it.dataset.i);
    });
    pkList.addEventListener('click', function (e) { var it = e.target.closest('.pk-it'); if (it) pkRun(+it.dataset.i); });
    pkList.addEventListener('mousedown', function (e) { e.preventDefault(); });
  }
  function pkOpenFn() {
    if (!inApp() || pkOpen) return;
    closeMenu(true); pkBuild(); pkOpen = true; pkPrev = document.activeElement;
    pkIn.value = ''; rem = { q: '', items: [] }; remSeq++; pkRender();
    var dlg = $('.pk', pk), br = pkBtn && pkBtn.getBoundingClientRect(), ox = '50%', oy = '0px';
    if (br && br.width) { ox = (br.left + br.width / 2 - dlg.offsetLeft) + 'px'; oy = (br.top + br.height / 2 - dlg.offsetTop) + 'px'; }
    dlg.style.transformOrigin = ox + ' ' + oy;
    void dlg.offsetWidth; pk.classList.add('on'); pkIn.focus({ preventScroll: true });
    requestAnimationFrame(function () { pkSet(pkSel, true); });
  }
  function pkClose(skipFocus) {
    if (!pkOpen) return; pkOpen = false; pk.classList.remove('on');
    if (!skipFocus && pkPrev && pkPrev.isConnected && pkPrev.focus) pkPrev.focus({ preventScroll: true });
  }
  function injectBtn() {
    var head = $('.app-head'); if (!head || pkBtn) return;
    pkBtn = document.createElement('button'); pkBtn.type = 'button'; pkBtn.className = 'pk-btn'; pkBtn.setAttribute('aria-label', 'Buscar (' + MOD + ' K)'); pkBtn.setAttribute('aria-keyshortcuts', 'Control+K Meta+K');
    pkBtn.innerHTML = ICON.search + '<span class="pk-lbl">Buscar</span><kbd>' + MOD + ' K</kbd>';
    pkBtn.addEventListener('click', pkOpenFn); head.appendChild(pkBtn);
  }

  /* ================= MENÚ CONTEXTUAL ================= */
  var cm, cmOn = false, cmRow = null, cmKbd = false;
  function menuItems(t) {
    var its = [{ l: 'Ver ficha de ' + t, k: '↵', run: function () { open(t, cmRow); } },
    { l: 'Ver ' + t + ' en Mercados', k: 'M', run: function () { openMk(t); } }];
    if (!REAL) its.push({ l: 'Crear alerta para ' + t, k: 'A', run: function () { toast('Crear alerta para ' + t + PENDING); } });
    its.push({ l: 'Copiar ticker', k: 'C', run: function () { copyText(t); toast(t + ' copiado'); } });
    return its;
  }
  function openMenu(t, x, y, row, kbd) {
    if (!inApp() || !byTicker(t)) return;
    closeMenu(true); pkClose(true);
    if (!cm) {
      cm = document.createElement('div'); cm.className = 'rmenu'; cm.setAttribute('role', 'menu'); cm.tabIndex = -1; document.body.appendChild(cm);
      cm.addEventListener('click', function (e) { var b = e.target.closest('.rm-it'); if (b) { var f = cm._items[+b.dataset.i]; closeMenu(true); f.run(); } });
      cm.addEventListener('keydown', function (e) {
        var its = $$('.rm-it', cm), i = its.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); its[(i + 1) % its.length].focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); its[(i - 1 + its.length) % its.length].focus(); }
        else if (e.key === 'Home') { e.preventDefault(); its[0].focus(); }
        else if (e.key === 'End') { e.preventDefault(); its[its.length - 1].focus(); }
        else if (e.key === 'Tab') { e.preventDefault(); }
        else { var k = e.key.toUpperCase(); if (!e.ctrlKey && !e.metaKey && !e.altKey) cm._items.forEach(function (it, n) { if (it.k === k) { e.preventDefault(); closeMenu(true); it.run(); } }); }
      });
      cm.addEventListener('mouseover', function (e) { var b = e.target.closest('.rm-it'); if (b && document.activeElement !== b) b.focus({ preventScroll: true }); });
    }
    cm._items = menuItems(t); cmRow = row; cmKbd = !!kbd;
    cm.setAttribute('aria-label', 'Acciones de ' + t);
    cm.innerHTML = cm._items.map(function (it, i) { return '<button type="button" role="menuitem" class="rm-it" data-i="' + i + '" tabindex="-1"><span>' + esc(it.l) + '</span><kbd>' + it.k + '</kbd></button>'; }).join('');
    cm.style.left = '0px'; cm.style.top = '0px';
    var w = cm.offsetWidth, h = cm.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    var left = x + w + 8 > vw ? Math.max(8, x - w) : x, top = y + h + 8 > vh ? Math.max(8, y - h) : y;
    cm.style.left = left + 'px'; cm.style.top = top + 'px'; cm.style.transformOrigin = (x - left) + 'px ' + (y - top) + 'px';
    if (row) row.classList.add('rm-on');
    cmOn = true; void cm.offsetWidth; cm.classList.add('on');
    if (kbd) $('.rm-it', cm).focus({ preventScroll: true }); else cm.focus({ preventScroll: true });
  }
  function closeMenu(skipFocus) {
    if (!cmOn) return; cmOn = false; cm.classList.remove('on');
    if (cmRow) { cmRow.classList.remove('rm-on'); if (!skipFocus && cmRow.isConnected) cmRow.focus({ preventScroll: true }); }
    cmRow = null;
  }
  document.addEventListener('pointerdown', function (e) { if (cmOn && !e.target.closest('.rmenu')) closeMenu(true); }, true);
  window.addEventListener('blur', function () { closeMenu(true); });
  window.addEventListener('resize', function () { closeMenu(true); });
  window.addEventListener('scroll', function () { closeMenu(true); }, true);

  /* ================= tabla: abrir ficha, menú, pulsación larga ================= */
  var HUBSEL = '#hub [data-ticker], #hub [data-t]';
  function rowOf(e) { var r = e.target.closest && e.target.closest(HUBSEL); return r && byTicker(tickerOf(r)) ? r : null; }
  function tickerOf(r) { return r.dataset.ticker || r.dataset.t || ''; }
  var swallow = false, lpT = 0, lpX = 0, lpY = 0;
  document.addEventListener('click', function (e) {
    var r = rowOf(e); if (!r) return;
    if (swallow) { e.preventDefault(); e.stopPropagation(); return; }
    open(tickerOf(r), r);
  }, true);
  document.addEventListener('keydown', function (e) {
    var r = e.target; if (!r.matches || !r.matches(HUBSEL) || !byTicker(tickerOf(r)) || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = tickerOf(r), k = e.key;
    if ((k === 'a' || k === 'A') && !REAL) { toast('Crear alerta para ' + t + PENDING); }
    else if (k === 'c' || k === 'C') { copyText(t); toast(t + ' copiado'); }
    else if (k === 'ContextMenu' || (k === 'F10' && e.shiftKey)) { e.preventDefault(); var b = r.getBoundingClientRect(); openMenu(t, b.left + 48, b.top + b.height * 0.7, r, true); }
  });
  document.addEventListener('contextmenu', function (e) {
    var r = rowOf(e); if (!r) return; e.preventDefault(); if (cmOn) return;
    var kbd = e.clientX === 0 && e.clientY === 0, b = r.getBoundingClientRect();
    openMenu(tickerOf(r), kbd ? b.left + 48 : e.clientX, kbd ? b.top + b.height * 0.7 : e.clientY, r, kbd);
  });
  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') return; var r = rowOf(e); if (!r) return;
    lpX = e.clientX; lpY = e.clientY; clearTimeout(lpT);
    lpT = setTimeout(function () { swallow = true; setTimeout(function () { swallow = false; }, 700); openMenu(tickerOf(r), lpX, lpY, r, false); }, 450);
  });
  document.addEventListener('pointermove', function (e) { if (lpT && Math.hypot(e.clientX - lpX, e.clientY - lpY) > 10) { clearTimeout(lpT); lpT = 0; } });
  ['pointerup', 'pointercancel'].forEach(function (n) { document.addEventListener(n, function () { clearTimeout(lpT); lpT = 0; }); });
  document.addEventListener('campo:open-position', function (e) { var t = e.detail && e.detail.ticker; if (t && !swallow && !cmOn) open(t, document.activeElement); });

  /* ================= teclado global ================= */
  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (k === 'k' || k === 'K')) {
      if (!inApp()) return; e.preventDefault(); if (pkOpen) pkClose(); else pkOpenFn(); return;
    }
    if (k === 'Escape') {
      if (cmOn) { e.preventDefault(); closeMenu(false); }
      else if (pkOpen) { e.preventDefault(); pkClose(); }
      else if (st.open) { e.preventDefault(); close(); }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (st.open && !pkOpen && !cmOn && (k === 'ArrowLeft' || k === 'ArrowRight') && !(e.target.closest && e.target.closest('input,textarea,select,[contenteditable]'))) { e.preventDefault(); nav(k === 'ArrowRight' ? 1 : -1); return; }
    if (!inApp() || st.open || pkOpen || cmOn || e.shiftKey) return;
    var tg = e.target; if (tg.closest && tg.closest('input,textarea,select,[contenteditable]')) return;
    var a = ACTIONS.filter(function (x) { return x.keys.indexOf(k.toUpperCase()) >= 0; })[0];
    if (a && k.length === 1) { e.preventDefault(); a.run(); }
  });

  /* al salir de la vista App se cierra todo */
  new MutationObserver(function () { if (!inApp()) { closeMenu(true); pkClose(true); close({ noFocus: true }); } }).observe(document.body, { attributes: true, attributeFilter: ['data-view'] });
  injectBtn();
})();
