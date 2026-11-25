/* Portify · Campo · fondos WebGL (portada y app). Mini motor propio, sin librerías: WebGL1 + GLSL escrito a mano.
   Aditivo: monta un <canvas aria-hidden> detrás de cada contenedor (pointer-events:none) y no toca la lógica de los otros scripts.
   - Aurora de mercado (héroe y encabezado de la app): simplex con domain warping en capas, índigo → violeta → teal apagado,
     respira despacio y se deforma hacia el puntero. Familia: "Mesh Gradient" de Paper Shaders y "Shader Background" en 21st.dev.
   - Rejilla viva (áreas de trazado): retícula de puntos que ondula y se enciende cerca del cursor. Familia: "dot shader background".
   - Seda (banda de Planes): pliegues lentos con grano. Familia: "Silk shader" (21st.dev, varios autores; original de React Bits).
   - Líneas de flujo (pie): isolíneas de un campo de ruido que deriva, resplandor índigo y grano fijo.
   Además, sobre el gráfico del héroe: línea de luz de entrada, estela del cursor y sonar en el último precio (canvas 2D propio).
   Robustez: sin WebGL queda el respaldo CSS; pérdida/restauración de contexto; DPR ≤ 2 y resolución interna reducida;
   un solo bucle rAF, tope 30 fps (60 mientras el puntero interactúa); pausa fuera de pantalla y con la pestaña oculta;
   si el intervalo medio de cuadro pasa de 24 ms baja la resolución y, si sigue, congela un cuadro. Móvil: menos octavas.
   prefers-reduced-motion: un cuadro estático por lienzo, sin bucle. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, W = window;
  if (W.CampoShaders) return;
  var rmq = matchMedia('(prefers-reduced-motion: reduce)');
  var still = function () { return rmq.matches; };
  var coarse = matchMedia('(pointer: coarse)').matches, small = function () { return innerWidth < 768; };
  var LOWQ = coarse || small();
  var DPR = Math.min(W.devicePixelRatio || 1, 2);

  /* ---------------- GLSL ---------------- */
  var HEAD = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'uniform vec2 R; uniform float T; uniform vec3 P; uniform float D; uniform vec3 A; uniform vec3 C; uniform float O; uniform float M;',
    'vec3 perm(vec3 x){return mod(((x*34.0)+1.0)*x,289.0);}',
    'float sn(vec2 v){const vec4 K=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);',
    'vec2 i=floor(v+dot(v,K.yy));vec2 x0=v-i+dot(i,K.xx);vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);',
    'vec4 x12=x0.xyxy+K.xxzz;x12.xy-=i1;i=mod(i,289.0);',
    'vec3 p=perm(perm(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));',
    'vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);m=m*m;m=m*m;',
    'vec3 x=2.0*fract(p*K.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;',
    'm*=1.79284291400159-0.85373472095314*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;',
    'return 130.0*dot(m,g);}',
    'float fbm(vec2 p){float s=0.0,a=0.5;mat2 r=mat2(0.8,-0.6,0.6,0.8);for(int i=0;i<OCT;i++){s+=a*sn(p);p=r*p*2.02;a*=0.5;}return s;}',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}',
    /* violeta y teal apagados, fijos; el índigo (A) sale de los tokens */
    'const vec3 VIO=vec3(0.545,0.361,0.965);const vec3 TEAL=vec3(0.20,0.52,0.56);'
  ].join('\n');

  var FRAG = {
    /* aurora de mercado: q y r son dos capas de warping; f es el campo final. Bandas suaves con sin(f). */
    aurora: [
      'void main(){vec2 uv=gl_FragCoord.xy/R;float s=0.95/max(R.y,R.x*0.45);vec2 p=gl_FragCoord.xy*s;vec2 m=P.xy*s;',
      'vec2 d=m-p;float infl=P.z*exp(-dot(d,d)*5.0);p+=d*infl*0.28;',
      'float t=T*0.04;',
      'vec2 q=vec2(fbm(p+vec2(0.0,t)),fbm(p+vec2(5.2,1.3)-t));',
      'vec2 r=vec2(fbm(p+1.3*q+vec2(1.7,9.2)+0.5*t),fbm(p+1.3*q+vec2(8.3,2.8)-0.4*t));',
      'float f=fbm(p+1.2*r);',
      'vec3 col=mix(A,VIO,smoothstep(-0.3,0.5,r.x));col=mix(col,TEAL,smoothstep(0.2,0.7,q.y)*0.55);',
      'float band=0.5+0.5*sin(f*3.2+r.y*2.0+t*3.0);',
      'float k=smoothstep(-0.05,0.6,f+0.25*q.x);k*=0.6+0.4*band;k=k*k*(3.0-2.0*k);k+=infl*0.22;',
      'float a=clamp(k*O,0.0,1.0)+(hash(gl_FragCoord.xy)-0.5)/160.0;a=max(a,0.0);',
      'a=min(a,M);gl_FragColor=vec4(col*a,a);}'
    ].join('\n'),
    /* rejilla viva: G = paso en px del búfer; SW = (posición del barrido 0..1, intensidad) */
    grid: [
      'uniform float G;uniform vec2 SW;',
      'void main(){vec2 fc=gl_FragCoord.xy;vec2 c=(floor(fc/G)+0.5)*G;vec2 f=fc-c;vec2 cu=c/R;',
      'float n=sn(cu*vec2(2.6,1.8)+vec2(T*0.05,-T*0.035));',
      'float wave=0.5+0.5*sin((cu.x*4.0+cu.y*2.2)*3.14159-T*0.6+n*1.8);wave*=wave;',
      'vec2 dv=(c-P.xy)/R.y;float near=P.z*exp(-dot(dv,dv)*28.0);',
      'float sw=0.0;if(SW.y>0.001){float dx=cu.x-SW.x;sw=SW.y*(exp(-dx*dx*700.0)+(dx<0.0?exp(dx*4.0)*0.32:0.0));}',
      'float r=G*(0.07+0.035*wave+0.075*near+0.05*sw);float aa=max(0.6,G*0.03);',
      'float dm=1.0-smoothstep(r-aa,r+aa,length(f));',
      'float lum=0.32+0.5*wave+1.25*near+1.1*sw;',
      'vec3 col=mix(C,A,clamp(0.2+0.35*wave+near+sw,0.0,1.0));',
      'float a=clamp(dm*lum*O,0.0,1.0);a=min(a,M);gl_FragColor=vec4(col*a,a);}'
    ].join('\n'),
    /* seda: pliegues por senos anidados sobre coordenadas giradas, luz índigo y grano fijo */
    silk: [
      'void main(){vec2 uv=gl_FragCoord.xy/R;vec2 p=gl_FragCoord.xy/R.y;',
      'float cs=cos(0.42),sn2=sin(0.42);p=mat2(cs,-sn2,sn2,cs)*p*2.4;',
      'vec2 m=P.xy/R.y;vec2 md=(gl_FragCoord.xy/R.y)-m;float near=P.z*exp(-dot(md,md)*6.0);',
      'float t=T*0.16;p.y+=0.045*sin(7.0*p.x-t)+near*0.06;',
      'float pat=0.6+0.4*sin(5.0*(p.x+p.y+cos(3.0*p.x+5.0*p.y)+0.02*t)+sin(20.0*(p.x+p.y-0.1*t)));',
      'pat=pat*pat;',
      'float soft=0.5+0.5*sn(p*0.35+vec2(t*0.08,0.0));',
      'vec3 col=mix(A,VIO,soft*0.7);col=mix(col,TEAL,smoothstep(0.6,1.0,uv.x)*0.25);',
      'float a=O*(0.25+0.75*pat)*(0.55+0.45*soft)+near*O*0.25;',
      'a+=(hash(floor(gl_FragCoord.xy))-0.5)*O*0.18;a=clamp(a,0.0,1.0);',
      'a=min(a,M);gl_FragColor=vec4(col*a,a);}'
    ].join('\n'),
    /* líneas de flujo: isolíneas de fbm que derivan; resplandor que se mueve despacio arriba; grano fijo */
    flow: [
      'void main(){vec2 uv=gl_FragCoord.xy/R;vec2 p=gl_FragCoord.xy/R.y;float t=T*0.022;',
      'float n=fbm(p*1.15+vec2(t,-t*0.7));float v=n*5.5+uv.y*2.2+t*0.6;',
      'float d=abs(fract(v)-0.5);',
      '#ifdef DER', 'float w=fwidth(v)*1.1;', '#else', 'float w=0.035;', '#endif',
      'float line=1.0-smoothstep(w*0.4,w*1.4,d);',
      'vec2 gc=vec2(0.5+0.28*sin(T*0.045),1.02);vec2 g=(uv-gc)*vec2(1.0,1.6);float glow=exp(-dot(g,g)*2.6);',
      'vec2 m=P.xy/R;vec2 md=(uv-m)*vec2(R.x/R.y,1.0);float near=P.z*exp(-dot(md,md)*14.0);',
      'vec3 col=mix(A,VIO,smoothstep(0.1,0.9,uv.x));col=mix(col,TEAL,smoothstep(0.55,1.0,1.0-uv.y)*0.35);',
      'float a=O*(glow*0.5+line*(0.16+0.55*glow+0.7*near));',
      'a+=(hash(floor(gl_FragCoord.xy))-0.5)*O*0.2;a=clamp(a,0.0,1.0);',
      'a=min(a,M);gl_FragColor=vec4(col*a,a);}'
    ].join('\n')
  };
  var VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';

  /* ---------------- tokens del tema ---------------- */
  var px = doc.createElement('canvas'); px.width = px.height = 1;
  var pxc = px.getContext('2d', { willReadFrequently: true });
  function col(name, fb) {
    var v = getComputedStyle(root).getPropertyValue(name).trim() || fb;
    if (!pxc) return [0.39, 0.4, 0.95];
    pxc.clearRect(0, 0, 1, 1); pxc.fillStyle = fb; pxc.fillStyle = v; pxc.fillRect(0, 0, 1, 1);
    var d = pxc.getImageData(0, 0, 1, 1).data; return [d[0] / 255, d[1] / 255, d[2] / 255];
  }
  var theme = {};
  function readTheme() {
    theme.dark = root.getAttribute('data-theme') === 'dark' ? 1 : 0;
    theme.acc = col('--accent', '#6366f1'); theme.t3 = col('--text-3', '#63636b');
  }
  readTheme();

  /* ---------------- puntero compartido ---------------- */
  var ptr = { x: -1e4, y: -1e4, t: 0 };
  addEventListener('pointermove', function (e) { ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = performance.now(); if (!running) kick(); }, { passive: true });
  doc.addEventListener('pointerleave', function () { ptr.x = ptr.y = -1e4; }, { passive: true });
  addEventListener('blur', function () { ptr.x = ptr.y = -1e4; });

  /* ---------------- instancias ---------------- */
  var list = [], running = false, raf = 0, t0 = performance.now(), level = 0, frozen = false;
  var stats = { frames: 0, deltas: [], level: 0, lost: 0, created: 0, failed: 0 };
  var io = 'IntersectionObserver' in W ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { var s = e.target._sh; if (!s) return; s.forEach(function (x) { x.vis = e.isIntersecting; if (x.vis) x.dirty = true; }); });
    kick();
  }, { rootMargin: '80px 0px' }) : null;
  var ro = 'ResizeObserver' in W ? new ResizeObserver(function (es) { es.forEach(function (e) { (e.target._sh || []).forEach(function (x) { x.resize(); }); }); kick(); }) : null;

  function track(host, inst) {
    (host._sh = host._sh || []).push(inst); list.push(inst);
    if (io) io.observe(host); else inst.vis = true;
    if (ro) ro.observe(host);
  }

  /* opciones: kind, cls, scale (fracción de la resolución), op (opacidad clara/oscura), extra (uniforms), parent */
  function GL(host, o) {
    var cv = doc.createElement('canvas'); cv.className = 'sh-cv ' + o.cls; cv.setAttribute('aria-hidden', 'true');
    var attrs = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' };
    var gl = null;
    try { gl = (W.__shForceNoGL || /[?&]sh=0\b/.test(location.search)) ? null : (cv.getContext('webgl', attrs) || cv.getContext('experimental-webgl', attrs)); } catch (e) { gl = null; }
    if (!gl) { stats.failed++; return null; }
    var self = { host: host, cv: cv, gl: gl, o: o, vis: false, dirty: true, last: 0, lost: false, scale: o.scale, kind: 'gl',
      p: { x: -1e4, y: -1e4, z: 0 }, act: 0, sw: [0, 0] };
    function build() {
      var der = gl.getExtension('OES_standard_derivatives');
      var pre = '#define OCT ' + (LOWQ || o.low ? 2 : (o.oct || 4)) + '\n' + (der ? '#extension GL_OES_standard_derivatives : enable\n#define DER\n' : '');
      function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[campo-shaders]', gl.getShaderInfoLog(s)); return null; } return s; }
      var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, pre + HEAD + '\n' + FRAG[o.kind]);
      if (!vs || !fs) return false;
      var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.bindAttribLocation(pr, 0, 'a'); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
      gl.useProgram(pr);
      var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      self.u = {}; ['R', 'T', 'P', 'D', 'A', 'C', 'O', 'M', 'G', 'SW'].forEach(function (n) { self.u[n] = gl.getUniformLocation(pr, n); });
      gl.disable(gl.BLEND); gl.clearColor(0, 0, 0, 0);
      return true;
    }
    if (!build()) { stats.failed++; return null; }
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.lost = true; stats.lost++; host.classList.remove('sh-on'); });
    cv.addEventListener('webglcontextrestored', function () { self.lost = false; if (build()) { self.resize(); self.dirty = true; host.classList.add('sh-on'); kick(); } });
    self.resize = function () {
      var r = cv.getBoundingClientRect(), k = DPR * self.scale * (level >= 1 ? 0.65 : 1);
      var w = Math.max(2, Math.round(r.width * k)), h = Math.max(2, Math.round(r.height * k));
      self.k = k; self.cw = r.width; self.ch = r.height;
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      self.dirty = true;
    };
    self.render = function (now, dt) {
      if (self.lost || !self.cw) return;
      var r = cv.getBoundingClientRect(), u = self.u, k = self.k;
      /* puntero suavizado, en px del búfer con y hacia arriba */
      var inside = ptr.x >= r.left - 40 && ptr.x <= r.right + 40 && ptr.y >= r.top - 40 && ptr.y <= r.bottom + 40 && now - ptr.t < 4000;
      var tx = (ptr.x - r.left) * k, ty = (r.bottom - ptr.y) * k, tz = inside && !coarse ? 1 : 0;
      var e = 1 - Math.exp(-dt / (o.kind === 'grid' ? 70 : 260));
      if (self.p.z < 0.01 && tz) { self.p.x = tx; self.p.y = ty; }
      self.p.x += (tx - self.p.x) * e; self.p.y += (ty - self.p.y) * e; self.p.z += (tz - self.p.z) * e * 0.6;
      self.act = inside && now - ptr.t < 600 ? now : self.act;
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(u.R, cv.width, cv.height);
      gl.uniform1f(u.T, still() ? 14 : (now - t0) / 1000 + (o.t0 || 0));
      gl.uniform3f(u.P, self.p.x, self.p.y, still() ? 0 : self.p.z);
      gl.uniform1f(u.D, theme.dark);
      gl.uniform3f(u.A, theme.acc[0], theme.acc[1], theme.acc[2]);
      gl.uniform3f(u.C, theme.t3[0], theme.t3[1], theme.t3[2]);
      gl.uniform1f(u.O, o.op[theme.dark]); gl.uniform1f(u.M, (o.cap || [1, 1])[theme.dark]);
      if (u.G) gl.uniform1f(u.G, (o.gap || 16) * k);
      if (u.SW) gl.uniform2f(u.SW, self.sw[0], self.sw[1]);
      gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
      self.dirty = false;
    };
    /* lectura de píxeles para la verificación: renderiza y lee en la misma tarea */
    self.sample = function () {
      self.render(performance.now(), 16);
      var w = cv.width, h = cv.height, d = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, d);
      var maxA = 0, sumA = 0, nz = 0; for (var i = 3; i < d.length; i += 4) { var a = d[i]; if (a > maxA) maxA = a; sumA += a; if (a > 2) nz++; }
      return { w: w, h: h, maxA: +(maxA / 255).toFixed(3), meanA: +(sumA / (w * h) / 255).toFixed(4), painted: +(nz / (w * h)).toFixed(3) };
    };
    (o.parent || host).appendChild(cv);
    host.classList.add('sh-on'); stats.created++;
    track(host, self); self.resize();
    return self;
  }

  /* ---------------- capa 2D sobre el gráfico del héroe: barrido, estela y sonar ---------------- */
  function HeroFx(plot, grid) {
    if (still()) return null;
    var cv = doc.createElement('canvas'); cv.className = 'sh-fx'; cv.setAttribute('aria-hidden', 'true');
    var ctx = cv.getContext('2d'); if (!ctx) return null;
    plot.appendChild(cv);
    var tag = doc.getElementById('tagLast'), trail = [], sweep = { t: 0, on: false, done: false };
    var self = { host: plot, cv: cv, vis: false, dirty: true, last: 0, kind: '2d', act: 0 };
    self.resize = function () { var r = plot.getBoundingClientRect(); self.w = r.width; self.h = r.height; cv.width = Math.round(r.width * DPR); cv.height = Math.round(r.height * DPR); self.dirty = true; };
    var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    plot.addEventListener('pointermove', function (e) {
      if (!fine) return; var r = plot.getBoundingClientRect(), n = performance.now();
      trail.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: n }); if (trail.length > 40) trail.shift(); self.act = n; kick();
    }, { passive: true });
    self.startSweep = function () { if (sweep.on || sweep.done) return; sweep.on = true; sweep.t = performance.now() + 450; kick(); };
    self.replay = function (at) { sweep.done = false; sweep.on = true; sweep.t = (at || performance.now()) + 450; kick(); return sweep.t; };
    self.render = function (now) {
      var w = self.w, h = self.h; if (!w) return;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, w, h);
      var acc = 'rgb(' + theme.acc.map(function (v) { return Math.round(v * 255); }).join(',') + ')';
      var x0 = 4, x1 = w - (w < 480 ? 66 : 78), y0 = 10, y1 = h - 26;
      /* 1. línea de luz de entrada: recorre el área de trazado una vez y enciende la rejilla a su paso */
      if (sweep.on) {
        var k = (now - sweep.t) / 1500;
        if (k >= 0) {
          var e = k >= 1 ? 1 : k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, sx = x0 + (x1 - x0) * e, fade = k < 1 ? 1 : Math.max(0, 1 - (k - 1) * 2.2);
          var g = ctx.createLinearGradient(sx - 70, 0, sx + 8, 0);
          g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.85, acc); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.globalAlpha = 0.16 * fade; ctx.fillStyle = g; ctx.fillRect(sx - 70, y0, 78, y1 - y0);
          var gv = ctx.createLinearGradient(0, y0, 0, y1); gv.addColorStop(0, 'rgba(0,0,0,0)'); gv.addColorStop(0.5, acc); gv.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.globalAlpha = 0.75 * fade; ctx.fillStyle = gv; ctx.fillRect(Math.round(sx), y0, 1.5, y1 - y0);
          if (grid) { grid.sw[0] = (sx + 2) / w; grid.sw[1] = fade; grid.dirty = true; }
          if (fade <= 0) { sweep.on = false; sweep.done = true; if (grid) grid.sw[1] = 0; }
        }
      }
      /* 2. estela del cursor: segmentos que se adelgazan y apagan en ~450 ms */
      while (trail.length && now - trail[0].t > 450) trail.shift();
      if (trail.length > 1) {
        ctx.lineCap = 'round'; ctx.strokeStyle = acc;
        for (var i = 1; i < trail.length; i++) {
          var a = trail[i - 1], b = trail[i], life = 1 - (now - b.t) / 450; if (life <= 0) continue;
          ctx.globalAlpha = 0.10 * life; ctx.lineWidth = 7 * life + 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          ctx.globalAlpha = 0.55 * life; ctx.lineWidth = 1.4 * life + 0.4; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      /* 3. sonar en el último precio: un anillo cada 2.6 s sobre el borde del eje, a la altura de la etiqueta */
      var ty = tag && parseFloat(tag.style.top);
      if (ty > 0) {
        var ph = ((now - t0) % 2600) / 2600, on = tag.classList.contains('on');
        ctx.globalAlpha = (on ? 0.55 : 0.32) * (1 - ph); ctx.strokeStyle = acc; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x1 - 8, ty, 3 + ph * 11, 0, 6.2832); ctx.stroke();
        ctx.globalAlpha = on ? 0.95 : 0.6; ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(x1 - 8, ty, 2.4, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1; self.dirty = false;
    };
    self.busy = function (now) { return sweep.on || trail.length > 0 || now - self.act < 500; };
    track(plot, self); self.resize();
    return self;
  }

  /* ---------------- bucle único ---------------- */
  var lastNow = 0;
  function kick() { if (running || frozen && !anyDirty()) return; if (doc.hidden) return; running = true; lastNow = 0; raf = requestAnimationFrame(loop); }
  function anyDirty() { return list.some(function (s) { return s.vis && s.dirty; }); }
  function loop(now) {
    raf = 0;
    if (W.__shManual) { running = false; return; }   /* solo verificación: cuadros a mano */
    var dt = lastNow ? now - lastNow : 16; lastNow = now;
    var any = false, renderedGL = false;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!s.host.isConnected) {   /* contenedor reemplazado (p. ej. la gráfica de Mercados al reconstruirse): se suelta su contexto */
        list.splice(i--, 1); if (io) io.unobserve(s.host); if (ro) ro.unobserve(s.host);
        if (s.gl) { var lc = s.gl.getExtension('WEBGL_lose_context'); if (lc) lc.loseContext(); }
        continue;
      }
      if (!s.vis) continue;
      if (still() || frozen) { if (s.dirty) { s.render(now, 1000); } continue; }
      var fast = s.kind === '2d' ? s.busy(now) : now - s.act < 800;
      var iv = fast ? 15 : (LOWQ ? 40 : 32);
      if (s.kind === '2d' && !fast && !s.dirty) { iv = 32; }
      if (now - s.last >= iv) { s.render(now, Math.min(100, now - (s.last || now - 16))); s.last = now; if (s.kind === 'gl') renderedGL = true; }
      any = true;
    }
    /* degradación: intervalo medio de rAF mientras hay WebGL corriendo */
    if (renderedGL && !still() && !frozen) {
      stats.frames++; if (stats.frames > 40) { stats.deltas.push(dt); }
      if (stats.deltas.length >= 90) {
        var m = stats.deltas.reduce(function (a, b) { return a + b; }, 0) / stats.deltas.length; stats.mean = +m.toFixed(1); stats.deltas = [];
        if (m > 24) {
          level++; stats.level = level;
          if (level === 1) list.forEach(function (s) { if (s.kind === 'gl') s.resize(); });
          else { frozen = true; root.classList.add('sh-frozen'); list.forEach(function (s) { s.dirty = true; }); }
        }
      }
    }
    if (any && !doc.hidden && !still() && !frozen) raf = requestAnimationFrame(loop);
    else if (anyDirty() && !doc.hidden) raf = requestAnimationFrame(loop);
    else running = false;
  }
  doc.addEventListener('visibilitychange', function () { if (doc.hidden) { cancelAnimationFrame(raf); running = false; } else kick(); });
  function repaint() { readTheme(); list.forEach(function (s) { s.dirty = true; }); running = false; cancelAnimationFrame(raf); kick(); }
  new MutationObserver(repaint).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  rmq.addEventListener && rmq.addEventListener('change', repaint);

  /* ---------------- montaje ---------------- */
  var mounted = new WeakSet();
  function mount(host, fn) { if (!host || mounted.has(host)) return null; mounted.add(host); return fn(host); }
  function scan() {
    /* portada */
    var hero = doc.querySelector('.hero');
    mount(hero, function (h) { return GL(h, { kind: 'aurora', cls: 'sh-hero', scale: LOWQ ? 0.35 : 0.45, op: [0.27, 0.5], cap: [0.19, 0.34], oct: 3 }); });
    var plot = doc.getElementById('cdPlot'), g1 = null;
    mount(plot, function (p) {
      g1 = GL(p, { kind: 'grid', cls: 'sh-grid', scale: 1, op: [0.30, 0.34], cap: [0.22, 0.3], gap: 18, oct: 1 });
      var fx = HeroFx(p, g1); if (fx) W.CampoShaders.heroFx = fx;
      if (fx && 'IntersectionObserver' in W) {
        var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); setTimeout(fx.startSweep, 350); } }, { threshold: 0.5 }); o.observe(p);
      }
      return g1;
    });
    doc.querySelectorAll('.mkt-cv, #lpChart .cv-wrap').forEach(function (b) {
      mount(b, function (x) { return GL(x, { kind: 'grid', cls: 'sh-grid', scale: 1, op: [0.26, 0.30], cap: [0.22, 0.3], gap: 18, oct: 1 }); });
    });
    var plans = doc.getElementById('plans');
    mount(plans, function (p) { return GL(p, { kind: 'silk', cls: 'sh-band', scale: LOWQ ? 0.35 : 0.5, op: [0.27, 0.32], cap: [0.19, 0.3], oct: 1, t0: 40 }); });
    var foot = doc.getElementById('siteFoot');
    mount(foot, function (f) { return GL(f, { kind: 'flow', cls: 'sh-foot', scale: LOWQ ? 0.4 : 0.5, op: [0.26, 0.42], cap: [0.15, 0.26], oct: 3, t0: 80 }); });
    /* app */
    var head = doc.querySelector('.app-main > .app-head, .app-main > div:not([hidden]) > .app-head');
    mount(head, function (h) { return GL(h, { kind: 'aurora', cls: 'sh-apphead', scale: 0.4, op: [0.26, 0.42], cap: [0.15, 0.26], low: true, t0: 20 }); });
    var ac = doc.querySelector('.app-main .cv-wrap');
    mount(ac, function (x) { return GL(x, { kind: 'grid', cls: 'sh-grid', scale: 1, op: [0.24, 0.28], cap: [0.22, 0.3], gap: 18, oct: 1 }); });
    kick();
  }
  var sq = 0;
  function queue() { if (!sq) sq = setTimeout(function () { sq = 0; scan(); }, 250); }

  W.CampoShaders = { list: list, stats: stats, sample: function (i) { return list[i] && list[i].sample ? list[i].sample() : null; }, scan: scan,
    level: function () { return level; }, frozen: function () { return frozen; } };

  function start() {
    scan();
    if (W.MutationObserver) new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) if (ms[i].addedNodes.length) { queue(); return; }
    }).observe(doc.body, { childList: true, subtree: true });
  }
  /* tras el primer pintado: no compite con el LCP */
  function idle() { if (W.requestIdleCallback) requestIdleCallback(start, { timeout: 1200 }); else setTimeout(start, 200); }
  if (doc.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
})();
