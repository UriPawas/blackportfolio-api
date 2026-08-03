/* ==========================================================================
   BlackPortfolio — app v4 (vista previa de Ajustes)
   Tema, control segmentado y el flujo destructivo de borrado de cuenta.
   Los identificadores son los que ya usa `main.js` (exportAccountDataBtn,
   deleteAccountBtn, dataPrivacyMessage, activeSessionsList,
   closeAllSessionsBtn), así que el trasplante no toca la lógica.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;

  /* ------------------------------------------------------------ 1. Tema  */

  var themeBtn = document.getElementById('themeToggle');

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
    if (themeBtn) {
      var dark = theme === 'dark';
      themeBtn.setAttribute('aria-pressed', String(dark));
      themeBtn.setAttribute('aria-label', dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    }
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
  }

  /* --------------------------------------------- 2. Control segmentado   */

  var segAvisos = document.getElementById('segAvisos');
  var privacyMsg = document.getElementById('dataPrivacyMessage');

  function setMsg(el, text, kind) {
    if (!el) return;
    el.textContent = text || '';
    el.className = 'msg' + (kind ? ' ' + kind : '');
  }

  if (segAvisos) {
    var avisoBtns = Array.prototype.slice.call(segAvisos.querySelectorAll('button'));
    avisoBtns.forEach(function (b, i) {
      b.tabIndex = b.getAttribute('aria-pressed') === 'true' ? 0 : -1;
      b.addEventListener('click', function () {
        avisoBtns.forEach(function (o) {
          var on = o === b;
          o.setAttribute('aria-pressed', String(on));
          o.tabIndex = on ? 0 : -1;
        });
        moveThumb(segAvisos, false);
        setMsg(privacyMsg,
          b.dataset.avisos === 'on'
            ? 'Recibirás avisos de producto. Puedes cambiarlo cuando quieras.'
            : 'No recibirás avisos de producto. Los correos de seguridad y las alertas que configuraste siguen llegando.',
          'ok');
      });
      b.addEventListener('keydown', function (e) {
        var next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
        if (next < 0 || next >= avisoBtns.length) return;
        e.preventDefault();
        avisoBtns[next].click();
        avisoBtns[next].focus();
      });
    });
    moveThumb(segAvisos, true);
  }

  /* ------------------------------------------------------ 3. Exportar    */

  var exportBtn = document.getElementById('exportAccountDataBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      exportBtn.disabled = true;
      exportBtn.setAttribute('aria-busy', 'true');
      var label = exportBtn.textContent;
      exportBtn.textContent = 'Preparando…';
      setMsg(privacyMsg, '', '');
      window.setTimeout(function () {
        exportBtn.disabled = false;
        exportBtn.removeAttribute('aria-busy');
        exportBtn.textContent = label;
        setMsg(privacyMsg, 'Archivo listo: blackportfolio-datos-2026-07-29.json (en el prototipo no se descarga nada).', 'ok');
      }, 900);
    });
  }

  /* ------------------------------------------------------ 4. Sesiones    */

  var closeAll = document.getElementById('closeAllSessionsBtn');
  if (closeAll) {
    closeAll.addEventListener('click', function () {
      setMsg(document.getElementById('sessionsMessage'),
        'En la app real esto cierra todas las sesiones y te devuelve al acceso.', 'info');
    });
  }

  /* ------------------------------------------- 5. Borrado de la cuenta   */

  var dlg = document.getElementById('deleteDialog');
  var openBtn = document.getElementById('deleteAccountBtn');
  var cancelBtn = document.getElementById('dlgCancel');
  var confirmInput = document.getElementById('dlgConfirmInput');
  var confirmBtn = document.getElementById('dlgConfirmBtn');
  var exportFirst = document.getElementById('dlgExportFirst');
  var lastFocus = null;

  function openDialog() {
    lastFocus = document.activeElement;
    dlg.hidden = false;
    confirmInput.value = '';
    confirmBtn.disabled = true;
    confirmInput.focus();
    document.addEventListener('keydown', onKey);
  }

  function closeDialog() {
    dlg.hidden = true;
    document.removeEventListener('keydown', onKey);
    if (lastFocus) lastFocus.focus();
  }

  /* Escape cierra y Tab no se sale de la tarjeta: es un diálogo modal. */
  function onKey(e) {
    if (e.key === 'Escape') { closeDialog(); return; }
    if (e.key !== 'Tab') return;
    var focusables = dlg.querySelectorAll('button, input, a[href]');
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  if (openBtn) openBtn.addEventListener('click', openDialog);
  if (cancelBtn) cancelBtn.addEventListener('click', closeDialog);

  /* Clic en el velo cancela; clic dentro de la tarjeta no. */
  if (dlg) {
    dlg.addEventListener('mousedown', function (e) {
      if (e.target === dlg) closeDialog();
    });
  }

  if (confirmInput) {
    confirmInput.addEventListener('input', function () {
      confirmBtn.disabled = confirmInput.value.trim().toUpperCase() !== 'ELIMINAR';
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', function () {
      confirmBtn.disabled = true;
      confirmBtn.setAttribute('aria-busy', 'true');
      confirmBtn.textContent = 'Eliminando…';
      window.setTimeout(function () {
        closeDialog();
        confirmBtn.removeAttribute('aria-busy');
        confirmBtn.textContent = 'Eliminar definitivamente';
        setMsg(privacyMsg, 'En la app real la cuenta quedaría eliminada y saldrías a la landing. Aquí no se borró nada.', 'info');
      }, 900);
    });
  }

  if (exportFirst) {
    exportFirst.addEventListener('click', function () {
      closeDialog();
      if (exportBtn) exportBtn.click();
    });
  }

  /* ------------------------------------------------------- 6. Arranque   */

  applyTheme(root.getAttribute('data-theme') || 'light', false);

  window.addEventListener('resize', function () {
    document.querySelectorAll('.seg').forEach(function (s) { moveThumb(s, true); });
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      document.querySelectorAll('.seg').forEach(function (s) { moveThumb(s, true); });
    });
  }
})();
