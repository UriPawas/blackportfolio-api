/*!
 * deck-charts.js — animated SVG chart renderers for the portfolio report deck.
 * No dependencies, no <canvas>, no library defaults. See
 * references/html-presentation.md § Charts for the spec these implement.
 *
 * Contract for every renderer:
 *   BPDeckCharts.mount(node, type, data, opts)
 *     - renders immediately in its PRE-animation state
 *     - assigns node._play() — the deck shell calls it when the slide activates
 *     - reads all colors from CSS custom properties on `node` (tone tokens),
 *       never from a literal hex in here
 *     - honours prefers-reduced-motion by mounting in the final state
 *
 * Inline this file into the delivered single-file .html.
 */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var REDUCED = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'cubic-bezier(.16,1,.3,1)';
  var uid = 0;

  var cfg = { locale: 'es-MX', currency: 'USD' };

  /* ── tiny helpers ───────────────────────────────────────────────────────── */

  function svgEl(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function htmlEl(tag, cls, parent, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }

  // Tone tokens: --tone-chart-1/-2, --tone-accent, --tone-up, --tone-down, --tone-text-muted
  function token(node, name, fallback) {
    var v = getComputedStyle(node).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }

  function money(v, maxFrac) {
    if (v == null || !isFinite(v)) return '';
    // narrowSymbol ("$128,450", not "USD 128,450"): a 74px KPI figure with a
    // 3-letter code overflows its tile. The currency code belongs in the
    // period pill / footnote, stated once.
    var o = {
      style: 'currency', currency: cfg.currency, currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0, maximumFractionDigits: maxFrac == null ? 0 : maxFrac
    };
    try { return new Intl.NumberFormat(cfg.locale, o).format(v); }
    catch (e) { delete o.currencyDisplay; return new Intl.NumberFormat(cfg.locale, o).format(v); }
  }
  function pct(v, d) {
    if (v == null || !isFinite(v)) return '';
    return (v > 0 ? '+' : '') + v.toFixed(d == null ? 1 : d) + '%';
  }
  function pp(v, d) {
    if (v == null || !isFinite(v)) return '';
    return (v > 0 ? '+' : '') + v.toFixed(d == null ? 1 : d) + ' pp';
  }
  function fmtBy(kind, v) {
    return kind === 'pct' ? pct(v) : kind === 'pp' ? pp(v) : kind === 'num' ? (+v).toFixed(2) : money(v);
  }

  function extent(arr, get) {
    var lo = Infinity, hi = -Infinity;
    for (var i = 0; i < arr.length; i++) {
      var v = get ? get(arr[i]) : arr[i];
      if (!isFinite(v)) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    if (lo === hi) { lo -= 1; hi += 1; }
    return [lo, hi];
  }

  function niceTicks(lo, hi, count) {
    var step = (hi - lo) / (count - 1), out = [];
    for (var i = 0; i < count; i++) out.push(lo + step * i);
    return out;
  }

  /* ── shared tooltip (one node for the whole deck) ───────────────────────── */

  var tip;
  function showTip(html, x, y) {
    if (!tip) {
      tip = htmlEl('div', 'deck-tip', document.body);
      tip.setAttribute('role', 'status');
    }
    tip.innerHTML = html;
    tip.style.opacity = '1';
    var r = tip.getBoundingClientRect();
    tip.style.left = Math.min(Math.max(8, x - r.width / 2), innerWidth - r.width - 8) + 'px';
    tip.style.top = Math.max(8, y - r.height - 14) + 'px';
  }
  function hideTip() { if (tip) tip.style.opacity = '0'; }

  /* ── 1. area — equity curve vs benchmark ────────────────────────────────── */

  function area(node, data, opts) {
    opts = opts || {};
    var W = 1000, H = 430, PL = 8, PR = 96, PT = 26, PB = 44;
    var series = (data.series || []).filter(function (d) { return isFinite(d.value); });
    if (series.length < 2) { node.innerHTML = ''; node._play = function () {}; return; }
    var bench = (data.bench || []).filter(function (d) { return isFinite(d.value); });
    // optional third line — e.g. invested capital under the market-value curve
    var extra = (data.extra || []).filter(function (d) { return isFinite(d.value); });
    var kind = data.format || 'money';
    var id = 'ar' + (++uid);

    var all = series.concat(bench).concat(extra);
    var e = extent(all, function (d) { return d.value; });
    var pad = (e[1] - e[0]) * 0.12;
    var lo = e[0] - pad, hi = e[1] + pad;
    var iw = W - PL - PR, ih = H - PT - PB;
    var X = function (i, n) { return PL + (iw * i) / ((n || series.length) - 1); };
    var Y = function (v) { return PT + ih - ((v - lo) / (hi - lo)) * ih; };

    node.innerHTML = '';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'ch ch-area', preserveAspectRatio: 'none' }, node);
    svg.style.width = '100%'; svg.style.height = '100%'; svg.style.overflow = 'visible';

    var c1 = token(node, '--tone-chart-1', '#556eff');
    var c2 = token(node, '--tone-chart-2', '#a9b8ff');
    var muted = token(node, '--tone-text-muted', '#6b7280');
    var down = token(node, '--tone-down', '#c0392b');

    var defs = svgEl('defs', {}, svg);
    var g = svgEl('linearGradient', { id: id + 'f', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    svgEl('stop', { offset: '0%', 'stop-color': c1, 'stop-opacity': 0.38 }, g);
    svgEl('stop', { offset: '100%', 'stop-color': c1, 'stop-opacity': 0 }, g);
    var fl = svgEl('filter', { id: id + 'g', x: '-20%', y: '-40%', width: '140%', height: '180%' }, defs);
    svgEl('feGaussianBlur', { stdDeviation: 6 }, fl);

    // gridlines + y labels
    niceTicks(lo, hi, 4).forEach(function (v) {
      var y = Y(v);
      svgEl('line', { x1: PL, y1: y, x2: PL + iw, y2: y, stroke: muted, 'stroke-opacity': 0.16, 'stroke-dasharray': '2 6' }, svg);
      svgEl('text', { x: PL + iw + 10, y: y + 5, fill: muted, 'font-size': 16, 'font-variant-numeric': 'tabular-nums' }, svg)
        .textContent = fmtBy(kind, v);
    });

    // max-drawdown band
    if (data.ddBand && data.ddBand.from != null) {
      var bx = X(data.ddBand.from), bw = Math.max(2, X(data.ddBand.to) - bx);
      var band = svgEl('rect', { x: bx, y: PT, width: bw, height: ih, fill: down, opacity: 0 }, svg);
      band.dataset.role = 'band';
    }

    function path(pts, n) {
      return pts.map(function (d, i) { return (i ? 'L' : 'M') + X(i, n).toFixed(1) + ' ' + Y(d.value).toFixed(1); }).join(' ');
    }

    if (bench.length > 1) {
      var bp = svgEl('path', {
        d: path(bench, bench.length), fill: 'none', stroke: c2, 'stroke-width': 2,
        'stroke-dasharray': '7 6', 'stroke-linecap': 'round', opacity: 0
      }, svg);
      bp.dataset.role = 'bench';
    }

    if (extra.length > 1) {
      var xp = svgEl('path', {
        d: path(extra, extra.length), fill: 'none', stroke: token(node, '--tone-text-muted', '#6b7280'),
        'stroke-width': 1.8, 'stroke-dasharray': '2 5', 'stroke-linecap': 'round', opacity: 0
      }, svg);
      xp.dataset.role = 'extra';
    }

    var d = path(series);
    var areaPath = svgEl('path', { d: d + ' L' + (PL + iw) + ' ' + (PT + ih) + ' L' + PL + ' ' + (PT + ih) + ' Z', fill: 'url(#' + id + 'f)', opacity: 0 }, svg);
    svgEl('path', { d: d, fill: 'none', stroke: c1, 'stroke-width': 8, opacity: 0.28, filter: 'url(#' + id + 'g)' }, svg).dataset.role = 'glow';
    var line = svgEl('path', { d: d, fill: 'none', stroke: c1, 'stroke-width': 2.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);

    // x labels (5 ticks)
    var step = Math.max(1, Math.floor((series.length - 1) / 4));
    for (var i = 0; i < series.length; i += step) {
      svgEl('text', { x: X(i), y: H - 12, fill: muted, 'font-size': 16, 'text-anchor': i === 0 ? 'start' : 'middle' }, svg)
        .textContent = series[i].date;
    }

    // end marker + value pill
    var ex = X(series.length - 1), ey = Y(series[series.length - 1].value);
    var endG = svgEl('g', { opacity: 0 }, svg);
    endG.dataset.role = 'end';
    svgEl('circle', { cx: ex, cy: ey, r: 12, fill: c1, opacity: 0.22, class: 'ch-pulse' }, endG);
    svgEl('circle', { cx: ex, cy: ey, r: 5, fill: c1 }, endG);
    // encima del punto, no a su derecha: a la altura del eje choca con la etiqueta Y
    svgEl('text', { x: ex + 10, y: ey - 14, fill: c1, 'font-size': 19, 'font-weight': 700, 'font-variant-numeric': 'tabular-nums' }, endG)
      .textContent = fmtBy(kind, series[series.length - 1].value);

    // crosshair + tooltip
    var cross = svgEl('g', { opacity: 0 }, svg);
    var cl = svgEl('line', { y1: PT, y2: PT + ih, stroke: c1, 'stroke-width': 1, 'stroke-opacity': 0.5 }, cross);
    var cc = svgEl('circle', { r: 6, fill: c1, stroke: '#fff', 'stroke-width': 2 }, cross);
    var hit = svgEl('rect', { x: PL, y: PT, width: iw, height: ih, fill: 'transparent' }, svg);
    hit.style.cursor = 'crosshair';
    hit.addEventListener('pointermove', function (ev) {
      var r = svg.getBoundingClientRect();
      var rel = ((ev.clientX - r.left) / r.width) * W;
      var idx = Math.round(((rel - PL) / iw) * (series.length - 1));
      idx = Math.max(0, Math.min(series.length - 1, idx));
      var x = X(idx), y = Y(series[idx].value);
      cl.setAttribute('x1', x); cl.setAttribute('x2', x);
      cc.setAttribute('cx', x); cc.setAttribute('cy', y);
      cross.setAttribute('opacity', 1);
      var more = (bench[idx] ? '<i>' + (data.benchLabel || 'Benchmark') + ': ' + fmtBy(kind, bench[idx].value) + '</i>' : '')
        + (extra[idx] ? '<i>' + (data.extraLabel || '') + ': ' + fmtBy(kind, extra[idx].value) + '</i>' : '');
      showTip('<b>' + series[idx].date + '</b><span>' + fmtBy(kind, series[idx].value) + '</span>' + more, ev.clientX, ev.clientY);
    });
    hit.addEventListener('pointerleave', function () { cross.setAttribute('opacity', 0); hideTip(); });

    var len = line.getTotalLength ? line.getTotalLength() : 0;
    function pre() {
      if (!len) return;
      line.style.transition = 'none';
      line.style.strokeDasharray = len + ' ' + len;
      line.style.strokeDashoffset = len;
      var glow = svg.querySelector('[data-role="glow"]');
      if (glow) { glow.style.transition = 'none'; glow.style.strokeDasharray = len + ' ' + len; glow.style.strokeDashoffset = len; }
    }
    function final() {
      [line, svg.querySelector('[data-role="glow"]')].forEach(function (p) {
        if (!p) return;
        p.style.transition = 'stroke-dashoffset 950ms ' + EASE;
        p.style.strokeDashoffset = 0;
      });
      areaPath.style.transition = 'opacity 700ms ease 320ms'; areaPath.style.opacity = 1;
      var b = svg.querySelector('[data-role="bench"]');
      if (b) { b.style.transition = 'opacity 600ms ease 420ms'; b.style.opacity = 0.9; }
      var xr = svg.querySelector('[data-role="extra"]');
      if (xr) { xr.style.transition = 'opacity 600ms ease 520ms'; xr.style.opacity = 0.8; }
      var bd = svg.querySelector('[data-role="band"]');
      if (bd) { bd.style.transition = 'opacity 600ms ease 700ms'; bd.style.opacity = 0.09; }
      endG.style.transition = 'opacity 500ms ease 850ms'; endG.style.opacity = 1;
    }
    if (REDUCED) { final(); node._play = function () {}; }
    else { pre(); node._play = function () { pre(); requestAnimationFrame(function () { requestAnimationFrame(final); }); }; }
  }

  /* ── 2. waterfall — attribution start → contributions → end ───────────────
     If the contributions are small relative to `start` (a 7% quarter on a
     six-figure book), the middle bars render as slivers. Pass start.value = 0
     and items = the per-position P&L for a contribution-only waterfall instead.
     Never break the axis to fake magnitude. */

  function waterfall(node, data) {
    var W = 1000, H = 420, PL = 10, PR = 10, PT = 46, PB = 62;
    var items = data.items || [];
    if (!items.length) { node.innerHTML = ''; node._play = function () {}; return; }
    var start = data.start || { label: 'Inicio', value: 0 };
    var kind = data.format || 'money';

    // Waterfall de contribuciones (start = 0): la barra inicial sería una línea
    // de altura cero, así que no se dibuja.
    var cum = start.value, steps = start.value ? [{ label: start.label, from: 0, to: start.value, type: 'total' }] : [];
    items.forEach(function (it) { steps.push({ label: it.label, from: cum, to: cum + it.value, type: it.value >= 0 ? 'up' : 'down', value: it.value, meta: it.meta }); cum += it.value; });
    steps.push({ label: (data.end && data.end.label) || 'Final', from: 0, to: cum, type: 'total' });

    var e = extent(steps.reduce(function (a, s) { return a.concat([s.from, s.to]); }, [0]));
    var lo = Math.min(0, e[0]), hi = e[1] * 1.08;
    var iw = W - PL - PR, ih = H - PT - PB;
    var bw = Math.min(74, (iw / steps.length) * 0.62);
    var Y = function (v) { return PT + ih - ((v - lo) / (hi - lo)) * ih; };

    node.innerHTML = '';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'ch ch-wf' }, node);
    svg.style.width = '100%'; svg.style.height = '100%'; svg.style.overflow = 'visible';
    var c1 = token(node, '--tone-chart-1', '#556eff');
    var up = token(node, '--tone-up', '#1a7f4b');
    var dn = token(node, '--tone-down', '#c0392b');
    var muted = token(node, '--tone-text-muted', '#6b7280');
    var bars = [];

    steps.forEach(function (s, i) {
      var cx = PL + (iw / steps.length) * (i + 0.5);
      var y0 = Y(Math.max(s.from, s.to)), y1 = Y(Math.min(s.from, s.to));
      var h = Math.max(3, y1 - y0);
      var fill = s.type === 'total' ? c1 : s.type === 'up' ? up : dn;
      var g = svgEl('g', { class: 'wf-bar' }, svg);
      var r = svgEl('rect', { x: cx - bw / 2, y: y0, width: bw, height: h, rx: 5, fill: fill }, g);
      r.style.transformBox = 'fill-box'; r.style.transformOrigin = s.type === 'down' ? 'top' : 'bottom';
      bars.push(r);
      var lbl = svgEl('text', { x: cx, y: y0 - 12, 'text-anchor': 'middle', fill: fill, 'font-size': 17, 'font-weight': 700, 'font-variant-numeric': 'tabular-nums', opacity: 0 }, g);
      lbl.textContent = s.type === 'total' ? fmtBy(kind, s.to) : fmtBy(kind, s.value);
      lbl.dataset.role = 'lbl';
      var t = svgEl('text', { x: cx, y: H - 30, 'text-anchor': 'middle', fill: muted, 'font-size': 16, 'font-weight': 600 }, svg);
      t.textContent = s.label;
      if (i < steps.length - 2) {
        svgEl('line', { x1: cx + bw / 2, y1: Y(s.to), x2: PL + (iw / steps.length) * (i + 1.5) - bw / 2, y2: Y(s.to), stroke: muted, 'stroke-opacity': 0.35, 'stroke-dasharray': '3 4' }, svg);
      }
      g.style.cursor = 'pointer';
      g.addEventListener('pointerenter', function (ev) {
        r.style.filter = 'brightness(1.12)';
        showTip('<b>' + s.label + '</b><span>' + (s.type === 'total' ? fmtBy(kind, s.to) : fmtBy(kind, s.value)) + '</span>' + (s.meta ? '<i>' + s.meta + '</i>' : ''), ev.clientX, ev.clientY);
      });
      g.addEventListener('pointerleave', function () { r.style.filter = ''; hideTip(); });
    });

    var labels = svg.querySelectorAll('[data-role="lbl"]');
    function pre() { bars.forEach(function (r) { r.style.transition = 'none'; r.style.transform = 'scaleY(0)'; }); labels.forEach(function (l) { l.style.transition = 'none'; l.style.opacity = 0; }); }
    function final() {
      bars.forEach(function (r, i) { r.style.transition = 'transform 620ms ' + EASE + ' ' + (i * 60) + 'ms'; r.style.transform = 'scaleY(1)'; });
      labels.forEach(function (l, i) { l.style.transition = 'opacity 320ms ease ' + (260 + i * 60) + 'ms'; l.style.opacity = 1; });
    }
    if (REDUCED) { final(); node._play = function () {}; }
    else { pre(); node._play = function () { pre(); requestAnimationFrame(function () { requestAnimationFrame(final); }); }; }
  }

  /* ── 3. diverging — winners / losers around a center axis ───────────────── */

  function diverging(node, data) {
    var rows = data.rows || [];
    if (!rows.length) { node.innerHTML = ''; node._play = function () {}; return; }
    var W = 1000, rowH = 56, H = rows.length * rowH + 16, cx = W * 0.46;
    var maxAbs = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.value) || 0; })) || 1;
    var kind = data.format || 'pp';

    node.innerHTML = '';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'ch ch-div' }, node);
    svg.style.width = '100%'; svg.style.height = '100%'; svg.style.overflow = 'visible';
    var up = token(node, '--tone-up', '#1a7f4b');
    var dn = token(node, '--tone-down', '#c0392b');
    var muted = token(node, '--tone-text-muted', '#6b7280');
    svgEl('line', { x1: cx, y1: 4, x2: cx, y2: H - 8, stroke: muted, 'stroke-opacity': 0.25 }, svg);
    var bars = [];

    rows.forEach(function (r, i) {
      var y = 12 + i * rowH, w = Math.max(4, (Math.abs(r.value) / maxAbs) * (W * 0.40));
      var pos = r.value >= 0;
      var g = svgEl('g', {}, svg);
      var rect = svgEl('rect', { x: pos ? cx : cx - w, y: y, width: w, height: 30, rx: 6, fill: pos ? up : dn, opacity: 0.9 }, g);
      rect.style.transformBox = 'view-box'; rect.style.transformOrigin = cx + 'px 0';
      bars.push(rect);
      // La etiqueta va del lado opuesto a la barra; si no, en las filas negativas
      // se encima con el valor (ambos quedarían a la izquierda del eje).
      svgEl('text', {
        x: pos ? cx - 16 : cx + 16, y: y + 22, 'text-anchor': pos ? 'end' : 'start',
        fill: token(node, '--tone-text', '#111'), 'font-size': 19, 'font-weight': 700
      }, g).textContent = r.label;
      var v = svgEl('text', { x: pos ? cx + w + 12 : cx - w - 12, y: y + 22, 'text-anchor': pos ? 'start' : 'end', fill: pos ? up : dn, 'font-size': 19, 'font-weight': 800, 'font-variant-numeric': 'tabular-nums', opacity: 0 }, g);
      v.textContent = fmtBy(kind, r.value) + (r.sub ? '  ·  ' + r.sub : '');
      v.dataset.role = 'v';
      g.style.cursor = 'pointer';
      g.addEventListener('pointerenter', function (ev) {
        rect.style.opacity = 1;
        showTip('<b>' + r.label + '</b><span>' + fmtBy(kind, r.value) + '</span>' + (r.meta ? '<i>' + r.meta + '</i>' : ''), ev.clientX, ev.clientY);
      });
      g.addEventListener('pointerleave', function () { rect.style.opacity = 0.9; hideTip(); });
    });

    var vals = svg.querySelectorAll('[data-role="v"]');
    function pre() { bars.forEach(function (b) { b.style.transition = 'none'; b.style.transform = 'scaleX(0)'; }); vals.forEach(function (v) { v.style.transition = 'none'; v.style.opacity = 0; }); }
    function final() {
      bars.forEach(function (b, i) { b.style.transition = 'transform 620ms ' + EASE + ' ' + (i * 70) + 'ms'; b.style.transform = 'scaleX(1)'; });
      vals.forEach(function (v, i) { v.style.transition = 'opacity 300ms ease ' + (320 + i * 70) + 'ms'; v.style.opacity = 1; });
    }
    if (REDUCED) { final(); node._play = function () {}; }
    else { pre(); node._play = function () { pre(); requestAnimationFrame(function () { requestAnimationFrame(final); }); }; }
  }

  /* ── 4. donut — composition, with two-way legend sync ───────────────────── */

  function donut(node, data) {
    var slices = (data.slices || []).filter(function (s) { return s.value > 0; });
    if (!slices.length) { node.innerHTML = ''; node._play = function () {}; return; }
    var total = slices.reduce(function (a, s) { return a + s.value; }, 0);
    var S = 360, R = 132, SW = 30, C = 2 * Math.PI * R;

    node.innerHTML = '';
    var wrap = htmlEl('div', 'donut-wrap', node);
    var svg = svgEl('svg', { viewBox: '0 0 ' + S + ' ' + S, class: 'ch ch-donut' }, wrap);
    var legend = htmlEl('ul', 'donut-legend', wrap);

    var c1 = token(node, '--tone-chart-1', '#556eff');
    var c2 = token(node, '--tone-chart-2', '#a9b8ff');
    var accent = token(node, '--tone-accent', '#556eff');
    var palette = data.colors || [c1, accent, c2, mix(c1, c2, 0.35), mix(c1, c2, 0.7), token(node, '--tone-text-muted', '#9aa1b3')];

    svgEl('circle', { cx: S / 2, cy: S / 2, r: R, fill: 'none', stroke: token(node, '--tone-panel', '#eef0f7'), 'stroke-width': SW }, svg);

    var centerA = svgEl('text', { x: S / 2, y: S / 2 - 4, 'text-anchor': 'middle', 'font-size': 34, 'font-weight': 800, fill: token(node, '--tone-text', '#111'), 'font-variant-numeric': 'tabular-nums' }, svg);
    var centerB = svgEl('text', { x: S / 2, y: S / 2 + 26, 'text-anchor': 'middle', 'font-size': 17, fill: token(node, '--tone-text-muted', '#6b7280') }, svg);
    centerA.textContent = data.centerValue || money(total);
    centerB.textContent = data.centerLabel || '';

    var acc = 0, arcs = [];
    slices.forEach(function (s, i) {
      var frac = s.value / total, len = C * frac;
      var col = s.color || palette[i % palette.length];
      var arc = svgEl('circle', {
        cx: S / 2, cy: S / 2, r: R, fill: 'none', stroke: col, 'stroke-width': SW,
        'stroke-dasharray': Math.max(0, len - 3) + ' ' + C,
        transform: 'rotate(' + (acc * 360 - 90) + ' ' + S / 2 + ' ' + S / 2 + ')'
      }, svg);
      arc.style.cursor = 'pointer';
      arcs.push({ el: arc, len: len });
      acc += frac;

      var li = htmlEl('li', 'donut-item', legend);
      li.innerHTML = '<i style="background:' + col + '"></i><span class="dl-label">' + s.label + '</span>' +
        '<span class="dl-val">' + (frac * 100).toFixed(1) + '%</span>';
      function on() {
        arc.setAttribute('stroke-width', SW + 8); li.classList.add('is-on');
        centerA.textContent = (frac * 100).toFixed(1) + '%';
        centerB.textContent = s.label + ' · ' + money(s.value);
      }
      function off() {
        arc.setAttribute('stroke-width', SW); li.classList.remove('is-on');
        centerA.textContent = data.centerValue || money(total);
        centerB.textContent = data.centerLabel || '';
      }
      li.addEventListener('pointerenter', on); li.addEventListener('pointerleave', off);
      arc.addEventListener('pointerenter', on); arc.addEventListener('pointerleave', off);
    });

    function pre() { arcs.forEach(function (a) { a.el.style.transition = 'none'; a.el.style.strokeDashoffset = a.len; }); }
    function final() { arcs.forEach(function (a, i) { a.el.style.transition = 'stroke-dashoffset 700ms ' + EASE + ' ' + (i * 90) + 'ms'; a.el.style.strokeDashoffset = 0; }); }
    if (REDUCED) { arcs.forEach(function (a) { a.el.style.strokeDashoffset = 0; }); node._play = function () {}; }
    else { pre(); node._play = function () { pre(); requestAnimationFrame(function () { requestAnimationFrame(final); }); }; }
  }

  // Relative luminance → pick a legible text color for a filled segment.
  // Without this, a light palette entry gets white labels and fails AA.
  function textOn(bg) {
    try {
      var h = bg.replace('#', '');
      if (h.length === 3) h = h.replace(/./g, '$&$&');
      var r = parseInt(h.substr(0, 2), 16) / 255, g = parseInt(h.substr(2, 2), 16) / 255, b = parseInt(h.substr(4, 2), 16) / 255;
      var f = function (c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
      return (0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)) > 0.42 ? '#101218' : '#ffffff';
    } catch (e) { return '#ffffff'; }
  }

  function mix(a, b, t) {
    function p(h) { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
    try {
      var x = p(a), y = p(b);
      return '#' + x.map(function (v, i) { return Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0'); }).join('');
    } catch (e) { return a; }
  }

  /* ── 5. gauge — a single risk metric with reference bands ───────────────── */

  function gauge(node, data) {
    var W = 300, H = 200, cx = W / 2, cy = 150, R = 108, SW = 18;
    var min = data.min != null ? data.min : 0, max = data.max != null ? data.max : 3;
    var v = Math.max(min, Math.min(max, data.value));
    var frac = (v - min) / (max - min);
    var SPAN = 240, START = 180 + (180 - SPAN) / 2; // sweep 240° centred at the top

    node.innerHTML = '';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'ch ch-gauge' }, node);
    svg.style.width = '100%'; svg.style.overflow = 'visible';
    var muted = token(node, '--tone-text-muted', '#6b7280');
    var accent = token(node, '--tone-accent', '#556eff');

    function arcPath(a0, a1) {
      var r0 = (a0 * Math.PI) / 180, r1 = (a1 * Math.PI) / 180;
      var x0 = cx + R * Math.cos(r0), y0 = cy + R * Math.sin(r0);
      var x1 = cx + R * Math.cos(r1), y1 = cy + R * Math.sin(r1);
      return 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' A' + R + ' ' + R + ' 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1);
    }

    (data.bands || []).forEach(function (b) {
      var f0 = ((b.from != null ? b.from : min) - min) / (max - min);
      var f1 = ((b.to != null ? b.to : max) - min) / (max - min);
      svgEl('path', { d: arcPath(START + SPAN * f0, START + SPAN * f1), fill: 'none', stroke: b.color, 'stroke-opacity': 0.22, 'stroke-width': SW, 'stroke-linecap': 'butt' }, svg);
    });
    svgEl('path', { d: arcPath(START, START + SPAN), fill: 'none', stroke: muted, 'stroke-opacity': 0.14, 'stroke-width': SW, 'stroke-linecap': 'round' }, svg);

    var prog = svgEl('path', { d: arcPath(START, START + SPAN), fill: 'none', stroke: data.color || accent, 'stroke-width': SW, 'stroke-linecap': 'round' }, svg);
    var L = prog.getTotalLength ? prog.getTotalLength() : 0;
    prog.style.strokeDasharray = L + ' ' + L;

    var val = svgEl('text', { x: cx, y: cy - 18, 'text-anchor': 'middle', 'font-size': 46, 'font-weight': 800, fill: token(node, '--tone-text', '#111'), 'font-variant-numeric': 'tabular-nums' }, svg);
    val.textContent = data.display || (+data.value).toFixed(2);
    svgEl('text', { x: cx, y: cy + 10, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 700, fill: data.color || accent }, svg).textContent = data.verdict || '';
    svgEl('text', { x: cx, y: cy + 38, 'text-anchor': 'middle', 'font-size': 16, fill: muted }, svg).textContent = data.label || '';

    function pre() { prog.style.transition = 'none'; prog.style.strokeDashoffset = L; val.style.transition = 'none'; val.style.opacity = 0.001; }
    function final() {
      prog.style.transition = 'stroke-dashoffset 850ms ' + EASE;
      prog.style.strokeDashoffset = L * (1 - frac);
      val.style.transition = 'opacity 400ms ease 200ms'; val.style.opacity = 1;
    }
    if (REDUCED) { prog.style.strokeDashoffset = L * (1 - frac); node._play = function () {}; }
    else { pre(); node._play = function () { pre(); requestAnimationFrame(function () { requestAnimationFrame(final); }); }; }
  }

  /* ── 6. sparkline — KPI tiles and mover cards ───────────────────────────── */

  function sparkline(node, data) {
    var vals = (data.values || []).filter(isFinite);
    if (vals.length < 2) { node.innerHTML = ''; node._play = function () {}; return; }
    var W = 160, H = 44, e = extent(vals);
    var X = function (i) { return (W * i) / (vals.length - 1); };
    var Y = function (v) { return H - 4 - ((v - e[0]) / (e[1] - e[0])) * (H - 8); };
    var col = data.color || token(node, data.positive === false ? '--tone-down' : '--tone-up', data.positive === false ? '#c0392b' : '#1a7f4b');

    node.innerHTML = '';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'ch ch-spark', preserveAspectRatio: 'none' }, node);
    svg.style.width = '100%'; svg.style.height = '100%'; svg.style.overflow = 'visible';
    var d = vals.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' ');
    var p = svgEl('path', { d: d, fill: 'none', stroke: col, 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, svg);
    var dot = svgEl('circle', { cx: X(vals.length - 1), cy: Y(vals[vals.length - 1]), r: 3.2, fill: col, opacity: 0 }, svg);
    var L = p.getTotalLength ? p.getTotalLength() : 0;

    function pre() { p.style.transition = 'none'; p.style.strokeDasharray = L + ' ' + L; p.style.strokeDashoffset = L; dot.style.transition = 'none'; dot.style.opacity = 0; }
    function final() { p.style.transition = 'stroke-dashoffset 800ms ' + EASE; p.style.strokeDashoffset = 0; dot.style.transition = 'opacity 300ms ease 700ms'; dot.style.opacity = 1; }
    if (REDUCED) { dot.style.opacity = 1; node._play = function () {}; }
    else { pre(); node._play = function () { pre(); requestAnimationFrame(function () { requestAnimationFrame(final); }); }; }
  }

  /* ── 7. underwater — drawdown, deepest point annotated ──────────────────── */

  function underwater(node, data) {
    var s = (data.series || []).filter(function (d) { return isFinite(d.dd); });
    if (s.length < 2) { node.innerHTML = ''; node._play = function () {}; return; }
    // El viewBox se ajusta al ratio real del contenedor: con un alto fijo el SVG
    // se centra con franjas vacías a los lados (preserveAspectRatio "meet"),
    // y usar "none" deformaría las etiquetas de texto.
    var W = 1000, PT = 20, PB = 42, PL = 8, PR = 70;
    var box = node.getBoundingClientRect();
    var H = (box.width > 10 && box.height > 10) ? Math.round(W * box.height / box.width) : 330;
    H = Math.max(180, Math.min(420, H));
    var minDd = Math.min.apply(null, s.map(function (d) { return d.dd; }));
    var lo = Math.min(-0.5, minDd * 1.15), iw = W - PL - PR, ih = H - PT - PB;
    var X = function (i) { return PL + (iw * i) / (s.length - 1); };
    var Y = function (v) { return PT + (v / lo) * ih; };

    node.innerHTML = '';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'ch ch-uw' }, node);
    svg.style.width = '100%'; svg.style.height = '100%'; svg.style.overflow = 'visible';
    var dn = token(node, '--tone-down', '#c0392b');
    var muted = token(node, '--tone-text-muted', '#6b7280');
    var id = 'uw' + (++uid);
    var g = svgEl('linearGradient', { id: id, x1: 0, y1: 0, x2: 0, y2: 1 }, svgEl('defs', {}, svg));
    svgEl('stop', { offset: '0%', 'stop-color': dn, 'stop-opacity': 0.05 }, g);
    svgEl('stop', { offset: '100%', 'stop-color': dn, 'stop-opacity': 0.42 }, g);

    [0, lo / 2, lo].forEach(function (v) {
      var y = Y(v);
      svgEl('line', { x1: PL, y1: y, x2: PL + iw, y2: y, stroke: muted, 'stroke-opacity': 0.16, 'stroke-dasharray': '2 6' }, svg);
      svgEl('text', { x: PL + iw + 10, y: y + 5, fill: muted, 'font-size': 16, 'font-variant-numeric': 'tabular-nums' }, svg).textContent = v.toFixed(1) + '%';
    });

    var d = s.map(function (p, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.dd).toFixed(1); }).join(' ');
    var fill = svgEl('path', { d: d + ' L' + X(s.length - 1) + ' ' + Y(0) + ' L' + X(0) + ' ' + Y(0) + ' Z', fill: 'url(#' + id + ')', opacity: 0 }, svg);
    var line = svgEl('path', { d: d, fill: 'none', stroke: dn, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, svg);

    var mi = s.reduce(function (best, p, i) { return p.dd < s[best].dd ? i : best; }, 0);
    var ann = svgEl('g', { opacity: 0 }, svg);
    svgEl('line', { x1: X(mi), y1: Y(s[mi].dd), x2: X(mi), y2: Y(s[mi].dd) - 12, stroke: dn, 'stroke-width': 1.2, 'stroke-dasharray': '3 3' }, ann);
    svgEl('circle', { cx: X(mi), cy: Y(s[mi].dd), r: 5, fill: dn }, ann);
    var tx = svgEl('text', { x: X(mi), y: Y(s[mi].dd) - 16, 'text-anchor': X(mi) > W * 0.7 ? 'end' : 'middle', fill: dn, 'font-size': 18, 'font-weight': 700, 'font-variant-numeric': 'tabular-nums' }, ann);
    tx.textContent = s[mi].dd.toFixed(1) + '%  ·  ' + (s[mi].date || '');

    var step = Math.max(1, Math.floor((s.length - 1) / 4));
    for (var i = 0; i < s.length; i += step) {
      svgEl('text', { x: X(i), y: H - 12, fill: muted, 'font-size': 16, 'text-anchor': i === 0 ? 'start' : 'middle' }, svg).textContent = s[i].date || '';
    }

    var L = line.getTotalLength ? line.getTotalLength() : 0;
    function pre() { line.style.transition = 'none'; line.style.strokeDasharray = L + ' ' + L; line.style.strokeDashoffset = L; fill.style.transition = 'none'; fill.style.opacity = 0; ann.style.transition = 'none'; ann.style.opacity = 0; }
    function final() {
      line.style.transition = 'stroke-dashoffset 900ms ' + EASE; line.style.strokeDashoffset = 0;
      fill.style.transition = 'opacity 600ms ease 300ms'; fill.style.opacity = 1;
      ann.style.transition = 'opacity 400ms ease 800ms'; ann.style.opacity = 1;
    }
    if (REDUCED) { final(); node._play = function () {}; }
    else { pre(); node._play = function () { pre(); requestAnimationFrame(function () { requestAnimationFrame(final); }); }; }
  }

  /* ── 8. stacked — FX / sector exposure as one bar ───────────────────────── */

  function stacked(node, data) {
    var segs = (data.segments || []).filter(function (s) { return s.value > 0; });
    if (!segs.length) { node.innerHTML = ''; node._play = function () {}; return; }
    var total = segs.reduce(function (a, s) { return a + s.value; }, 0);
    var W = 1000, H = 96;

    node.innerHTML = '';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'ch ch-stack' }, node);
    svg.style.width = '100%'; svg.style.overflow = 'visible';
    var c1 = token(node, '--tone-chart-1', '#556eff');
    var c2 = token(node, '--tone-chart-2', '#a9b8ff');
    var accent = token(node, '--tone-accent', '#556eff');
    var palette = data.colors || [c1, accent, c2, mix(c1, c2, 0.5), token(node, '--tone-text-muted', '#9aa1b3')];
    var x = 0, rects = [];

    segs.forEach(function (s, i) {
      var w = (s.value / total) * W, frac = s.value / total;
      var col = s.color || palette[i % palette.length];
      var g = svgEl('g', {}, svg);
      var r = svgEl('rect', { x: x, y: 0, width: Math.max(2, w - 3), height: 46, rx: 6, fill: col }, g);
      r.style.transformBox = 'view-box'; r.style.transformOrigin = x + 'px 0';
      rects.push(r);
      if (frac >= 0.12) {
        svgEl('text', { x: x + 14, y: 30, fill: textOn(col), 'font-size': 18, 'font-weight': 700 }, g).textContent = s.label;
        svgEl('text', { x: x + 14, y: 74, fill: token(node, '--tone-text-muted', '#6b7280'), 'font-size': 17, 'font-weight': 700, 'font-variant-numeric': 'tabular-nums' }, g)
          .textContent = (frac * 100).toFixed(1) + '%';
      }
      g.style.cursor = 'pointer';
      g.addEventListener('pointerenter', function (ev) { r.style.filter = 'brightness(1.12)'; showTip('<b>' + s.label + '</b><span>' + (frac * 100).toFixed(1) + '%</span><i>' + money(s.value) + '</i>', ev.clientX, ev.clientY); });
      g.addEventListener('pointerleave', function () { r.style.filter = ''; hideTip(); });
      x += w;
    });

    function pre() { rects.forEach(function (r) { r.style.transition = 'none'; r.style.transform = 'scaleX(0)'; }); }
    function final() { rects.forEach(function (r, i) { r.style.transition = 'transform 560ms ' + EASE + ' ' + (i * 80) + 'ms'; r.style.transform = 'scaleX(1)'; }); }
    if (REDUCED) { node._play = function () {}; }
    else { pre(); node._play = function () { pre(); requestAnimationFrame(function () { requestAnimationFrame(final); }); }; }
  }

  /* ── registry ───────────────────────────────────────────────────────────── */

  var registry = { area: area, waterfall: waterfall, diverging: diverging, donut: donut, gauge: gauge, sparkline: sparkline, underwater: underwater, stacked: stacked };

  global.BPDeckCharts = {
    configure: function (o) { Object.assign(cfg, o || {}); },
    mount: function (node, type, data, opts) {
      var fn = registry[type];
      if (!fn) throw new Error('BPDeckCharts: unknown chart "' + type + '"');
      try { fn(node, data || {}, opts || {}); }
      catch (err) { console.error('[deck-charts] ' + type, err); node.innerHTML = ''; node._play = function () {}; }
      return node;
    },
    play: function (root) {
      (root || document).querySelectorAll('[data-chart]').forEach(function (n) { if (n._play) n._play(); });
    },
    fmt: { money: money, pct: pct, pp: pp },
    reduced: REDUCED
  };
})(window);
