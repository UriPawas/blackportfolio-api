/* Portify · Campo · datos de la landing.
   1) PORTAFOLIO DE EJEMPLO: serie diaria ILUSTRATIVA y determinista (semilla fija). No es de ningún cliente ni de un mercado real.
      Las fechas se anclan al último día hábil para que la gráfica no se vea vieja; las cifras no cambian.
   2) PLANES: datos reales de planes.html (precios en USD, referencia en MXN aproximada). */
(function () {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rnd) {
    var u = 1 - rnd(), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* ---- portafolio de ejemplo (MXN): valor actual ilustrativo y recorrido de 252 sesiones frente a un índice ilustrativo ---- */
  var total = 976500, days = 252;
  var rnd = mulberry32(20261118), port = [], bench = [], pv = total / 1.163, bv = 100, i;
  for (i = 0; i < days; i++) {
    var common = gauss(rnd);
    pv *= 1 + 0.00062 + 0.0108 * (0.8 * common + 0.6 * gauss(rnd));
    bv *= 1 + 0.00048 + 0.0089 * common;
    port.push(pv); bench.push(bv);
  }
  var scale = total / port[days - 1], b0 = bench[0];
  port = port.map(function (v) { return v * scale; });
  bench = bench.map(function (v) { return port[0] * v / b0; });

  /* fechas hábiles hacia atrás desde hoy (mediodía local para evitar saltos por huso horario) */
  var dates = [], d = new Date(); d.setHours(12, 0, 0, 0);
  while (dates.length < days) {
    if (d.getDay() % 6) dates.unshift(d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2));
    d.setDate(d.getDate() - 1);
  }

  /* ---- planes reales (planes.html) ---- */
  var plans = [
    { name: 'Explorer',    tag: 'Gratis',       usd: 0,   usdYear: 0,   mxn: 'No pide tarjeta', mxnYear: 'No pide tarjeta', cta: 'Empezar gratis',     href: 'registro.html?plan=Explorer',
      portfolios: '1', positions: '10', data: 'Diferidos 15 min', risk: 'No incluido', bt: 'No incluido', ai: 'No incluido', pdf: 'No incluido', users: '1', alerts: 'Limitadas', api: 'No incluido', support: 'Comunidad' },
    { name: 'Investor',    tag: 'Individual',   usd: 19,  usdYear: 15,  mxn: '≈ $349 MXN',      mxnYear: '≈ $276 MXN',      cta: 'Elegir Investor',    href: 'registro.html?plan=Investor',
      portfolios: '3', positions: '50', data: 'En vivo', risk: 'Esencial', bt: 'No incluido', ai: 'No incluido', pdf: 'Mensual', users: '1', alerts: 'Básicas', api: 'No incluido', support: 'Correo' },
    { name: 'Advisor Pro', tag: 'Profesional',  usd: 59,  usdYear: 47,  mxn: '≈ $1,090 MXN',    mxnYear: '≈ $868 MXN',      cta: 'Elegir Advisor Pro', href: 'registro.html?plan=Advisor%20Pro',
      portfolios: 'Ilimitados', positions: 'Ilimitadas', data: 'En vivo', risk: 'Avanzado, con VaR', bt: 'Incluido', ai: 'Incluido', pdf: 'Ilimitados con tu marca', users: '3 usuarios', alerts: 'Avanzadas', api: 'No incluido', support: 'Prioritario' },
    { name: 'Wealth Desk', tag: 'Equipos',      usd: 129, usdYear: 103, mxn: '≈ $2,390 MXN',    mxnYear: '≈ $1,900 MXN',    cta: 'Elegir Wealth Desk', href: 'registro.html?plan=Wealth%20Desk',
      portfolios: 'Ilimitados', positions: 'Ilimitadas', data: 'En vivo', risk: 'Avanzado, con VaR', bt: 'Incluido', ai: 'Incluido', pdf: 'Marca blanca', users: 'Ilimitados con permisos', alerts: 'Avanzadas con webhooks', api: 'Incluido', support: 'Dedicado con onboarding' }
  ];

  var nf = {};
  function nfmt(dec, cur) {
    var k = dec + (cur ? 'c' : 'n');
    return nf[k] || (nf[k] = new Intl.NumberFormat('es-MX', cur ? { style: 'currency', currency: 'MXN', maximumFractionDigits: dec } : { minimumFractionDigits: dec, maximumFractionDigits: dec }));
  }

  window.CAMPO_LANDING = {
    total: total,
    series: { dates: dates, portfolio: port, benchmark: bench, benchmarkName: 'S&P 500 (ilustrativo, en MXN)' },
    plans: plans,
    fmt: {
      mxn: function (v, dec) { return nfmt(dec == null ? 0 : dec, true).format(v); },
      num: function (v, dec) { return nfmt(dec == null ? 2 : dec).format(v); },
      pct: function (v, dec) { var s = v > 0 ? '+' : v < 0 ? '−' : ''; return s + nfmt(dec == null ? 2 : dec).format(Math.abs(v)) + ' %'; }
    }
  };
})();
