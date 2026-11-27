/* Campo · Portafolio individual · pestaña "Correlación". Expone window.CampoPfCorrel.render(mount, portfolio|'todos', CampoTracker) -> { destroy } y .calc para pruebas.
   Mismo contenido que la pestaña real: correlación promedio, score de diversificación, par más correlacionado, matriz de Pearson, pares más relacionados y contribución al riesgo;
   más ratio de diversificación, par menos correlacionado y correlación de cada posición con el portafolio y con su benchmark.
   Cada posición usa su trayectoria de CampoPfResumen (`held`, misma semilla) convertida a MXN con el USD/MXN de CADA fecha. Retornos logarítmicos diarios, ventana compartida,
   Pearson sobre las fechas comunes de cada par (mínimo 20 retornos). En producción, con los datos reales de campo/datos.js. */
(function () {
  'use strict';
  function BS() { var t = window.CampoTracker; return (t && t.base) || 'MXN'; }
  var D = window.PORTIFY_DEMO, R = window.CampoPfResumen;
  if (!D || !R || !R.calc) return;
  var doc = typeof document !== 'undefined' ? document : null, root = doc && doc.documentElement;
  var TOT = 252, LAST = TOT - 1, MIN_N = 20, ANN = Math.sqrt(252), CAP = 55, S_PTS = 90;
  var PERIODS = [['1M', 21], ['3M', 63], ['6M', 126], ['1A', LAST]];
  var rmq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduce() { return !!rmq.matches; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var HOVER = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)').matches : false;
  var EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
  var nfc = {};
  function fN(v, d) { var k = d; if (!nfc[k]) nfc[k] = new Intl.NumberFormat('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d }); return nfc[k].format(v); }
  function fR(v) { return (v < 0 && Math.abs(v) >= 0.005 ? '−' : '') + fN(Math.abs(v), 2); }
  function fRs(v) { return (Math.abs(v) < 0.005 ? '' : v < 0 ? '−' : '+') + fN(Math.abs(v), 2); }
  function fPu(v, d) { return (v < 0 && Math.abs(v) >= 0.5 * Math.pow(10, -d) ? '−' : '') + fN(Math.abs(v), d) + ' %'; }
  function fPs(v, d) { return (Math.abs(v) < 0.5 * Math.pow(10, -d) ? '' : v < 0 ? '−' : '+') + fN(Math.abs(v), d) + ' %'; }
  function dTxt(iso) { return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, ''); }
  function level(r) { var a = Math.abs(r); return a >= 0.7 ? 'alta' : a >= 0.4 ? 'moderada' : 'baja'; }
  function sIdx(pi) { return Math.max(0, LAST - PERIODS[pi][1]); }

  /* ============================== cálculo ============================== */
  /* posiciones vigentes (cantidad > 0 hoy), tickers repetidos entre portafolios fusionados; serie diaria en MXN con el USD/MXN de cada fecha */
  function assetsOf(T, L) {
    var parts = L.parts || [L], fxs = T.fx.series, by = {}, list = [];
    parts.forEach(function (P) {
      (P.held || []).forEach(function (h) {
        var q = 0; h.lots.forEach(function (l) { if (l.idx <= LAST) q += l.q; });
        if (!(q > 1e-9)) return;
        var f = h.ccy === 'USD', val = q * h.path[LAST] * (T.rate ? T.rate(h.ccy) : (f ? fxs[LAST] : 1)), o = by[h.ticker];
        if (!o) {
          var p = new Float64Array(TOT); for (var t = 0; t < TOT; t++) p[t] = h.path[t] * (f ? fxs[t] : 1);
          o = by[h.ticker] = { tk: h.ticker, name: h.ticker, cls: '', ccy: h.ccy, p: p, v: 0 }; list.push(o);
        }
        o.v += val;
      });
    });
    L.rows.forEach(function (r) { if (by[r.ticker]) { by[r.ticker].name = r.name; by[r.ticker].cls = r.cls; } });
    var tot = 0; list.forEach(function (o) { tot += o.v; });
    list.sort(function (a, b) { return b.v - a.v; });
    var b = R.calc.benchOf(T, L.benchmark);
    return { n: list.length, list: list, tk: list.map(function (o) { return o.tk; }), w: list.map(function (o) { return tot > 0 ? o.v / tot : 1 / list.length; }),
      ret: list.map(function (o) { return logret(o.p); }), bench: { name: b.name, a: b.a, r: logret(b.a) }, dates: T.dates };
  }
  function logret(p) { var r = new Float64Array(TOT); r[0] = NaN; for (var t = 1; t < TOT; t++) r[t] = p[t] > 0 && p[t - 1] > 0 ? Math.log(p[t] / p[t - 1]) : NaN; return r; }
  /* Pearson sobre las fechas donde ambas series tienen retorno dentro de la ventana (s, LAST] */
  function corr(a, b, s) {
    var n = 0, sa = 0, sb = 0, t, x, y;
    for (t = s + 1; t <= LAST; t++) { x = a[t]; y = b[t]; if (x === x && y === y) { n++; sa += x; sb += y; } }
    if (n < MIN_N) return { r: null, n: n, why: 'Solo ' + n + ' retornos en común (mínimo ' + MIN_N + ')' };
    var ma = sa / n, mb = sb / n, nu = 0, da = 0, db = 0;
    for (t = s + 1; t <= LAST; t++) { x = a[t]; y = b[t]; if (x === x && y === y) { x -= ma; y -= mb; nu += x * y; da += x * x; db += y * y; } }
    if (!(da > 0 && db > 0)) return { r: null, n: n, why: 'Una de las series no varía en el periodo' };
    return { r: clamp(nu / Math.sqrt(da * db), -1, 1), n: n };
  }
  function std(a, s) {
    var n = 0, m = 0, t, v = 0; for (t = s + 1; t <= LAST; t++) if (a[t] === a[t]) { n++; m += a[t]; }
    if (n < MIN_N) return null; m /= n; for (t = s + 1; t <= LAST; t++) if (a[t] === a[t]) v += (a[t] - m) * (a[t] - m);
    return Math.sqrt(v / (n - 1));
  }
  function stats(A, s) {
    var n = A.n, M = [], sg = [], i, j, c, pairs = [], minN = Infinity, partial = 0;
    for (i = 0; i < n; i++) { var sd = std(A.ret[i], s); sg.push(sd == null ? 0 : sd); }
    for (i = 0; i < n; i++) {
      M[i] = [];
      for (j = 0; j < n; j++) {
        if (i === j) { M[i][j] = { r: 1, n: 0 }; for (var t = s + 1; t <= LAST; t++) if (A.ret[i][t] === A.ret[i][t]) M[i][j].n++; }
        else if (j < i) M[i][j] = M[j][i];
        else { c = corr(A.ret[i], A.ret[j], s); M[i][j] = c; if (c.r == null) partial++; else { pairs.push({ i: i, j: j, r: c.r, n: c.n }); if (c.n < minN) minN = c.n; } }
      }
    }
    var w = A.w, sw = 0, sc = 0, sws = 0, sumWS = 0, varP = 0, Sw = [], k;
    pairs.forEach(function (p) { sc += p.r; sw += w[p.i] * w[p.j]; sws += w[p.i] * w[p.j] * p.r; });
    for (i = 0; i < n; i++) sumWS += w[i] * sg[i];
    for (i = 0; i < n; i++) { Sw[i] = 0; for (j = 0; j < n; j++) Sw[i] += w[j] * (M[i][j].r == null ? 0 : M[i][j].r) * sg[i] * sg[j]; varP += w[i] * Sw[i]; }
    var sigP = Math.sqrt(Math.max(0, varP)), avgS = pairs.length ? sc / pairs.length : null, avgW = sw > 0 ? sws / sw : null;
    var score = avgS == null ? null : Math.round((1 - Math.max(0, avgS)) * 100);
    var byR = pairs.slice().sort(function (x, y) { return y.r - x.r; });
    var byAbs = pairs.slice().sort(function (x, y) { return Math.abs(y.r) - Math.abs(x.r); });
    var rhoP = [], rhoB = [], rc = [];
    for (i = 0; i < n; i++) {
      var cv = 0; for (j = 0; j < n; j++) cv += w[j] * sg[j] * (M[i][j].r == null ? 0 : M[i][j].r);
      rhoP.push(sigP > 0 ? clamp(cv / sigP, -1, 1) : null);
      rhoB.push(corr(A.ret[i], A.bench.r, s));
      rc.push({ i: i, weight: w[i] * 100, risk: varP > 0 ? w[i] * Sw[i] / varP * 100 : 0, sigmaAnn: sg[i] * ANN * 100 });
    }
    return { s: s, n: n, W: LAST - s, N: pairs.length ? minN : 0, M: M, sg: sg, w: w, pairs: pairs, partial: partial, avgS: avgS, avgW: avgW, score: score,
      scoreLbl: score == null ? '—' : score >= 70 ? 'Bien diversificado' : score >= 45 ? 'Diversificación media' : 'Concentrado / correlacionado',
      sumWS: sumWS, sigP: sigP, dr: sigP > 0 ? sumWS / sigP : null, volP: sigP * ANN * 100, volNo: sumWS * ANN * 100,
      saving: sumWS > 0 ? Math.max(0, (1 - sigP / sumWS) * 100) : 0, hi: byR[0] || null, lo: byR[byR.length - 1] || null, top: byAbs.slice(0, 6), rhoP: rhoP, rhoB: rhoB, rc: rc };
  }
  /* orden por clustering jerárquico (enlace promedio, distancia 1 − ρ); los extremos de cada fusión se orientan para dejar juntos a los más parecidos */
  function cluster(S, base) {
    function d(i, j) { var r = S.M[i][j].r; return 1 - (r == null ? 0 : r); }
    var cl = base.map(function (i) { return [i]; });
    function avg(a, b) { var t = 0; a.forEach(function (x) { b.forEach(function (y) { t += d(x, y); }); }); return t / (a.length * b.length); }
    while (cl.length > 1) {
      var bp = 0, bq = 1, bd = Infinity;
      for (var p = 0; p < cl.length; p++) for (var q = p + 1; q < cl.length; q++) { var v = avg(cl[p], cl[q]); if (v < bd - 1e-12) { bd = v; bp = p; bq = q; } }
      var a = cl[bp], b = cl[bq], best = null, bc = Infinity;
      [[a, b], [a.slice().reverse(), b], [a, b.slice().reverse()], [a.slice().reverse(), b.slice().reverse()]].forEach(function (c) { var cost = d(c[0][c[0].length - 1], c[1][0]); if (cost < bc - 1e-12) { bc = cost; best = c[0].concat(c[1]); } });
      cl.splice(bq, 1); cl[bp] = best;
    }
    return cl[0];
  }
  function pairInfo(A, S, i, j) {
    var s = S.s, a = A.list[i].p, b = A.list[j].p, W = LAST - s + 1, la = new Float64Array(W), lb = new Float64Array(W), lo = Infinity, hi = -Infinity;
    for (var t = 0; t < W; t++) { la[t] = a[s + t] / a[s] * 100; lb[t] = b[s + t] / b[s] * 100; lo = Math.min(lo, la[t], lb[t]); hi = Math.max(hi, la[t], lb[t]); }
    return { a: la, b: lb, lo: lo, hi: hi, ra: la[W - 1] - 100, rb: lb[W - 1] - 100 };
  }

  /* ============================== DOM auxiliar ============================== */
  var uid = 0;
  function every(fn) { var done = false, r = 0, t = 0; (function run() { if (done) return; cancelAnimationFrame(r); clearTimeout(t); if (fn() === false) { done = true; return; } r = requestAnimationFrame(run); t = setTimeout(run, 50); })(); }
  function mark(t, n) { return window.CampoMarks ? window.CampoMarks.svg(t, n || 20) : '<span class="pfc-chip">' + esc(String(t).charAt(0)) + '</span>'; }
  function li(k, a, b, cls) { return '<li class="pfc-fl' + (cls ? ' ' + cls : '') + '" style="--i:' + k + '">' + (b == null ? '<span class="pfc-fx">' + a + '</span>' : '<span>' + a + '</span><span class="num">' + b + '</span>') + '</li>'; }
  function lines(arr) { return arr.map(function (r, k) { return li(k, r[0], r[1], r[2]); }).join(''); }
  function dxHTML(did, label, arr) {
    return '<button type="button" class="pfc-q" aria-expanded="false" aria-controls="' + did + '">¿Cómo se calcula?<svg class="pfc-qi" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></button>' +
      '<div class="pfc-dx" id="' + did + '" role="region" aria-label="' + esc(label) + '"><div class="pfc-dxi"><ul class="pfc-fls" data-lines>' + lines(arr) + '</ul></div></div>';
  }
  function heat(r) { return r == null ? [0, 0] : [r > 0 ? Math.min(1, r) * CAP : 0, r < 0 ? Math.min(1, -r) * CAP : 0]; }

  /* ============================== vista ============================== */
  function render(mount, portfolio, T) {
    var off = [], dead = false;
    var pf = portfolio === 'todos' || (portfolio && portfolio.cons) ? 'todos' : (typeof portfolio === 'string' ? T.get(portfolio) : portfolio);
    var L = pf === 'todos' ? R.calc.aggregate(T) : (pf ? R.calc.buildLedger(T, pf) : null);
    function destroy() { if (dead) return; dead = true; off.forEach(function (f) { try { f(); } catch (e) { } }); off = []; if (mount) mount.innerHTML = ''; }
    var api = { destroy: destroy, ledger: L };
    var A = L ? assetsOf(T, L) : null;
    if (!A || A.n < 2) {
      mount.innerHTML = '<div class="pfc"><div class="pfc-empty"><strong>' + (A && A.n === 1 ? 'Necesitas al menos 2 posiciones para medir correlaciones' : 'Este portafolio aún no tiene posiciones') + '</strong><p>Con dos o más activos verás cómo se mueven entre sí, qué tan diversificado está el portafolio y cuánto riesgo aporta cada posición.</p></div></div>';
      return api;
    }
    var id = 'pfc' + (++uid), n = A.n, dates = A.dates, Pi = 3, mode = 'peso', St = stats(A, sIdx(Pi)), started = false, sel = null;
    var base = A.w.map(function (x, i) { return i; });
    function orderFor() { return mode === 'peso' ? base.slice() : cluster(St, base); }
    var order = orderFor(), pos = []; function setPos() { order.forEach(function (a, k) { pos[a] = k; }); } setPos();

    /* ---------- selector compartido ---------- */
    var bar = '<div class="pfc-bar" role="group" aria-label="Periodo del análisis"><span class="pfc-barl">Periodo del análisis</span><div class="seg pfc-sp" role="group" aria-label="Periodo" style="--n:4;--i:' + Pi + '"><span class="seg-pill" aria-hidden="true"></span>' +
      PERIODS.map(function (p, i) { return '<button type="button" data-p="' + i + '" aria-pressed="' + (i === Pi) + '">' + p[0] + '</button>'; }).join('') + '</div><span class="pfc-barn" data-barn></span></div>';

    /* ---------- bloque 1: resumen de diversificación ---------- */
    var cardDefs = [
      { k: 'avw', name: 'Correlación promedio ponderada', tip: 'Promedio de las correlaciones de todos los pares, cada par ponderado por el peso de sus dos activos. Rango −1 a +1; menor es mejor.' },
      { k: 'scr', name: 'Score de diversificación', tip: 'De 0 a 100 a partir de la correlación promedio simple de los pares: 100 si no hay correlación positiva.' },
      { k: 'dr', name: 'Ratio de diversificación', tip: 'Suma ponderada de las volatilidades de cada activo ÷ volatilidad del portafolio. 1× = sin beneficio; más alto, más diversificado.' },
      { k: 'hi', name: 'Par más correlacionado', tip: 'El par con la correlación más alta. Un valor alto indica comportamiento muy parecido y posible redundancia.' },
      { k: 'lo', name: 'Par menos correlacionado', tip: 'El par con la correlación más baja: el que más aporta a diversificar.' }];
    var cardsHTML = cardDefs.map(function (c) {
      return '<div class="pfc-card" data-k="' + c.k + '"><span class="pfc-cl">' + c.name + '</span><strong class="pfc-cv num" data-kv>—</strong><span class="pfc-cs" data-ks>—</span></div>';
    }).join('');
    function sumLines() {
      var S = St, a = [['ρ<sub>ij</sub> = Pearson de los retornos logarítmicos diarios (en ' + BS() + ') del periodo'],
        ['Peso w<sub>i</sub> = valor actual de la posición ÷ valor de las ' + n + ' posiciones'],
        ['ρ̄<sub>pond</sub> = Σ<sub>i&lt;j</sub> w<sub>i</sub>w<sub>j</sub>ρ<sub>ij</sub> ÷ Σ<sub>i&lt;j</sub> w<sub>i</sub>w<sub>j</sub>'],
        ['Promedio ponderado de pares', S.avgW == null ? '—' : fR(S.avgW)], ['Promedio simple de pares (' + S.pairs.length + ')', S.avgS == null ? '—' : fR(S.avgS)],
        ['Score = 100 × (1 − máx[0, promedio simple])', S.score == null ? '—' : S.score + ' / 100'],
        ['σ<sub>p</sub> = √(Σ<sub>i</sub>Σ<sub>j</sub> w<sub>i</sub>w<sub>j</sub>ρ<sub>ij</sub>σ<sub>i</sub>σ<sub>j</sub>) · σ<sub>i</sub> diaria del periodo'],
        ['Σ w<sub>i</sub>σ<sub>i</sub> (anualizada, √252)', fN(S.volNo, 1) + ' %'], ['σ<sub>p</sub> (anualizada, √252)', fN(S.volP, 1) + ' %'],
        ['Ratio = Σ w<sub>i</sub>σ<sub>i</sub> ÷ σ<sub>p</sub>', S.dr == null ? '—' : fN(S.dr, 2) + '×', 'res'],
        ['Pesos de hoy y ' + (S.W) + ' retornos del periodo, con la misma ventana en toda la pestaña.']];
      return a;
    }

    /* ---------- bloque 2: matriz ---------- */
    var cmax = n <= 5 ? 88 : n <= 9 ? 72 : 60, cmin = n > 10 ? 34 : 40;
    var gridHTML = '<div class="pfc-corner" aria-hidden="true"></div>';
    A.tk.forEach(function (t, j) { gridHTML += '<div class="pfc-ch" data-k="c' + j + '" data-j="' + j + '" title="' + esc(t) + '">' + mark(t, 20) + '<span>' + esc(t) + '</span></div>'; });
    A.tk.forEach(function (t, i) {
      gridHTML += '<div class="pfc-rh" data-k="r' + i + '" data-i="' + i + '">' + mark(t, 20) + '<span>' + esc(t) + '</span></div>';
      A.tk.forEach(function (u, j) { gridHTML += '<button type="button" class="pfc-c' + (i === j ? ' diag' : '') + '" data-k="x' + i + '-' + j + '" data-i="' + i + '" data-j="' + j + '" tabindex="-1"><span class="pfc-v num"></span></button>'; });
    });
    function mxLines() {
      var S = St, nn = 0; S.pairs.forEach(function (p) { nn = Math.max(nn, p.n); });
      return [['ρ<sub>ij</sub> = Σ(x−x̄)(y−ȳ) ÷ √[Σ(x−x̄)² · Σ(y−ȳ)²] · x, y = ln(P<sub>t</sub> ÷ P<sub>t−1</sub>) en ' + BS()],
        ['Periodo', dTxt(dates[S.s]) + ' → ' + dTxt(dates[LAST])], ['Retornos diarios en la ventana', String(S.W)], ['Retornos en común por par', S.pairs.length ? (S.N === nn ? String(S.N) : S.N + ' a ' + nn) : '—'],
        ['Mínimo para mostrar una correlación', MIN_N + ' retornos'],
        ['Cada precio se convierte a ' + BS() + ' con el tipo de cambio de su fecha: el tipo de cambio también mueve la correlación de los activos en otras monedas.'],
        ['La cripto opera fines de semana: se alinea con los días hábiles comunes (cierre de cada día hábil), así que el retorno del lunes incluye su fin de semana.'],
        ['Colores: cálido = se mueven juntos, frío = se mueven en sentido opuesto, neutro = sin relación lineal.']];
    }
    var topHTML = '<div class="pfc-pt" data-tp><div class="pfc-ptt">Pares más relacionados</div><ol class="pfc-pl" data-pl></ol></div>';
    var mxHTML = '<section class="pfc-s panel pfc-mx" aria-labelledby="' + id + 'h2"><div class="panel-head"><h2 id="' + id + 'h2">Matriz de correlación</h2><span class="muted" data-mxs></span></div>' +
      '<div class="pfc-mtools"><div class="seg pfc-so" role="group" aria-label="Orden de la matriz" style="--n:2;--i:0"><span class="seg-pill" aria-hidden="true"></span><button type="button" data-o="peso" aria-pressed="true">Por peso</button><button type="button" data-o="grupo" aria-pressed="false">Agrupado</button></div>' +
      '<span class="pfc-hint">Toca o haz clic en una celda para comparar el par.</span></div>' +
      '<div class="pfc-mxb"><div class="pfc-mxm"><div class="pfc-scroll" data-scroll tabindex="-1"><div class="pfc-grid" role="group" aria-label="Matriz de correlación entre posiciones" data-grid style="--n:' + n + ';--cmin:' + cmin + 'px;--cmax:' + cmax + 'px">' + gridHTML + '</div></div>' +
      '<div class="pfc-scale"><span>−1 inversa</span><div class="pfc-sw" aria-hidden="true"><span class="pfc-sbar"></span><div class="pfc-ticks"><span>−1.0</span><span>−0.5</span><span>0</span><span>+0.5</span><span>+1.0</span></div></div><span>+1 idéntica</span></div></div>' + topHTML + '</div>' +
      '<div class="pfc-pair" data-pair hidden role="region" aria-label="Comparación del par seleccionado" aria-live="polite"></div>' +
      dxHTML(id + '-d2', 'Cálculo de la matriz', mxLines()) + '<div class="pfc-tip" data-tip hidden></div></section>';

    /* ---------- bloque 3: contribución al riesgo ---------- */
    function rcLines() {
      var S = St; return [['RC<sub>i</sub> = w<sub>i</sub> · (Σw)<sub>i</sub> ÷ σ<sub>p</sub>² · (Σw)<sub>i</sub> = Σ<sub>j</sub> w<sub>j</sub>ρ<sub>ij</sub>σ<sub>i</sub>σ<sub>j</sub>'], ['La suma de las contribuciones es 100 %'],
        ['Volatilidad del portafolio (σ<sub>p</sub> × √252)', fN(S.volP, 1) + ' %'], ['Sin diversificar (Σ w<sub>i</sub>σ<sub>i</sub> × √252)', fN(S.volNo, 1) + ' %'],
        ['Ahorro = 1 − σ<sub>p</sub> ÷ Σ w<sub>i</sub>σ<sub>i</sub>', '−' + fN(S.saving, 0) + ' %', 'res'],
        ['Se marca ⚠ si el peso ≥ 0.5 %, el riesgo ≥ 3 % y el riesgo es ≥ 1.5× el peso'], ['Un riesgo negativo es cobertura: esa posición reduce la volatilidad total.'],
        ['Anualizada con √252 porque la serie es de días hábiles.']];
    }
    var rcHTML = '<section class="pfc-s panel" aria-labelledby="' + id + 'h3"><div class="panel-head"><h2 id="' + id + 'h3">Contribución al riesgo</h2><span class="muted">Peso vs riesgo real</span></div>' +
      '<div class="pfc-kp" data-kp></div><ul class="pfc-rl" data-rl></ul>' +
      '<div class="pfc-lg"><span><i class="pfc-lf"></i>Contribución al riesgo</span><span><i class="pfc-lm"></i>Peso (capital)</span><span><i class="pfc-lw"></i>Riesgo desproporcionado vs peso</span><span><i class="pfc-lc"></i>Cobertura</span></div>' +
      '<p class="pfc-note" data-rn></p>' + dxHTML(id + '-d3', 'Cálculo de la contribución al riesgo', rcLines()) + '</section>';

    /* ---------- bloque 4: con el portafolio y con el benchmark ---------- */
    function bnLines() {
      return [['ρ<sub>i,p</sub> = Σ<sub>j</sub> w<sub>j</sub>σ<sub>j</sub>ρ<sub>ij</sub> ÷ σ<sub>p</sub> (el portafolio incluye a la propia posición)'],
        ['ρ<sub>i,b</sub> = Pearson de los retornos diarios de la posición y de ' + esc(A.bench.name) + ' en ' + BS()], ['Benchmark del portafolio', esc(A.bench.name)], ['Retornos en la ventana', String(St.W)],
        ['Cerca de +1: la posición se mueve como el conjunto o el índice; cerca de 0 aporta algo distinto; negativa cubre.']];
    }
    var bnHTML = '<section class="pfc-s panel" aria-labelledby="' + id + 'h4"><div class="panel-head"><h2 id="' + id + 'h4">Con el portafolio y con el benchmark</h2><span class="muted">' + esc(A.bench.name) + '</span></div>' +
      '<div class="pfc-lg"><span><i class="pfc-lp"></i>Con el portafolio</span><span><i class="pfc-lb"></i>Con ' + esc(A.bench.name) + '</span></div><ul class="pfc-bl" data-bl></ul>' +
      dxHTML(id + '-d4', 'Cálculo de las correlaciones con portafolio y benchmark', bnLines()) + '</section>';

    mount.innerHTML = '<div class="pfc">' + bar +
      '<section class="pfc-s panel" aria-labelledby="' + id + 'h1"><div class="panel-head"><h2 id="' + id + 'h1">Resumen de diversificación</h2><span class="muted" data-sp></span></div><div class="pfc-cards">' + cardsHTML + '</div>' + dxHTML(id + '-d1', 'Cálculo de la diversificación', sumLines()) + '</section>' +
      mxHTML + '<div class="pfc-cols">' + rcHTML + bnHTML + '</div></div>';

    var $ = function (s, r) { return (r || mount).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || mount).querySelectorAll(s)); };
    var gridEl = $('[data-grid]'), scrollEl = $('[data-scroll]'), tipEl = $('[data-tip]'), mxEl = $('.pfc-mx'), pairEl = $('[data-pair]');
    var cells = $$('.pfc-c', gridEl), cellAt = {}; cells.forEach(function (c) { cellAt[c.dataset.i + '-' + c.dataset.j] = c; });
    var rhs = $$('.pfc-rh', gridEl), chs = $$('.pfc-ch', gridEl);

    /* ---------- divulgación ---------- */
    var supportsIS = !!(window.CSS && CSS.supports && CSS.supports('interpolate-size', 'allow-keywords'));
    mount.addEventListener('click', function (e) {
      var b = e.target.closest('.pfc-q'); if (!b) return;
      var dx = doc.getElementById(b.getAttribute('aria-controls')), open = b.getAttribute('aria-expanded') !== 'true'; if (!dx) return;
      b.setAttribute('aria-expanded', String(open));
      if (!supportsIS && !reduce() && dx.animate) {
        if (open) { dx.setAttribute('data-open', ''); var h = dx.scrollHeight; dx.animate([{ height: '0px' }, { height: h + 'px' }], { duration: 300, easing: EXPO }); }
        else { var h0 = dx.offsetHeight; dx.removeAttribute('data-open'); dx.animate([{ height: h0 + 'px' }, { height: '0px' }], { duration: 240, easing: EXPO }); }
      } else if (open) dx.setAttribute('data-open', ''); else dx.removeAttribute('data-open');
    });

    /* ---------- rodar cifras ---------- */
    var rollId = 0;
    function roll(el, from, to, fmt, dur, delay) {
      var my = ++rollId; el._r = my;
      if (reduce() || from == null || to == null || from === to || dur <= 0) { el.textContent = fmt(to); return; }
      var t0 = performance.now() + (delay || 0);
      every(function () {
        if (dead || el._r !== my) return false;
        var k = (performance.now() - t0) / dur; if (k < 0) return true;
        var e = 1 - Math.pow(1 - clamp(k, 0, 1), 3); el.textContent = fmt(from + (to - from) * e); if (k >= 1) { el.textContent = fmt(to); return false; }
      });
    }

    /* ---------- tarjetas ---------- */
    var cardState = {};
    function pairTxt(p) { return A.tk[p.i] + ' · ' + A.tk[p.j]; }
    function paintCards(animate) {
      var S = St, dur = animate ? 360 : 0;
      function cardEl(k) { return $('[data-k="' + k + '"]', $('.pfc-cards')); }
      var defs = {
        avw: { v: S.avgW, f: fR, s: S.avgS == null ? 'Sin pares calculables' : 'Promedio simple ' + fR(S.avgS) + ' · ' + S.pairs.length + ' pares' },
        scr: { v: S.score, f: function (x) { return Math.round(x) + ' / 100'; }, s: S.scoreLbl },
        dr: { v: S.dr, f: function (x) { return fN(x, 2) + '×'; }, s: S.dr == null ? '—' : 'Ahorro de volatilidad −' + fN(S.saving, 0) + ' %' },
        hi: { p: S.hi }, lo: { p: S.lo } };
      Object.keys(defs).forEach(function (k) {
        var c = cardEl(k), kv = $('[data-kv]', c), ks = $('[data-ks]', c), d = defs[k];
        if (d.p !== undefined) {
          var p = d.p; if (!p) { kv.textContent = '—'; ks.textContent = 'Sin pares calculables'; return; }
          kv.innerHTML = '<span class="pfc-pm">' + mark(A.tk[p.i], 20) + mark(A.tk[p.j], 20) + '</span><span class="pfc-pn">' + esc(pairTxt(p)) + '</span>';
          ks.innerHTML = 'ρ <b class="num">' + fRs(p.r) + '</b> · correlación ' + level(p.r); c.dataset.i = p.i; c.dataset.j = p.j; return;
        }
        ks.textContent = d.s; if (d.v == null) { kv.textContent = '—'; cardState[k] = null; return; }
        roll(kv, cardState[k], d.v, d.f, dur, 0); cardState[k] = d.v;
      });
      $$('.pfc-card[data-i]').forEach(function (c) { c.classList.add('go'); c.tabIndex = 0; c.setAttribute('role', 'button'); c.setAttribute('aria-label', $('.pfc-cl', c).textContent + ': ' + $('.pfc-pn', c).textContent + '. Abrir comparación'); });
    }
    $('.pfc-cards').addEventListener('click', function (e) { var c = e.target.closest('.pfc-card.go'); if (c) selectPair(+c.dataset.i, +c.dataset.j, true); });
    $('.pfc-cards').addEventListener('keydown', function (e) { var c = e.target.closest('.pfc-card.go'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectPair(+c.dataset.i, +c.dataset.j, true); } });

    /* ---------- matriz ---------- */
    var focusKey = null;
    function place() {
      var rows = {};
      chs.forEach(function (c) { c.style.gridRow = '1'; c.style.gridColumn = String(pos[+c.dataset.j] + 2); });
      rhs.forEach(function (r) { r.style.gridRow = String(pos[+r.dataset.i] + 2); r.style.gridColumn = '1'; });
      cells.forEach(function (c) { c.style.gridRow = String(pos[+c.dataset.i] + 2); c.style.gridColumn = String(pos[+c.dataset.j] + 2); });
      $('.pfc-corner', gridEl).style.gridArea = '1 / 1';
    }
    function cellLabel(i, j) {
      var m = St.M[i][j];
      if (i === j) return A.tk[i] + ' consigo mismo: correlación 1';
      return m.r == null ? A.tk[i] + ' con ' + A.tk[j] + ': sin dato. ' + m.why : A.tk[i] + ' con ' + A.tk[j] + ': correlación ' + fRs(m.r) + ', ' + m.n + ' días en común';
    }
    var cellState = {}, cellRid = 0, pairRid = 0;
    function paintCells(animate) {
      var S = St, t0 = performance.now(), todo = [];
      cells.forEach(function (c) {
        var i = +c.dataset.i, j = +c.dataset.j, m = S.M[i][j], key = i + '-' + j, v = i === j ? null : m.r, h = i === j ? [0, 0] : heat(v), vEl = c.firstChild;
        c.style.setProperty('--mp', h[0].toFixed(1) + '%'); c.style.setProperty('--mn', h[1].toFixed(1) + '%');
        c.classList.toggle('nul', i !== j && v == null); c.setAttribute('aria-label', cellLabel(i, j));
        if (i === j) { vEl.textContent = '1.00'; return; }
        if (v == null) { vEl.textContent = '—'; cellState[key] = null; return; }
        var from = cellState[key]; cellState[key] = v;
        if (animate && !reduce() && from != null && from !== v) todo.push([vEl, from, v]); else vEl.textContent = fR(v);
      });
      $('[data-mxs]').textContent = n + ' posiciones · ' + S.W + ' retornos diarios · ' + (S.partial ? S.partial + ' pares sin dato' : 'sin huecos');
      var my = ++cellRid;
      if (todo.length) every(function () {
        if (dead) return false;
        if (my !== cellRid) { todo.forEach(function (x) { x[0].textContent = fR(x[2]); }); return false; }
        var k = clamp((performance.now() - t0) / 360, 0, 1), e = 1 - Math.pow(1 - k, 3);
        todo.forEach(function (x) { x[0].textContent = fR(x[1] + (x[2] - x[1]) * e); });
        if (k >= 1) return false;
      });
    }
    function sizeGrid() {
      var c = cells[0]; if (!c) return; var w = c.getBoundingClientRect().width;
      gridEl.classList.toggle('nov', w > 0 && w < 34);
    }
    function applyOrder(animate) {
      var all = $$('[data-k]', gridEl), first = {};
      var go = animate && !reduce() && started;
      if (go) all.forEach(function (e) { first[e.dataset.k] = e.getBoundingClientRect(); });
      order = orderFor(); setPos(); place(); hideTip();
      if (go) all.forEach(function (e) {
        var a = first[e.dataset.k], b = e.getBoundingClientRect(); if (!a || !e.animate) return;
        var dx = a.left - b.left, dy = a.top - b.top; if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        e.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 360, easing: EXPO });
      });
      $$('.pfc-c', gridEl).forEach(function (c) { c.tabIndex = -1; });
      var fk = focusKey && cellAt[focusKey] ? focusKey : order[0] + '-' + order[0];
      if (!cellAt[fk]) fk = '0-0'; cellAt[fk].tabIndex = 0; focusKey = fk;
    }
    function setSelClass() { cells.forEach(function (c) { var i = +c.dataset.i, j = +c.dataset.j; c.classList.toggle('sel', !!sel && i !== j && ((i === sel.i && j === sel.j) || (i === sel.j && j === sel.i))); }); }

    /* ---------- cruz de lectura y tooltip ---------- */
    var hot = null;
    function setHot(i, j) {
      if (hot && hot.i === i && hot.j === j) return; hot = i == null ? null : { i: i, j: j };
      gridEl.classList.toggle('hv', !!hot);
      cells.forEach(function (c) { var ci = +c.dataset.i, cj = +c.dataset.j; c.classList.toggle('x', !!hot && (ci === i || cj === j)); c.classList.toggle('hc', !!hot && ci === i && cj === j); });
      rhs.forEach(function (r) { r.classList.toggle('hot', !!hot && +r.dataset.i === i); });
      chs.forEach(function (c) { c.classList.toggle('hot', !!hot && +c.dataset.j === j); });
    }
    function showTip(c) {
      var i = +c.dataset.i, j = +c.dataset.j, m = St.M[i][j], html;
      if (i === j) html = '<strong>' + esc(A.tk[i]) + '</strong><span>Consigo mismo · ρ <b class="num">1.00</b></span>';
      else if (m.r == null) html = '<strong>' + esc(A.tk[i]) + ' × ' + esc(A.tk[j]) + '</strong><span>—</span><span class="pfc-tp">' + esc(m.why) + '</span>';
      else html = '<strong>' + esc(A.tk[i]) + ' × ' + esc(A.tk[j]) + '</strong><span><b class="num">' + fRs(m.r) + '</b> · correlación ' + level(m.r) + (m.r >= 0 ? ' positiva' : ' negativa') + '</span><span>' + m.n + ' días en común</span>';
      tipEl.innerHTML = html; tipEl.hidden = false;
      var hr = mxEl.getBoundingClientRect(), r = c.getBoundingClientRect(), tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
      var x = clamp(r.left - hr.left + r.width / 2 - tw / 2, 0, Math.max(0, hr.width - tw)), y = r.top - hr.top - th - 8; if (y < 0) y = r.bottom - hr.top + 8;
      tipEl.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    }
    function hideTip() { tipEl.hidden = true; }
    if (HOVER) {
      gridEl.addEventListener('pointerover', function (e) { var c = e.target.closest('.pfc-c'); if (c) { setHot(+c.dataset.i, +c.dataset.j); showTip(c); } });
      gridEl.addEventListener('pointerleave', function () { if (!gridEl.contains(doc.activeElement) || !doc.activeElement.classList.contains('pfc-c')) setHot(null); hideTip(); });
    }
    gridEl.addEventListener('focusin', function (e) { var c = e.target.closest('.pfc-c'); if (c) { setHot(+c.dataset.i, +c.dataset.j); showTip(c); focusKey = c.dataset.i + '-' + c.dataset.j; $$('.pfc-c', gridEl).forEach(function (x) { x.tabIndex = x === c ? 0 : -1; }); } });
    gridEl.addEventListener('focusout', function (e) { if (!gridEl.contains(e.relatedTarget)) { setHot(null); hideTip(); } });
    scrollEl.addEventListener('scroll', hideTip, { passive: true });
    gridEl.addEventListener('click', function (e) { var c = e.target.closest('.pfc-c'); if (!c) return; showTip(c); setHot(+c.dataset.i, +c.dataset.j); selectPair(+c.dataset.i, +c.dataset.j, false); });
    gridEl.addEventListener('keydown', function (e) {
      var c = e.target.closest('.pfc-c'); if (!c) return;
      var di = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0, dj = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!di && !dj) { if (e.key === 'Escape') { selectPair(null); } return; }
      e.preventDefault();
      var r = clamp(pos[+c.dataset.i] + di, 0, n - 1), k = clamp(pos[+c.dataset.j] + dj, 0, n - 1), nx = cellAt[order[r] + '-' + order[k]]; if (nx) nx.focus();
    });

    /* ---------- par seleccionado: dos líneas reescaladas a 100 ---------- */
    var pc = null, PW = 600, PH = 170;
    function samp(arr) { var m = arr.length, out = new Float64Array(S_PTS); for (var j = 0; j < S_PTS; j++) { var f = j / (S_PTS - 1) * (m - 1), a = Math.floor(f), b = Math.min(m - 1, a + 1), t = f - a; out[j] = arr[a] * (1 - t) + arr[b] * t; } return out; }
    function pts(a, lo, hi) { var s = ''; for (var j = 0; j < S_PTS; j++) s += (j / (S_PTS - 1) * PW).toFixed(1) + ',' + (PH - (a[j] - lo) / (hi - lo || 1) * PH).toFixed(1) + ' '; return s; }
    function pairTarget() {
      var P = pairInfo(A, St, sel.i, sel.j), pad = (P.hi - P.lo) * 0.08 || 1;
      return { a: samp(P.a), b: samp(P.b), lo: Math.min(P.lo, 100) - pad, hi: Math.max(P.hi, 100) + pad, P: P };
    }
    function drawPair(t) {
      var la = $('[data-la]', pairEl), lb = $('[data-lb]', pairEl), z = $('[data-lz]', pairEl);
      la.setAttribute('points', pts(t.a, t.lo, t.hi)); lb.setAttribute('points', pts(t.b, t.lo, t.hi));
      z.setAttribute('y1', (PH - (100 - t.lo) / (t.hi - t.lo) * PH).toFixed(1)); z.setAttribute('y2', (PH - (100 - t.lo) / (t.hi - t.lo) * PH).toFixed(1));
      $('[data-yh]', pairEl).textContent = fN(t.hi, 0); $('[data-yl]', pairEl).textContent = fN(t.lo, 0);
    }
    function buildPair() {
      var m = St.M[sel.i][sel.j], a = A.tk[sel.i], b = A.tk[sel.j];
      pairEl.innerHTML = '<div class="pfc-ph"><div class="pfc-pid"><span class="pfc-pm">' + mark(a, 24) + mark(b, 24) + '</span><div><strong>' + esc(a) + ' × ' + esc(b) + '</strong><span class="muted" data-pr></span></div></div>' +
        '<button type="button" class="icon-btn pfc-px" aria-label="Cerrar comparación" data-pclose><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +
        '<div class="pfc-pcv"><span class="pfc-yl pfc-yh num" data-yh></span><span class="pfc-yl pfc-yv num" data-yl></span><svg viewBox="0 0 ' + PW + ' ' + PH + '" preserveAspectRatio="none" role="img" aria-label="Precios de ' + esc(a) + ' y ' + esc(b) + ' reescalados a 100 al inicio del periodo">' +
        '<line data-lz x1="0" x2="' + PW + '" class="pfc-zl"/><polyline data-lb class="pfc-lnb" fill="none"/><polyline data-la class="pfc-lna" fill="none"/></svg></div>' +
        '<div class="pfc-px2"><span class="num" data-xs></span><span class="num" data-xe></span></div>' +
        '<div class="pfc-pg"><span><i class="pfc-ga"></i><b>' + esc(a) + '</b> <span class="num" data-ra></span></span><span><i class="pfc-gb"></i><b>' + esc(b) + '</b> <span class="num" data-rb></span></span></div>';
      $('[data-xs]', pairEl).textContent = dTxt(dates[St.s]); $('[data-xe]', pairEl).textContent = dTxt(dates[LAST]);
    }
    function paintPairRead() {
      var m = St.M[sel.i][sel.j], P = pc.P;
      $('[data-pr]', pairEl).textContent = m.r == null ? m.why : 'ρ ' + fRs(m.r) + ' · correlación ' + level(m.r) + (m.r >= 0 ? ' positiva' : ' negativa') + ' · ' + m.n + ' días en común';
      $('[data-ra]', pairEl).textContent = fPs(P.ra, 1); $('[data-rb]', pairEl).textContent = fPs(P.rb, 1);
    }
    function paintPair(animate) {
      if (!sel) return; var t = pairTarget(), prev = pc && !pairEl.hidden ? pc : null, my = ++pairRid;
      pc = t; paintPairRead();
      if (!prev || !animate || reduce()) { drawPair(t); return; }
      var t0 = performance.now(), cur = { a: new Float64Array(S_PTS), b: new Float64Array(S_PTS), lo: 0, hi: 0 };
      every(function () {
        if (dead || my !== pairRid) return false;
        var k = clamp((performance.now() - t0) / 360, 0, 1), e = 1 - Math.pow(1 - k, 3), j;
        for (j = 0; j < S_PTS; j++) { cur.a[j] = prev.a[j] + (t.a[j] - prev.a[j]) * e; cur.b[j] = prev.b[j] + (t.b[j] - prev.b[j]) * e; }
        cur.lo = prev.lo + (t.lo - prev.lo) * e; cur.hi = prev.hi + (t.hi - prev.hi) * e; drawPair(cur); if (k >= 1) return false;
      });
    }
    function selectPair(i, j, scroll) {
      if (i != null && i === j) return;
      if (i == null || (scroll === false && sel && ((sel.i === i && sel.j === j) || (sel.i === j && sel.j === i)))) {
        if (!sel) return; sel = null; setSelClass();
        if (pairEl.animate && !reduce()) { var a = pairEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'linear' }); a.onfinish = function () { if (!sel) pairEl.hidden = true; }; } else pairEl.hidden = true;
        return;
      }
      sel = { i: i, j: j }; setSelClass();
      var wasHidden = pairEl.hidden; buildPair(); pairEl.hidden = false; pc = null; paintPair(false);
      if (wasHidden && pairEl.animate && !reduce()) pairEl.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EXPO });
      if (scroll && pairEl.scrollIntoView) pairEl.scrollIntoView({ block: 'nearest', behavior: reduce() ? 'auto' : 'smooth' });
    }
    pairEl.addEventListener('click', function (e) { if (e.target.closest('[data-pclose]')) selectPair(null); });

    /* ---------- pares más relacionados ---------- */
    function paintPairs() {
      var S = St, pl = $('[data-pl]');
      pl.innerHTML = S.top.length ? S.top.map(function (p) {
        var h = heat(p.r);
        return '<li><button type="button" class="pfc-pr" data-i="' + p.i + '" data-j="' + p.j + '" style="--mp:' + h[0].toFixed(1) + '%;--mn:' + h[1].toFixed(1) + '%" aria-label="' + esc(A.tk[p.i] + ' con ' + A.tk[p.j] + ': correlación ' + fRs(p.r) + ', ' + level(p.r)) + '"><i class="pfc-dot"></i><span class="pfc-pm">' + mark(A.tk[p.i], 20) + mark(A.tk[p.j], 20) + '</span><span class="pfc-prn">' + esc(A.tk[p.i]) + ' · ' + esc(A.tk[p.j]) + '</span><span class="pfc-prv num">' + fRs(p.r) + '<small>' + level(p.r) + '</small></span></button></li>';
      }).join('') : '<li class="muted">Sin pares calculables en este periodo.</li>';
    }
    $('[data-pl]').addEventListener('click', function (e) { var b = e.target.closest('.pfc-pr'); if (b) selectPair(+b.dataset.i, +b.dataset.j, true); });

    /* ---------- contribución al riesgo ---------- */
    var rlEl = $('[data-rl]'), rcRows = {};
    A.tk.forEach(function (t, i) {
      var e = doc.createElement('li'); e.className = 'pfc-rr'; e.dataset.t = t;
      e.innerHTML = '<div class="pfc-id">' + mark(t, 24) + '<span class="pfc-idt"><span class="pfc-tkl"><b>' + esc(t) + '</b><em class="pfc-bd" data-bd hidden></em></span><small class="num" data-sg></small></span></div>' +
        '<div class="pfc-trk" aria-hidden="true"><i class="pfc-fill" data-fill></i><i class="pfc-mk" data-mk></i></div><div class="pfc-nums"><b class="num" data-rv></b><small class="num" data-rw></small></div>';
      rcRows[t] = e; rlEl.appendChild(e);
    });
    var rcState = {};
    function paintRisk(animate) {
      var S = St, rows = S.rc.slice().sort(function (a, b) { return b.risk - a.risk; }), maxV = 1, tops = {};
      rows.forEach(function (r) { maxV = Math.max(maxV, Math.abs(r.risk), r.weight); });
      var go = animate && !reduce() && started; if (go) Object.keys(rcRows).forEach(function (t) { tops[t] = rcRows[t].getBoundingClientRect().top; });
      rows.forEach(function (r) {
        var t = A.tk[r.i], e = rcRows[t], ratio = r.weight > 0 ? r.risk / r.weight : 0, alert = r.weight >= 0.5 && ratio >= 1.5 && r.risk >= 3, hedge = r.risk < 0;
        rlEl.appendChild(e); e.classList.toggle('alert', alert); e.classList.toggle('hedge', hedge);
        var bd = $('[data-bd]', e); bd.hidden = !alert; bd.textContent = '⚠ ' + fN(ratio, 1) + '×';
        $('[data-sg]', e).textContent = 'σ ' + fN(r.sigmaAnn, 0) + ' %';
        $('[data-fill]', e).style.setProperty('--w', (Math.abs(r.risk) / maxV).toFixed(4)); $('[data-mk]', e).style.setProperty('--w', Math.min(1, r.weight / maxV).toFixed(4));
        $('[data-rw]', e).textContent = 'peso ' + fN(r.weight, 1) + ' %';
        e.title = t + ' — peso ' + fN(r.weight, 1) + ' % · riesgo ' + fN(r.risk, 1) + ' %' + (r.weight > 0 ? ' (' + fN(ratio, 1) + '× su peso)' : '') + ' · σ anualizada ' + fN(r.sigmaAnn, 0) + ' %' + (hedge ? ' · reduce el riesgo total (cobertura)' : '');
        roll($('[data-rv]', e), rcState[t], r.risk, function (v) { return fPu(v, 1); }, animate ? 360 : 0, 0); rcState[t] = r.risk;
      });
      if (go) rows.forEach(function (r) { var e = rcRows[A.tk[r.i]], d = tops[A.tk[r.i]] - e.getBoundingClientRect().top; if (Math.abs(d) > 1 && e.animate) e.animate([{ transform: 'translateY(' + d + 'px)' }, { transform: 'none' }], { duration: 300, easing: EXPO }); });
      var kp = $('[data-kp]'), kvs = [['Volatilidad del portafolio', fN(S.volP, 1) + ' %', 'anualizada'], ['Sin diversificación', fN(S.volNo, 1) + ' %', 'suma ponderada de σ'], ['Ahorro por diversificar', '−' + fN(S.saving, 0) + ' %', 'menos volatilidad']];
      kp.innerHTML = kvs.map(function (k, q) { return '<div class="pfc-kpi' + (q === 2 ? ' good' : '') + '"><span class="pfc-kl">' + k[0] + '</span><strong class="num">' + k[1] + '</strong><span class="pfc-ks">' + k[2] + '</span></div>'; }).join('');
      $('[data-rn]').textContent = (S.W < 60 ? 'Solo ' + S.W + ' retornos diarios en el periodo: toma estos resultados con cautela. ' : '') + 'Calculado con ' + S.W + ' retornos diarios · retornos logarítmicos en ' + BS() + '. Correlaciones observadas en el periodo; Rebalanceo y Monte Carlo usan el último año (1A) con las correlaciones suavizadas del modelo, por eso sus cifras pueden diferir unos puntos.';
    }

    /* ---------- con el portafolio y el benchmark ---------- */
    var blEl = $('[data-bl]'), blRows = {};
    A.tk.forEach(function (t) {
      var e = doc.createElement('li'); e.className = 'pfc-br'; e.dataset.t = t;
      e.innerHTML = '<div class="pfc-id">' + mark(t, 24) + '<span class="pfc-idt"><span class="pfc-tkl"><b>' + esc(t) + '</b></span></span></div><div class="pfc-dv" aria-hidden="true"><i class="pfc-ax"></i><i class="pfc-b1" data-b1></i><i class="pfc-b2" data-b2></i></div>' +
        '<div class="pfc-nums"><b class="num pfc-n1" data-n1></b><small class="num" data-n2></small></div>';
      blRows[t] = e; blEl.appendChild(e);
    });
    function paintBench(animate) {
      var S = St, idx = A.tk.map(function (t, i) { return i; }).sort(function (a, b) { return (S.rhoP[b] == null ? -2 : S.rhoP[b]) - (S.rhoP[a] == null ? -2 : S.rhoP[a]); }), tops = {};
      var go = animate && !reduce() && started; if (go) Object.keys(blRows).forEach(function (t) { tops[t] = blRows[t].getBoundingClientRect().top; });
      idx.forEach(function (i) {
        var t = A.tk[i], e = blRows[t], p = S.rhoP[i], b = S.rhoB[i].r; blEl.appendChild(e);
        $('[data-b1]', e).style.setProperty('--v', p == null ? 0 : p.toFixed(4)); $('[data-b2]', e).style.setProperty('--v', b == null ? 0 : b.toFixed(4));
        $('[data-n1]', e).textContent = p == null ? '—' : fRs(p); $('[data-n2]', e).textContent = b == null ? '—' : fRs(b);
        e.setAttribute('aria-label', t + ': correlación con el portafolio ' + (p == null ? 'sin dato' : fRs(p)) + ', con ' + A.bench.name + ' ' + (b == null ? 'sin dato' : fRs(b)));
        e.title = t + ' — con el portafolio ' + (p == null ? '—' : fRs(p)) + ' · con ' + A.bench.name + ' ' + (b == null ? '—' : fRs(b)) + (S.rhoB[i].why ? ' · ' + S.rhoB[i].why : '');
      });
      if (go) idx.forEach(function (i) { var e = blRows[A.tk[i]], d = tops[A.tk[i]] - e.getBoundingClientRect().top; if (Math.abs(d) > 1 && e.animate) e.animate([{ transform: 'translateY(' + d + 'px)' }, { transform: 'none' }], { duration: 300, easing: EXPO }); });
    }

    /* ---------- periodo y orden ---------- */
    function paintMeta() {
      $('[data-barn]').textContent = dTxt(dates[St.s]) + ' → ' + dTxt(dates[LAST]) + ' · ' + St.W + ' retornos diarios · días hábiles';
      $('[data-sp]').textContent = 'Periodo ' + PERIODS[Pi][0] + ' · frente a ' + A.bench.name;
      $('#' + id + '-d1').querySelector('[data-lines]').innerHTML = lines(sumLines());
      $('#' + id + '-d2').querySelector('[data-lines]').innerHTML = lines(mxLines());
      $('#' + id + '-d3').querySelector('[data-lines]').innerHTML = lines(rcLines());
      $('#' + id + '-d4').querySelector('[data-lines]').innerHTML = lines(bnLines());
    }
    var segP = $('.pfc-sp');
    segP.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-p]'); if (!b) return; var i = +b.dataset.p; if (i === Pi) return; Pi = i;
      $$('button', segP).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); segP.style.setProperty('--i', Pi);
      St = stats(A, sIdx(Pi)); hideTip();
      if (mode === 'grupo') applyOrder(true);
      paintMeta(); paintCards(true); paintCells(true); paintPairs(); paintRisk(true); paintBench(true); if (sel) paintPair(true);
    });
    var segO = $('.pfc-so');
    segO.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-o]'); if (!b || b.dataset.o === mode) return; mode = b.dataset.o;
      $$('button', segO).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); segO.style.setProperty('--i', mode === 'peso' ? 0 : 1);
      applyOrder(true);
    });

    /* ---------- primera vista ---------- */
    function visible() { return mount.offsetWidth > 0 && mount.offsetHeight > 0; }
    function start() {
      if (started || dead) return; started = true;
      if (reduce()) return;
      var secs = $$('.pfc > .pfc-s, .pfc > .pfc-bar, .pfc > .pfc-cols > .pfc-s');
      secs.forEach(function (s, i) { if (s.animate) s.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: i * 40, easing: EXPO, fill: 'backwards' }); });
      cells.forEach(function (c) { var d = pos[+c.dataset.i] + pos[+c.dataset.j]; if (c.animate) c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 160 + d * 8, easing: EXPO, fill: 'backwards' }); });
      $$('.pfc-fill, .pfc-mk, .pfc-b1, .pfc-b2').forEach(function (b, i) { if (b.animate) b.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 240 + (i % 16) * 30, easing: EXPO, fill: 'backwards' }); });
    }
    if (mount.animate && !reduce()) mount.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EXPO });
    place(); applyOrder(false); paintMeta(); paintCards(false); paintCells(false); paintPairs(); paintRisk(false); paintBench(false); sizeGrid();
    if (window.ResizeObserver) { var ro = new ResizeObserver(function () { sizeGrid(); if (!started && visible()) start(); }); ro.observe(gridEl); ro.observe(mount); off.push(function () { ro.disconnect(); }); }
    var resz = function () { sizeGrid(); hideTip(); }; window.addEventListener('resize', resz); off.push(function () { window.removeEventListener('resize', resz); });
    /* los colores salen de tokens vía color-mix/var(): se repintan solos con html[data-theme]; solo se cierra el tooltip, que mide posiciones */
    var mob = new MutationObserver(function () { hideTip(); }); mob.observe(root, { attributes: true, attributeFilter: ['data-theme'] }); off.push(function () { mob.disconnect(); });
    if (visible()) start(); else setTimeout(function () { sizeGrid(); if (!started && visible()) start(); }, 0);
    api.stats = function () { return St; }; api.assets = function () { return A; };
    return api;
  }

  window.CampoPfCorrel = { render: render, calc: { assetsOf: assetsOf, stats: stats, corr: corr, cluster: cluster, sIdx: sIdx, PERIODS: PERIODS, pairInfo: pairInfo } };
})();
