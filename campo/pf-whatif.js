/* Campo · Portafolio individual · pestaña "What-If". Expone window.CampoPfWhatif.render(mount, portfolio|'todos', CampoTracker) -> { destroy }.
   No recalcula finanzas: todo sale de window.CampoModel (inputs, counterfactual, closed, scenarios, stress).
   1) ¿Y si hubiera invertido en…? — tus flujos en sus fechas invertidos en la alternativa, dos líneas que arrancan iguales.
   2) Lo que vendiste — cuánto valdría hoy lo que vendiste.  3) ¿Y si mañana…? — estrés: efecto del mercado vs efecto del peso. En producción, con los datos reales de campo/datos.js. */
(function () {
  'use strict';
  var D = window.PORTIFY_DEMO, M = window.CampoModel;
  if (!D || !M) return;
  var doc = typeof document !== 'undefined' ? document : null, root = doc && doc.documentElement;
  var LAST = 251;
  var rmq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduce() { return !!rmq.matches; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 4); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var EXPO = 'cubic-bezier(0.23, 1, 0.32, 1)';

  /* ============================== formato ============================== */
  var nf0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }), nfT = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }), nfc = {};
  /* moneda extranjera frente a la base (USD si la base no es dólar; MXN si lo es) */
  function FW() { var t = window.CampoTracker, b = (t && t.base) || 'MXN', f = (t && t.fx && t.fx.foreign) || (b === 'USD' ? 'MXN' : 'USD'), N = { MXN: 'peso', USD: 'dólar', EUR: 'euro', GBP: 'libra', CAD: 'dólar canadiense', BRL: 'real' };
    return { b: b, n: f === 'MXN' ? 'peso' : 'dólar', pl: f === 'MXN' ? 'pesos' : 'dólares', pair: f + '/' + b, bpl: b === 'MXN' ? 'pesos' : b === 'USD' ? 'dólares' : b, vs: { MXN: 'al peso', USD: 'al dólar', EUR: 'al euro', GBP: 'a la libra', CAD: 'al dólar canadiense', BRL: 'al real' }[b] || 'a ' + b, bArt: (b === 'GBP' ? 'La ' : 'El ') + (N[b] || b) }; }
  function SYM() { var d = window.PORTIFY_DEMO; return d && d.fmt && d.fmt.sym ? d.fmt.sym() : '$'; }
  function fM(v) { var a = Math.round(Math.abs(v)); return (v < 0 && a > 0 ? '−' : '') + SYM() + nf0.format(a); }
  function fA(v) { return SYM() + nf0.format(Math.round(Math.abs(v))); }
  function fS(v) { var a = Math.round(Math.abs(v)); return (a === 0 ? '' : v < 0 ? '−' : '+') + SYM() + nf0.format(a); }
  function fN(v, d) { if (!nfc[d]) nfc[d] = new Intl.NumberFormat('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d }); return nfc[d].format(v); }
  function fP(v, d) { d = d == null ? 1 : d; var a = Math.abs(v), z = a < 0.5 * Math.pow(10, -d); return (z ? '' : v < 0 ? '−' : '+') + fN(a, d) + ' %'; }
  function fPu(v, d) { d = d == null ? 0 : d; return fN(Math.abs(v), d) + ' %'; }
  function sgnCls(v) { return v > 0.5 ? 'gain' : v < -0.5 ? 'loss' : 'flat'; }
  function sgnClsP(v) { return v > 0.0005 ? 'gain' : v < -0.0005 ? 'loss' : 'flat'; }
  function dTxt(iso, short) { return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', short ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, ''); }
  function niceStep(span, n) { var raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag; return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag; }
  function compact(v) { var a = Math.abs(v), s = v < 0 ? '−' : ''; if (a >= 1e6) return s + SYM() + nfT.format(a / 1e6) + ' M'; if (a >= 1e3) return s + SYM() + nf0.format(Math.round(a / 1e3)) + ' mil'; return s + SYM() + Math.round(a); }

  var uid = 0;
  function every(fn) { var done = false, r = 0, t = 0; (function run() { if (done) return; cancelAnimationFrame(r); clearTimeout(t); if (fn() === false) { done = true; return; } r = requestAnimationFrame(run); t = setTimeout(run, 50); })(); }
  function mark(t) { return window.CampoMarks ? window.CampoMarks.svg(t, 24) : '<span class="pwi-chip">' + esc(String(t).charAt(0)) + '</span>'; }

  /* frases por alternativa (el "en …" de la oración de resultado) y notas */
  var ALT_SHORT = { sp500: 'S&P 500', nasdaq: 'Nasdaq 100', ipc: 'IPC', cetes: 'Cetes', btc: 'Bitcoin', oro: 'Oro', iguales: 'Pesos iguales' };
  var ALT_IN = { sp500: 'el S&P 500', nasdaq: 'el Nasdaq 100', ipc: 'el S&P/BMV IPC', cetes: 'Cetes a 28 días', btc: 'Bitcoin', oro: 'oro', iguales: 'tus mismas posiciones, en partes iguales' };
  var ALT_NOTE = { iguales: 'Las posiciones de hoy con el mismo monto en cada una, rebalanceadas a diario.', cetes: 'Rendimiento supuesto de 7 % anual, sin riesgo de mercado.', ipc: 'Índice mexicano.' };
  var ALT_DEFAULT_NOTE = 'Valuado en tu moneda base con el tipo de cambio de cada día.';
  var PERIODS = [['6M', 126, '6 meses'], ['1A', 251, '1 año']];

  /* ============================== gráfica de líneas (lienzo nítido) ============================== */
  function LineChart(stage, getDead, onRead) {
    var canvas = stage.querySelector('canvas'), ctx = canvas.getContext('2d'), S = 120, W = 0, H = 0, dpr = 1, RT = 74, PT = 14, BT = 26, sized = false, colors = null, ff = '';
    var cur = null, from = null, to = null, t0 = 0, dur = 0, te = 1, started = false, revT0 = 0, revDone = false, raw = null, hIdx = -1, kb = -1, pend = false, rid = 0, tid = 0, tkFrom = [], tkTo = [], xTk = [];
    function samp(arr) { var n = arr.length, out = new Float64Array(S); for (var j = 0; j < S; j++) { var f = j / (S - 1) * (n - 1), a = Math.floor(f), b = Math.min(n - 1, a + 1), t = f - a; out[j] = arr[a] * (1 - t) + arr[b] * t; } return out; }
    function build(d) {
      var lo = Infinity, hi = -Infinity, i; [d.actual, d.alternative].forEach(function (a) { for (i = 0; i < a.length; i++) { if (a[i] < lo) lo = a[i]; if (a[i] > hi) hi = a[i]; } });
      var pad = (hi - lo || Math.abs(hi) * 0.02 || 1) * 0.14; lo -= pad; hi += pad;
      var st = niceStep(hi - lo, 4), ticks = []; for (var v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) ticks.push({ v: +v.toFixed(6), text: compact(v) });
      var n = d.dates.length - 1, xt = [], per = n > 130;
      [0, 1 / 3, 2 / 3, 1].forEach(function (f, k) { xt.push({ f: f, text: dTxt(d.dates[Math.round(n * f)], !per).replace(/ de /g, ' ').replace(/(\d{4})$/, function (y) { return "'" + y.slice(2); }), al: k === 0 ? 'left' : k === 3 ? 'right' : 'center' }); });
      return { a: samp(d.actual), b: samp(d.alternative), lo: lo, hi: hi, ticks: ticks, xt: xt };
    }
    function set(d, anim) {
      var now = performance.now(); raw = d; hIdx = -1; kb = -1;
      from = cur ? { a: cur.a.slice(), b: cur.b.slice(), lo: cur.lo, hi: cur.hi } : null; tkFrom = tkTo;
      to = build(d); tkTo = to.ticks; xTk = to.xt; t0 = now; dur = anim && started && !reduce() && from ? 260 : 0;
      if (!dur || !from) { tkFrom = []; cur = { a: to.a.slice(), b: to.b.slice(), lo: to.lo, hi: to.hi }; from = null; te = 1; } else te = 0;
      readOut(-1); schedule();
    }
    function readOut(i) { if (raw && onRead) onRead(i, raw); }
    function size() {
      var r = stage.getBoundingClientRect(); if (r.width < 4 || r.height < 4) { sized = false; return; }
      dpr = Math.min(window.devicePixelRatio || 1, 2); W = r.width; H = r.height;
      var cw = Math.round(W * dpr), ch = Math.round(H * dpr); if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      RT = W < 420 ? 66 : 76; sized = true;
    }
    function readColors() { var cs = getComputedStyle(stage), g = function (n) { return cs.getPropertyValue(n).trim(); }; colors = { text: g('--text'), t2: g('--text-2'), t3: g('--text-3'), line: g('--line'), grid: g('--grid'), s1: g('--s1'), s2: g('--s2'), acc: g('--accent-ink'), gain: g('--gain'), loss: g('--loss') }; ff = cs.fontFamily; }
    function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
    function path(arr, X, Y, move) { for (var j = 0; j < S; j++) { var x = X(j / (S - 1)), y = Y(arr[j]); if (j || !move) ctx.lineTo(x, y); else ctx.moveTo(x, y); } }
    function draw(now) {
      if (!sized || !colors || !to || !cur) return;
      var PL = 0, PR = W - RT, PB = H - BT, ph = PB - PT, pw = PR - PL, span = (cur.hi - cur.lo) || 1;
      function X(f) { return PL + f * pw; } function Y(v) { return PB - (v - cur.lo) / span * ph; }
      var rv = started ? (revDone ? 1 : easeOut((now - revT0) / 600)) : 0, j;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.font = '400 11px ' + ff;
      function grid(list, a) {
        if (a <= 0.01) return; ctx.globalAlpha = a; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        list.forEach(function (t) { var y = Y(t.v); if (y < PT - 1 || y > PB + 1) return; ctx.strokeStyle = colors.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PL, Math.round(y) + 0.5); ctx.lineTo(PR, Math.round(y) + 0.5); ctx.stroke(); ctx.fillStyle = colors.t3; ctx.fillText(t.text, PL + 2, y - 3); });
        ctx.globalAlpha = 1;
      }
      grid(tkFrom, 1 - te); grid(tkTo, tkFrom.length ? te : 1);
      ctx.strokeStyle = colors.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PL, Math.round(PB) + 0.5); ctx.lineTo(PR, Math.round(PB) + 0.5); ctx.stroke();
      xTk.forEach(function (t) { ctx.fillStyle = colors.t3; ctx.textBaseline = 'top'; ctx.textAlign = t.al === 'right' ? 'right' : t.al; ctx.fillText(t.text, t.al === 'right' ? PR : X(t.f), PB + 8); });
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, PL + pw * rv + 2, H); ctx.clip();
      /* brecha: acento si vas por delante, grafito si vas por detrás */
      var a = cur.a, b = cur.b, j0 = 0;
      while (j0 < S - 1) {
        var sg = (a[j0] + a[j0 + 1]) >= (b[j0] + b[j0 + 1]), j1 = j0 + 1; while (j1 < S - 1 && ((a[j1] + a[j1 + 1]) >= (b[j1] + b[j1 + 1])) === sg) j1++;
        ctx.beginPath(); for (j = j0; j <= j1; j++) { var xx = X(j / (S - 1)), yy = Y(a[j]); if (j === j0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); }
        for (j = j1; j >= j0; j--) ctx.lineTo(X(j / (S - 1)), Y(b[j])); ctx.closePath();
        ctx.globalAlpha = sg ? 0.24 : 0.26; ctx.fillStyle = sg ? colors.acc : colors.t3; ctx.fill(); j0 = j1;
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = colors.t2; ctx.lineWidth = 1.9; ctx.beginPath(); path(b, X, Y, true); ctx.stroke();
      ctx.strokeStyle = colors.s1; ctx.lineWidth = 4.4; ctx.beginPath(); path(a, X, Y, true); ctx.stroke();
      ctx.strokeStyle = colors.acc; ctx.lineWidth = 2.4; ctx.beginPath(); path(a, X, Y, true); ctx.stroke();
      ctx.restore();
      /* etiquetas de cierre */
      if (rv > 0.85) {
        var al = clamp((rv - 0.85) / 0.15, 0, 1), yA = Y(a[S - 1]), yB = Y(b[S - 1]), lx = PR + 8, gap = 15, pa = yA, pb = yB;
        if (Math.abs(pa - pb) < gap) { var mid = (pa + pb) / 2; if (pa <= pb) { pa = mid - gap / 2; pb = mid + gap / 2; } else { pa = mid + gap / 2; pb = mid - gap / 2; } }
        pa = clamp(pa, PT + 6, PB - 6); pb = clamp(pb, PT + 6, PB - 6);
        var va = a[S - 1] * 1, vb = b[S - 1] * 1; ctx.globalAlpha = al; ctx.font = '600 11.5px ' + ff; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = colors.acc; ctx.fillText(fM(va), lx, pa); ctx.fillStyle = colors.t2; ctx.fillText(fM(vb), lx, pb);
        ctx.fillStyle = colors.acc; ctx.beginPath(); ctx.arc(PR, yA, 3.4, 0, 6.2832); ctx.fill(); ctx.fillStyle = colors.t2; ctx.beginPath(); ctx.arc(PR, yB, 3.4, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1;
      }
      var ci = hIdx >= 0 ? hIdx : kb;
      if (ci >= 0 && te >= 1 && rv >= 1) {
        var n = raw.dates.length - 1, xc = Math.round(X(ci / n)) + 0.5;
        ctx.strokeStyle = colors.t2; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xc, PT); ctx.lineTo(xc, PB); ctx.stroke(); ctx.setLineDash([]);
        [[raw.alternative[ci], colors.t2], [raw.actual[ci], colors.acc]].forEach(function (p) { ctx.fillStyle = p[1]; ctx.strokeStyle = colors.s1; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(xc, Y(p[0]), 3.8, 0, 6.2832); ctx.stroke(); ctx.fill(); });
        ctx.font = '400 11px ' + ff; var lb = dTxt(raw.dates[ci], true), lw = ctx.measureText(lb).width + 12, lx2 = clamp(xc - lw / 2, PL, PR - lw + 6);
        ctx.fillStyle = colors.s2; ctx.strokeStyle = colors.line; ctx.lineWidth = 1; rr(lx2, PB + 3, lw, 18, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = colors.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lb, lx2 + lw / 2, PB + 12.5);
      }
    }
    function frame() {
      cancelAnimationFrame(rid); clearTimeout(tid); pend = false; if (getDead()) return; var now = performance.now();
      if (!sized) size(); if (sized && !colors) readColors();
      var more = false;
      if (from) { var e = dur ? easeOut((now - t0) / dur) : 1; te = e; for (var j = 0; j < S; j++) { cur.a[j] = from.a[j] + (to.a[j] - from.a[j]) * e; cur.b[j] = from.b[j] + (to.b[j] - from.b[j]) * e; } cur.lo = from.lo + (to.lo - from.lo) * e; cur.hi = from.hi + (to.hi - from.hi) * e; if (e >= 1) { from = null; dur = 0; te = 1; tkFrom = []; } else more = true; }
      if (started && !revDone) { if (reduce() || now - revT0 >= 640) revDone = true; else more = true; }
      draw(now); if (more) schedule();
    }
    function schedule() { if (pend || getDead()) return; pend = true; rid = requestAnimationFrame(frame); tid = setTimeout(frame, 50); }
    function pointerAt(e) {
      var r = stage.getBoundingClientRect(), pw = W - RT, x = e.clientX - r.left; if (!raw || x < 0 || x > pw + 6) { clearHover(); return; }
      hIdx = Math.round(clamp(x / pw, 0, 1) * (raw.dates.length - 1)); kb = -1; readOut(hIdx); schedule();
    }
    function clearHover() { var was = hIdx >= 0 || kb >= 0; hIdx = -1; kb = -1; if (was) readOut(-1); schedule(); }
    stage.addEventListener('pointermove', pointerAt); stage.addEventListener('pointerdown', pointerAt); stage.addEventListener('pointerleave', clearHover); stage.addEventListener('pointercancel', clearHover);
    stage.addEventListener('pointerup', function (e) { if (e.pointerType === 'touch') clearHover(); }); stage.addEventListener('blur', clearHover);
    stage.addEventListener('keydown', function (e) {
      if (!raw) return; var n = raw.dates.length - 1, c = kb >= 0 ? kb : n, st = e.shiftKey ? 5 : 1, k = c;
      if (e.key === 'ArrowLeft') k = c - st; else if (e.key === 'ArrowRight') k = c + st; else if (e.key === 'Home') k = 0; else if (e.key === 'End') k = n; else if (e.key === 'Escape') { clearHover(); return; } else return;
      e.preventDefault(); kb = clamp(k, 0, n); hIdx = -1; readOut(kb); schedule();
    });
    return { set: set, size: function () { size(); schedule(); }, schedule: schedule, theme: function () { colors = null; schedule(); },
      start: function () { if (started) return; started = true; revT0 = performance.now(); if (reduce()) revDone = true; schedule(); }, stop: function () { cancelAnimationFrame(rid); clearTimeout(tid); } };
  }

  /* ============================== minitrazo de lo vendido ============================== */
  function paintSpark(sp, p) {
    var cv = sp.cv, r = cv.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2), W = r.width, H = r.height, cw = Math.round(W * dpr), ch = Math.round(H * dpr); if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    var ctx = cv.getContext('2d'), cs = getComputedStyle(cv), g = function (n) { return cs.getPropertyValue(n).trim(); }, v = sp.v, n = v.length, lo = Math.min(sp.base, Math.min.apply(null, v)), hi = Math.max(sp.base, Math.max.apply(null, v)), pad = (hi - lo || 1) * 0.14, i;
    lo -= pad; hi += pad; var PX = 4, PR = 8, X = function (k) { return PX + k / (n - 1) * (W - PX - PR); }, Y = function (x) { return H - 4 - (x - lo) / (hi - lo) * (H - 8); };
    var up = v[n - 1] >= sp.base, col = up ? g('--gain') : g('--loss');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = g('--text-3'); ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(PX, Math.round(Y(sp.base)) + 0.5); ctx.lineTo(W - PR, Math.round(Y(sp.base)) + 0.5); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, PX + (W - PX) * p + 1, H); ctx.clip();
    ctx.globalAlpha = 0.16; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(X(0), Y(sp.base)); for (i = 0; i < n; i++) ctx.lineTo(X(i), Y(v[i])); ctx.lineTo(X(n - 1), Y(sp.base)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = g('--accent-ink'); ctx.lineWidth = 2; ctx.beginPath(); for (i = 0; i < n; i++) { if (i) ctx.lineTo(X(i), Y(v[i])); else ctx.moveTo(X(i), Y(v[i])); } ctx.stroke(); ctx.restore();
    if (p >= 0.98) { ctx.fillStyle = col; ctx.strokeStyle = g('--s1'); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(n - 1), Y(v[n - 1]), 3.6, 0, 6.2832); ctx.stroke(); ctx.fill(); }
  }

  /* ============================== render ============================== */
  function render(mount, portfolio, T) {
    var off = [], dead = false, getDead = function () { return dead; };
    var pf = portfolio === 'todos' || (portfolio && portfolio.cons) ? 'todos' : (typeof portfolio === 'string' ? T.get(portfolio) : portfolio);
    function destroy() { if (dead) return; dead = true; off.forEach(function (f) { try { f(); } catch (e) { } }); off = []; if (mount) mount.innerHTML = ''; }
    var api = { destroy: destroy }, inp = null;
    try { inp = pf ? M.inputs(pf) : null; } catch (e) { inp = null; }
    if (!inp || !inp.assets || !inp.assets.length) {
      mount.innerHTML = '<div class="pwi"><div class="pwi-empty"><strong>Este portafolio aún no tiene historial</strong><p>Cuando agregues posiciones, aquí podrás comparar tu resultado con otras alternativas, ver qué habría pasado con lo que vendiste y probar escenarios de estrés.</p></div></div>';
      return api;
    }
    var id = 'pwi' + (++uid), dates = T.dates, fxs = T.fx.series, started = false;
    var altId = M.alternatives[0].id, Pi = 1, cfCache = {};
    function cfOf(a, p) { var k = a + '|' + p; return cfCache[k] || (cfCache[k] = M.counterfactual(inp, a, PERIODS[p][1])); }

    /* ---------- 1 · ¿Y si hubiera invertido en…? ---------- */
    var DEFS = {
      real: 'Lo que vale hoy tu portafolio, con el efectivo incluido.',
      alt: 'Lo que valdrían hoy tus aportaciones y retiros, cada uno en su fecha, si se hubieran invertido en la alternativa. Arranca con lo mismo que valía tu portafolio al inicio del periodo.',
      diff: 'Tu valor menos el valor en la alternativa. Si es positivo, vas por delante; si es negativo, la alternativa habría terminado arriba.',
      twr: 'Rendimiento ponderado en el tiempo: quita el efecto de cuándo aportaste o retiraste, para comparar la calidad de las decisiones y no el tamaño de los depósitos.',
      twrAlt: 'Rendimiento de la alternativa en el mismo periodo, con el mismo método.'
    };
    var KP = [['real', 'Tu valor hoy'], ['alt', 'Valor en la alternativa'], ['diff', 'Diferencia'], ['twr', 'Tu rendimiento (TWR)'], ['twrAlt', 'Rendimiento de la alternativa']];
    function kpHTML(k, n) {
      return '<div class="pwi-k" data-k="' + k[0] + '"><div class="pwi-kh"><h3 class="pwi-kn">' + k[1] + '</h3><button type="button" class="pwi-i" aria-expanded="false" aria-controls="' + id + '-kd' + n + '" aria-label="Qué significa: ' + esc(k[1]) + '" title="' + esc(DEFS[k[0]]) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg></button></div>' +
        '<p class="pwi-kv num" data-kv></p><p class="pwi-ks" data-ks></p><div class="pwi-def" id="' + id + '-kd' + n + '"><p>' + esc(DEFS[k[0]]) + '</p></div></div>';
    }
    var chipsHTML = M.alternatives.map(function (a) { return '<button type="button" class="pwi-chipb" data-a="' + a.id + '" aria-pressed="' + (a.id === altId) + '" title="' + esc(a.name) + '">' + esc(ALT_SHORT[a.id] || a.name) + '</button>'; }).join('');
    var s1HTML = '<section class="pwi-s panel" aria-labelledby="' + id + 'h1"><div class="pwi-top"><div class="pwi-tt"><h2 id="' + id + 'h1">¿Y si hubiera invertido en…?</h2><span class="muted">Tus aportaciones y retiros, en sus fechas, pero en otra inversión</span></div>' +
      '<div class="seg pwi-sp" role="group" aria-label="Periodo" style="--n:2;--i:' + Pi + '"><span class="seg-pill" aria-hidden="true"></span>' + PERIODS.map(function (p, i) { return '<button type="button" data-p="' + i + '" aria-pressed="' + (i === Pi) + '" aria-label="' + p[2] + '">' + p[0] + '</button>'; }).join('') + '</div></div>' +
      '<div class="pwi-chips" role="group" aria-label="Alternativa de inversión">' + chipsHTML + '</div>' +
      '<p class="pwi-res" data-res aria-live="polite"></p>' +
      '<ul class="pwi-key" aria-hidden="true"><li><i class="pwi-l1"></i>Tu portafolio</li><li><i class="pwi-l2"></i><span data-altn></span></li><li><i class="pwi-g1"></i>Vas por delante</li><li><i class="pwi-g2"></i>Vas por detrás</li></ul>' +
      '<dl class="pwi-ro" data-ro><div><dt>Fecha</dt><dd data-r="a"></dd></div><div><dt>Tu valor</dt><dd data-r="b"></dd></div><div><dt data-altn2>Alternativa</dt><dd data-r="c"></dd></div><div><dt>Diferencia</dt><dd data-r="d"></dd></div></dl>' +
      '<div class="pwi-stage" tabindex="0" role="group" aria-labelledby="' + id + 'h1" aria-describedby="' + id + 'k1" data-st><canvas aria-hidden="true"></canvas></div><p class="pwi-sr" id="' + id + 'k1" aria-live="polite" data-sr>Con las flechas izquierda y derecha lees cada día.</p>' +
      '<div class="pwi-led" data-led>' + KP.map(kpHTML).join('') + '</div>' +
      '<p class="pwi-meth"><strong>Usamos tus aportaciones en sus fechas, no un monto inicial.</strong> <span data-meth></span></p></section>';

    /* ---------- 2 · Lo que vendiste ---------- */
    var closed = []; try { closed = M.closed(inp) || []; } catch (e) { closed = []; }
    closed = closed.filter(function (c) { return c && c.path && c.idx >= 0 && c.idx < LAST; });
    var sparks = [];
    var s2HTML = '';
    if (closed.length) {
      s2HTML = '<section class="pwi-s panel" aria-labelledby="' + id + 'h2"><div class="pwi-tt"><h2 id="' + id + 'h2">Lo que vendiste</h2><span class="muted">Cuánto valdría hoy lo que vendiste en el periodo si lo hubieras conservado</span></div><ul class="pwi-cl" role="list">' +
        closed.map(function (c, k) {
          var up = c.diff >= 0;
          return '<li class="pwi-ci" data-c="' + k + '" style="--i:' + k + '"><div class="pwi-cit"><span class="pwi-cm">' + mark(c.ticker) + '</span><p class="pwi-cs">Si no hubieras vendido <strong>' + esc(c.ticker) + '</strong> el ' + dTxt(c.date) + ', hoy valdría <strong class="num" data-cv>' + fA(c.valueToday) + '</strong> (<span class="num ' + (up ? 'gain' : 'loss') + '" data-cd>' + fA(c.diff) + ' ' + (up ? 'más' : 'menos') + '</span>).<span class="pwi-cn">Lo vendiste por ' + fA(c.proceeds) + (up ? '; conservarla habría sumado' : '; vender te ahorró') + ' ' + fA(c.diff) + '.</span></p></div>' +
            '<div class="pwi-sk"><canvas aria-hidden="true"></canvas><div class="pwi-skl" aria-hidden="true"><span>' + dTxt(c.date, true) + ' · venta</span><span>hoy</span></div></div></li>';
        }).join('') + '</ul></section>';
    }

    /* ---------- 3 · ¿Y si mañana…? ---------- */
    var SC = M.scenarios, CUS = { spx: -15, ndx: -20, ipc: -10, btc: -40, fx: 8 };
    var SL = [['spx', 'S&P 500', 60, 'S&P 500'], ['ndx', 'Nasdaq 100', 60, 'Nasdaq 100'], ['ipc', 'S&P/BMV IPC', 60, 'IPC'], ['btc', 'Bitcoin', 60, 'Bitcoin'], ['fx', (FW().n === 'peso' ? 'Peso' : 'Dólar') + ' frente ' + FW().vs + ' (' + FW().pair + ')', 40, FW().pair]];
    function customSh() { var s = {}; SL.forEach(function (x) { s[x[0]] = CUS[x[0]] / 100; }); return s; }
    function runCustom() { return M.stress(inp, { id: 'custom', name: 'Tu escenario', sh: customSh() }); }
    var RES = {}; SC.forEach(function (s) { RES[s.id] = M.stress(inp, s.id); });
    var cusRes = runCustom(), sel = 'covid';
    function maxPct() { var m = 0.05; SC.forEach(function (s) { m = Math.max(m, Math.abs(RES[s.id].pct)); }); return m; }
    var PMAX = maxPct();
    function cardHTML(r, k, custom) {
      var kind = custom ? 'Tuyo' : r.kind, when = custom ? 'Mueve los deslizadores' : (r.kind === 'Histórico' ? r.when : 'Lo que pasaría si…');
      return '<button type="button" class="pwi-sc' + (custom ? ' pwi-cus' : '') + '" data-id="' + (custom ? 'custom' : r.id) + '" aria-pressed="' + ((custom ? 'custom' : r.id) === sel) + '" style="--i:' + k + '"><span class="pwi-sck ' + (kind === 'Histórico' ? 'h' : kind === 'Tuyo' ? 't' : 'y') + '">' + kind + '</span><span class="pwi-scn">' + esc(custom ? 'Tu escenario' : r.name) + '</span><span class="pwi-scw">' + esc(when) + '</span>' +
        '<span class="pwi-scv"><span class="num ' + sgnCls(r.impact) + '" data-sv>' + fS(r.impact) + '</span><span class="num pwi-scp ' + sgnClsP(r.pct) + '" data-sp>' + fP(r.pct * 100, 1) + '</span></span><span class="pwi-scb" aria-hidden="true"><i class="' + (r.pct < 0 ? 'neg' : 'pos') + '" style="--w:' + clamp(Math.abs(r.pct) / PMAX, 0, 1).toFixed(3) + '"></i></span></button>';
    }
    var assetsSorted = inp.assets.slice().sort(function (a, b) { return b.mv - a.mv; });
    function rowsHTML() {
      return assetsSorted.map(function (a, k) {
        return '<li class="pwi-ar" data-t="' + esc(a.ticker) + '" style="--i:' + k + '"><div class="pwi-an"><span class="pwi-cm">' + mark(a.ticker) + '</span><span class="pwi-at"><strong>' + esc(a.ticker) + '</strong><span data-sub></span></span></div><span class="pwi-ab" aria-hidden="true"><i class="pwi-bn"></i><i class="pwi-bp"></i></span><span class="pwi-av num" data-av></span></li>';
      }).join('');
    }
    var DEF_MKT = 'Lo que pasa con tus posiciones medido en su propia moneda: cuánto caen o suben las acciones, los fondos o el Bitcoin, sin contar el tipo de cambio.';
    var DEF_FX = 'Lo que suman o restan tus posiciones en ' + FW().pl + ' cuando cambia el ' + FW().pair + '. Si el ' + FW().n + ' sube, lo que tienes en ' + FW().pl + ' vale más ' + FW().bpl + '.';
    function splitRow(key, label, def, n) {
      return '<div class="pwi-sp2" data-sp2="' + key + '"><div class="pwi-spl"><span class="pwi-spn">' + label + '</span>' + (def ? '<button type="button" class="pwi-i" aria-expanded="false" aria-controls="' + id + '-sd' + n + '" aria-label="Qué significa: ' + esc(label) + '" title="' + esc(def) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg></button>' : '') + '</div>' +
        '<span class="pwi-spb" aria-hidden="true"><i class="pwi-bn"></i><i class="pwi-bp"></i></span><span class="pwi-spv"><b class="num" data-v></b><span class="num" data-p></span></span>' + (def ? '<div class="pwi-def" id="' + id + '-sd' + n + '"><p>' + esc(def) + '</p></div>' : '') + '</div>';
    }
    function sliderHTML(x, k) {
      return '<div class="pwi-sl"><label for="' + id + '-s' + k + '">' + x[1] + '</label><output for="' + id + '-s' + k + '" class="num" data-o="' + x[0] + '">' + fP(CUS[x[0]], 0) + '</output><input type="range" id="' + id + '-s' + k + '" data-s="' + x[0] + '" min="-' + x[2] + '" max="' + x[2] + '" step="1" value="' + CUS[x[0]] + '"></div>';
    }
    var s3HTML = '<section class="pwi-s panel" aria-labelledby="' + id + 'h3"><div class="pwi-tt"><h2 id="' + id + 'h3">¿Y si mañana…?</h2><span class="muted">Qué le pasaría hoy a tu portafolio en cada escenario</span></div>' +
      '<div class="pwi-scs" role="group" aria-label="Escenarios">' + SC.map(function (s, k) { return cardHTML(RES[s.id], k, false); }).join('') + cardHTML(cusRes, SC.length, true) + '</div>' +
      '<div class="pwi-det" data-det><div class="pwi-dh"><h3 data-dn></h3><span class="muted" data-dw></span></div>' +
      '<p class="pwi-big"><span class="num" data-di></span><span class="num pwi-bgp" data-dp></span></p>' +
      '<div class="pwi-splitw"><h4>Qué lo explica</h4>' + splitRow('mkt', 'Efecto del mercado', DEF_MKT, 0) + splitRow('fx', 'Efecto del tipo de cambio', DEF_FX, 1) + splitRow('tot', 'Total', '', 2) + '</div>' +
      '<p class="pwi-ins" data-ins aria-live="polite"></p>' +
      '<div class="pwi-cust" data-cust><div class="pwi-custi"><div class="pwi-slg" role="group" aria-label="Tu escenario">' + SL.map(sliderHTML).join('') + '</div><button type="button" class="pwi-rs" data-reset>Restablecer</button></div></div>' +
      '<h4 class="pwi-h4">Impacto por posición</h4><ul class="pwi-rows" role="list" data-rows>' + rowsHTML() + '</ul><p class="pwi-note" data-note></p></div></section>';

    mount.innerHTML = '<div class="pwi" id="' + id + '"><p class="pwi-tag">Base ' + FW().b + ' · valores de hoy y de hace un año</p>' + s1HTML + s2HTML + s3HTML + '<p class="pwi-foot">Comparación informativa · no es asesoría de inversión</p></div>';
    var $ = function (s, r) { return (r || mount).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || mount).querySelectorAll(s)); };

    /* ---------- cifras que ruedan ---------- */
    var rollId = 0;
    function roll(el, from, to, fmt, dur, delay) {
      var my = ++rollId; el._r = my;
      if (reduce() || from === to || dur <= 0 || from == null) { el.textContent = fmt(to); return; }
      var t0 = performance.now() + (delay || 0);
      every(function () { if (dead || el._r !== my) return false; var k = (performance.now() - t0) / dur; if (k < 0) return true; var e = 1 - Math.pow(1 - clamp(k, 0, 1), 3); el.textContent = fmt(from + (to - from) * e); if (k >= 1) { el.textContent = fmt(to); return false; } });
    }
    function paint(el, v, pct) { el.classList.remove('gain', 'loss', 'flat'); el.classList.add(pct ? sgnClsP(v) : sgnCls(v)); }

    /* ---------- divulgación de definiciones ---------- */
    mount.addEventListener('click', function (e) {
      var b = e.target.closest('.pwi-i'); if (!b) return; var dx = doc.getElementById(b.getAttribute('aria-controls')); if (!dx) return;
      var open = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', String(open)); dx.toggleAttribute('data-open', open);
    });

    /* ---------- sección 1: gráfica, KPI y frase ---------- */
    var roEl = $('[data-ro]'), srEl = $('[data-sr]'), resEl = $('[data-res]'), prev = null, curCf = null;
    function setRO(a, b, c, d, dcls, sr) {
      [a, b, c, d].forEach(function (v, i) { var e = roEl.querySelector('[data-r="' + 'abcd'[i] + '"]'); e.textContent = v; e.className = i === 3 ? dcls : ''; });
      srEl.textContent = sr || '';
    }
    var chart = LineChart($('[data-st]'), getDead, function (i, d) {
      var n = d.dates.length - 1, k = i < 0 ? n : i, df = d.actual[k] - d.alternative[k];
      setRO(dTxt(d.dates[k]), fM(d.actual[k]), fM(d.alternative[k]), fS(df) || SYM() + '0', sgnCls(df), i < 0 ? '' : dTxt(d.dates[k]) + ': tu valor ' + fM(d.actual[k]) + ', alternativa ' + fM(d.alternative[k]) + ', diferencia ' + fS(df));
    });
    function kpVals(c) {
      var up = c.diff >= 0;
      return { real: { v: c.actualEnd, f: fM, cls: '', sub: 'Al ' + dTxt(c.dates[c.dates.length - 1]) },
        alt: { v: c.end, f: fM, cls: '', sub: esc(ALT_SHORT[c.alt] || c.name) },
        diff: { v: c.diff, f: function (x) { return fS(x) || SYM() + '0'; }, cls: sgnCls(c.diff), sub: Math.abs(c.diff) < 0.5 ? 'Igual que la alternativa' : up ? 'Vas por delante' : 'La alternativa va por delante' },
        twr: { v: c.twrActual * 100, f: function (x) { return fP(x, 2); }, cls: sgnClsP(c.twrActual), sub: 'Desde ' + dTxt(c.start, true) },
        twrAlt: { v: c.twrAlt * 100, f: function (x) { return fP(x, 2); }, cls: sgnClsP(c.twrAlt), sub: Math.abs((c.twrActual - c.twrAlt) * 100) < 0.005 ? 'Igual que tú' : fN(Math.abs(c.twrAlt - c.twrActual) * 100, 2) + ' pts ' + (c.twrAlt > c.twrActual ? 'más' : 'menos') + ' que tú' } };
    }
    function applyAlt(animate) {
      var c = cfOf(altId, Pi), vals = kpVals(c), nm = ALT_IN[altId] || c.name, dd = Math.abs(c.diff), alt_more = c.end > c.actualEnd;
      chart.set({ actual: c.actual, alternative: c.alternative, dates: c.dates }, animate);
      Object.keys(vals).forEach(function (k) {
        var cell = $('[data-k="' + k + '"]'), kv = $('[data-kv]', cell), o = vals[k], p = prev && prev[k] ? prev[k].v : null;
        $('[data-ks]', cell).innerHTML = o.sub; kv.className = 'pwi-kv num ' + o.cls; roll(kv, animate ? p : null, o.v, o.f, animate ? 320 : 0, 0);
      });
      /* oración de resultado: cifras que ruedan, palabras que cambian */
      var had = !!resEl.firstChild;
      if (!had) resEl.innerHTML = 'Con tus mismas aportaciones y retiros, en <strong data-rn></strong> hoy tendrías <strong class="num" data-rv></strong><span data-rt></span>';
      $('[data-rn]', resEl).textContent = nm;
      var rt = $('[data-rt]', resEl);
      if (dd < 0.5) rt.innerHTML = ': lo mismo que hoy.';
      else rt.innerHTML = ': <strong class="num ' + (alt_more ? 'loss' : 'gain') + '" data-rd></strong> ' + (alt_more ? 'más' : 'menos') + ' que hoy.';
      roll($('[data-rv]', resEl), animate && prev ? prev.real2 : null, c.end, fA, animate ? 320 : 0, 0);
      var rd = $('[data-rd]', resEl); if (rd) roll(rd, animate && prev ? Math.abs(prev.diff.v) : null, dd, fA, animate ? 320 : 0, 0);
      $('[data-altn]').textContent = c.name; $('[data-altn2]').textContent = ALT_SHORT[altId] || c.name;
      $('[data-meth]').innerHTML = 'Las dos líneas arrancan igual: lo que valía tu portafolio el ' + dTxt(c.start) + '. Aportaciones netas en el periodo: ' + fM(c.flows) + '. ' + esc(ALT_NOTE[altId] || ALT_DEFAULT_NOTE);
      prev = vals; prev.real2 = c.end; curCf = c;
      $$('.pwi-chipb').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.a === altId)); });
    }
    $('.pwi-chips').addEventListener('click', function (e) { var b = e.target.closest('.pwi-chipb'); if (!b || b.dataset.a === altId) return; altId = b.dataset.a; applyAlt(true); });
    var segP = $('.pwi-sp');
    segP.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-p]'); if (!b || +b.dataset.p === Pi) return; Pi = +b.dataset.p;
      $$('button', segP).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); segP.style.setProperty('--i', Pi); applyAlt(true);
    });

    /* ---------- sección 2: minitrazos ---------- */
    closed.forEach(function (c, k) {
      var li = $('[data-c="' + k + '"]'), cv = $('canvas', li), q = c.qty * c.path[LAST], usd = q ? Math.abs(c.valueToday / q - 1) > 1e-6 : false, v = [];
      for (var t = c.idx; t <= LAST; t++) v.push(c.qty * c.path[t] * (usd ? fxs[t] : 1));
      sparks.push({ cv: cv, v: v, base: c.proceeds, p: 0, li: li });
    });
    function paintSparks() { sparks.forEach(function (s) { paintSpark(s, s.p); }); }

    /* ---------- sección 3: escenarios ---------- */
    var detEl = $('[data-det]'), custEl = $('[data-cust]'), rowEls = {}, noteEl = $('[data-note]'), insEl = $('[data-ins]'), shown = null;
    $$('.pwi-ar', detEl).forEach(function (n) { rowEls[n.dataset.t] = n; });
    function insight(r) {
      var loc = r.impactLocal, fx = r.fxEffect, usd = inp.assets.some(function (a) { return a.isU; });
      if (!usd) return 'Todo lo que tienes está en ' + FW().b + ': el tipo de cambio no mueve tu resultado.';
      if (Math.abs(fx) < 1) return 'En este escenario el ' + FW().n + ' casi no se mueve, así que el resultado viene del mercado.';
      if (Math.abs(loc) < 1) return fx > 0 ? 'El mercado casi no cambia; el ' + FW().n + ' más caro suma ' + fS(fx) + ' a tus posiciones en ' + FW().pl + '.' : 'El mercado casi no cambia; el ' + FW().n + ' más barato resta ' + fA(fx) + ' a tus posiciones en ' + FW().pl + '.';
      if (loc < 0 && fx > 0) { var c = fx / -loc; return c >= 1 ? 'El ' + FW().n + ' compensó toda la caída: sin el tipo de cambio habrías perdido ' + fA(loc) + '; con él, ' + (r.impact >= 0 ? 'ganas ' + fA(r.impact) : 'pierdes ' + fA(r.impact)) + '.' : 'El ' + FW().n + ' amortiguó ' + fPu(c * 100, 0) + ' de la caída: sin el tipo de cambio habrías perdido ' + fA(loc) + '; con él, ' + fA(r.impact) + '.'; }
      if (loc > 0 && fx < 0) { var g = -fx / loc; return g >= 1 ? FW().bArt + ' más fuerte se come toda la ganancia de tus posiciones en ' + FW().pl + ': de ' + fS(loc) + ' en el mercado a ' + (fS(r.impact) || SYM() + '0') + ' en ' + FW().b + '.' : FW().bArt + ' más fuerte recorta ' + fPu(g * 100, 0) + ' de la ganancia: el mercado suma ' + fA(loc) + ' y en ' + FW().b + ' quedan ' + fA(r.impact) + '.'; }
      if (loc < 0 && fx < 0) return 'Además de la caída del mercado, el tipo de cambio resta ' + fA(fx) + ': pierdes por los dos lados.';
      return 'Además de lo que sube el mercado, el tipo de cambio suma ' + fA(fx) + '.';
    }
    var detPrev = null;
    function setSplit(key, v, pct, scale, animate, from) {
      var row = $('[data-sp2="' + key + '"]', detEl), w = clamp(Math.abs(v) / scale, 0, 1).toFixed(3), vv = $('[data-v]', row), pp = $('[data-p]', row);
      $('.pwi-bp', row).style.setProperty('--w', v > 0 ? w : 0); $('.pwi-bn', row).style.setProperty('--w', v < 0 ? w : 0);
      vv.className = 'num ' + sgnCls(v); pp.className = 'num ' + sgnClsP(pct); pp.textContent = fP(pct * 100, 1);
      if (animate) roll(vv, from, v, function (x) { return fS(x) || SYM() + '0'; }, 300, 0); else { vv.textContent = fS(v) || SYM() + '0'; vv._r = ++rollId; }
    }
    function showDetail(r, animate, live) {
      var old = detPrev, sameId = old && old.id === r.id;
      detEl.classList.toggle('is-live', !!live);
      $('[data-dn]').textContent = r.name; $('[data-dw]').textContent = r.id === 'custom' ? 'Hipotético · tú eliges los movimientos' : r.kind === 'Histórico' ? 'Histórico · ' + r.when : 'Hipotético';
      var di = $('[data-di]'), dp = $('[data-dp]'); di.className = 'num ' + sgnCls(r.impact); dp.className = 'num pwi-bgp ' + sgnClsP(r.pct); dp.textContent = fP(r.pct * 100, 1) + ' de tu portafolio';
      if (animate && old) roll(di, old.impact, r.impact, function (x) { return fS(x) || SYM() + '0'; }, 320, 0); else { di.textContent = fS(r.impact) || SYM() + '0'; di._r = ++rollId; }
      var scale = Math.max(Math.abs(r.impact), Math.abs(r.impactLocal), Math.abs(r.fxEffect), 1), v = inp.value || 1;
      setSplit('mkt', r.impactLocal, r.impactLocal / v, scale, animate && !!old, old ? old.impactLocal : null);
      setSplit('fx', r.fxEffect, r.fxEffect / v, scale, animate && !!old, old ? old.fxEffect : null);
      setSplit('tot', r.impact, r.pct, scale, animate && !!old, old ? old.impact : null);
      insEl.textContent = insight(r);
      var mx = 1; r.rows.forEach(function (x) { mx = Math.max(mx, Math.abs(x.impact)); });
      r.rows.forEach(function (x) {
        var n = rowEls[x.ticker]; if (!n) return; var w = clamp(Math.abs(x.impact) / mx, 0, 1).toFixed(3), av = $('[data-av]', n), oldRow = old ? old.rows.filter(function (y) { return y.ticker === x.ticker; })[0] : null;
        $('.pwi-bp', n).style.setProperty('--w', x.impact > 0 ? w : 0); $('.pwi-bn', n).style.setProperty('--w', x.impact < 0 ? w : 0);
        $('[data-sub]', n).textContent = 'Mercado ' + fP(x.local * 100, 1) + (x.isU && Math.abs(x.mxn - x.local) > 0.0005 ? ' · en ' + FW().b + ' ' + fP(x.mxn * 100, 1) : '');
        av.className = 'pwi-av num ' + sgnCls(x.impact);
        var fm = function (z) { return fS(z) || SYM() + '0'; };
        if (animate && oldRow) roll(av, oldRow.impact, x.impact, fm, 300, 0); else { av.textContent = fm(x.impact); av._r = ++rollId; }
        n.setAttribute('aria-label', x.ticker + ': ' + fS(x.impact) + ' en ' + FW().b + ', ' + fP(x.mxn * 100, 1) + '. Mercado ' + fP(x.local * 100, 1) + '.');
      });
      var nt = r.id === 'custom' ? 'Cada posición responde según su sensibilidad estimada (beta) a estos movimientos; no incluye lo propio de cada empresa. Lo que no mueves queda en cero.' : r.note;
      if (noteEl.textContent !== nt) { noteEl.textContent = nt; if (animate && !reduce() && noteEl.animate && !sameId) noteEl.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: EXPO }); }
      detPrev = r;
    }
    function updateCard(r, id2) {
      var c = $('.pwi-sc[data-id="' + id2 + '"]'), sv = $('[data-sv]', c), sp = $('[data-sp]', c), bar = $('.pwi-scb i', c);
      sv.className = 'num ' + sgnCls(r.impact); sv.textContent = fS(r.impact) || SYM() + '0'; sp.className = 'num pwi-scp ' + sgnClsP(r.pct); sp.textContent = fP(r.pct * 100, 1);
      bar.className = r.pct < 0 ? 'neg' : 'pos'; bar.style.setProperty('--w', clamp(Math.abs(r.pct) / PMAX, 0, 1).toFixed(3));
    }
    function setSel(id2, animate) {
      sel = id2; $$('.pwi-sc').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.id === sel)); });
      var isC = sel === 'custom'; custEl.toggleAttribute('data-open', isC); var ci = $('.pwi-custi', custEl); if (ci) ci.inert = !isC;
      showDetail(isC ? cusRes : RES[sel], animate, false);
    }
    $('.pwi-scs').addEventListener('click', function (e) { var b = e.target.closest('.pwi-sc'); if (!b || b.dataset.id === sel) return; setSel(b.dataset.id, true); });
    var liveRaf = 0, liveFlag = false;
    function live() { liveFlag = false; cusRes = runCustom(); updateCard(cusRes, 'custom'); if (sel === 'custom') showDetail(cusRes, false, true); }
    $('.pwi-slg').addEventListener('input', function (e) {
      var inEl = e.target.closest('input[data-s]'); if (!inEl) return; CUS[inEl.dataset.s] = +inEl.value; $('[data-o="' + inEl.dataset.s + '"]').textContent = fP(+inEl.value, 0);
      if (!liveFlag) { liveFlag = true; liveRaf = requestAnimationFrame(live); }
    });
    $('[data-reset]').addEventListener('click', function () {
      var d0 = { spx: -15, ndx: -20, ipc: -10, btc: -40, fx: 8 }; SL.forEach(function (x) { CUS[x[0]] = d0[x[0]]; var el = $('input[data-s="' + x[0] + '"]'); el.value = d0[x[0]]; $('[data-o="' + x[0] + '"]').textContent = fP(d0[x[0]], 0); });
      cusRes = runCustom(); updateCard(cusRes, 'custom'); if (sel === 'custom') showDetail(cusRes, true, false);
    });
    off.push(function () { cancelAnimationFrame(liveRaf); });
    $('.pwi-custi', custEl).inert = true;

    /* ---------- primera vista ---------- */
    function visible() { return mount.offsetWidth > 0 && mount.offsetHeight > 0; }
    function start() {
      if (started || dead) return; started = true;
      if (!reduce()) {
        $$('.pwi > .pwi-s').forEach(function (s, i) { if (s.animate) s.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: i * 40, easing: EXPO, fill: 'backwards' }); });
        $$('.pwi-k').forEach(function (c, i) { var kv = $('[data-kv]', c), o = prev && prev[c.dataset.k]; if (o) roll(kv, 0, o.v, o.f, 600, 140 + i * 35); });
        $$('.pwi-sc').forEach(function (c, i) { if (c.animate) c.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 120 + i * 30, easing: EXPO, fill: 'backwards' }); });
        $$('.pwi-ci').forEach(function (c, i) { if (c.animate) c.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 100 + i * 40, easing: EXPO, fill: 'backwards' }); });
        $$('.pwi-ar', detEl).forEach(function (n, i) { if (n.animate) n.animate([{ opacity: 0, transform: 'translateX(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 200 + i * 30, easing: EXPO, fill: 'backwards' }); });
      }
      chart.start();
      sparks.forEach(function (s, i) {
        if (reduce()) { s.p = 1; paintSpark(s, 1); return; }
        var t0 = performance.now() + 200 + i * 80;
        every(function () { if (dead) return false; var k = (performance.now() - t0) / 520; if (k < 0) return true; s.p = easeOut(k); paintSpark(s, s.p); if (k >= 1) { s.p = 1; return false; } });
      });
    }
    applyAlt(false); setSel('covid', false); detEl.classList.remove('is-live');
    function relayout() { chart.size(); paintSparks(); }
    if (window.ResizeObserver) { var ro = new ResizeObserver(function () { relayout(); if (!started && visible()) start(); }); ro.observe(mount); $$('.pwi-stage, .pwi-sk').forEach(function (s) { ro.observe(s); }); off.push(function () { ro.disconnect(); }); }
    var resz = function () { relayout(); }; window.addEventListener('resize', resz); off.push(function () { window.removeEventListener('resize', resz); });
    var mob = new MutationObserver(function () { chart.theme(); paintSparks(); }); mob.observe(root, { attributes: true, attributeFilter: ['data-theme'] }); off.push(function () { mob.disconnect(); });
    var onRm = function () { chart.schedule(); }; if (rmq.addEventListener) { rmq.addEventListener('change', onRm); off.push(function () { rmq.removeEventListener('change', onRm); }); }
    off.push(function () { chart.stop(); });
    chart.size(); if (visible()) start(); else setTimeout(function () { relayout(); if (!started && visible()) start(); }, 0);
    api.state = function () { return { alt: altId, period: PERIODS[Pi][0], scenario: sel }; };
    return api;
  }

  window.CampoPfWhatif = { render: render };
})();
