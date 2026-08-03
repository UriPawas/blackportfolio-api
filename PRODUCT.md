# Product

<!-- impeccable:product-schema 1 -->

> Nota de procedencia: este registro se escribió a partir de evidencia del repositorio
> (código, copy publicado, `api.py`, `main.js`, planes reales de Stripe, capturas de la app)
> y de decisiones ya tomadas por el usuario en sesiones anteriores. Los puntos marcados
> `[inferido]` no han sido confirmados verbalmente por el usuario y deben validarse antes
> de convertirse en argumento comercial.

## Platform

web

## Users

- **Inversionista individual** que ya tiene posiciones repartidas entre acciones, ETFs, cripto
  y renta fija, y hoy las administra en una hoja de cálculo. Su trabajo: entender qué tiene
  realmente, cuánto riesgo carga y si necesita rebalancear. Situación de uso: escritorio, en
  casa o en la oficina, revisando la cartera unas cuantas veces por semana. `[inferido de copy y features]`
- **Asesor / analista** que gestiona varias estrategias y tiene que explicárselas a un tercero.
  Su trabajo: preparar un reporte defendible y sostener la conversación con datos.
- **Equipos beta** validando flujos antes de la versión pública. Hoy el acceso está detrás de
  una allowlist (`beta_allowlist`, códigos de invitación).

Idioma primario: español. La app soporta es/en/fr en reportes.

## Product Purpose

BlackPortfolio permite construir portafolios multi-activo, medir su riesgo y rendimiento con
métricas de nivel institucional, y presentar el resultado como un reporte que aguanta ser
mostrado a un cliente. Existe para cerrar la brecha entre "tengo una hoja de cálculo con mis
posiciones" y "tengo una lectura profesional de mi cartera". Éxito = el usuario deja la hoja
de cálculo y vuelve a la plataforma para tomar la decisión de rebalanceo.

## Positioning

La combinación que un competidor vecino no puede copiar de golpe: optimización de portafolios
real (MVO, Smart Beta, Black-Litterman en `markowitz.js`), análisis top-down macro con datos
de mercado vivos, y un reporte exportable con narrativa de IA anclada a noticias por posición
— todo en la misma herramienta, para un solo inversionista, no para una mesa institucional.
Explícitamente **no** es un broker, **no** ejecuta órdenes y **no** da recomendaciones
personalizadas de compra o venta. Esa frontera es un compromiso del producto, no un descargo
legal decorativo.

## Operating Context

- Sesión de escritorio, revisión periódica más que uso diario continuo.
- El usuario llega con posiciones ya existentes; la captura es manual o por importación, sin
  credenciales de broker.
- El artefacto que sale del producto y viaja fuera de él es el **reporte PDF / presentación
  interactiva** — el objeto que el asesor manda por correo y el inversionista archiva.
- Rituales de referencia del usuario: el reporte trimestral de una casa de bolsa, el
  memorándum de comité de inversión, la nota de research. Ese es el registro de lectura que
  ya conoce.

## Capabilities and Constraints

Capacidades confirmadas en código:
- Tracker de portafolios con persistencia en PostgreSQL (Railway) — límites por plan aplicados
  en servidor (`PLAN_LIMITS`).
- Datos de mercado: Yahoo Finance y CoinGecko vía `/api/search` y `/api/chart/{symbol}`.
- Riesgo: volatilidad, drawdown, Sharpe, VaR, HHI/concentración, correlación; Monte Carlo.
- Optimización: MVO, Smart Beta, Black-Litterman.
- Backtesting, rebalanceo asistido, metas, alertas de precio, comparador de portafolios.
- Análisis top-down macro (tasas, VIX, dólar, petróleo, sectores por ciclo).
- Reportes: PDF multiidioma con insights de IA anclados a noticias por posición; presentación
  interactiva exportable; link público de solo lectura (`p.html`).
- Cuentas: Firebase Auth (email/contraseña + Google), 2FA TOTP server-side, dispositivo
  confiable.
- Cobros: Stripe en vivo (checkout, portal, webhook firmado); el plan es autoritativo en
  PostgreSQL, nunca en el cliente. Referencia de precio en MXN además de USD.

Restricciones técnicas:
- Frontend vanilla HTML/CSS/JS sin build step; sin framework, sin bundler.
- Se despliega a Firebase Hosting; el backend FastAPI vive en Railway (RAM limitada — hubo
  trabajo de optimización de memoria).
- Existe CSP; cualquier recurso externo nuevo debe considerarla.
- Tema claro y oscuro, ambos reales (`data-theme`, `bp-theme` en localStorage).

Sin decidir:
- Integración directa con brokers (hoy explícitamente opcional/futura).
- API y webhooks existen como oferta del plan Wealth Desk pero no como capacidad probada.

## Brand Commitments

- Nombre: **BlackPortfolio**. Dominio actual: `portify-6467f.web.app`.
- Voz: sobria, técnica, sin hype ni promesas de rendimiento. El producto no promete ganar
  dinero; promete claridad.
- Redes declaradas: YouTube, GitHub, LinkedIn, Discord.
- Aviso obligatorio en la landing: monitoreo y análisis, no asesoría financiera personalizada.
- Precios reales publicados: Explorer $0 · Investor $19 · Advisor Pro $59 · Wealth Desk $129
  USD/mes (anual ~20% menos). Son cobros vivos en Stripe; no se inventan ni se redondean.

## Evidence on Hand

Real y usable:
- Capturas reales del producto: `assets/screenshots/app-topdown.jpg`,
  `app-markets.jpg`, `app-markowitz.jpg` (2160×1350).
- Métricas y vocabulario reales del motor de análisis (Sharpe, VaR, drawdown, XIRR, HHI).
- Tabla comparativa de planes con features verificables contra `PLAN_LIMITS`.

No existe — no se debe fabricar:
- Testimonios, logos de clientes, casos de estudio, número de usuarios, AUM, "portafolios
  monitoreados", uptime garantizado, cobertura de mercados. La landing actual publica
  `+18K portafolios monitoreados`, `-32% menos tiempo en rebalanceos`, `142 mercados`,
  `99.9% uptime`: **ninguna de esas cifras tiene respaldo en el repositorio** y deben tratarse
  como placeholders a reemplazar o eliminar.
- Certificaciones de seguridad (SOC 2, ISO). Hay 2FA y cifrado en tránsito; eso es todo lo
  que se puede afirmar.

## Product Principles

1. **Claridad antes que promesa.** El producto vende una lectura mejor de la cartera, nunca un
   resultado de inversión.
2. **La frontera se respeta.** Monitoreo y análisis sí; asesoría, ejecución y recomendación
   personalizada no. Se dice de frente, no en letra chica.
3. **El dato manda sobre el adorno.** Toda cifra mostrada debe existir en el sistema o estar
   marcada como ilustrativa.
4. **El reporte es el producto que sale al mundo.** Lo que el usuario le muestra a otro humano
   es el artefacto que define la marca.
5. **Beta honesta.** El estado de acceso restringido y las capacidades pendientes se comunican
   sin disfrazarlos de escasez.

## Accessibility & Inclusion

- Tema claro y oscuro son ambos de primera clase, no un modo secundario.
- Español como idioma principal, con acentos y caracteres correctos (la landing actual tiene
  entidades HTML mal escapadas — `Dise&ntilde;ado` — que deben corregirse).
- Contenido denso en datos: requiere contraste real y no depender solo del color para
  comunicar signo (positivo/negativo).
