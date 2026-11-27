/* Campo · Ajustes (sección de la app, producción). Se carga después de datos.js y shell.js.
   Fase de solo lectura: presenta tu cuenta, plan y límites reales (D.user, D.plans, CampoTracker) y no simula ninguna acción.
   Lo que cambia datos sensibles (contraseña, verificación en dos pasos, facturación, exportar o eliminar datos) se hace en la versión anterior (main-clasico.html).
   Preferencias reales y locales: tema (window.__campo.setTheme; clave campo-theme-pref), color del avatar (campo-tint) y restablecer el Inicio (window.__hub.reset).
   Router de secciones (#inicio, #tracker, #mercados[/<símbolo>], #informes, #ajustes/<cat>) intacto; expone window.CampoSections y window.__settings = { open(cat), cats() }. */
(function () {
  'use strict';
  var D = window.PORTIFY_DEMO, CP = window.__campo;
  var doc = document, root = doc.documentElement;
  var set = doc.getElementById('secSettings'), home = doc.getElementById('secHome'), trk = doc.getElementById('secTracker');
  if (!D || !set || !home) return;
  if (!trk) { trk = doc.createElement('div'); trk.id = 'secTracker'; trk.hidden = true; set.parentNode.insertBefore(trk, set); }
  var inf = doc.getElementById('secInformes'); if (!inf) { inf = doc.createElement('div'); inf.id = 'secInformes'; inf.hidden = true; set.parentNode.insertBefore(inf, set); }
  var mer = doc.getElementById('secMercados'); if (!mer) { mer = doc.createElement('div'); mer.id = 'secMercados'; mer.hidden = true; set.parentNode.insertBefore(mer, set); }
  var els = { inicio: home, tracker: trk, mercados: mer, informes: inf, ajustes: set };

  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var rmq = matchMedia('(prefers-reduced-motion: reduce)'), reduce = function () { return rmq.matches; };
  var EASE = 'cubic-bezier(0.23, 1, 0.32, 1)', EASE_IO = 'cubic-bezier(0.77, 0, 0.175, 1)';
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { } return null; }
  var nf0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }), nf2 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var fLong = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  var fShort = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });
  var fTrust = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });

  /* ================= iconos en línea ================= */
  var ICON = {
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    shield: '<path d="M12 3 5 6v5.5c0 4.2 2.8 7.4 7 9.5 4.2-2.1 7-5.3 7-9.5V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
    card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    bell: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20.5a2.2 2.2 0 0 0 4 0"/>',
    gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 17 4-5"/>',
    db: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
    chev: '<path d="m9 6 6 6-6 6"/>', back: '<path d="m15 6-6 6 6 6"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/>', trash: '<path d="M5 7h14M10 11v6M14 11v6M7 7l1 12h8l1-12M9.5 7V4.5h5V7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    down: '<path d="M12 4v11M7.5 11 12 15.5 16.5 11M5 20h14"/>', minus: '<path d="M6 12h12"/>'
  };
  function ic(n, c) { return '<svg class="ic' + (c ? ' ' + c : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + '</svg>'; }


  /* ================= estado ================= */
  var CATS = [
    { id: 'cuenta', label: 'Cuenta', sub: 'Correo, nombre y plan', icon: 'user' },
    { id: 'seguridad', label: 'Seguridad', sub: 'Dos pasos y sesión', icon: 'shield' },
    { id: 'plan', label: 'Plan y facturación', sub: 'Tu plan y sus límites', icon: 'card' },
    { id: 'preferencias', label: 'Preferencias', sub: 'Tema, moneda e inicio', icon: 'sliders' },
    { id: 'datos', label: 'Datos y privacidad', sub: 'Avisos legales y tus datos', icon: 'db' }
  ];
  var TINTS = [['Ocre', 'oklch(0.78 0.12 82)'], ['Verde azulado', 'oklch(0.74 0.09 195)'], ['Azul', 'oklch(0.72 0.11 250)'], ['Violeta', 'oklch(0.72 0.11 300)'], ['Rosa', 'oklch(0.74 0.11 10)'], ['Verde', 'oklch(0.76 0.12 150)']];
  var U = D.user || {}, EMAIL = U.email || '', CLASSIC = 'main-clasico.html';
  var S = {
    name: (U.name || '').trim(), tint: Math.min(5, Math.max(0, parseInt(ls('campo-tint'), 10) || 0)), lastCat: 'cuenta'
  };
  function planOf(n) { var k = String(n || '').toLowerCase(); return (D.plans || []).filter(function (p) { return p.name.toLowerCase() === k; })[0] || null; }
  function usage() {
    var list = (window.CampoTracker && window.CampoTracker.portfolios) || [], mx = 0;
    list.forEach(function (p) { var n = (p.positions || []).length; if (n > mx) mx = n; });
    return { portfolios: list.length, positions: mx };
  }

  /* ================= utilidades de interfaz ================= */
  var liveEl = doc.createElement('div'); liveEl.className = 'st-sr'; liveEl.setAttribute('role', 'status'); liveEl.setAttribute('aria-live', 'polite'); set.parentNode.appendChild(liveEl);
  function live(m) { liveEl.textContent = ''; setTimeout(function () { liveEl.textContent = m; }, 30); }
  var toastEl = doc.getElementById('toast'), toastT = 0;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2800); }
  function mk(sym, n) { return window.CampoMarks ? window.CampoMarks.svg(sym, n || 24) : '<span class="st-chip">' + esc(String(sym).charAt(0)) + '</span>'; }
  function busy(btn, on) { btn.classList.toggle('st-busy', on); btn.disabled = on; }
  function download(name, text, type) {
    var u = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' })), a = doc.createElement('a');
    a.href = u; a.download = name; doc.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 2000);
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise(function (ok, no) { var ta = doc.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; doc.body.appendChild(ta); ta.select(); try { doc.execCommand('copy') ? ok() : no(); } catch (e) { no(e); } ta.remove(); });
  }
  function fadeIn(el, dy) { if (!el || reduce() || !el.animate) return; el.animate([{ opacity: 0, transform: 'translateY(' + (dy == null ? 8 : dy) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EASE }); }

  /* segmentado con pastilla (mismo marcado que .seg de Campo) */
  function mkSeg(host, items, val, cb) {
    host.classList.add('seg');
    host.innerHTML = items.map(function (it) { return '<button type="button" data-v="' + esc(it.v) + '" aria-pressed="false">' + esc(it.l) + '</button>'; }).join('') + '<i class="seg-pill"></i>';
    host.style.setProperty('--n', items.length);
    var btns = $$('button', host);
    function setv(v, silent) { btns.forEach(function (b, i) { var on = b.dataset.v === v; b.setAttribute('aria-pressed', on); if (on) host.style.setProperty('--i', i); }); if (!silent && cb) cb(v); }
    btns.forEach(function (b) { b.addEventListener('click', function () { setv(b.dataset.v); }); });
    setv(val, true); return { set: setv };
  }
  function sw(id, on, labelledby) { return '<button type="button" role="switch" class="st-sw" id="' + id + '" data-act="sw" aria-checked="' + on + '" aria-labelledby="' + labelledby + '"><i></i></button>'; }

  /* ================= ventanas ================= */
  var modalN = 0;
  function openModal(o) {
    var opener = doc.activeElement, r = doc.createElement('div'); r.className = 'st-modal'; if (o.wide) r.setAttribute('data-wide', '');
    r.innerHTML = '<div class="st-mback"></div><div class="st-mpanel" role="dialog" aria-modal="true" aria-labelledby="stMT" tabindex="-1"><button class="icon-btn st-mx" type="button" aria-label="Cerrar" data-mclose>' + ic('x') + '</button><div class="st-mscroll"><h2 class="st-mt" id="stMT">' + o.title + '</h2><div class="st-mbody">' + o.html + '</div></div></div>';
    doc.body.appendChild(r); root.classList.add('st-lock'); modalN++;
    var panel = $('.st-mpanel', r), closed = false;
    function focusIn(sel) { var t = (sel && $(sel, panel)) || $('[data-autofocus]', panel) || panel; t.focus({ preventScroll: true }); }
    var api = {
      el: r, body: $('.st-mbody', r),
      close: function () {
        if (closed) return; closed = true; r.removeAttribute('data-open');
        setTimeout(function () { r.remove(); if (--modalN <= 0) { modalN = 0; root.classList.remove('st-lock'); } }, reduce() ? 0 : 200);
        if (opener && doc.contains(opener) && !o.noRestore) opener.focus({ preventScroll: true });
        if (o.onClose) o.onClose();
      },
      set: function (title, html, sel) { $('.st-mt', r).innerHTML = title; api.body.innerHTML = html; fadeIn(api.body, 0); focusIn(sel); }
    };
    r.addEventListener('click', function (e) { if (e.target.classList.contains('st-mback') || e.target.closest('[data-mclose]')) api.close(); });
    r.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); api.close(); return; }
      if (e.key !== 'Tab') return;
      var f = $$('button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]', panel).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) { e.preventDefault(); return; }
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && (doc.activeElement === a || doc.activeElement === panel)) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && doc.activeElement === z) { e.preventDefault(); a.focus(); }
    });
    focusIn(o.focus); requestAnimationFrame(function () { requestAnimationFrame(function () { r.setAttribute('data-open', ''); }); });
    return api;
  }

  /* ================= contenido por categoría ================= */
  function card(id, title, desc, inner, cls) { return '<section class="st-card' + (cls ? ' ' + cls : '') + '" aria-labelledby="' + id + '"><div class="st-card-h"><h3 id="' + id + '">' + title + '</h3>' + (desc ? '<p>' + desc + '</p>' : '') + '</div>' + inner + '</section>'; }
  function row(l, sub, r) { return '<div class="st-row"><div class="st-row-l"><b>' + l + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div><div class="st-row-r">' + r + '</div></div>'; }
  function ct(t) { return '<h2 class="st-ct" tabindex="-1">' + t + '</h2>'; }
  function backBtn() { return '<button class="btn btn-ghost btn-sm st-back" type="button" data-act="stBack">' + ic('back') + 'Ajustes</button>'; }
  function ini() { return (S.name || EMAIL.split('@')[0] || '').trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase() || '?'; }
  function cbtn(act, label, cls, extra) { return '<button type="button" class="btn ' + cls + '" data-act="' + act + '"' + (extra || '') + '><span class="lbl">' + label + '</span><i class="st-sp"></i></button>'; }
  function classicLink(label, cls) { return '<a class="btn ' + (cls || 'btn-secondary') + '" href="' + CLASSIC + '">' + label + '</a>'; }

  function use(l, n, max) {
    var lim = parseInt(max, 10);
    if (!isFinite(lim)) return '<div class="st-use"><div class="st-use-h"><span>' + l + '</span><span class="num"><b>' + nf0.format(n) + '</b> · sin límite en tu plan</span></div></div>';
    var p = Math.min(1, n / lim);
    return '<div class="st-use"><div class="st-use-h"><span>' + l + '</span><span class="num"><b>' + nf0.format(n) + '</b> de ' + nf0.format(lim) + '</span></div><div class="st-meter" role="meter" aria-label="' + l + '" aria-valuemin="0" aria-valuemax="' + lim + '" aria-valuenow="' + n + '" aria-valuetext="' + n + ' de ' + lim + '"' + (p > 0.9 ? ' data-hot' : '') + '><i style="--p:' + p + '"></i></div></div>';
  }

  function bCuenta() {
    var t = TINTS.map(function (x, i) { return '<button type="button" role="radio" class="st-tint" data-act="tint" data-i="' + i + '" aria-checked="' + (i === S.tint) + '" aria-label="' + x[0] + '" style="--t:' + x[1] + '"></button>'; }).join('');
    var P = planOf(U.plan), us = usage();
    return backBtn() + ct('Cuenta') +
      card('stH-perfil', 'Perfil', 'Así apareces dentro de Portify.',
        '<div class="st-prof"><div class="st-av-w"><button type="button" class="st-av" id="stAv" data-act="av" aria-haspopup="true" aria-expanded="false" aria-label="Cambiar el color del avatar" style="--t:' + TINTS[S.tint][1] + '"><span data-b="ini">' + esc(ini()) + '</span>' + (U.photo ? '<img src="' + esc(U.photo) + '" alt="" referrerpolicy="no-referrer" decoding="async">' : '') + '</button>' +
        '<div class="st-pop" id="stPop" role="radiogroup" aria-label="Color del avatar" hidden>' + t + '</div></div>' +
        '<div class="st-prof-f"><div class="st-fld"><span class="st-lab">Nombre</span><div class="st-mail"><span class="st-mailv">' + (S.name ? esc(S.name) : 'Sin nombre') + '</span></div></div>' +
        '<div class="st-fld"><span class="st-lab">Correo</span><div class="st-mail"><span class="st-mailv">' + esc(EMAIL) + '</span></div></div></div></div>') +
      card('stH-plan0', 'Plan y uso', 'Lo que tienes ahora frente a los límites de tu plan.',
        row('Plan actual', P ? 'Hasta ' + esc(String(P.portfolios)) + ' portafolios y ' + esc(String(P.positions)) + ' posiciones por portafolio.' : null, '<span class="st-chip" data-k="acc">' + esc(U.plan || 'Sin dato') + '</span>') +
        (P ? use('Portafolios', us.portfolios, P.portfolios) + use('Posiciones en tu portafolio más grande', us.positions, P.positions) : '')) +
      card('stH-acc', 'Contraseña y datos de la cuenta', 'Por ahora se cambian en la versión anterior de la app.',
        '<div class="st-actions">' + classicLink('Cambiar contraseña o datos de la cuenta') + '</div>');
  }

  function bSeguridad() {
    return backBtn() + ct('Seguridad') +
      card('stH-2fa', 'Verificación en dos pasos', 'Códigos de respaldo y dispositivos de confianza.',
        '<p class="st-note">La verificación en dos pasos, los códigos de respaldo y los dispositivos de confianza se administran por ahora en la versión anterior de la app.</p>' +
        '<div class="st-actions">' + classicLink('Abrir en la versión anterior') + '</div>') +
      card('stH-ses', 'Sesión', null, row('Este dispositivo', 'Cierra tu sesión aquí. Tendrás que volver a entrar.', cbtn('logout', 'Cerrar sesión en este dispositivo', 'btn-secondary btn-sm')));
  }

  function bPlan() {
    var P = planOf(U.plan);
    var cols = (D.plans || []).map(function (p) {
      var cur = P && p.name === P.name;
      return '<div class="st-pl"' + (cur ? ' data-cur' : '') + '><h3>' + esc(p.name) + (cur ? ' <span class="st-chip" data-k="acc">Tu plan</span>' : '') + '</h3><div class="st-pl-p num">' + (p.usd ? '$' + p.usd + ' <small>USD/mes</small>' : 'Gratis') + '</div>' +
        '<p class="st-sub">' + (p.usd ? 'Facturado $' + p.usdYear * 12 + ' USD al año, o $' + p.usd + ' USD al mes' : esc(p.mxn)) + '</p>' +
        '<dl><div><dt>Portafolios</dt><dd class="num">' + esc(String(p.portfolios)) + '</dd></div><div><dt>Posiciones</dt><dd class="num">' + esc(String(p.positions)) + '</dd></div><div><dt>IA al día</dt><dd class="num">' + p.ai + '</dd></div></dl></div>';
    }).join('');
    return backBtn() + ct('Plan y facturación') +
      card('stH-plan', 'Tu plan', null,
        '<div class="st-plan"><div><div class="st-plan-n">' + esc(U.plan || 'Sin dato') + ' <span class="st-chip" data-k="acc">Plan actual</span></div>' +
        (P ? '<p class="st-sub">' + (isFinite(+P.portfolios) && isFinite(+P.positions) ? 'Hasta ' + esc(String(P.portfolios)) + ' portafolios y ' + esc(String(P.positions)) + ' posiciones por portafolio.' : 'Portafolios y posiciones ilimitados.') + '</p>' : '') + '</div>' +
        '<div class="st-actions">' + classicLink('Administrar suscripción', 'btn-primary') + '</div></div>' +
        '<p class="st-note">El método de pago, las facturas y los cambios de plan se administran en la versión anterior de la app.</p>') +
      card('stH-tabla', 'Planes', 'Comparación de límites. Solo lectura.', '<div class="st-plans-w"><div class="st-plans">' + cols + '</div></div>');
  }

  function bPrefs() {
    return backBtn() + ct('Preferencias') +
      card('stH-tema', 'Tema', 'Se aplica al instante y se guarda en este navegador.', row('Apariencia', 'Sistema sigue el modo claro u oscuro de tu dispositivo.', '<div class="st-seg" id="stThemeSeg" role="group" aria-label="Tema"></div>')) +
      card('stH-ccy', 'Moneda base', null, row('Moneda base', 'Los totales aparecen en pesos mexicanos.', '<span class="st-chip">MXN (pesos)</span>')) +
      card('stH-inicio', 'Inicio', null,
        row('Restablecer el Inicio', 'Vuelve a la disposición original de los widgets. Solo afecta a este navegador.', '<div id="stReset">' + cbtn('homeReset', 'Restablecer el Inicio', 'btn-secondary btn-sm') + '</div>'));
  }

  function bDatos() {
    return backBtn() + ct('Datos y privacidad') +
      card('stH-leg', 'Documentos', null, '<div class="st-links"><a href="privacy.html" target="_blank" rel="noopener">Aviso de privacidad</a><a href="terms.html" target="_blank" rel="noopener">Términos del servicio</a></div>') +
      card('stH-mis', 'Tus datos', 'Exportar o eliminar tus datos se hace por ahora en la versión anterior.',
        '<div class="st-actions">' + classicLink('Exportar o eliminar tus datos: en la versión anterior') + '</div>');
  }

  var BUILD = { cuenta: bCuenta, seguridad: bSeguridad, plan: bPlan, preferencias: bPrefs, datos: bDatos };

  /* ================= armado ================= */
  set.innerHTML = '<header class="st-head"><h1 tabindex="-1">Ajustes</h1><p class="asof">Cuenta, seguridad, plan y preferencias</p></header>' +
    '<div class="st-shell"><nav class="st-nav" aria-label="Categorías de ajustes"><i class="st-ind" aria-hidden="true"></i>' +
    CATS.map(function (c) { return '<button type="button" data-cat="' + c.id + '" aria-current="false">' + ic(c.icon) + '<span class="st-nav-t"><span>' + c.label + '</span><small>' + c.sub + '</small></span><span class="st-nav-ch">' + ic('chev') + '</span></button>'; }).join('') + '</nav>' +
    '<div class="st-content">' + CATS.map(function (c) { return '<section class="st-cat" data-cat="' + c.id + '" aria-label="' + c.label + '" hidden>' + BUILD[c.id]() + '</section>'; }).join('') + '</div></div>';
  var nav = $('.st-nav', set), ind = $('.st-ind', set), navBtns = $$('.st-nav button', set), panels = {};
  $$('.st-cat', set).forEach(function (p) { panels[p.dataset.cat] = p; });
  var themeSeg = mkSeg($('#stThemeSeg'), [{ v: 'light', l: 'Claro' }, { v: 'dark', l: 'Oscuro' }, { v: 'system', l: 'Sistema' }], 'dark', function (v) { applyPref(v); });

  /* ---- tema: claro / oscuro / sistema (Sistema sigue prefers-color-scheme en vivo) ---- */
  var mqDark = matchMedia('(prefers-color-scheme: dark)'), themePref = ls('campo-theme-pref') || root.dataset.theme || 'dark', selfTheme = false;
  function applyPref(p) {
    themePref = p; ls('campo-theme-pref', p); themeSeg.set(p, true);
    var t = p === 'system' ? (mqDark.matches ? 'dark' : 'light') : p;
    if (root.dataset.theme !== t && CP) { selfTheme = true; CP.setTheme(t); }
  }
  if (themePref !== 'system' && root.dataset.theme && themePref !== root.dataset.theme) themePref = root.dataset.theme;
  themeSeg.set(themePref, true);
  if (themePref === 'system') applyPref('system');
  if (mqDark.addEventListener) mqDark.addEventListener('change', function () { if (themePref === 'system') applyPref('system'); });
  new MutationObserver(function () { if (selfTheme) { selfTheme = false; return; } themePref = root.dataset.theme; ls('campo-theme-pref', themePref); themeSeg.set(themePref, true); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  /* ================= navegación: sección, categoría y pantalla ================= */
  var sec = 'inicio', cat = null, seq = 0;
  $('h1', home).tabIndex = -1;
  var sideBtns = $$('.side-nav button[data-sec]'), whoBtn = $('#whoBtn');
  function mode() { return set.dataset.mode; }
  function placeInd() {
    var b = $('.st-nav button[aria-current="true"]', set); if (!b || mode() !== 'split' || !b.offsetHeight) return;
    ind.style.setProperty('--y', b.offsetTop + 'px'); ind.style.setProperty('--h', b.offsetHeight + 'px');
    if (!ind.hasAttribute('data-ready')) requestAnimationFrame(function () { ind.setAttribute('data-ready', ''); });
  }
  function playMeters(p) { if (!p) return; p.removeAttribute('data-in'); void p.offsetWidth; requestAnimationFrame(function () { requestAnimationFrame(function () { p.setAttribute('data-in', ''); }); }); }
  function commitCat(nc) {
    var m = mode(), eff = nc || (m === 'split' ? S.lastCat : null);
    CATS.forEach(function (c) { panels[c.id].hidden = c.id !== eff; });
    navBtns.forEach(function (b) { b.setAttribute('aria-current', String(b.dataset.cat === eff)); });
    set.dataset.screen = (m === 'stack' && !nc) ? 'list' : 'detail';
    placeInd(); playMeters(eff && panels[eff]);
  }
  function screenEls(s) { return s === 'list' ? [$('.st-head', set), nav] : [$('.st-content', set)]; }
  function applyCat(nc, animate, focus) {
    var m = mode(), prevScreen = set.dataset.screen, prevCat = cat; if (m === 'split' && !nc) nc = S.lastCat;
    cat = nc; if (nc) S.lastCat = nc;
    var newScreen = (m === 'stack' && !nc) ? 'list' : 'detail', my = ++seq;
    function afterFocus() {
      if (!focus) return;
      if (newScreen === 'detail' && m === 'stack') { var t = $('.st-ct', panels[nc]); if (t) t.focus({ preventScroll: true }); }
      else if (m === 'stack' && prevCat) { var b = $('.st-nav button[data-cat="' + prevCat + '"]', set); if (b) b.focus({ preventScroll: true }); }
    }
    if (!animate || reduce() || !set.animate || set.hidden) { commitCat(nc); afterFocus(); return; }
    if (m === 'stack' && prevScreen !== newScreen) {
      var fwd = newScreen === 'detail', outs = screenEls(prevScreen), done = 0;
      outs.forEach(function (e) {
        var a = e.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(' + (fwd ? -16 : 24) + 'px)' }], { duration: 140, easing: EASE, fill: 'forwards' });
        a.onfinish = function () {
          if (++done < outs.length || my !== seq) { return; }
          commitCat(nc); outs.forEach(function (x) { x.getAnimations().forEach(function (y) { y.cancel(); }); });
          screenEls(newScreen).forEach(function (x) { x.animate([{ opacity: 0, transform: 'translateX(' + (fwd ? 32 : -16) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE }); });
          window.scrollTo(0, 0); afterFocus();
        };
      });
    } else { commitCat(nc); if (prevCat !== nc) { fadeIn(panels[nc], 8); if (m === 'stack') window.scrollTo(0, 0); } afterFocus(); }
  }
  function setSideOn(to) { sideBtns.forEach(function (b) { var on = b.dataset.sec === to; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }); }
  function showSec(to, animate, then) {
    var my = ++seq, outEl = els[sec], inEl = els[to];
    function finish() {
      if (my !== seq) return;
      Object.keys(els).forEach(function (k) { var x = els[k]; if (x.getAnimations) x.getAnimations().forEach(function (a) { a.cancel(); }); x.hidden = k !== to; });
      sec = to; window.scrollTo(0, 0);
      setSideOn(to);
      if (to === 'ajustes') { measure(); if (then) then(); }
      else { window.dispatchEvent(new Event('resize')); requestAnimationFrame(function () { window.dispatchEvent(new Event('resize')); }); if (then) then(); }
      if (animate) { var tgt = to === 'inicio' ? $('h1', home) : to === 'tracker' ? $('h1', trk) : to === 'mercados' ? $('h1', mer) : to === 'informes' ? $('h1', inf) : (mode() === 'stack' && set.dataset.screen === 'detail' ? $('.st-cat:not([hidden]) .st-ct', set) : $('h1', set)); if (tgt) tgt.focus({ preventScroll: true }); }
      if (animate && !reduce() && inEl.animate) inEl.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EASE });
    }
    if (!animate || reduce() || !outEl.animate || outEl.hidden) finish();
    else { var a = outEl.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: 110, easing: EASE, fill: 'forwards' }); a.onfinish = finish; }
  }
  function measure() {
    var w = set.clientWidth; if (!w) return;
    var m = w >= 900 ? 'split' : 'stack';
    if (m !== mode()) { set.dataset.mode = m; if (sec === 'ajustes') applyCat(cat, false); }
    placeInd();
  }
  function parse() {
    var tk = /^#tracker(?:\/([\w-]+)(?:\/[\w-]+)?)?$/.exec(location.hash); if (tk) return { sec: 'tracker', id: tk[1] || null };
    var mk = /^#mercados(?:\/(.+))?$/.exec(location.hash); if (mk) return { sec: 'mercados', id: mk[1] || null };
    var ir = /^#informes(?:\/([\w-]+))?$/.exec(location.hash); if (ir) return { sec: 'informes', id: ir[1] || null };
    var m = /^#ajustes(?:\/([a-z]+))?$/.exec(location.hash); if (!m) return { sec: 'inicio' };
    return { sec: 'ajustes', cat: m[1] && panels[m[1]] ? m[1] : null };
  }
  function fireInf() { window.dispatchEvent(new CustomEvent('campo:route', { detail: { sec: 'informes', hash: location.hash } })); }
  function fireMk() { window.dispatchEvent(new CustomEvent('campo:route', { detail: { sec: 'mercados', hash: location.hash } })); }
  function fireTk() { window.dispatchEvent(new CustomEvent('campo:route', { detail: { sec: 'tracker', hash: location.hash } })); }
  /* el título de la pestaña (y lo que anuncia un lector de pantalla) sigue a la sección: "Monte Carlo… | Portafolios | Portify" */
  function setTitle(t) {
    var T = window.CampoTracker, s = 'Inicio';
    if (t.sec === 'tracker') {
      var p = t.id && T && T.get ? T.get(t.id) : null;
      s = t.id ? ((p && p.name) || (t.id === 'todos' ? 'Todos los portafolios' : 'Portafolio')) + ' | Portafolios' : 'Portafolios';
    } else if (t.sec === 'mercados') {
      var sym = t.id || ''; try { sym = decodeURIComponent(sym); } catch (e) { }
      s = sym ? sym.toUpperCase() + ' | Mercados' : 'Mercados';
    } else if (t.sec === 'informes') s = 'Informes';
    else if (t.sec === 'ajustes') { var c = CATS.filter(function (x) { return x.id === t.cat; })[0]; s = c ? c.label + ' | Ajustes' : 'Ajustes'; }
    doc.title = s + ' | Portify';
  }
  function route(animate) {
    if (doc.body.dataset.view !== 'app') return;
    var t = parse(); setTitle(t);
    /* aviso general de sección (la moneda base de la vista depende de dónde estás) */
    try { window.dispatchEvent(new CustomEvent('campo:section', { detail: { sec: t.sec } })); } catch (e) { }
    if (t.sec === 'inicio') { if (sec !== 'inicio') showSec('inicio', animate); return; }
    if (t.sec === 'tracker') { if (sec !== 'tracker') showSec('tracker', animate, fireTk); else fireTk(); return; }
    if (t.sec === 'mercados') { if (sec !== 'mercados') showSec('mercados', animate, fireMk); else fireMk(); return; }
    if (t.sec === 'informes') { if (sec !== 'informes') showSec('informes', animate, fireInf); else fireInf(); return; }
    if (sec !== 'ajustes') { showSec('ajustes', animate, function () { applyCat(t.cat, false, animate); }); return; }
    var want = t.cat || (mode() === 'split' ? S.lastCat : null);
    if (want !== cat) applyCat(t.cat, animate, true);
  }
  function navigate(h, replace, st) {
    try { history[replace ? 'replaceState' : 'pushState'](st || { st: 1 }, '', h || (location.pathname + location.search)); } catch (e) { location.hash = h; }
    route(true);
  }
  window.addEventListener('popstate', function () { route(true); });
  window.addEventListener('hashchange', function () { route(true); });
  new MutationObserver(function () {
    if (doc.body.dataset.view === 'app') route(false);
    else if (sec !== 'inicio') { ++seq; home.hidden = false; set.hidden = true; trk.hidden = true; inf.hidden = true; mer.hidden = true; sec = 'inicio'; setSideOn('inicio'); if (/^#(ajustes|tracker|mercados|informes)/.test(location.hash)) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { } } }
  }).observe(doc.body, { attributes: true, attributeFilter: ['data-view'] });
  if (window.ResizeObserver) new ResizeObserver(function () { if (!set.hidden) measure(); }).observe(set);

  sideBtns.forEach(function (b) { b.addEventListener('click', function () {
    var to = b.dataset.sec;
    if (to === 'ajustes') navigate('#ajustes', false, { st: 1 });
    else if (to === 'tracker') { if (sec !== 'tracker' || location.hash !== '#tracker') navigate('#tracker', false, { st: 1 }); }
    else if (to === 'informes') { if (sec !== 'informes' || location.hash !== '#informes') navigate('#informes', false, { st: 1 }); }
    else if (to === 'mercados') { if (sec !== 'mercados') navigate('#mercados', false, { st: 1 }); }
    else if (sec !== 'inicio') navigate('', false, { st: 1 });
  }); });
  /* API de secciones para otros módulos (Tracker): navigate(hash, replace) y show(nombre[, hash]); 'campo:route' se emite al resolver una ruta del Tracker */
  window.CampoSections = {
    current: function () { return sec; },
    navigate: function (h, replace) { navigate(h, !!replace, { st: 1 }); },
    show: function (name, h) { navigate(h != null ? h : name === 'tracker' ? '#tracker' : name === 'mercados' ? '#mercados' : name === 'informes' ? '#informes' : name === 'ajustes' ? '#ajustes' : '', false, { st: 1 }); }
  };
  whoBtn.addEventListener('click', function () { navigate('#ajustes/cuenta', false, { st: 1 }); });
  nav.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-cat]'); if (!b) return;
    if (mode() === 'split') { if (b.dataset.cat !== cat) navigate('#ajustes/' + b.dataset.cat, true, { st: 1 }); }
    else navigate('#ajustes/' + b.dataset.cat, false, { st: 1, stCat: 1 });
  });
  nav.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    var i = navBtns.indexOf(doc.activeElement); if (i < 0) return; e.preventDefault();
    navBtns[(i + (e.key === 'ArrowDown' ? 1 : -1) + navBtns.length) % navBtns.length].focus();
  });

  /* ================= acciones ================= */
  var A = {};
  A.stBack = function () { if (history.state && history.state.stCat) history.back(); else navigate('#ajustes', true, { st: 1 }); };

  /* color del avatar (preferencia local) */
  var popOpen = false;
  function popToggle(open) {
    var pop = $('#stPop'), av = $('#stAv'); popOpen = open; pop.hidden = !open; av.setAttribute('aria-expanded', String(open));
    if (open) { var c = $('[aria-checked="true"]', pop); if (c) c.focus(); }
  }
  A.av = function () { popToggle(!popOpen); };
  A.tint = function (b) {
    S.tint = +b.dataset.i; ls('campo-tint', String(S.tint)); $$('.st-tint').forEach(function (t) { t.setAttribute('aria-checked', String(t === b)); });
    $('#stAv').style.setProperty('--t', TINTS[S.tint][1]); live('Color del avatar: ' + TINTS[S.tint][0]);
  };
  doc.addEventListener('click', function (e) { if (popOpen && !e.target.closest('.st-av-w')) popToggle(false); });
  /* si la foto no carga (enlace caído, bloqueo), se quita y quedan las iniciales; 'error' no burbujea, de ahí la captura */
  set.addEventListener('error', function (e) { var t = e.target; if (t && t.tagName === 'IMG' && t.parentNode && t.parentNode.id === 'stAv') t.remove(); }, true);
  set.addEventListener('keydown', function (e) { if (popOpen && e.key === 'Escape') { popToggle(false); $('#stAv').focus(); } });

  /* sesión */
  A.logout = function () { var l = doc.getElementById('logout'); if (l) l.click(); };

  /* inicio: solo reinicia la disposición local de widgets */
  A.homeReset = function () {
    var h = $('#stReset'); h.innerHTML = '<div class="st-confirm" role="group" aria-label="Confirmar"><span>Se reemplaza la disposición actual del Inicio.</span><div class="st-actions">' + cbtn('homeResetNo', 'Cancelar', 'btn-ghost btn-sm') + cbtn('homeResetOk', 'Restablecer', 'btn-primary btn-sm') + '</div></div>'; fadeIn(h, 0); $('[data-act="homeResetNo"]', h).focus();
  };
  A.homeResetNo = function () { var h = $('#stReset'); h.innerHTML = cbtn('homeReset', 'Restablecer el Inicio', 'btn-secondary btn-sm'); $('[data-act="homeReset"]', h).focus(); };
  A.homeResetOk = function () {
    var ok = false;
    try { if (window.__hub && window.__hub.reset) { window.__hub.reset('Inversor'); ok = true; } } catch (e) { }
    A.homeResetNo();
    if (ok) { toast('Inicio restablecido'); live('Inicio restablecido.'); } else toast('El Inicio todavía no está disponible.');
  };

  set.addEventListener('click', function (e) { var a = e.target.closest('[data-act]'); if (a && set.contains(a) && A[a.dataset.act]) A[a.dataset.act](a, e); });

  window.__settings = {
    open: function (c) { var id = panels[c] ? c : 'cuenta'; if (doc.body.dataset.view !== 'app' && CP) CP.go('app'); setTimeout(function () { navigate('#ajustes/' + id, mode() === 'split', { st: 1, stCat: mode() === 'stack' ? 1 : 0 }); }, 0); },
    cats: function () { return CATS.map(function (c) { return c.id; }); }
  };
})();
