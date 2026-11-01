// GLASS lookdev scenes: 7 style frames (0, 12.5, 22.2, 26.5, 36.6, 46.5, 57) + motion around them.
(function () {
  const W = 1080, H = 1350, TAU = Math.PI * 2;
  const { clamp, lerp, hash, rgba, osc } = G;
  const SPEC = ['#FF2E63', '#FF8A1F', '#FFD23F', '#C6FF3D', '#1FE08A', '#19C3D6', '#3D7BFF', '#9B5CFF', '#FF3EA5'];
  const NEON = ['#FF3EA5', '#3DF5FF', '#C6FF3D', '#FFD23F', '#9B5CFF', '#FF8A1F', '#19C3D6'];
  const fract = x => x - Math.floor(x);

  // kite-shaped glass shard
  function shardPts(cx, cy, ang, len, wid, skew = 0.2) {
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
    return [[cx + dx * len / 2, cy + dy * len / 2], [cx + dx * len * skew + nx * wid / 2, cy + dy * len * skew + ny * wid / 2],
      [cx - dx * len / 2, cy - dy * len / 2], [cx - dx * len * 0.1 - nx * wid / 2, cy - dy * len * 0.1 - ny * wid / 2]];
  }
  function edgeGlints(ctx, list, a = 0.55, exclude) {
    ctx.save(); ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'lighter';
    if (exclude) { const ex = new Path2D(); ex.rect(0, 0, W, H); exclude.forEach(p => ex.addPath(p)); ctx.clip(ex, 'evenodd'); }
    for (const s of list) {
      ctx.globalAlpha = a * s.a; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = s.w || 2.2;
      ctx.beginPath(); ctx.moveTo(s.p[0][0], s.p[0][1]); ctx.lineTo(s.p[1][0], s.p[1][1]); ctx.stroke();
    }
    ctx.restore();
  }

  // =====================================================================================  HOOK  0..6 (+ regrab 59.25..60)
  // colour-glass iris: translucent blades spiral in around the dark knot; the clench is an aperture closing.
  function iris(pg, C, ra, n, twist, cols, alpha, glints, o = {}) {
    for (let i = 0; i < n; i++) {
      const phi = twist + i / n * TAU;
      const nx = Math.cos(phi), ny = Math.sin(phi), dx = -ny, dy = nx;
      const px = C[0] + nx * ra, py = C[1] + ny * ra;
      const L1 = ra * 0.25, L2 = 2400, D = 2200;
      const pts = [[px - dx * L1, py - dy * L1], [px + dx * L2, py + dy * L2], [px + dx * L2 + nx * D, py + dy * L2 + ny * D], [px - dx * L1 + nx * D, py - dy * L1 + ny * D]];
      const col = cols[i % cols.length];
      const gr = pg.createLinearGradient(px, py, px + nx * (o.fade ?? 900), py + ny * (o.fade ?? 900));
      gr.addColorStop(0, rgba(col, alpha)); gr.addColorStop(0.08, rgba(col, alpha * 0.8)); gr.addColorStop(1, rgba(col, alpha * (o.far ?? 0.3)));
      pg.save(); pg.globalCompositeOperation = o.op || 'lighter'; pg.fillStyle = gr; pg.beginPath();
      pts.forEach((p, k) => k ? pg.lineTo(p[0], p[1]) : pg.moveTo(p[0], p[1])); pg.closePath(); pg.fill(); pg.restore();
      if (glints) glints.push({ p: [[px - dx * L1, py - dy * L1], [px + dx * ra * (o.glintL ?? 2.6), py + dy * ra * (o.glintL ?? 2.6)]], a: o.edgeA ?? 1, w: o.glintW ?? 3 });
    }
  }
  const HOOK_IRIS = ['#FF2E8A', '#14B8D0', '#FFC21F', '#8A4BFF', '#A8F02A', '#FF7A14', '#2FD8F0', '#E8205A', '#3D6BFF'];
  function irisU(C, ra, tw, cols, k = 1, L = 60, lift = 0) {
    const a = new Float32Array(27);
    cols.forEach((c, i) => { const h = G.hex(c); a[i * 3] = Math.pow(h[0] / 255, 2.2); a[i * 3 + 1] = Math.pow(h[1] / 255, 2.2); a[i * 3 + 2] = Math.pow(h[2] / 255, 2.2); });
    return { uIris: k, uIrisC: C, uIrisR: ra, uIrisTw: tw, uIrisL: L, uIrisLift: lift, uIrisCol: { v3: a } };
  }
  function hook(t, ctx) {
    const tt = t >= 59 ? t - 60 : t;      // continuous across the seam
    const geo = GG.geo(t, 400, 915, 335, { arm: { ext: 0, open: 0.32 }, squash: 0.03 + 0.02 * Math.sin(TAU * 12 * t) });
    const K = { x: geo.hand[0] + 78, y: geo.hand[1] - 26, R: 118 };
    const pg = G.paneBegin(g => G.vgrad(g, [[0, '#2A1A8A'], [0.45, '#341C78'], [1, '#1E1460']]));
    G.disc(pg, 120, 200, 620, '#FF3EA5', 0.30);
    G.disc(pg, 1060, 560, 560, '#19C3D6', 0.26);
    G.disc(pg, 60, 1300, 600, '#FF8A1F', 0.30);
    const glints = [];
    const bp_ = fract(tt / 0.75), pulse = Math.min(1, bp_ / 0.07) * Math.exp(-6 * bp_);   // beat pulse (80 bpm), 2-frame attack keeps the seam soft
    const ra = K.R * 1.38 + 10 * pulse;
    const twist = 0.35 + 0.06 * osc(t, 20) + 0.04 * pulse;
    // a few small shards drifting into the aperture (3 s cycle, loop safe)
    for (let i = 0; i < 14; i++) {
      const u = fract(i / 14 + tt / 3 + hash(i) * 0.1);
      const r = lerp(640, ra * 1.05, Math.pow(u, 1.25)), a = i * 2.39996 + u * 1.7;
      const x = K.x + Math.cos(a) * r, y = K.y + Math.sin(a) * r * 0.92, len = lerp(120, 34, u);
      const al = Math.sin(Math.PI * Math.min(1, u * 1.1));
      const pts = shardPts(x, y, a + Math.PI / 2 - 0.65, len, len * 0.42);
      G.poly(pg, pts, NEON[(i * 3) % NEON.length], 0.7 * al, 'lighter', 0.35);
      if (len > 70) glints.push({ p: [pts[0], pts[1]], a: al * 0.8, w: 2.2 });
    }
    // light sink: the knot eats the light
    pg.save();
    const sk = pg.createRadialGradient(K.x, K.y, K.R * 0.7, K.x, K.y, K.R * 2.2);
    sk.addColorStop(0, 'rgba(10,4,26,0.9)'); sk.addColorStop(1, 'rgba(10,4,26,0)');
    pg.fillStyle = sk; pg.fillRect(0, 0, W, H); pg.restore();
    GG.paneShadow(pg, geo, '#FF3EA5', 0.55);
    for (let i = 0; i < 9; i++) {
      const phi = twist + i / 9 * TAU, nx = Math.cos(phi), ny = Math.sin(phi), px = K.x + nx * ra, py = K.y + ny * ra;
      glints.push({ p: [[px + ny * ra * 0.3, py - nx * ra * 0.3], [px - ny * ra * 2.4, py + nx * ra * 2.4]], a: 1, w: 3 });
    }
    G.light(ctx, t, Object.assign({ uBody: [geo.bx, geo.by, geo.bw, geo.bh], uLens: 0.9, uDispC: [K.x, K.y], uDisp: 0.012 },
      irisU([K.x, K.y], ra, twist, HOOK_IRIS, 1, ra * 0.3, 0.15 * pulse)), { bloomK: 0.4, thresh: 0.8, vigCol: [0.4, 0.28, 0.8] });
    edgeGlints(ctx, glints, 0.75, [geo.body]);
    // character + knot (knot behind the glass mitten)
    GG.knot(ctx, t, K.x, K.y, K.R, { jit: 1 });
    GG.draw(ctx, geo, 'clench', { eyes: 'squeeze', sweat: 1 });
    // caption: always fully lit around the seam / poster; a spoken word gets a flare
    G.shade(ctx, g => { g.fillStyle = 'rgba(20,8,60,0.8)'; g.beginPath(); g.ellipse(540, 360, 560, 260, 0, 0, TAU); g.fill(); }, { blur: 14, op: 'multiply', alpha: 0.85, rect: [0, 40, 1080, 640] });
    hookCaption(ctx, t, tt);
    G.flushGlow(ctx);
    G.watermark(ctx);
  }
  function hookCaption(ctx, t, tt) {
    const wt = G.words('V01');
    const flare = i => { const d = tt - wt[i].wt; return d >= 0 && d < 0.4 ? Math.exp(-d * 8) : 0; };
    const yel = (y0, y1) => { const gr = ctx.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#FFF8DC'); gr.addColorStop(1, '#FFD23F'); return gr; };
    const rows = [
      { items: [0, 1], size: 132, y: 212 },
      { items: [2], size: 214, y: 418 },
      { items: [3, 4], size: 132, y: 548 },
    ];
    for (const r of rows) {
      const f = G.font(r.size, 'Anton');
      const L = G.layout(ctx, r.items.map(i => wt[i].word.toUpperCase()), 540, f, 0.22);
      L.forEach((l, k) => {
        const i = r.items[k];
        G.prismWord(ctx, l.word, l.x, r.y, f, 1, { core: yel(r.y - r.size * 0.8, r.y), fringe: r.size * 0.032, halo: '#FF5A2A', ga: 0.32 + 0.5 * flare(i) });
      });
    }
  }

  // =====================================================================================  12-15  "it's this little guy."
  function intro(t, ctx) {
    const geo = GG.geo(t, 540, 905, 300, { arm: { ext: 0, open: 0.2 } });
    const K = { x: geo.hand[0] + 48, y: geo.hand[1] - 24, R: 84 };
    const arch = [540, 430, 405, 1236];
    const pg = G.paneBegin(g => G.vgrad(g, [[0, '#2A1060'], [0.6, '#1E0C4A'], [1, '#2B1250']]));
    // light spilling from the window onto the wall
    G.disc(pg, 540, 800, 760, '#FF3EA5', 0.30);
    G.disc(pg, 540, 640, 520, '#FFD23F', 0.18);
    G.disc(pg, 160, 300, 420, '#3D7BFF', 0.28);
    G.disc(pg, 960, 260, 420, '#19C3D6', 0.24);
    // floor: projected window colour (pools of coloured light)
    const fy = 1236;
    G.vgradRect = null;
    pg.save(); pg.fillStyle = '#2A1250'; pg.fillRect(0, fy, W, H - fy); pg.restore();
    for (let i = 0; i < 9; i++) {
      const x0 = 140 + i * 90, x1 = x0 + 90;
      G.poly(pg, [[x0 + 10, fy + 6], [x1 + 10, fy + 6], [x1 + (x1 - 540) * 0.5, H], [x0 + (x0 - 540) * 0.5, H]], ['#FF3EA5', '#FFD23F', '#19C3D6', '#9B5CFF', '#FF8A1F', '#3D7BFF', '#C6FF3D', '#FF3EA5', '#FFD23F'][i], 0.45, 'lighter', 0.15);
    }
    GG.paneShadow(pg, geo, '#FFD23F', 0.0);
    G.light(ctx, t, { uWin: 1, uArch: arch, uHaloC: [540, 860], uCell: 50, uWinLight: 0.72, uBody: [geo.bx, geo.by, geo.bw, geo.bh], uLens: 0.75, uDisp: 0.006, uDispC: [540, 860] },
      { bloomK: 0.45, thresh: 0.8, vigCol: [0.4, 0.25, 0.7] });
    // halo ring above his head (comedy saint)
    const hx = geo.bx - 10, hy = geo.by - geo.bh - 46;
    const hp = new Path2D(); hp.ellipse(hx, hy, 118, 30, -0.08, 0, TAU);
    ctx.save(); ctx.strokeStyle = 'rgba(255,214,90,0.95)'; ctx.lineWidth = 15; ctx.stroke(hp); ctx.restore();
    G.lightLine(ctx, hp, { col: '#FFF6D0', w: 4, halo: '#FFD23F', gw: 26 });
    GG.knot(ctx, t, K.x, K.y, K.R, { jit: 0.8 });
    GG.draw(ctx, geo, 'worried', { eyes: 'big', mouth: 'o', sweat: 1, brows: 'worried', pupil: [0.2, 0.3] });
    // caption
    const wt = G.words('V09');
    const f = G.font(150, 'Anton');
    const yel = (y0, y1) => { const gr = ctx.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#FFF8DC'); gr.addColorStop(1, '#FFD23F'); return gr; };
    G.captionLine(ctx, t, wt.slice(0, 2).map(w => ({ word: w.word.toUpperCase(), wt: w.wt })), 540, 215, f, { core: yel(100, 215), fringe: 6, spacing: 0.22, halo: '#FF7A2A', ga: 0.7 });
    G.captionLine(ctx, t, wt.slice(2).map(w => ({ word: w.word.toUpperCase(), wt: w.wt })), 540, 372, f, { core: yel(255, 372), fringe: 6, spacing: 0.22, halo: '#FF7A2A', ga: 0.7 });
    G.flushGlow(ctx);
    G.watermark(ctx);
  }

  // =====================================================================================  21-24  sung "un-clench"
  // tinted glass fill for an arbitrary path: tint + inner rim + offset highlight edge
  function glassFill(ctx, p, tint, a, o = {}) {
    ctx.save();
    ctx.fillStyle = rgba(tint, a); ctx.fill(p);
    ctx.clip(p);
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = rgba(o.rim || '#FFFFFF', o.rimA ?? 0.35); ctx.lineWidth = o.rimW ?? 26; ctx.stroke(p);
    ctx.strokeStyle = rgba('#FFFFFF', o.hiA ?? 0.5); ctx.lineWidth = o.hiW ?? 10;
    ctx.translate(o.hx ?? -9, o.hy ?? -7); ctx.stroke(p);
    ctx.restore();
  }
  function unclench(t, ctx) {
    const u = clamp((t - 21.0) / 2.25);        // progress across the sung word
    const open = G.easeOut(clamp((t - 21.4) / 1.4));
    const P = [540, 900], J = [P[0] + 6, P[1] - 30];
    const pg = G.paneBegin(g => G.vgrad(g, [[0, '#1C1270'], [0.38, '#4A1E8E'], [0.72, '#B8247A'], [1, '#E8541F']]));
    G.disc(pg, J[0], J[1], 520, '#FF9A3D', 0.22 * open);
    G.disc(pg, J[0], J[1] - 200, 420, '#FFD23F', 0.12 * open);
    // shards of the shell's colour flung outward
    const glints = [];
    for (let i = 0; i < 18; i++) {
      const a = -Math.PI / 2 + (hash(i * 3.3) - 0.5) * 4.2;
      const d = (180 + 520 * hash(i * 1.7)) * (0.3 + 0.7 * open);
      const x = J[0] + Math.cos(a) * d, y = J[1] + Math.sin(a) * d;
      const len = 50 + 110 * hash(i * 9.1), pts = shardPts(x, y, a + hash(i) * 2, len, len * 0.45);
      G.poly(pg, pts, NEON[i % NEON.length], 0.7 * open, 'lighter', 0.3);
      if (len > 100) glints.push({ p: [pts[0], pts[1]], a: open, w: 2.4 });
    }
    const ira = lerp(150, 820, Math.pow(u, 0.85)), itw = 0.35 + 0.9 * u;
    G.light(ctx, t, Object.assign(irisU(J, ira, itw, HOOK_IRIS, 1, ira * 0.3, 0.25), {
      uDispC: J, uDisp: 0.014,
      uFan: 1.1 * open, uFanC: J, uFanDir: -Math.PI / 2, uFanW: 0.95, uFanLen: 820,
      uBurst: 0.22 * open, uBurstC: J, uBurstR: 200,
    }), { bloomK: 0.35, thresh: 0.85, vigCol: [0.5, 0.3, 0.75] });
    edgeGlints(ctx, glints, 0.7);
    // arm (glass noodle from below) + macro mitten
    const ms = 700;
    const mit = GG.mittenShapes(P[0], P[1], -Math.PI / 2 + 0.06, ms, 0.12 + 0.88 * open, 0.12);
    const arm = new Path2D(); arm.moveTo(610, H + 80); arm.bezierCurveTo(650, 1220, 520, 1140, P[0], P[1] + 60);
    const tints = ['#FF5FA8', '#FFC21F', '#A8F02A', '#2FD8F0', '#FF7A14'];
    ctx.save(); ctx.lineCap = 'round';
    const outside = new Path2D(); outside.rect(0, 0, W, H); outside.addPath(mit[0]);
    ctx.save(); ctx.clip(outside, 'evenodd');
    ctx.strokeStyle = rgba('#FF6A4A', 0.62); ctx.lineWidth = 150; ctx.stroke(arm);
    ctx.strokeStyle = rgba('#FFD6B0', 0.45); ctx.lineWidth = 30; ctx.save(); ctx.translate(-38, 0); ctx.stroke(arm); ctx.restore();
    ctx.restore();
    // translucent glass fingers: each its own tint, overlaps make new colours at the knuckles
    mit.forEach((p, i) => glassFill(ctx, p, i === 0 ? '#FF8A6A' : tints[(i - 1) % 5], i === 0 ? 0.55 : 0.55, { rim: '#FFFFFF', rimA: 0.3 }));
    ctx.restore();
    // the knot in the palm: the dark shell cracks off, the inside is a glass jewel
    const KR = 122;
    GG.jewel(ctx, t, J[0], J[1], KR * 0.95, { alpha: clamp(open * 1.6), rot: 0.2 + 0.4 * u, glowA: 0.35, halo: '#FFB0E0', whiten: 0.1 });
    GG.knot(ctx, t, J[0], J[1], KR, { jit: 1 - open, crack: 0.25 + 0.85 * open, alpha: 1 });
    // contour of hand + arm
    const box = [P[0] - ms * 0.75, P[1] - ms * 0.8, P[0] + ms * 0.75, H + 100];
    const shapes = [...Array.from(mit).map(p => ({ p })), { p: arm, tube: 150 }];
    const core = GG.outline('olW', box, shapes, 5, '#FFFFFF', 0.5);
    G.glow(g => { g.globalAlpha = 0.6; g.strokeStyle = '#FF9AC8'; g.lineWidth = 172; g.stroke(arm); g.globalCompositeOperation = 'destination-out'; g.lineWidth = 140; g.stroke(arm); g.globalCompositeOperation = 'source-over'; g.lineWidth = 12; Array.from(mit).forEach(p => g.stroke(p)); });
    const m1 = GG.tint('olM', core, '#FF2BD6'), m2 = GG.tint('olC', core, '#1FE8FF');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; GG.put(ctx, m1, -5, -2); GG.put(ctx, m2, 5, 2); ctx.restore();
    GG.put(ctx, core);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; mit.forEach(p => ctx.stroke(p)); ctx.restore();
    // caption: sung "un-clench"
    const wt = G.words('C2', true);
    const f = G.font(176, 'DM Serif Display', '400', 'italic');
    G.shade(ctx, g => { g.fillStyle = 'rgba(20,8,70,0.7)'; g.beginPath(); g.ellipse(540, 205, 470, 120, 0, 0, TAU); g.fill(); }, { blur: 12, op: 'multiply', rect: [10, 25, 1060, 360] });
    G.captionLine(ctx, t, [{ word: 'un-', wt: wt[0].wt }, { word: 'clench.', wt: wt[1].wt }], 540, 255, f,
      { spacing: 0.0, core: '#FFFDF6', fringe: 6, halo: '#FF5FB0', ga: 0.45, unlitFill: '#FFC6E4' });
    G.flushGlow(ctx);
    G.watermark(ctx);
  }

  // =====================================================================================  24-28.5  sung "you are the sky"
  function lin3(cols) { const a = new Float32Array(cols.length * 3); cols.forEach((c, i) => { const h = G.hex(c); for (let k = 0; k < 3; k++) a[i * 3 + k] = Math.pow(h[k] / 255, 2.2); }); return { v3: a }; }
  function cloudShapes(C, sc = 1) {
    const lobes = [[-78, 18, 62, '#FFFFFF'], [-18, -28, 84, '#FFD6EC'], [62, -4, 70, '#E2D4FF'], [18, 40, 62, '#FFFFFF'], [-60, 46, 46, '#FFE9B8'], [96, 34, 44, '#D6F4FF']];
    return lobes.map(l => { const p = new Path2D(); p.arc(C[0] + l[0] * sc, C[1] + l[1] * sc, l[2] * sc, 0, TAU); return { p, c: l[3] }; });
  }
  function sky(t, ctx) {
    const geo = GG.geo(t, 470, 935, 305, { arm: { ext: 0.85, tx: 755, ty: 770, open: 1 }, bob: 1 });
    const pg = G.paneBegin(g => G.vgrad(g, [[0, '#0A45BE'], [0.55, '#1C8BE6'], [1, '#56C8F0']]));
    G.disc(pg, 860, 160, 420, '#FFFFFF', 0.10);
    const C = [790, 610];
    G.light(ctx, t, {
      uBody: [geo.bx, geo.by, geo.bw, geo.bh], uLens: 1.0, uDispC: [540, 700], uDisp: 0.006,
      uRain: 1, uRainC: [470, 1560], uRainR: 1030, uRainW: 54,
    }, { bloomK: 0.2, thresh: 0.95, vigCol: [0.25, 0.35, 0.85], vig: 0.22, sat: 1.1 });
    // the cloud (the released knot): overlapping glass lobes, crisp, with prism edge
    const cs = cloudShapes(C);
    const un = new Path2D(); cs.forEach(l => un.addPath(l.p));
    ctx.save();
    const cg = ctx.createLinearGradient(0, C[1] - 120, 0, C[1] + 110);
    cg.addColorStop(0, 'rgba(255,255,255,0.5)'); cg.addColorStop(0.6, 'rgba(255,190,226,0.42)'); cg.addColorStop(1, 'rgba(170,130,255,0.5)');
    ctx.fillStyle = cg; ctx.fill(un);
    ctx.clip(un); ctx.globalCompositeOperation = 'screen';
    [[C[0] - 60, C[1] - 10, 80, '#FFE66B'], [C[0] + 50, C[1] + 10, 80, '#3DF5FF'], [C[0], C[1] - 50, 70, '#FF9ACB']].forEach(([x, y, r, c]) => {
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, rgba(c, 0.45)); rg.addColorStop(1, rgba(c, 0)); ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); });
    ctx.restore();
    const box = [C[0] - 200, C[1] - 150, C[0] + 200, C[1] + 150];
    const co = GG.outline('olW2', box, cs, 3.5, '#FFFFFF');
    G.glow(g => { g.globalAlpha = 0.35; g.strokeStyle = '#BFF0FF'; g.lineWidth = 10; cs.forEach(l => g.stroke(l.p)); });
    const m1 = GG.tint('olM2', co, '#FF2BD6'), m2 = GG.tint('olC2', co, '#FFE600');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; GG.put(ctx, m1, -4, -2); GG.put(ctx, m2, 4, 2); ctx.restore();
    GG.put(ctx, co);
    // drawn air: a few loose Hockney-ish wind lines, drawn with light
    ctx.save(); ctx.lineCap = 'round';
    [[90, 470, 300, 0], [700, 400, 260, 1], [640, 1250, 360, 2], [80, 1000, 220, 3]].forEach(([x, y, L, k]) => {
      const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([x + u * L, y + Math.sin(u * 7 + k + TAU * 2 * t / 60) * 9 - u * 18 + (u > 0.8 ? -Math.pow((u - 0.8) * 5, 2) * 22 : 0)]); }
      G.lightLine(ctx, G.path(pts), { col: '#FFFFFF', w: 3.2, halo: '#9FE8FF', gw: 10, ga: 0.5, a: 0.85 });
    });
    ctx.restore();
    // iridescent bubbles (thin film)
    for (let i = 0; i < 5; i++) {
      const x = [170, 300, 925, 975, 150][i], y = [800, 1190, 1010, 1220, 560][i] - 30 * osc(t, 2, i), r = [34, 22, 46, 26, 18][i];
      bubble(ctx, x, y, r, i);
    }
    GG.draw(ctx, geo, 'sky', { eyes: 'happy', mouth: 'smile', blush: 0.5 }, { lobeA: 0.3 });
    // caption
    const wt = G.words('C3', true);
    const f = G.font(140, 'DM Serif Display', '400', 'italic');
    G.shade(ctx, g => { g.fillStyle = 'rgba(6,30,110,0.6)'; g.beginPath(); g.ellipse(540, 205, 470, 95, 0, 0, TAU); g.fill(); }, { blur: 10, op: 'multiply', rect: [10, 50, 1060, 310] });
    G.captionLine(ctx, t, wt.map(w => ({ word: w.word, wt: w.wt })), 540, 250, f, { core: '#FFFFFF', fringe: 5, halo: '#9FE8FF', ga: 0.45, spacing: 0.24 });
    G.flushGlow(ctx);
    G.watermark(ctx);
  }
  function bubble(ctx, x, y, r, i) {
    ctx.save();
    const cg = ctx.createConicGradient(i * 1.3, x, y);
    ['#FF3EA5', '#FFD23F', '#3DF5FF', '#9B5CFF', '#C6FF3D', '#FF3EA5'].forEach((c, k) => cg.addColorStop(k / 5, c));
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = cg; ctx.lineWidth = Math.max(3, r * 0.18); ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    const rg = ctx.createRadialGradient(x, y, r * 0.5, x, y, r);
    rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(1, 'rgba(255,255,255,0.25)');
    ctx.fillStyle = rg; ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.95; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(2, r * 0.08); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, r * 0.7, Math.PI * 1.1, Math.PI * 1.4); ctx.stroke();
    ctx.restore();
  }

  // =====================================================================================  36-42.75  the drop
  function drop(t, ctx) {
    const C = [540, 760];
    const since = t - 36.0;
    const env = 0.45 + 0.75 * Math.exp(-2.5 * Math.max(0, since)) * (since >= 0 ? 1 : 0);
    // the kaleidoscope "clicks" half a facet on every beat (80 bpm; 80 x 15 deg = 40 symmetry periods per 60 s, loop safe)
    const bt = t / 0.75, bi = Math.floor(bt), bf = bt - bi;
    const rot = (TAU / 24) * (bi + G.easeOut(Math.min(1, bf * 3.5)));
    const pg = G.paneBegin(g => G.vgrad(g, [[0, '#1D2BC8'], [0.55, '#3A2BD6'], [1, '#5B2BD9']]));
    const geo = GG.geo(t, 540, 868, 300, { arm: { ext: 1, tx: 830, ty: 560, open: 1, sag: 0.05 }, squash: -0.04 * Math.exp(-6 * Math.max(0, since)), bob: 1 });
    G.light(ctx, t, {
      uBody: [geo.bx, geo.by, geo.bw, geo.bh], uLens: 0.55, uDispC: C, uDisp: 0.01,
      uKal: 1, uKalC: C, uKalRot: rot, uKalS: 1 + 0.06 * Math.exp(-4 * Math.max(0, since)),
      uBurst: 0.32 * env, uBurstC: C, uBurstR: 300,
    }, { bloomK: 0.32, thresh: 0.9, sat: 1.1, vigCol: [0.35, 0.25, 0.9] });
    // Hockney fields in reverse perspective: bands fan out from the viewer (below the frame), crisp flat colour
    const HZ = 1072, V = [540, 1900];
    const fieldCols = ['#7A2BD1', '#FF7A1A', '#B6F03C', '#FF6FB5', '#36C95A', '#FFD23F', '#E8412B', '#22C8E8', '#9B5CFF', '#FF7A1A'];
    ctx.save();
    const clipP = new Path2D(); clipP.moveTo(0, HZ + 18); clipP.quadraticCurveTo(540, HZ - 22, W, HZ + 18); clipP.lineTo(W, H); clipP.lineTo(0, H); clipP.closePath();
    ctx.clip(clipP);
    const nb = 10;
    for (let i = 0; i < nb; i++) {
      const a0 = -Math.PI / 2 - 0.62 + i / nb * 1.24, a1 = a0 + 1.24 / nb, R = 1400;
      ctx.fillStyle = fieldCols[i];
      ctx.beginPath(); ctx.moveTo(V[0], V[1]); ctx.lineTo(V[0] + Math.cos(a0) * R, V[1] + Math.sin(a0) * R); ctx.lineTo(V[0] + Math.cos(a1) * R, V[1] + Math.sin(a1) * R); ctx.closePath(); ctx.fill();
    }
    // light falls on the fields from the sun behind him (warm, fading)
    const lg = ctx.createRadialGradient(540, HZ, 0, 540, HZ, 600);
    lg.addColorStop(0, 'rgba(255,240,190,0.55)'); lg.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = lg; ctx.fillRect(0, HZ - 40, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3;
    for (let i = 0; i <= nb; i++) { const a = -Math.PI / 2 - 0.62 + i / nb * 1.24; ctx.beginPath(); ctx.moveTo(V[0], V[1]); ctx.lineTo(V[0] + Math.cos(a) * 1400, V[1] + Math.sin(a) * 1400); ctx.stroke(); }
    ctx.restore();
    // purple lollipop trees on the horizon
    [[120, 0.8], [250, 1.0], [880, 1.05], [1000, 0.75]].forEach(([x, k], i) => {
      const y = HZ + 6 - 0.0006 * (x - 540) * (x - 540) * -0.04;
      ctx.save(); ctx.strokeStyle = '#3A1470'; ctx.lineWidth = 9 * k; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x, y - 60 * k); ctx.stroke();
      const tp = new Path2D(); tp.ellipse(x, y - 95 * k, 46 * k, 54 * k, 0, 0, TAU);
      glassFill(ctx, tp, '#8A2BE2', 0.92, { rim: '#E0B0FF', rimA: 0.35, rimW: 14, hiA: 0.35, hiW: 6, hx: -5, hy: -5 });
      ctx.restore();
    });
    // confetti dashes of light on 16ths
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 44; i++) {
      const a = hash(i * 7.1) * TAU, d = 330 + 520 * fract(hash(i * 3.3) + since * 0.35);
      const x = C[0] + Math.cos(a) * d, y = C[1] + Math.sin(a) * d * 0.95;
      if (y > HZ - 10) continue;
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4.5; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 22, y + Math.sin(a) * 22); ctx.stroke();
    }
    ctx.restore();
    GG.draw(ctx, geo, 'joy', { eyes: 'happy', mouth: 'open', blush: 0.6 }, { lobeA: 0.35, glowA: 0.8 });
    // caption
    const wt = G.words('V22');
    G.shade(ctx, g => { g.fillStyle = 'rgba(40,20,140,0.55)'; g.beginPath(); g.ellipse(540, 245, 520, 150, 0, 0, TAU); g.fill(); }, { blur: 12, op: 'multiply', alpha: 0.6, rect: [0, 35, 1080, 420] });
    const f1 = G.font(84, 'DM Serif Display', '400', 'italic'), f2 = G.font(132, 'DM Serif Display', '400', 'italic');
    const items = wt.map(w => ({ word: w.word.toLowerCase(), lv: 1 }));
    G.captionLine(ctx, t, items.slice(0, 2), 540, 170, f1, { core: '#FFFFFF', fringe: 4, halo: '#FFD23F', ga: 0.4, back: '#1A1060', backW: 9 });
    const L = G.captionLine(ctx, t, items.slice(2, 5), 400, 312, f2, { core: '#FFFFFF', fringe: 5, halo: '#FFD23F', ga: 0.4, back: '#1A1060', backW: 11 });
    neonWord(ctx, 'free.', L[2].x + L[2].w + 34, 312, f2, '#FF3D9A');
    G.flushGlow(ctx, { a2: 0.8 });
    G.watermark(ctx);
  }
  function neonWord(ctx, word, x, y, f, col) {
    ctx.save(); ctx.font = f; ctx.textBaseline = 'alphabetic';
    G.glow(g => { g.font = f; g.lineWidth = 16; g.strokeStyle = col; g.strokeText(word, x, y); g.fillStyle = col; g.globalAlpha = 0.8; g.fillText(word, x, y); });
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineJoin = 'round'; ctx.lineWidth = 15; ctx.strokeStyle = 'rgba(26,16,96,0.75)'; ctx.strokeText(word, x, y + 2);
    ctx.fillStyle = rgba(col, 0.55); ctx.fillText(word, x, y);
    ctx.lineWidth = 9; ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.strokeText(word, x, y);
    ctx.lineWidth = 3.2; ctx.strokeStyle = '#FFF0F8'; ctx.strokeText(word, x, y);
    ctx.restore();
  }

  // =====================================================================================  45-48.75  metta "love him open."
  function metta(t, ctx) {
    const C = [540, 870];
    const pg = G.paneBegin(g => G.vgrad(g, [[0, '#B8285E'], [0.5, '#E0487A'], [1, '#FF8A5C']]));
    G.disc(pg, C[0], C[1], 640, '#FFC23D', 0.12);
    const sung = clamp((t - 45.0) / 2.25);
    const open = 0.55 + 0.45 * G.easeOut(sung);           // the flower opens across "love him open"
    const geo = GG.geo(t, 540, 905, 280, { arm: { ext: 0.75, tx: 652, ty: 925, open: 0.85, sag: 0.08 }, bob: 0.5 });
    G.light(ctx, t, {
      uBody: [geo.bx, geo.by, geo.bw, geo.bh], uLens: 0.5, uDispC: C, uDisp: 0.008,
      uRose: 0.9, uRoseC: C, uRoseD: 238 * open, uRoseR: 238, uRoseRot: -Math.PI / 2 + TAU * t / 60,
      uRoseCol: lin3(['#FF5FA8', '#FFB000', '#FF4F9A', '#9B6BFF', '#FFB000', '#FF4F9A', '#9B6BFF']),
    }, { bloomK: 0.3, thresh: 0.9, vig: 0.25, vigCol: [0.7, 0.35, 0.6] });
    // the enso: one open brush ring of gold glass, drawn on (~25 degree gap)
    const prog = clamp((t - 44.6) / 2.4);
    const a0 = -Math.PI * 0.40, span = TAU * (335 / 360) * G.easeOut(prog);
    const R = 505, pts = [];
    for (let i = 0; i <= 140; i++) { const a = a0 + span * i / 140; const rr = R * (1 + 0.02 * Math.sin(a * 3 + 1)); pts.push([C[0] + Math.cos(a) * rr, C[1] + Math.sin(a) * rr * 0.98]); }
    const bp = LX.brushPath(pts, 64, 2, 0.45);
    G.glow(g => { g.fillStyle = '#FFB000'; g.globalAlpha = 0.85; g.fill(bp); });
    ctx.save();
    const eg = ctx.createLinearGradient(C[0] - R, C[1] - R, C[0] + R, C[1] + R);
    eg.addColorStop(0, '#FFE066'); eg.addColorStop(0.5, '#FFB000'); eg.addColorStop(1, '#FFE9A0');
    ctx.globalAlpha = 0.95; ctx.fillStyle = eg; ctx.fill(bp);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.fillStyle = '#FF3EA5'; ctx.save(); ctx.translate(-5, -3); ctx.fill(bp); ctx.restore();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.strokeStyle = '#FFF8E0'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke(G.path(pts.slice(5, -8)));
    // dry-brush bristle lines along the stroke (the drawing hand shows)
    ctx.lineWidth = 2.2;
    [[-20, '#C46A00', 0.55, 0.1, 0.92], [-9, '#FFF3C4', 0.7, 0.0, 0.97], [12, '#C46A00', 0.45, 0.04, 0.8], [23, '#FF7FB0', 0.6, 0.15, 0.99]].forEach(([off, col, a, u0, u1]) => {
      const q = pts.slice(Math.floor(u0 * pts.length), Math.floor(u1 * pts.length)).map(([x, y]) => { const dx = x - C[0], dy = y - C[1], l = Math.hypot(dx, dy); return [x + dx / l * off, y + dy / l * off]; });
      ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.stroke(G.path(q));
    });
    ctx.restore();
    // the knot, small and glass now, held gently
    GG.jewel(ctx, t, geo.hand[0] + 6, geo.hand[1] - 52, 52, { cols: ['#FF3E8E', '#FFB000', '#8A5BFF', '#FF7A3C', '#2FD8A0'], center: '#FFE3EE', rot: 0.4, glowA: 0.25, halo: '#FF6FB0', whiten: 0.08 });
    GG.draw(ctx, geo, 'metta', { eyes: 'closed', mouth: 'smile', blush: 0.9, ink: '#3A0F4A' }, { lobeA: 0.38 });
    const wt = G.words('C6', true);
    const f = G.font(138, 'DM Serif Display', '400', 'italic');
    const items = [{ word: 'love', wt: wt[0].wt }, { word: 'him', wt: wt[1].wt }, { word: 'open.', wt: wt[2].wt }];
    G.shade(ctx, g => { g.fillStyle = 'rgba(70,8,50,0.7)'; g.beginPath(); g.ellipse(540, 210, 470, 110, 0, 0, TAU); g.fill(); }, { blur: 12, op: 'multiply', rect: [10, 40, 1060, 340] });
    G.captionLine(ctx, t, items, 540, 255, f, { core: '#FFF7F0', f1: '#FF3EA5', f2: '#FFC23D', fringe: 4.5, halo: '#FFB000', ga: 0.4,
      unlitFill: '#FFB0D0', unlitStroke: 'rgba(255,230,240,0.8)', unlitA: 0.22 });
    G.flushGlow(ctx, { a1: 0.7, a2: 0.6 });
    G.watermark(ctx);
  }

  // =====================================================================================  54-59.25  rest "just come back."
  function rest(t, ctx) {
    // Moon Room: the same window as the "little guy" shot, now at night; moonlight lays its colours on the floor
    const geo = GG.geo(t, 400, 985, 300, { arm: { ext: 0.6, tx: 640, ty: 1135, open: 0.5, sag: 0.02 } });
    const arch = [790, 380, 225, 960], M = [790, 640];
    const FY = 1010;
    const pg = G.paneBegin(g => G.vgrad(g, [[0, '#0B1450'], [0.5, '#16237E'], [0.748, '#22339A'], [0.75, '#121C66'], [1, '#0C1450']]));
    G.disc(pg, M[0], M[1], 620, '#4D6BFF', 0.30);
    G.disc(pg, 120, 300, 420, '#7A3CFF', 0.22);
    // the window's light on the floor: a skewed grid of coloured panes
    const pcs = ['#FF4F9A', '#FFC23D', '#3DF5FF', '#9B6BFF', '#C6FF3D', '#FF8A5C', '#6D8BFF', '#FF4F9A', '#3DF5FF'];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const sx = 760 - 380 * (r / 3), y0 = FY + 30 + r * 95, x0 = sx - 150 + c * 165 - r * 60;
      G.poly(pg, [[x0, y0], [x0 + 150, y0], [x0 + 150 - 70, y0 + 86], [x0 - 70, y0 + 86]], pcs[(r * 3 + c) % 9], 0.40, 'lighter', 0.7);
    }
    G.beam(pg, 790, 700, 560, 1180, 420, 620, '#9FB4FF', 0.14, 0.03);
    GG.paneShadow(pg, geo, '#9B5CFF', 0.5);
    G.light(ctx, t, {
      uBody: [geo.bx, geo.by, geo.bw, geo.bh], uLens: 0.7, uDisp: 0.004, uDispC: M,
      uWin: 1, uArch: arch, uHaloC: M, uCell: 40, uWinLight: 0.62, uWinTint: [0.55, 0.62, 1.0], uWinCore: 0.5,
      uCaus: 0.16, uCausBox: [560, 1180, 560, 150], uCausCol: [0.75, 0.82, 1.0],
      uMoon: 1, uMoonC: [M[0], M[1], 74],
    }, { bloomK: 0.32, thresh: 0.7, vigCol: [0.25, 0.3, 0.8] });
    // stars: tiny four-point glints, frozen (rest)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#F4EFD8'; ctx.lineCap = 'round';
    [[90, 420, 1], [250, 560, 0.7], [140, 760, 0.8], [470, 470, 0.6], [1010, 300, 0.7], [560, 820, 0.5], [60, 600, 0.5]].forEach(([x, y, k]) => {
      ctx.globalAlpha = 0.85 * k; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - 12 * k, y); ctx.lineTo(x + 12 * k, y); ctx.moveTo(x, y - 12 * k); ctx.lineTo(x, y + 12 * k); ctx.stroke();
    });
    ctx.restore();
    GG.jewel(ctx, t, geo.hand[0] + 44, geo.hand[1] - 20, 40, { cols: ['#FFC9E3', '#C6A3FF', '#9FB4FF', '#FFE3C4', '#A6FFE9'], center: '#FFFFFF', rot: 0.1, glowA: 0.7, halo: '#C9D6FF', alpha: 0.95 });
    GG.draw(ctx, geo, 'rest', { eyes: 'closed', mouth: 'smile', ink: '#1A1650' }, { lobeA: 0.34, fringe: 2 });
    // caption
    const wt = G.words('V33');
    const f = G.font(132, 'DM Serif Display', '400', 'italic');
    G.captionLine(ctx, t, wt.map(w => ({ word: w.word, wt: w.wt })), 540, 250, f, { core: '#F6F1DE', fringe: 3.5, f1: '#C6A3FF', f2: '#7FD8FF', halo: '#8FA8FF', ga: 0.5, lead: 0.12,
      unlitFill: '#9FB4FF', unlitA: 0.42, unlitStroke: 'rgba(230,236,255,0.9)', unlitLine: 2.6 });
    G.flushGlow(ctx);
    G.watermark(ctx);
  }

  // =====================================================================================  dispatcher
  const SCENES = [
    [0, 6, hook], [6, 18, intro], [18, 24, unclench], [24, 36, sky], [36, 42.75, drop], [42.75, 49.5, metta], [49.5, 59.25, rest], [59.25, 60.01, hook],
  ];
  window.GLASS_DRAW = function (t) {
    t = ((t % 60) + 60) % 60;
    const ctx = ENGINE.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    G.glowJobs = [];
    const S = SCENES.find(s => t >= s[0] && t < s[1]) || SCENES[0];
    S[2](t, ctx);
  };
})();
