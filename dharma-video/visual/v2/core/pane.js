// V2 core: pane primitives (LOOK.md 2.1 GROUND + GLASS) and crisp glass edges (LINE: glints, lead lines).
// Pane functions draw on the 540x675 pane context `g` returned by V2.L.pane(), in 1080x1350 units.
// Crisp functions (glints, lead) draw on the full-res 2D context `ctx` after the light pass.
(function () {
  const V2 = window.V2;
  const { clamp, TAU } = V2.U;
  const rgba = V2.rgba;
  const P = V2.P = {};

  P.path = function (pts, closed = false) { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); if (closed) p.closePath(); return p; };

  // soft radial light pool
  P.disc = function (g, x, y, r, col, a, op = 'lighter', hard = 0) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(col, a)); gr.addColorStop(clamp(hard), rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
    g.save(); g.globalCompositeOperation = op; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore();
  };
  // flat colour film with a crisp-ish edge (dichroic disc)
  P.film = function (g, x, y, r, col, a, op = 'lighter', edge = 0.06) {
    const gr = g.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
    gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1 - edge * 2, rgba(col, a * 0.78)); gr.addColorStop(1 - edge, rgba(col, a * 0.95)); gr.addColorStop(1, rgba(col, 0));
    g.save(); g.globalCompositeOperation = op; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore();
  };
  // polygon with a linear fade across its bounding box
  P.poly = function (g, pts, col, a, op = 'lighter', fade = 0.45) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, a * fade));
    g.save(); g.globalCompositeOperation = op; g.fillStyle = gr; g.fill(P.path(pts, true)); g.restore();
  };
  // light shaft from (x0,y0) to (x1,y1), widths w0 -> w1, alpha a0 -> a1
  P.beam = function (g, x0, y0, x1, y1, w0, w1, col, a0, a1 = 0, op = 'lighter') {
    const dx = x1 - x0, dy = y1 - y0, Ln = Math.hypot(dx, dy) || 1, nx = -dy / Ln, ny = dx / Ln;
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, rgba(col, a0)); gr.addColorStop(1, rgba(col, a1));
    g.save(); g.globalCompositeOperation = op; g.fillStyle = gr;
    g.fill(P.path([[x0 + nx * w0 / 2, y0 + ny * w0 / 2], [x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2], [x0 - nx * w0 / 2, y0 - ny * w0 / 2]], true));
    g.restore();
  };
  // gradients over the whole frame. stops: [[pos, css], ...]
  P.vgrad = function (g, stops, x0 = 0, y0 = 0, x1 = 0, y1 = 1350) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([p, c]) => gr.addColorStop(p, c));
    g.fillStyle = gr; g.fillRect(0, 0, 1080, 1350);
  };
  P.rgrad = function (g, x, y, r, stops, op = 'source-over') {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(([p, c]) => gr.addColorStop(p, c));
    g.save(); g.globalCompositeOperation = op; g.fillStyle = gr; g.fillRect(0, 0, 1080, 1350); g.restore();
  };
  // a translucent glass plane: tint (screen on dark grounds / multiply on light) + an inner rim of light
  P.glass = function (g, shape, col, a, o = {}) {
    const p = shape instanceof Path2D ? shape : P.path(shape, true);
    g.save(); g.globalCompositeOperation = o.op || 'screen'; g.fillStyle = rgba(col, a); g.fill(p);
    if (o.rim !== 0) { g.clip(p); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(o.rimCol || '#FFFFFF', o.rimA ?? 0.18); g.lineWidth = o.rim ?? 18; g.stroke(p); }
    g.restore();
  };
  // kite-shaped glass shard
  P.shard = function (cx, cy, ang, len, wid, skew = 0.2) {
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
    return [[cx + dx * len / 2, cy + dy * len / 2], [cx + dx * len * skew + nx * wid / 2, cy + dy * len * skew + ny * wid / 2],
      [cx - dx * len / 2, cy - dy * len / 2], [cx - dx * len * 0.1 - nx * wid / 2, cy - dy * len * 0.1 - ny * wid / 2]];
  };

  // ------------------------------------------------------------------ crisp edges (full-res ctx)
  // split segments by ellipses [cx,cy,rx,ry] (keep the parts outside): cheaper than a full-frame even-odd clip
  P.cutSegs = function (segs, ells) {
    let out = segs;
    for (const E of ells || []) {
      const nxt = [];
      for (const s of out) {
        const [a, b] = s.p; const ax = (a[0] - E[0]) / E[2], ay = (a[1] - E[1]) / E[3], dx = (b[0] - a[0]) / E[2], dy = (b[1] - a[1]) / E[3];
        const A = dx * dx + dy * dy, B = 2 * (ax * dx + ay * dy), C = ax * ax + ay * ay - 1, D = B * B - 4 * A * C;
        if (A < 1e-9) continue;                     // (integration, A1-6) a zero-length segment is only a round-cap dot: drop it
        if (D <= 0) { nxt.push(s); continue; }
        const r = Math.sqrt(D), t0 = (-B - r) / (2 * A), t1 = (-B + r) / (2 * A);
        const at = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        if (t0 > 0) nxt.push(Object.assign({}, s, { p: [a, at(Math.min(1, t0))] }));
        if (t1 < 1) nxt.push(Object.assign({}, s, { p: [at(Math.max(0, t1)), b] }));
      }
      out = nxt;
    }
    return out;
  };
  // white glints on light-facing glass edges. segs: [{p:[[x,y],[x,y]], a, w}] ; o.exclude: Path2Ds to keep clear
  P.glints = function (ctx, segs, o = {}) {
    if (o.cut) segs = P.cutSegs(segs, o.cut);
    if (!segs.length) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'lighter';
    if (o.exclude && o.exclude.length) { const ex = new Path2D(); ex.rect(-10, -10, 1100, 1370); o.exclude.forEach(p => ex.addPath(p)); ctx.clip(ex, 'evenodd'); }
    ctx.strokeStyle = o.col || '#FFFFFF';
    for (const s of segs) {
      ctx.globalAlpha = (o.a ?? 0.8) * (s.a ?? 1); ctx.lineWidth = s.w || o.w || 2;
      ctx.beginPath(); ctx.moveTo(s.p[0][0], s.p[0][1]); ctx.lineTo(s.p[1][0], s.p[1][1]); ctx.stroke();
    }
    ctx.restore();
  };
  // lead came: indigo lines (never black). segs as glints, or a Path2D. o: {w, col, a, exclude}
  P.lead = function (ctx, segs, o = {}) {
    if (o.cut && !(segs instanceof Path2D)) segs = P.cutSegs(segs, o.cut);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'source-over';
    if (o.exclude && o.exclude.length) { const ex = new Path2D(); ex.rect(-10, -10, 1100, 1370); o.exclude.forEach(p => ex.addPath(p)); ctx.clip(ex, 'evenodd'); }
    ctx.strokeStyle = o.col || V2.LEAD; ctx.globalAlpha = o.a ?? 1; ctx.lineWidth = o.w ?? 6;
    if (segs instanceof Path2D) ctx.stroke(segs);
    else { const p = new Path2D(); segs.forEach(s => { p.moveTo(s.p[0][0], s.p[0][1]); p.lineTo(s.p[1][0], s.p[1][1]); }); ctx.stroke(p); }
    ctx.restore();
  };
})();
