# BlackPortfolio Landing

Landing page moderna para presentar una plataforma de creacion y gestion de portafolios de inversion.

## Incluye

- Hero visual con enfoque financiero
- Seccion de beneficios para riesgo, asignacion y reportes
- Planes con cambio mensual y anual
- Formulario de creacion de cuenta con persistencia en `localStorage`
- Hook listo para checkout con PayPal, Stripe o gateway propio
- Barra de navegacion corregida para no tapar contenido al desplazarse
- Pagina `login.html` con acceso para usuario demo y usuarios registrados
- Pagina `main.html` protegida con inicio personalizable y seccion `Portafolio Tracker`
- Seccion `Mercados` con buscador de tickers, autocompletado de Yahoo Finance, grafico interactivo e indicadores

## Abrir localmente

Abre `index.html` directamente en tu navegador.

## Punto de integracion de pagos

La integracion esta preparada en `app.js` mediante:

```js
window.BlackPortfolioPayments.startCheckout({ gateway, plan, user })
```

Y cada proveedor base usa un endpoint sugerido:

- PayPal: `/api/billing/paypal/create-order`
- Stripe: `/api/billing/stripe/create-checkout-session`
- Custom: `/api/billing/custom/checkout`

## Credenciales demo

- Correo: `demo@blackportfolio.ai`
- Contrasena: `Black2026!`
