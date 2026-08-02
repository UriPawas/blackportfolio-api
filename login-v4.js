/* ==========================================================================
   BlackPortfolio — login v4 (prototipo de evaluación)
   Reproduce el comportamiento visible del login real (tema, ver contraseña,
   código de invitación, avance de dígitos) y añade un conmutador de estados
   para poder revisar error, carga, 2FA, alta de 2FA y códigos de respaldo sin
   backend. Cuando la propuesta se apruebe, este archivo se reemplaza por
   `auth.js` + `login.js`: los IDs y las clases son los mismos.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;

  /* ------------------------------------------------------------ 1. Tema  */

  var themeBtn = document.getElementById('themeToggle');
  var themeSeg = document.getElementById('segTema');

  function stateAttr(seg) {
    return seg.getAttribute('role') === 'tablist' ? 'aria-selected' : 'aria-pressed';
  }

  /* La primera colocación va sin transición: si se anima desde scaleX(1) en el
     origen, el primer cuadro pinta el pulgar encimado en la opción vecina. */
  function moveThumb(seg, instant) {
    var thumb = seg.querySelector('.seg__thumb');
    var active = seg.querySelector('button[' + stateAttr(seg) + '="true"]');
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

  /* ------------------------------------------------ 2. Campos del login  */

  var pwInput = document.getElementById('loginPassword');
  var pwToggle = document.getElementById('loginPwToggle');
  var eyeOn = document.getElementById('loginEyeIcon');
  var eyeOff = document.getElementById('loginEyeOffIcon');

  if (pwToggle && pwInput) {
    pwToggle.addEventListener('click', function () {
      var show = pwInput.type === 'password';
      pwInput.type = show ? 'text' : 'password';
      eyeOn.classList.toggle('hidden', show);
      eyeOff.classList.toggle('hidden', !show);
      pwToggle.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
      pwInput.focus();
    });
  }

  var betaToggle = document.getElementById('loginBetaToggle');
  var betaRow = document.getElementById('loginBetaRow');
  if (betaToggle && betaRow) {
    betaToggle.addEventListener('click', function () {
      var open = betaRow.classList.toggle('hidden') === false;
      betaToggle.textContent = open ? 'No usar código de invitación' : '¿Tienes un código de invitación?';
      if (open) document.getElementById('loginBetaCode').focus();
    });
  }

  var msg = document.getElementById('loginMessage');
  function setMessage(text, type) {
    if (!msg) return;
    msg.textContent = text || '';
    msg.className = 'form-message' + (type ? ' ' + type : '');
  }

  /* Avance automático entre dígitos, igual que en el login real. */
  function wireOtpGrid(grid) {
    if (!grid) return;
    var boxes = Array.prototype.slice.call(grid.querySelectorAll('.otp-box'));
    boxes.forEach(function (box, i) {
      box.addEventListener('input', function () {
        box.value = box.value.replace(/\D/g, '').slice(0, 1);
        if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
      });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !box.value && i > 0) boxes[i - 1].focus();
        if (e.key === 'ArrowLeft' && i > 0) boxes[i - 1].focus();
        if (e.key === 'ArrowRight' && i < boxes.length - 1) boxes[i + 1].focus();
      });
      box.addEventListener('paste', function (e) {
        var digits = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        if (!digits) return;
        e.preventDefault();
        boxes.forEach(function (b, j) { b.value = digits[j] || ''; });
        boxes[Math.min(digits.length, boxes.length - 1)].focus();
      });
    });
  }

  wireOtpGrid(document.getElementById('otpGrid'));
  wireOtpGrid(document.getElementById('totpSetupOtpGrid'));

  var backupToggle = document.getElementById('otpBackupToggle');
  var backupWrap = document.getElementById('otpBackupWrap');
  if (backupToggle && backupWrap) {
    backupToggle.addEventListener('click', function () {
      backupWrap.classList.toggle('hidden');
      if (!backupWrap.classList.contains('hidden')) document.getElementById('otpBackupInput').focus();
    });
  }

  var ack = document.getElementById('totpSetupBackupAck');
  var ackContinue = document.getElementById('totpSetupBackupContinue');
  if (ack && ackContinue) {
    ack.addEventListener('change', function () { ackContinue.disabled = !ack.checked; });
  }

  /* Habilita "Activar y continuar" cuando los seis dígitos están puestos. */
  var setupGrid = document.getElementById('totpSetupOtpGrid');
  var setupVerify = document.getElementById('totpSetupVerifyBtn');
  if (setupGrid && setupVerify) {
    setupGrid.addEventListener('input', function () {
      var full = Array.prototype.every.call(setupGrid.querySelectorAll('.otp-box'), function (b) { return b.value; });
      setupVerify.disabled = !full;
    });
  }

  /* -------------------------------------------------- 3. Estados demo    */

  var overlayOtp = document.getElementById('otpOverlay');
  var overlaySetup = document.getElementById('totpSetupOverlay');
  var setupLoading = document.getElementById('totpSetupLoading');
  var setupContent = document.getElementById('totpSetupContent');
  var setupBackup = document.getElementById('totpSetupBackupView');
  var submitBtn = document.querySelector('#loginForm .submit-button');

  /* El QR se genera de verdad, con la misma librería que usa la app, sobre un
     URI de demostración: así el estado se puede evaluar tal como se verá. */
  function renderDemoQr() {
    var img = document.getElementById('totpSetupQrImg');
    if (!img || typeof window.QRCode === 'undefined' || !window.QRCode.toDataURL) return;
    var uri = 'otpauth://totp/BlackPortfolio:demo@blackportfolio.ai' +
              '?secret=JBSWY3DPEHPK3PXP&issuer=BlackPortfolio&algorithm=SHA1&digits=6&period=30';
    window.QRCode.toDataURL(uri, { margin: 2 }, function (err, url) {
      if (!err && url) img.src = url;
    });
  }

  function closeOverlays() {
    overlayOtp.classList.add('hidden');
    overlaySetup.classList.add('hidden');
  }

  var STATES = {
    formulario: function () {
      closeOverlays();
      setMessage('', '');
      submitBtn.removeAttribute('aria-busy');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
      document.getElementById('loginEmail').removeAttribute('aria-invalid');
    },
    cargando: function () {
      closeOverlays();
      setMessage('', '');
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
      submitBtn.textContent = 'Verificando…';
    },
    error: function () {
      closeOverlays();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
      document.getElementById('loginEmail').setAttribute('aria-invalid', 'true');
      setMessage('El correo o la contraseña no coinciden. Revisa los datos o restablece tu contraseña.', 'error');
    },
    aviso: function () {
      closeOverlays();
      setMessage('Tu acceso a la beta aún no está autorizado. Canjea tu código de invitación o pide uno.', 'info');
    },
    '2fa': function () {
      closeOverlays();
      overlayOtp.classList.remove('hidden');
      document.getElementById('otpError').classList.add('hidden');
      overlayOtp.querySelector('.otp-box').focus();
    },
    '2fa-error': function () {
      STATES['2fa']();
      var err = document.getElementById('otpError');
      err.textContent = 'Código incorrecto. Te quedan 4 intentos antes de bloquear la cuenta por 15 minutos.';
      err.classList.remove('hidden');
    },
    'alta-2fa': function () {
      closeOverlays();
      overlaySetup.classList.remove('hidden');
      setupLoading.classList.add('hidden');
      setupBackup.classList.add('hidden');
      setupContent.classList.remove('hidden');
      renderDemoQr();
    },
    'alta-cargando': function () {
      closeOverlays();
      overlaySetup.classList.remove('hidden');
      setupContent.classList.add('hidden');
      setupBackup.classList.add('hidden');
      setupLoading.classList.remove('hidden');
      document.getElementById('totpSetupRetry').classList.add('hidden');
      document.getElementById('totpSetupSpinner').classList.remove('hidden');
      document.getElementById('totpSetupLoadingMsg').textContent = 'Generando el código QR…';
    },
    'alta-falla': function () {
      STATES['alta-cargando']();
      document.getElementById('totpSetupSpinner').classList.add('hidden');
      document.getElementById('totpSetupLoadingMsg').textContent =
        'No pudimos generar el código. Revisa tu conexión y vuelve a intentarlo.';
      document.getElementById('totpSetupRetry').classList.remove('hidden');
    },
    respaldo: function () {
      closeOverlays();
      overlaySetup.classList.remove('hidden');
      setupLoading.classList.add('hidden');
      setupContent.classList.add('hidden');
      setupBackup.classList.remove('hidden');
    }
  };

  function buildProtoBar() {
    var names = ['formulario', 'cargando', 'error', 'aviso', '2fa', '2fa-error', 'alta-2fa', 'alta-cargando', 'alta-falla', 'respaldo'];
    /* En móvil arranca plegada: es una herramienta de revisión, no debe tapar
       el formulario que se está evaluando. */
    var startOpen = window.innerWidth >= 992;
    var bar = document.createElement('div');
    bar.className = 'proto';
    bar.dataset.open = String(startOpen);
    bar.innerHTML =
      '<div class="proto__head">Vista de prototipo' +
        '<button class="proto__toggle" type="button">' + (startOpen ? 'ocultar' : 'mostrar') + '</button>' +
      '</div>' +
      '<div class="proto__list">' +
        names.map(function (n, i) {
          return '<button type="button" data-state="' + n + '" aria-pressed="' + (i === 0) + '">' + n + '</button>';
        }).join('') +
      '</div>';
    document.body.appendChild(bar);

    var buttons = bar.querySelectorAll('.proto__list button');
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        buttons.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        var fn = STATES[b.dataset.state];
        if (fn) fn();
      });
    });

    var toggle = bar.querySelector('.proto__toggle');
    toggle.addEventListener('click', function () {
      var open = bar.dataset.open === 'true';
      bar.dataset.open = String(!open);
      toggle.textContent = open ? 'mostrar' : 'ocultar';
    });
  }

  /* Cerrar los diálogos con Escape, como pide cualquier modal. */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeOverlays();
  });

  /* El envío no autentica en el prototipo: muestra el estado de carga y luego
     el diálogo de segundo factor, que es el camino real de una cuenta con 2FA. */
  var form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('loginEmail');
      if (!email.value || !pwInput.value) {
        STATES.error();
        setMessage('Escribe tu correo y tu contraseña para continuar.', 'error');
        (email.value ? pwInput : email).focus();
        return;
      }
      STATES.cargando();
      window.setTimeout(function () {
        STATES.formulario();
        STATES['2fa']();
      }, 900);
    });
  }

  var googleBtn = document.getElementById('googleLoginBtn');
  if (googleBtn) {
    googleBtn.addEventListener('click', function () {
      setMessage('En el prototipo no hay sesión real: aquí se abriría la ventana de Google.', 'info');
    });
  }

  var forgot = document.getElementById('forgotPwBtn');
  if (forgot) {
    forgot.addEventListener('click', function () {
      setMessage('Te enviamos un enlace para restablecer la contraseña si el correo está registrado.', 'success');
    });
  }

  /* ------------------------------------------------------- 4. Arranque   */

  applyTheme(root.getAttribute('data-theme') || 'light', false);
  buildProtoBar();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      document.querySelectorAll('.seg').forEach(function (s) { moveThumb(s, true); });
    });
  }
})();
