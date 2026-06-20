// ── Monitoreo de errores frontend (Sentry) ───────────────────────────────────
// Carga el SDK de Sentry desde el CDN e inicializa la captura de errores y
// promesas no manejadas. Es un NO-OP hasta que configures un DSN: el DSN público
// de Sentry está pensado para vivir en el cliente, así que puedes pegarlo abajo
// (o definir window.SENTRY_DSN antes de cargar este script).
//
// Para activarlo:
//   1. Crea un proyecto en https://sentry.io (plataforma: JavaScript / Browser).
//   2. Copia el DSN público del proyecto y pégalo en SENTRY_DSN.
//   3. Despliega. Los errores empezarán a llegar al panel de Sentry.
(function initFrontendMonitoring() {
  var SENTRY_DSN = window.SENTRY_DSN || "https://5ff9adfb1dc1cac1a41689acce6c6308@o4511600070557696.ingest.us.sentry.io/4511600082026496";
  if (!SENTRY_DSN) return; // sin DSN: no se carga nada (dev/local intactos)

  var SENTRY_VERSION = "8.26.0";
  var script = document.createElement("script");
  script.src = "https://browser.sentry-cdn.com/" + SENTRY_VERSION + "/bundle.tracing.min.js";
  script.crossOrigin = "anonymous";
  script.onload = function () {
    if (!window.Sentry) return;
    try {
      window.Sentry.init({
        dsn: SENTRY_DSN,
        environment: location.hostname === "127.0.0.1" || location.hostname === "localhost"
          ? "development" : "production",
        tracesSampleRate: 0.1,
        // No enviar datos personales por defecto (PII).
        sendDefaultPii: false,
      });
    } catch (e) {
      console.warn("Sentry no se inicializó:", e);
    }
  };
  script.onerror = function () { console.warn("No se pudo cargar el SDK de Sentry."); };
  document.head.appendChild(script);
})();
