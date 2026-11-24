/* Campo · Nota de hoy del portafolio — window.CampoBrief.render(mount, pf | 'todos', T) → { destroy }.
   Narra, nunca recomienda. Todo el texto sale de CampoReport.brief(); lo propio pasa por CampoReport.lint. */
(function () {
  'use strict';
  var NOOP = { destroy: function () {} };
  var uid = 0;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function todayISO() { var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }

  var CHEV = '<svg class="cbf-chev" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>';
  var LOCK = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5"/><path d="M5.5 7V5.3a2.5 2.5 0 015 0V7"/></svg>';

  function render(mount, pf, T) {
    var R = window.CampoReport;
    if (!mount || !R || typeof R.brief !== 'function') return NOOP;
    var b = null;
    try { b = R.brief(pf); } catch (e) { if (window.console) console.error(e); }
    if (!b) return NOOP;

    var id = 'cbf' + (++uid), pfid = pf === 'todos' || !pf ? 'todos' : (pf.id != null ? pf.id : 'pf');
    var key = 'campo.brief.' + pfid;
    var plan = (T && T.limit && T.limit.admin) ? 'Wealth Desk' : ((T && T.limit && T.limit.plan) || 'Investor'); /* la cuenta admin ve todo */
    var fmt = R.fmt || {};
    var timers = [], off = [], open = false;

    mount.classList.add('cbf-host');
    var root = document.createElement('section');
    root.className = 'cbf';
    root.setAttribute('aria-label', 'Nota de hoy');
    mount.appendChild(root);

    function listen(el, ev, fn, o) { el.addEventListener(ev, fn, o); off.push(function () { el.removeEventListener(ev, fn, o); }); }
    function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }

    function destroy() {
      timers.forEach(clearTimeout); timers = [];
      off.forEach(function (f) { f(); }); off = [];
      if (root.parentNode) root.parentNode.removeChild(root);
      mount.classList.remove('cbf-host');
    }

    /* Explorer: estado bloqueado */
    if (String(plan).toLowerCase() === 'explorer') {
      root.className = 'cbf is-locked';
      root.innerHTML = '<div class="cbf-bar"><span class="cbf-mark">Nota de hoy</span>' +
        '<span class="cbf-lock">' + LOCK + '<span>La nota diaria está en Investor</span></span>' +
        '<span class="cbf-hint">Un resumen de qué pasó, qué lo explica y qué viene.</span></div>';
      return { destroy: destroy };
    }

    var panelId = id + '-p';
    var secs = (b.sections || []).map(function (s, i) {
      return '<div class="cbf-sec" style="--i:' + i + '"><h3 class="cbf-k">' + esc(s.k) + '</h3><p class="cbf-t">' + esc(s.t) + '</p></div>';
    }).join('');
    var pulse = (b.pulse || []).map(function (p, i) {
      return '<li><button type="button" class="cbf-chip' + (p.tone === 'warn' ? ' is-warn' : '') + '" data-pi="' + i + '" aria-describedby="' + id + '-pd">' +
        '<span class="cbf-chip-k">' + esc(p.k) + '</span><span class="cbf-chip-v">' + esc(p.v) + '</span></button></li>';
    }).join('');
    var news = (b.news || []).slice(0, 3).map(function (n) {
      return '<li><span class="cbf-tick">' + esc(n.ticker) + '</span><span class="cbf-nt">' + esc(n.title) + '</span><span class="cbf-ns">' + esc(n.source) + (n.kind ? ' · ' + esc(n.kind) : '') + '</span></li>';
    }).join('');
    var ahead = (b.ahead || []).map(function (a) {
      var what = a.kind === 'Dato económico' ? (a.name + (a.country ? ' (' + a.country + ')' : '')) : a.ticker;
      var when = a.off === 0 ? 'Hoy' : a.off === 1 ? 'Mañana' : (fmt.dShort ? fmt.dShort(a.date) : a.date);
      var amt = a.kind === 'Dividendo estimado' && a.amount != null && fmt.money ? ' · ≈ ' + fmt.money(a.amount) : '';
      return '<li><span class="cbf-aw">' + esc(when) + '</span><span class="cbf-an">' + esc(what) + '</span><span class="cbf-ak">' + esc(a.kind) + esc(amt) + '</span></li>';
    }).join('');

    root.innerHTML =
      '<button type="button" class="cbf-bar" aria-expanded="false" aria-controls="' + panelId + '">' +
        '<span class="cbf-mark">Nota de hoy</span>' +
        '<span class="cbf-head">' + esc(b.headline) + '</span>' +
        '<span class="cbf-act"><span class="cbf-act-t">Leer nota</span>' + CHEV + '</span>' +
      '</button>' +
      '<div class="cbf-panel" id="' + panelId + '" role="region" aria-label="Nota de hoy" aria-hidden="true"><div class="cbf-clip"><div class="cbf-body">' +
        '<div class="cbf-secs">' + secs + '</div>' +
        '<div class="cbf-row cbf-fade" style="--i:3"><ul class="cbf-pulse" aria-label="Pulso del portafolio">' + pulse + '</ul><p class="cbf-pd" id="' + id + '-pd" aria-live="polite"></p></div>' +
        ((news || ahead) ? '<div class="cbf-cols cbf-fade" style="--i:4">' +
          (news ? '<div><h3 class="cbf-k">Titulares relacionados</h3><ul class="cbf-list cbf-news">' + news + '</ul></div>' : '') +
          (ahead ? '<div><h3 class="cbf-k">Próximos eventos</h3><ul class="cbf-list cbf-ahead">' + ahead + '</ul></div>' : '') +
        '</div>' : '') +
        '<div class="cbf-foot cbf-fade" style="--i:5"><p class="cbf-label">' + esc(b.label) + '</p><p class="cbf-rem">' + esc(b.reminder) + '</p></div>' +
      '</div></div></div>';

    var bar = root.querySelector('.cbf-bar'), panel = root.querySelector('.cbf-panel'), pd = root.querySelector('.cbf-pd');

    function setOpen(v) {
      open = !!v;
      root.classList.toggle('is-open', open);
      bar.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      var t = bar.querySelector('.cbf-act-t'); if (t) t.textContent = open ? 'Ocultar' : 'Leer nota';
    }
    listen(bar, 'click', function () { setOpen(!open); });

    /* pulso: la descripción aparece al pasar el cursor, al enfocar o al tocar */
    var pulseData = b.pulse || [];
    function showPulse(btn) {
      var p = pulseData[+btn.getAttribute('data-pi')]; if (!p) return;
      pd.textContent = p.d || '';
      [].forEach.call(root.querySelectorAll('.cbf-chip'), function (c) { c.classList.toggle('is-on', c === btn); });
    }
    [].forEach.call(root.querySelectorAll('.cbf-chip'), function (c) {
      listen(c, 'mouseenter', function () { showPulse(c); });
      listen(c, 'focus', function () { showPulse(c); });
      listen(c, 'click', function () { showPulse(c); });
    });

    /* primera vez del día por portafolio: se despliega sola, tras un instante para que el movimiento se vea */
    var today = todayISO();
    if (lsGet(key) !== today) {
      lsSet(key, today);
      later(function () { setOpen(true); }, 380);
    }
    return { destroy: destroy };
  }

  window.CampoBrief = { render: render };
})();
