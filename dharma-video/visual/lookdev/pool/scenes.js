// "Hockney pool light": one swimming pool of light through one day of the mind.
// night pool (clench) -> cyanotype noon-spot (the specimen) -> dawn splash (unclench) -> day pool-sky ->
// full-spectrum sun over reverse-perspective fields (drop) -> sunset rosette + open enso (metta) -> moonlit pool (rest) -> drain (regrab).
// Layers per frame: FIELD (flat color planes, 540x675) | GL light (caustic nets, knot, sun, ripples, bloom) | 2D drawing (light lines, faces, type).
(function () {
  const W = 1080, H = 1350, TAU = Math.PI * 2;
  const E = ENGINE;
  const SC = {};
  const hs = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const cyc = (t, k = 1) => TAU * k * t / 60;          // loop-safe phase (k whole cycles per 60 s)

  let FC, FG, AC, AG, BC, BG, DC, DG, KC, KG;
  function prep() {
    [FC, FG] = LX.scratch('field', 540, 675); FG.scale(0.5, 0.5);
    [AC, AG] = LX.scratch('mA', 270, 338); AG.fillStyle = '#000'; AG.fillRect(0, 0, 270, 338); AG.scale(0.25, 0.25);
    [BC, BG] = LX.scratch('mB', 270, 338); BG.fillStyle = '#000'; BG.fillRect(0, 0, 270, 338); BG.scale(0.25, 0.25);
    // unfiltered layers, each blurred ONCE into its mask (filter blur per fill is a hidden per-call cost)
    [DC, DG] = LX.scratch('dome', 270, 338); DG.clearRect(0, 0, 270, 338); DG.scale(0.25, 0.25);
    [KC, KG] = LX.scratch('calm', 270, 338); KG.clearRect(0, 0, 270, 338); KG.scale(0.25, 0.25);
  }
  function finishMasks() {
    AG.save(); AG.setTransform(1, 0, 0, 1, 0, 0); AG.globalCompositeOperation = 'lighter'; AG.filter = 'blur(8px)'; AG.drawImage(DC, 0, 0); AG.restore();
    BG.save(); BG.setTransform(1, 0, 0, 1, 0, 0); BG.globalCompositeOperation = 'lighter'; BG.filter = 'blur(11px)'; BG.drawImage(KC, 0, 0); BG.restore();
  }

  // ------------------------------------------------------------------ painting helpers
  function vgrad(g, stops, x0 = 0, y0 = 0, x1 = W, y1 = H) {
    const gr = g.createLinearGradient(0, y0, 0, y1);
    stops.forEach(([o, c]) => gr.addColorStop(o, c));
    g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  function rgrad(g, cx, cy, r, stops, rect = [0, 0, W, H]) {
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    stops.forEach(([o, c]) => gr.addColorStop(o, c));
    g.fillStyle = gr; g.fillRect(...rect);
  }
  function wobEll(cx, cy, rx, ry, seed, amp = 0.04, n = 72, rot = 0) {
    const pts = [], c = Math.cos(rot), s = Math.sin(rot);
    const p1 = hs(seed) * TAU, p2 = hs(seed + 1) * TAU, p3 = hs(seed + 2) * TAU;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU;
      const k = 1 + amp * (0.6 * Math.sin(3 * a + p1) + 0.3 * Math.sin(5 * a + p2) + 0.2 * Math.sin(8 * a + p3));
      const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
      pts.push([cx + x * c - y * s, cy + x * s + y * c]);
    }
    return GR.poly(pts);
  }
  // wobbly horizontal-ish edge from x=0..W, returns polygon closed down (below=true) or up
  function edgePoly(y0, y1, seed, amp, below) {
    const p = new Path2D(), n = 40;
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = u * W;
      const y = E.lerp(y0, y1, u) + amp * (Math.sin(u * 7.1 + seed) * 0.6 + Math.sin(u * 13.7 + seed * 2) * 0.3 + Math.sin(u * 3.3 + seed * 3) * 0.5);
      i ? p.lineTo(x, y) : p.moveTo(x, y);
    }
    if (below) { p.lineTo(W, H + 10); p.lineTo(0, H + 10); } else { p.lineTo(W, -10); p.lineTo(0, -10); }
    p.closePath();
    return p;
  }
  function polyline(pts) { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); return p; }

  // tangled neon scribble (the knot's hero strands): crisp, re-seeded at 12 Hz
  function scribblePts(c, R, seed, turns = 3.2) {
    const pts = [], n = Math.round(turns * 64);
    const p1 = hs(seed) * TAU, p2 = hs(seed + 1) * TAU, p3 = hs(seed + 2) * TAU, p4 = hs(seed + 3) * TAU;
    for (let i = 0; i <= n; i++) {
      const u = i / n, a = u * turns * TAU + p1;
      const r = R * (0.58 + 0.24 * Math.sin(3.1 * a + p2) + 0.14 * Math.sin(7.3 * a + p3) + 0.06 * Math.sin(13 * a + p4));
      pts.push([c[0] + Math.cos(a) * r + R * 0.14 * Math.sin(u * TAU * 2 + p3), c[1] + Math.sin(a) * r * 0.94 + R * 0.12 * Math.cos(u * TAU * 3 + p1)]);
    }
    return pts;
  }
  // tapered light ray (brush) from p0 along angle a, length L, base width w
  function rayPath(x, y, a, L, w, bend = 0) {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10, b = bend * Math.sin(u * Math.PI);
      pts.push([x + Math.cos(a) * L * u - Math.sin(a) * b, y + Math.sin(a) * L * u + Math.cos(a) * b]);
    }
    // width profile: fat base -> point
    const Lp = [], Rp = [];
    for (let i = 0; i < pts.length; i++) {
      const u = i / (pts.length - 1), hw = w * 0.5 * Math.pow(1 - u, 0.9) + 0.4;
      const pa = pts[Math.max(0, i - 1)], pb = pts[Math.min(pts.length - 1, i + 1)];
      let dx = pb[0] - pa[0], dy = pb[1] - pa[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      Lp.push([pts[i][0] - dy * hw, pts[i][1] + dx * hw]); Rp.push([pts[i][0] + dy * hw, pts[i][1] - dx * hw]);
    }
    const p = new Path2D();
    Lp.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]));
    for (let i = Rp.length - 1; i >= 0; i--) p.lineTo(Rp[i][0], Rp[i][1]);
    p.closePath();
    return p;
  }

  // ------------------------------------------------------------------ type
  function fitSize(ctx, text, family, weight, style, width) {
    ctx.font = `${style} ${weight} 100px "${family}"`;
    return 100 * width / ctx.measureText(text).width;
  }
  // caption lit state: preview shows the whole line; ?sync=1 lights words at their timing.js onsets
  function lit(onset, t) { return window.SYNC ? E.clamp((t - onset + 0.05) / 0.12) : 1; }
  const wordOnset = (id, i) => {
    const L = TIMING.lines.find(l => l.id === id) || (TIMING.choir || []).find(l => l.id === id);
    return L ? L.word_t[Math.min(i, L.word_t.length - 1)] : 0;
  };

  // Anton neon block: lines = [{text, y, size?, width?, onset}], halo colors via glow pass
  function antonBlock(S, lines, o) {
    const ctx = E.ctx;
    let yy = o.top;
    const items = lines.map(L => {
      const size = L.size || fitSize(ctx, L.text, 'Anton', '400', 'normal', L.width);
      ctx.font = `normal 400 ${size}px "Anton"`;
      const m = ctx.measureText(L.text), w = m.width;
      const cap = ctx.measureText('H').actualBoundingBoxAscent;
      const x = o.align === 'left' ? o.x : o.x - w / 2;
      const y = L.y ?? (yy + cap);
      yy = y + (o.gap ?? 22);
      return { ...L, size, x, w, y, cap };
    });
    S.glow.push(g => {
      items.forEach(it => {
        const a = lit(it.onset ?? 0, S.t);
        if (a <= 0) return;
        g.font = `normal 400 ${it.size}px "Anton"`; g.textBaseline = 'alphabetic';
        g.globalAlpha = 0.95 * a; g.fillStyle = o.halo; g.fillText(it.text, it.x, it.y);
        g.globalAlpha = 0.55 * a; g.fillStyle = o.halo2 || o.halo; g.fillText(it.text, it.x + 6, it.y + 5);
        g.globalAlpha = 1;
      });
    });
    S.crisp.push(c => {
      items.forEach(it => {
        const a = lit(it.onset ?? 0, S.t);
        c.font = `normal 400 ${it.size}px "Anton"`; c.textBaseline = 'alphabetic';
        if (a < 1) { c.globalAlpha = 0.16; c.strokeStyle = o.fill[0]; c.lineWidth = 2; c.strokeText(it.text, it.x, it.y); }
        if (a <= 0) return;
        c.globalAlpha = a;
        // off-register chromatic shadow line (hot pink) then the lit face
        if (o.edge) { c.fillStyle = o.edge; c.fillText(it.text, it.x + 4, it.y + 4); }
        const gr = c.createLinearGradient(0, it.y - it.size * 0.75, 0, it.y);
        gr.addColorStop(0, o.fill[1]); gr.addColorStop(1, o.fill[0]);
        c.fillStyle = gr; c.fillText(it.text, it.x, it.y);
        c.globalAlpha = 1;
      });
    });
    return items;
  }
  // serif italic line written in light: soft colored halo (glow pass), optional dark glass behind, crisp warm-white face
  function serifLine(S, text, x, y, size, o = {}) {
    const ctx = E.ctx, wt = o.weight || '600';
    ctx.font = `italic ${wt} ${size}px "Fraunces"`;
    const w = ctx.measureText(text).width;
    const x0 = o.align === 'left' ? x : x - w / 2;
    const a = lit(o.onset ?? 0, S.t);
    if (o.glass) S.under.push(c => {
      c.save(); c.globalCompositeOperation = o.glassOp || 'multiply';
      const cx = x0 + w / 2, cy = y - size * 0.32;
      c.translate(cx, cy); c.scale(1, (size * 1.25) / (w * 0.62 + 120));
      const rg = c.createRadialGradient(0, 0, 0, 0, 0, w * 0.62 + 120);
      rg.addColorStop(0, LX.rgba(o.glass, o.glassA ?? 0.5)); rg.addColorStop(0.6, LX.rgba(o.glass, (o.glassA ?? 0.5) * 0.6)); rg.addColorStop(1, LX.rgba(o.glass, 0));
      c.fillStyle = rg; c.fillRect(-(w * 0.62 + 120), -(w * 0.62 + 120), 2 * (w * 0.62 + 120), 2 * (w * 0.62 + 120));
      c.restore();
    });
    S.glow.push(g => {
      if (a <= 0) return;
      g.font = `italic ${wt} ${size}px "Fraunces"`; g.textBaseline = 'alphabetic';
      g.globalAlpha = (o.haloA ?? 0.9) * a; g.fillStyle = o.halo || '#FF8FC0'; g.fillText(text, x0, y);
      if (o.halo2) { g.globalAlpha = 0.6 * a; g.fillStyle = o.halo2; g.fillText(text, x0 - 5, y + 4); }
      g.globalAlpha = 1;
    });
    S.crisp.push(c => {
      c.font = `italic ${wt} ${size}px "Fraunces"`; c.textBaseline = 'alphabetic';
      if (a <= 0) return;
      c.globalAlpha = a;
      if (o.edge) { c.fillStyle = o.edge; c.fillText(text, x0 + (o.edgeDx ?? 3), y + (o.edgeDy ?? 3)); }
      c.fillStyle = o.fill || '#FFF6E6'; c.fillText(text, x0, y);
      c.globalAlpha = 1;
    });
    return { x0, w };
  }

  // ------------------------------------------------------------------ shared character layer plumbing
  function character(S, G, st) {
    GR.field(FG, G, st);
    GR.mask(AG, DG, G, { mitten: st.maskMitten !== false });
    S.glow.push(g => GR.glow(g, G, st, S.frame));
    S.crisp.push(c => GR.lines(c, G, st, S.frame));
  }
  function calm(g, cx, cy, rx, ry, a = 1) {
    KG.save(); KG.globalCompositeOperation = 'lighter';
    KG.fillStyle = `rgba(255,0,0,${a})`; KG.beginPath(); KG.ellipse(cx, cy, rx * 0.92, ry * 0.92, 0, 0, TAU); KG.fill(); KG.restore();
  }
  function knotMask(c, R, a = 1, t = 0) {
    AG.save(); AG.globalCompositeOperation = 'lighter';
    AG.fillStyle = `rgba(0,0,255,${a})`;
    AG.fill(wobEll(c[0], c[1], R, R * 0.94, 5 + Math.floor(t * 12) * 3.1, 0.16, 48));
    AG.restore();
  }
  function knotStrands(S, c, R, seed, cols, w = 4, alpha = 1) {
    const sd = seed + Math.floor(S.t * 12);   // 12 Hz jitter
    const paths = cols.map((col, i) => [polyline(scribblePts(c, R, sd * 3.7 + i * 11.3, 2.6 + i * 0.4)), col]);
    S.glow.push(g => { g.lineWidth = w * 2.2; g.globalAlpha = 0.45 * alpha; paths.forEach(([p, col]) => { g.strokeStyle = col; g.stroke(p); }); g.globalAlpha = 1; });
    S.crisp.push(c2 => {
      c2.save(); c2.lineCap = 'round'; c2.lineJoin = 'round';
      paths.forEach(([p, col], i) => {
        c2.globalAlpha = alpha;
        // chromatic split: a hot offset copy, then the strand
        c2.strokeStyle = i % 2 ? '#3DF5FF' : '#FF2EA6'; c2.lineWidth = w * 0.6; c2.globalAlpha = 0.7 * alpha;
        c2.save(); c2.translate(i % 2 ? 3 : -3, i % 2 ? -2 : 2); c2.stroke(p); c2.restore();
        c2.globalAlpha = alpha; c2.strokeStyle = col; c2.lineWidth = w; c2.stroke(p);
      });
      c2.restore();
    });
  }
  function netPhase(t, k = 1) { return { uPh: TAU * k * t / 6, uFlow: [70 * Math.cos(cyc(t)), 70 * Math.sin(cyc(t))] }; }

  // ================================================================== SCENES
  const SCENES = [];
  const scene = (t0, t1, name, fn) => SCENES.push({ t0, t1, name, fn });

  // ---------------------------------------------------------------- 0-6 HOOK: night pool, the grab is a drain
  scene(0, 6, 'hook', (S, t) => {
    const G = GR.geo({ x: 420, y: 925, s: 312, squash: 0.045 + 0.012 * Math.sin(cyc(t, 80)), tilt: 0.05,
      arm: { tx: 712, ty: 985, ext: 1, open: 0.04, sag: 34 }, knot: 1.15 });
    const kc = G.knotC, kR = G.knotR;
    // FIELD: violet night water, flat patchwork shadow behind the type, the character's cast shadow
    vgrad(FG, [[0, '#2A1468'], [0.42, '#22279A'], [0.75, '#1B2A8C'], [1, '#141B66']]);
    FG.fillStyle = '#25105E'; FG.fill(edgePoly(600, 560, 1.7, 22, false));
    FG.globalAlpha = 0.75; FG.fillStyle = '#120A46'; FG.fill(wobEll(470, 1175, 300, 58, 3, 0.06)); FG.globalAlpha = 1;
    knotStrands(S, kc, kR * 1.05, 17, ['#FF2EA6', '#C6FF3D', '#9B5CFF'], 4.5);
    character(S, G, {
      fill: ['#FFC069', '#FF7A1A', '#E8412B'], fillA: 0.93, arm: '#FF7A1A', mitten: '#FFB347', mittenA: 0.7,
      core: '#FFF4CF', halo: '#FF8A1F', second: { color: '#FF3EA5', dx: 8, dy: -6, a: 0.95 },
      eyes: 'squeeze', mouth: 'zigzag', sweat: 1, eye: '#2A0B4F', eyeHalo: '#FFF3C4', eyeGlowA: 0.5, coreW: 13, eyeW: 17, boil: 1.6,
    });
    knotMask(kc, kR * 1.0, 1, t);
    // MASK B: calm under the caption + around him (1.3x radius); the top plane is shade
    calm(BG, 540, 360, 540, 260, 0.9, 12);
    calm(BG, G.cx, G.cy - 10, 1.25 * G.bw, 1.15 * G.bh, 0.6, 12);
    BG.save(); BG.globalCompositeOperation = 'lighter'; BG.fillStyle = '#00ff00'; BG.fill(edgePoly(600, 560, 1.7, 22, false)); BG.restore();
    antonBlock(S, [
      { text: "YOU'RE CLENCHING", width: 930, onset: wordOnset('V01', 1) },
      { text: 'SOMETHING', width: 930, onset: wordOnset('V01', 2) },
      { text: 'RIGHT NOW.', width: 930, onset: wordOnset('V01', 3) },
    ], { x: 540, top: 104, gap: 24, halo: '#FF6A1F', halo2: '#FF2E97', fill: ['#FFD23F', '#FFF6C9'], edge: '#E0217F' });
    return {
      U: Object.assign(netPhase(t), {
        uScale: 140, uAniso: 1.35, uWarp: 1.1, uLineW: 0.06, uLineI: 1.15, uFineI: 0.7, uGlowI: 0.35, uBreak: 0.24, uShadeK: 0.55, uDarkI: 0.4,
        uCA: '#E6DAFF', uCB: '#7FE8FF', uCC: '#FF5FC8', uCD: '#9B5CFF', uCX: '#FFFFFF',
        uDrain: [kc[0], kc[1], 1.0, 230], uPullCol: '#FF7FD0', uLens: 480, uBodyLine: '#FFF0B8', uBodyLineK: 0.95, uBodyLineI: 0.32,
        uKnotSeed: Math.floor(t * 12), uKnotI: 1.4, uKnotBase: '#170634', uKnotScale: 28,
      }), comp: { bloomK: 1.0, vig: 0.3, vigCol: '#3A1E6E' },
    };
  });

  // ---------------------------------------------------------------- 6-18 the specimen: cyanotype pool, lemon spot
  scene(6, 18, 'intro', (S, t) => {
    const G = GR.geo({ x: 505, y: 960, s: 300, squash: 0.02, tilt: -0.04, look: [0.1, -0.2],
      arm: { tx: 735, ty: 1040, ext: 1, open: 0.05, sag: 30 }, knot: 0.82 });
    const kc = G.knotC, kR = G.knotR;
    vgrad(FG, [[0, '#0E3FB0'], [0.5, '#1450C8'], [1, '#0A2C80']]);
    // the lemon spotlight on the pool floor, flat and hard-edged; a darker cobalt shadow plane at its left
    FG.fillStyle = '#FFD23F'; FG.fill(wobEll(560, 975, 395, 330, 11, 0.025));
    FG.save(); FG.clip(wobEll(560, 975, 395, 330, 11, 0.025));
    FG.fillStyle = '#FFB020'; FG.fill(wobEll(560, 1150, 420, 120, 4, 0.05)); FG.restore();
    FG.globalAlpha = 0.8; FG.fillStyle = '#C2187A'; FG.fill(wobEll(560, 1215, 250, 42, 5, 0.06)); FG.globalAlpha = 1;
    knotStrands(S, kc, kR * 1.05, 23, ['#FF2EA6', '#C6FF3D', '#9B5CFF'], 4.2);
    character(S, G, {
      fill: ['#FF8FC8', '#FF3EA5', '#C2187A'], fillA: 0.92, arm: '#FF3EA5', mitten: '#FF8FC8', mittenA: 0.6,
      core: '#FFFFFF', halo: '#FF3EA5', second: { color: '#3DF5FF', dx: -7, dy: -6, a: 0.9 },
      eyes: 'big', mouth: 'o', sweat: 1, brows: 'worried', eye: '#1B1050', eyeShine: '#FFFFFF', eyeHalo: '#FFFFFF', eyeGlowA: 0.6, coreW: 12, eyeW: 12, boil: 1.4,
    });
    knotMask(kc, kR * 1.0, 1, t);
    calm(BG, 380, 320, 440, 240, 0.9, 12);
    calm(BG, 880, 520, 140, 220, 0.6, 12);
    calm(BG, G.cx, G.cy - 10, 1.25 * G.bw, 1.15 * G.bh, 0.55, 12);
    BG.save(); BG.globalCompositeOperation = 'lighter'; BG.fillStyle = '#00ff00'; BG.fill(wobEll(560, 975, 395, 330, 11, 0.025)); BG.restore();
    antonBlock(S, [
      { text: "IT'S THIS", size: 172, onset: wordOnset('V09', 0) },
      { text: 'LITTLE GUY.', size: 172, onset: wordOnset('V09', 2) },
    ], { x: 72, top: 150, gap: 26, align: 'left', halo: '#FFB020', halo2: '#3DF5FF', fill: ['#FFD23F', '#FFF6C9'], edge: '#0A2C80' });
    // the pointing arrow, drawn in one stroke of light
    const ar = LX.smoothPts([[940, 330], [985, 470], [930, 600], [805, 690]], 10);
    const tip = ar[ar.length - 1], pre = ar[ar.length - 6], aa = Math.atan2(tip[1] - pre[1], tip[0] - pre[0]);
    const head = polyline([[tip[0] - Math.cos(aa - 0.55) * 52, tip[1] - Math.sin(aa - 0.55) * 52], tip, [tip[0] - Math.cos(aa + 0.5) * 50, tip[1] - Math.sin(aa + 0.5) * 50]]);
    S.glow.push(g => { g.strokeStyle = '#FFB020'; g.lineWidth = 34; g.stroke(polyline(ar)); g.stroke(head); });
    S.crisp.push(c => {
      c.save(); c.fillStyle = '#FFE14A'; c.fill(LX.brushPath(ar, 18, 2, 0.4));
      c.strokeStyle = '#FFE14A'; c.lineWidth = 13; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(head);
      c.fillStyle = '#FFFBEA'; c.fill(LX.brushPath(ar, 6, 2, 0.4)); c.strokeStyle = '#FFFBEA'; c.lineWidth = 4; c.stroke(head); c.restore();
    });
    return {
      U: Object.assign(netPhase(t), {
        uScale: 150, uAniso: 1.4, uWarp: 1.0, uLineW: 0.06, uLineI: 1.05, uFineI: 0.7, uGlowI: 0.3, uBreak: 0.28, uShadeK: 0.85, uDarkI: 0.4,
        uCA: '#FFFFFF', uCB: '#BFF4FF', uCC: '#FFE14A', uCD: '#9FD8FF',
        uTiles: 0.28, uTileSize: 104, uTileC: '#7FC4FF',
        uDrain: [kc[0], kc[1], 0.6, 160], uPullCol: '#FFB0E0', uLens: 480, uBodyLine: '#FFF3A6', uBodyLineK: 0.9, uBodyLineI: 0.4,
        uKnotSeed: Math.floor(t * 12), uKnotI: 1.4, uKnotBase: '#14062E', uKnotScale: 26,
      }), comp: { bloomK: 0.85, vig: 0.22, vigCol: '#2B1458' },
    };
  });

  // ---------------------------------------------------------------- 18-24 unclench: dawn, the fist opens, a splash of light
  scene(18, 24, 'unclench', (S, t) => {
    const open = E.smoother(E.range(t, 21.5, 22.6));
    const hc = [540, 930], ms = 640, ang = -Math.PI / 2 - 0.05;
    const M = GR.mitten(hc[0], hc[1], ang, ms, open, 0.07);
    const HZ = 500;
    // FIELD: dawn sky bands over turquoise water
    vgrad(FG, [[0, '#2E1A6E'], [0.13, '#6A23A8'], [0.26, '#E8338F'], [0.36, '#FF7A2A'], [0.37, '#19C3D6'], [0.62, '#1E86E0'], [1, '#1B2A8C']]);
    FG.fillStyle = '#FFD23F'; FG.beginPath(); FG.arc(850, HZ + 8, 80, Math.PI, TAU); FG.fill();
    // wrist + palm + fingers: translucent peach glass (overlaps build glowing knuckles)
    const wrist = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12; wrist.push([hc[0] - 150 - 40 * u * u + 10 * Math.sin(u * 3), E.lerp(hc[1] + 120, H + 30, u)]); }
    for (let i = 12; i >= 0; i--) { const u = i / 12; wrist.push([hc[0] + 140 + 48 * u * u - 8 * Math.sin(u * 3), E.lerp(hc[1] + 120, H + 30, u)]); }
    FG.save();
    FG.globalAlpha = 0.95; FG.fillStyle = '#FF8F86'; FG.fill(GR.poly(wrist));
    const pg = FG.createRadialGradient(hc[0], hc[1] - 60, 20, hc[0], hc[1], ms * 0.62);
    pg.addColorStop(0, '#FFF0D6'); pg.addColorStop(0.45, '#FFB08A'); pg.addColorStop(1, '#FF5FA2');
    FG.fillStyle = pg; FG.globalAlpha = 0.72;
    M.parts.forEach(p => FG.fill(GR.poly(p.pts)));
    FG.restore();
    FG.globalAlpha = 0.6; FG.fillStyle = '#1B2A8C'; FG.fill(wobEll(560, 1330, 330, 50, 9, 0.05)); FG.globalAlpha = 1;
    // MASKS: hand = lens; knot shrinking in the palm
    AG.save(); AG.globalCompositeOperation = 'lighter'; AG.fillStyle = '#ff0000';
    M.parts.forEach(p => AG.fill(GR.poly(p.pts)));
    AG.restore();
    DG.save(); DG.globalCompositeOperation = 'lighter'; DG.fillStyle = 'rgba(0,255,0,0.3)';
    [1, 0.75, 0.5].forEach(k => { DG.save(); DG.translate(hc[0], hc[1]); DG.scale(k, k); DG.translate(-hc[0], -hc[1]); M.parts.forEach(p => DG.fill(GR.poly(p.pts))); DG.restore(); });
    DG.restore();
    const kc = [hc[0] + 8, hc[1] + 20], kR = 135 * (1 - 0.7 * open);
    knotMask(kc, kR, 1, t);
    calm(BG, 540, 250, 500, 150, 0.9, 10);
    calm(BG, hc[0], hc[1] - 60, 330, 360, 0.8, 12);
    calm(BG, hc[0], 1200, 200, 220, 0.9, 8);
    BG.save(); BG.globalCompositeOperation = 'lighter'; BG.fillStyle = '#00ff00'; BG.fillRect(0, 0, W, HZ); BG.restore();
    // 2D: released strands leave the knot and become sky lines
    const strands = [];
    for (let i = 0; i < 7; i++) {
      const a0 = -Math.PI / 2 + (i - 3) * 0.44 + (hs(i) - 0.5) * 0.15;
      const L = (300 + 260 * hs(i + 4)) * (0.3 + 0.7 * open);
      const pts = [];
      for (let k = 0; k <= 36; k++) {
        const u = k / 36, r = kR * 0.6 + L * u;
        const a = a0 + 0.4 * Math.sin(u * 5 + i * 1.7) * u + 0.1 * Math.sin(u * 13 + i) * (1 - u);
        pts.push([kc[0] + Math.cos(a) * r, kc[1] + Math.sin(a) * r * 0.95]);
      }
      strands.push([pts, ['#FF2EA6', '#9B5CFF', '#FFD23F', '#FF5FC8', '#3DF5FF', '#C77DFF'][i % 6]]);
    }
    // ray fans from each fingertip (outward burst), and spray droplets
    const fans = [];
    M.tips.forEach((tp, j) => {
      for (let k = 0; k < 3; k++) {
        const a = tp.a + (k - 1) * 0.17 + (hs(j * 7 + k) - 0.5) * 0.08;
        fans.push({ x: tp.p[0] + Math.cos(tp.a) * 22, y: tp.p[1] + Math.sin(tp.a) * 22, a, L: (90 + 230 * hs(j * 3 + k + 1)) * open, w: 10 + 10 * hs(k + j), col: ['#FFE66B', '#FF9F43', '#FF5FA2', '#C77DFF', '#6FE3FF'][(j + k) % 5] });
      }
    });
    const drops = [];
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI / 2 + (hs(i * 3.3) - 0.5) * 2.7, r = 380 + 360 * hs(i * 5.1) * (0.4 + 0.6 * open);
      drops.push([hc[0] + Math.cos(a) * r, hc[1] - 60 + Math.sin(a) * r * 0.85, 3 + 6 * hs(i * 2.2), ['#FFFFFF', '#FFF3A6', '#FF9ACB', '#7FE8FF'][i % 4]]);
    }
    S.glow.push(g => {
      g.lineWidth = 16; strands.forEach(([p, c]) => { g.strokeStyle = c; g.globalAlpha = 0.6; g.stroke(polyline(p)); });
      g.globalAlpha = 0.5; g.strokeStyle = '#FFE3C2'; g.lineWidth = 22; M.parts.forEach(p => g.stroke(GR.poly(p.pts)));
    });
    knotStrands(S, kc, kR * 1.05, 31, ['#FF2EA6', '#C6FF3D', '#9B5CFF'], 4, 1 - 0.5 * open);
    S.softOver.push(c => {
      strands.forEach(([p, col], i) => {
        c.globalAlpha = 0.95; c.fillStyle = col; c.fill(LX.brushPath(p, 13 + 5 * hs(i), i, 0.6));
        c.globalAlpha = 0.85; c.fillStyle = '#FFFFFF'; c.fill(LX.brushPath(p, 3.2, i, 0.45));
      });
    });
    S.softAdd.push(c => { drops.forEach(([x, y, r, col]) => { c.globalAlpha = 0.95; c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }); });
    S.crisp.push(c => {
      // the hand drawn in light: one silhouette line (off-register rose line first), knuckles as faint inner light
      GR.unionStroke(c, M.parts.map(p => p.pts), 4.5, '#FF2E97', { dx: 11, dy: -9, alpha: 0.95, key: 'u2' });
      GR.unionStroke(c, M.parts.map(p => p.pts), 11, '#FFF7E6', { inner: 0.4 });
      c.save(); c.strokeStyle = '#FFF7E6'; c.lineWidth = 11; c.lineCap = 'round';
      c.stroke(polyline(wrist.slice(0, 13))); c.stroke(polyline(wrist.slice(13))); c.restore();
    });
    serifLine(S, 'unclench.', 540, 300, 196, { halo: '#FF3EA5', halo2: '#FF9F43', fill: '#FFF6E6', edge: '#7A1E9A', edgeDx: 4, edgeDy: 4, weight: '800', onset: wordOnset('C2', 0) });
    return {
      U: Object.assign(netPhase(t), {
        uScale: 150, uAniso: 1.5, uWarp: 1.0, uLineW: 0.06, uLineI: 0.8, uFineI: 0.7, uGlowI: 0.3, uBreak: 0.32, uShadeK: 1.0, uDarkI: 0.25,
        uCA: '#FFFFFF', uCB: '#FFF3A6', uCC: '#FF9ACB', uCD: '#C6A3FF',
        uRip: [hc[0], hc[1], 160 + 900 * E.range(t, 21.5, 23.2), 18], uRipI: 0.4, uRipW: 70, uRipC: '#FFF3D6',
        uSun: [hc[0], hc[1] - 40, 1.5 * open, 6], uRayStart: 340, uRayLen: 1250, uRayN: 22, uRayW: 0.42, uRayOff: 0.72, uRaySpan: 0.46, uRayRot: cyc(t, 1),
        uLens: 450, uBodyLine: '#FFE9A8', uBodyLineK: 0.85, uBodyLineI: 0.4,
        uKnotSeed: Math.floor(t * 12), uKnotI: 1.3, uKnotBase: '#2A0A4A', uKnotDark: 0.9,
      }), comp: { bloomK: 1.0, vig: 0.2, vigCol: '#3A1E6E' },
    };
  });

  // ---------------------------------------------------------------- 24-36 sky: the sky is a pool seen from inside
  scene(24, 36, 'sky', (S, t) => {
    const G = GR.geo({ x: 480, y: 880, s: 315, tilt: -0.12, squash: -0.02,
      arm: { tx: 860, ty: 880, ext: 0.9, open: 1, sag: 20 }, knot: 0 });
    vgrad(FG, [[0, '#0F4FC0'], [0.55, '#1E9BE6'], [1, '#63D2F0']]);
    // the released knot is now a cloud: translucent lobes; overlaps make the shape
    const cloud = [[800, 585, 118, 80, '#FFFFFF', 0.8], [890, 615, 92, 68, '#FFC9E3', 0.75], [712, 620, 90, 60, '#C6A3FF', 0.75], [805, 648, 150, 56, '#FFFFFF', 0.65], [858, 558, 70, 55, '#FFF3A6', 0.7]];
    FG.save(); FG.globalCompositeOperation = 'screen';
    cloud.forEach(([x, y, rx, ry, c, a], i) => { FG.globalAlpha = a; FG.fillStyle = c; FG.fill(wobEll(x, y, rx, ry, 40 + i, 0.05)); });
    FG.restore();
    // far below him, the world: a flat Hockney landscape strip (purple hills, pink + lime fields, orange wiggly road)
    const bands = [[1196, 1182, 4.1, 14, '#7A2BD1'], [1228, 1218, 2.3, 10, '#FF6FB5'], [1268, 1256, 5.7, 12, '#B6F03C'], [1306, 1298, 1.1, 9, '#36C95A'], [1334, 1330, 3.3, 6, '#FF8A1F']];
    bands.forEach(([y0, y1, sd, amp, col]) => { FG.fillStyle = col; FG.fill(edgePoly(y0, y1, sd, amp, true)); });
    // a wiggly road: wide at the bottom, narrowing as it winds to the hills
    const rl = [], rr = [], rc = [];
    for (let k = 0; k <= 24; k++) {
      const u = k / 24, x = 640 - 110 * u + 46 * Math.sin(u * 6.5) * (1 - 0.4 * u), y = E.lerp(1365, 1205, Math.pow(u, 0.85)), hw = E.lerp(64, 7, u);
      rl.push([x - hw, y]); rr.push([x + hw, y]); rc.push([x, y]);
    }
    FG.fillStyle = '#FF7A1A'; FG.fill(GR.poly(rl.concat(rr.reverse())));
    FG.fillStyle = '#FFD23F'; FG.fill(LX.brushPath(rc.slice(0, 20), 7, 2, 0.4));
    for (let i = 0; i < 8; i++) {
      const x = 90 + i * 132 + 34 * hs(i), y = 1192 + 7 * Math.sin(i * 1.3);
      if (Math.abs(x - 540) < 50) continue;
      const r = 15 + 9 * hs(i + 3);
      FG.fillStyle = '#2B1A8C'; FG.fillRect(x - 3, y - 4, 6, 20);
      FG.fillStyle = i % 3 ? '#5B1FC0' : '#1FAE7A'; FG.beginPath(); FG.ellipse(x, y - 4 - r, r, r * 1.25, 0, 0, TAU); FG.fill();
    }
    character(S, G, {
      fill: ['#FFFDF0', '#D6F4FF', '#8FD3FF'], fillA: 0.66, arm: '#C9F0FF', mitten: '#FFFFFF', mittenA: 0.55,
      core: '#FFFFFF', halo: '#FFFFFF', haloA: 0.6, second: { color: '#FF6FB5', dx: 8, dy: -7, a: 0.95 },
      eyes: 'happy', mouth: 'smile', eye: '#0E2A86', eyeHalo: '#FFFFFF', eyeGlowA: 0.5, blush: 0.7, blushCol: '#FF6FB5', coreW: 12, eyeW: 14, boil: 0.8, boilDiv: 4,
    });
    AG.save(); AG.globalCompositeOperation = 'lighter'; AG.fillStyle = 'rgba(255,0,0,0.5)';
    cloud.forEach(([x, y, rx, ry], i) => AG.fill(wobEll(x, y, rx, ry, 40 + i, 0.05)));
    AG.restore();
    DG.save(); DG.globalCompositeOperation = 'lighter'; DG.fillStyle = 'rgba(0,255,0,0.3)'; cloud.forEach(([x, y, rx, ry], i) => DG.fill(wobEll(x, y, rx * 0.8, ry * 0.8, 40 + i, 0.05))); DG.restore();
    calm(BG, 540, 250, 520, 150, 0.85, 10);
    calm(BG, G.cx, G.cy - 10, 1.25 * G.bw, 1.15 * G.bh, 0.5, 12);
    BG.save(); BG.globalCompositeOperation = 'lighter'; BG.fillStyle = '#00ff00'; BG.fill(edgePoly(1170, 1160, 4.1, 14, true)); BG.restore();
    // the cloud keeps a line drawing of its own: two loose light contours
    S.crisp.push(c => {
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 4;
      [[800, 585, 118, 80], [890, 615, 92, 68], [712, 620, 90, 60]].forEach(([x, y, rx, ry], i) => {
        c.beginPath(); c.ellipse(x + 4, y - 3, rx, ry, 0, Math.PI * (1.05 + 0.1 * i), Math.PI * (1.95 + 0.05 * i)); c.stroke();
      });
      c.restore();
    });
    serifLine(S, 'you are the sky', 540, 300, 132, { halo: '#FFFFFF', haloA: 0.55, halo2: '#FF9ACB', fill: '#FFFFFF', glass: '#0A3F8F', glassA: 0.55, edge: '#0F4FC0', weight: '600', onset: wordOnset('C3', 0) });
    return {
      U: Object.assign(netPhase(t), {
        uScale: 170, uAniso: 1.6, uWarp: 1.0, uLineW: 0.06, uLineI: 0.4, uFineI: 0.8, uGlowI: 0.3, uBreak: 0.34, uDarkI: 0.2, uShadeK: 0.97,
        uCA: '#FFFFFF', uCB: '#FFF3A6', uCC: '#FF9ACB', uCD: '#C6A3FF',
        uIsoI: 1.1, uIsoScale: 92, uIsoW: 2.6, uIsoAniso: 1.7, uIsoGate: 0.42, uIA: '#FFFFFF', uIB: '#FFE14A', uIC: '#FF6FB5', uID: '#D2B8FF', uCalmK: 0.97,
        uLens: 380, uBodyLine: '#FFD27A', uBodyLineK: 0.9, uBodyLineI: 0.32,
      }), comp: { bloomK: 0.75, vig: 0.18, vigCol: '#2233D6' },
    };
  });

  // ---------------------------------------------------------------- 36-42.75 drop: full spectrum sun over reverse-perspective fields
  scene(36, 42.75, 'drop', (S, t) => {
    const env = Math.exp(-1.15 * Math.max(0, t - 36));
    const beat = Math.exp(-6 * (((t - 36) % 0.75 + 0.75) % 0.75));
    const sun = [540, 640], HZ = 905, apex = [540, 1640];
    vgrad(FG, [[0, '#1626B8'], [0.35, '#2233D6'], [0.62, '#4A2BD9'], [0.7, '#7A2BD1']]);
    // flat Hockney sun discs behind the light
    FG.fillStyle = '#FF3EA5'; FG.beginPath(); FG.arc(sun[0], sun[1], 250, 0, TAU); FG.fill();
    FG.fillStyle = '#FF8A1F'; FG.beginPath(); FG.arc(sun[0], sun[1], 190, 0, TAU); FG.fill();
    FG.fillStyle = '#FFD23F'; FG.beginPath(); FG.arc(sun[0], sun[1], 135, 0, TAU); FG.fill();
    // fields: wedges from the viewer (below frame) fanning out to a wiggly horizon
    const hzP = edgePoly(HZ, HZ - 20, 2.2, 16, true);
    FG.save(); FG.clip(hzP);
    const cols = ['#7A2BD1', '#FF7A1A', '#B6F03C', '#FF6FB5', '#E8412B', '#36C95A', '#FFD23F', '#2B4BFF', '#FF3EA5', '#1FAE7A', '#FF8A1F', '#9B5CFF'];
    const N = 15;
    for (let i = 0; i < N; i++) {
      const a0 = -1.42 + i * (2.84 / N), a1 = a0 + 2.84 / N;
      const wv = k => 0.03 * Math.sin(k * 3.1 + i);
      FG.fillStyle = cols[(i * 5) % cols.length];
      FG.beginPath(); FG.moveTo(apex[0], apex[1]);
      for (let k = 0; k <= 8; k++) { const a = E.lerp(a0, a1, k / 8) + wv(k); FG.lineTo(apex[0] + Math.sin(a) * 2400, apex[1] - Math.cos(a) * 2400); }
      FG.closePath(); FG.fill();
    }
    FG.restore();
    // beat-locked hop (0.75 s), squash on landing, waving arm: all loop-safe (80 cycles per 60 s)
    const bph = (((t - 36) % 0.75) + 0.75) % 0.75 / 0.75, hop = Math.sin(Math.PI * bph);
    const G = GR.geo({ x: 540, y: 1065 - 46 * hop, s: 250, squash: 0.09 * Math.pow(1 - hop, 6) - 0.05 * hop, look: [0, -0.4],
      arm: { tx: 790 + 34 * Math.sin(cyc(t, 80)), ty: 745 - 46 * hop - 20 * Math.cos(cyc(t, 80)), ext: 1, open: 1, sag: -20 }, knot: 0 });
    // cast shadow on the fields: cool violet, never grey
    FG.globalAlpha = 0.45 - 0.2 * hop; FG.fillStyle = '#3A1E9E'; FG.fill(wobEll(575, 1252, 170 - 40 * hop, 28 - 6 * hop, 8, 0.06)); FG.globalAlpha = 1;
    character(S, G, {
      fill: ['#FFFFFF', '#FFF3C4', '#FFC94D'], fillA: 0.82, arm: '#FFE66B', mitten: '#FFFFFF', mittenA: 0.6,
      core: '#FFFFFF', halo: '#FF3D9A', second: { color: '#3DE7FF', dx: -7, dy: -5, a: 0.95 },
      eyes: 'happy', mouth: 'open', mouthFill: '#FF3D9A', eye: '#2A137A', eyeHalo: '#FFFFFF', eyeGlowA: 0.5, coreW: 11, eyeW: 13, boil: 1.2,
    });
    calm(BG, 540, 230, 520, 190, 0.95, 10);
    calm(BG, G.cx, G.cy - 10, 1.2 * G.bw, 1.1 * G.bh, 0.5, 12);
    // confetti of light dashes on 16ths
    const dash = [];
    for (let i = 0; i < 70; i++) {
      const a = hs(i * 1.7) * TAU, r = 300 + 520 * ((hs(i * 3.1) + (t - 36) * 0.9) % 1);
      dash.push([sun[0] + Math.cos(a) * r, sun[1] + Math.sin(a) * r * 1.1, a, ['#FFE600', '#FF3D9A', '#B6FF3B', '#3DE7FF', '#FFFFFF', '#FF8A00'][i % 6]]);
    }
    S.softAdd.push(c => {
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
      dash.forEach(([x, y, a, col]) => {
        if (y > HZ - 20 || (y < 420 && Math.abs(x - 540) < 520)) return;
        c.strokeStyle = col; c.lineWidth = 6; c.globalAlpha = 0.9;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 22, y + Math.sin(a) * 22); c.stroke();
      });
      c.restore();
    });
    serifLine(S, 'turns out the joy was', 540, 150, 76, { halo: '#22E4FF', haloA: 0.7, fill: '#FFFFFF', weight: '600', glass: '#1626B8', glassA: 0.6, onset: wordOnset('V22', 0) });
    // "free." as a hot pink neon word with a white core
    serifLine(S, 'free.', 540, 352, 236, { halo: '#FF2E97', halo2: '#FF2E97', haloA: 1, fill: '#FFF2F8', edge: '#E0006E', edgeDx: 6, edgeDy: 6, weight: '800', onset: wordOnset('V22', 5) });
    return {
      U: Object.assign(netPhase(t, 2), {
        uScale: 150, uAniso: 1.4, uWarp: 1.1, uLineW: 0.055, uLineI: 0.0, uFineI: 0.9, uGlowI: 0.3, uBreak: 0.34, uShadeK: 0.6, uCalmK: 0.9, uDarkI: 0.0, uBodyBlock: 0.8,
        uCA: '#FFFFFF', uCB: '#FFE600', uCC: '#3DE7FF', uCD: '#FF3D9A',
        uSun: [sun[0], sun[1], 0.85 + 0.5 * env + 0.15 * beat, 84], uRayStart: 262, uRayLen: 1150, uRayRot: cyc(t, 2), uRayN: 28, uRayW: 0.36,
        uPrism: 1.2 * env + 0.25, uStreak: 1.2 * env,
        uPersp: 0.22, uPerspC: apex, uPerspCol: '#FFF3C4',
        uLens: 450, uBodyLine: '#FFFFFF', uBodyLineK: 0.6,
      }), comp: { bloomK: 1.05, expo: 1 + 0.1 * beat, vig: 0.15, vigCol: '#2233D6' },
    };
  });

  // ---------------------------------------------------------------- 42.75-49.5 metta: rosette of glass, open enso, love him open
  scene(42.75, 49.5, 'metta', (S, t) => {
    const C = [540, 830];
    vgrad(FG, [[0, '#3A1E6E'], [0.45, '#7A1E86'], [1, '#2A1458']]);
    rgrad(FG, C[0], C[1], 640, [[0, 'rgba(255,62,165,0.95)'], [0.55, 'rgba(255,62,165,0.35)'], [1, 'rgba(255,62,165,0)']]);
    // af Klint rosette: six translucent glass circles; the overlaps become petals
    const pc = ['#FF8FB1', '#FFC94D', '#B9A3FF', '#FF9E7A', '#9FF2D0', '#FFE66B'];
    FG.save(); FG.globalCompositeOperation = 'screen';
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i * TAU / 6 + cyc(t, 1) * 0.5;
      FG.globalAlpha = 0.42; FG.fillStyle = pc[i];
      FG.beginPath(); FG.arc(C[0] + Math.cos(a) * 175, C[1] + Math.sin(a) * 175, 230, 0, TAU); FG.fill();
    }
    FG.restore();
    const G = GR.geo({ x: 540, y: 870, s: 265, tilt: 0.02,
      arm: { tx: 690, ty: 990, ext: 0.7, open: 0.6, sag: 30 }, knot: 0.42 });
    character(S, G, {
      fill: ['#FFE3EF', '#FF8FB1', '#E0458C'], fillA: 0.82, arm: '#FF8FB1', mitten: '#FFE3EF', mittenA: 0.5,
      core: '#FFF3C4', halo: '#FFC94D', second: { color: '#B9A3FF', dx: 6, dy: -6, a: 0.9 },
      eyes: 'soft', mouth: 'smile', blush: 0.95, blushCol: '#FF3E7A', eye: '#3A1060', eyeHalo: '#FFF3C4', eyeGlowA: 0.6, coreW: 11, eyeW: 12, boil: 0.8, boilDiv: 4,
    });
    const kc = G.knotC;
    knotMask(kc, G.knotR, 0.7, t);
    calm(BG, 540, 215, 500, 140, 0.9, 10);
    calm(BG, 540, 850, 380, 380, 0.55, 14);
    knotStrands(S, kc, G.knotR * 1.1, 41, ['#FF9ACB', '#C6A3FF', '#FFE66B'], 3.5, 0.75);
    // open enso: drawn analytically in the light shader (dense loaded head, dry split bristles in the tail, gap at upper right)
    const ensoA0 = -0.78, ensoSweep = TAU - 0.78, ensoR = 432, C2 = [C[0], C[1] + 20];
    const spine = [];
    for (let k = 0; k <= 60; k++) { const u = k / 60 * 0.8, a = ensoA0 + u * ensoSweep; const r = ensoR + 14 * Math.sin(u * Math.PI); spine.push([C2[0] + Math.cos(a) * r, C2[1] + Math.sin(a) * r]); }
    S.glow.push(g => { g.strokeStyle = '#FF8A1F'; g.lineWidth = 50; g.globalAlpha = 0.35; g.stroke(polyline(spine)); g.globalAlpha = 1; });
    S.ensoU = { uEnso: [C2[0], C2[1], ensoR, 1], uEnsoA0: ensoA0, uEnsoSweep: ensoSweep, uEnsoW: 70 };
    serifLine(S, 'love him open.', 540, 245, 128, { halo: '#FF3EA5', halo2: '#FFC94D', fill: '#FFF3C4', edge: '#5B1E7A', weight: '600', onset: wordOnset('C6', 0) });
    return {
      U: Object.assign(netPhase(t), {
        uScale: 170, uAniso: 1.4, uWarp: 0.9, uLineW: 0.056, uLineI: 0.34, uFineI: 0.75, uGlowI: 0.3, uBreak: 0.32, uDarkI: 0.2, uCalmK: 0.95,
        uCA: '#FFF3C4', uCB: '#FFC94D', uCC: '#FF8FB1', uCD: '#B9A3FF',
        ...S.ensoU,
        uRings: 0.85, uRingSp: 92, uRingC: [G.cx, G.cy - 20], uRingCol: '#FFD27A',
        uLens: 450, uBodyLine: '#FFF3C4', uBodyLineK: 0.8, uBodyLineI: 0.45,
        uKnotSeed: Math.floor(t * 6), uKnotI: 1.1, uKnotBase: '#4A1A7A', uKnotDark: 0.7, uKnotA: '#FF8FB1', uKnotB: '#FFE66B', uKnotC: '#C6A3FF',
      }), comp: { bloomK: 0.95, vig: 0.28, vigCol: '#3A1E6E' },
    };
  });

  // ---------------------------------------------------------------- 49.5-60 rest: moonlit pool, lit from below
  scene(49.5, 60.01, 'rest', (S, t) => {
    const G = GR.geo({ x: 520, y: 905, s: 285, tilt: 0.1, squash: 0.03,
      arm: { tx: 820, ty: 1020, ext: 0.65, open: 0.85, sag: 30 }, knot: 0 });
    vgrad(FG, [[0, '#0E1838'], [0.4, '#132C78'], [1, '#0E1E5A']]);
    rgrad(FG, 540, 960, 820, [[0, 'rgba(25,195,214,1)'], [0.4, 'rgba(22,130,210,0.8)'], [1, 'rgba(22,119,200,0)']]);
    // the moon's reflection, drawn as broken pearl ripples (field: soft halo)
    rgrad(FG, 820, 400, 230, [[0, 'rgba(159,180,255,0.55)'], [1, 'rgba(159,180,255,0)']]);
    character(S, G, {
      fill: ['#FFFFFF', '#CFF6FF', '#7FD8FF'], fillA: 0.42, arm: '#CFF6FF', mitten: '#FFFFFF', mittenA: 0.4,
      core: '#F4EFD8', halo: '#9FB4FF', second: { color: '#C6A3FF', dx: 6, dy: -5, a: 0.85 },
      eyes: 'closed', mouth: 'smile', eye: '#0E1E5A', eyeHalo: '#FFFFFF', eyeGlowA: 0.4, coreW: 9, eyeW: 12, boil: 0, boilDiv: 1e9,
    });
    calm(BG, 540, 235, 450, 130, 0.85, 10);
    calm(BG, G.cx, G.cy - 10, 1.25 * G.bw, 1.15 * G.bh, 0.55, 12);
    // the moon's reflection, drawn the Hockney way: stacked broken squiggles of pearl light
    const moon = [], MC = [810, 395];
    for (let i = 0; i < 13; i++) {
      const v = (i - 6) / 6.6, hw = 118 * Math.sqrt(Math.max(0, 1 - v * v)), y = MC[1] + (i - 6) * 13;
      const sx = MC[0] + 10 * Math.sin(i * 1.9 + cyc(t, 3));
      const nseg = 1 + Math.floor(hs(i * 3.7) * 2.6);
      for (let k = 0; k < nseg; k++) {
        const u0 = k / nseg + 0.05 * hs(i + k), u1 = (k + 1) / nseg - 0.06 * hs(i * 2 + k);
        const pts = [];
        for (let j = 0; j <= 8; j++) { const u = E.lerp(u0, u1, j / 8); pts.push([sx - hw + 2 * hw * u, y + 3.2 * Math.sin(u * 14 + i * 1.3 + cyc(t, 4))]); }
        moon.push([pts, 4 + 6 * (1 - Math.abs(v)), i % 4 === 1 ? '#D2B8FF' : '#F4EFD8']);
      }
    }
    S.glow.push(g => { g.fillStyle = '#B9C8FF'; g.globalAlpha = 0.28; g.beginPath(); g.ellipse(MC[0], MC[1], 150, 105, 0, 0, TAU); g.fill(); g.globalAlpha = 1; });
    S.softAdd.push(c => {
      c.save(); c.globalCompositeOperation = 'lighter';
      moon.forEach(([p, w, col], i) => { c.fillStyle = col; c.globalAlpha = 0.85; c.fill(LX.brushPath(p, w, i, 0.5)); });
      c.restore();
    });
    serifLine(S, 'just come back.', 540, 255, 104, { halo: '#9FB4FF', fill: '#F4EFD8', weight: '500', onset: wordOnset('V33', 0) });
    return {
      U: Object.assign(netPhase(t), {
        uScale: 200, uAniso: 1.7, uWarp: 0.85, uLineW: 0.06, uLineI: 0.0, uFineI: 0.6, uGlowI: 0.6, uBreak: 0.36, uDarkI: 0.12,
        uIsoI: 0.9, uIsoScale: 110, uIsoW: 2.8, uIsoAniso: 1.8, uIsoGate: 0.42, uIA: '#9FF2FF', uIB: '#F4EFD8', uIC: '#C6A3FF', uID: '#9FB4FF', uCalmK: 0.95,
        uCA: '#7FE8FF', uCB: '#F4EFD8', uCC: '#C6A3FF', uCD: '#9FB4FF',
        uLens: 380, uBodyLine: '#F4EFD8', uBodyLineK: 0.8, uBodyLineI: 0.3,
      }), comp: { bloomK: 1.0, vig: 0.3, vigCol: '#0E1838' },
    };
  });

  // ------------------------------------------------------------------ frame
  SC.init = () => {};
  SC.draw = (t) => {
    t = ((t % 60) + 60) % 60;
    const ctx = E.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    prep();
    const sc = SCENES.find(s => t >= s.t0 && t < s.t1) || SCENES[0];
    const S = { t, frame: Math.round(t * 30), glow: [], crisp: [], under: [], softAdd: [], softOver: [] };
    const PF = window.PROF ? [] : null;
    let pt = performance.now();
    const mark = (k) => { if (!PF) return; ctx.getImageData(0, 0, 1, 1); FG.getImageData(0, 0, 1, 1); const gl = LX.gl; gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); const n = performance.now(); PF.push([k, Math.round(n - pt)]); pt = n; };
    const R = sc.fn(S, t);
    finishMasks();
    mark('scene+masks');
    const SK = window.SKIP || {};
    let GC = null;
    if (!SK.glow && S.glow.length) {
      let gg; [GC, gg] = LX.scratch('glowQ', 540, 675); gg.clearRect(0, 0, 540, 675); gg.scale(0.5, 0.5); gg.lineCap = 'round'; gg.lineJoin = 'round';
      S.glow.forEach(f => { gg.save(); f(gg); gg.restore(); });
    }
    if (!SK.gl) PL.render(ctx, FC, AC, BC, R.U, Object.assign({ seed: S.frame % 97 }, R.comp), GC); else { ctx.fillStyle = '#123'; ctx.fillRect(0, 0, W, H); }
    mark('gl');
    S.under.forEach(f => f(ctx));
    mark('glow');
    // soft light marks at half res (long arcs and strands have huge bounding boxes: 4x cheaper here, and they are light anyway)
    for (const [list, op] of [[S.softOver, 'source-over'], [S.softAdd, 'lighter']]) {
      if (!list.length || SK.soft) continue;
      const [mc, mg] = LX.scratch('marks', 540, 675); mg.clearRect(0, 0, 540, 675); mg.scale(0.5, 0.5); mg.lineCap = 'round'; mg.lineJoin = 'round';
      list.forEach(f => { mg.save(); f(mg); mg.restore(); });
      ctx.save(); ctx.globalCompositeOperation = op; ctx.drawImage(mc, 0, 0, W, H); ctx.restore();
    }
    mark('soft');
    if (!SK.crisp) S.crisp.forEach((f, i) => { ctx.save(); f(ctx); ctx.restore(); mark('crisp' + i); });
    if (PF) window.LASTPROF = PF;
    // watermark
    ctx.save(); ctx.font = '500 24px "JBM"'; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillText('pawel.world', 1040, 52); ctx.restore();
    return sc.name;
  };
  window.SC = SC;
})();
