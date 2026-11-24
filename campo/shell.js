/* Portify · app Campo · cascarón (sustituye a la parte "app" de _dev_proto-campo.js; la landing y el acceso viven en sus páginas).
   Tema, contadores, registro de indicadores del Inicio, botones del menú lateral que aún no llegan, cerrar sesión y
   window.__campo (lo usa Ajustes). Datos: window.PORTIFY_DEMO ya armado con datos reales por campo/datos.js. */
(function () {
  'use strict';
  var D = window.PORTIFY_DEMO; if (!D) return;
  var F = D.fmt, doc = document, html = doc.documentElement;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var rmq = matchMedia('(prefers-reduced-motion: reduce)'), reduce = function () { return rmq.matches; };
  var mxn0 = function (v) { return F.mxn(v, 0); };
  var smxn = function (v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + F.mxn(Math.abs(v), 0); };

  /* ================= ticker y resortes (los mismos del prototipo) ================= */
  var ticks = new Set(), raf = 0, lastT = 0;
  function loop(now) {
    raf = 0; var dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
    Array.from(ticks).forEach(function (f) { if (f(now, dt) === false) ticks.delete(f); });
    if (ticks.size) raf = requestAnimationFrame(loop);
  }
  function addTick(f) { ticks.add(f); if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(loop); } }
  function stepSpring(s, dt, k, c) {
    var n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
    for (var i = 0; i < n; i++) { var a = -k * (s.v - s.t) - c * s.vel; s.vel += a * h; s.v += s.vel * h; }
  }
  function count(el, to, fmt, opt) {
    opt = opt || {};
    if (!el._sp) el._sp = { v: opt.from != null ? opt.from : to, t: to, vel: 0 };
    var s = el._sp; s.t = to; el._fmt = fmt;
    if (opt.instant || reduce()) { s.v = to; s.vel = 0; el.textContent = fmt(to); return; }
    if (el._run) return; el._run = true;
    el.textContent = fmt(s.v);
    addTick(function (now, dt) {
      stepSpring(s, dt, 170, 27);
      var tol = Math.max(Math.abs(s.t), 1) * 1e-5;
      if (Math.abs(s.v - s.t) < tol && Math.abs(s.vel) < tol * 8) { s.v = s.t; el.textContent = el._fmt(s.t); el._run = false; return false; }
      el.textContent = el._fmt(s.v); return true;
    });
  }
  function delta(el, v, text) {
    el.className = 'delta ' + (v > 0 ? 'gain' : v < 0 ? 'loss' : 'flat');
    el.innerHTML = '<i class="arw" aria-hidden="true">' + (v > 0 ? '▲' : v < 0 ? '▼' : '▪') + '</i><span>' + text + '</span>';
  }

  /* ================= tema: la misma preferencia que el resto del sitio ================= */
  var repaints = [];
  function setTheme(t) {
    t = t === 'light' ? 'light' : 'dark';
    html.dataset.theme = t;
    try { localStorage.setItem('bp-theme', t); localStorage.setItem('blackportfolio-theme', t); } catch (e) { }
    repaints.forEach(function (f) { try { f(); } catch (e) { } });
  }

  /* ================= registro de indicadores del Inicio ================= */
  var S = D.series, LAST = S.dates.length - 1;
  function fdate(s) { return new Date(s + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', ''); }
  /* contra el S&P desde que hay dinero en la cartera: antes de eso el índice del portafolio está plano y la comparación mentiría */
  function vsBench() {
    var st = 0, T = window.CampoTracker;
    if (T && T.total && T.total.series) { var v = T.total.series; while (st < LAST && !(v[st] > 0)) st++; }
    var p = S.portfolio, b = S.benchmark;
    var pr = p[st] > 0 ? (p[LAST] / p[st] - 1) * 100 : 0, br = b[st] > 0 ? (b[LAST] / b[st] - 1) * 100 : 0;
    return { st: st, pr: pr, br: br, vs: pr - br };
  }
  var ledger = $('#ledger');
  function paintLedger() {
    var vb = vsBench();
    ledger.innerHTML = [
      ['Valor total', 'lgTotal', '<span>Aportado neto ' + mxn0(D.invested != null ? D.invested : D.cost) + '</span>'],
      ['Ganancia total', 'lgPnl', '<span class="delta" data-id="lgPnlD"></span>'],
      ['Cambio del día', 'lgDay', '<span class="delta" data-id="lgDayD"></span>'],
      [vb.st > 0 ? 'Contra S&P 500, desde el ' + fdate(S.dates[vb.st]) : 'Contra S&P 500, 1 año', 'lgVs', '<span>Portafolio ' + F.pct(vb.pr) + '</span>']
    ].map(function (r) { return '<div class="lg-cell"><span class="lg-k">' + r[0] + '</span><b class="lg-v num" id="' + r[1] + '">–</b><span class="lg-d">' + r[2] + '</span></div>'; }).join('');
    return vb;
  }
  function runKpis(instant) {
    var vb = paintLedger();
    count($('#lgTotal'), D.total, mxn0, { from: 0, instant: instant });
    count($('#lgPnl'), D.pnl, smxn, { from: 0, instant: instant }); delta($('[data-id="lgPnlD"]'), D.pnl, F.pct(D.pnlPct));
    count($('#lgDay'), D.dayChange, smxn, { from: 0, instant: instant }); delta($('[data-id="lgDayD"]'), D.dayChange, F.pct(D.dayChangePct));
    count($('#lgVs'), vb.vs, function (v) { return F.pct(v).replace(' %', ' pts'); }, { from: 0, instant: instant });
    $('#lgPnl').className = 'lg-v num'; $('#lgDay').className = 'lg-v num';
  }
  if (ledger) { ledger.classList.add('skel-host'); paintLedger(); ledger.style.position = 'relative'; }

  /* el libro del Tracker cambia (no en esta versión de solo lectura, pero el contrato lo permite): vuelve a contar */
  if (window.CampoTracker && window.CampoTracker.on) window.CampoTracker.on('change', function (e) { if (e && e.type === 'tx') runKpis(true); });

  /* ================= fecha de los datos y cuenta ================= */
  $$('[data-asof]').forEach(function (e) { e.textContent = D.asOf; });
  var who = $('#whoBtn');
  if (who && D.user) { who.textContent = D.user.email || D.user.name || 'Tu cuenta'; who.setAttribute('aria-label', 'Abrir Ajustes de la cuenta ' + (D.user.email || '')); }

  /* ================= avisos y botones del menú ================= */
  var toastT = 0;
  function toast(msg) { var t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 3200); }
  $$('[data-soon]').forEach(function (b) { b.addEventListener('click', function () { toast(b.dataset.soon || 'Esta sección sigue en la versión anterior de la app.'); }); });
  var out = $('#logout');
  if (out) out.addEventListener('click', function () {
    out.disabled = true;
    var A = window.BlackPortfolioAuth;
    try { A.stopSessionTimeout(); } catch (e) { }
    Promise.resolve(A && A.clearSession ? A.clearSession() : null).catch(function () { }).then(function () { location.href = 'login.html'; });
  });

  /* ================= moneda en la que se ven las cifras ================= */
  /* id: un portafolio, o 'todos'/null para el consolidado (Inicio, lista del Tracker, "Todos") */
  function ccySeg(host, id) {
    var T = window.CampoTracker; if (!host || !T || !T.currencies) return;
    var list = T.currencies(); if (list.length < 2) { host.hidden = true; return; }
    host.classList.add('seg', 'ccy-seg'); host.setAttribute('role', 'group'); host.setAttribute('aria-label', 'Moneda en la que ves las cifras');
    host.innerHTML = list.map(function (c) { return '<button type="button" data-v="' + c + '" aria-pressed="false">' + c + '</button>'; }).join('') + '<i class="seg-pill" aria-hidden="true"></i>';
    host.style.setProperty('--n', list.length);
    function paint() { var cur = id && id !== 'todos' ? T.viewCcy(id) : T.consolidatedCcy(); $$('button', host).forEach(function (b, i) { var on = b.dataset.v === cur; b.setAttribute('aria-pressed', String(on)); if (on) host.style.setProperty('--i', i); }); }
    host.addEventListener('click', function (e) { var b = e.target.closest('button[data-v]'); if (!b) return; T.setViewCcy(id || 'todos', b.dataset.v); paint(); });
    paint(); host._paint = paint;
  }
  function paintBase() {
    var T = window.CampoTracker, c = T && T.consolidatedCcy ? T.consolidatedCcy() : (D.base || 'MXN');
    $$('[data-base]').forEach(function (e) { e.textContent = c; });
    $$('.ccy-seg').forEach(function (h) { if (h._paint) h._paint(); });
  }
  ccySeg($('#homeCcy'), 'todos'); ccySeg($('#tkCcy'), 'todos'); paintBase();
  /* el consolidado cambió de moneda: cifras del registro y widgets del Inicio otra vez, en la nueva moneda */
  doc.addEventListener('campo:inicio', function () {
    paintBase(); runKpis(true);
    try { if (window.CampoHub && window.CampoHub.refresh) window.CampoHub.refresh(); } catch (e) { if (window.console) console.error(e); }
  });

  /* ================= entrada: el tablero cubre hasta que TODO está pintado ================= */
  var app = $('#view-app');
  function reveal() { try { if (window.CampoGate && window.CampoGate.reveal) window.CampoGate.reveal(); } catch (e) { } }
  doc.addEventListener('campo:ready', function () {
    /* la vista "app" se activa cuando YA están registrados todos los widgets y secciones: el Inicio y el enrutador
       reaccionan a este cambio (si se activara antes, el escritorio guardaría un preajuste vacío) */
    doc.body.dataset.view = 'app';
    app.dataset.loading = 'false'; paintLedger();
    /* dos cuadros para que el Inicio termine de acomodarse, y entonces el tablero gira de salida y las cifras cuentan */
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      setTimeout(function () { reveal(); setTimeout(function () { runKpis(false); }, reduce() ? 0 : 380); }, reduce() ? 0 : 120);
    }); });
  });

  window.__campo = {
    go: function () { /* la app ya es la vista; landing y acceso son páginas aparte */ },
    setTheme: setTheme, repaints: repaints, toast: toast, ccySeg: ccySeg, reveal: reveal
  };
})();
