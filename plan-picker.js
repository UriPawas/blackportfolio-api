// ── Selector de plan tras registro con Google ─────────────────────────────────
// Cuando un usuario NUEVO entra con Google, ya no se le da de alta como Explorer
// en silencio: se le muestra este modal para que elija plan.
//   • Explorer (gratis) → se le da acceso (con sugerencia de mejorar).
//   • Plan de pago       → se le redirige a Stripe Checkout para completar el pago.
// Reutilizable en index.html y login.html. Expone window.BlackPortfolioPlanPicker.
(function () {
  const RAILWAY_API =
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? "http://127.0.0.1:8000"
      : "https://blackportfolio-api-production.up.railway.app";

  // Precios alineados con PLAN_PRICES del backend (api.py). Mensual en USD;
  // "yearMonthly" = costo mensual efectivo al facturar anual.
  const PLANS = [
    { name: "Explorer",    paid: false, monthly: 0,   yearMonthly: 0,   tagline: "Para empezar a explorar." },
    { name: "Investor",    paid: true,  monthly: 19,  yearMonthly: 15,  tagline: "Seguimiento y analítica completa." },
    { name: "Advisor Pro", paid: true,  monthly: 59,  yearMonthly: 47,  tagline: "Para asesores y reportes pro.", popular: true },
    { name: "Wealth Desk", paid: true,  monthly: 129, yearMonthly: 103, tagline: "Capacidades de mesa de inversión." },
  ];

  let injected = false;
  let resolver = null;

  function injectStyles() {
    if (document.getElementById("bp-plan-picker-style")) return;
    const css = `
    .bp-pp-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
      padding:24px;background:rgba(2,3,8,0.72);backdrop-filter:blur(6px);overflow-y:auto;}
    .bp-pp-overlay.hidden{display:none;}
    .bp-pp-card{width:100%;max-width:880px;background:var(--surface,#0e0e12);border:1px solid var(--border,rgba(255,255,255,0.08));
      border-radius:20px;padding:28px;color:var(--text,#f5f7fb);box-shadow:0 24px 80px rgba(0,0,0,0.55);}
    .bp-pp-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:6px;}
    .bp-pp-head h2{font-size:1.35rem;font-weight:700;margin:0;}
    .bp-pp-head p{font-size:0.86rem;color:var(--muted,#9ca3b4);margin:6px 0 0;}
    .bp-pp-close{background:transparent;border:none;color:var(--muted,#9ca3b4);font-size:1.5rem;line-height:1;cursor:pointer;padding:0 4px;}
    .bp-pp-toggle{display:inline-flex;gap:4px;background:rgba(255,255,255,0.05);border:1px solid var(--border,rgba(255,255,255,0.08));
      border-radius:999px;padding:4px;margin:18px 0 20px;}
    .bp-pp-toggle button{border:none;background:transparent;color:var(--muted,#9ca3b4);padding:7px 16px;border-radius:999px;
      cursor:pointer;font-size:0.83rem;font-weight:600;}
    .bp-pp-toggle button.active{background:var(--primary,#6f86ff);color:#fff;}
    .bp-pp-toggle .bp-pp-save{font-size:0.72rem;color:#32d6a2;margin-left:2px;}
    .bp-pp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:14px;}
    .bp-pp-plan{position:relative;border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:14px;padding:18px;
      display:flex;flex-direction:column;gap:8px;background:rgba(255,255,255,0.02);}
    .bp-pp-plan.popular{border-color:var(--primary,#6f86ff);}
    .bp-pp-badge{position:absolute;top:-10px;right:14px;background:var(--primary,#6f86ff);color:#fff;font-size:0.66rem;
      font-weight:700;padding:3px 9px;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;}
    .bp-pp-name{font-size:1rem;font-weight:700;}
    .bp-pp-tag{font-size:0.76rem;color:var(--muted,#9ca3b4);min-height:32px;}
    .bp-pp-price{font-size:1.5rem;font-weight:800;}
    .bp-pp-price small{font-size:0.72rem;font-weight:500;color:var(--muted,#9ca3b4);}
    .bp-pp-free{font-size:1.1rem;font-weight:800;color:#32d6a2;}
    .bp-pp-pick{margin-top:auto;border:none;border-radius:10px;padding:9px 12px;font-size:0.84rem;font-weight:600;cursor:pointer;}
    .bp-pp-pick.paid{background:var(--primary,#6f86ff);color:#fff;}
    .bp-pp-pick.free{background:rgba(255,255,255,0.08);color:var(--text,#f5f7fb);}
    .bp-pp-pick:disabled{opacity:0.5;cursor:default;}
    .bp-pp-note{margin-top:18px;font-size:0.8rem;color:var(--muted,#9ca3b4);background:rgba(111,134,255,0.08);
      border:1px solid rgba(111,134,255,0.2);border-radius:10px;padding:10px 14px;}
    .bp-pp-msg{margin-top:12px;font-size:0.82rem;min-height:18px;}
    `;
    const style = document.createElement("style");
    style.id = "bp-plan-picker-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function build(defaultCycle) {
    injectStyles();
    const overlay = document.createElement("div");
    overlay.className = "bp-pp-overlay hidden";
    overlay.id = "bpPlanPicker";
    overlay.innerHTML = `
      <div class="bp-pp-card" role="dialog" aria-modal="true" aria-label="Elige tu plan">
        <div class="bp-pp-head">
          <div>
            <h2>Elige tu plan</h2>
            <p>Tu cuenta de Google está lista. Selecciona con qué plan quieres continuar.</p>
          </div>
          <button class="bp-pp-close" id="bpPpClose" type="button" aria-label="Cerrar">&times;</button>
        </div>
        <div class="bp-pp-toggle" id="bpPpToggle">
          <button data-cycle="monthly" type="button">Mensual</button>
          <button data-cycle="yearly" type="button">Anual<span class="bp-pp-save">−20%</span></button>
        </div>
        <div class="bp-pp-grid" id="bpPpGrid"></div>
        <div class="bp-pp-note">
          ¿Eres parte de la beta? Elige un plan de pago y, en el checkout de Stripe, ingresa tu
          <strong>código de acceso 100% off</strong> en "Añadir código de promoción".
        </div>
        <p class="bp-pp-msg" id="bpPpMsg"></p>
      </div>`;
    document.body.appendChild(overlay);

    let cycle = defaultCycle === "yearly" ? "yearly" : "monthly";
    const grid = overlay.querySelector("#bpPpGrid");
    const msg = overlay.querySelector("#bpPpMsg");

    function renderGrid() {
      grid.innerHTML = "";
      PLANS.forEach(p => {
        const card = document.createElement("div");
        card.className = "bp-pp-plan" + (p.popular ? " popular" : "");
        const priceHtml = p.paid
          ? `<div class="bp-pp-price">$${cycle === "yearly" ? p.yearMonthly : p.monthly}<small> USD / mes</small></div>`
          : `<div class="bp-pp-free">Gratis</div>`;
        card.innerHTML = `
          ${p.popular ? '<span class="bp-pp-badge">Popular</span>' : ""}
          <div class="bp-pp-name">${p.name}</div>
          <div class="bp-pp-tag">${p.tagline}</div>
          ${priceHtml}
          <button class="bp-pp-pick ${p.paid ? "paid" : "free"}" data-plan="${p.name}" data-paid="${p.paid}" type="button">
            ${p.paid ? "Continuar al pago" : "Comenzar gratis"}
          </button>`;
        grid.appendChild(card);
      });
      grid.querySelectorAll(".bp-pp-pick").forEach(btn =>
        btn.addEventListener("click", () => pick(btn)));
    }

    overlay.querySelectorAll("#bpPpToggle button").forEach(btn => {
      if (btn.dataset.cycle === cycle) btn.classList.add("active");
      btn.addEventListener("click", () => {
        cycle = btn.dataset.cycle;
        overlay.querySelectorAll("#bpPpToggle button").forEach(b =>
          b.classList.toggle("active", b.dataset.cycle === cycle));
        renderGrid();
      });
    });

    async function pick(btn) {
      const plan = btn.dataset.plan;
      const paid = btn.dataset.paid === "true";
      if (!paid) {
        grid.querySelectorAll(".bp-pp-pick").forEach(b => (b.disabled = true));
        try {
          await window.BlackPortfolioAuth.completePlanSelection(plan);
          cleanup();
          if (resolver) resolver({ plan, paid: false, billingCycle: cycle });
        } catch (err) {
          grid.querySelectorAll(".bp-pp-pick").forEach(b => (b.disabled = false));
          msg.style.color = "#ff6b6b";
          msg.textContent = err.message || "No se pudo guardar el plan. Intenta de nuevo.";
        }
        return;
      }
      // Plan de pago → redirigir a Stripe Checkout.
      grid.querySelectorAll(".bp-pp-pick").forEach(b => (b.disabled = true));
      msg.style.color = "var(--muted,#9ca3b4)";
      msg.textContent = "Redirigiendo al pago seguro de Stripe…";
      try {
        await startStripeCheckout(plan, cycle);
        // En éxito el navegador se redirige; no se resuelve la promesa.
      } catch (err) {
        grid.querySelectorAll(".bp-pp-pick").forEach(b => (b.disabled = false));
        msg.style.color = "#ff6b6b";
        msg.textContent = err.message || "No se pudo iniciar el pago. Intenta de nuevo.";
      }
    }

    overlay.querySelector("#bpPpClose").addEventListener("click", () => {
      // Cerrar = continuar gratis (Explorer).
      cleanup();
      if (resolver) resolver({ plan: "Explorer", paid: false, billingCycle: cycle });
    });

    function cleanup() {
      overlay.classList.add("hidden");
      setTimeout(() => overlay.remove(), 200);
    }

    renderGrid();
    requestAnimationFrame(() => overlay.classList.remove("hidden"));
  }

  async function startStripeCheckout(plan, billingCycle) {
    const user = window.BlackPortfolioAuth.firebaseAuth.currentUser;
    if (!user) throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
    const idToken = await user.getIdToken();
    const res = await fetch(`${RAILWAY_API}/api/billing/stripe/create-checkout-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ plan, billingCycle }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Error al iniciar el pago.");
    }
    const data = await res.json();
    window.location.href = data.url;
  }

  // Muestra el selector y resuelve cuando el usuario elige un plan GRATIS o cierra.
  // Para planes de pago el navegador se redirige a Stripe (la promesa no resuelve).
  window.BlackPortfolioPlanPicker = {
    run(opts = {}) {
      if (injected) return Promise.resolve({ plan: "Explorer", paid: false, billingCycle: "monthly" });
      injected = true;
      return new Promise(resolve => {
        resolver = resolve;
        build(opts.defaultCycle || "monthly");
      });
    },
  };
})();
