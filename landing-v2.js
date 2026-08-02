/* BlackPortfolio — Landing v2 (prototipo)
   Nada de esto toca la app: solo la maqueta de diseño. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Tema ───────────────────────────────────────────────────────────── */
  var modeBtn = document.getElementById('modeToggle');
  var modeLabel = document.getElementById('modeLabel');

  function paintMode() {
    modeLabel.textContent = root.getAttribute('data-theme') === 'light' ? 'Apertura' : 'Cierre';
  }
  paintMode();

  modeBtn.addEventListener('click', function () {
    document.body.classList.add('theme-anim');
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    localStorage.setItem('bp-theme', next);
    paintMode();
    window.setTimeout(function () { document.body.classList.remove('theme-anim'); }, 400);
  });

  /* ── Cinta ──────────────────────────────────────────────────────────── */
  var tape = [
    ['S&P 500', '5,614.24', 0.42], ['NASDAQ 100', '19,982.10', 0.68],
    ['DOW', '41,208.66', -0.14], ['IPC MEXBOL', '53,470.90', 0.31],
    ['EURO STOXX 50', '4,932.77', -0.22], ['UST 10Y', '4.186%', -0.03],
    ['USD/MXN', '18.4120', 0.19], ['ORO', '2,418.60', 0.87],
    ['WTI', '78.94', -1.21], ['BTC', '64,182', 2.06], ['ETH', '3,470', 1.44]
  ];

  var track = document.getElementById('tapeTrack');
  function tapeHtml() {
    var out = '<span class="tape-item tape-item--note">Datos ilustrativos</span>';
    tape.forEach(function (t) {
      var cls = t[2] >= 0 ? 'up' : 'down';
      var sign = t[2] >= 0 ? '+' : '−';
      out += '<span class="tape-item"><b>' + t[0] + '</b>' +
             '<span class="val">' + t[1] + '</span>' +
             '<span class="val ' + cls + '">' + sign + Math.abs(t[2]).toFixed(2) + '%</span></span>';
    });
    return out;
  }
  track.innerHTML = tapeHtml() + tapeHtml();

  /* ── Firma: curva bajo el agua ──────────────────────────────────────── */
  // Serie ilustrativa: caída porcentual desde el máximo anterior, 48 meses.
  var dd = [0, -0.6, -1.8, -0.9, 0, -2.4, -4.1, -2.2, -0.8, 0, -1.1, -3.6,
            -6.2, -9.8, -14.1, -18.4, -15.2, -12.6, -10.4, -8.1, -6.6, -4.9,
            -3.2, -1.4, 0, -0.9, -2.1, -1.2, 0, -1.6, -3.4, -5.1, -3.8, -2.2,
            -1.0, 0, -0.7, -2.9, -4.6, -3.1, -1.8, -0.5, 0, -1.2, -2.6, -3.9,
            -2.7, -2.1];

  var W = 1000, H = 260, PAD_T = 18, PAD_B = 28, FLOOR = -20;
  var svg = document.getElementById('uwChart');
  var NS = 'http://www.w3.org/2000/svg';

  function X(i) { return (i / (dd.length - 1)) * (W - 56); }
  function Y(v) { return PAD_T + (v / FLOOR) * (H - PAD_T - PAD_B); }

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  // rejilla + etiquetas de eje
  [0, -5, -10, -15, -20].forEach(function (v) {
    svg.appendChild(el('line', {
      x1: 0, x2: W - 52, y1: Y(v), y2: Y(v),
      'class': v === 0 ? 'uw-zero' : 'uw-grid'
    }));
    var t = el('text', { x: W - 46, y: Y(v) + 3.5, 'class': 'uw-axis' });
    t.textContent = v === 0 ? '0.0%' : v.toFixed(1) + '%';
    svg.appendChild(t);
  });

  var line = '', area = 'M0,' + Y(0);
  dd.forEach(function (v, i) {
    line += (i ? ' L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1);
    area += ' L' + X(i).toFixed(1) + ',' + Y(v).toFixed(1);
  });
  area += ' L' + X(dd.length - 1).toFixed(1) + ',' + Y(0) + ' Z';

  var areaEl = el('path', { d: area, 'class': 'uw-area', opacity: 0 });
  var lineEl = el('path', { d: line, 'class': 'uw-line' });
  svg.appendChild(areaEl);
  svg.appendChild(lineEl);

  // anotación de la caída máxima
  var trough = dd.indexOf(Math.min.apply(null, dd));
  svg.appendChild(el('line', {
    x1: X(trough), x2: X(trough), y1: Y(0), y2: Y(dd[trough]), 'class': 'uw-mark'
  }));
  var dot = el('circle', { cx: X(trough), cy: Y(dd[trough]), r: 3.5, 'class': 'uw-dot', opacity: 0 });
  svg.appendChild(dot);

  // la nota flotante se ancla al punto mínimo
  var callout = document.getElementById('uwCallout');
  callout.style.left = (X(trough) / W * 100 + 1.8) + '%';
  callout.style.top = (Y(dd[trough]) / H * 100 - 13) + '%';
  callout.style.opacity = 0;
  callout.style.transition = 'opacity .5s ease .2s, transform .5s ease .2s';
  callout.style.transform = 'translateY(6px)';

  if (reduced) {
    areaEl.setAttribute('opacity', 1);
    dot.setAttribute('opacity', 1);
    callout.style.opacity = 1;
    callout.style.transform = 'none';
  } else {
    var len = lineEl.getTotalLength();
    lineEl.style.strokeDasharray = len;
    lineEl.style.strokeDashoffset = len;
    lineEl.style.transition = 'stroke-dashoffset 1.9s cubic-bezier(.32,.72,.28,1)';
    areaEl.style.transition = 'opacity .9s ease .9s';
    dot.style.transition = 'opacity .4s ease 1.6s';
    window.requestAnimationFrame(function () {
      window.setTimeout(function () {
        lineEl.style.strokeDashoffset = 0;
        areaEl.setAttribute('opacity', 1);
        dot.setAttribute('opacity', 1);
        window.setTimeout(function () {
          callout.style.opacity = 1;
          callout.style.transform = 'none';
        }, 1500);
      }, 420);
    });
  }

  /* ── Revelados y conteo ─────────────────────────────────────────────── */
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        if (e.target.hasAttribute('data-count')) countUp(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    document.querySelectorAll('[data-reveal], .method-step').forEach(function (n) { io.observe(n); });
    document.querySelectorAll('[data-count]').forEach(function (n) { io.observe(n); });
  } else {
    document.querySelectorAll('[data-reveal], .method-step').forEach(function (n) { n.classList.add('is-in'); });
  }

  function countUp(node) {
    var target = parseFloat(node.getAttribute('data-count'));
    if (reduced || !target) { return; }
    var t0 = performance.now(), dur = 900;
    (function tick(now) {
      var p = Math.min(1, (now - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      node.textContent = Math.round(target * eased).toString();
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ── Cabecera, progreso y paralaje ──────────────────────────────────── */
  var masthead = document.getElementById('masthead');
  var plate = document.getElementById('plateBg');
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    masthead.classList.toggle('is-stuck', y > 12);

    if (plate && !reduced) {
      var r = plate.parentElement.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        var p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
        plate.style.transform = 'translate3d(0,' + (p * -36).toFixed(1) + 'px,0)';
      }
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ── Mensual / anual ────────────────────────────────────────────────── */
  var sw = document.getElementById('billingSwitch');
  sw.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var period = btn.getAttribute('data-period');
    sw.setAttribute('data-period', period);
    sw.querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('is-on', b === btn);
      b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
    });

    document.querySelectorAll('.plan-price .num').forEach(function (n) {
      n.textContent = '$' + n.getAttribute(period === 'year' ? 'data-year' : 'data-month');
      if (reduced) return;
      n.animate(
        [{ opacity: 0.15, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }],
        { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' }
      );
    });
    document.querySelectorAll('.plan-sub').forEach(function (n) {
      var v = n.getAttribute(period === 'year' ? 'data-sub-year' : 'data-sub-month');
      if (v) n.textContent = v;
    });
  });

  /* ── Menú móvil ─────────────────────────────────────────────────────── */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobileMenu');
  burger.addEventListener('click', function () {
    var open = menu.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      menu.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });
})();
