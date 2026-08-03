/* ==========================================================================
   BlackPortfolio — capa de comportamiento compartida de la app v4

   Lo que toda pantalla de la app necesita y ninguna debe reimplementar: tema,
   controles segmentados, escalas de periodo, pestañas, notas de ayuda,
   diálogos, menús y el taller de gráficas sobre lienzo.

   Las gráficas leen los tokens de CSS en tiempo de ejecución y se repintan al
   cambiar de tema: no hay un solo color literal en este archivo. Si un día el
   eje deja de ir en `--ink-3` a 11 px, cambia aquí y cambia en las siete
   secciones a la vez. Ese es el punto.

   Nada de esto calcula negocio. Los prototipos traen cifras de muestra
   precomputadas y consistentes entre sí; los identificadores de los controles
   son los que ya usa `main.js`.
   ========================================================================== */

window.BPUI = (function () {
  'use strict';

  var root = document.documentElement;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ------------------------------------------------------- 1. Formato   */

  var nfMoney  = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
  var nfMoney0 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  var nfNum    = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 4 });

  function money(v) { return nfMoney.format(v); }
  function money0(v) { return nfMoney0.format(v); }

  // Rótulo de eje: nunca compite con la cifra de la lámina, así que se abrevia.
  // "US$87,934" no cabe en el margen izquierdo de una gráfica de 300 px de alto.
  function moneyK(v) {
    var a = Math.abs(v);
    if (a >= 1e6) return '$' + (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
    if (a >= 1e3) return '$' + (v / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'k';
    return '$' + v.toFixed(0);
  }
  function signed(v, f) { return (v > 0 ? '+' : v < 0 ? '−' : '') + (f || money)(Math.abs(v)); }
  function pct(v, d) { return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d === undefined ? 2 : d) + '%'; }
  function cls(v) { return v > 0 ? 'pos' : v < 0 ? 'neg' : ''; }
  function arrow(v) { return v > 0 ? 'sign sign--up' : v < 0 ? 'sign sign--down' : 'sign'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  /* --------------------------------------------------- 2. Series muestra */

  // Generador determinista: la misma cartera en cada carga y en cada tema.
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Camino aleatorio con deriva, anclado para que el primer y el último punto
  // sean exactamente los que publican las cifras de la cabecera.
  function walk(n, seed, from, to, vol) {
    var r = rng(seed), s = [0], i;
    for (i = 1; i < n; i++) s.push(s[i - 1] + (r() - 0.5) * (vol || 1));
    var lo = Math.min.apply(null, s), hi = Math.max.apply(null, s);
    var span = (hi - lo) || 1;
    var norm = s.map(function (v) { return (v - lo) / span; });
    var a = norm[0], b = norm[n - 1];
    return norm.map(function (v, k) {
      var t = k / (n - 1);
      return from + (to - from) * t + (v - (a + (b - a) * t)) * (to - from) * 0.55;
    });
  }

  function sparkPath(seed, up) {
    var r = rng(seed), pts = [], i, v = 50;
    for (i = 0; i < 30; i++) { v += (r() - 0.5) * 14 + (up ? 0.9 : -0.9); pts.push(v); }
    var lo = Math.min.apply(null, pts), hi = Math.max.apply(null, pts), sp = (hi - lo) || 1;
    return pts.map(function (p, k) {
      return (k / 29 * 60 + 1).toFixed(1) + ',' + (16 - (p - lo) / sp * 14).toFixed(1);
    }).join(' ');
  }
  function spark(seed, up) {
    return '<svg class="spark" viewBox="0 0 62 18" aria-hidden="true" focusable="false">' +
      '<polyline fill="none" stroke="' + (up ? 'var(--pos)' : 'var(--neg)') + '" stroke-width="1.25" ' +
      'stroke-linejoin="round" stroke-linecap="round" points="' + sparkPath(seed, up) + '"/></svg>';
  }

  /* -------------------------------------------------------- 3. Tokens    */

  var T = {};
  function readTokens() {
    var cs = getComputedStyle(root);
    ['ink', 'ink-2', 'ink-3', 'rule', 'rule-soft', 'rule-strong', 'surface', 'sunken', 'paper',
     'band', 'cobalt', 'cobalt-ink', 'cobalt-line', 'cobalt-tint', 'pos', 'neg',
     'ramp-1', 'ramp-2', 'ramp-3', 'ramp-4', 'ramp-5', 'ramp-6'].forEach(function (k) {
      T[k] = cs.getPropertyValue('--' + k).trim();
    });
    T.ramp = [T['ramp-1'], T['ramp-2'], T['ramp-3'], T['ramp-4'], T['ramp-5'], T['ramp-6']];
    T.dark = root.getAttribute('data-theme') === 'dark';
    return T;
  }
  function alpha(hex, a) {
    var h = (hex || '#000').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* ------------------------------------------------------- 4. Lienzo     */

  var painters = [];
  function register(canvas, fn) { if (canvas) painters.push({ c: canvas, fn: fn }); }

  function prep(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    return { ctx: ctx, w: r.width, h: r.height };
  }

  function repaint() {
    readTokens();
    painters.forEach(function (p) {
      if (p.c.offsetParent === null && p.c.getBoundingClientRect().width === 0) return;
      var s = prep(p.c);
      if (s) p.fn(s.ctx, s.w, s.h);
    });
  }

  var FONT = '11px "Libre Franklin", system-ui, sans-serif';

  // Ejes en --ink-3 a 11 px, rejilla en --rule, línea base en --rule-strong.
  function axes(ctx, w, h, pad, min, max, fmt, ticks) {
    var n = ticks || 4, i, y, v;
    ctx.font = FONT;
    ctx.fillStyle = T['ink-3'];
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    for (i = 0; i <= n; i++) {
      v = min + (max - min) * (i / n);
      y = h - pad.b - (h - pad.t - pad.b) * (i / n);
      ctx.strokeStyle = i === 0 ? T['rule-strong'] : T.rule;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.l, Math.round(y) + 0.5);
      ctx.lineTo(w - pad.r, Math.round(y) + 0.5);
      ctx.stroke();
      if (fmt) ctx.fillText(fmt(v), pad.l - 6, y);
    }
    ctx.textAlign = 'left';
  }

  function xLabels(ctx, w, h, pad, labels) {
    ctx.font = FONT;
    ctx.fillStyle = T['ink-3'];
    ctx.textBaseline = 'top';
    labels.forEach(function (lab, i) {
      var x = pad.l + (w - pad.l - pad.r) * (i / (labels.length - 1));
      ctx.textAlign = i === 0 ? 'left' : i === labels.length - 1 ? 'right' : 'center';
      ctx.fillText(lab, x, h - pad.b + 6);
    });
    ctx.textAlign = 'left';
  }

  function plot(series, w, h, pad, min, max) {
    var n = series.length;
    return series.map(function (v, i) {
      return [
        pad.l + (w - pad.l - pad.r) * (n === 1 ? 0 : i / (n - 1)),
        h - pad.b - (h - pad.t - pad.b) * ((v - min) / (max - min || 1))
      ];
    });
  }

  function stroke(ctx, pts, color, width, dash) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1.75;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    ctx.stroke();
    ctx.restore();
  }

  function fillUnder(ctx, pts, h, pad, color) {
    ctx.save();
    ctx.beginPath();
    pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    ctx.lineTo(pts[pts.length - 1][0], h - pad.b);
    ctx.lineTo(pts[0][0], h - pad.b);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function fillBetween(ctx, upper, lower, color) {
    ctx.save();
    ctx.beginPath();
    upper.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    for (var i = lower.length - 1; i >= 0; i--) ctx.lineTo(lower[i][0], lower[i][1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function bounds() {
    var lo = Infinity, hi = -Infinity;
    Array.prototype.slice.call(arguments).forEach(function (s) {
      s.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; });
    });
    var pad = (hi - lo) * 0.12 || 1;
    return [lo - pad, hi + pad];
  }

  // La familia secuencial de seis, nunca un arcoíris.
  function donut(ctx, w, h, slices, thick) {
    var cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 4, inner = r * (thick || 0.62), a = -Math.PI / 2;
    slices.forEach(function (s, i) {
      var sweep = s.w / 100 * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, a, a + sweep);
      ctx.arc(cx, cy, inner, a + sweep, a, true);
      ctx.closePath();
      ctx.fillStyle = s.color || T.ramp[i % 6];
      ctx.fill();
      ctx.strokeStyle = T.surface;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      a += sweep;
    });
  }

  function columns(ctx, w, h, rows, pad, opts) {
    opts = opts || {};
    var max = Math.max.apply(null, rows.map(function (d) { return d.v; })) * 1.15;
    var min = Math.min(0, Math.min.apply(null, rows.map(function (d) { return d.v; })) * 1.15);
    axes(ctx, w, h, pad, min, max, opts.fmt || moneyK, opts.ticks || 3);
    var step = (w - pad.l - pad.r) / rows.length;
    var zero = h - pad.b - (h - pad.t - pad.b) * ((0 - min) / (max - min || 1));
    ctx.font = FONT;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    rows.forEach(function (d, i) {
      var x = pad.l + step * i + step * 0.18, bw = step * 0.64;
      var y = h - pad.b - (h - pad.t - pad.b) * ((d.v - min) / (max - min || 1));
      var top = Math.min(y, zero), bh = Math.abs(zero - y);
      var color = d.color || (d.v < 0 ? T.neg : T['cobalt-line']);
      if (d.dashed) {
        // Lo estimado nunca se pinta como si fuera un hecho.
        ctx.save();
        ctx.setLineDash([3, 2]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, top + 0.5, bw - 1, Math.max(bh - 1, 1));
        ctx.fillStyle = alpha(color, 0.13);
        ctx.fillRect(x, top, bw, bh);
        ctx.restore();
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(x, top, bw, bh);
      }
      if (d.lab && (rows.length <= 12 || i % 2 === 0)) {
        ctx.fillStyle = T['ink-3'];
        ctx.fillText(d.lab, x + bw / 2, h - pad.b + 5);
      }
    });
    ctx.textAlign = 'left';
  }

  /* ---------------------------------------------------- 5. Segmentados   */

  function moveThumb(seg, instant) {
    var thumb = seg.querySelector('.seg__thumb');
    var on = seg.querySelector('button[aria-pressed="true"]');
    if (!thumb || !on) return;
    if (instant) thumb.style.transition = 'none';
    thumb.style.transform = 'translateX(' + (on.offsetLeft - 2) + 'px) scaleX(' + on.offsetWidth + ')';
    if (instant) { void thumb.offsetWidth; thumb.style.transition = ''; }
  }

  // `boot()` cablea todos los `.seg` que quedaron sueltos, así que una página
  // que ya cableó el suyo no debe volver a hacerlo: dos escuchas en el mismo
  // botón disparan `onChange` dos veces por clic.
  function wireSeg(seg, onChange) {
    if (!seg || seg.dataset.wired) return;
    seg.dataset.wired = '1';
    var btns = $$('button', seg);
    btns.forEach(function (b, i) {
      b.tabIndex = b.getAttribute('aria-pressed') === 'true' ? 0 : -1;
      b.addEventListener('click', function () {
        btns.forEach(function (o) {
          var on = o === b;
          o.setAttribute('aria-pressed', String(on));
          o.tabIndex = on ? 0 : -1;
        });
        moveThumb(seg, false);
        if (onChange) onChange(b);
      });
      b.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
        if (n < 0 || n >= btns.length) return;
        e.preventDefault();
        btns[n].click();
        btns[n].focus();
      });
    });
    moveThumb(seg, true);
  }

  // `.periods` es una escala, no un modo: marca de regla en vez de pulgar.
  function wirePeriods(group, onChange) {
    if (!group) return;
    $$('button', group).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('button', group).forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        if (onChange) onChange(b);
      });
    });
  }

  /* ------------------------------------------------------- 6. Pestañas   */

  function wireTabs(strip, onChange) {
    if (!strip) return;
    var tabs = $$('[role="tab"]', strip);
    var ink = $('.tabs__ink', strip);

    function moveInk(instant) {
      var on = strip.querySelector('[aria-selected="true"]');
      if (!on || !ink) return;
      if (instant) ink.style.transition = 'none';
      ink.style.transform = 'translateX(' + on.offsetLeft + 'px) scaleX(' + on.offsetWidth + ')';
      if (instant) { void ink.offsetWidth; ink.style.transition = ''; }
    }

    function select(btn, focus) {
      // Varias pestañas pueden gobernar el MISMO panel (los espacios del
      // escritorio). Se calcula primero qué queda visible; si no, la última
      // vuelta del bucle esconde el panel que la pestaña activa acaba de abrir.
      var keep = btn.getAttribute('aria-controls');
      tabs.forEach(function (b) {
        var on = b === btn;
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(b.getAttribute('aria-controls'));
        if (!panel) return;
        panel.hidden = panel.id !== keep;
        if (on) {
          panel.setAttribute('data-entering', '');
          window.setTimeout(function () { panel.removeAttribute('data-entering'); }, 240);
        }
      });
      moveInk(false);
      // Un `.seg` dentro de un panel oculto mide 0, así que su pulgar quedó en
      // `scaleX(0)` al arrancar: sin esto el botón activo se ve como texto
      // blanco sobre blanco la primera vez que se abre la pestaña.
      var shown = document.getElementById(keep);
      if (shown) $$('.seg', shown).forEach(function (s) { moveThumb(s, true); });
      btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (focus) btn.focus();
      repaint();
      if (onChange) onChange(btn);
    }

    tabs.forEach(function (b, i) {
      b.addEventListener('click', function () { select(b, false); });
      b.addEventListener('keydown', function (e) {
        var next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1
          : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
        if (next < 0 || next >= tabs.length) return;
        e.preventDefault();
        select(tabs[next], true);
      });
    });
    strip._moveInk = moveInk;
    return { select: select, moveInk: moveInk };
  }

  /* ------------------------------------------------- 7. Notas de ayuda   */

  // La burbuja vive en el `body`: dentro de una tabla con `overflow:auto` se
  // recortaría contra el borde del contenedor.
  var pop = null;
  function hidePop() { if (pop) { pop.remove(); pop = null; } }

  function wireHints() {
    document.addEventListener('pointerover', function (e) {
      var h = e.target.closest && e.target.closest('.hint');
      if (!h) return;
      hidePop();
      pop = document.createElement('div');
      pop.className = 'hint-pop';
      pop.textContent = h.dataset.hint;
      document.body.appendChild(pop);
      var r = h.getBoundingClientRect(), pr = pop.getBoundingClientRect();
      pop.style.left = Math.max(8, Math.min(window.innerWidth - pr.width - 8, r.left - pr.width / 2 + r.width / 2)) + 'px';
      pop.style.top = (r.top > pr.height + 12 ? r.top - pr.height - 8 : r.bottom + 8) + 'px';
    });
    document.addEventListener('pointerout', function (e) { if (e.target.closest && e.target.closest('.hint')) hidePop(); });
    document.addEventListener('focusin', function (e) { if (!e.target.closest || !e.target.closest('.hint')) hidePop(); });
    window.addEventListener('scroll', hidePop, true);
  }

  /* --------------------------------------------------------- 8. Diálogos */

  function openDlg(id) {
    var d = typeof id === 'string' ? document.getElementById(id) : id;
    if (!d) return;
    d.hidden = false;
    d.dataset.returnTo = document.activeElement && document.activeElement.id;
    // El foco entra en el primer campo, no en la equis: una lista de selectores
    // CSS empata por orden del documento, y ahí el botón de cerrar va primero.
    var f = d.querySelector('input:not([type=hidden]), select, textarea') || d.querySelector('button');
    if (f) f.focus();
  }

  function closeDlg(d) {
    d.hidden = true;
    var back = d.dataset.returnTo && document.getElementById(d.dataset.returnTo);
    if (back) back.focus();
  }

  function wireDialogs() {
    $$('.dlg').forEach(function (d) {
      d.addEventListener('mousedown', function (e) { if (e.target === d) closeDlg(d); });
      $$('[data-close-dlg]', d).forEach(function (b) { b.addEventListener('click', function () { closeDlg(d); }); });
      d.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { closeDlg(d); return; }
        if (e.key !== 'Tab') return;
        var f = $$('button, input, select, textarea, a[href]', d).filter(function (x) { return !x.disabled && x.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
      var form = d.querySelector('form');
      if (form) form.addEventListener('submit', function (e) { e.preventDefault(); closeDlg(d); });
    });
    $$('[data-open-dlg]').forEach(function (b) {
      b.addEventListener('click', function () { openDlg(b.dataset.openDlg); });
    });
  }

  /* ----------------------------------------------------------- 9. Menús  */

  function wireMenus() {
    $$('.menu').forEach(function (m) {
      var trigger = m.querySelector('[aria-haspopup]');
      var list = m.querySelector('.menu__list');
      if (!trigger || !list) return;
      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = list.hidden;
        $$('.menu__list').forEach(function (o) { o.hidden = true; });
        $$('.menu [aria-haspopup]').forEach(function (o) { o.setAttribute('aria-expanded', 'false'); });
        list.hidden = !open;
        trigger.setAttribute('aria-expanded', String(open));
      });
    });
    document.addEventListener('click', function () {
      $$('.menu__list').forEach(function (o) { o.hidden = true; });
      $$('.menu [aria-haspopup]').forEach(function (o) { o.setAttribute('aria-expanded', 'false'); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      $$('.menu__list').forEach(function (o) {
        if (!o.hidden) {
          o.hidden = true;
          var t = o.parentElement.querySelector('[aria-haspopup]');
          if (t) { t.setAttribute('aria-expanded', 'false'); t.focus(); }
        }
      });
    });
  }

  /* ----------------------------------------------------------- 10. Tema  */

  var afterTheme = [];
  function onTheme(fn) { afterTheme.push(fn); }

  function applyTheme(theme, animate) {
    if (animate) {
      root.classList.add('is-theming');
      window.setTimeout(function () { root.classList.remove('is-theming'); }, 340);
    }
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('bp-theme', theme); } catch (e) { /* sin almacenamiento */ }
    var btn = $('#themeToggle');
    if (btn) {
      var dark = theme === 'dark';
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    }
    readTokens();
    afterTheme.forEach(function (fn) { fn(T); });
    repaint();
  }

  function wireTheme() {
    var btn = $('#themeToggle');
    if (btn) btn.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
  }

  /* ------------------------------------------- 11. Destello de dato nuevo */

  // El único movimiento que celebra un cambio: dura lo que tarda el ojo en
  // ubicar la cifra que se movió.
  function flash(selector) {
    $$(selector).forEach(function (el) {
      el.classList.remove('is-fresh');
      void el.offsetWidth;
      el.classList.add('is-fresh');
    });
  }

  /* --------------------------------------------------------- 12. Arranque */

  var raf = null;
  function schedule() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () {
      raf = null;
      $$('.tabs__strip').forEach(function (s) { if (s._moveInk) s._moveInk(true); });
      $$('.seg').forEach(function (s) { moveThumb(s, true); });
      repaint();
    });
  }

  function boot() {
    readTokens();
    wireTheme();
    wireHints();
    wireDialogs();
    wireMenus();
    $$('.seg').forEach(function (s) { if (!s.dataset.wired) wireSeg(s); });
    applyTheme(root.getAttribute('data-theme') || 'light', false);
    window.addEventListener('resize', schedule);
    if (window.ResizeObserver) new ResizeObserver(schedule).observe(document.body);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    schedule();
  }

  return {
    $: $, $$: $$,
    money: money, money0: money0, moneyK: moneyK, nfNum: nfNum,
    signed: signed, pct: pct, cls: cls, arrow: arrow, esc: esc,
    rng: rng, walk: walk, spark: spark,
    T: T, readTokens: readTokens, alpha: alpha,
    register: register, repaint: repaint, prep: prep,
    axes: axes, xLabels: xLabels, plot: plot, stroke: stroke,
    fillUnder: fillUnder, fillBetween: fillBetween, bounds: bounds,
    donut: donut, columns: columns, FONT: FONT,
    wireSeg: wireSeg, moveThumb: moveThumb, wirePeriods: wirePeriods, wireTabs: wireTabs,
    openDlg: openDlg, closeDlg: closeDlg,
    applyTheme: applyTheme, onTheme: onTheme, flash: flash,
    schedule: schedule, boot: boot
  };
})();
