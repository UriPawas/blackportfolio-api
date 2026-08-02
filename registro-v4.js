/* ==========================================================================
   BlackPortfolio — registro v4 (prototipo de evaluación)
   Reproduce el comportamiento visible del alta real: tema, ver contraseña,
   medidor de fuerza con el mismo contrato que `app.js` (.pw-bar.active-N,
   #pwReqs li.met), selector de plan, código de invitación y consentimientos.
   Añade un conmutador de estados para revisar validación, correo en uso y el
   panel de verificación sin backend.

   Al conectar el `app.js` real: los IDs son los mismos, pero `app.js` escribe
   el color de la fuerza en línea (`strengthText.style.color`) con cinco hex
   fijos. Hay que cambiar esa línea por `dataset.level`, como aquí, para que el
   color venga de los tokens del tema.
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

  /* --------------------------------------------------- 2. Contraseña     */

  var pwInput = document.getElementById('password');
  var pwToggle = document.getElementById('pwToggle');
  var eyeOn = document.getElementById('eyeIcon');
  var eyeOff = document.getElementById('eyeOffIcon');
  var bars = document.querySelectorAll('.pw-bar');
  var strengthText = document.getElementById('pwStrengthText');
  var reqsList = document.getElementById('pwReqs');

  /* Mismas reglas que `app.js`. */
  var RULES = [
    { key: 'length',  regex: /.{8,}/ },
    { key: 'number',  regex: /[0-9]/ },
    { key: 'lower',   regex: /[a-z]/ },
    { key: 'upper',   regex: /[A-Z]/ },
    { key: 'special', regex: /[!-\/:-@[-`{-~]/ }
  ];
  var LABELS = ['—', 'Débil', 'Media', 'Suficiente', 'Fuerte', 'Muy fuerte'];

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

  /* La lista de requisitos sólo aparece al usar el campo: menos ruido mientras
     el formulario está en reposo. */
  if (reqsList && pwInput) {
    reqsList.hidden = true;
    pwInput.addEventListener('focus', function () { reqsList.hidden = false; });
    pwInput.addEventListener('blur', function () {
      var allMet = RULES.every(function (r) { return r.regex.test(pwInput.value); });
      if (!pwInput.value || allMet) reqsList.hidden = true;
    });
  }

  function scorePassword() {
    var val = pwInput.value;
    var score = 0;
    RULES.forEach(function (rule) {
      var met = rule.regex.test(val);
      if (met) score++;
      var li = reqsList && reqsList.querySelector('li[data-req="' + rule.key + '"]');
      if (li) li.classList.toggle('met', met);
    });
    bars.forEach(function (bar, i) {
      bar.className = 'pw-bar';
      if (i < score) bar.classList.add('active-' + score);
    });
    strengthText.textContent = val.length ? LABELS[score] : '—';
    if (val.length) strengthText.dataset.level = String(score);
    else delete strengthText.dataset.level;
    return score;
  }

  if (pwInput) pwInput.addEventListener('input', scorePassword);

  /* ------------------------------------------------------- 3. Plan       */

  var hiddenPlan = document.getElementById('selectedPlan');
  document.querySelectorAll('#planPicker input[name="plan"]').forEach(function (r) {
    r.addEventListener('change', function () {
      if (r.checked && hiddenPlan) hiddenPlan.value = r.value;
    });
  });

  /* ------------------------------------------- 4. Código de invitación   */

  var betaToggle = document.getElementById('signupBetaToggle');
  var betaRow = document.getElementById('betaCodeRow');
  if (betaToggle && betaRow) {
    betaToggle.addEventListener('click', function () {
      var open = betaRow.classList.toggle('hidden') === false;
      betaToggle.textContent = open ? 'No usar código de invitación' : '¿Tienes un código de invitación?';
      if (open) document.getElementById('betaCode').focus();
    });
  }

  /* ------------------------------------------------------ 5. Mensajes    */

  var msg = document.getElementById('formMessage');
  function setMessage(text, type) {
    if (!msg) return;
    msg.textContent = text || '';
    msg.className = 'form-message' + (type ? ' ' + type : '');
  }

  var submitBtn = document.querySelector('#signupForm .submit-button');
  var signupBody = document.getElementById('signupBody');
  var verifyPanel = document.getElementById('verifyPanel');
  var consentPrivacy = document.getElementById('consentPrivacy');
  var acceptTerms = document.getElementById('acceptTerms');

  function resetFields() {
    ['fullName', 'email'].forEach(function (id) {
      document.getElementById(id).removeAttribute('aria-invalid');
    });
    consentPrivacy.classList.remove('is-missing');
    submitBtn.disabled = false;
    submitBtn.removeAttribute('aria-busy');
    submitBtn.textContent = 'Crear cuenta';
  }

  function showForm() {
    signupBody.classList.remove('hidden');
    verifyPanel.classList.add('hidden');
  }

  /* -------------------------------------------------- 6. Estados demo    */

  var STATES = {
    formulario: function () {
      showForm();
      resetFields();
      setMessage('', '');
    },
    'falta-campo': function () {
      showForm();
      resetFields();
      document.getElementById('email').setAttribute('aria-invalid', 'true');
      setMessage('Escribe un correo válido para continuar.', 'error');
    },
    'correo-en-uso': function () {
      showForm();
      resetFields();
      document.getElementById('email').setAttribute('aria-invalid', 'true');
      setMessage('Ese correo ya tiene una cuenta. Inicia sesión o restablece la contraseña.', 'error');
    },
    'sin-consentimiento': function () {
      showForm();
      resetFields();
      consentPrivacy.classList.add('is-missing');
      setMessage('Necesitamos tu consentimiento expreso para tratar datos patrimoniales. Sin eso no podemos abrir la cuenta.', 'error');
    },
    'creando': function () {
      showForm();
      resetFields();
      setMessage('', '');
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
      submitBtn.textContent = 'Creando la cuenta…';
    },
    'codigo-aplicado': function () {
      showForm();
      resetFields();
      betaRow.classList.remove('hidden');
      document.getElementById('betaCode').value = 'BETA-7F4A2B91';
      setMessage('Código válido: tu cuenta entra a la beta con acceso completo por 30 días.', 'success');
    },
    'codigo-rechazado': function () {
      showForm();
      resetFields();
      betaRow.classList.remove('hidden');
      document.getElementById('betaCode').value = 'BETA-0000000';
      document.getElementById('betaCode').setAttribute('aria-invalid', 'true');
      setMessage('Ese código no existe o ya se usó. Puedes crear la cuenta sin código y quedar en lista de espera.', 'error');
    },
    'verifica-correo': function () {
      var mail = document.getElementById('email').value || 'tu@correo.com';
      document.getElementById('verifyEmail').textContent = mail;
      signupBody.classList.add('hidden');
      verifyPanel.classList.remove('hidden');
      document.getElementById('verifyMessage').textContent = '';
      document.getElementById('verifyMessage').className = 'form-message';
    }
  };

  function buildProtoBar() {
    var names = ['formulario', 'falta-campo', 'correo-en-uso', 'sin-consentimiento', 'creando',
                 'codigo-aplicado', 'codigo-rechazado', 'verifica-correo'];
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

  /* ------------------------------------------------------- 7. Envío      */

  var form = document.getElementById('signupForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('fullName');
      var mail = document.getElementById('email');

      if (!name.value.trim()) {
        resetFields();
        name.setAttribute('aria-invalid', 'true');
        setMessage('Escribe tu nombre completo.', 'error');
        name.focus();
        return;
      }
      if (!mail.value || mail.value.indexOf('@') < 1) {
        STATES['falta-campo']();
        mail.focus();
        return;
      }
      if (scorePassword() < 5) {
        resetFields();
        setMessage('La contraseña todavía no cumple los cinco requisitos.', 'error');
        pwInput.focus();
        return;
      }
      if (!acceptTerms.checked) {
        STATES['sin-consentimiento']();
        acceptTerms.focus();
        return;
      }

      STATES.creando();
      window.setTimeout(function () {
        resetFields();
        STATES['verifica-correo']();
      }, 1000);
    });
  }

  var resend = document.getElementById('resendBtn');
  if (resend) {
    resend.addEventListener('click', function () {
      var m = document.getElementById('verifyMessage');
      m.textContent = 'Enlace reenviado. Si no llega en cinco minutos, revisa la carpeta de correo no deseado.';
      m.className = 'form-message success';
    });
  }

  var googleBtn = document.getElementById('googleSignupBtn');
  if (googleBtn) {
    googleBtn.addEventListener('click', function () {
      setMessage('En el prototipo no hay alta real: aquí se abriría la ventana de Google. El consentimiento se pide igual antes de crear la cuenta.', 'info');
    });
  }

  /* ------------------------------------------------------- 8. Arranque   */

  applyTheme(root.getAttribute('data-theme') || 'light', false);
  buildProtoBar();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      document.querySelectorAll('.seg').forEach(function (s) { moveThumb(s, true); });
    });
  }
})();
