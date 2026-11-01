// Technique demos for the v2 "built from light" look. One technique per 1-second time slot:
// renderFrame(t): k = floor(t) picks TECH[k]; tau = 2 + 8*(t-k) is the technique's local animation time.
// LX.scale (1 | 0.5) = internal GL resolution for techniques flagged `scalable`.
(function () {
  const W = 1080, H = 1350;
  const TECH = [];
  const h = LX.hash;
  const TAU = Math.PI * 2;
  const P = {}; // GL programs, compiled in init()

  // ------------------------------------------------------------------ shared GLSL
  const GLSL_UTIL = `
float h11(float p){ p=fract(p*.1031); p*=p+33.33; p*=p+p; return fract(p); }
float h12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2 h22(vec2 p){ vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
vec3 spec(float x){ x=clamp(x,0.,1.); return clamp(vec3(abs(x*6.-3.)-1.,2.-abs(x*6.-2.),2.-abs(x*6.-4.)),0.,1.); }
// one layer of an analytic sunburst: N angular bins, one jittered ray per bin, constant pixel width.
// returns linear HDR color. palette: gold / coral / warm white / magenta / cyan accents.
vec3 rayLayer(float r, float a, float N, float seed, float t, float lenMin, float lenMax){
  float u=a/6.2831853*N+seed; float id=floor(u); float f=fract(u)-.5;
  float h1=h11(id+seed*7.13), h2=h11(id*1.71+seed*3.1), h3=h11(id*2.31+seed*11.7), h4=h11(id*3.17+seed*5.3);
  float binPx=6.2831853*r/N;
  float dpx=abs(f-(h1-.5)*.5)*binPx;
  float w=.45+1.5*h2;
  float prof=exp(-dpx*dpx/(w*w));
  prof=mix(w*1.77/max(binPx,1e-3)*.5,prof,smoothstep(1.,3.,binPx));   // below ~2px per bin -> average energy (no moire)
  float len=lenMin+(lenMax-lenMin)*h3*h3;
  float I=(.25+.75*h4)*smoothstep(len,0.,r);
  I*=.55+.45*sin(6.2831853*floor(12.+30.*h1)*t/60.+h2*20.);   // integer cycles per 60 s -> loop-safe twinkle
  vec3 col=h4<.52?vec3(1.,.55,.12):h4<.72?vec3(1.,.25,.32):h4<.86?vec3(1.,.86,.65):h4<.95?vec3(1.,.05,.55):vec3(.05,.8,1.);
  return col*prof*I;
}`;

  // ------------------------------------------------------------------ shared 2D bits
  function screenBody(ctx, G, tau, alpha = 0.78, cols = ['#ff2e88', '#00d9ff', '#ffc21a']) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const offs = [[-46, -8], [40, -26], [0, 44]];
    cols.forEach((c, i) => {
      const [dx, dy] = offs[i];
      ctx.save();
      ctx.translate(dx + 7 * Math.sin(tau * 0.9 + i * 2), dy + 5 * Math.cos(tau * 0.7 + i));
      const rg = ctx.createRadialGradient(G.cx - 40, G.cy - 60, 10, G.cx, G.cy, 215);
      rg.addColorStop(0, LX.rgba(c, alpha)); rg.addColorStop(0.8, LX.rgba(c, alpha * 0.8)); rg.addColorStop(1, LX.rgba(c, alpha * 0.25));
      ctx.fillStyle = rg; ctx.fill(G.body);
      ctx.restore();
    });
    ctx.restore();
  }
  function sceneB(ctx, tau, o = {}) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0d0b2e'); g.addColorStop(1, '#2a0f4c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const G = LX.grabby(tau, 540, 860, 0.9);
    screenBody(ctx, G, tau, 0.62);
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#fff6e6'; ctx.lineWidth = 3;
    ctx.save(); ctx.translate(7, -5); ctx.stroke(G.body); ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = '#1a0d3a'; G.face.forEach(p => ctx.stroke(p));
    ctx.strokeStyle = '#fff6e6'; ctx.lineWidth = 5; ctx.stroke(G.armPath);
    ctx.fillStyle = '#b6ff2e'; ctx.fill(G.blob);
    ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(820, 300, 70, 0, TAU); ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + tau * 0.1; ctx.moveTo(820 + Math.cos(a) * 92, 300 + Math.sin(a) * 92); ctx.lineTo(820 + Math.cos(a) * (130 + 25 * (i % 2)), 300 + Math.sin(a) * (130 + 25 * (i % 2))); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(160,220,255,0.7)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < 5; i++) { ctx.moveTo(80, 1120 + i * 22); ctx.lineTo(1000, 1112 + i * 22 + 6 * Math.sin(i + tau)); }
    ctx.stroke();
    ctx.fillStyle = '#fff3c4'; ctx.beginPath();
    for (let i = 0; i < 40; i++) { const x = 100 + h(i * 3.7) * 880, y = 150 + h(i * 9.1) * 1000, r = 1.5 + 2.5 * h(i * 1.3) * (0.5 + 0.5 * Math.sin(tau * 3 + i)); ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
    ctx.fill();
    ctx.restore();
    if (!o.noText) {
      ctx.save();
      ctx.font = 'italic 500 112px "EB Garamond"'; ctx.textAlign = 'center'; ctx.fillStyle = '#fffaf0';
      ctx.fillText('you are the sky', 540, 300);
      ctx.restore();
    }
    return G;
  }
  // face/arm overlay used by the GL demos (crisp 2D on top of the light layer)
  function faceInk(ctx, G, col = 'rgba(30,10,60,0.92)', w = 11) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = col; ctx.lineWidth = w; G.face.forEach(p => ctx.stroke(p));
    ctx.restore();
  }

  // ================================================================== 0. rays fill the shape (analytic)
  const RAYF_FS = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform vec2 uRes; uniform float uT, uFrame; uniform vec2 uC;
${GLSL_UTIL}
${LX.GLSL_GRABBY}
void main(){
  vec2 q=vec2(vUv.x,1.-vUv.y)*vec2(1080.,1350.);
  vec2 d=q-uC; float r=length(d), a=atan(d.y,d.x)+.06*sin(6.2831853*uT/60.);
  vec3 rays=rayLayer(r,a,260.,0.,uT,150.,1400.)+rayLayer(r,a,470.,17.,uT,120.,900.)+rayLayer(r,a,820.,41.,uT,90.,600.)*.8;
  rays+=vec3(1.,.7,.4)*1.2*exp(-r/40.)+vec3(1.,.5,.25)*.25*exp(-r/160.);
  vec2 sd=grabbySDF(q,vec2(540.,800.),1.,uT,1.);
  float body=smoothstep(1.5,-1.5,sd.x), blob=smoothstep(1.5,-1.5,sd.y);
  vec3 col=rays*mix(.09,1.,body)*.85;
  col+=vec3(1.,.8,.55)*smoothstep(3.,0.,abs(sd.x))*.35;               // faint luminous edge
  // the evil vibrating blob: contour lines of a noise field, re-seeded every frame (buzz)
  float F=h11(uFrame)*40.;
  float n1=sin(q.x*.19+3.*sin(q.y*.051+F))+sin(q.y*.17+3.*sin(q.x*.067-F*1.3));
  float n2=sin(q.x*.13-2.*sin(q.y*.08+F*.7))+sin(q.y*.23+2.*sin(q.x*.09+F));
  vec3 bc=vec3(.35,1.,.08)*smoothstep(.22,0.,abs(n1))*1.6+vec3(.02,.9,1.)*smoothstep(.16,0.,abs(n2))*1.2;
  col=mix(col*.25,bc+vec3(.04,.12,.02),blob);
  col+=vec3(.5,1.,.2)*smoothstep(4.,0.,abs(sd.y))*.9;
  o=vec4(col,1.);
}`;
  TECH.push({
    name: 'rays fill the shape (analytic sunburst in SDF)', detail: 'GLSL 3-layer angular ray field x SDF, blob = buzzing contour lines, bloom, ACES',
    gl: true, scalable: true, init() { P.rayf = LX.prog(RAYF_FS); },
    light(tau, hdr) { LX.pass(P.rayf, { uT: tau, uFrame: Math.floor(tau * 30), uC: [515, 770] }, hdr); },
    draw(tau, ctx) {
      const k = LX.scale;
      const hdr = LX.target('hdr0', W * k, H * k);
      this.light(tau, hdr);
      LX.mark('ray field');
      const bl = LX.bloom(hdr, 5);
      LX.mark('bloom');
      LX.composite(hdr, bl, { w: W * k, h: H * k, bloomK: 0.85, expo: 1.2, bgTop: LX.lin('#160b46'), bgBot: LX.lin('#3a0c3c'), seed: tau * 100, ca: 0.006, grain: 0.025 });
      LX.present(ctx, W * k, H * k);
      LX.mark('composite+present');
      const G = LX.grabby(tau, 540, 800, 1);
      faceInk(ctx, G);
      LX.glow2d(ctx, g => { g.strokeStyle = '#ffb347'; g.lineWidth = 26; g.stroke(G.armPath); g.stroke(G.mittenPath); }, { blur: 3, alpha: 0.9 });
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#fff4dc'; ctx.lineWidth = 5; ctx.stroke(G.armPath); ctx.stroke(G.mittenPath); ctx.restore();
    },
  });

  // ================================================================== 1. additive translucent planes on dark
  TECH.push({
    name: 'translucent light planes (additive)', detail: 'Canvas2D only: 28 gradient ray-planes lighter + 3 screen bodies + thin lines',
    draw(tau, ctx) {
      const g = ctx.createRadialGradient(540, 780, 40, 540, 780, 950); g.addColorStop(0, '#1d1458'); g.addColorStop(1, '#05030f');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const G = LX.grabby(tau, 540, 820, 1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const sx = 520, sy = 790, cols = ['#ffb21a', '#ff2e88', '#00d9ff', '#ffd84a', '#b45cff'];
      for (let i = 0; i < 28; i++) {
        const a = -Math.PI / 2 + (i / 28 - .5) * Math.PI * 1.95 + .06 * Math.sin(tau * .4 + i);
        const sp = .025 + .05 * h(i * 3.3), L = 800 + 600 * h(i * 1.9), c = cols[i % 5];
        const gr = ctx.createLinearGradient(sx, sy, sx + Math.cos(a) * L, sy + Math.sin(a) * L);
        gr.addColorStop(0, LX.rgba(c, .26)); gr.addColorStop(1, LX.rgba(c, 0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(a - sp) * L, sy + Math.sin(a - sp) * L); ctx.lineTo(sx + Math.cos(a + sp) * L, sy + Math.sin(a + sp) * L); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      LX.mark('ray planes');
      screenBody(ctx, G, tau, 0.72);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ['#9dff2e', '#7b2cff', '#2ef2ff'].forEach((c, j) => {
        ctx.fillStyle = LX.rgba(c, .55); ctx.beginPath();
        for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + tau * (3 + j) + j, r = G.R * (0.7 + 0.45 * h(i * 7 + j + Math.floor(tau * 15))); const x = G.bx + Math.cos(a) * r, y = G.by + Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.closePath(); ctx.fill();
      });
      ctx.restore();
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255,250,240,0.9)'; ctx.lineWidth = 2.5;
      ctx.save(); ctx.translate(10, -8); ctx.stroke(G.body); ctx.restore();
      ctx.lineWidth = 6; ctx.strokeStyle = '#140a30'; G.face.forEach(p => ctx.stroke(p));
      ctx.strokeStyle = 'rgba(255,250,240,0.95)'; ctx.lineWidth = 5; ctx.stroke(G.armPath); ctx.stroke(G.mittenPath);
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#fff4d0'; ctx.beginPath();
      for (let i = 0; i < 14; i++) {
        const x = 120 + h(i * 5.1) * 840, y = 140 + h(i * 2.3) * 1000, s = (8 + 18 * h(i)) * (0.4 + 0.6 * Math.abs(Math.sin(tau * 1.3 + i)));
        ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s);
      }
      ctx.fill(); ctx.restore();
    },
  });

  // ================================================================== 2. subtractive paper washes (Hockney iPad / cut paper)
  TECH.push({
    name: 'translucent washes on paper (multiply)', detail: 'Canvas2D only: multiply planes, overlaps mix new colors, brush lines',
    draw(tau, ctx) {
      ctx.fillStyle = '#fbf1df'; ctx.fillRect(0, 0, W, H);
      const poly = (pts, c, a, op = 'multiply') => { ctx.globalCompositeOperation = op; ctx.globalAlpha = a; ctx.fillStyle = c; ctx.fill(LX.polyPath(LX.smoothPts(pts, 5, true), true)); };
      ctx.save();
      poly([[-20, 880], [520, 840], [1100, 870], [1100, 1370], [-20, 1370]], '#1e9cf0', .92);          // pool
      poly([[560, -20], [1100, -20], [1100, 780], [620, 820]], '#ff6fae', .85);                          // pink wall
      poly([[-20, -20], [1100, -20], [1100, 120], [-20, 170]], '#8fd8ff', .7);                           // sky band
      poly([[-20, 1000], [330, 960], [420, 1370], [-20, 1370]], '#4ade3a', .75);                         // green over pool -> teal
      poly([[860, 520], [1100, 470], [1100, 980], [900, 1000]], '#ffb21a', .8);                          // orange over pink -> red-orange
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .95; ctx.fillStyle = '#ffe600';
      ctx.beginPath(); ctx.arc(560, 330, 150, 0, TAU); ctx.fill();                                        // sun straddles paper / pink -> lemon + orange
      ctx.restore();
      const G = LX.grabby(tau, 470, 830, 1);
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = .95; ctx.fillStyle = '#ffe94d'; ctx.save(); ctx.translate(-16, 10); ctx.fill(G.body); ctx.restore();
      ctx.globalAlpha = .7; ctx.fillStyle = '#ff7aa8'; ctx.save(); ctx.translate(G.cx, G.cy); ctx.scale(.8, .8); ctx.translate(-G.cx + 46, -G.cy - 34); ctx.fill(G.body); ctx.restore();
      ctx.globalAlpha = .9; ctx.fillStyle = '#9a6bff'; ctx.fill(G.blob);
      ctx.globalAlpha = .55; ctx.fillStyle = '#ff4fd8'; ctx.save(); ctx.translate(18, -14); ctx.fill(G.blob); ctx.restore();
      ctx.restore();
      LX.mark('washes');
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 870, W, H - 870); ctx.clip();
      const white = new Path2D(), pale = new Path2D();
      for (let j = 0; j < 12; j++) {
        const y0 = 900 + j * 38;
        for (let s = 0; s < 4; s++) {
          const x0 = -40 + s * 290 + 60 * h(j * 7 + s), len = 180 + 90 * h(j + s * 3), pts = [];
          for (let i = 0; i <= 12; i++) { const x = x0 + i / 12 * len; pts.push([x, y0 + 11 * Math.sin(x / 47 + j * 1.3 + tau * 1.1) + 6 * Math.sin(x / 19 - tau * 1.7 + j)]); }
          ((j + s) % 3 === 0 ? pale : white).addPath(LX.brushPath(pts, 7 + 4 * h(j * s + 1), j + s));
        }
      }
      ctx.fillStyle = '#ffffff'; ctx.fill(white); ctx.fillStyle = '#c8f0ff'; ctx.fill(pale);
      ctx.restore();
      ctx.save();
      const ink = new Path2D();
      const bp = G.bodyPts;
      ink.addPath(LX.brushPath(LX.smoothPts(bp.slice(4, 62).filter((_, i) => i % 3 === 0), 6), 11, 1));
      ink.addPath(LX.brushPath(LX.smoothPts(bp.slice(66, 94).filter((_, i) => i % 3 === 0), 6), 9, 2));
      [G.eyeL, G.eyeR, G.mouth].forEach((p, i) => ink.addPath(LX.brushPath(LX.smoothPts(p, 6), 10, i + 3, .3)));
      ink.addPath(LX.brushPath(LX.smoothPts(G.arm, 8), 11, 7, .3));
      ink.addPath(LX.brushPath(LX.smoothPts(G.mitten, 8), 9, 8, .3));
      ctx.fillStyle = '#2430d0'; ctx.fill(ink);
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * TAU + 0.15 * Math.sin(tau * .5), r0 = 175, r1 = 245 + 30 * (i % 2);
        ctx.fillStyle = i % 2 ? '#ff7a00' : '#f2b600';
        ctx.fill(LX.brushPath([[560 + Math.cos(a) * r0, 330 + Math.sin(a) * r0], [560 + Math.cos(a) * (r0 + r1) / 2, 330 + Math.sin(a) * (r0 + r1) / 2], [560 + Math.cos(a) * r1, 330 + Math.sin(a) * r1]], 12, i));
      }
      ctx.restore();
    },
  });

  // ================================================================== 3. pool caustics (shader) + submerged translucent character
  const CAUSTIC_FS = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform vec2 uRes; uniform float uT;
${GLSL_UTIL}
${LX.GLSL_GRABBY}
float caus(vec2 x, float ph){
  vec2 n=floor(x), f=fract(x); float F1=9., F2=9.;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 g=vec2(float(i),float(j)); vec2 r=h22(n+g);
    vec2 pt=g+.5+.4*sin(ph+6.2831*r)-f; float d=length(pt);
    if(d<F1){F2=F1;F1=d;} else if(d<F2){F2=d;}
  }
  return F2-F1;
}
void main(){
  vec2 q=vec2(vUv.x,1.-vUv.y)*vec2(1080.,1350.);
  float ph=6.2831853*uT/6.;   // 6 s period -> loops in 60 s
  vec2 c=vec2(540.,820.);
  vec2 sd=grabbySDF(q,c,1.,uT,.6);
  float inB=smoothstep(2.,-2.,sd.x), inBl=smoothstep(2.,-2.,sd.y);
  float bulge=smoothstep(0.,-140.,sd.x);
  vec2 qr=c+(q-c)*(1.-.3*bulge);
  vec2 x=qr/118.;
  x+=.45*vec2(sin(x.y*1.3+ph),cos(x.x*1.1-ph))+.18*vec2(sin(x.y*3.1-ph*2.),cos(x.x*2.7+ph));
  float e1=caus(x,ph);
  float e2=caus(x*1.7+vec2(3.1,7.7),ph*2.);
  vec3 deep=vec3(.02,.36,.80), shal=vec3(.10,.72,.92);
  vec3 col=mix(shal,deep,smoothstep(0.,1.,vUv.y*.9+.1*sin(q.x/300.)));
  col*=1.-.4*smoothstep(.07,.02,abs(e2-.16));                              // painted dark squiggles
  float wob=.5+.5*sin(x.x*4.+x.y*3.);
  float l1=smoothstep(.05+.04*wob,.0,e1), g1=smoothstep(.3,.0,e1);
  float l2=smoothstep(.035,.0,e2);
  vec3 lineC=mix(vec3(.88,.98,1.),vec3(1.,.92,.5),inB);
  col+=lineC*(l1*.95+g1*.16)+vec3(.6,.92,1.)*l2*.4;
  col+=vec3(1.)*pow(l1*l2,2.)*.9;
  vec3 warm=vec3(1.,.5,.42);
  col=mix(col,col*.55+warm*.5,inB*.55);
  col+=vec3(1.,.95,.85)*smoothstep(5.,0.,abs(sd.x))*.7;
  vec3 vio=vec3(.55,.2,1.);
  col=mix(col,col*.5+vio*.55+vec3(.6,1.,.2)*smoothstep(.06,0.,caus(q/37.+uT*9.,ph*5.))*.6,inBl*.85);
  col+=vec3(.8,1.,.4)*smoothstep(4.,0.,abs(sd.y))*.8;
  o=vec4(col,1.);
}`;
  TECH.push({
    name: 'pool caustics + translucent body', detail: 'GLSL voronoi-edge caustic nets x2 + painted dark net + SDF lens/tint, 6 s loop',
    gl: true, scalable: true, init() { P.caustic = LX.prog(CAUSTIC_FS); },
    draw(tau, ctx) {
      const k = LX.scale;
      LX.pass(P.caustic, { uT: tau }, null, { vp: [0, 0, W * k, H * k] });
      LX.present(ctx, W * k, H * k);
      LX.mark('shader+present');
      const G = LX.grabby(tau, 540, 820, 1, { vib: .6 });
      faceInk(ctx, G, 'rgba(10,30,90,0.85)', 9);
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,248,230,0.95)'; ctx.lineWidth = 6; ctx.stroke(G.armPath); ctx.stroke(G.mittenPath); ctx.restore();
    },
  });

  // ================================================================== 4. neon strokes (cheap glow)
  function neonPaths(ctx, items, o = {}) {
    // items: [path, color, width]. ONE 1/4-res glow canvas for everything (wide + tight strokes, fringe), one blur,
    // one upscale; crisp cores at full res. o.extraGlow(g) lets callers add more glow shapes (e.g. neon type) to the same pass.
    LX.glow2d(ctx, g => {
      for (const [p, c, w] of items) {
        if (o.fringe) { g.lineWidth = w * 3; g.strokeStyle = '#ff2a3a'; g.save(); g.translate(-o.fringe * 2, 0); g.stroke(p); g.restore(); g.strokeStyle = '#2a6bff'; g.save(); g.translate(o.fringe * 2, 0); g.stroke(p); g.restore(); }
        g.strokeStyle = c; g.lineWidth = w * 3.2; g.stroke(p);
        g.lineWidth = w * 1.4; g.globalCompositeOperation = 'lighter'; g.stroke(p); g.globalCompositeOperation = 'source-over';
      }
      if (o.extraGlow) o.extraGlow(g);
    }, { blur: 4, alpha: 1 });
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'lighter';
    for (const [p, c, w] of items) { ctx.strokeStyle = c; ctx.globalAlpha = .7; ctx.lineWidth = w * 1.1; ctx.stroke(p); ctx.globalAlpha = .95; ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = Math.max(1.5, w * .4); ctx.stroke(p); }
    ctx.restore();
  }
  TECH.push({
    name: 'neon line drawing + chromatic fringe', detail: 'Canvas2D: thin cores at full res + ONE 1/4-res blurred glow pass for all paths + type',
    draw(tau, ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a0620'); g.addColorStop(1, '#170827');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const G = LX.grabby(tau, 540, 830, 1);
      const fan = new Path2D();
      for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.2; fan.moveTo(540 + Math.cos(a) * 260, 830 + Math.sin(a) * 260); fan.lineTo(540 + Math.cos(a) * 520, 830 + Math.sin(a) * 520); }
      const loop = [];
      for (let i = 0; i <= 110; i++) { const j = i % 96, p = G.bodyPts[j]; const wob = 1 + 0.012 * Math.sin(i * .5) + (i > 96 ? 0.02 : 0); loop.push([G.cx + (p[0] - G.cx) * wob, G.cy + (p[1] - G.cy) * wob]); }
      const fr = Math.floor(tau * 30), sc = [];
      for (let i = 0; i < 26; i++) { const a = h(i * 3 + fr) * TAU, r = Math.sqrt(h(i * 7 + fr * 1.3)) * G.R; sc.push([G.bx + Math.cos(a) * r, G.by + Math.sin(a) * r]); }
      const face = new Path2D(); G.face.forEach(p => face.addPath(p));
      const arm = new Path2D(); arm.addPath(G.armPath); arm.addPath(G.mittenPath);
      const typeGlow = g2 => { g2.font = '600 190px "Caveat"'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.lineWidth = 18; g2.strokeStyle = '#ff2bd6'; g2.strokeText('unclench', 540, 330); };
      neonPaths(ctx, [[fan, '#ffb52e', 2.5], [LX.polyPath(loop), '#ff2bd6', 6], [face, '#3df2ff', 5], [arm, '#ffc23a', 5], [LX.polyPath(sc), '#b8ff2c', 3.5]], { fringe: 2, extraGlow: typeGlow });
      LX.mark('neon paths (one glow pass incl. type)');
      ctx.save(); ctx.font = '600 190px "Caveat"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,60,220,0.8)'; ctx.strokeText('unclench', 540, 330);
      ctx.lineWidth = 2.2; ctx.strokeStyle = '#fff2fb'; ctx.strokeText('unclench', 540, 330);
      ctx.restore();
      LX.mark('neon text');
    },
  });

  // ================================================================== 5/6. bloom post: GL dual-Kawase vs Canvas2D-only
  const BOUT_FS = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uBloom; uniform float uK, uCA;
void main(){ vec2 dc=(vUv-.5)*uCA; o=vec4(vec3(texture(uBloom,vUv+dc).r,texture(uBloom,vUv).g,texture(uBloom,vUv-dc).b)*uK,1.); }`;
  TECH.push({
    name: 'bloom: GL dual-Kawase at half res', detail: 'scene -> 540x675 canvas -> texture, 5-level bloom w/ threshold, CA, lighter back',
    gl: true, init() { P.bout = LX.prog(BOUT_FS); },
    draw(tau, ctx) {
      sceneB(ctx, tau);
      LX.mark('scene');
      const [c, g] = LX.scratch('b5', 540, 675); g.drawImage(ctx.canvas, 0, 0, 540, 675);
      const t = LX.canvasTex('b5', c);
      LX.mark('downscale+upload');
      const bl = LX.bloom({ tex: t.tex, w: 540, h: 675 }, 5, 0.8);
      LX.pass(P.bout, { uBloom: bl, uK: 0.55, uCA: 0.006 }, null, { vp: [0, 0, 540, 675] });
      LX.present(ctx, 540, 675, 'lighter');
      LX.mark('bloom+present');
    },
  });
  TECH.push({
    name: 'bloom: Canvas2D only (filter blur at 1/4, 1/16)', detail: 'no GL: blurred downscales drawn back with screen',
    draw(tau, ctx) {
      sceneB(ctx, tau);
      LX.mark('scene');
      const [c1, g1] = LX.scratch('c6a', 270, 338); g1.filter = 'blur(3px)'; g1.drawImage(ctx.canvas, 0, 0, 270, 338);
      const [c2, g2] = LX.scratch('c6b', 68, 85); g2.filter = 'blur(3px)'; g2.drawImage(c1, 0, 0, 68, 85);
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = .75; ctx.drawImage(c1, 0, 0, W, H);
      ctx.globalAlpha = .9; ctx.drawImage(c2, 0, 0, W, H);
      ctx.restore();
      LX.mark('canvas bloom');
    },
  });

  // ================================================================== 7. prism burst + light leaks (beat hit)
  const PRISM_FS = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform vec2 uRes; uniform vec2 uC; uniform float uT, uE;
${GLSL_UTIL}
void main(){
  vec2 q=vec2(vUv.x,1.-vUv.y)*vec2(1080.,1350.);
  vec2 d=q-uC; float r=length(d), a=atan(d.y,d.x);
  vec3 col=vec3(0.);
  for(int ch=0;ch<3;ch++){
    float aa=a+float(ch-1)*.010*(1.+r/500.);
    float ray=pow(max(0.,sin(aa*13.+1.3+uT*.15)),24.)*.9+pow(max(0.,sin(aa*21.-.7-uT*.11)),40.)*.7
             +pow(max(0.,sin(aa*8.+2.1)),60.)+pow(max(0.,sin(aa*34.+uT*.2)),90.)*.5;
    col[ch]=ray;
  }
  col*=(exp(-r/480.)*1.1+60./(r+60.)*.3)*vec3(1.,.86,.72);
  col+=vec3(1.,.9,.75)*exp(-r*r/(2.*85.*85.))*1.3;
  float rr=(r-330.)/40.; col+=spec(.5+rr*.33)*exp(-rr*rr*.6)*.5;
  col+=vec3(.35,.6,1.)*exp(-abs(d.y)/4.)*exp(-abs(d.x)/620.)*1.2;
  vec2 l1=vec2(60.,180.)+70.*vec2(sin(uT*.5),cos(uT*.4)); col+=vec3(1.,.42,.1)*exp(-dot(q-l1,q-l1)/(2.*330.*330.))*.85;
  vec2 l2=vec2(1080.,1150.)+70.*vec2(cos(uT*.3),sin(uT*.45)); col+=vec3(1.,.12,.62)*exp(-dot(q-l2,q-l2)/(2.*300.*300.))*.75;
  vec2 ax=vec2(540.,675.)-uC;
  for(int i=1;i<=3;i++){ vec2 gp=uC+ax*(float(i)*.8+.6); float gr=36.+float(i)*26.; float gd=length(q-gp)/gr; col+=spec(clamp(gd-.35,0.,1.))*smoothstep(1.,.86,gd)*.13; }
  o=vec4(col*uE,1.);
}`;
  TECH.push({
    name: 'prism burst + light leaks (beat hit)', detail: 'GLSL at half res: dispersive rays, halo, anamorphic streak, leaks; lighter over scene',
    gl: true, init() { P.prism = LX.prog(PRISM_FS); },
    draw(tau, ctx) {
      sceneB(ctx, tau, { noText: true });
      LX.mark('scene');
      const k = 0.5, env = Math.exp(-Math.max(0, tau - 2) * 2.5) * (tau < 2 ? Math.max(0, 1 - (2 - tau) * 4) : 1);
      LX.pass(P.prism, { uT: tau, uE: env, uC: [400, 560] }, null, { vp: [0, 0, W * k, H * k] });
      LX.present(ctx, W * k, H * k, 'lighter');
      LX.mark('prism+present');
    },
  });

  // ================================================================== 8. luminous line + off-register translucent fills (Dufy / Hockney iPad)
  TECH.push({
    name: 'luminous brush line + off-register fills', detail: 'Canvas2D: screen washes offset from tapered brush strokes, glow from 1/4-res blur',
    draw(tau, ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1c22b8'); g.addColorStop(.6, '#5a23b0'); g.addColorStop(1, '#b02a8a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const G = LX.grabby(tau, 540, 840, 1);
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      const wash = (path, c, a, dx, dy, s = 1) => { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = c; ctx.translate(G.cx + dx, G.cy + dy); ctx.scale(s, s); ctx.translate(-G.cx, -G.cy); ctx.fill(path); ctx.restore(); };
      wash(G.body, '#ffe14a', .85, -34, 26, 1.04);
      wash(G.body, '#ff6a5a', .6, 40, -30, .78);
      wash(G.blob, '#3ff0ff', .8, 22, -18, 1.1);
      ctx.globalAlpha = .75; ctx.fillStyle = '#ff9b2e'; ctx.beginPath(); ctx.ellipse(250, 300, 130, 120, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = .35; ctx.fillStyle = '#39ff88'; ctx.fill(LX.polyPath(LX.smoothPts([[-20, 1110], [400, 1060], [800, 1090], [1100, 1050], [1100, 1370], [-20, 1370]], 5, true), true));
      ctx.restore();
      LX.mark('washes');
      const strokes = [];
      const bp = G.bodyPts;
      strokes.push([LX.smoothPts(bp.slice(2, 60).filter((_, i) => i % 3 === 0), 6), 12]);
      strokes.push([LX.smoothPts(bp.slice(63, 95).filter((_, i) => i % 3 === 0), 6), 10]);
      strokes.push([LX.smoothPts(G.eyeL, 6), 11]); strokes.push([LX.smoothPts(G.eyeR, 6), 11]); strokes.push([LX.smoothPts(G.mouth, 4), 9]);
      strokes.push([LX.smoothPts(G.arm, 8), 11]); strokes.push([LX.smoothPts(G.mitten, 8), 10]);
      strokes.push([LX.smoothPts(G.blobPts.filter((_, i) => i % 4 === 0).concat([G.blobPts[0]]), 4), 7]);
      const sun = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU; sun.push([250 + Math.cos(a) * 95, 300 + Math.sin(a) * 92]); }
      strokes.push([sun, 9]);
      for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + .1 * Math.sin(tau); strokes.push([[[250 + Math.cos(a) * 125, 300 + Math.sin(a) * 125], [250 + Math.cos(a) * 170, 300 + Math.sin(a) * 170], [250 + Math.cos(a) * (205 + 20 * (i % 2)), 300 + Math.sin(a) * (205 + 20 * (i % 2))]], 9]); }
      for (let i = 0; i < 6; i++) { const y = 1150 + i * 30, x0 = 90 + 150 * h(i), pts = []; for (let j = 0; j <= 10; j++) pts.push([x0 + j * 60, y + 8 * Math.sin(j + i + tau)]); strokes.push([pts, 6]); }
      const all = new Path2D();
      strokes.forEach(([pts, w], i) => all.addPath(LX.brushPath(pts, w, i)));
      LX.glow2d(ctx, g2 => { g2.fillStyle = '#ffcf8a'; g2.strokeStyle = '#ffcf8a'; g2.lineWidth = 10; g2.stroke(all); g2.fill(all); }, { blur: 4, alpha: 0.75 });
      ctx.save(); ctx.fillStyle = '#fff8e8'; ctx.fill(all); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const marks = { '#ff3dd2': new Path2D(), '#b6ff2e': new Path2D(), '#2ef2ff': new Path2D() }, mc = Object.keys(marks);
      for (let i = 0; i < 22; i++) {
        const x = 90 + h(i * 4.1) * 900, y = 520 + h(i * 8.3) * 560;
        if (Math.hypot(x - G.cx, y - G.cy) < 260) continue;
        marks[mc[i % 3]].addPath(LX.brushPath([[x, y], [x + 14, y - 6], [x + 28, y - 2]], 7, i));
      }
      for (const c of mc) { ctx.fillStyle = c; ctx.fill(marks[c]); }
      ctx.restore();
      LX.mark('strokes');
    },
  });

  // ================================================================== 9. letterforms built from light
  const TINT_FS = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uRays; uniform vec2 uC; uniform vec3 uA, uB, uBgTop, uBgBot; uniform float uK, uTone;
void main(){ vec2 q=vec2(vUv.x,1.-vUv.y)*vec2(1080.,1350.); float r=length(q-uC)/650.;
  vec3 ray=texture(uRays,vUv).rgb;
  vec3 tint=mix(uA,uB,clamp(r,0.,1.));
  vec3 c=mix(uBgBot,uBgTop,vUv.y)+ray.r*tint*uK+ray.g*mix(vec3(.25,.85,1.),vec3(.6,.3,1.),clamp(r,0.,1.))*uK*.9;
  if(uTone>.5) c=1.-exp(-c*1.25);
  o=vec4(c,1.); }`;
  TECH.push({
    name: 'letterforms built from light', detail: 'text mask (1/4 res) -> GL 2x16-tap jittered radial blur -> tint, crisp type + hatch light on top',
    gl: true, init() { P.tint = LX.prog(TINT_FS); },
    draw(tau, ctx) {
      const C = [540, 640 + 10 * Math.sin(tau)];
      const mc = LX.maskCanvas('m9', 0.25, g => {
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '900 150px "Archivo"'; g.fillStyle = '#f00'; g.fillText('UNCLENCH', 540, 450);
        g.font = 'italic 500 132px "EB Garamond"'; g.fillStyle = '#0f0'; g.fillText('you are the sky', 540, 860);
      });
      const m = LX.canvasTex('m9', mc);
      LX.mark('mask upload');
      const rays = LX.radial({ tex: m.tex, w: mc.width, h: mc.height }, C, 0.62, 0.965, 3.0);
      LX.pass(P.tint, { uRays: rays, uC: C, uA: [1.0, .78, .35], uB: [1., .2, .65], uBgTop: [.03, .02, .1], uBgBot: [.07, .02, .14], uK: 1.6, uTone: 1 }, null, { vp: [0, 0, 540, 675] });
      LX.present(ctx, 540, 675);
      LX.mark('rays+present');
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '900 150px "Archivo"';
      LX.glow2d(ctx, g => { g.font = '900 150px "Archivo"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffb347'; g.fillText('UNCLENCH', 540, 450); }, { blur: 3, alpha: 0.8 });
      ctx.fillStyle = '#fff6e2'; ctx.fillText('UNCLENCH', 540, 450);
      ctx.restore();
      const [c, g] = LX.scratch('h9', W, 260);
      g.clearRect(0, 0, W, 260);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'italic 500 132px "EB Garamond"'; g.fillStyle = '#fff'; g.fillText('you are the sky', 540, 130);
      g.globalCompositeOperation = 'source-in';
      const lg = g.createLinearGradient(0, 0, W, 0); lg.addColorStop(0, '#9dfbff'); lg.addColorStop(.5, '#ffffff'); lg.addColorStop(1, '#ffa0e0');
      g.fillStyle = 'rgba(255,250,245,0.82)'; g.fillRect(0, 0, W, 260);
      g.strokeStyle = lg; g.lineWidth = 2.4; g.beginPath();
      for (let y = 30; y < 240; y += 6) { g.moveTo(0, y + 3 * Math.sin(y + tau * 2)); g.lineTo(W, y - 6 + 3 * Math.sin(y * 1.3 + tau * 2)); }
      g.stroke();
      ctx.drawImage(c, 0, 860 - 130);
      LX.mark('type');
    },
  });

  // ================================================================== 10. glass character refracting light
  const GLASS_FS = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform vec2 uRes; uniform float uT;
${GLSL_UTIL}
${LX.GLSL_GRABBY}
vec3 bgLight(vec2 q){
  vec2 s=vec2(700.,-250.); vec2 d=q-s; float r=length(d), a=atan(d.y,d.x);
  vec3 rays=rayLayer(r,a,300.,3.,uT,900.,2600.)+rayLayer(r,a,520.,29.,uT,700.,2200.)*.8;
  // Hockney color fields: soft saturated planes of light
  vec3 base=mix(vec3(.004,.03,.30),vec3(.30,.01,.22),smoothstep(200.,1350.,q.y));
  base+=vec3(1.,.35,.02)*.45*exp(-pow(length((q-vec2(150.,1150.))/vec2(420.,260.)),2.));
  base+=vec3(.0,.6,.9)*.25*exp(-pow(length((q-vec2(1000.,450.))/vec2(300.,420.)),2.));
  return base+rays*.35;
}
vec2 sdfAll(vec2 q){ return grabbySDF(q,vec2(540.,800.),1.,uT,1.); }
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
void main(){
  vec2 q=vec2(vUv.x,1.-vUv.y)*vec2(1080.,1350.);
  vec2 sd=sdfAll(q); float d=min(sd.x,sd.y); bool isBlob=sd.y<sd.x;
  vec3 col;
  if(d>2.){
    col=bgLight(q);
    vec2 fq=(q-vec2(560.,1045.))/vec2(210.,34.); col+=vec3(1.,.8,.45)*exp(-dot(fq,fq))*1.2;   // light focused on the floor
  } else {
    vec2 e=vec2(1.5,0.);
    vec2 sx=sdfAll(q+e.xy), sy=sdfAll(q+e.yx);
    vec2 n=normalize(vec2(min(sx.x,sx.y)-d,min(sy.x,sy.y)-d)+1e-5);
    float R=isBlob?60.:120.;
    float x=clamp(-d/R,0.,1.); float hgt=sqrt(1.-(1.-x)*(1.-x)); float slope=clamp((1.-x)/max(hgt,.08),0.,4.);
    vec2 off=-n*slope*(isBlob?22.:46.);
    if(isBlob) off+=8.*vec2(sin(q.y*.11+uT*60.),cos(q.x*.13-uT*50.));
    col=vec3(bgLight(q+off*.8).r, bgLight(q+off).g, bgLight(q+off*1.25).b);
    vec3 tint=isBlob?vec3(.55,1.,.35):vec3(1.,.88,.78);
    col=col*tint*1.2+(isBlob?vec3(.05,.2,.02):vec3(.08,.04,.05));
    vec3 n3=normalize(vec3(n*slope,1.));
    col+=vec3(1.,.97,.9)*pow(max(dot(n3,normalize(vec3(.45,-.6,.7))),0.),50.)*1.6;
    col+=vec3(.75,.85,1.)*pow(1.-x,6.)*1.1;
    col+=vec3(1.)*smoothstep(2.,0.,abs(d))*.6;
    col=mix(bgLight(q),col,smoothstep(2.,-1.,d));
  }
  col=aces(col*1.1);
  o=vec4(pow(col,vec3(1./2.2)),1.);
}`;
  TECH.push({
    name: 'glass body refracting rays (dispersion)', detail: 'GLSL: analytic ray field + color fields, SDF dome normal, per-channel refraction, fresnel rim',
    gl: true, scalable: true, init() { P.glass = LX.prog(GLASS_FS); },
    draw(tau, ctx) {
      const k = LX.scale;
      LX.pass(P.glass, { uT: tau }, null, { vp: [0, 0, W * k, H * k] });
      LX.present(ctx, W * k, H * k);
      LX.mark('shader+present');
      const G = LX.grabby(tau, 540, 800, 1);
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(20,8,50,0.75)'; ctx.lineWidth = 9; G.face.forEach(p => ctx.stroke(p));
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5; ctx.save(); ctx.translate(-2, -2); G.face.forEach(p => ctx.stroke(p)); ctx.restore();
      ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(255,230,200,0.35)'; ctx.stroke(G.armPath); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke(G.armPath); ctx.stroke(G.mittenPath);
      ctx.restore();
    },
  });

  // ================================================================== 11. hero combo, one GL light stack + one present
  const ADDTEX_FS = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uS; uniform vec2 uC; uniform vec3 uA, uB; uniform float uK;
void main(){ vec2 q=vec2(vUv.x,1.-vUv.y)*vec2(1080.,1350.); float r=clamp(length(q-uC)/650.,0.,1.); o=vec4(texture(uS,vUv).r*mix(uA,uB,r)*uK,1.); }`;
  TECH.push({
    name: 'combo: ray body + type rays + prism hit, 1 composite', detail: 'all light layers added into one HDR target (half res), one bloom, one present; crisp type on top',
    gl: true, scalable: true, init() { P.addtex = LX.prog(ADDTEX_FS); },
    draw(tau, ctx) {
      const k = LX.scale;
      const hdr = LX.target('hdr11', W * k, H * k);
      TECH[0].light(tau, hdr);
      const C = [540, 330];
      const mc = LX.maskCanvas('m11', 0.25, g => { g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'italic 500 128px "EB Garamond"'; g.fillStyle = '#f00'; g.fillText('you are the sky', 540, 330); });
      const m = LX.canvasTex('m11', mc);
      const rays = LX.radial({ tex: m.tex, w: mc.width, h: mc.height }, C, 0.5, 0.96, 2.4);
      LX.pass(P.addtex, { uS: rays, uC: C, uA: [1.0, .7, .3], uB: [.4, .15, 1.], uK: 0.45 }, hdr, { blend: 'add' });
      LX.pass(P.prism, { uT: tau, uE: 0.18, uC: [515, 770] }, hdr, { blend: 'add' });
      LX.mark('light layers');
      const bl = LX.bloom(hdr, 5);
      LX.composite(hdr, bl, { w: W * k, h: H * k, bloomK: 0.6, expo: 0.95, bgTop: LX.lin('#160b46'), bgBot: LX.lin('#3a0c3c'), seed: tau * 100, ca: 0.006 });
      LX.present(ctx, W * k, H * k);
      LX.mark('bloom+composite+present');
      const G = LX.grabby(tau, 540, 800, 1);
      faceInk(ctx, G);
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#fff4dc'; ctx.lineWidth = 5; ctx.stroke(G.armPath); ctx.stroke(G.mittenPath); ctx.restore();
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'italic 500 128px "EB Garamond"';
      LX.glow2d(ctx, g => { g.font = 'italic 500 128px "EB Garamond"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 14; g.strokeStyle = 'rgba(20,6,50,0.9)'; g.strokeText('you are the sky', 540, 330); }, { blur: 3, op: 'source-over' });
      ctx.fillStyle = '#fffaf0'; ctx.fillText('you are the sky', 540, 330); ctx.restore();
      LX.mark('2d overlay');
    },
  });

  // ================================================================== 12. (reference) rays as instanced GL lines
  const RAYS = new LX.LineBuf(6000);
  TECH.push({
    name: 'reference: rays as 1200 instanced HDR lines', detail: 'GL instanced additive quads into RGBA32F + canvas mask; compare look/cost with slot 0',
    gl: true, scalable: true,
    draw(tau, ctx) {
      const k = LX.scale;
      const G = LX.grabby(tau, 540, 800, 1);
      const mc = LX.maskCanvas('m12', 0.5, g => { g.fill(G.body); });
      const mask = LX.canvasTex('m12', mc);
      const hdr = LX.target('hdr12', W * k, H * k, 'f32'); LX.clear(hdr, 0, 0, 0, 1);
      RAYS.reset();
      const cx = 515, cy = 770;
      const pal = [['#ffcf6b', .52], ['#ff8fa3', .2], ['#fff3d6', .14], ['#ff3dcb', .09], ['#47f0ff', .05]].map(([c, p]) => [LX.lin(c), p]);
      for (let i = 0; i < 1200; i++) {
        const h1 = h(i * 1.7 + .3), h2 = h(i * 3.1 + 7.7), h3 = h(i * 5.3 + 1.1), h4 = h(i * .77 + 9.1);
        const a = i * 2.399963 + tau * 0.03;
        const r0 = 8 + h2 * 50, r1 = 170 + Math.pow(h3, 1.6) * 1100;
        let col = pal[0][0], acc = 0; for (const [c, p] of pal) { acc += p; if (h4 < acc) { col = c; break; } }
        const I = (0.06 + 0.15 * h1) * (0.55 + 0.45 * Math.sin(tau * (1.5 + h1 * 3) + h2 * 20));
        RAYS.add(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, col.map(v => v * I), 0.6 + h2 * 1.3, 1, 0.0, 20);
      }
      LX.lines(hdr, RAYS.d, RAYS.n, { mask, maskMode: 1, maskLo: 0.06 });
      LX.mark('lines');
      const bl = LX.bloom(hdr, 5);
      LX.composite(hdr, bl, { w: W * k, h: H * k, bloomK: 0.85, expo: 1.15, bgTop: LX.lin('#140a40'), bgBot: LX.lin('#3a0c3c'), seed: tau * 100, ca: 0.006 });
      LX.present(ctx, W * k, H * k);
      LX.mark('bloom+composite+present');
      faceInk(ctx, G);
    },
  });

  window.TECH = TECH;
  window.TECH_INIT = () => TECH.forEach(T => T.init && T.init());
})();
