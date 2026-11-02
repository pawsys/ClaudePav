// ACT 1 (0 to 18): the clench. LOOK.md 4 "ACT 1", 2.9 hits, 4.1 captions. Pure function of t (5.5).
//   0.00  HOOK A        the core rig (poster), V01 lit, prism ring 0.12, lead flashes 0.40 / 1.60
//   2.25  HOOK B        hard cut to a tight framing on his face (+ the 1.08 punch), iris one notch, NOT YOUR JAW.;
//                       3.00 the aside, gritted teeth and strain marks
//   3.75  A THOUGHT     back to the poster framing; a cyan glass thought bubble; 4.50 the arm shoots (smear); 4.63 the
//                       bubble's ring collapses into the knot with motes of its light
//   5.25  THAT ONE.     freeze (grain runs), a lemon neon ring scribbles round the knot twice, the guilty side-eye
//   6.00  SOME GUY      whip, a burst, then the sunburst settles into the tall glass panel (the one event); the meditator
//                       draws himself in one varying light line under a bodhi canopy; a slow push-in through the hold
//   9.00  ALL           the void; ALL in backlit stained glass (the brightest thing), a few wide shafts dimming with the
//                       sub drop; the 9.40 crack; SUFFERING. ignites
//  10.50  SAME CAUSE    a Hockney joiner: four tilted windows into the same hook world, four minis squeezing on 8ths
//  12.00  THIS GUY      a real camera push into "doing numbers"; the hook world dissolves into the saint window while the
//                       window's rim straightens into the arch; halo, sparkline, the light arrow lands on "guy.", blink
//  13.30  PLATE 01      the window's leads straighten into the plate border: a cyanotype lightbox drawn in light
//  15.00  IT BUZZES     the plate cracks under the caption and falls away: the hook world, tight; fragments at 3 depths;
//                       the leader to a callout rule under the label; 17.00 flash
//  17.55  TAPE-STOP     everything slows to a freeze; saturation drains under a low-chroma violet veil; exposure 0.6
(function () {
  const V2 = window.V2, U = V2.U;
  const { clamp, lerp, hash, TAU } = U;
  const K = V2.hook.K;
  const F = n => n / 30;
  const fr = t => Math.round(t * 30);
  const since = (t, t0) => fr(t) - fr(t0);                 // whole frames since t0 (frame-snapped hits)
  const rgba = V2.rgba;
  const A1 = window.A1 = {};                               // act 1 namespace (debug / reuse inside act 1 only)
  // knot shell seeds whose outline never reads as a heart (no cleft at the top, no point at the bottom; classified offline
  // with a copy of the core's knotBoundary at jit 1.25, see CORE_REQUESTS A1-5). Cycled at 12 Hz wherever act 1 owns
  // the knot's seed (hearts belong to metta, later).
  const KSEEDS = [11,13,40,44,45,71,72,84,91,105,135,150,160,176,177,191,193,195,222,264,269,278,309,355,399,409,412,425,431,438,439,455,459,461,463,468,481,544,551,556,557,559,584,594,626,654,655,656,686,698,701];
  const kseed = (t, k = 0) => KSEEDS[(Math.floor(V2.frame(t) * 0.4) + k) % KSEEDS.length];

  // ================================================================== shared helpers
  // neon caption with its section pane. spec.cut: the scene's start time. A scene that cuts in on its first word's onset
  // shows that word fully lit on the cut frame (the 0.6 / 1.0 / 0.35 / 1.0 flicker started before the cut, so the cut
  // frame would otherwise land on the 0.35 dip and the first image after the cut would be dim)
  const firstFrame = t0 => Math.ceil(t0 * 30 - 1e-6);
  function litCut(t, id, t0) {
    const lv = V2.lit(t, id, 'unlit-ignite');
    if (fr(t) === firstFrame(t0) && lv.state[0] === 'ignite') { lv[0] = 1; lv.halo[0] = 1; lv.state[0] = 'lit'; }
    return lv;
  }
  const neon = (ctx, t, spec) => V2.type.neon(ctx, t, Object.assign({ pane: true }, spec, spec.cut !== undefined ? { lit: litCut(t, spec.id, spec.cut) } : {}));
  // a tapered stroke whose weight varies along its length (0.6x to 1.4x: the pressure of a hand-drawn light line)
  function brushV(pts, w, taper, amp = 0.4, seed = 0) {
    const n = pts.length, Lp = [], Rp = [], tp = taper || [0.06, 0.35, 0.08, 0.2];
    let tot = 0; const acc = [0];
    for (let i = 1; i < n; i++) { tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); acc.push(tot); }
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const u = tot > 0 ? acc[i] / tot : 0;
      let k = 1;
      if (u < tp[0]) k = lerp(tp[1], 1, u / tp[0]); else if (u > 1 - tp[2]) k = lerp(1, tp[3], (u - (1 - tp[2])) / tp[2]);
      k *= 1 + amp * (0.65 * Math.sin(acc[i] / 70 + seed * 2.3) + 0.35 * Math.sin(acc[i] / 23 + seed * 5.1));
      const hw = w * 0.5 * k;
      Lp.push([pts[i][0] - dy * hw, pts[i][1] + dx * hw]); Rp.push([pts[i][0] + dy * hw, pts[i][1] - dx * hw]);
    }
    const p = new Path2D();
    Lp.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]));
    for (let i = Rp.length - 1; i >= 0; i--) p.lineTo(Rp[i][0], Rp[i][1]);
    p.closePath();
    return p;
  }
  // grabbygrab in the hook rig's clenched pose, anywhere and at any size (minis, saint, specimen): the fist where the
  // rig puts it, the arm leaving the body at its lower right and coming up into the wrist (the rig's J-curve)
  function clenchGeo(t, x, y, s, o = {}) {
    const sc = s / K.char[2];
    const hx = x + (K.hand[0] - K.char[0]) * sc + (o.dx || 0), hy = y + (K.hand[1] - K.char[1]) * sc + (o.dy || 0);
    const ang = o.ang ?? K.hand[2];
    const G = V2.grab.geo(t, x, y, s, Object.assign({
      arm: { ext: 1, tx: hx, ty: hy, ang, sag: 0.10, fingers: o.fingers || [0, 0, 0, 0, 0], hscale: 1.2 },
    }, o.geo || {}));
    const da = [Math.cos(ang), Math.sin(ang)], sh = G.bodyAt(K.shA, 0.88);
    const wr = [G.hand.x - da[0] * 0.20 * G.hand.hs, G.hand.y - da[1] * 0.20 * G.hand.hs];
    const p1 = [sh[0] + 0.15 * s, sh[1] + 0.07 * s], p2 = [wr[0] - da[0] * 0.13 * s, wr[1] - da[1] * 0.13 * s];
    G.sh = sh; G.armPts = [];
    for (let i = 0; i <= 24; i++) { const u = i / 24, v = 1 - u; G.armPts.push([v * v * v * sh[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * wr[0], v * v * v * sh[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * wr[1]]); }
    G.knotAt = [x + (K.knot[0] - K.char[0]) * sc + (o.dx || 0), y + (K.knot[1] - K.char[1]) * sc + (o.dy || 0), K.knot[2] * sc];
    return G;
  }
  A1.clenchGeo = clenchGeo;
  // a polyline sampled from a function u -> [x,y]
  const sample = (fn, n) => { const p = []; for (let i = 0; i <= n; i++) p.push(fn(i / n)); return p; };
  // the first fraction `k` of a polyline (by length)
  function partial(pts, k) {
    if (k >= 1) return pts; if (k <= 0) return [];
    let tot = 0; const acc = [0];
    for (let i = 1; i < pts.length; i++) { tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); acc.push(tot); }
    const L = tot * k, out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      if (acc[i] <= L) { out.push(pts[i]); continue; }
      const r = (L - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]);
      out.push([lerp(pts[i - 1][0], pts[i][0], r), lerp(pts[i - 1][1], pts[i][1], r)]); break;
    }
    return out;
  }
  A1.partial = partial;
  // a drawn line of light that draws itself: core + halo (glow queue), pen dot at the tip while drawing
  function drawn(ctx, pts, k, o = {}) {
    const P = partial(pts, k);
    if (P.length < 2) return;
    if (o.vary) {        // variable weight along the stroke (the meditator's single light line)
      const w = o.w || 6, body = brushV(P, w, o.taper || [0.05, 0.4, 0.06, 0.3], o.vary, o.seed || 0), pp = V2.P.path(P);
      V2.glow(g => { g.globalAlpha = (o.ga ?? 0.8) * (o.alpha ?? 1); g.strokeStyle = o.halo || '#7FD8FF'; g.lineWidth = o.gw ?? w * 3.2; g.lineJoin = 'round'; g.stroke(pp); });
      ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.fillStyle = o.core || '#E8F7FF'; ctx.fill(body); ctx.restore();
    } else
    V2.lightLine(ctx, P, Object.assign({ core: '#E8F7FF', halo: '#7FD8FF', w: 6, op: 'source-over', taper: [0.05, 0.4, 0.06, 0.3], ga: 0.8 }, o));
    if (k < 1 && o.pen !== false) {
      const q = P[P.length - 1];
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(q[0], q[1], (o.w || 6) * 0.75, 0, TAU); ctx.fill(); ctx.restore();
      V2.glow(g => { g.fillStyle = o.halo || '#7FD8FF'; g.globalAlpha = 0.55; g.beginPath(); g.arc(q[0], q[1], (o.w || 6) * 2.2, 0, TAU); g.fill(); });   // the pen tip: a small hot point
    }
  }
  A1.drawn = drawn;
  // mono readout with a deep shadow-halo under the typed part (small type over bright glass stays readable)
  function monoInk(ctx, t, text, x, y, o = {}) {
    if (o.t0 !== undefined && t < o.t0) return null;
    const size = Math.max(36, o.size ?? 40), kind = o.weight === '600' ? 'label' : 'mono';
    const n = o.t0 === undefined ? text.length : Math.min(text.length, Math.floor((t - o.t0) * (o.cps ?? 40) + 1e-6));
    const sub = Array.from(text).slice(0, n).join('');
    if (o.pane && sub.length) {
      const c2 = ctx; c2.save(); c2.font = V2.type.font(kind, size); const fw = c2.measureText(text).width; c2.restore();
      const x0 = o.align === 'right' ? x - fw : o.align === 'center' ? x - fw / 2 : x;
      V2.shade(ctx, [Math.round(x0 - 18), Math.round(y - size * 0.62), Math.round(x0 + fw + 18), Math.round(y + size * 0.62)], o.pane, (o.paneA ?? 0.55) * (o.a ?? 1), { feather: 34, r: 18 });
    }
    if (sub.length && (o.inkA ?? 0.75) > 0) {
      ctx.save(); ctx.font = V2.type.font(kind, size); ctx.textBaseline = 'alphabetic';
      const full = ctx.measureText(text).width, x0 = o.align === 'right' ? x - full : o.align === 'center' ? x - full / 2 : x;
      ctx.globalAlpha = (o.a ?? 1) * (o.inkA ?? 0.75); ctx.strokeStyle = o.ink || '#120A3E'; ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.26;
      ctx.strokeText(sub, x0, y + V2.type.baseOff(kind, size)); ctx.restore();
    }
    return V2.type.mono(ctx, t, text, x, y, o);
  }
  A1.monoInk = monoInk;
  // ================================================================== 0.00 to 2.25  HOOK A: the poster (the core rig)
  V2.add(0, 2.25, 'a1_hook', t => { V2.hook.frame(t, {}); });

  // ================================================================== 2.25 to 3.75  HOOK B: not your jaw
  // a hard cut to a tighter framing on his face (the knot half out of frame at the right): "not your jaw" is said to
  // his jaw. 3.00 ("ok, also your jaw"): the zigzag mouth becomes gritted teeth and two short tension ticks jump out
  // of his contour at jaw height on each side (comic strain marks, never whiskers at the mouth corners)
  const JAWCAM = { k: 1.40, sx: 520, sy: 832 };
  function jawMarks(G, t) {
    const k = U.outBack(clamp((t - 3.0) / F(3)));
    if (k <= 0) return;
    const s = G.s, my = G.ey + 0.15 * s, jy = G.cy + 0.06 * s;
    const q = V2.boil(t, 2), jx = (hash(q * 1.9) - 0.5) * 0.008 * s, jy2 = (hash(q * 3.7 + 1) - 0.5) * 0.008 * s;   // strain tremor, 15 fps
    V2.post(c => {
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      // gritted teeth: a rounded slab of light with tooth lines, in ink
      const w = 0.25 * s * k, h = 0.115 * s * k, x0 = G.ex - w / 2 + jx, y0 = my - h / 2 + jy2;
      const P = new Path2D(); P.roundRect(x0, y0, w, h, h * 0.40);
      c.fillStyle = '#FFF6EC'; c.fill(P);
      c.strokeStyle = V2.INK; c.lineWidth = Math.max(4.5, 0.024 * s); c.stroke(P);
      c.lineWidth = Math.max(3, 0.012 * s); c.beginPath();
      c.moveTo(x0 + w * 0.06, y0 + h / 2); c.lineTo(x0 + w * 0.94, y0 + h / 2);
      for (let i = 1; i <= 3; i++) { const x = x0 + w * i / 4; c.moveTo(x, y0 + h * 0.14); c.lineTo(x, y0 + h * 0.86); }
      c.stroke();
      // strain lines: two short parallel dashes just outside the contour at jaw height, each side
      c.lineWidth = Math.max(5, 0.022 * s);
      [-1, 1].forEach(sd => {
        const ex = G.cx + sd * G.bw * 1.05 + jx;
        [-1, 1].forEach(dv => {
          const y = jy + dv * 0.042 * s, L = (dv < 0 ? 0.10 : 0.075) * s * k;
          c.beginPath(); c.moveTo(ex, y); c.lineTo(ex + sd * L, y + dv * 0.018 * s); c.stroke();
        });
      });
      c.restore();
    });
  }
  V2.add(2.25, 3.75, 'a1_jaw', (t, ctx) => {
    const f = since(t, 2.25);
    const punch = f <= 0 ? 1.08 : f === 1 ? 1.04 : 1;               // hard cut + punch-in over 2 frames
    const sw = U.smooth((t - 3.0) / 0.3);                             // 3.00 Rhodes swell: blade saturation +10%
    V2.hook.frame(t, { caption: 'off', notch: 1, punch, cam: JAWCAM, comp: { sat: 1.10 + 0.12 * sw }, lift: 0.05 * sw,
      face: t >= 3.0 ? { mouth: 'none' } : {},
      extras: (c, o) => jawMarks(o.G, t) });
    neon(ctx, t, { id: 'V03', cut: 2.25, rows: [{ n: 3, size: 160, y: 250 }], pane: { rect: [70, 140, 1010, 430] } });
    V2.type.mono(ctx, t, '(ok, also your jaw)', 540, 372, { size: 48, align: 'center', t0: 3.0, cps: 40, cursor: true, col: '#FFF8F2', halo: '#FF2E97', ga: 0.35 });
  });

  // ================================================================== 3.75 to 5.25  A THOUGHT ABOUT LATER
  const SN0 = 4.50;                       // the arm shoots (kalimba grab motif); the bubble pops at 4.633 (+4.62 thwip)
  const REACH = [700, 690];               // where the fist goes (world = screen: the rig camera is 1 here)
  const BUB = (() => {                    // the knot rides in the fist: the bubble sits where the knot arrives
    const ang = Math.atan2(REACH[1] - K.char[1], REACH[0] - K.char[0]), ro = U.rot([K.knot[0] - K.hand[0], K.knot[1] - K.hand[1]], ang - K.hand[2]);
    return [REACH[0] + ro[0], REACH[1] + ro[1]];
  })();
  const BUBR = 112;
  const POP = SN0 + F(4);                 // frame 139: the fist (and knot) reach the bubble
  function snatchArm(t) {
    const f = since(t, SN0);
    if (f < 0) return null;
    const shoot = clamp((f + 1) / 5);
    const back = U.inOutCubic((t - (POP + F(3))) / 0.45);
    return { shoot, back, wisp: REACH, grabbed: true };
  }
  const ARM0 = [K.char[0] + 0.62 * K.char[2] * 0.95, K.char[1] + 0.3 * K.char[2]];   // the rig's reach origin
  const fistAt = t => { const A = snatchArm(t); if (!A) return [K.hand[0], K.hand[1]]; if (A.back <= 0) { const e = U.outCubic(A.shoot); return [lerp(ARM0[0], REACH[0], e), lerp(ARM0[1], REACH[1], e)]; } return [lerp(REACH[0], K.hand[0], A.back), lerp(REACH[1], K.hand[1], A.back)]; };
  // the cyan glass thought bubble: a scalloped cloud of light (light-pen outline #3DF5FF, glass fill at 25%)
  function bubblePath(x, y, rx, ry, n = 9, seed = 3) {
    const p = new Path2D(); const pts = [];
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i / n * TAU; const jr = 1 + 0.06 * (hash(seed + i * 3.1) - 0.5); pts.push([x + Math.cos(a) * rx * jr, y + Math.sin(a) * ry * jr]); }
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const nx = mx - x, ny = my - y, nl = Math.hypot(nx, ny) || 1, bulge = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.42;
      if (i === 0) p.moveTo(a[0], a[1]);
      p.quadraticCurveTo(mx + nx / nl * bulge, my + ny / nl * bulge, b[0], b[1]);
    }
    p.closePath();
    return p;
  }
  function bubble(ctx, t, x, y, k, a) {
    if (k <= 0 || a <= 0) return;
    const rx = BUBR * 1.18 * k, ry = BUBR * 0.86 * k;
    const p = bubblePath(x, y, rx, ry);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = rgba('#06306A', 0.60); ctx.fill(p);
    ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rgba('#3DF5FF', 0.22); ctx.fill(p);
    const gr = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.45, 4, x, y, rx);
    gr.addColorStop(0, rgba('#E8FFFF', 0.28)); gr.addColorStop(0.6, rgba('#3DF5FF', 0)); ctx.fillStyle = gr; ctx.fill(p);
    ctx.globalCompositeOperation = 'source-over'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#C8FCFF'; ctx.lineWidth = 6 * Math.max(0.6, k); ctx.stroke(p);
    ctx.restore();
    V2.glow(g => { g.globalAlpha = 0.85 * a; g.strokeStyle = '#3DF5FF'; g.lineWidth = 22 * k; g.stroke(p); });
    // the thought itself: "later" in mono, plus a tiny calendar tick
    if (k > 0.5) monoInk(ctx, t, 'later', x, Math.round(y - 4), Object.assign({ pane: '#041E48', paneA: 0.7 },  { size: Math.max(36, 46 * k), weight: '600', align: 'center', col: '#E8FFFF', a: a * clamp((k - 0.5) * 2), halo: '#3DF5FF', ga: 0.5 }));
    // thought dots from his head
    const hx = K.char[0] + 0.30 * K.char[2], hy = K.char[1] - 0.62 * K.char[2];
    [[0.30, 13], [0.55, 19], [0.78, 26]].forEach(([u, r], i) => {
      const kk = clamp(k * 3 - i * 0.6); if (kk <= 0) return;
      const px = lerp(hx, x - rx * 0.55, u), py = lerp(hy, y + ry * 0.75, u);
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#C8FCFF'; ctx.lineWidth = 4; ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rgba('#3DF5FF', 0.3);
      ctx.beginPath(); ctx.arc(px, py, r * kk, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.stroke(); ctx.restore();
      V2.glow(g => { g.globalAlpha = 0.7 * a; g.strokeStyle = '#3DF5FF'; g.lineWidth = 12; g.beginPath(); g.arc(px, py, r * kk, 0, TAU); g.stroke(); });
    });
  }
  V2.add(3.75, 5.25, 'a1_later', (t, ctx) => {
    const A = snatchArm(t);
    const pop = V2.hit(t, POP, 0.12);                                     // the light sucked into the knot
    const grow = U.smooth((t - POP) / 0.25);
    const R = V2.hook.frame(t, {
      caption: 'off', notch: 1, armT: A || undefined,
      dash: 0.8 + 2.0 * pop, knotR: K.knot[2] * (1 + 0.15 * grow), jit: 1 + 0.5 * pop + 0.2 * grow,
      comp: { sat: 1.22 },
      extras: (c, o) => {
        // 4.50: the 5-frame smear: streaks of light behind the shooting fist (long exposure of its path)
        const f = since(t, SN0);
        if (f >= 0 && f <= 6) {
          const p1 = fistAt(t), p0 = fistAt(Math.max(SN0 - F(1), t - F(3)));
          const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dl = Math.hypot(dx, dy);
          if (dl > 8) {
            const ux = dx / dl, uy = dy / dl, nx = -uy, ny = ux, fade = f <= 4 ? 1 : 1 - (f - 4) / 3;
            const P = new Path2D(), lines = [];
            for (let i = 0; i < 5; i++) { const off = (i - 2) * 34, L0 = 70 + 30 * Math.abs(i - 2), L1 = L0 + dl * (0.8 - 0.12 * Math.abs(i - 2)) + 60;
              lines.push([[p1[0] - ux * L0 + nx * off, p1[1] - uy * L0 + ny * off], [p1[0] - ux * L1 + nx * off, p1[1] - uy * L1 + ny * off]]); }
            c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = '#FFF4E0'; c.globalAlpha = 0.85 * fade;
            lines.forEach(L => { c.fill(V2.fx.brush([L[0], [lerp(L[0][0], L[1][0], 0.5), lerp(L[0][1], L[1][1], 0.5)], L[1]], 5, { taper: [0.1, 1, 0.9, 0] })); P.moveTo(L[0][0], L[0][1]); P.lineTo(L[1][0], L[1][1]); });
            c.restore();
            V2.glow(g => { g.globalAlpha = 0.6 * fade; g.strokeStyle = '#FF9A3D'; g.lineWidth = 14; g.lineCap = 'round'; g.stroke(P); });
          }
        }
      },
    });
    // the bubble: pops in at 3.75 with a 4-frame overshoot, bobs, and is snatched at 4.633
    const fb = since(t, 3.75);
    const kin = fb < 0 ? 0 : fb >= 4 ? 1 : [0.55, 1.12, 1.04, 1.0][fb];
    if (since(t, POP) < 0) {                          // frame-exact: gone on the pop frame
      const bob = Math.round(5 * V2.osc(t, 80));
      bubble(ctx, t, BUB[0], BUB[1] + bob, kin, 1);
    }
    // the pop: the bubble's cyan ring collapses into the knot and 7 motes of its light spiral in after it (sucked
    // through the iris into the knot; no radial spokes)
    if (since(t, POP) >= 0 && since(t, POP) < 10) {
      const u = (t - POP) / F(8), kn = R.knot;
      const rr = lerp(BUBR * 1.25, kn[2] * 1.05, U.outCubic(clamp(u)));
      if (u < 1) V2.glow(g => { g.globalAlpha = 1 - u; g.strokeStyle = '#3DF5FF'; g.lineWidth = 16; g.beginPath(); g.arc(kn[0], kn[1], rr, 0, TAU); g.stroke(); });
      if (u < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - u; ctx.strokeStyle = '#E8FFFF'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(kn[0], kn[1], rr, 0, TAU); ctx.stroke(); ctx.restore(); }
      const um = clamp((t - POP) / F(9));
      if (um < 1) {
        const motes = new Path2D(), cores = new Path2D();
        for (let i = 0; i < 7; i++) {
          const e = U.inCubic(clamp(um * (1.12 - 0.04 * i))), a = i / 7 * TAU + 0.6 + e * 2.4, r = lerp(BUBR * 1.45, kn[2] * 0.35, e);
          const x = kn[0] + Math.cos(a) * r, y = kn[1] + Math.sin(a) * r, rad = lerp(9, 4, e);
          motes.moveTo(x + rad * 2, y); motes.arc(x, y, rad * 2, 0, TAU); cores.moveTo(x + rad, y); cores.arc(x, y, rad, 0, TAU);
        }
        V2.glow(g => { g.globalAlpha = 0.9 * (1 - um * 0.6); g.fillStyle = '#3DF5FF'; g.fill(motes); });
        ctx.save(); ctx.globalAlpha = 1 - um * 0.5; ctx.fillStyle = '#F2FFFF'; ctx.fill(cores); ctx.restore();
      }
    }
    neon(ctx, t, { id: 'V04', cut: 3.75, rows: [{ n: 2, size: 150, y: 214 }, { n: 2, size: 150, y: 366 }] });
  });

  // ================================================================== 5.25 to 6.00  THAT ONE. (freeze)
  const FZ = { k: 1.10, sx: 400, sy: 950 };
  // the closed lemon neon ring: a tight wobbly scribble, two loops, one per marker squeak (5.30, 5.52)
  function scribbleRing(ctx, t, kn) {
    const loops = [[5.30, 1.66, 1.50, 0], [5.52, 1.56, 1.42, 1]];
    loops.forEach(([t0, kx, ky, i]) => {
      const p = clamp((t - t0) / 0.16); if (p <= 0) return;
      const a0 = -2.5 + i * 0.7, pts = sample(u => { const a = a0 + u * (TAU + 0.55);
        const w = 1 + 0.045 * Math.sin(a * 3 + i * 2) + 0.025 * Math.sin(a * 7 + i * 4) + 0.04 * u;
        return [kn[0] + Math.cos(a - 0.2) * kn[2] * kx * w, kn[1] + Math.sin(a - 0.2) * kn[2] * ky * w - 6 * i]; }, 72);
      drawn(ctx, pts, p, { core: '#FFF6B8', halo: '#FFE45C', w: 10, gw: 30, ga: 1, taper: [0.03, 0.55, 0.05, 0.3], pen: p < 1 });
    });
  }
  // the guilty side-eye: heavy slanted lids over half-moon pupils pushed hard to the corner (toward the circled knot),
  // flicking back to the viewer on "ONE." (5.59); a wobbly mouth; a second sweat drop pops at 5.30 (in world space)
  function guiltyFace(G, t) {
    const s = G.s, ex = G.ex, ey = G.ey;
    const fl = U.outCubic(clamp((t - 5.59) / F(2)));                 // the flick back to camera
    const lx = lerp(1.0, -0.08, fl), ly = lerp(0.15, 0.10, fl);
    const sw2 = t >= 5.30 ? [0.6, 1.18, 1.0][Math.min(2, since(t, 5.30))] : 0;
    V2.post(c => {
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      const lw = Math.max(4.5, 0.036 * s);
      [-1, 1].forEach(sd => {
        const x = ex + sd * 0.2 * s, r = 0.052 * s;
        // the eye: an ink dot slid hard into the corner (toward the circled knot), then flicked back to the viewer
        const px = x + lx * 0.055 * s, py = ey + ly * 0.03 * s;
        c.fillStyle = V2.INK; c.beginPath(); c.ellipse(px, py, r * 0.86, r * 1.12, 0, 0, TAU); c.fill();
        c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(px - r * 0.30 + lx * r * 0.25, py - r * 0.40, Math.max(1.5, 0.016 * s), 0, TAU); c.fill();
        // worried brows, inner ends up (caught); they jump a little higher on the flick
        const by = ey - 0.125 * s - 0.03 * s * fl;
        c.strokeStyle = V2.INK; c.lineWidth = lw; c.beginPath(); c.moveTo(x + sd * 0.105 * s, by + 0.015 * s); c.lineTo(x - sd * 0.035 * s, by - 0.045 * s); c.stroke();
      });
      // a wobbly "~" mouth, a little off to one side
      const my = ey + 0.155 * s, mx = ex - 0.02 * s, w = 0.075 * s;
      c.strokeStyle = V2.INK; c.lineWidth = lw * 0.85; c.beginPath(); c.moveTo(mx - w, my + 0.006 * s);
      c.bezierCurveTo(mx - w * 0.5, my - 0.04 * s, mx - w * 0.1, my - 0.01 * s, mx, my + 0.004 * s);
      c.bezierCurveTo(mx + w * 0.15, my + 0.02 * s, mx + w * 0.55, my + 0.035 * s, mx + w, my - 0.012 * s); c.stroke();
      // the second sweat drop (right temple), popping at 5.30
      if (sw2 > 0) {
        const dx = G.cx + 0.50 * G.bw, dy = G.cy - 0.46 * G.bh, k = sw2;
        const p = new Path2D(); p.moveTo(dx, dy - 0.10 * s * k); p.quadraticCurveTo(dx + 0.06 * s * k, dy, dx, dy + 0.045 * s * k); p.quadraticCurveTo(dx - 0.06 * s * k, dy, dx, dy - 0.10 * s * k);
        c.fillStyle = '#48E5FF'; c.fill(p); c.strokeStyle = '#E8FEFF'; c.lineWidth = Math.max(2, 0.008 * s); c.stroke(p);
        c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(dx - 0.012 * s * k, dy - 0.01 * s * k, 0.014 * s * k, 0.026 * s * k, 0, 0, TAU); c.fill();
      }
      c.restore();
    });
  }
  V2.add(5.25, 6.0, 'a1_thatone', (t, ctx) => {
    const tighten = U.smooth((t - 5.40) / 0.60);                     // 5.40 reverse snare swell: the iris tightens
    const guilt = U.outCubic(clamp((t - 5.30) / 0.2));               // he shrinks a little (caught)
    const R = V2.hook.frame(t, {
      animT: 5.25, caption: 'off', notch: 2, squeezeIris: tighten, expo: 1 - 0.10 * tighten,
      armT: { shoot: 1, back: 1, wisp: REACH, grabbed: true }, knotR: K.knot[2] * 1.15, jit: 1.2,
      cam: FZ, comp: { sat: 1.22 }, geo: { squash: 0.03 * guilt },
      face: { eyes: 'squeeze', mouth: 'none', sweat: 1, ink: 'rgba(0,0,0,0)' },     // the rig's face is replaced (below)
      extras: (c, o) => guiltyFace(o.G, t),
    });
    scribbleRing(ctx, t, R.knot);
    neon(ctx, t, { id: 'V05', cut: 5.25, rows: [{ n: 2, size: 170, y: 270 }] });
  });

  // ================================================================== 6.00 to 9.00  SOME GUY
  // the meditator and the bodhi tree, drawn stroke by stroke on 16ths (6.0 to 7.5): faceless, one cool light-pen line
  const MED = { x: 540, y: 1066 };      // ground point under him
  const GUY_C = [540, 796];             // the sunburst centre (behind his head)
  const medStrokes = (() => {
    const X = MED.x, Y = MED.y, S = [];
    const sm = (pts, per = 8, closed) => LX.smoothPts(pts, per, closed);
    const mir = pts => pts.map(q => [2 * X - q[0], q[1]]);
    // 1 ground: a horizon line of light, kept inside the panel
    S.push({ pts: sample(u => [lerp(X - 272, X + 276, u), Y + 2 * Math.sin(u * 9)], 40), w: 5 });
    // 2 cushion
    S.push({ pts: sample(u => { const a = Math.PI * 0.95 + u * (TAU + 0.5); return [X + Math.cos(a) * 138, Y - 20 + Math.sin(a) * 17]; }, 48), w: 5 });
    // 3 crossed legs: a lens with rounded knees, one loop with an overshoot
    S.push({ multi: [sm([[X - 150, Y - 50], [X - 92, Y - 37], [X, Y - 41], [X + 92, Y - 37], [X + 152, Y - 52], [X + 140, Y - 80], [X + 84, Y - 94], [X + 22, Y - 86], [X - 28, Y - 96], [X - 100, Y - 92], [X - 146, Y - 74], [X - 156, Y - 52]]),
      sm([[X + 118, Y - 74], [X + 50, Y - 62], [X - 20, Y - 50], [X - 70, Y - 46]])], w: 6, body: true });   // crossed legs: one shin over the other
    // 4 / 5 shoulders and arms: from the neck down the sloping shoulder, out to the elbow, in to the hands in the lap
    const arm = [[X - 14, Y - 226], [X - 52, Y - 214], [X - 88, Y - 196], [X - 108, Y - 160], [X - 118, Y - 124], [X - 98, Y - 102], [X - 56, Y - 96], [X - 14, Y - 99]];
    const hands = sample(u => { const a = Math.PI * 0.1 + u * (TAU + 0.3); return [X + Math.cos(a) * 30, Y - 106 + Math.sin(a) * 11]; }, 30);
    S.push({ multi: [sm(arm), sm(mir(arm)), hands], w: 6, body: true });
    // 6 head with a small topknot, overshooting its own start
    S.push({ pts: sample(u => { const a = -2.1 + u * (TAU + 0.45); const r = 40 * (1 + 0.12 * Math.exp(-Math.pow(((a + Math.PI / 2) % TAU + TAU) % TAU, 2) * 12)); return [X + Math.cos(a) * r, Y - 268 + Math.sin(a) * r * 1.08]; }, 56), w: 6.5 });
    // 7 bodhi trunk (to his right, inside the panel), rising and leaning over him
    S.push({ pts: sm([[X + 218, Y], [X + 206, Y - 120], [X + 214, Y - 240], [X + 190, Y - 350], [X + 150, Y - 430]]), w: 7 });
    // 8 branches: short, rising into a canopy over his head (drawn together as one gesture)
    S.push({ multi: [
      sm([[X + 192, Y - 340], [X + 120, Y - 400], [X + 40, Y - 452]]),
      sm([[X + 206, Y - 270], [X + 250, Y - 340], [X + 262, Y - 420]]),
      sm([[X + 150, Y - 430], [X + 118, Y - 510], [X + 60, Y - 566]]),
      sm([[X + 176, Y - 400], [X + 222, Y - 470], [X + 230, Y - 540]]),
      sm([[X + 120, Y - 400], [X + 50, Y - 420], [X - 30, Y - 404]]),
    ], w: 5 });
    // drawing order: head, arms, legs, cushion, ground, trunk, branches (the guy reads from the first 16ths)
    return [S[4], S[3], S[2], S[1], S[0], S[5], S[6]];
  })();
  // bodhi leaves: big heart-shaped glass leaves with a long drip tip, clustered at the branch tips into a canopy
  const LEAVES = (() => {
    const out = [], br = medStrokes[medStrokes.length - 1].multi;
    br.forEach((b, j) => { for (let i = 0; i < 8; i++) {
      const q = b[Math.floor((0.45 + 0.55 * hash(j * 13 + i * 3.7)) * (b.length - 1))];
      const x = q[0] + (hash(i * 5.1 + j) - 0.5) * 70, y = q[1] + (hash(i * 2.3 + j * 3) - 0.5) * 56;
      out.push({ x, y, a: Math.PI / 2 + (hash(i + j * 9.7) - 0.5) * 1.3, L: 46 + 16 * hash(j * 7 + i * 1.9), c: (i + j) % 3 === 0 ? '#1FAE7A' : '#B6F03C', d: hash(i * 3.3 + j * 1.1) }); } });
    return out;
  })();
  // a heart-shaped bodhi leaf (stem at the origin, the long drip tip along +x), as a path in leaf space
  const leafPath = L => { const p = new Path2D(), W = L * 0.42;
    // a cordate base (the notch at the stem), two broad shoulders, a long drip tip along +x
    p.moveTo(L * 0.10, 0);
    p.bezierCurveTo(L * -0.02, -W * 0.9, L * 0.34, -W * 1.15, L * 0.55, -W * 0.55); p.quadraticCurveTo(L * 0.72, -W * 0.12, L * 1.0, 0);
    p.quadraticCurveTo(L * 0.72, W * 0.12, L * 0.55, W * 0.55); p.bezierCurveTo(L * 0.34, W * 1.15, L * -0.02, W * 0.9, L * 0.10, 0); p.closePath(); return p; };
  function meditator(ctx, t) {
    const n16 = (t - 6.0) / 0.1875;                       // one stroke per 16th, each drawn over ~3 frames
    // the head: a soft lit fill inside the ring (a face of light, not a hollow donut)
    const hf = clamp((n16 - 0.3) / 0.6);
    // (final pass) no filled disc: the head is the light line alone (a lit disc in a ring read as a bulb or a helmet)
    if (hf > 0) V2.glow(g => { g.globalAlpha = 0.10 * hf; g.fillStyle = '#7FD8FF'; g.beginPath(); g.ellipse(MED.x, MED.y - 268, 40, 44, 0, 0, TAU); g.fill(); });
    medStrokes.forEach((S, i) => {
      const p = clamp((n16 - i) / 0.55); if (p <= 0) return;
      const tree = i >= medStrokes.length - 2;
      const o = { w: S.w, core: tree ? '#F2FFE8' : '#F2FAFF', halo: tree ? '#B6F03C' : '#7FD8FF', gw: S.w * 2.6, ga: 0.55, vary: 0.4, seed: i };
      if (S.multi && S.body) S.multi.forEach((m, j) => { const q = j < (S.multi.length > 2 ? 2 : 1) ? p : clamp(p * 2 - 1); if (q > 0) drawn(ctx, m, U.outCubic(q), Object.assign({}, o, { pen: j < 2, seed: i * 3 + j })); });
      else if (S.multi) S.multi.forEach((m, j) => drawn(ctx, m, clamp(p * 1.3 - j * 0.1), Object.assign({}, o, { pen: false, seed: i * 3 + j })));
      else drawn(ctx, S.pts, U.outCubic(p), o);
    });
    // a thin gold halo round his head (the centre of the sunburst): the comic grand reveal
    const hk = clamp((n16 - 0.4) / 0.8);
    if (hk > 0) drawn(ctx, sample(u => { const a = -1.2 + u * (TAU + 0.3); return [MED.x + Math.cos(a) * 64, MED.y - 268 + Math.sin(a) * 66]; }, 60), U.outCubic(hk),
      { core: '#FFF0B8', halo: '#FFB43C', w: 4, gw: 12, ga: 0.8, pen: false });
    // the canopy: leaves pop in on the 16ths after the branches and sway on the bar (visible, 0.15 rad)
    const lk = (t - 7.32) / 0.4;
    if (lk > 0) {
      const groups = { '#B6F03C': new Path2D(), '#1FAE7A': new Path2D() }, ribs = new Path2D();
      LEAVES.forEach(L => { const k = clamp((lk - L.d * 0.8) * 4); if (k <= 0) return;
        const a = L.a + 0.15 * V2.osc(t, 20, L.d * 6), l = L.L * U.outBack(k), cs = Math.cos(a), sn = Math.sin(a);
        groups[L.c].addPath(leafPath(l), new DOMMatrix([cs, sn, -sn, cs, L.x, L.y]));
        ribs.moveTo(L.x + cs * l * 0.08, L.y + sn * l * 0.08); ribs.lineTo(L.x + cs * l * 0.8, L.y + sn * l * 0.8); });
      ctx.save(); for (const c in groups) { ctx.fillStyle = c; ctx.globalAlpha = 0.86; ctx.fill(groups[c]); }
      ctx.globalAlpha = 0.5; ctx.strokeStyle = '#F2FFE8'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke(ribs); ctx.restore();
      V2.glow(g => { g.globalAlpha = 0.5; for (const c in groups) { g.fillStyle = c; g.fill(groups[c]); } });
    }
  }
  const GUY_PANEL = [540, 400, 300, 1210];
  const guyPane = g => {
    V2.ground(g, 'guy');
    V2.P.rgrad(g, 540, 800, 1000, [[0, '#24379E'], [0.6, '#1B2A8C'], [1, '#141F70']]);
    // the tall window panel: ultramarine glass (#2B4BFF at 25%) in front of the ground, a lit inner rim
    const P = panelPath(GUY_PANEL, 0);
    // (inside, the glass is deep: the light drawing has to read on it; a lit rim of #2B4BFF at its edge)
    g.save(); g.fillStyle = rgba('#0C1460', 0.55); g.fill(P);
    g.clip(P); g.globalCompositeOperation = 'screen'; g.strokeStyle = rgba('#2B4BFF', 0.55); g.lineWidth = 46; g.stroke(P);
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba('#7FD8FF', 0.18); g.lineWidth = 14; g.stroke(P); g.restore();
  };
  function panelPath(Pn, grow) {
    const [cx, ay, hw, by] = Pn, r = hw + grow, yc = ay + hw;
    const p = new Path2D(); p.moveTo(cx - r, by + grow); p.lineTo(cx - r, yc); p.arc(cx, yc, r, Math.PI, 0); p.lineTo(cx + r, by + grow); p.closePath();
    return p;
  }
  const GLIN = c => V2.lin(c);
  V2.add(6.0, 9.0, 'a1_guy', (t, ctx) => {
    const f = since(t, 6.0);
    const whip = f < 6 ? 1 - f / 6 : 0;
    const reveal = 60 + 1700 * U.outExpo(clamp((t - 6.0) / 0.5));
    // snares on beats 2 and 4 of each bar (6.75, 8.25): the wedges kick
    const sn = Math.max(V2.hit(t, 6.75, 0.18), V2.hit(t, 8.25, 0.18));
    const kick = [6.75, 8.25].some(t0 => since(t, t0) >= 0 && since(t, t0) < 6) ? Math.max(...[6.75, 8.25].map(t0 => { const k = since(t, t0); return k >= 0 && k < 6 ? 1 - k / 6 : 0; })) : 0;
    // after the burst the wedges outside the panel settle to a calm field (35%, half way to the ground's ultramarine):
    // the panel is the one event. They kick back to 70% for 6 frames on the snares.
    const settle = U.smooth((t - 6.12) / 0.48);
    // (final pass) the outside field settles further (14%, two thirds of the way to the ground): the arch is the event
    const outA = Math.max(lerp(0.92, 0.14, settle), 0.55 * kick), outMix = lerp(0, 0.66, settle) * (1 - 0.6 * kick);
    // the suspense hold (7.44 to 9.0): a slow push-in on the meditator, 1.00 to 1.06
    const z = 1 + 0.06 * U.inOutSine(clamp((t - 7.44) / 1.56)), ZC = [MED.x, MED.y - 190];
    const rot = TAU * t / 60 * 0.5;                                  // half a turn per minute (scene-local, not at the seam)
    const cap = V2.type.measure(ctx, t, { id: 'V06', rows: [{ n: 2, size: 118, y: 196 }, { n: 4, size: 118, y: 322 }] }, 'neon');
    V2.L.pane(guyPane, 'a1_guy');
    const cx = GUY_C[0] + 520 * whip * whip;                         // the whip lands on the centre
    V2.L.render('a1_guy', Object.assign({
      uGuy: [cx, GUY_C[1], reveal, rot], uGuyK: [sn, whip, 0.15, 1], uPanel: GUY_PANEL, uGuyZ: [ZC[0], ZC[1], z, 0], uGuyO: [outA, outMix, 0, 0], uGuyF: [MED.x, MED.y, U.smooth((t - 6.05) / 0.5), 0],
      uWA: GLIN('#FF8A1F'), uWB: GLIN('#FF2E97'), uWS: GLIN('#FF1A2E'), uTint: 0.6,
    }, V2.fx.burst(t, 6.0, { kind: 'jewel', x: GUY_C[0], y: GUY_C[1], K: [0, 0, 0, 0.9], K2: [0, 0, 1500, 0.45], K3: [60, 0, 0.5, 1], tint: '#FFB45C', att: 1, decay: 0.20 }),
    V2.L.calm([{ rect: cap.box, pad: 50 }, { ell: [MED.x, MED.y - 170, 170 * z, 230 * z] }], { floor: 0.2, ellFloor: 0.35 })),
    { bloomK: 0.24, thresh: 0.78, levels: 4, sat: 1.08, vig: 0.42, vigCol: '#120A3E' });
    // the world inside the push-in camera: the panel's lead + glint, the light drawing, the canopy
    V2.camera(ctx, [z, 0, 0, z, ZC[0] * (1 - z), ZC[1] * (1 - z)]);
    const pp = panelPath(GUY_PANEL, 0);
    V2.P.lead(ctx, pp, { w: 6, a: 0.75 });
    meditator(ctx, t);
    V2.camera(ctx, null);
    // the whip: streaked dashes of light, horizontal, decaying over 6 frames
    if (whip > 0) {
      const P = new Path2D();
      for (let i = 0; i < 26; i++) { const y = 80 + 1200 * hash(i * 3.7), x = 1080 * hash(i * 5.3 + 1), L = (200 + 500 * hash(i * 1.3)) * whip; P.moveTo(x - L, y); P.lineTo(x + L * 0.3, y); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#FFFFFF'; ctx.lineCap = 'round'; ctx.lineWidth = 6; ctx.globalAlpha = whip; ctx.stroke(P); ctx.restore();
      V2.glow(g => { g.globalAlpha = whip; g.strokeStyle = '#FF2E97'; g.lineWidth = 24; g.stroke(P); });
    }
    neon(ctx, t, { id: 'V06', rows: [{ n: 2, size: 118, y: 196 }, { n: 4, size: 118, y: 322 }], pane: { a: 0.58 } });
    // the aside, on its own small pane inside the foot of the panel (two lines: it fits the 560 px inside the arch)
    if (t >= 6.6) V2.shade(ctx, [262, 1092, 818, 1196], '#120A3E', 0.55, { feather: 34, r: 24 });
    const A1s = '~500 BCE · n=1', A2s = 'still replicates';
    V2.type.mono(ctx, t, A1s, 540, 1120, { size: 40, align: 'center', t0: 6.6, cps: 60, cursor: t < 6.6 + A1s.length / 60, col: '#E8F7FF', halo: '#7FD8FF', ga: 0.4 });
    V2.type.mono(ctx, t, A2s, 540, 1168, { size: 40, align: 'center', t0: 6.6 + A1s.length / 60 + 0.05, cps: 60, cursor: true, col: '#E8F7FF', halo: '#7FD8FF', ga: 0.4 });
  });

  // ================================================================== 9.00 to 10.50  ALL (stained glass in the void)
  const ALLG = (() => {
    // geometry: Anton ALL fitted to ~960 px wide, centred at y 772; each letter cut into panes by straight cames
    const size = 712;
    const c = document.createElement('canvas').getContext('2d');
    c.font = `400 ${size}px "Anton"`;
    return { size, c };
  })();
  let allCache = null;
  function allBuild() {
    if (allCache) return allCache;
    const c = ALLG.c; let size = ALLG.size;
    c.font = `400 ${size}px "Anton"`;
    const tw = c.measureText('ALL').width; if (tw > 0) size = size * 960 / tw;
    c.font = `400 ${size}px "Anton"`;
    const base = 772 + 0.36 * size;
    const ws = ['A', 'L', 'L'].map(ch => c.measureText(ch).width), sp = (960 - ws.reduce((a, b) => a + b, 0)) / 2;
    let x = 60;
    const letters = ws.map((w, i) => { const L = { ch: 'ALL'[i], x, w }; x += w + Math.max(0, sp); return L; });
    // optical centring: shift the layout so the INK (not the advance widths) is centred on 540
    { const m0 = c.measureText('A'), m2 = c.measureText('L');
      const inkL = letters[0].x - (m0.actualBoundingBoxLeft || 0), inkR = letters[2].x + (m2.actualBoundingBoxRight || letters[2].w);
      const dx = 540 - (inkL + inkR) / 2; letters.forEach(L => { L.x += dx; }); }
    // the real glyph top (Anton's cap height measured, not assumed), so the panes reach the apex of the A
    const mA = c.measureText('A'), capH = (mA.actualBoundingBoxAscent || size * 0.80) + 2, top = base - capH;
    // panes: split each letter's box by 4 or 5 straight cames (convex polygon clipping)
    const split = (poly, p, n) => { const A = [], B = []; const side = q => (q[0] - p[0]) * n[0] + (q[1] - p[1]) * n[1];
      for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], sa = side(a), sb = side(b);
        if (sa >= 0) A.push(a); else B.push(a);
        if ((sa >= 0) !== (sb >= 0)) { const r = sa / (sa - sb); const q = [lerp(a[0], b[0], r), lerp(a[1], b[1], r)]; A.push(q); B.push(q); } }
      return [A, B].filter(P => P.length >= 3); };
    const COLS = ['#FFD23C', '#FF7A1A', '#E8412B'];
    // cames follow the letters: three bands across each letter (gently tilted) and one cut through the foot / apex
    const CAMES = [
      [[0.5, 0.31, 0.10], [0.5, 0.58, -0.07], [0.5, 0.83, 0.05], [0.50, 0.15, 1.45], [0.22, 0.70, 1.12, 1], [0.80, 0.45, 2.02, 1], [0.70, 0.93, 0.35, 1], [0.32, 0.40, 0.9, 1]],
      [[0.5, 0.24, 0.07], [0.5, 0.50, -0.06], [0.5, 0.74, 0.06], [0.58, 0.90, 1.40], [0.45, 0.36, 1.25, 1], [0.50, 0.62, 1.90, 1], [0.50, 0.12, 0.6, 1], [0.84, 0.92, 1.25, 1]],
      [[0.5, 0.20, -0.06], [0.5, 0.45, 0.07], [0.5, 0.70, -0.05], [0.66, 0.90, 1.70], [0.50, 0.32, 1.95, 1], [0.48, 0.58, 1.20, 1], [0.50, 0.85, 1.80, 1], [0.40, 0.08, 0.7, 1]],
    ];
    const panes = [], cames = [];
    letters.forEach((L, li) => {
      let polys = [[[L.x - 6, top - 12], [L.x + L.w + 6, top - 12], [L.x + L.w + 6, base + 8], [L.x - 6, base + 8]]];
      // a came with a 4th entry is LOCAL: it cuts only the pane it starts in (stained glass is a quilt, not a grid)
      const inside = (P, q) => { let sg = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], c = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]); if (Math.abs(c) < 1e-9) continue; if (sg === 0) sg = Math.sign(c); else if (Math.sign(c) !== sg) return false; } return true; };
      CAMES[li].forEach(([fx, fy, a, local]) => {
        const p = [L.x + L.w * fx, top + capH * fy], n = [Math.sin(a), -Math.cos(a)];
        polys = polys.flatMap(P => (!local || inside(P, p)) ? split(P, p, n) : [P]);
        cames.push({ p, d: [Math.cos(a), Math.sin(a)], li });
      });
      polys.sort((A, B) => A.reduce((s2, q) => s2 + q[1], 0) / A.length - B.reduce((s2, q) => s2 + q[1], 0) / B.length);
      polys.forEach((P, i) => {
        let mx = 0, my = 0; P.forEach(q => { mx += q[0]; my += q[1]; }); mx /= P.length; my /= P.length;
        const d = Math.hypot((mx - (L.x + L.w / 2)) / (L.w * 0.5), (my - (top + capH * 0.52)) / (capH * 0.5)) + (hash(li * 5.3 + i * 2.9) - 0.5) * 0.7;
        panes.push({ P, li, c: COLS[d < 0.55 ? 0 : d < 1.0 ? 1 : 2], v: 0.84 + 0.14 * hash(li * 3.1 + i * 1.7) }); });
    });
    // the glyphs: outlines drawn per letter; the fill is ONE mask image (destination-in with several fillText calls would
    // keep only their intersection)
    const mask = document.createElement('canvas'); mask.width = 1080; mask.height = 1350;
    { const mg = mask.getContext('2d'); mg.font = `400 ${size}px "Anton"`; mg.textBaseline = 'alphabetic'; mg.fillStyle = '#FFFFFF'; letters.forEach(L => mg.fillText(L.ch, L.x, base)); }
    const glyphs = (g, fill) => { if (fill) { g.drawImage(mask, 0, 0); return; } g.font = `400 ${size}px "Anton"`; g.textBaseline = 'alphabetic'; letters.forEach(L => g.strokeText(L.ch, L.x, base)); };
    // crisp layer (full res, cached): lead cames inside the letters, the glyph outline in lead, glints on the upper-left edges
    const bx = 30, by = Math.floor(top - 40), bw = 1020, bh = Math.ceil(base - top + 80);
    const crisp = document.createElement('canvas'); crisp.width = bw; crisp.height = bh;
    const cg = crisp.getContext('2d'); cg.translate(-bx, -by); cg.lineCap = 'round'; cg.lineJoin = 'round';
    // the leads are the panes' own edges; each pane catches a 2 px glint just inside its upper-left edges
    { const lead = new Path2D(), glint = new Path2D();
      panes.forEach(Pn => { const P = Pn.P; let mx = 0, my = 0; P.forEach(q => { mx += q[0]; my += q[1]; }); mx /= P.length; my /= P.length;
        for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; lead.moveTo(a[0], a[1]); lead.lineTo(b[0], b[1]);
          let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
          if (nx * (mx - a[0]) + ny * (my - a[1]) < 0) { nx = -nx; ny = -ny; }          // inward normal
          if (nx + ny > 0.5) { const L2 = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L2 < 40) continue; const k0 = 16 / L2;
            glint.moveTo(lerp(a[0], b[0], k0) + nx * 8, lerp(a[1], b[1], k0) + ny * 8); glint.lineTo(lerp(a[0], b[0], 1 - k0) + nx * 8, lerp(a[1], b[1], 1 - k0) + ny * 8); } } });
      cg.strokeStyle = '#0E0830'; cg.lineWidth = 9; cg.stroke(lead);
      cg.strokeStyle = 'rgba(255,250,230,0.8)'; cg.lineWidth = 2.2; cg.stroke(glint); }
    cg.globalCompositeOperation = 'destination-in'; cg.fillStyle = '#FFFFFF'; glyphs(cg, true);
    cg.globalCompositeOperation = 'source-over'; cg.strokeStyle = '#0E0830'; cg.lineWidth = 12; glyphs(cg, false);
    cg.globalCompositeOperation = 'lighter'; cg.strokeStyle = 'rgba(255,240,200,0.7)'; cg.lineWidth = 2.5; cg.save(); cg.translate(-4, -4); glyphs(cg, false); cg.restore();
    // the pane paint (drawn into the GL pane: half res, cached by key)
    const paint = g => {
      const sc = document.createElement('canvas'); sc.width = 1080; sc.height = 1350; const s2 = sc.getContext('2d');
      panes.forEach(Pn => { const P = V2.P.path(Pn.P, true);
        let mx = 0, my = 0; Pn.P.forEach(q => { mx += q[0]; my += q[1]; }); mx /= Pn.P.length; my /= Pn.P.length;
        const sc2 = k => '#' + V2.hex(Pn.c).map(v => Math.min(255, Math.round(v * k)).toString(16).padStart(2, '0')).join('');
        const gr = s2.createRadialGradient(mx - 20, my - 30, 4, mx, my, 260);
        gr.addColorStop(0, sc2(Pn.v * 1.12)); gr.addColorStop(0.6, sc2(Pn.v)); gr.addColorStop(1, sc2(Pn.v * 0.74));
        s2.fillStyle = gr; s2.fill(P); });
      s2.globalCompositeOperation = 'destination-in'; s2.fillStyle = '#FFFFFF'; glyphs(s2, true);
      g.drawImage(sc, 0, 0);
    };
    allCache = { size, base, top, capH, letters, crisp, bx, by, paint, cames };
    return allCache;
  }
  // the crack polyline (9.40): jagged, top to bottom, through the void behind the letters
  const CRACK = (() => { const p = []; for (let i = 0; i < 8; i++) { const y = -20 + i * 1390 / 7; p.push([600 + (hash(i * 4.7) - 0.5) * 260 - i * 18, y]); } return p; })();
  const allPane = g => {
    g.fillStyle = '#0A0618'; g.fillRect(0, 0, 1080, 1350);
    // the light behind the glass leaks a little round the letters (a deep warm haze; the void stays dark at the edges)
    V2.P.rgrad(g, 540, 760, 640, [[0, 'rgba(150,30,50,0.40)'], [0.5, 'rgba(90,14,60,0.22)'], [1, 'rgba(10,6,24,0)']]);
    allBuild().paint(g);
  };
  V2.add(9.0, 10.5, 'a1_all', (t, ctx) => {
    const B = allBuild();
    const f = since(t, 9.0);
    const rayK = 0.6 + 0.4 * Math.exp(-Math.max(0, t - 9.0) / 0.40);   // the rays dim with the sub drop (the glass stays lit)
    const pour = 0.55 + 0.45 * U.outCubic(clamp((f + 1) / 4));        // the rays shoot out over 4 frames
    const crack = V2.fx.leadFlash(t, [9.40]);
    const trem = [(hash(V2.boil(t, 2) * 1.3) - 0.5) * 4, (hash(V2.boil(t, 2) * 2.1 + 1) - 0.5) * 4];   // 2 px tremor
    V2.L.pane(allPane, 'a1_all');
    const cr = new Float32Array(16); CRACK.forEach((q, i) => { cr[i * 2] = q[0]; cr[i * 2 + 1] = q[1]; });
    const lt = new Float32Array(12); B.letters.forEach((L, i) => lt.set([L.x + L.w / 2, B.top + B.capH * 0.52, L.w * 0.55, B.capH * 0.55], i * 4));
    V2.L.render('a1_all', { uAll: [540, 760, rayK, 1.1 * pour], uAllT: [trem[0], trem[1], V2.osc(t, 2) * 20, crack], uLet: { v4: lt }, uCrack: { v2: cr }, uTint: 0.5 },
      { bloomK: 0.30, thresh: 0.80, levels: 5, sat: 1.12, vig: 0.40, vigCol: '#2A0A30', bleed: 0.10, pulse: false });
    ctx.drawImage(B.crisp, B.bx + trem[0], B.by + trem[1]);
    // OF (lit from 9.0) and SUFFERING. (ignites at 9.61), at 112 px (cap height 80, the clenched-half minimum)
    V2.type.neon(ctx, t, { words: ['OF'], word_t: [9.0], rows: [{ n: 1, size: 112, y: 222 }], mode: 'lit' });
    V2.type.neon(ctx, t, { id: 'V07b', rows: [{ n: 1, size: 112, y: 1138 }] });
  });

  // ================================================================== 10.50 to 12.00  SAME CAUSE: the joiner
  // four tilted glass windows (2x2) into the same hook world, each tinted at its rim, overlapping its neighbour along the
  // whole seam (6 to 12 px) so the overlaps glow. The four minis squeeze on 8ths, one 16th apart.
  const JV = [628, 975], JK = 0.42;
  const CELLS = [
    { c: [272, 326], rot: -0.032, tint: '#1E4FD8', label: ['money'], t: 10.50 },
    { c: [799, 320], rot: -0.016, tint: '#FF2E97', label: ['jhanas'], t: 10.6875 },
    { c: [268, 988], rot: 0.018, tint: '#1FAE7A', label: ['being right'], t: 10.875 },
    { c: [793, 994], rot: 0.032, tint: '#FF7A1A', label: ['this video', 'doing numbers'], t: 11.0625 },
  ];
  const CELL_HW = 268, CELL_HH = 208;
  const LABEL_T = [10.50, 10.92, 11.25, 11.67];
  const popOf = (t, t0) => { const f = since(t, t0); if (f < 0) return 0; return f === 0 ? 1.10 : f === 1 ? 0.97 : f === 2 ? 1.01 : 1; };
  // a camera on the whole joiner (identity in the joiner; the 12.0 push maps mini 4 onto the saint hero):
  // Z = {k, rot, m (pivot, joiner screen px), p (where the pivot lands)}
  const ZID = { k: 1, rot: 0, m: [0, 0], p: [0, 0] };
  const zAp = (Z, q) => { const dx = q[0] - Z.m[0], dy = q[1] - Z.m[1], c = Math.cos(Z.rot), s = Math.sin(Z.rot); return [Z.p[0] + Z.k * (c * dx - s * dy), Z.p[1] + Z.k * (s * dx + c * dy)]; };
  const cellMat = (C, pop, Z = ZID) => { const cc = zAp(Z, C.c), kk = JK * pop * Z.k, r = C.rot + Z.rot, cs = Math.cos(r) * kk, sn = Math.sin(r) * kk; return [cs, sn, -sn, cs, cc[0] - (cs * JV[0] - sn * JV[1]), cc[1] - (sn * JV[0] + cs * JV[1])]; };
  const mApply = (M, q) => [M[0] * q[0] + M[2] * q[1] + M[4], M[1] * q[0] + M[3] * q[1] + M[5]];
  A1.CELLS = CELLS;
  // the squeeze of mini i: on every 8th, one 16th later per window (a squash about the body's foot line)
  const squeeze8 = t => { const x = t / 0.375 + 1e-9, ph = x - Math.floor(x), dt = ph * 0.375; return Math.min(1, dt / F(2)) * Math.exp(-dt / 0.10); };
  const miniSq = (t, i) => 0.055 * squeeze8(t - i * 0.1875);
  const SQP = [K.char[0], K.char[1] + 0.70 * K.char[2]];          // world pivot of the squash (the bottom of the body)
  const sqMat = sq => [1 + 0.5 * sq, 0, 0, 1 - sq, -SQP[0] * 0.5 * sq, SQP[1] * sq];
  // the four minis are the same clenched body (same cause): it is drawn ONCE per frame into a small offscreen canvas at
  // screen scale (body, feet, arm, contour, face), then stamped into each tilted window. Its halo jobs are replayed through
  // each window's camera. Each window then draws its own knot (or orb) and the fist over it.
  const MB = { x0: 170, y0: 660, w: 700, h: 640 };              // world box of the body layer
  const miniCv = document.createElement('canvas'); miniCv.width = Math.ceil(MB.w * JK); miniCv.height = Math.ceil(MB.h * JK);
  function miniBody(t) {
    const G = clenchGeo(t, K.char[0], K.char[1], K.char[2], { geo: { cam: JK, mitten: false } });
    const g = miniCv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, miniCv.width, miniCv.height);
    const mOff = [JK, 0, 0, JK, -MB.x0 * JK, -MB.y0 * JK];
    const keep = { gj: V2.glowJobs, gw: V2.glowWideJobs, pj: V2.postJobs, cam: V2.camM };
    V2.glowJobs = []; V2.glowWideJobs = []; V2.postJobs = [];
    let jobs;
    try {
      V2.camera(g, mOff);
      V2.grab.draw(g, G, 'clench', { eyes: 'squeeze', mouth: 'zigzag', sweat: 1 }, { glass: 'gl', lead: 0, hand: false });   // (no lead rim at mini size: the contour carries it)
      V2.camera(g, null); V2.flushPost(g);
      jobs = { g: V2.glowJobs, w: V2.glowWideJobs };
    } finally { V2.glowJobs = keep.gj; V2.glowWideJobs = keep.gw; V2.postJobs = keep.pj; V2.camM = keep.cam; }
    return { G, jobs, inv: new DOMMatrix([1 / JK, 0, 0, 1 / JK, MB.x0, MB.y0]) };
  }
  // the knot (or the jhana orb) in a window, with the hi-hat jitter (16ths) and a 15 fps tremor, then the fist over it
  function miniKnot(ctx, t, i, G) {
    const kn = G.knotAt, s16 = V2.s16(t).i, q = V2.boil(t, 2);
    const tr = [(hash(q * 1.3 + i) - 0.5) * 8, (hash(q * 2.9 + i * 3) - 0.5) * 8];
    const orbOut = clamp((t - 11.10) / 0.07);                     // the jhana light goes out under a crust in 2 frames
    if (i === 1) V2.grab.orb(ctx, t, kn[0] - 6, kn[1] + 6, kn[2] * 0.82, { lit: 1.2 * (1 - orbOut), crust: orbOut });
    else V2.grab.knot(ctx, t, kn[0] + tr[0], kn[1] + tr[1], kn[2], { seed: KSEEDS[(s16 % 4) + i * 5], jit: 1.25, edge: 1 });   // 4 shells per window, cached
  }
  function miniHook(ctx, t, C, i, pop, MBd, Z = ZID) {
    const M = cellMat(C, pop, Z);
    const G = MBd.G;
    // the body layer, squeezed, through this window's camera
    const S = new DOMMatrix(M).multiply(new DOMMatrix(sqMat(miniSq(t, i)))), Sa = [S.a, S.b, S.c, S.d, S.e, S.f];
    V2.camera(ctx, Sa);
    ctx.save(); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(miniCv, MB.x0, MB.y0, miniCv.width / JK, miniCv.height / JK); ctx.restore();
    const W = S.multiply(MBd.inv), Wa = [W.a, W.b, W.c, W.d, W.e, W.f];
    MBd.jobs.g.forEach(j => V2.glowJobs.push(g => { g.transform(...Wa); j(g); }));
    MBd.jobs.w.forEach(j => V2.glowWideJobs.push(g => { g.transform(...Wa); j(g); }));
    V2.camera(ctx, M);
    miniKnot(ctx, t, i, G);
    V2.grab.drawHand(ctx, G, 'clench', { lead: 1 });
    V2.camera(ctx, null);
    return G;
  }
  // "this video doing numbers": an acid-green sparkline rises out of his knot (11.67), keeps creeping up while he worries
  // through the push, and drops with the label at 12.45. Drawn in joiner world space under the given camera.
  const SPARK = [[0, 0], [30, -40], [55, -22], [85, -95], [110, -70], [140, -170], [160, -140], [186, -300], [202, -268], [218, -440]];
  function sparkline(ctx, t, M, dropDy = 0, a = 1) {
    const p = clamp((t - 11.67) / 0.36); if (p <= 0 || a <= 0) return;
    const creep = 70 * U.smooth((t - 12.03) / 0.42);
    const k0 = [K.knot[0] + 0.62 * K.knot[2], K.knot[1] - 0.70 * K.knot[2]];
    const pts = SPARK.map((q, i) => [k0[0] + q[0], k0[1] + q[1] - (i === SPARK.length - 1 ? creep : i === SPARK.length - 2 ? creep * 0.5 : 0)]);
    const P = partial(pts, p); if (P.length < 2) return;
    const Ms = [M[0], M[1], M[2], M[3], M[4], M[5] + dropDy], sc = Math.hypot(M[0], M[1]);
    V2.camera(ctx, Ms);
    const path = V2.P.path(P), w = 12 / sc;
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#39FF88'; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(path);
    ctx.strokeStyle = '#E8FFF0'; ctx.lineWidth = w * 0.35; ctx.stroke(path);
    const q = P[P.length - 1]; ctx.fillStyle = '#E8FFF0'; ctx.beginPath(); ctx.arc(q[0], q[1], 13 / sc, 0, TAU); ctx.fill(); ctx.restore();
    V2.glow(g => { g.globalAlpha = a; g.strokeStyle = '#39FF88'; g.lineWidth = 34 / sc; g.lineJoin = 'round'; g.stroke(path); });
    V2.camera(ctx, null);
  }
  // the windows' crisp edges (lead + a 2 px white glint inside), in screen space
  function cellEdge(ctx, C, pop, flash, Z = ZID) {
    const cc = zAp(Z, C.c), k = pop * Z.k;
    ctx.save(); ctx.translate(cc[0], cc[1]); ctx.rotate(C.rot + Z.rot); ctx.scale(k, k);
    const p = new Path2D(); p.roundRect(-CELL_HW, -CELL_HH, 2 * CELL_HW, 2 * CELL_HH, 8);
    ctx.strokeStyle = V2.LEAD; ctx.globalAlpha = 0.25; ctx.lineWidth = 4; ctx.stroke(p);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + 0.45 * flash; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2 / Math.max(1, k * 0.8);
    const q = new Path2D(); q.roundRect(-CELL_HW + 4, -CELL_HH + 4, 2 * CELL_HW - 8, 2 * CELL_HH - 8, 6); ctx.stroke(q);
    ctx.restore();
  }
  // the label under a window, typed in reading order; anchor: its centre under the camera
  function cellLabel(ctx, t, C, i, Z = ZID, dy = 0, a = 1) {
    const t0 = LABEL_T[i]; if (t < t0 || a <= 0) return;
    const an = zAp(Z, [C.c[0] - Math.sin(C.rot) * 146, C.c[1] + Math.cos(C.rot) * 146]);
    C.label.forEach((s, j) => {
      const tj = t0 + (j ? C.label[0].length / 60 + 0.05 : 0);
      const ly = j * 42 - (C.label.length - 1) * 21;
      monoInk(ctx, t, s, Math.round(an[0] - Math.sin(C.rot + Z.rot) * ly), Math.round(an[1] + Math.cos(C.rot + Z.rot) * ly + dy), { size: 40, weight: '600', align: 'center', t0: tj, cps: 60, col: '#FFFFFF', inkA: 0, pane: '#140C4A', paneA: 0.72, a });
    });
  }
  // the joiner's GL pass for a camera Z (the push) and per-window pops
  function joinerGL(t, Z, pops, o = {}) {
    V2.L.pane(V2.hook.pane, 'a1_join_hook');
    const G0 = clenchGeo(t, K.char[0], K.char[1], K.char[2]);
    const cu = new Float32Array(16), ch = new Float32Array(16), ct = new Float32Array(12), cs = new Float32Array(16);
    CELLS.forEach((C, i) => { const pop = pops[i], cc = zAp(Z, C.c);
      cu.set([cc[0], cc[1], C.rot + Z.rot, JK], i * 4); ch.set([CELL_HW, CELL_HH, pop * Z.k, pop > 0 && Z.k === 1 ? 0.6 * V2.hit(t, C.t, 0.10) : 0], i * 4);
      ct.set(V2.lin(C.tint), i * 3); cs.set([miniSq(t, i), SQP[0], SQP[1], 0], i * 4); });
    const R = K.ap * K.knot[2];
    V2.L.render('a1_join', Object.assign({
      uCell: { v4: cu }, uCellH: { v4: ch }, uCellT: { v3: ct }, uCellS: { v4: cs }, uJoinV: [JV[0], JV[1], 0, 0],
      uKnot: [K.knot[0], K.knot[1], K.knot[2], 1], uHookK: [1.0, 90, 0, Math.floor(V2.frame(t) / 2)],
      uTint: 0.65, uLens: 0.35,
    }, V2.hook.irisUniforms([K.knot[0], K.knot[1]], R, V2.hook.twist(t), { flood: 1, k: 1 }), V2.grab.uniforms(G0, o.mood || 'clench'),
    V2.L.calm(o.calm || [], { floor: 0.25 })), Object.assign({ bloomK: 0.26, thresh: 0.8, levels: 4, sat: 1.12, vig: 0.36, vigCol: '#1B1466' }, o.comp || {}));
    return G0;
  }
  V2.add(10.5, 12.0, 'a1_same', (t, ctx) => {
    const band = [0, 548, 1080, 748];
    const pops = CELLS.map(C => popOf(t, C.t));
    joinerGL(t, ZID, pops, { calm: [{ rect: band, pad: 0 }] });
    const MBd = miniBody(t);
    CELLS.forEach((C, i) => { if (pops[i] > 0) miniHook(ctx, t, C, i, pops[i], MBd); });
    if (pops[3] > 0) sparkline(ctx, t, cellMat(CELLS[3], pops[3]));
    CELLS.forEach((C, i) => { if (pops[i] > 0) cellEdge(ctx, C, pops[i], V2.hit(t, C.t, 0.12)); });
    CELLS.forEach((C, i) => { if (pops[i] > 0) cellLabel(ctx, t, C, i); });
    V2.shade(ctx, band, '#140C4A', 0.55, { feather: 50, r: 30 });
    neon(ctx, t, { id: 'V08', rows: [{ n: 2, size: 132, y: 622 }], pane: false });
    V2.type.mono(ctx, t, '(not how jhana works) ↗', 1000, 712, { size: 44, align: 'right', t0: 10.95, cps: 60, col: '#E8F7FF', halo: '#FF2E97', ga: 0.35 });
  });

  // ================================================================== 12.00 to 13.30  IT'S THIS LITTLE GUY: the saint
  // 12.00 to 12.20: a real camera push into the "doing numbers" window: the whole joiner scales up about mini 4 (k 1 to
  // 2.05, straightening), the other windows leave the frame with their content, and the mini becomes the hero at the
  // saint's size and place (worried from the 4th frame). 12.23 to 12.33: the window's hook world dissolves into the
  // saint window (a cached image of the joiner at 12.20, his body cut out) while the window's rim morphs into the arch.
  const SAINT = { x: 540, y: 850, s: 318 };
  const SAINT_WIN = { arch: [540, 452, 400, 1104], rose: [540, 842, 292], floorY: 1104, proj: [0.30, 0.75, 0, 760] };
  const PUSH_F = 6, DISS_F = [7, 10];                 // push frames 0..6 (12.000..12.200); dissolve frames 7..10
  const M4 = mApply(cellMat(CELLS[3], 1), K.char);    // mini 4's body centre in the joiner (screen)
  const KE = (SAINT.s / K.char[2]) / JK;              // the push's end scale
  const zPush = u => ({ k: lerp(1, KE, u), rot: -CELLS[3].rot * u, m: M4, p: [lerp(M4[0], SAINT.x, u), lerp(M4[1], SAINT.y, u)] });
  const pushU = t => U.inOutCubic(clamp((since(t, 12.0) + 1) / (PUSH_F + 1)));
  const heroMat = () => V2.camMat(SAINT.s / K.char[2], K.char[0], K.char[1], SAINT.x, SAINT.y);   // world -> the saint hero
  const SAINT_FACE = (t, blink) => ({ eyes: 'dots', brows: 'worried', mouth: 'o', sweat: 1, blink, look: [0.15, -0.1] });
  // the joiner world at the end of the push (12.20), frozen: GL + the windows that are still partly on screen. Built once
  // (a pure function of the fixed time 12.20; warmed by the 12.20 frame itself, which is drawn from it)
  const ZEND_T = 12.0 + PUSH_F / 30;
  let zEndCv = null;
  function zoomEndImage() {
    if (zEndCv) return zEndCv;
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
    const g = c.getContext('2d');
    const keep = { ctx: V2.ctx, lx: LX.ctx, gj: V2.glowJobs, gw: V2.glowWideJobs, pj: V2.postJobs, cam: V2.camM, T: V2.T };
    V2.ctx = g; LX.ctx = g; V2.glowJobs = []; V2.glowWideJobs = []; V2.postJobs = []; V2.camM = null; V2.T = ZEND_T;
    try {
      const Z = zPush(1);
      joinerGL(ZEND_T, Z, [1, 1, 1, 1], { mood: 'worried', comp: { t: ZEND_T } });
      CELLS.slice(0, 3).forEach((C, i) => cellEdge(g, C, 1, 0, Z));
      V2.camera(g, null); V2.flushGlow(g); V2.flushPost(g);
    } finally { V2.ctx = keep.ctx; LX.ctx = keep.lx; V2.glowJobs = keep.gj; V2.glowWideJobs = keep.gw; V2.postJobs = keep.pj; V2.camM = keep.cam; V2.T = keep.T; }
    zEndCv = c;
    return c;
  }
  // the label and the sparkline ride with the hero and drop together at 12.45 (the arrow takes over)
  const dropOf = t => { const d = Math.max(0, t - 12.45); return { dy: 2400 * d * d, a: clamp(1 - d / 0.17) }; };
  function pushFrame(t, ctx) {
    const f = since(t, 12.0), u = pushU(t), Z = zPush(u);
    const cap = V2.type.measure(ctx, t, { id: 'V09', rows: [{ n: 2, size: 150, y: 218 }, { n: 2, size: 150, y: 370 }] }, 'neon');
    const worried = f >= 3;
    const mood = V2.grab.mixMood('clench', 'worried', u);
    const M4z = cellMat(CELLS[3], 1, Z);
    if (f === PUSH_F) ctx.drawImage(zoomEndImage(), 0, 0);       // the 12.20 frame is the cached image (+ the live layers)
    else {
      joinerGL(t, Z, [1, 1, 1, 1], { mood, calm: [{ rect: cap.box, pad: 40 }] });
      // only the windows still on screen draw their minis (the body sprite is skipped once they have all left)
      const onScr = C => { const cc = zAp(Z, C.c), r = Math.hypot(CELL_HW, CELL_HH) * Z.k; return cc[0] + r > 0 && cc[0] - r < 1080 && cc[1] + r > 0 && cc[1] - r < 1350; };
      const vis = CELLS.slice(0, 3).map(onScr);
      if (vis.some(v => v)) { const MBd = miniBody(t); CELLS.slice(0, 3).forEach((C, i) => { if (vis[i]) miniHook(ctx, t, C, i, 1, MBd, Z); }); }
      CELLS.slice(0, 3).forEach((C, i) => { if (vis[i]) { cellEdge(ctx, C, 1, 0, Z); cellLabel(ctx, t, C, i, Z); } });
    }
    cellEdge(ctx, CELLS[3], 1, 0, Z);
    // the hero: the same world body as the GL glass, drawn crisp through the push camera (the hand sprite is built at
    // world size and only ever scaled down, so it is never rebuilt)
    const G0 = clenchGeo(t, K.char[0], K.char[1], K.char[2], { geo: { mitten: false } });
    V2.camera(ctx, M4z);
    V2.grab.draw(ctx, G0, mood, worried ? SAINT_FACE(t, 0) : { eyes: 'squeeze', mouth: 'zigzag', sweat: 1 }, {
      glass: 'gl', lead: 1, handMood: worried ? 'worried' : 'clench',
      beforeHand: c => V2.grab.knot(c, t, G0.knotAt[0], G0.knotAt[1], G0.knotAt[2], { jit: 1.25, seed: kseed(t) }),
    });
    V2.camera(ctx, null);
    sparkline(ctx, t, M4z);
    cellLabel(ctx, t, CELLS[3], 3, Z);
    // (a deeper pane while the joiner's top windows fly out behind the caption, so the unlit words stay readable)
    // (final pass) on the cut frames the top windows are still behind the words: the pane starts near-opaque (0.96) and
    // eases to the push's 0.82 over 4 frames, so the unlit "THIS LITTLE GUY." never sits on busy cell art
    neon(ctx, t, { id: 'V09', cut: 12.0, rows: [{ n: 2, size: 150, y: 218 }, { n: 2, size: 150, y: 370 }], halo: '#2EE6FF', pane: { a: Math.max(lerp(0.82, 0.5, u), 0.96 - 0.035 * Math.max(0, f)) } });
  }
  // the light arrow: from the upper right, swinging down to stop beside his head, a chevron head landing on "guy."
  const ARROW = LX.smoothPts([[990, 300], [1012, 420], [985, 545], [895, 650], [750, 716]], 10);
  function arrow(ctx, t) {
    const ap = clamp((t - 12.45) / 0.29); if (ap <= 0) return;
    const P = partial(ARROW, U.outCubic(ap));
    if (P.length < 2) return;
    // a deep came under the light stroke, so it reads on the bright window
    ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = '#120A30'; ctx.fill(V2.fx.brush(P, 22, { taper: [0.05, 0.4, 0.12, 0.8] })); ctx.restore();
    V2.lightLine(ctx, P, { core: '#FFFBEA', halo: '#FFE45C', w: 10, gw: 22, ga: 0.75, op: 'source-over', taper: [0.05, 0.3, 0.12, 0.8] });
    // the head: two tapered strokes (a chevron), drawn over the last 3 frames of the stroke (it lands on "guy." at 12.74)
    const hk = clamp((t - (12.74 - F(3))) / F(3));
    if (hk > 0) {
      const tip = ARROW[ARROW.length - 1], pre = ARROW[ARROW.length - 6], aa = Math.atan2(tip[1] - pre[1], tip[0] - pre[0]), L = 92 * U.outBack(hk);
      const arms = [-0.50, 0.50].map(da => { const e = [tip[0] - Math.cos(aa + da) * L, tip[1] - Math.sin(aa + da) * L]; return [e, [lerp(tip[0], e[0], 0.5), lerp(tip[1], e[1], 0.5)], tip]; });
      ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = '#120A30'; arms.forEach(A => ctx.fill(V2.fx.brush(A, 24, { taper: [0.1, 0.5, 0.05, 1] }))); ctx.restore();
      arms.forEach(A => V2.lightLine(ctx, A, { core: '#FFFBEA', halo: '#FFE45C', w: 12, gw: 18, ga: 0.55, op: 'source-over', taper: [0.1, 0.45, 0.05, 1] }));
    }
  }
  V2.add(12.0, 13.3, 'a1_saint', (t, ctx) => {
    const f = since(t, 12.0);
    if (f <= PUSH_F) return pushFrame(t, ctx);
    const blink = (() => { const b = (t - 12.90) / 0.34; return b < 0 || b > 1 ? 0 : Math.sin(Math.PI * b); })();
    const diss = f <= DISS_F[1] ? (f - DISS_F[0] + 1) / (DISS_F[1] - DISS_F[0] + 2) : 1;   // 0.2 .. 0.8 over frames 7..10
    const zimg = diss < 1 ? zoomEndImage() : null;                // (built before this frame's pane and GL pass)
    const G = clenchGeo(t, SAINT.x, SAINT.y, SAINT.s);
    const wo = Object.assign({ mode: 'day' }, SAINT_WIN);
    // the window lights pane by pane on 16ths from the rose outward (12.19 to 12.63): stepped, so the pane is re-cached
    // only per 16th
    { const q = V2.s16(t), k = q.i - V2.s16(12.1875).i; wo.build = clamp((k + U.outCubic(clamp(q.ph * 0.1875 / F(2)))) / 3); }
    V2.L.pane(g => { V2.ground(g, 'saint'); V2.window.draw(t, Object.assign({}, wo, { g })); }, 'a1_saint|' + V2.window.paneKey(wo));
    const win = V2.window.draw(t, Object.assign({}, wo, { g: null }));
    const cap = V2.type.measure(ctx, t, { id: 'V09', rows: [{ n: 2, size: 150, y: 218 }, { n: 2, size: 150, y: 370 }] }, 'neon');
    const halo = [G.cx, G.cy - G.bh - 0.16 * G.s];
    const mood = 'worried';
    V2.L.render('a1_win', Object.assign({ uLens: 0.42, uWinX: [halo[0], halo[1], 0.35, 34], uLensTint: V2.lin('#FF6B57') }, win.uniforms, V2.grab.uniforms(G, mood),
      V2.L.calm([{ rect: cap.box, pad: 40 }])), { bloomK: 0.30, thresh: 0.70, levels: 4, sat: 1.10, vig: 0.30, vigCol: '#1B1466' });
    // (integration: A1-6 merged, core cutSegs now drops the rose's zero-length closing segment, so the full-frame
    // even-odd clip that hid the forehead dot is gone; the analytic cut keeps the leads off his body)
    win.crisp(ctx, { cut: [[G.cx, G.cy, G.bw * 1.04, G.bh * 1.04]] });
    if (zimg) {
      // the hook world in the window dissolves away (his body is never covered: it is the live saint glass)
      ctx.save(); const cl = new Path2D(); cl.rect(0, 0, 1080, 1350); cl.ellipse(G.cx, G.cy, G.bw * 1.02, G.bh * 1.02, 0, 0, TAU); ctx.clip(cl, 'evenodd');
      ctx.globalAlpha = 1 - diss; ctx.drawImage(zimg, 0, 0); ctx.restore();
      // the window's rim straightens into the arch
      const Z = zPush(1), cc = zAp(Z, CELLS[3].c), hw = CELL_HW * Z.k, hh = CELL_HH * Z.k;
      const pa = resample(rectPts([cc[0] - hw, cc[1] - hh, cc[0] + hw, cc[1] + hh]), 160), pb = resample(archPts(SAINT_WIN.arch), 160);
      const e = U.inOutCubic(diss), pts = pa.map((p, i) => [lerp(p[0], pb[i][0], e), lerp(p[1], pb[i][1], e)]);
      V2.P.lead(ctx, V2.P.path(pts), { w: lerp(5, 13, e), a: 0.7 });
      V2.lightLine(ctx, pts, { core: '#FFF4D6', halo: '#FFC23D', w: 3, ga: 0.6 * (1 - e), op: 'source-over', taper: [0, 1, 0, 1], alpha: 1 - e * 0.6 });
    }
    // the hero, worried, clutching the knot
    V2.grab.draw(ctx, G, mood, SAINT_FACE(t, blink), {
      glass: 'gl', lead: 1,
      beforeHand: c => V2.grab.knot(c, t, G.knotAt[0], G.knotAt[1], G.knotAt[2], { jit: 1.25, seed: kseed(t) }),
    });
    // the sparkline and the label ride with him, then drop at 12.45
    const D = dropOf(t);
    if (D.a > 0) {
      sparkline(ctx, t, heroMat(), D.dy, D.a);
      cellLabel(ctx, t, CELLS[3], 3, zPush(1), D.dy, D.a);
    }
    // a thin gold neon halo hovers over his sweating head
    { const hb = 4 * V2.osc(t, 80), hk = U.outBack(clamp((t - 12.2) / 0.2));
      const pts = sample(u => { const a = -0.3 + u * (TAU + 0.35); return [halo[0] + Math.cos(a) * 0.30 * G.s * hk, halo[1] + hb + Math.sin(a) * 0.075 * G.s * hk]; }, 48);
      if (hk > 0) V2.lightLine(ctx, pts, { core: '#FFE9A8', halo: '#FFC23D', w: 5, gw: 18, ga: 0.95, op: 'source-over', taper: [0.05, 0.5, 0.06, 0.4] }); }
    // 12.45 to 12.74 ("little guy."): the light arrow draws itself in one stroke and points at him
    arrow(ctx, t);
    neon(ctx, t, { id: 'V09', rows: [{ n: 2, size: 150, y: 218 }, { n: 2, size: 150, y: 370 }], halo: '#2EE6FF' });
  });

  // polyline helpers for the arch -> plate border morph
  function resample(pts, N) {
    const acc = [0]; for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const tot = acc[acc.length - 1], out = []; let j = 1;
    for (let k = 0; k <= N; k++) { const L = tot * k / N; while (j < pts.length - 1 && acc[j] < L) j++; const r = (L - acc[j - 1]) / Math.max(1e-6, acc[j] - acc[j - 1]); out.push([lerp(pts[j - 1][0], pts[j][0], clamp(r)), lerp(pts[j - 1][1], pts[j][1], clamp(r))]); }
    return out;
  }
  function archPts(A) {
    const [cx, ay, w, by] = A, a = 0.22 * w, r = w + a, hgt = Math.sqrt(r * r - a * a), ys = ay + hgt;
    const pts = [[cx - w, by], [cx - w, ys]];
    const aL = Math.atan2(-hgt, -a), aR = Math.atan2(-hgt, a);
    for (let q = 1; q <= 24; q++) { const an = lerp(Math.PI, TAU + aL, q / 24); pts.push([cx + a + Math.cos(an) * r, ys + Math.sin(an) * r]); }
    for (let q = 1; q <= 24; q++) { const an = lerp(aR, 0, q / 24); pts.push([cx - a + Math.cos(an) * r, ys + Math.sin(an) * r]); }
    pts.push([cx + w, by]); pts.push([cx - w, by]);
    return pts;
  }
  const rectPts = b => [[b[0], b[3]], [b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];

  // ================================================================== 13.30 to 15.00  PLATE 01: the field guide
  const PL = { r: [44, 104, 1036, 1236] };          // the plate's border (outer line)
  const PLO = [PL.r[0] - 8, PL.r[1] - 8];             // plate space origin (v1 coordinates are plate space)
  const SPEC = { x: 300, y: 610, s: 240 };
  const STAMPS = [['GRAB', 13.50, 742, 287, -0.05], ['BY', 13.875, 728, 462, 0.035], ['GRAB', 14.25, 746, 637, -0.02]];   // Anton 150, 175 px pitch
  // (final pass) typed at 80 cps from 13.55: the punchline row completes at 14.63 and holds still for 0.37 s before the
  // 15.0 tear (at 60 cps from 14.42 it finished on 14.95 and was only readable for one frame)
  const ROWS = [['pali:', 'taṇhā (lit. thirst)', 13.55], ['diet:', "whatever's next", 13.90], ['lifespan:', 'one moment. respawns.', 14.22]], ROW_CPS = 80;
  let plateBaseCv = null;
  // the lightbox: a cached base (backlit milky glass, grain, blooms) + photograms that drift 1 to 2 px + a slow milky
  // caustic shimmer (6 s period, 3%). Repainted every 2 frames (the pane key is the 15 fps boil seed).
  const platePane = (g, t) => {
    if (!plateBaseCv) { plateBaseCv = document.createElement('canvas'); plateBaseCv.width = 540; plateBaseCv.height = 675; const b = plateBaseCv.getContext('2d'); b.setTransform(0.5, 0, 0, 0.5, 0, 0); platePaint(b); }
    g.drawImage(plateBaseCv, 0, 0, 1080, 1350);
    plateLeaves(g, t);
    for (let i = 0; i < 3; i++) {
      const x = 540 + 380 * V2.osc(t, 10, i * 2.1), y = 675 + 460 * V2.osc(t, 10, i * 2.1 + 1.3 + i);
      V2.P.rgrad(g, x, y, 420, [[0, 'rgba(210,235,255,0.05)'], [0.6, 'rgba(160,210,255,0.02)'], [1, 'rgba(120,180,255,0)']], 'lighter');
    }
  };
  const platePaint = g => {
    V2.P.vgrad(g, [[0, '#0E2C6E'], [1, '#163E8C']]);
    V2.P.rgrad(g, 560, 640, 820, [[0, 'rgba(70,140,230,0.42)'], [0.55, 'rgba(40,100,200,0.16)'], [1, 'rgba(14,44,110,0)']], 'lighter');
    // milky glass grain (3%) and a few soft cyanotype blooms
    for (let i = 0; i < 2600; i++) { const x = hash(i * 1.37) * 1080, y = hash(i * 2.91 + 3) * 1350, v = hash(i * 7.7); g.fillStyle = v > 0.5 ? 'rgba(220,240,255,0.05)' : 'rgba(6,20,60,0.06)'; g.fillRect(x, y, 4, 4); }
    for (let i = 0; i < 7; i++) V2.P.disc(g, 1080 * hash(i * 9.1 + 2), 1350 * hash(i * 4.3 + 5), 120 + 160 * hash(i * 3.3), '#5FA8FF', 0.06);
  };
  // cyanotype photograms: bodhi leaves laid on the glass (Anna Atkins' blueprints): white silhouettes at 12% with their
  // veins showing as fine blue lines, drifting a pixel or two on the lightbox
  const PHOTO = [[930, 905, 250, -2.2], [985, 250, 200, 2.5], [96, 300, 170, -0.9], [585, 1198, 170, 0.15], [120, 905, 150, -1.9], [400, 1200, 120, 2.9]];
  function plateLeaves(g, t) {
    PHOTO.forEach(([x, y, L, a], i) => {
      const dx = 1.6 * V2.osc(t, 10, i * 1.7), dy = 1.2 * V2.osc(t, 10, i * 2.3 + 1);
      g.save(); g.translate(x + dx, y + dy); g.rotate(a); g.translate(-L * 0.5, 0);
      g.fillStyle = 'rgba(225,242,255,0.12)'; g.fill(leafPath(L));
      g.strokeStyle = 'rgba(14,44,110,0.30)'; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(L * 0.12, 0); g.lineTo(L * 0.92, 0);
      for (let k = 1; k <= 5; k++) { const u = 0.12 + k * 0.12, w = L * 0.42 * Math.sin(Math.PI * Math.min(1, u * 1.15)) * 0.8; [-1, 1].forEach(sd => { g.moveTo(L * u, 0); g.quadraticCurveTo(L * (u + 0.05), sd * w * 0.5, L * (u + 0.13), sd * w * 0.85); }); }
      g.stroke(); g.restore();
    });
  }
  // the specimen: grabbygrab as a light-line drawing (contour, feet, arm, fist, face), hatched lower body, the knot in colour
  const specCache = new Map();
  function specHandRing(G) {
    const key = 'r' + Math.round(G.s);
    let c = specCache.get(key); if (c) return c;
    const h = G.hand, S = Math.ceil(h.hs * 2.4);
    const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const g = cv.getContext('2d'); g.translate(S / 2 - h.x, S / 2 - h.y);
    const parts = V2.grab.handPaths(h);
    g.strokeStyle = '#E8F7FF'; g.lineWidth = 10; g.lineJoin = 'round'; parts.forEach(p => g.stroke(p));
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; parts.forEach(p => g.fill(p));
    c = { cv, S, h }; specCache.set(key, c);
    return c;
  }
  function specimen(ctx, t, k = 1, o = {}) {
    const G = clenchGeo(14.0, SPEC.x, SPEC.y, SPEC.s);
    const n = (t - 13.35) / 0.1875;                       // strokes on 16ths
    const st = i => clamp((n - i) / 0.9);
    const L = { core: '#E8F7FF', halo: '#9FD8FF', w: 5, gw: 12, ga: 0.45 };
    // 0: the contour, overshooting its start
    const cont = sample(u => { const a = -2.2 + u * TAU * 1.07; return G.bodyAt(a, 1 + (u > 0.9 ? (u - 0.9) * 0.4 : 0)); }, 120);
    drawn(ctx, cont, U.outCubic(st(0) * 0.5 + st(1) * 0.5), Object.assign({}, L, { w: 6, gw: 14 }));
    // 2: the feet (the part below the body)
    const feet = G.feet.map(F2 => sample(u => { const a = 0.15 * Math.PI + u * 0.7 * Math.PI; return [F2.c[0] + Math.cos(a) * F2.rx, F2.c[1] + Math.sin(a) * F2.ry]; }, 16));
    feet.forEach(p => drawn(ctx, p, st(2), L));
    // 3: the arm (two light lines) and the knot it holds (the only colour on the plate)
    const side = sg => G.armPts.map((p, i) => { const a = G.armPts[Math.max(0, i - 1)], b = G.armPts[Math.min(G.armPts.length - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; const w = G.armW * 0.5 * (1 - 0.18 * i / 24); return [p[0] - dy / l * w * sg, p[1] + dx / l * w * sg]; })
      .filter(q => { const dx = (q[0] - G.cx) / G.bw, dy = (q[1] - G.cy) / G.bh; return dx * dx + dy * dy > 1; });
    const ka = st(3);
    if (ka > 0) V2.grab.knot(ctx, o.knotT ?? t, G.knotAt[0], G.knotAt[1], G.knotAt[2], { jit: 1, alpha: clamp(ka * 2), seed: kseed(o.knotT ?? t) });
    [side(1), side(-1)].forEach(p => drawn(ctx, p, ka, L));
    // 4: the fist outline (union silhouette as a ring of light) + its crease
    const hk = st(4);
    if (hk > 0) {
      const R = specHandRing(G);
      ctx.save(); ctx.globalAlpha = hk; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(R.cv, R.h.x - R.S / 2, R.h.y - R.S / 2); ctx.restore();
      V2.glow(g => { g.globalAlpha = 0.6 * hk; g.drawImage(R.cv, R.h.x - R.S / 2, R.h.y - R.S / 2); });
      const cr = G.hand.crease; drawn(ctx, [cr[0], cr[1]], hk, Object.assign({}, L, { w: 4, pen: false }));
    }
    // 5: the face, in light: worried dots, brows, a small o
    const fk = st(5);
    if (fk > 0) {
      ctx.save(); ctx.globalAlpha = fk; ctx.fillStyle = '#E8F7FF'; ctx.strokeStyle = '#E8F7FF'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      const s = G.s;
      [-1, 1].forEach(sd => { const x = G.ex + sd * 0.2 * s; ctx.beginPath(); ctx.ellipse(x, G.ey, 0.042 * s, 0.056 * s, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + sd * 0.10 * s, G.ey - 0.115 * s); ctx.lineTo(x - sd * 0.035 * s, G.ey - 0.165 * s); ctx.stroke(); });
      ctx.beginPath(); ctx.ellipse(G.ex, G.ey + 0.15 * s, 0.03 * s, 0.04 * s, 0, 0, TAU); ctx.stroke();
      ctx.restore();
      V2.glow(g => { g.globalAlpha = 0.5 * fk; g.fillStyle = '#9FD8FF'; [-1, 1].forEach(sd => { g.beginPath(); g.arc(G.ex + sd * 0.2 * G.s, G.ey, 0.08 * G.s, 0, TAU); g.fill(); }); });
    }
    // 6: 45-degree light hatching in the lower body (30%)
    const hh = st(6);
    if (hh > 0) {
      ctx.save(); const bp = new Path2D(); bp.ellipse(G.cx, G.cy, G.bw * 0.94, G.bh * 0.94, 0, 0.05 * Math.PI, 0.95 * Math.PI); bp.closePath(); ctx.clip(bp);
      ctx.strokeStyle = '#E8F7FF'; ctx.globalAlpha = 0.30; ctx.lineWidth = 3; ctx.beginPath();
      const nH = Math.floor(11 * hh);
      for (let i = 0; i < nH; i++) { const x0 = G.cx - G.bw * 1.2 + i * 34; ctx.moveTo(x0, G.cy + G.bh); ctx.lineTo(x0 + G.bh, G.cy); }
      ctx.stroke(); ctx.restore();
    }
    return G;
  }
  // the plate's crisp layer: border (double light line), header, rules, specimen, fig. 1, rows, stamps
  function plateBody(ctx, t, o = {}) {
    const sh = o.shake || [0, 0];
    const B0 = o.base ? new DOMMatrix(o.base) : new DOMMatrix();
    const B = B0.translate(sh[0], sh[1]);
    const asArr = m => [m.a, m.b, m.c, m.d, m.e, m.f];
    ctx.save(); V2.camera(ctx, asArr(B));
    const b = PL.r, k = o.morph ?? 1;
    const L = { core: '#E8F7FF', halo: '#9FD8FF', w: 4, ga: 0.6, pen: false };
    const Lr = { core: '#CFEAFF', halo: '#9FD8FF', w: 2.5, ga: 0.35, alpha: 0.7, pen: false };
    if (k >= 1) {
      const rect = (r, w) => [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]], [r[0], r[1] + 0.5]];
      V2.lightLine(ctx, rect(b), Object.assign({}, L, { taper: [0, 1, 0, 1] }));
    }
    const hk = clamp((t - 13.38) / 0.15);
    if (hk > 0) {
      V2.type.mono(ctx, t, 'FIELD GUIDE TO THE MIND · PLATE 01', PLO[0] + 56, PLO[1] + 82, { size: 36, weight: '600', col: '#E8F7FF', t0: 13.38, cps: 90, halo: '#9FD8FF', ga: 0.35 });
      drawn(ctx, [[b[0] + 40, PLO[1] + 128], [b[2] - 40, PLO[1] + 128]], hk, Lr);
    }
    specimen(ctx, t, 1, o);
    if (t >= 14.45) V2.type.mono(ctx, t, 'fig. 1', 90, 900, { size: 36, col: '#CFEAFF', a: 0.85, t0: 14.45, cps: 40 });
    const rk = clamp((t - 13.55) / 0.2);
    if (rk > 0) drawn(ctx, [[b[0] + 40, 948], [b[2] - 40, 948]], rk, Lr);
    ROWS.forEach(([lab, val, t0], i) => {
      // one row at a time, one cursor: the label types, then the value; the cursor waits at the value's end until the
      // next row starts
      const y = 1004 + i * 66, tv = t0 + lab.length / ROW_CPS + 0.03, next = i + 1 < ROWS.length ? ROWS[i + 1][2] : 15.0;
      V2.type.mono(ctx, t, lab, 92, y, { size: 40, weight: '600', col: '#9FD8FF', t0, cps: ROW_CPS, cursor: true, blinkFor: 0 });
      V2.type.mono(ctx, t, val, 330, y, { size: 40, col: '#E8F7FF', t0: tv, cps: ROW_CPS, cursor: true, blinkFor: Math.max(0, next - tv - val.length / ROW_CPS - 0.01) });
    });
    // GRAB / BY / GRAB: neon stamps, slammed on the choir (3-frame, 4 px shake)
    STAMPS.forEach(([w, t0, x, y, rot]) => {
      const f = since(t, t0); if (f < 0) return;
      const sc = f === 0 ? 1.35 : f === 1 ? 0.94 : f === 2 ? 1.03 : 1;
      const X = PLO[0] + x, Y = PLO[1] + y;
      const cs = Math.cos(rot) * sc, sn = Math.sin(rot) * sc;
      V2.camera(ctx, asArr(B.multiply(new DOMMatrix([cs, sn, -sn, cs, X - (cs * X - sn * Y), Y - (sn * X + cs * Y)]))));
      V2.type.neon(ctx, t, { words: [w], word_t: [t0], rows: [{ n: 1, size: 150, y: Y, x: X }], mode: 'lit', core: '#FFF8F2', halo: '#FF2E97', pane: false });
      V2.camera(ctx, asArr(B));
    });
    V2.camera(ctx, o.base || null);
    ctx.restore();
  }
  A1.plateBody = plateBody;
  const stampShake = t => { for (const s of STAMPS) { const f = since(t, s[1]); if (f >= 0 && f < 3) { const a = [4, -3, 2][f]; return [a * (hash(f + s[1]) > 0.5 ? 1 : -1), -a * 0.6]; } } return [0, 0]; };
  V2.add(13.3, 15.0, 'a1_plate', (t, ctx) => {
    const m = clamp((t - 13.30) / 0.15);               // the window's leads straighten into the border (5 frames)
    if (m < 1) {
      // the transition frames: the saint window's colours flatten into the cyanotype, his glass drains into the drawing
      const mk = Math.round(m * 6) / 6;
      const wo = Object.assign({ mode: 'day', build: 1, alpha: 1 - mk }, SAINT_WIN);
      V2.L.pane(g => { platePane(g, 13.3); V2.window.draw(t, Object.assign({}, wo, { g })); }, 'a1_platem|' + mk);
      const win = V2.window.draw(t, Object.assign({}, wo, { g: null }));
      const u = U.inOutCubic(m);
      const G = clenchGeo(t, SAINT.x, SAINT.y, SAINT.s);   // he fades in place (a constant size keeps the hand sprite cached)
      // the window's colour drains into the lightbox: the panes fade in the pane (over the plate), the emission gain eases
      // to 1 (never pane x alpha, which would be a dark tombstone), the shafts and the floor spill fade out
      const W1 = V2.window.draw(t, Object.assign({}, wo, { g: null, alpha: 1 })).uniforms, wk = W1.uWinK;
      const wu = Object.assign({}, W1, { uWinK: [lerp(wk[0], 1, mk), wk[1] * (1 - mk), wk[2] * (1 - mk), wk[3]] });
      V2.L.render('a1_win', Object.assign({ uLens: 0.42 * (1 - u), uWinX: [0, 0, 0, 34], uLensTint: V2.lin('#FF6B57') }, wu, V2.grab.uniforms(G, 'worried', { alpha: 1 - u })), { bloomK: 0.28, thresh: 0.72, levels: 4, sat: 1.08, vig: 0.30, vigCol: '#0E2C6E' });
      // the arch frame straightens into the rectangle
      const pa = resample(archPts(SAINT_WIN.arch), 160), pb = resample(rectPts(PL.r), 160);
      const pts = pa.map((p, i) => [lerp(p[0], pb[i][0], u), lerp(p[1], pb[i][1], u)]);
      V2.P.lead(ctx, V2.P.path(pts), { w: lerp(13, 4, u), a: 0.8 * (1 - u) });
      V2.lightLine(ctx, pts, { core: '#E8F7FF', halo: lerp(0, 1, u) > 0.5 ? '#9FD8FF' : '#FFC23D', w: 4, ga: 0.6, op: 'source-over', taper: [0, 1, 0, 1] });
      ctx.save(); { const cl = new Path2D(); cl.rect(0, 0, 1080, 1350); cl.ellipse(G.cx, G.cy, G.bw * 1.01, G.bh * 1.01, 0, 0, TAU); ctx.clip(cl, 'evenodd'); }
      win.crisp(ctx, { leadA: 0.7 * (1 - u) });
      ctx.restore();
      V2.grab.draw(ctx, G, 'worried', { eyes: 'dots', brows: 'worried', mouth: 'o', sweat: 1 }, { glass: 'gl', lead: 1, alpha: 1 - u,
        beforeHand: c => V2.grab.knot(c, t, G.knotAt[0], G.knotAt[1], G.knotAt[2], { jit: 1.25, seed: kseed(t) }) });
      return;
    }
    { const tq = V2.boil(t, 2) * 2 / 30; V2.L.pane(g => platePane(g, tq), 'a1_plate|' + tq.toFixed(4)); }
    V2.L.render('core_trivial', {}, { bloomK: 0.22, thresh: 0.8, levels: 3, sat: 1.06, vig: 0.34, vigCol: '#0A1E50', pulse: true });
    plateBody(ctx, t, { shake: stampShake(t) });
    if (t >= 14.85) plateImage();
  });

  // ================================================================== 15.00 to 17.55  IT BUZZES: the tightening
  // mono thought fragments, every 0.25 s, at three real depths (near: 48 px at 85%, crisp; mid: 42 px at 66%; far: 36 px
  // at 52%, softened through the glow), each on a small dark pane, placed over the quiet glass (his body, the blades
  // right of the knot), never on the label's row and never below y 1215 (X's player controls)
  const FRAGS = ['am i doing this right', 'reply to him', 'is this jhana?', 'i should be calmer by now', 'did i lock it', 'what if they', 'rent', 'am i doing this right', 'reply to him'];
  const FRAG_POS = [[262, 1110, 2], [940, 800, 2], [262, 752, 1], [650, 1190, 2], [262, 1110, 0], [945, 800, 2], [950, 1000, 0], [650, 1190, 1], [262, 752, 0]];
  const FRAG_D = [{ size: 48, a: 0.88, pane: 0.66, ga: 0.30 }, { size: 42, a: 0.72, pane: 0.72, ga: 0.40 }, { size: 36, a: 0.62, pane: 0.76, ga: 0.65 }];   // (integration: deeper panes on the mid/far fragments, contrast)
  function fragments(ctx, t, tw, fadeAll) {
    FRAGS.forEach((s, i) => {
      const t0 = 15.25 + i * 0.25; if (tw < t0) return;
      const age = tw - t0, life = 0.55;
      const [x, y, d] = FRAG_POS[i], D = FRAG_D[d];
      const fade = clamp(1 - (age - life) / 0.2) * fadeAll, a = D.a * fade;
      if (a <= 0.01) return;
      monoInk(ctx, tw, s, x, y, { size: D.size, align: 'center', col: '#E8E4FF', a, halo: d === 2 ? '#C6A3FF' : '#7A2BD1', ga: D.ga, inkA: 0, pane: '#120A3E', paneA: D.pane / D.a });
    });
  }
  // 16.50: a light leader from inside the knot to a callout rule UNDER the label block (it never crosses text)
  const RULE_Y = 690;
  function leader(ctx, t, kn, fade) {
    const fl = since(t, 16.50); if (fl < 0) return;
    const p = clamp((fl + 1) / 2);                      // the leader draws from the 16.50 frame (2 frames); the label lands with it
    const a = [kn[0] + kn[2] * 0.15, kn[1] - kn[2] * 0.2], b = [840, RULE_Y];
    ctx.save(); ctx.globalAlpha = fade; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(a[0], a[1], 6, 0, TAU); ctx.fill(); ctx.restore();
    drawn(ctx, sample(u => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)], 8), p, { core: '#FFFFFF', halo: '#C6A3FF', w: 4, ga: 0.7 * fade, pen: false, alpha: fade, taper: [0.05, 0.6, 0.02, 1] });
    if (fl >= 1) drawn(ctx, sample(u => [lerp(560, 1000, u), RULE_Y], 8), clamp((fl - 1) / 2), { core: '#FFFFFF', halo: '#C6A3FF', w: 3.5, ga: 0.6 * fade, pen: false, alpha: fade, taper: [0.02, 1, 0.02, 1] });
    monoInk(ctx, t, 'EVIL VIBRATING BLOB', 1000, 596, { size: 44, weight: '600', align: 'right', col: '#FFFFFF', a: fade, halo: '#FF2E97', ga: 0.5, inkA: 0, pane: '#120A3E', paneA: 0.58 });
    if (fl >= 3) monoInk(ctx, t, '(was a perfectly nice cloud)', 1000, 646, { size: 42, align: 'right', col: '#E8E4FF', a: 0.9 * fade, halo: '#7A2BD1', ga: 0.4, inkA: 0, pane: '#120A3E', paneA: 0.58 });
  }
  // the buzz: extra spark ticks round the knot (12 Hz), so it vibrates without the jitter that turns its outline into a
  // heart (CORE_REQUESTS A1-5); world space, inside the rig's camera
  function buzzSparks(c, t, kc, kr) {
    const seed = Math.floor(V2.frame(t) * 0.4), cols = ['#FF2E97', '#1FA352', '#B8FF2C', '#FFFFFF'];
    c.save(); c.lineCap = 'round'; c.lineWidth = 3.6;
    for (let i = 0; i < 5; i++) {
      const a = hash(i * 7.3 + seed * 0.29 + 11) * TAU, r0 = kr * 1.14, L = kr * (0.10 + 0.20 * hash(i * 2.7 + seed * 1.1));
      c.strokeStyle = cols[(i + seed) % 4]; c.beginPath(); c.moveTo(kc[0] + Math.cos(a) * r0, kc[1] + Math.sin(a) * r0); c.lineTo(kc[0] + Math.cos(a) * (r0 + L), kc[1] + Math.sin(a) * (r0 + L)); c.stroke();
    }
    c.restore();
  }
  const BUZZ_RAYS = V2.hook.RAYS.filter((a, i) => i % 2 === 0);
  function buzzFrame(t, ctx, tw, o = {}) {
    const tight = clamp((tw - 15.0) / 0.7);
    const sq = 0.07 * squeeze8(tw);
    const fl = since(t, 17.0);
    const shake = fl >= 0 && fl < 3 ? [[4, -3], [-3, 2], [2, -1]][fl] : [0, 0];
    const cam = { k: lerp(1, K.tight.k, U.inOutSine(tight)), sx: lerp(K.char[0], K.tight.sx, U.inOutSine(tight)) + shake[0], sy: lerp(K.char[1], K.tight.sy, U.inOutSine(tight)) + shake[1] };
    // a calmer field (LOOK 2.12 edge density): the inflow dashes at half strength (still double speed from 16.5), the
    // long light rays thinned to every other one, blade glints only on the 17.00 lead flash, quieter fibres in his glass
    const mood = Object.assign({}, V2.grab.mixMood('clench', 'squeeze', Math.round(tight * 8) / 8), { fibreA: 0.09 });
    const R = V2.hook.frame(t, Object.assign({
      animT: tw, caption: 'off', tight, cam, dashSpeed: tw >= 16.5 ? 180 : 90, flashes: [17.0], dash: 0.5, mood, handMood: tight < 0.5 ? 'clench' : 'squeeze',
      geo: { squash: sq }, jit: 1.25, knotSeed: kseed(tw), comp: { sat: 1.14 }, crisp: { glints: fl >= 0 && fl < 8, rays: BUZZ_RAYS },
      extras: (c, q) => buzzSparks(c, tw, q.knotC, q.knotR),
    }, o));
    return R;
  }
  V2.add(15.0, 17.55, 'a1_buzz', (t, ctx) => {
    const R = buzzFrame(t, ctx, t);
    fragments(ctx, t, t, 1);
    // 15.00: the plate cracks along a diagonal and its two glass halves fall away. The plate is in front of the world
    // (halos and faces too) until it has fallen; the caption is the top layer, so IT BUZZES. reads on its onsets
    const u = (t - 15.0) / 0.45;
    if (u < 1) { V2.camera(ctx, null); V2.flushGlow(ctx); V2.flushPost(ctx); plateHalves(ctx, t, u); }
    leader(ctx, t, R.knot, 1);
    neon(ctx, t, { id: 'V11', cut: 15.0, rows: [{ n: 2, size: 132, y: 190 }, { n: 3, size: 132, y: 330 }, { n: 3, size: 132, y: 470 }] });
  });
  // the plate as one half-res image (its content frozen at 14.99): built once (warmed during the plate scene), stamped
  // into each falling half. Pure: it depends on nothing but the fixed time 14.99.
  let plateImgCv = null;
  function plateImage() {
    if (plateImgCv) return plateImgCv;
    const cv = document.createElement('canvas'); cv.width = 540; cv.height = 675;
    const g = cv.getContext('2d'); g.setTransform(0.5, 0, 0, 0.5, 0, 0);
    platePaint(g); plateLeaves(g, 14.99);
    const keep = { gj: V2.glowJobs, gw: V2.glowWideJobs, pj: V2.postJobs, cam: V2.camM };
    V2.glowJobs = []; V2.glowWideJobs = []; V2.postJobs = [];
    try { plateBody(g, 14.99, { knotT: 14.99, base: [0.5, 0, 0, 0.5, 0, 0] }); }
    finally { V2.glowJobs = keep.gj; V2.glowWideJobs = keep.gw; V2.postJobs = keep.pj; V2.camM = keep.cam; }
    plateImgCv = cv;
    return cv;
  }
  // the plate's two halves, falling and turning, with a glint on the crack
  const CRK = [[-40, 935], [250, 868], [470, 790], [700, 724], [880, 690], [1120, 598]];   // the crack runs under the caption zone
  function plateHalves(ctx, t, u) {
    // the upper half (over the caption zone) flies up and left first: y 120..560 is clear by 15.10, so IT BUZZES. is
    // read on clean ground; the lower half falls away under gravity
    const e1 = U.outCubic(clamp(u / 0.22)), e2 = U.inCubic(clamp(u));
    const halves = [
      { poly: [[-50, -50], [1130, -50], ...CRK.slice().reverse()], dx: -380 * e1, dy: -1050 * e1, r: -0.35 * e1 },
      { poly: [...CRK, [1130, 1400], [-50, 1400]], dx: 0.7 * 700 * e2, dy: 900 * e2 + 1200 * e2 * e2, r: 0.3 * e2 },
    ];
    const img = plateImage();
    halves.forEach(H => {
      if (Math.abs(H.dy) > 1500) return;
      const M = new DOMMatrix().translate(540 + H.dx, 675 + H.dy).rotate(H.r * 180 / Math.PI).translate(-540, -675);
      ctx.save();
      ctx.setTransform(M.a, M.b, M.c, M.d, M.e, M.f);
      ctx.clip(V2.P.path(H.poly, true));
      ctx.drawImage(img, 0, 0, 1080, 1350);
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#E8F7FF'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke(V2.P.path(CRK));
      ctx.restore();
    });
    V2.camera(ctx, null);
  }

  // ================================================================== 17.55 to 18.00  TAPE-STOP
  V2.add(17.55, 18.0, 'a1_tape', (t, ctx) => {
    const tw = V2.tapeWarp(t);
    const u = clamp((t - 17.55) / 0.45), k = 0.5 * u + 0.5 * U.smooth(u);   // the drain runs all the way to the cut
    // the light pass drains in GL (saturation 1 -> 0.25, a violet lean, exposure 1 -> 0.62): no extra full-frame work
    const R = buzzFrame(t, ctx, tw, { lean: '#2A2350', leanK: 0.55 * k, sat: 1.14 * (1 - 0.78 * k), expo: 1 - 0.38 * k });
    fragments(ctx, t, tw, 1 - U.smooth((t - 17.62) / 0.35));
    leader(ctx, tw, R.knot, 1);
    neon(ctx, t, { id: 'V11', rows: [{ n: 2, size: 132, y: 190 }, { n: 3, size: 132, y: 330 }, { n: 3, size: 132, y: 470 }] });
    // the crisp layers (type, lines, halos, faces) freeze with it under one violet veil (source-over: cheap)
    V2.camera(ctx, null); V2.flushGlow(ctx); V2.flushPost(ctx);
    ctx.save(); ctx.globalAlpha = 0.62 * k; ctx.fillStyle = '#302C40'; ctx.fillRect(0, 0, 1080, 1350); ctx.restore();
  });
})();
