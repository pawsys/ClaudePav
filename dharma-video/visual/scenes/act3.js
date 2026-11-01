// ACT 3 (36-60 s): drop, headless poster, metta, Tilopa subtraction (voiceless), rest, regrab seam.
(function () {
  const E = ENGINE, P = PRIM, PAL = C.PAL, G = GRABBY;
  const TAU = Math.PI * 2;
  const B = C.BOUND.t36;

  // ---------------------------------------------------------------- helpers
  const ease = E.easeOutCubic, sm = E.smooth, R = E.range;
  function mixHex(a, b, k) {
    const A = E.hexToRgb(a), Bb = E.hexToRgb(b);
    const m = E.mixRgb(A, Bb, E.clamp(k));
    return '#' + m.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  }
  // flat ink sun: gold disc, ink outline, short rounded rays
  function inkSun(t, cx, cy, r, { alpha = 1, rays = 1 } = {}) {
    if (alpha <= 0) return;
    const ctx = E.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    // soft 2-stop glow (only light source allowed to glow)
    const g = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 2.6);
    g.addColorStop(0, 'rgba(255,214,140,0.45)');
    g.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r * 2.6, 0, TAU); ctx.fill();
    // rays
    if (rays > 0) {
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + t * 0.12;
        const r0 = r * 1.22, r1 = r * (1.22 + 0.36 * rays * (i % 2 ? 0.75 : 1));
        const x0 = cx + Math.cos(a) * r0, y0 = cy + Math.sin(a) * r0, x1 = cx + Math.cos(a) * r1, y1 = cy + Math.sin(a) * r1;
        ctx.lineCap = 'round';
        ctx.strokeStyle = PAL.ink; ctx.lineWidth = 15;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.strokeStyle = PAL.gold; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    }
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
    ctx.lineWidth = 10; ctx.strokeStyle = PAL.ink; ctx.stroke();
    ctx.fillStyle = PAL.gold; ctx.fill();
    ctx.restore();
  }
  // jhana orb: flat gold disc + soft 2-stop glow
  function orb(cx, cy, r, glow = 1, alpha = 1) {
    const ctx = E.ctx;
    ctx.save(); ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2.4);
    g.addColorStop(0, `rgba(255,205,110,${0.55 * glow})`); g.addColorStop(1, 'rgba(255,205,110,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 2.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
    ctx.lineWidth = 6; ctx.strokeStyle = PAL.ink; ctx.stroke();
    ctx.fillStyle = PAL.gold; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.3, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // headless seated silhouette (navy fill, cream outline), navel at (cx, cy), scale s. Rendered offscreen so
  // alpha fades have no overlap artifacts. o.erase: 0..1 outline erased bottom->top; o.window: dashed head alpha
  let _sil = null;
  function silPath(c, cx, cy, s) {
    const X = x => cx + x * s, Y = y => cy + y * s;
    c.beginPath();
    c.moveTo(X(-0.12), Y(-1.22));
    c.lineTo(X(-0.13), Y(-1.08));
    c.bezierCurveTo(X(-0.3), Y(-1.02), X(-0.52), Y(-0.98), X(-0.64), Y(-0.92));
    c.bezierCurveTo(X(-0.76), Y(-0.86), X(-0.8), Y(-0.74), X(-0.8), Y(-0.6));
    c.bezierCurveTo(X(-0.84), Y(-0.36), X(-0.92), Y(-0.16), X(-0.9), Y(0.02));
    c.bezierCurveTo(X(-0.9), Y(0.14), X(-0.86), Y(0.22), X(-0.8), Y(0.28));
    c.bezierCurveTo(X(-1.18), Y(0.36), X(-1.46), Y(0.56), X(-1.32), Y(0.74));
    c.bezierCurveTo(X(-1.2), Y(0.9), X(-0.7), Y(0.94), X(0), Y(0.94));
    c.bezierCurveTo(X(0.7), Y(0.94), X(1.2), Y(0.9), X(1.32), Y(0.74));
    c.bezierCurveTo(X(1.46), Y(0.56), X(1.18), Y(0.36), X(0.8), Y(0.28));
    c.bezierCurveTo(X(0.86), Y(0.22), X(0.9), Y(0.14), X(0.9), Y(0.02));
    c.bezierCurveTo(X(0.92), Y(-0.16), X(0.84), Y(-0.36), X(0.8), Y(-0.6));
    c.bezierCurveTo(X(0.8), Y(-0.74), X(0.76), Y(-0.86), X(0.64), Y(-0.92));
    c.bezierCurveTo(X(0.52), Y(-0.98), X(0.3), Y(-1.02), X(0.13), Y(-1.08));
    c.lineTo(X(0.12), Y(-1.22));
    c.closePath();
    // cushion
    c.moveTo(X(1.22), Y(1.0));
    c.ellipse(cx, Y(1.0), 1.22 * s, 0.17 * s, 0, 0, TAU);
  }
  function silDetail(c, cx, cy, s) {
    const X = x => cx + x * s, Y = y => cy + y * s;
    c.beginPath();
    // arm / torso separation and forearms meeting in the lap
    for (const sd of [-1, 1]) {
      c.moveTo(X(sd * 0.56), Y(-0.66));
      c.bezierCurveTo(X(sd * 0.52), Y(-0.3), X(sd * 0.5), Y(-0.02), X(sd * 0.42), Y(0.14));
      c.moveTo(X(sd * 0.84), Y(0.12));
      c.bezierCurveTo(X(sd * 0.66), Y(0.3), X(sd * 0.42), Y(0.36), X(sd * 0.2), Y(0.34));
    }
    // cupped hands
    c.moveTo(X(0.27), Y(0.33));
    c.ellipse(cx, Y(0.33), 0.27 * s, 0.09 * s, 0, 0, TAU);
    // ankles
    c.moveTo(X(-0.5), Y(0.66)); c.bezierCurveTo(X(-0.2), Y(0.58), X(0.2), Y(0.58), X(0.55), Y(0.68));
  }
  function silhouette(cx, cy, s, { fillA = 1, outlineA = 1, erase = 0, window: win = 0, fillCol = PAL.navy } = {}) {
    const ctx = E.ctx;
    if (!_sil) { _sil = document.createElement('canvas'); _sil.width = E.W; _sil.height = E.H; }
    const o = _sil.getContext('2d');
    o.setTransform(ctx.getTransform());
    o.save(); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, E.W, E.H); o.restore();
    // outline layer (cream, thick) then fill on top; erase clips the outline from the bottom up
    if (outlineA > 0) {
      o.save();
      o.globalAlpha = Math.min(1, outlineA);
      if (erase > 0) { const yCut = E.lerp(cy + 1.3 * s, cy - 1.3 * s, erase); o.beginPath(); o.rect(-4000, -4000, 9000, yCut + 4000); o.clip(); }
      o.lineJoin = 'round'; o.strokeStyle = PAL.cream; o.lineWidth = 12;
      silPath(o, cx, cy, s); o.stroke();
      o.restore();
    }
    if (fillA > 0) {
      o.save();
      o.globalAlpha = fillA;
      o.fillStyle = fillCol; silPath(o, cx, cy, s); o.fill();
      o.globalAlpha = fillA * 0.5; o.strokeStyle = PAL.cream; o.lineWidth = 5; o.lineCap = 'round';
      silDetail(o, cx, cy, s); o.stroke();
      o.restore();
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = outlineA > 0 || fillA > 0 ? 1 : 0; ctx.drawImage(_sil, 0, 0); ctx.restore();
    if (win > 0) {
      ctx.save();
      ctx.globalAlpha = win;
      ctx.setLineDash([22, 18]);
      ctx.strokeStyle = PAL.navy; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(cx, cy - 1.56 * s, 0.31 * s, 0.37 * s, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- shared world state
  // poster geometry (camera 1.0)
  const BODY = { x: 540, y: 1000, s: 330 };          // navel; shoulders ~ y 677, legs to ~1300
  const LAP = { x: 540, y: BODY.y + 0.27 * BODY.s }; // where the hands cup (~1089)
  const HEAD = { x: 540, y: BODY.y - 1.56 * BODY.s }; // dashed head window centre (~485)
  const POSTER_SKY = { top: '#4A86CF', bot: '#FBE7C8', horizon: '#FFC861', cloud: 0.28, storm: 0, warp: 1.1, zoom: 1.0, driftR: 0.6, sunPos: [0.5, 0.64], glowR: 0.28 };

  function skyAct3(t, over = {}) {
    C.skyBG(Object.assign({ t }, POSTER_SKY, over));
  }

  // gold motes (<= 20), ink-style dots with a tiny glow
  function goldMotes(t, alpha) {
    if (alpha <= 0) return;
    P.motes(t, { count: 18, color: [255, 205, 110], alpha: alpha * 0.9, rise: 26, size: 4, seed: 9, glow: false, twinkle: true });
  }

  // ================================================================ 36.0 - 39.0 DROP / SUNSHINIFICATION
  SCN.add(36.0, 39.0, 'drop', (t) => {
    const k = sm(R(t, 36.0, 37.2));
    skyAct3(t, {
      top: mixHex(B.sky.top, POSTER_SKY.top, k), bot: mixHex(B.sky.bot, POSTER_SKY.bot, k), horizon: mixHex(B.sky.horizon, POSTER_SKY.horizon, k),
      cloud: E.lerp(B.sky.cloud, POSTER_SKY.cloud, k), sun: 0.18 * k, sunPos: [0.62, 0.62],
    });
    const ctx = E.ctx;
    // sun rises from behind the little cloud
    const sp = ease(R(t, 36.0, 37.3));
    const sx = E.lerp(780, 690, sp), sy = E.lerp(760, 590, sp);
    // light flood on the downbeat (the bible's god rays)
    P.godrays(t, sx, sy, 1.0 * sm(R(t, 36.0, 36.5)), { count: 11, len: 1700, spread: 1.7, dir: Math.PI * 0.62 });
    inkSun(t, sx, sy, E.lerp(40, 92, sp), { alpha: sm(R(t, 36.0, 36.1)), rays: sp });
    // the little cloud, now gold-rimmed
    C.puff(B.cloud.x, B.cloud.y, B.cloud.r, { t, rim: sm(R(t, 36.3, 37.0)) });
    goldMotes(t, sm(R(t, 36.2, 37.0)));
    // grabbygrab palm-up, orb glowing in palm
    const glow = 1 + 0.5 * sm(R(t, 36.0, 36.6));
    // orb rests IN FRONT of the open fingers (C.BOUND.t36.orb contract shared with act 2)
    let hp = null;
    G.grabby(t, B.grabby.x, B.grabby.y, B.grabby.s, {
      eyes: t < 36.5 ? 'dots' : 'happy', arm: { ext: 0, open: 1, ang: -0.55 },
      holding: (hx, hy) => { hp = [hx, hy]; },
    });
    if (hp) orb(hp[0] + B.orb.off[0], hp[1] + B.orb.off[1], B.orb.r, glow);
    // warm bloom on the downbeat
    { const fl = 0.5 * (1 - E.clamp((t - 36.0) / 0.2)); if (fl > 0) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(255,240,210,${fl})`; ctx.fillRect(0, 0, E.W, E.H); ctx.restore(); } }
    // HUD meter
    if (t >= 36.0 && t < 37.42) {
      const pct = Math.round(78 * ease(R(t, 36.05, 37.1)));
      const nb = 9, filled = Math.round(nb * pct / 100);
      const bar = '▓'.repeat(filled) + '░'.repeat(nb - filled);
      C.mono(t, `sunshinification ${bar} ${pct}%`, 540, 205, { size: 40, color: PAL.navy, align: 'center', weight: 600, t0: 36.0, t1: 37.42 });
    }
    // 'unclench.' blooms with the choir
    C.caption(t, { text: 'unclench.', id: 'C4', style: 'serif', y: 330, size: 140, t1: 37.28, over: { spacing: 0, exit: 4 / 30 },
      emph: { unclench: { spacing: 15 * sm(R(t, 36.0, 37.4)) } } });
    // 'turns out / the joy was free.'
    C.caption(t, { text: 'turns out | the joy was free.', id: 'V22', style: 'serifRoman', y: 320, size: 100, color: PAL.navy, t1: 39.25,
      emph: { free: { italic: true, color: PAL.marigold, hair: PAL.navy, scale: 1.08 } } });
  });

  // ================================================================ 39.0 - 42.75 POSTER: on having no head
  function posterWorld(t, o = {}) {
    // o: winA, sunA, cloudA, motesA, tagA, grabbyEyes, orbGlow, skyOver, silFill, silOutline, silErase
    const ctx = E.ctx;
    silhouette(BODY.x, BODY.y, BODY.s, { fillA: o.silFill ?? 1, outlineA: o.silOutline ?? 1, erase: o.silErase ?? 0, window: o.winA ?? 0 });
    // head window holds only sky and a passing cloud (Harding); sun sits off to the right
    inkSun(t, HEAD.x + 320, HEAD.y + 10, 46, { alpha: o.sunA ?? 1, rays: o.sunA ?? 1 });
    C.puff(HEAD.x + E.lerp(170, 0, sm(R(t, 39.4, 42.0))), HEAD.y + 8, 54, { t, rim: 1, alpha: o.cloudA ?? 1, ow: 4 });
    goldMotes(t, o.motesA ?? 1);
    // grabbygrab in the cupped hands
    const gs = o.gs ?? 92;
    let hp = null;
    G.grabby(t, LAP.x, LAP.y - gs * 0.72, gs, {
      eyes: o.eyes || 'happy', blush: o.blush || 0, bob: 0.4, shadow: false,
      arm: o.arm || { ext: 0, open: 1, ang: -0.55 },
      holding: (hx, hy) => { hp = [hx, hy]; },
    });
    if (hp && (o.orbA ?? 1) > 0) orb(hp[0] + 3, hp[1] - 16, 17, o.orbGlow ?? 1.4, o.orbA ?? 1);
  }

  SCN.add(39.0, 42.75, 'poster', (t) => {
    skyAct3(t, { sun: 0.12, sunPos: [0.5, 0.64] });
    const ctx = E.ctx;
    // camera pull-back 1.65 -> 1.0, anchored on the head window
    const k = E.easeInOutSine(R(t, 39.0, 40.6));
    const sc = E.lerp(1.65, 1.0, k);
    ctx.save();
    C.camera(sc, HEAD.x, HEAD.y);
    posterWorld(t, { winA: sm(R(t, 39.6, 40.4)) });
    ctx.restore();
    // the thesis line holds across the cut for a beat
    C.caption(t, { text: 'turns out | the joy was free.', id: 'V22', style: 'serifRoman', y: 320, size: 100, color: PAL.navy, t1: 39.25, emph: { free: { italic: true, color: PAL.marigold, hair: PAL.navy, scale: 1.08 } } });
    // lyric in the head-space
    C.caption(t, { text: 'you are | the sky.', id: 'C5', style: 'serif', y: 255, size: 128, t1: 42.6, times: [39.62, 39.69, 40.44, 40.815] });
    C.mono(t, 'PLATE 02\nON HAVING\nNO HEAD', 92, 560, { size: 36, color: PAL.navy, weight: 600, t0: 39.9 });
  });

  // ================================================================ 42.75 - 49.5 METTA
  SCN.add(42.75, 49.5, 'metta', (t) => {
    skyAct3(t, { sun: 0.12, sunPos: [0.5, 0.64] });
    const ctx = E.ctx;
    // push in to the lap, then (48.75-49.5) ease back out to the poster
    const inK = E.easeInOutSine(R(t, 42.75, 43.05));
    const outK = E.easeInOutSine(R(t, 48.75, 49.5));
    const k = inK * (1 - outK);
    const sc = E.lerp(1.0, 1.85, k);
    const dy = E.lerp(0, 840 - LAP.y, k);
    ctx.save();
    C.camera(sc, LAP.x, LAP.y - 40, 0, dy);
    // warm light falling onto him from the hands
    const warm = sm(R(t, 44.2, 45.6));
    if (warm > 0) {
      const g = ctx.createRadialGradient(LAP.x, LAP.y - 40, 10, LAP.x, LAP.y - 40, 170);
      g.addColorStop(0, `rgba(255,190,140,${0.55 * warm})`);
      g.addColorStop(1, 'rgba(255,217,160,0)');
      posterWorld(t, {
        winA: 1, eyes: t < 44.0 ? 'dots' : 'happy', blush: 0.35 * sm(R(t, 45.4, 46.0)),
        arm: waveArm(t), orbGlow: 1.4,
      });
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(LAP.x, LAP.y - 40, 170, 0, TAU); ctx.fill(); ctx.restore();
    } else {
      posterWorld(t, { winA: 1, eyes: t < 44.0 ? 'dots' : 'happy', arm: waveArm(t) });
    }
    // ensō paints around him 44.0 - 45.2
    P.enso(LAP.x, LAP.y - 68, 112, ease(R(t, 44.0, 45.2)), { width: 26, color: '255,200,97', glow: 8, seed: 4 });
    ctx.restore();
    // words
    const mcol = k > 0.5 ? PAL.warmWhite : PAL.navy, msh = k > 0.5 ? 'rgba(10,14,30,0.5)' : null;
    C.caption(t, { text: "don't fight him.", id: 'V24', times: C.wordTimes('V24', 3, 0.08).map(x => Math.max(x, 42.92)), style: 'serif', y: 300, size: 100, t1: 43.68, over: { exit: 3 / 30, exitBlur: 4 }, color: mcol, shadow: msh });
    C.caption(t, { text: "he's just scared.", id: 'V24b', style: 'serif', y: 300, size: 100, t1: 44.84, over: { exit: 3 / 30, exitBlur: 4 }, color: mcol, shadow: msh });
    C.caption(t, { text: 'love him open.', id: 'C6', style: 'serif', y: 240, size: 124, t1: 48.5, lead: 0.06, color: mcol, shadow: msh,
      emph: { open: { spacing: 22 * sm(R(t, 46.5, 48.0)) } } });
    C.mono(t, '(may you be happy. even you.)', 540, 1167, { size: 40, color: PAL.warmWhite, align: 'center', t0: 47.0, t1: 48.7 });
  });
  function waveArm(t) {
    // small shy open-handed wave 46.4 - 47.6
    const w = R(t, 46.4, 47.6);
    if (w <= 0 || w >= 1) return { ext: 0, open: 1, ang: -0.55 };
    const lift = Math.sin(w * Math.PI);
    return { ext: 0.55 * lift, tx: LAP.x + 70, ty: LAP.y - 190, open: 1, ang: -1.25 + 0.35 * Math.sin(w * Math.PI * 6) * lift };
  }

  // ================================================================ 49.5 - 54.0 TILOPA (voiceless subtraction)
  const TIL = [
    [49.5, "don't recall.", 120], [50.25, "don't imagine.", 110], [51.0, "don't think.", 104],
    [51.75, "don't examine.", 96], [52.5, "don't control.", 88],
  ];
  SCN.add(49.5, 54.0, 'tilopa', (t) => {
    const pop = (tt) => t >= tt ? 1 : 0; // hard pops on the beat
    const imagine = sm(R(t, 50.25, 50.55)), think = sm(R(t, 51.0, 51.3));
    const ctrl = R(t, 52.5, 53.7);
    // sky: clouds melt on 'imagine', sun glow off on 'think'; drift toward the rest gradient late
    const toRest = sm(R(t, 53.2, 54.0));
    skyAct3(t, {
      cloud: POSTER_SKY.cloud * (1 - imagine), sun: 0.12 * (1 - think),
      top: mixHex(POSTER_SKY.top, PAL.restTop, toRest), bot: mixHex(POSTER_SKY.bot, PAL.restBot, toRest), horizon: mixHex(POSTER_SKY.horizon, PAL.restBot, toRest),
    });
    const ctx = E.ctx;
    // ensō (kept from metta) un-paints on 'examine'
    const unp = ease(R(t, 51.75, 52.35));
    // silhouette: on 'control' fill cross-fades to sky, outline erases last
    posterWorld(t, {
      winA: 1 - pop(52.5) * sm(R(t, 52.5, 53.0)),
      sunA: 1 - think, cloudA: 1 - imagine, motesA: 1 - think,
      silFill: 1 - sm(R(t, 52.5, 53.0)), silOutline: 1 - sm(R(t, 53.0, 53.25)), silErase: ease(R(t, 52.85, 53.35)),
      eyes: t < 52.5 ? 'happy' : 'closed', orbGlow: 1.4 * (1 - think), orbA: 1 - think,
    });
    if (unp < 1) P.enso(LAP.x, LAP.y - 68, 112, 1, { width: 26, color: '255,200,97', glow: 8, seed: 4, unp });
    // the six words, each replaces the previous, shrinking
    let cur = null;
    for (const L of TIL) if (t >= L[0] - 0.06) cur = L;
    if (cur) C.caption(t, { text: cur[1], style: 'serif', y: 255, size: cur[2], times: [cur[0] - 0.06, cur[0] - 0.06], over: { enter: 2 / 30, rise: 4, blur: 0 } });
    C.mono(t, "TILOPA'S\nSIX WORDS", 92, 560, { size: 36, color: PAL.navy, weight: 600, t0: 49.5, t1: 51.6 });
  });

  let _storm = null;
  function stormLayer() { if (!_storm) { _storm = document.createElement('canvas'); _storm.width = E.W; _storm.height = E.H; } return _storm; }
  // ================================================================ 54.0 - 60.0 REST + REGRAB SEAM
  SCN.add(54.0, 60.0, 'rest', (t) => {
    const ctx = E.ctx;
    const breathe = 0.03 * Math.sin(TAU * 0.2 * (t - 54.0));
    const slam = E.easeInCubic(R(t, 59.25, 59.9));      // storm takes over
    // rest gradient with luminance breathing
    C.skyBG({ t, top: PAL.restTop, bot: PAL.restBot, horizon: PAL.restBot, cloud: 0.0, dark: -breathe });
    // tiny grabbygrab asleep; one eye opens 56.25-57.4
    const oneEye = t >= 56.25 && t < 57.45;
    const micro = (t >= 56.25 && t < 56.25 + 2 / 30) ? 1.03 : 1.0;
    // seam: from the grab (59.25) the frame-0 rig itself (C.hookBase) draws him, scaled about (540, 960) from
    // size 150 to 300, so the last frames converge on frame 0 with no second pose to crossfade.
    const gx = 540, gy = 960, gs = E.lerp(150, 300, E.easeInCubic(R(t, 59.25, 59.97)));
    const wispP = ease(R(t, 58.5, 59.25));
    const grabbed = t >= 59.25;
    const wx = E.lerp(1180, 780, wispP), wy = 900;
    // storm slams in from the edges (59.25-59.9), fully opaque from 59.9 (same call as frame 0)
    if (slam >= 1) {
      C.stormBG(t, { flash: 0 });
    } else if (slam > 0) {
      E.sky(Object.assign({ t }, C.STORM));
      const oc = stormLayer();
      const o2 = oc.getContext('2d');
      o2.globalCompositeOperation = 'source-over';
      o2.clearRect(0, 0, E.W, E.H);
      o2.drawImage(E.glCanvas, 0, 0, E.W, E.H);
      const r0 = E.lerp(950, -260, slam);
      const g = o2.createRadialGradient(540, 820, Math.max(1, r0 * 0.55), 540, 820, Math.max(2, r0 + 260));
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
      o2.globalCompositeOperation = 'destination-in';
      o2.fillStyle = g; o2.fillRect(0, 0, E.W, E.H);
      ctx.drawImage(oc, 0, 0);
    }
    if (!grabbed) {
      ctx.save();
      C.camera(micro, gx, gy);
      let eyes = 'closed', mouth = 'smile';
      if (oneEye) { eyes = 'one'; mouth = 'flat'; }
      if (wispP > 0) C.puff(wx, wy, 46, { t, ow: 4 });
      G.grabby(t, gx, gy, gs, { eyes, mouth, bob: 0.6, arm: { ext: 0, open: 1, ang: -0.55 }, shadow: true });
      ctx.restore();
    } else {
      // arm in hookBase world (size 300 about 540,960): shoot to the wisp, then retract clockwise to the clutch pose
      const k = gs / 300;
      const armP = R(t, 59.25, 59.42), retract = ease(R(t, 59.42, 59.6));
      const W = [540 + (wx - 540) / k, 960 + (wy - 960) / k];
      const rest = [540 + 0.6 * 300, 960 + 0.3 * 300], hook = [740, 1052];
      const tx = retract > 0 ? E.lerp(W[0], hook[0], retract) : E.lerp(rest[0], W[0], armP);
      const ty = retract > 0 ? E.lerp(W[1], hook[1], retract) : E.lerp(rest[1], W[1], armP);
      const ang = retract > 0 ? E.lerp(0, Math.PI * 0.97, retract) : 0;
      const open = armP < 1 ? 1 - armP : 0;
      C.hookBase(t, {
        bg: false, cam: k, camX: 540, camY: 960,
        arm: { tx, ty, ext: 1, open, ang, tremble: 0 },
        blobR: E.lerp(40, 78, sm(R(t, 59.25, 59.9))), jitter: sm(R(t, 59.25, 59.45)),
      });
    }
    // words
    C.caption(t, { text: 'rest.', id: 'V31', style: 'serif', y: 560, size: 120, t1: 56.8, over: { exit: 4 / 30 } });
    C.caption(t, { text: 'when he grabs again,', id: 'V32', style: 'serif', y: 720, size: 64, t1: 56.8, alpha: 0.85, over: { exit: 4 / 30 } });
    C.mono(t, '(i will.)', 660, 840, { size: 44, color: PAL.navy, t0: 56.6, t1: 57.9 });
    C.caption(t, { text: 'just come back.', id: 'V33', style: 'serif', y: 600, size: 100, t1: 59.2 });
  });

  // global watermark
  window.WATERMARK = (t) => {
    if (t >= 52.5 && t < 54.0) return null;               // lets go on "don't control"
    if (t >= 54.0 && t < 59.25) return { color: 'rgba(30,43,71,0.6)' };
    const dark = t < 23.5 || t >= 59.25;
    return { color: dark ? 'rgba(255,246,224,0.45)' : 'rgba(30,43,71,0.85)' };
  };
})();
