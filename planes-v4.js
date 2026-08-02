/* ==========================================================================
   BlackPortfolio — planes v4
   Tema y conmutador de ciclo de cobro. Los precios anuales están escritos en
   el HTML (`data-anual`), no se calculan aquí: son cobros vivos de Stripe y no
   se redondean en el cliente.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  var themeBtn = document.getElementById('themeToggle');
  var themeSeg = document.getElementById('segTema');
  var cicloSeg = document.getElementById('segCiclo');
  var ahorro = document.getElementById('ahorroNota');

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

  /* ------------------------------------------------------------ 1. Tema  */

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

  /* --------------------------------------------------- 2. Ciclo de cobro */

  function applyCiclo(ciclo) {
    document.querySelectorAll('[data-mensual]').forEach(function (el) {
      var valor = ciclo === 'anual' ? el.dataset.anual : el.dataset.mensual;
      if (valor != null) el.textContent = valor;
    });

    document.querySelectorAll('.plan-col .unidad').forEach(function (el) {
      if (el.textContent.indexOf('Sin costo') === 0 || el.textContent.indexOf('No pide') === 0) return;
      el.textContent = ciclo === 'anual' ? 'USD / mes, cobrado al año' : 'USD / mes';
    });

    if (ahorro) ahorro.hidden = ciclo !== 'anual';

    if (cicloSeg) {
      cicloSeg.querySelectorAll('button').forEach(function (b) {
        var on = b.dataset.ciclo === ciclo;
        b.setAttribute('aria-pressed', String(on));
        b.tabIndex = on ? 0 : -1;
      });
      moveThumb(cicloSeg, false);
    }
  }

  if (cicloSeg) {
    var botones = Array.prototype.slice.call(cicloSeg.querySelectorAll('button'));
    botones.forEach(function (b, i) {
      b.addEventListener('click', function () { applyCiclo(b.dataset.ciclo); });
      b.addEventListener('keydown', function (e) {
        var next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
        if (next < 0 || next >= botones.length) return;
        e.preventDefault();
        botones[next].click();
        botones[next].focus();
      });
    });
  }

  /* ------------------------------------------------------- 3. Arranque   */

  applyTheme(root.getAttribute('data-theme') || 'light', false);
  if (cicloSeg) moveThumb(cicloSeg, true);

  window.addEventListener('resize', function () {
    document.querySelectorAll('.seg').forEach(function (s) { moveThumb(s, true); });
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      document.querySelectorAll('.seg').forEach(function (s) { moveThumb(s, true); });
    });
  }
})();
