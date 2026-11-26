/* Campo · Mercados: matemática pura de indicadores técnicos (sin DOM, sin dependencias).
   Cada función devuelve arreglos del MISMO largo que la entrada, con null donde aún no hay datos.
   Un valor null (o no finito) en la entrada significa "sin dato": la salida es null ahí y la serie sigue. */
(function () {
  'use strict';

  var root = typeof window !== 'undefined' ? window : globalThis;

  function ok(x) { return typeof x === 'number' && isFinite(x); }
  function nulls(n) { var a = []; for (var i = 0; i < n; i++) a.push(null); return a; }
  function col(bars, f) { var a = []; for (var i = 0; i < bars.length; i++) a.push(bars[i][f]); return a; }
  function mean(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s / a.length; }

  function sma(values, n) {
    var out = nulls(values.length);
    for (var i = n - 1; i < values.length; i++) {
      var sum = 0, good = true;
      for (var j = i - n + 1; j <= i; j++) {
        if (!ok(values[j])) { good = false; break; }
        sum += values[j];
      }
      if (good) out[i] = sum / n;
    }
    return out;
  }

  function ema(values, n) {
    var k = 2 / (n + 1), out = nulls(values.length), seed = [], prev = null;
    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      if (!ok(v)) continue;
      if (prev === null) {
        seed.push(v);
        if (seed.length === n) { prev = mean(seed); out[i] = prev; }
      } else {
        prev = v * k + prev * (1 - k);
        out[i] = prev;
      }
    }
    return out;
  }

  function bollinger(values, n, k) {
    n = n || 20;
    k = k === undefined ? 2 : k;
    var mid = sma(values, n), upper = nulls(values.length), lower = nulls(values.length);
    for (var i = 0; i < values.length; i++) {
      if (mid[i] === null) continue;
      var ss = 0;
      for (var j = i - n + 1; j <= i; j++) ss += (values[j] - mid[i]) * (values[j] - mid[i]);
      var sd = Math.sqrt(ss / n);
      upper[i] = mid[i] + k * sd;
      lower[i] = mid[i] - k * sd;
    }
    return { mid: mid, upper: upper, lower: lower };
  }

  function rsiValue(ag, al) {
    if (al === 0) return ag === 0 ? 50 : 100;
    return 100 - 100 / (1 + ag / al);
  }

  function rsi(values, n) {
    n = n || 14;
    var out = nulls(values.length), prev = null, cnt = 0, sumG = 0, sumL = 0, ag = 0, al = 0;
    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      if (!ok(v)) continue;
      if (prev === null) { prev = v; continue; }
      var ch = v - prev, g = ch > 0 ? ch : 0, l = ch < 0 ? -ch : 0;
      prev = v;
      cnt++;
      if (cnt < n) { sumG += g; sumL += l; continue; }
      if (cnt === n) { ag = (sumG + g) / n; al = (sumL + l) / n; }
      else { ag = (ag * (n - 1) + g) / n; al = (al * (n - 1) + l) / n; }
      out[i] = rsiValue(ag, al);
    }
    return out;
  }

  function macd(values, fast, slow, sig) {
    fast = fast || 12; slow = slow || 26; sig = sig || 9;
    var f = ema(values, fast), s = ema(values, slow), m = nulls(values.length), h = nulls(values.length);
    for (var i = 0; i < values.length; i++) {
      if (f[i] !== null && s[i] !== null) m[i] = f[i] - s[i];
    }
    var sg = ema(m, sig); // ema salta los nulos y deja la salida alineada con el índice original
    for (var j = 0; j < values.length; j++) {
      if (m[j] !== null && sg[j] !== null) h[j] = m[j] - sg[j];
    }
    return { macd: m, signal: sg, hist: h };
  }

  function stoch(high, low, close, k, d) {
    k = k || 14; d = d || 3;
    var kk = nulls(close.length);
    for (var i = k - 1; i < close.length; i++) {
      var hh = -Infinity, ll = Infinity, good = ok(close[i]);
      for (var j = i - k + 1; j <= i && good; j++) {
        if (!ok(high[j]) || !ok(low[j])) { good = false; break; }
        if (high[j] > hh) hh = high[j];
        if (low[j] < ll) ll = low[j];
      }
      if (good) kk[i] = hh === ll ? 50 : 100 * (close[i] - ll) / (hh - ll);
    }
    return { k: kk, d: sma(kk, d) };
  }

  function vwap(high, low, close, volume, t) {
    var out = nulls(close.length), pv = 0, vv = 0, day = null;
    for (var i = 0; i < close.length; i++) {
      var dayKey = new Date(t[i]).toDateString();
      if (dayKey !== day) { day = dayKey; pv = 0; vv = 0; }
      if (!ok(high[i]) || !ok(low[i]) || !ok(close[i]) || !ok(volume[i])) continue;
      pv += (high[i] + low[i] + close[i]) / 3 * volume[i];
      vv += volume[i];
      out[i] = vv > 0 ? pv / vv : null;
    }
    return out;
  }

  function ma(key, label, group, n, color, fn) {
    return {
      key: key, label: label, group: group, kind: 'overlay', colors: [color],
      compute: function (bars) { return { key: key, color: color, values: fn(col(bars, 'c'), n) }; }
    };
  }

  var catalog = [
    { key: 'vol', label: 'Volumen', group: 'Volumen', kind: 'volume', colors: [], compute: function () { return null; } },
    ma('sma20', 'Media simple 20', 'Medias', 20, '--text-2', sma),
    ma('sma50', 'Media simple 50', 'Medias', 50, 'A', sma),
    ma('sma200', 'Media simple 200', 'Medias', 200, 'C', sma),
    ma('ema20', 'Media exponencial 20', 'Medias', 20, 'B', ema),
    {
      key: 'bb', label: 'Bandas de Bollinger (20, 2)', group: 'Bandas', kind: 'band', colors: ['--text-3'],
      compute: function (bars) {
        var b = bollinger(col(bars, 'c'), 20, 2);
        return { key: 'bb', color: '--text-3', values: b.mid, band: { upper: b.upper, lower: b.lower } };
      }
    },
    {
      key: 'vwap', label: 'VWAP (solo 1D y 5D)', group: 'Bandas', kind: 'overlay', intraday: true, colors: ['C'],
      compute: function (bars) {
        return { key: 'vwap', color: 'C', values: vwap(col(bars, 'h'), col(bars, 'l'), col(bars, 'c'), col(bars, 'v'), col(bars, 't')) };
      }
    },
    {
      key: 'rsi', label: 'RSI (14)', group: 'Osciladores', kind: 'pane', colors: ['--accent-ink'],
      compute: function (bars) {
        return {
          key: 'rsi', label: 'RSI 14', min: 0, max: 100, guides: [30, 70],
          series: [{ values: rsi(col(bars, 'c'), 14), color: '--accent-ink', kind: 'line' }]
        };
      }
    },
    {
      key: 'macd', label: 'MACD (12, 26, 9)', group: 'Osciladores', kind: 'pane', colors: ['--accent-ink', '--text-3', '±'],
      compute: function (bars) {
        var m = macd(col(bars, 'c'), 12, 26, 9);
        return {
          key: 'macd', label: 'MACD 12 26 9', guides: [0],
          series: [
            { values: m.hist, color: '±', kind: 'hist' },
            { values: m.macd, color: '--accent-ink', kind: 'line' },
            { values: m.signal, color: '--text-3', kind: 'line' }
          ]
        };
      }
    },
    {
      key: 'stoch', label: 'Estocástico (14, 3)', group: 'Osciladores', kind: 'pane', colors: ['--accent-ink', '--text-3'],
      compute: function (bars) {
        var s = stoch(col(bars, 'h'), col(bars, 'l'), col(bars, 'c'), 14, 3);
        return {
          key: 'stoch', label: 'Estocástico 14 3', min: 0, max: 100, guides: [20, 80],
          series: [
            { values: s.k, color: '--accent-ink', kind: 'line' },
            { values: s.d, color: '--text-3', kind: 'line' }
          ]
        };
      }
    }
  ];

  var CampoInd = {
    sma: sma, ema: ema, bollinger: bollinger, rsi: rsi,
    macd: macd, stoch: stoch, vwap: vwap, catalog: catalog
  };

  root.CampoInd = CampoInd;
  if (typeof module !== 'undefined' && module.exports) module.exports = CampoInd;
})();
