/* Campo · microinteracciones (se carga al final). Mejora progresiva: no toca el HTML ni los otros scripts;
   inyecta lo mínimo de marcado, de forma idempotente, y observa lo que los demás scripts pintan. */
(function () {
  'use strict';
  var fine = matchMedia('(hover:hover) and (pointer:fine)');
  var rm = matchMedia('(prefers-reduced-motion: reduce)');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
  var raf = function (f) { return requestAnimationFrame(f); };
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function num(t) { var m = String(t).replace(/−/g, '-').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : NaN; }
  var api = window.bpFx = {};

  /* ---------- luz del puntero (R1, R8) y punto de entrada (R2): un listener delegado cada uno ---------- */
  var LIT = '.btn-primary, .plan, #view-app .panel, #view-app .insight';
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' || !e.target.closest) return;
    for (var n = e.target.closest(LIT); n; n = n.parentElement && n.parentElement.closest(LIT)) {
      var r = n.getBoundingClientRect();
      n.style.setProperty('--mx', (e.clientX - r.left) + 'px'); n.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }
  }, { passive: true });
  function edge(e) {
    var b = e.target.closest && e.target.closest('.btn-secondary, .btn-ghost');
    if (!b || b.contains(e.relatedTarget) || e.pointerType !== 'mouse') return;
    var r = b.getBoundingClientRect();
    b.style.setProperty('--ex', (e.clientX - r.left) + 'px'); b.style.setProperty('--ey', (e.clientY - r.top) + 'px');
  }
  document.addEventListener('pointerover', edge, { passive: true });
  document.addEventListener('pointerout', edge, { passive: true });

  /* ---------- R15: presión visible al menos 90 ms (táctil y ratón) ---------- */
  addEventListener('pointerdown', function (e) {
    var b = e.target.closest && e.target.closest('.btn, .icon-btn, .pw-btn, .seg > button, .side-nav button');
    if (!b || b.disabled) return;
    b.setAttribute('data-pressed', ''); var t0 = performance.now();
    function end() {
      removeEventListener('pointerup', end, true); removeEventListener('pointercancel', end, true);
      setTimeout(function () { b.removeAttribute('data-pressed'); }, Math.max(0, 90 - (performance.now() - t0)));
    }
    addEventListener('pointerup', end, true); addEventListener('pointercancel', end, true);
  }, { passive: true, capture: true });

  /* ---------- R3: flecha del CTA ---------- */
  $$('svg.ic').forEach(function (s) { var u = s.querySelector('use'); if (u && u.getAttribute('href') === '#i-arrow') s.classList.add('ic-go'); });

  /* ---------- R1: estados del botón (carga y ✓ que se dibuja) ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  function ensureIcons(btn) {
    if (btn.querySelector('.bt-spin')) return;
    btn.insertAdjacentHTML('beforeend',
      '<svg class="bt-spin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" pathLength="100"/></svg>' +
      '<svg class="bt-ok" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.4 3.4L15 7" pathLength="1"/></svg>');
  }
  function setState(btn, st) {
    if (st) { ensureIcons(btn); btn.setAttribute('data-state', st); if (st === 'loading') btn.setAttribute('aria-busy', 'true'); }
    else { btn.removeAttribute('data-state'); btn.removeAttribute('aria-busy'); }
  }
  /* alrededor de una promesa: el spinner solo aparece si tarda más de `wait` ms */
  api.btn = function (btn, task, o) {
    o = o || {}; var hold = o.hold || 1400, wait = o.wait == null ? 120 : o.wait;
    if (btn.hasAttribute('aria-busy')) return task;
    setState(btn, null); btn.setAttribute('aria-busy', 'true');
    var t = setTimeout(function () { btn.setAttribute('data-state', 'loading'); ensureIcons(btn); }, wait);
    function end(ok) {
      clearTimeout(t); btn.removeAttribute('aria-busy');
      if (!ok) { setState(btn, null); return; }
      setState(btn, 'success'); setTimeout(function () { setState(btn, null); }, hold);
    }
    return Promise.resolve(task).then(function (r) { end(true); return r; }, function (e) { end(false); throw e; });
  };
  /* el login de campo.js pone .loading + disabled; el botón de Google, solo disabled. Se observan, no se tocan. */
  var loginBtn = $('#loginBtn'), gBtn = $('#gBtn');
  if (loginBtn) {
    ensureIcons(loginBtn);
    new MutationObserver(function () { setState(loginBtn, loginBtn.classList.contains('loading') ? 'loading' : null); }).observe(loginBtn, { attributes: true, attributeFilter: ['class'] });
  }
  if (gBtn) {
    ensureIcons(gBtn);
    new MutationObserver(function () { setState(gBtn, gBtn.disabled ? 'loading' : null); }).observe(gBtn, { attributes: true, attributeFilter: ['disabled'] });
  }

  /* ---------- 2FA: ✓ que se dibuja al verificar (observa .ok de #code) ---------- */
  var code = $('#code');
  if (code) {
    var vok = document.createElement('div'); vok.className = 'fx-vok'; vok.setAttribute('aria-hidden', 'true');
    vok.innerHTML = '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.2"/><path d="M5.8 10.4l2.9 2.9 5.5-6.1" pathLength="1"/></svg><span>Verificado</span>';
    code.insertAdjacentElement('afterend', vok);
    new MutationObserver(function () { vok.classList.toggle('on', code.classList.contains('ok')); }).observe(code, { attributes: true, attributeFilter: ['class'] });
  }

  /* ---------- R4: la pastilla existente se mide solo si las columnas salen desiguales ---------- */
  function segFit(seg) {
    if (seg._fit) return; seg._fit = true;
    function measure() {
      var bs = $$(':scope > button', seg); if (!bs.length || !bs[0].offsetWidth) return;
      var eq = (seg.clientWidth - 6) / bs.length;
      if (!bs.some(function (b) { return Math.abs(b.offsetWidth - eq) > 1; })) { seg.removeAttribute('data-fit'); return; }
      var a = bs.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0]; if (!a) return;
      seg.setAttribute('data-fit', '');
      seg.style.setProperty('--fx-x', (a.offsetLeft - 3) + 'px'); seg.style.setProperty('--fx-w', a.offsetWidth + 'px');
    }
    new MutationObserver(measure).observe(seg, { attributes: true, attributeFilter: ['aria-pressed'], subtree: true });
    new ResizeObserver(measure).observe(seg);
    measure();
  }
  $$('.seg').forEach(segFit);

  /* ---------- R6: odómetro. count() de campo.js escribe textContent en cada cuadro del resorte; se intercepta
     esa escritura en la propia instancia: se salta al valor final y el rodillo hace la transición. ---------- */
  var STRIP = Array.prototype.map.call('0123456789'.repeat(3), function (c) { return c; }).join('\n');
  function odoBuild(el, text) {
    var strips;
    el.innerHTML = '<span class="sr">' + esc(text) + '</span><span class="od" aria-hidden="true">' +
      Array.prototype.map.call(text, function (c) {
        return /\d/.test(c) ? '<span class="od-d"><span class="od-s" style="--p:' + (+c + 10) + '">' + STRIP + '</span></span>' : '<span>' + esc(c) + '</span>';
      }).join('') + '</span>';
    strips = $$('.od-s', el).map(function (s) { return { s: s, p: parseInt(s.style.getPropertyValue('--p'), 10) }; });
    strips.forEach(function (o) {
      o.s.addEventListener('transitionend', function (e) {
        if (e.propertyName !== 'translate') return;
        o.p = (o.p % 10) + 10; o.s.classList.add('snap'); o.s.style.setProperty('--p', o.p); void o.s.offsetWidth; o.s.classList.remove('snap');
      });
    });
    el._od = { sig: text.replace(/\d/g, '#'), strips: strips };
  }
  function odoUpdate(el, text, dir) {
    var od = el._od, sig = text.replace(/\d/g, '#');
    if (!od || od.sig !== sig) { odoBuild(el, text); return; }
    el.firstChild.textContent = text;
    var digits = text.split('').filter(function (c) { return /\d/.test(c); }).map(Number), n = digits.length;
    od.strips.forEach(function (o, i) {
      var to = digits[i], from = o.p % 10; if (to === from) return;
      var tgt = dir >= 0 ? o.p + (to - from + 10) % 10 : o.p - (from - to + 10) % 10;
      if (tgt < 0 || tgt > 29) tgt = to + 10;
      o.p = tgt; o.s.style.setProperty('--dl', Math.min(120, (n - 1 - i) * 18) + 'ms'); o.s.style.setProperty('--p', tgt);
    });
  }
  function odoSet(el, text) {
    var sp = el._sp;
    if (sp && el._run && el._fmt && !rm.matches) { sp.v = sp.t; sp.vel = 0; text = el._fmt(sp.t); }   /* sin cuenta intermedia: el rodillo hace el trabajo */
    if (text === el._fxT) return;
    var prev = el._fxT, v = sp ? sp.t : num(text), dir = Math.sign(v - (el._fxV || 0)) || 1;
    el._fxT = text; el._fxV = isNaN(v) ? 0 : v;
    if (rm.matches || !/\d/.test(text)) { odoBuild(el, text); return; }
    if (!/\d/.test(prev)) { odoBuild(el, text.replace(/\d/g, '0')); void el.offsetWidth; odoUpdate(el, text, 1); return; }   /* primera carga: de ceros a la cifra */
    odoUpdate(el, text, dir);
  }
  function odoManage(el) {
    if (!el || el._fxOd) return; el._fxOd = true;
    var t = el.textContent; el._fxT = t; el._fxV = isNaN(num(t)) ? 0 : num(t);
    if (/\d/.test(t)) odoBuild(el, t);
    Object.defineProperty(el, 'textContent', { configurable: true, get: function () { return el._fxT; }, set: function (v) { odoSet(el, String(v)); } });
  }
  ['#lgTotal', '#lgPnl', '#lgDay', '#lgVs'].forEach(function (s) { odoManage($(s)); });
  $$('[data-price]').forEach(odoManage);
  api.odo = odoManage;

  /* ---------- R7: destello de precio, solo si el valor cambió de verdad ---------- */
  var lastFlash = new WeakMap(), quietUntil = performance.now() + 1500;
  api.flash = function (el, dir) {
    if (!dir || !el || !el.animate) return;
    var now = performance.now(); if (now - (lastFlash.get(el) || 0) < 1000) return; lastFlash.set(el, now);
    el.classList.add('fx-px');
    var c = 'color-mix(in oklch, var(' + (dir > 0 ? '--gain' : '--loss') + ') 22%, transparent)', z = 'color-mix(in oklch, var(' + (dir > 0 ? '--gain' : '--loss') + ') 0%, transparent)';
    el.animate([{ backgroundColor: c, boxShadow: '0 0 0 3px ' + c }, { backgroundColor: z, boxShadow: '0 0 0 3px ' + z }], { duration: rm.matches ? 400 : 900, easing: EASE });
  };
  function watch(host, collect) {
    if (!host) return; var seen = {}, pend = 0;
    function scan() {
      pend = 0; var quiet = performance.now() < quietUntil;
      collect(host).forEach(function (it) {
        var v = num(it.el.textContent), p = seen[it.key];
        if (!quiet && p != null && !isNaN(v) && v !== p) api.flash(it.el, Math.sign(v - p));
        seen[it.key] = v;
      });
    }
    new MutationObserver(function () { if (!pend) pend = setTimeout(scan, 40); }).observe(host, { childList: true, characterData: true, subtree: true });
    scan();
  }
  watch($('#marketStrip'), function (h) {   /* .mk (versión base) o .mkc (banda nueva): la cifra es .mk-last o .mkt-px b */
    return $$('.mk, .mkc', h).map(function (m) { var s = $('.mk-sym, .mkc-name', m), l = $('.mk-last, .mkt-px b', m); return s && l ? { key: s.textContent, el: l } : null; }).filter(Boolean);
  });
  watch($('#posTbl'), function (h) { return $$('.tr[data-t]', h).map(function (r) { var c = r.children[1]; return c ? { key: r.dataset.t, el: c } : null; }).filter(Boolean); });

  /* ---------- R9: tooltip propio con retardo y modo "ya caliente" ---------- */
  function title2tip(root) {
    $$('[title]', root).forEach(function (el) {
      if (el.closest('svg')) return;
      el.dataset.tip = el.getAttribute('title');
      if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', el.getAttribute('title'));
      el.removeAttribute('title');
    });
  }
  title2tip(document);
  new MutationObserver(function (rs) { rs.forEach(function (r) { var t = r.target; if (t.nodeType === 1 && t.hasAttribute('title') && !t.closest('svg')) title2tip(t.parentNode || t); }); })
    .observe(document.body, { attributes: true, attributeFilter: ['title'], subtree: true });
  var TIP = '[data-tip], .icon-btn[aria-label], .pw-btn[aria-label]';
  var tip = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'tip', id: 'bp-tip' }));
  tip.setAttribute('role', 'tooltip');
  var openT = 0, closeT = 0, warmAt = -1e9, cur = null;
  function tipText(el) { return el.dataset.tip || el.getAttribute('aria-label') || ''; }
  function hot() { return tip.classList.contains('on') || performance.now() - warmAt < 350; }
  function place(el) {
    var r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, top = r.top - h - 8 >= 8;
    var x = Math.min(innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2)), y = top ? r.top - h - 8 : r.bottom + 8;
    tip.style.setProperty('--tx', x + 'px'); tip.style.setProperty('--ty', y + 'px');
    tip.style.setProperty('--ox', (r.left + r.width / 2 - x) + 'px'); tip.style.setProperty('--oy', top ? '100%' : '0');
  }
  function openTip(el, delay) {
    clearTimeout(closeT); clearTimeout(openT);
    openT = setTimeout(function () {
      var txt = tipText(el); if (!txt) return;
      var warm = hot(); tip.textContent = txt; tip.classList.toggle('instant', warm); place(el);
      if (cur && cur !== el) cur.removeAttribute('aria-describedby');
      el.setAttribute('aria-describedby', 'bp-tip'); tip.classList.add('on'); cur = el;
    }, delay);
  }
  function closeTip(now) {
    clearTimeout(openT); clearTimeout(closeT);
    function f() { if (tip.classList.contains('on')) warmAt = performance.now(); tip.classList.remove('on'); if (cur) cur.removeAttribute('aria-describedby'); cur = null; }
    if (now) f(); else closeT = setTimeout(f, 100);
  }
  document.addEventListener('pointerover', function (e) {
    var el = e.target.closest && e.target.closest(TIP); if (!el || e.pointerType !== 'mouse' || !fine.matches || el === cur) return;
    openTip(el, hot() ? 0 : 450);
  });
  document.addEventListener('pointerout', function (e) {
    var el = e.target.closest && e.target.closest(TIP); if (!el || e.pointerType !== 'mouse' || el.contains(e.relatedTarget)) return;
    closeTip(false);
  });
  document.addEventListener('pointerdown', function () { closeTip(true); }, true);
  document.addEventListener('focusin', function (e) { var el = e.target.closest && e.target.closest(TIP); if (el && el.matches(':focus-visible')) openTip(el, 0); });
  document.addEventListener('focusout', function (e) { if (e.target.closest && e.target.closest(TIP)) closeTip(true); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeTip(true); });
  addEventListener('scroll', function () { closeTip(true); }, { passive: true, capture: true });
  tip.addEventListener('pointerenter', function () { clearTimeout(closeT); });
  tip.addEventListener('pointerleave', function () { closeTip(false); });

  /* ---------- R10: entrada escalonada. Solo listas y solo como respuesta (filtro, plan) o al entrar en pantalla
     por debajo del pliegue. En reposo todo es visible: se anima con WAAPI y fill:backwards, nunca hay opacity:0 esperando. ---------- */
  function stagger(els) {
    if (rm.matches) return;
    els.slice(0, 8).forEach(function (el, i) {
      el.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: i * 40, easing: EASE, fill: 'backwards' });
    });
  }
  api.stagger = stagger;
  var out = new WeakSet();
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var t = e.target;
      if (!out.has(t)) { if (e.isIntersecting) { io.unobserve(t); } else out.add(t); return; }   /* ya visible al cargar: no se anima */
      if (!e.isIntersecting) return;
      io.unobserve(t); stagger($$(t._fxItems, t).filter(function (x) { return x.offsetParent; }));
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
  [['#newsList', '.nrow'], ['#ladder', '.plan']].forEach(function (p) { var h = $(p[0]); if (h) { h._fxItems = p[1]; io.observe(h); } });
  var nl = $('#newsList');
  if (nl) new MutationObserver(function (rs) {
    var changed = rs.some(function (r) { return /\bgone\b/.test(r.oldValue || '') !== r.target.classList.contains('gone'); });
    if (changed) stagger($$('.nrow:not(.gone)', nl));
  }).observe(nl, { attributes: true, attributeFilter: ['class'], attributeOldValue: true, subtree: true });
  var cmp = $('#compare');
  if (cmp) new MutationObserver(function (rs) { if (rs.some(function (r) { return r.addedNodes.length; })) stagger($$('.crow:not(.hd)', cmp)); }).observe(cmp, { childList: true });

  /* ---------- R13: toast. Misma API (campo.js escribe textContent y pone .on); aquí solo se observa ---------- */
  var toast = $('#toast');
  if (toast) {
    var wasOn = toast.classList.contains('on'), held = false, holdT = 0;
    new MutationObserver(function (rs) {
      var had = wasOn;
      rs.forEach(function (r) { if (r.type === 'childList' && had && !rm.matches) toast.animate([{ translate: '0 -3px' }, { translate: '0 0' }], { duration: 140, easing: EASE }); });
      if (held && !toast.classList.contains('on')) toast.classList.add('on');   /* con el puntero encima, el aviso no se va */
      wasOn = toast.classList.contains('on');
    }).observe(toast, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    toast.addEventListener('pointerenter', function () { held = true; clearTimeout(holdT); });
    toast.addEventListener('pointerleave', function () { held = false; clearTimeout(holdT); holdT = setTimeout(function () { if (!held) toast.classList.remove('on'); }, 1200); });
  }
})();
