/* Campo · Portafolio individual · pestaña "Dividendos". Expone window.CampoPfDiv.render(mount, portfolio|'todos', CampoTracker) -> { destroy } y .calc.prep para pruebas.
   No recalcula finanzas: todo sale de CampoModel.dividends(pf) (recibidos del libro, proyección con el dividendo trimestral vigente, retención estimada).
   Aquí solo se agrupa por mes (12 recibidos + 12 estimados), se dibuja y se presenta. En producción, con los datos reales de campo/datos.js. */
(function () {
  'use strict';
  var M = window.CampoModel;
  if (!M || !M.dividends) return;
  var doc = typeof document !== 'undefined' ? document : null, root = doc && doc.documentElement;
  var rmq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduce() { return !!rmq.matches; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 4); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function isoMs(s) { return Date.parse(s + 'T00:00:00Z'); }
  function isoAdd(iso, d) { var t = new Date(iso + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + d); return t.toISOString().slice(0, 10); }
  var HOVER = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)').matches : false;
  var EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)', OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  var N = 24; /* 12 meses recibidos (el último es el mes en curso) + 12 estimados */

  /* ============================== formato ============================== */
  var nf0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
  function fM(v) { var a = Math.round(Math.abs(v)); return (v < 0 && a > 0 ? '−' : '') + '$' + nf0.format(a); }
  var nfc = {};
  function fN(v, d) { if (!nfc[d]) nfc[d] = new Intl.NumberFormat('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d }); return nfc[d].format(v); }
  function fPc(v, d) { return fN(v, d == null ? 2 : d) + ' %'; }
  function dTxt(iso, short) { return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', short ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, ''); }
  function niceStep(span, n) { var raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag; return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag; }
  function compact(v) { var a = Math.abs(v); if (a >= 1e6) return '$' + (Math.round(a / 1e4) / 100).toString().replace('.', ',') + ' M'; if (a >= 1e3) return '$' + (Math.round(a / 100) / 10).toString().replace('.', ',') + ' mil'; return '$' + Math.round(a); }
  var MESC = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function cap1(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function dpsTxt(p) { return fN(p.dps, 2) + ' ' + p.ccy; }
  function titulos(q) { return fN(q, q % 1 ? 4 : 0) + (q === 1 ? ' título' : ' títulos'); }

  /* ============================== datos ============================== */
  /* 24 casillas mensuales: de (mes actual − 11) a (mes actual + 12). Lo recibido fuera de la ventana de 12 meses no cuenta (igual que el KPI). */
  function prep(pf) {
    var d = M.dividends(pf), asOf = d.asOf, from = isoAdd(asOf, -365), base = (+asOf.slice(0, 4)) * 12 + (+asOf.slice(5, 7) - 1) - (N / 2 - 1), bins = [], i;
    for (i = 0; i < N; i++) { var k = base + i; bins.push({ i: i, y: Math.floor(k / 12), m: k % 12, rec: 0, recN: 0, proj: 0, projN: 0, list: [] }); }
    function at(date) { return (+date.slice(0, 4)) * 12 + (+date.slice(5, 7) - 1) - base; }
    d.received.forEach(function (r) { if (r.date <= from) return; var j = Math.max(0, at(r.date)); if (j > N - 1) return; var b = bins[j]; b.rec += r.gross; b.recN += r.net; b.list.push({ tk: r.ticker, g: r.gross, e: false }); });
    d.projected.forEach(function (r) { var j = at(r.date); if (j < 0 || j > N - 1) return; var b = bins[j]; b.proj += r.gross; b.projN += r.net; b.list.push({ tk: r.ticker, g: r.gross, e: true }); });
    var sumMv = 0, sumProj = 0; d.perAsset.forEach(function (a) { sumMv += a.mv; sumProj += a.projected; });
    return { d: d, bins: bins, asOf: asOf, from: from, empty: !d.received.length && !d.projected.length, yieldPayers: sumMv ? sumProj / sumMv : 0 };
  }

  /* ============================== DOM auxiliar ============================== */
  var uid = 0;
  function every(fn) { var done = false, r = 0, t = 0; (function run() { if (done) return; cancelAnimationFrame(r); clearTimeout(t); if (fn() === false) { done = true; return; } r = requestAnimationFrame(run); t = setTimeout(run, 50); })(); }
  function mark(t) { return window.CampoMarks ? window.CampoMarks.svg(t, 24) : '<span class="pdv-chip">' + esc(String(t).charAt(0)) + '</span>'; }
  var ICON_I = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>';
  var ICON_C = '<svg class="pdv-tgi" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
  function coHTML(did, inner) { return '<div class="pdv-co" id="' + did + '" data-co><div class="pdv-coi">' + inner + '</div></div>'; }
  function tgHTML(did, closedTxt, openTxt, label) { return '<button type="button" class="pdv-tg" aria-expanded="false" aria-controls="' + did + '" data-for="' + did + '" data-c="' + esc(closedTxt) + '" data-o="' + esc(openTxt) + '"' + (label ? ' aria-label="' + esc(label) + '"' : '') + '><span data-tgt>' + esc(closedTxt) + '</span>' + ICON_C + '</button>'; }

  /* ============================== gráfica de barras (lienzo nítido) ============================== */
  function Chart(stage, bins, todayF, getDead, onSel) {
    var canvas = stage.querySelector('canvas'), ctx = canvas.getContext('2d'), W = 0, H = 0, dpr = 1, sized = false, colors = null, ff = '';
    var PT = 24, BT = 26, RT = 4, net = false, cR = new Float64Array(N), cP = new Float64Array(N), cHi = 1, fR = null, fP = null, fHi = 1;
    var tR = new Float64Array(N), tP = new Float64Array(N), tHi = 1, tkFrom = [], tkTo = [], t0 = 0, dur = 0, started = false, revT0 = 0, revDone = false;
    var hIdx = -1, kIdx = -1, pend = false, rid = 0, tid = 0, pinned = -1;
    function target() {
      var mx = 0, i; for (i = 0; i < N; i++) { tR[i] = net ? bins[i].recN : bins[i].rec; tP[i] = net ? bins[i].projN : bins[i].proj; mx = Math.max(mx, tR[i] + tP[i]); }
      var st = niceStep((mx || 1) * 1.05, 4); tHi = Math.max(st, Math.ceil(mx * 1.04 / st - 1e-9) * st);
      tkTo = []; for (var v = st; v <= tHi + 1e-9; v += st) tkTo.push({ v: v, text: compact(v) });
    }
    function setMode(n, anim) {
      net = n; fR = cR.slice(); fP = cP.slice(); fHi = cHi; tkFrom = tkTo; target(); t0 = performance.now();
      dur = anim && started && !reduce() ? 300 : 0;
      if (!dur) { cR.set(tR); cP.set(tP); cHi = tHi; tkFrom = []; }
      schedule();
    }
    function step(now) {
      var more = false;
      if (dur) {
        var e = easeOut((now - t0) / dur), i;
        for (i = 0; i < N; i++) { cR[i] = fR[i] + (tR[i] - fR[i]) * e; cP[i] = fP[i] + (tP[i] - fP[i]) * e; } cHi = fHi + (tHi - fHi) * e;
        if (e >= 1) { dur = 0; tkFrom = []; cR.set(tR); cP.set(tP); cHi = tHi; } else more = true;
      }
      return more;
    }
    function size() {
      var r = stage.getBoundingClientRect(); if (r.width < 4 || r.height < 4) { sized = false; return; }
      dpr = Math.min(window.devicePixelRatio || 1, 2); W = r.width; H = r.height;
      var cw = Math.round(W * dpr), ch = Math.round(H * dpr); if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      sized = true;
    }
    function readColors() {
      var cs = getComputedStyle(stage), g = function (n) { return cs.getPropertyValue(n).trim(); };
      colors = { text: g('--text'), t2: g('--text-2'), t3: g('--text-3'), line: g('--line'), grid: g('--grid'), s1: g('--s1'), s2: g('--s2'), acc: g('--accent-ink') }; ff = cs.fontFamily;
    }
    function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, [r, r, 0, 0]); else ctx.rect(x, y, w, h); }
    function sel() { return hIdx >= 0 ? hIdx : kIdx >= 0 ? kIdx : pinned; }
    function draw(now) {
      if (!sized || !colors) return;
      var PL = 0, PR = W - RT, PB = H - BT, ph = PB - PT, sw = (PR - PL) / N, bw = clamp(sw * 0.64, 4, 22), rad = Math.min(3, bw / 2), hi = cHi || 1;
      function Y(v) { return PB - v / hi * ph; }
      var te = dur ? easeOut((now - t0) / dur) : 1, s = sel(), i;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.font = '400 11px ' + ff;
      function grid(list, a) {
        if (a <= 0.01) return; ctx.globalAlpha = a; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        list.forEach(function (t) { var y = Y(t.v); if (y < PT - 6 || y > PB) return; ctx.strokeStyle = colors.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PL, Math.round(y) + 0.5); ctx.lineTo(PR, Math.round(y) + 0.5); ctx.stroke(); ctx.fillStyle = colors.t3; ctx.fillText(t.text, PL + 2, y - 3); });
        ctx.globalAlpha = 1;
      }
      grid(tkFrom, 1 - te); grid(tkTo, tkFrom.length ? te : 1);
      ctx.strokeStyle = colors.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PL, Math.round(PB) + 0.5); ctx.lineTo(PR, Math.round(PB) + 0.5); ctx.stroke();
      if (s >= 0) { ctx.fillStyle = colors.s2; ctx.fillRect(PL + s * sw, PT - 4, sw, PB - PT + 4); }
      /* meses */
      ctx.textBaseline = 'top'; ctx.textAlign = 'center';
      for (i = 0; i < N; i++) {
        var b = bins[i], show = sw >= 26 || b.m % 3 === 0 || i === s; if (!show) continue;
        var lab = MESC[b.m] + (b.m === 0 || (i === 0 && b.m < 11) ? ' ’' + String(b.y).slice(2) : ''), cx = PL + i * sw + sw / 2, tw = ctx.measureText(lab).width, x = clamp(cx, tw / 2, W - tw / 2);
        ctx.fillStyle = i === s ? colors.text : colors.t3; ctx.fillText(lab, x, PB + 8);
      }
      /* barras */
      for (i = 0; i < N; i++) {
        var g = started ? (revDone ? 1 : easeOut((now - revT0 - i * 28) / 520)) : 0, hr = cR[i] / hi * ph * g, hp = cP[i] / hi * ph * g, bx = PL + i * sw + (sw - bw) / 2, al = s >= 0 && i !== s ? 0.55 : 1;
        if (hr > 0.4) { ctx.globalAlpha = al; ctx.fillStyle = colors.acc; rr(bx, PB - hr, bw, hr, hp > 0.4 ? 0 : rad); ctx.fill(); }
        if (hp > 0.4) {
          var by = PB - hr - hp; ctx.save(); ctx.globalAlpha = al; rr(bx, by, bw, hp, rad); ctx.clip();
          ctx.fillStyle = colors.acc; ctx.globalAlpha = 0.13 * al; ctx.fillRect(bx, by, bw, hp);
          ctx.globalAlpha = 0.6 * al; ctx.strokeStyle = colors.acc; ctx.lineWidth = 1; ctx.beginPath();
          for (var k = -hp; k < bw + hp; k += 5) { ctx.moveTo(bx + k, by + hp); ctx.lineTo(bx + k + hp, by); } ctx.stroke(); ctx.restore();
          ctx.globalAlpha = 0.95 * al; ctx.strokeStyle = colors.acc; ctx.lineWidth = 1.25; rr(bx + 0.6, by + 0.6, bw - 1.2, hp - 1.2, rad); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      /* hoy */
      var xh = PL + (N / 2 - 1 + todayF) * sw, ra = started ? easeOut((now - revT0 - 350) / 400) : 0;
      if (ra > 0) {
        ctx.save(); ctx.globalAlpha = ra; ctx.setLineDash([3, 3]); ctx.strokeStyle = colors.t2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(Math.round(xh) + 0.5, PT - 6); ctx.lineTo(Math.round(xh) + 0.5, PB); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = colors.t2; ctx.font = '500 11px ' + ff; ctx.textBaseline = 'bottom'; ctx.textAlign = 'right'; ctx.fillText('Recibido', xh - 6, PT - 8); ctx.textAlign = 'left'; ctx.fillText('Estimado', xh + 6, PT - 8); ctx.restore();
      }
    }
    function frame() {
      cancelAnimationFrame(rid); clearTimeout(tid); pend = false; if (getDead()) return; var now = performance.now();
      if (!sized) size(); if (sized && !colors) readColors();
      var more = step(now); if (started && !revDone) { if (reduce() || now - revT0 >= 520 + N * 28 + 60) revDone = true; else more = true; }
      draw(now); if (more) schedule();
    }
    function schedule() { if (pend || getDead()) return; pend = true; rid = requestAnimationFrame(frame); tid = setTimeout(frame, 50); }
    function idxAt(e) { var r = stage.getBoundingClientRect(), x = e.clientX - r.left; return x < 0 || x > W - RT ? -1 : clamp(Math.floor(x / ((W - RT) / N)), 0, N - 1); }
    function report() { onSel(sel(), geom(sel())); }
    function geom(i) { if (i < 0) return null; var sw = (W - RT) / N, PB = H - BT, ph = PB - PT; return { x: i * sw + sw / 2, y: PB - (tR[i] + tP[i]) / tHi * ph, sw: sw, W: W }; }
    stage.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; hIdx = idxAt(e); kIdx = -1; report(); schedule(); });
    stage.addEventListener('pointerdown', function (e) { var i = idxAt(e); if (e.pointerType === 'touch') { pinned = i === pinned ? -1 : i; hIdx = -1; } else { hIdx = i; } kIdx = -1; report(); schedule(); });
    stage.addEventListener('pointerleave', function (e) { if (e.pointerType === 'touch') return; hIdx = -1; report(); schedule(); });
    stage.addEventListener('blur', function () { kIdx = -1; report(); schedule(); });
    stage.addEventListener('keydown', function (e) {
      var c = kIdx >= 0 ? kIdx : N / 2 - 1, n = c;
      if (e.key === 'ArrowLeft') n = kIdx < 0 ? c : c - 1; else if (e.key === 'ArrowRight') n = kIdx < 0 ? c : c + 1; else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = N - 1; else if (e.key === 'Escape') { kIdx = -1; hIdx = -1; pinned = -1; report(); schedule(); return; } else return;
      e.preventDefault(); kIdx = clamp(n, 0, N - 1); hIdx = -1; pinned = -1; report(); schedule();
    });
    target(); cR.set(tR); cP.set(tP); cHi = tHi;
    return {
      setMode: setMode, size: function () { size(); schedule(); }, schedule: schedule, theme: function () { colors = null; schedule(); },
      start: function () { if (started) return; started = true; revT0 = performance.now(); if (reduce()) revDone = true; schedule(); }, stop: function () { cancelAnimationFrame(rid); clearTimeout(tid); },
      clear: function () { hIdx = -1; kIdx = -1; pinned = -1; report(); schedule(); }, geom: geom
    };
  }

  /* ============================== render ============================== */
  function render(mount, portfolio, T) {
    var off = [], dead = false, getDead = function () { return dead; };
    var pf = portfolio === 'todos' || (portfolio && portfolio.cons) ? 'todos' : (typeof portfolio === 'string' ? T.get(portfolio) : portfolio);
    function destroy() { if (dead) return; dead = true; off.forEach(function (f) { try { f(); } catch (e) { } }); off = []; if (mount) mount.innerHTML = ''; }
    var api = { destroy: destroy };
    if (!pf) { mount.innerHTML = '<div class="pdv"><div class="pdv-empty panel"><h2>Este portafolio aún no tiene historial</h2><p>Cuando agregues posiciones, aquí verás los dividendos que cobras y los que se esperan.</p></div></div>'; return api; }
    var P = prep(pf), d = P.d, tot = d.totals, bins = P.bins, asOf = P.asOf, id = 'pdv' + (++uid), A = M.A || {};
    var foot = '<p class="pdv-foot">Informativo · no es asesoría de inversión</p>';
    var $ = function (s, r) { return (r || mount).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || mount).querySelectorAll(s)); };

    /* ---------- estado vacío ---------- */
    if (P.empty) {
      var others = [];
      (T && T.portfolios ? T.portfolios : []).forEach(function (p) {
        if (pf !== 'todos' && p.id === pf.id) return;
        var dd; try { dd = M.dividends(p); } catch (e) { return; }
        dd.perAsset.forEach(function (a) { if (a.projected > 0 || a.ttm > 0) others.push({ a: a, pf: p.name }); });
      });
      others.sort(function (x, y) { return y.a.projected - x.a.projected; }); others = others.slice(0, 8);
      var oh = others.length ? '<h3 class="pdv-eh">Posiciones de tus otros portafolios que sí pagan</h3><ul class="pdv-el" role="list">' + others.map(function (o, k) {
        return '<li class="pdv-er" style="--i:' + k + '"><span class="pdv-ca">' + mark(o.a.ticker) + '<span class="pdv-cn"><strong>' + esc(o.a.ticker) + '</strong><span>' + esc(o.a.name) + ' · en ' + esc(o.pf) + '</span></span></span><span class="pdv-pm"><b class="num">' + fM(o.a.projected) + '</b><span class="num">' + fPc(o.a.yield * 100, 1) + ' al año</span></span></li>';
      }).join('') + '</ul><p class="pdv-note">Estimado a 12 meses con tus títulos de hoy. Para verlos con detalle, abre ese portafolio o el consolidado “Todos”.</p>' : '';
      mount.innerHTML = '<div class="pdv"><section class="pdv-s panel pdv-empty" aria-labelledby="' + id + 'e"><h2 id="' + id + 'e">Este portafolio no paga dividendos</h2>' +
        '<p>Un dividendo es la parte de las utilidades que una empresa reparte en efectivo a sus accionistas, casi siempre cada trimestre. Aquí no hay posiciones que lo hagan: criptomonedas, metales y efectivo ganan o pierden solo por el cambio de precio o de tasa.</p>' + oh + '</section>' + foot + '</div>';
      if (mount.animate && !reduce()) mount.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EXPO });
      if (!reduce()) $$('.pdv-er').forEach(function (n, i) { if (n.animate) n.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: 120 + i * 35, easing: OUT, fill: 'backwards' }); });
      return api;
    }

    /* ---------- renglón KPI ---------- */
    var whAmt = tot.ttm - tot.ttmNet, whPct = tot.ttm ? whAmt / tot.ttm * 100 : 0, wMx = fN((A.divWhMx != null ? A.divWhMx : 0.1) * 100, 0), wUs = fN((A.divWhUs != null ? A.divWhUs : 0.1) * 100, 0);
    var K = [
      { id: 'rec', name: 'Recibido en 12 meses', v: tot.ttm, f: fM, sub: 'Neto ' + fM(tot.ttmNet) + ' · ' + d.received.length + ' pagos',
        def: 'Suma de los dividendos que cobraste del ' + dTxt(P.from) + ' al ' + dTxt(asOf) + ', antes de retención (bruto). El neto es lo que llega a tu cuenta después de la retención estimada. Cada pago se convierte a pesos con el tipo de cambio de su fecha.' },
      { id: 'pro', name: 'Proyectado a 12 meses', v: tot.projected, f: fM, sub: 'Neto ' + fM(tot.projectedNet) + ' · estimado',
        def: 'Lo que cobrarías hasta el ' + dTxt(isoAdd(asOf, 365)) + ' si cada empresa repite ' + (window.CAMPO_REAL ? 'lo que te pagó en los últimos 12 meses.' : 'su dividendo trimestral vigente.') + ' Se calcula con los títulos que tienes hoy y el tipo de cambio de hoy. Es una estimación: las empresas pueden subir, recortar o suspender el dividendo.' },
      { id: 'yld', name: 'Rendimiento por dividendo', v: tot.yield * 100, f: function (v) { return fPc(v, 2); }, sub: 'Solo posiciones que pagan: ' + fPc(P.yieldPayers * 100, 2),
        def: 'Dividendo proyectado a 12 meses ÷ valor actual del portafolio (incluye efectivo y las posiciones que no pagan). En la tabla de abajo, el rendimiento de cada activo se mide sobre su propio valor de mercado.' },
      { id: 'yoc', name: 'Rendimiento sobre costo', v: tot.yoc * 100, f: function (v) { return fPc(v, 2); }, sub: 'Sobre lo que pagaste',
        def: 'Dividendo proyectado a 12 meses ÷ costo de adquisición de tus posiciones. Si compraste barato y la empresa sube su dividendo, este número crece aunque el precio no se mueva.' },
      { id: 'ret', name: 'Retención estimada', v: whAmt, f: fM, sub: fPc(whPct, 1) + ' del bruto · últimos 12 meses',
        def: 'Impuesto que se descuenta en origen: ' + wMx + ' % en dividendos de México y ' + wUs + ' % en EE. UU. con formato W-8BEN. Es un supuesto y no es tu ISR final: en tu declaración anual pueden cambiar el cálculo y los acreditamientos.' }
    ];
    var ledHTML = '<div class="pdv-led panel-less" data-led>' + K.map(function (k, n) {
      return '<article class="pdv-k" data-k="' + n + '"><div class="pdv-kh"><h3 class="pdv-kn">' + esc(k.name) + '</h3><button type="button" class="pdv-i" aria-expanded="false" aria-controls="' + id + '-def" data-i="' + n + '" aria-label="Qué significa: ' + esc(k.name) + '">' + ICON_I + '</button></div>' +
        '<p class="pdv-kv num" data-kv></p><p class="pdv-ks">' + k.sub + '</p></article>';
    }).join('') + '</div><div class="pdv-def" id="' + id + '-def" role="region" aria-label="Definición de la cifra" data-def><div class="pdv-defi"><p data-deft></p></div></div>';

    /* ---------- barras mensuales ---------- */
    var dayN = +asOf.slice(8), dim = new Date(+asOf.slice(0, 4), +asOf.slice(5, 7), 0).getDate(), todayF = clamp(dayN / dim, 0, 1);
    var chHTML = '<section class="pdv-s panel pdv-ch" aria-labelledby="' + id + 'h2"><div class="pdv-ctop"><div class="pdv-ct"><h2 id="' + id + 'h2">Dividendos por mes</h2><span class="muted">12 meses recibidos y 12 estimados</span></div>' +
      '<div class="seg pdv-sg" role="group" aria-label="Tipo de monto" style="--n:2;--i:0" data-sg><span class="seg-pill" aria-hidden="true"></span><button type="button" data-n="0" aria-pressed="true">Bruto</button><button type="button" data-n="1" aria-pressed="false">Neto</button></div></div>' +
      '<ul class="pdv-key" aria-hidden="true"><li><i class="pdv-sw1"></i>Recibido</li><li><i class="pdv-sw2"></i>Estimado</li><li><i class="pdv-sw3"></i>Hoy, ' + esc(dTxt(asOf, true)) + '</li></ul>' +
      '<div class="pdv-sw"><div class="pdv-stage" tabindex="0" role="group" aria-labelledby="' + id + 'h2" aria-describedby="' + id + 'sr" data-stage><canvas aria-hidden="true"></canvas></div><div class="pdv-tip" role="status" data-tip hidden></div></div>' +
      '<p class="pdv-sr" id="' + id + 'sr" aria-live="polite" data-sr>Con las flechas izquierda y derecha lees cada mes.</p>' +
      '<p class="pdv-note">Las barras con trama son estimadas: suponen que cada empresa repite su dividendo trimestral actual.</p></section>';

    /* ---------- próximos pagos ---------- */
    var proj = d.projected, SHOW = 6;
    function payRow(p, k) {
      var day = +p.date.slice(8), mi = +p.date.slice(5, 7) - 1, days = Math.round((isoMs(p.date) - isoMs(asOf)) / 864e5), rel = days <= 0 ? 'hoy' : days === 1 ? 'mañana' : 'en ' + days + ' días';
      return '<li class="pdv-pr" style="--i:' + k + '"><div class="pdv-dt" aria-hidden="true"><b class="num">' + day + '</b><span>' + MESC[mi] + '</span></div>' +
        '<div class="pdv-ca">' + mark(p.ticker) + '<span class="pdv-cn"><span class="pdv-t1"><strong>' + esc(p.ticker) + '</strong><i class="pdv-est">estimado</i></span><span>' + esc(p.name) + ' · ' + titulos(p.qty) + ' × ' + dpsTxt(p) + '</span></span></div>' +
        '<div class="pdv-pm"><b class="num">' + fM(p.gross) + '</b><span class="num">neto ' + fM(p.net) + '</span></div>' +
        '<time class="pdv-sr" datetime="' + p.date + '">' + dTxt(p.date) + ', ' + rel + '</time></li>';
    }
    var calHTML = '<section class="pdv-s panel" aria-labelledby="' + id + 'h3"><div class="panel-head"><h2 id="' + id + 'h3">Próximos pagos</h2><span class="muted">' + proj.length + ' estimados · 12 meses</span></div>' +
      (proj.length ? '<ul class="pdv-pl" role="list" data-pl>' + proj.slice(0, SHOW).map(payRow).join('') + '</ul>' +
        (proj.length > SHOW ? coHTML(id + '-more', '<ul class="pdv-pl pdv-pl2" role="list">' + proj.slice(SHOW).map(function (p, k) { return payRow(p, k); }).join('') + '</ul>') + tgHTML(id + '-more', 'Ver los ' + (proj.length - SHOW) + ' pagos restantes', 'Ocultar los pagos restantes') : '') :
        '<p class="pdv-note">No hay pagos estimados: ninguna posición actual reparte dividendos.</p>') + '</section>';

    /* ---------- por activo ---------- */
    var perA = d.perAsset, sumTtm = 0, sumPj = 0, sumMv = 0, sumCost = 0, sumPay = 0; perA.forEach(function (a) { sumTtm += a.ttm; sumPj += a.projected; sumMv += a.mv; sumCost += a.cost; sumPay += a.payments; });
    var shareBase = sumPj || sumTtm || 1;
    var assetHTML = '<section class="pdv-s panel" aria-labelledby="' + id + 'h4"><div class="panel-head"><h2 id="' + id + 'h4">Por activo</h2><span class="muted">Quién genera tu ingreso</span></div>' +
      '<div class="pdv-tw" tabindex="0" role="region" aria-label="Tabla de dividendos por activo, desplazable"><table class="pdv-tb"><thead><tr><th scope="col">Activo</th><th scope="col">12 meses</th><th scope="col">Proyectado</th><th scope="col">Rendimiento</th><th scope="col">Sobre costo</th><th scope="col">Pagos al año</th></tr></thead><tbody>' +
      perA.map(function (a, k) {
        var sh = (sumPj ? a.projected : a.ttm) / shareBase;
        return '<tr style="--i:' + k + '"><th scope="row"><span class="pdv-ca">' + mark(a.ticker) + '<span class="pdv-cn"><strong>' + esc(a.ticker) + '</strong><span>' + esc(a.name) + '</span></span></span><span class="pdv-sbt" title="' + fN(sh * 100, 0) + ' % de tu ingreso por dividendos"><i class="pdv-sb" style="width:' + (sh * 100).toFixed(1) + '%"></i></span></th>' +
          '<td class="num">' + fM(a.ttm) + '</td><td class="num"><b>' + fM(a.projected) + '</b><span class="pdv-an">' + fN(sh * 100, 0) + ' % del total</span></td><td class="num">' + fPc(a.yield * 100, 2) + '</td><td class="num">' + fPc(a.yoc * 100, 2) + '</td><td class="num">' + a.payments + '</td></tr>';
      }).join('') +
      '</tbody><tfoot><tr><th scope="row">Total de las que pagan</th><td class="num">' + fM(sumTtm) + '</td><td class="num">' + fM(sumPj) + '</td><td class="num">' + fPc(sumMv ? sumPj / sumMv * 100 : 0, 2) + '</td><td class="num">' + fPc(sumCost ? sumPj / sumCost * 100 : 0, 2) + '</td><td class="num">' + sumPay + '</td></tr></tfoot></table></div>' +
      '<p class="pdv-note">Rendimiento = proyectado ÷ valor de la posición. Sobre costo = proyectado ÷ lo que pagaste. Pagos al año = pagos estimados en los próximos 12 meses.</p></section>';

    /* ---------- historial ---------- */
    var recs = d.received.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    var hisHTML = '<section class="pdv-s panel" aria-labelledby="' + id + 'h5"><div class="panel-head"><h2 id="' + id + 'h5">Historial de pagos recibidos</h2><span class="muted">' + recs.length + ' pagos · ' + fM(tot.allTime) + ' brutos</span></div>' +
      tgHTML(id + '-his', 'Mostrar el historial', 'Ocultar el historial') +
      coHTML(id + '-his', '<div class="pdv-tw" tabindex="0" role="region" aria-label="Historial de dividendos, desplazable"><table class="pdv-tb pdv-tb2"><thead><tr><th scope="col">Fecha</th><th scope="col">Activo</th><th scope="col">Títulos</th><th scope="col">Por acción</th><th scope="col">Bruto</th><th scope="col">Retención</th><th scope="col">Neto</th></tr></thead><tbody>' +
        recs.map(function (r) {
          return '<tr><th scope="row"><span class="num">' + dTxt(r.date) + '</span></th><td><span class="pdv-ca">' + mark(r.ticker) + '<strong>' + esc(r.ticker) + '</strong></span></td><td class="num">' + fN(r.qty, r.qty % 1 ? 4 : 0) + '</td><td class="num">' + dpsTxt(r) + (r.ccy === 'USD' && r.fx ? '<span class="pdv-an">TC ' + fN(r.fx, 2) + '</span>' : '') + '</td><td class="num">' + fM(r.gross) + '</td><td class="num">' + fM(r.withholding) + '</td><td class="num"><b>' + fM(r.net) + '</b></td></tr>';
        }).join('') + '</tbody></table></div>') + '</section>';

    mount.innerHTML = '<div class="pdv" id="' + id + '">' + ledHTML + chHTML + '<div class="pdv-cols">' + calHTML + assetHTML + '</div>' + hisHTML +
      '<p class="pdv-foot">Informativo · no es asesoría de inversión<br>Las fechas y los montos futuros son estimaciones a partir de ' + (window.CAMPO_REAL ? 'los dividendos que cobraste en los últimos 12 meses' : 'el dividendo trimestral vigente') + ', tus títulos de hoy y el tipo de cambio de hoy.</p></div>';

    /* ---------- rodar cifras ---------- */
    var rollId = 0;
    function roll(el, from, to, fmt, dur, delay) {
      var my = ++rollId; el._r = my;
      if (reduce() || from === to || dur <= 0) { el.textContent = fmt(to); return; }
      var t0 = performance.now() + (delay || 0); el.textContent = fmt(from);
      every(function () {
        if (dead || el._r !== my) return false;
        var k = (performance.now() - t0) / dur; if (k < 0) return true;
        var e = 1 - Math.pow(1 - clamp(k, 0, 1), 3); el.textContent = fmt(from + (to - from) * e); if (k >= 1) { el.textContent = fmt(to); return false; }
      });
    }
    $$('[data-kv]').forEach(function (el, n) { el.textContent = K[n].f(K[n].v); });

    /* ---------- definición de cada cifra ---------- */
    var defEl = $('[data-def]'), defT = $('[data-deft]'), defOn = -1, ibtns = $$('.pdv-i');
    $('[data-led]').addEventListener('click', function (e) {
      var b = e.target.closest('.pdv-i'); if (!b) return; var n = +b.dataset.i;
      ibtns.forEach(function (x) { x.setAttribute('aria-expanded', 'false'); });
      if (defOn === n) { defOn = -1; defEl.removeAttribute('data-open'); return; }
      var was = defOn >= 0; defOn = n; b.setAttribute('aria-expanded', 'true'); defT.innerHTML = '<b>' + esc(K[n].name) + '.</b> ' + esc(K[n].def); defEl.setAttribute('data-open', '');
      if (was && !reduce() && defT.animate) defT.animate([{ opacity: 0, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: OUT });
    });

    /* ---------- colapsables ---------- */
    mount.addEventListener('click', function (e) {
      var b = e.target.closest('.pdv-tg'); if (!b) return; var co = doc.getElementById(b.dataset.for); if (!co) return;
      var open = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', String(open)); $('[data-tgt]', b).textContent = open ? b.dataset.o : b.dataset.c;
      if (open) { co.setAttribute('data-open', ''); if (!reduce()) $$('.pdv-pr, tbody tr', co).slice(0, 12).forEach(function (n, i) { if (n.animate) n.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 60 + i * 30, easing: OUT, fill: 'backwards' }); }); } else co.removeAttribute('data-open');
    });

    /* ---------- gráfica ---------- */
    var stageEl = $('[data-stage]'), tipEl = $('[data-tip]'), srEl = $('[data-sr]'), segEl = $('[data-sg]');
    function tipHTML(b) {
      var h = '<strong>' + cap1(MESL[b.m]) + ' ' + b.y + (b.proj && !b.rec ? ' · estimado' : '') + '</strong>';
      if (!b.rec && !b.proj) return h + '<span class="pdv-tp">Sin pagos</span>';
      if (b.rec) h += '<span>Recibido <b class="num">' + fM(b.rec) + '</b> <i class="pdv-tp num">neto ' + fM(b.recN) + '</i></span>';
      if (b.proj) h += '<span>Estimado <b class="num">' + fM(b.proj) + '</b> <i class="pdv-tp num">neto ' + fM(b.projN) + '</i></span>';
      var by = {}, both = b.rec && b.proj; b.list.forEach(function (x) { var k = x.tk + (x.e ? '~' : ''); by[k] = by[k] || { tk: x.tk, g: 0, e: x.e }; by[k].g += x.g; });
      var arr = Object.keys(by).map(function (k) { return by[k]; }).sort(function (x, y) { return y.g - x.g; });
      h += '<span class="pdv-tl">' + arr.slice(0, 4).map(function (x) { return '<span class="pdv-tr"><span>' + esc(x.tk) + (both && x.e ? ' est.' : '') + '</span><b class="num">' + fM(x.g) + '</b></span>'; }).join('') + (arr.length > 4 ? '<span class="pdv-tp">y ' + (arr.length - 4) + ' más</span>' : '') + '</span>';
      return h;
    }
    function srOf(b) {
      if (!b.rec && !b.proj) return cap1(MESL[b.m]) + ' ' + b.y + ': sin pagos.';
      return cap1(MESL[b.m]) + ' ' + b.y + ': ' + (b.rec ? 'recibido ' + fM(b.rec) + ' brutos, ' + fM(b.recN) + ' netos. ' : '') + (b.proj ? 'Estimado ' + fM(b.proj) + ' brutos, ' + fM(b.projN) + ' netos.' : '');
    }
    var chart = Chart(stageEl, bins, todayF, getDead, function (i, g) {
      if (i < 0 || !g) { tipEl.hidden = true; srEl.textContent = ''; return; }
      var b = bins[i]; tipEl.innerHTML = tipHTML(b); tipEl.hidden = false; srEl.textContent = srOf(b);
      var tw = tipEl.offsetWidth, th = tipEl.offsetHeight, x = g.x - tw / 2, y = g.y - th - 10;
      if (y < 2) { y = 2; x = g.x + g.sw / 2 + 8 + tw <= g.W ? g.x + g.sw / 2 + 8 : g.x - g.sw / 2 - 8 - tw; }
      tipEl.style.transform = 'translate(' + Math.round(clamp(x, 0, Math.max(0, g.W - tw))) + 'px,' + Math.round(y) + 'px)';
    });
    segEl.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-n]'); if (!b) return; var n = +b.dataset.n; if (b.getAttribute('aria-pressed') === 'true') return;
      $$('button', segEl).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); segEl.style.setProperty('--i', n);
      chart.setMode(n === 1, true);
    });
    var onDoc = function (e) { if (!stageEl.parentNode.contains(e.target)) chart.clear(); }; doc.addEventListener('pointerdown', onDoc); off.push(function () { doc.removeEventListener('pointerdown', onDoc); });

    /* ---------- primera vista ---------- */
    var started = false;
    function visible() { return mount.offsetWidth > 0 && mount.offsetHeight > 0; }
    function start() {
      if (started || dead) return; started = true;
      if (!reduce()) {
        $$('.pdv > .pdv-s, .pdv > .pdv-led, .pdv > .pdv-cols > .pdv-s, .pdv > .pdv-foot').forEach(function (s, i) { if (s.animate) s.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: i * 40, easing: EXPO, fill: 'backwards' }); });
        $$('[data-kv]').forEach(function (el, n) { roll(el, 0, K[n].v, K[n].f, 700, 140 + n * 40); });
        $$('.pdv-pl:not(.pdv-pl2) .pdv-pr').forEach(function (n, i) { if (n.animate) n.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: 260 + i * 35, easing: OUT, fill: 'backwards' }); });
        $$('.pdv-tb:not(.pdv-tb2) tbody tr').forEach(function (n, i) { if (n.animate) n.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: 300 + i * 35, easing: OUT, fill: 'backwards' }); });
        $$('.pdv-sb').forEach(function (n, i) { if (n.animate) n.animate([{ transform: 'scaleX(0)' }, { transform: 'none' }], { duration: 520, delay: 380 + i * 40, easing: EXPO, fill: 'backwards' }); });
      }
      chart.start();
    }
    if (mount.animate && !reduce()) mount.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EXPO });
    if (window.ResizeObserver) { var ro = new ResizeObserver(function () { chart.size(); if (!started && visible()) start(); }); ro.observe(stageEl); ro.observe(mount); off.push(function () { ro.disconnect(); }); }
    var resz = function () { chart.size(); }; window.addEventListener('resize', resz); off.push(function () { window.removeEventListener('resize', resz); });
    var mob = new MutationObserver(function () { chart.theme(); }); mob.observe(root, { attributes: true, attributeFilter: ['data-theme'] }); off.push(function () { mob.disconnect(); });
    var onRm = function () { chart.schedule(); }; if (rmq.addEventListener) { rmq.addEventListener('change', onRm); off.push(function () { rmq.removeEventListener('change', onRm); }); }
    off.push(function () { chart.stop(); });
    chart.size(); if (visible()) start(); else setTimeout(function () { chart.size(); if (!started && visible()) start(); }, 0);
    api.data = P;
    return api;
  }

  window.CampoPfDiv = { render: render, calc: { prep: prep } };
})();
