/* Portify · Campo · capa de movimiento de la portada (index.html). Se carga al final, después de campo-landing.js.
   Aditiva: no toca la lógica de los otros scripts; observa lo que pintan y añade marcado propio, de forma idempotente.
   Piezas portadas de 21st.dev a JS puro (sin React ni framer-motion):
   - Blur Fade / Text Animate, Number Ticker, Marquee, Border Beam, Shiny Button, Scroll Progress (Magic UI, Dillion Verma)
   - Glowing Effect, Card Spotlight, Aurora Background (Aceternity UI, Manu Arora)
   Un solo IntersectionObserver compartido; los bucles se pausan fuera de pantalla y con la pestaña oculta. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var rm = matchMedia('(prefers-reduced-motion: reduce)');
  var still = function () { return rm.matches; };
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)', OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
  root.classList.add('js-motion');

  /* pestaña oculta: pausa todos los bucles */
  function vis() { root.classList.toggle('mo-hidden', doc.hidden); }
  doc.addEventListener('visibilitychange', vis); vis();

  /* ---------- un solo IntersectionObserver ---------- */
  var fns = new Map();
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { var f = fns.get(e.target); if (f) f(e); });
  }, { threshold: [0, 0.2] }) : null;
  function watch(el, f) { if (!el) return; if (!io) { f({ isIntersecting: true, intersectionRatio: 1, target: el }); return; } fns.set(el, f); io.observe(el); }
  function unwatch(el) { fns.delete(el); if (io) io.unobserve(el); }
  /* una sola vez, cuando entra de verdad (20 % o 80 px visibles) */
  function once(el, f) {
    watch(el, function (e) {
      if (!e.isIntersecting || (e.intersectionRatio < 0.2 && e.intersectionRect && e.intersectionRect.height < 80)) return;
      unwatch(el); f(el);
    });
  }
  /* bucles: clase .mo-off mientras no se ve */
  function loop(el) { watch(el, function (e) { el.classList.toggle('mo-off', !e.isIntersecting); }); }
  function below(el) { var r = el.getBoundingClientRect(); return r.top > innerHeight * 0.9; }
  function rise(els, step, d) {
    if (still() || !Element.prototype.animate) return;
    els.forEach(function (el, i) { el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: d || 420, delay: Math.min(i, 8) * (step || 60), easing: OUT, fill: 'backwards' }); });
  }

  /* ---------- 1. Blur Fade / Text Animate (blurInUp por palabra) en el h1 del héroe ---------- */
  (function words() {
    var h = $('.hero h1'); if (!h || still() || h.getBoundingClientRect().bottom < 0) return;
    var txt = h.textContent, ws = txt.trim().split(/\s+/), last = null;
    h.setAttribute('aria-label', txt); h.textContent = '';
    ws.forEach(function (w, i) {
      var s = doc.createElement('span'); s.className = 'mo-w'; s.textContent = w; s.style.setProperty('--w', i); s.setAttribute('aria-hidden', 'true');
      h.appendChild(s); if (i < ws.length - 1) h.appendChild(doc.createTextNode(' ')); last = s;
    });
    h.classList.add('mo-words');
    var done = function () { h.textContent = txt; h.removeAttribute('aria-label'); h.classList.remove('mo-words'); };
    last.addEventListener('animationend', done, { once: true });
    setTimeout(function () { if (h.classList.contains('mo-words')) done(); }, 2400);
  })();

  /* ---------- 2. Number Ticker: cifras que cuentan hasta su valor (ancho fijo durante la cuenta) ---------- */
  var nfs = {};
  function nf(d) { return nfs[d] || (nfs[d] = new Intl.NumberFormat('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d })); }
  function parse(t) {
    var m = /(\d[\d,]*)(\.\d+)?/.exec(t); if (!m) return null;
    return { pre: t.slice(0, m.index), post: t.slice(m.index + m[0].length), v: parseFloat((m[1] + (m[2] || '')).replace(/,/g, '')), d: m[2] ? m[2].length - 1 : 0, t: t };
  }
  var spring = function (p) { return 1 - Math.pow(1 - p, 4); };
  function tick(el, from, dur) {
    if (el._moStop) el._moStop();
    var p = parse(el.textContent); el._moFinal = el.textContent;
    if (!p || still() || from == null || from === p.v) { el._moV = p && p.v; return; }
    var w = el.getBoundingClientRect().width;
    el.classList.add('mo-tk'); el.style.minWidth = w + 'px';
    var t0 = performance.now(), raf = 0;
    function write(v) { var s = p.pre + nf(p.d).format(v) + p.post; el._moCur = v; el._moTxt = s; el.textContent = s; }
    function stop() { cancelAnimationFrame(raf); el.classList.remove('mo-tk'); el.style.minWidth = ''; el._moStop = null; }
    function frame(now) {
      var k = Math.min(1, (now - t0) / dur);
      if (k >= 1) { stop(); el._moTxt = p.t; el._moCur = p.v; el.textContent = p.t; return; }
      write(from + (p.v - from) * spring(k)); raf = requestAnimationFrame(frame);
    }
    el._moV = p.v; el._moStop = stop;
    write(from); raf = requestAnimationFrame(frame);
  }
  /* cambios que escriben los otros scripts: se cuenta desde lo que se ve en ese momento */
  var mo = window.MutationObserver ? function (el, f) { new MutationObserver(f).observe(el, { childList: true, characterData: true, subtree: true }); } : function () { };
  function follow(el) {
    if (!el || el._moF) return; el._moF = true;
    mo(el, function () {
      if (el.textContent === el._moTxt) return;
      tick(el, el._moStop ? el._moCur : el._moV, 220);
    });
  }
  (function ohlc() {
    var els = ['#ohO', '#ohH', '#ohL', '#ohC'].map(function (s) { return $(s); }).filter(Boolean);
    els.forEach(function (el) { var p = parse(el.textContent); if (p) tick(el, 0, 420); follow(el); });
  })();

  /* ---------- 3. Marquee: cinta de cotizaciones con lo que ya pintó la sección Mercados ---------- */
  var tape = $('#moTape'), vp = tape && $('.tape-vp', tape), lab = tape && $('.tape-lab', tape), mkt = $('#mkt'), sig = '';
  function msg(t) { vp.innerHTML = ''; var s = doc.createElement('span'); s.className = 'tp-msg'; s.textContent = t; vp.appendChild(s); lab.textContent = ''; }
  function group(cards) {
    var g = doc.createElement('div'); g.className = 'tp-g';
    cards.forEach(function (c) {
      var i = doc.createElement('span'), n = doc.createElement('span'), b = doc.createElement('b'), px = $('.mkt-px', c), d = $('.delta', c);
      i.className = 'tp-i'; n.className = 'tp-n'; n.textContent = ($('.mkc-name', c) || c).textContent;
      if (px) { b = px.cloneNode(true); var pb = $('b', px), cb = $('b', b); cb.className = 'num'; cb.removeAttribute('style'); cb.textContent = pb._moFinal || pb.textContent; }
      else b.textContent = 'Sin dato';
      i.appendChild(n); i.appendChild(b); if (d) i.appendChild(d.cloneNode(true));
      g.appendChild(i);
    });
    return g;
  }
  function paintTape() {
    if (!tape || !mkt) return;
    var cards = $$('.mkc', mkt);
    if (!cards.length) { var e = $('.mkt-empty', mkt), t = e && /Cargando/.test(e.textContent) ? 'Cargando cotizaciones…' : 'Cotizaciones no disponibles por ahora'; if (sig !== t) { sig = t; msg(t); } return; }
    var s = cards.map(function (c) { var b = $('.mkt-px b', c); return c.textContent.replace(b ? b.textContent : '', b && b._moFinal || ''); }).join('|'), sub = $('.mkt-sub', mkt);
    lab.textContent = sub && /^En vivo/.test(sub.textContent) ? 'En vivo' : 'Cierre anterior';
    if (s === sig) return; sig = s;
    vp.innerHTML = '';
    var g = group(cards); vp.appendChild(g);
    if (still()) return;
    var gw = g.getBoundingClientRect().width || 1, n = Math.max(2, Math.ceil(vp.clientWidth / gw) + 1);
    for (var k = 1; k < n; k++) vp.appendChild(g.cloneNode(true));
    $$('.tp-g', vp).forEach(function (x) { x.style.setProperty('--dur', Math.round(gw / 36) + 's'); x.classList.add('mo-run'); });
  }
  if (tape) {
    loop(tape);
    var queued = 0, q = function () { if (!queued) queued = requestAnimationFrame(function () { queued = 0; paintTape(); }); };
    if (mkt) mo(mkt, q);
    paintTape();
    var rw = 0; addEventListener('resize', function () { if (Math.abs(innerWidth - rw) < 40) return; rw = innerWidth; sig = ''; q(); }, { passive: true }); rw = innerWidth;
  }

  /* cifras de las tarjetas de mercado: cuentan al entrar y al cambiar */
  var seenPx = {};
  function marketCards() {
    $$('.mkc', mkt).forEach(function (c) {
      var b = $('.mkt-px b', c); if (!b || b._moSeen) return; b._moSeen = true;
      var key = ($('.mkc-name', c) || c).textContent, p = parse(b.textContent); if (!p) return;
      var prev = seenPx[key]; seenPx[key] = p.v;
      if (prev != null) tick(b, prev, 220);
      else once(c, function () { tick(b, 0, 420); });
    });
    var band = $('.mkt-band', mkt);
    if (band && !band._moS) { band._moS = true; if (below(band)) once(band, function () { rise($$('.mkc', band), 50, 380); }); }
  }
  if (mkt) { mo(mkt, function () { requestAnimationFrame(marketCards); }); marketCards(); }

  /* ---------- 4. Border Beam en el plan destacado; Glowing Effect / Spotlight en capacidades (las tarjetas de plan ya traen --lx/--ly) ---------- */
  var feat = $('#ladder .plan .btn-primary'); feat = feat && feat.closest('.plan');
  if (feat && !$('.mo-beam', feat)) { var beam = doc.createElement('span'); beam.className = 'mo-beam'; beam.setAttribute('aria-hidden', 'true'); feat.appendChild(beam); loop(feat); }
  var caps = $('.caps');
  if (caps && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var pe = null, pr = 0;
    caps.addEventListener('pointermove', function (e) {
      pe = e; if (pr) return;
      pr = requestAnimationFrame(function () {
        pr = 0; var c = pe.target.closest && pe.target.closest('.cap'); if (!c) return;
        var r = c.getBoundingClientRect(); c.style.setProperty('--lx', (pe.clientX - r.left) + 'px'); c.style.setProperty('--ly', (pe.clientY - r.top) + 'px');
      });
    }, { passive: true });
  }

  /* ---------- 6. Aurora: la malla del héroe solo deriva mientras se ve ---------- */
  var hero = $('.hero'); if (hero) loop(hero);

  /* ---------- 7. aparición escalonada de lo que el revelado existente no cubre; 8. motion graphics de capacidades ---------- */
  $$('.mo-fig').forEach(function (f) { if (still()) return; if (below(f)) once(f, function () { f.classList.add('mo-play'); }); else f.classList.add('mo-play'); });
  [['.spec-wide', ':scope > div'], ['.plan-notes', ':scope > p'], ['.sec-panel', ':scope > .boundary']].forEach(function (p) {
    var host = $(p[0]); if (host && below(host)) once(host, function () { rise($$(p[1], host)); });
  });
  /* =====================================================================================================================
     Tercera pasada: animaciones a medida. Mismas reglas: aditivas, idempotentes, sin estado oculto sin JS, quietas con
     prefers-reduced-motion. Los fondos WebGL y la capa del gráfico del héroe viven en campo-shaders.js.
     ===================================================================================================================== */
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var hasTL = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));

  /* ---------- 9. entrada de página: el logo se dibuja y una línea de luz cruza arriba (no si llega el tablero de campo-gate) ---------- */
  (function intro() {
    var seen = null; try { seen = sessionStorage.getItem('mo-intro'); sessionStorage.setItem('mo-intro', '1'); } catch (e) { }
    if (still() || seen || $('.gate-fx') || scrollY > 40 || !$('.nav .brand')) return;
    root.classList.add('mo-intro');
    var hair = doc.createElement('i'); hair.className = 'mo-hair'; hair.setAttribute('aria-hidden', 'true'); doc.body.appendChild(hair);
    setTimeout(function () { hair.remove(); root.classList.remove('mo-intro'); }, 1700);
  })();

  /* ---------- 10. titulares: subrayado índigo dibujado a mano bajo una palabra clave por sección ---------- */
  var KEYW = { mercados: 'ahora', capacidades: 'posiciones', producto: 'acción', plans: 'Planes', seguridad: 'adjetivos' };
  var uls = [];
  function wordRect(h, word) {
    var tw = doc.createTreeWalker(h, NodeFilter.SHOW_TEXT), n;
    while ((n = tw.nextNode())) {
      var i = n.data.indexOf(word); if (i < 0) continue;
      var r = doc.createRange(); r.setStart(n, i); r.setEnd(n, i + word.length);
      var rs = r.getClientRects(); return rs.length ? rs[rs.length - 1] : null;
    }
    return null;
  }
  function placeUl(u) {
    var r = wordRect(u.h, u.word); if (!r) return false;
    var hr = u.host.getBoundingClientRect(), w = Math.max(24, r.width + 6), x = r.left - hr.left - 3, y = r.bottom - hr.top - 4;
    u.svg.style.left = x + 'px'; u.svg.style.top = y + 'px'; u.svg.setAttribute('width', w); u.svg.setAttribute('height', 14); u.svg.setAttribute('viewBox', '0 0 ' + w + ' 14');
    /* trazo de pluma: ligera subida, cruce final hacia atrás */
    u.path.setAttribute('d', 'M3 9C' + (w * 0.28) + ' 4 ' + (w * 0.55) + ' 11 ' + (w - 4) + ' 5C' + (w * 0.7) + ' 7.5 ' + (w * 0.45) + ' 10 ' + (w * 0.3) + ' 11.5');
    return true;
  }
  $$('.sec-head').forEach(function (host) {
    var sec = host.closest('section'), word = sec && KEYW[sec.id], h = $('h2', host); if (!word || !h) return;
    var svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg'), path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.setAttribute('class', 'mo-ul'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    path.setAttribute('pathLength', '1'); svg.appendChild(path); host.appendChild(svg);
    var u = { host: host, h: h, word: word, svg: svg, path: path }; uls.push(u);
    function draw() {
      var t0 = performance.now();
      (function wait() {
        /* espera a que el revelado por renglones de campo-landing.js devuelva el texto plano */
        if ($('.sr-m', h) && performance.now() - t0 < 2000) { requestAnimationFrame(wait); return; }
        if (!placeUl(u)) return;
        if (!still()) svg.classList.add('mo-anim');
        requestAnimationFrame(function () { requestAnimationFrame(function () { svg.classList.add('on'); }); });
      })();
    }
    once(host, function () { setTimeout(draw, below(host) ? 520 : 200); });
  });
  var rzT = 0;
  addEventListener('resize', function () { clearTimeout(rzT); rzT = setTimeout(function () { uls.forEach(function (u) { if (u.svg.classList.contains('on')) placeUl(u); }); }, 120); }, { passive: true });
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { uls.forEach(function (u) { if (u.svg.classList.contains('on')) placeUl(u); }); });

  /* ---------- 11. tarjetas de mercado: inclinación 3D + paralaje interno; indicador que se estira entre tarjetas ---------- */
  if (mkt) {
    if (fine && !still()) {
      var tc = null, tp = null, tr = 0;
      var untilt = function (c) { if (!c) return; c.classList.remove('mo-tilt'); ['--rx', '--ry', '--px', '--py'].forEach(function (k) { c.style.removeProperty(k); }); };
      mkt.addEventListener('pointermove', function (e) {
        tp = e; if (tr) return;
        tr = requestAnimationFrame(function () {
          tr = 0; var c = tp.target.closest && tp.target.closest('.mkc');
          if (c !== tc) { untilt(tc); tc = c; } if (!c) return;
          var r = c.getBoundingClientRect(), nx = clamp((tp.clientX - r.left) / r.width - 0.5, -0.5, 0.5), ny = clamp((tp.clientY - r.top) / r.height - 0.5, -0.5, 0.5);
          c.style.setProperty('--rx', (-ny * 8).toFixed(2) + 'deg'); c.style.setProperty('--ry', (nx * 10).toFixed(2) + 'deg');
          c.style.setProperty('--px', (nx * 5).toFixed(1) + 'px'); c.style.setProperty('--py', (ny * 3).toFixed(1) + 'px');
          c.style.setProperty('--lx', (tp.clientX - r.left) + 'px'); c.style.setProperty('--ly', (tp.clientY - r.top) + 'px');
          c.classList.add('mo-tilt');
        });
      }, { passive: true });
      mkt.addEventListener('pointerleave', function () { untilt(tc); tc = null; });
    }
    var indG = null;
    var placeInd = function () {
      var band = $('.mkt-band', mkt), sel = band && $('.mkc[aria-pressed="true"]', band); if (!sel) return;
      var el = $('.mo-ind', band);
      if (!el) { el = doc.createElement('i'); el.className = 'mo-ind'; el.setAttribute('aria-hidden', 'true'); band.appendChild(el); indG = null; }
      var g = { x: sel.offsetLeft + 14, y: sel.offsetTop + sel.offsetHeight - 2, w: Math.max(10, sel.offsetWidth - 28) };
      el.style.width = g.w + 'px'; el.style.transform = 'translate(' + g.x + 'px,' + g.y + 'px)';
      if (indG && (indG.x !== g.x || indG.w !== g.w) && !still() && el.animate) {
        var x0 = Math.min(indG.x, g.x), x1 = Math.max(indG.x + indG.w, g.x + g.w);
        el.animate([
          { transform: 'translate(' + indG.x + 'px,' + indG.y + 'px) scaleX(' + (indG.w / g.w).toFixed(3) + ')' },
          { transform: 'translate(' + x0 + 'px,' + g.y + 'px) scaleX(' + ((x1 - x0) / g.w).toFixed(3) + ')', offset: 0.45 },
          { transform: 'translate(' + g.x + 'px,' + g.y + 'px) scaleX(1)' }
        ], { duration: 560, easing: OUT });
      }
      indG = g;
    };
    if (window.MutationObserver) new MutationObserver(function () { requestAnimationFrame(placeInd); }).observe(mkt, { attributes: true, attributeFilter: ['aria-pressed'], subtree: true, childList: true });
    placeInd(); addEventListener('resize', function () { indG = null; placeInd(); }, { passive: true });
  }

  /* ---------- 12. planes: odómetro en los precios al alternar Mensual/Anual; la tarjeta destacada respira ---------- */
  (function plansFx() {
    var CL = window.CAMPO_LANDING, ladder = $('#ladder'), bill = $('#billing'); if (!CL || !ladder) return;
    var odos = [];
    function setOdo(o, txt, anim) {
      var chars = txt.split(''), sig = chars.map(function (ch) { return /\d/.test(ch) ? 'd' : ch; }).join('');
      if (sig !== o.sig) {
        o.sig = sig; o.el.textContent = ''; o.cols = [];
        var di = 0;
        chars.forEach(function (ch) {
          if (/\d/.test(ch)) {
            var od = doc.createElement('i'), st = doc.createElement('i'); od.className = 'od'; st.className = 'od-s';
            od.style.setProperty('--i', di); st.style.setProperty('--i', di); di++;
            for (var d = 0; d < 10; d++) { var x = doc.createElement('i'); x.textContent = d; st.appendChild(x); }
            od.appendChild(st); o.el.appendChild(od); o.cols.push(st);
          } else { var c = doc.createElement('i'); c.textContent = ch === ' ' ? ' ' : ch; o.el.appendChild(c); }
        });
      }
      var digs = txt.replace(/\D/g, '');
      o.cols.forEach(function (st, i) { st.style.setProperty('--v', digs[i]); });
      if (anim) { o.el.classList.remove('mo-flip'); void o.el.offsetWidth; o.el.classList.add('mo-flip'); }
    }
    $$('.plan', ladder).forEach(function (card) {
      var p = CL.plans.filter(function (x) { return x.name === card.dataset.plan; })[0], pr = $('[data-price]', card);
      if (!p || !p.usd || !pr) return;
      var el = doc.createElement('b'); el.className = 'num mo-odo'; el.setAttribute('aria-hidden', 'true');
      pr.insertAdjacentElement('afterend', el); pr.parentNode.classList.add('mo-odo-on');
      var o = { el: el, p: p, sig: '' }; odos.push(o); setOdo(o, 'USD ' + p.usd, false);
    });
    var annual = function () { var b = bill && $('[aria-pressed="true"]', bill); return !!b && b.dataset.v === 'a'; };
    var was = annual();
    odos.forEach(function (o) { setOdo(o, 'USD ' + (was ? o.p.usdYear : o.p.usd), false); });
    if (feat) {
      var halo = doc.createElement('span'); halo.className = 'mo-halo'; halo.setAttribute('aria-hidden', 'true');
      var glow = doc.createElement('span'); glow.className = 'mo-glow'; glow.setAttribute('aria-hidden', 'true');
      feat.appendChild(halo); feat.appendChild(glow);
    }
    if (bill && window.MutationObserver) new MutationObserver(function () {
      var a = annual(); if (a === was) return; was = a;
      odos.forEach(function (o) { setOdo(o, 'USD ' + (a ? o.p.usdYear : o.p.usd), !still()); });
      if (feat && !still()) { feat.classList.remove('mo-pulse'); void feat.offsetWidth; feat.classList.add('mo-pulse'); }
    }).observe(bill, { attributes: true, attributeFilter: ['aria-pressed'], subtree: true });
  })();

  /* ---------- 13. escenas ligadas al scroll: riel de la tabla comparativa y escudo que se ensambla ---------- */
  (function scenes() {
    var cmp = $('.compare'), tbl = $('#compare');
    if (cmp && tbl) {
      var rail = doc.createElement('i'); rail.className = 'mo-rail'; rail.setAttribute('aria-hidden', 'true'); cmp.appendChild(rail);
      var fit = function () { rail.style.top = (tbl.offsetTop + 6) + 'px'; rail.style.height = Math.max(0, tbl.offsetHeight - 30) + 'px'; };
      fit(); addEventListener('resize', fit, { passive: true }); mo(tbl, fit);
      if (!still()) {
        if (hasTL) rail.classList.add('mo-tl');
        else if (below(cmp)) { rail.classList.add('mo-pre'); once(cmp, function () { rail.classList.add('mo-in'); rail.classList.remove('mo-pre'); }); }
      }
    }
    var sh = $('.mo-shield');
    if (sh && !still()) {
      if (hasTL) sh.classList.add('mo-tl');
      else if (below(sh)) { sh.classList.add('mo-pre'); once($('#seguridad'), function () { sh.classList.add('mo-in'); sh.classList.remove('mo-pre'); }); }
    }
  })();

  /* ---------- 14. CTA: halo magnético (escritorio) y onda al hacer clic ---------- */
  $$('.btn-primary, .btn-lg').forEach(function (b) {
    if (fine && !still()) {
      b.classList.add('mo-mag');
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        b.style.setProperty('--mx', clamp(dx * 0.2, -6, 6).toFixed(1) + 'px'); b.style.setProperty('--my', clamp(dy * 0.3, -4, 4).toFixed(1) + 'px'); b.classList.add('mo-near');
      }, { passive: true });
      b.addEventListener('pointerleave', function () { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); b.classList.remove('mo-near'); });
    }
  });
  doc.addEventListener('pointerdown', function (e) {
    if (still() || e.button) return;
    var b = e.target.closest && e.target.closest('.btn'); if (!b || b.disabled) return;
    b.classList.add('mo-rip-host');
    var r = b.getBoundingClientRect(), s = doc.createElement('span'); s.className = 'mo-rip'; s.setAttribute('aria-hidden', 'true');
    s.style.left = (e.clientX - r.left) + 'px'; s.style.top = (e.clientY - r.top) + 'px'; s.style.setProperty('--rs', (Math.hypot(r.width, r.height) / 8).toFixed(1));
    b.appendChild(s); s.addEventListener('animationend', function () { s.remove(); }); setTimeout(function () { s.remove(); }, 900);
  }, { passive: true });

  /* ---------- 15. capacidades: un punto recorre el rendimiento, el histograma muestrea, la dona responde al cursor ---------- */
  (function capsLoops() {
    var trio = $('.mf-trio'), NS = 'http://www.w3.org/2000/svg';
    if (trio && !still()) {
      var sv = $$('svg', trio), ln = $('.mf-ln', sv[0]);
      if (ln && sv[0].pauseAnimations) {
        var d = ln.getAttribute('d');
        [['mf-dot-h', 4.5], ['mf-dot', 2.2]].forEach(function (c) {
          var ci = doc.createElementNS(NS, 'circle'), am = doc.createElementNS(NS, 'animateMotion');
          ci.setAttribute('class', c[0]); ci.setAttribute('r', c[1]); ci.setAttribute('cx', 0); ci.setAttribute('cy', 0); ci.setAttribute('opacity', 0);
          am.setAttribute('path', d); am.setAttribute('dur', '5.5s'); am.setAttribute('repeatCount', 'indefinite'); am.setAttribute('begin', 'indefinite');
          am.setAttribute('keyPoints', '0;1;1'); am.setAttribute('keyTimes', '0;0.7;1'); am.setAttribute('calcMode', 'linear');
          ci.appendChild(am); sv[0].appendChild(ci);
        });
      }
      $$('.mf-h', sv[2]).forEach(function (r, i) { r.style.setProperty('--j', i); });
      var started = false, go = function () {
        if (started) return; started = true;
        setTimeout(function () {
          trio.classList.add('mo-loop');
          $$('circle', sv[0]).forEach(function (ci) { ci.setAttribute('opacity', 1); var am = $('animateMotion', ci); if (am && am.beginElement) am.beginElement(); });
        }, 1400);
      };
      if (trio.classList.contains('mo-play')) go(); else once(trio, go);
      watch(trio, function (e) { trio.classList.toggle('mo-off', !e.isIntersecting); if (sv[0].pauseAnimations) { if (e.isIntersecting && !doc.hidden) sv[0].unpauseAnimations(); else sv[0].pauseAnimations(); } });
      doc.addEventListener('visibilitychange', function () { if (sv[0].pauseAnimations) { if (doc.hidden) sv[0].pauseAnimations(); else sv[0].unpauseAnimations(); } });
    }
    var donut = $('.mf.mo-fig:not(.mf-trio)');
    if (donut && fine) {
      donut.addEventListener('pointerover', function (e) {
        var t = e.target.closest && e.target.closest('.mf-sl, .mf-leg span'); if (!t) return;
        var m = /k(\d)/.exec(t.getAttribute('class') || ''); if (m) donut.dataset.k = m[1];
      });
      donut.addEventListener('pointerleave', function () { delete donut.dataset.k; });
    }
  })();
})();
