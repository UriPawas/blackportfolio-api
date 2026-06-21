const PLANS = ["Explorer", "Investor", "Advisor Pro", "Wealth Desk"];

const _IS_LOCAL = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
const API_BASE_URL = (_IS_LOCAL
  ? "http://127.0.0.1:8000"
  : "https://blackportfolio-api-production.up.railway.app") + "/api";

// Escapa HTML para impedir XSS almacenado: un usuario podría poner su nombre
// o email como <img onerror=...> y ejecutar JS en la sesión del admin.
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const authGuard   = document.getElementById("auth-guard");
const adminPanel  = document.getElementById("admin-panel");
const adminEmail  = document.getElementById("admin-email");
const logoutBtn   = document.getElementById("logoutBtn");
const searchInput = document.getElementById("searchInput");
const loadingMsg  = document.getElementById("loading-msg");
const usersTable  = document.getElementById("users-table");
const usersTbody  = document.getElementById("users-tbody");
const emptyState  = document.getElementById("empty-state");

let allUsers = [];
let portfolioStats = {}; // uid -> { portfolioCount, positionCount, totalValue, returnPct }

window.BlackPortfolioAuth.firebaseAuth.onAuthStateChanged(async (user) => {
  if (!user) {
    authGuard.textContent = "Acceso denegado.";
    setTimeout(() => { window.location.href = "login.html"; }, 1500);
    return;
  }
  // El control de acceso lo hace el backend (require_admin sobre ADMIN_EMAILS).
  // loadUsers() devuelve 403 si no eres admin → se deniega.
  const ok = await loadUsers();
  if (!ok) {
    authGuard.textContent = "Acceso denegado.";
    setTimeout(() => { window.location.href = "login.html"; }, 1500);
    return;
  }
  authGuard.style.display = "none";
  adminPanel.style.display = "block";
  adminEmail.textContent = user.email;
  loadBetaAllowlist();
  loadPromoCodes();
  loadBetaCodes();
  loadFeedback();
});

async function adminFetch(path, options = {}) {
  const user = window.BlackPortfolioAuth.firebaseAuth.currentUser;
  if (!user) return { ok: false, status: 401 };
  const token = await user.getIdToken();
  const twofaToken = sessionStorage.getItem("bp-2fa-token");
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(twofaToken ? { "X-2FA-Token": twofaToken } : {}),
      ...(options.headers || {})
    }
  });
}

logoutBtn.addEventListener("click", async () => {
  await window.BlackPortfolioAuth.clearSession();
  window.location.href = "login.html";
});

searchInput.addEventListener("input", () => {
  renderTable(searchInput.value.trim().toLowerCase());
});

async function loadUsers() {
  try {
    const res = await adminFetch("/admin/users");
    if (res.status === 401 || res.status === 403) return false;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allUsers = data.users || [];
    await fetchPortfolioOverview();
    updateStats();
    renderTable("");
    loadingMsg.style.display = "none";
    usersTable.style.display = "table";
    return true;
  } catch (err) {
    loadingMsg.textContent = "Error al cargar usuarios: " + err.message;
    return true; // autenticado pero falló la carga; no es un problema de permisos
  }
}

// Portafolios y rendimiento viven en PostgreSQL (Railway), no en Firestore.
// Se consultan vía el endpoint admin del backend, autenticado con el ID token.
async function fetchPortfolioOverview() {
  try {
    const user = window.BlackPortfolioAuth.firebaseAuth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    const twofaToken = sessionStorage.getItem("bp-2fa-token");
    const res = await fetch(`${API_BASE_URL}/admin/portfolio-overview`, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(twofaToken ? { "X-2FA-Token": twofaToken } : {})
      }
    });
    if (!res.ok) return;
    const data = await res.json();
    portfolioStats = {};
    (data.users || []).forEach(u => { portfolioStats[u.uid] = u; });
  } catch (err) {
    console.error("No se pudo cargar el resumen de portafolios.", err);
  }
}

function updateStats() {
  const counts = { Explorer: 0, Investor: 0, "Advisor Pro": 0, "Wealth Desk": 0 };
  allUsers.forEach(u => {
    if (u.isDemo) return;
    const p = u.selectedPlan || "Explorer";
    if (counts[p] !== undefined) counts[p]++;
  });
  const nonDemo = allUsers.filter(u => !u.isDemo).length;
  document.getElementById("stat-total").textContent    = nonDemo;
  document.getElementById("stat-free").textContent     = counts["Explorer"];
  document.getElementById("stat-investor").textContent = counts["Investor"];
  document.getElementById("stat-advisor").textContent  = counts["Advisor Pro"];
  document.getElementById("stat-inst").textContent     = counts["Wealth Desk"];
  const totalPortfolios = Object.values(portfolioStats).reduce((s, u) => s + (u.portfolioCount || 0), 0);
  document.getElementById("stat-portfolios").textContent = totalPortfolios;
}

function perfBadge(stat) {
  if (!stat || stat.returnPct === null || stat.returnPct === undefined) {
    return '<span style="color:var(--muted)">—</span>';
  }
  const v = stat.returnPct;
  const cls = v >= 0 ? "badge-pos" : "badge-neg";
  const sign = v >= 0 ? "+" : "";
  return `<span class="badge ${cls}">${sign}${v.toFixed(2)}%</span>`;
}

function portfolioCountCell(stat) {
  if (!stat) return '<span class="pf-count">0</span>';
  const positions = stat.positionCount || 0;
  return `<span class="pf-count">${stat.portfolioCount || 0}` +
    (positions ? ` <small>· ${positions} pos.</small>` : "") + `</span>`;
}

function planBadge(plan) {
  const map = {
    "Explorer": "badge-free",
    "Investor": "badge-investor",
    "Advisor Pro": "badge-advisor",
    "Wealth Desk": "badge-inst"
  };
  const cls = map[plan] || "badge-free";
  return `<span class="badge ${cls}">${plan || "Explorer"}</span>`;
}

function formatDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return "—"; }
}

function sessionBadge(lastSeen) {
  if (!lastSeen) return '<span class="badge badge-offline">Sin datos</span>';
  const diffMin = (Date.now() - new Date(lastSeen).getTime()) / 60000;
  if (diffMin < 30) {
    const ago = diffMin < 1 ? "Ahora" : `Hace ${Math.floor(diffMin)} min`;
    return `<span class="badge badge-online">● Activo — ${ago}</span>`;
  }
  const label = new Date(lastSeen).toLocaleString("es-MX", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return `<span class="badge badge-offline">${label}</span>`;
}

function renderTable(query) {
  const filtered = query
    ? allUsers.filter(u => {
        const name  = (u.fullName || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        return name.includes(query) || email.includes(query);
      })
    : allUsers;

  usersTbody.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.style.display = "block";
    usersTable.style.display = "none";
    return;
  }
  emptyState.style.display = "none";
  usersTable.style.display = "table";

  filtered.forEach(user => {
    const tr = document.createElement("tr");

    const currentPlan = user.selectedPlan || "Explorer";
    const selectOptions = PLANS.map(p =>
      `<option value="${p}" ${p === currentPlan ? "selected" : ""}>${p}</option>`
    ).join("");

    const demoBadge = user.isDemo ? ' <span class="badge badge-demo">demo</span>' : "";
    const stat = portfolioStats[user.uid];

    tr.innerHTML = `
      <td>${esc(user.fullName) || "—"}${demoBadge}</td>
      <td style="color:var(--muted)">${esc(user.email) || "—"}</td>
      <td>${planBadge(currentPlan)}</td>
      <td>${portfolioCountCell(stat)}</td>
      <td>${perfBadge(stat)}</td>
      <td>
        <select class="plan-select" data-uid="${user.uid}">
          ${selectOptions}
        </select>
        <button class="save-btn" data-uid="${user.uid}" data-original="${currentPlan}">Guardar</button>
      </td>
      <td style="color:var(--muted);font-size:0.8rem">${formatDate(user.createdAt)}</td>
      <td>${sessionBadge(user.lastSeen)}</td>
    `;

    usersTbody.appendChild(tr);
  });

  usersTbody.querySelectorAll(".save-btn").forEach(btn => {
    btn.addEventListener("click", () => savePlan(btn));
  });
}

// ── Beta cerrada — allowlist ──────────────────────────────────────────────────
const betaEmail   = document.getElementById("betaEmail");
const betaNote    = document.getElementById("betaNote");
const betaAddBtn  = document.getElementById("betaAddBtn");
const betaMsg     = document.getElementById("beta-msg");
const betaTable   = document.getElementById("beta-table");
const betaTbody   = document.getElementById("beta-tbody");
const betaEmpty   = document.getElementById("beta-empty");
const betaStatus  = document.getElementById("beta-status");

let betaEmails = [];

function renderBetaAllowlist() {
  betaTbody.innerHTML = "";
  if (!betaEmails.length) {
    betaEmpty.style.display = "block";
    betaTable.style.display = "none";
    return;
  }
  betaEmpty.style.display = "none";
  betaTable.style.display = "table";

  betaEmails.forEach(e => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="promo-code">${esc(e.email)}</span></td>
      <td style="color:var(--muted)">${esc(e.note) || "—"}</td>
      <td style="color:var(--muted);font-size:0.8rem">${esc(e.addedBy) || "—"}</td>
      <td style="color:var(--muted);font-size:0.8rem">${formatDate(e.createdAt)}</td>
      <td><button class="deact-btn beta-del-btn" data-email="${esc(e.email)}">Quitar</button></td>
    `;
    betaTbody.appendChild(tr);
  });

  betaTbody.querySelectorAll(".beta-del-btn").forEach(b =>
    b.addEventListener("click", () => removeBetaEmail(b)));
}

async function loadBetaAllowlist() {
  try {
    const res = await adminFetch("/admin/beta-allowlist");
    if (!res.ok) return;
    const data = await res.json();
    betaEmails = data.emails || [];
    if (betaStatus) {
      betaStatus.style.display = "inline-block";
      betaStatus.textContent = data.betaClosed ? "Cerrada" : "Abierta (GA)";
    }
    renderBetaAllowlist();
  } catch (err) {
    console.error("No se pudo cargar la allowlist.", err);
  }
}

async function addBetaEmail() {
  const email = betaEmail.value.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    betaMsg.style.color = "#ff6b6b";
    betaMsg.textContent = "Ingresa un correo válido.";
    return;
  }
  betaAddBtn.disabled = true;
  betaAddBtn.textContent = "Invitando…";
  betaMsg.textContent = "";
  try {
    const res = await adminFetch("/admin/beta-allowlist", {
      method: "POST",
      body: JSON.stringify({ email, note: betaNote.value.trim() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
    betaEmail.value = "";
    betaNote.value = "";
    betaMsg.style.color = "var(--success)";
    betaMsg.textContent = `Acceso concedido a ${data.email}`;
    await loadBetaAllowlist();
  } catch (err) {
    betaMsg.style.color = "#ff6b6b";
    betaMsg.textContent = "Error: " + err.message;
  } finally {
    betaAddBtn.disabled = false;
    betaAddBtn.textContent = "+ Invitar correo";
  }
}

async function removeBetaEmail(btn) {
  btn.disabled = true;
  try {
    const res = await adminFetch(`/admin/beta-allowlist/${encodeURIComponent(btn.dataset.email)}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    betaEmails = betaEmails.filter(e => e.email !== btn.dataset.email);
    renderBetaAllowlist();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "Error";
  }
}

betaAddBtn?.addEventListener("click", addBetaEmail);

// ── Códigos de beta (Stripe Promotion Codes) ──────────────────────────────────
const genPromoBtn   = document.getElementById("genPromoBtn");
const promoCustom   = document.getElementById("promoCustom");
const promoType     = document.getElementById("promoType");
const promoPercent  = document.getElementById("promoPercent");
const promoAmount   = document.getElementById("promoAmount");
const promoDuration = document.getElementById("promoDuration");
const promoMsg      = document.getElementById("promo-msg");
const promoTable    = document.getElementById("promo-table");
const promoTbody    = document.getElementById("promo-tbody");
const promoEmpty    = document.getElementById("promo-empty");

let promoCodes = [];

function discountLabel(c) {
  if (c.amountOff != null) {
    const cur = (c.currency || "usd").toUpperCase();
    return `$${(c.amountOff / 100).toFixed(2)} ${cur}`;
  }
  return `${c.percentOff != null ? c.percentOff : 100}%`;
}

function durationLabel(c) {
  const d = discountLabel(c);
  if (c.duration === "repeating") return `${d} · ${c.durationInMonths} mes(es)`;
  if (c.duration === "forever") return `${d} · siempre`;
  return `${d} · 1 cobro`;
}

function renderPromoCodes() {
  promoTbody.innerHTML = "";
  if (!promoCodes.length) {
    promoEmpty.style.display = "block";
    promoTable.style.display = "none";
    return;
  }
  promoEmpty.style.display = "none";
  promoTable.style.display = "table";

  promoCodes.forEach(c => {
    const used = c.timesRedeemed || 0;
    const cap = c.maxRedemptions || 1;
    const exhausted = used >= cap;
    const status = !c.active
      ? '<span class="badge badge-offline">Desactivado</span>'
      : exhausted
        ? '<span class="badge badge-neg">Usado</span>'
        : '<span class="badge badge-online">Disponible</span>';

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="promo-code">${esc(c.code)}</span>
          <button class="copy-btn" data-code="${esc(c.code)}">Copiar</button></td>
      <td>${durationLabel(c)}</td>
      <td>${used} / ${cap}</td>
      <td>${status}</td>
      <td>${c.active ? `<button class="deact-btn" data-id="${esc(c.id)}">Desactivar</button>` : "—"}</td>
    `;
    promoTbody.appendChild(tr);
  });

  promoTbody.querySelectorAll(".copy-btn").forEach(b => b.addEventListener("click", () => copyCode(b)));
  promoTbody.querySelectorAll(".deact-btn").forEach(b => b.addEventListener("click", () => deactivatePromo(b)));
}

async function loadPromoCodes() {
  try {
    const res = await adminFetch("/admin/promo-codes");
    if (!res.ok) return;
    const data = await res.json();
    promoCodes = (data.codes || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    renderPromoCodes();
  } catch (err) {
    console.error("No se pudieron cargar los códigos.", err);
  }
}

async function generatePromo() {
  genPromoBtn.disabled = true;
  genPromoBtn.textContent = "Generando…";
  promoMsg.textContent = "";
  try {
    const res = await adminFetch("/admin/promo-codes", {
      method: "POST",
      body: JSON.stringify({
        code: promoCustom.value.trim(),
        discountType: promoType.value,
        percentOff: parseInt(promoPercent.value, 10) || 0,
        amountOff: parseFloat(promoAmount.value) || 0,
        durationMonths: parseInt(promoDuration.value, 10) || 0
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
    promoCustom.value = "";
    promoMsg.style.color = "var(--success)";
    promoMsg.textContent = `Código creado: ${data.code}`;
    promoCodes.unshift(data);
    renderPromoCodes();
  } catch (err) {
    promoMsg.style.color = "#ff6b6b";
    promoMsg.textContent = "Error: " + err.message;
  } finally {
    genPromoBtn.disabled = false;
    genPromoBtn.textContent = "+ Generar código";
  }
}

async function deactivatePromo(btn) {
  btn.disabled = true;
  try {
    const res = await adminFetch(`/admin/promo-codes/${encodeURIComponent(btn.dataset.id)}/deactivate`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
    const c = promoCodes.find(p => p.id === data.id);
    if (c) Object.assign(c, data);
    renderPromoCodes();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "Error";
  }
}

function copyCode(btn) {
  navigator.clipboard?.writeText(btn.dataset.code).then(() => {
    const orig = btn.textContent;
    btn.textContent = "✓ Copiado";
    setTimeout(() => { btn.textContent = orig; }, 1200);
  }).catch(() => {});
}

promoType?.addEventListener("change", () => {
  const isAmount = promoType.value === "amount";
  promoPercent.style.display = isAmount ? "none" : "";
  promoAmount.style.display  = isAmount ? "" : "none";
});

genPromoBtn?.addEventListener("click", generatePromo);

// ── Códigos de acceso a beta (acceso completo temporal, no Stripe) ────────────
const genBetaCodeBtn   = document.getElementById("genBetaCodeBtn");
const betaCodeCustom   = document.getElementById("betaCodeCustom");
const betaCodePlan     = document.getElementById("betaCodePlan");
const betaCodeDuration = document.getElementById("betaCodeDuration");
const betaCodeUses     = document.getElementById("betaCodeUses");
const betaCodeMsg      = document.getElementById("betacode-msg");
const betaCodeTable    = document.getElementById("betacode-table");
const betaCodeTbody    = document.getElementById("betacode-tbody");
const betaCodeEmpty    = document.getElementById("betacode-empty");

let betaCodes = [];

function renderBetaCodes() {
  betaCodeTbody.innerHTML = "";
  if (!betaCodes.length) {
    betaCodeEmpty.style.display = "block";
    betaCodeTable.style.display = "none";
    return;
  }
  betaCodeEmpty.style.display = "none";
  betaCodeTable.style.display = "table";

  betaCodes.forEach(c => {
    const used = c.redemptions || 0;
    const cap = c.maxRedemptions || 1;
    const exhausted = used >= cap;
    const status = !c.active
      ? '<span class="badge badge-offline">Desactivado</span>'
      : exhausted
        ? '<span class="badge badge-neg">Agotado</span>'
        : '<span class="badge badge-online">Disponible</span>';

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="promo-code">${esc(c.code)}</span>
          <button class="copy-btn" data-code="${esc(c.code)}">Copiar</button></td>
      <td>${esc(c.plan)}</td>
      <td>${c.durationDays} día(s)</td>
      <td>${used} / ${cap}</td>
      <td>${status}</td>
      <td>${c.active ? `<button class="deact-btn betacode-deact" data-code="${esc(c.code)}">Desactivar</button>` : "—"}</td>
    `;
    betaCodeTbody.appendChild(tr);
  });

  betaCodeTbody.querySelectorAll(".copy-btn").forEach(b => b.addEventListener("click", () => copyCode(b)));
  betaCodeTbody.querySelectorAll(".betacode-deact").forEach(b => b.addEventListener("click", () => deactivateBetaCode(b)));
}

async function loadBetaCodes() {
  try {
    const res = await adminFetch("/admin/beta-codes");
    if (!res.ok) return;
    const data = await res.json();
    betaCodes = data.codes || [];
    renderBetaCodes();
  } catch (err) {
    console.error("No se pudieron cargar los códigos de beta.", err);
  }
}

async function generateBetaCode() {
  genBetaCodeBtn.disabled = true;
  genBetaCodeBtn.textContent = "Generando…";
  betaCodeMsg.textContent = "";
  try {
    const res = await adminFetch("/admin/beta-codes", {
      method: "POST",
      body: JSON.stringify({
        code: betaCodeCustom.value.trim(),
        plan: betaCodePlan.value,
        durationDays: parseInt(betaCodeDuration.value, 10) || 30,
        maxRedemptions: parseInt(betaCodeUses.value, 10) || 1,
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
    betaCodeCustom.value = "";
    betaCodeMsg.style.color = "var(--success)";
    betaCodeMsg.textContent = `Código creado: ${data.code}`;
    betaCodes.unshift(data);
    renderBetaCodes();
  } catch (err) {
    betaCodeMsg.style.color = "#ff6b6b";
    betaCodeMsg.textContent = "Error: " + err.message;
  } finally {
    genBetaCodeBtn.disabled = false;
    genBetaCodeBtn.textContent = "+ Generar código";
  }
}

async function deactivateBetaCode(btn) {
  btn.disabled = true;
  try {
    const res = await adminFetch(`/admin/beta-codes/${encodeURIComponent(btn.dataset.code)}/deactivate`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
    const c = betaCodes.find(x => x.code === data.code);
    if (c) Object.assign(c, data);
    renderBetaCodes();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "Error";
  }
}

genBetaCodeBtn?.addEventListener("click", generateBetaCode);

// ── Feedback de usuarios ──────────────────────────────────────────────────────
const feedbackTable   = document.getElementById("feedback-table");
const feedbackTbody   = document.getElementById("feedback-tbody");
const feedbackEmpty   = document.getElementById("feedback-empty");
const feedbackLoading = document.getElementById("feedback-loading");
const feedbackBadge   = document.getElementById("feedback-badge");
const feedbackRefresh = document.getElementById("feedbackRefreshBtn");

let feedbackItems = [];

const FB_CATEGORY = {
  bug: "🐞 Error", idea: "💡 Idea", question: "❓ Pregunta", general: "💬 General",
};
const FB_STATUS = { new: "Nuevo", read: "Leído", resolved: "Resuelto" };

function fbDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("es-MX", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}

function statusBadgeFb(status) {
  const cls = status === "new" ? "badge-online" : status === "resolved" ? "badge-offline" : "badge-investor";
  return `<span class="badge ${cls}">${FB_STATUS[status] || status}</span>`;
}

function renderFeedback() {
  feedbackTbody.innerHTML = "";
  const newCount = feedbackItems.filter(f => f.status === "new").length;
  if (feedbackBadge) {
    feedbackBadge.style.display = newCount ? "inline-block" : "none";
    feedbackBadge.textContent = `${newCount} nuevo${newCount === 1 ? "" : "s"}`;
  }
  if (!feedbackItems.length) {
    feedbackEmpty.style.display = "block";
    feedbackTable.style.display = "none";
    return;
  }
  feedbackEmpty.style.display = "none";
  feedbackTable.style.display = "table";

  feedbackItems.forEach(f => {
    const tr = document.createElement("tr");
    const nextStatus = f.status === "new" ? "read" : f.status === "read" ? "resolved" : "new";
    const nextLabel  = f.status === "new" ? "Marcar leído" : f.status === "read" ? "Resolver" : "Reabrir";
    tr.innerHTML = `
      <td>${esc(f.displayName) || "—"}<br><span style="color:var(--muted);font-size:0.78rem">${esc(f.email) || "—"}</span></td>
      <td>${planBadge(f.plan)}</td>
      <td style="white-space:nowrap">${esc(FB_CATEGORY[f.category] || f.category)}</td>
      <td style="max-width:340px;white-space:pre-wrap">${esc(f.message)}</td>
      <td style="color:var(--muted);font-size:0.78rem">${esc(f.page) || "—"}</td>
      <td style="color:var(--muted);font-size:0.8rem;white-space:nowrap">${fbDate(f.createdAt)}</td>
      <td style="white-space:nowrap">${statusBadgeFb(f.status)}
        <button class="copy-btn fb-status-btn" data-id="${f.id}" data-next="${nextStatus}">${nextLabel}</button></td>
    `;
    feedbackTbody.appendChild(tr);
  });

  feedbackTbody.querySelectorAll(".fb-status-btn").forEach(b =>
    b.addEventListener("click", () => setFeedbackStatus(b)));
}

async function loadFeedback() {
  try {
    const res = await adminFetch("/admin/feedback");
    if (!res.ok) { if (feedbackLoading) feedbackLoading.textContent = "No se pudo cargar el feedback."; return; }
    const data = await res.json();
    feedbackItems = data.feedback || [];
    if (feedbackLoading) feedbackLoading.style.display = "none";
    renderFeedback();
  } catch (err) {
    console.error("No se pudo cargar el feedback.", err);
    if (feedbackLoading) feedbackLoading.textContent = "Error al cargar el feedback.";
  }
}

async function setFeedbackStatus(btn) {
  const id = btn.dataset.id;
  const next = btn.dataset.next;
  btn.disabled = true;
  try {
    const res = await adminFetch(`/admin/feedback/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const item = feedbackItems.find(f => String(f.id) === String(id));
    if (item) item.status = next;
    renderFeedback();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "Error";
  }
}

feedbackRefresh?.addEventListener("click", loadFeedback);

async function savePlan(btn) {
  const uid = btn.dataset.uid;
  const select = usersTbody.querySelector(`.plan-select[data-uid="${uid}"]`);
  const newPlan = select.value;

  btn.disabled = true;
  btn.textContent = "Guardando…";

  try {
    const res = await adminFetch(`/admin/users/${encodeURIComponent(uid)}/plan`, {
      method: "PUT",
      body: JSON.stringify({ plan: newPlan })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const user = allUsers.find(u => u.uid === uid);
    if (user) user.selectedPlan = newPlan;

    btn.classList.add("saved");
    btn.textContent = "✓ Guardado";
    btn.dataset.original = newPlan;

    updateStats();

    const badge = btn.closest("tr").querySelector(".badge");
    if (badge) badge.outerHTML; // refresh handled below
    const planCell = btn.closest("tr").querySelector("td:nth-child(3)");
    if (planCell) planCell.innerHTML = planBadge(newPlan);

    setTimeout(() => {
      btn.classList.remove("saved");
      btn.textContent = "Guardar";
      btn.disabled = false;
    }, 2000);
  } catch (err) {
    btn.textContent = "Error";
    btn.style.background = "#e55";
    setTimeout(() => {
      btn.textContent = "Guardar";
      btn.style.background = "";
      btn.disabled = false;
    }, 2500);
  }
}
