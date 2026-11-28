/* Campo · Informe como DOCUMENTO vertical imprimible — window.CampoReportDoc.render(mount, report, opts) → { destroy, print }.
   Páginas A4 de 794×1123 apiladas y escaladas al ancho de la vista previa. Paginación MEDIDA (adaptada de la skill portfolio-report-design,
   assets/pdf-paginate.js): ningún bloque se corta, las tablas se parten repitiendo encabezado, los títulos viajan con su bloque.
   El documento es SIEMPRE papel claro; solo el fondo de la vista previa sigue el tema.
   No calcula finanzas: todo sale de CampoReport.build(). Los gráficos son SVG estáticos (sin animación) para que impriman igual.
   Todos los textos fijos viven en STR.es. Textos fijos en STR.es. */
(function () {
  'use strict';
  function fxw() { var T = window.CampoTracker, b = (T && T.base) || 'MXN', f = (T && T.fx && T.fx.foreign) || (b === 'USD' ? 'MXN' : 'USD'); return { n: f === 'MXN' ? 'peso' : 'dólar', pl: f === 'MXN' ? 'pesos' : 'dólares', pair: f + '/' + b, bpl: b === 'MXN' ? 'pesos' : b === 'USD' ? 'dólares' : b }; }
  var STR = {
    es: {
      brand: 'Portify', kicker: 'Informe del portafolio', sample: window.CAMPO_REAL ? 'Con tus datos' : 'Datos de muestra', generated: 'Generado el ', pageOf: function (n, N) { return 'Página ' + n + ' de ' + N; },
      pages: function (N) { return N + (N === 1 ? ' página' : ' páginas') + ' · A4'; }, preparing: 'Preparando el documento…', aria: 'Informe en formato documento',
      coverValue: 'Valor al final', coverGain: 'Ganancia', coverGainLoss: 'Pérdida', coverTwr: 'Ponderado por tiempo', coverVs: 'Frente a ', you: 'Tu portafolio', ref: 'Referencia', continues: '(continúa)', continued: '(continuación)',
      s: { exec: 'Resumen ejecutivo', perf: 'Rendimiento', attr: 'Atribución', movers: 'Movimientos del periodo', risk: 'Riesgo', comp: 'Composición', act: 'Actividad', ahead: 'Qué viene', notes: 'Notas y definiciones' },
      kpi: { end: 'Valor al final', gain: 'Ganancia', loss: 'Pérdida', twr: 'Ponderado por tiempo', mwr: 'Ponderado por dinero', vs: 'Frente a ', net: 'Aportaciones netas',
        endSub: function (m) { return 'Empezó en ' + m; }, gainSub: 'Después de aportaciones y retiros', twrSub: 'Quita el efecto de cuándo aportaste', mwrSub: 'Sí cuenta cuándo aportaste',
        vsSub: function (n, p) { return n + ' hizo ' + p; }, netSub: function (d, w) { return 'Aportaste ' + d + (w ? ' · retiraste ' + w : ''); } },
      perf: { chart: 'Curva del periodo', chartCap: function (b) { return 'Rendimiento acumulado ponderado por tiempo' + (b ? ' contra ' + b : '') + '. La franja marca la caída más profunda.'; },
        periods: 'Resultado por periodo', cols: { per: 'Periodo', gain: 'Ganancia', twr: 'Ponderado por tiempo', ref: 'Referencia', diff: 'Diferencia' },
        recon: 'De dónde sale tu valor final', reconCap: 'Valor inicial + aportaciones − retiros + ganancia = valor final.',
        r: { start: function (d) { return 'Valor al inicio · ' + d; }, dep: 'Aportaciones', wd: 'Retiros', other: 'Otros movimientos de efectivo', gain: 'Ganancia del periodo', loss: 'Pérdida del periodo', end: function (d) { return 'Valor al final · ' + d; },
          within: function (d, f) { var a = []; if (d) a.push('dividendos cobrados ' + d); if (f) a.push('efecto del ' + fxw().n + ' ' + f); return 'De la cual: ' + a.join(' · ') + '.'; } },
        mk: 'Cómo se movieron los mercados', mkCols: { n: 'Referencia', s: 'Al inicio', e: 'Al final', r: 'Cambio' } },
      attr: { cols: { a: 'Activo', w: 'Peso promedio', g: 'Ganancia', get fx() { return fxw().n === 'peso' ? 'Peso' : 'Dólar'; }, r: 'Rendimiento', c: 'Contribución' }, total: 'Suma de contribuciones', sold: ' · vendida',
        intro: function (t, fx) { return 'Cada fila es lo que esa posición aportó al rendimiento del periodo, en puntos. Todas suman ' + t + ', el rendimiento ponderado por tiempo.' + (fx ? ' La columna ' + (fxw().n === 'peso' ? 'Peso' : 'Dólar') + ' es la parte de la ganancia que viene del ' + fxw().pair + '.' : ''); } },
      mv: { pos: 'Lo que más sumó', neg: 'Lo que más restó', what: 'Qué pasó', why: 'Por qué', impact: 'Impacto', watch: 'A vigilar', news: 'Titulares del periodo', lead: 'Cada tarjeta cuenta qué pasó, cómo se movió la posición frente a su mercado y cuánto pesó en este portafolio. Las explicaciones solo usan titulares reales del periodo; si no hay, se dice.' },
      risk: { lead: 'Lo que costó el rendimiento en vaivenes. Son medidas del periodo: describen lo que pasó, no lo que va a pasar.', vol: 'Volatilidad anualizada', volD: 'Cuánto se mueve el portafolio día a día, llevado a un año.', beta: function (b) { return 'Beta frente a ' + b; },
        betaD: 'Con 1.00 se mueve igual que su referencia; con menos, se mueve menos que ella.', sharpe: 'Sharpe', sharpeD: 'Rendimiento por cada unidad de riesgo, ya descontada la tasa libre de riesgo.', dd: 'Caída máxima', ddD: function (a, b) { return 'Del ' + a + ' al ' + b + '.'; },
        best: 'Mejor día', worst: 'Peor día', uw: 'Distancia al máximo anterior', uwCap: 'Qué tan por debajo del punto más alto estuvo el portafolio cada día.' },
      comp: { intro: function (a, b) { return 'Así se repartía tu portafolio el ' + a + ' y así el ' + b + '.'; }, start: 'Inicio', end: 'Final', cls: { c: 'Clase', vs: 'Inicio', ws: '%', ve: 'Final', we: '%', d: 'Cambio' }, same: 'Sin cambio',
        pos: 'Posiciones', pcols: { a: 'Activo', c: 'Clase', vs: 'Valor al inicio', ws: 'Peso', ve: 'Valor al final', we: 'Peso', d: 'Cambio de peso' },
        usd: function (a, b) { return 'El peso en ' + fxw().pl + ' pasó de ' + a + ' a ' + b + '.'; }, usdOnly: function (b) { return 'El ' + b + ' del portafolio está en ' + fxw().pl + '.'; }, effN: function (n) { return 'Por cómo está repartido, el portafolio se comporta como ' + n + ' posiciones de igual tamaño.'; },
        fx: function (a, b, r, e, up) { return 'El ' + fxw().pair + ' pasó de ' + a + ' a ' + b + ' (' + r + ') y ' + (up ? 'sumó ' : 'restó ') + e + ' a tus posiciones en ' + fxw().pl + '.'; } },
      act: { intro: function (o) { return o; }, cols: { d: 'Fecha', t: 'Tipo', x: 'Detalle', a: 'Importe' }, cap: function (n, N) { return n + ' de ' + N + ' · los más recientes'; },
        types: { dep: 'Aportación', wd: 'Retiro', buy: 'Compra' /* etiqueta de dato, no consejo: el lint solo aplica a la narrativa */, sell: 'Venta', div: 'Dividendo' }, depD: 'Entrada de efectivo', wdD: 'Salida de efectivo' },
      ahead: { lead: 'Fechas del calendario de tus posiciones. Son fechas, no pronósticos de lo que pasará.', cols: { d: 'Fecha', k: 'Evento', x: 'Detalle' }, earn: 'Resultados', div: 'Dividendo estimado', est: 'monto estimado' },
      legal: 'Este informe describe lo que pasó; no es una recomendación de inversión.', legal2: 'Portify no está autorizado para dar asesoría financiera.'
    }
  };

  var nf0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }), nf1 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    nf2 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), nfq = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 4 });
  var MINUS = '−';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function sgn(v, eps) { return v > (eps || 0.00005) ? 'up' : v < -(eps || 0.00005) ? 'dn' : ''; }
  function symR() { var d = window.PORTIFY_DEMO; return d && d.fmt && d.fmt.sym ? d.fmt.sym() : '$'; }
  function cents(v) { var c = Math.round(Math.abs(v) * 100); return (v < 0 && c ? MINUS : '') + symR() + nf2.format(c / 100); }
  function centsAbs(c) { return symR() + nf2.format(Math.abs(c) / 100); }
  function pctAbs(v, d) { return (d === 2 ? nf2 : nf1).format(Math.abs(v) * 100) + ' %'; }
  function ptsFmt(h) { /* h en centésimas de punto (entero) */ return (h > 0 ? '+' : h < 0 ? MINUS : '') + nf2.format(Math.abs(h) / 100) + ' pts'; }
  function n2(v) { return nf2.format(v); }
  function isoYear(iso) { return iso.slice(0, 4); }

  /* redondeo por mayor resto: las cifras mostradas suman EXACTO el total mostrado */
  function lrRound(vals, target) {
    var fl = vals.map(Math.floor), rem = target - fl.reduce(function (a, b) { return a + b; }, 0), n = vals.length;
    if (rem < 0 || rem > n) return vals.map(Math.round);
    var ord = vals.map(function (v, i) { return { i: i, f: v - fl[i] }; }).sort(function (a, b) { return b.f - a.f; });
    for (var k = 0; k < rem; k++) fl[ord[k].i] += 1;
    return fl;
  }

  /* ============================== gráficas (SVG estático, autorado al tamaño del hueco) ============================== */
  function nice(step) { var p = Math.pow(10, Math.floor(Math.log10(step))), f = step / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
  function tickTxt(v, step) { return (v > 1e-9 ? '+' : v < -1e-9 ? MINUS : '') + (step < 1 ? nf1 : nf0).format(Math.abs(v)) + ' %'; }
  function pathOf(xs, ys) { var d = ''; for (var i = 0; i < xs.length; i++) d += (i ? 'L' : 'M') + xs[i].toFixed(1) + ' ' + ys[i].toFixed(1); return d; }

  function curve(R, o, S) {
    var s = R.series, n = s.index.length; if (n < 2) return '';
    var W = o.W, H = o.H, pl = o.pl, pr = o.pr, pt = o.pt, pb = o.pb, hasB = R.kpis.bench != null && s.bench && s.bench.length === n;
    var arr = s.index.concat(hasB ? s.bench : []); arr.push(100);
    var lo = Math.min.apply(null, arr), hi = Math.max.apply(null, arr), sp = (hi - lo) || 1; lo -= sp * 0.1; hi += sp * 0.1;
    function X(i) { return pl + i / (n - 1) * (W - pl - pr); }
    function Y(v) { return pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb); }
    var xs = [], ys = [], yb = [], i; for (i = 0; i < n; i++) { xs.push(X(i)); ys.push(Y(s.index[i])); if (hasB) yb.push(Y(s.bench[i])); }
    var out = ['<svg class="crd-svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(S.perf.chart + ': de 0 a ' + pc(s.index[n - 1] / 100 - 1, 1)) + '">'];
    if (o.axes) {
      var step = nice(((hi - lo) / 4) || 1), v0 = Math.ceil((lo - 100) / step) * step;
      for (var v = v0; v <= hi - 100 + 1e-9; v += step) { var yy = Y(100 + v); out.push('<line class="c-grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '"/><text class="c-tick" x="' + (pl - 8) + '" y="' + (yy + 4).toFixed(1) + '" text-anchor="end">' + tickTxt(Math.abs(v) < 1e-9 ? 0 : v, step) + '</text>'); }
      var m = R.risk, pk = s.dates.indexOf(m.ddPeak), tr = s.dates.indexOf(m.ddTrough);
      if (o.band && m.maxDD < -0.03 && pk >= 0 && tr > pk) out.push('<rect class="c-band" x="' + X(pk).toFixed(1) + '" y="' + pt + '" width="' + (X(tr) - X(pk)).toFixed(1) + '" height="' + (H - pt - pb) + '"/><text class="c-note" x="' + ((X(pk) + X(tr)) / 2).toFixed(1) + '" y="' + (H - pb - 6) + '" text-anchor="middle">' + esc(pc(m.maxDD, 1)) + '</text>');
      var idxs = [0, 0.25, 0.5, 0.75, 1].map(function (f) { return Math.round(f * (n - 1)); });
      idxs.forEach(function (k, j) { out.push('<text class="c-tick" x="' + X(k).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + (j === 0 ? 'start' : j === idxs.length - 1 ? 'end' : 'middle') + '">' + esc(RPfmt().dShort(s.dates[k])) + '</text>'); });
    }
    out.push('<line class="c-zero" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(100).toFixed(1) + '" y2="' + Y(100).toFixed(1) + '"/>');
    out.push('<path class="c-area" d="' + pathOf(xs, ys) + 'L' + xs[n - 1].toFixed(1) + ' ' + Y(100).toFixed(1) + 'L' + xs[0].toFixed(1) + ' ' + Y(100).toFixed(1) + 'Z"/>');
    if (hasB) out.push('<path class="c-bench" d="' + pathOf(xs, yb) + '"/>');
    out.push('<path class="c-line" d="' + pathOf(xs, ys) + '"/><circle class="c-dot" cx="' + xs[n - 1].toFixed(1) + '" cy="' + ys[n - 1].toFixed(1) + '" r="4"/>');
    if (o.endLabels) {
      var y1 = ys[n - 1], y2 = hasB ? yb[n - 1] : null, F = RPfmt(), a = y1, b = y2;
      if (hasB && Math.abs(y1 - y2) < 30) { if (y1 <= y2) { a = y1 - 8; b = y2 + 14; } else { a = y1 + 14; b = y2 - 8; } }
      out.push('<text class="c-lab c-lab-a" x="' + (W - pr + 10) + '" y="' + (a - 2).toFixed(1) + '">' + esc(S.you) + '</text><text class="c-lab c-lab-a" x="' + (W - pr + 10) + '" y="' + (a + 12).toFixed(1) + '">' + esc(pc(s.index[n - 1] / 100 - 1, 1)) + '</text>');
      if (hasB) out.push('<text class="c-lab" x="' + (W - pr + 10) + '" y="' + (b - 2).toFixed(1) + '">' + esc(S.ref) + '</text><text class="c-lab" x="' + (W - pr + 10) + '" y="' + (b + 12).toFixed(1) + '">' + esc(pc(s.bench[n - 1] / 100 - 1, 1)) + '</text>');
    }
    if (o.legend) {
      out.push('<line class="c-line" x1="' + pl + '" x2="' + (pl + 26) + '" y1="14" y2="14"/><text class="c-lab c-lab-a" x="' + (pl + 34) + '" y="18">' + esc(S.you) + '</text>');
      if (hasB) out.push('<line class="c-bench" x1="' + (pl + 150) + '" x2="' + (pl + 176) + '" y1="14" y2="14"/><text class="c-lab" x="' + (pl + 184) + '" y="18">' + esc(S.ref) + '</text>');
      out.push('<text class="c-tick" x="' + pl + '" y="' + (H - 6) + '" text-anchor="start">' + esc(RPfmt().dLong(s.dates[Math.min(1, n - 1)])) + '</text><text class="c-tick" x="' + (W - pr) + '" y="' + (H - 6) + '" text-anchor="end">' + esc(RPfmt().dLong(s.dates[n - 1])) + '</text>');
    }
    out.push('</svg>');
    return out.join('');
  }

  function underwater(R, W, H, S) {
    var s = R.series, n = s.index.length; if (n < 2 || !(R.risk.maxDD < -0.005)) return '';
    var pl = 44, pr = 12, pt = 10, pb = 24, pk = 100, dd = [], mn = 0, i;
    for (i = 0; i < n; i++) { if (s.index[i] > pk) pk = s.index[i]; var d = s.index[i] / pk - 1; dd.push(d); if (d < mn) mn = d; }
    function X(k) { return pl + k / (n - 1) * (W - pl - pr); }
    function Y(v) { return pt + (v / mn) * (H - pt - pb); }
    var xs = [], ys = []; for (i = 0; i < n; i++) { xs.push(X(i)); ys.push(Y(dd[i])); }
    var out = ['<svg class="crd-svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(S.risk.uw) + '">'];
    [0, 0.5, 1].forEach(function (f) { var yy = Y(mn * f); out.push('<line class="c-grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '"/><text class="c-tick" x="' + (pl - 8) + '" y="' + (yy + 4).toFixed(1) + '" text-anchor="end">' + (f === 0 ? '0 %' : MINUS + nf1.format(Math.abs(mn * f) * 100) + ' %') + '</text>'); });
    out.push('<path class="c-darea" d="' + pathOf(xs, ys) + 'L' + xs[n - 1].toFixed(1) + ' ' + Y(0).toFixed(1) + 'L' + xs[0].toFixed(1) + ' ' + Y(0).toFixed(1) + 'Z"/><path class="c-dline" d="' + pathOf(xs, ys) + '"/>');
    var tIdx = dd.indexOf(mn); out.push('<circle class="c-ddot" cx="' + xs[tIdx].toFixed(1) + '" cy="' + ys[tIdx].toFixed(1) + '" r="4"/><text class="c-note c-note-l" x="' + Math.min(W - pr, xs[tIdx] + 10).toFixed(1) + '" y="' + (ys[tIdx] - 8).toFixed(1) + '" text-anchor="' + (xs[tIdx] > W - 120 ? 'end' : 'start') + '">' + esc(pc(mn, 1) + ' · ' + RPfmt().dShort(s.dates[tIdx])) + '</text>');
    [0, 0.5, 1].forEach(function (f, j) { var k = Math.round(f * (n - 1)); out.push('<text class="c-tick" x="' + X(k).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + (j === 0 ? 'start' : j === 2 ? 'end' : 'middle') + '">' + esc(RPfmt().dShort(s.dates[k])) + '</text>'); });
    return out.join('') + '</svg>';
  }

  function RPfmt() { return window.CampoReport.fmt; }
  function pc(v, d) { return RPfmt().pct(v, d) || (d === 2 ? '0.00 %' : '0.0 %'); }
  function ptsO(v) { return RPfmt().pts(v) || '0.0 pts'; }

  /* ============================== bloques ============================== */
  function colgroup(ws) { return '<colgroup>' + ws.map(function (w) { return '<col style="width:' + w + 'px">'; }).join('') + '</colgroup>'; }
  function table(ws, heads, rows, cls, cap) {
    return '<div class="crd-tw" data-flow="table"><table class="crd-t ' + (cls || '') + '">' + colgroup(ws) + '<thead><tr>' + heads.map(function (h, i) { return '<th class="' + (h[1] || '') + '" scope="col">' + esc(h[0]) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table>' + (cap ? '<p class="crd-cap">' + esc(cap) + '</p>' : '') + '</div>';
  }
  function tr(cells, cls) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>' + cells.join('') + '</tr>'; }
  function td(v, cls, raw) { return '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + (raw ? v : esc(v)) + '</td>'; }

  function build(R, opts) {
    var S = STR[(opts && opts.lang) || 'es'] || STR.es, F = RPfmt(), K = R.kpis, M = R.meta, per = M.period || {}, secN = 0, notes = [], blocks = [];
    function sec(title) { secN++; return '<header class="crd-sh" data-keep-with-next data-min-space="230" data-section="' + esc(title) + '"><span class="crd-sn">' + secN + '</span><h2>' + esc(title) + '</h2></header>'; }
    function p(t, cls) { return '<p class="crd-p' + (cls ? ' ' + cls : '') + '">' + esc(t) + '</p>'; }
    function lede(t) { return '<p class="crd-p crd-lede" data-keep-with-next>' + esc(t) + '</p>'; }

    /* ---------- portada: página a sangre, la curva real del periodo ---------- */
    /* producción: imagen Pexels por sector (aquí no hay fotografía; la portada lleva la curva del periodo) */
    var gainCls = sgn(K.gain, 0.5), cover = '<div class="crd-cover-in">' +
      '<div class="cv-top"><span class="cv-brand">' + esc(S.brand) + '</span><span class="cv-kick">' + esc(S.kicker) + '</span></div>' +
      '<div class="cv-title"><h2>' + esc(M.portfolioName) + '</h2><p class="cv-per">' + esc(M.periodName) + ' · ' + esc(M.periodLabel) + '</p></div>' +
      '<div class="cv-fig"><span class="cv-lab">' + esc(K.gain >= 0 ? S.coverGain : S.coverGainLoss) + '</span><span class="cv-big ' + gainCls + '">' + esc(F.smoney(K.gain)) + '</span>' +
      '<span class="cv-sub"><b class="' + sgn(K.twr) + '">' + esc(pc(K.twr, 2)) + '</b> ' + esc(S.coverTwr.toLowerCase()) + (K.bench != null ? ' · ' + esc(S.coverVs + (K.benchName || '')) + ' <b class="' + sgn(K.bench) + '">' + esc(pc(K.bench, 2)) + '</b>' : '') + '</span></div>' +
      '<div class="cv-curve">' + curve(R, { W: 794, H: 360, pl: 48, pr: 48, pt: 34, pb: 30, axes: false, legend: true }, S) + '</div>' +
      '<div class="cv-foot"><div><span class="cv-lab">' + esc(S.coverValue) + '</span><b>' + esc(F.money(K.vEnd)) + '</b></div>' +
      '<div><span class="cv-lab">' + esc(S.sample) + '</span><b>' + esc(S.generated + F.dLong(M.generatedAt)) + '</b></div></div></div>';

    /* ---------- 1 · resumen ejecutivo ---------- */
    var kp = [{ l: K.gain >= 0 ? S.kpi.gain : S.kpi.loss, v: F.smoney(K.gain), c: sgn(K.gain, 0.5), s: S.kpi.gainSub },
      { l: S.kpi.twr, v: pc(K.twr, 2), c: sgn(K.twr), s: S.kpi.twrSub }];
    kp.unshift({ l: S.kpi.end, v: F.money(K.vEnd), c: '', s: K.vStart > 1 ? S.kpi.endSub(F.money(K.vStart)) : '' });
    if (K.mwr != null) kp.push({ l: S.kpi.mwr, v: pc(K.mwr, 2), c: sgn(K.mwr), s: S.kpi.mwrSub });
    if (K.bench != null) kp.push({ l: S.kpi.vs + (K.benchName || ''), v: ptsO(K.excess * 100), c: sgn(K.excess), s: S.kpi.vsSub(K.benchName || S.ref, pc(K.bench, 2)) });
    if (Math.abs(K.deposits) + Math.abs(K.withdrawals) > 0.5) kp.push({ l: S.kpi.net, v: F.smoney(K.netFlows), c: '', s: S.kpi.netSub(F.money(K.deposits), K.withdrawals > 0.5 ? F.money(K.withdrawals) : '') });
    var kpiHtml = '<div class="crd-kpis">' + kp.slice(0, 6).map(function (k) { return '<div class="crd-kpi"><span class="k-l">' + esc(k.l) + '</span><span class="k-v ' + k.c + '">' + esc(k.v) + '</span>' + (k.s ? '<span class="k-s">' + esc(k.s) + '</span>' : '') + '</div>'; }).join('') + '</div>';
    blocks.push(sec(S.s.exec));
    if (R.highlights && R.highlights.length) {
      blocks.push('<div class="crd-hls" data-flow="split">' + R.highlights.map(function (h, i) { return '<div class="crd-hl' + (i === 0 ? ' first' : '') + '"><h3>' + esc(h.headline) + '</h3>' + (h.body ? '<p>' + esc(h.body) + '</p>' : '') + '</div>'; }).join('') + '</div>');
    }
    blocks.push(kpiHtml);

    /* ---------- 2 · rendimiento ---------- */
    blocks.push(sec(S.s.perf));
    blocks.push(lede(K.vStart > 1 ? 'Del ' + F.dLong(per.start) + ' al ' + F.dLong(per.end) + ' (' + M.sessions + ' sesiones) tu portafolio pasó de ' + F.money(K.vStart) + ' a ' + F.money(K.vEnd) + '.' : 'Al ' + F.dLong(per.end) + ' tu portafolio valía ' + F.money(K.vEnd) + '.'));
    var cc = curve(R, { W: 698, H: 250, pl: 48, pr: 112, pt: 14, pb: 26, axes: true, band: true, endLabels: true }, S);
    if (cc) blocks.push('<figure class="crd-fig"><figcaption>' + esc(S.perf.chart) + '</figcaption>' + cc + '<p class="crd-cap">' + esc(S.perf.chartCap(K.bench != null ? K.benchName : '')) + '</p></figure>');
    /* tabla de periodos: se pide a build() cada periodo; el actual usa el informe en mano */
    try {
      var RP = window.CampoReport, rows = [], seen = {};
      function perRow(r) {
        var k = r.kpis, cur = r === R;
        rows.push(tr([td('<b>' + esc(r.meta.periodName) + '</b><span class="mut"> · ' + esc(r.meta.periodLabel) + '</span>', '', true), td(F.smoney(k.gain), 'n ' + sgn(k.gain, 0.5)), td(pc(k.twr, 2), 'n ' + sgn(k.twr)),
          td(k.bench != null ? pc(k.bench, 2) : '', 'n ' + (k.bench != null ? sgn(k.bench) : '')), td(k.bench != null ? ptsO(k.excess * 100) : '', 'n ' + (k.bench != null ? sgn(k.excess) : ''))], cur ? 'cur' : ''));
      }
      if (RP.periods && RP.build && (opts ? opts.periodsTable !== false : true)) {
        RP.periods().forEach(function (pp) { seen[pp.id] = 1; var r = pp.id === per.id ? R : RP.build(M.portfolioId, pp.id); if (r) perRow(r); });
        if (!seen[per.id]) perRow(R);
      }
      if (rows.length >= 2) blocks.push(table([236, 128, 120, 100, 114], [[S.perf.cols.per], [S.perf.cols.gain, 'n'], [S.perf.cols.twr, 'n'], [S.perf.cols.ref, 'n'], [S.perf.cols.diff, 'n']], rows, 'crd-t-per', ''));
    } catch (e) { /* la tabla de periodos es opcional */ }

    /* conciliación: cada pieza en centavos enteros; la ganancia mostrada cierra la suma exacta */
    var sC = Math.round(K.vStart * 100), eC = Math.round(K.vEnd * 100), dC = Math.round(K.deposits * 100), wC = Math.round(K.withdrawals * 100), oC = Math.round(K.netFlows * 100) - (dC - wC), gC = eC - sC - (dC - wC + oC);
    var recon = [];
    recon.push(tr([td(S.perf.r.start(F.dLong(per.start ? R.series.dates[0] : ''))), td(centsAbs(sC), 'n')]));
    if (dC) recon.push(tr([td('+ ' + S.perf.r.dep), td(centsAbs(dC), 'n')]));
    if (wC) recon.push(tr([td(MINUS + ' ' + S.perf.r.wd), td(centsAbs(wC), 'n')]));
    if (oC) recon.push(tr([td((oC > 0 ? '+ ' : MINUS + ' ') + S.perf.r.other), td(centsAbs(oC), 'n')]));
    recon.push(tr([td((gC >= 0 ? '+ ' : MINUS + ' ') + (gC >= 0 ? S.perf.r.gain : S.perf.r.loss)), td(centsAbs(gC), 'n ' + sgn(gC))]));
    var parts = S.perf.r.within(Math.abs(K.dividends) > 0.5 ? F.money(K.dividends) : '', Math.abs(R.fx.effect) > 0.5 && R.composition.end.usdShare > 0.05 ? F.smoney(R.fx.effect) : '');
    if (Math.abs(K.dividends) > 0.5 || (Math.abs(R.fx.effect) > 0.5 && R.composition.end.usdShare > 0.05)) recon.push('<tr class="sub"><td colspan="2">' + esc(parts) + '</td></tr>');
    recon.push(tr([td('= ' + S.perf.r.end(F.dLong(per.end))), td(centsAbs(eC), 'n')], 'tot'));
    blocks.push('<div class="crd-recon"><h3 class="crd-h3" data-keep-with-next>' + esc(S.perf.recon) + '</h3><table class="crd-t crd-t-rec">' + colgroup([498, 200]) + '<tbody>' + recon.join('') + '</tbody></table><p class="crd-cap">' + esc(S.perf.reconCap) + '</p></div>');
    if (R.markets && R.markets.length) {
      blocks.push('<div class="crd-mk"><h3 class="crd-h3">' + esc(S.perf.mk) + '</h3>' + table([248, 150, 150, 150], [[S.perf.mkCols.n], [S.perf.mkCols.s, 'n'], [S.perf.mkCols.e, 'n'], [S.perf.mkCols.r, 'n']], R.markets.map(function (m) {
        var big = Math.abs(m.end) >= 1000; return tr([td(m.name), td((big ? nf0 : nf2).format(m.start), 'n'), td((big ? nf0 : nf2).format(m.end), 'n'), td(pc(m.r, 1), 'n ' + sgn(m.r))]);
      }), 'crd-t-mk', '').replace(' data-flow="table"', '') + '</div>');
    }

    /* ---------- 3 · atribución ---------- */
    var C = (R.contributions || []).filter(function (c) { return Math.abs(c.pnl) > 0.5 || Math.abs(c.c) > 1e-6 || c.w > 0.001; });
    if (C.length) {
      var hund = lrRound(C.map(function (c) { return c.c * 10000; }), Math.round(K.twr * 10000)), maxC = Math.max.apply(null, hund.map(Math.abs)) || 1, anyFx = C.some(function (c) { return Math.abs(c.fxPnl) > 0.5; });
      var aRows = C.map(function (c, i) {
        var w = Math.abs(hund[i]) / maxC * 50;
        return tr([td('<b>' + esc(c.ticker) + '</b> <span class="mut">' + esc(c.name || '') + (c.closed ? esc(S.attr.sold) : '') + '</span>', 'nm', true), td(pctAbs(c.w), 'n'), td(F.smoney(c.pnl), 'n ' + sgn(c.pnl, 0.5)),
          td(Math.abs(c.fxPnl) > 0.5 ? F.smoney(c.fxPnl) : '', 'n ' + sgn(c.fxPnl, 0.5)), td(c.ret != null ? pc(c.ret, 1) : '', 'n ' + (c.ret != null ? sgn(c.ret) : '')),
          '<td class="n ct"><span class="cbar" aria-hidden="true"><i class="' + (hund[i] >= 0 ? 'up' : 'dn') + '" style="' + (hund[i] >= 0 ? 'left' : 'right') + ':50%;width:' + w.toFixed(1) + '%"></i></span><span class="cv ' + sgn(hund[i], 0.5) + '">' + ptsFmt(hund[i]) + '</span></td>']);
      });
      var tot = hund.reduce(function (a, b) { return a + b; }, 0);
      aRows.push(tr([td(S.attr.total, 'nm'), td(''), td(F.smoney(C.reduce(function (a, c) { return a + c.pnl; }, 0)), 'n ' + sgn(K.gain, 0.5)), td(anyFx ? F.smoney(C.reduce(function (a, c) { return a + c.fxPnl; }, 0)) : '', 'n'), td(''), td(ptsFmt(tot), 'n ' + sgn(tot, 0.5))], 'tot'));
      blocks.push(sec(S.s.attr), lede(S.attr.intro(pc(K.twr, 2), anyFx)));
      blocks.push(table([206, 76, 100, 86, 78, 152], [[S.attr.cols.a], [S.attr.cols.w, 'n'], [S.attr.cols.g, 'n'], [S.attr.cols.fx, 'n'], [S.attr.cols.r, 'n'], [S.attr.cols.c, 'n']], aRows, 'crd-t-attr', ''));
    }

    /* ---------- 4 · movimientos del periodo ---------- */
    function card(m) {
      var rowsC = [[S.mv.what, m.evento], [S.mv.why, m.mecanismo], [S.mv.impact, m.impacto], [S.mv.watch, m.vigilar]].filter(function (r) { return r[1]; });
      var nw = (m.news || []).slice(0, 3).map(function (n) { return '<li>' + esc(n.title) + ' <span class="mut">· ' + esc(n.source) + (n.kind ? ' · ' + esc(n.kind) : '') + '</span></li>'; }).join('');
      return '<article class="crd-card"><h4><b>' + esc(m.ticker) + '</b> <span class="mut">' + esc(m.name || '') + '</span><span class="cd-fig ' + sgn(m.contribution_pp, 0.005) + '">' + esc(ptsO(m.contribution_pp)) + ' · ' + esc(F.smoney(m.pnl)) + '</span></h4>' +
        '<dl>' + rowsC.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + (nw ? '<dt>' + esc(S.mv.news) + '</dt><dd><ul>' + nw + '</ul></dd>' : '') + '</dl></article>';
    }
    var posC = (R.movers.positive || []), negC = (R.movers.negative || []);
    if (posC.length || negC.length) {
      blocks.push(sec(S.s.movers), lede(S.mv.lead));
      if (posC.length) { blocks.push('<h3 class="crd-h3" data-keep-with-next>' + esc(S.mv.pos) + '</h3>'); posC.forEach(function (m) { blocks.push(card(m)); }); }
      if (negC.length) { blocks.push('<h3 class="crd-h3" data-keep-with-next>' + esc(S.mv.neg) + '</h3>'); negC.forEach(function (m) { blocks.push(card(m)); }); }
    }

    /* ---------- 5 · riesgo ---------- */
    var rk = R.risk, cells = [];
    if (rk.vol != null) cells.push([S.risk.vol, nf1.format(rk.vol * 100) + ' %', S.risk.volD, '']);
    if (rk.beta != null && K.bench != null) cells.push([S.risk.beta(K.benchName || S.ref), n2(rk.beta), S.risk.betaD, '']);
    if (rk.sharpe != null) cells.push([S.risk.sharpe, n2(rk.sharpe), S.risk.sharpeD, '']);
    if (rk.maxDD < -0.0005) cells.push([S.risk.dd, pc(rk.maxDD, 1), S.risk.ddD(F.dShort(rk.ddPeak), F.dShort(rk.ddTrough)), 'dn']);
    if (rk.best) cells.push([S.risk.best, pc(rk.best.r, 1), F.dLong(rk.best.date), 'up']);
    if (rk.worst) cells.push([S.risk.worst, pc(rk.worst.r, 1), F.dLong(rk.worst.date), 'dn']);
    if (cells.length) {
      blocks.push(sec(S.s.risk), lede(S.risk.lead));
      blocks.push('<div class="crd-kpis crd-risk">' + cells.map(function (c) { return '<div class="crd-kpi"><span class="k-l">' + esc(c[0]) + '</span><span class="k-v ' + c[3] + '">' + esc(c[1]) + '</span><span class="k-s">' + esc(c[2]) + '</span></div>'; }).join('') + '</div>');
      var uw = underwater(R, 698, 170, S);
      if (uw) blocks.push('<figure class="crd-fig"><figcaption>' + esc(S.risk.uw) + '</figcaption>' + uw + '<p class="crd-cap">' + esc(S.risk.uwCap) + '</p></figure>');
    }

    /* ---------- 6 · composición inicio → fin ---------- */
    var cS = R.composition.start, cE = R.composition.end;
    if (cE && cE.total > 0.5) {
      var hasS = cS && cS.total > 0.5, order = [], wS = {}, wE = {}, vS = {}, vE = {};
      cE.byClass.forEach(function (c) { order.push(c.cls); wE[c.cls] = c.w; vE[c.cls] = c.value; });
      if (hasS) cS.byClass.forEach(function (c) { if (order.indexOf(c.cls) < 0) order.push(c.cls); wS[c.cls] = c.w; vS[c.cls] = c.value; });
      function bar(label, comp, ws) {
        return '<div class="crd-bar-row"><span class="bl">' + esc(label) + '</span><div class="bs">' + order.filter(function (k) { return ws[k] > 0.0005; }).map(function (k) {
          var i = Math.min(order.indexOf(k), 5); return '<i class="sg' + i + '" style="flex:' + (ws[k] * 100).toFixed(3) + ' 0 0" title="' + esc(k + ' ' + nf1.format(ws[k] * 100) + ' %') + '">' + (ws[k] >= 0.08 ? nf0.format(ws[k] * 100) + ' %' : '') + '</i>';
        }).join('') + '</div></div>';
      }
      var legend = '<div class="crd-leg">' + order.map(function (k, i) { return '<span><i class="sw sg' + Math.min(i, 5) + '"></i>' + esc(k) + '</span>'; }).join('') + '</div>';
      blocks.push(sec(S.s.comp), lede(hasS ? S.comp.intro(F.dShort(per.start), F.dShort(per.end)) : S.comp.intro(F.dShort(per.end), F.dShort(per.end)).replace(/Así se repartía tu portafolio el .* y así el /, 'Así está repartido tu portafolio el ')));
      blocks.push('<div class="crd-bars">' + (hasS ? bar(S.comp.start, cS, wS) : '') + bar(S.comp.end, cE, wE) + legend + '</div>');
      var cRows = order.map(function (k) {
        var d = ((wE[k] || 0) - (wS[k] || 0)) * 100;
        return tr([td(k), hasS ? td(F.money(vS[k] || 0), 'n') : '', hasS ? td(nf1.format((wS[k] || 0) * 100) + ' %', 'n') : '', td(F.money(vE[k] || 0), 'n'), td(nf1.format((wE[k] || 0) * 100) + ' %', 'n'), hasS ? td(Math.abs(d) < 0.05 ? S.comp.same : ptsO(d), 'n ' + sgn(d, 0.05)) : '']);
      });
      if (hasS) blocks.push(table([200, 118, 70, 118, 70, 122], [[S.comp.cls.c], [S.comp.cls.vs, 'n'], [S.comp.cls.ws, 'n'], [S.comp.cls.ve, 'n'], [S.comp.cls.we, 'n'], [S.comp.cls.d, 'n']], cRows, 'crd-t-cls', ''));
      var lines = [];
      if (hasS && (cS.usdShare > 0.02 || cE.usdShare > 0.02) && Math.abs(cE.usdShare - cS.usdShare) >= 0.0005) lines.push(S.comp.usd(nf0.format(cS.usdShare * 100) + ' %', nf0.format(cE.usdShare * 100) + ' %'));
      else if (cE.usdShare > 0.02) lines.push(S.comp.usdOnly(nf0.format(cE.usdShare * 100) + ' %'));
      if (R.fx && cE.usdShare > 0.1 && Math.abs(R.fx.effect) > 0.5) lines.push(S.comp.fx(n2(R.fx.start), n2(R.fx.end), pc(R.fx.r, 1), F.money(Math.abs(R.fx.effect)), R.fx.effect >= 0));
      if (cE.effN > 0) lines.push(S.comp.effN(nf1.format(cE.effN)));
      if (lines.length) blocks.push(p(lines.join(' ')));
      /* posiciones: unión de inicio y fin */
      var pm = {}, plist = [];
      (hasS ? cS.positions : []).forEach(function (x) { pm[x.ticker] = { t: x.ticker, n: x.name, c: x.cls, vs: x.value, ws: x.w, ve: 0, we: 0 }; });
      cE.positions.forEach(function (x) { var o = pm[x.ticker] || (pm[x.ticker] = { t: x.ticker, n: x.name, c: x.cls, vs: 0, ws: 0, ve: 0, we: 0 }); o.ve = x.value; o.we = x.w; o.n = o.n || x.name; o.c = o.c || x.cls; });
      Object.keys(pm).forEach(function (k) { plist.push(pm[k]); });
      plist.sort(function (a, b) { return (b.ve - a.ve) || (b.vs - a.vs); });
      if (plist.length) {
        blocks.push('<h3 class="crd-h3" data-keep-with-next>' + esc(S.comp.pos) + '</h3>');
        blocks.push(table([188, 112, 94, 62, 94, 62, 86], [[S.comp.pcols.a], [S.comp.pcols.c], [S.comp.pcols.vs, 'n'], [S.comp.pcols.ws, 'n'], [S.comp.pcols.ve, 'n'], [S.comp.pcols.we, 'n'], [S.comp.pcols.d, 'n']], plist.map(function (x) {
          var d = (x.we - x.ws) * 100;
          return tr([td('<b>' + esc(x.t) + '</b> <span class="mut">' + esc(x.n || '') + '</span>', 'nm', true), td(x.c || '', 'nm'), td(x.vs > 0.5 ? F.money(x.vs) : '', 'n'), td(x.vs > 0.5 ? nf1.format(x.ws * 100) + ' %' : '', 'n'), td(x.ve > 0.5 ? F.money(x.ve) : '', 'n'), td(x.ve > 0.5 ? nf1.format(x.we * 100) + ' %' : '', 'n'), hasS ? td(Math.abs(d) < 0.05 ? '' : ptsO(d), 'n ' + sgn(d, 0.05)) : '']);
        }), 'crd-t-pos', ''));
      }
    }

    /* ---------- 7 · actividad ---------- */
    var A = R.activity;
    if (A && A.count > 0) {
      var ev = A.events.slice().sort(function (a, b) { return (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) || ((a.seq || 0) - (b.seq || 0)); }), N = ev.length, CAP = 80;
      if (ev.length > CAP) ev = ev.slice(ev.length - CAP);
      var bits = [], nDiv = A.dividends ? A.dividends.length : 0;
      if (Math.abs(A.deposits) > 0.5) bits.push('aportaste ' + F.money(A.deposits));
      if (Math.abs(A.withdrawals) > 0.5) bits.push('retiraste ' + F.money(A.withdrawals));
      if (A.buys) bits.push(A.buys + (A.buys === 1 ? ' adquisición' : ' adquisiciones'));
      if (A.sells) bits.push(A.sells + (A.sells === 1 ? ' venta' : ' ventas'));
      if (nDiv) bits.push(nDiv + (nDiv === 1 ? ' dividendo' : ' dividendos') + ' por ' + F.money(K.dividends));
      blocks.push(sec(S.s.act));
      if (bits.length) blocks.push(lede('En el periodo ' + bits.join(', ') + '.'));
      blocks.push(table([100, 112, 328, 158], [[S.act.cols.d], [S.act.cols.t], [S.act.cols.x], [S.act.cols.a, 'n']], ev.map(function (e) {
        var det = e.t === 'dep' ? S.act.depD : e.t === 'wd' ? S.act.wdD : (e.tk || '') + (e.name ? ' · ' + e.name : '') + (e.t !== 'div' && e.qty ? ' · ' + nfq.format(e.qty) + (e.px ? ' × ' + n2(e.px) + (e.ccy ? ' ' + e.ccy : '') : '') : '');
        return tr([td(F.dShort(e.date) + ' ' + isoYear(e.date), 'nw'), td(S.act.types[e.t] || e.t), td(det, 'nm'), td(F.money(e.mxn), 'n')]);
      }), 'crd-t-act', N > CAP ? S.act.cap(CAP, N) : ''));
    }

    /* ---------- 8 · qué viene ---------- */
    var U = R.upcoming || {}, up = [];
    (U.earnings || []).forEach(function (x) { up.push({ d: x.date, k: S.ahead.earn, x: x.ticker + (x.when ? ' · ' + x.when : '') }); });
    (U.dividends || []).forEach(function (x) { up.push({ d: x.date, k: S.ahead.div, x: x.ticker + (x.gross ? ' · ≈ ' + F.money(x.gross) : '') }); });
    up.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
    if (up.length) {
      blocks.push(sec(S.s.ahead), lede(S.ahead.lead));
      blocks.push(table([130, 190, 378], [[S.ahead.cols.d], [S.ahead.cols.k], [S.ahead.cols.x]], up.slice(0, 14).map(function (x) { return tr([td(F.dShort(x.d) + ' ' + isoYear(x.d), 'nw'), td(x.k), td(x.x, 'nm')]); }), 'crd-t-up', ''));
    }

    /* ---------- 9 · notas, definiciones y aviso legal ---------- */
    var fn = (R.footnotes || []).filter(function (t) { return !/recomendaci/.test(t); });
    blocks.push(sec(S.s.notes));
    if (fn.length) blocks.push('<ol class="crd-notes" data-flow="split">' + fn.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>');
    blocks.push('<aside class="crd-legal"><p><b>' + esc(S.legal) + '</b></p><p>' + esc(S.legal2) + (M.sample ? ' ' + esc(S.sample) + '.' : '') + '</p></aside>');

    return { cover: cover, flow: blocks.join(''), S: S };
  }

  /* ============================== paginación medida (adaptada de pdf-paginate.js) ============================== */
  function paginate(flow, measure, S, onNewPage) {
    var contentH = 1000, pages = [], warnings = [], body = null, curSection = '';
    function warn(msg, node) { warnings.push(msg); if (node && node.setAttribute) node.setAttribute('data-oversize', '1'); }
    function newPage() {
      var pg = document.createElement('div'); pg.className = 'crd-page'; pg.setAttribute('data-section', curSection);
      var b = document.createElement('div'); b.className = 'crd-body'; pg.appendChild(b); measure.appendChild(pg); pages.push(pg); body = b; return b;
    }
    function used() { var last = body.lastElementChild; if (!last) return 0; var mb = parseFloat(getComputedStyle(last).marginBottom) || 0; return last.getBoundingClientRect().bottom + mb - body.getBoundingClientRect().top; }
    function fits() { return used() <= contentH + 0.5; }
    function pullKeep() { var out = []; while (body.childElementCount > 1 && out.length < 2) { var last = body.lastElementChild; if (!last.hasAttribute('data-keep-with-next')) break; body.removeChild(last); out.unshift(last); } return out; }
    function tableOf(blk) { return blk.matches && blk.matches('table') ? blk : blk.querySelector && blk.querySelector('table'); }
    function note(cls, text) { var n = document.createElement('div'); n.className = cls; n.textContent = text; return n; }
    function splitTable(blk) {
      var table = tableOf(blk), tbody = table && table.tBodies[0];
      if (!tbody || tbody.rows.length < 4) return false;
      var tail = note('crd-tcont', S.continues); blk.appendChild(tail);
      var moved = [];
      while (tbody.rows.length > 2 && !fits()) { var r = tbody.rows[tbody.rows.length - 1]; tbody.removeChild(r); moved.unshift(r); }
      if (!fits() || !moved.length) { moved.forEach(function (row) { tbody.appendChild(row); }); blk.removeChild(tail); return false; }
      var cont = blk.cloneNode(true); cont.removeChild(cont.querySelector('.crd-tcont'));
      var ctb = tableOf(cont).tBodies[0]; while (ctb.rows.length) ctb.deleteRow(-1);
      moved.forEach(function (row) { ctb.appendChild(row); });
      var after = [], seen = false;
      [].slice.call(blk.children).forEach(function (kid) { if (kid === table || kid.contains(table)) { seen = true; return; } if (seen && kid !== tail) after.push(kid); });
      after.forEach(function (kid) { blk.removeChild(kid); });
      cont.setAttribute('data-continued', '1'); cont.insertBefore(note('crd-tcont-h', S.continued), cont.firstChild);
      newPage(); place(cont); return true;
    }
    function splitContainer(blk) {
      var kids = [].slice.call(blk.children); if (kids.length < 2) return false;
      kids.forEach(function (kid) { blk.removeChild(kid); });
      var cur = blk;
      for (var i = 0; i < kids.length; i++) {
        cur.appendChild(kids[i]); if (fits()) continue;
        if (cur.childElementCount > 1) { cur.removeChild(kids[i]); cur = cur.cloneNode(false); cur.setAttribute('data-continued', '1'); newPage(); body.appendChild(cur); cur.appendChild(kids[i]); if (!fits()) warn('oversize child in ' + (blk.className || blk.tagName), kids[i]); }
        else if (body.childElementCount > 1) { body.removeChild(cur); newPage(); body.appendChild(cur); if (!fits()) warn('oversize child in ' + (blk.className || blk.tagName), kids[i]); }
        else warn('oversize child in ' + (blk.className || blk.tagName), kids[i]);
      }
      return true;
    }
    function place(blk) {
      var mode = blk.getAttribute('data-flow'), minSpace = parseFloat(blk.getAttribute('data-min-space')) || 0;
      if (body.childElementCount && minSpace && (contentH - used()) < minSpace) newPage();
      body.appendChild(blk); if (fits()) return;
      if (mode === 'table' && splitTable(blk)) return;
      if (mode === 'split' && splitContainer(blk)) return;
      if (body.childElementCount > 1) {
        body.removeChild(blk); var pulled = pullKeep(); newPage(); pulled.forEach(function (n) { body.appendChild(n); }); body.appendChild(blk);
        if (fits()) return;
        if (mode === 'table' && splitTable(blk)) return;
        if (mode === 'split' && splitContainer(blk)) return;
      }
      warn('block taller than the content box (' + Math.round(used()) + 'px > ' + contentH + 'px): ' + (blk.className || blk.tagName), blk);
    }
    newPage();
    [].slice.call(flow.children).forEach(function (blk) {
      if (blk.getAttribute('data-section')) { curSection = blk.getAttribute('data-section'); if (body.childElementCount <= 1) pages[pages.length - 1].setAttribute('data-section', curSection); }
      place(blk);
    });
    while (pages.length > 1) { var lb = pages[pages.length - 1].querySelector('.crd-body'); if (lb && !lb.childElementCount) { measure.removeChild(pages.pop()); } else break; }
    pages.forEach(function (pg, i) {
      var b = pg.querySelector('.crd-body'); if (b.scrollHeight > contentH + 1) { warnings.push('page ' + (i + 1) + ' overflows by ' + Math.round(b.scrollHeight - contentH) + 'px'); pg.setAttribute('data-overflow', '1'); }
      [].slice.call(b.children).forEach(function (kid) { if (kid.scrollWidth > 698 + 1) { warnings.push('page ' + (i + 1) + ': ' + (kid.className || kid.tagName) + ' is ' + Math.round(kid.scrollWidth) + 'px wide'); kid.setAttribute('data-oversize', '1'); } });
    });
    if (onNewPage) onNewPage(pages);
    return { pages: pages, warnings: warnings };
  }

  /* ============================== render ============================== */
  function render(mount, report, opts) {
    opts = opts || {};
    var S = STR[opts.lang || 'es'] || STR.es, built = build(report, opts), dead = false, ro = null, io = null, timers = [], host = null, styleEl = null;
    var html = document.documentElement, M = report.meta;
    var root = document.createElement('div'); root.className = 'crd'; root.setAttribute('role', 'document'); root.setAttribute('aria-label', S.aria + ': ' + M.portfolioName + ', ' + M.periodName);
    root.innerHTML = '<div class="crd-bar" aria-live="polite"><span class="crd-count"></span><span class="crd-cur"></span></div><div class="crd-wait" role="status">' + esc(S.preparing) + '</div><div class="crd-stack"></div><div class="crd-measure" aria-hidden="true"><div class="crd-flow">' + built.flow + '</div></div>';
    mount.appendChild(root);
    html.classList.add('crd-active');
    styleEl = document.createElement('style'); styleEl.setAttribute('data-crd', ''); styleEl.textContent = '@media print { @page { size: A4; margin: 0; } }'; document.head.appendChild(styleEl);
    var stack = root.querySelector('.crd-stack'), measure = root.querySelector('.crd-measure'), flow = root.querySelector('.crd-flow'), wait = root.querySelector('.crd-wait');
    var handle = { pages: [], warnings: [], ready: false, destroy: destroy, print: print };

    function setScale() {
      var w = root.clientWidth || 794, pad = w < 640 ? 12 : 24, s = Math.max(0.2, Math.min(1, (w - 2 * pad) / 794));
      root.style.setProperty('--crd-s', s.toFixed(4));
    }
    function chromeStamp(pages) {
      var N = pages.length;
      pages.forEach(function (pg, i) {
        if (pg.classList.contains('crd-cover')) return;
        var head = document.createElement('div'); head.className = 'crd-head'; head.innerHTML = '<span>' + esc(M.portfolioName) + ' · ' + esc(M.periodName) + '</span><span>' + esc(pg.getAttribute('data-section') || '') + '</span>';
        var foot = document.createElement('div'); foot.className = 'crd-foot'; foot.innerHTML = '<span>' + esc(S.sample) + ' · ' + esc(S.generated + RPfmt().dLong(M.generatedAt)) + '</span><span>' + esc(S.pageOf(i + 1, N)) + '</span>';
        pg.appendChild(head); pg.appendChild(foot);
      });
    }
    function layout() {
      if (dead) return;
      var cp = document.createElement('div'); cp.className = 'crd-page crd-cover'; cp.innerHTML = built.cover; measure.insertBefore(cp, flow);
      var r = paginate(flow, measure, S), pages = [cp].concat(r.pages);
      measure.removeChild(flow); chromeStamp(pages);
      handle.pages = pages; handle.warnings = r.warnings; handle.ready = true;
      if (r.warnings.length && window.console) console.warn('[CampoReportDoc]', r.warnings);
      var N = pages.length; root.querySelector('.crd-count').textContent = S.pages(N); root.querySelector('.crd-cur').textContent = S.pageOf(1, N);
      host = document.createElement('div'); host.className = 'crd crd-print-host'; pages.forEach(function (pg) { host.appendChild(pg.cloneNode(true)); }); document.body.appendChild(host);
      pages.forEach(function (pg, i) {
        var sh = document.createElement('div'); sh.className = 'crd-sheet'; sh.setAttribute('role', 'group'); sh.setAttribute('aria-label', S.pageOf(i + 1, N)); sh.style.transitionDelay = Math.min(i * 70, 560) + 'ms';
        sh.appendChild(pg); stack.appendChild(sh);
      });
      wait.parentNode && wait.parentNode.removeChild(wait);
      setScale();
      timers.push(setTimeout(function () { [].forEach.call(stack.children, function (sh) { sh.classList.add('is-in'); }); }, 30));
      if (window.IntersectionObserver) {
        var best = {}; io = new IntersectionObserver(function (es) {
          es.forEach(function (e) { best[[].indexOf.call(stack.children, e.target)] = e.isIntersecting ? e.intersectionRatio : 0; });
          var k = 0, mx = -1; Object.keys(best).forEach(function (j) { if (best[j] > mx) { mx = best[j]; k = +j; } });
          root.querySelector('.crd-cur').textContent = S.pageOf(k + 1, N);
        }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
        [].forEach.call(stack.children, function (sh) { io.observe(sh); });
      }
    }
    function start() {
      if (dead) return;
      void measure.offsetHeight; /* fuerza el layout para que las tipografías pendientes empiecen a cargar */
      var fonts = document.fonts, p = [];
      if (fonts && fonts.load) { p.push(fonts.load('14.5px "Familjen Grotesk"'), fonts.load('700 24px "Schibsted Grotesk"')); }
      if (fonts && fonts.ready) p.push(fonts.ready);
      if (!p.length || (fonts && fonts.status === 'loaded')) return layout();
      var done = false; function go() { if (!done) { done = true; layout(); } }
      Promise.all(p.map(function (x) { return Promise.resolve(x).catch(function () { }); })).then(go); timers.push(setTimeout(go, 2500));
    }
    if (window.ResizeObserver) { ro = new ResizeObserver(function () { if (!dead) setScale(); }); ro.observe(root); } else { window.addEventListener('resize', setScale); }
    setScale(); start();

    function print() {
      if (dead) return;
      if (!handle.ready) { timers.push(setTimeout(print, 200)); return; }
      window.print();
    }
    function destroy() {
      if (dead) return; dead = true;
      timers.forEach(clearTimeout); if (ro) ro.disconnect(); else window.removeEventListener('resize', setScale); if (io) io.disconnect();
      html.classList.remove('crd-active');
      [host, styleEl, root].forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
      handle.pages = []; handle.ready = false;
    }
    return handle;
  }

  window.CampoReportDoc = { render: render, STR: STR, _build: build };
})();
