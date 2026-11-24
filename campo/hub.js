/* CAMPO · Portify. Motor del escritorio de widgets del Inicio (spec: docs/rediseno-gbm-2026-11/14-spec-inicio.md).
   Define window.CampoHub de inmediato; pinta cuando la vista app se muestra por primera vez. Sin dependencias. */
(function () {
  'use strict';
  var KEY = 'campo-hub-v2', COLS = 12, ROW = 40, GAP = 16, UNDO_MAX = 20, EASE = 'cubic-bezier(0.23,1,0.32,1)';
  var SZ = { S: [3, 4], M: [6, 6], L: [6, 9], XL: [12, 9] }, SORDER = ['S', 'M', 'L', 'XL'];
  var SNAME = { S: 'Pequeño', M: 'Mediano', L: 'Grande', XL: 'Extra grande' };
  var GROUPS = ['Portafolio', 'Mercado', 'Ingresos', 'Apuntes'];
  var DEMO = /hubdemo/.test(location.search);
  var hubEl = document.getElementById('hub'), editBtn = document.getElementById('hubEdit');
  var rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = function () { return rmq.matches; };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function mk(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function clone(o) { return JSON.parse(JSON.stringify(o == null ? {} : o)); }
  var seq = 0; function uid() { return 'w' + Date.now().toString(36) + (seq++).toString(36); }
  function ic(p, vb) { return '<svg viewBox="' + (vb || '0 0 20 20') + '" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var I = {
    grip: '<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" aria-hidden="true"><circle cx="7.5" cy="5" r="1.25"/><circle cx="12.5" cy="5" r="1.25"/><circle cx="7.5" cy="10" r="1.25"/><circle cx="12.5" cy="10" r="1.25"/><circle cx="7.5" cy="15" r="1.25"/><circle cx="12.5" cy="15" r="1.25"/></svg>',
    more: '<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" aria-hidden="true"><circle cx="4.5" cy="10" r="1.4"/><circle cx="10" cy="10" r="1.4"/><circle cx="15.5" cy="10" r="1.4"/></svg>',
    x: ic('<path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/>'), up: ic('<path d="M5 12l5-5 5 5"/>'), dn: ic('<path d="M5 8l5 5 5-5"/>'),
    chev: ic('<path d="M6 8l4 4 4-4"/>'), check: ic('<path d="M4.5 10.5l3.5 3.5 7.5-8"/>'), search: ic('<circle cx="9" cy="9" r="5"/><path d="M13 13l4 4"/>'),
    plus: ic('<path d="M10 4.5v11M4.5 10h11"/>'), rs: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M13 6l-7 7M13 10l-3 3"/></svg>'
  };

  /* ---------------- estado ---------------- */
  var defs = {}, regOrder = [];
  var state = { widgets: [] }, orphans = [], inst = {};
  var editing = false, cols = COLS, rendered = false, undo = [], memStore = null, grab = null, drag = null, rsz = null;
  var grid, bar, emptyEl, liveEl, toastEl, toastT = 0, lastW = 0, themeCbs = [];

  /* ---------------- registro ---------------- */
  function register(type, def) {
    if (!type || !def) return;
    def.sizes = (def.sizes || ['M']).filter(function (s) { return SZ[s]; }); if (!def.sizes.length) def.sizes = ['M'];
    if (!def.size || def.sizes.indexOf(def.size) < 0) def.size = def.sizes[0];
    def.label = def.label || type; def.group = def.group || 'Mercado';
    if (!defs[type]) regOrder.push(type); defs[type] = def;
    if (rendered) { adoptOrphans(type); refreshGallery(); }
  }
  function adoptOrphans(type) {
    var mine = orphans.filter(function (o) { return o.type === type; }); if (!mine.length) return;
    orphans = orphans.filter(function (o) { return o.type !== type; });
    var list = clone(state.widgets).concat(normalize(mine, true)); restoreList(list); save();
  }

  /* ---------------- persistencia ---------------- */
  function loadStored() {
    var raw = null; try { raw = localStorage.getItem(KEY); } catch (e) { }
    if (raw == null) raw = memStore; if (!raw) return null;
    try { var o = JSON.parse(raw); if (o && Array.isArray(o.widgets)) return o.widgets; } catch (e) { } return null;
  }
  function save() {
    var s = JSON.stringify({ widgets: state.widgets.concat(orphans) }); memStore = s;
    try { localStorage.setItem(KEY, s); } catch (e) { }
  }
  function int(v) { v = Math.round(+v); return isFinite(v) && v > 0 ? v : 0; }
  function normalize(list, keepOrphans) {
    var seen = {}, out = [];
    list.forEach(function (w) {
      if (!w || typeof w.type !== 'string') return; var d = defs[w.type];
      if (!d) { if (!keepOrphans) orphans.push(w); return; }
      var size = SZ[w.size] && d.sizes.indexOf(w.size) >= 0 ? w.size : d.size, id = w.id && !seen[w.id] ? String(w.id) : uid(); seen[id] = 1;
      out.push({ id: id, type: w.type, title: typeof w.title === 'string' ? w.title : '', size: size, x: int(w.x), y: int(w.y), w: SZ[size][0], h: SZ[size][1], config: w.config && typeof w.config === 'object' ? w.config : {} });
    });
    compact(out, null); return out;
  }

  /* ---------------- preajustes ---------------- */
  var PRESETS = {
    'Inversor': [['portfolio', 'L', 0, 0], ['chart', 'L', 6, 0], ['watchlist', 'M', 0, 9], ['dividends', 'M', 6, 9], ['risk', 'M', 0, 15], ['macro', 'M', 6, 15]],
    'Trader': [['chart', 'XL', 0, 0], ['watchlist', 'L', 0, 9], ['macro', 'L', 6, 9]],
    'Ingresos por dividendos': [['dividends', 'L', 0, 0], ['portfolio', 'L', 6, 0], ['risk', 'M', 0, 9], ['macro', 'M', 6, 9]]
  };
  function presetName(p) {
    if (!p) return DEMO && !hasReal() ? 'Demo' : 'Inversor'; var n = norm(p);
    if (n === 'demo' && PRESETS.Demo) return 'Demo';
    if (n.indexOf('trad') === 0) return 'Trader'; if (n.indexOf('divid') === 0 || n.indexOf('ingres') === 0) return 'Ingresos por dividendos'; return 'Inversor';
  }
  function hasReal() { return regOrder.some(function (t) { return t.indexOf('demo-') !== 0; }); }
  function buildPreset(name) {
    var rows = PRESETS[name] || PRESETS.Inversor, list = [];
    rows.forEach(function (r) {
      var d = defs[r[0]]; if (!d) return; var size = d.sizes.indexOf(r[1]) >= 0 ? r[1] : d.size;
      list.push({ id: uid(), type: r[0], title: '', size: size, x: r[2], y: r[3], w: SZ[size][0], h: SZ[size][1], config: {} });
    });
    compact(list, null); return list;
  }

  /* ---------------- motor de rejilla ---------------- */
  function overlap(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }
  function hit(it, list) { for (var i = 0; i < list.length; i++) if (list[i] !== it && overlap(it, list[i])) return true; return false; }
  function byYX(a, b) { return a.y - b.y || a.x - b.x; }
  function clampItem(it, C) { C = C || COLS; it.x = clamp(it.x, 0, Math.max(0, C - it.w)); if (it.y < 0) it.y = 0; }
  /* react-grid-layout: el movido manda; los demás suben cuanto puedan y bajan si chocan */
  function compact(items, movedId) {
    var moved = null, rest = [], placed = [];
    items.forEach(function (it) { if (movedId != null && it.id === movedId) moved = it; else rest.push(it); });
    rest.sort(byYX);
    if (moved) { clampItem(moved); placed.push(moved); }
    rest.forEach(function (it) {
      clampItem(it);
      while (it.y > 0) { it.y--; if (hit(it, placed)) { it.y++; break; } }
      while (hit(it, placed)) it.y++;
      placed.push(it);
    });
  }
  function firstHole(placed, w, h, C) {
    for (var y = 0; y < 2000; y++) for (var x = 0; x + w <= C; x++) { var c = { x: x, y: y, w: w, h: h }; if (!hit(c, placed)) return c; }
    return { x: 0, y: 0, w: w, h: h };
  }
  function derive() {
    var out = {}, list;
    if (cols === COLS) { state.widgets.forEach(function (w) { out[w.id] = { x: w.x, y: w.y, w: w.w, h: w.h }; }); return out; }
    list = state.widgets.slice().sort(byYX);
    if (cols === 1) { var y = 0; list.forEach(function (w) { out[w.id] = { x: 0, y: y, w: 1, h: w.h }; y += w.h; }); return out; }
    var placed = []; list.forEach(function (w) { var p = firstHole(placed, w.size === 'S' ? 3 : 6, w.h, 6); placed.push(p); out[w.id] = p; }); return out;
  }
  function place(el, p) { el.style.gridColumn = (p.x + 1) + ' / span ' + p.w; el.style.gridRow = (p.y + 1) + ' / span ' + p.h; }
  function applyLayout() {
    if (!grid) return; var L = derive(); grid.style.setProperty('--cols', cols); hubEl.dataset.cols = cols;
    state.widgets.forEach(function (w) { var e = inst[w.id]; if (e) place(e.el, L[w.id]); });
    if (drag && drag.ghost) place(drag.ghost, { x: drag.w.x, y: drag.w.y, w: drag.w.w, h: drag.w.h });
    emptyEl.hidden = state.widgets.length > 0; grid.hidden = !state.widgets.length;
  }
  function measure() { var m = {}; state.widgets.forEach(function (w) { var e = inst[w.id]; if (e) m[w.id] = e.el.getBoundingClientRect(); }); return m; }
  function flip(mutate, skipId) {
    var anim = !reduced() && rendered, before = anim ? measure() : null;
    if (anim) state.widgets.forEach(function (w) { var e = inst[w.id]; if (e && w.id !== skipId) e.el.getAnimations().forEach(function (a) { if (a.id === 'flip') a.cancel(); }); });
    mutate(); if (!anim) return;
    var after = measure();
    Object.keys(after).forEach(function (id) {
      if (id === skipId || !before[id]) return;
      var dx = before[id].left - after[id].left, dy = before[id].top - after[id].top; if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      var a = inst[id].el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 220, easing: EASE }); a.id = 'flip';
    });
  }
  function resizeAll(ids) {
    state.widgets.forEach(function (w) { if (ids && ids.indexOf(w.id) < 0) return; var e = inst[w.id]; if (e && e.ins && e.ins.resize) { try { e.ins.resize(); } catch (x) { console.error(x); } } });
  }
  function afterFlip(ids) { requestAnimationFrame(function () { resizeAll(ids); }); setTimeout(function () { resizeAll(ids); }, reduced() ? 30 : 250); }
  function settle() { flip(function () { compact(state.widgets, null); applyLayout(); syncDom(); }); afterFlip(); }
  function syncDom() {
    var want = state.widgets.slice().sort(byYX).map(function (w) { return inst[w.id] && inst[w.id].el; }).filter(Boolean), cur = Array.prototype.filter.call(grid.children, function (c) { return c.classList.contains('hw'); });
    if (want.every(function (e, i) { return cur[i] === e; })) return;
    var act = document.activeElement; want.forEach(function (e) { grid.appendChild(e); }); if (act && act !== document.body && act.isConnected && document.activeElement !== act) act.focus({ preventScroll: true });
  }
  function byId(id) { for (var i = 0; i < state.widgets.length; i++) if (state.widgets[i].id === id) return state.widgets[i]; return null; }
  function snapshot() { return JSON.stringify(state.widgets); }
  function pushUndo(snap) { undo.push(snap || snapshot()); if (undo.length > UNDO_MAX) undo.shift(); syncBar(); }
  function undoOnce() {
    if (!undo.length) return; var list = JSON.parse(undo.pop()); restoreList(list); save(); syncBar(); announce('Cambio deshecho.');
  }
  function restoreList(list) {
    flip(function () {
      var ids = {}; list.forEach(function (w) { ids[w.id] = 1; });
      state.widgets.slice().forEach(function (w) { if (!ids[w.id]) unmount(w.id); });
      var next = [], chg = [];
      list.forEach(function (sw) {
        var cur = byId(sw.id);
        if (cur) {
          var cfgChanged = JSON.stringify(cur.config) !== JSON.stringify(sw.config), sizeChanged = cur.size !== sw.size;
          cur.type = sw.type; cur.title = sw.title; cur.size = sw.size; cur.x = sw.x; cur.y = sw.y; cur.w = sw.w; cur.h = sw.h; cur.config = sw.config;
          var e = inst[cur.id]; if (e) { e.el.dataset.size = cur.size; e.setTitle(cur.title || defs[cur.type].label, true); if (sizeChanged) chg.push(cur.id); if (cfgChanged && e.ins && e.ins.update) { try { e.ins.update(cfgOf(cur)); } catch (x) { } } }
          next.push(cur);
        } else { next.push(sw); }
      });
      state.widgets = next; next.forEach(function (w) { if (!inst[w.id]) mount(w, true); });
      applyLayout(); syncDom(); refreshGallery();
    }); afterFlip();
  }

  /* ---------------- instancias ---------------- */
  function cfgOf(w) { var d = defs[w.type]; return Object.assign(clone(d.defaults), w.config); }
  function mount(w, added) {
    var d = defs[w.type]; if (!d) return null;
    var el = mk('article', 'hw' + (added ? ' hw-add' : '')); el.dataset.type = w.type; el.dataset.size = w.size; el.dataset.id = w.id;
    var ttl = w.title || d.label;
    el.innerHTML = '<header class="hw-head"><button type="button" class="hw-grip" aria-pressed="false">' + I.grip + '</button>' +
      '<span class="hw-mv"><button type="button" class="hw-up">' + I.up + '</button><button type="button" class="hw-dn">' + I.dn + '</button></span>' +
      '<h3 class="hw-title"></h3><span class="hw-meta"></span><span class="hw-sp"></span><div class="hw-headslot"></div>' +
      '<button type="button" class="hw-more" aria-haspopup="menu" aria-expanded="false">' + I.more + '</button><button type="button" class="hw-x">' + I.x + '</button></header>' +
      '<div class="hw-body"></div><button type="button" class="hw-rs" tabindex="-1" aria-hidden="true">' + I.rs + '</button>';
    var e = { el: el, ins: null, ctx: null, themeCbs: [] };
    var titleEl = $('.hw-title', el), metaEl = $('.hw-meta', el), body = $('.hw-body', el), head = $('.hw-headslot', el);
    e.setTitle = function (t, noSave) { titleEl.textContent = t; if (!noSave) { w.title = t === d.label ? '' : t; save(); } labels(t); };
    function labels(t) {
      var set = function (s, k, v) { var b = $(s, el); b.setAttribute('aria-label', v); b.title = v; }; set('.hw-grip', 0, 'Mover ' + t + '. Enter para agarrar y flechas para mover');
      set('.hw-up', 0, 'Subir ' + t); set('.hw-dn', 0, 'Bajar ' + t); set('.hw-more', 0, 'Opciones de ' + t); set('.hw-x', 0, 'Quitar ' + t);
    }
    titleEl.textContent = ttl; labels(ttl);
    var ctx = {
      id: w.id, type: w.type, D: window.PORTIFY_DEMO, fmt: window.PORTIFY_DEMO && window.PORTIFY_DEMO.fmt, head: head,
      setTitle: function (t) { e.setTitle(t); }, setMeta: function (t) { metaEl.textContent = t || ''; metaEl.title = t || ''; },
      save: function (patch) { Object.assign(w.config, patch); save(); if (e.ins && e.ins.update) { try { e.ins.update(cfgOf(w)); } catch (x) { console.error(x); } } },
      onTheme: function (cb) { e.themeCbs.push(cb); themeCbs.push(cb); }, reduced: reduced,
      openPosition: function (t) { document.dispatchEvent(new CustomEvent('campo:open-position', { detail: { ticker: t } })); }
    };
    Object.defineProperty(ctx, 'size', { get: function () { return w.size; } });
    Object.defineProperty(ctx, 'config', { get: function () { return cfgOf(w); } });
    e.ctx = ctx; inst[w.id] = e; grid.appendChild(el);
    try { e.ins = d.render(body, ctx) || {}; } catch (x) { console.error(x); body.innerHTML = '<p class="hw-err">No se pudo cargar este widget.</p>'; e.ins = {}; }
    wire(w, e); return e;
  }
  function unmount(id) {
    var e = inst[id]; if (!e) return;
    try { if (e.ins && e.ins.destroy) e.ins.destroy(); } catch (x) { }
    themeCbs = themeCbs.filter(function (c) { return e.themeCbs.indexOf(c) < 0; });
    if (e.el.contains(document.activeElement)) { try { editBtn && editBtn.focus({ preventScroll: true }); } catch (x) { } }
    e.el.remove(); delete inst[id]; state.widgets = state.widgets.filter(function (w) { return w.id !== id; });
  }
  function wire(w, e) {
    var el = e.el;
    $('.hw-more', el).addEventListener('click', function (ev) { widgetMenu(w, ev.currentTarget); });
    $('.hw-x', el).addEventListener('click', function () { removeWidget(w.id); });
    $('.hw-up', el).addEventListener('click', function () { moveOrder(w, -1); });
    $('.hw-dn', el).addEventListener('click', function () { moveOrder(w, 1); });
    var grip = $('.hw-grip', el);
    grip.addEventListener('pointerdown', function (ev) { startDrag(ev, w, e, grip); });
    grip.addEventListener('keydown', function (ev) { gripKey(ev, w, e, grip); });
    grip.addEventListener('blur', function () { if (grab && grab.id === w.id) endGrab(true); });
    $('.hw-rs', el).addEventListener('pointerdown', function (ev) { startResize(ev, w, e, ev.currentTarget); });
  }

  /* ---------------- operaciones ---------------- */
  function announce(msg) { if (!liveEl) return; liveEl.textContent = ''; setTimeout(function () { liveEl.textContent = msg; }, 30); }
  function pos(w) { return 'Fila ' + (w.y + 1) + ', columna ' + (w.x + 1); }
  function flash(id) { var e = inst[id]; if (!e) return; e.el.classList.remove('hw-flash'); void e.el.offsetWidth; e.el.classList.add('hw-flash'); setTimeout(function () { e.el.classList.remove('hw-flash'); }, 1100); }
  function addWidget(type) {
    var d = defs[type]; if (!d || !rendered) return null;
    if (!d.duplicable && state.widgets.some(function (w) { return w.type === type; })) return null;
    var snap = snapshot(), p = firstHole(state.widgets, SZ[d.size][0], SZ[d.size][1], COLS);
    var w = { id: uid(), type: type, title: '', size: d.size, x: p.x, y: p.y, w: p.w, h: p.h, config: {} };
    flip(function () { state.widgets.push(w); mount(w, true); applyLayout(); syncDom(); });
    pushUndo(snap); save(); refreshGallery(); flash(w.id); afterFlip([w.id]);
    var e = inst[w.id]; if (e) e.el.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
    announce('Añadiste ' + d.label + '. ' + pos(w)); if (gal && window.innerWidth < 560) closeGallery(); return w.id;
  }
  function removeWidget(id) {
    var w = byId(id); if (!w) return; var title = (inst[id] && $('.hw-title', inst[id].el).textContent) || defs[w.type].label, snap = snapshot();
    flip(function () { unmount(id); compact(state.widgets, null); applyLayout(); syncDom(); }); pushUndo(snap); save(); refreshGallery(); afterFlip();
    showToast('Quitaste ' + title, 'Deshacer', function () { undoOnce(); });
  }
  function duplicateWidget(w) {
    var d = defs[w.type], snap = snapshot(), p = firstHole(state.widgets, w.w, w.h, COLS);
    var n = { id: uid(), type: w.type, title: w.title, size: w.size, x: p.x, y: p.y, w: w.w, h: w.h, config: clone(w.config) };
    flip(function () { state.widgets.push(n); mount(n, true); applyLayout(); syncDom(); }); pushUndo(snap); save(); refreshGallery(); flash(n.id); afterFlip([n.id]);
    var e = inst[n.id]; if (e) e.el.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); announce('Duplicaste ' + d.label + '. ' + pos(n));
  }
  function setSize(w, size, noUndo) {
    var d = defs[w.type]; if (w.size === size || d.sizes.indexOf(size) < 0) return;
    if (!noUndo) pushUndo();
    flip(function () { w.size = size; w.w = SZ[size][0]; w.h = SZ[size][1]; inst[w.id].el.dataset.size = size; compact(state.widgets, w.id); if (!noUndo) compact(state.widgets, null); applyLayout(); });
    save(); afterFlip(); announce('Tamaño ' + SNAME[size] + ' (' + size + ').');
  }
  function moveOrder(w, dir) {
    var list = state.widgets.slice().sort(byYX), i = list.indexOf(w), j = i + dir; if (j < 0 || j >= list.length) return;
    pushUndo(); var t = list[i]; list[i] = list[j]; list[j] = t;
    flip(function () { var placed = []; list.forEach(function (it) { var p = firstHole(placed, it.w, it.h, COLS); it.x = p.x; it.y = p.y; placed.push(it); }); applyLayout(); syncDom(); });
    save(); announce('Posición ' + (j + 1) + ' de ' + list.length + '.');
    var b = $(dir < 0 ? '.hw-up' : '.hw-dn', inst[w.id].el); if (b) b.focus({ preventScroll: true });
  }
  function resetTo(name) {
    var list = buildPreset(presetName(name)); pushUndo(); restoreList(list); save(); announce('Inicio restablecido.');
  }

  /* ---------------- arrastre ---------------- */
  function metrics() { var r = grid.getBoundingClientRect(); return { left: r.left, top: r.top, sx: (r.width + GAP) / COLS, sy: ROW + GAP }; }
  function startDrag(ev, w, e, grip) {
    if (!editing || cols !== COLS || ev.button > 0 || drag || grab) return;
    ev.preventDefault(); try { grip.setPointerCapture(ev.pointerId); } catch (x) { }
    var r = e.el.getBoundingClientRect();
    drag = { w: w, e: e, grip: grip, pid: ev.pointerId, gx: ev.clientX - r.left, gy: ev.clientY - r.top, before: snapshot(), last: ev, tm: 0 };
    drag.ghost = mk('div', 'hw-ghost'); drag.ghost.setAttribute('aria-hidden', 'true'); grid.appendChild(drag.ghost); applyLayout();
    e.el.classList.add('is-drag'); hubEl.classList.add('is-dragging');
    grip.addEventListener('pointermove', onDragMove); grip.addEventListener('pointerup', onDragEnd); grip.addEventListener('pointercancel', onDragEnd);
    drag.tm = setInterval(function () { if (!drag) return; var y = drag.last.clientY, v = window.innerHeight; if (y > v - 90) window.scrollBy(0, 14); else if (y < 90) window.scrollBy(0, -14); else return; dragTo(drag.last); }, 16);
    dragTo(ev);
  }
  function onDragMove(ev) { if (drag && ev.pointerId === drag.pid) { drag.last = ev; dragTo(ev); } }
  function dragTo(ev) {
    var m = metrics(), w = drag.w, L = ev.clientX - m.left - drag.gx, T = ev.clientY - m.top - drag.gy;
    var tx = clamp(Math.round(L / m.sx), 0, COLS - w.w), ty = Math.max(0, Math.round(T / m.sy));
    if (tx !== w.x || ty !== w.y) {
      flip(function () { w.x = tx; w.y = ty; compact(state.widgets, w.id); applyLayout(); }, w.id);
      announce(pos(w));
    }
    drag.e.el.style.transform = 'translate(' + (L - w.x * m.sx) + 'px,' + (T - w.y * m.sy) + 'px) scale(1.01)';
  }
  function onDragEnd(ev) { if (drag && ev.pointerId === drag.pid) finishDrag(ev.type === 'pointerup'); }
  function finishDrag(commit) {
    if (!drag) return; var d = drag; drag = null; clearInterval(d.tm);
    d.grip.removeEventListener('pointermove', onDragMove); d.grip.removeEventListener('pointerup', onDragEnd); d.grip.removeEventListener('pointercancel', onDragEnd);
    try { d.grip.releasePointerCapture(d.pid); } catch (x) { }
    var el = d.e.el, from = el.style.transform || 'none';
    el.style.transform = ''; el.classList.remove('is-drag'); hubEl.classList.remove('is-dragging'); d.ghost.remove();
    if (!commit) { restoreList(JSON.parse(d.before)); return; }
    flip(function () { compact(state.widgets, null); applyLayout(); syncDom(); }, d.w.id);
    if (!reduced() && from !== 'none') { var a = el.animate([{ transform: from }, { transform: 'none' }], { duration: 180, easing: EASE }); a.id = 'flip'; }
    if (snapshot() !== d.before) { pushUndo(d.before); save(); announce('Soltaste ' + defs[d.w.type].label + '. ' + pos(d.w)); }
    afterFlip();
  }

  /* ---------------- redimensionar ---------------- */
  function startResize(ev, w, e, handle) {
    if (!editing || cols !== COLS || ev.button > 0 || rsz || drag) return;
    ev.preventDefault(); try { handle.setPointerCapture(ev.pointerId); } catch (x) { }
    var r = e.el.getBoundingClientRect(); rsz = { w: w, e: e, h: handle, pid: ev.pointerId, x0: ev.clientX, y0: ev.clientY, W: r.width, H: r.height, before: snapshot() };
    e.el.classList.add('is-rsz'); hubEl.classList.add('is-dragging');
    handle.addEventListener('pointermove', onRsMove); handle.addEventListener('pointerup', onRsEnd); handle.addEventListener('pointercancel', onRsEnd);
  }
  function onRsMove(ev) {
    if (!rsz || ev.pointerId !== rsz.pid) return; var m = metrics(), w = rsz.w, d = defs[w.type];
    var cw = (rsz.W + ev.clientX - rsz.x0 + GAP) / m.sx, ch = (rsz.H + ev.clientY - rsz.y0 + GAP) / m.sy, best = w.size, bd = 1e9;
    d.sizes.forEach(function (s) { var dd = Math.pow(SZ[s][0] - cw, 2) * 1.5 + Math.pow(SZ[s][1] - ch, 2); if (dd < bd) { bd = dd; best = s; } });
    if (best !== w.size) { flip(function () { w.size = best; w.w = SZ[best][0]; w.h = SZ[best][1]; rsz.e.el.dataset.size = best; compact(state.widgets, w.id); applyLayout(); }); announce('Tamaño ' + SNAME[best] + '.'); afterFlip([w.id]); }
  }
  function onRsEnd(ev) {
    if (!rsz || ev.pointerId !== rsz.pid) return; var r = rsz; rsz = null;
    r.h.removeEventListener('pointermove', onRsMove); r.h.removeEventListener('pointerup', onRsEnd); r.h.removeEventListener('pointercancel', onRsEnd);
    try { r.h.releasePointerCapture(r.pid); } catch (x) { }
    r.e.el.classList.remove('is-rsz'); hubEl.classList.remove('is-dragging');
    if (ev.type === 'pointercancel') { restoreList(JSON.parse(r.before)); return; }
    settle(); if (snapshot() !== r.before) { pushUndo(r.before); save(); }
  }

  /* ---------------- teclado (alternativa sin arrastre) ---------------- */
  function gripKey(ev, w, e, grip) {
    var k = ev.key;
    if (!grab) { if (k === 'Enter' || k === ' ') { ev.preventDefault(); grab = { id: w.id, before: snapshot(), grip: grip }; grip.setAttribute('aria-pressed', 'true'); e.el.classList.add('is-grab'); announce('Agarraste ' + defs[w.type].label + '. ' + pos(w) + '. Flechas para mover, Mayús con flechas para el tamaño, Enter para soltar, Escape para cancelar.'); } return; }
    if (k === 'Enter' || k === ' ') { ev.preventDefault(); endGrab(true); announce('Soltaste. ' + pos(w)); return; }
    if (k === 'Escape') { ev.preventDefault(); ev.stopPropagation(); endGrab(false); return; }
    var dx = k === 'ArrowRight' ? 1 : k === 'ArrowLeft' ? -1 : 0, dy = k === 'ArrowDown' ? 1 : k === 'ArrowUp' ? -1 : 0; if (!dx && !dy) return;
    ev.preventDefault(); ev.stopPropagation(); var d = defs[w.type];
    if (ev.shiftKey) {
      var i = d.sizes.indexOf(w.size), j = clamp(i + (dx + dy), 0, d.sizes.length - 1); if (j !== i) { flip(function () { var s = d.sizes[j]; w.size = s; w.w = SZ[s][0]; w.h = SZ[s][1]; e.el.dataset.size = s; compact(state.widgets, w.id); applyLayout(); }); announce('Tamaño ' + SNAME[w.size] + ' (' + w.size + '). ' + pos(w)); afterFlip([w.id]); }
      return;
    }
    var bottom = 0; state.widgets.forEach(function (o) { if (o !== w) bottom = Math.max(bottom, o.y + o.h); });
    var nx = clamp(w.x + dx, 0, COLS - w.w), ny = clamp(w.y + dy, 0, bottom); if (nx === w.x && ny === w.y) { announce(pos(w)); return; }
    flip(function () { w.x = nx; w.y = ny; compact(state.widgets, w.id); applyLayout(); }); announce(pos(w)); e.el.scrollIntoView({ block: 'nearest' });
  }
  function endGrab(commit) {
    if (!grab) return; var g = grab; grab = null; g.grip.setAttribute('aria-pressed', 'false'); var e = inst[g.id]; if (e) e.el.classList.remove('is-grab');
    if (!commit) { restoreList(JSON.parse(g.before)); announce('Movimiento cancelado.'); return; }
    settle(); if (snapshot() !== g.before) { pushUndo(g.before); save(); }
  }

  /* ---------------- menús ---------------- */
  var menuEl = null, menuAnchor = null;
  function closeMenu(refocus) {
    if (!menuEl) return; menuEl.remove(); menuEl = null; document.removeEventListener('pointerdown', menuOutside, true);
    if (menuAnchor) { menuAnchor.setAttribute('aria-expanded', 'false'); if (refocus) menuAnchor.focus({ preventScroll: true }); } menuAnchor = null;
  }
  function menuOutside(ev) { if (menuEl && !menuEl.contains(ev.target) && !(menuAnchor && menuAnchor.contains(ev.target))) closeMenu(false); }
  function openMenu(anchor, items) {
    var was = menuAnchor === anchor; closeMenu(false); if (was) return;
    var m = mk('div', 'hub-menu'); m.setAttribute('role', 'menu'); menuEl = m; menuAnchor = anchor; anchor.setAttribute('aria-expanded', 'true');
    items.forEach(function (it) {
      if (it.heading) { m.appendChild(mk('div', 'hub-menu-h', esc(it.heading))); return; }
      if (it.sep) { m.appendChild(mk('div', 'hub-menu-sep')); return; }
      var b = mk('button', 'hub-mi' + (it.danger ? ' danger' : ''), (it.radio ? '<i class="hub-ck">' + (it.checked ? I.check : '') + '</i>' : '') + '<span>' + esc(it.label) + '</span>');
      b.type = 'button'; b.setAttribute('role', it.radio ? 'menuitemradio' : 'menuitem'); if (it.radio) b.setAttribute('aria-checked', it.checked ? 'true' : 'false');
      b.addEventListener('click', function () { var a = anchor; closeMenu(false); a.focus({ preventScroll: true }); it.run(); });
      m.appendChild(b);
    });
    document.body.appendChild(m);
    var r = anchor.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
    var left = clamp(r.right - mw, 8, window.innerWidth - mw - 8), top = r.bottom + 6; if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
    m.style.left = left + 'px'; m.style.top = top + 'px';
    var its = Array.prototype.slice.call(m.querySelectorAll('.hub-mi')); if (its[0]) its[0].focus();
    m.addEventListener('keydown', function (ev) {
      var i = its.indexOf(document.activeElement);
      if (ev.key === 'ArrowDown') { ev.preventDefault(); its[(i + 1) % its.length].focus(); } else if (ev.key === 'ArrowUp') { ev.preventDefault(); its[(i - 1 + its.length) % its.length].focus(); }
      else if (ev.key === 'Home') { ev.preventDefault(); its[0].focus(); } else if (ev.key === 'End') { ev.preventDefault(); its[its.length - 1].focus(); }
      else if (ev.key === 'Tab') closeMenu(false);
    });
    document.addEventListener('pointerdown', menuOutside, true);
  }
  function widgetMenu(w, anchor) {
    var d = defs[w.type], items = [];
    if (d.settings) items.push({ label: 'Configurar', run: function () { openSettings(w, anchor); } });
    if (d.sizes.length > 1) { items.push({ heading: 'Tamaño' }); d.sizes.forEach(function (s) { items.push({ label: SNAME[s] + ' · ' + s, radio: true, checked: w.size === s, run: function () { setSize(w, s); } }); }); }
    if (d.duplicable) items.push({ label: 'Duplicar', run: function () { duplicateWidget(w); } });
    if (items.length) items.push({ sep: true });
    items.push({ label: 'Quitar', danger: true, run: function () { removeWidget(w.id); } });
    openMenu(anchor, items);
  }

  /* ---------------- hoja modal (Configurar / confirmar) ---------------- */
  var sheet = null;
  function openSheet(o) {
    closeSheet(true);
    var opener = o.returnFocus || document.activeElement, scrim = mk('div', 'hub-scrim hub-scrim-s'), d = mk('div', 'hub-sheet'), id = 'hubSh' + (seq++);
    d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', id);
    d.innerHTML = '<h2 class="hub-sheet-t" id="' + id + '">' + esc(o.title) + '</h2><div class="hub-sheet-b"></div><div class="hub-sheet-f"></div>';
    var body = $('.hub-sheet-b', d), foot = $('.hub-sheet-f', d); if (o.body) o.body(body);
    (o.buttons || []).forEach(function (b) { var x = mk('button', 'btn btn-sm ' + (b.primary ? 'btn-primary' : 'btn-secondary'), esc(b.label)); x.type = 'button'; x.addEventListener('click', function () { closeSheet(false); if (b.run) b.run(); }); foot.appendChild(x); });
    scrim.addEventListener('click', function () { closeSheet(false); });
    d.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Tab') return; var f = Array.prototype.slice.call(d.querySelectorAll('button,input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter(function (n) { return !n.disabled && n.offsetParent !== null; }); if (!f.length) return;
      var a = document.activeElement; if (ev.shiftKey && a === f[0]) { ev.preventDefault(); f[f.length - 1].focus(); } else if (!ev.shiftKey && a === f[f.length - 1]) { ev.preventDefault(); f[0].focus(); }
    });
    document.body.appendChild(scrim); document.body.appendChild(d); sheet = { scrim: scrim, d: d, opener: opener };
    requestAnimationFrame(function () { scrim.classList.add('on'); d.classList.add('on'); });
    var first = d.querySelector('input,select,textarea') || foot.querySelector('.btn-primary') || foot.querySelector('button'); if (first) first.focus();
  }
  function closeSheet(silent) {
    if (!sheet) return; var s = sheet; sheet = null; s.scrim.classList.remove('on'); s.d.classList.remove('on');
    setTimeout(function () { s.scrim.remove(); s.d.remove(); }, reduced() ? 0 : 200);
    if (!silent && s.opener && s.opener.isConnected) s.opener.focus({ preventScroll: true });
  }
  function openSettings(w, opener) {
    var d = defs[w.type], e = inst[w.id];
    openSheet({ title: 'Configurar · ' + $('.hw-title', e.el).textContent, returnFocus: opener, body: function (b) { var f = mk('div', 'hub-form'); b.appendChild(f); try { d.settings(f, cfgOf(w), function (patch) { e.ctx.save(patch); }); } catch (x) { console.error(x); f.textContent = 'Este widget no tiene ajustes.'; } }, buttons: [{ label: 'Listo', primary: true }] });
  }
  function confirmReset(name, opener) {
    openSheet({ title: 'Restablecer inicio', returnFocus: opener, body: function (b) { b.innerHTML = '<p>Vas a reemplazar la disposición actual por el preajuste <b>' + esc(name) + '</b>. Puedes deshacerlo con Ctrl+Z.</p>'; }, buttons: [{ label: 'Cancelar' }, { label: 'Restablecer', primary: true, run: function () { resetTo(name); } }] });
  }

  /* ---------------- aviso con acción ---------------- */
  function showToast(msg, label, run) {
    if (!toastEl) { toastEl = mk('div', 'hub-toast'); toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.innerHTML = '<span></span>'; toastEl.firstChild.textContent = msg;
    if (label) { var b = mk('button', 'hub-toast-a', esc(label)); b.type = 'button'; b.addEventListener('click', function () { hideToast(); run(); }); toastEl.appendChild(b); }
    toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(hideToast, 6000);
  }
  function hideToast() { if (toastEl) toastEl.classList.remove('on'); clearTimeout(toastT); }

  /* ---------------- galería ---------------- */
  var gal = null;
  function closeDrawer() { if (document.querySelector('.fi')) { synth = true; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); synth = false; } }
  var synth = false;
  function openGallery(trigger) {
    if (gal) { gal.input.focus(); return; } if (!rendered) return; closeDrawer(); closeMenu(false);
    var scrim = mk('div', 'hub-scrim'), p = mk('aside', 'hub-panel'); p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Añadir widget');
    p.innerHTML = '<div class="hp-head"><h2>Añadir widget</h2><button type="button" class="hp-x" aria-label="Cerrar">' + I.x + '</button></div>' +
      '<label class="hp-search"><span class="sr">Buscar widgets</span>' + I.search + '<input type="search" placeholder="Buscar widgets" autocomplete="off" spellcheck="false"></label>' +
      '<div class="hp-chips" role="group" aria-label="Filtrar por grupo"></div><div class="hp-list" role="list"></div><p class="hp-empty" hidden></p>';
    gal = { el: p, scrim: scrim, input: $('input', p), chips: $('.hp-chips', p), list: $('.hp-list', p), none: $('.hp-empty', p), group: 'Todos', q: '', trigger: trigger || document.activeElement };
    var gs = ['Todos'].concat(GROUPS.filter(function (g) { return regOrder.some(function (t) { return defs[t].group === g; }); }));
    gs.forEach(function (g) { var c = mk('button', 'hp-chip', esc(g)); c.type = 'button'; c.setAttribute('aria-pressed', g === 'Todos'); c.addEventListener('click', function () { gal.group = g; Array.prototype.forEach.call(gal.chips.children, function (x) { x.setAttribute('aria-pressed', x === c); }); fillGallery(); }); gal.chips.appendChild(c); });
    gal.input.addEventListener('input', function () { gal.q = norm(gal.input.value); fillGallery(); });
    $('.hp-x', p).addEventListener('click', function () { closeGallery(true); }); scrim.addEventListener('click', function () { closeGallery(true); });
    document.body.appendChild(scrim); document.body.appendChild(p); fillGallery();
    requestAnimationFrame(function () { scrim.classList.add('on'); p.classList.add('on'); }); setTimeout(function () { if (gal) gal.input.focus(); }, 60);
  }
  function closeGallery(refocus) {
    if (!gal) return; var g = gal; gal = null; g.el.classList.remove('on'); g.scrim.classList.remove('on');
    setTimeout(function () { g.el.remove(); g.scrim.remove(); }, reduced() ? 0 : 260);
    if (refocus && g.trigger && g.trigger.isConnected) g.trigger.focus({ preventScroll: true });
  }
  function refreshGallery() { if (gal) fillGallery(); }
  function fillGallery() {
    var L = gal.list, shown = 0; L.innerHTML = '';
    regOrder.forEach(function (t) {
      var d = defs[t]; if (gal.group !== 'Todos' && d.group !== gal.group) return; if (gal.q && norm(d.label + ' ' + d.desc + ' ' + d.group).indexOf(gal.q) < 0) return;
      var has = state.widgets.some(function (w) { return w.type === t; }), off = has && !d.duplicable;
      var c = mk('button', 'hg-card'); c.type = 'button'; c.setAttribute('role', 'listitem'); c.dataset.type = t; if (off) c.setAttribute('aria-disabled', 'true');
      var th = mk('div', 'hg-thumb'); th.setAttribute('aria-hidden', 'true'); try { if (d.thumb) d.thumb(th); else th.innerHTML = d.icon || ''; } catch (x) { th.innerHTML = d.icon || ''; }
      var dots = d.sizes.map(function (s) { return '<i class="hg-dot' + (s === d.size ? ' def' : '') + '" data-s="' + s + '"></i>'; }).join('');
      var tx = mk('div', 'hg-tx', '<b class="hg-n">' + esc(d.label) + '</b><span class="hg-d">' + esc(d.desc || '') + '</span><span class="hg-f"><span class="hg-dots" role="img" aria-label="Tamaños: ' + d.sizes.join(', ') + '">' + dots + '</span><span class="hg-st' + (off ? ' is-on' : '') + '">' + (off ? 'Añadido' : has ? 'Añadir otro' : 'Añadir') + '</span></span>');
      c.appendChild(th); c.appendChild(tx);
      c.addEventListener('click', function () { if (off) { var w = state.widgets.filter(function (x) { return x.type === t; })[0]; if (w) { flash(w.id); inst[w.id].el.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); announce(d.label + ' ya está en tu inicio.'); } return; } addWidget(t); });
      L.appendChild(c); shown++;
    });
    gal.none.hidden = shown > 0; if (!shown) gal.none.textContent = 'Ningún widget coincide' + (gal.q ? ' con «' + gal.input.value + '»' : '') + '.';
  }

  /* ---------------- edición ---------------- */
  function syncBar() { if (!bar) return; var u = $('[data-a="undo"]', bar); u.disabled = !undo.length; }
  function edit(on) {
    on = !!on; if (on === editing) return; if (on && !rendered) return;
    editing = on; if (on) hubEl.setAttribute('data-edit', ''); else hubEl.removeAttribute('data-edit');
    if (editBtn) editBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) { bar.hidden = false; requestAnimationFrame(function () { bar.classList.add('on'); }); announce('Modo edición activado.'); }
    else { bar.classList.remove('on'); setTimeout(function () { if (!editing) bar.hidden = true; }, reduced() ? 0 : 180); if (grab) endGrab(true); if (drag) finishDrag(true); closeMenu(false); closeGallery(false); announce('Modo edición desactivado.'); }
  }
  function presetItems(opener) { return Object.keys(PRESETS).filter(function (n) { return n !== 'Demo'; }).map(function (n) { return { label: n, run: function () { confirmReset(n, opener); } }; }); }

  /* ---------------- construcción ---------------- */
  function ensureRendered() {
    if (rendered || !hubEl) return; rendered = true;
    hubEl.innerHTML = '';
    bar = mk('div', 'hub-bar'); bar.hidden = true; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Edición del inicio');
    bar.innerHTML = '<button type="button" class="btn btn-primary btn-sm" data-a="done">Listo</button><button type="button" class="btn btn-ghost btn-sm" data-a="undo" disabled>Deshacer</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-a="reset" aria-haspopup="menu" aria-expanded="false">Restablecer<span class="hub-chev">' + I.chev + '</span></button><button type="button" class="btn btn-secondary btn-sm" data-a="add">' + I.plus + 'Añadir widget</button>' +
      '<span class="hub-bar-h">Arrastra el agarre para mover; cambia el tamaño desde la esquina.</span>';
    bar.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-a]'); if (!b) return; var a = b.dataset.a;
      if (a === 'done') { edit(false); if (editBtn) editBtn.focus({ preventScroll: true }); } else if (a === 'undo') undoOnce();
      else if (a === 'reset') openMenu(b, presetItems(b)); else if (a === 'add') openGallery(b);
    });
    grid = mk('div', 'hub-grid'); grid.setAttribute('role', 'list');
    emptyEl = mk('div', 'hub-empty'); emptyEl.hidden = true;
    emptyEl.innerHTML = '<h2>Tu inicio está vacío</h2><p>Elige un preajuste o añade widgets uno por uno.</p><div class="hub-empty-b"></div>';
    var eb = $('.hub-empty-b', emptyEl);
    Object.keys(PRESETS).filter(function (n) { return n !== 'Demo'; }).forEach(function (n) { var b = mk('button', 'btn btn-secondary btn-sm', esc(n)); b.type = 'button'; b.addEventListener('click', function () { resetTo(n); }); eb.appendChild(b); });
    var ab = mk('button', 'btn btn-primary btn-sm', I.plus + 'Añadir widget'); ab.type = 'button'; ab.addEventListener('click', function () { openGallery(ab); }); eb.appendChild(ab);
    liveEl = mk('div', 'sr'); liveEl.setAttribute('aria-live', 'polite'); liveEl.setAttribute('role', 'status');
    hubEl.appendChild(bar); hubEl.appendChild(grid); hubEl.appendChild(emptyEl); hubEl.appendChild(liveEl);
    cols = colsFor(grid.clientWidth || hubEl.clientWidth || 1200);
    var stored = loadStored(); state.widgets = stored ? normalize(stored) : buildPreset(presetName());
    state.widgets.forEach(function (w) { mount(w, false); }); applyLayout(); syncDom();
    state.widgets.forEach(function (w) { var e = inst[w.id]; e.el.classList.add('hw-loading'); var sk = mk('div', 'hw-skel'); sk.setAttribute('aria-hidden', 'true'); sk.innerHTML = '<i style="width:38%"></i><i></i><i style="width:82%"></i><i style="width:64%"></i>'; $('.hw-body', e.el).appendChild(sk); });
    setTimeout(function () { state.widgets.forEach(function (w) { var e = inst[w.id]; if (!e) return; e.el.classList.remove('hw-loading'); e.el.classList.add('hw-reveal'); var sk = $('.hw-skel', e.el); if (sk) sk.remove(); }); resizeAll(); }, 350);
    if (!stored) save();
    if (editBtn) editBtn.addEventListener('click', function () { edit(!editing); });
    new ResizeObserver(function () {
      var w = grid.clientWidth; if (!w) return; var c = colsFor(w);
      if (c !== cols) { cols = c; applyLayout(); resizeAll(); } else if (Math.abs(w - lastW) > 1) { requestAnimationFrame(function () { resizeAll(); }); } lastW = w;
    }).observe(grid);
    hubEl.dataset.cols = cols; syncBar();
  }
  function colsFor(w) { return w >= 900 ? 12 : w >= 560 ? 6 : 1; }

  /* ---------------- globales ---------------- */
  new MutationObserver(function () { themeCbs.slice().forEach(function (c) { try { c(); } catch (x) { } }); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  function onView() {
    var v = document.body.dataset.view;
    if (v === 'app') { ensureRendered(); if (rendered) requestAnimationFrame(function () { resizeAll(); }); }
    else if (rendered) { closeGallery(false); closeMenu(false); closeSheet(true); if (editing) edit(false); }
  }
  new MutationObserver(onView).observe(document.body, { attributes: true, attributeFilter: ['data-view'] }); onView();
  document.addEventListener('campo:open-position', function () { closeGallery(false); });
  document.addEventListener('keydown', function (ev) {
    if (synth || !rendered) return;
    if (ev.key === 'Escape') { if (menuEl) { ev.preventDefault(); closeMenu(true); } else if (sheet) { ev.preventDefault(); closeSheet(false); } else if (drag) { finishDrag(false); } else if (gal) { ev.preventDefault(); closeGallery(true); } return; }
    if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && !ev.altKey && (ev.key === 'z' || ev.key === 'Z') && editing && document.body.dataset.view === 'app' && !sheet) {
      var t = ev.target; if (t && t.closest && t.closest('input,textarea,select,[contenteditable]')) return; ev.preventDefault(); undoOnce();
    }
  });

  /* ---------------- API ---------------- */
  function copy() { return state.widgets.map(function (w) { return { id: w.id, type: w.type, title: w.title, size: w.size, x: w.x, y: w.y, w: w.w, h: w.h, config: clone(w.config) }; }); }
  /* vuelve a pintar el contenido de cada widget (los datos cambiaron: p. ej. la moneda del Inicio); no toca el acomodo */
  function refreshAll() {
    if (!rendered) return;
    state.widgets.forEach(function (w) {
      var e = inst[w.id], d = defs[w.type]; if (!e || !d) return;
      try { if (e.ins && e.ins.destroy) e.ins.destroy(); } catch (x) { }
      themeCbs = themeCbs.filter(function (c) { return e.themeCbs.indexOf(c) < 0; }); e.themeCbs = [];
      var body = $('.hw-body', e.el); body.innerHTML = '';
      try { e.ins = d.render(body, e.ctx) || {}; } catch (x) { console.error(x); body.innerHTML = '<p class="hw-err">No se pudo cargar este widget.</p>'; e.ins = {}; }
    });
  }
  window.CampoHub = {
    register: register, widgets: copy, edit: edit, add: addWidget, reset: function (p) { if (!rendered) return; resetTo(p); }, refresh: refreshAll
  };
  window.__hub = { layout: copy, edit: edit, reset: function (p) { window.CampoHub.reset(p); }, cols: function () { return cols; } };

  /* cola de registro: widgets cargados antes (o sin) CampoHub */
  var Q = window.CampoHubQueue;
  function takeQ(it) { if (it && it.type && it.def) register(it.type, it.def); }
  if (Array.isArray(Q)) Q.slice().forEach(takeQ);
  window.CampoHubQueue = { push: function () { Array.prototype.forEach.call(arguments, takeQ); return 0; }, length: 0 };

  /* ---------------- demo (solo con ?hubdemo) ---------------- */
  if (DEMO) {
    ['a', 'b', 'c'].forEach(function (k, i) {
      register('demo-' + k, { label: 'Widget ' + k.toUpperCase(), desc: 'Widget de prueba del motor.', group: ['Portafolio', 'Mercado', 'Ingresos'][i], sizes: ['S', 'M', 'L', 'XL'], size: ['M', 'S', 'L'][i], duplicable: i === 0, defaults: { n: 1 },
        render: function (body, ctx) { body.innerHTML = '<p style="margin:0">' + ctx.type + ' · <span data-s></span></p>'; var paint = function () { body.querySelector('[data-s]').textContent = ctx.size + ' · n=' + ctx.config.n; }; paint(); return { update: paint, resize: paint, destroy: function () { } }; },
        settings: function (f, cfg, apply) { var inp = document.createElement('input'); inp.type = 'number'; inp.value = cfg.n; inp.setAttribute('aria-label', 'n'); inp.addEventListener('input', function () { apply({ n: +inp.value }); }); f.appendChild(inp); } });
    });
    PRESETS.Demo = [['demo-a', 'M', 0, 0], ['demo-b', 'S', 6, 0], ['demo-c', 'L', 0, 6]];
  }
})();
