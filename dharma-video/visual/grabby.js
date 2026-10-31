// grabbygrab: a small bean creature with one long noodle arm and a mitten hand.
(function () {
  const E = window.ENGINE;
  const TAU = Math.PI * 2;
  function noodle(ctx, pts, w, col, outline, ow) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
    ctx.strokeStyle = outline; ctx.lineWidth = w + ow * 2; ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
  }
  function mitten(ctx, x, y, ang, s, open, col, outline, ow) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    const shapes = [];
    // palm
    shapes.push(c => { c.beginPath(); c.ellipse(0, 0, 0.30 * s, 0.26 * s, 0, 0, TAU); });
    // 3 fingers fanning when open, folded when closed
    for (let i = 0; i < 3; i++) {
      const a = (i - 1) * (0.55 * open + 0.42 * (1 - open));
      const L = (0.02 + 0.38 * open) * s;
      shapes.push(c => { c.save(); c.rotate(a); c.beginPath(); c.roundRect((0.16 + 0.0 * open) * s, -0.085 * s, L + 0.12 * s, 0.17 * s, 0.085 * s); c.restore(); });
    }
    // thumb
    shapes.push(c => { c.save(); c.rotate(-1.2 - 0.4 * open); c.beginPath(); c.roundRect(0.08 * s, -0.07 * s, (0.16 + 0.12 * open) * s, 0.14 * s, 0.07 * s); c.restore(); });
    ctx.lineJoin = 'round';
    ctx.strokeStyle = outline; ctx.lineWidth = ow * 2;
    shapes.forEach(f => { f(ctx); ctx.stroke(); });
    ctx.fillStyle = col;
    shapes.forEach(f => { f(ctx); ctx.fill(); });
    ctx.restore();
  }
  // opts: arm:{tx,ty,ext(0..1),open(0..1)} eyes:'open'|'big'|'closed'|'wink'|'worried' look:[dx,dy] squash:-0.3..0.3 col
  function grabby(t, cx, cy, s, o = {}) {
    const ctx = E.ctx;
    const col = o.col || '#FFF3DC', outline = o.outline || '#1b1622', ow = (o.ow || 5);
    const sq = o.squash || 0;
    const bob = (o.bob ?? 1) * Math.sin(t * 3.1) * 0.025 * s;
    const alpha = o.alpha ?? 1;
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    const bx = cx, by = cy + bob;
    const bw = 0.62 * s * (1 + sq), bh = 0.7 * s * (1 - sq);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(cx, cy + 0.72 * s, 0.5 * s, 0.08 * s, 0, 0, TAU); ctx.fill();
    // arm (behind body start) - shoulder at right side
    const sh = [bx + 0.45 * bw, by + 0.05 * bh];
    let hx, hy, hang;
    const arm = o.arm || { ext: 0, open: 0.3 };
    const rest = [bx + 0.95 * bw, by + 0.45 * bh];
    const tx = arm.tx ?? rest[0], ty = arm.ty ?? rest[1];
    const e = E.clamp(arm.ext ?? 0);
    hx = E.lerp(rest[0], tx, e); hy = E.lerp(rest[1], ty, e);
    hang = Math.atan2(hy - sh[1], hx - sh[0]);
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
    const g = ctx.createRadialGradient(bx - bw * 0.35, by - bh * 0.4, bw * 0.1, bx, by, bw * 1.2);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, col);
    ctx.fillStyle = g; ctx.fill();
    // hand
    mitten(ctx, hx, hy, hang, 0.55 * s, arm.open ?? 0.3, col, outline, ow);
    if (o.holding) o.holding(hx + Math.cos(hang) * 0.12 * s, hy + Math.sin(hang) * 0.12 * s);
    // face
    const lk = o.look || [0, 0];
    const ex = bx + lk[0] * 0.08 * s, ey = by - 0.12 * s + lk[1] * 0.06 * s;
    const eyeR = (o.eyes === 'big' ? 0.11 : 0.075) * s;
    const blink = (o.blink ?? true) && ((t * 0.9) % 3.7) < 0.12;
    ctx.fillStyle = outline; ctx.strokeStyle = outline; ctx.lineWidth = ow * 0.9; ctx.lineCap = 'round';
    [-1, 1].forEach(sd => {
      const x = ex + sd * 0.2 * s;
      const closed = o.eyes === 'closed' || blink || (o.eyes === 'wink' && sd === 1);
      if (closed) {
        ctx.beginPath(); ctx.arc(x, ey - 0.01 * s, eyeR * 0.9, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.ellipse(x, ey, eyeR * 0.85, eyeR * 1.15, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - eyeR * 0.3, ey - eyeR * 0.45, eyeR * 0.32, 0, TAU); ctx.fill(); ctx.fillStyle = outline;
      }
      if (o.eyes === 'worried') { ctx.beginPath(); ctx.moveTo(x - sd * 0.1 * s, ey - 0.2 * s); ctx.lineTo(x + sd * 0.06 * s, ey - 0.15 * s); ctx.stroke(); }
    });
    // blush
    ctx.fillStyle = 'rgba(255,140,140,0.45)';
    [-1, 1].forEach(sd => { ctx.beginPath(); ctx.ellipse(ex + sd * 0.33 * s, ey + 0.1 * s, 0.07 * s, 0.04 * s, 0, 0, TAU); ctx.fill(); });
    // mouth
    ctx.beginPath();
    if (o.mouth === 'o') { ctx.ellipse(ex, ey + 0.15 * s, 0.035 * s, 0.045 * s, 0, 0, TAU); ctx.fillStyle = outline; ctx.fill(); }
    else if (o.mouth === 'flat') { ctx.moveTo(ex - 0.05 * s, ey + 0.15 * s); ctx.lineTo(ex + 0.05 * s, ey + 0.15 * s); ctx.stroke(); }
    else { ctx.arc(ex, ey + 0.1 * s, 0.06 * s, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    ctx.restore();
  }
  window.GRABBY = { grabby };
})();
