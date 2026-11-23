/* Campo · Inicio · widgets w2: macro, note.
   Contrato: docs/rediseno-gbm-2026-11/14-spec-inicio.md. Datos reales de D / CAMPO_REAL. */
(function () {
  'use strict';
  var D = window.PORTIFY_DEMO || { positions: [], markets: [], fmt: {} };
  var doc = document, root = doc.documentElement;

  function h(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function fmtPct(v, d) { return D.fmt && D.fmt.pct ? D.fmt.pct(v, d) : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d == null ? 2 : d) + ' %'; }
  function fmtNum(v, d) { return D.fmt && D.fmt.num ? D.fmt.num(v, d) : v.toFixed(d == null ? 2 : d); }
  function sgn(v) { return v > 0 ? 'w2-up' : v < 0 ? 'w2-dn' : ''; }
  function rmq() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function posOf(t) { for (var i = 0; i < (D.positions || []).length; i++) if (D.positions[i].ticker === t) return D.positions[i]; return null; }
  function mark(sym, size) { return window.CampoMarks ? window.CampoMarks.el(sym, size) : h('span', 'w2-mk', (sym || '?').charAt(0)); }
  function tween(ms, step, done) {
    var t0 = performance.now(), fin = false, raf = 0, tm = 0;
    function end() { if (fin) return; fin = true; cancelAnimationFrame(raf); clearTimeout(tm); step(1); done && done(); }
    function tick(now) { if (fin) return; var p = clamp((now - t0) / ms, 0, 1); step(p); if (p >= 1) end(); else raf = requestAnimationFrame(tick); }
    raf = requestAnimationFrame(tick); tm = setTimeout(end, ms + 80);
    return { cancel: function () { fin = true; cancelAnimationFrame(raf); clearTimeout(tm); } };
  }
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  function seg(items, value, onChange, label) {
    var s = h('div', 'seg w2-seg'); s.setAttribute('role', 'group'); if (label) s.setAttribute('aria-label', label);
    var pill = h('span', 'seg-pill'); s.appendChild(pill); s.style.setProperty('--n', items.length);
    var btns = items.map(function (it, i) {
      var b = h('button', null, it.label); b.type = 'button'; b.dataset.v = it.value;
      b.addEventListener('click', function () { set(it.value, true); });
      s.appendChild(b); return b;
    });
    function set(v, fire) {
      var i = 0; items.forEach(function (it, k) { if (it.value === v) i = k; });
      s.style.setProperty('--i', i);
      btns.forEach(function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      if (fire && onChange) onChange(items[i].value);
    }
    set(value, false);
    return { el: s, set: function (v) { set(v, false); } };
  }
  function thumbSvg(el, inner) { el.innerHTML = '<svg viewBox="0 0 120 72" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" style="color:var(--text-3)">' + inner + '</svg>'; }

  var defs = [];


  /* ====================================================================== */
  /* 4 · macro                                                              */
  /* ====================================================================== */
  function mk(sym) { var a = D.markets || []; for (var i = 0; i < a.length; i++) if (a[i].sym === sym) return a[i]; return null; }
  function xm(sym) { var a = (window.CAMPO_REAL && window.CAMPO_REAL.extraMarkets) || []; for (var i = 0; i < a.length; i++) if (a[i].sym === sym && !a[i].stale && isFinite(a[i].last)) return a[i]; return null; }
  function sig(list) { return function (v, c) { if (v == null || !isFinite(v)) return ''; for (var i = 0; i < list.length; i++) if (list[i][0](v, c)) return list[i][1]; return list[list.length - 1][1]; }; }
  function ok(m) { return m && isFinite(m.last) ? m : null; }
  function row(id, name, src, dec, unit, rule, tag) {
    var m = ok(src);
    return { id: id, name: name, val: m ? m.last : null, chg: m && isFinite(m.chg) ? m.chg : null, dec: dec, unit: unit, spark: m && m.spark && m.spark.length > 1 ? m.spark : null, rule: rule, tag: tag };
  }
  var MACRO = (function () {
    return [
      row('vix', 'VIX', xm('VIX'), 1, '', 'VIX menor a 15: volatilidad baja · 15 a 25: normal · mayor a 25: tensión', sig([[function (v) { return v < 15; }, 'Volatilidad baja'], [function (v) { return v <= 25; }, 'Normal'], [function () { return true; }, 'Tensión']])),
      row('dxy', 'Índice dólar (DXY)', xm('Índice dólar (DXY)'), 2, '', 'DXY menor a 100: dólar débil · 100 a 105: estable · mayor a 105: dólar fuerte', sig([[function (v) { return v < 100; }, 'Dólar débil'], [function (v) { return v <= 105; }, 'Estable'], [function () { return true; }, 'Dólar fuerte']])),
      row('us10', 'Bono 10a EE. UU.', mk('Bono 10a EE. UU.'), 2, ' %', 'Rendimiento menor a 3.5 %: bajo · 3.5 % a 4.5 %: moderado · mayor a 4.5 %: alto', sig([[function (v) { return v < 3.5; }, 'Rendimiento bajo'], [function (v) { return v <= 4.5; }, 'Moderado'], [function () { return true; }, 'Rendimiento alto']])),
      row('wti', 'Petróleo WTI', xm('Petróleo WTI'), 2, '', 'WTI menor a 60 USD: barato · 60 a 80 USD: rango medio · mayor a 80 USD: caro', sig([[function (v) { return v < 60; }, 'Barato'], [function (v) { return v <= 80; }, 'Rango medio'], [function () { return true; }, 'Caro']])),
      row('gold', 'Oro', mk('Oro'), 1, '', 'Cambio del día de +1 % o más: demanda de refugio · de −1 % o menos: salida de refugio · en medio: sin sobresaltos', sig([[function (v, c) { return c >= 1; }, 'Demanda de refugio'], [function (v, c) { return c <= -1; }, 'Salida de refugio'], [function () { return true; }, 'Sin sobresaltos']])),
      row('fx', 'USD/MXN', mk('USD/MXN'), 2, '', 'USD/MXN menor a 18: peso fuerte · 18 a 20: rango habitual · mayor a 20: peso débil', sig([[function (v) { return v < 18; }, 'Peso fuerte'], [function (v) { return v <= 20; }, 'Rango habitual'], [function () { return true; }, 'Peso débil']]))
    ];
  })();
  function sparkSvg(arr, w, hh, cls) {
    var mn = Math.min.apply(null, arr), mx = Math.max.apply(null, arr), sp = mx - mn || 1, p = [];
    arr.forEach(function (v, i) { p.push((i / (arr.length - 1) * w).toFixed(1) + ',' + (hh - 2 - (v - mn) / sp * (hh - 4)).toFixed(1)); });
    return '<svg class="w2-sp ' + cls + '" viewBox="0 0 ' + w + ' ' + hh + '" width="' + w + '" height="' + hh + '" aria-hidden="true" focusable="false"><polyline points="' + p.join(' ') + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
  }
  function Macro(body, ctx) {
    body.classList.add('w2-macro'); ctx.setMeta('Precios al ' + String(D.asOf || '').split(' ')[0]);
    var grid = h('div', 'w2-mgrid'); body.appendChild(grid);
    var read = h('p', 'w2-read'); body.appendChild(read);
    function paint() {
      var s = ctx.size || 'M', list = s === 'S' ? [MACRO[0], MACRO[5], MACRO[2]] : MACRO;
      grid.textContent = ''; grid.dataset.size = s; body.dataset.msize = s;
      list.forEach(function (m) {
        var t = h('div', 'w2-tile'); t.title = 'Regla: ' + m.rule; t.setAttribute('role', 'group');
        var has = m.val != null, sg = has ? m.tag(m.val, m.chg) : "", cc = has && m.chg != null ? sgn(m.chg) : "";
        t.setAttribute('aria-label', has ? m.name + ' ' + fmtNum(m.val, m.dec) + m.unit + (m.chg != null ? ', ' + fmtPct(m.chg, 2) + ' en el día' : '') + '. ' + sg + '. Regla: ' + m.rule : m.name + ': sin dato por ahora.');
        var a = h('span', 'w2-tn', m.name), v = h('span', 'w2-tv', has ? fmtNum(m.val, m.dec) + m.unit : '–'), d = h('span', 'w2-td ' + cc, has && m.chg != null ? fmtPct(m.chg, 2) : '–');
        var sp = h('span', 'w2-tsp'); if (m.spark) sp.innerHTML = sparkSvg(m.spark, 64, 26, cc || 'w2-flat');
        var g = h('span', 'w2-tg', sg);
        t.appendChild(a); t.appendChild(v); t.appendChild(d); t.appendChild(sp); if (s !== 'S') t.appendChild(g);
        grid.appendChild(t);
      });
      if (s === 'L') {
        var ATT = ['Tensión', 'Dólar fuerte', 'Rendimiento alto', 'Caro', 'Peso débil', 'Demanda de refugio', 'Salida de refugio'];
        var flags = MACRO.filter(function (m) { return m.val != null && ATT.indexOf(m.tag(m.val, m.chg)) >= 0; });
        read.hidden = false;
        read.textContent = 'Lectura: ' + (flags.length ? 'hay ' + (flags.length === 1 ? 'una señal' : flags.length + ' señales') + ' a vigilar (' + flags.map(function (m) { return m.name + ': ' + m.tag(m.val, m.chg).toLowerCase(); }).join('; ') + '), el resto se mantiene en rangos habituales.' : 'ningún indicador está fuera de su rango habitual.') + ' Reglas visibles al pasar el cursor por cada ficha.';
      } else read.hidden = true;
    }
    paint();
    return { update: function () {}, resize: paint, destroy: function () {} };
  }
  defs.push({ type: 'macro', def: {
    label: 'Mapa macro', desc: '¿Cómo está el entorno: volatilidad, dólar, tasas, petróleo, oro y peso?', group: 'Mercado',
    icon: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3.5" width="6" height="5.5" rx="1.5"/><rect x="11" y="3.5" width="6" height="5.5" rx="1.5"/><rect x="3" y="11" width="6" height="5.5" rx="1.5"/><path d="M11.5 15l2-2 1.5 1.2 2-2.5"/></svg>',
    sizes: ['S', 'M', 'L'], size: 'M', defaults: {},
    thumb: function (el) { thumbSvg(el, '<g fill="none" stroke="currentColor" stroke-width="1.5" opacity=".7"><rect x="10" y="8" width="48" height="26" rx="4"/><rect x="62" y="8" width="48" height="26" rx="4"/><rect x="10" y="38" width="48" height="26" rx="4"/><rect x="62" y="38" width="48" height="26" rx="4"/></g><g fill="none" stroke="var(--gain)" stroke-width="1.5"><path d="M16 28l8-6 6 3 10-9"/></g><g fill="none" stroke="var(--loss)" stroke-width="1.5"><path d="M68 16l10 6 8-3 12 8"/></g>'); },
    render: Macro
  } });

  /* ====================================================================== */
  /* 5 · note                                                               */
  /* ====================================================================== */
  function parseN(s) { var n = parseFloat(String(s == null ? '' : s).replace(/,/g, '').replace(/[^\d.\-]/g, '')); return isFinite(n) ? n : NaN; }
  function Note(body, ctx) {
    body.classList.add('w2-nbody');
    var cfg = ctx.config || {}, timer = 0, pending = null, fade = 0;
    var ta = h('textarea', 'w2-ta'); ta.placeholder = 'Escribe aquí…'; ta.setAttribute('aria-label', 'Nota'); ta.spellcheck = true;
    var kpi = h('div', 'w2-kpi');
    var saved = h('span', 'w2-saved', 'Guardado'); saved.setAttribute('role', 'status'); saved.setAttribute('aria-live', 'polite');
    body.appendChild(ta); body.appendChild(kpi); body.appendChild(saved);
    function flush() { clearTimeout(timer); timer = 0; if (pending != null) { var t = pending; pending = null; ctx.save({ text: t }); saved.dataset.on = ''; clearTimeout(fade); fade = setTimeout(function () { delete saved.dataset.on; }, 1400); } }
    ta.addEventListener('input', function () { pending = ta.value; clearTimeout(timer); timer = setTimeout(flush, 400); });
    ta.addEventListener('blur', flush);
    function paint() {
      var kmode = cfg.mode === 'kpi'; ta.hidden = kmode; kpi.hidden = !kmode; saved.hidden = kmode;
      if (!kmode) { if (doc.activeElement !== ta && ta.value !== (cfg.text || '')) ta.value = cfg.text || ''; return; }
      kpi.textContent = '';
      var v = cfg.kpiValue, t = cfg.kpiTarget;
      kpi.appendChild(h('span', 'w2-kv', v ? String(v) : '—'));
      kpi.appendChild(h('span', 'w2-kl', cfg.kpiLabel || 'Define tu indicador en Configurar'));
      var nv = parseN(v), nt = parseN(t);
      if (t && isFinite(nt) && nt !== 0) {
        var pc = isFinite(nv) ? clamp(nv / nt * 100, 0, 100) : 0;
        var pb = h('div', 'w2-prog'); pb.setAttribute('role', 'progressbar'); pb.setAttribute('aria-valuemin', '0'); pb.setAttribute('aria-valuemax', '100'); pb.setAttribute('aria-valuenow', Math.round(pc));
        var fl = h('i'); fl.style.width = pc + '%'; pb.appendChild(fl); kpi.appendChild(pb);
        kpi.appendChild(h('span', 'w2-kt', 'Meta ' + t + (isFinite(nv) ? ' · ' + Math.round(pc) + ' %' : '')));
      }
    }
    paint();
    return {
      update: function (c) { cfg = c || {}; paint(); },
      resize: function () {}, destroy: function () { flush(); clearTimeout(fade); }
    };
  }
  defs.push({ type: 'note', def: {
    label: 'Nota / KPI', desc: 'Una nota rápida o un número que quieres tener a la vista.', group: 'Apuntes',
    icon: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="3.5" width="11" height="13" rx="2"/><path d="M7.5 7.5h5M7.5 10.5h5M7.5 13.5h3"/></svg>',
    sizes: ['S', 'M'], size: 'S', duplicable: true, defaults: { text: '', mode: 'note', kpiValue: '', kpiLabel: '', kpiTarget: '' },
    thumb: function (el) { thumbSvg(el, '<rect x="16" y="8" width="88" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".7"/><g fill="currentColor" opacity=".5"><rect x="26" y="20" width="68" height="4" rx="2"/><rect x="26" y="30" width="56" height="4" rx="2"/><rect x="26" y="40" width="40" height="4" rx="2"/></g><rect x="26" y="52" width="30" height="3" rx="1.5" fill="var(--accent)"/>'); },
    render: Note,
    settings: function (form, cfg, apply) {
      var mode = cfg.mode === 'kpi' ? 'kpi' : 'note';
      var s = seg([{ value: 'note', label: 'Nota' }, { value: 'kpi', label: 'KPI' }], mode, function (v) { mode = v; show(); apply({ mode: v }); }, 'Modo');
      var f0 = h('div', 'w2-fld'); f0.appendChild(h('label', null, 'Modo')); f0.appendChild(s.el); form.appendChild(f0);
      var box = h('div', 'w2-kfields'); form.appendChild(box);
      [['kpiValue', 'Número', 'Ej. 128,400'], ['kpiLabel', 'Etiqueta', 'Ej. Ahorro del año'], ['kpiTarget', 'Meta (opcional)', 'Ej. 200,000']].forEach(function (a) {
        var f = h('div', 'w2-fld'), l = h('label', null, a[1]), i = h('input', 'w2-in'); i.type = 'text'; i.placeholder = a[2]; i.value = cfg[a[0]] || ''; i.id = 'w2-k-' + a[0] + '-' + Math.random().toString(36).slice(2, 6); l.htmlFor = i.id;
        i.addEventListener('input', function () { var p = {}; p[a[0]] = i.value; apply(p); });
        f.appendChild(l); f.appendChild(i); box.appendChild(f);
      });
      function show() { box.hidden = mode !== 'kpi'; }
      show();
    }
  } });

  /* ====================================================================== */
  function go() {
    var H = window.CampoHub;
    if (!H || typeof H.register !== 'function') return false;
    defs.forEach(function (d) { H.register(d.type, d.def); });
    return true;
  }
  if (!go()) {
    var q = window.CampoHubQueue = window.CampoHubQueue || [];
    defs.forEach(function (d) { q.push({ type: d.type, def: d.def }); });
    doc.addEventListener('DOMContentLoaded', function () {
      if (go()) { var keep = []; window.CampoHubQueue.forEach(function (x) { if (!x || defs.every(function (d) { return d.def !== x.def; })) keep.push(x); }); window.CampoHubQueue = keep; }
    });
  }
})();
