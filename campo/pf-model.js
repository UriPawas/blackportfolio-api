/* Campo · Motor de cálculo de Rebalanceo, Monte Carlo, Metas, What-If y Dividendos — window.CampoModel.
   UNA fuente de supuestos, covarianzas y precios para esas pestañas, la misma de Resumen, Desempeño y Correlación:
   precios = CampoTracker.pricePathMxn (modelo de factores) y libro de movimientos = CampoPfResumen.calc.buildLedger.
   Correcciones respecto al producto real (main.js), escritas a propósito:
   1) La merma por volatilidad se descuenta UNA vez: el supuesto es un rendimiento aritmético E y la deriva log es ln(1+E) − σ²/2.
   2) Con 1 año de historia la media muestral es ruido: la deriva mezcla muestra y prior por clase (κ = 9 → 10 % / 90 %).
   3) Pesos de hoy con la inflación de México y aportaciones indexadas opcionales; la meta "real" se compara en las mismas unidades.
   4) Covarianza con correlaciones encogidas hacia la media; Máx. Sharpe usa la deriva encogida y un tope por activo.
   5) Metas exactas por linealidad: en cada trayectoria V_T = A + c·B, así que la aportación necesaria es un cuantil, sin bisección.
   6) What-If con TUS flujos en sus fechas (no un monto inicial) y pruebas de estrés con betas estimadas por clase.
   En producción, con los datos reales de campo/datos.js. */
(function () {
  'use strict';
  var D = window.PORTIFY_DEMO, T = window.CampoTracker, R = window.CampoPfResumen;
  if (!D || !T || !R || !R.calc) return;
  var C = R.calc, TOT = 252, LAST = TOT - 1, NR = LAST;

  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function normal(rnd) { var s = null; return function () { if (s !== null) { var t = s; s = null; return t; } var u = 1 - rnd(), v = rnd(), r = Math.sqrt(-2 * Math.log(u)); s = r * Math.sin(2 * Math.PI * v); return r * Math.cos(2 * Math.PI * v); }; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sum(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; }

  /* ============================== supuestos ============================== */
  var A = {
    rf: 0.0725,         /* Cetes 28, anual: tasa libre de riesgo en MXN (la misma de Desempeño) */
    infl: 0.038,        /* inflación esperada en México */
    kappa: 9,           /* fuerza del prior en años de historia: con 1 año de muestra, la muestra pesa 1/(1+9) = 10 % */
    kUnc: 30,           /* incertidumbre de la deriva: el prior equivale a 30 años de historia → σ/√(Y+30) por año */
    shrink: 0.25,       /* encogimiento de correlaciones hacia la correlación media */
    cap: 0.35,          /* tope por activo en los objetivos sugeridos */
    commission: 0.0025, iva: 0.16,               /* comisión por operación + IVA */
    isr: 0.10, isrCrypto: 0.30,                  /* ISR: 10 % sobre ganancia en BMV/SIC; cripto se acumula (aquí, tasa marginal estimada) */
    divWhMx: 0.10, divWhUs: 0.10,                /* retención de dividendos: 10 % México; 10 % EE. UU. con W-8BEN */
    nu: 5               /* grados de libertad de la t-Student */
  };
  /* prior por clase: rendimiento ARITMÉTICO anual esperado, nominal en MXN (supuestos de largo plazo, no pronósticos) */
  var CLS = { 'eq-us': ['Renta variable EE. UU.', 0.095], 'eq-mx': ['Renta variable México', 0.105], fibra: ['FIBRAs', 0.095], debt: ['Deuda en pesos', null], crypto: ['Cripto', 0.12] };
  /* los priors son nominales en pesos; en otra moneda base se ajustan por la diferencia de tasas (paridad: el peso rinde más porque se espera que se deprecie) */
  function priorOf(ck) { return ck === 'debt' ? A.rf : CLS[ck][1] + (A.rf - 0.0725); }
  /* tasa libre de riesgo e inflación de la MONEDA BASE de la vista (producción: cada portafolio en su moneda) */
  var RFB = { MXN: [0.0725, 0.038], USD: [0.043, 0.027], EUR: [0.0215, 0.022], GBP: [0.04, 0.03], CAD: [0.03, 0.025], BRL: [0.145, 0.045] };
  function syncBase() { var b = RFB[T.base] || RFB.MXN; A.rf = b[0]; A.infl = b[1]; }
  function clsKey(t, ccy) {
    var c = C.clsOf ? C.clsOf(t) : '';
    if (/Cripto/.test(c)) return 'crypto'; if (/Deuda/.test(c)) return 'debt'; if (/FIBRA/i.test(c)) return 'fibra';
    if (/MX/.test(c)) return 'eq-mx'; if (/EE\. UU\./.test(c)) return 'eq-us'; return ccy === 'USD' ? 'eq-us' : 'eq-mx';
  }

  /* ============================== datos base ============================== */
  function ledger(pf) {
    if (pf === 'todos' || (pf && pf.id === 'todos')) return C.aggregate(T);
    var p = typeof pf === 'string' ? T.get(pf) : pf; return p ? C.buildLedger(T, p) : null;
  }
  function mk(sym) { var h = null; D.markets.forEach(function (m) { if (m.sym === sym) h = m.hist; }); return h ? h.slice(h.length - TOT) : null; }
  function lrs(a) { var r = new Float64Array(NR); for (var i = 1; i < TOT; i++) r[i - 1] = Math.log(a[i] / a[i - 1]); return r; }
  var FAC = null;
  syncBase();
  if (T.on) T.on('change', function (ev) { if (ev && ev.type === 'base') { FAC = null; syncBase(); } });
  function fac() {
    if (FAC) return FAC;
    var S = lrs(mk('S&P 500')), N = lrs(mk('Nasdaq 100')), Tc = new Float64Array(NR);
    for (var i = 0; i < NR; i++) Tc[i] = N[i] - S[i];
    return (FAC = { SP: S, TEC: Tc, IPC: lrs(mk('S&P/BMV IPC')), BTC: lrs(mk('Bitcoin')), FX: lrs(T.fx.series), B: lrs(window.CAMPO_REAL ? C.benchOf(T, 'S&P 500').a : D.series.benchmark.slice(-TOT)) });
  }
  /* mínimos cuadrados con intercepto: y ~ b0 + Σ bj·xj (eliminación gaussiana con pivoteo) */
  function ols(y, cols) {
    var p = cols.length + 1, M = [], i, j, t, r;
    for (i = 0; i < p; i++) M.push(new Float64Array(p + 1));
    var x = new Float64Array(p); x[0] = 1;
    for (t = 0; t < NR; t++) { for (j = 1; j < p; j++) x[j] = cols[j - 1][t]; for (i = 0; i < p; i++) { for (j = 0; j < p; j++) M[i][j] += x[i] * x[j]; M[i][p] += x[i] * y[t]; } }
    for (i = 0; i < p; i++) {
      var piv = i; for (r = i + 1; r < p; r++) if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r;
      var tmp = M[i]; M[i] = M[piv]; M[piv] = tmp; if (Math.abs(M[i][i]) < 1e-18) continue;
      for (r = 0; r < p; r++) if (r !== i) { var f = M[r][i] / M[i][i]; for (j = i; j <= p; j++) M[r][j] -= f * M[i][j]; }
    }
    var b = []; for (i = 0; i < p; i++) b.push(Math.abs(M[i][i]) < 1e-18 ? 0 : M[i][p] / M[i][i]); return b;
  }
  function chol(S) {
    var n = S.length, L = [], i, j, q; for (i = 0; i < n; i++) L.push(new Float64Array(n));
    for (i = 0; i < n; i++) for (j = 0; j <= i; j++) { var s = S[i][j]; for (q = 0; q < j; q++) s -= L[i][q] * L[j][q]; if (i === j) L[i][i] = Math.sqrt(Math.max(s, 1e-14)); else L[i][j] = s / L[j][j]; }
    return L;
  }

  /* ============================== entradas por portafolio ==============================
     inputs(pf, drift) → activos con peso, σ, β, deriva (muestra / prior / mezcla), covarianza encogida y su Cholesky. */
  var inCache = {};
  function inputs(pf, drift) {
    drift = drift || 'blend';
    var L = ledger(pf); if (!L) return null;
    var key = (T.base || '') + '|' + L.id + '|' + drift + '|' + Math.round(L.value) + '|' + L.rows.length; if (inCache[key]) return inCache[key];
    var F = fac(), rows = L.rows.filter(function (r) { return r.mv > 0; }), k = rows.length, Y = NR / 252, i, j, t;
    var X = rows.map(function (r) { return lrs(T.pricePathMxn({ ticker: r.ticker, price: r.price, d1: r.d1, currency: r.ccy })); });
    var mean = X.map(function (x) { return sum(x) / NR; });
    var Xd = X.map(function (x, i) { var o = new Float64Array(NR); for (var t = 0; t < NR; t++) o[t] = x[t] - mean[i]; return o; });
    var S = []; for (i = 0; i < k; i++) S.push(new Float64Array(k));
    for (i = 0; i < k; i++) for (j = i; j < k; j++) { var c = 0; for (t = 0; t < NR; t++) c += Xd[i][t] * Xd[j][t]; S[i][j] = S[j][i] = c / (NR - 1) * 252; }
    var sd = []; for (i = 0; i < k; i++) sd.push(Math.sqrt(Math.max(S[i][i], 1e-12)));
    var rbar = 0, np = 0; for (i = 0; i < k; i++) for (j = i + 1; j < k; j++) { rbar += S[i][j] / (sd[i] * sd[j]); np++; } rbar = np ? rbar / np : 0;
    var cov = [], corr = []; for (i = 0; i < k; i++) { cov.push(new Float64Array(k)); corr.push(new Float64Array(k)); }
    for (i = 0; i < k; i++) for (j = 0; j < k; j++) { var rr = i === j ? 1 : (1 - A.shrink) * S[i][j] / (sd[i] * sd[j]) + A.shrink * rbar; corr[i][j] = rr; cov[i][j] = rr * sd[i] * sd[j]; }
    var bm = sum(F.B) / NR, vB = 0; for (t = 0; t < NR; t++) vB += (F.B[t] - bm) * (F.B[t] - bm);
    var tot = 0; rows.forEach(function (r) { tot += r.mv; });
    var ws = drift === 'prior' ? 0 : drift === 'sample' ? 1 : Y / (Y + A.kappa);
    var assets = rows.map(function (r, i) {
      var cb = 0; for (t = 0; t < NR; t++) cb += Xd[i][t] * (F.B[t] - bm);
      var ck = clsKey(r.ticker, r.ccy), E0 = priorOf(ck), s2 = sd[i] * sd[i], muS = mean[i] * 252, muP = Math.log(1 + E0) - s2 / 2, mu = ws * muS + (1 - ws) * muP;
      /* betas locales por clase para las pruebas de estrés (rendimiento en su moneda: a los activos en USD se les quita el USD/MXN) */
      var loc = X[i]; if (r.isU) { var lpth = T.pricePath({ ticker: r.ticker, price: r.price, d1: r.d1, currency: r.ccy }); if (window.CAMPO_REAL && lpth) loc = lrs(lpth); else { loc = new Float64Array(NR); for (t = 0; t < NR; t++) loc[t] = X[i][t] - F.FX[t]; } }
      var fb = {};
      if (ck === 'eq-us') { var b1 = ols(loc, [F.SP, F.TEC]); fb = { SP: b1[1], TEC: b1[2] }; }
      else if (ck === 'eq-mx' || ck === 'fibra') { var b2 = ols(loc, [F.IPC, F.SP]); fb = { IPC: b2[1], SP: b2[2] }; }
      else if (ck === 'crypto') { var b3 = ols(loc, [F.BTC, F.SP]); fb = { BTC: b3[1], SP: b3[2] }; }
      return { ticker: r.ticker, name: r.name, cls: r.cls, ck: ck, clsName: CLS[ck][0], ccy: r.ccy, isU: r.isU, qty: r.qty, price: r.price,
        pxMxn: r.price * (T.rate ? T.rate(r.ccy) : (r.isU ? T.fx.usdmxn : 1)), mv: r.mv, w: r.mv / tot, basis: r.cost, sigma: sd[i], beta: vB ? cb / vB : 0,
        muS: muS, muP: muP, mu: mu, er: Math.exp(mu + s2 / 2) - 1, prior: E0, fb: fb };
    });
    var out = { id: L.id, name: L.name, pf: pf, L: L, drift: drift, value: L.value, cash: Math.max(0, L.cashEnd || 0), invested: L.dep - L.wd, k: k, Y: Y,
      assets: assets, cov: cov, corr: corr, chol: chol(cov), X: Xd, rbar: rbar, A: A };
    out.port = stats(out);
    return (inCache[key] = out);
  }
  function weightsOf(inp) { return inp.assets.map(function (a) { return a.w; }); }

  /* riesgo y rendimiento esperados de unos pesos (rebalanceo continuo) */
  function stats(inp, w) {
    w = w || weightsOf(inp);
    var k = w.length, cov = inp.cov, Sw = new Float64Array(k), v = 0, er = 0, beta = 0, i, j;
    for (i = 0; i < k; i++) { for (j = 0; j < k; j++) Sw[i] += cov[i][j] * w[j]; v += w[i] * Sw[i]; er += w[i] * inp.assets[i].er; beta += w[i] * inp.assets[i].beta; }
    var sig = Math.sqrt(Math.max(v, 0)), mu = Math.log(1 + er) - v / 2, rc = [];
    for (i = 0; i < k; i++) rc.push(v ? w[i] * Sw[i] / v : 0);
    return { er: er, sigma: sig, mu: mu, sharpe: sig ? (er - A.rf) / sig : 0, beta: beta, rc: rc,
      loss1y95: 1 - Math.exp(mu - 1.6449 * sig) /* pérdida a 1 año que solo se supera 1 de cada 20 años */ };
  }

  /* ============================== objetivos sugeridos ============================== */
  function capOf(k) { return Math.max(A.cap, 1 / k + 0.05); }
  function project(v, cap) { /* proyección euclidiana sobre {0 ≤ w ≤ cap, Σw = 1} */
    var k = v.length, lo = Infinity, hi = -Infinity, i, w = new Float64Array(k), it, tau, s;
    for (i = 0; i < k; i++) { if (v[i] < lo) lo = v[i]; if (v[i] > hi) hi = v[i]; } lo -= cap;
    for (it = 0; it < 90; it++) { tau = (lo + hi) / 2; s = 0; for (i = 0; i < k; i++) s += Math.min(cap, Math.max(0, v[i] - tau)); if (s > 1) lo = tau; else hi = tau; }
    tau = (lo + hi) / 2; s = 0; for (i = 0; i < k; i++) { w[i] = Math.min(cap, Math.max(0, v[i] - tau)); s += w[i]; }
    for (i = 0; i < k; i++) w[i] /= s; return w;
  }
  function lmax(cov) { var k = cov.length, x = new Float64Array(k).fill(1), l = 0; for (var it = 0; it < 40; it++) { var y = new Float64Array(k), n = 0; for (var i = 0; i < k; i++) { for (var j = 0; j < k; j++) y[i] += cov[i][j] * x[j]; n += y[i] * y[i]; } n = Math.sqrt(n); l = n / Math.sqrt(sum(x.map(function (q) { return q * q; }))); for (i = 0; i < k; i++) x[i] = y[i] / n; } return l; }
  function mulv(cov, w) { var k = w.length, o = new Float64Array(k); for (var i = 0; i < k; i++) for (var j = 0; j < k; j++) o[i] += cov[i][j] * w[j]; return o; }
  function minVar(inp) {
    var cov = inp.cov, k = cov.length, cap = capOf(k), w = new Float64Array(k).fill(1 / k), step = 1 / (2 * lmax(cov) + 1e-12);
    for (var it = 0; it < 800; it++) { var g = mulv(cov, w), v = new Float64Array(k); for (var i = 0; i < k; i++) v[i] = w[i] - step * 2 * g[i]; w = project(v, cap); }
    return w;
  }
  function riskParity(inp) {
    var cov = inp.cov, k = cov.length, cap = capOf(k), w = new Float64Array(k), i;
    for (i = 0; i < k; i++) w[i] = 1 / Math.sqrt(cov[i][i]); w = project(w.map(function (x) { return x / sum(w); }), 1);
    for (var it = 0; it < 400; it++) {
      var Sw = mulv(cov, w), v = 0; for (i = 0; i < k; i++) v += w[i] * Sw[i];
      var n = new Float64Array(k); for (i = 0; i < k; i++) n[i] = w[i] * Math.sqrt((v / k) / Math.max(w[i] * Sw[i], 1e-16));
      var s = sum(n); for (i = 0; i < k; i++) n[i] /= s; w = project(n, cap);
    }
    return w;
  }
  function maxSharpe(inp) {
    var cov = inp.cov, k = cov.length, cap = capOf(k), e = inp.assets.map(function (a) { return a.er - A.rf; }), i;
    if (Math.max.apply(null, e) <= 0) return minVar(inp);
    function f(w) { var s = Math.sqrt(Math.max(1e-16, sum(Array.prototype.map.call(mulv(cov, w), function (x, i) { return x * w[i]; })))), r = 0; for (var i = 0; i < k; i++) r += e[i] * w[i]; return r / s; }
    var w = new Float64Array(k).fill(1 / k), best = w, fb = f(w);
    for (var it = 0; it < 900; it++) {
      var Sw = mulv(cov, w), v = 0, ex = 0; for (i = 0; i < k; i++) { v += w[i] * Sw[i]; ex += e[i] * w[i]; }
      var s = Math.sqrt(Math.max(v, 1e-16)), g = new Float64Array(k), gn = 0;
      for (i = 0; i < k; i++) { g[i] = e[i] / s - ex * Sw[i] / (s * s * s); gn += g[i] * g[i]; } gn = Math.sqrt(gn) || 1;
      var eta = 0.06 / Math.sqrt(1 + it / 40), n = new Float64Array(k); for (i = 0; i < k; i++) n[i] = w[i] + eta * g[i] / gn;
      w = project(n, cap); var fw = f(w); if (fw > fb) { fb = fw; best = w; }
    }
    return best;
  }
  function targets(inp) {
    var k = inp.k, eq = new Float64Array(k).fill(1 / k);
    return [
      { id: 'actual', name: 'Pesos actuales', note: 'Lo que tienes hoy.', w: Float64Array.from(weightsOf(inp)) },
      { id: 'iguales', name: 'Pesos iguales', note: 'Lo mismo en cada posición.', w: eq },
      { id: 'minvar', name: 'Mínima volatilidad', note: 'La mezcla que menos se mueve con tus mismas posiciones. Tope de ' + Math.round(capOf(k) * 100) + ' % por posición.', w: minVar(inp) },
      { id: 'paridad', name: 'Paridad de riesgo', note: 'Cada posición aporta el mismo riesgo. Tope de ' + Math.round(capOf(k) * 100) + ' % por posición.', w: riskParity(inp) },
      { id: 'sharpe', name: 'Máx. rendimiento por riesgo', note: 'Máximo Sharpe con la deriva encogida al prior (no con el último año). Tope de ' + Math.round(capOf(k) * 100) + ' %.', w: maxSharpe(inp) }
    ].map(function (t) { t.stats = stats(inp, t.w); return t; });
  }

  /* ============================== plan de rebalanceo ==============================
     o.mode: 'full' (compra y vende) | 'contrib' (solo compra con el efectivo y la aportación: no genera impuestos)
     o.extra: aportación adicional en MXN · o.useCash: usar el efectivo disponible (sí) · o.minTrade: operación mínima (MXN 500) */
  function lotStep(a) { return a.ck === 'crypto' ? 1e-4 : 1; }
  function taxRate(a) { return a.ck === 'crypto' ? A.isrCrypto : a.ck === 'debt' ? 0 : A.isr; }
  function rebalance(inp, target, o) {
    o = o || {};
    var mode = o.mode === 'contrib' ? 'contrib' : 'full', extra = Math.max(0, +o.extra || 0), minTrade = o.minTrade == null ? 500 : +o.minTrade, fee = A.commission * (1 + A.iva);
    var as = inp.assets, k = as.length, cash0 = (o.useCash === false ? 0 : inp.cash) + extra, V = 0, i;
    as.forEach(function (a) { V += a.mv; });
    var w = Array.prototype.slice.call(target), sw = sum(w); w = w.map(function (x) { return sw ? x / sw : 1 / k; });
    var tv = new Float64Array(k);
    if (mode === 'full') {
      var comm = 0; for (var it = 0; it < 5; it++) { var turn = 0; for (i = 0; i < k; i++) { tv[i] = w[i] * (V + cash0 - comm); turn += Math.abs(tv[i] - as[i].mv); } comm = turn * fee; }
    } else {
      var budget = cash0 / (1 + fee), lo = 0, hi = (V + budget) / Math.max(1e-9, Math.min.apply(null, w.filter(function (x) { return x > 0; }).concat([1])));
      for (var b = 0; b < 100; b++) { var th = (lo + hi) / 2, s = 0; for (i = 0; i < k; i++) s += Math.max(0, th * w[i] - as[i].mv); if (s > budget) hi = th; else lo = th; }
      for (i = 0; i < k; i++) tv[i] = as[i].mv + Math.max(0, lo * w[i] - as[i].mv);
    }
    var trades = as.map(function (a, i) {
      var d = tv[i] - a.mv, st = lotStep(a), q = d / a.pxMxn;
      q = q > 0 ? Math.floor(q / st + 1e-9) * st : -Math.floor(-q / st + 1e-9) * st;
      if (q < 0 && -q > a.qty) q = -a.qty;
      var amt = q * a.pxMxn; if (Math.abs(amt) < minTrade) { q = 0; amt = 0; }
      return { ticker: a.ticker, name: a.name, ck: a.ck, isU: a.isU, price: a.price, pxMxn: a.pxMxn, qty: +q.toFixed(st < 1 ? 4 : 0), amount: amt, side: amt > 0 ? 'buy' : amt < 0 ? 'sell' : 'hold',
        wNow: a.w, wTarget: w[i], valueNow: a.mv, valueTarget: tv[i], commission: Math.abs(amt) * fee, gain: 0, tax: 0 };
    });
    function cashLeft() { var c = cash0; trades.forEach(function (t) { c -= t.amount + t.commission; }); return c; }
    /* el redondeo nunca deja el efectivo en negativo: se recorta un lote a la compra más grande hasta cuadrar */
    for (var guard = 0, lack; (lack = -cashLeft()) > 0.005 && guard < 50; guard++) {
      var big = null; trades.forEach(function (t) { if (t.amount > 0 && (!big || t.amount > big.amount)) big = t; }); if (!big) break;
      var a0 = as[trades.indexOf(big)], st0 = lotStep(a0), lots = Math.min(Math.round(big.qty / st0), Math.ceil(lack / (st0 * a0.pxMxn * (1 + fee)) - 1e-9));
      big.qty = +(big.qty - lots * st0).toFixed(st0 < 1 ? 4 : 0); big.amount = big.qty * a0.pxMxn; big.commission = Math.abs(big.amount) * fee;
      if (big.qty <= 0 || Math.abs(big.amount) < minTrade) { big.qty = 0; big.amount = 0; big.commission = 0; big.side = 'hold'; }
    }
    var gSec = 0, gCr = 0, buys = 0, sells = 0, commT = 0;
    trades.forEach(function (t, i) {
      var a = as[i]; commT += t.commission;
      if (t.amount > 0) buys += t.amount;
      if (t.amount < 0) { sells -= t.amount; var f = -t.amount / a.mv; t.gain = -t.amount - f * a.basis; if (a.ck === 'crypto') gCr += t.gain; else if (a.ck !== 'debt') gSec += t.gain; }
      t.valueAfter = a.mv + t.amount;
    });
    var taxSec = Math.max(0, gSec) * A.isr, taxCr = Math.max(0, gCr) * A.isrCrypto;
    trades.forEach(function (t) { if (t.gain > 0) t.tax = t.gain * (t.ck === 'crypto' ? A.isrCrypto : t.ck === 'debt' ? 0 : A.isr); });
    var Va = 0; trades.forEach(function (t) { Va += t.valueAfter; }); var wA = trades.map(function (t) { t.wAfter = Va ? t.valueAfter / Va : 0; return t.wAfter; });
    function dist(x) { var s = 0; for (var i = 0; i < k; i++) s += Math.abs(x[i] - w[i]); return s / 2; }
    return { mode: mode, trades: trades, target: w,
      totals: { buys: buys, sells: sells, commission: commT, gainSec: gSec, gainCrypto: gCr, taxSec: taxSec, taxCrypto: taxCr, tax: taxSec + taxCr,
        cashBefore: cash0, cashAfter: cashLeft(), turnover: V ? (buys + sells) / 2 / V : 0, ops: trades.filter(function (t) { return t.amount; }).length },
      before: stats(inp, weightsOf(inp)), after: stats(inp, wA), distBefore: dist(weightsOf(inp)), distAfter: dist(wA) };
  }

  /* ============================== Monte Carlo ==============================
     Mensual, por activo, con correlaciones (Cholesky). Choques cacheados por (portafolio, horizonte, distribución, semilla):
     mover la aportación, la comisión o el rebalanceo reutiliza los MISMOS números aleatorios → el cono cambia suave, sin parpadeo. */
  var shockCache = null;
  function shocks(inp, M, n, dist, seed) {
    var key = inp.id + '|' + inp.k + '|' + M + '|' + n + '|' + dist + '|' + seed;
    if (shockCache && shockCache.key === key) return shockCache;
    var k = inp.k, L = inp.chol, rnd = mulberry32(seed), g = normal(rnd), Z = new Float32Array(n * M * k), PU = new Float32Array(n * k), z = new Float64Array(k), s12 = 1 / Math.sqrt(12), p, m, i, j, s;
    for (p = 0; p < n; p++) {
      for (i = 0; i < k; i++) z[i] = g();
      for (i = 0; i < k; i++) { s = 0; for (j = 0; j <= i; j++) s += L[i][j] * z[j]; PU[p * k + i] = s; }
      for (m = 0; m < M; m++) {
        var o = (p * M + m) * k;
        if (dist === 'block') { /* bloque de 21 días hábiles consecutivos de la muestra (circular), sin su media */
          var b0 = Math.floor(rnd() * NR); for (i = 0; i < k; i++) { s = 0; var x = inp.X[i]; for (var d = 0; d < 21; d++) s += x[(b0 + d) % NR]; Z[o + i] = s; }
        } else {
          var sc = 1; if (dist === 't') { var c2 = 0; for (var q = 0; q < A.nu; q++) { var h = g(); c2 += h * h; } sc = Math.sqrt((A.nu - 2) / c2); }
          for (i = 0; i < k; i++) z[i] = g();
          for (i = 0; i < k; i++) { s = 0; for (j = 0; j <= i; j++) s += L[i][j] * z[j]; Z[o + i] = s * s12 * sc; }
        }
      }
    }
    return (shockCache = { key: key, Z: Z, PU: PU });
  }
  function irr(V0, flows, VT, M) { /* tasa anual tal que V0·(1+r)^M + Σ c_m·(1+r)^(M−m) = VT, mensual; flows[m] = aportación al cierre del mes m */
    function fv(r) { var g = 1 + r, v = V0; for (var m = 1; m <= M; m++) v = v * g + (flows[m] || 0); return v; }
    var lo = -0.5, hi = 0.5; if (fv(lo) > VT || fv(hi) < VT) return null;
    for (var it = 0; it < 80; it++) { var mid = (lo + hi) / 2; if (fv(mid) < VT) lo = mid; else hi = mid; }
    return Math.pow(1 + (lo + hi) / 2, 12) - 1;
  }
  /* o: { years, monthly, indexed, real, dist: 'normal'|'t'|'block', drift: 'blend'|'prior'|'sample', fee, rebalance: 'annual'|'quarterly'|'band'|'none',
         tax, tradeCost, paramUnc, goal, weights, n, seed, samples } */
  function mc(inp, o) {
    o = o || {};
    var years = clamp(Math.round(o.years || 10), 1, 40), M = years * 12, k = inp.k, i, m, p;
    var n = o.n || (M * k > 3000 ? 600 : 1000), dist = o.dist === 't' || o.dist === 'block' ? o.dist : 'normal', seed = o.seed || ((hashStr(inp.id + '·mc') ^ 0x5eed) >>> 0);
    var drift = o.drift || 'blend', ws = drift === 'prior' ? 0 : drift === 'sample' ? 1 : inp.Y / (inp.Y + A.kappa);
    var mu = inp.assets.map(function (a) { return (ws * a.muS + (1 - ws) * a.muP) / 12; });
    var W = o.weights ? Array.prototype.slice.call(o.weights) : weightsOf(inp), sW = sum(W); W = W.map(function (x) { return x / sW; });
    var monthly = Math.max(0, +o.monthly || 0), infl = o.infl == null ? A.infl : +o.infl, real = !!o.real, feeM = Math.pow(1 - (o.fee || 0), 1 / 12);
    var reb = o.rebalance || 'annual', tc = o.tradeCost == null ? A.commission * (1 + A.iva) : +o.tradeCost, taxOn = !!o.tax;
    var puK = o.paramUnc === false ? 0 : 1 / Math.sqrt(inp.Y + A.kUnc) / 12;
    var S = shocks(inp, M, n, dist, seed), Z = S.Z, PU = S.PU, V0 = inp.value, tr = inp.assets.map(taxRate);
    var cAt = new Float64Array(M + 1), defl = new Float64Array(M + 1);
    for (m = 0; m <= M; m++) { cAt[m] = m ? monthly * (o.indexed ? Math.pow(1 + infl, m / 12) : 1) : 0; defl[m] = real ? Math.pow(1 + infl, -m / 12) : 1; }
    var vals = new Float32Array(n * (M + 1)), val = new Float64Array(k), bas = new Float64Array(k), mdd = new Float32Array(n), cash = inp.cash, expm = new Float64Array(k);
    for (p = 0; p < n; p++) {
      for (i = 0; i < k; i++) { val[i] = inp.assets[i].mv + cash * W[i]; bas[i] = inp.assets[i].basis + cash * W[i]; expm[i] = mu[i] + PU[p * k + i] * puK; }
      var tot = V0, ix = 1, pk = 1, dd = 0; vals[p * (M + 1)] = V0;
      for (m = 1; m <= M; m++) {
        var o2 = (p * M + m - 1) * k, pre = 0;
        for (i = 0; i < k; i++) { val[i] *= Math.exp(expm[i] + Z[o2 + i]) * feeM; pre += val[i]; }
        ix *= pre / tot; if (ix > pk) pk = ix; else if (1 - ix / pk > dd) dd = 1 - ix / pk;
        var c = cAt[m]; tot = pre + c;
        var doR = reb === 'annual' ? m % 12 === 0 : reb === 'quarterly' ? m % 3 === 0 : false;
        if (reb === 'band') for (i = 0; i < k && !doR; i++) if (Math.abs((val[i] + c * W[i]) / tot - W[i]) > 0.05) doR = true;
        if (doR) {
          var turn = 0, tax = 0;
          for (i = 0; i < k; i++) { var d = W[i] * tot - val[i]; turn += Math.abs(d); if (d < 0 && val[i] > 0) { var f = -d / val[i], gn = -d - f * bas[i]; if (taxOn && gn > 0) tax += gn * tr[i]; bas[i] *= 1 - f; } else bas[i] += d; }
          tot -= turn * tc + tax; for (i = 0; i < k; i++) val[i] = W[i] * tot;
        } else if (c) for (i = 0; i < k; i++) { val[i] += c * W[i]; bas[i] += c * W[i]; }
        vals[p * (M + 1) + m] = tot * defl[m];
      }
      mdd[p] = dd;
    }
    /* percentiles por mes + campo de densidad (log-valor, 56 franjas) */
    var Q = { p5: .05, p10: .10, p25: .25, p50: .50, p75: .75, p90: .90, p95: .95 }, pct = {}, keyQ = Object.keys(Q);
    keyQ.forEach(function (q) { pct[q] = new Float64Array(M + 1); });
    var srt = new Float32Array(n * (M + 1)), col = new Float32Array(n), lo = Infinity, hi = -Infinity;
    for (m = 0; m <= M; m++) {
      for (p = 0; p < n; p++) col[p] = vals[p * (M + 1) + m];
      col.sort(); srt.set(col, m * n);
      keyQ.forEach(function (q) { pct[q][m] = col[Math.min(n - 1, Math.floor(Q[q] * (n - 1) + 0.5))]; });
      var a1 = col[Math.floor(n * .01)], a99 = col[Math.ceil(n * .99) - 1]; if (a1 > 0 && Math.log(a1) < lo) lo = Math.log(a1); if (Math.log(Math.max(a99, 1)) > hi) hi = Math.log(Math.max(a99, 1));
    }
    var B = 56, dens = new Float32Array((M + 1) * B), span = hi - lo || 1;
    for (m = 0; m <= M; m++) for (p = 0; p < n; p++) { var v = srt[m * n + p]; if (v <= 0) continue; var bi = Math.floor((Math.log(v) - lo) / span * B); if (bi >= 0 && bi < B) dens[m * B + bi] += 1 / n; }
    var inv = new Float64Array(M + 1); inv[0] = V0; for (m = 1; m <= M; m++) inv[m] = inv[m - 1] + cAt[m] * defl[m];
    var term = srt.subarray(M * n, (M + 1) * n), goal = o.goal ? +o.goal : 0;
    function frac(fn) { var c = 0; for (var q = 0; q < n; q++) if (fn(term[q])) c++; return c / n; }
    var sortedMdd = Float32Array.from(mdd).sort(), nomK = real ? Math.pow(1 + infl, years) : 1, flowsN = Array.prototype.slice.call(cAt);
    function cagr(v) { var r = irr(V0, flowsN, v * nomK, M); return r == null ? null : { nominal: r, real: (1 + r) / (1 + infl) - 1 }; }
    var fails = []; if (goal) for (var q = 0; q < n; q++) if (term[q] < goal) fails.push(goal - term[q]);
    var ord = []; for (p = 0; p < n; p++) ord.push(p); ord.sort(function (a, b) { return vals[a * (M + 1) + M] - vals[b * (M + 1) + M]; });
    var ns = o.samples == null ? 18 : o.samples, samples = [];
    for (var sI = 0; sI < ns; sI++) { var pi = ord[Math.round((0.04 + 0.92 * sI / Math.max(1, ns - 1)) * (n - 1))]; samples.push(vals.subarray(pi * (M + 1), (pi + 1) * (M + 1))); }
    var meanT = 0; for (p = 0; p < n; p++) meanT += term[p]; meanT /= n;
    var wst = stats(inp, W);
    return { years: years, months: M, n: n, V0: V0, real: real, invested: inv, pct: pct, samples: samples,
      dens: { bins: B, lo: lo, hi: hi, data: dens },
      terminal: term,
      stats: { median: pct.p50[M], mean: meanT, p5: pct.p5[M], p10: pct.p10[M], p90: pct.p90[M], p95: pct.p95[M],
        pGoal: goal ? frac(function (v) { return v >= goal; }) : null, shortfall: fails.length ? fails.sort(function (a, b) { return a - b; })[fails.length >> 1] : 0,
        pLoss: frac(function (v) { return v < inv[M]; }), cagr: { p10: cagr(pct.p10[M]), p50: cagr(pct.p50[M]), p90: cagr(pct.p90[M]) },
        mddMedian: sortedMdd[n >> 1], mddP90: sortedMdd[Math.floor(n * 0.9)] },
      assumptions: { drift: drift, driftWeightSample: ws, dist: dist, fee: o.fee || 0, rebalance: reb, tradeCost: tc, tax: taxOn, infl: infl, rf: A.rf, paramUnc: o.paramUnc !== false,
        er: wst.er, sigma: wst.sigma, mu: wst.mu, weights: W,
        assets: inp.assets.map(function (a, i) { return { ticker: a.ticker, clsName: a.clsName, w: W[i], prior: a.prior, sample: Math.exp(a.muS + a.sigma * a.sigma / 2) - 1, used: Math.exp(mu[i] * 12 + a.sigma * a.sigma / 2) - 1, sigma: a.sigma }; }) } };
  }

  /* ============================== Metas ==============================
     g: { target (MXN; en pesos de hoy si real), years, monthly, indexed, real (sí), start (lo asignado hoy; por omisión, todo el valor), weights }
     Rendimiento del portafolio a nivel agregado (rebalanceo continuo), mensual, con incertidumbre de deriva por trayectoria.
     En cada trayectoria V_T = A + c·B (A = lo que hoy vale creciendo; B = Σ factores de cada aportación) → c* = (meta − A)/B.
     P(éxito con c) = fracción de c* ≤ c; la aportación para una probabilidad q es el cuantil q de c*. Exacto, sin bisección. */
  function goal(inp, g) {
    g = g || {};
    var years = clamp(+g.years || 10, 0.5, 50), M = Math.round(years * 12), target = Math.max(0, +g.target || 0), monthly = Math.max(0, +g.monthly || 0);
    var real = g.real !== false, infl = A.infl, n = g.n || 4000, V0 = g.start != null ? Math.max(0, +g.start) : inp.value, W = g.weights || weightsOf(inp), st = stats(inp, W);
    var mu = st.mu / 12, sg = st.sigma / Math.sqrt(12), du = st.sigma / Math.sqrt(inp.Y + A.kUnc) / 12;
    var rnd = mulberry32(hashStr(inp.id + '·meta')), gz = normal(rnd), HM = Math.max(M, 480);
    var cs = new Float64Array(n), hit = new Float64Array(n), fanY = Math.floor(years), fan = [], y, p, m, fI = new Float64Array(HM + 1), dF = new Float64Array(HM + 1);
    for (m = 0; m <= HM; m++) { fI[m] = g.indexed ? Math.pow(1 + infl, m / 12) : 1; dF[m] = real ? Math.pow(1 + infl, -m / 12) : 1; }
    for (y = 0; y <= fanY; y++) fan.push(new Float64Array(n));
    var gN = real ? target / dF[M] : target;
    for (p = 0; p < n; p++) {
      var a = V0, b = 0, d = gz() * du, h = Infinity; fan[0][p] = a;
      for (m = 1; m <= HM; m++) {
        var gr = Math.exp(mu + d + sg * gz()); a *= gr; b = b * gr + fI[m];
        var v = (a + monthly * b) * dF[m];
        if (h === Infinity && target && v >= target) h = m;
        if (m === M) cs[p] = b > 0 ? (gN - a) / b : (a >= gN ? -Infinity : Infinity);
        if (m % 12 === 0 && m / 12 <= fanY) fan[m / 12][p] = v;
        if (m >= M && (h !== Infinity || !target)) break;
      }
      hit[p] = h;
    }
    var csS = Float64Array.from(cs).sort(), hitS = Float64Array.from(hit).sort();
    function pAt(c) { var lo = 0, hi = n; while (lo < hi) { var md = (lo + hi) >> 1; if (csS[md] <= c) lo = md + 1; else hi = md; } return lo / n; }
    function need(q) { var v = csS[Math.min(n - 1, Math.max(0, Math.ceil(q * n) - 1))]; return v === Infinity ? null : Math.max(0, v); }
    function when(q) { var v = hitS[Math.min(n - 1, Math.max(0, Math.ceil(q * n) - 1))]; return v === Infinity ? null : v / 12; }
    var fq = fan.map(function (col) { var s = Float64Array.from(col).sort(); return { p10: s[Math.floor(n * .1)], p50: s[n >> 1], p90: s[Math.floor(n * .9)] }; });
    return { target: target, years: years, monthly: monthly, start: V0, real: real, er: st.er, sigma: st.sigma,
      p: target ? pAt(monthly) : null, pAt: pAt, need: { p50: need(.5), p80: need(.8), p90: need(.9) }, needFor: need,
      when: { p50: when(.5), p80: when(.8), p90: when(.9) }, whenFor: when, fan: fq };
  }

  /* ============================== What-If ==============================
     counterfactual: el portafolio arranca con su valor real al inicio del periodo y recibe TUS aportaciones y retiros en sus fechas,
     pero invertidos en la alternativa. Convención del libro: el flujo F_t entra al abrir t → X_t = (X_{t−1} + F_t)·a_t/a_{t−1}. */
  var ALTS = [
    { id: 'sp500', name: 'S&P 500 (en pesos)' }, { id: 'nasdaq', name: 'Nasdaq 100 (en pesos)' }, { id: 'ipc', name: 'S&P/BMV IPC' },
    { id: 'cetes', name: 'Cetes 28 días' }, { id: 'btc', name: 'Bitcoin (en pesos)' }, { id: 'oro', name: 'Oro (en pesos)' }, { id: 'iguales', name: 'Tus posiciones, en pesos iguales' }];
  function altSeries(id, inp) {
    var fx = T.fx.series, a = new Float64Array(TOT), i, h, RL = !!window.CAMPO_REAL;
    function rt(c, k) { return T.rate ? T.rate(c, k) : (c === 'USD' ? fx[k] : 1); }
    if (RL && id === 'sp500') { h = mk('S&P 500'); for (i = 0; i < TOT; i++) a[i] = h[i] * rt('USD', i); return a; }
    if (RL && (id === 'nasdaq' || id === 'oro' || id === 'btc')) { h = mk(id === 'nasdaq' ? 'Nasdaq 100' : id === 'oro' ? 'Oro' : 'Bitcoin'); for (i = 0; i < TOT; i++) a[i] = h[i] * rt('USD', i); return a; }
    if (RL && id === 'ipc') { h = mk('S&P/BMV IPC'); for (i = 0; i < TOT; i++) a[i] = h[i] * rt('MXN', i); return a; }
    /* Cetes rinden en pesos: en otra moneda base se suma el movimiento del peso */
    if (RL && id === 'cetes') { var dq = Math.pow(1.0725, 1 / 252); for (i = 0; i < TOT; i++) a[i] = 100 * Math.pow(dq, i) * rt('MXN', i); return a; }
    if (id === 'sp500') { var b = D.series.benchmark.slice(-TOT); for (i = 0; i < TOT; i++) a[i] = b[i]; }
    else if (id === 'nasdaq' || id === 'oro') { h = mk(id === 'nasdaq' ? 'Nasdaq 100' : 'Oro'); for (i = 0; i < TOT; i++) a[i] = h[i] * fx[i]; }
    else if (id === 'ipc') { h = mk('S&P/BMV IPC'); for (i = 0; i < TOT; i++) a[i] = h[i]; }
    else if (id === 'btc') { var bp = T.pricePathMxn('BTC'); for (i = 0; i < TOT; i++) a[i] = bp[i]; }
    else if (id === 'cetes') { var dr = Math.pow(1 + A.rf, 1 / 252); a[0] = 100; for (i = 1; i < TOT; i++) a[i] = a[i - 1] * dr; }
    else { /* pesos iguales rebalanceados a diario entre las posiciones de hoy */
      var X = inp.assets.map(function (x) { return T.pricePathMxn({ ticker: x.ticker, price: x.price, d1: inp.L.rows.filter(function (r) { return r.ticker === x.ticker; })[0].d1, currency: x.ccy }); });
      a[0] = 100; for (i = 1; i < TOT; i++) { var g = 0; X.forEach(function (x) { g += x[i] / x[i - 1]; }); a[i] = a[i - 1] * g / X.length; }
    }
    return a;
  }
  function counterfactual(inp, altId, days) {
    var L = inp.L, N = Math.min(LAST, days || LAST), s = LAST - N, a = altSeries(altId, inp), X = new Float64Array(N + 1), act = new Float64Array(N + 1), t;
    X[0] = L.V[s]; act[0] = L.V[s];
    for (t = s + 1; t <= LAST; t++) { X[t - s] = (X[t - s - 1] + L.F[t]) * a[t] / a[t - 1]; act[t - s] = L.V[t]; }
    var tw = C.twr(L.V, L.F, s, LAST), alt = 1; for (t = s + 1; t <= LAST; t++) alt *= a[t] / a[t - 1];
    var flows = 0; for (t = s + 1; t <= LAST; t++) flows += L.F[t];
    return { alt: altId, name: (ALTS.filter(function (x) { return x.id === altId; })[0] || {}).name || altId, start: T.dates[s], days: N,
      alternative: X, actual: act, dates: T.dates.slice(s), end: X[N], actualEnd: act[N], diff: act[N] - X[N], flows: flows,
      twrActual: tw, twrAlt: alt - 1 };
  }
  /* posiciones vendidas dentro de la ventana: cuánto valdrían hoy si no se hubieran vendido */
  function closed(inp) {
    var L = inp.L, out = [];
    L.events.forEach(function (e) {
      if (e.t !== 'sell' || !e.closed || !(e.idx >= 0)) return;
      var hp = (L.held || (L.parts || []).reduce(function (s, x) { return s.concat(x.held || []); }, [])).filter(function (h) { return h.ticker === e.tk; })[0]; if (!hp) return;
      var fxN = T.rate ? T.rate(e.ccy || 'MXN') : (e.ccy === 'USD' ? T.fx.usdmxn : 1), now = e.qty * hp.path[LAST] * fxN;
      out.push({ ticker: e.tk, name: e.name, ccy: e.ccy, date: e.date, qty: e.qty, proceeds: e.mxn, valueToday: now, diff: now - e.mxn, path: hp.path, idx: e.idx });
    });
    return out;
  }
  /* pruebas de estrés: choques por factor; el activo responde con su beta de clase; en USD se suma el movimiento del peso.
     sh: { spx, ndx, ipc, btc, fx (USD/MXN), fibra, debt } como rendimientos simples. Se ignora lo idiosincrático. */
  var SCENARIOS = [
    { id: 'covid', name: 'Covid-19', when: '19 feb – 23 mar 2020', kind: 'Histórico', note: 'El S&P cayó 34 % en dólares, pero el dólar subió 35 % frente al peso: en pesos, la caída fue de solo 11 %.',
      sh: { spx: -0.339, ndx: -0.28, ipc: -0.28, fx: 0.35, btc: -0.50, fibra: -0.35, debt: 0.006 } },
    { id: 'gfc', name: 'Crisis financiera', when: 'sep 2008 – mar 2009', kind: 'Histórico', note: 'Bitcoin y las FIBRAs aún no existían: para ellos se suponen −70 % y −35 %.',
      sh: { spx: -0.47, ndx: -0.45, ipc: -0.33, fx: 0.51, btc: -0.70, fibra: -0.35, debt: 0.04 } },
    { id: 'y2022', name: 'Inflación y alza de tasas', when: '2022', kind: 'Histórico', note: 'Tecnología y cripto cayeron fuerte; el peso se apreció 5 % y los Cetes pagaron cerca de 7.6 %.',
      sh: { spx: -0.194, ndx: -0.33, ipc: -0.09, fx: -0.05, btc: -0.64, fibra: -0.05, debt: 0.076 } },
    { id: 'spx20', name: 'Corrección del S&P 500', when: 'Hipotético', kind: 'Hipotético', note: 'S&P −20 %, Nasdaq −25 %; el dólar sube 8 % por aversión al riesgo.',
      sh: { spx: -0.20, ndx: -0.25, ipc: -0.12, fx: 0.08, btc: -0.35, fibra: -0.08, debt: 0 } },
    { id: 'mxndown', name: 'El peso se deprecia', when: 'Hipotético', kind: 'Hipotético', note: 'USD/MXN +15 %; la bolsa mexicana baja 6 %.', sh: { fx: 0.15, ipc: -0.06, fibra: -0.05 } },
    { id: 'mxnup', name: 'El peso se aprecia', when: 'Hipotético', kind: 'Hipotético', note: 'USD/MXN −10 %: lo que tienes en dólares vale menos en pesos.', sh: { fx: -0.10 } },
    { id: 'crypto', name: 'Invierno cripto', when: 'Hipotético', kind: 'Hipotético', note: 'Bitcoin −60 %, con contagio leve a tecnología.', sh: { btc: -0.60, ndx: -0.04, spx: -0.02 } },
    { id: 'banxico', name: 'Banxico sube 200 pb', when: 'Hipotético', kind: 'Hipotético', note: 'Golpe a FIBRAs y bolsa local; la deuda de corto plazo casi no se mueve.', sh: { ipc: -0.08, fibra: -0.12, fx: -0.03, debt: -0.001 } }
  ];
  function stress(inp, sc) {
    if (typeof sc === 'string') sc = SCENARIOS.filter(function (x) { return x.id === sc; })[0];
    var sh = sc.sh || {}, l = function (x) { return Math.log(1 + (x || 0)); }, fx = sh.fx || 0;
    var fSP = l(sh.spx), fTEC = sh.ndx != null ? l(sh.ndx) - l(sh.spx) : 0, fIPC = l(sh.ipc), fBTC = l(sh.btc), imp = 0, impL = 0;
    var rows = inp.assets.map(function (a) {
      var b = a.fb || {}, loc;
      if (a.ck === 'debt') loc = sh.debt || 0;
      else if (a.ck === 'fibra' && sh.fibra != null) loc = sh.fibra;
      else loc = Math.exp((b.SP || 0) * fSP + (b.TEC || 0) * fTEC + (b.IPC || 0) * fIPC + (b.BTC || 0) * fBTC) - 1;
      /* el escenario mueve el USD/MXN; lo que eso le hace a ESTE activo depende de su moneda y de la base de la vista */
      var B = T.base || 'MXN', fxm = !a.isU ? 0 : (a.ccy === 'MXN' && B === 'USD') ? 1 / (1 + fx) - 1 : (a.ccy === 'USD' ? fx : 0);
      var mx = (1 + loc) * (1 + fxm) - 1; imp += a.mv * mx; impL += a.mv * loc;
      return { ticker: a.ticker, name: a.name, clsName: a.clsName, w: a.w, mv: a.mv, isU: a.isU, local: loc, mxn: mx, impact: a.mv * mx };
    });
    return { id: sc.id, name: sc.name, when: sc.when, kind: sc.kind, note: sc.note, sh: sh, rows: rows,
      impact: imp, pct: inp.value ? imp / inp.value : 0, impactLocal: impL, pctLocal: inp.value ? impL / inp.value : 0, fxEffect: imp - impL };
  }

  /* ============================== Dividendos ==============================
     Recibidos = movimientos 'div' del libro (brutos, en MXN con el TC de su fecha). Proyección a 12 meses con el dividendo
     trimestral vigente, la cantidad de hoy y el TC de hoy. Retención estimada: 10 % México, 10 % EE. UU. (W-8BEN). */
  function isoAddDays(iso, d) { var t = new Date(iso + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + d); return t.toISOString().slice(0, 10); }
  function dividends(pf) {
    var L = ledger(pf), asOf = T.dates[LAST], DPS = C.DPS || {}, fxNow = T.fx.usdmxn, rNow = function (r) { return T.rate ? T.rate(r.ccy || 'MXN') : (r.isU ? fxNow : 1); }, from = isoAddDays(asOf, -365), to = isoAddDays(asOf, 365);
    function wh(ccy) { return ccy === 'USD' ? A.divWhUs : A.divWhMx; }
    var rec = L.events.filter(function (e) { return e.t === 'div'; }).map(function (e) { var w = e.mxn * wh(e.ccy); return { date: e.date, ticker: e.tk, name: e.name, qty: e.qty, dps: e.px, ccy: e.ccy, fx: e.fx, gross: e.mxn, withholding: w, net: e.mxn - w }; });
    var last = {}; rec.forEach(function (r) { if (!last[r.ticker] || r.date > last[r.ticker]) last[r.ticker] = r.date; });
    var proj = [], per = {};
    /* producción: sin tabla de dividendos fija. Se repite, un año después, cada pago que recibiste en los últimos 12 meses
       (mismo mes, mismo dividendo por acción) con la cantidad y el TC de hoy. Si no cobraste nada de una emisora, no se proyecta. */
    if (window.CAMPO_REAL) L.rows.forEach(function (r) {
      if (!(r.qty > 0)) return;
      rec.forEach(function (x) {
        if (x.ticker !== r.ticker || x.date <= from || !(x.dps > 0)) return;
        var d = isoAddDays(x.date, 365); if (d <= asOf || d > to) return;
        var amt = r.qty * x.dps * rNow(r);
        proj.push({ date: d, ticker: r.ticker, name: r.name, qty: r.qty, dps: x.dps, ccy: r.ccy, gross: amt, withholding: amt * wh(r.ccy), net: amt * (1 - wh(r.ccy)), estimated: true });
      });
    });
    else L.rows.forEach(function (r) {
      if (!DPS[r.ticker] || !(r.qty > 0)) return;
      var d = last[r.ticker] || asOf, amt = r.qty * DPS[r.ticker] * (r.isU ? fxNow : 1);
      for (var q = 0; q < 6; q++) { d = isoAddDays(d, 91); if (d <= asOf) continue; if (d > to) break; proj.push({ date: d, ticker: r.ticker, name: r.name, qty: r.qty, dps: DPS[r.ticker], ccy: r.ccy, gross: amt, withholding: amt * wh(r.ccy), net: amt * (1 - wh(r.ccy)), estimated: true }); }
    });
    proj.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    L.rows.forEach(function (r) { per[r.ticker] = { ticker: r.ticker, name: r.name, mv: r.mv, cost: r.cost, ttm: 0, projected: 0, payments: 0 }; });
    var ttm = 0, ttmNet = 0, pj = 0, pjNet = 0, bm = {};
    rec.forEach(function (r) { var k = r.date.slice(0, 7); if (r.date > from) { ttm += r.gross; ttmNet += r.net; if (per[r.ticker]) per[r.ticker].ttm += r.gross; } bm[k] = bm[k] || { month: k, received: 0, projected: 0 }; bm[k].received += r.gross; });
    proj.forEach(function (r) { var k = r.date.slice(0, 7); pj += r.gross; pjNet += r.net; if (per[r.ticker]) { per[r.ticker].projected += r.gross; per[r.ticker].payments++; } bm[k] = bm[k] || { month: k, received: 0, projected: 0 }; bm[k].projected += r.gross; });
    var perA = Object.keys(per).map(function (k) { var x = per[k]; x.yield = x.mv ? x.projected / x.mv : 0; x.yoc = x.cost ? x.projected / x.cost : 0; return x; }).filter(function (x) { return x.ttm || x.projected; }).sort(function (a, b) { return b.projected - a.projected; });
    var mvAll = 0, costAll = 0; L.rows.forEach(function (r) { mvAll += r.mv; costAll += r.cost; });
    return { asOf: asOf, received: rec, projected: proj, perAsset: perA, byMonth: Object.keys(bm).sort().map(function (k) { return bm[k]; }),
      totals: { ttm: ttm, ttmNet: ttmNet, projected: pj, projectedNet: pjNet, allTime: sum(rec.map(function (r) { return r.gross; })), yield: L.value ? pj / L.value : 0, yoc: costAll ? pj / costAll : 0, payers: perA.length } };
  }

  window.CampoModel = { A: A, CLS: CLS, ledger: ledger, inputs: inputs, stats: stats, targets: targets, rebalance: rebalance, mc: mc, goal: goal,
    alternatives: ALTS, counterfactual: counterfactual, closed: closed, scenarios: SCENARIOS, stress: stress, dividends: dividends, irr: irr };
})();
