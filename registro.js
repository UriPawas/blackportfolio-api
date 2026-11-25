/* ==========================================================================
   BlackPortfolio — registro (producción)
   Alta real: Firebase Authentication vía window.BlackPortfolioAuth, canje de
   código de beta, checkout de Stripe para planes de pago y activación
   obligatoria de 2FA. Mismo contrato de datos que el app.js histórico
   (createUser, setupTwoFactor, verifyTwoFactorSetup), montado sobre el
   marcado de registro-v4.
   ========================================================================== */

const root = document.documentElement;
const themeBtn = document.getElementById('themeToggle');
const themeSeg = document.getElementById('segTema');
const signupForm = document.getElementById('signupForm');
const selectedPlanInput = document.getElementById('selectedPlan');
const formMessage = document.getElementById('formMessage');
const acceptTerms = document.getElementById('acceptTerms');
const consentPrivacy = document.getElementById('consentPrivacy');

function stateAttr(seg) {
  return seg.getAttribute('role') === 'tablist' ? 'aria-selected' : 'aria-pressed';
}

function moveThumb(seg, instant) {
  const thumb = seg.querySelector('.seg__thumb');
  const active = seg.querySelector(`button[${stateAttr(seg)}="true"]`);
  if (!thumb || !active) return;
  if (instant) thumb.style.transition = 'none';
  thumb.style.transform = `translateX(${active.offsetLeft - 2}px) scaleX(${active.offsetWidth})`;
  if (instant) {
    void thumb.offsetWidth;
    thumb.style.transition = '';
  }
}

function applyTheme(theme, animate) {
  if (animate) {
    root.classList.add('is-theming');
    window.setTimeout(() => root.classList.remove('is-theming'), 340);
  }
  root.setAttribute('data-theme', theme);
  try { localStorage.setItem('bp-theme', theme); } catch (e) { /* sin almacenamiento */ }

  const dark = theme === 'dark';
  if (themeBtn) {
    themeBtn.setAttribute('aria-pressed', String(dark));
    themeBtn.setAttribute('aria-label', dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
  }
  if (themeSeg) {
    themeSeg.querySelectorAll('button').forEach((b) => {
      const on = b.dataset.themeSet === theme;
      b.setAttribute('aria-pressed', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    moveThumb(themeSeg, !animate);
  }
}

if (themeBtn) themeBtn.addEventListener('click', () => {
  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
});
if (themeSeg) themeSeg.querySelectorAll('button').forEach((b) => {
  b.addEventListener('click', () => applyTheme(b.dataset.themeSet, true));
});
window.addEventListener('resize', () => {
  document.querySelectorAll('.seg').forEach((s) => moveThumb(s, true));
});

// ── Fuerza de contraseña ───────────────────────────────────────────────────
const pwInput = document.getElementById('password');
const pwToggle = document.getElementById('pwToggle');
const eyeIcon = document.getElementById('eyeIcon');
const eyeOffIcon = document.getElementById('eyeOffIcon');
const bars = document.querySelectorAll('.pw-bar');
const strengthText = document.getElementById('pwStrengthText');
const reqsList = document.getElementById('pwReqs');

const RULES = [
  { key: 'length',  regex: /.{8,}/ },
  { key: 'number',  regex: /[0-9]/ },
  { key: 'lower',   regex: /[a-z]/ },
  { key: 'upper',   regex: /[A-Z]/ },
  { key: 'special', regex: /[!-\/:-@[-`{-~]/ }
];
const LABELS = ['—', 'Débil', 'Media', 'Suficiente', 'Fuerte', 'Muy fuerte'];

if (pwToggle && pwInput) {
  pwToggle.addEventListener('click', () => {
    const show = pwInput.type === 'password';
    pwInput.type = show ? 'text' : 'password';
    eyeIcon.classList.toggle('hidden', show);
    eyeOffIcon.classList.toggle('hidden', !show);
    pwToggle.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });
}

if (reqsList && pwInput) {
  reqsList.hidden = true;
  pwInput.addEventListener('focus', () => { reqsList.hidden = false; });
  pwInput.addEventListener('blur', () => {
    const allMet = RULES.every(r => r.regex.test(pwInput.value));
    if (!pwInput.value || allMet) reqsList.hidden = true;
  });
}

function scorePassword() {
  const val = pwInput.value;
  let score = 0;
  RULES.forEach((rule) => {
    const met = rule.regex.test(val);
    if (met) score++;
    const li = reqsList && reqsList.querySelector(`li[data-req="${rule.key}"]`);
    if (li) li.classList.toggle('met', met);
  });
  bars.forEach((bar, i) => {
    bar.className = 'pw-bar';
    if (i < score) bar.classList.add(`active-${score}`);
  });
  strengthText.textContent = val.length ? LABELS[score] : '—';
  if (val.length) strengthText.dataset.level = String(score);
  else delete strengthText.dataset.level;
  return score;
}

if (pwInput) pwInput.addEventListener('input', scorePassword);

// ── Plan ─────────────────────────────────────────────────────────────────
document.querySelectorAll('#planPicker input[name="plan"]').forEach((r) => {
  r.addEventListener('change', () => { if (r.checked) selectedPlanInput.value = r.value; });
});

const PAID_PLANS = new Set(['Investor', 'Advisor Pro', 'Wealth Desk']);
function isPaidPlan(plan) { return PAID_PLANS.has(plan); }

// ── Código de invitación: toggle + prellenado por URL (?code=/?plan=) ─────
const betaToggle = document.getElementById('signupBetaToggle');
const betaRow = document.getElementById('betaCodeRow');
const betaInput = document.getElementById('betaCode');
const betaHint = document.getElementById('betaCodeHint');

if (betaToggle && betaRow) {
  betaToggle.addEventListener('click', () => {
    const open = betaRow.classList.toggle('hidden') === false;
    betaToggle.textContent = open ? 'No usar código de invitación' : '¿Tienes un código de invitación?';
    if (open && betaInput) betaInput.focus();
  });
}

if (betaInput) {
  betaInput.addEventListener('input', () => {
    betaInput.value = betaInput.value.toUpperCase().replace(/\s+/g, '');
  });
}

(function prefillFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const plan = params.get('plan');
  if (plan) {
    const radio = document.querySelector(`#planPicker input[name="plan"][value="${CSS.escape(plan)}"]`);
    if (radio) { radio.checked = true; selectedPlanInput.value = plan; }
  }
  const code = (params.get('code') || params.get('beta') || params.get('codigo') || '').trim().toUpperCase();
  if (code && betaInput) {
    betaInput.value = code;
    betaRow.classList.remove('hidden');
    betaToggle.textContent = 'No usar código de invitación';
    if (betaHint) betaHint.textContent = '✓ Código de invitación detectado: se aplicará automáticamente al crear tu cuenta.';
  }
})();

// ── Mensajes ────────────────────────────────────────────────────────────
function showFormMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`;
}

// ── Canje de código de beta ─────────────────────────────────────────────
let _betaAccessGranted = false;

async function redeemBetaCodeIfPresent() {
  const code = (betaInput?.value || '').trim().toUpperCase();
  if (!code) return false;
  try { localStorage.setItem('bp-pending-beta-code', code); } catch {}
  const RAILWAY_API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8000'
    : 'https://blackportfolio-api-production.up.railway.app';
  const firebaseUser = window.BlackPortfolioAuth.firebaseAuth.currentUser;
  if (!firebaseUser) return false;
  try {
    const idToken = await firebaseUser.getIdToken();
    const res = await fetch(`${RAILWAY_API}/api/beta/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ code })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      try { localStorage.removeItem('bp-pending-beta-code'); } catch {}
      if (res.status === 409) { _betaAccessGranted = true; return true; }
      showFormMessage(data.detail || 'No se pudo canjear el código de beta.', 'error');
      return false;
    }
    try { localStorage.removeItem('bp-pending-beta-code'); } catch {}
    _betaAccessGranted = true;
    showFormMessage(`✓ Código de beta canjeado: plan ${data.plan} hasta ${new Date(data.expiresAt).toLocaleDateString()}.`, 'success');
    return true;
  } catch {
    showFormMessage('No se pudo canjear el código de beta. Verifica tu conexión.', 'error');
    return false;
  }
}

// ── Stripe checkout ──────────────────────────────────────────────────────
async function startStripeCheckout({ plan, billingCycle }) {
  const RAILWAY_API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8000'
    : 'https://blackportfolio-api-production.up.railway.app';
  const firebaseUser = window.BlackPortfolioAuth.firebaseAuth.currentUser;
  if (!firebaseUser) throw new Error('Tu sesion expiro. Inicia sesion nuevamente.');
  const idToken = await firebaseUser.getIdToken();
  const res = await fetch(`${RAILWAY_API}/api/billing/stripe/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ plan, billingCycle })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al iniciar el pago');
  }
  const data = await res.json();
  window.location.href = data.url;
}

async function proceedAfterAuth() {
  if (_betaAccessGranted) { window.location.href = 'main.html'; return; }
  const plan = selectedPlanInput.value;
  if (!isPaidPlan(plan)) { window.location.href = 'main.html'; return; }
  try {
    showFormMessage('Plan de pago seleccionado. Redirigiendo al pago seguro…', 'success');
    await startStripeCheckout({ plan, billingCycle: 'monthly' });
  } catch (err) {
    showFormMessage((err.message || 'No se pudo iniciar el pago.') + ' Vuelve a elegir tu plan para reintentar.', 'error');
  }
}

// ── Alta de 2FA obligatoria tras crear cuenta ───────────────────────────
function openTotpSetupModal(uid) {
  const modal      = document.getElementById('totpSetupModal');
  const loading    = document.getElementById('totpSetupLoading');
  const content    = document.getElementById('totpSetupContent');
  const qrImg      = document.getElementById('totpQrImg');
  const manualKey  = document.getElementById('totpManualKey');
  const grid       = document.getElementById('totpSetupOtpGrid');
  const verifyBtn  = document.getElementById('totpSetupVerifyBtn');
  const skipBtn    = document.getElementById('totpSetupSkipBtn');
  const msg        = document.getElementById('totpSetupMsg');
  const boxes      = Array.from(grid.querySelectorAll('.otp-box'));

  modal.classList.remove('hidden');
  loading.classList.remove('hidden');
  content.classList.add('hidden');

  window.BlackPortfolioAuth.setupTwoFactor().then(result => {
    loading.classList.add('hidden');
    if (!result.ok) {
      content.classList.remove('hidden');
      msg.textContent = 'No se pudo generar el código QR. Configura 2FA desde los Ajustes del dashboard.';
      msg.className = 'totp-setup-msg form-message error';
      verifyBtn.disabled = true;
      return;
    }
    if (typeof QRCode !== 'undefined') {
      QRCode.toDataURL(result.otpauthUri, { width: 200, margin: 2 }, function (err, url) {
        qrImg.src = err ? '' : url;
      });
    } else {
      qrImg.style.display = 'none';
    }
    manualKey.textContent = result.manualKey;
    content.classList.remove('hidden');
  });

  function getCode() { return boxes.map(b => b.value).join(''); }
  function syncBtn() { verifyBtn.disabled = !boxes.every(b => b.value !== ''); }
  function clearError() {
    msg.textContent = '';
    msg.className = 'totp-setup-msg';
    boxes.forEach(b => b.classList.remove('otp-box--error'));
  }
  function maybeAutoVerify() {
    if (boxes.every(b => b.value !== '') && !verifyBtn.disabled) verifyBtn.click();
  }

  boxes.forEach((box, i) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '').slice(-1);
      clearError();
      if (box.value && i < 5) boxes[i + 1].focus();
      syncBtn();
      maybeAutoVerify();
    });
    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && i > 0) boxes[i - 1].focus();
      else if (e.key === 'ArrowLeft' && i > 0) boxes[i - 1].focus();
      else if (e.key === 'ArrowRight' && i < 5) boxes[i + 1].focus();
    });
    box.addEventListener('paste', e => {
      e.preventDefault();
      const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      digits.split('').forEach((d, j) => { if (boxes[j]) boxes[j].value = d; });
      clearError();
      syncBtn();
      const next = boxes.findIndex(b => !b.value);
      (next === -1 ? boxes[5] : boxes[next]).focus();
      maybeAutoVerify();
    });
  });

  verifyBtn.addEventListener('click', async () => {
    const code = getCode();
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verificando…';
    clearError();

    const result = await window.BlackPortfolioAuth.verifyTwoFactorSetup(code);

    if (result.ok) {
      sessionStorage.setItem('totp_verified', uid);
      try { localStorage.setItem('totp_trusted_' + uid, String(Date.now())); } catch {}
      msg.textContent = '✓ 2FA activado. Continuando…';
      msg.className = 'totp-setup-msg form-message success';
      setTimeout(() => { proceedAfterAuth(); }, 1200);
      return;
    }

    msg.textContent = result.error || 'Código incorrecto. Intenta de nuevo.';
    msg.className = 'totp-setup-msg form-message error';
    boxes.forEach(b => { b.value = ''; b.classList.add('otp-box--error'); });
    verifyBtn.textContent = 'Activar 2FA y acceder al dashboard';
    verifyBtn.disabled = true;
    boxes[0].focus();
  });

  skipBtn.addEventListener('click', () => {
    sessionStorage.setItem('totp_verified', uid);
    modal.classList.add('hidden');
    proceedAfterAuth();
  });
}

// ── Envío del formulario ─────────────────────────────────────────────────
signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!acceptTerms.checked) {
    consentPrivacy.classList.add('is-missing');
    showFormMessage('Necesitamos tu consentimiento expreso para tratar datos patrimoniales. Sin eso no podemos abrir la cuenta.', 'error');
    acceptTerms.focus();
    return;
  }
  consentPrivacy.classList.remove('is-missing');

  const formData = new FormData(signupForm);
  const payload = Object.fromEntries(formData.entries());
  const requestedPlan = payload.selectedPlan;

  try {
    const newUser = await window.BlackPortfolioAuth.createUser(payload);
    const betaCodeValue = (payload.betaCode || '').trim();
    signupForm.reset();
    selectedPlanInput.value = requestedPlan;
    if (betaCodeValue) {
      if (betaInput) betaInput.value = betaCodeValue;
      await redeemBetaCodeIfPresent();
    } else {
      showFormMessage(`Cuenta creada con éxito para ${newUser.fullName}. Configura tu autenticador para mayor seguridad.`, 'success');
    }
    openTotpSetupModal(newUser.id);
  } catch (error) {
    showFormMessage(error.message, 'error');
  }
});

// ── Registro con Google ──────────────────────────────────────────────────
const googleSignupBtn = document.getElementById('googleSignupBtn');
if (googleSignupBtn) {
  googleSignupBtn.addEventListener('click', async () => {
    const span = googleSignupBtn.querySelector('span');
    const original = span.textContent;
    googleSignupBtn.classList.add('is-loading');
    googleSignupBtn.disabled = true;
    span.textContent = 'Abriendo Google…';

    // Google a pantalla completa (redirección); el plan elegido y el código de invitación viajan en sessionStorage.
    if (window.BlackPortfolioAuth.startGoogleRedirect) {
      try {
        sessionStorage.setItem('bp-google-redirect-form', JSON.stringify({ plan: selectedPlanInput.value || '', beta: (betaInput?.value || '').trim().toUpperCase() }));
        await window.BlackPortfolioAuth.startGoogleRedirect();
        return;
      } catch (e) { /* ventana emergente como antes */ }
    }

    const result = await window.BlackPortfolioAuth.authenticateWithGoogle();

    googleSignupBtn.classList.remove('is-loading');
    googleSignupBtn.disabled = false;
    span.textContent = original;

    if (!result.ok) {
      showFormMessage(result.error, 'error');
      return;
    }
    await continueAfterGoogleSignup(result);
  });

  // Regreso de Google por redirección: restaura plan y código, y sigue el mismo camino que la ventana emergente.
  if (window.BlackPortfolioAuth.hasPendingGoogleRedirect && window.BlackPortfolioAuth.hasPendingGoogleRedirect()) {
    try {
      const saved = JSON.parse(sessionStorage.getItem('bp-google-redirect-form') || '{}');
      sessionStorage.removeItem('bp-google-redirect-form');
      if (saved.plan) {
        const radio = document.querySelector('#planPicker input[name="plan"][value="' + (window.CSS && CSS.escape ? CSS.escape(saved.plan) : saved.plan) + '"]');
        if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
        selectedPlanInput.value = saved.plan;
      }
      if (saved.beta && betaInput) { betaInput.value = saved.beta; betaRow?.classList.remove('hidden'); }
    } catch {}
    const span = googleSignupBtn.querySelector('span');
    const original = span.textContent;
    googleSignupBtn.classList.add('is-loading');
    googleSignupBtn.disabled = true;
    span.textContent = 'Entrando con Google…';
    showFormMessage('Completando el registro con Google…', 'success');
    window.BlackPortfolioAuth.completeGoogleRedirect().then(async result => {
      googleSignupBtn.classList.remove('is-loading');
      googleSignupBtn.disabled = false;
      span.textContent = original;
      if (!result) { showFormMessage('', ''); return; }
      if (!result.ok) { showFormMessage(result.error, result.cancelled ? 'success' : 'error'); return; }
      await continueAfterGoogleSignup(result);
    });
  }
}

async function continueAfterGoogleSignup(result) {
  {
    showFormMessage(
      result.isNew
        ? `Cuenta creada con Google para ${result.user.fullName}.`
        : `Bienvenido de vuelta, ${result.user.fullName}.`,
      'success'
    );
    const redeemed = await redeemBetaCodeIfPresent();
    if (redeemed) { window.location.href = 'main.html'; return; }
    window.setTimeout(async () => {
      const needsPlanSelection = result.isNew || (
        !result.user.planSelectionCompleted &&
        result.user.selectedPlan === 'Explorer' &&
        result.user.billingStatus !== 'active'
      );
      if (!needsPlanSelection) { window.location.href = 'main.html'; return; }
      if (isPaidPlan(selectedPlanInput.value)) { proceedAfterAuth(); return; }
      if (window.BlackPortfolioPlanPicker) {
        const choice = await window.BlackPortfolioPlanPicker.run({ defaultCycle: 'monthly' });
        if (choice && !choice.paid) window.location.href = 'main.html';
      } else {
        showFormMessage('No se pudo cargar la selección de plan. Recarga la página e intenta de nuevo.', 'error');
      }
    }, 1200);
  }
}

// ── Reenviar verificación de correo (panel V4, si llega a mostrarse) ─────
const resendBtn = document.getElementById('resendBtn');
if (resendBtn) {
  resendBtn.addEventListener('click', async () => {
    const verifyMessage = document.getElementById('verifyMessage');
    const result = await window.BlackPortfolioAuth.resendEmailVerification();
    if (verifyMessage) {
      verifyMessage.textContent = result.ok
        ? 'Enlace reenviado. Si no llega en cinco minutos, revisa la carpeta de correo no deseado.'
        : (result.error || 'No se pudo reenviar el correo.');
      verifyMessage.className = `form-message ${result.ok ? 'success' : 'error'}`;
    }
  });
}

// ── Validación en línea ──────────────────────────────────────────────────
(function initInlineValidation() {
  const FIELD_MESSAGES = {
    fullName: 'Por favor ingresa tu nombre completo.',
    email:    'Ingresa un correo electrónico válido.',
    password: 'La contraseña debe tener al menos 8 caracteres.'
  };

  Object.entries(FIELD_MESSAGES).forEach(([id, msg]) => {
    const input = document.getElementById(id);
    if (!input) return;
    const row = input.closest('.form-row');
    if (!row) return;

    function showError() {
      if (input.validity.valid) return;
      row.classList.add('has-error');
      if (!row.querySelector('.field-error-msg')) {
        const p = document.createElement('p');
        p.className = 'field-error-msg';
        p.textContent = msg;
        row.appendChild(p);
      }
    }
    function clearError() {
      row.classList.remove('has-error');
      row.querySelector('.field-error-msg')?.remove();
    }

    input.addEventListener('blur', showError);
    input.addEventListener('input', clearError);
  });
})();

// ── Arranque ─────────────────────────────────────────────────────────────
window.BlackPortfolioAuth.ensureDemoUser();
applyTheme(root.getAttribute('data-theme') || 'light', false);

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    document.querySelectorAll('.seg').forEach((s) => moveThumb(s, true));
  });
}
