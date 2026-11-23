/* Portify · app Campo · adaptador de DATOS REALES (solo lectura).
   1) Espera la sesión de Firebase y aplica el mismo control de 2FA que main.js (y el del backend, que es el que manda).
   2) Lee los portafolios con GET /api/account/bootstrap. Este archivo NO escribe nada: ni PUT, ni localStorage de portafolios.
   3) Precios de hoy (/api/prices) e historia diaria de un año (/api/chart) de cada emisora y de los mercados del Inicio.
   4) Rejilla común de 252 sesiones (las del S&P 500); cada serie se alinea a ella arrastrando el último cierre conocido.
   5) Arma el LIBRO de movimientos de cada portafolio con SUS transacciones reales, con la misma forma que el prototipo
      (eventos, lotes, V/F/Dc/Wc/cashAt): CampoTracker y CampoPfResumen lo consumen tal cual.
   6) Publica window.PORTIFY_DEMO (la forma que esperan los módulos) y window.CAMPO_REAL, y carga los módulos en orden.
   Reglas de main.js que se respetan: moneda por sufijo del ticker primero; costo = precio × cantidad + comisión + IVA;
   el efectivo es el de cashBalance; un portafolio cerrado vive solo en sus transacciones.
   Diferencias a propósito, todas documentadas en docs/rediseno-gbm-2026-11/22-plan-migracion-app.md:
   cada flujo se convierte a pesos con el tipo de cambio de SU fecha (main.js usa el de hoy para todo), y las compras
   que el efectivo no alcanzaba a pagar cuentan como aportación de ese día (así el TWR y la ganancia no se inventan). */
(function () {
  'use strict';
  var W = window, doc = document;
  var TOT = 252, LAST = TOT - 1, EPS = 1e-9;
  var IS_LOCAL = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  var API = (IS_LOCAL ? 'http://127.0.0.1:8000' : 'https://blackportfolio-api-production.up.railway.app') + '/api';
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  /* los 7 mercados que leen el Inicio, el modelo de factores y el Monte Carlo (mismos nombres que el prototipo) */
  var MKT = [
    { sym: 'S&P/BMV IPC', y: '^MXX' }, { sym: 'S&P 500', y: '^GSPC' }, { sym: 'Nasdaq 100', y: '^NDX' },
    { sym: 'USD/MXN', y: 'MXN=X' }, { sym: 'Bitcoin', y: 'BTC-USD' }, { sym: 'Oro', y: 'GC=F' },
    { sym: 'Bono 10a EE. UU.', y: '^TNX', unit: '%' }
  ];
  var EXTRA = [{ sym: 'VIX', y: '^VIX' }, { sym: 'Índice dólar (DXY)', y: 'DX-Y.NYB' }, { sym: 'Petróleo WTI', y: 'CL=F' }];
  var BENCH = { '^GSPC': 'S&P 500', '^IXIC': 'NASDAQ 100', '^NDX': 'NASDAQ 100', '^MXX': 'S&P/BMV IPC', 'BTC-USD': 'Bitcoin' };
  var SUF = [['.MX', 'MXN'], ['.SA', 'BRL'], ['.L', 'GBP'], ['.IL', 'GBP'], ['.PA', 'EUR'], ['.DE', 'EUR'], ['.MC', 'EUR'], ['.MI', 'EUR'], ['.AS', 'EUR'],
    ['.BR', 'EUR'], ['.LS', 'EUR'], ['.VI', 'EUR'], ['.TO', 'CAD'], ['.V', 'CAD'], ['.AX', 'AUD'], ['.NZ', 'NZD'], ['.HK', 'HKD'], ['.T', 'JPY'], ['.SS', 'CNY'], ['.SZ', 'CNY']];
  var CRYPTO = /^(BTC|ETH|SOL|XRP|ADA|DOGE|DOT|AVAX|MATIC|POL|LINK|LTC|BCH|XLM|ATOM|UNI|TRX|SHIB|NEAR|APT|ARB|OP|SUI|TON|BNB|USDT|USDC|PEPE|FIL|ICP|ETC|HBAR|ALGO|AAVE|MKR|INJ|RNDR|RENDER|SEI|TIA|WIF|BONK)(-[A-Z]{3,4})?$/;
  var FIBRA = /^(FIBRA|FUNO|FMTY|DANHOS|FINN|TERRA|FSHOP|FIHO|FNOVA|FPLUS|EDUCA|FCFE|FVIA|STORAGE|NEXT|FMX|FINAMEX)/;
  var DEBT = /CETES|BONDDIA|UDIBONO|BONO|DEUDA|GBMF|GOBIERN/;
  var PLAN_MAX = { 'Explorer': 1, 'Investor': 3, 'Advisor Pro': 99, 'Wealth Desk': 99 };
  var READONLY = 'Por ahora esta versión solo lee tus datos. Para registrar o editar, usa la versión anterior de la app.';

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function up(s) { return String(s == null ? '' : s).trim().toUpperCase(); }
  function num(v) { var n = +v; return isFinite(n) ? n : NaN; }
  function fin(v) { return typeof v === 'number' && isFinite(v); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function todayLocal() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function localDate(s) {
    if (!s) return null; s = String(s);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    var d = new Date(s); if (isNaN(d)) return null;
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function isoMs(s) { return Date.parse(s + 'T00:00:00Z'); }
  function isoAdd(s, d) { return new Date(isoMs(s) + d * 864e5).toISOString().slice(0, 10); }
  function prevWeekday(s) { var d = isoAdd(s, -1), w = new Date(isoMs(d)).getUTCDay(); return w === 0 ? isoAdd(d, -2) : w === 6 ? isoAdd(d, -1) : d; }
  function sanitize(s, n) { return String(s == null ? '' : s).replace(/[<>]/g, '').slice(0, n); } /* las mismas reglas de main.js / persistence.py */

  /* ============================== interfaz de arranque ============================== */
  var boot = doc.getElementById('campoBoot');
  function status(msg, kind) {
    if (!boot) return;
    boot.dataset.state = kind || 'load';
    var m = boot.querySelector('[data-boot-msg]'); if (m) m.textContent = msg;
  }
  function fail(msg) {
    status(msg, 'error');
    var b = boot && boot.querySelector('[data-boot-retry]'); if (b) b.onclick = function () { location.reload(); };
  }

  /* ============================== sesión y API ============================== */
  function A() { return W.BlackPortfolioAuth; }
  function waitUser() {
    return new Promise(function (res) { var off = A().firebaseAuth.onAuthStateChanged(function (u) { if (off) off(); res(u); }); });
  }
  /* el mismo control que main.js: si el usuario tiene 2FA y no lo verificó en esta sesión (ni es dispositivo de confianza), al login */
  async function gate2fa(user) {
    if (sessionStorage.getItem('totp_verified') === user.uid) return true;
    var isDemo = false, trusted = false;
    try { isDemo = JSON.parse(localStorage.getItem('bp-extra-' + user.uid) || '{}').isDemo === true; } catch (e) { }
    try {
      var ts = parseInt(localStorage.getItem('totp_trusted_' + user.uid) || '', 10);
      trusted = isFinite(ts) && (Date.now() - ts) <= 3.5 * 24 * 60 * 60 * 1000 && !!localStorage.getItem('bp-2fa-token');
    } catch (e) { }
    if (!isDemo && !trusted && await A().isTwoFactorEnabled(user.uid)) return false;
    sessionStorage.setItem('totp_verified', user.uid);
    return true;
  }
  async function authGet(path) {
    var u = A().firebaseAuth.currentUser, tok = await u.getIdToken();
    var h = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, t2 = null;
    try { t2 = localStorage.getItem('bp-2fa-token'); } catch (e) { }
    if (t2) h['X-2FA-Token'] = t2;
    var r = await fetch(API + path, { headers: h, cache: 'no-store' });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) { var e = new Error(j && j.detail || ('HTTP ' + r.status)); e.status = r.status; e.detail = j && j.detail; throw e; }
    return j;
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function getJSON(url, tries) {
    tries = tries || 2;
    for (var k = 0; k < tries; k++) {
      try {
        var ctl = W.AbortController ? new AbortController() : null, to = ctl ? setTimeout(function () { ctl.abort(); }, 15000) : 0;
        var r = await fetch(url, ctl ? { signal: ctl.signal } : undefined); clearTimeout(to);
        if (r.status === 404) return null;
        if (r.ok) return await r.json();
        if (r.status === 429) await sleep(3000 * (k + 1));
      } catch (e) { /* red: reintenta */ }
      if (k < tries - 1) await sleep(900 * (k + 1));
    }
    return null;
  }
  async function pool(items, n, fn) {
    var i = 0, out = new Array(items.length);
    async function worker() { while (i < items.length) { var k = i++; out[k] = await fn(items[k], k); } }
    var ws = []; for (var w = 0; w < Math.min(n, items.length); w++) ws.push(worker());
    await Promise.all(ws); return out;
  }

  /* ============================== precios e historia ============================== */
  var HK = 'campo.hist.v1:';
  function hcGet(sym) { try { return JSON.parse(localStorage.getItem(HK + sym) || 'null'); } catch (e) { return null; } }
  function hcSet(sym, o) {
    try { localStorage.setItem(HK + sym, JSON.stringify(o)); }
    catch (e) { try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(HK) === 0) localStorage.removeItem(k); }); localStorage.setItem(HK + sym, JSON.stringify(o)); } catch (e2) { } }
  }
  function parseChart(j) {
    var r = j && j.chart && j.chart.result && j.chart.result[0]; if (!r) return null;
    var ts = r.timestamp || [], q = (r.indicators && r.indicators.quote && r.indicators.quote[0] && r.indicators.quote[0].close) || [], d = [], c = [];
    for (var i = 0; i < ts.length; i++) {
      var v = q[i]; if (!(v > 0)) continue;
      var iso = new Date(ts[i] * 1000).toISOString().slice(0, 10);
      if (d.length && d[d.length - 1] === iso) c[c.length - 1] = v; else if (!d.length || iso > d[d.length - 1]) { d.push(iso); c.push(v); }
    }
    var m = r.meta || {};
    return { d: d, c: c, m: { cur: m.currency || null, type: m.instrumentType || null, name: m.longName || m.shortName || null } };
  }
  /* la historia de días pasados no cambia: sirve la copia local si ya cubre la sesión de AYER de la rejilla */
  async function history(sym, range, interval, needFrom) {
    var key = sym + '|' + range + '|' + interval, hc = hcGet(key);
    if (hc && hc.d && hc.d.length && Date.now() - hc.ts < 20 * 3600e3 && (!needFrom || hc.d[hc.d.length - 1] >= needFrom)) return hc;
    var j = await getJSON(API + '/chart/' + encodeURIComponent(sym) + '?range=' + range + '&interval=' + interval, 3);
    var h = j ? parseChart(j) : null;
    if (h && h.d.length) { h.ts = Date.now(); hcSet(key, h); return h; }
    return hc && hc.d ? hc : null; /* sin red: la copia vieja es mejor que nada */
  }
  async function livePrices(syms) {
    var out = {}, chunks = [];
    for (var i = 0; i < syms.length; i += 50) chunks.push(syms.slice(i, i + 50));
    await pool(chunks, 2, async function (ch) {
      var j = await getJSON(API + '/prices?symbols=' + ch.map(encodeURIComponent).join(','), 2);
      if (j) Object.keys(j).forEach(function (k) { var q = j[k]; if (q && q.price > 0) out[up(k)] = { price: +q.price, prev: q.prev > 0 ? +q.prev : null }; });
    });
    return out;
  }

  /* ============================== rejilla y alineación ============================== */
  var grid = null;
  function makeGrid(sp, mx) {
    var d = sp && sp.d.length ? sp.d.slice() : [];
    /* hoy hubo sesión en la BMV pero no en Nueva York (festivo de EE. UU.): la rejilla incluye hoy */
    if (d.length && mx && mx.d.length) { var lm = mx.d[mx.d.length - 1]; if (lm > d[d.length - 1] && lm <= todayLocal()) d.push(lm); }
    if (!d.length) { var t = todayLocal(), w = new Date(isoMs(t)).getUTCDay(); d = [w === 0 || w === 6 ? prevWeekday(t) : t]; }
    d = d.slice(-TOT); while (d.length < TOT) d.unshift(prevWeekday(d[0]));
    return d;
  }
  function idxOn(iso) {
    if (!iso || iso < grid[0]) return -1; if (iso >= grid[LAST]) return LAST;
    var lo = 0, hi = LAST; while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (grid[mid] <= iso) lo = mid; else hi = mid - 1; } return lo;
  }
  function align(h) {
    var out = new Float64Array(TOT), j = 0, last = NaN, n = h ? h.d.length : 0, i;
    for (i = 0; i < TOT; i++) { while (j < n && h.d[j] <= grid[i]) { last = h.c[j]; j++; } out[i] = last; }
    var first = NaN; for (i = 0; i < TOT; i++) if (out[i] > 0) { first = out[i]; break; }
    for (i = 0; i < TOT && !(out[i] > 0); i++) out[i] = first;
    return out;
  }
  function seriesFor(h, live, fallback) {
    var a = align(h), ok = a[LAST] > 0, px = live && live.price > 0 ? live.price : null;
    if (!ok) { var v = px || fallback || 1; for (var i = 0; i < TOT; i++) a[i] = v; }
    if (px) a[LAST] = px;
    return { a: a, stale: !ok };
  }
  function lookupW(wk, iso) { /* serie semanal larga (fechas previas a la rejilla) */
    if (!wk || !wk.d.length) return NaN; var k = -1; for (var i = 0; i < wk.d.length; i++) { if (wk.d[i] <= iso) k = i; else break; }
    return wk.c[k < 0 ? 0 : k];
  }

  /* ============================== clasificación ============================== */
  function ccyOf(tk, cur, pfCcy) {
    var u = up(tk); for (var i = 0; i < SUF.length; i++) if (u.length > SUF[i][0].length && u.slice(-SUF[i][0].length) === SUF[i][0]) return SUF[i][1];
    return up(cur) || up(pfCcy) || 'USD';
  }
  function isCrypto(tk, meta) { return (meta && meta.type === 'CRYPTOCURRENCY') || CRYPTO.test(up(tk)); }
  function clsOf(tk, meta, ccy) {
    var u = up(tk), base = u.replace(/\.MX$/, '');
    if (isCrypto(u, meta)) return 'Cripto';
    if (DEBT.test(base)) return 'Deuda';
    if (/\.MX$/.test(u) && FIBRA.test(base)) return 'FIBRA';
    if (meta && meta.type === 'ETF') return 'ETF';
    if (/\.MX$/.test(u) || ccy === 'MXN') return 'Acción MX';
    return 'Acción EE. UU.';
  }

  /* ============================== libro de un portafolio ============================== */
  /* Cada transacción en SU fecha y con SU tipo de cambio. El efectivo vive en la moneda del portafolio (cashBalance);
     cada evento guarda e.mxn (para mostrar y para los flujos) y e.cpf (efecto en el efectivo, moneda del portafolio). */
  function buildLedger(P, ctx) {
    var pfCcy = up(P.currency) || 'USD', ev = [], seq = 0, held = {}, order = [], warn = [];
    var posBy = {}; (P.positions || []).forEach(function (x) { if (x && x.ticker && num(x.quantity) > 0) { var k = up(x.ticker); (posBy[k] = posBy[k] || []).push(x); } });
    function toMXN(ccy, idx, iso) {
      ccy = up(ccy) || 'MXN'; if (ccy === 'MXN') return 1;
      if (ccy === 'USD') { if (idx >= 0) return ctx.fx[idx]; var w = lookupW(ctx.fxW, iso); return w > 0 ? w : ctx.fx[0]; }
      var cr = ctx.cross[ccy]; if (cr) return idx >= 0 ? cr[idx] : cr[0];
      warn.push('Sin tipo de cambio para ' + ccy + ': se usó el del dólar.'); return idx >= 0 ? ctx.fx[idx] : ctx.fx[0];
    }
    function dispCcy(c) { return c === 'USD' || c === 'MXN' ? c : 'MXN'; } /* otras monedas se muestran ya convertidas a pesos */
    function hp(tk, name, ccy) {
      var h = held[tk]; if (h) return h;
      var e = ctx.paths[tk]; h = held[tk] = { ticker: tk, name: (e && e.name) || name || tk, ccy: e ? e.ccy : dispCcy(ccy), path: e ? e.path : null, lots: [], price: null, d1: 0, q: 0, avgQ: 0, avgC: 0 };
      order.push(tk); return h;
    }
    function add(e) { e.seq = seq++; e.pf = P.id; e.real = true; ev.push(e); return e; }

    /* 1) transacciones válidas, en orden de fecha (las guardadas van de la más nueva a la más vieja) */
    var TY = { COMPRA: 'buy', VENTA: 'sell', DIVIDENDO: 'div', DEPOSITO: 'dep', RETIRO: 'wd' };
    var list = [];
    (P.transactions || []).forEach(function (t, i) {
      if (!t || !TY[t.type]) return; var d = localDate(t.date); if (!d) return;
      list.push({ t: t, d: d, ms: Date.parse(t.date) || isoMs(d), i: i });
    });
    /* 2) posiciones que las transacciones no explican (capturadas antes del registro de movimientos): un lote de apertura
          con su precio promedio, en su fecha de compra; sin dinero en caja, cuenta como aportación de ese día */
    var netQ = {}, firstMs = {};
    list.forEach(function (o) { var k = up(o.t.ticker); if (o.t.type === 'COMPRA') netQ[k] = (netQ[k] || 0) + (num(o.t.quantity) || 0); else if (o.t.type === 'VENTA') netQ[k] = (netQ[k] || 0) - (num(o.t.quantity) || 0); if (firstMs[k] == null || o.ms < firstMs[k]) firstMs[k] = o.ms; });
    Object.keys(posBy).forEach(function (k) {
      var q = 0, cost = 0, x0 = posBy[k][0], pd = null;
      posBy[k].forEach(function (x) { q += num(x.quantity) || 0; cost += (num(x.avgPrice) || 0) * (num(x.quantity) || 0); var dd = localDate(x.purchaseDate); if (dd && (!pd || dd < pd)) pd = dd; });
      var miss = q - (netQ[k] || 0); if (miss <= 1e-7) return;
      var d = pd || localDate(P.createdAt) || grid[0], ms = isoMs(d) + 12 * 3600e3;
      if (firstMs[k] != null && ms > firstMs[k]) { ms = firstMs[k] - 1; d = localDate(new Date(ms).toISOString()); }
      list.push({ t: { type: 'COMPRA', ticker: k, quantity: miss, price: q ? cost / q : 0, commissionPercent: num(x0.commissionPercent) || 0, applyIva: !!x0.applyIva, ivaRate: num(x0.ivaRate) || 0, currency: x0.currency, cashApplied: 0 }, d: d, ms: ms, i: -1, synth: true });
    });
    list.sort(function (a, b) { return a.ms - b.ms || b.i - a.i; });

    /* 3) repetición: efectivo en la moneda del portafolio; costo promedio en pesos por emisora */
    var cash = 0;
    list.forEach(function (o) {
      var t = o.t, typ = TY[t.type], idx = idxOn(o.d), fxP = toMXN(pfCcy, idx, o.d), tk = up(t.ticker), q = num(t.quantity) || 0, px = num(t.price) || 0;
      if (typ === 'dep' || typ === 'wd') {
        var amt = Math.abs(fin(t.net) ? t.net : px * (q || 1)); if (!(amt > 0)) return;
        var amtPf = amt * toMXN(t.currency || pfCcy, idx, o.d) / fxP, cp = typ === 'dep' ? amtPf : -amtPf;
        cash += cp; add({ t: typ, idx: idx, date: o.d, mxn: r2(amtPf * fxP), cpf: cp, note: typ === 'dep' ? 'Aportación' : 'Retiro' });
        return;
      }
      if (!tk || !(q > 0)) return;
      var lc = (ctx.paths[tk] && ctx.paths[tk].origCcy) || ccyOf(tk, t.currency, pfCcy), fxL = toMXN(lc, idx, o.d), h = hp(tk, null, lc), ex = h.ccy === 'MXN' && lc !== 'MXN';
      var gross = q * px, comm = fin(t.commCost) ? t.commCost : gross * (num(t.commissionPercent) || 0) / 100;
      var iva = fin(t.ivaCost) ? t.ivaCost : (t.applyIva ? comm * (num(t.ivaRate) || 0) / 100 : 0);
      var pxD = ex ? px * fxL : px, fxD = ex ? 1 : fxL;
      if (typ === 'buy') {
        var netL = fin(t.net) && t.net > 0 ? t.net : gross + comm + iva, costPf = netL * fxL / fxP;
        var used = Math.min(fin(t.cashApplied) ? Math.max(0, -t.cashApplied) : costPf, Math.max(cash, 0), costPf), dep = costPf - used;
        if (dep > 0.005) { cash += dep; add({ t: 'dep', idx: idx, date: o.d, mxn: r2(dep * fxP), cpf: dep, note: o.synth ? 'Aportación (posición capturada sin movimiento)' : 'Aportación para la compra de ' + tk, auto: true }); }
        cash -= costPf;
        add({ t: 'buy', idx: idx, date: o.d, mxn: r2(costPf * fxP), cpf: -costPf, tk: tk, name: h.name, qty: q, px: pxD, ccy: h.ccy, fx: fxD, fee: r2((comm + iva) * fxL), note: (o.synth ? 'Posición inicial ' : 'Compra ') + tk, synth: !!o.synth });
        h.lots.push({ idx: idx, q: q }); h.q += q; h.avgQ += q; h.avgC += costPf * fxP;
      } else if (typ === 'sell') {
        if (h.q <= EPS) { warn.push('Venta de ' + tk + ' del ' + o.d + ' sin posición previa: no se tomó en cuenta.'); return; }
        var qs = Math.min(q, h.q), f = qs / q;
        var procL = (fin(t.net) && t.net > 0 ? t.net : gross - comm - iva) * f, procPf = fin(t.cashApplied) && t.cashApplied > 0 ? t.cashApplied * f : procL * fxL / fxP;
        cash += procPf;
        add({ t: 'sell', idx: idx, date: o.d, mxn: r2(procPf * fxP), cpf: procPf, tk: tk, name: h.name, qty: qs, px: pxD, ccy: h.ccy, fx: fxD, fee: r2((comm + iva) * f * fxL), note: 'Venta ' + tk });
        h.lots.push({ idx: idx, q: -qs }); var fr = h.avgQ > 0 ? Math.min(1, qs / h.avgQ) : 0; h.avgC -= h.avgC * fr; h.avgQ -= qs; h.q -= qs;
      } else if (typ === 'div') {
        var amtL = fin(t.net) && t.net > 0 ? t.net : gross, dPf = fin(t.cashApplied) && t.cashApplied > 0 ? t.cashApplied : amtL * fxL / fxP;
        if (!(dPf > 0)) return; cash += dPf;
        add({ t: 'div', idx: idx, date: o.d, mxn: r2(dPf * fxP), cpf: dPf, tk: tk, name: h.name, qty: q, px: pxD, ccy: h.ccy, fx: fxD, note: 'Dividendo ' + tk });
      }
    });

    /* Los ajustes van en la fecha del ÚLTIMO movimiento (de la emisora, o del portafolio): el efectivo y las cantidades solo
       cambian con movimientos, así que desde ahí ya valen lo registrado. Ponerlos "hoy" dibujaría una caída o un salto falso hoy. */
    var lastAt = { idx: -1, d: localDate(P.createdAt) || isoAdd(grid[0], -1) }, lastTk = {};
    list.forEach(function (o) { var ix = idxOn(o.d); if (ix >= lastAt.idx) lastAt = { idx: ix, d: o.d }; var k = up(o.t.ticker); if (k) lastTk[k] = { idx: ix, d: o.d }; });

    /* 4) cantidades que las transacciones dan de más (posición editada a mano): salen a su costo, como retiro en especie */
    order.forEach(function (tk) {
      var h = held[tk], want = 0; (posBy[tk] || []).forEach(function (x) { want += num(x.quantity) || 0; });
      var extra = h.q - want; if (extra <= 1e-7) return;
      var at = lastTk[tk] || lastAt, fxA = toMXN(pfCcy, at.idx, at.d), fxU = h.ccy === 'USD' ? toMXN('USD', at.idx, at.d) : 1;
      var c = h.avgQ > 0 ? h.avgC * Math.min(1, extra / h.avgQ) : 0, cp = c / fxA;
      add({ t: 'sell', idx: at.idx, date: at.d, mxn: r2(c), cpf: cp, tk: tk, name: h.name, qty: extra, px: h.avgQ > 0 ? (h.avgC / h.avgQ) / fxU : 0, ccy: h.ccy, fx: fxU, fee: 0, note: 'Ajuste: cantidad registrada en la posición', auto: true, adj: true });
      add({ t: 'wd', idx: at.idx, date: at.d, mxn: r2(c), cpf: -cp, note: 'Ajuste: cantidad registrada en la posición', auto: true, adj: true });
      h.lots.push({ idx: at.idx, q: -extra }); h.avgC -= c; h.avgQ -= extra; h.q -= extra;
    });

    /* 5) el efectivo es el registrado (cashBalance); si la repetición no cuadra, la diferencia entra como ajuste */
    var real = num(P.cashBalance); if (!isFinite(real)) real = 0;
    var diff = real - cash;
    if (Math.abs(diff) >= 0.01) {
      var fxC = toMXN(pfCcy, lastAt.idx, lastAt.d);
      add({ t: diff > 0 ? 'dep' : 'wd', idx: lastAt.idx, date: lastAt.d, mxn: r2(Math.abs(diff) * fxC), cpf: diff, note: 'Ajuste para cuadrar con el efectivo registrado', auto: true, adj: true });
      cash = real;
    }
    ev.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.seq - b.seq; });

    /* 6) series diarias: patrimonio V (con efectivo), flujos externos F, aportado y retirado acumulados, efectivo en pesos */
    var V = new Float64Array(TOT), F = new Float64Array(TOT), Dc = new Float64Array(TOT), Wc = new Float64Array(TOT), cashAt = new Float64Array(TOT), usd = new Float64Array(TOT);
    var addC = new Float64Array(TOT), dA = new Float64Array(TOT), wA = new Float64Array(TOT), c0 = 0, d0 = 0, w0 = 0, i, t2;
    ev.forEach(function (e) {
      if (e.idx < 0) { c0 += e.cpf; if (e.t === 'dep') d0 += e.mxn; else if (e.t === 'wd') w0 += e.mxn; }
      else { addC[e.idx] += e.cpf; if (e.t === 'dep') { F[e.idx] += e.mxn; dA[e.idx] += e.mxn; } else if (e.t === 'wd') { F[e.idx] -= e.mxn; wA[e.idx] += e.mxn; } }
    });
    var fxPf = new Float64Array(TOT); for (i = 0; i < TOT; i++) fxPf[i] = toMXN(pfCcy, i, grid[i]);
    var hs = order.map(function (tk) { return held[tk]; });
    hs.forEach(function (h) {
      if (!h.path) { var lastPx = 0; ev.forEach(function (e) { if (e.tk === h.ticker && e.px > 0) lastPx = e.px; }); h.path = new Float64Array(TOT).fill(lastPx || 1); h.stale = true; }
      h.price = h.path[LAST]; h.d1 = h.path[LAST - 1] > 0 ? (h.path[LAST] / h.path[LAST - 1] - 1) * 100 : 0;
    });
    var c = c0;
    for (t2 = 0, i = 0; t2 < TOT; t2++) {
      c += addC[t2]; cashAt[t2] = c * fxPf[t2]; var v = cashAt[t2], uL = pfCcy === 'USD' ? c : 0;
      for (var k = 0; k < hs.length; k++) {
        var h = hs[k], q = 0; for (var l = 0; l < h.lots.length; l++) if (h.lots[l].idx <= t2) q += h.lots[l].q;
        if (q > 1e-12) { v += q * h.path[t2] * (h.ccy === 'USD' ? ctx.fx[t2] : 1); if (h.ccy === 'USD') uL += q * h.path[t2]; }
      }
      V[t2] = v; usd[t2] = uL;
    }
    for (t2 = 0; t2 < TOT; t2++) { d0 += dA[t2]; w0 += wA[t2]; Dc[t2] = d0; Wc[t2] = w0; }

    /* 7) renglones de hoy (cantidad final de los lotes, costo promedio en pesos) */
    var rows = [];
    hs.forEach(function (h) {
      var q = 0; h.lots.forEach(function (l) { q += l.q; }); q = +q.toFixed(8); if (q <= 1e-9) return;
      var isU = h.ccy === 'USD', pos = (posBy[h.ticker] || [])[0], meta = ctx.paths[h.ticker];
      rows.push({ ticker: h.ticker, name: h.name, cls: meta ? meta.cls : clsOf(h.ticker, null, h.ccy), qty: q, price: h.price, prev: h.path[LAST - 1], d1: h.d1, ccy: h.ccy, isU: isU,
        cost: r2(h.avgC), mv: q * h.price * (isU ? ctx.fx[LAST] : 1), local: q * h.price, avg: pos ? num(pos.avgPrice) || 0 : (h.avgQ > 0 ? h.avgC / h.avgQ : 0), stale: !!h.stale });
    });
    return { id: P.id, name: sanitize(P.name, 120) || 'Portafolio', events: ev, rows: rows, V: V, F: F, Dc: Dc, Wc: Wc, cashAt: cashAt, usdLocal: usd, dates: grid,
      fxLast: ctx.fx[LAST], fxPrev: ctx.fx[LAST - 1], benchmark: BENCH[P.benchmark] || 'S&P 500', held: hs.map(function (h) { return { ticker: h.ticker, name: h.name, ccy: h.ccy, path: h.path, lots: h.lots, price: h.price, d1: h.d1 }; }),
      cashPf: cash, pfCcy: pfCcy, warnings: warn };
  }

  /* ============================== armado ============================== */
  async function load() {
    status('Verificando tu sesión…');
    var user = await waitUser();
    if (!user) { location.href = 'login.html'; return; }
    if (!(await gate2fa(user))) { location.href = 'login.html'; return; }
    try { A().startSessionTimeout(); } catch (e) { }

    status('Leyendo tus portafolios…');
    var boot0;
    try { boot0 = await authGet('/account/bootstrap'); }
    catch (e) {
      if (e.status === 403 && /2fa/.test(e.detail || '')) {
        try { sessionStorage.removeItem('totp_verified'); localStorage.removeItem('bp-2fa-token'); sessionStorage.removeItem('bp-2fa-token'); } catch (x) { }
        location.href = 'login.html'; return;
      }
      if (e.status === 403 && e.detail === 'beta_closed') { try { await A().firebaseAuth.signOut(); sessionStorage.clear(); } catch (x) { } location.href = 'login.html?beta=closed'; return; }
      if (e.status === 401) { location.href = 'login.html'; return; }
      fail('No pudimos leer tus portafolios. Tus datos están a salvo; revisa tu conexión e inténtalo de nuevo.'); throw e;
    }
    var pfs = (Array.isArray(boot0.portfolios) ? boot0.portfolios : []).filter(function (p) { return p && p.id && p.id !== '__ALL__'; });

    /* emisoras con exposición en el último año: las de hoy y las que se movieron en la ventana */
    var since = isoAdd(todayLocal(), -380), tks = {}, ccys = {};
    pfs.forEach(function (P) {
      (P.positions || []).forEach(function (x) { if (x && x.ticker && num(x.quantity) > 0) tks[up(x.ticker)] = 1; });
      (P.transactions || []).forEach(function (t) { if (t && t.ticker && /^(COMPRA|VENTA|DIVIDENDO)$/.test(t.type) && (localDate(t.date) || '') >= since) tks[up(t.ticker)] = 1; });
      var pc = up(P.currency) || 'USD'; if (pc !== 'USD' && pc !== 'MXN') ccys[pc] = 1;
    });
    delete tks.CASH; delete tks[''];
    var tickers = Object.keys(tks);
    tickers.forEach(function (tk) { var c = ccyOf(tk, null, null); if (c !== 'USD' && c !== 'MXN') ccys[c] = 1; });

    status('Trayendo precios de hoy…');
    var mk = MKT.concat(EXTRA), crossSyms = Object.keys(ccys).map(function (c) { return c + 'MXN=X'; });
    var live = await livePrices(tickers.concat(mk.map(function (m) { return m.y; }), crossSyms));

    status('Trayendo la historia de un año…');
    var sp = await history('^GSPC', '1y', '1d'), mx = await history('^MXX', '1y', '1d');
    grid = makeGrid(sp, mx);
    var need = grid[LAST - 1], done = 0, total = mk.length + tickers.length + crossSyms.length + 1;
    function tick() { done++; status('Trayendo la historia de un año… ' + Math.min(99, Math.round(done / total * 100)) + ' %'); }
    var H = {}; H['^GSPC'] = sp; H['^MXX'] = mx;
    var jobs = mk.map(function (m) { return m.y; }).filter(function (y) { return !H[y]; }).concat(crossSyms, tickers);
    await pool(jobs, 4, async function (sym) { H[sym] = await history(sym, '1y', '1d', need); tick(); });
    var fxW = await history('MXN=X', '10y', '1wk'); tick();

    /* tipo de cambio de cada sesión; hoy, el de ahora */
    var fxS = seriesFor(H['MXN=X'], live['MXN=X'], 18).a, ctx = { fx: fxS, fxW: fxW, cross: {}, paths: {} };
    Object.keys(ccys).forEach(function (c) { var s = c + 'MXN=X'; if (H[s] || live[s]) ctx.cross[c] = seriesFor(H[s], live[s], null).a; });

    /* trayectoria de cada emisora en su moneda (o en pesos si es otra moneda) */
    var warnings = [];
    tickers.forEach(function (tk) {
      var h = H[tk], lq = live[tk], fallback = null, posCur = null, txCur = null, pfCur = null;
      pfs.forEach(function (P) {
        (P.positions || []).forEach(function (x) { if (up(x.ticker) === tk) { if (num(x.avgPrice) > 0) fallback = num(x.avgPrice); posCur = posCur || x.currency; pfCur = pfCur || P.currency; } });
        (P.transactions || []).forEach(function (t) { if (t && up(t.ticker) === tk) { txCur = txCur || t.currency; pfCur = pfCur || P.currency; } });
      });
      /* misma regla que getPosCurrency: sufijo del ticker, luego la moneda guardada, luego la del proveedor, luego la del portafolio */
      var cc = ccyOf(tk, posCur || txCur || (h && h.m && h.m.cur), pfCur);
      var s = seriesFor(h, lq, fallback), a = s.a, disp = cc === 'USD' || cc === 'MXN' ? cc : 'MXN';
      if (disp !== cc) { var cr = ctx.cross[cc]; for (var i = 0; i < TOT; i++) a[i] *= cr ? cr[i] : fxS[i]; }
      if (s.stale) warnings.push(tk + ': sin precio de mercado; se muestra a su costo.');
      var meta = h && h.m;
      ctx.paths[tk] = { path: a, ccy: disp, origCcy: cc, name: sanitize((meta && meta.name) || tk, 80), cls: clsOf(tk, meta, cc), price: a[LAST], d1: a[LAST - 1] > 0 ? (a[LAST] / a[LAST - 1] - 1) * 100 : 0, stale: s.stale };
    });

    /* libros reales */
    var plan = (boot0.user && boot0.user.plan) || 'Explorer';
    var specs = pfs.map(function (P, k) {
      var L = buildLedger(P, ctx); L.warnings.forEach(function (w) { warnings.push(L.name + ': ' + w); });
      return { id: String(P.id), name: L.name, desc: sanitize(P.description, 500), color: (k % 6) + 1, currency: L.pfCcy, created: localDate(P.createdAt) || grid[0], benchmark: L.benchmark, ledger: L };
    });

    /* Inicio: todos los portafolios juntos */
    var agg = { V: new Float64Array(TOT), F: new Float64Array(TOT) }, byTk = {}, rows = [];
    specs.forEach(function (s) {
      for (var i = 0; i < TOT; i++) { agg.V[i] += s.ledger.V[i]; agg.F[i] += s.ledger.F[i]; }
      s.ledger.rows.forEach(function (r) {
        var m = byTk[r.ticker]; if (!m) { m = byTk[r.ticker] = { ticker: r.ticker, name: r.name, cls: r.cls, ccy: r.ccy, qty: 0, avg: r.avg, price: r.price, d1: r.d1, value: 0, cost: 0 }; rows.push(m); }
        m.qty += r.qty; m.value += r.mv; m.cost += r.cost;
      });
    });
    var totV = agg.V[LAST];
    rows.forEach(function (m) { m.pnl = m.value - m.cost; m.pnlPct = m.cost ? (m.value / m.cost - 1) * 100 : 0; m.weight = totV ? m.value / totV * 100 : 0; });
    rows.sort(function (a, b) { return b.value - a.value; });
    var port = new Array(TOT), g = 100; port[0] = 100;
    for (var t = 1; t < TOT; t++) { var den = agg.V[t - 1] + agg.F[t]; if (den > 0) g *= agg.V[t] / den; port[t] = g; }
    var kk = totV / port[LAST] || 0; for (t = 0; t < TOT; t++) port[t] *= kk;

    var markets = mk.map(function (m) {
      var s = seriesFor(H[m.y], live[m.y], null), h = Array.prototype.slice.call(s.a);
      var last = h[LAST], prev = h[LAST - 1], o = { sym: m.sym, y: m.y, last: last, chg: m.unit === '%' ? last - prev : (prev ? (last / prev - 1) * 100 : 0), hist: h, stale: s.stale };
      if (m.unit) o.unit = m.unit; o.spark = h.slice(-40).map(function (v) { return v / h[TOT - 40] * 100; });
      return o;
    });
    var spx = markets.filter(function (m) { return m.sym === 'S&P 500'; })[0].hist, k0 = spx[0] * fxS[0];
    var bench = spx.map(function (v, i) { return (port[0] || 100) * v * fxS[i] / k0; });

    var now = new Date(), asOf = pad(now.getDate()) + '-' + MES[now.getMonth()] + '-' + now.getFullYear() + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());
    var u = boot0.user || {}, fu = A().firebaseAuth.currentUser || {};
    W.PORTIFY_DEMO = {
      brand: 'Portify', real: true, asOf: asOf, base: 'MXN', usdmxn: fxS[LAST],
      total: totV, cost: 0, invested: 0, pnl: 0, pnlPct: 0, dayChange: 0, dayChangePct: 0,
      positions: rows,
      series: { dates: grid.slice(), portfolio: port, benchmark: bench, benchmarkName: 'S&P 500 (en MXN)' },
      markets: markets, news: [], insight: { label: '', headline: '', body: '' }, events: { earnings: [], econ: [] },
      montecarlo: null,
      plans: [
        { name: 'Explorer', usd: 0, usdYear: 0, mxn: 'No pide tarjeta', portfolios: '1', positions: '10', ai: 5, cta: 'Empezar gratis' },
        { name: 'Investor', usd: 19, usdYear: 15, mxn: '≈ $349 MXN', portfolios: '3', positions: '50', ai: 25, cta: 'Elegir Investor' },
        { name: 'Advisor Pro', usd: 59, usdYear: 47, mxn: '≈ $1,090 MXN', portfolios: 'Ilimitados', positions: 'Ilimitadas', ai: 60, cta: 'Elegir Advisor Pro' },
        { name: 'Wealth Desk', usd: 129, usdYear: 103, mxn: '≈ $2,390 MXN', portfolios: 'Ilimitados', positions: 'Ilimitadas', ai: 120, cta: 'Hablar con nosotros' }
      ],
      user: { email: u.email || fu.email || '', name: u.displayName || fu.displayName || '', plan: plan, role: u.role || '' },
      fmt: {
        mxn: function (v, dec) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: dec == null ? 0 : dec }).format(v); },
        num: function (v, dec) { return new Intl.NumberFormat('es-MX', { maximumFractionDigits: dec == null ? 2 : dec, minimumFractionDigits: dec == null ? 2 : dec }).format(v); },
        pct: function (v, dec) { var s = v > 0 ? '+' : v < 0 ? '−' : ''; return s + new Intl.NumberFormat('es-MX', { maximumFractionDigits: dec == null ? 2 : dec, minimumFractionDigits: dec == null ? 2 : dec }).format(Math.abs(v)) + ' %'; }
      }
    };
    var catalog = tickers.map(function (tk) { var e = ctx.paths[tk]; return { ticker: tk, name: e.name, cls: e.cls, currency: e.ccy, price: e.price, d1: e.d1 }; });
    W.CAMPO_REAL = {
      readonly: true, readonlyMsg: READONLY, plan: plan, limit: { plan: plan, max: PLAN_MAX[plan] || 1 },
      portfolios: specs, paths: ctx.paths, catalog: catalog, grid: grid, fx: fxS, warnings: warnings, version: boot0.portfolioVersion || 0,
      extraMarkets: EXTRA.map(function (m) { var s = seriesFor(H[m.y], live[m.y], null), h = Array.prototype.slice.call(s.a); return { sym: m.sym, last: h[LAST], chg: h[LAST - 1] ? (h[LAST] / h[LAST - 1] - 1) * 100 : 0, spark: h.slice(-40).map(function (v) { return v / h[TOT - 40] * 100; }), stale: s.stale }; })
    };
    if (warnings.length && W.console) console.info('[Portify] avisos del adaptador:', warnings);
    doc.documentElement.classList.add('campo-ro');
    return true;
  }

  /* ============================== carga de los módulos ============================== */
  function loadScripts(list) {
    return new Promise(function (res, rej) {
      var n = 0; if (!list.length) return res();
      list.forEach(function (src) {
        var s = doc.createElement('script'); s.src = src; s.async = false;
        s.onload = function () { if (++n === list.length) res(); };
        s.onerror = function () { rej(new Error('No cargó ' + src)); };
        doc.body.appendChild(s);
      });
    });
  }
  W.CampoDatos = {
    ready: load().then(function (ok) {
      if (!ok) return new Promise(function () { }); /* redirigiendo al login: no cargues nada */
      status('Dibujando…');
      return loadScripts((W.CAMPO_MODULES || []).slice());
    }).then(function () { if (boot) boot.dataset.state = 'done'; doc.dispatchEvent(new CustomEvent('campo:ready')); })
      .catch(function (e) { if (W.console) console.error(e); if (!boot || boot.dataset.state !== 'error') fail('Algo falló al preparar la app. Tus datos están a salvo.'); })
  };
})();
