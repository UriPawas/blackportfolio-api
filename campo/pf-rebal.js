/* Campo · Portafolio individual · pestaña "Rebalanceo". Expone window.CampoPfRebal.render(mount, portfolio|'todos', CampoTracker) -> { destroy }.
   No recalcula finanzas: llama a CampoModel (inputs, targets, rebalance). Solo presenta, anima y exporta.
   Objetivo inicial: "Paridad de riesgo" (con "Pesos actuales" el plan nacería vacío; "Mínima volatilidad" concentra y rota demasiado). En producción, con los datos reales de campo/datos.js. */
(function () {
  'use strict';
  var D = window.PORTIFY_DEMO, M = window.CampoModel;
  var doc = typeof document !== 'undefined' ? document : null;
  var rmq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduce() { return !!rmq.matches; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var EXPO = 'cubic-bezier(0.23, 1, 0.32, 1)';
  var DEFAULT_SEL = 'paridad';

  /* ============================== formato ============================== */
  var nf0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
  function BS() { var t = window.CampoTracker; return (t && t.base) || 'MXN'; }
  function SYM() { var d = window.PORTIFY_DEMO; return d && d.fmt && d.fmt.sym ? d.fmt.sym() : '$'; }
  function fM(v) { var a = Math.round(Math.abs(v)); return (v < 0 && a > 0 ? '−' : '') + SYM() + nf0.format(a); }
  function fS(v) { var a = Math.round(Math.abs(v)); return a === 0 ? SYM() + '0' : (v < 0 ? '−' : '+') + SYM() + nf0.format(a); }
  var nfc = {};
  function fN(v, d) { if (!nfc[d]) nfc[d] = new Intl.NumberFormat('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d }); return nfc[d].format(v); }
  function sgn(v, d, unit) { var a = Math.abs(v), z = a < 0.5 * Math.pow(10, -d); return (z ? '' : v < 0 ? '−' : '+') + fN(a, d) + (unit || ''); }
  function pct(v, d) { return fN(v * 100, d == null ? 1 : d) + ' %'; }
  function qtyTxt(q, ck) { var a = Math.abs(q); if (!a) return '—'; return (q < 0 ? '−' : '+') + fN(a, ck === 'crypto' ? 4 : 0); }
  function mark(t) { return window.CampoMarks ? window.CampoMarks.svg(t, 24) : '<span class="prb-chip">' + esc(String(t).charAt(0)) + '</span>'; }
  function parseNum(s, isPct) {
    s = String(s == null ? '' : s).trim(); if (!s) return 0;
    if (isPct && /^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.'); /* "12,5" en un campo de porcentaje se lee como decimal */
    var n = parseFloat(s.replace(/[^\d.\-]/g, '')); return isFinite(n) ? n : 0;
  }
  var uid = 0;

  /* ============================== definiciones accesibles ============================== */
  var DEF = {
    buys: 'Suma de todo lo que compras, sin contar comisiones.',
    sells: 'Suma de todo lo que vendes, antes de comisiones e impuestos.',
    commission: 'Comisión de 0,25 % por operación más IVA de 16 % (0,29 % en total), aplicada a cada compra y a cada venta.',
    tax: 'ISR estimado: 10 % sobre la ganancia realizada en acciones y ETF de BMV y SIC, que se paga en la declaración anual (no al vender). Cripto, a una tasa marginal estimada de 30 %. No considera minusvalías de otros años ni tu situación fiscal.',
    cash: 'Efectivo que queda después del plan: el efectivo de hoy, más tu aportación y las ventas, menos las compras y las comisiones.',
    turnover: 'Qué parte del portafolio cambia de manos: (compras + ventas) ÷ 2 ÷ valor del portafolio.',
    ops: 'Número de compras y ventas que tendrías que hacer. Las diferencias menores a la operación mínima se omiten.',
    vol: 'Cuánto suele moverse el portafolio en un año (desviación estándar anualizada), con la covarianza de un año de historia y correlaciones suavizadas hacia su promedio.',
    er: 'Rendimiento anual esperado con supuestos de largo plazo por clase de activo, mezclados con el último año (que pesa solo 10 %). Es un supuesto, no un pronóstico.',
    beta: 'Cuánto se mueve el portafolio por cada 1 % que se mueve el S&P 500 en tu moneda base.',
    loss: 'Pérdida a un año que solo se supera 1 de cada 20 años (percentil 5, con distribución log-normal). No es el peor caso posible.',
    dist: 'Qué parte del portafolio tendría que cambiar de lugar para coincidir con el objetivo.'
  };
  var SHARPE_WHY = 'Usa la deriva encogida hacia el supuesto de largo plazo, no el último año. Con un solo año de historia, maximizar el Sharpe del último año cargaría el portafolio hacia lo que más subió: ruido, no señal.';

  function render(mount, portfolio, T) {
    var off = [], dead = false;
    var pf = portfolio === 'todos' || (portfolio && (portfolio.cons || portfolio.id === 'todos')) ? 'todos' : (typeof portfolio === 'string' ? T.get(portfolio) : portfolio);
    function destroy() { if (dead) return; dead = true; cancelAnimationFrame(rid); clearTimeout(tid); off.forEach(function (f) { try { f(); } catch (e) { } }); off = []; tweens = []; if (mount) mount.innerHTML = ''; }
    var api = { destroy: destroy };
    var tweens = [], rid = 0, tid = 0;

    var inp = null, TG = null;
    try { inp = M && pf ? M.inputs(pf) : null; if (inp && inp.k >= 2) TG = M.targets(inp); } catch (e) { inp = null; TG = null; }
    if (!inp || !TG) {
      mount.innerHTML = '<div class="prb"><div class="prb-empty"><strong>' + (inp && inp.k < 2 ? 'Necesitas al menos dos posiciones' : 'Este portafolio aún no tiene posiciones') + '</strong><p>Para armar un plan de rebalanceo hace falta más de una posición con valor. Cuando las agregues, aquí verás cuánto comprar y vender para llegar a la mezcla que elijas.</p></div></div>';
      return api;
    }

    var id = 'prb' + (++uid), as = inp.assets, k = as.length, todos = pf === 'todos';
    var byId = {}; TG.forEach(function (t) { byId[t.id] = t; });
    var order = as.map(function (a, i) { return i; }).sort(function (a, b) { return as[b].w - as[a].w; }); /* orden fijo del bloque de deriva */
    var curW = as.map(function (a) { return a.w; });
    var custom = curW.map(function (w) { return Math.round(w * 1000) / 10; }); /* % con un decimal; arranca en los pesos de hoy */
    var S = { sel: byId[DEFAULT_SEL] ? DEFAULT_SEL : TG[1].id, mode: 'full', extra: 0, minTrade: 500 };
    var axis = 0.1, R = null;
    (function () { var mx = 0; TG.forEach(function (t) { for (var i = 0; i < k; i++) mx = Math.max(mx, t.w[i]); }); curW.forEach(function (w) { mx = Math.max(mx, w); }); axis = Math.min(1, Math.max(0.1, Math.ceil(mx * 10 + 0.0001) / 10)); })();

    /* ---------- plantilla ---------- */
    function infoBtn(key, label) {
      var did = id + '-i-' + key;
      return '<button type="button" class="prb-i" aria-expanded="false" aria-controls="' + did + '" aria-label="Definición de ' + esc(label) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.1"/></svg></button>';
    }
    function defBox(key, text) { return '<div class="prb-def" id="' + id + '-i-' + key + '" role="region"><p>' + esc(text) + '</p></div>'; }

    var chips = TG.map(function (t) {
      return '<button type="button" role="radio" class="prb-chipb" data-id="' + t.id + '" aria-checked="' + (t.id === S.sel) + '" tabindex="' + (t.id === S.sel ? 0 : -1) + '"><span class="prb-cn">' + esc(t.name) + '</span><span class="prb-cs num">' + (t.id === 'actual' ? 'Sin cambios' : 'Vol. ' + pct(t.stats.sigma)) + '</span></button>';
    }).join('') + '<button type="button" role="radio" class="prb-chipb" data-id="custom" aria-checked="false" tabindex="-1"><span class="prb-cn">Personalizado</span><span class="prb-cs">Tú eliges los pesos</span></button>';

    var customRows = order.map(function (i) {
      var a = as[i];
      return '<li class="prb-cr"><label><span class="prb-ca">' + mark(a.ticker) + '<span class="prb-cna"><strong>' + esc(a.ticker) + '</strong><span>Hoy ' + pct(a.w) + '</span></span></span><span class="prb-fi prb-fp"><input type="text" inputmode="decimal" autocomplete="off" data-ci="' + i + '" value="' + fN(custom[i], 1) + '" aria-label="Peso objetivo de ' + esc(a.ticker) + ' en porcentaje"><span class="prb-suf" aria-hidden="true">%</span></span></label></li>';
    }).join('');

    var targetHTML = '<section class="prb-s panel" aria-labelledby="' + id + 'h1"><div class="panel-head"><h2 id="' + id + 'h1">Objetivo</h2><span class="muted">La mezcla a la que quieres acercarte</span></div>' +
      '<div class="prb-chips" role="radiogroup" aria-label="Objetivo de pesos" data-chips>' + chips + '</div>' +
      '<p class="prb-note" data-note aria-live="polite"></p><p class="prb-why" data-why></p>' +
      '<div class="prb-cu" data-cu><div class="prb-cui"><ul class="prb-cgrid" role="list">' + customRows + '</ul>' +
      '<div class="prb-sum"><span class="prb-sumt">Suma <b class="num" data-sum>100,0 %</b></span><span class="prb-sumbar" aria-hidden="true"><i data-sumbar></i></span><span class="prb-sumn" data-sumn role="status"></span><button type="button" class="btn btn-secondary btn-sm" data-norm>Normalizar a 100 %</button></div></div></div></section>';

    var modeHTML = '<section class="prb-s panel" aria-labelledby="' + id + 'h2"><div class="panel-head"><h2 id="' + id + 'h2">Cómo operar</h2><span class="muted" data-cash>Efectivo disponible ' + fM(inp.cash) + '</span></div><div class="prb-ctl">' +
      '<div class="seg prb-mode" role="group" aria-label="Modo de operación" style="--n:2;--i:0"><span class="seg-pill" aria-hidden="true"></span><button type="button" data-mode="full" aria-pressed="true">Comprar y vender</button><button type="button" data-mode="contrib" aria-pressed="false">Solo comprar (sin impuestos)</button></div>' +
      '<label class="prb-f"><span class="prb-fl">Aportación adicional</span><span class="prb-fi"><span class="prb-pre" aria-hidden="true">' + SYM() + '</span><input type="text" inputmode="numeric" autocomplete="off" data-extra value="0" aria-label="Aportación adicional en ' + BS() + '"><span class="prb-suf" aria-hidden="true">' + BS() + '</span></span></label>' +
      '<label class="prb-f"><span class="prb-fl">Operación mínima</span><span class="prb-fi"><span class="prb-pre" aria-hidden="true">' + SYM() + '</span><input type="text" inputmode="numeric" autocomplete="off" data-min value="500" aria-label="Operación mínima en ' + BS() + '"><span class="prb-suf" aria-hidden="true">' + BS() + '</span></span></label></div>' +
      '<p class="prb-hint" data-modehint></p></section>';

    var driftRows = order.map(function (i) {
      var a = as[i];
      return '<li class="prb-dr" data-i="' + i + '"><div class="prb-dh"><span class="prb-da">' + mark(a.ticker) + '<span class="prb-dn"><strong>' + esc(a.ticker) + '</strong><span>' + esc(a.name) + '</span></span></span>' +
        '<span class="prb-dv num"><b data-now></b><i aria-hidden="true">→</i><b data-tgt></b><em data-dd></em></span></div>' +
        '<div class="prb-tr" role="img" data-bar><i class="prb-cur"></i><i class="prb-gap"></i><i class="prb-tg"></i><i class="prb-af"></i></div></li>';
    }).join('');
    var driftHTML = '<section class="prb-s panel" aria-labelledby="' + id + 'h3"><div class="panel-head"><h2 id="' + id + 'h3">Dónde estás frente al objetivo</h2><span class="muted num" data-axis></span></div>' +
      '<ul class="prb-key" aria-hidden="true"><li><i class="prb-k0"></i>Peso hoy</li><li><i class="prb-k1"></i>Objetivo</li><li><i class="prb-k2"></i>Después del plan</li><li><i class="prb-k3"></i>Falta</li><li><i class="prb-k4"></i>Sobra</li></ul>' +
      '<ul class="prb-dl" role="list" data-dl>' + driftRows + '</ul><p class="prb-dist" data-dist></p></section>';

    var planRows = as.map(function (a, i) {
      return '<tr class="prb-tr2" data-i="' + i + '"><td><span class="prb-act" data-act></span></td>' +
        '<th scope="row"><span class="prb-ta">' + mark(a.ticker) + '<span class="prb-dn"><strong>' + esc(a.ticker) + '</strong><span>' + esc(a.name) + '</span></span></span></th>' +
        '<td class="num" data-qty></td><td class="num prb-amt" data-amt></td>' +
        '<td class="prb-wc"><span class="num" data-w0></span><i aria-hidden="true">→</i><span class="num" data-w1></span><i aria-hidden="true">→</i><span class="num prb-w2" data-w2></span></td>' +
        '<td class="num" data-gain></td><td class="num" data-tax></td></tr>';
    }).join('');
    var planHTML = '<section class="prb-s panel" aria-labelledby="' + id + 'h4"><div class="panel-head"><h2 id="' + id + 'h4">Plan de operaciones</h2><button type="button" class="btn btn-secondary btn-sm prb-exp" data-export><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>Exportar plan</button></div>' +
      '<p class="prb-status" data-status role="status"></p>' +
      '<div class="prb-tw" tabindex="0" role="region" aria-label="Plan de operaciones, se desplaza horizontalmente"><table class="prb-tb"><thead><tr><th scope="col">Acción</th><th scope="col">Activo</th><th scope="col" class="r">Títulos</th><th scope="col" class="r">Monto</th><th scope="col" class="r">Peso hoy → objetivo → después</th><th scope="col" class="r">Ganancia realizada</th><th scope="col" class="r">ISR estimado</th></tr></thead><tbody data-tbody>' + planRows + '</tbody></table></div>' +
      '<p class="prb-fn" data-taxfn hidden>El ISR del total compensa ganancias y pérdidas de la misma clase; por eso puede ser menor que la suma de las filas.</p></section>';

    function cell(key, label, sub, note) {
      return '<article class="prb-k" data-k="' + key + '"><div class="prb-kh"><h3 class="prb-kn">' + esc(label) + '</h3>' + infoBtn(key, label) + '</div><p class="prb-kv num" data-kv></p><p class="prb-ks" data-ks>' + (sub || '') + '</p>' + defBox(key, note) + '</article>';
    }
    var ledHTML = '<section class="prb-s panel" aria-labelledby="' + id + 'h5"><div class="panel-head"><h2 id="' + id + 'h5">Totales del plan</h2></div><div class="prb-led" data-led>' +
      cell('buys', 'Compras', '', DEF.buys) + cell('sells', 'Ventas', '', DEF.sells) + cell('commission', 'Comisiones', '0,25 % + IVA por operación', DEF.commission) +
      cell('tax', 'ISR estimado', '', DEF.tax) + cell('cash', 'Efectivo restante', '', DEF.cash) + cell('turnover', 'Rotación', '', DEF.turnover) + cell('ops', 'Operaciones', '', DEF.ops) + '</div></section>';

    function baRow(key, label, def) {
      return '<li class="prb-br" data-b="' + key + '"><div class="prb-bl"><span>' + esc(label) + '</span>' + infoBtn('b' + key, label) + '</div><span class="prb-bv num" data-b0></span><span class="prb-bv num prb-b1" data-b1></span><span class="prb-bd num" data-bd></span>' + defBox('b' + key, def) + '</li>';
    }
    var rcRows = order.map(function (i) {
      return '<li class="prb-rr" data-i="' + i + '"><span class="prb-rn">' + esc(as[i].ticker) + '</span><span class="prb-rb" aria-hidden="true"><i class="prb-rb0"></i><i class="prb-rb1"></i></span><span class="prb-rv num"><b data-r0></b><i aria-hidden="true">→</i><b data-r1></b></span></li>';
    }).join('');
    var baHTML = '<section class="prb-s panel" aria-labelledby="' + id + 'h6"><div class="panel-head"><h2 id="' + id + 'h6">Antes y después</h2><span class="muted">Con los supuestos de largo plazo del modelo</span></div>' +
      '<ul class="prb-ba" role="list"><li class="prb-bh" aria-hidden="true"><span></span><span class="prb-bv">Antes</span><span class="prb-bv">Después</span><span class="prb-bd">Cambio</span></li>' +
      baRow('vol', 'Volatilidad anual', DEF.vol) + baRow('er', 'Rendimiento esperado', DEF.er) + baRow('beta', 'Beta frente al S&P 500', DEF.beta) + baRow('loss', 'Pérdida en un mal año (1 de cada 20)', DEF.loss) + '</ul>' +
      '<div class="prb-rch"><h3>Contribución al riesgo</h3><ul class="prb-key" aria-hidden="true"><li><i class="prb-k5"></i>Antes</li><li><i class="prb-k6"></i>Después</li></ul></div>' +
      '<p class="prb-rcn">Qué parte de la volatilidad del portafolio aporta cada posición. Una posición pequeña puede aportar mucho riesgo si se mueve fuerte o sube y baja con las demás.</p>' +
      '<ul class="prb-rl" role="list" data-rl>' + rcRows + '</ul></section>';

    mount.innerHTML = '<div class="prb" id="' + id + '"><p class="prb-tag">Un plan en ' + BS() + ' para acercar <b>' + esc(inp.name || 'tu portafolio') + '</b> al objetivo que elijas, con comisiones e ISR estimados.</p>' +
      (todos ? '<p class="prb-orient" role="note">Plan orientativo: cada operación se hace en su portafolio.</p>' : '') +
      targetHTML + modeHTML + driftHTML + planHTML + ledHTML + baHTML + '<p class="prb-foot">Ejercicio informativo · no es asesoría de inversión</p></div>';
    var $ = function (s, r) { return (r || mount).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || mount).querySelectorAll(s)); };

    /* ---------- cifras que ruedan (un solo bucle) ---------- */
    function tick() {
      cancelAnimationFrame(rid); clearTimeout(tid); if (dead) return;
      var now = performance.now(), keep = [];
      tweens.forEach(function (w) {
        if (w.el._w !== w) return;
        var kk = (now - w.t0) / w.dur; if (kk < 0) { keep.push(w); return; }
        kk = clamp(kk, 0, 1); var e = 1 - Math.pow(1 - kk, 3), v = w.from + (w.to - w.from) * e;
        w.el._v = v; w.el.textContent = w.fmt(kk >= 1 ? w.to : v);
        if (kk < 1) keep.push(w); else w.el._w = null;
      });
      tweens = keep; if (tweens.length) { rid = requestAnimationFrame(tick); tid = setTimeout(tick, 50); }
    }
    function setNum(el, to, fmt, animate, delay, from0) {
      if (!el) return; var from = from0 != null ? from0 : (el._v == null ? to : el._v);
      el._t = to; el._f = fmt;
      if (!animate || reduce() || from === to) { el._w = null; el._v = to; el.textContent = fmt(to); return; }
      var w = { el: el, from: from, to: to, fmt: fmt, t0: performance.now() + (delay || 0), dur: 260 + (from0 != null ? 280 : 0) }; el._w = w; el._v = from; el.textContent = fmt(from);
      tweens.push(w); tick();
    }
    function setTxt(el, t) { if (el && el.textContent !== t) el.textContent = t; }
    var fPct1 = function (v) { return fN(v * 100, 1) + ' %'; };

    /* ---------- cálculo (solo llama al motor) ---------- */
    function targetW() {
      if (S.sel === 'custom') return custom.map(function (x) { return Math.max(0, x); });
      return Array.prototype.slice.call(byId[S.sel].w);
    }
    function compute() {
      var w = targetW(), s = 0; w.forEach(function (x) { s += x; });
      if (!(s > 0)) w = as.map(function () { return 1; });
      return M.rebalance(inp, w, { mode: S.mode, extra: S.extra, minTrade: S.minTrade, useCash: true });
    }

    /* ---------- pintar ---------- */
    var rowsByI = {}, driftByI = {}, rcByI = {}, lastOrder = '';
    $$('.prb-tr2', mount).forEach(function (n) { rowsByI[n.dataset.i] = n; });
    $$('.prb-dr', mount).forEach(function (n) { driftByI[n.dataset.i] = n; });
    $$('.prb-rr', mount).forEach(function (n) { rcByI[n.dataset.i] = n; });
    var tb = $('[data-tbody]');

    function tfm(f) { return 'translateX(' + (f * 100).toFixed(3) + '%)'; }
    function paintDrift(animate) {
      var tw = R.target;
      order.forEach(function (i) {
        var n = driftByI[i], t = R.trades[i], now = t.wNow, tg = tw[i], af = t.wAfter, lo = Math.min(now, tg), hi = Math.max(now, tg);
        var cur = $('.prb-cur', n), gap = $('.prb-gap', n), tgm = $('.prb-tg', n), afm = $('.prb-af', n);
        cur.style.transform = 'scaleX(' + clamp(now / axis, 0, 1).toFixed(4) + ')';
        gap.style.transform = tfm(clamp(lo / axis, 0, 1)) + ' scaleX(' + clamp((hi - lo) / axis, 0, 1).toFixed(4) + ')';
        gap.className = 'prb-gap ' + (now > tg ? 'over' : 'under');
        tgm.style.transform = tfm(clamp(tg / axis, 0, 1)); afm.style.transform = tfm(clamp(af / axis, 0, 1));
        setNum($('[data-now]', n), now, fPct1, false); setNum($('[data-tgt]', n), tg, fPct1, animate);
        var d = (tg - now) * 100, dd = $('[data-dd]', n);
        dd.textContent = Math.abs(d) < 0.05 ? 'En el objetivo' : (d > 0 ? 'Subir ' : 'Bajar ') + fN(Math.abs(d), 1) + ' pts';
        $('[data-bar]', n).setAttribute('aria-label', t.ticker + ': hoy ' + fN(now * 100, 1) + ' por ciento, objetivo ' + fN(tg * 100, 1) + ', después del plan ' + fN(af * 100, 1));
      });
      setTxt($('[data-axis]'), 'Escala de 0 a ' + fN(axis * 100, 0) + ' %');
    }
    function actOf(t) { return t.side === 'buy' ? 'Comprar' : t.side === 'sell' ? 'Vender' : 'Mantener'; }
    function paintPlan(animate) {
      var tops = {}; if (animate) Object.keys(rowsByI).forEach(function (i) { tops[i] = rowsByI[i].getBoundingClientRect().top; });
      var rank = { sell: 0, buy: 1, hold: 2 }, ord = as.map(function (a, i) { return i; }).sort(function (a, b) {
        var ta = R.trades[a], tb2 = R.trades[b]; if (rank[ta.side] !== rank[tb2.side]) return rank[ta.side] - rank[tb2.side];
        return ta.side === 'hold' ? as[b].w - as[a].w : Math.abs(tb2.amount) - Math.abs(ta.amount);
      });
      var key = ord.join(','), changed = key !== lastOrder; lastOrder = key;
      if (changed) ord.forEach(function (i) { tb.appendChild(rowsByI[i]); });
      var taxRows = 0;
      ord.forEach(function (i) {
        var t = R.trades[i], n = rowsByI[i], act = $('[data-act]', n);
        n.className = 'prb-tr2 ' + t.side; act.className = 'prb-act ' + t.side; act.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (t.side === 'buy' ? '<path d="M12 18V6M6 11l6-6 6 6"/>' : t.side === 'sell' ? '<path d="M12 6v12M6 13l6 6 6-6"/>' : '<path d="M6 12h12"/>') + '</svg>' + actOf(t);
        setTxt($('[data-qty]', n), qtyTxt(t.qty, t.ck));
        setNum($('[data-amt]', n), t.amount, function (v) { return Math.abs(v) < 0.5 ? '—' : fS(v); }, animate);
        setNum($('[data-w0]', n), t.wNow, fPct1, false); setNum($('[data-w1]', n), R.target[i], fPct1, animate); setNum($('[data-w2]', n), t.wAfter, fPct1, animate);
        setNum($('[data-gain]', n), t.side === 'sell' ? t.gain : 0, function (v) { return t.side === 'sell' ? fS(v) : '—'; }, animate);
        setNum($('[data-tax]', n), t.tax, function (v) { return v >= 0.5 ? fM(v) : '—'; }, animate); taxRows += t.tax;
      });
      if (changed && animate && !reduce()) ord.forEach(function (i) {
        var n = rowsByI[i], o = tops[i]; if (o == null || !n.animate) return; var d = o - n.getBoundingClientRect().top;
        if (Math.abs(d) > 1) n.animate([{ transform: 'translateY(' + d + 'px)' }, { transform: 'none' }], { duration: 300, easing: EXPO });
      });
      $('[data-taxfn]').hidden = !(taxRows - R.totals.tax > 1);
      var tt = R.totals, st = $('[data-status]');
      if (!tt.ops) st.textContent = S.mode === 'contrib' && tt.cashBefore < S.minTrade ? 'Para comprar necesitas efectivo: agrega una aportación adicional.' : 'Sin operaciones: ya estás en el objetivo o las diferencias son menores a la operación mínima.';
      else st.textContent = tt.ops + (tt.ops === 1 ? ' operación' : ' operaciones') + ' · distancia al objetivo de ' + pct(R.distBefore) + ' a ' + pct(R.distAfter) + '. Los títulos se redondean a lotes enteros (la cripto admite fracciones).';
      $('[data-export]').disabled = !tt.ops;
    }
    function paintTotals(animate) {
      var tt = R.totals, cfg = {
        buys: [tt.buys, fM, ''], sells: [tt.sells, fM, ''], commission: [tt.commission, fM, null],
        tax: [tt.tax, fM, 'Ganancia realizada ' + fS(tt.gainSec + tt.gainCrypto) + ' · se paga en la declaración anual'],
        cash: [tt.cashAfter, fM, 'Hoy ' + fM(tt.cashBefore) + ' disponibles'], turnover: [tt.turnover, fPct1, 'Del valor del portafolio'], ops: [tt.ops, function (v) { return String(Math.round(v)); }, null]
      };
      Object.keys(cfg).forEach(function (kx) {
        var c = $('[data-k="' + kx + '"]'), v = cfg[kx]; setNum($('[data-kv]', c), v[0], v[1], animate);
        if (v[2] !== null) setTxt($('[data-ks]', c), v[2]);
      });
      setTxt($('[data-ks]', $('[data-k="buys"]')), R.trades.filter(function (t) { return t.side === 'buy'; }).length + ' compras');
      setTxt($('[data-ks]', $('[data-k="sells"]')), R.trades.filter(function (t) { return t.side === 'sell'; }).length + ' ventas');
      setTxt($('[data-ks]', $('[data-k="ops"]')), 'Compras y ventas del plan');
      if (tt.gainCrypto) setTxt($('[data-ks]', $('[data-k="tax"]')), 'BMV/SIC 10 % · cripto 30 % estimado · ganancia ' + fS(tt.gainSec + tt.gainCrypto));
      else setTxt($('[data-ks]', $('[data-k="tax"]')), 'BMV/SIC 10 % · ganancia realizada ' + fS(tt.gainSec) + ' · se paga en la declaración anual');
    }
    function paintBA(animate) {
      var b = R.before, a = R.after, defs = {
        vol: [b.sigma * 100, a.sigma * 100, function (v) { return fN(v, 1) + ' %'; }, function (v) { return sgn(v, 1, ' pts'); }],
        er: [b.er * 100, a.er * 100, function (v) { return fN(v, 1) + ' %'; }, function (v) { return sgn(v, 1, ' pts'); }],
        beta: [b.beta, a.beta, function (v) { return fN(v, 2); }, function (v) { return sgn(v, 2); }],
        loss: [b.loss1y95 * 100, a.loss1y95 * 100, function (v) { return fN(v, 1) + ' %'; }, function (v) { return sgn(v, 1, ' pts'); }]
      };
      Object.keys(defs).forEach(function (kx) {
        var r = $('[data-b="' + kx + '"]'), d = defs[kx]; setNum($('[data-b0]', r), d[0], d[2], false); setNum($('[data-b1]', r), d[1], d[2], animate);
        var dl = $('[data-bd]', r); dl.textContent = ''; setNum(dl, d[1] - d[0], d[3], animate, 0, null);
      });
      var mx = 0.1; order.forEach(function (i) { mx = Math.max(mx, b.rc[i], a.rc[i]); }); mx = Math.min(1.2, Math.ceil(mx * 10) / 10);
      order.forEach(function (i) {
        var n = rcByI[i]; $('.prb-rb0', n).style.transform = 'scaleX(' + clamp(Math.max(0, b.rc[i]) / mx, 0, 1).toFixed(4) + ')'; $('.prb-rb1', n).style.transform = 'scaleX(' + clamp(Math.max(0, a.rc[i]) / mx, 0, 1).toFixed(4) + ')';
        setNum($('[data-r0]', n), b.rc[i], fPct1, false); setNum($('[data-r1]', n), a.rc[i], fPct1, animate);
        n.setAttribute('aria-label', as[i].ticker + ': contribución al riesgo ' + fN(b.rc[i] * 100, 1) + ' por ciento antes, ' + fN(a.rc[i] * 100, 1) + ' después');
      });
    }
    function paintDist() { setTxt($('[data-dist]'), 'Distancia al objetivo: ' + pct(R.distBefore) + ' hoy → ' + pct(R.distAfter) + ' después del plan.'); }
    function paintHints() {
      var inc = S.extra > 0 ? ' Con la aportación de ' + fM(S.extra) + ' hay ' + fM(R.totals.cashBefore) + ' para operar.' : '';
      setTxt($('[data-modehint]'), S.mode === 'contrib' ? 'Solo compras con tu efectivo y tu aportación: no vendes, así que no pagas ISR. El plan se acerca al objetivo sin llegar a él.' + inc : 'Compras y vendes para llegar al objetivo. Las ventas con ganancia generan ISR estimado que se paga en la declaración anual.' + inc);
      setTxt($('[data-cash]'), 'Efectivo disponible ' + fM(inp.cash));
    }
    function paintCustom() {
      var s = 0; custom.forEach(function (x) { s += Math.max(0, x); });
      var sumEl = $('[data-sum]'); sumEl.textContent = fN(s, 1) + ' %';
      var bar = $('[data-sumbar]'); bar.style.transform = 'scaleX(' + clamp(s / 100, 0, 1).toFixed(4) + ')'; bar.className = Math.abs(s - 100) < 0.05 ? 'ok' : s > 100 ? 'over' : 'under';
      var sn = $('[data-sumn]'), off100 = Math.abs(s - 100) >= 0.05;
      sn.textContent = !off100 ? 'Suma 100 %' : s > 100 ? 'Sobran ' + fN(s - 100, 1) + ' pts. El plan usa los pesos normalizados.' : s <= 0 ? 'Pon al menos un peso. Mientras tanto se usan pesos iguales.' : 'Faltan ' + fN(100 - s, 1) + ' pts. El plan usa los pesos normalizados.';
      $('[data-norm]').setAttribute('aria-disabled', String(!off100)); $('[data-norm]').classList.toggle('is-off', !off100);
    }
    function update(animate) {
      R = compute(); paintDrift(animate); paintPlan(animate); paintTotals(animate); paintBA(animate); paintDist(); paintHints(); if (S.sel === 'custom') paintCustom();
    }

    /* ---------- objetivo ---------- */
    var noteEl = $('[data-note]'), whyEl = $('[data-why]'), cuEl = $('[data-cu]'), chipsEl = $('[data-chips]');
    function paintNote(animate) {
      var t = S.sel === 'custom' ? 'Escribe el peso objetivo de cada posición. Si no suman 100 %, el plan las normaliza.' : byId[S.sel].note;
      noteEl.textContent = t; whyEl.textContent = S.sel === 'sharpe' ? SHARPE_WHY : ''; whyEl.hidden = S.sel !== 'sharpe';
      if (animate && !reduce() && noteEl.animate) { noteEl.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: EXPO }); if (S.sel === 'sharpe' && whyEl.animate) whyEl.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: 40, easing: EXPO }); }
    }
    function select(sid, focus) {
      if (sid === S.sel) return; S.sel = sid;
      $$('.prb-chipb', chipsEl).forEach(function (b) { var on = b.dataset.id === sid; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
      if (sid === 'custom') cuEl.setAttribute('data-open', ''); else cuEl.removeAttribute('data-open');
      paintNote(true); update(true);
    }
    chipsEl.addEventListener('click', function (e) { var b = e.target.closest('.prb-chipb'); if (b) select(b.dataset.id, false); });
    chipsEl.addEventListener('keydown', function (e) {
      var bs = $$('.prb-chipb', chipsEl), cur = bs.findIndex(function (b) { return b.dataset.id === S.sel; }), n = cur;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (cur + 1) % bs.length; else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (cur - 1 + bs.length) % bs.length; else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = bs.length - 1; else return;
      e.preventDefault(); select(bs[n].dataset.id, true);
    });

    /* ---------- personalizado ---------- */
    var pendU = 0;
    function later() { if (pendU) return; pendU = requestAnimationFrame(function () { pendU = 0; if (!dead) update(true); }); }
    off.push(function () { cancelAnimationFrame(pendU); });
    $('.prb-cgrid').addEventListener('input', function (e) { var i = e.target.getAttribute('data-ci'); if (i == null) return; custom[+i] = clamp(parseNum(e.target.value, true), 0, 1000); later(); });
    $('.prb-cgrid').addEventListener('change', function (e) { var i = e.target.getAttribute('data-ci'); if (i == null) return; e.target.value = fN(custom[+i], 1); });
    $('[data-norm]').addEventListener('click', function () {
      var s = 0; custom.forEach(function (x) { s += Math.max(0, x); }); if (Math.abs(s - 100) < 0.05) return;
      var base = s > 0 ? custom.map(function (x) { return Math.max(0, x) / s * 100; }) : custom.map(function () { return 100 / k; });
      var r = base.map(function (x) { return Math.round(x * 10) / 10; }), rs = 0; r.forEach(function (x) { rs += x; });
      var big = 0; r.forEach(function (x, i) { if (x > r[big]) big = i; }); r[big] = Math.round((r[big] + 100 - rs) * 10) / 10; /* el redondeo se absorbe en la mayor */
      custom = r; $$('[data-ci]', mount).forEach(function (el) { el.value = fN(custom[+el.getAttribute('data-ci')], 1); }); update(true);
    });

    /* ---------- modo y montos ---------- */
    var segM = $('.prb-mode');
    segM.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-mode]'); if (!b || b.dataset.mode === S.mode) return; S.mode = b.dataset.mode;
      $$('button', segM).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); segM.style.setProperty('--i', S.mode === 'contrib' ? 1 : 0); update(true);
    });
    function money(sel, key, floor) {
      var el = $(sel); el.addEventListener('input', function () { S[key] = Math.max(floor, parseNum(el.value, false)); later(); });
      el.addEventListener('change', function () { el.value = nf0.format(S[key]); });
    }
    money('[data-extra]', 'extra', 0); money('[data-min]', 'minTrade', 0);

    /* ---------- definiciones ---------- */
    mount.addEventListener('click', function (e) {
      var b = e.target.closest('.prb-i'); if (!b) return; var box = doc.getElementById(b.getAttribute('aria-controls')), open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open)); if (box) { if (open) box.setAttribute('data-open', ''); else box.removeAttribute('data-open'); }
    });

    /* ---------- exportar CSV ---------- */
    function csvCell(v) { var s = String(v == null ? '' : v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
    function exportCsv() {
      if (!R || !R.totals.ops) return;
      var tn = S.sel === 'custom' ? 'Personalizado' : byId[S.sel].name, rows = [['Acción', 'Ticker', 'Activo', 'Títulos', 'Precio ' + BS(), 'Monto ' + BS(), 'Peso hoy %', 'Peso objetivo %', 'Peso después %', 'Comisión ' + BS(), 'Ganancia realizada ' + BS(), 'ISR estimado ' + BS()]];
      R.trades.forEach(function (t, i) {
        if (t.side === 'hold') return;
        rows.push([actOf(t), t.ticker, t.name, t.qty, t.pxMxn.toFixed(4), t.amount.toFixed(2), (t.wNow * 100).toFixed(2), (R.target[i] * 100).toFixed(2), (t.wAfter * 100).toFixed(2), t.commission.toFixed(2), t.side === 'sell' ? t.gain.toFixed(2) : '', t.tax ? t.tax.toFixed(2) : '']);
      });
      var tt = R.totals; rows.push([]); rows.push(['Portafolio', inp.name || '']); rows.push(['Objetivo', tn]); rows.push(['Modo', S.mode === 'contrib' ? 'Solo comprar' : 'Comprar y vender']); rows.push(['Compras ' + BS(), tt.buys.toFixed(2)]); rows.push(['Ventas ' + BS(), tt.sells.toFixed(2)]);
      rows.push(['Comisiones ' + BS() + ' (0.25 % + IVA)', tt.commission.toFixed(2)]); rows.push(['ISR estimado ' + BS(), tt.tax.toFixed(2)]); rows.push(['Efectivo restante ' + BS(), tt.cashAfter.toFixed(2)]); rows.push(['Rotación %', (tt.turnover * 100).toFixed(2)]); rows.push(['Operaciones', tt.ops]);
      rows.push(['Ejercicio informativo · no es asesoría de inversión']);
      var csv = '﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob), a = doc.createElement('a');
      a.href = url; a.download = 'plan-rebalanceo-' + String(inp.id || 'portafolio').replace(/[^\w-]+/g, '-') + '-' + new Date().toISOString().slice(0, 10) + '.csv'; doc.body.appendChild(a); a.click(); doc.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    }
    $('[data-export]').addEventListener('click', exportCsv);

    /* ---------- primera vista ---------- */
    var started = false;
    function visible() { return mount.offsetWidth > 0 && mount.offsetHeight > 0; }
    function start() {
      if (started || dead) return; started = true;
      if (reduce()) return;
      var secs = $$('.prb > .prb-s');
      secs.forEach(function (s, i) { if (s.animate) s.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: i * 40, easing: EXPO, fill: 'backwards' }); });
      var i2 = 0; order.forEach(function (i) {
        var n = driftByI[i], d = 120 + (i2++) * 30;
        ['.prb-cur', '.prb-gap'].forEach(function (c) { var el = $(c, n); if (el.animate) el.animate([{ transform: 'translateX(0) scaleX(0)' }, { transform: el.style.transform }], { duration: 420, delay: d, easing: EXPO, fill: 'backwards' }); });
        ['.prb-tg', '.prb-af'].forEach(function (c) { var el = $(c, n); if (el.animate) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: d + 160, easing: EXPO, fill: 'backwards' }); });
        var r = rcByI[i]; ['.prb-rb0', '.prb-rb1'].forEach(function (c) { var el = $(c, r); if (el.animate) el.animate([{ transform: 'scaleX(0)' }, { transform: el.style.transform }], { duration: 420, delay: 200 + i2 * 30, easing: EXPO, fill: 'backwards' }); });
      });
      $$('[data-kv], [data-b1], [data-bd]', mount).forEach(function (el, j) { if (el._t != null && el._f) setNum(el, el._t, el._f, true, 140 + j * 20, 0); });
      $$('.prb-tr2', mount).forEach(function (n, j) { if (n.animate) n.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: 160 + j * 30, easing: EXPO, fill: 'backwards' }); });
    }
    paintNote(false); update(false);
    if (mount.animate && !reduce()) mount.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EXPO });
    if (window.ResizeObserver) { var ro = new ResizeObserver(function () { if (!started && visible()) start(); }); ro.observe(mount); off.push(function () { ro.disconnect(); }); }
    if (visible()) start(); else setTimeout(function () { if (!started && visible()) start(); }, 0);
    api.plan = function () { return R; }; api.state = function () { return S; };
    return api;
  }

  window.CampoPfRebal = { render: render };
})();
