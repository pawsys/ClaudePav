// ACT 3, 36.0 to 39.0: THE DROP, "he is the sun". LOOK.md 4 (ACT 3), 2.7 DROP, 2.9, 4.1.
// 36.00 whiteout from the orb (capped 0.85 at the centre, 0.40 at the edges), a ray shoot-out and a prism shockwave; within
// 0.3 s the light settles into a flat concentric Hockney sun around him (white, lemon, orange, pink, a thin cyan prism
// ring): he is its white-hot core. Behind it a kaleidoscope rose of Hockney's six clicks half a facet per beat. Below, a
// reverse-perspective fan of flat complementary fields from a vanishing point below the frame (the viewer), with drawn
// light lines on every boundary and four purple trees with pink shadows on the outer edges. 36.75 a second smaller
// shockwave; confetti of light on 16ths; he hops on the beat and waves the open hand. 38.60 "free." writes itself in light.
(function () {
  const V2 = window.V2, U = V2.U, NS = window.a3_NS;
  const { clamp, lerp, hash, TAU } = U;
  const { R, E } = NS;
  const D = NS.drop = {};
  const PAL = V2.PAL.drop;

  // ------------------------------------------------------------------ the world (camera = identity except the punches)
  const C = [540, 780];                 // the sun's centre = his body centre at rest
  const S = 280;                        // his size (body about 390 px, 29% of the frame; with feet about 31%)
  const HZ = 948;                       // horizon (world y)
  const VP = [540, 1730];               // the viewer: the fields fan from here (below the frame)
  D.C = C; D.HZ = HZ; D.VP = VP;
  const hzW = x => HZ + 9 * Math.sin(x * 0.0105 + 1.3) + 5 * Math.sin(x * 0.023 + 0.4);   // mirror of hzS in a3_drop
  D.hzW = hzW;
  const B36 = V2.BOUND.t36;
  const ORB36 = V2.grab.geo(35.967, B36.char[0], B36.char[1], B36.char[2], { arm: B36.arm }).hand.palm.c.slice();

  // fields: boundary angles from straight up (rad), left to right; field 7 is the road (orange, a lemon centre line)
  const FA = [-1.25, -0.66, -0.43, -0.25, -0.058, 0.058, 0.25, 0.43, 0.66, 1.25];
  const FC = ['#1FAE7A', '#FF2E97', '#B6F03C', '#7A2BD1', '#FF7A1A', '#FF2E97', '#B6F03C', '#7A2BD1', '#1FAE7A'];
  // Hockney marks in a few fields: rows of dashes along the furrows (bigger toward the horizon: reverse perspective)
  const FMARK = { 2: ['dash', '#5FB01E'], 6: ['dash', '#5FB01E'], 3: ['dot', '#B98CFF'], 7: ['dot', '#B98CFF'], 5: ['dash', '#C8106C'], 1: ['dot', '#FF8CC6'] };
  const dirOf = th => [Math.sin(th), -Math.cos(th)];
  // the point where a boundary ray from the viewer meets the horizon (world)
  function hitHorizon(th) {
    const d = dirOf(th); let s = (VP[1] - HZ) / Math.cos(th);
    for (let i = 0; i < 6; i++) { const x = VP[0] + d[0] * s, y = VP[1] + d[1] * s; const e = y - hzW(x); s += e / Math.max(0.2, Math.cos(th)); }
    return [VP[0] + d[0] * s, VP[1] + d[1] * s, s];
  }
  D.hitHorizon = hitHorizon;
  const below = (() => { const p = new Path2D(); p.moveTo(-300, 1500); for (let x = -300; x <= 1380; x += 20) p.lineTo(x, hzW(x)); p.lineTo(1380, 1500); p.closePath(); return p; })();
  // the pane: ultramarine ground (violet at the edges), a warm pool behind the sun, the fields (flat, sunlit near the horizon)
  function paneDraw(g, cam) {
    V2.ground(g, 'drop', { c: [540, 760], r: 1050 });
    NS.paneCam(g, cam);
    V2.P.disc(g, C[0], C[1], 900, '#3B2BE8', 0.22);
    g.save(); g.clip(below);
    for (let i = 0; i < FC.length; i++) {
      const a = dirOf(FA[i]), b = dirOf(FA[i + 1]), L = 3200;
      g.fillStyle = FC[i]; g.beginPath(); g.moveTo(VP[0], VP[1]); g.lineTo(VP[0] + a[0] * L, VP[1] + a[1] * L); g.lineTo(VP[0] + b[0] * L, VP[1] + b[1] * L); g.closePath(); g.fill();
      const mk = FMARK[i]; if (!mk) continue;
      g.fillStyle = mk[1]; g.strokeStyle = mk[1]; g.lineCap = 'round';
      const sh = hitHorizon((FA[i] + FA[i + 1]) / 2)[2], s0 = (VP[1] - 1350) / Math.cos((FA[i] + FA[i + 1]) / 2);
      for (let r = 0; r < 5; r++) {
        const u = (r + 0.5) / 5, s = lerp(s0, sh, Math.pow(u, 0.8)), sc = s / 700;
        for (let c = 0; c < 3; c++) {
          const th = lerp(FA[i], FA[i + 1], (c + 0.5 + 0.18 * Math.sin(r * 2.1 + c)) / 3), d = dirOf(th);
          const x = VP[0] + d[0] * s, y = VP[1] + d[1] * s;
          if (mk[0] === 'dash') { g.lineWidth = 7 * sc; g.beginPath(); g.moveTo(x - d[0] * 16 * sc, y - d[1] * 16 * sc); g.lineTo(x + d[0] * 16 * sc, y + d[1] * 16 * sc); g.stroke(); }
          else { g.beginPath(); g.arc(x, y, 5.5 * sc, 0, TAU); g.fill(); }
        }
      }
    }
    // the sunlit far edge (a soft lift toward the horizon, hue kept)
    const lg = g.createLinearGradient(0, HZ - 10, 0, HZ + 120); lg.addColorStop(0, 'rgba(255,240,200,0.18)'); lg.addColorStop(1, 'rgba(255,240,200,0)');
    g.globalCompositeOperation = 'screen'; g.fillStyle = lg; g.fillRect(-300, HZ - 40, 1700, 220);
    // cool coloured shadow at the near edge (violet, never grey)
    const ng = g.createLinearGradient(0, 1130, 0, 1360); ng.addColorStop(0, 'rgba(58,30,158,0)'); ng.addColorStop(1, 'rgba(58,30,158,0.50)');
    g.globalCompositeOperation = 'source-over'; g.fillStyle = ng; g.fillRect(-300, 1150, 1700, 300);
    g.restore();
  }

  // ------------------------------------------------------------------ timing
  const T0 = 36.0;
  const punch = t => 1 + (t >= T0 ? 0.06 * Math.exp(-(Math.round(t * 30) - Math.round(T0 * 30)) / 1.4) : 0) + (t >= 36.75 ? 0.025 * Math.exp(-(Math.round(t * 30) - Math.round(36.75 * 30)) / 1.6) : 0);
  D.cam = t => { const k = punch(t); return NS.cam(k, C[0], C[1], C[0], C[1]); };
  // beat hop: lands on the beat (squash), a 2-frame anticipation crouch, then a hop; loop-safe (beat-locked)
  function hop(t) {
    const ph = V2.beat(t).ph, T1 = 0.17;
    let y = 0, sq = 0;
    if (ph < 0.09) sq = 0.085 * (1 - ph / 0.09);
    else if (ph < T1) sq = 0.045 * Math.sin(Math.PI * (ph - 0.09) / (T1 - 0.09));
    else { const u = (ph - T1) / (1 - T1); y = -Math.sin(Math.PI * u); sq = -0.03 * Math.sin(Math.PI * u); }
    return { y, sq };
  }
  // his geometry (world). 36.0 to 36.4: from the act 2 handoff (BOUND.t36) into the sun, under the whiteout
  D.geo = function (t) {
    const e = E.outCubic(R(t, T0, T0 + 0.40));
    const H = 40 * E.smooth(R(t, 36.25, 36.75));
    const hp = hop(t);
    const x = lerp(B36.char[0], C[0], e), y = lerp(B36.char[1], C[1], e) + hp.y * H, s = lerp(B36.char[2], S, e);
    const bw = 0.62 * s, bh = 0.70 * s;
    const wave = 0.36 * V2.osc(t, 80, 0.9);
    const arm = {
      ext: e, tx: x + bw * 1.02 + 46, ty: y - bh * 0.62, ang: lerp(B36.arm.ang, -1.12 + wave, e), open: 1, sag: lerp(0.25, 0.04, e),
    };
    return V2.grab.geo(t, x, y, s, { squash: hp.sq * (H / 40), arm, look: [0, -0.3] });
  };
  const MOOD = Object.assign({}, V2.grab.MOODS.joy, { emit: 0.46, scr: 0.46, fibreA: 0.22, haloW: 2.2 });
  D.MOOD = MOOD;

  // ------------------------------------------------------------------ type
  const DEEP = '#1B2A8C';
  // "unclench." (C4: one word on screen, blazing on 36.0 and pulsing on 36.75), the meter, V22, and "free."
  const C4 = V2.line('C4'), V22 = V2.line('V22');
  const UNC = { words: ['unclench.'], word_t: [C4.word_t[0]] };
  const uncSpec = t => ({ words: UNC.words, word_t: UNC.word_t, rows: [{ n: 1, size: 140, y: 332, track: 15 * E.outCubic(R(t, T0, 37.28)) }], kind: 'sung' });
  const V22W = { words: ['turns', 'out', 'the', 'joy', 'was'], word_t: V22.word_t.slice(0, 5) };
  const v22Spec = () => ({ words: V22W.words, word_t: V22W.word_t, rows: [{ n: 5, size: 78, y: 180 }], kind: 'light' });
  const FREE_T = V22.word_t[5];                 // 38.60
  const FREE = { x: 540, y: 372, size: 240 };
  D.FREE = FREE; D.FREE_T = FREE_T;
  // the steady "free." after the light-writing: a cached sprite placed exactly on the glyph outline's baseline
  function freeBase() { const G = V2.GLYPHS.free, sc = FREE.size / G.size; return [FREE.x - (G.bbox[0] + G.bbox[2]) / 2 * sc, FREE.y - (G.bbox[1] + G.bbox[3]) / 2 * sc]; }
  D.drawFree = function (ctx, t, A = 1, o = {}) {
    if (t < FREE_T - 0.04 || A <= 0) return null;
    const prog = E.outCubic(R(t, FREE_T - 0.045, FREE_T + 0.08)), fill = E.smooth(R(t, FREE_T + 0.07, FREE_T + 0.15));
    const ig = V2.hit(t, FREE_T, 0.18);
    if (fill < 1) {
      return V2.type.glyphWrite(ctx, 'free', FREE.x, FREE.y, FREE.size, prog, { core: '#FFFFFF', halo: '#C8106C', w: 8.5, fill, alpha: A });
    }
    const sp = NS.wordSprite('free.', 'italic 900 240px "Fraunces"', '#FFFFFF', '#FF3D9A', { size: 240, haloW: 0.10, haloFill: 0.85 });
    const [bx, by] = freeBase();
    // a pink tube rim inside the white core (cached): the light of the tube's glass
    NS.putWord(ctx, sp, bx, by, A, 0.95 * (o.haloA ?? 1));
    V2.glow(g => { g.globalAlpha = 0.35 * A * (1 + ig); g.drawImage(sp.hv, bx + sp.dx, by + sp.dy, sp.w, sp.h); }, { wide: true });
    return null;
  };
  // the meter: sunshinification ▓▓▓▓▓▓▓░░ 78%
  function meter(ctx, t) {
    if (t >= 37.5) return;
    const a = 1 - R(t, 37.42, 37.5);
    const p = 78 * E.outCubic(R(t, 36.05, 37.15));
    const n = Math.round(p / 100 * 9);
    const txt = 'sunshinification ' + '▓'.repeat(n) + '░'.repeat(9 - n) + ' ' + String(Math.round(p)).padStart(2, ' ') + '%';
    NS.monoOutlined(ctx, t, txt, 540, 205, { size: 40, weight: '600', col: '#FFFFFF', outline: DEEP, a, align: 'center' });
  }

  // ------------------------------------------------------------------ crisp world layers
  // field boundaries drawn in light (full res: no aliased GL wedge edges), the road's centre line, the horizon line
  function fieldLines(ctx, t, k) {
    const lines = [];
    for (let i = 1; i < FA.length - 1; i++) {
      const th = FA[i], d = dirOf(th), h = hitHorizon(th);
      const sb = Math.min((VP[1] - 1360) / Math.cos(th), th < 0 ? (VP[0] + 10) / -d[0] : (1090 - VP[0]) / d[0]);
      if (sb >= h[2]) continue;
      const p0 = [VP[0] + d[0] * sb, VP[1] + d[1] * sb];
      lines.push({ pts: [p0, [lerp(p0[0], h[0], 0.5), lerp(p0[1], h[1], 0.5)], [h[0], h[1]]], c: FC[i] });
    }
    lines.forEach(l => V2.lightLine(ctx, l.pts, { core: '#FFF8E8', halo: '#FFF3C4', w: 3.6, taper: [0.0, 1, 0.55, 0.30], gw: 8, ga: 0.22, alpha: 0.62, op: 'lighter' }));
    // the road's lemon centre line (narrow at the viewer, opening away from you)
    const h0 = hitHorizon(0);
    V2.lightLine(ctx, [[540, 1360], [540, (1360 + h0[1]) / 2], [540, h0[1] + 2]], { core: '#FFE45C', halo: '#FF9A1F', w: 6, taper: [0, 1, 0.5, 0.35], gw: 14, ga: 0.5 });
    // the sunlit horizon: one drawn line of light
    const hp = []; for (let x = -20; x <= 1100; x += 30) hp.push([x, hzW(x) - 0.5]);
    V2.lightLine(ctx, hp, { core: '#FFF6DA', halo: '#FFE45C', w: 2.8, taper: [0.08, 0.2, 0.08, 0.2], gw: 10, ga: 0.35, alpha: 0.85, op: 'lighter' });
  }
  // four purple lollipop trees on the outer edges, pink shadows cast toward the viewer and away from the sun
  const TREES = [[64, 31], [170, 23], [914, 26], [1016, 33]];
  function trees(ctx) {
    ctx.save(); ctx.lineCap = 'round';
    TREES.forEach(([x, r], i) => {
      const y = hzW(x) + 4, sd = x < 540 ? -1 : 1, top = y - 22 - r * 1.15;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = V2.rgba(PAL.treeShadow, 0.85);
      ctx.beginPath(); ctx.ellipse(x + sd * r * 1.25, y + 7 + r * 0.12, r * 1.7, r * 0.30, sd * 0.10, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#3A1A8C'; ctx.lineWidth = Math.max(5, r * 0.22); ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x, top + r * 0.6); ctx.stroke();
      ctx.fillStyle = PAL.trees; ctx.beginPath(); ctx.ellipse(x, top, r, r * 1.15, 0, 0, TAU); ctx.fill();
      // the sun side catches light: a drawn rim of lilac light
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(214,190,255,0.85)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, top, r - 2, r * 1.15 - 2, 0, sd > 0 ? Math.PI * 0.75 : -Math.PI * 0.05, sd > 0 ? Math.PI * 1.55 : Math.PI * 0.75); ctx.stroke();
    });
    ctx.restore();
  }

  function confetti(ctx, t, box, avoid) {
    const n16 = Math.floor((t - T0) / 0.1875 + 1e-9), cols = PAL.confetti, groups = cols.map(() => new Path2D());
    const inAvoid = (x, y) => avoid.some(r => x > r[0] && x < r[2] && y > r[1] && y < r[3]);
    for (let v = Math.max(0, n16 - 4); v <= n16; v++) {
      const age = (t - T0) - v * 0.1875;
      for (let i = 0; i < 8; i++) {
        const sd = v * 31.7 + i * 7.13, a = hash(sd) * TAU, r = 1.9 * 0.66 * S + 40 + age * (820 + 600 * hash(sd + 1)), len = 18 + 18 * hash(sd + 2);
        const x0 = C[0] + Math.cos(a) * r, y0 = C[1] + Math.sin(a) * r;
        if (x0 < box[0] || x0 > box[2] || y0 < box[1] || y0 > box[3] || inAvoid(x0, y0)) continue;
        const gp = groups[i % cols.length]; gp.moveTo(x0, y0); gp.lineTo(C[0] + Math.cos(a) * (r + len), C[1] + Math.sin(a) * (r + len));
      }
    }
    V2.glow(g => { g.lineWidth = 8; g.lineCap = 'round'; g.globalAlpha = 0.7; groups.forEach((gp, i) => { g.strokeStyle = cols[i] === '#FFFFFF' ? '#FFE45C' : cols[i]; g.stroke(gp); }); });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineWidth = 4; groups.forEach((gp, i) => { ctx.strokeStyle = cols[i]; ctx.stroke(gp); }); ctx.restore();
  }

  // the glass kites (a3_drop KITE): inner ring r 150..600, outer ring 340..820 (scale 1), waist a third of the way out
  const KITE = { alpha: 0.9, tm: 0.36, hw: 0.40, R: [150, 600, 340, 820] };
  // crisp 2 px glints on the sun-facing (inner) edges of every kite, full res (the GL kite edge is soft at half res),
  // only in the open sky: never over the sun, below the horizon or across a caption
  function kiteGlints(ctx, Cs, rot, sc, sunR, cap, k) {
    const segs = [];
    const vis = (x, y) => y < (C[1] + (hzW(C[0] + (x - Cs[0]) / k) - C[1]) * k + Cs[1] - C[1] * 1) - 6 && Math.hypot(x - Cs[0], y - Cs[1]) > sunR + 12 && !(x > cap[0] && x < cap[2] && y > cap[1] && y < cap[3]);
    [[KITE.R[0], KITE.R[1], rot, 0], [KITE.R[2], KITE.R[3], -1.2 * rot, 0.5]].forEach(([r0, r1, rr, off], ring) => {
      for (let id = 0; id < 12; id++) {
        const th = (id + 0.5 - off) * TAU / 12 - rr;
        [-1, 1].forEach(sd => {
          let cur = null;
          for (let j = 0; j <= 10; j++) {
            const u = j / 10 * KITE.tm, r = (r0 + u * (r1 - r0)) * sc, a = th + sd * KITE.hw * (u / KITE.tm) * TAU / 12;
            const x = Cs[0] + Math.cos(a) * r, y = Cs[1] + Math.sin(a) * r;
            if (vis(x, y)) { if (!cur) { cur = []; segs.push(cur); } cur.push([x, y]); } else cur = null;
          }
        });
      }
    });
    const p = new Path2D(); segs.forEach(sg => { if (sg.length < 2) return; p.moveTo(sg[0][0], sg[0][1]); for (let i = 1; i < sg.length; i++) p.lineTo(sg[i][0], sg[i][1]); });
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.7; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke(p); ctx.restore();
    V2.glow(g => { g.globalAlpha = 0.35; g.strokeStyle = '#FFF3C4'; g.lineWidth = 6; g.stroke(p); });
  }

  // ------------------------------------------------------------------ the frame
  D.draw = function (t, ctx) {
    const cam = D.cam(t), k = cam.k;
    const toS = p => NS.toS(cam, p);
    const G = D.geo(t);
    const Cs = toS(C);
    // pane: static except while the camera punches
    V2.L.pane(g => paneDraw(g, NS.cam(1, 0, 0, 0, 0)), 'a3_drop');
    // ---- type pre-pass (calm zones)
    const capBoxes = [];
    if (t < 37.28) capBoxes.push(V2.type.measure(ctx, t, uncSpec(t)).box, [250, 175, 830, 235]);
    if (t >= 37.5) capBoxes.push(V2.type.measure(ctx, t, v22Spec()).box);
    if (t >= FREE_T) capBoxes.push([230, 255, 850, 455]);
    let cb = [1e9, 1e9, -1e9, -1e9]; capBoxes.forEach(b => { cb = [Math.min(cb[0], b[0]), Math.min(cb[1], b[1]), Math.max(cb[2], b[2]), Math.max(cb[3], b[3])]; });
    // ---- bursts: 36.0 the drop (from the orb, settling onto the sun), 36.75 a smaller shockwave, 38.6 the prism ring of "free."
    let burst;
    // 36.0: the whiteout comes out of the orb in his palm (0.85 there, saturated edges: a3_drop uWhite), a hard white core
    // for 2 frames, the ray shoot-out and the prism shockwave; all of it slides onto the sun as he rises into its core
    const bc = [lerp(ORB36[0], Cs[0], E.smooth(R(t, T0, T0 + 0.25))), lerp(ORB36[1], Cs[1], E.smooth(R(t, T0, T0 + 0.25)))];
    const white = t >= T0 ? 0.85 * V2.env(t, T0, 1, 0.20) : 0;
    if (t < 36.75) burst = V2.fx.burst(t, T0, { kind: 'drop', x: bc[0], y: bc[1], K: [0, 1.1, 0.7, 1.35], K2: [0.8, 1.15, 1500, (Math.round(t * 30) - Math.round(T0 * 30) < 2 ? 2.4 : 1.1)], K3: [150, 0, 0.6, 1], tint: '#FFE45C' });
    else if (t < FREE_T - 0.04) burst = V2.fx.burst(t, 36.75, { kind: 'shock', x: Cs[0], y: Cs[1], amt: 0.8, K3: [380 * k, 0, 0.3, 1], tint: '#FF3D9A' });
    else burst = V2.fx.burst(t, FREE_T, { kind: 'ring', x: FREE.x, y: FREE.y - 10, K3: [200, 0, 0, 1], amt: 0.9, att: 2 });
    const W = white;      // the whiteout level (captions switch to a shadow-halo while it is high)
    // ---- the sun, the rose, the rays
    const age = t - T0;
    const pulse = 1 + 0.028 * Math.exp(-(V2.beat(t).ph * 0.75) / 0.12);
    const Rb = 0.66 * S * k;
    const ringR = [1.05, 1.25, 1.55, 1.90].map((m, i) => m * Rb * E.outBack(R(age, 0.02 + 0.035 * i, 0.30 + 0.035 * i), 1.4) * pulse);
    const kalS = lerp(0.35, 0.84, E.outBack(R(age, 0.04, 0.50), 1.2)) * k;
    const kRot = TAU / 24 * NS.click(t, 0.1);       // half a facet per beat
    const fr = V2.frame(t);
    const u = Object.assign({
      uSunR: ringR, uSunP: [ringR[3] + 9 * k, 4.5 * k, 2.2 * k, 1.12], uSunCol: V2.linArr(['#FFFFFF', '#FFE45C', '#FF8A1F', '#FF6FB5', PAL.prism]),
      uSunC: [Cs[0], Cs[1], 0, 0],
      uRay: [1, ringR[3] + 1900 * E.outCubic(R(age, 0, 0.5)), 0.10 * Math.floor(fr / 2) * 2 / 30, V2.beat(t).i],
      uDropK: [1, 1, 0, 0.30], uCamD: [k, C[0], C[1], HZ],
      uRayCol: V2.linArr(PAL.light),
      uKal: [Cs[0], Cs[1], kRot, kalS], uKalK: [KITE.alpha, KITE.tm, KITE.hw, 0], uKalR: KITE.R, uKalCol: V2.linArr(V2.HOCKNEY6),
      uWhite: [bc[0], bc[1], white, 380 + 700 * (t - T0)],
      uLens: 0.2, uTint: 0.7, uPaneT: [1 / k, C[0] * (1 - 1 / k), C[1] * (1 - 1 / k), 0],
    }, burst, V2.grab.uniforms(G, MOOD, { k, ox: cam.ox, oy: cam.oy }),
    V2.L.calm([{ rect: cb, pad: 40 }, { ell: [G.cx * k + cam.ox, G.cy * k + cam.oy, G.bw * k * 1.25, G.bh * k * 1.2] }], { floor: 0.12, ellFloor: 0.4 }));
    if (!NS.dbg().noGL) V2.L.render('a3_drop', u, { bloomK: 0.18 + 0.10 * V2.hit(t, T0, 0.35) + 0.05 * V2.hit(t, 36.75, 0.3), thresh: 0.84, levels: 4, sat: 1.14 + 0.22 * V2.hit(t, T0, 0.3), vig: 0.26 + 0.12 * V2.hit(t, T0, 0.3), bleed: 0.12, bloomSat: 1.25 });

    // ---- crisp: the kites' glints (screen space), then the world
    if (!NS.dbg().noLines) kiteGlints(ctx, Cs, kRot, kalS, ringR[3] + 9 * k, cb[0] < 1e8 ? [cb[0] - 30, cb[1] - 30, cb[2] + 30, cb[3] + 30] : [0, 0, 0, 0], k);
    V2.camera(ctx, NS.mat(cam));
    if (!NS.dbg().noLines) { fieldLines(ctx, t, k); trees(ctx); }
    // his shadow on the fields: cool violet, smaller while he is up
    const up = clamp((C[1] - G.cy) / 40);
    ctx.save(); ctx.globalAlpha = 0.5 * (1 - 0.45 * up) * E.smooth(R(t, T0, 36.3)); ctx.fillStyle = '#4B1FD0';
    ctx.beginPath(); ctx.ellipse(C[0] + 8, hzW(C[0]) + 52, 150 * (1 - 0.25 * up), 20 * (1 - 0.2 * up), 0, 0, TAU); ctx.fill(); ctx.restore();
    // confetti of light on 16ths (the music-box arpeggio), thrown out of the sun, kept off the captions
    const cbS = [(cb[0] - cam.ox) / k, (cb[1] - cam.oy) / k, (cb[2] - cam.ox) / k, (cb[3] - cam.oy) / k];
    confetti(ctx, t, [0, 0, 1080, hzW(540) - 6], [[cbS[0] - 30, cbS[1] - 30, cbS[2] + 30, cbS[3] + 30]]);
    // him: white-hot glass, the sun's core, waving
    if (!NS.dbg().noGrab) V2.grab.draw(ctx, G, MOOD, { eyes: 'happy', mouth: 'open', blush: 0.25 }, { glass: 'gl', fringe: 2.5 });
    V2.camera(ctx, null);

    // ---- type
    if (NS.dbg().noType) return;
    if (cb[0] < 1e8) V2.shade(ctx, [cb[0] - 40, cb[1] - 30, cb[2] + 40, cb[3] + 30], DEEP, 0.56);
    if (t < 37.28) {
      const a = 1 - R(t, 37.20, 37.28);
      const spec = uncSpec(t);
      const lv = V2.lit(t, { word_t: UNC.word_t }, 'prelit-blaze');
      const k2 = Math.round(t * 30) - Math.round(36.75 * 30); if (k2 >= 0 && k2 < 4) lv.halo[0] = 1.3 - 0.3 * k2 / 4;
      const ws = V2.type.measure(ctx, t, spec).words;
      const sw = clamp((W - 0.12) / 0.3);
      if (sw > 0) V2.type.shadowHalo(ctx, ws, lv.map(v => v * a), DEEP, 0.85 * sw);
      V2.type.shadowHalo(ctx, ws, lv.map(v => v * a), DEEP, 0.55 * (1 - sw));
      V2.type.light(ctx, t, Object.assign(spec, { lit: lv, core: '#FFFFFF', halo: '#FFC23D', haloMode: 'glow', haloA: 0.55 * (1 - sw), alpha: a }));
    }
    meter(ctx, t);
    if (t >= 37.5) {
      V2.type.light(ctx, t, Object.assign(v22Spec(), { core: '#FFFFFF', halo: DEEP, haloMode: 'shadow', shadowA: 0.95, alpha: 1, lit: V2.lit(t, { word_t: V22W.word_t }, 'prelit-blaze', { pre: 0.7 }) }));
    }
    if (t >= FREE_T - 0.04) {
      D.drawFree(ctx, t, 1);
      // six sparks around the word, staggered by a frame
      for (let i = 0; i < 6; i++) {
        // on the sides and below the word only (the line above it stays clean)
        const an = [-0.25, 0.35, 0.95, Math.PI - 0.95, Math.PI - 0.35, Math.PI + 0.25][i] + 0.12 * hash(i * 3.1), t0 = FREE_T + (i % 3) / 30;
        V2.fx.sparks(ctx, t, t0, FREE.x + Math.cos(an) * 360, FREE.y - 6 + Math.sin(an) * 120, ['#FFFFFF', '#FF3D9A'], { r: 66, n: 4, w: 5 });
      }
    }
  };
})();
