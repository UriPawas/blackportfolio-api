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

// ── Beta cerrada: aviso al llegar redirigido desde la app ────────────────────
if (new URLSearchParams(window.location.search).get("beta") === "closed") {
  showLoginMessage(
    "BlackPortfolio está en beta cerrada. Tu correo aún no tiene acceso — escríbenos para solicitar una invitación.",
    "error"
  );
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

// ── 2FA recovery: returning from the email sign-in link ─────────────────────
if (window.BlackPortfolioAuth.isEmailSignInLink()) {
  _loginFlowActive = true;
  showLoginMessage("Verificando tu enlace de acceso…", "info");
  window.BlackPortfolioAuth.completeEmailSignInLink().then(async res => {
    if (res.ok) {
      const enabled = await window.BlackPortfolioAuth.isTwoFactorEnabled(res.uid);
      if (!enabled) { _loginFlowActive = true; showSetupOverlay(res.uid); return; }
      trustDevice(res.uid);
      window.location.replace("main.html");
    } else {
      _loginFlowActive = false;
      showLoginMessage(res.error || "No se pudo completar el acceso por enlace.", "error");
    }
  });
}

// ── Redirect if already authenticated (with 2FA gate) ───────────────────────
window.BlackPortfolioAuth.firebaseAuth.onAuthStateChanged(async user => {
  if (!user || _loginFlowActive) return;
  // If this device is trusted (verified within the last ~3.5 days), skip 2FA
  if (isDeviceTrusted(user.uid)) {
    trustDevice(user.uid); // refresh the window so active users stay trusted
    window.location.href = "main.html";
    return;
  }
  // Demo user bypasses 2FA
  const extra = JSON.parse(localStorage.getItem("bp-extra-" + user.uid) || "{}");
  if (extra.isDemo) {
    sessionStorage.setItem("totp_verified", user.uid);
    window.location.href = "main.html";
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
    setTimeout(() => { window.location.href = "main.html"; }, 800);
    return;
  }

  const enabled = await window.BlackPortfolioAuth.isTwoFactorEnabled(session.id);
  if (!enabled) {
    showLoginMessage("", "");
    showSetupOverlay(session.id);
    return;
  }

  // Trusted device within the ~3.5-day window: skip the code entirely
  if (isDeviceTrusted(session.id)) {
    trustDevice(session.id);
    showLoginMessage(`Bienvenido, ${session.fullName}. Redirigiendo...`, "success");
    setTimeout(() => { window.location.href = "main.html"; }, 600);
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

  const result = await window.BlackPortfolioAuth.authenticateWithGoogle();

  googleLoginBtn.classList.remove("is-loading");
  googleLoginBtn.disabled = false;
  span.textContent = original;

  if (!result.ok) {
    _loginFlowActive = false;
    showLoginMessage(result.error, "error");
    return;
  }

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
});

// ── Email/password login ─────────────────────────────────────────────────────
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  _loginFlowActive = true;

  const formData = new FormData(loginForm);
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const result = await window.BlackPortfolioAuth.authenticate(email, password);

  if (!result.ok) {
    _loginFlowActive = false;
    failedAttempts++;
    showLoginMessage(result.error, "error");
    maybeShowForgotHint();
    submitButton.disabled = false;
    return;
  }

  failedAttempts = 0;
  document.getElementById("forgotHint")?.remove();
  await handlePostAuth(result.user);
  submitButton.disabled = false;
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

// ── OTP Overlay ──────────────────────────────────────────────────────────────
function showOtpOverlay(uid) {
  const overlay  = document.getElementById("otpOverlay");
  const grid     = document.getElementById("otpGrid");
  const verifyBtn = document.getElementById("otpVerifyBtn");
  const clearBtn  = document.getElementById("otpClearBtn");
  const errorMsg  = document.getElementById("otpError");
  const fallbackBtn = document.getElementById("otpEmailFallbackBtn");
  const fallbackMsg = document.getElementById("otpFallbackMsg");
  const boxes     = Array.from(grid.querySelectorAll(".otp-box"));

  overlay.classList.remove("hidden");
  boxes[0].focus();

  function getCode() { return boxes.map(b => b.value).join(""); }

  function syncVerifyBtn() {
    const complete = boxes.every(b => b.value !== "");
    verifyBtn.disabled = !complete;
    boxes.forEach(b => b.classList.toggle("otp-box--complete", complete));
  }

  function clearError() {
    errorMsg.textContent = "";
    errorMsg.classList.add("hidden");
    boxes.forEach(b => b.classList.remove("otp-box--error"));
  }

  boxes.forEach((box, i) => {
    box.addEventListener("input", e => {
      // Accept only digit
      box.value = box.value.replace(/\D/g, "").slice(-1);
      clearError();
      if (box.value && i < 5) boxes[i + 1].focus();
      syncVerifyBtn();
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
      syncVerifyBtn();
      const nextEmpty = boxes.findIndex(b => !b.value);
      (nextEmpty === -1 ? boxes[5] : boxes[nextEmpty]).focus();
    });
  });

  clearBtn.addEventListener("click", () => {
    boxes.forEach(b => { b.value = ""; b.classList.remove("otp-box--complete", "otp-box--error"); });
    clearError();
    syncVerifyBtn();
    boxes[0].focus();
  });

  verifyBtn.addEventListener("click", async () => {
    const code = getCode();
    verifyBtn.disabled = true;
    verifyBtn.textContent = "Verificando…";
    clearError();

    const result = await window.BlackPortfolioAuth.verifyTwoFactor(code);

    if (result.valid) {
      trustDevice(uid);
      verifyBtn.textContent = "✓ Verificado";
      verifyBtn.classList.add("otp-verify-btn--success");
      setTimeout(() => { window.location.href = "main.html"; }, 600);
      return;
    }

    errorMsg.textContent = result.error || "Código incorrecto. Comprueba la app y vuelve a intentarlo.";
    errorMsg.classList.remove("hidden");
    boxes.forEach(b => b.classList.add("otp-box--error"));
    boxes.forEach(b => { b.value = ""; });
    verifyBtn.textContent = "Verificar código";
    verifyBtn.disabled = true;
    boxes[0].focus();
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
  loading.classList.remove("hidden");
  content.classList.add("hidden");

  window.BlackPortfolioAuth.setupTwoFactor().then(result => {
    loading.classList.add("hidden");
    content.classList.remove("hidden");
    if (!result.ok) {
      msg.textContent = "Error al generar el QR. Recarga la página e intenta de nuevo.";
      msg.className = "totp-setup-msg form-message error";
      return;
    }
    if (typeof QRCode !== "undefined") {
      QRCode.toDataURL(result.otpauthUri, { width: 200, margin: 2 }, function(err, url) {
        qrImg.src = err ? "" : url;
      });
    } else {
      qrImg.style.display = "none";
    }
    manualKey.textContent = result.manualKey;
  });

  function clearError() { msg.textContent = ""; msg.className = "totp-setup-msg"; boxes.forEach(b => b.classList.remove("otp-box--error")); }
  function syncBtn() { verifyBtn.disabled = !boxes.every(b => b.value !== ""); }

  boxes.forEach((box, i) => {
    box.addEventListener("input", () => {
      box.value = box.value.replace(/\D/g, "").slice(-1);
      clearError();
      if (box.value && i < 5) boxes[i + 1].focus();
      syncBtn();
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
    });
  });

  verifyBtn.onclick = async () => {
    const code = boxes.map(b => b.value).join("");
    verifyBtn.disabled = true;
    verifyBtn.textContent = "Verificando…";

    const result = await window.BlackPortfolioAuth.verifyTwoFactorSetup(code);
    if (result.ok) {
      trustDevice(uid);
      msg.textContent = "✓ 2FA activado. Redirigiendo…";
      msg.className = "totp-setup-msg form-message success";
      setTimeout(() => { window.location.href = "main.html"; }, 900);
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
