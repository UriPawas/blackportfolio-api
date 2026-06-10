const billingSwitch = document.getElementById("billingSwitch");
const prices = document.querySelectorAll(".price");
const priceLabels = document.querySelectorAll(".price-label");
const planButtons = document.querySelectorAll(".select-plan");
const paymentButtons = document.querySelectorAll(".pay-button");
const signupForm = document.getElementById("signupForm");
const selectedPlanInput = document.getElementById("selectedPlan");
const formMessage = document.getElementById("formMessage");
const accountStatus = document.getElementById("accountStatus");
const accountPlan = document.getElementById("accountPlan");
const accountCount = document.getElementById("accountCount");
const checkoutState = document.getElementById("checkoutState");
const paymentModal = document.getElementById("paymentModal");
const paymentDescription = document.getElementById("paymentDescription");
const paymentPayload = document.getElementById("paymentPayload");
const closePaymentModal = document.getElementById("closePaymentModal");
const statusDot = document.querySelector(".status-dot");

function updatePriceDisplay() {
  const yearly = billingSwitch.checked;
  prices.forEach((priceElement) => {
    const value = yearly ? priceElement.dataset.yearly : priceElement.dataset.monthly;
    priceElement.textContent = `$${value}`;
  });

  priceLabels.forEach((label) => {
    label.textContent = yearly ? "USD / mes, facturado anual" : "USD / mes";
  });
}

function syncAccountCard() {
  const users = window.BlackPortfolioAuth.getUsers();
  const session = window.BlackPortfolioAuth.getSession();

  accountCount.textContent = String(users.length);

  if (!session) {
    accountStatus.textContent = "Aun no hay cuenta creada";
    accountPlan.textContent = selectedPlanInput.value;
    checkoutState.textContent = "Pendiente";
    statusDot.style.background = "#ffb547";
    statusDot.style.boxShadow = "0 0 0 4px rgba(255, 181, 71, 0.12)";
    return;
  }

  accountStatus.textContent = `Cuenta activa: ${session.fullName}`;
  accountPlan.textContent = session.selectedPlan;
  checkoutState.textContent = session.checkoutReady ? "Lista" : "Pendiente";
  statusDot.style.background = session.checkoutReady ? "#32d6a2" : "#ffb547";
  statusDot.style.boxShadow = session.checkoutReady
    ? "0 0 0 4px rgba(50, 214, 162, 0.12)"
    : "0 0 0 4px rgba(255, 181, 71, 0.12)";
}

function showFormMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`;
}

function buildCheckoutPayload(gateway) {
  const session = window.BlackPortfolioAuth.getSession();
  const currentPlan = session?.selectedPlan ?? selectedPlanInput.value;
  const providerConfig = window.BlackPortfolioAuth.paymentConfig[gateway];

  return {
    gateway,
    provider: providerConfig.provider,
    endpoint: providerConfig.endpoint,
    billingCycle: billingSwitch.checked ? "yearly" : "monthly",
    plan: currentPlan,
    product: "BlackPortfolio Subscription",
    user: session
      ? {
          id: session.id,
          fullName: session.fullName,
          email: session.email
        }
      : null
  };
}

window.BlackPortfolioPayments = {
  startCheckout({ gateway, plan, user }) {
    return {
      ok: true,
      message: "Hook de checkout listo para enlazar suscripciones con backend real.",
      gateway,
      plan,
      user
    };
  }
};

function openPaymentModal(payload) {
  paymentDescription.textContent =
    `Se genero el objeto base para conectar ${payload.provider}. Aqui puedes invocar tu backend o el SDK del proveedor.`;
  paymentPayload.textContent = JSON.stringify(payload, null, 2);
  paymentModal.classList.remove("hidden");
}

function updateSessionCheckoutReady() {
  const session = window.BlackPortfolioAuth.getSession();
  if (!session) return;
  window.BlackPortfolioAuth.markCheckoutReady();
  syncAccountCard();
}

billingSwitch.addEventListener("change", updatePriceDisplay);

planButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const plan = button.dataset.plan;
    selectedPlanInput.value = plan;
    accountPlan.textContent = plan;
    document.getElementById("register").scrollIntoView({ behavior: "smooth", block: "start" });
    showFormMessage(`Plan ${plan} seleccionado. Completa tu registro para continuar.`, "success");
  });
});

paymentButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const session = window.BlackPortfolioAuth.getSession();
    if (!session) {
      document.getElementById("register").scrollIntoView({ behavior: "smooth", block: "start" });
      showFormMessage("Primero crea una cuenta o haz login para preparar el checkout.", "error");
      return;
    }

    if (session.selectedPlan === "Free") {
      showFormMessage("Tu plan Free no requiere pago. Accede directamente al dashboard.", "success");
      return;
    }

    const gateway = button.dataset.gateway;
    const payload = buildCheckoutPayload(gateway);

    if (gateway === "stripe") {
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = "Preparando pago…";
      const RAILWAY_API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? "http://127.0.0.1:8000"
        : "https://blackportfolio-api-production.up.railway.app";
      try {
        const res = await fetch(`${RAILWAY_API}/api/billing/stripe/create-checkout-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: payload.plan,
            billingCycle: payload.billingCycle,
            user: payload.user
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Error al iniciar el pago");
        }
        const data = await res.json();
        window.location.href = data.url;
      } catch (err) {
        showFormMessage(err.message || "Error al iniciar el pago. Intenta de nuevo.", "error");
        button.disabled = false;
        button.textContent = originalText;
      }
      return;
    }

    const checkoutResult = window.BlackPortfolioPayments.startCheckout({
      gateway,
      plan: payload.plan,
      user: payload.user
    });

    updateSessionCheckoutReady();
    openPaymentModal({ ...payload, checkoutResult });
  });
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(signupForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const newUser = await window.BlackPortfolioAuth.createUser(payload);
    signupForm.reset();
    selectedPlanInput.value = newUser.selectedPlan;
    showFormMessage(`Cuenta creada con éxito para ${newUser.fullName}. Configura tu autenticador para mayor seguridad.`, "success");
    syncAccountCard();
    // Trigger 2FA setup flow for new accounts
    openTotpSetupModal(newUser.id);
  } catch (error) {
    showFormMessage(error.message, "error");
  }
});

// ── 2FA Setup Modal ──────────────────────────────────────────────────────────
function openTotpSetupModal(uid) {
  const modal      = document.getElementById("totpSetupModal");
  const loading    = document.getElementById("totpSetupLoading");
  const content    = document.getElementById("totpSetupContent");
  const qrImg      = document.getElementById("totpQrImg");
  const manualKey  = document.getElementById("totpManualKey");
  const grid       = document.getElementById("totpSetupOtpGrid");
  const verifyBtn  = document.getElementById("totpSetupVerifyBtn");
  const skipBtn    = document.getElementById("totpSetupSkipBtn");
  const msg        = document.getElementById("totpSetupMsg");
  const boxes      = Array.from(grid.querySelectorAll(".otp-box"));

  modal.classList.remove("hidden");
  loading.classList.remove("hidden");
  content.classList.add("hidden");

  window.BlackPortfolioAuth.setupTwoFactor().then(result => {
    loading.classList.add("hidden");
    if (!result.ok) {
      content.classList.remove("hidden");
      msg.textContent = "No se pudo generar el código QR. Configura 2FA desde los Ajustes del dashboard.";
      msg.className = "totp-setup-msg form-message error";
      verifyBtn.disabled = true;
      return;
    }
    // Generate QR code in-browser using cdn.jsdelivr.net/npm/qrcode
    if (typeof QRCode !== "undefined") {
      QRCode.toDataURL(result.otpauthUri, { width: 200, margin: 2 }, function(err, url) {
        qrImg.src = err ? "" : url;
      });
    } else {
      // Fallback: show manual key if QRCode lib not loaded
      qrImg.style.display = "none";
    }
    manualKey.textContent = result.manualKey;
    content.classList.remove("hidden");
  });

  function getCode() { return boxes.map(b => b.value).join(""); }

  function syncBtn() {
    verifyBtn.disabled = !boxes.every(b => b.value !== "");
  }

  function clearError() {
    msg.textContent = "";
    msg.className = "totp-setup-msg";
    boxes.forEach(b => b.classList.remove("otp-box--error"));
  }

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
      const next = boxes.findIndex(b => !b.value);
      (next === -1 ? boxes[5] : boxes[next]).focus();
    });
  });

  verifyBtn.addEventListener("click", async () => {
    const code = getCode();
    verifyBtn.disabled = true;
    verifyBtn.textContent = "Verificando…";
    clearError();

    const result = await window.BlackPortfolioAuth.verifyTwoFactorSetup(code);

    if (result.ok) {
      sessionStorage.setItem("totp_verified", uid);
      msg.textContent = "✓ 2FA activado. Redirigiendo al dashboard…";
      msg.className = "totp-setup-msg form-message success";
      setTimeout(() => { window.location.href = "main.html"; }, 1200);
      return;
    }

    msg.textContent = result.error || "Código incorrecto. Intenta de nuevo.";
    msg.className = "totp-setup-msg form-message error";
    boxes.forEach(b => { b.value = ""; b.classList.add("otp-box--error"); });
    verifyBtn.textContent = "Activar 2FA y acceder al dashboard";
    verifyBtn.disabled = true;
    boxes[0].focus();
  });

  skipBtn.addEventListener("click", () => {
    sessionStorage.setItem("totp_verified", uid);
    modal.classList.add("hidden");
    window.location.href = "main.html";
  });
}

closePaymentModal.addEventListener("click", () => {
  paymentModal.classList.add("hidden");
});

paymentModal.addEventListener("click", (event) => {
  if (event.target === paymentModal) {
    paymentModal.classList.add("hidden");
  }
});

window.BlackPortfolioAuth.ensureDemoUser();
updatePriceDisplay();
syncAccountCard();

// Google Sign-Up via Firebase popup
const googleSignupBtn = document.getElementById("googleSignupBtn");
if (googleSignupBtn) {
  googleSignupBtn.addEventListener("click", async () => {
    const span = googleSignupBtn.querySelector("span");
    const original = span.textContent;
    googleSignupBtn.classList.add("is-loading");
    googleSignupBtn.disabled = true;
    span.textContent = "Abriendo Google…";

    const result = await window.BlackPortfolioAuth.authenticateWithGoogle();

    googleSignupBtn.classList.remove("is-loading");
    googleSignupBtn.disabled = false;
    span.textContent = original;

    if (!result.ok) {
      showFormMessage(result.error, "error");
      return;
    }
    showFormMessage(
      result.isNew
        ? `Cuenta creada con Google para ${result.user.fullName}.`
        : `Bienvenido de vuelta, ${result.user.fullName}.`,
      "success"
    );
    syncAccountCard();
    window.setTimeout(() => { window.location.href = "main.html"; }, 1200);
  });
}

// ── Inline field validation ───────────────────────────────────────────────────
(function initInlineValidation() {
  const FIELD_MESSAGES = {
    fullName: "Por favor ingresa tu nombre completo.",
    email:    "Ingresa un correo electronico valido.",
    password: "La contrasena debe tener al menos 8 caracteres."
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

// ── Theme Toggle ────────────────────────────────────────────────────────────
(function initThemeToggle() {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("bp-theme", theme);
  }

  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(current === "dark" ? "light" : "dark");
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!localStorage.getItem("bp-theme")) {
      applyTheme(e.matches ? "dark" : "light");
    }
  });
})();

// ── Ticker Bar ──────────────────────────────────────────────────────────────
(function initTickerBar() {
  const track = document.getElementById("tickerTrack");
  if (!track) return;

  const SYMBOLS = [
    { symbol: "^GSPC",    label: "S&P 500",    logoUrl: "https://flagcdn.com/w20/us.png",                                                  logoType: "flag",  prefix: "",  forex: false },
    { symbol: "^DJI",     label: "Dow Jones",  logoUrl: "https://flagcdn.com/w20/us.png",                                                  logoType: "flag",  prefix: "",  forex: false },
    { symbol: "^IXIC",    label: "Nasdaq",     logoUrl: "https://flagcdn.com/w20/us.png",                                                  logoType: "flag",  prefix: "",  forex: false },
    { symbol: "AAPL",     label: "AAPL",       logoUrl: "https://cdn.simpleicons.org/apple/ffffff",      logoType: "brand", prefix: "$", forex: false },
    { symbol: "NVDA",     label: "NVDA",       logoUrl: "https://cdn.simpleicons.org/nvidia/76b900",    logoType: "brand", prefix: "$", forex: false },
    { symbol: "MSFT",     label: "MSFT",       logoUrl: "https://cdn.simpleicons.org/microsoft/00a4ef",  logoType: "brand", prefix: "$", forex: false },
    { symbol: "TSLA",     label: "TSLA",       logoUrl: "https://cdn.simpleicons.org/tesla/e31937",     logoType: "brand", prefix: "$", forex: false },
    { symbol: "BTC-USD",  label: "BTC/USD",    logoUrl: "https://cdn.simpleicons.org/bitcoin/f7931a",  logoType: "crypto", prefix: "$", forex: false },
    { symbol: "ETH-USD",  label: "ETH/USD",    logoUrl: "https://cdn.simpleicons.org/ethereum/627eea", logoType: "crypto", prefix: "$", forex: false },
    { symbol: "EURUSD=X", label: "EUR/USD",    logoUrl: "https://flagcdn.com/w20/eu.png",                                                  logoType: "flag",  prefix: "",  forex: true  },
    { symbol: "GBPUSD=X", label: "GBP/USD",    logoUrl: "https://flagcdn.com/w20/gb.png",                                                  logoType: "flag",  prefix: "",  forex: true  },
    { symbol: "USDJPY=X", label: "USD/JPY",    logoUrl: "https://flagcdn.com/w20/jp.png",                                                  logoType: "flag",  prefix: "",  forex: true  },
    { symbol: "GC=F",     label: "Gold",       logoUrl: "https://flagcdn.com/w20/us.png",                                                  logoType: "gold",  prefix: "$", forex: false },
    { symbol: "CL=F",     label: "WTI Oil",    logoUrl: "https://flagcdn.com/w20/us.png",                                                  logoType: "oil",   prefix: "$", forex: false },
    { symbol: "^FTSE",    label: "FTSE 100",   logoUrl: "https://flagcdn.com/w20/gb.png",                                                  logoType: "flag",  prefix: "",  forex: false },
    { symbol: "^N225",    label: "Nikkei",     logoUrl: "https://flagcdn.com/w20/jp.png",                                                  logoType: "flag",  prefix: "¥", forex: false },
    { symbol: "^HSI",     label: "Hang Seng",  logoUrl: "https://flagcdn.com/w20/hk.png",                                                  logoType: "flag",  prefix: "",  forex: false },
    { symbol: "EWZ",      label: "Brazil ETF", logoUrl: "https://flagcdn.com/w20/br.png",                                                  logoType: "flag",  prefix: "$", forex: false },
  ];

  function fmtPrice(price, sym) {
    if (sym.forex) return price.toFixed(4);
    if (price >= 10000) return sym.prefix + price.toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (price >= 1000)  return sym.prefix + price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return sym.prefix + price.toFixed(2);
  }

  function buildItem(sym, price, change) {
    const up = change >= 0;
    const cls = Math.abs(change) < 0.005 ? "ticker-flat" : up ? "ticker-up" : "ticker-down";
    const arrow = Math.abs(change) < 0.005 ? "●" : up ? "▲" : "▼";
    const priceStr = price != null ? fmtPrice(price, sym) : "—";
    const changeStr = price != null ? `${arrow} ${Math.abs(change).toFixed(2)}%` : "—";
    let iconHtml;
    if (sym.logoType === "gold") {
      iconHtml = `<span class="ticker-commodity ticker-commodity--gold">Au</span>`;
    } else if (sym.logoType === "oil") {
      iconHtml = `<span class="ticker-commodity ticker-commodity--oil">🛢</span>`;
    } else {
      const cls = sym.logoType === "flag" ? "ticker-logo ticker-logo--flag"
        : sym.logoType === "crypto" ? "ticker-logo ticker-logo--crypto"
        : "ticker-logo ticker-logo--brand";
      iconHtml = `<img class="${cls}" src="${sym.logoUrl}" alt="${sym.label}" loading="lazy" onerror="this.style.display='none'">`;
    }
    return `<span class="ticker-item">` +
      iconHtml +
      `<span class="ticker-label">${sym.label}</span>` +
      `<span class="ticker-price">${priceStr}</span>` +
      `<span class="ticker-change ${cls}">${changeStr}</span>` +
      `</span><span class="ticker-sep" aria-hidden="true"></span>`;
  }

  function renderFromData(tickersData) {
    const priceMap = new Map(tickersData.map(t => [t.symbol, t]));
    const items = SYMBOLS.map(sym => {
      const entry = priceMap.get(sym.symbol);
      if (!entry || entry.price == null || entry.previousClose == null) {
        return buildItem(sym, null, 0);
      }
      const change = ((entry.price - entry.previousClose) / entry.previousClose) * 100;
      return buildItem(sym, entry.price, change);
    }).join("");
    track.innerHTML = items + items;
    track.classList.remove("ticker-skeleton");
  }

  const ALL_TICKER_SYMBOLS = SYMBOLS.map(s => s.symbol).join(",");

  function applyLiveApiPrices(apiData) {
    const tickers = SYMBOLS.map(s => {
      const entry = apiData[s.symbol];
      if (!entry || entry.price == null) return null;
      return { symbol: s.symbol, price: entry.price, previousClose: entry.prev };
    }).filter(Boolean);
    if (tickers.length) {
      renderFromData(tickers);
      track.title = `Precios en tiempo real · ${new Date().toLocaleTimeString("es-MX")}`;
    }
  }

  const _TICKER_API_ROOT = (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost")
    ? ""
    : "https://blackportfolio-api-production.up.railway.app";

  function loadLivePrices() {
    const _isLocal = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
    const _pricesUrl = _isLocal
      ? `/api/prices?symbols=${encodeURIComponent(ALL_TICKER_SYMBOLS)}`
      : `https://us-central1-portify-6467f.cloudfunctions.net/prices?symbols=${encodeURIComponent(ALL_TICKER_SYMBOLS)}`;
    fetch(_pricesUrl)
      .then(r => { if (!r.ok) throw new Error("api"); return r.json(); })
      .then(applyLiveApiPrices)
      .catch(() => {
        // Fallback a datos estáticos si el servidor no está disponible
        if (window.TICKERS_DATA && window.TICKERS_DATA.tickers) {
          renderFromData(window.TICKERS_DATA.tickers);
          const d = window.TICKERS_DATA.updatedAt
            ? new Date(window.TICKERS_DATA.updatedAt).toLocaleDateString("es-MX")
            : "";
          if (d) track.title = `Precios del ${d} (modo sin conexión al servidor)`;
        }
      });
  }

  // Muestra datos estáticos inmediatamente, luego reemplaza con precios en vivo
  if (window.TICKERS_DATA) renderFromData(window.TICKERS_DATA.tickers || []);
  loadLivePrices();
  setInterval(loadLivePrices, 60000);
})();

// ── Scroll Reveal ────────────────────────────────────────────────────────────
(function initScrollReveal() {
  if (!window.IntersectionObserver) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("in-view");
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -48px 0px" });
  document.querySelectorAll("[data-animate]").forEach(el => observer.observe(el));
})();

// ── Metric Counters ──────────────────────────────────────────────────────────
(function initCounters() {
  const DURATION = 1600;
  const EASE = t => 1 - Math.pow(1 - t, 3);

  function runCounter(el) {
    const target = parseInt(el.dataset.count, 10);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const start = performance.now();
    function step(now) {
      const p = Math.min((now - start) / DURATION, 1);
      el.textContent = prefix + Math.round(EASE(p) * target) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const counters = document.querySelectorAll("[data-count]");
  if (!counters.length) return;

  if (!window.IntersectionObserver) {
    counters.forEach(runCounter);
    return;
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        runCounter(e.target);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(el => obs.observe(el));
})();

// ── Password strength widget ──
(function () {
  const pwInput   = document.getElementById('password');
  const pwToggle  = document.getElementById('pwToggle');
  const eyeIcon   = document.getElementById('eyeIcon');
  const eyeOffIcon= document.getElementById('eyeOffIcon');
  const bars      = document.querySelectorAll('.pw-bar');
  const reqs      = document.querySelectorAll('#pwReqs li');
  const strengthText = document.getElementById('pwStrengthText');

  if (!pwInput) return;

  const RULES = [
    { key: 'length',  regex: /.{8,}/  },
    { key: 'number',  regex: /[0-9]/  },
    { key: 'lower',   regex: /[a-z]/  },
    { key: 'upper',   regex: /[A-Z]/  },
    { key: 'special', regex: /[!-\/:-@[-`{-~]/ },
  ];

  const LABELS = ['', 'Debil', 'Medio', 'Fuerte', 'Muy fuerte', 'Excelente'];
  const LABEL_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

  // Toggle visibility
  pwToggle.addEventListener('click', () => {
    const visible = pwInput.type === 'text';
    pwInput.type = visible ? 'password' : 'text';
    eyeIcon.classList.toggle('hidden', !visible);
    eyeOffIcon.classList.toggle('hidden', visible);
    pwToggle.setAttribute('aria-label', visible ? 'Mostrar contrasena' : 'Ocultar contrasena');
  });

  pwInput.addEventListener('input', () => {
    const val = pwInput.value;
    let score = 0;

    RULES.forEach(rule => {
      const met = rule.regex.test(val);
      if (met) score++;
      const li = document.querySelector(`#pwReqs li[data-req="${rule.key}"]`);
      if (li) li.classList.toggle('met', met);
    });

    bars.forEach((bar, i) => {
      bar.className = 'pw-bar';
      if (i < score) bar.classList.add(`active-${score}`);
    });

    strengthText.textContent = val.length ? LABELS[score] : '';
    strengthText.style.color = val.length ? LABEL_COLORS[score] : '';
  });
})();

// ── Cursor-tracking glow ──
(function () {
  document.addEventListener('pointermove', function (e) {
    var root = document.documentElement;
    root.style.setProperty('--x', e.clientX.toFixed(1));
    root.style.setProperty('--y', e.clientY.toFixed(1));
    root.style.setProperty('--xp', (e.clientX / window.innerWidth).toFixed(3));
  });
})();

// ── Gallery (local assets) ────────────────────────────────────────────────────
(function loadGallery() {
  const bento = document.getElementById('galleryBento');
  if (!bento) return;

  const slots = [
    `<video autoplay muted loop playsinline preload="metadata">
       <source src="assets/gallery/video-1.mp4" type="video/mp4">
     </video>`,
    `<img src="assets/gallery/photo-1.jpg" alt="Mercado financiero" loading="eager">`,
    `<img src="assets/gallery/photo-2.jpg" alt="Trading charts" loading="eager">`,
    `<img src="assets/gallery/photo-3.jpg" alt="Inversiones" loading="lazy">`,
    `<img src="assets/gallery/photo-4.jpg" alt="Portafolio" loading="lazy">`,
    `<video autoplay muted loop playsinline preload="metadata">
       <source src="assets/gallery/video-2.mp4" type="video/mp4">
     </video>`,
  ];

  bento.innerHTML = slots
    .map(content => `<div class="gallery-item">${content}</div>`)
    .join('');

  if (window.IntersectionObserver) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('gallery-visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -16px 0px' });

    bento.querySelectorAll('.gallery-item').forEach((el, i) => {
      el.style.transitionDelay = `${i * 0.08}s`;
      obs.observe(el);
    });
  } else {
    bento.querySelectorAll('.gallery-item').forEach(el => el.classList.add('gallery-visible'));
  }
})();

// ── Mobile nav hamburger ─────────────────────────────────────────────────────
(function initMobileNav() {
  const btn = document.getElementById("navHamburger");
  const nav = document.getElementById("mobileNav");
  if (!btn || !nav) return;

  function close() {
    btn.classList.remove("is-open");
    nav.classList.add("hidden");
    nav.setAttribute("aria-hidden", "true");
    btn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  btn.addEventListener("click", () => {
    const isOpen = !nav.classList.contains("hidden");
    if (isOpen) {
      close();
    } else {
      btn.classList.add("is-open");
      nav.classList.remove("hidden");
      nav.setAttribute("aria-hidden", "false");
      btn.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    }
  });

  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", close));

  window.addEventListener("resize", () => {
    if (window.innerWidth > 720) close();
  });
})();
