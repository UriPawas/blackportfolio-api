/*!
 * pdf-charts.js — static print SVG charts for the portfolio report PDF.
 *
 * Print-native, NOT the deck renderers rotated: every chart is authored 1:1 at
 * the pixel width of the slot it occupies on the page, so an 8.5px axis label
 * is 8.5px on paper. (Squeezing a 1000px-wide deck chart into a 339px column
 * renders its 16px labels at 5.4px — the illegible-chart failure, transplanted.)
 *
 * No animation, no tooltips, no <canvas>, no library defaults. Every renderer
 * sets an explicit height so BPPdfPaginate can measure the block before layout.
 * All colors come from tone tokens read off the node; never a literal hex here.
 *
 * See references/pdf-document.md §8 Charts in print.
 *
 *   BPPdfCharts.configure({ locale:'es-MX', currency:'USD' });
 *   BPPdfCharts.mount(node, 'equity', data, { width:698 });
 *
 * Slots: full 698 · half 339 · third 219 · inline 96–140.
 */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var cfg = { locale: 'es-MX', currency: 'USD' };

  /* ── helpers ────────────────────────────────────────────────────────────── */

  function tok(node, name, fb) {
    var v = getComputedStyle(node).getPropertyValue(name);
    return (v && v.trim()) || fb;
  }
  function svgEl(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag), k;
    for (k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function text(parent, x, y, str, o) {
    o = o || {};
    var t = svgEl('text', {
      x: x, y: y, fill: o.fill, 'text-anchor': o.anchor || 'start',
      'font-size': o.size || 8.5, 'font-weight': o.weight || 600,
      'font-family': o.family || 'inherit', opacity: o.opacity,
      'letter-spacing': o.tracking, 'dominant-baseline': o.baseline
    }, parent);
    t.style.fontVariantNumeric = 'tabular-nums';
    t.textContent = str;
    return t;
  }
  function money(v, frac) {
    if (v == null || !isFinite(v)) return '';
    var o = { style: 'currency', currency: cfg.currency, currencyDisplay: 'narrowSymbol',
              minimumFractionDigits: frac || 0, maximumFractionDigits: frac || 0 };
    try { return new Intl.NumberFormat(cfg.locale, o).format(v); }
    catch (e) { delete o.currencyDisplay; return new Intl.NumberFormat(cfg.locale, o).format(v); }
  }
  function pct(v, d) { return v == null || !isFinite(v) ? '' : (v > 0 ? '+' : '') + v.toFixed(d == null ? 1 : d) + '%'; }
  function pp(v, d) { return v == null || !isFinite(v) ? '' : (v > 0 ? '+' : '') + v.toFixed(d == null ? 2 : d) + ' pp'; }
  function fmt(kind, v) { return kind === 'pct' ? pct(v) : kind === 'pp' ? pp(v) : money(v); }
  function extent(arr, get) {
    var lo = Infinity, hi = -Infinity;
    arr.forEach(function (d) { var v = get ? get(d) : d; if (isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; } });
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    if (lo === hi) { lo -= 1; hi += 1; }
    return [lo, hi];
  }
  function shortDate(t) {
    try { return new Date(t + 'T00:00:00').toLocaleDateString(cfg.locale, { month: 'short', year: '2-digit' }); }
    catch (e) { return String(t || ''); }
  }
  function frame(node, w, h) {
    node.innerHTML = '';
    var s = svgEl('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h,
                           role: 'img', style: 'display:block' }, node);
    return s;
  }
  function palette(node) {
    return {
      ink: tok(node, '--pdf-ink', '#171b2a'),
      soft: tok(node, '--pdf-ink-soft', '#4b5163'),
      muted: tok(node, '--pdf-ink-muted', '#646b7c'),
      faint: tok(node, '--pdf-ink-faint', '#98a0b2'),
      rule: tok(node, '--pdf-rule', '#e3e7f2'),
      accent: tok(node, '--pdf-chart-1', tok(node, '--pdf-accent', '#556eff')),
      accent2: tok(node, '--pdf-chart-2', tok(node, '--pdf-accent-2', '#a9b8ff')),
      up: tok(node, '--pdf-up', '#12996b'),
      down: tok(node, '--pdf-down', '#e0483d'),
      paper: tok(node, '--pdf-paper', '#ffffff')
    };
  }
  function gridlines(s, c, x0, x1, y, val, kind) {
    svgEl('line', { x1: x0, x2: x1, y1: y, y2: y, stroke: c.rule, 'stroke-width': 1,
                    'stroke-dasharray': '2 3' }, s);
    text(s, x1 + 4, y + 3, fmt(kind, val), { size: 8, fill: c.faint, weight: 500 });
  }

  /* ── 1. equity — portfolio vs benchmark (full slot) ─────────────────────── */

  function equity(node, data, o) {
    var W = o.width, H = o.height || 232, c = palette(node);
    var PL = 4, PR = 54, PT = 16, PB = 26;
    var ser = (data.series || []).filter(function (d) { return isFinite(d.value); });
    if (ser.length < 2) return void (node.innerHTML = '');
    var bench = (data.bench || []).filter(function (d) { return isFinite(d.value); });
    var extra = (data.extra || []).filter(function (d) { return isFinite(d.value); });
    var kind = data.format || 'pct';
    var all = ser.concat(bench, extra);
    var ex = extent(all, function (d) { return d.value; });
    var pad = (ex[1] - ex[0]) * 0.12;
    var lo = ex[0] - pad, hi = ex[1] + pad;
    var iw = W - PL - PR, ih = H - PT - PB;
    var X = function (i, n) { return PL + iw * (i / (n - 1)); };
    var Y = function (v) { return PT + ih * (1 - (v - lo) / (hi - lo)); };
    var s = frame(node, W, H);

    for (var g = 0; g <= 3; g++) gridlines(s, c, PL, PL + iw, PT + ih * g / 3, hi - (hi - lo) * g / 3, kind);
    if (lo < 0 && hi > 0) svgEl('line', { x1: PL, x2: PL + iw, y1: Y(0), y2: Y(0), stroke: c.rule, 'stroke-width': 1 }, s);

    // max-drawdown band: the one thing this chart must annotate
    if (data.ddFrom != null && data.ddTo != null && data.ddTo > data.ddFrom) {
      var bx = X(data.ddFrom, ser.length), bw = X(data.ddTo, ser.length) - bx;
      svgEl('rect', { x: bx, y: PT, width: Math.max(1, bw), height: ih, fill: c.down, opacity: 0.07 }, s);
      text(s, bx + bw / 2, PT + 9, data.ddLabel || '', { size: 7.5, fill: c.down, anchor: 'middle', weight: 700 });
    }

    function line(pts, stroke, width, dash, op) {
      var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(i, pts.length).toFixed(1) + ' ' + Y(p.value).toFixed(1); }).join(' ');
      svgEl('path', { d: d, fill: 'none', stroke: stroke, 'stroke-width': width,
                      'stroke-dasharray': dash, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: op }, s);
      return d;
    }
    var id = 'eq' + Math.random().toString(36).slice(2, 7);
    var defs = svgEl('defs', {}, s);
    var lg = svgEl('linearGradient', { id: id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    svgEl('stop', { offset: '0%', 'stop-color': c.accent, 'stop-opacity': 0.24 }, lg);
    svgEl('stop', { offset: '100%', 'stop-color': c.accent, 'stop-opacity': 0 }, lg);

    var dPort = ser.map(function (p, i) { return (i ? 'L' : 'M') + X(i, ser.length).toFixed(1) + ' ' + Y(p.value).toFixed(1); }).join(' ');
    svgEl('path', { d: dPort + ' L' + X(ser.length - 1, ser.length) + ' ' + (PT + ih) + ' L' + PL + ' ' + (PT + ih) + ' Z',
                    fill: 'url(#' + id + ')' }, s);
    if (extra.length > 1) line(extra, c.muted, 1, '1 3', 0.75);
    if (bench.length > 1) line(bench, c.accent2, 1.4, '4 3', 1);          // dashed: survives grayscale
    line(ser, c.accent, 2.1, null, 1);

    var lastV = ser[ser.length - 1].value, lx = X(ser.length - 1, ser.length), ly = Y(lastV);
    svgEl('circle', { cx: lx, cy: ly, r: 2.6, fill: c.accent }, s);
    var lbl = fmt(kind, lastV);
    svgEl('rect', { x: lx + 5, y: ly - 8, width: PR - 8, height: 15, rx: 4, fill: c.accent }, s);
    text(s, lx + 5 + (PR - 8) / 2, ly + 2.5, lbl, { size: 8.5, fill: c.paper, anchor: 'middle', weight: 800 });

    text(s, PL, H - 8, shortDate(ser[0].t), { size: 8, fill: c.faint, weight: 500 });
    text(s, PL + iw / 2, H - 8, shortDate(ser[Math.floor(ser.length / 2)].t), { size: 8, fill: c.faint, anchor: 'middle', weight: 500 });
    text(s, PL + iw, H - 8, shortDate(ser[ser.length - 1].t), { size: 8, fill: c.faint, anchor: 'end', weight: 500 });

    var lgd = [{ n: data.seriesLabel || 'Portafolio', col: c.accent, dash: null }];
    if (bench.length > 1) lgd.push({ n: data.benchLabel || 'Benchmark', col: c.accent2, dash: '4 3' });
    if (extra.length > 1) lgd.push({ n: data.extraLabel || 'Capital invertido', col: c.muted, dash: '1 3' });
    var lxp = PL;
    lgd.forEach(function (g2) {
      svgEl('line', { x1: lxp, x2: lxp + 14, y1: 7, y2: 7, stroke: g2.col, 'stroke-width': 2, 'stroke-dasharray': g2.dash }, s);
      var t = text(s, lxp + 18, 10, g2.n, { size: 8, fill: c.muted, weight: 600 });
      lxp += 22 + g2.n.length * 4.4;
      return t;
    });
  }

  /* ── 2. waterfall — money bridge / attribution (full slot) ──────────────── */

  function waterfall(node, data, o) {
    var W = o.width, c = palette(node);
    var items = (data.items || []).filter(function (d) { return isFinite(d.value); });
    if (!items.length) return void (node.innerHTML = '');
    var H = o.height || 220, PT = 20, PB = 34, PL = 2, PR = 2;
    var iw = W - PL - PR, ih = H - PT - PB;

    var run = 0, bars = [], lo = 0, hi = 0;
    items.forEach(function (d) {
      var isTotal = d.type === 'start' || d.type === 'end' || d.type === 'total';
      var from = isTotal ? 0 : run, to = isTotal ? d.value : run + d.value;
      if (!isTotal) run = to; else run = d.value;
      bars.push({ label: d.label, value: d.value, from: from, to: to, total: isTotal, sub: d.sub });
      lo = Math.min(lo, from, to); hi = Math.max(hi, from, to);
    });
    var padv = (hi - lo) * 0.16 || 1;
    lo -= padv * 0.4; hi += padv;
    var Y = function (v) { return PT + ih * (1 - (v - lo) / (hi - lo)); };
    var slot = iw / bars.length, bw = Math.min(52, slot * 0.62);
    var s = frame(node, W, H);
    svgEl('line', { x1: PL, x2: PL + iw, y1: Y(0), y2: Y(0), stroke: c.rule, 'stroke-width': 1 }, s);

    bars.forEach(function (b, i) {
      var cx = PL + slot * i + slot / 2;
      var y0 = Y(b.from), y1 = Y(b.to);
      var top = Math.min(y0, y1), h = Math.max(2, Math.abs(y1 - y0));
      var col = b.total ? c.accent : (b.value >= 0 ? c.up : c.down);
      svgEl('rect', { x: cx - bw / 2, y: top, width: bw, height: h, rx: 2, fill: col,
                      opacity: b.total ? 1 : 0.9 }, s);
      if (i < bars.length - 1 && !bars[i + 1].total) {
        svgEl('line', { x1: cx + bw / 2, x2: cx + slot - bw / 2, y1: y1, y2: y1,
                        stroke: c.faint, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, s);
      }
      text(s, cx, top - 5, fmt(data.format || 'money', b.value), {
        size: 8.2, anchor: 'middle', weight: 800, fill: b.total ? c.ink : col });
      text(s, cx, H - 20, b.label, { size: 8.2, anchor: 'middle', weight: 700, fill: c.soft });
      if (b.sub) text(s, cx, H - 9, b.sub, { size: 7.5, anchor: 'middle', weight: 500, fill: c.faint });
    });
  }

  /* ── 3. diverging — winners / losers (half slot) ────────────────────────── */

  function diverging(node, data, o) {
    var W = o.width, c = palette(node);
    var items = (data.items || []).filter(function (d) { return isFinite(d.value); });
    if (!items.length) return void (node.innerHTML = '');
    var rowH = o.rowHeight || 19, PT = 6, PB = 6;
    var H = PT + PB + items.length * rowH;
    var labelW = o.labelWidth || 56, valW = 62;
    var axis = labelW + (W - labelW - valW) / 2;
    var half = (W - labelW - valW) / 2 - 4;
    var max = Math.max.apply(null, items.map(function (d) { return Math.abs(d.value); })) || 1;
    var s = frame(node, W, H);
    svgEl('line', { x1: axis, x2: axis, y1: PT, y2: H - PB, stroke: c.rule, 'stroke-width': 1 }, s);

    items.forEach(function (d, i) {
      var y = PT + i * rowH, cy = y + rowH / 2;
      var w = Math.max(1.5, Math.abs(d.value) / max * half);
      var pos = d.value >= 0;
      svgEl('rect', { x: pos ? axis : axis - w, y: cy - 5.5, width: w, height: 11, rx: 1.5,
                      fill: pos ? c.up : c.down, opacity: 0.92 }, s);
      text(s, labelW - 6, cy + 3, d.label, { size: 8.6, anchor: 'end', weight: 700, fill: c.ink });
      text(s, W - 2, cy + 3, fmt(data.format || 'pp', d.value), {
        size: 8.4, anchor: 'end', weight: 800, fill: pos ? c.up : c.down });
    });
  }

  /* ── 4. donut — composition (half / third slot) ─────────────────────────── */

  function donut(node, data, o) {
    var W = o.width, c = palette(node);
    var slices = (data.slices || []).filter(function (d) { return d.value > 0; });
    if (!slices.length) return void (node.innerHTML = '');
    var legend = o.legend !== false && W >= 300;
    var size = legend ? Math.min(150, W * 0.45) : W;
    var H = o.height || (legend ? Math.max(size, 18 + slices.length * 15) : size + 6);
    var s = frame(node, W, H);
    var R = size / 2 - 4, cx = R + 4, cy = H / 2, sw = 20;
    var total = slices.reduce(function (a, d) { return a + d.value; }, 0);
    var cols = shades(c, slices.length);
    var ang = -Math.PI / 2;

    slices.forEach(function (d, i) {
      var frac = d.value / total, a2 = ang + frac * Math.PI * 2;
      var large = frac > 0.5 ? 1 : 0, r = R - sw / 2;
      var gap = 0.012;
      var x1 = cx + r * Math.cos(ang + gap), y1 = cy + r * Math.sin(ang + gap);
      var x2 = cx + r * Math.cos(a2 - gap), y2 = cy + r * Math.sin(a2 - gap);
      svgEl('path', { d: 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1),
                      fill: 'none', stroke: cols[i], 'stroke-width': sw }, s);
      ang = a2;
    });
    if (data.centerValue) {
      text(s, cx, cy - 1, data.centerValue, { size: 13, anchor: 'middle', weight: 800, fill: c.ink });
      text(s, cx, cy + 11, data.centerLabel || '', { size: 7.5, anchor: 'middle', weight: 700, fill: c.faint });
    }
    if (legend) {
      var lx = size + 14, ly = (H - slices.length * 15) / 2 + 10;
      slices.forEach(function (d, i) {
        svgEl('rect', { x: lx, y: ly + i * 15 - 6, width: 7, height: 7, rx: 1.5, fill: cols[i] }, s);
        text(s, lx + 12, ly + i * 15, d.label, { size: 8.4, weight: 600, fill: c.soft });
        text(s, W - 2, ly + i * 15, (d.value / total * 100).toFixed(1) + '%', {
          size: 8.4, anchor: 'end', weight: 800, fill: c.ink });
      });
    }
  }
  function shades(c, n) {
    var out = [], base = [c.accent, c.accent2, c.up, c.muted, c.down, c.faint];
    for (var i = 0; i < n; i++) out.push(base[i % base.length]);
    return out;
  }

  /* ── 5. bars — sector / region / FX (third or half slot) ────────────────── */

  function bars(node, data, o) {
    var W = o.width, c = palette(node);
    var items = (data.items || []).filter(function (d) { return isFinite(d.value); }).slice(0, o.max || 7);
    if (!items.length) return void (node.innerHTML = '');
    var rowH = o.rowHeight || 21, H = 4 + items.length * rowH;
    var max = Math.max.apply(null, items.map(function (d) { return d.value; })) || 1;
    var s = frame(node, W, H);
    items.forEach(function (d, i) {
      var y = 4 + i * rowH;
      text(s, 0, y + 7, d.label, { size: 8.4, weight: 700, fill: c.ink });
      text(s, W, y + 7, data.format === 'pct' ? d.value.toFixed(1) + '%' : money(d.value), {
        size: 8.4, anchor: 'end', weight: 700, fill: c.muted });
      svgEl('rect', { x: 0, y: y + 11, width: W, height: 5, rx: 2.5, fill: c.rule, opacity: 0.75 }, s);
      svgEl('rect', { x: 0, y: y + 11, width: Math.max(2, W * d.value / max), height: 5, rx: 2.5,
                      fill: i === 0 ? c.accent : c.accent2 }, s);
    });
  }

  /* ── 6. underwater — drawdown (full slot) ───────────────────────────────── */

  function underwater(node, data, o) {
    var W = o.width, H = o.height || 148, c = palette(node);
    var ser = (data.series || []).filter(function (d) { return isFinite(d.value); });
    if (ser.length < 2) return void (node.innerHTML = '');
    var PT = 10, PB = 24, PL = 2, PR = 44;
    var iw = W - PL - PR, ih = H - PT - PB;
    var min = Math.min.apply(null, ser.map(function (d) { return d.value; }));
    var lo = Math.min(-0.5, min * 1.15);
    var X = function (i) { return PL + iw * (i / (ser.length - 1)); };
    var Y = function (v) { return PT + ih * (v / lo); };
    var s = frame(node, W, H);
    for (var g = 1; g <= 3; g++) gridlines(s, c, PL, PL + iw, PT + ih * g / 3, lo * g / 3, 'pct');
    svgEl('line', { x1: PL, x2: PL + iw, y1: PT, y2: PT, stroke: c.rule, 'stroke-width': 1 }, s);

    var d = ser.map(function (p, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.value).toFixed(1); }).join(' ');
    svgEl('path', { d: d + ' L' + X(ser.length - 1) + ' ' + PT + ' L' + PL + ' ' + PT + ' Z', fill: c.down, opacity: 0.16 }, s);
    svgEl('path', { d: d, fill: 'none', stroke: c.down, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, s);

    var ti = 0;
    ser.forEach(function (p, i) { if (p.value < ser[ti].value) ti = i; });
    var tx = X(ti), ty = Y(ser[ti].value);
    svgEl('circle', { cx: tx, cy: ty, r: 2.4, fill: c.down }, s);
    var side = tx > W / 2 ? -1 : 1;
    svgEl('line', { x1: tx, x2: tx + 20 * side, y1: ty, y2: ty + 12, stroke: c.down, 'stroke-width': 0.8 }, s);
    text(s, tx + 24 * side, ty + 15, pct(ser[ti].value) + ' · ' + shortDate(ser[ti].t), {
      size: 8, weight: 700, fill: c.down, anchor: side > 0 ? 'start' : 'end' });
    text(s, PL, H - 7, shortDate(ser[0].t), { size: 8, fill: c.faint, weight: 500 });
    text(s, PL + iw, H - 7, shortDate(ser[ser.length - 1].t), { size: 8, fill: c.faint, anchor: 'end', weight: 500 });
  }

  /* ── 7. sparkline — dossier cards, KPI tiles (inline slot) ──────────────── */

  function sparkline(node, data, o) {
    var W = o.width || 120, H = o.height || 30, c = palette(node);
    var v = (data.values || []).filter(isFinite);
    if (v.length < 2) return void (node.innerHTML = '');
    var ex = extent(v), up = v[v.length - 1] >= v[0];
    var col = up ? c.up : c.down;
    var X = function (i) { return 1 + (W - 2) * i / (v.length - 1); };
    var Y = function (x) { return 2 + (H - 4) * (1 - (x - ex[0]) / (ex[1] - ex[0])); };
    var s = frame(node, W, H);
    var d = v.map(function (x, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(x).toFixed(1); }).join(' ');
    svgEl('path', { d: d + ' L' + X(v.length - 1) + ' ' + H + ' L1 ' + H + ' Z', fill: col, opacity: 0.1 }, s);
    svgEl('path', { d: d, fill: 'none', stroke: col, 'stroke-width': 1.3, 'stroke-linejoin': 'round' }, s);
    svgEl('circle', { cx: X(v.length - 1), cy: Y(v[v.length - 1]), r: 1.8, fill: col }, s);
  }

  /* ── 8. monthly — the chronicle's column chart (full slot) ──────────────── */

  function monthly(node, data, o) {
    var W = o.width, H = o.height || 132, c = palette(node);
    var items = (data.items || []).filter(function (d) { return isFinite(d.value); });
    if (!items.length) return void (node.innerHTML = '');
    var PT = 14, PB = 22;
    var ih = H - PT - PB;
    var ex = extent(items, function (d) { return d.value; });
    var hi = Math.max(0.5, ex[1]) * 1.25, lo = Math.min(-0.5, ex[0]) * 1.25;
    var Y = function (v) { return PT + ih * (1 - (v - lo) / (hi - lo)); };
    var slot = W / items.length, bw = Math.min(30, slot * 0.56);
    var s = frame(node, W, H);
    var zero = Y(0);
    svgEl('line', { x1: 0, x2: W, y1: zero, y2: zero, stroke: c.rule, 'stroke-width': 1 }, s);
    items.forEach(function (d, i) {
      var cx = slot * i + slot / 2, y = Y(d.value);
      var pos = d.value >= 0;
      svgEl('rect', { x: cx - bw / 2, y: Math.min(y, zero), width: bw, height: Math.max(1.5, Math.abs(zero - y)),
                      rx: 1.5, fill: pos ? c.up : c.down, opacity: 0.9 }, s);
      text(s, cx, pos ? Math.min(y, zero) - 4 : Math.max(y, zero) + 9, pct(d.value), {
        size: 7.6, anchor: 'middle', weight: 800, fill: pos ? c.up : c.down });
      text(s, cx, H - 7, d.label, { size: 7.8, anchor: 'middle', weight: 600, fill: c.muted });
    });
  }

  /* ── registry ───────────────────────────────────────────────────────────── */

  var registry = { equity: equity, waterfall: waterfall, diverging: diverging, donut: donut,
                   bars: bars, underwater: underwater, sparkline: sparkline, monthly: monthly };

  global.BPPdfCharts = {
    configure: function (o) { Object.assign(cfg, o || {}); },
    mount: function (node, type, data, opts) {
      var fn = registry[type];
      if (!fn) throw new Error('BPPdfCharts: unknown chart "' + type + '"');
      opts = opts || {};
      if (!opts.width) opts.width = Math.round(node.getBoundingClientRect().width) || 698;
      try { fn(node, data || {}, opts); }
      catch (err) { console.error('[pdf-charts] ' + type, err); node.innerHTML = ''; }
      return node;
    },
    // Renders every [data-pdf-chart] node from a data map. Charts must exist in
    // the DOM before pagination measures the page.
    mountAll: function (root, dataMap, opts) {
      var self = this;
      (root || document).querySelectorAll('[data-pdf-chart]').forEach(function (n) {
        var key = n.getAttribute('data-chart-key') || n.getAttribute('data-pdf-chart');
        var d = dataMap[key];
        if (d) self.mount(n, n.getAttribute('data-pdf-chart'), d, Object.assign({}, opts));
      });
    },
    fmt: { money: money, pct: pct, pp: pp }
  };
})(window);
