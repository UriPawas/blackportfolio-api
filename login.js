const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const submitButton = loginForm.querySelector("button[type='submit']");
const googleLoginBtn = document.getElementById("googleLoginBtn");

let failedAttempts = 0;
let _loginFlowActive = false; // prevents onAuthStateChanged from redirecting mid-flow

function showLoginMessage(text, type) {
  loginMessage.textContent = text;
  loginMessage.className = `form-message ${type}`;
}

// ── Código de invitación en el login ─────────────────────────────────────────
// Permite canjear un código beta/promocional al iniciar sesión: el endpoint de
// canje no exige estar en la allowlist (el canje mismo añade el correo), así
// que un usuario invitado nunca queda fuera aunque el registro no lo canjeara.
const PENDING_BETA_KEY = "bp-pending-beta-code";
const betaToggle = document.getElementById("loginBetaToggle");
const betaRow    = document.getElementById("loginBetaRow");
const betaInput  = document.getElementById("loginBetaCode");

betaToggle?.addEventListener("click", () => {
  betaRow.classList.toggle("hidden");
  if (!betaRow.classList.contains("hidden")) betaInput.focus();
});
betaInput?.addEventListener("input", () => {
  betaInput.value = betaInput.value.toUpperCase().replace(/\s+/g, "");
});

// Prellena desde la URL (?code= / ?codigo= / ?beta= distinto de "closed") o desde
// un canje pendiente que quedó guardado de un registro interrumpido.
(function initLoginBetaCode() {
  const params = new URLSearchParams(window.location.search);
  const rawBeta = params.get("beta") || "";
  const urlCode = (params.get("code") || params.get("codigo") || (rawBeta !== "closed" ? rawBeta : "") || "").trim().toUpperCase();
  const pending = (localStorage.getItem(PENDING_BETA_KEY) || "").trim().toUpperCase();
  const code = urlCode || pending;
  if (code && betaInput) {
    betaInput.value = code;
    betaRow.classList.remove("hidden");
  }
})();

// Canjea el código (del campo o pendiente) tras autenticarse. Devuelve sin
// bloquear el login: si el canje falla por código inválido se muestra el error,
// pero el flujo continúa (el correo puede ya estar en la allowlist).
async function redeemLoginBetaCode() {
  const code = (betaInput?.value || localStorage.getItem(PENDING_BETA_KEY) || "").trim().toUpperCase();
  if (!code) return false;
  const res = await window.BlackPortfolioAuth.redeemBetaCode(code);
  if (res.ok) {
    localStorage.removeItem(PENDING_BETA_KEY);
    showLoginMessage(`✓ Código canjeado: plan ${res.plan} activado.`, "success");
    return true;
  }
  // 409 = ya tiene beta activa: el acceso ya existe, no es un error para el login.
  if (res.status === 409) { localStorage.removeItem(PENDING_BETA_KEY); return true; }
  // Código inválido/agotado: descarta el pendiente para no reintentar por siempre.
  if (res.status && res.status !== 0) localStorage.removeItem(PENDING_BETA_KEY);
  showLoginMessage(res.error || "No se pudo canjear el código de invitación.", "error");
  return false;
}

// ── Beta cerrada: aviso al llegar redirigido desde la app ────────────────────
if (new URLSearchParams(window.location.search).get("beta") === "closed") {
  showLoginMessage(
    "BlackPortfolio está en beta cerrada. Si tienes un código de invitación, ingrésalo abajo y vuelve a entrar; si no, escríbenos para solicitar uno.",
    "error"
  );
  betaRow?.classList.remove("hidden");
}

// ── Trusted device: skip the 2FA code for ~3.5 days (≈ twice a week) ──────────
const TRUSTED_DEVICE_TTL_MS = 3.5 * 24 * 60 * 60 * 1000;

function isDeviceTrusted(uid) {
  if (sessionStorage.getItem("totp_verified") === uid) return true;
  try {
    const ts = parseInt(localStorage.getItem("totp_trusted_" + uid) || "", 10);
    if (!Number.isFinite(ts)) return false;
    if (Date.now() - ts > TRUSTED_DEVICE_TTL_MS) {
      localStorage.removeItem("totp_trusted_" + uid);
      return false;
    }
    return true;
  } catch { return false; }
}

function trustDevice(uid) {
  sessionStorage.setItem("totp_verified", uid);
  try { localStorage.setItem("totp_trusted_" + uid, String(Date.now())); } catch {}
}

function maybeShowForgotHint() {
  if (failedAttempts < 2) return;
  if (document.getElementById("forgotHint")) return;
  const hint = document.createElement("p");
  hint.id = "forgotHint";
  hint.style.cssText = "margin:8px 0 0;font-size:0.84rem;color:var(--muted,#8fa3b1);";
  hint.innerHTML = `¿Olvidaste tu contraseña? Usa el botón <span style="color:#6f86ff;font-weight:600">¿Olvidaste tu contraseña?</span> de arriba para recibir un correo de recuperación a tu email.`;
  loginMessage.insertAdjacentElement("afterend", hint);
}

// ── Entrada a la app: con la transición Tablero si está cargada (nunca bloquea la navegación más de ~0.9 s) ──
function goApp(replace) {
  if (window.CampoGate && typeof window.CampoGate.go === "function") {
    try { window.CampoGate.go(document.querySelector(".otp-card:not(.hidden)") || loginForm, "main.html"); return; } catch (e) { /* navegación normal */ }
  }
  if (replace) window.location.replace("main.html"); else window.location.href = "main.html";
}

// ── 2FA recovery: returning from the email sign-in link ─────────────────────
if (window.BlackPortfolioAuth.isEmailSignInLink()) {
  _loginFlowActive = true;
  showLoginMessage("Verificando tu enlace de acceso…", "info");
  window.BlackPortfolioAuth.completeEmailSignInLink().then(async res => {
    if (res.ok) {
      const enabled = await window.BlackPortfolioAuth.isTwoFactorEnabled(res.uid);
      if (!enabled) { _loginFlowActive = true; showSetupOverlay(res.uid); return; }
      trustDevice(res.uid);
      goApp(true);
    } else {
      _loginFlowActive = false;
      showLoginMessage(res.error || "No se pudo completar el acceso por enlace.", "error");
    }
  });
}

// ── Regreso de Google (acceso por redirección a pantalla completa) ──────────
// Va ANTES de registrar onAuthStateChanged: _loginFlowActive evita que el guardián de sesión vieja cierre la
// sesión que Google acaba de abrir.
if (window.BlackPortfolioAuth.hasPendingGoogleRedirect && window.BlackPortfolioAuth.hasPendingGoogleRedirect()) {
  _loginFlowActive = true;
  const gSpan = googleLoginBtn.querySelector("span");
  const gOriginal = gSpan.textContent;
  googleLoginBtn.classList.add("is-loading");
  googleLoginBtn.disabled = true;
  gSpan.textContent = "Entrando con Google…";
  showLoginMessage("Completando el acceso con Google…", "info");
  window.BlackPortfolioAuth.completeGoogleRedirect().then(async result => {
    googleLoginBtn.classList.remove("is-loading");
    googleLoginBtn.disabled = false;
    gSpan.textContent = gOriginal;
    if (!result) { _loginFlowActive = false; showLoginMessage("", ""); return; }
    if (!result.ok) {
      _loginFlowActive = false;
      showLoginMessage(result.error, result.cancelled ? "info" : "error");
      return;
    }
    showLoginMessage("", "");
    await continueAfterGoogle(result);
  });
}

// ── Redirect if already authenticated (with 2FA gate) ───────────────────────
window.BlackPortfolioAuth.firebaseAuth.onAuthStateChanged(async user => {
  if (!user || _loginFlowActive) return;
  // Dispositivo de confianza CON un token de sesión 2FA vivo: salta directo a la
  // app. El backend exige ese token (X-2FA-Token); sin él, main.html rebotaría al
  // login en bucle, así que solo tomamos este atajo cuando el token existe.
  if (isDeviceTrusted(user.uid) && localStorage.getItem("bp-2fa-token")) {
    trustDevice(user.uid); // refresh the window so active users stay trusted
    goApp();
    return;
  }
  // Demo user bypasses 2FA
  const extra = JSON.parse(localStorage.getItem("bp-extra-" + user.uid) || "{}");
  if (extra.isDemo) {
    sessionStorage.setItem("totp_verified", user.uid);
    goApp();
    return;
  }
  // Stale persisted session (e.g. arriving at login fresh, or reopening the tab):
  // do NOT show the 2FA gate for whoever was logged in before — the code is
  // per-user. Sign out and require a fresh login first.
  try { await window.BlackPortfolioAuth.firebaseAuth.signOut(); } catch {}
});

window.BlackPortfolioAuth.ensureDemoUser();

// ── Post-auth 2FA gate ───────────────────────────────────────────────────────
async function handlePostAuth(session) {
  if (session.isDemo) {
    sessionStorage.setItem("totp_verified", session.id);
    showLoginMessage(`Bienvenido, ${session.fullName}. Redirigiendo...`, "success");
    setTimeout(() => { goApp(); }, 800);
    return;
  }

  const enabled = await window.BlackPortfolioAuth.isTwoFactorEnabled(session.id);
  if (!enabled) {
    showLoginMessage("", "");
    showSetupOverlay(session.id);
    return;
  }

  // Trusted device within the ~3.5-day window: skip the code SOLO si todavía
  // hay un token de sesión 2FA vivo. Sin él, el backend devuelve 403 y main.html
  // rebota al login en bucle, así que caemos al overlay OTP para emitir uno nuevo.
  if (isDeviceTrusted(session.id) && localStorage.getItem("bp-2fa-token")) {
    trustDevice(session.id);
    showLoginMessage(`Bienvenido, ${session.fullName}. Redirigiendo...`, "success");
    setTimeout(() => { goApp(); }, 600);
    return;
  }

  showLoginMessage("", "");
  showOtpOverlay(session.id);
}

// ── Google login ─────────────────────────────────────────────────────────────
googleLoginBtn.addEventListener("click", async () => {
  const span = googleLoginBtn.querySelector("span");
  const original = span.textContent;
  googleLoginBtn.classList.add("is-loading");
  googleLoginBtn.disabled = true;
  span.textContent = "Abriendo Google…";
  _loginFlowActive = true;

  // Google a pantalla completa (redirección). Si el navegador no lo permite, ventana emergente como antes.
  if (window.BlackPortfolioAuth.startGoogleRedirect) {
    // el código de invitación escrito en el campo sobrevive al viaje a Google
    const typed = (betaInput?.value || "").trim().toUpperCase();
    if (typed) { try { localStorage.setItem(PENDING_BETA_KEY, typed); } catch {} }
    try { await window.BlackPortfolioAuth.startGoogleRedirect(); return; } catch (e) { /* ventana emergente */ }
  }

  const result = await window.BlackPortfolioAuth.authenticateWithGoogle();

  googleLoginBtn.classList.remove("is-loading");
  googleLoginBtn.disabled = false;
  span.textContent = original;

  if (!result.ok) {
    _loginFlowActive = false;
    showLoginMessage(result.error, "error");
    return;
  }
  await continueAfterGoogle(result);
});

// Lo mismo para la ventana emergente y para el regreso de la redirección.
async function continueAfterGoogle(result) {
  // Canjea código de invitación si hay uno (campo o pendiente). Con canje
  // exitoso el plan ya quedó otorgado: se salta la selección de plan.
  const betaRedeemed = await redeemLoginBetaCode();
  if (betaRedeemed) { await handlePostAuth(result.user); return; }

  // Usuario NUEVO con Google: que elija plan. Si es de pago, el selector redirige
  // a Stripe (no regresa). Si es gratis, continúa al alta normal (gate 2FA).
  const needsPlanSelection = result.isNew || (
    !result.user.planSelectionCompleted &&
    result.user.selectedPlan === "Explorer" &&
    result.user.billingStatus !== "active"
  );
  if (needsPlanSelection && !window.BlackPortfolioPlanPicker) {
    _loginFlowActive = false;
    showLoginMessage("No se pudo cargar la selección de plan. Recarga la página e intenta de nuevo.", "error");
    return;
  }
  if (needsPlanSelection) {
    const choice = await window.BlackPortfolioPlanPicker.run();
    if (choice && choice.paid) return; // redirigiendo a Stripe
  }

  await handlePostAuth(result.user);
}

// ── Email/password login ─────────────────────────────────────────────────────
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const _origBtnText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.classList.add("is-loading");
  submitButton.textContent = "Entrando…";
  _loginFlowActive = true;

  function resetSubmitButton() {
    submitButton.disabled = false;
    submitButton.classList.remove("is-loading");
    submitButton.textContent = _origBtnText;
  }

  const formData = new FormData(loginForm);
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const result = await window.BlackPortfolioAuth.authenticate(email, password);

  if (!result.ok) {
    _loginFlowActive = false;
    failedAttempts++;
    showLoginMessage(result.error, "error");
    maybeShowForgotHint();
    resetSubmitButton();
    return;
  }

  failedAttempts = 0;
  document.getElementById("forgotHint")?.remove();
  try {
    await redeemLoginBetaCode();
    await handlePostAuth(result.user);
  } catch (err) {
    // Sign-in succeeded but a downstream step (beta redeem, 2FA, bootstrap)
    // threw. Never leave the button stuck on "Entrando…" with no feedback.
    _loginFlowActive = false;
    showLoginMessage(
      (err && err.message) || "No se pudo completar el inicio de sesión. Intenta de nuevo.",
      "error"
    );
  }
  resetSubmitButton();
});

// ── Forgot password ──────────────────────────────────────────────────────────
(function initForgotPassword() {
  const btn = document.getElementById("forgotPwBtn");
  const emailInput = document.getElementById("loginEmail");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const email = emailInput?.value?.trim();
    if (!email) {
      emailInput?.focus();
      showLoginMessage("Ingresa tu correo electrónico primero.", "error");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Enviando...";

    try {
      await window.BlackPortfolioAuth.firebaseAuth.sendPasswordResetEmail(email);
      showLoginMessage(`Correo de recuperación enviado a ${email}. Revisa tu bandeja.`, "success");
    } catch (err) {
      const msg = err.code === "auth/user-not-found"
        ? "No existe una cuenta con ese correo."
        : "No se pudo enviar el correo. Intenta de nuevo.";
      showLoginMessage(msg, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "¿Olvidaste tu contraseña?";
    }
  });
})();

// ── Password show/hide toggle ────────────────────────────────────────────────
(function initLoginPwToggle() {
  const toggle = document.getElementById("loginPwToggle");
  const input  = document.getElementById("loginPassword");
  const eyeOn  = document.getElementById("loginEyeIcon");
  const eyeOff = document.getElementById("loginEyeOffIcon");
  if (!toggle || !input) return;

  toggle.addEventListener("click", () => {
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    eyeOn.classList.toggle("hidden",  isPassword);
    eyeOff.classList.toggle("hidden", !isPassword);
  });
})();

// ── Inline validation ────────────────────────────────────────────────────────
(function initLoginInlineValidation() {
  const FIELD_MESSAGES = {
    loginEmail:    "Ingresa un correo electrónico válido.",
    loginPassword: "Por favor ingresa tu contraseña."
  };

  Object.entries(FIELD_MESSAGES).forEach(([id, msg]) => {
    const input = document.getElementById(id);
    if (!input) return;
    const row = input.closest(".form-row");
    if (!row) return;

    function showError() {
      if (input.validity.valid) return;
      row.classList.add("has-error");
      if (!row.querySelector(".field-error-msg")) {
        const p = document.createElement("p");
        p.className = "field-error-msg";
        p.textContent = msg;
        row.appendChild(p);
      }
    }

    function clearError() {
      row.classList.remove("has-error");
      row.querySelector(".field-error-msg")?.remove();
    }

    input.addEventListener("blur", showError);
    input.addEventListener("input", clearError);
  });
})();

// ── Códigos de respaldo: render + acciones (copiar / descargar) ──────────────
function renderBackupCodes(codes, gridEl) {
  if (!gridEl) return;
  gridEl.innerHTML = "";
  (codes || []).forEach(c => {
    const span = document.createElement("span");
    span.className = "backup-code-chip";
    span.textContent = c;
    gridEl.appendChild(span);
  });
}

function backupCodesAsText(codes) {
  return "BlackPortfolio · Códigos de respaldo 2FA\n"
    + "Cada código sirve UNA sola vez. Guárdalos en un lugar seguro.\n\n"
    + (codes || []).join("\n") + "\n";
}

function wireBackupCodeActions(codes, copyBtn, downloadBtn) {
  if (copyBtn) copyBtn.onclick = async () => {
    try { await navigator.clipboard.writeText((codes || []).join("\n")); copyBtn.textContent = "✓ Copiado"; }
    catch { copyBtn.textContent = "No se pudo copiar"; }
    setTimeout(() => { copyBtn.textContent = "Copiar"; }, 1500);
  };
  if (downloadBtn) downloadBtn.onclick = () => {
    const blob = new Blob([backupCodesAsText(codes)], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "blackportfolio-codigos-respaldo.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  };
}

// ── OTP Overlay ──────────────────────────────────────────────────────────────
function showOtpOverlay(uid) {
  const overlay  = document.getElementById("otpOverlay");
  const grid     = document.getElementById("otpGrid");
  const statusMsg = document.getElementById("otpStatus");
  const errorMsg  = document.getElementById("otpError");
  const fallbackBtn = document.getElementById("otpEmailFallbackBtn");
  const fallbackMsg = document.getElementById("otpFallbackMsg");
  const boxes     = Array.from(grid.querySelectorAll(".otp-box"));

  overlay.classList.remove("hidden");
  boxes[0].focus();

  function getCode() { return boxes.map(b => b.value).join(""); }

  function setStatus(text) {
    statusMsg.textContent = text || "";
    statusMsg.classList.toggle("hidden", !text);
  }

  function clearError() {
    errorMsg.textContent = "";
    errorMsg.classList.add("hidden");
    boxes.forEach(b => b.classList.remove("otp-box--error"));
  }

  // Sin botones: al completar el 6º dígito se verifica solo; si falla, se
  // limpian las casillas para reintentar de inmediato.
  let _verifying = false;

  async function submitCode() {
    if (_verifying || !boxes.every(b => b.value !== "")) return;
    _verifying = true;
    boxes.forEach(b => { b.disabled = true; b.classList.add("otp-box--complete"); });
    clearError();
    setStatus("Verificando…");

    const result = await window.BlackPortfolioAuth.verifyTwoFactor(getCode());

    if (result.valid) {
      trustDevice(uid);
      setStatus("✓ Verificado. Entrando…");
      goApp();
      return;
    }

    setStatus("");
    errorMsg.textContent = result.error || "Código incorrecto. Comprueba la app y vuelve a intentarlo.";
    errorMsg.classList.remove("hidden");
    boxes.forEach(b => {
      b.disabled = false;
      b.value = "";
      b.classList.remove("otp-box--complete");
      b.classList.add("otp-box--error");
    });
    boxes[0].focus();
    _verifying = false;
  }

  boxes.forEach((box, i) => {
    box.addEventListener("input", e => {
      // Accept only digit
      box.value = box.value.replace(/\D/g, "").slice(-1);
      clearError();
      if (box.value && i < 5) boxes[i + 1].focus();
      submitCode();
    });

    box.addEventListener("keydown", e => {
      if (e.key === "Backspace" && !box.value && i > 0) boxes[i - 1].focus();
      else if (e.key === "ArrowLeft"  && i > 0) boxes[i - 1].focus();
      else if (e.key === "ArrowRight" && i < 5) boxes[i + 1].focus();
    });

    box.addEventListener("paste", e => {
      e.preventDefault();
      const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      digits.split("").forEach((d, j) => { if (boxes[j]) boxes[j].value = d; });
      clearError();
      const nextEmpty = boxes.findIndex(b => !b.value);
      (nextEmpty === -1 ? boxes[5] : boxes[nextEmpty]).focus();
      submitCode();
    });
  });

  // ── Fallback: acceso por enlace mágico al correo ──────────────────────────
  fallbackBtn.addEventListener("click", async () => {
    fallbackBtn.disabled = true;
    fallbackMsg.classList.remove("hidden");
    fallbackMsg.className = "otp-fallback-msg";
    fallbackMsg.textContent = "Enviando enlace de acceso a tu correo…";
    clearError();

    const res = await window.BlackPortfolioAuth.sendRecoveryEmailLink();
    if (!res.ok) {
      fallbackMsg.classList.add("otp-fallback-msg--error");
      fallbackMsg.textContent = res.error || "No se pudo enviar el enlace.";
      fallbackBtn.disabled = false;
      return;
    }

    fallbackMsg.textContent = `Te enviamos un enlace de acceso a ${res.email}. Ábrelo desde este dispositivo para entrar (revisa también spam).`;
  });

  // ── Fallback: código de respaldo de un solo uso ───────────────────────────
  const backupToggle  = document.getElementById("otpBackupToggle");
  const backupWrap    = document.getElementById("otpBackupWrap");
  const backupInput   = document.getElementById("otpBackupInput");
  const backupVerify  = document.getElementById("otpBackupVerifyBtn");

  backupToggle?.addEventListener("click", () => {
    backupWrap.classList.toggle("hidden");
    if (!backupWrap.classList.contains("hidden")) backupInput.focus();
  });

  backupVerify?.addEventListener("click", async () => {
    const code = (backupInput.value || "").trim();
    if (!code) { backupInput.focus(); return; }
    backupVerify.disabled = true;
    backupVerify.textContent = "Verificando…";
    clearError();

    const result = await window.BlackPortfolioAuth.verifyTwoFactor(code);
    if (result.valid) {
      trustDevice(uid);
      backupVerify.textContent = "✓ Verificado";
      const left = result.backupCodesRemaining;
      if (typeof left === "number") {
        fallbackMsg.classList.remove("hidden");
        fallbackMsg.className = "otp-fallback-msg";
        fallbackMsg.textContent = `Te quedan ${left} código(s) de respaldo. Genera nuevos desde Ajustes → Seguridad.`;
      }
      setTimeout(() => { goApp(); }, 800);
      return;
    }

    errorMsg.textContent = "Código de respaldo inválido o ya usado.";
    errorMsg.classList.remove("hidden");
    backupInput.value = "";
    backupVerify.textContent = "Entrar con código de respaldo";
    backupVerify.disabled = false;
    backupInput.focus();
  });
}

// ── Mandatory 2FA Setup Overlay (when user has no 2FA yet) ────────────────────
function showSetupOverlay(uid) {
  const overlay   = document.getElementById("totpSetupOverlay");
  const loading   = document.getElementById("totpSetupLoading");
  const content   = document.getElementById("totpSetupContent");
  const qrImg     = document.getElementById("totpSetupQrImg");
  const manualKey = document.getElementById("totpSetupManualKey");
  const grid      = document.getElementById("totpSetupOtpGrid");
  const verifyBtn = document.getElementById("totpSetupVerifyBtn");
  const logoutBtn = document.getElementById("totpSetupLogoutBtn");
  const msg       = document.getElementById("totpSetupMsg");
  const boxes     = Array.from(grid.querySelectorAll(".otp-box"));

  boxes.forEach(b => { b.value = ""; b.classList.remove("otp-box--complete", "otp-box--error"); });
  msg.textContent = "";
  msg.className = "totp-setup-msg";
  verifyBtn.disabled = true;
  verifyBtn.textContent = "Activar y continuar";
  overlay.classList.remove("hidden");

  const spinner    = document.getElementById("totpSetupSpinner");
  const loadingMsg = document.getElementById("totpSetupLoadingMsg");
  const retryWrap  = document.getElementById("totpSetupRetry");
  const retryBtn   = document.getElementById("totpSetupRetryBtn");
  const manualCopy = document.getElementById("totpSetupManualCopy");

  function showSetupError(text) {
    loading.classList.remove("hidden");
    content.classList.add("hidden");
    spinner.classList.add("hidden");
    loadingMsg.textContent = text;
    loadingMsg.style.color = "#ff8f8f";
    retryWrap.classList.remove("hidden");
  }

  // Genera (o regenera) el secreto y el QR. Cualquier fallo — red caída o el
  // backend — deja un botón de reintento en vez de un spinner colgado.
  function runSetup() {
    loading.classList.remove("hidden");
    content.classList.add("hidden");
    spinner.classList.remove("hidden");
    loadingMsg.textContent = "Generando código QR…";
    loadingMsg.style.color = "var(--muted)";
    retryWrap.classList.add("hidden");

    window.BlackPortfolioAuth.setupTwoFactor().then(result => {
      if (!result.ok) {
        showSetupError(result.error || "No se pudo generar el código. Revisa tu conexión y reintenta.");
        return;
      }
      loading.classList.add("hidden");
      content.classList.remove("hidden");
      if (typeof QRCode !== "undefined") {
        QRCode.toDataURL(result.otpauthUri, { width: 200, margin: 2 }, function(err, url) {
          qrImg.src = err ? "" : url;
          qrImg.style.display = err ? "none" : "";
        });
      } else {
        qrImg.style.display = "none";
      }
      manualKey.textContent = result.manualKey;
    }).catch(() => {
      showSetupError("No se pudo generar el código. Revisa tu conexión y reintenta.");
    });
  }

  retryBtn.onclick = runSetup;
  document.getElementById("totpSetupErrLogoutBtn").onclick = () => logoutBtn.onclick();

  if (manualCopy) manualCopy.onclick = async () => {
    const key = (manualKey.textContent || "").trim();
    if (!key || key === "—") return;
    try { await navigator.clipboard.writeText(key); manualCopy.textContent = "✓ Copiado"; }
    catch { manualCopy.textContent = "No se pudo"; }
    setTimeout(() => { manualCopy.textContent = "Copiar"; }, 1500);
  };

  runSetup();

  function clearError() { msg.textContent = ""; msg.className = "totp-setup-msg"; boxes.forEach(b => b.classList.remove("otp-box--error")); }
  function syncBtn() { verifyBtn.disabled = !boxes.every(b => b.value !== ""); }
  // Auto-verifica al completar el sexto dígito.
  function maybeAutoVerify() {
    if (boxes.every(b => b.value !== "") && !verifyBtn.disabled) verifyBtn.onclick();
  }

  boxes.forEach((box, i) => {
    box.addEventListener("input", () => {
      box.value = box.value.replace(/\D/g, "").slice(-1);
      clearError();
      if (box.value && i < 5) boxes[i + 1].focus();
      syncBtn();
      maybeAutoVerify();
    });
    box.addEventListener("keydown", e => {
      if (e.key === "Backspace" && !box.value && i > 0) boxes[i - 1].focus();
      else if (e.key === "ArrowLeft"  && i > 0) boxes[i - 1].focus();
      else if (e.key === "ArrowRight" && i < 5) boxes[i + 1].focus();
    });
    box.addEventListener("paste", e => {
      e.preventDefault();
      const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      digits.split("").forEach((d, j) => { if (boxes[j]) boxes[j].value = d; });
      clearError();
      syncBtn();
      const nextEmpty = boxes.findIndex(b => !b.value);
      (nextEmpty === -1 ? boxes[5] : boxes[nextEmpty]).focus();
      maybeAutoVerify();
    });
  });

  verifyBtn.onclick = async () => {
    const code = boxes.map(b => b.value).join("");
    verifyBtn.disabled = true;
    verifyBtn.textContent = "Verificando…";

    const result = await window.BlackPortfolioAuth.verifyTwoFactorSetup(code);
    if (result.ok) {
      trustDevice(uid);
      // Muestra los códigos de respaldo antes de entrar (solo se ven una vez).
      const backupView = document.getElementById("totpSetupBackupView");
      const codesGrid  = document.getElementById("totpSetupBackupCodes");
      const ack        = document.getElementById("totpSetupBackupAck");
      const continueBtn = document.getElementById("totpSetupBackupContinue");
      if (backupView && (result.backupCodes || []).length) {
        renderBackupCodes(result.backupCodes, codesGrid);
        wireBackupCodeActions(
          result.backupCodes,
          document.getElementById("totpSetupBackupCopy"),
          document.getElementById("totpSetupBackupDownload"),
        );
        content.classList.add("hidden");
        backupView.classList.remove("hidden");
        ack.checked = false;
        continueBtn.disabled = true;
        ack.onchange = () => { continueBtn.disabled = !ack.checked; };
        continueBtn.onclick = () => { goApp(); };
      } else {
        msg.textContent = "✓ 2FA activado. Redirigiendo…";
        msg.className = "totp-setup-msg form-message success";
        setTimeout(() => { goApp(); }, 900);
      }
      return;
    }

    msg.textContent = result.error || "Código incorrecto.";
    msg.className = "totp-setup-msg form-message error";
    boxes.forEach(b => { b.value = ""; b.classList.add("otp-box--error"); });
    verifyBtn.textContent = "Activar y continuar";
    verifyBtn.disabled = true;
    boxes[0].focus();
  };

  logoutBtn.onclick = async () => {
    try { await window.BlackPortfolioAuth.firebaseAuth.signOut(); } catch {}
    sessionStorage.removeItem("totp_verified");
    window.location.reload();
  };
}
