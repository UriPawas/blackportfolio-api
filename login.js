const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const submitButton = loginForm.querySelector("button[type='submit']");
const googleLoginBtn = document.getElementById("googleLoginBtn");

let failedAttempts = 0;

function showLoginMessage(text, type) {
  loginMessage.textContent = text;
  loginMessage.className = `form-message ${type}`;
}

function maybeShowForgotHint() {
  if (failedAttempts < 2) return;
  if (document.getElementById("forgotHint")) return;
  const hint = document.createElement("p");
  hint.id = "forgotHint";
  hint.style.cssText = "margin:8px 0 0;font-size:0.84rem;color:var(--muted,#8fa3b1);";
  hint.innerHTML = `¿Olvidaste tu contrasena? <a href="index.html#register" style="color:#6f86ff;text-decoration:underline;">Crea una cuenta nueva</a> o contacta soporte.`;
  loginMessage.insertAdjacentElement("afterend", hint);
}

// Redirect if already authenticated
window.BlackPortfolioAuth.firebaseAuth.onAuthStateChanged(user => {
  if (user) window.location.href = "main.html";
});

// Ensure demo user exists in Firebase
window.BlackPortfolioAuth.ensureDemoUser();

// Google login — with loading state
googleLoginBtn.addEventListener("click", async () => {
  const span = googleLoginBtn.querySelector("span");
  const original = span.textContent;
  googleLoginBtn.classList.add("is-loading");
  googleLoginBtn.disabled = true;
  span.textContent = "Abriendo Google…";

  const result = await window.BlackPortfolioAuth.authenticateWithGoogle();

  googleLoginBtn.classList.remove("is-loading");
  googleLoginBtn.disabled = false;
  span.textContent = original;

  if (!result.ok) {
    showLoginMessage(result.error, "error");
    return;
  }
  showLoginMessage(`Bienvenido, ${result.user.fullName}. Redirigiendo...`, "success");
  setTimeout(() => { window.location.href = "main.html"; }, 800);
});

// Email/password login
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitButton.disabled = true;

  const formData = new FormData(loginForm);
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const result = await window.BlackPortfolioAuth.authenticate(email, password);

  if (!result.ok) {
    failedAttempts++;
    showLoginMessage(result.error, "error");
    maybeShowForgotHint();
    submitButton.disabled = false;
    return;
  }

  failedAttempts = 0;
  document.getElementById("forgotHint")?.remove();
  showLoginMessage(`Bienvenido, ${result.user.fullName}. Redirigiendo...`, "success");
  setTimeout(() => { window.location.href = "main.html"; }, 800);
});

// ── Inline validation for login fields ───────────────────────────────────────
(function initLoginInlineValidation() {
  const FIELD_MESSAGES = {
    loginEmail:    "Ingresa un correo electronico valido.",
    loginPassword: "Por favor ingresa tu contrasena."
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
