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

  const paymentConfig = {
    stripe: { provider: "Stripe", endpoint: "/api/billing/stripe/create-checkout-session", mode: "subscription" },
    custom: { provider: "Gateway propio", endpoint: "/api/billing/custom/checkout", mode: "custom" }
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

  function setExtra(uid, data) {
    try {
      localStorage.setItem(EXTRA_KEY + uid, JSON.stringify({ ...getExtra(uid), ...data }));
    } catch {}
  }

  function buildSession(user) {
    if (!user) return null;
    const extra = getExtra(user.uid);
    return {
      id: user.uid,
      fullName: user.displayName || extra.fullName || "Usuario",
      email: user.email,
      selectedPlan: extra.selectedPlan || "Advisor Pro",
      isDemo: extra.isDemo || false,
      checkoutReady: extra.checkoutReady || false,
      createdAt: extra.createdAt || new Date().toISOString()
    };
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

  async function authenticate(email, password) {
    try {
      const result = await firebaseAuth.signInWithEmailAndPassword(email, password);
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
      setExtra(user.uid, {
        fullName: payload.fullName,
        selectedPlan: payload.selectedPlan,
        checkoutReady: false,
        isDemo: false,
        createdAt: new Date().toISOString()
      });
      return buildSession(user);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") throw new Error("Ya existe una cuenta con ese correo.");
      if (err.code === "auth/weak-password") throw new Error("La contrasena debe tener al menos 6 caracteres.");
      throw new Error("Error al crear la cuenta. Intenta de nuevo.");
    }
  }

  async function authenticateWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      const result = await firebaseAuth.signInWithPopup(provider);
      const user = result.user;
      const isNew = result.additionalUserInfo?.isNewUser;
      if (isNew) {
        setExtra(user.uid, {
          fullName: user.displayName,
          selectedPlan: "Advisor Pro",
          checkoutReady: false,
          isDemo: false,
          createdAt: new Date().toISOString()
        });
      }
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
    if (newPassword.length < 6) return { ok: false, error: "La contrasena debe tener al menos 6 caracteres." };
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

  window.BlackPortfolioAuth = {
    firebaseAuth,
    db,
    paymentConfig,
    demoCredentials,
    buildSession,
    getSession,
    setSession: () => {},
    clearSession,
    ensureDemoUser,
    createUser,
    authenticate,
    authenticateWithGoogle,
    sanitizeSession: (u) => u,
    checkLockout: () => ({ locked: false, remainingMs: 0, attempts: 0 }),
    touchActivity: () => {},
    changePassword,
    markCheckoutReady,
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
    toast.innerHTML =
      `<span class="bp-toast-icon">${ICONS[type] ?? ICONS.info}</span>` +
      `<span class="bp-toast-text">${message}</span>`;
    c.appendChild(toast);

    function dismiss() {
      toast.classList.add("toast-hiding");
      toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    }

    const timer = setTimeout(dismiss, duration);
    toast.addEventListener("click", () => { clearTimeout(timer); dismiss(); });
  };
})();
