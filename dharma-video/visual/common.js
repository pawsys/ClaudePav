// Shared look + helpers for UNCLENCH scenes. Everything is a pure function of t.
(function () {
  const E = window.ENGINE;
  const TAU = Math.PI * 2;
  const FPS = 30;

  // ---------------------------------------------------------------- palette
  const PAL = {
    storm: '#1B1A22', stormFog: '#3A3348', yellow: '#FFD23F', ink: '#23202B', inkDeep: '#141018',
    cream: '#F6EDE0', warmWhite: '#FFF6E0', navy: '#1E2B47', gold: '#FFC861', marigold: '#F2A900',
    blobA: '#4A4556', blobB: '#121117', zenith: '#5B8FCB', mid: '#A9CBE8', haze: '#F4EFE6', peach: '#F9DDB1',
    zenithDeep: '#3F78C0', metta1: '#FF9E7A', metta2: '#FFD9A0', restBot: '#FFE3C8', restTop: '#CFE3F2',
    paper: '#F3EBDD', blush: '#F2A7A0',
  };

  // ---------------------------------------------------------------- timing
  const T = window.TIMING || { lines: [], choir: [] };
  function line(id) {
    return T.lines.find(l => l.id === id) || T.choir.find(l => l.id === id);
  }
  // word times for on-screen words: maps on-screen words (split by spaces, ignoring '|') onto
  // spoken word times by index; extra on-screen words reuse the last spoken time.
  function wordTimes(id, nWords, lead = 0.1) {
    const L = line(id);
    if (!L) return Array(nWords).fill(0);
    const wt = L.word_t;
    const out = [];
    for (let i = 0; i < nWords; i++) out.push(Math.max(0, wt[Math.min(i, wt.length - 1)] - lead));
    return out;
  }

  // ---------------------------------------------------------------- caption styles
  const STY = {
    anton: { fam: 'Anton', weight: '400', style: 'normal', size: 150, lead: 0.92, color: PAL.yellow, stroke: PAL.inkDeep, strokeW: 16, upper: true, enter: 2 / FPS, popFrom: 1.08, rise: 0, blur: 0, exit: 0, spacing: -1 },
    antonWhite: { fam: 'Anton', weight: '400', style: 'normal', size: 90, lead: 0.92, color: PAL.warmWhite, stroke: PAL.inkDeep, strokeW: 12, upper: true, enter: 2 / FPS, popFrom: 1.08, rise: 0, blur: 0, exit: 0, spacing: 0 },
    serif: { fam: 'EB Garamond', weight: '500', style: 'italic', size: 96, lead: 1.08, color: PAL.navy, enter: 8 / FPS, rise: 12, blur: 10, exit: 12 / FPS, exitRise: 10, exitBlur: 6, spacing: 0, upper: false },
    serifRoman: { fam: 'EB Garamond', weight: '500', style: 'normal', size: 88, lead: 1.1, color: PAL.warmWhite, enter: 8 / FPS, rise: 12, blur: 10, exit: 12 / FPS, exitRise: 10, exitBlur: 6, spacing: 0, upper: false },
    mono: { fam: 'JBM', weight: '500', style: 'normal', size: 40, lead: 1.25, color: PAL.warmWhite, enter: 1 / FPS, rise: 0, blur: 0, exit: 4 / FPS, spacing: 0, upper: false },
  };

  // spec: { text: 'A B | C D', times: [...] or id: 'V01', style, x, y, size, color, t0?, t1 (exit start),
  //         align: 'center'|'left'|'right', tremor: px, emph: {word: {color, italic, scale, spacing}}, shadow, alpha,
  //         allFrom: t  (all words visible from this time, used for frame-0 text) }
  function caption(t, spec) {
    const S = Object.assign({}, STY[spec.style || 'serif'], spec.over || {});
    const raw = spec.text.split('|').map(s => s.trim().split(/\s+/).filter(Boolean));
    const nW = raw.reduce((a, l) => a + l.length, 0);
    const times = spec.times || (spec.id ? wordTimes(spec.id, nW, spec.lead ?? 0.08) : Array(nW).fill(spec.t0 || 0));
    const t1 = spec.t1 ?? 1e9;
    if (t > t1 + (S.exit || 0) + 0.001) return;
    const first = Math.min(...times, spec.allFrom ?? 1e9);
    if (t < first - 0.0001) return;
    const ctx = E.ctx;
    const size = spec.size || S.size;
    const lead = size * S.lead;
    const x = spec.x ?? E.W / 2;
    const y0 = (spec.y ?? E.H / 2) - (raw.length - 1) * lead / 2;
    let exitP = S.exit > 0 ? E.clamp((t - t1) / S.exit) : (t >= t1 ? 1 : 0);
    const exitA = 1 - E.smooth(exitP);
    if (exitA <= 0) return;
    ctx.save();
    ctx.textBaseline = 'middle';
    let k = 0;
    raw.forEach((words, li) => {
      const ly = y0 + li * lead;
      const meta = words.map(w => {
        const key = w.replace(/[^\w']/g, '').toLowerCase();
        const em = (spec.emph || {})[key] || null;
        const fam = em && em.fam || S.fam;
        const style = em && em.italic ? 'italic' : (em && em.roman ? 'normal' : S.style);
        const sz = size * (em && em.scale || 1);
        const f = `${style} ${em && em.weight || S.weight} ${sz.toFixed(1)}px "${fam}"`;
        const txt = S.upper ? w.toUpperCase() : w;
        const sp = (em && em.spacing != null ? em.spacing : S.spacing) * (sz / 100);
        ctx.font = f;
        const wd = measureSp(ctx, txt, sp);
        return { w: txt, f, sp, wd, em, tt: times[k++] };
      });
      ctx.font = meta[0].f;
      const spaceW = ctx.measureText(' ').width * (S.upper ? 0.85 : 1);
      const total = meta.reduce((a, m) => a + m.wd, 0) + spaceW * (meta.length - 1);
      let cx = spec.align === 'left' ? x : spec.align === 'right' ? x - total : x - total / 2;
      meta.forEach((m, i) => {
        const tw = spec.allFrom != null ? Math.min(m.tt, spec.allFrom) : m.tt;
        let p = S.enter > 0 ? E.clamp((t - tw) / S.enter) : (t >= tw ? 1 : 0);
        if (spec.allFrom != null && t >= spec.allFrom) p = 1;
        if (p <= 0) { cx += m.wd + spaceW; return; }
        const e = E.easeOutCubic(p);
        let sc = S.popFrom ? E.lerp(S.popFrom, 1, e) : 1;
        if (spec.allFrom != null && t < m.tt) sc = 1;  // visible but not yet popped
        if (spec.allFrom != null && t >= m.tt) { const pp = E.clamp((t - m.tt) / (2 / FPS)); sc = E.lerp(S.popFrom || 1.08, 1, pp); }
        const dy = (S.rise || 0) * (1 - e) - (S.exitRise || 0) * (1 - exitA);
        const bl = (S.blur || 0) * (1 - e) + (S.exitBlur || 0) * (1 - exitA);
        const trem = spec.tremor || 0;
        const tx = trem ? Math.round(Math.sin(t * 61 + i * 7 + li * 3) * trem) : 0;
        const ty = trem ? Math.round(Math.cos(t * 53 + i * 5 + li) * trem) : 0;
        ctx.save();
        ctx.globalAlpha = (spec.alpha ?? 1) * exitA * (S.enter > 0 && !S.popFrom ? e : 1);
        ctx.translate(cx + m.wd / 2 + tx, ly + dy + ty);
        ctx.scale(sc, sc);
        if (bl > 0.3) ctx.filter = `blur(${bl.toFixed(1)}px)`;
        ctx.font = m.f;
        const col = (m.em && m.em.color) || spec.color || S.color;
        drawSp(ctx, m.w, -m.wd / 2, 0, m.sp, col, S.stroke ? (spec.stroke || S.stroke) : null, S.strokeW * (size / 150), spec.shadow, (m.em && m.em.hair) || null);
        ctx.restore();
        cx += m.wd + spaceW;
      });
    });
    ctx.restore();
  }

  function measureSp(ctx, s, sp) {
    if (!sp) return ctx.measureText(s).width;
    let w = 0; for (const ch of s) w += ctx.measureText(ch).width + sp; return w - sp;
  }
  function drawSp(ctx, s, x, y, sp, col, stroke, sw, shadow, hair) {
    const chars = sp ? [...s] : [s];
    let cx = x;
    for (const ch of chars) {
      const w = ctx.measureText(ch).width;
      if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = 20; ctx.shadowOffsetY = 3; }
      if (stroke) {
        ctx.lineJoin = 'round'; ctx.lineWidth = sw; ctx.strokeStyle = stroke; ctx.strokeText(ch, cx, y);
        ctx.shadowColor = 'transparent';
      }
      if (hair) { ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = hair; ctx.strokeText(ch, cx, y); }
      ctx.fillStyle = col; ctx.fillText(ch, cx, y);
      ctx.shadowColor = 'transparent';
      cx += w + (sp || 0);
    }
  }

  // ---------------------------------------------------------------- mono labels
  // opts: size(>=38 for readable), color, align, chip (bg rgba string), typed: {t0, cps}, t0, t1, cursor
  function mono(t, text, x, y, o = {}) {
    const t0 = o.t0 ?? 0, t1 = o.t1 ?? 1e9;
    if (t < t0 || t > t1 + 0.15) return;
    const ctx = E.ctx;
    const size = o.size || 40;
    let s = text;
    if (o.typed) { const n = Math.floor((t - t0) * (o.typed.cps || 50)); s = text.slice(0, Math.max(0, n)); }
    const a = (o.alpha ?? 1) * (t > t1 ? 1 - (t - t1) / 0.15 : 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `${o.weight || 500} ${size}px "JBM"`;
    ctx.textBaseline = 'middle';
    const lines = s.split('\n');
    const lh = size * 1.25;
    lines.forEach((ln, i) => {
      const w = ctx.measureText(ln).width;
      const lx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
      const ly = y + i * lh;
      if (o.chip && ln.length) {
        ctx.fillStyle = o.chip;
        ctx.beginPath(); ctx.roundRect(lx - size * 0.35, ly - size * 0.68, w + size * 0.7, size * 1.36, size * 0.25); ctx.fill();
      }
      ctx.fillStyle = o.color || PAL.warmWhite;
      ctx.fillText(ln, lx, ly);
    });
    if (o.cursor && Math.floor(t * 2.5) % 2 === 0) {
      const last = lines[lines.length - 1];
      const w = ctx.measureText(last).width;
      const lx = o.align === 'center' ? x + w / 2 : o.align === 'right' ? x : x + w;
      ctx.fillStyle = o.color || PAL.warmWhite;
      ctx.fillRect(lx + 4, y + (lines.length - 1) * lh - size * 0.45, size * 0.55, size * 0.9);
    }
    ctx.restore();
  }

  // leader line with 6px dot terminal, drawn progressively p 0..1
  function leader(x0, y0, x1, y1, p, { color = PAL.warmWhite, width = 4 } = {}) {
    if (p <= 0) return;
    const ctx = E.ctx;
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x0, y0, 6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(E.lerp(x0, x1, p), E.lerp(y0, y1, p)); ctx.stroke();
    ctx.restore();
  }

  // wobbly hand-drawn marker loop around (cx,cy), p 0..1 over `loops` turns
  function markerLoop(cx, cy, rx, ry, p, { color = PAL.yellow, width = 10, loops = 2, seed = 3 } = {}) {
    if (p <= 0) return;
    const ctx = E.ctx;
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    const N = 120 * loops;
    const end = Math.floor(N * E.clamp(p));
    for (let i = 0; i <= end; i++) {
      const f = i / N;
      const a = -2.3 + f * loops * TAU;
      const wob = 1 + 0.06 * Math.sin(a * 3 + seed) + 0.03 * Math.sin(a * 7 + seed * 2) + f * 0.08;
      const x = cx + Math.cos(a) * rx * wob, y = cy + Math.sin(a) * ry * wob;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------- background helpers
  function skyBG(params) {
    E.sky(params);
    E.ctx.drawImage(E.glCanvas, 0, 0, E.W, E.H);
  }
  // Storm interior used by the hook (0 s) and the loop seam (59.97 s). Same params => pixel match.
  const STORM = { top: '#2a2733', bot: '#1d1b24', horizon: '#3A3348', cloud: 0.95, storm: 1, warp: 2.0, zoom: 1.5, dark: 0.12, driftR: 0.6 };
  function stormBG(t, extra = {}) {
    skyBG(Object.assign({ t }, STORM, extra));
  }
  // lightning flash envelope: 2 bright frames, 6-frame decay
  function flashEnv(t, times) {
    let f = 0;
    for (const ft of times) {
      const d = t - ft;
      if (d >= 0 && d < 8 / FPS) f = Math.max(f, d < 2 / FPS ? 1 : 1 - (d - 2 / FPS) / (6 / FPS));
    }
    return f;
  }

  // camera: scale about a point (canvas coords)
  function camera(scale, cx = E.W / 2, cy = E.H / 2, dx = 0, dy = 0) {
    const ctx = E.ctx;
    ctx.translate(cx + dx, cy + dy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
  }

  // The frame-0 composition (minus text). Used by hook (0-2.25) and the seam (59.25-60).
  // pose params let the seam ease into it.
  // (act1 owner) Default opts == the poster. Act 1 reuses this with extra opts, all of which default to the
  // poster state: cam/camX/camY, flash, blobR, jitter, sweatDrip, squeeze 0..1 (body squash .09, blob squash .22),
  // dark 0..1 (blob -> #121117), underBlob(x, y, r, squash) callback (world space, drawn just before the blob),
  // eyes/mouth/look/pupil/blink, arm {overrides}, sky {extra storm params}, bg:false, over(info) callback (world space),
  // frontArm:false (skip the front noodle that is drawn automatically in the clutch pose).
  // The blob sits in front of his belly (dark on cream reads at thumbnail size); the mitten clamps it from the right.
  function hookBase(t, o = {}) {
    const ctx = E.ctx;
    const flash = o.flash ?? 0;
    if (o.bg !== false) stormBG(t, Object.assign({ flash: flash * 0.35 }, o.sky || {}));
    ctx.save();
    camera(o.cam ?? 1.0, o.camX ?? 540, o.camY ?? 900);
    const sq = o.squeeze ?? 0;
    const blobR = (o.blobR ?? 78) * (1 - 0.06 * sq);
    const arm = Object.assign({ tx: 540 + 200, ty: 960 + 92, ext: 1, open: 0.0, ang: Math.PI * 0.97, tremble: 0 }, o.arm || {});
    let info = { r: blobR };
    const g = GRABBY.grabby(t, 540, 960, 300, {
      eyes: o.eyes || 'squeeze', mouth: o.mouth, look: o.look, pupil: o.pupil, blink: o.blink,
      sweat: o.sweat ?? 1, sweatDrip: o.sweatDrip || 0, bob: 0.3, squash: 0.09 * sq,
      arm,
      holding: (hx, hy) => {
        const a = arm.ang, d = 46 + (blobR - 78) * 0.6;
        info.x = hx + Math.cos(a) * d - Math.sin(a) * 14;
        info.y = hy + Math.sin(a) * d + Math.cos(a) * 14;
        if (o.underBlob) o.underBlob(info.x, info.y, blobR, 0.22 * sq);   // e.g. a rim stroke behind the blob
        heldBlob(t, info.x, info.y, blobR, { jitter: o.jitter ?? 1, dark: o.dark || 0, squash: 0.22 * sq, seed: 5, body: [540, 960, 186, 210] });
      },
    });
    info.hand = g.hand; info.ang = g.ang;
    // in the clutch pose the rig's noodle hides behind the body: redraw a short noodle IN FRONT, from the right
    // side of the body over the blob into the mitten, then the mitten on top (reads as clutching on frame 0)
    const holdD = Math.hypot(arm.tx - 740, arm.ty - 1052) + 80 * Math.abs(arm.ang - Math.PI * 0.97);
    if (o.frontArm !== false && holdD < 2 && (arm.ext ?? 1) >= 0.999) {
      const s = 300, ow = 5 * (s / 230), w = 0.11 * s;
      const by = 960 + 0.3 * Math.sin(t * 3.1) * 0.025 * s, bw = 0.62 * s * (1 + 0.09 * sq), bh = 0.7 * s * (1 - 0.09 * sq);
      const tr = arm.tremble || 0;
      const ex = g.hand[0] + tr * Math.sin(t * 97), ey = g.hand[1] + tr * Math.cos(t * 83);
      const S = [540 + 0.74 * bw, by - 0.2 * bh];
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(S[0], S[1]);
      ctx.bezierCurveTo(S[0] + 56, S[1] - 2, ex + 50, ey - 72, ex + 16, ey - 8);
      ctx.strokeStyle = PAL.ink; ctx.lineWidth = w + ow * 2; ctx.stroke();
      ctx.strokeStyle = GRABBY.CREAM; ctx.lineWidth = w; ctx.stroke();
      // root melts into the body (no outline cap)
      ctx.fillStyle = GRABBY.CREAM; ctx.beginPath(); ctx.arc(S[0] - 3, S[1], w / 2 + ow + 2, 0, Math.PI * 2); ctx.fill();
      GRABBY.mitten(ctx, g.hand[0], g.hand[1], g.ang, 0.55 * s, arm.open ?? 0, { ow, tremble: tr, t });
      ctx.restore();
    }
    if (o.over) o.over(info);
    ctx.restore();
    return info;
  }
  // the evil vibrating blob as held: PRIM.blob + optional darkening (multiply pass) + flat vibration ticks
  function heldBlob(t, x, y, r, { jitter = 1, dark = 0, squash = 0, seed = 5, ticks = 1, ow = 5, body = null } = {}) {
    PRIM.blob(t, x, y, r, { jitter, seed, squash });
    if (dark > 0) {
      const ctx = E.ctx;
      ctx.save(); ctx.globalCompositeOperation = 'multiply';
      PRIM.blob(t, x, y, r, { jitter, seed, squash, alpha: Math.min(1, dark) });
      ctx.restore();
    }
    if (ticks > 0 && jitter > 0) vibTicks(t, x, y, r, Math.min(2, jitter) * ticks, ow, body);
  }
  // cartoon vibration arcs "( )" either side of the blob, re-flicked at 15 Hz. Ink where they cross the cream
  // body (body = [cx, cy, rx, ry]), warm white over the storm.
  function vibTicks(t, x, y, r, amt, ow = 5, body = null) {
    const ctx = E.ctx;
    const k = Math.floor(t * 15);
    ctx.save();
    ctx.lineCap = 'round';
    for (let side = 0; side < 2; side++) {
      for (let j = 0; j < 2; j++) {
        const i = side * 2 + j;
        if (E.hash(k * 7.31 + i * 1.7) < 0.2) continue;
        const a = (side ? Math.PI * 1.08 : -0.3) + (E.hash(k * 3.1 + i * 2.3) - 0.5) * 0.3;
        const rr = r * (1.24 + j * 0.22) + 3 * amt * E.hash(k * 1.9 + i);
        const sp = (0.36 - j * 0.1) * (0.8 + 0.2 * Math.min(1, amt));
        const mx = x + Math.cos(a) * rr, my = y + Math.sin(a) * rr;
        const onBody = body && Math.hypot((mx - body[0]) / body[2], (my - body[1]) / body[3]) < 1;
        ctx.beginPath(); ctx.arc(x, y, rr, a - sp, a + sp);
        ctx.strokeStyle = onBody ? PAL.ink : PAL.warmWhite; ctx.lineWidth = ow * 1.25; ctx.stroke();
      }
    }
    ctx.restore();
  }
  hookBase.blob = heldBlob;

  // grain + vignette finishing pass
  function finish(t, grain = 0.03) {
    E.grain(t, grain);
  }

  // flat ink-style cloud puff (same visual language as grabbygrab). grey: 0 white .. 1 charcoal
  function puff(cx, cy, r, { grey = 0, alpha = 1, ow = 5, rim = 0, seed = 1, wob = 1, t = 0 } = {}) {
    if (alpha <= 0) return;
    const ctx = E.ctx;
    const lobes = [[-0.62, 0.12, 0.42], [-0.25, -0.22, 0.55], [0.22, -0.3, 0.6], [0.62, 0.02, 0.45], [0.05, 0.18, 0.5], [-0.4, 0.25, 0.35], [0.4, 0.26, 0.35]];
    const fill = E.mixRgb([255, 252, 246], [74, 69, 86], grey).map(v => v | 0);
    const shapes = lobes.map(([x, y, rr], i) => (c) => {
      const w = 1 + 0.03 * wob * Math.sin(t * 1.3 + i * 2 + seed);
      c.beginPath(); c.arc(cx + x * r, cy + y * r, rr * r * w, 0, TAU);
    });
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = ow * 2; ctx.lineJoin = 'round';
    shapes.forEach(f => { f(ctx); ctx.stroke(); });
    ctx.fillStyle = `rgb(${fill.join(',')})`;
    shapes.forEach(f => { f(ctx); ctx.fill(); });
    // flat bottom shade
    ctx.save();
    ctx.beginPath(); shapes.forEach(f => { f(ctx); }); 
    ctx.restore();
    if (rim > 0) {
      // flat gold rim stroke on the upper edge (ink style, no bloom)
      ctx.save();
      ctx.globalAlpha = alpha * rim;
      ctx.strokeStyle = PAL.gold; ctx.lineWidth = ow * 1.4; ctx.lineCap = 'round';
      lobes.slice(1, 4).forEach(([x, y, rr]) => { ctx.beginPath(); ctx.arc(cx + x * r, cy + y * r, rr * r - ow * 0.4, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); });
      ctx.restore();
    }
    ctx.restore();
  }

  // Scene boundary contracts (positions at hand-off times)
  const SKY_MORNING = { top: '#3F78C0', bot: '#F4EFE6', horizon: '#F9DDB1', cloud: 0.32, storm: 0, warp: 1.1, zoom: 1.0, driftR: 0.6 };
  const BOUND = {
    // at t = 36.0 (act2 -> act3): grabby small, palm up, gold jhana orb resting in palm; one little white cloud
    t36: { grabby: { x: 540, y: 880, s: 170 }, orb: { r: 30, front: true, off: [6, -30] }, cloud: { x: 760, y: 560, r: 120 }, sky: SKY_MORNING },
  };

  window.C = { puff, SKY_MORNING, BOUND, PAL, T, line, wordTimes, STY, caption, mono, leader, markerLoop, skyBG, stormBG, STORM, flashEnv, camera, hookBase, finish, FPS };
})();
