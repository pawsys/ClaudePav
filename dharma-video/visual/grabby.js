// grabbygrab: flat cream bean creature, ONE noodle arm, 3-finger mitten + thumb.
// Style: flat fill #F6EDE0, 5px ink #23202B outline (scaled), no gradients.
(function () {
  const E = window.ENGINE;
  const TAU = Math.PI * 2;
  const CREAM = '#F6EDE0', INK = '#23202B';

  function noodle(ctx, pts, w, col, outline, ow) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
    ctx.strokeStyle = outline; ctx.lineWidth = w + ow * 2; ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
  }

  // Mitten: palm + 3 fingers + thumb. open 0 (fist) .. 1 (spread). stagger: per-finger delay in open-units.
  // Exposed so the macro fist (18-23 s) can draw the SAME hand at 700 px.
  function mitten(ctx, x, y, ang, s, open, { col = CREAM, outline = INK, ow = 5, stagger = 0, tremble = 0, t = 0 } = {}) {
    ctx.save();
    ctx.translate(x + tremble * Math.sin(t * 97), y + tremble * Math.cos(t * 83));
    ctx.rotate(ang);
    const shapes = [];
    shapes.push(c => { c.beginPath(); c.ellipse(0, 0, 0.30 * s, 0.27 * s, 0, 0, TAU); });
    for (let i = 0; i < 3; i++) {
      const o = E.smoother(E.clamp((open - i * stagger) / Math.max(0.001, 1 - 2 * stagger)));
      const a = (i - 1) * (0.55 * o + 0.42 * (1 - o));
      const L = (0.02 + 0.38 * o) * s;
      shapes.push(c => { c.save(); c.rotate(a); c.beginPath(); c.roundRect(0.16 * s, -0.085 * s, L + 0.12 * s, 0.17 * s, 0.085 * s); c.restore(); });
    }
    const ot = E.smoother(E.clamp((open - 3 * stagger) / Math.max(0.001, 1 - 2 * stagger)));
    shapes.push(c => { c.save(); c.rotate(-1.2 - 0.4 * ot); c.beginPath(); c.roundRect(0.08 * s, -0.07 * s, (0.16 + 0.12 * ot) * s, 0.14 * s, 0.07 * s); c.restore(); });
    ctx.lineJoin = 'round';
    ctx.strokeStyle = outline; ctx.lineWidth = ow * 2;
    shapes.forEach(f => { f(ctx); ctx.stroke(); });
    ctx.fillStyle = col;
    shapes.forEach(f => { f(ctx); ctx.fill(); });
    // knuckle crease lines when clenched
    if (open < 0.35) {
      ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1.5, ow * 0.5); ctx.lineCap = 'round';
      const k = (0.35 - open) / 0.35;
      ctx.globalAlpha *= k;
      for (let i = 0; i < 2; i++) {
        const a = (i - 0.5) * 0.42;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 0.2 * s, Math.sin(a) * 0.2 * s);
        ctx.lineTo(Math.cos(a) * 0.29 * s, Math.sin(a) * 0.29 * s);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // opts:
  //  arm: {tx, ty, ext 0..1, open 0..1}  (target in canvas coords)
  //  eyes: 'dots'|'squeeze'|'happy'|'closed'|'one'|'big'|'worried'
  //  look: [dx, dy] (-1..1) pupil offset ; mouth: 'smile'|'zigzag'|'o'|'flat'|'none'
  //  sweat: 0..1 ; blush: 0..1 ; squash ; bob ; alpha ; holding(x,y) callback
  function grabby(t, cx, cy, s, o = {}) {
    const ctx = E.ctx;
    const col = o.col || CREAM, outline = o.outline || INK;
    const ow = (o.ow ?? 5) * Math.max(0.35, s / 230);
    const sq = o.squash || 0;
    const bob = (o.bob ?? 1) * Math.sin(t * 3.1) * 0.025 * s;
    const alpha = o.alpha ?? 1;
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    const bx = cx, by = cy + bob;
    const bw = 0.62 * s * (1 + sq), bh = 0.7 * s * (1 - sq);
    // contact shadow (optional)
    if (o.shadow !== false) {
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.beginPath(); ctx.ellipse(cx, cy + 0.74 * s, 0.48 * s, 0.07 * s, 0, 0, TAU); ctx.fill();
    }
    const sh = [bx + 0.45 * bw, by + 0.05 * bh];
    const arm = o.arm || { ext: 0, open: 0.3 };
    const rest = [bx + 0.92 * bw, by + 0.42 * bh];
    const tx = arm.tx ?? rest[0], ty = arm.ty ?? rest[1];
    const e = E.clamp(arm.ext ?? 0);
    const hx = E.lerp(rest[0], tx, e), hy = E.lerp(rest[1], ty, e);
    const hang = arm.ang ?? Math.atan2(hy - sh[1], hx - sh[0]);
    const dist = Math.hypot(hx - sh[0], hy - sh[1]);
    const sag = (1 - e) * 0.25 * s + 0.1 * s;
    const p1 = [sh[0] + dist * 0.3, sh[1] + sag], p2 = [hx - Math.cos(hang) * dist * 0.3, hy - Math.sin(hang) * dist * 0.3 + sag * 0.5];
    // feet
    ctx.fillStyle = col; ctx.strokeStyle = outline; ctx.lineWidth = ow * 2;
    [[-0.22, 0.66], [0.22, 0.66]].forEach(([fx, fy]) => {
      ctx.beginPath(); ctx.ellipse(bx + fx * s, cy + fy * s, 0.12 * s, 0.07 * s, 0, 0, TAU); ctx.stroke(); ctx.fill();
    });
    noodle(ctx, [sh, p1, p2, [hx, hy]], 0.11 * s, col, outline, ow);
    // body
    ctx.beginPath(); ctx.ellipse(bx, by, bw, bh, 0, 0, TAU);
    ctx.lineWidth = ow * 2; ctx.strokeStyle = outline; ctx.stroke();
    ctx.fillStyle = col; ctx.fill();
    // 4% highlight
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.ellipse(bx - bw * 0.3, by - bh * 0.45, bw * 0.45, bh * 0.3, -0.4, 0, TAU); ctx.fill();
    ctx.restore();
    // held object drawn behind the mitten
    if (o.holding) o.holding(hx + Math.cos(hang) * 0.05 * s, hy + Math.sin(hang) * 0.05 * s);
    mitten(ctx, hx, hy, hang, 0.55 * s, arm.open ?? 0.3, { col, outline, ow, stagger: arm.stagger || 0, tremble: arm.tremble || 0, t });
    // face
    const lk = o.look || [0, 0];
    const ex = bx + lk[0] * 0.08 * s, ey = by - 0.12 * s + lk[1] * 0.06 * s;
    const eyeR = (o.eyes === 'big' ? 0.105 : 0.072) * s;
    const blink = (o.blink ?? true) && ((t * 0.9) % 3.7) < 0.12 && (o.eyes === 'dots' || !o.eyes || o.eyes === 'big');
    ctx.fillStyle = outline; ctx.strokeStyle = outline; ctx.lineWidth = Math.max(2, ow * 0.95); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const eyes = o.eyes || 'dots';
    [-1, 1].forEach(sd => {
      const x = ex + sd * 0.2 * s;
      if (eyes === 'squeeze') {
        // > <
        const w = 0.075 * s, h = 0.06 * s;
        ctx.beginPath();
        ctx.moveTo(x - sd * w, ey - h); ctx.lineTo(x + sd * w * 0.6, ey); ctx.lineTo(x - sd * w, ey + h);
        ctx.stroke();
      } else if (eyes === 'happy') {
        ctx.beginPath(); ctx.arc(x, ey + 0.02 * s, eyeR * 0.95, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
      } else if (eyes === 'closed' || blink || (eyes === 'one' && sd === -1)) {
        ctx.beginPath(); ctx.arc(x, ey - 0.01 * s, eyeR * 0.9, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.ellipse(x + (o.pupil ? o.pupil[0] * eyeR * 0.3 : 0), ey + (o.pupil ? o.pupil[1] * eyeR * 0.3 : 0), eyeR * 0.85, eyeR * 1.15, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - eyeR * 0.3, ey - eyeR * 0.45, eyeR * 0.3, 0, TAU); ctx.fill(); ctx.fillStyle = outline;
      }
      if (eyes === 'worried') { ctx.beginPath(); ctx.moveTo(x - sd * 0.1 * s, ey - 0.2 * s); ctx.lineTo(x + sd * 0.06 * s, ey - 0.15 * s); ctx.stroke(); }
    });
    // blush
    const bl = o.blush ?? 0;
    if (bl > 0) {
      ctx.fillStyle = `rgba(242,167,160,${0.75 * bl})`;
      [-1, 1].forEach(sd => { ctx.beginPath(); ctx.ellipse(ex + sd * 0.33 * s, ey + 0.1 * s, 0.075 * s, 0.042 * s, 0, 0, TAU); ctx.fill(); });
    }
    // mouth
    const mouth = o.mouth || (eyes === 'squeeze' ? 'zigzag' : 'smile');
    ctx.beginPath();
    if (mouth === 'o') { ctx.ellipse(ex, ey + 0.15 * s, 0.035 * s, 0.045 * s, 0, 0, TAU); ctx.fill(); }
    else if (mouth === 'flat') { ctx.moveTo(ex - 0.05 * s, ey + 0.15 * s); ctx.lineTo(ex + 0.05 * s, ey + 0.15 * s); ctx.stroke(); }
    else if (mouth === 'zigzag') {
      const w = 0.06 * s, y = ey + 0.15 * s;
      ctx.moveTo(ex - w, y); for (let k = 1; k <= 4; k++) ctx.lineTo(ex - w + k * w / 2, y + (k % 2 ? -0.02 : 0.02) * s); ctx.stroke();
    }
    else if (mouth !== 'none') { ctx.arc(ex, ey + 0.1 * s, 0.06 * s, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    // sweat drop
    const sw = o.sweat ?? (eyes === 'squeeze' ? 1 : 0);
    if (sw > 0) {
      const dx = bx - 0.52 * bw, dy = by - 0.45 * bh + (o.sweatDrip || 0) * 0.15 * s;
      ctx.save(); ctx.globalAlpha *= sw;
      ctx.fillStyle = '#BFE3F5'; ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1.5, ow * 0.6);
      ctx.beginPath();
      ctx.moveTo(dx, dy - 0.09 * s);
      ctx.quadraticCurveTo(dx + 0.055 * s, dy, dx, dy + 0.04 * s);
      ctx.quadraticCurveTo(dx - 0.055 * s, dy, dx, dy - 0.09 * s);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    return { hand: [hx, hy], ang: hang };
  }

  window.GRABBY = { grabby, mitten, CREAM, INK };
})();
