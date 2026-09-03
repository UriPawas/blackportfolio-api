# DESIGN.md — sistema visual BlackPortfolio

> **Estado:** el sistema está construido y verificado en seis superficies de prototipo.
> Nada de esto está publicado todavía. Este documento existe para poder rediseñar la app
> (`main.html`) sin volver a decidir lo ya decidido.
>
> | Superficie | Archivos | Modo |
> |---|---|---|
> | Landing | `landing-v4.html/css/js` | Persuade |
> | Acceso | `login-v4.html/css/js` | Operate |
> | Alta de cuenta | `registro-v4.html/css/js` | Operate |
> | Aviso de privacidad | `privacidad-v4.html` + `legal-v4.css/js` | Read |
> | Alcance del servicio | `terminos-v4.html` + `legal-v4.css/js` | Read |
> | Planes y precios | `planes-v4.html` + `planes-v4.css/js` | Persuade |
| Ajustes de la app | `app-ajustes-v4.html` + `app-v4.css/js` | Operate |
>
> Las siete se navegan entre sí; el único enlace que todavía salta a producción es la sección
> de preguntas frecuentes (`index.html#faq`), que no existe en v4.
>
> **Procedencia:** escrito a partir del artefacto construido, no de intenciones. Cada valor de
> aquí existe en `landing-v4.css`. Si el código y este documento se contradicen, gana el código
> y hay que corregir el documento.
>
> Última actualización: 29 de julio de 2026.

---

## 1. La tesis

Una lectura de cartera presentada en el registro de un **documento de comité de inversión**.
La superficie gana la confianza en los números antes de pedir la del producto.

Esto se decidió con el usuario después de mostrar direcciones alternativas: la instrucción fue
*"super formal, estilo banca de inversión, nada de efectos neón o algo tan extravagante que
delate que está AI made"*. El criterio de aceptación es explícito: **si una pantalla se lee como
generada por IA, es un defecto, no un estilo.**

### Lo que el sistema rechaza por contrato

| Rechazado | Por qué |
|---|---|
| Degradados de marca, resplandores, orbes de fondo, retículas luminosas | Es el acabado que delata plantilla |
| Maquetas de producto flotando en perspectiva | El dato real es mejor prueba que su foto |
| Vidrio y desenfoque decorativos | El desenfoque sólo indica fondo inactivo (modales) o barra fija sobre contenido |
| Texto con degradado | El énfasis lo cargan el peso y el tamaño |
| Cifras gigantes de hero con etiqueta chica | Es la plantilla de métrica que usa cualquier SaaS |
| Antetítulos / *eyebrows* sobre los encabezados | El encabezado se sostiene solo |
| Numeración 01 / 02 / 03 decorativa | Sólo se numera lo que **es** una secuencia (los pasos de alta de 2FA, por ejemplo) |
| Tarjetas iguales de icono + título + texto como estructura de página | Es el contenedor perezoso; aquí las cosas van en **láminas de documento** o en filas |
| Emoji como icono | Depende de la fuente del sistema y no se puede tematizar |
| Cifras inventadas presentadas como reales | Ver §10 |

---

## 2. Tokens

Declarados en `:root` y `[data-theme="dark"]` de `landing-v4.css`. **Ningún componente lleva un
hex crudo.** El tema se guarda en `localStorage` bajo `bp-theme` — la misma llave que usa la app.

### Superficies y tinta

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--paper` | `#F1F4F8` | `#0A1220` | Fondo de página |
| `--surface` | `#FFFFFF` | `#101B2B` | Láminas, campos, tarjetas |
| `--sunken` | `#E8ECF2` | `#0C1725` | Cabeceras y pies de lámina, celdas de apoyo |
| `--band` | `#0D2137` | `#06101C` | Banda de sección a sangre |
| `--band-deep` | `#081827` | `#040B14` | Cierre y velo de modal |
| `--ink` | `#0B1524` | `#E9EEF6` | Texto principal |
| `--ink-2` | `#33415A` | `#B4C1D5` | Texto secundario, celdas de tabla |
| `--ink-3` | `#5A6980` | `#8C9BB3` | Etiquetas, notas al pie, ejes |
| `--on-band` / `--on-band-2` | `#EAF0F7` / `#A9BDD5` | igual | Texto sobre banda navy |

### Reglas (la estructura de la página)

| Token | Claro | Oscuro |
|---|---|---|
| `--rule` | `#D6DDE6` | `#22314A` |
| `--rule-soft` | `#E4E9EF` | `#1A2739` |
| `--rule-strong` | `#B5C0CE` | `#364964` |
| `--rule-band` | `#1E3550` | `#1B2A40` |

### Acento y señales

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--cobalt` | `#13429B` | `#1E4FD0` | Relleno de acción primaria |
| `--cobalt-ink` | `#13429B` | `#7CA0FF` | Enlaces y texto de acción |
| `--cobalt-line` | `#2A5CBE` | `#6E97FF` | Serie de datos, foco, regla de emisión |
| `--cobalt-tint` | `#E7EDF8` | `#15243E` | Fondo de fila al pasar el cursor |
| `--pos` | `#0A6B4A` | `#45B98A` | Variación positiva |
| `--neg` | `#A11E20` | `#E4787A` | Variación negativa |
| `--ramp-1…6` | `#13429B → #D0DCF6` | `#1E4FD0 → #CFDCFF` | Composición por partes (una sola familia, no arcoíris) |

**Un solo acento.** El cobalto es la única familia cromática además de la tinta. Positivo y
negativo **nunca** son el único portador del significado: siempre van acompañados de signo
(`+` / `−`) o de marca (`▲` / `▼` / `·`).

### Ritmo

`--s1: .25rem` · `--s2: .5rem` · `--s3: .75rem` · `--s4: 1rem` · `--s5: 1.5rem` · `--s6: 2rem` ·
`--s7: 3rem` · `--s8: 4rem` · `--s9: 6rem`. Base 8 px.

`--gutter: clamp(1.25rem, 4vw, 3rem)` · `--section-y: clamp(3.5rem, 7vw, 7rem)` ·
contenedor `1240px`.

Radio: **2 px** en todo. Nada de píldoras ni de 16 px.
Sombra: `--shadow-plate` y `--shadow-lift`, siempre con desplazamiento **y** difuminado. Un halo
de color sin desplazamiento es decoración y no se usa.

---

## 3. Tipografía

| Rol | Fuente | Notas |
|---|---|---|
| Títulos | **Spectral** 500 / 600 | Serif sobria; el registro del memorándum. `letter-spacing` de −.018 a −.03 em |
| Interfaz, datos, etiquetas | **Libre Franklin** 400 / 500 / 600 | Grotesca institucional con figuras tabulares |
| Claves y secretos | pila mono del sistema | Sólo para código, claves TOTP y códigos de respaldo |

Escala: `--t-display: clamp(2.25rem, 1.35rem + 2.8vw, 3.5rem)` · `--t-h2: clamp(1.6rem, …, 2.45rem)` ·
`--t-h3: clamp(1.1rem, …, 1.35rem)` · cuerpo `1.0625rem`/1.62 · `--t-small: .875rem` ·
`--t-mini: .8125rem` · `--t-label: .6875rem` en versalitas con `letter-spacing: .1em`.

Reglas duras:
- `font-variant-numeric: tabular-nums` en **todo** el `body`. Ninguna columna de cifras baila.
- Medida de lectura 40–46 ch en párrafos; nunca de borde a borde.
- Mínimo 16 px (`1rem`) en campos de formulario, para que iOS no haga zoom.
- Ninguna de las fuentes que cualquier modelo usa por defecto (Inter como display, IBM Plex,
  Space Grotesk, DM Sans, Playfair, Fraunces…). Si hace falta una tercera fuente, la decisión
  se toma con el mismo criterio.

---

## 4. Componentes

Contratos, no sugerencias. Los nombres son los de `landing-v4.css`.

### `.plate` — la lámina
El contenedor por defecto de cualquier dato. `--surface` + 1 px de `--rule` + `--shadow-plate`.
Partes: `.plate__rule` (2 px de cobalto arriba, la "emisión" del documento), `.plate__head`
(nombre + metadato + control), cuerpo, `.plate__foot` (rejilla de métricas divididas por
`--rule-soft`), y `.plate__caption` **fuera** de la lámina para el sello y las notas.
**Nunca se anida una lámina dentro de otra.**

### `.tbl` — la tabla
`th` en versalitas `--t-label` color `--ink-3` con regla inferior; `td` a `.9375rem` color
`--ink-2`; `.n` alinea a la derecha; fila con `--cobalt-tint` al pasar el cursor. Dentro de una
lámina el padding baja a `.875rem` (y a `.75rem` en móvil). Celda de posición: `.sym` (clave) +
`.sym-name` (nombre o pregunta que contesta). Sin `min-width`: la tabla se comprime y envuelve
antes de scrollear, y el `.scroller` es la red de seguridad.

### `.seg` — control segmentado
Grupo de 2–3 opciones. `role="tablist"` sólo si gobierna un panel (`aria-selected`); si es un
interruptor de dos estados va `role="group"` + `aria-pressed`. El indicador es un bloque de 1 px
escalado con `transform: translateX() scaleX()` — **jamás se anima `width`**. Flechas izquierda
y derecha navegan; `tabIndex` móvil.

### `.btn`
`--primary` (relleno cobalto, texto blanco), `--quiet` (contorno `--rule-strong`), `--onband`
(sobre navy). Mínimo 44 px de alto, radio 2 px, `translateY(-1px)` al pasar el cursor y
`+1px` al presionar. `.btn-text` es el enlace de acción con subrayado de 1 px.

### Campos (`login-v4.css`)
`.form-row` = etiqueta en versalitas + control. Alto mínimo 46 px, borde `--rule-strong`, foco
con borde cobalto + aro de 3 px al 20 %. Error con `aria-invalid` **y** mensaje que dice qué
pasó y cómo salir. `.form-message` en variantes `.error` / `.success` / `.info`.

### `.band` y `.figure`
Banda navy a sangre con sus propios tokens de texto (`--on-band`), nunca gris. La fotografía va
en `.figure` con 1 px de borde, escala de grises y un velo navy; en la columna de una banda se
estira a la altura completa. Máximo **una** imagen por sección.

### `.quotes` — tablero de cotizaciones
Cinta de 33 px bajo el encabezado. Etiqueta fija a la izquierda que tapa el borde del
desplazamiento, como el encabezado de un pizarrón. Ítems de texto (clave · precio · variación),
separados por 1 px, cifras tabulares, signo antes que color. Se detiene al pasar el cursor o al
recibir foco; con `prefers-reduced-motion` no se mueve y el contenedor se vuelve scrolleable.
El destello `tick-up` / `tick-down` sólo dispara cuando el precio **cambió de verdad** entre dos
lecturas. Precios: `/api/prices` en local → Cloud Function → `tickers-data.js` como respaldo,
etiquetando la fecha del cierre cuando cae al respaldo.

### El suelo — tres capas de papel

El fondo no es un color plano. Ninguna de las tres capas se mueve y ninguna es un degradado de
marca; todas vienen del mundo de la impresión de valores.

| Capa | Qué es | Dónde vive | Opacidad claro / oscuro |
|---|---|---|---|
| 1 · Grano | Ruido fractal (`feTurbulence`) en un SVG en línea, fijo al viewport | `body::before`, `z-index: -1` | `.085` / `.14` |
| 2 · Roseta | El guilloche de un certificado de acciones, como `mask-image` para que tome el color del tema | `.rosette` en hero, cierre y acceso | `.13` / `.20` (cierre `.10` / `.13`) |
| 3 · Canto del pliego | La hoja aclara junto al borde superior, en tono de papel (`--surface`), no de marca | `.hero::before`, 280 px | `.6` / `.5` |

En el acceso hay una cuarta: **la fotografía como suelo** (`torre.jpg` en escala de grises,
`body.auth::after`, `z-index: -2`, opacidad `.10` / `.16`), enmascarada en diagonal. Es la única
superficie sin fotografía en el contenido, así que ahí la imagen es el fondo.

Reglas que no se negocian:

- **El grabado se disuelve antes del texto chico.** Cada variante define su propia salida en
  `--fade`, intersecada con la máscara del guilloche (`mask-composite: intersect`). En el hero el
  desvanecido termina en y≈332 px y la lede empieza en y≈379: el tinte nunca toca texto de
  `--ink-3`, así que el contraste medido en §6 sigue siendo válido. Si mueves una roseta, vuelve a
  comprobar esa relación.
- **Sin `mix-blend-mode` en capas fijas.** Fundir una capa a pantalla completa obliga al
  compositor a recalcular en cada cuadro de scroll. A estas opacidades el ruido gris ya oscurece
  el papel claro y aclara el oscuro por sí solo.
- **Una textura por zona.** En móvil la roseta entra por el canto superior derecho, así que la
  fotografía del acceso se va al inferior: dos patrones en la misma esquina se leen como suciedad,
  no como profundidad.
- Las rosetas sangran fuera de su contenedor, así que el contenedor **recorta**
  (`.hero { overflow: hidden }`, `.auth__main { overflow: hidden }`). Sin eso hay desplazamiento
  horizontal.

El activo se genera, no se dibuja a mano:

```bash
node assets/landing-v4/make-guilloche.mjs   # → assets/landing-v4/guilloche.svg (12 KB)
```

Son circunferencias repetidas alrededor de un centro —así se graba de verdad, y el moiré sale del
traslape—. Trazar la epitrocoide punto por punto daba el mismo dibujo en 230 KB.

### Marcas de identidad en el tablero (`.mark`)

Una sola regla, sin excepciones ni invenciones: **logotipo propio si existe; si no, la bandera
del mercado donde cotiza.** Los pares de divisas llevan las dos banderas, base y contraparte.

| Caso | Marca | Ejemplos |
|---|---|---|
| Acción o cripto con logo | `.mark--logo`, SVG entintado con `mask-image` | AAPL, NVDA, TSLA, BTC, ETH |
| Acción sin logo disponible | Bandera del mercado | MSFT y Nasdaq — Simple Icons los retiró por política de marca |
| Índice | Bandera del país | S&P 500, FTSE, Nikkei, Hang Seng |
| Par de divisas | Dos banderas, 2 px de separación | EUR/USD, USD/JPY |
| Materia prima | Bandera del mercado de futuros | Oro y WTI cotizan en COMEX/NYMEX |

Los logotipos van como **máscara**, no como imagen: toman el color de la tinta del tema y así
el tablero no mete cinco colores de marca en una página que tiene un solo acento. Las banderas
sí van a color —ahí el color es identificación, no adorno— alineadas por altura (11 px) y no
por ancho, porque cada bandera tiene su proporción.

**En las listas de posiciones** (`.asset-mark`, tabla del hero y "peso por posición") la regla se
recorta: no hay bandera de respaldo, porque la fila ya dice de qué activo se trata.

1. Logotipo entintado si existe — hoy sólo AAPL y BTC.
2. **Marca de letra** para lo que no tiene emisor: el efectivo lleva `$`.
3. Si no hay ninguna, el hueco **se reserva igual** (14 px + 0.45 rem) para que las claves y los
   nombres queden alineados. Inventar un monograma sería fabricar una identidad que no existe;
   la clave completa se sostiene sola.

Cobertura real y por qué: `microsoft` y `nasdaq` fueron retirados de Simple Icons por política de
marca; `vanguard` nunca estuvo (404 comprobado). CETES y FUNO11 son instrumentos sin marca
publicable en un catálogo CC0. **La landing en producción tiene el mismo problema sin saberlo:**
`app.js` pide `cdn.simpleicons.org/microsoft/00a4ef`, que responde 404, y el
`onerror="this.style.display='none'"` lo esconde en silencio.

Los archivos viven en `assets/landing-v4/marks/` (21 KB en total): **no hay CDN en tiempo de
ejecución**. Eso evita que el navegador del visitante contacte a un tercero, que es también un
argumento del aviso de privacidad. Nada de `loading="lazy"` en la cinta: dentro de un elemento
que se desplaza, el navegador no vuelve a evaluar la intersección y las banderas se quedan en
blanco.

### Componentes de formulario (`registro-v4.css`)

- **`.plan`** — fila de tarifa: radio, nombre, precio alineado a la derecha, descripción
  debajo. El elegido se marca con regla cobalto **y** fondo, no sólo con el radio. Un
  `input[type=hidden]#selectedPlan` refleja la selección para que `app.js` siga leyendo
  `.value`.
- **`.pw-strength-bars` / `.pw-requirements`** — mismo contrato que `app.js`
  (`.pw-bar.active-N`, `li.met`), pero con **dos** colores semánticos en vez de cinco: rojo
  mientras es insuficiente, cobalto cuando ya sirve. Requisito cumplido = marca de verificación
  **y** color. Ojo: `app.js` escribe el color en línea con hex fijos; al trasplantar hay que
  cambiar esa línea por `dataset.level`.
- **`.consent`** — casilla con texto a la derecha. La obligatoria y la opcional son dos
  controles distintos, separados del formulario por una regla. Ver §12.

### Cuadro de tarifas (`planes-v4.css`)

Comparar es la tarea, así que la página **es** la comparación: los cuatro planes como columnas
y las características como filas, agrupadas por bloque. No son cuatro tarjetas de precio
compitiendo entre sí.

- La **primera columna se queda fija** (`position: sticky; left: 0`) al desplazar en horizontal;
  sin eso, en móvil no se sabe qué se está comparando. El encabezado se queda fijo arriba.
- El contenedor es un `.tarifas-wrap` con `tabindex="0"` y `role="region"`: una tabla que
  scrollea tiene que poder recorrerse con el teclado.
- La columna destacada cambia de fondo y suma la regla de emisión de 2 px. **Sin insignia de
  "más popular"**: es una cifra de popularidad que este producto no puede sostener.
- Sí/no llevan glifo **y** texto para lector de pantalla (`.si` con palomita, `.no` con raya),
  nunca color solo.
- Los precios anuales están escritos en el HTML (`data-anual`), no se calculan en el cliente:
  son cobros vivos de Stripe y no se redondean aquí.

### Documentos legales (`legal-v4.css`)

Modo lectura. Columna de 68 ch, índice fijo a la izquierda en pantalla grande (dos columnas en
móvil), secciones numeradas por CSS (`counter`) para poder citarse por número, viñetas de 1 px
en vez de puntos, y `.tbl` para la tabla de encargados.

- **`.legal__summary`** — el aviso simplificado: los hechos esenciales antes del documento.
- **`.gap`** — un dato que sólo el responsable puede aportar. Fondo rojo tenue y subrayado
  punteado. **No se inventa un domicilio ni una razón social:** se marca el hueco para que no
  pueda publicarse por descuido.
- **`.legal__warning`** — el bloque que enumera esos huecos arriba del documento.
- El índice marca la sección en curso con un cálculo directo por scroll, no con
  `IntersectionObserver`: el observador sólo entrega entradas, no salidas, y el marcador se
  queda pegado al volver hacia arriba.

### Componentes de la app (`app-v4.css`)

Densidad de herramienta: la misma paleta con la mitad del aire.

- **`.app__top`** (52 px) + **`.app__nav`**: barra lateral de 13.5 rem a partir de 62 rem,
  tira horizontal deslizable debajo. La ubicación actual lleva peso, fondo y regla de 2 px.
  La media query va **después** de las reglas base: no agrega especificidad.
- **`.panel`** — la lámina con menos aire (cabecera de .7 rem, cuerpo de .875 rem) y
  `--shadow-lift` en vez de `--shadow-plate`.
- **`.row`** — etiqueta y descripción a la izquierda, control a la derecha. Sólo el hijo
  directo es el título: un `<b>` anidado no debe volverse bloque.
- **`.danger-zone`** — la acción destructiva se separa con su propia regla y nunca comparte
  fila con una acción normal. `.btn--danger` es contorno; `.btn--danger-solid` sólo dentro del
  diálogo de confirmación.
- **`.dlg`** — diálogo destructivo con **libro mayor de consecuencias** (qué se borra y qué
  sobrevive), una salida útil (exportar primero), confirmación escrita (`ELIMINAR`), foco
  atrapado, Escape y clic en el velo para cancelar.

### `.stamp`
Sello de versalitas con rombo. Marca lo que es ilustrativo. Obligatorio junto a cualquier cifra
de muestra.

---

## 5. Movimiento

Un solo momento autoral por superficie, con `--ease: cubic-bezier(.16, 1, .3, 1)`.

- **Emisión de la lámina** (150–470 ms): la regla superior barre y las filas se asientan con
  45 ms de retardo entre ellas.
- **Revelado al scroll**: 12 px y opacidad, una sola vez, con `IntersectionObserver`.
  El estado por defecto en CSS es visible; sólo se oculta cuando `html.js.motion-ok` existe, así
  que sin JS no desaparece nada.
- **Cambio de tema**: clase `is-theming` durante 340 ms que habilita transición de color en todo,
  y se retira. Sin ella, ningún hover hereda una transición que no le toca.
- **Trazo de la serie** al cambiar de vista (`stroke-dashoffset`).
- Nada de contadores animados, ni de una misma entrada repetida en cada sección.
- `@media (prefers-reduced-motion: reduce)` anula animaciones y deja todo visible.

---

## 6. Piso de calidad (verificado, no aspiracional)

| Comprobación | Resultado medido |
|---|---|
| Contraste texto en claro | mínimo 5.05:1 (`.note`); cuerpo 9.31:1; acción primaria 9.21:1 |
| Contraste texto en oscuro | mínimo 6.14:1; cuerpo 10.29:1 |
| Desborde horizontal | 0 a 390 px y a 1440 px |
| Objetivos táctiles | ≥ 44 px en botones, iconos y campos |
| Foco | `:focus-visible` con 2 px de cobalto y 2 px de separación, nunca suprimido |
| Detector de impeccable | limpio en `landing-v4.*` y `login-v4.*` |

**Trampa recurrente: `min-width: 0` en ítems de rejilla.** Un hijo de `display: grid` no encoge
por debajo de su contenido, así que un contenedor con `overflow-x: auto` dentro de una rejilla
**nunca activa su scroll**: la columna crece y la página desborda. Pasó dos veces —la navegación
lateral de la app y la tabla de encargados del aviso— y en ambas el arreglo fue `min-width: 0`
en el ítem, no en el que scrollea. Cuando metas una tabla o una cinta dentro de una rejilla,
esa línea va primero.

Breakpoints: **40rem** (640) · **48rem** (768) · **62rem** (992) · **75rem** (1200). Móvil primero.
En móvil las acciones del encabezado viven en el panel desplegable — la barra no debe desbordar
nunca a 375 px (fue un P0 real de la landing anterior).

---

## 7. De la landing a la app: qué cambia

La landing es **Persuade** (el visitante decide y actúa). La app es **Operate** (el usuario
completa una tarea). El mundo visual es el mismo; el ajuste es de densidad y de estado.

| Eje | Landing | App |
|---|---|---|
| Densidad | `--section-y` de 3.5–7 rem | Rejilla de 8–24 px; `--s5` como separación máxima entre bloques |
| Fotografía | Tres imágenes, editoriales | **Cero.** Una foto en una herramienta es ruido |
| Serif | Todos los encabezados | Sólo títulos de sección y de panel; los rótulos de interfaz van en Libre Franklin |
| Color | Un acento | Igual, pero el cobalto pasa a ser sobre todo **serie de datos**; la acción compite menos |
| Movimiento | Un momento autoral | Sólo respuesta a la acción: estado de carga, transición de panel, destello de dato actualizado |
| Estados | Éxito y error de formulario | Obligatorios: vacío, cargando, error con reintento, sin permiso de plan, sin datos de mercado |
| Navegación | Ancla y desplazamiento | Persistente, con la ubicación marcada; nunca se reinicia la pila |

Lo que **no** se toca al rediseñar la app: la función, el copy factual, los límites por plan,
los IDs y clases de los que dependen `main.js` / `auth.js`, y la frontera legal
(monitoreo y análisis, no asesoría).

---

## 8. Mapa de migración de `main.html`

La app tiene siete secciones (`data-section`) y el tracker nueve pestañas. Orden propuesto, de
mayor a menor apalancamiento:

| # | Superficie | Qué requiere | Notas |
|---|---|---|---|
| 1 | **Cascarón** — barra, navegación de secciones, tema, avatar | Tokens + `.btn` + `.seg` + navegación persistente con estado activo | Es el 80 % de la percepción; se hace primero y solo |
| 2 | `section-tracker` | `.plate` + `.tbl` + `.seg` para las 9 pestañas + estados vacío/carga | El corazón del producto. Las pestañas ya son un `tablist`: reusar el contrato de `.seg` |
| 3 | `section-home` | Rejilla de láminas: valor, variación del día, composición, alertas | Aquí es donde tienta la plantilla de métrica gigante: no |
| 4 | `section-analyzer` | Gráficas con los tokens de `.chart`, tablas de riesgo, glosario | Ejes en `--ink-3` a 11 px, serie en `--cobalt-line`, rejilla en `--rule` |
| 5 | `section-markowitz` | Frontera eficiente y pesos propuestos | Comparación antes/después en dos columnas de tabla, no dos gráficas encimadas |
| 6 | `section-markets` | Buscador, gráfica de velas, ficha del activo | Reusar `.quotes` para el encabezado de mercado |
| 7 | `section-topdown` | Semáforo macro por sector | Sin color como único portador: rótulo + signo |
| 8 | `section-settings` | **Parcialmente hecho** en `app-ajustes-v4.html`: datos y privacidad, sesiones activas, segundo factor y el diálogo de borrado. Faltan idioma, moneda base, plan y notificaciones | El cascarón de la app (barra + navegación lateral) también quedó resuelto ahí |

Por cada superficie, el ciclo es el mismo: leer el marcado existente, sustituir clases de
presentación conservando los ganchos de JS, verificar en el navegador a 390 y 1440 px en ambos
temas, y correr el detector.

**Trampa conocida:** en `main.css` no existe una regla global de `.hidden`; los modales se ocultan
con una lista por ID (`main.css:~2829`). Cualquier panel nuevo tiene que agregarse a esa lista o
declarar su propio `.hidden`. En `login-v4.css` ya hay una regla global para no repetir el
problema.

---

## 9. Cómo verificar

```bash
npx serve -p 3000 .
```

Luego `http://localhost:3000/landing-v4.html` y `/login-v4.html`. El login trae una barra de
**vista de prototipo** (borde punteado, esquina inferior izquierda) para revisar formulario,
carga, error, aviso, 2FA, 2FA con error, alta de 2FA, alta cargando, alta fallida y códigos de
respaldo. Esa barra la construye `login-v4.js` y **no** forma parte del producto: al conectar
`login.js` real se borra la llamada a `buildProtoBar()`.

Detector mecánico:

```bash
node .claude/skills/impeccable/scripts/detect.mjs --json landing-v4.html landing-v4.css landing-v4.js
```

---

## 10. Verdad de los datos

Regla heredada de `PRODUCT.md` y que este sistema hace visible:

- Toda cifra mostrada existe en el sistema **o** lleva `.stamp` de muestra. La cartera del hero y
  las tres vistas son datos ilustrativos internamente consistentes (los pesos suman 100 %, el
  drawdown se **deriva** de la serie, el XIRR coincide con el valor final del índice base 100).
- La banda de credibilidad sólo lleva hechos verificables en el repositorio: 2FA TOTP en
  servidor, TLS, Yahoo Finance y CoinGecko, seis clases de activo. Se dice de frente que **no**
  hay SOC 2 ni ISO.
- Quedan fuera, por no tener respaldo: número de usuarios, portafolios monitoreados, uptime
  garantizado, cobertura de mercados, testimonios, logos de clientes.

---

## 11. Hallazgos que no son de diseño

Salieron de comprobar contra el código cada afirmación que iba a repetir en el aviso de
privacidad. Ninguno se arregla con CSS.

| # | Hallazgo | Estado |
|---|---|---|
| 1 | **El secreto TOTP se guarda en texto plano** en PostgreSQL (`TotpCredential.secret`, `String(64)`, sin `Fernet` en `persistence.py`). El aviso publicado dice "cifrado en el servidor": **es falso**. | El aviso v4 lo dice como es —vive en el servidor y no se expone al navegador— y marca el cifrado en reposo como pendiente. Arreglarlo es un cambio de código: reusar el `Fernet` que ya existe en `backup_service.py` |
| 2 | **No había consentimiento expreso** para datos patrimoniales. El alta actual (`#register` en `index.html`) no tiene casilla de privacidad. La LFPDPPP lo exige para datos financieros (art. 8), no basta el consentimiento tácito. | Resuelto en el diseño: dos casillas en `registro-v4.html`, la obligatoria bloquea el alta |
| 3 | **Los eventos de analítica no expiran.** El aviso v4 declara 12 meses; la purga automática no existe en el backend. | El plazo queda marcado como hueco hasta que se implemente: declarar un plazo que no se cumple es peor que no declararlo |
| 4 | **Los buzones `privacy@` y `legal@` no existen** y están publicados en el sitio. La ley obliga a responder una solicitud ARCO en 20 días hábiles. | Marcado como hueco. Es un alias con reenvío |
| 5 | Faltan **razón social y domicilio del responsable** (art. 16, fracciones I y II). | Marcado como hueco en `privacidad-v4.html` §1, con advertencia arriba del documento |
| 6 | El sitio carga tipografías desde el CDN de Google, así que el navegador del visitante **revela su IP a Google**. No estaba declarado. | Declarado en el aviso v4 §7 |
| 7 | **La merma por varianza se descontaba dos veces** en `runMonteCarlo` (main.js). El paso mensual era `exp(21·μ − ½σ²·21 + σ√21·Z)` con μ ya estimado sobre retornos **logarítmicos**: la corrección de Itô sólo corresponde si el drift viene de retornos simples. Toda la proyección salía sesgada a la baja por `exp(−σ²T/2)` — a 17 % de volatilidad, −22 % a 10 años y −35 % a 30. Se delataba solo: el modelo `bootstrap` (que suma 21 retornos log muestreados, sin corrección) daba medianas más altas con los mismos datos, y la mediana simulada contradecía al «retorno anual» que la propia pestaña publicaba. | **Corregido** (14 de agosto de 2026): `drift = mu * 21`. Verificado: con 12,480 iniciales, 300/mes, 10 años y 18.54 % anual compuesto, la mediana simulada (163,459) cuadra al 0.6 % con la anualidad cerrada (162,538) |
| 8 | **Dinero real medido contra dinero nominal.** Con el ajuste por inflación activo, los valores finales se deflactaban pero el listón de comparación seguía siendo `initVal + aporte·meses` en nominal. «Prob. de retorno positivo» y todos los porcentajes de variación comparaban dos unidades distintas; con 500/mes a 10 años y 3.5 %, el listón salía 14.7 % más alto de lo que corresponde. | **Corregido**: `runMonteCarlo` devuelve `baseline[t]`, la curva de capital aportado deflactada con el mismo factor que las bandas, y de ahí salen el listón, la línea del lienzo y la tarjeta «Capital aportado» |
| 9 | **Etiqueta que describía otra fórmula.** «Retorno anual esperado · Media log-normal anualizada» mostraba `exp(μ·252)−1`, que es la media **geométrica** (la que compone). La media de la log-normal es `exp(μ·252 + σ²·252/2)−1`, otra cifra. | **Corregido**: se conserva el valor (es el que corresponde) y se rotula «Retorno anual compuesto · media geométrica de la muestra» |

Metodología que **se mantiene** por ser decisión y no error, documentada ahora en la ficha «ℹ» de la
pestaña: el aporte es constante en pesos nominales (con inflación activa su poder de compra baja y
así se contabiliza); la probabilidad de la meta se mide sólo en la fecha final, no por cruce; los
grados de libertad del modelo t se estiman sobre curtosis **diaria** y se aplican al paso mensual,
lo que exagera las colas por el lado conservador; y la caída máxima queda subestimada cuando hay
aportes, porque el dinero nuevo levanta el valor y disimula la bajada. Las bandas recogen el azar
del mercado, **no** el error de estimación de μ y σ — proyectar 30 años desde 2 de historia deja un
margen que el cono no dibuja.

Pendiente, en la pestaña **Metas** (no tocada en esta sesión): `requiredMonthlyContribution` trata
el aporte como constante en términos **reales** mientras la simulación que calcula la probabilidad
lo trata como constante en nominales. Las dos cifras de esa pantalla no hablan de lo mismo.

Verificado y **verdadero**, por si hace falta defenderlo: los respaldos sí están cifrados
(`Fernet` + gzip + suma de comprobación, `backup_service.py`), los códigos de respaldo sí se
guardan sólo como hash SHA-256, y el plan sí es autoritativo en el servidor.

## 12. Abierto

- **Reseña de acabado de la landing** (6 de agosto de 2026): primera pasada independiente
  `PARTIAL`. Se sustituyeron el degradado y las series rojo/verde decorativas del mapa de cobertura
  por una superficie plana con escala cobalto/neutra, y se capturaron el primer viewport de escritorio
  y el hero móvil (`tmp/landing-redesign-desktop-hero-final.png`,
  `tmp/landing-redesign-desktop-coverage-final.png`, `tmp/landing-redesign-mobile-final.png`).
  Segunda lectura independiente: `PASS`; no quedan hallazgos materiales abiertos.
- **`landing-v4` no está publicada.** Cuando se apruebe: sustituir `index.html` y `login.html`,
  revisar la CSP (Google Fonts ya está permitido; `images.pexels.com` no se usa en runtime porque
  las fotos están descargadas en `assets/landing-v4/`), y borrar los prototipos v2 y v3 si ya no
  sirven de referencia.
- **Tercera fuente para datos densos**: si al llegar al tracker Libre Franklin no aguanta tablas
  de 20 columnas, se evalúa una grotesca condensada. No se ha decidido.
- **Densidad del tracker**: falta medir cuántas filas caben antes de que la lámina deje de
  funcionar como documento y haya que virar a rejilla de datos con encabezado fijo.
