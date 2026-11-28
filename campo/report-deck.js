/* Campo · Informe PRESENTACIÓN (horizontal, animada) — window.CampoReportDeck.render(mount, report, { onExit }) → { destroy, go, next, prev }.
   Escenario fijo 1600×900 escalado a la caja; todo CSS escopado bajo .crk. No calcula finanzas: pinta lo que entrega CampoReport.build().
   Gráficas SVG a mano que se dibujan al activar la diapositiva (CSS por clase .is-on + cuentas con rAF). Colores = tokens, así el tema se repinta solo.
   Sin fotografía de archivo: en producción la portada podría llevar una imagen Pexels por sector (punto de enganche, hoy no se usa). */
(function () {
  'use strict';
  var RP = window.CampoReport; if (!RP) return;
  var F = RP.fmt, W = 1600, H = 900;
  var nf0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }), nf1 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }), nf2 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function fxw() { var T = window.CampoTracker, b = (T && T.base) || 'MXN', f = (T && T.fx && T.fx.foreign) || (b === 'USD' ? 'MXN' : 'USD'); return { n: f === 'MXN' ? 'peso' : 'dólar', pl: f === 'MXN' ? 'pesos' : 'dólares', pair: f + '/' + b, bpl: b === 'MXN' ? 'pesos' : b === 'USD' ? 'dólares' : b }; }
  var STR = { es: {
    brand: 'Portify', kickCover: 'Informe del portafolio', sample: window.CAMPO_REAL ? 'Con tus datos · no es asesoría' : 'Datos de muestra',
    gainLab: 'Ganancia del periodo', twrSub: 'ponderado por tiempo', vs: 'frente a',
    kRes: 'Resultado', tResUp: 'Cerraste el periodo con ganancia', tResDn: 'Cerraste el periodo con pérdida',
    gain: 'Ganancia', twr: 'Rendimiento ponderado por tiempo', mwr: 'Rendimiento ponderado por dinero', ref: 'Referencia', above: 'por encima', below: 'por debajo', alike: 'A la par',
    yours: 'Tu portafolio', base: 'Base 100 al inicio del periodo',
    kWf: 'Qué lo movió', tWf: 'Lo que sumó y lo que restó', wfSub: 'Cada barra es lo que una posición aportó al rendimiento, en puntos. Todas juntas dan el total.', others: 'Otras', total: 'Total',
    kMv: 'Movimientos', tMv: 'Los movimientos que más pesaron', up: 'Lo que sumó', dn: 'Lo que restó', evento: 'Qué pasó', mec: 'Cómo se explica', imp: 'Qué significó', vig: 'A vigilar',
    noNews: 'Para estas posiciones no hay titulares en el periodo; el movimiento se explica con su mercado.',
    get kFx() { return 'El ' + fxw().n; }, tFx: 'Lo que hizo el tipo de cambio', get fxAdd() { return 'El ' + fxw().n + ' sumó a tus posiciones'; }, get fxSub() { return 'El ' + fxw().n + ' restó a tus posiciones'; }, get fxFlat() { return 'El ' + fxw().n + ' casi no movió tu resultado'; }, get usdShare() { return 'Parte de tu portafolio en ' + fxw().pl; }, fxFrom: 'Al inicio', fxTo: 'Al cierre', get inUsd() { return 'En ' + fxw().pl; }, get inMxn() { return 'En ' + fxw().bpl + ' y otras monedas'; }, get usdmxn() { return fxw().pair; },
    kRisk: 'Riesgo del periodo', tRisk: 'Qué tan fuerte se movió', maxDD: 'Caída máxima', vol: 'Volatilidad anual', beta: 'Beta', sharpe: 'Sharpe', best: 'Mejor día', worst: 'Peor día', ddFrom: 'del', ddTo: 'al', underwater: 'Distancia al máximo previo',
    kMk: 'Mercados', tMk: 'Cómo se movió el mercado', mkSub: 'Variación de cada referencia en el mismo periodo.',
    kCp: 'Composición', tCp: 'Dónde estaba tu dinero', cpStart: 'Al inicio', cpEnd: 'Al cierre',
    kAc: 'Movimientos de cuenta', tAc: 'Lo que pasó en tu cuenta', dep: 'Aportaciones', wd: 'Retiros', div: 'Dividendos', buy: 'Posiciones abiertas', sell: 'Posiciones cerradas', ev: 'Últimos movimientos',
    evDep: 'Aportación', evWd: 'Retiro', evDiv: 'Dividendo', evBuy: 'Entrada de posición', evSell: 'Salida de posición',
    kNx: 'Qué viene', tNx: 'Lo que está en el calendario', nxDiv: 'Dividendos estimados', nxEarn: 'Resultados de tus posiciones', nxNone: 'No hay fechas de tus posiciones en las próximas semanas.',
    legal: 'Este informe describe lo que pasó; no es una recomendación de inversión.',
    prev: 'Anterior', next: 'Siguiente', exit: 'Salir', go: 'Ir a la diapositiva', slide: 'Diapositiva', of: 'de'
  } };

  /* ---------- utilidades ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var FM = { money: F.money, smoney: F.smoney, pct: function (v) { return F.pct(v); }, pct2: function (v) { return F.pct(v, 2); }, n2: function (v) { return nf2.format(v); }, p0: function (v) { return nf0.format(v * 100) + ' %'; }, int: function (v) { return nf0.format(v); }, p1: function (v) { return nf1.format(v * 100) + ' %'; } };
  function num(v, f, cls) { return '<span class="crk-n ' + (cls || '') + '" data-cu="' + v + '" data-f="' + f + '">' + FM[f](v) + '</span>'; }
  function tone(v) { return v > 0 ? 'up' : v < 0 ? 'dn' : ''; }
  function niceStep(raw) { var p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), n = raw / p; return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p; }
  function ticks(lo, hi, cnt) { var st = niceStep((hi - lo) / cnt || 1), a = Math.ceil(lo / st) * st, o = []; for (var v = a; v <= hi + st * 1e-6; v += st) o.push(Math.abs(v) < st * 1e-6 ? 0 : v); return o; }
  function lbl(n) { var a = Math.abs(n), s = n < 0 ? '−' : ''; return s + (a >= 1e6 ? nf1.format(a / 1e6) + ' M' : a >= 1e3 ? nf0.format(a / 1e3) + ' mil' : nf0.format(a)); }
  function frame(c, kick, title, body, cls) {
    return '<div class="crk-in ' + (cls || '') + '"><header class="crk-h"><p class="crk-k">' + esc(kick) + '</p><h2 class="crk-t">' + esc(title) + '</h2></header><div class="crk-b">' + body + '</div>' +
      '<footer class="crk-f"><span>' + esc(c.r.meta.portfolioName) + ' · ' + esc(c.r.meta.periodLabel) + '</span><span>' + esc(c.S.sample) + '</span></footer></div>';
  }
  function ser(path, cls, extra) { return '<path class="crk-draw ' + cls + '" pathLength="1" d="' + path + '" ' + (extra || '') + '/>'; }
  function pathOf(xs, ys) { var d = ''; for (var i = 0; i < xs.length; i++) d += (i ? 'L' : 'M') + xs[i].toFixed(1) + ' ' + ys[i].toFixed(1); return d; }

  /* gráfica de líneas con ejes, área opcional y cursor. o: {id,w,h,dates,lines:[{v,cls,area}],yfmt,tip(i)→html} */
  function lineChart(c, o) {
    var Lm = o.padL == null ? 84 : o.padL, Rm = o.padR == null ? 24 : o.padR, Tm = 16, Bm = 44, w = o.w, h = o.h, n = o.dates.length, lo = Infinity, hi = -Infinity, i;
    o.lines.forEach(function (l) { l.v.forEach(function (x) { if (x < lo) lo = x; if (x > hi) hi = x; }); });
    if (o.zero != null) { lo = Math.min(lo, o.zero); hi = Math.max(hi, o.zero); }
    var pad = (hi - lo) * 0.08 || 1; lo -= o.noPadLo ? 0 : pad; hi += o.noPadHi ? 0 : pad;
    function X(j) { return Lm + (n > 1 ? j / (n - 1) : 0) * (w - Lm - Rm); } function Y(v) { return Tm + (1 - (v - lo) / (hi - lo)) * (h - Tm - Bm); }
    var s = '<svg class="crk-svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' + esc(o.label || '') + '">';
    ticks(lo, hi, 4).forEach(function (t) { s += '<line class="crk-grid" x1="' + Lm + '" x2="' + (w - Rm) + '" y1="' + Y(t).toFixed(1) + '" y2="' + Y(t).toFixed(1) + '"/><text class="crk-ax" x="' + (Lm - 12) + '" y="' + (Y(t) + 6).toFixed(1) + '" text-anchor="end">' + esc(o.yfmt(t)) + '</text>'; });
    [0, Math.floor((n - 1) / 2), n - 1].forEach(function (j, q) { s += '<text class="crk-ax" x="' + X(j).toFixed(1) + '" y="' + (h - 10) + '" text-anchor="' + (q === 0 ? 'start' : q === 2 ? 'end' : 'middle') + '">' + esc(F.dShort(o.dates[j])) + '</text>'; });
    if (o.zero != null) s += '<line class="crk-zero" x1="' + Lm + '" x2="' + (w - Rm) + '" y1="' + Y(o.zero).toFixed(1) + '" y2="' + Y(o.zero).toFixed(1) + '"/>';
    var xs = []; for (i = 0; i < n; i++) xs.push(X(i));
    o.lines.forEach(function (l, li) {
      var ys = l.v.map(Y), d = pathOf(xs, ys); l._ys = ys;
      if (l.area) { var base = Y(o.zero != null ? o.zero : lo); s += '<path class="crk-area ' + l.area + '" d="' + d + 'L' + xs[n - 1].toFixed(1) + ' ' + base.toFixed(1) + 'L' + xs[0].toFixed(1) + ' ' + base.toFixed(1) + 'Z"/>'; }
      s += ser(d, l.cls, 'style="transition-delay:' + (li * 120) + 'ms"');
    });
    o.lines.forEach(function (l, li) { s += '<circle class="crk-dot ' + l.cls + '" data-d="' + o.id + '-' + li + '" r="6" cx="-20" cy="-20"/>'; });
    s += '<line class="crk-cur" data-g="' + o.id + '" y1="' + Tm + '" y2="' + (h - Bm) + '" x1="-20" x2="-20"/>';
    s += '<rect class="crk-hit" data-hov="' + o.id + '" x="' + Lm + '" y="' + Tm + '" width="' + (w - Lm - Rm) + '" height="' + (h - Tm - Bm) + '"/></svg>';
    c.hov[o.id] = { n: n, xs: xs, lines: o.lines, tip: o.tip };
    return s;
  }

  var SL = [];
  /* ============================== 1 · Portada ============================== */
  SL.push(function (c) {
    var r = c.r, K = r.kpis, S = c.S, v = r.series.value, d = r.series.dates, w = W, h = 400, n = v.length, lo = Math.min.apply(0, v), hi = Math.max.apply(0, v), pd = (hi - lo) * 0.12 || 1;
    function X(j) { return (n > 1 ? j / (n - 1) : 0) * w; } function Y(x) { return 24 + (1 - (x - (lo - pd)) / (hi - lo + 2 * pd)) * (h - 48); }
    var xs = [], ys = []; for (var i = 0; i < n; i++) { xs.push(X(i)); ys.push(Y(v[i])); }
    var dd = pathOf(xs, ys), svg = '<svg class="crk-svg crk-cv-svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true"><defs><linearGradient id="crk-cvg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".34"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>' +
      '<path class="crk-area-cv" d="' + dd + 'L' + w + ' ' + h + 'L0 ' + h + 'Z" fill="url(#crk-cvg)"/>' + ser(dd, 'crk-l-acc crk-thick', 'style="transition-duration:1800ms"') +
      '<circle class="crk-dot crk-pulse crk-l-acc" cx="' + xs[n - 1].toFixed(1) + '" cy="' + ys[n - 1].toFixed(1) + '" r="8"/>' +
      '<line class="crk-cur" data-g="cv" y1="24" y2="' + (h - 24) + '" x1="-20" x2="-20"/><circle class="crk-dot crk-l-acc" data-d="cv-0" r="7" cx="-20" cy="-20"/><rect class="crk-hit" data-hov="cv" x="0" y="0" width="' + w + '" height="' + h + '"/></svg>';
    c.hov.cv = { n: n, xs: xs, lines: [{ _ys: ys }], tip: function (j) { return '<b>' + esc(F.dLong(d[j])) + '</b><br>' + esc(F.money(v[j])); } };
    var sub = [FM.pct2(K.twr) + ' ' + S.twrSub];
    if (K.bench != null) sub.push(S.vs + ' ' + K.benchName + ' ' + FM.pct2(K.bench));
    return { html: '<div class="crk-in crk-cover"><div class="crk-cv-top"><span class="crk-brand">' + esc(S.brand) + '</span><span class="crk-k">' + esc(S.kickCover) + '</span></div>' +
      '<h2 class="crk-t crk-cv-t">' + esc(r.meta.portfolioName) + '</h2><p class="crk-cv-per">' + esc(r.meta.periodName) + ' · ' + esc(r.meta.periodLabel) + '</p>' +
      '<div class="crk-cv-fig"><span class="crk-lab">' + esc(S.gainLab) + '</span>' + num(K.gain, 'smoney', 'crk-huge ' + tone(K.gain)) + '<span class="crk-cv-sub">' + esc(sub.join(' · ')) + '</span></div>' + svg +
      '<p class="crk-cv-s">' + esc(S.sample) + '</p></div>' };
  });
  /* ============================== 2 · Resultado ============================== */
  SL.push(function (c) {
    var r = c.r, K = r.kpis, S = c.S, sr = r.series, tiles = '';
    function tile(lab, valHtml, sub, big) { return '<div class="crk-tile' + (big ? ' is-big' : '') + '"><span class="crk-lab">' + esc(lab) + '</span>' + valHtml + (sub ? '<span class="crk-tsub">' + esc(sub) + '</span>' : '') + '</div>'; }
    tiles += tile(S.gain, num(K.gain, 'smoney', 'crk-fig ' + tone(K.gain)), '', true);
    tiles += tile(S.twr, num(K.twr, 'pct2', 'crk-fig2 ' + tone(K.twr)));
    if (K.mwr != null) tiles += tile(S.mwr, num(K.mwr, 'pct2', 'crk-fig2 ' + tone(K.mwr)));
    if (K.bench != null) tiles += tile(S.ref + ': ' + K.benchName, num(K.bench, 'pct2', 'crk-fig2 ' + tone(K.bench)), Math.abs(K.excess * 100) < 0.05 ? S.alike : nf1.format(Math.abs(K.excess * 100)) + ' pts ' + (K.excess > 0 ? S.above : S.below));
    var lines = [{ v: sr.index, cls: 'crk-l-acc crk-thick', area: 'crk-area-acc' }];
    if (K.bench != null) lines.unshift({ v: sr.bench, cls: 'crk-l-ref' });
    var chart = lineChart(c, { id: 'res', w: 880, h: 560, dates: sr.dates, lines: lines, yfmt: function (t) { return nf0.format(t); }, label: S.base,
      tip: function (j) { var t = '<b>' + esc(F.dLong(sr.dates[j])) + '</b><br>' + esc(S.yours) + ' ' + FM.pct2(sr.index[j] / 100 - 1); if (K.bench != null) t += '<br>' + esc(K.benchName) + ' ' + FM.pct2(sr.bench[j] / 100 - 1); return t; } });
    var leg = '<div class="crk-leg"><span><i class="crk-sw crk-sw-acc"></i>' + esc(S.yours) + '</span>' + (K.bench != null ? '<span><i class="crk-sw crk-sw-ref"></i>' + esc(K.benchName) + '</span>' : '') + '<span class="crk-leg-n">' + esc(S.base) + '</span></div>';
    return { html: frame(c, S.kRes, K.gain >= 0 ? S.tResUp : S.tResDn, '<div class="crk-res"><div class="crk-tiles">' + tiles + '</div><div class="crk-chart">' + leg + chart + '</div></div>') };
  });
  /* ============================== 3 · Qué lo movió (cascada) ============================== */
  SL.push(function (c) {
    var r = c.r, S = c.S, all = r.contributions.filter(function (x) { return Math.abs(x.c) > 1e-9; }); if (!all.length) return null;
    var items = [];
    if (all.length > 9) {
      var mid = all.slice(4, all.length - 4), sc = 0, sp = 0; mid.forEach(function (x) { sc += x.c; sp += x.pnl; });
      items = all.slice(0, 4).map(function (x) { return { lab: x.ticker, v: x.c * 100, tip: x.name + ' (' + x.ticker + ')<br>' + F.smoney(x.pnl) + ' · ' + F.pts(x.c * 100) }; });
      items.push({ lab: S.others, v: sc * 100, tip: S.others + ' (' + mid.length + ')<br>' + F.smoney(sp) + ' · ' + F.pts(sc * 100) });
      items = items.concat(all.slice(all.length - 4).map(function (x) { return { lab: x.ticker, v: x.c * 100, tip: x.name + ' (' + x.ticker + ')<br>' + F.smoney(x.pnl) + ' · ' + F.pts(x.c * 100) }; }));
    } else items = all.map(function (x) { return { lab: x.ticker, v: x.c * 100, tip: x.name + ' (' + x.ticker + ')<br>' + F.smoney(x.pnl) + ' · ' + F.pts(x.c * 100) }; });
    var tot = r.kpis.twr * 100; items.push({ lab: S.total, v: tot, total: true, tip: S.total + '<br>' + FM.pct2(r.kpis.twr) });
    var w = 1456, h = 560, Lm = 90, Rm = 16, Tm = 40, Bm = 44, cum = 0, lo = 0, hi = 0;
    items.forEach(function (it) { if (it.total) { it.a = 0; it.b = it.v; } else { it.a = cum; cum += it.v; it.b = cum; } lo = Math.min(lo, it.a, it.b); hi = Math.max(hi, it.a, it.b); });
    var pad = (hi - lo) * 0.1 || 1; lo -= pad; hi += pad;
    function Y(v) { return Tm + (1 - (v - lo) / (hi - lo)) * (h - Tm - Bm); }
    function sg(v) { return (v > 0.0049 ? '+' : v < -0.0049 ? '−' : '') + nf2.format(Math.abs(v)); }
    var slot = (w - Lm - Rm) / items.length, bw = Math.min(110, slot * 0.62), s = '<svg class="crk-svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' + esc(S.tWf) + '">';
    ticks(lo, hi, 4).forEach(function (t) { s += '<line class="crk-grid" x1="' + Lm + '" x2="' + (w - Rm) + '" y1="' + Y(t).toFixed(1) + '" y2="' + Y(t).toFixed(1) + '"/><text class="crk-ax" x="' + (Lm - 12) + '" y="' + (Y(t) + 6).toFixed(1) + '" text-anchor="end">' + (t > 0 ? '+' : t < 0 ? '−' : '') + nf1.format(Math.abs(t)) + '</text>'; });
    s += '<line class="crk-zero" x1="' + Lm + '" x2="' + (w - Rm) + '" y1="' + Y(0).toFixed(1) + '" y2="' + Y(0).toFixed(1) + '"/>';
    items.forEach(function (it, i) {
      var cx = Lm + slot * (i + 0.5), x = cx - bw / 2, top = Y(Math.max(it.a, it.b)), bot = Y(Math.min(it.a, it.b)), ph = Math.max(3, bot - top), pos = it.v >= 0, d = i * 90;
      s += '<g class="crk-bg" tabindex="0" data-tip="' + esc(it.tip) + '"><rect class="crk-bar ' + (it.total ? 'is-tot' : pos ? 'is-up' : 'is-dn') + ' ' + (pos ? 'o-b' : 'o-t') + '" x="' + x.toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + ph.toFixed(1) + '" rx="6" style="transition-delay:' + d + 'ms"/>' +
        '<text class="crk-bv ' + (it.total ? '' : pos ? 'up' : 'dn') + '" x="' + cx.toFixed(1) + '" y="' + (pos ? top - 10 : top + ph + 24).toFixed(1) + '" text-anchor="middle" style="transition-delay:' + (d + 380) + 'ms">' + (it.total ? FM.pct2(r.kpis.twr) : sg(it.v)) + '</text>' +
        '<text class="crk-bl' + (it.total ? ' is-tot' : '') + '" x="' + cx.toFixed(1) + '" y="' + (h - 12) + '" text-anchor="middle">' + esc(it.lab) + '</text></g>';
      if (i < items.length - 1) s += '<line class="crk-con" x1="' + (x + bw).toFixed(1) + '" x2="' + (Lm + slot * (i + 1.5) - bw / 2).toFixed(1) + '" y1="' + Y(it.b).toFixed(1) + '" y2="' + Y(it.b).toFixed(1) + '" style="transition-delay:' + (d + 300) + 'ms"/>';
    });
    return { html: frame(c, S.kWf, S.tWf, '<p class="crk-sub">' + esc(S.wfSub) + '</p>' + s + '</svg>') };
  });
  /* ============================== 4 · Movimientos ============================== */
  SL.push(function (c) {
    var r = c.r, S = c.S, pos = r.movers.positive, neg = r.movers.negative; if (!pos.length && !neg.length) return null;
    function card(m) {
      function row(k, t, cls) { return t ? '<dt>' + esc(k) + '</dt><dd class="' + (cls || '') + '">' + esc(t) + '</dd>' : ''; }
      return '<article class="crk-mc ' + (m.direction === 'positive' ? 'is-up' : 'is-dn') + '"><header><b class="crk-tk">' + esc(m.ticker) + '</b><span class="crk-nm">' + esc(m.name) + '</span><span class="crk-mi ' + tone(m.pnl) + '">' + esc(F.smoney(m.pnl)) + ' · ' + esc(F.pts(m.contribution_pp)) + '</span></header><dl>' +
        row(S.evento, m.evento, m.hasNews ? '' : 'is-none') + row(S.mec, m.mecanismo) + row(S.imp, m.impacto) + row(S.vig, m.vigilar) + '</dl></article>';
    }
    function side(list, cls, lab) { return list.length ? '<section class="crk-ms ' + cls + '"><h3 class="crk-mh">' + esc(lab) + '</h3><div class="crk-mcs">' + list.map(card).join('') + '</div></section>' : ''; }
    var any = pos.concat(neg).some(function (m) { return m.hasNews; }), one = !pos.length || !neg.length;
    var body = (any ? '' : '<p class="crk-sub">' + esc(S.noNews) + '</p>') + '<div class="crk-mv' + (one ? ' is-one' : '') + '">' + side(pos, 'up', S.up) + side(neg, 'dn', S.dn) + '</div>';
    return { html: frame(c, S.kMv, S.tMv, body), after: function (el) {
      var b = el.querySelector('.crk-b'), sides = [].slice.call(el.querySelectorAll('.crk-mcs')), g = 0;
      while (b.scrollHeight > b.clientHeight + 14 && g++ < 6) { sides.sort(function (a, z) { return z.children.length - a.children.length; }); if (sides[0].children.length <= 2) break; sides[0].removeChild(sides[0].lastElementChild); }
    } };
  });
  /* ============================== 5 · El dólar ============================== */
  SL.push(function (c) {
    var r = c.r, S = c.S, fx = r.fx, cs = r.composition.start, ce = r.composition.end; if (!fx || !isFinite(fx.r)) return null;
    var usdS = cs ? cs.usdShare : 0, usdE = ce ? ce.usdShare : 0, eff = fx.effect || 0;
    if (usdS < 0.005 && usdE < 0.005 && Math.abs(eff) < 1) return null;
    var small = Math.abs(eff) < 1, up = fx.end >= fx.start, y1 = up ? 96 : 24, y2 = up ? 24 : 96;
    var arrow = '<svg class="crk-svg crk-fx-svg" viewBox="0 0 320 120" width="320" height="120" aria-hidden="true"><path class="crk-draw crk-l-acc crk-thick" pathLength="1" d="M12 ' + y1 + ' C 120 ' + y1 + ', 200 ' + y2 + ', 308 ' + y2 + '"/><circle class="crk-dot crk-l-acc crk-pulse" cx="12" cy="' + y1 + '" r="7" style="transition-delay:0ms"/><circle class="crk-dot crk-l-acc crk-pulse" cx="308" cy="' + y2 + '" r="8"/></svg>';
    function share(lab, v, cls) { return '<div class="crk-sh"><span class="crk-sh-l">' + esc(lab) + '</span><div class="crk-sh-t" data-tip="' + esc(S.inUsd + ': ' + FM.p0(v) + '<br>' + S.inMxn + ': ' + FM.p0(1 - v)) + '" tabindex="0"><i class="crk-sh-b ' + cls + '" style="width:' + (v * 100).toFixed(2) + '%"></i></div><span class="crk-sh-v">' + num(v, 'p0') + '</span></div>'; }
    var hasShare = usdS >= 0.005 || usdE >= 0.005;
    var body = '<div class="crk-fx"><div class="crk-fx-rate"><span class="crk-lab">' + esc(S.usdmxn) + '</span><div class="crk-fx-row"><div><span class="crk-tsub">' + esc(S.fxFrom) + '</span>' + num(fx.start, 'n2', 'crk-fig2') + '</div>' + arrow + '<div><span class="crk-tsub">' + esc(S.fxTo) + '</span>' + num(fx.end, 'n2', 'crk-fig2') + '</div></div>' +
      '<span class="crk-fx-chg ' + (up ? 'up' : 'dn') + '">' + num(fx.r, 'pct2') + '</span></div>' +
      '<div class="crk-tile crk-fx-eff"><span class="crk-lab">' + esc(small ? S.fxFlat : eff > 0 ? S.fxAdd : S.fxSub) + '</span>' + (small ? '' : num(eff, 'smoney', 'crk-fig ' + tone(eff))) + '</div></div>' +
      (hasShare ? '<div class="crk-shs"><span class="crk-lab">' + esc(S.usdShare) + '</span>' + share(S.cpStart, usdS, 's') + share(S.cpEnd, usdE, 'e') + '</div>' : '');
    return { html: frame(c, S.kFx, S.tFx, body) };
  });
  /* ============================== 6 · Riesgo ============================== */
  SL.push(function (c) {
    var r = c.r, S = c.S, k = r.risk, sr = r.series; if (!k || sr.index.length < 3) return null;
    var pk = -Infinity, dd = sr.index.map(function (x) { if (x > pk) pk = x; return x / pk - 1; });
    var chart = lineChart(c, { id: 'rk', w: 880, h: 500, dates: sr.dates, zero: 0, noPadHi: true, lines: [{ v: dd, cls: 'crk-l-dn crk-thick', area: 'crk-area-dn' }], yfmt: function (t) { return nf0.format(t * 100) + ' %'; }, label: S.underwater,
      tip: function (j) { return '<b>' + esc(F.dLong(sr.dates[j])) + '</b><br>' + esc(F.pct(dd[j])); } });
    function t(lab, v, sub, big) { return '<div class="crk-tile' + (big ? ' is-big' : '') + '"><span class="crk-lab">' + esc(lab) + '</span>' + v + (sub ? '<span class="crk-tsub">' + esc(sub) + '</span>' : '') + '</div>'; }
    var big = t(S.maxDD, num(k.maxDD, 'pct', 'crk-fig dn'), k.ddPeak && k.ddTrough && k.ddPeak !== k.ddTrough ? S.ddFrom + ' ' + F.dShort(k.ddPeak) + ' ' + S.ddTo + ' ' + F.dShort(k.ddTrough) : '', true), small = '';
    if (k.vol != null) small += t(S.vol, '<span class="crk-n crk-fig3" data-cu="' + k.vol + '" data-f="p1">' + FM.p1(k.vol) + '</span>');
    if (k.beta != null) small += t(S.beta, num(k.beta, 'n2', 'crk-fig3'));
    if (k.sharpe != null) small += t(S.sharpe, num(k.sharpe, 'n2', 'crk-fig3'));
    if (k.best) small += t(S.best, num(k.best.r, 'pct2', 'crk-fig3 up'), F.dLong(k.best.date));
    if (k.worst) small += t(S.worst, num(k.worst.r, 'pct2', 'crk-fig3 dn'), F.dLong(k.worst.date));
    return { html: frame(c, S.kRisk, S.tRisk, '<div class="crk-rk"><div class="crk-chart"><div class="crk-leg"><span><i class="crk-sw crk-sw-dn"></i>' + esc(S.underwater) + '</span></div>' + chart + '</div><div class="crk-rk-t">' + big + '<div class="crk-rk-g">' + small + '</div></div></div>') };
  });
  /* ============================== 7 · Mercados ============================== */
  SL.push(function (c) {
    var r = c.r, S = c.S, rows = (r.markets || []).slice(); if (!rows.length) return null;
    var list = [{ name: S.yours, r: r.kpis.twr, own: true }].concat(rows), lo = 0, hi = 0; list.forEach(function (m) { lo = Math.min(lo, m.r); hi = Math.max(hi, m.r); }); var span = (hi - lo) || 1, zero = (-lo / span * 100).toFixed(2);
    var out = list.map(function (m, i) {
      var left = ((Math.min(0, m.r) - lo) / span * 100).toFixed(2), wd = (Math.abs(m.r) / span * 100).toFixed(2), tp = m.own ? S.yours + '<br>' + FM.pct2(m.r) : m.name + '<br>' + nf2.format(m.start) + ' → ' + nf2.format(m.end) + (m.ccy ? ' ' + m.ccy : '') + '<br>' + FM.pct2(m.r);
      return '<div class="crk-mk' + (m.own ? ' is-own' : '') + '" tabindex="0" data-tip="' + esc(tp) + '"><span class="crk-mk-n">' + esc(m.name) + '</span><div class="crk-mk-t"><i class="crk-mk-z" style="left:' + zero + '%"></i><i class="crk-mk-b ' + (m.r >= 0 ? 'o-l is-up' : 'o-r is-dn') + (m.own ? ' is-own' : '') + '" style="left:' + left + '%;width:' + wd + '%;transition-delay:' + (i * 80) + 'ms"></i></div><span class="crk-mk-v ' + tone(m.r) + '">' + num(m.r, 'pct2') + '</span></div>';
    }).join('');
    return { html: frame(c, S.kMk, S.tMk, '<p class="crk-sub">' + esc(S.mkSub) + '</p><div class="crk-mks">' + out + '</div>') };
  });
  /* ============================== 8 · Composición ============================== */
  SL.push(function (c) {
    var r = c.r, S = c.S, cs = r.composition.start, ce = r.composition.end; if (!cs || !ce || !(cs.total > 0) || !(ce.total > 0)) return null;
    var names = [], order = [1, 2, 3, 4, 5, 7]; ce.byClass.concat(cs.byClass).forEach(function (x) { if (names.indexOf(x.cls) < 0) names.push(x.cls); });
    var col = {}, q = 0; names.forEach(function (n) { col[n] = n === 'Efectivo' ? 6 : order[q++ % order.length]; });
    function at(comp, n) { var f = null; comp.byClass.forEach(function (x) { if (x.cls === n) f = x; }); return f; }
    var w = 860, h = 580, top = 56, bot = 530, H2 = bot - top, bw = 230, x1 = 40, x2 = 590, s = '<svg class="crk-svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' + esc(S.tCp) + '">';
    var y1 = bot, y2 = bot, rib = '', segs = '';
    names.forEach(function (n, i) {
      var a = at(cs, n), b = at(ce, n), wa = a ? a.w : 0, wb = b ? b.w : 0, ha = wa * H2, hb = wb * H2, ta = y1 - ha, tb = y2 - hb, k = 'var(--k' + col[n] + ')';
      if (ha > 0.5 && hb > 0.5) rib += '<path class="crk-rib" d="M' + (x1 + bw) + ' ' + ta.toFixed(1) + 'C' + (x1 + bw + 140) + ' ' + ta.toFixed(1) + ',' + (x2 - 140) + ' ' + tb.toFixed(1) + ',' + x2 + ' ' + tb.toFixed(1) + 'L' + x2 + ' ' + (tb + hb).toFixed(1) + 'C' + (x2 - 140) + ' ' + (tb + hb).toFixed(1) + ',' + (x1 + bw + 140) + ' ' + (ta + ha).toFixed(1) + ',' + (x1 + bw) + ' ' + (ta + ha).toFixed(1) + 'Z" fill="' + k + '"/>';
      [[a, x1, ta, ha, wa, cs, 0], [b, x2, tb, hb, wb, ce, 1]].forEach(function (z) {
        if (!(z[3] > 0.5)) return; var tp = n + '<br>' + F.money(z[0].value) + ' · ' + FM.p0(z[4]);
        segs += '<g class="crk-sg" tabindex="0" data-tip="' + esc(tp) + '"><rect class="crk-seg" x="' + z[1] + '" y="' + z[2].toFixed(1) + '" width="' + bw + '" height="' + Math.max(1, z[3] - 2).toFixed(1) + '" rx="6" fill="' + k + '" style="transition-delay:' + (i * 70) + 'ms"/>' +
          (z[3] >= 34 ? '<text class="crk-sgv" x="' + (z[1] + bw / 2) + '" y="' + (z[2] + z[3] / 2 + 7).toFixed(1) + '" text-anchor="middle">' + FM.p0(z[4]) + '</text>' : '') + '</g>';
      });
      y1 -= ha; y2 -= hb;
    });
    s += '<g class="crk-ribs">' + rib + '</g>' + segs;
    s += '<text class="crk-ct" x="' + (x1 + bw / 2) + '" y="' + (top - 18) + '" text-anchor="middle">' + F.money(cs.total) + '</text><text class="crk-ct" x="' + (x2 + bw / 2) + '" y="' + (top - 18) + '" text-anchor="middle">' + F.money(ce.total) + '</text>';
    s += '<text class="crk-ax" x="' + (x1 + bw / 2) + '" y="' + (h - 10) + '" text-anchor="middle">' + esc(S.cpStart) + '</text><text class="crk-ax" x="' + (x2 + bw / 2) + '" y="' + (h - 10) + '" text-anchor="middle">' + esc(S.cpEnd) + '</text></svg>';
    var leg = names.map(function (n) { var a = at(cs, n), b = at(ce, n); return '<li><i style="background:var(--k' + col[n] + ')"></i><span>' + esc(n) + '</span><b>' + FM.p0(a ? a.w : 0) + ' → ' + FM.p0(b ? b.w : 0) + '</b></li>'; }).join('');
    var usd = (cs.usdShare >= 0.005 || ce.usdShare >= 0.005) ? '<div class="crk-tile"><span class="crk-lab">' + esc(S.inUsd) + '</span><span class="crk-fig3 crk-n">' + FM.p0(cs.usdShare) + ' → ' + num(ce.usdShare, 'p0') + '</span></div>' : '';
    return { html: frame(c, S.kCp, S.tCp, '<div class="crk-cp"><div class="crk-chart">' + s + '</div><div class="crk-cp-r"><ul class="crk-lg">' + leg + '</ul>' + usd + '</div></div>') };
  });
  /* ============================== 9 · Movimientos de cuenta ============================== */
  SL.push(function (c) {
    var r = c.r, S = c.S, a = r.activity, K = r.kpis; if (!a || !a.count) return null;
    function t(lab, v) { return '<div class="crk-tile"><span class="crk-lab">' + esc(lab) + '</span>' + v + '</div>'; }
    var tl = '';
    if (a.deposits > 0) tl += t(S.dep, num(a.deposits, 'money', 'crk-fig3'));
    if (a.withdrawals > 0) tl += t(S.wd, num(a.withdrawals, 'money', 'crk-fig3'));
    if (K.dividends > 0) tl += t(S.div, num(K.dividends, 'money', 'crk-fig3'));
    if (a.buys > 0) tl += t(S.buy, num(a.buys, 'int', 'crk-fig3'));
    if (a.sells > 0) tl += t(S.sell, num(a.sells, 'int', 'crk-fig3'));
    var kinds = { dep: S.evDep, wd: S.evWd, div: S.evDiv, buy: S.evBuy, sell: S.evSell };
    var evs = a.events.slice().sort(function (x, z) { return x.date < z.date ? 1 : x.date > z.date ? -1 : (z.seq || 0) - (x.seq || 0); }).slice(0, 7).map(function (e, i) {
      var amt = e.t === 'wd' ? '−' + F.money(e.mxn) : e.t === 'dep' || e.t === 'div' ? '+' + F.money(e.mxn) : F.money(e.mxn);
      return '<li style="transition-delay:' + (i * 60) + 'ms"><span class="crk-ev-d">' + esc(F.dShort(e.date)) + '</span><span class="crk-ev-k">' + esc(kinds[e.t] || '') + '</span><span class="crk-ev-t">' + esc(e.tk || '') + '</span><b class="crk-ev-a ' + (e.t === 'wd' ? 'dn' : e.t === 'dep' || e.t === 'div' ? 'up' : '') + '">' + esc(amt) + '</b></li>';
    }).join('');
    return { html: frame(c, S.kAc, S.tAc, '<div class="crk-ac"><div class="crk-ac-t">' + tl + '</div><div class="crk-ac-l"><span class="crk-lab">' + esc(S.ev) + '</span><ul class="crk-evs">' + evs + '</ul></div></div>') };
  });
  /* ============================== 10 · Qué viene ============================== */
  SL.push(function (c) {
    var r = c.r, S = c.S, u = r.upcoming || {}, dv = (u.dividends || []).slice(0, 6), er = (u.earnings || []).slice(0, 6);
    function lst(title, rows) { return rows.length ? '<section class="crk-nx"><h3 class="crk-mh">' + esc(title) + '</h3><ul class="crk-evs">' + rows.join('') + '</ul></section>' : ''; }
    var d = dv.map(function (x) { return '<li><span class="crk-ev-d">' + esc(F.dShort(x.date)) + '</span><span class="crk-ev-t">' + esc(x.ticker) + '</span><span class="crk-ev-k">' + esc(x.name || '') + '</span><b class="crk-ev-a">≈ ' + esc(F.money(x.gross)) + '</b></li>'; });
    var e = er.map(function (x) { return '<li><span class="crk-ev-d">' + esc(F.dShort(x.date)) + '</span><span class="crk-ev-t">' + esc(x.ticker) + '</span><span class="crk-ev-k">' + esc(x.when || '') + '</span></li>'; });
    var body = '<div class="crk-nxs">' + (d.length || e.length ? lst(S.nxDiv, d) + lst(S.nxEarn, e) : '<p class="crk-sub">' + esc(S.nxNone) + '</p>') + '</div><p class="crk-legal">' + esc(S.legal) + '</p>';
    return { html: frame(c, S.kNx, S.tNx, body, 'crk-last') };
  });
  /*@@SLIDES*/

  /* ============================== motor ============================== */
  function render(mount, report, opts) {
    opts = opts || {}; var S = STR.es, reduce = function () { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }, rafs = {}, timers = [], dead = false, scale = 1;
    var ctx = { r: report, S: S, hov: {} }, slides = [];
    SL.forEach(function (fn) { var o = null; try { o = fn(ctx); } catch (e) { if (window.console) console.error('crk slide', e); } if (o) slides.push(o); });
    var root = document.createElement('div'); root.className = 'crk'; root.tabIndex = 0; root.setAttribute('role', 'region'); root.setAttribute('aria-roledescription', 'presentación'); root.setAttribute('aria-label', report.meta.portfolioName + ' · ' + report.meta.periodLabel);
    root.innerHTML = '<div class="crk-view"><div class="crk-stage"></div></div><nav class="crk-nav" aria-label="Navegación"><button type="button" class="crk-nb" data-a="prev" aria-label="' + S.prev + '">‹</button><div class="crk-dots"></div><span class="crk-count" aria-live="polite"></span><button type="button" class="crk-nb" data-a="next" aria-label="' + S.next + '">›</button><button type="button" class="crk-nb crk-fs" data-a="fs" aria-label="Pantalla completa" title="Pantalla completa (F)">⤢</button><button type="button" class="crk-nb crk-x" data-a="exit">' + S.exit + '</button></nav>';
    var view = root.querySelector('.crk-view'), stage = root.querySelector('.crk-stage'), dots = root.querySelector('.crk-dots'), count = root.querySelector('.crk-count'), els = [], cur = -1;
    var tip = document.createElement('div'); tip.className = 'crk-tip'; tip.hidden = true;
    slides.forEach(function (s, i) {
      var sec = document.createElement('section'); sec.className = 'crk-slide is-after'; sec.setAttribute('aria-hidden', 'true'); sec.setAttribute('aria-label', S.slide + ' ' + (i + 1)); sec.innerHTML = s.html; stage.appendChild(sec); els.push(sec);
      var b = document.createElement('button'); b.type = 'button'; b.className = 'crk-dot-b'; b.setAttribute('aria-label', S.go + ' ' + (i + 1)); b.innerHTML = '<i></i>'; b.addEventListener('click', function () { go(i); }); dots.appendChild(b);
    });
    stage.appendChild(tip); mount.innerHTML = ''; mount.appendChild(root);

    function fit() { var w = view.clientWidth, h = view.clientHeight; if (!w || !h) return; scale = Math.min(w / W, h / H); stage.style.transform = 'translate(-50%,-50%) scale(' + scale.toFixed(4) + ')'; }
    var ro = window.ResizeObserver ? new ResizeObserver(fit) : null; if (ro) ro.observe(view); else window.addEventListener('resize', fit); fit();

    function stopTweens(el) { Object.keys(rafs).forEach(function (k) { cancelAnimationFrame(rafs[k]); delete rafs[k]; }); if (el) [].forEach.call(el.querySelectorAll('[data-cu]'), function (n) { n.textContent = FM[n.getAttribute('data-f')](+n.getAttribute('data-cu')); }); }
    function countUps(el) {
      if (reduce()) return;
      [].forEach.call(el.querySelectorAll('[data-cu]'), function (n, i) {
        var to = +n.getAttribute('data-cu'), f = FM[n.getAttribute('data-f')], t0 = null, dur = 1100, key = 'cu' + i;
        n.textContent = f(0);
        function step(t) { if (t0 == null) t0 = t; var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4); n.textContent = f(to * e); if (p < 1) rafs[key] = requestAnimationFrame(step); else { n.textContent = f(to); delete rafs[key]; } }
        rafs[key] = requestAnimationFrame(step);
      });
    }
    function hideTip() { tip.hidden = true; [].forEach.call(stage.querySelectorAll('.crk-cur'), function (n) { n.setAttribute('x1', -20); n.setAttribute('x2', -20); }); [].forEach.call(stage.querySelectorAll('.crk-dot[data-d]'), function (n) { n.setAttribute('cx', -20); }); }
    function go(n) {
      n = Math.max(0, Math.min(slides.length - 1, n)); if (n === cur || dead) return;
      var prev = cur; cur = n; stopTweens(prev >= 0 ? els[prev] : null);
      els.forEach(function (el, i) {
        el.classList.toggle('is-active', i === n); el.classList.toggle('is-before', i < n); el.classList.toggle('is-after', i > n); el.setAttribute('aria-hidden', i === n ? 'false' : 'true');
        if (i !== n && el.classList.contains('is-on')) { (function (e) { timers.push(setTimeout(function () { if (!e.classList.contains('is-active')) e.classList.remove('is-on'); }, 460)); })(el); }
      });
      var act = els[n]; if (prev < 0 || reduce()) act.classList.add('is-on'); else timers.push(setTimeout(function () { if (!dead && cur === n) act.classList.add('is-on'); }, 90));
      countUps(act); hideTip();
      [].forEach.call(dots.children, function (b, i) { b.classList.toggle('is-cur', i === n); if (i === n) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
      count.textContent = (n + 1) + ' ' + S.of + ' ' + slides.length;
      root.querySelector('[data-a=prev]').disabled = n === 0; root.querySelector('[data-a=next]').disabled = n === slides.length - 1;
    }
    function next() { go(cur + 1); } function prevS() { go(cur - 1); }
    function onKey(e) {
      if (!document.body.contains(root) || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      var tg = e.target; if (tg && /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName)) return;
      var k = e.key;
      if (k === 'ArrowRight' || k === 'PageDown') next(); else if (k === 'ArrowLeft' || k === 'PageUp') prevS(); else if (k === 'Home') go(0); else if (k === 'End') go(slides.length - 1);
      else if (k === 'Escape') { if (document.fullscreenElement) return; if (opts.onExit) opts.onExit(); return; } else return;
      e.preventDefault();
    }
    document.addEventListener('keydown', onKey);
    var acc = 0, lockUntil = 0, accT = 0;
    function onWheel(e) {
      e.preventDefault(); var now = Date.now(); if (now < lockUntil) return; if (now - accT > 220) acc = 0; accT = now;
      acc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(acc) > 60) { if (acc > 0) next(); else prevS(); acc = 0; lockUntil = now + 650; }
    }
    view.addEventListener('wheel', onWheel, { passive: false });
    var tx = 0, ty = 0, tt = 0;
    function ts(e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; tt = Date.now(); }
    function te(e) { var t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty; if (Date.now() - tt < 700 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) { if (dx < 0) next(); else prevS(); } }
    view.addEventListener('touchstart', ts, { passive: true }); view.addEventListener('touchend', te, { passive: true });
    function onNav(e) { var b = e.target.closest && e.target.closest('[data-a]'); if (!b) return; var a = b.getAttribute('data-a'); if (a === 'fs') { toggleFs(); return; } if (a === 'prev') prevS(); else if (a === 'next') next(); else if (a === 'exit' && opts.onExit) opts.onExit(); }
    var navEl = root.querySelector('.crk-nav'); navEl.addEventListener('click', onNav);
    /* pantalla completa: el escenario de 1600×900 se ve a su tamaño para presentar (Esc sale de pantalla completa antes que del informe) */
    function toggleFs() { try { if (document.fullscreenElement) document.exitFullscreen(); else if (root.requestFullscreen) { var pr = root.requestFullscreen(); if (pr && pr.catch) pr.catch(function () { }); } } catch (e) { } }
    function onFsKey(e) { if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey && document.activeElement && root.contains(document.activeElement)) { e.preventDefault(); toggleFs(); } }
    root.addEventListener('keydown', onFsKey);

    function showTip(html, cx, cy) {
      tip.innerHTML = html; tip.hidden = false; var r = stage.getBoundingClientRect(), x = (cx - r.left) / scale, y = (cy - r.top) / scale, tw = tip.offsetWidth, th = tip.offsetHeight;
      x = x + 18 + tw > W - 12 ? x - 18 - tw : x + 18; y = Math.max(12, Math.min(H - th - 12, y - th / 2)); tip.style.transform = 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px)';
    }
    function onMove(e) {
      var hit = e.target.closest && e.target.closest('[data-hov]');
      if (hit) {
        var id = hit.getAttribute('data-hov'), hv = ctx.hov[id], rc = hit.getBoundingClientRect(), svg = hit.ownerSVGElement, fx = (e.clientX - rc.left) / rc.width, j = Math.max(0, Math.min(hv.n - 1, Math.round(fx * (hv.n - 1)))), x = hv.xs[j];
        var g = svg.querySelector('[data-g="' + id + '"]'); g.setAttribute('x1', x); g.setAttribute('x2', x);
        hv.lines.forEach(function (l, li) { var d = svg.querySelector('[data-d="' + id + '-' + li + '"]'); if (d && l._ys) { d.setAttribute('cx', x); d.setAttribute('cy', l._ys[j]); } });
        showTip(hv.tip(j), e.clientX, e.clientY); return;
      }
      var t = e.target.closest && e.target.closest('[data-tip]'); if (t) showTip(t.getAttribute('data-tip'), e.clientX, e.clientY); else hideTip();
    }
    stage.addEventListener('pointermove', onMove); stage.addEventListener('pointerleave', hideTip);
    function onFocusIn(e) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t) { var r = t.getBoundingClientRect(); showTip(t.getAttribute('data-tip'), r.right, r.top + r.height / 2); } }
    stage.addEventListener('focusin', onFocusIn); stage.addEventListener('focusout', hideTip);
    function afters() { slides.forEach(function (s, i) { if (s.after) { try { s.after(els[i]); } catch (e) { if (window.console) console.error(e); } } }); }
    afters(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!dead) afters(); });
    go(0); try { root.focus({ preventScroll: true }); } catch (e) {}

    return {
      go: go, next: next, prev: prevS,
      destroy: function () {
        try { if (document.fullscreenElement === root) document.exitFullscreen(); } catch (e) { }
        dead = true; document.removeEventListener('keydown', onKey); window.removeEventListener('resize', fit); if (ro) ro.disconnect();
        Object.keys(rafs).forEach(function (k) { cancelAnimationFrame(rafs[k]); }); timers.forEach(clearTimeout);
        view.removeEventListener('wheel', onWheel); view.removeEventListener('touchstart', ts); view.removeEventListener('touchend', te);
        stage.removeEventListener('pointermove', onMove); stage.removeEventListener('pointerleave', hideTip); stage.removeEventListener('focusin', onFocusIn); stage.removeEventListener('focusout', hideTip); navEl.removeEventListener('click', onNav);
        if (root.parentNode) root.parentNode.removeChild(root);
      }
    };
  }
  window.CampoReportDeck = { render: render, STR: STR, _html: function (report) { var ctx = { r: report, S: STR.es, hov: {} }; return SL.map(function (fn) { return fn(ctx); }).filter(Boolean); } };
})();
