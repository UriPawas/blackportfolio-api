/* Campo · Modelo de los INFORMES y de la NOTA del portafolio — window.CampoReport.
   Escrito por el orquestador (Opus): aquí viven los números; las vistas (informes, presentación, documento, nota) solo pintan.
   Fuentes: libro de movimientos (CampoModel.ledger), TWR (CampoPfResumen.calc), contribuciones por activo (CampoPfDesempeno.calc.perAsset),
   mercados y noticias de PORTIFY_DEMO, calendario D.events, dividendos (CampoModel.dividends).
   Equivale al contrato de datos de la skill portfolio-report-design (references/data-contract.md), adaptado a Campo:
   - build(pf, periodo) → informe de UN portafolio (o 'todos') en una ventana (s, e] de sesiones.
   - brief(pf) → la nota que se muestra al entrar al portafolio: qué pasó, qué lo explica y qué viene. Narra; NUNCA recomienda.
   - lint(texto) → frases prohibidas (consejo de inversión). La IA real pasa por el mismo filtro antes de mostrarse.
   Reglas: dinero antes que porcentaje; cada afirmación causal solo con una noticia real del periodo (si no hay, se dice y se explica
   con el mercado); nada inventado; todo es dato por render. En producción, con los datos reales de campo/datos.js. */
(function () {
  'use strict';
  var D = window.PORTIFY_DEMO, T = window.CampoTracker, R = window.CampoPfResumen, M = window.CampoModel, PD = window.CampoPfDesempeno;
  if (!D || !T || !R || !M || !PD) return;
  var C = R.calc, TOT = 252, LAST = TOT - 1, dates = T.dates, fxs = T.fx.series;
  var MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var MESC = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var nf0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }), nf1 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }), nf2 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ---------- formato (para los textos generados; las vistas formatean sus cifras) ---------- */
  /* moneda extranjera frente a la base: USD cuando la base no es dólar, MXN cuando lo es */
  function FXW() { var b = T.base || 'MXN', f = (T.fx && T.fx.foreign) || (b === 'USD' ? 'MXN' : 'USD'); return { n: f === 'MXN' ? 'peso' : 'dólar', pl: f === 'MXN' ? 'pesos' : 'dólares', pair: f + '/' + b, b: b, vs: { MXN: 'al peso', USD: 'al dólar', EUR: 'al euro', GBP: 'a la libra', CAD: 'al dólar canadiense', BRL: 'al real' }[b] || 'a ' + b }; }
  function SYM() { var d = window.PORTIFY_DEMO; return d && d.fmt && d.fmt.sym ? d.fmt.sym() : '$'; }
  function money(v) { var a = Math.round(Math.abs(v)); return (v < 0 && a ? '−' : '') + SYM() + nf0.format(a); }
  function smoney(v) { var a = Math.round(Math.abs(v)); return (a ? (v < 0 ? '−' : '+') : '') + SYM() + nf0.format(a); }
  function pct(v, d) { var x = v * 100, f = d === 2 ? nf2 : nf1, a = Math.abs(x); return (a < (d === 2 ? 0.005 : 0.05) ? '' : x < 0 ? '−' : '+') + f.format(a) + ' %'; }
  function pts(v) { var a = Math.abs(v); return (a < 0.05 ? '' : v < 0 ? '−' : '+') + nf1.format(a) + ' pts'; }
  function isoMs(s) { return Date.parse(s + 'T12:00:00Z'); }
  function dLong(iso) { var d = new Date(iso + 'T12:00:00Z'); return d.getUTCDate() + ' de ' + MES[d.getUTCMonth()] + ' de ' + d.getUTCFullYear(); }
  function dShort(iso) { var d = new Date(iso + 'T12:00:00Z'); return d.getUTCDate() + ' ' + MESC[d.getUTCMonth()]; }
  function addDays(iso, n) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function lastIdxOnOrBefore(iso) { var k = -1; for (var i = 0; i < TOT; i++) if (dates[i] <= iso) k = i; return k; }
  function mk(sym) { var h = null; D.markets.forEach(function (m) { if (m.sym === sym) h = m.hist; }); return h ? h.slice(h.length - TOT) : null; }
  function isTodos(pf) { return pf === 'todos' || (pf && pf.id === 'todos'); }
  function pfObj(pf) { return isTodos(pf) ? 'todos' : typeof pf === 'string' ? T.get(pf) : pf; }

  /* ============================== periodos ==============================
     s = sesión ANCLA (cierre previo al primer día del periodo), e = última sesión. El rendimiento es el de (s, e]. */
  function periods() {
    var end = dates[LAST], y = +end.slice(0, 4), m = +end.slice(5, 7) - 1, out = [];
    function mkp(id, name, s, e, kind) { if (s < 0 || e <= s) return; out.push({ id: id, name: name, s: s, e: e, kind: kind, start: dates[Math.min(s + 1, e)], end: dates[e], label: label(s, e), sessions: e - s }); }
    mkp('1m', 'Último mes', Math.max(0, LAST - 21), LAST, 'rolling');
    var pm = m === 0 ? 11 : m - 1, py = m === 0 ? y - 1 : y, pmS = py + '-' + String(pm + 1).padStart(2, '0') + '-01', pmE = py + '-' + String(pm + 1).padStart(2, '0') + '-31';
    mkp('mes', MES[pm].charAt(0).toUpperCase() + MES[pm].slice(1) + ' ' + py, lastIdxOnOrBefore(addDays(pmS, -1)), lastIdxOnOrBefore(pmE), 'month');
    var q = Math.floor(m / 3) - 1, qy = y; if (q < 0) { q = 3; qy = y - 1; }
    var qS = qy + '-' + String(q * 3 + 1).padStart(2, '0') + '-01', qE = qy + '-' + String(q * 3 + 3).padStart(2, '0') + '-31';
    mkp('trim', (q + 1) + 'T ' + qy, lastIdxOnOrBefore(addDays(qS, -1)), lastIdxOnOrBefore(qE), 'quarter');
    var ys = lastIdxOnOrBefore((y - 1) + '-12-31'); mkp('ytd', 'En el año ' + y, Math.max(0, ys), LAST, 'ytd');
    mkp('12m', 'Últimos 12 meses', 0, LAST, 'rolling');
    return out;
  }
  function custom(startIso, endIso) {
    var e = lastIdxOnOrBefore(endIso), s = lastIdxOnOrBefore(addDays(startIso, -1)); if (s < 0) s = 0;
    if (e <= s) return null;
    return { id: 'custom', name: 'Personalizado', s: s, e: e, kind: 'custom', start: dates[s + 1], end: dates[e], label: label(s, e), sessions: e - s };
  }
  function label(s, e) { var a = dates[Math.min(s + 1, e)], b = dates[e]; return a.slice(0, 4) === b.slice(0, 4) ? dShort(a) + ' – ' + dShort(b) + ' ' + b.slice(0, 4) : dShort(a) + ' ' + a.slice(0, 4) + ' – ' + dShort(b) + ' ' + b.slice(0, 4); }
  function periodById(id) { return periods().filter(function (p) { return p.id === id; })[0] || null; }

  /* ============================== piezas de cálculo ============================== */
  function windowRisk(V, F, b, s, e, crypto) {
    var r = [], rb = [], idx = [];
    for (var t = s + 1; t <= e; t++) { var den = V[t - 1] + F[t]; if (!(den > 0)) continue; r.push(V[t] / den - 1); rb.push(b[t] / b[t - 1] - 1); idx.push(t); }
    var n = r.length, mean = 0, mb = 0, i; for (i = 0; i < n; i++) { mean += r[i]; mb += rb[i]; } mean /= n || 1; mb /= n || 1;
    var v = 0, cov = 0, vb = 0; for (i = 0; i < n; i++) { v += (r[i] - mean) * (r[i] - mean); cov += (r[i] - mean) * (rb[i] - mb); vb += (rb[i] - mb) * (rb[i] - mb); }
    var ppy = crypto ? 365 : 252, sd = n > 1 ? Math.sqrt(v / (n - 1)) : 0, vol = sd * Math.sqrt(ppy);
    var best = -1, worst = -1; for (i = 0; i < n; i++) { if (best < 0 || r[i] > r[best]) best = i; if (worst < 0 || r[i] < r[worst]) worst = i; }
    var g = C.twrSeries(V, F, s), pk = 100, pkI = s, mdd = 0, mp = s, mt = s;
    for (var k = 0; k <= e - s; k++) { var val = g[k]; if (val > pk) { pk = val; pkI = s + k; } var dd = val / pk - 1; if (dd < mdd) { mdd = dd; mp = pkI; mt = s + k; } }
    var rf = M.A.rf, ann = n ? Math.pow(1 + C.twr(V, F, s, e), ppy / n) - 1 : 0;
    return { n: n, vol: n >= 15 ? vol : null, beta: n >= 20 && vb ? cov / vb : null,
      sharpe: n >= 60 && vol ? (ann - rf) / vol : null, /* con menos de ~3 meses el Sharpe es ruido: no se reporta */
      maxDD: mdd, ddPeak: dates[mp], ddTrough: dates[mt],
      best: best >= 0 ? { date: dates[idx[best]], r: r[best] } : null, worst: worst >= 0 ? { date: dates[idx[worst]], r: r[worst] } : null,
      upDays: r.filter(function (x) { return x > 0; }).length };
  }
  /* contribución por activo en (s, e]: misma fórmula que Desempeño, con fin arbitrario. Σ contribuciones = TWR (exacto). */
  function contribs(L, pf, s, e) {
    var ctx = PD.calc.context(T, L, pf), acc = PD.calc.perAsset(ctx), V = L.V, F = L.F, g = C.twrSeries(V, F, s), keys = Object.keys(acc), out = [], t;
    var fxe = fxEffects(L, s, e);
    keys.forEach(function (k) {
      var o = acc[k], c = 0, w = 0, n = 0, pnl = 0, flow = 0, div = 0;
      for (t = s + 1; t <= e; t++) {
        var den = V[t - 1] + F[t]; if (!(den > 0)) continue; var num = o.val[t] - o.val[t - 1] - o.flow[t] + o.div[t];
        c += g[t - 1 - s] / 100 * num / den; w += o.val[t - 1] / den; n++; pnl += num; flow += o.flow[t]; div += o.div[t];
      }
      var wb = n ? w / n : 0; if (Math.abs(c) < 1e-9 && wb < 1e-6) return;
      out.push({ ticker: k, name: o.name, cls: o.cls || '', c: c, w: wb, pnl: pnl, fxPnl: fxe[k] || 0, div: div, flow: flow, vStart: o.val[s], vEnd: o.val[e],
        ret: o.val[s] > 1 && Math.abs(flow) < 1 ? (o.val[e] + div) / o.val[s] - 1 : (wb > 1e-4 ? c / wb : null), closed: o.val[e] < 0.005 });
    });
    out.sort(function (a, b) { return b.c - a.c; });
    return out;
  }
  /* efecto del tipo de cambio en (s, e]: q·p_t·(fx_t − fx_{t−1}) en posiciones en USD (precio en dólares a fx de cada día) */
  function fxEffects(L, s, e) {
    var parts = L.parts || [L], out = {};
    parts.forEach(function (P) {
      (P.held || []).forEach(function (h) {
        var Bb = T.base || 'MXN'; if (T.rate ? h.ccy === Bb : h.ccy !== 'USD') return; var sum = 0;
        for (var t = s + 1; t <= e; t++) { var q = 0; h.lots.forEach(function (l) { if (l.idx <= t) q += l.q; }); if (q) sum += q * h.path[t] * (T.rate ? T.rate(h.ccy, t) - T.rate(h.ccy, t - 1) : fxs[t] - fxs[t - 1]); }
        out[h.ticker] = (out[h.ticker] || 0) + sum;
      });
    });
    return out;
  }
  function composition(L, pf, i) {
    var ctx = PD.calc.context(T, L, pf), acc = PD.calc.perAsset(ctx), byCls = {}, usd = 0, tot = 0, rows = [];
    var usdT = {}; L.rows.forEach(function (r) { usdT[r.ticker] = r.isU; });
    Object.keys(acc).forEach(function (k) {
      var v = acc[k].val[i]; if (v < 0.5) return; var cls = acc[k].cls || C.clsOf(k);
      byCls[cls] = (byCls[cls] || 0) + v; tot += v; if (usdT[k]) usd += v; rows.push({ ticker: k, name: acc[k].name, cls: cls, value: v });
    });
    var cash = Math.max(0, L.cashAt ? L.cashAt[i] : 0); tot += cash;
    rows.sort(function (a, b) { return b.value - a.value; }); rows.forEach(function (r) { r.w = tot ? r.value / tot : 0; });
    var cls = Object.keys(byCls).map(function (k) { return { cls: k, value: byCls[k], w: tot ? byCls[k] / tot : 0 }; }).sort(function (a, b) { return b.value - a.value; });
    if (cash > 0.5) cls.push({ cls: 'Efectivo', value: cash, w: cash / tot });
    var hhi = 0; rows.forEach(function (r) { hhi += r.w * r.w; });
    return { total: tot, cash: cash, byClass: cls, positions: rows, usdShare: tot ? usd / tot : 0, effN: hhi ? 1 / hhi : 0, top: rows[0] || null };
  }
  function marketsCtx(s, e) {
    var pick = [['S&P 500', 'S&P 500', 'USD'], ['Nasdaq 100', 'Nasdaq 100', 'USD'], ['S&P/BMV IPC', 'IPC', 'MXN'], ['USD/MXN', 'Dólar (USD/MXN)', ''], ['Bitcoin', 'Bitcoin', 'USD'], ['Oro', 'Oro', 'USD']];
    return pick.map(function (p) { var h = mk(p[0]); return h ? { sym: p[0], name: p[1], ccy: p[2], start: h[s], end: h[e], r: h[e] / h[s] - 1 } : null; }).filter(Boolean);
  }
  function newsFor(tk) { return (D.news || []).filter(function (n) { return n.ticker === tk; }); }
  function upcomingFor(tk, asOf, days) {
    var ev = (D.events && D.events.earnings) || [], out = [];
    ev.forEach(function (x) { if (x.t === tk && x.off <= days) out.push({ kind: 'Resultados', date: addDays(asOf, x.off), when: x.when, ticker: tk }); });
    return out;
  }

  /* ============================== narrativa (plantilla determinista) ==============================
     Es la versión sin IA que la skill exige como respaldo, y la base que la IA reescribe en producción (mismo JSON).
     Tarjeta por movimiento: evento → mecanismo → impacto cuantificado en ESTE portafolio → a vigilar. */
  function moverCard(x, mkts, isRecent, asOf, rows, fxR) {
    var news = isRecent ? newsFor(x.ticker) : [], mkt = null, cls = x.cls || C.clsOf(x.ticker);
    if (/Cripto/.test(cls)) mkt = mkts.filter(function (m) { return m.sym === 'Bitcoin'; })[0];
    else if (/MX|FIBRA/.test(cls)) mkt = mkts.filter(function (m) { return m.sym === 'S&P/BMV IPC'; })[0];
    else if (/EE\. UU\.|ETF/.test(cls)) mkt = mkts.filter(function (m) { return m.sym === (/NVDA|MSFT|AMZN|AAPL|META|GOOGL/.test(x.ticker) ? 'Nasdaq 100' : 'S&P 500'); })[0];
    var evento = news.length ? news[0].title + ' (' + news[0].source + ')' : 'Sin titulares en el periodo para ' + x.ticker + '.';
    var mec = '';
    if (x.ret != null && mkt) {
      /* se compara en la MISMA moneda: el activo en dólares contra su mercado en dólares; el peso se cuenta aparte */
      var usdA = Math.abs(x.fxPnl) > 0.5 || /EE\. UU\.|ETF|Cripto/.test(cls), loc = usdA && fxR ? (1 + x.ret) / (1 + fxR) - 1 : x.ret, diff = loc - mkt.r;
      mec = x.ticker + ' ' + (loc >= 0 ? 'subió ' : 'bajó ') + pct(Math.abs(loc)).replace('+', '') + (usdA ? ' en su moneda' : '') + '; ' + mkt.name + ' se movió ' + pct(mkt.r) + '. ' +
        (Math.abs(diff) < 0.02 ? 'Se movió con su mercado.' : diff > 0 ? 'Le fue mejor que a su mercado por ' + pts(diff * 100).replace('+', '') + '.' : 'Le fue peor que a su mercado por ' + pts(diff * 100).replace('−', '') + '.');
      if (Math.abs(x.fxPnl) > 0.15 * Math.abs(x.pnl) && Math.abs(x.fxPnl) > 500) mec += ' El tipo de cambio ' + (x.fxPnl > 0 ? 'sumó ' : 'restó ') + money(Math.abs(x.fxPnl)) + ' de ese resultado.';
    } else mec = x.closed ? 'Se vendió dentro del periodo.' : '';
    var impacto = smoney(x.pnl) + ' en el periodo: ' + pts(x.c * 100) + ' del rendimiento del portafolio (pesaba en promedio ' + nf1.format(x.w * 100) + ' %).';
    var up = upcomingFor(x.ticker, asOf, 21), div = null;
    var vig = up.length ? up[0].kind + ' el ' + dShort(up[0].date) + ' (' + up[0].when.toLowerCase() + ').' : '';
    return { ticker: x.ticker, name: x.name, direction: x.c >= 0 ? 'positive' : 'negative', contribution_pp: x.c * 100, pnl: x.pnl, fxPnl: x.fxPnl, ret: x.ret, weight: x.w,
      evento: evento, mecanismo: mec, impacto: impacto, vigilar: vig, news: news.map(function (n) { return { title: n.title, source: n.source, kind: n.kind }; }), hasNews: !!news.length };
  }
  function highlights(K, risk, comp, mkts, contrib, fx) {
    var h = [], sp = mkts.filter(function (m) { return m.sym === 'S&P 500'; })[0];
    h.push({ headline: (K.gain >= 0 ? 'Ganaste ' : 'Perdiste ') + money(Math.abs(K.gain)) + ' en el periodo (' + pct(K.twr, 2) + ' ponderado por tiempo).',
      body: K.bench != null ? 'Tu referencia, ' + K.benchName + ', hizo ' + pct(K.bench, 2) + ': quedaste ' + (K.excess >= 0 ? pts(K.excess * 100).replace('+', '') + ' por encima.' : pts(K.excess * 100).replace('−', '') + ' por debajo.') : 'Sin referencia para comparar.' });
    var top = contrib[0], bot = contrib[contrib.length - 1];
    if (top && bot && top !== bot) h.push(bot.c < -0.0005 ? { headline: top.ticker + ' fue lo que más sumó (' + pts(top.c * 100) + ') y ' + bot.ticker + ' lo que más restó (' + pts(bot.c * 100) + ').',
      body: 'Entre las dos explican ' + money(Math.abs(top.pnl) + Math.abs(bot.pnl)) + ' de movimiento en ' + (T.base || 'MXN') + '.' } : top.c > 0.0005 ? { headline: top.ticker + ' fue lo que más sumó (' + pts(top.c * 100) + ').',
      body: 'Ninguna posición restó en el periodo; ' + top.ticker + ' sola explica ' + smoney(top.pnl) + '.' } : { headline: 'Ninguna posición se movió lo suficiente para destacar.', body: '' });
    if (comp.usdShare > 0.15 && Math.abs(fx.effect) > 0.002 * K.vEnd) h.push({ headline: 'El ' + FXW().n + ' ' + (fx.effect >= 0 ? 'sumó ' : 'restó ') + money(Math.abs(fx.effect)) + '.',
      body: 'El ' + FXW().pair + ' pasó de ' + nf2.format(fx.start) + ' a ' + nf2.format(fx.end) + ' (' + pct(fx.r) + ') y el ' + nf0.format(comp.usdShare * 100) + ' % de tu portafolio está en ' + FXW().pl + '.' });
    else if (risk.maxDD < -0.05) h.push({ headline: 'La caída más profunda del periodo fue de ' + pct(risk.maxDD) + '.', body: 'Del ' + dShort(risk.ddPeak) + ' al ' + dShort(risk.ddTrough) + '.' });
    return h;
  }

  /* ============================== informe ============================== */
  function build(pf, per) {
    var P = pfObj(pf); if (!P) return null;
    if (typeof per === 'string') per = periodById(per); if (!per) per = periodById('1m');
    var L = M.ledger(P), s = per.s, e = per.e, V = L.V, F = L.F, asOf = dates[LAST], isRecent = e === LAST;
    var bench = C.benchOf(T, L.benchmark), b = bench.a, twr = C.twr(V, F, s, e), bret = b[e] / b[s] - 1;
    var dep = 0, wd = 0, divs = [], tx = [], sells = [], buys = [];
    L.events.forEach(function (ev) {
      if (!(ev.idx > s && ev.idx <= e)) return;
      if (ev.t === 'dep') dep += ev.mxn; else if (ev.t === 'wd') wd += ev.mxn; else if (ev.t === 'div') divs.push(ev); else if (ev.t === 'sell') sells.push(ev); else if (ev.t === 'buy') buys.push(ev);
      tx.push(ev);
    });
    var net = 0, wsum = 0; for (var t = s + 1; t <= e; t++) { net += F[t]; wsum += F[t] * (e - t) / (e - s); }
    var gain = V[e] - V[s] - net, mdietz = V[s] + wsum > 0 ? gain / (V[s] + wsum) : null;
    var realized = 0; sells.forEach(function (sv) { var cost = 0; L.events.forEach(function (bv) { if (bv.t === 'buy' && bv.closed && bv.tk === sv.tk) cost += bv.mxn; }); realized += sv.mxn - cost; });
    var crypto = L.rows.length > 0 && L.rows.every(function (r) { return /Cripto/.test(r.cls); });
    var risk = windowRisk(V, F, b, s, e, crypto), contrib = contribs(L, P, s, e), mkts = marketsCtx(s, e);
    var fxE = 0; contrib.forEach(function (c) { fxE += c.fxPnl; });
    var fx = { start: fxs[s], end: fxs[e], r: fxs[e] / fxs[s] - 1, effect: fxE };
    var compS = composition(L, P, s), compE = composition(L, P, e);
    var K = { vStart: V[s], vEnd: V[e], deposits: dep, withdrawals: wd, netFlows: net, gain: gain, twr: twr, mwr: mdietz, bench: bret, benchName: bench.name || L.benchmark, excess: twr - bret,
      dividends: divs.reduce(function (a, x) { return a + x.mxn; }, 0), realized: realized, cashEnd: L.cashAt ? L.cashAt[e] : 0, annualized: (e - s) >= 252 ? twr : null };
    var pos = contrib.filter(function (x) { return x.c * 100 >= 0.25; }).slice(0, 3), neg = contrib.filter(function (x) { return x.c * 100 <= -0.25; }).slice(-3).reverse();
    var g = C.twrSeries(V, F, s), series = { dates: [], value: [], index: [], bench: [] };
    for (var k = 0; k <= e - s; k++) { series.dates.push(dates[s + k]); series.value.push(V[s + k]); series.index.push(g[k]); series.bench.push(b[s + k] / b[s] * 100); }
    var name = isTodos(P) ? 'Todos los portafolios' : P.name;
    var dv = M.dividends(P), nextDiv = dv.projected.filter(function (x) { return x.date <= addDays(asOf, 45); });
    return {
      meta: { portfolioId: isTodos(P) ? 'todos' : P.id, portfolioName: name, currency: T.base || 'MXN', period: per, periodLabel: per.label, periodName: per.name, generatedAt: asOf,
        benchmark: bench.name || L.benchmark, lang: 'es', tone: 'campo', ccy: T.base || 'MXN', plan: T.limit && T.limit.plan, sessions: e - s, isRecent: isRecent, sample: !window.CAMPO_REAL },
      kpis: K, risk: risk, series: series,
      contributions: contrib, movers: { positive: pos.map(function (x) { return moverCard(x, mkts, isRecent, asOf, contrib, fx.r); }), negative: neg.map(function (x) { return moverCard(x, mkts, isRecent, asOf, contrib, fx.r); }) },
      composition: { start: compS, end: compE }, fx: fx, markets: mkts,
      activity: { count: tx.length, deposits: dep, withdrawals: wd, buys: buys.length, sells: sells.length, dividends: divs.map(function (x) { return { date: x.date, ticker: x.tk, amount: x.mxn }; }), events: tx },
      upcoming: { dividends: nextDiv, earnings: contrib.reduce(function (a, x) { return a.concat(upcomingFor(x.ticker, asOf, 30)); }, []) },
      highlights: highlights(K, risk, compS, mkts, contrib, fx),
      footnotes: [
        'Rendimiento ponderado por tiempo (TWR): encadena los rendimientos diarios y quita el efecto de cuándo aportaste o retiraste.',
        'Ganancia = valor final − valor inicial − aportaciones netas del periodo. Incluye dividendos, lo realizado y el tipo de cambio.',
        'Rendimiento ponderado por dinero: Dietz modificado del periodo; sí refleja el momento de tus aportaciones.',
        'Contribución: lo que cada posición aportó al TWR, en puntos; la suma de todas es el TWR.',
        'Efecto del ' + FXW().n + ': la parte del resultado de tus posiciones en ' + FXW().pl + ' que viene del ' + FXW().pair + ', a precio en ' + FXW().pl + ' de cada día.',
        'Volatilidad anualizada con ' + (crypto ? '365' : '252') + ' días; el Sharpe solo se reporta con 60 sesiones o más (tasa libre de riesgo ' + nf2.format(M.A.rf * 100) + ' %).',
        (window.CAMPO_REAL ? 'Este informe describe lo que pasó con tus datos; no es una recomendación de inversión.' : 'Datos de muestra. Este informe describe lo que pasó; no es una recomendación de inversión.')
      ]
    };
  }

  /* ============================== nota del portafolio ============================== */
  var FORBIDDEN = /\b(compra(r|s|lo|la)?|compre|vend(e|er|a|as|erlo|erla)|deber[íi]as?|te recomendamos|recomendamos|recomendaci[oó]n de (compra|venta)|conviene|aprovecha|mant[eé]n(te|lo|la)?|rebalancea|invierte en|oportunidad de compra|precio objetivo|objetivo de precio|sobreponderar|subponderar|toma(r)? utilidades)\b/i;
  function lint(text) { var m = String(text || '').match(FORBIDDEN); return m ? [m[0]] : []; }
  function brief(pf) {
    var P = pfObj(pf); if (!P) return null;
    var L = M.ledger(P), asOf = dates[LAST], s = LAST - 5, V = L.V, F = L.F, bench = C.benchOf(T, L.benchmark), b = bench.a;
    var wk = C.twr(V, F, s, LAST), bwk = b[LAST] / b[s] - 1, m1 = C.twr(V, F, LAST - 21, LAST), bm1 = b[LAST] / b[LAST - 21] - 1;
    var contrib = contribs(L, P, s, LAST), comp = composition(L, P, LAST), mkts = marketsCtx(s, LAST), fx = { start: fxs[s], end: fxs[LAST], r: fxs[LAST] / fxs[s] - 1 };
    var fxE = 0; contrib.forEach(function (c) { fxE += c.fxPnl; });
    var gainW = V[LAST] - V[s]; for (var t = s + 1; t <= LAST; t++) gainW -= F[t];
    /* pulso cualitativo (sin calificación numérica): volatilidad reciente vs la propia, peso del dólar, concentración, frente a la referencia */
    var rec = windowRisk(V, F, b, LAST - 21, LAST, false), yr = windowRisk(V, F, b, 0, LAST, false), ratio = rec.vol && yr.vol ? rec.vol / yr.vol : 1;
    var pulse = [
      { id: 'mov', k: 'Movimiento reciente', v: ratio > 1.25 ? 'Más agitado que de costumbre' : ratio < 0.8 ? 'Más tranquilo que de costumbre' : 'Como de costumbre', tone: ratio > 1.25 ? 'warn' : 'flat',
        d: 'Volatilidad del último mes: ' + (rec.vol != null ? nf1.format(rec.vol * 100) + ' %' : '—') + ' anual, contra ' + (yr.vol != null ? nf1.format(yr.vol * 100) + ' %' : '—') + ' en el año.' },
      { id: 'usd', k: 'Peso del ' + FXW().n, v: comp.usdShare > 0.55 ? 'Alto' : comp.usdShare > 0.25 ? 'Medio' : 'Bajo', tone: 'flat', d: nf0.format(comp.usdShare * 100) + ' % de tu portafolio está en ' + FXW().pl + ': el ' + FXW().pair + ' mueve tu resultado.' },
      { id: 'conc', k: 'Concentración', v: comp.effN < 4 ? 'Alta' : comp.effN < 8 ? 'Media' : 'Repartida', tone: comp.effN < 4 ? 'warn' : 'flat',
        d: comp.top ? comp.top.ticker + ' pesa ' + nf0.format(comp.top.w * 100) + ' %; tu portafolio se comporta como ' + nf1.format(comp.effN) + ' posiciones iguales.' : '' },
      { id: 'ref', k: 'Frente a ' + (bench.name || L.benchmark) + ', 1 mes', v: Math.abs(m1 - bm1) < 0.0025 ? 'A la par' : m1 > bm1 ? 'Por delante' : 'Por detrás', tone: 'flat', d: 'Tú ' + pct(m1) + ', tu referencia ' + pct(bm1) + '.' }
    ];
    var top = contrib.slice().sort(function (a, c) { return Math.abs(c.c) - Math.abs(a.c); }).slice(0, 2);
    var held = {}; L.rows.forEach(function (r) { held[r.ticker] = r; });
    var news = (D.news || []).filter(function (n) { return held[n.ticker]; }).slice(0, 3).map(function (n) { return { ticker: n.ticker, title: n.title, source: n.source, kind: n.kind, mins: n.mins }; });
    var earn = ((D.events && D.events.earnings) || []).filter(function (x) { return held[x.t] && x.off <= 14; }).map(function (x) { return { kind: 'Resultados', ticker: x.t, date: addDays(asOf, x.off), when: x.when, off: x.off }; });
    var exposMX = comp.byClass.some(function (c) { return /MX|Deuda|FIBRA/.test(c.cls); }), exposUS = comp.usdShare > 0.1;
    var econ = ((D.events && D.events.econ) || []).filter(function (x) { return x.imp >= 3 && x.off <= 14 && ((x.c === 'MX' && exposMX) || (x.c !== 'MX' && exposUS)); }).map(function (x) { return { kind: 'Dato económico', name: x.name, country: x.c, date: addDays(asOf, x.off), off: x.off }; });
    var divs = M.dividends(P).projected.filter(function (x) { return x.date <= addDays(asOf, 30); }).map(function (x) { return { kind: 'Dividendo estimado', ticker: x.ticker, date: x.date, amount: x.gross }; });
    var ahead = earn.concat(econ).concat(divs).sort(function (a, c) { return a.date < c.date ? -1 : 1; }).slice(0, 5);
    var name = isTodos(P) ? 'Tus portafolios' : P.name;
    var headline = (wk >= 0 ? 'Semana de ' : 'Semana de ') + pct(wk) + ' para ' + name + (Math.abs(wk - bwk) < 0.0025 ? ', a la par de ' : wk > bwk ? ', por delante de ' : ', por detrás de ') + (bench.name || L.benchmark) + '.';
    var que = 'En las últimas 5 sesiones tu portafolio ' + (gainW >= 0 ? 'ganó ' : 'perdió ') + money(Math.abs(gainW)) + ' (' + pct(wk) + '); ' + (bench.name || L.benchmark) + ' hizo ' + pct(bwk) + '. ' +
      'Hoy el cambio es de ' + smoney(L.dayTot) + ' (' + pct(L.dayTotPct / 100) + ').';
    var exp = top.map(function (x) {
      var nw = newsFor(x.ticker)[0];
      return x.ticker + ' ' + (x.c >= 0 ? 'sumó ' : 'restó ') + pts(Math.abs(x.c * 100)).replace('+', '') + ' (' + smoney(x.pnl) + ')' + (nw ? '; en las noticias: «' + nw.title + '»' : '') + '.';
    }).join(' ');
    if (comp.usdShare > 0.15 && Math.abs(fxE) > 300) exp += ' El ' + FXW().n + ' ' + (fx.r >= 0 ? 'subió ' : 'bajó ') + pct(Math.abs(fx.r)).replace('+', '') + ' frente ' + FXW().vs + ' y eso ' + (fxE >= 0 ? 'sumó ' : 'restó ') + money(Math.abs(fxE)) + ' a tus posiciones en ' + FXW().pl + '.';
    var viene = ahead.length ? ahead.map(function (a) {
      var when = a.off === 0 ? 'hoy' : a.off === 1 ? 'mañana' : 'el ' + dShort(a.date);
      return a.kind === 'Resultados' ? a.ticker + ' reporta resultados ' + when : a.kind === 'Dato económico' ? a.name + ' (' + a.country + ') ' + when : 'Dividendo estimado de ' + a.ticker + ' ' + when + ' (≈ ' + money(a.amount) + ')';
    }).join('; ') + '. Son fechas en las que tus posiciones suelen moverse más.' : (window.CAMPO_REAL ? 'Todavía no tenemos el calendario de reportes y datos económicos para tus posiciones.' : 'No hay eventos de tus posiciones en las próximas dos semanas.');
    var out = { asOf: asOf, portfolio: name, headline: headline, pulse: pulse,
      sections: [{ id: 'que', k: 'Qué pasó', t: que }, { id: 'por', k: 'Qué lo explica', t: exp || 'Ninguna posición se movió lo suficiente para destacar.' }, { id: 'viene', k: 'Qué viene', t: viene }],
      movers: top.map(function (x) { return { ticker: x.ticker, name: x.name, c: x.c, pnl: x.pnl }; }), news: news, ahead: ahead,
      week: { twr: wk, bench: bwk, gain: gainW, fxEffect: fxE, fx: fx }, markets: mkts,
      reminder: 'Esto es información sobre tu portafolio, no una recomendación de inversión. Portify no está autorizado para dar asesoría financiera.',
      label: (window.CAMPO_REAL ? 'Generado por Portify con tus datos al ' : 'Generado con IA · datos de muestra al ') + dLong(asOf), source: 'template' };
    out.violations = lint([headline, que, exp, viene].join(' '));
    return out;
  }

  /* prompt de producción para /api/ai/insights (modo "nota"): la IA recibe ESTE objeto como única fuente y devuelve el mismo JSON */
  var BRIEF_PROMPT = [
    'Eres el redactor de la nota diaria de un portafolio en Portify. Escribe en español de México, en segunda persona, tono sobrio.',
    'Solo describes lo que pasó y lo que viene, con los datos y noticias que recibes. Dinero antes que porcentaje. Máximo 3 frases por sección.',
    'PROHIBIDO: recomendar comprar, vender, mantener, rebalancear o cualquier activo; dar precios objetivo; decir "deberías", "conviene", "aprovecha".',
    'Si una noticia no está en la entrada, no la menciones. Si no hay causa conocida, dilo y explica el movimiento con su mercado.',
    'Devuelve JSON: { headline, sections: [{k:"Qué pasó",t},{k:"Qué lo explica",t},{k:"Qué viene",t}] }. El servidor rechaza la salida si contiene frases prohibidas y usa la plantilla.'
  ].join('\n');

  /* producción: cada informe en la moneda de SU vista (la del portafolio, o la del consolidado para "Todos"); al terminar regresa la base */
  function inBase(pf, fn) {
    if (!window.CAMPO_REAL || !T.setBase || !T.viewCcy) return fn(pf);
    var id = isTodos(pf) ? 'todos' : (typeof pf === 'string' ? pf : pf && pf.id), want = T.viewCcy(id), prev = T.base;
    if (!id || want === prev) return fn(pf);
    T.setBase(want, true);
    try { return fn(id === 'todos' ? 'todos' : T.get(id)); } finally { T.setBase(prev, true); }
  }
  function buildIn(pf, per) { return inBase(pf, function (q) { return build(q, per); }); }
  window.CampoReport = { periods: periods, custom: custom, build: buildIn, brief: brief, lint: lint, BRIEF_PROMPT: BRIEF_PROMPT,
    fmt: { money: money, smoney: smoney, pct: pct, pts: pts, dLong: dLong, dShort: dShort } };
})();
