// grabbygrab drawn in light (pool lookdev).
// Same identity as v1 (bean body, ONE noodle arm, 3-finger mitten + thumb, two feet), new material:
//   - flat translucent color fill (painted into the low-res FIELD canvas, under the pool light)
//   - lens mask (MASK A: R = body, G = dome height) so the caustic lines bend and warm up inside him
//   - one confident hand-drawn light contour (tapered, overshooting its start) + an off-register second line
//   - eyes are the brightest, thickest marks on screen
// Geometry is computed once per frame by GR.geo(o) and shared by all layers.
(function () {
  const TAU = Math.PI * 2;
  const E = window.ENGINE;
  const GR = {};

  // tiny deterministic noise for line boil
  const hs = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  function stadium(x0, len, hw, rot, T) {
    len = Math.max(len, 2 * hw + 0.01);
    const xa = x0 + hw, xb = x0 + len - hw, pts = [];
    for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i / 10 * Math.PI; pts.push([xb + Math.cos(a) * hw, Math.sin(a) * hw]); }
    for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + i / 10 * Math.PI; pts.push([xa + Math.cos(a) * hw, Math.sin(a) * hw]); }
    const c = Math.cos(rot), s = Math.sin(rot);
    return pts.map(([x, y]) => T(x * c - y * s, x * s + y * c));
  }
  function ellPts(cx, cy, rx, ry, rot = 0, n = 48) {
    const c = Math.cos(rot), s = Math.sin(rot), pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU; const x = Math.cos(a) * rx, y = Math.sin(a) * ry; pts.push([cx + x * c - y * s, cy + x * s + y * c]); }
    return pts;
  }
  const poly = (pts, closed = true) => { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); if (closed) p.closePath(); return p; };
  GR.poly = poly; GR.ellPts = ellPts;

  // outer silhouette of overlapping shapes as ONE light line (stroke 2x, punch the interiors out on a scratch canvas)
  GR.unionStroke = function (ctx, polys, lw, color, o = {}) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    polys.forEach(p => p.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }));
    const pad = lw * 2 + 6; x0 = Math.floor(x0 - pad); y0 = Math.floor(y0 - pad);
    const w = Math.ceil(x1 - x0 + pad), h = Math.ceil(y1 - y0 + pad);
    if (w <= 0 || h <= 0) return;
    // grow-only scratch (resizing a canvas every frame is a hidden allocation cost)
    const key = o.key || 'union';
    let c = GR._sc[key];
    if (!c || c.width < w || c.height < h) { c = GR._sc[key] = document.createElement('canvas'); c.width = Math.max(w, c ? c.width : 0, 256); c.height = Math.max(h, c ? c.height : 0, 256); }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, w, h); g.translate(-x0, -y0);
    g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = color; g.lineWidth = lw * 2;
    polys.forEach(p => g.stroke(poly(p)));
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
    polys.forEach(p => g.fill(poly(p)));
    if (o.inner) {   // faint inner overlaps (knuckles) as thin light
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = o.inner; g.lineWidth = lw * 0.45;
      polys.forEach(p => g.stroke(poly(p)));
    }
    ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.globalCompositeOperation = o.op || 'source-over';
    if (o.dx || o.dy) ctx.translate(o.dx || 0, o.dy || 0);
    ctx.drawImage(c, 0, 0, w, h, x0, y0, w, h); ctx.restore();
  };
  GR._sc = {};

  // Mitten geometry: palm + 3 finger capsules + thumb. open 0 (fist) .. 1 (spread). returns arrays of polygons (world coords)
  GR.mitten = function (hx, hy, ang, ms, open, stagger = 0) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const T = (x, y) => [hx + x * c - y * s, hy + x * s + y * c];
    const parts = [];
    parts.push({ kind: 'palm', pts: ellPts(0, 0, 0.30 * ms, 0.27 * ms).map(([x, y]) => T(x, y)) });
    const tips = [];
    for (let i = 0; i < 3; i++) {
      const o = E.smoother(E.clamp((open - i * stagger) / Math.max(0.001, 1 - 2 * stagger)));
      const a = (i - 1) * (0.55 * o + 0.42 * (1 - o));
      const L = (0.02 + 0.38 * o) * ms;
      parts.push({ kind: 'finger', pts: stadium(0.16 * ms, L + 0.12 * ms + 0.17 * ms * 0.5, 0.085 * ms, a, T), o });
      const r = 0.16 * ms + L + 0.12 * ms;
      tips.push({ p: T(Math.cos(a) * r, Math.sin(a) * r), a: ang + a, o });
    }
    const ot = E.smoother(E.clamp((open - 3 * stagger) / Math.max(0.001, 1 - 2 * stagger)));
    const ta = -1.2 - 0.4 * ot;
    parts.push({ kind: 'thumb', pts: stadium(0.08 * ms, (0.16 + 0.12 * ot) * ms + 0.07 * ms, 0.07 * ms, ta, T), o: ot });
    const tr = 0.08 * ms + (0.16 + 0.12 * ot) * ms + 0.07 * ms;
    tips.push({ p: T(Math.cos(ta) * tr, Math.sin(ta) * tr), a: ang + ta, o: ot });
    return { parts, tips, center: [hx, hy], ang, ms };
  };

  // o: {x, y, s, squash, tilt, t, arm:{tx,ty,ext,open,ang}, eyes, mouth, look, knot:0..1 (radius factor), frame}
  GR.geo = function (o) {
    const s = o.s, cx = o.x, cy = o.y, sq = o.squash || 0, tilt = o.tilt || 0;
    const bw = 0.62 * s * (1 + sq), bh = 0.7 * s * (1 - sq);
    const ca = Math.cos(tilt), sa = Math.sin(tilt);
    const L = (lx, ly) => [cx + lx * ca - ly * sa, cy + lx * sa + ly * ca];
    const body = [];
    const N = 120;
    const rr = a => 1 - 0.035 * Math.cos(2 * (a + 0.5)) + 0.015 * Math.sin(3 * a + 1);
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU, r = rr(a);
      body.push(L(Math.cos(a) * bw * r, Math.sin(a) * bh * r * (Math.sin(a) > 0 ? 0.97 : 1)));
    }
    const bodyAt = (a, k = 1) => { const r = rr(a) * k; return L(Math.cos(a) * bw * r, Math.sin(a) * bh * r * (Math.sin(a) > 0 ? 0.97 : 1)); };
    const feet = [[-0.22, 0.66], [0.22, 0.66]].map(([fx, fy]) => ({ c: L(fx * s, fy * s + 0.02 * s), rx: 0.12 * s, ry: 0.065 * s }));
    // arm
    const arm = o.arm || { ext: 0, open: 0.3 };
    const sh = bodyAt(o.armSide === 'left' ? Math.PI - 0.25 : 0.25, 0.97);
    const rest = L((o.armSide === 'left' ? -1 : 1) * 0.98 * bw, 0.45 * bh);
    const tx = arm.tx ?? rest[0], ty = arm.ty ?? rest[1];
    const e = E.clamp(arm.ext ?? 0);
    const hx = E.lerp(rest[0], tx, e), hy = E.lerp(rest[1], ty, e);
    const hang = arm.ang ?? Math.atan2(hy - sh[1], hx - sh[0]);
    const dist = Math.hypot(hx - sh[0], hy - sh[1]);
    const sag = (arm.sag ?? ((1 - e) * 0.22 * s + 0.08 * s));
    const p1 = [sh[0] + Math.cos(hang) * dist * 0.35 + (arm.bend || 0) * s, sh[1] + Math.sin(hang) * dist * 0.35 + sag];
    const p2 = [hx - Math.cos(hang) * dist * 0.35, hy - Math.sin(hang) * dist * 0.35 + sag * 0.4];
    const armPts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, u = 1 - t;
      armPts.push([u * u * u * sh[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * hx,
        u * u * u * sh[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * hy]);
    }
    const ms = 0.55 * s * (arm.mscale || 1);
    const mit = GR.mitten(hx, hy, hang, ms, arm.open ?? 0.3, arm.stagger || 0);
    const knotC = [hx + Math.cos(hang) * 0.12 * s, hy + Math.sin(hang) * 0.12 * s];
    const lk = o.look || [0, 0];
    const ex = 0 + lk[0] * 0.08 * s, ey = -0.12 * s + lk[1] * 0.06 * s;
    return {
      o, s, cx, cy, bw, bh, tilt, L, body, bodyAt, feet, sh, hand: [hx, hy], hang, armPts, armW: 0.11 * s, mit, knotC,
      knotR: 0.30 * s * (o.knot ?? 1), eyes: [L(ex - 0.2 * s, ey), L(ex + 0.2 * s, ey)], mouth: L(ex, ey + 0.15 * s), eyeY: ey,
    };
  };

  // ------------------------------------------------------------------ FIELD (flat translucent color, low-res canvas)
  // st: {fill:[inner, edge], fillA, mitten:color, feet:color}
  GR.field = function (g, G, st) {
    g.save();
    const r = Math.max(G.bw, G.bh);
    const gr = g.createRadialGradient(G.cx - 0.25 * G.bw, G.cy - 0.35 * G.bh, r * 0.05, G.cx, G.cy, r * 1.08);
    gr.addColorStop(0, st.fill[0]); gr.addColorStop(0.55, st.fill[1]); gr.addColorStop(1, st.fill[2] || st.fill[1]);
    g.globalAlpha = st.fillA ?? 0.85;
    g.fillStyle = gr;
    // feet first (behind)
    G.feet.forEach(f => { g.beginPath(); g.ellipse(f.c[0], f.c[1], f.rx, f.ry, G.tilt, 0, TAU); g.fill(); });
    g.fill(poly(G.body));
    // arm: translucent noodle
    g.globalAlpha = st.armA ?? 0.75;
    g.strokeStyle = st.arm || st.fill[1]; g.lineWidth = G.armW; g.lineCap = 'round'; g.lineJoin = 'round';
    g.stroke(poly(G.armPts, false));
    if (st.mittenFill !== false) {
      g.fillStyle = st.mitten || st.fill[0];
      g.globalAlpha = st.mittenA ?? 0.55;     // overlapping capsules build up = glowing knuckles
      G.mit.parts.forEach(p => g.fill(poly(p.pts)));
    }
    g.restore();
  };

  // ------------------------------------------------------------------ MASK A: R body, G dome height (lens), (B knot drawn by scene)
  GR.mask = function (g, gDome, G, o = {}) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = '#ff0000';
    const bp = poly(G.body);
    g.fill(bp);
    if (o.mitten !== false) G.mit.parts.forEach(p => g.fill(poly(p.pts)));
    g.restore();
    // dome: stacked shrinking fills (blurred once later, with the whole dome layer)
    gDome.save(); gDome.globalCompositeOperation = 'lighter';
    [1.0, 0.8, 0.6, 0.4].forEach(k => {
      gDome.save(); gDome.translate(G.cx, G.cy); gDome.scale(k, k); gDome.translate(-G.cx, -G.cy);
      gDome.fillStyle = 'rgba(0,255,0,0.25)'; gDome.fill(bp); gDome.restore();
    });
    gDome.restore();
  };

  // ------------------------------------------------------------------ hand-drawn light contour
  // returns a list of [pts, width, color, alpha] strokes (drawn as tapered brush fills)
  function contourStrokes(G, st, frame) {
    const out = [];
    const boil = st.boil ?? 1.2, seedF = Math.floor(frame / (st.boilDiv || 2));
    const j = (i, k) => (hs(i * 13.1 + seedF * 7.7 + k) - 0.5) * 2 * boil;
    // main contour: starts upper-left, 1.07 turns, end overshoots outward a little
    const a0 = st.a0 ?? -2.2, turns = st.turns ?? 1.07, n = 140;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, a = a0 + u * turns * TAU;
      const k = 1 + 0.018 * Math.sin(u * 9 + 1) + (u > 0.9 ? (u - 0.9) * 0.25 : 0) - (u < 0.06 ? (0.06 - u) * 0.2 : 0);
      const p = G.bodyAt(a, k);
      pts.push([p[0] + j(i, 1), p[1] + j(i, 2)]);
    }
    out.push([pts, st.coreW ?? 0.03 * G.s, st.core, 1, 0.35]);
    // off-register second line (thinner, different hue, partial)
    if (st.second) {
      const p2 = [], a1 = a0 + 0.9, n2 = 70;
      for (let i = 0; i <= n2; i++) {
        const u = i / n2, a = a1 + u * 0.62 * TAU;
        const p = G.bodyAt(a, 1.0 + 0.012 * Math.sin(u * 5));
        p2.push([p[0] + st.second.dx + j(i, 3) * 0.6, p[1] + st.second.dy + j(i, 4) * 0.6]);
      }
      out.push([p2, (st.coreW ?? 0.03 * G.s) * 0.45, st.second.color, st.second.a ?? 0.9, 0.7]);
    }
    return out;
  }

  // glow shapes for the shared 1/4-res glow pass (g is in full-res coords)
  GR.glow = function (g, G, st, frame) {
    const strokes = contourStrokes(G, st, frame), cw = st.coreW ?? 0.03 * G.s;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = st.halo; g.globalAlpha = st.haloA ?? 0.85; g.lineWidth = cw * 3;
    g.stroke(poly(strokes[0][0], false));
    g.globalAlpha = (st.haloA ?? 0.85) * 0.7;
    g.lineWidth = G.armW * 0.45; g.stroke(poly(G.armPts, false));
    g.lineWidth = cw * 1.4; g.globalAlpha = (st.haloA ?? 0.85) * 0.55;
    G.mit.parts.forEach(p => g.stroke(poly(p.pts)));
    G.feet.forEach(f => { g.beginPath(); g.ellipse(f.c[0], f.c[1], f.rx, f.ry, G.tilt, 0.15 * Math.PI, 0.95 * Math.PI); g.stroke(); });
    // eyes glow
    g.strokeStyle = st.eyeHalo || st.halo; g.fillStyle = st.eyeHalo || st.halo; g.globalAlpha = st.eyeGlowA ?? 0.8;
    faceShapes(g, G, st, 2.4, true);
    g.restore();
  };

  // crisp lines (full res)
  GR.lines = function (ctx, G, st, frame) {
    const strokes = contourStrokes(G, st, frame);
    ctx.save();
    ctx.globalCompositeOperation = st.op || 'source-over';
    for (const [pts, w, col, a, taper] of strokes) {
      ctx.globalAlpha = a; ctx.fillStyle = col;
      ctx.fill(LX.brushPath(pts, w, 3.1, taper));
    }
    // arm: luminous noodle: two parallel light lines (tube), slightly tapered
    ctx.globalAlpha = 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const aw = G.armW;
    const side = (k) => G.armPts.map((p, i) => {
      const a = G.armPts[Math.max(0, i - 1)], b = G.armPts[Math.min(G.armPts.length - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1;
      const w = aw * 0.5 * (1 - 0.15 * i / G.armPts.length);
      return [p[0] - dy / l * w * k, p[1] + dx / l * w * k];
    });
    const lw = st.armLineW ?? Math.max(4, (st.coreW ?? 0.03 * G.s) * 0.6);
    ctx.strokeStyle = st.armCol || st.core; ctx.lineWidth = lw;
    const palmR = 0.3 * G.mit.ms;
    const trim = pts => pts.filter(p => Math.hypot(p[0] - G.hand[0], p[1] - G.hand[1]) > palmR * 0.95);
    ctx.stroke(poly(trim(side(1).slice(2)), false)); ctx.stroke(poly(trim(side(-1).slice(2)), false));
    // mitten: one silhouette line around palm + fingers; overlaps stay as faint knuckle light
    GR.unionStroke(ctx, G.mit.parts.map(p => p.pts), lw, st.mitCol || st.core, { inner: 0.35 });
    // feet: little arcs
    ctx.strokeStyle = st.core; ctx.lineWidth = lw;
    G.feet.forEach(f => { ctx.beginPath(); ctx.ellipse(f.c[0], f.c[1], f.rx, f.ry, G.tilt, 0.12 * Math.PI, 0.98 * Math.PI); ctx.stroke(); });
    // face
    faceShapes(ctx, G, st, 1, false);
    ctx.restore();
  };

  // face: eyes are the brightest marks. widthK scales stroke width (glow pass uses a fatter version)
  function faceShapes(g, G, st, widthK, glow) {
    const s = G.s, eyes = st.eyes || 'dots';
    const ew = (st.eyeW ?? 0.048 * s) * widthK;
    g.save();
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (!glow) { g.strokeStyle = st.eye || '#FFFDF6'; g.fillStyle = st.eye || '#FFFDF6'; }
    g.lineWidth = ew;
    const [eL, eR] = G.eyes;
    [[eL, -1], [eR, 1]].forEach(([p, sd]) => {
      const [x, y] = p;
      g.beginPath();
      if (eyes === 'squeeze') {
        const w = 0.075 * s, h = 0.062 * s;
        g.moveTo(x - sd * w, y - h); g.lineTo(x + sd * w * 0.6, y); g.lineTo(x - sd * w, y + h); g.stroke();
      } else if (eyes === 'happy') {
        g.arc(x, y + 0.03 * s, 0.07 * s, 1.12 * Math.PI, 1.88 * Math.PI); g.stroke();
      } else if (eyes === 'closed') {
        g.arc(x, y - 0.02 * s, 0.068 * s, 0.14 * Math.PI, 0.86 * Math.PI); g.stroke();
      } else if (eyes === 'soft') {
        g.arc(x, y - 0.005 * s, 0.062 * s, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
      } else {
        const er = (eyes === 'big' ? 0.09 : 0.066) * s;
        const px = (st.pupil ? st.pupil[0] : 0) * er * 0.3, py = (st.pupil ? st.pupil[1] : 0) * er * 0.3;
        g.ellipse(x + px, y + py, er * 0.8 * (glow ? 1.25 : 1), er * 1.12 * (glow ? 1.2 : 1), G.tilt, 0, TAU); g.fill();
        if (!glow && st.eyeShine) { g.fillStyle = st.eyeShine; g.beginPath(); g.arc(x + px - er * 0.25, y + py - er * 0.45, er * 0.28, 0, TAU); g.fill(); g.fillStyle = st.eye || '#FFFDF6'; }
      }
      if (st.brows === 'worried') {
        g.beginPath(); g.moveTo(x - sd * 0.1 * s, y - 0.2 * s); g.lineTo(x + sd * 0.06 * s, y - 0.15 * s); g.stroke();
      }
    });
    // mouth
    const [mx, my] = G.mouth, mouth = st.mouth || (eyes === 'squeeze' ? 'zigzag' : 'smile');
    g.lineWidth = ew * 0.72;
    g.beginPath();
    if (mouth === 'zigzag') {
      const w = 0.07 * s;
      g.moveTo(mx - w, my); for (let k = 1; k <= 4; k++) g.lineTo(mx - w + k * w / 2, my + (k % 2 ? -0.024 : 0.024) * s); g.stroke();
    } else if (mouth === 'open') {
      g.moveTo(mx - 0.085 * s, my - 0.04 * s);
      g.quadraticCurveTo(mx, my - 0.055 * s, mx + 0.085 * s, my - 0.04 * s);
      g.quadraticCurveTo(mx + 0.07 * s, my + 0.1 * s, mx, my + 0.1 * s);
      g.quadraticCurveTo(mx - 0.07 * s, my + 0.1 * s, mx - 0.085 * s, my - 0.04 * s);
      if (glow) g.fill(); else { g.fillStyle = st.mouthFill || st.eye || '#FFFDF6'; g.fill(); }
    } else if (mouth === 'o') {
      g.ellipse(mx, my, 0.035 * s, 0.045 * s, 0, 0, TAU); g.stroke();
    } else if (mouth === 'flat') {
      g.moveTo(mx - 0.05 * s, my); g.lineTo(mx + 0.05 * s, my); g.stroke();
    } else if (mouth !== 'none') {
      g.arc(mx, my - 0.05 * s, 0.065 * s, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke();
    }
    // blush (glow only => soft light)
    if (st.blush && glow) {
      g.globalAlpha = st.blush; g.fillStyle = st.blushCol || '#FF6FB5';
      [eL, eR].forEach(([x, y], i) => { g.beginPath(); g.ellipse(x + (i ? 1 : -1) * 0.13 * s, y + 0.11 * s, 0.07 * s, 0.04 * s, 0, 0, TAU); g.fill(); });
      g.globalAlpha = 1;
    }
    // sweat drop of cyan light
    if (st.sweat) {
      const dx = G.cx - 0.55 * G.bw, dy = G.cy - 0.5 * G.bh;
      g.beginPath();
      g.moveTo(dx, dy - 0.09 * s);
      g.quadraticCurveTo(dx + 0.055 * s, dy, dx, dy + 0.04 * s);
      g.quadraticCurveTo(dx - 0.055 * s, dy, dx, dy - 0.09 * s);
      if (glow) { g.fillStyle = '#3DF5FF'; g.fill(); }
      else { g.lineWidth = Math.max(3, ew * 0.4); g.strokeStyle = '#E9FDFF'; g.stroke(); }
    }
    g.restore();
  }

  window.GR = GR;
})();
