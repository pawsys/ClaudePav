// ACT 2, 18.0 to 24.0: LOOK ("one wavelength") and UN-CLENCH ("dawn burst"). LOOK.md 4, 2.7, 2.9, 3.1, 3.3.
// One continuous macro shot of his fist (about 700 px). The dark behind it is the closed iris; the viewer's attention
// is one warm beam from the top edge. Nothing pries the fingers: at 21.0 the thumb opens and the fist breathes, the iris
// lights up as dawn glass and opens (the dawn is revealed inside its aperture, never faded in); at 21.75 the fingers open
// one after another and the crust cracks into glass shards; at 22.25 the jewel blazes and the dawn rays leave the palm
// through it; the type unclenches (Anton tubes go dark, "unclench." writes itself in light); 22.5 to 24.0 the camera
// flies into the jewel until its warm bands fill the frame.
(function () {
  const V2 = window.V2, U = V2.U, A = window.a2_NS;
  const { clamp, lerp, hash, TAU } = U;
  const E = A.ease, R = A.range;
  const L = A.look = {};

  // ------------------------------------------------------------------ palette (2.7 LOOK / UNCLENCH)
  // (ordered so the blades that pass behind the caption while the iris opens, 4 to 7, are the cool and deep ones:
  // the warm lemon and apricot glass gathers round the hand, the top third stays deep for the tubes)
  const DAWN9 = ['#FFE66B', '#FF9F43', '#FF5FA2', '#FFE66B', '#6FE3FF', '#C77DFF', '#FF5FA2', '#C77DFF', '#FF9F43'];
  // the closed iris in the dark: deep indigo and violet glass (never a darkened lemon: that is olive)
  const DARK9 = ['#22125E', '#2A1468', '#1C1056', '#301672', '#24125E', '#2C1466', '#1E1058', '#32186E', '#261462'];
  const FAN5 = ['#FFE66B', '#FF9F43', '#FF5FA2', '#C77DFF', '#6FE3FF'];      // thumb, index, middle, ring, pinky
  L.DAWN9 = DAWN9;

  // ------------------------------------------------------------------ the shot (screen px at camera k = 1)
  // (final pass) tilted 0.36 rad: the wrist enters from the lower left and the curl faces the beam (holding, not the
  // raised-fist icon of the upright pose), shifted left so the fist's mass stays centred under the beam
  const H0 = [524, 1000], HS = 880, ANG0 = -Math.PI / 2 + 0.36;      // the fist: centre, hand size, pointing up-right
  const APEX = [500, -1250];                                           // the beam's source, far above the top edge
  // the knot sits IN the curl: centred a little under the knuckle line, so only a crescent (about 28%) rises above the
  // knuckles; the rest is seen through the glass fingers and in the gaps between them
  const KNOT_L = [0.228, 0.0], KNOT_R = 146;     // R <= 150 at every camera k: the crust shell uses the 128 px reference sprite
  const PALM_L = [0.02, 0.0];                                          // the jewel's seat in the open palm (hand-local)
  const JR = 84;                                                       // jewel radius (screen, k = 1)

  // ------------------------------------------------------------------ timeline (pure functions of t)
  const beamOn = t => A.step(t, 18.40);
  // finger levels [thumb, index, middle, ring, pinky]. On "un" (21.0) only the thumb opens and the four curled fingers
  // loosen together by 20% (a breath in the fist: crust shows between them). On "clench" (21.75) index, middle, ring,
  // pinky open one after another (100 ms stagger, 0.2 s each), all out by 22.25 so the hand is fully open for the jewel.
  // No single finger ever leads (no pointing, V or count pose).
  const fingers = t => {
    const br = 0.2 * E.smoother(R(t, 21.0, 21.4));
    return [E.smoother(R(t, 21.0, 21.30))].concat([0, 0.10, 0.20, 0.30].map(d => br + (1 - br) * E.smoother(R(t, 21.75 + d, 21.95 + d))));
  };
  const openK = t => { const f = fingers(t); return (f[1] + f[2] + f[3] + f[4]) / 4; };
  // the camera: a slow breath while looking, then 22.5 to 23.86 the fly-through into the jewel
  L.camK = t => {
    if (t < 22.5) return 1 + 0.025 * E.inOutSine(R(t, 18.4, 22.5));
    const a = Math.log(1.025) + Math.log(1.12) * E.inOutSine(R(t, 22.5, 23.45));
    return Math.exp(a + Math.log(32) * E.inCubic(R(t, 23.40, 23.86)));
  };
  // iris: closed behind the fist until 21.0, retracts outward to past the frame edges by 22.45 (unwinding)
  const irisR = t => lerp(150, 1750, E.inOutCubic(R(t, 21.0, 22.45)));
  const irisTw = t => 0.30 + 0.04 * V2.osc(t, 10) - 0.85 * E.inOutCubic(R(t, 21.0, 22.45));
  // the flood at the end of the fly-in: the jewel's own warm bands, centred where the sky will open (on him at 24.0)
  const FLOOD_SC = 1000;

  // the macro hand (3.1, redrawn for a 700 px close-up). Closed: a rounded palm, four curled fingers seen from the
  // front as rounded bars side by side (their tops are the knuckles), the thumb lying across them. Open: the core's
  // open hand (four splayed capsules + thumb). Each finger morphs from its curled bar to its open capsule.
  const KY = [-0.168, -0.056, 0.056, 0.168], OPEN_A = [-0.55, -0.18, 0.18, 0.52], OPEN_L = [0.42, 0.48, 0.45, 0.36], OPEN_R = [0.078, 0.082, 0.077, 0.066], OPEN_Y = [-0.15, -0.05, 0.05, 0.14];
  function macroHand(x, y, ang, hs, lv0) {
    const lv = lv0.map(v => Math.round(clamp(v) * 512) / 512);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const T = (lx, ly) => [x + (lx * ca - ly * sa) * hs, y + (lx * sa + ly * ca) * hs];
    const fo = (lv[1] + lv[2] + lv[3] + lv[4]) / 4;
    const palm = { c: T(-0.03, 0), hx: 0.21 * hs, hy: lerp(0.235, 0.22, fo) * hs, r: lerp(0.15, 0.17, fo) * hs, ang };
    const caps = [];
    { // thumb: across the front of the curled fingers -> splayed at -1.25 rad
      const e = lv[0];
      const ca0 = [0.06, -0.235], cb0 = [0.095, 0.06], oa = [0.02, -0.19], ob = [0.02 + Math.cos(-1.25) * 0.262, -0.19 + Math.sin(-1.25) * 0.262];
      const a = [lerp(ca0[0], oa[0], e), lerp(ca0[1], oa[1], e)], b = [lerp(cb0[0], ob[0], e), lerp(cb0[1], ob[1], e)];
      caps.push({ a: T(...a), b: T(...b), r: lerp(0.086, 0.08, e) * hs, la: a, lb: b, e, k: 'thumb' });
    }
    for (let i = 0; i < 4; i++) {
      const e = lv[i + 1];
      const a0 = [0.205, KY[i]], b0 = [0.035, KY[i]], a1 = [0.15, OPEN_Y[i]];
      const b1 = [a1[0] + Math.cos(OPEN_A[i]) * OPEN_L[i] * 0.82, a1[1] + Math.sin(OPEN_A[i]) * OPEN_L[i] * 0.82];
      const ee = E.inOutSine(e);
      const a = [lerp(a0[0], a1[0], ee), lerp(a0[1], a1[1], ee)], b = [lerp(b0[0], b1[0], ee), lerp(b0[1], b1[1], ee)];
      caps.push({ a: T(...a), b: T(...b), r: lerp(0.098, OPEN_R[i], ee) * hs, la: a, lb: b, e, k: 'f' + i });
    }
    // the separations between the curled fingers (from the notch down toward the thumb) and the thumb's upper edge
    const seps = [];
    for (let i = 0; i < 3; i++) { const yy = (KY[i] + KY[i + 1]) / 2, cl = 1 - Math.max(lv[i + 1], lv[i + 2]); if (cl > 0.02) seps.push({ p: [T(0.29, yy), T(0.105, yy)], a: cl, gap: 1 - cl }); }
    const thE = [];
    { const th = caps[0]; const dx = th.lb[0] - th.la[0], dy = th.lb[1] - th.la[1], dl = Math.hypot(dx, dy) || 1; let nx = -dy / dl, ny = dx / dl; if (nx < 0) { nx = -nx; ny = -ny; }
      const off = th.r / hs * 0.98; thE.push(T(th.la[0] + dx * 0.12 + nx * off, th.la[1] + dy * 0.12 + ny * off), T(th.la[0] + dx * 0.98 + nx * off, th.la[1] + dy * 0.98 + ny * off)); }
    return { x, y, ang, hs, lv, palm, caps, T, open: fo, seps, thumbEdge: thE, crease: thE };
  }
  // the knot's 12 Hz re-seeding slows under the beam (attention steadies it): 12 Hz until 18.4, easing to 3 Hz by 21.0.
  L.knotSeed = function (t) {
    const a = Math.min(t, 18.4) - 18.0, u = clamp((t - 18.4) / 2.6), b = 2.6 * (12 * u - 4.5 * u * u), c3 = Math.max(0, t - 21.0) * 3;
    return 2000 + Math.floor(12 * a + (t > 18.4 ? b : 0) + c3);
  };
  const knotSeed = L.knotSeed;
  // hand pose at t (screen, k = 1): handGeo + forearm + knot + jewel seat
  function pose(t) {
    const tr = 2.2 * (1 - R(t, 18.4, 21.0));
    const sd = V2.boil(t, 4);
    const ox = tr > 0 ? (hash(sd * 1.7) - 0.5) * 2 * tr : 0, oy = tr > 0 ? (hash(sd * 2.9 + 1) - 0.5) * 2 * tr : 0;
    const f = fingers(t);
    const h = macroHand(H0[0] + ox, H0[1] + oy, ANG0, HS, f);
    const wrist = h.T(-0.17, 0.01), elbow = h.T(-1.30, 0.06);
    const knot0 = h.T(KNOT_L[0], KNOT_L[1]), seat = h.T(PALM_L[0], PALM_L[1]);
    const mv = E.inOutSine(R(t, 21.05, 21.95));
    const knot = [lerp(knot0[0], seat[0], mv), lerp(knot0[1], seat[1], mv)];
    return { h, f, fore: { a: wrist, b: elbow, r: 0.168 * HS, name: 'fore' }, knot, seat, mv, key: f.map(v => Math.round(v * 512)).join(',') + '|' + ox.toFixed(2) + ',' + oy.toFixed(2) };
  }
  L.pose = pose;

  // ------------------------------------------------------------------ GL programs
  // a2_look (18.0 to 21.0: the beam, the dark iris, the dark glass fist) and a2_unc (21.0 to 24.0: the dawn revealed in
  // the opening aperture, palm fans, the jewel burst, the clear glass hand). One source, two programs: each phase
  // compiles only what it draws.
  const BANDS = `
// the jewel's warm light as concentric bands (the fly-in flood and the sky's opening): white-hot only in a small core,
// then lemon, apricot, rose, orchid, every stop under the tonemap shoulder so nothing clips to cream
vec3 bands(float r, float sc){
  float x=r/max(sc,1.);
  vec3 c=HX(199.,125.,255.)*.60;
  c=mix(c,HX(255.,95.,160.)*.68,smoothstep(1.30,.98,x));
  c=mix(c,HX(255.,150.,70.)*.74,smoothstep(.86,.62,x));
  c=mix(c,HX(255.,214.,90.)*.80,smoothstep(.54,.36,x));
  c=mix(c,HX(255.,246.,226.)*.95,smoothstep(.24,.12,x));
  return c; }
`;
  L.BANDS = BANDS;
  const LOOK_SRC = (U2) => BANDS + `
uniform vec4 uBeam;      // apex x, y, half-angle (rad), intensity
uniform vec4 uBeamK;     // axis angle, hairline bins (full circle), read-ray bins, top fade y
uniform vec4 uGnd;       // dawn scale (camera k, clamped), flood 0..1, flood band scale px, unused
uniform vec4 uGnd2;      // outer dawn ground rgb (linear), unused
uniform vec4 uFlood;     // flood centre x, y, unused x2
uniform vec4 uJw;        // jewel x, y (screen), jewel radius, leak glow
uniform vec4 uFan;       // palm rays: amount, length px, spread (rad), dash cycles per 60 s
uniform vec4 uFanD[5];   // per finger: dir x, dir y, weight, unused
uniform vec3 uFanC[5];   // per finger colour (linear)
uniform vec4 uHandK;     // open 0..1, beam rim light, refraction px, on 0..1
uniform vec4 uHandK2;    // finger tint (screen), fill #FFC9A3, smooth-union k px, unused
uniform vec4 uIrisK;     // iris on, iris light, unused x2
// the hand as ONE smooth union (palm box + 6 capsules, smooth min k px) with its analytic gradient: the refraction and
// rim light follow a continuous normal (no per-quad derivative steps). tint: the open fingers' own colours, screened.
float sdHS(vec2 P, out vec2 g, out vec3 tint){
  g=vec2(0.,-1.); tint=vec3(0.);
  if(uPalmR.w<.5) return 1e5;
  vec2 d=P-uPalm.xy, ax=uPalmR.xy, ay=vec2(-uPalmR.y,uPalmR.x);
  vec2 l=vec2(dot(d,ax),dot(d,ay));
  vec2 q=abs(l)-uPalm.zw+uPalmR.z; vec2 sg=vec2(l.x<0.?-1.:1.,l.y<0.?-1.:1.);
  float s; vec2 gl;
  if(q.x>0.&&q.y>0.){ s=length(q)-uPalmR.z; gl=q/max(length(q),1e-4)*sg; }
  else if(q.x>q.y){ s=q.x-uPalmR.z; gl=vec2(sg.x,0.); }
  else { s=q.y-uPalmR.z; gl=vec2(0.,sg.y); }
  g=gl.x*ax+gl.y*ay;
  float k=max(uHandK2.z,1.);
  for(int i=0;i<6;i++){
    if(uFingR[i]<=0.) continue;
    vec2 a=uFingA[i].xy, ba=uFingA[i].zw-a, pa=P-a;
    float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-4),0.,1.);
    vec2 v=pa-ba*h; float lv=max(length(v),1e-4);
    float c=lv-uFingR[i];
    ${U2 ? 'if(i<5) tint=screen(tint,uFanC[i]*clamp(.5-c/uPx,0.,1.));' : ''}
    float w=clamp(.5+.5*(c-s)/k,0.,1.);
    s=mix(c,s,w)-k*w*(1.-w); g=mix(v/lv,g,w);
  }
  return s; }
// one wavelength: the dim edge of the beam is rose (dim amber over indigo reads as brown), the body amber, the core pale gold
vec3 beamCol(float b){ return mix(HX(255.,84.,120.)*.75, mix(HX(255.,170.,80.),HX(255.,227.,163.),smoothstep(.55,1.,b)), smoothstep(.12,.6,b)); }
float coneM(vec2 P, out float body, out float r, out float a){
  vec2 d=P-uBeam.xy; r=length(d); a=atan(d.y,d.x);
  float da=a-uBeamK.x; da=atan(sin(da),cos(da));
  body=exp(-da*da/(uBeam.z*uBeam.z*.42));
  return smoothstep(uBeam.z,uBeam.z*.70,abs(da)); }
vec3 indigo(vec2 P){ return mix(HX(14.,8.,56.),HX(20.,12.,42.),smoothstep(300.,1100.,length(P-uJw.xy))); }
// dawn: soft concentric Hockney bands round the jewel (white-hot, lemon, apricot, rose, orchid, violet), deep beyond,
// so the top third stays a clean deep gradient for the type
vec3 dawn(vec2 P){
  float r=length(P-uJw.xy)/max(uGnd.x,1e-3);
  vec3 c=uGnd2.rgb;
  c=mix(c,HX(107.,63.,160.),smoothstep(700.,560.,r));
  c=mix(c,HX(170.,92.,235.),smoothstep(540.,440.,r));
  c=mix(c,HX(255.,95.,162.),smoothstep(425.,335.,r));
  c=mix(c,HX(255.,150.,60.),smoothstep(320.,245.,r));
  c=mix(c,HX(255.,226.,96.),smoothstep(230.,160.,r));
  c=mix(c,HX(255.,246.,230.)*1.15,smoothstep(120.,45.,r));
  return c; }
vec3 world(vec2 P, float cm){
  vec3 dk=indigo(P);
  vec3 c=${U2 ? 'dawn(P)' : 'dk'}, tint=vec3(1.);
  if(uIrisK.x>0.){ vec3 ic,top; float cov=iris(P,ic,top); ic*=uIrisK.y;
    // each pixel is either dawn (inside the aperture) or lit glass over the indigo (under a blade): never a fade between
    vec3 gl=mix(dk,ic,irisAlpha); c=mix(c,gl,cov*uIrisK.x);
    tint=mix(vec3(1.),top/max(max(top.r,top.g),max(top.b,1e-3)),cov*uIrisK.x); }
  if(uBeam.w>0.){
    float body,r,a; float cone=coneM(P,body,r,a);
    if(cone>0.){
      ${U2 ? 'vec2 h1=vec2(0.);' : 'vec2 h1=hair(r,a,uBeamK.y,3.,9000.,9500.,3.0);'}
      vec2 h2=hair(r,a+.0011,uBeamK.z,7.,9000.,9500.,6.);
      float topF=mix(.20,1.,smoothstep(uBeamK.w-200.,uBeamK.w+520.,P.y));
      vec3 b=(beamCol(body)*body*.30+beamCol(mix(body,1.,.5))*(h1.x*.26+h2.x*.58)*mix(.12,1.,cm))*cone*topF;
      c+=tintBy(b,tint)*uBeam.w;
    }
  }
  ${U2 ? `if(uFan.x>0.){
    vec2 dj=P-uJw.xy; float rj=length(dj), aj=atan(dj.y,dj.x);
    float ws=0.; vec3 fc=vec3(0.);
    vec2 uj=dj/max(rj,1e-3);
    for(int i=0;i<5;i++){ float w=exp(-2.*(1.-dot(uj,uFanD[i].xy))/(uFan.z*uFan.z))*uFanD[i].z; ws+=w; fc+=w*uFanC[i]; }
    fc=fc/max(ws,1e-3); float wk=min(ws,1.);
    vec2 h=hair(rj,aj,150.,11.,uFan.y*.75,uFan.y*1.25,7.);
    float near=smoothstep(uJw.z*.5,uJw.z*1.6,rj);
    vec3 fr=fc*h.x*mix(.10,1.,wk*wk)*near*1.15+fc*.05*wk*exp(-rj/max(uFan.y*.4,1.));
    c+=tintBy(fr,tint)*uFan.x*mix(.30,1.,cm);
  }` : ''}
  return c; }
void main(){
  vec2 P=canvasPx(vUv); float cm=calm(P);
  vec2 gr; vec3 tint;
  float sd=sdHS(P,gr,tint);
  float inH=smoothstep(uPx,-uPx,sd)*uHandK.w;
  vec2 nrm=gr/max(length(gr),1e-4);
  float rimz=smoothstep(-140.,0.,sd);
  vec2 Q=P-nrm*uHandK.z*rimz*inH;
  vec3 c=world(Q,cm);
  if(inH>0.){
    float op=uHandK.x;
    // looking: dark violet glass; only what the beam lights exists. The world seen through it keeps its value in the
    // glass's own violet (amber through violet would be brown), the rims catch the beam, the interior stays #1B1240..#3A1470
    float rimB=smoothstep(-70.,-4.,sd);
    vec3 hL=mix(HX(27.,18.,64.),HX(58.,20.,112.),rimB)+HX(150.,96.,255.)*min(lum(c),1.2)*.42;
    float body,r,a; float cone=coneM(P,body,r,a);
    vec2 Lb=normalize(P-uBeam.xy);
    float face=max(dot(nrm,-Lb),0.);
    float rim=smoothstep(-44.,-3.,sd)*pow(face,1.3);
    float sss=exp(sd/30.)*face;
    hL+=HX(255.,217.,160.)*(rim*1.25+sss*.30)*cone*mix(.4,1.,body)*uBeam.w*uHandK.y;
    hL+=HX(255.,170.,92.)*uJw.w*exp(-length(P-uJw.xy)/(uJw.z*2.0))*.8;
    ${U2 ? `// open: clear glass. The dawn and the palm fans pass through it (refracted), a light #FFC9A3 fill, each finger
    // screened with its own fan colour (overlaps at the roots make new colours), a rose-white rim lit from the jewel
    vec2 Lj=normalize(P-uJw.xy); float back=max(dot(nrm,Lj),0.);
    vec3 hO=c*mix(vec3(1.),HX(255.,214.,232.),.30);
    hO=mix(hO,HX(255.,201.,163.),uHandK2.y);
    hO=screen(hO,tint*uHandK2.x);
    hO+=HX(255.,160.,205.)*smoothstep(-30.,-2.,sd)*(.3+.7*back)*.30;
    vec3 h=mix(hL,hO,op);` : 'vec3 h=hL;'}
    c=mix(c,h,inH);
  }
  ${U2 ? 'c=burst(P,c);' : ''}
  c=mix(c,bands(length(P-uFlood.xy),uGnd.z),uGnd.y);
  o=vec4(c,1.); }`;
  V2.L.program('a2_look', ['PANE', 'HAND_SDF', 'RAYS', 'IRIS', 'CALM'], LOOK_SRC(false));
  V2.L.program('a2_unc', ['PANE', 'HAND_SDF', 'RAYS', 'IRIS', 'BURST', 'CALM'], LOOK_SRC(true));

  // ------------------------------------------------------------------ type
  // "don't let go. / just look." (Fraunces italic 92, "look." in 700 italic), y 196 / 306
  function v13Spec(ctx) {
    const size = 92;
    ctx.save(); ctx.font = V2.type.font('light', size); const wJust = ctx.measureText('just').width, sp = ctx.measureText(' ').width;
    ctx.font = V2.type.font('sung', size); const wLook = ctx.measureText('look.').width; ctx.restore();
    const x0 = 540 - (wJust + sp + wLook) / 2;
    return { id: 'V13', lower: true, rows: [{ n: 3, size, y: 196, kind: 'light' }, { n: 1, size, y: 306, kind: 'light', align: 'left', x: x0, fit: false }, { n: 1, size, y: 306, kind: 'sung', align: 'left', x: x0 + wJust + sp, fit: false }] };
  }
  // "UN" "CLENCH" as neon tubes, one row per letter so they can drift apart and go dark one by one
  const UNC = 'UNCLENCH'.split(''), UN_SIZE = 150, UN_Y = 250;
  function unLetters(ctx, t) {
    ctx.save(); ctx.font = V2.type.font('neon', UN_SIZE);
    const w = UNC.map(c => ctx.measureText(c).width), gap = ctx.measureText(' ').width * 0.9;
    ctx.restore();
    const drift = 0.30 * UN_SIZE * E.inOutSine(R(t, 21.9, 22.32));     // +0.3 em between letters
    const tot = w.reduce((a, b) => a + b, 0) + gap + drift * (UNC.length - 1);
    let x = 540 - tot / 2;
    return UNC.map((c, i) => { const r = { words: [c], size: UN_SIZE, y: UN_Y, align: 'left', x, fit: false }; x += w[i] + drift + (i === 1 ? gap : 0); return r; });
  }
  // the tubes go dark letter by letter (21.92 + 35 ms each) and then fade out completely, so the light-writing that starts
  // at 22.3 never writes over their ghosts
  const tubeDark = i => 21.92 + i * 0.035;
  let unCache = null;
  function unclenchType(ctx, t) {
    const C = V2.line('C2');
    if (t >= 21.0 - 0.1 && t < 22.45) {
      // ignite: UN at 21.0, CLENCH at 21.75 (unlit glass before, in the warm white of the tubes, never mauve)
      const on = UNC.map((_, i) => i < 2 ? C.word_t[0] : C.word_t[1]);
      const lv = V2.lit(t, { word_t: on }, 'unlit-ignite');
      const off = UNC.map((_, i) => E.smooth(R(t, tubeDark(i), tubeDark(i) + 0.08)));
      const gone = UNC.map((_, i) => E.smooth(R(t, tubeDark(i) + 0.05, tubeDark(i) + 0.12)));
      const rows = unLetters(ctx, t);
      // on the lit dawn blades the tubes get a deep shadow-halo (LOOK 2.11: light ground -> deep halo), so the white
      // cores and the unlit outlines read over lemon and apricot glass
      const shA = 0.85 * (1 - E.smooth(R(t, 22.0, 22.3)));
      if (t >= 21.0 && shA > 0) { const mw = V2.type.measure(ctx, t, { words: UNC, rows, kind: 'neon' }); V2.type.shadowHalo(ctx, mw.words, UNC.map((_, i) => 1 - gone[i]), '#3A0A4E', shA, { sw: 0.16, blur: 4 }); }
      UNC.forEach((ch, i) => {
        const a = 1 - gone[i]; if (a <= 0) return;
        const lit = [lv[i] * (1 - off[i])]; lit.halo = [lv.halo[i] * (1 - off[i])];
        V2.type.neon(ctx, t, { words: [ch], word_t: [on[i]], rows: [rows[i]], lit, core: '#FFF6E6', halo: '#FF3D9A', haloA: 0.62, haloFill: 0.55, rim: '#FF8FC0', unlit: '#FFF6E6', unlitCore: '#FFF6E6', alpha: a, upper: true });
      });
    }
    if (t >= 22.3 && t < 23.75) {
      const prog = E.inOutSine(R(t, 22.3, 22.98));
      const fill = R(t, 22.98, 22.98 + 5 / 30);
      const a = 1 - E.smooth(R(t, 23.55, 23.75));
      V2.shade(ctx, [150, 160, 930, 340], '#2B1550', 0.50 * a * E.smooth(R(t, 22.3, 22.6)));
      const go = { core: '#FFF6E6', halo: '#B8226E', fill, w: 4.2, alpha: a };
      if (prog >= 1 && fill >= 1 && a >= 1) {
        // the finished word is static until its fade: draw it once (crisp layer + its glow jobs) and reuse it
        if (!unCache) {
          const bx = [200, 150, 880, 350];
          const cv = document.createElement('canvas'); cv.width = bx[2] - bx[0]; cv.height = bx[3] - bx[1]; const g = cv.getContext('2d');
          g.translate(-bx[0], -bx[1]);
          const keep = V2.glowJobs; V2.glowJobs = [];
          V2.type.glyphWrite(g, 'unclench', 540, UN_Y, 132, 1, go);
          unCache = { cv, bx, glow: V2.glowJobs }; V2.glowJobs = keep;
        }
        ctx.drawImage(unCache.cv, unCache.bx[0], unCache.bx[1]);
        unCache.glow.forEach(j => V2.glow(j));
      } else V2.type.glyphWrite(ctx, 'unclench', 540, UN_Y, 132, prog, go);
    }
  }

  // ------------------------------------------------------------------ crisp helpers
  // glints on the closed (dark) iris: only inside the beam (only what the beam lights exists)
  function lookGlints(ctx, t, C, Rr, tw, bw) {
    const edges = V2.hook.edges(C, Rr, tw, 0.35 * Rr, 1800);
    const segs = [];
    edges.forEach(e => {
      const n = 24; let run = null;
      for (let k = 0; k <= n; k++) {
        const x = lerp(e.p[0][0], e.p[1][0], k / n), y = lerp(e.p[0][1], e.p[1][1], k / n);
        const da = Math.atan2(y - APEX[1], x - APEX[0]) - bw.axis, inC = Math.abs(Math.atan2(Math.sin(da), Math.cos(da))) < bw.hw * 0.8 && y > 330;
        if (inC) { if (!run) run = [[x, y]]; else run[1] = [x, y]; } else if (run) { if (run[1]) segs.push({ p: run, a: 1, w: 2 }); run = null; }
      }
      if (run && run[1]) segs.push({ p: run, a: 1, w: 2 });
    });
    V2.P.glints(ctx, segs, { a: 0.42 * bw.I, col: '#FFE3A3' });
  }
  // dust motes in the beam (#FFF4D6), drifting slowly down the light
  function motes(ctx, t, bw) {
    if (bw.I <= 0) return;
    const pts = [];
    for (let i = 0; i < 34; i++) {
      const u = U.fract(hash(i * 3.17) + (t - 18) * (0.018 + 0.02 * hash(i * 1.9)));
      const y = lerp(260, 1250, u), spread = Math.tan(bw.hw * 0.85) * (y - APEX[1]);
      const x = APEX[0] + Math.tan(bw.axis - Math.PI / 2) * (y - APEX[1]) * -1 + (hash(i * 7.7) * 2 - 1) * spread + 14 * Math.sin(t * 0.9 + i);
      const a = Math.sin(Math.PI * u) * (0.35 + 0.65 * hash(i * 5.1)) * bw.I;
      pts.push([x, y, 2.2 + 3.2 * hash(i * 2.3), a]);
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#FFF4D6';
    pts.forEach(([x, y, r, a]) => { ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); });
    ctx.restore();
    V2.glow(g => { g.fillStyle = '#FFB45C'; pts.forEach(([x, y, r, a]) => { g.globalAlpha = a * 0.8; g.beginPath(); g.arc(x, y, r * 3.2, 0, TAU); g.fill(); }); });
  }
  // the knot's threads straighten into rays (22.12 to 23.4): a neon tangle at the jewel whose threads become dawn rays.
  // Batched: one stroke per neon colour, one fill per fan colour, one white core fill (no per-strand gradients).
  function strands(ctx, t, J, k, fanDirs) {
    const u = E.outCubic(R(t, 22.12, 22.75)), fade = 1 - E.smooth(R(t, 22.9, 23.4));
    if (u <= 0 || fade <= 0) return;
    const neon = ['#FF2E97', '#1FA352', '#B8FF2C'];
    const tang = neon.map(() => new Path2D()), rays = FAN5.map(() => new Path2D()), core = new Path2D(), gl = [];
    for (let i = 0; i < 9; i++) {
      const base = fanDirs[i % 5], th = Math.atan2(base[1], base[0]) + (hash(i * 4.1) - 0.5) * 0.5;
      const Ls = (520 + 520 * hash(i * 3.7)) * u * k;
      const amp = (34 + 26 * hash(i * 1.3)) * (1 - 0.85 * u) * k, ph = i * 2.3 + 2 * V2.osc(t, 30);
      const ct = Math.cos(th), st = Math.sin(th);
      const at = s => { const rr = 8 * k + s * Ls, tg = Math.pow(Math.max(0, 1 - s / 0.32), 1.5) * amp * Math.sin(s * 48 + ph); return [J[0] + ct * rr - st * tg, J[1] + st * rr + ct * tg]; };
      const tp = []; for (let q = 0; q <= 15; q++) tp.push(at(q / 48));
      tang[i % 3].addPath(A.poly(tp));
      const r0 = at(13 / 48), r1 = at(0.62), r2 = at(1);
      rays[i % 5].addPath(V2.fx.brush([r0, r1, r2], 7, { taper: [0.05, 0.6, 0.3, 0.0] }));
      core.addPath(V2.fx.brush([r0, at(0.3), at(0.45)], 3.2, { taper: [0.1, 0.5, 0.5, 0.0] }));
      gl.push([r0, r1, i % 5, tp]);
    }
    V2.glow(g => { g.lineWidth = 14; g.lineCap = 'round'; g.globalAlpha = 0.7 * fade; gl.forEach(([a, b, ci, tp]) => { g.strokeStyle = FAN5[ci]; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }); });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = fade;
    ctx.lineWidth = 4.5; tang.forEach((p, i) => { ctx.strokeStyle = neon[i]; ctx.stroke(p); });
    rays.forEach((p, i) => { ctx.fillStyle = FAN5[i]; ctx.fill(p); });
    ctx.fillStyle = '#FFFFFF'; ctx.fill(core);
    ctx.restore();
  }
  // ---- the crust cracks (21.75): 13 irregular shards cut along jittered crack lines, each dark on its outer face with a
  // white or gold glint on its jewel-facing edge and a 1-frame magenta / green edge flicker as it breaks free; varied size,
  // speed and spin (by hash), launches staggered over 3 frames, gone by 22.6. Unit space (crust radius 1), built once.
  const SHARDS = (() => {
    const out = [], NS = 7;
    const ang = []; for (let i = 0; i < NS; i++) ang.push((i + 0.5 * (hash(i * 3.71 + 0.4) - 0.5)) / NS * TAU + 0.35);
    const radial = (a, r0, r1, sd) => { const pts = []; for (let q = 0; q <= 3; q++) { const r = lerp(r0, r1, q / 3), j = q > 0 && q < 3 ? (hash(sd + q * 1.7) - 0.5) * 0.16 : 0; pts.push([Math.cos(a + j) * r, Math.sin(a + j) * r]); } return pts; };
    const arc = (a0, a1, r, sd) => { const pts = [], n = Math.max(2, Math.ceil((a1 - a0) / 0.22)); for (let q = 0; q <= n; q++) { const a = lerp(a0, a1, q / n), rr = r * (1 + (q > 0 && q < n ? (hash(sd + q * 2.3) - 0.5) * 0.10 : 0)); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); } return pts; };
    for (let i = 0; i < NS; i++) {
      const a0 = ang[i], a1 = i + 1 < NS ? ang[i + 1] : ang[0] + TAU;
      const split = hash(i * 5.3 + 1) > 0.15, rs = 0.42 + 0.22 * hash(i * 7.9 + 2);
      const pieces = split ? [[0.0, rs], [rs, 1.04]] : [[0.0, 1.04]];
      pieces.forEach(([r0, r1], pi) => {
        const L1 = radial(a0, r0, r1, i * 11 + pi), L2 = radial(a1, r0, r1, (i + 1) % NS * 11 + pi);
        const outer = arc(a0, a1, r1, i * 13 + pi * 5), inner = r0 > 0.01 ? arc(a0, a1, r0, i * 13 + 3) : [[0, 0]];
        const poly = L1.concat(outer.slice(1, -1), L2.slice().reverse(), inner.slice(1, -1).reverse());
        const c = poly.reduce((s, p) => [s[0] + p[0] / poly.length, s[1] + p[1] / poly.length], [0, 0]);
        // the jewel-facing edge: the inner arc (or the two radial edges near the centre for a centre piece)
        const glint = r0 > 0.01 ? inner : [L1[1], [0, 0], L2[1]];
        out.push({ poly, c, glint, outer, k: out.length });
      });
    }
    return out;
  })();
  function crustShards(ctx, t, J, KR, k) {
    const f0 = Math.round(21.75 * 30), fr = Math.round(t * 30);
    const fade = 1 - E.smooth(R(t, 22.25, 22.55));
    if (fr < f0 || fade <= 0) return;
    const glow = [];
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    SHARDS.forEach(s => {
      const fl = f0 + (s.k % 3);                                   // launch frame (staggered over 3 frames)
      const u = clamp((t - fl / 30) / 0.6), e = E.outCubic(u);
      const dir = Math.atan2(s.c[1], s.c[0]) + (hash(s.k * 2.9) - 0.5) * 0.4;
      const dist = (0.9 + 2.6 * hash(s.k * 4.7 + 1)) * KR * e * (fr >= fl ? 1 : 0);
      const rot = (hash(s.k * 6.1) - 0.5) * 3.2 * e, sc = 1 - 0.30 * e;
      const cx = J[0] + s.c[0] * KR + Math.cos(dir) * dist, cy = J[1] + s.c[1] * KR + Math.sin(dir) * dist + 60 * k * e * e;
      const m = (p) => { const x = (p[0] - s.c[0]) * KR * sc, y = (p[1] - s.c[1]) * KR * sc; return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]; };
      const poly = s.poly.map(m), path = V2.P.path(poly, true);
      ctx.globalAlpha = fade;
      // obsidian glass: dark on its outer face, the dawn caught in it on the side that faces the jewel
      const gr = ctx.createLinearGradient(cx - Math.cos(dir) * KR * 0.3 * sc, cy - Math.sin(dir) * KR * 0.3 * sc, cx + Math.cos(dir) * KR * 0.3 * sc, cy + Math.sin(dir) * KR * 0.3 * sc);
      gr.addColorStop(0, s.k % 2 ? '#B0408E' : '#7A3AC0'); gr.addColorStop(0.45, '#2A1450'); gr.addColorStop(1, '#120826');
      ctx.fillStyle = gr; ctx.fill(path);
      // two lead-came threads of the tangle inside the shard
      ctx.strokeStyle = '#3A1C6E'; ctx.lineWidth = Math.max(2, 3.2 * KR / 150);
      ctx.beginPath(); const p0 = m([lerp(s.c[0], s.poly[0][0], 0.6), lerp(s.c[1], s.poly[0][1], 0.6)]), p1 = m([lerp(s.c[0], s.poly[Math.floor(s.poly.length / 2)][0], 0.6), lerp(s.c[1], s.poly[Math.floor(s.poly.length / 2)][1], 0.6)]);
      ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
      // a thin rim of light all round (glass, not dirt) and a bright glint on the jewel-facing edge
      const gp = s.glint.map(m);
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#FFB8E0'; ctx.lineWidth = 1.8; ctx.globalAlpha = fade * 0.7 * e; ctx.stroke(path);
      ctx.strokeStyle = s.k % 3 ? '#FFFFFF' : '#FFE3A3'; ctx.lineWidth = 3.4; ctx.globalAlpha = fade * (0.75 + 0.25 * e);
      ctx.stroke(V2.P.path(gp)); ctx.globalCompositeOperation = 'source-over';
      glow.push(gp);
      // the frame it breaks free: its outer edge flickers in the knot's neon (magenta or green)
      if (fr === fl) { ctx.globalAlpha = fade; ctx.strokeStyle = s.k % 2 ? '#FF2E97' : '#1FA352'; ctx.lineWidth = 4; ctx.stroke(V2.P.path(s.outer.map(m))); }
    });
    ctx.restore();
    V2.glow(g => { g.globalAlpha = 0.55 * fade; g.strokeStyle = '#FFC861'; g.lineWidth = 8; g.lineCap = 'round'; glow.forEach(p => g.stroke(V2.P.path(p))); });
  }
  // hairline gold cracks in the crust (20.25 on): the luminous mind leaking through, growing toward the 21.75 break
  function goldCracks(ctx, J, KR, ck) {
    if (ck <= 0) return;
    const p = new Path2D();
    for (let i = 0; i < 7; i++) {
      const a = hash(i * 7.31 + 0.2) * TAU; let px = J[0] + Math.cos(a) * KR * 0.10, py = J[1] + Math.sin(a) * KR * 0.10; p.moveTo(px, py);
      const Lc = KR * (0.45 + 0.45 * hash(i * 2.9)) * ck;
      for (let q = 1; q <= 5; q++) { const aa = a + (hash(i * 11 + q) - 0.5) * 0.9; px += Math.cos(aa) * Lc / 5; py += Math.sin(aa) * Lc / 5; p.lineTo(px, py); }
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#FFE3A3'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = Math.min(1, ck * 2); ctx.stroke(p); ctx.restore();
    V2.glow(g => { g.globalAlpha = Math.min(1, ck * 1.4); g.strokeStyle = '#FFB45C'; g.lineWidth = 12; g.lineCap = 'round'; g.stroke(p); });
  }
  // a spark drawn after the glow flush (so the jewel's bloom never swallows it): saturated rays with a 1 px white core
  function postSpark(t, t0, x, y, col, r) {
    const kf = Math.round(t * 30) - Math.round(t0 * 30);
    if (kf < 0 || kf >= 8) return;
    const grow = Math.min(1, (kf + 1) / 2), fade = kf < 2 ? 1 : 1 - (kf - 1) / 7, n = 6;
    const p = new Path2D();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + hash(t0 * 13.1 + i) * 0.5, r0 = r * (0.16 + 0.22 * (1 - fade)), r1 = r0 + r * (0.5 + 0.4 * hash(i + t0)) * grow * (i % 2 ? 0.6 : 1);
      p.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); p.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    }
    V2.post(c => {
      c.save(); c.lineCap = 'round';
      c.globalAlpha = 0.35 * fade; c.strokeStyle = col; c.lineWidth = 16; c.stroke(p);
      c.globalAlpha = fade; c.lineWidth = 6.5; c.stroke(p);
      c.strokeStyle = '#FFFFFF'; c.lineWidth = 1.6; c.stroke(p);
      c.globalAlpha = fade; c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(x, y, 5 * grow, 0, TAU); c.fill();
      c.restore();
    });
  }

  // the union outline of the hand at camera k = 1, cached per pose key (static once the fingers are open)
  const runCache = new Map();
  function handRuns(P0) {
    let r = runCache.get(P0.key);
    if (!r) {
      const parts = A.handParts(P0.h, [P0.fore]);
      r = { parts, runs: A.unionOutline(parts, 9, { hide: q => q.y > 1400 || q.x < -60 || q.x > 1140 || q.y < -60 }) };
      runCache.set(P0.key, r); if (runCache.size > 24) runCache.delete(runCache.keys().next().value);
    }
    return r;
  }

  // ------------------------------------------------------------------ the frame
  L.draw = function (t, ctx) {
    const k = L.camK(t);
    const P0 = pose(t);
    const J = P0.knot;                               // the knot / jewel (it settles into the palm): the camera's fixed point
    const T = p => [J[0] + (p[0] - J[0]) * k, J[1] + (p[1] - J[1]) * k];
    const h = A.camHand(P0.h, J, k);
    const fore = { a: T(P0.fore.a), b: T(P0.fore.b), r: P0.fore.r * k, name: 'fore' };
    const ok = openK(t), unc = t >= 21.0;
    // beam: on in one frame at 18.40, +20% at 20.25, widens 20 -> 70 degrees from 21.0, fades into the dawn
    const bI = beamOn(t) * (1 + 0.2 * E.smooth(R(t, 20.25, 20.6)) + 0.35 * V2.hit(t, 18.40, 0.25) + 0.25 * V2.hit(t, 20.25, 0.3)) * (1 - 0.75 * E.smooth(R(t, 21.4, 22.4)));
    const hw = lerp(0.1745, 0.61, E.inOutSine(R(t, 21.0, 22.1)));
    const axis = Math.atan2(J[1] - APEX[1], J[0] - APEX[0]);
    const bw = { I: bI * (1 - R(t, 22.4, 23.0)), hw, axis };
    // the outer dawn ground ramps #0B0820 -> #2B1550 -> #6B3FA0 (it only shows inside the aperture)
    const g2 = t < 22.2 ? V2.mixHexSat('#0B0820', '#2B1550', R(t, 21.0, 22.2)) : V2.mixHexSat('#2B1550', '#6B3FA0', R(t, 22.2, 23.4));
    // iris: dark glass until 21.0; from 21.0 (one frame) lit dawn glass, opening
    const iR = irisR(t) * Math.max(1, k * 0.6), iTw = irisTw(t);
    const irisOn = t < 22.5 ? 1 : 0;
    const iu = unc
      ? V2.hook.irisUniforms(J, iR, iTw, { cols: DAWN9, alpha: 0.93, lift: -0.08, deep: 1, falloff: 300, C: [0.30, 0.8, 0.48, 120], glLead: 0 })
      : V2.hook.irisUniforms(J, iR, iTw, { cols: DARK9, alpha: 0.86, lift: -0.25, deep: 1, falloff: 520, C: [0.18, 0.35, 0.55, 120], glLead: 0 });
    // palm rays: one fan per finger leaving through the jewel
    const fanAmt = E.smooth(R(t, 21.8, 22.2)) * 0.35 + 0.65 * V2.hit(t, 22.25, 0.4) + 0.35 * E.smooth(R(t, 22.25, 22.5)) * (1 - 0.3 * R(t, 23.0, 23.6));
    const fanLen = (lerp(300, 1500, E.outCubic(R(t, 21.85, 22.9))) + 900 * Math.max(0, t - 22.25) * (t > 22.25 ? 1 : 0)) * k;
    const fanD = new Float32Array(20), fanC = V2.linArr(FAN5);
    const fanDirs = [];
    h.caps.forEach((c, i) => {
      if (i > 4) return;
      const d = [c.b[0] - J[0], c.b[1] - J[1]], l = Math.hypot(d[0], d[1]) || 1;
      const dir = [d[0] / l, d[1] / l]; fanDirs.push(dir);
      fanD.set([dir[0], dir[1], 0.25 + 0.75 * P0.f[i], 0], i * 4);
    });
    // the knot / jewel
    const jR = JR * k;
    const leak = clamp(R(t, 20.25, 21.0) * 0.6 + (t >= 21.0 ? 0.4 : 0)) * (t < 21.75 ? 1 : 0);
    // the flood: 23.55 to 23.82 the jewel's warm bands fill the frame; their centre moves to where the sky opens (him)
    const fl = E.smooth(R(t, 23.55, 23.82));
    const sky24 = A.sky.himScreen(24.0);
    const fc = [lerp(J[0], sky24[0], E.smooth(R(t, 23.6, 23.94))), lerp(J[1], sky24[1], E.smooth(R(t, 23.6, 23.94)))];
    const capRect = t < 21.0 ? [80, 120, 1000, 360] : [80, 150, 1000, 350];
    const openU = E.smooth(R(t, 21.0, 22.1));
    const u = Object.assign({
      uBeam: [APEX[0], APEX[1], hw, bw.I], uBeamK: [axis, Math.round(62 * TAU / (2 * hw)), Math.round(13 * TAU / (2 * hw)), 330],
      uGnd: [Math.min(k, 2.6), fl, FLOOD_SC, 0], uGnd2: [...V2.lin(g2), 0], uFlood: [fc[0], fc[1], 0, 0],
      uJw: [J[0], J[1], jR, leak * (unc ? 0.5 : 1)],
      uFan: [fanAmt, fanLen, 0.30, 70], uFanD: { v4: fanD }, uFanC: fanC,
      uHandK: [openU, 1.0, lerp(22, 15, openU) * Math.min(k, 3), 1], uHandK2: [0.44 * openU, 0.10 * openU, 16, 0],
      uIrisK: [irisOn, unc ? 1 : 0.42, 0, 0],
      uTint: unc ? 0.55 : 0.15,
    }, iu, A.handUniforms(h, fore, 1), V2.L.calm([{ rect: capRect, pad: 30 }], { floor: 0.12, feather: 60 }),
    t >= 22.2 ? V2.fx.burst(t, 22.25, { kind: 'jewel', x: J[0], y: J[1], amt: 0.85, K: [0.08, 0.75, 0.55, 0.42], K2: [0, 0, 900, 0.75], K3: [jR * 0.8, 0, 0.35, 1], tint: '#FFE6B0' }) : { uBurst: [0, 0, 0, 0] });
    V2.L.pane('#0E0838', 'a2_look_pane');
    const DBG = window.a2_DBG || {};
    if (!DBG.noGL) V2.L.render(unc ? 'a2_unc' : 'a2_look', u, { bloomK: lerp(lerp(0.26, 0.22, openU), 0.10, fl), thresh: lerp(lerp(0.78, 0.84, openU), 0.98, fl), levels: 4, sat: lerp(1.08, 1.10, openU), vig: lerp(lerp(0.38, 0.26, openU), 0.12, fl),
      vigCol: unc ? '#3A1A6E' : '#120A3E', bleed: 0.3, grain: 0.022 });

    // ---- crisp layers
    if (DBG.noCrisp) return;
    const handE = [T(P0.h.palm.c)[0], T(P0.h.palm.c)[1] - 0.10 * HS * k, 0.52 * HS * k, 0.60 * HS * k];
    const HR = handRuns(P0);
    if (DBG.noIris2d) {} else if (!unc) { if (bw.I > 0) lookGlints(ctx, t, J, iR, iTw, bw); }
    else if (t < 22.5) {
      const lf = 1 - E.smooth(R(t, 21.75, 22.25));
      const flash = V2.fx.leadFlash(t, [21.0]);
      V2.hook.irisCrisp(ctx, J, iR, iTw, { cols: DAWN9, flood: 1, flash: 0.9 * flash, leadW: 5, leadA: 0.75 * lf, cut: [handE], flashCut: [handE], dashes: false, lines: true, glints: true, t, k: 1 });
      // the aperture's lit rim: a 3 px pale-gold line round the opening (it stops where the hand is in front)
      const ap = V2.hook.aperture(J, iR, iTw), segs = [];
      for (let i = 0; i < 9; i++) {
        const a = ap[i], b = ap[(i + 1) % 9], n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14));
        let run = null;
        for (let q = 0; q <= n; q++) {
          const p = [lerp(a[0], b[0], q / n), lerp(a[1], b[1], q / n)];
          const vis = p[0] > -30 && p[0] < 1110 && p[1] > -30 && p[1] < 1380 && A.sdHand(HR.parts, J[0] + (p[0] - J[0]) / k, J[1] + (p[1] - J[1]) / k) > 4;
          if (vis) { if (!run) run = []; run.push(p); } else if (run) { if (run.length > 1) segs.push(run); run = null; }
        }
        if (run && run.length > 1) segs.push(run);
      }
      if (segs.length && !DBG.noAp) {
        const rA = 0.95 * (1 - E.smooth(R(t, 22.2, 22.5)));
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#FFE3A3'; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.globalAlpha = rA;
        segs.forEach(s => ctx.stroke(V2.P.path(s))); ctx.restore();
        V2.glow(g => { g.globalAlpha = 0.6 * rA; g.strokeStyle = '#FFC861'; g.lineWidth = 12; segs.forEach(s => g.stroke(V2.P.path(s))); });
      }
    }
    if (t < 22.6 && !DBG.noMotes) motes(ctx, t, bw);
    // the knot (in the curl, seen through the glass fingers), the jewel inside it
    const jHot = clamp(R(t, 21.75, 22.25) * 0.55 + (t >= 22.25 ? 0.45 + 0.6 * V2.hit(t, 22.25, 0.35) : 0));
    if (t >= 21.7 && !DBG.noJewel) {
      const fan = E.smooth(R(t, 22.25, 22.45)) * (1 - 0.4 * R(t, 23.2, 23.7));
      V2.grab.jewel(ctx, t, J[0], J[1], jR * (0.75 + 0.25 * jHot + 0.12 * V2.hit(t, 22.25, 0.3)), { alpha: 1 - 0.95 * E.smooth(R(t, 23.50, 23.74)), hot: jHot, rot: 0.3 + 0.25 * (t - 21.7), fan, fanAng: Math.atan2(fanDirs[2][1], fanDirs[2][0]), fanSpread: 1.05, fanLen: 4.2, n: 8 });
    }
    const KR = KNOT_R * k * (1 - 0.18 * P0.mv);
    const cracked = Math.round(t * 30) >= Math.round(21.75 * 30);
    if (!cracked && !DBG.noKnot) {
      const jit = lerp(1, 0.3, R(t, 18.4, 21.0));
      const edge = t < 18.4 ? 0.2 : lerp(0.85, 0.55, R(t, 18.4, 21.0));
      const kn = V2.grab.knot(ctx, t, J[0], J[1], KR, { jit: Math.round(jit * 8) / 8, seed: knotSeed(t), edge, halo: (unc ? 0.25 : 0.75) * (1 - 0.6 * ok) });
      // the crust stays dark (the one opaque thing): its tangle is pushed toward #3A1C6E lines on #140A2A (lighter once
      // the dawn is behind it, so it reads as a crust about to break, not a hole)
      if (kn) { ctx.save(); ctx.fillStyle = V2.rgba('#120826', unc ? 0.18 : 0.40); ctx.fill(V2.P.path(kn.pts.map(p => [J[0] + (p[0] - J[0]) * 0.94, J[1] + (p[1] - J[1]) * 0.94]), true)); ctx.restore(); }
      goldCracks(ctx, J, KR, leak);
      // the fingers in front of the knot: translucent glass over the crust; the crust shows in the gaps between them
      const front = 1 - E.smooth(R(t, 21.1, 21.95));
      if (front > 0.01) {
        const fp = new Path2D(); V2.grab.handPaths(h).slice(1).forEach(q => fp.addPath(q));
        const rg = ctx.createRadialGradient(J[0], J[1] - KR * 0.15, KR * 0.2, J[0], J[1], KR * 1.3);
        rg.addColorStop(0, V2.rgba('#3A1470', 0.74 * front)); rg.addColorStop(0.62, V2.rgba('#2E1262', 0.80 * front)); rg.addColorStop(0.86, V2.rgba('#2A1058', 0.52 * front)); rg.addColorStop(1, V2.rgba('#2A1058', 0));
        ctx.save(); ctx.fillStyle = rg; ctx.fill(fp, 'nonzero');
        if (bw.I > 0) { ctx.globalCompositeOperation = 'lighter'; const tg = ctx.createRadialGradient(J[0], J[1] - KR * 0.5, KR * 0.1, J[0], J[1] - KR * 0.2, KR * 1.1); tg.addColorStop(0, V2.rgba('#FFB45C', 0.16 * front * bw.I)); tg.addColorStop(1, V2.rgba('#FFB45C', 0)); ctx.fillStyle = tg; ctx.fill(fp, 'nonzero'); }
        ctx.restore();
        // the gaps between the curled fingers: the dark crust, seen directly (wider as the fist breathes at 21.0)
        ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#140A2A';
        h.seps.forEach(sp => {
          const a = sp.p[0], b = sp.p[1];
          const q0 = [lerp(a[0], b[0], 0.04), lerp(a[1], b[1], 0.04)], q1 = [lerp(a[0], b[0], 0.78), lerp(a[1], b[1], 0.78)];
          ctx.globalAlpha = 0.92 * front; ctx.lineWidth = (8 + 10 * sp.gap / 0.2) * Math.min(k, 1.5);
          ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke();
        });
        ctx.restore();
      }
    }
    if (cracked && !DBG.noKnot) crustShards(ctx, t, J, KR, k);
    if (!DBG.noStrands) strands(ctx, t, J, k, fanDirs);
    // the hand: one light-pen line round the union (lit where it faces the beam while looking; all rose-white open).
    // Before the beam it is near dark: a faint line and two or three rim glints only.
    const openW = E.smooth(R(t, 21.0, 21.9));
    const pre = beamOn(t) ? 1 : 0;
    const lit = q => {
      const lx = q.x - APEX[0], ly = q.y - APEX[1], ll = Math.hypot(lx, ly) || 1;
      const face = Math.max(0, -(q.nx * lx + q.ny * ly) / ll);
      const da = Math.atan2(ly, lx) - axis, inC = clamp((hw - Math.abs(Math.atan2(Math.sin(da), Math.cos(da)))) / (hw * 0.3));
      return lerp(Math.pow(face, 1.2) * inC * bw.I + 0.08, 1, openW);
    };
    const core = V2.mixHexSat('#FFD9A0', '#FFFFFF', openW), halo = V2.mixHexSat('#FFB45C', '#FF8FC0', openW);
    if (!DBG.noContour) {
      // the runs are cached at camera k = 1 (in pose space); during the fly-in they are drawn under the camera transform
      const sd = V2.boil(t, openW > 0.5 ? 2 : 4), kk = k, cw = 7 * Math.min(k, 2.2) / kk;
      const litK = q => lit({ x: J[0] + (q.x - J[0]) * kk, y: J[1] + (q.y - J[1]) * kk, nx: q.nx, ny: q.ny });
      const off = openW > 0.02 ? 0.62 : 0;
      ctx.save(); ctx.setTransform(kk, 0, 0, kk, J[0] - kk * J[0], J[1] - kk * J[1]);
      V2.camera(ctx, [kk, 0, 0, kk, J[0] - kk * J[0], J[1] - kk * J[1]]);
      A.drawContour(ctx, HR.runs, { w: cw, core, halo, lit: litK, floor: pre ? 0.16 : 0.10, seed: sd, wob: 1.6 / kk, ga: pre ? lerp(0.5, 0.38, openW) : 0.05, gw: 18 / kk, alpha: pre ? 1 : 0.15 });
      // open: the off-register second line (#6FE3FF, 45% width, +6/+4 px) over 62% of the outline, the iPad-drawing feel
      if (off > 0) {
        let tot = 0; HR.runs.forEach(r => { tot += r.pts.length; });
        let acc = 0; const sub = [];
        HR.runs.forEach(r => { if (acc < tot * off) sub.push({ part: r.part, closed: false, pts: r.pts.slice(0, Math.max(2, Math.min(r.pts.length, Math.round(tot * off - acc)))).map(q => Object.assign({}, q, { x: q.x + 6 / kk, y: q.y + 4 / kk })) }); acc += r.pts.length; });
        A.drawContour(ctx, sub, { w: cw * 0.45, core: '#6FE3FF', halo: '#6FE3FF', floor: 1, seed: sd + 7, wob: 2.2 / kk, ga: 0.25, gw: 10 / kk, alpha: 0.85 * openW });
      }
      V2.camera(ctx, null); ctx.restore();
    }
    // before the beam: two or three tiny rim glints on the knuckles (where the light will land)
    if (!pre) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#FFE3A3'; ctx.lineCap = 'round'; ctx.lineWidth = 2.5;
      [[1, 0.55], [2, 0.42], [3, 0.6]].forEach(([i, a]) => { const c = h.caps[i]; const tip = c.a, r = c.r; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(tip[0], tip[1], r - 3, -Math.PI / 2 - 0.55, -Math.PI / 2 - 0.15); ctx.stroke(); });
      ctx.restore();
    }
    // open: a 2 px white glint inside each finger's edge, on the side that faces the jewel (light caught in the glass)
    if (openW > 0.3 && t < 23.4) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#FFFFFF'; ctx.lineCap = 'round'; ctx.lineWidth = 2.2;
      ctx.globalAlpha = 0.85 * E.smooth(R(openW, 0.3, 0.9)) * (1 - E.smooth(R(t, 23.1, 23.4)));
      h.caps.slice(0, 5).forEach(c => {
        const dx = c.b[0] - c.a[0], dy = c.b[1] - c.a[1], l = Math.hypot(dx, dy) || 1; if (l < 30) return;
        let nx = -dy / l, ny = dx / l; const mx = (c.a[0] + c.b[0]) / 2 - J[0], my = (c.a[1] + c.b[1]) / 2 - J[1];
        if (nx * mx + ny * my > 0) { nx = -nx; ny = -ny; }
        const o = c.r - 7 * Math.min(k, 2);
        ctx.beginPath(); ctx.moveTo(c.a[0] + dx * 0.22 + nx * o, c.a[1] + dy * 0.22 + ny * o); ctx.lineTo(c.a[0] + dx * 0.80 + nx * o, c.a[1] + dy * 0.80 + ny * o); ctx.stroke();
      });
      ctx.restore();
    }
    // the thumb's edge across the fingers and the separations between the curled fingers: lines of light that catch
    // the beam (the fist reads as a fist at 270 px; no construction circles)
    if (ok < 0.7 && k < 1.6) {
      const ca = clamp(0.22 + bw.I * 0.78) * (pre ? 1 : 0.2);
      // (final pass) only the top 34% of each separation catches the beam (a rim at the knuckles): full-length white
      // bars plus the thumb edge read as a grille or a strike-through; the dark gaps and the ink crease carry the fist
      const segs = h.seps.map(sp => { const q1 = [lerp(sp.p[0][0], sp.p[1][0], 0.34), lerp(sp.p[0][1], sp.p[1][1], 0.34)]; return { pts: [sp.p[0], [lerp(sp.p[0][0], q1[0], 0.5), lerp(sp.p[0][1], q1[1], 0.5)], q1].map(p => [p[0] + 6 * k, p[1]]), a: sp.a * 0.8 }; });
      const te = h.thumbEdge, tA = 1 - E.smooth(R(t, 21.0, 21.25));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#FFD9A0';
      segs.forEach(sg => { ctx.globalAlpha = 0.9 * ca * sg.a; ctx.fill(V2.fx.brush(sg.pts, 5, { taper: [0.15, 0.9, 0.6, 0.0] })); });
      if (tA > 0 && te.length === 2) { ctx.globalAlpha = 0.38 * ca * tA; ctx.fill(V2.fx.brush([te[0], [lerp(te[0][0], te[1][0], 0.5), lerp(te[0][1], te[1][1], 0.5)], te[1]], 5, { taper: [0.2, 0.5, 0.25, 0.2] })); }
      ctx.restore();
      if (pre) V2.glow(g => { g.strokeStyle = '#FFB45C'; g.lineCap = 'round'; g.lineWidth = 16; g.globalAlpha = 0.30 * ca; segs.forEach(sg => { g.beginPath(); g.moveTo(sg.pts[0][0], sg.pts[0][1]); g.lineTo(sg.pts[2][0], sg.pts[2][1]); g.stroke(); }); });
      // one ink crease between thumb and fingers (3.1)
      if (tA > 0 && te.length === 2) { ctx.save(); ctx.globalAlpha = 0.7 * tA; ctx.strokeStyle = V2.INK; ctx.lineCap = 'round'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(lerp(te[0][0], te[1][0], 0.25), lerp(te[0][1], te[1][1], 0.25) + 7); ctx.lineTo(lerp(te[0][0], te[1][0], 0.85), lerp(te[0][1], te[1][1], 0.85) + 7); ctx.stroke(); ctx.restore(); }
    }
    // celesta sparks (22.50, 23.25): out along a finger fan, clear of the jewel's bloom, drawn after the glow flush
    { const d1 = fanDirs[1], d3 = fanDirs[3];
      postSpark(t, 22.50, J[0] + d1[0] * 2.6 * jR, J[1] + d1[1] * 2.6 * jR, '#FFE45C', 120);
      postSpark(t, 23.25, J[0] + d3[0] * 2.5 * jR, J[1] + d3[1] * 2.5 * jR, '#FF5FA2', 125); }
    // ---- type
    if (DBG.noType) return;
    if (t >= 18.6 && t < 20.48 + 0.2) {
      const a = 1 - E.smooth(R(t, 20.48, 20.68));
      V2.type.light(ctx, t, Object.assign(v13Spec(ctx), { alpha: a }));
    }
    // the asides: low left on a deep pane (clear of the knuckles), hard cut at 21.0 when the dawn opens on "un"
    if (t >= 19.25 && t < 21.0) {
      V2.shade(ctx, [52, 1112, 760, 1232], '#0E0838', 0.62 * E.smooth(R(t, 19.2, 19.4)), { feather: 60, r: 40 });
      V2.type.mono(ctx, t, 'attention is overpowered.', 90, 1148, { size: 40, col: '#FFF4D6', a: 0.9, t0: 19.25, cps: 45, t1: 21.0, halo: '#FF9A3D', ga: 0.30 });
      V2.type.mono(ctx, t, "evolution can't patch it.", 90, 1198, { size: 40, col: '#FFF4D6', a: 0.9, t0: 19.50, cps: 45, t1: 21.0, cursor: true, halo: '#FF9A3D', ga: 0.30 });
    }
    unclenchType(ctx, t);
  };
})();
