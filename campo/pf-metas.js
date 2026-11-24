/* Campo · Portafolio individual · pestaña "Metas". Expone window.CampoPfMetas.render(mount, portfolio|'todos', CampoTracker) -> { destroy }.
   No calcula finanzas: cada meta llama a CampoModel.goal(inp, { target, years, monthly, real, start }) con start = parte asignada × valor del portafolio.
   El anillo y el deslizador "¿Y si aporto…?" usan pAt(c) (instantáneo, sin volver a simular). Metas en localStorage `campo.metas.<pfid>`. En producción, con los datos reales de campo/datos.js. */
(function () {
  'use strict';
  var D = window.PORTIFY_DEMO, CM = window.CampoModel;
  if (!D || !CM) return;
  var doc = typeof document !== 'undefined' ? document : null, root = doc && doc.documentElement;
  var rmq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduce() { return !!rmq.matches; }
  var HOVER = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)').matches : false;
  var EXPO = 'cubic-bezier(0.23, 1, 0.32, 1)';
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function SYM() { var d = window.PORTIFY_DEMO; return d && d.fmt && d.fmt.sym ? d.fmt.sym() : '$'; }
  function fM(v) { return D.fmt && D.fmt.mxn ? D.fmt.mxn(Math.round(v)) : SYM() + Math.round(v).toLocaleString('es-MX'); }
  var nf1 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });
  function compact(v) { var a = Math.abs(v); if (a >= 1e6) return SYM() + (Math.round(a / 1e4) / 100).toString() + ' M'; if (a >= 1e3) return SYM() + Math.round(a / 1e3) + ' mil'; return SYM() + Math.round(a); }
  function niceStep(span, n) { var raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag; return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag; }
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var Q = 0.8, MAXG = 6, uid = 0;

  /* ============================== estado y almacenamiento ============================== */
  function pfKey(pf) { return pf === 'todos' ? 'todos' : (pf && pf.id) || 'pf'; }
  function seedFor(id) {
    var s = {
      /* calibradas con el motor (22-nov): probabilidades de 40–65 %, ni triviales ni desalentadoras */
      principal: [['Enganche de casa', 900000, 5, 8000, 40], ['Retiro', 7000000, 25, 9000, 60]],
      retiro: [['Retiro a largo plazo', 2500000, 20, 5000, 100]],
      cripto: [['Ganancia de largo plazo', 150000, 6, 1500, 100]],
      todos: [['Patrimonio a 10 años', 3000000, 10, 10000, 100]]
    }[id] || [['Mi primera meta', 500000, 10, 2000, 100]];
    return s.map(function (g, i) { return { id: 'g' + (i + 1), name: g[0], target: g[1], years: g[2], monthly: g[3], share: g[4] }; });
  }
  function clean(g, i) {
    var n = String(g && g.name != null ? g.name : '').trim().slice(0, 40), t = +g.target, y = Math.round(+g.years), m = +g.monthly, s = Math.round(+g.share);
    if (!n || !isFinite(t) || !isFinite(y) || !isFinite(m) || !isFinite(s)) return null;
    return { id: String(g.id || 'g' + (i + 1)), name: n, target: clamp(t, 1000, 1e9), years: clamp(y, 1, 40), monthly: clamp(m, 0, 1e6), share: clamp(s, 1, 100) };
  }
  function load(id) {
    try {
      var raw = window.localStorage && localStorage.getItem('campo.metas.' + id);
      if (raw) { var o = JSON.parse(raw), gs = (o.goals || []).map(clean).filter(Boolean); if (gs.length || (o.goals && !o.goals.length)) return { goals: gs, real: o.real !== false }; }
    } catch (e) { }
    return { goals: seedFor(id), real: true };
  }
  function save(id, st) { try { if (window.localStorage) localStorage.setItem('campo.metas.' + id, JSON.stringify({ goals: st.goals, real: st.real })); } catch (e) { } }

  /* motor: la distribución depende de (meta, plazo, parte, pesos de hoy) y `when` del aporte; pAt(c) sirve para cualquier aporte */
  var engCache = {}, engN = 0;
  function engine(inp, g, real) {
    var start = g.share / 100 * inp.value, key = inp.id + '|' + g.target + '|' + g.years + '|' + g.monthly + '|' + Math.round(start) + '|' + (real ? 1 : 0);
    if (engCache[key]) return engCache[key];
    if (++engN > 40) { engCache = {}; engN = 0; }
    return (engCache[key] = CM.goal(inp, { target: g.target, years: g.years, monthly: g.monthly, real: real, start: start }));
  }

  /* ============================== fechas ============================== */
  function baseDate(T) { var d = T && T.dates && T.dates.length ? T.dates[T.dates.length - 1] : '2026-11-18'; return { y: +d.slice(0, 4), m: +d.slice(5, 7) - 1 }; }

  /* ============================== render ============================== */
  function render(mount, portfolio, T) {
    var off = [], dead = false;
    var pf = portfolio === 'todos' || (portfolio && portfolio.cons) ? 'todos' : (typeof portfolio === 'string' ? (T.get ? T.get(portfolio) : portfolio) : portfolio);
    function destroy() { if (dead) return; dead = true; off.forEach(function (f) { try { f(); } catch (e) { } }); off = []; if (mount) mount.innerHTML = ''; }
    var api = { destroy: destroy };
    var inp = null; try { inp = CM.inputs(pf); } catch (e) { inp = null; }
    if (!inp) { mount.innerHTML = '<div class="pmt"><div class="pmt-empty"><strong>Este portafolio aún no tiene historial</strong><p>Cuando agregues posiciones, aquí podrás fijar metas y ver qué tan probable es alcanzarlas.</p></div></div>'; return api; }
    var id = 'pmt' + (++uid), key = pfKey(pf), B = baseDate(T), st = load(key), cards = {}, started = false, sheet = null, toastEl = null, toastT = 0;
    function nextGoalId() { var n = 1; st.goals.forEach(function (g) { var k = +String(g.id).replace(/\D/g, ''); if (k >= n) n = k + 1; }); return 'g' + n; }
    function when(years) { var m = B.m + Math.round(years * 12); return MES[((m % 12) + 12) % 12] + ' ' + (B.y + Math.floor(m / 12)); }
    function sumShare() { var s = 0; st.goals.forEach(function (g) { s += g.share; }); return s; }

    /* ---------- tweens (solo transform/opacity y atributos de SVG) ---------- */
    function nf(fn) { var done = false, t = 0, r = 0; function go() { if (done) return; done = true; clearTimeout(t); cancelAnimationFrame(r); fn(); } r = requestAnimationFrame(go); t = setTimeout(go, 50); }
    function tween(o, k, from, to, dur, delay, fn) {
      var my = o[k] = (o[k] || 0) + 1;
      if (reduce() || dur <= 0 || from === to) { fn(to); return; }
      var t0 = performance.now() + (delay || 0);
      (function run() { if (dead || o[k] !== my) return; var x = (performance.now() - t0) / dur; if (x < 0) { nf(run); return; } fn(from + (to - from) * easeOut(x)); if (x < 1) nf(run); else fn(to); })();
    }

    /* ---------- gráfica del abanico ---------- */
    var S = 49;
    function Fan(stage, getDead) {
      var canvas = stage.querySelector('canvas'), ctx = canvas.getContext('2d'), W = 0, H = 0, dpr = 1, sized = false, colors = null, ff = '', RT = 8, PT = 10, BT = 26, PL = 0;
      var cur = null, from = null, to = null, t0 = 0, dur = 0, started0 = false, revT0 = 0, revDone = false, pend = false, rid = 0, tid = 0, hIdx = -1, kbIdx = -1, data = null, readFn = null;
      function samp(a) { var n = a.length - 1, o = new Float64Array(S); for (var j = 0; j < S; j++) { var f = j / (S - 1) * n, i0 = Math.floor(f), i1 = Math.min(n, i0 + 1), u = f - i0; o[j] = a[i0] * (1 - u) + a[i1] * u; } return o; }
      function mk(d) {
        var hi = d.goal * 1.06, i; for (i = 0; i < d.p90.length; i++) if (d.p90[i] > hi) hi = d.p90[i]; hi *= 1.04;
        var step = niceStep(hi, 4), ticks = []; for (var v = 0; v <= hi + 1e-9; v += step) ticks.push(v);
        var xs = d.n <= 6 ? 1 : d.n <= 12 ? 2 : d.n <= 25 ? 5 : 10, xt = [];
        for (i = 0; i <= d.n; i += xs) xt.push(i); if (xt[xt.length - 1] !== d.n) { if (d.n - xt[xt.length - 1] < xs / 2) xt[xt.length - 1] = d.n; else xt.push(d.n); }
        return { l: [samp(d.p10), samp(d.p50), samp(d.p90)], hi: hi, goal: d.goal, ticks: ticks, xt: xt };
      }
      function set(d, anim) {
        data = d; var now = performance.now(), nx = mk(d);
        from = cur ? { l: cur.l.map(function (a) { return a.slice(); }), hi: cur.hi, goal: cur.goal } : null; to = nx; t0 = now; dur = anim && started0 && from && !reduce() ? 420 : 0;
        if (!dur) { cur = { l: nx.l.map(function (a) { return a.slice(); }), hi: nx.hi, goal: nx.goal }; from = null; }
        paintRead(); schedule();
      }
      function paintRead() { var i = hIdx >= 0 ? hIdx : kbIdx; if (readFn && data) readFn(i >= 0 ? clamp(i, 0, data.n) : -1); }
      function step(now) {
        if (!to) return false; var e = dur ? easeOut((now - t0) / dur) : 1;
        if (from) { for (var k = 0; k < 3; k++) for (var j = 0; j < S; j++) cur.l[k][j] = from.l[k][j] + (to.l[k][j] - from.l[k][j]) * e; cur.hi = from.hi + (to.hi - from.hi) * e; cur.goal = from.goal + (to.goal - from.goal) * e; }
        if (e >= 1) { from = null; dur = 0; return false; } return true;
      }
      function size() {
        var r = stage.getBoundingClientRect(); if (r.width < 4 || r.height < 4) { sized = false; return; }
        dpr = Math.min(window.devicePixelRatio || 1, 2); W = r.width; H = r.height;
        var cw = Math.round(W * dpr), ch = Math.round(H * dpr); if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; } sized = true;
      }
      function readColors() { var cs = getComputedStyle(stage), g = function (n) { return cs.getPropertyValue(n).trim(); }; colors = { text: g('--text'), t2: g('--text-2'), t3: g('--text-3'), line: g('--line'), grid: g('--grid'), s1: g('--s1'), s2: g('--s2'), acc: g('--accent-ink') }; ff = cs.fontFamily; }
      function draw(now) {
        if (!sized || !colors || !cur || !data) return;
        var PR = W - RT, PB = H - BT, ph = PB - PT, pw = PR - PL;
        function X(f) { return PL + f * pw; } function Y(v) { return PB - v / cur.hi * ph; }
        var rv = started0 ? (revDone ? 1 : easeOut((now - revT0) / 700)) : 0;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.font = '400 11px ' + ff;
        ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        to.ticks.forEach(function (v) { var y = Y(v); if (y < PT - 1 || y > PB + 1) return; ctx.strokeStyle = colors.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PL, Math.round(y) + 0.5); ctx.lineTo(PR, Math.round(y) + 0.5); ctx.stroke(); if (v > 0) { ctx.fillStyle = colors.t3; ctx.fillText(compact(v), PL + 2, y - 3); } });
        ctx.strokeStyle = colors.line; ctx.beginPath(); ctx.moveTo(PL, Math.round(PB) + 0.5); ctx.lineTo(PR, Math.round(PB) + 0.5); ctx.stroke();
        ctx.textBaseline = 'top'; ctx.fillStyle = colors.t3; to.xt.forEach(function (i, k) { var f = i / data.n; ctx.textAlign = k === 0 ? 'left' : i === data.n ? 'right' : 'center'; ctx.fillText(String(B.y + i), X(f), PB + 8); });
        /* línea de la meta */
        var yg = Y(cur.goal); ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = colors.t2; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(PL, Math.round(yg) + 0.5); ctx.lineTo(PR, Math.round(yg) + 0.5); ctx.stroke(); ctx.restore();
        ctx.fillStyle = colors.t2; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText('Meta ' + compact(data.goal), PR, yg - 4);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, PL + pw * rv + 2, H); ctx.clip();
        var a10 = cur.l[0], a50 = cur.l[1], a90 = cur.l[2], j;
        ctx.globalAlpha = 0.17; ctx.fillStyle = colors.acc; ctx.beginPath(); ctx.moveTo(X(0), Y(a90[0])); for (j = 1; j < S; j++) ctx.lineTo(X(j / (S - 1)), Y(a90[j])); for (j = S - 1; j >= 0; j--) ctx.lineTo(X(j / (S - 1)), Y(a10[j])); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
        function ln(a, w, al, halo) { if (halo) { ctx.strokeStyle = colors.s1; ctx.lineWidth = w + 2; ctx.beginPath(); for (var k = 0; k < S; k++) { var x = X(k / (S - 1)), y = Y(a[k]); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); } ctx.globalAlpha = al; ctx.strokeStyle = colors.acc; ctx.lineWidth = w; ctx.beginPath(); for (var k2 = 0; k2 < S; k2++) { var x2 = X(k2 / (S - 1)), y2 = Y(a[k2]); if (k2) ctx.lineTo(x2, y2); else ctx.moveTo(x2, y2); } ctx.stroke(); ctx.globalAlpha = 1; }
        ln(a90, 1.4, 0.7, false); ln(a10, 1.4, 0.7, false); ln(a50, 2.4, 1, true);
        ctx.restore();
        var ci = hIdx >= 0 ? hIdx : kbIdx;
        if (ci >= 0 && !dur && rv >= 1) {
          ci = clamp(ci, 0, data.n); var xc = Math.round(X(ci / data.n)) + 0.5;
          ctx.strokeStyle = colors.t2; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xc, PT); ctx.lineTo(xc, PB); ctx.stroke(); ctx.setLineDash([]);
          [data.p10[ci], data.p50[ci], data.p90[ci]].forEach(function (v, k) { ctx.fillStyle = colors.acc; ctx.strokeStyle = colors.s1; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(xc, Y(v), k === 1 ? 4 : 3, 0, 6.2832); ctx.stroke(); ctx.fill(); });
          var lb = String(B.y + ci), lw = ctx.measureText(lb).width + 12, lx = clamp(xc - lw / 2, PL, PR - lw);
          ctx.fillStyle = colors.s2; ctx.strokeStyle = colors.line; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(lx, PB + 3, lw, 18, 5); else ctx.rect(lx, PB + 3, lw, 18); ctx.fill(); ctx.stroke();
          ctx.fillStyle = colors.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lb, lx + lw / 2, PB + 12.5);
        }
      }
      function frame() {
        cancelAnimationFrame(rid); clearTimeout(tid); pend = false; if (getDead()) return; var now = performance.now();
        if (!sized) size(); if (sized && !colors) readColors();
        var more = step(now); if (started0 && !revDone) { if (reduce() || now - revT0 >= 720) revDone = true; else more = true; }
        draw(now); if (more) schedule();
      }
      function schedule() { if (pend || getDead()) return; pend = true; rid = requestAnimationFrame(frame); tid = setTimeout(frame, 50); }
      function pointerAt(e) { var r = stage.getBoundingClientRect(), pw = W - RT - PL, x = e.clientX - r.left - PL; if (!data || x < 0 || x > pw) { clear(); return; } hIdx = Math.round(clamp(x / pw, 0, 1) * data.n); kbIdx = -1; paintRead(); schedule(); }
      function clear() { var was = hIdx >= 0 || kbIdx >= 0; hIdx = -1; kbIdx = -1; if (was) paintRead(); schedule(); }
      stage.addEventListener('pointermove', pointerAt); stage.addEventListener('pointerdown', pointerAt); stage.addEventListener('pointerleave', clear); stage.addEventListener('pointercancel', clear);
      stage.addEventListener('pointerup', function (e) { if (e.pointerType === 'touch') clear(); }); stage.addEventListener('blur', clear);
      stage.addEventListener('keydown', function (e) {
        if (!data) return; var c = kbIdx >= 0 ? kbIdx : data.n, n = c;
        if (e.key === 'ArrowLeft') n = c - 1; else if (e.key === 'ArrowRight') n = c + 1; else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = data.n; else if (e.key === 'Escape') { clear(); return; } else return;
        e.preventDefault(); kbIdx = clamp(n, 0, data.n); hIdx = -1; paintRead(); schedule();
      });
      return { set: set, size: function () { size(); schedule(); }, theme: function () { colors = null; schedule(); }, schedule: schedule, stop: function () { cancelAnimationFrame(rid); clearTimeout(tid); },
        read: function (f) { readFn = f; }, start: function () { if (started0) return; started0 = true; revT0 = performance.now(); if (reduce()) revDone = true; schedule(); } };
    }

    /* ---------- tarjeta de meta ---------- */
    var C_R = 52, ICON_EDIT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg>', ICON_DEL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3"/></svg>';
    function tickXY(p) { var a = (p * 360 - 90) * Math.PI / 180; return [60 + Math.cos(a) * 46, 60 + Math.sin(a) * 46, 60 + Math.cos(a) * 58, 60 + Math.sin(a) * 58]; }
    var tk = tickXY(Q);
    function infoBtn(did, label) { return '<button type="button" class="pmt-i" aria-expanded="false" aria-controls="' + did + '" aria-label="Qué significa: ' + esc(label) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg></button>'; }
    function cardHTML(g, k) {
      var cid = id + g.id;
      return '<article class="pmt-g panel" data-id="' + esc(g.id) + '" style="--i:' + k + '" aria-labelledby="' + cid + 'n">' +
        '<header class="pmt-gh"><div class="pmt-gt"><h3 id="' + cid + 'n" data-name></h3><p class="pmt-gm" data-meta></p></div>' +
        '<div class="pmt-ga"><button type="button" class="pmt-ib" data-edit>' + ICON_EDIT + '</button><button type="button" class="pmt-ib" data-del>' + ICON_DEL + '</button></div></header>' +
        '<div class="pmt-gb"><div class="pmt-ringw"><svg class="pmt-ring" viewBox="0 0 120 120" role="img" data-rsvg><circle class="pmt-rt" cx="60" cy="60" r="' + C_R + '"/><circle class="pmt-rf" cx="60" cy="60" r="' + C_R + '" pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="100" transform="rotate(-90 60 60)" data-rf/>' +
        '<line class="pmt-rk" x1="' + tk[0].toFixed(2) + '" y1="' + tk[1].toFixed(2) + '" x2="' + tk[2].toFixed(2) + '" y2="' + tk[3].toFixed(2) + '"/></svg>' +
        '<div class="pmt-rn"><span class="pmt-pv num" data-pv>0 %</span><span class="pmt-rl" data-pl></span></div></div>' +
        '<div class="pmt-facts">' +
        '<div class="pmt-f"><div class="pmt-fh"><span>Aporte necesario</span>' + infoBtn(cid + 'd1', 'aporte necesario') + '</div><p class="pmt-ft" data-need></p><p class="pmt-def" id="' + cid + 'd1" hidden>Es el aporte mensual con el que, en 8 de cada 10 simulaciones de tu portafolio, llegas a la meta en el plazo. Se calcula con la parte del portafolio que asignaste a esta meta.</p></div>' +
        '<div class="pmt-f"><div class="pmt-fh"><span>Cuándo llegas</span>' + infoBtn(cid + 'd2', 'cuándo llegas') + '</div><p class="pmt-ft" data-when></p><p class="pmt-def" id="' + cid + 'd2" hidden>Es el año en que, con tu aporte actual, 8 de cada 10 simulaciones ya alcanzaron la meta. Si no ocurre en 40 años, te lo decimos.</p></div>' +
        '</div></div>' +
        '<div class="pmt-ch"><div class="pmt-cht"><span class="pmt-chl">Cómo podría crecer</span><ul class="pmt-key" aria-hidden="true"><li><i class="pmt-k90"></i>Favorable</li><li><i class="pmt-k50"></i>Mediano</li><li><i class="pmt-k10"></i>Desfavorable</li><li><i class="pmt-kg"></i>Meta</li></ul></div>' +
        '<dl class="pmt-ro" data-ro><div><dt data-ra>Año</dt><dd data-r="a"></dd></div><div><dt>Desfavorable</dt><dd data-r="b"></dd></div><div><dt>Mediano</dt><dd data-r="c"></dd></div><div><dt>Favorable</dt><dd data-r="d"></dd></div></dl>' +
        '<div class="pmt-stage" tabindex="0" role="group" aria-labelledby="' + cid + 'n" aria-describedby="' + cid + 'sr"><canvas aria-hidden="true"></canvas></div><p class="pmt-sr" id="' + cid + 'sr" aria-live="polite" data-sr>Con las flechas izquierda y derecha lees cada año.</p></div>' +
        '<div class="pmt-if"><div class="pmt-ifh"><label class="pmt-ifl" for="' + cid + 'r">¿Y si aporto…?</label><output class="pmt-ifo num" data-ifo for="' + cid + 'r"></output></div>' +
        '<div class="pmt-rw"><input type="range" class="pmt-range" id="' + cid + 'r" min="0" max="10000" step="100" value="0" data-range><i class="pmt-need" data-needk hidden></i></div>' +
        '<p class="pmt-ifr" data-ifr></p><div class="pmt-ifb"><button type="button" class="btn btn-ghost btn-sm" data-reset hidden>Volver a mi aporte</button><button type="button" class="btn btn-secondary btn-sm" data-keep hidden>Usar este aporte</button></div></div>' +
        '</article>';
    }
    function realTxt() { return st.real ? 'valor de hoy' : 'valor del año de la meta'; }
    function rangeSpec(g, eng) { var need = eng.need.p90 != null ? eng.need.p90 : 0, mx = Math.max(need, g.monthly, 1000) * 1.5, stp = mx <= 20000 ? 100 : mx <= 100000 ? 500 : 1000; return { max: Math.ceil(mx / stp) * stp, step: stp }; }
    function status(p) { return p >= Q ? ['Muy probable', 'gain'] : p >= 0.5 ? ['Incierta', 'flat'] : ['Poco probable', 'loss']; }
    function setRing(c, p) {
      c.pd = p; var rf = c.rf; rf.setAttribute('stroke-dashoffset', (100 - clamp(p, 0, 1) * 100).toFixed(2)); rf.style.opacity = p < 0.004 ? '0' : '1';
      var pct = Math.round(p * 100), t = pct + ' %'; if (c.pv.textContent !== t) c.pv.textContent = t;
      var s = status(p); c.pl.textContent = s[0]; c.pl.className = 'pmt-rl ' + s[1]; c.svg.setAttribute('aria-label', 'Probabilidad de ' + pct + ' por ciento de alcanzar la meta');
    }
    function ringTo(c, p, dur, delay) { tween(c, 'rk', c.pd == null ? 0 : c.pd, p, dur, delay, function (v) { setRing(c, v); }); }
    function needTxt(g, eng) {
      var n = eng.need.p80;
      if (n == null) return 'Con ' + fM(g.monthly) + ' al mes no es alcanzable: prueba con un plazo más largo o una meta menor.';
      if (n <= 0.5) return 'Con 80 % de probabilidad <strong>ya llegas sin aportar más</strong>. Tu aporte actual es de ' + fM(g.monthly) + ' al mes.';
      return 'Con 80 % de probabilidad necesitas <strong class="num">' + fM(n) + ' al mes</strong>. Hoy aportas ' + fM(g.monthly) + '.';
    }
    function whenTxt(g, eng) {
      var w = eng.when.p80;
      if (w == null) return 'Con ' + fM(g.monthly) + ' al mes, llegar con 80 % de probabilidad toma más de 40 años.';
      return 'Con tu aporte actual llegas en <strong class="num">' + (B.y + Math.floor((B.m + Math.round(w * 12)) / 12)) + '</strong> (80 %), en unos ' + nf1.format(w) + ' años' + (w > g.years + 0.01 ? ', después de tu plazo (' + (B.y + g.years) + ')' : '') + '.';
    }
    function ifText(c, cv) {
      var g = c.g, eng = c.eng, p = eng.pAt(cv), n = eng.need.p80, s = 'Con ' + fM(cv) + ' al mes tienes <strong class="num">' + Math.round(p * 100) + ' %</strong> de probabilidad. ';
      if (n == null) s += 'Ni con aportes mayores se llega con 80 %.';
      else if (cv >= n - 0.5) s += (n <= 0.5 ? 'Ya llegas a 80 % sin aportar.' : 'Superas por <strong class="num">' + fM(cv - n) + '</strong> el aporte necesario para 80 %.');
      else s += 'Te faltan <strong class="num">' + fM(n - cv) + '</strong> al mes para llegar a 80 %.';
      return s;
    }
    function paintLive(c) {
      var cv = +c.range.value, p = c.eng.pAt(cv); c.live = cv;
      ringTo(c, p, 140, 0); c.ifo.textContent = fM(cv) + ' al mes'; c.ifr.innerHTML = ifText(c, cv);
      c.range.style.setProperty('--pos', (cv / (+c.range.max || 1) * 100).toFixed(2) + '%'); c.range.setAttribute('aria-valuetext', fM(cv) + ' al mes, ' + Math.round(p * 100) + ' por ciento de probabilidad');
      var diff = Math.abs(cv - c.g.monthly) > 0.5; c.reset.hidden = !diff; c.keep.hidden = !diff;
    }
    function paintCard(c, animate, delay) {
      var g = c.g, eng = engine(inp, g, st.real); c.eng = eng; var start = g.share / 100 * inp.value;
      c.el.querySelector('[data-name]').textContent = g.name;
      c.el.querySelector('[data-meta]').innerHTML = '<span class="num">' + fM(g.target) + '</span> en ' + realTxt() + ' · ' + when(g.years) + ' (' + g.years + (g.years === 1 ? ' año' : ' años') + ') · ' + g.share + ' % del portafolio (<span class="num">' + fM(start) + '</span> hoy)';
      c.el.querySelector('[data-edit]').setAttribute('aria-label', 'Editar la meta ' + g.name); c.el.querySelector('[data-del]').setAttribute('aria-label', 'Eliminar la meta ' + g.name);
      c.need.innerHTML = needTxt(g, eng); c.whenEl.innerHTML = whenTxt(g, eng);
      var rs = rangeSpec(g, eng); c.range.max = rs.max; c.range.step = rs.step; c.range.value = g.monthly;
      if (eng.need.p80 != null && eng.need.p80 > 0 && eng.need.p80 <= rs.max) { c.nk.hidden = false; c.nk.style.setProperty('--nf', (eng.need.p80 / rs.max).toFixed(4)); c.nk.title = 'Aporte para 80 %: ' + fM(eng.need.p80); } else c.nk.hidden = true;
      c.ifo.textContent = fM(g.monthly) + ' al mes'; c.ifr.innerHTML = ifText(c, g.monthly); c.reset.hidden = true; c.keep.hidden = true; c.live = g.monthly;
      c.range.style.setProperty('--pos', (g.monthly / rs.max * 100).toFixed(2) + '%'); c.range.setAttribute('aria-valuetext', fM(g.monthly) + ' al mes, ' + Math.round(eng.pAt(g.monthly) * 100) + ' por ciento de probabilidad');
      ringTo(c, eng.pAt(g.monthly), animate ? (c.shown ? 420 : 800) : 0, delay || 0); c.shown = true;
      var fan = eng.fan, n = fan.length - 1; c.fd = { n: n, goal: g.target, p10: fan.map(function (f) { return f.p10; }), p50: fan.map(function (f) { return f.p50; }), p90: fan.map(function (f) { return f.p90; }) };
      c.chart.set(c.fd, animate);
      c.sr.textContent = 'Al final del plazo, ' + B.y + n + ': mediano ' + fM(fan[n].p50) + ', desfavorable ' + fM(fan[n].p10) + ', favorable ' + fM(fan[n].p90) + '. Meta ' + fM(g.target) + '.';
    }
    function buildCard(g, k) {
      var t = doc.createElement('div'); t.innerHTML = cardHTML(g, k); var el = t.firstChild, q = function (s) { return el.querySelector(s); };
      var c = { g: g, el: el, svg: q('[data-rsvg]'), rf: q('[data-rf]'), pv: q('[data-pv]'), pl: q('[data-pl]'), need: q('[data-need]'), whenEl: q('[data-when]'), range: q('[data-range]'), nk: q('[data-needk]'), ifo: q('[data-ifo]'), ifr: q('[data-ifr]'), reset: q('[data-reset]'), keep: q('[data-keep]'), sr: q('[data-sr]'), pd: 0, live: 0, shown: false };
      c.chart = Fan(q('.pmt-stage'), function () { return dead; });
      var ro = q('[data-ro]'), f2 = function (n, v) { ro.querySelector('[data-r="' + n + '"]').textContent = v; };
      c.chart.read(function (i) { var d = c.fd, j = i < 0 ? d.n : i; q('[data-ra]').textContent = i < 0 ? 'Fin del plazo' : 'Año'; f2('a', String(B.y + j)); f2('b', fM(d.p10[j])); f2('c', fM(d.p50[j])); f2('d', fM(d.p90[j])); });
      var raf = 0; c.range.addEventListener('input', function () { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; if (!dead) paintLive(c); }); });
      off.push(function () { cancelAnimationFrame(raf); });
      c.reset.addEventListener('click', function () { c.range.value = c.g.monthly; paintLive(c); c.reset.hidden = true; c.keep.hidden = true; c.range.focus(); });
      c.keep.addEventListener('click', function () { c.g.monthly = +c.range.value; persist(); paintCard(c, true, 0); });
      return c;
    }
    function persist() { save(key, st); }

    /* ---------- estructura ---------- */
    mount.innerHTML = '<div class="pmt" id="' + id + '"><p class="pmt-tag">Cada meta se calcula con la parte del portafolio que le asignas y con 4,000 simulaciones</p>' +
      '<div class="pmt-bar"><div class="pmt-barl"><span class="pmt-barx">Montos en</span><div class="seg pmt-seg" role="group" aria-label="Unidad de los montos" style="--n:2;--i:0"><span class="seg-pill" aria-hidden="true"></span><button type="button" data-real="1" aria-pressed="true">Valor de hoy</button><button type="button" data-real="0" aria-pressed="false">Valor futuro</button></div></div>' +
      '<button type="button" class="btn btn-primary btn-sm" data-new>Agregar meta</button></div>' +
      '<p class="pmt-unit" data-unit></p><div class="pmt-warn" role="status" data-warn hidden></div><div class="pmt-list" data-list></div><p class="pmt-foot">Simulación con supuestos · no es asesoría de inversión</p>' +
      '<div class="pmt-toast" role="status" aria-live="polite" data-toast hidden></div></div>';
    var $ = function (s, r) { return (r || mount).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || mount).querySelectorAll(s)); };
    var listEl = $('[data-list]'), warnEl = $('[data-warn]'), unitEl = $('[data-unit]'); toastEl = $('[data-toast]');
    var seg = $('.pmt-seg'); seg.style.setProperty('--i', st.real ? 0 : 1); $$('button', seg).forEach(function (b) { b.setAttribute('aria-pressed', String((b.dataset.real === '1') === st.real)); });

    function paintUnit() {
      var asg = sumShare(), val = inp.value * Math.min(asg, 100) / 100;
      unitEl.innerHTML = (st.real ? 'Todo está en <strong>valor de hoy</strong>: descontamos la inflación esperada (' + nf1.format(CM.A.infl * 100) + ' % anual) para que ' + '<span class="num">' + fM(1000000) + '</span> signifique lo mismo que hoy.' : 'Los montos están en <strong>valor futuro</strong>, sin descontar la inflación: ' + fM(1000000) + ' dentro de 20 años comprará bastante menos que hoy.') +
        (st.goals.length ? ' Asignado a metas: <strong class="num">' + asg + ' %</strong> del portafolio (' + fM(inp.value * asg / 100) + ' de ' + fM(inp.value) + ').' : '');
    }
    function paintWarn() {
      var s = sumShare(), over = s > 100, was = !warnEl.hidden;
      if (over) { warnEl.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 2.5 20h19L12 4zM12 10v4M12 17h.01"/></svg><span>Tus metas suman <strong class="num">' + s + ' %</strong> del portafolio: el mismo dinero se cuenta para más de una meta y las probabilidades salen optimistas. Reparte hasta 100 % o menos.</span>'; warnEl.hidden = false; if (!was && !reduce() && warnEl.animate) warnEl.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EXPO }); }
      else warnEl.hidden = true;
    }
    function paintAll() { paintUnit(); paintWarn(); }
    function paintEmpty() {
      var e = $('.pmt-empty', listEl);
      if (st.goals.length) { if (e) e.remove(); return; }
      if (!e) { var t = doc.createElement('div'); t.className = 'pmt-empty'; t.innerHTML = '<strong>Aún no tienes metas</strong><p>Una meta convierte tu portafolio en una pregunta concreta: cuánto necesitas, en cuánto tiempo y qué tan probable es. Agrega la primera.</p>'; listEl.appendChild(t); if (!reduce() && t.animate) t.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: EXPO }); }
    }
    st.goals.forEach(function (g, k) { var c = buildCard(g, k); cards[g.id] = c; listEl.appendChild(c.el); });
    paintEmpty();

    /* ---------- info, editar, borrar ---------- */
    var onClick = function (e) {
      var ib = e.target.closest('.pmt-i');
      if (ib) { var d = doc.getElementById(ib.getAttribute('aria-controls')), open = ib.getAttribute('aria-expanded') !== 'true'; if (!d) return; ib.setAttribute('aria-expanded', String(open)); d.hidden = !open; if (open && !reduce() && d.animate) d.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EXPO }); return; }
      var eb = e.target.closest('[data-edit]'); if (eb) { var c1 = cards[eb.closest('.pmt-g').dataset.id]; if (c1) openSheet(c1.g); return; }
      var db = e.target.closest('[data-del]'); if (db) { var c2 = cards[db.closest('.pmt-g').dataset.id]; if (c2) removeGoal(c2); return; }
      if (e.target.closest('[data-new]')) { if (st.goals.length >= MAXG) { showToast('Puedes tener hasta ' + MAXG + ' metas. Elimina una para agregar otra.'); return; } openSheet(null); return; }
      var rb = e.target.closest('[data-real]');
      if (rb) {
        var r = rb.dataset.real === '1'; if (r === st.real) return; st.real = r; persist();
        $$('button', seg).forEach(function (b) { b.setAttribute('aria-pressed', String(b === rb)); }); seg.style.setProperty('--i', r ? 0 : 1);
        paintUnit(); st.goals.forEach(function (g, i) { paintCard(cards[g.id], true, i * 40); });
      }
    };
    mount.addEventListener('click', onClick); off.push(function () { mount.removeEventListener('click', onClick); });
    function removeGoal(c) {
      var i = st.goals.indexOf(c.g); if (i < 0) return; var g = c.g;
      if (sheet && sheet.gid === g.id) closeSheet(true);
      var tops = {}; st.goals.forEach(function (x) { tops[x.id] = cards[x.id].el.getBoundingClientRect().top; });
      st.goals.splice(i, 1); delete cards[g.id]; persist();
      function done() { c.el.remove(); paintAll(); paintEmpty(); flip(tops); }
      if (!reduce() && c.el.animate) { var a = c.el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-8px) scale(0.98)' }], { duration: 220, easing: EXPO, fill: 'forwards' }); a.onfinish = function () { if (!dead) done(); }; } else done();
      showToast('Meta «' + g.name + '» eliminada.', 'Deshacer', function () {
        if (st.goals.length >= MAXG + 1) return; var at = Math.min(i, st.goals.length); st.goals.splice(at, 0, g); persist();
        var tops2 = {}; st.goals.forEach(function (x) { if (cards[x.id]) tops2[x.id] = cards[x.id].el.getBoundingClientRect().top; });
        var nc = buildCard(g, at); cards[g.id] = nc; var ref = listEl.children[at]; if (ref) listEl.insertBefore(nc.el, ref); else listEl.appendChild(nc.el); paintCard(nc, false); setRing(nc, 0); nc.chart.size(); nc.chart.start(); paintAll(); paintEmpty();
        ringTo(nc, nc.eng.pAt(g.monthly), 700, 80); if (!reduce() && nc.el.animate) nc.el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EXPO }); flip(tops2);
      });
    }
    function flip(tops) { if (reduce()) return; st.goals.forEach(function (g) { var c = cards[g.id]; if (!c || tops[g.id] == null || !c.el.animate) return; var d = tops[g.id] - c.el.getBoundingClientRect().top; if (Math.abs(d) > 1) c.el.animate([{ transform: 'translateY(' + d + 'px)' }, { transform: 'none' }], { duration: 300, easing: EXPO }); }); }
    function showToast(msg, label, fn) {
      clearTimeout(toastT); toastEl.innerHTML = '<span>' + esc(msg) + '</span>' + (label ? '<button type="button" class="pmt-tb">' + esc(label) + '</button>' : ''); toastEl.hidden = false;
      if (!reduce() && toastEl.animate) toastEl.animate([{ opacity: 0, transform: 'translate(-50%, 12px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }], { duration: 240, easing: EXPO });
      var b = $('.pmt-tb', toastEl); if (b) b.addEventListener('click', function () { clearTimeout(toastT); toastEl.hidden = true; fn(); });
      toastT = setTimeout(function () { if (dead) return; if (!reduce() && toastEl.animate) { var a = toastEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: EXPO }); a.onfinish = function () { toastEl.hidden = true; }; } else toastEl.hidden = true; }, 7000);
    }
    off.push(function () { clearTimeout(toastT); });

    /* ---------- hoja de alta y edición ---------- */
    function parseNum(s) { var t = String(s == null ? '' : s).replace(/[^\d.]/g, ''); return t === '' ? NaN : +t; }
    function fld(nm, label, v, extra) { return '<div class="pmt-fld"><label for="' + id + 'f-' + nm + '">' + label + '</label><div class="pmt-in' + (extra && extra.pre ? ' pre' : '') + (extra && extra.suf ? ' suf' : '') + '">' + (extra && extra.pre ? '<span class="pmt-pre" aria-hidden="true">' + SYM() + '</span>' : '') + '<input id="' + id + 'f-' + nm + '" name="' + nm + '" type="text" inputmode="' + (extra && extra.mode || 'numeric') + '" autocomplete="off" value="' + esc(v) + '"' + (nm === 'name' ? ' maxlength="40"' : '') + ' aria-describedby="' + id + 'e-' + nm + '">' + (extra && extra.suf ? '<span class="pmt-suf" aria-hidden="true">' + extra.suf + '</span>' : '') + '</div><p class="pmt-err" id="' + id + 'e-' + nm + '" data-err="' + nm + '"></p></div>'; }
    function openSheet(g) {
      if (sheet) closeSheet(true);
      var isNew = !g, d = g || { name: '', target: 1000000, years: 10, monthly: 2000, share: Math.max(5, Math.min(100, 100 - sumShare())) || 100 };
      var f = doc.createElement('form'); f.className = 'pmt-sheet panel'; f.noValidate = true; f.setAttribute('aria-labelledby', id + 'sh');
      f.innerHTML = '<h3 id="' + id + 'sh">' + (isNew ? 'Nueva meta' : 'Editar meta') + '</h3><div class="pmt-fg">' +
        fld('name', 'Nombre de la meta', d.name, { mode: 'text' }) + fld('target', 'Monto de la meta (' + realTxt() + ')', d.target.toLocaleString('en'), { pre: true }) +
        fld('years', 'Plazo', d.years, { suf: 'años' }) + fld('monthly', 'Aporte mensual', Math.round(d.monthly).toLocaleString('en'), { pre: true }) +
        fld('share', 'Parte del portafolio asignada', d.share, { suf: '%' }) + '</div><p class="pmt-pv2" data-pv2 role="status"></p>' +
        '<div class="pmt-fa"><button type="submit" class="btn btn-primary btn-sm">' + (isNew ? 'Agregar meta' : 'Guardar cambios') + '</button><button type="button" class="btn btn-ghost btn-sm" data-cancel>Cancelar</button></div>';
      var ref = g && cards[g.id] ? cards[g.id].el : listEl.firstChild; if (ref) listEl.insertBefore(f, ref); else listEl.appendChild(f);
      if (g && cards[g.id]) cards[g.id].el.classList.add('is-editing');
      sheet = { el: f, gid: g ? g.id : null, isNew: isNew };
      var qi = function (n) { return f.querySelector('[name="' + n + '"]'); };
      function read() { return { name: qi('name').value.trim(), target: parseNum(qi('target').value), years: parseNum(qi('years').value), monthly: parseNum(qi('monthly').value), share: parseNum(qi('share').value) }; }
      var RULES = {
        name: function (v) { return v.name ? (v.name.length > 40 ? 'Usa 40 caracteres como máximo.' : '') : 'Escribe un nombre para la meta.'; },
        target: function (v) { return !isFinite(v.target) ? 'Escribe el monto de la meta.' : v.target < 10000 ? 'La meta debe ser de al menos ' + fM(10000) + '.' : v.target > 1e9 ? 'La meta no puede pasar de ' + fM(1e9) + '.' : ''; },
        years: function (v) { return !isFinite(v.years) || v.years !== Math.round(v.years) ? 'Escribe un plazo en años enteros.' : v.years < 1 || v.years > 40 ? 'El plazo va de 1 a 40 años.' : ''; },
        monthly: function (v) { return !isFinite(v.monthly) ? 'Escribe tu aporte mensual (puede ser 0).' : v.monthly > 1e6 ? 'El aporte no puede pasar de ' + fM(1e6) + ' al mes.' : ''; },
        share: function (v) { return !isFinite(v.share) || v.share !== Math.round(v.share) ? 'Escribe un porcentaje entero.' : v.share < 1 || v.share > 100 ? 'La parte asignada va de 1 a 100 %.' : ''; }
      };
      function setErr(n, msg) { var p = f.querySelector('[data-err="' + n + '"]'), inpEl = qi(n); if (p.textContent !== msg) { p.textContent = msg; if (msg && !reduce() && p.animate) p.animate([{ opacity: 0, transform: 'translateY(-3px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: EXPO }); } inpEl.setAttribute('aria-invalid', msg ? 'true' : 'false'); }
      function preview() {
        var v = read(), pv = f.querySelector('[data-pv2]'), others = 0; st.goals.forEach(function (x) { if (!g || x.id !== g.id) others += x.share; });
        if (!isFinite(v.share) || v.share < 1 || v.share > 100) { pv.textContent = ''; pv.className = 'pmt-pv2'; return; }
        var tot = others + v.share; pv.className = 'pmt-pv2' + (tot > 100 ? ' warn' : '');
        pv.innerHTML = 'Asignas <strong class="num">' + fM(inp.value * v.share / 100) + '</strong> de hoy a esta meta. ' + (tot > 100 ? 'Con esto tus metas suman <strong class="num">' + tot + ' %</strong>: pasarías de 100 % y se contaría dos veces el mismo dinero.' : 'Tus metas sumarían <span class="num">' + tot + ' %</span> del portafolio.');
      }
      f.addEventListener('input', function (e) { var n = e.target.name; if (n && RULES[n] && e.target.getAttribute('aria-invalid') === 'true') setErr(n, RULES[n](read())); preview(); });
      f.addEventListener('focusout', function (e) { var n = e.target.name; if (!n || !RULES[n]) return; var v = read(); if ((n === 'target' || n === 'monthly') && isFinite(v[n])) e.target.value = Math.round(v[n]).toLocaleString('en'); if (e.target.value !== '') setErr(n, RULES[n](v)); });
      f.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); closeSheet(false); } });
      f.querySelector('[data-cancel]').addEventListener('click', function () { closeSheet(false); });
      f.addEventListener('submit', function (e) {
        e.preventDefault(); var v = read(), bad = null;
        Object.keys(RULES).forEach(function (n) { var m = RULES[n](v); setErr(n, m); if (m && !bad) bad = n; }); if (bad) { qi(bad).focus(); return; }
        var o = { name: v.name, target: Math.round(v.target), years: v.years, monthly: Math.round(v.monthly), share: v.share };
        if (isNew) {
          o.id = nextGoalId(); st.goals.push(o); persist(); closeSheet(true);
          var c = buildCard(o, st.goals.length - 1); cards[o.id] = c; listEl.appendChild(c.el); paintCard(c, false); setRing(c, 0); c.chart.size(); c.chart.start(); ringTo(c, c.eng.pAt(o.monthly), 800, 120); paintAll(); paintEmpty();
          if (!reduce() && c.el.animate) c.el.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 340, easing: EXPO });
          c.el.scrollIntoView({ block: 'nearest', behavior: reduce() ? 'auto' : 'smooth' }); showToast('Meta «' + o.name + '» agregada.');
        } else { var c0 = cards[g.id]; for (var k in o) g[k] = o[k]; persist(); closeSheet(true); paintCard(c0, true, 0); c0.chart.size(); paintAll(); showToast('Cambios guardados en «' + g.name + '».'); }
      });
      preview(); if (!reduce() && f.animate) f.animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: EXPO });
      f.scrollIntoView({ block: 'nearest', behavior: reduce() ? 'auto' : 'smooth' }); qi('name').focus({ preventScroll: true });
    }
    function closeSheet(instant) {
      if (!sheet) return; var s = sheet, ret = s.gid && cards[s.gid] ? cards[s.gid].el.querySelector('[data-edit]') : $('[data-new]'); sheet = null;
      if (s.gid && cards[s.gid]) cards[s.gid].el.classList.remove('is-editing');
      var inside = s.el.contains(doc.activeElement);
      if (!instant && !reduce() && s.el.animate) { var a = s.el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: 200, easing: EXPO, fill: 'forwards' }); a.onfinish = function () { s.el.remove(); }; } else s.el.remove();
      if (inside && ret) ret.focus({ preventScroll: true });
    }

    /* ---------- primera vista ---------- */
    function visible() { return mount.offsetWidth > 0 && mount.offsetHeight > 0; }
    function start() {
      if (started || dead) return; started = true;
      st.goals.forEach(function (g, i) {
        var c = cards[g.id]; c.chart.size();
        if (!reduce() && c.el.animate) c.el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: i * 40, easing: EXPO, fill: 'backwards' });
        ringTo(c, c.eng.pAt(c.g.monthly), 850, 160 + i * 40); setTimeout(function () { if (!dead) c.chart.start(); }, reduce() ? 0 : 200 + i * 40);
      });
    }
    st.goals.forEach(function (g) { var c = cards[g.id]; paintCard(c, false); setRing(c, 0); });
    paintAll();
    if (mount.animate && !reduce()) mount.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EXPO });
    function sizeAll() { st.goals.forEach(function (g) { if (cards[g.id]) cards[g.id].chart.size(); }); }
    if (window.ResizeObserver) { var ro = new ResizeObserver(function () { sizeAll(); if (!started && visible()) start(); }); ro.observe(mount); off.push(function () { ro.disconnect(); }); }
    var resz = function () { sizeAll(); }; window.addEventListener('resize', resz); off.push(function () { window.removeEventListener('resize', resz); });
    var mob = new MutationObserver(function () { st.goals.forEach(function (g) { if (cards[g.id]) cards[g.id].chart.theme(); }); }); mob.observe(root, { attributes: true, attributeFilter: ['data-theme'] }); off.push(function () { mob.disconnect(); });
    var onRm = function () { st.goals.forEach(function (g) { if (cards[g.id]) cards[g.id].chart.schedule(); }); }; if (rmq.addEventListener) { rmq.addEventListener('change', onRm); off.push(function () { rmq.removeEventListener('change', onRm); }); }
    off.push(function () { st.goals.forEach(function (g) { if (cards[g.id]) cards[g.id].chart.stop(); }); });
    sizeAll(); if (visible()) start(); else setTimeout(function () { sizeAll(); if (!started && visible()) start(); }, 0);
    api.goals = function () { return st.goals; };
    return api;
  }

  window.CampoPfMetas = { render: render };
})();
