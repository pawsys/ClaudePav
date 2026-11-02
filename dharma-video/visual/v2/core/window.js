// V2 core: the stained-glass window, day (backlit saint window, 12.0) and night (moonlit Moon Room, 54.0).
// The window is shared by act 1 and act 3 (the bookend). It works in three layers:
//   1. panes  : coloured glass drawn into the pane canvas (V2.L.g) with lead between panes, per-pane value +-20%
//   2. GL     : the WINDOW chunk makes the panes emissive (bloom), lays the window's own colours on the floor by a
//               parallel projection (so floor colours always match the panes, leads included), adds shafts and
//               the moon (pearl, soft halo, slow ray spokes; never a hard disc)
//   3. crisp  : lead lines, glints and the arch frame drawn at full res after the light pass
// usage:
//   const win = V2.window.draw(t, {mode:'night'});        // draws panes into the current pane (V2.L.g)
//   V2.L.render('a3_rest', Object.assign(u, win.uniforms), comp);
//   win.crisp(ctx);
(function () {
  const V2 = window.V2;
  const { clamp, lerp, hash, TAU } = V2.U;
  const rgba = V2.rgba, mixHex = V2.mixHex;
  const WIN = V2.window = {};

  WIN.PRESETS = {
    // saint window around the hero (act 1, 12.0 to 13.3): rose centred behind him
    day: { arch: [540, 300, 400, 1080], rose: [540, 760, 300], floorY: 1080, gain: 1.15, shaft: 0.62, floor: 0.26, leadW: 6, leadA: 0.7,
      proj: [0.30, 0.75, 0, 720], shafts: [1, 118, 0.42, 0.37], value: 1.0, glintA: 0.55, frame: '#FFC23D' },
    // moonlit window on the right (act 3, 54 to 59.25)
    night: { arch: [810, 540, 190, 1060], rose: [810, 780, 128], floorY: 1060, gain: 0.95, shaft: 0.07, floor: 0.30, leadW: 3, leadA: 0.6,
      proj: [-0.55, 1.75, 80, 1000], value: 0.55, glintA: 0.35, frame: '#9FB4FF', moon: [810, 780, 62], moonK: [0.9, 0, 1, 0.45], moonFall: 1 },
  };
  const COLS = ['#FFE45C', '#FF8A1F', '#FF2E97', '#19C3D6', '#B6F03C', '#2B4BFF', '#9B5CFF'];
  // at night the same panes, re-hued for moonlight so nothing goes olive, khaki or brown at low value (lemon ->
  // apricot, orange -> rose, lime -> mint), with a value floor on the warm ones (a dark apricot is brown)
  const NIGHT = ['#F0A070', '#F26D92', '#FF2E97', '#19C3D6', '#4FD1A8', '#2B4BFF', '#9B5CFF'], NIGHT_FLOOR = [0.74, 0.62, 0, 0, 0.42, 0, 0];
  WIN.COLS = COLS; WIN.NIGHT = NIGHT;

  function archInfo(A) { const [cx, ay, w, by] = A; const a = 0.22 * w, r = w + a; const ys = ay + Math.sqrt(r * r - a * a); return { cx, ay, w, by, a, r, ys }; }
  // geometry: grid panes (irregular rows x columns) + a rose (3 rings). cached per arch/rose
  const geoCache = new Map();
  WIN.geometry = function (A, R) {
    const key = A.join(',') + '|' + R.join(',');
    if (geoCache.has(key)) return geoCache.get(key);
    const I = archInfo(A);
    const panes = [];
    const rowH = I.w * (I.w > 300 ? 0.42 : 0.34), top = I.ay - 10, nr = Math.ceil((I.by - top) / rowH);
    const ncol = I.w > 300 ? 5 : 4;
    const colX = j => I.cx - I.w + (2 * I.w) * j / ncol;
    const rowY = (i, x) => top + i * rowH + (i > 0 && i < nr ? (hash(i * 3.1 + Math.floor(x / 37)) - 0.5) * rowH * 0.0 + Math.sin(x * 0.011 + i * 1.7) * rowH * 0.12 : 0);
    for (let i = 0; i < nr; i++) for (let j = 0; j < ncol; j++) {
      const jx0 = j === 0 ? -40 : (hash(i * 7.7 + j * 1.3) - 0.5) * (2 * I.w / ncol) * 0.35;
      const jx1 = j === ncol - 1 ? 40 : (hash(i * 7.7 + (j + 1) * 1.3) - 0.5) * (2 * I.w / ncol) * 0.35;
      const x0 = colX(j) + jx0, x1 = colX(j + 1) + jx1;
      const pts = [[x0, rowY(i, x0)], [x1, rowY(i, x1)], [x1, rowY(i + 1, x1)], [x0, rowY(i + 1, x0)]];
      // split some panes diagonally (stained glass is never a clean grid)
      const cx = (x0 + x1) / 2, cy = top + (i + 0.5) * rowH;
      const ci = Math.floor(hash(i * 13.1 + j * 5.3) * COLS.length);
      if (hash(i * 2.3 + j * 9.1) < 0.45) {
        const a = [pts[0], pts[1], pts[2]], b = [pts[0], pts[2], pts[3]];
        panes.push({ pts: a, c: ci, v: hash(i * 4.1 + j), x: cx, y: cy, ring: -1 });
        panes.push({ pts: b, c: (ci + 3) % COLS.length, v: hash(i * 4.9 + j + 2), x: cx, y: cy + 1, ring: -1 });
      } else panes.push({ pts, c: ci, v: hash(i * 4.1 + j), x: cx, y: cy, ring: -1 });
    }
    // rose: ring 0 clear centre (halo / moon), ring 1 eight petals, ring 2 sixteen sectors
    const [rx, ry, rr] = R;
    const rings = [[0, 0.30, 1], [0.30, 0.64, 8], [0.64, 1.0, 16]];
    rings.forEach(([r0, r1, ns], k) => {
      for (let s = 0; s < ns; s++) {
        const a0 = (s + (k === 1 ? 0.5 : 0)) / ns * TAU - Math.PI / 2, a1 = a0 + TAU / ns;
        const pts = [];
        const m = Math.max(3, Math.ceil(24 / ns));
        for (let q = 0; q <= m; q++) { const a = lerp(a0, a1, q / m); pts.push([rx + Math.cos(a) * rr * r1, ry + Math.sin(a) * rr * r1]); }
        if (r0 > 0) for (let q = m; q >= 0; q--) { const a = lerp(a0, a1, q / m); pts.push([rx + Math.cos(a) * rr * r0, ry + Math.sin(a) * rr * r0]); }
        else if (ns > 1) pts.push([rx, ry]);
        const ci = k === 1 ? (s % 2 ? 2 : 1) : k === 2 ? [5, 6, 3][s % 3] : 0;
        panes.push({ pts, c: ci, v: hash(s * 3.3 + k * 11), x: rx + Math.cos((a0 + a1) / 2) * rr * (r0 + r1) / 2, y: ry + Math.sin((a0 + a1) / 2) * rr * (r0 + r1) / 2, ring: k });
      }
    });
    panes.forEach(p => { p.path = V2.P.path(p.pts, true); p.d = Math.hypot(p.x - rx, p.y - ry); });
    const order = panes.map((p, i) => i).sort((a, b) => panes[a].d - panes[b].d);
    order.forEach((pi, k) => { panes[pi].order = k / Math.max(1, panes.length - 1); });
    const R2 = [rx, ry, rr * 1.004, rr * 1.004];
    const grid = panes.filter(p => p.ring < 0 && Math.hypot(p.x - rx, p.y - ry) > rr * 0.92), rosePanes = panes.filter(p => p.ring >= 0);
    // crisp segments: every grid pane edge cut analytically by the rose circle (no full-frame clip), rose edges as is
    const segsOf = ps => { const out = []; ps.forEach(p => { for (let i = 0; i < p.pts.length; i++) out.push({ p: [p.pts[i], p.pts[(i + 1) % p.pts.length]] }); }); return out; };
    const gridSegs = V2.P.cutSegs(segsOf(grid), [R2]), roseSegs = segsOf(rosePanes);
    const G = { I, panes: grid.concat(rosePanes), grid, rosePanes, gridSegs, roseSegs, arch: archPathSimple(A), roseC: [rx, ry, rr] };
    geoCache.set(key, G);
    return G;
  };
  // pointed arch outline as a polygon (robust)
  function archPathSimple(A, grow = 0) {
    const I = archInfo(A);
    const w = I.w + grow, r = I.r + grow;
    const pts = [[I.cx - w, I.by + grow], [I.cx - w, I.ys]];
    // left arc: circle centred (cx + a, ys), from angle PI up to the apex
    const apexAngL = Math.atan2(-(Math.sqrt(Math.max(0, r * r - I.a * I.a))), -I.a);   // point (cx, ys - sqrt(r^2-a^2)) relative to (cx+a, ys)
    for (let q = 0; q <= 24; q++) { const a = lerp(Math.PI, Math.PI * 2 + apexAngL, q / 24); pts.push([I.cx + I.a + Math.cos(a) * r, I.ys + Math.sin(a) * r]); }
    const apexAngR = Math.atan2(-(Math.sqrt(Math.max(0, r * r - I.a * I.a))), I.a);
    for (let q = 0; q <= 24; q++) { const a = lerp(apexAngR, 0, q / 24); pts.push([I.cx - I.a + Math.cos(a) * r, I.ys + Math.sin(a) * r]); }
    pts.push([I.cx + w, I.by + grow]);
    return V2.P.path(pts, true);
  }
  WIN.archPath = archPathSimple;
  // the pane state: EVERY field the pane paint reads, snapped (build 1/240, value and alpha 1/1000, moonFall 1/64).
  // The same function feeds the paint and the cache key, so a key can never miss a parameter (determinism).
  WIN.paneState = function (o = {}) {
    const P = Object.assign({}, WIN.PRESETS[o.mode || 'day'], o);
    return { mode: o.mode || 'day', arch: P.arch, rose: P.rose, build: Math.round(clamp(P.build ?? 1) * 240) / 240, value: Math.round((P.value ?? 1) * 1000) / 1000,
      alpha: Math.round((P.alpha ?? 1) * 1000) / 1000, moon: P.moon || null, moonFall: P.moon ? Math.round(clamp(P.moonFall ?? 0) * 64) / 64 : 0 };
  };
  // the pane-cache key for a window state
  WIN.paneKey = function (o = {}) {
    const S = WIN.paneState(o);
    return [S.mode, S.arch.join(','), S.rose.join(','), S.build, S.value, S.alpha, S.moon ? S.moon.join(',') : '-', S.moonFall].join('|');
  };

  // ------------------------------------------------------------------ draw
  // o: {mode 'day'|'night', arch, rose, build 0..1 (pane by pane, from the rose outward), value (pane value scale),
  //     gain, shaft, shafts [k, spacing px, duty, seed] (discrete air shafts), floor, floorY, proj [shear, depth, offX, shaftY],
  //     moon [x,y,r], moonK [spokes, rot, halo, paneGlow], moonFall 0..1,
  //     g (pane ctx, default V2.L.g; null = skip pane drawing when the pane is cached), alpha 1}
  WIN.draw = function (t, o = {}) {
    const P = Object.assign({}, WIN.PRESETS[o.mode || 'day'], o);
    const G = WIN.geometry(P.arch, P.rose);
    const S = WIN.paneState(o);                                      // what the pane paint reads (= the cache key)
    const build = S.build, A = P.alpha ?? 1;
    // default pane: the current pane, but only if it was freshly cleared this frame (a cached pane is not re-uploaded,
    // so drawing into it would freeze the stale texture in sequential renders)
    const g = o.g === undefined ? (V2.L.hit ? null : V2.L.g) : o.g;
    const lit = p => clamp((build - p.order * 0.999) * 12);
    // pane value: per-pane +-20%, the build (pane by pane), and at night a falloff with the distance to the moon
    const mfK = S.moonFall;
    const mf = S.moon && mfK > 0 ? (pp => lerp(1.30, 0.62, clamp(Math.hypot(pp.x - S.moon[0], pp.y - S.moon[1]) / (P.arch[2] * 2.2)) * mfK + (1 - mfK) * 0.5)) : () => 1;
    const night = S.mode === 'night';
    if (g && A > 0) {
      g.save(); g.clip(G.arch);
      g.fillStyle = mixHex(V2.LEAD, '#120A30', 0.5); g.globalAlpha = A; g.fill(G.arch);
      const paint = p => {
        const l = lit(p);
        const col = p.ring === 0 ? (night ? '#7F93D8' : '#FFF3C4') : (night ? NIGHT[p.c] : COLS[p.c]);
        let val = (0.8 + 0.4 * p.v) * S.value * mf(p);
        if (night && p.ring !== 0) val = Math.max(val, NIGHT_FLOOR[p.c]);
        val *= lerp(0.18, 1, l);
        const sc = c => '#' + V2.hex(col).map(v => Math.min(255, Math.round(v * c)).toString(16).padStart(2, '0')).join('');
        // backlit glass: each pane brightest at its centre (+25%), deeper at its edge (hue-keeping: value only)
        let mx = 1e9, my = 1e9, Mx = -1e9, My = -1e9; p.pts.forEach(q => { mx = Math.min(mx, q[0]); my = Math.min(my, q[1]); Mx = Math.max(Mx, q[0]); My = Math.max(My, q[1]); });
        const gr = g.createRadialGradient(p.x - (Mx - mx) * 0.06, p.y - (My - my) * 0.08, 2, p.x, p.y, Math.max(Mx - mx, My - my) * 0.72);
        gr.addColorStop(0, sc(val * 1.25)); gr.addColorStop(0.55, sc(val * 1.02)); gr.addColorStop(1, sc(val * 0.80));
        g.fillStyle = gr; g.fill(p.path);
      };
      // grid panes and their leads first, then the rose over them (so grid leads never cross the rose)
      g.strokeStyle = '#120A30'; g.lineJoin = 'round'; g.lineWidth = P.mode === 'night' ? 5 : 8;
      G.grid.forEach(paint); G.grid.forEach(p => g.stroke(p.path));
      G.rosePanes.forEach(paint); G.rosePanes.forEach(p => g.stroke(p.path));
      g.restore();
    }
    const I = G.I;
    const uniforms = {
      uWin: [I.cx, I.ay, I.w, I.by],
      uWinK: [(P.gain ?? 1.4) * A, (P.shaft ?? 0) * A, (P.floor ?? 0.3) * A, P.floorY ?? I.by],
      uWinP: P.proj, uWinS: P.shafts || [0, 120, 0.4, 0],
      uMoon: P.moon ? [P.moon[0], P.moon[1], P.moon[2], A * (P.moonA ?? 1)] : [0, 0, 1, 0],
      uMoonK: P.moonK ? [P.moonK[0], P.moonK[1] ?? (t * 1.5 * Math.PI / 180), P.moonK[2], P.moonK[3]] : [0, 0, 0, 0],
    };
    if (P.moon && !(o.moonK && o.moonK[1] !== undefined)) uniforms.uMoonK[1] = t * 1.5 * Math.PI / 180;   // spokes turn 1.5 deg/s
    // crisp(ctx, {leadW, leadA, frameA, cut: [[cx,cy,rx,ry], ...]}): lead lines, glints and the arch frame at full res.
    // cut: ellipses (his body) the leads and glints stop at. Segments are cut analytically (no clip masks).
    const crisp = (ctx, co = {}) => {
      if (A <= 0) return;
      const cut = co.cut || [];
      ctx.save(); ctx.globalAlpha = A;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const lw = co.leadW ?? P.leadW, la = co.leadA ?? P.leadA;
      const built = sg => sg;                                  // (leads are shown for the whole window; panes build in GL)
      const segs = V2.P.cutSegs(built(G.gridSegs.concat(G.roseSegs)), cut);
      ctx.save(); ctx.clip(G.arch);                            // (a clip to the arch only, not a full-frame even-odd mask)
      V2.P.lead(ctx, segs, { w: lw, col: '#120A30', a: la });
      // glints: 2 px white on the light-facing (upper-left) edge of lit panes, cut by the rose (grid) and by `cut`
      const gl = [];
      G.panes.forEach((p, i) => { if (lit(p) < 0.5 || hash(i * 3.7) > 0.55) return; const a = p.pts[0], b = p.pts[1];
        gl.push({ p: [[lerp(a[0], b[0], 0.12) + 3, lerp(a[1], b[1], 0.12) + 4], [lerp(a[0], b[0], 0.6) + 3, lerp(a[1], b[1], 0.6) + 4]], ring: p.ring }); });
      const glG = V2.P.cutSegs(gl.filter(q => q.ring < 0), [[G.roseC[0], G.roseC[1], G.roseC[2], G.roseC[2]]]).concat(gl.filter(q => q.ring >= 0));
      V2.P.glints(ctx, glG, { a: P.glintA ?? 0.5, w: 2, cut });
      ctx.restore();
      // the arch frame: lead + a drawn light line
      ctx.strokeStyle = rgba('#120A30', Math.min(1, la + 0.2)); ctx.lineWidth = lw * 2.2; ctx.stroke(G.arch);
      const fr = archPathSimple(P.arch, lw * 1.6);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = A * (co.frameA ?? 0.7); ctx.strokeStyle = P.frame; ctx.lineWidth = 2.5; ctx.stroke(fr);
      V2.glow(gg => { gg.globalAlpha = A * 0.5; gg.strokeStyle = P.frame; gg.lineWidth = 10; gg.stroke(fr); });
      ctx.restore();
    };
    return { uniforms, crisp, geo: G, arch: G.arch, P };
  };
})();
