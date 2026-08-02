/* ==========================================================================
   BlackPortfolio — interruptor de tema compartido, sólo para páginas fuera de
   la SPA que no cargan app.js (login, privacidad, términos).

   Mismo mecanismo que ya usa app.js en index.html: atributo `data-theme` en
   <html> + localStorage `bp-theme`. No toca nada de negocio; index.html sigue
   gobernado por su propio initThemeToggle() en app.js — este script se queda
   fuera si detecta que ya existe ese manejador, para no duplicar el toggle.
   ========================================================================== */

(function () {
  'use strict';
  var root = document.documentElement;
  var btn = document.getElementById('themeToggle');

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('bp-theme', theme); } catch (e) { /* almacenamiento bloqueado */ }
  }

  if (btn && !btn.dataset.themeWired) {
    btn.dataset.themeWired = '1';
    btn.addEventListener('click', function () {
      var current = root.getAttribute('data-theme') || 'dark';
      apply(current === 'dark' ? 'light' : 'dark');
    });
  }

  // Segmentado opcional del pie (Claro/Oscuro), presente sólo en algunas láminas.
  var seg = document.getElementById('segTema');
  if (seg) {
    var thumb = seg.querySelector('.seg__thumb');
    var buttons = Array.prototype.slice.call(seg.querySelectorAll('[data-theme-set]'));

    function moveThumb(instant) {
      var on = seg.querySelector('[aria-pressed="true"]');
      if (!thumb || !on) return;
      if (instant) thumb.style.transition = 'none';
      thumb.style.transform = 'translateX(' + (on.offsetLeft - 2) + 'px) scaleX(' + on.offsetWidth + ')';
      if (instant) { void thumb.offsetWidth; thumb.style.transition = ''; }
    }

    function sync() {
      var theme = root.getAttribute('data-theme') || 'dark';
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.themeSet === theme)); });
      moveThumb(false);
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () { apply(b.dataset.themeSet); sync(); });
    });
    moveThumb(true);
    sync();
  }
})();
