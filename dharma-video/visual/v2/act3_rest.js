// ACT 3, 54.0 to 59.25: REST, the Moon Room; 59.25 to 60.0 the REGRAB on the core hook rig. LOOK.md 4, 2.7 REST, 5.5.
// 54.0 (singing bowl, "Rest."): Tilopa's white beam slides across and gathers into the moon behind the rose of the 12.0
// saint window, now moonlit (the bookend), and the window lights pane by pane from the moon outward. The moon is pearl
// and cool, a soft disc behind the rose with a blue halo and fine slowly turning spokes spilling past the arch (never a
// hard disc). Moonlight through the window lays the window's own pane colours on the floor where he sleeps, wobbling
// like light on still water; sparse water lines drift; the moon's reflection is a few broken pearl ripples; pearl motes
// drift up in the moonlight. 56.25 one eye opens ("(i will.)"), 57.0 the reflection brightens, 58.5 a pearl wisp drifts
// in and waits in front of him. 59.25 he grabs it (eyes still closed): the core rig closes the hook iris over this room
// (frozen underneath) and lands exactly on frame 0.
(function () {
  const V2 = window.V2, U = V2.U, NS = window.a3_NS;
  const { clamp, lerp, hash, TAU } = U;
  const { R, E } = NS;
  const RS = NS.rest = {};

  // ------------------------------------------------------------------ the room (world = screen at k 1)
  const HIM = [330, 1090], HS = 150;                 // V2.hook.regrab's rest framing (LOOK 5.5)
  const FLOOR = 1060;
  const WIN = V2.window.PRESETS.night;               // arch [810, 540, 190, 1060], rose [810, 780, 128], moon [810, 780, 62]
  const MOON = WIN.moon;
  const PROJ = [-0.55, 1.75, 210, 1000];             // the floor cast, shifted so the window's colours fall where he sleeps
  RS.HIM = HIM;
  // camera: identity, except the 56.25 micro-zoom toward his face (1.00 -> 1.06 over 2 frames; back at 57.45)
  const zoom = t => 1 + 0.06 * (R(t, 56.25, 56.25 + 2 / 30) - R(t, 57.45, 57.45 + 2 / 30));
  const EYE = [HIM[0] + 20, HIM[1] - 0.12 * HS];
  RS.cam = t => { const k = zoom(t); return NS.cam(k, EYE[0], EYE[1], EYE[0], EYE[1]); };
  const xf = (c, p) => NS.toS(c, p);

  // the window lights pane by pane from the moon outward (54.0 to 54.75, in 8 steps: never a grey ghost of itself)
  const build = t => Math.round(E.outCubic(R(t, 54.0, 54.75)) * 8) / 8;
  function winOpts(t, c) {
    const k = c.k, a = xf(c, [WIN.arch[0], WIN.arch[1]]), b = xf(c, [WIN.arch[0], WIN.arch[3]]), ro = xf(c, [WIN.rose[0], WIN.rose[1]]), mo = xf(c, [MOON[0], MOON[1]]);
    return { mode: 'night', arch: [a[0], a[1], WIN.arch[2] * k, b[1]], rose: [ro[0], ro[1], WIN.rose[2] * k], moon: [mo[0], mo[1], MOON[2] * k],
      floorY: xf(c, [0, FLOOR])[1], proj: [PROJ[0], PROJ[1], PROJ[2] * k, xf(c, [0, PROJ[3]])[1]], alpha: 1, build: build(t), value: 0.55, moonFall: 1,
      moonK: [0.9, t * 1.5 * Math.PI / 180, 1, 0.8], gain: 0.95, floor: 0.36, shaft: 0.16 };
  }
  // the pane: night ground, the room's glow around the window, the floor plane, the window panes
  function paneDraw(g, c, wo) {
    V2.ground(g, 'rest');
    NS.paneCam(g, c);
    V2.P.disc(g, MOON[0], MOON[1], 640, '#2E3F7A', 0.55, 'source-over');
    V2.P.disc(g, MOON[0], MOON[1], 300, '#3E55A8', 0.30);
    const fg = g.createLinearGradient(0, FLOOR, 0, 1350); fg.addColorStop(0, '#1A2A62'); fg.addColorStop(1, '#101C48');
    g.fillStyle = fg; g.fillRect(-200, FLOOR, 1500, 500);
    // a soft parallelogram of moonlight in the air, from the window down to the floor where he sleeps
    g.save(); g.globalCompositeOperation = 'screen';
    const sg = g.createLinearGradient(820, 760, 330, 1330); sg.addColorStop(0, 'rgba(201,212,255,0.20)'); sg.addColorStop(0.6, 'rgba(198,163,255,0.10)'); sg.addColorStop(1, 'rgba(159,180,255,0)');
    g.fillStyle = sg; g.beginPath(); g.moveTo(650, 700); g.lineTo(975, 700); g.lineTo(760, 1360); g.lineTo(120, 1360); g.closePath();
    g.filter = 'blur(10px)'; g.fill(); g.filter = 'none'; g.restore();
    g.setTransform(0.5, 0, 0, 0.5, 0, 0);
    V2.window.draw(54, Object.assign({}, wo, { g }));
  }

  // ------------------------------------------------------------------ him
  const asleepMood = V2.grab.MOODS.asleep;
  RS.geo = function (t) {
    const br = 0.025 * V2.osc(t, 12);               // breathing (12 cycles per 60 s), visible at feed size
    return V2.grab.geo(t, HIM[0], HIM[1], HS, { squash: br, mitten: false, arm: { ext: 0, open: 1 }, look: [0.3, 0] });
  };
  const EYE_OPEN = [56.25, 57.45];
  function face(t) {
    const open = t >= EYE_OPEN[0] && t < EYE_OPEN[1];
    if (open) return { eyes: 'one', mouth: 'flat', look: [0.6, -0.2] };
    return { eyes: 'closed', mouth: 'smile' };
  }
  // the open eye, bigger, with a white catchlight (drawn over the face's small dot, after it: V2.post)
  function bigEye(G) {
    const s = G.s * (G.s < 200 ? 1 + 0.25 * clamp((200 - G.s) / 103) : 1);
    const x = G.ex + 0.2 * s, r = 0.064 * s, px = 0.6 * r * 0.45, py = -0.2 * r * 0.4;
    V2.post(cx => {
      cx.save(); cx.fillStyle = V2.INK; cx.beginPath(); cx.ellipse(x + px, G.ey + py, r * 0.88, r * 1.18, 0, 0, TAU); cx.fill();
      cx.fillStyle = '#FFFFFF'; cx.beginPath(); cx.arc(x + px - r * 0.3, G.ey + py - r * 0.42, Math.max(2.2, 0.024 * s), 0, TAU); cx.fill();
      cx.globalAlpha = 0.8; cx.beginPath(); cx.arc(x + px + r * 0.28, G.ey + py + r * 0.4, Math.max(1.2, 0.011 * s), 0, TAU); cx.fill();
      cx.restore();
    });
  }

  // ------------------------------------------------------------------ type
  const V31 = V2.line('V31'), V32 = V2.line('V32'), V33 = V2.line('V33');
  const st = { core: '#F4EFD8', halo: '#4A6BFF', haloMode: 'glow', haloA: 0.8, kind: 'light' };
  function type(ctx, t, G) {
    if (t < 56.8) {
      const a = 1 - R(t, 56.7, 56.8);
      V2.type.light(ctx, t, Object.assign({ words: ['rest.'], word_t: V31.word_t.slice(), rows: [{ n: 1, size: 120, y: 300 }], alpha: a }, st));
      // pre-lit from 55.42 (3 frames before "when"), so "when" blazes on its own frame
      if (t >= 55.42) V2.type.light(ctx, t, Object.assign({ words: ['when', 'he', 'grabs', 'again,'], word_t: V32.word_t.slice(), rows: [{ n: 4, size: 76, y: 430 }], alpha: a * E.smooth(R(t, 55.42, 55.48)) }, st));
    }
    if (t >= 56.6 && t < 57.9) {
      // the creature's deadpan confession, on the dark wall left of the window, a tiny speech tick toward his open eye
      const a = E.smooth(R(t, 56.6, 56.66)) * (1 - R(t, 57.82, 57.9));
      const x = 420, y = 900;
      NS.monoOutlined(ctx, t, '(i will.)', x, y, { size: 44, weight: '500', col: '#F4EFD8', outline: '#0E1838', a, t0: 56.6, cps: 24, align: 'center' });
      const c = RS.cam(t), eye = xf(c, [G.ex + 0.2 * G.s * 1.12, G.ey]);
      const p0 = [x - 40, y + 26], d = [eye[0] - p0[0], eye[1] - p0[1]], L = Math.hypot(d[0], d[1]);
      ctx.save(); ctx.globalAlpha = a * 0.9; ctx.strokeStyle = '#F4EFD8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p0[0] + d[0] / L * 30, p0[1] + d[1] / L * 30); ctx.stroke(); ctx.restore();
    }
    if (t >= 57.0 && t < 59.2) {
      const a = 1 - R(t, 59.1, 59.2);
      V2.type.light(ctx, t, Object.assign({ words: ['just', 'come', 'back.'], word_t: V33.word_t.slice(), rows: [{ n: 3, size: 112, y: 340 }], alpha: a * E.smooth(R(t, 57.0, 57.05)) }, st));
    }
  }

  // ------------------------------------------------------------------ crisp details
  // the moon's reflection on the floor: a few broken, wavy, tapered pearl ripples widening toward you, shimmering slowly
  // and brightening a little on the felt piano (57.0)
  function ripples(ctx, t) {
    const br = 0.8 + 0.35 * E.smooth(R(t, 57.0, 57.6));
    for (let i = 0; i < 5; i++) {
      const y = FLOOR + 22 + i * 26 + i * i * 4, w = 60 + i * 30, cx = MOON[0] - 6 + 10 * Math.sin(t * 0.55 + i * 2.1);
      // each ripple breaks into two or three pieces that slide along it
      const gaps = [-0.18 + 0.10 * Math.sin(t * 0.8 + i * 1.7), 0.22 + 0.10 * Math.sin(t * 0.7 + i * 2.9)];
      const pieces = [[-0.5, gaps[0] - 0.05], [gaps[0] + 0.05, gaps[1] - 0.05], [gaps[1] + 0.05, 0.5]];
      pieces.forEach(([u0, u1], j) => {
        if (u1 - u0 < 0.06) return;
        const pts = []; for (let q = 0; q <= 6; q++) { const u = lerp(u0, u1, q / 6), x = cx + u * w; pts.push([x, y + 3.2 * Math.sin(u * 7 + t * 1.6 + i * 1.3) - 5 * (1 - 4 * u * u)]); }
        V2.lightLine(ctx, pts, { core: '#F4EFD8', halo: '#9FB4FF', w: 2.6 + 0.4 * i, taper: [0.35, 0.0, 0.35, 0.0], gw: 9 + i, ga: 0.4, alpha: (0.5 - 0.05 * i) * br * (0.8 + 0.2 * Math.sin(t * 2.1 + i + j)), op: 'lighter' });
      });
    }
  }
  function water(ctx, t) {
    const ph = TAU * t / 6;
    for (let i = 0; i < 5; i++) {
      const y = FLOOR + 40 + i * i * 13 + 18 * i, amp = 4 + i * 2.2, len = 260 + 90 * i, x0 = 60 + ((i * 397) % 560) + 30 * Math.sin(ph + i * 1.3);
      const pts = []; for (let k = 0; k <= 14; k++) { const u = k / 14, x = x0 + u * len; pts.push([x, y + amp * Math.sin(u * 5.5 + ph + i * 1.7) + 3 * Math.sin(u * 13 - ph * 2 + i)]); }
      V2.lightLine(ctx, pts, { core: i % 2 ? '#C6A3FF' : '#C9D4FF', halo: '#4A6BFF', w: 1.8 + 0.6 * i, taper: [0.3, 0.0, 0.3, 0.0], gw: 7 + i, ga: 0.35, alpha: 0.42 + 0.08 * i, op: 'lighter' });
    }
  }
  const GLINTS = [[150, 560, 16], [438, 690, 11], [985, 300, 13], [640, 470, 9]];
  function glints(ctx, t) { GLINTS.forEach(([x, y, r], i) => NS.glint(ctx, x, y, r, 0.45 + 0.4 * Math.abs(Math.sin(t * (0.6 + 0.2 * i) + i * 1.9)), { col: '#F4EFD8', halo: '#9FB4FF', w: 2.6, n: 6, rot: 0.3 + 0.2 * i })); }
  // pearl motes drifting up through the moonlight between the window and him
  function motes(ctx, t) {
    const p = new Path2D();
    for (let i = 0; i < 14; i++) {
      const sp = 0.07 + 0.05 * hash(i * 3.7), u = ((t * sp + hash(i * 5.3)) % 1 + 1) % 1;
      const x = lerp(380, 780, hash(i * 1.3)) + 14 * Math.sin(t * 0.9 + i * 2), y = 1040 - u * 420, r = 1.8 + 1.8 * hash(i * 8.1);
      const a = Math.min(1, u * 5) * Math.min(1, (1 - u) * 4);
      if (a <= 0.02) continue;
      p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU);
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.75; ctx.fillStyle = '#F4EFD8'; ctx.fill(p); ctx.restore();
    V2.glow(g => { g.globalAlpha = 0.6; g.fillStyle = '#9FB4FF'; g.fill(p); });
  }
  // the wall meets the floor: one drawn line of pearl light (low horizon)
  function horizon(ctx) { V2.lightLine(ctx, [[-10, FLOOR + 1], [540, FLOOR + 2], [1090, FLOOR]], { core: '#C9D4FF', halo: '#4A6BFF', w: 2.2, taper: [0.1, 0.2, 0.1, 0.2], gw: 9, ga: 0.30, alpha: 0.55, op: 'lighter' }); }

  // ------------------------------------------------------------------ the wisp (58.5): a pearl lobe drifting in from the right
  // in front of the window, waiting on the dark wall in front of him by 59.2, bobbing; the rig's arm shoots to exactly this
  // point at 59.25 (RS.TARGET) and the mitten closes on it at 59.43 (drawn by act 3 over the rig until then: A3-1)
  RS.TARGET = [HIM[0] + 205, HIM[1] - 95];              // the arm's thwip target (screen, rest framing)
  const WISP_R = 18;                                     // screen px (reads at 360 px)
  const bobW = t => [3 * Math.sin(t * 5.2), 4 * Math.sin(t * 3.6 + 0.8)];
  RS.wispAt = t => { const u = E.inOutSine(R(t, 58.5, 59.2)), v = 1 - u, b = bobW(t);
    return [lerp(1150, RS.TARGET[0], E.outCubic(u)) + b[0] * u, lerp(930, RS.TARGET[1], u) - 60 * Math.sin(Math.PI * u) + b[1] + 8 * Math.sin(t * 2.2) * v]; };
  RS.drawWisp = function (ctx, t, x, y, r, A) {
    if (A <= 0.01) return;
    V2.glow(g => { g.globalAlpha = 0.75 * A; g.fillStyle = '#9FB4FF'; g.beginPath(); g.arc(x, y, r * 2.4, 0, TAU); g.fill(); }, { wide: true });
    V2.grab.wisp(ctx, t, x, y, r, { alpha: A });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 * A; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.15, r * 0.32, 0, TAU); ctx.fill(); ctx.restore();
  };

  // ------------------------------------------------------------------ the frame
  // o: {noChar} (the regrab's frozen under-scene draws the room without him and his wisp)
  RS.draw = function (t, ctx, o = {}) {
    const c = RS.cam(t), k = c.k;
    const wo = winOpts(t, c);
    const pk = 'a3_rest|' + NS.snap(k, 2048) + '|' + V2.window.paneKey(wo);
    V2.L.pane(g => paneDraw(g, c, wo), pk);
    const win = V2.window.draw(t, Object.assign({}, wo, { g: null }));
    const G = RS.geo(t);
    const Gs = [G.cx * k + c.ox, G.cy * k + c.oy, G.bw * k, G.bh * k];
    // calm zones: captions and him
    const caps = [];
    if (t < 56.8) caps.push([300, 230, 780, 360]); if (t >= 55.42 && t < 56.8) caps.push([200, 395, 880, 470]); if (t >= 57.0 && t < 59.2) caps.push([200, 270, 880, 400]);
    // Tilopa's beam (x 540, from the head-space down to where he was) slides across and gathers into the moon, 54.0 to 54.6
    const mo = xf(c, [MOON[0], MOON[1]]);
    const ub = E.inOutSine(R(t, 54.0, 54.6)), bm = t < 54.7 ? 1 - E.smooth(R(t, 54.32, 54.68)) : 0;
    const moonIn = E.smooth(R(t, 54.08, 54.6));
    const u = Object.assign({}, win.uniforms, {
      uFloor: [xf(c, [0, FLOOR])[1], o.noChar ? 0 : 1, 0, 1],
      uRBeam: [bm * 1.15, lerp(540, mo[0], ub), lerp(390, mo[1] - 40, ub), lerp(1160, mo[1] + 30, E.outCubic(R(t, 54.0, 54.6)))], uRBeamK: [lerp(40, 7, ub), 0, 0, 0],
      uMoonX: [0.35 + 0.65 * moonIn + 0.5 * V2.env(t, 54.5, 2, 0.4), lerp(0.3, 1, moonIn), t * 1.5 * Math.PI / 180, 0.25 + 0.35 * moonIn],
      uLens: o.noChar ? 0 : 0.4,
    }, o.noChar ? { uBody: [0, 0, 1, 1] } : V2.grab.uniforms(G, asleepMood, { k, ox: c.ox, oy: c.oy }),
    V2.L.calm(caps.slice(0, 2).map(b => ({ rect: b, pad: 40 })).concat([{ ell: [Gs[0], Gs[1], Gs[2] * 1.3, Gs[3] * 1.25] }]), { floor: 0.15, ellFloor: 0.5 }));
    // the moon gathers the beam's light (the core moon strength)
    u.uMoon = [u.uMoon[0], u.uMoon[1], u.uMoon[2], 0.55 + 0.45 * moonIn + 0.5 * bm * ub];
    if (!NS.dbg().noGL) V2.L.render('a3_rest', u, Object.assign({ bloomK: 0.26, thresh: 0.62, levels: 4, sat: 1.10, vig: 0.30, bleed: 0.18, vigCol: '#0A1030' }, o.comp || {}));
    // ---- crisp (world)
    V2.camera(ctx, NS.mat(c));
    horizon(ctx);
    V2.camera(ctx, null);
    win.crisp(ctx, { leadW: 3 * k, leadA: 0.6, cut: o.noChar ? [] : [[Gs[0], Gs[1], Gs[2] * 1.04, Gs[3] * 1.04]] });
    V2.camera(ctx, NS.mat(c));
    water(ctx, t);
    ripples(ctx, t);
    glints(ctx, t);
    if (!o.noChar) motes(ctx, t);
    if (!o.noChar) {
      V2.grab.draw(ctx, G, asleepMood, face(t), { glass: 'gl', fringe: 1.5 });
      if (t >= EYE_OPEN[0] && t < EYE_OPEN[1]) bigEye(G);
      if (t >= 58.5) { const w = RS.wispAt(t); RS.drawWisp(ctx, t, w[0], w[1], WISP_R / k, E.smooth(R(t, 58.5, 58.8))); }
    }
    V2.camera(ctx, null);
    if (!o.noType && !NS.dbg().noType) type(ctx, t, G);
  };

  // ------------------------------------------------------------------ 59.25 to 60.0: the regrab on the core hook rig (LOOK 5.5)
  // The rig renders the room ONCE at 59.25 (frozen underneath, without him and the wisp), closes the hook iris over it from
  // the edges, shoots his arm at the wisp (to RS.TARGET, where it waits), forms the crust, eases the camera from the rest
  // framing to the frame-0 framing and re-ignites V01 at 59.85, so frame 1799 flows into frame 0. Act 3 draws the waiting
  // wisp over the rig until the mitten closes on it (59.433), with a spark as it does; and the inward snap of the rays is
  // cold light (cyan, never a grey band or ring).
  RS.regrab = function (t, ctx) {
    const Rg = V2.hook.regrab(t, { wisp: RS.TARGET, rest: [HIM[0], HIM[1], HS] });
    Rg.underScene = { key: 'a3_rest_under', draw: (T, c2) => RS.draw(T, c2, { noChar: true, noType: true, comp: { grain: 0 } }) };
    const ap = V2.hook.apC(t, Rg.cam);
    Rg.burst = V2.fx.burst(t, 59.30, { kind: 'inverse', x: ap[0], y: ap[1], K: [0, 0, 0, 0.32], K2: [0, 0, 1800, 0.12], K3: [1000, 1, 1.0, 0], tint: '#3DF5FF', amt: 0.7 * clamp((59.85 - t) / 0.2) });
    const grab = Rg.armT.grabbed;
    const k0 = HS / V2.hook.K.char[2];
    Rg.extras = (c, info) => {
      const w = Rg.armT.wisp, b = bobW(t);
      if (!grab) RS.drawWisp(c, t, w[0] + b[0] / k0, w[1] + b[1] / k0, WISP_R / k0, 1);
      // the snap: a spark of pearl and magenta as the fist closes on it
      V2.fx.sparks(c, t, 59.433, info.G.hand.x, info.G.hand.y, ['#FFFFFF', '#FF2E97'], { r: 70 / k0 * 0.9, n: 6, w: 5 / k0 });
    };
    V2.hook.frame(t, Rg);
  };
})();
