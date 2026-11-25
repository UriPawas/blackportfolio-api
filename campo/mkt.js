/* Campo · marcas (CampoMarks) y mercados de la landing. Se carga después de _dev_proto-campo.js.
   Datos: window.PORTIFY_DEMO. Landing del prototipo; en la app solo se usa CampoMarks. La serie de cada mercado son sus 40 puntos de `spark`,
   tratados como las últimas 40 sesiones hábiles hasta la fecha de D.asOf; se reescalan para terminar en `last`. */
(function () {
  'use strict';
  var D = window.PORTIFY_DEMO; if (!D) return;
  var doc = document, root = doc.documentElement;
  var rmq = matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = function () { return rmq.matches; };

  /* ================= marcas propias (no son marcas registradas) ================= */
  var posCls = {};
  (D.positions || []).forEach(function (p) { posCls[p.ticker.toUpperCase()] = p.cls; });
  var ETF_RE = /^(VOO|VTI|SPY|IVV|QQQ|VT|VEA|VWO|IEMG|BND|AGG|GLD|VGT|SCHD)$/;
  function norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim(); }
  function info(sym) {
    var n = norm(sym), pc = posCls[n], c = pc ? norm(pc) : '';
    if (/IPC|BMV/.test(n)) return { cls: 'idx', k: 't', t: 'IPC' };
    if (/S&P ?500|SP500|^SPX/.test(n)) return { cls: 'idx', k: 't', t: '500' };
    if (/NASDAQ|NDX/.test(n)) return { cls: 'idx', k: 'n', t: '100' };
    if (/USD ?\/ ?MXN|USDMXN|MXN=X/.test(n)) return { cls: 'fx', k: 'fx' };
    if (/^BTC|BITCOIN/.test(n)) return { cls: 'crypto', k: 'btc' };
    if (/^ORO\b|GOLD|XAU/.test(n)) return { cls: 'cmdty', k: 't', t: 'Au' };
    if (/CETES?/.test(n)) return { cls: 'debt', k: 't', t: 'CT' };
    if (/BONO|\b10A\b|TREASUR|US10Y/.test(n)) return { cls: 'debt', k: 't', t: '10A' };
    var letter = (n.match(/[A-Z0-9]/) || ['?'])[0];
    if (/^ETF/.test(c) || ETF_RE.test(n)) return { cls: 'etf', k: 't', t: 'ETF' };
    if (/^ACCION/.test(c)) return { cls: 'stock', k: 't', t: letter };
    if (/^CRIPTO/.test(c)) return { cls: 'crypto', k: 't', t: letter };
    if (/^DEUDA/.test(c)) return { cls: 'debt', k: 't', t: letter };
    return { cls: 'fallback', k: 't', t: letter };
  }
  function cls(sym) { return info(sym).cls; }
  /* Logo real de la empresa: el monograma se queda debajo y el logo (de nuestro /api/logo) lo cubre al cargar.
     Si el API no lo tiene (404) se quita y queda el monograma. No aplica a índices, divisas, materias primas ni deuda. */
  var LOGO_API = (location.hostname === '127.0.0.1' || location.hostname === 'localhost' ? 'http://127.0.0.1:8000' : 'https://blackportfolio-api-production.up.railway.app') + '/api/logo/';
  var NO_LOGO = { idx: 1, fx: 1, cmdty: 1, debt: 1 }, logoMiss = {};
  /* los <image> SVG no entregan 'load'/'error' a un listener del documento: van como atributos en la propia imagen */
  function logoOk(t) { if (t && t.ownerSVGElement) t.ownerSVGElement.classList.add('cmk-ok'); }
  function logoNo(t) {
    if (!t) return;
    logoMiss[t.getAttribute('data-s')] = 1;
    var b = t.previousSibling, r = t.nextSibling;
    if (b && b.classList && b.classList.contains('cmk-lb')) b.remove();
    if (r && r.classList && r.classList.contains('cmk-lr')) r.remove();
    t.remove();
  }
  function svg(sym, size) {
    var i = info(sym), s = size || 24, g = '', fs;
    var key = String(sym == null ? '' : sym).trim().toUpperCase();
    var lg = (!key || NO_LOGO[i.cls] || logoMiss[key]) ? ''
      : '<circle class="cmk-lb" cx="18" cy="18" r="18"/><image class="cmk-lg" data-s="' + key.replace(/[^A-Z0-9.\-]/g, '') + '" href="' + LOGO_API + encodeURIComponent(key) + '" x="0" y="0" width="36" height="36" preserveAspectRatio="xMidYMid slice" onload="CampoMarks.ok(this)" onerror="CampoMarks.no(this)"/><circle class="cmk-lr" cx="18" cy="18" r="17.5"/>';
    if (i.k === 'fx') g = '<circle class="cmk-fa" cx="13.5" cy="18" r="8.5"/><circle class="cmk-fb" cx="22.5" cy="18" r="8.5"/>';
    else if (i.k === 'btc') g = '<path class="cmk-s" d="M14.6 11.2H19.6a3.2 3.2 0 0 1 0 6.4H14.6M14.6 17.6H20.4a3.4 3.4 0 0 1 0 6.8H14.6V11.2M17.2 8.6v2.6M20.6 8.6v2.6M17.2 24.4V27M20.6 24.4V27"/>';
    else if (i.k === 'n') g = '<text class="cmk-t" x="18" y="11.6" font-size="7.4" text-anchor="middle" dy=".35em">N</text><text class="cmk-t" x="18" y="22.4" font-size="12.6" text-anchor="middle" dy=".35em">' + i.t + '</text>';
    else { fs = i.t.length === 1 ? 17 : i.t.length === 2 ? 15 : 12.8; g = '<text class="cmk-t" x="18" y="18" font-size="' + fs + '" text-anchor="middle" dy=".35em">' + i.t + '</text>'; }
    return '<svg class="cmk cmk-' + i.cls + '" width="' + s + '" height="' + s + '" viewBox="0 0 36 36" aria-hidden="true" focusable="false"><circle class="cmk-b" cx="18" cy="18" r="18"/>' + g + lg + '</svg>';
  }
  function el(sym, size) { var w = doc.createElement('span'); w.innerHTML = svg(sym, size); return w.firstChild; }
  window.CampoMarks = { svg: svg, el: el, cls: cls, ok: logoOk, no: logoNo };

  /* ================= utilidades ================= */
  var nfs = {};
  function fmtN(v, dec) { return (nfs[dec] || (nfs[dec] = new Intl.NumberFormat('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec }))).format(v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function bez(x1, y1, x2, y2) {
    return function (t) {
      if (t <= 0) return 0; if (t >= 1) return 1;
      var lo = 0, hi = 1, u = t;
      for (var i = 0; i < 24; i++) {
        var x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
        if (Math.abs(x - t) < 1e-4) break;
        if (x < t) lo = u; else hi = u; u = (lo + hi) / 2;
      }
      return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
    };
  }
  var easeOut = bez(0.23, 1, 0.32, 1);
  function dHTML(v) {
    return '<span class="delta ' + (v > 0 ? 'gain' : v < 0 ? 'loss' : 'flat') + '"><i class="arw" aria-hidden="true">' + (v > 0 ? '▲' : v < 0 ? '▼' : '▪') + '</i><span>' + D.fmt.pct(v) + '</span></span>';
  }
  function sessionDates(n) {
    var mm = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 };
    var m = /(\d{1,2})-([a-z]{3})-(\d{4})/.exec(D.asOf || ''), d = m ? new Date(+m[3], mm[m[2]] || 0, +m[1], 12) : new Date();
    var out = [];
    while (out.length < n) { if (d.getDay() % 6) out.unshift(new Date(d)); d.setDate(d.getDate() - 1); }
    return out;
  }
  var UNIT = { 'S&P/BMV IPC': 'pts', 'S&P 500': 'pts', 'Nasdaq 100': 'pts', 'USD/MXN': 'MXN', 'Bitcoin': 'USD', 'Oro': 'USD/oz' };
  var DEC = { 'USD/MXN': 4, 'Bitcoin': 0 };
  function dShort(d) { return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', ''); }
  function dLong(d) { return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '').replace(/ de /g, ' '); }

  /* ================= mercados de la landing ================= */
  var PERIODS = [['1S', 5, '1 semana'], ['2S', 10, '2 semanas'], ['1M', 21, '1 mes'], ['Todo', 39, 'las 40 sesiones']];
  var R = 96, DUR = 260;

  function initMarkets(old) {
    var host = old.cloneNode(false); /* sin los listeners de arrastre del strip anterior */
    old.parentNode.replaceChild(host, old);
    host.className = 'mkt'; host.removeAttribute('tabindex'); host.removeAttribute('aria-label'); host.removeAttribute('style');

    var N = D.markets[0].spark.length, dates = sessionDates(N);
    var ms = D.markets.map(function (m) {
      var k = m.last / m.spark[N - 1];
      var unit = m.unit === '%' ? '%' : UNIT[m.sym] || '';
      return { m: m, vals: m.spark.map(function (v) { return v * k; }), unit: unit, dec: DEC[m.sym] != null ? DEC[m.sym] : 2 };
    });
    var sel = 0, per = 1, hover = -1;

    function px(mk, v) { return '<span class="mkt-px"><b class="num">' + fmtN(v, mk.dec) + '</b>' + (mk.unit ? '<small class="u">' + mk.unit + '</small>' : '') + '</span>'; }
    function sparkPath(vals) {
      var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), n = vals.length - 1;
      return vals.map(function (v, i) { return (i ? 'L' : 'M') + (i / n * 140).toFixed(1) + ' ' + (25 - (v - mn) / (mx - mn || 1) * 22).toFixed(1); }).join('');
    }

    host.innerHTML = '<div class="mkt-band" role="group" aria-label="Mercados de muestra"></div>' +
      '<div class="mkt-main"><div class="mkt-head"><div class="mkt-id"><span class="mkt-mark"></span><div><h3 class="mkt-name"></h3><span class="mkt-sub">Últimas 40 sesiones</span></div></div><div class="mkt-ro"></div></div>' +
      '<div class="mkt-cv"><canvas tabindex="0" role="img"></canvas></div>' +
      '<div class="mkt-per" role="group" aria-label="Periodo del gráfico"></div>' +
      '<p class="mkt-note">Datos de muestra. Los cambios por periodo se calculan sobre las últimas 40 sesiones de la serie, que se reescala para terminar en el último precio.</p>' +
      '<span class="sr" aria-live="polite"></span></div>';
    var band = host.querySelector('.mkt-band'), perEl = host.querySelector('.mkt-per'), roEl = host.querySelector('.mkt-ro');
    var cv = host.querySelector('canvas'), live = host.querySelector('.sr');

    /* tarjetas */
    ms.forEach(function (mk, i) {
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'mkc'; b.style.setProperty('--i', i);
      b.setAttribute('aria-pressed', i === sel ? 'true' : 'false'); b.tabIndex = i === sel ? 0 : -1;
      b.innerHTML = '<span class="mkc-top">' + svg(mk.m.sym, 24) + '<span class="mkc-name">' + mk.m.sym + '</span></span>' + px(mk, mk.m.last) + dHTML(mk.m.chg) +
        '<svg class="mkc-sp" viewBox="0 0 140 28" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="' + sparkPath(mk.vals) + '"/></svg>';
      b.addEventListener('click', function () { select(i); });
      band.appendChild(b);
    });
    var cards = Array.prototype.slice.call(band.children);
    function rove(items, e) {
      var i = items.indexOf(doc.activeElement); if (i < 0) return;
      var j = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : -1;
      if (j < 0) return; e.preventDefault(); items[(j + items.length) % items.length].focus();
    }
    band.addEventListener('keydown', function (e) { rove(cards, e); });
    perEl.addEventListener('keydown', function (e) { rove(Array.prototype.slice.call(perEl.children), e); });

    /* aparición: el trazo del sparkline se dibuja al entrar al viewport */
    if (reduce() || !('IntersectionObserver' in window)) host.classList.add('is-in');
    else { var io = new IntersectionObserver(function (es) { if (es.some(function (x) { return x.isIntersecting; })) { host.classList.add('is-in'); io.disconnect(); } }, { threshold: 0.2 }); io.observe(band); }

    /* ---- colores desde tokens (se resuelve oklch con un lienzo de 1 px) ---- */
    var cc = {}, c1 = doc.createElement('canvas'); c1.width = c1.height = 1; var x1 = c1.getContext('2d', { willReadFrequently: true });
    function col(name) {
      if (cc[name]) return cc[name];
      x1.clearRect(0, 0, 1, 1); x1.fillStyle = '#000'; x1.fillStyle = getComputedStyle(root).getPropertyValue(name).trim() || '#888'; x1.fillRect(0, 0, 1, 1);
      var d = x1.getImageData(0, 0, 1, 1).data; return (cc[name] = [d[0], d[1], d[2], d[3] / 255]);
    }
    function rgba(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (c[3] * a).toFixed(3) + ')'; }

    /* ---- gráfico ---- */
    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1, PL = 2, PR = 62, PT = 14, PB = 26, ff = '';
    var A = null, B = null, anim = null, raf = 0;
    function niceTicks(lo, hi) {
      var s0 = (hi - lo) / 4, mag = Math.pow(10, Math.floor(Math.log10(s0))), nn = s0 / mag, st = (nn < 1.5 ? 1 : nn < 3 ? 2 : nn < 7 ? 5 : 10) * mag, out = [];
      for (var v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) out.push(v);
      return { t: out, dec: clamp(-Math.floor(Math.log10(st) + 1e-9), 0, 5) };
    }
    function makeView() {
      var mk = ms[sel], k = PERIODS[per][1], pts = mk.vals.slice(N - 1 - k), ds = dates.slice(N - 1 - k);
      var lo = Math.min.apply(null, pts), hi = Math.max.apply(null, pts), pad = (hi - lo) * 0.14 || hi * 0.01; lo -= pad; hi += pad;
      var yn = []; for (var i = 0; i < R; i++) { var x = i / (R - 1) * k, f = Math.floor(x), fr = x - f, v = lerp(pts[f], pts[Math.min(f + 1, k)], fr); yn.push((v - lo) / (hi - lo)); }
      return { mk: mk, k: k, pts: pts, ds: ds, lo: lo, hi: hi, yn: yn, tk: niceTicks(lo, hi) };
    }
    function viewCol(v) { return col(v.pts[v.k] >= v.pts[0] ? '--gain' : '--loss'); }
    function xAt(i, n) { return PL + (W - PL - PR) * i / n; }
    function yAt(yn) { return PT + (H - PT - PB) * (1 - yn); }
    function sched() { if (!raf) raf = requestAnimationFrame(draw); }
    function grid(v, alpha) {
      var gc = col('--grid'), tc = col('--text-3'); ctx.font = '11px ' + ff; ctx.textBaseline = 'middle'; ctx.textAlign = 'right'; ctx.lineWidth = 1;
      v.tk.t.forEach(function (t) {
        var y = Math.round(yAt((t - v.lo) / (v.hi - v.lo))) + 0.5;
        ctx.strokeStyle = rgba(gc, alpha); ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(W - PR + 6, y); ctx.stroke();
        ctx.fillStyle = rgba(tc, alpha); ctx.fillText(fmtN(t, v.tk.dec), W - 2, y);
      });
    }
    function draw(now) {
      raf = 0; if (!W || !B) return;
      var p = 1;
      if (anim) { p = easeOut(clamp(((now || performance.now()) - anim.t0) / DUR, 0, 1)); if (p >= 1) { anim = null; A = B; } }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      var a = A || B;
      if (p < 1) { grid(a, 1 - p); grid(B, p); } else grid(B, 1);
      var ca = viewCol(a), cb = viewCol(B);
      var lo = lerp(a.lo, B.lo, p), hi = lerp(a.hi, B.hi, p), c = [lerp(ca[0], cb[0], p), lerp(ca[1], cb[1], p), lerp(ca[2], cb[2], p), 1];
      var xs = [], ys = [], i; for (i = 0; i < R; i++) { xs.push(xAt(i, R - 1)); ys.push(yAt(lerp(a.yn[i], B.yn[i], p))); }
      var g = ctx.createLinearGradient(0, PT, 0, H - PB); g.addColorStop(0, rgba(c, 0.2)); g.addColorStop(1, rgba(c, 0));
      ctx.beginPath(); ctx.moveTo(xs[0], H - PB); for (i = 0; i < R; i++) ctx.lineTo(xs[i], ys[i]); ctx.lineTo(xs[R - 1], H - PB); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); for (i = 0; i < R; i++) { if (i) ctx.lineTo(xs[i], ys[i]); else ctx.moveTo(xs[i], ys[i]); }
      ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 1.75; ctx.lineJoin = ctx.lineCap = 'round'; ctx.stroke();
      /* fechas */
      var tc = col('--text-3'), n = B.ds.length - 1; ctx.font = '11px ' + ff; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = rgba(tc, 1);
      [[0, 'left', PL], [n, 'right', W - PR]].concat(n >= 8 ? [[Math.round(n / 2), 'center', xAt(Math.round(n / 2), n)]] : []).forEach(function (r) { ctx.textAlign = r[1]; ctx.fillText(dShort(B.ds[r[0]]), r[2], H - 7); });
      /* punto final o cruz */
      if (hover < 0) { ctx.beginPath(); ctx.arc(xs[R - 1], ys[R - 1], 3.2, 0, 7); ctx.fillStyle = rgba(c, 1); ctx.fill(); }
      else {
        var hx = xAt(hover, B.k), hy = yAt((B.pts[hover] - lo) / (hi - lo)), px0 = Math.round(hx) + 0.5;
        ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = rgba(col('--text-3'), 0.8); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px0, PT - 4); ctx.lineTo(px0, H - PB); ctx.stroke(); ctx.restore();
        ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, 7); ctx.fillStyle = rgba(c, 1); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = rgba(col('--bg'), 1); ctx.stroke();
        var label = fmtN(B.pts[hover], B.mk.dec), tw = ctx.measureText(label).width + 12, ty = clamp(hy, PT + 9, H - PB - 9);
        ctx.font = '11px ' + ff; tw = ctx.measureText(label).width + 12;
        ctx.fillStyle = rgba(col('--s3'), 1); ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(W - PR + 4, ty - 9, Math.min(tw, PR - 2), 18, 5); else ctx.rect(W - PR + 4, ty - 9, Math.min(tw, PR - 2), 18); ctx.fill();
        ctx.fillStyle = rgba(col('--text'), 1); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label, W - PR + 10, ty + 0.5);
      }
      if (anim) sched();
    }
    function size() {
      var r = cv.parentNode.getBoundingClientRect(); if (!r.width) return;
      dpr = Math.min(2, window.devicePixelRatio || 1); W = Math.round(r.width); H = Math.round(r.height);
      cv.width = W * dpr; cv.height = H * dpr; ff = getComputedStyle(host).fontFamily; sched();
    }
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(cv.parentNode); else addEventListener('resize', size);
    new MutationObserver(function () { cc = {}; sched(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    function setView(animate) {
      var nv = makeView();
      if (animate && !reduce() && B) { A = anim ? A : B; anim = { t0: performance.now() }; B = nv; } else { A = B = nv; anim = null; }
      sched();
    }
    function readout() {
      var mk = ms[sel], v = B;
      if (hover < 0) roEl.innerHTML = px(mk, mk.m.last) + dHTML(mk.m.chg) + '<span class="mkt-when">hoy · cierre ' + dShort(dates[N - 1]) + '</span>';
      else roEl.innerHTML = px(mk, v.pts[hover]) + dHTML((v.pts[hover] / v.pts[0] - 1) * 100) + '<span class="mkt-when">' + dLong(v.ds[hover]) + ' · vs ' + dShort(v.ds[0]) + '</span>';
    }
    function paintPer() {
      var mk = ms[sel];
      perEl.innerHTML = '';
      PERIODS.forEach(function (P, i) {
        var pts = mk.vals, ch = (pts[N - 1] / pts[N - 1 - P[1]] - 1) * 100, b = doc.createElement('button'); b.type = 'button'; b.className = 'mkp';
        b.setAttribute('aria-pressed', i === per ? 'true' : 'false'); b.tabIndex = i === per ? 0 : -1;
        b.setAttribute('aria-label', P[2] + ', ' + D.fmt.pct(ch));
        b.innerHTML = '<span class="mkp-l">' + P[0] + '</span>' + dHTML(ch);
        b.addEventListener('click', function () { if (i === per) return; per = i; hover = -1; paintPer(); setView(true); readout(); label(); });
        perEl.appendChild(b);
      });
    }
    function label() { cv.setAttribute('aria-label', 'Gráfico de ' + ms[sel].m.sym + ', ' + PERIODS[per][2] + '. Datos de muestra. Con las flechas izquierda y derecha lees cada sesión.'); }
    function head() {
      var mk = ms[sel]; host.querySelector('.mkt-mark').innerHTML = svg(mk.m.sym, 36); host.querySelector('.mkt-name').textContent = mk.m.sym;
    }
    function select(i) {
      if (i === sel) return;
      sel = i; hover = -1;
      cards.forEach(function (c, j) { c.setAttribute('aria-pressed', j === i ? 'true' : 'false'); c.tabIndex = j === i ? 0 : -1; });
      var c = cards[i], l = c.offsetLeft - 4, r = l + c.offsetWidth;
      if (l < band.scrollLeft) band.scrollTo({ left: l - 8, behavior: reduce() ? 'auto' : 'smooth' });
      else if (r > band.scrollLeft + band.clientWidth) band.scrollTo({ left: r - band.clientWidth + 12, behavior: reduce() ? 'auto' : 'smooth' });
      head(); paintPer(); setView(true); readout(); label();
    }
    /* cruz y lectura exacta */
    function at(e) { var r = cv.getBoundingClientRect(), x = e.clientX - r.left; return clamp(Math.round((x - PL) / (W - PL - PR) * B.k), 0, B.k); }
    function hv(i) { if (i === hover) return; hover = i; readout(); sched(); }
    cv.addEventListener('pointermove', function (e) { if (B) hv(at(e)); });
    cv.addEventListener('pointerdown', function (e) { if (B) hv(at(e)); });
    cv.addEventListener('pointerleave', function () { hv(-1); });
    cv.addEventListener('keydown', function (e) {
      var k = B.k, i = hover < 0 ? k : hover, j = e.key === 'ArrowLeft' ? i - 1 : e.key === 'ArrowRight' ? i + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? k : e.key === 'Escape' ? -1 : null;
      if (j === null) return; e.preventDefault(); hv(j < 0 ? -1 : clamp(j, 0, k));
      live.textContent = hover < 0 ? '' : dLong(B.ds[hover]) + ', ' + fmtN(B.pts[hover], B.mk.dec) + ' ' + B.mk.unit;
    });
    cv.addEventListener('blur', function () { hv(-1); });

    head(); paintPer(); setView(false); readout(); label(); size();
  }

  var strip = doc.getElementById('marketStrip');
  if (strip && D.markets && D.markets.length) initMarkets(strip);
  doc.dispatchEvent(new CustomEvent('campo:marks-ready'));
})();
