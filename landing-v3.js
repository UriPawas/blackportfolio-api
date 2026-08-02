/* ══════════════════════════════════════════════════════════════════════════
   BlackPortfolio — landing v3 · dirección "El salón"
   La guilloche (roseta de torno trazada sobre una serie de rendimiento),
   más los comportamientos de la página. Prototipo: no toca app.js.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ── Serie ilustrativa determinista ────────────────────────────────────
     60 rendimientos mensuales. Semilla fija para que la roseta sea la
     misma en cada carga: es una firma, no un adorno aleatorio.            */
  function serie(n) {
    var s = 20260729, out = [];
    for (var i = 0; i < n; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      var u = s / 0x7fffffff;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      var v = s / 0x7fffffff;
      // Box–Muller, escalado a algo con forma de retorno mensual
      var g = Math.sqrt(-2 * Math.log(u + 1e-9)) * Math.cos(2 * Math.PI * v);
      out.push(Math.max(-0.9, Math.min(0.9, g * 0.34)));
    }
    return out;
  }

  /* ── La guilloche ─────────────────────────────────────────────────────── */
  function guilloche(lienzo) {
    var ctx = lienzo.getContext('2d');
    if (!ctx) return;

    var datos = serie(60);
    var lado = 0, dpr = 1, giro = 0, rafId = 0;

    function tinta() {
      var css = getComputedStyle(document.documentElement);
      return {
        laton: (css.getPropertyValue('--laton') || '#c08a2e').trim(),
        luz: (css.getPropertyValue('--laton-luz') || '#ebc578').trim()
      };
    }
    var color = tinta();

    function medir() {
      var caja = lienzo.getBoundingClientRect();
      if (!caja.width) return false;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      lado = caja.width;
      lienzo.width = Math.round(lado * dpr);
      lienzo.height = Math.round(lado * dpr);
      return true;
    }

    // Una familia de anillos: r(t) = R + a·cos(k·t + fase)
    function familia(cx, cy, opc) {
      var anillos = opc.anillos, pasos = opc.pasos;
      for (var j = 0; j < anillos; j++) {
        var d = datos[(j * 7 + opc.desfase) % datos.length];
        var R = opc.r0 + j * opc.paso;
        var a = opc.amp * (1 + d * opc.ganancia);
        var fase = j * opc.deriva + giro * opc.velocidad;

        ctx.beginPath();
        for (var i = 0; i <= pasos; i++) {
          var t = (i / pasos) * Math.PI * 2;
          var r = R + a * Math.cos(opc.petalos * t + fase);
          var x = cx + r * Math.cos(t + giro * 0.35);
          var y = cy + r * Math.sin(t + giro * 0.35);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();

        var borde = j / (anillos - 1);
        ctx.strokeStyle = opc.color;
        ctx.globalAlpha = opc.alfa * (0.35 + 0.65 * (1 - Math.abs(borde - 0.5) * 1.4));
        ctx.stroke();
      }
    }

    function pintar() {
      if (!lado) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, lado, lado);
      ctx.lineWidth = 0.6;
      ctx.lineJoin = 'round';

      var c = lado / 2;
      var u = lado / 100; // unidad relativa

      // anillo exterior: la corona ancha
      familia(c, c, {
        anillos: 26, pasos: 300, petalos: 13,
        r0: 26 * u, paso: 0.72 * u, amp: 6.2 * u,
        ganancia: 0.42, deriva: 0.14, velocidad: 1, desfase: 0,
        color: color.laton, alfa: 0.5
      });

      // contra-rotación: la trama de moiré
      familia(c, c, {
        anillos: 20, pasos: 300, petalos: 21,
        r0: 15 * u, paso: 0.55 * u, amp: 3.4 * u,
        ganancia: 0.55, deriva: -0.19, velocidad: -1.6, desfase: 3,
        color: color.luz, alfa: 0.3
      });

      // núcleo
      familia(c, c, {
        anillos: 10, pasos: 240, petalos: 7,
        r0: 5 * u, paso: 0.62 * u, amp: 2.1 * u,
        ganancia: 0.7, deriva: 0.26, velocidad: 2.1, desfase: 11,
        color: color.laton, alfa: 0.55
      });

      // filete de contorno, como en un título al portador
      ctx.globalAlpha = 0.42;
      ctx.strokeStyle = color.laton;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(c, c, 46.5 * u, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.16;
      ctx.beginPath();
      ctx.arc(c, c, 44 * u, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    var t0 = 0;
    function cuadro(ts) {
      if (!t0) t0 = ts;
      giro = (ts - t0) / 1000 * 0.055;
      pintar();
      rafId = requestAnimationFrame(cuadro);
    }

    function arrancar() {
      if (!medir()) return;
      cancelAnimationFrame(rafId);
      if (quieto.matches) { giro = 0; pintar(); return; }
      t0 = 0;
      rafId = requestAnimationFrame(cuadro);
    }

    // Solo gira mientras está a la vista: no quema batería fuera de pantalla.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (ent) {
        if (ent[0].isIntersecting) arrancar();
        else { cancelAnimationFrame(rafId); rafId = 0; }
      }, { rootMargin: '80px' }).observe(lienzo);
    } else {
      arrancar();
    }

    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { if (medir()) pintar(); }).observe(lienzo);
    } else {
      window.addEventListener('resize', function () { if (medir()) pintar(); });
    }

    quieto.addEventListener('change', arrancar);
    document.addEventListener('bp:tema', function () { color = tinta(); pintar(); });
  }

  /* ── Roseta del sello: la misma matemática, en miniatura ───────────────── */
  function sello() {
    var d = '', petalos = 11, R = 12.5, a = 3.4;
    for (var i = 0; i <= 220; i++) {
      var t = (i / 220) * Math.PI * 2;
      var r = R + a * Math.cos(petalos * t);
      var x = (20 + r * Math.cos(t)).toFixed(2);
      var y = (20 + r * Math.sin(t)).toFixed(2);
      d += (i === 0 ? 'M' : 'L') + x + ' ' + y;
    }
    d += 'Z';
    document.querySelectorAll('.sello-petalos').forEach(function (p) {
      p.setAttribute('d', d);
    });
  }

  /* ── Tema ─────────────────────────────────────────────────────────────── */
  function tema() {
    var btn = document.getElementById('temaBtn');
    if (!btn) return;
    var txt = btn.querySelector('.conmutador-txt');

    function rotular() {
      var oscuro = document.documentElement.getAttribute('data-theme') !== 'light';
      if (txt) txt.textContent = oscuro ? txt.dataset.oscuro : txt.dataset.claro;
      btn.setAttribute('aria-label', oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    }
    rotular();

    btn.addEventListener('click', function () {
      var claro = document.documentElement.getAttribute('data-theme') === 'light';
      var nuevo = claro ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', nuevo);
      try { localStorage.setItem('bp-theme', nuevo); } catch (e) { /* modo privado */ }
      rotular();
      document.dispatchEvent(new CustomEvent('bp:tema'));
    });
  }

  /* ── Testera y cajón ──────────────────────────────────────────────────── */
  function testera() {
    var cab = document.getElementById('testera');
    var btn = document.getElementById('pliegueBtn');
    var cajon = document.getElementById('cajon');

    if (cab) {
      var posar = function () { cab.classList.toggle('posada', window.scrollY > 12); };
      posar();
      window.addEventListener('scroll', posar, { passive: true });
    }

    if (!btn || !cajon) return;
    btn.addEventListener('click', function () {
      var abierto = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!abierto));
      cajon.hidden = abierto;
      btn.setAttribute('aria-label', abierto ? 'Abrir menú' : 'Cerrar menú');
    });
    cajon.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        btn.setAttribute('aria-expanded', 'false');
        cajon.hidden = true;
      }
    });
  }

  /* ── Periodo de cobro ─────────────────────────────────────────────────── */
  function periodo() {
    var sw = document.getElementById('periodoSw');
    if (!sw) return;
    var etqs = document.querySelectorAll('.periodo-etq');

    sw.addEventListener('click', function () {
      var anual = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', String(anual));

      if (etqs[0]) etqs[0].setAttribute('data-activo', String(!anual));
      if (etqs[1]) etqs[1].setAttribute('data-activo', String(anual));

      document.querySelectorAll('.columna-precio b').forEach(function (b) {
        b.textContent = anual ? b.dataset.ano : b.dataset.mes;
      });
      document.querySelectorAll('.columna-precio .unidad').forEach(function (u) {
        u.textContent = anual ? 'USD/mes anual' : 'USD/mes';
      });
      document.querySelectorAll('.columna-mxn').forEach(function (m) {
        m.textContent = anual ? m.dataset.mxnAno : m.dataset.mxnMes;
      });
    });
  }

  /* ── Revelado al entrar ───────────────────────────────────────────────── */
  function revelar() {
    var piezas = document.querySelectorAll(
      '[data-alza], .conceptos, .pasos, .postura-lista, .columnas, .cotejo, .riel'
    );
    if (!('IntersectionObserver' in window)) {
      piezas.forEach(function (p) { p.classList.add('visto'); });
      return;
    }
    var obs = new IntersectionObserver(function (ent) {
      ent.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('visto');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    piezas.forEach(function (p) { obs.observe(p); });
  }

  /* ── Arranque ─────────────────────────────────────────────────────────── */
  function iniciar() {
    var lienzo = document.getElementById('rosetaLienzo');
    if (lienzo) guilloche(lienzo);
    sello();
    tema();
    testera();
    periodo();
    revelar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
