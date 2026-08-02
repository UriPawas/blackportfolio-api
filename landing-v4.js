/* ==========================================================================
   BlackPortfolio — landing v4
   Tema (claro/oscuro), menú móvil, controles segmentados, moneda de
   presentación y las tres vistas de la cartera de muestra.
   Sin dependencias. Todo el contenido crítico ya existe en el HTML; este
   archivo sólo lo hace conmutable.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  var FX = 17.40;                     // MXN por USD, referencia de la muestra
  var state = { currency: 'USD', view: 'asignacion' };

  var nf0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

  function money(usd) {
    return nf0.format(state.currency === 'USD' ? usd : usd * FX);
  }

  /* ------------------------------------------------------------ 1. Tema  */

  var themeBtn = document.getElementById('themeBtn');
  var themeSeg = document.getElementById('segTema');

  function applyTheme(theme, animate) {
    if (animate) {
      root.classList.add('is-theming');
      window.setTimeout(function () { root.classList.remove('is-theming'); }, 340);
    }
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('bp-theme', theme); } catch (e) { /* sin almacenamiento */ }

    var dark = theme === 'dark';
    if (themeBtn) {
      themeBtn.setAttribute('aria-pressed', String(dark));
      themeBtn.setAttribute('aria-label', dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    }
    if (themeSeg) {
      themeSeg.querySelectorAll('button').forEach(function (b) {
        var on = b.dataset.themeSet === theme;
        b.setAttribute('aria-pressed', String(on));
        b.tabIndex = on ? 0 : -1;
      });
      moveThumb(themeSeg, !animate);
    }
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
  }

  /* ------------------------------------------------------ 2. Menú móvil  */

  var menuBtn = document.getElementById('menuBtn');
  var drawer = document.getElementById('drawer');

  function setDrawer(open) {
    if (!drawer || !menuBtn) return;
    drawer.dataset.open = String(open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  }

  if (menuBtn && drawer) {
    menuBtn.addEventListener('click', function () {
      setDrawer(drawer.dataset.open !== 'true');
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setDrawer(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.dataset.open === 'true') {
        setDrawer(false);
        menuBtn.focus();
      }
    });
  }

  /* ------------------------------------------- 3. Controles segmentados  */

  /* Los tres controles segmentados no son la misma cosa: el de vistas es un
     tablist real (gobierna un panel), el de moneda y el de tema son grupos de
     botones de dos estados. Cada uno usa su atributo. */
  function stateAttr(seg) {
    return seg.getAttribute('role') === 'tablist' ? 'aria-selected' : 'aria-pressed';
  }

  /* La primera colocación va sin transición: si se anima desde scaleX(1) en el
     origen, el primer cuadro pinta el pulgar encimado en la opción vecina. */
  function moveThumb(seg, instant) {
    var thumb = seg.querySelector('.seg__thumb');
    var active = seg.querySelector('button[' + stateAttr(seg) + '="true"]');
    if (!thumb || !active) return;
    if (instant) thumb.style.transition = 'none';
    thumb.style.transform = 'translateX(' + (active.offsetLeft - 2) + 'px) scaleX(' + active.offsetWidth + ')';
    if (instant) {
      void thumb.offsetWidth;
      thumb.style.transition = '';
    }
  }

  function wireSeg(seg, onPick) {
    if (!seg) return;
    var buttons = Array.prototype.slice.call(seg.querySelectorAll('button'));
    var attr = stateAttr(seg);

    function select(btn, focus) {
      buttons.forEach(function (b) {
        var on = b === btn;
        b.setAttribute(attr, String(on));
        b.tabIndex = on ? 0 : -1;
      });
      moveThumb(seg);
      if (focus) btn.focus();
      onPick(btn);
    }

    buttons.forEach(function (b, i) {
      b.tabIndex = b.getAttribute(attr) === 'true' ? 0 : -1;
      b.addEventListener('click', function () { select(b, false); });
      b.addEventListener('keydown', function (e) {
        var next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
        if (next < 0 || next >= buttons.length) return;
        e.preventDefault();
        select(buttons[next], true);
      });
    });

    moveThumb(seg, true);
  }

  wireSeg(themeSeg, function (btn) { applyTheme(btn.dataset.themeSet, true); });
  wireSeg(document.getElementById('segMoneda'), function (btn) { setCurrency(btn.dataset.currency); });
  wireSeg(document.getElementById('segVista'), function (btn) { setView(btn.dataset.view); });

  window.addEventListener('resize', function () {
    document.querySelectorAll('.seg').forEach(function (s) { moveThumb(s, true); });
  });

  /* ----------------------------------------------------- 4. Moneda       */

  function setCurrency(cur) {
    state.currency = cur;
    document.querySelectorAll('[data-currency-label]').forEach(function (el) {
      el.textContent = cur;
    });
    document.querySelectorAll('[data-usd]').forEach(function (el) {
      el.textContent = money(parseFloat(el.dataset.usd));
    });
    var seg = document.getElementById('segMoneda');
    if (seg) {
      seg.querySelectorAll('button').forEach(function (b) {
        var on = b.dataset.currency === cur;
        b.setAttribute('aria-pressed', String(on));
        b.tabIndex = on ? 0 : -1;
      });
      moveThumb(seg);
    }
    renderView();
  }

  var btnMoneda = document.getElementById('btnMoneda');
  if (btnMoneda) {
    btnMoneda.addEventListener('click', function () {
      setCurrency(state.currency === 'USD' ? 'MXN' : 'USD');
    });
  }

  /* --------------------------------------- 5. Datos de la cartera muestra */

  var MESES = ['J', 'A', 'S', 'O', 'N', 'D', 'E', 'F', 'M', 'A', 'M', 'J'];
  var CARTERA = [100, 103.2, 106.8, 104.1, 97.5, 91.5, 95.8, 100.9, 104.6, 107.2, 109.1, 111.4];
  var INDICE  = [100, 102.1, 104.9, 103.0, 97.8, 93.4, 97.1, 101.3, 104.0, 106.4, 108.2, 109.8];

  /* Misma regla que el tablero de cotizaciones: logotipo propio si existe, y
     si no, la clave se sostiene sola. Aquí no hay bandera de respaldo porque la
     fila ya dice de qué activo se trata.

     Cobertura real, comprobada contra Simple Icons (CC0):
       AAPL  → apple      · BTC → bitcoin
       MSFT  → no existe, lo retiraron por política de marca
       VTI   → Vanguard no está en el catálogo
       CETES 28, FUNO11   → instrumentos sin marca publicable
       Efectivo           → no es un emisor; se queda en letra, como pediste

     El hueco se reserva igual para que las claves queden alineadas. Inventar un
     monograma sería fabricar una identidad que no existe. */
  var MARCAS = { AAPL: 'apple', BTC: 'bitcoin' };

  /* El efectivo no tiene emisor: lleva marca de letra, como pediste. */
  var MARCAS_LETRA = { Efectivo: '$' };

  function assetMark(clave) {
    var slug = MARCAS[clave];
    if (slug) {
      var url = "url('assets/landing-v4/marks/" + slug + ".svg')";
      return '<i class="asset-mark asset-mark--logo" aria-hidden="true" ' +
             'style="-webkit-mask-image:' + url + ';mask-image:' + url + '"></i>';
    }
    var letra = MARCAS_LETRA[clave];
    if (letra) return '<span class="asset-mark asset-mark--letra" aria-hidden="true">' + letra + '</span>';
    return '<span class="asset-mark asset-mark--none" aria-hidden="true"></span>';
  }

  var POSICIONES = [
    { clave: 'VTI',      peso: 22.1 },
    { clave: 'AAPL',     peso: 18.4 },
    { clave: 'MSFT',     peso: 15.8 },
    { clave: 'CETES 28', peso: 14.7 },
    { clave: 'BTC',      peso: 11.2 },
    { clave: 'FUNO11',   peso:  9.6 },
    { clave: 'Efectivo', peso:  8.2 }
  ];

  var CLASES = [
    { nombre: 'Acciones',   peso: 34.2, usd: 78400 },
    { nombre: 'ETF',        peso: 22.1, usd: 50660 },
    { nombre: 'Renta fija', peso: 14.7, usd: 33700 },
    { nombre: 'Cripto',     peso: 11.2, usd: 25670 },
    { nombre: 'FIBRA',      peso:  9.6, usd: 22010 },
    { nombre: 'Efectivo',   peso:  8.2, usd: 18800 }
  ];

  /* Curva submarina: caída contra el máximo previo, derivada de la serie. */
  function drawdown(serie) {
    var max = -Infinity;
    return serie.map(function (v) {
      max = Math.max(max, v);
      return (v / max - 1) * 100;
    });
  }

  /* ------------------------------------------------------- 6. Gráficas   */

  /* El viewBox se mantiene cerca del ancho real del panel para que el texto de
     los ejes no acabe renderizado a la mitad de su tamaño. */
  var W = 520, H = 200, PAD = { l: 34, r: 12, t: 14, b: 22 };
  var IW = W - PAD.l - PAD.r, IH = H - PAD.t - PAD.b;

  function xAt(i, n) { return PAD.l + (IW * i) / (n - 1); }

  function scaler(min, max) {
    return function (v) { return PAD.t + IH - ((v - min) / (max - min)) * IH; };
  }

  function pathOf(serie, y) {
    return serie.map(function (v, i) {
      return (i ? 'L' : 'M') + xAt(i, serie.length).toFixed(1) + ',' + y(v).toFixed(1);
    }).join(' ');
  }

  function svgOpen() {
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-labelledby="chartTitle">';
  }

  function gridRows(values, y, fmt) {
    return values.map(function (v) {
      var yy = y(v).toFixed(1);
      return '<line class="grid-line" x1="' + PAD.l + '" y1="' + yy + '" x2="' + (W - PAD.r) + '" y2="' + yy + '"/>' +
             '<text class="axis-txt" x="' + (PAD.l - 7) + '" y="' + (parseFloat(yy) + 3).toFixed(1) + '" text-anchor="end">' + fmt(v) + '</text>';
    }).join('');
  }

  function monthLabels() {
    return MESES.map(function (m, i) {
      return '<text class="axis-txt" x="' + xAt(i, MESES.length).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + m + '</text>';
    }).join('');
  }

  function chartBenchmark() {
    var all = CARTERA.concat(INDICE);
    var min = Math.floor(Math.min.apply(null, all) / 5) * 5 - 1;
    var max = Math.ceil(Math.max.apply(null, all) / 5) * 5;
    var y = scaler(min, max);
    var lineCartera = pathOf(CARTERA, y);
    var area = lineCartera + ' L' + xAt(11, 12).toFixed(1) + ',' + (PAD.t + IH) + ' L' + PAD.l + ',' + (PAD.t + IH) + ' Z';
    var lastX = xAt(11, 12).toFixed(1), lastY = y(CARTERA[11]).toFixed(1);

    return svgOpen() +
      '<title id="chartTitle">Cartera de muestra e índice de referencia, base 100, doce meses.</title>' +
      gridRows([min + 1, 100, max], y, function (v) { return Math.round(v); }) +
      '<path class="series-area" d="' + area + '"/>' +
      '<path class="series-bmk" d="' + pathOf(INDICE, y) + '"/>' +
      '<path class="series" d="' + lineCartera + '"/>' +
      '<circle class="marker" cx="' + lastX + '" cy="' + lastY + '" r="3.4"/>' +
      monthLabels() +
      '</svg>' +
      '<ul class="alloc__legend" style="margin-top:1rem">' +
        '<li><span class="alloc__key" style="background:var(--cobalt-line)"></span> Cartera de muestra <b class="pos">+11.4 %</b></li>' +
        '<li><span class="alloc__key" style="background:var(--ink-3)"></span> S&amp;P 500 <b class="pos">+9.8 %</b></li>' +
      '</ul>';
  }

  function chartRiesgo() {
    var dd = drawdown(CARTERA);
    var y = scaler(-16, 0);
    var line = pathOf(dd, y);
    var area = line + ' L' + xAt(11, 12).toFixed(1) + ',' + y(0).toFixed(1) + ' L' + PAD.l + ',' + y(0).toFixed(1) + ' Z';

    return svgOpen() +
      '<title id="chartTitle">Caída de la cartera de muestra desde su máximo previo, mes a mes.</title>' +
      gridRows([0, -5, -10, -15], y, function (v) { return v === 0 ? '0' : v + '%'; }) +
      '<path class="series-area" d="' + area + '" style="opacity:.14"/>' +
      '<path class="series" d="' + line + '" style="stroke:var(--neg)"/>' +
      '<line class="zero-line" x1="' + PAD.l + '" y1="' + y(0).toFixed(1) + '" x2="' + (W - PAD.r) + '" y2="' + y(0).toFixed(1) + '"/>' +
      '<circle class="marker" style="fill:var(--neg)" cx="' + xAt(5, 12).toFixed(1) + '" cy="' + y(dd[5]).toFixed(1) + '" r="3.4"/>' +
      monthLabels() +
      '</svg>' +
      '<p class="note" style="margin-top:.75rem">Punto marcado: mínimo del periodo, −14.3 % en diciembre de 2025.</p>';
  }

  function chartAsignacion() {
    var segs = CLASES.map(function (c) {
      return '<span class="alloc__seg" style="flex:0 0 ' + c.peso + '%" title="' + c.nombre + ' ' + c.peso + ' %"></span>';
    }).join('');

    var legend = CLASES.map(function (c) {
      return '<li><span class="alloc__key"></span>' + c.nombre + ' <b>' + c.peso.toFixed(1) + ' %</b></li>';
    }).join('');

    /* Debajo de la composición por clase, la misma cartera desglosada por
       posición: es la pregunta que sigue de inmediato («¿y en qué, exactamente?»). */
       var max = POSICIONES[0].peso;
    var filas = POSICIONES.map(function (p) {
      return '<li class="wbar">' +
               '<span class="wbar__lab">' + assetMark(p.clave) + p.clave + '</span>' +
               '<span class="wbar__track"><span class="wbar__fill" style="width:' + ((p.peso / max) * 100).toFixed(1) + '%"></span></span>' +
               '<b class="wbar__val">' + p.peso.toFixed(1) + ' %</b>' +
             '</li>';
    }).join('');

    return '<div class="alloc">' +
             '<div class="alloc__bar" role="img" aria-label="Barra de composición: ' +
                CLASES.map(function (c) { return c.nombre + ' ' + c.peso + ' por ciento'; }).join(', ') + '.">' + segs + '</div>' +
             '<ul class="alloc__legend">' + legend + '</ul>' +
             '<div class="alloc__split">' +
               '<span class="label">Peso por posición</span>' +
               '<ul class="wbars">' + filas + '</ul>' +
             '</div>' +
           '</div>';
  }

  /* --------------------------------------------------------- 7. Tablas   */

  function tablaAsignacion() {
    var rows = CLASES.map(function (c) {
      return '<tr><td>' + c.nombre + '</td><td class="n">' + c.peso.toFixed(1) + ' %</td><td class="n">' + money(c.usd) + '</td></tr>';
    }).join('');
    return '<table class="tbl"><thead><tr><th scope="col">Clase</th><th scope="col" class="n">Peso</th>' +
           '<th scope="col" class="n">Valor ' + state.currency + '</th></tr></thead><tbody>' + rows +
           '<tr><td><b>Total</b></td><td class="n"><b>100.0 %</b></td><td class="n"><b>' + money(229240) + '</b></td></tr>' +
           '</tbody></table>';
  }

  function tablaRiesgo() {
    var filas = [
      ['Volatilidad anual', '12.6 %', '', '12 m'],
      ['Máx. drawdown', '−14.3 %', 'neg', 'dic 2025'],
      ['VaR 95 % · 1 mes', '−6.8 %', 'neg', 'paramétrico'],
      ['Sharpe', '1.08', '', '12 m'],
      ['Correlación media', '0.42', '', 'entre posiciones'],
      ['HHI', '0.16', '', 'concentración']
    ];
    var rows = filas.map(function (f) {
      return '<tr><td>' + f[0] + '</td><td class="n ' + f[2] + '">' + f[1] + '</td><td class="n">' + f[3] + '</td></tr>';
    }).join('');
    return '<table class="tbl"><thead><tr><th scope="col">Métrica</th><th scope="col" class="n">Valor</th>' +
           '<th scope="col" class="n">Ventana</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function tablaBenchmark() {
    var filas = [
      ['Cartera de muestra', '+11.4 %', '—'],
      ['S&amp;P 500', '+9.8 %', '+1.6 pp'],
      ['Cartera 60/40', '+7.2 %', '+4.2 pp']
    ];
    var rows = filas.map(function (f) {
      return '<tr><td>' + f[0] + '</td><td class="n pos">' + f[1] + '</td><td class="n">' + f[2] + '</td></tr>';
    }).join('');
    return '<table class="tbl"><thead><tr><th scope="col">Serie</th><th scope="col" class="n">Rend. 12 m</th>' +
           '<th scope="col" class="n">Diferencia</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  /* ---------------------------------------------------------- 8. Vistas  */

  var VISTAS = {
    asignacion: {
      title: 'Asignación por clase de activo',
      desc: 'Peso real de cada clase sobre el valor total, recalculado con el precio de mercado del día.',
      note: 'Concentración baja: HHI 0.16 sobre siete posiciones.',
      graphic: chartAsignacion,
      table: tablaAsignacion
    },
    riesgo: {
      title: 'Caída desde el máximo previo',
      desc: 'Cuánto estuvo la cartera por debajo de su máximo anterior, mes a mes. Es la lectura que contesta «¿qué tan mal se puso?».',
      note: 'La peor caída del periodo se recuperó en cinco meses.',
      graphic: chartRiesgo,
      table: tablaRiesgo
    },
    benchmark: {
      title: 'Cartera contra su índice de referencia',
      desc: 'Índice base 100 al inicio del periodo. La línea punteada es el S&P 500.',
      note: 'Beta 0.87 · correlación 0.91 con el índice · tracking error 4.2 %.',
      graphic: chartBenchmark,
      table: tablaBenchmark
    }
  };

  var elTitle = document.getElementById('viewTitle');
  var elDesc = document.getElementById('viewDesc');
  var elNote = document.getElementById('viewNote');
  var elGraphic = document.getElementById('viewGraphic');
  var elTable = document.getElementById('viewTable');

  function renderView() {
    if (!elGraphic || !elTable) return;
    var v = VISTAS[state.view];
    if (!v) return;
    elTitle.textContent = v.title;
    elDesc.textContent = v.desc;
    elNote.textContent = v.note;
    elGraphic.innerHTML = v.graphic();
    elTable.innerHTML = v.table();
  }

  function setView(name) {
    state.view = name;
    renderView();
  }

  /* ------------------------------------- 8b. Tablero de cotizaciones     */

  /* Mismos símbolos y misma fuente de precios que la landing en producción
     (`initTickerBar` en app.js). Sin logos ni banderas: en este registro una
     cotización es texto — clave, precio, variación. */
  /* La marca de cada cotización sigue una sola regla: logotipo propio si
     existe, y si no, la bandera del mercado donde cotiza. Los pares de divisas
     llevan las dos banderas, base y contraparte. Nada se inventa: Microsoft y
     Nasdaq no tienen logo en Simple Icons (lo retiraron por política de marca),
     así que caen a la bandera de su mercado. Los archivos están en
     assets/landing-v4/marks/ — sin CDN en tiempo de ejecución. */
  var QUOTES = [
    { symbol: '^GSPC',    label: 'S&P 500',    flag: 'us' },
    { symbol: '^DJI',     label: 'Dow Jones',  flag: 'us' },
    { symbol: '^IXIC',    label: 'Nasdaq',     flag: 'us' },
    { symbol: 'AAPL',     label: 'AAPL',       prefix: '$', logo: 'apple' },
    { symbol: 'NVDA',     label: 'NVDA',       prefix: '$', logo: 'nvidia' },
    { symbol: 'MSFT',     label: 'MSFT',       prefix: '$', flag: 'us' },
    { symbol: 'TSLA',     label: 'TSLA',       prefix: '$', logo: 'tesla' },
    { symbol: 'BTC-USD',  label: 'BTC/USD',    prefix: '$', logo: 'bitcoin' },
    { symbol: 'ETH-USD',  label: 'ETH/USD',    prefix: '$', logo: 'ethereum' },
    { symbol: 'EURUSD=X', label: 'EUR/USD',    forex: true, pair: ['eu', 'us'] },
    { symbol: 'GBPUSD=X', label: 'GBP/USD',    forex: true, pair: ['gb', 'us'] },
    { symbol: 'USDJPY=X', label: 'USD/JPY',    forex: true, pair: ['us', 'jp'] },
    { symbol: 'GC=F',     label: 'Oro',        prefix: '$', flag: 'us' },
    { symbol: 'CL=F',     label: 'WTI',        prefix: '$', flag: 'us' },
    { symbol: '^FTSE',    label: 'FTSE 100',   flag: 'gb' },
    { symbol: '^N225',    label: 'Nikkei',     prefix: '¥', flag: 'jp' },
    { symbol: '^HSI',     label: 'Hang Seng',  flag: 'hk' },
    { symbol: 'EWZ',      label: 'Brasil ETF', prefix: '$', flag: 'br' }
  ];

  var MARKS = 'assets/landing-v4/marks/';

  function flagImg(code) {
    /* Sin `loading="lazy"`: dentro de una cinta que se desplaza, el navegador no
       vuelve a evaluar la intersección y las banderas quedarían en blanco. Son
       250 B cada una. */
    return '<img class="mark mark--flag" src="' + MARKS + 'flag-' + code + '.png" alt="" ' +
           'width="40" height="30" decoding="async">';
  }

  function quoteMark(q) {
    if (q.logo) {
      /* El logotipo va como máscara y no como imagen: así toma el color de la
         tinta del tema y no mete cinco colores de marca en una página que
         tiene un solo acento. */
      var url = "url('" + MARKS + q.logo + ".svg')";
      return '<i class="mark mark--logo" aria-hidden="true" style="-webkit-mask-image:' + url + ';mask-image:' + url + '"></i>';
    }
    if (q.pair) return '<span class="mark-pair" aria-hidden="true">' + flagImg(q.pair[0]) + flagImg(q.pair[1]) + '</span>';
    if (q.flag) return flagImg(q.flag);
    return '';
  }

  var track = document.getElementById('quotesTrack');
  var quotesLabel = document.getElementById('quotesLabel');
  var lastPrices = {};

  function fmtQuote(price, q) {
    var p = q.prefix || '';
    if (q.forex) return price.toFixed(4);
    if (price >= 10000) return p + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (price >= 1000)  return p + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return p + price.toFixed(2);
  }

  function quoteItem(q, price, change, tick) {
    var cls = Math.abs(change) < 0.005 ? 'is-flat' : change > 0 ? 'is-up' : 'is-down';
    var mark = Math.abs(change) < 0.005 ? '·' : change > 0 ? '▲' : '▼';
    var chg = price == null ? '—' : mark + ' ' + Math.abs(change).toFixed(2) + ' %';
    return '<span class="quote' + (tick ? ' ' + tick : '') + '">' +
             quoteMark(q) +
             '<span class="quote__sym">' + q.label + '</span>' +
             '<span class="quote__px">' + (price == null ? '—' : fmtQuote(price, q)) + '</span>' +
             '<span class="quote__chg ' + cls + '">' + chg + '</span>' +
           '</span>';
  }

  function renderQuotes(map, sourceNote) {
    if (!track) return;
    var items = QUOTES.map(function (q) {
      var e = map[q.symbol];
      if (!e || e.price == null || e.prev == null) return quoteItem(q, null, 0, '');
      var change = ((e.price - e.prev) / e.prev) * 100;
      var before = lastPrices[q.symbol];
      var tick = before != null && before !== e.price ? (e.price > before ? 'tick-up' : 'tick-down') : '';
      lastPrices[q.symbol] = e.price;
      return quoteItem(q, e.price, change, tick);
    }).join('');

    /* Duplicado: la cinta se desplaza hasta -50 % y vuelve a empezar sin corte. */
    track.innerHTML = items + items;
    track.dataset.state = 'ready';
    if (quotesLabel) quotesLabel.title = sourceNote;
    track.title = sourceNote;
  }

  function normalize(payload) {
    /* /api/prices y la Cloud Function responden {SYM:{price,prev}}; el archivo
       estático trae {tickers:[{symbol,price,previousClose}]}. */
    var map = {};
    if (payload && payload.tickers) {
      payload.tickers.forEach(function (t) { map[t.symbol] = { price: t.price, prev: t.previousClose }; });
      return map;
    }
    Object.keys(payload || {}).forEach(function (k) {
      var e = payload[k];
      if (e && e.price != null) map[k] = { price: e.price, prev: e.prev != null ? e.prev : e.previousClose };
    });
    return map;
  }

  function staticQuotes() {
    if (!window.TICKERS_DATA) return null;
    var d = window.TICKERS_DATA.updatedAt ? new Date(window.TICKERS_DATA.updatedAt) : null;
    return {
      map: normalize(window.TICKERS_DATA),
      note: d ? 'Cierre del ' + d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) +
                ' · sin conexión al servidor de precios'
              : 'Precios de referencia sin conexión al servidor'
    };
  }

  function loadQuotes() {
    if (!track) return;
    var symbols = encodeURIComponent(QUOTES.map(function (q) { return q.symbol; }).join(','));
    var local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    var urls = local
      ? ['/api/prices?symbols=' + symbols,
         'https://us-central1-portify-6467f.cloudfunctions.net/prices?symbols=' + symbols]
      : ['https://us-central1-portify-6467f.cloudfunctions.net/prices?symbols=' + symbols];

    (function attempt(i) {
      if (i >= urls.length) {
        var s = staticQuotes();
        if (s) renderQuotes(s.map, s.note);
        return;
      }
      fetch(urls[i])
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (data) {
          var map = normalize(data);
          if (!Object.keys(map).length) throw new Error('vacío');
          renderQuotes(map, 'Precios en vivo · ' + new Date().toLocaleTimeString('es-MX'));
        })
        .catch(function () { attempt(i + 1); });
    })(0);
  }

  loadQuotes();
  window.setInterval(function () {
    if (document.visibilityState === 'visible') loadQuotes();
  }, 60000);

  /* --------------------------------------------- 9. Revelado al scroll   */

  var reveals = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && root.classList.contains('motion-ok')) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ------------------------------------------------------- 10. Arranque  */

  applyTheme(root.getAttribute('data-theme') || 'light', false);
  renderView();

  /* Las fuentes cambian el ancho de los botones: recoloca el indicador
     cuando terminen de cargar. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      document.querySelectorAll('.seg').forEach(function (s) { moveThumb(s, true); });
    });
  }
})();
