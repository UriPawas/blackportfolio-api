/* Portify · Campo · transición entre páginas, variante "tablero".
 *
 * Tablero de vuelo partido: teselas redondeadas que giran (scaleY) en onda desde el elemento pulsado, cubren la
 * pantalla y dejan ver el logo; la página siguiente arranca ya cubierta y las teselas giran de salida en el mismo
 * orden, de modo que landing -> login -> registro se lee como un solo movimiento.
 *
 * API: window.CampoGate = { go(fromEl, href), reveal() }
 *   go(fromEl, href): cubre desde el rect de fromEl, deja la marca sessionStorage['portify-gate']='1' y navega a href.
 *                     Si algo falla, o con movimiento reducido, navega de inmediato. Nunca retiene la navegación > ~900 ms.
 *   reveal():         fase de salida. Se llama sola al cargar la página si existe la marca.
 * Técnica: fragment shader WebGL2 por SDF (bordes con fwidth/smoothstep, ruido triangular de +-0.5/255, render a
 * min(dpr,2)); sin WebGL2 = respaldo CSS (fundido + logo SVG); prefers-reduced-motion = sin animación.
 * No toca formularios ni botones de la página: sólo escucha clics en enlaces con data-gate (ver campo-acceso.js). */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var KEY = 'portify-gate', KEYO = 'portify-gate-o';
  var COVER = 350, HOLD = 700, TOTAL = 1300, GO_MAX = 880;
  var cur = null, raf = 0, tickT = 0, safety = 0, startT = 0, forceGL = true;

  function nav(href) { try { if (href) window.location.href = href; } catch (e) { /* nada */ } }
  function reduced() { try { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return true; } }
  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
  function smooth(x) { return x * x * (3 - 2 * x); }
  function spring(a, k) { return a <= 0 ? 0 : 1 - (1 + k * a) * Math.exp(-k * a); }
  function bezier(x1, y1, x2, y2) {
    function A(a, b) { return 1 - 3 * b + 3 * a; } function B(a, b) { return 3 * b - 6 * a; } function C(a) { return 3 * a; }
    function at(t, a, b) { return ((A(a, b) * t + B(a, b)) * t + C(a)) * t; }
    function sl(t, a, b) { return 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a); }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 8; i++) { var d = at(t, x1, x2) - x, s = sl(t, x1, x2); if (Math.abs(d) < 1e-5 || Math.abs(s) < 1e-6) break; t -= d / s; }
      t = clamp(t, 0, 1);
      return at(t, y1, y2);
    };
  }
  var easeOut = bezier(0.23, 1, 0.32, 1);

  /* ---- paleta desde los tokens (oklch -> sRGB vía canvas 2D) ---- */
  function palette() {
    var px = doc.createElement('canvas'); px.width = px.height = 1;
    var c2 = px.getContext('2d', { willReadFrequently: true });
    function tok(n) {
      var v = getComputedStyle(root).getPropertyValue(n).trim();
      c2.clearRect(0, 0, 1, 1); c2.fillStyle = '#000'; c2.fillStyle = v; c2.fillRect(0, 0, 1, 1);
      var d = c2.getImageData(0, 0, 1, 1).data; return [d[0] / 255, d[1] / 255, d[2] / 255];
    }
    return { bg: tok('--bg'), tx: tok('--text'), ac: tok('--accent'), light: root.getAttribute('data-theme') === 'light' };
  }
  function geom() {
    var W = window.innerWidth, H = window.innerHeight, S = W < 640 ? 72 : 88;
    return { W: W, H: H, S: S, scale: S / 24 };
  }
  function orgOf(el) {
    var W = window.innerWidth, H = window.innerHeight, r = null;
    try { r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null; } catch (e) { r = null; }
    if (!r || r.width < 1 || r.height < 1) return [W / 2, H / 2];
    return [r.left + r.width / 2, r.top + r.height / 2];
  }

  /* ---- shaders ---- */
  var VS = '#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}';
  var FS = [
    '#version 300 es',
    'precision highp float;',
    'precision highp int;',
    'uniform vec2 uRes;uniform float uDpr,uScale;',
    'uniform vec3 uBg,uTx,uAc;',
    'out vec4 o;',
    'const float PI=3.14159265;',
    'float sdRB(vec2 p,vec2 b,float r){r=min(r,min(b.x,b.y));vec2 q=abs(p)-b+vec2(r);return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}',
    'float cov(float d){float w=max(fwidth(d),1e-4)*.75;return 1.-smoothstep(-w,w,d);}',
    'float covp(float d,float w){return 1.-smoothstep(-w,w,d);}',
    'float h21(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}',
    /* parámetro de longitud de arco del contorno del logo (rect 22x22, rx 6), horario */
    'const float R6=6.,A5=5.,L0=R6*PI/4.,EE=10.,AR=R6*PI/2.;',
    'const float O1=L0,O2=O1+EE,O3=O2+AR,O4=O3+EE,O5=O4+AR,O6=O5+EE,O7=O6+AR,O8=O7+EE,PP=O8+L0;',
    'float pathS(vec2 q){',
    ' vec2 k=abs(q)-A5;float s;',
    ' if(k.x>0.&&k.y>0.){',
    '  vec2 v=q-sign(q)*A5;float ph=atan(v.y,v.x);',
    '  if(q.x<0.&&q.y<0.) s=ph<-.75*PI?O8+R6*(ph+PI):R6*(ph+.75*PI);',
    '  else if(q.x>=0.&&q.y<0.) s=O2+R6*(ph+.5*PI);',
    '  else if(q.x>=0.) s=O4+R6*ph;',
    '  else s=O6+R6*(ph-.5*PI);',
    ' }else if(k.x>k.y){ s=q.x>0.?O3+q.y+A5:O7+A5-q.y; }',
    ' else{ s=q.y<0.?O1+q.x+A5:O5+A5-q.x; }',
    ' return s;}',
    /* logo: aro trazado, punto grande --text y punto pequeño --accent; color premultiplicado */
    'vec4 logoCol(vec2 lq,float sc,float stroke,float big,float small){',
    ' vec2 u=lq/sc;',
    ' float dU=sdRB(u,vec2(11.),6.);',
    ' float aSt=cov((abs(dU)-.8)*sc);',
    ' float sA=pathS(u);float wS=.75/sc;',
    ' float mS=smoothstep(-wS,wS,stroke*(PP+2.*wS)-wS-sA);',
    ' mS*=mix(smoothstep(-wS,wS,sA),1.,step(.9999,stroke));',
    ' aSt*=mS;',
    ' vec2 L=u+12.;',
    ' float aB=cov((length(L-vec2(9.,9.5))-3.2*big)*sc)*smoothstep(0.,.08,big);',
    ' float aS=cov((length(L-vec2(16.,15.5))-2.2*small)*sc)*smoothstep(0.,.08,small);',
    ' vec4 c=vec4(uTx*aSt,aSt);',
    ' c=vec4(uTx*aB,aB)+c*(1.-aB);',
    ' c=vec4(uAc*aS,aS)+c*(1.-aS);',
    ' return c;}',
    'uniform vec3 uGap;uniform vec2 uC,uOrgC;',
    'uniform float uCell,uTile,uRad,uMaxD,uTc,uTr,uStroke,uBig,uSmall,uLogoA;',
    'const float SPC=200.,FLC=150.,SPR=400.,FLR=200.;',
    'float kCell(vec2 id){',
    ' vec2 cc=uC+id*uCell;',
    ' float dn=clamp(length(cc-uOrgC)/uCell/uMaxD,0.,1.);',
    ' return uTr<0.?clamp((uTc-dn*SPC)/FLC,0.,1.):clamp((uTr-dn*SPR)/FLR,0.,1.);}',
    'float presK(float k){return uTr<0.?smoothstep(0.,.1,k):1.-smoothstep(.9,1.,k);}',
    'void main(){',
    ' vec2 fc=gl_FragCoord.xy/uDpr;vec2 p=vec2(fc.x,uRes.y-fc.y);',
    ' float wp=fwidth(p.x)*.85;',
    ' vec2 g=(p-uC)/uCell+.5;vec2 id=floor(g);vec2 f=fract(g)-.5;vec2 q=f*uCell;',
    ' float k=kCell(id);float pr=presK(k);',
    ' float bx=(.5-abs(f.x))*uCell,by=(.5-abs(f.y))*uCell;',
    ' float fxb=.5*(1.-smoothstep(0.,wp,bx)),fyb=.5*(1.-smoothstep(0.,wp,by));',
    ' float prx=presK(kCell(id+vec2(f.x>0.?1.:-1.,0.)));',
    ' float pry=presK(kCell(id+vec2(0.,f.y>0.?1.:-1.)));',
    ' float a=mix(mix(pr,prx,fxb),pry,fyb);',
    ' float e=k*k*(3.-2.*k);',
    ' float sy=uTr<0.?sin(e*1.5707963):cos(e*1.5707963);',
    ' float hy=uTile*.5*sy;',
    ' float dT=sdRB(q,vec2(uTile*.5,hy),uRad);',
    ' float tA=covp(dT,wp)*smoothstep(0.,.05,sy);',
    ' float sh=.06*(1.-sy);',
    ' float sg=clamp(q.y/max(hy,1.),-1.,1.);',
    ' vec3 tc=sg<0.?mix(uBg,vec3(1.),-sg*sh):mix(uBg,vec3(0.),sg*sh);',
    ' vec4 col=vec4(uGap*a,a);',
    ' col=vec4(tc*tA,tA)+col*(1.-tA);',
    ' vec2 lq=p-uC;',
    ' float pl=covp(sdRB(lq,vec2(11.*uScale+12.),6.*uScale+12.),wp)*uLogoA;',
    ' col=vec4(uBg*pl,pl)+col*(1.-pl);',
    ' vec4 lg=logoCol(lq,uScale,uStroke,uBig,uSmall)*uLogoA;',
    ' col=lg+col*(1.-lg.a);',
    ' float n=(h21(gl_FragCoord.xy)+h21(gl_FragCoord.xy+17.3)-1.)*.5/255.;',
    ' col.rgb=clamp(col.rgb+n*col.a,0.,col.a);',
    ' o=col;}'
  ].join('\n');

  function mountGL(org) {
    var cv = doc.createElement('canvas'); cv.className = 'gate-fx'; cv.setAttribute('aria-hidden', 'true');
    var gl = null;
    try { gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' }); } catch (e) { gl = null; }
    if (!gl) return null;
    var G = geom(), dpr = Math.min(window.devicePixelRatio || 1, 2), dead = false;
    cv.width = Math.max(2, Math.round(G.W * dpr)); cv.height = Math.max(2, Math.round(G.H * dpr));
    function lose() { try { var x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (e) { /* nada */ } }
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; }
    var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS), pr = gl.createProgram();
    if (!vs || !fs) { lose(); return null; }
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { lose(); return null; }
    gl.useProgram(pr); gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0);
    var U = {};
    ['uRes', 'uDpr', 'uScale', 'uBg', 'uTx', 'uAc', 'uGap', 'uC', 'uOrgC', 'uCell', 'uTile', 'uRad', 'uMaxD', 'uTc', 'uTr', 'uStroke', 'uBig', 'uSmall', 'uLogoA']
      .forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
    var P = palette(), tile = G.W < 640 ? 44 : 56, cell = tile + 2, W = G.W, H = G.H;
    gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uDpr, cv.width / W); gl.uniform1f(U.uScale, G.scale);
    gl.uniform3fv(U.uBg, P.bg); gl.uniform3fv(U.uTx, P.tx); gl.uniform3fv(U.uAc, P.ac);
    gl.uniform1f(U.uTile, tile); gl.uniform1f(U.uCell, cell); gl.uniform1f(U.uRad, W < 640 ? 5 : 7);
    gl.uniform2f(U.uC, W / 2, H / 2);
    var k = P.light ? 0.10 : 0.07;
    gl.uniform3f(U.uGap, P.bg[0] + (P.tx[0] - P.bg[0]) * k, P.bg[1] + (P.tx[1] - P.bg[1]) * k, P.bg[2] + (P.tx[2] - P.bg[2]) * k);
    var md = Math.max(Math.hypot(org[0], org[1]), Math.hypot(W - org[0], org[1]), Math.hypot(org[0], H - org[1]), Math.hypot(W - org[0], H - org[1])) / cell;
    gl.uniform2f(U.uOrgC, org[0], org[1]); gl.uniform1f(U.uMaxD, Math.max(md, 1));
    function onLost(e) { try { e.preventDefault(); } catch (x) { /* nada */ } finish(); }
    cv.addEventListener('webglcontextlost', onLost);
    return {
      el: cv,
      draw: function (T) {
        if (dead) return;
        var tr = T - HOLD;
        gl.uniform1f(U.uTc, T); gl.uniform1f(U.uTr, tr > 0 ? tr : -1);
        gl.uniform1f(U.uLogoA, smooth(clamp((T - 340) / 80, 0, 1)) * (1 - smooth(clamp(tr / 140, 0, 1))));
        gl.uniform1f(U.uStroke, easeOut(clamp((T - 340) / 300, 0, 1)));
        gl.uniform1f(U.uBig, spring((T - 400) / 1000, 16)); gl.uniform1f(U.uSmall, spring((T - 420) / 1000, 22));
        gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      destroy: function () { dead = true; try { cv.removeEventListener('webglcontextlost', onLost); } catch (e) { /* nada */ } lose(); if (cv.parentNode) cv.parentNode.removeChild(cv); }
    };
  }

  /* respaldo sin WebGL2: lámina --bg que se funde + logo SVG estático */
  function mountCSS() {
    var G = geom();
    var d = doc.createElement('div'); d.className = 'gate-fx gate-fx--css'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<div class="gate-bg"></div>' +
      '<svg class="gate-logo" viewBox="0 0 24 24" width="' + G.S + '" height="' + G.S + '" fill="none">' +
      '<rect x="1" y="1" width="22" height="22" rx="6" stroke="currentColor" stroke-width="1.6"/>' +
      '<circle cx="9" cy="9.5" r="3.2" fill="currentColor"/><circle cx="16" cy="15.5" r="2.2" fill="var(--accent)"/></svg>';
    var bg = d.children[0], svg = d.children[1];
    return {
      el: d,
      draw: function (T) {
        var rv = T - HOLD;
        bg.style.opacity = (rv > 0 ? 1 - clamp(rv / 600, 0, 1) : clamp(T / COVER, 0, 1)).toFixed(3);
        svg.style.opacity = (smooth(clamp((T - COVER) / 120, 0, 1)) * (rv > 0 ? 1 - smooth(clamp(rv / 140, 0, 1)) : 1)).toFixed(3);
      },
      destroy: function () { if (d.parentNode) d.parentNode.removeChild(d); }
    };
  }

  function mount(org) {
    var o = null;
    if (forceGL) { try { o = mountGL(org); } catch (e) { o = null; } }
    if (!o) o = mountCSS();
    (doc.body || root).appendChild(o.el);
    cur = o;
    return o;
  }
  function finish() {
    cancelAnimationFrame(raf); clearTimeout(tickT); clearTimeout(safety);
    if (cur) { try { cur.destroy(); } catch (e) { /* nada */ } cur = null; }
  }

  /* go: línea de tiempo 0 -> HOLD (cubre y dibuja el logo); al llegar a HOLD navega y deja la última imagen puesta */
  function go(fromEl, href) {
    try {
      if (cur || reduced() || !href) { nav(href); return; }
      var org = orgOf(fromEl), left = false;
      var o = mount(org), t0 = performance.now();
      function leave() {
        if (left) return; left = true;
        try { sessionStorage.setItem(KEY, '1'); sessionStorage.setItem(KEYO, (org[0] / window.innerWidth).toFixed(4) + ',' + (org[1] / window.innerHeight).toFixed(4)); } catch (e) { /* nada */ }
        nav(href);
      }
      function adv(now) {
        if (left || cur !== o) return false;
        var T = clamp(now - t0, 0, HOLD);
        try { o.draw(T); } catch (e) { leave(); return false; }
        if (T >= HOLD) { leave(); return false; }
        return true;
      }
      /* rAF no corre con la pestaña oculta: un temporizador avanza la misma línea de tiempo */
      (function tick() { tickT = setTimeout(function () { if (adv(performance.now())) tick(); }, 50); })();
      (function step(now) { if (adv(now)) raf = requestAnimationFrame(step); })(t0);
      safety = setTimeout(leave, GO_MAX);
    } catch (e) { nav(href); }
  }

  /* reveal: arranca ya cubierta (T = HOLD) y las teselas giran de salida */
  function reveal() {
    var org = [window.innerWidth / 2, window.innerHeight / 2];
    try {
      try {
        var raw = sessionStorage.getItem(KEYO);
        sessionStorage.removeItem(KEY); sessionStorage.removeItem(KEYO);
        if (raw) { var p = raw.split(','); if (p.length === 2 && isFinite(+p[0]) && isFinite(+p[1])) org = [clamp(+p[0], 0, 1) * window.innerWidth, clamp(+p[1], 0, 1) * window.innerHeight]; }
      } catch (e) { /* nada */ }
      if (cur || reduced()) return;
      var o = mount(org);
      try { o.draw(HOLD); } catch (e) { finish(); return; }
      var t0 = 0, started = false;
      function adv(now) {
        if (cur !== o) return false;
        var T = HOLD + (now - t0);
        if (T >= TOTAL) { finish(); return false; }
        try { o.draw(T); } catch (e) { finish(); return false; }
        return true;
      }
      function begin() {
        if (started || cur !== o) return; started = true;
        t0 = performance.now();
        (function tick() { tickT = setTimeout(function () { if (adv(performance.now())) tick(); }, 50); })();
        (function step(now) { if (adv(now)) raf = requestAnimationFrame(step); })(t0);
      }
      if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', begin); else begin();
      setTimeout(begin, 1500);
      safety = setTimeout(finish, 1500 + TOTAL + 1000);
    } catch (e) { finish(); }
  }

  window.CampoGate = { go: go, reveal: reveal };

  /* si la página anterior dejó la marca, la salida se juega ahora (el script va en <head>: la página arranca cubierta) */
  try { if (sessionStorage.getItem(KEY)) reveal(); } catch (e) { /* almacenamiento bloqueado */ }

  /* volver con "atrás" desde el caché: que no quede la cubierta puesta */
  window.addEventListener('pageshow', function (ev) { if (ev && ev.persisted) finish(); });
})();
