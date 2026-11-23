# 22 · Migración de la app a Campo con datos reales

23-nov-2026. Corrige el PR #11, que solo recoloreó la app anterior. Ahora `main.html` es la app Campo del prototipo, alimentada con los datos reales de cada cuenta. Esta primera entrega **solo lee**.

## 1. Qué cambia

- **`main.html` es la app Campo.** Incluye Inicio (registro de indicadores y widgets), Tracker (lista, consolidado y detalle con 9 pestañas), Informes, la nota del portafolio, la ficha de posición y Ajustes.
- **Mercados** sigue deshabilitado. **Crear portafolio** (Markowitz) sigue en la versión anterior.
- **La app anterior** queda intacta en `main-clasico.html`. Se llega a ella con el enlace "Versión anterior de la app" del menú, y desde Ajustes. Es donde se crea, se edita, se registran movimientos, y se administran el 2FA, la suscripción y los datos.
- **Archivos nuevos en `campo/`:**
  - módulos del prototipo con nombres de producción;
  - `datos.js`: el adaptador de datos reales;
  - `shell.js`: sustituye a la parte "app" de `_dev_proto-campo.js`.

## 2. Por qué no puede borrar ni cambiar portafolios

- **`campo/datos.js` solo hace GET:**
  - `/api/account/bootstrap`, con el token de Firebase y `X-2FA-Token`;
  - `/api/prices` y `/api/chart`, que son públicos.
- **Ningún archivo de `campo/` llama a `fetch` con otro método.** Se verificó con grep.
- **Lo que pretendería editar se desactiva:**
  - `CampoTracker.rename`, `remove`, `add` y `tx.add/remove/clear` muestran un aviso y no hacen nada (`T.readonly`).
  - Los botones de registrar o editar se ocultan con la clase `campo-ro`.
- **La sesión es la misma que antes:**
  - mismo control de 2FA que `main.js`;
  - el backend vuelve a validar el token;
  - en un 403 `2fa_required` regresa al login; en un 403 `beta_closed` regresa al login con `?beta=closed`;
  - se mantiene el cierre por inactividad de 15 minutos de `auth.js`.

## 3. Cómo se arma el libro de cada portafolio (`campo/datos.js`)

- **Rejilla de fechas.** Son las últimas 252 sesiones del S&P 500 (`/api/chart/^GSPC?range=1y`). Si hoy hubo BMV pero no Nueva York, se agrega hoy.
- **Alineación de cada serie.** Cada historia diaria se alinea a la rejilla con el último cierre conocido. La última sesión usa el precio de ahora (`/api/prices`).
- **Copia local de la historia.** Se guarda en `localStorage`, con la clave `campo.hist.v1:<símbolo>`. Vale 20 horas si ya cubre la sesión de ayer.
- **Moneda de cada emisora.** Primero el sufijo del ticker (igual que `getPosCurrency`), luego la moneda guardada, luego la del proveedor y al final la del portafolio. Otras monedas que no sean USD ni MXN se muestran ya convertidas a pesos.
- **Movimientos (`transactions`).**
  - Cada uno entra en su fecha y con el tipo de cambio de esa fecha.
  - Las fechas anteriores a la rejilla usan el USD/MXN semanal de 10 años.
- **El efectivo vive en la moneda del portafolio:**
  - con `cashApplied` cuando existe;
  - sin él, con el neto convertido;
  - una compra que el efectivo no alcanzaba a pagar cuenta como **aportación** de ese día (`auto`).
- **Posiciones sin movimiento de compra** (capturadas antes del registro): un lote de apertura con su precio promedio, en `purchaseDate`.
- **Ajustes de cuadre.** Hay dos, marcados con `adj` y visibles en Transacciones:
  - las cantidades de más se tratan como retiro en especie, a su costo;
  - la diferencia con `cashBalance` se registra como ajuste de efectivo.
  - Ambos van en la fecha del último movimiento, porque ponerlos "hoy" dibujaba una caída falsa.
- **Costo y realizado.** El costo es promedio en pesos al tipo de cambio de cada compra, con comisión e IVA. El realizado sale del mismo costo promedio.
- **El Inicio es la suma de todos los portafolios.** El prototipo usaba un portafolio "principal".

### Diferencias a propósito contra `main.js`

| Concepto | `main.js` (anterior) | Campo |
|---|---|---|
| Tipo de cambio de flujos e historia | El de hoy para todo | El de la fecha de cada flujo |
| Rentabilidad | Sobre el costo de lo que tiene precio | Ganancia ÷ aportado: patrimonio + retiros − aportaciones |
| TWR | Sin flujos externos ni efectivo | Con efectivo y flujos: ∏ V_t / (V_{t−1} + F_t) |
| Compras sin efectivo | No se registran como flujo | Aportación implícita de ese día |

Por eso las cifras **no van a coincidir al centavo** con la versión anterior. Hay que revisarlas con tu cuenta antes de pasar a la fase de escritura.

## 4. Contenido de muestra que se quitó o se cambió

- **Widgets del Inicio:**
  - se quitaron Calendario (eventos y BPA inventados), Mapa de calor (constituyentes y movimientos al azar) y Sentimiento (noticias inventadas);
  - Macro usa VIX, DXY y WTI reales;
  - Lista de seguimiento: tus posiciones y los mercados, con el cambio real a 1 año.
- **Dividendos.** Sin tabla fija: proyecta repitiendo lo que cobraste en los últimos 12 meses.
- **Ficha de posición.** Línea de cierres reales, sin velas intradía sintéticas y sin noticias inventadas.
- **Ajustes.** Muestra cuenta, plan y uso reales, más el tema. Seguridad, facturación, exportar y borrar quedan en la versión anterior.
- **Informes y nota.** Sin ejemplos sembrados; "Con tus datos · no es asesoría". El "Qué viene" ya no afirma que no hay eventos: dice que aún no hay calendario.
- **Monte Carlo.** El eje arranca en la fecha real, no en "nov 2026".
- **Etiquetas "Datos de muestra".** Se cambiaron por "Informativo / no es asesoría de inversión".

## 5. Probado en local (emulador de Auth y API sobre SQLite, sin datos reales)

- **Cuenta de prueba con 3 portafolios:**
  - MXN, con acciones de EE. UU. y de México, una posición vendida, aportación, retiro, dividendo, una posición sin movimiento y efectivo que no cuadra;
  - USD, de cripto, creado en marzo de 2026, con una posición sin movimiento;
  - un portafolio vacío.
- **Cifras revisadas a mano contra los datos sembrados:** aportado, retirado, efectivo, realizado de TSLA, costo de AAPL y ganancia por portafolio.
- **Recorrido completo:**
  - las 9 pestañas de cada portafolio y del consolidado, sin errores de consola, NaN ni "muestra";
  - Informes (crear y ver presentación), ficha, Ajustes;
  - móvil a 375 px sin desborde.

## 6. Pendiente (siguientes entregas)

1. **Escritura:**
   - registrar y editar movimientos con `PUT /api/account/portfolios` y `baseVersion` (409 = otra pestaña ganó);
   - crear, renombrar y borrar portafolios.
2. **Mercados**, rediseñado.
3. **Tasa libre de riesgo real** (`/api/risk-free-rate`) en lugar de 7.25 % fijo.
4. **Dividendos y eventos** desde `/api/dividends` y un calendario real.
