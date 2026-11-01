// Core engine: fonts, WebGL sky shader, 2D helpers, easing, grain.
// Scenes call ENGINE.sky(params) and draw on ENGINE.ctx.
(function () {
  const W = 1080, H = 1350;
  const FONT_DIR = 'fonts/';
  const FONTS = [
    ['Instrument Serif', 'instrument-serif-latin-400-normal.woff2', '400', 'normal'],
    ['Instrument Serif', 'instrument-serif-latin-400-italic.woff2', '400', 'italic'],
    ['Fraunces', 'fraunces-latin-300-normal.woff2', '300', 'normal'],
    ['Fraunces', 'fraunces-latin-400-italic.woff2', '400', 'italic'],
    ['Fraunces', 'fraunces-latin-600-normal.woff2', '600', 'normal'],
    ['Fraunces', 'fraunces-latin-900-normal.woff2', '900', 'normal'],
    ['Anton', 'anton-latin-400-normal.woff2', '400', 'normal'],
    ['Bebas Neue', 'bebas-neue-latin-400-normal.woff2', '400', 'normal'],
    ['Space Grotesk', 'space-grotesk-latin-400-normal.woff2', '400', 'normal'],
    ['Space Grotesk', 'space-grotesk-latin-500-normal.woff2', '500', 'normal'],
    ['Space Grotesk', 'space-grotesk-latin-700-normal.woff2', '700', 'normal'],
    ['Archivo', 'archivo-latin-800-normal.woff2', '800', 'normal'],
    ['Archivo', 'archivo-latin-900-normal.woff2', '900', 'normal'],
    ['Archivo', 'archivo-latin-500-normal.woff2', '500', 'normal'],
    ['Caveat', 'caveat-latin-600-normal.woff2', '600', 'normal'],
    ['Cormorant Garamond', 'cormorant-garamond-latin-500-italic.woff2', '500', 'italic'],
    ['Cormorant Garamond', 'cormorant-garamond-latin-600-normal.woff2', '600', 'normal'],
    ['Newsreader', 'newsreader-latin-400-italic.woff2', '400', 'italic'],
    ['Instrument Sans', 'instrument-sans-latin-500-normal.woff2', '500', 'normal'],
    ['Instrument Sans', 'instrument-sans-latin-700-normal.woff2', '700', 'normal'],
    ['Archivo', 'archivo-latin-200-normal.woff2', '200', 'normal'],
    ['Archivo', 'archivo-latin-300-normal.woff2', '300', 'normal'],
    ['Archivo', 'archivo-latin-600-normal.woff2', '600', 'normal'],
    ['Archivo', 'archivo-latin-900-normal.woff2', '900', 'normal'],
    ['EB Garamond', 'eb-garamond-latin-500-italic.woff2', '500', 'italic'],
    ['EB Garamond', 'eb-garamond-latin-400-italic.woff2', '400', 'italic'],
    ['EB Garamond', 'eb-garamond-latin-500-normal.woff2', '500', 'normal'],
    ['EB Garamond', 'eb-garamond-latin-600-italic.woff2', '600', 'italic'],
    ['JBM', 'JetBrainsMono-Medium.ttf', '500', 'normal'],
    ['JBM', 'JetBrainsMono-SemiBold.ttf', '600', 'normal'],
    ['JBM', 'JetBrainsMono-Bold.ttf', '700', 'normal'],
  ];

  async function loadFonts() {
    await Promise.all(FONTS.map(async ([fam, file, weight, style]) => {
      try {
        const f = new FontFace(fam, `url(${FONT_DIR}${file})`, { weight, style });
        await f.load();
        document.fonts.add(f);
      } catch (e) { console.warn('font fail', file, e.message); }
    }));
  }

  // ------------------------------------------------------------ easing
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const smoother = t => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
  const easeOutCubic = t => 1 - Math.pow(1 - clamp(t), 3);
  const easeInCubic = t => Math.pow(clamp(t), 3);
  const easeOutExpo = t => (t = clamp(t)) === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  const easeInOutSine = t => -(Math.cos(Math.PI * clamp(t)) - 1) / 2;
  const easeOutBack = (t, s = 1.7) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; };
  const easeOutElastic = t => { t = clamp(t); if (t === 0 || t === 1) return t; return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1; };
  const range = (t, a, b) => clamp((t - a) / (b - a));
  // seeded hash
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const hexToRgb = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]; };
  const mixRgb = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  // ------------------------------------------------------------ WebGL sky
  const SKY_FS = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uT;
uniform vec3 uTop, uBot, uHorizon; uniform float uCloud, uStorm, uSun, uFlash, uZoom, uDrift, uFog, uWarp, uDark, uRain, uGlowR;
uniform vec2 uSunPos, uCam, uOff, uOff2;
out vec4 o;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;mat2 r=mat2(.8,.6,-.6,.8);for(int i=0;i<6;i++){s+=a*n(p);p=r*p*2.03+3.1;a*=.5;}return s;}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes; // 0..1, y up
  vec2 p=(uv-.5)*vec2(uRes.x/uRes.y,1.);
  p=p/uZoom+uCam;
  // gradient sky
  float gy=uv.y;
  vec3 sky=mix(uBot,uTop,smoothstep(0.,1.,gy));
  sky=mix(sky,uHorizon,exp(-pow((gy-.18)*3.2,2.))*.55);
  // clouds (domain-warped fbm with directional edge lighting)
  sky=mix(sky,vec3(.165,.155,.20),uStorm*.85);
  vec2 q=p*2.2+uOff;
  vec2 wv=vec2(fbm(q*.6+uOff2),fbm(q*.6+5.2-uOff2));
  float d=fbm(q+wv*uWarp);
  float d2=fbm(q+wv*uWarp+vec2(.035,.06));
  float cov=mix(.80,.30,uCloud);
  float cl=smoothstep(cov,cov+.28,d);
  float light=clamp((d-d2)*7.+.55,0.,1.);
  vec3 litCol=mix(vec3(1.),uHorizon,.22)*mix(1.,.62,uStorm);
  vec3 shadowCol=mix(vec3(.70,.74,.85),vec3(.24,.25,.32),uStorm);
  vec3 cloudCol=mix(shadowCol,litCol,light);
  cloudCol*=mix(1.,.72,smoothstep(.62,1.,d)*uStorm);
  vec3 col=mix(sky,cloudCol,cl);
  // lightning flash (internal glow, stronger where cloud is thin / lit)
  col+=uFlash*vec3(1.,.96,.88)*(.22+cl*(.25+light*.75));
  // sun / sunshinification
  vec2 sp=(uSunPos-.5)*vec2(uRes.x/uRes.y,1.);
  float ds=length((uv-.5)*vec2(uRes.x/uRes.y,1.)-sp);
  float glow=exp(-ds*ds/(uGlowR*uGlowR));
  col+=uSun*(vec3(1.,.82,.55)*glow*.9+vec3(1.,.9,.75)*.18);
  col=mix(col,vec3(1.,.96,.88),uSun*uSun*.35*(1.-ds));
  // fog
  col=mix(col,vec3(.93,.93,.95),uFog);
  col*=1.-uDark;
  // vignette
  float v=smoothstep(1.2,.35,length((uv-.5)*vec2(1.,1.15)));
  col*=mix(.82,1.,v);
  o=vec4(col,1.);
}`;
  const VS = `#version 300 es
in vec2 p;void main(){gl_Position=vec4(p,0,1);}`;

  let gl, prog, U = {}, glCanvas, ctx, canvas2d, grainCanvas;
  function initGL() {
    glCanvas = document.getElementById('gl');
    gl = glCanvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, SKY_FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uOff', 'uOff2', 'uRes', 'uT', 'uTop', 'uBot', 'uHorizon', 'uCloud', 'uStorm', 'uSun', 'uFlash', 'uZoom', 'uDrift', 'uFog', 'uWarp', 'uDark', 'uRain', 'uSunPos', 'uCam', 'uGlowR']
      .forEach(k => U[k] = gl.getUniformLocation(prog, k));
  }

  const SKY_DEFAULT = {
    t: 0, top: '#7fb3f0', bot: '#f6dcc0', horizon: '#ffd2a8', cloud: 0.5, storm: 0, sun: 0, flash: 0,
    zoom: 1, drift: 0.02, fog: 0, warp: 1.2, dark: 0, rain: 0, sunPos: [0.5, 0.7], cam: [0, 0], glowR: 0.35,
  };
  function sky(params) {
    const P = Object.assign({}, SKY_DEFAULT, params);
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.uniform2f(U.uRes, glCanvas.width, glCanvas.height);
    gl.uniform1f(U.uT, P.t);
    // periodic (60 s) drift so the loop seam matches; P.off adds a manual offset (pans)
    const ph = 2 * Math.PI * P.t / 60;
    const R = P.driftR ?? 0.6;
    const off = P.off || [0, 0];
    gl.uniform2f(U.uOff, R * Math.cos(ph) + off[0], R * Math.sin(ph) + off[1]);
    gl.uniform2f(U.uOff2, 0.3 * Math.cos(ph + 1.0), 0.3 * Math.sin(ph + 1.0));
    const c3 = (k, v) => { const c = Array.isArray(v) ? v : hexToRgb(v); gl.uniform3f(U[k], c[0], c[1], c[2]); };
    c3('uTop', P.top); c3('uBot', P.bot); c3('uHorizon', P.horizon);
    gl.uniform1f(U.uCloud, P.cloud); gl.uniform1f(U.uStorm, P.storm); gl.uniform1f(U.uSun, P.sun);
    gl.uniform1f(U.uFlash, P.flash); gl.uniform1f(U.uZoom, P.zoom); gl.uniform1f(U.uDrift, P.drift);
    gl.uniform1f(U.uFog, P.fog); gl.uniform1f(U.uWarp, P.warp); gl.uniform1f(U.uDark, P.dark); gl.uniform1f(U.uRain, P.rain);
    gl.uniform2f(U.uSunPos, P.sunPos[0], P.sunPos[1]); gl.uniform2f(U.uCam, P.cam[0], P.cam[1]); gl.uniform1f(U.uGlowR, P.glowR);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // ------------------------------------------------------------ grain
  const GRAIN_FRAMES = [];
  function initGrain() {
    for (let k = 0; k < 8; k++) {
      const c = document.createElement('canvas');
      c.width = 540; c.height = 675;
      const g = c.getContext('2d');
      const im = g.createImageData(c.width, c.height);
      let s = 1234 + k * 999;
      const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let i = 0; i < im.data.length; i += 4) {
        const v = (rnd() + rnd() + rnd()) / 3 * 255;
        im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255;
      }
      g.putImageData(im, 0, 0);
      GRAIN_FRAMES.push(c);
    }
  }
  function grain(t, amount = 0.06) {
    const f = GRAIN_FRAMES[Math.floor(t * 24) % GRAIN_FRAMES.length];
    ctx.save();
    ctx.globalAlpha = amount;
    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(f, 0, 0, W, H);
    ctx.restore();
  }

  // ------------------------------------------------------------ text helpers
  function font(size, fam = 'Instrument Serif', weight = '400', style = 'normal') {
    return `${style} ${weight} ${size}px "${fam}"`;
  }
  // Draw text with letter spacing, alignment, and per-glyph callback
  function measure(str, f, spacing = 0) {
    ctx.font = f;
    if (!spacing) return ctx.measureText(str).width;
    let w = 0;
    for (const ch of str) w += ctx.measureText(ch).width + spacing;
    return w - spacing;
  }
  function wrap(str, f, maxW) {
    ctx.font = f;
    const words = str.split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  window.ENGINE = {
    W, H, loadFonts, initGL, initGrain, sky, grain, font, measure, wrap,
    clamp, lerp, smooth, smoother, easeOutCubic, easeInCubic, easeOutExpo, easeInOutSine, easeOutBack, easeOutElastic, range, hash, hexToRgb, mixRgb,
    get ctx() { return ctx; }, get canvas() { return canvas2d; }, get glCanvas() { return glCanvas; },
    init2d() { canvas2d = document.getElementById('c'); ctx = canvas2d.getContext('2d'); },
  };
})();
