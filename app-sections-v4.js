/* ==========================================================================
   BlackPortfolio — datos y renderizado de las secciones de la app v4

   Un solo archivo para las seis pantallas restantes. Se reparte por
   `document.body.dataset.section`, y todas comparten la MISMA cartera de
   muestra: la cifra que ves en el escritorio es la que verás en el Tracker.
   Sólo presentación; el comportamiento común vive en `app-ui-v4.js`.
   ========================================================================== */

(function () {
  'use strict';

  var U = window.BPUI;
  var $ = U.$, $$ = U.$$;
  var SECTION = document.body.dataset.section;

  /* ═════════════════════════════════════ Cartera de muestra compartida    */

  var POSITIONS = [
    { t: 'VOO',        name: 'Vanguard S&P 500 ETF', klass: 'ETF',    sector: 'Diversificado',   qty: 42,   avg: 402.15,   px: 511.40,   day: 0.62,  seed: 11 },
    { t: 'AAPL',       name: 'Apple Inc.',           klass: 'Acción', sector: 'Tecnología',      qty: 60,   avg: 168.90,   px: 214.05,   day: 1.18,  seed: 23 },
    { t: 'MSFT',       name: 'Microsoft Corp.',      klass: 'Acción', sector: 'Tecnología',      qty: 28,   avg: 289.40,   px: 424.80,   day: 0.44,  seed: 37 },
    { t: 'NVDA',       name: 'NVIDIA Corp.',         klass: 'Acción', sector: 'Semiconductores', qty: 35,   avg: 44.20,    px: 118.60,   day: 3.85,  seed: 51 },
    { t: 'BTC-USD',    name: 'Bitcoin',              klass: 'Cripto', sector: 'Cripto',          qty: 0.42, avg: 38900.00, px: 61240.00, day: 2.55,  seed: 67 },
    { t: 'NAFTRAC.MX', name: 'NAFTRAC · IPC',        klass: 'ETF',    sector: 'Diversificado',   qty: 1800, avg: 2.85,     px: 3.06,     day: -0.16, seed: 83 }
  ];
  POSITIONS.forEach(function (p) {
    p.cost = p.qty * p.avg;
    p.value = p.qty * p.px;
    p.ret = (p.px / p.avg - 1) * 100;
  });
  var TOTAL_VALUE = POSITIONS.reduce(function (a, p) { return a + p.value; }, 0);

  var WATCHLIST = [
    { t: 'AAPL', name: 'Apple Inc.',       px: 214.05,  day: 1.18 },
    { t: 'TSLA', name: 'Tesla Inc.',       px: 246.80,  day: -1.42 },
    { t: 'SPY',  name: 'SPDR S&P 500',     px: 556.10,  day: 0.58 },
    { t: 'ETH-USD', name: 'Ethereum',      px: 3218.40, day: 3.11 },
    { t: 'GLD',  name: 'SPDR Gold Shares', px: 227.35,  day: -0.24 },
    { t: 'NVDA', name: 'NVIDIA Corp.',     px: 118.60,  day: 3.85 }
  ];

  var VALUE_SERIES = U.walk(180, 7, 63704.53, 85008.65, 1.0);

  var NEWS = [
    { t: 'AAPL', h: 'Apple sube el dividendo trimestral a 0.27 dólares por acción', s: 'Reuters', w: 'hace 4 horas' },
    { t: 'NVDA', h: 'La demanda de centros de datos sostiene el trimestre de NVIDIA', s: 'Bloomberg', w: 'hace 9 horas' },
    { t: 'BTC-USD', h: 'El flujo neto a los ETF de bitcoin al contado suma seis semanas al alza', s: 'CoinDesk', w: 'ayer' },
    { t: 'MSFT', h: 'Microsoft cierra la compra de una firma de seguridad en la nube', s: 'The Verge', w: 'ayer' },
    { t: 'VOO', h: 'El S&P 500 encadena su tercera semana en verde pese a la macro', s: 'Financial Times', w: 'hace 2 días' }
  ];

  function newsHtml(rows) {
    return rows.map(function (n) {
      return '<li><a href="#" onclick="return false">' + U.esc(n.h) + '</a>' +
        '<span class="news__meta"><span class="news__tk">' + U.esc(n.t) + '</span>' +
        '<span>' + U.esc(n.s) + '</span><span>' + U.esc(n.w) + '</span></span></li>';
    }).join('');
  }

  function badge(t) { return '<span class="tk__badge" aria-hidden="true">' + U.esc(t.slice(0, 2)) + '</span>'; }

  /* Matriz tintada: el valor va impreso, el color acompaña. La intensidad se
     entrega como `--m` y el CSS le aplica el tope del tema. */
  function matrix(keys, rows, fmt, scale) {
    var head = '<tr><th scope="col"></th>' + keys.map(function (k) { return '<th scope="col">' + U.esc(k) + '</th>'; }).join('') + '</tr>';
    var body = rows.map(function (row, i) {
      return '<tr><th scope="row">' + U.esc(keys[i]) + '</th>' + row.map(function (v, j) {
        if (i === j && scale === 'corr') return '<td class="is-self">—</td>';
        var m = scale === 'corr' ? Math.min(Math.abs(v), 1) : Math.min(Math.abs(v - scale.mid) / scale.span, 1);
        var up = scale === 'corr' ? v >= 0 : v >= scale.mid;
        return '<td class="tint' + (up ? '' : ' tint--neg') + '" style="--m:' + m.toFixed(3) + '">' + fmt(v) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return '<table class="corr"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>';
  }

  /* ═══════════════════════════════════════════════════ 1. Resumen         */

  function home() {
    U.register($('#homeSpark'), function (ctx, w, h) {
      var lo = Math.min.apply(null, VALUE_SERIES), hi = Math.max.apply(null, VALUE_SERIES);
      var pad = { l: 0, r: 0, t: 8, b: 0 };
      var pts = U.plot(VALUE_SERIES, w, h, pad, lo, hi);
      U.fillUnder(ctx, pts, h, pad, U.alpha(U.T['cobalt-line'], U.T.dark ? 0.14 : 0.09));
      U.stroke(ctx, pts, U.T['cobalt-line'], 1);
    });

    var aapl = U.walk(120, 23, 178.4, 214.05, 1.0);
    U.register($('#homeChartAapl'), function (ctx, w, h) {
      var pad = { l: 40, r: 8, t: 8, b: 16 }, b = U.bounds(aapl);
      U.axes(ctx, w, h, pad, b[0], b[1], U.moneyK, 3);
      var pts = U.plot(aapl, w, h, pad, b[0], b[1]);
      U.fillUnder(ctx, pts, h, pad, U.alpha(U.T['cobalt-line'], 0.12));
      U.stroke(ctx, pts, U.T['cobalt-line'], 1.75);
    });

    var divRows = [
      { lab: 'ago', v: 61.4 }, { lab: 'sep', v: 24.1 }, { lab: 'oct', v: 96.3 }, { lab: 'nov', v: 18.4 },
      { lab: 'dic', v: 88.7 }, { lab: 'ene', v: 42.9 }, { lab: 'feb', v: 15.6 }, { lab: 'mar', v: 79.2 },
      { lab: 'abr', v: 96.1 }, { lab: 'may', v: 33.8 }, { lab: 'jun', v: 91.4 }, { lab: 'jul', v: 77.3 }
    ];
    U.register($('#homeDivChart'), function (ctx, w, h) {
      U.columns(ctx, w, h, divRows, { l: 34, r: 6, t: 6, b: 16 }, { fmt: function (v) { return '$' + v.toFixed(0); }, ticks: 2 });
    });

    $('#homeWatchlist').innerHTML = WATCHLIST.slice(0, 6).map(function (a) {
      return '<tr><th scope="row" class="th-freeze"><span class="tk">' + badge(a.t) +
        '<span class="tk__sym">' + U.esc(a.t) + '</span></span></th>' +
        '<td class="n">' + U.money(a.px) + '</td>' +
        '<td class="n ' + U.cls(a.day) + '"><span class="' + U.arrow(a.day) + '">' + U.pct(a.day) + '</span></td></tr>';
    }).join('');

    var sectors = [
      { k: 'Tecnología', w: 26, d: 1.42 }, { k: 'Salud', w: 18, d: 0.86 }, { k: 'Financiero', w: 16, d: -0.34 },
      { k: 'Consumo', w: 14, d: 0.21 }, { k: 'Energía', w: 12, d: -1.18 }, { k: 'Industrial', w: 14, d: 0.55 }
    ];
    $('#homeSectors').innerHTML = sectors.map(function (s) {
      var mag = Math.min(0.3 + Math.abs(s.d) / 2 * 0.7, 1);
      return '<div class="treemap__cell tint tint--' + (s.d >= 0 ? 'pos' : 'neg') + '" ' +
        'style="grid-column:span ' + Math.max(2, Math.round(s.w / 100 * 12)) + ';--m:' + mag.toFixed(3) + '" ' +
        'title="' + U.esc(s.k) + ' ' + U.pct(s.d) + '">' +
        '<b>' + U.esc(s.k) + '</b><span>' + U.pct(s.d) + '</span></div>';
    }).join('');

    $('#homeAgenda').innerHTML = [
      ['31 jul', 'Reporte trimestral', 'AAPL'],
      ['04 ago', 'Dividendo ex-date', 'MSFT'],
      ['08 ago', 'Inflación de EE. UU.', 'Macro'],
      ['14 ago', 'Renovación del plan', 'Cuenta'],
      ['22 ago', 'Reporte trimestral', 'NVDA']
    ].map(function (r) {
      return '<li><time>' + r[0] + '</time><b>' + r[1] + '</b><span>' + r[2] + '</span></li>';
    }).join('');

    $('#homeNews').innerHTML = newsHtml(NEWS);

    // Espacios: sólo cambian el rótulo; el lienzo es el mismo en el prototipo.
    U.wireTabs($('#hubTabs'));
    protoStates(function (state) {
      var canvas = $('#hubCanvas'), empty = $('#hubEmpty');
      canvas.hidden = state === 'empty';
      empty.hidden = state !== 'empty';
      $$('.card', canvas).forEach(function (c) { c.classList.toggle('is-loading', state === 'loading'); });
      $$('.card__body', canvas).forEach(function (b) {
        b.style.opacity = state === 'loading' ? '.35' : '';
      });
      if (state === 'error') {
        $('#homeWatchlist').innerHTML = '<tr><td colspan="3" style="height:auto;padding:.8rem .7rem;white-space:normal">' +
          'Yahoo Finance no respondió. <button type="button" class="btn-text" id="wlRetry">Reintentar</button></td></tr>';
      } else if (state === 'normal') {
        home.rerender();
      }
    });
    home.rerender = function () {
      $('#homeWatchlist').innerHTML = WATCHLIST.slice(0, 6).map(function (a) {
        return '<tr><th scope="row" class="th-freeze"><span class="tk">' + badge(a.t) +
          '<span class="tk__sym">' + U.esc(a.t) + '</span></span></th>' +
          '<td class="n">' + U.money(a.px) + '</td>' +
          '<td class="n ' + U.cls(a.day) + '"><span class="' + U.arrow(a.day) + '">' + U.pct(a.day) + '</span></td></tr>';
      }).join('');
    };
  }

  /* ═══════════════════════════════════════════════════ 2. Top-down        */

  var SECTORS = [
    { k: 'Salud',        r: 4.8,  rel: 2.6,  vol: 11.2, sh: 1.42, fav: true },
    { k: 'Consumo básico', r: 3.9, rel: 1.7, vol: 9.4,  sh: 1.55, fav: true },
    { k: 'Servicios públicos', r: 3.1, rel: 0.9, vol: 10.1, sh: 1.18, fav: true },
    { k: 'Tecnología',   r: 6.4,  rel: -0.4, vol: 21.8, sh: 0.94, fav: false },
    { k: 'Industrial',   r: 2.4,  rel: 0.2,  vol: 14.6, sh: 0.71, fav: false },
    { k: 'Financiero',   r: 1.1,  rel: -1.1, vol: 16.2, sh: 0.38, fav: false },
    { k: 'Energía',      r: -2.6, rel: -4.8, vol: 24.3, sh: -0.22, fav: false },
    { k: 'Consumo discrecional', r: -1.4, rel: -3.6, vol: 19.1, sh: -0.08, fav: false }
  ];

  function topdown() {
    var MACRO = [
      { k: 'Tasa de fondos federales', last: '4.25%', prev: '4.50%', chg: -0.25, read: 'Primer recorte del ciclo', up: false, seed: 5 },
      { k: 'Inflación subyacente',     last: '2.7%',  prev: '2.9%',  chg: -0.20, read: 'Cediendo hacia el objetivo', up: false, seed: 9 },
      { k: 'Desempleo',                last: '4.4%',  prev: '4.2%',  chg: 0.20,  read: 'Al alza: mercado laboral se afloja', up: true, seed: 13 },
      { k: 'Curva 10a − 2a',           last: '−0.42', prev: '−0.58', chg: 0.16,  read: 'Sigue invertida, pero se corrige', up: true, seed: 17 },
      { k: 'PIB trimestral anualizado', last: '1.6%', prev: '2.4%',  chg: -0.80, read: 'Desaceleración clara', up: false, seed: 21 },
      { k: 'Índice del dólar (DXY)',   last: '101.4', prev: '103.2', chg: -1.80, read: 'Debilitamiento moderado', up: false, seed: 25 }
    ];
    $('#tdMacroGrid tbody').innerHTML = MACRO.map(function (m) {
      return '<tr><th scope="row" class="th-freeze">' + U.esc(m.k) + '</th>' +
        '<td class="th-spark">' + U.spark(m.seed, m.up) + '</td>' +
        '<td class="n">' + m.last + '</td><td class="n">' + m.prev + '</td>' +
        '<td class="n ' + U.cls(-m.chg) + '"><span class="' + U.arrow(m.chg) + '">' + Math.abs(m.chg).toFixed(2) + '</span></td>' +
        '<td style="white-space:normal;color:var(--ink-3)">' + U.esc(m.read) + '</td></tr>';
    }).join('');

    $('#tdTopPicks').innerHTML = ['Salud', 'Consumo básico', 'Servicios públicos', 'Renta fija corta']
      .map(function (p) { return '<span class="chip">★ ' + U.esc(p) + '</span>'; }).join('');

    function renderSectors() {
      var max = Math.max.apply(null, SECTORS.map(function (s) { return Math.abs(s.rel); }));
      $('#tdHeatmapGrid').innerHTML = SECTORS.slice().sort(function (a, b) { return b.rel - a.rel; }).map(function (s) {
        var w = Math.abs(s.rel) / max * 50;
        return '<div class="bars__row"><span class="bars__lab">' + (s.fav ? '★ ' : '') + U.esc(s.k) + '</span>' +
          '<span class="bars__track"><span class="bars__zero" style="left:50%"></span>' +
          '<span class="bars__fill bars__fill--' + (s.rel >= 0 ? 'pos' : 'neg') + '" style="' +
          (s.rel >= 0 ? 'left:50%;width:' + w + '%' : 'left:' + (50 - w) + '%;width:' + w + '%') + '"></span></span>' +
          '<span class="bars__val ' + U.cls(s.rel) + '">' + U.pct(s.rel, 1) + ' pp</span></div>';
      }).join('');

      $('#tdRankingTable tbody').innerHTML = SECTORS.slice().sort(function (a, b) { return b.r - a.r; }).map(function (s) {
        return '<tr><th scope="row" class="th-freeze">' + U.esc(s.k) + '</th>' +
          '<td class="n ' + U.cls(s.r) + '">' + U.pct(s.r, 1) + '</td>' +
          '<td class="n ' + U.cls(s.rel) + '">' + U.pct(s.rel, 1) + '</td>' +
          '<td class="n">' + s.sh.toFixed(2) + '</td>' +
          '<td>' + (s.fav ? '<span class="tag tag--ok">Favorecido</span>' : '<span class="tag">Neutral</span>') + '</td></tr>';
      }).join('');
    }
    renderSectors();

    U.register($('#tdScatterCanvas'), function (ctx, w, h) {
      var pad = { l: 42, r: 14, t: 12, b: 26 };
      var xs = SECTORS.map(function (s) { return s.vol; }), ys = SECTORS.map(function (s) { return s.r; });
      var xb = U.bounds(xs), yb = U.bounds(ys);
      xb[0] = Math.max(0, xb[0]);
      U.axes(ctx, w, h, pad, yb[0], yb[1], function (v) { return v.toFixed(1) + '%'; }, 4);
      // La línea del cero separa ganar de perder; no es una rejilla más.
      var zy = h - pad.b - (h - pad.t - pad.b) * ((0 - yb[0]) / (yb[1] - yb[0]));
      U.stroke(ctx, [[pad.l, zy], [w - pad.r, zy]], U.T['rule-strong'], 1, [4, 3]);
      ctx.font = U.FONT;
      ctx.fillStyle = U.T['ink-3'];
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      [0, 0.5, 1].forEach(function (f) {
        ctx.fillText((xb[0] + (xb[1] - xb[0]) * f).toFixed(0) + '% vol', pad.l + (w - pad.l - pad.r) * f, h - pad.b + 6);
      });
      SECTORS.forEach(function (s) {
        var x = pad.l + (w - pad.l - pad.r) * ((s.vol - xb[0]) / (xb[1] - xb[0]));
        var y = h - pad.b - (h - pad.t - pad.b) * ((s.r - yb[0]) / (yb[1] - yb[0]));
        var r = 4 + Math.max(0, s.sh) * 5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = U.alpha(s.r >= 0 ? U.T.cobalt : U.T.neg, 0.55);
        ctx.fill();
        if (s.fav) { ctx.strokeStyle = U.T.ink; ctx.lineWidth = 1.5; ctx.stroke(); }
        ctx.fillStyle = U.T['ink-2'];
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.k, x + r + 4, y);
      });
    });

    $('#tdCandidates tbody').innerHTML = [
      { t: 'JNJ',  n: 'Johnson & Johnson', s: 'Salud', px: 162.40, r: 6.2, vs: 1.4, seed: 31 },
      { t: 'UNH',  n: 'UnitedHealth',      s: 'Salud', px: 528.10, r: 8.9, vs: 4.1, seed: 41 },
      { t: 'LLY',  n: 'Eli Lilly',         s: 'Salud', px: 812.60, r: 3.1, vs: -1.7, seed: 43 },
      { t: 'KO',   n: 'Coca-Cola',         s: 'Consumo básico', px: 71.20, r: 4.4, vs: 0.5, seed: 47 },
      { t: 'PG',   n: 'Procter & Gamble',  s: 'Consumo básico', px: 168.90, r: 5.1, vs: 1.2, seed: 53 },
      { t: 'COST', n: 'Costco',            s: 'Consumo básico', px: 892.30, r: 2.6, vs: -1.3, seed: 59 }
    ].map(function (c) {
      return '<tr><th scope="row" class="th-freeze"><span class="tk">' + badge(c.t) +
        '<span><span class="tk__sym">' + U.esc(c.t) + '</span><span class="tk__name">' + U.esc(c.n) + '</span></span></span></th>' +
        '<td class="th-spark">' + U.spark(c.seed, c.r > 0) + '</td>' +
        '<td>' + U.esc(c.s) + '</td>' +
        '<td class="n">' + U.money(c.px) + '</td>' +
        '<td class="n ' + U.cls(c.r) + '">' + U.pct(c.r, 1) + '</td>' +
        '<td class="n ' + U.cls(c.vs) + '">' + U.pct(c.vs, 1) + ' pp</td>' +
        '<td><a class="card__link" href="app-mercados-v4.html">Ver</a></td></tr>';
    }).join('');

    U.wirePeriods($('#tdPeriodNav'), function (b) {
      var map = { '1mo': 'Último mes', '3mo': 'Últimos 3 meses', ytd: 'En lo que va del año', '1y': 'Último año' };
      $('#tdRankingPeriodLabel').textContent = map[b.dataset.period];
    });

    var refresh = $('#tdRefreshBtn');
    refresh.addEventListener('click', function () {
      refresh.setAttribute('aria-busy', 'true');
      window.setTimeout(function () {
        refresh.removeAttribute('aria-busy');
        $('#tdLastUpdated').textContent = 'Datos al ' + new Date().toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' · FRED y Yahoo Finance';
        U.flash('#tdMacroGrid td');
      }, 800);
    });
  }

  /* ═══════════════════════════════════════════════════ 3. Analizador      */

  function analizador() {
    var ASSETS = ['AAPL', 'MSFT', 'KO', 'JNJ'];
    $('#analyzerAssetCards').innerHTML = ASSETS.map(function (t) {
      return '<li>' + U.esc(t) + '<em>' + (t === 'AAPL' ? 'en foco' : 'comparativo') + '</em>' +
        '<button type="button" aria-label="Quitar ' + U.esc(t) + ' del análisis">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button></li>';
    }).join('');

    $('#dcfResultsGrid').innerHTML = [
      ['WACC', '8.42%', 'costo de capital ponderado'],
      ['Flujo libre 2026', '$98,400 M', 'último ejercicio'],
      ['Crecimiento 1–5', '6.8%', 'anual compuesto'],
      ['Valor terminal', '$2.14 B', '61% del valor total'],
      ['Deuda neta', '−$52,100 M', 'se resta al valor'],
      ['Acciones', '15,210 M', 'en circulación']
    ].map(function (r) {
      return '<div class="ledger__cell"><dt>' + r[0] + '</dt><dd><b>' + r[1] + '</b><em>' + r[2] + '</em></dd></div>';
    }).join('');

    U.register($('#anlzRule'), function (ctx, w, h) {
      var s = U.walk(120, 23, 178.4, 214.05, 1.0);
      var lo = Math.min.apply(null, s), hi = Math.max.apply(null, s);
      var pad = { l: 0, r: 0, t: 9, b: 0 };
      var pts = U.plot(s, w, h, pad, lo, hi);
      U.fillUnder(ctx, pts, h, pad, U.alpha(U.T['cobalt-line'], U.T.dark ? 0.14 : 0.09));
      U.stroke(ctx, pts, U.T['cobalt-line'], 1);
      // La marca del valor intrínseco contra el precio: la brecha se ve.
      var y = h - (h - pad.t) * ((186.40 - lo) / (hi - lo));
      U.stroke(ctx, [[0, y], [w, y]], U.T.neg, 1, [4, 3]);
    });

    // Cascada: cada barra empieza donde terminó la anterior.
    var WF = [
      { lab: 'FCF 1–5', v: 42.10 }, { lab: 'FCF 6–10', v: 31.60 }, { lab: 'Terminal', v: 116.20 },
      { lab: 'Deuda neta', v: -3.50 }, { lab: 'Valor', v: 186.40, total: true }
    ];
    U.register($('#dcfWaterfallChart'), function (ctx, w, h) {
      var pad = { l: 46, r: 12, t: 12, b: 24 };
      var acc = 0, tops = [];
      WF.forEach(function (d) { if (d.total) { tops.push([0, d.v]); } else { tops.push([acc, acc + d.v]); acc += d.v; } });
      var max = Math.max.apply(null, tops.map(function (t) { return Math.max(t[0], t[1]); })) * 1.12;
      U.axes(ctx, w, h, pad, 0, max, U.moneyK, 4);
      var step = (w - pad.l - pad.r) / WF.length;
      var scale = function (v) { return h - pad.b - (h - pad.t - pad.b) * (v / max); };
      ctx.font = U.FONT;
      ctx.textAlign = 'center';
      WF.forEach(function (d, i) {
        var x = pad.l + step * i + step * 0.2, bw = step * 0.6;
        var y0 = scale(tops[i][0]), y1 = scale(tops[i][1]);
        ctx.fillStyle = d.total ? U.T.cobalt : d.v < 0 ? U.T.neg : U.T['cobalt-line'];
        ctx.fillRect(x, Math.min(y0, y1), bw, Math.max(Math.abs(y1 - y0), 1));
        if (i < WF.length - 1 && !WF[i + 1].total) {
          U.stroke(ctx, [[x + bw, y1], [x + step, y1]], U.T['rule-strong'], 1, [3, 2]);
        }
        ctx.fillStyle = U.T['ink-3'];
        ctx.textBaseline = 'top';
        ctx.fillText(d.lab, x + bw / 2, h - pad.b + 6);
        ctx.fillStyle = U.T.ink;
        ctx.textBaseline = 'bottom';
        ctx.fillText('$' + Math.abs(d.v).toFixed(0), x + bw / 2, Math.min(y0, y1) - 4);
      });
      ctx.textAlign = 'left';
    });

    // Sensibilidad: WACC (filas) contra crecimiento terminal (columnas).
    var waccs = ['7.4%', '7.9%', '8.4%', '8.9%', '9.4%'];
    var sens = [
      [232.1, 244.8, 259.6, 277.2, 298.4],
      [206.4, 216.2, 227.5, 240.6, 256.1],
      [166.9, 175.8, 186.4, 198.9, 213.7],
      [150.2, 157.4, 165.6, 175.2, 186.4],
      [136.8, 142.7, 149.4, 157.1, 166.0]
    ];
    $('#sensitivityGrid').innerHTML = matrix(waccs, sens, function (v) { return '$' + v.toFixed(0); }, { mid: 214.05, span: 90 });

    var dist = [];
    (function () {
      var r = U.rng(77), i, v;
      for (i = 0; i < 24; i++) {
        v = Math.exp(-Math.pow((i - 11) / 5.2, 2)) * 100 + r() * 6;
        dist.push({ lab: i % 4 === 0 ? '$' + (120 + i * 8) : '', v: v });
      }
    })();
    U.register($('#monteCarloChart'), function (ctx, w, h) {
      U.columns(ctx, w, h, dist, { l: 34, r: 8, t: 8, b: 18 }, { fmt: function () { return ''; }, ticks: 2 });
      // El precio de mercado parte la distribución en dos: a la derecha, upside.
      var x = 34 + (w - 42) * 0.55;
      U.stroke(ctx, [[x, 8], [x, h - 18]], U.T.neg, 1.5, [4, 3]);
      ctx.font = U.FONT;
      ctx.fillStyle = U.T.neg;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('precio $214.05', x + 5, 10);
    });

    $('#mcResultsGrid').innerHTML = [
      ['Probabilidad de subida', '38%', 'de 10 000 escenarios'],
      ['Mediana', '$186.40', 'valor intrínseco'],
      ['Percentil 10', '$149.10', 'escenario malo'],
      ['Percentil 90', '$231.80', 'escenario bueno']
    ].map(function (r) {
      return '<div class="ledger__cell"><dt>' + r[0] + '</dt><dd><b>' + r[1] + '</b><em>' + r[2] + '</em></dd></div>';
    }).join('');

    $('#analystTechGrid tbody').innerHTML = [
      ['Precio objetivo del consenso', '$228.40', '$180 – $275', '32 analistas · 6.7% arriba del precio'],
      ['Recomendación', 'Compra moderada', '18C · 11M · 3V', 'Ningún analista recomienda vender fuerte'],
      ['Tendencia (media 200)', 'Alcista', '$196.20', 'El precio va 9.1% arriba de la media'],
      ['RSI 14', '58.4', '0 – 100', 'Ni sobrecomprada ni sobrevendida'],
      ['MACD', 'Positivo', '+1.84', 'Cruce al alza hace 12 sesiones'],
      ['Volatilidad implícita', '24.1%', 'percentil 42', 'Por debajo de su media de un año']
    ].map(function (r) {
      return '<tr><th scope="row">' + r[0] + '</th><td class="n">' + r[1] + '</td><td class="n">' + r[2] + '</td><td>' + r[3] + '</td></tr>';
    }).join('');

    $('#comparisonTable tbody').innerHTML = [
      ['P/U', ['32.4', '35.1', '24.8', '21.2'], 'JNJ'],
      ['P/VL', ['48.2', '13.6', '9.8', '5.4'], 'JNJ'],
      ['Margen neto', ['26.3%', '36.1%', '22.8%', '18.4%'], 'MSFT'],
      ['ROE', ['147.2%', '38.4%', '41.6%', '24.1%'], 'AAPL'],
      ['Deuda / capital', ['1.87', '0.34', '1.62', '0.51'], 'MSFT'],
      ['Rendimiento del dividendo', ['0.50%', '0.78%', '2.94%', '3.12%'], 'JNJ'],
      ['Crecimiento de ingresos', ['4.9%', '15.7%', '3.1%', '2.4%'], 'MSFT']
    ].map(function (r) {
      return '<tr><th scope="row" class="th-freeze">' + r[0] + '</th>' +
        r[1].map(function (v) { return '<td class="n">' + v + '</td>'; }).join('') +
        '<td><span class="tag tag--ok">' + r[2] + '</span></td></tr>';
    }).join('');

    var keys = ['AAPL', 'MSFT', 'KO', 'JNJ'];
    $('#correlationGrid').innerHTML = matrix(keys, [
      [1, 0.78, 0.24, 0.19],
      [0.78, 1, 0.31, 0.22],
      [0.24, 0.31, 1, 0.34],
      [0.19, 0.22, 0.34, 1]
    ], function (v) { return v.toFixed(2); }, 'corr');

    $('#analyzerNewsList').innerHTML = newsHtml(NEWS.slice(0, 4));

    $('#aiVerdictBtn').addEventListener('click', function () {
      var body = $('#aiVerdictBody');
      body.innerHTML = '<p><span class="skel skel--line" style="width:88%"></span>' +
        '<span class="skel skel--line" style="width:74%"></span><span class="skel skel--line" style="width:81%"></span></p>';
      window.setTimeout(function () {
        body.innerHTML = '<p style="margin:0;font-size:var(--t-small);line-height:1.6;color:var(--ink-2)">' +
          'En el prototipo no hay llamada al modelo. En la app real esta lectura viene de ' +
          '<code>/api/ai/insights</code> con los múltiplos y las métricas de arriba, y el modelo que ' +
          'se usa depende de tu plan.</p>';
      }, 900);
    });

    var asmInputs = $$('#asmPanel input');
    asmInputs.forEach(function (i) {
      i.addEventListener('change', function () {
        $('#asmApplyBtn').classList.add('btn--primary');
        $('#asmApplyBtn').classList.remove('btn--quiet');
      });
    });
    $('#asmApplyBtn').addEventListener('click', function () {
      $('#asmApplyBtn').classList.remove('btn--primary');
      $('#asmApplyBtn').classList.add('btn--quiet');
      U.flash('#dcfIntrinsic, #dcfGap, #dcfResultsGrid b');
    });

    protoStates(function (state) {
      $('#analyzerResults').hidden = state !== 'normal' && state !== 'error';
      $('#analyzerLoading').hidden = state !== 'loading';
      $('#analyzerEmpty').hidden = state !== 'empty';
      $$('#analyzerResults .notice').forEach(function (n) { n.remove(); });
      if (state === 'error') {
        var er = document.createElement('div');
        er.className = 'notice';
        er.innerHTML = '<b>Faltan estados financieros de KO</b>' +
          '<p>Yahoo Finance no devolvió el flujo de caja de los últimos dos ejercicios. El resto del ' +
          'análisis sigue siendo válido; la comparación de fundamentales queda incompleta.</p>' +
          '<button class="btn btn--quiet btn--sm" type="button">Reintentar sólo KO</button>';
        $('#analyzerResults').prepend(er);
      }
    });
  }

  /* ═══════════════════════════════════════════════════ 4. Optimización    */

  function optimizacion() {
    var TICKERS = POSITIONS.map(function (p) { return p.t; });
    var CURRENT = POSITIONS.map(function (p) { return p.value / TOTAL_VALUE * 100; });
    var MINVAR  = [38.0, 11.5, 12.0, 3.5, 8.0, 27.0];
    var SHARPE  = [30.0, 15.0, 15.0, 8.0, 22.0, 10.0];

    $('#mkwAssetList').innerHTML = POSITIONS.map(function (p, i) {
      return '<li>' + U.esc(p.t) + '<em>' + CURRENT[i].toFixed(1) + '%</em>' +
        '<button type="button" aria-label="Quitar ' + U.esc(p.t) + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button></li>';
    }).join('');

    $('#mkwBLViews').innerHTML = [
      'AAPL rendirá 3 pp más que MSFT · confianza media',
      'BTC-USD rendirá 12% anual · confianza baja'
    ].map(function (v) { return '<li class="chip" style="justify-content:space-between">' + U.esc(v) +
      '<button type="button" aria-label="Quitar visión"><svg viewBox="0 0 24 24" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button></li>'; }).join('');

    $('#mkwWeightsTableBody').innerHTML = POSITIONS.map(function (p, i) {
      var d = SHARPE[i] - CURRENT[i];
      var act = Math.abs(d) < 1 ? '<span class="tag">Mantener</span>'
        : '<span class="tag ' + (d > 0 ? 'tag--ok' : 'tag--warn') + '">' +
          (d > 0 ? 'Comprar ' : 'Vender ') + U.money0(Math.abs(d) / 100 * TOTAL_VALUE) + '</span>';
      return '<tr><th scope="row" class="th-freeze">' + U.esc(p.t) + '</th>' +
        '<td class="n">' + CURRENT[i].toFixed(2) + '%</td>' +
        '<td class="n">' + MINVAR[i].toFixed(2) + '%</td>' +
        '<td class="n"><b>' + SHARPE[i].toFixed(2) + '%</b></td>' +
        '<td class="n ' + U.cls(d) + '">' + U.pct(d) + '</td>' +
        '<td>' + act + '</td></tr>';
    }).join('');

    $('.tbl--metrics tbody').innerHTML = [
      ['Retorno esperado', '9.4%', '14.8%', 'La de máximo Sharpe apunta más alto'],
      ['Volatilidad', '11.2%', '16.9%', 'Y por eso oscila más'],
      ['Sharpe', '0.46', '0.62', 'Mejor retorno por unidad de riesgo'],
      ['VaR 95% diario', '−1.28%', '−1.94%', 'Pérdida que se supera un día de cada veinte'],
      ['Máx. drawdown simulado', '−14.1%', '−22.8%', 'Peor caída pico a valle'],
      ['Activos con peso > 1%', '6', '6', 'Ninguna se concentra en menos nombres']
    ].map(function (r) {
      return '<tr><th scope="row">' + r[0] + '</th><td class="n">' + r[1] + '</td><td class="n">' + r[2] + '</td><td>' + r[3] + '</td></tr>';
    }).join('');

    U.register($('#mkwCurrentPie'), function (ctx, w, h) {
      U.donut(ctx, w, h, CURRENT.map(function (v) { return { w: v }; }));
    });
    U.register($('#mkwWeightsPie'), function (ctx, w, h) {
      U.donut(ctx, w, h, SHARPE.map(function (v) { return { w: v }; }));
    });

    // Nube de carteras + la frontera que las envuelve.
    var cloud = [];
    (function () {
      var r = U.rng(101), i, vol, ret;
      for (i = 0; i < 900; i++) {
        vol = 9 + r() * 16;
        ret = 2 + (vol - 9) * 0.62 + (r() - 0.72) * 7;
        cloud.push([vol, ret]);
      }
    })();
    U.register($('#mkwFrontierCanvas'), function (ctx, w, h) {
      var pad = { l: 44, r: 14, t: 12, b: 26 };
      var xb = [8, 26], yb = [-3, 19];
      U.axes(ctx, w, h, pad, yb[0], yb[1], function (v) { return v.toFixed(0) + '%'; }, 4);
      var X = function (v) { return pad.l + (w - pad.l - pad.r) * ((v - xb[0]) / (xb[1] - xb[0])); };
      var Y = function (v) { return h - pad.b - (h - pad.t - pad.b) * ((v - yb[0]) / (yb[1] - yb[0])); };
      cloud.forEach(function (p) {
        ctx.fillStyle = U.alpha(U.T['cobalt-line'], 0.16);
        ctx.fillRect(X(p[0]) - 1, Y(p[1]) - 1, 2, 2);
      });
      var front = [];
      for (var v = 9; v <= 25; v += 0.5) front.push([v, 2 + (v - 9) * 0.62 + 3.4 - Math.pow((v - 9) / 9, 2) * 1.6]);
      U.stroke(ctx, front.map(function (p) { return [X(p[0]), Y(p[1])]; }), U.T.cobalt, 2);
      [[11.2, 9.4, 'Mín. varianza'], [16.9, 14.8, 'Máx. Sharpe']].forEach(function (m) {
        var x = X(m[0]), y = Y(m[1]);
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = U.T.surface; ctx.fill();
        ctx.strokeStyle = U.T.ink; ctx.lineWidth = 2; ctx.stroke();
        ctx.font = U.FONT; ctx.fillStyle = U.T.ink;
        ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText(m[2], x + 8, y - 4);
      });
      ctx.font = U.FONT; ctx.fillStyle = U.T['ink-3'];
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText('volatilidad anualizada →', w - pad.r, h - pad.b + 18);
    });

    var years = 5;
    U.register($('#mkwForecastCanvas'), function (ctx, w, h) {
      var pad = { l: 48, r: 14, t: 12, b: 22 }, n = 61, i;
      var start = 85008.65;
      var band = function (q) {
        var out = [];
        for (i = 0; i < n; i++) out.push(start * Math.pow(1 + (0.148 + (q - 0.5) * 0.30), i / (n - 1) * years));
        return out;
      };
      var qs = [[0.05, 0.95, 0.13], [0.10, 0.90, 0.26], [0.25, 0.75, 0.42]];
      var all = [], made = qs.map(function (q) {
        var lo = band(q[0]), hi = band(q[1]);
        all.push(lo, hi);
        return { lo: lo, hi: hi, a: q[2] };
      });
      var med = band(0.5); all.push(med);
      var b = U.bounds.apply(null, all); b[0] = 0;
      U.axes(ctx, w, h, pad, b[0], b[1], U.moneyK, 4);
      made.forEach(function (m) {
        U.fillBetween(ctx, U.plot(m.hi, w, h, pad, b[0], b[1]), U.plot(m.lo, w, h, pad, b[0], b[1]),
          U.alpha(U.T['cobalt-line'], m.a * (U.T.dark ? 0.8 : 1)));
      });
      U.stroke(ctx, U.plot(med, w, h, pad, b[0], b[1]), U.T['cobalt-line'], 2);
      U.xLabels(ctx, w, h, pad, ['hoy', '+' + Math.round(years / 2) + 'a', '+' + years + 'a']);
    });

    $('#mkwCalcStatsContent').innerHTML = '<table class="tbl tbl--grid"><thead><tr>' +
      '<th scope="col" class="th-freeze">Activo</th><th scope="col" class="n">Retorno anual</th>' +
      '<th scope="col" class="n">Volatilidad</th><th scope="col" class="n">Sharpe</th>' +
      '<th scope="col" class="n">Asimetría</th><th scope="col" class="n">Curtosis</th></tr></thead><tbody>' +
      [['VOO', 14.2, 13.1, 0.76, -0.31, 3.8], ['AAPL', 18.6, 22.4, 0.64, -0.12, 4.2],
       ['MSFT', 21.1, 20.8, 0.81, 0.08, 3.6], ['NVDA', 48.9, 41.2, 1.08, 0.44, 6.1],
       ['BTC-USD', 32.4, 52.6, 0.53, 0.19, 5.4], ['NAFTRAC.MX', 6.8, 15.9, 0.16, -0.22, 3.4]]
      .map(function (r) {
        return '<tr><th scope="row" class="th-freeze">' + r[0] + '</th>' +
          '<td class="n ' + U.cls(r[1]) + '">' + U.pct(r[1], 1) + '</td><td class="n">' + r[2].toFixed(1) + '%</td>' +
          '<td class="n">' + r[3].toFixed(2) + '</td><td class="n">' + r[4].toFixed(2) + '</td>' +
          '<td class="n">' + r[5].toFixed(1) + '</td></tr>';
      }).join('') + '</tbody></table>';

    var COV = [
      [0.0172, 0.0198, 0.0186, 0.0241, 0.0122, 0.0091],
      [0.0198, 0.0502, 0.0364, 0.0418, 0.0186, 0.0104],
      [0.0186, 0.0364, 0.0433, 0.0392, 0.0158, 0.0098],
      [0.0241, 0.0418, 0.0392, 0.1697, 0.0348, 0.0121],
      [0.0122, 0.0186, 0.0158, 0.0348, 0.2767, 0.0062],
      [0.0091, 0.0104, 0.0098, 0.0121, 0.0062, 0.0253]
    ];
    $('#mkwCalcCovContent').innerHTML = matrix(TICKERS, COV, function (v) { return v.toFixed(3); }, { mid: 0, span: 0.28 });

    var CORR = [
      [1.00, 0.71, 0.86, 0.64, 0.28, 0.52],
      [0.71, 1.00, 0.78, 0.59, 0.31, 0.41],
      [0.86, 0.78, 1.00, 0.68, 0.26, 0.44],
      [0.64, 0.59, 0.68, 1.00, 0.39, 0.33],
      [0.28, 0.31, 0.26, 0.39, 1.00, 0.11],
      [0.52, 0.41, 0.44, 0.33, 0.11, 1.00]
    ];
    $('#mkwCalcCorrContent').innerHTML = matrix(TICKERS, CORR, function (v) { return v.toFixed(2); }, 'corr');

    $('#mkwCalcVarContent').innerHTML = '<table class="tbl tbl--grid"><thead><tr>' +
      '<th scope="col" class="th-freeze">Cartera</th><th scope="col" class="n">VaR 95% diario</th>' +
      '<th scope="col" class="n">VaR 95% anual</th><th scope="col" class="n">CVaR 95%</th>' +
      '<th scope="col">En dinero, sobre $85,008.65</th></tr></thead><tbody>' +
      [['Actual', -2.11, -33.5, -3.04, '−$1,793.68 en un día malo'],
       ['Mínima varianza', -1.28, -20.3, -1.81, '−$1,088.11 en un día malo'],
       ['Máximo Sharpe', -1.94, -30.8, -2.76, '−$1,649.17 en un día malo']]
      .map(function (r) {
        return '<tr><th scope="row" class="th-freeze">' + r[0] + '</th>' +
          '<td class="n neg">' + U.pct(r[1]) + '</td><td class="n neg">' + U.pct(r[2], 1) + '</td>' +
          '<td class="n neg">' + U.pct(r[3]) + '</td><td>' + r[4] + '</td></tr>';
      }).join('') + '</tbody></table>';

    $('#mkwCompareList').innerHTML = [
      'Núcleo global · 6 activos', 'Defensiva · 5 activos', 'Cripto · 3 activos'
    ].map(function (n, i) {
      return '<li style="justify-content:flex-start"><label class="check"><input type="checkbox"' +
        (i < 2 ? ' checked' : '') + '> ' + U.esc(n) + '</label></li>';
    }).join('');

    U.wireSeg($('#mkwModeToggle'), function (b) {
      var m = b.dataset.mode;
      $('#mkwSmartBetaPanel').hidden = m !== 'smartbeta';
      $('#mkwBLPanel').hidden = m !== 'bl';
      $('#mkwModeDesc').textContent = m === 'smartbeta'
        ? 'El retorno esperado sale de una puntuación de factores, no del histórico directo. Útil cuando la media histórica está dominada por un solo activo.'
        : m === 'bl'
          ? 'Parte del equilibrio de mercado y lo corrige con tus visiones. Evita las carteras extremas que produce Markowitz puro con estimaciones ruidosas.'
          : 'Markowitz clásico: el retorno esperado sale del histórico y la covarianza de los retornos diarios del periodo elegido.';
    });

    U.wirePeriods($('#mkwForecastYearNav'), function (b) {
      years = +b.dataset.years;
      $('#mkwForecastStatus').textContent = 'Con $85,008.65 iniciales, sin aportes, a ' + years + (years === 1 ? ' año.' : ' años.');
      U.repaint();
    });
    U.wireTabs($('#mkwCalcTabs'));

    $('#mkwFiEnabled').addEventListener('change', function () { $('#mkwFiOptions').hidden = !this.checked; });
    $('#mkwMaxWeightEnabled').addEventListener('change', function () { $('#mkwMaxWeightOptions').hidden = !this.checked; });
    $$('.factor input[type="range"]').forEach(function (r) {
      r.addEventListener('input', function () { r.nextElementSibling.value = r.value + '%'; });
    });

    var run = $('#mkwRunBtn');
    run.addEventListener('click', function () {
      run.disabled = true;
      run.setAttribute('aria-busy', 'true');
      $('#mkwStatus').textContent = 'Simulando 10 000 carteras…';
      $('#mkwStatus').className = 'msg info';
      window.setTimeout(function () {
        run.disabled = false;
        run.removeAttribute('aria-busy');
        $('#mkwStatus').textContent = 'Listo. La frontera se recalculó con los parámetros actuales.';
        $('#mkwStatus').className = 'msg ok';
        U.flash('#mkwWeightsTableBody td');
        U.repaint();
      }, 1100);
    });
  }

  /* ═══════════════════════════════════════════════════ 5. Mercados        */

  function mercados() {
    var QUOTES = [
      ['S&P 500', '5,612.40', 0.58], ['NASDAQ', '18,204.10', 0.94], ['Dow Jones', '41,320.55', 0.22],
      ['IPC', '52,940.80', -0.31], ['USD/MXN', '18.4210', -0.14], ['Oro', '2,418.60', 0.42],
      ['Brent', '78.25', -1.06], ['BTC', '61,240.00', 2.55]
    ];
    $('#marketOverviewBar').innerHTML = QUOTES.map(function (q) {
      return '<span class="quote"><span class="quote__sym">' + U.esc(q[0]) + '</span>' +
        '<span class="quote__px">' + q[1] + '</span>' +
        '<span class="quote__chg ' + (q[2] > 0 ? 'is-up' : q[2] < 0 ? 'is-down' : 'is-flat') + '">' + U.pct(q[2]) + '</span></span>';
    }).join('');

    $('#marketWlItems').innerHTML = WATCHLIST.map(function (a, i) {
      return '<li><button type="button"' + (i === 0 ? ' aria-current="true"' : '') + '>' +
        '<span class="wl__sym">' + U.esc(a.t) + '</span><span class="wl__px">' + U.money(a.px) + '</span>' +
        '<span class="wl__name">' + U.esc(a.name) + '</span>' +
        '<span class="wl__chg ' + U.cls(a.day) + '">' + U.pct(a.day) + '</span></button></li>';
    }).join('');

    // Velas: OHLC derivado de un camino con la volatilidad de AAPL.
    var candles = (function () {
      var r = U.rng(23), out = [], px = 178.4, i, o, c, hi, lo;
      for (i = 0; i < 120; i++) {
        o = px;
        c = o * (1 + (r() - 0.47) * 0.028);
        hi = Math.max(o, c) * (1 + r() * 0.011);
        lo = Math.min(o, c) * (1 - r() * 0.011);
        out.push({ o: o, c: c, h: hi, l: lo, v: 22 + r() * 46 });
        px = c;
      }
      var k = 214.05 / out[out.length - 1].c;
      out.forEach(function (d) { d.o *= k; d.c *= k; d.h *= k; d.l *= k; });
      return out;
    })();

    var sma = candles.map(function (_, i) {
      var n = Math.min(i + 1, 20), s = 0;
      for (var j = i - n + 1; j <= i; j++) s += candles[j].c;
      return s / n;
    });

    U.register($('#marketChart'), function (ctx, w, h) {
      var pad = { l: 8, r: 54, t: 8, b: 6 };
      var lo = Math.min.apply(null, candles.map(function (d) { return d.l; }));
      var hi = Math.max.apply(null, candles.map(function (d) { return d.h; }));
      var m = (hi - lo) * 0.08; lo -= m; hi += m;
      // El eje de precio va a la DERECHA: es donde el operador lo busca.
      var n = 5, i, y, v;
      ctx.font = U.FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      for (i = 0; i <= n; i++) {
        v = lo + (hi - lo) * (i / n);
        y = h - pad.b - (h - pad.t - pad.b) * (i / n);
        ctx.strokeStyle = U.T.rule; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad.l, Math.round(y) + .5); ctx.lineTo(w - pad.r, Math.round(y) + .5); ctx.stroke();
        ctx.fillStyle = U.T['ink-3'];
        ctx.fillText('$' + v.toFixed(0), w - pad.r + 6, y);
      }
      var step = (w - pad.l - pad.r) / candles.length;
      var Y = function (p) { return h - pad.b - (h - pad.t - pad.b) * ((p - lo) / (hi - lo)); };
      candles.forEach(function (d, k) {
        var x = pad.l + step * k + step / 2;
        var up = d.c >= d.o;
        ctx.strokeStyle = up ? U.T.pos : U.T.neg;
        ctx.fillStyle = up ? U.T.pos : U.T.neg;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.round(x) + .5, Y(d.h)); ctx.lineTo(Math.round(x) + .5, Y(d.l)); ctx.stroke();
        var bw = Math.max(step * 0.62, 1.5);
        var top = Y(Math.max(d.o, d.c)), bot = Y(Math.min(d.o, d.c));
        ctx.fillRect(x - bw / 2, top, bw, Math.max(bot - top, 1));
      });
      U.stroke(ctx, sma.map(function (v, k) { return [pad.l + step * k + step / 2, Y(v)]; }), U.T['cobalt-line'], 1.5);
      // La etiqueta del último precio, pegada al eje.
      var last = candles[candles.length - 1].c, ly = Y(last);
      ctx.fillStyle = U.T.ink;
      ctx.fillRect(w - pad.r, ly - 9, pad.r, 18);
      ctx.fillStyle = U.T.surface;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('$' + last.toFixed(2), w - pad.r + 5, ly);
    });

    U.register($('#marketVolChart'), function (ctx, w, h) {
      var max = Math.max.apply(null, candles.map(function (d) { return d.v; })) * 1.1;
      var step = (w - 62) / candles.length;
      candles.forEach(function (d, k) {
        var bh = (h - 8) * (d.v / max);
        ctx.fillStyle = U.alpha(d.c >= d.o ? U.T.pos : U.T.neg, 0.45);
        ctx.fillRect(8 + step * k + step * 0.2, h - bh, Math.max(step * 0.6, 1), bh);
      });
      ctx.font = U.FONT; ctx.fillStyle = U.T['ink-3'];
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('Volumen', 10, 5);
    });

    U.register($('#marketRsiChart'), function (ctx, w, h) {
      var rsi = candles.map(function (_, i) {
        var g = 0, l = 0, n = Math.min(i, 14), j;
        for (j = i - n + 1; j <= i; j++) {
          if (j < 1) continue;
          var d = candles[j].c - candles[j - 1].c;
          if (d > 0) g += d; else l -= d;
        }
        return l === 0 ? 100 : 100 - 100 / (1 + (g / n) / (l / n));
      });
      var pad = { l: 8, r: 54, t: 8, b: 6 };
      [30, 70].forEach(function (lv) {
        var y = h - pad.b - (h - pad.t - pad.b) * (lv / 100);
        U.stroke(ctx, [[pad.l, y], [w - pad.r, y]], U.T.rule, 1, [3, 3]);
        ctx.font = U.FONT; ctx.fillStyle = U.T['ink-3'];
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(String(lv), w - pad.r + 6, y);
      });
      U.stroke(ctx, U.plot(rsi, w, h, pad, 0, 100), U.T.cobalt, 1.5);
      ctx.fillStyle = U.T['ink-3'];
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('RSI 14', 10, 5);
    });

    $('#indicatorLegend').innerHTML =
      '<li><i style="background:var(--cobalt-line)"></i>SMA 20 · $206.14</li>' +
      '<li><i style="background:var(--ink-3)"></i>Volumen · 48.2 M</li>' +
      '<li><i style="background:var(--cobalt)"></i>RSI 14 · 58.4</li>';

    $('#marketStatsRailBody').innerHTML = [
      ['Capitalización', '$3.26 B'], ['P/U', '32.4'], ['BPA (12m)', '$6.61'],
      ['Dividendo', '$1.08 · 0.50%'], ['Beta', '1.21'], ['Volumen medio', '52.4 M'],
      ['Rango del día', '$211.42 – $214.88'], ['Próximo reporte', '31 jul 2026'],
      ['Sector', 'Tecnología'], ['Empleados', '164,000']
    ].map(function (r) {
      return '<tr><td>' + r[0] + '</td><td class="n">' + r[1] + '</td></tr>';
    }).join('');

    $('#tickerNewsList').innerHTML = newsHtml(NEWS.filter(function (n) { return n.t === 'AAPL'; }).concat(NEWS.slice(1, 3)));

    // 34 indicadores por familia, con la cuenta de los activos a la vista.
    var GROUPS = [
      ['Tendencia', ['SMA 20', 'SMA 50', 'SMA 200', 'EMA 20', 'EMA 50', 'WMA 50', 'Ichimoku', 'SuperTrend', 'Parabolic SAR']],
      ['Volatilidad', ['Bandas de Bollinger', '%B de Bollinger', 'Ancho de Bollinger', 'ATR', 'VWAP']],
      ['Momento', ['RSI', 'MACD', 'Estocástico', 'Estocástico RSI', 'CCI', 'Momentum', 'ADX', 'Williams %R', 'ROC', 'Divergencias']],
      ['Volumen', ['Volumen', 'Perfil de volumen', 'OBV', 'MFI']],
      ['Estructura', ['Pivotes', 'Huecos', 'Fibonacci retroceso', 'Fibonacci extensión', 'Soportes y resistencias']]
    ];
    var ON = ['SMA 20', 'Volumen', 'RSI'];
    $('#indicatorGroups').innerHTML = GROUPS.map(function (g) {
      return '<div class="ind-group"><span class="ind-group__lab">' + g[0] + '</span><ul class="ind-group__list">' +
        g[1].map(function (i) {
          return '<li><label><input type="checkbox"' + (ON.indexOf(i) >= 0 ? ' checked' : '') + '> ' + U.esc(i) + '</label></li>';
        }).join('') + '</ul></div>';
    }).join('');

    function countInds() {
      var n = $$('#indicatorGroups input:checked').length;
      $('#indicatorCount').textContent = n;
      $('#indicatorCount').hidden = n === 0;
    }
    $('#indicatorGroups').addEventListener('change', countInds);
    $('#clearIndicatorsBtn').addEventListener('click', function () {
      $$('#indicatorGroups input').forEach(function (i) { i.checked = false; });
      countInds();
    });

    var sheet = $('#indicatorMenu'), scrim = $('#indicatorBackdrop'), openBtn = $('#indicatorMenuButton');
    function openSheet(on) {
      sheet.hidden = !on;
      scrim.hidden = !on;
      openBtn.setAttribute('aria-expanded', String(on));
      if (on) $('#closeIndicatorsBtn').focus(); else openBtn.focus();
    }
    openBtn.addEventListener('click', function () { openSheet(sheet.hidden); });
    $('#closeIndicatorsBtn').addEventListener('click', function () { openSheet(false); });
    scrim.addEventListener('click', function () { openSheet(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) openSheet(false); });

    $('#compareToggleBtn').addEventListener('click', function () {
      var bar = $('#compareBar');
      bar.hidden = !bar.hidden;
      if (!bar.hidden) {
        $('#compareChips').innerHTML = ['AAPL', 'MSFT'].map(function (t) {
          return '<li>' + t + '<button type="button" aria-label="Quitar ' + t + '">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button></li>';
        }).join('');
        $('#compareInput').focus();
      }
    });
    $('#compareCloseBtn').addEventListener('click', function () { $('#compareBar').hidden = true; });

    $$('#chartTypeMenu button').forEach(function (b) {
      b.addEventListener('click', function () {
        $('#chartTypeMenuButton').childNodes[2].nodeValue = ' ' + b.querySelector('b').textContent + ' ';
      });
    });

    $$('.tools button').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!b.hasAttribute('aria-pressed')) return;
        $$('.tools button[aria-pressed]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      });
    });

    $('#saveTickerButton').addEventListener('click', function () {
      var on = this.getAttribute('aria-pressed') !== 'true';
      this.setAttribute('aria-pressed', String(on));
      this.setAttribute('aria-label', on ? 'Quitar de la lista de seguimiento' : 'Agregar a la lista de seguimiento');
    });

    U.wirePeriods($('#rangeSegmented'), function () { U.repaint(); });
    countInds();
  }

  /* ═══════════════════════════════════════════════════ 6. Ajustes         */

  function ajustes() {
    U.wireTabs($('#setTabs'));

    $('#activityLogContent tbody').innerHTML = [
      ['Hoy, 09:14', 'Inicio de sesión con segundo factor', 'Windows · Chrome', 'Ciudad de México'],
      ['Ayer, 18:40', 'Reporte PDF exportado · Núcleo global', 'Windows · Chrome', 'Ciudad de México'],
      ['27 jul, 11:02', 'Posición agregada · NVDA', 'Windows · Chrome', 'Ciudad de México'],
      ['24 jul, 20:15', 'Inicio de sesión con segundo factor', 'iOS · Safari', 'Ciudad de México'],
      ['20 jul, 08:33', 'Contraseña actualizada', 'Windows · Chrome', 'Ciudad de México'],
      ['14 jul, 16:50', 'Enlace público creado · Núcleo global', 'Windows · Chrome', 'Ciudad de México'],
      ['02 jul, 09:21', 'Códigos de respaldo generados', 'Windows · Chrome', 'Ciudad de México']
    ].map(function (r) {
      return '<tr><th scope="row" class="th-freeze">' + r[0] + '</th><td style="white-space:normal">' + r[1] +
        '</td><td>' + r[2] + '</td><td>' + r[3] + '</td></tr>';
    }).join('');

    function toggleCell(on, locked) {
      return '<td class="n"><label class="check" style="justify-content:flex-end">' +
        '<span class="sr">Activar</span><input type="checkbox"' + (on ? ' checked' : '') + (locked ? ' disabled' : '') + '></label></td>';
    }
    $('#notifMatrix tbody').innerHTML = [
      ['Alertas de precio', 1, 1, 0, 'Sólo las que tú creas.'],
      ['Resumen semanal', 1, 1, 0, 'Lunes por la mañana.'],
      ['Movimientos fuertes de la cartera', 1, 0, 0, 'Cuando el día supera ±3%.'],
      ['Dividendos recibidos', 1, 1, 0, 'Al detectarse el pago.'],
      ['Reportes trimestrales de tus posiciones', 0, 0, 0, 'Un día antes.'],
      ['Accesos y cambios de seguridad', 1, 1, 1, 'No se puede desactivar.'],
      ['Novedades del producto', 1, 0, 0, 'Finalidad secundaria: puedes retirarla.']
    ].map(function (r) {
      return '<tr><th scope="row" class="th-freeze" style="white-space:normal">' + r[0] + '</th>' +
        toggleCell(r[1], r[3]) + toggleCell(r[2], r[3]) +
        '<td style="white-space:normal;color:var(--ink-3)">' + r[4] + '</td></tr>';
    }).join('');

    $('#alertsList').innerHTML = '<table class="tbl tbl--grid"><thead><tr>' +
      '<th scope="col" class="th-freeze">Activo</th><th scope="col">Condición</th>' +
      '<th scope="col" class="n">Umbral</th><th scope="col" class="n">Precio ahora</th>' +
      '<th scope="col">Estado</th><th scope="col"><span class="sr">Quitar</span></th></tr></thead><tbody>' +
      [['AAPL', 'Sube por encima de', '$225.00', '$214.05', 'Vigilando'],
       ['BTC-USD', 'Baja por debajo de', '$55,000.00', '$61,240.00', 'Vigilando'],
       ['NVDA', 'Sube más de', '10% en un día', '+3.85%', 'Vigilando'],
       ['TSLA', 'Baja por debajo de', '$240.00', '$246.80', 'Disparada el 12 jul']]
      .map(function (r) {
        return '<tr><th scope="row" class="th-freeze">' + r[0] + '</th><td>' + r[1] + '</td>' +
          '<td class="n">' + r[2] + '</td><td class="n">' + r[3] + '</td>' +
          '<td><span class="tag' + (r[4].indexOf('Disparada') === 0 ? ' tag--ok' : '') + '">' + r[4] + '</span></td>' +
          '<td><button class="row-act" type="button" aria-label="Quitar la alerta de ' + r[0] + '">' +
          '<svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button></td></tr>';
      }).join('') + '</tbody></table>';

    var ALLOC = [['Renta variable global', 55], ['Renta variable emergente', 10], ['Renta fija', 20], ['Alternativos', 10], ['Efectivo', 5]];
    $('#investorAllocationGrid').innerHTML = ALLOC.map(function (a) {
      return '<div class="bars__row"><span class="bars__lab">' + U.esc(a[0]) + '</span>' +
        '<span class="bars__track"><span class="bars__fill bars__fill--seq" style="left:0;width:' + (a[1] / 55 * 100) + '%"></span></span>' +
        '<span class="bars__val">' + a[1] + '%</span></div>';
    }).join('');

    // QR de muestra: módulos deterministas y los tres ojos en su sitio, para
    // que se lea como un QR sin fingir que codifica algo.
    (function () {
      var n = 25, r = U.rng(2026), m = [], x, y, s = '';
      for (y = 0; y < n; y++) { m.push([]); for (x = 0; x < n; x++) m[y].push(r() > 0.52 ? 1 : 0); }
      [[0, 0], [n - 7, 0], [0, n - 7]].forEach(function (o) {
        for (y = 0; y < 7; y++) for (x = 0; x < 7; x++) {
          var edge = x === 0 || y === 0 || x === 6 || y === 6;
          var core = x > 1 && x < 5 && y > 1 && y < 5;
          m[o[1] + y][o[0] + x] = edge || core ? 1 : 0;
        }
        for (y = -1; y < 8; y++) for (x = -1; x < 8; x++) {
          if (x === 7 || y === 7 || x === -1 || y === -1) {
            var gy = o[1] + y, gx = o[0] + x;
            if (m[gy] && m[gy][gx] !== undefined) m[gy][gx] = 0;
          }
        }
      });
      for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (m[y][x]) s += 'M' + x + ' ' + y + 'h1v1h-1z';
      $('#mainTotpQrImg').innerHTML = '<svg viewBox="0 0 ' + n + ' ' + n + '" role="img" ' +
        'aria-label="Código QR de configuración del autenticador"><path fill="#000" d="' + s + '"/></svg>';
    })();

    $('#avatarPickerGrid').innerHTML = ['FP', '◆', '◇', '●', '○', '▲', '△', '■', '□', '★', '☆', '✦']
      .map(function (g, i) { return '<button type="button" aria-pressed="' + (i === 0) + '">' + g + '</button>'; }).join('');
    $('#avatarPickerGrid').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      $$('button', this).forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      $('#settingsAvatarPreview').textContent = b.textContent;
    });

    function toggleForm(btn, form, cancel) {
      $(btn).addEventListener('click', function () {
        $(form).hidden = false;
        $(form).querySelector('input').focus();
      });
      $(cancel).addEventListener('click', function () { $(form).hidden = true; $(btn).focus(); });
    }
    toggleForm('#editNameBtn', '#editNameForm', '#cancelNameBtn');
    toggleForm('#changePasswordBtn', '#changePasswordForm', '#cancelPasswordBtn');
    $('#editAvatarBtn').addEventListener('click', function () {
      var p = $('#avatarPickerPanel');
      p.hidden = !p.hidden;
    });
    $('#closeAvatarPickerBtn').addEventListener('click', function () { $('#avatarPickerPanel').hidden = true; });

    $('#editNameForm').addEventListener('submit', function (e) {
      e.preventDefault();
      $('#settingsUserDisplay').textContent = $('#newNameInput').value.trim() || 'Furiel Pacheco';
      this.hidden = true;
      setMsg('#nameChangeMessage', 'Nombre actualizado. Aparecerá en tus próximos reportes.', 'ok');
    });
    $('#changePasswordForm').addEventListener('submit', function (e) {
      e.preventDefault();
      this.hidden = true;
      setMsg('#passwordChangeMessage', 'En la app real la contraseña quedaría actualizada y cerraríamos las demás sesiones.', 'info');
    });
    $('#alertForm').addEventListener('submit', function (e) {
      e.preventDefault();
      setMsg('#alertFormStatus', 'En el prototipo no se guarda. En la app real la alerta se revisa cada 15 minutos.', 'info');
    });

    function setMsg(sel, text, kind) {
      var el = $(sel);
      el.textContent = text;
      el.className = 'msg' + (kind ? ' ' + kind : '');
    }

    U.wireSeg($('#segAvisos'), function (b) {
      setMsg('#dataPrivacyMessage', b.dataset.avisos === 'on'
        ? 'Recibirás avisos de producto. Puedes cambiarlo cuando quieras.'
        : 'No recibirás avisos de producto. Los correos de seguridad y tus alertas siguen llegando.', 'ok');
    });
    U.wireSeg($('#currencyBtnGroup'), function (b) {
      $('#currencyNote').textContent = 'Los totales pasan a ' + b.dataset.cur +
        '. Cambiar la moneda base no reescribe tus transacciones: cada una conserva la divisa en que se hizo.';
    });
    U.wireSeg($('#langGroup'));
    U.wireSeg($('#densityGroup'));
    U.wireSeg($('#themeToggleButton'), function (b) {
      var p = b.dataset.themePref;
      U.applyTheme(p === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : p, true);
    });

    // Exportar y borrar: el flujo destructivo con su libro mayor.
    var exportBtn = $('#exportAccountDataBtn');
    exportBtn.addEventListener('click', function () {
      exportBtn.disabled = true;
      exportBtn.setAttribute('aria-busy', 'true');
      var label = exportBtn.textContent;
      exportBtn.textContent = 'Preparando…';
      window.setTimeout(function () {
        exportBtn.disabled = false;
        exportBtn.removeAttribute('aria-busy');
        exportBtn.textContent = label;
        setMsg('#dataPrivacyMessage', 'Archivo listo: blackportfolio-datos-2026-07-30.json (en el prototipo no se descarga nada).', 'ok');
      }, 900);
    });
    $('#closeAllSessionsBtn').addEventListener('click', function () {
      setMsg('#sessionsMessage', 'En la app real esto cierra todas las sesiones y te devuelve al acceso.', 'info');
    });
    var confirmInput = $('#dlgConfirmInput'), confirmBtn = $('#dlgConfirmBtn');
    confirmInput.addEventListener('input', function () {
      confirmBtn.disabled = confirmInput.value.trim().toUpperCase() !== 'ELIMINAR';
    });
    confirmBtn.addEventListener('click', function () {
      U.closeDlg($('#deleteDialog'));
      setMsg('#dataPrivacyMessage', 'En la app real la cuenta quedaría eliminada y saldrías a la landing. Aquí no se borró nada.', 'info');
    });
    $('#dlgExportFirst').addEventListener('click', function () {
      U.closeDlg($('#deleteDialog'));
      exportBtn.click();
    });

    // Los seis campos del código funcionan como uno solo.
    $$('.otp').forEach(function (grid) {
      var inputs = $$('input', grid);
      inputs.forEach(function (inp, i) {
        inp.addEventListener('input', function () {
          inp.value = inp.value.replace(/\D/g, '').slice(0, 1);
          if (inp.value && inputs[i + 1]) inputs[i + 1].focus();
        });
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Backspace' && !inp.value && inputs[i - 1]) inputs[i - 1].focus();
        });
      });
    });

    $$('#investorProfileOptions button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#investorProfileOptions button').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      });
    });
  }

  /* ═══════════════════════════════════ Barra de estados (sólo prototipo)  */

  function protoStates(apply) {
    var bar = $('#protoBar'), open = $('#protoStatesBtn');
    if (!bar || !open) return;
    open.addEventListener('click', function () { bar.hidden = !bar.hidden; });
    $('#protoClose').addEventListener('click', function () { bar.hidden = true; });
    $$('#protoBar button[data-state]').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#protoBar button[data-state]').forEach(function (o) {
          o.setAttribute('aria-pressed', String(o === b));
        });
        apply(b.dataset.state);
      });
    });
  }

  /* ═══════════════════════════════════════════════════════ Arranque      */

  var PAGES = {
    home: home, topdown: topdown, analizador: analizador,
    optimizacion: optimizacion, mercados: mercados, ajustes: ajustes
  };

  U.readTokens();
  if (PAGES[SECTION]) PAGES[SECTION]();
  U.boot();
})();
