// Micro-benchmarks of the primitive operations the v2 look is built from (ms, synced).
(function () {
  const W = 1080, H = 1350;
  let SAMP = null;
  // sync: read back from whatever the op wrote (GL target -> 1px sampling pass; 2D scratch -> getImageData)
  function sync(dep) {
    const gl = LX.gl;
    if (dep && dep.tex) LX.pass(SAMP, { uSrc: dep }, null, { vp: [0, 0, 1, 1] });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    (dep && dep.getImageData ? dep : LX.ctx).getImageData(0, 0, 1, 1);
  }
  function time(fn, n = 5) { sync(fn()); const r = []; for (let i = 0; i < n; i++) { const t0 = performance.now(); const d = fn(i); sync(d); r.push(performance.now() - t0); } r.sort((a, b) => a - b); return +r[Math.floor(n / 2)].toFixed(1); }
  const FBM_FS = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform float uT;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<6;i++){s+=a*n(p);p=p*2.03+3.1;a*=.5;}return s;}
void main(){ vec2 p=vUv*4.; float d=fbm(p+fbm(p+uT)); o=vec4(vec3(d),1.); }`;
  const FLAT_FS = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; void main(){ o=vec4(vUv,.5,1.); }`;
  window.MICRO = function () {
    const ctx = LX.ctx, R = {};
    const P1 = LX.prog(FLAT_FS), P2 = LX.prog(FBM_FS);
    SAMP = SAMP || LX.prog(`#version 300 es
precision highp float; out vec4 o; uniform sampler2D uSrc; void main(){ o=texture(uSrc,vec2(.5)); }`);
    R['2d fillRect full, alpha .5'] = time(() => { ctx.fillStyle = 'rgba(255,0,0,.5)'; ctx.fillRect(0, 0, W, H); });
    R['2d radial gradient full fill'] = time(() => { const g = ctx.createRadialGradient(540, 675, 10, 540, 675, 900); g.addColorStop(0, '#f0f'); g.addColorStop(1, 'rgba(0,0,255,0.5)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); });
    R['2d 1000 lines 2px lighter (len~600)'] = time(() => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,200,100,.1)'; ctx.lineWidth = 2; for (let i = 0; i < 1000; i++) { const a = i * 2.4; ctx.beginPath(); ctx.moveTo(540, 675); ctx.lineTo(540 + Math.cos(a) * 600, 675 + Math.sin(a) * 600); ctx.stroke(); } ctx.restore(); });
    R['2d 1000 lines 2px lighter, one path'] = time(() => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,200,100,.1)'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 1000; i++) { const a = i * 2.4; ctx.moveTo(540, 675); ctx.lineTo(540 + Math.cos(a) * 600, 675 + Math.sin(a) * 600); } ctx.stroke(); ctx.restore(); });
    const loop = new Path2D(); for (let i = 0; i <= 200; i++) { const a = i / 200 * Math.PI * 2; i ? loop.lineTo(540 + Math.cos(a) * 300, 675 + Math.sin(a) * 340) : loop.moveTo(540 + 300, 675); }
    R['2d neon multipass stroke (5 passes, r300 loop)'] = time(() => LX.neon(ctx, loop, '#ff2bd6', 6, { fringe: 3 }));
    R['2d shadowBlur 30 stroke (same loop)'] = time(() => { ctx.save(); ctx.shadowBlur = 30; ctx.shadowColor = '#ff2bd6'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.stroke(loop); ctx.restore(); });
    R['2d filter blur(20px) drawImage full res'] = time(() => { const [c, g] = LX.scratch('mb1', W, H); g.filter = 'blur(20px)'; g.drawImage(ctx.canvas, 0, 0); return g; });
    R['2d filter blur(4px) drawImage 270x338'] = time(() => { const [c, g] = LX.scratch('mb2', 270, 338); g.filter = 'blur(4px)'; g.drawImage(ctx.canvas, 0, 0, 270, 338); return g; });
    R['2d drawImage 270x338 -> full res, screen'] = time(() => { const [c] = LX.scratch('mb2', 270, 338); ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.drawImage(c, 0, 0, W, H); ctx.restore(); });
    R['2d getImageData full'] = time(() => ctx.getImageData(0, 0, W, H));
    R['2d fillText 120px EB Garamond'] = time(() => { ctx.font = 'italic 500 120px "EB Garamond"'; ctx.fillStyle = '#fff'; ctx.fillText('you are the sky', 100, 600); });
    R['gl flat pass full res'] = time(() => LX.pass(P1, {}, null));
    R['gl flat pass half res'] = time(() => LX.pass(P1, {}, null, { vp: [0, 0, 540, 675] }));
    R['gl fbm(6 oct, warped) full res'] = time(i => LX.pass(P2, { uT: i }, null));
    R['gl fbm(6 oct, warped) half res'] = time(i => LX.pass(P2, { uT: i }, null, { vp: [0, 0, 540, 675] }));
    R['gl->2d drawImage full res'] = time(() => LX.present(ctx));
    R['gl->2d drawImage half region upscaled'] = time(() => LX.present(ctx, 540, 675));
    R['gl flat full + present (round trip)'] = time(() => { LX.pass(P1, {}, null); LX.present(ctx); });
    { const [c] = LX.scratch('mb3', W, H); R['upload canvas 1080x1350 -> texture'] = time(() => LX.canvasTex('mb3', c)); }
    { const [c] = LX.scratch('mb4', 540, 675); R['upload canvas 540x675 -> texture'] = time(() => LX.canvasTex('mb4', c)); }
    const hdrF = LX.target('mbF', W, H), hdrH = LX.target('mbH', 540, 675);
    R['gl bloom 5 levels from full-res src'] = time(() => LX.bloom(hdrF, 5));
    R['gl bloom 5 levels from half-res src'] = time(() => LX.bloom(hdrH, 5));
    R['gl radial blur 2x16 taps half res'] = time(() => LX.radial(hdrH, [540, 600], .6, .96, 1));
    R['gl radial blur 2x16 taps full res'] = time(() => LX.radial(hdrF, [540, 600], .6, .96, 1));
    R['gl composite (ACES) full res'] = time(() => LX.composite(hdrF, hdrH, {}));
    R['gl composite (ACES) half res'] = time(() => LX.composite(hdrH, hdrH, { w: 540, h: 675 }));
    const LB = new LX.LineBuf(20000);
    const fill = (n, len) => { LB.reset(); for (let i = 0; i < n; i++) { const a = i * 2.4; LB.add(540, 675, 540 + Math.cos(a) * len, 675 + Math.sin(a) * len, [.1, .08, .05], 1.2, 1, 0, 10); } };
    fill(2000, 700); R['gl 2000 HDR lines len700 into full-res'] = time(() => { LX.clear(hdrF); LX.lines(hdrF, LB.d, LB.n); return hdrF; });
    R['gl 2000 HDR lines len700 into half-res'] = time(() => { LX.clear(hdrH); LX.lines(hdrH, LB.d, LB.n); return hdrH; });
    fill(10000, 700); R['gl 10000 HDR lines len700 into half-res'] = time(() => { LX.clear(hdrH); LX.lines(hdrH, LB.d, LB.n); return hdrH; });
    fill(10000, 120); R['gl 10000 HDR lines len120 into full-res'] = time(() => { LX.clear(hdrF); LX.lines(hdrF, LB.d, LB.n); return hdrF; });
    return R;
  };
})();

// Pipeline-faithful micro ops: renderFrame(100 + i) draws black + MICRO_OPS[i]. bench.js times evaluate+screenshot
// and subtracts the blank op, i.e. the real per-frame cost inside render.js.
(function () {
  const W = 1080, H = 1350, TAU = Math.PI * 2;
  const loop = () => { const p = new Path2D(); for (let i = 0; i <= 200; i++) { const a = i / 200 * TAU; i ? p.lineTo(540 + Math.cos(a) * 300, 675 + Math.sin(a) * 340) : p.moveTo(840, 675); } return p; };
  let FL, FB, LB;
  const flat = () => FL || (FL = LX.prog(`#version 300 es
precision highp float; in vec2 vUv; out vec4 o; void main(){ o=vec4(vUv,.5,1.); }`));
  const fbm = () => FB || (FB = LX.prog(`#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform float uT;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<6;i++){s+=a*n(p);p=p*2.03+3.1;a*=.5;}return s;}
void main(){ vec2 p=vUv*4.; float d=fbm(p+fbm(p+uT)); o=vec4(vec3(d),1.); }`));
  const mask = (k) => { const c = LX.maskCanvas('mm' + k, k, g => { g.font = '900 178px "Archivo"'; g.textAlign = 'center'; g.fillText('UNCLENCH', 540, 450); }); return LX.canvasTex('mm' + k, c); };
  const lines = (n, fmt, k = 1) => { LB = LB || new LX.LineBuf(20000); LB.reset(); for (let i = 0; i < n; i++) { const a = i * 2.4; LB.add(540, 675, 540 + Math.cos(a) * 700, 675 + Math.sin(a) * 700, [.1, .08, .05], 1.2, 1, 0, 10); } const t = LX.target('ml' + fmt + k, W * k, H * k, fmt); LX.clear(t); LX.lines(t, LB.d, LB.n); LX.composite(t, null, { w: W * k, h: H * k }); LX.present(LX.ctx, W * k, H * k); };
  window.MICRO_OPS = [
    ['blank (black fill only)', () => {}],
    ['2d: 10x full-frame alpha fillRect', ctx => { for (let i = 0; i < 10; i++) { ctx.fillStyle = `rgba(${i * 20},40,90,.3)`; ctx.fillRect(0, 0, W, H); } }],
    ['2d: radial gradient full-frame fill', ctx => { const g = ctx.createRadialGradient(540, 675, 10, 540, 675, 900); g.addColorStop(0, '#f0f'); g.addColorStop(1, '#004'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }],
    ['2d: 28 gradient ray-triangles lighter', ctx => { ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 28; i++) { const a = i / 28 * TAU, L = 1100; const gr = ctx.createLinearGradient(540, 700, 540 + Math.cos(a) * L, 700 + Math.sin(a) * L); gr.addColorStop(0, 'rgba(255,120,40,.3)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(540, 700); ctx.lineTo(540 + Math.cos(a - .05) * L, 700 + Math.sin(a - .05) * L); ctx.lineTo(540 + Math.cos(a + .05) * L, 700 + Math.sin(a + .05) * L); ctx.fill(); } }],
    ['2d: 1000 lines 2px lighter, 1000 stroke() calls', ctx => { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,200,100,.15)'; ctx.lineWidth = 2; for (let i = 0; i < 1000; i++) { const a = i * 2.4; ctx.beginPath(); ctx.moveTo(540, 675); ctx.lineTo(540 + Math.cos(a) * 600, 675 + Math.sin(a) * 600); ctx.stroke(); } }],
    ['2d: 1000 lines 2px lighter, one path', ctx => { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,200,100,.15)'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 1000; i++) { const a = i * 2.4; ctx.moveTo(540, 675); ctx.lineTo(540 + Math.cos(a) * 600, 675 + Math.sin(a) * 600); } ctx.stroke(); }],
    ['2d: 200 lines 2px lighter, separate strokes', ctx => { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,200,100,.15)'; ctx.lineWidth = 2; for (let i = 0; i < 200; i++) { const a = i * 2.4; ctx.beginPath(); ctx.moveTo(540, 675); ctx.lineTo(540 + Math.cos(a) * 600, 675 + Math.sin(a) * 600); ctx.stroke(); } }],
    ['2d: neon via 5 wide lighter strokes (one loop)', ctx => LX.neon(ctx, loop(), '#ff2bd6', 6, { fringe: 3 })],
    ['2d: shadowBlur 30 stroke (one loop)', ctx => { ctx.shadowBlur = 30; ctx.shadowColor = '#ff2bd6'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.stroke(loop()); }],
    ['2d: glow2d 1/4-res blur (one loop) + core', ctx => { const p = loop(); LX.glow2d(ctx, g => { g.strokeStyle = '#ff2bd6'; g.lineWidth = 20; g.stroke(p); }, { blur: 5 }); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(p); }],
    ['2d: filter blur(20px) full-res drawImage', ctx => { ctx.fillStyle = '#f0a'; ctx.fillRect(300, 300, 400, 400); const [c, g] = LX.scratch('mo1', W, H); g.filter = 'blur(20px)'; g.drawImage(ctx.canvas, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(c, 0, 0); }],
    ['2d: canvas bloom (blurred 1/4 + 1/16 screen back)', ctx => { ctx.fillStyle = '#f0a'; ctx.fillRect(300, 300, 400, 400); const [c1, g1] = LX.scratch('mo2', 270, 338); g1.filter = 'blur(3px)'; g1.drawImage(ctx.canvas, 0, 0, 270, 338); const [c2, g2] = LX.scratch('mo3', 68, 85); g2.filter = 'blur(3px)'; g2.drawImage(c1, 0, 0, 68, 85); ctx.globalCompositeOperation = 'screen'; ctx.drawImage(c1, 0, 0, W, H); ctx.drawImage(c2, 0, 0, W, H); }],
    ['2d: 3 screen-blended radial-gradient bodies', ctx => { const G = LX.grabby(2, 540, 800, 1); ctx.globalCompositeOperation = 'screen'; ['#ff2e88', '#00d9ff', '#ffc21a'].forEach((c, i) => { const rg = ctx.createRadialGradient(500, 740, 10, 540, 800, 215); rg.addColorStop(0, c); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.save(); ctx.translate(i * 30 - 30, i * 20 - 20); ctx.fill(G.body); ctx.restore(); }); }],
    ['2d: 60 brush strokes filled as one Path2D', ctx => { const all = new Path2D(); for (let i = 0; i < 60; i++) { const pts = []; for (let j = 0; j <= 20; j++) pts.push([80 + j * 45, 100 + i * 20 + 10 * Math.sin(j + i)]); all.addPath(LX.brushPath(pts, 9, i)); } ctx.fillStyle = '#fff'; ctx.fill(all); }],
    ['2d: 3 lines of 120px italic text', ctx => { ctx.font = 'italic 500 120px "EB Garamond"'; ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) ctx.fillText('you are the sky', 120, 400 + i * 150); }],
    ['gl: flat pass full res + present', ctx => { LX.pass(flat(), {}, null); LX.present(ctx); }],
    ['gl: flat pass half res + present upscaled', ctx => { LX.pass(flat(), {}, null, { vp: [0, 0, 540, 675] }); LX.present(ctx, 540, 675); }],
    ['gl: fbm 6-oct warped, full res + present', ctx => { LX.pass(fbm(), { uT: 1 }, null); LX.present(ctx); }],
    ['gl: fbm 6-oct warped, half res + present', ctx => { LX.pass(fbm(), { uT: 1 }, null, { vp: [0, 0, 540, 675] }); LX.present(ctx, 540, 675); }],
    ['gl: analytic ray field (slot 0) half res, ACES, present', ctx => { const t = LX.target('mr', 540, 675); TECH[0].light(2, t); LX.composite(t, null, { w: 540, h: 675 }); LX.present(ctx, 540, 675); }],
    ['gl: analytic ray field (slot 0) full res, ACES, present', ctx => { const t = LX.target('mrf', W, H); TECH[0].light(2, t); LX.composite(t, null); LX.present(ctx); }],
    ['gl: + bloom 5 levels on the half-res ray field', ctx => { const t = LX.target('mr', 540, 675); TECH[0].light(2, t); const b = LX.bloom(t, 5); LX.composite(t, b, { w: 540, h: 675 }); LX.present(ctx, 540, 675); }],
    ['gl: radial blur 2x16 on 1/4-res mask + present', ctx => { const m = mask(0.25); const r = LX.radial({ tex: m.tex, w: m.w, h: m.h }, [540, 640], .6, .96, 2); LX.composite(r, null, { w: 540, h: 675 }); LX.present(ctx, 540, 675); }],
    ['gl: radial blur 2x16 on 1/2-res mask + present', ctx => { const m = mask(0.5); const r = LX.radial({ tex: m.tex, w: m.w, h: m.h }, [540, 640], .6, .96, 2); LX.composite(r, null, { w: 540, h: 675 }); LX.present(ctx, 540, 675); }],
    ['gl: 500 HDR lines (len 700, w 1.2) RGBA16F full res', () => lines(500, 'f16')],
    ['gl: 500 HDR lines RGBA32F full res', () => lines(500, 'f32')],
    ['gl: 500 lines RGBA8 full res', () => lines(500, 'u8')],
    ['gl: 2000 HDR lines RGBA32F half res', () => lines(2000, 'f32', 0.5)],
    ['gl: upload 1080x1350 canvas as texture (+flat present)', ctx => { const [c] = LX.scratch('mo4', W, H); LX.canvasTex('mo4', c); LX.pass(flat(), {}, null, { vp: [0, 0, 8, 8] }); LX.present(ctx, 8, 8); }],
    ['gl: upload 540x675 canvas as texture (+flat present)', ctx => { const [c] = LX.scratch('mo5', 540, 675); LX.canvasTex('mo5', c); LX.pass(flat(), {}, null, { vp: [0, 0, 8, 8] }); LX.present(ctx, 8, 8); }],
  ];
})();
