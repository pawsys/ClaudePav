// V2 core: THE FRAME-0 RIG (LOOK.md 4 "HOOK A", 5.5). The poster, and the seam.
// One pure function of t draws the whole hook frame: a 9-blade colour-glass iris closing on the dark knot (lit from the
// aperture: full value at the aperture and along each leading edge, deep analogous hues toward the frame edges), long
// white lines of light leaving the aperture along the blade edges with dashes travelling inward on them, cold dashes
// streaming into the knot (each tinted by the blade it crosses), grabbygrab CLENCHED in amber glass (lens in GL, the
// blades and leads bending inside him, light-pen contour, lead rim, ink face) clutching the knot in a real fist, and
// V01 in Anton neon on a #140C4A pane.
// Used by act 1 (0..6, and the `tight` variant 15..17.55) and act 3 (59.25..60 regrab, V2.hook.regrab(t)).
// At t = 60 every blend parameter reaches exactly its frame-0 value, so frame 1799 flows into frame 0.
// The iris itself is shared with act 2 (21.0 opening, 32.9 reward hack): V2.hook.irisUniforms + V2.hook.irisCrisp.
(function () {
  const V2 = window.V2;
  const { clamp, lerp, hash, TAU } = V2.U;
  const HK = V2.hook = {};

  // ------------------------------------------------------------------ frame-0 constants (world = screen at frame 0)
  const K = HK.K = {
    char: [455, 965, 370],            // grabbygrab x, y, s (about 40% of frame height)
    knot: [800, 972, 111],            // knot x, y, R (= 0.30 s)
    hand: [733, 1083, -0.98],         // fist centre and direction (points into the knot)
    shA: 0.62,                        // shoulder angle on the body (lower right), arm bends down then up
    ap: 1.36,                         // iris aperture inradius = ap * R
    tw0: 0.30,                        // iris base twist
    // V01 rows: row 1 clears the watermark (x > 820, y < 110); the pane runs past row 3 so "RIGHT NOW." sits on it
    caption: { rows: [{ n: 2, size: 134, y: 166 }, { n: 1, size: 196, y: 326 }, { n: 2, size: 150, y: 486 }], pane: [40, 84, 1040, 636] },
    // tight (15..17.55) camera at tight 1: him on the left (body about 50% of frame height, cropped by the frame
    // edge), the knot nearer the camera (1.4x) and nearer frame centre
    tight: { k: 1.30, sx: 252, sy: 940, knot: 1.08 },
  };
  // blade colours in the 2.7 complementary order, rotated so the cool blades (violet, cerulean) sit behind the caption
  // pane (a lemon blade under the #140C4A pane goes olive)
  HK.colOff = 1;
  HK.blades = (off = HK.colOff) => { const c = V2.PAL.hook.glass; return c.map((_, i) => c[(i + off + c.length) % c.length]); };

  // ------------------------------------------------------------------ GL program (built from core chunks)
  const MAIN = `
uniform vec4 uKnot;      // knot x, y, R (screen px), aperture glow
uniform vec4 uHookK;     // dash intensity, dash speed (cycles per 60 s), tight 0..1, boil seed
vec3 world(vec2 P, float cm){
  vec3 g=pane(P);
  vec3 ic, top; float cov=iris(P,ic,top);
  vec3 glass=mix(g,ic,irisAlpha);
  // the aperture: a crisp dark-violet ring around the knot (the light is being taken), dashes swallowed at its rim
  float kr=length(P-uKnot.xy);
  vec3 ap=g*mix(.30,1.,smoothstep(uKnot.z*1.0,uKnot.z*1.35,kr))+HX(255.,46.,151.)*.05*exp(-max(kr-uKnot.z,0.)/30.)*uKnot.w;
  vec3 c=mix(ap,glass,cov);
  if(uHookK.x>0.){
    vec3 d=inflow(P,uKnot.xy,uKnot.z*.98,uHookK.y,1.,280.+120.*uHookK.z,uHookK.w,1.);
    d=tintBy(d,cov>.5?top:HX(198.,163.,255.));
    d*=mix(.35,1.,smoothstep(uKnot.z*1.05,uIris.z*1.12,kr));          // swallowed: no bright aura at the knot rim
    c+=d*uHookK.x*cm*(1.+smoothstep(.5,1.,cm))*(cov>.5?1.:1.15);      // x2 outside the calm zones
  }
  return c; }
void main(){
  vec2 P=canvasPx(vUv);
  float cm=calm(P);
  // refraction inside his glass: one refracted sample (per-channel dispersion is the 2D prism fringe on his contour);
  // a single world() call site keeps the shader small (SwiftShader runs inlined branches eagerly)
  float lq=lensQ(P,uBody);
  float aw=3.*uPx/max(min(uBody.z,uBody.w),1.);                      // 2-tap-wide AA on the lens edge
  float inL=smoothstep(1.+aw,1.-aw,lq)*step(0.,uLens);
  vec2 Q=mix(P,lensPos(P,uBody,uLens,1.),inL);
  vec3 c=world(Q,cm);
  c=burst(P,c);                    // before his glass: a burst passing behind him is seen through it (takes its hue)
  if(inL>0.) c=bodyGlass(P,c);
  o=vec4(c,1.);
}`;
  V2.L.program('core_trivial', ['PANE'], `void main(){ o=vec4(pane(canvasPx(vUv)),1.); }`);
  V2.L.program('core_hook', ['PANE', 'LENS', 'BODY', 'IRIS', 'DASHES', 'CALM', 'BURST'], MAIN);

  // the hook pane: ground + pools of light behind the glass (static, cached by key)
  // (the light source sits behind the aperture: a warm pool there shows through every blade near it; the frame
  //  edges keep cool ultramarine pools, so the glass is lit from the centre and deep at the edges)
  HK.pane = function (g) {
    V2.ground(g, 'hook', { c: [700, 900], r: 1150 });
    V2.P.disc(g, 760, 950, 760, '#FF9A3D', 0.42);
    V2.P.disc(g, 780, 960, 360, '#FFE2B0', 0.40);
    V2.P.disc(g, 1060, 560, 520, '#1E9BE6', 0.22);
    V2.P.disc(g, 60, 200, 620, '#2233D6', 0.30);
  };
  // ------------------------------------------------------------------ helpers
  const beatPulse = t => { const b = V2.beat(t); const dt = b.ph * 0.75; return Math.min(1, dt / (2 / 30)) * Math.exp(-dt / 0.12); };
  // iris twist: base + one sway per bar (loop-safe, no net rotation) + beat twist pulses
  HK.twist = (t, o = {}) => K.tw0 + 0.06 * V2.osc(t, 20) + 0.035 * beatPulse(t) + (o.notch || 0) * (TAU / 9) * 0.25;
  // JS mirror of the IRIS chunk's top-blade rule: visible lead segments along each blade's leading edge
  HK.edges = function (C, R, tw, L, ext = 2400) {
    const N = 9, out = [];
    const nrm = i => { const ph = tw + i * TAU / N; return [Math.cos(ph), Math.sin(ph)]; };
    const top = (x, y) => {
      const dx = x - C[0], dy = y - C[1]; let ti = -1;
      let bs = -1e9;
      for (let i = 0; i < N; i++) { const [nx, ny] = nrm(i); const dn = dx * nx + dy * ny - R, s = -dx * ny + dy * nx; if (dn > 0 && s > -L && s > bs) { bs = s; ti = i; } }
      return ti;
    };
    for (let i = 0; i < N; i++) {
      const [nx, ny] = nrm(i), tx = -ny, ty = nx;
      let on = false, s0 = 0;
      const steps = 90;
      for (let k = 0; k <= steps; k++) {
        const s = -L + (ext + L) * Math.pow(k / steps, 1.6);
        const px = C[0] + nx * R + tx * s, py = C[1] + ny * R + ty * s;
        const vis = top(px + nx * 3, py + ny * 3) === i && top(px - nx * 3, py - ny * 3) !== i && px > -200 && px < 1280 && py > -200 && py < 1550;
        if (vis && !on) { on = true; s0 = s; }
        if ((!vis || k === steps) && on) { on = false; out.push({ i, s0, s1: s, n: [nx, ny], p: [[C[0] + nx * R + tx * s0, C[1] + ny * R + ty * s0], [C[0] + nx * R + tx * s, C[1] + ny * R + ty * s]] }); }
      }
    }
    return out;
  };
  // the top blade at (x,y) (JS mirror of the IRIS chunk), -1 inside the aperture
  HK.topBlade = function (C, R, tw, L, x, y) {
    const dx = x - C[0], dy = y - C[1]; let ti = -1, bs = -1e9;
    for (let i = 0; i < 9; i++) { const ph = tw + i * TAU / 9, nx = Math.cos(ph), ny = Math.sin(ph); const dn = dx * nx + dy * ny - R, s = -dx * ny + dy * nx; if (dn > 0 && s > -L && s > bs) { bs = s; ti = i; } }
    return ti;
  };
  // the hook's rays of light (screen angles, rad: 0 = right, + = down), chosen to cross the blades away from his body
  HK.RAYS = [-1.62, -1.08, -0.52, 0.04, 0.60, 1.18, 1.86];
  // aperture polygon (screen px). rev: reversed winding (a hole when added to a clockwise rect, nonzero rule)
  HK.aperture = function (C, R, tw, rev) {
    const pts = [];
    for (let i = 0; i < 9; i++) { const a = tw + (i + 0.5) * TAU / 9; const r = R / Math.cos(Math.PI / 9); pts.push([C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r]); }
    return rev ? pts.reverse() : pts;
  };

  // ------------------------------------------------------------------ the iris, shared (hook, act 2 opening, reward hack)
  // V2.hook.irisUniforms(C, R, twist, o) -> IRIS chunk uniforms. C [x,y] aperture centre (screen px), R inradius px.
  // o: {cols (9 hexes, default the hook blades), alpha (.72 at flood 1), flood (alpha .45 -> .72), lift, darken (tight
  //     0..1: x0.45 + violet near the aperture), k (camera scale: band widths), L (blade back length, .35 R),
  //     ov (.6 overlap strength), band (200 px overlap strip), deep (1: value falloff on), falloff (360 px),
  //     edgeBand (220 px), glowReach (200 px: the hot light at the aperture), glLead (GL lead px, 3),
  //     C ([edge light .30, aperture glow .9, blade body .62, edge band 120 px])}
  const colCache = new Map();
  HK.irisCols = function (cols) {
    const key = cols.join();
    let cc = colCache.get(key);
    if (!cc) { const deep = V2.L.irisDeepHex(cols); cc = { col: V2.linArr(cols), ov: V2.L.irisOv(cols), deep: V2.linArr(deep), ovd: V2.L.irisOv(deep), deepHex: deep }; colCache.set(key, cc); }
    return cc;
  };
  HK.irisUniforms = function (C, R, tw, o = {}) {
    const cc = HK.irisCols(o.cols || HK.blades(o.colOff));
    const k = o.k ?? 1, flood = clamp(o.flood ?? 1);
    return {
      uIris: [C[0], C[1], R, tw], uIrisN: V2.L.irisN(tw),
      uIrisB: [o.L ?? 0.35 * R, o.alpha ?? lerp(0.45, 0.72, flood), o.lift ?? 0, clamp(o.darken ?? 0)],
      uIrisC: o.C || [0.30, 0.9, 0.62, 120],
      // (uIrisD.w: aperture glow reach px)
      uIrisC2: [o.ov ?? 0.6, (o.band ?? 200) * k, 34 * k, o.glLead ?? 3 * Math.max(0.6, k)],
      uIrisD: [o.falloff ?? 360, o.deep ?? 1, (o.edgeBand ?? 220) * Math.max(0.6, k), o.glowReach ?? 200],
      uIrisCol: cc.col, uIrisOv: cc.ov, uIrisDeep: cc.deep, uIrisOvD: cc.ovd,
    };
  };
  // V2.hook.irisCrisp(ctx, C, R, twist, o): the iris drawn in lines (full res, after the GL pass):
  //   lead came on every visible leading edge, long white lines of light leaving the aperture along the light side of
  //   the edges (5 px core, a halo in the blade's own colour, 420 to 700 px), dashes travelling inward along them,
  //   thin glints on the rest of each edge, and the lead flash (edges turn white; glow kept off the caption, the
  //   aperture and the fist).
  // o: {k, flood, flash 0..1, leadW (5; 10 at tight), leadA, cut [[cx,cy,rx,ry]] (his body: leads, lines and glints stop),
  //     stop [[x0,y0,x1,y1]] (light lines end where they enter: caption panes), flashCut [[cx,cy,rx,ry]] (no flash glow),
  //     cols, t (dash clock), dashSpeed (90: cycles per 60 s, the 2D dashes run at a third), lines (true), dashes (true), L,
  //     lips (default = lines: the short lit lips at the aperture without the long rays)}
  // returns {edges, lines}
  HK.irisCrisp = function (ctx, C, R, tw, o = {}) {
    const k = o.k ?? 1, flood = clamp(o.flood ?? 1), lf = o.flash ?? 0, t = o.t ?? V2.T ?? 0;
    const L = o.L ?? 0.35 * R;
    const cols = o.cols || HK.blades(o.colOff);
    const edges = HK.edges(C, R, tw, L);
    const leadW = o.leadW ?? 5 * clamp(k * 1.2, 0.6, 1);
    const leadCol = lf > 0 ? V2.mixHex(V2.LEAD, '#FFFFFF', lf) : V2.LEAD;
    const cut = o.cut || [];
    V2.P.lead(ctx, edges, { w: leadW, col: leadCol, a: o.leadA ?? lerp(0.5, 0.92, flood), cut });
    // ---- the lit lip: a short white light line on the light side of each leading edge, near the aperture
    const kk = clamp(k, 0.6, 1.4);
    const inCut = q => cut.some(E => { const dx = (q[0] - E[0]) / E[2], dy = (q[1] - E[1]) / E[3]; return dx * dx + dy * dy < 1.06; });
    const inStop = q => (o.stop || []).some(r => q[0] > r[0] && q[0] < r[2] && q[1] > r[1] && q[1] < r[3]);
    const out = q => q[0] < -20 || q[0] > 1100 || q[1] < -20 || q[1] > 1370;
    const lips = [];
    // (integration, A2-5) o.lips: the lit lips can be kept without the long rays (default: with the rays)
    if (o.lips ?? (o.lines !== false)) edges.forEach(e => {
      if (e.s0 > 40) return;                                  // only edges that start at the aperture carry the light
      const sh = leadW * 0.5 + 2.4, a0 = e.p[0], d = [e.p[1][0] - a0[0], e.p[1][1] - a0[1]], dl = Math.hypot(d[0], d[1]) || 1;
      const Lk = Math.min(dl, lerp(170, 250, hash(e.i * 5.3)) * kk), n = 10, pts = [];
      for (let q = 0; q <= n; q++) { const f = q / n * Lk; const p = [a0[0] + d[0] / dl * f + e.n[0] * sh, a0[1] + d[1] / dl * f + e.n[1] * sh]; if (inCut(p) || inStop(p) || out(p)) break; pts.push(p); }
      if (pts.length >= 4) lips.push({ i: e.i, pts });
    });
    // ---- long lines of light: rays leaving the aperture rim straight out ACROSS the blades (5 px white core, a halo in
    //      the colour of the blade they cross, 450 to 720 px), turning a little with the iris; dashes travel inward on them
    const rays = [];
    if (o.lines !== false) (o.rays || HK.RAYS).forEach((a0, j) => {
      const a = a0 + (tw - K.tw0) * 0.6, dx = Math.cos(a), dy = Math.sin(a);
      const r0 = R * 1.06, Lk = lerp(450, 720, hash(j * 7.13 + 0.3)) * kk, n = 20, pts = [];
      for (let q = 0; q <= n; q++) { const r = r0 + q / n * Lk; const p = [C[0] + dx * r, C[1] + dy * r]; if (inCut(p) || inStop(p) || out(p)) break; pts.push(p); }
      if (pts.length < 5) return;
      const mid = pts[Math.floor(pts.length * 0.45)];
      const bi = HK.topBlade(C, R, tw, L, mid[0], mid[1]);
      rays.push({ i: bi < 0 ? 0 : bi, pts, len: Lk * (pts.length - 1) / n });
    });
    const lw = (5 + 1.5 * lf) * kk;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = Math.min(1, 0.92 + 0.08 * lf) * flood;
    lips.forEach(l => ctx.fill(V2.fx.brush(l.pts, lw * 0.85, { taper: [0.03, 0.55, 0.6, 0.0] })));
    rays.forEach(l => ctx.fill(V2.fx.brush(l.pts, lw, { taper: [0.04, 0.3, 0.6, 0.0] })));
    ctx.restore();
    const lines = lips.concat(rays);
    if (lines.length) V2.glow(g => { g.lineCap = 'round'; lines.forEach(l => { g.lineWidth = 18 * kk; g.globalAlpha = 0.45 * flood; g.strokeStyle = cols[l.i]; g.beginPath(); g.moveTo(l.pts[0][0], l.pts[0][1]); const q = l.pts[Math.min(l.pts.length - 1, Math.ceil(l.pts.length * 0.6))]; g.lineTo(q[0], q[1]); g.stroke(); }); });
    // ---- dashes travelling inward along the rays (loop-safe: whole cycles per 60 s)
    if (o.dashes !== false && flood > 0.05) {
      const nd = Math.max(1, Math.round((o.dashSpeed ?? 90) / 3));
      const dashP = new Path2D(), halo = [];
      rays.forEach((l, li) => {
        if (l.len < 220) return;
        for (let j = 0; j < 2; j++) {
          const u = V2.U.fract(hash(li * 13.7 + j * 0.37) + j * 0.5 - nd * t / 60);    // 1 at the far end -> 0 at the aperture
          const s0 = u * l.len, s1 = Math.min(l.len, s0 + 54 * kk);
          const a = V2.U.smooth((u - 0.03) / 0.12) * V2.U.smooth((0.97 - u) / 0.15);
          if (a <= 0.02) continue;
          const at = s => { const f = s / l.len * (l.pts.length - 1), i = Math.min(l.pts.length - 2, Math.floor(f)), r = f - i; return [lerp(l.pts[i][0], l.pts[i + 1][0], r), lerp(l.pts[i][1], l.pts[i + 1][1], r)]; };
          const p0 = at(s0), p1 = at(s1);
          dashP.moveTo(p0[0], p0[1]); dashP.lineTo(p1[0], p1[1]);
          halo.push([p0, p1, cols[l.i], a]);
        }
      });
      if (halo.length) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 7 * kk; ctx.globalAlpha = 0.95 * flood; ctx.stroke(dashP); ctx.restore();
        V2.glow(g => { g.lineCap = 'round'; g.lineWidth = 18 * kk; halo.forEach(([p0, p1, c, a]) => { g.globalAlpha = a * flood; g.strokeStyle = c; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }); });
      }
    }
    // ---- the rest of each edge keeps a thin glint
    const gl = edges.map(e => { const sh = leadW * 0.5 + 2.2; const L2 = Math.min(e.s1 - e.s0, 900); const a0 = e.p[0], d = [(e.p[1][0] - a0[0]), (e.p[1][1] - a0[1])], dl = Math.hypot(d[0], d[1]) || 1;
      return { p: [[a0[0] + e.n[0] * sh, a0[1] + e.n[1] * sh], [a0[0] + d[0] / dl * L2 + e.n[0] * sh, a0[1] + d[1] / dl * L2 + e.n[1] * sh]], a: 1, w: 2 }; });
    if (o.glints !== false) V2.P.glints(ctx, gl.map(g2 => { const a = g2.p[0], b = g2.p[1]; return Object.assign(g2, { p: [a, [lerp(a[0], b[0], 0.55), lerp(a[1], b[1], 0.55)]] }); }), { a: (0.30 + 0.65 * lf) * flood, cut });
    // ---- lead flash: every edge a white ray (glow kept off the caption, the aperture ring and the fist)
    if (lf > 0) {
      const fe = V2.P.cutSegs(edges, [[C[0], C[1], R * 1.7, R * 1.7], ...(o.flashCut || [])]);
      V2.glow(g => { g.globalAlpha = lf * 0.8; g.strokeStyle = '#FFFFFF'; g.lineWidth = 14; fe.forEach(e => { g.beginPath(); g.moveTo(e.p[0][0], e.p[0][1]); g.lineTo(e.p[1][0], e.p[1][1]); g.stroke(); }); });
    }
    return { edges, lines: rays, lips };
  };

  // ------------------------------------------------------------------ regrab choreography (5.5), t in [59.25, 60)
  // o: {wisp [x,y] (screen position of the wisp at 59.25, rest framing), rest [x, y, s] (rest framing of him)}
  // the pearl -> amber crossfade goes through peach (never through a dark or grey mix)
  const PEACH = { fill: '#FFB08A', glow: '#FFC29A', emit: 0.32, scr: 0.12, filt: 0.5, core: '#FFE8D0', halo: '#FFA07A', off: '#7FD8FF', lead: 0.5,
    lobes: ['#FF8FB1', '#FFC94D', '#FF7A5A'], lobeA: 0.4, sat: 1.2, fibres: 'none', fibreA: 0, div: 2, wob: 1.2, hand: '#FFA27A', handHi: '#FFC8A8', handA: 0.85, thru: 0.4 };
  HK.regrabMood = u => { u = clamp(u); return u < 0.3 ? V2.grab.mixMood('asleep', PEACH, u / 0.3) : V2.grab.mixMood(PEACH, 'clench', (u - 0.3) / 0.7); };
  HK.regrab = function (t, o = {}) {
    const u = t - 59.25;
    const rest = o.rest || [330, 1090, 150];
    const camE = V2.U.inCubic(clamp(u / (59.967 - 59.25)));
    const k0 = rest[2] / K.char[2];
    const cam = { k: lerp(k0, 1, camE), sx: lerp(rest[0], K.char[0], camE), sy: lerp(rest[1], K.char[1], camE) };
    const wS = o.wisp || [560, 1010];
    const wW = [(wS[0] - rest[0]) / k0 + K.char[0], (wS[1] - rest[1]) / k0 + K.char[1]];   // wisp in world space
    const shoot = clamp(u / (5 / 30));                         // 5 frames out
    const back = V2.U.inOutCubic(clamp((u - 0.17) / 0.45));    // then back to the clutch
    const close = V2.U.inOutSine(clamp(u / 0.65));
    const mu = clamp(u / 0.55);
    return {
      regrab: true, cam, close, flood: clamp((u - 0.05) / 0.6),
      mood: HK.regrabMood(mu), handMood: HK.regrabMood(Math.round(mu * 8) / 8),   // 2D sprites use the quantised mood
      lead: clamp((u - 0.1) / 0.4),
      eyes: t >= 59.42 ? 'squeeze' : 'closed', mouth: t >= 59.42 ? 'zigzag' : 'smile', sweat: clamp((u - 0.3) / 0.3),
      armT: { shoot, back, wisp: wW, grabbed: shoot >= 1 },
      knotForm: clamp(u / 0.2), knotJit: Math.round(clamp(u / 0.2) * 16) / 16, knotR: lerp(26, K.knot[2], V2.U.smoother(clamp(u / 0.65))),
      dash: V2.U.outCubic(clamp((u - 0.05) / 0.27)), implode: true,
      caption: t >= 59.85 ? 'lit' : 'off', captionPane: clamp((u - 0.35) / 0.3),
      needsUnder: clamp((u - 0.05) / 0.6) < 1,     // false once the iris has fully flooded: skip drawing the scene underneath
      // the scene underneath is seen only through the closing aperture: render it cheaply.
      // underComp: pass to its V2.L.render comp (no bloom, grain or vignette: the hook pass adds its own).
      // underLite: true once the aperture is small (close > 0.6): skip expensive extras (moon spokes, water lines,
      // secondary captions). underClip: the aperture polygon (screen px) to cull crisp layers outside it.
      underComp: { levels: close > 0.3 ? 0 : 3, grain: 0, vig: 0, clip: close > 0.15 ? V2.P.path(HK.aperture(HK.apC(t, cam), HK.apR(close, cam) * 1.06 + 6, HK.twist(t) + (1 - close) * 0.9), true) : undefined },
      underLite: close > 0.6,
      underClip: HK.aperture(HK.apC(t, cam), HK.apR(close, cam), HK.twist(t) + (1 - close) * 0.9),
    };
  };
  // ---- the scene underneath, frozen (the recommended path): o.underScene = {key, draw(T, ctx)} on the regrab state.
  // draw renders the act's rest scene (without grabbygrab and his wisp) ONCE, at T = 59.25, into an offscreen full-res
  // canvas (its own GL pass, crisp layers, halos and faces included); every regrab frame then shows that image through
  // the closing aperture. Behind a closing iris nothing in the rest scene needs to move for 0.65 s, and this costs one
  // clipped image draw per frame instead of a second full scene. Pure: the image depends only on the key and 59.25.
  const underCache = new Map();
  HK.UNDER_T = 59.25;
  HK.underImage = function (sc) {
    let c = underCache.get(sc.key);
    if (c) return c;
    c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
    const g = c.getContext('2d');
    const keep = { ctx: V2.ctx, lx: LX.ctx, gj: V2.glowJobs, gw: V2.glowWideJobs, pj: V2.postJobs, cam: V2.camM, T: V2.T };
    V2.ctx = g; LX.ctx = g; V2.glowJobs = []; V2.glowWideJobs = []; V2.postJobs = []; V2.camM = null; V2.T = HK.UNDER_T;
    try { g.save(); sc.draw(HK.UNDER_T, g); g.restore(); V2.camera(g, null); V2.flushGlow(g); V2.flushPost(g); }
    finally { V2.ctx = keep.ctx; LX.ctx = keep.lx; V2.glowJobs = keep.gj; V2.glowWideJobs = keep.gw; V2.postJobs = keep.pj; V2.camM = keep.cam; V2.T = keep.T; }
    underCache.set(sc.key, c);
    if (underCache.size > 2) underCache.delete(underCache.keys().next().value);
    return c;
  };
  // aperture centre and inradius for a regrab camera (JS mirror of HK.frame's geometry, used by underClip)
  HK.apC = (t, cam) => [cam.sx + (K.knot[0] - K.char[0]) * cam.k, cam.sy + (K.knot[1] - K.char[1]) * cam.k];
  HK.apR = (close, cam) => lerp(1500, K.ap * K.knot[2] * cam.k, V2.U.smoother(close));
  // the regrab arm target (world) for a time (pure; the trail ghosts evaluate it at t - i/30)
  const armAt = (A) => { const e = V2.U.outCubic(A.shoot); return [lerp(K.char[0] + 0.62 * K.char[2] * 0.95, A.wisp[0], e), lerp(K.char[1] + 0.3 * K.char[2], A.wisp[1], e)]; };

  // ------------------------------------------------------------------ the rig
  // HK.frame(t, o): draws the full hook frame into V2.ctx (or o.ctx).
  // o: {tight 0..1, close 0..1 (iris: 0 = open past the frame edges, 1 = frame-0 aperture; default 1), flood 0..1,
  //     cam {k, sx, sy} (world (455,965) -> screen (sx,sy) at scale k), caption 'lit'|'off', captionPane 0..1,
  //     notch (iris notches tighter), punch (zoom about the centre, e.g. 1.08 -> 1.0), mood, face {...}, knotR, jit,
  //     animT (the animation clock: freeze everything at animT while the grain keeps running on t), jitT (knot jitter
  //     and tremble clock only), knotSeed (fixed knot shell seed), dash, dashSpeed (cycles/60 s), squash, pose {arm},
  //     under (the aperture shows what is already on ctx, weighted 1 - flood), lift, burst (BURST uniforms override),
  //     flashes [times], comp, extras(ctx, {G, knotC, knotR, M}), noGlowFlush}
  HK.frame = function (t0, o = {}) {
    const ctx = o.ctx || V2.ctx;
    if (o.regrab === undefined && t0 >= 59.25) o = Object.assign(HK.regrab(t0, o), o);
    const t = o.animT ?? t0;                       // animation clock (frozen by animT); t0 drives the grain and caption
    const tight = clamp(o.tight ?? 0);
    const tq = Math.round(tight * 8) / 8;          // quantised for everything that keys a sprite cache (mood, knot jitter)
    const close = clamp(o.close ?? 1), flood = clamp(o.flood ?? 1);
    // tight (15 to 17.55): closer, him larger on the left, the knot nearer the camera and nearer frame centre
    const te = V2.U.inOutSine(tight);
    const cam = o.cam || { k: lerp(1, K.tight.k, te), sx: lerp(K.char[0], K.tight.sx, te), sy: lerp(K.char[1], K.tight.sy, te) };
    const pk = o.punch ?? 1;
    // world -> screen
    const k = cam.k * pk;
    const sx = 540 + (cam.sx - 540) * pk, sy = 675 + (cam.sy - 675) * pk;
    const M = V2.camMat(k, K.char[0], K.char[1], sx, sy);
    const toS = p => [p[0] * M[0] + M[4], p[1] * M[3] + M[5]];

    // ---- pose (world)
    const bp = beatPulse(t);
    const jitT = o.jitT ?? t;
    const seed2 = V2.boil(jitT, 2);
    const trem = 1.2 * (1 + tight);
    const tr = [(hash(seed2 * 1.7) - 0.5) * 2 * trem, (hash(seed2 * 2.9 + 1) - 0.5) * 2 * trem];
    let hand = [K.hand[0] + tr[0], K.hand[1] + tr[1]];
    let fingers = [0, 0, 0, 0, 0];
    let armT = [hand[0], hand[1]], ang = K.hand[2];
    let knotC = [K.knot[0] + tr[0], K.knot[1] + tr[1]];
    let knotR = o.knotR ?? K.knot[2] * (1 + (K.tight.knot - 1) * tq);
    if (o.armT) {          // regrab arm: shoot to the wisp, snap shut, haul it back into the clutch
      const A = o.armT;
      if (A.back <= 0) {
        armT = armAt(A);
        ang = Math.atan2(A.wisp[1] - (K.char[1]), A.wisp[0] - K.char[0]);
        fingers = A.grabbed ? [0, 0, 0, 0, 0] : [1, 1, 1, 1, 1].map(v => v * (1 - V2.U.outCubic(A.shoot) * 0.2));
      } else {
        armT = [lerp(A.wisp[0], hand[0], A.back), lerp(A.wisp[1], hand[1], A.back)];
        ang = lerp(Math.atan2(A.wisp[1] - K.char[1], A.wisp[0] - K.char[0]), K.hand[2], A.back);
      }
      // the knot rides in the fist (same offset as frame 0, rotated with the hand)
      const off = [K.knot[0] - K.hand[0], K.knot[1] - K.hand[1]], da = ang - K.hand[2];
      const ro = V2.U.rot(off, da), sR = knotR / K.knot[2];
      knotC = [armT[0] + ro[0] * lerp(0.5, 1, sR), armT[1] + ro[1] * lerp(0.5, 1, sR)];
      hand = armT;
    }
    const sq = (o.squash ?? 0.04 * (1 + tight)) * bp;
    const moodK = o.mood || (tq > 0 ? V2.grab.mixMood('clench', 'squeeze', tq) : 'clench');
    const G = V2.grab.geo(t, K.char[0], K.char[1], K.char[2], Object.assign({
      squash: sq, boilT: jitT, cam: k,
      mitten: (o.armT && !o.armT.grabbed) ? false : undefined,      // the reach is an open four-finger hand (never a thumbs-up mitten)
      arm: Object.assign({ ext: 1, tx: hand[0], ty: hand[1], ang, sag: 0.10, fingers, hscale: 1.2 }, o.pose || {}),
    }, o.geo || {}));
    // the arm leaves the body at its lower right and comes up into the wrist from below (bent, J-shaped)
    {
      const s = G.s, hx = G.hand.x, hy = G.hand.y, da = [Math.cos(ang), Math.sin(ang)];
      const sh = G.bodyAt(K.shA, 0.88);
      const wr = [hx - da[0] * 0.20 * G.hand.hs, hy - da[1] * 0.20 * G.hand.hs];
      const p1 = [sh[0] + 0.15 * s, sh[1] + 0.07 * s], p2 = [wr[0] - da[0] * 0.13 * s, wr[1] - da[1] * 0.13 * s];
      G.sh = sh;
      G.armPts = []; for (let i = 0; i <= 24; i++) { const u = i / 24, v = 1 - u; G.armPts.push([v * v * v * sh[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * wr[0], v * v * v * sh[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * wr[1]]); }
    }
    // ---- screen-space light geometry
    const kS = toS(knotC), kRS = knotR * k;
    const tw = HK.twist(t, o) + (o.twist || 0);
    const R0 = K.ap * K.knot[2] * k;
    const Rfar = 1500;
    const Rap = lerp(Rfar, R0 * (1 - 0.06 * (o.squeezeIris || 0)), V2.U.smoother(close));
    const twC = tw + (1 - close) * 0.9;
    const lift = (o.lift ?? 0);
    const lf = V2.fx.leadFlash(t, o.flashes || (t < 6 ? [0.40, 1.60] : []));

    // ---- the frozen scene underneath (regrab) is rendered first: it uses its own pane slot and GL pass
    const under = (o.under ?? (flood < 1 && close < 1));
    const underImg = (under && o.underScene) ? HK.underImage(o.underScene) : null;
    // ---- pane: hook ground + pools of light behind the glass (cached)
    V2.L.pane(o.pane || HK.pane, o.paneKey || 'core_hook');
    // ---- GL light pass
    const body = [G.cx * k + M[4], G.cy * k + M[5], G.bw * k, G.bh * k];
    const capR = K.caption.pane;
    const zones = [{ rect: [capR[0], capR[1], capR[2], capR[3] - 50], pad: 30 }, { ell: [body[0], body[1] - body[3] * 0.1, body[2] * 1.1, body[3] * 1.05] }];
    // 0.12: a round prism ring leaves the knot's dark halo (spectral band around a white-hot core), turning with the iris spiral
    const burst = o.burst || (t < 1.5 ? V2.fx.burst(t, 0.12, { kind: 'ring', x: kS[0], y: kS[1], K3: [kRS * 1.34 / 0.6, 0, 0, 1], S: [70, twC, 9, 1.0] })
      : (o.implode ? V2.fx.burst(t, 59.30, { kind: 'inverse', x: kS[0], y: kS[1], K3: [1000, 1, 0, 0], amt: 0.7 * clamp((59.85 - t) / 0.2) }) : { uBurst: [0, 0, 0, 0] }));
    const u = Object.assign({
      uKnot: [kS[0], kS[1], kRS, 1],
      uHookK: [(V2.DBG && V2.DBG.noDash) ? 0 : (o.dash ?? 1) * (1 + 0.25 * tight), o.dashSpeed ?? 90, tight, Math.floor(V2.frame(jitT) / 2)],
      uTint: 0.65, uLens: (V2.DBG && V2.DBG.noLens) ? 0 : 0.35, uDispC: [kS[0], kS[1]], uDisp: 0,
    }, HK.irisUniforms([kS[0], kS[1]], Rap, twC, Object.assign({ flood, lift, darken: clamp(tight * 1.3), k, alpha: lerp(0.45, 0.72, flood) * (1 - 0.12 * tight), glLead: lerp(5, 10, tight) * 0.6 * clamp(k, 0.6, 1.3), colOff: o.colOff }, o.iris || {})),
    V2.grab.uniforms(G, moodK, { k, ox: M[4], oy: M[5] }), V2.L.calm(zones, { floor: 0.12, ellFloor: 0.45, feather: 70 }), burst);
    const comp = Object.assign({ bloomK: 0.28, thresh: 0.80, levels: tight > 0.05 ? 3 : 4, sat: 1.10, vig: 0.45, vigCol: '#1B1466', expo: (1 + 0.08 * lf) * (o.expo ?? 1), bleed: 0.18, t, grainF: V2.frame(t0) }, o.comp || {});
    if (o.lean) { comp.lean = o.lean; comp.leanK = o.leanK; comp.sat = o.sat ?? comp.sat; }
    if (underImg) {                     // the frozen scene underneath, seen only through the (padded) aperture
      const img = underImg;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (close > 0.15) ctx.clip(V2.P.path(HK.aperture([kS[0], kS[1]], Rap * 1.06 + 6, twC), true));
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(img, 0, 0);
      ctx.restore();
    }
    if (under) {
      // the scene underneath is finished first: its faces (post queue) are drawn now, so the closing iris covers them
      // from the outside in. Its halos: while the aperture is still wide (close < 0.3) they stay queued and flush with
      // the hook's at the end (the blades are only at the frame edges); after that they are dropped.
      V2.camera(ctx, null); if (close >= 0.3) { V2.glowJobs = []; V2.glowWideJobs = []; } V2.flushPost(ctx);
      V2.L.render('core_hook', u, Object.assign(comp, { present: false, levels: 3 }));
      // inside the aperture the scene underneath shows with weight 1 - flood; everything else (outside the aperture,
      // and HIS BODY wherever it is: never composited over the scene underneath) is presented at full alpha.
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const ap = V2.P.path(HK.aperture(kS, Rap, twC), true);
      if (flood > 0.004) { ctx.save(); ctx.clip(ap); LX.present(ctx, V2.L.GW, V2.L.GH, 'source-over', flood); ctx.restore(); }
      const keep = new Path2D(); keep.rect(0, 0, 1080, 1350); keep.addPath(V2.P.path(HK.aperture(kS, Rap, twC, true), true));
      keep.ellipse(body[0], body[1], body[2] * 1.02, body[3] * 1.02, 0, 0, TAU);
      ctx.clip(keep, 'nonzero'); LX.present(ctx, V2.L.GW, V2.L.GH);
      ctx.restore();
    } else if (!(V2.DBG && V2.DBG.noGL)) V2.L.render((V2.DBG && V2.DBG.trivial) ? 'core_trivial' : 'core_hook', u, Object.assign(comp, (V2.DBG && V2.DBG.nobloom) ? { levels: 0 } : {}));

    // ---- crisp: the iris in lines (leads, long light lines with inward dashes, glints, lead flash)
    const bodyE = [body[0], body[1], G.bw * k * 1.01, G.bh * k * 1.01];
    const fistE = [G.hand.x * k + M[4], G.hand.y * k + M[5], G.hand.hs * k * 0.75, G.hand.hs * k * 0.75];
    const capOn = (o.caption ?? 'lit') !== 'off';
    HK.irisCrisp(ctx, [kS[0], kS[1]], Rap, twC, Object.assign({ k, flood, flash: lf, leadW: lerp(5, 10, tight) * Math.max(0.6, Math.min(1, k * 1.2)), cut: [bodyE],
      stop: [[capR[0] + 30, capR[1], capR[2] - 30, capR[3] - 30]], flashCut: [fistE, [bodyE[0], bodyE[1], bodyE[2] * 1.08, bodyE[3] * 1.08], ...(capOn ? [[540, 325, 560, 300]] : [])], t, dashSpeed: o.dashSpeed ?? 90, colOff: o.colOff }, o.crisp || {}));

    // ---- character, knot (between body and fist), fist
    V2.camera(ctx, M);
    if (o.armT && o.armT.shoot < 1) {   // 5-frame smear: long-exposure light ghosts of the arm and hand along their path
      const M2 = V2.grab.MOODS.clench;
      V2.fx.trail(3, (i, a) => {
        const tt = t - i / 30; if (tt < 59.25) return;
        const R2 = HK.regrab(tt, o), at = armAt(R2.armT);
        const Gg = V2.grab.geo(tt, K.char[0], K.char[1], K.char[2], { cam: k, mitten: false, arm: { ext: 1, tx: at[0], ty: at[1], sag: 0.1, fingers: [1, 1, 1, 1, 1], hscale: 1.2 } });
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.55;
        ctx.fillStyle = M2.halo; ctx.fill(V2.fx.brush(Gg.armPts.slice(4), Gg.armW * 0.8, { taper: [0.2, 0.3, 0.3, 0.8] }));
        const hp = new Path2D(); V2.grab.handPaths(Gg.hand).forEach(p => hp.addPath(p)); ctx.fill(hp, 'nonzero');
        ctx.restore();
      });
    }
    const face = Object.assign({ eyes: o.eyes || 'squeeze', mouth: o.mouth || 'zigzag', sweat: o.sweat ?? 1, brows: tight > 0.3 ? 'worried' : undefined }, o.face || {});
    const knotJit = (o.knotJit ?? 1) * (o.jit ?? (1 + tq));
    if (!(V2.DBG && V2.DBG.noGrab)) V2.grab.draw(ctx, G, moodK, face, {
      lead: o.lead ?? 1,
      glass: 'gl',
      handMood: o.handMood,
      beforeHand: c => {
        if (o.armT && o.knotForm < 1) V2.grab.wisp(c, t, knotC[0], knotC[1], Math.max(18, knotR * 0.9), { alpha: 1 - o.knotForm * 0.6 });
        V2.grab.knot(c, jitT, knotC[0], knotC[1], knotR, { jit: knotJit, form: o.knotForm ?? 1, flash: lf, seed: o.knotSeed, edge: 1 });
      },
    });
    if (o.extras) o.extras(ctx, { G, knotC, knotR, M });
    V2.camera(ctx, null);

    // ---- caption: V01 neon on its pane (poster: lit from frame 0, re-ignites at 59.85)
    const capMode = o.caption || 'lit';
    if (capMode !== 'off' && !(V2.DBG && V2.DBG.noCap)) {
      V2.shade(ctx, K.caption.pane, V2.PAL.hook.type.pane, 0.55 * (o.captionPane ?? 1));
      V2.type.neon(ctx, t0, { id: 'V01', rows: K.caption.rows, mode: 'poster', core: '#FFF8F2', halo: '#FF2E97' });
    } else if ((o.captionPane ?? 0) > 0) V2.shade(ctx, K.caption.pane, V2.PAL.hook.type.pane, 0.55 * o.captionPane);
    return { G, M, knot: [kS[0], kS[1], kRS], iris: [kS[0], kS[1], Rap, twC], body };
  };
})();
