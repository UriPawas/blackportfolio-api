/* Campo · Sección Mercados (banda de mercados + una sola gráfica + lista de seguimiento). Monta en #secMercados; prefijo mk-.
   Contrato: docs/rediseno-gbm-2026-11/24-spec-mercados.md (sección 4; la sección 1 es la capa de datos que vive aquí).
   Usa window.CampoInd (indicadores) y window.CampoMktChart (lienzo); si faltan, la sección se pinta con el estado "No pudimos cargar la gráfica".
   Persiste en localStorage['campo.mkt.v1']. Datos públicos de la API (sin token), con caché en memoria y una sola petición en vuelo por clave.
   window.bpFx (fx.js) carga DESPUÉS de este archivo: se usa de forma perezosa al pintar. */
(function () {
  'use strict';
  var win = window, doc = document, html = doc.documentElement;
  var D = win.PORTIFY_DEMO, root = doc.getElementById('secMercados');
  function noop() { }
  win.CampoMercados = { open: noop, follow: noop, isFollowed: function () { return false; } };
  if (!D || !root) return;

  /* ================= constantes y textos ================= */
  var LS = 'campo.mkt.v1';
  var IS_LOCAL = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  var API = (IS_LOCAL ? 'http://127.0.0.1:8000' : 'https://blackportfolio-api-production.up.railway.app') + '/api';
  var PERIODS = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1A', '5A', 'Máx'];
  var MONTHS = { '1M': 1, '3M': 3, '6M': 6, '1A': 12, '5A': 60 };
  var SLOTS = ['A', 'B', 'C'];
  var TYPES = { EQUITY: 'Acción', ETF: 'ETF', INDEX: 'Índice', CRYPTOCURRENCY: 'Cripto', MUTUALFUND: 'Fondo', CURRENCY: 'Divisa', FUTURE: 'Futuro' };
  var EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  var UNITS = { '^MXX': 'pts', '^GSPC': 'pts', '^NDX': 'pts', '^VIX': 'pts', 'DX-Y.NYB': 'pts', 'MXN=X': 'MXN', 'BTC-USD': 'USD', 'GC=F': 'USD/oz', 'CL=F': 'USD/bbl', '^TNX': '%' };
  var IND_SHORT = { sma20: 'MS 20', sma50: 'MS 50', sma200: 'MS 200', ema20: 'ME 20', bb: 'BB', vwap: 'VWAP', rsi: 'RSI', macd: 'MACD', stoch: 'Estoc.' };
  var SECTORS = { 'Technology': 'Tecnología', 'Consumer Defensive': 'Consumo básico', 'Consumer Cyclical': 'Consumo discrecional', 'Financial Services': 'Servicios financieros', 'Healthcare': 'Salud', 'Industrials': 'Industria', 'Energy': 'Energía', 'Basic Materials': 'Materiales', 'Real Estate': 'Bienes raíces', 'Utilities': 'Servicios públicos', 'Communication Services': 'Comunicaciones' };
  var NAME_MARK = { '^MXX': 1, '^GSPC': 1, '^NDX': 1, 'MXN=X': 1, 'GC=F': 1, '^TNX': 1 };
  var NA = '<span class="mk-nd">Sin dato</span>';
  var ICON_SEARCH = '<svg class="mk-sb-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';
  var ICON_STAR = '<svg class="mk-star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8L12 3.6z"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_CHEV = '<svg class="mk-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5"/></svg>';

  var rmq = win.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduce() { return !!rmq.matches; }

  /* ================= utilidades ================= */
  function $(s, r) { return (r || root).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || root).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function up(s) { return String(s == null ? '' : s).trim().toUpperCase(); }
  var SYM_RE = /^[A-Z0-9^][A-Z0-9^=.\-&]{0,23}$/; /* forma de un símbolo de Yahoo: AAPL, WALMEX.MX, ^GSPC, MXN=X, BTC-USD, M&M.NS */
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function finite(v) { return typeof v === 'number' && isFinite(v); }
  function toast(m) { try { if (win.__campo && win.__campo.toast) win.__campo.toast(m); } catch (e) { } }
  function safeDecode(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }
  function safeUrl(u) { u = String(u || '').trim(); return /^https?:\/\//i.test(u) ? u : ''; }
  var nfs = {};
  function nf(dec) { return nfs[dec] || (nfs[dec] = new Intl.NumberFormat('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec })); }
  function fmtNum(v, dec) { return finite(v) ? nf(dec).format(v).replace('-', '−') : '–'; }
  var cnf = null;
  function compact(v) {
    if (!finite(v) || v <= 0) return NA;
    try { cnf = cnf || new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 2 }); return esc(cnf.format(v)); } catch (e) { return esc(nf(0).format(v)); }
  }
  function decFor(sym, v) { if (/=X$/.test(sym)) return 4; if (finite(v) && Math.abs(v) < 1) return 4; return 2; }
  function pxTxt(sym, v) { return fmtNum(v, decFor(sym, v)); }
  function signed(v, dec) { return (v > 0 ? '+' : v < 0 ? '−' : '') + nf(dec).format(Math.abs(v)); }
  function pct(v) { return D.fmt && D.fmt.pct ? D.fmt.pct(v) : signed(v, 2) + ' %'; }
  function hl(text, q) {
    text = String(text || ''); if (!q) return esc(text);
    var i = text.toLowerCase().indexOf(q.toLowerCase()); if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }
  function mark(sym, size) { try { return win.CampoMarks ? win.CampoMarks.svg(markKey(sym), size) : ''; } catch (e) { return ''; } }
  function odoOn(el) { try { if (el && !el._mkOd && win.bpFx && win.bpFx.odo) { win.bpFx.odo(el); el._mkOd = 1; } } catch (e) { } }
  function odoAll(host) { $$('[data-price]', host).forEach(odoOn); }
  function flash(el, dir) { try { if (dir && win.bpFx && win.bpFx.flash) win.bpFx.flash(el, dir); } catch (e) { } }
  function stagger(els) { try { if (win.bpFx && win.bpFx.stagger && els.length) win.bpFx.stagger(els); } catch (e) { } }
  function setPx(el, txt, dir) {
    if (!el) return; odoOn(el);
    if (el.textContent === txt) return;
    el.textContent = txt; if (dir) flash(el, dir);
  }

  /* variación: siempre con segundo canal (flecha) además del color */
  function dParts(v, kind) {
    if (!finite(v)) return { cls: 'delta mk-nd', inner: 'Sin dato' };
    var c = Math.abs(v) < 0.005 ? 'flat' : v > 0 ? 'gain' : 'loss';
    var t = kind === 'pp' ? signed(v, 2) + ' pp' : pct(v);
    return { cls: 'delta ' + c, inner: '<i class="arw" aria-hidden="true">' + (c === 'gain' ? '▲' : c === 'loss' ? '▼' : '▪') + '</i><span>' + t + '</span>' };
  }
  function dHTML(v, kind) { var p = dParts(v, kind); return finite(v) ? '<span class="' + p.cls + '">' + p.inner + '</span>' : NA; }
  function setD(el, v, kind) { if (!el) return; var p = dParts(v, kind); el.className = p.cls; el.innerHTML = p.inner; }

  /* ================= fechas y zonas horarias ================= */
  var dfs = {};
  function dtf(kind, tz) {
    var k = kind + '|' + tz; if (dfs[k]) return dfs[k];
    var o = { timeZone: tz };
    if (kind === 'key') { o.year = 'numeric'; o.month = '2-digit'; o.day = '2-digit'; }
    else if (kind === 'intra') { o.weekday = 'short'; o.day = 'numeric'; o.month = 'short'; o.hour = '2-digit'; o.minute = '2-digit'; o.hour12 = false; }
    else if (kind === 'day') { o.day = 'numeric'; o.month = 'short'; o.year = 'numeric'; }
    else if (kind === 'short') { o.day = 'numeric'; o.month = 'short'; }
    else if (kind === 'mon') { o.month = 'short'; o.year = 'numeric'; }
    else if (kind === 'clock') { o.weekday = 'short'; o.hour = '2-digit'; o.minute = '2-digit'; o.hourCycle = 'h23'; }
    var f; try { f = new Intl.DateTimeFormat(kind === 'key' ? 'en-CA' : kind === 'clock' ? 'en-US' : 'es-MX', o); }
    catch (e) { o.timeZone = 'America/New_York'; f = new Intl.DateTimeFormat(kind === 'key' ? 'en-CA' : kind === 'clock' ? 'en-US' : 'es-MX', o); }
    return (dfs[k] = f);
  }
  function dayKey(t, tz) { return dtf('key', tz).format(new Date(t)); }
  function clean(s) { return String(s).replace(/\./g, '').replace(/,/g, '').replace(/ de /g, ' '); }
  function fmtDate(t, d) {
    var tz = d.tz || 'America/New_York';
    if (d.intraday) return clean(dtf('intra', tz).format(new Date(t)));
    return clean(dtf(d.per === 'Máx' ? 'mon' : 'day', tz).format(new Date(t)));
  }
  function fmtShort(t, tz) { return clean(dtf('short', tz || 'America/New_York').format(new Date(t))); }
  function ago(ms) {
    var m = Math.floor((Date.now() - ms) / 60000);
    if (m < 1) return 'hace un momento'; if (m < 60) return 'hace ' + m + ' min';
    var h = Math.floor(m / 60); if (h < 24) return 'hace ' + h + ' h';
    var d = Math.floor(h / 24); if (d <= 7) return 'hace ' + d + ' d';
    return fmtShort(ms);
  }
  function clockOf(tz) {
    var parts = dtf('clock', tz).formatToParts(new Date()), o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    var h = parseInt(o.hour, 10) % 24, m = parseInt(o.minute, 10) || 0;
    return { wd: o.weekday, min: h * 60 + m };
  }
  var MARKETS = [
    { id: 'bmv', name: 'BMV', tz: 'America/Mexico_City', o: 510, c: 900, tip: 'BMV: lun–vie 8:30–15:00 (hora del centro de México). No considera días festivos.' },
    { id: 'ny', name: 'Nueva York', tz: 'America/New_York', o: 570, c: 960, tip: 'Nueva York: lun–vie 9:30–16:00 (hora del Este). No considera días festivos.' },
    { id: 'crypto', name: 'Cripto', always: true, tip: 'Cripto: opera las 24 horas, todos los días.' }
  ];
  var sess = {};
  function inPeriod(o) { var n = Date.now() / 1000; return !!(o && o.start > 0 && o.end > o.start) && n >= o.start && n < o.end; }
  function fetchSessions() {
    [['bmv', '^MXX'], ['ny', '^GSPC']].forEach(function (x) {
      cget('sess:' + x[1], 10 * 60e3, function () { return getJSON(chartUrl(x[1], '5d', '1d')).then(parseChart); }).then(function (d) {
        if (d && d.meta && d.meta.open && d.meta.open.start > 0) { sess[x[0]] = d.meta.open; if (rt.built) { paintStatus(); if (rt.hasChart) paintHead(); paintWhen(); } }
      }, noop);
    });
  }
  function mktOpen(m) {
    if (m.always) return true;
    if (sess[m.id]) return inPeriod(sess[m.id]);
    var c = clockOf(m.tz); if (c.wd === 'Sat' || c.wd === 'Sun') return false;
    return c.min >= m.o && c.min < m.c;
  }
  function mktById(id) { for (var i = 0; i < MARKETS.length; i++) if (MARKETS[i].id === id) return MARKETS[i]; return MARKETS[1]; }

  /* ================= tipo y mercado de un símbolo ================= */
  function symType(sym, meta) {
    var t = meta && meta.type ? up(meta.type) : '';
    if (t === 'EQUITY' || t === 'ETF' || t === 'INDEX' || t === 'CRYPTOCURRENCY' || t === 'MUTUALFUND' || t === 'CURRENCY' || t === 'FUTURE') return t;
    if (/^\^/.test(sym)) return 'INDEX'; if (/=X$/.test(sym)) return 'CURRENCY'; if (/=F$/.test(sym)) return 'FUTURE';
    if (/-(USD|USDT|EUR|MXN)$/.test(sym)) return 'CRYPTOCURRENCY';
    return 'EQUITY';
  }
  function symMarket(sym, meta) {
    var t = symType(sym, meta);
    if (t === 'CRYPTOCURRENCY') return 'crypto';
    if (t === 'FUTURE' || t === 'CURRENCY') return 'wk';
    if (/\.MX$/.test(sym) || sym === '^MXX') return 'bmv';
    return 'ny';
  }
  function symIsOpen(sym, meta) {
    var id = symMarket(sym, meta);
    if (id === 'crypto' || symType(sym, meta) === 'CURRENCY') return true;
    if (meta && meta.open && meta.open.start > 0 && meta.open.end > meta.open.start && meta.sym === sym) return inPeriod(meta.open);
    if (id === 'wk') { var c = clockOf('America/New_York'); return !(c.wd === 'Sat' || c.wd === 'Sun'); }
    return mktOpen(mktById(id));
  }
  function unitFor(sym, meta) {
    if (UNITS[sym]) return UNITS[sym];
    var t = symType(sym, meta);
    if (t === 'INDEX') return 'pts';
    return meta && meta.ccy ? meta.ccy : '';
  }

  /* ================= persistencia ================= */
  function lsGet() { try { var v = JSON.parse(localStorage.getItem(LS) || 'null'); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } }
  function lsSet(o) { try { localStorage.setItem(LS, JSON.stringify(o)); } catch (e) { } }
  function defaultSym() {
    var best = null;
    (D.positions || []).forEach(function (p) { if (p && p.ticker && (!best || (p.value || 0) > (best.value || 0))) best = p; });
    return best ? up(best.ticker) : '^GSPC';
  }
  var st = (function () {
    var s = lsGet() || {};
    var out = {
      sym: (SYM_RE.test(up(s.sym)) ? up(s.sym) : '') || defaultSym(),
      period: PERIODS.indexOf(s.period) >= 0 ? s.period : '1A',
      type: s.type === 'candles' ? 'candles' : 'area',
      ind: Array.isArray(s.ind) ? s.ind.filter(function (k) { return typeof k === 'string'; }) : ['vol'],
      cmp: [], watch: null, recent: []
    };
    if (Array.isArray(s.cmp)) s.cmp.forEach(function (c) {
      if (c && c.s && out.cmp.length < 3 && SLOTS.indexOf(c.slot) >= 0 && !out.cmp.some(function (x) { return x.slot === c.slot || x.s === up(c.s); })) out.cmp.push({ s: up(c.s), n: c.n || '', slot: c.slot });
    });
    if (Array.isArray(s.watch)) out.watch = s.watch.filter(function (w) { return w && w.s; }).map(function (w) { return { s: up(w.s), n: String(w.n || '') }; });
    if (Array.isArray(s.recent)) out.recent = s.recent.map(up).filter(Boolean).slice(0, 5);
    return out;
  })();
  function save() { lsSet({ sym: st.sym, period: st.period, type: st.type, ind: st.ind, cmp: st.cmp, watch: st.watch || [], recent: st.recent }); }
  function importWatch() {
    if (st.watch) return;
    var out = [];
    try {
      var uid = win.BlackPortfolioAuth && win.BlackPortfolioAuth.firebaseAuth && win.BlackPortfolioAuth.firebaseAuth.currentUser && win.BlackPortfolioAuth.firebaseAuth.currentUser.uid;
      var raw = uid ? JSON.parse(localStorage.getItem('blackportfolio-watchlist-' + uid) || 'null') : null;
      if (Array.isArray(raw)) raw.forEach(function (x) {
        var s = typeof x === 'string' ? x : x && (x.symbol || x.ticker), n = x && typeof x === 'object' ? (x.name || '') : '';
        s = up(s); if (s && !out.some(function (w) { return w.s === s; })) out.push({ s: s, n: String(n) });
      });
    } catch (e) { }
    st.watch = out.slice(0, 40); save();
  }

  /* nombres conocidos de cada símbolo */
  var nm = {};
  (D.positions || []).forEach(function (p) { if (p && p.ticker) nm[up(p.ticker)] = p.name || p.ticker; });
  (D.markets || []).forEach(function (m) { if (m && m.y) nm[up(m.y)] = m.sym; });
  function nameOf(sym, meta) {
    var n = nm[sym];
    if (!n || n === sym) n = meta && meta.name && meta.name !== sym ? meta.name : (n || sym);
    return n;
  }
  function markKey(sym) { var m = bandOf(sym); return m && NAME_MARK[sym] ? m.sym : sym; }
  function bandOf(sym) {
    var l = D.markets || [];
    for (var i = 0; i < l.length; i++) if (up(l[i].y) === sym) return l[i];
    return null;
  }
  function findPos(sym) {
    var l = D.positions || [];
    for (var i = 0; i < l.length; i++) if (l[i] && up(l[i].ticker) === sym) return l[i];
    return null;
  }
  function pushRecent(sym) { st.recent = [sym].concat(st.recent.filter(function (s) { return s !== sym; })).slice(0, 5); }

  /* ================= capa de datos ================= */
  function attempt(url, n) {
    var ctl = win.AbortController ? new AbortController() : null, to = ctl ? setTimeout(function () { ctl.abort(); }, 12000) : 0;
    return fetch(url, ctl ? { signal: ctl.signal } : undefined).then(function (r) {
      clearTimeout(to);
      if (r.status === 429) return { retry: 3000 };
      if (r.status >= 400 && r.status < 500) return { ok: 1, v: null };
      if (r.ok) return r.json().then(function (v) { return { ok: 1, v: v }; });
      return { retry: 700 };
    }, function () { clearTimeout(to); return { retry: 700 }; }).then(function (o) {
      if (o.ok) return o.v;
      if (n < 1) return sleep(o.retry).then(function () { return attempt(url, n + 1); });
      throw new Error('red');
    });
  }
  function getJSON(url) { return attempt(url, 0); }

  var cache = {};
  function cget(key, ttl, loader) {
    var c = cache[key], now = Date.now();
    if (c && c.p) return c.p;
    if (c && 'v' in c && now - c.t < ttl) return Promise.resolve(c.v);
    var p = loader().then(function (v) { cache[key] = { t: Date.now(), v: v, p: null }; return v; }, function (e) { if (cache[key] && cache[key].p === p) delete cache[key]; throw e; });
    cache[key] = { t: now, p: p };
    return p;
  }
  function cpeek(key) { var c = cache[key]; return c && 'v' in c ? c.v : undefined; }
  function cdrop(sym) { Object.keys(cache).forEach(function (k) { if (k.indexOf(':' + sym) > 0 || k.indexOf(':' + sym) === k.length - sym.length - 1) delete cache[k]; }); }

  function parseChart(j) {
    var r = j && j.chart && j.chart.result && j.chart.result[0]; if (!r) return null;
    var ts = r.timestamp || [], q = r.indicators && r.indicators.quote && r.indicators.quote[0]; if (!q || !q.close) return null;
    var bars = [], i, c, o, h, l;
    for (i = 0; i < ts.length; i++) {
      c = q.close[i]; if (!(c > 0)) continue;
      o = q.open && q.open[i] > 0 ? q.open[i] : c; h = q.high && q.high[i] > 0 ? q.high[i] : c; l = q.low && q.low[i] > 0 ? q.low[i] : c;
      bars.push({ t: ts[i] * 1000, o: o, h: Math.max(h, o, c), l: Math.min(l, o, c), c: c, v: q.volume && q.volume[i] > 0 ? q.volume[i] : 0 });
    }
    if (!bars.length) return null;
    var m = r.meta || {}, sym = up(m.symbol);
    return {
      bars: bars,
      meta: {
        sym: sym, name: m.longName || m.shortName || sym, exch: m.fullExchangeName || m.exchangeName || '', ccy: m.currency || '', type: m.instrumentType || '',
        price: m.regularMarketPrice, prev: m.chartPreviousClose != null ? m.chartPreviousClose : m.previousClose, hi52: m.fiftyTwoWeekHigh, lo52: m.fiftyTwoWeekLow,
        tz: m.exchangeTimezoneName || 'America/New_York', open: m.currentTradingPeriod && m.currentTradingPeriod.regular
      }
    };
  }
  function chartUrl(sym, range, iv) { return API + '/chart/' + encodeURIComponent(sym) + '?range=' + range + '&interval=' + iv; }
  function fetchDaily(sym) { return cget('d:' + sym, 15 * 60e3, function () { return getJSON(chartUrl(sym, '5y', '1d')).then(parseChart); }); }
  function fetchMax(sym) { return cget('m:' + sym, 60 * 60e3, function () { return getJSON(chartUrl(sym, 'max', '1mo')).then(parseChart); }); }
  function fetchIntra(sym, per) { return cget('i' + per + ':' + sym, 60e3, function () { return getJSON(chartUrl(sym, '5d', per === '1D' ? '5m' : '15m')).then(parseChart); }); }
  function fetchInfo(sym) { return cget('f:' + sym, 60 * 60e3, function () { return getJSON(API + '/info/' + encodeURIComponent(sym)).then(null, function () { return null; }); }); }
  function fetchNews(sym) {
    return cget('n:' + sym, 15 * 60e3, function () {
      return getJSON(API + '/news/' + encodeURIComponent(sym) + '?language=es').then(function (j) { return j && Array.isArray(j.news) ? j.news : []; }).then(null, function () { return []; });
    });
  }
  function fetchSearch(q) {
    return cget('s:' + q.toLowerCase(), 5 * 60e3, function () {
      return getJSON(API + '/search?q=' + encodeURIComponent(q)).then(function (j) {
        var out = [];
        ((j && j.quotes) || []).forEach(function (x) {
          if (!x || !x.symbol || !TYPES[x.quoteType] || out.length >= 8) return;
          out.push({ sym: up(x.symbol), name: x.longname || x.shortname || x.symbol, type: TYPES[x.quoteType], exch: x.exchDisp || x.exchange || '' });
        });
        return out;
      });
    });
  }
  function windowStart(per, bars) {
    var n = bars.length, i; if (per === 'Máx' || n < 2) return 0;
    var d = new Date(bars[n - 1].t);
    if (per === 'YTD') { var y = d.getUTCFullYear(); for (i = n - 1; i >= 0; i--) if (new Date(bars[i].t).getUTCFullYear() < y) return i; return 0; }
    var mo = MONTHS[per]; if (!mo) return 0;
    d.setUTCMonth(d.getUTCMonth() - mo); var cut = d.getTime();
    for (i = 0; i < n; i++) if (bars[i].t >= cut) return i;
    return 0;
  }
  /* datos del periodo elegido: intradía (1D, 5D) o diario/mensual recortado a la ventana */
  function fetchPeriod(sym, per) {
    if (per === '1D' || per === '5D') {
      return Promise.all([fetchIntra(sym, per), fetchDaily(sym).then(null, function () { return null; })]).then(function (r) {
        var raw = r[0], dl = r[1]; if (!raw) return null;
        var bars = raw.bars, tz = raw.meta.tz, prev = null;
        if (per === '1D') {
          var dk = dayKey(bars[bars.length - 1].t, tz);
          bars = bars.filter(function (b) { return dayKey(b.t, tz) === dk; });
          var lv = rt.live[sym];
          if (lv && lv.prev > 0) prev = lv.prev;
          else if (dl) { for (var i = dl.bars.length - 1; i >= 0; i--) if (dayKey(dl.bars[i].t, dl.meta.tz) < dk) { prev = dl.bars[i].c; break; } }
        }
        return { bars: bars, all: bars, off: 0, meta: raw.meta, intraday: true, tz: tz, prev: prev, per: per };
      });
    }
    return (per === 'Máx' ? fetchMax(sym) : fetchDaily(sym)).then(function (raw) {
      if (!raw) return null;
      var off = windowStart(per, raw.bars);
      return { bars: raw.bars.slice(off), all: raw.bars, off: off, meta: raw.meta, intraday: false, tz: raw.meta.tz, prev: null, per: per };
    });
  }

  /* ================= estado de ejecución ================= */
  var rt = {
    built: false, visible: false, shown: false, loaded: false, tok: 0, ptok: 0, ctok: 0, hasChart: false,
    live: {}, liveAt: 0, polling: null, pt: 0, mt: 0,
    daily: null, meta: null, info: null, main: null, dec: 2, cmpOn: false, cmpOpen: false, newChip: '', tab: 'watch',
    cross: null, roKey: '', announced: '', newsSym: '', stT: 0
  };
  var ch = null, mainCombo = null, cmpCombo = null;
  var els = {};

  /* ================= esqueleto estático ================= */
  function build() {
    var bandHtml = (D.markets || []).map(function (m, i) {
      var unit = m.unit === '%' ? '%' : UNITS[up(m.y)] || '';
      return '<button type="button" class="mkc" data-y="' + esc(up(m.y)) + '" aria-pressed="false" style="--i:' + i + '"><span class="mkc-top">' + mark(up(m.y), 24) + '<span class="mkc-name">' + esc(m.sym) + '</span></span>' +
        '<span class="mkt-px"><b class="num" data-price>' + esc(fmtNum(m.last, decFor(up(m.y), m.last))) + '</b>' + (unit ? '<small class="u">' + esc(unit) + '</small>' : '') + '</span>' +
        '<span class="delta"></span><svg class="mkc-sp" viewBox="0 0 140 28" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="' + sparkPath(m.hist) + '"/></svg></button>';
    }).join('');
    var perHtml = '<i class="mk-per-ind" aria-hidden="true"></i>' + PERIODS.map(function (p) {
      return '<button type="button" class="mkp" data-p="' + esc(p) + '" aria-pressed="false"><span class="mkp-l">' + esc(p) + '</span><span class="mkp-v"></span></button>';
    }).join('');
    root.innerHTML =
      '<header class="app-head mk-head"><div><h1 id="mkH1" tabindex="-1">Mercados</h1><p class="asof">Cotizaciones con hasta 15 min de retraso · actualizado <span id="mkAsof">–</span></p></div>' +
      '<div class="mk-status" id="mkStatus" role="group" aria-label="Estado de los mercados"></div></header>' +
      '<div class="mk-search" id="mkSearch"></div>' +
      '<div class="mkt" id="mkBandHost"><div class="mkt-band" id="mkBand" role="group" aria-label="Mercados principales">' + bandHtml + '</div></div>' +
      '<div class="mk-grid">' +
      '<section class="panel mk-detail" id="mkSym" aria-label="Detalle del símbolo">' +
      '<div class="mk-swap" id="mkHead">' +
      '<div class="mk-sym-head"><div class="mk-id"><span class="mk-mark" id="mkMark"></span><div class="mk-idt"><h2 class="mk-name" id="mkName"></h2>' +
      '<div class="mk-idl"><span class="mk-chip" id="mkChip"></span><span class="mk-exch" id="mkExch"></span><span id="mkPill"></span></div></div></div>' +
      '<div class="mk-acts"><button type="button" class="btn btn-secondary btn-sm mk-follow" id="mkFollow" aria-pressed="false">' + ICON_STAR + '<span class="mk-bursts" aria-hidden="true"></span><span id="mkFollowT">Seguir</span></button>' +
      '<button type="button" class="btn btn-secondary btn-sm mk-cmpb" id="mkCmpB" aria-pressed="false" aria-controls="mkCmp">Comparar</button></div></div>' +
      '<div class="mk-quote"><span class="mk-px"><b class="num" id="mkPx" data-price>–</b><small class="u" id="mkUnit"></small></span><span class="mk-dlt" id="mkDelta"></span><span class="mk-when" id="mkWhen"></span></div>' +
      '</div>' +
      '<div class="mk-ro" id="mkRo"></div>' +
      '<div class="mk-tools"><div class="mk-per mkt-per" id="mkPer" role="group" aria-label="Periodo de la gráfica">' + perHtml + '</div>' +
      '<div class="mk-tools-r"><div class="seg mk-type" id="mkType" role="group" aria-label="Tipo de gráfica" style="--n:2;--i:0"><button type="button" data-t="area" aria-pressed="true">Área</button><button type="button" data-t="candles" aria-pressed="false">Velas</button><i class="seg-pill" aria-hidden="true"></i></div>' +
      '<div class="mk-indw" id="mkIndW"><button type="button" class="btn btn-secondary btn-sm mk-indb" id="mkIndB" aria-haspopup="true" aria-expanded="false" aria-controls="mkIndP">Indicadores <span class="mk-cnt" id="mkCnt">0</span></button>' +
      '<div class="mk-ipop" id="mkIndP" role="group" aria-label="Indicadores" hidden></div></div></div></div>' +
      '<div class="mk-cmp" id="mkCmp" hidden><div class="mk-chips" id="mkChips"></div><div class="mk-cmp-add" id="mkCmpAdd" hidden></div><p class="mk-cmp-note" id="mkCmpNote" hidden>La comparación usa cierres diarios.</p></div>' +
      '<div class="mk-plot"><div class="mkt-cv mk-cv" id="mkCv"></div><div class="mk-state" id="mkState" role="status" data-k="load"></div></div>' +
      '<dl class="mk-statg" id="mkStatG"></dl>' +
      '<div class="mk-range" id="mkRange" role="img" aria-label="Rango de 52 semanas"><span class="mk-range-t">Rango de 52 semanas</span><div class="mk-range-b"><span class="mk-rlo" id="mkRlo">–</span>' +
      '<div class="mk-track"><i class="mk-fill" id="mkFill"></i><i class="mk-mk52" id="mkMk52"></i></div><span class="mk-rhi" id="mkRhi">–</span></div></div>' +
      '<div class="mk-about" id="mkAbout"></div>' +
      '<div class="mk-pos" id="mkPos" hidden></div>' +
      '</section>' +
      '<aside class="mk-side">' +
      '<section class="panel mk-list" id="mkWatch" aria-label="Lista de seguimiento"><div class="seg mk-tabs" id="mkTabs" role="group" aria-label="Lista" style="--n:2;--i:0"><button type="button" data-tab="watch" aria-pressed="true"></button><button type="button" data-tab="pos" aria-pressed="false"></button><i class="seg-pill" aria-hidden="true"></i></div>' +
      '<div class="mk-ulw" id="mkUlw"><i class="mk-bar" id="mkBar" aria-hidden="true"></i><ul class="mk-ul" id="mkUl"></ul></div></section>' +
      '<section class="panel mk-movers" id="mkMovers" hidden><div class="panel-head"><h2>Movimientos de hoy</h2></div><div class="mk-mvg" id="mkMvg"></div></section>' +
      '</aside></div>' +
      '<section class="panel mk-news" id="mkNews" hidden aria-labelledby="mkNewsT"><div class="panel-head"><h2 id="mkNewsT">Noticias</h2></div><div class="mk-newsg" id="mkNewsG"></div></section>' +
      '<p class="mk-foot">Datos de Yahoo Finance, Binance y CoinGecko con retraso. Informativo; no es asesoría de inversión.</p>' +
      '<span class="sr" id="mkLive" aria-live="polite"></span>';
    ['mkH1', 'mkAsof', 'mkStatus', 'mkSearch', 'mkBandHost', 'mkBand', 'mkSym', 'mkHead', 'mkMark', 'mkName', 'mkChip', 'mkExch', 'mkPill', 'mkFollow', 'mkFollowT', 'mkCmpB', 'mkPx', 'mkUnit', 'mkDelta', 'mkWhen', 'mkRo',
      'mkPer', 'mkType', 'mkIndW', 'mkIndB', 'mkCnt', 'mkIndP', 'mkCmp', 'mkChips', 'mkCmpAdd', 'mkCmpNote', 'mkCv', 'mkState', 'mkStatG', 'mkRange', 'mkRlo', 'mkRhi', 'mkFill', 'mkMk52', 'mkAbout', 'mkPos',
      'mkWatch', 'mkTabs', 'mkUlw', 'mkBar', 'mkUl', 'mkMovers', 'mkMvg', 'mkNews', 'mkNewsT', 'mkNewsG', 'mkLive'].forEach(function (id) { els[id] = doc.getElementById(id); });
    odoAll(root);
  }
  function sparkPath(vals) {
    vals = (vals || []).slice(-40); if (vals.length < 2) return '';
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), n = vals.length - 1;
    return vals.map(function (v, i) { return (i ? 'L' : 'M') + (i / n * 140).toFixed(1) + ' ' + (25 - (v - mn) / (mx - mn || 1) * 22).toFixed(1); }).join('');
  }
  function miniSpark(vals) {
    vals = (vals || []).slice(-30).filter(finite); if (vals.length < 5) return '';
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), n = vals.length - 1;
    var d = vals.map(function (v, i) { return (i ? 'L' : 'M') + (i / n * 56).toFixed(1) + ' ' + (18 - (v - mn) / (mx - mn || 1) * 16).toFixed(1); }).join('');
    return '<svg class="mk-sp ' + (vals[n] >= vals[0] ? 'gain' : 'loss') + '" viewBox="0 0 56 20" aria-hidden="true"><path d="' + d + '"/></svg>';
  }
  function sparkVals(sym) {
    var b = bandOf(sym); if (b && b.hist && b.hist.length) return b.hist.slice(-30);
    var dl = cpeek('d:' + sym); if (dl && dl.bars) return dl.bars.slice(-30).map(function (x) { return x.c; });
    return null;
  }

  /* ================= combobox de búsqueda (principal y de comparación) ================= */
  var comboN = 0;
  function Combo(host, o) {
    var uid = 'mkcb' + (++comboN), items = [], active = -1, isOpen = false, tok = 0, timer = 0, pendingEnter = false;
    host.innerHTML = '<div class="mk-sb' + (o.small ? ' mk-sb-s' : '') + '">' + ICON_SEARCH +
      '<input class="mk-in" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="' + uid + '-l" aria-label="' + esc(o.label) + '" placeholder="' + esc(o.placeholder) + '" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">' +
      '<span class="mk-spin" aria-hidden="true"></span>' + (o.kbd ? '<kbd class="mk-kbd" aria-hidden="true">/</kbd>' : '') + '</div>' +
      '<div class="mk-pop" id="' + uid + '-l" role="listbox" aria-label="Resultados"><div class="mk-opts"><i class="mk-hl" aria-hidden="true"></i><div class="mk-rows"></div></div></div>';
    var sb = host.querySelector('.mk-sb'), input = host.querySelector('.mk-in'), pop = host.querySelector('.mk-pop'), rowsEl = host.querySelector('.mk-rows'), hlEl = host.querySelector('.mk-hl');

    function setOpen(v) {
      if (v === isOpen) return;
      isOpen = v; input.setAttribute('aria-expanded', v ? 'true' : 'false'); pop.classList.toggle('is-open', v);
      if (!v) { input.removeAttribute('aria-activedescendant'); active = -1; }
    }
    function optEls() { return $$('.mk-opt', rowsEl); }
    function setActive(i, scroll) {
      var list = optEls(); if (!list.length) { active = -1; return; }
      active = (i + list.length) % list.length;
      list.forEach(function (e, k) { e.setAttribute('aria-selected', k === active ? 'true' : 'false'); });
      var row = list[active]; input.setAttribute('aria-activedescendant', row.id);
      hlEl.style.transform = 'translateY(' + row.offsetTop + 'px)'; hlEl.style.height = row.offsetHeight + 'px'; hlEl.classList.add('on');
      if (scroll && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
    }
    function paint(groups, q, empty) {
      items = []; var h = '';
      groups.forEach(function (g) {
        if (g.h) h += '<div class="mk-grp" role="presentation">' + esc(g.h) + '</div>';
        g.list.forEach(function (it) {
          var i = items.push(it) - 1, on = isFollowed(it.sym);
          h += '<div class="mk-opt" role="option" id="' + uid + '-o' + i + '" data-i="' + i + '" aria-selected="false">' + mark(it.sym, 28) + '<span class="mk-chip">' + hl(it.sym, q) + '</span>' +
            '<span class="mk-on">' + hl(it.name, q) + '</span><span class="mk-om">' + esc(it.type || '') + (it.exch ? ' · ' + esc(it.exch) : '') + '</span>' +
            (o.star ? '<button type="button" class="mk-star-sm' + (on ? ' is-on' : '') + '" tabindex="-1" data-star="' + i + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Dejar de seguir ' : 'Seguir ') + esc(it.sym) + '">' + ICON_STAR + '</button>' : '') + '</div>';
        });
      });
      if (!items.length && empty) h = '<div class="mk-none" role="presentation">' + empty + '</div>';
      rowsEl.innerHTML = h; hlEl.classList.remove('on'); active = -1; input.removeAttribute('aria-activedescendant');
      setOpen(!!h);
      if (items.length) stagger($$('.mk-opt', rowsEl));
      if (pendingEnter) { pendingEnter = false; if (items.length) pick(items[0]); }
    }
    function showDefault() {
      if (!o.recents) { setOpen(false); return; }
      var seen = {}, rec = [], pos = [];
      st.recent.forEach(function (s) { if (seen[s]) return; seen[s] = 1; rec.push({ sym: s, name: nameOf(s), type: '', exch: '' }); });
      (D.positions || []).forEach(function (p) { var s = up(p.ticker); if (pos.length < 5 && s && !seen[s]) { seen[s] = 1; pos.push({ sym: s, name: p.name || s, type: '', exch: '' }); } });
      var g = []; if (rec.length) g.push({ h: 'Recientes', list: rec }); if (pos.length) g.push({ h: 'Tus posiciones', list: pos });
      if (!g.length) { setOpen(false); return; }
      paint(g, '');
    }
    function doSearch(q) {
      var my = ++tok; sb.classList.add('is-busy');
      fetchSearch(q).then(function (list) { return list; }, function () { return null; }).then(function (list) {
        if (my !== tok) return; sb.classList.remove('is-busy');
        if (list === null) { pendingEnter = false; paint([], q, 'No pudimos buscar ahora. Intenta de nuevo.'); return; }
        paint(list.length ? [{ list: list }] : [], q, 'No encontramos «' + esc(q) + '». Prueba con el ticker (p. ej. WALMEX.MX).');
      });
    }
    function run(flush) {
      var q = input.value.trim(); clearTimeout(timer);
      if (!q) { tok++; sb.classList.remove('is-busy'); showDefault(); return; }
      if (flush) doSearch(q); else { sb.classList.add('is-busy'); timer = setTimeout(function () { doSearch(q); }, 220); }
    }
    function close(clear) {
      clearTimeout(timer); tok++; pendingEnter = false; sb.classList.remove('is-busy'); setOpen(false);
      if (clear) input.value = '';
    }
    function pick(it) {
      if (!it) return; nm[it.sym] = it.name || nm[it.sym] || it.sym; close(true); input.blur();
      if (o.onPick) o.onPick(it);
      close(true);
    }
    input.addEventListener('input', function () { run(false); });
    input.addEventListener('focus', function () { if (!isOpen) run(true); });
    input.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) { run(true); return; }
        if (items.length) setActive(active < 0 ? (k === 'ArrowDown' ? 0 : items.length - 1) : active + (k === 'ArrowDown' ? 1 : -1), true);
      } else if (k === 'Enter') {
        e.preventDefault();
        if (active >= 0 && items[active]) pick(items[active]);
        else if (items.length && !sb.classList.contains('is-busy')) pick(items[0]);
        else if (input.value.trim()) { pendingEnter = true; run(true); }
      } else if (k === 'Escape') {
        if (isOpen || input.value) { e.preventDefault(); e.stopPropagation(); close(true); } else if (o.onClose) o.onClose();
        if (o.onClose && !isOpen) o.onClose();
      } else if (k === 'Tab') close(false);
    });
    rowsEl.addEventListener('pointermove', function (e) { var r = e.target.closest && e.target.closest('.mk-opt'); if (r && +r.dataset.i !== active) setActive(+r.dataset.i, false); });
    rowsEl.addEventListener('mousedown', function (e) { e.preventDefault(); });
    rowsEl.addEventListener('click', function (e) {
      var s = e.target.closest('.mk-star-sm');
      if (s) { var it = items[+s.dataset.star]; if (it) { toggleFollow(it.sym, it.name); var on = isFollowed(it.sym); s.classList.toggle('is-on', on); s.setAttribute('aria-pressed', on); s.setAttribute('aria-label', (on ? 'Dejar de seguir ' : 'Seguir ') + it.sym); } return; }
      var r = e.target.closest('.mk-opt'); if (r) pick(items[+r.dataset.i]);
    });
    doc.addEventListener('pointerdown', function (e) { if (isOpen && !host.contains(e.target)) close(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen && !host.contains(e.target)) close(true); });
    return {
      input: input, close: close,
      focus: function () { input.focus(); try { input.select(); } catch (e) { } },
      refreshStars: function () { $$('.mk-star-sm', rowsEl).forEach(function (s) { var it = items[+s.dataset.star]; if (!it) return; var on = isFollowed(it.sym); s.classList.toggle('is-on', on); s.setAttribute('aria-pressed', on); }); }
    };
  }

  /* ================= estado de los mercados (píldoras) ================= */
  function paintStatus() {
    if (!els.mkStatus) return;
    els.mkStatus.innerHTML = MARKETS.map(function (m) {
      var on = mktOpen(m);
      return '<span class="mk-pill' + (on ? ' is-open' : '') + '" tabindex="0" data-tip="' + esc(m.tip) + '"><i class="mk-dot" aria-hidden="true"></i><b>' + esc(m.name) + '</b><span>' + (on ? 'Abierto' : 'Cerrado') + '</span></span>';
    }).join('');
  }

  /* ================= cotización ================= */
  function quoteFor(sym) {
    var lv = rt.live[sym]; if (lv && lv.price > 0) return { price: lv.price, prev: lv.prev, live: true };
    var dl = sym === st.sym ? rt.daily : cpeek('d:' + sym);
    if (dl && dl.bars && dl.bars.length) { var b = dl.bars, n = b.length; return { price: b[n - 1].c, prev: n > 1 ? b[n - 2].c : null, live: false }; }
    if (sym === st.sym && rt.main && rt.main.bars.length) { var m = rt.main; return { price: m.bars[m.bars.length - 1].c, prev: m.prev, live: false }; }
    if (sym === st.sym && rt.meta && rt.meta.price > 0) return { price: rt.meta.price, prev: null, live: false };
    return null;
  }
  function chgOf(sym, q) {
    if (!q || !(q.prev > 0)) return null;
    return sym === '^TNX' ? q.price - q.prev : (q.price / q.prev - 1) * 100;
  }
  function paintQuote(dir) {
    if (!els.mkPx) return;
    var sym = st.sym, q = quoteFor(sym);
    if (!q) { setPx(els.mkPx, '–'); els.mkUnit.textContent = ''; els.mkDelta.innerHTML = ''; els.mkWhen.textContent = ''; return; }
    var dec = decFor(sym, q.price);
    setPx(els.mkPx, fmtNum(q.price, dec), dir); els.mkUnit.textContent = unitFor(sym, rt.meta);
    if (q.prev > 0) {
      var abs = q.price - q.prev, tnx = sym === '^TNX', p = dParts(tnx ? abs : (q.price / q.prev - 1) * 100, tnx ? 'pp' : 'pct');
      els.mkDelta.innerHTML = tnx ? '<span class="' + p.cls + '">' + p.inner + '</span>' :
        '<span class="' + p.cls + '"><i class="arw" aria-hidden="true">' + (p.cls.indexOf('gain') > 0 ? '▲' : p.cls.indexOf('loss') > 0 ? '▼' : '▪') + '</i><span>' + signed(abs, dec) + ' (' + pct((q.price / q.prev - 1) * 100) + ')</span></span>';
    } else els.mkDelta.innerHTML = NA;
    paintWhen();
  }
  function lastBarT() {
    var dl = rt.daily; if (dl && dl.bars.length) return dl.bars[dl.bars.length - 1].t;
    var m = rt.main; if (m && m.bars.length) return m.bars[m.bars.length - 1].t;
    return 0;
  }
  function paintWhen() {
    if (!els.mkWhen) return;
    var sym = st.sym, open = symIsOpen(sym, rt.meta), t = '';
    if (open && rt.live[sym] && rt.liveAt) t = ago(rt.liveAt);
    else { var lt = lastBarT(); if (lt) t = 'al cierre del ' + fmtShort(lt, (rt.meta && rt.meta.tz) || 'America/New_York'); }
    els.mkWhen.textContent = t;
  }
  function paintHead() {
    var sym = st.sym, meta = rt.meta, n = nameOf(sym, meta);
    els.mkMark.innerHTML = mark(sym, 40); els.mkName.textContent = n; els.mkChip.textContent = sym;
    els.mkExch.textContent = meta && meta.exch ? meta.exch : '';
    var open = symIsOpen(sym, meta);
    els.mkPill.innerHTML = '<span class="mk-pill mk-pill-s' + (open ? ' is-open' : '') + '"><i class="mk-dot" aria-hidden="true"></i><span>' + (open ? 'Abierto' : 'Cerrado') + '</span></span>';
    paintFollow();
  }
  function paintFollow() {
    if (!els.mkFollow) return;
    var on = isFollowed(st.sym);
    els.mkFollow.setAttribute('aria-pressed', on ? 'true' : 'false'); els.mkFollow.classList.toggle('is-on', on); els.mkFollowT.textContent = on ? 'Siguiendo' : 'Seguir';
    els.mkFollow.setAttribute('aria-label', (on ? 'Dejar de seguir ' : 'Seguir ') + nameOf(st.sym, rt.meta));
  }
  function swapHead(fn) {
    var el = els.mkHead;
    if (!el || reduce() || !el.animate || !rt.shown) { fn(); return; }
    if (rt.swapA) { try { rt.swapA.cancel(); } catch (e) { } }
    var a = el.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: 120, easing: EASE, fill: 'forwards' }), done = false;
    rt.swapA = a;
    function go() {
      if (done) return; done = true; try { a.cancel(); } catch (e) { }
      fn(); el.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: EASE });
    }
    a.onfinish = go; setTimeout(go, 220);
  }
  function announce() {
    var sym = st.sym; if (rt.announced === sym) return;
    var q = quoteFor(sym); if (!q) return;
    rt.announced = sym; var c = chgOf(sym, q), dec = decFor(sym, q.price);
    els.mkLive.textContent = nameOf(sym, rt.meta) + ': ' + fmtNum(q.price, dec) + ' ' + unitFor(sym, rt.meta) + (finite(c) ? ', ' + (sym === '^TNX' ? signed(c, 2) + ' pp' : pct(c)) : '');
  }

  /* ================= tira de periodos = tabla de rendimiento ================= */
  function perfValue(per) {
    var dl = rt.daily, sym = st.sym; if (!dl || !dl.bars.length) return null;
    var b = dl.bars, n = b.length, q = quoteFor(sym), last = q ? q.price : b[n - 1].c, base = null, i;
    if (per === '1D') { base = q && q.prev > 0 ? q.prev : n > 1 ? b[n - 2].c : null; }
    else if (per === '5D') { base = n > 5 ? b[n - 6].c : null; }
    else if (per === 'YTD') { var y = new Date().getUTCFullYear(); for (i = n - 1; i >= 0; i--) if (new Date(b[i].t).getUTCFullYear() < y) { base = b[i].c; break; } }
    else if (per === 'Máx') { var mx = cpeek('m:' + sym); base = mx && mx.bars.length ? mx.bars[0].c : null; if (base == null) return undefined; }
    else {
      var cutD = new Date(); cutD.setUTCMonth(cutD.getUTCMonth() - MONTHS[per]); var cut = cutD.getTime();
      if (b[0].t <= cut + 10 * 864e5) for (i = 0; i < n; i++) if (b[i].t >= cut) { base = b[i].c; break; }
    }
    if (!(base > 0) || !finite(last)) return null;
    return sym === '^TNX' ? last - base : (last / base - 1) * 100;
  }
  function paintPerf() {
    if (!els.mkPer) return;
    var loading = !rt.daily;
    $$('.mkp', els.mkPer).forEach(function (b) {
      var p = b.dataset.p, v = b.querySelector('.mkp-v'), on = p === st.period;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (loading) { v.innerHTML = '<i class="mk-sk" style="--w:44px"></i>'; return; }
      var x = perfValue(p);
      if (x === undefined) v.innerHTML = '<span class="mk-nd">—</span>';
      else v.innerHTML = dHTML(x, st.sym === '^TNX' ? 'pp' : 'pct');
    });
  }
  function placePerInd(instant) {
    var ind = $('.mk-per-ind', els.mkPer), btn = $('.mkp[aria-pressed="true"]', els.mkPer); if (!ind || !btn || !btn.offsetWidth) return;
    if (instant) ind.classList.add('no-tr');
    ind.style.width = btn.offsetWidth + 'px'; ind.style.transform = 'translateX(' + btn.offsetLeft + 'px)';
    if (instant) { void ind.offsetWidth; ind.classList.remove('no-tr'); }
    var c = els.mkPer;
    /* solo se desplaza si el periodo activo no se ve completo (en escritorio la tira cabe casi entera y centrarla cortaba "1D") */
    var vis = btn.offsetLeft >= c.scrollLeft && btn.offsetLeft + btn.offsetWidth <= c.scrollLeft + c.clientWidth;
    if (c.scrollWidth > c.clientWidth + 2 && !vis) {
      var left = btn.offsetLeft - (c.clientWidth - btn.offsetWidth) / 2;
      try { c.scrollTo({ left: left, behavior: reduce() || instant ? 'auto' : 'smooth' }); } catch (e) { c.scrollLeft = left; }
    }
  }

  /* ================= estadísticas, rango de 52 semanas y "acerca de" ================= */
  function pickNum(info, keys) { for (var i = 0; i < keys.length; i++) { var v = info && info[keys[i]]; if (finite(v)) return v; } return null; }
  function paintStats() {
    if (!els.mkStatG) return;
    var sym = st.sym, info = rt.info || null, meta = rt.meta, dl = rt.daily, t = symType(sym, meta), last = dl && dl.bars.length ? dl.bars[dl.bars.length - 1] : null;
    var dec = function (v) { return finite(v) && v > 0 ? esc(pxTxt(sym, v)) : NA; };
    var vol = pickNum(info, ['volume', 'regularMarketVolume']); if (!(vol > 0) && last) vol = last.v;
    var o = pickNum(info, ['open', 'regularMarketOpen']); if (o == null && last) o = last.o;
    var hi = pickNum(info, ['dayHigh', 'regularMarketDayHigh']); if (hi == null && last) hi = last.h;
    var lo = pickNum(info, ['dayLow', 'regularMarketDayLow']); if (lo == null && last) lo = last.l;
    var pv = pickNum(info, ['regularMarketPreviousClose', 'previousClose']); if (pv == null) { var q = quoteFor(sym); pv = q && q.prev; }
    var rows = [['Apertura', dec(o)], ['Máximo del día', dec(hi)], ['Mínimo del día', dec(lo)], ['Cierre anterior', dec(pv)], ['Volumen', compact(vol)], ['Volumen promedio (3 m)', compact(pickNum(info, ['averageVolume', 'averageDailyVolume3Month', 'averageVolume3Month']))]];
    var fund = t === 'EQUITY' || t === 'ETF' || t === 'MUTUALFUND', eq = t === 'EQUITY';
    if (fund || t === 'CRYPTOCURRENCY') {
      var cap = pickNum(info, ['marketCap']), ccy = info && info.currency ? info.currency : (meta && meta.ccy) || '';
      rows.push(['Capitalización', compact(cap) + (cap > 0 && ccy ? ' <small class="u">' + esc(ccy) + '</small>' : '')]);
    }
    if (fund) {
      var pe = pickNum(info, ['trailingPE']), beta = pickNum(info, ['beta']), dy = pickNum(info, ['trailingAnnualDividendYield']);
      rows.push(['P/U (12 m)', pe > 0 ? esc(fmtNum(pe, 2)) : NA], ['Beta (5 a)', finite(beta) ? esc(fmtNum(beta, 2)) : NA], ['Rend. por dividendo', dy > 0 ? esc(fmtNum(dy * 100, 2)) + ' %' : NA]);
    }
    if (eq) rows.push(['Sector', info && info.sector ? esc(SECTORS[info.sector] || info.sector) : NA], ['Industria', info && info.industry ? '<span lang="en">' + esc(info.industry) + '</span>' : NA]);
    els.mkStatG.classList.toggle('is-skel', !info && !dl);
    els.mkStatG.innerHTML = rows.map(function (r) { return '<div class="mk-stat"><dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd></div>'; }).join('');
    /* rango de 52 semanas */
    var h52 = pickNum(info, ['fiftyTwoWeekHigh']), l52 = pickNum(info, ['fiftyTwoWeekLow']);
    if (h52 == null && meta) h52 = finite(meta.hi52) ? meta.hi52 : null; if (l52 == null && meta) l52 = finite(meta.lo52) ? meta.lo52 : null;
    if ((h52 == null || l52 == null) && dl && dl.bars.length) {
      var yb = dl.bars.slice(-252); h52 = Math.max.apply(null, yb.map(function (x) { return x.h; })); l52 = Math.min.apply(null, yb.map(function (x) { return x.l; }));
    }
    paintRange(l52, h52);
    /* acerca de */
    var sum = info && info.longBusinessSummary ? String(info.longBusinessSummary) : '';
    if (sum) {
      if (sum.length > 1200) sum = sum.slice(0, 1197).replace(/\s+\S*$/, '') + '…';
      var w = safeUrl(info.website);
      els.mkAbout.innerHTML = '<details class="mk-det"><summary>Acerca de ' + esc(nameOf(sym, meta)) + ' (en inglés)' + ICON_CHEV + '</summary><p>' + esc(sum) + '</p>' +
        (w ? '<a class="lnk" href="' + esc(w) + '" target="_blank" rel="noopener noreferrer">' + esc(w.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')) + '<span class="sr"> (se abre en una pestaña nueva)</span></a>' : '') + '</details>';
    } else els.mkAbout.innerHTML = '';
  }
  function paintRange(lo, hi) {
    var box = els.mkRange; if (!box) return;
    var q = quoteFor(st.sym), px = q ? q.price : null;
    if (!(finite(lo) && finite(hi) && hi > lo && finite(px))) { box.classList.add('is-nd'); els.mkRlo.innerHTML = NA; els.mkRhi.innerHTML = ''; box.setAttribute('aria-label', 'Rango de 52 semanas: sin dato'); return; }
    box.classList.remove('is-nd');
    var p = clamp((px - lo) / (hi - lo), 0, 1);
    els.mkRlo.textContent = pxTxt(st.sym, lo); els.mkRhi.textContent = pxTxt(st.sym, hi);
    els.mkFill.style.transform = 'scaleX(' + p.toFixed(4) + ')'; els.mkMk52.style.left = (p * 100).toFixed(2) + '%';
    box.setAttribute('aria-label', 'Rango de 52 semanas: mínimo ' + pxTxt(st.sym, lo) + ', máximo ' + pxTxt(st.sym, hi) + '. El precio está al ' + Math.round(p * 100) + ' % del rango.');
  }

  /* ================= tu posición ================= */
  function paintPos() {
    var p = findPos(st.sym), el = els.mkPos; if (!el) return;
    if (!p) { el.hidden = true; el.innerHTML = ''; return; }
    var cls = String(p.cls || '').normalize ? String(p.cls || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() : '';
    var unit = /^accion/.test(cls) ? (p.qty === 1 ? 'acción' : 'acciones') : (p.qty === 1 ? 'unidad' : 'unidades');
    el.hidden = false;
    el.innerHTML = '<p class="mk-pos-t"><b>En tus portafolios</b><span> · ' + esc(new Intl.NumberFormat('es-MX', { maximumFractionDigits: 4 }).format(p.qty || 0)) + ' ' + unit +
      '</span><span> · valor ' + esc(D.fmt.mxn(p.value || 0, 0)) + '</span><span> · ganancia ' + dHTML(p.pnlPct, 'pct') + '</span></p>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-act="pos">Ver posición</button>';
  }

  /* ================= lectura de la mira ================= */
  function paintRo(info) {
    var d = rt.main, el = els.mkRo; if (!el) return;
    if (!d || !d.bars.length) { el.innerHTML = ''; rt.roKey = ''; return; }
    var b = info, cmpMode = rt.cmpOn;
    if (!b) {
      var n = d.bars.length, x = d.bars[n - 1], pv = n > 1 ? d.bars[n - 2].c : d.prev;
      b = { i: n - 1, t: x.t, o: x.o, h: x.h, l: x.l, c: x.c, v: x.v, chg: pv > 0 ? (x.c / pv - 1) * 100 : null, cmp: null, ind: null };
    }
    var key = (info ? 'x' : 'r') + b.i + '|' + b.c + '|' + (b.cmp ? b.cmp.map(function (c) { return c.pct; }).join(',') : '') + '|' + st.sym + st.period + cmpMode;
    if (key === rt.roKey) return; rt.roKey = key;
    var dec = rt.dec, f = function (v) { return esc(fmtNum(v, dec)); };
    var h = '<span class="mk-ro-d">' + esc(fmtDate(b.t, d)) + '</span>';
    if (cmpMode) {
      h += '<span class="mk-rc"><i class="mk-cd main"></i>' + esc(st.sym) + ' <b>' + f(b.c) + '</b></span>';
      (b.cmp || []).forEach(function (c) { h += '<span class="mk-rc"><i class="mk-cd" style="--c:' + esc(chartColor(c.color)) + '"></i>' + esc(c.label) + ' ' + dHTML(c.pct, 'pct') + '</span>'; });
    } else {
      h += '<span class="mk-rc"><i>A</i><b>' + f(b.o) + '</b></span><span class="mk-rc"><i>Máx</i><b>' + f(b.h) + '</b></span><span class="mk-rc"><i>Mín</i><b>' + f(b.l) + '</b></span><span class="mk-rc"><i>C</i><b>' + f(b.c) + '</b></span>';
      if (finite(b.chg)) h += '<span class="mk-rc">' + dHTML(b.chg, 'pct') + '</span>';
      if (b.v > 0) h += '<span class="mk-rc"><i>Vol</i><b>' + compact(b.v) + '</b></span>';
      if (b.ind) st.ind.forEach(function (k) {
        var v = b.ind[k]; if (v == null) return;
        var txt = '';
        if (finite(v)) txt = f(k === 'rsi' || k === 'stoch' ? v : v);
        else if (typeof v === 'object') txt = Object.keys(v).filter(function (kk) { return finite(v[kk]); }).map(function (kk) { return esc(fmtNum(v[kk], 2)); }).join(' · ');
        if (txt) h += '<span class="mk-rc"><i>' + esc(IND_SHORT[k] || k) + '</i><b>' + txt + '</b></span>';
      });
    }
    el.innerHTML = h;
  }
  function onCross(info) { rt.cross = info; paintRo(info || null); }
  function chartColor(slot) { try { return win.CampoMktChart && win.CampoMktChart.color ? win.CampoMktChart.color(slot) : 'currentColor'; } catch (e) { return 'currentColor'; } }

  /* ================= estados de la gráfica ================= */
  function setState(k) {
    var el = els.mkState; if (!el) return;
    clearTimeout(rt.stT);
    if (el.dataset.k === k && k !== 'error') return;
    el.dataset.k = k; el.setAttribute('aria-busy', k === 'load' ? 'true' : 'false');
    if (k === 'load') el.innerHTML = '<div class="mk-skel" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><span class="sr">Cargando la gráfica…</span>';
    else if (k === 'empty') el.innerHTML = '<p>No hay datos para este periodo.</p>';
    else if (k === 'error') el.innerHTML = '<p>No pudimos cargar la gráfica.</p><button type="button" class="btn btn-secondary btn-sm" data-act="retry">Reintentar</button>';
    else el.innerHTML = '';
  }
  function loadingSoon(immediate) {
    clearTimeout(rt.stT);
    if (immediate || !rt.hasChart) setState('load'); else rt.stT = setTimeout(function () { setState('load'); }, 160);
  }

  /* ================= gráfica ================= */
  function applyChart(mode) {
    var d = rt.main; if (!d || !d.bars.length) return;
    if (!ch) { setState('error'); return; }
    rt.dec = decFor(st.sym, d.bars[d.bars.length - 1].c);
    try {
      ch.setData({ bars: d.bars, intraday: d.intraday, prev: d.prev, tz: d.tz, dec: rt.dec }, { animate: reduce() ? false : mode });
      ch.setType(st.type);
    } catch (e) { setState('error'); return; }
    rt.hasChart = true; applyIndicators();
  }
  function indEntry(k) {
    var cat = win.CampoInd && win.CampoInd.catalog || [];
    for (var i = 0; i < cat.length; i++) if (cat[i].key === k) return cat[i];
    return null;
  }
  function applyIndicators() {
    var d = rt.main; if (!ch || !d) return;
    var ov = [], pn = [];
    if (!rt.cmpOn) {
      st.ind.forEach(function (k) {
        var e = indEntry(k); if (!e || e.kind === 'volume') return;
        if (e.intraday && !d.intraday) return;
        var r; try { r = e.compute(d.all); } catch (er) { r = null; } if (!r) return;
        var off = d.off || 0, sl = function (a) { return a && a.slice ? a.slice(off) : a; };
        if (e.kind === 'pane') pn.push({ key: r.key, label: r.label, min: r.min, max: r.max, guides: r.guides, series: (r.series || []).map(function (s) { return { values: sl(s.values), color: s.color, kind: s.kind }; }) });
        else ov.push({ key: r.key, color: r.color, values: sl(r.values), band: r.band ? { upper: sl(r.band.upper), lower: sl(r.band.lower) } : undefined });
      });
    }
    try {
      ch.setOverlays(ov); ch.setPanes(pn); ch.setVolume(!rt.cmpOn && st.ind.indexOf('vol') >= 0);
    } catch (e) { }
    els.mkCv.style.setProperty('--mk-panes', pn.length);
    if (ch.resize) setTimeout(function () { try { ch.resize(); } catch (e) { } }, 30);
  }
  function loadMain(mode) {
    var sym = st.sym, pt = ++rt.ptok, tok = rt.tok;
    loadingSoon(false);
    return fetchPeriod(sym, st.period).then(function (d) {
      if (pt !== rt.ptok || sym !== st.sym) return;
      clearTimeout(rt.stT);
      if (!d || !d.bars.length) { rt.main = null; setState('empty'); paintRo(null); return; }
      rt.main = d; onMeta(d.meta); setState('none');
      applyChart(rt.hasChart ? 'morph' : mode || 'sweep');
      refreshCompare(); paintRo(null); paintPerf(); paintQuote(); paintHead(); announce(); maybeNews();
    }, function () {
      if (pt !== rt.ptok || sym !== st.sym) return;
      clearTimeout(rt.stT); rt.main = null; setState('error');
    });
  }
  function onMeta(meta) { if (!meta) return; if (!rt.meta || rt.meta.sym !== st.sym || !rt.meta.exch) rt.meta = meta; }

  /* ================= comparación ================= */
  function isIntra() { return st.period === '1D' || st.period === '5D'; }
  function freeSlot() { for (var i = 0; i < SLOTS.length; i++) if (!st.cmp.some(function (c) { return c.slot === SLOTS[i]; })) return SLOTS[i]; return ''; }
  function shortSym(s) { return s.replace(/\.[A-Z]{1,3}$/, '').replace(/^\^/, ''); }
  function refreshCompare() {
    var d = rt.main, tk = ++rt.ctok; if (!d) { paintCmp(); return; }
    var active = st.cmp.length > 0 && !d.intraday; rt.cmpOn = active; paintCmp(); paintInd();
    if (!ch) return;
    if (!active) { try { ch.setCompare([]); } catch (e) { } applyIndicators(); paintRo(null); return; }
    applyIndicators();
    Promise.all(st.cmp.map(function (c) {
      return (st.period === 'Máx' ? fetchMax(c.s) : fetchDaily(c.s)).then(function (r) { return { c: c, r: r }; }, function () { return { c: c, r: null }; });
    })).then(function (rs) {
      if (tk !== rt.ctok || d !== rt.main) return;
      var t0 = d.bars[0].t, list = [], bad = [];
      rs.forEach(function (x) {
        var bars = x.r ? x.r.bars.filter(function (b) { return b.t >= t0; }).map(function (b) { return { t: b.t, c: b.c }; }) : [];
        if (bars.length < 2) { bad.push(x.c); return; }
        x.c.pct = (bars[bars.length - 1].c / bars[0].c - 1) * 100;
        list.push({ label: shortSym(x.c.s), color: x.c.slot, bars: bars });
      });
      if (bad.length) { st.cmp = st.cmp.filter(function (c) { return bad.indexOf(c) < 0; }); save(); toast('No pudimos cargar ' + bad.map(function (c) { return shortSym(c.s); }).join(', ') + ' para comparar.'); }
      d.mainPct = d.bars.length > 1 ? (d.bars[d.bars.length - 1].c / d.bars[0].c - 1) * 100 : null;
      rt.cmpOn = list.length > 0;
      try { ch.setCompare(list); } catch (e) { }
      applyIndicators(); paintCmp(); paintInd(); paintRo(null);
    });
  }
  function paintCmp() {
    var box = els.mkCmp, d = rt.main, intra = isIntra(); if (!box) return;
    var show = rt.cmpOpen || st.cmp.length > 0;
    box.hidden = !show;
    els.mkCmpB.setAttribute('aria-pressed', rt.cmpOpen ? 'true' : 'false'); els.mkCmpB.setAttribute('aria-expanded', rt.cmpOpen ? 'true' : 'false');
    els.mkCmpB.disabled = intra; if (intra) els.mkCmpB.setAttribute('data-tip', 'La comparación usa cierres diarios.'); else els.mkCmpB.removeAttribute('data-tip');
    els.mkCmpNote.hidden = !(intra && st.cmp.length > 0);
    els.mkChips.hidden = intra; els.mkCmpAdd.hidden = !(rt.cmpOpen && st.cmp.length < 3 && !intra);
    if (intra) return;
    var h = '';
    if (st.cmp.length) h += '<span class="mk-cc mk-cc-main"><i class="mk-cd main"></i><b>' + esc(shortSym(st.sym)) + '</b>' + (d && finite(d.mainPct) ? dHTML(d.mainPct, 'pct') : '') + '</span>';
    st.cmp.forEach(function (c) {
      h += '<span class="mk-cc' + (rt.newChip === c.slot ? ' is-new' : '') + '" data-slot="' + c.slot + '"><i class="mk-cd" style="--c:' + esc(chartColor(c.slot)) + '"></i><b>' + esc(shortSym(c.s)) + '</b>' + (finite(c.pct) ? dHTML(c.pct, 'pct') : '') +
        '<button type="button" class="mk-cx" data-act="cmp-x" data-s="' + esc(c.s) + '" aria-label="Quitar ' + esc(c.s) + ' de la comparación">' + ICON_X + '</button></span>';
    });
    els.mkChips.innerHTML = h; rt.newChip = '';
  }
  function addCompare(it) {
    var s = up(it.sym);
    if (s === st.sym) { toast('Ya estás viendo ese símbolo.'); return; }
    if (st.cmp.some(function (c) { return c.s === s; })) { toast('Ya lo comparas.'); return; }
    if (st.cmp.length >= 3) { toast('Puedes comparar hasta 3 símbolos.'); return; }
    var slot = freeSlot(); if (!slot) return;
    st.cmp.push({ s: s, n: it.name || '', slot: slot }); rt.newChip = slot; rt.cmpOpen = false;
    save(); refreshCompare();
  }
  function removeCompare(s) { st.cmp = st.cmp.filter(function (c) { return c.s !== s; }); save(); if (!st.cmp.length) rt.cmpOpen = rt.cmpOpen; refreshCompare(); }

  /* ================= indicadores ================= */
  function buildIndPop() {
    var cat = win.CampoInd && win.CampoInd.catalog;
    if (!cat || !cat.length) { els.mkIndW.hidden = true; return; }
    var groups = [], map = {};
    cat.forEach(function (e) { if (!map[e.group]) { map[e.group] = { g: e.group, list: [] }; groups.push(map[e.group]); } map[e.group].list.push(e); });
    els.mkIndP.innerHTML = '<p class="mk-ip-note" id="mkIpNote" hidden>Los indicadores se muestran sin comparación.</p>' + groups.map(function (g) {
      return '<div class="mk-ip-g" role="group" aria-label="' + esc(g.g) + '"><span class="mk-ip-h">' + esc(g.g) + '</span>' + g.list.map(function (e) {
        return '<button type="button" class="mk-sw" role="switch" aria-checked="false" data-k="' + esc(e.key) + '"><span class="mk-sw-l">' + esc(e.label) + '</span><i class="mk-tg" aria-hidden="true"></i></button>';
      }).join('') + '</div>';
    }).join('');
  }
  function effectiveInd() { return st.ind.filter(function (k) { var e = indEntry(k); return e && !(e.intraday && !(rt.main ? rt.main.intraday : isIntra())); }); }
  function paintInd(bump) {
    if (!els.mkIndP) return;
    var cmp = rt.cmpOn || (st.cmp.length > 0 && !isIntra()), intra = rt.main ? rt.main.intraday : isIntra();
    $$('.mk-sw', els.mkIndP).forEach(function (b) {
      var k = b.dataset.k, e = indEntry(k), on = st.ind.indexOf(k) >= 0;
      b.setAttribute('aria-checked', on ? 'true' : 'false'); b.disabled = !!cmp || !!(e && e.intraday && !intra);
    });
    var note = $('#mkIpNote', els.mkIndP); if (note) note.hidden = !cmp;
    els.mkIndP.classList.toggle('is-cmp', !!cmp);
    var n = cmp ? 0 : effectiveInd().length, c = els.mkCnt, prevN = c.textContent;
    c.textContent = n; c.classList.toggle('is-zero', !n);
    if (bump && String(n) !== prevN && !reduce() && c.animate) c.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
  }
  function toggleInd(k) {
    var i = st.ind.indexOf(k), e = indEntry(k); if (!e) return;
    if (i >= 0) st.ind.splice(i, 1);
    else {
      st.ind.push(k);
      if (e.kind === 'pane') {
        var panes = st.ind.filter(function (x) { var q = indEntry(x); return q && q.kind === 'pane'; });
        if (panes.length > 2) { var old = panes[0], oe = indEntry(old); st.ind.splice(st.ind.indexOf(old), 1); toast('Máximo 2 osciladores a la vez: apagamos ' + (oe ? oe.label : old) + '.'); }
      }
    }
    save(); paintInd(true); applyIndicators(); paintRo(null);
  }
  function setIndOpen(v, refocus) {
    var open = !els.mkIndP.hidden; if (v === open) return;
    els.mkIndP.hidden = !v; els.mkIndB.setAttribute('aria-expanded', v ? 'true' : 'false');
    if (v) {
      els.mkIndP.classList.remove('is-in'); void els.mkIndP.offsetWidth; els.mkIndP.classList.add('is-in');
      var f = $('.mk-sw:not(:disabled)', els.mkIndP); if (f) f.focus();
    } else if (refocus) els.mkIndB.focus();
  }

  /* ================= banda de mercados ================= */
  function paintBand(changed) {
    $$('.mkc', els.mkBand).forEach(function (b) {
      var y = b.dataset.y, m = bandOf(y), lv = rt.live[y]; if (!m) return;
      b.setAttribute('aria-pressed', y === st.sym ? 'true' : 'false');
      if (!lv && changed) return;
      var price = lv ? lv.price : m.last, prev = lv ? lv.prev : null, chg = m.chg;
      if (lv && prev > 0) chg = m.unit === '%' ? price - prev : (price / prev - 1) * 100;
      setPx($('.mkt-px b', b), fmtNum(price, decFor(y, price)), changed && changed[y]);
      setD($('.delta', b), chg, m.unit === '%' ? 'pp' : 'pct');
    });
  }

  /* ================= lista de seguimiento ================= */
  function watchRows() {
    if (rt.tab === 'pos') {
      var seen = {}, out = [];
      (D.positions || []).forEach(function (p) { var s = up(p.ticker); if (s && !seen[s]) { seen[s] = 1; out.push({ s: s, n: p.name || s }); } });
      return out;
    }
    return st.watch || [];
  }
  function paintTabs() {
    var b = $$('button', els.mkTabs), nPos = watchRows.call(null, null) && (function () { var seen = {}, n = 0; (D.positions || []).forEach(function (p) { var s = up(p.ticker); if (s && !seen[s]) { seen[s] = 1; n++; } }); return n; })();
    b[0].textContent = 'Seguimiento (' + (st.watch || []).length + ')'; b[1].textContent = 'Tus posiciones (' + nPos + ')';
    b.forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.tab === rt.tab ? 'true' : 'false'); });
    els.mkTabs.style.setProperty('--i', rt.tab === 'pos' ? 1 : 0);
  }
  function rowPrice(sym) {
    var q = quoteFor(sym); if (!q) return { px: '–', chg: null };
    return { px: fmtNum(q.price, decFor(sym, q.price)), chg: chgOf(sym, q) };
  }
  function renderWatch(enter) {
    if (!els.mkUl) return;
    paintTabs();
    var rows = watchRows(), h = '';
    if (!rows.length) {
      h = '<li class="mk-empty">' + ICON_STAR + '<p>' + (rt.tab === 'pos' ? 'Aún no tienes posiciones en tus portafolios.' : 'Sigue acciones con la estrella y aquí verás cómo van.') + '</p></li>';
    } else rows.forEach(function (w) {
      var p = rowPrice(w.s), name = nameOf(w.s), sv = sparkVals(w.s), tnx = w.s === '^TNX';
      var dp = dParts(p.chg, tnx ? 'pp' : 'pct');
      h += '<li class="mk-li" data-s="' + esc(w.s) + '"><button type="button" class="mk-row-main" data-act="go" data-s="' + esc(w.s) + '" aria-current="' + (w.s === st.sym ? 'true' : 'false') + '">' + mark(w.s, 32) +
        '<span class="mk-rn"><b>' + esc(name) + '</b><span class="mk-chip">' + esc(w.s) + '</span></span><span class="mk-rsp">' + miniSpark(sv) + '</span>' +
        '<span class="mk-rp"><b class="num" data-price>' + esc(p.px) + '</b><span class="' + dp.cls + '">' + dp.inner + '</span></span></button>' +
        (rt.tab === 'watch' ? '<button type="button" class="mk-row-x" data-act="unfollow" data-s="' + esc(w.s) + '" aria-label="Quitar ' + esc(name) + ' de seguimiento">' + ICON_X + '</button>' : '') + '</li>';
    });
    els.mkUl.innerHTML = h; odoAll(els.mkUl);
    if (enter) { var li = $$('.mk-li', els.mkUl).filter(function (x) { return x.dataset.s === enter; })[0]; if (li) growIn(li); }
    placeBar(true);
  }
  function growIn(li) {
    if (reduce() || !li.animate) return;
    li.style.overflow = 'hidden';
    var a = li.animate([{ height: '0px', opacity: 0 }, { height: '52px', opacity: 1 }], { duration: 220, easing: EASE });
    a.onfinish = a.oncancel = function () { li.style.overflow = ''; };
  }
  function placeBar(instant) {
    var bar = els.mkBar, cur = null;
    $$('.mk-li', els.mkUl).forEach(function (li) { if (li.dataset.s === st.sym && !li.classList.contains('is-out')) cur = li; });
    if (!cur || !cur.offsetHeight) { bar.classList.remove('on'); return; }
    if (instant || !bar.classList.contains('on')) bar.classList.add('no-tr');
    bar.style.height = Math.max(16, cur.offsetHeight - 16) + 'px'; bar.style.transform = 'translateY(' + (cur.offsetTop + 8) + 'px)';
    bar.classList.add('on'); if (bar.classList.contains('no-tr')) { void bar.offsetWidth; bar.classList.remove('no-tr'); }
  }
  function paintWatchLive(changed) {
    $$('.mk-li', els.mkUl).forEach(function (li) {
      var s = li.dataset.s, p = rowPrice(s), pe = $('[data-price]', li), de = $('.mk-rp > span', li);
      if (!pe) return; setPx(pe, p.px, changed && changed[s]); if (de) setD(de, p.chg, s === '^TNX' ? 'pp' : 'pct');
    });
  }
  function paintWatchSpark(sym) {
    $$('.mk-li', els.mkUl).forEach(function (li) { if (li.dataset.s === sym) { var h = $('.mk-rsp', li); if (h) h.innerHTML = miniSpark(sparkVals(sym)); } });
  }
  function paintWatchSel() {
    $$('.mk-row-main', els.mkUl).forEach(function (b) { b.setAttribute('aria-current', b.dataset.s === st.sym ? 'true' : 'false'); });
    placeBar(false);
  }
  function isFollowed(sym) { sym = up(sym); return (st.watch || []).some(function (w) { return w.s === sym; }); }
  function afterWatch(enter) {
    renderWatch(enter); paintFollow(); if (mainCombo) mainCombo.refreshStars(); if (cmpCombo) cmpCombo.refreshStars();
    if (!rt.live[enter || '']) poll();
  }
  function follow(sym, name) {
    sym = up(sym); if (!sym || isFollowed(sym)) return; importWatch();
    if (name) nm[sym] = name; st.watch.push({ s: sym, n: nm[sym] || '' }); save(); afterWatch(rt.tab === 'watch' ? sym : '');
  }
  function unfollow(sym) {
    sym = up(sym); if (!isFollowed(sym)) return;
    st.watch = st.watch.filter(function (w) { return w.s !== sym; }); save();
    var li = rt.tab === 'watch' ? $$('.mk-li', els.mkUl).filter(function (x) { return x.dataset.s === sym; })[0] : null;
    var fin = function () { toast('Quitado de seguimiento'); afterWatch(''); };
    paintFollow(); if (mainCombo) mainCombo.refreshStars(); paintTabs();
    if (li && li.animate && !reduce()) {
      li.classList.add('is-out'); li.style.overflow = 'hidden'; placeBar(false);
      var a = li.animate([{ height: li.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 220, easing: EASE, fill: 'forwards' });
      a.onfinish = fin;
    } else fin();
  }
  function toggleFollow(sym, name) { if (isFollowed(sym)) unfollow(sym); else follow(sym, name); }
  function burst(btn) {
    if (reduce()) return;
    var host = $('.mk-bursts', btn); if (!host) return;
    var h = ''; for (var i = 0; i < 6; i++) h += '<i style="--a:' + (i * 60 - 90) + 'deg"></i>';
    host.innerHTML = h; setTimeout(function () { host.innerHTML = ''; }, 460);
  }

  /* ================= movimientos de hoy ================= */
  function paintMovers() {
    if (!els.mkMovers) return;
    var seen = {}, pool = [];
    function add(s) { s = up(s); if (!s || seen[s] || s === '^TNX') return; seen[s] = 1; var lv = rt.live[s]; if (lv && lv.prev > 0) pool.push({ s: s, c: (lv.price / lv.prev - 1) * 100 }); }
    (D.markets || []).forEach(function (m) { add(m.y); }); (st.watch || []).forEach(function (w) { add(w.s); }); (D.positions || []).forEach(function (p) { add(p.ticker); });
    if (pool.length < 2) { els.mkMovers.hidden = true; return; }
    els.mkMovers.hidden = false;
    var ups = pool.filter(function (x) { return x.c > 0; }).sort(function (a, b) { return b.c - a.c; }).slice(0, 3);
    var dns = pool.filter(function (x) { return x.c < 0; }).sort(function (a, b) { return a.c - b.c; }).slice(0, 3);
    function col(title, list, cls) {
      return '<div class="mk-mvc"><h3>' + title + '</h3>' + (list.length ? list.map(function (x) {
        return '<button type="button" class="mk-mv" data-act="go" data-s="' + esc(x.s) + '">' + mark(x.s, 24) + '<span class="mk-mvn"><b>' + esc(nameOf(x.s)) + '</b><span class="mk-chip">' + esc(x.s) + '</span></span>' +
          '<span class="mk-badge ' + cls + '"><i class="arw" aria-hidden="true">' + (cls === 'gain' ? '▲' : '▼') + '</i>' + esc(pct(x.c)) + '</span></button>';
      }).join('') : '<p class="mk-mv-e">Sin movimientos.</p>') + '</div>';
    }
    els.mkMvg.innerHTML = col('Suben', ups, 'gain') + col('Bajan', dns, 'loss');
  }

  /* ================= noticias ================= */
  function newsTime(v) {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v < 1e12 ? v * 1000 : v;
    var s = String(v).trim(); if (/^\d+$/.test(s)) { var n = +s; return n < 1e12 ? n * 1000 : n; }
    var t = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s.replace(' ', 'T') + 'Z'); return isFinite(t) ? t : 0;
  }
  function maybeNews() {
    var sym = st.sym; if (rt.newsSym === sym) return;
    var t = symType(sym, rt.meta);
    if (t === 'INDEX' || t === 'CURRENCY') { rt.newsSym = sym; els.mkNews.hidden = true; return; }
    rt.newsSym = sym;
    fetchNews(sym).then(function (list) { return list; }, function () { return []; }).then(function (list) {
      if (sym !== st.sym) return;
      var items = (list || []).filter(function (n) { return n && n.article_title && safeUrl(n.article_url); }).slice(0, 9);
      if (!items.length) { els.mkNews.hidden = true; return; }
      els.mkNewsT.textContent = 'Noticias de ' + nameOf(sym, rt.meta);
      els.mkNewsG.innerHTML = items.map(function (n) {
        var tm = newsTime(n.post_time_utc);
        return '<a class="mk-nw" href="' + esc(safeUrl(n.article_url)) + '" target="_blank" rel="noopener noreferrer"><span class="mk-nm">' + esc((tm ? ago(tm) : '') + (tm && n.source ? ' · ' : '') + (n.source || '')) + '</span>' +
          '<span class="mk-nt"><span class="mk-ul">' + esc(n.article_title) + '</span></span><span class="sr"> (se abre en una pestaña nueva)</span></a>';
      }).join('');
      els.mkNews.hidden = false; stagger($$('.mk-nw', els.mkNewsG));
    });
  }

  /* ================= sondeo de precios ================= */
  function pollSyms() {
    var a = [], seen = {};
    function add(s) { s = up(s); if (s && !seen[s]) { seen[s] = 1; a.push(s); } }
    add(st.sym); st.cmp.forEach(function (c) { add(c.s); }); (D.markets || []).forEach(function (m) { add(m.y); });
    (st.watch || []).forEach(function (w) { add(w.s); }); (D.positions || []).forEach(function (p) { add(p.ticker); });
    return a.slice(0, 60);
  }
  function poll() {
    if (rt.polling) return rt.polling;
    var syms = pollSyms(); if (!syms.length) return Promise.resolve();
    rt.polling = getJSON(API + '/prices?symbols=' + syms.map(encodeURIComponent).join(',')).then(function (j) {
      if (!j) return;
      var changed = {};
      Object.keys(j).forEach(function (k) {
        var q = j[k]; if (!q || !(q.price > 0)) return;
        var s = up(k), old = rt.live[s], np = { price: +q.price, prev: q.prev > 0 ? +q.prev : null };
        rt.live[s] = np; changed[s] = old && old.price !== np.price ? (np.price > old.price ? 1 : -1) : 0;
      });
      rt.liveAt = Date.now();
      var t = new Date(); els.mkAsof.textContent = t.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      paintLive(changed);
    }).then(null, noop).then(function () { rt.polling = null; });
    return rt.polling;
  }
  function paintLive(changed) {
    var sym = st.sym;
    paintBand(changed); paintWatchLive(changed); paintMovers();
    if (changed[sym] !== undefined) {
      paintQuote(changed[sym]); paintPerf(); paintStats(); announce();
      var lv = rt.live[sym], d = rt.main;
      if (ch && d && lv && changed[sym] !== 0 && (d.intraday || (!d.intraday && dayKey(d.bars[d.bars.length - 1].t, d.tz) === dayKey(Date.now(), d.tz)))) { try { ch.live(lv.price); } catch (e) { } }
    } else paintWhen();
    st.cmp.forEach(function (c) { if (changed[c.s] === undefined) return; });
  }
  function startPolling() {
    stopPolling(); poll(); fetchSessions();
    rt.pt = setInterval(function () { if (!doc.hidden && !root.hidden) poll(); }, 60000);
    rt.mt = setInterval(function () { fetchSessions(); paintStatus(); paintWhen(); if (rt.hasChart) paintHead(); }, 60000);
  }
  function stopPolling() { clearInterval(rt.pt); clearInterval(rt.mt); rt.pt = rt.mt = 0; }

  /* ================= cargar un símbolo ================= */
  function loadSymbol() {
    var sym = st.sym, tok = ++rt.tok; rt.loaded = true; ++rt.ptok;
    pushRecent(sym); save();
    st.cmp = st.cmp.filter(function (c) { return c.s !== sym; });
    rt.main = null; rt.meta = null; rt.info = null; rt.newsSym = ''; rt.announced = ''; rt.cross = null; rt.roKey = '';
    var cd = cpeek('d:' + sym); rt.daily = cd || null; if (cd) rt.meta = cd.meta;
    swapHead(function () { paintHead(); paintQuote(); });
    paintBand(null); paintWatchSel(); paintPos(); paintPerf(); paintStats(); paintRo(null); paintCmp(); paintInd();
    els.mkNews.hidden = true;
    loadingSoon(!rt.hasChart);
    loadMain(rt.hasChart ? 'morph' : 'sweep');
    fetchDaily(sym).then(function (dl) {
      if (tok !== rt.tok) return;
      rt.daily = dl; if (dl) { onMeta(dl.meta); paintWatchSpark(sym); }
      paintPerf(); paintQuote(); paintStats(); paintHead(); announce(); maybeNews();
    }, function () { if (tok === rt.tok) { rt.daily = null; paintPerf(); } });
    fetchInfo(sym).then(function (info) { if (tok !== rt.tok) return; rt.info = info; paintStats(); paintHead(); }, noop);
    if (!rt.live[sym]) poll();
  }
  function changePeriod(p) {
    if (p === st.period) return;
    st.period = p; save(); paintPerf(); placePerInd(false);
    rt.roKey = ''; loadMain('morph').then(function () { paintPerf(); });
    paintCmp(); paintInd();
  }

  /* ================= ruteo, visibilidad y eventos ================= */
  function go(sym, name) {
    sym = up(sym); if (!sym || !SYM_RE.test(sym)) return; if (name) nm[sym] = name;
    var S = win.CampoSections, h = '#mercados/' + encodeURIComponent(sym);
    if (S && S.navigate) S.navigate(h, !!(S.current && S.current() === 'mercados'));
    else { st.sym = sym; if (rt.built) loadSymbol(); }
  }
  function ensureBuilt() {
    if (rt.built) return; rt.built = true;
    importWatch(); build(); paintStatus(); buildIndPop(); paintInd();
    if (win.CampoMktChart && win.CampoMktChart.create) {
      try {
        ch = win.CampoMktChart.create(els.mkCv, { fmt: function (v) { return fmtNum(v, rt.dec); }, fmtPct: function (v) { return pct(v); }, onCross: onCross, label: 'Gráfica de precios del símbolo seleccionado' });
      } catch (e) { ch = null; if (win.console) console.error(e); }
    }
    mainCombo = Combo(els.mkSearch, { label: 'Buscar un instrumento', placeholder: 'Busca una acción, ETF, índice, divisa o cripto', kbd: true, star: true, recents: true, onPick: function (it) { go(it.sym, it.name); } });
    cmpCombo = Combo(els.mkCmpAdd, { label: 'Comparar con otro símbolo', placeholder: 'Agrega un símbolo para comparar', small: true, onPick: addCompare, onClose: function () { rt.cmpOpen = false; paintCmp(); els.mkCmpB.focus(); } });
    root.addEventListener('click', onClick);
    els.mkPer.addEventListener('keydown', function (e) {
      var l = $$('.mkp', els.mkPer), i = l.indexOf(doc.activeElement); if (i < 0) return;
      var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? l.length - 1 : -1;
      if (j < 0) return; e.preventDefault(); l[(j + l.length) % l.length].focus();
    });
    els.mkIndP.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setIndOpen(false, true); }
      else if (e.key === 'Tab') { var l = $$('.mk-sw:not(:disabled)', els.mkIndP); if (!l.length) return; if (e.shiftKey && doc.activeElement === l[0]) { e.preventDefault(); l[l.length - 1].focus(); } else if (!e.shiftKey && doc.activeElement === l[l.length - 1]) { e.preventDefault(); l[0].focus(); } }
    });
    doc.addEventListener('pointerdown', function (e) {
      if (!els.mkIndP.hidden && !els.mkIndW.contains(e.target)) setIndOpen(false, false);
      if (rt.cmpOpen && !els.mkCmp.contains(e.target) && !els.mkCmpB.contains(e.target)) { rt.cmpOpen = false; paintCmp(); }
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !rt.visible) return;
      if (!els.mkIndP.hidden) { setIndOpen(false, true); return; }
      if (rt.cmpOpen) { rt.cmpOpen = false; paintCmp(); els.mkCmpB.focus(); }
    });
    doc.addEventListener('keydown', function (e) {
      if (!rt.visible || root.hidden) return;
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var t = e.target, tag = t && t.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
        e.preventDefault(); mainCombo.focus();
      }
    });
    if (win.ResizeObserver) new ResizeObserver(function () { placePerInd(true); placeBar(true); }).observe(els.mkSym);
    var rep = function () { try { if (ch && ch.repaint) ch.repaint(); } catch (e) { } paintCmp(); };
    if (win.__campo && win.__campo.repaints) win.__campo.repaints.push(rep);
    if (win.MutationObserver) new MutationObserver(function () { paintCmp(); }).observe(html, { attributes: true, attributeFilter: ['data-theme'] });
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden && rt.visible && !root.hidden && Date.now() - rt.liveAt > 55000) poll(); });
    els.mkType.querySelectorAll('button').forEach(function (b, i) { b.setAttribute('aria-pressed', b.dataset.t === st.type ? 'true' : 'false'); if (b.dataset.t === st.type) els.mkType.style.setProperty('--i', i); });
    renderWatch('');
  }
  function onClick(e) {
    var t = e.target, b;
    if ((b = t.closest('.mkc'))) { go(b.dataset.y); return; }
    if ((b = t.closest('.mkp'))) { changePeriod(b.dataset.p); return; }
    if ((b = t.closest('#mkType button'))) {
      if (b.dataset.t === st.type) return; st.type = b.dataset.t; save();
      $$('button', els.mkType).forEach(function (x, i) { var on = x === b; x.setAttribute('aria-pressed', on ? 'true' : 'false'); if (on) els.mkType.style.setProperty('--i', i); });
      applyChart('morph'); return;
    }
    if ((b = t.closest('.mk-tabs button'))) { rt.tab = b.dataset.tab; renderWatch(''); return; }
    if (t.closest('#mkFollow')) {
      var was = isFollowed(st.sym); toggleFollow(st.sym, nameOf(st.sym, rt.meta));
      if (!was) { burst(els.mkFollow); if (!reduce() && els.mkFollow.animate) { var st0 = $('.mk-star', els.mkFollow); if (st0) st0.animate([{ transform: 'scale(0.8)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }); } }
      return;
    }
    if (t.closest('#mkCmpB')) { rt.cmpOpen = !rt.cmpOpen; paintCmp(); if (rt.cmpOpen && !els.mkCmpAdd.hidden) cmpCombo.focus(); return; }
    if (t.closest('#mkIndB')) { setIndOpen(els.mkIndP.hidden, true); return; }
    if ((b = t.closest('.mk-sw'))) { if (!b.disabled) toggleInd(b.dataset.k); return; }
    if ((b = t.closest('[data-act]'))) {
      var a = b.dataset.act;
      if (a === 'go') go(b.dataset.s);
      else if (a === 'unfollow') unfollow(b.dataset.s);
      else if (a === 'cmp-x') removeCompare(b.dataset.s);
      else if (a === 'retry') { cdrop(st.sym); rt.hasChart = rt.hasChart && !!rt.main; loadingSoon(true); loadMain('sweep'); fetchDaily(st.sym).then(function (dl) { rt.daily = dl; paintPerf(); paintStats(); paintQuote(); }, noop); }
      else if (a === 'pos') { var p = findPos(st.sym); if (p) doc.dispatchEvent(new CustomEvent('campo:open-position', { detail: { ticker: p.ticker } })); }
    }
  }
  function onRoute(e) {
    var d = e.detail || {}; if (d.sec !== 'mercados') return;
    ensureBuilt();
    var m = /^#mercados\/(.+)$/.exec(d.hash || ''), sym = m ? up(safeDecode(m[1])) : '';
    if (sym && !SYM_RE.test(sym)) sym = ''; /* basura en la URL: se ignora y no se guarda */
    var first = !rt.shown; rt.visible = true; rt.shown = true;
    if (first) {
      try { if (win.CampoShaders && win.CampoShaders.scan) win.CampoShaders.scan(); } catch (er) { }
      var bh = els.mkBandHost; if (reduce() || !win.IntersectionObserver) bh.classList.add('is-in'); else requestAnimationFrame(function () { bh.classList.add('is-in'); });
      placePerInd(true);
    }
    if (sym && sym !== st.sym) { st.sym = sym; loadSymbol(); }
    else if (!rt.loaded) loadSymbol();
    if (first || !rt.pt) { startPolling(); paintStatus(); }
    requestAnimationFrame(function () { placePerInd(true); placeBar(true); });
  }
  win.addEventListener('campo:route', onRoute);
  win.addEventListener('campo:section', function (e) { if (e.detail && e.detail.sec !== 'mercados' && rt.visible) { rt.visible = false; stopPolling(); } });
  if (!root.hidden && /^#mercados/.test(location.hash)) onRoute({ detail: { sec: 'mercados', hash: location.hash } });

  /* ================= API pública ================= */
  win.CampoMercados = {
    open: function (sym, name) { go(sym, name); },
    follow: function (sym, name) { importWatch(); follow(sym, name); },
    isFollowed: function (sym) { return isFollowed(sym); }
  };
})();
