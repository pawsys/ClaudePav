// Drawing primitives on ENGINE.ctx (1080x1350). All deterministic in t.
(function () {
  const E = window.ENGINE;
  const TAU = Math.PI * 2;
  const H = E.hash;

  // smooth 1D value noise
  function vnoise(x) {
    const i = Math.floor(x), f = x - i;
    const u = f * f * (3 - 2 * f);
    return E.lerp(H(i), H(i + 1), u) * 2 - 1;
  }

  // -------------------------------------------------------------- rain streaks
  function rain(t, { amount = 1, color = 'rgba(220,230,255,0.35)', angle = 0.22, speed = 2600, count = 140, len = 70, width = 1.5, seed = 0 } = {}) {
    if (amount <= 0) return;
    const ctx = E.ctx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.globalAlpha = amount;
    const dx = Math.sin(angle), dy = Math.cos(angle);
    for (let i = 0; i < count; i++) {
      const r1 = H(i * 3.1 + seed), r2 = H(i * 7.7 + seed), r3 = H(i * 1.3 + seed + 9);
      const sp = speed * (0.6 + 0.8 * r3);
      const span = E.H + 300;
      const y = ((r2 * span + t * sp) % span) - 150;
      const x = r1 * (E.W + 400) - 200 + y * dx / dy;
      const L = len * (0.5 + r3);
      ctx.globalAlpha = amount * (0.3 + 0.7 * r3);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - dx * L, y - dy * L);
      ctx.stroke();
    }
    ctx.restore();
  }

  // -------------------------------------------------------------- lightning bolt
  function bolt(x0, y0, x1, y1, seed, alpha = 1, width = 3) {
    const ctx = E.ctx;
    const pts = [[x0, y0]];
    const N = 14;
    for (let i = 1; i < N; i++) {
      const f = i / N;
      pts.push([E.lerp(x0, x1, f) + (H(seed + i) - 0.5) * 90 * (1 - Math.abs(f - 0.5)), E.lerp(y0, y1, f) + (H(seed + i * 3) - 0.5) * 20]);
    }
    pts.push([x1, y1]);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#f4f6ff';
    ctx.shadowColor = 'rgba(200,215,255,0.9)';
    ctx.shadowBlur = 30;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.stroke();
    ctx.restore();
  }

  // -------------------------------------------------------------- motes (rising particles)
  function motes(t, { count = 120, color = [255, 214, 120], alpha = 1, rise = 40, size = 3, area = [0, 0, 1080, 1350], seed = 1, glow = true, twinkle = true } = {}) {
    if (alpha <= 0) return;
    const ctx = E.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const [ax, ay, aw, ah] = area;
    for (let i = 0; i < count; i++) {
      const r1 = H(i * 1.7 + seed), r2 = H(i * 2.9 + seed), r3 = H(i * 5.3 + seed);
      let y = ay + ((r2 * ah - t * rise * (0.5 + r3)) % ah + ah) % ah;
      let x = ax + r1 * aw + Math.sin(t * (0.3 + r3) + i) * 18;
      const s = size * (0.4 + r3 * 1.2);
      const tw = twinkle ? 0.55 + 0.45 * Math.sin(t * (1.5 + r1 * 3) + i * 2.1) : 1;
      const a = alpha * tw * (0.35 + 0.65 * r2);
      if (glow) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, s * 5);
        g.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${a * 0.5})`);
        g.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x - s * 5, y - s * 5, s * 10, s * 10);
      }
      ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${a})`;
      ctx.beginPath(); ctx.arc(x, y, s * 0.6, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // -------------------------------------------------------------- stars
  function stars(t, alpha, count = 380, seed = 4) {
    if (alpha <= 0) return;
    const ctx = E.ctx;
    ctx.save();
    for (let i = 0; i < count; i++) {
      const x = H(i * 1.1 + seed) * E.W, y = H(i * 2.3 + seed) * E.H * 0.8;
      const s = 0.5 + H(i * 3.7) * 1.6;
      const tw = 0.6 + 0.4 * Math.sin(t * (1 + H(i) * 3) + i);
      ctx.fillStyle = `rgba(255,255,255,${alpha * tw * (0.3 + 0.7 * H(i * 9.1))})`;
      ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // -------------------------------------------------------------- god rays
  function godrays(t, cx, cy, alpha, { count = 9, color = '255,236,200', len = 1500, spread = 1.2, dir = Math.PI / 2 } = {}) {
    if (alpha <= 0) return;
    const ctx = E.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < count; i++) {
      const a = dir + (i / (count - 1) - 0.5) * spread + Math.sin(t * 0.2 + i) * 0.03;
      const w = 0.03 + H(i * 4.4) * 0.05;
      const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      const aa = alpha * (0.06 + 0.08 * H(i * 2.2)) * (0.7 + 0.3 * Math.sin(t * 0.7 + i * 1.7));
      g.addColorStop(0, `rgba(${color},${aa})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a - w) * len, cy + Math.sin(a - w) * len);
      ctx.lineTo(cx + Math.cos(a + w) * len, cy + Math.sin(a + w) * len);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // -------------------------------------------------------------- blob (evil vibrating blob)
  // jitter: 0..1 (vibration), warm: 0..1 (slate->apricot->gold), dissolve 0..1
  function blob(t, cx, cy, r, { jitter = 1, warm = 0, alpha = 1, dissolve = 0, seed = 3, eyes = 0, squash = 0 } = {}) {
    if (alpha <= 0) return;
    const ctx = E.ctx;
    const slate = [52, 50, 66], apricot = [255, 179, 122], gold = [255, 216, 77];
    const c = warm < 0.5 ? E.mixRgb(slate, apricot, warm * 2) : E.mixRgb(apricot, gold, (warm - 0.5) * 2);
    const jx = jitter * (Math.sin(t * 190) * 3 + Math.sin(t * 263 + 1) * 2);
    const jy = jitter * (Math.cos(t * 211) * 3 + Math.sin(t * 157 + 2) * 2);
    const N = 90;
    ctx.save();
    ctx.globalAlpha = alpha * (1 - dissolve);
    ctx.translate(cx + jx, cy + jy);
    ctx.scale(1 + squash, 1 - squash);
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = i / N * TAU;
      const wob = 0.08 * vnoise(Math.cos(a) * 2 + seed + t * 0.8) + 0.05 * vnoise(Math.sin(a) * 3 + seed * 2 - t * 1.1)
        + jitter * 0.03 * Math.sin(a * 9 + t * 120);
      const rr = r * (1 + wob);
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.1);
    const hi = E.mixRgb(c, [255, 255, 255], 0.22 + warm * 0.2);
    g.addColorStop(0, `rgb(${hi.map(v => v | 0).join(',')})`);
    g.addColorStop(1, `rgb(${c.map(v => v | 0).join(',')})`);
    ctx.fillStyle = g;
    if (warm > 0.4) { ctx.shadowColor = `rgba(255,200,100,${(warm - 0.4) * 1.2})`; ctx.shadowBlur = 60 * warm; }
    ctx.fill();
    ctx.restore();
  }

  // -------------------------------------------------------------- arrows (line art)
  function arrow(x, y, ang, len, { color = '#fff6e6', width = 3, alpha = 1, label = '', labelFont = '500 26px "Space Grotesk"' } = {}) {
    if (alpha <= 0) return;
    const ctx = E.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // shaft
    ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(0, 0); ctx.stroke();
    // head
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-20, -11); ctx.lineTo(-15, 0); ctx.lineTo(-20, 11); ctx.closePath(); ctx.fill();
    // fletching
    for (let k = 0; k < 3; k++) {
      const fx = -len + 8 + k * 10;
      ctx.beginPath(); ctx.moveTo(fx, 0); ctx.lineTo(fx - 14, -12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx, 0); ctx.lineTo(fx - 14, 12); ctx.stroke();
    }
    if (label) {
      ctx.font = labelFont;
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, -len + 40, -10);
    }
    ctx.restore();
  }

  function ripple(cx, cy, p, { maxR = 160, color = '255,250,235', alpha = 1 } = {}) {
    if (p <= 0 || p >= 1) return;
    const ctx = E.ctx;
    ctx.save();
    for (let k = 0; k < 3; k++) {
      const q = E.clamp(p - k * 0.12);
      if (q <= 0) continue;
      ctx.strokeStyle = `rgba(${color},${alpha * (1 - q) * 0.6})`;
      ctx.lineWidth = 2.5 * (1 - q) + 0.5;
      ctx.beginPath(); ctx.arc(cx, cy, maxR * E.easeOutCubic(q), 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }

  // -------------------------------------------------------------- seated faceless figure
  // Outline of a seated meditator from the front (cushion, crossed legs, torso, shoulders, neck).
  // head: 0..1 (0 = no head, 1 = full head outline). Coordinates centered at (cx, cy) = navel, scale s.
  function seatedPath(ctx, cx, cy, s) {
    ctx.beginPath();
    // torso + shoulders + neck (symmetrical), starting at left hip
    const P = (x, y) => [cx + x * s, cy + y * s];
    let p = P(-0.62, 0.42); ctx.moveTo(...p);
    ctx.bezierCurveTo(...P(-0.62, 0.05), ...P(-0.52, -0.35), ...P(-0.58, -0.62)); // left side up to armpit
    ctx.bezierCurveTo(...P(-0.62, -0.8), ...P(-0.55, -0.92), ...P(-0.36, -0.98)); // shoulder
    ctx.bezierCurveTo(...P(-0.22, -1.02), ...P(-0.14, -1.04), ...P(-0.12, -1.13)); // neck base left
    ctx.lineTo(...P(-0.1, -1.24));
    ctx.moveTo(...P(0.1, -1.24));
    ctx.lineTo(...P(0.12, -1.13));
    ctx.bezierCurveTo(...P(0.14, -1.04), ...P(0.22, -1.02), ...P(0.36, -0.98));
    ctx.bezierCurveTo(...P(0.55, -0.92), ...P(0.62, -0.8), ...P(0.58, -0.62));
    ctx.bezierCurveTo(...P(0.52, -0.35), ...P(0.62, 0.05), ...P(0.62, 0.42));
    // crossed legs
    ctx.moveTo(...P(-0.62, 0.42));
    ctx.bezierCurveTo(...P(-1.25, 0.45), ...P(-1.35, 0.72), ...P(-1.05, 0.82));
    ctx.bezierCurveTo(...P(-0.6, 0.92), ...P(0.6, 0.92), ...P(1.05, 0.82));
    ctx.bezierCurveTo(...P(1.35, 0.72), ...P(1.25, 0.45), ...P(0.62, 0.42));
    // ankle crease
    ctx.moveTo(...P(-0.35, 0.68)); ctx.bezierCurveTo(...P(-0.1, 0.62), ...P(0.15, 0.62), ...P(0.42, 0.7));
    // arms: from shoulders down to hands resting in lap
    ctx.moveTo(...P(-0.5, -0.85));
    ctx.bezierCurveTo(...P(-0.82, -0.5), ...P(-0.85, 0.1), ...P(-0.55, 0.3));
    ctx.bezierCurveTo(...P(-0.35, 0.42), ...P(-0.12, 0.4), ...P(0, 0.36));
    ctx.moveTo(...P(0.5, -0.85));
    ctx.bezierCurveTo(...P(0.82, -0.5), ...P(0.85, 0.1), ...P(0.55, 0.3));
    ctx.bezierCurveTo(...P(0.35, 0.42), ...P(0.12, 0.4), ...P(0, 0.36));
    // cushion
    ctx.moveTo(...P(-1.15, 0.9));
    ctx.bezierCurveTo(...P(-1.25, 1.12), ...P(1.25, 1.12), ...P(1.15, 0.9));
  }
  function seated(cx, cy, s, { color = '#fff6e6', width = 3, alpha = 1, head = 0, dash = 0, fill = null, glow = 0 } = {}) {
    if (alpha <= 0) return;
    const ctx = E.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dash > 0) ctx.setLineDash([18 * (1 - dash) + 2, 10 + 30 * dash]);
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
    if (fill) {
      // body silhouette fill (simplified)
      ctx.save();
      seatedPath(ctx, cx, cy, s);
      ctx.fillStyle = fill;
      ctx.restore();
    }
    seatedPath(ctx, cx, cy, s);
    ctx.stroke();
    if (head > 0) {
      ctx.setLineDash([12, 12]);
      ctx.globalAlpha = alpha * head;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 1.52 * s, 0.3 * s, 0.36 * s, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  // -------------------------------------------------------------- stylized hand (sticker style)
  // open: 0 (fist) .. 1 (open palm, fingers spread). Drawn palm-up-ish from the side.
  function hand(cx, cy, s, open, { fill = '#fff6e6', outline = '#1e2430', ow = 6, alpha = 1, rot = 0, fingerDelay = 0.12 } = {}) {
    if (alpha <= 0) return;
    const ctx = E.ctx;
    const shapes = [];
    // palm
    shapes.push(c => { c.beginPath(); c.roundRect(-0.55 * s, -0.3 * s, 1.1 * s, 0.95 * s, 0.32 * s); });
    // wrist
    shapes.push(c => { c.beginPath(); c.roundRect(-0.38 * s, 0.5 * s, 0.76 * s, 0.7 * s, 0.2 * s); });
    // fingers: 4 from top edge of palm, each 2 segments. curl angle depends on open with stagger
    const fx = [-0.4, -0.13, 0.14, 0.4];
    const flen = [0.55, 0.66, 0.62, 0.48];
    fx.forEach((x, i) => {
      const o = E.smoother(E.clamp((open - i * fingerDelay) / (1 - 3 * fingerDelay)));
      const spread = (i - 1.5) * 0.12 * o;
      const curl1 = (1 - o) * 1.9; // radians, curling toward viewer/down over palm
      const curl2 = (1 - o) * 1.6;
      const fw = 0.24 * s;
      shapes.push(c => {
        c.save();
        c.translate(x * s, -0.25 * s);
        c.rotate(spread);
        // proximal segment (foreshortened by curl)
        const l1 = flen[i] * 0.55 * s * Math.max(0.25, Math.cos(curl1 * 0.6));
        c.beginPath(); c.roundRect(-fw / 2, -l1 - fw / 2, fw, l1 + fw, fw / 2);
        c.translate(0, -l1);
        c.rotate(Math.PI * 0 + (curl1 > 0 ? 0 : 0));
        const l2 = flen[i] * 0.45 * s * Math.cos(Math.min(1.5, curl2 * 0.95));
        const dir = curl1 > 0.8 ? 1 : -1; // flips over palm when tightly curled
        c.roundRect(-fw / 2, dir > 0 ? -fw / 2 : -Math.abs(l2) - fw / 2, fw, Math.abs(l2) + fw, fw / 2);
        c.restore();
      });
    });
    // thumb
    shapes.push(c => {
      const o = E.smoother(open);
      c.save();
      c.translate(-0.5 * s, 0.25 * s);
      c.rotate(-0.5 - 0.6 * o + (1 - o) * 1.2);
      c.beginPath(); c.roundRect(-0.13 * s, -0.62 * s, 0.26 * s, 0.7 * s, 0.13 * s);
      c.restore();
    });
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    // outline pass
    ctx.lineWidth = ow * 2;
    ctx.strokeStyle = outline;
    ctx.lineJoin = 'round';
    shapes.forEach(f => { f(ctx); ctx.stroke(); });
    ctx.fillStyle = fill;
    shapes.forEach(f => { f(ctx); ctx.fill(); });
    ctx.restore();
  }

  // -------------------------------------------------------------- flying thought fragments (pseudo 3D)
  function thoughts(t, words, { alpha = 1, speed = 0.35, color = '255,246,230', seed = 2, font = 'JetBrains Mono, "Space Grotesk"', depthMin = 0.15 } = {}) {
    if (alpha <= 0) return;
    const ctx = E.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const items = words.map((w, i) => {
      const r1 = H(i * 1.9 + seed), r2 = H(i * 3.3 + seed), r3 = H(i * 4.7 + seed);
      let z = ((r3 - t * speed * (0.7 + r1 * 0.6)) % 1 + 1) % 1; // 1 far -> 0 near
      z = depthMin + z * (1 - depthMin);
      return { w, x: (r1 - 0.5) * 2.2, y: (r2 - 0.5) * 2.4, z };
    }).sort((a, b) => b.z - a.z);
    for (const it of items) {
      const sc = 1 / it.z;
      const x = E.W / 2 + it.x * 300 * sc, y = E.H / 2 + it.y * 300 * sc;
      const size = 14 * sc;
      if (size > 140 || x < -300 || x > E.W + 300 || y < -200 || y > E.H + 200) continue;
      const a = alpha * E.clamp((1 - it.z) * 2.5) * E.clamp((140 - size) / 60);
      ctx.font = `500 ${size.toFixed(1)}px ${font}`;
      ctx.fillStyle = `rgba(${color},${a * 0.85})`;
      if (size > 60) ctx.filter = `blur(${((size - 60) / 12).toFixed(1)}px)`; else ctx.filter = 'none';
      ctx.fillText(it.w, x, y);
    }
    ctx.restore();
  }

  window.PRIM = { rain, bolt, motes, stars, godrays, blob, arrow, ripple, seated, hand, thoughts, vnoise };
})();

// -------------------------------------------------------------- ensō brush circle
// p: 0..1 drawn progress, unp: 0..1 erased from tail. Gap at top-right.
(function () {
  const E = window.ENGINE, H = E.hash, TAU = Math.PI * 2;
  function enso(cx, cy, r, p, { color = '255,214,140', alpha = 1, width = 64, start = -0.95, sweep = 5.6, unp = 0, glow = 16, seed = 2 } = {}) {
    if (p <= 0 || alpha <= 0) return;
    const ctx = E.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    const N = 320;
    const prof = f => (f < 0.04 ? 0.75 + f / 0.04 * 0.45 : 1.2 - 0.95 * Math.pow((f - 0.04) / 0.96, 1.35));
    const pt = (f, off) => {
      const a = start + f * sweep;
      const rr = r * (1 + 0.03 * Math.sin(a * 2 + seed) + 0.012 * Math.sin(a * 5 + seed * 3));
      const rad = rr + off * width * prof(f);
      return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
    };
    const f0 = Math.max(unp, 0), f1 = Math.min(p, 1);
    // solid core ribbon (wet ink) for the first part
    const coreEnd = Math.min(f1, 0.62);
    if (coreEnd > f0) {
      ctx.beginPath();
      const M = 160;
      for (let i = 0; i <= M; i++) { const f = f0 + (coreEnd - f0) * i / M; const q = pt(f, -0.32); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
      for (let i = M; i >= 0; i--) { const f = f0 + (coreEnd - f0) * i / M; const q = pt(f, 0.32); ctx.lineTo(q[0], q[1]); }
      ctx.closePath();
      ctx.fillStyle = `rgba(${color},0.92)`;
      if (glow) { ctx.shadowColor = `rgba(${color},0.55)`; ctx.shadowBlur = glow; }
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // bristles
    const nb = 34;
    for (let b = 0; b < nb; b++) {
      const off = (b / (nb - 1) - 0.5);
      const dry = H(b * 3.7 + seed);
      const endF = 0.7 + 0.3 * H(b * 5.1 + seed) - Math.abs(off) * 0.35; // outer bristles end sooner
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= N; i++) {
        const f = i / N;
        if (f > f1 || f < f0 || f > endF) { started = false; continue; }
        const gap = f > 0.5 && Math.sin(f * (40 + dry * 50) + b * 2.3) > 1.15 - (f - 0.5) * 1.6 * (0.4 + dry);
        if (gap) { started = false; continue; }
        const q = pt(f, off);
        if (!started) { ctx.moveTo(q[0], q[1]); started = true; } else ctx.lineTo(q[0], q[1]);
      }
      ctx.strokeStyle = `rgba(${color},${0.35 + 0.6 * H(b * 1.9 + seed)})`;
      ctx.lineWidth = Math.max(1.2, width / nb * (1.2 + H(b * 7.7) * 1.2));
      ctx.lineCap = 'round';
      if (glow) { ctx.shadowColor = `rgba(${color},0.35)`; ctx.shadowBlur = glow * 0.5; }
      ctx.stroke();
    }
    ctx.restore();
  }
  window.PRIM.enso = enso;
})();
