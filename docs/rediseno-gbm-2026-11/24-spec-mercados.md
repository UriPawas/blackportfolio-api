# 24 · Mercados en la app Campo (estilo Valyndor) — especificación vinculante

26-nov-2026. Sustituye el botón deshabilitado "Mercados llegará pronto" de `main.html`. La sección vieja sigue intacta en `main-clasico.html` (terminal con 33 indicadores, dibujo, Heikin-Ashi…). Esta versión NO es un terminal: es "banda de mercados + una sola gráfica + lista de seguimiento", con datos reales y sin inventar nada.

Archivos (cada uno tiene UN dueño; nadie toca archivos ajenos):

| Archivo | Global | Qué es |
|---|---|---|
| `campo/mercados-ind.js` | `window.CampoInd` | Matemática pura de indicadores. Sin DOM. |
| `campo/mercados-chart.js` | `window.CampoMktChart` | Motor de gráfica en `<canvas>` propio (sin librerías). |
| `campo/mercados.js` | `window.CampoMercados` | Controlador de la sección: monta en `#secMercados`, datos, estado, interacción. |
| `campo/mercados.css` | — | Estilos de la sección, prefijo `mk-`. |
| `main.html`, `campo/settings.js` | — | Integración (enrutador, menú, carga). Lo hace el orquestador. |

Orden de carga (lo pone el orquestador en `CAMPO_MODULES`): `… 'mkt', 'app', … 'mercados-ind', 'mercados-chart', 'mercados', 'fx'`. Es decir: `window.PORTIFY_DEMO`, `window.CampoMarks`, `window.__campo` ya existen cuando corre `mercados.js`; `window.bpFx` (fx.js) carga DESPUÉS, así que se usa de forma perezosa (`window.bpFx && bpFx.odo(el)` al pintar, no al definir).

Reglas globales (todas verificables):
1. ES5 en IIFE `(function(){ 'use strict'; … })();` como el resto de `campo/*.js`. Sin `import`, sin librerías, sin `fetch` con método distinto de GET.
2. Colores SIEMPRE de los tokens CSS (`--accent`, `--accent-ink`, `--gain`, `--loss`, `--text`, `--text-2`, `--text-3`, `--s1`, `--s2`, `--s3`, `--line`, `--line-strong`, `--grid`, `--font`, `--mono`). Nunca hex fijo en CSS de la sección salvo las 3 series de comparación (ver §3.4). En JS el tema se lee de `document.documentElement.dataset.theme` y se repinta con un `MutationObserver` sobre `html[data-theme]` + `window.__campo.repaints.push(fn)`.
3. `prefers-reduced-motion: reduce` → sin barridos, sin morph, sin pulsos, sin escalonados; los cambios son instantáneos. Nada queda con `opacity:0` esperando una animación.
4. Cifras: `font-variant-numeric: tabular-nums`, `Intl.NumberFormat('es-MX')`. Signo negativo con `−` (U+2212) en textos visibles. La variación SIEMPRE lleva un segundo canal además del color: flecha `▲`/`▼`/`▪` (marcado `.delta.gain|.loss|.flat` con `<i class="arw">`, igual que `campo/shell.js`).
5. Cero recomendaciones de inversión, cero cifras inventadas. Si falta un dato: "Sin dato" en `--text-3`, nunca `0`.
6. Textos de interfaz en español de México, tuteo, frases cortas.
7. Objetivos táctiles ≥ 44 px en móvil (≤ 640 px). Sin desborde horizontal de página a 375 px.

---

## 1. Datos (los hace `mercados.js`)

Base de la API (igual que `campo/datos.js`): `(location.hostname === '127.0.0.1' || location.hostname === 'localhost' ? 'http://127.0.0.1:8000' : 'https://blackportfolio-api-production.up.railway.app') + '/api'`. Todos los endpoints de abajo son públicos (sin token). Límites por IP: chart 30/min, search 60/min, prices 30/min, info 30/min, news 20/min → caché en memoria obligatoria y nunca más de 1 petición en vuelo por clave.

`getJSON(url)`: timeout 12 s (AbortController), 1 reintento; 429 → espera 3 s y reintenta una vez; 404 → `null`. Caché en memoria `{key → {t, v, p}}` con TTL por tipo y la promesa en vuelo compartida (`p`).

| Uso | Petición | TTL |
|---|---|---|
| Diario (1M…5A y la tira de rendimientos) | `/chart/{sym}?range=5y&interval=1d` | 15 min |
| Máx | `/chart/{sym}?range=max&interval=1mo` | 60 min |
| 1D (última sesión) | `/chart/{sym}?range=5d&interval=5m` y se queda SOLO con la última sesión (mismo día calendario en la zona `meta.exchangeTimezoneName`; si no viene, el día de la última vela en `America/New_York`). NO usar `range=1d`: el backend lo convierte en "últimas 24 h" y en fin de semana sale vacío. | 60 s |
| 5D | `/chart/{sym}?range=5d&interval=15m` | 60 s |
| Cotizaciones vivas | `/prices?symbols=A,B,…` (máx 60) → `{SYM:{price, prev}}` | sin caché; sondeo 60 s |
| Búsqueda | `/search?q=` → `{quotes:[{symbol, shortname, longname, quoteType, exchDisp, exchange, typeDisp}]}`; quedarse con `quoteType ∈ EQUITY, ETF, INDEX, CRYPTOCURRENCY, MUTUALFUND, CURRENCY, FUTURE`, máx 8 | 5 min |
| Ficha | `/info/{sym}` (dict de yfinance) | 60 min |
| Noticias | `/news/{sym}?language=es` → `{news:[{article_title, article_url, source, post_time_utc}]}` | 15 min |

`parseChart(j)` → `{ bars:[{t(ms), o, h, l, c, v}], meta }`:
- `r = j.chart.result[0]`; `q = r.indicators.quote[0]`. Descarta velas con `c` nulo o ≤ 0. Si `o/h/l` faltan, usa `c`. `v` nulo → 0.
- `meta = { sym: m.symbol, name: m.longName || m.shortName || sym, exch: m.fullExchangeName || m.exchangeName || '', ccy: m.currency || '', type: m.instrumentType || '', price: m.regularMarketPrice, prev: m.chartPreviousClose ?? m.previousClose, hi52: m.fiftyTwoWeekHigh, lo52: m.fiftyTwoWeekLow, tz: m.exchangeTimezoneName || 'America/New_York', open: m.currentTradingPeriod && m.currentTradingPeriod.regular }` (`open` = `{start, end}` en segundos).

Rendimiento de cada periodo de la tira (sobre el diario 5y, `last` = precio vivo si existe, si no el último cierre):
- 1D: `last / prev − 1` con `prev` de `/prices` (o `meta.prev` del diario).
- 5D, 1M, 3M, 6M, 1A, 5A: contra el cierre de la primera sesión con fecha ≥ (hoy − 5 sesiones | 1, 3, 6, 12, 60 meses). Si la historia no alcanza: "Sin dato".
- YTD: contra el último cierre del año anterior.
- Máx: contra el primer cierre de la serie mensual (solo si ya se cargó; si no, la celda dice "—" hasta elegirla).
- `^TNX` (bono 10a) es rendimiento en %: su variación se expresa en puntos (`+0.05 pp`), no en %.

---

## 2. `campo/mercados-ind.js` → `window.CampoInd`

Funciones puras. Entrada: arreglos de números del mismo largo que las velas. Salida: arreglos del MISMO largo con `null` donde aún no hay suficientes datos (nunca `NaN`, nunca recortar el arreglo).

```
CampoInd.sma(values, n)                       → (number|null)[]
CampoInd.ema(values, n)                       → semilla = SMA de los primeros n; k = 2/(n+1)
CampoInd.bollinger(values, n=20, k=2)         → {mid, upper, lower}  (desviación POBLACIONAL de la ventana)
CampoInd.rsi(values, n=14)                    → Wilder: primer promedio = media simple de n cambios; luego avg = (avg*(n−1)+x)/n; avgLoss=0 → 100
CampoInd.macd(values, fast=12, slow=26, sig=9)→ {macd, signal, hist}  (signal = EMA de macd sobre los valores no nulos)
CampoInd.stoch(high, low, close, k=14, d=3)   → {k, d}   (%K = 100·(c−LL)/(HH−LL); HH=LL → 50; %D = SMA(d) de %K)
CampoInd.vwap(high, low, close, volume, t)    → VWAP intradía que se reinicia en cada día calendario de `t` (ms); volumen 0 en todo el día → null
CampoInd.catalog                              → lista de abajo (la UI se arma con ella)
```

`catalog` (orden = orden en el menú):

| key | label | grupo | tipo | color (token) |
|---|---|---|---|---|
| `vol` | Volumen | Volumen | `volume` (lo dibuja el motor) | — |
| `sma20` | Media simple 20 | Medias | `overlay` | `--text-2` |
| `sma50` | Media simple 50 | Medias | `overlay` | serie A |
| `sma200` | Media simple 200 | Medias | `overlay` | serie C |
| `ema20` | Media exponencial 20 | Medias | `overlay` | serie B |
| `bb` | Bandas de Bollinger (20, 2) | Bandas | `band` | `--text-3` |
| `vwap` | VWAP (solo 1D y 5D) | Bandas | `overlay`, `intraday: true` | serie C |

Las series A/B/C pueden usarse en indicadores porque en modo comparación los indicadores se apagan (§4.11): nunca conviven.
| `rsi` | RSI (14) | Osciladores | `pane`, guías 30/70, rango 0–100 | `--accent-ink` |
| `macd` | MACD (12, 26, 9) | Osciladores | `pane`, histograma + 2 líneas | macd `--accent-ink`, señal `--text-3`, hist gain/loss |
| `stoch` | Estocástico (14, 3) | Osciladores | `pane`, guías 20/80, rango 0–100 | %K `--accent-ink`, %D `--text-3` |

Cada entrada: `{key, label, group, kind:'volume'|'overlay'|'band'|'pane', intraday?:true, compute(bars) → resultado}` donde `compute` recibe las velas `{t,o,h,l,c,v}` y regresa lo que el motor necesita (ver `setOverlays`/`setPanes` en §3). Los colores van como NOMBRE de token (`'--accent-ink'`) o como `'A'|'B'|'C'` (series de §3.4) y el motor los resuelve.

Pruebas (Node, archivo fuera del repo en el scratchpad): SMA/EMA de una rampa conocida, RSI de la serie clásica de Wilder (14 cambios) con 2 decimales, MACD de una constante = 0, Bollinger de una constante (upper=lower=mid), Estocástico con HH=LL → 50, VWAP que se reinicia al cambiar de día, largos de salida = largo de entrada.

---

## 3. `campo/mercados-chart.js` → `window.CampoMktChart`

```
var ch = CampoMktChart.create(host, opts)
  host: elemento contenedor con alto fijo (CSS); el motor inserta UN <canvas> y sus etiquetas (.tag) dentro.
  opts: { fmt(v) → string del precio, fmtPct(v) → string, onCross(info|null), label: 'texto accesible' }
ch.setData({ bars, intraday:bool, prev:number|null, tz:'America/New_York', dec:2 }, { animate:'sweep'|'morph'|false })
ch.setType('area'|'line'|'candles')
ch.setCompare([{ label, color:'A'|'B'|'C', bars:[{t,c}] }])   // [] = modo precio. Con ≥1 → modo % rebasado a 0 al inicio de la ventana visible
ch.setOverlays([{ key, color, values:[], band?:{ upper:[], lower:[] } }])  // ignorado en modo %
ch.setPanes([{ key, label, series:[{ values:[], color, kind:'line'|'hist' }], min?, max?, guides?:[30,70] }])  // ignorado en modo %
ch.setVolume(bool)
ch.live(price)      // actualiza el cierre (y h/l) de la última vela; mueve la etiqueta del último precio y lanza un pulso "sonar"
ch.replay()         // repite el barrido de entrada
ch.resize(); ch.repaint(); ch.destroy()
```

`onCross(info)` se llama al mover la mira y con `null` al salir: `info = { i, t, o, h, l, c, v, chg /* % contra la vela anterior */, cmp: [{label, color, pct}], ind: { key: valor | {k, d} | {macd, signal, hist} } }`. El controlador pinta la lectura (fuera del lienzo).

### 3.1 Trazado
- Lienzo con DPR ≤ 2, fondo TRANSPARENTE (detrás va la rejilla WebGL de `campo-shaders.js`, que se monta sola en `.mkt-cv`).
- Márgenes: eje de precio a la DERECHA (ancho = etiqueta más larga + 16 px), eje de tiempo abajo (20 px). Paneles de osciladores debajo del principal, 84 px cada uno, separados por una línea `--line`, con su etiqueta arriba a la izquierda (11 px, `--text-3`).
- Volumen: barras en el 18 % inferior del panel principal, `--text-3` al 22 % (vela que sube) / 14 % (baja); nunca tapan el precio (se dibujan antes).
- Rejilla horizontal: 4–6 marcas "bonitas" (1, 2, 2.5, 5 × 10ⁿ), línea `--grid` de 1 px a medio píxel. Sin rejilla vertical.
- Eje de tiempo adaptativo: intradía `HH:mm` (y el día cuando cambia en 5D: `lun 24`); diario `24 nov`; > 1 año `nov 25`; Máx `2019`. Etiquetas que no se encimen (mínimo 64 px entre ellas). Fuente: `11px var(--font)` resuelta con `getComputedStyle`.
- Área: línea de 1.75 px `--accent-ink` + relleno con degradado vertical `--accent` 22 % → 0 %. Línea: igual sin relleno. Velas: cuerpo lleno `--gain`/`--loss` (mínimo 1 px de alto), mecha de 1 px, ancho de cuerpo = 70 % de la ranura (mín 1 px); con más velas que píxeles/2, caer a línea automáticamente.
- Modo %: cada serie como línea rebasada a 0 % en la primera vela visible; principal `--accent-ink` 2 px; comparaciones 1.5 px; línea de 0 % punteada `--line-strong`. Etiquetas de % al borde derecho, una por serie, del color de la serie, apiladas sin encimarse (separación mínima 18 px).
- Último precio: línea horizontal punteada fina del color del signo del día (`--gain`/`--loss`; si no hay `prev`, `--accent-ink`) + etiqueta `.tag.tag-last` (clase ya existente en `campo.css`) pegada al eje derecho, con el fondo de ese color.
- Línea de cierre anterior (solo 1D): punteada `--text-3` al 50 % con la leyenda "Cierre ant." a la izquierda.

### 3.2 Mira e interacción
- Puntero: la mira se ajusta a la vela más cercana (magnética en X); línea vertical y horizontal de 1 px `--text-3` al 45 %, punteadas `[3,3]`; punto de 4 px con anillo `--s1` sobre la serie principal (en velas: sobre el cierre). Etiquetas `.tag.tag-y` (precio en el eje) y `.tag.tag-x` (fecha abajo).
- Táctil: `pointerdown` + arrastre mueve la mira; al soltar se oculta a los 1.2 s. `touch-action: pan-y` en el lienzo.
- Teclado: el lienzo tiene `tabindex="0"`, `role="img"` y `aria-label` (opts.label + último precio). `←/→` mueven la mira una vela (Shift = 10), `Home/End` extremos, `Esc` la quita. Foco visible con `--ring`.
- Rueda / pellizco: NO (no es un terminal).

### 3.3 Movimiento (todo con `requestAnimationFrame`, un solo bucle que se detiene cuando no hay nada animándose)
- `sweep` (primera carga y `replay`): recorte de izquierda a derecha en 750 ms `cubic-bezier(.16,1,.3,1)`; en el borde que avanza, un resplandor vertical `--accent` (degradado radial de 24 px, opacidad 0.5 → 0) y un punto brillante sobre la línea. El volumen crece desde la base con retraso escalonado por x (máx 300 ms).
- `morph` (cambio de periodo o de tipo con datos previos): el dominio Y se interpola en 420 ms `cubic-bezier(.22,1,.36,1)`; en área/línea la serie vieja y la nueva se remuestrean a ≤ 320 puntos y se interpolan punto a punto; en velas, desvanecido cruzado de 220 ms.
- `live(price)`: la etiqueta del último precio se desliza a su nueva Y en 300 ms; un anillo "sonar" sale del último punto (radio 4 → 22 px, opacidad 0.45 → 0, 900 ms), del color del signo.
- Modo % al agregar una comparación: la nueva serie se dibuja con su propio barrido de 600 ms.
- Con `prefers-reduced-motion`: todo instantáneo, sin sonar.

### 3.4 Series y colores
- Series fijas (el canvas no resuelve `color-mix`): A = teal `#0d9488` (claro) / `#2dd4bf` (oscuro); B = ámbar `#b45309` / `#fbbf24`; C = rosa `#db2777` / `#f472b6`. Son las únicas cifras de color fijas permitidas. (Se probó violeta para A y en oscuro `#a78bfa` no se distinguía del índigo `#a5b4fc` de la serie principal.) El motor expone `CampoMktChart.color('A')` para que el controlador pinte los puntos de las fichas de comparación con el mismo color.
- Repintado de tema: `MutationObserver` sobre `html[data-theme]` + `__campo.repaints`. Ningún color se cachea entre temas.

### 3.5 Rendimiento
- Redibujar SOLO en cambios (datos, mira, animación, tamaño). `ResizeObserver` sobre el host.
- Cálculos de extremos por ventana una sola vez por `setData`/`setOverlays`.
- 1 300 velas diarias + 3 comparaciones + 2 paneles deben dibujarse en < 8 ms por cuadro en un portátil.

---

## 4. `campo/mercados.js` → `window.CampoMercados` y `campo/mercados.css`

Monta en `#secMercados` (ya existe, `hidden`, lo crea el orquestador en `main.html`). Se activa con el evento `window` `'campo:route'` cuando `detail.sec === 'mercados'`; `detail.hash` es `#mercados` o `#mercados/<SYM>` (símbolo con `encodeURIComponent`). Para cambiar de símbolo desde dentro: `CampoSections.navigate('#mercados/' + encodeURIComponent(sym), true)` (reemplaza, no apila). La primera vez que la sección se ve, llamar `window.CampoShaders && CampoShaders.scan()` para que el encabezado reciba la aurora.

Expone `window.CampoMercados = { open(sym), follow(sym, name), isFollowed(sym) }` (lo usará la paleta Ctrl+K en otra etapa).

### 4.1 Estructura (de arriba abajo)

```
#secMercados
  header.app-head.mk-head
    div > h1 "Mercados" (tabindex -1) + p.asof "Cotizaciones con hasta 15 min de retraso · actualizado <hora>"
    div.mk-status  → 3 píldoras: BMV · Nueva York · Cripto (ver 4.3)
  div.mk-search (combobox, ver 4.4)
  div.mkt > div.mkt-band   → las 10 tarjetas .mkc de D.markets (marcado y clases YA existentes en campo/mkt.css)
  div.mk-grid  (≥ 1180 px: 2 columnas  minmax(0,1fr) 340px; debajo: 1 columna)
    section.panel.mk-sym#mkSym
      div.mk-sym-head
        div.mk-id: CampoMarks.svg(sym, 40) · h2.mk-name · línea: chip ticker (.mk-chip, mono 12/600 sobre --s2) · bolsa · píldora de estado
        div.mk-acts: botón Seguir (estrella, aria-pressed) · botón "Comparar" · (si la tienes) botón "Ver posición"
      div.mk-quote: precio grande (28 px/700, odómetro: elemento con data-price → bpFx.odo) + unidad (moneda, 12 px) + .delta (abs y %) + span.mk-when ("al cierre del 25 nov" | "hace 2 min")
      div.mk-ro (lectura de la mira: fecha · A · Max · Min · C · Vol · y por indicador activo; con la mira fuera muestra la última vela)
      div.mk-tools: tira de periodos (4.5) · .seg Área/Velas · botón "Indicadores" (con contador) 
      div.mk-cmp (fichas de comparación, solo si hay)
      div.mkt-cv.mk-cv (alto 380 px escritorio / 260 móvil; + 84 px por panel de oscilador) ← CampoMktChart
      div.mk-state (cargando / sin datos / error con botón Reintentar) superpuesto al lienzo
      div.mk-stats (4.6)
      div.mk-pos (solo si la tienes, 4.7)
    aside.mk-side
      section.panel.mk-list#mkWatch (4.8)
      section.panel.mk-movers#mkMovers (4.9)
  section.panel.mk-news#mkNews (4.10)
  p.mk-foot "Datos de Yahoo Finance, Binance y CoinGecko con retraso. Informativo; no es asesoría de inversión."
```

### 4.2 Estado y persistencia
`localStorage['campo.mkt.v1'] = { sym, period:'1A', type:'area', ind:['vol'], cmp:[], watch:[{s, n}] }`. Por omisión: `sym` = la posición de mayor valor de `D.positions` (si no hay, `^GSPC`), `period` 1A, `type` area, `ind` ['vol'].
Primera vez sin `watch`: importar la lista de la app anterior `localStorage['blackportfolio-watchlist-<uid>']` (uid = `BlackPortfolioAuth.firebaseAuth.currentUser.uid` si existe; los elementos pueden ser strings o objetos con `symbol`/`ticker` y `name`). Si no hay nada, vacía.

### 4.3 Estado de mercados (píldoras)
BMV 8:30–15:00 `America/Mexico_City`, Nueva York 9:30–16:00 `America/New_York`, lun–vie; Cripto siempre abierto. Hora local de cada zona con `Intl.DateTimeFormat(..., {timeZone, hour, minute, weekday})`. Abierto: punto `--gain` con pulso (anillo que crece y se desvanece, 2.4 s infinito); cerrado: punto `--text-3` sin animación. `data-tip` con el horario y "No considera días festivos". Se recalcula cada minuto.

### 4.4 Búsqueda (combobox)
- Campo grande (alto 52 px, radio píldora, `--s1`, borde `--line-strong`, sombra `--sh-1`), icono de lupa, placeholder "Busca una acción, ETF, índice, divisa o cripto", tecla `/` enfoca (si el foco no está en otro campo) y se muestra como `<kbd>` a la derecha. Al enfocar: anillo `--ring` y el campo crece 4 px de alto con `--ease-spring`.
- ARIA: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`; lista `role="listbox"` con `role="option"`.
- Con texto vacío y foco: muestra "Recientes" (últimos 5 símbolos abiertos, en `campo.mkt.v1.recent`) y "Tus posiciones" (máx 5).
- Con texto: debounce 220 ms, spinner dentro del campo, máx 8 resultados. Fila: marca 28 px · ticker en `.mk-chip` · nombre (coincidencia en `<mark>` sin fondo, peso 700) · a la derecha tipo y bolsa (12 px `--text-3`) · botón estrella para seguir sin abrir.
- Resaltado activo: un fondo `--s2` absoluto que se DESLIZA (translateY, 160 ms) a la fila activa, no un cambio de color por fila. Flechas ↑/↓, Enter abre, Esc cierra y limpia, clic fuera cierra.
- Abrir/cerrar la lista: `opacity` + `scale(.98)` con origen arriba, 160 ms; filas escalonadas con `bpFx.stagger`.
- Sin resultados: "No encontramos «xyz». Prueba con el ticker (p. ej. WALMEX.MX)."

### 4.5 Tira de periodos = tabla de rendimiento
Botones `1D 5D 1M 3M 6M YTD 1A 5A Máx`, cada uno con su etiqueta (12.5/600 `--text-3`) y debajo su rendimiento (`.delta` 13 px) → patrón `.mkp` de `campo/mkt.css` (reutilizar clases `.mkt-per`/`.mkp` con modificador `.mk-per` de 9 columnas; en móvil scroll horizontal con `scroll-snap`, y la celda activa se lleva a la vista). El fondo del activo es UN indicador absoluto que se desliza (`transform` + `width`, 280 ms `--ease-out`). Mientras carga el diario, las cifras son `.skel`. `aria-pressed` en el activo.

### 4.6 Estadísticas (cuadrícula sin cajas, 4 columnas ≥ 900 px, 2 en móvil)
Apertura · Máximo del día · Mínimo del día · Cierre anterior · Volumen · Volumen promedio (3 m) · Capitalización · P/U (12 m) · Beta (5 a) · Rendimiento por dividendo · Sector · Industria. Etiqueta 12.5 px `--text-3`, valor 16/600. Compactas con `Intl.NumberFormat('es-MX', {notation:'compact', maximumFractionDigits: 2})`. Dividendo: `trailingAnnualDividendYield × 100` (es fracción). Debajo, fila completa: **rango de 52 semanas** (mín a la izquierda, máx a la derecha, barra de 6 px `--s2` con relleno `--accent` hasta el precio y un marcador circular que se desliza a su posición en 600 ms al cambiar de símbolo). De `/info` + `meta` del diario; lo que no venga: "Sin dato". Índices/divisas/futuros: solo las que apliquen (ocultar Capitalización, P/U, Beta, Dividendo, Sector, Industria). Debajo, si `/info` trae `longBusinessSummary`: un `<details>` "Acerca de <nombre> (en inglés)" con el texto (máx 1200 caracteres) y `website` como enlace `rel="noopener noreferrer" target="_blank"`.

### 4.7 Tu posición (si el símbolo está en `D.positions`)
Franja `--accent-soft` con radio 16: "En tus portafolios · 12 acciones · valor $X · ganancia ▲ +Y %" (valores de `D.positions`: `qty`, `value`, `pnl`, `pnlPct`; moneda con `D.fmt.mxn`) y botón "Ver posición" → `document.dispatchEvent(new CustomEvent('campo:open-position', {detail:{ticker}}))`.

### 4.8 Lista de seguimiento
- Pestañas `.seg`: "Seguimiento (n)" | "Tus posiciones (n)". Filas de 52 px: marca 32 · nombre (14/600, una línea con elipsis) + ticker `.mk-chip` · mini-línea de 30 días (SVG 56×20, trazo `--gain`/`--loss` según el signo de esos 30 días; de `D.markets[].hist` o del diario cuando ya se cargó; si no hay, nada) · precio (odómetro) · `.delta` del día.
- La fila del símbolo abierto lleva una barra `--accent` de 3 px a la izquierda que se DESLIZA entre filas (indicador absoluto, 220 ms).
- Hover: fondo `--s2`. Botón quitar (×) visible al hover/foco; al quitar, la fila se colapsa (alto → 0, 220 ms) y toast "Quitado de seguimiento" (vía `window.__campo.toast`). 
- Vacía: icono de estrella + "Sigue acciones con la estrella y aquí verás cómo van." 
- Clic en fila → abre el símbolo.

### 4.9 Movimientos de hoy
De todos los símbolos con cotización viva (banda + seguimiento + posiciones): 3 que más suben y 3 que más bajan por % del día, en dos columnas. Aquí la variación ES el criterio → insignia RELLENA (fondo `--gain`/`--loss` al 14 % con `color-mix(in oklab, …)`, texto del mismo token, 13/700, radio 8). Si hay < 2 símbolos con dato: ocultar el panel.

### 4.10 Noticias
Hasta 9 titulares del símbolo en 3 columnas (1 en móvil), solo texto: línea meta (`hace 3 h · Reuters`, 12.5 px `--text-3`) y titular 15/600 de 3 líneas máx, enlace externo `target="_blank" rel="noopener noreferrer"`. Subrayado DIBUJADO al hover (fondo `linear-gradient(currentColor,currentColor)` con `background-size` de 0 → 100 % en 260 ms). Escalonado al entrar con `bpFx.stagger`. Error, vacío o índice/divisa: ocultar la sección completa (no mostrar un error). El título dice "Noticias de <nombre>".

### 4.11 Interacción del símbolo
- Abrir símbolo: el bloque `.mk-sym-head` + `.mk-quote` hace salida (opacity 1→0, translateY 0→−6 px, 120 ms) y entrada (6 px → 0, 220 ms, `--ease-out`); el precio usa el odómetro (`bpFx.odo` sobre el elemento antes de escribir `textContent`); la gráfica `morph` si ya había datos del mismo periodo, `sweep` si es la primera.
- Cambio de periodo: `morph`. Cambio Área/Velas: `morph`. Comparar: botón abre un mini buscador (mismo componente de 4.4 en pequeño, dentro de `.mk-cmp`), máx 3; ficha = punto del color de la serie + ticker + %, entra con `scale(.9)→1` resorte, `×` la quita. En 1D/5D la comparación se oculta con la nota "La comparación usa cierres diarios." y se recupera al volver.
- Indicadores: botón abre un panel flotante (popover) anclado, agrupado por `CampoInd.catalog[].group`, cada fila es un interruptor (`role="switch"`, `aria-checked`). Máximo 2 paneles de osciladores a la vez (el tercero apaga el más viejo con un aviso). En modo comparación los indicadores se desactivan visualmente con la nota "Los indicadores se muestran sin comparación". VWAP solo habilitado en 1D/5D. El contador del botón hace un "bump" (`scale 1 → 1.18 → 1`, resorte) al cambiar.
- Seguir (estrella): al activar, la estrella se rellena con `scale(.8)→1.15→1` (`--ease-spring`, 320 ms) y salen 6 puntitos radiales que se desvanecen (CSS, 420 ms); la fila aparece en la lista con alto 0 → 52 px.
- Sondeo de precios cada 60 s SOLO con la sección visible y la pestaña visible (`document.hidden` falso): banda, lista, movimientos y símbolo abierto en UNA llamada a `/prices`. Cuando un precio cambia de verdad: odómetro + `bpFx.flash(el, signo)`; en la gráfica `ch.live(price)` (solo periodos 1D/5D o si la última vela es de hoy).
- Estados de la gráfica (`.mk-state`): cargando → `.skel` con barrido; sin datos → "No hay datos para este periodo."; error → "No pudimos cargar la gráfica." + botón "Reintentar".

### 4.12 Tarjetas de la banda
Reutilizar EXACTAMENTE el marcado del prototipo (`campo/mkt.js` línea ~129): `button.mkc` con `.mkc-top` (CampoMarks.svg 24 + `.mkc-name`), `.mkt-px` (con `b.num[data-price]`), `.delta`, `svg.mkc-sp` (path con `pathLength="1"`). `aria-pressed="true"` en la del símbolo abierto (si es uno de los 10). Al entrar en pantalla, el contenedor `.mkt` recibe `.is-in` (las líneas se dibujan con la transición que ya existe). Símbolos y nombres de `D.markets` (`m.sym` = nombre visible, `m.y` = símbolo de Yahoo, `m.hist` = 252 cierres, `m.unit` '%' para el bono).

### 4.13 CSS (`campo/mercados.css`)
- Todo con prefijo `.mk-` o escopado bajo `#secMercados` (excepto reutilizar `.mkc`, `.mkp`, `.mkt-*`, `.panel`, `.seg`, `.btn`, `.delta`, `.tag`, `.skel`).
- `.mk-cv` debe declarar `isolation: isolate` y `.mk-cv .sh-grid { position:absolute; z-index:-1; inset:0; width:100%; height:100%; }` + máscara de bordes como `.cv-wrap .sh-grid` en `campo/motion.css`, para que la rejilla WebGL quede DETRÁS del lienzo.
- Grids con `minmax(0, 1fr)` (lección: una columna `1fr` ensanchó toda la ficha en el Tracker).
- Bloque `@media (prefers-reduced-motion: reduce)` que apaga todo lo animado de la sección.
- Revisar los dos temas: nada de `#fff`/`#000`; contraste AA en `--text-3` sobre `--s1` y `--s2`.
