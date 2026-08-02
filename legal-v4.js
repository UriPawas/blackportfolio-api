/* ==========================================================================
   BlackPortfolio — documentos legales v4
   Sólo el tema y el resaltado de la sección que se está leyendo en el índice.
   Nada más: un documento legal no necesita comportamiento.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  var themeBtn = document.getElementById('themeToggle');
  var themeSeg = document.getElementById('segTema');

  function moveThumb(seg, instant) {
    var thumb = seg.querySelector('.seg__thumb');
    var active = seg.querySelector('button[aria-pressed="true"]');
    if (!thumb || !active) return;
    if (instant) thumb.style.transition = 'none';
    thumb.style.transform = 'translateX(' + (active.offsetLeft - 2) + 'px) scaleX(' + active.offsetWidth + ')';
    if (instant) {
      void thumb.offsetWidth;
      thumb.style.transition = '';
    }
  }

  function applyTheme(theme, animate) {
    if (animate) {
      root.classList.add('is-theming');
      window.setTimeout(function () { root.classList.remove('is-theming'); }, 340);
    }
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('bp-theme', theme); } catch (e) { /* sin almacenamiento */ }

    var dark = theme === 'dark';
    if (themeBtn) {
      themeBtn.setAttribute('aria-pressed', String(dark));
      themeBtn.setAttribute('aria-label', dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    }
    if (themeSeg) {
      themeSeg.querySelectorAll('button').forEach(function (b) {
        var on = b.dataset.themeSet === theme;
        b.setAttribute('aria-pressed', String(on));
        b.tabIndex = on ? 0 : -1;
      });
      moveThumb(themeSeg, !animate);
    }
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
  }
  if (themeSeg) {
    themeSeg.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { applyTheme(b.dataset.themeSet, true); });
    });
  }
  window.addEventListener('resize', function () {
    document.querySelectorAll('.seg').forEach(function (s) { moveThumb(s, true); });
  });

  applyTheme(root.getAttribute('data-theme') || 'light', false);

  /* La sección visible se marca en el índice: en un documento de 17 apartados,
     saber dónde estás es parte de poder leerlo. */
  var links = Array.prototype.slice.call(document.querySelectorAll('.legal__toc a'));
  var sections = links
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  /* Con IntersectionObserver esto se rompe al volver hacia arriba: sólo llegan
     entradas, no salidas, y el marcador se queda pegado en la última sección
     que entró. Un cálculo directo —la última sección cuyo inicio ya pasó la
     línea de lectura— no tiene ese caso. */
  if (sections.length) {
    var frame = 0;

    function markCurrent() {
      frame = 0;
      var line = window.scrollY + window.innerHeight * 0.3;
      var active = 0;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].offsetTop <= line) active = i;
        else break;
      }
      /* Al final del documento gana la última sección, aunque su inicio quede
         por encima de la línea. */
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        active = sections.length - 1;
      }
      links.forEach(function (a, j) {
        if (j === active) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }

    function onScroll() {
      if (!frame) frame = window.requestAnimationFrame(markCurrent);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    markCurrent();
  }
})();
