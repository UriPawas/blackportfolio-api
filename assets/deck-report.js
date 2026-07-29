/*!
 * deck-report.js — construye la PRESENTACIÓN interactiva del portafolio.
 *
 * Es el otro medio del mismo contrato de datos que el PDF, no el mismo
 * documento rotado (ver .claude/skills/portfolio-report-design/SKILL.md):
 *   PDF   = vertical, documento formal, prosa larga, tablas completas.
 *   Deck  = horizontal, escenario fijo de 1600×900, una idea por diapositiva,
 *           titular + cifra, con animaciones de entrada y gráficas dibujadas.
 *
 * Entrega un archivo .html AUTOCONTENIDO: CSS, renderers de gráficas, datos e
 * imágenes (data URI) van dentro, así que se puede abrir sin conexión ni
 * servidor. El tono se fija al generar; el artefacto NO lleva selector.
 *
 *   const { html } = await BPDeckReport.build(ctx);   // mismo ctx que el PDF
 */
(function (global) {
  'use strict';

  var STR = {
    es: {
      cover: 'Presentación de portafolio', period: 'Periodo', sessions: 'sesiones',
      valueEnd: 'Valor final', result: 'Resultado', ret: 'Retorno', capitalBase: 'Capital base',
      verdict: 'Diagnóstico', performance: 'Rendimiento', attribution: 'Atribución',
      movers: 'Qué movió a tus posiciones', composition: 'Composición', risk: 'Riesgo',
      activity: 'Actividad', close: 'Cierre',
      benchmark: 'Benchmark', excess: 'Exceso', alpha: 'alfa vs benchmark',
      openPnl: 'P/L abierto', realizedPnl: 'P/L realizado', dividends: 'Dividendos', commissions: 'Comisiones',
      sharpe: 'Sharpe', volatility: 'Volatilidad', maxDD: 'Caída máxima', beta: 'Beta',
      effHoldings: 'posiciones efectivas', topPos: 'Mayor posición', top3: 'Top 3',
      bestSession: 'Mejor sesión', worstSession: 'Peor sesión',
      contribution: 'Contribución', weight: 'peso', others: 'Otros',
      closedTrades: 'Operaciones cerradas', transactions: 'Operaciones',
      toPdf: 'El detalle completo está en el PDF',
      toPdfLede: 'Narrativa extendida, tablas completas, metodología y glosario.',
      legal: 'Documento informativo. No constituye asesoría de inversión.',
      photos: 'Fotografías: Pexels', noNews: 'Sin titular en la ventana: se explica con sus propias cifras.',
      solid: 'sólido', modest: 'modesto', weak: 'insuficiente',
      concHigh: 'alta', concMid: 'moderada', concLow: 'baja',
      of: 'de', noBench: 'Sin benchmark comparable en el rango'
    },
    en: {
      cover: 'Portfolio presentation', period: 'Period', sessions: 'sessions',
      valueEnd: 'Ending value', result: 'Result', ret: 'Return', capitalBase: 'Capital base',
      verdict: 'Verdict', performance: 'Performance', attribution: 'Attribution',
      movers: 'What moved your positions', composition: 'Composition', risk: 'Risk',
      activity: 'Activity', close: 'Closing',
      benchmark: 'Benchmark', excess: 'Excess', alpha: 'alpha vs benchmark',
      openPnl: 'Open P/L', realizedPnl: 'Realized P/L', dividends: 'Dividends', commissions: 'Commissions',
      sharpe: 'Sharpe', volatility: 'Volatility', maxDD: 'Max drawdown', beta: 'Beta',
      effHoldings: 'effective holdings', topPos: 'Largest position', top3: 'Top 3',
      bestSession: 'Best session', worstSession: 'Worst session',
      contribution: 'Contribution', weight: 'weight', others: 'Others',
      closedTrades: 'Closed trades', transactions: 'Transactions',
      toPdf: 'The full detail is in the PDF',
      toPdfLede: 'Extended narrative, complete tables, methodology and glossary.',
      legal: 'Informational document. Not investment advice.',
      photos: 'Photography: Pexels', noNews: 'No headline in the window: explained with its own figures.',
      solid: 'solid', modest: 'modest', weak: 'insufficient',
      concHigh: 'high', concMid: 'moderate', concLow: 'low',
      of: 'of', noBench: 'No comparable benchmark in the range'
    },
    fr: {
      cover: 'Présentation de portefeuille', period: 'Période', sessions: 'séances',
      valueEnd: 'Valeur finale', result: 'Résultat', ret: 'Rendement', capitalBase: 'Capital de base',
      verdict: 'Diagnostic', performance: 'Performance', attribution: 'Attribution',
      movers: 'Ce qui a bougé vos positions', composition: 'Composition', risk: 'Risque',
      activity: 'Activité', close: 'Clôture',
      benchmark: 'Indice', excess: 'Excédent', alpha: 'alpha vs indice',
      openPnl: 'P/L ouvert', realizedPnl: 'P/L réalisé', dividends: 'Dividendes', commissions: 'Commissions',
      sharpe: 'Sharpe', volatility: 'Volatilité', maxDD: 'Baisse maximale', beta: 'Bêta',
      effHoldings: 'positions effectives', topPos: 'Plus grande position', top3: 'Top 3',
      bestSession: 'Meilleure séance', worstSession: 'Pire séance',
      contribution: 'Contribution', weight: 'poids', others: 'Autres',
      closedTrades: 'Opérations clôturées', transactions: 'Opérations',
      toPdf: 'Le détail complet est dans le PDF',
      toPdfLede: 'Narration étendue, tableaux complets, méthodologie et glossaire.',
      legal: 'Document informatif. Ne constitue pas un conseil en investissement.',
      photos: 'Photographies : Pexels', noNews: 'Aucun titre dans la fenêtre : expliqué par ses propres chiffres.',
      solid: 'solide', modest: 'modeste', weak: 'insuffisant',
      concHigh: 'élevée', concMid: 'modérée', concLow: 'faible',
      of: 'sur', noBench: 'Pas d’indice comparable sur la plage'
    }
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function build(ctx) {
    var d = ctx.data, pf = ctx.portfolio;
    var lang = STR[ctx.lang] ? ctx.lang : 'es';
    var T = STR[lang], cur = d.currency, money = ctx.fmt.money;
    var LOC = lang === 'en' ? 'en-US' : lang === 'fr' ? 'fr-FR' : 'es-MX';
    var IMG = ctx.images || {}, NEWS = ctx.news || {};

    function pct(v, dg) { return v == null || !isFinite(v) ? '—' : (v > 0 ? '+' : '') + v.toFixed(dg == null ? 2 : dg) + '%'; }
    function pp(v) { return v == null || !isFinite(v) ? '—' : (v > 0 ? '+' : '') + v.toFixed(2) + ' pp'; }
    function amt(v) { return v == null || !isFinite(v) ? '—' : (v >= 0 ? '+' : '−') + money(Math.abs(v), cur); }
    function dateFull(iso) {
      if (!iso) return '—';
      try { return new Date(iso + 'T00:00:00').toLocaleDateString(LOC, { year: 'numeric', month: 'short', day: 'numeric' }); }
      catch (e) { return iso; }
    }

    /* ── cifras base (mismas reglas que el PDF) ───────────────────────── */
    var valueEnd = d.totalValueEnd, base = d.periodCapitalBase || d.totalCostEnd;
    var resultAmt = d.periodResultAmt != null ? d.periodResultAmt : (valueEnd - d.totalCostEnd);
    var resultPct = d.periodResultPct != null ? d.periodResultPct
      : (d.totalCostEnd > 0 ? resultAmt / d.totalCostEnd * 100 : null);
    var m = d.metrics || {}, positions = d.posData || [];
    var eq = d.equityCurve || [], bm = d.benchCurve || [];
    var hasBench = bm.length > 1 && bm.some(function (p) { return p.value !== 0; });
    var portRet = eq.length ? eq[eq.length - 1].value : null;
    var benchRet = hasBench ? bm[bm.length - 1].value : null;
    var active = hasBench && portRet != null ? portRet - benchRet : null;

    var weights = positions.filter(function (p) { return p.currentValuePf > 0; })
      .map(function (p) { return { ticker: p.pos.ticker, w: p.currentValuePf / valueEnd, val: p.currentValuePf }; })
      .sort(function (a, b) { return b.w - a.w; });
    var hhi = weights.reduce(function (s, x) { return s + x.w * x.w; }, 0);
    var effN = hhi > 0 ? 1 / hhi : 0;
    var top3 = weights.slice(0, 3).reduce(function (s, x) { return s + x.w; }, 0) * 100;
    var maxW = weights.length ? weights[0].w * 100 : 0;
    var concLabel = hhi > 0.25 ? T.concHigh : hhi > 0.15 ? T.concMid : T.concLow;
    var attrib = d.attribution || [];
    var upTop = (d.movers && d.movers.up) || [], downTop = (d.movers && d.movers.down) || [];

    /* ── datos de las gráficas (contrato de deck-charts.js) ───────────── */
    var DATA = {
      meta: { lang: lang, currency: cur },
      charts: {},
      spark: { value: eq.map(function (p) { return 100 + p.value; }) }
    };
    if (eq.length > 1) {
      DATA.charts.equity = {
        format: 'num', benchLabel: d.benchmarkLabel || T.benchmark,
        series: eq.map(function (p) { return { date: dateFull(p.iso), value: 100 + p.value }; }),
        bench: hasBench ? bm.map(function (p) { return { date: dateFull(p.iso), value: 100 + p.value }; }) : [],
        ddBand: d.drawdown ? { from: d.drawdown.peakIdx, to: d.drawdown.troughIdx } : null
      };
      var peak = -Infinity;
      DATA.charts.underwater = { series: eq.map(function (p) {
        peak = Math.max(peak, p.value);
        return { date: dateFull(p.iso), dd: +((1 + p.value / 100) / (1 + peak / 100) * 100 - 100).toFixed(2) };
      }) };
    }
    if (attrib.length) {
      var wfItems = attrib.slice(0, 6).map(function (a) {
        return { label: a.ticker, value: a.pnl, meta: pp(a.pp) };
      });
      var rest = attrib.slice(6).reduce(function (s, a) { return s + a.pnl; }, 0);
      if (attrib.length > 6) wfItems.push({ label: T.others + ' (' + (attrib.length - 6) + ')', value: rest, meta: '' });
      DATA.charts.waterfall = {
        format: 'money', start: { label: T.capitalBase, value: base }, end: { label: T.valueEnd, value: valueEnd },
        items: wfItems
      };
      DATA.charts.diverging = { format: 'pp', rows: attrib.map(function (a) {
        return { label: a.ticker, value: a.pp, meta: amt(a.pnl) };
      }) };
    }
    if (weights.length) {
      var slices = weights.slice(0, 5).map(function (x) { return { label: x.ticker, value: x.val }; });
      var restVal = weights.slice(5).reduce(function (s, x) { return s + x.val; }, 0);
      if (restVal > 0) slices.push({ label: T.others + ' (' + (weights.length - 5) + ')', value: restVal });
      DATA.charts.donut = { centerLabel: effN.toFixed(1) + ' ' + T.effHoldings, slices: slices };
    }
    var fx = Object.keys(d.fxExposure || {}).map(function (k) { return { label: k, value: d.fxExposure[k] }; })
      .sort(function (a, b) { return b.value - a.value; });
    if (fx.length > 1) DATA.charts.fx = { segments: fx };
    function gauge(v, min, max, display, label, verdict, bands) {
      return { value: v, min: min, max: max, display: display, label: label, verdict: verdict, bands: bands };
    }
    var G = [];
    if (m.sharpe != null) G.push(['gSharpe', gauge(m.sharpe, 0, 3, m.sharpe.toFixed(2), T.sharpe,
      m.sharpe > 1 ? T.solid : m.sharpe > 0 ? T.modest : T.weak,
      [{ from: 0, to: 1, color: '#c0392b' }, { from: 1, to: 2, color: '#c9a227' }, { from: 2, to: 3, color: '#1a7f4b' }])]);
    if (m.volatility != null) G.push(['gVol', gauge(m.volatility, 0, 40, m.volatility.toFixed(1) + '%', T.volatility,
      m.volatility > 25 ? T.concHigh : m.volatility > 15 ? T.concMid : T.concLow,
      [{ from: 0, to: 15, color: '#1a7f4b' }, { from: 15, to: 25, color: '#c9a227' }, { from: 25, to: 40, color: '#c0392b' }])]);
    if (m.maxDD != null) G.push(['gDD', gauge(Math.abs(m.maxDD), 0, 40, '−' + Math.abs(m.maxDD).toFixed(1) + '%', T.maxDD, '',
      [{ from: 0, to: 10, color: '#1a7f4b' }, { from: 10, to: 20, color: '#c9a227' }, { from: 20, to: 40, color: '#c0392b' }])]);
    if (m.beta != null) G.push(['gBeta', gauge(m.beta, 0, 2, m.beta.toFixed(2), T.beta, '',
      [{ from: 0, to: .8, color: '#1a7f4b' }, { from: .8, to: 1.2, color: '#c9a227' }, { from: 1.2, to: 2, color: '#c0392b' }])]);
    G.forEach(function (g) { DATA.charts[g[0]] = g[1]; });
    DATA.movers = upTop.concat(downTop).map(function (mv) {
      var p = positions.filter(function (x) { return x.pos.ticker === mv.ticker; })[0];
      return { spark: (p && p.series) || [] };
    });

    /* ── diapositivas ─────────────────────────────────────────────────── */
    var S = [], nCharts = 0;
    function chart(type, key, style) {
      nCharts++;
      return '<div data-chart="' + type + '" data-key="' + key + '"' + (style ? ' style="' + style + '"' : '') + '></div>';
    }
    function slide(html, cls) { S.push('<section class="slide' + (cls ? ' ' + cls : '') + '" data-slide>' + html + '</section>'); }
    function chrome(sec, n) {
      return '<div class="chrome"><span class="eyebrow">' + esc(sec) + '</span>' +
             '<span class="eyebrow" style="opacity:.5">' + esc(pf.name) + ' · ' + esc(d.startStr) + ' → ' + esc(d.endStr) + '</span></div>';
    }
    function head(sec, headline, lede) {
      return chrome(sec) +
        '<div class="eyebrow">' + esc(sec) + '</div>' +
        '<h2 class="headline"><span class="ln"><span>' + headline + '</span></span></h2>' +
        '<div class="rule"></div>' + (lede ? '<p class="lede">' + lede + '</p>' : '');
    }

    /* 1 · portada */
    slide(
      (IMG.cover && IMG.cover.src
        ? '<img src="' + IMG.cover.src + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(.2)">' +
          '<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(12,14,22,.92) 45%,rgba(12,14,22,.35))"></div>'
        : '<div style="position:absolute;inset:0;background:var(--tone-bg)"></div>') +
      '<div style="position:absolute;left:72px;top:50%;transform:translateY(-50%);color:#fff;max-width:900px">' +
        '<div class="eyebrow" style="color:#fff;opacity:.75">' + esc(T.cover) + '</div>' +
        '<h1 class="headline" style="font-size:104px;color:#fff;max-width:16ch;margin-top:18px">' +
          '<span class="ln"><span>' + esc(pf.name) + '</span></span></h1>' +
        '<div class="rule" style="background:#fff"></div>' +
        '<p class="lede" style="color:rgba(255,255,255,.8)">' + esc(dateFull(d.startStr)) + ' – ' +
          esc(dateFull(d.endStr)) + ' · ' + d.sessions + ' ' + T.sessions + '</p>' +
        '<div style="display:flex;gap:56px;margin-top:44px">' +
          '<div><div class="label" style="color:rgba(255,255,255,.65)">' + T.valueEnd + '</div>' +
            '<div class="num" style="font-size:64px;font-weight:800;color:#fff">' + money(valueEnd, cur) + '</div></div>' +
          '<div><div class="label" style="color:rgba(255,255,255,.65)">' + T.result + '</div>' +
            '<div class="num" style="font-size:64px;font-weight:800;color:var(--tone-' + (resultAmt >= 0 ? 'up' : 'down') + ')">' +
            amt(resultAmt) + '</div></div>' +
          '<div><div class="label" style="color:rgba(255,255,255,.65)">' + T.ret + '</div>' +
            '<div class="num" style="font-size:64px;font-weight:800;color:var(--tone-' + (resultPct >= 0 ? 'up' : 'down') + ')">' +
            pct(resultPct) + '</div></div>' +
        '</div>' +
      '</div>' +
      (IMG.cover && IMG.cover.by ? '<div class="src" style="position:absolute;right:20px;bottom:16px;color:rgba(255,255,255,.6)">Foto: ' + esc(IMG.cover.by) + ' · Pexels</div>' : ''),
      'pad0');

    /* 2 · veredicto */
    var verdictLine = weights.length && top3 > 50
      ? (lang === 'en' ? 'Concentration, not the market, defined the period'
        : lang === 'fr' ? 'La concentration, pas le marché, a défini la période'
        : 'La concentración, no el mercado, definió el periodo')
      : (resultAmt >= 0
        ? (lang === 'en' ? 'The portfolio closed the period in positive territory'
          : lang === 'fr' ? 'Le portefeuille a clôturé la période en positif'
          : 'El portafolio cerró el periodo en positivo')
        : (lang === 'en' ? 'The period closed negative' : lang === 'fr' ? 'La période s’est clôturée en négatif'
          : 'El periodo cerró en negativo'));
    slide(head(T.verdict, esc(verdictLine),
        esc(pf.name) + ' · ' + amt(resultAmt) + ' (' + pct(resultPct) + ') ' + T.of + ' ' + money(base, cur) +
        (active != null ? ' · ' + pp(active) + ' ' + T.alpha : '')) +
      '<div class="kpis" style="margin-top:46px">' +
        kpi(T.valueEnd, money(valueEnd, cur)) +
        kpi(T.result, amt(resultAmt), resultAmt >= 0 ? 'up' : 'down') +
        kpi(T.ret, pct(resultPct), resultPct >= 0 ? 'up' : 'down') +
        (active != null ? kpi(T.excess, pp(active), active >= 0 ? 'up' : 'down')
                        : kpi(T.capitalBase, money(base, cur))) +
      '</div>' +
      '<div class="foot">' + esc(T.legal) + '</div>');

    function kpi(label, value, tone) {
      return '<div class="kpi" data-reveal><div class="label">' + esc(label) + '</div>' +
             '<div class="num" style="font-size:68px;font-weight:800' +
             (tone ? ';color:var(--tone-' + tone + ')' : '') + '">' + value + '</div></div>';
    }

    /* 3 · rendimiento */
    if (DATA.charts.equity) {
      slide(head(T.performance,
          hasBench
            ? esc((active >= 0 ? (lang === 'en' ? 'Ahead of ' : lang === 'fr' ? 'Devant ' : 'Por encima de ')
                               : (lang === 'en' ? 'Behind ' : lang === 'fr' ? 'Derrière ' : 'Por debajo de ')) +
                  (d.benchmarkLabel || T.benchmark)) + ' <em>' + pp(active) + '</em>'
            : esc(T.performance) + ' <em>' + pct(portRet) + '</em>',
          d.bestSession && d.worstSession
            ? T.bestSession + ' ' + pct(d.bestSession.pct) + ' · ' + T.worstSession + ' ' + pct(d.worstSession.pct)
            : '') +
        '<div style="display:grid;grid-template-columns:1fr 330px;gap:34px;margin-top:30px;align-items:start">' +
          chart('area', 'charts.equity', 'height:420px') +
          '<div>' +
            statRow(T.ret, pct(portRet)) +
            (hasBench ? statRow(T.benchmark, pct(benchRet)) : '') +
            (active != null ? statRow(T.excess, pp(active)) : '') +
            statRow(T.sessions, String(d.sessions)) +
          '</div>' +
        '</div>' +
        '<div class="foot">' + (hasBench ? '' : esc(T.noBench)) + '</div>');
    }
    function statRow(l, v) {
      return '<div data-reveal style="display:flex;justify-content:space-between;align-items:baseline;' +
             'padding:14px 0;border-bottom:1px solid rgba(0,0,0,.08)">' +
             '<span class="label">' + esc(l) + '</span>' +
             '<span class="num" style="font-size:30px;font-weight:700">' + v + '</span></div>';
    }

    /* 4 · atribución */
    if (DATA.charts.waterfall) {
      slide(head(T.attribution,
          upTop.length
            ? esc(upTop[0].ticker) + ' <em>' + pp(upTop[0].pp) + '</em> ' +
              (lang === 'en' ? 'led the period' : lang === 'fr' ? 'a mené la période' : 'lideró el periodo')
            : esc(T.attribution),
          lang === 'en' ? 'From capital base to ending value, position by position.'
            : lang === 'fr' ? 'Du capital de base à la valeur finale, position par position.'
            : 'Del capital base al valor final, posición por posición.') +
        chart('waterfall', 'charts.waterfall', 'height:430px;margin-top:26px'));
    }
    if (DATA.charts.diverging) {
      slide(head(T.attribution,
          (lang === 'en' ? 'Winners and losers' : lang === 'fr' ? 'Gagnants et perdants' : 'Ganadores y perdedores') +
          ' <em>' + (lang === 'en' ? 'in pp' : lang === 'fr' ? 'en pp' : 'en pp') + '</em>', '') +
        chart('diverging', 'charts.diverging', 'height:440px;margin-top:22px'));
    }

    /* 5 · movers */
    var moverList = upTop.concat(downTop);
    if (moverList.length) {
      var cards = moverList.slice(0, 3).map(function (mv, i) {
        var p = positions.filter(function (x) { return x.pos.ticker === mv.ticker; })[0];
        var w = weights.filter(function (x) { return x.ticker === mv.ticker; })[0];
        var news = (NEWS[mv.ticker] || [])[0];
        var up = mv.pp >= 0;
        return '<div class="card" data-reveal style="--d:' + (0.5 + i * 0.08) + 's">' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<span class="tk">' + esc(mv.ticker) + '</span>' +
            '<span class="chip ' + (up ? 'up' : 'down') + '">' + (up ? '▲' : '▼') + ' ' + pp(mv.pp) + '</span></div>' +
          '<div class="pp num" style="color:var(--tone-' + (up ? 'up' : 'down') + ')">' + amt(mv.pnl) + '</div>' +
          '<div style="height:44px">' + chart('sparkline', 'movers.' + i + '.spark') + '</div>' +
          '<ul>' +
            (news ? '<li><b>' + esc(news.source || '') + (news.date ? ' · ' + esc(dateFull(news.date)) : '') + '</b> — ' +
                    esc(news.title) + '</li>'
                  : '<li>' + esc(T.noNews) + '</li>') +
            '<li>' + (up ? (lang === 'en' ? 'Added ' : lang === 'fr' ? 'A apporté ' : 'Aportó ')
                         : (lang === 'en' ? 'Subtracted ' : lang === 'fr' ? 'A retiré ' : 'Restó ')) +
              '<strong>' + money(Math.abs(mv.pnl), cur) + '</strong> · ' + pp(mv.pp) + '</li>' +
            (w ? '<li>' + T.weight + ' <strong>' + (w.w * 100).toFixed(1) + '%</strong></li>' : '') +
          '</ul></div>';
      }).join('');
      slide(head(T.movers,
          (lang === 'en' ? 'Each move, with its cause and its effect on your money'
            : lang === 'fr' ? 'Chaque mouvement, avec sa cause et son effet sur votre argent'
            : 'Cada movimiento, con su causa y su efecto en tu dinero'), '') +
        '<div class="cards3" style="margin-top:26px">' + cards + '</div>' +
        '<div class="foot">' + (Object.keys(NEWS).length
          ? (lang === 'en' ? 'Headlines via the market data provider, limited to the report window.'
            : lang === 'fr' ? 'Titres via le fournisseur de données, limités à la fenêtre du rapport.'
            : 'Titulares vía el proveedor de datos, limitados a la ventana del reporte.')
          : esc(T.noNews)) + '</div>');
    }

    /* 6 · composición */
    if (DATA.charts.donut) {
      slide(head(T.composition,
          maxW > 20
            ? esc(weights[0].ticker) + ' <em>' + maxW.toFixed(1) + '%</em> ' +
              (lang === 'en' ? 'of the portfolio' : lang === 'fr' ? 'du portefeuille' : 'del portafolio')
            : esc(T.composition) + ' <em>' + concLabel + '</em>',
          T.top3 + ' ' + top3.toFixed(1) + '% · HHI ' + hhi.toFixed(3) + ' · ' + effN.toFixed(1) + ' ' + T.effHoldings) +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:24px;align-items:center">' +
          chart('donut', 'charts.donut', 'height:400px') +
          '<div>' + statRow(T.topPos, esc(weights[0].ticker) + ' · ' + maxW.toFixed(1) + '%') +
            statRow(T.top3, top3.toFixed(1) + '%') +
            statRow(T.effHoldings, effN.toFixed(1)) +
            (DATA.charts.fx ? '<div style="margin-top:20px">' + chart('stacked', 'charts.fx', 'height:110px') + '</div>' : '') +
          '</div>' +
        '</div>');
    }

    /* 7 · riesgo */
    if (G.length) {
      slide(head(T.risk,
          m.sharpe != null
            ? T.sharpe + ' <em>' + m.sharpe.toFixed(2) + '</em> · ' +
              (m.sharpe > 1 ? T.solid : m.sharpe > 0 ? T.modest : T.weak)
            : esc(T.risk),
          d.drawdown
            ? (lang === 'en' ? 'Deepest drawdown ' : lang === 'fr' ? 'Baisse maximale ' : 'Caída máxima ') +
              pct(d.drawdown.depthPct) + ' (' + money(d.drawdown.depthAmt, cur) + ')' : '') +
        '<div class="gauges" style="margin-top:30px">' +
          G.map(function (g) { return '<div data-reveal>' + chart('gauge', 'charts.' + g[0], 'height:230px') + '</div>'; }).join('') +
        '</div>' +
        (DATA.charts.underwater ? chart('underwater', 'charts.underwater', 'height:230px;margin-top:20px') : ''));
    }

    /* 8 · cierre */
    slide(
      (IMG.closing && IMG.closing.src
        ? '<img src="' + IMG.closing.src + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(.2)">' +
          '<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(12,14,22,.92) 45%,rgba(12,14,22,.4))"></div>'
        : '<div style="position:absolute;inset:0;background:var(--tone-bg)"></div>') +
      '<div style="position:absolute;left:72px;top:50%;transform:translateY(-50%);color:#fff;max-width:900px">' +
        '<h2 class="headline" style="font-size:64px;color:#fff"><span class="ln"><span>' + esc(T.toPdf) + '</span></span></h2>' +
        '<div class="rule" style="background:#fff"></div>' +
        '<p class="lede" style="color:rgba(255,255,255,.8)">' + esc(T.toPdfLede) + '</p>' +
        '<p class="label" style="color:rgba(255,255,255,.55);margin-top:34px">' + esc(T.legal) +
        (Object.keys(IMG).length ? ' · ' + esc(T.photos) : '') + '</p>' +
      '</div>', 'pad0');

    /* ── documento autocontenido ──────────────────────────────────────── */
    var base_ = (ctx.assets || 'assets/');
    var css = await fetch(base_ + 'deck-report.css?v=1').then(function (r) { return r.text(); });
    var chartsJs = await fetch(base_ + 'deck-charts.js?v=1').then(function (r) { return r.text(); });

    var html = '<!DOCTYPE html><html lang="' + lang + '" data-tone="' + (ctx.tone || 'brand') + '"><head>' +
      '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + esc(pf.name) + ' — ' + esc(T.cover) + '</title>' +
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
      '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">' +
      '<style>' + css + EXTRA_CSS + '</style></head><body>' +
      '<div class="deck"><div class="stage" id="stage">' + S.join('') + '</div>' +
      '<div class="nav"><button id="prev" aria-label="anterior">‹</button>' +
      '<div class="dots" id="dots"></div><button id="next" aria-label="siguiente">›</button>' +
      '<span class="count" id="count"></span></div>' +
      '<div class="progress"><i id="progress"></i></div></div>' +
      '<script>' + chartsJs + '<\/script>' +
      '<script>var DECK_DATA=' + JSON.stringify(DATA) + ';' + RUNTIME + '<\/script>' +
      '</body></html>';

    return { html: html, slides: S.length, charts: nCharts };
  }

  /* Estilos que el deck necesita además de los del escenario. */
  var EXTRA_CSS = [
    '.chrome{position:absolute;left:72px;right:72px;top:34px;display:flex;justify-content:space-between}',
    '.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:26px}',
    '.kpi{padding:22px 0;border-top:3px solid var(--tone-accent)}',
    '.cards3{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}',
    '.card{background:var(--tone-panel);border-radius:14px;padding:22px}',
    '.card .tk{font-family:var(--tone-font-display);font-size:30px;font-weight:800}',
    '.card .pp{font-size:34px;font-weight:800;margin:6px 0 4px}',
    '.card ul{list-style:none;padding:0;margin:10px 0 0;font-size:17px;line-height:1.45}',
    '.card li{margin-bottom:8px;color:var(--tone-text-muted)}',
    '.card li b{color:var(--tone-text)}',
    '.chip{font-size:16px;font-weight:700;padding:4px 10px;border-radius:20px}',
    '.chip.up{background:rgba(18,153,107,.14);color:var(--tone-up)}',
    '.chip.down{background:rgba(224,72,61,.14);color:var(--tone-down)}',
    '.gauges{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}',
    '.foot{position:absolute;left:72px;right:72px;bottom:34px;font-size:14px;color:var(--tone-footnote-color)}',
    '.src{font-size:14px}',
    '[data-reveal]{opacity:0;transform:translateY(14px);transition:opacity .5s ease var(--d,.5s),transform .5s ease var(--d,.5s)}',
    '.is-active [data-reveal]{opacity:1;transform:none}',
    '.nav{position:fixed;left:0;right:0;bottom:26px;display:flex;gap:16px;align-items:center;justify-content:center;z-index:5}',
    '.nav button{width:46px;height:46px;border-radius:50%;border:0;background:rgba(255,255,255,.12);color:#fff;font-size:24px;cursor:pointer}',
    '.nav button.pulse{animation:pulse 1.4s infinite}',
    '@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}',
    '.dots{display:flex;gap:8px}.dots i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.28);cursor:pointer}',
    '.dots i.on{background:#fff;width:22px;border-radius:4px}',
    '.count{color:rgba(255,255,255,.5);font-size:14px;font-variant-numeric:tabular-nums}',
    '.progress{position:fixed;left:0;top:0;height:3px;width:100%;background:rgba(255,255,255,.1);z-index:5}',
    '.progress i{display:block;height:100%;width:0;background:var(--tone-accent);transition:width .4s ease}',
    '@media (prefers-reduced-motion:reduce){.slide,[data-reveal],.rule,.headline .ln>span{transition:none!important}',
    '[data-reveal]{opacity:1;transform:none}}'
  ].join('');

  /* Runtime del deck: escenario, navegación, count-up y disparo de gráficas.
     Adaptado de assets/deck-shell.html de la skill (sin la capa `data-t`: aquí
     el texto ya viene escrito en el markup generado). */
  var RUNTIME = [
    '(function(){',
    'var slides=[].slice.call(document.querySelectorAll("[data-slide]"));',
    'var idx=0,lock=false,idleTimer;',
    'BPDeckCharts.configure({locale:DECK_DATA.meta.lang==="en"?"en-US":DECK_DATA.meta.lang==="fr"?"fr-FR":"es-MX",currency:DECK_DATA.meta.currency});',
    'function fit(){document.documentElement.style.setProperty("--fit",Math.min(innerWidth/1600,innerHeight/900).toFixed(4));}',
    'addEventListener("resize",fit);fit();',
    'function dig(p){return p.split(".").reduce(function(o,k){return o?o[k]:undefined;},DECK_DATA);}',
    'document.querySelectorAll("[data-chart]").forEach(function(n){',
    ' var t=n.getAttribute("data-chart"),data=dig(n.getAttribute("data-key"));',
    ' if(t==="sparkline")data={values:Array.isArray(data)?data:(data&&data.values)||[]};',
    ' if(data)try{BPDeckCharts.mount(n,t,data);}catch(e){}});',
    'var dots=document.getElementById("dots");',
    'slides.forEach(function(_,i){var b=document.createElement("i");b.addEventListener("click",function(){go(i);});dots.appendChild(b);});',
    'function pad(n){return String(n).padStart(2,"0");}',
    'function go(n){n=Math.max(0,Math.min(slides.length-1,n));',
    ' slides.forEach(function(s,i){s.classList.toggle("is-active",i===n);s.classList.toggle("is-prev",i<n);});',
    ' [].slice.call(dots.children).forEach(function(x,i){x.classList.toggle("on",i===n);});',
    ' document.getElementById("progress").style.width=((n+1)/slides.length*100)+"%";',
    ' document.getElementById("count").textContent=pad(n+1)+" / "+pad(slides.length);',
    ' idx=n;history.replaceState(null,"","#"+(n+1));',
    ' setTimeout(function(){slides[n].querySelectorAll("[data-chart]").forEach(function(c){if(c._play)c._play();});},340);',
    ' clearTimeout(idleTimer);document.getElementById("next").classList.remove("pulse");',
    ' idleTimer=setTimeout(function(){document.getElementById("next").classList.add("pulse");},4000);}',
    'document.getElementById("next").addEventListener("click",function(){go(idx+1);});',
    'document.getElementById("prev").addEventListener("click",function(){go(idx-1);});',
    'addEventListener("keydown",function(e){',
    ' if(["ArrowRight","PageDown"," "].indexOf(e.key)>=0){e.preventDefault();go(idx+1);}',
    ' if(["ArrowLeft","PageUp"].indexOf(e.key)>=0){e.preventDefault();go(idx-1);}',
    ' if(e.key==="Home")go(0);if(e.key==="End")go(slides.length-1);});',
    'addEventListener("wheel",function(e){if(lock||Math.abs(e.deltaY)<18)return;lock=true;',
    ' setTimeout(function(){lock=false;},700);go(idx+(e.deltaY>0?1:-1));},{passive:true});',
    'var tx=0;addEventListener("touchstart",function(e){tx=e.touches[0].clientX;},{passive:true});',
    'addEventListener("touchend",function(e){var dx=e.changedTouches[0].clientX-tx;',
    ' if(Math.abs(dx)>60)go(idx+(dx<0?1:-1));},{passive:true});',
    'go(Math.max(0,(parseInt(location.hash.slice(1),10)||1)-1));',
    '})();'
  ].join('\n');

  global.BPDeckReport = { build: build, strings: STR };
})(window);
