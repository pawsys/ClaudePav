// ACT 1 (0-18 s): CLENCHED. Storm, yellow Anton, deadpan field guide.
// Everything is a pure function of t. Beats follow BRIEF.md; word times come from timing.js.
(function () {
  const E = ENGINE, P = PRIM, G = GRABBY, PAL = C.PAL;
  const W = E.W, H = E.H, TAU = Math.PI * 2;
  const clamp = E.clamp, lerp = E.lerp, range = E.range, hash = E.hash;
  const F = n => n / 30;

  // ------------------------------------------------------------------ small helpers
  // first rendered frame time at/after t0 (scene starts like 2.25 fall between frames)
  const ff = t0 => Math.ceil(t0 * 30 - 1e-6) / 30;
  // spoken word times minus a lead (3.3 frames), never earlier than the scene's first frame. A word that lands
  // on the cut gets time (firstFrame - 1 ms), so its full 1.08 -> 1.0 pop plays on the cut frame + 1.
  function wt(id, sceneT0 = 0, lead = 0.11) { const m = ff(sceneT0) - 0.001; return C.line(id).word_t.map(x => Math.max(m, x - lead)); }
  // attack/decay envelope peaking at t0
  function env(t, t0, att, dec) {
    if (t < t0 - att) return 0;
    if (t < t0) return E.smooth((t - (t0 - att)) / att);
    return Math.max(0, 1 - (t - t0) / dec);
  }
  // world -> screen for C.camera(scale, cx, cy)
  const cam = (k, cx, cy) => ([x, y]) => [cx + k * (x - cx), cy + k * (y - cy)];
  function poly(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); }

  // grabbygrab's face geometry (mirrors grabby.js) so lids / jaw marks can be drawn on top
  function faceOf(t, cx, cy, s, look = [0, 0], bobAmt = 1) {
    const by = cy + bobAmt * Math.sin(t * 3.1) * 0.025 * s;
    const ex = cx + look[0] * 0.08 * s, ey = by - 0.12 * s + look[1] * 0.06 * s;
    return { ex, ey, s, eyeR: 0.072 * s, mouthY: ey + 0.15 * s, by };
  }
  const hookFace = (t, look = [0, 0]) => faceOf(t, 540, 960, 300, look, 0.3);

  // ------------------------------------------------------------------ warm-white ink lightning bolt
  // jagged main stroke + 2 forks; 7 px core over a 14 px soft halo (flat, no blur)
  function boltPath(x0, y0, x1, y1, seed) {
    const pts = [[x0, y0]];
    const N = 9, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    for (let i = 1; i < N; i++) {
      // zigzag: alternate sides, irregular amplitude
      const f = i / N + (hash(seed + i * 7.7) - 0.5) * 0.05;
      const off = (i % 2 ? 1 : -1) * (18 + 34 * hash(seed * 13.7 + i * 3.1)) * (0.5 + 0.5 * Math.sin(f * Math.PI));
      pts.push([x0 + dx * f + nx * off, y0 + dy * f + ny * off]);
    }
    pts.push([x1, y1]);
    const forks = [3, 6].map((k, j) => {
      const p = pts[k], sd = j ? -1 : 1, fl = [p];
      for (let i = 1; i <= 3; i++) fl.push([p[0] + sd * (38 * i + (i % 2 ? 16 : -10)), p[1] + 52 * i + (hash(seed * 5 + i * 2 + j) - 0.5) * 20]);
      return fl;
    });
    return { pts, forks };
  }
  function inkBolt(x0, y0, x1, y1, seed, alpha) {
    if (alpha <= 0.01) return;
    const ctx = E.ctx;
    const { pts, forks } = boltPath(x0, y0, x1, y1, seed);
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalAlpha = alpha;
    [[pts, 1], ...forks.map(f => [f, 0.6])].forEach(([pp, w]) => {
      poly(ctx, pp);
      ctx.strokeStyle = 'rgba(255,246,224,0.35)'; ctx.lineWidth = 14 + 14 * w; ctx.stroke();
    });
    [[pts, 1], ...forks.map(f => [f, 0.6])].forEach(([pp, w]) => {
      poly(ctx, pp);
      ctx.strokeStyle = PAL.warmWhite; ctx.lineWidth = 7 * (w < 1 ? 0.75 : 1); ctx.lineJoin = 'miter'; ctx.stroke();
    });
    ctx.restore();
  }
  // ------------------------------------------------------------------ squeeze pulse: 3-frame shake + strain face
  // window = 3 frames starting at the first frame at/after t0 - 0.01
  function pulseFrame(t, t0) { const f = Math.floor((t - (t0 - 0.01)) * 30 + 1e-6); return f >= 0 && f < 3 ? f : -1; }
  function pulseShake(t, t0) {
    const f = pulseFrame(t, t0);
    if (f < 0) return [0, 0];
    const a = [5, -4, 2][f];
    return [a, Math.round(-a * 0.6)];
  }
  // '> <' eyes at 1.3x + two ink strain ticks at the temples, drawn over the rig's own squeeze eyes (world space)
  function strainFace(f) {
    const ctx = E.ctx;
    const { ex, ey, s } = f;
    const w = 0.075 * s * 1.3, h = 0.06 * s * 1.3, lw = Math.max(2, 5 * Math.max(0.35, s / 230) * 0.95) * 1.25;
    ctx.save();
    ctx.fillStyle = G.CREAM;
    [-1, 1].forEach(sd => { const x = ex + sd * 0.2 * s; ctx.fillRect(x - 0.12 * s, ey - 0.085 * s, 0.24 * s, 0.17 * s); });
    ctx.strokeStyle = G.INK; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [-1, 1].forEach(sd => {
      const x = ex + sd * 0.2 * s;
      ctx.beginPath(); ctx.moveTo(x - sd * w, ey - h); ctx.lineTo(x + sd * w * 0.6, ey); ctx.lineTo(x - sd * w, ey + h); ctx.stroke();
    });
    // two strain ticks at the right temple, radiating up/out (the left temple has the sweat drop)
    for (let i = 0; i < 2; i++) {
      const a = -Math.PI / 2 + 0.45 + i * 0.5;
      const cx = ex + 0.3 * s, cy = ey - 0.13 * s;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 0.035 * s, cy + Math.sin(a) * 0.035 * s);
      ctx.lineTo(cx + Math.cos(a) * 0.12 * s, cy + Math.sin(a) * 0.12 * s); ctx.stroke();
    }
    ctx.restore();
  }
  // PRIM.blob's outline (same jitter + wobble maths), used to stroke a warm rim behind the held blob
  function blobRimPath(ctx, t, cx, cy, r, { jitter = 1, seed = 5, squash = 0 } = {}) {
    const jx = jitter * (Math.sin(t * 190) * 3 + Math.sin(t * 263 + 1) * 2);
    const jy = jitter * (Math.cos(t * 211) * 3 + Math.sin(t * 157 + 2) * 2);
    ctx.translate(cx + jx, cy + jy);
    ctx.scale(1 + squash, 1 - squash);
    ctx.beginPath();
    for (let i = 0; i <= 90; i++) {
      const a = i / 90 * TAU;
      const wob = 0.08 * P.vnoise(Math.cos(a) * 2 + seed + t * 0.8) + 0.05 * P.vnoise(Math.sin(a) * 3 + seed * 2 - t * 1.1) + jitter * 0.03 * Math.sin(a * 9 + t * 120);
      const x = Math.cos(a) * r * (1 + wob), y = Math.sin(a) * r * (1 + wob);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  // ------------------------------------------------------------------ thought bubble (white line art)
  function bubblePath(ctx, cx, cy, rx, ry, n = 9, seed = 2) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + i / n * TAU + (hash(i + seed) - 0.5) * 0.22;
      pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < n; i++) {
      const p0 = pts[i], p1 = pts[(i + 1) % n];
      const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
      let nx = (mx - cx) / (rx * rx), ny = (my - cy) / (ry * ry);
      const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      const seg = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      const b = seg * (0.62 + 0.12 * hash(i * 3.3 + seed));
      ctx.quadraticCurveTo(mx + nx * b, my + ny * b, p1[0], p1[1]);
    }
    ctx.closePath();
  }
  function calendarGlyph(ctx, cx, cy, s, col) {
    ctx.save();
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const w = 1.0 * s, h = 0.86 * s;
    ctx.beginPath(); ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - w / 2, cy - h / 2 + 0.24 * s); ctx.lineTo(cx + w / 2, cy - h / 2 + 0.24 * s); ctx.stroke();
    [-0.24, 0.24].forEach(dx => { ctx.beginPath(); ctx.moveTo(cx + dx * s, cy - h / 2 - 0.12 * s); ctx.lineTo(cx + dx * s, cy - h / 2 + 0.08 * s); ctx.stroke(); });
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      const x = cx + (c - 1) * 0.27 * s, y = cy + 0.1 * s + r * 0.22 * s;
      if (r === 1 && c === 2) {          // the day that is "later": circled
        ctx.beginPath(); ctx.arc(x, y, 0.1 * s, 0, TAU); ctx.stroke();
      } else { ctx.beginPath(); ctx.arc(x, y, 0.045 * s, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }
  // full thought bubble with trailing circles from (fromX, fromY). k: pop 0..1, sx/sy squash
  function thoughtBubble(t, cx, cy, k, { fromX, fromY, sx = 1, sy = 1, alpha = 1, trail = 1 } = {}) {
    if (k <= 0 || alpha <= 0) return;
    const ctx = E.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    const col = PAL.warmWhite;
    // trailing circles
    if (trail > 0) {
      const tr = [[0.18, 11], [0.42, 16], [0.68, 22]];
      tr.forEach(([f, r], i) => {
        if (trail * 3 < i + 0.5) return;
        const x = lerp(fromX, cx, f), y = lerp(fromY, cy + 70, f);
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
        ctx.fillStyle = 'rgba(18,16,24,0.55)'; ctx.fill();
        ctx.lineWidth = 6; ctx.strokeStyle = col; ctx.stroke();
      });
    }
    ctx.translate(cx, cy);
    const pop = E.easeOutCubic(k);
    ctx.scale((0.55 + 0.45 * pop) * sx, (0.55 + 0.45 * pop) * sy);
    bubblePath(ctx, 0, 0, 128, 86);
    ctx.fillStyle = 'rgba(18,16,24,0.62)'; ctx.fill();
    ctx.lineWidth = 7; ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.stroke();
    calendarGlyph(ctx, 0, 4, 96, col);
    ctx.restore();
  }

  // ------------------------------------------------------------------ eyes drawn over the rig's 'dots' eyes
  // guilty side-eye: white eyes, pupils sliding (px -1..1), heavy flat lids (lid 0..1 of eye height)
  function sideEyes(f, px, lid) {
    const ctx = E.ctx;
    const { ex, ey, s, eyeR } = f;
    const ow = Math.max(4, s / 230 * 5.5);
    [-1, 1].forEach(sd => {
      const x = ex + sd * 0.2 * s, y = ey;
      const rx = eyeR * 1.28, ry = eyeR * 1.4;
      ctx.save();
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
      ctx.fillStyle = '#FFFDF8'; ctx.fill();
      ctx.clip();
      ctx.beginPath(); ctx.ellipse(x + px * rx * 0.52, y + ry * 0.22, eyeR * 0.62, eyeR * 0.74, 0, 0, TAU);
      ctx.fillStyle = G.INK; ctx.fill();
      ctx.restore();
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
      ctx.strokeStyle = G.INK; ctx.lineWidth = ow; ctx.stroke();
      const ly = y - ry + lid * 2 * ry;
      const droop = sd * 0.1 * ry;                  // outer corners droop a little: sheepish, not angry
      ctx.beginPath();
      ctx.moveTo(x - rx - 9, y - ry - 12); ctx.lineTo(x + rx + 9, y - ry - 12);
      ctx.lineTo(x + rx + 9, ly + droop); ctx.lineTo(x - rx - 9, ly - droop); ctx.closePath();
      ctx.fillStyle = G.CREAM; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - rx - 4, ly - droop); ctx.lineTo(x + rx + 4, ly + droop);
      ctx.lineCap = 'round'; ctx.lineWidth = ow * 1.15; ctx.stroke();
    });
  }
  // slow deadpan blink over 'dots' eyes: amt 0 open .. 1 shut
  function blinkLids(f, amt) {
    if (amt <= 0) return;
    const ctx = E.ctx;
    const { ex, ey, s, eyeR } = f;
    const ow = Math.max(4, s / 230 * 5);
    [-1, 1].forEach(sd => {
      const x = ex + sd * 0.2 * s;
      const top = ey - eyeR * 1.4, ly = top + amt * eyeR * 2.6;
      ctx.fillStyle = G.CREAM;
      ctx.fillRect(x - eyeR * 1.2, top - 4, eyeR * 2.4, ly - top + 4);
      ctx.beginPath(); ctx.moveTo(x - eyeR * 1.05, ly); ctx.lineTo(x + eyeR * 1.05, ly);
      ctx.strokeStyle = G.INK; ctx.lineWidth = ow * 1.1; ctx.lineCap = 'round'; ctx.stroke();
    });
  }

  // ================================================================== 0.00-2.25 HOOK (frame 0 = poster)
  function hookCaption(t) {
    C.caption(t, { text: "YOU'RE CLENCHING | SOMETHING | RIGHT NOW.", id: 'V01', lead: 0.11, style: 'anton', size: 134, y: 342, allFrom: 0 });
    C.caption(t, { text: '(NOT YOUR JAW.)', style: 'antonWhite', size: 80, y: 604, allFrom: 0, times: [99, 99, 99] });
  }
  // lightning: [time, x0, y0, x1, y1, seed]
  const HOOK_BOLTS = [[0.40, 960, 110, 840, 720, 3], [1.60, 110, 130, 230, 700, 7]];
  function bolts(t, list) {
    list.forEach(([bt, x0, y0, x1, y1, seed]) => inkBolt(x0, y0, x1, y1, seed, C.flashEnv(t + 1e-6, [bt])));
  }
  SCN.add(0, 2.25, 'a1-hook', (t) => {
    const ctx = E.ctx;
    const flash = C.flashEnv(t + 1e-6, [0.40, 1.60]);   // +1e-6: 12/30 < 0.40 in floating point
    const camK = 1 + 0.03 * E.easeInOutSine(range(t, 1.0, 2.25));
    const sq = env(t, 1.36, F(3), 0.45);                 // squeeze pulse on "right now"
    // frame 0: identical to C.hookBase(0, {}) (flash 0, bolt alpha 0, squeeze 0)
    C.stormBG(t, { flash: 0.35 * flash });
    bolts(t, HOOK_BOLTS);
    const [shx, shy] = pulseShake(t, 1.36);
    ctx.save();
    ctx.translate(shx, shy);
    C.hookBase(t, { bg: false, flash, cam: camK, squeeze: sq, jitter: 1 + 1.2 * sq, arm: { tremble: Math.round(5 * sq) },
      sweatDrip: E.easeInCubic(range(t, 1.38, 2.1)),
      over: () => { if (pulseFrame(t, 1.36) >= 0) strainFace(hookFace(t)); } });
    hookCaption(t);
    ctx.restore();
  });

  // ================================================================== 2.25-3.75 NOT YOUR JAW.
  SCN.add(2.25, 3.75, 'a1-jaw', (t) => {
    const reclench = t >= 3.0;
    // close-up: face ~2.2x (eyes ~y 830, mouth ~y 930); blob + mitten sit lower right. Jitter scaled down so the
    // on-screen vibration stays ~5 px at this zoom.
    const k = 2.2, cx = 540, cy = 1000;
    C.hookBase(t, {
      cam: k, camX: cx, camY: cy, sweatDrip: 0.15, jitter: 0.55,
      mouth: reclench ? 'zigzag' : 'flat', squeeze: reclench ? env(t, 3.0 + F(2), F(2), 0.3) : 0,
      over: () => {
        if (!reclench) return;
        // jaw-clench marks at the mouth corners
        const f = hookFace(t);
        const ctx = E.ctx;
        ctx.save(); ctx.strokeStyle = G.INK; ctx.lineWidth = 6; ctx.lineCap = 'round';
        [-1, 1].forEach(sd => {
          for (let i = 0; i < 3; i++) {
            const a = (sd > 0 ? 0 : Math.PI) + (i - 1) * 0.5;
            const x0 = f.ex + sd * 34, y0 = f.mouthY;
            ctx.beginPath();
            ctx.moveTo(x0 + Math.cos(a) * 16, y0 + Math.sin(a) * 16);
            ctx.lineTo(x0 + Math.cos(a) * 30, y0 + Math.sin(a) * 30);
            ctx.stroke();
          }
        });
        ctx.restore();
      },
    });
    C.caption(t, { text: 'NOT YOUR JAW.', times: wt('V03', 2.25), style: 'anton', size: 160, y: 250 });
    C.mono(t, '(ok, also your jaw)', 540, 372, { size: 48, align: 'center', t0: 3.0, color: PAL.warmWhite });
  });

  // ================================================================== 3.75-5.25 A THOUGHT ABOUT LATER.
  const HOLD = { tx: 740, ty: 1052, ang: Math.PI * 0.97 };
  const BUB = { x: 800, y: 600 };
  const SN = { s0: 4.50, s1: 4.50 + F(5), s2: 4.50 + F(8), s3: 4.50 + F(15) };   // reach, squish, return
  function snatch(t) {
    // returns arm pose + bubble state + blob growth for the snatch at 4.50
    const reachT = { tx: BUB.x + 30, ty: BUB.y + 92, ang: -1.05 };
    let a = 0, pose;
    if (t < SN.s0) pose = HOLD;
    else if (t < SN.s1) { a = E.easeOutExpo(range(t, SN.s0, SN.s1)); pose = mixPose(HOLD, reachT, a); }
    else if (t < SN.s2) pose = reachT;
    else {
      // return leg: swing the angle CLOCKWISE (no wrap) and arc the fist outward, so the held blob trails
      // below/right of the fist and never crosses his face
      const k = E.easeInOutSine(range(t, SN.s2, SN.s3));
      pose = { tx: lerp(reachT.tx, HOLD.tx, k) + 90 * Math.sin(Math.PI * k), ty: lerp(reachT.ty, HOLD.ty, k), ang: lerp(reachT.ang, HOLD.ang, k) };
    }
    const grow = E.smooth(range(t, SN.s1, SN.s3));
    return { pose, grow };
  }
  function mixPose(A, B, k) {
    let a0 = A.ang, a1 = B.ang;
    while (a1 - a0 > Math.PI) a1 -= TAU; while (a0 - a1 > Math.PI) a1 += TAU;
    return { tx: lerp(A.tx, B.tx, k), ty: lerp(A.ty, B.ty, k), ang: lerp(a0, a1, k) };
  }
  function laterState(t) {
    const { pose, grow } = snatch(t);
    return { pose, blobR: 78 * (1 + 0.15 * grow), dark: 0.35 * grow, jitter: 1 + 0.5 * grow };
  }
  SCN.add(3.75, 5.25, 'a1-later', (t) => {
    const st = laterState(t);
    const smear = t >= SN.s0 && t < SN.s1 + F(1);
    const impact = env(t, SN.s1 + F(1), F(1), 0.35);
    // 4.50-4.95: warm rim so the dark blob reads against the dark storm while it is out at arm's length
    const rim = range(t, SN.s0 - F(1), SN.s0) * (1 - range(t, 4.92, 4.97));
    C.hookBase(t, {
      cam: 1.03, sweatDrip: 0.15,
      blobR: st.blobR, dark: st.dark, jitter: st.jitter + impact, squeeze: impact * 0.6,
      arm: { tx: st.pose.tx, ty: st.pose.ty, ang: st.pose.ang },
      underBlob: rim > 0 ? (x, y, r, sqz) => {
        const ctx = E.ctx;
        ctx.save(); blobRimPath(ctx, t, x, y, r, { jitter: st.jitter + impact, seed: 5, squash: sqz });
        ctx.lineJoin = 'round'; ctx.lineWidth = 12; ctx.strokeStyle = `rgba(255,246,224,${0.6 * rim})`; ctx.stroke();
        ctx.restore();
      } : null,
      over: (info) => {
        const ctx = E.ctx;
        // bubble: pops at 3.90, gets squished into the blob on impact
        const k = range(t, 3.90, 3.90 + F(3));
        if (t < SN.s1) {
          const bob = Math.sin(t * 2.4) * 4;
          thoughtBubble(t, BUB.x, BUB.y + bob, k, { fromX: 640, fromY: 745, trail: range(t, 3.86, 3.98) });
        } else if (t < SN.s2 + F(2)) {
          const q = range(t, SN.s1, SN.s2 + F(2));
          // squished flat against the blob and sucked in
          thoughtBubble(t, lerp(BUB.x, info.x, q), lerp(BUB.y, info.y, q), 1,
            { sx: lerp(1.25, 0.15, q), sy: lerp(0.55, 0.1, q), trail: 0, alpha: 1 - q * 0.4 });
        }
        // smear: speed lines + ghost fists behind the shooting arm
        if (smear) {
          const p0 = snatch(t - F(2)).pose, p1 = st.pose;
          ctx.save(); ctx.lineCap = 'round';
          for (let i = 0; i < 4; i++) {
            const off = (i - 1.5) * 26;
            const nx = -(p1.ty - p0.ty), ny = p1.tx - p0.tx, nl = Math.hypot(nx, ny) || 1;
            const ox = nx / nl * off, oy = ny / nl * off;
            ctx.strokeStyle = 'rgba(255,246,224,0.85)'; ctx.lineWidth = 6;
            const dx = p1.tx - p0.tx, dy = p1.ty - p0.ty, dl = Math.hypot(dx, dy) || 1;
            const ux = dx / dl, uy = dy / dl, L0 = 70 + 18 * Math.abs(i - 1.5), L1 = L0 + 150 - 30 * Math.abs(i - 1.5);
            ctx.beginPath(); ctx.moveTo(p1.tx - ux * L0 + ox, p1.ty - uy * L0 + oy);
            ctx.lineTo(p1.tx - ux * L1 + ox, p1.ty - uy * L1 + oy); ctx.stroke();
          }
          ctx.restore();
        }
      },
    });
    C.caption(t, { text: 'A THOUGHT | ABOUT LATER.', times: wt('V04', 3.75), style: 'anton', size: 150, y: 285 });
  });

  // ================================================================== 5.25-6.00 FREEZE: THAT ONE.
  const TF = 5.25 - F(1);                              // frozen animation clock
  const FZ = { k: 1.22, x: 670, y: 1040 };             // hard punch-in centred on the blob
  // the frozen storm is constant: render the shader once, keep the bitmap (desaturated ~25%)
  let freezeBgCv = null;
  function freezeBgCache() {
    if (!freezeBgCv) {
      E.sky(Object.assign({ t: TF }, C.STORM, { flash: 0 }));
      freezeBgCv = document.createElement('canvas'); freezeBgCv.width = W; freezeBgCv.height = H;
      const g = freezeBgCv.getContext('2d');
      g.filter = 'saturate(0.75)';
      g.drawImage(E.glCanvas, 0, 0, W, H);
    }
    return freezeBgCv;
  }
  const freezeBG = () => E.ctx.drawImage(freezeBgCache(), 0, 0);
  function sweatBead(ctx, x, y, s, k) {
    if (k <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = '#BFE3F5'; ctx.strokeStyle = G.INK; ctx.lineWidth = 4; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -0.09 * s); ctx.quadraticCurveTo(0.055 * s, 0, 0, 0.04 * s); ctx.quadraticCurveTo(-0.055 * s, 0, 0, -0.09 * s);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function freezeFrame(t, { loop = true, bg = true } = {}) {
    const st = laterState(TF);
    const awake = t >= 5.40;
    const glance = E.smoother(range(t, 5.50, 5.92));   // pupils slide from the blob to meet the viewer
    const look = [-1.0, -0.2];                         // head turned away from the blob: visible turn
    if (bg) freezeBG();
    return C.hookBase(TF, {
      bg: false, cam: FZ.k, camX: FZ.x, camY: FZ.y, sweatDrip: 0.15,
      blobR: st.blobR, dark: st.dark, jitter: st.jitter,
      arm: { tx: st.pose.tx, ty: st.pose.ty, ang: st.pose.ang },
      eyes: awake ? 'dots' : 'squeeze', mouth: awake ? 'flat' : 'zigzag', blink: false, look: awake ? look : [0, 0],
      over: (info) => {
        if (awake) {
          const f = hookFace(TF, look);
          sideEyes(f, lerp(0.95, 0.0, glance), 0.35);
          // a second sweat bead pops on the far temple as he meets your eye
          const kb = E.easeOutCubic(range(t, 5.75, 5.75 + F(2)));
          sweatBead(E.ctx, f.ex + 0.36 * 300, f.ey - 0.17 * 300, 300, kb);
        }
        if (loop) C.markerLoop(info.x, info.y, info.r * 1.42, info.r * 1.24, range(t, 5.29, 5.29 + F(12)), { width: 10 / FZ.k, loops: 2, seed: 4 });
      },
    });
  }
  const freezeFrameFG = () => freezeFrame(5.99, { bg: false });
  SCN.add(5.25, 6.0, 'a1-thatone', (t) => {
    freezeFrame(t);
    C.caption(t, { text: 'THAT ONE.', times: wt('V05', 5.25), style: 'anton', size: 170, y: 270 });
  });

  // ------------------------------------------------------------------ horizontal motion blur (box, 2^k taps)
  // k passes of "average the frame with itself shifted by +-d/2", d = L/2, L/4, ... -> a symmetric box blur of
  // length L with 2^k evenly spaced taps (tap spacing <= ~4 px, so 6 px line art smears instead of ghosting).
  // Uncovered edges are filled with the storm colour. Cost: k copies + 2k blits.
  // Runs on a half-resolution copy (half in y too for long blurs) and is stretched back: a >= 20 px horizontal
  // smear hides the resampling, and it is ~4x cheaper.
  const blurCv = {};
  function blurCanvases(bh) {
    if (!blurCv[bh]) blurCv[bh] = [0, 1].map(() => { const c = document.createElement('canvas'); c.width = W >> 1; c.height = bh; c.getContext('2d').fillRect(0, 0, 1, 1); return c; });
    return blurCv[bh];
  }
  function hblur(L) {
    if (L <= 1) return;
    const ctx = E.ctx;
    const bw = W >> 1, bh = L >= 60 ? H >> 1 : H;
    const [A, B] = blurCanvases(bh), ga = A.getContext('2d'), gb = B.getContext('2d');
    ga.imageSmoothingEnabled = true; ga.imageSmoothingQuality = 'high';
    ga.globalCompositeOperation = 'copy'; ga.globalAlpha = 1;
    ga.drawImage(ctx.canvas, 0, 0, W, H, 0, 0, bw, bh);
    const Lh = L / 2;
    const k = clamp(Math.ceil(Math.log2(Lh / 2.5)), 2, 7);
    let d = Lh / 2;
    for (let i = 0; i < k; i++, d /= 2) {
      gb.globalCompositeOperation = 'copy'; gb.drawImage(A, 0, 0);
      ga.globalCompositeOperation = 'source-over';
      ga.globalAlpha = 1; ga.fillStyle = '#1d1b24'; ga.fillRect(0, 0, bw, bh);
      ga.drawImage(B, -d / 2, 0);
      ga.globalAlpha = 0.5; ga.drawImage(B, d / 2, 0);
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(A, 0, 0, bw, bh, 0, 0, W, H);
    ctx.restore();
  }

  // ================================================================== 6.00-9.00 SOME GUY (bodhi tree)
  const GROUND = 1040;
  function bodhiTree(ctx, k = 1) {
    // five strokes: ground, trunk L, trunk R, branch, canopy
    ctx.save();
    ctx.strokeStyle = PAL.cream; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const st = [];
    st.push(c => { c.moveTo(150, GROUND); c.bezierCurveTo(400, GROUND + 4, 700, GROUND - 4, 930, GROUND); });
    st.push(c => { c.moveTo(728, GROUND); c.bezierCurveTo(748, 960, 700, 860, 690, 650); });
    st.push(c => { c.moveTo(800, GROUND); c.bezierCurveTo(778, 950, 760, 850, 742, 650); });
    st.push(c => { c.moveTo(712, 820); c.bezierCurveTo(660, 760, 600, 700, 520, 640); });
    st.push(c => {
      // canopy: a scalloped dome, open at the bottom
      const n = 11, cx = 600, cy = 680, rx = 380, ry = 250;
      const a0 = Math.PI * 0.98, a1 = Math.PI * 2.02;
      let prev = null;
      for (let i = 0; i <= n; i++) {
        const a = lerp(a0, a1, i / n);
        const p = [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
        if (!prev) c.moveTo(p[0], p[1]);
        else {
          const mx = (prev[0] + p[0]) / 2, my = (prev[1] + p[1]) / 2;
          let nx = (mx - cx) / (rx * rx), ny = (my - cy) / (ry * ry); const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
          const seg = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
          c.quadraticCurveTo(mx + nx * seg * 0.55, my + ny * seg * 0.55, p[0], p[1]);
        }
        prev = p;
      }
    });
    const n = Math.min(st.length, Math.ceil(k * st.length));
    for (let i = 0; i < n; i++) { ctx.beginPath(); st[i](ctx); ctx.stroke(); }
    ctx.restore();
  }
  function bodhiLeaf(ctx, x, y, s, rot) {
    // heart-shaped bodhi leaf with its long drip tip, midrib, short stem
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.strokeStyle = PAL.cream; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.55);
    ctx.bezierCurveTo(s * 0.35, -s * 1.05, s * 1.05, -s * 0.6, s * 0.75, s * 0.05);
    ctx.bezierCurveTo(s * 0.55, s * 0.5, s * 0.15, s * 0.8, 0, s * 1.45);
    ctx.bezierCurveTo(-s * 0.15, s * 0.8, -s * 0.55, s * 0.5, -s * 0.75, s * 0.05);
    ctx.bezierCurveTo(-s * 1.05, -s * 0.6, -s * 0.35, -s * 1.05, 0, -s * 0.55);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.95); ctx.lineTo(0, s * 0.9); ctx.stroke();
    ctx.restore();
  }
  function someGuy(t) {
    const ctx = E.ctx;
    const s = 93, cx = 540, cy = GROUND - 1.12 * s;
    bodhiTree(ctx);
    P.seated(cx, cy, s, { color: PAL.cream, width: 6, head: 0 });
    ctx.save();
    ctx.strokeStyle = PAL.cream; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(cx, cy - 1.5 * s, 0.29 * s, 0.35 * s, 0, 0, TAU); ctx.stroke();
    ctx.restore();
    // one leaf lets go during the suspense gap after "of"
    const lt = range(t, 7.55, 9.0);
    if (lt > 0) {
      const ly = lerp(700, 985, E.easeInOutSine(lt)), lx = 455 + Math.sin(lt * 7) * 34 - lt * 40;
      bodhiLeaf(ctx, lx, ly, 22, Math.PI + Math.sin(lt * 6 + 1) * 0.8);
    }
  }
  // the culprit peeks in from the right edge during the gap
  function peek(t) {
    const p = E.easeOutCubic(range(t, 7.75, 8.15)) - E.easeInCubic(range(t, 8.8, 8.97));
    if (p <= 0) return;
    const x = lerp(1180, 1012, p);
    G.grabby(t, x, 870, 160, { eyes: 'big', look: [-0.9, 0.1], sweat: 1, mouth: 'o', bob: 0.3,
      arm: { ext: 0, open: 0.0 } });
  }
  function someGuyScene(t, { dx = 0 } = {}) {
    const ctx = E.ctx;
    const push = 1 + 0.05 * E.easeInOutSine(range(t, 7.4, 9.0));
    C.stormBG(t, { off: [dx / 700, 0] });
    ctx.save();
    ctx.translate(dx, 0);
    C.camera(push, 540, 880);
    someGuy(t);
    peek(t);
    ctx.restore();
  }
  SCN.add(6.0, 9.0, 'a1-someguy', (t) => {
    const ctx = E.ctx;
    const f = Math.round((t - 6.0) * 30);              // 6-frame whip-pan: 2 out, 4 in
    if (f < 6) {
      const SM = [140, 280, 240, 140, 60, 20];        // blur length (px) per frame
      if (f < 2) {
        const dx = -[260, 640][f];
        C.stormBG(5.25 - F(1), { off: [-dx / 700, 0] });
        ctx.save(); ctx.translate(dx, 0); freezeFrameFG(); ctx.restore();
      } else {
        someGuyScene(t, { dx: [560, 240, 80, 18][f - 2] });
      }
      hblur(SM[f]);
    } else someGuyScene(t);
    C.caption(t, { text: 'SOME GUY | FOUND THE CAUSE OF', times: wt('V06', 6.0), style: 'anton', size: 118, y: 250 });
    C.mono(t, '~500 BCE · n=1 · still replicates', 540, 1118, { size: 40, align: 'center', t0: 6.6, typed: { cps: 60 }, cursor: t < 7.6 });
  });

  // ================================================================== 9.00-10.50 STOP-TIME: OF / ALL / SUFFERING.
  // fissure behind ALL: starts at x 520 (behind the A-L gap), drift clamped to +-70 px so it shows above and below
  function crackPts() {
    const pts = []; let x = 520;
    for (let i = 0; i <= 16; i++) {
      const y = -20 + i * (H + 40) / 16;
      x = clamp(x + (hash(i * 4.1 + 2) - 0.5) * 150, 520 - 70, 520 + 70);
      pts.push([x, y]);
    }
    return pts;
  }
  const CRACK = crackPts();
  SCN.add(9.0, 10.5, 'a1-all', (t) => {
    const ctx = E.ctx;
    ctx.fillStyle = '#0E0D12'; ctx.fillRect(0, 0, W, H);
    const fl = C.flashEnv(t, [9.40]);
    if (t >= 9.40) {
      if (fl > 0) { ctx.fillStyle = `rgba(244,239,230,${0.22 * fl})`; ctx.fillRect(0, 0, W, H); }
      const a = 0.35 + 0.65 * fl;
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.shadowColor = `rgba(255,246,224,${0.6 * fl})`; ctx.shadowBlur = 24 * fl;
      ctx.strokeStyle = `rgba(244,239,230,${a})`; ctx.lineWidth = 7;
      poly(ctx, CRACK); ctx.stroke();
      // two short forks
      [[5, 1], [10, -1]].forEach(([i, sd]) => {
        const p0 = CRACK[i];
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p0[0] + sd * 95, p0[1] + 55); ctx.lineTo(p0[0] + sd * 170, p0[1] + 150); ctx.stroke();
      });
      ctx.restore();
    }
    C.caption(t, { text: 'OF', style: 'antonWhite', size: 90, y: 226, allFrom: 9.0, times: [99] });
    // ALL: ~620 px cap height, fills the safe width
    C.caption(t, { text: 'ALL', times: [9.0 - 0.001], style: 'anton', size: 712, y: 772, tremor: 6, over: { spacing: -1.4, strokeW: 16 * 150 / 712 * 1.6, popFrom: 1.2 } });
    C.caption(t, { text: 'SUFFERING.', times: wt('V07b', 9.0), style: 'antonWhite', size: 90, y: 1120 });
  });

  // ================================================================== 10.50-12.00 SAME CAUSE (2x2 grid)
  const HATS = []; for (let b = 0; b < 12; b++) { HATS.push(9.0 + b * 0.75, 9.0 + b * 0.75 + 0.42); }
  function hatEnv(t) {
    let last = -9; for (const h of HATS) if (h <= t) last = h;
    return Math.exp(-(t - last) / 0.09);
  }
  // reading order == pop order: money (TL) -> jhanas (TR, label 10.92, aside 10.95, orb pops 11.10) ->
  // being right (BL) -> this video doing numbers (BR, the hero)
  const CELL_S = 195;
  const CELLS = [
    { x: 262, y: 288, label: 'money', lt: 10.5 },
    { x: 762, y: 288, label: 'jhanas', lt: 10.92, jhana: true },
    { x: 262, y: 905, label: 'being right', lt: 11.25 },
    { x: 762, y: 905, label: 'this video\ndoing numbers', line: 'this video doing numbers', lt: 11.67, hero: true },
  ];
  const labelY = c => c.y + 0.7 * CELL_S + 40;   // 2-line hero label: second line centre at y 1131.5
  const labelX = c => c.x;
  // a grabbygrab clutching his own blob at any size (same pose as the hook, scaled)
  function clutcher(t, x, y, s, o = {}) {
    const k = s / 300;
    const ang = Math.PI * 0.97;
    const r = (o.blobR ?? 78) * k;
    let bpos = null;
    const g = G.grabby(t, x, y, s, {
      eyes: o.eyes || 'squeeze', mouth: o.mouth, look: o.look, blink: o.blink ?? false, sweat: o.sweat ?? 1,
      bob: o.bob ?? 0.3, squash: o.squash || 0, alpha: o.alpha,
      arm: { tx: x + 200 * k, ty: y + 92 * k, ext: 1, open: 0, ang, tremble: o.tremble || 0 },
      holding: (hx, hy) => {
        const d = 46 * k + (r - 78 * k) * 0.6;
        const bx = hx + Math.cos(ang) * d - Math.sin(ang) * 14 * k, by = hy + Math.sin(ang) * d + Math.cos(ang) * 14 * k;
        bpos = [bx, by, r];
        if (o.holding) o.holding(bx, by, r);
        else C.hookBase.blob(t, bx, by, r, { jitter: o.jitter ?? 1, dark: o.dark || 0, seed: o.seed || 5, ow: 5 * Math.max(0.6, k), body: [x, y, 0.62 * s, 0.7 * s] });
      },
    });
    if (o.over) o.over(bpos);
    return bpos;
  }
  function goldOrb(t, x, y, r, pop) {
    // flat gold disk with a soft 2-stop glow; pop 0..1 = deflates to a grey blob (pff)
    const ctx = E.ctx;
    if (pop < 1) {
      const rr = r * (1 - 0.35 * E.easeInCubic(pop));
      const g = ctx.createRadialGradient(x, y, rr * 0.8, x, y, rr * 2.1);
      g.addColorStop(0, 'rgba(255,200,97,0.45)'); g.addColorStop(1, 'rgba(255,200,97,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr * 2.1, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU);
      ctx.fillStyle = PAL.gold; ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = G.INK; ctx.stroke();
    }
  }
  // the four cells in grid (world) coordinates; the hero cell switches to the deadpan look from 12.0
  function gridCells(t) {
    const ctx = E.ctx;
    const he = hatEnv(t);
    const jit = 0.6 + 2.4 * he;
    CELLS.forEach((c, i) => {
      if (c.jhana) {
        // jhanas: a gold orb, squeezed, pops grey at 11.10
        const pop = range(t, 11.10, 11.10 + F(4));
        clutcher(t, c.x, c.y, CELL_S, {
          sweat: 1, squash: 0.08 * env(t, 11.08, F(3), 0.2), blobR: 78 * 1.1,
          holding: (bx, by, r) => {
            if (t < 11.10 + F(2)) goldOrb(t, bx, by, r * 1.18, pop);
            if (t >= 11.10) {
              C.hookBase.blob(t, bx, by, r * lerp(0.6, 0.92, E.easeOutCubic(range(t, 11.10, 11.10 + F(5)))), { jitter: jit, seed: 9, ow: 3.5, body: [c.x, c.y, 0.62 * CELL_S, 0.7 * CELL_S] });
              // pff: a small ring of puff lines
              const q = range(t, 11.10, 11.10 + F(9));
              if (q > 0 && q < 1) {
                ctx.save(); ctx.strokeStyle = `rgba(244,239,230,${1 - q})`; ctx.lineWidth = 6; ctx.lineCap = 'round';
                for (let k = 0; k < 7; k++) {
                  const a = k / 7 * TAU + 0.3, r0 = r * (1.2 + q * 0.9), r1 = r0 + 18;
                  ctx.beginPath(); ctx.moveTo(bx + Math.cos(a) * r0, by + Math.sin(a) * r0); ctx.lineTo(bx + Math.cos(a) * r1, by + Math.sin(a) * r1); ctx.stroke();
                }
                ctx.restore();
              }
            }
          },
        });
      } else if (c.hero && t >= 12.0) {
        heroGuyAt(t, c.x, c.y, CELL_S);
      } else {
        clutcher(t, c.x, c.y, CELL_S, { jitter: jit, seed: 5 + i * 3, sweat: i === 2 ? 1 : 0.9, blobR: 78 * 1.1 });
      }
    });
  }
  // cell labels; map: world -> screen (labels stay 40 px, never scaled by the camera)
  function gridLabels(t, map = p => p, { skipHero = false } = {}) {
    const ctx = E.ctx;
    CELLS.forEach(c => {
      if (t < c.lt || (skipHero && c.hero)) return;
      const pop = clamp((t - c.lt) / F(2));
      const [lx, ly] = map([labelX(c), labelY(c)]);
      // flying off during the 12.0 zoom: drop a label as soon as it would leave the text safe area
      const hw = 0.3 * 40 * Math.max(...c.label.split('\n').map(l => l.length)), nl = c.label.split('\n').length;
      if (lx - hw < 80 || lx + hw > 1000 || ly - 16 < 120 || ly + 50 * (nl - 1) + 16 > 1150) return;
      ctx.save();
      ctx.translate(lx, ly); const k = lerp(1.08, 1, pop); ctx.scale(k, k); ctx.translate(-lx, -ly);
      C.mono(t, c.label, lx, ly, { size: 40, align: 'center' });
      ctx.restore();
    });
  }
  function band(t, y, h) {
    const ctx = E.ctx;
    if (h <= 0) return;
    ctx.fillStyle = 'rgba(17,15,22,0.94)';
    ctx.fillRect(0, y - h / 2, W, h);
    ctx.fillStyle = 'rgba(244,239,230,0.16)';
    ctx.fillRect(0, y - h / 2, W, 4); ctx.fillRect(0, y + h / 2 - 4, W, 4);
  }
  SCN.add(10.5, 12.0, 'a1-grid', (t) => {
    const slam = env(t, 10.5, 0.001, 0.12);
    C.stormBG(t, { flash: 0.25 * slam });
    const ctx = E.ctx;
    ctx.save();
    C.camera(1 + 0.025 * slam, 540, 675);
    gridCells(t);
    gridLabels(t);
    ctx.restore();
    band(t, 648, 216);
    C.caption(t, { text: 'SAME CAUSE.', times: wt('V08', 10.5), style: 'anton', size: 132, y: 622 });
    C.mono(t, '(not how jhana works) ↗', 1000, 724, { size: 44, align: 'right', t0: 10.95, color: PAL.warmWhite });
  });

  // ================================================================== 12.00-13.30 IT'S THIS LITTLE GUY.
  // 12.00-12.27: camera zoom into the bottom-right cell (other cells fly off frame); then the hero is drawn direct.
  const HERO = { x: 540, y: 826, s: 380 };
  const ZOOM_T = [12.0, 12.0 + F(8)];
  function heroGuyAt(t, x, y, s) {
    const he = hatEnv(t);
    // deadpan: dot eyes at the camera, flat mouth, one slow blink on the marimba tick (12.90)
    const bl = t < 12.9 ? 0 : t < 12.9 + F(4) ? E.smooth((t - 12.9) / F(4)) : t < 12.9 + F(6) ? 1 : 1 - E.smooth((t - 12.9 - F(6)) / F(5));
    clutcher(t, x, y, s, {
      eyes: t < 12.0 + F(3) ? 'squeeze' : 'dots', mouth: t < 12.0 + F(3) ? undefined : 'flat', sweat: 0.9, blink: false,
      jitter: 0.6 + 1.2 * he, seed: 14, blobR: 78 * 1.1,
      over: () => { if (bl > 0) blinkLids(faceOf(t, x, y, s, [0, 0], 0.3), bl); },
    });
  }
  const heroGuy = t => heroGuyAt(t, HERO.x, HERO.y, HERO.s);
  // the punchline label rides along with the zoom and stays under the hero until the plate covers it
  function heroLabel(t) {
    const e = E.easeOutCubic(range(t, ZOOM_T[0], ZOOM_T[1]));
    const c = CELLS[3];
    // cut frame: still the 2-line cell label (one line would run into 'being right'); then one line (576 px)
    // that rides from x 712 (never past x 1000) to its spot under the hero
    if (t < ZOOM_T[0] + F(1) - 1e-4) { C.mono(t, c.label, labelX(c), labelY(c), { size: 40, align: 'center' }); return; }
    C.mono(t, c.line, lerp(712, 540, e), lerp(labelY(c), 1128, e), { size: 40, align: 'center' });
  }
  SCN.add(12.0, 13.3, 'a1-hero', (t) => {
    const ctx = E.ctx;
    C.stormBG(t);
    const e = E.easeOutCubic(range(t, ZOOM_T[0], ZOOM_T[1]));
    if (e < 1) {
      const c = CELLS[3];
      const k = lerp(1, HERO.s / CELL_S, e), tx = lerp(c.x, HERO.x, e), ty = lerp(c.y, HERO.y, e);
      ctx.save();
      ctx.translate(tx, ty); ctx.scale(k, k); ctx.translate(-c.x, -c.y);
      gridCells(t);
      ctx.restore();
      gridLabels(t, ([x, y]) => [tx + k * (x - c.x), ty + k * (y - c.y)], { skipHero: true });
    } else heroGuy(t);
    heroLabel(t);
    C.caption(t, { text: "IT'S THIS | LITTLE GUY.", times: wt('V09', 12.0), style: 'anton', size: 150, y: 290 });
  });

  // ================================================================== 13.30-15.00 PLATE 01
  const PL = { x: 75, y: 95, w: 930, h: 1160 };
  let paperCv = null;
  function paper() {
    // generated once at half resolution (deterministic), drawn 2x: soft fibre blotches + fine tooth
    if (paperCv) return paperCv;
    const w = PL.w >> 1, h = PL.h >> 1;
    const half = document.createElement('canvas'); half.width = w; half.height = h;
    const g0 = half.getContext('2d');
    const im = g0.createImageData(w, h);
    const base = [243, 235, 221];
    for (let y = 0; y < h; y++) {
      const vy = P.vnoise(y * 0.026 + 7.7), wy = P.vnoise(y * 0.014) * 3;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const n = hash(x * 0.731 + y * 17.13) - 0.5;
        const bl = P.vnoise(x * 0.022 + wy) * vy;
        const fib = n > 0.4985 ? -16 : 0;
        for (let c = 0; c < 3; c++) im.data[i + c] = base[c] + n * 7 + bl * 6 + fib;
        im.data[i + 3] = 255;
      }
    }
    g0.putImageData(im, 0, 0);
    paperCv = document.createElement('canvas');
    paperCv.width = PL.w; paperCv.height = PL.h;
    const g = paperCv.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.drawImage(half, 0, 0, PL.w, PL.h);
    const v = g.createRadialGradient(PL.w / 2, PL.h / 2, PL.h * 0.35, PL.w / 2, PL.h / 2, PL.h * 0.75);
    v.addColorStop(0, 'rgba(120,96,60,0)'); v.addColorStop(1, 'rgba(120,96,60,0.10)');
    g.fillStyle = v; g.fillRect(0, 0, PL.w, PL.h);
    return paperCv;
  }
  const stampCv = {};
  function stamp(word, variant = 0) {
    const key = word + variant;
    if (stampCv[key]) return stampCv[key];
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    g.font = '400 168px "Anton"';
    const w = Math.ceil(g.measureText(word).width) + 40;
    c.width = w; c.height = 200;
    const sd = word.length * 3.1 + variant * 17.3;
    g.font = '400 168px "Anton"'; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.fillStyle = G.INK; g.fillText(word, w / 2, 112);
    // uneven ink load: large-scale noise mask, ink alpha 0.82..0.95 across the glyphs
    g.globalCompositeOperation = 'destination-out';
    for (let x = 0; x < w; x += 8) {
      for (let y = 0; y < 200; y += 8) {
        const n = 0.5 + 0.5 * P.vnoise(x * 0.011 + sd) * P.vnoise(y * 0.017 + sd * 1.7 + x * 0.004);
        g.globalAlpha = 0.05 + 0.13 * clamp(n);
        g.fillRect(x, y, 8, 8);
      }
    }
    // edge erosion: dashed 2 px knock-out along the glyph outline
    g.globalAlpha = 0.3; g.lineWidth = 2.2; g.strokeStyle = '#000';
    g.setLineDash([3, 5, 2, 7, 4, 4]); g.lineDashOffset = variant * 5;
    g.strokeText(word, w / 2, 112);
    g.setLineDash([]);
    // clustered speckles: density follows a smooth noise field (worn patches, not snow)
    let placed = 0;
    for (let i = 0; i < 2400 && placed < 520; i++) {
      const x = hash(i * 1.37 + sd) * w, y = hash(i * 2.71 + sd + 5) * 200;
      const dens = clamp(0.5 + 0.5 * P.vnoise(x * 0.018 + sd * 2.3) + 0.35 * P.vnoise(y * 0.03 + x * 0.006 + sd) - 0.25);
      if (hash(i * 9.13 + sd) > dens * dens) continue;
      placed++;
      const r = 0.7 + hash(i * 3.3 + sd) * 2.6 * (0.6 + dens);
      g.globalAlpha = 0.55 + 0.45 * hash(i * 4.4); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    stampCv[key] = c;
    return c;
  }
  const STAMPS = [['GRAB', 13.5, 690, 268, -0.05], ['BY', 13.875, 676, 430, 0.035], ['GRAB', 14.25, 694, 592, -0.02]];
  // hatched ink line-art grabbygrab (specimen drawing)
  function hatch(ctx, x0, y0, x1, y1, gap, ang, w, col) {
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w;
    const L = Math.hypot(x1 - x0, y1 - y0);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, ca = Math.cos(ang), sa = Math.sin(ang);
    ctx.beginPath();
    for (let d = -L / 2; d <= L / 2; d += gap) {
      ctx.moveTo(cx + ca * (-L / 2) - sa * d, cy + sa * (-L / 2) + ca * d);
      ctx.lineTo(cx + ca * (L / 2) - sa * d, cy + sa * (L / 2) + ca * d);
    }
    ctx.stroke(); ctx.restore();
  }
  function specimen(ctx) {
    const x = 255, y = 425, s = 290, k = s / 300;
    const ang = Math.PI * 0.97;
    G.grabby(0, x, y, s, {
      col: PAL.paper, eyes: 'dots', mouth: 'flat', sweat: 0, bob: 0, shadow: false, blink: false,
      arm: { tx: x + 200 * k, ty: y + 92 * k, ext: 1, open: 0, ang },
      holding: (hx, hy) => {
        const d = 46 * k + 7, r = 86 * k;
        const bx = hx + Math.cos(ang) * d - Math.sin(ang) * 14 * k, by = hy + Math.sin(ang) * d + Math.cos(ang) * 14 * k;
        const path = () => {
          ctx.beginPath();
          for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, rr = r * (1 + 0.07 * Math.sin(a * 5 + 1) + 0.04 * Math.sin(a * 9)); i ? ctx.lineTo(bx + Math.cos(a) * rr, by + Math.sin(a) * rr) : ctx.moveTo(bx + Math.cos(a) * rr, by + Math.sin(a) * rr); }
          ctx.closePath();
        };
        ctx.save();
        path(); ctx.fillStyle = PAL.paper; ctx.fill();
        ctx.save(); path(); ctx.clip();
        hatch(ctx, bx - r, by - r, bx + r, by + r, 10, Math.PI / 4, 3, G.INK);
        hatch(ctx, bx - r, by - r, bx + r, by + r, 10, -Math.PI / 4, 3, G.INK);
        ctx.restore();
        path(); ctx.lineWidth = 5; ctx.strokeStyle = G.INK; ctx.stroke();
        // vibration ticks, specimen style
        ctx.lineCap = 'round'; ctx.lineWidth = 4.5;
        [[-0.25, 1.28], [-0.25, 1.5], [Math.PI + 0.35, 1.28]].forEach(([a, f], i) => { ctx.beginPath(); ctx.arc(bx, by, r * f, a - 0.3 + i * 0.05, a + 0.3 - i * 0.05); ctx.stroke(); });
        ctx.restore();
      },
    });
    // 45-degree hatch at ~12% inside the body
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x, y, 0.62 * s - 4, 0.7 * s - 4, 0, 0, TAU); ctx.clip();
    ctx.beginPath(); ctx.ellipse(x - 0.15 * s, y + 0.62 * s, 0.9 * s, 0.75 * s, 0, 0, TAU); ctx.clip();
    hatch(ctx, x - s, y - s, x + s, y + s, 11, Math.PI / 4, 3, 'rgba(35,32,43,0.45)');
    ctx.restore();
  }
  function plateBaseContent(ctx) {
    ctx.drawImage(paper(), 0, 0);
    ctx.strokeStyle = G.INK;
    ctx.lineWidth = 5; ctx.strokeRect(20, 20, PL.w - 40, PL.h - 40);
    ctx.lineWidth = 2.5; ctx.strokeRect(32, 32, PL.w - 64, PL.h - 64);
    ctx.fillStyle = G.INK; ctx.textBaseline = 'middle';
    ctx.font = '600 35px "JBM"';
    ctx.fillText('FIELD GUIDE TO THE MIND · PLATE 01', 56, 82);
    ctx.fillRect(56, 112, PL.w - 112, 4);
    specimen(ctx);
    ctx.fillStyle = G.INK;
    ctx.font = '500 28px "JBM"';
    ctx.fillText('fig. 1', 102, 712);
    ctx.fillRect(56, 752, PL.w - 112, 4);
    const rows = [['pali:', 'taṇhā (lit. thirst)'], ['diet:', "whatever's next"], ['lifespan:', 'one moment. respawns.']];
    rows.forEach(([k, v], i) => {
      const y = 850 + i * 106;
      ctx.font = '600 40px "JBM"'; ctx.fillText(k, 56, y);
      ctx.font = '500 40px "JBM"'; ctx.fillText(v, 56 + 24 * 10, y);
    });
  }
  function plateStamps(ctx, t) {
    STAMPS.forEach(([w, ts, x, y, rot], i) => {
      if (t < ts) return;
      const c = stamp(w, i);
      const k = t < ts + F(1) ? 1.12 : 1;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k);
      ctx.globalAlpha = 0.97;
      ctx.drawImage(c, -c.width / 2, -c.height / 2);
      ctx.restore();
    });
  }
  // GRABBY draws on ENGINE.ctx, so offscreen plates are rendered on the main canvas corner and copied out
  // (the corner pixels are restored right after). Content is time-independent => cache once.
  function renderOffscreen(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = E.ctx;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
    const keep = ctx.getImageData(0, 0, w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.save(); fn(ctx); ctx.restore();
    c.getContext('2d').drawImage(ctx.canvas, 0, 0, w, h, 0, 0, w, h);
    ctx.putImageData(keep, 0, 0);
    ctx.restore();
    return c;
  }
  let plateBaseCv = null, plateFullCv = null, plateShadowCv = null;
  const plateBase = () => plateBaseCv || (plateBaseCv = renderOffscreen(PL.w, PL.h, plateBaseContent));
  function plateShadow() {
    if (plateShadowCv) return plateShadowCv;
    const c = document.createElement('canvas'); c.width = PL.w + 200; c.height = PL.h + 200;
    const g = c.getContext('2d');
    g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 40; g.shadowOffsetX = 5000; g.shadowOffsetY = 18;
    g.fillStyle = '#000'; g.fillRect(100 - 5000, 100, PL.w, PL.h);
    return (plateShadowCv = c);
  }
  function plateShake(t) {
    for (const [, ts] of STAMPS) {
      const f = Math.floor((t - ts) * 30 + 1e-6);
      if (f >= 0 && f < 3) { const a = [5, -4, 2][f]; return [a * (hash(ts * 7 + f) > 0.5 ? 1 : -1), -a * 0.6]; }
    }
    return [0, 0];
  }
  function drawPlate(t, dy = 0) {
    const ctx = E.ctx;
    const [sx, sy] = plateShake(t);
    ctx.save();
    ctx.translate(PL.x + sx, PL.y + dy + sy);
    ctx.drawImage(plateShadow(), -100, -100);
    ctx.drawImage(plateBase(), 0, 0);
    plateStamps(ctx, t);
    ctx.restore();
  }
  SCN.add(13.3, 15.0, 'a1-plate', (t) => {
    const ctx = E.ctx;
    C.stormBG(t);
    heroGuy(t);
    heroLabel(t);
    // the caption stops just before the rising plate's top edge reaches the letters
    if (t < 13.367) C.caption(t, { text: "IT'S THIS | LITTLE GUY.", times: wt('V09', 12.0), style: 'anton', size: 150, y: 290 });
    ctx.fillStyle = `rgba(10,9,14,${0.45 * E.smooth(range(t, 13.3, 13.5))})`; ctx.fillRect(0, 0, W, H);
    const p = range(t, 13.3, 13.5);
    const dy = p < 1 ? (H - PL.y + 60) * (1 - E.easeOutCubic(p)) : (t < 13.5 + F(1) ? 4 : 0);
    drawPlate(t, dy);
  });

  // ================================================================== 15.00-18.00 IT BUZZES. SO HE SQUEEZES.
  // tape-stop: animation clock decelerates to a freeze over 17.55-18.0
  const TS0 = 17.55, TSD = 0.45;
  function tv(t) { if (t < TS0) return t; const p = Math.min(1, (t - TS0) / TSD); return TS0 + TSD * (p - p * p / 2); }
  // [text, x, y, t0, size, vx, vy, alpha]. 'am i doing this right' is the exact callback for the 30 s arrow:
  // readable (40 px, 95%) and slow; the rest is 28-32 px texture swarming outward at 40-70 px/s.
  const FRAGS = [
    ['am i doing this right', 150, 556, 15.04, 40, -6, -22, 0.95],
    ['reply to him', 700, 724, 15.24, 30, 44, -26, 0.8],
    ['did i lock it', 120, 776, 15.46, 32, -14, -40, 0.8],
    ['i should be calmer by now', 470, 648, 15.66, 28, 34, -40, 0.72],
    ['what if they', 130, 1100, 15.9, 30, -44, 20, 0.8],
    ['rent', 850, 900, 16.12, 32, 62, 18, 0.85],
  ];
  function fragments(t) {
    if (t >= 16.5) return;
    const ctx = E.ctx;
    ctx.save(); ctx.textBaseline = 'middle';
    FRAGS.forEach(([txt, x, y, t0, sz, vx, vy, al], i) => {
      if (t < t0) return;
      const age = t - t0;
      const a = al * clamp(age / F(2)) * (1 - clamp((t - 16.38) / 0.12));
      const life = range(t, t0, 16.5);
      ctx.font = `500 ${sz}px "JBM"`;
      const w = ctx.measureText(txt).width;
      const cx = x + w / 2 + vx * age, cy = y + vy * age + Math.sin(age * 2 + i) * 3;
      const k = 1 + 0.15 * life;
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(k, k);
      ctx.fillStyle = `rgba(255,246,224,${a})`;
      ctx.fillText(txt, -w / 2, 0);
      ctx.restore();
    });
    ctx.restore();
  }
  function leader2(x0, y0, x1, y1, p) {
    if (p <= 0) return;
    const ctx = E.ctx;
    const ex = lerp(x0, x1, p), ey = lerp(y0, y1, p);
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = G.INK; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.beginPath(); ctx.arc(x0, y0, 9, 0, TAU); ctx.fillStyle = G.INK; ctx.fill();
    ctx.strokeStyle = PAL.warmWhite; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.beginPath(); ctx.arc(x0, y0, 6, 0, TAU); ctx.fillStyle = PAL.warmWhite; ctx.fill();
    ctx.restore();
  }
  function buzzState(v) {
    const k = range(v, 15.0, 17.35);
    const bz = env(v, 15.17, F(1), 0.3) + env(v, 17.11, F(1), 0.4) + 0.5 * env(v, 16.87, F(1), 0.25);
    const sq = env(v, 16.035, F(2), 0.4);
    return {
      dark: lerp(0.35, 1.0, E.smooth(k)), jitter: lerp(1.5, 3.0, k) + bz,
      squeeze: Math.min(1.25, lerp(0.15, 0.85, k) + 0.45 * sq), blobR: lerp(90, 84, k), tremble: lerp(0, 5, E.smooth(range(v, 15.3, 16.2))),
    };
  }
  // tear line across the plate (plate-local), top-right -> bottom-left
  const TEAR = (() => { const pts = []; for (let i = 0; i <= 22; i++) { const f = i / 22; pts.push([lerp(700, 210, f) + (hash(i * 5.3 + 1) - 0.5) * 34, lerp(-30, PL.h + 30, f) + (hash(i * 2.9) - 0.5) * 20]); } return pts; })();
  function plateImage() {
    if (plateFullCv) return plateFullCv;
    plateFullCv = document.createElement('canvas'); plateFullCv.width = PL.w; plateFullCv.height = PL.h;
    const g = plateFullCv.getContext('2d');
    g.drawImage(plateBase(), 0, 0);
    plateStamps(g, 99);
    return plateFullCv;
  }
  function ripPieces(t) {
    const q = range(t, 15.0, 15.0 + F(10));
    if (q >= 1) return;
    const ctx = E.ctx;
    const img = plateImage();
    const e = E.easeInCubic(q) + 0.04 * q;
    const pieces = [
      { poly: [[-40, -40], ...TEAR, [-40, PL.h + 40]], dx: -900, dy: -260, rot: -0.22 },
      { poly: [[PL.w + 40, -40], ...TEAR, [PL.w + 40, PL.h + 40]], dx: 900, dy: 300, rot: 0.2 },
    ];
    pieces.forEach(pc => {
      ctx.save();
      const px = PL.x + PL.w / 2, py = PL.y + PL.h / 2;
      ctx.translate(px + pc.dx * e, py + pc.dy * e); ctx.rotate(pc.rot * e); ctx.translate(-PL.w / 2, -PL.h / 2);
      ctx.save(); ctx.translate(10, 18); poly(ctx, pc.poly); ctx.closePath();
      ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fill(); ctx.restore();
      poly(ctx, pc.poly); ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, 0, 0);
      // torn paper core along the tear
      poly(ctx, TEAR);
      ctx.strokeStyle = '#FFFDF6'; ctx.lineWidth = 14; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.strokeStyle = 'rgba(35,32,43,0.25)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    });
  }
  const BZC = [678, 1044];                              // push-in centre (the blob)
  SCN.add(15.0, 18.0, 'a1-buzz', (t) => {
    const ctx = E.ctx;
    const v = tv(t);
    const st = buzzState(v);
    const flash = C.flashEnv(v + 1e-6, [17.0]);
    // frame shake at 17.0 (5 px, decaying over 8 frames) + the 3-frame squeeze pulse on "squeezes" (16.035)
    const sf = Math.floor((v - 17.0) * 30 + 1e-6);
    const sh = (sf >= 0 && sf < 8) ? 5 * (1 - sf / 8) : 0;
    const [px, py] = pulseShake(v, 16.035);
    const shx = (sh ? Math.round((hash(sf * 3.3) > 0.5 ? 1 : -1) * sh) : 0) + px;
    const shy = (sh ? Math.round((hash(sf * 7.1) > 0.5 ? 1 : -1) * sh * 0.7) : 0) + py;
    // tape 'sag' 17.55-18.0, eased with the same deceleration as the clock
    const sg = t > TS0 ? (v - TS0) / (TSD / 2) : 0;
    const fg = () => {
      ctx.translate(shx, shy);
      if (sg > 0) { ctx.translate(540, 1350 + 10 * sg); ctx.scale(1 - 0.015 * sg, 1 - 0.015 * sg); ctx.translate(-540, -1350); }
    };
    C.stormBG(v, { flash: 0.35 * flash });
    inkBolt(140, 130, 260, 720, 11, flash);
    ctx.save();
    fg();
    // slow push-in on the blob 15.3-17.55 (freezes with the tape-stop clock)
    const camK = 1 + 0.10 * E.smooth(range(v, 15.3, 17.55));
    const info = C.hookBase(v, {
      bg: false, cam: camK, camX: BZC[0], camY: BZC[1], sweatDrip: E.easeInCubic(range(v, 15.4, 16.4)) * 0.9,
      blobR: st.blobR, dark: st.dark, jitter: st.jitter, squeeze: st.squeeze,
      arm: { tremble: st.tremble },
      over: (i) => {
        // the last bit of the nice cloud inside the blob flickers out
        const wa = (1 - range(v, 15.6, 16.35)) * (hash(Math.floor(v * 15)) > 0.25 ? 1 : 0.3);
        if (wa > 0 && v < 16.35) C.puff(i.x - 14, i.y + 4, 21, { alpha: 0.9 * wa, ow: 2.5, grey: 0.05, t: v });
        if (pulseFrame(v, 16.035) >= 0) strainFace(hookFace(v));
      },
    });
    fragments(v);
    // leader from the blob's upper-right rim (clear of his body) to under the aside
    const lp = E.easeOutCubic(range(t, 16.5, 16.5 + F(6)));
    if (lp > 0) {
      // terminal dot inside the dark blob (upper right, clear of the arm), so it can't read as a skewer in him
      const [lx, ly] = cam(camK, BZC[0], BZC[1])([info.x + 0.3 * info.r, info.y - 0.45 * info.r]);
      leader2(lx, ly, 905, 684, lp);
    }
    C.mono(t, 'EVIL VIBRATING BLOB', 1000, 596, { size: 44, weight: 600, align: 'right', t0: 16.5 });
    C.mono(t, '(was a perfectly nice cloud)', 1000, 646, { size: 42, align: 'right', t0: 16.5 + F(3), alpha: 0.95 });
    ctx.restore();
    // the plate rips away: the plate scene's 45% dim fades out under the paper, then the caption on top of it all
    if (t < 15.0 + F(10)) {
      ctx.fillStyle = `rgba(10,9,14,${0.45 * (1 - range(t, 15.0, 15.33))})`; ctx.fillRect(0, 0, W, H);
      ripPieces(t);
    }
    ctx.save();
    fg();
    C.caption(t, { text: 'IT BUZZES. | SO HE SQUEEZES. | SO IT BUZZES.', times: wt('V11', 15.0), style: 'anton', size: 132, y: 330 });
    ctx.restore();
    // tape-stop: desaturate ~40% and dim a touch as the clock winds down
    const ts = range(t, TS0, 18.0);
    if (ts > 0) {
      const d = E.smooth(ts);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.filter = `saturate(${(1 - 0.42 * d).toFixed(3)}) brightness(${(1 - 0.08 * d).toFixed(3)})`;
      ctx.drawImage(ctx.canvas, 0, 0);
      ctx.restore();
    }
  });

  // warm the one-off caches (paper, plate, shadow, stamps, frozen storm) right after load, between frames
  (function warm() {
    if (!window.READY) { setTimeout(warm, 50); return; }
    setTimeout(() => {
      try { plateBase(); plateShadow(); plateImage(); STAMPS.forEach(([w], i) => stamp(w, i)); freezeBgCache(); blurCanvases(H >> 1); blurCanvases(H); }
      catch (e) { console.warn('act1 warm', e.message); }
    }, 0);
  })();
})();
