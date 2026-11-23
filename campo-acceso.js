/* Portify · Campo · presentación de login.html y registro.html. NO toca la autenticación.
   1. Logo: el pictograma se inclina hacia el puntero (sólo puntero fino y sin movimiento reducido).
   2. Enlaces con data-gate: transición "tablero" entre páginas (campo-gate.js); sin él, navegan normal.
   3. login.html: panel de mercados ILUSTRATIVO. Series deterministas generadas aquí (semilla fija): no son
      cotizaciones, no hay red ni datos de usuario. Canvas 2D, sin rAF en reposo. */
(function () {
  'use strict';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var mqHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ===================== 1. logo ===================== */
  (function logoLean() {
    var anchors = document.querySelectorAll('.brand-live');
    if (!anchors.length || !mqHover.matches || mqReduce.matches) return;
    var LEAN_BIG = 0.8, LEAN_DOT = 1.6, EASE = 0.18, EPS = 0.01;
    Array.prototype.forEach.call(anchors, function (a) {
      var svg = a.querySelector('.logo'), big = a.querySelector('.lg-big'), dot = a.querySelector('.lg-dot');
      if (!svg || !big || !dot) return;
      var target = { x: 0, y: 0 }, cur = { bx: 0, by: 0, dx: 0, dy: 0 }, raf = 0;
      function frame() {
        raf = 0;
        var tbx = target.x * LEAN_BIG, tby = target.y * LEAN_BIG, tdx = target.x * LEAN_DOT, tdy = target.y * LEAN_DOT;
        cur.bx += (tbx - cur.bx) * EASE; cur.by += (tby - cur.by) * EASE; cur.dx += (tdx - cur.dx) * EASE; cur.dy += (tdy - cur.dy) * EASE;
        big.style.translate = cur.bx.toFixed(3) + 'px ' + cur.by.toFixed(3) + 'px';
        dot.style.translate = cur.dx.toFixed(3) + 'px ' + cur.dy.toFixed(3) + 'px';
        if (!(Math.abs(tbx - cur.bx) < EPS && Math.abs(tby - cur.by) < EPS && Math.abs(tdx - cur.dx) < EPS && Math.abs(tdy - cur.dy) < EPS)) raf = requestAnimationFrame(frame);
      }
      function kick() { if (!raf) raf = requestAnimationFrame(frame); }
      a.addEventListener('pointermove', function (e) {
        var r = svg.getBoundingClientRect(), half = r.width / 2 || 1;
        target.x = clamp((e.clientX - (r.left + half)) / half, -1, 1); target.y = clamp((e.clientY - (r.top + half)) / half, -1, 1); kick();
      });
      a.addEventListener('pointerleave', function () { target.x = 0; target.y = 0; kick(); });
    });
  })();

  /* ===================== 2. transición entre páginas ===================== */
  document.addEventListener('click', function (e) {
    try {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest ? e.target.closest('a[data-gate]') : null;
      if (!a || !window.CampoGate || typeof window.CampoGate.go !== 'function') return;
      var href = a.getAttribute('href');
      if (!href || a.target === '_blank') return;
      e.preventDefault();
      window.CampoGate.go(a, href);
    } catch (err) { /* el enlace navega normal */ }
  });

  /* ===================== 3. panel de mercados ilustrativo ===================== */
  var panel = document.getElementById('accVisual');
  if (!panel) return;
  var stage = document.getElementById('rgStage'), canvas = document.getElementById('rgCanvas'),
    perEl = document.getElementById('rgPer'), legendEl = document.getElementById('rgLegend'),
    ltitle = document.getElementById('rgLTitle'), noteEl = document.getElementById('rgNote'),
    sessEl = document.getElementById('rgSessions'), tbody = document.querySelector('#rgTable tbody');
  if (!stage || !canvas || !perEl || !legendEl || !ltitle || !noteEl || !sessEl || !tbody || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rnd) { var u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  var nf = {};
  function num(v, dec) { var k = 'n' + dec; if (!nf[k]) nf[k] = new Intl.NumberFormat('es-MX', { maximumFractionDigits: dec, minimumFractionDigits: dec }); return nf[k].format(v); }
  function pct(v, dec) { dec = dec == null ? 2 : dec; var s = v > 0 ? '+' : v < 0 ? '−' : ''; return s + num(Math.abs(v), dec) + ' %'; }

  /* ---------- datos de muestra: 252 sesiones, semilla fija, termina exactamente en `last` ---------- */
  var TOT = 252, M = 160, MAXI = 3;
  var MK = [
    { sym: 'S&P/BMV IPC', last: 55912.4, chg: 0.42, mu: 0.00035, sg: 0.0095, rho: 0.55 },
    { sym: 'S&P 500', last: 6018.7, chg: 0.27, mu: 0.00045, sg: 0.0085, rho: 0.97 },
    { sym: 'Nasdaq 100', last: 21204.1, chg: -0.36, mu: 0.00055, sg: 0.0115, rho: 0.93 },
    { sym: 'USD/MXN', last: 20.12, chg: -0.18, mu: -0.00016, sg: 0.0058, rho: -0.42 },
    { sym: 'Bitcoin', last: 91450, chg: -2.71, mu: 0.0006, sg: 0.028, rho: 0.33 },
    { sym: 'Oro', last: 2671.3, chg: 0.54, mu: 0.0006, sg: 0.0092, rho: 0.05 },
    { sym: 'Bono 10a EE. UU.', last: 4.38, chg: 0.04, unit: '%', mu: 0.0002, sg: 0.0062, rho: 0.2 }
  ];
  (function gen() {
    var hr = mulberry32(29046905), G = [], g0;
    for (g0 = 0; g0 < TOT; g0++) G.push(gauss(hr));
    MK.forEach(function (mk) {
      var e = Math.sqrt(1 - mk.rho * mk.rho), r = [], h = new Array(TOT), j;
      for (j = 1; j < TOT - 1; j++) r[j] = mk.mu + mk.sg * (mk.rho * G[j] + e * gauss(hr));
      r[TOT - 1] = Math.log(1 + mk.chg / 100);
      h[TOT - 1] = mk.last; for (j = TOT - 1; j > 0; j--) h[j - 1] = h[j] * Math.exp(-r[j]);
      mk.hist = h;
    });
  })();
  /* fechas: las últimas 252 sesiones (lun-vie) hasta hoy; sólo rotulan el eje */
  var dates = (function () {
    var out = [], d = new Date(); d.setHours(12, 0, 0, 0);
    while (out.length < TOT) { var w = d.getDay(); if (w !== 0 && w !== 6) out.unshift(new Date(d.getTime())); d.setDate(d.getDate() - 1); }
    return out;
  })();

  var S = MK.map(function (mk, i) { return { id: i, name: mk.sym, h: mk.hist, last: mk.last, unit: mk.unit, on: false, slot: -1 }; });
  function byName(nm) { for (var i = 0; i < S.length; i++) if (S[i].name === nm) return i; return -1; }
  var order = [];
  ['S&P 500', 'S&P/BMV IPC', 'Bitcoin'].forEach(function (nm, k) { var i = byName(nm); if (i < 0) return; S[i].on = true; S[i].slot = k; order.push(i); });
  var PERIODS = [['1M', 21], ['3M', 63], ['6M', 126], ['1A', 252]];
  var P = 63;

  function valTxt(s, hi) {
    var v = s.last * s.h[hi] / s.h[TOT - 1];
    return s.unit === '%' ? num(v, 2) + ' %' : num(v, v >= 10000 ? 0 : 2);
  }
  function dateOf(idx, long) {
    var dt = dates[TOT - P + idx]; if (!dt) return '';
    return dt.toLocaleDateString('es-MX', long ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' }).replace(/\./g, '');
  }
  function monthOf(idx) { var dt = dates[TOT - P + idx]; return dt ? dt.toLocaleDateString('es-MX', { month: 'short' }).replace(/\./g, '') : ''; }

  /* ---------- DOM: periodos y leyenda ---------- */
  PERIODS.forEach(function (p) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = p[0]; b.dataset.n = p[1];
    b.setAttribute('aria-pressed', p[1] === P ? 'true' : 'false');
    b.addEventListener('click', function () { setPeriod(p[1]); });
    perEl.appendChild(b);
  });
  S.forEach(function (s, i) {
    var li = document.createElement('li');
    li.innerHTML = '<button type="button" class="rg-row" aria-pressed="false" aria-label="' + esc(s.name) + '"><i class="rg-sw" aria-hidden="true"></i><span class="rg-name">' + esc(s.name) + '</span><span class="rg-pct"></span><span class="rg-val"></span></button>';
    s.btn = li.firstChild;
    s.btn.addEventListener('click', function () { toggle(i); });
    s.btn.addEventListener('pointerenter', function (e) { if (mqHover.matches && e.pointerType !== 'touch') setEmph(i); });
    s.btn.addEventListener('pointerleave', function () { setEmph(-1); });
    s.btn.addEventListener('focus', function () { setEmph(i); });
    s.btn.addEventListener('blur', function () { setEmph(-1); });
    s.pctEl = li.querySelector('.rg-pct'); s.valEl = li.querySelector('.rg-val');
    legendEl.appendChild(li);
    s.a = s.on ? 1 : 0; s.hi = 0; s.dim = 0; s.ent = 1; s.tagA = 1; s.delay = 0; s.dv = 0; s.tf = 0; s.tt = 0; s.tt0 = 0; s.tdur = 0; s.txt = '';
  });
  var live = document.createElement('div'); live.className = 'rg-sr'; live.setAttribute('aria-live', 'polite'); panel.appendChild(live);

  function syncRows() {
    S.forEach(function (s) {
      s.btn.setAttribute('aria-pressed', s.on ? 'true' : 'false');
      if (s.on) s.btn.dataset.slot = s.slot; else delete s.btn.dataset.slot;
    });
  }
  function buildTable() {
    tbody.innerHTML = '';
    S.forEach(function (s) {
      if (!s.on) return;
      var tr = document.createElement('tr');
      tr.innerHTML = '<th scope="row">' + esc(s.name) + '</th><td>' + esc(pct(s.w[P - 1])) + '</td><td>' + esc(valTxt(s, TOT - 1)) + '</td>';
      tbody.appendChild(tr);
    });
  }
  var noteT = 0;
  function showNote(t) {
    noteEl.textContent = t; noteEl.dataset.on = '1'; live.textContent = t;
    clearTimeout(noteT); noteT = setTimeout(function () { noteEl.dataset.on = '0'; }, 2800);
  }

  /* ---------- series, rango y ticks ---------- */
  var rng = { from: { lo: -1, hi: 1 }, to: { lo: -1, hi: 1 }, cur: { lo: -1, hi: 1 } };
  var tkFrom = null, tkTo = null, mt0 = 0, mdur = 0, me = 1;
  function windowPct(s) { var a = s.h.slice(TOT - P), b = a[0]; return a.map(function (v) { return (v / b - 1) * 100; }); }
  function resample(w) {
    var out = new Array(M), n = w.length;
    for (var k = 0; k < M; k++) { var f = k / (M - 1) * (n - 1), i = Math.floor(f), u = f - i; out[k] = i >= n - 1 ? w[n - 1] : w[i] + (w[i + 1] - w[i]) * u; }
    return out;
  }
  function rangeOf() {
    var lo = 0, hi = 0;
    S.forEach(function (s) { if (!s.on) return; s.w.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; }); });
    var span = Math.max(hi - lo, 1), pad = span * 0.1;
    return { lo: lo - pad, hi: hi + pad };
  }
  function ticksFor(lo, hi) {
    var raw = (hi - lo) / 4, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
    var st = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag, v = [];
    for (var x = Math.ceil(lo / st - 1e-9) * st; x <= hi + 1e-9; x += st) v.push(+x.toFixed(6));
    return { st: st, v: v };
  }
  function retarget(animate) {
    var now = performance.now(), anim = animate && !mqReduce.matches;
    S.forEach(function (s) {
      s.w = windowPct(s);
      var to = resample(s.w);
      s.from = anim && s.cur && !s.fresh ? s.cur.slice() : to.slice();
      s.fresh = false; s.to = to; if (!s.cur) s.cur = to.slice();
    });
    var nr = rangeOf();
    rng.from = { lo: rng.cur.lo, hi: rng.cur.hi }; rng.to = nr;
    if (!anim) rng.cur = { lo: nr.lo, hi: nr.hi };
    tkFrom = tkTo; tkTo = ticksFor(nr.lo, nr.hi); if (!tkFrom || !anim) tkFrom = tkTo;
    mt0 = now; mdur = anim ? 320 : 0;
    buildTable(); targetLegend(hov == null ? null : hov, anim ? 320 : 0);
    dirty = true; schedule();
  }

  /* ---------- leyenda: valores del último punto o del día señalado ---------- */
  function setTarget(s, v, dur) { s.tf = s.dv; s.tt = v; s.tt0 = performance.now(); s.tdur = dur; if (!dur) s.dv = v; }
  function paintLegend(s) {
    var t = pct(s.dv);
    if (t !== s.txt) { s.txt = t; s.pctEl.textContent = t; s.pctEl.className = 'rg-pct ' + (/^\+/.test(t) ? 'up' : /^−/.test(t) ? 'dn' : ''); }
  }
  function targetLegend(idx, dur) {
    var k = idx == null ? P - 1 : idx;
    S.forEach(function (s) { setTarget(s, s.w[k], dur); s.valEl.textContent = valTxt(s, TOT - P + k); paintLegend(s); });
    ltitle.textContent = idx == null ? 'Cambio en el periodo' : dateOf(idx, true);
  }

  /* ---------- interacción ---------- */
  var hov = null, src = '', emph = -1, kbIdx = P - 1;
  function setEmph(i) { emph = i; schedule(); }
  function setHover(idx, from) {
    idx = clamp(idx, 0, P - 1);
    if (idx === hov) { src = from; return; }
    hov = idx; src = from; targetLegend(idx, 0); schedule();
  }
  function clearHover() {
    if (hov == null) { src = ''; return; }
    hov = null; src = ''; targetLegend(null, mqReduce.matches ? 0 : 220); schedule();
  }
  function say() {
    if (hov == null) { live.textContent = ''; return; }
    var parts = S.filter(function (s) { return s.on; }).map(function (s) { return s.name + ' ' + pct(s.w[hov]); });
    live.textContent = dateOf(hov, true) + ': ' + parts.join(', ');
  }
  function toggle(i) {
    var s = S[i], pos = order.indexOf(i);
    if (pos >= 0) { order.splice(pos, 1); s.on = false; }
    else {
      var sl = -1;
      if (order.length >= MAXI) {
        var old = S[order.shift()]; old.on = false; sl = old.slot;
        showNote('Máximo ' + MAXI + ' instrumentos: se quitó ' + old.name + '.');
      } else {
        for (var k = 0; k < MAXI && sl < 0; k++) { var used = false; order.forEach(function (j) { if (S[j].slot === k) used = true; }); if (!used) sl = k; }
      }
      s.slot = sl; s.on = true; s.fresh = true; order.push(i);
    }
    syncRows(); retarget(true);
  }
  function setPeriod(n) {
    if (n === P) return;
    P = n; hov = null; kbIdx = P - 1;
    Array.prototype.forEach.call(perEl.children, function (b) { b.setAttribute('aria-pressed', +b.dataset.n === P ? 'true' : 'false'); });
    retarget(true);
  }
  function idxFromX(x) { return Math.round((x - L) / (R - L) * (P - 1)); }

  stage.addEventListener('pointermove', function (e) {
    if (!mqHover.matches || e.pointerType === 'touch' || !sized) return;
    var r = stage.getBoundingClientRect(); setHover(idxFromX(e.clientX - r.left), 'pointer');
  });
  stage.addEventListener('pointerleave', function () { if (src === 'pointer') clearHover(); });
  stage.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'Escape') { e.preventDefault(); clearHover(); say(); return; }
    if (k !== 'ArrowLeft' && k !== 'ArrowRight' && k !== 'Home' && k !== 'End') return;
    e.preventDefault();
    if (k === 'Home') kbIdx = 0; else if (k === 'End') kbIdx = P - 1;
    else kbIdx = clamp((hov == null ? P - 1 : kbIdx) + (k === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 5 : 1), 0, P - 1);
    setHover(kbIdx, 'kbd'); say();
  });
  stage.addEventListener('blur', function () { if (src === 'kbd') { clearHover(); say(); } });

  /* ---------- sesiones de bolsa (horario regular; es la hora real, no un dato de mercado) ---------- */
  var EX = [
    { city: 'CDMX', tz: 'America/Mexico_City', seg: [[510, 900]] },
    { city: 'Nueva York', tz: 'America/New_York', seg: [[570, 960]] },
    { city: 'Londres', tz: 'Europe/London', seg: [[480, 990]] },
    { city: 'Tokio', tz: 'Asia/Tokyo', seg: [[540, 690], [750, 930]] }
  ];
  var WD = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
  EX.forEach(function (e) {
    try { e.fmt = new Intl.DateTimeFormat('en-US', { timeZone: e.tz, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }); } catch (x) { e.fmt = null; }
    var li = document.createElement('li');
    li.innerHTML = '<i class="rg-dot" aria-hidden="true"></i><span class="rg-city">' + esc(e.city) + '</span><span class="rg-st"></span>';
    sessEl.appendChild(li); e.li = li; e.st = li.querySelector('.rg-st');
  });
  function dur(m) { m = Math.max(1, Math.round(m)); if (m < 60) return m + ' min'; var h = Math.floor(m / 60), r = m % 60; return h + ' h' + (r ? ' ' + r + ' min' : ''); }
  function sessionState(e, now) {
    var p = {}; e.fmt.formatToParts(now).forEach(function (x) { p[x.type] = x.value; });
    var wd = WD[p.weekday], m = (+p.hour) * 60 + (+p.minute);
    if (wd >= 1 && wd <= 5) {
      for (var i = 0; i < e.seg.length; i++) { if (m >= e.seg[i][0] && m < e.seg[i][1]) return { open: true, t: 'cierra en ' + dur(e.seg[i][1] - m) }; }
      for (var j = 0; j < e.seg.length; j++) { if (m < e.seg[j][0]) return { open: false, t: (j ? 'pausa, abre en ' : 'abre en ') + dur(e.seg[j][0] - m) }; }
      if (wd < 5) return { open: false, t: 'abre en ' + dur(1440 - m + e.seg[0][0]) };
    }
    return { open: false, t: 'abre el lunes' };
  }
  function updSessions() {
    var now = new Date();
    EX.forEach(function (e) {
      if (!e.fmt) return;
      var s = sessionState(e, now);
      if (e.st.textContent !== s.t) e.st.textContent = s.t;
      e.li.dataset.open = s.open ? '1' : '0';
    });
  }
  updSessions();
  setInterval(function () { if (!document.hidden) updSessions(); }, 30000);

  /* ---------- geometría ---------- */
  var W = 0, H = 0, dpr = 1, L = 4, R = 0, T = 10, B = 0, GR = 64, sized = false;
  function layout() {
    W = stage.clientWidth; H = stage.clientHeight;
    if (!W || !H) { sized = false; return false; }
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    GR = W < 420 ? 56 : 64; R = W - GR; B = H - 22;
    sized = true; return true;
  }
  function Y(v) { return T + (rng.cur.hi - v) / (rng.cur.hi - rng.cur.lo) * (B - T); }
  function rr(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  /* ---------- animación ---------- */
  var t0 = -1e9, raf = 0, last = 0, dirty = true, onscreen = true;
  function canRun() { return !document.hidden && onscreen && !!stage.clientWidth; }
  function schedule() {
    if (!canRun()) { dirty = true; return; }
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }
  function step(dt, now) {
    var busy = false, red = mqReduce.matches, kd = 1 - Math.exp(-dt / 0.06);
    var e = mdur ? easeOut(clamp((now - mt0) / mdur, 0, 1)) : 1;
    if (e < 1) busy = true;
    rng.cur.lo = rng.from.lo + (rng.to.lo - rng.from.lo) * e; rng.cur.hi = rng.from.hi + (rng.to.hi - rng.from.hi) * e;
    me = e;
    function sn(v, t) { if (red) return t; v += (t - v) * kd; if (Math.abs(v - t) < 0.004) return t; busy = true; return v; }
    S.forEach(function (s, i) {
      var k;
      for (k = 0; k < M; k++) s.cur[k] = s.from[k] + (s.to[k] - s.from[k]) * e;
      s.a = sn(s.a, s.on ? 1 : 0); s.hi = sn(s.hi, emph === i ? 1 : 0); s.dim = sn(s.dim, emph >= 0 && emph !== i ? 1 : 0);
      if (red) { s.ent = 1; s.tagA = 1; }
      else {
        var el = now - t0 - s.delay;
        s.ent = easeOut(clamp(el / 700, 0, 1)); s.tagA = clamp((el - 700) / 220, 0, 1);
        if (el < 920) busy = true;
      }
      if (s.tdur && !red) {
        var u = clamp((now - s.tt0) / s.tdur, 0, 1); s.dv = s.tf + (s.tt - s.tf) * easeOut(u);
        if (u < 1) busy = true; else s.tdur = 0;
      } else { s.dv = s.tt; s.tdur = 0; }
      paintLegend(s);
    });
    return busy;
  }
  function bezier(x1, y1, x2, y2) {
    function cx(t) { return 3 * x1 * t * (1 - t) * (1 - t) + 3 * x2 * t * t * (1 - t) + t * t * t; }
    function cy(t) { return 3 * y1 * t * (1 - t) * (1 - t) + 3 * y2 * t * t * (1 - t) + t * t * t; }
    function dx(t) { return 3 * x1 * (1 - t) * (1 - t) + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t; }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 6; i++) { var d = dx(t); if (Math.abs(d) < 1e-6) break; t -= (cx(t) - x) / d; }
      t = clamp(t, 0, 1); return cy(t);
    };
  }
  var easeOut = bezier(0.23, 1, 0.32, 1);

  function drawTicks(list, cT3, cLn, alphaOf, tags) {
    list.v.forEach(function (v) {
      var y = Y(v), al = alphaOf(v); if (al <= 0.01 || y < T - 2 || y > B + 2) return;
      ctx.globalAlpha = al * 0.55; ctx.strokeStyle = cLn; ctx.lineWidth = 1; ctx.setLineDash([]);
      if (v !== 0) { ctx.beginPath(); ctx.moveTo(L, Math.round(y) + 0.5); ctx.lineTo(R, Math.round(y) + 0.5); ctx.stroke(); }
      var f = 1;
      tags.forEach(function (t) { var ta = t.s.a * t.s.tagA; if (ta > 0.01) f = Math.min(f, 1 - ta * (1 - clamp((Math.abs(t.ty - y) - 15) / 6, 0, 1))); });
      if (f <= 0.01) return;
      ctx.globalAlpha = al * f; ctx.fillStyle = cT3; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(pct(v, list.st < 1 || list.st % 1 ? 1 : 0), R + 6, y);
    });
  }
  function draw() {
    if (!sized) return;
    var cs = getComputedStyle(panel), g = function (n) { return cs.getPropertyValue(n).trim(); };
    var cT = g('--text'), cT3 = g('--text-3'), cLn = g('--line'), cS1 = g('--s1');
    var cmp = [g('--cmp-1'), g('--cmp-2'), g('--cmp-3')], ff = cs.fontFamily;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.font = '400 11px ' + ff;

    /* etiquetas de valor al borde derecho, separadas al menos 18 px */
    var vis = S.filter(function (s) { return s.on || s.a > 0.01; }), tags = [];
    vis.forEach(function (s) { tags.push({ s: s, y: Y(s.cur[M - 1]), ty: 0 }); });
    tags.sort(function (a, b) { return a.y - b.y; });
    var n = tags.length, i;
    for (i = 0; i < n; i++) { tags[i].ty = i ? Math.max(tags[i].y, tags[i - 1].ty + 18) : Math.max(tags[0].y, T); }
    for (i = n - 1; i >= 0; i--) { var mx = H - 12 - (n - 1 - i) * 18; if (tags[i].ty > mx) tags[i].ty = mx; }

    /* rejilla y eje Y (derecha): los ticks viejos se funden con los nuevos */
    var shared = {}; tkTo.v.forEach(function (v) { shared[v] = 1; });
    if (tkFrom !== tkTo) drawTicks(tkFrom, cT3, cLn, function (v) { return shared[v] ? 0 : 1 - me; }, tags);
    drawTicks(tkTo, cT3, cLn, function (v) { return tkFrom !== tkTo && !tkFrom.v.some(function (x) { return x === v; }) ? me : 1; }, tags);
    ctx.globalAlpha = 1;
    /* línea base 0 % */
    var y0 = Y(0);
    if (y0 >= T - 2 && y0 <= B + 2) { ctx.strokeStyle = cT3; ctx.globalAlpha = 0.7; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(L, Math.round(y0) + 0.5); ctx.lineTo(R, Math.round(y0) + 0.5); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    /* eje X */
    ctx.fillStyle = cT3; ctx.textBaseline = 'alphabetic'; var lastTxt = '';
    for (i = 0; i < 5; i++) {
      var ix = Math.round(i * (P - 1) / 4), tx = L + ix / (P - 1) * (R - L), tt = P <= 63 ? dateOf(ix) : monthOf(ix);
      if (tt === lastTxt) continue; lastTxt = tt;
      ctx.textAlign = i === 0 ? 'left' : i === 4 ? 'right' : 'center'; ctx.fillText(tt, tx, H - 6);
    }

    /* líneas */
    vis.forEach(function (s) {
      var al = s.a * (1 - 0.7 * s.dim); if (al <= 0.01 || s.ent <= 0.001) return;
      ctx.save();
      if (s.ent < 1) { ctx.beginPath(); ctx.rect(0, 0, L + (R - L) * s.ent + 1, H); ctx.clip(); }
      ctx.strokeStyle = cmp[s.slot < 0 ? 0 : s.slot]; ctx.globalAlpha = al; ctx.lineWidth = 1.75 + 0.75 * s.hi;
      ctx.beginPath();
      for (var k = 0; k < M; k++) { var x = L + k / (M - 1) * (R - L), y = Y(s.cur[k]); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke(); ctx.restore();
    });
    ctx.globalAlpha = 1;

    /* cursor */
    if (hov != null) {
      var cx = L + hov / (P - 1) * (R - L), f = hov / (P - 1) * (M - 1), f0 = Math.floor(f), f1 = Math.min(M - 1, f0 + 1);
      ctx.strokeStyle = cT3; ctx.globalAlpha = 0.6; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(Math.round(cx) + 0.5, T); ctx.lineTo(Math.round(cx) + 0.5, B); ctx.stroke();
      vis.forEach(function (s) {
        if (s.a < 0.5) return;
        var v = s.cur[f0] + (s.cur[f1] - s.cur[f0]) * (f - f0), y = Y(v);
        ctx.globalAlpha = 1; ctx.fillStyle = cS1; ctx.beginPath(); ctx.arc(cx, y, 4.5, 0, 6.2832); ctx.fill();
        ctx.fillStyle = cmp[s.slot < 0 ? 0 : s.slot]; ctx.beginPath(); ctx.arc(cx, y, 3, 0, 6.2832); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    /* etiquetas (píldoras) */
    ctx.font = '500 11px ' + ff; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    tags.forEach(function (t) {
      var s = t.s, al = s.a * s.tagA * (1 - 0.6 * s.dim); if (al <= 0.01) return;
      var txt = pct(s.cur[M - 1], 1), w = Math.ceil(ctx.measureText(txt).width) + 12, x = R + 4, y = t.ty - 9;
      ctx.globalAlpha = al; rr(x + 0.5, y + 0.5, w, 18, 5); ctx.fillStyle = cS1; ctx.fill();
      ctx.strokeStyle = cmp[s.slot < 0 ? 0 : s.slot]; ctx.lineWidth = 1.25; ctx.stroke();
      ctx.fillStyle = cT; ctx.fillText(txt, x + 6.5, t.ty + 0.5);
    });
    ctx.globalAlpha = 1;
  }
  function tick(now) {
    raf = 0;
    var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now;
    if (!sized) layout();
    var busy = step(dt, now); draw(); dirty = false;
    if (busy && canRun()) raf = requestAnimationFrame(tick);
  }
  function startEntrance() {
    layout();
    var red = mqReduce.matches, rank = 0;
    t0 = performance.now();
    S.forEach(function (s) { s.delay = red || !s.on ? 0 : (rank++) * 60; });
    S.forEach(function (s) { s.ent = red || !s.on ? 1 : 0; s.tagA = red || !s.on ? 1 : 0; });
    schedule();
  }

  /* ---------- observadores ---------- */
  var entered = false;
  var ro = new ResizeObserver(function () {
    var ok = layout();
    if (ok && !entered) { entered = true; startEntrance(); return; }
    dirty = true; schedule();
  });
  ro.observe(stage);
  new MutationObserver(function () { schedule(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { onscreen = en[en.length - 1].isIntersecting; if (onscreen && dirty) schedule(); }).observe(panel);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) schedule(); });

  syncRows(); retarget(false);
  if (layout()) { entered = true; startEntrance(); }
})();
