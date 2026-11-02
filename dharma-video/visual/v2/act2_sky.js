// ACT 2, 24.0 to 36.0: YOU ARE THE SKY, THE CLOUD CAN STAY, ARROWS, THE REWARD HACK. LOOK.md 4, 2.7, 2.9, 4.1.
// An immense Hockney pool sky: flat ultramarine to cerulean, smooth squiggles of light that draw themselves on with the
// syllables, soft beams from him, a flat landscape strip far below (purple trees, pink and lime fields, an orange road
// in reverse perspective: it opens away from the viewer). He is tiny, clear glass, the squiggles bending and turning gold
// inside him; the glass cloud floats free and he waves goodbye to it in passing. Arrows are single coral rays that slow
// down in glass, bend and pass through. The reward hack: the hook's iris closes on the jhana orb (the thing grasped), the
// frame darkens, the squiggles crack in the knot's colours, the volley passes through, and on "this." the iris flies open;
// the orb lands in his palm by itself.
(function () {
  const V2 = window.V2, U = V2.U, A = window.a2_NS;
  const { clamp, lerp, hash, TAU } = U;
  const E = A.ease, R = A.range;
  const S = A.sky = {};
  const outSine = u => Math.sin(clamp(u) * Math.PI / 2);

  // ------------------------------------------------------------------ the world (k = 1 world px) and the camera
  const S0 = 165;                       // his size in the sky (body about 230 px: 17% of the frame)
  const CLOUD = [680, 556], CLOUD_SC = 0.85;
  const HIM0 = [790, 850], HIM1 = [330, 892];
  // his world position: still while "you are the sky", drifts left (arcing slightly down, away from the cloud) while he
  // waves goodbye to it (28.45 to 30.0)
  const himW = t => { const u = E.inOutSine(R(t, 28.45, 30.0)); return [lerp(HIM0[0], HIM1[0], u), lerp(HIM0[1], HIM1[1], u) + 28 * Math.sin(Math.PI * u)]; };
  // camera: screen = sc + (world - himW) * k.
  // 24.0 to 27.0: the sky keeps opening out (1.45 -> 1.0, ease-out-sine), then a slow 1.0 -> 0.97 pull to 28.4. The zoom is
  // anchored at ZA (between the caption and him), so the cloud never rides up into "you are the sky".
  // 29.7 to 30.5: push to the medium arrows framing (him at SA, k KA); 33.0 to 35.85: push to BOUND.t36 (540, 860, s 300)
  const ZA = [700, 520];
  const KA = 1.22, SA = [330, 902], B36 = V2.BOUND.t36, KB = B36.char[2] / S0;
  // (final pass) the 1.0 -> 0.97 pull became a slow push 1.00 -> 1.06 over 26.2 to 29.7 (anchored at ZA, so the cloud
  // still never rides up into the caption): from the settle to the arrows the framing is never static
  const kS = t => (1 + 0.45 * (1 - outSine(R(t, 24.0, 27.0)))) * (1 + 0.06 * E.inOutSine(R(t, 26.2, 29.7)));
  const seg1 = t => { const k = kS(t), h = himW(t); return { k, sc: [ZA[0] + (h[0] - ZA[0]) * k, ZA[1] + (h[1] - ZA[1]) * k] }; };
  S.cam = function (t) {
    const hw = himW(t);
    if (t < 29.7) { const c = seg1(t); return { k: c.k, sc: c.sc, hw }; }
    if (t < 33.0) { const u = E.inOutSine(R(t, 29.7, 30.5)), c = seg1(t); return { k: lerp(c.k, KA, u), sc: [lerp(c.sc[0], SA[0], u), lerp(c.sc[1], SA[1], u)], hw }; }
    const u = E.inOutSine(R(t, 33.0, 35.85));
    return { k: lerp(KA, KB, u), sc: [lerp(SA[0], B36.char[0], u), lerp(SA[1], B36.char[1], u)], hw };
  };
  // the cloud stays where it is; in the reward hack it drifts on, out of the captions' way
  const cloudW = t => { const u = E.inOutSine(R(t, 33.1, 34.0)); return [CLOUD[0] + 330 * u, CLOUD[1] - 50 * u]; };
  const toS = (c, p) => [c.sc[0] + (p[0] - c.hw[0]) * c.k, c.sc[1] + (p[1] - c.hw[1]) * c.k];
  // the 24.0 opening: the jewel's warm bands (from the fly-in) clear as a growing hole round him; light rim on its edge
  const openR = t => 1350 * E.outCubic(R(t, 24.0, 24.45));

  // ------------------------------------------------------------------ GL programs
  const HEAD = A.look.BANDS + `
uniform vec4 uCam;       // k, ox, oy (screen = world*k + o), unused
uniform vec4 uSkyK;      // deepen 0..1 (arrows), beam alpha, beam length px (screen), beam bend (hack)
uniform vec4 uSkyK2;     // family B tint (mix) strength, family B width (x line width), unused, gold inside him 0..1
uniform vec4 uOpen;      // the opening: centre x, y, hole radius px, on
uniform vec4 uHack;      // hook-ground flood outside the aperture 0..1, unused x3
uniform vec4 uDrift;     // squiggle drift x, y (world px), crack 0..1, crack radius px (screen, from the aperture)
uniform vec4 uRip[2];    // ripples: x, y (screen), age s, amp (0 = off)
uniform vec4 uHim;       // his centre x, y (screen), body rx, ry
vec3 ground(vec2 P){ vec3 a=pane(P); vec3 d=mix(HX(11.,79.,176.),HX(63.,165.,232.),smoothstep(0.,1350.,P.y)); return mix(a,d,uSkyK.x); }
vec2 ripple(vec2 P){ vec2 o=vec2(0.); for(int i=0;i<2;i++){ vec4 Rr=uRip[i]; if(Rr.w<=0.) continue; vec2 d=P-Rr.xy; float r=length(d)+1e-3;
  float rr=60.+Rr.z*620.; o+=d/r*exp(-pow((r-rr)/46.,2.))*Rr.w*exp(-Rr.z/.2)*26.; } return o; }
vec3 beamsFrom(vec2 P, float cm){
  if(uSkyK.y<=0.) return vec3(0.);
  vec2 dh=P-uHim.xy; float rh=length(dh); float ah=atan(dh.y,dh.x)+uSkyK.w*rh/520.;
  vec2 bb=beams(ah,15.,3.,.30,.07);
  vec2 hh=hair(rh,ah,120.,5.,uSkyK.z*.6,uSkyK.z*1.1,5.);
  float bl=smoothstep(uSkyK.z,uSkyK.z*.30,rh)*smoothstep(uHim.z*.85,uHim.z*1.5,rh);
  return (HX(255.,243.,196.)*bb.x*.8+HX(255.,250.,230.)*hh.x*.22)*bl*uSkyK.y*mix(.30,1.,cm); }
`;
  const CRACK = `
// the reward hack's crack (LOOK 2.3: a 20% crack only here): the edges of a warped cell grid in the knot's magenta /
// green, shown only where they cross a squiggle (the squiggles crack at their junctions). A closed form (no cell search).
float crackE(vec2 p, out float id){
  vec2 w=p+.32*vec2(sin(p.y*1.7+1.3),sin(p.x*1.9+.4));
  vec2 i=floor(w), f=fract(w), e=min(f,1.-f);
  if(e.x<e.y){ id=h12(vec2(i.x+step(.5,f.x),i.y*7.1+.3)); return e.x; }
  id=h12(vec2(i.x*5.3+.7,i.y+step(.5,f.y))); return e.y; }
`;
  const SKY_MAIN = (hack) => `
vec3 gSq;                 // the squiggle light seen through him (added back in gold after his glass)
// (final pass) one squiggle line's profile and white core, split so family B can be composited as tinted light
vec2 sqPC(vec2 P, float sc, float ph, float seed, float wpx){
  float f=sqF(P,sc,ph,seed);
  float g=length(vec2(dFdx(f),dFdy(f)))/uPx+1e-4;
  float d=abs(f)/g;
  float wv=wpx*(.5+1.0*vn(P/260.+seed*3.));
  return vec2(exp(-d*d/(wv*wv)*1.4), smoothstep(wv*.42,wv*.12,d)); }
vec3 world(vec2 P, float cm, float inBody){
  vec3 g=ground(P);
  vec2 W=(P+ripple(P)-uCam.yz)/uCam.x+uDrift.xy;
  // family A (white / lemon) is added light; family B (pink / lilac) is mixed in as saturated tinted light, because
  // pink ADDED to a bright cerulean washes out to a pale lavender that barely reads (final pass: reviewer 1 and 2)
  float ph=lph(floor(uSq.z+.5));
  vec3 a=sqFam(W,uSq.x,ph,1.7,uSq.y,uSqA0,uSqA1,uSqI.z)*uSqI.x*sqReveal(W,uSqRev.x);
  vec2 W2=W+vec2(137.,-61.);
  vec2 pb=sqPC(W2,uSq.x*uSq.w,1.3-ph,5.3,uSq.y*uSkyK2.y);
  float rb=uSqI.y*sqReveal(W,uSqRev.y);
  vec3 cb=mix(uSqB0,uSqB1,smoothstep(.35,.65,vn(W2/340.+5.3*7.)));
  vec3 sq=a+(cb*pb.x+vec3(1.)*pb.y*uSqI.z*.8)*rb;
  float gk=inBody*uSkyK2.w;
  gSq=sq*gk;
  float ob=cm*(1.-gk);
  vec3 c=g+a*cm*(1.-gk);
  c=mix(c,cb*1.10,clamp(pb.x*rb*uSkyK2.x*ob,0.,1.))+mix(cb,vec3(1.),.55)*pb.y*uSqI.z*.9*rb*ob;
  ${hack ? `
  if(uDrift.z>0.){
    float id; float e=crackE(W/175.+3.1,id);
    float ln=smoothstep(.040,.012,e)*step(id,.30);
    float onSq=smoothstep(.10,.45,lum(sq));
    float reach=smoothstep(uDrift.w+120.,uDrift.w-120.,length(P-uIris.xy));
    vec3 kc=id<.15?HX(255.,46.,151.):HX(31.,163.,82.);
    c=mix(c,kc*1.3,ln*(.30+.70*onSq)*uDrift.z*reach);
  }
  vec3 ic,top; float cov=iris(P,ic,top);
  c=mix(c,HX(27.,20.,102.)*.9,uHack.x*cov);                        // the hook ground floods in under the blades
  vec3 gl=mix(c,ic,irisAlpha); c=mix(c,gl,cov);` : ''}
  c+=beamsFrom(P,cm);
  return c; }
void main(){
  vec2 P=canvasPx(vUv); float cm=calm(P);
  float lq=lensQ(P,uBody); float aw=3.*uPx/max(min(uBody.z,uBody.w),1.);
  float in1=smoothstep(1.+aw,1.-aw,lq)*step(1e-4,abs(uLens));
  float in2=(1.-step(.5,in1))*step(lensQ(P,uBody2),1.)*step(1e-4,uLens2);
  vec2 Q=in1>0.?mix(P,lensPos(P,uBody,uLens,1.),in1):(in2>0.?lensPos(P,uBody2,uLens2,1.):P);
  vec3 c=world(Q,cm,in1);
  if(in1>0.){
    c=bodyGlass(P,c);
    // the squiggles bend and turn gold inside him (#FFC23D with a white-hot core where they are brightest), but only in
    // the outer ring of his glass: the eye and mouth zone stays clear (final pass: two gold lines crossing there read
    // as an X or a slash across his face). The gold is a tint, never an opaque stroke (cap .6).
    vec2 q=(P-uBody.xy)/max(uBody.zw,vec2(1.)); float d=length(q); vec2 qn=q/max(d,1e-3);
    float face=smoothstep(.40,.66,length((q-vec2(0.,-.07))*vec2(1.,1.45)));
    float gl=min(clamp(lum(gSq)*1.3,0.,1.),.6)*in1*face;
    c=mix(c,HX(255.,178.,40.)*.95,gl); c+=HX(255.,236.,170.)*smoothstep(.75,1.3,lum(gSq))*.35*in1*face;
    // dispersion inside his rim: magenta on the upper left, cyan on the lower right (rainbow lives only inside glass)
    float rb=smoothstep(.68,.92,d)*smoothstep(1.02,.95,d);
    c+=(HX(255.,70.,200.)*max(dot(qn,vec2(-.6,-.8)),0.)+HX(70.,225.,255.)*max(dot(qn,vec2(.6,.8)),0.))*rb*.42*in1; }
  if(uOpen.w>0.){ float rr=length(P-uOpen.xy); c=mix(bands(rr,1000.),c,smoothstep(uOpen.z+1.5,uOpen.z-1.5,rr)); }
  o=vec4(c,1.); }`;
  V2.L.program('a2_sky', ['PANE', 'LENS', 'BODY', 'SQUIGGLE', 'RAYS', 'CALM'], HEAD + SKY_MAIN(false));
  V2.L.program('a2_hack', ['PANE', 'LENS', 'BODY', 'SQUIGGLE', 'RAYS', 'CALM', 'IRIS'], HEAD + CRACK + SKY_MAIN(true));

  // ------------------------------------------------------------------ the landscape strip (far below, reverse perspective)
  const VP = [540, 1980];               // the fields fan from a point below the frame: the viewer is the vanishing point
  function landscape(ctx, t, c) {
    const px = -26 * E.inOutSine(R(t, 24.0, 30.0));          // a little parallax against the squiggles
    const T = p => { const q = toS(c, p); return [q[0] + px, q[1]]; };
    const y0 = 1188;
    if (T([0, y0])[1] > 1360) return;
    ctx.save();
    const wave = (x, sd, amp) => amp * Math.sin(x * 0.010 + sd) + amp * 0.45 * Math.sin(x * 0.023 + sd * 2.1);
    const ridge = []; for (let x = -100; x <= 1180; x += 30) ridge.push([x, y0 + wave(x, 1.3, 9)]);
    const hill = ridge.concat([[1180, 1400], [-100, 1400]]);
    ctx.fillStyle = '#7A2BD1'; ctx.fill(A.poly(hill.map(T), true));
    const fy = y0 + 30, xs = [-420, -120, 150, 400, 640, 900, 1180, 1500];
    const cols = ['#B6F03C', '#FF6FB5', '#36C95A', '#FF6FB5', '#B6F03C', '#36C95A', '#FF6FB5'];
    const top = x => [x, fy + wave(x, 4.1, 5)];
    for (let i = 0; i < xs.length - 1; i++) {
      const a = top(xs[i]), b = top(xs[i + 1]);
      ctx.fillStyle = cols[i]; ctx.fill(A.poly([a, b, VP, VP].map(T), true));
    }
    // (final pass) Hockney marks: rows of dashes and dots along the furrows (a deeper shade of each field), bigger
    // toward the horizon (reverse perspective), so the fields read as painted land, not flat rectangles
    const MK = { '#B6F03C': ['dash', '#5FB01E'], '#FF6FB5': ['dot', '#C8106C'], '#36C95A': ['dash', '#17804A'] };
    ctx.lineCap = 'round';
    for (let i = 0; i < xs.length - 1; i++) {
      const mk = MK[cols[i]]; if (!mk) continue;
      const a = top(xs[i]), b = top(xs[i + 1]);
      ctx.fillStyle = mk[1]; ctx.strokeStyle = mk[1];
      [0.022, 0.056, 0.094].forEach((sr, r) => {
        const sc = (1 - 3.2 * sr) * c.k;
        for (let q = 0; q < 4; q++) {
          const f = (q + 0.5 + 0.22 * Math.sin(r * 2.1 + q * 1.3 + i)) / 4;
          const pa = [lerp(a[0], b[0], f), lerp(a[1], b[1], f)], pw = [lerp(pa[0], VP[0], sr), lerp(pa[1], VP[1], sr)];
          const dl = Math.hypot(VP[0] - pa[0], VP[1] - pa[1]), d = [(VP[0] - pa[0]) / dl, (VP[1] - pa[1]) / dl];
          const P = T(pw);
          if (mk[0] === 'dash') { ctx.lineWidth = 6.5 * sc; ctx.beginPath(); ctx.moveTo(P[0] - d[0] * 10 * sc, P[1] - d[1] * 10 * sc); ctx.lineTo(P[0] + d[0] * 10 * sc, P[1] + d[1] * 10 * sc); ctx.stroke(); }
          else { ctx.beginPath(); ctx.arc(P[0], P[1], 4.8 * sc, 0, TAU); ctx.fill(); }
        }
      });
    }
    const rl = [], rr = [], rc = [];
    for (let q = 0; q <= 22; q++) {
      const u = q / 22, y = lerp(1420, fy - 4, Math.pow(u, 0.9));
      const x = 560 + 70 * Math.sin(u * 5.2 + 0.6) * (0.4 + 0.6 * u) - 30 * u, hw = lerp(10, 70, Math.pow(u, 1.3));
      rl.push([x - hw, y]); rr.push([x + hw, y]); rc.push([x, y]);
    }
    ctx.fillStyle = '#FF7A1A'; ctx.fill(A.poly(rl.concat(rr.slice().reverse()).map(T), true));
    ctx.fillStyle = '#E8412B'; ctx.globalAlpha = 0.9;
    const eb = []; for (let x = -100; x <= 1180; x += 40) eb.push([x, 1328 + wave(x, 2.7, 4)]);
    ctx.fill(A.poly(eb.concat([[1180, 1420], [-100, 1420]]).map(T), true)); ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFE45C'; ctx.fill(V2.fx.brush(rc.slice(2, 21).map(T), 5 * c.k, { taper: [0.1, 0.4, 0.3, 0.2] }));
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.stroke(A.poly(ridge.map(T)));
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 1; i < xs.length - 1; i++) { const a = top(xs[i]); const b = [lerp(a[0], VP[0], 0.30), lerp(a[1], VP[1], 0.30)], m = [lerp(a[0], b[0], 0.5), lerp(a[1], b[1], 0.5)];
      V2.lightLine(ctx, [a, m, b].map(T), { core: '#FFF8E8', halo: '#FFF3C4', w: 3 * c.k, taper: [0.0, 1, 0.55, 0.3], gw: 7, ga: 0.18, alpha: 0.55, op: 'lighter' }); }
    [[150, 0], [372, 1], [742, 0], [948, 0]].forEach(([x, g], i) => {
      const y = y0 + wave(x, 1.3, 9), r = 21 + 5 * hash(i * 3.1);
      const p = T([x, y]), rk = r * c.k, tk = 24 * c.k;
      ctx.fillStyle = 'rgba(255,111,181,0.70)'; ctx.beginPath(); ctx.ellipse(p[0] + rk * 1.0, p[1] + 4 * c.k, rk * 1.4, rk * 0.34, 0.06, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3A1490'; ctx.fillRect(p[0] - 3 * c.k, p[1] - tk, 6 * c.k, tk);
      ctx.fillStyle = g ? '#36C95A' : '#7A2BD1'; ctx.beginPath(); ctx.ellipse(p[0], p[1] - tk - rk * 1.05, rk, rk * 1.2, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = g ? 'rgba(220,255,200,0.7)' : 'rgba(214,190,255,0.85)'; ctx.lineWidth = 3 * c.k; ctx.beginPath(); ctx.ellipse(p[0], p[1] - tk - rk * 1.05, rk - 2, rk * 1.2 - 2, 0, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke(); ctx.restore();
    });
    ctx.restore();
  }

  // ------------------------------------------------------------------ him
  const wave = t => 0.35 * V2.osc(t, 80);              // +-0.35 rad on the beat, loop-safe
  // happy clear glass with less milk (the world shows through him, LOOK 3.1: uLens .5, squiggles bend and turn gold)
  const MOOD = Object.assign({}, V2.grab.MOODS.happy, { scr: 0.14, lobeA: 0.13, emit: 0.03 });
  // He is built at a fixed size (s 300 at the origin) and drawn through a 2D camera (scale ck, translate p), so his hand
  // and glass sprites stay cached while the camera zooms (a size-keyed sprite rebuilt every frame cost ~80 ms).
  // himGeo returns the SCREEN view of him (cx, cy, bw, bh, s, hand palm and finger tips) plus .L (local geo) and .m.
  const SL = 300;
  function himLocal(t, c) {
    const p = toS(c, himW(t)), ck = c.k * S0 / SL, s = SL;
    // (the arm's sag is explicit, so the hand never jumps between the beats: rest = ext 0 at sag .3125; the reward hack
    // eases to the BOUND.t36 rest arm, ext 0 at the default sag .35)
    let arm = { ext: 0, open: 1, ang: -0.55, sag: 0.3125 };
    if (t >= 28.45 && t < 30.4) {         // a friendly wave goodbye as he passes: shoulder height, on the side away from the cloud
      const e = E.smooth(R(t, 28.45, 28.75)) * (1 - E.smooth(R(t, 30.0, 30.4)));
      arm = { ext: e, tx: 1.06 * s, ty: -0.24 * s, open: 1, ang: lerp(-0.55, -1.15 + wave(t), e), sag: lerp(0.3125, 0.12, e), hscale: Math.round(lerp(1, 1.1, e) * 20) / 20 };
    } else if (t >= 30.4 && t < 32.9) {   // fingers twitch toward the 2014 arrow once (31.9), then relax open
      const tw = E.smooth(R(t, 31.86, 31.98)) * (1 - E.smooth(R(t, 32.0, 32.4)));
      arm = { ext: 0.45 * tw, tx: 0.95 * s, ty: 0.05 * s, fingers: [1 - 0.2 * tw, 1 - 0.28 * tw, 1 - 0.3 * tw, 1 - 0.3 * tw, 1 - 0.28 * tw], ang: lerp(-0.55, -0.1, tw), sag: lerp(0.3125, 0.35, E.smooth(R(t, 32.4, 32.9))) };
    } else if (t >= 32.9) {
      const tw = E.smooth(R(t, 34.6, 34.75)) * (1 - E.smooth(R(t, 34.85, 35.2)));
      arm = { ext: 0, open: 1, ang: -0.55, fingers: [1 - 0.18 * tw, 1 - 0.22 * tw, 1 - 0.24 * tw, 1 - 0.24 * tw, 1 - 0.22 * tw] };
    }
    // the bob settles to 0 by the handoff: the last frame is exactly V2.grab.geo(35.967, 540, 860, 300, {arm}) (ck = 1)
    const L = V2.grab.geo(t, 0, 0, s, { arm, bob: 1 - E.smooth(R(t, 35.4, 35.9)), mitten: false });
    return { L, ck, p, m: [ck, 0, 0, ck, p[0], p[1]] };
  }
  function himGeo(t, c) {
    const H = himLocal(t, c), k = H.ck, T = q => [H.p[0] + q[0] * k, H.p[1] + q[1] * k], L = H.L;
    return { s: L.s * k, cx: H.p[0] + L.cx * k, cy: H.p[1] + L.cy * k, bw: L.bw * k, bh: L.bh * k,
      hand: { palm: { c: T(L.hand.palm.c) }, caps: (L.hand.caps || []).map(q => ({ b: T(q.b) })) }, H };
  }
  S.himGeo = (t) => himGeo(t, S.cam(t));
  S.himScreen = (t) => { const G = himGeo(t, S.cam(t)); return [G.cx, G.cy]; };
  // QA: the gap (px) between his hand and the cloud's glass, so the wave never reads as holding the cloud (>= 150 asserted)
  S.cloudGap = function (t) {
    const c = S.cam(t), G = himGeo(t, c), cS = toS(c, cloudW(t)), cl = V2.grab.cloudLens(cS[0], cS[1], CLOUD_SC * c.k).uBody2;
    const pts = [G.hand.palm.c].concat((G.hand.caps || []).map(q => q.b));
    let best = 1e9;
    pts.forEach(p => { for (let i = 0; i < 72; i++) { const a = i / 72 * TAU; best = Math.min(best, Math.hypot(p[0] - (cl[0] + Math.cos(a) * cl[2]), p[1] - (cl[1] + Math.sin(a) * cl[3]))); } });
    return best;
  };
  function himFace(t, orbP, G) {
    if (t < 33.4) return { eyes: 'happy', mouth: 'smile' };
    if (t < 34.05) { const d = orbP ? [clamp((orbP[0] - G.cx) / 300, -1, 1), clamp((orbP[1] - G.cy) / 300, -1, 1)] : [0, 0]; return { eyes: 'dots', mouth: 'flat', look: d }; }
    if (t < 35.41) return { eyes: 'closed', mouth: 'smile' };
    if (t >= 35.6 && t < 35.76) return { eyes: 'big', mouth: 'o' };
    return { eyes: 'happy', mouth: 'smile' };
  }
  // a stronger off-register second line (#FF9ACB, 4 px at 70%): the iPad-drawing feel against the perfect rim
  function offLine(ctx, t, G, ck) {
    const pts = [], sd = V2.boil(t, 4), u = 1 / ck;
    for (let i = 0; i <= 40; i++) { const a = -1.3 + i / 40 * 0.62 * TAU, w = 1 + 0.025 * Math.sin(a * 3 + hash(sd) * TAU); pts.push([G.cx + Math.cos(a) * G.bw * w * 1.01 + 6 + 3 * u, G.cy + Math.sin(a) * G.bh * w * 1.01 + 4 + 2 * u]); }
    ctx.save(); ctx.globalAlpha = 0.7; ctx.fillStyle = '#FF9ACB'; ctx.fill(V2.fx.brush(pts, 4 * u, { taper: [0.15, 0.25, 0.2, 0.15] })); ctx.restore();
  }

  // ------------------------------------------------------------------ arrows (single coral rays that pass through)
  // Each arrow comes in fast, slows to about 430 px/s while its tag crosses the middle of the frame (the whole tag is on
  // screen for about 0.8 s), passes its glass at w + 0.42 (a celesta spark instead of an impact) and leaves fast.
  const TAG_PX = 46, TAG_FONT = `500 ${TAG_PX}px "JBM"`, CHIP_PAD = 16;
  const AV = { vs: 430, vf: 3400, a: 0.40, b: 0.80 };
  const Fint = x => { if (x <= AV.a) return 0; if (x >= AV.b) return (AV.b - AV.a) * 0.5 + (x - AV.b); const u = (x - AV.a) / (AV.b - AV.a); return (AV.b - AV.a) * (u * u * u - u * u * u * u / 2); };
  const travel = tau => Math.sign(tau) * (AV.vs * Math.abs(tau) + (AV.vf - AV.vs) * Fint(Math.abs(tau)));
  const travelInv = s => { let lo = -4, hi = 4; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (travel(m) < s) lo = m; else hi = m; } return (lo + hi) / 2; };
  const SPARK = ['#FFF3A6', '#FF9ACB', '#FFFFFF', '#A6FFE9'];
  const TAGGED = [
    { tag: 'am i doing this right', w: 30.75, dir: 1, slope: -0.12, thru: 'cloud', below: true },
    { tag: 'what you said in 2014', w: 31.50, dir: -1, slope: 0.06, thru: 'him', below: true },
    { tag: 'arrow #2 (optional)', w: 32.25, dir: 1, slope: 0.07, thru: 'cloud', below: true },
    { tag: 'someone is wrong online', w: 33.00, dir: -1, slope: 0.03, hit: [100, 560] },
  ];
  let tagGeo = null;
  function tagGeometry(ctx) {
    if (tagGeo) return tagGeo;
    ctx.save(); ctx.font = TAG_FONT;
    tagGeo = TAGGED.map(Ar => {
      const tw = ctx.measureText(Ar.tag).width, len = tw + 2 * CHIP_PAD + 110;
      const th = Ar.w + 0.42, ang = Math.atan2(Ar.slope, Ar.dir), ca = Math.cos(ang);
      const P = hitPoint(Ar, th, S.cam(th), himGeo(th, S.cam(th)));
      // the shaft's middle (under the tag) crosses the frame centre at tc; the head passes P at th
      const sC = (540 - P[0]) / ca + len / 2;
      const tc = th - travelInv(-sC);
      return { tw, len, th, ang, P, sC, tc };
    });
    ctx.restore();
    return tagGeo;
  }
  function glassEll(t, c, G) {
    const cl = V2.grab.cloudLens(...toS(c, cloudW(t)), CLOUD_SC * c.k);
    return [{ e: [G.cx, G.cy, G.bw, G.bh], k: 'him' }, { e: cl.uBody2, k: 'cloud' }];
  }
  function hitPoint(Ar, t, c, G) {
    if (Ar.thru === 'cloud') { const p = toS(c, cloudW(t)); return [p[0], p[1] - 10 * c.k]; }
    if (Ar.thru === 'him') return [G.cx, G.cy + 0.50 * G.bh];
    return Ar.hit;
  }
  // bend a polyline where it passes through glass ellipses (a visible refraction kink; nothing breaks)
  function bendThrough(pts, ells, ang) {
    const nx = -Math.sin(ang), ny = Math.cos(ang), ca = Math.cos(ang), sa = Math.sin(ang);
    return pts.map(p => {
      let off = 0;
      for (const g of ells) {
        const e = g.e, qx = (p[0] - e[0]) / e[2], qy = (p[1] - e[1]) / e[3], d = qx * qx + qy * qy;
        if (d >= 1) continue;
        const along = clamp((qx * ca + qy * sa) * 0.5 + 0.5);
        off += Math.sin(Math.PI * along) * Math.sqrt(1 - d) * Math.min(e[2], e[3]) * 0.48;
      }
      return [p[0] + nx * off, p[1] + ny * off];
    });
  }
  // a ray-arrow: a saturated coral halo (source-over, so it stays coral on the bright sky instead of blooming to white)
  // round a 5 px white core, a light-drawn chevron head and fletching; the tag on a dark chip, drawn after the glow flush
  function drawArrow(ctx, head, ang, len, o = {}) {
    const dx = Math.cos(ang), dy = Math.sin(ang), n = 30;
    let pts = []; for (let i = 0; i <= n; i++) { const s = len * (1 - i / n); pts.push([head[0] - dx * s, head[1] - dy * s]); }
    if (o.ells) pts = bendThrough(pts, o.ells, ang);
    const hp = pts[pts.length - 1], hp2 = pts[pts.length - 3];
    const ha = Math.atan2(hp[1] - hp2[1], hp[0] - hp2[0]);
    V2.glow(g => { g.globalAlpha = 0.30; g.strokeStyle = '#FF6B57'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 22; g.stroke(A.poly(pts.slice(6))); });
    ctx.save();
    ctx.fillStyle = V2.rgba('#FF6B57', 0.28); ctx.fill(V2.fx.brush(pts, 30, { taper: [0.8, 0.1, 0.04, 0.85] }));
    ctx.fillStyle = '#FF6B57'; ctx.fill(V2.fx.brush(pts, 15, { taper: [0.75, 0.12, 0.04, 0.85] }));
    ctx.fillStyle = '#FFFFFF'; ctx.fill(V2.fx.brush(pts.slice(5), 5.5, { taper: [0.6, 0.1, 0.05, 0.9] }));
    const hl = 48, chev = [[hp[0] - Math.cos(ha - 0.48) * hl, hp[1] - Math.sin(ha - 0.48) * hl], [hp[0] + Math.cos(ha) * 5, hp[1] + Math.sin(ha) * 5], [hp[0] - Math.cos(ha + 0.48) * hl, hp[1] - Math.sin(ha + 0.48) * hl]];
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#FF6B57'; ctx.lineWidth = 13; ctx.stroke(V2.P.path(chev));
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 5; ctx.stroke(V2.P.path(chev));
    ctx.strokeStyle = '#FF8A72'; ctx.lineWidth = 4;
    for (let k = 0; k < 3; k++) { const p = pts[1 + k * 2]; ctx.beginPath(); ctx.moveTo(p[0] - Math.cos(ang - 0.55) * 26, p[1] - Math.sin(ang - 0.55) * 26); ctx.lineTo(p[0], p[1]); ctx.lineTo(p[0] - Math.cos(ang + 0.55) * 26, p[1] - Math.sin(ang + 0.55) * 26); ctx.stroke(); }
    ctx.restore();
    if (o.tag && (o.tagA ?? 1) > 0.01) {
      // the chip sits over the middle of the shaft, horizontal, 40 px clear of it (below it where a caption is above)
      const mid = pts[Math.round(n / 2)], cw = o.tagW + 2 * CHIP_PAD, ch = TAG_PX + 22;
      const slopeDrop = Math.abs(Math.tan(ang)) * cw / 2;
      const cy = o.below ? mid[1] + 40 + slopeDrop + ch / 2 : mid[1] - 40 - slopeDrop - ch / 2;
      const x0 = clamp(mid[0] - cw / 2, -cw, 1080), y0 = cy - ch / 2;
      V2.post(c => {
        c.save(); c.globalAlpha = o.tagA ?? 1; c.fillStyle = V2.rgba('#0B1F5C', 0.72); c.beginPath(); c.roundRect(x0, y0, cw, ch, 14); c.fill();
        c.strokeStyle = V2.rgba('#FF8A72', 0.85); c.lineWidth = 2; c.stroke();
        c.font = TAG_FONT; c.textBaseline = 'alphabetic'; c.fillStyle = '#FFFFFF'; c.fillText(o.tag, x0 + CHIP_PAD, y0 + ch / 2 + TAG_PX * 0.36);
        c.restore();
      });
    }
    return pts;
  }
  function taggedArrows(ctx, t, c, G) {
    const geo = tagGeometry(ctx);
    TAGGED.forEach((Ar, i) => {
      const g = geo[i], tau = t - g.tc;
      if (tau < -1.4 || tau > 1.4) return;
      const s = g.sC + travel(tau);
      const head = [g.P[0] + Math.cos(g.ang) * s, g.P[1] + Math.sin(g.ang) * s];
      const tail = [head[0] - Math.cos(g.ang) * g.len, head[1] - Math.sin(g.ang) * g.len];
      if ((head[0] < -60 && tail[0] < -60) || (head[0] > 1140 && tail[0] > 1140)) return;
      // the tag shows while the arrow is slow (it fades in as the arrow brakes and out as it speeds away)
      drawArrow(ctx, head, g.ang, g.len, { tag: Ar.tag, tagW: g.tw, ells: glassEll(t, c, G), below: Ar.below, tagA: 1 - E.smooth(R(Math.abs(tau), 0.52, 0.66)) });
    });
    // celesta sparks where the impact should be (+0.42), and ripple rings where it crosses the squiggles
    TAGGED.forEach((Ar, i) => {
      const g = geo[i];
      if (t < g.th - 0.05 || t > g.th + 0.5) return;
      V2.fx.sparks(ctx, t, g.th, g.P[0], g.P[1], [SPARK[i], '#FF9ACB'], { r: 86, w: 5 });
      A.ripple(ctx, t, g.P[0], g.P[1], g.th, { r: 170, life: 10, halo: SPARK[i] === '#FFFFFF' ? '#9FE8FF' : SPARK[i] });
    });
  }
  function ripU(t) {
    const R4 = new Float32Array(8); let n = 0;
    TAGGED.forEach((Ar, i) => {
      const th = Ar.w + 0.42, age = (Math.round(t * 30) - Math.round(th * 30)) / 30;
      if (age < 0 || age > 0.45 || n >= 2) return;
      const P = hitPoint(Ar, th, S.cam(th), himGeo(th, S.cam(th)));
      R4.set([P[0], P[1], age, 1], n * 4); n++;
    });
    return { uRip: { v4: R4 } };
  }

  // ------------------------------------------------------------------ the reward hack: iris, orb, volley
  // the hook's 9 blades re-keyed for glass over the sky (LOOK 2.5: never lemon over sky blue, never a warm complement
  // mixed into blue, no green body): ultramarine, hot pink, blue-violet, magenta, orchid, violet, cerulean, rose crimson,
  // sky cyan. The knot's green comes back only in the cracks.
  const HACK9 = ['#2233D6', '#FF5FA2', '#5B2BD9', '#FF2E97', '#C77DFF', '#7A2BD1', '#1E9BE6', '#E8417A', '#3DB4FF'];
  const ORB_R = B36.orb.r;
  const HOVER = t => [236 + 8 * V2.osc(t, 40), 716 + 7 * V2.osc(t, 20, 1)];
  const IRIS_C = [236, 716];                 // the aperture closes on the orb (the thing being grasped)
  S.palm = G => G.hand.palm.c.slice();
  function orbAt(t, G) {
    if (t < 33.35) return null;
    const hover = HOVER(t);
    if (t < 35.41) { const u = E.outCubic(R(t, 33.35, 34.45)); return [lerp(-80, hover[0], u), lerp(680, hover[1], u)]; }
    const pm = S.palm(G), u = R(t, 35.41, 35.6), e = 0.5 * E.outQuad(u) + 0.5 * E.smooth(u);
    const h0 = HOVER(35.41);
    const mid = [lerp(h0[0], pm[0], 0.45), Math.min(h0[1], pm[1]) - 330];      // arcs over his head, never across his face
    if (u >= 1) return pm;
    return [(1 - e) * (1 - e) * h0[0] + 2 * (1 - e) * e * mid[0] + e * e * pm[0], (1 - e) * (1 - e) * h0[1] + 2 * (1 - e) * e * mid[1] + e * e * pm[1]];
  }
  // the iris: its aperture (a light ring) closes from beyond the frame to 260 px round the orb (32.9 to 34.05), halts and
  // trembles, and on "this." (35.41) flies open in 9 frames (ease-out: it moves on the first frame)
  const R_OPEN = 1180, R_SHUT = 260;
  function irisAt(t) {
    if (t < 32.9) return null;
    const sd = V2.boil(t, 2);
    const trem = t >= 34.05 && t < 35.41 ? 1 : 0;
    let Rr, close;
    if (t < 35.41) { close = E.inOutCubic(R(t, 32.9, 34.05)); Rr = lerp(R_OPEN, R_SHUT, close) + trem * 7 * V2.osc(t, 480); }
    else { const u = R(t, 35.41, 35.41 + 9 / 30); close = 1 - u; Rr = lerp(R_SHUT, 1700, E.outQuad(u)); if (u >= 1) return null; }
    const C = [IRIS_C[0] + trem * (hash(sd * 1.3) - 0.5) * 6, IRIS_C[1] + trem * (hash(sd * 2.1) - 0.5) * 6];
    const tw = 0.30 + 0.75 * Math.min(1, close) + trem * 0.014 * V2.osc(t, 600) + (t >= 35.41 ? 0.5 * E.outQuad(R(t, 35.41, 35.71)) : 0);
    return { C, R: Rr, tw, close: clamp(close), trem, open: t >= 35.41 };
  }
  // the volley (34.52 + k * 0.062, 0.42 s crossings): 12 coral streaks straight through the half-closed blades
  const VOL = { t0: 34.52, dt: 0.062, dur: 0.42 };
  let VOLLEY = null;
  function volleyPaths() {
    if (VOLLEY) return VOLLEY;
    VOLLEY = Array.from({ length: 12 }, (_, k) => {
      const th = VOL.t0 + k * VOL.dt + VOL.dur / 2;
      const c = S.cam(th), G = himGeo(th, c);
      const side = k % 2 ? -1 : 1;
      for (let j = 0; j < 400; j++) {
        const sd = k * 17.3 + j * 1.13;
        const ang = (side > 0 ? 0 : Math.PI) + (hash(sd * 2.3 + 1) * 2 - 1) * 0.55;
        const hit = [lerp(80, 1000, hash(sd + 2)), lerp(600, 1240, hash(sd * 1.7 + 9))];
        let ok = true;
        for (let s = -1600; s <= 1600 && ok; s += 20) {
          const x = hit[0] + Math.cos(ang) * s, y = hit[1] + Math.sin(ang) * s;
          if (x < -40 || x > 1120 || y < -40 || y > 1390) continue;
          if (y < 590) ok = false;
          const qx = (x - G.cx) / (G.bw + 50), qy = (y - G.cy) / (G.bh + 60); if (qx * qx + qy * qy < 1) ok = false;
          if (Math.hypot(x - 236, y - 716) < 130) ok = false;
        }
        if (ok) return { hit, ang, th, len: 240 + 120 * hash(k * 3.3) };
      }
      return { hit: [540, 1230], ang: side > 0 ? 0 : Math.PI, th, len: 260 };
    });
    return VOLLEY;
  }
  function volley(ctx, t) {
    const segs = [];
    const core = new Path2D();
    volleyPaths().forEach(Vv => {
      const u = (t - Vv.th) / (VOL.dur / 2);
      if (u <= -1 || u >= 1) return;
      const d = 1350 * (0.8 * u + 0.2 * u * u * u);
      const head = [Vv.hit[0] + Math.cos(Vv.ang) * d, Vv.hit[1] + Math.sin(Vv.ang) * d];
      const dx = Math.cos(Vv.ang), dy = Math.sin(Vv.ang), Ls = Vv.len + 180;
      const pts = [[head[0] - dx * Ls, head[1] - dy * Ls], [head[0] - dx * Ls * 0.5, head[1] - dy * Ls * 0.5], head];
      segs.push(pts); core.addPath(V2.fx.brush(pts, 7, { taper: [0.85, 0.0, 0.05, 0.7] }));
    });
    if (!segs.length) return;
    V2.glow(g => { g.globalAlpha = 0.6; g.strokeStyle = '#FF6B57'; g.lineCap = 'round'; g.lineWidth = 20; g.beginPath(); segs.forEach(p => { g.moveTo(p[1][0], p[1][1]); g.lineTo(p[2][0], p[2][1]); }); g.stroke(); });
    ctx.save(); ctx.fillStyle = V2.rgba('#FF6B57', 0.85); segs.forEach(p => ctx.fill(V2.fx.brush(p, 15, { taper: [0.85, 0.0, 0.05, 0.7] })));
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#FFFFFF'; ctx.fill(core); ctx.restore();
  }

  // ------------------------------------------------------------------ type
  // open-half captions on the light sky (LOOK 2.11): a deep shadow-halo carries the contrast; the core is pre-lit and
  // blazes to 1.0 on its onset. On these bright grounds the pre-lit level is 0.66 (0.55 measured 1.4 to 2.2:1, under the
  // 3.0:1 pre-lit gate), and the blaze is made visible by the halo: pre-lit words carry it at 75%, a blazing word gets a
  // wider, full-strength halo for its 4 blaze frames (a punch of contrast exactly on the onset frame), then 95%.
  function prelitLight(ctx, t, spec, o = {}) {
    const m = V2.type.measure(ctx, t, spec);
    const a = spec.alpha ?? 1;
    if (a <= 0) return m.words;
    if (o.pane) V2.shade(ctx, o.pane.rect || V2.type.box(m.words, o.pane.pad ?? 70), o.pane.hex || '#0A3F8F', o.pane.a * a);
    const L = spec.id ? spec.id : { word_t: spec.word_t };
    const lit = spec.lit || V2.lit(t, L, 'prelit-blaze', { pre: o.pre ?? 0.66 });
    const st = lit.state || [], hA = (o.shadowA ?? 0.95) * a, col = o.halo || '#0B2A7A';
    const base = m.words.map(W => st[W.i] === 'prelit' ? 0.75 : st[W.i] === 'blaze' ? 0 : 0.95);
    V2.type.shadowHalo(ctx, m.words, base, col, hA);
    if (st.some(x => x === 'blaze')) V2.type.shadowHalo(ctx, m.words, m.words.map(W => st[W.i] === 'blaze' ? 1 : 0), col, Math.min(1, hA * 1.1), { sw: 0.17, blur: 4 });
    return V2.type.light(ctx, t, Object.assign({}, spec, { haloMode: 'glow', haloA: 0, halo: col, lit }));
  }
  // C3: "you are the" right-aligned and "sky" left-aligned on one line at y 420; "sky" widens its tracking while it holds
  function c3(ctx, t, wipe) {
    if (t >= 28.4 + 0.25) return;
    const size = 132, y = 420, gap = 34;
    const track = 9 * E.inOutSine(R(t, 25.9, 28.4));
    const a = 1 - E.smooth(R(t, 28.4, 28.65));
    ctx.save(); ctx.font = V2.type.font('sung', size); const wL = ctx.measureText('you are the').width, wR = ctx.measureText('sky').width; ctx.restore();
    const xs = 540 - (wL + gap + wR + 2 * 9) / 2 + wL + gap / 2;
    const spec = { id: 'C3', kind: 'sung', alpha: a, rows: [{ n: 3, size, y, align: 'right', x: xs - gap / 2, fit: false }, { n: 1, size, y, align: 'left', x: xs + gap / 2, fit: false, track }] };
    const m = V2.type.measure(ctx, t, spec);
    // on the jewel's gold (24.0, before the sky reaches the line) the shadow-halo is deep rose, then the sky's deep blue
    const halo = V2.mixHexSat('#7A1240', '#0B2A7A', wipe);
    return prelitLight(ctx, t, spec, { halo, pane: { rect: [m.box[0] - 70, m.box[1] - 64, m.box[2] + 70 + 2 * track, m.box[3] + 60], hex: V2.mixHexSat('#7A1240', '#0A3F8F', wipe), a: 0.56 } });   // (integration: a wider pane, contrast)
  }
  // typed mono readout in white with a deep outline (on the bright sky)
  function monoTyped(ctx, t, text, x, y, o) {
    if (t < o.t0 || t >= o.t1 + 0.25) return;
    const n = Math.min(text.length, Math.floor((t - o.t0) * (o.cps || 40) + 1e-6));
    const a = (1 - E.smooth(R(t, o.t1, o.t1 + 0.25))) * (o.a ?? 1);
    return A.monoOutlined(ctx, text.slice(0, n), x, y, { size: o.size, a, col: o.col, outline: o.outline });
  }
  // the four light-line viewfinder brackets (26.25): "you (all of this)". The top pair sits at y 130, under the watermark.
  function brackets(ctx, t) {
    if (t < 26.25 || t > 30.1) return;
    const p = E.outCubic(R(t, 26.25, 26.25 + 8 / 30)), a = 1 - E.smooth(R(t, 29.8, 30.1));
    const I = 60, IT = 130, L = 120;
    const cs = [[I, IT, 1, 1], [1080 - I, IT, -1, 1], [I, 1350 - I, 1, -1], [1080 - I, 1350 - I, -1, -1]];
    cs.forEach(([x, y, sx, sy]) => {
      const pts = [[x, y + sy * L * p], [x, y], [x + sx * L * p, y]];
      V2.lightLine(ctx, pts, { core: '#FFFFFF', halo: '#FF9ACB', w: 5.5, alpha: a, taper: [0.15, 0.5, 0.15, 0.5], ga: 0.7 });
    });
  }
  // the light rim on the edge of the opening hole (24.0)
  function openRim(ctx, cx, cy, r, a) {
    if (r <= 2 || a <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#FFF3C4'; ctx.lineWidth = 4; ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); ctx.restore();
    V2.glow(g => { g.globalAlpha = 0.7 * a; g.strokeStyle = '#FF8FC0'; g.lineWidth = 16; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); });
  }
  // the badge's glow as a cached sprite
  let badgeSpr = null;
  function badgeSprite() {
    if (badgeSpr) return badgeSpr;
    const cv = document.createElement('canvas'); const g = cv.getContext('2d'); g.font = '600 46px "JBM"';
    const w = Math.ceil(g.measureText('[exploit found]').width) + 16; cv.width = w; cv.height = 68;
    g.font = '600 46px "JBM"'; g.fillStyle = '#39FF88'; g.textBaseline = 'alphabetic'; g.fillText('[exploit found]', 8, 50);
    badgeSpr = { cv, w, h: 68 };
    return badgeSpr;
  }

  // ------------------------------------------------------------------ the frame
  S.draw = function (t, ctx) {
    const c = S.cam(t);
    const hack = t >= 32.9;
    const G = himGeo(t, c);
    const cS = toS(c, cloudW(t)), csc = CLOUD_SC * c.k;
    const oR = openR(t), opening = t < 24.45 + 1 / 30;
    const wipe = clamp((oR - 500) / 300);                      // the hole has passed the caption
    const dCloud = Math.hypot(cS[0] - G.cx, cS[1] - G.cy);
    const cloudA = (1 - E.smooth(R(t, 35.72, 35.95))) * (opening ? clamp((oR - dCloud + 60) / 220) : 1);
    const cl = V2.grab.cloudLens(cS[0], cS[1], csc, { alpha: cloudA });
    const orb = hack ? orbAt(t, G) : null;
    const ir = hack ? irisAt(t) : null;
    // the squiggles: family A draws on with "you" (from him, outward), family B with "are"; drift faster from 27.0
    const revA = E.outCubic(R(t, 24.0, 25.2)), revB = E.outCubic(R(t, 24.75, 25.75));
    const dv = 8 * (t - 24) + 12 * Math.max(0, t - 27);
    const drift = [dv * 0.8, -dv * 0.35];
    const hw = himW(t);
    // the beams from him: extend with "the" and "sky", breathe on the beats from 27.0
    const bLen = (260 + 220 * E.outCubic(R(t, 24.0, 24.6)) + 240 * E.outCubic(R(t, 25.5, 25.8)) + 380 * E.outCubic(R(t, 25.875, 26.4))) * c.k;
    const bp = t >= 27 ? (() => { const b = V2.beat(t); return Math.exp(-b.ph * 0.75 / 0.18); })() : 0;
    const bAlpha = 0.10 * (1 + 0.9 * bp) * (hack ? 1 - 0.5 * (ir ? ir.close : 0) : 1);
    const capR = t < 28.5 ? [80, 330, 1000, 500] : t < 30 ? [140, 1020, 940, 1130] : t < 32.9 ? [80, 150, 1000, 380] : [70, 170, 1010, 560];
    const zones = [{ rect: capR, pad: 30 }, { ell: [G.cx, G.cy, G.bw * 1.25, G.bh * 1.2] }];
    const u = Object.assign({
      uCam: [c.k, c.sc[0] - hw[0] * c.k, c.sc[1] - hw[1] * c.k, 0],
      uSkyK: [E.smooth(R(t, 29.6, 30.4)), bAlpha, bLen, hack && ir && !ir.open ? -0.9 * ir.close * (1 - 0.5 * ir.trem) : 0],
      uSkyK2: [0.80, 1.25, 0, 1.0],
      uOpen: [G.cx, G.cy, oR, opening ? 1 : 0],
      uHack: [ir ? 0.32 * ir.close : 0, 0, 0, 0],
      uDrift: [drift[0], drift[1], hack ? (t < 35.41 ? E.smooth(R(t, 33.1, 34.05)) : 1 - E.smooth(R(t, 35.41, 35.7))) : 0, ir ? ir.R * 1.9 : 0],
      uHim: [G.cx, G.cy, G.bw, G.bh],
      uSq: [320 * c.k, 5, 2, 1.27], uSqI: [0.92, 0.9, 0.85, 0], uSqRev: [revA, revB, hw[0] + drift[0], hw[1] + drift[1]],
      // a glass ball shows the world behind it minified and bent (negative lens: more squiggles packed in, curving)
      uLens: -0.6, uTint: 0.6,
    }, ripU(t), cl, V2.grab.uniforms(G.H.L, MOOD, { k: G.H.ck, ox: G.H.p[0], oy: G.H.p[1] }), V2.L.calm(zones, { floor: 0.14, feather: 50, ellFloor: 0.45 }));
    if (hack) Object.assign(u, ir ? V2.hook.irisUniforms(ir.C, ir.R, ir.tw, { cols: HACK9, alpha: 0.6, flood: 0.6, deep: 0.6, falloff: 520, C: [0.34, 0.75, 0.62, 120], glLead: 3 }) : V2.hook.irisUniforms([540, 675], 4000, 0, { cols: HACK9, alpha: 0 }));
    V2.L.pane('sky', 'a2_sky_pane');
    const expo = t >= 35.75 ? 1 + 0.30 * E.inCubic(R(t, 35.75, 35.967)) : 1;
    const DBG = window.a2_DBG || {};
    const ow = opening ? clamp(oR / 1350) : 1;
    if (!DBG.noGL) V2.L.render(hack ? 'a2_hack' : 'a2_sky', u, { bloomK: lerp(0.10, 0.22, ow), thresh: lerp(0.98, 0.82, ow), levels: hack ? 3 : 4, sat: lerp(1.10, 1.08, ow), vig: lerp(0.12, 0.22, ow), vigCol: V2.mixHexSat('#3A1A6E', '#0B3A9A', ow), bleed: 0.2, grain: lerp(0.022, 0.018, ow), expo });

    // ---- crisp
    if (DBG.noCrisp) return;
    // dev assert: the waving hand keeps clear of the cloud (it is never held, LOOK 2.8 / 3.3)
    if (V2.DEV && t >= 28.45 && t < 30.4) { const gap = S.cloudGap(t); if (gap < 150) console.warn('a2_sky: hand within ' + Math.round(gap) + ' px of the cloud at t=' + t.toFixed(3)); }
    if (!opening || oR > 300) landscape(ctx, t, c);
    if (cloudA > 0) { V2.camera(ctx, [c.k, 0, 0, c.k, cS[0], cS[1]]); V2.grab.cloud(ctx, t, 0, 0, CLOUD_SC, { alpha: cloudA, boost: 1.0 }); V2.camera(ctx, null); }
    if (ir && !DBG.noIris2d) {
      const lf = ir.open ? 0.9 * (1 - R(t, 35.41, 35.41 + 9 / 30)) : 0;
      const cut = [[G.cx, G.cy, G.bw * 1.02, G.bh * 1.02]];
      V2.hook.irisCrisp(ctx, ir.C, ir.R, ir.tw, { cols: HACK9, flood: 0.6, leadW: 4, leadA: 0.6, flash: lf, flashCut: cut, cut, dashes: false, lines: false, lips: true, stop: [[0, 0, 1080, 380], [80, 360, 1000, 570]], glints: true, t, k: 1 });   // (integration: A2-5 lips back, kept off the type)
      // the aperture as a ring of light, closing on the orb (and flying open)
      const ap = V2.hook.aperture(ir.C, ir.R, ir.tw);
      const ring = V2.P.path(ap, true), ra = ir.open ? 1 - R(t, 35.41, 35.41 + 6 / 30) : E.smooth(R(t, 32.95, 33.3));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#FFFFFF'; ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.globalAlpha = 0.9 * ra; ctx.stroke(ring); ctx.restore();
      // (its glow stays out of the caption block, so the chip and the badge never wash out)
      V2.glow(g => { g.save(); g.beginPath(); g.rect(0, 390, 1080, 960); g.clip(); g.globalAlpha = 0.6 * ra; g.strokeStyle = '#3DF5FF'; g.lineWidth = 14; g.lineJoin = 'round'; g.stroke(ring); g.restore(); });
      // flying open: 2-frame motion streaks of the leading edges, white glints
      if (ir.open) {
        const ghosts = [1, 2].map(d => irisAt(t - d / 30)).filter(Boolean);
        ghosts.forEach((gi, j) => {
          const ed = V2.hook.edges(gi.C, gi.R, gi.tw, 0.35 * gi.R);
          V2.P.glints(ctx, V2.P.cutSegs(ed.map(e => ({ p: e.p, a: 1, w: 3 })), cut), { a: (0.55 - 0.2 * j) * lf, w: 3 - j });
        });
      }
    }
    if (t >= 30.0 - 0.6 && t < 34.3) taggedArrows(ctx, t, c, G);
    if (t >= 34.4 && t < 35.65 && !DBG.noVolley) volley(ctx, t);
    // the volley's celesta: one spark per note on the blade tips (the iris frozen at 35.4 once it flies open)
    if (t >= 34.45 && t < 35.55) {
      const ii = t < 35.41 ? ir : irisAt(35.40);
      if (ii) for (let k = 0; k < 8; k++) {
        const tn = 34.5 + k * 0.11, a = ii.tw + (k * 2.3 + 0.5) * TAU / 9, rr = ii.R * 1.05;
        V2.fx.sparks(ctx, t, tn, ii.C[0] + Math.cos(a) * rr, ii.C[1] + Math.sin(a) * rr, ['#FFFFFF', k % 2 ? '#FF9ACB' : '#A6FFE9'], { r: 60 });
      }
    }
    // him
    const face = himFace(t, orb, G);
    if (!DBG.noHim) { V2.camera(ctx, G.H.m); V2.grab.draw(ctx, G.H.L, MOOD, face, { glass: 'gl' }); offLine(ctx, t, G.H.L, G.H.ck); V2.camera(ctx, null); }
    // the orb (jhana?): drifts in from the left, waits in the aperture, lands in his palm by itself on the ting
    if (orb) {
      const landed = t >= 35.6;
      const lit = 1 + 0.4 * V2.hit(t, 35.6, 0.25) + 0.5 * E.inCubic(R(t, 35.75, 35.967));
      const orR = ORB_R * (landed ? 1 : lerp(1.45, 1, R(t, 35.41, 35.6)));
      const br = E.inCubic(R(t, 35.75, 35.967)), gR = orR * (2.2 + 2.2 * br);
      V2.glow(g => { g.globalAlpha = Math.min(0.8, 0.5 + 0.2 * br); const hg = g.createRadialGradient(orb[0], orb[1], orR * 0.5, orb[0], orb[1], gR); hg.addColorStop(0, '#FFC861'); hg.addColorStop(0.45, '#FF9A1F'); hg.addColorStop(1, 'rgba(255,122,26,0)'); g.fillStyle = hg; g.beginPath(); g.arc(orb[0], orb[1], gR, 0, TAU); g.fill(); });
      if (br > 0.01) {
        const rp = new Path2D(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + 0.2, r0 = orR * 1.3, r1 = orR * (1.6 + 2.6 * br * (0.6 + 0.4 * hash(i * 3.1))); rp.moveTo(orb[0] + Math.cos(a) * r0, orb[1] + Math.sin(a) * r0); rp.lineTo(orb[0] + Math.cos(a) * r1, orb[1] + Math.sin(a) * r1); }
        V2.post(cx => { cx.save(); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = 0.8 * br; cx.strokeStyle = '#FFE6A0'; cx.lineCap = 'round'; cx.lineWidth = 4; cx.stroke(rp); cx.restore(); });
      }
      V2.post(cx => V2.grab.orb(cx, t, orb[0], orb[1], orR, { lit: Math.min(lit, 1.2) }));
      V2.fx.sparks(ctx, t, 35.6, orb[0], orb[1], ['#FFFFFF', '#FFC861'], { r: 70 });
      if (t >= 34.5 && t < 35.9) {         // the label rides the orb, all the way into his palm
        const a = E.smooth(R(t, 34.5, 34.62)) * (1 - E.smooth(R(t, 35.56, 35.66)));     // (final pass) gone as the orb lands, never on his body
        // (integration) during the flight over his head the label swings to the orb's left, so it never sits on his face
        const fl = E.smooth(R(t, 35.30, 35.42)) * (1 - E.smooth(R(t, 35.58, 35.68)));
        A.monoOutlined(ctx, 'jhana?', orb[0] + lerp(-66, -orR * 1.45 - 168, fl), orb[1] + lerp(orR * 1.45 + 52, 14, fl), { size: 40, col: '#FFE9A0', a, outline: '#0B1F5C' });
      }
    }
    // ---- the opening's rim
    if (opening) openRim(ctx, G.cx, G.cy, oR, 1 - E.smooth(R(t, 24.32, 24.45)));
    // ---- type
    if (DBG.noType) return;
    c3(ctx, t, opening ? wipe : 1);
    if (t >= 26.2 && t < 26.6) V2.fx.sparks(ctx, t, 26.25, 920, 360, ['#FFFFFF', '#9FE8FF'], { r: 80 });
    brackets(ctx, t);
    monoTyped(ctx, t, 'you (all of this)', 100, 196, { t0: 26.4, t1: 29.8, size: 40, cps: 40 });
    if (t >= 27.2 && t < 29.7) {
      // beside him, on the side away from the waving arm; it fades before it would reach the frame edge or his body
      // (final pass) 44 px on a dark glass chip like the arrow tags: the joke reads in a 300 px timeline embed
      ctx.save(); ctx.font = '500 44px "JBM"'; const wT = ctx.measureText('grabbygrab').width; ctx.restore();
      const xr = G.cx - G.bw - 34, y = G.cy - 10, room = clamp((xr - wT - 50) / 40);
      const o = { t1: 29.45, size: 44, cps: 40, a: room };
      if (room > 0) {
        const ca = room * E.outBack(R(t, 27.2 - 2 / 30, 27.2 + 2 / 30)) * (1 - E.smooth(R(t, 29.45, 29.7)));
        if (ca > 0.01) {
          const x0 = xr - wT - 18, y0 = y - 46, cw = wT + 36, ch = 112;
          if (V2.QA && V2.QA.exclude) V2.QA.exclude.push([x0 - 10, y0 - 10, x0 + cw + 10, y0 + ch + 10]);
          ctx.save(); ctx.globalAlpha = Math.min(1, ca); ctx.fillStyle = V2.rgba('#0B1F5C', 0.70); ctx.beginPath(); ctx.roundRect(x0, y0, cw, ch, 14); ctx.fill();
          ctx.strokeStyle = V2.rgba('#9FE8FF', 0.55); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        }
        monoTyped(ctx, t, 'grabbygrab', xr - wT, y, Object.assign({ t0: 27.2 }, o)); monoTyped(ctx, t, '(off duty)', xr - wT, y + 50, Object.assign({ t0: 27.45 }, o));
      }
    }
    // every caption pane first, then the words (a later pane must never dim an earlier caption's words)
    const caps = [['V16', [{ n: 4, size: 90, y: 1080 }], 'light', 28.5, 30.0, 0.86, 110, 0.82], ['V17', [{ n: 3, size: 90, y: 218 }], 'roman', 30.0, 32.3, 0.6, 90, 0.66], ['V18', [{ n: 4, size: 96, y: 322 }], 'light', 31.5, 32.75, 0.6, 90, 0.66]]
      .filter(q => t >= q[3] - 0.05 && t < q[4] + 0.2);
    caps.forEach(q => { const a = 1 - E.smooth(R(t, q[4], q[4] + 0.2)), m = V2.type.measure(ctx, t, { id: q[0], lower: true, kind: q[2], rows: q[1] }); V2.shade(ctx, V2.type.box(m.words, q[6]), '#0A3F8F', q[5] * a); });
    caps.forEach(q => prelitLight(ctx, t, { id: q[0], lower: true, kind: q[2], rows: q[1], alpha: 1 - E.smooth(R(t, q[4], q[4] + 0.2)) }, { pre: q[7], shadowA: 0.95 }));
    if (hack) hackType(ctx, t);
  };

  // ------------------------------------------------------------------ the reward hack's type
  // "the `reward hack`:" Fraunces roman 88 with "reward hack" as an inline-code chip (JBM 500 60 in a glass chip, typed
  // with a cursor, one character per frame from each word's onset frame) [32.90, 32.99, 33.50]; "[exploit found]" badge
  // (33.00); "don't close, / not even for this." (34.05)
  function hackType(ctx, t) {
    const Y = 236;
    const fr = w => Math.round(t * 30) - Math.round(w * 30);
    if (t < 33.9 + 0.2) {
      const a = 1 - E.smooth(R(t, 33.9, 34.1));
      const L = V2.line('V19');
      ctx.save(); ctx.font = V2.type.font('roman', 88); const wThe = ctx.measureText('the').width, sp = ctx.measureText(' ').width;
      ctx.font = '500 60px "JBM"'; const chipTxt = 'reward hack', wChip = ctx.measureText(chipTxt).width; ctx.restore();
      const pad = 22, cw = wChip + 2 * pad, tot = wThe + sp + cw + 6 + 30, x0 = 540 - tot / 2;
      V2.shade(ctx, [x0 - 40, Y - 70, x0 + tot + 40, Y + 60], '#0A3F8F', 0.40 * a);
      prelitLight(ctx, t, { words: ['the'], word_t: [L.word_t[0]], kind: 'roman', alpha: a, rows: [{ n: 1, size: 88, y: Y, align: 'left', x: x0, fit: false }] });
      // the chip pops in between "the" and "reward" (3 frames), so the first letter is typed at full size on its onset
      const cp = E.outBack(R(t, L.word_t[1] - 3 / 30, L.word_t[1]));
      if (cp > 0) {
        const cx = x0 + wThe + sp, cy = Y - 4, ch = 82;
        if (V2.QA && V2.QA.exclude) V2.QA.exclude.push([cx - 16, cy - ch / 2 - 16, cx + cw + 16, cy + ch / 2 + 16]);   // (integration, A2-6) the chip is not the ground
        ctx.save(); ctx.globalAlpha = a; ctx.translate(cx + cw / 2, cy); ctx.scale(cp, cp); ctx.translate(-(cx + cw / 2), -cy);
        ctx.fillStyle = V2.rgba('#0B1F5C', 0.72); ctx.beginPath(); ctx.roundRect(cx, cy - ch / 2, cw, ch, 18); ctx.fill();
        ctx.strokeStyle = '#3DF5FF'; ctx.lineWidth = 3; ctx.stroke();
        const f1 = fr(L.word_t[1]), f2 = fr(L.word_t[2]);
        const n1 = f1 >= 0 ? Math.min(7, f1 + 1) : 0, n2 = f2 >= 0 ? Math.min(4, f2 + 1) : 0;
        const s = chipTxt.slice(0, n1) + chipTxt.slice(7, 7 + n2);
        ctx.font = '500 60px "JBM"'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#E8F7FF'; ctx.fillText(s, cx + pad, cy + 20);
        const typing = s.length < chipTxt.length, since = t - (L.word_t[2] + 4 / 30);
        if (typing || Math.floor(since / 0.25) % 2 === 0) { ctx.fillStyle = '#3DF5FF'; ctx.globalAlpha = 0.85 * a; ctx.fillRect(cx + pad + ctx.measureText(s).width + 4, cy - 26, 30, 52); }
        ctx.restore();
        V2.glow(g => { g.globalAlpha = 0.6 * a; g.strokeStyle = '#3DF5FF'; g.lineWidth = 10; g.beginPath(); g.roundRect(cx, cy - ch / 2, cw, ch, 18); g.stroke(); });
        if (f2 >= 4) prelitLight(ctx, t, { words: [':'], word_t: [L.word_t[2] + 4 / 30], kind: 'roman', alpha: a, rows: [{ n: 1, size: 88, y: Y, align: 'left', x: cx + cw + 6, fit: false }] });
      }
    }
    // the badge: "[exploit found]" in #39FF88 with a blinking block cursor, on a dark glass chip, under the chip line
    if (t >= 33.0) {
      const p = E.outBack(R(t, 33.0, 33.0 + 4 / 30)), a = 1 - E.smooth(R(t, 35.75, 35.95));
      const bs = badgeSprite(), w = bs.w - 16;
      const x = 540 - (w + 40) / 2, y = 318;
      if (V2.QA && V2.QA.exclude) V2.QA.exclude.push([x - 30, y - 50, x + w + 68, y + 50]);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(540, y); ctx.scale(p, p); ctx.translate(-540, -y);
      ctx.fillStyle = V2.rgba('#0B1F5C', 0.74); ctx.beginPath(); ctx.roundRect(x - 14, y - 34, w + 66, 68, 13); ctx.fill();
      ctx.font = '600 46px "JBM"'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#39FF88'; ctx.fillText('[exploit found]', x, y + 16);
      if (Math.floor((t - 33.0) / 0.3) % 2 === 0) ctx.fillRect(x + w + 8, y - 21, 25, 41);
      ctx.restore();
      if (p > 0.05) V2.glow(g => { g.globalAlpha = 0.5 * a * Math.min(1, p); g.drawImage(bs.cv, 540 + (x - 8 - 540) * p, y + (y - 50 - y) * p, bs.w * p, bs.h * p); });
    }
    // "don't close, / not even for this."
    if (t >= 34.0 && t < 35.7 + 0.2) {
      const a = 1 - E.smooth(R(t, 35.7, 35.9));
      prelitLight(ctx, t, { id: 'V20', lower: true, kind: 'roman', alpha: a, rows: [{ n: 2, size: 88, y: 424 }, { n: 4, size: 88, y: 520 }] }, { pane: { a: 0.75, hex: '#0A3F8F' }, pre: 0.7 });
    }
  }
})();
