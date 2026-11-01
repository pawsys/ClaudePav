// grabbygrab drawn in light. Same identity as v1 (bean body, one noodle arm, 3-finger mitten + thumb,
// two little feet) but the material is light: a tapered light-pen contour (one continuous line that
// overshoots its start, like a hand-drawn loop), translucent capsules for the hand, eyes as the
// strongest marks. GL shaders get the same body ellipse / knot circle as uniforms (CH.uniforms).
(function () {
  const TAU = Math.PI * 2;
  const E = window.ENGINE;
  const hs = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const CH = {};

  // ------------------------------------------------------------------ geometry
  // o: {cx, cy, s, squash, boil (seed int), amp, arm:{tx,ty,ext,open,ang,stagger}, eyes, mouth, look, sweat, blush}
  CH.pose = function (t, o) {
    const s = o.s, sq = o.squash || 0;
    const cx = o.cx, cy = o.cy;
    const bw = 0.62 * s * (1 + sq), bh = 0.7 * s * (1 - sq);
    const bf = o.boil ?? 0, amp = o.amp ?? 1.6;
    // body contour: one line, starts at upper-left, goes round 1.06 turns (overlap = hand-drawn loop)
    const N = 140, a0 = -2.25, body = [];
    for (let i = 0; i <= N * 1.07; i++) {
      const a = a0 + i / N * TAU;
      const wob = amp * (Math.sin(a * 3 + bf * 1.7) * 0.6 + Math.sin(a * 7 - bf * 2.3) * 0.4 + Math.sin(a * 13 + bf * 0.9) * 0.25);
      const over = i > N ? (i - N) / (N * 0.07) * 0.035 : 0;      // the overshoot drifts slightly outward
      const lean = 1 + 0.025 * Math.cos(2 * a + 0.4);              // bean, not ellipse
      body.push([cx + Math.cos(a) * (bw * lean + wob) * (1 + over), cy + Math.sin(a) * (bh * (Math.sin(a) > 0 ? 0.985 : 1) + wob) * (1 + over * 0.6)]);
    }
    // arm
    const sh = [cx + 0.47 * bw, cy + 0.06 * bh];
    const arm = o.arm || { ext: 0, open: 0.3 };
    const rest = [cx + 0.92 * bw, cy + 0.42 * bh];
    const e = E.clamp(arm.ext ?? 0);
    const hx = E.lerp(rest[0], arm.tx ?? rest[0], e), hy = E.lerp(rest[1], arm.ty ?? rest[1], e);
    const hang = arm.ang ?? Math.atan2(hy - sh[1], hx - sh[0]);
    const dist = Math.hypot(hx - sh[0], hy - sh[1]);
    const sag = (arm.sag ?? ((1 - e) * 0.25 + 0.1)) * s;
    const p1 = [sh[0] + dist * 0.3, sh[1] + sag], p2 = [hx - Math.cos(hang) * dist * 0.3, hy - Math.sin(hang) * dist * 0.3 + sag * 0.5];
    const armC = [];
    for (let i = 0; i <= 28; i++) {
      const u = i / 28, v = 1 - u;
      armC.push([v * v * v * sh[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * hx,
        v * v * v * sh[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * hy]);
    }
    const feet = [[cx - 0.22 * s, cy + 0.675 * s], [cx + 0.22 * s, cy + 0.675 * s]];
    return { t, o, s, cx, cy, bw, bh, body, sh, armC, armW: 0.11 * s, hand: [hx, hy], hang, open: arm.open ?? 0.3, stagger: arm.stagger || 0, feet };
  };

  // mitten capsules (palm ellipse + 3 fingers + thumb), in canvas coords. hs = hand scale (v1: 0.55*s)
  CH.mittenShapes = function (x, y, ang, hsz, open, stagger = 0) {
    const out = [];
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const T = (px, py) => [x + px * ca - py * sa, y + px * sa + py * ca];
    out.push({ kind: 'ell', c: [x, y], rx: 0.30 * hsz, ry: 0.27 * hsz, rot: ang });
    for (let i = 0; i < 3; i++) {
      const o = E.smoother(E.clamp((open - i * stagger) / Math.max(0.001, 1 - 2 * stagger)));
      const a = (i - 1) * (0.55 * o + 0.42 * (1 - o));
      const L = (0.02 + 0.38 * o) * hsz;
      const r = 0.085 * hsz;
      const a0 = [0.16 * hsz + r, 0], a1 = [0.16 * hsz + L + 0.12 * hsz - r, 0];
      const R = (p) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
      out.push({ kind: 'cap', a: T(...R(a0)), b: T(...R(a1)), r, open: o, fi: i });
    }
    const ot = E.smoother(E.clamp((open - 3 * stagger) / Math.max(0.001, 1 - 2 * stagger)));
    const ta = -1.2 - 0.4 * ot, tr = 0.07 * hsz;
    const R = (p) => [p[0] * Math.cos(ta) - p[1] * Math.sin(ta), p[0] * Math.sin(ta) + p[1] * Math.cos(ta)];
    out.push({ kind: 'cap', a: T(...R([0.08 * hsz + tr, 0])), b: T(...R([(0.24 + 0.12 * ot) * hsz - tr, 0])), r: tr, open: ot, fi: 3 });
    return out;
  };
  CH.shapePath = function (sh, grow = 0) {
    const p = new Path2D();
    if (sh.kind === 'ell') p.ellipse(sh.c[0], sh.c[1], sh.rx + grow, sh.ry + grow, sh.rot, 0, TAU);
    else {
      const dx = sh.b[0] - sh.a[0], dy = sh.b[1] - sh.a[1], an = Math.atan2(dy, dx), r = sh.r + grow;
      p.arc(sh.a[0], sh.a[1], r, an + Math.PI / 2, an + Math.PI * 1.5);
      p.arc(sh.b[0], sh.b[1], r, an - Math.PI / 2, an + Math.PI / 2);
      p.closePath();
    }
    return p;
  };

  // tapered brush polygon along a polyline (pressure: sin taper + slight wobble)
  CH.brush = function (pts, w, seed = 0, taper = 0.5, minW = 0.18) {
    const n = pts.length, Lp = [], Rp = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const u = i / (n - 1);
      const pres = Math.pow(Math.sin(Math.PI * u), taper) * (0.85 + 0.15 * Math.sin(u * 11 + seed * 3.1));
      const hw = w * 0.5 * Math.max(minW, pres);
      Lp.push([pts[i][0] - dy * hw, pts[i][1] + dx * hw]); Rp.push([pts[i][0] + dy * hw, pts[i][1] - dx * hw]);
    }
    const p = new Path2D();
    Lp.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]));
    for (let i = Rp.length - 1; i >= 0; i--) p.lineTo(Rp[i][0], Rp[i][1]);
    p.closePath();
    return p;
  };
  CH.poly = function (pts, closed) { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); if (closed) p.closePath(); return p; };
  // offset a polyline by d along its normal
  CH.offset = function (pts, d) {
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1;
      out.push([pts[i][0] - dy / l * d, pts[i][1] + dx / l * d]);
    }
    return out;
  };

  // ------------------------------------------------------------------ drawing
  // st: {line:'#fff4e0' core colour, halo:'#ff8a1f' glow colour, fill: [colour, alpha] translucent body wash,
  //      lw: contour core width, ink:'#1a0b4a' face colour, eyesLight:bool, handFill, handHalo, op}
  // Glow shapes (wide halos) are queued into `glowQ` (drawn once per frame through LX.glow2d).
  CH.draw = function (ctx, G, st, glowQ) {
    if (window.DBG_NOCHAR) glowQ = null;
    const s = G.s, lw = st.lw ?? Math.max(4, s * 0.02);
    const bodyPoly = CH.poly(G.body.slice(0, 141), true);
    // translucent wash (behind everything)
    if (st.fill) {
      ctx.save();
      ctx.globalCompositeOperation = st.fillOp || 'screen';
      const g = ctx.createRadialGradient(G.cx - G.bw * 0.25, G.cy - G.bh * 0.35, G.bw * 0.1, G.cx, G.cy, G.bh * 1.05);
      g.addColorStop(0, LX.rgba(st.fill[0], st.fill[1] * 1.25)); g.addColorStop(0.75, LX.rgba(st.fill[0], st.fill[1])); g.addColorStop(1, LX.rgba(st.fill[0], st.fill[1] * 0.6));
      ctx.fillStyle = g; ctx.fill(bodyPoly);
      ctx.restore();
    }
    const contour = CH.brush(G.body, lw * 2.0, 3, 0.35, 0.22);
    // feet: small light arcs under the body
    const feet = G.feet.map(([fx, fy], k) => {
      const pts = []; for (let i = 0; i <= 16; i++) { const a = Math.PI * (0.05 + 0.9 * i / 16) + (k ? -0.15 : 0.15); pts.push([fx + Math.cos(a) * 0.12 * s, fy + Math.sin(a) * 0.065 * s]); }
      return CH.brush(pts, lw * 1.6, k + 9, 0.4, 0.3);
    });
    // arm tube: two light lines + translucent fill
    const aL = CH.offset(G.armC, G.armW / 2), aR = CH.offset(G.armC, -G.armW / 2);
    const armFill = new Path2D(); aL.forEach((q, i) => i ? armFill.lineTo(q[0], q[1]) : armFill.moveTo(q[0], q[1])); for (let i = aR.length - 1; i >= 0; i--) armFill.lineTo(aR[i][0], aR[i][1]); armFill.closePath();
    const armLines = [CH.brush(aL, lw * 1.5, 5, 0.3, 0.35), CH.brush(aR, lw * 1.5, 6, 0.3, 0.35)];
    // hand
    const hsz = 0.55 * s;
    const shapes = CH.mittenShapes(G.hand[0], G.hand[1], G.hang, hsz * (st.handScale || 1), G.open, G.stagger);
    const hPaths = shapes.map(sh => CH.shapePath(sh));

    if (glowQ) glowQ.push(g => {
      const gw = st.glowW ?? 5;
      g.strokeStyle = st.halo; g.lineWidth = lw * gw; g.stroke(bodyPoly);
      g.fillStyle = st.halo; feet.forEach(f => g.fill(f));
      g.lineWidth = lw * gw * 0.8; g.stroke(CH.poly(aL)); g.stroke(CH.poly(aR));
    });
    ctx.save();
    ctx.globalCompositeOperation = st.op || 'lighter';
    // arm wash + lines (clipped out of the body: the arm starts at his edge)
    ctx.save();
    const outside = new Path2D(); outside.rect(0, 0, 1080, 1350); outside.addPath(bodyPoly);
    ctx.clip(outside, 'evenodd');
    ctx.fillStyle = LX.rgba(st.handFill || st.fill[0], st.armAlpha ?? 0.14); ctx.fill(armFill);
    ctx.fillStyle = st.line; armLines.forEach(p => ctx.fill(p));
    ctx.restore();
    // body contour + feet
    ctx.fillStyle = st.line; ctx.fill(contour); feet.forEach(f => ctx.fill(f));
    ctx.restore();
    return { shapes, hPaths, lw };
  };
  // the hand is drawn separately so a held object can sit between body and hand.
  // Union silhouette: outline only on the outside, faint internal finger lines, one translucent fill.
  CH.silhouette = function (ctx, paths, bbox, o, glowQ) {
    const pad = 40, x0 = Math.floor(bbox[0] - pad), y0 = Math.floor(bbox[1] - pad);
    const w = Math.ceil(bbox[2] - bbox[0] + 2 * pad), h = Math.ceil(bbox[3] - bbox[1] + 2 * pad);
    const [c, g] = LX.scratch('sil', w, h);
    g.clearRect(0, 0, w, h); g.translate(-x0, -y0); g.lineJoin = 'round'; g.lineCap = 'round';
    const U = new Path2D(); paths.forEach(p => U.addPath(p));
    g.strokeStyle = o.line; g.lineWidth = o.lw * 2; paths.forEach(p => g.stroke(p));
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; paths.forEach(p => g.fill(p));
    g.globalCompositeOperation = 'source-over';
    if (o.inner) { g.save(); g.clip(U); g.globalAlpha = o.inner; g.lineWidth = o.lw * 0.7; paths.forEach(p => g.stroke(p)); g.restore(); }
    if (glowQ && o.halo) glowQ.push(gg => { gg.save(); gg.globalAlpha = o.haloA ?? 1; gg.drawImage(c, x0, y0); gg.restore(); });
    if (o.fill) { g.globalCompositeOperation = 'destination-over'; g.fillStyle = o.fill; g.fill(U); }
    if (o.fillFn) { g.globalCompositeOperation = 'destination-over'; o.fillFn(g, U); }
    ctx.save(); ctx.globalCompositeOperation = o.op || 'source-over'; ctx.drawImage(c, x0, y0); ctx.restore();
  };
  CH.shapesBBox = function (shapes) {
    let b = [1e9, 1e9, -1e9, -1e9];
    shapes.forEach(sh => {
      const pts = sh.kind === 'ell' ? [[sh.c[0] - sh.rx, sh.c[1] - sh.rx], [sh.c[0] + sh.rx, sh.c[1] + sh.rx]] : [[sh.a[0] - sh.r, sh.a[1] - sh.r], [sh.a[0] + sh.r, sh.a[1] + sh.r], [sh.b[0] - sh.r, sh.b[1] - sh.r], [sh.b[0] + sh.r, sh.b[1] + sh.r]];
      pts.forEach(p => { b[0] = Math.min(b[0], p[0]); b[1] = Math.min(b[1], p[1]); b[2] = Math.max(b[2], p[0]); b[3] = Math.max(b[3], p[1]); });
    });
    return b;
  };
  CH.drawHand = function (ctx, H, st, glowQ) {
    CH.silhouette(ctx, H.hPaths, CH.shapesBBox(H.shapes), {
      line: st.line, lw: H.lw * 0.75, inner: 0.35, fill: LX.rgba(st.handFill || st.fill[0], st.handAlpha ?? 0.26),
      halo: true, haloA: 0.8,
    }, glowQ);
  };

  // face: eyes are the strongest marks. ink colour on bright bodies, or white-hot on dark ones.
  CH.face = function (ctx, G, st, glowQ) {
    const o = G.o, s = G.s;
    const lk = o.look || [0, 0];
    const ex = G.cx + lk[0] * 0.08 * s, ey = G.cy - 0.12 * s + lk[1] * 0.06 * s;
    const eyes = o.eyes || 'dots';
    const ink = st.ink || '#1a0b4a';
    const w = Math.max(5, s * 0.036);
    const marks = new Path2D(), dots = new Path2D();
    [-1, 1].forEach(sd => {
      const x = ex + sd * 0.2 * s;
      if (eyes === 'squeeze') {
        const ww = 0.08 * s, hh = 0.065 * s;
        marks.moveTo(x + sd * ww, ey - hh); marks.lineTo(x - sd * ww * 0.6, ey); marks.lineTo(x + sd * ww, ey + hh);
      } else if (eyes === 'happy') {
        marks.moveTo(x + 0.07 * s, ey + 0.03 * s); marks.arc(x, ey + 0.03 * s, 0.07 * s, 0, Math.PI, true);
      } else if (eyes === 'closed') {
        marks.moveTo(x - 0.065 * s, ey); marks.arc(x, ey - 0.01 * s, 0.065 * s, Math.PI, 0, true);
        marks.moveTo(x - 0.065 * s, ey); marks.arc(x, ey - 0.03 * s, 0.065 * s, Math.PI * 0.95, Math.PI * 0.05, true);
      } else {
        const r = (eyes === 'big' ? 0.1 : 0.074) * s;
        dots.ellipse(x, ey, r * 0.82, r * 1.12, 0, 0, TAU);
      }
      if (eyes === 'worried') { marks.moveTo(x - sd * 0.11 * s, ey - 0.2 * s); marks.lineTo(x + sd * 0.05 * s, ey - 0.155 * s); }
    });
    const mouth = o.mouth || (eyes === 'squeeze' ? 'zigzag' : 'smile');
    const my = ey + 0.15 * s;
    if (mouth === 'zigzag') { const mw = 0.075 * s; marks.moveTo(ex - mw, my); for (let k = 1; k <= 4; k++) marks.lineTo(ex - mw + k * mw / 2, my + (k % 2 ? -0.025 : 0.025) * s); }
    else if (mouth === 'smile') { marks.moveTo(ex - 0.06 * s * Math.cos(0.15 * Math.PI) + 0, my - 0.05 * s + 0.06 * s * Math.sin(0.15 * Math.PI)); marks.arc(ex, my - 0.05 * s, 0.06 * s, 0.15 * Math.PI, 0.85 * Math.PI); }
    else if (mouth === 'open') { dots.ellipse(ex, my - 0.005 * s, 0.05 * s, 0.045 * s, 0, 0, TAU); }
    else if (mouth === 'grin') { dots.moveTo(ex - 0.085 * s, my - 0.04 * s); dots.quadraticCurveTo(ex, my - 0.06 * s, ex + 0.085 * s, my - 0.04 * s); dots.quadraticCurveTo(ex + 0.07 * s, my + 0.075 * s, ex, my + 0.08 * s); dots.quadraticCurveTo(ex - 0.07 * s, my + 0.075 * s, ex - 0.085 * s, my - 0.04 * s); }
    else if (mouth === 'o') { dots.ellipse(ex, my, 0.035 * s, 0.045 * s, 0, 0, TAU); }
    else if (mouth === 'wobble') { marks.moveTo(ex - 0.06 * s, my); marks.bezierCurveTo(ex - 0.03 * s, my - 0.03 * s, ex + 0.0 * s, my + 0.03 * s, ex + 0.06 * s, my - 0.01 * s); }
    if (st.faceGlow && glowQ) glowQ.push(g => { g.strokeStyle = st.faceGlow; g.lineWidth = w * 3; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(marks); g.fillStyle = st.faceGlow; g.fill(dots); });
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = ink; ctx.lineWidth = w; ctx.stroke(marks);
    ctx.fillStyle = ink; ctx.fill(dots);
    // catch-lights on dot eyes (tiny white sparks: he is made of light, even his pupils)
    if (eyes === 'dots' || eyes === 'big' || eyes === 'worried') {
      ctx.fillStyle = st.catch || '#ffffff';
      [-1, 1].forEach(sd => { const x = ex + sd * 0.2 * s; ctx.beginPath(); ctx.arc(x - 0.022 * s, ey - 0.035 * s, 0.021 * s, 0, TAU); ctx.fill(); });
    }
    // blush: two soft rose light dabs
    if (o.blush) {
      ctx.globalCompositeOperation = 'lighter';
      [-1, 1].forEach(sd => {
        const bx = ex + sd * 0.34 * s, by = ey + 0.1 * s;
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, 0.085 * s);
        g.addColorStop(0, LX.rgba(st.blushCol || '#ff5fa2', 0.55 * o.blush)); g.addColorStop(1, LX.rgba(st.blushCol || '#ff5fa2', 0));
        ctx.fillStyle = g; ctx.fillRect(bx - 0.1 * s, by - 0.1 * s, 0.2 * s, 0.2 * s);
      });
    }
    // sweat drop of cyan light
    if (o.sweat) {
      const dx = G.cx - 0.5 * G.bw, dy = G.cy - 0.42 * G.bh;
      const p = new Path2D();
      p.moveTo(dx, dy - 0.1 * s); p.quadraticCurveTo(dx + 0.06 * s, dy, dx, dy + 0.045 * s); p.quadraticCurveTo(dx - 0.06 * s, dy, dx, dy - 0.1 * s);
      if (glowQ) glowQ.push(g => { g.fillStyle = '#3df5ff'; g.fill(p); g.strokeStyle = '#3df5ff'; g.lineWidth = 0.05 * s; g.stroke(p); });
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(61,245,255,0.35)'; ctx.fill(p);
      ctx.strokeStyle = '#e8feff'; ctx.lineWidth = Math.max(3, 0.012 * s); ctx.stroke(p);
    }
    ctx.restore();
  };

  window.CH = CH;
})();
