// V2 core: fx. The shared glow queue (one 1/4-res flush per frame), the post queue (drawn after the glow: faces),
// caption panes (V2.shade), light lines, burst envelopes -> BURST chunk uniforms, sparks, confetti, trails,
// the flash guard and lead flashes (LOOK.md 2.6, 2.9, 2.10).
(function () {
  const V2 = window.V2;
  const { clamp, lerp, hash, TAU } = V2.U;
  const W = 1080, H = 1350;
  const rgba = V2.rgba;
  const fx = V2.fx = {};

  // ------------------------------------------------------------------ glow queue
  // V2.glow(fn): fn(g) draws halo shapes on a 1/4-res canvas (in 1080x1350 units). One flush per frame (V2.draw does
  // it automatically after the scene, or a scene calls V2.flushGlow(ctx) earlier). Never use shadowBlur.
  V2.glowJobs = [];
  // camera: V2.camera(ctx, [a,b,c,d,e,f] | null) sets the ctx transform AND records it so glow and post jobs queued
  // while it is active are drawn through the same camera. Always reset with V2.camera(ctx, null).
  V2.camM = null;
  V2.camera = function (ctx, m) {
    V2.camM = m ? m.slice() : null;
    if (m) ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]); else ctx.setTransform(1, 0, 0, 1, 0, 0);
  };
  // camera matrix that maps world (x,y) to screen: s = (p - [wx,wy]) * k + [sx,sy]
  V2.camMat = (k, wx, wy, sx, sy) => [k, 0, 0, k, sx - wx * k, sy - wy * k];
  // V2.glow(fn, {wide: true}): the job goes only into the wide (1/16-res) halo layer: soft bloom around a shape
  // without filling its counters (word blaze, pulses)
  V2.glowWideJobs = [];
  V2.glow = (fn, o) => { const m = V2.camM; const j = m ? (g => { g.transform(m[0], m[1], m[2], m[3], m[4], m[5]); fn(g); }) : fn; (o && o.wide ? V2.glowWideJobs : V2.glowJobs).push(j); };
  V2.flushGlow = function (ctx, o = {}) {
    if (!V2.glowJobs.length && !V2.glowWideJobs.length) return;
    if (V2.DBG && V2.DBG.noGlow) { V2.glowJobs = []; V2.glowWideJobs = []; return; }
    const k = 0.25, w = 270, h = 338;
    const [c1, g1] = LX.scratch('v2gA', w, h);
    g1.clearRect(0, 0, w, h); g1.setTransform(k, 0, 0, k, 0, 0); g1.lineCap = 'round'; g1.lineJoin = 'round';
    for (const f of V2.glowJobs) { g1.save(); f(g1); g1.restore(); }
    V2.glowJobs = [];
    // tight halo: one small blur at 1/4 res; wide halo: a 1/16-res downsample drawn back up (the resample is the blur)
    const D = V2.DBG || {};
    const [c3, g3] = LX.scratch('v2gC', 68, 85);
    g3.clearRect(0, 0, 68, 85); g3.imageSmoothingEnabled = true; g3.imageSmoothingQuality = 'medium'; g3.drawImage(c1, 0, 0, 68, 85);
    if (V2.glowWideJobs.length) { g3.save(); g3.setTransform(68 / W, 0, 0, 85 / H, 0, 0); g3.lineCap = 'round'; g3.lineJoin = 'round'; for (const f of V2.glowWideJobs) { g3.save(); f(g3); g3.restore(); } g3.restore(); }
    V2.glowWideJobs = [];
    const [c2, g2] = LX.scratch('v2gB', w, h);
    g2.clearRect(0, 0, w, h); g2.globalCompositeOperation = 'lighter';
    // (order matters: a scaled drawImage after a filtered draw on the same canvas misplaces the image in this renderer)
    g2.imageSmoothingEnabled = true; g2.globalAlpha = o.a2 ?? 0.75; g2.drawImage(c3, 0, 0, w, h);
    if (!D.glowNoBlur) { g2.filter = `blur(${o.blur1 ?? 2}px)`; g2.globalAlpha = o.a1 ?? 0.85; g2.drawImage(c1, 0, 0); g2.filter = 'none'; }
    if (D.glowNoDraw) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = o.alpha ?? 1;
    ctx.drawImage(c2, 0, 0, W, H);
    ctx.restore();
  };
  // post queue: drawn after the glow flush (faces, so halos never wash out the ink). fn(ctx).
  V2.postJobs = [];
  V2.post = fn => { const m = V2.camM; V2.postJobs.push(m ? (c => { c.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]); fn(c); }) : fn); };
  V2.flushPost = function (ctx) { const j = V2.postJobs; V2.postJobs = []; for (const f of j) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); f(ctx); ctx.restore(); } };

  // ------------------------------------------------------------------ caption pane (feathered rounded slab)
  // V2.shade(ctx, rect [x0,y0,x1,y1], hex, a, o): source-over, never a multiply (the lookdevs' brown blobs).
  // o.feather (85), o.r corner radius (60). The blurred slab is cached by its parameters.
  const shadeCache = new Map();
  V2.shade = function (ctx, rect, hex, a = 0.5, o = {}) {
    if (a <= 0) return;
    const fe = o.feather ?? 85, rr = o.r ?? 60;
    rect = rect.map(Math.round);                                  // snapped: the cache key is exact
    if (V2.QA && V2.QA.on && a >= 0.2) V2.QA.panes.push({ rect, fe, a });
    const key = rect.join(',') + hex + fe + rr;
    let c = shadeCache.get(key);
    if (!c) {
      const k = 0.25;
      const pad = fe * 1.6;
      const bx = rect[0] - pad, by = rect[1] - pad, bw = rect[2] - rect[0] + 2 * pad, bh = rect[3] - rect[1] + 2 * pad;
      const cw = Math.max(4, Math.ceil(bw * k)), chh = Math.max(4, Math.ceil(bh * k));
      const src = document.createElement('canvas'); src.width = cw; src.height = chh;
      const g = src.getContext('2d'); g.setTransform(k, 0, 0, k, -bx * k, -by * k);
      g.fillStyle = hex; g.beginPath(); g.roundRect(rect[0] + fe * 0.35, rect[1] + fe * 0.35, rect[2] - rect[0] - fe * 0.7, rect[3] - rect[1] - fe * 0.7, rr); g.fill();
      const dst = document.createElement('canvas'); dst.width = cw; dst.height = chh;
      const d = dst.getContext('2d'); d.filter = `blur(${(fe * k * 0.45).toFixed(1)}px)`; d.drawImage(src, 0, 0);
      c = { cv: dst, x: bx, y: by, w: bw, h: bh };
      if (shadeCache.size > 40) shadeCache.delete(shadeCache.keys().next().value);
      shadeCache.set(key, c);
    }
    ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
    ctx.drawImage(c.cv, c.x, c.y, c.w, c.h);
    ctx.restore();
  };

  // ------------------------------------------------------------------ light lines
  // tapered brush polygon along a polyline. taper: [startFrac, startW, endFrac, endW] (LOOK 3.1: 6%/0.35, 8%/0.2)
  fx.brush = function (pts, w, o = {}) {
    const n = pts.length, Lp = [], Rp = [];
    const tp = o.taper || [0.06, 0.35, 0.08, 0.2];
    let tot = 0; const acc = [0];
    for (let i = 1; i < n; i++) { tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); acc.push(tot); }
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const u = tot > 0 ? acc[i] / tot : 0;
      let k = 1;
      if (u < tp[0]) k = lerp(tp[1], 1, u / tp[0]);
      else if (u > 1 - tp[2]) k = lerp(1, tp[3], (u - (1 - tp[2])) / tp[2]);
      if (o.press) k *= 0.88 + 0.12 * Math.sin(u * 11 + (o.seed || 0) * 3.1);
      const hw = w * 0.5 * k;
      Lp.push([pts[i][0] - dy * hw, pts[i][1] + dx * hw]); Rp.push([pts[i][0] + dy * hw, pts[i][1] - dx * hw]);
    }
    const p = new Path2D();
    Lp.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]));
    for (let i = Rp.length - 1; i >= 0; i--) p.lineTo(Rp[i][0], Rp[i][1]);
    p.closePath();
    return p;
  };
  // V2.lightLine(ctx, pts, o): drawn light. White-hot tapered core + coloured halo through the glow queue.
  // o: {core '#FFFFFF', halo, w 4, taper [..], gw (halo width, 3.2*w), ga (0.85), alpha 1, op 'lighter'|'source-over',
  //     boil px (re-seeded from o.seed, use V2.boil), progress 0..1 (draw on), glow false to skip the halo,
  //     overshoot (fraction of the length to extend past the end along its tangent, e.g. 0.06)}
  V2.lightLine = function (ctx, pts, o = {}) {
    let P = pts;
    if (o.overshoot && P.length > 1) {        // the hand-drawn overshoot: extend past the end along the end tangent
      const a = P[P.length - 2], b = P[P.length - 1], dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1;
      let tot = 0; for (let i = 1; i < P.length; i++) tot += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      const ext = tot * o.overshoot, n = 4;
      P = P.concat(Array.from({ length: n }, (_, k) => [b[0] + dx / dl * ext * (k + 1) / n, b[1] + dy / dl * ext * (k + 1) / n]));
    }
    if (o.boil) { const sd = o.seed || 0; P = pts.map((p, i) => [p[0] + (hash(i * 13.1 + sd * 7.7 + 1) - 0.5) * 2 * o.boil, p[1] + (hash(i * 13.1 + sd * 7.7 + 2) - 0.5) * 2 * o.boil]); }
    if (o.progress !== undefined && o.progress < 1) {
      if (o.progress <= 0) return;
      const n = Math.max(2, Math.ceil(P.length * o.progress)); P = P.slice(0, n);
    }
    const w = o.w ?? 4;
    const body = fx.brush(P, w, o);
    if (o.glow !== false && o.halo) {
      const pp = V2.P.path(P);
      V2.glow(g => { g.globalAlpha = (o.ga ?? 0.85) * (o.alpha ?? 1); g.strokeStyle = o.halo; g.lineWidth = o.gw ?? w * 3.2; g.stroke(pp); });
    }
    ctx.save(); ctx.globalCompositeOperation = o.op || 'source-over'; ctx.globalAlpha = o.alpha ?? 1;
    ctx.fillStyle = o.core || '#FFFFFF'; ctx.fill(body);
    ctx.restore();
    return body;
  };

  // ------------------------------------------------------------------ bursts (BURST chunk uniforms)
  // V2.fx.burst(t, t0, o) -> uniforms. o: {x, y, kind, amt 1, decay, att, K, K2, K3, S (spiral ring), tint}
  //   K3: [ring start radius, implode, tint mix, ray dispersion]; S: [spiral bend px, twist, lobes, ring white core]
  // kinds: 'ring' (0.12, 38.6), 'drop' (36.0, capped whiteout + rays + shock + streak + leaks), 'shock' (36.75),
  //        'jewel' (22.25, white-hot core + rays + ripple at 900 px/s), 'soft' (42.75 rose-gold), 'inverse' (59.25)
  const KINDS = {
    ring: { att: 4, decay: 0.12, K: [0, 0, 1.5, 0], K2: [0, 0, 1300, 0], K3: [120, 0, 0, 1], S: [0, 0, 9, 1.4] },
    drop: { att: 1, decay: 0.3, K: [1, 1, 0.6, 1], K2: [1, 0.7, 1500, 1], K3: [120, 0, 0, 1], S: [0, 0, 9, 0.8] },
    shock: { att: 1, decay: 0.35, K: [0, 0.8, 0.4, 0.35], K2: [0, 0, 1300, 0.4], K3: [100, 0, 0, 1], S: [0, 0, 9, 0.6] },
    jewel: { att: 1, decay: 0.5, K: [0.22, 0.7, 0.5, 1], K2: [0, 0, 900, 1.2], K3: [60, 0, 0, 1], S: [0, 0, 9, 0.6] },
    soft: { att: 3, decay: 0.5, K: [0.12, 0, 0.35, 0], K2: [0, 0, 420, 0.9], K3: [80, 0, 0.8, 1], S: [0, 0, 9, 0.4], tint: '#FFC27A' },
    inverse: { att: 1, decay: 0.28, K: [0, 0.45, 0, 0.55], K2: [0, 0, 1800, 0.2], K3: [1100, 1, 0, 0], S: [0, 0, 9, 0] },
  };
  fx.KINDS = KINDS;
  fx.burst = function (t, t0, o = {}) {
    const k = KINDS[o.kind || 'drop'] || KINDS.drop;
    const A = V2.env(t, t0, o.att ?? k.att, o.decay ?? k.decay) * (o.amt ?? 1);
    const age = Math.max(0, (Math.round(t * 30) - Math.round(t0 * 30)) / 30);
    const tint = V2.lin(o.tint || k.tint || '#FFFFFF');
    return {
      uBurst: [o.x ?? 540, o.y ?? 675, age, A > 0.002 ? A : 0],
      uBurstK: o.K || k.K, uBurstK2: o.K2 || k.K2, uBurstK3: o.K3 || k.K3, uBurstS: o.S || k.S || [0, 0, 9, 0], uBurstTint: tint,
    };
  };

  // ------------------------------------------------------------------ sparks (4 to 6 short rays: born in 2 frames, gone in 8)
  fx.sparks = function (ctx, t, t0, x, y, cols = ['#FFFFFF'], o = {}) {
    const k = Math.round(t * 30) - Math.round(t0 * 30);
    if (k < 0 || k >= 8) return;
    const n = o.n ?? (4 + Math.floor(hash(t0 * 7.3) * 3)), R = o.r ?? 70;
    const grow = Math.min(1, (k + 1) / 2), fade = k < 2 ? 1 : 1 - (k - 1) / 7;
    const p = new Path2D();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + hash(t0 * 13.1 + i) * 0.6 + (o.rot || 0);
      const r0 = R * (0.18 + 0.25 * (1 - fade)), r1 = r0 + R * (0.45 + 0.4 * hash(i + t0)) * grow;
      p.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); p.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    }
    const col = cols[0];
    V2.glow(g => { g.globalAlpha = fade; g.strokeStyle = cols[1] || col; g.lineWidth = (o.w ?? 5) * 3; g.lineCap = 'round'; g.stroke(p); });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.globalAlpha = fade;
    ctx.strokeStyle = col; ctx.lineWidth = o.w ?? 5; ctx.stroke(p);
    ctx.restore();
  };

  // ------------------------------------------------------------------ confetti of light (dashes on 16ths)
  // fx.confetti(ctx, t, box [x0,y0,x1,y1], o): {t0 (start), origin [x,y] (thrown outward), cols, n per volley 9, avoid [rects]}
  fx.confetti = function (ctx, t, box, o = {}) {
    const t0 = o.t0 ?? 0, cols = o.cols || ['#FFFFFF', '#FFE45C', '#22E4FF'];
    if (t < t0) return;
    const S = o.origin || [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
    const n16 = Math.floor((t - t0) / 0.1875 + 1e-9);
    const groups = cols.map(() => new Path2D());
    const inAvoid = (x, y) => (o.avoid || []).some(r => x > r[0] && x < r[2] && y > r[1] && y < r[3]);
    for (let v = Math.max(0, n16 - 4); v <= n16; v++) {
      const age = (t - t0) - v * 0.1875;
      for (let i = 0; i < (o.n ?? 9); i++) {
        const sd = v * 31.7 + i * 7.13, a = hash(sd) * TAU;
        const r = (o.r0 ?? 200) + age * (900 + 700 * hash(sd + 1)), len = 22 + 26 * hash(sd + 2);
        const x0 = S[0] + Math.cos(a) * r, y0 = S[1] + Math.sin(a) * r;
        if (x0 < box[0] || x0 > box[2] || y0 < box[1] || y0 > box[3] || inAvoid(x0, y0)) continue;
        const gp = groups[i % cols.length];
        gp.moveTo(x0, y0); gp.lineTo(S[0] + Math.cos(a) * (r + len), S[1] + Math.sin(a) * (r + len));
      }
    }
    V2.glow(g => { g.lineWidth = 16; g.lineCap = 'round'; groups.forEach((gp, i) => { g.strokeStyle = cols[i]; g.stroke(gp); }); });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.globalAlpha = o.alpha ?? 1;
    ctx.lineWidth = o.w ?? 6; groups.forEach((gp, i) => { ctx.strokeStyle = cols[i]; ctx.stroke(gp); });
    ctx.restore();
  };

  // ------------------------------------------------------------------ trails / smears
  // fx.trail(n, fn): fn(i, alpha) for i = n..1 (oldest first), alpha falling off. Callers evaluate their pose at
  // t - i/30 (pure function of t), so a long-exposure trail costs nothing in state.
  fx.trail = function (n, fn, a0 = 0.55) { for (let i = n; i >= 1; i--) fn(i, a0 * Math.pow(1 - i / (n + 1), 1.3)); };

  // ------------------------------------------------------------------ flashes (photosensitivity guard, LOOK 2.10)
  // lead flash: blade edges / knot edge flash white for 2 frames, then a 6-frame decay
  fx.leadFlash = function (t, times) {
    let v = 0;
    for (const t0 of times) {
      const k = Math.round(t * 30) - Math.round(t0 * 30);
      if (k < 0 || k >= 8) continue;
      v = Math.max(v, k < 2 ? 1 : Math.pow(1 - (k - 1) / 7, 2));
    }
    return v;
  };
  // flash guard: events closer than 1/3 s to the last accepted one are dropped; amplitude capped
  fx.flash = function (t, events, o = {}) {
    const acc = []; let last = -1e9;
    [...events].sort((a, b) => a - b).forEach(e => { if (e - last >= (o.gap ?? 0.34)) { acc.push(e); last = e; } });
    let v = 0;
    for (const e of acc) v = Math.max(v, V2.env(t, e, o.att ?? 1, o.decay ?? 0.2));
    return Math.min(v, o.cap ?? 1);
  };
})();
