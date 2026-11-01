// UNCLENCH v2 lookdev: "everything made of rays".
// One light shader per section renders the whole light field (ground + ray systems + shapes as ray masks)
// into a 540x675 HDR target -> one bloom -> hue-keeping tonemap -> upscaled into the 1080x1350 canvas.
// Crisp things (light-pen character line, face, captions) are drawn in Canvas2D on top, and all their
// halos go through ONE quarter-res glow pass per frame.
(function () {
  const W = 1080, H = 1350, GW = 540, GH = 675;
  const TAU = Math.PI * 2;
  const E = window.ENGINE;
  const P = {};
  let COMP;
  const SC = [];                         // [t0, t1, fn]
  const add = (t0, t1, fn) => SC.push([t0, t1, fn]);
  const prog = body => LX.prog(RG.HEAD + RG.COMMON + body);
  const lp = (t, n) => TAU * n * t / 60;                 // loop-safe phase
  const boilF = (t, every) => Math.floor(Math.round(t * 30) / every);

  // ------------------------------------------------------------------ frame pipeline
  function lightPass(t, prg, u, post = {}) {
    const hdr = LX.target('hdr', GW, GH);
    LX.pass(prg, Object.assign({ uT: t, uF: Math.round(t * 30), uPx: W / GW }, u), hdr);
    const bl = LX.bloom(hdr, 5, post.thresh ?? 0.55);
    // beat-locked exposure pulse: +5% on every beat (0.75 s), +10% on bar downbeats (3.0 s), 150 ms decay
    const pb = Math.exp(-(t % 0.75) / 0.15) * 0.05 + Math.exp(-(t % 3.0) / 0.15) * 0.05;
    LX.pass(COMP, {
      uHdr: hdr, uBloom: bl, uBloomK: post.bloomK ?? 0.55, uExpo: (post.expo ?? 1) * (1 + (post.pulse ?? 1) * pb), uGrain: post.grain ?? 0.022,
      uSeed: (Math.round(t * 30) % 64) * 7.3, uSat: post.sat ?? 1, uCA: post.ca ?? 0.003, uBleed: post.bleed ?? 0.35,
    }, null, { vp: [0, 0, GW, GH] });
    LX.present(E.ctx, GW, GH);
    if (window.DBG_GL) throw 'dbg';
  }
  // one shared glow pass: shapes into a 1/4-res canvas, then a tight and a wide blur added back
  function flushGlow(ctx, Q, o = {}) {
    if (!Q.length || window.DBG_NOGLOW) return;
    const k = 0.25, w = W * k, h = H * k;
    const [c1, g1] = LX.scratch('gA', w, h);
    g1.clearRect(0, 0, w, h); g1.scale(k, k); g1.lineCap = 'round'; g1.lineJoin = 'round';
    Q.forEach(f => { g1.save(); f(g1); g1.restore(); });
    // tight halo: one small blur at 1/4 res; wide halo: downsample to 1/16 res (the downsample is the blur)
    const [c2, g2] = LX.scratch('gB', w, h);
    g2.clearRect(0, 0, w, h); g2.filter = `blur(${o.tight ?? 2}px)`; g2.drawImage(c1, 0, 0); g2.filter = 'none';
    const [c3, g3] = LX.scratch('gC', w / 4, h / 4);
    g3.clearRect(0, 0, w / 4, h / 4); g3.imageSmoothingQuality = 'high'; g3.drawImage(c1, 0, 0, w / 4, h / 4);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = o.alpha ?? 0.9;
    ctx.drawImage(c2, 0, 0, W, H);
    ctx.globalAlpha = (o.alpha ?? 0.9) * (o.wideA ?? 0.9) * 1.1;
    ctx.drawImage(c3, 0, 0, W, H);
    ctx.restore();
  }
  function watermark(ctx, col = 'rgba(255,255,255,0.55)') {
    ctx.save(); ctx.font = '500 22px "JBM"'; ctx.textAlign = 'right'; ctx.fillStyle = col;
    ctx.fillText('pawel.world', W - 34, 46); ctx.restore();
  }

  // comic vibration ticks around the knot, drawn in light, re-seeded every 2 frames (the buzz)
  function buzzTicks(ctx, t, K, Q, amt) {
    const F = boilF(t, 2), p = new Path2D(), pc = new Path2D();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + LX.hash(F * 13.1 + i) * 0.5 - 0.6;
      if (a > 1.7 && a < 3.4) continue;                       // not over the hand side
      const r0 = K[2] * (1.22 + 0.12 * LX.hash(F + i * 3.3)), r1 = r0 + K[2] * (0.22 + 0.2 * LX.hash(F * 2.1 + i));
      const tgt = LX.hash(i * 7.7 + F) < 0.5 ? p : pc;
      tgt.moveTo(K[0] + Math.cos(a) * r0, K[1] + Math.sin(a) * r0); tgt.lineTo(K[0] + Math.cos(a) * r1, K[1] + Math.sin(a) * r1);
    }
    Q.push(g => { g.lineWidth = 14; g.strokeStyle = '#ff2f9e'; g.stroke(p); g.strokeStyle = '#3df5ff'; g.stroke(pc); });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.globalAlpha = amt;
    ctx.lineWidth = 6; ctx.strokeStyle = '#ffd0ef'; ctx.stroke(p); ctx.strokeStyle = '#d8fdff'; ctx.stroke(pc);
    ctx.restore();
  }

  // ================================================================== 0-6  HOOK: the clench
  // The world's light is sucked into the knot: cold-neon hairline rays converge on it (dashes stream
  // inward). The same converging rays pass through grabbygrab's translucent body and turn warm there,
  // so the body is a warm lantern-shaped region of the ray field. The knot is the one dense, chromatically
  // split neon tangle (re-seeded every 2 frames = buzz).
  const HOOK_FS = `
uniform vec4 uBody; uniform vec3 uKnot; uniform float uPulse, uBoil, uSqueeze;
void main(){
  vec2 q=canvasPx(vUv);
  float vy=q.y/1350.;
  // ground: ultramarine top, violet bottom (Hockney night: colour, never black)
  vec3 col=mix(HX(20.,28.,128.), HX(40.,20.,112.), smoothstep(.0,1.,vy));
  col=mix(col, HX(12.,14.,74.), smoothstep(.45,1.3,length((q-vec2(600.,860.))/vec2(760.,900.))));
  vec2 kd=q-uKnot.xy; float kr=length(kd), ka=atan(kd.y,kd.x);
  col+=HX(170.,30.,150.)*.30*exp(-kr/330.);
  // converging cold-neon rays, twisted into a vortex near the knot: light draining into the grab.
  // Dash phase runs on log(r), so the dashes crowd together as they fall in (a drain).
  float F=uBoil;
  float twist=1.3*exp(-kr/270.)+.14*exp(-kr/1100.);
  float jit=(.010*sin(kr*.011+h11(F)*TAU)+.006*sin(kr*.029-h11(F+1.)*TAU))*(.6+.4*uSqueeze);
  float a=ka+twist+jit;
  float lr=log(max(kr,1.));
  vec2 r1=hair(kr,a,110.,3.,800.,1800.,2.6);
  vec2 r2=hair(kr,a+.013,260.,9.,450.,1200.,1.5);
  vec2 r3m=hair(kr,a+.0045,26.,21.,900.,1900.,6.5);
  vec2 r3c=hair(kr,a-.0045,26.,21.,900.,1900.,6.5);
  float rim=smoothstep(uKnot.z*1.02,uKnot.z*1.4,kr);
  float near=(.05+1.25*exp(-kr/300.))*rim;
  float d1=dashes(lr,18.,90.,1.,r1.y*TAU,.55);
  float d2=dashes(lr,26.,120.,1.,r2.y*TAU,.45);
  float d3=dashes(lr,9.,60.,1.,r3m.y*TAU,.62);
  vec3 c1=r1.y<.38?HX(61.,245.,255.):r1.y<.66?HX(155.,92.,255.):r1.y<.88?HX(255.,62.,165.):vec3(1.);
  vec3 c2=r2.y<.5?HX(155.,92.,255.):r2.y<.8?HX(61.,245.,255.):HX(198.,255.,61.);
  vec3 rays=c1*r1.x*(.08+.92*d1)*.8+c2*r2.x*(.12+.88*d2)*.36;
  rays+=(HX(255.,40.,170.)*r3m.x+HX(40.,230.,255.)*r3c.x)*(.15+.85*d3)*.75*(r3m.y<.75?1.:.0)+HX(198.,255.,61.)*r3m.x*(.15+.85*d3)*.8*(r3m.y<.75?0.:1.);
  rays*=near;
  // body = translucent lantern: the same rays, recoloured warm where they cross him
  vec2 bp=q-uBody.xy; float ba=atan(bp.y/uBody.w,bp.x/uBody.z);
  vec2 rr=uBody.zw*(1.+.025*cos(2.*ba+.4)); rr.y*=bp.y>0.?.985:1.;
  float bd=sdEll(bp,rr);
  float inB=smoothstep(2.5,-2.5,bd);
  vec3 wA=HX(255.,138.,31.), wB=HX(255.,214.,90.), wC=HX(255.,80.,120.);
  vec3 rw=(r1.y<.5?wA:r1.y<.8?wB:wC)*r1.x*(.35+.65*d1)*.75+wB*r2.x*.35+wC*r3m.x*.5;
  float lan=exp(-length((bp-vec2(-.2,-.3)*uBody.zw)/uBody.zw)*1.7);
  vec3 bodyCol=HX(220.,84.,24.)*.46+HX(255.,170.,60.)*.36*lan+rw*(.45+.8*lan);
  bodyCol+=HX(255.,160.,80.)*.30*smoothstep(-60.,0.,bd)*smoothstep(4.,-2.,bd);
  col=mix(col+rays, col*.3+bodyCol, inB);
  // the knot: a dense clot of neon scribble, chromatically split, re-seeded every 2 frames
  float ang=atan(kd.y,kd.x);
  float Rw=uKnot.z*(1.+.075*sin(5.*ang+F*1.3)+.05*sin(9.*ang-F*2.1)+.03*sin(14.*ang+F*.7));
  float kdd=kr-Rw, inK=smoothstep(2.,-2.,kdd);
  vec3 kin=HX(30.,4.,40.)+knotLines(q,uKnot.xy,F,2.4,0.)*.85+knotLines(q+vec2(6.,-4.),uKnot.xy,F,2.,0.)*vec3(.35,0.,.5);
  kin*=.55+.45*smoothstep(uKnot.z*.95,uKnot.z*.3,kr);
  col=mix(col,kin,inK);
  col+=HX(255.,40.,160.)*.85*exp(-abs(kdd-6.)/4.)+HX(61.,245.,255.)*.75*exp(-abs(kdd+3.)/3.)*(1.-inB);
  col+=HX(198.,255.,61.)*.7*exp(-abs(kdd-13.)/3.)*step(.55,h11(floor(ang*6.)+F));
  col+=HX(255.,62.,165.)*.18*exp(-max(kdd,0.)/60.)*(1.-inB);
  // chromatic light pulse from the knot (first 12 frames)
  float pr=uPulse*1100.;
  col+=(HX(255.,62.,165.)*exp(-abs(kr-pr)/18.)+HX(61.,245.,255.)*exp(-abs(kr-pr+26.)/14.))*1.2*(1.-uPulse)*step(.001,uPulse);
  o=vec4(col,1.);
}`;
  function hookCaption(ctx, t, Q) {
    const L = TY.line('V01');
    const lit = (t < L.word_t[0] && t < 1) ? L.words.map(() => 1) : TY.lit(t, L.word_t);
    const ff = s => `400 ${s}px "Anton"`;
    const sz = TY.fit(ctx, ["YOU'RE CLENCHING"], ff, 170, 940);
    const sz2 = TY.fit(ctx, ['SOMETHING RIGHT NOW.'], ff, 170, 940);
    const words = TY.layout(ctx, [
      { words: ["YOU'RE", 'CLENCHING'], size: sz, y: 105 + sz * 0.86 },
      { words: ['SOMETHING', 'RIGHT', 'NOW.'], size: sz2, y: 105 + sz * 0.86 + sz2 * 1.0 },
    ], ff);
    TY.neon(ctx, words, lit, Q, { core: '#fff7fb', halo: '#ff2f9e', edge: '#ff3ea5', ghostA: '#3df5ff', ghostB: '#ff3ea5', split: 0.03, haloA: 0.7 });
  }
  add(0, 6, (t, ctx) => {
    const sq = 0.5 + 0.5 * Math.sin(lp(t, 80));      // squeeze on every beat
    const G = CH.pose(t, {
      cx: 455, cy: 905, s: 345, squash: 0.03 * sq, boil: boilF(t, 2), amp: 2.0,
      arm: { ext: 1, tx: 648, ty: 1052, open: 0.08, sag: 0.03, ang: -0.62 },
      eyes: 'squeeze', mouth: 'zigzag', sweat: 1,
    });
    const knot = [730, 968, 112];
    lightPass(t, P.hook, {
      uBody: [G.cx, G.cy, G.bw, G.bh], uKnot: knot, uPulse: t < 0.4 ? E.clamp(t / 0.4) : 0, uBoil: boilF(t, 2), uSqueeze: sq,
    }, { bloomK: 0.32, expo: 1.0, bleed: 0.25 });
    const Q = [];
    const st = { line: '#ffe9cc', halo: '#ff7a1a', fill: ['#ff9a3c', 0.0], lw: 6.5, ink: '#2a0b3c', handFill: '#ffa040', handHalo: '#ff6a2a', handAlpha: 0.34, glowW: 3, handScale: 1.15 };
    const Hh = CH.draw(ctx, G, st, Q);
    buzzTicks(ctx, t, knot, Q, 1);
    CH.drawHand(ctx, Hh, st, Q);
    hookCaption(ctx, t, Q);
    flushGlow(ctx, Q, { alpha: 0.95 });
    CH.face(ctx, G, st, null);
    watermark(ctx);
  });

  // ------------------------------------------------------------------ init + dispatch
  const INITS = [];
  window.RS = { add, lightPass, flushGlow, watermark, prog, P, lp, boilF, buzzTicks, onInit: f => INITS.push(f), W, H, GW, GH };
  window.RAYS_INIT = function () {
    COMP = LX.prog(RG.COMP);
    P.hook = prog(HOOK_FS);
    INITS.forEach(f => f());
  };
  window.RAYS_DRAW = function (t) {
    t = ((t % 60) + 60) % 60;
    const ctx = E.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    const sc = SC.find(s => t >= s[0] && t < s[1]) || SC[0];
    try { sc[2](t, ctx); } catch (e) { if (e !== 'dbg') throw e; }
  };
})();
