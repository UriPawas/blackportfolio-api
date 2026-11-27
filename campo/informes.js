/* Campo · Sección Informes (portada + historial + visor). Monta en #secInformes. Prefijo inf-. Datos: window.CampoReport (no calcula finanzas).
   Persiste PARÁMETROS (no datos) en localStorage 'campo.informes.v1'. Visor: CampoReportDeck / CampoReportDoc. En producción, con los datos reales de campo/datos.js. */
(function () {
  'use strict';
  var doc = document, win = window, root = doc.getElementById('secInformes');
  if (!root) return;
  var LS = 'campo.informes.v1', EASE = 'cubic-bezier(.23,1,.32,1)';
  var STR = { es: {
    title: 'Informes', lede: 'Un resumen de lo que pasó con tu portafolio en un periodo, para leer o compartir.',
    nuevo: 'Nuevo informe', pf: 'Portafolio', per: 'Periodo', fmt: 'Formato', todos: 'Todos', todosSub: 'Todos tus portafolios', custom: 'Personalizado',
    from: 'Desde', to: 'Hasta', pres: 'Presentación', docu: 'Documento', presSub: 'Horizontal y animada', docSub: 'Vertical, para imprimir o guardar en PDF',
    prev: 'Vista previa', gain: 'Ganancia', twr: 'Rendimiento', vs: 'Contra referencia', crear: 'Crear informe',
    hist: 'Tus informes', empty: 'Aún no tienes informes', emptyD: 'Elige un portafolio y un periodo arriba y crea el primero. Se guarda solo la receta; los números se recalculan cada vez que lo abres.',
    abrir: 'Abrir', ren: 'Renombrar', del: 'Eliminar', undo: 'Deshacer', deleted: 'Informe eliminado', save: 'Guardar', cancel: 'Cancelar',
    back: 'Informes', print: 'Imprimir o guardar PDF', missing: 'Este informe no existe', missingD: 'Pudo haberse eliminado. Vuelve a tus informes.',
    noRend: 'Este formato aún no está disponible.', badRange: 'Elige un rango con fechas de mercado dentro de los datos disponibles.',
    badOrder: 'La fecha de inicio debe ser anterior a la final.', noPf: 'Aún no tienes portafolios para armar un informe.', noPfT: 'Aún no tienes portafolios', noPfD: 'Un informe resume lo que pasó con un portafolio en un periodo. Crea el primero y aquí podrás armar tu informe.', newPf: 'Nuevo portafolio', noData: 'No hay sesiones en ese periodo.',
    foot: 'Los informes describen lo que pasó con tus datos; no son una recomendación de inversión.',
    limit: 'Tu plan Explorer incluye 1 informe al mes y ya usaste el de este mes.'
  } };
  var S = STR.es;
  var CR = function () { return win.CampoReport; }, T = function () { return win.CampoTracker; };
  var RM = !!(win.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- utilidades ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() { return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function todayIso() { return new Date().toISOString().slice(0, 10); }
  function lsGet() { try { var v = JSON.parse(localStorage.getItem(LS) || 'null'); return v && Array.isArray(v.items) ? v : null; } catch (e) { return null; } }
  function lsSet(o) { try { localStorage.setItem(LS, JSON.stringify(o)); } catch (e) { } }
  function nowMonth() { return todayIso().slice(0, 7); }

  /* ---------- almacén de parámetros ---------- */
  var store = { items: [] }, loaded = false;
  function seed() {
    var T0 = T(), first = T0 && T0.portfolios[0], pid = T0 && T0.get('principal') ? 'principal' : first ? first.id : 'todos';
    return [
      { id: 'seed-1', title: '', pf: pid, per: { id: 'mes' }, fmt: 'pres', created: '2026-11-02', seed: 1 },
      { id: 'seed-2', title: '', pf: 'todos', per: { id: 'ytd' }, fmt: 'doc', created: '2026-11-10', seed: 1 }
    ];
  }
  function load() { loaded = true; var v = lsGet(); if (v) { store = v; if (window.CAMPO_REAL && store.items) store.items = store.items.filter(function (x) { return !x.seed; }); return; } store = { items: window.CAMPO_REAL ? [] : seed() }; lsSet(store); }
  function save() { lsSet(store); }
  function find(id) { for (var i = 0; i < store.items.length; i++) if (store.items[i].id === id) return store.items[i]; return null; }

  /* ---------- resolución de parámetros → informe ---------- */
  function resolvePeriod(p) {
    var C = CR(); if (!C) return null;
    if (p.id === 'custom') return C.custom(p.from, p.to);
    var l = C.periods(); for (var i = 0; i < l.length; i++) if (l[i].id === p.id) return l[i];
    return null;
  }
  function pfName(id) { var t = T(); if (id === 'todos') return S.todos; var p = t && t.get(id); return p ? p.name : id; }
  function periodName(p) { var per = resolvePeriod(p); return per ? (p.id === 'custom' ? per.label : per.name) : '—'; }
  function itemTitle(it) { return it.title || (pfName(it.pf) + ' · ' + periodName(it.per)); }
  function buildReport(it) {
    var C = CR(), per = resolvePeriod(it.per); if (!C || !per) return null;
    if (it.pf !== 'todos' && !(T() && T().get(it.pf))) return null;
    try { return C.build(it.pf, per); } catch (e) { return null; }
  }

  /* ---------- tween de cifras ---------- */
  function tween(el, to, fn) {
    var from = el._v == null ? to : el._v; if (el._raf) cancelAnimationFrame(el._raf);
    if (RM || from === to) { el._v = to; el.textContent = fn(to); return; }
    var t0 = performance.now(), D = 320;
    (function step(t) {
      var k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3), v = from + (to - from) * e;
      el._v = v; el.textContent = fn(v); if (k < 1) el._raf = requestAnimationFrame(step); else { el._v = to; el.textContent = fn(to); }
    })(t0);
  }

  /* ---------- estado del flujo ---------- */
  var form = { pf: null, per: '1m', from: '', to: '', fmt: 'pres' };
  var view = { mode: null, id: null, handle: null, back: null, pending: null, rect: null, toastT: 0 };

  function bounds() { var t = T(), d = t && t.dates; return d && d.length ? { min: d[0], max: d[d.length - 1] } : { min: '', max: '' }; }
  function plan() { var t = T(); if (t && t.limit && t.limit.admin) return 'Wealth Desk'; /* la cuenta admin no tiene tope */ return (t && t.limit && t.limit.plan) || 'Investor'; }
  function overLimit() {
    if (!/^explorer$/i.test(plan())) return false;
    var m = nowMonth(); return store.items.some(function (i) { return !i.seed && i.created.slice(0, 7) === m; });
  }

  /* ---------- portada ---------- */
  var L = {};
  function icon(n) {
    var d = { arrow: 'M15 6l-6 6 6 6', pen: 'M4 20h4L19 9l-4-4L4 16v4z', trash: 'M5 7h14M9 7V4h6v3m-8 0l1 13h8l1-13', slides: 'M3 5h18v11H3zM9 20h6M12 16v4', page: 'M7 3h8l4 4v14H7zM15 3v4h4', print: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z' };
    return '<svg class="inf-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d[n] + '"/></svg>';
  }
  function pfCards() {
    var t = T(), ps = t ? t.portfolios : [], h = '';
    ps.forEach(function (p) {
      h += '<button type="button" class="inf-pfc" data-pf="' + esc(p.id) + '" style="--pc:' + esc(p.color) + '" aria-pressed="' + (form.pf === p.id) + '"><span class="inf-sw" aria-hidden="true"></span><span class="inf-pfn">' + esc(p.name) + '</span><span class="inf-pfv inf-num">' + CR().fmt.money(p.value) + '</span></button>';
    });
    if (ps.length > 1) h += '<button type="button" class="inf-pfc" data-pf="todos" style="--pc:var(--accent)" aria-pressed="' + (form.pf === 'todos') + '"><span class="inf-sw" aria-hidden="true"></span><span class="inf-pfn">' + S.todos + '</span><span class="inf-pfv inf-num">' + (t.total ? CR().fmt.money(t.total.value) : '') + '</span></button>';
    return h;
  }
  function perChips() {
    var h = '';
    CR().periods().forEach(function (p) { h += '<button type="button" class="inf-chip" data-per="' + p.id + '" aria-pressed="' + (form.per === p.id) + '">' + esc(p.name) + '</button>'; });
    return h + '<button type="button" class="inf-chip" data-per="custom" aria-pressed="' + (form.per === 'custom') + '">' + S.custom + '</button>';
  }
  function renderLanding() {
    var C = CR(), t = T(); teardownViewer(true);
    root.className = 'inf'; root.dataset.mode = 'landing';
    if (!C || !t) { root.innerHTML = '<header class="inf-head"><h1 tabindex="-1">' + S.title + '</h1><p>' + S.lede + '</p></header><p class="inf-note">' + S.noData + '</p>'; return; }
    if (!t.portfolios.length) { /* sin portafolios no hay formulario ni vista previa que mostrar: una tarjeta vacía centrada, con la única acción posible */
      form.pf = null;
      root.innerHTML = '<header class="inf-head"><h1 tabindex="-1">' + S.title + '</h1><p>' + S.lede + '</p></header>' +
        '<div class="inf-void"><strong>' + S.noPfT + '</strong><p>' + (t.readonly ? S.noPf : S.noPfD) + '</p>' + (t.readonly ? '' : '<button type="button" class="btn btn-primary" data-create>' + S.newPf + '</button>') + '</div>' +
        (store.items.length ? '<section class="inf-hist" aria-labelledby="infHT"><h2 id="infHT">' + S.hist + '</h2><div id="infList"></div></section>' : '') +
        '<p class="inf-foot">' + S.foot + '</p><div class="inf-toast" id="infToast" role="status" hidden></div>';
      if (store.items.length) { $('#infList').addEventListener('click', onListClick); $('#infList').addEventListener('keydown', onListKey); paintList(false); }
      return;
    }
    if (!form.pf || (form.pf !== 'todos' && !t.get(form.pf))) form.pf = t.portfolios[0] ? t.portfolios[0].id : null;
    var b = bounds(); if (!form.from) { form.from = b.min; form.to = b.max; }
    root.innerHTML =
      '<header class="inf-head"><h1 tabindex="-1">' + S.title + '</h1><p>' + S.lede + '</p></header>' +
      '<div class="inf-grid">' +
      '<section class="inf-new" aria-labelledby="infNewT"><h2 id="infNewT">' + S.nuevo + '</h2>' +
      '<fieldset class="inf-fs"><legend>' + S.pf + '</legend><div class="inf-pfs" id="infPf">' + pfCards() + '</div></fieldset>' +
      '<fieldset class="inf-fs"><legend>' + S.per + '</legend><div class="inf-chips" id="infPer">' + perChips() + '</div>' +
      '<div class="inf-cust" id="infCust" ' + (form.per === 'custom' ? '' : 'hidden') + '><label>' + S.from + '<input type="date" id="infFrom" min="' + b.min + '" max="' + b.max + '" value="' + form.from + '"></label><label>' + S.to + '<input type="date" id="infTo" min="' + b.min + '" max="' + b.max + '" value="' + form.to + '"></label></div>' +
      '<p class="inf-err" id="infErr" role="alert" hidden></p></fieldset>' +
      '<fieldset class="inf-fs"><legend>' + S.fmt + '</legend><div class="inf-fmts" id="infFmt">' +
      fmtBtn('pres', S.pres, S.presSub, 'slides') + fmtBtn('doc', S.docu, S.docSub, 'page') + '</div></fieldset></section>' +
      '<aside class="inf-side"><div class="inf-prev" aria-live="polite"><h2>' + S.prev + '</h2><p class="inf-prevs" id="infPrevS"></p>' +
      '<dl class="inf-figs"><div><dt>' + S.gain + '</dt><dd class="inf-num" id="infG"></dd></div><div><dt>' + S.twr + '</dt><dd class="inf-num" id="infT"></dd></div><div><dt id="infVsK">' + S.vs + '</dt><dd class="inf-num" id="infV"></dd></div></dl></div>' +
      '<button type="button" class="btn btn-primary inf-go" id="infGo">' + S.crear + '</button><p class="inf-lim" id="infLim" role="status"></p></aside></div>' +
      '<section class="inf-hist" aria-labelledby="infHT"><h2 id="infHT">' + S.hist + '</h2><div id="infList"></div></section>' +
      '<p class="inf-plan">Plan ' + esc(plan()) + ' · ' + (/^explorer$/i.test(plan()) ? '1 informe al mes' : 'informes ilimitados') + '</p>' +
      '<p class="inf-foot">' + S.foot + '</p><div class="inf-toast" id="infToast" role="status" hidden></div>';
    bindLanding(); paintPreview(true); paintList(false);
  }
  function fmtBtn(id, name, sub, ic) {
    return '<button type="button" class="inf-fmt" data-fmt="' + id + '" aria-pressed="' + (form.fmt === id) + '">' + icon(ic) + '<span><strong>' + name + '</strong><small>' + sub + '</small></span></button>';
  }
  function $(s, r) { return (r || root).querySelector(s); }
  function setPressed(wrap, attr, val) { Array.prototype.forEach.call(wrap.children, function (b) { if (b.hasAttribute(attr)) b.setAttribute('aria-pressed', String(b.getAttribute(attr) === val)); }); }
  function bindLanding() {
    $('#infPf').addEventListener('click', function (e) { var b = e.target.closest('[data-pf]'); if (!b) return; form.pf = b.dataset.pf; setPressed(this, 'data-pf', form.pf); paintPreview(); });
    $('#infPer').addEventListener('click', function (e) { var b = e.target.closest('[data-per]'); if (!b) return; form.per = b.dataset.per; setPressed(this, 'data-per', form.per); $('#infCust').hidden = form.per !== 'custom'; paintPreview(); });
    $('#infFmt').addEventListener('click', function (e) { var b = e.target.closest('[data-fmt]'); if (!b) return; form.fmt = b.dataset.fmt; setPressed(this, 'data-fmt', form.fmt); });
    ['#infFrom', '#infTo'].forEach(function (s) { $(s).addEventListener('input', function () { form.from = $('#infFrom').value; form.to = $('#infTo').value; paintPreview(); }); });
    $('#infGo').addEventListener('click', createReport);
    $('#infList').addEventListener('click', onListClick);
    $('#infList').addEventListener('keydown', onListKey);
  }
  function formPeriod() { return form.per === 'custom' ? { id: 'custom', from: form.from, to: form.to } : { id: form.per }; }
  function paintPreview(first) {
    var C = CR(), err = $('#infErr'), go = $('#infGo'), lim = $('#infLim'); if (!err) return;
    function bad(msg) { err.textContent = msg; err.hidden = !msg; go.disabled = !!msg; }
    var msg = '', rep = null;
    if (!form.pf) msg = S.noPf;
    else if (form.per === 'custom' && (!form.from || !form.to)) msg = S.badRange;
    else if (form.per === 'custom' && form.from > form.to) msg = S.badOrder;
    else if (!resolvePeriod(formPeriod())) msg = form.per === 'custom' ? S.badRange : S.noData;
    else rep = buildReport({ pf: form.pf, per: formPeriod() });
    var lm = overLimit(); lim.textContent = lm ? S.limit : ''; bad(msg); if (lm) go.disabled = true;
    if (!rep) { /* sin informe que previsualizar, las cifras llevan un guion en vez de quedar en blanco */
      $('#infPrevS').textContent = '';
      ['#infG', '#infT', '#infV'].forEach(function (s) { var e = $(s); if (!e) return; if (e._raf) cancelAnimationFrame(e._raf); e._v = null; e.textContent = '—'; e.className = 'inf-num'; });
      return;
    }
    $('#infPrevS').textContent = rep.meta.portfolioName + ' · ' + rep.meta.periodLabel;
    var K = rep.kpis, F = C.fmt, g = $('#infG'), tw = $('#infT'), v = $('#infV');
    tween(g, K.gain, F.smoney); tween(tw, K.twr, function (x) { return F.pct(x, 2); }); tween(v, K.excess * 100, F.pts);
    g.className = 'inf-num ' + (K.gain >= 0 ? 'gain' : 'loss'); tw.className = 'inf-num ' + (K.twr >= 0 ? 'gain' : 'loss'); v.className = 'inf-num ' + (K.excess >= 0 ? 'gain' : 'loss');
    $('#infVsK').textContent = S.vs + ' · ' + rep.meta.benchmark;
  }
  function createReport() {
    if (overLimit() || !form.pf || !resolvePeriod(formPeriod())) return;
    var it = { id: uid(), title: '', pf: form.pf, per: formPeriod(), fmt: form.fmt, created: todayIso() };
    store.items.unshift(it); save(); navigate('#informes/' + it.id);
  }
  function navigate(h) { if (win.CampoSections && win.CampoSections.navigate) win.CampoSections.navigate(h, false); else { location.hash = h; } }

  /* ---------- historial ---------- */
  function paintList(animateNew) {
    var box = $('#infList'); if (!box) return;
    if (!store.items.length) { box.innerHTML = '<div class="inf-empty"><strong>' + S.empty + '</strong><p>' + S.emptyD + '</p></div>'; return; }
    box.innerHTML = '<ul class="inf-list">' + store.items.map(function (it, i) {
      var P = it.pf === 'todos' ? null : T() && T().get(it.pf), col = P ? P.color : 'var(--accent)', ok = !!resolvePeriod(it.per) && (it.pf === 'todos' || P);
      return '<li class="inf-card" data-id="' + it.id + '" style="--pc:' + esc(col) + ';--i:' + i + '"><span class="inf-sw" aria-hidden="true"></span>' +
        '<div class="inf-cm"><h3 class="inf-ct">' + (ok ? '<button type="button" class="inf-open" data-act="open">' + esc(itemTitle(it)) + '</button>' : esc(itemTitle(it))) + '</h3>' +
        '<p class="inf-cs">' + esc(pfName(it.pf)) + ' · ' + esc(periodName(it.per)) + '</p>' +
        '<p class="inf-cs"><span class="inf-tag">' + (it.fmt === 'doc' ? S.docu : S.pres) + '</span> ' + esc(CR().fmt.dLong(it.created)) + '</p></div>' +
        '<div class="inf-acts"><button type="button" class="inf-ib" data-act="ren" aria-label="' + S.ren + ' ' + esc(itemTitle(it)) + '" title="' + S.ren + '">' + icon('pen') + '</button>' +
        '<button type="button" class="inf-ib" data-act="del" aria-label="' + S.del + ' ' + esc(itemTitle(it)) + '" title="' + S.del + '">' + icon('trash') + '</button></div></li>';
    }).join('') + '</ul>';
  }
  function onListClick(e) {
    var b = e.target.closest('[data-act]'), li = e.target.closest('.inf-card'); if (!b || !li) return;
    var it = find(li.dataset.id); if (!it) return;
    if (b.dataset.act === 'open') { view.rect = li.getBoundingClientRect(); view.rectId = it.id; navigate('#informes/' + it.id); }
    else if (b.dataset.act === 'ren') startRename(li, it);
    else if (b.dataset.act === 'del') removeItem(it);
  }
  function onListKey(e) { /* Esc cancela el renombrado */ if (e.key === 'Escape' && e.target.classList.contains('inf-rn')) { e.preventDefault(); paintList(false); } }
  function startRename(li, it) {
    var h = li.querySelector('.inf-ct'); h.innerHTML = '<input class="inf-rn" type="text" maxlength="60" value="' + esc(itemTitle(it)) + '" aria-label="' + S.ren + '">';
    var inp = h.firstChild; inp.focus(); inp.select();
    function done(ok) { if (ok) { var v = inp.value.trim(); it.title = v === (pfName(it.pf) + ' · ' + periodName(it.per)) ? '' : v; save(); } paintList(false); }
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); inp.onblur = null; done(true); } });
    inp.onblur = function () { done(true); };
  }
  function removeItem(it) {
    var i = store.items.indexOf(it), li = $('.inf-card[data-id="' + it.id + '"]');
    function commit() { store.items.splice(i, 1); save(); paintList(false); toast(S.deleted, function () { store.items.splice(i, 0, it); save(); paintList(false); }); }
    if (li && !RM && li.animate) { li.style.pointerEvents = 'none'; li.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-12px)' }], { duration: 200, easing: EASE, fill: 'forwards' }).onfinish = commit; } else commit();
  }
  function toast(msg, undo) {
    var t = $('#infToast'); if (!t) return; clearTimeout(view.toastT);
    t.innerHTML = '<span>' + esc(msg) + '</span><button type="button" class="inf-undo">' + S.undo + '</button>'; t.hidden = false;
    t.querySelector('button').onclick = function () { clearTimeout(view.toastT); t.hidden = true; undo(); };
    view.toastT = setTimeout(function () { t.hidden = true; }, 6000);
  }

  /* ---------- visor ---------- */
  function teardownViewer(keepRoot) {
    if (view.handle && view.handle.destroy) { try { view.handle.destroy(); } catch (e) { } }
    view.handle = null; view.mode = null; if (!keepRoot) root.innerHTML = '';
  }
  function renderViewer(id) {
    var it = find(id); teardownViewer(true); root.className = 'inf'; root.dataset.mode = 'viewer';
    if (!it || !buildReport(it)) {
      root.innerHTML = '<div class="inf-miss"><h1 tabindex="-1">' + S.missing + '</h1><p>' + S.missingD + '</p><button type="button" class="btn btn-secondary" id="infBack">' + icon('arrow') + S.back + '</button></div>';
      $('#infBack').onclick = function () { navigate('#informes'); }; focusH1(); return;
    }
    view.id = id; view.mode = it.fmt === 'doc' ? 'doc' : 'pres';
    root.innerHTML = '<div class="inf-viewer" id="infV"><div class="inf-bar"><button type="button" class="btn btn-ghost inf-bk" id="infBack">' + icon('arrow') + '<span>' + S.back + '</span></button>' +
      '<div class="inf-bt"><h1 tabindex="-1">' + esc(itemTitle(it)) + '</h1><p>' + esc(pfName(it.pf)) + ' · ' + esc(periodName(it.per)) + '</p></div>' +
      '<div class="seg inf-sw2" role="group" aria-label="' + S.fmt + '" style="--n:2;--i:' + (view.mode === 'doc' ? 1 : 0) + '"><span class="seg-pill" aria-hidden="true"></span><button type="button" data-m="pres" aria-pressed="' + (view.mode === 'pres') + '">' + S.pres + '</button><button type="button" data-m="doc" aria-pressed="' + (view.mode === 'doc') + '">' + S.docu + '</button></div>' +
      '<button type="button" class="btn btn-secondary inf-pr" id="infPr">' + icon('print') + '<span>' + S.print + '</span></button></div>' +
      '<div class="inf-stage" id="infStage"></div><p class="inf-foot">' + S.foot + '</p></div>';
    $('#infBack').onclick = exitViewer;
    $('.inf-sw2').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (!b || b.dataset.m === view.mode) return; view.mode = b.dataset.m; mountRenderer(it); });
    $('#infPr').onclick = function () { if (view.handle && view.handle.print) view.handle.print(); };
    mountRenderer(it); focusH1();
    var el = $('#infV'), r = view.rect; view.rect = null;
    if (r && view.rectId === id && !RM && el.animate) flipIn(el, r);
  }
  function focusH1() { var h = $('h1'); if (h) { try { h.focus({ preventScroll: true }); } catch (e) { } } }
  function mountRenderer(it) {
    var stage = $('#infStage'), rep = buildReport(it), m = view.mode;
    if (view.handle && view.handle.destroy) { try { view.handle.destroy(); } catch (e) { } } view.handle = null; stage.innerHTML = '';
    var sw = $('.inf-sw2'); sw.style.setProperty('--i', m === 'doc' ? 1 : 0); Array.prototype.forEach.call(sw.querySelectorAll('[data-m]'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.m === m)); });
    $('#infPr').hidden = m !== 'doc'; stage.dataset.m = m;
    var R = m === 'doc' ? win.CampoReportDoc : win.CampoReportDeck;
    if (!R || !R.render) { stage.innerHTML = '<div class="inf-ph"><p>' + S.noRend + '</p></div>'; return; }
    try { view.handle = m === 'doc' ? R.render(stage, rep, {}) : R.render(stage, rep, { onExit: exitViewer }); }
    catch (e) { stage.innerHTML = '<div class="inf-ph"><p>' + S.noRend + '</p></div>'; if (win.console) console.error(e); }
  }
  function flipIn(el, r) {
    var b = el.getBoundingClientRect(); if (!b.width || !b.height) return;
    var dx = r.left - b.left, dy = r.top - b.top, sx = Math.max(.05, r.width / b.width), sy = Math.max(.05, Math.min(1, r.height / b.height));
    el.style.transformOrigin = '0 0';
    el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: EASE });
  }
  function exitViewer() {
    var el = $('#infV'), r = view.rect2 = view.rectId === view.id ? view.lastRect : null;
    var done = function () { navigate('#informes'); };
    if (el && el.animate && !RM) {
      var b = el.getBoundingClientRect(), tr = r || { left: b.left + b.width * .35, top: b.top + 40, width: b.width * .3, height: 80 };
      var dx = tr.left - b.left, dy = tr.top - b.top, sx = Math.max(.05, tr.width / b.width), sy = Math.max(.05, Math.min(1, tr.height / b.height));
      el.style.transformOrigin = '0 0';
      var a = el.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')', opacity: 0 }], { duration: 240, easing: EASE, fill: 'forwards' });
      a.onfinish = done; a.oncancel = done;
    } else done();
  }
  /* recuerda el rect de la tarjeta al abrir, para que la salida vuelva a ella */
  root.addEventListener('click', function (e) { var li = e.target.closest && e.target.closest('.inf-card'); if (li && e.target.closest('[data-act="open"]')) { view.lastRect = li.getBoundingClientRect(); view.rectId = li.dataset.id; } }, true);

  /* ---------- ruteo ---------- */
  function route() {
    if (root.hidden) return;
    if (!loaded) load();
    var m = /^#informes(?:\/([\w-]+))?/.exec(location.hash), id = m && m[1];
    if (id) { if (view.mode && view.id === id && root.dataset.mode === 'viewer') return; renderViewer(id); }
    else { if (root.dataset.mode === 'landing' && $('#infList')) { paintList(false); return; } renderLanding(); focusH1Soft(); }
  }
  function focusH1Soft() { /* el enrutador ya enfoca el h1 de la sección; no robamos foco aquí */ }
  win.addEventListener('campo:route', function (e) { if (e.detail && e.detail.sec === 'informes') route(); });
  win.addEventListener('hashchange', function () { if (!root.hidden && /^#informes/.test(location.hash)) route(); });
  new MutationObserver(function () { if (root.hidden) { teardownViewer(false); root.dataset.mode = ''; } else route(); }).observe(root, { attributes: true, attributeFilter: ['hidden'] });
  function boot() { load(); if (/^#informes/.test(location.hash) && doc.body.dataset.view === 'app' && !root.hidden) route(); }
  var Tt = T(); if (Tt && Tt.on) { Tt.on('change', function () { if (!root.hidden && root.dataset.mode === 'landing') renderLanding(); }); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();

  win.CampoInformes = { _store: function () { return store; }, itemTitle: itemTitle };
})();
