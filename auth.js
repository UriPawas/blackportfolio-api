(function attachBlackPortfolioAuth() {
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyC4MLLdR6N_8Kt9kpKylpVhtACmCH7yqXw",
    authDomain: "portify-6467f.firebaseapp.com",
    projectId: "portify-6467f",
    storageBucket: "portify-6467f.firebasestorage.app",
    messagingSenderId: "875656821131",
    appId: "1:875656821131:web:98b9c8d35b8cd46366978e"
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  const firebaseAuth = firebase.auth();
  const db = (typeof firebase !== "undefined" && firebase.firestore) ? firebase.firestore() : null;

  const EXTRA_KEY = "bp-extra-";
  const DEMO_ENSURED_KEY = "bp-demo-ok";
  const PLAN_ALIASES = { Free: "Explorer", "Institutional Desk": "Wealth Desk" };
  const normalizePlan = (plan) => {
    const canonical = PLAN_ALIASES[plan] || plan;
    return ["Explorer", "Investor", "Advisor Pro", "Wealth Desk"].includes(canonical)
      ? canonical
      : "Explorer";
  };

  // ── Backend (Railway) — el 2FA se verifica server-side ──────────────────────
  const _IS_LOCAL = location.hostname === "127.0.0.1" || location.hostname === "localhost";
  const API_BASE = (_IS_LOCAL
    ? "http://127.0.0.1:8000"
    : "https://blackportfolio-api-production.up.railway.app") + "/api";
  const TWOFA_TOKEN_KEY = "bp-2fa-token";

  // Llama al backend con el ID token de Firebase. Devuelve { _status, ...json }.
  async function _2faApi(path, method, body) {
    const user = firebaseAuth.currentUser;
    if (!user) return { _status: 0, detail: "no_auth" };
    let idToken;
    try { idToken = await user.getIdToken(); }
    catch { return { _status: 0, detail: "no_token" }; }
    try {
      const res = await fetch(API_BASE + path, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      return { _status: res.status, ...data };
    } catch {
      return { _status: 0, detail: "network" };
    }
  }

  // Migra el secreto TOTP heredado (doc Firestore legible por el cliente) al backend.
  async function _migrateLegacyTotp(uid) {
    if (!db) return false;
    try {
      const doc = await db.collection("users").doc(uid).get();
      const d = doc.exists ? doc.data() : null;
      const secret = d && d.totpEnabled === true ? d.totpSecret : null;
      if (!secret) return false;
      const r = await _2faApi("/2fa/migrate", "POST", { secret });
      if (r._status === 200 && r.ok) {
        // Borra el secreto de Firestore: el backend es ahora la única fuente.
        db.collection("users").doc(uid)
          .set({ totpSecret: null, totpPendingSecret: null }, { merge: true })
          .catch(() => {});
        return true;
      }
      return false;
    } catch { return false; }
  }

  const paymentConfig = {
    stripe: { provider: "Stripe", endpoint: "/api/billing/stripe/create-checkout-session", mode: "subscription" },
    custom: { provider: "Transferencia / SPEI", endpoint: "/api/billing/spei/checkout", mode: "manual" }
  };

  const demoCredentials = {
    fullName: "Demo Investor",
    email: "demo@blackportfolio.ai",
    password: "Black2026!",
    selectedPlan: "Advisor Pro"
  };

  function getExtra(uid) {
    try { return JSON.parse(localStorage.getItem(EXTRA_KEY + uid)) ?? {}; }
    catch { return {}; }
  }

  // Escribe en el cache localStorage y replica el perfil al backend (Postgres
  // app_users.profile_data) en segundo plano. Solo replica para el usuario actual.
  function setExtra(uid, data) {
    try {
      const merged = { ...getExtra(uid), ...data };
      localStorage.setItem(EXTRA_KEY + uid, JSON.stringify(merged));
      const cur = firebaseAuth.currentUser;
      if (cur && cur.uid === uid) {
        _2faApi("/account/profile", "PATCH", data);
      }
    } catch {}
  }

  // Al iniciar sesión: trae el perfil del backend (Postgres) y lo sincroniza al
  // cache local. Si el servidor aún no tiene perfil (usuario previo a la migración),
  // sube el blob local — preservando los datos existentes.
  async function syncFromFirestore(uid) {
    const cur = firebaseAuth.currentUser;
    if (!cur || cur.uid !== uid) return;
    try {
      const r = await _2faApi("/account/profile", "GET");
      if (r._status !== 200) return;
      const { _status, plan, selectedPlan, ...profile } = r;
      const serverPlan = normalizePlan(selectedPlan || plan);
      const local = getExtra(uid);
      const serverEmpty = !profile.createdAt;
      if (serverEmpty && Object.keys(local).length > 0) {
        const safeLocal = { ...local };
        ["plan", "selectedPlan", "checkoutReady", "stripeCustomerId",
          "stripeSubscriptionId", "billingStatus"].forEach(key => delete safeLocal[key]);
        await _2faApi("/account/profile", "PATCH", safeLocal);
      }
      localStorage.setItem(EXTRA_KEY + uid, JSON.stringify({
        ...local,
        ...profile,
        selectedPlan: serverPlan,
        checkoutReady: profile.billingStatus === "active"
      }));
    } catch (_) {}
  }

  function buildSession(user) {
    if (!user) return null;
    const extra = getExtra(user.uid);
    const isGoogle = (user.providerData || []).some(p => p.providerId === "google.com");
    return {
      id: user.uid,
      fullName: user.displayName || extra.fullName || "Usuario",
      email: user.email,
      selectedPlan: normalizePlan(extra.selectedPlan),
      isDemo: extra.isDemo || false,
      checkoutReady: extra.checkoutReady || false,
      billingStatus: extra.billingStatus || null,
      billingCycle: extra.billingCycle || null,
      billingCurrentPeriodEnd: extra.billingCurrentPeriodEnd || null,
      createdAt: extra.createdAt || new Date().toISOString(),
      isGoogle,
      photoURL: isGoogle ? user.photoURL : null,
      avatarId: extra.avatarId || "1"
    };
  }

  function setAvatar(avatarId) {
    const user = firebaseAuth.currentUser;
    if (user) setExtra(user.uid, { avatarId });
  }

  function getInvestorProfile() {
    const user = firebaseAuth.currentUser;
    return user ? getExtra(user.uid).investorProfile || null : null;
  }

  async function saveInvestorProfile(profile) {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error("No hay una sesion activa.");
    const data = { investorProfile: profile };
    const merged = { ...getExtra(user.uid), ...data };
    localStorage.setItem(EXTRA_KEY + user.uid, JSON.stringify(merged));
    await _2faApi("/account/profile", "PATCH", data);
    return profile;
  }

  function getSession() {
    return buildSession(firebaseAuth.currentUser);
  }

  function clearSession() {
    return firebaseAuth.signOut();
  }

  async function ensureDemoUser() {
    if (localStorage.getItem(DEMO_ENSURED_KEY)) return;
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_CONFIG.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: demoCredentials.email,
            password: demoCredentials.password,
            returnSecureToken: false
          })
        }
      );
      const data = await res.json();
      if (data.localId) {
        setExtra(data.localId, {
          fullName: demoCredentials.fullName,
          selectedPlan: demoCredentials.selectedPlan,
          checkoutReady: true,
          isDemo: true,
          createdAt: "2026-04-11T00:00:00.000Z"
        });
      }
    } catch {}
    localStorage.setItem(DEMO_ENSURED_KEY, "1");
  }

  async function writeLastSeen(uid) {
    const cur = firebaseAuth.currentUser;
    if (!cur || cur.uid !== uid) return;
    try { _2faApi("/account/profile", "PATCH", { lastSeen: new Date().toISOString() }); } catch {}
  }

  async function authenticate(email, password) {
    try {
      const result = await firebaseAuth.signInWithEmailAndPassword(email, password);
      await syncFromFirestore(result.user.uid);
      writeLastSeen(result.user.uid);
      return { ok: true, user: buildSession(result.user) };
    } catch (err) {
      const c = err.code;
      if (c === "auth/user-not-found" || c === "auth/wrong-password" || c === "auth/invalid-credential" || c === "auth/invalid-email") {
        return { ok: false, error: "Correo o contrasena incorrectos." };
      }
      if (c === "auth/too-many-requests") {
        return { ok: false, error: "Demasiados intentos. Intenta mas tarde.", locked: true, remainingMs: 15 * 60 * 1000 };
      }
      return { ok: false, error: "Error al iniciar sesion. Intenta de nuevo." };
    }
  }

  async function createUser(payload) {
    try {
      const result = await firebaseAuth.createUserWithEmailAndPassword(payload.email, payload.password);
      const user = result.user;
      await user.updateProfile({ displayName: payload.fullName });
      // Envía el correo de verificación (best-effort: no bloquea el alta si falla).
      try { await user.sendEmailVerification(); } catch (e) { console.warn("No se pudo enviar verificación:", e); }
      const requestedPlan = normalizePlan(payload.selectedPlan);
      const userData = {
        fullName: payload.fullName,
        email: payload.email,
        selectedPlan: "Explorer",
        requestedPlan,
        checkoutReady: false,
        isDemo: false,
        createdAt: new Date().toISOString()
      };
      try { localStorage.setItem(EXTRA_KEY + user.uid, JSON.stringify(userData)); } catch {}
      await _2faApi("/account/profile", "PATCH", userData);
      return buildSession(user);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") throw new Error("Ya existe una cuenta con ese correo.");
      if (err.code === "auth/weak-password") throw new Error("La contrasena debe tener al menos 6 caracteres.");
      throw new Error("Error al crear la cuenta. Intenta de nuevo.");
    }
  }

  async function resendEmailVerification() {
    const user = firebaseAuth.currentUser;
    if (!user) return { ok: false, error: "No autenticado." };
    if (user.emailVerified) return { ok: false, error: "Tu correo ya está verificado." };
    try {
      await user.sendEmailVerification();
      return { ok: true };
    } catch (err) {
      if (err.code === "auth/too-many-requests") {
        return { ok: false, error: "Demasiados intentos. Espera unos minutos." };
      }
      return { ok: false, error: "No se pudo enviar el correo. Intenta de nuevo." };
    }
  }

  async function authenticateWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      const result = await firebaseAuth.signInWithPopup(provider);
      const user = result.user;
      const isNew = result.additionalUserInfo?.isNewUser;
      if (isNew) {
        const googleUserData = {
          fullName: user.displayName,
          email: user.email,
          selectedPlan: "Explorer",
          checkoutReady: false,
          isDemo: false,
          createdAt: new Date().toISOString()
        };
        try { localStorage.setItem(EXTRA_KEY + user.uid, JSON.stringify(googleUserData)); } catch {}
        await _2faApi("/account/profile", "PATCH", googleUserData);
      } else {
        await syncFromFirestore(user.uid);
      }
      writeLastSeen(user.uid);
      return { ok: true, user: buildSession(user), isNew };
    } catch (err) {
      const c = err.code;
      if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") {
        return { ok: false, error: "Inicio de sesion cancelado." };
      }
      return { ok: false, error: "Error al iniciar sesion con Google." };
    }
  }

  async function changePassword(email, currentPassword, newPassword) {
    const user = firebaseAuth.currentUser;
    if (!user) return { ok: false, error: "No autenticado." };
    if (newPassword.length < 8) return { ok: false, error: "La contrasena debe tener al menos 8 caracteres." };
    try {
      const cred = firebase.auth.EmailAuthProvider.credential(email, currentPassword);
      await user.reauthenticateWithCredential(cred);
      await user.updatePassword(newPassword);
      return { ok: true };
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        return { ok: false, error: "La contrasena actual es incorrecta." };
      }
      return { ok: false, error: "Error al cambiar la contrasena." };
    }
  }

  function markCheckoutReady() {
    const user = firebaseAuth.currentUser;
    if (user) setExtra(user.uid, { checkoutReady: true });
  }

  // Refleja en el cache local el plan confirmado server-side (Postgres es la fuente
  // de verdad). No escribe selectedPlan a Firestore: las reglas lo bloquean.
  function setPlan(plan) {
    const user = firebaseAuth.currentUser;
    if (!user || !plan) return;
    try {
      const merged = { ...getExtra(user.uid), selectedPlan: normalizePlan(plan), checkoutReady: true };
      localStorage.setItem(EXTRA_KEY + user.uid, JSON.stringify(merged));
    } catch {}
  }

  // ── Two-Factor Auth (TOTP / Google Authenticator) ────────────────────────
  // El secreto vive SOLO en el backend (PostgreSQL) y la verificación ocurre
  // server-side. El navegador nunca ve ni valida el secreto. Tras verificar, el
  // backend emite un token de sesión 2FA que se exige en los endpoints de datos.

  function _b32Encode(buf) {
    const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let out = "", bits = 0, val = 0;
    for (let i = 0; i < buf.length; i++) {
      val = (val << 8) | buf[i];
      bits += 8;
      while (bits >= 5) { out += alpha[(val >>> (bits - 5)) & 31]; bits -= 5; }
    }
    if (bits > 0) out += alpha[(val << (5 - bits)) & 31];
    return out;
  }

  function _b32Decode(s) {
    const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const bytes = [];
    let bits = 0, val = 0;
    for (const c of s.toUpperCase().replace(/[^A-Z2-7]/g, "")) {
      val = (val << 5) | alpha.indexOf(c);
      bits += 5;
      if (bits >= 8) { bytes.push((val >>> (bits - 8)) & 255); bits -= 8; }
    }
    return new Uint8Array(bytes);
  }

  async function _computeTotp(secret, counter) {
    const key = await crypto.subtle.importKey(
      "raw", _b32Decode(secret).buffer,
      { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
    );
    const buf = new ArrayBuffer(8);
    new DataView(buf).setUint32(4, counter, false);
    const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
    const off = hmac[hmac.length - 1] & 0xf;
    const code = ((hmac[off] & 0x7f) << 24) | (hmac[off+1] << 16) | (hmac[off+2] << 8) | hmac[off+3];
    return String(code % 1_000_000).padStart(6, "0");
  }

  async function _checkTotp(secret, token) {
    const t = Math.floor(Date.now() / 30000);
    for (const d of [0, -1, 1]) {
      if (await _computeTotp(secret, t + d) === token) return true;
    }
    return false;
  }

  async function setupTwoFactor() {
    const r = await _2faApi("/2fa/setup", "POST");
    if (r._status === 200 && r.otpauthUri) {
      return { ok: true, otpauthUri: r.otpauthUri, manualKey: r.manualKey };
    }
    return { ok: false, error: r.detail || "No se pudo iniciar la configuración de 2FA." };
  }

  async function verifyTwoFactorSetup(token) {
    const r = await _2faApi("/2fa/verify-setup", "POST", { code: token });
    if (r._status === 200 && r.ok) {
      if (r.token) sessionStorage.setItem(TWOFA_TOKEN_KEY, r.token);
      return { ok: true };
    }
    return { ok: false, error: r.detail || "Código incorrecto. Intenta de nuevo." };
  }

  async function verifyTwoFactor(token) {
    const r = await _2faApi("/2fa/verify", "POST", { code: token });
    if (r._status === 200 && r.valid) {
      if (r.token) sessionStorage.setItem(TWOFA_TOKEN_KEY, r.token);
      return { valid: true };
    }
    return { valid: false, error: r.detail || "Código incorrecto. Comprueba la app e intenta de nuevo." };
  }

  async function disableTwoFactor(token) {
    const r = await _2faApi("/2fa/disable", "POST", { code: token });
    if (r._status === 200 && r.ok) {
      sessionStorage.removeItem(TWOFA_TOKEN_KEY);
      return { ok: true };
    }
    return { ok: false, error: r.detail || "Código incorrecto. Intenta de nuevo." };
  }

  async function isTwoFactorEnabled(uid) {
    const r = await _2faApi("/2fa/status", "GET");
    if (r._status === 200 && typeof r.enabled === "boolean") {
      if (r.enabled) return true;
      // Sin credencial en el backend: intenta migrar un secreto heredado de Firestore.
      return await _migrateLegacyTotp(uid);
    }
    // Backend inalcanzable: cae al flag heredado para no bloquear el acceso.
    return getExtra(uid).totpEnabled === true;
  }

  // ── 2FA email fallback (Firebase passwordless sign-in link) ────────────────
  // For users who lost their authenticator: send a one-time sign-in link to
  // their email. Clicking it proves email ownership and completes the 2FA gate.
  // Works on the free Spark plan — no Cloud Functions or SMTP needed.
  const EMAIL_FOR_SIGNIN_KEY = "bp-email-for-signin";

  async function sendRecoveryEmailLink() {
    const user = firebaseAuth.currentUser;
    if (!user || !user.email) {
      return { ok: false, error: "Tu cuenta no tiene un correo asociado." };
    }
    try {
      await firebaseAuth.sendSignInLinkToEmail(user.email, {
        url: window.location.origin + window.location.pathname,
        handleCodeInApp: true,
      });
      localStorage.setItem(EMAIL_FOR_SIGNIN_KEY, user.email);
      return { ok: true, email: user.email };
    } catch (err) {
      return { ok: false, error: err.message || "No se pudo enviar el enlace." };
    }
  }

  function isEmailSignInLink() {
    try { return firebaseAuth.isSignInWithEmailLink(window.location.href); }
    catch { return false; }
  }

  async function completeEmailSignInLink() {
    try {
      let email = localStorage.getItem(EMAIL_FOR_SIGNIN_KEY);
      if (!email) email = window.prompt("Confirma tu correo para completar el acceso:");
      if (!email) return { ok: false, error: "Correo requerido para continuar." };
      const result = await firebaseAuth.signInWithEmailLink(email, window.location.href);
      localStorage.removeItem(EMAIL_FOR_SIGNIN_KEY);
      return { ok: true, uid: result.user.uid };
    } catch (err) {
      return { ok: false, error: err.message || "Enlace inválido o expirado." };
    }
  }

  // ── Session Timeout por Inactividad ──────────────────────────────────────────
  const INACTIVITY_MS      = 15 * 60 * 1000; // 15 minutos
  const WARNING_MS         =  1 * 60 * 1000; // aviso 1 min antes
  const ACTIVITY_EVENTS    = ["mousemove", "keydown", "mousedown", "touchstart", "scroll", "click"];
  const LAST_ACTIVITY_KEY  = "bp-last-activity";

  let _inactivityTimer  = null;
  let _warningTimer     = null;
  let _warningToastEl   = null;

  function _dismissWarningToast() {
    if (_warningToastEl) {
      _warningToastEl.click();
      _warningToastEl = null;
    }
  }

  function _clearTimers() {
    clearTimeout(_inactivityTimer);
    clearTimeout(_warningTimer);
    _inactivityTimer = null;
    _warningTimer    = null;
  }

  function _doLogout() {
    _clearTimers();
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, _onActivity));
    firebaseAuth.signOut().then(() => { window.location.href = "login.html"; });
  }

  function _onActivity() {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now());
    _dismissWarningToast();
    _clearTimers();
    _warningTimer = setTimeout(() => {
      if (typeof window.showToast === "function") {
        // showToast devuelve el elemento toast — guardamos referencia para poder descartarlo
        const c = document.getElementById("toast-container");
        window.showToast("Tu sesión cerrará en 1 minuto por inactividad.", "info", WARNING_MS - 2000);
        if (c) _warningToastEl = c.lastElementChild;
      }
    }, INACTIVITY_MS - WARNING_MS);
    _inactivityTimer = setTimeout(_doLogout, INACTIVITY_MS);
  }

  function startSessionTimeout() {
    // Si el usuario reabre la página tras inactividad > 15 min, cerrar sesión inmediatamente
    const last = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || "0", 10);
    if (last > 0 && Date.now() - last >= INACTIVITY_MS) {
      _doLogout();
      return;
    }
    _clearTimers();
    ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, _onActivity));
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, _onActivity, { passive: true }));
    _onActivity(); // arranca el primer ciclo
  }

  function stopSessionTimeout() {
    _clearTimers();
    _dismissWarningToast();
    ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, _onActivity));
  }

  window.BlackPortfolioAuth = {
    firebaseAuth,
    db,
    paymentConfig,
    buildSession,
    getSession,
    setSession: () => {},
    clearSession,
    ensureDemoUser,
    createUser,
    authenticate,
    authenticateWithGoogle,
    syncFromFirestore,
    sanitizeSession: (u) => u,
    checkLockout: () => ({ locked: false, remainingMs: 0, attempts: 0 }),
    touchActivity: () => {},
    changePassword,
    resendEmailVerification,
    markCheckoutReady,
    setPlan,
    setExtra,
    setAvatar,
    getInvestorProfile,
    saveInvestorProfile,
    setupTwoFactor,
    verifyTwoFactorSetup,
    verifyTwoFactor,
    disableTwoFactor,
    isTwoFactorEnabled,
    sendRecoveryEmailLink,
    isEmailSignInLink,
    completeEmailSignInLink,
    startSessionTimeout,
    stopSessionTimeout,
    getUsers: () => [],
    setUsers: () => {}
  };
})();

// ── Toast Notification System ─────────────────────────────────────────────────
(function initToastSystem() {
  const ICONS = { success: "✓", error: "✕", info: "●" };
  let container = null;

  function getContainer() {
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }
    return container;
  }

  window.showToast = function showToast(message, type = "info", duration = 4000) {
    const c = getContainer();
    const toast = document.createElement("div");
    toast.className = `bp-toast toast-${type}`;
    const iconSpan = document.createElement("span");
    iconSpan.className = "bp-toast-icon";
    iconSpan.textContent = ICONS[type] ?? ICONS.info;
    const textSpan = document.createElement("span");
    textSpan.className = "bp-toast-text";
    textSpan.textContent = message;
    toast.appendChild(iconSpan);
    toast.appendChild(textSpan);
    c.appendChild(toast);

    function dismiss() {
      toast.classList.add("toast-hiding");
      toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    }

    const timer = setTimeout(dismiss, duration);
    toast.addEventListener("click", () => { clearTimeout(timer); dismiss(); });
  };
})();
