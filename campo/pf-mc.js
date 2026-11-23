/* Campo · Portafolio individual · pestaña "Monte Carlo". Expone window.CampoPfMc.render(mount, portfolio|'todos', CampoTracker) -> { destroy } y .calc para pruebas.
   No recalcula finanzas: llama a CampoModel.inputs / CampoModel.mc. La pieza firma es el cono como CAMPO DE DENSIDAD (res.dens, log-valor por mes) dibujado en canvas 2D
   con calor ocre, encima la banda p25–p75, p10/p50/p90, lo aportado, la meta, 18 hilos de ejemplo y el histograma de valores finales pegado al borde derecho.
   Al cambiar cualquier parámetro se INTERPOLAN percentiles, densidad, hilos y ejes (260 ms); el motor reutiliza los mismos números aleatorios, así que el cono se deforma suave.
   En producción, con los datos reales de campo/datos.js. */
(function () {
  'use strict';
  var D = window.PORTIFY_DEMO;
  var doc = typeof document !== 'undefined' ? document : null, root = doc && doc.documentElement;
  var NP = 121;                 /* puntos por serie tras remuestrear al eje normalizado [0,1] */
  var HB = 44;                  /* franjas del histograma de valores finales */
  /* hoy = última sesión de la rejilla (en producción, la fecha real de los datos) */
  var T0D = (window.CampoTracker && window.CampoTracker.dates) || [], T0 = T0D.length ? T0D[T0D.length - 1] : '2026-11-18';
  var Y0 = +T0.slice(0, 4), M0 = +T0.slice(5, 7) - 1;
  var START = Y0 + M0 / 12;
  var TWEEN = 260;
  var EASE = 'cubic-bezier(.23,1,.32,1)';
  var rmq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduce() { return !!rmq.matches; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 4); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var HOVER = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)').matches : false;

  /* ============================== formato ============================== */
  var nfc = {};
  function fN(v, d) { if (!nfc[d]) nfc[d] = new Intl.NumberFormat('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d }); return nfc[d].format(v); }
  function fM(v) { var a = Math.round(Math.abs(v)); return (v < 0 && a > 0 ? '−' : '') + (D && D.fmt ? D.fmt.mxn(a) : '$' + fN(a, 0)); }
  function fPu(v, d) { return fN(Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v, d).replace('-', '−') + ' %'; }
  function fS(v, d) { var z = Math.abs(v) < 0.5 * Math.pow(10, -d); return (z ? '' : v < 0 ? '−' : '+') + fN(Math.abs(v), d) + ' %'; }
  function compact(v) {
    var a = Math.abs(v), s = v < 0 ? '−' : '';
    if (a >= 1e9) return s + '$' + fN(a / 1e9, a >= 1e10 ? 0 : 1) + ' mil M';
    if (a >= 1e6) return s + '$' + fN(a / 1e6, a >= 1e7 ? 0 : 1) + ' M';
    if (a >= 1e3) return s + '$' + fN(a / 1e3, 0) + ' mil';
    return s + '$' + Math.round(a);
  }
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function mLabel(m) { var k = M0 + m; return MES[k % 12] + ' ' + (Y0 + Math.floor(k / 12)); }
  function niceStep(span, n) { var raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag; return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag; }

  /* ============================== helpers puros (probables en Node) ============================== */
  /* remuestrea un arreglo de longitud cualquiera a np puntos sobre [0,1] con interpolación lineal */
  function resample(arr, np) {
    var n = arr.length, out = new Float64Array(np), j, f, a, b, t;
    for (j = 0; j < np; j++) { f = j / (np - 1) * (n - 1); a = Math.floor(f); b = Math.min(n - 1, a + 1); t = f - a; out[j] = arr[a] * (1 - t) + arr[b] * t; }
    return out;
  }
  /* densidad por mes (M+1 columnas × B franjas) → np columnas, cada una normalizada a su máximo (0..1) */
  function resampleDens(dens, np) {
    var B = dens.bins, data = dens.data, months = Math.round(data.length / B), out = new Float32Array(np * B), j, i, f, a, b, t, mx, o;
    for (j = 0; j < np; j++) {
      f = j / (np - 1) * (months - 1); a = Math.floor(f); b = Math.min(months - 1, a + 1); t = f - a; o = j * B; mx = 0;
      for (i = 0; i < B; i++) out[o + i] = data[a * B + i] * (1 - t) + data[b * B + i] * t;
    }
    /* suavizado: gaussiano entre franjas (σ ≈ 1.2) y caja de ±2 columnas en el tiempo; con 1,000 trayectorias el histograma crudo se ve granulado */
    var K = [0.06, 0.24, 0.4, 0.24, 0.06], tmp = new Float32Array(B), sm = new Float32Array(np * B), q, k;
    for (j = 0; j < np; j++) { o = j * B; for (i = 0; i < B; i++) { var acc = 0; for (k = -2; k <= 2; k++) { q = i + k; if (q >= 0 && q < B) acc += out[o + q] * K[k + 2]; } tmp[i] = acc; } for (i = 0; i < B; i++) out[o + i] = tmp[i]; }
    for (j = 0; j < np; j++) { var lo2 = Math.max(1, j - 2), hi2 = Math.min(np - 1, j + 2), n2 = 0; if (j === 0) { lo2 = hi2 = 0; } for (q = lo2; q <= hi2; q++) { n2++; for (i = 0; i < B; i++) sm[j * B + i] += out[q * B + i]; } for (i = 0; i < B; i++) sm[j * B + i] /= n2; }
    for (j = 0; j < np; j++) { o = j * B; mx = 0; for (i = 0; i < B; i++) if (sm[o + i] > mx) mx = sm[o + i]; if (mx > 0) for (i = 0; i < B; i++) sm[o + i] /= mx; }
    return sm;
  }
  /* histograma de valores finales (ordenados) en nb franjas lineales entre ymin y ymax; normalizado a su máximo */
  function histogram(sorted, ymin, ymax, nb) {
    var h = new Float64Array(nb), span = ymax - ymin || 1, mx = 0, i;
    for (i = 0; i < sorted.length; i++) { var k = Math.floor((sorted[i] - ymin) / span * nb); if (k >= 0 && k < nb) h[k]++; }
    for (i = 0; i < nb; i++) if (h[i] > mx) mx = h[i];
    if (mx) for (i = 0; i < nb; i++) h[i] /= mx;
    return h;
  }
  /* rango vertical: de un poco debajo del p5 más bajo hasta algo sobre el p90 final (o la meta, si no la deja fuera de escala) */
  function yRange(res, goal) {
    var M = res.months, lo = Infinity, hi = res.pct.p90[M], m;
    for (m = 0; m <= M; m++) { if (res.pct.p5[m] < lo) lo = res.pct.p5[m]; if (res.invested[m] < lo) lo = res.invested[m]; }
    if (res.invested[M] > hi) hi = res.invested[M];
    var offGoal = goal > 0 && goal > res.pct.p95[M] * 1.5;
    if (goal > 0 && !offGoal && goal * 1.04 > hi) hi = goal * 1.04;
    var ymax = hi * 1.06, ymin = Math.max(0, lo - 0.08 * (ymax - lo)), st = niceStep(ymax - ymin, 4);
    ymax = Math.ceil(ymax / st) * st; ymin = Math.max(0, Math.floor(ymin / st) * st);
    return { ymin: ymin, ymax: ymax, step: st, offGoal: offGoal };
  }
  function yTicks(ymin, ymax, step) { var o = []; for (var v = Math.ceil(ymin / step - 1e-9) * step; v <= ymax + 1e-9; v += step) o.push({ v: +v.toFixed(4), text: compact(v) }); return o; }
  /* marcas del eje X en años calendario. t = años desde nov 2026 (el eje las coloca con la duración que tenga en ese momento) */
  function xTicks(Y) {
    var o = [], t, m;
    if (Y <= 3.2) {
      var stepM = Y <= 1.5 ? 2 : 6;
      for (m = 1; m / 12 <= Y + 1e-9; m++) if ((M0 + m) % stepM === 0) { var k = M0 + m; o.push({ t: m / 12, text: MES[k % 12] + ' ' + String(Y0 + Math.floor(k / 12)).slice(2) }); }
    } else {
      var steps = [1, 2, 5, 10], s = 10; for (var i = 0; i < steps.length; i++) if (Math.floor(Y / steps[i]) <= 6) { s = steps[i]; break; }
      for (var y = Y0 + 1; y - START <= Y + 1e-9; y++) if (y % s === 0) o.push({ t: y - START, text: String(y) });
    }
    return o.filter(function (x) { return x.t > 0.045 * Y; });
  }
  var ARR = ['p10', 'p25', 'p50', 'p75', 'p90', 'inv', 'dens', 'hist'];
  function snap(res, goal) {
    var yr = yRange(res, goal), st = { Y: res.years, M: res.months, lo: res.dens.lo, hi: res.dens.hi, B: res.dens.bins, ymin: yr.ymin, ymax: yr.ymax, goal: goal > 0 ? goal : 0, gA: goal > 0 ? 1 : 0, offGoal: yr.offGoal,
      yt: yTicks(yr.ymin, yr.ymax, yr.step), xt: xTicks(res.years) };
    st.p10 = resample(res.pct.p10, NP); st.p25 = resample(res.pct.p25, NP); st.p50 = resample(res.pct.p50, NP); st.p75 = resample(res.pct.p75, NP); st.p90 = resample(res.pct.p90, NP);
    st.inv = resample(res.invested, NP); st.dens = resampleDens(res.dens, NP); st.thr = res.samples.map(function (s) { return resample(s, NP); });
    st.hist = histogram(res.terminal, yr.ymin, yr.ymax, HB);
    return st;
  }
  function cloneState(s) {
    var o = {}, k; for (k in s) o[k] = s[k];
    ARR.forEach(function (n) { o[n] = s[n].slice(); }); o.thr = s.thr.map(function (a) { return a.slice(); }); return o;
  }
  /* escalares y arreglos interpolados: out = a + (b − a)·e */
  var SC = ['Y', 'lo', 'hi', 'ymin', 'ymax', 'goal', 'gA'];
  function lerpInto(out, a, b, e) {
    var i, j;
    SC.forEach(function (k) { out[k] = a[k] + (b[k] - a[k]) * e; });
    ARR.forEach(function (n) { var x = a[n], y = b[n], z = out[n]; for (i = 0; i < z.length; i++) z[i] = x[i] + (y[i] - x[i]) * e; });
    for (j = 0; j < out.thr.length; j++) { var xa = a.thr[j], xb = b.thr[j] || a.thr[j], z2 = out.thr[j]; for (i = 0; i < NP; i++) z2[i] = xa[i] + (xb[i] - xa[i]) * e; }
    return out;
  }
  function at(arr, f) { var x = clamp(f, 0, 1) * (arr.length - 1), a = Math.floor(x), b = Math.min(arr.length - 1, a + 1); return arr[a] + (arr[b] - arr[a]) * (x - a); }
  function parseNum(s) { var v = parseFloat(String(s).replace(/[^\d.\-]/g, '')); return isFinite(v) ? v : 0; }

  /* ============================== lienzo ============================== */
  function toRgb(cssColor, scratch) {
    try { var c = scratch.getContext('2d'); c.clearRect(0, 0, 1, 1); c.fillStyle = '#000'; c.fillStyle = cssColor; c.fillRect(0, 0, 1, 1); var d = c.getImageData(0, 0, 1, 1).data; if (d[3] > 0) return [d[0], d[1], d[2]]; } catch (e) { }
    return [201, 162, 74];
  }
  function Chart(stage, getDead, hooks) {
    var canvas = stage.querySelector('canvas'), ctx = canvas.getContext('2d'), off = doc.createElement('canvas'), octx = off.getContext('2d'), scratch = doc.createElement('canvas');
    scratch.width = scratch.height = 1;
    var W = 0, H = 0, dpr = 1, sized = false, colors = null, ff = '', RGB = [201, 162, 74], img = null;
    var cur = null, from = null, to = null, t0 = 0, dur = 0, started = false, revT0 = 0, revDone = false, hf = -1, kbM = -1, pend = false, rid = 0, tid = 0, tkFrom = null, tkTo = null, res = null;
    function size() {
      var r = stage.getBoundingClientRect(); if (r.width < 4 || r.height < 4) { sized = false; return; }
      dpr = Math.min(window.devicePixelRatio || 1, 2); W = r.width; H = r.height;
      var cw = Math.round(W * dpr), ch = Math.round(H * dpr); if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      sized = true;
    }
    function readColors() {
      var cs = getComputedStyle(stage), g = function (n) { return cs.getPropertyValue(n).trim(); };
      colors = { text: g('--text'), t2: g('--text-2'), t3: g('--text-3'), line: g('--line'), grid: g('--grid'), s1: g('--s1'), s2: g('--s2'), acc: g('--accent'), ink: g('--accent-ink') }; ff = cs.fontFamily;
      RGB = toRgb(colors.acc, scratch);
    }
    function set(state, r, anim) {
      var now = performance.now(); res = r;
      if (!cur) { cur = cloneState(state); to = state; from = null; dur = 0; tkTo = { yt: state.yt, xt: state.xt }; tkFrom = null; schedule(); return; }
      var fr = cloneState(cur);
      /* la meta nace/muere en su sitio y solo cambia su opacidad */
      if (!fr.gA) fr.goal = state.goal || fr.goal; if (!state.gA) state.goal = fr.goal;
      /* mismo número de hilos: si cambia, se rellena con el último */
      while (fr.thr.length < state.thr.length) fr.thr.push(fr.thr[fr.thr.length - 1].slice()); while (cur.thr.length < state.thr.length) cur.thr.push(cur.thr[cur.thr.length - 1].slice());
      from = fr; to = state; tkFrom = tkTo; tkTo = { yt: state.yt, xt: state.xt }; t0 = now; dur = anim && started && !reduce() ? TWEEN : 0;
      if (!dur) { cur = cloneState(state); from = null; tkFrom = null; }
      schedule();
    }
    function step(now) {
      if (!to) return false;
      var e = dur ? 1 - Math.pow(1 - clamp((now - t0) / dur, 0, 1), 3) : 1; /* ease-out cúbico, equivalente a cubic-bezier(.23,1,.32,1) en carácter */
      if (from) { if (e >= 1) { cur = cloneState(to); from = null; tkFrom = null; dur = 0; return false; } lerpInto(cur, from, to, e); return true; }
      return false;
    }
    function monthAt() { if (!to) return -1; if (hf >= 0) return Math.round(hf * to.M); return kbM; }
    function paint() { if (hooks.read) hooks.read(monthAt()); }
    function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
    function rgba(a) { return 'rgba(' + RGB[0] + ',' + RGB[1] + ',' + RGB[2] + ',' + a + ')'; }

    function paintDens(PL, PT, pw, ph, a) {
      var B = to.B, h = Math.max(32, Math.min(260, Math.round(ph / 1.4))), w = NP, j, py, b0, t, d0, d1, o, d, v;
      if (off.width !== w || off.height !== h) { off.width = w; off.height = h; img = null; }
      if (!img) img = octx.createImageData(w, h);
      var px = img.data, span = (cur.hi - cur.lo) || 1, dens = cur.dens, ys = cur.ymax - cur.ymin;
      for (py = 0; py < h; py++) {
        v = cur.ymax - (py + 0.5) / h * ys; var fb = v > 1 ? (Math.log(v) - cur.lo) / span * B - 0.5 : -9; b0 = Math.floor(fb); t = fb - b0;
        for (j = 0; j < w; j++) {
          o = (py * w + j) * 4; d0 = b0 >= 0 && b0 < B ? dens[j * B + b0] : 0; d1 = b0 + 1 >= 0 && b0 + 1 < B ? dens[j * B + b0 + 1] : 0; d = d0 * (1 - t) + d1 * t;
          px[o] = RGB[0]; px[o + 1] = RGB[1]; px[o + 2] = RGB[2]; px[o + 3] = d > 0.01 ? 255 * Math.min(1, Math.pow(d, 1.45)) * 0.78 : 0; /* las colas se desvanecen en vez de dejar polvo */
        }
      }
      octx.putImageData(img, 0, 0);
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.globalAlpha = a; ctx.drawImage(off, PL, PT, pw, ph); ctx.restore();
    }

    function draw(now) {
      if (!sized || !colors || !cur) return;
      var narrow = W < 460, HW = narrow ? 38 : 66, PL = 0, PR = W - HW - 10, PT = 12, BT = 28, PB = H - BT, pw = PR - PL, ph = PB - PT, S1 = NP - 1;
      var ys = (cur.ymax - cur.ymin) || 1;
      function X(f) { return PL + f * pw; } function Y(v) { return PB - (v - cur.ymin) / ys * ph; }
      var te = from && dur ? clamp((now - t0) / dur, 0, 1) : 1, rv = started ? (revDone ? 1 : easeOut((now - revT0) / 760)) : 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.font = '400 11px ' + ff;
      /* rejilla horizontal con rótulos (con un halo del color de la superficie para leerlos sobre el calor) */
      function gridY(list, a) {
        if (!list || a <= 0.01) return; ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.lineWidth = 3; ctx.strokeStyle = colors.s1;
        list.forEach(function (tk) { var y = Y(tk.v); if (y < PT - 1 || y > PB + 1) return; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = colors.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PL, Math.round(y) + 0.5); ctx.lineTo(PR, Math.round(y) + 0.5); ctx.stroke(); ctx.restore(); ctx.strokeStyle = colors.s1; ctx.lineWidth = 3; ctx.strokeText(tk.text, PL + 2, y - 3); ctx.fillStyle = colors.t3; ctx.fillText(tk.text, PL + 2, y - 3); });
        ctx.restore();
      }
      var fade = tkFrom && from ? te : 1;
      if (tkFrom && from) gridY(tkFrom.yt, 1 - te); gridY(tkTo.yt, fade);
      ctx.strokeStyle = colors.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PL, Math.round(PB) + 0.5); ctx.lineTo(PR, Math.round(PB) + 0.5); ctx.stroke();
      /* eje X: años calendario; las marcas se recolocan con la duración que tenga el eje en este cuadro */
      function gridX(list, a) {
        if (!list || a <= 0.01) return; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = colors.t3; ctx.textBaseline = 'top';
        list.forEach(function (tk) { var f = tk.t / cur.Y; if (f > 1.001 || f < 0) return; var x = X(f), tw = ctx.measureText(tk.text).width; ctx.textAlign = 'center'; var lx = clamp(x, PL + tw / 2, PR - tw / 2); ctx.strokeStyle = colors.line; ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, PB); ctx.lineTo(Math.round(x) + 0.5, PB + 4); ctx.stroke(); ctx.fillText(tk.text, lx, PB + 8); });
        ctx.restore();
      }
      if (tkFrom && from) gridX(tkFrom.xt, 1 - te); gridX(tkTo.xt, fade);
      ctx.save(); ctx.fillStyle = colors.t3; ctx.textBaseline = 'top'; ctx.textAlign = 'left'; ctx.fillText(MES[M0] + ' ' + Y0, PL, PB + 8); ctx.restore();
      /* revelado: todo lo del cono se descubre de izquierda a derecha */
      ctx.save(); ctx.beginPath(); ctx.rect(PL - 1, 0, pw * rv + 2, H); ctx.clip();
      paintDens(PL, PT, pw, ph, 1);
      /* banda p25–p75 */
      ctx.beginPath(); var j; for (j = 0; j < NP; j++) { var x = X(j / S1), y = Y(cur.p75[j]); if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      for (j = S1; j >= 0; j--) ctx.lineTo(X(j / S1), Y(cur.p25[j])); ctx.closePath(); ctx.fillStyle = rgba(0.13); ctx.fill();
      ctx.strokeStyle = rgba(0.38); ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
      /* hilos de ejemplo: se dibujan al entrar, uno tras otro */
      var nth = cur.thr.length; ctx.save(); ctx.beginPath(); ctx.rect(PL - 1, PT - 2, pw + 2, ph + 4); ctx.clip(); ctx.lineWidth = 1; ctx.strokeStyle = colors.t3; ctx.globalAlpha = 0.16;
      cur.thr.forEach(function (arr, k) {
        var fr = clamp(rv * 1.35 - k / Math.max(1, nth - 1) * 0.35, 0, 1); if (fr <= 0) return; var jm = fr * S1, jf = Math.floor(jm), q;
        ctx.beginPath(); for (q = 0; q <= jf; q++) { var xx = X(q / S1), yy = Y(arr[q]); if (q) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
        if (jf < S1) { var tt = jm - jf; ctx.lineTo(X(jm / S1), Y(arr[jf] + (arr[jf + 1] - arr[jf]) * tt)); } ctx.stroke();
      });
      ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(PL - 1, PT - 2, pw * rv + 2, ph + 4); ctx.clip();
      function line(arr, col, w, dash, al) { ctx.save(); ctx.globalAlpha = al == null ? 1 : al; ctx.strokeStyle = col; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash); ctx.beginPath(); for (var q = 0; q < NP; q++) { var xx = X(q / S1), yy = Y(arr[q]); if (q) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); } ctx.stroke(); ctx.restore(); }
      line(cur.p10, colors.ink, 1.3, null, 0.75); line(cur.p90, colors.ink, 1.3, null, 0.75);
      line(cur.inv, colors.t2, 1.5, [5, 4], 1);
      /* meta */
      if (cur.gA > 0.01 && cur.goal > 0) {
        var gy = Y(cur.goal), off_ = cur.goal > cur.ymax; gy = clamp(gy, PT + 1, PB - 1);
        ctx.save(); ctx.globalAlpha = cur.gA; ctx.strokeStyle = colors.text; ctx.lineWidth = 1.2; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(PL, Math.round(gy) + 0.5); ctx.lineTo(PR, Math.round(gy) + 0.5); ctx.stroke(); ctx.restore();
      }
      line(cur.p50, colors.s1, 4.4, null, 0.9); line(cur.p50, colors.ink, 2.4, null, 1);
      ctx.restore();
      if (cur.gA > 0.01 && cur.goal > 0 && rv > 0.6) {
        var gy2 = clamp(Y(cur.goal), PT + 10, PB - 6), lab = (cur.goal > cur.ymax ? 'Meta ' + compact(cur.goal) + ' ↑' : 'Meta ' + compact(cur.goal)), lw = ctx.measureText(lab).width + 12;
        ctx.save(); ctx.globalAlpha = cur.gA; ctx.fillStyle = colors.s2; ctx.strokeStyle = colors.line; rr(PR - lw, gy2 - 21, lw, 18, 5); ctx.fill(); ctx.stroke(); ctx.fillStyle = colors.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lab, PR - lw / 2, gy2 - 11.5); ctx.restore();
      }
      /* histograma de valores finales, pegado al borde derecho */
      var hx = W - HW, bw = HW - 4, hv = cur.hist, hs = (cur.ymax - cur.ymin) / HB, ha = clamp((rv - 0.4) / 0.6, 0, 1);
      ctx.save(); ctx.fillStyle = rgba(0.55); ctx.strokeStyle = rgba(0.9);
      for (var i = 0; i < HB; i++) { var l = hv[i] * bw * easeOut(ha); if (l < 0.3) continue; var yt = Y(cur.ymin + (i + 1) * hs), yb = Y(cur.ymin + i * hs); ctx.fillRect(W - l, yt + 0.5, l, Math.max(1, yb - yt - 1)); }
      ctx.strokeStyle = colors.line; ctx.beginPath(); ctx.moveTo(Math.round(W - 0.5) + 0.5, PT); ctx.lineTo(Math.round(W - 0.5) + 0.5, PB); ctx.stroke();
      ctx.fillStyle = colors.t3; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('Al final', W, PB + 8);
      ctx.restore();
      /* cruz */
      var m = monthAt();
      if (m >= 0 && te >= 1 && rv >= 1) {
        var f = m / to.M, xc = Math.round(X(f)) + 0.5;
        ctx.strokeStyle = colors.t2; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xc, PT); ctx.lineTo(xc, PB); ctx.stroke(); ctx.setLineDash([]);
        [[cur.p90, colors.ink], [cur.p50, colors.ink], [cur.p10, colors.ink], [cur.inv, colors.t2]].forEach(function (p, q) { ctx.fillStyle = p[1]; ctx.strokeStyle = colors.s1; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(xc, Y(at(p[0], f)), q === 1 ? 4 : 3.2, 0, 6.2832); ctx.stroke(); ctx.fill(); });
        var lb = mLabel(m), lw2 = ctx.measureText(lb).width + 12, lx2 = clamp(xc - lw2 / 2, PL, PR - lw2);
        ctx.fillStyle = colors.s2; ctx.strokeStyle = colors.line; ctx.lineWidth = 1; rr(lx2, PB + 4, lw2, 20, 5); ctx.fill(); ctx.stroke(); ctx.fillStyle = colors.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lb, lx2 + lw2 / 2, PB + 14.5);
      }
    }
    function frame() {
      cancelAnimationFrame(rid); clearTimeout(tid); pend = false; if (getDead()) return; var now = performance.now();
      if (!sized) size(); if (sized && !colors) readColors();
      var more = step(now); if (started && !revDone) { if (reduce() || now - revT0 >= 800) revDone = true; else more = true; }
      draw(now); if (more) schedule();
    }
    function schedule() { if (pend || getDead()) return; pend = true; rid = requestAnimationFrame(frame); tid = setTimeout(frame, 50); }
    function plotW() { return W - (W < 460 ? 38 : 66) - 10; }
    function pointerAt(e) {
      if (!to || !started) return; var r = stage.getBoundingClientRect(), x = e.clientX - r.left, pw = plotW();
      if (x < 0 || x > pw) { clearHover(); return; } hf = clamp(x / pw, 0, 1); kbM = -1; paint(); schedule();
    }
    function clearHover() { var was = hf >= 0 || kbM >= 0; hf = -1; kbM = -1; if (was) paint(); schedule(); }
    var ev = [['pointermove', pointerAt], ['pointerdown', pointerAt], ['pointerleave', clearHover], ['pointercancel', clearHover], ['blur', clearHover],
      ['pointerup', function (e) { if (e.pointerType === 'touch') clearHover(); }],
      ['keydown', function (e) {
        if (!to) return; var M = to.M, c = kbM >= 0 ? kbM : (hf >= 0 ? Math.round(hf * M) : M), st = e.shiftKey ? 12 : 1, n = c;
        if (e.key === 'ArrowLeft') n = c - st; else if (e.key === 'ArrowRight') n = c + st; else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = M; else if (e.key === 'Escape') { clearHover(); return; } else return;
        e.preventDefault(); kbM = clamp(n, 0, M); hf = -1; paint(); schedule();
      }]];
    ev.forEach(function (p) { stage.addEventListener(p[0], p[1]); });
    return {
      set: set, size: function () { size(); schedule(); }, schedule: schedule, theme: function () { colors = null; schedule(); },
      start: function () { if (started) return; started = true; revT0 = performance.now(); if (reduce()) revDone = true; schedule(); }, started: function () { return started; },
      stop: function () { cancelAnimationFrame(rid); clearTimeout(tid); ev.forEach(function (p) { stage.removeEventListener(p[0], p[1]); }); }
    };
  }

  /* ============================== textos de definición ============================== */
  var DEF = {
    med: 'La mediana (p50) del valor del portafolio al final del horizonte: la mitad de las trayectorias simuladas termina por encima y la otra mitad por debajo. Incluye lo que ya tienes más tus aportes mensuales.',
    rng: 'Entre el percentil 10 y el 90 del valor final: 8 de cada 10 trayectorias terminan dentro de este rango, 1 de cada 10 termina por debajo y 1 de cada 10 por encima.',
    goal: 'Fracción de las trayectorias simuladas cuyo valor final alcanza o supera la meta. Si estás en pesos de hoy, la meta también se compara en pesos de hoy.',
    loss: 'Fracción de las trayectorias que terminan con menos dinero del que pusiste (valor inicial más aportes acumulados, en las mismas unidades). Es la probabilidad de perder dinero en términos de lo aportado.',
    irr: 'Tasa interna de retorno anual de la trayectoria mediana: el rendimiento constante que, aplicado a tu valor de hoy y a tus aportes mensuales, produce ese valor final. Se muestra nominal y descontando la inflación esperada.',
    mdd: 'La caída máxima desde un pico previo del rendimiento del portafolio, sin contar aportes (un aporte no tapa una caída). Es la mediana entre todas las trayectorias: el bajón que sufre una trayectoria típica en algún momento.',
    mdd90: 'La caída máxima que solo se supera en 1 de cada 10 trayectorias (percentil 90 de la caída máxima). Sirve para ponerle un número al mal escenario sin irse al peor caso.'
  };

  /* ============================== render ============================== */
  var uid = 0;
  function render(mount, portfolio, T) {
    var off = [], dead = false, getDead = function () { return dead; }, Mod = window.CampoModel;
    function on(el, ev, fn, o) { el.addEventListener(ev, fn, o); off.push(function () { el.removeEventListener(ev, fn, o); }); }
    function destroy() { if (dead) return; dead = true; off.forEach(function (f) { try { f(); } catch (e) { } }); off = []; if (mount) mount.innerHTML = ''; }
    var api = { destroy: destroy };
    var pf = portfolio === 'todos' || (portfolio && (portfolio.cons || portfolio.id === 'todos')) ? 'todos' : portfolio;
    var inp = null; try { inp = Mod && Mod.inputs(pf); } catch (e) { inp = null; }
    if (!inp || !inp.assets || !inp.assets.length) {
      mount.innerHTML = '<div class="pmc"><div class="pmc-empty"><strong>Aún no hay con qué simular</strong><p>Cuando este portafolio tenga posiciones, aquí verás el abanico de futuros posibles: qué tan probable es llegar a una meta y cuánto podrías perder en un mal periodo.</p></div></div>';
      return api;
    }
    var id = 'pmc' + (++uid);
    var P = { years: 10, monthly: 5000, goal: 0, real: true, dist: 'normal', drift: 'blend', reb: 'annual', fee: 0, tc: 0.29, tax: false, indexed: false, unc: true };
    var YEARS = [1, 3, 5, 10, 20, 30];
    function $(s, r) { return (r || mount).querySelector(s); }
    function $$(s, r) { return Array.prototype.slice.call((r || mount).querySelectorAll(s)); }

    /* ---------- estructura ---------- */
    function sel(name, label, opts, val) {
      return '<div class="pmc-f"><label for="' + id + '-' + name + '">' + label + '</label><select id="' + id + '-' + name + '" data-p="' + name + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === val ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>';
    }
    function chk(name, label, val) { return '<label class="pmc-ck"><input type="checkbox" data-c="' + name + '"' + (val ? ' checked' : '') + '><span>' + label + '</span></label>'; }
    var scope = pf === 'todos' ? 'Todos tus portafolios, en pesos' : esc(inp.name || 'Este portafolio');
    var ctrlHTML = '<section class="pmc-s panel pmc-ctl" aria-labelledby="' + id + 'h1"><div class="panel-head"><h2 id="' + id + 'h1">Proyección a futuro</h2><span class="muted" data-sub></span></div>' +
      '<div class="pmc-row"><div class="pmc-g"><span class="pmc-l" id="' + id + '-hl">Horizonte, en años</span><div class="seg pmc-seg" role="group" aria-labelledby="' + id + '-hl" style="--n:6;--i:3"><span class="seg-pill" aria-hidden="true"></span>' +
      YEARS.map(function (y) { return '<button type="button" data-y="' + y + '" aria-label="' + y + (y === 1 ? ' año' : ' años') + '" aria-pressed="' + (y === P.years) + '">' + y + '</button>'; }).join('') + '</div></div>' +
      '<div class="pmc-g pmc-gm"><label class="pmc-l" for="' + id + '-mn">Aporte mensual</label><div class="pmc-sl"><input type="range" id="' + id + '-ms" min="0" max="50000" step="500" value="' + P.monthly + '" aria-label="Aporte mensual, deslizador" data-ms>' +
      '<div class="pmc-num"><span aria-hidden="true">$</span><input type="number" id="' + id + '-mn" min="0" max="1000000" step="500" inputmode="numeric" value="' + P.monthly + '" data-mn></div></div></div>' +
      '<div class="pmc-g pmc-gg"><label class="pmc-l" for="' + id + '-gl">Meta <em>(opcional)</em></label><div class="pmc-num pmc-numg"><span aria-hidden="true">$</span><input type="number" id="' + id + '-gl" min="0" step="10000" inputmode="numeric" placeholder="Ej. 2,000,000" data-gl></div></div>' +
      '<div class="pmc-g pmc-gr"><span class="pmc-l" id="' + id + '-rl">Valores en</span><button type="button" class="pmc-sw" role="switch" aria-checked="true" aria-labelledby="' + id + '-rl ' + id + '-rt" data-real><span class="pmc-swt" aria-hidden="true"><i></i></span><span id="' + id + '-rt">Pesos de hoy</span></button></div></div>' +
      '<details class="pmc-adv"><summary><span>Supuestos avanzados</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></summary><div class="pmc-advb"><div class="pmc-advg">' +
      sel('dist', 'Distribución de rendimientos', [['normal', 'Normal'], ['t', 't de Student (colas gruesas)'], ['block', 'Bootstrap por bloques (meses reales)']], P.dist) +
      sel('drift', 'Deriva (rendimiento esperado)', [['blend', 'Mixta: prior de largo plazo y último año'], ['prior', 'Solo prior de largo plazo'], ['sample', 'Solo el último año']], P.drift) +
      sel('reb', 'Rebalanceo', [['annual', 'Anual'], ['quarterly', 'Trimestral'], ['band', 'Por bandas de ±5 %'], ['none', 'Ninguno']], P.reb) +
      '<div class="pmc-f"><label for="' + id + '-fee">Comisión anual (%)</label><input type="number" id="' + id + '-fee" min="0" max="5" step="0.05" inputmode="decimal" value="' + P.fee + '" data-n="fee"></div>' +
      '<div class="pmc-f"><label for="' + id + '-tc">Costo por operación (%)</label><input type="number" id="' + id + '-tc" min="0" max="3" step="0.01" inputmode="decimal" value="' + P.tc + '" data-n="tc" aria-describedby="' + id + '-tch"><span class="pmc-hint" id="' + id + '-tch">0.29 % = 0.25 % de comisión + IVA</span></div></div>' +
      '<div class="pmc-cks">' + chk('tax', 'Descontar el ISR al rebalancear', P.tax) + chk('indexed', 'Aportes indexados a la inflación', P.indexed) + chk('unc', 'Incertidumbre de parámetros', P.unc) + '</div>' +
      '<p class="pmc-warn" data-warn hidden role="status">Con 1 año de datos, el rendimiento del último año es casi ruido: esta opción puede dar resultados muy optimistas o muy pesimistas. Úsala solo para comparar.</p></div></details></section>';

    var ledHTML = '<section class="pmc-s panel pmc-ledp" aria-labelledby="' + id + 'h3"><div class="panel-head"><h2 id="' + id + 'h3">Qué esperar</h2><span class="muted" data-ledsub></span></div><div class="pmc-led" data-led>' +
      [['med', 'Mediana al final', 'big'], ['rng', 'Rango probable', 'big'], ['goal', 'Probabilidad de la meta', 'big'], ['loss', 'Terminar con menos de lo aportado', 'big'], ['irr', 'TIR mediana', 'big'], ['mdd', 'Caída máxima típica', 'big'], ['mdd90', '1 de cada 10 cae más de', 'big']].map(function (k, i) {
        var did = id + '-def' + i;
        return '<article class="pmc-k" data-k="' + k[0] + '"><div class="pmc-kh"><h3 class="pmc-kn">' + k[1] + '</h3><button type="button" class="pmc-i" aria-expanded="false" aria-controls="' + did + '" aria-label="¿Qué significa «' + k[1] + '»?"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg></button></div>' +
          '<p class="pmc-kv num" data-kv></p><p class="pmc-ks" data-ks></p><div class="pmc-def" id="' + did + '" role="region" aria-label="Definición"><div class="pmc-defi"><p>' + DEF[k[0]] + '</p></div></div></article>';
      }).join('') + '</div></section>';

    var chartHTML = '<section class="pmc-s panel pmc-ch" aria-labelledby="' + id + 'h2"><div class="pmc-ctop"><h2 id="' + id + 'h2" data-ctitle>Abanico de resultados</h2><span class="muted" data-csub></span></div>' +
      '<dl class="pmc-ro" data-ro><div><dt>Fecha</dt><dd data-r="d"></dd></div><div><dt>Optimista (p90)</dt><dd data-r="h"></dd></div><div><dt>Mediana</dt><dd data-r="m"></dd></div><div><dt>Pesimista (p10)</dt><dd data-r="l"></dd></div><div><dt>Aportado</dt><dd data-r="i"></dd></div></dl>' +
      '<div class="pmc-stage" tabindex="0" role="group" aria-labelledby="' + id + 'h2" aria-describedby="' + id + 'k" data-stage><canvas aria-hidden="true"></canvas></div>' +
      '<p class="pmc-sr" id="' + id + 'k" aria-live="polite" data-sr>Con las flechas izquierda y derecha lees cada mes; con Mayús, cada año.</p>' +
      '<ul class="pmc-key" aria-label="Cómo leer la gráfica"><li><i class="k-heat"></i>Zona más probable</li><li><i class="k-band"></i>Mitad central (p25–p75)</li><li><i class="k-med"></i>Mediana</li><li><i class="k-ext"></i>p10 y p90</li><li><i class="k-inv"></i>Lo aportado</li><li><i class="k-thr"></i>Trayectorias de ejemplo</li></ul></section>';

    var asmHTML = '<section class="pmc-s panel pmc-asm" aria-labelledby="' + id + 'h4"><div class="panel-head"><h2 id="' + id + 'h4">Supuestos por activo</h2><span class="muted" data-asub></span></div>' +
      '<div class="pmc-tw" tabindex="0" role="region" aria-label="Tabla de supuestos por activo, desplazable"><table class="pmc-tb"><thead><tr><th scope="col">Activo</th><th scope="col">Peso</th><th scope="col">Prior de largo plazo</th><th scope="col">Último año</th><th scope="col">Usado</th><th scope="col">Volatilidad (σ)</th></tr></thead><tbody data-atb></tbody></table></div>' +
      '<p class="pmc-expl" data-expl></p></section>';
    mount.innerHTML = '<div class="pmc" data-pmc>' + ctrlHTML + chartHTML + ledHTML + asmHTML + '<p class="pmc-foot">Simulación con supuestos · no es asesoría de inversión</p></div>';

    /* ---------- cifras animadas ---------- */
    var reg = {}, rolls = [], timers = [];
    function roll(el, a, b, fmt, ms) {
      if (el._rid) { cancelAnimationFrame(el._rid); clearTimeout(el._rt); el._rid = 0; }
      if (!ms || reduce() || a == null || a === b) { el.textContent = fmt(b); return; }
      var t0 = performance.now();
      (function tick() {
        if (dead) return; cancelAnimationFrame(el._rid); clearTimeout(el._rt); var e = easeOut((performance.now() - t0) / ms); el.textContent = fmt(a + (b - a) * e);
        if (e < 1) { el._rid = requestAnimationFrame(tick); el._rt = setTimeout(tick, 50); } else el._rid = 0;
      })();
      rolls.push(el);
    }
    function setNum(el, key, v, fmt, ms) {
      var o = reg[key]; reg[key] = { el: el, v: v, fmt: fmt };
      if (v == null) { if (el._rid) { cancelAnimationFrame(el._rid); clearTimeout(el._rt); el._rid = 0; } el.textContent = '—'; return; }
      roll(el, o && o.v != null ? o.v : null, v, fmt, ms == null ? TWEEN + 60 : ms);
    }
    off.push(function () { rolls.forEach(function (el) { cancelAnimationFrame(el._rid); clearTimeout(el._rt); }); timers.forEach(clearTimeout); });

    /* ---------- estado de simulación ---------- */
    var res = null, chart = null, started = false, srT = 0;
    function opts() { return { years: P.years, monthly: P.monthly, goal: P.goal || 0, real: P.real, indexed: P.indexed, dist: P.dist, drift: P.drift, rebalance: P.reb, fee: P.fee / 100, tradeCost: P.tc / 100, tax: P.tax, paramUnc: P.unc }; }
    function unitTxt() { return P.real ? 'en pesos de hoy' : 'en pesos nominales'; }
    function paintAll(first) {
      var s = res.stats, M = res.months, inv = res.invested[M], yrTxt = res.years + (res.years === 1 ? ' año' : ' años'), last = mLabel(M);
      $('[data-sub]').textContent = scope + ' · ' + fN(res.n, 0) + ' trayectorias simuladas';
      $('[data-ctitle]').textContent = 'Abanico de resultados a ' + yrTxt;
      $('[data-csub]').textContent = 'Valores ' + unitTxt() + ' · hasta ' + last;
      $('[data-ledsub]').textContent = 'A ' + yrTxt + ' · ' + unitTxt();
      var ms = first ? 0 : null;
      function K(k) { return $('[data-k="' + k + '"]'); }
      function put(k, v, fmt, sub, cls) { var c = K(k), kv = $('[data-kv]', c); kv.className = 'pmc-kv num' + (cls ? ' ' + cls : ''); setNum(kv, k, v, fmt, ms); $('[data-ks]', c).innerHTML = sub; }
      put('med', s.median, fM, 'Mitad de las trayectorias queda por encima. Aportado: <b class="num">' + fM(inv) + '</b>');
      var rk = K('rng'), rkv = $('[data-kv]', rk); rkv.className = 'pmc-kv pmc-kr num'; if (!$('[data-a]', rkv)) rkv.innerHTML = '<span data-a></span><i aria-hidden="true">–</i><span data-b></span>';
      setNum($('[data-a]', rkv), 'rng-a', s.p10, compact, ms); setNum($('[data-b]', rkv), 'rng-b', s.p90, compact, ms);
      $('[data-ks]', rk).innerHTML = '8 de cada 10 terminan aquí: <b class="num">' + fM(s.p10) + '</b> a <b class="num">' + fM(s.p90) + '</b>';
      if (s.pGoal == null) put('goal', null, null, 'Escribe una meta arriba para ver su probabilidad.', 'flat');
      else put('goal', s.pGoal * 100, function (v) { return fN(v, 0) + ' %'; }, 'De llegar a <b class="num">' + fM(P.goal) + '</b> ' + unitTxt() + (s.shortfall > 0 ? '. Si falla, típicamente le faltan <b class="num">' + fM(s.shortfall) + '</b>' : ''), s.pGoal >= 0.5 ? 'gain' : 'loss');
      put('loss', s.pLoss * 100, function (v) { return fN(v, 0) + ' %'; }, 'Probabilidad de que termines con menos de lo que pusiste (' + fM(inv) + ')', s.pLoss > 0.25 ? 'loss' : '');
      var c = s.cagr.p50;
      if (!c) put('irr', null, null, 'No se pudo calcular para este caso.', 'flat');
      else put('irr', c.nominal * 100, function (v) { return fN(v, 1) + ' %'; }, 'Nominal · real, descontando la inflación: <b class="num">' + fN(c.real * 100, 1) + ' %</b>');
      put('mdd', -s.mddMedian * 100, function (v) { return fPu(v, 0); }, 'Lo que baja una trayectoria típica desde su pico', 'loss');
      put('mdd90', -s.mddP90 * 100, function (v) { return fPu(v, 0); }, 'Solo el 10 % de las trayectorias cae más que esto', 'loss');
      /* tabla de supuestos */
      var A = res.assumptions, rows = A.assets.map(function (a, i) {
        var nm = inp.assets[i] ? inp.assets[i].name : a.ticker;
        return '<tr><th scope="row"><span class="pmc-an"><strong>' + esc(a.ticker) + '</strong><span>' + esc(a.clsName) + (nm && nm !== a.ticker ? ' · ' + esc(nm) : '') + '</span></span></th><td class="num">' + fPu(a.w * 100, 1) + '</td><td class="num">' + fPu(a.prior * 100, 1) + '</td><td class="num pmc-t3">' + fS(a.sample * 100, 1) + '</td><td class="num pmc-used">' + fPu(a.used * 100, 1) + '</td><td class="num">' + fPu(a.sigma * 100, 1) + '</td></tr>';
      }).join('');
      rows += '<tr class="pmc-tot"><th scope="row">Portafolio</th><td class="num">100 %</td><td class="num">—</td><td class="num">—</td><td class="num pmc-used">' + fPu(A.er * 100, 1) + '</td><td class="num">' + fPu(A.sigma * 100, 1) + '</td></tr>';
      $('[data-atb]').innerHTML = rows;
      $('[data-asub]').textContent = 'Rendimientos anuales esperados, nominales en pesos';
      var wsPct = fN(A.driftWeightSample * 100, 0), ex;
      if (A.drift === 'blend') ex = 'Con ' + fN(inp.Y, 0) + (inp.Y >= 1.5 ? ' años' : ' año') + ' de historia, el último año pesa <b>' + wsPct + ' %</b> en el rendimiento esperado y el resto viene del prior de largo plazo de cada clase de activo. Es más seguro que extrapolar el último año: la media de 12 meses tiene un error del tamaño de la propia volatilidad, así que un año excelente (o malo) casi no dice nada de lo que viene. La volatilidad y las correlaciones sí salen de tu historial.';
      else if (A.drift === 'prior') ex = 'Estás usando <b>solo el prior de largo plazo</b> de cada clase de activo: el último año pesa 0 %. La volatilidad y las correlaciones siguen saliendo de tu historial.';
      else ex = 'Estás usando <b>solo el último año</b>: pesa 100 % en el rendimiento esperado. Con 1 año de historia eso es ruido más que información; por eso la mezcla (último año 10 %, prior 90 %) es la opción por omisión.';
      $('[data-expl]').innerHTML = ex;
      $('[data-warn]').hidden = P.drift !== 'sample';
      /* resumen accesible, sin spamear mientras se arrastra */
      clearTimeout(srT); srT = setTimeout(function () { var el = $('[data-sr]'); if (el && !dead) el.textContent = 'A ' + yrTxt + ' la mediana es ' + fM(s.median) + ' ' + unitTxt() + '; 8 de cada 10 trayectorias terminan entre ' + fM(s.p10) + ' y ' + fM(s.p90) + '.' + (s.pGoal != null ? ' Probabilidad de la meta: ' + fN(s.pGoal * 100, 0) + ' por ciento.' : ''); }, 600);
    }

    /* ---------- lectura de la cruz ---------- */
    var roEl = $('[data-ro]');
    function ro(k) { return $('[data-r="' + k + '"]', roEl); }
    function read(m) {
      if (!res) return; var M = res.months, i = m >= 0 ? clamp(m, 0, M) : M;
      ro('d').textContent = (m >= 0 ? '' : 'Al final · ') + mLabel(i); ro('h').textContent = fM(res.pct.p90[i]); ro('m').textContent = fM(res.pct.p50[i]); ro('l').textContent = fM(res.pct.p10[i]); ro('i').textContent = fM(res.invested[i]);
      if (m >= 0) { var el = $('[data-sr]'); if (el) el.textContent = mLabel(i) + ': mediana ' + fM(res.pct.p50[i]) + ', pesimista ' + fM(res.pct.p10[i]) + ', optimista ' + fM(res.pct.p90[i]) + ', aportado ' + fM(res.invested[i]) + '.'; }
    }
    chart = Chart($('[data-stage]'), getDead, { read: read });

    /* ---------- ejecución (con rAF para no ahogar al deslizar) ---------- */
    var qid = 0, qt = 0;
    function run(anim, first) {
      var r; try { r = Mod.mc(inp, opts()); } catch (e) { return; }
      res = r; chart.set(snap(res, P.goal || 0), res, anim); paintAll(first); read(-1);
    }
    function queue() {
      if (qid || dead) return;
      qid = requestAnimationFrame(function () { qid = 0; clearTimeout(qt); run(true); });
      qt = setTimeout(function () { if (qid) { cancelAnimationFrame(qid); qid = 0; run(true); } }, 70);
    }
    off.push(function () { cancelAnimationFrame(qid); clearTimeout(qt); clearTimeout(srT); });

    /* ---------- controles ---------- */
    var seg = $('.pmc-seg'), ms = $('[data-ms]'), mn = $('[data-mn]'), gl = $('[data-gl]'), sw = $('[data-real]');
    function fill() { ms.style.setProperty('--pct', (clamp(P.monthly, 0, 50000) / 50000 * 100).toFixed(2) + '%'); }
    fill();
    on(seg, 'click', function (e) {
      var b = e.target.closest('button[data-y]'); if (!b) return; var y = +b.dataset.y; if (y === P.years) return; P.years = y;
      $$('button', seg).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); seg.style.setProperty('--i', YEARS.indexOf(y)); queue();
    });
    on(ms, 'input', function () { P.monthly = +ms.value; mn.value = P.monthly; fill(); queue(); });
    on(mn, 'input', function () { var v = clamp(parseNum(mn.value), 0, 1000000); P.monthly = v; ms.value = clamp(v, 0, 50000); fill(); queue(); });
    on(mn, 'blur', function () { mn.value = P.monthly; });
    on(gl, 'input', function () { P.goal = Math.max(0, parseNum(gl.value)); queue(); });
    on(sw, 'click', function () { P.real = !P.real; sw.setAttribute('aria-checked', String(P.real)); queue(); });
    $$('select[data-p]').forEach(function (s) { on(s, 'change', function () { P[s.dataset.p === 'reb' ? 'reb' : s.dataset.p] = s.value; queue(); }); });
    $$('input[data-n]').forEach(function (n) { on(n, 'input', function () { var v = parseNum(n.value), mx = n.dataset.n === 'fee' ? 5 : 3; P[n.dataset.n] = clamp(v, 0, mx); queue(); }); });
    $$('input[data-c]').forEach(function (c) { on(c, 'change', function () { P[c.dataset.c] = c.checked; queue(); }); });
    /* definiciones del renglón */
    on($('[data-led]'), 'click', function (e) {
      var b = e.target.closest('.pmc-i'); if (!b) return; var open = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', String(open));
      var d = document.getElementById(b.getAttribute('aria-controls')); if (open) d.setAttribute('data-open', ''); else d.removeAttribute('data-open');
    });

    /* ---------- primera vista ---------- */
    function visible() { return mount.offsetWidth > 0 && mount.offsetHeight > 0; }
    function start() {
      if (started || dead) return; started = true;
      var secs = $$('.pmc > .pmc-s');
      if (!reduce()) {
        secs.forEach(function (s, i) { if (s.animate) s.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 340, delay: i * 40, easing: EASE, fill: 'backwards' }); });
        Object.keys(reg).forEach(function (k, n) { var o = reg[k]; if (o.v == null) return; timers.push(setTimeout(function () { if (!dead && reg[k] && reg[k].v != null) roll(reg[k].el, 0, reg[k].v, reg[k].fmt, 700); }, 120 + n * 30)); });
        $$('.pmc-k').forEach(function (k, i) { if (k.animate) k.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 160 + i * 35, easing: EASE, fill: 'backwards' }); });
        $$('.pmc-tb tbody tr').forEach(function (r, i) { if (r.animate) r.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 200 + i * 30, easing: EASE, fill: 'backwards' }); });
      }
      chart.start();
    }
    run(false, true);
    if (mount.animate && !reduce()) mount.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EASE });
    if (window.ResizeObserver) { var ro_ = new ResizeObserver(function () { chart.size(); if (!started && visible()) start(); }); ro_.observe($('[data-stage]')); ro_.observe(mount); off.push(function () { ro_.disconnect(); }); }
    var resz = function () { chart.size(); }; window.addEventListener('resize', resz); off.push(function () { window.removeEventListener('resize', resz); });
    if (window.MutationObserver) { var mob = new MutationObserver(function () { chart.theme(); }); mob.observe(root, { attributes: true, attributeFilter: ['data-theme'] }); off.push(function () { mob.disconnect(); }); }
    var onRm = function () { chart.schedule(); }; if (rmq.addEventListener) { rmq.addEventListener('change', onRm); off.push(function () { rmq.removeEventListener('change', onRm); }); }
    off.push(function () { chart.stop(); });
    chart.size(); if (visible()) start(); else setTimeout(function () { chart.size(); if (!started && visible()) start(); }, 0);
    api.result = function () { return res; }; api.params = P;
    return api;
  }

  window.CampoPfMc = { render: render, calc: { resample: resample, resampleDens: resampleDens, histogram: histogram, yRange: yRange, yTicks: yTicks, xTicks: xTicks, snap: snap, cloneState: cloneState, lerpInto: lerpInto, mLabel: mLabel, compact: compact, NP: NP, HB: HB } };
})();
