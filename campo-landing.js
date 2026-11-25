/* Portify · Campo · landing (index.html). Un solo IIFE.
   Real: precios y gráficas de mercados (API de Portify / Yahoo Finance, con respaldo de tickers-data.js), planes (planes.html).
   Ilustrativo: portafolio de ejemplo (velas del héroe y gráfica del producto), de campo-landing-data.js. */
(function () {
  'use strict';
  var CL = window.CAMPO_LANDING; if (!CL) return;
  var F = CL.fmt, S = CL.series;
  var root = document.documentElement, doc = document;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var rmq = matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = function () { return rmq.matches; };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var mxn0 = function (v) { return F.mxn(v, 0); };
  var smxn = function (v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + F.mxn(Math.abs(v), 0); };
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function sdelta(cls, v, text) { return '<span class="delta ' + cls + '"><i class="arw" aria-hidden="true">' + (v > 0 ? '▲' : v < 0 ? '▼' : '▪') + '</i><span>' + text + '</span></span>'; }
  function deltaHTML(v, text) { return sdelta(v > 0 ? 'gain' : v < 0 ? 'loss' : 'flat', v, text); }
  function delta(el, v, text) { el.className = 'delta ' + (v > 0 ? 'gain' : v < 0 ? 'loss' : 'flat'); el.innerHTML = '<i class="arw" aria-hidden="true">' + (v > 0 ? '▲' : v < 0 ? '▼' : '▪') + '</i><span>' + text + '</span>'; }

  /* ================= curvas, ticker de cuadros, interpolación ================= */
  function bez(x1, y1, x2, y2) {
    return function (t) {
      if (t <= 0) return 0; if (t >= 1) return 1;
      var lo = 0, hi = 1, u = t;
      for (var i = 0; i < 24; i++) {
        var x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
        if (Math.abs(x - t) < 1e-4) break;
        if (x < t) lo = u; else hi = u; u = (lo + hi) / 2;
      }
      return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
    };
  }
  var easeOut = bez(0.23, 1, 0.32, 1);
  var ticks = new Set(), raf = 0;
  function loop(now) {
    raf = 0;
    Array.from(ticks).forEach(function (f) { if (f(now) === false) ticks.delete(f); });
    if (ticks.size) raf = requestAnimationFrame(loop);
  }
  function addTick(f) { ticks.add(f); if (!raf) raf = requestAnimationFrame(loop); }
  function tween(dur, ease, fn, done) {
    var t0 = performance.now(), alive = true;
    addTick(function (now) {
      if (!alive) return false;
      var p = Math.min(1, (now - t0) / dur); fn(ease(p), p);
      if (p >= 1) { alive = false; if (done) done(); return false; }
      return true;
    });
    return function () { alive = false; };
  }

  /* ================= color desde tokens (resuelve oklch a rgb con un lienzo de 1 px) ================= */
  var probe = doc.createElement('i'); probe.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden;pointer-events:none'; doc.body.appendChild(probe);
  var c1 = doc.createElement('canvas'); c1.width = c1.height = 1;
  var c1x = c1.getContext('2d', { willReadFrequently: true });
  var ccache = {};
  function cvar(name) {
    if (ccache[name]) return ccache[name];
    probe.style.color = 'var(' + name + ')';
    var s = getComputedStyle(probe).color;
    c1x.clearRect(0, 0, 1, 1); c1x.fillStyle = '#000'; c1x.fillStyle = s; c1x.fillRect(0, 0, 1, 1);
    var d = c1x.getImageData(0, 0, 1, 1).data;
    return (ccache[name] = [d[0], d[1], d[2], d[3] / 255]);
  }
  function rgba(n, a) { var c = typeof n === 'string' ? cvar(n) : n; return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a * c[3]).toFixed(3) + ')'; }

  /* ================= segmentado con pastilla ================= */
  function seg(el, items, active, onChange) {
    var pill = el.querySelector('.seg-pill') || el.appendChild(Object.assign(doc.createElement('i'), { className: 'seg-pill' }));
    if (items) { $$('button', el).forEach(function (b) { b.remove(); }); items.forEach(function (it) { var b = doc.createElement('button'); b.type = 'button'; b.dataset.v = it.v; b.textContent = it.l; el.insertBefore(b, pill); }); }
    var btns = $$('button', el); el.style.setProperty('--n', btns.length);
    function set(v, silent) {
      btns.forEach(function (b, i) { var on = b.dataset.v === v; b.setAttribute('aria-pressed', on); if (on) el.style.setProperty('--i', i); });
      if (!silent && onChange) onChange(v);
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { set(b.dataset.v); }); });
    set(active, true);
    return { set: set };
  }

  /* ================= tema (clave de producción bp-theme: 'light' | 'dark'; sin clave = sistema) ================= */
  var repaints = [];
  var lightMq = matchMedia('(prefers-color-scheme: light)');
  function storedTheme() { try { var t = localStorage.getItem('bp-theme'); return t === 'light' || t === 'dark' ? t : null; } catch (e) { return null; } }
  function sysTheme() { return lightMq.matches ? 'light' : 'dark'; }
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    ccache = {}; repaints.forEach(function (f) { f(); });
  }

  /* ================= héroe: velas semanales que se dibujan ================= */
  var candles = (function () {
    var DUR = 220, DUR_OUT = 140, STAG = 30;
    /* Velas semanales a partir de los cierres diarios del portafolio de ejemplo (ilustrativo).
       Semana ISO (se agrupa por lunes). O = cierre de la semana anterior (la primera abre en su primer cierre);
       C = último cierre; H y L = máximo y mínimo de los cierres, ampliados para incluir O. Sin datos intradía. */
    var W = [], byKey = {};
    S.dates.forEach(function (d, i) {
      var t = Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)), c = S.portfolio[i];
      var key = t - ((new Date(t).getUTCDay() + 6) % 7) * 864e5, w = byKey[key];
      if (!w) { w = byKey[key] = { first: c, h: c, l: c, c: c, d: d }; W.push(w); }
      else { w.h = Math.max(w.h, c); w.l = Math.min(w.l, c); w.c = c; w.d = d; }
    });
    W.forEach(function (w, i) {
      w.o = i ? W[i - 1].c : w.first; w.h = Math.max(w.h, w.o); w.l = Math.min(w.l, w.o);
      w.chg = w.c - w.o; w.pct = w.chg / w.o * 100;
    });
    var N = W.length, last = W[N - 1];
    var ma = W.map(function (w, i) { if (i < 9) return null; var s = 0; for (var k = i - 9; k <= i; k++) s += W[k].c; return s / 10; });
    var dMin = Infinity, dMax = -Infinity;
    W.forEach(function (w) { dMin = Math.min(dMin, w.l); dMax = Math.max(dMax, w.h); });
    var padV = (dMax - dMin) * 0.06; dMin -= padV; dMax += padV;
    var yTicks = [];
    function niceTicks(n) {
      var raw = (dMax - dMin) / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), step = mag;
      [1, 2, 2.5, 5, 10].some(function (m) { step = m * mag; return step >= raw; });
      yTicks = []; for (var tv = Math.ceil(dMin / step) * step; tv <= dMax; tv += step) yTicks.push(tv);
    }
    function dlabel(w) { var d = w.d; return +d.slice(8) + ' ' + MES[+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4); }

    var box = $('#cdPlot'), cv = $('#candleCv'), ctx = cv.getContext('2d');
    var yEl = $('#cdY'), xEl = $('#cdX'), tagLast = $('#tagLast'), tagY = $('#tagY'), tagX = $('#tagX'), live = $('#cdLive');
    var oh = { date: $('#ohDate'), o: $('#ohO'), h: $('#ohH'), l: $('#ohL'), c: $('#ohC'), chg: $('#ohChg') };

    /* cada vela tiene un valor visual 0..1 que viaja hacia su objetivo (1 dibujada / 0 borrada). Se dibuja SOLO con puntero, toque o teclado; en reposo se ve el primer ~20 %. */
    var REST = Math.max(1, Math.ceil(N * 0.2));
    var A0 = [], A1 = [], AT = [], AD = [], tc = 0, busy = 0, hideT = 0;
    for (var q0 = 0; q0 < N; q0++) { A0.push(0); A1.push(0); AT.push(0); AD.push(1); }
    var cross = { on: false, x: 0, y: 0, idx: -1 }, shown = -2;
    var L = { w: 0, h: 0, dpr: 1, x0: 0, x1: 0, y0: 0, y1: 0, slot: 1, bw: 3, months: [] };
    var X = function (i) { return L.x0 + (i + 0.5) * L.slot; };
    var Y = function (v) { return L.y1 - (v - dMin) / (dMax - dMin) * (L.y1 - L.y0); };
    var inv = function (y) { return dMin + (L.y1 - y) / (L.y1 - L.y0) * (dMax - dMin); };

    function layout() {
      var w = box.clientWidth, h = box.clientHeight; if (!w || !h) return false;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      L.w = w; L.h = h; L.dpr = dpr; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      L.x0 = 4; L.x1 = w - (w < 480 ? 66 : 78); L.y0 = 10; L.y1 = h - 26; L.slot = (L.x1 - L.x0) / N;
      var bw = Math.floor(L.slot * 0.64); bw = Math.max(3, bw % 2 ? bw : bw - 1); L.bw = bw;
      niceTicks(Math.max(4, Math.round((L.y1 - L.y0) / 40)));
      yEl.textContent = ''; xEl.textContent = '';
      yTicks.forEach(function (v) { var s = doc.createElement('span'); s.style.top = Y(v).toFixed(1) + 'px'; s.style.left = (L.x1 + 8) + 'px'; s.textContent = mxn0(v); yEl.appendChild(s); });
      L.months = []; var lastX = -99, pm = -1;
      W.forEach(function (wk, i) {
        var m = +wk.d.slice(5, 7) - 1; if (m === pm) return; pm = m;
        var x = X(i); if (x - lastX < 56 || x > L.x1 - 14) return; lastX = x;
        var s = doc.createElement('span'); s.style.left = Math.max(x, 26).toFixed(1) + 'px'; s.textContent = MES[m] + (m === 0 || !L.months.length ? ' ' + wk.d.slice(0, 4) : ''); xEl.appendChild(s); L.months.push(x);
      });
      tagLast.style.left = tagY.style.left = (L.x1 + 4) + 'px'; tagLast.style.top = Y(last.c).toFixed(1) + 'px';
      tagLast.textContent = mxn0(last.c); tagLast.style.minWidth = tagY.style.minWidth = (w - L.x1 - 8) + 'px';
      return true;
    }

    var anim = function (i, now) { if (now <= AT[i]) return A0[i]; return A0[i] + (A1[i] - A0[i]) * easeOut(clamp((now - AT[i]) / AD[i], 0, 1)); };

    function paint(now) {
      if (!L.w) return;
      ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0); ctx.clearRect(0, 0, L.w, L.h);
      var xr = L.x1 + 4;
      ctx.lineWidth = 1; ctx.strokeStyle = rgba('--grid', 1); ctx.beginPath();
      yTicks.forEach(function (v) { var y = Math.round(Y(v)) + 0.5; ctx.moveTo(L.x0, y); ctx.lineTo(xr, y); });
      L.months.forEach(function (x) { var xx = Math.round(x) + 0.5; ctx.moveTo(xx, L.y0); ctx.lineTo(xx, L.y1); });
      ctx.stroke();
      ctx.beginPath(); var started = false, px = 0, py = 0;
      for (var i = 9; i < N; i++) {
        var a = anim(i, now); if (a <= 0) break;
        var x = X(i), y = Y(ma[i]);
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(px + (x - px) * a, py + (y - py) * a);
        px = x; py = y;
      }
      ctx.lineWidth = 1.25; ctx.lineJoin = 'round'; ctx.strokeStyle = rgba('--text-3', 0.85); ctx.stroke();
      var half = (L.bw - 1) / 2;
      for (var k = 0; k < N; k++) {
        var w = W[k], ak = anim(k, now); if (ak <= 0) continue;
        var cx = Math.round(X(k)), up = w.c >= w.o, tok = up ? '--gain' : '--loss';
        ctx.fillStyle = rgba(tok, clamp(ak * 2, 0, 1));
        var yh = Math.round(Y(w.o + (w.h - w.o) * ak)), yl = Math.round(Y(w.o + (w.l - w.o) * ak));
        ctx.fillRect(cx, yh, 1, Math.max(1, yl - yh));
        var yo = Y(w.o), yc = Y(w.o + (w.c - w.o) * ak), top = Math.round(Math.min(yo, yc)), bot = Math.round(Math.max(yo, yc));
        ctx.fillRect(cx - half, top, L.bw, Math.max(1, bot - top));
      }
      var la = anim(N - 1, now);
      if (la > 0.01) {
        var ly = Math.round(Y(last.c)) + 0.5;
        ctx.strokeStyle = rgba('--accent-ink', 0.9 * la); ctx.lineWidth = 1; ctx.setLineDash([1, 3]); ctx.beginPath(); ctx.moveTo(L.x0, ly); ctx.lineTo(xr, ly); ctx.stroke(); ctx.setLineDash([]);
      }
      if (cross.on) {
        var vx = Math.round(X(cross.idx)) + 0.5, hy = Math.round(clamp(cross.y, L.y0, L.y1)) + 0.5;
        ctx.strokeStyle = rgba('--accent-ink', 0.85); ctx.setLineDash([4, 4]); ctx.beginPath();
        ctx.moveTo(vx, L.y0); ctx.lineTo(vx, L.y1); ctx.moveTo(L.x0, hy); ctx.lineTo(xr, hy); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    function frame(now) { paint(now); return now < busy; }
    var request = function () { addTick(frame); };

    function showStrip(i) {
      if (i === shown) return; shown = i;
      var w = W[i];
      oh.date.textContent = 'Sem. al ' + dlabel(w);
      oh.o.textContent = mxn0(w.o); oh.h.textContent = mxn0(w.h); oh.l.textContent = mxn0(w.l); oh.c.textContent = mxn0(w.c);
      oh.chg.innerHTML = deltaHTML(w.chg, smxn(w.chg) + ' (' + F.pct(w.pct) + ')');
    }
    function sync() {
      tagLast.classList.toggle('on', tc >= N);
      if (cross.on) {
        cross.idx = clamp(cross.idx, 0, Math.max(0, tc - 1));
        showStrip(cross.idx);
        var w = W[cross.idx], hy = clamp(cross.y, L.y0, L.y1);
        tagY.textContent = mxn0(inv(hy)); tagY.style.top = hy.toFixed(1) + 'px'; tagY.classList.add('on');
        tagX.textContent = dlabel(w); tagX.classList.add('on');
        var hw = tagX.offsetWidth / 2; tagX.style.left = clamp(X(cross.idx), hw + 2, L.w - hw - 2).toFixed(1) + 'px'; tagX.style.top = (L.y1 + 6) + 'px';
      } else {
        tagY.classList.remove('on'); tagX.classList.remove('on'); showStrip(N - 1);
      }
      request();
    }

    function retarget(i, to, at, dur, now) {
      A0[i] = anim(i, now); A1[i] = to; AT[i] = at; AD[i] = dur;
      busy = Math.max(busy, at + dur + 40);
    }
    function setCount(n, leave) {
      n = clamp(Math.round(n), 0, N);
      var now = performance.now(), i;
      if (reduce()) { for (i = 0; i < N; i++) { A0[i] = A1[i] = 1; AT[i] = 0; AD[i] = 1; } tc = N; sync(); return; }
      if (n > tc) {
        var stepIn = Math.min(STAG, 360 / (n - tc));
        for (i = tc; i < n; i++) retarget(i, 1, now + (i - tc) * stepIn, DUR, now);
      } else if (n < tc) {
        var stepOut = leave ? Math.min(20, 460 / (tc - n)) : Math.min(8, 100 / (tc - n));
        for (i = tc - 1; i >= n; i--) retarget(i, 0, now + (tc - 1 - i) * stepOut, DUR_OUT, now);
      }
      tc = n; sync();
    }
    var toRest = function () { setCount(REST, true); };
    function rest() { cross.on = false; toRest(); }

    function pos(e) { var r = box.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function aim(e) {
      clearTimeout(hideT); var q = pos(e), idx = clamp(Math.floor((q.x - L.x0) / L.slot), 0, N - 1);
      setCount(Math.max(REST, idx + 1));
      cross.on = true; cross.y = q.y; cross.idx = idx; sync();
    }
    box.addEventListener('pointermove', aim);
    box.addEventListener('pointerdown', aim);
    box.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { clearTimeout(hideT); rest(); } });
    function release(e) { if (e.pointerType !== 'mouse') { clearTimeout(hideT); hideT = setTimeout(rest, 1200); } }
    box.addEventListener('pointerup', release); box.addEventListener('pointercancel', release);
    box.addEventListener('keydown', function (e) {
      var i = cross.on ? cross.idx : tc - 1, d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (e.key === 'Home') i = 0; else if (e.key === 'End') i = N - 1; else if (d) i = clamp(i + d, 0, N - 1); else return;
      e.preventDefault(); clearTimeout(hideT);
      setCount(Math.max(REST, i + 1));
      cross.on = true; cross.idx = i; cross.y = Y(W[i].c); sync();
      live.textContent = 'Semana al ' + dlabel(W[i]) + ': apertura ' + mxn0(W[i].o) + ', máximo ' + mxn0(W[i].h) + ', mínimo ' + mxn0(W[i].l) + ', cierre ' + mxn0(W[i].c) + '.';
    });
    box.addEventListener('blur', function () { clearTimeout(hideT); rest(); });

    new ResizeObserver(function () { if (layout()) { shown = -2; sync(); } }).observe(box);
    repaints.push(function () { request(); });
    rmq.addEventListener('change', function () { if (reduce()) setCount(N); else toRest(); });

    return { start: function () { layout(); if (reduce()) setCount(N); else setCount(REST); sync(); } };
  })();

  /* entrada del texto del héroe, una sola vez */
  (function heroIntro() {
    $$('.hero-copy > *').forEach(function (e, i) { e.style.setProperty('--k', i); });
    candles.start();
    if (reduce()) return;
    doc.body.classList.add('intro');
    setTimeout(function () { doc.body.classList.remove('intro'); }, 1100);
  })();

  /* ================= gráfica: portafolio de ejemplo frente a un índice ilustrativo ================= */
  var NP = { '1M': 21, '3M': 63, '6M': 126, '1A': 252 }, R = 120;
  function build(p) {
    var n = Math.min(NP[p], S.dates.length), st = S.dates.length - n, port = S.portfolio.slice(st), b = S.benchmark.slice(st);
    return { n: n, dates: S.dates.slice(st), port: port, bench: b, pr: port.map(function (v) { return (v / port[0] - 1) * 100; }), br: b.map(function (v) { return (v / b[0] - 1) * 100; }) };
  }
  function resample(a) { var out = [], n = a.length - 1; for (var i = 0; i < R; i++) { var x = i / (R - 1) * n, k = Math.floor(x), f = x - k; out.push(a[k] + ((a[Math.min(k + 1, n)] - a[k]) * f)); } return out; }
  function fdate(s) { var d = new Date(s + 'T12:00:00'); return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', ''); }
  function fshort(s) { var d = new Date(s + 'T12:00:00'); return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', ''); }

  function PerfChart(host) {
    host.appendChild($('#tplChart').content.cloneNode(true));
    this.root = host; this.cv = $('canvas', host); this.ctx = this.cv.getContext('2d');
    $$('[data-bname]', host).forEach(function (e) { e.textContent = S.benchmarkName; });
    this.period = '1A'; this.cur = build('1A'); this.disp = null; this.hover = null; this.w = 0; this.h = 0; this.stop = null;
    var self = this;
    this.seg = seg($('.periods', host), Object.keys(NP).map(function (k) { return { v: k, l: k }; }), '1A', function (p) { self.setPeriod(p); });
    new ResizeObserver(function () { self.resize(); }).observe(this.cv);
    this.cv.addEventListener('pointermove', function (e) { self.pointer(e); });
    this.cv.addEventListener('pointerdown', function (e) { self.pointer(e); });
    this.cv.addEventListener('pointerleave', function () { self.hover = null; self.ro(); self.draw(); });
    this.cv.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; e.preventDefault();
      self.hover = clamp((self.hover == null ? self.cur.n - 1 : self.hover) + d * (e.shiftKey ? 5 : 1), 0, self.cur.n - 1); self.ro(); self.draw();
    });
    this.cv.addEventListener('blur', function () { self.hover = null; self.ro(); self.draw(); });
    repaints.push(function () { self.draw(); });
    this.ro();
  }
  PerfChart.prototype.pad = { l: 6, r: 50, t: 10, b: 22 };
  PerfChart.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), w = this.cv.clientWidth, h = this.cv.clientHeight; if (!w) return;
    this.w = w; this.h = h; this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr); this.dpr = dpr; this.draw();
  };
  PerfChart.prototype.pointer = function (e) {
    var r = this.cv.getBoundingClientRect(), p = this.pad, x = (e.clientX - r.left - p.l) / (r.width - p.l - p.r);
    this.hover = clamp(Math.round(x * (this.cur.n - 1)), 0, this.cur.n - 1); this.ro(); this.draw();
  };
  PerfChart.prototype.ro = function () {
    var c = this.cur, i = this.hover == null ? c.n - 1 : this.hover, q = function (k) { return $('[data-ro="' + k + '"]', this.root); }.bind(this);
    q('date').textContent = fdate(c.dates[i]);
    q('port').textContent = mxn0(c.port[i]);
    var pd = c.pr[i], bd = c.br[i], df = pd - bd;
    delta(q('portd'), pd, F.pct(pd)); delta(q('bench'), bd, F.pct(bd)); delta(q('diff'), df, F.pct(df).replace(' %', ' pts'));
  };
  PerfChart.prototype.setPeriod = function (p) {
    if (p === this.period) return;
    var from = { p: resample(this.disp ? this.disp.p : this.cur.pr), b: resample(this.disp ? this.disp.b : this.cur.br) };
    this.period = p; this.cur = build(p); this.hover = null; this.ro();
    var to = { p: resample(this.cur.pr), b: resample(this.cur.br) }, self = this;
    if (this.stop) this.stop();
    if (reduce()) { this.disp = null; this.draw(); return; }
    this.stop = tween(380, easeOut, function (e) {
      self.disp = { p: from.p.map(function (v, i) { return v + (to.p[i] - v) * e; }), b: from.b.map(function (v, i) { return v + (to.b[i] - v) * e; }) };
      self.draw();
    }, function () { self.disp = null; self.draw(); });
  };
  function nice(step) { var m = Math.pow(10, Math.floor(Math.log10(step))), r = step / m; return (r < 1.5 ? 1 : r < 3.5 ? 2 : r < 7.5 ? 5 : 10) * m; }
  PerfChart.prototype.draw = function () {
    if (!this.w) return;
    var ctx = this.ctx, w = this.w, h = this.h, p = this.pad, c = this.cur, dsp = this.disp, dpr = this.dpr;
    var pa = dsp ? dsp.p : c.pr, ba = dsp ? dsp.b : c.br, n = pa.length;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    var mn = Math.min(Math.min.apply(null, pa), Math.min.apply(null, ba), 0), mx = Math.max(Math.max.apply(null, pa), Math.max.apply(null, ba), 0), pad = (mx - mn) * 0.1 || 1; mn -= pad; mx += pad;
    var pw = w - p.l - p.r, ph = h - p.t - p.b;
    var X = function (i) { return p.l + i / (n - 1) * pw; }, Y = function (v) { return p.t + (1 - (v - mn) / (mx - mn)) * ph; };
    ctx.font = '11.5px "Plus Jakarta Sans", system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    var step = nice((mx - mn) / 4), v0 = Math.ceil(mn / step) * step;
    for (var v = v0; v <= mx; v += step) {
      var y = Y(v); ctx.strokeStyle = rgba('--grid', 1); ctx.lineWidth = 1; ctx.setLineDash([]);
      if (Math.abs(v) < step / 1000) { ctx.setLineDash([3, 4]); ctx.strokeStyle = rgba('--text-3', 0.5); }
      ctx.beginPath(); ctx.moveTo(p.l, Math.round(y) + 0.5); ctx.lineTo(w - p.r, Math.round(y) + 0.5); ctx.stroke();
      ctx.fillStyle = rgba('--text-3', 1); ctx.fillText(F.pct(Math.abs(v) < step / 1000 ? 0 : v, 0), w - p.r + 8, y);
    }
    ctx.setLineDash([]);
    ctx.fillStyle = rgba('--text-3', 1); ctx.textBaseline = 'alphabetic';
    var ds = c.dates, labs = [0, Math.floor(ds.length / 2), ds.length - 1];
    labs.forEach(function (i, k) { ctx.textAlign = k === 0 ? 'left' : k === 2 ? 'right' : 'center'; ctx.fillText(fshort(ds[i]), p.l + i / (ds.length - 1) * pw, h - 5); });
    var g = ctx.createLinearGradient(0, p.t, 0, p.t + ph); g.addColorStop(0, rgba('--accent', 0.26)); g.addColorStop(1, rgba('--accent', 0));
    ctx.beginPath(); pa.forEach(function (v, i) { i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)); });
    ctx.lineTo(X(n - 1), Y(Math.max(mn, 0) > 0 ? mn : 0)); ctx.lineTo(X(0), Y(Math.max(mn, 0) > 0 ? mn : 0)); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    function line(a, col, wd) { ctx.beginPath(); a.forEach(function (v, i) { i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)); }); ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
    line(ba, rgba('--text-3', 0.95), 1.5); line(pa, rgba('--accent-ink', 1), 2.2);
    if (this.hover != null && !dsp) {
      var i = this.hover, xx = X(i);
      ctx.strokeStyle = rgba('--text-2', 0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(Math.round(xx) + 0.5, p.t); ctx.lineTo(Math.round(xx) + 0.5, p.t + ph); ctx.stroke();
      [[c.br[i], '--text-3'], [c.pr[i], '--accent-ink']].forEach(function (d) { ctx.beginPath(); ctx.arc(xx, Y(d[0]), 4, 0, 6.2832); ctx.fillStyle = rgba('--s1', 1); ctx.fill(); ctx.strokeStyle = rgba(d[1], 1); ctx.lineWidth = 2; ctx.stroke(); });
    }
  };
  new PerfChart($('#lpChart'));

  /* ================= mercados: precios REALES (API de Portify, Yahoo Finance) con respaldo estático ================= */
  var API_PROD = 'https://blackportfolio-api-production.up.railway.app';
  var LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  var BASES = LOCAL ? ['http://127.0.0.1:8000', API_PROD] : [API_PROD];
  function apiGet(path) {
    var i = 0;
    function attempt() {
      if (i >= BASES.length) return Promise.reject(new Error('sin servidor'));
      var url = BASES[i++] + path, ctl = window.AbortController ? new AbortController() : null, t = ctl ? setTimeout(function () { ctl.abort(); }, 9000) : 0;
      return fetch(url, ctl ? { signal: ctl.signal } : undefined).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('http ' + r.status); return r.json(); }).catch(function () { clearTimeout(t); return attempt(); });
    }
    return attempt();
  }

  /* marcas propias (no son marcas registradas): círculo tintado + monograma */
  function markSvg(m, size) {
    var g;
    if (m.k === 'fx') g = '<circle class="cmk-fa" cx="13.5" cy="18" r="8.5"/><circle class="cmk-fb" cx="22.5" cy="18" r="8.5"/>';
    else if (m.k === 'btc') g = '<path class="cmk-s" d="M14.6 11.2H19.6a3.2 3.2 0 0 1 0 6.4H14.6M14.6 17.6H20.4a3.4 3.4 0 0 1 0 6.8H14.6V11.2M17.2 8.6v2.6M20.6 8.6v2.6M17.2 24.4V27M20.6 24.4V27"/>';
    else if (m.k === 'n') g = '<text class="cmk-t" x="18" y="11.6" font-size="7.4" text-anchor="middle" dy=".35em">N</text><text class="cmk-t" x="18" y="22.4" font-size="12.6" text-anchor="middle" dy=".35em">' + m.t + '</text>';
    else g = '<text class="cmk-t" x="18" y="18" font-size="' + (m.t.length === 1 ? 17 : m.t.length === 2 ? 15 : 12.8) + '" text-anchor="middle" dy=".35em">' + m.t + '</text>';
    return '<svg class="cmk cmk-' + m.cls + '" width="' + size + '" height="' + size + '" viewBox="0 0 36 36" aria-hidden="true" focusable="false"><circle class="cmk-b" cx="18" cy="18" r="18"/>' + g + '</svg>';
  }
  /* s: símbolo Yahoo; fb: símbolo equivalente en tickers-data.js (respaldo); pp: el cambio se da en puntos porcentuales (rendimiento) */
  var MK = [
    { s: '^GSPC',   n: 'S&P 500',          u: 'pts',    d: 2, fb: '^GSPC',   m: { cls: 'idx', k: 't', t: '500' } },
    { s: '^NDX',    n: 'Nasdaq 100',       u: 'pts',    d: 2, fb: '^IXIC', fbn: 'Nasdaq Composite', m: { cls: 'idx', k: 'n', t: '100' } },
    { s: '^MXX',    n: 'S&P/BMV IPC',      u: 'pts',    d: 2, m: { cls: 'idx', k: 't', t: 'IPC' } },
    { s: 'MXN=X',   n: 'Dólar (USD/MXN)',  u: 'MXN',    d: 4, note: 'Pesos mexicanos por cada dólar.', m: { cls: 'fx', k: 'fx' } },
    { s: 'BTC-USD', n: 'Bitcoin',          u: 'USD',    d: 0, fb: 'BTC-USD', m: { cls: 'crypto', k: 'btc' } },
    { s: 'GC=F',    n: 'Oro',              u: 'USD/oz', d: 2, fb: 'GC=F',    note: 'Futuro del oro, dólares por onza troy.', m: { cls: 'cmdty', k: 't', t: 'Au' } },
    { s: '^TNX',    n: 'Bono 10a EE. UU.', u: '%',      d: 2, pp: true,     note: 'Rendimiento anual en %. El cambio se da en puntos porcentuales.', m: { cls: 'debt', k: 't', t: '10A' } }
  ];
  var PERIODS = [['1S', 5, '1 semana'], ['1M', 21, '1 mes'], ['3M', 1e9, '3 meses']];

  (function markets() {
    var host = $('#mkt'); if (!host) return;
    var nfs = {};
    function fmtN(v, dec) { return (nfs[dec] || (nfs[dec] = new Intl.NumberFormat('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec }))).format(v); }
    function dShort(d) { return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', ''); }
    function dLong(d) { return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '').replace(/ de /g, ' '); }
    function clock(d) { return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }); }
    function chgHTML(mk, v) { return mk.pp ? sdelta(v > 0 ? 'gain' : v < 0 ? 'loss' : 'flat', v, (v > 0 ? '+' : v < 0 ? '−' : '') + fmtN(Math.abs(v), 2) + ' pp') : deltaHTML(v, F.pct(v)); }
    function px(mk, v) { return '<span class="mkt-px"><b class="num">' + fmtN(v, mk.d) + '</b>' + (mk.u ? '<small class="u">' + esc(mk.u) + '</small>' : '') + '</span>'; }

    var mode = 'loading', quotes = {}, items = [], stamp = null, cachedNote = '', stale = false;
    var sel = 0, per = 1, hover = -1, built = false, started = false;
    var charts = {};   /* símbolo -> { st: 'loading' | 'ok' | 'err', ds, vals } */
    var el = {};

    /* ---- datos de precios ---- */
    function normLive(j) {
      var map = {}, n = 0;
      MK.forEach(function (mk) { var e = j && j[mk.s]; if (e && typeof e.price === 'number' && isFinite(e.price)) { map[mk.s] = { price: e.price, prev: typeof e.prev === 'number' ? e.prev : (typeof e.previousClose === 'number' ? e.previousClose : null) }; n++; } });
      return n ? map : null;
    }
    function cachedMap() {
      var T = window.TICKERS_DATA, map = {}, n = 0; if (!T || !T.tickers) return null;
      var by = {}; T.tickers.forEach(function (t) { by[t.symbol] = t; });
      MK.forEach(function (mk) { var t = mk.fb && by[mk.fb]; if (t && typeof t.price === 'number') { map[mk.s] = { price: t.price, prev: typeof t.previousClose === 'number' ? t.previousClose : null }; n++; } });
      if (!n) return null;
      var d = T.updatedAt ? new Date(T.updatedAt) : null;
      cachedNote = d && !isNaN(d) ? 'Cierre del ' + d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) + ' · sin conexión al servidor de precios' : 'Cierre anterior · sin conexión al servidor de precios';
      return map;
    }
    function quote(mk) { return quotes[mk.s] || null; }
    function chg(mk) { var q = quote(mk); if (!q || q.prev == null || !q.prev) return null; return mk.pp ? q.price - q.prev : (q.price - q.prev) / q.prev * 100; }
    function name(mk) { return mode === 'cached' && mk.fbn ? mk.fbn : mk.n; }
    function srcLabel() {
      if (mode === 'live') return 'En vivo · Yahoo Finance, puede tener retraso' + (stamp ? ' · ' + clock(stamp) : '') + (stale ? ' · sin actualizar' : '');
      return cachedNote;
    }

    function loadPrices() {
      var path = '/api/prices?symbols=' + MK.map(function (m) { return encodeURIComponent(m.s); }).join(',');
      return apiGet(path).then(function (j) {
        var map = normLive(j); if (!map) throw new Error('vacío');
        quotes = map; stamp = new Date(); stale = false; setMode('live');
      }).catch(function () {
        if (mode === 'live') { stale = true; if (el.sub) el.sub.textContent = srcLabel(); return; }
        if (mode !== 'loading') return;
        var cm = cachedMap();
        if (cm) { quotes = cm; setMode('cached'); } else setMode('none');
      });
    }

    function setMode(m) {
      var changed = m !== mode; mode = m; host.setAttribute('aria-busy', 'false');
      if (m === 'none') { host.innerHTML = '<p class="mkt-empty">Los mercados no están disponibles en este momento. Intenta de nuevo más tarde.</p>'; built = false; return; }
      var prevSym = items[sel] && items[sel].s;
      items = MK.filter(function (mk) { return m === 'live' || quotes[mk.s]; });
      if (!built || changed) { var k = items.map(function (x) { return x.s; }).indexOf(prevSym); sel = k < 0 ? 0 : k; build(); }
      else updateCards();
    }

    /* ---- estructura ---- */
    function build() {
      built = true; hover = -1;
      host.innerHTML = '<div class="mkt-band" role="group" aria-label="Mercados"></div>' +
        '<div class="mkt-main"><div class="mkt-head"><div class="mkt-id"><span class="mkt-mark"></span><div><h3 class="mkt-name"></h3><span class="mkt-sub"></span></div></div><div class="mkt-ro"></div></div>' +
        '<div class="mkt-cv"><canvas tabindex="0" role="img"></canvas><div class="mkt-state" role="status"></div></div>' +
        '<div class="mkt-per" role="group" aria-label="Periodo del gráfico"></div>' +
        '<p class="mkt-note"></p><span class="sr" aria-live="polite"></span></div>';
      el.band = $('.mkt-band', host); el.per = $('.mkt-per', host); el.ro = $('.mkt-ro', host); el.cv = $('canvas', host); el.cvBox = $('.mkt-cv', host);
      el.state = $('.mkt-state', host); el.sub = $('.mkt-sub', host); el.note = $('.mkt-note', host); el.live = $('.sr', host); el.mark = $('.mkt-mark', host); el.name = $('.mkt-name', host);
      el.cards = items.map(function (mk, i) {
        var b = doc.createElement('button'); b.type = 'button'; b.className = 'mkc';
        b.setAttribute('aria-pressed', i === sel ? 'true' : 'false'); b.tabIndex = i === sel ? 0 : -1;
        b.innerHTML = '<span class="mkc-top">' + markSvg(mk.m, 24) + '<span class="mkc-name">' + esc(name(mk)) + '</span></span><span class="mkc-val"></span>';
        b.addEventListener('click', function () { select(i); });
        el.band.appendChild(b); return b;
      });
      el.band.addEventListener('keydown', function (e) { rove(el.cards, e); });
      el.per.addEventListener('keydown', function (e) { rove($$('button', el.per), e); });
      ctx = el.cv.getContext('2d'); A = B = null; anim = null;
      el.cv.addEventListener('pointermove', function (e) { if (B) hv(at(e)); });
      el.cv.addEventListener('pointerdown', function (e) { if (B) hv(at(e)); });
      el.cv.addEventListener('pointerleave', function () { hv(-1); });
      el.cv.addEventListener('blur', function () { hv(-1); });
      el.cv.addEventListener('keydown', onKey);
      if (ro) ro.disconnect();
      if ('ResizeObserver' in window) { ro = new ResizeObserver(size); ro.observe(el.cvBox); }
      updateCards(); head(); chartState(); paintPer(); readout(); label(); size(); setView(false);
      if (started) loadChart(); else if (visible()) { started = true; loadChart(); }
    }
    function rove(list, e) {
      var i = list.indexOf(doc.activeElement); if (i < 0) return;
      var j = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : -1;
      if (j < 0) return; e.preventDefault(); list[(j + list.length) % list.length].focus();
    }
    function updateCards() {
      items.forEach(function (mk, i) {
        var q = quote(mk), v = chg(mk), card = el.cards[i], val = $('.mkc-val', card);
        $('.mkc-name', card).textContent = name(mk);
        val.innerHTML = q ? px(mk, q.price) + (v == null ? '' : chgHTML(mk, v)) : '<span class="na">Sin dato</span>';
      });
      if (el.sub) { el.sub.textContent = srcLabel(); head(); readout(); }
    }

    /* ---- gráfica de la selección ---- */
    var ctx = null, W = 0, H = 0, dpr = 1, PL = 2, PR = 62, PT = 14, PB = 26, ff = '', A = null, B = null, anim = null, rafc = 0, ro = null, io = null;
    var DUR = 260, RES = 96;
    function curChart() { var mk = items[sel]; return mk && charts[mk.s] && charts[mk.s].st === 'ok' ? charts[mk.s] : null; }
    function niceTicks(lo, hi) {
      var s0 = (hi - lo) / 4, mag = Math.pow(10, Math.floor(Math.log10(s0))), nn = s0 / mag, st = (nn < 1.5 ? 1 : nn < 3 ? 2 : nn < 7 ? 5 : 10) * mag, out = [];
      for (var v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) out.push(v);
      return { t: out, dec: clamp(-Math.floor(Math.log10(st) + 1e-9), 0, 5) };
    }
    function makeView() {
      var ch = curChart(); if (!ch) return null;
      var n = ch.vals.length, k = Math.min(PERIODS[per][1], n - 1), pts = ch.vals.slice(n - 1 - k), ds = ch.ds.slice(n - 1 - k), mk = items[sel];
      var lo = Math.min.apply(null, pts), hi = Math.max.apply(null, pts), pad = (hi - lo) * 0.14 || hi * 0.01; lo -= pad; hi += pad;
      var yn = []; for (var i = 0; i < RES; i++) { var x = i / (RES - 1) * k, f = Math.floor(x), fr = x - f, v = lerp(pts[f], pts[Math.min(f + 1, k)], fr); yn.push((v - lo) / (hi - lo)); }
      return { mk: mk, k: k, pts: pts, ds: ds, lo: lo, hi: hi, yn: yn, tk: niceTicks(lo, hi) };
    }
    function viewCol(v) { return cvar(v.pts[v.k] >= v.pts[0] ? '--gain' : '--loss'); }
    function xAt(i, n) { return PL + (W - PL - PR) * i / n; }
    function yAt(yn) { return PT + (H - PT - PB) * (1 - yn); }
    function sched() { if (!rafc) rafc = requestAnimationFrame(draw); }
    function grid(v, alpha) {
      var gc = cvar('--grid'), tc = cvar('--text-3'); ctx.font = '11px ' + ff; ctx.textBaseline = 'middle'; ctx.textAlign = 'right'; ctx.lineWidth = 1;
      v.tk.t.forEach(function (t) {
        var y = Math.round(yAt((t - v.lo) / (v.hi - v.lo))) + 0.5;
        ctx.strokeStyle = rgba(gc, alpha); ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(W - PR + 6, y); ctx.stroke();
        ctx.fillStyle = rgba(tc, alpha); ctx.fillText(fmtN(t, v.tk.dec), W - 2, y);
      });
    }
    function draw(now) {
      rafc = 0; if (!ctx || !W) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      if (!B) return;
      var p = 1;
      if (anim) { p = easeOut(clamp(((now || performance.now()) - anim.t0) / DUR, 0, 1)); if (p >= 1) { anim = null; A = B; } }
      var a = A || B;
      if (p < 1) { grid(a, 1 - p); grid(B, p); } else grid(B, 1);
      var ca = viewCol(a), cb = viewCol(B);
      var lo = lerp(a.lo, B.lo, p), hi = lerp(a.hi, B.hi, p), c = [lerp(ca[0], cb[0], p), lerp(ca[1], cb[1], p), lerp(ca[2], cb[2], p), 1];
      var xs = [], ys = [], i; for (i = 0; i < RES; i++) { xs.push(xAt(i, RES - 1)); ys.push(yAt(lerp(a.yn[i], B.yn[i], p))); }
      var g = ctx.createLinearGradient(0, PT, 0, H - PB); g.addColorStop(0, rgba(c, 0.2)); g.addColorStop(1, rgba(c, 0));
      ctx.beginPath(); ctx.moveTo(xs[0], H - PB); for (i = 0; i < RES; i++) ctx.lineTo(xs[i], ys[i]); ctx.lineTo(xs[RES - 1], H - PB); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); for (i = 0; i < RES; i++) { if (i) ctx.lineTo(xs[i], ys[i]); else ctx.moveTo(xs[i], ys[i]); }
      ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 1.75; ctx.lineJoin = ctx.lineCap = 'round'; ctx.stroke();
      var tc = cvar('--text-3'), n = B.ds.length - 1; ctx.font = '11px ' + ff; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = rgba(tc, 1);
      [[0, 'left', PL], [n, 'right', W - PR]].concat(n >= 8 ? [[Math.round(n / 2), 'center', xAt(Math.round(n / 2), n)]] : []).forEach(function (r) { ctx.textAlign = r[1]; ctx.fillText(dShort(B.ds[r[0]]), r[2], H - 7); });
      if (hover < 0) { ctx.beginPath(); ctx.arc(xs[RES - 1], ys[RES - 1], 3.2, 0, 7); ctx.fillStyle = rgba(c, 1); ctx.fill(); }
      else {
        var hx = xAt(hover, B.k), hy = yAt((B.pts[hover] - lo) / (hi - lo)), px0 = Math.round(hx) + 0.5;
        ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = rgba(cvar('--text-3'), 0.8); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px0, PT - 4); ctx.lineTo(px0, H - PB); ctx.stroke(); ctx.restore();
        ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, 7); ctx.fillStyle = rgba(c, 1); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = rgba(cvar('--bg'), 1); ctx.stroke();
        var label2 = fmtN(B.pts[hover], B.mk.d), ty = clamp(hy, PT + 9, H - PB - 9);
        ctx.font = '11px ' + ff; var tw = ctx.measureText(label2).width + 12;
        ctx.fillStyle = rgba(cvar('--s3'), 1); ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(W - PR + 4, ty - 9, Math.min(tw, PR - 2), 18, 5); else ctx.rect(W - PR + 4, ty - 9, Math.min(tw, PR - 2), 18); ctx.fill();
        ctx.fillStyle = rgba(cvar('--text'), 1); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label2, W - PR + 10, ty + 0.5);
      }
      if (anim) sched();
    }
    function size() {
      if (!el.cvBox) return;
      var r = el.cvBox.getBoundingClientRect(); if (!r.width) return;
      dpr = Math.min(2, window.devicePixelRatio || 1); W = Math.round(r.width); H = Math.round(r.height);
      el.cv.width = W * dpr; el.cv.height = H * dpr; ff = getComputedStyle(host).fontFamily; sched();
    }
    repaints.push(function () { sched(); });
    function setView(animate) {
      var nv = makeView();
      if (!nv) { A = B = null; anim = null; sched(); return; }
      if (animate && !reduce() && B) { A = anim ? A : B; anim = { t0: performance.now() }; B = nv; } else { A = B = nv; anim = null; }
      sched();
    }
    function chartState() {
      var mk = items[sel], ch = mk && charts[mk.s], txt = '';
      if (mode === 'cached') txt = 'La gráfica no está disponible sin conexión al servidor de precios.';
      else if (!ch || ch.st === 'loading') txt = 'Cargando gráfica…';
      else if (ch.st === 'err') txt = 'No se pudo cargar la gráfica ahora. Vuelve a elegir este mercado para reintentar.';
      if (txt) { el.cvBox.setAttribute('data-state', mode === 'cached' ? 'none' : ch && ch.st || 'loading'); el.state.textContent = txt; el.cv.tabIndex = -1; }
      else { el.cvBox.removeAttribute('data-state'); el.state.textContent = ''; el.cv.tabIndex = 0; }
    }
    function readout() {
      var mk = items[sel]; if (!mk) return;
      var q = quote(mk), v = chg(mk), vw = B, h = '';
      if (hover < 0 || !vw) {
        var chv = curChart(), pxv = q ? q.price : chv ? chv.vals[chv.vals.length - 1] : null;
        if (pxv != null) h = px(mk, pxv) + (v == null ? '' : chgHTML(mk, v)) + '<span class="mkt-when">' + (mode === 'live' ? 'cambio del día' : 'cambio del último día') + '</span>';
      } else {
        var pc = mk.pp ? vw.pts[hover] - vw.pts[0] : (vw.pts[hover] / vw.pts[0] - 1) * 100;
        h = px(mk, vw.pts[hover]) + chgHTML(mk, pc) + '<span class="mkt-when">' + dLong(vw.ds[hover]) + ' · vs ' + dShort(vw.ds[0]) + '</span>';
      }
      el.ro.innerHTML = h;
    }
    function paintPer() {
      var ch = curChart(); el.per.innerHTML = '';
      PERIODS.forEach(function (P, i) {
        var b = doc.createElement('button'); b.type = 'button'; b.className = 'mkp'; b.setAttribute('aria-pressed', i === per ? 'true' : 'false'); b.tabIndex = i === per ? 0 : -1;
        var dl = '<span class="delta flat"><span>–</span></span>';
        if (ch) {
          var n = ch.vals.length, k = Math.min(P[1], n - 1), a0 = ch.vals[n - 1 - k], a1 = ch.vals[n - 1], mk = items[sel], v = mk.pp ? a1 - a0 : (a1 / a0 - 1) * 100;
          dl = chgHTML(mk, v); b.setAttribute('aria-label', P[2] + ', ' + (mk.pp ? (v > 0 ? '+' : v < 0 ? '−' : '') + fmtN(Math.abs(v), 2) + ' puntos porcentuales' : F.pct(v)));
        } else { b.disabled = true; b.setAttribute('aria-label', P[2] + ', sin datos'); }
        b.innerHTML = '<span class="mkp-l">' + P[0] + '</span>' + dl;
        b.addEventListener('click', function () { if (i === per) return; per = i; hover = -1; paintPer(); setView(true); readout(); label(); });
        el.per.appendChild(b);
      });
    }
    function label() { var mk = items[sel]; if (mk) el.cv.setAttribute('aria-label', 'Gráfica de ' + name(mk) + ', ' + PERIODS[per][2] + '. Con las flechas izquierda y derecha lees cada sesión.'); }
    function head() {
      var mk = items[sel]; if (!mk) return;
      el.mark.innerHTML = markSvg(mk.m, 36); el.name.textContent = name(mk); el.sub.textContent = srcLabel();
      el.note.textContent = (mk.note ? mk.note + ' ' : '') + 'El cambio del día es contra el cierre previo; los cambios por periodo se calculan con cierres diarios de los últimos 3 meses.';
    }
    function select(i) {
      var m = items[i], bad = m && charts[m.s] && charts[m.s].st === 'err';
      if (i === sel && !bad) return;
      if (bad) delete charts[m.s];   /* un error se reintenta al volver a elegir el mercado */
      sel = i; hover = -1;
      el.cards.forEach(function (c, j) { c.setAttribute('aria-pressed', j === i ? 'true' : 'false'); c.tabIndex = j === i ? 0 : -1; });
      var c = el.cards[i], l = c.offsetLeft - 4, r = l + c.offsetWidth;
      if (l < el.band.scrollLeft) el.band.scrollTo({ left: l - 8, behavior: reduce() ? 'auto' : 'smooth' });
      else if (r > el.band.scrollLeft + el.band.clientWidth) el.band.scrollTo({ left: r - el.band.clientWidth + 12, behavior: reduce() ? 'auto' : 'smooth' });
      head(); loadChart(); refreshChart();
    }
    function refreshChart() { chartState(); paintPer(); setView(true); readout(); label(); }
    function at(e) { var r = el.cv.getBoundingClientRect(), x = e.clientX - r.left; return clamp(Math.round((x - PL) / (W - PL - PR) * B.k), 0, B.k); }
    function hv(i) { if (i === hover) return; hover = i; readout(); sched(); }
    function onKey(e) {
      if (!B) return;
      var k = B.k, i = hover < 0 ? k : hover, j = e.key === 'ArrowLeft' ? i - 1 : e.key === 'ArrowRight' ? i + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? k : e.key === 'Escape' ? -1 : null;
      if (j === null) return; e.preventDefault(); hv(j < 0 ? -1 : clamp(j, 0, k));
      el.live.textContent = hover < 0 ? '' : dLong(B.ds[hover]) + ', ' + fmtN(B.pts[hover], B.mk.d) + ' ' + B.mk.u;
    }

    /* ---- gráfica real: una petición por mercado, solo al elegirlo, con caché ---- */
    function parseChart(j) {
      var r = j && j.chart && j.chart.result && j.chart.result[0]; if (!r) return null;
      var ts = r.timestamp || [], q = r.indicators && r.indicators.quote && r.indicators.quote[0], cl = (q && q.close) || [], ds = [], vals = [];
      for (var i = 0; i < ts.length; i++) if (typeof cl[i] === 'number' && isFinite(cl[i]) && ts[i]) { ds.push(new Date(ts[i] * 1000)); vals.push(cl[i]); }
      return vals.length >= 5 ? { ds: ds, vals: vals } : null;
    }
    function loadChart() {
      var mk = items[sel]; if (!mk || mode !== 'live') { if (el.cvBox) refreshChart(); return; }
      var cur = charts[mk.s]; if (cur && (cur.st === 'ok' || cur.st === 'loading')) { refreshChart(); return; }
      var rec = charts[mk.s] = { st: 'loading' }; chartState();
      apiGet('/api/chart/' + encodeURIComponent(mk.s) + '?range=3mo&interval=1d').then(function (j) {
        var p = parseChart(j); if (!p) throw new Error('vacío'); rec.ds = p.ds; rec.vals = p.vals; rec.st = 'ok';
      }).catch(function () { charts[mk.s] = { st: 'err' }; }).then(function () {
        if (items[sel] && items[sel].s === mk.s) refreshChart();
      });
    }

    /* ---- arranque: precios ya; la gráfica, cuando la sección está cerca de la pantalla ---- */
    function visible() { var r = host.getBoundingClientRect(); return r.top < innerHeight + 300 && r.bottom > -300; }
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); if (!started) { started = true; if (built) loadChart(); } } }, { rootMargin: '300px 0px' });
      io.observe(host);
    } else started = true;
    loadPrices();
    var offTicks = 0;
    setInterval(function () {
      if (doc.visibilityState !== 'visible') return;
      if (mode === 'cached' && ++offTicks % 5) return;   /* sin servidor: se reintenta cada 5 min, no cada minuto */
      loadPrices();
    }, 60000);
    doc.addEventListener('visibilitychange', function () { if (doc.visibilityState === 'visible' && stamp && Date.now() - stamp.getTime() > 60000) loadPrices(); });
  })();

  /* ================= planes (datos reales de planes.html) ================= */
  var annual = false, planSel = 'Investor';
  var ladder = $('#ladder'), plans = CL.plans;
  function limLines(p) {
    var po = p.portfolios === 'Ilimitados' ? 'Portafolios ilimitados' : p.portfolios + (p.portfolios === '1' ? ' portafolio' : ' portafolios');
    var ps = p.positions === 'Ilimitadas' ? 'Posiciones ilimitadas' : p.positions + ' posiciones por portafolio';
    return '<span>' + po + '</span><span>' + ps + '</span><span>Datos de mercado: ' + p.data.toLowerCase() + '</span>';
  }
  plans.forEach(function (p) {
    var a = doc.createElement('article'); a.className = 'plan'; a.dataset.plan = p.name;
    var primary = p.name === 'Advisor Pro';
    a.innerHTML = '<div><span class="plan-tag">' + esc(p.tag) + '</span><h3>' + esc(p.name) + '</h3><div class="price"><b class="num" data-price>' + (p.usd ? 'USD ' + p.usd : 'Gratis') + '</b>' + (p.usd ? '<span>/ mes</span>' : '') + '</div><p class="p-sub" data-psub></p>' +
      '<div class="p-lim">' + limLines(p) + '</div></div>' +
      '<a class="btn ' + (primary ? 'btn-primary' : 'btn-secondary') + ' btn-block" href="' + esc(p.href) + '">' + esc(p.cta) + '</a>';
    a.addEventListener('pointermove', function (e) { var r = a.getBoundingClientRect(); a.style.setProperty('--lx', (e.clientX - r.left) + 'px'); a.style.setProperty('--ly', (e.clientY - r.top) + 'px'); });
    ladder.appendChild(a);
  });
  function countTo(el, to, fmt, instant) {
    var from = el._v == null ? to : el._v; el._v = to;
    if (el._stop) el._stop();
    if (instant || reduce() || from === to) { el.textContent = fmt(to); return; }
    el._stop = tween(320, easeOut, function (e) { el.textContent = fmt(lerp(from, to, e)); }, function () { el.textContent = fmt(to); });
  }
  function paintPlans(instant) {
    plans.forEach(function (p) {
      var card = $('.plan[data-plan="' + p.name + '"]', ladder), pr = $('[data-price]', card), sub = $('[data-psub]', card);
      if (p.usd) countTo(pr, annual ? p.usdYear : p.usd, function (v) { return 'USD ' + Math.round(v); }, instant);
      sub.textContent = !p.usd ? p.mxn : annual ? p.mxnYear + ' al mes, cobrado una vez al año' : p.mxn + ' al mes';
    });
  }
  seg($('#billing'), [{ v: 'm', l: 'Mensual' }, { v: 'a', l: 'Anual' }], 'm', function (v) { annual = v === 'a'; paintPlans(); });
  paintPlans(true);
  function paintCompare() {
    var p = plans.filter(function (x) { return x.name === planSel; })[0];
    var rows = [['Portafolios activos', p.portfolios], ['Posiciones por portafolio', p.positions], ['Datos de mercado', p.data], ['Riesgo: volatilidad, drawdown, Sharpe', p.risk],
      ['Backtesting, escenarios y optimización', p.bt], ['Narrativa con IA anclada a noticias', p.ai], ['Reporte PDF para clientes', p.pdf], ['Usuarios y roles', p.users],
      ['Alertas de precio', p.alerts], ['API y webhooks', p.api], ['Soporte', p.support]];
    $('#compare').innerHTML = '<div class="crow hd" role="row"><span role="columnheader">Qué incluye</span><span role="columnheader">En ' + esc(p.name) + '</span></div>' +
      rows.map(function (r) { return '<div class="crow" role="row"><span class="k" role="cell">' + r[0] + '</span><span class="v" role="cell">' + esc(r[1]) + '</span></div>'; }).join('');
  }
  seg($('#planPick'), plans.map(function (p) { return { v: p.name, l: p.name }; }), planSel, function (v) { planSel = v; paintCompare(); });
  paintCompare();

  /* ================= revelados al hacer scroll =================
     WAAPI con fill:backwards: en reposo todo es visible, nunca hay opacity:0 esperando a un observador. Un gesto por sección, una sola vez.
     Lo que ya está a la vista al cargar no se anima. */
  (function scrollFx() {
    if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
    var EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)', OUT = 'cubic-bezier(0.23, 1, 0.32, 1)', live = new Set();
    function run(el, kf, o, wc) {
      var a = el.animate(kf, { duration: o.d, delay: o.delay || 0, easing: o.e || EXPO, fill: 'backwards' });
      if (wc) el.style.willChange = wc;
      live.add(a);
      var done = function () { live.delete(a); if (wc) el.style.willChange = ''; if (o.after) o.after(); };
      a.onfinish = done; a.oncancel = done;
      return a;
    }
    var fns = new WeakMap();
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (!e.isIntersecting) return; io.unobserve(e.target); if (!reduce()) fns.get(e.target)(e.target); });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    function on(el, fn) {
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (r.width && r.top < innerHeight * 0.88) return;
      fns.set(el, fn); io.observe(el);
    }
    function lines(h) {
      var txt = h.textContent, words = txt.trim().split(/\s+/);
      h.textContent = '';
      var sp = words.map(function (w, i) { var s = doc.createElement('span'); s.textContent = w; s.style.display = 'inline-block'; h.appendChild(s); if (i < words.length - 1) h.appendChild(doc.createTextNode(' ')); return s; });
      var out = [], top = null;
      sp.forEach(function (s) { if (top === null || Math.abs(s.offsetTop - top) > 4) { out.push([]); top = s.offsetTop; } out[out.length - 1].push(s.textContent); });
      return { txt: txt, lines: out.map(function (l) { return l.join(' '); }) };
    }
    function title(h) {
      var m = lines(h), inner = [];
      h.textContent = '';
      m.lines.forEach(function (l) {
        var w = doc.createElement('span'), s = doc.createElement('span');
        w.className = 'sr-m'; s.className = 'sr-i'; s.textContent = l; w.appendChild(s); h.appendChild(w); inner.push(s);
      });
      var left = inner.length;
      inner.forEach(function (s, i) {
        run(s, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { d: 640, delay: i * 90, after: function () { if (--left === 0) h.textContent = m.txt; } }, 'transform');
      });
    }
    function secHead(h) {
      var t = $('h2', h), p = $('p', h), r = $('.sr-rule', h);
      if (t) title(t);
      if (p) run(p, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { d: 520, delay: 160, e: OUT }, 'transform, opacity');
      if (r) run(r, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { d: 700, delay: 120 }, 'transform');
    }
    $$('.sec-head').forEach(function (h) {
      var r = doc.createElement('i'); r.className = 'sr-rule'; r.setAttribute('aria-hidden', 'true'); h.appendChild(r);
      on(h, secHead);
    });
    on($('#lpChart .cv-wrap'), function (el) { run(el, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { d: 1100, delay: 100 }, 'clip-path'); });
    on($('.caps'), function (c) {
      $$('.cap', c).forEach(function (p, i) { run(p, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { d: 520, delay: i * 80, e: OUT }, 'transform, opacity'); });
    });
    on($('#ladder'), function (l) {
      $$('.plan', l).forEach(function (p, i) { run(p, [{ clipPath: 'inset(100% -24px -24px -24px)' }, { clipPath: 'inset(-24px -24px -24px -24px)' }], { d: 650, delay: i * 70 }, 'clip-path'); });
    });
    on($('#compare'), function (c) {
      $$('.crow', c).forEach(function (r, i) { run(r, [{ clipPath: 'inset(0 100% 0 -1px)' }, { clipPath: 'inset(0 -1px 0 -1px)' }], { d: 600, delay: Math.min(i, 8) * 70 }, 'clip-path'); });
    });
    /* barra de lectura: con scroll-timeline en CSS; respaldo con scroll */
    var bar = doc.createElement('i'); bar.className = 'sr-prog'; bar.setAttribute('aria-hidden', 'true'); doc.body.appendChild(bar);
    if (!(window.CSS && CSS.supports('animation-timeline: scroll()'))) {
      var tick = 0;
      var upd = function () { tick = 0; var m = root.scrollHeight - innerHeight; bar.style.setProperty('--p', m > 0 ? Math.min(1, scrollY / m).toFixed(4) : 0); };
      addEventListener('scroll', function () { if (!tick) tick = requestAnimationFrame(upd); }, { passive: true });
      upd();
    }
    addEventListener('beforeprint', function () { live.forEach(function (a) { try { a.finish(); } catch (e) { } }); });
  })();

  /* ================= pie ================= */
  (function footer() {
    var foot = $('#siteFoot'); if (!foot) return;
    foot.setAttribute('data-js', '');
    $$('.sf-brand, .sf-g', foot).forEach(function (el, i) { el.style.setProperty('--k', i); });
    function reveal() { foot.classList.add('in'); }
    if (reduce() || !('IntersectionObserver' in window)) reveal();
    else {
      var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { reveal(); io.disconnect(); } }, { threshold: 0.12 });
      io.observe(foot);
    }

    /* estado de la BMV (lun-vie 08:30-15:00 CDMX; horario regular, no considera días festivos) */
    var mkt = $('#sfMkt'), mktTxt = $('#sfMktTxt');
    var fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
    var DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    var NAMES = ['el domingo', 'el lunes', 'el martes', 'el miércoles', 'el jueves', 'el viernes', 'el sábado'];
    var OPEN = 510, CLOSE = 900;
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function dur(m) { var h = Math.floor(m / 60), r = m % 60; return (h ? h + ' h ' : '') + (r || !h ? r + ' min' : '').trim(); }
    function tick() {
      var p = {}; fmt.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
      var d = DAYS[p.weekday], mins = (+p.hour) * 60 + (+p.minute), clk = pad(+p.hour) + ':' + pad(+p.minute) + ' CDMX';
      var wk = d >= 1 && d <= 5, open = wk && mins >= OPEN && mins < CLOSE, txt;
      if (open) txt = 'BMV abierta · cierra en ' + dur(CLOSE - mins) + ' · ' + clk;
      else {
        var when = 'hoy';
        if (!(wk && mins < OPEN)) { var n = 1; while (!(((d + n) % 7) >= 1 && ((d + n) % 7) <= 5)) n++; when = n === 1 ? 'mañana' : NAMES[(d + n) % 7]; }
        txt = 'BMV cerrada · abre ' + when + ' a las 8:30 · ' + clk;
      }
      mkt.dataset.open = open; mktTxt.textContent = txt;
    }
    tick(); setInterval(tick, 30000);

    /* tema: Claro / Oscuro / Sistema (Sistema = sin clave bp-theme) */
    var sg = $('#sfSeg'), btns = $$('button', sg), sys = !storedTheme();
    sg.style.setProperty('--n', btns.length);
    function paint() {
      var v = sys ? 'system' : root.getAttribute('data-theme');
      btns.forEach(function (b, i) { var on = b.dataset.v === v; b.setAttribute('aria-pressed', on); if (on) sg.style.setProperty('--i', i); });
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.dataset.v; sys = v === 'system';
        try { if (sys) localStorage.removeItem('bp-theme'); else localStorage.setItem('bp-theme', v); } catch (e) { }
        applyTheme(sys ? sysTheme() : v); paint();
      });
    });
    lightMq.addEventListener('change', function () { if (sys) { applyTheme(sysTheme()); paint(); } });
    paint();

    /* volver arriba con anillo de progreso */
    var up = $('#sfTop'), ring = $('#sfRing'), r2 = 0;
    function onScroll() {
      r2 = 0;
      var max = root.scrollHeight - innerHeight, y = scrollY, pr = max > 0 ? clamp(y / max, 0, 1) : 0;
      ring.style.strokeDashoffset = (100 - pr * 100).toFixed(2);
      var show = y > innerHeight; up.classList.toggle('on', show); up.tabIndex = show ? 0 : -1;
    }
    addEventListener('scroll', function () { if (!r2) r2 = requestAnimationFrame(onScroll); }, { passive: true });
    addEventListener('resize', function () { if (!r2) r2 = requestAnimationFrame(onScroll); }, { passive: true });
    up.addEventListener('click', function () {
      scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' });
      var m = $('#contenido'); if (m) m.focus({ preventScroll: true });
    });
    onScroll();

    /* acordeones: abiertos a >= 600 px, cerrados por defecto en móvil */
    var gs = $$('.sf-g', foot), wide = matchMedia('(min-width: 600px)');
    function syncG() { gs.forEach(function (g) { g.open = wide.matches; }); }
    syncG(); wide.addEventListener('change', syncG);
    gs.forEach(function (g) { $('summary', g).addEventListener('click', function (e) { if (wide.matches) e.preventDefault(); }); });
    if (!(window.CSS && CSS.supports && CSS.supports('interpolate-size', 'allow-keywords')) && !reduce()) {
      gs.forEach(function (g) {
        var body = $('.sf-gb', g), s = $('summary', g);
        s.addEventListener('click', function (e) {
          if (wide.matches) return;
          e.preventDefault();
          if (g.open) {
            body.style.overflow = 'hidden'; body.style.height = body.offsetHeight + 'px'; body.style.transition = 'height 260ms cubic-bezier(0.23,1,0.32,1)';
            requestAnimationFrame(function () { body.style.height = '0px'; });
            setTimeout(function () { g.open = false; body.style.cssText = ''; }, 270);
          } else {
            g.open = true; var h = body.offsetHeight;
            body.style.overflow = 'hidden'; body.style.height = '0px'; body.style.transition = 'height 260ms cubic-bezier(0.23,1,0.32,1)';
            requestAnimationFrame(function () { body.style.height = h + 'px'; });
            setTimeout(function () { body.style.cssText = ''; }, 270);
          }
        });
      });
    }
  })();

  /* ================= logo del pie: el pictograma se inclina hacia el puntero (solo puntero fino y sin movimiento reducido) ================= */
  (function logoLean() {
    var fine = matchMedia('(hover: hover) and (pointer: fine)');
    if (!fine.matches || reduce()) return;
    $$('.brand-live').forEach(function (a) {
      var svg = $('.logo', a), big = $('.lg-big', a), dot = $('.lg-dot', a); if (!svg || !big || !dot) return;
      var target = { x: 0, y: 0 }, cur = { bx: 0, by: 0, dx: 0, dy: 0 }, r = 0;
      function frame() {
        r = 0;
        var tbx = target.x * 0.8, tby = target.y * 0.8, tdx = target.x * 1.6, tdy = target.y * 1.6;
        cur.bx += (tbx - cur.bx) * 0.18; cur.by += (tby - cur.by) * 0.18; cur.dx += (tdx - cur.dx) * 0.18; cur.dy += (tdy - cur.dy) * 0.18;
        big.style.translate = cur.bx.toFixed(3) + 'px ' + cur.by.toFixed(3) + 'px'; dot.style.translate = cur.dx.toFixed(3) + 'px ' + cur.dy.toFixed(3) + 'px';
        if (!(Math.abs(tbx - cur.bx) < 0.01 && Math.abs(tby - cur.by) < 0.01 && Math.abs(tdx - cur.dx) < 0.01 && Math.abs(tdy - cur.dy) < 0.01)) r = requestAnimationFrame(frame);
      }
      function kick() { if (!r) r = requestAnimationFrame(frame); }
      a.addEventListener('pointermove', function (e) {
        var b = svg.getBoundingClientRect(), half = b.width / 2 || 1;
        target.x = clamp((e.clientX - (b.left + half)) / half, -1, 1); target.y = clamp((e.clientY - (b.top + half)) / half, -1, 1); kick();
      });
      a.addEventListener('pointerleave', function () { target.x = 0; target.y = 0; kick(); });
    });
  })();

  /* ================= enlaces de acceso/registro: <a href> reales; con CampoGate se reproduce la transición y luego navega ================= */
  doc.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    var h = a.getAttribute('href');
    if (!/^(login|registro)\.html(?:[?#]|$)/.test(h)) return;
    var G = window.CampoGate;
    if (G && typeof G.go === 'function') {
      e.preventDefault();
      try { G.go(a, h); } catch (err) { location.href = h; }
    }
  });
})();
