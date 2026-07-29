/*!
 * pdf-report.js — construye el documento del reporte PDF (vertical, formal).
 *
 * Devuelve el HTML completo que se escribe en el iframe oculto más el mapa de
 * gráficas a montar. La paginación la hace assets/pdf-paginate.js y las
 * gráficas assets/pdf-charts.js, ambos inyectados DENTRO del iframe.
 *
 * Spec: .claude/skills/portfolio-report-design/references/pdf-document.md
 *   - página fija 794×1123, cuerpo 698×1000
 *   - sin page-break-before y con html2canvas.scale entero (si no, html2pdf
 *     duplica páginas o agrega una en blanco al final)
 *   - nada específico de un portafolio vive aquí: todo entra por `ctx`
 *
 *   const { html, charts, strings } = BPPdfReport.build(ctx);
 */
(function (global) {
  'use strict';

  /* ── i18n ───────────────────────────────────────────────────────────────
     Fase 1 cubre `es`; en/fr se completan en la pasada de i18n (el resto del
     documento ya lee de aquí, no hay strings sueltos en el markup). */
  var STR = {
    es: {
      kind: 'Reporte de portafolio', period: 'Periodo', generated: 'Generado el',
      valueEnd: 'Valor final', resultAmt: 'Resultado del periodo', resultAmtShort: 'Resultado', resultPct: 'Retorno',
      inThisEdition: 'En esta edición', howToRead: 'Cada sección abre con el hallazgo, no con el tema. Las cifras van en dinero antes que en porcentaje. Las secciones finales contienen la actividad del periodo, los supuestos de cálculo y el glosario.',
      continues: 'continúa en la página siguiente', continued: 'continuación',
      sections: {
        I: 'El periodo en una página', II: 'Carta del periodo', III: 'Cronología del periodo',
        IV: 'Rendimiento vs benchmark', V: 'Atribución de resultados', VI: 'Qué movió a tus posiciones',
        VII: 'Dossier por posición', VIII: 'Riesgo y volatilidad', IX: 'Composición y exposición',
        X: 'Actividad del periodo', XI: 'Calidad de datos y metodología', XII: 'Glosario'
      },
      hints: {
        I: 'diagnóstico ejecutivo', III: 'mes a mes', V: 'contribución al retorno, en puntos porcentuales',
        VI: 'con impacto cuantificado', VII: 'las mayores por peso', VIII: 'métricas con interpretación',
        IX: 'al cierre del periodo', XI: 'trazabilidad del reporte', XII: 'definiciones usadas en este reporte'
      },
      capitalBase: 'Capital base', openPnl: 'P/L abierto', realizedPnl: 'P/L realizado',
      dividends: 'Dividendos', commissions: 'Comisiones', flows: 'Aportes', market: 'Mercado', sales: 'Ventas',
      bridgeTitle: 'Puente del dinero · de dónde salió el resultado',
      bridgeCap: 'Del capital base al valor final: mercado (posiciones abiertas), ventas realizadas, dividendos cobrados y comisiones pagadas.',
      performance: 'Rendimiento', riskReturn: 'Riesgo/retorno', diversification: 'Diversificación', vsBench: 'vs Benchmark',
      strong: 'Fuerte', watch: 'Vigilar', risk: 'Riesgo', info: 'Info',
      monthlyTitle: 'Retorno mensual', monthlyCap: 'Retorno del portafolio por mes calendario dentro del rango.',
      month: 'Mes', ret: 'Retorno', result: 'Resultado', best: 'Mejor', worst: 'Peor', activity: 'Actividad', whatHappened: 'Qué pasó',
      equityTitle: 'Retorno acumulado · portafolio vs ', equityCap: 'Retorno compuesto acumulado desde el inicio del rango. Línea punteada = benchmark; banda sombreada = ventana de la caída máxima.',
      portfolio: 'Portafolio', benchmark: 'Benchmark', investedCapital: 'Capital invertido',
      excess: 'Exceso', trackingError: 'Tracking error', beta: 'Beta', sessions: 'sesiones', activeAlpha: 'alpha activo',
      bestSession: 'Mejor sesión', worstSession: 'Peor sesión',
      contribTitle: 'Contribución por posición', contribCap: 'Aporte de cada posición al resultado del periodo, en dinero. La barra final es el resultado total.',
      total: 'Total', winnersLosers: 'Ganadores y perdedores (pp)', reading: 'Lectura', counterfactual: 'Contrafactual',
      ticker: 'Ticker', periodPnl: 'P/L del periodo', contribution: 'Contribución', weight: 'Peso', currency: 'Divisa',
      event: 'Evento', mechanism: 'Mecanismo', impact: 'Impacto', toWatch: 'A vigilar',
      avgCost: 'Costo medio', quantity: 'Cantidad', firstBuy: '1ª compra',
      sharpe: 'Sharpe', sortino: 'Sortino', volatility: 'Volatilidad', var95: 'VaR 95%', maxDD: 'Caída máxima',
      underwaterTitle: 'Bajo el agua · caídas desde máximos', underwaterCap: 'Distancia al máximo previo en cada sesión. El punto anotado es el mínimo del periodo.',
      ddChronicle: 'Crónica de la caída', whatTheyMean: 'Qué significan',
      byPosition: 'Distribución por posición', bySector: 'Por sector', byRegion: 'Por región', byCurrency: 'Por divisa',
      effHoldings: 'holdings efectivos', value: 'Valor',
      closedTrades: 'Operaciones cerradas', txHistory: 'Historial de transacciones',
      buy: 'Compra', sell: 'Venta', cost: 'Costo', proceeds: 'Ingreso', date: 'Fecha', type: 'Tipo', price: 'Precio', net: 'Neto',
      endOfReport: 'Fin del reporte',
      disclaimer: 'Este reporte se genera automáticamente con fines informativos. No constituye asesoría de inversión ni recomendación de compra o venta de valores. Las secciones marcadas como generadas por IA pueden contener errores; verifica las cifras antes de tomar decisiones.',
      aiTag: '★ Análisis IA', aiUnavailable: 'Análisis IA no disponible',
      noSeries: 'No hay suficientes datos de precios históricos para construir la serie en el rango seleccionado.',
      missingPrices: 'posición(es) sin precio de cierre en la fecha; quedan sin valuar.',
      cashNote: 'El saldo en efectivo solo se incluye cuando la fecha final es hoy; en reportes históricos el valor refleja únicamente las posiciones.',
      assumptions: 'Supuestos', assumptionsBody: 'Las conversiones de divisa usan el tipo de cambio vigente a la fecha de generación, no el histórico de cada operación. La divisa de cada posición se resuelve por el sufijo del ticker, que es autoritativo sobre el campo guardado. El saldo en efectivo solo se incluye cuando la fecha final del rango es hoy.',
      folio: 'Folio', priceAsOf: 'Vigencia de precios', rfr: 'Tasa libre de riesgo', betaCurHist: 'Beta actual / histórica',
      aiModel: 'Modelo de IA', notRequested: 'No solicitada', notAvailable: 'No disponible', none: '0',
      glossary: [
        ['Sharpe', 'retorno por unidad de riesgo total: (retorno − tasa libre de riesgo) ÷ volatilidad.'],
        ['Sortino', 'variante del Sharpe que solo penaliza la volatilidad a la baja.'],
        ['Volatilidad', 'desviación estándar anualizada de los retornos diarios.'],
        ['VaR 95%', 'pérdida máxima esperada en el 95% de los días.'],
        ['Beta', 'sensibilidad del portafolio a los movimientos del benchmark.'],
        ['Caída máxima', 'mayor descenso desde un máximo previo dentro del rango.'],
        ['Alpha (exceso)', 'retorno por encima del benchmark en el periodo.'],
        ['Tracking error', 'desviación estándar anualizada de la diferencia contra el benchmark.'],
        ['HHI', 'índice de concentración (suma de pesos²); &gt;0.25 se considera alto.'],
        ['Holdings efectivos', '1 ÷ HHI; posiciones equivalentes igualmente ponderadas.'],
        ['Contribución (pp)', 'aporte de una posición al retorno total, en puntos porcentuales.'],
        ['Puente del dinero', 'descomposición del cambio de valor entre capital base y valor final.']
      ]
    }
  };

  /* ── helpers ────────────────────────────────────────────────────────────── */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function locale(lang) { return lang === 'en' ? 'en-US' : lang === 'fr' ? 'fr-FR' : 'es-MX'; }

  /* ── render: iframe → gráficas → paginación → PDF ────────────────────────
     Vive aquí (y no en main.js) para que exista UNA sola implementación: la
     que se verifica es la que corre en producción. Devuelve el blob del PDF.  */
  function injectScript(doc, src) {
    return new Promise(function (resolve, reject) {
      var s = doc.createElement('script');
      // Absoluta: el documento del iframe es about:blank y una ruta relativa no
      // resuelve de forma fiable contra el documento padre.
      s.src = new URL(src, document.baseURI).href;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('No se pudo cargar ' + src)); };
      doc.head.appendChild(s);
    });
  }

  async function renderToPdf(o) {
    var built = o.built, host = o.host || document;
    var iframe = host.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;visibility:hidden';
    host.body.appendChild(iframe);
    try {
      var idoc = iframe.contentDocument, iwin = iframe.contentWindow;
      idoc.open(); idoc.write(built.html); idoc.close();

      await injectScript(idoc, (o.assets || 'assets/') + 'pdf-charts.js?v=1');
      await injectScript(idoc, (o.assets || 'assets/') + 'pdf-paginate.js?v=1');

      // 1. Las gráficas deben existir en el DOM antes de medir la paginación.
      iwin.BPPdfCharts.configure({ locale: o.locale || 'es-MX', currency: o.currency || 'USD' });
      built.charts.forEach(function (c) {
        var node = idoc.getElementById(c.id);
        if (node) iwin.BPPdfCharts.mount(node, c.type, c.data, c.opts);
      });

      // 2. Fuentes e imágenes listas → paginar → sellar encabezado/pie.
      await iwin.BPPdfPaginate.ready(idoc);
      var paged = iwin.BPPdfPaginate.run({
        flow: idoc.getElementById('flow'),
        mount: idoc.getElementById('doc'),
        strings: built.strings,
        chrome: function (page, n, total, section) {
          if (page.classList.contains('bleed')) return;
          var h = idoc.createElement('div');
          h.className = 'page-head';
          h.innerHTML = '<span>' + esc(built.meta.name) + ' · ' + esc(built.meta.periodLabel) +
                        '</span><span>' + esc(section) + '</span>';
          var f = idoc.createElement('div');
          f.className = 'page-foot';
          f.innerHTML = '<span>BlackPortfolio · ' + esc(built.meta.folio) + '</span><span><b>' + n + '</b> / ' + total + '</span>';
          page.appendChild(h); page.appendChild(f);
        }
      });
      if (paged.warnings.length) console.warn('[Reporte PDF] Avisos de paginación:', paged.warnings);

      // 3. Export. La geometría fija ya pagina 1:1 — por eso el CSS no lleva
      //    reglas de salto y el scale es ENTERO: con reglas de salto html2pdf
      //    mete una hoja en blanco por página, y con scale fraccionario agrega
      //    una página casi vacía al final.
      await injectScript(idoc, 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.2/dist/html2pdf.bundle.min.js');
      var worker = iwin.html2pdf().set({
        margin: 0,
        image: { type: 'jpeg', quality: o.quality || 0.95 },
        html2canvas: { scale: o.scale || 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
        jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait', hotfixes: ['px_scaling'] },
        pagebreak: { mode: [] }
      }).from(idoc.getElementById('doc')).toPdf();
      var pdf = await worker.get('pdf');
      return {
        blob: pdf.output('blob'),
        pages: paged.pages.length,
        pdfPages: pdf.internal.getNumberOfPages(),
        warnings: paged.warnings
      };
    } finally {
      iframe.remove();
    }
  }

  global.BPPdfReport = {
    renderToPdf: renderToPdf,
    /**
     * ctx = { data, portfolio, ai:{sections,model,error}, lang, tone,
     *         fmt:{money(v)}, helpers:{ posCurrency(pos), sector(t), geo(t) }, rfr:{rate,label} }
     */
    build: function (ctx) {
      var d = ctx.data, pf = ctx.portfolio, ai = ctx.ai || {};
      var lang = STR[ctx.lang] ? ctx.lang : 'es';
      var T = STR[lang], LOC = locale(lang);
      var cur = d.currency;
      var money = ctx.fmt.money;
      var charts = [], blocks = [];

      /* — formateadores — */
      function pct(v, dg) { return v == null || !isFinite(v) ? '—' : (v > 0 ? '+' : '') + v.toFixed(dg == null ? 2 : dg) + '%'; }
      function pp(v) { return v == null || !isFinite(v) ? '—' : (v > 0 ? '+' : '') + v.toFixed(2) + ' pp'; }
      function amt(v) { return v == null || !isFinite(v) ? '—' : (v >= 0 ? '+' : '−') + money(Math.abs(v), cur); }
      function sign(v) { return v == null ? '' : v >= 0 ? 'up' : 'down'; }
      function dateFull(iso) {
        if (!iso) return '—';
        try { return new Date(iso + 'T00:00:00').toLocaleDateString(LOC, { year: 'numeric', month: 'short', day: 'numeric' }); }
        catch (e) { return iso; }
      }
      function monthName(ym) {
        try { return new Date(ym + '-02T00:00:00').toLocaleDateString(LOC, { month: 'short' }); }
        catch (e) { return ym; }
      }
      function chart(type, data, opts) {
        var id = 'c' + charts.length;
        charts.push({ id: id, type: type, data: data, opts: opts || {} });
        return '<div id="' + id + '"></div>';
      }
      function blk(html, attrs) {
        var a = '';
        for (var k in (attrs || {})) if (attrs[k] != null) a += ' ' + k + '="' + esc(attrs[k]) + '"';
        blocks.push('<div' + a + '>' + html + '</div>');
      }
      function secHead(num, title, hint, acc) {
        blk('<div class="sec-head"><span class="num">' + num + '</span><h2>' + esc(title) + '</h2>' +
            (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') + '</div>',
            { 'data-keep-with-next': '', 'data-min-space': '170', 'data-acc': acc,
              'data-section': num + ' · ' + title });
      }
      function kpi(label, value, sub, cls) {
        return '<div class="kpi"><span>' + esc(label) + '</span><strong' + (cls ? ' class="' + cls + '"' : '') + '>' +
               value + '</strong>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
      }
      function metric(l, v, e, cls) {
        return '<div class="metric"><span>' + esc(l) + '</span><strong' + (cls ? ' class="' + cls + '"' : '') + '>' + v +
               '</strong>' + (e ? '<em>' + e + '</em>' : '') + '</div>';
      }
      function aiNote(key) {
        return ai.sections && ai.sections[key]
          ? '<div class="callout"><b>' + T.aiTag + '</b><br>' + ai.sections[key] + '</div>' : '';
      }

      /* — cifras base — */
      var valueEnd = d.totalValueEnd, base = d.periodCapitalBase || d.totalCostEnd;
      var resultAmt = d.periodResultAmt != null ? d.periodResultAmt : (d.totalValueEnd - d.totalCostEnd);
      var resultPct = d.periodResultPct != null ? d.periodResultPct
        : (d.totalCostEnd > 0 ? resultAmt / d.totalCostEnd * 100 : null);
      var m = d.metrics || {};
      var periodLabel = dateFull(d.startStr) + ' – ' + dateFull(d.endStr);
      var folio = 'BP-' + String(pf.id || 'PF').slice(-5).toUpperCase() + '-' + String(d.endStr || '').replace(/-/g, '');
      var positions = d.posData || [];
      var nPos = positions.length;

      /* concentración */
      var weights = positions.filter(function (p) { return p.currentValuePf > 0; })
        .map(function (p) { return { ticker: p.pos.ticker, w: p.currentValuePf / valueEnd }; })
        .sort(function (a, b) { return b.w - a.w; });
      var hhi = weights.reduce(function (s, x) { return s + x.w * x.w; }, 0);
      var effN = hhi > 0 ? 1 / hhi : 0;
      var top3 = weights.slice(0, 3).reduce(function (s, x) { return s + x.w; }, 0) * 100;
      var maxW = weights.length ? weights[0].w * 100 : 0;
      var concLabel = hhi > 0.25 ? 'alta' : hhi > 0.15 ? 'moderada' : 'baja';
      var wByTicker = {};
      weights.forEach(function (x) { wByTicker[x.ticker] = x.w * 100; });

      /* benchmark */
      var eq = d.equityCurve || [], bm = d.benchCurve || [];
      var hasSeries = eq.length > 1;
      var hasBench = bm.length > 1 && bm.some(function (p) { return p.value !== 0; });
      var portRet = hasSeries ? eq[eq.length - 1].value : null;
      var benchRet = hasBench ? bm[bm.length - 1].value : null;
      var active = hasBench && portRet != null ? portRet - benchRet : null;
      var trackingError = null;
      if (hasBench && d.benchDaily && d.benchDaily.length > 1) {
        var dp = d.dailyReturns, db = d.benchDaily, n = Math.min(dp.length, db.length), diff = [];
        for (var i = 0; i < n; i++) diff.push(dp[i] - db[i]);
        var mu = diff.reduce(function (s, r) { return s + r; }, 0) / n;
        var vr = diff.reduce(function (s, r) { return s + Math.pow(r - mu, 2); }, 0) / Math.max(1, n - 1);
        trackingError = Math.sqrt(vr) * Math.sqrt(252) * 100;
      }

      /* buckets sector/región */
      function bucket(fn) {
        var b = {};
        positions.forEach(function (p) {
          if (p.currentValuePf > 0) { var k = fn(p.pos.ticker); b[k] = (b[k] || 0) + p.currentValuePf; }
        });
        if ((pf.cashBalance || 0) > 0 && d.isEndToday) b['Cash'] = (b['Cash'] || 0) + pf.cashBalance;
        return Object.keys(b).map(function (k) { return { label: k, value: valueEnd > 0 ? b[k] / valueEnd * 100 : 0 }; })
          .sort(function (a, b2) { return b2.value - a.value; });
      }
      var sectorRows = bucket(ctx.helpers.sector), geoRows = bucket(ctx.helpers.geo);

      /* ════════ PORTADA ════════ */
      var toc = [];
      ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'].forEach(function (r) {
        toc.push('<li><b><i>' + r + '</i>' + esc(T.sections[r]) + '</b></li>');
      });
      blk(
        '<div class="cover-art"></div>' +
        '<div class="cover-card">' +
          '<div class="eyebrow">' + esc(T.kind) + (d.benchmarkLabel ? ' · ' + esc(d.benchmarkLabel) : '') + '</div>' +
          '<div class="cover-title">' + esc(pf.name) + '</div>' +
          '<div class="cover-sub">' + esc(periodLabel) + ' · ' + esc(cur) + ' · ' + d.sessions + ' ' + T.sessions + '</div>' +
          '<div class="cover-figs">' +
            '<div><span>' + T.valueEnd + '</span><strong>' + money(valueEnd, cur) + '</strong></div>' +
            '<div><span>' + T.resultAmt + '</span><strong class="' + sign(resultAmt) + '">' + amt(resultAmt) + '</strong></div>' +
            '<div><span>' + T.resultPct + '</span><strong class="' + sign(resultPct) + '">' + pct(resultPct) + '</strong></div>' +
          '</div>' +
        '</div>' +
        '<div class="cover-index"><div class="k">' + T.inThisEdition + '</div><ol>' + toc.join('') + '</ol>' +
        '<div class="cover-read">' + esc(T.howToRead) + '</div></div>' +
        '<div class="cover-foot"><span>BlackPortfolio</span><span>' + folio + ' · ' + T.generated + ' ' +
        esc(dateFull(d.todayStr || d.endStr)) + '</span></div>',
        { 'data-page': 'bleed' });

      /* ════════ I · EL PERIODO EN UNA PÁGINA ════════ */
      secHead('I', T.sections.I, T.hints.I, '1');

      var verdict = weights.length && top3 > 50
        ? 'El periodo lo definió <em>la concentración</em>: las tres mayores posiciones pesan ' + top3.toFixed(1) + '% del portafolio.'
        : (resultAmt >= 0
            ? 'El portafolio cerró el periodo en positivo con <em>' + amt(resultAmt) + '</em> sobre ' + money(base, cur) + ' de capital base.'
            : 'El periodo cerró en negativo: <em>' + amt(resultAmt) + '</em> sobre ' + money(base, cur) + ' de capital base.');
      var lede = 'El portafolio cerró en <strong>' + money(valueEnd, cur) + '</strong> tras un resultado de <strong>' +
        amt(resultAmt) + ' (' + pct(resultPct) + ')</strong> sobre un capital base de ' + money(base, cur) +
        (active != null ? ', ' + (active >= 0 ? 'superando' : 'quedando por debajo de') + ' ' + esc(d.benchmarkLabel) +
         ' por ' + Math.abs(active).toFixed(2) + ' puntos porcentuales' : '') + ' en ' + d.sessions + ' ' + T.sessions + '.';
      blk('<div class="verdict">' + verdict + '</div><div class="lede">' + lede + '</div>',
          { 'data-acc': '1', 'data-keep-with-next': '' });

      var sharpeN = m.sharpe;
      var diag = [
        { label: T.performance, value: amt(resultAmt), status: resultAmt >= 0 ? 'good' : 'bad',
          note: pct(resultPct) + ' sobre ' + money(base, cur) },
        { label: T.riskReturn, value: 'Sharpe ' + (sharpeN != null ? sharpeN.toFixed(2) : '—'),
          status: sharpeN == null ? 'neutral' : sharpeN > 1 ? 'good' : sharpeN > 0 ? 'warn' : 'bad',
          note: (m.sortino != null ? 'Sortino ' + m.sortino.toFixed(2) + ' · ' : '') +
                (m.volatility != null ? 'vol ' + m.volatility.toFixed(1) + '%' : '') },
        { label: T.diversification, value: concLabel, status: concLabel === 'baja' ? 'good' : concLabel === 'moderada' ? 'warn' : 'bad',
          note: 'top 3 = ' + top3.toFixed(1) + '% · ' + effN.toFixed(1) + ' ' + T.effHoldings }
      ];
      if (active != null) diag.push({ label: T.vsBench, value: pp(active), status: active >= 0 ? 'good' : 'warn',
        note: esc(d.benchmarkLabel) + ' ' + pct(benchRet) });
      blk('<div class="diag-row' + (diag.length === 3 ? ' d3' : '') + '">' + diag.map(function (x) {
        return '<div class="diag ' + x.status + '"><span>' + esc(x.label) + '</span><strong>' + x.value +
               '</strong><small>' + x.note + '</small></div>';
      }).join('') + '</div>', { 'data-acc': '1' });

      /* puente del dinero */
      var bridge = [{ label: T.capitalBase, value: base, type: 'start' }];
      if (d.openPeriodPnl) bridge.push({ label: T.market, value: d.openPeriodPnl });
      if (d.totalRealizedPnl) bridge.push({ label: T.sales, value: d.totalRealizedPnl });
      if (d.totalDividends) bridge.push({ label: T.dividends, value: d.totalDividends });
      if (d.totalComm) bridge.push({ label: T.commissions, value: -Math.abs(d.totalComm) });
      bridge.push({ label: T.valueEnd, value: valueEnd, type: 'end' });
      if (bridge.length > 2) {
        blk('<div class="chart-box"><div class="chart-h">' + T.bridgeTitle + '</div>' +
            chart('waterfall', { items: bridge, format: 'money' }, { width: 676, height: 216 }) +
            '<div class="cap">' + T.bridgeCap + '</div></div>', { 'data-acc': '1' });
      }

      var kpis = [
        kpi(T.capitalBase, money(base, cur)),
        kpi(T.valueEnd, money(valueEnd, cur)),
        kpi(T.resultAmtShort, amt(resultAmt), null, sign(resultAmt)),
        kpi(T.resultPct, pct(resultPct), null, sign(resultPct)),
        kpi(T.openPnl, amt(d.openPeriodPnl), null, sign(d.openPeriodPnl))
      ];
      if (d.closedTradesInWindow && d.closedTradesInWindow.length) kpis.push(kpi(T.realizedPnl, amt(d.totalRealizedPnl), null, sign(d.totalRealizedPnl)));
      blk('<div class="kpi-row k' + kpis.length + '">' + kpis.join('') + '</div>', { 'data-acc': '1' });

      if (d.missingPrices && d.missingPrices.length) {
        blk('<div class="alerts">' + d.missingPrices.length + ' ' + T.missingPrices + ' (' +
            esc(d.missingPrices.slice(0, 8).join(', ')) + (d.missingPrices.length > 8 ? '…' : '') + ')</div>', { 'data-acc': '1' });
      }
      if (!d.isEndToday) blk('<div class="callout">' + T.cashNote + '</div>', { 'data-acc': '1' });

      /* ════════ II · CARTA DEL PERIODO ════════ */
      secHead('II', T.sections.II, null, '2');

      var upTop = (d.movers && d.movers.up) || [], downTop = (d.movers && d.movers.down) || [];
      var paras = [];
      paras.push('<p class="body"><span class="dc">' + (lang === 'es' ? 'E' : 'T') + '</span>' +
        (lang === 'es' ? 'l periodo' : 'he period') + ' cerró con un resultado de <strong>' + amt(resultAmt) +
        '</strong> sobre un capital base de ' + money(base, cur) + ', equivalente a <strong>' + pct(resultPct) +
        '</strong>. El valor de la cartera terminó en ' + money(valueEnd, cur) + ' con ' + nPos +
        ' posiciones activas en ' + esc(cur) + '.</p>');
      if (upTop.length) {
        var sumUp = upTop.reduce(function (s, x) { return s + x.pp; }, 0);
        paras.push('<p class="body">El resultado se concentró en ' + upTop.map(function (x) {
          return '<strong>' + esc(x.ticker) + '</strong> (' + amt(x.pnl) + ', ' + pp(x.pp) + ')';
        }).join(', ') + ': entre ' + (upTop.length === 1 ? 'esa posición aportó' : 'esas ' + upTop.length + ' posiciones aportaron') +
        ' ' + sumUp.toFixed(2) + ' de los ' + (resultPct != null ? resultPct.toFixed(2) : '—') + ' puntos del periodo.</p>');
      }
      if (downTop.length) {
        paras.push('<p class="body">En sentido contrario, ' + downTop.map(function (x) {
          return '<strong>' + esc(x.ticker) + '</strong> restó ' + money(Math.abs(x.pnl), cur) + ' (' + pp(x.pp) + ')';
        }).join(' y ') + '. Sin ' + esc(downTop[0].ticker) + ' el periodo habría cerrado en ' +
        pct(resultPct != null ? resultPct - downTop[0].pp : null) + ' en lugar de ' + pct(resultPct) + '.</p>');
      }
      var riskPara = 'El resultado no fue gratis: la volatilidad anualizada fue de ' +
        (m.volatility != null ? '<strong>' + m.volatility.toFixed(1) + '%</strong>' : '—') +
        (trackingError != null ? ' con un error de seguimiento de ' + trackingError.toFixed(1) + '%' : '') + '.';
      if (d.drawdown) {
        riskPara += ' Entre el ' + dateFull(d.drawdown.peakIso) + ' y el ' + dateFull(d.drawdown.troughIso) +
          ' la cartera cayó ' + Math.abs(d.drawdown.depthPct).toFixed(2) + '% (' + money(d.drawdown.depthAmt, cur) + '), ' +
          (d.drawdown.recovered ? 'recuperando el máximo el ' + dateFull(d.drawdown.recoveredIso) + '.'
                                : 'y cerró el periodo sin recuperar el máximo previo.');
      }
      if (m.sharpe != null) {
        riskPara += ' El Sharpe de ' + m.sharpe.toFixed(2) + ' indica que ' +
          (m.sharpe > 1 ? 'ese riesgo sí se pagó.' : m.sharpe > 0 ? 'el retorno ajustado al riesgo fue modesto.' : 'el retorno no compensó el riesgo asumido.');
      }
      paras.push('<p class="body">' + riskPara + '</p>');

      var notes = [];
      if (active != null) notes.push('<div class="sidenote"><b>' + pp(active) + '</b>' +
        (active >= 0 ? 'por encima de ' : 'por debajo de ') + esc(d.benchmarkLabel) + ' en ' + d.sessions + ' ' + T.sessions + '</div>');
      if (d.drawdown) notes.push('<div class="sidenote"><b>' + money(d.drawdown.depthAmt, cur) + '</b>caída máxima del periodo' +
        (d.drawdown.recovered ? ', recuperada el ' + dateFull(d.drawdown.recoveredIso) : ', sin recuperar') + '</div>');
      if (d.totalDividends) notes.push('<div class="sidenote"><b>' + money(d.totalDividends, cur) + '</b>' +
        d.dividends.length + ' pagos de dividendos cobrados</div>');
      if (maxW) notes.push('<div class="sidenote"><b>' + maxW.toFixed(1) + '%</b>peso de la mayor posición (' +
        esc(weights[0].ticker) + ')</div>');

      blk('<div class="prose-rail"><div>' + paras.join('') + '</div><div>' + notes.join('') + '</div></div>', { 'data-acc': '2' });
      if (ai.sections && (ai.sections.tesis || ai.sections.general)) {
        blk('<div class="callout"><b>' + T.aiTag + '</b><br>' + (ai.sections.tesis || ai.sections.general) + '</div>', { 'data-acc': '2' });
      } else if (ai.error) {
        blk('<div class="alerts">' + T.aiUnavailable + ': ' + esc(ai.error) + '</div>', { 'data-acc': '2' });
      }

      /* ════════ III · CRONOLOGÍA ════════ */
      var months = d.monthlyReturns || [];
      if (months.length >= 2) {
        secHead('III', T.sections.III, T.hints.III, '3');
        blk('<div class="chart-box"><div class="chart-h">' + T.monthlyTitle + '</div>' +
            chart('monthly', { items: months.map(function (x) { return { label: monthName(x.ym), value: x.value }; }) },
                  { width: 676, height: 132 }) +
            '<div class="cap">' + T.monthlyCap + '</div></div>', { 'data-acc': '3' });

        var txByMonth = {};
        (d.txInWindow || []).forEach(function (tx) {
          var ym = String(tx.date).slice(0, 7);
          txByMonth[ym] = txByMonth[ym] || { COMPRA: 0, VENTA: 0, DIVIDENDO: 0 };
          if (txByMonth[ym][tx.type] != null) txByMonth[ym][tx.type]++;
        });
        var avg = months.reduce(function (s, x) { return s + x.value; }, 0) / months.length;
        var mMax = Math.max.apply(null, months.map(function (x) { return x.value; }));
        var mMin = Math.min.apply(null, months.map(function (x) { return x.value; }));
        var rows = months.map(function (x) {
          var act = txByMonth[x.ym] || {};
          var actTxt = [act.COMPRA ? act.COMPRA + ' ' + T.buy.toLowerCase() + (act.COMPRA > 1 ? 's' : '') : '',
                        act.VENTA ? act.VENTA + ' ' + T.sell.toLowerCase() + (act.VENTA > 1 ? 's' : '') : '',
                        act.DIVIDENDO ? act.DIVIDENDO + ' div.' : ''].filter(Boolean).join(' · ') || '—';
          // Varía el encabezado por posición del mes en el periodo, y solo nombra
          // al motor cuando su movimiento es material (≥1%): si no, la columna
          // repite la misma frase mes tras mes y deja de informar.
          var story = x.value === mMax ? 'Mejor mes del periodo'
            : x.value === mMin ? 'Peor mes del periodo'
            : x.value >= 0 ? (x.value > avg ? 'Avance por encima del promedio del periodo' : 'Avance moderado')
            : 'Mes en negativo';
          if (x.best && Math.abs(x.best.pct) >= 1) story += ', impulsado por ' + esc(x.best.ticker) + ' (' + pct(x.best.pct, 1) + ')';
          if (x.worst && x.worst.pct <= -1 && x.worst.ticker !== (x.best && x.best.ticker)) {
            story += (Math.abs(x.best && x.best.pct || 0) >= 1 ? ' y frenado por ' : ', frenado por ') +
              esc(x.worst.ticker) + ' (' + pct(x.worst.pct, 1) + ')';
          }
          return '<tr><td><strong>' + monthName(x.ym) + '</strong></td><td class="n ' + sign(x.value) + '">' + pct(x.value, 1) +
            '</td><td>' + (x.best ? esc(x.best.ticker) + ' <span class="up">' + pct(x.best.pct, 1) + '</span>' : '—') +
            '</td><td>' + (x.worst ? esc(x.worst.ticker) + ' <span class="' + sign(x.worst.pct) + '">' + pct(x.worst.pct, 1) + '</span>' : '—') +
            '</td><td>' + actTxt + '</td><td style="width:250px">' + story + '.</td></tr>';
        }).join('');
        blk('<div class="tbl"><table><thead><tr><th>' + T.month + '</th><th class="n">' + T.ret + '</th><th>' + T.best +
            '</th><th>' + T.worst + '</th><th>' + T.activity + '</th><th>' + T.whatHappened +
            '</th></tr></thead><tbody>' + rows + '</tbody></table></div>',
            { 'data-flow': 'table', 'data-acc': '3' });
      }

      /* ════════ IV · RENDIMIENTO VS BENCHMARK ════════ */
      secHead('IV', T.sections.IV, d.sessions + ' ' + T.sessions + ' · ' + periodLabel, '4');
      if (hasSeries) {
        var eqData = {
          series: eq.map(function (p) { return { t: p.iso, value: p.value }; }),
          bench: hasBench ? bm.map(function (p) { return { t: p.iso, value: p.value }; }) : [],
          format: 'pct', seriesLabel: T.portfolio, benchLabel: d.benchmarkLabel || T.benchmark
        };
        if (d.drawdown) {
          eqData.ddFrom = d.drawdown.peakIdx; eqData.ddTo = d.drawdown.troughIdx;
          eqData.ddLabel = T.maxDD + ' ' + pct(d.drawdown.depthPct);
        }
        blk('<div class="chart-box"><div class="chart-h">' + T.equityTitle + esc(d.benchmarkLabel || '') + '</div>' +
            chart('equity', eqData, { width: 676, height: 236 }) +
            '<div class="cap">' + T.equityCap + '</div></div>', { 'data-acc': '4' });

        var strip = [metric(T.portfolio, pct(portRet), d.sessions + ' ' + T.sessions, sign(portRet))];
        if (hasBench) {
          strip.push(metric(T.benchmark, pct(benchRet), esc(d.benchmarkLabel)));
          strip.push(metric(T.excess, pp(active), T.activeAlpha, sign(active)));
        }
        if (trackingError != null) strip.push(metric(T.trackingError, trackingError.toFixed(2) + '%', 'anualizado'));
        if (m.beta != null) strip.push(metric(T.beta, m.beta.toFixed(2), T.vsBench.toLowerCase()));
        blk('<div class="metric-strip m' + strip.length + '">' + strip.join('') + '</div>', { 'data-acc': '4' });

        var perf = [];
        if (d.bestSession && d.worstSession) {
          perf.push('<p class="body">La mejor sesión del periodo fue el ' + dateFull(d.bestSession.iso) + ' (' +
            pct(d.bestSession.pct) + ') y la peor el ' + dateFull(d.worstSession.iso) + ' (' + pct(d.worstSession.pct) + ').</p>');
        }
        if (active != null) {
          perf.push('<p class="body">El portafolio ' + (active >= 0 ? 'superó' : 'quedó por debajo de') + ' al índice en ' +
            Math.abs(active).toFixed(2) + ' puntos porcentuales' +
            (trackingError != null ? ', con un error de seguimiento de ' + trackingError.toFixed(2) + '%: la diferencia ' +
             (trackingError > 5 ? 'vino de apuestas activas concretas, no de replicar al mercado' : 'se mantuvo cerca del índice') : '') +
            (m.beta != null ? '. La beta de ' + m.beta.toFixed(2) + ' indica que se asumió ' +
             (m.beta > 1 ? Math.round((m.beta - 1) * 100) + '% más' : Math.round((1 - m.beta) * 100) + '% menos') +
             ' de riesgo sistemático que el índice' : '') + '.</p>');
        }
        if (perf.length) blk(perf.join(''), { 'data-acc': '4' });
        if (aiNote('benchmark')) blk(aiNote('benchmark'), { 'data-acc': '4' });
      } else {
        blk('<div class="callout">' + T.noSeries + '</div>', { 'data-acc': '4' });
      }

      /* ════════ V · ATRIBUCIÓN ════════ */
      var attrib = d.attribution || [];
      if (attrib.length) {
        secHead('V', T.sections.V, T.hints.V, '5');
        var wf = attrib.map(function (a) { return { label: a.ticker, value: a.pnl }; });
        wf.push({ label: T.total, value: resultAmt, type: 'end' });
        blk('<div class="chart-box"><div class="chart-h">' + T.contribTitle + '</div>' +
            chart('waterfall', { items: wf, format: 'money' }, { width: 676, height: 214 }) +
            '<div class="cap">' + T.contribCap + '</div></div>', { 'data-acc': '5' });

        var top3pp = attrib.slice(0, 3).reduce(function (s, a) { return s + a.pp; }, 0);
        blk('<div class="g2"><div class="chart-box"><div class="chart-h">' + T.winnersLosers + '</div>' +
            chart('diverging', { items: attrib.map(function (a) { return { label: a.ticker, value: a.pp }; }), format: 'pp' },
                  { width: 307 }) + '</div>' +
            '<div><h3 class="h3">' + T.reading + '</h3><p class="body" style="font-size:10.5px">' +
            'Las tres mayores contribuciones aportaron ' + top3pp.toFixed(2) + ' pp' +
            (resultPct != null ? ' de los ' + resultPct.toFixed(2) + ' pp del periodo' : '') + '. ' +
            (downTop.length ? 'El principal detractor fue ' + esc(downTop[0].ticker) + ' con ' + pp(downTop[0].pp) + '.'
                            : 'Ninguna posición restó más de 0.5 pp.') + '</p>' +
            (resultPct != null ? '<div class="callout" style="font-size:10px"><b>' + T.counterfactual + ':</b> excluyendo ' +
             'las tres mayores contribuciones, el periodo habría cerrado en <b>' + pct(resultPct - top3pp) + '</b> ' +
             'en lugar de ' + pct(resultPct) + '.</div>' : '') +
            '</div></div>', { 'data-acc': '5' });
        if (aiNote('atribucion')) blk(aiNote('atribucion'), { 'data-acc': '5' });

        blk('<div class="tbl"><table><thead><tr><th>' + T.ticker + '</th><th class="n">' + T.periodPnl + '</th>' +
            '<th class="n">' + T.contribution + '</th><th class="n">' + T.weight + '</th><th>' + T.currency +
            '</th></tr></thead><tbody>' + attrib.map(function (a) {
              var w = wByTicker[a.ticker];
              return '<tr><td><strong>' + esc(a.ticker) + '</strong></td><td class="n ' + sign(a.pnl) + '">' + amt(a.pnl) +
                '</td><td class="n ' + sign(a.pp) + '">' + pp(a.pp) + '</td><td class="n">' +
                (w != null ? w.toFixed(1) + '%' : '—') + '</td><td>' + esc(curOf(a.ticker)) + '</td></tr>';
            }).join('') + '</tbody></table></div>', { 'data-flow': 'table', 'data-acc': '5' });
      }
      function curOf(ticker) {
        var p = positions.filter(function (x) { return x.pos.ticker === ticker; })[0];
        return p ? ctx.helpers.posCurrency(p.pos) : cur;
      }

      /* ════════ VI · QUÉ MOVIÓ A TUS POSICIONES ════════ */
      var moverList = upTop.concat(downTop);
      if (moverList.length) {
        secHead('VI', T.sections.VI, T.hints.VI, '1');
        moverList.forEach(function (mv) {
          var p = positions.filter(function (x) { return x.pos.ticker === mv.ticker; })[0];
          var w = wByTicker[mv.ticker];
          var mech = mv.pp >= 0
            ? 'El precio avanzó ' + (p && p.pnlPct != null ? pct(p.pnlPct) : '') + ' desde el costo medio; con ' +
              (w != null ? w.toFixed(1) + '%' : '—') + ' del portafolio, ese movimiento se transmitió al resultado en la proporción de su peso.'
            : 'La caída del precio se transmitió al resultado en la proporción de su peso (' +
              (w != null ? w.toFixed(1) + '%' : '—') + ' del portafolio).';
          var watch = [];
          if (w != null && w > 20) watch.push('Su peso de ' + w.toFixed(1) + '% supera el umbral de concentración de 20%: una corrección de 20% en el papel restaría ~' + (w * 0.2).toFixed(1) + ' pp al portafolio.');
          if (w != null && w <= 20 && Math.abs(mv.pp) > 1) watch.push((mv.pp >= 0 ? 'Aporta ' : 'Resta ') + Math.abs(mv.pp).toFixed(2) +
            ' pp con ' + w.toFixed(1) + '% del peso: su comportamiento pesa más que su tamaño.');
          if (!watch.length) watch.push('Sin alertas de concentración: su contribución es proporcional a su peso.');
          blk('<div class="mover">' +
              '<div><div class="t">' + esc(mv.ticker) + '</div><div class="figs">' + amt(mv.pnl) + ' · ' + pp(mv.pp) +
              (w != null ? '<br>peso ' + w.toFixed(1) + '%' : '') + '</div>' +
              (p && p.series && p.series.length > 1 ? chart('sparkline', { values: p.series }, { width: 138, height: 34 }) : '') +
              '</div><ul>' +
              '<li><b>' + T.impact + '</b>' + (mv.pp >= 0 ? 'Aportó ' : 'Restó ') + money(Math.abs(mv.pnl), cur) +
              ' al resultado del periodo: ' + Math.abs(mv.pp).toFixed(2) + ' pp' +
              (resultPct ? ' de los ' + Math.abs(resultPct).toFixed(2) + ' pp totales' : '') + '.</li>' +
              '<li><b>' + T.mechanism + '</b>' + mech + '</li>' +
              '<li><b>' + T.toWatch + '</b>' + watch[0] + '</li>' +
              '</ul></div>', { 'data-acc': '1', 'data-min-space': '150' });
        });
        blk('<div class="footnote">Las explicaciones de esta sección se derivan de las cifras del propio portafolio ' +
            '(precio, peso y contribución). No incluyen atribución a eventos de mercado.</div>', { 'data-acc': '1' });
      }

      /* ════════ VII · DOSSIER POR POSICIÓN ════════ */
      var dossier = positions
        .filter(function (p) { return p.currentValuePf != null; })
        .sort(function (a, b) { return (b.currentValuePf || 0) - (a.currentValuePf || 0); })
        .filter(function (p) {
          var w = wByTicker[p.pos.ticker] || 0;
          return w >= 2 || Math.abs(p.contributionPp || 0) >= 0.5;
        })
        .slice(0, 8);
      if (dossier.length) {
        secHead('VII', T.sections.VII, dossier.length + ' de ' + nPos + ' · ' + T.hints.VII, '2');
        blk(dossier.map(function (p) {
          var w = wByTicker[p.pos.ticker];
          var cp = p.contributionPp;
          var note = 'Representa ' + (w != null ? w.toFixed(1) + '%' : '—') + ' del portafolio y ' +
            (cp == null ? 'no tiene contribución calculable'
                        : (cp >= 0 ? 'aportó ' : 'restó ') + Math.abs(cp).toFixed(2) + ' pp') +
            ' al resultado del periodo.';
          if (w != null && w > 20) note += ' Su peso rebasa el umbral de concentración de 20%.';
          else if (p.contributionPp != null && p.contributionPp < -0.5) note += ' Es uno de los detractores materiales del periodo.';
          else note += ' Su aporte es proporcional a su tamaño en la cartera.';
          if (ctx.helpers.posCurrency(p.pos) !== cur) note += ' Cotiza en ' + esc(ctx.helpers.posCurrency(p.pos)) +
            ': su aporte en ' + esc(cur) + ' depende del tipo de cambio a la fecha de valuación.';
          return '<div class="dossier"><div class="dossier-spark">' +
            (p.series && p.series.length > 1 ? chart('sparkline', { values: p.series }, { width: 96, height: 40 }) : '') +
            '</div><div><div class="hd"><b>' + esc(p.pos.ticker) + '</b><span>' + esc(ctx.helpers.posCurrency(p.pos)) +
            ' · ' + esc(ctx.helpers.sector(p.pos.ticker)) + '</span></div>' +
            '<div class="grid">' +
              '<div>' + T.weight + '<strong>' + (w != null ? w.toFixed(1) + '%' : '—') + '</strong></div>' +
              '<div>' + T.avgCost + '<strong>' + money(p.pos.avgPrice || 0, ctx.helpers.posCurrency(p.pos)) + '</strong></div>' +
              '<div>' + T.periodPnl + '<strong class="' + sign(p.periodPnl) + '">' + amt(p.periodPnl) + '</strong></div>' +
              '<div>' + T.contribution + '<strong class="' + sign(p.contributionPp) + '">' + pp(p.contributionPp) + '</strong></div>' +
            '</div><p>' + note + '</p></div></div>';
        }).join(''), { 'data-flow': 'split', 'data-acc': '2' });
      }

      /* ════════ VIII · RIESGO ════════ */
      secHead('VIII', T.sections.VIII, T.hints.VIII, '3');
      var rm = [];
      if (m.sharpe != null) rm.push(metric(T.sharpe, m.sharpe.toFixed(2), m.sharpe > 1 ? 'sólido' : m.sharpe > 0 ? 'modesto' : 'insuficiente', m.sharpe > 0 ? 'up' : 'down'));
      if (m.sortino != null && (m.sharpe == null || Math.abs(m.sortino - m.sharpe) >= 0.3)) rm.push(metric(T.sortino, m.sortino.toFixed(2), 'asimetría'));
      if (m.volatility != null) rm.push(metric(T.volatility, m.volatility.toFixed(1) + '%', m.volatility > 25 ? 'alta' : m.volatility > 15 ? 'moderada' : 'contenida'));
      if (m.var != null && d.sessions >= 60) rm.push(metric(T.var95, '−' + Math.abs(m.var).toFixed(2) + '%',
        valueEnd > 0 ? money(Math.abs(m.var) / 100 * valueEnd, cur) : ''));
      if (m.maxDD != null) rm.push(metric(T.maxDD, '−' + Math.abs(m.maxDD).toFixed(2) + '%',
        d.drawdown ? money(d.drawdown.depthAmt, cur) : '', 'down'));
      if (rm.length) blk('<div class="metric-strip m' + rm.length + '">' + rm.join('') + '</div>', { 'data-acc': '3' });

      if (hasSeries) {
        var uw = [], peak = -Infinity;
        eq.forEach(function (p) {
          peak = Math.max(peak, p.value);
          uw.push({ t: p.iso, value: (1 + p.value / 100) / (1 + peak / 100) * 100 - 100 });
        });
        blk('<div class="chart-box"><div class="chart-h">' + T.underwaterTitle + '</div>' +
            chart('underwater', { series: uw }, { width: 676, height: 150 }) +
            '<div class="cap">' + T.underwaterCap + '</div></div>', { 'data-acc': '3' });
      }
      var riskCols = [];
      if (d.drawdown) {
        riskCols.push('<div><h3 class="h3">' + T.ddChronicle + '</h3><p class="body" style="font-size:10.5px">Máximo el <strong>' +
          dateFull(d.drawdown.peakIso) + '</strong>, mínimo el <strong>' + dateFull(d.drawdown.troughIso) + '</strong>: ' +
          pct(d.drawdown.depthPct) + ' equivalente a ' + money(d.drawdown.depthAmt, cur) + '. La cartera pasó ' +
          d.drawdown.sessionsUnder + ' sesiones bajo el agua y ' +
          (d.drawdown.recovered ? 'recuperó el máximo el ' + dateFull(d.drawdown.recoveredIso) + '.' : 'cerró el periodo sin recuperarlo.') +
          '</p></div>');
      }
      var meaning = [];
      if (m.var != null && d.sessions >= 60 && valueEnd > 0) meaning.push('Un VaR de −' + Math.abs(m.var).toFixed(2) +
        '% implica que en 1 de cada 20 días la pérdida podría superar ' + money(Math.abs(m.var) / 100 * valueEnd, cur) + ' al valor actual.');
      if (m.sharpe != null) meaning.push('El Sharpe de ' + m.sharpe.toFixed(2) + ' indica que el retorno ' +
        (m.sharpe > 1 ? 'compensó bien' : m.sharpe > 0 ? 'compensó de forma modesta' : 'no compensó') + ' el riesgo asumido.');
      if (m.beta != null) meaning.push('La beta de ' + m.beta.toFixed(2) + ' indica que la cartera ' +
        (m.beta > 1 ? 'amplifica' : 'atenúa') + ' los movimientos del índice.');
      if (meaning.length) riskCols.push('<div><h3 class="h3">' + T.whatTheyMean + '</h3><p class="body" style="font-size:10.5px">' +
        meaning.join(' ') + '</p></div>');
      if (riskCols.length) blk('<div class="g2">' + riskCols.join('') + '</div>', { 'data-acc': '3' });
      if (aiNote('riesgos')) blk(aiNote('riesgos'), { 'data-acc': '3' });

      /* ════════ IX · COMPOSICIÓN ════════ */
      secHead('IX', T.sections.IX, T.hints.IX, '4');
      var slices = weights.slice(0, 5).map(function (x) { return { label: x.ticker, value: x.w * 100 }; });
      var restW = weights.slice(5).reduce(function (s, x) { return s + x.w; }, 0) * 100;
      if (restW > 0.05) slices.push({ label: 'Otros (' + (weights.length - 5) + ')', value: restW });
      if (d.cashAtEnd > 0 && valueEnd > 0) slices.push({ label: 'Efectivo', value: d.cashAtEnd / valueEnd * 100 });
      blk('<div class="g2"><div class="chart-box"><div class="chart-h">' + T.byPosition + '</div>' +
          chart('donut', { slices: slices, centerValue: effN.toFixed(1), centerLabel: T.effHoldings },
                { width: 307, height: Math.max(172, 24 + slices.length * 15) }) + '</div>' +
          '<div class="chart-box"><div class="chart-h">' + T.bySector + '</div>' +
          chart('bars', { items: sectorRows, format: 'pct' }, { width: 283 }) + '</div></div>', { 'data-acc': '4' });

      var fxRows = Object.keys(d.fxExposure || {}).map(function (k) {
        return { code: k, val: d.fxExposure[k], pct: valueEnd > 0 ? d.fxExposure[k] / valueEnd * 100 : 0 };
      }).sort(function (a, b) { return b.val - a.val; });
      blk('<div class="g2"><div class="chart-box"><div class="chart-h">' + T.byRegion + '</div>' +
          chart('bars', { items: geoRows, format: 'pct' }, { width: 283 }) + '</div>' +
          '<div class="chart-box"><div class="chart-h">' + T.byCurrency + '</div><table><thead><tr><th>' + T.currency +
          '</th><th class="n">' + T.value + '</th><th class="n">' + T.weight + '</th></tr></thead><tbody>' +
          fxRows.map(function (r) {
            return '<tr><td><strong>' + esc(r.code) + '</strong></td><td class="n">' + money(r.val, cur) +
              '</td><td class="n">' + r.pct.toFixed(1) + '%</td></tr>';
          }).join('') + '</tbody></table></div></div>', { 'data-acc': '4' });

      var alerts = [];
      if (maxW > 25) alerts.push('La mayor posición (' + esc(weights[0].ticker) + ') representa ' + maxW.toFixed(1) + '% del portafolio — riesgo de concentración.');
      if (top3 > 60) alerts.push('Las 3 mayores suman ' + top3.toFixed(1) + '%: la diversificación efectiva equivale a ' + effN.toFixed(1) + ' posiciones igualmente ponderadas (HHI ' + hhi.toFixed(3) + ').');
      if (sectorRows.length && sectorRows[0].value > 40 && sectorRows[0].label !== 'Cash') alerts.push('Sobreexposición al sector ' + esc(sectorRows[0].label) + ' (' + sectorRows[0].value.toFixed(1) + '%).');
      if (alerts.length) blk('<div class="alerts">' + alerts.map(function (a) { return '• ' + a; }).join('<br>') + '</div>', { 'data-acc': '4' });

      /* ════════ X · ACTIVIDAD ════════ */
      var closed = (d.closedTradesInWindow || []).slice(0, 30);
      var txs = (d.txInWindow || []).slice(0, 80);
      if (closed.length || txs.length) {
        secHead('X', T.sections.X, (d.txInWindow || []).length + ' operaciones · ' + closed.length + ' ventas cerradas', '5');
        if (closed.length) {
          blk('<h3 class="h3">' + T.closedTrades + '</h3><div class="tbl"><table><thead><tr><th>' + T.ticker + '</th><th>' +
              T.buy + '</th><th>' + T.sell + '</th><th class="n">' + T.quantity + '</th><th class="n">' + T.cost +
              '</th><th class="n">' + T.proceeds + '</th><th class="n">P/L</th><th class="n">' + T.ret +
              '</th></tr></thead><tbody>' + closed.map(function (tr) {
                return '<tr><td><strong>' + esc(tr.ticker) + '</strong></td><td>' + dateFull(tr.buyDate) + '</td><td>' +
                  dateFull(tr.sellDate) + '</td><td class="n">' + parseFloat((tr.qty || 0).toFixed(4)) + '</td><td class="n">' +
                  money(tr.cost || 0, cur) + '</td><td class="n">' + money(tr.proceeds || 0, cur) + '</td><td class="n ' +
                  sign(tr.pnl) + '">' + amt(tr.pnl) + '</td><td class="n ' + sign(tr.pnlPct) + '">' + pct(tr.pnlPct) + '</td></tr>';
              }).join('') + '</tbody></table></div>',
              { 'data-flow': 'table', 'data-acc': '5', 'data-keep-with-next': '' });
        }
        if (txs.length) {
          blk('<h3 class="h3">' + T.txHistory + '</h3><div class="tbl"><table><thead><tr><th>' + T.date + '</th><th>' +
              T.type + '</th><th>' + T.ticker + '</th><th class="n">' + T.quantity + '</th><th class="n">' + T.price +
              '</th><th class="n">' + T.commissions + '</th><th class="n">' + T.net + '</th></tr></thead><tbody>' +
              txs.map(function (tx) {
                var cls = tx.type === 'COMPRA' ? 'up' : tx.type === 'VENTA' ? 'down' : '';
                return '<tr><td>' + dateFull(String(tx.date).slice(0, 10)) + '</td><td class="' + cls + '"><strong>' +
                  esc(tx.type) + '</strong></td><td><strong>' + esc(tx.ticker) + '</strong></td><td class="n">' +
                  (tx.quantity || 0) + '</td><td class="n">' + (tx.price || 0).toLocaleString(LOC, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) +
                  '</td><td class="n">' + (tx.commCost || 0).toFixed(2) + '</td><td class="n">' + (tx.net || 0).toFixed(2) + '</td></tr>';
              }).join('') + '</tbody></table>' +
              '<div class="footnote">' + txs.length + ' de ' + d.totalTxCount + ' operaciones históricas · comisiones del periodo: ' +
              money(d.totalComm || 0, cur) + '</div></div>',
              { 'data-flow': 'table', 'data-acc': '5' });
        }
      }

      /* ════════ XI · CALIDAD DE DATOS ════════ */
      secHead('XI', T.sections.XI, T.hints.XI, '1');
      var q = [
        [T.folio, folio],
        [T.priceAsOf, dateFull(d.endStr) + (d.isEndToday ? ' (más reciente)' : '')],
        [T.benchmark, d.benchmarkLabel || T.notAvailable],
        [T.rfr, ctx.rfr ? ctx.rfr.rate.toFixed(2) + '% (' + ctx.rfr.label + ')' : '—'],
        [T.betaCurHist, (m.currentWeightedBeta != null ? m.currentWeightedBeta.toFixed(2) : '—') + ' / ' +
          (m.historicalBeta != null ? m.historicalBeta.toFixed(2) : '—')],
        [T.aiModel, ai.model || (ai.error ? T.notAvailable : T.notRequested)]
      ];
      if (d.missingPrices && d.missingPrices.length) q.push(['Precios faltantes', d.missingPrices.length + ': ' + esc(d.missingPrices.slice(0, 6).join(', '))]);
      blk('<div class="g3">' + q.map(function (x) {
        return '<div class="kpi flat"><span>' + esc(x[0]) + '</span><strong>' + x[1] + '</strong></div>';
      }).join('') + '</div>', { 'data-acc': '1' });
      blk('<div class="callout" style="font-size:10px"><b>' + T.assumptions + '.</b> ' + T.assumptionsBody +
          ' Las métricas de riesgo se calculan sobre ' + d.sessions + ' ' + T.sessions +
          (ctx.rfr ? ' con una tasa libre de riesgo de ' + ctx.rfr.rate.toFixed(2) + '%' : '') + '.</div>', { 'data-acc': '1' });
      if (ai.sections && ai.sections.rebalanceo) {
        blk('<h3 class="h3">Acciones sugeridas</h3><div class="callout"><b>' + T.aiTag +
            ' · educativo, no es asesoría</b><br>' + ai.sections.rebalanceo + '</div>', { 'data-acc': '1' });
      }

      /* ════════ XII · GLOSARIO ════════ */
      secHead('XII', T.sections.XII, T.hints.XII, '2');
      blk('<div class="gloss">' + T.glossary.map(function (g) {
        return '<div><b>' + g[0] + '</b> — ' + g[1] + '</div>';
      }).join('') + '</div>', { 'data-flow': 'split', 'data-acc': '2' });

      /* ════════ CIERRE ════════ */
      blk('<div class="closing-body"><div class="eyebrow">' + folio + '</div><h2>' + T.endOfReport + '</h2>' +
          '<div class="closing-figs">' +
            '<div><span>' + T.valueEnd + '</span><strong>' + money(valueEnd, cur) + '</strong></div>' +
            '<div><span>' + T.resultAmtShort + '</span><strong class="' + sign(resultAmt) + '">' + amt(resultAmt) + '</strong></div>' +
            '<div><span>' + T.resultPct + '</span><strong class="' + sign(resultPct) + '">' + pct(resultPct) + '</strong></div>' +
            (active != null ? '<div><span>' + T.vsBench + '</span><strong class="' + sign(active) + '">' + pp(active) + '</strong></div>' : '') +
            (d.drawdown ? '<div><span>' + T.maxDD + '</span><strong class="down">' + pct(d.drawdown.depthPct) + '</strong></div>' : '') +
          '</div>' +
          '<div class="disclaimer">' + T.disclaimer + '</div>' +
          '<div class="footnote">Datos de mercado: Yahoo Finance / CoinGecko.' +
          (ai.model ? ' Análisis asistido por ' + esc(ai.model) + '.' : '') +
          '<br>BlackPortfolio · blackportfolio.ai · ' + folio + ' · ' + esc(dateFull(d.todayStr || d.endStr)) + '</div></div>' +
          '<div class="closing-art"></div>', { 'data-page': 'bleed', 'data-section': '' });

      return {
        html: '<!DOCTYPE html><html lang="' + lang + '"><head><meta charset="utf-8">' +
              '<title>' + esc(pf.name) + ' — ' + esc(T.kind) + '</title>' +
              '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
              '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">' +
              '<style>' + CSS + '</style></head><body data-tone="' + (ctx.tone || 'brand') + '">' +
              '<div id="doc"></div><div id="flow">' + blocks.join('') + '</div></body></html>',
        charts: charts,
        strings: { continues: T.continues, continued: T.continued },
        meta: { folio: folio, periodLabel: periodLabel, name: pf.name }
      };
    }
  };

  /* ── CSS del documento (modelo de página + escala tipográfica de imprenta) ── */
  var CSS = [
    ':root{--tone-text:#171b2a;--tone-text-muted:#646b7c;--tone-panel:#f2f4fd;--tone-accent:#556eff;',
    '--tone-accent-2:#7892ff;--tone-footnote-color:#98a0b2;--tone-up:#12996b;--tone-down:#e0483d;',
    '--tone-font-display:"Manrope","Segoe UI",sans-serif;--tone-font-body:"Inter","Segoe UI",sans-serif;',
    '--pdf-paper:#fff;--pdf-paper-2:var(--tone-panel);--pdf-ink:var(--tone-text);--pdf-ink-soft:#454b5e;',
    '--pdf-ink-muted:var(--tone-text-muted);--pdf-ink-faint:var(--tone-footnote-color);--pdf-rule:#e3e7f2;',
    '--pdf-accent:var(--tone-accent);--pdf-accent-2:var(--tone-accent-2);--pdf-chart-1:var(--tone-accent);',
    '--pdf-chart-2:#a9b8ff;--pdf-up:var(--tone-up);--pdf-down:var(--tone-down);',
    '--pdf-section-1:#556eff;--pdf-section-2:#0e7c86;--pdf-section-3:#a86212;--pdf-section-4:#6a3fd1;--pdf-section-5:#b03a63}',
    '[data-acc="1"]{--sec:var(--pdf-section-1)}[data-acc="2"]{--sec:var(--pdf-section-2)}',
    '[data-acc="3"]{--sec:var(--pdf-section-3)}[data-acc="4"]{--sec:var(--pdf-section-4)}',
    '[data-acc="5"]{--sec:var(--pdf-section-5)}',
    '*{box-sizing:border-box;margin:0;padding:0}body{background:#fff}',
    '.page,#flow{font-family:var(--tone-font-body);color:var(--pdf-ink);font-size:11.5px;line-height:1.62;',
    'font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased}',
    /* sin page-break-before: html2pdf insertaría una hoja en blanco por página */
    '.page{width:794px;height:1123px;position:relative;overflow:hidden;background:var(--pdf-paper)}',
    '.page-body{position:absolute;left:48px;top:58px;width:698px;height:1000px}',
    '.page-body>:first-child{margin-top:0!important}',
    '#flow{position:fixed;left:-10000px;top:0;width:698px}',
    '.page-head{position:absolute;left:48px;right:48px;top:24px;height:22px;display:flex;justify-content:space-between;',
    'align-items:flex-end;padding-bottom:5px;border-bottom:1px solid var(--pdf-rule);font-size:7.6px;font-weight:700;',
    'letter-spacing:.1em;text-transform:uppercase;color:var(--pdf-ink-faint)}',
    '.page-foot{position:absolute;left:48px;right:48px;bottom:26px;height:22px;display:flex;justify-content:space-between;',
    'align-items:flex-start;padding-top:5px;border-top:1px solid var(--pdf-rule);font-size:7.5px;color:var(--pdf-ink-faint)}',
    '.page-foot b{color:var(--pdf-ink-muted);font-weight:700}',
    /* tipografía */
    '.eyebrow{font-size:7.8px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--sec,var(--pdf-accent))}',
    '.sec-head{display:flex;align-items:baseline;gap:10px;margin:0 0 12px;padding-bottom:7px;border-bottom:2px solid var(--sec,var(--pdf-accent))}',
    '.sec-head .num{font-family:var(--tone-font-display);font-size:20px;font-weight:800;color:var(--sec,var(--pdf-accent));min-width:26px}',
    '.sec-head h2{font-family:var(--tone-font-display);font-size:20px;font-weight:750;letter-spacing:-.015em}',
    '.sec-head .hint{margin-left:auto;font-size:8px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--pdf-ink-faint)}',
    'h3.h3{font-size:12px;font-weight:750;letter-spacing:.09em;text-transform:uppercase;color:var(--sec,var(--pdf-accent));margin:0 0 6px}',
    '.verdict{font-family:var(--tone-font-display);font-size:24px;font-weight:750;line-height:1.15;letter-spacing:-.02em;margin:0 0 8px}',
    '.verdict em{font-style:normal;color:var(--sec,var(--pdf-accent))}',
    '.lede{font-size:13.5px;line-height:1.5;color:var(--pdf-ink-soft);margin:0 0 12px;max-width:600px}',
    'p.body{font-size:11.5px;line-height:1.62;color:var(--pdf-ink-soft);margin:0 0 9px;max-width:500px}',
    'p.body strong{color:var(--pdf-ink);font-weight:700}',
    '.dc{float:left;font-family:var(--tone-font-display);font-size:31px;line-height:.82;font-weight:800;margin:3px 4px 0 0;color:var(--sec,var(--pdf-accent))}',
    '.prose-rail{display:grid;grid-template-columns:452px 219px;gap:27px;align-items:start}',
    '.sidenote{font-size:8.8px;line-height:1.5;color:var(--pdf-ink-muted);border-left:2px solid var(--sec,var(--pdf-accent));padding-left:9px;margin-bottom:12px}',
    '.sidenote b{display:block;font-family:var(--tone-font-display);font-size:15px;font-weight:800;color:var(--pdf-ink)}',
    '.footnote{font-size:7.5px;line-height:1.5;color:var(--pdf-ink-faint);margin-top:6px}',
    /* componentes */
    '.kpi-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:0 0 12px}',
    '.kpi-row.k3{grid-template-columns:repeat(3,minmax(0,1fr))}.kpi-row.k5{grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}',
    '.kpi-row.k6{grid-template-columns:repeat(6,minmax(0,1fr));gap:7px}',
    '.kpi-row.k5 .kpi strong,.kpi-row.k6 .kpi strong{font-size:14.5px}',
    '.kpi{border-top:2px solid var(--sec,var(--pdf-accent));background:var(--pdf-paper-2);border-radius:0 0 6px 6px;padding:8px 9px 9px}',
    '.kpi.flat{border-top-width:1px}',
    '.kpi span{display:block;font-size:7.8px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--pdf-ink-muted);margin-bottom:3px}',
    '.kpi strong{display:block;font-family:var(--tone-font-display);font-size:19px;font-weight:800;letter-spacing:-.02em}',
    '.kpi.flat strong{font-family:var(--tone-font-body);font-size:10.5px;font-weight:700;line-height:1.35;word-break:break-word}',
    '.kpi small{display:block;font-size:7.6px;color:var(--pdf-ink-faint);margin-top:2px}',
    '.up{color:var(--pdf-up)}.down{color:var(--pdf-down)}',
    '.diag-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:12px}',
    '.diag-row.d3{grid-template-columns:repeat(3,minmax(0,1fr))}',
    '.diag{border:1px solid var(--pdf-rule);border-left:3px solid var(--pdf-ink-faint);border-radius:5px;padding:8px 9px}',
    '.diag.good{border-left-color:var(--pdf-up)}.diag.warn{border-left-color:#c98a12}.diag.bad{border-left-color:var(--pdf-down)}',
    '.diag span{display:block;font-size:7.6px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--pdf-ink-muted);margin-bottom:3px}',
    '.diag strong{display:block;font-family:var(--tone-font-display);font-size:14px;font-weight:800;line-height:1.2}',
    '.diag small{display:block;font-size:8px;color:var(--pdf-ink-muted);line-height:1.4;margin-top:3px}',
    '.chart-box{border:1px solid var(--pdf-rule);border-radius:6px;padding:10px 11px 9px;margin-bottom:12px}',
    '.chart-h{font-size:8.2px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--pdf-ink-muted);margin-bottom:8px}',
    '.cap{font-size:7.8px;color:var(--pdf-ink-faint);line-height:1.45;margin-top:7px}',
    '.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start;margin-bottom:12px}',
    '.g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:start;margin-bottom:12px}',
    '.callout{background:var(--pdf-paper-2);border-left:3px solid var(--sec,var(--pdf-accent));border-radius:0 5px 5px 0;',
    'padding:9px 12px;margin-bottom:12px;font-size:10.5px;line-height:1.55;color:var(--pdf-ink-soft)}',
    '.callout b{color:var(--pdf-ink)}.callout ul{margin:4px 0 0 15px}.callout li{margin-bottom:3px}',
    '.alerts{border:1px solid #f1cfcf;background:#fdf5f5;border-left:3px solid var(--pdf-down);border-radius:0 5px 5px 0;',
    'padding:8px 11px;margin-bottom:12px;font-size:9.6px;line-height:1.6;color:#8e3b3b}',
    '.metric-strip{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-bottom:12px}',
    '.metric-strip.m3{grid-template-columns:repeat(3,minmax(0,1fr))}.metric-strip.m4{grid-template-columns:repeat(4,minmax(0,1fr))}',
    '.metric-strip.m6{grid-template-columns:repeat(6,minmax(0,1fr))}',
    '.metric{border:1px solid var(--pdf-rule);border-radius:5px;padding:7px 8px;text-align:center}',
    '.metric span{display:block;font-size:7.6px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--pdf-ink-muted);margin-bottom:2px}',
    '.metric strong{font-family:var(--tone-font-display);font-size:14px;font-weight:800}',
    '.metric em{display:block;font-style:normal;font-size:7.6px;color:var(--pdf-ink-faint);margin-top:1px}',
    '.mover{display:grid;grid-template-columns:150px 1fr;gap:14px;border:1px solid var(--pdf-rule);border-radius:6px;padding:11px 12px;margin-bottom:11px}',
    '.mover .t{font-family:var(--tone-font-display);font-size:17px;font-weight:800}',
    '.mover .figs{font-size:8.6px;color:var(--pdf-ink-muted);margin:2px 0 7px;line-height:1.5}',
    '.mover ul{list-style:none;font-size:10px;line-height:1.5}',
    '.mover li{padding-left:66px;position:relative;margin-bottom:4px;color:var(--pdf-ink-soft)}',
    '.mover li b{position:absolute;left:0;top:1px;width:60px;font-size:7.6px;font-weight:800;letter-spacing:.05em;',
    'text-transform:uppercase;color:var(--sec,var(--pdf-accent))}',
    '.dossier{display:grid;grid-template-columns:96px 1fr;gap:12px;border:1px solid var(--pdf-rule);border-radius:6px;padding:11px 12px;margin-bottom:10px}',
    '.dossier-spark{padding-top:14px}',
    '.dossier .hd{display:flex;align-items:baseline;gap:8px;margin-bottom:5px}',
    '.dossier .hd b{font-family:var(--tone-font-display);font-size:15px;font-weight:800}',
    '.dossier .hd span{font-size:8px;color:var(--pdf-ink-faint);letter-spacing:.06em;text-transform:uppercase}',
    '.dossier .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:6px 0}',
    '.dossier .grid div{font-size:8.2px;color:var(--pdf-ink-muted)}',
    '.dossier .grid strong{display:block;font-size:11px;color:var(--pdf-ink);font-weight:800}',
    '.dossier p{font-size:9.6px;line-height:1.5;color:var(--pdf-ink-soft)}',
    /* tablas */
    'table{width:100%;border-collapse:collapse;font-size:9.2px}',
    'thead th{border-bottom:1px solid var(--pdf-ink-muted);font-size:8px;font-weight:800;letter-spacing:.06em;',
    'text-transform:uppercase;color:var(--pdf-ink-muted);padding:5px 7px;text-align:left}',
    'tbody td{border-bottom:1px solid var(--pdf-rule);padding:5px 7px;height:17px}',
    'tbody tr:last-child td{border-bottom:none}th.n,td.n{text-align:right}.tbl{margin-bottom:12px}',
    '.tbl-cont{font-size:7.6px;color:var(--pdf-ink-faint);text-align:right;padding-top:4px;font-style:italic}',
    '.tbl-cont-head{font-size:7.6px;color:var(--pdf-ink-faint);padding-bottom:4px;font-style:italic}',
    '.gloss{columns:2;column-gap:26px;font-size:9.4px;line-height:1.5;color:var(--pdf-ink-soft)}',
    '.gloss div{break-inside:avoid;margin-bottom:7px}.gloss b{color:var(--pdf-ink)}',
    /* portada y cierre (sin fotografía en esta fase: degradado del tono) */
    '.cover-art{position:absolute;left:0;top:0;width:794px;height:640px;',
    'background:linear-gradient(135deg,var(--pdf-accent) 0%,var(--pdf-accent-2) 55%,#a9b8ff 100%)}',
    '.cover-card{position:absolute;left:48px;right:48px;top:500px;background:var(--pdf-paper);padding:26px 28px 22px;border-top:4px solid var(--pdf-accent)}',
    '.cover-title{font-family:var(--tone-font-display);font-size:46px;font-weight:800;letter-spacing:-.025em;line-height:1.02}',
    '.cover-sub{font-size:11px;color:var(--pdf-ink-muted);margin-top:8px}',
    '.cover-figs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:20px;padding-top:16px;border-top:1px solid var(--pdf-rule)}',
    '.cover-figs span{display:block;font-size:7.8px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--pdf-ink-muted);margin-bottom:3px}',
    '.cover-figs strong{font-family:var(--tone-font-display);font-size:26px;font-weight:800;letter-spacing:-.02em}',
    '.cover-index{position:absolute;left:48px;right:48px;top:790px}',
    '.cover-index .k{font-size:7.8px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--pdf-ink-muted);',
    'border-bottom:1px solid var(--pdf-rule);padding-bottom:6px;margin-bottom:10px}',
    '.cover-index ol{list-style:none;columns:3;column-gap:22px;font-size:9px;color:var(--pdf-ink-muted);line-height:1.45}',
    '.cover-index li{break-inside:avoid;margin-bottom:7px}',
    '.cover-index li b{display:block;font-size:10px;font-weight:750;color:var(--pdf-ink)}',
    '.cover-index li b i{font-style:normal;color:var(--pdf-accent);margin-right:5px}',
    '.cover-read{font-size:9.2px;color:var(--pdf-ink-muted);line-height:1.5;margin-top:12px;padding-top:10px;',
    'border-top:1px solid var(--pdf-rule);max-width:560px}',
    '.cover-foot{position:absolute;left:48px;right:48px;bottom:44px;display:flex;justify-content:space-between;',
    'font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:var(--pdf-ink-faint)}',
    '.closing-art{position:absolute;left:0;bottom:0;width:794px;height:560px;',
    'background:linear-gradient(135deg,var(--pdf-accent) 0%,var(--pdf-accent-2) 100%)}',
    '.closing-body{position:absolute;left:48px;right:48px;top:88px}',
    '.closing-body h2{font-family:var(--tone-font-display);font-size:30px;font-weight:800;letter-spacing:-.02em;margin-bottom:14px}',
    '.closing-figs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:0 0 16px;padding:14px 0;',
    'border-top:1px solid var(--pdf-rule);border-bottom:1px solid var(--pdf-rule)}',
    '.closing-figs span{display:block;font-size:7.6px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--pdf-ink-muted);margin-bottom:3px}',
    '.closing-figs strong{font-family:var(--tone-font-display);font-size:16px;font-weight:800}',
    '.disclaimer{border:1px solid var(--pdf-rule);border-left:3px solid #c98a12;border-radius:0 5px 5px 0;padding:10px 12px;',
    'font-size:9.4px;line-height:1.6;color:var(--pdf-ink-soft);margin-bottom:12px}'
  ].join('');
})(window);
