// ACT 1 (0-18 s): CLENCHED. Storm, yellow Anton, deadpan field guide.
// Everything is a pure function of t. Beats follow BRIEF.md; word times come from timing.js.
(function () {
  const E = ENGINE, P = PRIM, G = GRABBY, PAL = C.PAL;
  const W = E.W, H = E.H, TAU = Math.PI * 2;
  const clamp = E.clamp, lerp = E.lerp, range = E.range, hash = E.hash;
  const F = n => n / 30;

  // ------------------------------------------------------------------ small helpers
  // spoken word times minus a lead, never earlier than `minT` (so words never pop before their own cut)
  function wt(id, minT = 0, lead = 0.08) { return C.line(id).word_t.map(x => Math.max(minT, x - lead)); }
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
    C.caption(t, { text: "YOU'RE CLENCHING | SOMETHING | RIGHT NOW.", id: 'V01', style: 'anton', size: 140, y: 342, allFrom: 0 });
    C.caption(t, { text: '(NOT YOUR JAW.)', style: 'antonWhite', size: 80, y: 604, allFrom: 0, times: [99, 99, 99] });
  }
  SCN.add(0, 2.25, 'a1-hook', (t) => {
    const flash = C.flashEnv(t, [0.40, 1.60]);
    const camK = 1 + 0.03 * E.easeInOutSine(range(t, 1.0, 2.25));
    const sq = env(t, 1.36, F(3), 0.45);                 // squeeze pulse on "right now"
    C.hookBase(t, { flash, cam: camK, squeeze: sq, jitter: 1 + 0.6 * sq, sweatDrip: E.easeInCubic(range(t, 1.38, 2.1)) });
    hookCaption(t);
  });

  // ================================================================== 2.25-3.75 NOT YOUR JAW.
  SCN.add(2.25, 3.75, 'a1-jaw', (t) => {
    const reclench = t >= 3.0;
    const k = 1.34, cx = 540, cy = 1080;
    C.hookBase(t, {
      cam: k, camX: cx, camY: cy, sweatDrip: 0.15,
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
    C.mono(t, '(ok, also your jaw)', 540, 392, { size: 40, align: 'center', t0: 3.0, color: PAL.warmWhite });
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
    else pose = mixPose(reachT, HOLD, E.easeInOutSine(range(t, SN.s2, SN.s3)));
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
    C.hookBase(t, {
      cam: 1.03, sweatDrip: 0.15,
      blobR: st.blobR, dark: st.dark, jitter: st.jitter + impact, squeeze: impact * 0.6,
      arm: { tx: st.pose.tx, ty: st.pose.ty, ang: st.pose.ang },
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
            ctx.beginPath(); ctx.moveTo(lerp(p0.tx, p1.tx, -0.6) + ox, lerp(p0.ty, p1.ty, -0.6) + oy);
            ctx.lineTo(lerp(p0.tx, p1.tx, 0.55) + ox, lerp(p0.ty, p1.ty, 0.55) + oy); ctx.stroke();
          }
          ctx.restore();
        }
      },
    });
    C.caption(t, { text: 'A THOUGHT | ABOUT LATER.', times: wt('V04', 3.75), style: 'anton', size: 150, y: 285 });
  });

  // ================================================================== 5.25-6.00 FREEZE: THAT ONE.
  const TF = 5.25 - F(1);                              // frozen animation clock
  function freezeFrame(t, { loop = true, bg = true } = {}) {
    const st = laterState(TF);
    const awake = t >= 5.40;
    const glance = E.smoother(range(t, 5.50, 5.92));   // pupils slide from the blob to the camera
    const look = [0.55, 0.25];
    return C.hookBase(TF, {
      cam: 1.03, sweatDrip: 0.15, bg,
      blobR: st.blobR, dark: st.dark, jitter: st.jitter,
      arm: { tx: st.pose.tx, ty: st.pose.ty, ang: st.pose.ang },
      eyes: awake ? 'dots' : 'squeeze', mouth: awake ? 'flat' : 'zigzag', blink: false, look: awake ? look : [0, 0],
      over: (info) => {
        if (awake) sideEyes(hookFace(TF, look), lerp(0.9, -0.95, glance), lerp(0.42, 0.5, glance));
        if (loop) C.markerLoop(info.x, info.y, info.r * 1.42, info.r * 1.24, range(t, 5.29, 5.29 + F(12)), { width: 10, loops: 2, seed: 4 });
      },
    });
  }
  const freezeFrameFG = () => freezeFrame(5.99, { bg: false });
  SCN.add(5.25, 6.0, 'a1-thatone', (t) => {
    freezeFrame(t);
    C.caption(t, { text: 'THAT ONE.', times: wt('V05', 5.25), style: 'anton', size: 170, y: 270 });
  });

  // ------------------------------------------------------------------ horizontal smear (cheap anisotropic blur)
  let smearCv = null;
  function hsmear(k, alpha = 1) {
    if (k <= 1 || alpha <= 0) return;
    const ctx = E.ctx;
    if (!smearCv) smearCv = document.createElement('canvas');
    const w = Math.max(8, Math.round(W / k)), h = H;
    smearCv.width = w; smearCv.height = h;
    const g = smearCv.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'medium';
    g.drawImage(ctx.canvas, 0, 0, W, H, 0, 0, w, h);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(smearCv, 0, 0, w, h, 0, 0, W, H);
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
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.9);
    ctx.bezierCurveTo(s * 0.9, -s * 0.9, s * 0.8, s * 0.2, 0, s * 0.75);
    ctx.bezierCurveTo(-s * 0.8, s * 0.2, -s * 0.9, -s * 0.9, 0, -s * 0.9);
    ctx.moveTo(0, s * 0.75); ctx.lineTo(0, s * 1.25);
    ctx.strokeStyle = PAL.cream; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
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
      bodhiLeaf(ctx, lx, ly, 15, Math.sin(lt * 7 + 1) * 0.7);
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
      const SM = [34, 46, 40, 24, 12, 5];
      if (f < 2) {
        const dx = -[260, 640][f];
        C.stormBG(5.25 - F(1), { off: [-dx / 700, 0] });
        ctx.save(); ctx.translate(dx, 0); freezeFrameFG(); ctx.restore();
      } else {
        someGuyScene(t, { dx: [560, 240, 80, 18][f - 2] });
      }
      hsmear(SM[f], 1);
    } else someGuyScene(t);
    C.caption(t, { text: 'SOME GUY | FOUND THE CAUSE OF', times: wt('V06', 6.0), style: 'anton', size: 118, y: 250 });
    C.mono(t, '~500 BCE · n=1 · still replicates', 540, 1118, { size: 40, align: 'center', t0: 6.6, typed: { cps: 60 }, cursor: t < 7.6 });
  });

  // ================================================================== 9.00-10.50 STOP-TIME: OF / ALL / SUFFERING.
  function crackPts() {
    const pts = []; let x = 600;
    for (let i = 0; i <= 16; i++) {
      const y = -20 + i * (H + 40) / 16;
      x += (hash(i * 4.1 + 2) - 0.5) * 150 - (i > 8 ? 12 : -6);
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
        ctx.lineTo(p0[0] + sd * 70, p0[1] + 40); ctx.lineTo(p0[0] + sd * 120, p0[1] + 110); ctx.stroke();
      });
      ctx.restore();
    }
    C.caption(t, { text: 'OF', style: 'antonWhite', size: 90, y: 226, allFrom: 9.0, times: [99] });
    // ALL: ~620 px cap height, fills the safe width
    C.caption(t, { text: 'ALL', times: [9.0], style: 'anton', size: 712, y: 772, tremor: 6, over: { spacing: -1.4, strokeW: 16 * 150 / 712 * 1.6 } });
    C.caption(t, { text: 'SUFFERING.', times: wt('V07b', 9.0), style: 'antonWhite', size: 90, y: 1120 });
  });

  // ================================================================== 10.50-12.00 SAME CAUSE (2x2 grid)
  const HATS = []; for (let b = 0; b < 12; b++) { HATS.push(9.0 + b * 0.75, 9.0 + b * 0.75 + 0.42); }
  function hatEnv(t) {
    let last = -9; for (const h of HATS) if (h <= t) last = h;
    return Math.exp(-(t - last) / 0.09);
  }
  const CELLS = [
    { x: 262, y: 288, label: 'money' },
    { x: 762, y: 288, label: 'being right' },
    { x: 262, y: 894, label: 'jhanas' },
    { x: 762, y: 894, label: 'this video\ndoing numbers' },
  ];
  const CELL_S = 172;
  const LABEL_T = [10.5, 10.92, 11.25, 11.67];
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
  function gridScene(t, o = {}) {
    const ctx = E.ctx;
    const he = hatEnv(t);
    const gone = o.gone || 0;     // 0..1: other cells shrink away (12.0 hand-off)
    CELLS.forEach((c, i) => {
      if (i === 3 && o.skipHero) return;
      if (gone > 0 && i < 2) return;
      const sc = i === 3 ? 1 : 1 - E.easeInCubic(gone);
      if (sc <= 0.02) return;
      ctx.save();
      ctx.translate(c.x, c.y); ctx.scale(sc, sc); ctx.translate(-c.x, -c.y);
      const jit = 0.55 + 1.3 * he;
      if (i === 2) {
        // jhanas: a gold orb, squeezed, pops grey at 11.10
        const pop = range(t, 11.10, 11.10 + F(4));
        clutcher(t, c.x, c.y, CELL_S, {
          sweat: 1, squash: 0.06 * env(t, 11.08, F(3), 0.2),
          holding: (bx, by, r) => {
            if (t < 11.10 + F(2)) goldOrb(t, bx, by, r * 1.18, pop);
            if (t >= 11.10) {
              C.hookBase.blob(t, bx, by, r * lerp(0.6, 0.92, E.easeOutCubic(range(t, 11.10, 11.10 + F(5)))), { jitter: jit, seed: 9, ow: 3, body: [c.x, c.y, 0.62 * CELL_S, 0.7 * CELL_S] });
              // pff: a small ring of puff lines
              const q = range(t, 11.10, 11.10 + F(9));
              if (q > 0 && q < 1) {
                ctx.save(); ctx.strokeStyle = `rgba(244,239,230,${1 - q})`; ctx.lineWidth = 5; ctx.lineCap = 'round';
                for (let k = 0; k < 7; k++) {
                  const a = k / 7 * TAU + 0.3, r0 = r * (1.2 + q * 0.9), r1 = r0 + 14;
                  ctx.beginPath(); ctx.moveTo(bx + Math.cos(a) * r0, by + Math.sin(a) * r0); ctx.lineTo(bx + Math.cos(a) * r1, by + Math.sin(a) * r1); ctx.stroke();
                }
                ctx.restore();
              }
            }
          },
        });
      } else {
        clutcher(t, c.x, c.y, CELL_S, { jitter: jit, seed: 5 + i * 3, sweat: i === 1 ? 1 : 0.9 });
      }
      ctx.restore();
      if (!o.noLabels && t >= LABEL_T[i]) {
        const pop = clamp((t - LABEL_T[i]) / F(2));
        ctx.save();
        const ly = c.y + 182;
        ctx.translate(c.x, ly); const k = lerp(1.08, 1, pop); ctx.scale(k, k); ctx.translate(-c.x, -ly);
        C.mono(t, c.label, c.x, ly, { size: 40, align: 'center' });
        ctx.restore();
      }
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
    gridScene(t);
    ctx.restore();
    band(t, 655, 230);
    C.caption(t, { text: 'SAME CAUSE.', times: wt('V08', 10.5), style: 'anton', size: 132, y: 622 });
    C.mono(t, '↙ (not how jhana works)', 96, 724, { size: 40, t0: 10.95, color: PAL.warmWhite });
  });

  // ================================================================== 12.00-13.30 IT'S THIS LITTLE GUY.
  const HERO = { x: 540, y: 868, s: 380 };
  function heroState(t) {
    const p = E.easeOutCubic(range(t, 12.0, 12.0 + F(9)));
    const c = CELLS[3];
    return { x: lerp(c.x, HERO.x, p), y: lerp(c.y, HERO.y, p), s: lerp(CELL_S, HERO.s, p), p };
  }
  function heroGuy(t) {
    const h = heroState(t);
    const he = hatEnv(t);
    // deadpan: dot eyes at the camera, flat mouth, one slow blink on the marimba tick (12.90)
    const bl = env(t, 12.9 + F(4), F(4), F(7)) > 0 ? Math.min(1, env(t, 12.9 + F(5), F(5), F(8)) * 1.25) : 0;
    clutcher(t, h.x, h.y, h.s, {
      eyes: t < 12.0 + F(3) ? 'squeeze' : 'dots', mouth: t < 12.0 + F(3) ? undefined : 'flat', sweat: 0.9, blink: false,
      jitter: 0.6 + 1.2 * he, seed: 14,
      over: () => { if (bl > 0) blinkLids(faceOf(t, h.x, h.y, h.s, [0, 0], 0.3), bl); },
    });
  }
  SCN.add(12.0, 13.3, 'a1-hero', (t) => {
    C.stormBG(t);
    const g = range(t, 12.0, 12.0 + F(6));
    const ctx = E.ctx;
    if (g < 1) { gridScene(t, { gone: g, noLabels: true, skipHero: true }); band(t, 655, 230 * (1 - E.easeInCubic(range(t, 12.0, 12.0 + F(4))))); }
    heroGuy(t);
    C.caption(t, { text: "IT'S THIS | LITTLE GUY.", times: wt('V09', 12.0), style: 'anton', size: 150, y: 262 });
  });

  // ================================================================== 13.30-15.00 PLATE 01
  const PL = { x: 75, y: 95, w: 930, h: 1160 };
  let paperCv = null;
  function paper() {
    if (paperCv) return paperCv;
    paperCv = document.createElement('canvas');
    paperCv.width = PL.w; paperCv.height = PL.h;
    const g = paperCv.getContext('2d');
    const im = g.createImageData(PL.w, PL.h);
    const base = [243, 235, 221];
    for (let y = 0; y < PL.h; y++) for (let x = 0; x < PL.w; x++) {
      const i = (y * PL.w + x) * 4;
      const n = hash(x * 0.731 + y * 17.13) - 0.5;
      const fib = Math.sin(x * 0.045 + Math.sin(y * 0.013) * 6 + y * 0.004) > 0.985 ? -7 : 0;
      for (let c = 0; c < 3; c++) im.data[i + c] = base[c] + n * 9 + fib;
      im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    const v = g.createRadialGradient(PL.w / 2, PL.h / 2, PL.h * 0.35, PL.w / 2, PL.h / 2, PL.h * 0.75);
    v.addColorStop(0, 'rgba(120,96,60,0)'); v.addColorStop(1, 'rgba(120,96,60,0.10)');
    g.fillStyle = v; g.fillRect(0, 0, PL.w, PL.h);
    return paperCv;
  }
  const stampCv = {};
  function stamp(word) {
    if (stampCv[word]) return stampCv[word];
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    g.font = '400 168px "Anton"';
    const w = Math.ceil(g.measureText(word).width) + 40;
    c.width = w; c.height = 200;
    g.font = '400 168px "Anton"'; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.fillStyle = G.INK; g.fillText(word, w / 2, 112);
    // worn rubber-stamp texture: knock out speckles + a few dry streaks
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 420; i++) {
      const x = hash(i * 1.37 + word.length) * w, y = hash(i * 2.71 + 5) * 200, r = 0.8 + hash(i * 3.3) * 2.4;
      g.globalAlpha = 0.5 + 0.5 * hash(i * 4.4); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    g.globalAlpha = 0.35;
    for (let i = 0; i < 5; i++) { g.fillRect(0, 40 + hash(i * 9.1 + 3) * 130, w, 2 + hash(i) * 3); }
    stampCv[word] = c;
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
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, rr = r * (1 + 0.07 * Math.sin(a * 5 + 1) + 0.04 * Math.sin(a * 9)); i ? ctx.lineTo(bx + Math.cos(a) * rr, by + Math.sin(a) * rr) : ctx.moveTo(bx + Math.cos(a) * rr, by + Math.sin(a) * rr); }
        ctx.closePath();
        ctx.fillStyle = PAL.paper; ctx.fill();
        ctx.save(); ctx.clip();
        hatch(ctx, bx - r, by - r, bx + r, by + r, 9, Math.PI / 4, 3, G.INK);
        hatch(ctx, bx - r, by - r, bx + r, by + r, 9, -Math.PI / 4, 3, G.INK);
        ctx.restore();
        ctx.lineWidth = 5; ctx.strokeStyle = G.INK; ctx.stroke();
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
  function plateContent(ctx, t) {
    ctx.drawImage(paper(), 0, 0);
    ctx.strokeStyle = G.INK;
    ctx.lineWidth = 5; ctx.strokeRect(20, 20, PL.w - 40, PL.h - 40);
    ctx.lineWidth = 2.5; ctx.strokeRect(32, 32, PL.w - 64, PL.h - 64);
    ctx.fillStyle = G.INK; ctx.textBaseline = 'middle';
    ctx.font = '600 35px "JBM"';
    ctx.fillText('FIELD GUIDE TO THE MIND · PLATE 01', 56, 82);
    ctx.fillRect(56, 112, PL.w - 112, 4);
    specimen(ctx);
    ctx.font = '500 28px "JBM"';
    ctx.fillText('fig. 1', 102, 712);
    ctx.fillRect(56, 752, PL.w - 112, 4);
    const rows = [['pali:', 'taṇhā (lit. thirst)'], ['diet:', "whatever's next"], ['lifespan:', 'one moment. respawns.']];
    rows.forEach(([k, v], i) => {
      const y = 838 + i * 92;
      ctx.font = '600 40px "JBM"'; ctx.fillText(k, 56, y);
      ctx.font = '500 40px "JBM"'; ctx.fillText(v, 56 + 24 * 10, y);
    });
    STAMPS.forEach(([w, ts, x, y, rot]) => {
      if (t < ts) return;
      const c = stamp(w);
      const k = t < ts + F(1) ? 1.12 : 1;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k);
      ctx.globalAlpha = 0.93;
      ctx.drawImage(c, -c.width / 2, -c.height / 2);
      ctx.restore();
    });
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
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
    ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, PL.w, PL.h);
    ctx.restore();
    plateContent(ctx, t);
    ctx.restore();
  }
  SCN.add(13.3, 15.0, 'a1-plate', (t) => {
    const ctx = E.ctx;
    C.stormBG(t);
    heroGuy(t);
    if (t < 13.5) C.caption(t, { text: "IT'S THIS | LITTLE GUY.", times: wt('V09', 12.0), style: 'anton', size: 150, y: 262 });
    ctx.fillStyle = `rgba(10,9,14,${0.45 * E.smooth(range(t, 13.3, 13.5))})`; ctx.fillRect(0, 0, W, H);
    const p = range(t, 13.3, 13.5);
    const dy = p < 1 ? (H - PL.y + 60) * (1 - E.easeOutCubic(p)) : (t < 13.5 + F(1) ? 4 : 0);
    drawPlate(t, dy);
  });

  // ================================================================== 15.00-18.00 IT BUZZES. SO HE SQUEEZES.
  // tape-stop: animation clock decelerates to a freeze over 17.55-18.0
  const TS0 = 17.55, TSD = 0.45;
  function tv(t) { if (t < TS0) return t; const p = Math.min(1, (t - TS0) / TSD); return TS0 + TSD * (p - p * p / 2); }
  const FRAGS = [
    ['am i doing this right', 100, 548, 15.04, 30], ['reply to him', 792, 702, 15.24, 30], ['did i lock it', 96, 880, 15.46, 32],
    ['i should be calmer by now', 486, 620, 15.66, 28], ['what if they', 104, 1060, 15.9, 30], ['rent', 866, 878, 16.12, 32],
  ];
  function fragments(t) {
    if (t >= 16.5) return;
    const ctx = E.ctx;
    ctx.save(); ctx.textBaseline = 'middle';
    FRAGS.forEach(([txt, x, y, t0, sz], i) => {
      if (t < t0) return;
      const age = t - t0;
      const a = (0.55 + 0.25 * hash(i * 3.7)) * clamp(age / F(2)) * (1 - clamp((t - 16.38) / 0.12));
      const dx = (x < 540 ? -1 : 1) * age * 10, dy = Math.sin(age * 2 + i) * 4;
      ctx.font = `500 ${sz}px "JBM"`;
      ctx.fillStyle = `rgba(255,246,224,${a})`;
      ctx.fillText(txt, x + dx, y + dy);
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
  let plateCv = null;
  function plateImage() {
    if (plateCv) return plateCv;
    plateCv = document.createElement('canvas'); plateCv.width = PL.w; plateCv.height = PL.h;
    const g = plateCv.getContext('2d');
    const keep = E.ctx;
    // plateContent draws on the ctx it is given; the specimen goes through GRABBY (ENGINE.ctx), so render via a swap
    plateContentOn(g);
    return plateCv;
  }
  function plateContentOn(g) {
    // GRABBY/PRIM draw on ENGINE.ctx; render the full plate on the main canvas off to the side is not possible,
    // so draw it at the origin of the main canvas into a saved region and copy.
    const ctx = E.ctx;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const keep = ctx.getImageData(0, 0, PL.w, PL.h);
    ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, PL.w, PL.h);
    plateContent(ctx, 99);
    g.drawImage(ctx.canvas, 0, 0, PL.w, PL.h, 0, 0, PL.w, PL.h);
    ctx.putImageData(keep, 0, 0);
    ctx.restore();
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
      poly(ctx, pc.poly); ctx.closePath();
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
      ctx.fillStyle = PAL.paper; ctx.fill();
      ctx.restore();
      ctx.clip();
      ctx.drawImage(img, 0, 0);
      // torn paper core along the tear
      poly(ctx, TEAR);
      ctx.strokeStyle = '#FFFDF6'; ctx.lineWidth = 14; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.strokeStyle = 'rgba(35,32,43,0.25)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    });
  }
  SCN.add(15.0, 18.0, 'a1-buzz', (t) => {
    const ctx = E.ctx;
    const v = tv(t);
    const st = buzzState(v);
    const flash = C.flashEnv(v, [17.0]);
    // frame shake at 17.0 (5 px, decaying over 8 frames)
    const sf = Math.floor((v - 17.0) * 30);
    const sh = (sf >= 0 && sf < 8) ? 5 * (1 - sf / 8) : 0;
    const shx = sh ? Math.round((hash(sf * 3.3) > 0.5 ? 1 : -1) * sh) : 0, shy = sh ? Math.round((hash(sf * 7.1) > 0.5 ? 1 : -1) * sh * 0.7) : 0;
    C.stormBG(v, { flash: flash * 0.45 });
    ctx.save();
    ctx.translate(shx, shy);
    let info = null;
    C.hookBase(v, {
      bg: false, cam: 1.0, sweatDrip: E.easeInCubic(range(v, 15.4, 16.4)) * 0.9,
      blobR: st.blobR, dark: st.dark, jitter: st.jitter, squeeze: st.squeeze,
      arm: { tremble: st.tremble },
      over: (i) => {
        info = i;
        // the last bit of the nice cloud inside the blob flickers out
        const wa = (1 - range(v, 15.6, 16.35)) * (hash(Math.floor(v * 15)) > 0.25 ? 1 : 0.3);
        if (wa > 0 && v < 16.35) C.puff(i.x - 14, i.y + 4, 21, { alpha: 0.9 * wa, ow: 2.5, grey: 0.05, t: v });
      },
    });
    fragments(v);
    const lp = E.easeOutCubic(range(t, 16.5, 16.5 + F(6)));
    if (info && lp > 0) leader2(info.x + 6, info.y - info.r * 0.92, 736, 684, lp);
    C.mono(t, 'EVIL VIBRATING BLOB', 1000, 596, { size: 44, weight: 600, align: 'right', t0: 16.5 + F(5) });
    C.mono(t, '(was a perfectly nice cloud)', 1000, 648, { size: 38, align: 'right', t0: 16.5 + F(9), alpha: 0.92 });
    C.caption(t, { text: 'IT BUZZES. | SO HE SQUEEZES. | SO IT BUZZES.', times: wt('V11', 15.0), style: 'anton', size: 132, y: 330 });
    ctx.restore();
    ripPieces(t);
    // tape-stop: desaturate ~40% and dim a touch as the clock winds down
    const ts = range(t, TS0, 18.0);
    if (ts > 0) {
      const d = E.smooth(ts);
      ctx.save();
      ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = 0.42 * d;
      ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.12 * d;
      ctx.fillStyle = '#20202a'; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  });
})();
