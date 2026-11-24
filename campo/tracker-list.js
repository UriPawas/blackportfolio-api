/* Campo · Tracker · lista de portafolios + detalle (T2). Consume window.CampoTracker (contrato en docs/16-spec-tracker-inicio.md).
   Renderiza en #tkList y #tkDetail. En producción, con los datos reales de campo/datos.js. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, T, listEl, detEl, ready = false;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var rmq = matchMedia('(prefers-reduced-motion: reduce)'), reduce = function () { return rmq.matches; };
  var EASE = 'cubic-bezier(0.23, 1, 0.32, 1)', EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var nf0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }), nf2 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var fDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  function SYM() { var d = window.PORTIFY_DEMO; return d && d.fmt && d.fmt.sym ? d.fmt.sym() : '$'; }
  var fM = function (v) { return (v < 0 ? '−' : '') + SYM() + nf0.format(Math.abs(Math.round(v))); };
  var fS = function (v) { return (v < 0 ? '−' : '+') + SYM() + nf0.format(Math.abs(Math.round(v))); };
  var fP = function (v) { return (v < 0 ? '−' : '+') + nf2.format(Math.abs(v)) + '%'; };
  var cls = function (v) { return v < 0 ? 'loss' : v > 0 ? 'gain' : ''; };
  var RET_TIP = 'Rentabilidad = ganancia total ÷ capital aportado, en moneda base. Ganancia total = patrimonio + retiros − aportaciones.';

  var ICON = {
    grip: '<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>',
    more: '<circle cx="5.5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18.5" cy="12" r="1.5"/>',
    chev: '<path d="m9 6 6 6-6 6"/>', back: '<path d="m15 6-6 6 6 6"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/>', down: '<path d="M12 4v11M7.5 11 12 15.5 16.5 11M5 20h14"/>',
    trash: '<path d="M5 7h14M10 11v6M14 11v6M7 7l1 12h8l1-12M9.5 7V4.5h5V7"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    up: '<path d="M12 20V9M7.5 13 12 8.5 16.5 13M5 4h14"/>'
  };
  function ic(n, c) { var fill = (n === 'grip' || n === 'more') ? 'currentColor' : 'none'; return '<svg class="tkl-ic' + (c ? ' ' + c : '') + '" viewBox="0 0 24 24" fill="' + fill + '" stroke="' + (fill === 'none' ? 'currentColor' : 'none') + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + '</svg>'; }

  /* ---------- utilidades ---------- */
  var liveEl = doc.createElement('div'); liveEl.className = 'tkl-sr'; liveEl.setAttribute('role', 'status'); liveEl.setAttribute('aria-live', 'polite'); doc.body.appendChild(liveEl);
  function live(m) { liveEl.textContent = ''; setTimeout(function () { liveEl.textContent = m; }, 30); }
  var toastT = 0;
  function toast(m) { var t = doc.getElementById('toast'); if (!t) return; t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2800); }
  function download(name, text, type) {
    var u = URL.createObjectURL(new Blob([text], { type: type || 'text/csv;charset=utf-8' })), a = doc.createElement('a');
    a.href = u; a.download = name; doc.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 2000);
  }
  function roll(el, from, to, fmt, dur) {
    if (!el) return;
    if (reduce() || from === to) { el.textContent = fmt(to); return; }
    var t0 = performance.now(); dur = dur || 700;
    (function step(t) { var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); })(t0);
  }
  var heroEl = function () { return $('#secTracker .tk-hero') || $('.tk-hero'); };
  var visible = function () { return !!(listEl && listEl.offsetParent !== null) || !!(detEl && detEl.offsetParent !== null); };

  /* ---------- modelo ---------- */
  function pfs() {
    var by = {}; (T.portfolios || []).forEach(function (p) { by[p.id] = p; });
    var o = typeof T.order === 'function' ? T.order() : null;
    if (!o || !o.length) return (T.portfolios || []).slice();
    return o.map(function (x) { return (x && typeof x === 'object') ? x : by[x]; }).filter(Boolean);
  }
  function getP(id) { return (T.portfolios || []).filter(function (p) { return p.id === id; })[0]; }
  function limitInfo() { var l = T.limit || {}; return { plan: l.plan || 'Investor', max: (l.max == null || !isFinite(l.max)) ? Infinity : l.max }; }
  function atLimit() { return (T.portfolios || []).length >= limitInfo().max; }
  function ccys(p) {
    var s = []; (p.positions || []).forEach(function (x) { if (s.indexOf(x.currency) < 0) s.push(x.currency); });
    return s.length ? s.join(' y ') : (p.currency || 'MXN');
  }
  function subline(p) {
    var n = (p.positions || []).length;
    return n + (n === 1 ? ' posición' : ' posiciones') + ' · ' + ccys(p) + (p.fxMissing > 0 ? ' · sin tipo de cambio' : '');
  }
  function mark(sym, n) { return window.CampoMarks ? window.CampoMarks.svg(sym, n || 28) : '<span class="tkl-chip">' + esc(String(sym).charAt(0)) + '</span>'; }
  function spark(p) {
    var s = (p.series || []).slice(-63); if (s.length < 2) return '';
    var lo = Math.min.apply(null, s), hi = Math.max.apply(null, s), rg = (hi - lo) || 1, W = 96, H = 28, d = '', x, y;
    s.forEach(function (v, i) { x = i / (s.length - 1) * (W - 6) + 1; y = H - 4 - (v - lo) / rg * (H - 8); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); });
    var up = s[s.length - 1] >= s[0];
    return '<svg class="tkl-sp" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><path class="tkl-spl" d="' + d + '" pathLength="1"/><circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.4" class="tkl-spd ' + (up ? 'gain' : 'loss') + '"/></svg>';
  }

  /* ---------- lista ---------- */
  var seen = false, firstDone = false, lastVals = {}, editing = false, drag = null, pending = false, pendSnap = null, renderN = 0, hl = null, current = null;

  function snapshot() { var m = {}; $$('.tkl-row[data-id]', listEl).forEach(function (r) { m[r.dataset.id] = r.getBoundingClientRect().top; }); return m; }
  function playFlip(snap) {
    if (reduce() || !snap) return;
    $$('.tkl-row[data-id]', listEl).forEach(function (r) {
      var o = snap[r.dataset.id]; if (o == null) return;
      var d = o - r.getBoundingClientRect().top; if (Math.abs(d) < 1 || !r.animate) return;
      r.animate([{ transform: 'translateY(' + d + 'px)' }, { transform: 'none' }], { duration: 300, easing: EXPO });
    });
  }

  function rowHTML(p, i, n, maxC, single) {
    var ct = p.contrib || 0, w = maxC ? Math.abs(ct) / maxC * 50 : 0, dayA = p.day || { amt: 0, pct: 0 }, ret = p.ret || { amt: 0, pct: 0 };
    return '<li class="tkl-row" data-id="' + esc(p.id) + '" style="--i:' + i + ';--pc:' + esc(p.color) + '">' +
      '<button type="button" class="tkl-grip" data-act="grip" aria-label="Reordenar ' + esc(p.name) + '. Alt más flecha arriba o abajo mueve el portafolio."' + (n < 2 ? ' disabled' : '') + '>' + ic('grip') + '</button>' +
      '<span class="tkl-sw" data-part="sw" aria-hidden="true"></span>' +
      '<div class="tkl-nm"><button type="button" class="tkl-open" data-act="open"><span class="tkl-nmt" data-part="name">' + esc(p.name) + '</span></button><span class="tkl-sub">' + esc(subline(p)) + '</span></div>' +
      '<span class="tkl-val tkl-num" data-part="value" data-v="' + p.value + '">' + fM(p.value) + '</span>' +
      '<div class="tkl-share"' + (single ? ' hidden' : '') + '><span class="tkl-bar" aria-hidden="true"><i style="--w:' + (p.share * 100).toFixed(1) + '%"></i></span><span class="tkl-num tkl-shp">' + Math.round(p.share * 100) + '%</span></div>' +
      '<div class="tkl-day tkl-num ' + cls(dayA.amt) + '" title="Cambio de hoy"><span>' + fS(dayA.amt) + '</span><span>' + fP(dayA.pct) + '</span></div>' +
      '<div class="tkl-ct" role="img" aria-label="Aporta ' + fS(ct) + ' al cambio de hoy" title="Aporta ' + fS(ct) + ' al cambio de hoy"><i class="' + cls(ct) + '" style="--w:' + w.toFixed(1) + '%"></i></div>' +
      '<span class="tkl-ret tkl-num ' + cls(ret.pct) + '" title="' + RET_TIP + '">' + fP(ret.pct) + '</span>' +
      '<div class="tkl-spk">' + spark(p) + '</div>' +
      '<button type="button" class="tkl-more" data-act="more" aria-haspopup="menu" aria-expanded="false" aria-label="Acciones de ' + esc(p.name) + '">' + ic('more') + '</button>' +
      '<span class="tkl-chev" aria-hidden="true">' + ic('chev') + '</span></li>';
  }

  function render() {
    if (!ready) return;
    if (drag || editing) { pending = true; return; }
    pending = false; renderN++;
    var snap = pendSnap || (firstDone ? snapshot() : null); pendSnap = null;
    var list = pfs(), n = list.length, single = n === 1, empty = n === 0, lim = limitInfo(), maxC = 0;
    list.forEach(function (p) { maxC = Math.max(maxC, Math.abs(p.contrib || 0)); });
    var rows = list.map(function (p, i) { return rowHTML(p, i, n, maxC, single); }).join('');
    var chip = (n && isFinite(lim.max) && lim.max < 99) ? '<span class="tkl-chipplan' + (atLimit() ? ' is-lim' : '') + '">' + (atLimit() ? 'Límite del plan ' + lim.plan : n + ' de ' + lim.max) + '</span>' : '';
    var add = '<li class="tkl-add"><button type="button" data-act="new">' + ic('plus') + '<span>Nuevo portafolio</span>' + chip + '</button>' + (empty ? '<button type="button" data-act="imp">' + ic('up') + '<span>Importar CSV</span></button>' : '') + '</li>';
    listEl.innerHTML = '<div class="tkl" data-n="' + n + '"' + (single ? ' data-single' : '') + '>' +
      (empty ? '' : '<div class="tkl-cols" aria-hidden="true"><span></span><span></span><span>Portafolio</span><span class="r">Valor</span><span' + (single ? ' style="visibility:hidden"' : '') + '>Parte del total</span><span class="r">Hoy</span><span>Aporte de hoy</span><span class="r">Rentab.</span><span>3 meses</span><span></span><span></span></div>') +
      '<ul class="tkl-list" role="list" aria-label="Portafolios">' + rows + add + '</ul></div>';
    // valores: ruedan desde el valor anterior (o desde 0 la primera vez)
    $$('.tkl-row', listEl).forEach(function (r) {
      var id = r.dataset.id, p = getP(id), v = $('.tkl-val', r), from = lastVals[id] == null ? 0 : lastVals[id];
      if (p && from !== p.value) roll(v, from, p.value, fM, firstDone ? 500 : 800);
      else if (p && v) v.textContent = fM(p.value); /* re-render sin cambio de valor: escribir la cifra (la celda nace en $0) */
      if (p) lastVals[id] = p.value;
    });
    if (hl) setHL(hl);
    if (!firstDone) {
      firstDone = true;
      if (!reduce()) { var L = $('.tkl', listEl); L.setAttribute('data-pre', ''); }
      armEnter();
    } else playFlip(snap);
  }

  function armEnter() {
    var L = $('.tkl', listEl); if (!L || !L.hasAttribute('data-pre')) return;
    function go() {
      if (seen) return; seen = true; if (io) io.disconnect();
      L.removeAttribute('data-pre'); L.setAttribute('data-enter', '');
      $$('.tkl-row', L).forEach(function (r) {
        var k = +r.style.getPropertyValue('--i') || 0;
        if (r.animate) r.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: k * 40, easing: EXPO, fill: 'backwards' });
      });
      setTimeout(function () { L.removeAttribute('data-enter'); }, 900);
    }
    var io = null;
    if (listEl.offsetParent !== null) { requestAnimationFrame(go); return; }
    if ('IntersectionObserver' in window) { io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) go(); }); io.observe(listEl); }
    else go();
  }

  function setHL(id) {
    hl = id || null;
    var L = $('.tkl', listEl); if (!L) return;
    if (hl) L.setAttribute('data-hl', ''); else L.removeAttribute('data-hl');
    $$('.tkl-row', L).forEach(function (r) { if (r.dataset.id === hl) r.setAttribute('data-hl', ''); else r.removeAttribute('data-hl'); });
  }
  var hovered = null;
  function hoverOut(id) { if (hovered !== id) { hovered = id; try { T.hover(id); } catch (e) { } } }

  /* ---------- popovers (menú ⋯ y confirmación) ---------- */
  var pop = null, popAnchor = null, popOff = [];
  function closePop(ret) {
    if (!pop) return; pop.remove(); pop = null;
    popOff.forEach(function (f) { f(); }); popOff = [];
    if (popAnchor) { popAnchor.setAttribute('aria-expanded', 'false'); if (ret && doc.contains(popAnchor)) popAnchor.focus({ preventScroll: true }); }
    popAnchor = null;
  }
  function openPop(anchor, html, label) {
    closePop(); popAnchor = anchor; anchor.setAttribute('aria-expanded', 'true');
    pop = doc.createElement('div'); pop.className = 'tkl-pop'; pop.setAttribute('role', 'menu'); pop.setAttribute('aria-label', label || 'Acciones'); pop.innerHTML = html;
    pop.style.visibility = 'hidden'; doc.body.appendChild(pop);
    var r = anchor.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    var left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)), top = r.bottom + 6, up = false;
    if (top + h > innerHeight - 8 && r.top - h - 6 > 8) { top = r.top - h - 6; up = true; }
    pop.style.left = left + 'px'; pop.style.top = top + 'px'; pop.style.visibility = '';
    if (!reduce() && pop.animate) pop.animate([{ opacity: 0, transform: 'translateY(' + (up ? 6 : -6) + 'px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 160, easing: EXPO });
    var p = pop;
    function onDown(e) { if (!p.contains(e.target) && !anchor.contains(e.target)) closePop(false); }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePop(true); return; }
      var its = $$('[role="menuitem"],button', p), i = its.indexOf(doc.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); its[(i + 1) % its.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); its[(i - 1 + its.length) % its.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); its[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); its[its.length - 1].focus(); }
      else if (e.key === 'Tab') closePop(false);
    }
    function onAway() { closePop(false); }
    doc.addEventListener('pointerdown', onDown, true); doc.addEventListener('keydown', onKey, true);
    addEventListener('resize', onAway); addEventListener('scroll', onAway, true);
    popOff.push(function () { doc.removeEventListener('pointerdown', onDown, true); doc.removeEventListener('keydown', onKey, true); removeEventListener('resize', onAway); removeEventListener('scroll', onAway, true); });
    var f = $('[data-first]', pop) || $('button', pop); if (f) f.focus({ preventScroll: true });
    return pop;
  }
  function openMenu(btn, id) {
    var p = getP(id); if (!p) return;
    var m = openPop(btn, '<button role="menuitem" type="button" data-m="ren" data-first>' + ic('pen') + 'Renombrar</button><button role="menuitem" type="button" data-m="csv">' + ic('down') + 'Exportar CSV</button><button role="menuitem" type="button" data-m="del" class="is-danger">' + ic('trash') + 'Eliminar</button>', 'Acciones de ' + p.name);
    m.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return;
      var a = b.dataset.m;
      if (a === 'ren') { closePop(false); startRename(id); }
      else if (a === 'csv') { closePop(true); exportCSV(p); }
      else if (a === 'del') confirmDelete(btn, id);
    });
  }
  function confirmDelete(anchor, id) {
    var p = getP(id); if (!p) return;
    var c = openPop(anchor, '<div class="tkl-conf" role="alertdialog" aria-label="Confirmar eliminación"><p><strong>¿Eliminar «' + esc(p.name) + '»?</strong></p><p>Se quitan sus posiciones y transacciones. No se puede deshacer.</p><div class="tkl-conf-b"><button type="button" class="btn btn-ghost btn-sm" data-c="no" data-first>Cancelar</button><button type="button" class="btn btn-secondary btn-sm tkl-danger" data-c="yes">Eliminar</button></div></div>', 'Confirmar eliminación');
    c.setAttribute('role', 'dialog');
    c.addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]'); if (!b) return;
      if (b.dataset.c === 'no') closePop(true); else { closePop(false); removeRow(id); }
    });
  }
  function exportCSV(p) {
    var q = function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var lines = ['ticker,nombre,cantidad,costo_promedio,precio,moneda'];
    (p.positions || []).forEach(function (x) { lines.push([x.ticker, x.name, x.qty, x.avg, x.price, x.currency].map(q).join(',')); });
    var fn = String(p.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'portafolio';
    download(fn + '.csv', '﻿' + lines.join('\n') + '\n');
    toast('Exportado ' + fn + '.csv');
  }

  function removeRow(id) {
    var r = rowEl(id), p = getP(id), name = p ? p.name : '';
    function done() {
      var r = T.remove(id);
      if (r && typeof r.then === 'function') { /* producción: se borra en el servidor; si falla, vuelve a aparecer */
        r.then(function (x) { if (x && x.error) { toast(x.error); render(); } else { toast('Eliminaste «' + name + '»'); live('Portafolio ' + name + ' eliminado'); } });
        return;
      }
      if (renderN === rn) render(); toast('Eliminaste «' + name + '»'); live('Portafolio ' + name + ' eliminado');
    }
    var rn = renderN;
    if (!r || reduce() || !r.animate) { done(); return; }
    var h = r.getBoundingClientRect().height;
    r.style.overflow = 'hidden';
    var a = r.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0, paddingTop: '0px', paddingBottom: '0px', borderBottomWidth: '0px' }], { duration: 300, easing: EXPO, fill: 'forwards' });
    a.onfinish = done; a.oncancel = done;
  }
  var rowEl = function (id) { return $$('.tkl-row[data-id]', listEl).filter(function (r) { return r.dataset.id === id; })[0]; };

  function startRename(id) {
    var li = rowEl(id), p = getP(id); if (!li || !p) return;
    var btn = $('.tkl-open', li), inp = doc.createElement('input'), fin = false;
    editing = true; li.setAttribute('data-edit', '');
    inp.className = 'tkl-rename'; inp.value = p.name; inp.maxLength = 40; inp.setAttribute('aria-label', 'Nuevo nombre de ' + p.name);
    btn.style.display = 'none'; btn.parentNode.insertBefore(inp, btn);
    if (!reduce() && inp.animate) inp.animate([{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 160, easing: EXPO });
    inp.focus(); inp.select();
    function end(commit) {
      if (fin) return; fin = true;
      var v = inp.value.trim(); editing = false;
      if (commit && v && v !== p.name) {
        var rr = null; try { rr = T.rename(id, v); } catch (e) { }
        if (rr && typeof rr.then === 'function') rr.then(function (x) { if (x && x.error) toast(x.error); else { toast('Renombrado a «' + v + '»'); live('Portafolio renombrado a ' + v); } });
        else { toast('Renombrado a «' + v + '»'); live('Portafolio renombrado a ' + v); }
      }
      inp.remove(); btn.style.display = ''; li.removeAttribute('data-edit');
      if (pending || (commit && v && v !== p.name)) render();
      var b = rowEl(id); if (b) { var o = $('.tkl-open', b); if (o) o.focus({ preventScroll: true }); }
    }
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); end(true); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(false); } });
    inp.addEventListener('blur', function () { end(true); });
  }

  /* ---------- reordenar ---------- */
  var spr = null;
  function springStep(t) {
    if (!drag) { spr = null; return; }
    var dt = Math.min(1 / 30, Math.max(0.001, (t - (springStep.t || t)) / 1000)); springStep.t = t;
    var k = 420, c = 2 * Math.sqrt(k), moving = false;
    drag.rows.forEach(function (r, j) {
      if (j === drag.idx) return; var s = drag.st[j];
      var a = -k * (s.x - s.t) - c * s.v; s.v += a * dt; s.x += s.v * dt;
      if (Math.abs(s.x - s.t) < 0.2 && Math.abs(s.v) < 0.5) { s.x = s.t; s.v = 0; } else moving = true;
      r.style.transform = s.x ? 'translateY(' + s.x.toFixed(2) + 'px)' : '';
    });
    spr = moving ? requestAnimationFrame(springStep) : null;
  }
  function gripDown(e, btn) {
    if (e.button > 0 || drag) return;
    var li = btn.closest('.tkl-row'), rows = $$('.tkl-row[data-id]', listEl), idx = rows.indexOf(li);
    if (rows.length < 2) return; e.preventDefault(); closePop(false);
    drag = { id: li.dataset.id, el: li, rows: rows, idx: idx, cur: idx, y0: e.clientY, pid: e.pointerId, btn: btn,
      tops: rows.map(function (r) { return r.getBoundingClientRect().top; }), st: rows.map(function () { return { x: 0, v: 0, t: 0 }; }) };
    try { btn.setPointerCapture(e.pointerId); } catch (x) { }
    li.classList.add('tkl-lift'); listEl.setAttribute('data-drag', ''); hoverOut(null);
  }
  function gripMove(e) {
    if (!drag || e.pointerId !== drag.pid) return;
    var d = drag, lo = d.tops[0] - d.tops[d.idx], hi = d.tops[d.tops.length - 1] - d.tops[d.idx];
    var dy = Math.max(lo, Math.min(hi, e.clientY - d.y0)), pos = d.tops[d.idx] + dy, best = d.cur, bd = Infinity;
    d.el.style.transform = 'translateY(' + dy + 'px) scale(1.01)';
    d.tops.forEach(function (tp, k) { var dd = Math.abs(tp - pos); if (dd < bd) { bd = dd; best = k; } });
    if (best !== d.cur) {
      d.cur = best;
      d.rows.forEach(function (r, j) {
        var t = 0;
        if (j !== d.idx) { if (d.idx < best && j > d.idx && j <= best) t = d.tops[j - 1] - d.tops[j]; else if (d.idx > best && j >= best && j < d.idx) t = d.tops[j + 1] - d.tops[j]; }
        d.st[j].t = t;
      });
      springStep.t = 0; if (!spr) spr = requestAnimationFrame(springStep);
    }
  }
  function gripUp(e, cancel) {
    if (!drag || (e && e.pointerId !== drag.pid)) return;
    var d = drag; drag = null; if (spr) { cancelAnimationFrame(spr); spr = null; }
    try { d.btn.releasePointerCapture(d.pid); } catch (x) { }
    listEl.removeAttribute('data-drag');
    if (cancel || d.cur === d.idx) {
      d.el.style.transition = 'transform 240ms ' + EXPO; d.el.style.transform = '';
      d.rows.forEach(function (r) { r.style.transform = ''; });
      setTimeout(function () { d.el.style.transition = ''; d.el.classList.remove('tkl-lift'); if (pending) render(); }, 260);
      return;
    }
    var ids = d.rows.map(function (r) { return r.dataset.id; }); ids.splice(d.idx, 1); ids.splice(d.cur, 0, d.id);
    pendSnap = snapshot(); // posiciones visuales actuales (con las transformaciones)
    d.rows.forEach(function (r) { r.style.transform = ''; }); d.el.classList.remove('tkl-lift');
    var n0 = renderN; T.setOrder(ids); if (renderN === n0) render();
    live(d.el.querySelector('.tkl-nmt').textContent + ', posición ' + (d.cur + 1) + ' de ' + ids.length);
  }
  function kbMove(btn, dir) {
    var li = btn.closest('.tkl-row'), ids = $$('.tkl-row[data-id]', listEl).map(function (r) { return r.dataset.id; }), i = ids.indexOf(li.dataset.id), j = i + dir;
    if (j < 0 || j >= ids.length) return;
    var id = ids[i], name = $('.tkl-nmt', li).textContent; ids.splice(i, 1); ids.splice(j, 0, id);
    pendSnap = snapshot(); var n0 = renderN; T.setOrder(ids); if (renderN === n0) render();
    var g = $('.tkl-row[data-id="' + id.replace(/"/g, '\\"') + '"] .tkl-grip', listEl); if (g) g.focus({ preventScroll: true });
    live(name + ', posición ' + (j + 1) + ' de ' + ids.length);
  }

  /* ---------- hojas (crear / importar) ---------- */
  var sheetN = 0;
  function openSheet(title, html) {
    var opener = doc.activeElement, r = doc.createElement('div'); r.className = 'tkl-modal';
    r.innerHTML = '<div class="tkl-mback"></div><div class="tkl-mpanel" role="dialog" aria-modal="true" aria-labelledby="tklMT" tabindex="-1"><button class="icon-btn tkl-mx" type="button" aria-label="Cerrar" data-mclose>' + ic('x') + '</button><div class="tkl-mscroll"><h2 class="tkl-mt" id="tklMT">' + esc(title) + '</h2><div class="tkl-mbody">' + html + '</div></div></div>';
    doc.body.appendChild(r); root.classList.add('tkl-lock'); sheetN++;
    var panel = $('.tkl-mpanel', r), closed = false;
    var api = {
      el: r, body: $('.tkl-mbody', r),
      close: function (noRestore) {
        if (closed) return; closed = true; r.removeAttribute('data-open');
        setTimeout(function () { r.remove(); if (--sheetN <= 0) { sheetN = 0; root.classList.remove('tkl-lock'); } }, reduce() ? 0 : 220);
        if (!noRestore && opener && doc.contains(opener)) opener.focus({ preventScroll: true });
      }
    };
    r.addEventListener('click', function (e) { if (e.target.classList.contains('tkl-mback') || e.target.closest('[data-mclose]')) api.close(); });
    r.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); api.close(); return; }
      if (e.key !== 'Tab') return;
      var f = $$('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]', panel).filter(function (x) { return x.offsetParent !== null || x.classList.contains('tkl-file'); });
      if (!f.length) { e.preventDefault(); return; }
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && (doc.activeElement === a || doc.activeElement === panel)) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && doc.activeElement === z) { e.preventDefault(); a.focus(); }
    });
    var af = $('[data-autofocus]', panel) || panel; af.focus({ preventScroll: true });
    requestAnimationFrame(function () { requestAnimationFrame(function () { r.setAttribute('data-open', ''); }); });
    return api;
  }
  function limitHTML() {
    var l = limitInfo();
    return '<p class="tkl-lead">Tu plan ' + esc(l.plan) + ' permite ' + l.max + ' portafolios. Advisor Pro: ilimitados.</p><div class="tkl-mact"><button type="button" class="btn btn-ghost btn-sm" data-mclose>Ahora no</button><button type="button" class="btn btn-primary btn-sm" data-plan data-autofocus>Ver planes</button></div>';
  }
  function wirePlan(sh) {
    var b = $('[data-plan]', sh.el); if (!b) return;
    b.addEventListener('click', function () { sh.close(true); if (window.__settings && window.__settings.open) window.__settings.open('plan'); });
  }
  var BENCH = ['S&P 500', 'NASDAQ 100', 'S&P/BMV IPC', 'MSCI World'], CCY = ['MXN', 'USD', 'EUR', 'GBP', 'CAD', 'BRL'];
  function openCreate() {
    if (atLimit()) { var s0 = openSheet('Límite de portafolios', limitHTML()); wirePlan(s0); return; }
    var sh = openSheet('Nuevo portafolio',
      '<form class="tkl-form" novalidate>' +
      '<div class="tkl-fld"><label for="tklN">Nombre</label><input id="tklN" name="name" maxlength="40" autocomplete="off" required data-autofocus placeholder="Ej. Largo plazo"><p class="tkl-err" role="alert" id="tklNe"></p></div>' +
      '<div class="tkl-fld"><label for="tklD">Descripción <span>(opcional)</span></label><input id="tklD" name="desc" maxlength="120" autocomplete="off"></div>' +
      '<div class="tkl-two"><div class="tkl-fld"><label for="tklC">Moneda</label><select id="tklC" name="currency">' + CCY.map(function (c) { var def = T.consolidatedCcy ? T.consolidatedCcy() : 'MXN'; return '<option' + (c === def ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div>' +
      '<div class="tkl-fld"><label for="tklB">Benchmark</label><select id="tklB" name="benchmark">' + BENCH.map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="tkl-mact"><button type="button" class="btn btn-ghost btn-sm" data-mclose>Cancelar</button><button type="submit" class="btn btn-primary btn-sm">Crear portafolio</button></div></form>');
    var f = $('form', sh.el), n = $('#tklN', f), er = $('#tklNe', f);
    n.addEventListener('input', function () { n.removeAttribute('aria-invalid'); er.textContent = ''; });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var v = n.value.trim();
      if (!v) { n.setAttribute('aria-invalid', 'true'); n.setAttribute('aria-describedby', 'tklNe'); er.textContent = 'Escribe un nombre para el portafolio.'; n.focus(); return; }
      var spec = { name: v, desc: $('#tklD', f).value.trim(), currency: $('#tklC', f).value, benchmark: $('#tklB', f).value };
      if (T.canWrite) { /* producción: se crea en el servidor; la hoja espera la respuesta y, si falla, dice por qué */
        var sb = $('[type="submit"]', f); sb.disabled = true; sb.textContent = 'Creando…';
        Promise.resolve(T.add(spec)).then(function (r) {
          if (!r || r.error) { sb.disabled = false; sb.textContent = 'Crear portafolio'; er.textContent = (r && r.error) || 'No se pudo crear.'; return; }
          sh.close(true); toast('Creaste «' + v + '»'); live('Portafolio ' + v + ' creado'); if (r.id) { try { T.open(r.id); } catch (x) { } }
        });
        return;
      }
      sh.close(true); T.add(spec);
      toast('Creaste «' + v + '»'); live('Portafolio ' + v + ' creado');
    });
  }
  function openImport() {
    if (atLimit()) { var s0 = openSheet('Límite de portafolios', limitHTML()); wirePlan(s0); return; }
    var sh = openSheet('Importar CSV',
      '<p class="tkl-lead">Sube un archivo con una fila por posición. Columnas esperadas: <code>ticker</code>, <code>cantidad</code>, <code>costo_promedio</code> y <code>moneda</code> (opcional, MXN por defecto). Es una demostración: nada sale de tu equipo.</p>' +
      '<label class="tkl-drop" id="tklDrop"><input type="file" class="tkl-file" accept=".csv,text/csv" id="tklFile" data-autofocus><span class="tkl-drop-t">' + ic('up') + '<strong>Arrastra tu CSV aquí</strong><span>o toca para elegir un archivo</span></span></label>' +
      '<p class="tkl-sum" id="tklSum" role="status"></p>' +
      '<div class="tkl-mact"><button type="button" class="btn btn-ghost btn-sm" data-mclose>Cancelar</button><button type="button" class="btn btn-primary btn-sm" id="tklGo" disabled>Importar</button></div>');
    var inp = $('#tklFile', sh.el), drop = $('#tklDrop', sh.el), sum = $('#tklSum', sh.el), go = $('#tklGo', sh.el), file = null;
    function pick(fl) {
      if (!fl) return; file = fl; sum.textContent = 'Leyendo ' + fl.name + '…';
      var rd = new FileReader();
      rd.onload = function () {
        var rows = String(rd.result || '').split(/\r?\n/).filter(function (x) { return x.trim(); }).length - 1; rows = Math.max(0, rows);
        sum.textContent = fl.name + ' · ' + rows + (rows === 1 ? ' posición detectada' : ' posiciones detectadas'); go.disabled = false;
      };
      rd.onerror = function () { sum.textContent = 'No se pudo leer el archivo.'; };
      rd.readAsText(fl);
    }
    inp.addEventListener('change', function () { pick(inp.files && inp.files[0]); });
    ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.setAttribute('data-over', ''); }); });
    ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.removeAttribute('data-over'); }); });
    drop.addEventListener('drop', function (e) { pick(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });
    go.addEventListener('click', function () {
      if (!file) return; var nm = file.name.replace(/\.[^.]+$/, '') + ' (importado)';
      sh.close(true); T.add({ name: nm, desc: 'Importado desde ' + file.name, currency: 'MXN', benchmark: 'S&P 500' });
      toast('Importaste «' + nm + '» (demostración)'); live('Portafolio ' + nm + ' importado');
    });
  }

  /* ---------- detalle (stub) ---------- */
  function dateOf(s) { var d = s instanceof Date ? s : new Date(String(s).length === 10 ? s + 'T00:00:00' : s); return isNaN(d) ? null : d; }
  function detailData(id) {
    if (id === 'todos') {
      var tt = T.total || {}, pos = [];
      (T.portfolios || []).forEach(function (p) { (p.positions || []).forEach(function (x) { pos.push({ x: x, from: p.name }); }); });
      return { name: 'Todos los portafolios', desc: 'Análisis consolidado en ' + (T.base || 'MXN'), color: 'var(--text-3)', value: tt.value || 0, day: tt.day || { amt: 0, pct: 0 }, ret: tt.ret || { amt: 0, pct: 0 }, meta: [['Moneda base', T.base || 'MXN'], ['Portafolios', String((T.portfolios || []).length)]], pos: pos, cons: true };
    }
    var p = getP(id); if (!p) return null;
    var d = dateOf(p.created);
    return { name: p.name, desc: p.desc || '', color: p.color, value: p.value, day: p.day || { amt: 0, pct: 0 }, ret: p.ret || { amt: 0, pct: 0 }, meta: [['Moneda', p.currency || 'MXN'], ['Creado', d ? fDate.format(d) : '—'], ['Benchmark', p.benchmark || '—']], pos: (p.positions || []).map(function (x) { return { x: x }; }), cons: false };
  }
  function posMXN(x) { var v = (x.qty || 0) * (x.price || 0); if (T.rate) return v * T.rate(x.currency || 'MXN'); return x.currency === 'USD' ? v * ((T.fx && T.fx.usdmxn) || 1) : v; }
  var rsApi = null;
  function destroyRs() { if (rsApi && rsApi.destroy) { try { rsApi.destroy(); } catch (e) { } } rsApi = null; if (briefApi && briefApi.destroy) { try { briefApi.destroy(); } catch (e) { } } briefApi = null; }
  var briefApi = null; /* nota del portafolio (window.CampoBrief, _dev_proto-campo-brief.js): entre el encabezado y las pestañas */
  /* ---------- pestañas del portafolio ---------- */
  var TABS = [['resumen', 'Resumen', true], ['desempeno', 'Desempeño', true], ['correlacion', 'Correlación', true], ['rebalanceo', 'Rebalanceo', true], ['montecarlo', 'Monte Carlo', true], ['metas', 'Metas', true], ['whatif', 'What-If', true], ['transacciones', 'Transacciones', true], ['dividendos', 'Dividendos', true]];
  var tab = 'resumen', tabSeq = 0;
  function tabOk(t) { return TABS.some(function (x) { return x[0] === t && x[2]; }); }
  function tabFromHash() { var m = /^#\/?tracker\/[^/?]+\/([\w-]+)/.exec(location.hash || ''); return m && tabOk(m[1]) ? m[1] : 'resumen'; }
  function tabHash(id, t) { return '#tracker/' + encodeURIComponent(id) + (t === 'resumen' ? '' : '/' + t); }
  var ENG = { desempeno: 'CampoPfDesempeno', correlacion: 'CampoPfCorrel', rebalanceo: 'CampoPfRebal', montecarlo: 'CampoPfMc', metas: 'CampoPfMetas', whatif: 'CampoPfWhatif', transacciones: 'CampoPfTx', dividendos: 'CampoPfDiv' };
  function tabEngine(t) { return ENG[t] ? window[ENG[t]] : window.CampoPfResumen; }
  function mountTab(rsEl, id, d) {
    if (rsApi && rsApi.destroy) { try { rsApi.destroy(); } catch (e) { } } rsApi = null; if (!rsEl) return; /* cambiar de pestaña NO destruye la nota */
    var E = tabEngine(tab);
    if (!E) { rsEl.innerHTML = '<div class="tkl-soon"><strong>Próximamente</strong><p>Esta sección llega en la siguiente etapa.</p></div>'; return; }
    try { rsApi = E.render(rsEl, d.cons ? 'todos' : getP(id), T); } catch (e) { if (window.console) console.error(e); }
  }
  function placeInd(animate) {
    var bar = $('[data-tabs]', detEl); if (!bar) return; var ind = $('.tkl-ind', bar), on = $('[aria-selected="true"]', bar); if (!ind || !on) return;
    var still = !animate || reduce();
    if (still) ind.style.transition = 'none';
    ind.style.width = on.offsetWidth + 'px'; ind.style.transform = 'translateX(' + on.offsetLeft + 'px)';
    if (still) { void ind.offsetWidth; ind.style.transition = ''; }
    if (bar.scrollWidth > bar.clientWidth && bar.scrollTo) {
      var l = on.offsetLeft, r = l + on.offsetWidth, v0 = bar.scrollLeft, v1 = v0 + bar.clientWidth, to = l < v0 + 24 ? l - 24 : r > v1 - 24 ? r - bar.clientWidth + 24 : null;
      if (to != null) { try { bar.scrollTo({ left: Math.max(0, to), behavior: still ? 'auto' : 'smooth' }); } catch (e) { } }
    }
    tabEdges();
  }
  /* bordes difuminados: aparecen solo del lado donde aún hay pestañas fuera de vista */
  function tabEdges() {
    var bar = $('[data-tabs]', detEl), w = bar && bar.parentNode; if (!w || !w.classList) return;
    w.classList.toggle('can-l', bar.scrollLeft > 4); w.classList.toggle('can-r', bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 4);
  }
  /* cambia de pestaña: indicador deslizante (260 ms), el contenido saliente se desvanece (110 ms) y el entrante sube 8 px (220 ms, en su render) */
  function selectTab(t, focus) {
    if (!tabOk(t) || t === tab || !cur) return;
    var bar = $('[data-tabs]', detEl), rsEl = $('[data-rs]', detEl), d = detailData(cur), my = ++tabSeq; if (!bar || !rsEl || !d) { tab = t; return; }
    var id = cur; tab = t;
    $$('[role="tab"]', bar).forEach(function (b) { var on = b.dataset.tab === t; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus({ preventScroll: true }); });
    $('#tklPanel', detEl).setAttribute('aria-labelledby', 'tklTab-' + t); placeInd(true);
    function swap() { if (my !== tabSeq || cur !== id) return; mountTab(rsEl, id, d); live('Sección ' + (TABS.filter(function (x) { return x[0] === t; })[0] || [0, ''])[1]); }
    if (reduce() || !rsEl.animate) { swap(); return; }
    var a = rsEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 110, easing: 'linear', fill: 'forwards' });
    a.onfinish = function () { a.cancel(); swap(); };
  }
  function goTab(t) { if (!cur || t === tab || !tabOk(t)) return; var h = tabHash(cur, t); if (window.CampoSections) window.CampoSections.navigate(h, false); else { location.hash = h; selectTab(t, false); } }
  function onTabsKey(e) {
    var b = e.target.closest && e.target.closest('[role="tab"]'); if (!b) return;
    var en = $$('[role="tab"]:not(:disabled)', detEl), i = en.indexOf(b), n = i;
    if (e.key === 'ArrowRight') n = (i + 1) % en.length; else if (e.key === 'ArrowLeft') n = (i - 1 + en.length) % en.length; else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = en.length - 1; else return;
    e.preventDefault(); en[n].focus(); goTab(en[n].dataset.tab);
  }

  function renderDetail(id) {
    destroyRs();
    var d = detailData(id); if (!d) return false;
    var tabs = TABS;
    var pl = d.pos.length ? d.pos.map(function (r) {
      var x = r.x; return '<li class="tkl-pos"><span class="tkl-mk">' + mark(x.ticker, 28) + '</span><span class="tkl-pn"><strong>' + esc(x.ticker) + '</strong><span>' + esc(x.name || '') + (r.from ? ' · ' + esc(r.from) : '') + '</span></span><span class="tkl-num">' + fM(posMXN(x)) + '</span></li>';
    }).join('') : '<li class="tkl-pos tkl-pos-empty">Aún no hay posiciones.</li>';
    detEl.innerHTML = '<div class="tkl-detail">' +
      '<div class="tkl-late tkl-nav"><button type="button" class="btn btn-ghost btn-sm tkl-backb" data-act="back">' + ic('back') + 'Portafolios</button>' +
      '<nav aria-label="Ruta" class="tkl-crumb"><ol><li>Portafolios</li><li aria-current="page">' + esc(d.name) + '</li></ol></nav>' +
      '<button type="button" class="btn btn-primary btn-sm tkl-addtx" data-act="addtx"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Agregar movimiento</button></div>' +
      '<header class="tkl-dhead"><span class="tkl-dsw" data-part="sw" style="--pc:' + esc(d.color) + '" aria-hidden="true"></span>' +
      '<div class="tkl-dtitle"><h2 class="tkl-dname" data-part="name" tabindex="-1">' + esc(d.name) + '</h2>' + (d.desc ? '<p class="tkl-ddesc tkl-late">' + esc(d.desc) + '</p>' : '') + '</div>' +
      '<div class="tkl-dval"><span class="tkl-dv tkl-num" data-part="value">' + fM(d.value) + '</span><span class="tkl-late tkl-dsub tkl-num"><span class="' + cls(d.day.amt) + '">Hoy ' + fS(d.day.amt) + ' (' + fP(d.day.pct) + ')</span><span class="' + cls(d.ret.pct) + '" title="' + RET_TIP + '">Rentabilidad ' + fP(d.ret.pct) + '</span></span></div>' +
      '<dl class="tkl-dmeta tkl-late">' + d.meta.map(function (m) { return '<div><dt>' + m[0] + '</dt><dd>' + esc(m[1]) + '</dd></div>'; }).join('') + (T.currencies && T.currencies().length > 1 ? '<div class="tkl-dccy"><dt>Ver cifras en</dt><dd><div data-ccy></div></dd></div>' : '') + '</dl></header>' +
      '<div class="tkl-late tkl-brief" data-brief></div>' +
      '<div class="tkl-late"><div class="tkl-tabw"><div class="tkl-tabs" role="tablist" aria-label="Secciones del portafolio" data-tabs><span class="tkl-ind" aria-hidden="true"></span>' + tabs.map(function (t) { var on = t[0] === tab, en = !!t[2]; return '<button type="button" role="tab" id="tklTab-' + t[0] + '" data-tab="' + t[0] + '" aria-selected="' + on + '" tabindex="' + (on ? 0 : -1) + '" aria-controls="tklPanel"' + (en ? '' : ' disabled title="Próximamente" aria-label="' + t[1] + ', próximamente"') + '>' + t[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="tkl-tp" id="tklPanel" role="tabpanel" aria-labelledby="tklTab-' + tab + '"><div class="tkl-rs" data-rs></div></div></div></div>';
    placeInd(false); requestAnimationFrame(function () { placeInd(false); }); if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { placeInd(false); });
    var cEl = $('[data-ccy]', detEl); if (cEl && window.__campo && window.__campo.ccySeg) window.__campo.ccySeg(cEl, d.cons ? 'todos' : id);
    var bEl = $('[data-brief]', detEl);
    if (bEl && window.CampoBrief) { try { briefApi = window.CampoBrief.render(bEl, d.cons ? 'todos' : getP(id), T); } catch (e) { if (window.console) console.error(e); } }
    else if (bEl) bEl.remove();
    mountTab($('[data-rs]', detEl), id, d);
    return true;
  }

  var token = 0;
  function parts(scope) { var m = {}; $$('[data-part]', scope).forEach(function (e) { m[e.dataset.part] = e; }); return m; }
  function ghosts(src) {
    var out = [];
    Object.keys(src).forEach(function (k) {
      var e = src[k], r = e.getBoundingClientRect(), cs = getComputedStyle(e), g = doc.createElement(k === 'sw' ? 'div' : 'span');
      g.className = 'tkl-ghost'; g.setAttribute('aria-hidden', 'true');
      g.style.cssText = 'position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;margin:0;transform-origin:0 0;pointer-events:none;z-index:1200;';
      if (k === 'sw') { g.style.background = cs.backgroundColor; g.style.borderRadius = cs.borderRadius; }
      else { g.textContent = e.textContent; g.style.cssText += 'white-space:nowrap;overflow:visible;font:' + cs.font + ';letter-spacing:' + cs.letterSpacing + ';color:' + cs.color + ';line-height:' + r.height + 'px;font-variant-numeric:tabular-nums;'; }
      doc.body.appendChild(g); out.push({ k: k, g: g, r: r, fs: parseFloat(cs.fontSize), col: cs.color, bg: cs.backgroundColor });
    });
    return out;
  }
  function flyTo(gs, tgt, done) {
    var left = gs.length || 0, fin = false;
    function end() { if (fin) return; fin = true; gs.forEach(function (o) { o.g.remove(); }); done(); }
    if (!gs.length) { end(); return; }
    gs.forEach(function (o) {
      var t = tgt[o.k]; if (!t) { o.g.remove(); if (--left <= 0) end(); return; }
      var r = t.getBoundingClientRect(), cs = getComputedStyle(t), s = o.k === 'sw' ? (r.width / (o.r.width || 1)) : (parseFloat(cs.fontSize) / (o.fs || 1)), sy = o.k === 'sw' ? (r.height / (o.r.height || 1)) : s;
      var kf = [{ transform: 'none' }, { transform: 'translate(' + (r.left - o.r.left) + 'px,' + (r.top - o.r.top) + 'px) scale(' + s + ',' + sy + ')' }];
      if (o.k !== 'sw') { kf[0].color = o.col; kf[1].color = cs.color; }
      var a = o.g.animate(kf, { duration: 420, easing: EXPO, fill: 'forwards' });
      a.onfinish = function () { if (--left <= 0) end(); };
    });
    setTimeout(end, 600);
  }
  var heroSaved = false;
  function setHeroHidden(h) { var he = heroEl(); if (he) he.hidden = h; }

  function showDetail(id, animate) {
    var my = ++token, wasDetail = current !== null;
    var row = id !== 'todos' ? rowEl(id) : null, ok = detailData(id);
    if (!ok) { go(null, false); return; }
    var animOK = animate && !reduce() && !wasDetail && visible() && !detEl.hidden === false;
    current = id;
    if (!animOK || !row) {
      renderDetail(id); setHeroHidden(true); listEl.hidden = true; detEl.hidden = false;
      if (animate && !reduce() && detEl.animate && visible()) detEl.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EXPO });
      return;
    }
    heroSaved = scrollY;
    var src = {}, rp = parts(row); Object.keys(rp).forEach(function (k) { src[k] = rp[k]; });
    var gs = ghosts(src);
    Object.keys(rp).forEach(function (k) { rp[k].style.visibility = 'hidden'; });
    var fades = [heroEl(), $('.tkl', listEl)].filter(Boolean).map(function (e) { return e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'linear', fill: 'forwards' }); });
    setTimeout(function () {
      if (my !== token) { gs.forEach(function (o) { o.g.remove(); }); return; }
      fades.forEach(function (a) { a.cancel(); });
      Object.keys(rp).forEach(function (k) { rp[k].style.visibility = ''; });
      renderDetail(id); setHeroHidden(true); listEl.hidden = true; detEl.hidden = false; scrollTo(0, 0);
      var dp = parts(detEl), lates = $$('.tkl-late', detEl);
      Object.keys(dp).forEach(function (k) { dp[k].style.visibility = 'hidden'; });
      lates.forEach(function (e) { e.style.opacity = 0; });
      flyTo(gs, dp, function () {
        Object.keys(dp).forEach(function (k) { dp[k].style.visibility = ''; });
        lates.forEach(function (e) { e.style.opacity = ''; if (e.animate) e.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: EXPO }); });
        var h = $('.tkl-dname', detEl); if (h) h.focus({ preventScroll: true });
      });
    }, 180);
  }

  function hideDetail(animate) {
    var my = ++token, prev = current; current = null;
    function swap() { destroyRs(); detEl.hidden = true; setHeroHidden(false); listEl.hidden = false; if (pending || !$('.tkl', listEl)) render(); }
    if (!animate || reduce() || !visible() || detEl.hidden) { swap(); return; }
    var dp = parts(detEl), gs = ghosts(dp), lates = $$('.tkl-late', detEl);
    Object.keys(dp).forEach(function (k) { dp[k].style.visibility = 'hidden'; });
    var fades = lates.map(function (e) { return e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'linear', fill: 'forwards' }); });
    setTimeout(function () {
      if (my !== token) { gs.forEach(function (o) { o.g.remove(); }); return; }
      fades.forEach(function (a) { a.cancel(); });
      swap(); scrollTo(0, heroSaved || 0);
      var row = prev && prev !== 'todos' ? rowEl(prev) : null, rp = row ? parts(row) : {};
      Object.keys(rp).forEach(function (k) { rp[k].style.visibility = 'hidden'; });
      [heroEl(), $('.tkl', listEl)].filter(Boolean).forEach(function (e) { e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: EASE }); });
      flyTo(gs, rp, function () { Object.keys(rp).forEach(function (k) { rp[k].style.visibility = ''; }); var o = row && $('.tkl-open', row); if (o) o.focus({ preventScroll: true }); });
    }, 150);
  }

  var cur = undefined;
  function go(id, animate) {
    if (id === cur) return; var was = cur; cur = id;
    if (id) { if (was) { current = id; renderDetail(id) || go(null, false); } else showDetail(id, animate); }
    else hideDetail(animate && was != null);
  }
  function routeId(a) {
    var id = (a && typeof a === 'object') ? (a.id || a.portfolio || a.route || a.view) : a;
    if (id == null || id === '') { var m = /^#\/?tracker(?:\/([^/?]+))?/.exec(location.hash || ''); id = m && m[1] ? decodeURIComponent(m[1]) : null; }
    if (id === 'tracker' || id === 'lista' || id === 'list') id = null;
    return id;
  }

  /* ---------- arranque ---------- */
  function onChange(ev) {
    if (!ready) return;
    render();
    if (ev && ev.quiet) return; /* cambio de moneda por ruta: el detalle lo pinta la ruta */
    if (cur) { if (!getP(cur) && cur !== 'todos') { try { T.back(); } catch (e) { } } else if (!detEl.hidden && !drag) renderDetail(cur); }
  }
  function init() {
    if (ready) return true;
    T = window.CampoTracker; listEl = doc.getElementById('tkList'); detEl = doc.getElementById('tkDetail');
    if (!T || !listEl || !detEl) return false;
    ready = true;
    listEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b || !listEl.contains(b)) return;
      var li = b.closest('.tkl-row'), id = li && li.dataset.id, a = b.dataset.act;
      if (a === 'open') T.open(id); else if (a === 'more') { if (pop && popAnchor === b) closePop(true); else openMenu(b, id); }
      else if (a === 'new') openCreate(); else if (a === 'imp') openImport();
    });
    listEl.addEventListener('pointerdown', function (e) { var g = e.target.closest('.tkl-grip'); if (g && !g.disabled) gripDown(e, g); });
    listEl.addEventListener('pointermove', gripMove);
    listEl.addEventListener('pointerup', function (e) { gripUp(e, false); });
    listEl.addEventListener('pointercancel', function (e) { gripUp(e, true); });
    listEl.addEventListener('keydown', function (e) {
      var g = e.target.closest && e.target.closest('.tkl-grip');
      if (g && e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); kbMove(g, e.key === 'ArrowUp' ? -1 : 1); }
      else if (g && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) live('Alt más flecha arriba o abajo para mover');
    });
    listEl.addEventListener('mouseover', function (e) { var r = e.target.closest('.tkl-row'); hoverOut(r ? r.dataset.id : null); });
    listEl.addEventListener('mouseleave', function () { hoverOut(null); });
    listEl.addEventListener('focusin', function (e) { var r = e.target.closest('.tkl-row'); if (r) hoverOut(r.dataset.id); });
    listEl.addEventListener('focusout', function (e) { if (!listEl.contains(e.relatedTarget)) hoverOut(null); });
    detEl.addEventListener('click', function (e) { if (e.target.closest('[data-act="back"]')) { T.back(); return; }
      /* Agregar movimiento (encabezado de la ficha o encabezado de Posiciones del Resumen): hoja de captura conectada al libro */
      var ax = e.target.closest('[data-act="addtx"], [data-addtx]'); if (ax) { if (window.CampoTxSheet) window.CampoTxSheet.open({ pfId: cur === 'todos' ? null : cur, type: 'buy', from: ax }); return; } var tb = e.target.closest('[role="tab"]'); if (tb && !tb.disabled) goTab(tb.dataset.tab); });
    detEl.addEventListener('keydown', onTabsKey);
    addEventListener('resize', function () { placeInd(false); });
    detEl.addEventListener('scroll', function (e) { if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-tabs')) tabEdges(); }, true);
    T.on('change', onChange);
    T.on('hover', function (id) { var v = (id && typeof id === 'object') ? id.id : id; if (v !== hovered) hovered = v || null; setHL(v); });
    T.on('route', function (a) { var id = routeId(a), tb = tabFromHash(); if (id && id === cur && !detEl.hidden) { selectTab(tb, false); return; } tab = id ? tb : 'resumen'; go(id, true); });
    T.on('create', openCreate);
    T.on('import', openImport);
    render();
    var r0 = routeId(); if (r0) { cur = null; tab = tabFromHash(); go(r0, false); }
    return true;
  }
  if (!init()) {
    var tries = 0, iv = setInterval(function () { if (init() || ++tries > 100) clearInterval(iv); }, 50);
    doc.addEventListener('DOMContentLoaded', init); addEventListener('load', init);
  }
})();
