/* Campo · Inicio · widgets lote 1: portfolio, chart, watchlist, risk, dividends.
   Contrato: docs/rediseno-gbm-2026-11/14-spec-inicio.md (CampoHub.register). Datos: window.PORTIFY_DEMO (datos reales del usuario).
   Heurística de riesgo replicada de main.js (initHub: renderRiskWidget). */
(function () {
  'use strict';
  var D = window.PORTIFY_DEMO; if (!D) return;
  var doc = document;
  var rmq = matchMedia('(prefers-reduced-motion: reduce)');
  var EASE = [0.23, 1, 0.32, 1];

  /* ================= utilidades ================= */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var n = doc.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { /* aproximación cúbica de cubic-bezier(.23,1,.32,1) por Newton */
    var x1 = EASE[0], y1 = EASE[1], x2 = EASE[2], y2 = EASE[3], u = t, i, cx, bx, ax, x, d;
    cx = 3 * x1; bx = 3 * (x2 - x1) - cx; ax = 1 - cx - bx;
    for (i = 0; i < 6; i++) { x = ((ax * u + bx) * u + cx) * u - t; d = (3 * ax * u + 2 * bx) * u + cx; if (Math.abs(d) < 1e-6) break; u -= x / d; }
    u = clamp(u, 0, 1);
    var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    return ((ay * u + by) * u + cy) * u;
  }
  function sgnCls(v) { return v > 0.0001 ? 'w1-up' : v < -0.0001 ? 'w1-dn' : 'w1-flat'; }
  function arrow(v) { return v > 0.0001 ? '▲' : v < -0.0001 ? '▼' : '•'; }
  function mark(sym, size) {
    if (window.CampoMarks && window.CampoMarks.el) return window.CampoMarks.el(sym, size);
    var s = el('span', 'w1-mk-fb', esc(String(sym).charAt(0))); s.style.width = s.style.height = size + 'px'; return s;
  }
  function markWrap(sym, size) { var w = el('span', 'w1-mk'); w.appendChild(mark(sym, size)); return w; }
  /* dos fotogramas + respaldo por temporizador (la pestaña oculta no avanza rAF) */
  function after(fn) { var done = false; function go() { if (done) return; done = true; fn(); } requestAnimationFrame(function () { requestAnimationFrame(go); }); setTimeout(go, 90); }
  function mxn(v, dec) { return D.fmt.mxn(v, dec); }
  function money(v) { return (v < 0 ? '−' : '') + D.fmt.mxn(Math.abs(v), 0); }
  function signedMoney(v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + D.fmt.mxn(Math.abs(v), 0); }
  function pctNum(v, d) { return D.fmt.num(v, d == null ? 1 : d) + ' %'; }
  function themeVar(node, name) { return getComputedStyle(node).getPropertyValue(name).trim(); }
  function pickPos(t) { for (var i = 0; i < D.positions.length; i++) if (D.positions[i].ticker === t) return D.positions[i]; return null; }
  function pickMkt(s) { for (var i = 0; i < D.markets.length; i++) if (D.markets[i].sym === s) return D.markets[i]; return null; }
  function asOfDay() { return String(D.asOf || '').split(' ')[0]; }
  function strip(host) { while (host.firstChild) host.removeChild(host.firstChild); }
  function fld(label, ctl) { var d = el('label', 'w1-fld'); d.appendChild(el('span', 'w1-fld-l', esc(label))); d.appendChild(ctl); return d; }
  function selectEl(options, value, onchange) {
    var s = el('select', 'w1-sel');
    options.forEach(function (o) { var op = el('option'); op.value = o.v; op.textContent = o.t; if (o.v === value) op.selected = true; s.appendChild(op); });
    s.addEventListener('change', function () { onchange(s.value); });
    return s;
  }
  function checkEl(checked, onchange) { var c = el('input', 'w1-check'); c.type = 'checkbox'; c.checked = !!checked; c.addEventListener('change', function () { onchange(c.checked); }); return c; }
  var MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function parseDate(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  var dfLong = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  var dfShort = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });
  var dfMonth = new Intl.DateTimeFormat('es-MX', { month: 'short', year: '2-digit' });
  function cleanDate(s) { return s.replace(/\./g, ''); }

  /* ================= series reales por símbolo ================= */
  var seriesCache = {};
  function okSeries(a) { if (!a || a.length < 2) return null; var o = Array.prototype.slice.call(a); for (var i = 0; i < o.length; i++) if (!isFinite(o[i]) || o[i] <= 0) return null; return o; }
  function seriesFor(sym) { /* cierres alineados con el final de D.series.dates; solo datos reales, null si no hay */
    if (sym === 'Tu portafolio') return okSeries(D.series && D.series.portfolio);
    if (seriesCache[sym]) return seriesCache[sym];
    var out = null, mk, TK = window.CampoTracker, tp;
    if ((mk = pickMkt(sym))) out = okSeries(mk.hist);
    else if (pickPos(sym) && TK) {
      try { tp = TK.pricePath && TK.pricePath(sym); } catch (e) { tp = null; }
      out = okSeries(tp);
      if (!out) { try { tp = TK.pricePathMxn && TK.pricePathMxn(sym); } catch (e) { tp = null; } out = okSeries(tp); }
    }
    if (out) seriesCache[sym] = out; return out;
  }
  function sparkFor(sym) { var s = seriesFor(sym); return s ? s.slice(s.length - 40) : null; }
  function yearFor(sym) { var s = seriesFor(sym); return s ? (s[s.length - 1] / s[0] - 1) * 100 : null; }

  /* ================= registro con cola ================= */
  var pending = [];
  function reg(type, def) {
    if (window.CampoHub && window.CampoHub.register) { window.CampoHub.register(type, def); return; }
    window.CampoHubQueue = window.CampoHubQueue || [];
    window.CampoHubQueue.push({ type: type, def: def });
    pending.push([type, def]);
  }
  function flush() {
    if (!window.CampoHub || !window.CampoHub.register) return;
    while (pending.length) { var q = pending.shift(); window.CampoHub.register(q[0], q[1]); }
  }
  doc.addEventListener('DOMContentLoaded', flush);

  /* ================= miniaturas ================= */
  function thumbSvg(el0, inner) { el0.innerHTML = '<svg viewBox="0 0 120 72" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block">' + inner + '</svg>'; }

  /* ================= PORTFOLIO ================= */
  var CLS_MAP = { 'Acción EE. UU.': 'Acciones EE. UU.', 'Acción MX': 'México', 'ETF': 'ETF', 'Deuda': 'Deuda', 'Cripto': 'Cripto' };
  var MIX = [58, 40, 28, 19, 13];
  function classes() {
    var m = {}, out = [];
    D.positions.forEach(function (p) { var k = CLS_MAP[p.cls] || p.cls; (m[k] = m[k] || { name: k, value: 0 }).value += p.value; });
    Object.keys(m).forEach(function (k) { out.push(m[k]); });
    out.sort(function (a, b) { return b.value - a.value; });
    var tot = D.total || 1;
    out.forEach(function (c, i) { c.pct = c.value / tot * 100; c.color = i === 0 ? 'var(--accent)' : 'color-mix(in oklch, var(--text) ' + MIX[Math.min(i - 1, MIX.length - 1)] + '%, var(--s1))'; });
    return out;
  }
  var PF_COLS = [
    { k: 'name', t: 'Posición', cls: 'w1-c-n' }, { k: 'value', t: 'Valor', cls: 'w1-c-v' }, { k: 'd1', t: 'Día', cls: 'w1-c-d' },
    { k: 'pnlPct', t: 'P/L', cls: 'w1-c-pl' }, { k: 'weight', t: 'Peso', cls: 'w1-c-w' }
  ];

  function portfolioRender(body, ctx) {
    var root = el('div', 'w1-pf'); body.appendChild(root);
    var sortKey = 'value', sortDir = -1, rowsHost = null, rowMap = {};
    var cls = [];

    function size() { return ctx.size || 'L'; }
    function sorted() {
      var a = D.positions.slice(), k = sortKey, d = sortDir;
      a.sort(function (x, y) { var vx = k === 'name' ? x.ticker : x[k], vy = k === 'name' ? y.ticker : y[k]; return (vx < vy ? -1 : vx > vy ? 1 : 0) * d; });
      return a;
    }
    function rowEl(p) {
      var b = el('button', 'w1-row'); b.type = 'button'; b.dataset.ticker = p.ticker; b.dataset.t = p.ticker;
      b.setAttribute('aria-label', p.ticker + ', ' + p.name + ', ' + money(p.value) + ', día ' + D.fmt.pct(p.d1) + ', abrir ficha');
      var n = el('span', 'w1-c-n w1-who'); n.appendChild(markWrap(p.ticker, 28));
      n.appendChild(el('span', 'w1-nm', '<b>' + esc(p.ticker) + '</b><i>' + esc(p.name) + '</i>'));
      b.appendChild(n);
      b.appendChild(el('span', 'w1-c-v', esc(money(p.value))));
      b.appendChild(el('span', 'w1-c-d ' + sgnCls(p.d1), arrow(p.d1) + ' ' + esc(D.fmt.pct(p.d1))));
      b.appendChild(el('span', 'w1-c-pl ' + sgnCls(p.pnlPct), esc(D.fmt.pct(p.pnlPct, 1))));
      b.appendChild(el('span', 'w1-c-w', '<em>' + esc(pctNum(p.weight)) + '</em><u style="--w:' + clamp(p.weight / 25 * 100, 2, 100).toFixed(1) + '%"></u>'));
      b.addEventListener('click', function () { ctx.openPosition(p.ticker); });
      return b;
    }
    function build() {
      var sz = size(); root.dataset.size = sz; strip(root); rowMap = {}; rowsHost = null;
      if (!D.positions.length || !(D.total > 0)) { root.appendChild(el('p', 'w1-empty', 'Todavía no tienes posiciones.')); return; }
      cls = classes();
      var dc = D.dayChange || 0, dcp = D.dayChangePct || 0; /* el Tracker los sincroniza con efecto cambiario */
      var sum = el('div', 'w1-sum');
      sum.innerHTML = '<div class="w1-tot"><span class="w1-k">Valor total</span><strong>' + esc(money(D.total)) + '</strong></div>' +
        '<div class="w1-dayc ' + sgnCls(dc) + '"><span>' + arrow(dc) + ' ' + esc(signedMoney(dc)) + '</span><span>' + esc(D.fmt.pct(dcp)) + ' hoy</span></div>';
      root.appendChild(sum);
      var bar = el('div', 'w1-bar'); bar.setAttribute('role', 'img');
      bar.setAttribute('aria-label', 'Asignación por clase de activo: ' + cls.map(function (c) { return c.name + ' ' + pctNum(c.pct); }).join(', '));
      cls.forEach(function (c) { var s = el('i'); s.style.flexGrow = c.value.toFixed(0); s.style.background = c.color; s.title = c.name + ' · ' + pctNum(c.pct); bar.appendChild(s); });
      root.appendChild(bar);
      if (sz !== 'S') {
        var leg = el('ul', 'w1-leg');
        cls.forEach(function (c) { leg.appendChild(el('li', '', '<i style="background:' + c.color + '"></i><span>' + esc(c.name) + '</span><b>' + esc(pctNum(c.pct)) + '</b>')); });
        root.appendChild(leg);
        var list = el('div', 'w1-list'); list.setAttribute('role', 'group'); list.setAttribute('aria-label', 'Posiciones');
        var head = el('div', 'w1-head'); head.setAttribute('role', 'row');
        PF_COLS.forEach(function (c) {
          if (sz === 'L') {
            var b = el('button', c.cls, esc(c.t)); b.type = 'button'; b.dataset.k = c.k;
            if (c.k === sortKey) { b.dataset.dir = sortDir < 0 ? '▼' : '▲'; b.setAttribute('aria-sort', sortDir < 0 ? 'descending' : 'ascending'); }
            b.setAttribute('aria-label', 'Ordenar por ' + c.t.toLowerCase());
            b.addEventListener('click', function () {
              if (sortKey === c.k) sortDir = -sortDir; else { sortKey = c.k; sortDir = c.k === 'name' ? 1 : -1; }
              headState(); reorder();
            });
            head.appendChild(b);
          } else head.appendChild(el('span', c.cls, esc(c.t)));
        });
        list.appendChild(head);
        rowsHost = el('div', 'w1-rows'); list.appendChild(rowsHost);
        sorted().forEach(function (p) { var r = rowEl(p); rowMap[p.ticker] = r; rowsHost.appendChild(r); }); /* todas las posiciones: la lista se desplaza dentro del widget */
        root.appendChild(list);
      } else rowsHost = null;
    }
    function headState() {
      root.querySelectorAll('.w1-head button').forEach(function (b) {
        if (b.dataset.k === sortKey) { b.dataset.dir = sortDir < 0 ? '▼' : '▲'; b.setAttribute('aria-sort', sortDir < 0 ? 'descending' : 'ascending'); }
        else { delete b.dataset.dir; b.removeAttribute('aria-sort'); }
      });
    }
    function reorder() {
      if (!rowsHost) return;
      var first = {}, k;
      for (k in rowMap) first[k] = rowMap[k].getBoundingClientRect().top;
      sorted().forEach(function (p) { if (rowMap[p.ticker]) rowsHost.appendChild(rowMap[p.ticker]); });
      if (ctx.reduced()) return;
      for (k in rowMap) {
        var dy = first[k] - rowMap[k].getBoundingClientRect().top;
        if (dy && rowMap[k].animate) rowMap[k].animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(0.77,0,0.175,1)' });
      }
    }
    ctx.setMeta('Precios al ' + asOfDay());
    build();
    return {
      update: function () { build(); },
      resize: function () { if (root.dataset.size !== size()) build(); },
      destroy: function () { if (root.parentNode) root.parentNode.removeChild(root); }
    };
  }
  reg('portfolio', {
    label: 'Resumen de cartera', desc: '¿Cuánto vale tu cartera y cómo se reparte?', group: 'Portafolio',
    icon: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="15" height="12" rx="2.5"/><path d="M2.5 8.5h15M7 12.5h6"/></svg>',
    sizes: ['S', 'M', 'L'], size: 'L', defaults: {},
    thumb: function (e) { thumbSvg(e, '<rect x="8" y="10" width="104" height="9" rx="2" stroke="none" fill="currentColor" opacity=".55"/><rect x="8" y="10" width="40" height="9" rx="2" stroke="none" fill="var(--accent)"/><path d="M8 32h104M8 44h104M8 56h104" opacity=".35"/><path d="M12 32v0M12 44v0" /><circle cx="14" cy="38" r="3" opacity=".5"/><circle cx="14" cy="50" r="3" opacity=".5"/>'); },
    render: portfolioRender
  });

  /* ================= CHART ================= */
  var RANGES = [['1M', 21], ['3M', 63], ['6M', 126], ['1A', 252]];
  var M = 160;
  function chartSyms() { return ['Tu portafolio'].concat(D.positions.map(function (p) { return p.ticker; }), D.markets.map(function (m) { return m.sym; })).filter(function (x) { return x === 'Tu portafolio' || seriesFor(x); }); }
  function benchName() { return (D.series && D.series.benchmarkName) || 'S&P 500'; }
  function hasBench() { var b = D.series && D.series.benchmark; return !!(b && b.length > 1); }
  function resample(a, n) { var out = new Array(n), L = a.length; for (var i = 0; i < n; i++) { var f = i / (n - 1) * (L - 1), i0 = Math.floor(f), i1 = Math.min(L - 1, i0 + 1); out[i] = lerp(a[i0], a[i1], f - i0); } return out; }
  function rebase(a) { var b = a[0]; return a.map(function (v) { return (v / b - 1) * 100; }); }
  function candlesOf(p) {
    var o = [], h = [], l = [], c = [], prev = p[0];
    for (var i = 0; i < p.length; i += 5) {
      var g = p.slice(i, Math.min(p.length, i + 5));
      o.push(prev); c.push(g[g.length - 1]); h.push(Math.max.apply(null, g.concat(prev))); l.push(Math.min.apply(null, g.concat(prev)));
      prev = g[g.length - 1];
    }
    return { k: o.length, o: o, h: h, l: l, c: c };
  }
  function resampleCand(c, k) {
    if (c.k === k) return c;
    var r = { k: k, o: [], h: [], l: [], c: [] };
    ['o', 'h', 'l', 'c'].forEach(function (f) {
      for (var i = 0; i < k; i++) { var q = k === 1 ? 0 : i / (k - 1) * (c.k - 1), i0 = Math.floor(q), i1 = Math.min(c.k - 1, i0 + 1); r[f].push(lerp(c[f][i0], c[f][i1], q - i0)); }
    });
    return r;
  }
  function chartTarget(cfg) {
    var sym = cfg.symbol || 'Tu portafolio', range = cfg.range || '1A', n = 252, i;
    if (sym !== 'Tu portafolio' && !seriesFor(sym)) sym = 'Tu portafolio';
    for (i = 0; i < RANGES.length; i++) if (RANGES[i][0] === range) n = RANGES[i][1];
    var all = seriesFor(sym), dates = D.series.dates, L = all.length;
    n = Math.min(n, L);
    var s = rebase(all.slice(L - n)), dts = dates.slice(dates.length - n);
    var benchOn = cfg.bench !== false && hasBench() && sym !== 'S&P 500' && sym !== benchName();
    var bn = benchOn ? rebase(D.series.benchmark.slice(Math.max(0, D.series.benchmark.length - n))) : null;
    if (bn && bn.length !== s.length) bn = null;
    var cand = candlesOf(s), mode = cfg.mode === 'candle' ? 1 : 0;
    var lo = Infinity, hi = -Infinity;
    function ext(a) { a.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; }); }
    if (mode) { ext(cand.h); ext(cand.l); } else { ext(s); if (bn) ext(bn); }
    lo = Math.min(lo, 0); hi = Math.max(hi, 0);
    var pad = (hi - lo) * 0.08 || 1;
    return { raw: s, rawBench: bn, dates: dts, n: n, line: resample(s, M), bench: bn ? resample(bn, M) : null, benchA: bn ? 1 : 0, cand: cand, m: mode, lo: lo - pad, hi: hi + pad, sym: sym };
  }
  function mixFrame(a, b, p) {
    var f = { dates: b.dates, n: b.n, sym: b.sym, raw: b.raw, rawBench: b.rawBench, cand: null };
    f.line = a.line.map(function (v, i) { return lerp(v, b.line[i], p); });
    var ab = a.bench || a.line, bb = b.bench || b.line;
    f.bench = ab.map(function (v, i) { return lerp(v, bb[i], p); });
    f.benchA = lerp(a.benchA, b.benchA, p);
    f.m = lerp(a.m, b.m, p); f.lo = lerp(a.lo, b.lo, p); f.hi = lerp(a.hi, b.hi, p);
    var ac = resampleCand(a.cand, b.cand.k), c = { k: b.cand.k, o: [], h: [], l: [], c: [] };
    ['o', 'h', 'l', 'c'].forEach(function (k) { for (var i = 0; i < c.k; i++) c[k].push(lerp(ac[k][i], b.cand[k][i], p)); });
    f.cand = c; return f;
  }
  function niceStep(range, ticks) { var raw = range / ticks, mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag; return (r < 1.5 ? 1 : r < 3.5 ? 2 : r < 7.5 ? 5 : 10) * mag; }
  function fmtAxis(v) { var r = Math.round(v * 10) / 10; return (r < 0 ? '−' : r > 0 ? '+' : '') + D.fmt.num(Math.abs(r), Math.abs(r) % 1 ? 1 : 0) + ' %'; }

  function chartRender(body, ctx) {
    var cfg = Object.assign({ symbol: 'Tu portafolio', bench: true, range: '1A', mode: 'line' }, ctx.config || {});
    var root = el('div', 'w1-ch'); body.appendChild(root);
    if (!D.positions.length || !seriesFor('Tu portafolio')) {
      root.appendChild(el('p', 'w1-empty', 'Aún no hay historial para graficar.'));
      ctx.setMeta('Precios al ' + asOfDay());
      return { update: function () {}, resize: function () {}, destroy: function () { if (root.parentNode) root.parentNode.removeChild(root); } };
    }
    var legend = el('div', 'w1-chleg'), wrap = el('div', 'w1-cvwrap'), cv = el('canvas', 'w1-cv'), g = cv.getContext('2d');
    var readout = el('div', 'w1-ro'); readout.setAttribute('aria-live', 'off');
    var tgl = el('button', 'w1-tgl'); tgl.type = 'button';
    wrap.appendChild(cv); wrap.appendChild(readout); wrap.appendChild(tgl);
    root.appendChild(legend); root.appendChild(wrap);
    var sr = el('p', 'w1-sr'); root.appendChild(sr);

    /* control del encabezado */
    var seg = el('div', 'seg w1-seg-sm'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Rango');
    seg.style.setProperty('--n', RANGES.length);
    RANGES.forEach(function (r) { var b = el('button', '', r[0]); b.type = 'button'; b.dataset.r = r[0]; b.addEventListener('click', function () { if (cfg.range !== r[0]) ctx.save({ range: r[0] }); }); seg.appendChild(b); });
    seg.appendChild(el('i', 'seg-pill'));
    if (ctx.head) ctx.head.appendChild(seg);
    function segState() { RANGES.forEach(function (r, i) { var b = seg.children[i]; b.setAttribute('aria-pressed', r[0] === cfg.range ? 'true' : 'false'); if (r[0] === cfg.range) seg.style.setProperty('--i', i); }); }

    var target = chartTarget(cfg), cur = target, W = 0, H = 0, hover = null, raf = 0, timer = 0, anim = null;
    var PAD = { t: 10, r: 48, b: 22, l: 4 };

    function fit() {
      var r = wrap.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(40, r.width); H = Math.max(40, r.height);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function X(f, pw) { return PAD.l + f * pw; }
    function draw() {
      if (!W) return;
      var fr = cur, col = { text: themeVar(cv, '--text'), t3: themeVar(cv, '--text-3'), acc: themeVar(cv, '--accent'), grid: themeVar(cv, '--grid'), gain: themeVar(cv, '--gain'), loss: themeVar(cv, '--loss'), s1: themeVar(cv, '--s1') };
      var pw = W - PAD.l - PAD.r, ph = H - PAD.t - PAD.b;
      function Y(v) { return PAD.t + (1 - (v - fr.lo) / (fr.hi - fr.lo)) * ph; }
      g.clearRect(0, 0, W, H);
      g.font = '11px ' + (themeVar(cv, '--font') || 'sans-serif'); g.textBaseline = 'middle';
      /* rejilla y eje y */
      var step = niceStep(fr.hi - fr.lo, 4), v0 = Math.ceil(fr.lo / step) * step;
      g.lineWidth = 1; g.fillStyle = col.t3; g.textAlign = 'left';
      for (var v = v0; v <= fr.hi + 1e-9; v += step) {
        var y = Math.round(Y(v)) + 0.5;
        g.strokeStyle = col.grid; g.setLineDash(Math.abs(v) < 1e-9 ? [3, 3] : []); g.globalAlpha = Math.abs(v) < 1e-9 ? 1 : 0.9;
        g.beginPath(); g.moveTo(PAD.l, y); g.lineTo(W - PAD.r + 4, y); g.stroke();
        if (Math.abs(v) < 1e-9) { g.strokeStyle = col.t3; g.globalAlpha = 0.45; g.beginPath(); g.moveTo(PAD.l, y); g.lineTo(W - PAD.r + 4, y); g.stroke(); }
        g.globalAlpha = 1; g.setLineDash([]);
        g.fillText(fmtAxis(v), W - PAD.r + 8, y);
      }
      /* eje x */
      var T = target, nt = W < 360 ? 3 : 4; g.textBaseline = 'alphabetic'; g.fillStyle = col.t3;
      for (var i = 0; i < nt; i++) {
        var f = i / (nt - 1), d = parseDate(T.dates[Math.round(f * (T.n - 1))]), txt = cleanDate((T.n > 130 ? dfMonth : dfShort).format(d));
        g.textAlign = i === 0 ? 'left' : i === nt - 1 ? 'right' : 'center';
        g.fillText(txt, X(f, pw) + (i === nt - 1 ? 0 : 0), H - 6);
      }
      /* candelas y línea (fundido por m) */
      var m = fr.m;
      if (m < 0.999) {
        g.globalAlpha = 1 - m; g.lineJoin = 'round'; g.lineCap = 'round';
        if (fr.benchA > 0.01) {
          g.globalAlpha = (1 - m) * fr.benchA; g.strokeStyle = col.t3; g.lineWidth = 1.5; g.beginPath();
          fr.bench.forEach(function (b, i) { var px = X(i / (M - 1), pw); i ? g.lineTo(px, Y(b)) : g.moveTo(px, Y(b)); }); g.stroke();
        }
        g.globalAlpha = 1 - m; g.strokeStyle = col.acc; g.lineWidth = 2; g.beginPath();
        fr.line.forEach(function (b, i) { var px = X(i / (M - 1), pw); i ? g.lineTo(px, Y(b)) : g.moveTo(px, Y(b)); }); g.stroke();
      }
      if (m > 0.001) {
        var C = fr.cand, slot = pw / C.k, bw = clamp(slot * 0.62, 2, 14);
        g.globalAlpha = Math.min(1, m * 1.6); g.lineWidth = 1;
        for (var k = 0; k < C.k; k++) {
          var cx = PAD.l + (k + 0.5) * slot, lineV = fr.line[Math.round((k + 0.5) / C.k * (M - 1))];
          var o = lerp(lineV, C.o[k], m), c = lerp(lineV, C.c[k], m), h = lerp(lineV, C.h[k], m), l = lerp(lineV, C.l[k], m);
          var up = c >= o; g.strokeStyle = g.fillStyle = up ? col.gain : col.loss;
          g.beginPath(); g.moveTo(Math.round(cx) + 0.5, Y(h)); g.lineTo(Math.round(cx) + 0.5, Y(l)); g.stroke();
          var yo = Y(o), yc = Y(c); g.fillRect(cx - bw / 2, Math.min(yo, yc), bw, Math.max(1, Math.abs(yo - yc)));
        }
      }
      g.globalAlpha = 1;
      /* cruz del cursor */
      if (hover != null) {
        var hx = X(hover, pw);
        g.strokeStyle = col.t3; g.globalAlpha = 0.7; g.lineWidth = 1; g.setLineDash([2, 3]);
        g.beginPath(); g.moveTo(Math.round(hx) + 0.5, PAD.t); g.lineTo(Math.round(hx) + 0.5, H - PAD.b); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
        if (m < 0.5) {
          var hi = Math.round(hover * (M - 1));
          [[fr.bench, col.t3, fr.benchA], [fr.line, col.acc, 1]].forEach(function (s) {
            if (s[2] < 0.5) return; g.fillStyle = col.s1; g.strokeStyle = s[1]; g.lineWidth = 2;
            g.beginPath(); g.arc(hx, Y(s[0][hi]), 3.5, 0, 6.2832); g.fill(); g.stroke();
          });
        }
      }
    }
    function legendHtml() {
      var T = target, own = T.sym === 'Tu portafolio';
      var h = '<span class="w1-lg"><i class="w1-lg-a"></i>' + esc(T.sym) + '</span>';
      if (T.rawBench) h += '<span class="w1-lg"><i class="w1-lg-b"></i>' + esc(benchName()) + '</span>';
      h += '<span class="w1-lg-n">Rebasado a 0 %</span>';
      legend.innerHTML = h;
      ctx.setMeta('Precios al ' + asOfDay());
      sr.textContent = 'Gráfica de ' + T.sym + ', rango ' + cfg.range + ', ' + (cfg.mode === 'candle' ? 'velas semanales' : 'línea') + '. Variación en el periodo ' + D.fmt.pct(T.raw[T.raw.length - 1]) + '.';
    }
    function tglState() {
      var c = cfg.mode === 'candle';
      tgl.setAttribute('aria-pressed', c ? 'true' : 'false');
      tgl.setAttribute('aria-label', c ? 'Cambiar a línea' : 'Cambiar a velas'); tgl.title = c ? 'Ver como línea' : 'Ver como velas';
      tgl.innerHTML = c ? '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 14l4.5-5 3.5 3L17.5 5"/></svg>'
        : '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 3v3M6 14v3M14 6v3M14 16v2M6 6h0M4.5 6h3v8h-3zM12.5 9h3v7h-3z"/></svg>';
    }
    tgl.addEventListener('click', function () { ctx.save({ mode: cfg.mode === 'candle' ? 'line' : 'candle' }); });

    function stop() { if (raf) cancelAnimationFrame(raf); clearTimeout(timer); raf = 0; }
    function go(to) {
      stop();
      var from = cur; target = to;
      if (ctx.reduced()) { cur = to; draw(); return; }
      var t0 = performance.now(), DUR = 360;
      function step() { var p = clamp((performance.now() - t0) / DUR, 0, 1); cur = mixFrame(from, to, ease(p)); draw(); if (p < 1) { raf = requestAnimationFrame(step); } }
      raf = requestAnimationFrame(step);
      timer = setTimeout(function () { if (raf) cancelAnimationFrame(raf); raf = 0; cur = to; draw(); }, DUR + 60);
    }
    function showRo(f) {
      if (f == null) { readout.innerHTML = '<span class="w1-ro-h">Pasa el cursor para ver valores</span>'; return; }
      var T = target, idx = Math.round(f * (T.n - 1)), d = cleanDate(dfLong.format(parseDate(T.dates[idx]))), h;
      if (T.m) {
        var k = clamp(Math.floor(f * T.cand.k), 0, T.cand.k - 1), C = T.cand;
        h = '<span class="w1-ro-d">' + esc(d) + '</span><span>A ' + esc(fmtAxis(C.o[k])) + '</span><span>Máx ' + esc(fmtAxis(C.h[k])) + '</span><span>Mín ' + esc(fmtAxis(C.l[k])) + '</span><span>C ' + esc(fmtAxis(C.c[k])) + '</span>';
      } else {
        h = '<span class="w1-ro-d">' + esc(d) + '</span><span class="w1-ro-a">' + esc(T.sym === 'Tu portafolio' ? 'Portafolio' : T.sym) + ' ' + esc(fmtAxis(T.raw[idx])) + '</span>';
        if (T.rawBench) h += '<span class="w1-ro-b">' + esc(benchName()) + ' ' + esc(fmtAxis(T.rawBench[idx])) + '</span>';
      }
      readout.innerHTML = h;
    }
    function frac(e) { var r = cv.getBoundingClientRect(), pw = r.width - PAD.l - PAD.r; return clamp((e.clientX - r.left - PAD.l) / pw, 0, 1); }
    wrap.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch' && e.buttons === 0) return; hover = frac(e); showRo(hover); if (!raf) draw(); });
    wrap.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; hover = frac(e); showRo(hover); if (!raf) draw(); });
    wrap.addEventListener('pointerleave', function () { hover = null; showRo(null); if (!raf) draw(); });

    var themeOff = ctx.onTheme && ctx.onTheme(function () { draw(); });
    function apply() { segState(); tglState(); legendHtml(); }
    fit(); apply(); showRo(null); draw();
    after(function () { fit(); draw(); });
    return {
      update: function (c) { var n = Object.assign({}, cfg, c || ctx.config || {}); cfg = n; apply(); go(chartTarget(cfg)); showRo(hover); },
      resize: function () { fit(); draw(); },
      destroy: function () { stop(); if (typeof themeOff === 'function') themeOff(); if (seg.parentNode) seg.parentNode.removeChild(seg); if (root.parentNode) root.parentNode.removeChild(root); }
    };
  }
  function chartSettings(form, cfg, apply) {
    form.appendChild(fld('Símbolo', selectEl(chartSyms().map(function (s) { return { v: s, t: s === 'Tu portafolio' ? s : s + (pickPos(s) ? ' · posición' : ' · mercado') }; }), cfg.symbol || 'Tu portafolio', function (v) { apply({ symbol: v }); })));
    var segw = el('div', 'w1-segs'); segw.setAttribute('role', 'group'); segw.setAttribute('aria-label', 'Tipo de gráfica');
    [['line', 'Línea'], ['candle', 'Velas']].forEach(function (o) {
      var b = el('button', '', o[1]); b.type = 'button'; b.setAttribute('aria-pressed', (cfg.mode || 'line') === o[0] ? 'true' : 'false');
      b.addEventListener('click', function () { Array.prototype.forEach.call(segw.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); apply({ mode: o[0] }); });
      segw.appendChild(b);
    });
    form.appendChild(fld('Tipo', segw));
    var bl = el('label', 'w1-fld w1-fld-row'); bl.appendChild(checkEl(cfg.bench !== false, function (c) { apply({ bench: c }); })); bl.appendChild(el('span', '', 'Comparar con ' + esc(benchName())));
    form.appendChild(bl);
  }
  reg('chart', {
    label: 'Gráfica de precio', desc: '¿Cómo ha rendido tu cartera frente al mercado?', group: 'Mercado',
    icon: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 3.5v13h15"/><path d="M5.5 12.5l3.5-4 3 2.5 4-5.5"/></svg>',
    sizes: ['M', 'L', 'XL'], size: 'L', duplicable: true, defaults: { symbol: 'Tu portafolio', bench: true, range: '1A', mode: 'line' },
    thumb: function (e) { thumbSvg(e, '<path d="M8 60h104M8 40h104M8 20h104" opacity=".18"/><path d="M8 54l14-6 12 4 16-14 14 6 14-18 14 8 16-6" stroke="var(--accent)" stroke-width="2"/><path d="M8 56l14-3 12 2 16-8 14 3 14-8 14 4 16-3" opacity=".5"/>'); },
    render: chartRender, settings: chartSettings
  });

  /* ================= WATCHLIST ================= */
  function mktTxt(m) { return m.unit === '%' ? D.fmt.num(m.last, 2) + ' %' : D.fmt.num(m.last, m.last >= 1000 ? 1 : 2); }
  function buildUniverse() {
    var u = [];
    D.positions.forEach(function (p) {
      u.push({ key: p.ticker, sym: p.ticker, name: p.name, pos: true, lastTxt: D.fmt.num(p.price, p.price >= 1000 ? 0 : 2), d1: p.d1, d1Txt: null });
    });
    D.markets.forEach(function (m) {
      if (!isFinite(m.last)) return;
      var pts = m.unit === '%';
      u.push({ key: m.sym, sym: m.sym, name: m.sym, pos: false, lastTxt: mktTxt(m), d1: m.chg, d1Txt: pts ? (m.chg > 0 ? '+' : m.chg < 0 ? '−' : '') + D.fmt.num(Math.abs(m.chg), 2) + ' pt' : null, noYear: pts });
    });
    u.forEach(function (x) { x.spark = sparkFor(x.key); x.ytd = x.noYear ? null : yearFor(x.key); });
    return u;
  }
  var UNIVERSE = buildUniverse();
  function uniFind(k) { for (var i = 0; i < UNIVERSE.length; i++) if (UNIVERSE[i].key === k) return UNIVERSE[i]; return null; }
  function sparkSvg(a, d1) {
    if (!a || a.length < 2) return '';
    var mn = Math.min.apply(null, a), mx = Math.max.apply(null, a), w = 80, h = 24, n = a.length, pts = '', lx = 0, ly = 0;
    a.forEach(function (v, i) { var x = (i / (n - 1) * (w - 6) + 1).toFixed(1), y = (h - 4 - (v - mn) / (mx - mn || 1) * (h - 8)).toFixed(1); pts += (i ? ' ' : '') + x + ',' + y; lx = x; ly = y; });
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="80" height="24" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="var(--text-3)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/><circle cx="' + lx + '" cy="' + ly + '" r="2.6" class="' + (d1 > 0.0001 ? 'w1-dot-up' : d1 < -0.0001 ? 'w1-dot-dn' : 'w1-dot-fl') + '"/></svg>';
  }
  function defaultSyms() { return D.positions.slice().sort(function (a, b) { return b.value - a.value; }).slice(0, 4).map(function (p) { return p.ticker; }).concat(['S&P 500', 'USD/MXN']); }
  function watchRender(body, ctx) {
    var cfg = Object.assign({ symbols: defaultSyms(), ytd: false }, ctx.config || {});
    var root = el('div', 'w1-wl'); body.appendChild(root);
    var addBox = el('div', 'w1-add'), input = el('input', 'w1-in'), sug = el('ul', 'w1-sug'), msg = el('div', 'w1-msg'), list = el('div', 'w1-wrows'), foot = el('p', 'w1-note');
    input.type = 'text'; input.placeholder = 'Añadir de tus posiciones o mercados'; input.setAttribute('aria-label', 'Añadir símbolo a la lista'); input.autocomplete = 'off';
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-controls', 'w1sug-' + ctx.id);
    sug.id = 'w1sug-' + ctx.id; sug.setAttribute('role', 'listbox'); sug.hidden = true; msg.setAttribute('role', 'status'); msg.hidden = true;
    addBox.appendChild(input); addBox.appendChild(sug);
    root.appendChild(addBox); root.appendChild(msg); root.appendChild(list); root.appendChild(foot);
    var hi = -1, undoT = 0, matches = [];

    function size() { return ctx.size || 'M'; }
    function norm(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
    function rowEl(x) {
      var r = el('div', 'w1-wrow'); r.dataset.key = x.key; r.dataset.ticker = x.pos ? x.key : '';
      if (!x.pos) r.removeAttribute('data-ticker');
      var main = x.pos ? el('button', 'w1-wmain') : el('div', 'w1-wmain'); if (x.pos) { main.type = 'button'; main.setAttribute('aria-label', x.key + ', abrir ficha'); main.addEventListener('click', function () { ctx.openPosition(x.key); }); }
      var who = el('span', 'w1-who'); who.appendChild(markWrap(x.sym, 24)); who.appendChild(el('span', 'w1-nm', '<b>' + esc(x.sym) + '</b>' + (x.pos ? '<i>' + esc(x.name) + '</i>' : '')));
      main.appendChild(who);
      main.appendChild(el('span', 'w1-wl-last', esc(x.lastTxt)));
      main.appendChild(el('span', 'w1-wl-d ' + sgnCls(x.d1), arrow(x.d1) + ' ' + esc(x.d1Txt || D.fmt.pct(x.d1))));
      main.appendChild(el('span', 'w1-wl-sp', sparkSvg(x.spark, x.d1)));
      if (cfg.ytd) main.appendChild(el('span', 'w1-wl-ytd ' + (x.ytd == null ? 'w1-flat' : sgnCls(x.ytd)), x.ytd == null ? '–' : esc(D.fmt.pct(x.ytd, 1))));
      r.appendChild(main);
      var rm = el('button', 'w1-rm', '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>'); rm.type = 'button'; rm.setAttribute('aria-label', 'Quitar ' + x.key + ' de la lista');
      rm.addEventListener('click', function () { remove(x.key); });
      r.appendChild(rm); return r;
    }
    function build() {
      var sz = size(); root.dataset.size = sz; root.dataset.ytd = cfg.ytd ? '1' : '0'; root.dataset.cap = '0';
      strip(list);
      var items = cfg.symbols.map(uniFind).filter(Boolean);
      if (sz === 'S') items = items.slice(0, 4);
      var head = el('div', 'w1-whead', '<span>Símbolo</span><span>Último</span><span>Día</span><span class="w1-wl-sp">40 sesiones</span>' + (cfg.ytd ? '<span>1 año</span>' : ''));
      head.setAttribute('aria-hidden', 'true'); list.appendChild(head);
      items.forEach(function (x) { list.appendChild(rowEl(x)); });
      if (!items.length) list.appendChild(el('p', 'w1-empty', UNIVERSE.length ? 'Tu lista está vacía. Añade un símbolo arriba.' : 'Todavía no tienes posiciones ni mercados que seguir.'));
      foot.hidden = true;
      addBox.hidden = sz === 'S';
    }
    function persist() { ctx.save({ symbols: cfg.symbols.slice() }); }
    function remove(key) {
      var i = cfg.symbols.indexOf(key); if (i < 0) return;
      var row = list.querySelector('.w1-wrow[data-key="' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"]');
      cfg.symbols.splice(i, 1); persist();
      var done = function () { build(); showUndo(key, i); };
      if (row && !ctx.reduced() && row.animate) { var a = row.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease-out' }); a.onfinish = done; setTimeout(function () { if (row.parentNode) done(); }, 220); }
      else done();
    }
    function showUndo(key, idx) {
      clearTimeout(undoT); msg.hidden = false; msg.innerHTML = '<span>Quitaste ' + esc(key) + '</span>';
      var u = el('button', '', 'Deshacer'); u.type = 'button';
      u.addEventListener('click', function () { clearTimeout(undoT); msg.hidden = true; if (cfg.symbols.indexOf(key) < 0) { cfg.symbols.splice(Math.min(idx, cfg.symbols.length), 0, key); persist(); build(); } });
      msg.appendChild(u); undoT = setTimeout(function () { msg.hidden = true; }, 6000);
    }
    function add(key) {
      if (cfg.symbols.indexOf(key) >= 0) { flash('Ya está en tu lista'); return; }
      cfg.symbols.push(key); persist(); input.value = ''; closeSug(); build();
      var r = list.lastElementChild; if (r && r.animate && !ctx.reduced()) r.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(0.23,1,0.32,1)' });
    }
    function flash(t) { clearTimeout(undoT); msg.hidden = false; msg.textContent = t; undoT = setTimeout(function () { msg.hidden = true; }, 2600); }
    function closeSug() { sug.hidden = true; input.setAttribute('aria-expanded', 'false'); hi = -1; input.removeAttribute('aria-activedescendant'); }
    function openSug() {
      var q = norm(input.value.trim()); strip(sug); hi = -1;
      matches = UNIVERSE.filter(function (x) { return cfg.symbols.indexOf(x.key) < 0 && (!q || norm(x.key + ' ' + x.name).indexOf(q) >= 0); }).slice(0, 6);
      if (!matches.length) { sug.appendChild(el('li', 'w1-sug-e', q ? 'Sin coincidencias en tus posiciones ni mercados' : 'Ya sigues todo lo disponible')); }
      matches.forEach(function (x, i) {
        var li = el('li'); li.id = sug.id + '-' + i; li.setAttribute('role', 'option');
        li.appendChild(markWrap(x.sym, 20)); li.appendChild(el('span', '', '<b>' + esc(x.key) + '</b> ' + (x.pos ? esc(x.name) : '<i>mercado</i>')));
        li.addEventListener('pointerdown', function (e) { e.preventDefault(); add(x.key); });
        sug.appendChild(li);
      });
      sug.hidden = false; input.setAttribute('aria-expanded', 'true');
    }
    function mark_(i) { var o = sug.children; for (var k = 0; k < o.length; k++) o[k].classList.toggle('on', k === i); hi = i; if (o[i]) input.setAttribute('aria-activedescendant', o[i].id); }
    input.addEventListener('input', openSug); input.addEventListener('focus', openSug);
    input.addEventListener('blur', function () { setTimeout(closeSug, 120); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (sug.hidden) openSug(); mark_(Math.min(matches.length - 1, hi + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); mark_(Math.max(0, hi - 1)); }
      else if (e.key === 'Enter') { e.preventDefault(); var t = matches[hi >= 0 ? hi : 0]; if (t) add(t.key); else if (input.value.trim()) flash('No está en tus posiciones ni mercados'); }
      else if (e.key === 'Escape') { closeSug(); }
    });
    ctx.setMeta('Precios al ' + asOfDay());
    build();
    return {
      update: function (c) { cfg = Object.assign({}, cfg, c || ctx.config || {}); if (!Array.isArray(cfg.symbols)) cfg.symbols = []; build(); },
      resize: function () { if (root.dataset.size !== size()) build(); },
      destroy: function () { clearTimeout(undoT); if (root.parentNode) root.parentNode.removeChild(root); }
    };
  }
  function watchSettings(form, cfg, apply) {
    var l = el('label', 'w1-fld w1-fld-row'); l.appendChild(checkEl(!!cfg.ytd, function (c) { apply({ ytd: c }); })); l.appendChild(el('span', '', 'Mostrar cambio a 1 año')); form.appendChild(l);
  }
  reg('watchlist', {
    label: 'Lista de seguimiento', desc: '¿Cómo van los activos que sigues hoy?', group: 'Mercado',
    icon: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 10s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5z"/><circle cx="10" cy="10" r="2.2"/></svg>',
    sizes: ['S', 'M', 'L'], size: 'M', duplicable: true, defaults: { symbols: defaultSyms(), ytd: false },
    thumb: function (e) { thumbSvg(e, '<path d="M8 16h104M8 36h104M8 56h104" opacity=".25"/><circle cx="14" cy="10" r="3.5" opacity=".6"/><circle cx="14" cy="30" r="3.5" opacity=".6"/><circle cx="14" cy="50" r="3.5" opacity=".6"/><path d="M60 12l8-3 8 4 10-5M60 32l8 3 8-2 10 4M60 52l8-2 8 3 10-4" opacity=".6"/><circle cx="94" cy="8" r="2" fill="var(--gain)" stroke="none"/><circle cx="94" cy="36" r="2" fill="var(--loss)" stroke="none"/><circle cx="94" cy="49" r="2" fill="var(--gain)" stroke="none"/>'); },
    render: watchRender, settings: watchSettings
  });

  /* ================= RISK (réplica de renderRiskWidget de main.js) ================= */
  function riskModel() {
    var rows = D.positions.filter(function (p) { return p.value > 0; });
    var total = rows.reduce(function (s, r) { return s + r.value; }, 0);
    var top = rows.reduce(function (m, r) { return r.value > m.value ? r : m; }, { value: 0, ticker: '--' });
    var topWeight = total > 0 ? top.value / total : 0, missing = 0;
    var weightedMove = rows.reduce(function (s, r) { return s + Math.abs(r.d1 / 100) * (r.value / total); }, 0);
    var div = Math.max(0, 8 - rows.length) * 5, conc = Math.max(0, topWeight - 0.25) * 120;
    var price = rows.length ? missing / rows.length * 15 : 10, move = Math.min(25, weightedMove * 250);
    var score = Math.max(0, Math.round(100 - div - conc - price - move));
    var label = score >= 75 ? 'Controlado' : score >= 55 ? 'Moderado' : 'Alto';
    var ds = [{ k: 'div', pts: div }, { k: 'conc', pts: conc }, { k: 'price', pts: price }, { k: 'move', pts: move }].sort(function (a, b) { return b.pts - a.pts; });
    var d = ds[0], why;
    if (d.pts < 0.5) why = 'Sin penalizaciones relevantes: ' + rows.length + ' posiciones y ninguna pasa del 25 %.';
    else if (d.k === 'conc') why = top.ticker + ' pesa ' + pctNum(topWeight * 100) + ' y supera el 25 %: resta ' + Math.round(d.pts) + ' puntos.';
    else if (d.k === 'div') why = 'Solo ' + rows.length + ' posiciones: cada una por debajo de 8 resta 5 puntos.';
    else if (d.k === 'price') why = 'Faltan precios en parte de las posiciones: resta ' + Math.round(d.pts) + ' puntos.';
    else why = 'Lo que más resta es el movimiento ponderado del día (' + pctNum(weightedMove * 100, 2) + '): ' + Math.round(d.pts) + ' puntos. Ninguna posición pasa del 25 %.';
    var w = rows.map(function (r) { return { t: r.ticker, w: total ? r.value / total * 100 : 0 }; }).sort(function (a, b) { return b.w - a.w; }).slice(0, 5);
    return { score: score, label: label, why: why, weights: w };
  }
  function riskRender(body, ctx) {
    var root = el('div', 'w1-rk'); body.appendChild(root); var R = riskModel(), first = true;
    function size() { return ctx.size || 'M'; }
    function build() {
      var sz = size(); root.dataset.size = sz; strip(root);
      if (!D.positions.some(function (p) { return p.value > 0; })) { root.appendChild(el('p', 'w1-empty', 'Sin posiciones para medir.')); return; }
      var cls = R.label === 'Alto' ? 'w1-dn' : '';
      var main = el('div', 'w1-rk-main');
      main.innerHTML = '<div class="w1-rk-top"><div class="w1-rk-sc"><strong>' + R.score + '</strong><span>/100</span></div><em class="w1-rk-lb ' + cls + '">' + R.label + '</em></div>' +
        '<div class="w1-trk" role="img" aria-label="Puntaje de riesgo ' + R.score + ' de 100, ' + R.label + '"><i class="w1-tk" style="left:55%"></i><i class="w1-tk" style="left:75%"></i><b class="w1-mk-pt"></b></div>' +
        (sz === 'L' ? '<div class="w1-trk-l"><span style="left:55%">55</span><span style="left:75%">75</span></div>' : '');
      root.appendChild(main);
      var marker = main.querySelector('.w1-mk-pt');
      if (first && !ctx.reduced()) { marker.style.left = '0%'; after(function () { marker.style.left = R.score + '%'; }); } else marker.style.left = R.score + '%';
      first = false;
      if (sz === 'S') return;
      main.appendChild(el('p', 'w1-why', esc(R.why)));
      var ib = el('button', 'w1-info', 'i'); ib.type = 'button'; ib.setAttribute('aria-label', 'Cómo se calcula el puntaje'); ib.setAttribute('aria-expanded', 'false');
      var pop = el('div', 'w1-pop', 'Puntaje 0–100: diversificación, concentración mayor a 25 %, precios faltantes y movimiento del día. Controlado desde 75; Moderado desde 55.'); pop.hidden = true; pop.setAttribute('role', 'note');
      function tp(o) { pop.hidden = !o; ib.setAttribute('aria-expanded', o ? 'true' : 'false'); }
      ib.addEventListener('click', function () { tp(pop.hidden); });
      ib.addEventListener('keydown', function (e) { if (e.key === 'Escape') tp(false); });
      ib.addEventListener('blur', function () { setTimeout(function () { if (!pop.contains(doc.activeElement)) tp(false); }, 100); });
      main.querySelector('.w1-rk-top').appendChild(ib); main.appendChild(pop);
      var side = el('div', 'w1-rk-side'), bars = el('div', 'w1-wbars');
      R.weights.slice(0, sz === 'L' ? 5 : 3).forEach(function (x) {
        bars.appendChild(el('div', 'w1-wb', '<span>' + esc(x.t) + '</span><div><u style="width:' + clamp(x.w / 40 * 100, 1, 100).toFixed(1) + '%"></u><s style="left:62.5%"></s></div><b>' + esc(pctNum(x.w)) + '</b>'));
      });
      var bh = el('div', 'w1-k', 'Mayores posiciones <span>· línea = 25 %</span>');
      side.appendChild(bh); side.appendChild(bars);
      root.appendChild(side);
    }
    ctx.setMeta('Precios al ' + asOfDay());
    build();
    return {
      update: function () { R = riskModel(); build(); },
      resize: function () { if (root.dataset.size !== size()) build(); },
      destroy: function () { if (root.parentNode) root.parentNode.removeChild(root); }
    };
  }
  reg('risk', {
    label: 'Riesgo de cartera', desc: '¿Qué tan expuesta está tu cartera?', group: 'Portafolio',
    icon: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2.5l6.5 2.5v4.5c0 4-2.7 6.7-6.5 8-3.8-1.3-6.5-4-6.5-8V5L10 2.5z"/><path d="M7.5 10l1.8 1.8L13 8"/></svg>',
    sizes: ['S', 'M'], size: 'M', defaults: {},
    thumb: function (e) { thumbSvg(e, '<path d="M10 22h100" stroke-width="6" opacity=".25" stroke-linecap="round"/><path d="M92 14v16" stroke-width="3" stroke="currentColor"/><path d="M10 44h60M10 54h42M10 64h30" stroke-width="4" opacity=".5"/>'); },
    render: riskRender
  });

  /* ================= DIVIDENDS ================= */
  function isoAdd(iso, d) { var t = new Date(iso + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + d); return t.toISOString().slice(0, 10); }
  function divModel() {
    var CM = window.CampoModel, dv = null, months = [], i, per = {};
    try { if (CM && CM.dividends) dv = CM.dividends('todos'); } catch (e) { dv = null; }
    var dts = D.series && D.series.dates, last = dts && dts.length ? dts[dts.length - 1] : '';
    var asOf = dv && dv.asOf ? dv.asOf : last, ad = /^\d{4}-\d{2}-\d{2}/.test(asOf || '') ? asOf.slice(0, 10) : new Date().toISOString().slice(0, 10);
    var base = (+ad.slice(0, 4)) * 12 + (+ad.slice(5, 7) - 1) - 11, from = isoAdd(ad, -365);
    for (i = 0; i < 12; i++) { var k = base + i; months.push({ m: k % 12, y: Math.floor(k / 12), amt: 0 }); }
    var proj = 0;
    if (dv) {
      (dv.received || []).forEach(function (r) {
        if (!(r.date > from) || !isFinite(r.gross)) return;
        var j = (+r.date.slice(0, 4)) * 12 + (+r.date.slice(5, 7) - 1) - base; if (j < 0 || j > 11) return;
        months[j].amt += r.gross; per[r.ticker] = (per[r.ticker] || 0) + r.gross;
      });
      proj = dv.totals && isFinite(dv.totals.projected) ? dv.totals.projected : 0;
    }
    var total = months.reduce(function (s, m) { return s + m.amt; }, 0);
    var pay = Object.keys(per).map(function (t) { return { ticker: t, annual: per[t] }; }).sort(function (a, b) { return b.annual - a.annual; });
    return { pay: pay, months: months, annual: total, monthly: Math.round(total / 12), proj: proj, has: total > 0 || proj > 0 };
  }
  function divRender(body, ctx) {
    var root = el('div', 'w1-dv'); body.appendChild(root); var R = divModel(), first = true;
    function size() { return ctx.size || 'M'; }
    function build() {
      var sz = size(); root.dataset.size = sz; strip(root);
      if (!R.has) { root.appendChild(el('p', 'w1-empty', 'Aún no hay dividendos registrados.')); return; }
      var left = el('div', 'w1-dv-l'), right = el('div', 'w1-dv-r');
      left.innerHTML = '<div class="w1-kpis"><div><span class="w1-k">Últimos 12 meses · recibido</span><strong>' + esc(money(R.annual)) + '</strong></div><div><span class="w1-k">Promedio al mes</span><strong>' + esc(money(R.monthly)) + '</strong></div></div>';
      var ro = el('div', 'w1-dv-ro'); ro.setAttribute('aria-live', 'polite');
      var max = Math.max.apply(null, R.months.map(function (m) { return m.amt; })) || 1;
      var chart = el('div', 'w1-dv-bars'); chart.setAttribute('role', 'group'); chart.setAttribute('aria-label', 'Dividendos recibidos por mes, últimos 12 meses');
      function def() { ro.innerHTML = '<span>Últimos 12 meses</span><b>' + esc(money(R.annual)) + ' recibido</b>'; }
      R.months.forEach(function (mo, i) {
        var c = el('div', 'w1-bc'); c.tabIndex = 0; c.setAttribute('aria-label', MONTHS[mo.m] + ' ' + mo.y + ', ' + (mo.amt ? money(mo.amt) + ' recibido' : 'sin pagos'));
        var b = el('i'); b.style.height = mo.amt ? Math.max(4, mo.amt / max * 100).toFixed(1) + '%' : '1px'; if (!mo.amt) b.className = 'z';
        b.style.transitionDelay = Math.min(i, 11) * 22 + 'ms';
        if (first && !ctx.reduced() && mo.amt) b.style.transform = 'scaleY(0)';
        c.appendChild(b); c.appendChild(el('span', '', MONTHS[mo.m].charAt(0).toUpperCase() + MONTHS[mo.m].slice(1)));
        var show = function () { c.classList.add('on'); ro.innerHTML = '<span>' + esc(MONTHS[mo.m]) + ' ' + mo.y + '</span><b>' + (mo.amt ? esc(money(mo.amt)) + ' recibido' : 'sin pagos') + '</b>'; };
        var hide = function () { c.classList.remove('on'); def(); };
        c.addEventListener('pointerenter', show); c.addEventListener('pointerleave', hide); c.addEventListener('focus', show); c.addEventListener('blur', hide);
        chart.appendChild(c);
      });
      def(); left.appendChild(ro); left.appendChild(chart);
      left.appendChild(el('p', 'w1-note', R.proj > 0 ? 'Proyección a 12 meses: ≈ ' + esc(money(R.proj)) + ', con el dividendo trimestral vigente de cada título; los pagos reales varían.' : 'Solo dividendos registrados en tus movimientos.'));
      right.appendChild(el('div', 'w1-k', 'Quién ha pagado más'));
      var ul = el('ul', 'w1-pay');
      R.pay.slice(0, sz === 'L' ? 99 : 4).forEach(function (x) {
        var li = el('li'); li.appendChild(markWrap(x.ticker, 24));
        li.appendChild(el('span', 'w1-nm', '<b>' + esc(x.ticker) + '</b><i>' + esc(R.annual ? Math.round(x.annual / R.annual * 100) : 0) + ' % del ingreso</i>'));
        li.appendChild(el('span', 'w1-pay-a', esc(money(x.annual)) + '<small>en 12 meses</small>')); ul.appendChild(li);
      });
      right.appendChild(ul);
      root.appendChild(left); root.appendChild(right);
      if (first && !ctx.reduced()) after(function () { chart.querySelectorAll('i').forEach(function (b) { b.style.transform = ''; }); });
      first = false;
    }
    ctx.setMeta('Recibido · últimos 12 meses');
    build();
    return {
      update: function () { R = divModel(); build(); },
      resize: function () { if (root.dataset.size !== size()) build(); },
      destroy: function () { if (root.parentNode) root.parentNode.removeChild(root); }
    };
  }
  reg('dividends', {
    label: 'Dividendos y flujo', desc: '¿Cuánto has recibido en dividendos?', group: 'Ingresos',
    icon: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16.5h14"/><path d="M5 16.5V11M9 16.5V7M13 16.5V9.5M17 16.5V5"/></svg>',
    sizes: ['M', 'L'], size: 'M', defaults: {},
    thumb: function (e) { thumbSvg(e, '<path d="M8 62h104" opacity=".4"/><g stroke="none" fill="currentColor" opacity=".55"><rect x="12" y="36" width="9" height="26" rx="1.5"/><rect x="30" y="50" width="9" height="12" rx="1.5"/><rect x="48" y="26" width="9" height="36" rx="1.5"/><rect x="66" y="48" width="9" height="14" rx="1.5"/><rect x="84" y="20" width="9" height="42" rx="1.5"/></g><rect x="102" y="40" width="9" height="22" rx="1.5" stroke="none" fill="var(--accent)"/>'); },
    render: divRender
  });

  flush();
})();
