// LX: small "light renderer" toolkit for the v2 look (lookdev only, not wired into v1).
// - WebGL2 on a hidden 1080x1350 canvas: programs, float (RGBA16F) render targets, full-screen passes,
//   instanced additive light lines (HDR), dual-Kawase bloom, radial (god-ray) blur, ACES composite.
// - Canvas2D helpers: neon multipass strokes, variable-width brush strokes, grabby paths, masks.
// Coordinates: all public APIs take canvas pixels (1080x1350, y down). Internally GL passes use vUv (y up),
// textures uploaded from canvases are flipped (UNPACK_FLIP_Y) so they match GL orientation.
(function () {
  const W = 1080, H = 1350;
  const LX = { W, H, scale: 1, profile: false, marks: [], gl: null };
  let gl, glc, triVAO, lineVAO, lineBuf;
  const targets = {}, texCache = {}, scratch = {};

  // ---------------------------------------------------------------- color utils
  const hex = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]; };
  const lin = c => c.map(v => Math.pow(v, 2.2));
  LX.hex = hex; LX.lin = c => lin(typeof c === 'string' ? hex(c) : c);
  LX.rgba = (h, a) => { const c = hex(h); return `rgba(${c[0] * 255 | 0},${c[1] * 255 | 0},${c[2] * 255 | 0},${a})`; };
  LX.hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
  // deterministic hash in [0,1)
  LX.hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // ---------------------------------------------------------------- profiling marks
  // When LX.profile is true, mark() forces a sync (GL readPixels + 2D getImageData) and records the stage time.
  let markT = 0;
  LX.beginMarks = () => { LX.marks = []; markT = performance.now(); };
  LX.mark = (label) => {
    if (!LX.profile) return;
    if (gl) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); }
    LX.ctx.getImageData(0, 0, 1, 1);
    const now = performance.now();
    LX.marks.push([label, +(now - markT).toFixed(1)]);
    markT = now;
  };

  // ---------------------------------------------------------------- GL core
  const VS = `#version 300 es
layout(location=0) in vec2 p; out vec2 vUv;
void main(){ vUv = p*.5+.5; gl_Position = vec4(p,0,1); }`;

  LX.initGL = function () {
    glc = document.getElementById('lxgl');
    gl = glc.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, alpha: false, premultipliedAlpha: false });
    LX.gl = gl; LX.glc = glc;
    gl.getExtension('EXT_color_buffer_float'); gl.getExtension('EXT_float_blend'); gl.getExtension('OES_texture_float_linear');
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    triVAO = gl.createVertexArray(); gl.bindVertexArray(triVAO);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    lineVAO = gl.createVertexArray(); gl.bindVertexArray(lineVAO);
    const cb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, cb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    lineBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    for (let i = 0; i < 3; i++) { gl.enableVertexAttribArray(1 + i); gl.vertexAttribPointer(1 + i, 4, gl.FLOAT, false, 48, i * 16); gl.vertexAttribDivisor(1 + i, 1); }
    gl.bindVertexArray(null);
    // 1x1 white texture: default for optional samplers (avoids sampling the bound render target = feedback loop)
    const wt = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, wt);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    LX.white = { tex: wt, w: 1, h: 1 };
    LINE = LX.prog(LINE_FS, LINE_VS);
    DOWN = LX.prog(DOWN_FS); UP = LX.prog(UP_FS); RADIAL = LX.prog(RADIAL_FS); COMP = LX.prog(COMP_FS);
  };

  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n'));
    return s;
  }
  LX.prog = function (fs, vs = VS) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const U = {};
    return { p, loc: n => (n in U) ? U[n] : (U[n] = gl.getUniformLocation(p, n)) };
  };
  // uniforms: number -> 1f, [a,b(,c(,d))] -> nf, target/tex object {tex} -> sampler, {i:n} -> 1i, {v2:Float32Array} -> 2fv ...
  function setUniforms(P, u) {
    let unit = 0;
    for (const k in u) {
      const v = u[k], L = P.loc(k);
      if (L === null) continue;
      if (typeof v === 'number') gl.uniform1f(L, v);
      else if (Array.isArray(v)) gl['uniform' + v.length + 'f'](L, ...v);
      else if (v && v.tex) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v.tex); gl.uniform1i(L, unit); unit++; }
      else if (v && 'i' in v) gl.uniform1i(L, v.i);
      else if (v && v.v1) gl.uniform1fv(L, v.v1);
      else if (v && v.v2) gl.uniform2fv(L, v.v2);
      else if (v && v.v3) gl.uniform3fv(L, v.v3);
      else if (v && v.v4) gl.uniform4fv(L, v.v4);
    }
  }
  LX.uniforms = setUniforms;
  // float render target, cached by key
  LX.target = function (key, w, h, fmt = 'f16') {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    let t = targets[key];
    if (t && t.w === w && t.h === h && t.fmt === fmt) return t;
    if (t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); }
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    if (fmt === 'f16') gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else if (fmt === 'f32') gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    t = targets[key] = { tex, fb, w, h, fmt };
    return t;
  };
  LX.clear = function (t, r = 0, g = 0, b = 0, a = 1) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fb : null);
    gl.viewport(0, 0, t ? t.w : W, t ? t.h : H);
    gl.clearColor(r, g, b, a); gl.clear(gl.COLOR_BUFFER_BIT);
  };
  // upload a canvas as texture (cached GL texture per key)
  LX.canvasTex = function (key, canvas) {
    let t = texCache[key];
    if (!t) {
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      t = texCache[key] = { tex };
    }
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    t.w = canvas.width; t.h = canvas.height;
    return t;
  };
  // full-screen pass. target null => default framebuffer, viewport opts.vp (default full canvas)
  LX.pass = function (P, u, target, opts = {}) {
    gl.useProgram(P.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
    const vp = target ? [0, 0, target.w, target.h] : (opts.vp || [0, 0, W, H]);
    gl.viewport(...vp);
    if (opts.blend === 'add') { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); } else gl.disable(gl.BLEND);
    setUniforms(P, Object.assign({ uRes: [vp[2], vp[3]] }, u));
    gl.bindVertexArray(triVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.BLEND);
  };
  // copy the GL default framebuffer (full res or the bottom-left w x h region) into the 2D canvas
  LX.present = function (ctx, w = W, h = H, op = 'source-over', alpha = 1) {
    ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha = alpha;
    ctx.drawImage(glc, 0, H - h, w, h, 0, 0, W, H);
    ctx.restore();
  };
  // scratch 2D canvases (cached)
  LX.scratch = function (key, w, h) {
    let c = scratch[key];
    if (!c) { c = scratch[key] = document.createElement('canvas'); }
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d', LX.cpu ? { willReadFrequently: true } : undefined);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    return [c, g];
  };

  // ---------------------------------------------------------------- additive light lines (instanced, HDR)
  // per line 12 floats: x0,y0,x1,y1 | r,g,b (linear, HDR ok), width(px, gaussian sigma-ish) | i0,i1 (intensity at start/end), cap(px), 0
  let LINE, DOWN, UP, RADIAL, COMP;
  const LINE_VS = `#version 300 es
layout(location=0) in vec2 c; layout(location=1) in vec4 seg; layout(location=2) in vec4 col; layout(location=3) in vec4 prof;
uniform vec2 uRes; uniform float uScale;
out vec3 vA; out vec4 vCol; out vec4 vProf;
void main(){
  vec2 a=seg.xy*uScale, b=seg.zw*uScale; vec2 d=b-a; float L=max(length(d),1e-3); vec2 t=d/L, n=vec2(-t.y,t.x);
  float w0=col.a*uScale; float w=max(w0,.6); float hw=w*1.7+.75;
  vec2 pos=(c.x<0.? a-t*hw : b+t*hw) + n*c.y*hw;
  vA=vec3(dot(pos-a,t), c.y*hw/w, L);
  vCol=vec4(col.rgb*(w0/w), 0.); vProf=vec4(prof.xy, max(prof.z*uScale,1.), 0.);
  vec2 ndc=pos/uRes*2.-1.; ndc.y=-ndc.y; gl_Position=vec4(ndc,0,1);
}`;
  const LINE_FS = `#version 300 es
precision highp float;
in vec3 vA; in vec4 vCol; in vec4 vProf;
uniform sampler2D uMask; uniform float uMaskMode, uMaskLo; uniform vec2 uRes;
out vec4 o;
void main(){
  float s=vA.x, L=vA.z;
  float g=exp(-vA.y*vA.y*1.6);
  float cap=smoothstep(0.,vProf.z,s)*smoothstep(0.,vProf.z,L-s);
  float pr=mix(vProf.x,vProf.y,clamp(s/L,0.,1.));
  float m=1.;
  if(uMaskMode>.5){ float k=texture(uMask,gl_FragCoord.xy/uRes).r; m=mix(uMaskLo,1.,uMaskMode<1.5?k:1.-k); }
  o=vec4(vCol.rgb*g*cap*pr*m,1.);
}`;
  // draw `count` lines from Float32Array `data` additively into target t
  LX.lines = function (t, data, count, opts = {}) {
    gl.useProgram(LINE.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.viewport(0, 0, t.w, t.h);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    const u = { uRes: [t.w, t.h], uScale: t.w / W, uMaskMode: 0, uMaskLo: 0, uMask: LX.white };
    if (opts.mask) { u.uMask = opts.mask; u.uMaskMode = opts.maskMode || 1; u.uMaskLo = opts.maskLo ?? 0.05; }
    setUniforms(LINE, u);
    gl.bindVertexArray(lineVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, count * 12), gl.DYNAMIC_DRAW);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    gl.bindVertexArray(null); gl.disable(gl.BLEND);
  };
  // helper to fill line buffers
  LX.LineBuf = class {
    constructor(n) { this.d = new Float32Array(n * 12); this.n = 0; }
    reset() { this.n = 0; return this; }
    add(x0, y0, x1, y1, rgb, w, i0 = 1, i1 = 1, cap = 4) {
      if ((this.n + 1) * 12 > this.d.length) return;
      const o = this.n++ * 12, d = this.d;
      d[o] = x0; d[o + 1] = y0; d[o + 2] = x1; d[o + 3] = y1; d[o + 4] = rgb[0]; d[o + 5] = rgb[1]; d[o + 6] = rgb[2]; d[o + 7] = w;
      d[o + 8] = i0; d[o + 9] = i1; d[o + 10] = cap; d[o + 11] = 0;
    }
  };

  // ---------------------------------------------------------------- bloom (dual Kawase)
  const DOWN_FS = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uThresh;
void main(){ vec2 h=uTexel*.5;
  vec3 s=texture(uSrc,vUv).rgb*4.+texture(uSrc,vUv-h).rgb+texture(uSrc,vUv+h).rgb+texture(uSrc,vUv+vec2(h.x,-h.y)).rgb+texture(uSrc,vUv-vec2(h.x,-h.y)).rgb;
  s/=8.; if(uThresh>0.){ float l=max(s.r,max(s.g,s.b)); s*=smoothstep(uThresh*.6,uThresh*1.4,l); }
  o=vec4(s,1.); }`;
  const UP_FS = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uSrc, uAdd; uniform vec2 uTexel; uniform float uAddK;
void main(){ vec2 h=uTexel*.5;
  vec3 s=texture(uSrc,vUv+vec2(-h.x*2.,0.)).rgb+texture(uSrc,vUv+vec2(-h.x,h.y)).rgb*2.+texture(uSrc,vUv+vec2(0.,h.y*2.)).rgb+texture(uSrc,vUv+vec2(h.x,h.y)).rgb*2.
        +texture(uSrc,vUv+vec2(h.x*2.,0.)).rgb+texture(uSrc,vUv+vec2(h.x,-h.y)).rgb*2.+texture(uSrc,vUv+vec2(0.,-h.y*2.)).rgb+texture(uSrc,vUv+vec2(-h.x,-h.y)).rgb*2.;
  o=vec4(s/12.+texture(uAdd,vUv).rgb*uAddK,1.); }`;
  // returns a target at half the source size holding a wide multi-scale glow of src
  LX.bloom = function (src, levels = 5, thresh = 0) {
    const down = [];
    let cur = src;
    for (let i = 1; i <= levels; i++) {
      const t = LX.target('bd' + i, src.w / 2 ** i, src.h / 2 ** i);
      LX.pass(DOWN, { uSrc: cur, uTexel: [1 / cur.w, 1 / cur.h], uThresh: i === 1 ? thresh : 0 }, t);
      down.push(t); cur = t;
    }
    for (let i = levels - 1; i >= 1; i--) {
      const t = LX.target('bu' + i, down[i - 1].w, down[i - 1].h);
      LX.pass(UP, { uSrc: cur, uAdd: down[i - 1], uTexel: [1 / cur.w, 1 / cur.h], uAddK: 1 }, t);
      cur = t;
    }
    return cur;
  };

  // ---------------------------------------------------------------- radial blur (god rays / light streaks)
  const RADIAL_FS = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uSrc; uniform vec2 uC; uniform float uLen, uDecay, uGain; uniform vec2 uAsp;
const int N=16;
float h12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
void main(){ vec2 d=(vUv-uC)*uLen/float(N); vec2 uv=vUv-d*h12(gl_FragCoord.xy); float w=1.; vec3 acc=vec3(0); float ws=0.;
  for(int i=0;i<N;i++){ acc+=texture(uSrc,uv).rgb*w; ws+=w; w*=uDecay; uv-=d; }
  o=vec4(acc/ws*uGain,1.); }`;
  // two cascaded passes (16 + 16 taps ~ 256 effective samples). c = light center in canvas px. len = fraction of distance.
  LX.radial = function (src, c, len = 0.5, decay = 0.97, gain = 1.0, key = 'rad') {
    const cu = [c[0] / W, 1 - c[1] / H];
    const a = LX.target(key + 'A', src.w, src.h), b = LX.target(key + 'B', src.w, src.h);
    LX.pass(RADIAL, { uSrc: src, uC: cu, uLen: len, uDecay: decay, uGain: gain }, a);
    LX.pass(RADIAL, { uSrc: a, uC: cu, uLen: len / 16, uDecay: 1.0, uGain: 1.0 }, b);
    return b;
  };

  // ---------------------------------------------------------------- composite: bg + hdr + bloom -> ACES -> sRGB
  const COMP_FS = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D uHdr, uBloom, uBgTex; uniform float uBloomK, uExpo, uCA, uHasBg, uHasBgTex, uGrain, uSeed, uSat;
uniform vec3 uBgTop, uBgBot;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
float h12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
void main(){
  vec3 bg=mix(uBgBot,uBgTop,vUv.y)*uHasBg;
  if(uHasBgTex>.5) bg=pow(texture(uBgTex,vUv).rgb,vec3(2.2));
  vec3 c=bg+texture(uHdr,vUv).rgb;
  vec2 dc=(vUv-.5)*uCA;
  vec3 b=vec3(texture(uBloom,vUv+dc).r, texture(uBloom,vUv).g, texture(uBloom,vUv-dc).b);
  c+=b*uBloomK;
  c=aces(c*uExpo);
  float l=dot(c,vec3(.2126,.7152,.0722)); c=max(mix(vec3(l),c,uSat),0.);
  c=pow(c,vec3(1./2.2));
  c+=(h12(gl_FragCoord.xy+uSeed)-.5)*uGrain;
  o=vec4(c,1.); }`;
  LX.composite = function (hdr, bloom, o = {}) {
    const fullW = o.w || W, fullH = o.h || H;
    LX.pass(COMP, {
      uHdr: hdr, uBloom: bloom || hdr, uBloomK: bloom ? (o.bloomK ?? 0.6) : 0, uExpo: o.expo ?? 1, uCA: o.ca ?? 0.004,
      uHasBg: o.bgTop ? 1 : 0, uBgTop: o.bgTop || [0, 0, 0], uBgBot: o.bgBot || [0, 0, 0],
      uHasBgTex: o.bgTex ? 1 : 0, uBgTex: o.bgTex || hdr, uGrain: o.grain ?? 0.02, uSeed: o.seed ?? 0, uSat: o.sat ?? 1,
    }, null, { vp: [0, 0, fullW, fullH] });
  };

  // ---------------------------------------------------------------- Canvas2D helpers
  // neon stroke: wide soft glow passes + hot core, additive ('lighter'); optional chromatic fringe
  LX.neon = function (ctx, path, color, width = 6, o = {}) {
    const glow = o.glow ?? 1, fringe = o.fringe ?? 0;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'lighter';
    const passes = [[width * 7, 0.035], [width * 4, 0.07], [width * 2.2, 0.16], [width * 1.2, 0.45]];
    for (const [w, a] of passes) {
      ctx.lineWidth = w; ctx.globalAlpha = a * glow;
      if (fringe) {
        ctx.strokeStyle = '#ff2a3a'; ctx.save(); ctx.translate(-fringe, 0); ctx.stroke(path); ctx.restore();
        ctx.strokeStyle = '#2a6bff'; ctx.save(); ctx.translate(fringe, 0); ctx.stroke(path); ctx.restore();
      }
      ctx.strokeStyle = color; ctx.stroke(path);
    }
    ctx.globalAlpha = 0.95; ctx.lineWidth = Math.max(1.5, width * 0.42); ctx.strokeStyle = o.core || '#fffaf0'; ctx.stroke(path);
    ctx.restore();
  };
  // Catmull-Rom smoothing of a polyline -> dense points
  LX.smoothPts = function (pts, per = 8, closed = false) {
    const out = [], n = pts.length;
    const P = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      for (let k = 0; k < per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    if (!closed) out.push(pts[n - 1]); else out.push(out[0]);
    return out;
  };
  LX.polyPath = function (pts, closed = false) {
    const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); if (closed) p.closePath(); return p;
  };
  // variable-width brush stroke (tapered ends, pressure wobble), returned as a fillable Path2D
  LX.brushPath = function (pts, w, seed = 0, taper = 0.6) {
    const n = pts.length, L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const s = i / (n - 1);
      const pres = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, s))), taper) * (0.8 + 0.35 * Math.sin(s * 9 + seed * 3.1) + 0.1 * Math.sin(s * 23 + seed));
      const hw = w * 0.5 * Math.max(0.08, pres);
      L.push([pts[i][0] - dy * hw, pts[i][1] + dx * hw]); R.push([pts[i][0] + dy * hw, pts[i][1] - dx * hw]);
    }
    const p = new Path2D();
    L.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]));
    for (let i = R.length - 1; i >= 0; i--) p.lineTo(R[i][0], R[i][1]);
    p.closePath();
    return p;
  };

  // ---------------------------------------------------------------- grabby geometry (shared by all demos)
  // body: tilted bean. blob: vibrating wobbly disc (dukkha) clutched to his right. face: squeezed > < and zigzag.
  LX.grabby = function (t, cx = 540, cy = 820, s = 1, o = {}) {
    const rx = 182 * s, ry = 198 * s;
    const bodyPts = [];
    for (let i = 0; i < 96; i++) {
      const a = i / 96 * Math.PI * 2;
      const r = 1 - 0.045 * Math.cos(2 * (a + 0.5)) + 0.012 * Math.sin(3 * a + 1);
      bodyPts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r * (Math.sin(a) > 0 ? 0.97 : 1)]);
    }
    const vib = o.vib ?? 1;
    const bx = cx + 178 * s, by = cy + 48 * s, R = 80 * s;
    const blobPts = [];
    for (let i = 0; i < 72; i++) {
      const a = i / 72 * Math.PI * 2;
      const r = 1 + vib * (0.10 * Math.sin(5 * a + 13 * t) + 0.06 * Math.sin(9 * a - 21 * t) + 0.04 * Math.sin(14 * a + 37 * t));
      blobPts.push([bx + Math.cos(a) * R * r, by + Math.sin(a) * R * r]);
    }
    const eyeL = [[cx - 82 * s, cy - 70 * s], [cx - 44 * s, cy - 50 * s], [cx - 82 * s, cy - 30 * s]];
    const eyeR = [[cx + 34 * s, cy - 70 * s], [cx - 2 * s, cy - 50 * s], [cx + 34 * s, cy - 30 * s]];
    const mouth = []; for (let i = 0; i <= 6; i++) mouth.push([cx - 48 * s + i * 14 * s, cy + 12 * s + (i % 2 ? -9 : 9) * s]);
    const arm = [[cx + 120 * s, cy + 90 * s], [cx + 150 * s, cy + 112 * s], [bx - 28 * s, by + 60 * s], [bx + 10 * s, by + 70 * s]];
    const mitten = [[bx - 40 * s, by + 40 * s], [bx - 10 * s, by + 82 * s], [bx + 40 * s, by + 70 * s], [bx + 58 * s, by + 30 * s]];
    return {
      cx, cy, rx, ry, bx, by, R, bodyPts, blobPts, eyeL, eyeR, mouth, arm, mitten,
      body: LX.polyPath(bodyPts, true), blob: LX.polyPath(blobPts, true),
      face: [eyeL, eyeR, mouth].map(p => LX.polyPath(p)),
      armPath: LX.polyPath(LX.smoothPts(arm, 8)), mittenPath: LX.polyPath(LX.smoothPts(mitten, 8)),
    };
  };
  // GLSL SDF of the same character (pixels, y down). returns vec2(body, blob) signed distances.
  LX.GLSL_GRABBY = `
float sdEll(vec2 p, vec2 r){ float k0=length(p/r); float k1=length(p/(r*r)); return k0*(k0-1.)/max(k1,1e-4); }
vec2 grabbySDF(vec2 q, vec2 c, float s, float t, float vib){
  vec2 p=q-c; float a=atan(p.y,p.x);
  float rr=1.-.045*cos(2.*(a+.5))+.012*sin(3.*a+1.);
  float body=sdEll(p,vec2(182.,198.)*s*rr);
  vec2 bp=q-(c+vec2(178.,48.)*s); float ba=atan(bp.y,bp.x);
  float br=80.*s*(1.+vib*(.10*sin(5.*ba+13.*t)+.06*sin(9.*ba-21.*t)+.04*sin(14.*ba+37.*t)));
  float blob=length(bp)-br;
  return vec2(body,blob);
}`;
  // white-on-black mask of the character on a scratch canvas at scale k (for GL masks)
  LX.maskCanvas = function (key, k, drawFn) {
    const [c, g] = LX.scratch(key, Math.round(W * k), Math.round(H * k));
    g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
    g.scale(k, k); g.fillStyle = '#fff'; g.strokeStyle = '#fff';
    drawFn(g);
    return c;
  };

  // cheap glow for Canvas2D: draw glow shapes into a 1/4-res canvas, blur it there, add it back upscaled.
  // (wide multipass strokes / shadowBlur at full res are 5-10x slower in this renderer)
  LX.glow2d = function (ctx, drawFn, o = {}) {
    const k = o.scale || 0.25, w = Math.round(W * k), h = Math.round(H * k);
    const [c1, g1] = LX.scratch('glowA', w, h);
    g1.clearRect(0, 0, w, h); g1.scale(k, k); g1.lineCap = 'round'; g1.lineJoin = 'round';
    drawFn(g1);
    const [c2, g2] = LX.scratch('glowB', w, h);
    g2.clearRect(0, 0, w, h); g2.filter = `blur(${o.blur ?? 4}px)`; g2.drawImage(c1, 0, 0);
    if (o.tight) { g2.filter = 'none'; g2.globalAlpha = o.tight; g2.drawImage(c1, 0, 0); }
    ctx.save(); ctx.globalCompositeOperation = o.op || 'lighter'; ctx.globalAlpha = o.alpha ?? 1;
    ctx.drawImage(c2, 0, 0, W, H);
    ctx.restore();
  };

  LX.label = function (ctx, k, name, detail) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, H - 92, W, 92);
    ctx.fillStyle = '#fff'; ctx.font = '600 30px "JBM"'; ctx.textBaseline = 'middle';
    ctx.fillText(String(k).padStart(2, '0') + '  ' + name, 30, H - 64);
    ctx.font = '500 22px "JBM"'; ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillText(detail, 30, H - 28);
    ctx.restore();
  };

  window.LX = LX;
})();
