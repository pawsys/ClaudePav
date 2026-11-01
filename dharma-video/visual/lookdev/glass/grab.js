// grabbygrab as GLASS: same bean / noodle arm / 3-finger mitten + thumb as v1, but a translucent coloured body
// (the GL pass refracts the world inside his ellipse), inner overlapping colour lobes, a white-hot contour line with a
// prism fringe, a specular streak, a caustic crescent, and a deep-indigo "lead came" face.
// The dukkha knot: an opaque heavy dark tangle with a chromatically split neon edge (12 Hz jitter). As it opens it
// cracks, and turns out to be glass: a faceted jewel that lets the light through.
(function () {
  const W = 1080, H = 1350, TAU = Math.PI * 2;
  const { clamp, lerp, hash, rgba } = G;
  const GG = {};
  const INK = '#1B1240';

  // ---------------------------------------------------------------- geometry
  GG.geo = function (t, cx, cy, s, o = {}) {
    const sq = o.squash || 0;
    const bob = (o.bob ?? 0) * Math.sin(TAU * 4 * t / 3) * 0.02 * s;   // 80 bpm bob (loop-safe: 80 cycles / 60 s)
    const bw = 0.62 * s * (1 + sq), bh = 0.70 * s * (1 - sq);
    const bx = cx, by = cy + bob;
    const feet = [[cx - 0.22 * s, cy + 0.665 * s], [cx + 0.22 * s, cy + 0.665 * s]];
    const sh = [bx + 0.47 * bw, by + 0.08 * bh];
    const arm = o.arm || { ext: 0, open: 0.3 };
    const rest = [bx + 0.95 * bw, by + 0.42 * bh];
    const e = clamp(arm.ext ?? 0);
    const hx = lerp(rest[0], arm.tx ?? rest[0], e), hy = lerp(rest[1], arm.ty ?? rest[1], e);
    const hang = arm.ang ?? Math.atan2(hy - sh[1], hx - sh[0]);
    const dist = Math.hypot(hx - sh[0], hy - sh[1]);
    const sag = (arm.sag ?? ((1 - e) * 0.25 + 0.1)) * s;
    const p1 = [sh[0] + dist * 0.3, sh[1] + sag], p2 = [hx - Math.cos(hang) * dist * 0.3, hy - Math.sin(hang) * dist * 0.3 + sag * 0.5];
    const armPath = new Path2D(); armPath.moveTo(sh[0], sh[1]); armPath.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], hx, hy);
    const body = new Path2D(); body.ellipse(bx, by, bw, bh, 0, 0, TAU);
    const feetP = feet.map(([fx, fy]) => { const p = new Path2D(); p.ellipse(fx, fy, 0.125 * s, 0.07 * s, 0, 0, TAU); return p; });
    const mit = GG.mittenShapes(hx, hy, hang, 0.55 * s, arm.open ?? 0.3, arm.stagger || 0);
    return { t, s, bx, by, bw, bh, feet, feetP, sh, hand: [hx, hy], hang, armPath, armW: 0.11 * s, body, mit, o };
  };

  // mitten: palm + 3 fingers + thumb as Path2Ds in canvas space
  GG.mittenShapes = function (x, y, ang, s, open, stagger = 0) {
    const sm = t => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
    const M = new DOMMatrix().translate(x, y).rotate(ang * 180 / Math.PI);
    const out = [];
    const add = (fn, rot = 0) => { const p = new Path2D(); fn(p); const q = new Path2D(); q.addPath(p, M.rotate(rot * 180 / Math.PI)); out.push(q); };
    add(p => p.ellipse(0, 0, 0.30 * s, 0.27 * s, 0, 0, TAU));
    const fingers = [];
    for (let i = 0; i < 3; i++) {
      const o = sm((open - i * stagger) / Math.max(0.001, 1 - 2 * stagger));
      const a = (i - 1) * (0.55 * o + 0.42 * (1 - o));
      const L = (0.02 + 0.38 * o) * s;
      add(p => p.roundRect(0.16 * s, -0.085 * s, L + 0.12 * s, 0.17 * s, 0.085 * s), a);
      fingers.push({ a, L, tip: M.rotate(a * 180 / Math.PI).transformPoint(new DOMPoint(0.16 * s + L + 0.12 * s, 0)) });
    }
    const ot = sm((open - 3 * stagger) / Math.max(0.001, 1 - 2 * stagger));
    add(p => p.roundRect(0.08 * s, -0.07 * s, (0.16 + 0.12 * ot) * s, 0.14 * s, 0.07 * s), -1.2 - 0.4 * ot);
    out.fingers = fingers; out.open = open; out.M = M; out.s = s; out.x = x; out.y = y; out.ang = ang;
    return out;
  };

  // union outline mask of a set of shapes on a scratch canvas (outside-aligned line of width lw), optional scale k
  // shapes: [{p:Path2D, tube:width|0}]
  GG.outline = function (key, box, shapes, lw, col, k = 1) {
    const x0 = Math.floor(box[0] - lw - 4), y0 = Math.floor(box[1] - lw - 4);
    const w = Math.ceil((box[2] - box[0] + 2 * lw + 8) * k), h = Math.ceil((box[3] - box[1] + 2 * lw + 8) * k);
    const [c, g] = LX.scratch(key, Math.max(2, w), Math.max(2, h));
    g.clearRect(0, 0, c.width, c.height); g.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
    g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = col; g.fillStyle = col;
    for (const s of shapes) { if (s.tube) { g.lineWidth = s.tube + 2 * lw; g.stroke(s.p); } else { g.lineWidth = 2 * lw; g.stroke(s.p); } }
    g.globalCompositeOperation = 'destination-out';
    for (const s of shapes) { if (s.tube) { g.lineWidth = s.tube; g.stroke(s.p); } else g.fill(s.p); }
    return { c, x: x0, y: y0, k, w: c.width / k, h: c.height / k };
  };
  // tinted copy of a mask
  GG.tint = function (key, m, col) {
    const [c, g] = LX.scratch(key, m.c.width, m.c.height);
    g.clearRect(0, 0, c.width, c.height); g.drawImage(m.c, 0, 0);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
    return Object.assign({}, m, { c });
  };
  GG.put = (ctx, m, dx = 0, dy = 0) => ctx.drawImage(m.c, m.x + dx, m.y + dy, m.w, m.h);

  // ---------------------------------------------------------------- looks (mood palettes)
  GG.LOOKS = {
    clench: { c0: '#FFC15E', c1: '#FF4F3A', a0: 0.34, a1: 0.66, lobes: ['#FF3EA5', '#FFD23F', '#FF8A1F'], rim: '#FFE0A8', halo: '#FF8A2A', line: '#FFF4E0' },
    worried: { c0: '#FFB8D8', c1: '#FF3E8E', a0: 0.42, a1: 0.72, lobes: ['#FFD23F', '#FF3EA5', '#9B5CFF'], rim: '#FFE3F0', halo: '#FF5FB0', line: '#FFF6FA' },
    dawn: { c0: '#FFE3B5', c1: '#FF7A5A', a0: 0.40, a1: 0.66, lobes: ['#FFD23F', '#FF3EA5', '#3DF5FF'], rim: '#FFF1D6', halo: '#FF9AC8', line: '#FFFFFF' },
    sky: { c0: '#FFFFFF', c1: '#FFC9A3', a0: 0.10, a1: 0.42, lobes: ['#FF9ACB', '#3DF5FF', '#FFE66B'], rim: '#FFFFFF', halo: '#9FE8FF', line: '#FFFFFF' },
    joy: { c0: '#FFFBE0', c1: '#FFC23D', a0: 0.62, a1: 0.85, lobes: ['#FFE600', '#FF3D9A', '#3DE7FF'], rim: '#FFFFFF', halo: '#FFD23F', line: '#FFFFFF' },
    metta: { c0: '#FFE7EF', c1: '#FF6FA0', a0: 0.40, a1: 0.70, lobes: ['#FFC94D', '#FF8FB1', '#B9A3FF'], rim: '#FFF3F7', halo: '#FF7FB0', line: '#FFFFFF' },
    rest: { c0: '#F4EFD8', c1: '#9FB4FF', a0: 0.16, a1: 0.42, lobes: ['#C6A3FF', '#9FB4FF', '#FFE3C4'], rim: '#F4EFD8', halo: '#8FA8FF', line: '#F8F4E6' },
  };

  // ---------------------------------------------------------------- the glass body (2D layer, on top of the GL lens)
  GG.drawGlass = function (ctx, g, L, o = {}) {
    const { bx, by, bw, bh, s } = g;
    // feet + arm + mitten tint first (behind body)
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (const fp of g.feetP) { ctx.fillStyle = rgba(L.c1, L.a1 * 0.85); ctx.fill(fp); }
    ctx.lineCap = 'round';
    ctx.save();
    const outside = new Path2D(); outside.rect(0, 0, W, H); outside.addPath(g.body);
    ctx.clip(outside, 'evenodd');
    ctx.strokeStyle = rgba(L.c1, L.a1 * 0.7); ctx.lineWidth = g.armW; ctx.stroke(g.armPath);
    ctx.strokeStyle = rgba(L.c0, 0.55); ctx.lineWidth = g.armW * 0.32; ctx.save(); ctx.translate(-g.armW * 0.12, -g.armW * 0.15); ctx.stroke(g.armPath); ctx.restore();
    ctx.restore();
    // body tint: radial, lighter centre, deeper rim
    const gr = ctx.createRadialGradient(bx - bw * 0.28, by - bh * 0.32, bw * 0.05, bx, by, Math.max(bw, bh) * 1.02);
    gr.addColorStop(0, rgba(L.c0, L.a0)); gr.addColorStop(0.62, rgba(L.c1, (L.a0 + L.a1) * 0.5)); gr.addColorStop(1, rgba(L.c1, L.a1));
    ctx.fillStyle = gr; ctx.fill(g.body);
    // inner lobes: translucent overlapping films -> new colours where they cross
    ctx.save(); ctx.clip(g.body); ctx.globalCompositeOperation = 'screen';
    const lob = [[-0.32, 0.30, 0.62], [0.30, 0.18, 0.58], [0.0, -0.36, 0.55]];
    lob.forEach(([dx, dy, r], i) => {
      const x = bx + dx * bw, y = by + dy * bh, R = r * bw;
      const lg = ctx.createRadialGradient(x, y, 0, x, y, R);
      const a = (o.lobeA ?? 0.42);
      lg.addColorStop(0, rgba(L.lobes[i], a)); lg.addColorStop(0.75, rgba(L.lobes[i], a * 0.75)); lg.addColorStop(1, rgba(L.lobes[i], 0));
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    });
    // fresnel rim band (inside)
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = rgba(L.rim, 0.42); ctx.lineWidth = bw * 0.16; ctx.stroke(g.body);
    ctx.strokeStyle = rgba(L.rim, 0.35); ctx.lineWidth = bw * 0.05; ctx.stroke(g.body);
    // caustic crescent (light focused through the glass, lower right)
    const cg = ctx.createRadialGradient(bx + bw * 0.30, by + bh * 0.55, 0, bx + bw * 0.30, by + bh * 0.55, bw * 0.55);
    cg.addColorStop(0, rgba('#FFFFFF', 0.75)); cg.addColorStop(0.35, rgba(L.c0, 0.35)); cg.addColorStop(1, rgba(L.c0, 0));
    ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(bx + bw * 0.30, by + bh * 0.62, bw * 0.55, bh * 0.28, -0.35, 0, TAU); ctx.fill();
    ctx.restore();
    // mitten tint (in front of the body), overlapping finger films
    for (const p of g.mit) { ctx.fillStyle = rgba(L.c1, L.a1 * 0.62); ctx.fill(p); }
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    g.mit.forEach((p, i) => { ctx.fillStyle = rgba(L.lobes[i % 3], 0.22); ctx.fill(p); });
    ctx.restore();
    ctx.restore();
  };

  // contour (glow + crisp) for body, feet, arm, mitten. fr = prism fringe px
  // cost: body/feet are stroked directly; only arm+mitten use a (small) union mask.
  GG.drawLines = function (ctx, g, L, o = {}) {
    const { bx, by, bw, bh, s } = g;
    const lw = o.lw ?? Math.max(3, s * 0.0115);
    const outside = new Path2D(); outside.rect(0, 0, W, H); outside.addPath(g.body);
    // glow (1/4 res, cheap): everything stroked in the halo colour
    G.glow(gg => {
      gg.globalAlpha = o.glowA ?? 0.6; gg.strokeStyle = L.halo;
      gg.lineWidth = g.armW + lw * 4; gg.stroke(g.armPath);
      gg.globalCompositeOperation = 'destination-out'; gg.lineWidth = Math.max(1, g.armW - lw); gg.stroke(g.armPath);
      gg.globalCompositeOperation = 'source-over'; gg.lineWidth = lw * 4;
      gg.stroke(g.body); g.feetP.forEach(p => gg.stroke(p)); Array.from(g.mit).forEach(p => gg.stroke(p));
    });
    // arm + mitten union outline (small box)
    const hx = g.hand[0], hy = g.hand[1], ms = g.mit.s;
    const box = [Math.min(g.sh[0], hx - ms * 0.75), Math.min(g.sh[1], hy - ms * 0.75) - g.armW, Math.max(g.sh[0], hx + ms * 0.75), Math.max(g.sh[1], hy + ms * 0.75) + g.armW + 0.3 * s];
    const shapes = [{ p: g.armPath, tube: g.armW }, ...Array.from(g.mit).map(p => ({ p }))];
    const am = GG.outline('olW', box, shapes, lw, L.line);
    const fr = o.fringe ?? 3;
    ctx.save();
    if (fr > 0) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85; ctx.lineWidth = lw * 0.9;
      ctx.strokeStyle = '#FF2BD6'; ctx.save(); ctx.translate(-fr, -fr * 0.5); ctx.stroke(g.body); ctx.restore();
      ctx.strokeStyle = '#1FE8FF'; ctx.save(); ctx.translate(fr, fr * 0.5); ctx.stroke(g.body); ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.strokeStyle = L.line; ctx.lineWidth = lw; ctx.stroke(g.body);
    ctx.save(); ctx.clip(outside, 'evenodd'); ctx.lineWidth = lw * 1.6; g.feetP.forEach(p => ctx.stroke(p)); GG.put(ctx, am); ctx.restore();
    // inner overlap edges of the mitten (stacked glass): faint
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35; ctx.lineWidth = lw * 0.5;
    g.mit.forEach(p => ctx.stroke(p));
    ctx.restore();
    // specular streak + dot
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = Math.max(4, s * 0.034);
    ctx.beginPath(); ctx.ellipse(bx, by, bw * 0.78, bh * 0.80, 0, Math.PI * 1.13, Math.PI * 1.36); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(bx - bw * 0.33, by - bh * 0.69, s * 0.022, 0, TAU); ctx.fill();
    ctx.restore();
    G.glow(gg => { gg.strokeStyle = '#FFFFFF'; gg.lineWidth = s * 0.05; gg.globalAlpha = 0.5; gg.beginPath(); gg.ellipse(bx, by, bw * 0.78, bh * 0.80, 0, Math.PI * 1.13, Math.PI * 1.36); gg.stroke(); });
  };

  // ---------------------------------------------------------------- face (deep indigo "lead came" marks)
  GG.face = function (ctx, g, o = {}) {
    const { bx, by, s } = g;
    const col = o.ink || INK;
    const lk = o.look || [0, 0];
    const ex = bx + lk[0] * 0.08 * s, ey = by - 0.12 * s + lk[1] * 0.06 * s;
    const eyes = o.eyes || 'dots';
    const lw = Math.max(5, s * 0.03);
    ctx.save(); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const eyeR = (eyes === 'big' ? 0.10 : 0.075) * s;
    [-1, 1].forEach(sd => {
      const x = ex + sd * 0.2 * s;
      if (eyes === 'squeeze') {
        const w = 0.085 * s, h = 0.07 * s;
        ctx.beginPath(); ctx.moveTo(x - sd * w, ey - h); ctx.lineTo(x + sd * w * 0.55, ey); ctx.lineTo(x - sd * w, ey + h); ctx.stroke();
      } else if (eyes === 'happy') {
        ctx.beginPath(); ctx.arc(x, ey + 0.03 * s, eyeR * 0.95, 1.12 * Math.PI, 1.88 * Math.PI); ctx.stroke();
      } else if (eyes === 'closed') {
        ctx.beginPath(); ctx.arc(x, ey - 0.01 * s, eyeR * 0.9, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke();
      } else {
        const px = (o.pupil ? o.pupil[0] : 0) * eyeR * 0.25, py = (o.pupil ? o.pupil[1] : 0) * eyeR * 0.25;
        ctx.beginPath(); ctx.ellipse(x + px, ey + py, eyeR * 0.8, eyeR * 1.1, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x + px - eyeR * 0.28, ey + py - eyeR * 0.42, eyeR * 0.3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(x + px + eyeR * 0.25, ey + py + eyeR * 0.35, eyeR * 0.12, 0, TAU); ctx.fill(); ctx.fillStyle = col;
      }
      if (eyes === 'worried' || o.brows === 'worried') { ctx.beginPath(); ctx.moveTo(x - sd * 0.11 * s, ey - 0.22 * s); ctx.lineTo(x + sd * 0.06 * s, ey - 0.165 * s); ctx.stroke(); }
    });
    const bl = o.blush ?? 0;
    if (bl > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'source-over';
      [-1, 1].forEach(sd => {
        const x = ex + sd * 0.34 * s, y = ey + 0.11 * s;
        const rg = ctx.createRadialGradient(x, y, 0, x, y, 0.09 * s);
        rg.addColorStop(0, `rgba(255,70,140,${0.75 * bl})`); rg.addColorStop(1, 'rgba(255,70,140,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(x, y, 0.09 * s, 0.055 * s, 0, 0, TAU); ctx.fill();
      });
      ctx.restore();
    }
    const mouth = o.mouth || (eyes === 'squeeze' ? 'zigzag' : 'smile');
    ctx.beginPath();
    if (mouth === 'o') { ctx.ellipse(ex, ey + 0.16 * s, 0.038 * s, 0.05 * s, 0, 0, TAU); ctx.fill(); }
    else if (mouth === 'open') { ctx.moveTo(ex - 0.075 * s, ey + 0.1 * s); ctx.quadraticCurveTo(ex, ey + 0.26 * s, ex + 0.075 * s, ey + 0.1 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FF5E8A'; ctx.beginPath(); ctx.ellipse(ex, ey + 0.175 * s, 0.035 * s, 0.022 * s, 0, 0, TAU); ctx.fill(); }
    else if (mouth === 'flat') { ctx.moveTo(ex - 0.05 * s, ey + 0.15 * s); ctx.lineTo(ex + 0.05 * s, ey + 0.15 * s); ctx.stroke(); }
    else if (mouth === 'zigzag') {
      const w = 0.075 * s, y = ey + 0.16 * s;
      ctx.moveTo(ex - w, y); for (let k = 1; k <= 4; k++) ctx.lineTo(ex - w + k * w / 2, y + (k % 2 ? -0.026 : 0.026) * s); ctx.stroke();
    } else if (mouth !== 'none') { ctx.arc(ex, ey + 0.1 * s, 0.065 * s, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    // sweat: a cyan tear of light
    const sw = o.sweat ?? 0;
    if (sw > 0) {
      const dx = bx - 0.55 * g.bw, dy = by - 0.42 * g.bh;
      const p = new Path2D();
      p.moveTo(dx, dy - 0.10 * s); p.quadraticCurveTo(dx + 0.06 * s, dy, dx, dy + 0.045 * s); p.quadraticCurveTo(dx - 0.06 * s, dy, dx, dy - 0.10 * s);
      ctx.globalAlpha = sw; ctx.fillStyle = 'rgba(160,245,255,0.85)'; ctx.fill(p);
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.stroke(p);
      G.glow(gg => { gg.fillStyle = '#3DF5FF'; gg.fill(p); });
    }
    ctx.restore();
  };

  GG.draw = function (ctx, g, look, face = {}, o = {}) {
    const L = typeof look === 'string' ? GG.LOOKS[look] : look;
    GG.drawGlass(ctx, g, L, o);
    GG.drawLines(ctx, g, L, o);
    GG.face(ctx, g, face);
  };

  // pane-layer helpers for the character: coloured caustic shadow under a glass body
  GG.paneShadow = function (pg, g, col, a = 0.55) {
    const { bx, s } = g; const y = g.by + g.bh * 1.02 + 0.05 * s;
    pg.save(); pg.globalCompositeOperation = 'source-over';
    const sg = pg.createRadialGradient(bx + 0.1 * s, y, 0, bx + 0.1 * s, y, 0.75 * s);
    sg.addColorStop(0, G.rgba(col, a)); sg.addColorStop(1, G.rgba(col, 0));
    pg.fillStyle = sg; pg.beginPath(); pg.ellipse(bx + 0.1 * s, y, 0.75 * s, 0.12 * s, 0, 0, TAU); pg.fill();
    pg.globalCompositeOperation = 'lighter';
    const cg = pg.createRadialGradient(bx + 0.18 * s, y - 0.01 * s, 0, bx + 0.18 * s, y, 0.22 * s);
    cg.addColorStop(0, 'rgba(255,250,225,0.9)'); cg.addColorStop(1, 'rgba(255,240,200,0)');
    pg.fillStyle = cg; pg.beginPath(); pg.ellipse(bx + 0.18 * s, y, 0.24 * s, 0.05 * s, 0, 0, TAU); pg.fill();
    pg.restore();
  };

  // ---------------------------------------------------------------- the knot (dukkha)
  // fixed scribble in unit coordinates
  const SCRIB = (() => {
    const pts = []; let a = 0, r = 0.5;
    for (let i = 0; i < 90; i++) {
      a += 0.9 + hash(i * 3.1) * 1.9; r = 0.18 + 0.78 * Math.pow(hash(i * 7.7 + 1), 0.7);
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  })();
  function knotBoundary(t, x, y, R, jit, n = 72) {
    const f = Math.floor(t * 12);
    const h1 = hash(f * 1.3) * TAU, h2 = hash(f * 2.7 + 4) * TAU, h3 = hash(f * 5.1 + 9) * TAU;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU;
      const r = R * (1 + jit * (0.075 * Math.sin(5 * a + h1) + 0.05 * Math.sin(8 * a + h2) + 0.035 * Math.sin(13 * a + h3)) + 0.04 * Math.sin(3 * a + 1));
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    return pts;
  }
  let SHELL = { key: null };
  function shellCanvas(t, x, y, R, jit, bpts) {
    const f = Math.floor(t * 12), key = f + '_' + R + '_' + jit.toFixed(2);
    if (SHELL.key === key) return SHELL;
    const k = 0.75, S = Math.ceil(R * 2.8 * k);
    const [c, g] = LX.scratch('knotShell', S, S);
    g.clearRect(0, 0, S, S); g.setTransform(k, 0, 0, k, S / 2 - x * k, S / 2 - y * k);
    const bp = G.path(bpts, true);
    const gr = g.createRadialGradient(x - R * 0.3, y - R * 0.3, R * 0.1, x, y, R * 1.05);
    gr.addColorStop(0, '#2A1450'); gr.addColorStop(0.55, '#140A2C'); gr.addColorStop(1, '#07030F');
    g.fillStyle = gr; g.fill(bp);
    g.save(); g.clip(bp);
    const jx = (i) => (hash(i * 1.7 + f * 0.37) - 0.5) * 3 * jit;
    const sp = LX.smoothPts(SCRIB.map((p, i) => [x + p[0] * R + jx(i), y + p[1] * R + jx(i + 99)]), 3);
    const P = G.path(sp);
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(110,60,200,0.5)'; g.lineWidth = R * 0.16; g.stroke(P);
    g.strokeStyle = '#06020D'; g.lineWidth = R * 0.12; g.stroke(P);
    g.strokeStyle = 'rgba(150,100,255,0.45)'; g.lineWidth = R * 0.02; g.translate(-R * 0.03, -R * 0.035); g.stroke(P);
    g.restore();
    SHELL = { key, c, S, k };
    return SHELL;
  }
  // heavy opaque knot. o.alpha, o.jit (buzz), o.crack 0..1 (shell splits into fragments)
  GG.knot = function (ctx, t, x, y, R, o = {}) {
    const jit = o.jit ?? 1, crack = o.crack ?? 0, A = o.alpha ?? 1;
    if (A <= 0) return;
    const f = Math.floor(t * 12), sgn = f % 2 ? 1 : -1;
    const bpts = knotBoundary(t, x, y, R, jit);
    const bp = G.path(bpts, true);
    const nFrag = 7;
    // the shell (dark body + lead-came tangle) is rendered once per 12 Hz jitter step into a cached 0.75x canvas
    const sh = shellCanvas(t, x, y, R, jit, bpts);
    const drawShell = (cx) => { cx.drawImage(sh.c, x - sh.S / (2 * sh.k), y - sh.S / (2 * sh.k), sh.S / sh.k, sh.S / sh.k); };
    ctx.save(); ctx.globalAlpha = A;
    if (crack <= 0.001) drawShell(ctx);
    else {
      // fragments: sectors of the shell, pushed out and turned, light shows in the cracks
      for (let i = 0; i < nFrag; i++) {
        const a0 = (i + hash(i) * 0.2) / nFrag * TAU, a1 = (i + 1 + hash(i + 1) * 0.2) / nFrag * TAU, am = (a0 + a1) / 2;
        const d = crack * R * (0.55 + 0.75 * hash(i * 9.1)), rot = (hash(i * 4.3) - 0.5) * 1.1 * crack;
        ctx.save();
        const sc = 1 - 0.45 * Math.min(1, crack), fx0 = x + Math.cos(am) * R * 0.6, fy0 = y + Math.sin(am) * R * 0.6;
        ctx.translate(fx0 + Math.cos(am) * d, fy0 + Math.sin(am) * d); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-fx0, -fy0);
        const sec = new Path2D(); sec.moveTo(x + Math.cos(am) * R * 0.35 * crack, y + Math.sin(am) * R * 0.35 * crack);
        sec.arc(x, y, R * 1.3, a0 + 0.04, a1 - 0.04); sec.closePath();
        ctx.clip(sec); ctx.globalAlpha = A * Math.max(0.25, 1 - crack * 0.6);
        drawShell(ctx);
        ctx.restore();
      }
    }
    ctx.restore();
    // chromatically split neon edge (opaque: complementary pair must not sum to white)
    const ea = A * (1 - crack * 0.85);
    if (ea > 0.01 && crack < 0.5) {
      ctx.save(); ctx.lineJoin = 'round'; ctx.globalAlpha = ea; ctx.lineWidth = Math.max(4, R * 0.062);
      const off = R * 0.055 * jit;
      ctx.strokeStyle = '#FF2EA6'; ctx.save(); ctx.translate(-off * sgn, -off * 0.3); ctx.stroke(bp); ctx.restore();
      ctx.strokeStyle = '#B8FF2C'; ctx.save(); ctx.translate(off * sgn, off * 0.3); ctx.stroke(bp); ctx.restore();
      ctx.strokeStyle = '#9B5CFF'; ctx.lineWidth = Math.max(2, R * 0.02); ctx.stroke(bp);
      ctx.restore();
      G.glow(g => {
        g.globalAlpha = ea; g.lineWidth = R * 0.16;
        g.strokeStyle = '#FF2EA6'; g.save(); g.translate(-off * 2, 0); g.stroke(bp); g.restore();
        g.strokeStyle = '#7A3CFF'; g.save(); g.translate(off * 2, 0); g.stroke(bp); g.restore();
      });
      // sparks
      ctx.save(); ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 9; i++) {
        const hh = hash(i * 13.3 + f * 0.71); if (hh < 0.35 * (2 - jit)) continue;
        const a = hash(i * 5.7 + f * 0.13) * TAU, r0 = R * 1.12, L = R * (0.12 + 0.3 * hash(i + f));
        ctx.strokeStyle = i % 2 ? '#C6FF3D' : '#FF3EA5'; ctx.lineWidth = 3.2 * ea; ctx.globalAlpha = ea;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * (r0 + L), y + Math.sin(a) * (r0 + L)); ctx.stroke();
      }
      ctx.restore();
    }
    return bpts;
  };

  // the knot as glass: a faceted jewel (centre + petals + outer facets), translucent, lead lines, glints
  GG.jewel = function (ctx, t, x, y, R, o = {}) {
    const A = o.alpha ?? 1; if (A <= 0) return;
    const cols = o.cols || ['#FF3EA5', '#FFD23F', '#3DF5FF', '#9B5CFF', '#FF8A1F', '#C6FF3D', '#19C3D6'];
    const rot = o.rot ?? 0, n = o.n ?? 7;
    ctx.save(); ctx.globalAlpha = A;
    const facets = [];
    const inner = [], mid = [], outer = [];
    for (let i = 0; i < n; i++) {
      const a = rot + i / n * TAU, b = rot + (i + 0.5) / n * TAU;
      inner.push([x + Math.cos(a) * R * 0.34, y + Math.sin(a) * R * 0.34]);
      mid.push([x + Math.cos(b) * R * 0.72, y + Math.sin(b) * R * 0.72]);
      outer.push([x + Math.cos(a) * R, y + Math.sin(a) * R]);
    }
    facets.push({ pts: inner, c: o.center || '#FFF6D8', a: 0.85 });
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      facets.push({ pts: [inner[i], mid[i], inner[j]], c: cols[i % cols.length], a: 0.78 });
      facets.push({ pts: [inner[i], outer[i], mid[i]], c: cols[(i + 3) % cols.length], a: 0.62 });
      facets.push({ pts: [inner[j], mid[i], outer[j]], c: cols[(i + 5) % cols.length], a: 0.55 });
      facets.push({ pts: [outer[i], mid[i], outer[j]], c: cols[(i + 2) % cols.length], a: 0.7 });
    }
    // facet fills (screen) with a bright edge gradient
    ctx.globalCompositeOperation = o.op || 'source-over';
    for (const fc of facets) {
      const p = G.path(fc.pts, true);
      const c0 = fc.pts[0], c1 = fc.pts[1];
      const gr = ctx.createLinearGradient(c0[0], c0[1], c1[0], c1[1]);
      gr.addColorStop(0, G.rgba(fc.c, Math.min(1, fc.a * 1.2) * A)); gr.addColorStop(1, G.rgba(G.mixHex(fc.c, '#FFFFFF', o.whiten ?? 0.18), Math.min(1, fc.a * 1.15) * A));
      ctx.fillStyle = gr; ctx.fill(p);
    }
    // lead lines
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineJoin = 'round'; ctx.strokeStyle = o.lead || 'rgba(27,18,64,0.9)'; ctx.lineWidth = Math.max(2.5, R * 0.035);
    for (const fc of facets) ctx.stroke(G.path(fc.pts, true));
    // glints
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = Math.max(2, R * 0.022); ctx.lineCap = 'round';
    for (let i = 0; i < n; i += 2) { const p = G.path([inner[i], mid[i]]); ctx.stroke(p); }
    ctx.restore();
    G.glow(g => { g.globalAlpha = A * (o.glowA ?? 0.8); g.fillStyle = o.halo || '#FFE3A8'; g.beginPath(); g.arc(x, y, R * 1.05, 0, TAU); g.fill(); });
    return { inner, mid, outer };
  };

  window.GG = GG;
})();
