# 23 · Moneda por portafolio, escritura, carga con el tablero y favicon

23-nov-2026. Son correcciones pedidas sobre la app Campo ya publicada (PR #12).

## 1. Moneda base por vista

**Antes.** Todo se mostraba en pesos, aunque el portafolio fuera en dólares.

**Ahora.**
- **Cada portafolio** se ve en su moneda (`currency`).
- **El consolidado** (Inicio, lista del Tracker y "Todos") se ve en la moneda que elijas. Por defecto es la del portafolio que más pesa.
- **Selector de moneda** (MXN · USD, más la de cualquier portafolio en otra moneda) en tres lugares:
  - el encabezado del Inicio;
  - la lista del Tracker;
  - el detalle de cada portafolio ("Ver cifras en"), para ver la equivalencia.
- **La elección se recuerda** en este navegador: `campo.ccy` para el consolidado y `campo.ccy.<id>` para cada portafolio.

**Cómo.**
- El libro se arma una vez en pesos (moneda canónica). `rebase(L, B)` lo expresa en la moneda B con el tipo de cambio de **cada fecha**:
  - cada flujo, a su TC;
  - el patrimonio de cada día, a su TC;
  - el costo promedio, como suma de compras convertidas en su fecha.
- Por eso un portafolio en dólares **rinde en dólares**. No son los pesos divididos entre el TC de hoy.
- **`CampoTracker.rate(ccy, i)`**: unidades de la base por 1 unidad de `ccy` en la sesión `i`.
- **`CampoTracker.fx.series`**: la moneda "de fuera", es decir USD si la base no es USD, y MXN si la base es USD. Es la que produce el efecto cambiario.
- **`setBase`.** Al entrar a un portafolio, `setBase` cambia la base **antes** de pintar. Al salir del Tracker regresa la del consolidado.
- **Informes.** Cada uno se calcula en la moneda de su vista y regresa la base al terminar.
- **Supuestos por moneda**:
  - tasa libre de riesgo: MXN 7.25 % y USD 4.3 %;
  - inflación: MXN 3.8 % y USD 2.7 %;
  - los *priors* de rendimiento se ajustan por la diferencia de tasas.
- **Las pruebas de estrés traducen el movimiento del USD/MXN a cada activo**, según su moneda y la base.

## 2. Escritura (antes era solo lectura)

**Se puede:**
- crear un portafolio;
- renombrarlo y borrarlo (con confirmación);
- registrar compra, venta, aportación, retiro y dividendo.

**Formato de datos.** Es el mismo que escribe `main.js`, para que las dos apps sigan cuadrando:
- **Compra:**
  - si ya existe la posición, se ponderan precio, comisión e IVA por importe y se conserva la fecha de compra más antigua;
  - se usa el efectivo disponible, y lo que falte cuenta como aportación;
  - se guarda en `cashApplied`.
- **Venta:** el neto descuenta la comisión y el IVA, entra al efectivo y la posición se cierra si se vende todo.
- **Aportación y retiro:** `ticker: "CASH"`, en la moneda del portafolio. No se puede retirar más del efectivo.
- **Dividendo:** por acción, con los títulos que tenías **en esa fecha** según tus movimientos.

**Seguridad.**
- Se envía con `PUT /api/account/portfolios` y `baseVersion`.
- **Si otra pestaña guardó antes (409)**, se vuelve a leer y **la misma intención** se aplica sobre lo fresco una sola vez. Nunca se sobreescribe a ciegas.
- Al guardar, los libros y las vistas se rearman sin recargar la página.

**Límites del plan.** Explorer: 1 portafolio y 10 posiciones; Investor: 3 y 50; Advisor Pro y Wealth Desk: sin tope. La cuenta con `role = admin` no tiene tope, ni en el cliente ni en el servidor (`persistence.py`, con su prueba en `tests/test_admin_sin_limites.py`).

**Todavía en la versión anterior:**
- importar un CSV;
- editar o borrar un movimiento ya registrado;
- alertas;
- Mercados;
- Crear portafolio (Markowitz).

## 3. Carga con el tablero

- **Ya no aparece la app vacía con un "cargando".** El tablero de `campo-gate.js` cubre desde el primer cuadro (`window.CAMPO_GATE_HOLD`) y se queda en un bucle suave: onda diagonal, el logo respira y el punto ocre late.
- **Gira de salida cuando el Inicio ya está pintado**, y entonces las cifras cuentan.
- **Si algo falla, se revela y muestra el aviso de error.**
- **Tiene un tope de seguridad de 25 s.**

## 4. Favicon

- El nuevo logo de Portify está en `favicon.svg` (con variante clara), `favicon-32.png`, `favicon-48.png`, `apple-touch-icon.png` y `favicon.ico`.
- Las páginas de producción lo enlazan con `?v=3` para que el navegador no use el viejo.
