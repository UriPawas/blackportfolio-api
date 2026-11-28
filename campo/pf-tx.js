/* CAMPO · Portafolio individual · pestaña "Transacciones". Expone window.CampoPfTx.render(mount, portfolio|'todos', CampoTracker) -> { destroy }.
   Lee el libro con CampoModel.ledger(pf).events: no recalcula finanzas. "Registrar movimiento" abre CampoTxSheet; los movimientos del
   usuario (user:true) llevan la etiqueta "Registrado por ti" y se pueden borrar con Deshacer (CampoTracker.tx). */
(function () {
  'use strict';
  var D = window.PORTIFY_DEMO, M = window.CampoModel;
  if (!D || !M || !D.fmt) return;
  var doc = typeof document !== 'undefined' ? document : null;
  var rmq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var EXPO = 'cubic-bezier(0.23, 1, 0.32, 1)';
  var TYPES = { dep: 'Aportación', buy: 'Compra', sell: 'Venta', div: 'Dividendo', wd: 'Retiro' };
  var CHIPS = [['all', 'Todos'], ['dep', 'Aportaciones'], ['buy', 'Compras'], ['sell', 'Ventas'], ['div', 'Dividendos'], ['wd', 'Retiros']];
  var MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var MESC = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var nfQ = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 4 });
  var nfP = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var nfN = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
  var uid = 0;

  function reduce() { return !!rmq.matches; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function dateTxt(iso) { return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, ''); }
  function monthTxt(k) { var s = MESL[+k.slice(5, 7) - 1]; return s.charAt(0).toUpperCase() + s.slice(1) + ' ' + k.slice(0, 4); }
  function monthShort(k) { return MESC[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4); }
  function money(v) { return D.fmt.mxn(Math.round(v), 0); }
  function fmtN(v) { return nfN.format(Math.round(v)); }
  function signed(v) { var a = Math.round(Math.abs(v)); return (a === 0 ? '' : v < 0 ? '−' : '+') + D.fmt.mxn(a, 0); }
  function BS() { var t = window.CampoTracker; return (t && t.base) || 'MXN'; }
  function pxTxt(ccy, px) { var d = window.PORTIFY_DEMO; return (d && d.fmt && d.fmt.sym ? d.fmt.sym(ccy) : '$') + ' ' + nfP.format(px); }
  function signOf(t) { return t === 'buy' || t === 'wd' ? -1 : 1; }
  function csvText(s) { s = String(s == null ? '' : s); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function slugOf(s) { return String(s || 'portafolio').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'portafolio'; }

  function norm(ev, k, saved) {
    return { t: ev.t, date: ev.date, tk: ev.tk || '', name: ev.name || ev.tk || '', qty: +ev.qty || 0, px: +ev.px || 0,
      ccy: ev.ccy || '', fx: ev.fx, mxn: +ev.mxn || 0, sign: signOf(ev.t), saved: saved, k: k,
      user: !!ev.user, real: !!ev.real, pf: ev.pf, uid: ev.uid, auto: !!ev.auto, note: ev.note || '' };
  }

  function render(mount, portfolio, T) {
    var off = [], pend = new Set(), timers = [], dead = false, started = false, ro = null;
    var pf = portfolio === 'todos' || (portfolio && portfolio.cons) ? 'todos' : (typeof portfolio === 'string' ? T.get(portfolio) : portfolio);
    var L = M.ledger(pf);

    function on(el, ev, fn) { el.addEventListener(ev, fn); off.push(function () { el.removeEventListener(ev, fn); }); }
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function frame(fn) { var r = requestAnimationFrame(function (t) { pend.delete(r); if (!dead) fn(t); }); pend.add(r); }
    function destroy() {
      if (dead) return; dead = true;
      off.forEach(function (f) { try { f(); } catch (x) { } }); off = [];
      pend.forEach(function (r) { cancelAnimationFrame(r); }); pend.clear();
      timers.forEach(function (h) { clearTimeout(h); }); timers = [];
      if (ro) { ro.disconnect(); ro = null; }
      if (mount) mount.innerHTML = '';
    }
    var api = { destroy: destroy };

    var pfId = pf === 'todos' ? null : (pf && pf.id) || null;
    function openSheet(from) { if (window.CampoTxSheet) window.CampoTxSheet.open({ pfId: pfId, type: 'buy', from: from }); }

    if (!L || !L.events || !L.events.length) {
      mount.innerHTML = '<div class="pftx"><div class="pftx-empty-card"><strong>Este portafolio aún no tiene movimientos</strong><p>Cuando registres aportaciones, compras, ventas, dividendos o retiros, aquí verás el libro completo.</p>' +
        (window.CampoTxSheet && !(window.CampoTracker && window.CampoTracker.readonly) ? '<button type="button" class="btn btn-primary btn-sm" data-reg>Registrar movimiento</button>' : '') + '</div><p class="pftx-foot">Tus movimientos registrados · no es asesoría de inversión</p></div>';
      var eb = mount.querySelector('[data-reg]'); if (eb) on(eb, 'click', function () { openSheet(eb); });
      return api;
    }

    var id = 'pftx' + (++uid), TODAY = todayISO();
    var slug = pf === 'todos' ? 'todos' : slugOf(L.name || (pf && pf.name));
    var netBy = {}, filt = 'all', groups = [], rowsM = [], tot = { n: 0, dep: 0, wd: 0, div: 0 }, shown = { n: 0, dep: 0, wd: 0, div: 0 }, bars = [];
    var saved = L.events.map(function (e, i) { return norm(e, i, true); });
    saved.forEach(function (e) {
      var mk = e.date.slice(0, 7);
      if (e.t === 'dep') netBy[mk] = (netBy[mk] || 0) + e.mxn; else if (e.t === 'wd') netBy[mk] = (netBy[mk] || 0) - e.mxn;
    });

    /* ---------- marcado ---------- */
    function cell(k, label, def) {
      return '<div class="pftx-cell" title="' + esc(def) + '"><span class="pftx-k">' + label + '</span><span class="pftx-v num" data-tot="' + k + '">0</span><span class="pftx-d">' + def + '</span></div>';
    }
    var chipsHTML = CHIPS.map(function (c) {
      return '<button type="button" class="pftx-chip" data-f="' + c[0] + '" aria-pressed="' + (c[0] === 'all') + '"><span>' + c[1] + '</span><span class="pftx-cc num" data-cnt="' + c[0] + '">0</span></button>';
    }).join('');

    mount.innerHTML = '<div class="pftx" id="' + id + '">' +
      '<section class="panel pftx-led" aria-label="Totales del filtro activo">' +
        cell('n', 'Movimientos', 'Con el filtro y la búsqueda activos') + cell('dep', 'Aportado', 'Dinero que entró, en ' + BS()) +
        cell('wd', 'Retirado', 'Dinero que salió, en ' + BS()) + cell('div', 'Dividendos', 'Brutos cobrados, en ' + BS()) +
      '</section>' +
      '<section class="panel pftx-s pftx-ch" aria-labelledby="' + id + 'h1"><div class="pftx-top"><h2 id="' + id + 'h1">Flujo neto por mes</h2><span class="muted">Aportaciones menos retiros · todo el libro</span></div>' +
        '<div class="pftx-cw" data-cw></div><div class="pftx-ax" aria-hidden="true"><span data-ax0></span><span data-ax1></span></div></section>' +
      '<section class="panel pftx-s pftx-list" aria-labelledby="' + id + 'h2">' +
        '<div class="pftx-top"><h2 id="' + id + 'h2">Movimientos</h2><div class="pftx-acts"><button type="button" class="btn btn-secondary btn-sm" data-csv>Exportar CSV</button>' +
        (window.CampoTxSheet && !(window.CampoTracker && window.CampoTracker.readonly) ? '<button type="button" class="btn btn-primary btn-sm" data-reg>Registrar movimiento</button>' : '') + '</div></div>' +
        '<div class="pftx-tools"><div class="pftx-chips" role="group" aria-label="Filtrar por tipo">' + chipsHTML + '</div>' +
        '<label class="pftx-search"><span class="pftx-sr">Buscar por ticker o nombre</span><input type="search" data-q placeholder="Buscar ticker o nombre…" autocomplete="off"></label></div>' +
        '<p class="pftx-st" data-st aria-live="polite"></p>' +
        '<div class="pftx-tw"><table class="pftx-tb" data-tb><caption class="pftx-sr">Movimientos del libro, agrupados por mes</caption>' +
          '<thead><tr><th scope="col">Fecha</th><th scope="col">Tipo</th><th scope="col">Activo</th><th scope="col" class="r">Cantidad</th><th scope="col" class="r">Precio</th><th scope="col" class="r">TC a ' + BS() + '</th><th scope="col" class="r">Monto ' + BS() + '</th><th scope="col" class="pftx-ac"><span class="pftx-sr">Acciones</span></th></tr></thead></table></div>' +
        '<p class="pftx-empty" data-empty hidden></p>' +
      '</section>' +
      '<p class="pftx-foot">Tus movimientos registrados · no es asesoría de inversión</p></div>';

    function $(s) { return mount.querySelector(s); }
    function $$(s, r) { return Array.prototype.slice.call((r || mount).querySelectorAll(s)); }
    var tbl = $('[data-tb]'), searchEl = $('[data-q]'), stEl = $('[data-st]'), emptyEl = $('[data-empty]');
    var totEl = {}; ['n', 'dep', 'wd', 'div'].forEach(function (k) { totEl[k] = $('[data-tot="' + k + '"]'); });

    /* ---------- números rodando ---------- */
    function roll(el, from, to, fmt, dur, delay) {
      var my = el._rt = (el._rt || 0) + 1;
      if (reduce() || !dur || from === to) { el.textContent = fmt(to); return; }
      var t0 = performance.now() + (delay || 0);
      (function step() {
        if (dead || el._rt !== my) return;
        var k = (performance.now() - t0) / dur;
        if (k < 0) { frame(step); return; }
        var e = 1 - Math.pow(1 - clamp(k, 0, 1), 3);
        el.textContent = fmt(from + (to - from) * e);
        if (k < 1) frame(step); else el.textContent = fmt(to);
      })();
    }
    function paintTotals(anim) {
      ['n', 'dep', 'wd', 'div'].forEach(function (k) {
        var from = shown[k], to = tot[k]; shown[k] = to;
        roll(totEl[k], from, to, k === 'n' ? fmtN : money, anim ? 420 : 0, 0);
      });
    }

    /* ---------- filas y grupos por mes ---------- */
    function ownerOf(u) { var r = ''; T.portfolios.forEach(function (q) { if (T.tx.list(q.id).some(function (x) { return x.id === u; })) r = q.id; }); return r; }
    function rowHTML(e) {
      var sec = !!e.tk;
      return '<tr class="pftx-r">' +
        '<td class="pftx-dt">' + dateTxt(e.date) + '</td>' +
        '<td><span class="pftx-type">' + TYPES[e.t] + '</span>' + (e.user ? '<span class="pftx-you">Registrado por ti</span>' : '') + '</td>' +
        '<td>' + (sec ? '<b class="pftx-tk">' + esc(e.tk) + '</b><span class="pftx-nm">' + esc(e.name) + '</span>' : '<span class="pftx-nm">Efectivo</span>') + '</td>' +
        '<td class="r num">' + (sec && e.qty ? nfQ.format(e.qty) : '—') + '</td>' +
        '<td class="r num">' + (sec && e.px ? pxTxt(e.ccy, e.px) : '—') + '</td>' +
        '<td class="r num">' + (e.ccy !== BS() && e.fx ? nfP.format(e.fx) : '—') + '</td>' +
        '<td class="r num pftx-mo">' + signed(e.sign * e.mxn) + '</td>' +
        '<td class="pftx-ac">' + actionsHTML(e) + '</td></tr>';
    }
    /* movimientos propios: los del prototipo (user) se borran con Deshacer; los de la cuenta (real) además se editan */
    function actionsHTML(e) {
      var real = !!(e.real && e.uid && !e.auto && T.canWrite && !T.readonly), mine = real || !!(e.user && !e.auto && e.uid);
      if (!mine) return '';
      var pid = real ? (e.pf || pfId) : (pfId || ownerOf(e.uid)), what = TYPES[e.t].toLowerCase() + (e.tk ? ' de ' + e.tk : '') + ' del ' + dateTxt(e.date);
      return (real ? '<button type="button" class="pftx-edit" data-edit="' + esc(e.uid) + '" data-pf="' + esc(pid) + '" aria-label="' + esc('Editar ' + what) + '" title="Editar">' +
          '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4"/></svg></button>' : '') +
        '<button type="button" class="pftx-del" data-del="' + esc(e.uid) + '" data-pf="' + esc(pid) + '" aria-label="' + esc('Eliminar ' + what) + '" title="Eliminar">' +
          '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg></button>';
    }
    function makeRow(e) { var t = doc.createElement('tbody'); t.innerHTML = rowHTML(e); return t.firstElementChild; }
    saved.forEach(function (e) { rowsM.push({ e: e, k: e.k, tr: makeRow(e), want: undefined, anim: null }); });

    function layout() {
      groups.forEach(function (g) { if (g.el.parentNode) g.el.parentNode.removeChild(g.el); });
      groups = [];
      var order = rowsM.slice().sort(function (a, b) {
        if (a.e.date !== b.e.date) return a.e.date < b.e.date ? 1 : -1;
        return b.k - a.k;
      });
      var byKey = {};
      order.forEach(function (m) {
        var mk = m.e.date.slice(0, 7), g = byKey[mk], nv = netBy[mk] || 0;
        if (!g) {
          g = byKey[mk] = { key: mk, el: doc.createElement('tbody'), rows: [] };
          g.el.className = 'pftx-g';
          g.el.innerHTML = '<tr class="pftx-mh"><th colspan="8" scope="colgroup"><span class="pftx-mn">' + monthTxt(mk) + '</span>' +
            '<span class="pftx-mf">Flujo neto <b class="num">' + signed(nv) + '</b></span></th></tr>';
          tbl.appendChild(g.el); groups.push(g);
        }
        g.el.appendChild(m.tr); g.rows.push(m);
      });
    }

    /* alta y baja de filas con opacidad y transform; las que salen se ocultan al terminar */
    var animLeft = 0; /* tope de filas animadas por cambio de filtro: el resto cambia sin animación */
    function setRow(m, want, anim) {
      if (m.want === want) return;
      if (anim && animLeft-- <= 0) anim = false;
      var wasSet = m.want !== undefined;
      m.want = want;
      if (m.anim) { m.anim.onfinish = null; m.anim.cancel(); m.anim = null; }
      var tr = m.tr, can = anim && !reduce() && !!tr.animate;
      if (want) {
        tr.hidden = false;
        if (can) m.anim = tr.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: EXPO });
      } else if (!(can && wasSet) || tr.hidden) {
        tr.hidden = true;
      } else {
        var a = tr.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-4px)' }], { duration: 200, easing: EXPO });
        m.anim = a;
        a.onfinish = function () { tr.hidden = true; m.anim = null; };
      }
    }

    function applyFilter(anim) {
      animLeft = 24;
      var q = (searchEl.value || '').trim().toLowerCase(), cnt = { all: 0, dep: 0, buy: 0, sell: 0, div: 0, wd: 0 };
      var t = { n: 0, dep: 0, wd: 0, div: 0 }, vis = 0;
      rowsM.forEach(function (m) {
        var e = m.e, tOk = filt === 'all' || e.t === filt;
        var sOk = !q || (e.tk && e.tk.toLowerCase().indexOf(q) > -1) || (e.name && e.name.toLowerCase().indexOf(q) > -1);
        if (sOk) { cnt.all++; cnt[e.t]++; }
        var ok = tOk && sOk;
        if (ok) { vis++; if (e.saved) { t.n++; if (t[e.t] != null) t[e.t] += e.mxn; } }
        setRow(m, ok, anim);
      });
      tot = t;
      $$('[data-cnt]').forEach(function (n) { n.textContent = cnt[n.getAttribute('data-cnt')]; });
      $$('.pftx-chip').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-f') === filt)); });
      paintTotals(anim);
      groups.forEach(function (g) {
        var any = g.rows.some(function (m) { return m.want; });
        if (any) g.el.hidden = false;
        else if (anim) later(function () { if (!g.rows.some(function (m) { return m.want; })) g.el.hidden = true; }, 200);
        else g.el.hidden = true;
      });
      emptyEl.hidden = vis > 0;
      emptyEl.textContent = 'Ningún movimiento coincide con este filtro.';
      stEl.textContent = 'Mostrando ' + vis + ' de ' + rowsM.length + ' movimientos.';
    }

    /* ---------- gráfica de flujo neto ---------- */
    (function buildChart() {
      var cw = $('[data-cw]'), months = saved.map(function (e) { return e.date.slice(0, 7); }).sort();
      if (!months.length) { cw.parentNode.hidden = true; return; }
      var a = months[0], b = months[months.length - 1], series = [], y = +a.slice(0, 4), m = +a.slice(5, 7) - 1, yE = +b.slice(0, 4), mE = +b.slice(5, 7) - 1;
      while (y < yE || (y === yE && m <= mE)) { var k = y + '-' + pad2(m + 1); series.push({ key: k, v: netBy[k] || 0 }); m++; if (m > 11) { m = 0; y++; } }
      var W = 600, H = 120, mid = H / 2, PAD = 6, maxAbs = 0;
      series.forEach(function (s) { maxAbs = Math.max(maxAbs, Math.abs(s.v)); }); maxAbs = maxAbs || 1;
      var sc = (mid - PAD) / maxAbs, n = series.length, slot = W / n, bw = Math.min(slot * 0.62, 26);
      var label = 'Flujo neto por mes, de ' + monthTxt(a) + ' a ' + monthTxt(b) + '.';
      var h = '<svg class="pftx-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="' + esc(label) + '" focusable="false">' +
        '<line class="pftx-zero" x1="0" x2="' + W + '" y1="' + mid + '" y2="' + mid + '" vector-effect="non-scaling-stroke"/>';
      series.forEach(function (s, i) {
        var x = i * slot + (slot - bw) / 2, bh = Math.abs(s.v) * sc, yy = s.v >= 0 ? mid - bh : mid;
        var cls = s.v > 0 ? 'is-pos' : s.v < 0 ? 'is-neg' : 'is-zero';
        h += '<rect class="pftx-bar ' + cls + '" x="' + x.toFixed(2) + '" y="' + yy.toFixed(2) + '" width="' + bw.toFixed(2) + '" height="' + bh.toFixed(2) +
          '" style="transform-origin:' + (x + bw / 2).toFixed(2) + 'px ' + mid + 'px"><title>' + monthTxt(s.key) + ': ' + (s.v ? signed(s.v) : 'sin flujo neto') + '</title></rect>';
      });
      cw.innerHTML = h + '</svg>';
      bars = $$('.pftx-bar', cw);
      $('[data-ax0]').textContent = monthShort(a); $('[data-ax1]').textContent = monthShort(b);
    })();

    /* ---------- aviso (con Deshacer opcional) ---------- */
    function notice(msg, undo, role) {
      var lv = doc.getElementById('pftxLive'); if (!lv) { lv = doc.createElement('div'); lv.id = 'pftxLive'; lv.className = 'sr'; lv.setAttribute('role', 'status'); lv.setAttribute('aria-live', 'polite'); doc.body.appendChild(lv); }
      lv.textContent = ''; setTimeout(function () { lv.textContent = msg; }, 30); /* región viva montada siempre: la que nace con el aviso no se anuncia de forma fiable */
      var t = doc.createElement('div'); t.className = 'txs-toast'; if (role === 'alert') t.setAttribute('role', 'alert');
      t.innerHTML = '<span></span>' + (undo ? '<button type="button" class="txs-undo">Deshacer</button>' : ''); t.firstChild.textContent = msg;
      doc.body.appendChild(t); void t.offsetWidth; t.classList.add('on');
      var gone = setTimeout(function () { t.classList.remove('on'); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 220); }, undo ? 7000 : 6000);
      var b = t.querySelector('button'); if (b) b.onclick = function () { clearTimeout(gone); if (t.parentNode) t.parentNode.removeChild(t); undo(); };
    }
    /* ---------- movimientos de la cuenta: editar y eliminar (la posición y el efectivo se recalculan) ---------- */
    function editReal(btn) {
      if (window.CampoTxSheet) window.CampoTxSheet.open({ pfId: btn.getAttribute('data-pf'), edit: { txId: btn.getAttribute('data-edit') }, from: btn });
    }
    function removeReal(btn) {
      var tid = btn.getAttribute('data-del'), pid = btn.getAttribute('data-pf'); btn.disabled = true;
      Promise.resolve(T.tx.remove(pid, [tid])).then(function (res) {
        btn.disabled = false;
        if (!res || res.error) { notice((res && res.error) || 'No se pudo eliminar.', null, 'alert'); return; }
        var rm = res.removed || {}, nm = { COMPRA: 'Compra', VENTA: 'Venta', DIVIDENDO: 'Dividendo', DEPOSITO: 'Aportación', RETIRO: 'Retiro' }[rm.type] || 'Movimiento';
        notice(nm + (rm.ticker && rm.ticker !== 'CASH' ? ' de ' + rm.ticker : '') + ' eliminado', function () {
          Promise.resolve(T.tx.restore(pid, rm)).then(function (x) { if (x && x.error) notice(x.error, null, 'alert'); else notice('Movimiento restaurado', null); });
        });
      });
    }
    /* ---------- borrar un movimiento propio (con Deshacer) ---------- */
    function removeUser(btn) {
      var uidv = btn.getAttribute('data-del'), pid = btn.getAttribute('data-pf'), raw = T.tx.list(pid), rec = null;
      raw.forEach(function (x) { if (x.id === uidv) rec = x; });
      if (!rec) return;
      var ids = [rec.id], autos = [];
      if (rec.t === 'buy') raw.forEach(function (x) {
        if (x.auto && x.t === 'dep' && x.date === rec.date && (x.note || '').slice(-rec.tk.length) === rec.tk) { ids.push(x.id); autos.push(x); }
      });
      var res = T.tx.remove(pid, ids);
      if (res && res.error) { var te = doc.createElement('div'); te.className = 'txs-toast'; te.setAttribute('role', 'alert'); te.textContent = res.error; doc.body.appendChild(te); void te.offsetWidth; te.classList.add('on'); setTimeout(function () { te.classList.remove('on'); setTimeout(function () { if (te.parentNode) te.parentNode.removeChild(te); }, 220); }, 6000); return; }
      var u = { t: rec.t, date: rec.date, tk: rec.tk, name: rec.name, qty: rec.qty, px: rec.px, fee: rec.fee, amount: rec.mxn, note: rec.note, fund: autos.length > 0 };
      var t = doc.createElement('div'); t.className = 'txs-toast'; t.setAttribute('role', 'status');
      t.innerHTML = '<span></span><button type="button" class="txs-undo">Deshacer</button>';
      t.firstChild.textContent = TYPES[rec.t] + (rec.tk ? ' de ' + rec.tk : '') + ' eliminada';
      doc.body.appendChild(t); void t.offsetWidth; t.classList.add('on');
      var gone = setTimeout(function () { t.classList.remove('on'); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 220); }, 7000);
      t.querySelector('button').onclick = function () { clearTimeout(gone); if (t.parentNode) t.parentNode.removeChild(t); T.tx.add(pid, u); };
    }

    /* ---------- exportar CSV ---------- */
    function exportCsv() {
      var lines = [['Fecha', 'Tipo', 'Activo', 'Nombre', 'Cantidad', 'Precio', 'Moneda', 'TC a ' + BS(), 'Monto ' + BS(), 'Origen'].join(',')], n = 0;
      rowsM.forEach(function (m) {
        if (!m.want) return; n++;
        var e = m.e;
        lines.push([e.date, csvText(TYPES[e.t]), csvText(e.tk), csvText(e.name), e.qty ? String(e.qty) : '', e.px ? e.px.toFixed(4) : '',
          e.ccy, e.ccy !== BS() && e.fx ? Number(e.fx).toFixed(4) : '', (e.sign * e.mxn).toFixed(2),
          csvText(e.user ? 'Registrado por ti' : 'Libro')].join(','));
      });
      var blob = new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob), a = doc.createElement('a');
      a.href = url; a.download = 'transacciones-' + slug + '-' + TODAY + '.csv';
      doc.body.appendChild(a); a.click(); doc.body.removeChild(a);
      later(function () { URL.revokeObjectURL(url); }, 1000);
      stEl.textContent = 'CSV descargado con ' + n + ' filas.';
    }

    /* ---------- eventos ---------- */
    on(mount, 'click', function (e) {
      var chip = e.target.closest('.pftx-chip');
      if (chip) { var f = chip.getAttribute('data-f'); if (f !== filt) { filt = f; applyFilter(true); syncTx(); } return; }
      var rg = e.target.closest('[data-reg]'); if (rg) { openSheet(rg); return; }
      if (e.target.closest('[data-csv]')) { exportCsv(); return; }
      var ed = e.target.closest('[data-edit]'); if (ed) { editReal(ed); return; }
      var dl = e.target.closest('[data-del]'); if (dl) { if (T.canWrite) removeReal(dl); else removeUser(dl); }
    });
    function syncTx() { var S = window.CampoSections; if (S && S.setQuery) S.setQuery({ f: filt === 'all' ? '' : filt, q: searchEl.value.trim() }); }
    on(searchEl, 'input', function () { applyFilter(false); syncTx(); }); /* al teclear no se anima fila por fila: con miles de movimientos eran miles de animaciones por tecla */

    /* ---------- primera pintura y entrada ---------- */
    layout();
    var qsT = window.CampoSections && window.CampoSections.query ? window.CampoSections.query() : {}; /* ?f=…&q=… del enlace */
    if (qsT.f && $$('.pftx-chip').some(function (b) { return b.getAttribute('data-f') === qsT.f; })) filt = qsT.f;
    if (qsT.q) searchEl.value = qsT.q;
    applyFilter(false);
    function start() {
      if (started || dead) return; started = true;
      if (reduce()) return;
      Array.prototype.forEach.call(mount.querySelectorAll('.pftx > section, .pftx > .pftx-foot'), function (s, i) {
        if (s.animate) s.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: i * 40, easing: EXPO, fill: 'backwards' });
      });
      ['n', 'dep', 'wd', 'div'].forEach(function (k, i) {
        var v = tot[k]; shown[k] = v; roll(totEl[k], 0, v, k === 'n' ? fmtN : money, 700, 120 + i * 40);
      });
      bars.forEach(function (b, i) {
        if (b.animate) b.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 380, delay: Math.min(i * 22, 500), easing: EXPO, fill: 'backwards' });
      });
    }
    if (mount.offsetWidth > 0) start();
    else if (window.ResizeObserver) {
      ro = new ResizeObserver(function () { if (mount.offsetWidth > 0 && ro) { ro.disconnect(); ro = null; start(); } });
      ro.observe(mount);
    } else start();

    return api;
  }

  window.CampoPfTx = { render: render };
})();
