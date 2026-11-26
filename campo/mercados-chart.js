/* CAMPO · Mercados · motor de gráfica en <canvas> propio (window.CampoMktChart). Sin librerías.
   Área/línea/velas, volumen, superposiciones, paneles de osciladores, modo % con comparación, mira, teclado y movimiento.
   Contrato: docs/rediseno-gbm-2026-11/24-spec-mercados.md §3. Los datos los trae campo/mercados.js. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, W = window;
  var PANE_H = 84, AXIS_H = 20, VOL_FRAC = 0.18, MAXPTS = 320;
  var PAL = { A: ['#0d9488', '#2dd4bf'], B: ['#b45309', '#fbbf24'], C: ['#db2777', '#f472b6'] }; /* teal, ámbar, rosa: lejos del índigo de la serie principal en ambos temas */
  var STYLE_ID = 'campo-mktchart-css';
  var rmq = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduce() { return !!rmq.matches; }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }

  /* ================= curvas de movimiento (misma bezier que campo-landing.js) ================= */
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
  var easeSweep = bez(0.16, 1, 0.3, 1), easeMorph = bez(0.22, 1, 0.36, 1);

  /* ================= color: tokens CSS y series A/B/C (nada se cachea entre temas) ================= */
  function isDark() { return root.getAttribute('data-theme') === 'dark'; }
  function cssVar(n) { return String(getComputedStyle(root).getPropertyValue(n) || '').trim(); }
  function color(spec) {
    if (PAL[spec]) return PAL[spec][isDark() ? 1 : 0];
    if (typeof spec === 'string' && spec.indexOf('--') === 0) return cssVar(spec) || '#888888';
    return spec || '#888888';
  }
  function parseColor(s, ctx) {
    s = String(s || '').trim();
    var m, a, p;
    if ((m = /^#([0-9a-f]{3,8})$/i.exec(s))) {
      a = m[1]; if (a.length < 5) a = a.replace(/./g, '$&$&');
      return [parseInt(a.substr(0, 2), 16), parseInt(a.substr(2, 2), 16), parseInt(a.substr(4, 2), 16), a.length === 8 ? parseInt(a.substr(6, 2), 16) / 255 : 1];
    }
    if ((m = /^rgba?\(([^)]+)\)/i.exec(s))) {
      p = m[1].split(/[\s,\/]+/).filter(Boolean).map(function (x) { return x.slice(-1) === '%' ? parseFloat(x) / 100 : parseFloat(x); });
      if (p.length >= 3) return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    }
    if (ctx) { /* el lienzo normaliza cualquier color CSS a #rrggbb o rgba(...) */
      ctx.fillStyle = '#000000'; ctx.fillStyle = s;
      if (ctx.fillStyle !== s && /^(#|rgb)/i.test(String(ctx.fillStyle))) return parseColor(ctx.fillStyle);
    }
    return [136, 136, 136, 1];
  }

  /* ================= puros: ticks, tiempo, comparación, remuestreo ================= */
  function niceTicks(lo, hi, target) {
    if (!(hi > lo)) return [lo];
    var raw = (hi - lo) / Math.max(1, target), mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), k = [1, 2, 2.5, 5, 10], step = mag, i;
    for (i = 0; i < k.length; i++) { step = k[i] * mag; if (step >= raw) break; }
    var out = [], a = Math.ceil(lo / step - 1e-9), b = Math.floor(hi / step + 1e-9);
    for (var j = a; j <= b; j++) out.push(+(j * step).toFixed(10));
    return out;
  }
  var fcache = {}, kcache = {};
  function partsOf(t, tz) {
    var f = fcache[tz];
    if (!f) {
      var o = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
      try { o.timeZone = tz; f = new Intl.DateTimeFormat('es-MX', o); } catch (e) { delete o.timeZone; f = new Intl.DateTimeFormat('es-MX', o); }
      fcache[tz] = f;
    }
    var out = {};
    f.formatToParts(new Date(t)).forEach(function (p) { out[p.type] = String(p.value).replace(/\.+$/, ''); });
    return out;
  }
  function isoDay(t) { return new Date(t).toISOString().slice(0, 10); }
  function tzDay(t, tz) {
    var f = kcache[tz];
    if (!f) { try { f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }); } catch (e) { f = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }); } kcache[tz] = f; }
    return f.format(new Date(t));
  }
  /* modo de eje de tiempo: hours (1 sesión) · days (5D) · day (diario ≤ ~1 a) · month (> 1 a) · year (Máx) */
  function timeMode(bars, intraday) {
    var n = bars.length; if (n < 2) return intraday ? 'hours' : 'day';
    var span = bars[n - 1].t - bars[0].t;
    if (intraday) return span > 30 * 36e5 ? 'days' : 'hours';
    var d = span / 864e5;
    return d > 365 * 8 ? 'year' : d > 400 ? 'month' : 'day';
  }
  /* los modos diarios se leen en UTC (la vela diaria cae a media jornada UTC); los intradía en la zona del mercado */
  function modeTz(mode, tz) { return (mode === 'hours' || mode === 'days') ? tz : 'UTC'; }
  function timeLabel(t, mode, tz) {
    var p = partsOf(t, modeTz(mode, tz));
    switch (mode) {
      case 'hours': return p.hour + ':' + p.minute;
      case 'days': return p.weekday + ' ' + p.day;
      case 'day': return p.day + ' ' + p.month;
      case 'month': return p.month + ' ' + String(p.year).slice(-2);
      default: return String(p.year);
    }
  }
  function fullLabel(t, mode, tz) {
    var p = partsOf(t, modeTz(mode, tz));
    if (mode === 'hours' || mode === 'days') return p.weekday + ' ' + p.day + ' ' + p.month + ', ' + p.hour + ':' + p.minute;
    if (mode === 'year') return p.month + ' ' + p.year;
    return p.day + ' ' + p.month + ' ' + p.year;
  }
  function boundKey(t, mode, tz, i) {
    if (mode === 'day') return i;
    if (mode === 'month') { var d = new Date(t); return d.getUTCFullYear() * 12 + d.getUTCMonth(); }
    if (mode === 'year') return new Date(t).getUTCFullYear();
    var p = partsOf(t, tz);
    return mode === 'hours' ? p.day + p.month + p.hour : p.day + p.month;
  }
  /* marcas del eje de tiempo: primera vela de cada hora/día/mes/año, mínimo 64 px entre etiquetas */
  function timeTicks(bars, mode, tz, X, xmin, xmax) {
    var out = [], last = -1e9, prev = null;
    for (var i = 0; i < bars.length; i++) {
      var k = boundKey(bars[i].t, mode, tz, i);
      if (i > 0 && k === prev) continue;
      prev = k;
      var x = X(i);
      if (x - last >= 64 && x >= xmin && x <= xmax) { last = x; out.push({ i: i, label: timeLabel(bars[i].t, mode, tz) }); }
    }
    return out;
  }
  /* cierre del comparador alineado por fecha calendario a cada vela principal; arrastra el último valor conocido */
  function alignCompare(mainKeys, cmpBars) {
    var out = new Array(mainKeys.length), j = 0, last = null, m = cmpBars.length;
    var ck = cmpBars.map(function (b) { return isoDay(b.t); });
    for (var i = 0; i < mainKeys.length; i++) {
      while (j < m && ck[j] <= mainKeys[i]) { if (cmpBars[j].c != null) last = cmpBars[j].c; j++; }
      out[i] = last;
    }
    return out;
  }
  function resample(a, m) {
    var n = a.length, out = new Array(m), i;
    if (!n) return out;
    if (n === 1 || m === 1) { for (i = 0; i < m; i++) out[i] = a[0]; return out; }
    for (i = 0; i < m; i++) { var x = i / (m - 1) * (n - 1), k = Math.floor(x), f = x - k; out[i] = a[k] + (a[Math.min(k + 1, n - 1)] - a[k]) * f; }
    return out;
  }
  function lerpArr(a, b, e) { var o = new Array(a.length); for (var i = 0; i < a.length; i++) o[i] = a[i] + (b[i] - a[i]) * e; return o; }
  function valAt(a, f) {
    var n1 = a.length - 1; if (n1 < 0) return null;
    f = clamp(f, 0, n1); var k = Math.floor(f), v0 = a[k], v1 = a[Math.min(k + 1, n1)];
    if (v0 == null) return v1; if (v1 == null) return v0;
    return v0 + (v1 - v0) * (f - k);
  }
  /* apila etiquetas a una separación mínima, dentro de [lo, hi]; devuelve las y ajustadas en el mismo orden */
  function stackLabels(ys, gap, lo, hi) {
    var ord = ys.map(function (y, i) { return i; }).sort(function (a, b) { return ys[a] - ys[b]; }), out = ys.slice(), prev = -Infinity, k, i;
    for (k = 0; k < ord.length; k++) { i = ord[k]; out[i] = Math.max(ys[i], prev + gap, lo); prev = out[i]; }
    var next = hi;
    for (k = ord.length - 1; k >= 0; k--) { i = ord[k]; out[i] = Math.min(out[i], next); next = out[i] - gap; }
    return out;
  }
  function range(arr, lo, hi) { /* extremos de un arreglo con nulos; acumula sobre {lo,hi} */
    for (var i = 0; i < arr.length; i++) { var v = arr[i]; if (v == null) continue; if (v < lo) lo = v; if (v > hi) hi = v; }
    return [lo, hi];
  }

  var nfc = {};
  function nfOf(d) { return nfc[d] || (nfc[d] = new Intl.NumberFormat('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d })); }
  function defPct(v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + nfOf(2).format(Math.abs(v)) + ' %'; }
  function paneNum(v) { var a = Math.abs(v); return new Intl.NumberFormat('es-MX', { maximumFractionDigits: a < 1 ? 3 : a < 100 ? 2 : 0 }).format(v).replace('-', '−'); }

  function injectStyle() {
    if (doc.getElementById(STYLE_ID)) return;
    var s = doc.createElement('style'); s.id = STYLE_ID;
    s.textContent = '.mk-canvas:focus{outline:none}.mk-canvas:focus-visible{outline:none;box-shadow:var(--ring);border-radius:8px}';
    (doc.head || root).appendChild(s);
  }

  /* ================= motor ================= */
  function create(host, opts) {
    opts = opts || {};
    var dec = 2;
    var fmt = opts.fmt || function (v) { return nfOf(dec).format(v).replace('-', '−'); };
    var fmtPct = opts.fmtPct || defPct;
    injectStyle();
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var cv = doc.createElement('canvas');
    cv.className = 'mk-canvas'; cv.setAttribute('tabindex', '0'); cv.setAttribute('role', 'img');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;cursor:crosshair;background:transparent;outline:none';
    host.appendChild(cv);
    function mkTag(c) { var el = doc.createElement('span'); el.className = 'tag ' + c; el.setAttribute('aria-hidden', 'true'); host.appendChild(el); return { el: el, on: false, text: null, l: null, t: null, w: 0, minW: null, bg: null }; }
    var tagLast = mkTag('tag-last'), tagY = mkTag('tag-y'), tagX = mkTag('tag-x');
    var ctx = cv.getContext('2d');

    var bars = [], n = 0, intraday = false, prevC = null, tz = 'America/New_York', ver = 0;
    var cl = [], ext = { minL: 0, maxH: 1, minC: 0, maxC: 1, maxV: 0 };
    var type = 'area', vol = true, cmpIn = [], ovIn = [], paneIn = [];
    var cmpS = [], mainPct = [], pctExt = { lo: 0, hi: 0 }, ovExt = null;
    var pct = false, np = 0, eff = 'area', tmode = 'day';
    var L = { ok: false, w: 0, h: 0, dpr: 1, x0: 6, x1: 0, y0: 8, y1: 0, mainB: 0, slot: 1, axisW: 48 };
    var tdom = { min: 0, max: 1 }, shown = { min: 0, max: 1 }, xt = [], xk = '';
    var baseH = 0, cc = {}, anim = false, raf = 0, hideT = 0, destroyed = false, lastY = null;
    var sw = null, mo = null, ls = null, sonar = null;
    var cross = { on: false, i: 0, y: null, kb: false };

    /* ---------- color por instancia ---------- */
    function rgba(spec, a) {
      var c = cc[spec] || (cc[spec] = parseColor(color(spec), ctx));
      return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a * c[3]).toFixed(3) + ')';
    }
    function fontStr() { return cc.__font || (cc.__font = '11px ' + (cssVar('--font') || 'system-ui, sans-serif')); }
    function signTok() { var c = n ? bars[n - 1].c : 0; return prevC ? (c > prevC ? '--gain' : c < prevC ? '--loss' : '--accent-ink') : '--accent-ink'; }
    function label(v) { return pct ? fmtPct(v) : fmt(v); }

    /* ---------- datos derivados (una vez por cambio) ---------- */
    function calcExt() {
      var minL = Infinity, maxH = -Infinity, minC = Infinity, maxC = -Infinity, maxV = 0;
      cl = new Array(n);
      for (var i = 0; i < n; i++) {
        var b = bars[i]; cl[i] = b.c;
        if (b.l < minL) minL = b.l; if (b.h > maxH) maxH = b.h;
        if (b.c < minC) minC = b.c; if (b.c > maxC) maxC = b.c;
        if (b.v > maxV) maxV = b.v;
      }
      ext = { minL: minL, maxH: maxH, minC: minC, maxC: maxC, maxV: maxV };
    }
    function calcOv() {
      var r = [Infinity, -Infinity];
      ovIn.forEach(function (o) {
        r = range(o.values || [], r[0], r[1]);
        if (o.band) { r = range(o.band.upper || [], r[0], r[1]); r = range(o.band.lower || [], r[0], r[1]); }
      });
      ovExt = r[0] <= r[1] ? { lo: r[0], hi: r[1] } : null;
    }
    function calcPane(p) {
      var lo = Infinity, hi = -Infinity;
      (p.series || []).forEach(function (s) { var r = range(s.values || [], lo, hi); lo = r[0]; hi = r[1]; if (s.kind === 'hist') { lo = Math.min(lo, 0); hi = Math.max(hi, 0); } });
      if (lo > hi) { lo = 0; hi = 1; }
      var pad = (hi - lo) * 0.08 || 1;
      p.lo = typeof p.min === 'number' ? p.min : lo - pad; p.hi = typeof p.max === 'number' ? p.max : hi + pad;
      if (!(p.hi > p.lo)) p.hi = p.lo + 1;
    }
    function calcPct() { /* rebasa el principal y alinea cada comparación por fecha */
      mainPct = []; var lo = 0, hi = 0;
      if (n) {
        var b0 = bars[0].c;
        for (var i = 0; i < n; i++) { var p = (bars[i].c / b0 - 1) * 100; mainPct.push(p); if (p < lo) lo = p; if (p > hi) hi = p; }
        var keys = bars.map(function (b) { return intraday ? tzDay(b.t, tz) : isoDay(b.t); });
        cmpS.forEach(function (s) {
          s.vals = alignCompare(keys, s.src);
          var base = null; for (var k = 0; k < n; k++) if (s.vals[k] != null) { base = s.vals[k]; break; }
          s.pct = s.vals.map(function (v) { return v == null || !base ? null : (v / base - 1) * 100; });
          var r = range(s.pct, lo, hi); lo = r[0]; hi = r[1];
        });
      }
      pctExt = { lo: lo, hi: hi };
    }
    function indAt(i) {
      var o = {};
      if (pct) return o;
      ovIn.forEach(function (ov) { o[ov.key] = num(ov.values && ov.values[i]); });
      paneIn.forEach(function (p) {
        var s = p.series || [], g = function (k) { return num(s[k] && s[k].values && s[k].values[i]); };
        o[p.key] = p.key === 'macd' ? { macd: g(1), signal: g(2), hist: g(0) } : p.key === 'stoch' ? { k: g(0), d: g(1) } : g(0);
      });
      return o;
    }
    function emit(i) {
      if (!opts.onCross) return;
      if (i == null) { opts.onCross(null); return; }
      var b = bars[i], pc = i > 0 ? bars[i - 1].c : (prevC || b.o);
      opts.onCross({
        i: i, t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v, chg: pc ? (b.c / pc - 1) * 100 : null,
        cmp: pct ? cmpS.map(function (s) { return { label: s.label, color: color(s.color), pct: s.pct[i] }; }) : [],
        ind: indAt(i)
      });
    }

    /* ---------- geometría ---------- */
    function X(i) { return L.x0 + (i + 0.5) * L.slot; }
    function xr(k, m) { return m > 1 ? X(0) + (X(n - 1) - X(0)) * k / (m - 1) : (L.x0 + L.x1) / 2; }
    function mkY(a, b) { var h = L.y1 - L.y0, d = (b - a) || 1; return function (v) { return L.y1 - (v - a) / d * h; }; }
    function npNow() { return cmpS.length ? 0 : paneIn.length; }
    function measureBase() {
      if (baseH) return;
      var h = host.clientHeight;
      if (!h) { var c = parseFloat(getComputedStyle(host).height); h = c > 0 ? c : 0; }
      baseH = h;
    }
    function applyHeight() { measureBase(); if (baseH) host.style.height = (baseH + PANE_H * npNow()) + 'px'; }
    function calcEff() { return pct ? 'line' : (type === 'candles' && n > (L.x1 - L.x0) / 2) ? 'line' : type; }
    function targetDomain() {
      if (!n) return { min: 0, max: 1 };
      var lo, hi;
      if (pct) { lo = Math.min(0, pctExt.lo); hi = Math.max(0, pctExt.hi); }
      else {
        if (eff === 'candles') { lo = ext.minL; hi = ext.maxH; } else { lo = ext.minC; hi = ext.maxC; }
        if (ovExt) { lo = Math.min(lo, ovExt.lo); hi = Math.max(hi, ovExt.hi); }
        if (intraday && prevC) { lo = Math.min(lo, prevC); hi = Math.max(hi, prevC); }
      }
      var span = hi - lo, pad = span > 0 ? span * 0.06 : (Math.abs(hi) * 0.02 || 1);
      return { min: lo - pad, max: hi + pad };
    }
    function relayout() {
      applyHeight();
      var w = host.clientWidth, h = host.clientHeight, dpr = Math.min(W.devicePixelRatio || 1, 2);
      if (!w || !h) { L.ok = false; return; }
      pct = cmpS.length > 0; np = npNow();
      var cw = Math.round(w * dpr), ch = Math.round(h * dpr);
      if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
      L.ok = true; L.w = w; L.h = h; L.dpr = dpr;
      L.x0 = 6; L.y0 = 8; L.mainB = h - AXIS_H - np * PANE_H; L.y1 = L.mainB - 4;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.font = fontStr();
      L.x1 = w - 60; L.slot = (L.x1 - L.x0) / Math.max(n, 1);
      eff = calcEff(); tdom = targetDomain();
      var tc = clamp(Math.round((L.y1 - L.y0) / 52), 4, 6), mw = 0;
      var texts = niceTicks(tdom.min, tdom.max, tc).map(label);
      if (n) texts.push(label(pct ? mainPct[n - 1] : bars[n - 1].c));
      paneIn.forEach(function (p) { (p.guides || [p.lo, p.hi]).forEach(function (g) { texts.push(paneNum(g)); }); });
      texts.forEach(function (t) { mw = Math.max(mw, ctx.measureText(t).width); });
      L.axisW = Math.max(44, Math.ceil(mw) + 16);
      L.x1 = w - L.axisW; L.slot = (L.x1 - L.x0) / Math.max(n, 1);
      eff = calcEff(); tdom = targetDomain();
      var key = ver + '|' + w + '|' + L.x1 + '|' + n;
      if (key !== xk) { xk = key; tmode = timeMode(bars, intraday); xt = n ? timeTicks(bars, tmode, tz, X, L.x0 + 18, L.x1 - 18) : []; }
      cv.setAttribute('aria-label', (opts.label || 'Gráfica') + (n ? ' · último precio ' + fmt(bars[n - 1].c) : ''));
    }

    /* ---------- bucle: un solo rAF que se detiene cuando no hay nada animándose ---------- */
    function schedule() { if (!raf && !destroyed) raf = W.requestAnimationFrame(frame); }
    function frame(now) { raf = 0; if (destroyed) return; draw(now); if (anim) schedule(); }
    function setTag(t, on, text, left, top, minW, bg) {
      var el = t.el;
      if (!on) { if (t.on) { el.classList.remove('on'); t.on = false; } return; }
      if (t.text !== text) { el.textContent = text; t.text = text; t.w = 0; }
      if (minW != null && t.minW !== minW) { el.style.minWidth = minW + 'px'; t.minW = minW; }
      if (bg && t.bg !== bg) { el.style.background = bg; t.bg = bg; }
      if (typeof left === 'function') { if (!t.w) t.w = el.offsetWidth || text.length * 7 + 14; left = left(t.w); }
      var l = left.toFixed(1) + 'px', tp = top.toFixed(1) + 'px';
      if (t.l !== l) { el.style.left = l; t.l = l; }
      if (t.t !== tp) { el.style.top = tp; t.t = tp; }
      if (!t.on) { el.classList.add('on'); t.on = true; }
    }

    /* ---------- trazado ---------- */
    function pathLine(vals, m, xf, Yf) {
      var pen = false;
      for (var k = 0; k < m; k++) {
        var v = vals[k]; if (v == null) { pen = false; continue; }
        var x = xf(k), y = Yf(v);
        if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
      }
    }
    function strokeLine(vals, m, Yf, col, lw, a) {
      if (m === 1 && vals[0] != null) { ctx.fillStyle = rgba(col, a); ctx.beginPath(); ctx.arc(xr(0, 1), Yf(vals[0]), 3, 0, 6.2832); ctx.fill(); return; }
      ctx.beginPath(); pathLine(vals, m, function (k) { return xr(k, m); }, Yf);
      ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = rgba(col, a); ctx.stroke();
    }
    function paintArea(vals, m, Yf, a) {
      if (m > 1) {
        var g = ctx.createLinearGradient(0, L.y0, 0, L.y1); g.addColorStop(0, rgba('--accent', 0.22 * a)); g.addColorStop(1, rgba('--accent', 0));
        ctx.beginPath(); pathLine(vals, m, function (k) { return xr(k, m); }, Yf);
        ctx.lineTo(xr(m - 1, m), L.y1); ctx.lineTo(xr(0, m), L.y1); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      }
      strokeLine(vals, m, Yf, '--accent-ink', 1.75, a);
    }
    function paintCandles(bs, nn, Yf, a) {
      var slot = (L.x1 - L.x0) / Math.max(nn, 1), bw = clamp(Math.round(slot * 0.7), 1, 24);
      for (var pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (var i = 0; i < nn; i++) {
          var b = bs[i], up = b.c >= b.o; if (up !== (pass === 0)) continue;
          var cx = L.x0 + (i + 0.5) * slot, yh = Math.round(Yf(b.h)), yl = Math.round(Yf(b.l));
          var yo = Yf(b.o), yc = Yf(b.c), top = Math.round(Math.min(yo, yc)), bh = Math.max(1, Math.round(Math.max(yo, yc)) - top);
          ctx.rect(Math.floor(cx), yh, 1, Math.max(1, yl - yh));
          ctx.rect(Math.round(cx - bw / 2), top, bw, bh);
        }
        ctx.fillStyle = rgba(pass === 0 ? '--gain' : '--loss', a); ctx.fill();
      }
    }
    function paintMain(kind, src, Yf, a) {
      if (kind === 'candles') paintCandles(src.bars, src.n, Yf, a);
      else if (kind === 'area') paintArea(src.vals, src.vals.length, Yf, a);
      else strokeLine(src.vals, src.vals.length, Yf, '--accent-ink', pct ? 2 : 1.75, a);
    }
    function paintOverlay(ov, Yf, a) {
      var m = n, xf = X, i, k;
      if (ov.band && ov.band.upper && ov.band.lower) {
        var u = ov.band.upper, lw = ov.band.lower, start = -1;
        ctx.fillStyle = rgba(ov.color, 0.1 * a);
        for (i = 0; i <= m; i++) {
          var ok = i < m && u[i] != null && lw[i] != null;
          if (ok && start < 0) start = i;
          if (!ok && start >= 0) {
            ctx.beginPath();
            for (k = start; k < i; k++) ctx.lineTo(X(k), Yf(u[k]));
            for (k = i - 1; k >= start; k--) ctx.lineTo(X(k), Yf(lw[k]));
            ctx.closePath(); ctx.fill(); start = -1;
          }
        }
        ctx.lineWidth = 1; ctx.strokeStyle = rgba(ov.color, 0.55 * a);
        ctx.beginPath(); pathLine(u, m, xf, Yf); ctx.stroke();
        ctx.beginPath(); pathLine(lw, m, xf, Yf); ctx.stroke();
      }
      if (ov.values) {
        ctx.beginPath(); pathLine(ov.values, m, xf, Yf);
        ctx.lineWidth = 1.25; ctx.lineJoin = 'round'; ctx.strokeStyle = rgba(ov.color, 0.9 * a); ctx.stroke();
      }
    }
    function paneGeom(p, j) { var top = L.mainB + j * PANE_H, y0 = top + 18, y1 = top + PANE_H - 6, lo = p.lo, hi = p.hi; return { top: top, y0: y0, y1: y1, Y: function (v) { return y1 - (v - lo) / (hi - lo) * (y1 - y0); } }; }
    function paneChrome(p, j) {
      var g = paneGeom(p, j), i;
      ctx.lineWidth = 1; ctx.strokeStyle = rgba('--line', 1); ctx.beginPath(); ctx.moveTo(0, Math.round(g.top) + 0.5); ctx.lineTo(L.w, Math.round(g.top) + 0.5); ctx.stroke();
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = rgba('--text-3', 1); ctx.fillText(p.label || '', L.x0 + 4, g.top + 10);
      var vals = p.guides && p.guides.length ? p.guides : [p.lo, p.hi];
      ctx.setLineDash([3, 4]); ctx.strokeStyle = rgba('--line-strong', 1); ctx.beginPath();
      if (p.guides) for (i = 0; i < vals.length; i++) { var y = Math.round(g.Y(vals[i])) + 0.5; ctx.moveTo(L.x0, y); ctx.lineTo(L.x1, y); }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = rgba('--text-3', 1);
      for (i = 0; i < vals.length; i++) ctx.fillText(paneNum(vals[i]), L.x1 + 8, clamp(g.Y(vals[i]), g.y0 + 4, g.y1 - 4));
    }
    function paneSeries(p, j) {
      var g = paneGeom(p, j), Yp = g.Y;
      if (p.lo < 0 && p.hi > 0) { var zy = Math.round(Yp(0)) + 0.5; ctx.lineWidth = 1; ctx.strokeStyle = rgba('--line-strong', 1); ctx.beginPath(); ctx.moveTo(L.x0, zy); ctx.lineTo(L.x1, zy); ctx.stroke(); }
      (p.series || []).forEach(function (s) {
        var v = s.values || [];
        if (s.kind === 'hist') {
          var bw = Math.max(1, Math.round(L.slot * 0.6)), z = Yp(clamp(0, p.lo, p.hi));
          for (var pass = 0; pass < 2; pass++) {
            ctx.beginPath();
            for (var i = 0; i < n; i++) {
              if (v[i] == null) continue;
              if (s.color === '±' ? (v[i] >= 0) !== (pass === 0) : pass === 1) continue;
              var y = Yp(v[i]); ctx.rect(Math.round(X(i) - bw / 2), Math.min(y, z), bw, Math.max(1, Math.abs(y - z)));
            }
            ctx.fillStyle = rgba(s.color === '±' ? (pass === 0 ? '--gain' : '--loss') : s.color, 0.75); ctx.fill();
          }
        } else {
          ctx.beginPath(); pathLine(v, n, X, Yp);
          ctx.lineWidth = 1.25; ctx.lineJoin = 'round'; ctx.strokeStyle = rgba(s.color, 1); ctx.stroke();
        }
      });
    }

    /* ---------- cuadro ---------- */
    function curVals() { return pct ? mainPct : cl; }
    function draw(now) {
      anim = false;
      if (!L.ok) return;
      ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0); ctx.clearRect(0, 0, L.w, L.h);
      if (!n) { setTag(tagLast, false); setTag(tagY, false); setTag(tagX, false); return; }
      ctx.font = fontStr();
      var m = mo, e = 1, dmin = tdom.min, dmax = tdom.max, i, k;
      if (m) {
        var mp = clamp((now - m.t0) / m.dur, 0, 1);
        if (mp >= 1) mo = null; else anim = true;
        e = m.cand ? mp : easeMorph(mp);
        if (!m.cand) { dmin = lerp(m.from.dmin, tdom.min, e); dmax = lerp(m.from.dmax, tdom.max, e); }
        if (mp >= 1) m = null;
      }
      shown = { min: dmin, max: dmax };
      var swMs = 1e9, se = 1;
      if (sw) { swMs = now - sw.t0; if (swMs >= 750) sw = null; else { se = easeSweep(swMs / 750); anim = true; } }
      var off = 0;
      if (ls) { var lq = (now - ls.t0) / 300; if (lq >= 1) ls = null; else { off = ls.off * (1 - easeMorph(lq)); anim = true; } }
      var Yf = mkY(dmin, dmax), plotB = L.h - AXIS_H;

      /* rejilla horizontal y eje de precio */
      var ticks = niceTicks(dmin, dmax, clamp(Math.round((L.y1 - L.y0) / 52), 4, 6));
      ctx.lineWidth = 1; ctx.strokeStyle = rgba('--grid', 1); ctx.beginPath();
      ticks.forEach(function (v) { var y = Math.round(Yf(v)) + 0.5; ctx.moveTo(L.x0, y); ctx.lineTo(L.x1, y); });
      ctx.stroke();
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = rgba('--text-3', 1);
      ticks.forEach(function (v) { ctx.fillText(label(v), L.x1 + 8, Yf(v)); });
      ctx.textAlign = 'center';
      xt.forEach(function (t) { ctx.fillText(t.label, X(t.i), L.h - AXIS_H / 2); });
      ctx.textAlign = 'left';

      /* volumen: antes que el precio, crece con retraso escalonado en el barrido */
      if (vol && !pct && ext.maxV > 0) {
        var vh = (L.y1 - L.y0) * VOL_FRAC, bw = Math.max(1, Math.round(L.slot * 0.7));
        for (var pass = 0; pass < 2; pass++) {
          ctx.beginPath();
          for (i = 0; i < n; i++) {
            var b = bars[i]; if ((b.c >= b.o) !== (pass === 0) || !b.v) continue;
            var g = swMs < 1e8 ? easeSweep(clamp((swMs - (i + 0.5) / n * 300) / 450, 0, 1)) : 1, h = Math.max(1, b.v / ext.maxV * vh * g);
            ctx.rect(Math.round(X(i) - bw / 2), L.y1 - h, bw, h);
          }
          ctx.fillStyle = rgba('--text-3', pass === 0 ? 0.22 : 0.14); ctx.fill();
        }
      }
      /* cierre anterior (solo 1D) y línea de 0 % */
      if (!pct && intraday && prevC) {
        var py = Yf(prevC);
        if (py >= L.y0 && py <= L.y1) {
          ctx.setLineDash([2, 3]); ctx.lineWidth = 1; ctx.strokeStyle = rgba('--text-3', 0.5); ctx.beginPath(); ctx.moveTo(L.x0, Math.round(py) + 0.5); ctx.lineTo(L.x1, Math.round(py) + 0.5); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = rgba('--text-3', 0.85); ctx.fillText('Cierre ant.', L.x0 + 4, py - 8);
        }
      }
      if (pct) { var zy = Math.round(Yf(0)) + 0.5; ctx.setLineDash([3, 4]); ctx.lineWidth = 1; ctx.strokeStyle = rgba('--line-strong', 1); ctx.beginPath(); ctx.moveTo(L.x0, zy); ctx.lineTo(L.x1, zy); ctx.stroke(); ctx.setLineDash([]); }
      np && paneIn.forEach(paneChrome);

      /* contenido recortado por el barrido */
      var clipX = L.x0 + (L.x1 - L.x0) * se;
      ctx.save();
      if (se < 1) { ctx.beginPath(); ctx.rect(0, 0, clipX, L.h); ctx.clip(); }
      var cur = { bars: bars, n: n, vals: curVals() };
      if (m && !m.cand) cur.vals = lerpArr(m.fa, m.ta, e);
      if (pct) {
        paintMain('line', cur, Yf, 1);
        cmpS.forEach(function (s) {
          var cp = 1;
          if (s.born != null) { var q = (now - s.born) / 600; if (q >= 1) s.born = null; else { cp = easeSweep(q); anim = true; } }
          ctx.save();
          if (cp < 1) { ctx.beginPath(); ctx.rect(0, 0, L.x0 + (L.x1 - L.x0) * cp, L.h); ctx.clip(); }
          strokeLine(s.pct, n, Yf, s.color, 1.5, 1);
          ctx.restore();
        });
      } else {
        var oa = m ? e : 1;
        ovIn.forEach(function (ov) { paintOverlay(ov, Yf, oa); });
        if (m && m.cand) {
          var fr = m.from, Yo = mkY(fr.dmin, fr.dmax);
          paintMain(fr.eff, { bars: fr.bars, n: fr.n, vals: fr.vals }, Yo, 1 - e);
          paintMain(eff, cur, Yf, e);
        } else paintMain(eff, cur, Yf, 1);
        paneIn.forEach(function (p, j) { paneSeries(p, j); });
        /* último precio: línea punteada y pulso sonar */
        var lc = bars[n - 1].c, ly = Yf(lc) + off, sk = signTok();
        if (ly >= L.y0 && ly <= L.y1) {
          ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.strokeStyle = rgba(sk, 0.8); ctx.beginPath(); ctx.moveTo(L.x0, Math.round(ly) + 0.5); ctx.lineTo(L.x1, Math.round(ly) + 0.5); ctx.stroke(); ctx.setLineDash([]);
        }
        if (sonar) {
          var sq = (now - sonar.t0) / 900;
          if (sq >= 1) sonar = null;
          else {
            anim = true; var sx = X(n - 1), sy = Yf(lc);
            ctx.fillStyle = rgba(sk, 1); ctx.beginPath(); ctx.arc(sx, sy, 3, 0, 6.2832); ctx.fill();
            ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(sk, 0.45 * (1 - sq)); ctx.beginPath(); ctx.arc(sx, sy, 4 + 18 * easeMorph(sq), 0, 6.2832); ctx.stroke();
          }
        }
        lastY = ly;
      }
      ctx.restore();

      /* resplandor y punto del borde que avanza */
      if (se < 1) {
        var ey = Yf(valAt(cur.vals, (clipX - X(0)) / L.slot)), gr = ctx.createLinearGradient(clipX - 24, 0, clipX, 0);
        gr.addColorStop(0, rgba('--accent', 0)); gr.addColorStop(1, rgba('--accent', 0.22));
        ctx.fillStyle = gr; ctx.fillRect(clipX - 24, L.y0, 24, L.y1 - L.y0);
        var rg = ctx.createRadialGradient(clipX, ey, 0, clipX, ey, 24); rg.addColorStop(0, rgba('--accent', 0.5)); rg.addColorStop(1, rgba('--accent', 0));
        ctx.fillStyle = rg; ctx.fillRect(clipX - 24, ey - 24, 48, 48);
        ctx.fillStyle = rgba('--accent-ink', 1); ctx.beginPath(); ctx.arc(clipX, ey, 3.5, 0, 6.2832); ctx.fill();
      }

      /* etiquetas de % al borde derecho, apiladas */
      if (pct && se >= 1) {
        var items = [{ lab: fmtPct(mainPct[n - 1]), col: '--accent-ink', y: Yf(mainPct[n - 1]) }];
        cmpS.forEach(function (s) { for (k = n - 1; k >= 0; k--) if (s.pct[k] != null) { items.push({ lab: fmtPct(s.pct[k]), col: s.color, y: Yf(s.pct[k]) }); break; } });
        var sy2 = stackLabels(items.map(function (it) { return it.y; }), 18, L.y0 + 8, L.y1 - 8);
        ctx.textAlign = 'center';
        items.forEach(function (it, q) {
          var bx = L.x1 + 4, bwid = L.axisW - 8, by = sy2[q] - 8;
          ctx.fillStyle = rgba('--s1', 0.95); ctx.fillRect(bx, by, bwid, 16);
          ctx.lineWidth = 1; ctx.strokeStyle = rgba(it.col, 1); ctx.strokeRect(bx + 0.5, by + 0.5, bwid - 1, 15);
          ctx.fillStyle = rgba(it.col, 1); ctx.fillText(it.lab, bx + bwid / 2, sy2[q] + 0.5);
        });
        ctx.textAlign = 'left';
      }

      /* mira */
      var cy = null;
      if (cross.on) {
        var ci = clamp(cross.i, 0, n - 1), cx = X(ci), vals = curVals(), cv0 = vals[ci];
        cy = cross.y != null ? cross.y : (cross.kb ? Yf(cv0) : null);
        ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.strokeStyle = rgba('--text-3', 0.45); ctx.beginPath();
        var vx = Math.round(cx) + 0.5; ctx.moveTo(vx, L.y0); ctx.lineTo(vx, plotB);
        if (cy != null) { var hy = Math.round(cy) + 0.5; ctx.moveTo(L.x0, hy); ctx.lineTo(L.x1, hy); }
        ctx.stroke(); ctx.setLineDash([]);
        if (pct) cmpS.forEach(function (s) { if (s.pct[ci] != null) { ctx.fillStyle = rgba('--s1', 1); ctx.beginPath(); ctx.arc(cx, Yf(s.pct[ci]), 5, 0, 6.2832); ctx.fill(); ctx.fillStyle = rgba(s.color, 1); ctx.beginPath(); ctx.arc(cx, Yf(s.pct[ci]), 3, 0, 6.2832); ctx.fill(); } });
        var dy = Yf(cv0);
        ctx.fillStyle = rgba('--s1', 1); ctx.beginPath(); ctx.arc(cx, dy, 6, 0, 6.2832); ctx.fill();
        ctx.fillStyle = rgba('--accent-ink', 1); ctx.beginPath(); ctx.arc(cx, dy, 4, 0, 6.2832); ctx.fill();
      }

      /* etiquetas DOM (.tag): último precio, precio y fecha de la mira */
      var minW = L.axisW - 8, lx = L.x1 + 4;
      setTag(tagLast, !pct && se >= 1, fmt(bars[n - 1].c), lx, clamp(lastY == null ? 0 : lastY, L.y0, L.y1), minW, rgba(signTok(), 1));
      if (cross.on && cy != null && cy >= L.y0 && cy <= L.y1) {
        var iv = dmin + (L.y1 - cy) / (L.y1 - L.y0) * (dmax - dmin);
        setTag(tagY, true, label(iv), lx, cy, minW);
      } else setTag(tagY, false);
      if (cross.on) {
        var tx = X(clamp(cross.i, 0, n - 1));
        setTag(tagX, true, fullLabel(bars[clamp(cross.i, 0, n - 1)].t, tmode, tz), function (w) { return clamp(tx, w / 2 + 2, L.w - w / 2 - 2); }, L.h - AXIS_H + 1);
      } else setTag(tagX, false);
    }

    /* ---------- animaciones ---------- */
    function snapshot() { return { bars: bars, n: n, eff: eff, pct: pct, vals: curVals().slice(), dmin: shown.min, dmax: shown.max }; }
    function startMorph(snap) {
      if (!snap || reduce() || !n || snap.pct !== pct) return;
      var cand = snap.eff === 'candles' || eff === 'candles';
      mo = { t0: W.performance.now(), from: snap, cand: cand, dur: cand ? 220 : 420 };
      if (!cand) { var mm = Math.min(MAXPTS, Math.max(snap.vals.length, n, 2)); mo.fa = resample(snap.vals, mm); mo.ta = resample(curVals(), mm); }
      sw = null;
    }

    /* ---------- API ---------- */
    function setData(d, o) {
      d = d || {}; o = o || {};
      var had = n > 0, an = o.animate === undefined ? (had ? 'morph' : 'sweep') : o.animate;
      var snap = an === 'morph' && had && L.ok ? snapshot() : null;
      bars = (d.bars || []).map(function (b) { var c = b.c; return { t: b.t, o: b.o == null ? c : b.o, h: b.h == null ? c : b.h, l: b.l == null ? c : b.l, c: c, v: b.v || 0 }; });
      n = bars.length; intraday = !!d.intraday; prevC = d.prev > 0 ? d.prev : null; tz = d.tz || 'America/New_York'; dec = d.dec != null ? d.dec : 2;
      ver++; sw = mo = ls = sonar = null; lastY = null;
      calcExt(); calcPct();
      if (cross.on) { cross.on = false; emit(null); }
      relayout();
      if (an === 'sweep' && n && !reduce()) sw = { t0: W.performance.now() };
      else if (snap) startMorph(snap);
      schedule();
    }
    function setType(t) {
      if (t === type) return;
      var snap = n && L.ok ? snapshot() : null, was = eff;
      type = t; relayout();
      if (snap && was !== eff && (was === 'candles' || eff === 'candles')) startMorph(snap);
      schedule();
    }
    function setCompare(list) {
      var old = {}, now = W.performance.now();
      cmpS.forEach(function (s) { old[s.label + '|' + s.color] = s; });
      cmpIn = list || [];
      cmpS = cmpIn.map(function (c) {
        var o = old[c.label + '|' + c.color];
        return { label: c.label, color: c.color, src: c.bars || [], vals: [], pct: [], born: o ? o.born : (n && !reduce() ? now : null) };
      });
      calcPct(); relayout(); schedule();
      if (cross.on) emit(clamp(cross.i, 0, n - 1));
    }
    function setOverlays(list) { ovIn = list || []; calcOv(); relayout(); schedule(); if (cross.on) emit(clamp(cross.i, 0, n - 1)); }
    function setPanes(list) {
      paneIn = list || []; paneIn.forEach(calcPane); relayout(); schedule();
      if (cross.on) emit(clamp(cross.i, 0, n - 1));
    }
    function setVolume(v) { vol = !!v; schedule(); }
    function live(price) {
      if (!n || !(price > 0)) return;
      var b = bars[n - 1], oldY = lastY, newY;
      b.c = price; if (price > b.h) b.h = price; if (price < b.l) b.l = price;
      calcExt(); if (cmpS.length) calcPct();
      relayout();
      if (!reduce() && L.ok) {
        newY = mkY(tdom.min, tdom.max)(price);
        if (oldY != null) ls = { t0: W.performance.now(), off: oldY - newY };
        sonar = { t0: W.performance.now() };
      }
      if (cross.on && cross.i === n - 1) emit(cross.i);
      schedule();
    }
    function replay() { if (n && !reduce()) { sw = { t0: W.performance.now() }; mo = null; schedule(); } }
    function resize() { relayout(); schedule(); }
    function repaint() { cc = {}; xk = ''; relayout(); schedule(); }

    /* ---------- mira: puntero, táctil, teclado ---------- */
    function idxAt(x) { return clamp(Math.round((x - L.x0) / L.slot - 0.5), 0, n - 1); }
    function setCross(i, y, kb) {
      var ch = !cross.on || cross.i !== i;
      cross.on = true; cross.i = i; cross.y = y; cross.kb = !!kb;
      if (ch) emit(i);
      schedule();
    }
    function hideCross() { clearTimeout(hideT); if (cross.on) { cross.on = false; emit(null); schedule(); } }
    function aim(e) {
      if (!n || !L.ok) return;
      clearTimeout(hideT);
      var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      setCross(idxAt(x), y >= L.y0 && y <= L.y1 ? y : null, false);
    }
    function onDown(e) { if (e.pointerType !== 'mouse' && cv.setPointerCapture) { try { cv.setPointerCapture(e.pointerId); } catch (x) { /* sin captura */ } } aim(e); }
    function onLeave(e) { if (e.pointerType === 'mouse') hideCross(); }
    function onUp(e) { if (e.pointerType !== 'mouse') { clearTimeout(hideT); hideT = setTimeout(hideCross, 1200); } }
    function onKey(e) {
      if (!n) return;
      if (e.key === 'Escape') { hideCross(); return; }
      var i = cross.on ? cross.i : n - 1, step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowRight') i += step; else if (e.key === 'ArrowLeft') i -= step;
      else if (e.key === 'Home') i = 0; else if (e.key === 'End') i = n - 1; else return;
      e.preventDefault(); clearTimeout(hideT);
      setCross(clamp(i, 0, n - 1), null, true);
    }
    cv.addEventListener('pointermove', aim);
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointerleave', onLeave);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('keydown', onKey);
    cv.addEventListener('blur', hideCross);

    /* ---------- observadores: tamaño, tema, movimiento reducido ---------- */
    var ro = null, mob = null;
    if (W.ResizeObserver) { ro = new W.ResizeObserver(function () { if (host.clientWidth === L.w && host.clientHeight === L.h && L.ok) return; relayout(); schedule(); }); ro.observe(host); }
    function onWin() { host.style.height = ''; baseH = 0; relayout(); schedule(); } /* el alto base puede cambiar por media query */
    W.addEventListener('resize', onWin);
    if (W.MutationObserver) { mob = new W.MutationObserver(repaint); mob.observe(root, { attributes: true, attributeFilter: ['data-theme'] }); }
    if (W.__campo && W.__campo.repaints) W.__campo.repaints.push(repaint);
    function onRm() { if (reduce()) { sw = mo = ls = sonar = null; cmpS.forEach(function (s) { s.born = null; }); } schedule(); }
    if (rmq.addEventListener) rmq.addEventListener('change', onRm); else if (rmq.addListener) rmq.addListener(onRm);

    function destroy() {
      destroyed = true; clearTimeout(hideT);
      if (raf && W.cancelAnimationFrame) W.cancelAnimationFrame(raf); raf = 0;
      if (ro) ro.disconnect(); if (mob) mob.disconnect();
      W.removeEventListener('resize', onWin);
      if (rmq.removeEventListener) rmq.removeEventListener('change', onRm); else if (rmq.removeListener) rmq.removeListener(onRm);
      var rp = W.__campo && W.__campo.repaints, ix = rp ? rp.indexOf(repaint) : -1; if (ix >= 0) rp.splice(ix, 1);
      [cv, tagLast.el, tagY.el, tagX.el].forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
    }

    applyHeight(); relayout();
    return { setData: setData, setType: setType, setCompare: setCompare, setOverlays: setOverlays, setPanes: setPanes, setVolume: setVolume, live: live, replay: replay, resize: resize, repaint: repaint, destroy: destroy };
  }

  W.CampoMktChart = {
    create: create,
    color: color,
    _t: { niceTicks: niceTicks, timeLabel: timeLabel, fullLabel: fullLabel, timeMode: timeMode, timeTicks: timeTicks, alignCompare: alignCompare, resample: resample, stackLabels: stackLabels, parseColor: parseColor, isoDay: isoDay }
  };
})();
