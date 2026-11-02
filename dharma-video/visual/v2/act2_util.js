// ACT 2 (18 to 36) shared helpers. Everything lives in window.a2_NS (the a2_ prefix rule, LOOK 5.6).
// Pure functions of their inputs: no Math.random, no performance.now, no state between frames.
(function () {
  const V2 = window.V2, U = V2.U;
  const { clamp, lerp, hash, TAU } = U;
  const A = window.a2_NS = window.a2_NS || {};
  A.U = U;

  // ------------------------------------------------------------------ easing and envelopes
  A.ease = {
    outExpo: U.outExpo, inOutSine: U.inOutSine, outCubic: U.outCubic, inCubic: U.inCubic, inOutCubic: U.inOutCubic, smooth: U.smooth, smoother: U.smoother,
    outBack: U.outBack, outQuad: t => { t = clamp(t); return 1 - (1 - t) * (1 - t); }, inQuad: t => { t = clamp(t); return t * t; },
  };
  A.range = U.range;
  // frame-snapped step: 0 before t0's frame, 1 from it (a 1-frame switch, LOOK 2.9 "the beam switches on in one frame")
  A.step = (t, t0) => (Math.round(t * 30) >= Math.round(t0 * 30) ? 1 : 0);
  // symmetric pulse 0 -> 1 -> 0 between a and b (smooth ends)
  A.bump = (t, a, b, e = 0.25) => { const u = clamp((t - a) / (b - a)); return U.smooth(u / e) * U.smooth((1 - u) / e); };

  // ------------------------------------------------------------------ variable-width brush (light-pen lines)
  // pts [[x,y]...], ws per-point full widths -> Path2D polygon
  A.vbrush = function (pts, ws) {
    const n = pts.length; if (n < 2) return new Path2D();
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const hw = ws[i] * 0.5;
      L.push([pts[i][0] - dy * hw, pts[i][1] + dx * hw]); R.push([pts[i][0] + dy * hw, pts[i][1] - dx * hw]);
    }
    const p = new Path2D();
    L.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]));
    for (let i = n - 1; i >= 0; i--) p.lineTo(R[i][0], R[i][1]);
    p.closePath();
    return p;
  };
  A.poly = (pts, closed) => V2.P.path(pts, closed);

  // ------------------------------------------------------------------ hand parts (screen space) for the macro hand
  // From a core V2.grab.handGeo h (+ optional extra capsules, e.g. the forearm) build analytic parts:
  //   {k:'box', c, hx, hy, r, ca, sa} (rounded box, local x along the hand) | {k:'cap', a, b, r}
  A.handParts = function (h, extra = []) {
    const parts = [{ k: 'box', c: h.palm.c, hx: h.palm.hx, hy: h.palm.hy, r: h.palm.r, ca: Math.cos(h.ang), sa: Math.sin(h.ang), name: 'palm' }];
    h.caps.forEach(c => parts.push({ k: 'cap', a: c.a, b: c.b, r: c.r, name: c.k, e: c.e }));
    extra.forEach(c => parts.push(Object.assign({ k: 'cap' }, c)));
    return parts;
  };
  const sdBoxL = (lx, ly, bx, by, r) => { const qx = Math.abs(lx) - bx + r, qy = Math.abs(ly) - by + r; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
  A.sdPart = function (p, x, y) {
    if (p.k === 'box') { const dx = x - p.c[0], dy = y - p.c[1]; return sdBoxL(dx * p.ca + dy * p.sa, -dx * p.sa + dy * p.ca, p.hx, p.hy, p.r); }
    const ax = p.a[0], ay = p.a[1], bx = p.b[0] - ax, by = p.b[1] - ay, px = x - ax, py = y - ay;
    const hh = clamp((px * bx + py * by) / Math.max(bx * bx + by * by, 1e-4));
    return Math.hypot(px - bx * hh, py - by * hh) - p.r;
  };
  A.sdHand = (parts, x, y) => { let d = 1e9; for (const p of parts) d = Math.min(d, A.sdPart(p, x, y)); return d; };
  // outline samples of one part: [{x, y, nx, ny, s (arc length)}], closed loop, about `step` px apart
  function partOutline(p, step) {
    const out = [];
    if (p.k === 'cap') {
      const dx = p.b[0] - p.a[0], dy = p.b[1] - p.a[1], L = Math.hypot(dx, dy), an = L > 0.5 ? Math.atan2(dy, dx) : 0;
      const ux = Math.cos(an), uy = Math.sin(an);
      // half circle at b (from -90 to +90 around the axis), straight side, half circle at a, straight side
      const arcN = Math.max(6, Math.ceil(Math.PI * p.r / step)), linN = Math.max(1, Math.ceil(L / step));
      let s = 0; const push = (x, y, nx, ny, ds) => { out.push({ x, y, nx, ny, s }); s += ds; };
      for (let i = 0; i < arcN; i++) { const a = an - Math.PI / 2 + Math.PI * i / arcN; push(p.b[0] + Math.cos(a) * p.r, p.b[1] + Math.sin(a) * p.r, Math.cos(a), Math.sin(a), Math.PI * p.r / arcN); }
      for (let i = 0; i < linN; i++) { const f = 1 - i / linN; push(p.a[0] + dx * f - uy * p.r, p.a[1] + dy * f + ux * p.r, -uy, ux, L / linN); }
      for (let i = 0; i < arcN; i++) { const a = an + Math.PI / 2 + Math.PI * i / arcN; push(p.a[0] + Math.cos(a) * p.r, p.a[1] + Math.sin(a) * p.r, Math.cos(a), Math.sin(a), Math.PI * p.r / arcN); }
      for (let i = 0; i < linN; i++) { const f = i / linN; push(p.a[0] + dx * f + uy * p.r, p.a[1] + dy * f - ux * p.r, uy, -ux, L / linN); }
      return out;
    }
    // rounded box in local coords: 4 straight sides + 4 quarter arcs
    const { hx, hy, r, ca, sa } = p;
    const toS = (lx, ly) => [p.c[0] + lx * ca - ly * sa, p.c[1] + lx * sa + ly * ca];
    const toN = (nx, ny) => [nx * ca - ny * sa, nx * sa + ny * ca];
    let s = 0;
    const corners = [[hx - r, hy - r, 0], [-(hx - r), hy - r, Math.PI / 2], [-(hx - r), -(hy - r), Math.PI], [hx - r, -(hy - r), Math.PI * 1.5]];
    corners.forEach(([cx, cy, a0], k) => {
      const an = Math.max(3, Math.ceil(Math.PI / 2 * r / step));
      for (let i = 0; i < an; i++) { const a = a0 + Math.PI / 2 * i / an; const q = toS(cx + Math.cos(a) * r, cy + Math.sin(a) * r), n = toN(Math.cos(a), Math.sin(a)); out.push({ x: q[0], y: q[1], nx: n[0], ny: n[1], s }); s += Math.PI / 2 * r / an; }
      // straight side to the next corner
      const nx0 = corners[(k + 1) % 4];
      const a1 = a0 + Math.PI / 2; const sx = cx + Math.cos(a1) * r, sy = cy + Math.sin(a1) * r, ex = nx0[0] + Math.cos(a1) * r, ey = nx0[1] + Math.sin(a1) * r;
      const L = Math.hypot(ex - sx, ey - sy), ln = Math.max(1, Math.ceil(L / step));
      for (let i = 0; i < ln; i++) { const f = i / ln; const q = toS(lerp(sx, ex, f), lerp(sy, ey, f)), n = toN(Math.cos(a1), Math.sin(a1)); out.push({ x: q[0], y: q[1], nx: n[0], ny: n[1], s }); s += L / ln; }
    });
    return out;
  }
  // the union outline of the parts as runs of visible samples (a point is visible if no other part covers it)
  // returns [{part, pts:[{x,y,nx,ny,s}]}]
  A.unionOutline = function (parts, step = 6, o = {}) {
    const runs = [];
    parts.forEach((p, i) => {
      if (o.skip && o.skip(p, i)) return;
      const ol = partOutline(p, step);
      const vis = ol.map(q => { for (let j = 0; j < parts.length; j++) { if (j === i) continue; if (A.sdPart(parts[j], q.x, q.y) < -0.5) return false; } return !(o.hide && o.hide(q)); });
      const n = ol.length; let st = vis.indexOf(false);
      if (st < 0) { runs.push({ part: i, pts: ol.concat([ol[0]]), closed: true }); return; }
      let cur = null;
      for (let k = 1; k <= n; k++) {
        const idx = (st + k) % n;
        if (vis[idx]) { if (!cur) cur = { part: i, pts: [] }; cur.pts.push(ol[idx]); }
        else if (cur) { if (cur.pts.length > 1) runs.push(cur); cur = null; }
      }
      if (cur && cur.pts.length > 1) runs.push(cur);
    });
    return runs;
  };
  // HAND_SDF uniforms from a handGeo (screen space) with an optional extra capsule in the spare slot (the forearm)
  A.handUniforms = function (h, spare, on = 1) {
    const Aa = new Float32Array(24), R = new Float32Array(6);
    h.caps.forEach((c, i) => { Aa.set([c.a[0], c.a[1], c.b[0], c.b[1]], i * 4); R[i] = c.r; });
    if (spare) { Aa.set([spare.a[0], spare.a[1], spare.b[0], spare.b[1]], 20); R[5] = spare.r; }
    return {
      uPalm: [h.palm.c[0], h.palm.c[1], h.palm.hx, h.palm.hy], uPalmR: [Math.cos(h.ang), Math.sin(h.ang), h.palm.r, on],
      uFingA: { v4: Aa }, uFingR: { v1: R },
    };
  };
  // transform a handGeo by a screen camera (s = J + (p - J) * k)
  A.camHand = function (h, J, k) {
    const T = p => [J[0] + (p[0] - J[0]) * k, J[1] + (p[1] - J[1]) * k];
    return Object.assign({}, h, {
      x: T([h.x, h.y])[0], y: T([h.x, h.y])[1], hs: h.hs * k,
      palm: Object.assign({}, h.palm, { c: T(h.palm.c), hx: h.palm.hx * k, hy: h.palm.hy * k, r: h.palm.r * k }),
      caps: h.caps.map(c => Object.assign({}, c, { a: T(c.a), b: T(c.b), r: c.r * k })),
      crease: h.crease.map(T), thumbEdge: (h.thumbEdge || []).map(T), seps: (h.seps || []).map(s => Object.assign({}, s, { p: s.p.map(T) })),
    });
  };

  // ------------------------------------------------------------------ light-pen contour of a union (boiling, lit-weighted)
  // runs from A.unionOutline; o: {w, core, halo, lit(q) -> 0..1 weight, floor (min weight), seed, wob px, ga, gw, alpha}
  A.drawContour = function (ctx, runs, o = {}) {
    const w = o.w ?? 6, wob = o.wob ?? 1.5, seed = o.seed ?? 0, A0 = o.alpha ?? 1;
    const ph1 = hash(seed * 1.31 + 0.2) * TAU, ph2 = hash(seed * 2.17 + 0.7) * TAU;
    const paths = [], halos = [];
    runs.forEach(r => {
      const pts = [], ws = [];
      r.pts.forEach((q, i) => {
        const b = wob * (Math.sin(q.s * 0.013 + ph1 + r.part * 1.7) * 0.7 + Math.sin(q.s * 0.031 + ph2) * 0.3);
        pts.push([q.x + q.nx * b, q.y + q.ny * b]);
        const lw = o.lit ? clamp(o.lit(q)) : 1;
        ws.push(w * lerp(o.floor ?? 0.25, 1, lw));
      });
      // taper the run ends (a drawn line lifts off)
      const n = ws.length, tl = Math.min(6, Math.floor(n / 3));
      if (!r.closed) for (let i = 0; i < tl; i++) { const f = 0.35 + 0.65 * (i / tl); ws[i] *= f; ws[n - 1 - i] *= f; }
      paths.push(A.vbrush(pts, ws));
      halos.push({ p: V2.P.path(pts), ws });
    });
    if (o.halo && (o.ga ?? 0.6) > 0) V2.glow(g => { g.globalAlpha = (o.ga ?? 0.6) * A0; g.strokeStyle = o.halo; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = o.gw ?? w * 3; halos.forEach(h => g.stroke(h.p)); });
    ctx.save(); ctx.globalAlpha = A0; ctx.globalCompositeOperation = o.op || 'source-over'; ctx.fillStyle = o.core || '#FFFFFF';
    paths.forEach(p => ctx.fill(p));
    ctx.restore();
    return paths;
  };

  // ------------------------------------------------------------------ mono with a dark outline (tags on bright sky)
  A.monoOutlined = function (ctx, text, x, y, o = {}) {
    const size = o.size ?? 38, f = `${o.weight || '500'} ${size}px "JBM"`;
    ctx.save(); ctx.font = f; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    const w = ctx.measureText(text).width;
    const x0 = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
    ctx.globalAlpha = o.a ?? 1;
    if (o.outline !== false) { ctx.strokeStyle = o.outline || '#0B2A7A'; ctx.lineWidth = o.ow ?? 7; ctx.strokeText(text, x0, y); }
    ctx.fillStyle = o.col || '#FFFFFF'; ctx.fillText(text, x0, y);
    ctx.restore();
    return [x0, y - size * 0.8, x0 + w, y + size * 0.25];
  };

  // ------------------------------------------------------------------ ripple ring of light (heals within `life` frames)
  A.ripple = function (ctx, t, x, y, t0, o = {}) {
    const life = o.life ?? 10, k = (Math.round(t * 30) - Math.round(t0 * 30)) / life;
    if (k < 0 || k >= 1) return;
    const R = (o.r ?? 150) * U.outCubic(k), a = (1 - k) * (o.a ?? 0.9);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = o.col || '#FFFFFF';
    for (let j = 0; j < 2; j++) { const rr = R * (1 - j * 0.28); if (rr < 4) continue; ctx.globalAlpha = a * (1 - j * 0.4); ctx.lineWidth = lerp(5, 2.5, k) * (1 - j * 0.3); ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.86, 0, 0, TAU); ctx.stroke(); }
    ctx.restore();
    V2.glow(g => { g.globalAlpha = a * 0.6; g.strokeStyle = o.halo || '#FF9ACB'; g.lineWidth = 12; g.beginPath(); g.ellipse(x, y, Math.max(2, R), Math.max(2, R * 0.86), 0, 0, TAU); g.stroke(); });
  };
})();
