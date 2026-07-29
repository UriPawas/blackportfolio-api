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
     Un bloque por idioma de la app (currentLang: es/en/fr). `n` son las frases
     que el documento REDACTA: viven aquí, no incrustadas en el constructor, que
     es lo que hacía imposible traducir el reporte. Cada una recibe ya
     formateados el dinero, los porcentajes y las fechas.                      */
  var STR = {
    es: {
      kind: 'Reporte de portafolio', period: 'Periodo', generated: 'Generado el',
      valueEnd: 'Valor final', resultAmt: 'Resultado del periodo', resultAmtShort: 'Resultado', resultPct: 'Retorno',
      inThisEdition: 'En esta edición',
      howToRead: 'Cada sección abre con el hallazgo, no con el tema. Las cifras van en dinero antes que en porcentaje. Las secciones finales contienen la actividad del periodo, los supuestos de cálculo y el glosario.',
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
      concHigh: 'alta', concMid: 'moderada', concLow: 'baja',
      monthlyTitle: 'Retorno mensual', monthlyCap: 'Retorno del portafolio por mes calendario dentro del rango.',
      month: 'Mes', ret: 'Retorno', result: 'Resultado', best: 'Mejor', worst: 'Peor', activity: 'Actividad', whatHappened: 'Qué pasó',
      equityTitle: 'Retorno acumulado · portafolio vs ',
      equityCap: 'Retorno compuesto acumulado desde el inicio del rango. Línea punteada = benchmark; banda sombreada = ventana de la caída máxima.',
      portfolio: 'Portafolio', benchmark: 'Benchmark', investedCapital: 'Capital invertido',
      excess: 'Exceso', trackingError: 'Tracking error', beta: 'Beta', sessions: 'sesiones', activeAlpha: 'alpha activo',
      annualized: 'anualizado', riskCost: 'Costo en riesgo', sectionN: 'Sección',
      contribTitle: 'Contribución por posición',
      contribCap: 'Aporte de cada posición al resultado del periodo, en dinero. La barra final es el resultado total.',
      total: 'Total', winnersLosers: 'Ganadores y perdedores (pp)', reading: 'Lectura', counterfactual: 'Contrafactual',
      ticker: 'Ticker', periodPnl: 'P/L del periodo', contribution: 'Contribución', weight: 'Peso', currency: 'Divisa',
      event: 'Evento', mechanism: 'Mecanismo', impact: 'Impacto', toWatch: 'A vigilar',
      avgCost: 'Costo medio', quantity: 'Cantidad', firstBuy: '1ª compra',
      sharpe: 'Sharpe', sortino: 'Sortino', volatility: 'Volatilidad', var95: 'VaR 95%', maxDD: 'Caída máxima',
      solid: 'sólido', modest: 'modesto', insufficient: 'insuficiente', asymmetry: 'asimetría',
      volHigh: 'alta', volMid: 'moderada', volLow: 'contenida',
      underwaterTitle: 'Bajo el agua · caídas desde máximos',
      underwaterCap: 'Distancia al máximo previo en cada sesión. El punto anotado es el mínimo del periodo.',
      ddChronicle: 'Crónica de la caída', whatTheyMean: 'Qué significan',
      byPosition: 'Distribución por posición', bySector: 'Por sector', byRegion: 'Por región', byCurrency: 'Por divisa',
      effHoldings: 'holdings efectivos', value: 'Valor', others: 'Otros', cash: 'Efectivo',
      closedTrades: 'Operaciones cerradas', txHistory: 'Historial de transacciones',
      buy: 'Compra', sell: 'Venta', cost: 'Costo', proceeds: 'Ingreso', date: 'Fecha', type: 'Tipo', price: 'Precio', net: 'Neto',
      operations: 'operaciones', closedSales: 'ventas cerradas', suggestedActions: 'Acciones sugeridas',
      endOfReport: 'Fin del reporte',
      disclaimer: 'Este reporte se genera automáticamente con fines informativos. No constituye asesoría de inversión ni recomendación de compra o venta de valores. Las secciones marcadas como generadas por IA pueden contener errores; verifica las cifras antes de tomar decisiones.',
      aiTag: '★ Análisis IA', aiEdu: '★ Análisis IA · educativo, no es asesoría', aiUnavailable: 'Análisis IA no disponible',
      noSeries: 'No hay suficientes datos de precios históricos para construir la serie en el rango seleccionado.',
      cashNote: 'El saldo en efectivo solo se incluye cuando la fecha final es hoy; en reportes históricos el valor refleja únicamente las posiciones.',
      assumptions: 'Supuestos',
      folio: 'Folio', priceAsOf: 'Vigencia de precios', mostRecent: 'más reciente', rfr: 'Tasa libre de riesgo',
      betaCurHist: 'Beta actual / histórica', missingPricesLabel: 'Precios faltantes',
      aiModel: 'Modelo de IA', notRequested: 'No solicitada', notAvailable: 'No disponible',
      dataSources: 'Datos de mercado: Yahoo Finance / CoinGecko.',
      photoBy: 'Foto:',
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
      ],
      n: {
        verdictConc: o => `El periodo lo definió <em>la concentración</em>: las tres mayores posiciones pesan ${o.top3}% del portafolio.`,
        verdictWin: o => `El portafolio cerró el periodo en positivo con <em>${o.amt}</em> sobre ${o.base} de capital base.`,
        verdictLoss: o => `El periodo cerró en negativo: <em>${o.amt}</em> sobre ${o.base} de capital base.`,
        lede: o => `El portafolio cerró en <strong>${o.value}</strong> tras un resultado de <strong>${o.amt} (${o.pct})</strong> sobre un capital base de ${o.base}${o.vs}${o.sessions}.`,
        ledeVsUp: o => `, superando ${o.bench} por ${o.pp} puntos porcentuales`,
        ledeVsDown: o => `, quedando por debajo de ${o.bench} por ${o.pp} puntos porcentuales`,
        ledeSessions: o => ` en ${o.n} sesiones`,
        diagOver: o => `${o.pct} sobre ${o.base}`,
        openerLede: o => `Qué pasó con el dinero entre el ${o.start} y el ${o.end}, por qué pasó, cuánto costó en riesgo y qué queda por vigilar.`,
        openerResult: o => `${o.pct} sobre ${o.base} de capital base`,
        openerExcess: o => `${o.bench} ${o.pct} en las mismas ${o.n} sesiones`,
        openerRisk: o => `caída máxima (${o.amt}), ${o.n} sesiones bajo el agua`,
        tocAttrib: o => `Quién puso los ${o.pts} puntos`, tocAttribAlt: () => 'Contribución posición por posición',
        tocRisk: () => 'Lo que costó conseguirlos', tocRiskAlt: () => 'Volatilidad y riesgo asumido',
        tocComp: o => `La mayor posición pesa ${o.pct}`, tocCompAlt: () => 'Concentración y exposición',
        p1: o => `l periodo cerró con un resultado de <strong>${o.amt}</strong> sobre un capital base de ${o.base}, equivalente a <strong>${o.pct}</strong>. El valor de la cartera terminó en ${o.value} con ${o.n} posiciones activas en ${o.cur}.`,
        p1First: 'E',
        p2: o => `El resultado se concentró en ${o.list}: entre ${o.subject} ${o.sum} de los ${o.total} puntos del periodo.`,
        p2One: 'esa posición aportó', p2Many: o => `esas ${o.n} posiciones aportaron`,
        p3: o => `En sentido contrario, ${o.list}. Sin ${o.first} el periodo habría cerrado en ${o.without} en lugar de ${o.actual}.`,
        p3Item: o => `<strong>${o.ticker}</strong> restó ${o.amt} (${o.pp})`,
        p4: o => `El resultado no fue gratis: la volatilidad anualizada fue de ${o.vol}${o.te}.`,
        p4Te: o => ` con un error de seguimiento de ${o.te}`,
        p4Dd: o => ` Entre el ${o.peak} y el ${o.trough} la cartera cayó ${o.depth} (${o.amt}), ${o.rec}`,
        p4Recovered: o => `recuperando el máximo el ${o.date}.`,
        p4NotRecovered: () => 'y cerró el periodo sin recuperar el máximo previo.',
        p4Sharpe: o => ` El Sharpe de ${o.v} indica que ${o.reading}`,
        sharpePaid: 'ese riesgo sí se pagó.', sharpeModest: 'el retorno ajustado al riesgo fue modesto.',
        sharpeUnpaid: 'el retorno no compensó el riesgo asumido.',
        noteVs: o => `${o.dir} ${o.bench} en ${o.n} sesiones`, noteAbove: 'por encima de', noteBelow: 'por debajo de',
        noteDd: o => `caída máxima del periodo${o.rec}`, noteDdRec: o => `, recuperada el ${o.date}`, noteDdNotRec: ', sin recuperar',
        noteDiv: o => `${o.n} pagos de dividendos cobrados`,
        noteMaxW: o => `peso de la mayor posición (${o.ticker})`,
        chronBest: 'Mejor mes del periodo', chronWorst: 'Peor mes del periodo',
        chronAbove: 'Avance por encima del promedio del periodo', chronModerate: 'Avance moderado',
        chronNegative: 'Mes en negativo',
        chronDriver: o => `, impulsado por ${o.ticker} (${o.pct})`,
        chronDrag: o => `${o.and}frenado por ${o.ticker} (${o.pct})`, chronAnd: ' y ', chronComma: ', ',
        sessBestWorst: o => `La mejor sesión del periodo fue el ${o.bestDate} (${o.bestPct}) y la peor el ${o.worstDate} (${o.worstPct}).`,
        vsIndex: o => `El portafolio ${o.verb} al índice en ${o.pp} puntos porcentuales${o.te}${o.beta}.`,
        vsBeat: 'superó', vsLag: 'quedó por debajo de',
        vsTe: o => `, con un error de seguimiento de ${o.te}: la diferencia ${o.reading}`,
        vsTeActive: 'vino de apuestas activas concretas, no de replicar al mercado',
        vsTeClose: 'se mantuvo cerca del índice',
        vsBeta: o => `. La beta de ${o.beta} indica que se asumió ${o.dir} de riesgo sistemático que el índice`,
        vsBetaMore: o => `${o.pct}% más`, vsBetaLess: o => `${o.pct}% menos`,
        attribReading: o => `Las tres mayores contribuciones aportaron ${o.pp} pp${o.of}. `,
        attribOf: o => ` de los ${o.total} pp del periodo`,
        attribDetractor: o => `El principal detractor fue ${o.ticker} con ${o.pp}.`,
        attribNoDetractor: 'Ninguna posición restó más de 0.5 pp.',
        attribCf: o => `excluyendo las tres mayores contribuciones, el periodo habría cerrado en <b>${o.without}</b> en lugar de ${o.actual}.`,
        moverImpact: o => `${o.verb} ${o.amt} al resultado del periodo: ${o.pp} pp${o.of}.`,
        moverGave: 'Aportó', moverTook: 'Restó', moverOf: o => ` de los ${o.total} pp totales`,
        mechUp: o => `El precio avanzó ${o.pct} desde el costo medio; con ${o.w} del portafolio, ese movimiento se transmitió al resultado en la proporción de su peso.`,
        mechDown: o => `La caída del precio se transmitió al resultado en la proporción de su peso (${o.w} del portafolio).`,
        watchConc: o => `Su peso de ${o.w} supera el umbral de concentración de 20%: una corrección de 20% en el papel restaría ~${o.pp} pp al portafolio.`,
        watchOversize: o => `${o.verb} ${o.pp} pp con ${o.w} del peso: su comportamiento pesa más que su tamaño.`,
        watchGives: 'Aporta', watchTakes: 'Resta',
        watchNone: 'Sin alertas de concentración: su contribución es proporcional a su peso.',
        newsFootWith: o => `Titulares recuperados para ${o.tickers} dentro de la ventana del reporte. Las relaciones causa-efecto se limitan a lo publicado; el resto de las explicaciones se deriva de las cifras del propio portafolio (precio, peso y contribución).`,
        newsFootWithout: 'Las explicaciones de esta sección se derivan de las cifras del propio portafolio (precio, peso y contribución). No hubo titulares disponibles para estas posiciones en la ventana del reporte.',
        dossierBase: o => `Representa ${o.w} del portafolio y ${o.verb} al resultado del periodo.`,
        dossierGave: o => `aportó ${o.pp} pp`, dossierTook: o => `restó ${o.pp} pp`, dossierNone: 'no tiene contribución calculable',
        dossierConc: 'Su peso rebasa el umbral de concentración de 20%.',
        dossierDetractor: 'Es uno de los detractores materiales del periodo.',
        dossierProportional: 'Su aporte es proporcional a su tamaño en la cartera.',
        dossierFx: o => `Cotiza en ${o.cur}: su aporte en ${o.base} depende del tipo de cambio a la fecha de valuación.`,
        ddChronicle: o => `Máximo el <strong>${o.peak}</strong>, mínimo el <strong>${o.trough}</strong>: ${o.pct} equivalente a ${o.amt}. La cartera pasó ${o.n} sesiones bajo el agua y ${o.rec}`,
        ddRecovered: o => `recuperó el máximo el ${o.date}.`, ddNotRecovered: 'cerró el periodo sin recuperarlo.',
        meanVar: o => `Un VaR de ${o.pct} implica que en 1 de cada 20 días la pérdida podría superar ${o.amt} al valor actual.`,
        meanSharpe: o => `El Sharpe de ${o.v} indica que el retorno ${o.reading} el riesgo asumido.`,
        meanSharpeGood: 'compensó bien', meanSharpeOk: 'compensó de forma modesta', meanSharpeBad: 'no compensó',
        meanBeta: o => `La beta de ${o.v} indica que la cartera ${o.verb} los movimientos del índice.`,
        betaAmplifies: 'amplifica', betaDampens: 'atenúa',
        alertMaxW: o => `La mayor posición (${o.ticker}) representa ${o.w} del portafolio — riesgo de concentración.`,
        alertTop3: o => `Las 3 mayores suman ${o.top3}: la diversificación efectiva equivale a ${o.eff} posiciones igualmente ponderadas (HHI ${o.hhi}).`,
        alertSector: o => `Sobreexposición al sector ${o.sector} (${o.pct}).`,
        missingPrices: o => `${o.n} posición(es) sin precio de cierre en la fecha; quedan sin valuar`,
        txFoot: o => `${o.shown} de ${o.total} operaciones históricas · comisiones del periodo: ${o.comm}`,
        assumptionsBody: o => `Las conversiones de divisa usan el tipo de cambio vigente a la fecha de generación, no el histórico de cada operación. La divisa de cada posición se resuelve por el sufijo del ticker, que es autoritativo sobre el campo guardado. El saldo en efectivo solo se incluye cuando la fecha final del rango es hoy. Las métricas de riesgo se calculan sobre ${o.sessions} sesiones${o.rfr}.`,
        assumptionsRfr: o => ` con una tasa libre de riesgo de ${o.rate}`,
        bandTicker: o => `${o.ticker} explicó ${o.pp} de los ${o.total} puntos del periodo.`,
        bandDd: o => `El periodo costó ${o.pct} de caída máxima: ${o.amt}.`,
        bandResult: o => `El resultado del periodo fue ${o.amt} sobre ${o.base}.`,
        aiAssisted: o => ` Análisis asistido por ${o.model}.`,
        photoCredits: o => ` Fotografías: Pexels — ${o.list}.`
      }
    },

    en: {
      kind: 'Portfolio report', period: 'Period', generated: 'Generated on',
      valueEnd: 'Ending value', resultAmt: 'Period result', resultAmtShort: 'Result', resultPct: 'Return',
      inThisEdition: 'In this edition',
      howToRead: 'Every section opens with the finding, not the topic. Figures are stated in money before percentages. The closing sections carry the period activity, the calculation assumptions and the glossary.',
      continues: 'continued on the next page', continued: 'continued',
      sections: {
        I: 'The period on one page', II: 'Letter for the period', III: 'Period timeline',
        IV: 'Performance vs benchmark', V: 'Return attribution', VI: 'What moved your positions',
        VII: 'Position dossier', VIII: 'Risk and volatility', IX: 'Composition and exposure',
        X: 'Period activity', XI: 'Data quality and methodology', XII: 'Glossary'
      },
      hints: {
        I: 'executive diagnosis', III: 'month by month', V: 'contribution to return, in percentage points',
        VI: 'with quantified impact', VII: 'largest by weight', VIII: 'metrics with interpretation',
        IX: 'as of period end', XI: 'report traceability', XII: 'definitions used in this report'
      },
      capitalBase: 'Capital base', openPnl: 'Open P/L', realizedPnl: 'Realized P/L',
      dividends: 'Dividends', commissions: 'Commissions', flows: 'Flows', market: 'Market', sales: 'Sales',
      bridgeTitle: 'Money bridge · where the result came from',
      bridgeCap: 'From capital base to ending value: market (open positions), realized sales, dividends collected and commissions paid.',
      performance: 'Performance', riskReturn: 'Risk/return', diversification: 'Diversification', vsBench: 'vs Benchmark',
      concHigh: 'high', concMid: 'moderate', concLow: 'low',
      monthlyTitle: 'Monthly return', monthlyCap: 'Portfolio return per calendar month within the range.',
      month: 'Month', ret: 'Return', result: 'Result', best: 'Best', worst: 'Worst', activity: 'Activity', whatHappened: 'What happened',
      equityTitle: 'Cumulative return · portfolio vs ',
      equityCap: 'Compound return accumulated from the start of the range. Dashed line = benchmark; shaded band = maximum drawdown window.',
      portfolio: 'Portfolio', benchmark: 'Benchmark', investedCapital: 'Invested capital',
      excess: 'Excess', trackingError: 'Tracking error', beta: 'Beta', sessions: 'sessions', activeAlpha: 'active alpha',
      annualized: 'annualized', riskCost: 'Cost in risk', sectionN: 'Section',
      contribTitle: 'Contribution by position',
      contribCap: 'Each position’s contribution to the period result, in money. The final bar is the total result.',
      total: 'Total', winnersLosers: 'Winners and losers (pp)', reading: 'Reading', counterfactual: 'Counterfactual',
      ticker: 'Ticker', periodPnl: 'Period P/L', contribution: 'Contribution', weight: 'Weight', currency: 'Currency',
      event: 'Event', mechanism: 'Mechanism', impact: 'Impact', toWatch: 'To watch',
      avgCost: 'Average cost', quantity: 'Quantity', firstBuy: 'First buy',
      sharpe: 'Sharpe', sortino: 'Sortino', volatility: 'Volatility', var95: 'VaR 95%', maxDD: 'Max drawdown',
      solid: 'solid', modest: 'modest', insufficient: 'insufficient', asymmetry: 'asymmetry',
      volHigh: 'high', volMid: 'moderate', volLow: 'contained',
      underwaterTitle: 'Underwater · drawdowns from highs',
      underwaterCap: 'Distance to the previous high on each session. The annotated point is the period low.',
      ddChronicle: 'Drawdown chronicle', whatTheyMean: 'What they mean',
      byPosition: 'Breakdown by position', bySector: 'By sector', byRegion: 'By region', byCurrency: 'By currency',
      effHoldings: 'effective holdings', value: 'Value', others: 'Others', cash: 'Cash',
      closedTrades: 'Closed trades', txHistory: 'Transaction history',
      buy: 'Buy', sell: 'Sell', cost: 'Cost', proceeds: 'Proceeds', date: 'Date', type: 'Type', price: 'Price', net: 'Net',
      operations: 'transactions', closedSales: 'closed sales', suggestedActions: 'Suggested actions',
      endOfReport: 'End of report',
      disclaimer: 'This report is generated automatically for informational purposes. It is not investment advice nor a recommendation to buy or sell securities. Sections marked as AI-generated may contain errors; verify the figures before making decisions.',
      aiTag: '★ AI analysis', aiEdu: '★ AI analysis · educational, not advice', aiUnavailable: 'AI analysis unavailable',
      noSeries: 'There is not enough historical price data to build the series for the selected range.',
      cashNote: 'Cash is only included when the end date is today; in historical reports the value reflects positions only.',
      assumptions: 'Assumptions',
      folio: 'Reference', priceAsOf: 'Prices as of', mostRecent: 'most recent', rfr: 'Risk-free rate',
      betaCurHist: 'Current / historical beta', missingPricesLabel: 'Missing prices',
      aiModel: 'AI model', notRequested: 'Not requested', notAvailable: 'Not available',
      dataSources: 'Market data: Yahoo Finance / CoinGecko.',
      photoBy: 'Photo:',
      glossary: [
        ['Sharpe', 'return per unit of total risk: (return − risk-free rate) ÷ volatility.'],
        ['Sortino', 'a Sharpe variant that only penalises downside volatility.'],
        ['Volatility', 'annualised standard deviation of daily returns.'],
        ['VaR 95%', 'maximum expected loss on 95% of days.'],
        ['Beta', 'sensitivity of the portfolio to benchmark moves.'],
        ['Max drawdown', 'largest decline from a previous high within the range.'],
        ['Alpha (excess)', 'return above the benchmark over the period.'],
        ['Tracking error', 'annualised standard deviation of the difference against the benchmark.'],
        ['HHI', 'concentration index (sum of squared weights); &gt;0.25 is considered high.'],
        ['Effective holdings', '1 ÷ HHI; equivalent equally weighted positions.'],
        ['Contribution (pp)', 'a position’s contribution to total return, in percentage points.'],
        ['Money bridge', 'breakdown of the change in value between capital base and ending value.']
      ],
      n: {
        verdictConc: o => `<em>Concentration</em> defined the period: the three largest positions carry ${o.top3}% of the portfolio.`,
        verdictWin: o => `The portfolio closed the period in positive territory with <em>${o.amt}</em> on ${o.base} of capital base.`,
        verdictLoss: o => `The period closed negative: <em>${o.amt}</em> on ${o.base} of capital base.`,
        lede: o => `The portfolio closed at <strong>${o.value}</strong> after a result of <strong>${o.amt} (${o.pct})</strong> on a capital base of ${o.base}${o.vs}${o.sessions}.`,
        ledeVsUp: o => `, beating ${o.bench} by ${o.pp} percentage points`,
        ledeVsDown: o => `, trailing ${o.bench} by ${o.pp} percentage points`,
        ledeSessions: o => ` over ${o.n} sessions`,
        diagOver: o => `${o.pct} on ${o.base}`,
        openerLede: o => `What happened to the money between ${o.start} and ${o.end}, why it happened, what it cost in risk and what is left to watch.`,
        openerResult: o => `${o.pct} on ${o.base} of capital base`,
        openerExcess: o => `${o.bench} ${o.pct} over the same ${o.n} sessions`,
        openerRisk: o => `max drawdown (${o.amt}), ${o.n} sessions underwater`,
        tocAttrib: o => `Who delivered the ${o.pts} points`, tocAttribAlt: () => 'Contribution position by position',
        tocRisk: () => 'What it cost to get them', tocRiskAlt: () => 'Volatility and risk taken',
        tocComp: o => `The largest position carries ${o.pct}`, tocCompAlt: () => 'Concentration and exposure',
        p1: o => `he period closed with a result of <strong>${o.amt}</strong> on a capital base of ${o.base}, equal to <strong>${o.pct}</strong>. The portfolio ended at ${o.value} with ${o.n} active positions in ${o.cur}.`,
        p1First: 'T',
        p2: o => `The result was concentrated in ${o.list}: together ${o.subject} ${o.sum} of the period’s ${o.total} points.`,
        p2One: 'that position delivered', p2Many: o => `those ${o.n} positions delivered`,
        p3: o => `On the other side, ${o.list}. Without ${o.first} the period would have closed at ${o.without} instead of ${o.actual}.`,
        p3Item: o => `<strong>${o.ticker}</strong> subtracted ${o.amt} (${o.pp})`,
        p4: o => `The result was not free: annualised volatility was ${o.vol}${o.te}.`,
        p4Te: o => ` with a tracking error of ${o.te}`,
        p4Dd: o => ` Between ${o.peak} and ${o.trough} the portfolio fell ${o.depth} (${o.amt}), ${o.rec}`,
        p4Recovered: o => `recovering its high on ${o.date}.`,
        p4NotRecovered: () => 'and closed the period without recovering the previous high.',
        p4Sharpe: o => ` A Sharpe of ${o.v} means ${o.reading}`,
        sharpePaid: 'that risk did pay off.', sharpeModest: 'risk-adjusted return was modest.',
        sharpeUnpaid: 'the return did not compensate the risk taken.',
        noteVs: o => `${o.dir} ${o.bench} over ${o.n} sessions`, noteAbove: 'above', noteBelow: 'below',
        noteDd: o => `period max drawdown${o.rec}`, noteDdRec: o => `, recovered on ${o.date}`, noteDdNotRec: ', not recovered',
        noteDiv: o => `${o.n} dividend payments collected`,
        noteMaxW: o => `weight of the largest position (${o.ticker})`,
        chronBest: 'Best month of the period', chronWorst: 'Worst month of the period',
        chronAbove: 'Gain above the period average', chronModerate: 'Moderate gain',
        chronNegative: 'Month in negative territory',
        chronDriver: o => `, driven by ${o.ticker} (${o.pct})`,
        chronDrag: o => `${o.and}held back by ${o.ticker} (${o.pct})`, chronAnd: ' and ', chronComma: ', ',
        sessBestWorst: o => `The best session of the period was ${o.bestDate} (${o.bestPct}) and the worst ${o.worstDate} (${o.worstPct}).`,
        vsIndex: o => `The portfolio ${o.verb} the index by ${o.pp} percentage points${o.te}${o.beta}.`,
        vsBeat: 'beat', vsLag: 'trailed',
        vsTe: o => `, with a tracking error of ${o.te}: the difference ${o.reading}`,
        vsTeActive: 'came from specific active bets, not from tracking the market',
        vsTeClose: 'stayed close to the index',
        vsBeta: o => `. A beta of ${o.beta} means ${o.dir} systematic risk than the index was taken`,
        vsBetaMore: o => `${o.pct}% more`, vsBetaLess: o => `${o.pct}% less`,
        attribReading: o => `The three largest contributions delivered ${o.pp} pp${o.of}. `,
        attribOf: o => ` of the period’s ${o.total} pp`,
        attribDetractor: o => `The main detractor was ${o.ticker} at ${o.pp}.`,
        attribNoDetractor: 'No position subtracted more than 0.5 pp.',
        attribCf: o => `excluding the three largest contributions, the period would have closed at <b>${o.without}</b> instead of ${o.actual}.`,
        moverImpact: o => `${o.verb} ${o.amt} to the period result: ${o.pp} pp${o.of}.`,
        moverGave: 'Added', moverTook: 'Subtracted', moverOf: o => ` of the ${o.total} pp total`,
        mechUp: o => `The price rose ${o.pct} from average cost; at ${o.w} of the portfolio, that move passed through to the result in proportion to its weight.`,
        mechDown: o => `The price decline passed through to the result in proportion to its weight (${o.w} of the portfolio).`,
        watchConc: o => `Its ${o.w} weight exceeds the 20% concentration threshold: a 20% correction in the stock would subtract ~${o.pp} pp from the portfolio.`,
        watchOversize: o => `It ${o.verb} ${o.pp} pp with ${o.w} of the weight: its behaviour matters more than its size.`,
        watchGives: 'adds', watchTakes: 'subtracts',
        watchNone: 'No concentration alerts: its contribution is proportional to its weight.',
        newsFootWith: o => `Headlines retrieved for ${o.tickers} within the report window. Cause-and-effect claims are limited to what was published; every other explanation is derived from the portfolio’s own figures (price, weight and contribution).`,
        newsFootWithout: 'The explanations in this section derive from the portfolio’s own figures (price, weight and contribution). No headlines were available for these positions within the report window.',
        dossierBase: o => `It carries ${o.w} of the portfolio and ${o.verb} to the period result.`,
        dossierGave: o => `added ${o.pp} pp`, dossierTook: o => `subtracted ${o.pp} pp`, dossierNone: 'has no computable contribution',
        dossierConc: 'Its weight exceeds the 20% concentration threshold.',
        dossierDetractor: 'It is one of the material detractors of the period.',
        dossierProportional: 'Its contribution is proportional to its size in the portfolio.',
        dossierFx: o => `It trades in ${o.cur}: its contribution in ${o.base} depends on the exchange rate at the valuation date.`,
        ddChronicle: o => `High on <strong>${o.peak}</strong>, low on <strong>${o.trough}</strong>: ${o.pct} equal to ${o.amt}. The portfolio spent ${o.n} sessions underwater and ${o.rec}`,
        ddRecovered: o => `recovered its high on ${o.date}.`, ddNotRecovered: 'closed the period without recovering it.',
        meanVar: o => `A VaR of ${o.pct} means that on 1 in 20 days the loss could exceed ${o.amt} at the current value.`,
        meanSharpe: o => `A Sharpe of ${o.v} means the return ${o.reading} the risk taken.`,
        meanSharpeGood: 'compensated well for', meanSharpeOk: 'modestly compensated for', meanSharpeBad: 'did not compensate for',
        meanBeta: o => `A beta of ${o.v} means the portfolio ${o.verb} index moves.`,
        betaAmplifies: 'amplifies', betaDampens: 'dampens',
        alertMaxW: o => `The largest position (${o.ticker}) is ${o.w} of the portfolio — concentration risk.`,
        alertTop3: o => `The top 3 add up to ${o.top3}: effective diversification equals ${o.eff} equally weighted positions (HHI ${o.hhi}).`,
        alertSector: o => `Overexposure to the ${o.sector} sector (${o.pct}).`,
        missingPrices: o => `${o.n} position(s) without a closing price on the date; they are left unvalued`,
        txFoot: o => `${o.shown} of ${o.total} historical transactions · period commissions: ${o.comm}`,
        assumptionsBody: o => `Currency conversions use the exchange rate in force at generation time, not the historical rate of each transaction. Each position’s currency is resolved from the ticker suffix, which overrides the stored field. Cash is only included when the end date of the range is today. Risk metrics are computed over ${o.sessions} sessions${o.rfr}.`,
        assumptionsRfr: o => ` with a risk-free rate of ${o.rate}`,
        bandTicker: o => `${o.ticker} explained ${o.pp} of the period’s ${o.total} points.`,
        bandDd: o => `The period cost ${o.pct} of maximum drawdown: ${o.amt}.`,
        bandResult: o => `The period result was ${o.amt} on ${o.base}.`,
        aiAssisted: o => ` Analysis assisted by ${o.model}.`,
        photoCredits: o => ` Photography: Pexels — ${o.list}.`
      }
    },

    fr: {
      kind: 'Rapport de portefeuille', period: 'Période', generated: 'Généré le',
      valueEnd: 'Valeur finale', resultAmt: 'Résultat de la période', resultAmtShort: 'Résultat', resultPct: 'Rendement',
      inThisEdition: 'Dans cette édition',
      howToRead: 'Chaque section commence par le constat, pas par le thème. Les chiffres sont exprimés en argent avant les pourcentages. Les dernières sections contiennent l’activité de la période, les hypothèses de calcul et le glossaire.',
      continues: 'suite à la page suivante', continued: 'suite',
      sections: {
        I: 'La période en une page', II: 'Lettre de la période', III: 'Chronologie de la période',
        IV: 'Performance vs indice', V: 'Attribution des résultats', VI: 'Ce qui a bougé vos positions',
        VII: 'Dossier par position', VIII: 'Risque et volatilité', IX: 'Composition et exposition',
        X: 'Activité de la période', XI: 'Qualité des données et méthodologie', XII: 'Glossaire'
      },
      hints: {
        I: 'diagnostic exécutif', III: 'mois par mois', V: 'contribution au rendement, en points de pourcentage',
        VI: 'avec impact chiffré', VII: 'les plus importantes par poids', VIII: 'métriques interprétées',
        IX: 'à la clôture de la période', XI: 'traçabilité du rapport', XII: 'définitions utilisées dans ce rapport'
      },
      capitalBase: 'Capital de base', openPnl: 'P/L ouvert', realizedPnl: 'P/L réalisé',
      dividends: 'Dividendes', commissions: 'Commissions', flows: 'Apports', market: 'Marché', sales: 'Ventes',
      bridgeTitle: 'Pont de l’argent · d’où vient le résultat',
      bridgeCap: 'Du capital de base à la valeur finale : marché (positions ouvertes), ventes réalisées, dividendes encaissés et commissions payées.',
      performance: 'Performance', riskReturn: 'Risque/rendement', diversification: 'Diversification', vsBench: 'vs Indice',
      concHigh: 'élevée', concMid: 'modérée', concLow: 'faible',
      monthlyTitle: 'Rendement mensuel', monthlyCap: 'Rendement du portefeuille par mois calendaire dans la plage.',
      month: 'Mois', ret: 'Rendement', result: 'Résultat', best: 'Meilleur', worst: 'Pire', activity: 'Activité', whatHappened: 'Ce qui s’est passé',
      equityTitle: 'Rendement cumulé · portefeuille vs ',
      equityCap: 'Rendement composé cumulé depuis le début de la plage. Ligne pointillée = indice ; bande ombrée = fenêtre de la baisse maximale.',
      portfolio: 'Portefeuille', benchmark: 'Indice', investedCapital: 'Capital investi',
      excess: 'Excédent', trackingError: 'Tracking error', beta: 'Bêta', sessions: 'séances', activeAlpha: 'alpha actif',
      annualized: 'annualisé', riskCost: 'Coût en risque', sectionN: 'Section',
      contribTitle: 'Contribution par position',
      contribCap: 'Apport de chaque position au résultat de la période, en argent. La dernière barre est le résultat total.',
      total: 'Total', winnersLosers: 'Gagnants et perdants (pp)', reading: 'Lecture', counterfactual: 'Contrefactuel',
      ticker: 'Titre', periodPnl: 'P/L de la période', contribution: 'Contribution', weight: 'Poids', currency: 'Devise',
      event: 'Événement', mechanism: 'Mécanisme', impact: 'Impact', toWatch: 'À surveiller',
      avgCost: 'Coût moyen', quantity: 'Quantité', firstBuy: 'Premier achat',
      sharpe: 'Sharpe', sortino: 'Sortino', volatility: 'Volatilité', var95: 'VaR 95%', maxDD: 'Baisse maximale',
      solid: 'solide', modest: 'modeste', insufficient: 'insuffisant', asymmetry: 'asymétrie',
      volHigh: 'élevée', volMid: 'modérée', volLow: 'contenue',
      underwaterTitle: 'Sous l’eau · baisses depuis les sommets',
      underwaterCap: 'Distance au sommet précédent à chaque séance. Le point annoté est le plus bas de la période.',
      ddChronicle: 'Chronique de la baisse', whatTheyMean: 'Ce qu’elles signifient',
      byPosition: 'Répartition par position', bySector: 'Par secteur', byRegion: 'Par région', byCurrency: 'Par devise',
      effHoldings: 'positions effectives', value: 'Valeur', others: 'Autres', cash: 'Liquidités',
      closedTrades: 'Opérations clôturées', txHistory: 'Historique des transactions',
      buy: 'Achat', sell: 'Vente', cost: 'Coût', proceeds: 'Produit', date: 'Date', type: 'Type', price: 'Prix', net: 'Net',
      operations: 'opérations', closedSales: 'ventes clôturées', suggestedActions: 'Actions suggérées',
      endOfReport: 'Fin du rapport',
      disclaimer: 'Ce rapport est généré automatiquement à titre informatif. Il ne constitue ni un conseil en investissement ni une recommandation d’achat ou de vente de titres. Les sections générées par IA peuvent contenir des erreurs ; vérifiez les chiffres avant toute décision.',
      aiTag: '★ Analyse IA', aiEdu: '★ Analyse IA · pédagogique, pas un conseil', aiUnavailable: 'Analyse IA indisponible',
      noSeries: 'Les données de prix historiques sont insuffisantes pour construire la série sur la plage sélectionnée.',
      cashNote: 'Les liquidités ne sont incluses que si la date de fin est aujourd’hui ; dans un rapport historique la valeur ne reflète que les positions.',
      assumptions: 'Hypothèses',
      folio: 'Référence', priceAsOf: 'Prix arrêtés au', mostRecent: 'le plus récent', rfr: 'Taux sans risque',
      betaCurHist: 'Bêta actuel / historique', missingPricesLabel: 'Prix manquants',
      aiModel: 'Modèle d’IA', notRequested: 'Non demandée', notAvailable: 'Non disponible',
      dataSources: 'Données de marché : Yahoo Finance / CoinGecko.',
      photoBy: 'Photo :',
      glossary: [
        ['Sharpe', 'rendement par unité de risque total : (rendement − taux sans risque) ÷ volatilité.'],
        ['Sortino', 'variante du Sharpe qui ne pénalise que la volatilité à la baisse.'],
        ['Volatilité', 'écart-type annualisé des rendements quotidiens.'],
        ['VaR 95%', 'perte maximale attendue sur 95% des jours.'],
        ['Bêta', 'sensibilité du portefeuille aux mouvements de l’indice.'],
        ['Baisse maximale', 'plus forte baisse depuis un sommet précédent dans la plage.'],
        ['Alpha (excédent)', 'rendement au-dessus de l’indice sur la période.'],
        ['Tracking error', 'écart-type annualisé de la différence avec l’indice.'],
        ['HHI', 'indice de concentration (somme des poids²) ; &gt;0,25 est considéré élevé.'],
        ['Positions effectives', '1 ÷ HHI ; positions équivalentes équipondérées.'],
        ['Contribution (pp)', 'apport d’une position au rendement total, en points de pourcentage.'],
        ['Pont de l’argent', 'décomposition de la variation de valeur entre capital de base et valeur finale.']
      ],
      n: {
        verdictConc: o => `<em>La concentration</em> a défini la période : les trois plus grandes positions pèsent ${o.top3}% du portefeuille.`,
        verdictWin: o => `Le portefeuille a clôturé la période en positif avec <em>${o.amt}</em> sur ${o.base} de capital de base.`,
        verdictLoss: o => `La période s’est clôturée en négatif : <em>${o.amt}</em> sur ${o.base} de capital de base.`,
        lede: o => `Le portefeuille a clôturé à <strong>${o.value}</strong> après un résultat de <strong>${o.amt} (${o.pct})</strong> sur un capital de base de ${o.base}${o.vs}${o.sessions}.`,
        ledeVsUp: o => `, dépassant ${o.bench} de ${o.pp} points de pourcentage`,
        ledeVsDown: o => `, en retrait de ${o.pp} points de pourcentage sur ${o.bench}`,
        ledeSessions: o => ` sur ${o.n} séances`,
        diagOver: o => `${o.pct} sur ${o.base}`,
        openerLede: o => `Ce qui est arrivé à l’argent entre le ${o.start} et le ${o.end}, pourquoi, ce que cela a coûté en risque et ce qu’il reste à surveiller.`,
        openerResult: o => `${o.pct} sur ${o.base} de capital de base`,
        openerExcess: o => `${o.bench} ${o.pct} sur les mêmes ${o.n} séances`,
        openerRisk: o => `baisse maximale (${o.amt}), ${o.n} séances sous l’eau`,
        tocAttrib: o => `Qui a apporté les ${o.pts} points`, tocAttribAlt: () => 'Contribution position par position',
        tocRisk: () => 'Ce qu’il a fallu pour les obtenir', tocRiskAlt: () => 'Volatilité et risque assumé',
        tocComp: o => `La plus grande position pèse ${o.pct}`, tocCompAlt: () => 'Concentration et exposition',
        p1: o => `a période s’est clôturée sur un résultat de <strong>${o.amt}</strong> sur un capital de base de ${o.base}, soit <strong>${o.pct}</strong>. La valeur du portefeuille a terminé à ${o.value} avec ${o.n} positions actives en ${o.cur}.`,
        p1First: 'L',
        p2: o => `Le résultat s’est concentré sur ${o.list} : à elles ${o.subject} ${o.sum} des ${o.total} points de la période.`,
        p2One: 'seules, cette position a apporté', p2Many: o => `seules, ces ${o.n} positions ont apporté`,
        p3: o => `À l’inverse, ${o.list}. Sans ${o.first}, la période aurait clôturé à ${o.without} au lieu de ${o.actual}.`,
        p3Item: o => `<strong>${o.ticker}</strong> a retiré ${o.amt} (${o.pp})`,
        p4: o => `Le résultat n’a pas été gratuit : la volatilité annualisée a été de ${o.vol}${o.te}.`,
        p4Te: o => ` avec une tracking error de ${o.te}`,
        p4Dd: o => ` Entre le ${o.peak} et le ${o.trough} le portefeuille a chuté de ${o.depth} (${o.amt}), ${o.rec}`,
        p4Recovered: o => `retrouvant son sommet le ${o.date}.`,
        p4NotRecovered: () => 'et a clôturé la période sans retrouver son sommet précédent.',
        p4Sharpe: o => ` Le Sharpe de ${o.v} indique que ${o.reading}`,
        sharpePaid: 'ce risque a été payé.', sharpeModest: 'le rendement ajusté du risque a été modeste.',
        sharpeUnpaid: 'le rendement n’a pas compensé le risque assumé.',
        noteVs: o => `${o.dir} ${o.bench} sur ${o.n} séances`, noteAbove: 'au-dessus de', noteBelow: 'en dessous de',
        noteDd: o => `baisse maximale de la période${o.rec}`, noteDdRec: o => `, retrouvée le ${o.date}`, noteDdNotRec: ', non retrouvée',
        noteDiv: o => `${o.n} versements de dividendes encaissés`,
        noteMaxW: o => `poids de la plus grande position (${o.ticker})`,
        chronBest: 'Meilleur mois de la période', chronWorst: 'Pire mois de la période',
        chronAbove: 'Progression au-dessus de la moyenne de la période', chronModerate: 'Progression modérée',
        chronNegative: 'Mois en négatif',
        chronDriver: o => `, porté par ${o.ticker} (${o.pct})`,
        chronDrag: o => `${o.and}freiné par ${o.ticker} (${o.pct})`, chronAnd: ' et ', chronComma: ', ',
        sessBestWorst: o => `La meilleure séance de la période a été le ${o.bestDate} (${o.bestPct}) et la pire le ${o.worstDate} (${o.worstPct}).`,
        vsIndex: o => `Le portefeuille ${o.verb} l’indice de ${o.pp} points de pourcentage${o.te}${o.beta}.`,
        vsBeat: 'a dépassé', vsLag: 'est resté en dessous de',
        vsTe: o => `, avec une tracking error de ${o.te} : la différence ${o.reading}`,
        vsTeActive: 'vient de paris actifs précis, pas d’une réplication du marché',
        vsTeClose: 'est restée proche de l’indice',
        vsBeta: o => `. Le bêta de ${o.beta} indique que ${o.dir} de risque systématique que l’indice a été assumé`,
        vsBetaMore: o => `${o.pct}% de plus`, vsBetaLess: o => `${o.pct}% de moins`,
        attribReading: o => `Les trois plus grandes contributions ont apporté ${o.pp} pp${o.of}. `,
        attribOf: o => ` des ${o.total} pp de la période`,
        attribDetractor: o => `Le principal détracteur a été ${o.ticker} avec ${o.pp}.`,
        attribNoDetractor: 'Aucune position n’a retiré plus de 0,5 pp.',
        attribCf: o => `en excluant les trois plus grandes contributions, la période aurait clôturé à <b>${o.without}</b> au lieu de ${o.actual}.`,
        moverImpact: o => `${o.verb} ${o.amt} au résultat de la période : ${o.pp} pp${o.of}.`,
        moverGave: 'A apporté', moverTook: 'A retiré', moverOf: o => ` des ${o.total} pp totaux`,
        mechUp: o => `Le prix a progressé de ${o.pct} depuis le coût moyen ; avec ${o.w} du portefeuille, ce mouvement s’est transmis au résultat à hauteur de son poids.`,
        mechDown: o => `La baisse du prix s’est transmise au résultat à hauteur de son poids (${o.w} du portefeuille).`,
        watchConc: o => `Son poids de ${o.w} dépasse le seuil de concentration de 20% : une correction de 20% du titre retirerait ~${o.pp} pp au portefeuille.`,
        watchOversize: o => `${o.verb} ${o.pp} pp avec ${o.w} du poids : son comportement pèse plus que sa taille.`,
        watchGives: 'Apporte', watchTakes: 'Retire',
        watchNone: 'Aucune alerte de concentration : sa contribution est proportionnelle à son poids.',
        newsFootWith: o => `Titres récupérés pour ${o.tickers} dans la fenêtre du rapport. Les liens de cause à effet se limitent à ce qui a été publié ; le reste des explications provient des chiffres du portefeuille lui-même (prix, poids et contribution).`,
        newsFootWithout: 'Les explications de cette section proviennent des chiffres du portefeuille lui-même (prix, poids et contribution). Aucun titre n’était disponible pour ces positions dans la fenêtre du rapport.',
        dossierBase: o => `Elle représente ${o.w} du portefeuille et ${o.verb} au résultat de la période.`,
        dossierGave: o => `a apporté ${o.pp} pp`, dossierTook: o => `a retiré ${o.pp} pp`, dossierNone: 'n’a pas de contribution calculable',
        dossierConc: 'Son poids dépasse le seuil de concentration de 20%.',
        dossierDetractor: 'C’est l’un des détracteurs matériels de la période.',
        dossierProportional: 'Son apport est proportionnel à sa taille dans le portefeuille.',
        dossierFx: o => `Elle cote en ${o.cur} : son apport en ${o.base} dépend du taux de change à la date de valorisation.`,
        ddChronicle: o => `Sommet le <strong>${o.peak}</strong>, plus bas le <strong>${o.trough}</strong> : ${o.pct} soit ${o.amt}. Le portefeuille a passé ${o.n} séances sous l’eau et ${o.rec}`,
        ddRecovered: o => `a retrouvé son sommet le ${o.date}.`, ddNotRecovered: 'a clôturé la période sans le retrouver.',
        meanVar: o => `Une VaR de ${o.pct} implique que 1 jour sur 20 la perte pourrait dépasser ${o.amt} à la valeur actuelle.`,
        meanSharpe: o => `Le Sharpe de ${o.v} indique que le rendement ${o.reading} le risque assumé.`,
        meanSharpeGood: 'a bien compensé', meanSharpeOk: 'a modestement compensé', meanSharpeBad: 'n’a pas compensé',
        meanBeta: o => `Le bêta de ${o.v} indique que le portefeuille ${o.verb} les mouvements de l’indice.`,
        betaAmplifies: 'amplifie', betaDampens: 'atténue',
        alertMaxW: o => `La plus grande position (${o.ticker}) représente ${o.w} du portefeuille — risque de concentration.`,
        alertTop3: o => `Les 3 plus grandes totalisent ${o.top3} : la diversification effective équivaut à ${o.eff} positions équipondérées (HHI ${o.hhi}).`,
        alertSector: o => `Surexposition au secteur ${o.sector} (${o.pct}).`,
        missingPrices: o => `${o.n} position(s) sans cours de clôture à la date ; elles restent non valorisées`,
        txFoot: o => `${o.shown} sur ${o.total} transactions historiques · commissions de la période : ${o.comm}`,
        assumptionsBody: o => `Les conversions de devises utilisent le taux de change en vigueur à la date de génération, pas le taux historique de chaque opération. La devise de chaque position est déterminée par le suffixe du titre, qui prime sur le champ enregistré. Les liquidités ne sont incluses que si la date de fin de la plage est aujourd’hui. Les métriques de risque sont calculées sur ${o.sessions} séances${o.rfr}.`,
        assumptionsRfr: o => ` avec un taux sans risque de ${o.rate}`,
        bandTicker: o => `${o.ticker} explique ${o.pp} des ${o.total} points de la période.`,
        bandDd: o => `La période a coûté ${o.pct} de baisse maximale : ${o.amt}.`,
        bandResult: o => `Le résultat de la période a été ${o.amt} sur ${o.base}.`,
        aiAssisted: o => ` Analyse assistée par ${o.model}.`,
        photoCredits: o => ` Photographies : Pexels — ${o.list}.`
      }
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
      var T = STR[lang], N = T.n, LOC = locale(lang);
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

      /* Fotografía (pdf-document.md §5). Cada patrón trae su geometría; si el
         hueco no tiene foto devuelve '' y el llamador usa el degradado del tono.
         Alto y ancho explícitos: la paginación mide antes de que cargue nada. */
      var IMG = ctx.images || {};
      var SIZES = { 'img-band': [698, 150], 'img-duotone': [698, 190], 'img-rail': [219, 260],
                    'img-inset': [76, 76], 'cover-img': [794, 640], 'opener-img': [794, 470],
                    'img-closing': [794, 560] };
      function hasImg(slot) { return !!(IMG[slot] && IMG[slot].src); }
      function img(pattern, slot, extra, creditTop) {
        if (!hasImg(slot)) return '';
        var im = IMG[slot], sz = SIZES[pattern];
        return '<div class="img-wrap ' + pattern + '" style="background:' + esc(im.avg || '#8a94a6') + '">' +
               '<img src="' + im.src + '" width="' + sz[0] + '" height="' + sz[1] + '" alt="">' +
               '<div class="tint"></div>' + (extra || '') +
               '<span class="credit on-img' + (creditTop ? ' top' : '') + '">' + T.photoBy + ' ' +
               esc(im.by || 'Pexels') + ' · Pexels</span></div>';
      }
      var NEWS = ctx.news || {};
      var newsTickers = Object.keys(NEWS).filter(function (k) { return (NEWS[k] || []).length; });
      var photographers = [];
      Object.keys(IMG).forEach(function (k) {
        if (IMG[k] && IMG[k].by && photographers.indexOf(IMG[k].by) < 0) photographers.push(IMG[k].by);
      });
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
      var concLabel = hhi > 0.25 ? T.concHigh : hhi > 0.15 ? T.concMid : T.concLow;
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
        (img('cover-img', 'cover', '', true) || '<div class="cover-art"></div>') +
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
        ? N.verdictConc({ top3: top3.toFixed(1) })
        : (resultAmt >= 0
            ? N.verdictWin({ amt: amt(resultAmt), base: money(base, cur) })
            : N.verdictLoss({ amt: amt(resultAmt), base: money(base, cur) }));
      var lede = N.lede({
        value: money(valueEnd, cur), amt: amt(resultAmt), pct: pct(resultPct), base: money(base, cur),
        vs: active == null ? '' : (active >= 0 ? N.ledeVsUp : N.ledeVsDown)(
              { bench: esc(d.benchmarkLabel), pp: Math.abs(active).toFixed(2) }),
        sessions: N.ledeSessions({ n: d.sessions })
      });
      blk('<div class="verdict">' + verdict + '</div><div class="lede">' + lede + '</div>',
          { 'data-acc': '1', 'data-keep-with-next': '' });

      var sharpeN = m.sharpe;
      var diag = [
        { label: T.performance, value: amt(resultAmt), status: resultAmt >= 0 ? 'good' : 'bad',
          note: N.diagOver({ pct: pct(resultPct), base: money(base, cur) }) },
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
        blk('<div class="alerts">' + N.missingPrices({ n: d.missingPrices.length }) + ' (' +
            esc(d.missingPrices.slice(0, 8).join(', ')) + (d.missingPrices.length > 8 ? '…' : '') + ')</div>', { 'data-acc': '1' });
      }
      if (!d.isEndToday) blk('<div class="callout">' + T.cashNote + '</div>', { 'data-acc': '1' });

      // Movers arriba: la portadilla de §II ya los necesita.
      var upTop = (d.movers && d.movers.up) || [], downTop = (d.movers && d.movers.down) || [];
      /* ════════ II · CARTA DEL PERIODO ════════ */
      // Con foto, la sección abre a página completa (patrón `opener-half`);
      // sin foto, abre en línea con el encabezado normal.
      if (hasImg('opener')) {
        blk(img('opener-img', 'opener', '<div class="opener-num">II</div>') +
            '<div class="opener-body"><div class="eyebrow" style="--sec:var(--pdf-section-2)">' + T.sectionN + ' II</div>' +
            '<h2>' + esc(T.sections.II) + '</h2>' +
            '<div class="lede">' + N.openerLede({ start: dateFull(d.startStr), end: dateFull(d.endStr) }) + '</div>' +
            '<div class="opener-figs">' +
              '<div><span>' + T.resultAmtShort + '</span><strong class="' + sign(resultAmt) + '">' + amt(resultAmt) +
                '</strong><small>' + N.openerResult({ pct: pct(resultPct), base: money(base, cur) }) + '</small></div>' +
              (active != null ? '<div><span>' + T.excess + '</span><strong class="' + sign(active) + '">' + pp(active) +
                '</strong><small>' + N.openerExcess({ bench: esc(d.benchmarkLabel), pct: pct(benchRet), n: d.sessions }) +
                '</small></div>' : '') +
              (d.drawdown ? '<div><span>' + T.riskCost + '</span><strong class="down">' + pct(d.drawdown.depthPct) +
                '</strong><small>' + N.openerRisk({ amt: money(d.drawdown.depthAmt, cur), n: d.drawdown.sessionsUnder }) +
                '</small></div>' : '') +
            '</div></div>' +
            '<div class="opener-toc">' +
              '<div><b>' + esc(T.sections.V) + '</b>' + (upTop.length && resultPct != null
                ? N.tocAttrib({ pts: Math.abs(resultPct).toFixed(1) }) : N.tocAttribAlt()) + '</div>' +
              '<div><b>' + esc(T.sections.VIII) + '</b>' + (d.drawdown ? N.tocRisk() : N.tocRiskAlt()) + '</div>' +
              '<div><b>' + esc(T.sections.IX) + '</b>' + (maxW ? N.tocComp({ pct: maxW.toFixed(1) + '%' })
                : N.tocCompAlt()) + '</div>' +
            '</div>',
            { 'data-page': 'bleed', 'data-acc': '2', 'data-section': 'II · ' + T.sections.II });
      } else {
        secHead('II', T.sections.II, null, '2');
      }

      var paras = [];
      paras.push('<p class="body"><span class="dc">' + N.p1First + '</span>' + N.p1({
        amt: amt(resultAmt), base: money(base, cur), pct: pct(resultPct),
        value: money(valueEnd, cur), n: nPos, cur: esc(cur)
      }) + '</p>');
      if (upTop.length) {
        var sumUp = upTop.reduce(function (s, x) { return s + x.pp; }, 0);
        paras.push('<p class="body">' + N.p2({
          list: upTop.map(function (x) {
            return '<strong>' + esc(x.ticker) + '</strong> (' + amt(x.pnl) + ', ' + pp(x.pp) + ')';
          }).join(', '),
          subject: upTop.length === 1 ? N.p2One : N.p2Many({ n: upTop.length }),
          sum: sumUp.toFixed(2), total: resultPct != null ? resultPct.toFixed(2) : '—'
        }) + '</p>');
      }
      if (downTop.length) {
        paras.push('<p class="body">' + N.p3({
          list: downTop.map(function (x) {
            return N.p3Item({ ticker: esc(x.ticker), amt: money(Math.abs(x.pnl), cur), pp: pp(x.pp) });
          }).join(N.chronAnd),
          first: esc(downTop[0].ticker),
          without: pct(resultPct != null ? resultPct - downTop[0].pp : null), actual: pct(resultPct)
        }) + '</p>');
      }
      var riskPara = N.p4({
        vol: m.volatility != null ? '<strong>' + m.volatility.toFixed(1) + '%</strong>' : '—',
        te: trackingError != null ? N.p4Te({ te: trackingError.toFixed(1) + '%' }) : ''
      });
      if (d.drawdown) {
        riskPara += N.p4Dd({
          peak: dateFull(d.drawdown.peakIso), trough: dateFull(d.drawdown.troughIso),
          depth: Math.abs(d.drawdown.depthPct).toFixed(2) + '%', amt: money(d.drawdown.depthAmt, cur),
          rec: d.drawdown.recovered ? N.p4Recovered({ date: dateFull(d.drawdown.recoveredIso) }) : N.p4NotRecovered()
        });
      }
      if (m.sharpe != null) {
        riskPara += N.p4Sharpe({
          v: m.sharpe.toFixed(2),
          reading: m.sharpe > 1 ? N.sharpePaid : m.sharpe > 0 ? N.sharpeModest : N.sharpeUnpaid
        });
      }
      paras.push('<p class="body">' + riskPara + '</p>');

      var notes = [];
      if (active != null) notes.push('<div class="sidenote"><b>' + pp(active) + '</b>' +
        N.noteVs({ dir: active >= 0 ? N.noteAbove : N.noteBelow, bench: esc(d.benchmarkLabel), n: d.sessions }) + '</div>');
      if (d.drawdown) notes.push('<div class="sidenote"><b>' + money(d.drawdown.depthAmt, cur) + '</b>' +
        N.noteDd({ rec: d.drawdown.recovered ? N.noteDdRec({ date: dateFull(d.drawdown.recoveredIso) }) : N.noteDdNotRec }) + '</div>');
      if (d.totalDividends) notes.push('<div class="sidenote"><b>' + money(d.totalDividends, cur) + '</b>' +
        N.noteDiv({ n: d.dividends.length }) + '</div>');
      if (maxW) notes.push('<div class="sidenote"><b>' + maxW.toFixed(1) + '%</b>' +
        N.noteMaxW({ ticker: esc(weights[0].ticker) }) + '</div>');

      var railFig = img('img-rail', 'rail');
      blk('<div class="prose-rail"><div>' + paras.join('') + '</div><div>' + notes.join('') + railFig + '</div></div>',
          { 'data-acc': '2' });

      // Banda a sangre con una cita de una sola línea, siempre anclada a una
      // cifra del periodo (nunca una frase decorativa sin dato detrás).
      if (hasImg('band')) {
        var quote = upTop.length && top3 > 50
          ? N.bandTicker({ ticker: esc(upTop[0].ticker), pp: Math.abs(upTop[0].pp).toFixed(2),
                           total: resultPct != null ? Math.abs(resultPct).toFixed(2) : '—' })
          : d.drawdown
            ? N.bandDd({ pct: Math.abs(d.drawdown.depthPct).toFixed(1) + '%', amt: money(d.drawdown.depthAmt, cur) })
            : N.bandResult({ amt: amt(resultAmt), base: money(base, cur) });
        blk('<div class="img-wrap img-duotone" style="background:' + esc(IMG.band.avg || '#8a94a6') + '">' +
            '<img src="' + IMG.band.src + '" width="698" height="190" alt="">' +
            '<div class="tint"></div>' +
            '<div class="scrim"></div>' +
            '<div class="pullquote">' + quote + '</div>' +
            '<span class="credit on-img">' + T.photoBy + ' ' + esc(IMG.band.by || 'Pexels') +
            ' · Pexels</span></div>',
            { 'data-acc': '2' });
      }
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
          // el texto varía por posición del mes en el periodo; ver STR[lang].n
          // Varía el encabezado por posición del mes en el periodo, y solo nombra
          // al motor cuando su movimiento es material (≥1%): si no, la columna
          // repite la misma frase mes tras mes y deja de informar.
          var story = x.value === mMax ? N.chronBest
            : x.value === mMin ? N.chronWorst
            : x.value >= 0 ? (x.value > avg ? N.chronAbove : N.chronModerate)
            : N.chronNegative;
          var hasDriver = x.best && Math.abs(x.best.pct) >= 1;
          if (hasDriver) story += N.chronDriver({ ticker: esc(x.best.ticker), pct: pct(x.best.pct, 1) });
          if (x.worst && x.worst.pct <= -1 && x.worst.ticker !== (x.best && x.best.ticker)) {
            story += N.chronDrag({ and: hasDriver ? N.chronAnd : N.chronComma,
                                   ticker: esc(x.worst.ticker), pct: pct(x.worst.pct, 1) });
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
        if (trackingError != null) strip.push(metric(T.trackingError, trackingError.toFixed(2) + '%', T.annualized));
        if (m.beta != null) strip.push(metric(T.beta, m.beta.toFixed(2), T.vsBench.toLowerCase()));
        blk('<div class="metric-strip m' + strip.length + '">' + strip.join('') + '</div>', { 'data-acc': '4' });

        var perf = [];
        if (d.bestSession && d.worstSession) {
          perf.push('<p class="body">' + N.sessBestWorst({
            bestDate: dateFull(d.bestSession.iso), bestPct: pct(d.bestSession.pct),
            worstDate: dateFull(d.worstSession.iso), worstPct: pct(d.worstSession.pct)
          }) + '</p>');
        }
        if (active != null) {
          perf.push('<p class="body">' + N.vsIndex({
            verb: active >= 0 ? N.vsBeat : N.vsLag,
            pp: Math.abs(active).toFixed(2),
            te: trackingError == null ? '' : N.vsTe({
              te: trackingError.toFixed(2) + '%',
              reading: trackingError > 5 ? N.vsTeActive : N.vsTeClose
            }),
            beta: m.beta == null ? '' : N.vsBeta({
              beta: m.beta.toFixed(2),
              dir: m.beta > 1 ? N.vsBetaMore({ pct: Math.round((m.beta - 1) * 100) })
                              : N.vsBetaLess({ pct: Math.round((1 - m.beta) * 100) })
            })
          }) + '</p>');
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
            N.attribReading({ pp: top3pp.toFixed(2),
                              of: resultPct != null ? N.attribOf({ total: resultPct.toFixed(2) }) : '' }) +
            (downTop.length ? N.attribDetractor({ ticker: esc(downTop[0].ticker), pp: pp(downTop[0].pp) })
                            : N.attribNoDetractor) + '</p>' +
            (resultPct != null ? '<div class="callout" style="font-size:10px"><b>' + T.counterfactual + ':</b> ' +
             N.attribCf({ without: pct(resultPct - top3pp), actual: pct(resultPct) }) + '</div>' : '') +
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
          var wTxt = w != null ? w.toFixed(1) + '%' : '—';
          var mech = mv.pp >= 0
            ? N.mechUp({ pct: p && p.pnlPct != null ? pct(p.pnlPct) : '—', w: wTxt })
            : N.mechDown({ w: wTxt });
          var watch = [];
          if (w != null && w > 20) watch.push(N.watchConc({ w: wTxt, pp: (w * 0.2).toFixed(1) }));
          if (w != null && w <= 20 && Math.abs(mv.pp) > 1) {
            watch.push(N.watchOversize({ verb: mv.pp >= 0 ? N.watchGives : N.watchTakes,
                                         pp: Math.abs(mv.pp).toFixed(2), w: wTxt }));
          }
          if (!watch.length) watch.push(N.watchNone);
          // El titular es la ÚNICA fuente admisible para atribuir el movimiento
          // a un hecho del mundo; sin noticia la tarjeta se queda en las cifras.
          var items = (NEWS[mv.ticker] || []).slice(0, 2);
          var eventLi = items.length
            ? '<li><b>' + T.event + '</b>' + items.map(function (n) {
                return esc(n.title) + ' <span class="src">(' + esc(n.source || '') +
                       (n.date ? (n.source ? ' · ' : '') + dateFull(n.date) : '') + ')</span>';
              }).join('<br>') + '</li>'
            : '';
          blk('<div class="mover">' +
              '<div><div class="t">' + esc(mv.ticker) + '</div><div class="figs">' + amt(mv.pnl) + ' · ' + pp(mv.pp) +
              (w != null ? '<br>peso ' + w.toFixed(1) + '%' : '') + '</div>' +
              (p && p.series && p.series.length > 1 ? chart('sparkline', { values: p.series }, { width: 138, height: 34 }) : '') +
              '</div><ul>' +
              eventLi +
              '<li><b>' + T.impact + '</b>' + N.moverImpact({
                verb: mv.pp >= 0 ? N.moverGave : N.moverTook, amt: money(Math.abs(mv.pnl), cur),
                pp: Math.abs(mv.pp).toFixed(2),
                of: resultPct ? N.moverOf({ total: Math.abs(resultPct).toFixed(2) }) : ''
              }) + '</li>' +
              '<li><b>' + T.mechanism + '</b>' + mech + '</li>' +
              '<li><b>' + T.toWatch + '</b>' + watch[0] + '</li>' +
              '</ul></div>', { 'data-acc': '1', 'data-min-space': '150' });
        });
        if (aiNote('movers')) blk(aiNote('movers'), { 'data-acc': '1' });
        blk('<div class="footnote">' + (newsTickers.length
              ? N.newsFootWith({ tickers: esc(newsTickers.join(', ')) })
              : N.newsFootWithout) + '</div>', { 'data-acc': '1' });
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
        secHead('VII', T.sections.VII, dossier.length + '/' + nPos + ' · ' + T.hints.VII, '2');
        blk(dossier.map(function (p) {
          var w = wByTicker[p.pos.ticker];
          var cp = p.contributionPp;
          var note = N.dossierBase({
            w: w != null ? w.toFixed(1) + '%' : '—',
            verb: cp == null ? N.dossierNone
                : (cp >= 0 ? N.dossierGave : N.dossierTook)({ pp: Math.abs(cp).toFixed(2) })
          });
          if (w != null && w > 20) note += ' ' + N.dossierConc;
          else if (cp != null && cp < -0.5) note += ' ' + N.dossierDetractor;
          else note += ' ' + N.dossierProportional;
          if (ctx.helpers.posCurrency(p.pos) !== cur) {
            note += ' ' + N.dossierFx({ cur: esc(ctx.helpers.posCurrency(p.pos)), base: esc(cur) });
          }
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
      if (m.sharpe != null) rm.push(metric(T.sharpe, m.sharpe.toFixed(2),
        m.sharpe > 1 ? T.solid : m.sharpe > 0 ? T.modest : T.insufficient, m.sharpe > 0 ? 'up' : 'down'));
      if (m.sortino != null && (m.sharpe == null || Math.abs(m.sortino - m.sharpe) >= 0.3)) rm.push(metric(T.sortino, m.sortino.toFixed(2), T.asymmetry));
      if (m.volatility != null) rm.push(metric(T.volatility, m.volatility.toFixed(1) + '%',
        m.volatility > 25 ? T.volHigh : m.volatility > 15 ? T.volMid : T.volLow));
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
        riskCols.push('<div><h3 class="h3">' + T.ddChronicle + '</h3><p class="body" style="font-size:10.5px">' +
          N.ddChronicle({
            peak: dateFull(d.drawdown.peakIso), trough: dateFull(d.drawdown.troughIso),
            pct: pct(d.drawdown.depthPct), amt: money(d.drawdown.depthAmt, cur), n: d.drawdown.sessionsUnder,
            rec: d.drawdown.recovered ? N.ddRecovered({ date: dateFull(d.drawdown.recoveredIso) }) : N.ddNotRecovered
          }) + '</p></div>');
      }
      var meaning = [];
      if (m.var != null && d.sessions >= 60 && valueEnd > 0) meaning.push(N.meanVar({
        pct: '−' + Math.abs(m.var).toFixed(2) + '%', amt: money(Math.abs(m.var) / 100 * valueEnd, cur) }));
      if (m.sharpe != null) meaning.push(N.meanSharpe({ v: m.sharpe.toFixed(2),
        reading: m.sharpe > 1 ? N.meanSharpeGood : m.sharpe > 0 ? N.meanSharpeOk : N.meanSharpeBad }));
      if (m.beta != null) meaning.push(N.meanBeta({ v: m.beta.toFixed(2),
        verb: m.beta > 1 ? N.betaAmplifies : N.betaDampens }));
      if (meaning.length) riskCols.push('<div><h3 class="h3">' + T.whatTheyMean + '</h3><p class="body" style="font-size:10.5px">' +
        meaning.join(' ') + '</p></div>');
      if (riskCols.length) blk('<div class="g2">' + riskCols.join('') + '</div>', { 'data-acc': '3' });
      if (aiNote('riesgos')) blk(aiNote('riesgos'), { 'data-acc': '3' });

      /* ════════ IX · COMPOSICIÓN ════════ */
      secHead('IX', T.sections.IX, T.hints.IX, '4');
      var slices = weights.slice(0, 5).map(function (x) { return { label: x.ticker, value: x.w * 100 }; });
      var restW = weights.slice(5).reduce(function (s, x) { return s + x.w; }, 0) * 100;
      if (restW > 0.05) slices.push({ label: T.others + ' (' + (weights.length - 5) + ')', value: restW });
      if (d.cashAtEnd > 0 && valueEnd > 0) slices.push({ label: T.cash, value: d.cashAtEnd / valueEnd * 100 });
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
      if (maxW > 25) alerts.push(N.alertMaxW({ ticker: esc(weights[0].ticker), w: maxW.toFixed(1) + '%' }));
      if (top3 > 60) alerts.push(N.alertTop3({ top3: top3.toFixed(1) + '%', eff: effN.toFixed(1), hhi: hhi.toFixed(3) }));
      if (sectorRows.length && sectorRows[0].value > 40 && sectorRows[0].label !== 'Cash') {
        alerts.push(N.alertSector({ sector: esc(sectorRows[0].label), pct: sectorRows[0].value.toFixed(1) + '%' }));
      }
      if (alerts.length) blk('<div class="alerts">' + alerts.map(function (a) { return '• ' + a; }).join('<br>') + '</div>', { 'data-acc': '4' });

      /* ════════ X · ACTIVIDAD ════════ */
      var closed = (d.closedTradesInWindow || []).slice(0, 30);
      var txs = (d.txInWindow || []).slice(0, 80);
      if (closed.length || txs.length) {
        secHead('X', T.sections.X, (d.txInWindow || []).length + ' ' + T.operations + ' · ' +
                closed.length + ' ' + T.closedSales, '5');
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
              '<div class="footnote">' + N.txFoot({ shown: txs.length, total: d.totalTxCount,
                comm: money(d.totalComm || 0, cur) }) + '</div></div>',
              { 'data-flow': 'table', 'data-acc': '5' });
        }
      }

      /* ════════ XI · CALIDAD DE DATOS ════════ */
      secHead('XI', T.sections.XI, T.hints.XI, '1');
      var q = [
        [T.folio, folio],
        [T.priceAsOf, dateFull(d.endStr) + (d.isEndToday ? ' (' + T.mostRecent + ')' : '')],
        [T.benchmark, d.benchmarkLabel || T.notAvailable],
        [T.rfr, ctx.rfr ? ctx.rfr.rate.toFixed(2) + '% (' + ctx.rfr.label + ')' : '—'],
        [T.betaCurHist, (m.currentWeightedBeta != null ? m.currentWeightedBeta.toFixed(2) : '—') + ' / ' +
          (m.historicalBeta != null ? m.historicalBeta.toFixed(2) : '—')],
        [T.aiModel, ai.model || (ai.error ? T.notAvailable : T.notRequested)]
      ];
      if (d.missingPrices && d.missingPrices.length) {
        q.push([T.missingPricesLabel, d.missingPrices.length + ': ' + esc(d.missingPrices.slice(0, 6).join(', '))]);
      }
      blk('<div class="g3">' + q.map(function (x) {
        return '<div class="kpi flat"><span>' + esc(x[0]) + '</span><strong>' + x[1] + '</strong></div>';
      }).join('') + '</div>', { 'data-acc': '1' });
      blk('<div class="callout" style="font-size:10px"><b>' + T.assumptions + '.</b> ' + N.assumptionsBody({
        sessions: d.sessions,
        rfr: ctx.rfr ? N.assumptionsRfr({ rate: ctx.rfr.rate.toFixed(2) + '%' }) : ''
      }) + '</div>', { 'data-acc': '1' });
      if (ai.sections && ai.sections.rebalanceo) {
        blk('<h3 class="h3">' + T.suggestedActions + '</h3><div class="callout"><b>' + T.aiEdu +
            '</b><br>' + ai.sections.rebalanceo + '</div>', { 'data-acc': '1' });
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
          '<div class="footnote">' + T.dataSources +
          (ai.model ? N.aiAssisted({ model: esc(ai.model) }) : '') +
          (photographers.length ? N.photoCredits({ list: esc(photographers.join(', ')) }) : '') +
          '<br>BlackPortfolio · blackportfolio.ai · ' + folio + ' · ' + esc(dateFull(d.todayStr || d.endStr)) + '</div></div>' +
          (img('img-closing', 'closing') || '<div class="closing-art"></div>'),
          { 'data-page': 'bleed', 'data-section': '' });

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
    '.mover .src{color:var(--pdf-ink-faint);font-size:8.6px;white-space:nowrap}',
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
    /* fotografía: patrones de pdf-document.md §5 */
    '.img-wrap{position:relative;overflow:hidden;background:var(--pdf-paper-2)}',
    '.img-wrap img{display:block;width:100%;height:100%;object-fit:cover;filter:saturate(.18) contrast(1.05)}',
    '.img-wrap .tint{position:absolute;inset:0;background:var(--sec,var(--pdf-accent));mix-blend-mode:multiply;opacity:.42}',
    '.img-wrap .scrim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(17,20,34,.86) 42%,rgba(17,20,34,.15))}',
    '.credit{font-size:7.5px;color:var(--pdf-ink-faint);margin-top:4px}',
    '.credit.on-img{position:absolute;right:10px;bottom:8px;color:rgba(255,255,255,.72);margin:0;z-index:2}',
    '.credit.on-img.top{top:10px;bottom:auto}',
    '.cover-img{position:absolute;left:0;top:0;width:794px;height:640px}',
    '.opener-img{position:absolute;left:0;top:0;width:794px;height:470px}',
    '.opener-num{position:absolute;left:44px;bottom:18px;font-family:var(--tone-font-display);font-size:132px;',
    'font-weight:800;line-height:.8;color:rgba(255,255,255,.30);letter-spacing:-.05em;z-index:2}',
    '.opener-body{position:absolute;left:48px;right:48px;top:522px}',
    '.opener-body h2{font-family:var(--tone-font-display);font-size:34px;font-weight:800;letter-spacing:-.025em;',
    'line-height:1.08;margin:8px 0 12px}',
    '.opener-body .lede{font-size:14px;max-width:600px}',
    '.opener-figs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:26px;padding-top:18px;',
    'border-top:1px solid var(--pdf-rule)}',
    '.opener-figs span{display:block;font-size:7.8px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;',
    'color:var(--pdf-ink-muted);margin-bottom:4px}',
    '.opener-figs strong{font-family:var(--tone-font-display);font-size:24px;font-weight:800;letter-spacing:-.02em}',
    '.opener-figs small{display:block;font-size:8.6px;color:var(--pdf-ink-muted);margin-top:3px;line-height:1.4}',
    '.opener-toc{position:absolute;left:48px;right:48px;bottom:110px;border-top:1px solid var(--pdf-rule);',
    'padding-top:12px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;font-size:9px;',
    'color:var(--pdf-ink-muted);line-height:1.45}',
    '.opener-toc b{display:block;color:var(--pdf-ink);font-size:10px;font-weight:750;margin-bottom:2px}',
    '.img-duotone{width:698px;height:190px;border-radius:6px;margin-bottom:12px;display:flex;align-items:center;padding:0 26px}',
    '.img-duotone img,.img-duotone .tint,.img-duotone .scrim{position:absolute;inset:0}',
    '.pullquote{position:relative;z-index:2;font-family:var(--tone-font-display);font-size:18px;line-height:1.3;',
    'font-weight:700;letter-spacing:-.015em;color:#fff;max-width:400px}',
    '.img-rail{width:219px;height:260px;border-radius:6px;margin-top:4px}',
    '.img-inset{width:76px;height:76px;border-radius:8px;margin:0 auto 6px}',
    '.img-closing{position:absolute;left:0;bottom:0;width:794px;height:560px}',
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
