/* Campo · Hoja "Registrar movimiento". Expone window.CampoTxSheet = { open({ pfId, type, ticker, from, onDone }), close() }.
   No calcula finanzas: todo número de la vista previa sale de CampoTracker.tx.preview; al confirmar se llama a CampoTracker.tx.add. */
(function () {
  'use strict';
  var T = window.CampoTracker; if (!T || !T.tx) return;
  var doc = document, root = doc.documentElement;
  var rmq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var TYPES = [['buy', 'Compra'], ['sell', 'Venta'], ['dep', 'Aportación'], ['wd', 'Retiro'], ['div', 'Dividendo']];
  var SUBMIT = { buy: 'Registrar compra', sell: 'Registrar venta', dep: 'Registrar aportación', wd: 'Registrar retiro', div: 'Registrar dividendo' };
  var MESC = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var nfQ = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 4 });
  var nf2 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var uid = 0, cur = null, toastEl = null, toastT = 0;

  function reduce() { return !!rmq.matches; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  /* producción: guarda en la cuenta (CampoTracker.canWrite) y todo monto va en la moneda del portafolio (PCC) */
  var RL = !!T.canWrite, PCC = 'MXN', SYM = { MXN: '$', USD: 'US$', EUR: '€', GBP: '£', CAD: 'C$', BRL: 'R$' };
  function sym(c) { return SYM[c] || ((c || '') + ' '); }
  function mxn(v) { var a = Math.abs(v); return (v < -0.004 ? '−' : '') + sym(RL ? PCC : 'MXN') + nf2.format(a); }
  function cp(ccy, v) { return sym(ccy) + nf2.format(v); }
  function todayIso() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dShort(iso) { var p = iso.split('-'); return +p[2] + ' ' + MESC[+p[1] - 1]; }
  function num(s) { var v = String(s == null ? '' : s).replace(/[,\s]/g, ''); return v === '' ? NaN : Number(v); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function pxStr(v) { return v >= 1 ? v.toFixed(2) : v.toPrecision(4); }
  function mark(tk, size) {
    var M = window.CampoMarks;
    if (M && typeof M.svg === 'function') { try { var s = M.svg(tk, size); if (s) return s; } catch (e) { } }
    return '<span class="txs-mk" style="width:' + size + 'px;height:' + size + 'px" aria-hidden="true">' + esc(String(tk).charAt(0)) + '</span>';
  }
  function catOf(tk) { var r = null; (T.catalog || []).forEach(function (c) { if (c.ticker === tk) r = c; }); return r; }

  /* ---------- aviso con Deshacer ---------- */
  function toast(msg, undo) {
    if (!toastEl) { toastEl = doc.createElement('div'); toastEl.className = 'txs-toast'; toastEl.setAttribute('role', 'status'); doc.body.appendChild(toastEl); }
    toastEl.innerHTML = '<span></span>' + (undo ? '<button type="button" class="txs-undo">Deshacer</button>' : '');
    toastEl.firstChild.textContent = msg;
    var b = toastEl.querySelector('button');
    if (b) b.onclick = function () { clearTimeout(toastT); toastEl.classList.remove('on'); undo(); };
    void toastEl.offsetWidth; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, undo ? 7000 : 3000);
  }
  function undoMsg(msg) { toast(msg, null); }

  function open(o) {
    o = o || {};
    if (cur) close(true);
    var S = {
      pfId: o.pfId && T.get(o.pfId) ? o.pfId : null, type: o.type || 'buy', tk: '', name: '', date: T.dates[T.dates.length - 1],
      qty: '', px: '', pxEd: false, fee: '', feeEd: false, amount: '', note: '', fund: true, comm: '0.25', iva: true
    };
    if (!S.pfId && T.portfolios.length) S.pfId = T.portfolios[0].id;
    if (RL) S.date = todayIso();
    function setPcc() { PCC = RL ? ((T.get(S.pfId) || {}).currency || 'MXN') : 'MXN'; }
    setPcc();
    var pickPf = !(o.pfId && T.get(o.pfId));
    /* edición de un movimiento de la cuenta: el formulario sale con sus datos; el tipo y el activo no se cambian (para eso, se elimina y se registra de nuevo) */
    var E = RL && o.edit && o.pfId && T.tx.get ? T.tx.get(o.pfId, o.edit.txId) : null, editInit = !!E;
    if (E) {
      S.type = { COMPRA: 'buy', VENTA: 'sell', DIVIDENDO: 'div', DEPOSITO: 'dep', RETIRO: 'wd' }[E.type] || 'buy'; S.date = String(E.date).slice(0, 10);
      if (E.ticker && E.ticker !== 'CASH') {
        S.tk = String(E.ticker).toUpperCase(); var pp0 = null; ((T.get(S.pfId) || {}).positions || []).forEach(function (x) { if (x.ticker === S.tk) pp0 = x; });
        var cc0 = catOf(S.tk); S.name = (pp0 && pp0.name) || (cc0 && cc0.name) || S.tk;
      }
      S.qty = E.quantity != null ? String(E.quantity) : ''; S.px = E.price != null ? String(E.price) : ''; S.pxEd = true;
      S.comm = String(E.commissionPercent != null ? E.commissionPercent : 0); S.iva = !!E.applyIva;
      S.amount = S.type === 'dep' || S.type === 'wd' || S.type === 'div' ? String(E.price) : ''; S.fx = E.fxRate ? String(E.fxRate) : '';
    }
    var id = 'txs' + (++uid), root_ = doc.createElement('div'), lastPv = null, pvT = 0, nBox = {}, closing = false;
    var lastFocus = o.from || doc.activeElement;
    root_.className = 'txs-root';
    root_.innerHTML = '<div class="txs-back" data-close></div>' +
      '<div class="txs" role="dialog" aria-modal="true" aria-labelledby="' + id + 't" tabindex="-1">' +
        '<div class="txs-grab" aria-hidden="true"><i></i></div>' +
        '<header class="txs-hd"><h2 id="' + id + 't">' + (E ? 'Editar movimiento' : 'Registrar movimiento') + '</h2><button type="button" class="icon-btn" data-close aria-label="Cerrar">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>' +
        '<form class="txs-bd" novalidate><div class="txs-sc">' +
          '<div data-pfw></div>' +
          '<div class="seg txs-seg" role="group" aria-label="Tipo de movimiento" style="--n:5"><i class="seg-pill" aria-hidden="true"></i>' +
            TYPES.map(function (t) { return '<button type="button" data-ty="' + t[0] + '" aria-pressed="false">' + t[1] + '</button>'; }).join('') + '</div>' +
          '<div class="txs-fields" data-fields></div>' +
          '<div class="txs-prev" data-prev aria-live="off"></div>' +
          '<label class="txs-chk" data-fundw hidden><input type="checkbox" data-fund checked><span data-fundt></span></label>' +
          '<p class="txs-err" data-err role="alert" aria-live="assertive"></p>' +
        '</div>' +
        '<footer class="txs-ft"><button type="submit" class="btn btn-primary btn-block" data-submit disabled>Registrar compra</button>' +
          '<p class="txs-note">' + (RL ? 'Se guarda en tu cuenta.' : 'Se guarda en este navegador.') + '</p></footer></form>' +
      '</div>';
    doc.body.appendChild(root_);
    var dlg = root_.querySelector('.txs'), form = root_.querySelector('form'), fieldsEl = root_.querySelector('[data-fields]'), prevEl = root_.querySelector('[data-prev]');
    var errEl = root_.querySelector('[data-err]'), subBtn = root_.querySelector('[data-submit]'), fundW = root_.querySelector('[data-fundw]'), fundC = root_.querySelector('[data-fund]');
    function $(s, r) { return (r || root_).querySelector(s); }
    function pf() { return T.get(S.pfId); }
    function posOf(tk) { var r = null; ((pf() || {}).positions || []).forEach(function (x) { if (x.ticker === tk) r = x; }); return r; }
    function held(tk) { var p = posOf(tk); return p ? p.qty : 0; }
    function ccyOf() {
      var p = posOf(S.tk), c = catOf(S.tk), rp = RL && window.CAMPO_REAL && window.CAMPO_REAL.paths[S.tk]; if (p) return p.currency; if (rp) return rp.origCcy || rp.ccy; if (c) return c.currency; if (S.pickCcy) return S.pickCcy; return 'MXN';
    }
    function isSec() { return S.type === 'buy' || S.type === 'sell'; }

    /* ---------- campos por tipo ---------- */
    function field(label, inner, hint) { return '<div class="txs-f"><label>' + label + inner + '</label>' + (hint || '') + '</div>'; }
    function dateField() {
      return field('<span>Fecha</span>', '<input type="date" data-in="date" value="' + S.date + '" min="' + (RL ? '1990-01-01' : T.dates[0]) + '" max="' + (RL ? todayIso() : T.dates[T.dates.length - 1]) + '" required>');
    }
    function pickList() {
      var ps = (pf() && pf().positions) || [];
      if (!ps.length) return '<p class="txs-empty">Este portafolio no tiene posiciones.</p>';
      return '<div class="txs-pick" role="radiogroup" aria-label="Posición">' + ps.map(function (p) {
        var sel = p.ticker === S.tk;
        return '<button type="button" role="radio" class="txs-opt' + (sel ? ' on' : '') + '" aria-checked="' + sel + '" data-pick="' + esc(p.ticker) + '" tabindex="' + (sel || (!S.tk && p === ps[0]) ? 0 : -1) + '">' +
          '<span class="txs-lg">' + mark(p.ticker, 24) + '</span><span class="txs-ot"><b>' + esc(p.ticker) + '</b><small>' + esc(p.name) + '</small></span>' +
          '<span class="txs-oq num">' + nfQ.format(p.qty) + '</span></button>';
      }).join('') + '</div>';
    }
    /* al editar, el activo va fijo */
    function fixedTk() { return '<div class="txs-f"><span class="txs-lb-t">Activo</span><div class="txs-fixed"><span class="txs-lg">' + mark(S.tk, 24) + '</span><span class="txs-ot"><b>' + esc(S.tk) + '</b><small>' + esc(S.name) + '</small></span></div><p class="txs-h" data-held></p></div>'; }
    function fxField() {
      return RL ? '<div class="txs-f" data-fxw hidden><label><span>Tipo de cambio <em>(opcional)</em></span><input data-in="fx" inputmode="decimal" autocomplete="off" placeholder="De mercado" value="' + esc(S.fx || '') + '"></label><p class="txs-h" data-fxh></p></div>' : '';
    }
    function buildFields() {
      var t = S.type, h = '';
      if (E && S.tk && (t === 'buy' || t === 'sell' || t === 'div')) {
        h += fixedTk();
        h += '<div class="txs-row">' + dateField() + (t === 'div' ? field('<span>Dividendo por acción (' + ccyOf() + ')</span>', '<input data-in="amount" inputmode="decimal" autocomplete="off" placeholder="0.00" value="' + esc(S.amount) + '">') :
          field('<span>Cantidad</span>', '<input data-in="qty" inputmode="decimal" autocomplete="off" placeholder="0" value="' + esc(S.qty) + '">')) + '</div>';
      } else if (t === 'buy') {
        h += '<div class="txs-f txs-cb"><label for="' + id + 'tk"><span>Activo</span></label>' +
          '<div class="txs-cbw"><input id="' + id + 'tk" data-in="q" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="' + id + 'lb" autocomplete="off" spellcheck="false" placeholder="Busca por ticker o nombre" value="' + esc(S.tk ? S.tk + ' · ' + S.name : '') + '">' +
          '<ul class="txs-lb" id="' + id + 'lb" role="listbox" aria-label="Activos" hidden></ul></div><p class="txs-h" data-held></p></div>';
        h += '<div class="txs-row">' + dateField() + field('<span>Cantidad</span>', '<input data-in="qty" inputmode="decimal" autocomplete="off" placeholder="0" value="' + esc(S.qty) + '">') + '</div>';
      } else if (t === 'sell') {
        h += '<div class="txs-f"><span class="txs-lb-t">Posición a vender</span>' + pickList() + '<p class="txs-h" data-held></p></div>';
        h += '<div class="txs-row">' + dateField() + field('<span>Cantidad</span>', '<input data-in="qty" inputmode="decimal" autocomplete="off" placeholder="0" value="' + esc(S.qty) + '">',
          '<button type="button" class="txs-link" data-all>Vender todo</button>') + '</div>';
      } else if (t === 'div') {
        h += '<div class="txs-f"><span class="txs-lb-t">Posición que pagó</span>' + pickList() + '</div>';
        h += '<div class="txs-row">' + dateField() + field(RL ? '<span>Dividendo por acción' + (S.tk ? ' (' + ccyOf() + ')' : '') + '</span>' : '<span>Monto bruto (MXN)</span>', '<input data-in="amount" inputmode="decimal" autocomplete="off" placeholder="0.00" value="' + esc(S.amount) + '">') + '</div>';
      } else {
        h += '<div class="txs-row">' + dateField() + field('<span>Monto (' + (RL ? PCC : 'MXN') + ')</span>', '<input data-in="amount" inputmode="decimal" autocomplete="off" placeholder="0.00" value="' + esc(S.amount) + '">') + '</div>';
        h += field('<span>Nota <em>(opcional)</em></span>', '<input data-in="note" maxlength="80" autocomplete="off" placeholder="Ej. ahorro de noviembre" value="' + esc(S.note) + '">');
      }
      if (isSec()) {
        h += '<div class="txs-row">' + field('<span data-pxl>Precio por unidad</span>', '<input data-in="px" inputmode="decimal" autocomplete="off" placeholder="0.00" value="' + esc(S.px) + '">', '<p class="txs-h" data-pxh></p>') +
          (RL ? field('<span>Comisión (%)</span>', '<input data-in="comm" inputmode="decimal" autocomplete="off" placeholder="0.25" value="' + esc(S.comm) + '">',
            '<label class="txs-chk txs-iva"><input type="checkbox" data-in="iva"' + (S.iva ? ' checked' : '') + '><span>Más IVA (16 %) sobre la comisión</span></label>')
          : field('<span>Comisión (MXN)</span>', '<input data-in="fee" inputmode="decimal" autocomplete="off" placeholder="0.00" value="' + esc(S.fee) + '">', '<p class="txs-h">0.25 % + IVA, editable</p>')) + '</div>';
        h += '<p class="txs-h txs-fxr" data-fxr hidden></p>';
      }
      if (t === 'buy' || t === 'sell' || t === 'div') h += fxField();
      fieldsEl.innerHTML = h;
      updateHints();
    }
    function buildPf() {
      var w = $('[data-pfw]');
      if (!pickPf) { w.innerHTML = '<p class="txs-pfn">En <b>' + esc((pf() || {}).name || '') + '</b></p>'; return; }
      w.innerHTML = '<div class="txs-f"><span class="txs-lb-t">Portafolio</span><div class="txs-pick txs-pfs" role="radiogroup" aria-label="Portafolio">' +
        T.portfolios.map(function (p, i) {
          var sel = p.id === S.pfId;
          return '<button type="button" role="radio" class="txs-opt' + (sel ? ' on' : '') + '" aria-checked="' + sel + '" data-pf="' + esc(p.id) + '" tabindex="' + (sel ? 0 : -1) + '"><i class="txs-sw" style="background:' + p.color + '"></i><span class="txs-ot"><b>' + esc(p.name) + '</b></span></button>';
        }).join('') + '</div></div>';
    }
    function buildPrev() {
      var t = S.type, ccy = ccyOf(), rows = '';
      function row(k, label, extra) { return '<div class="txs-pr"><span>' + label + '</span><span class="txs-pv">' + (extra || '') + '<b class="num" data-n="' + k + '">—</b></span></div>'; }
      function ba(k, label) { return '<div class="txs-pr"><span>' + label + '</span><span class="txs-pv"><span class="num txs-bf" data-n="' + k + 'B">—</span><i aria-hidden="true">→</i><b class="num" data-n="' + k + 'A">—</b></span></div>'; }
      rows += row('total', t === 'buy' ? 'Total a pagar' : t === 'sell' ? 'Recibes (neto de comisión)' : t === 'dep' ? 'Aportas' : t === 'wd' ? 'Retiras' : 'Cobras');
      rows += ba('cash', 'Efectivo');
      if (t === 'buy' || t === 'sell') { rows += ba('qty', 'Posición (títulos)'); if (t === 'buy') rows += ba('avg', 'Costo promedio'); }
      if (t === 'sell' && !E) { rows += row('real', 'Ganancia realizada estimada'); rows += row('tax', 'ISR estimado'); }
      prevEl.innerHTML = '<h3 class="txs-pt">Vista previa</h3><p class="txs-pe" data-pe>Completa los datos para ver cómo queda.</p><div class="txs-pg" data-pg hidden>' + rows + '</div>' +
        (t === 'sell' && !E ? '<p class="txs-h txs-pd" data-pd hidden></p>' : '');
      nBox = {}; Array.prototype.forEach.call(prevEl.querySelectorAll('[data-n]'), function (e) { nBox[e.getAttribute('data-n')] = e; });
    }

    /* ---------- números que ruedan ---------- */
    function setN(k, v, fmt) {
      var el = nBox[k]; if (!el) return;
      if (v == null || isNaN(v)) { el.textContent = '—'; el._v = null; return; }
      var from = el._v; el._v = v; var my = el._t = (el._t || 0) + 1;
      if (reduce() || from == null || from === v || closing) { el.textContent = fmt(v); return; }
      var t0 = performance.now();
      (function step() {
        if (el._t !== my || !root_.isConnected) return;
        var k2 = Math.min(1, (performance.now() - t0) / 260), e = 1 - Math.pow(1 - k2, 3);
        el.textContent = fmt(from + (v - from) * e);
        if (k2 < 1) requestAnimationFrame(step); else el.textContent = fmt(v);
      })();
    }

    /* ---------- hints de precio / posición ---------- */
    function priceInfo() { return S.tk ? T.priceAt(S.tk, S.date) : null; }
    function updateHints() {
      var ccy = ccyOf(), pa = priceInfo(), ph = $('[data-pxh]'), fxr = $('[data-fxr]'), pl = $('[data-pxl]'), hd = $('[data-held]');
      if (pl) pl.textContent = 'Precio por unidad' + (S.tk ? ' (' + ccy + ')' : '');
      if (ph) ph.textContent = pa ? 'Cierre del ' + dShort(pa.date) + ': ' + cp(pa.currency, pa.px) : 'Elige un activo para ver su precio.';
      if (fxr) { var show = RL ? (!!S.tk && ccy !== PCC) : (!!pa && pa.currency === 'USD'); fxr.hidden = !show; if (show) fxr.textContent = RL ? 'Se convierte a ' + PCC + ' con el tipo de cambio de esa fecha.' : 'Tipo de cambio del día: ' + nf2.format(pa.fx); }
      var fxw = $('[data-fxw]'); /* tipo de cambio propio: solo si el activo cotiza en otra moneda que el portafolio */
      if (fxw) {
        var fshow = !!S.tk && ccy !== PCC; fxw.hidden = !fshow;
        if (fshow) {
          var mk = pa ? T.rate(ccy, pa.idx) / T.rate(PCC, pa.idx) : 0, fh = $('[data-fxh]');
          if (fh) fh.textContent = 'Déjalo vacío para usar el de mercado de esa fecha' + (mk > 0 ? ' (≈ ' + mk.toFixed(mk < 1 ? 4 : 2) + ')' : '') + '. Escríbelo si tu bróker aplicó otro: ' + PCC + ' por 1 ' + ccy + '.';
        }
      }
      if (hd) {
        var q = held(S.tk);
        hd.textContent = !S.tk ? '' : S.type === 'sell' ? 'Disponible: ' + nfQ.format(q) + ' títulos' : q > 0 ? 'Ya tienes ' + nfQ.format(q) : '';
        hd.hidden = !hd.textContent;
        if (S.type === 'buy' && q > 0) hd.className = 'txs-h txs-badge';
      }
    }
    function refreshPx(force) {
      if (!isSec() || !S.tk) return;
      var pa = priceInfo(); if (!pa) return;
      if (!S.pxEd || force) { S.pxEd = false; S.px = pxStr(pa.px); var i = $('[data-in="px"]'); if (i) i.value = S.px; }
      refreshFee();
    }
    function refreshFee() {
      if (RL || !isSec() || S.feeEd) return;
      var pa = priceInfo(), q = num(S.qty), p = num(S.px), fx = pa ? pa.fx : 1;
      S.fee = q > 0 && p > 0 ? String(r2(q * p * fx * 0.0029)) : '';
      var i = $('[data-in="fee"]'); if (i) i.value = S.fee;
    }

    /* ---------- combobox de activos ---------- */
    var cbIdx = -1, cbList = [];
    function cbEls() { return { inp: $('[data-in="q"]'), lb: $('#' + id + 'lb') }; }
    function cbRender() {
      var e = cbEls(); if (!e.inp) return;
      var q = S.tk && e.inp.value === S.tk + ' · ' + S.name ? '' : e.inp.value;
      cbList = T.searchTickers(q);
      if (RL && q && q.length >= 1) remoteSearch(q);
      e.lb.innerHTML = cbList.length ? cbList.map(function (c, i) {
        var h = held(c.ticker);
        return '<li role="option" id="' + id + 'o' + i + '" data-i="' + i + '" aria-selected="false"><span class="txs-lg">' + mark(c.ticker, 24) + '</span><span class="txs-ot"><b>' + esc(c.ticker) + '</b><small>' + esc(c.name) + ' · ' + esc(c.cls) + '</small></span>' +
          '<span class="txs-oq num">' + cp(c.currency, c.price).replace('US$', 'US$') + (h > 0 ? '<small class="txs-hv">Ya tienes ' + nfQ.format(h) + '</small>' : '') + '</span></li>';
      }).join('') : '<li class="txs-none" role="presentation">Sin resultados</li>';
      cbIdx = cbList.length ? 0 : -1; cbMark();
      e.lb.hidden = false; e.inp.setAttribute('aria-expanded', 'true');
    }
    var rsT = 0, rsQ = '';
    function remoteSearch(q) {
      clearTimeout(rsT); rsQ = q;
      rsT = setTimeout(function () {
        var W8 = window.CAMPO_REAL && window.CAMPO_REAL.write; if (!W8) return;
        W8.search(q).then(function (list) {
          var e = cbEls(); if (!e.inp || rsQ !== q || S.tk) return;
          var have = {}; cbList.forEach(function (c) { have[c.ticker] = 1; });
          var add = (list || []).filter(function (c) { return !have[c.ticker]; }); if (!add.length) return;
          cbList = cbList.concat(add).slice(0, 14); paintList(e);
        }).catch(function () { });
      }, 260);
    }
    function paintList(e) {
      e.lb.innerHTML = cbList.length ? cbList.map(function (c, i) {
        var h = held(c.ticker);
        return '<li role="option" id="' + id + 'o' + i + '" data-i="' + i + '" aria-selected="false"><span class="txs-lg">' + mark(c.ticker, 24) + '</span><span class="txs-ot"><b>' + esc(c.ticker) + '</b><small>' + esc(c.name) + ' · ' + esc(c.cls || '') + (c.exch ? ' · ' + esc(c.exch) : '') + '</small></span>' +
          '<span class="txs-oq num">' + (c.price > 0 ? cp(c.currency, c.price) : '') + (h > 0 ? '<small class="txs-hv">Ya tienes ' + nfQ.format(h) + '</small>' : '') + '</span></li>';
      }).join('') : '<li class="txs-none" role="presentation">Sin resultados</li>';
      if (cbIdx < 0 && cbList.length) cbIdx = 0; cbMark();
    }
    function cbMark() {
      var e = cbEls(); Array.prototype.forEach.call(e.lb.querySelectorAll('[role="option"]'), function (li, i) { li.setAttribute('aria-selected', String(i === cbIdx)); });
      if (cbIdx >= 0) { e.inp.setAttribute('aria-activedescendant', id + 'o' + cbIdx); var li = $('#' + id + 'o' + cbIdx); if (li && li.scrollIntoView) li.scrollIntoView({ block: 'nearest' }); } else e.inp.removeAttribute('aria-activedescendant');
    }
    function cbClose() { var e = cbEls(); if (!e.inp) return false; var was = !e.lb.hidden; e.lb.hidden = true; e.inp.setAttribute('aria-expanded', 'false'); e.inp.removeAttribute('aria-activedescendant'); return was; }
    function cbPick(i) {
      var c = cbList[i]; if (!c) return;
      S.tk = c.ticker; S.name = c.name; S.pickCcy = c.currency; var e = cbEls(); e.inp.value = c.ticker + ' · ' + c.name; cbClose();
      updateHints(); refreshPx(true); queuePreview();
      /* emisora que aún no está en tus datos: trae su historia y su precio, y entonces propone el precio de esa fecha */
      var W8 = RL && window.CAMPO_REAL && window.CAMPO_REAL.write;
      if (W8 && !window.CAMPO_REAL.paths[c.ticker]) {
        var ph = $('[data-pxh]'); if (ph) ph.textContent = 'Buscando el precio de ' + c.ticker + '…';
        var want = c.ticker; W8.ensureTicker(c.ticker, { cur: c.currency }).then(function () { if (S.tk !== want) return; updateHints(); refreshPx(true); queuePreview(); });
      }
    }

    /* ---------- vista previa ---------- */
    function payload(final) {
      var t = S.type, u = { t: t, date: S.date };
      if (t === 'buy' || t === 'sell') {
        var q = num(S.qty), p = num(S.px);
        if (!S.tk || !(q > 0) || !(p > 0)) return null;
        u.tk = S.tk; u.qty = q; u.px = p; u.fee = num(S.fee) > 0 ? num(S.fee) : 0;
        if (RL) { u.comm = num(S.comm) >= 0 ? num(S.comm) : 0; u.iva = !!S.iva; u.ivaRate = 16; u.name = S.name; u.ccy = ccyOf(); if (num(S.fx) > 0) u.fx = num(S.fx); }
      } else {
        var a = num(S.amount); if (!(a > 0)) return null;
        u.amount = a; if (t === 'div') { if (!S.tk) return null; u.tk = S.tk; if (RL) { u.px = a; if (num(S.fx) > 0) u.fx = num(S.fx); } } else u.note = S.note.trim();
      }
      if (final && t === 'buy') u.fund = fundC.checked;
      return u;
    }
    function queuePreview() { clearTimeout(pvT); pvT = setTimeout(runPreview, 120); subBtn.disabled = true; }
    function runPreview() {
      var u = payload(false), pe = $('[data-pe]'), pg = $('[data-pg]'), pd = $('[data-pd]');
      lastPv = null; errEl.textContent = '';
      fundW.hidden = true;
      if (!u || !S.pfId) { pe.hidden = false; pg.hidden = true; if (pd) pd.hidden = true; subBtn.disabled = true; return; }
      var pv = E ? T.tx.previewEdit(S.pfId, o.edit.txId, u) : T.tx.preview(S.pfId, u);
      if (pv.error && !pv.ev) { pe.hidden = false; pe.textContent = 'No se puede calcular la vista previa.'; pg.hidden = true; errEl.textContent = pv.error; subBtn.disabled = true; if (pd) pd.hidden = true; return; }
      lastPv = pv; pe.hidden = true; pg.hidden = false;
      var ev = pv.ev, ccy = ev.ccy || 'MXN', pos = posOf(S.tk);
      setN('total', ev.mxn, mxn);
      setN('cashB', pv.cashBefore, mxn); setN('cashA', S.type === 'buy' && pv.fund > 0 && fundC.checked ? pv.cashAfter + pv.fund : pv.cashAfter, mxn); /* con la aportación automática, el efectivo no queda negativo */
      if (S.type === 'buy' || S.type === 'sell') {
        var qb = pos ? pos.qty : 0;
        setN('qtyB', qb, function (v) { return nfQ.format(v); }); setN('qtyA', pv.qtyAfter, function (v) { return v <= 1e-9 ? 'Cierra la posición' : nfQ.format(v); });
        if (S.type === 'buy') { setN('avgB', pos ? pos.avg : null, function (v) { return cp(ccy, v); }); setN('avgA', pv.avgAfter, function (v) { return cp(ccy, v); }); }
      }
      if (S.type === 'sell' && !E) {
        setN('real', pv.realized, function (v) { return (v > 0.004 ? '+' : '') + mxn(v); });
        setN('tax', pv.tax, mxn);
        if (pd) { pd.hidden = false; pd.textContent = 'ISR calculado a ' + Math.round((pv.taxRate || 0) * 100) + ' % sobre la ganancia' + (pv.taxRate === 0.3 ? ' (tasa marginal estimada para cripto)' : '') + '. Es una estimación descriptiva.'; }
      }
      var msg = '';
      if (pv.error) msg = pv.error;
      if (RL && S.type === 'buy' && pv.external > 0.005) {
        fundW.hidden = false; fundC.style.display = 'none';
        $('[data-fundt]').textContent = (pv.cashBefore > 0.005 ? 'Se usan ' + mxn(pv.cashBefore - pv.cashAfter) + ' de tu efectivo; los ' : 'No hay efectivo en el portafolio: los ') + mxn(pv.external) + (pv.cashBefore > 0.005 ? ' restantes' : '') + ' cuentan como aportación.';
      }
      if (!RL && S.type === 'buy' && pv.fund > 0) {
        fundW.hidden = false; $('[data-fundt]').textContent = 'Registrar también una aportación de ' + mxn(pv.fund) + ' (no tienes efectivo suficiente)';
        if (!fundC.checked) msg = 'Sin la aportación te faltan ' + mxn(pv.fund) + ' de efectivo. Márcala o reduce la compra.';
      }
      errEl.textContent = msg; subBtn.disabled = !!msg;
    }

    /* ---------- tipo / portafolio ---------- */
    function setType(t, keepFocus) {
      S.type = t; if (t !== 'sell' && t !== 'div' && t !== 'buy') S.tk = ''; if (!editInit && (t === 'sell' || t === 'div')) { var p = posOf(S.tk); if (!p) { S.tk = ''; S.name = ''; } }
      if (!editInit) { S.pxEd = false; S.feeEd = false; S.px = ''; S.fee = ''; }
      var seg = $('.txs-seg'); Array.prototype.forEach.call(seg.querySelectorAll('button'), function (b, i) { var on = b.getAttribute('data-ty') === t; b.setAttribute('aria-pressed', String(on)); b.disabled = !!E && !on; if (on) seg.style.setProperty('--i', i); });
      subBtn.textContent = E ? 'Guardar cambios' : SUBMIT[t];
      if ((t === 'sell' || t === 'div') && !S.tk) { var ps = (pf() && pf().positions) || []; if (o.ticker && posOf(o.ticker)) { S.tk = o.ticker; S.name = posOf(o.ticker).name; } else if (ps.length === 1) { S.tk = ps[0].ticker; S.name = ps[0].name; } }
      if (t === 'buy' && !S.tk && o.ticker && catOf(o.ticker)) { S.tk = o.ticker; S.name = catOf(o.ticker).name; }
      buildFields(); buildPrev(); if (!editInit) refreshPx(true); queuePreview(); editInit = false;
    }

    /* ---------- eventos ---------- */
    root_.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) { close(); return; }
      var ty = e.target.closest('[data-ty]'); if (ty) { if (ty.getAttribute('data-ty') !== S.type) { S.qty = ''; S.amount = ''; setType(ty.getAttribute('data-ty')); } return; }
      var pfb = e.target.closest('[data-pf]');
      if (pfb) { S.pfId = pfb.getAttribute('data-pf'); S.tk = ''; S.name = ''; setPcc(); buildPf(); setType(S.type); var nb = $('[data-pf="' + S.pfId + '"]'); if (nb) nb.focus(); return; }
      var pk = e.target.closest('[data-pick]');
      if (pk) {
        S.tk = pk.getAttribute('data-pick'); var p = posOf(S.tk); S.name = p ? p.name : S.tk; S.px = ''; S.pxEd = false; S.feeEd = false;
        Array.prototype.forEach.call(fieldsEl.querySelectorAll('[data-pick]'), function (b) { var on = b === pk; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
        updateHints(); refreshPx(true); queuePreview(); return;
      }
      if (e.target.closest('[data-all]')) { var hq = held(S.tk); if (hq > 0) { S.qty = String(hq); $('[data-in="qty"]').value = S.qty; refreshFee(); queuePreview(); } return; }
      var li = e.target.closest('[role="option"]'); if (li) { cbPick(+li.getAttribute('data-i')); var qq = $('[data-in="qty"]'); if (qq) qq.focus(); return; }
      if (!e.target.closest('.txs-cbw')) cbClose();
    });
    root_.addEventListener('input', function (e) {
      var k = e.target.getAttribute && e.target.getAttribute('data-in'); if (!k) return;
      if (k === 'q') { S.tk = ''; S.name = ''; cbRender(); updateHints(); queuePreview(); return; }
      if (k === 'date') { S.date = e.target.value || S.date; refreshPx(false); updateHints(); }
      else if (k === 'px') { S.px = e.target.value; S.pxEd = true; refreshFee(); }
      else if (k === 'fee') { S.fee = e.target.value; S.feeEd = true; }
      else if (k === 'comm') { S.comm = e.target.value; }
      else if (k === 'iva') { S.iva = !!e.target.checked; }
      else if (k === 'qty') { S.qty = e.target.value; refreshFee(); }
      else S[k] = e.target.value;
      queuePreview();
    });
    root_.addEventListener('change', function (e) { if (e.target === fundC) runPreview(); if (e.target.getAttribute && e.target.getAttribute('data-in') === 'iva') { S.iva = !!e.target.checked; queuePreview(); } });
    root_.addEventListener('keydown', function (e) {
      var t = e.target;
      if (t.getAttribute && t.getAttribute('data-in') === 'q') {
        var op = !cbEls().lb.hidden;
        if (e.key === 'ArrowDown') { e.preventDefault(); if (!op) cbRender(); else { cbIdx = Math.min(cbList.length - 1, cbIdx + 1); cbMark(); } }
        else if (e.key === 'ArrowUp' && op) { e.preventDefault(); cbIdx = Math.max(0, cbIdx - 1); cbMark(); }
        else if (e.key === 'Enter' && op) { e.preventDefault(); if (cbIdx >= 0) { cbPick(cbIdx); } }
        else if (e.key === 'Tab' && op) cbClose();
        return;
      }
      if (t.getAttribute && (t.hasAttribute('data-pick') || t.hasAttribute('data-pf')) && /^Arrow/.test(e.key)) {
        var grp = Array.prototype.slice.call(t.parentNode.querySelectorAll('[role="radio"]')), i = grp.indexOf(t), d = /Down|Right/.test(e.key) ? 1 : -1;
        e.preventDefault(); var n = grp[(i + d + grp.length) % grp.length]; n.focus(); n.click();
      }
    });
    root_.addEventListener('focusin', function (e) {
      if (e.target.getAttribute && e.target.getAttribute('data-in') === 'q') { if (cbEls().lb.hidden) cbRender(); }
      else if (!e.target.closest('.txs-cbw')) cbClose();
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); clearTimeout(pvT); runPreview();
      if (subBtn.disabled) return;
      var u = payload(true);
      if (RL) { /* producción: se guarda en la cuenta; el botón espera la respuesta del servidor */
        var lbl = subBtn.textContent; subBtn.disabled = true; subBtn.textContent = 'Guardando…'; errEl.textContent = '';
        var pid0 = S.pfId;
        if (E) { /* edición: se guarda y el aviso ofrece Deshacer (deja el movimiento como estaba) */
          Promise.resolve(T.tx.edit(pid0, o.edit.txId, u)).then(function (r) {
            if (!r || r.error) { subBtn.textContent = lbl; subBtn.disabled = false; errEl.textContent = (r && r.error) || 'No se pudo guardar.'; return; }
            close();
            toast('Movimiento actualizado', function () { Promise.resolve(T.tx.restore(pid0, r.before)).then(function (x) { undoMsg(x && x.error ? x.error : 'Cambio deshecho'); }); });
            if (typeof o.onDone === 'function') { try { o.onDone(r); } catch (x) { } }
          });
          return;
        }
        Promise.resolve(T.tx.add(S.pfId, u)).then(function (r) {
          if (!r || r.error) { subBtn.textContent = lbl; subBtn.disabled = false; errEl.textContent = (r && r.error) || 'No se pudo registrar.'; return; }
          var tt = S.type, m2 = tt === 'buy' ? 'Compra de ' + nfQ.format(r.qty) + ' ' + r.tk + ' registrada' : tt === 'sell' ? 'Venta de ' + nfQ.format(r.qty) + ' ' + r.tk + ' registrada'
            : tt === 'dep' ? 'Aportación de ' + mxn(r.amount) + ' registrada' : tt === 'wd' ? 'Retiro de ' + mxn(r.amount) + ' registrado' : 'Dividendo de ' + r.tk + ' por ' + mxn(r.amount) + ' registrado';
          close();
          toast(m2, r.id ? function () { Promise.resolve(T.tx.remove(pid0, [r.id])).then(function (x) { undoMsg(x && x.error ? x.error : 'Movimiento deshecho'); }); } : null);
          if (typeof o.onDone === 'function') { try { o.onDone(r); } catch (x) { } }
        });
        return;
      }
      var res = T.tx.add(S.pfId, u);
      if (!res || res.error) { errEl.textContent = (res && res.error) || 'No se pudo registrar.'; return; }
      var ev = res.ev, pid = S.pfId, ids = res.ids, t = S.type, msg;
      var nm = ev.tk || '';
      if (t === 'buy') msg = 'Compra de ' + nfQ.format(ev.qty) + ' ' + nm + ' registrada';
      else if (t === 'sell') msg = 'Venta de ' + nfQ.format(ev.qty) + ' ' + nm + ' registrada';
      else if (t === 'dep') msg = 'Aportación de ' + mxn(ev.mxn) + ' registrada';
      else if (t === 'wd') msg = 'Retiro de ' + mxn(ev.mxn) + ' registrado';
      else msg = 'Dividendo de ' + mxn(ev.mxn) + ' de ' + nm + ' registrado';
      close();
      toast(msg, function () { T.tx.remove(pid, ids); undoMsg('Movimiento deshecho'); });
      if (typeof o.onDone === 'function') { try { o.onDone(res); } catch (x) { } }
    });

    /* ---------- foco, Esc y scroll ---------- */
    function focusables() {
      return Array.prototype.slice.call(dlg.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])')).filter(function (n) { return !n.disabled && !n.closest('[hidden]') && n.offsetParent !== null && !(n.matches('[role="radio"]') && n.tabIndex < 0); });
    }
    function onDocKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopImmediatePropagation();
        if (cbClose()) return; close(); return;
      }
      if (e.key === 'Tab') {
        var f = focusables(); if (!f.length) return;
        var first = f[0], last = f[f.length - 1], a = doc.activeElement;
        if (!dlg.contains(a)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
      }
    }
    doc.addEventListener('keydown', onDocKey, true);
    var prevOv = root.style.overflow; root.style.overflow = 'hidden'; doc.body.classList.add('txs-open');

    function finish() {
      doc.removeEventListener('keydown', onDocKey, true);
      clearTimeout(pvT); if (root_.parentNode) root_.parentNode.removeChild(root_);
      root.style.overflow = prevOv; doc.body.classList.remove('txs-open');
    }
    var inst = {
      close: function (instant) {
        if (closing) return; closing = true; if (cur === inst) cur = null;
        root_.classList.remove('on');
        if (lastFocus && lastFocus.isConnected && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (x) { } }
        if (instant || reduce()) finish(); else setTimeout(finish, 190);
      }
    };
    cur = inst;

    buildPf(); setType(S.type);
    if (o.ticker && (S.type === 'sell' || S.type === 'div' || S.type === 'buy')) { /* ya preseleccionado en setType */ }
    void root_.offsetWidth; root_.classList.add('on');
    var first = S.type === 'buy' && !S.tk ? $('[data-in="q"]') : null;
    (first || dlg).focus({ preventScroll: true });
    return inst;
  }
  function close(instant) { if (cur) cur.close(instant); }

  window.CampoTxSheet = { open: open, close: close };
})();
