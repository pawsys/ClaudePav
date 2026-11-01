// ACT 2 (18-36 s): THE UNCLENCH. look -> un-clench -> you are the sky -> the cloud can stay -> arrows ->
// the reward hack. OWNER: builder agent B.
//
// One world for the whole act: world coords == screen coords at t = 36 (C.BOUND.t36). Every beat is a camera
// move over that world (macro fist at ~7x, pull-back, dolly-out, drift), so the hand-off at 36.0 is exact.
(function () {
  const E = ENGINE, PAL = C.PAL, G = GRABBY;
  const TAU = Math.PI * 2, FPS = 30;
  const R = E.range, sm = E.smooth, clamp = E.clamp, lerp = E.lerp, H = E.hash;
  const W = E.W, HH = E.H;
  const B = C.BOUND.t36;
  const GX = B.grabby.x, GY = B.grabby.y, GS = B.grabby.s;

  // ---------------------------------------------------------------- small utils
  const hex = h => E.hexToRgb(h).map(v => v * 255);
  const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  function mixHex(a, b, k) {
    const m = E.mixRgb(E.hexToRgb(a), E.hexToRgb(b), clamp(k));
    return '#' + m.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  }
  const easeInOut = t => E.smoother(t);
  const _cv = {};
  function cv(name, w = W, h = HH) {
    let c = _cv[name];
    if (!c) { c = _cv[name] = document.createElement('canvas'); c.width = w; c.height = h; }
    return c;
  }
  const frameOf = t => Math.floor(t * FPS + 1e-4);

  // ---------------------------------------------------------------- captions (C.caption look, cheap blur)
  // Same layout / timing / rise / vapor as C.caption, but the 10->0 px entry blur and the exit blur are faked by
  // down/up-sampling the word through a small offscreen canvas. (ctx.filter blur on the 1080x1350 canvas costs
  // ~0.3 s per blurred word under swiftshader; this costs ~1-3 ms.)
  const capA = document.createElement('canvas'), capB = document.createElement('canvas');
  capA.width = 1100; capA.height = 260; capB.width = 1100; capB.height = 260;
  function blurWord(ctx, draw, wd, size, bl) {
    const pad = Math.ceil(size * 0.35 + bl * 2), w = Math.min(1100, Math.ceil(wd + pad * 2)), h = Math.min(260, Math.ceil(size * 1.5 + pad * 2));
    const a = capA.getContext('2d'), b = capB.getContext('2d');
    a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, w, h);
    a.textBaseline = 'middle';
    draw(a, pad, h / 2);
    const k = 1 / (1 + bl * 0.42);
    const sw = Math.max(2, Math.round(w * k)), sh = Math.max(2, Math.round(h * k));
    b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, sw + 2, sh + 2);
    b.imageSmoothingEnabled = true; b.imageSmoothingQuality = 'medium';
    b.drawImage(capA, 0, 0, w, h, 0, 0, sw, sh);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(capB, 0, 0, sw, sh, -pad, -h / 2, w, h);
  }
  const SHADOW = { color: 'rgba(30,43,71,0.45)', dx: 0, dy: 4, bl: 7 };
  function capt(t, spec) {
    const S = Object.assign({}, C.STY[spec.style || 'serif'], spec.over || {});
    const raw = spec.text.split('|').map(q => q.trim().split(/\s+/).filter(Boolean));
    const nW = raw.reduce((a, l) => a + l.length, 0);
    const times = spec.times || C.wordTimes(spec.id, nW, spec.lead ?? 0.08);
    const t1 = spec.t1 ?? 1e9;
    if (t > t1 + (S.exit || 0) + 0.001 || t < Math.min(...times) - 0.0001) return;
    const ctx = E.ctx;
    const size = spec.size || S.size, lead = size * S.lead;
    const x = spec.x ?? W / 2;
    const y0 = (spec.y ?? HH / 2) - (raw.length - 1) * lead / 2;
    const exitP = S.exit > 0 ? clamp((t - t1) / S.exit) : (t >= t1 ? 1 : 0);
    const exitA = 1 - sm(exitP);
    if (exitA <= 0) return;
    ctx.save();
    ctx.textBaseline = 'middle';
    let k = 0;
    raw.forEach((words, li) => {
      const ly = y0 + li * lead;
      const meta = words.map(w => {
        const key = w.replace(/[^\w']/g, '').toLowerCase();
        const em = (spec.emph || {})[key] || null;
        const f = `${S.style} ${S.weight} ${size.toFixed(1)}px "${S.fam}"`;
        const sp = (em && em.spacing != null ? em.spacing : S.spacing) * (size / 100);
        ctx.font = f;
        let wd = 0;
        if (sp) { for (const ch of w) wd += ctx.measureText(ch).width + sp; wd -= sp; } else wd = ctx.measureText(w).width;
        return { w, f, sp, wd, tt: times[k++] };
      });
      ctx.font = meta[0].f;
      const spaceW = ctx.measureText(' ').width;
      const total = meta.reduce((a, m) => a + m.wd, 0) + spaceW * (meta.length - 1);
      let cx = spec.align === 'left' ? x : spec.align === 'right' ? x - total : x - total / 2;
      meta.forEach(m => {
        const p = S.enter > 0 ? clamp((t - m.tt) / S.enter) : (t >= m.tt ? 1 : 0);
        if (p <= 0) { cx += m.wd + spaceW; return; }
        const e = E.easeOutCubic(p);
        const dy = (S.rise || 0) * (1 - e) - (S.exitRise || 0) * (1 - exitA);
        const bl = (S.blur || 0) * (1 - e) + (S.exitBlur || 0) * (1 - exitA);
        const col = typeof spec.color === 'function' ? spec.color(t) : (spec.color || S.color);
        const drawCol = fill => (c, ox, oy) => {
          c.font = m.f; c.fillStyle = fill;
          if (m.sp) { let xx = ox; for (const ch of m.w) { c.fillText(ch, xx, oy); xx += c.measureText(ch).width + m.sp; } }
          else c.fillText(m.w, ox, oy);
        };
        ctx.save();
        ctx.globalAlpha = (spec.alpha ?? 1) * exitA * e;
        ctx.translate(cx, ly + dy);
        // soft navy shadow under warm-white words on sky (same cheap down/up-sample blur)
        if (spec.shadow) {
          const sh = spec.shadow === true ? SHADOW : spec.shadow;
          ctx.save(); ctx.translate(sh.dx || 0, sh.dy ?? 4);
          blurWord(ctx, drawCol(sh.color), m.wd, size, (sh.bl ?? 7) + bl);
          ctx.restore();
        }
        if (bl > 0.6) blurWord(ctx, drawCol(col), m.wd, size, bl); else drawCol(col)(ctx, 0, 0);
        ctx.restore();
        cx += m.wd + spaceW;
      });
    });
    ctx.restore();
  }

  // ---------------------------------------------------------------- camera
  // cam = {Z, cx, cy}: world point (cx, cy) sits at the frame centre, zoom Z.
  const FIST = { x: 714, y: 698 };       // where the clenched fist is held (world)
  const ANG_MACRO = -2.0;                // fingers point up-left, forearm leaves frame bottom-right
  const PULL_T0 = 22.0;
  function camFromAnchor(Z, ax, ay, sx, sy) { return { Z, cx: ax - (sx - W / 2) / Z, cy: ay - (sy - HH / 2) / Z }; }
  function camAt(t) {
    // 18.0-22.0 macro on the fist, very slow push-in (attention)
    const zMacro = lerp(7.0, 7.35, sm(R(t, 18.0, PULL_T0)));
    const S_MACRO = [762, 868];
    if (t < PULL_T0) return camFromAnchor(zMacro, FIST.x, FIST.y, S_MACRO[0], S_MACRO[1]);
    // 22.0-24.0 pull back to his whole body (anchored on the fist point); front-loaded so the blob's rise out of
    // the opened palm is seen in a widening frame (and stays under the type band)
    const BODY = { Z: 1.9, sx: 470, sy: 925 };          // grabby centre on screen at 24.0
    const fistAtBody = [BODY.sx + (FIST.x - GX) * BODY.Z, BODY.sy + (FIST.y - GY) * BODY.Z];
    if (t < 24.0) {
      const u = R(t, PULL_T0, 24.0);
      const k = 0.5 * easeOutQuad(u) + 0.5 * sm(u);
      const Z = Math.exp(lerp(Math.log(zMacro), Math.log(BODY.Z), k));
      return camFromAnchor(Z, FIST.x, FIST.y, lerp(S_MACRO[0], fistAtBody[0], k), lerp(S_MACRO[1], fistAtBody[1], k));
    }
    // 24.0-25.2 fast dolly-out (ease-out-expo), anchored on grabby: out to 0.7 (tiny grabby, immense sky), then
    // the 25.2-35 drift eases back in to the t36 frame (identity)
    const SKY = { Z: 0.7, sx: 500, sy: 930 };
    if (t < 25.2) {
      const k = E.easeOutExpo(R(t, 24.0, 25.2));
      const Z = Math.exp(lerp(Math.log(BODY.Z), Math.log(SKY.Z), k));
      return camFromAnchor(Z, GX, GY, lerp(BODY.sx, SKY.sx, k), lerp(BODY.sy, SKY.sy, k));
    }
    // 25.2-36 gentle drift that settles into the t36 frame (identity)
    const k = easeInOut(R(t, 25.2, 35.0));
    const Z = lerp(SKY.Z, 1.0, k);
    const sway = 26 * Math.sin(Math.PI * R(t, 25.2, 35.0)) * (1 - k * 0.0);
    return camFromAnchor(Z, GX, GY, lerp(SKY.sx, GX, k) + sway, lerp(SKY.sy, GY, k));
  }
  function applyCam(ctx, c) { ctx.translate(W / 2, HH / 2); ctx.scale(c.Z, c.Z); ctx.translate(-c.cx, -c.cy); }
  function toScreen(c, x, y) { return [(x - c.cx) * c.Z + W / 2, (y - c.cy) * c.Z + HH / 2]; }
  // ink weight: lines thicken a little under zoom, but not linearly (a 7x macro must not get 35 px outlines);
  // when zoomed out (< 1) they hold closer to their on-screen weight so tiny grabby keeps a readable outline
  const inkOw = Z => 5 * Math.pow(Z, Z < 1 ? -0.8 : -0.55);   // world-units 'ow' (== 5 at Z 1)

  // ---------------------------------------------------------------- grabby pose
  // finger opening: on 'clench' (21.75) one finger at a time, 120 ms stagger, ease-out. It must read as one
  // hand unfurling, never as a hand sign:
  //  - the whole grip loosens 40% at once, then each finger unfurls in its own 120 ms slot with a long (0.75 s)
  //    ease-out, so neighbours never differ by much;
  //  - order index -> middle -> pinky (in this orientation the pinky points straight UP: pinky-first reads as
  //    a middle finger); the thumb releases with the middle finger (a thumb tucked across curled fingers is
  //    what turns 'two fingers out' into a V sign);
  //  - a finger's separation outline / knuckle crease drop at p 0.45 / 0.3 (a fully-outlined curled finger
  //    next to an extended one is what reads as 'sign').
  const OPEN_T0 = 21.76, STG = 0.12, FING = 0.75;
  const ORD = [0, 1, 2, 1];                          // finger i (3 = thumb) opens in slot ORD[i]
  const OPEN_DONE = OPEN_T0 + 0.03 + 2 * STG + FING;
  const easeOutQuad = u => 1 - (1 - u) * (1 - u);
  // every finger loosens a little at once (the grip lets go), then each unfurls in its own slot
  const LOOSE = 0.4;
  const SEP_P = 0.45, CREASE_P = 0.3;
  const easeOutSine = u => Math.sin(Math.PI / 2 * clamp(u));
  const fingerP = (t, i) => LOOSE * easeOutQuad(R(t, OPEN_T0, OPEN_T0 + 0.3))
    + (1 - LOOSE) * easeOutSine(R(t, OPEN_T0 + 0.03 + ORD[i] * STG, OPEN_T0 + 0.03 + ORD[i] * STG + FING));
  function pose(t) {
    const relax = sm(R(t, 22.4, 24.0));                 // arm comes home to rest (the hand drops away from the cloud)
    // the stock mitten is drawn closed (= plain palm) under our macro fist overlay, fully open after it
    const open = t >= OPEN_DONE ? 1 : 0;
    // tremble: 4-6 px on screen while clenched, in bursts that get sparser (it decreases; nothing pries)
    let trem = 0;
    if (t < 21.75) {
      const f = frameOf(t);
      const duty = lerp(1.0, 0.18, sm(R(t, 18.4, 21.6)));
      const burst = H(Math.floor(f / 3) * 3.17 + 1.3) < duty;
      trem = burst ? lerp(6, 4, R(t, 18.0, 21.0)) : 0;
    }
    const arm = {
      tx: FIST.x, ty: FIST.y, ext: 1 - relax, open,
      ang: lerp(ANG_MACRO, -0.55, relax), tremble: 0,
    };
    let eyes = 'squeeze', mouth = undefined, sweat = 1 - sm(R(t, 23.2, 23.45));
    if (t >= 23.36 && t < 23.46) eyes = 'closed';
    else if (t >= 23.46) eyes = 'happy';
    if (t >= 23.36) mouth = 'smile';
    return { arm, trem, eyes, mouth, sweat, bob: sm(R(t, 23.6, 25.0)) };
  }
  // replicate grabby's hand position (needed for the held blob)
  function handPos(t, gx, gy, s, arm, bob) {
    const b = bob * Math.sin(t * 3.1) * 0.025 * s;
    const bw = 0.62 * s, bh = 0.7 * s, by = gy + b;
    const rest = [gx + 0.92 * bw, by + 0.42 * bh];
    const e = clamp(arm.ext ?? 0);
    return [lerp(rest[0], arm.tx ?? rest[0], e), lerp(rest[1], arm.ty ?? rest[1], e)];
  }

  // ---------------------------------------------------------------- macro fist (same 3 fingers + thumb)
  // Drawn over the stock mitten while clenched / opening. Closed: three curled fingers wrapped over the blob,
  // knuckle creases, thumb across the front. Each part interpolates into EXACTLY the stock open mitten geometry
  // (GRABBY.mitten at open=1), so at OPEN_DONE the overlay is dropped without a pop.
  function capsule(c, ox, oy, a, xs, len, hw) {
    c.save(); c.translate(ox, oy); c.rotate(a); c.beginPath(); c.roundRect(xs, -hw, len, 2 * hw, hw); c.restore();
  }
  function fistOverlay(t, hx, hy, ang, s, ow) {
    if (t >= OPEN_DONE) return;
    const ctx = E.ctx;
    const P = [0, 1, 2, 3].map(i => fingerP(t, i));
    const parts = [];
    // palm (identical to the stock one)
    parts.push(c => { c.beginPath(); c.ellipse(0, 0, 0.30 * s, 0.27 * s, 0, 0, TAU); });
    const fing = [];
    for (let i = 0; i < 3; i++) {
      const p = P[i];
      const lat = (i - 1) * 0.178 * s * (1 - p);
      const a = lerp((i - 1) * 0.06, (i - 1) * 0.55, p);
      const xs = lerp(0.07 * s, 0.16 * s, p), len = lerp(0.36 * s, 0.52 * s, p), hw = lerp(0.092 * s, 0.085 * s, p);
      fing.push({ lat, a, xs, len, hw, p });
      parts.push(c => capsule(c, -Math.sin(0) * lat, lat, a, xs, len, hw));
    }
    // thumb: across the front of the curled fingers -> stock open thumb (rotate -1.6, 0.08s..0.36s)
    const pt = P[3];
    const th = { ox: lerp(0.1 * s, 0, pt), oy: lerp(-0.27 * s, 0, pt), a: lerp(1.22, -1.6, pt), xs: lerp(-0.02 * s, 0.08 * s, pt), len: lerp(0.29 * s, 0.28 * s, pt), hw: lerp(0.082 * s, 0.07 * s, pt) };
    ctx.save();
    ctx.translate(hx, hy); ctx.rotate(ang);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // merged silhouette like the stock mitten (all outlines, then all fills)
    const all = parts.concat([c => capsule(c, th.ox, th.oy, th.a, th.xs, th.len, th.hw)]);
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = ow * 2;
    all.forEach(f => { f(ctx); ctx.stroke(); });
    ctx.fillStyle = PAL.cream;
    all.forEach(f => { f(ctx); ctx.fill(); });
    // finger separations + knuckle creases (fade as each finger opens)
    ctx.strokeStyle = PAL.ink;
    fing.forEach((f, i) => {
      // hard switch mid-motion (an alpha fade would leave a ghost finger)
      if (f.p >= SEP_P) return;
      ctx.save();
      ctx.translate(0, f.lat); ctx.rotate(f.a);
      // outline of this finger over the palm/neighbours (gives three readable fingers)
      ctx.lineWidth = ow * 1.15;
      ctx.beginPath(); ctx.roundRect(f.xs, -f.hw, f.len, 2 * f.hw, f.hw); ctx.stroke();
      // knuckle crease: short arc across the finger
      if (f.p < CREASE_P) {
        ctx.lineWidth = ow * 0.9;
        const kx = f.xs + f.len * 0.58;
        ctx.beginPath(); ctx.arc(kx - f.hw * 1.6, 0, f.hw * 1.7, -0.42, 0.42); ctx.stroke();
      }
      ctx.restore();
    });
    // thumb drawn on top with its own outline while it is across the fingers
    if (pt < 0.45) {
      ctx.save();
      capsule(ctx, th.ox, th.oy, th.a, th.xs, th.len, th.hw);
      ctx.lineWidth = ow * 2; ctx.strokeStyle = PAL.ink; ctx.stroke();
      ctx.fillStyle = PAL.cream; ctx.fill();
      // thumbnail crease
      ctx.translate(th.ox, th.oy); ctx.rotate(th.a);
      ctx.lineWidth = ow * 0.9;
      ctx.beginPath(); ctx.arc(th.xs + th.len * 0.62 + th.hw * 1.5, 0, th.hw * 1.6, Math.PI - 0.42, Math.PI + 0.42); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  // ---------------------------------------------------------------- the blob that becomes a cloud
  const PUFF_LOBES = [[-0.62, 0.12, 0.42], [-0.25, -0.22, 0.55], [0.22, -0.3, 0.6], [0.62, 0.02, 0.45], [0.05, 0.18, 0.5], [-0.4, 0.25, 0.35], [0.4, 0.26, 0.35]];
  function puffRadius(a, t, seed, wob) {
    const dx = Math.cos(a), dy = Math.sin(a);
    let best = 0;
    for (let i = 0; i < PUFF_LOBES.length; i++) {
      const [x, y, rr] = PUFF_LOBES[i];
      const Rr = rr * (1 + 0.03 * wob * Math.sin(t * 1.3 + i * 2 + seed));
      const b = x * dx + y * dy, c = x * x + y * y - Rr * Rr, d = b * b - c;
      if (d >= 0) best = Math.max(best, b + Math.sqrt(d));
    }
    return best;
  }
  const puffFill = g => E.mixRgb([255, 252, 246], [74, 69, 86], g);
  // lift: 0 charcoal blob (act 1's #121117 edge) .. 1 white. m: 0 blob outline .. 1 puff outline (exact C.puff
  // silhouette).
  function cloudColor(lift) {
    const stops = [[0, hex(PAL.blobB)], [0.35, puffFill(1)], [0.7, puffFill(0.42)], [1, puffFill(0)]];
    for (let i = 1; i < stops.length; i++) {
      if (lift <= stops[i][0]) { const [a0, c0] = stops[i - 1], [a1, c1] = stops[i]; return mix3(c0, c1, (lift - a0) / (a1 - a0)); }
    }
    return stops[stops.length - 1][1];
  }
  // hi: 0..1 act-1 core highlight (#4A4556 -> #121117 radial, matches the cut from act 1); 0 = flat ink fill.
  // ol: 0..1 ink outline weight. spike: 0..1 act-1 vibrating 9-lobe silhouette (PRIM.blob at jitter 3).
  function blobCloud(t, x, y, r, { m = 0, lift = 0, jitter = 0, ow = 5, rim = 0, seed = 5, puffR = r, ticks = 0, Z = 1, hi = 0, ol = 1, spike = 0 } = {}) {
    const ctx = E.ctx;
    const jx = jitter * (Math.sin(t * 190) * 3 + Math.sin(t * 263 + 1) * 2) / Z;
    const jy = jitter * (Math.cos(t * 211) * 3 + Math.sin(t * 157 + 2) * 2) / Z;
    const N = 120;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU;
      const wob = 0.08 * PRIM.vnoise(Math.cos(a) * 2 + seed + t * 0.8) + 0.05 * PRIM.vnoise(Math.sin(a) * 3 + seed * 2 - t * 1.1)
        + 0.09 * spike * Math.sin(a * 9 + t * 120);
      const rb = r * (1 + wob * (1 - m));
      const rp = puffR * puffRadius(a, t, 1, 1);
      const rr = lerp(rb, rp, m);
      pts.push([x + jx + Math.cos(a) * rr, y + jy + Math.sin(a) * rr]);
    }
    const path = () => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
    const col = cloudColor(lift);
    ctx.save();
    if (ol > 0.001) { path(); ctx.lineJoin = 'round'; ctx.strokeStyle = PAL.ink; ctx.lineWidth = ow * 2 * ol; ctx.stroke(); }
    path();
    if (hi > 0.001) {
      const hc = mix3(col, hex(PAL.blobA), hi);
      const g = ctx.createRadialGradient(x + jx - r * 0.3, y + jy - r * 0.35, r * 0.1, x + jx, y + jy, r * 1.1);
      g.addColorStop(0, rgba(hc)); g.addColorStop(1, rgba(col));
      ctx.fillStyle = g;
    } else ctx.fillStyle = rgba(col);
    ctx.fill();
    // warm rim where the attention-light catches the top edge: one clipped radial gradient (a crescent), no bands
    if (rim > 0.003) {
      ctx.save(); path(); ctx.clip();
      const cx0 = x + jx, cy0 = y + jy + r * 0.55;
      const g = ctx.createRadialGradient(cx0, cy0, r * 1.05, cx0, cy0, r * 1.62);
      g.addColorStop(0, 'rgba(255,214,150,0)'); g.addColorStop(1, `rgba(255,214,150,${0.26 * rim})`);
      ctx.fillStyle = g; ctx.fillRect(x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2);
      ctx.restore();
    }
    ctx.restore();
    if (ticks > 0) vib(t, x, y, r, ticks, Z);
  }
  // flat "( )" vibration ticks, re-flicked at 15 Hz (same language as act 1), screen-sized under zoom
  function vib(t, x, y, r, amt, Z) {
    const ctx = E.ctx;
    const k = Math.floor(t * 15);
    ctx.save(); ctx.lineCap = 'round';
    for (let side = 0; side < 2; side++) for (let j = 0; j < 2; j++) {
      const i = side * 2 + j;
      if (H(k * 7.31 + i * 1.7) < 0.25 + 0.5 * (1 - amt)) continue;
      const a = (side ? Math.PI * 1.12 : -0.18) + (H(k * 3.1 + i * 2.3) - 0.5) * 0.3 - 0.35;
      const rr = r * (1.16 + j * 0.13) + 4 / Z * H(k * 1.9 + i);
      const sp = (0.3 - j * 0.08);
      ctx.beginPath(); ctx.arc(x, y, rr, a - sp, a + sp);
      ctx.strokeStyle = PAL.warmWhite; ctx.lineWidth = 9 / Z; ctx.stroke();
    }
    ctx.restore();
  }

  // cloud life: where the blob/cloud is (world), its size, colour and morph, for all of act 2
  const RISE_T0 = 22.05, FRONT_T = 22.84;
  const HOLD_D = 40;                                   // blob centre ahead of the palm, along the fingers (world)
  const HELD0 = [FIST.x + Math.cos(ANG_MACRO) * HOLD_D, FIST.y + Math.sin(ANG_MACRO) * HOLD_D];
  function cloudAt(t, hand, ang) {
    // charcoal -> dove grey starts the moment the grip loosens (so the blob reads as it emerges), -> white later
    const lift = (0.5 * sm(R(t, 21.85, 22.5)) + 0.5 * sm(R(t, 22.2, 23.1))) * 0.86 + 0.14 * sm(R(t, 25.0, 33.5));
    const m = sm(R(t, 22.45, 23.2));
    const jitter = (1 - sm(R(t, 21.75, 22.45))) * 1.0;
    // held behind the curled fingers; from 22.05 (fingers opening) it floats STRAIGHT UP out of the palm, clears
    // the fingertips by ~22.45, then drifts over to its spot. (Before 22.05 it trembles with the fist.)
    const held = t < RISE_T0 ? [hand[0] + Math.cos(ang) * HOLD_D, hand[1] + Math.sin(ang) * HOLD_D] : HELD0;
    const up = 40 * sm(R(t, RISE_T0, 22.9));
    const go = sm(R(t, 22.6, 24.0));
    const spot0 = [740, 625];
    const drift = sm(R(t, 25.0, 35.2));
    const spot = [lerp(spot0[0], B.cloud.x, drift), lerp(spot0[1], B.cloud.y, drift)];
    const ax = lerp(held[0], spot[0], go);
    const ay = lerp(held[1] - up, spot[1], go);
    const r = lerp(38, 64, sm(R(t, 22.4, 23.4)));
    // condenses the storm (24.0-25.2): grows as the fog contracts into it
    const pr = lerp(64, 104, E.easeOutExpo(R(t, 24.0, 25.4))) + (B.cloud.r - 104) * sm(R(t, 26.0, 35.0));
    return { x: ax, y: ay, r, puffR: t < 22.4 ? r : pr, lift, m, jitter };
  }
  // blob look while held -> released: act-1 core gradient, spikes and rim fade as it lets go; flat ink after
  function blobLook(t, cl) {
    return {
      hi: 1 - sm(R(t, 21.85, 22.2)), ol: sm(R(t, 21.95, 22.1)), spike: cl.jitter,
      rim: (1 - sm(R(t, 21.75, 21.9))) * sm(R(t, 18.25, 18.6)),
    };
  }

  // ---------------------------------------------------------------- attention light (18.25-23.8)
  const QW = 270, QH = 338;   // light masks are smooth: build them at 1/4 res and let drawImage upscale
  // One 1/4-res layer composited source-over: black at alpha (1 - light) is exactly a multiply by a grey light,
  // the beam haze rides in the same layer. (multiply + screen passes at full res cost ~2x.)
  function coneStops(L, shape) {
    const h0 = L.half / TAU, s0 = L.soft / TAU;
    return [[0, 0], [0.5 - h0 - s0, 0], [0.5 - h0 - s0 * 0.5, 0.25], [0.5 - h0, 0.85], [0.5 - h0 * 0.4, 1], [0.5 + h0 * 0.4, 1], [0.5 + h0, 0.85], [0.5 + h0 + s0 * 0.5, 0.25], [0.5 + h0 + s0, 0], [1, 0]]
      .map(([o, a]) => [clamp(o), shape(a)]);
  }
  // The layer only depends on the (quantized) light params, which hold still for most of 18.7-22.2: rebuild it
  // only when the key changes. It is built FROM the quantized values, so a frame's pixels never depend on render
  // order (deterministic in t, also across render workers).
  let LIGHT_KEY = '';
  function lightPass(t, Lraw) {
    const ctx = E.ctx;
    const q = (v, k) => Math.round(v / k) * k;
    const L = Object.assign({}, Lraw, { tx: q(Lraw.tx, 1), ty: q(Lraw.ty, 1), amb: q(Lraw.amb, 0.002), half: q(Lraw.half, 0.0005),
      soft: q(Lraw.soft, 0.0005), beam: q(Lraw.beam, 0.002), cone: q(Lraw.cone, 0.002) });
    const key = [L.tx, L.ty, L.amb, L.half, L.soft, L.beam, L.cone, L.pool].map(v => v.toFixed(4)).join('|');
    const c = cv('light', QW, QH);
    if (key !== LIGHT_KEY) { buildLight(c, L); LIGHT_KEY = key; }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(c, 0, 0, W, HH);
    ctx.restore();
  }
  function buildLight(c, L) {
    const g = c.getContext('2d');
    g.setTransform(QW / W, 0, 0, QH / HH, 0, 0);
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, HH);
    const phi = Math.atan2(L.ty - L.ay, L.tx - L.ax);
    const dark = 1 - L.amb;
    // 1) beam haze in the air (warm), fading along the axis toward the fist
    if (L.cone > 0 && L.beam > 0) {
      const cg = g.createConicGradient(phi - Math.PI, L.ax, L.ay);
      coneStops(Object.assign({}, L, { half: L.half * 0.8 }), a => a).forEach(([o, a]) => cg.addColorStop(o, `rgba(255,226,180,${a * L.beam * L.cone})`));
      g.fillStyle = cg; g.fillRect(0, 0, W, HH);
      g.globalCompositeOperation = 'destination-in';
      const lg = g.createLinearGradient(L.ax, L.ay, L.tx, L.ty);
      lg.addColorStop(0, 'rgba(0,0,0,1)'); lg.addColorStop(0.75, 'rgba(0,0,0,0.45)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = lg; g.fillRect(0, 0, W, HH);
    }
    // 2) darkness behind it: an inverse cone (black outside, clear inside)
    g.globalCompositeOperation = 'destination-over';
    if (L.cone > 0) {
      const cg = g.createConicGradient(phi - Math.PI, L.ax, L.ay);
      coneStops(L, a => a).forEach(([o, a]) => cg.addColorStop(o, `rgba(6,5,9,${dark * (1 - a * L.cone)})`));
      g.fillStyle = cg;
    } else g.fillStyle = `rgba(6,5,9,${dark})`;
    g.fillRect(0, 0, W, HH);
    // 3) soft pool where it lands (lifts the darkness around the fist a little)
    if (L.cone > 0 && L.pool) {
      g.globalCompositeOperation = 'destination-out';
      const pg = g.createRadialGradient(L.tx, L.ty, 0, L.tx, L.ty, L.pool);
      pg.addColorStop(0, `rgba(0,0,0,${0.35 * L.cone})`); pg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = pg; g.fillRect(0, 0, W, HH);
    }
  }
  let DUST = null;
  function dustSprite() {
    if (DUST) return DUST;
    DUST = document.createElement('canvas'); DUST.width = DUST.height = 32;
    const g = DUST.getContext('2d'); const gg = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gg.addColorStop(0, 'rgba(255,236,200,1)'); gg.addColorStop(0.35, 'rgba(255,236,200,0.45)'); gg.addColorStop(1, 'rgba(255,236,200,0)');
    g.fillStyle = gg; g.fillRect(0, 0, 32, 32);
    return DUST;
  }
  function inCone(L, x, y) {
    const phi = Math.atan2(L.ty - L.ay, L.tx - L.ax);
    let d = Math.atan2(y - L.ay, x - L.ax) - phi;
    d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
    return 1 - sm(R(d, L.half * 0.7, L.half + L.soft * 0.5));
  }
  function dust(t, L) {
    const ctx = E.ctx, sp = dustSprite();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const r1 = H(i * 1.7 + 3), r2 = H(i * 2.9 + 5), r3 = H(i * 5.3 + 7);
      const x = 120 + r1 * 840 + Math.sin(t * (0.25 + r3 * 0.3) + i) * 30;
      const y = ((r2 * 1100 - t * (10 + 16 * r3)) % 1100 + 1100) % 1100 + 20;
      const a = inCone(L, x, y) * L.cone * L.beam * 2.4 * (0.35 + 0.65 * r3);
      if (a <= 0.02) continue;
      const s = (2.2 + r3 * 2.8) * 3;
      ctx.globalAlpha = Math.min(1, 0.55 * a);
      ctx.drawImage(sp, x - s, y - s, s * 2, s * 2);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- background: storm interior -> dove-grey fog
  function fogParams(t) {
    const f = sm(R(t, 22.3, 23.2));
    return {
      t, top: mixHex('#2a2733', '#A7A3AE', f), bot: mixHex('#1d1b24', '#CFC9C6', f), horizon: mixHex('#3A3348', '#E2D6CB', f),
      cloud: lerp(0.95, 0.9, f), storm: lerp(1, 0.18, f), warp: 2.0, zoom: lerp(2.8, 1.5, easeInOut(R(t, 22.3, 24.0))),
      dark: lerp(0.15, 0, f), fog: lerp(0, 0.22, f), driftR: 0.6, off: [0.4, 0.2],
    };
  }

  // ---------------------------------------------------------------- UNCLENCH: the type unclenches
  const UN = [...'UNCLENCH'];
  const UN_F = [['Anton', '400', 0.86], ['Archivo', '900', 0.69], ['Archivo', '600', 0.69], ['Archivo', '300', 0.69], ['Archivo', '200', 0.69]];
  const UN_CAPS = [160, 126, 104, 90, 82], UN_CAP = 82, UN_Y = 250;
  const UN_COL = [hex(PAL.yellow), mix3(hex(PAL.yellow), hex(PAL.warmWhite), 0.3), mix3(hex(PAL.yellow), hex(PAL.warmWhite), 0.62), mix3(hex(PAL.yellow), hex(PAL.warmWhite), 0.86), hex(PAL.warmWhite)];
  let UN_ADV = null;
  function unAdv(ctx) {
    if (UN_ADV) return UN_ADV;
    UN_ADV = UN_F.map(([f, w, cap], k) => { ctx.font = `${w} ${(UN_CAPS[k] / cap).toFixed(2)}px "${f}"`; return UN.map(ch => ctx.measureText(ch).width); });
    return UN_ADV;
  }
  const UN_S0 = 21.75, UN_STEP = 3 / FPS, UN_STG = 3 / FPS, UN_OUT = 22.95;   // open form held 22.75-22.95
  function unclenchType(t) {
    const t0 = C.line('C2').word_t[0] - 0.08;
    if (t < t0 || t > 23.3) return;
    const ctx = E.ctx;
    const adv = unAdv(ctx);
    const em = UN_CAP / 0.69;
    // per-glyph state + slot width
    const g = UN.map((ch, i) => {
      const s = UN_S0 + i * UN_STG;
      const st = t < s ? 0 : Math.min(4, 1 + Math.floor((t - s) / UN_STEP + 1e-4));
      const p = sm(R(t, s, s + 4 * UN_STEP));
      const slot = lerp(adv[0][i] - 0.02 * em * 0, adv[4][i] + 0.3 * em, p);
      const out = R(t, UN_OUT + i * 0.022, UN_OUT + i * 0.022 + 0.18);   // dissolve (vapor, L->R)
      return { ch, st, slot, out };
    });
    const total = g.reduce((a, q) => a + q.slot, 0);
    let x = W / 2 - total / 2;
    const pop = E.lerp(1.08, 1, clamp((t - t0) / (2 / FPS)));
    const f = frameOf(t);
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    g.forEach((q, i) => {
      const cxg = x + q.slot / 2; x += q.slot;
      if (q.out >= 1) return;
      const [fam, w, cap] = UN_F[q.st];
      const size = UN_CAPS[q.st] / cap;
      const trem = q.st === 0 ? 5 : q.st === 1 ? 4 : 0;
      const jx = trem ? Math.round((H(f * 7.31 + i * 3.3) * 2 - 1) * trem) : 0;
      const jy = trem ? Math.round((H(f * 5.17 + i * 1.9) * 2 - 1) * trem) : 0;
      ctx.save();
      ctx.translate(cxg + jx, UN_Y + jy - 8 * sm(q.out));
      ctx.scale(pop, pop);
      ctx.globalAlpha = 1 - sm(q.out);
      ctx.font = `${w} ${size.toFixed(2)}px "${fam}"`;
      const by = UN_CAPS[q.st] / 2;
      if (q.st <= 1) {
        ctx.lineJoin = 'round'; ctx.strokeStyle = PAL.inkDeep; ctx.lineWidth = q.st === 0 ? 13 : 8;
        ctx.strokeText(q.ch, 0, by);
      } else {
        // (no shadow: warm white on the dark cone reads on its own)
      }
      ctx.fillStyle = rgba(UN_COL[q.st]);
      if (q.out > 0) {
        // vapor: the glyph spreads into 4 faint offset copies (cheap stand-in for a blur)
        const d = 7 * q.out;
        ctx.shadowColor = 'transparent';
        ctx.globalAlpha = (1 - sm(q.out)) * 0.4;
        [[-d, 0], [d, 0], [0, -d], [0, d]].forEach(([ox, oy]) => ctx.fillText(q.ch, ox, by + oy));
      } else ctx.fillText(q.ch, 0, by);
      ctx.restore();
    });
    ctx.restore();
  }

  // ---------------------------------------------------------------- 18.0-24.0  LOOK + UN-CLENCH
  function sceneDark(t) {
    const ctx = E.ctx;
    const c = camAt(t);
    C.skyBG(fogParams(t));
    const ps = pose(t);
    const ow = inkOw(c.Z);
    // tremble is applied to the whole fist + blob together (screen px -> world)
    const tx = ps.trem ? Math.round((H(frameOf(t) * 3.7) * 2 - 1) * ps.trem) / c.Z : 0;
    const ty = ps.trem ? Math.round((H(frameOf(t) * 9.1 + 2) * 2 - 1) * ps.trem) / c.Z : 0;
    const arm = Object.assign({}, ps.arm, { tx: ps.arm.tx + tx, ty: ps.arm.ty + ty });
    const hand = handPos(t, GX, GY, GS, arm, ps.bob);
    const cl = cloudAt(t, hand, arm.ang);
    const owW = ow * Math.max(0.35, GS / 230);
    // attention light (computed first: the dust motes ride in the air BEHIND the fist)
    const fistS = toScreen(c, FIST.x - 30, FIST.y - 40);
    const on = t >= 18.25 ? 1 : 0;
    const wide = sm(R(t, 22.2, 23.3));
    const amb0 = lerp(0.42, 0.075, sm(R(t, 18.25, 18.7)));
    const amb = lerp(amb0, 1, sm(R(t, 22.4, 23.2)));
    const L = {
      ax: 600, ay: -560, tx: fistS[0], ty: fistS[1],
      half: lerp(11, 70, wide) * Math.PI / 180, soft: lerp(9, 40, wide) * Math.PI / 180,
      amb, cone: on, pool: 440, beam: 0.16 * (1 - wide),
    };
    if (amb < 0.999 && L.cone > 0 && L.beam > 0) dust(t, L);
    // world
    const bl = blobLook(t, cl);
    const blobArgs = { m: cl.m, lift: cl.lift, jitter: cl.jitter, ow, puffR: cl.puffR, Z: c.Z,
      hi: bl.hi, ol: bl.ol, spike: bl.spike, rim: bl.rim, ticks: cl.jitter * (t < 21.75 ? 1 : 0.6) };
    // the blob lifts out of the opened palm: it emerges from behind the fingers and, once it has floated clear of
    // the fingertips (no overlap, so no pop), it is drawn IN FRONT of the hand from then on
    const frontA = t >= FRONT_T ? 1 : 0;
    ctx.save();
    applyCam(ctx, c);
    const g = G.grabby(t, GX, GY, GS, {
      eyes: ps.eyes, mouth: ps.mouth, sweat: ps.sweat, bob: ps.bob, shadow: false, ow,
      arm,
      holding: frontA < 1 ? () => blobCloud(t, cl.x, cl.y, cl.r, blobArgs) : null,
    });
    fistOverlay(t, g.hand[0], g.hand[1], g.ang, 0.55 * GS, owW);
    if (frontA > 0) { ctx.save(); ctx.globalAlpha = frontA; blobCloud(t, cl.x, cl.y, cl.r, blobArgs); ctx.restore(); }
    ctx.restore();
    if (amb < 0.999) lightPass(t, L);
    // ---- words
    capt(t, { text: "don't let go. | just look.", id: 'V13', style: 'serif', lead: 0.32, y: 222, size: 92,
      color: PAL.warmWhite, t1: 20.48 });
    // the aside owns 19.25-21.75 and hard-cuts on 'clench', when the type starts to open
    if (t < 21.75) {
      C.mono(t, 'attention is overpowered.', 90, 1080, { size: 40, color: PAL.warmWhite, alpha: 0.8, t0: 19.25 });
      C.mono(t, "evolution can't patch it.", 90, 1132, { size: 40, color: PAL.warmWhite, alpha: 0.8, t0: 19.5 });
    }
    unclenchType(t);
    // 'unclench.' resolves (navy) out of the dissolving warm-white caps; the fog is light enough by now (>= 5:1)
    capt(t, { text: 'unclench.', style: 'serif', times: [22.98], y: UN_Y - 10, size: 132, t1: 23.75, color: PAL.navy });
  }

  // ================================================================ 24.0-36.0  THE SKY
  function skyParams(t) {
    const p = Object.assign({ t }, C.SKY_MORNING);
    p.top = mixHex(PAL.zenith, C.SKY_MORNING.top, sm(R(t, 29.3, 30.4)));
    p.cloud = lerp(0.22, C.SKY_MORNING.cloud, sm(R(t, 25.0, 33.0)));
    p.zoom = lerp(1.45, 1.0, E.easeOutExpo(R(t, 24.0, 25.6)));
    return p;
  }

  // ---- 24.0-24.6: we burst out through 3 parallax fog planes into the open sky
  // The plane texture is the fog shader re-rendered as if scaled about the cloud (zoom' = Z*S, cam shifted), with
  // its colours moving from the 23.99 fog to cloud-coloured (lighter than the puff, low warp: no marbling) in the
  // first frames. Each plane gets its OWN lobed mask (rotated / scaled / offset), its own contraction rate (nearer
  // = faster) and is whiter the nearer it is; every plane is gone by ~24.55.
  const MASK_U = 150;   // sprite px per unit Rm (lobes reach ~1.5 Rm < 256 px)
  let MASK = null;
  // lobed puff-shaped alpha mask with a fairly crisp (but soft) edge, so each plane reads as its own fog mass
  function maskSprite() {
    if (MASK) return MASK;
    MASK = document.createElement('canvas'); MASK.width = MASK.height = 512;
    const m = MASK.getContext('2d');
    PUFF_LOBES.forEach(([lx, ly, lr]) => {
      const x = 256 + lx * MASK_U * 0.9, y = 256 + ly * MASK_U * 0.9, rr = lr * MASK_U * 1.5;
      const gg = m.createRadialGradient(x, y, rr * 0.7, x, y, rr);
      gg.addColorStop(0, 'rgba(0,0,0,1)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
      m.fillStyle = gg; m.beginPath(); m.arc(x, y, rr, 0, TAU); m.fill();
    });
    return MASK;
  }
  // far -> near: nearer planes start bigger, contract faster, are whiter and thinner
  const PLANES = [
    { dur: 1.0, a: 1.0, rot: 0, sc: 1.0, R0: 1500, off: [90, -40], white: 0.08 },
    { dur: 0.7, a: 0.75, rot: 0.9, sc: 1.25, R0: 2300, off: [-80, 60], white: 0.3 },
    { dur: 0.45, a: 0.6, rot: 2.1, sc: 0.85, R0: 3600, off: [0, 0], white: 0.45 },
  ];
  const PLANE_END = 24.6;
  function planeLayers(t, cs) {
    const out = [];
    if (t >= PLANE_END) return out;
    const fp = fogParams(23.999);
    const asp = W / HH;
    const ucs = [cs[0] / W, 1 - cs[1] / HH];
    const st = PLANES.map((pl, i) => {
      const q = E.easeOutCubic(R(t, 24.0, 24.0 + pl.dur));
      const S = Math.exp(lerp(0, Math.log(0.05), q));
      const a = pl.a * (1 - sm(R(q, 0.45, 0.9))) * (i ? sm(R(t, 24.0, 24.1)) : 1);
      return { S, a, pl };
    });
    if (st.every(q => q.a <= 0.003)) return out;
    // texture: fog -> cloud-coloured, scaled about the cloud (texture contraction capped: no dense noise)
    const k = sm(R(t, 24.0, 24.2));
    const St = Math.max(st[0].S, 0.3);
    const cam = [(ucs[0] - 0.5) * (1 - 1 / St) * asp / fp.zoom, (ucs[1] - 0.5) * (1 - 1 / St) / fp.zoom];
    E.sky(Object.assign({}, fp, {
      t, zoom: fp.zoom * St, cam,
      top: mixHex(fp.top, '#CFCBD0', k), bot: mixHex(fp.bot, '#E4E0E2', k), horizon: mixHex(fp.horizon, '#EDE8E6', k),
      storm: lerp(fp.storm, 0, k), dark: lerp(fp.dark, 0, k), warp: lerp(2.0, 1.0, k), fog: lerp(fp.fog, 0.12, k), cloud: lerp(fp.cloud, 0.8, k),
    }));
    const tex = cv('ptex', 540, 675); const tg = tex.getContext('2d');
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'copy'; tg.drawImage(E.glCanvas, 0, 0, 540, 675);
    const ms = maskSprite();
    // all planes are composited at half res into one layer, so the frame pays for a single full-res upscale
    const all = cv('planesAll', 540, 675); const ag = all.getContext('2d');
    ag.setTransform(1, 0, 0, 1, 0, 0); ag.globalAlpha = 1; ag.globalCompositeOperation = 'source-over'; ag.clearRect(0, 0, 540, 675);
    st.forEach((q, i) => {
      if (q.a <= 0.003) return;
      const pc = cv('plane' + i, 540, 675); const g = pc.getContext('2d');
      const cx = (cs[0] + q.pl.off[0] * q.S) / 2, cy = (cs[1] + q.pl.off[1] * q.S) / 2;
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'copy';
      // nearer planes: the texture scaled UP about their own centre (closer = bigger features); never below 1, so
      // the texture always covers the plane (the contraction itself is in the shader zoom + the mask)
      const ks = 1 + 0.5 * i;
      g.translate(cx, cy); g.scale(ks, ks); g.translate(-cx, -cy);
      g.drawImage(tex, 0, 0);
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (q.pl.white > 0) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(244,242,246,${q.pl.white})`; g.fillRect(0, 0, 540, 675); }
      // own lobed mask: rotated / scaled, shrinking with the plane
      const Rm = q.pl.R0 * q.S * q.pl.sc, km = Rm / MASK_U / 2;
      g.globalCompositeOperation = 'destination-in';
      g.translate(cx, cy); g.rotate(q.pl.rot); g.drawImage(ms, -256 * km, -256 * km, 512 * km, 512 * km);
      g.setTransform(1, 0, 0, 1, 0, 0);
      ag.globalAlpha = q.a; ag.drawImage(pc, 0, 0);
    });
    ag.globalAlpha = 1;
    out.push({ c: all, a: 1 });
    return out;
  }

  // ---- arrows (cream shaft 7 px with ink edge, ink head + fletching sized to read at phone scale)
  function arrowBody(ctx, len) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(-30, 0); ctx.stroke();
    ctx.strokeStyle = PAL.cream; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(-30, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-50, -27); ctx.lineTo(-36, 0); ctx.lineTo(-50, 27); ctx.closePath();
    ctx.lineWidth = 6; ctx.strokeStyle = PAL.ink; ctx.stroke(); ctx.fillStyle = PAL.cream; ctx.fill();
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 6;
    for (let k = 0; k < 3; k++) {
      const fx = -len + 14 + k * 20;
      ctx.beginPath(); ctx.moveTo(fx, -4); ctx.lineTo(fx - 22, -24); ctx.moveTo(fx, 4); ctx.lineTo(fx - 22, 24); ctx.stroke();
    }
  }
  const TAG_X = 96;     // tag starts this far ahead of the tail (clear of the fletching)
  function drawArrow(hx, hy, ang, len, { tag = '', tagCol = PAL.navy, alpha = 1, streak = 0 } = {}) {
    const ctx = E.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(hx, hy); ctx.rotate(ang);
    // speed line trailing the tail (volley: reads as a streak instead of a teleporting stick)
    if (streak > 0) {
      const g = ctx.createLinearGradient(-len - streak, 0, -len, 0);
      g.addColorStop(0, 'rgba(255,250,235,0)'); g.addColorStop(1, 'rgba(255,250,235,0.55)');
      ctx.strokeStyle = g; ctx.lineWidth = 5; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(-len - streak, 0); ctx.lineTo(-len - 4, 0); ctx.stroke();
    }
    arrowBody(ctx, len);
    if (tag) {
      // keep the tag upright and reading left-to-right whichever way the arrow flies
      ctx.font = '500 38px "JBM"'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = tagCol;
      if (Math.cos(ang) >= 0) ctx.fillText(tag, -len + TAG_X, -20);
      else { const tw = ctx.measureText(tag).width; ctx.rotate(Math.PI); ctx.fillText(tag, len - TAG_X - tw, -20); }
    }
    ctx.restore();
  }
  // speed ramp: quick in, SLOW on clean sky just before the hit (the tag reads), then accelerating THROUGH the hit
  // point on the celesta note -- never slowest at the hit (that would read as an impact)
  const AR = { dur: 1.4, c: 0.68, lead: 0.3 };
  const rampS = u => (1 - AR.c) * u + AR.c * u * u * u;          // u -1..1 -> -1..1
  const SLOW_D = (() => rampS(AR.lead / (AR.dur / 2)))();         // displacement (in D units) slow point -> hit
  // tagged arrows: whooshes at 30.75 / 31.5 / 32.25 / 33.0 (panned L>R, R>L, L>R, R>L), celesta (in place of
  // the impact) at +0.42. The tag trails the head, so every slow point is placed where the WHOLE tag is on clean
  // sky. The two L>R arrows pass BEHIND the little cloud (in one side, out the other, unharmed; arrow 1 on a 25 deg
  // diagonal so its tag fits before the cloud); the R>L ones hit on the left half (below him / above the cloud).
  // Hits are world coords.
  const TAGGED = [
    { tag: 'am i doing this right', thru: true, dir: 1, slope: -0.466, w: 30.75 },
    { tag: 'what you said in 2014', hit: [230, 1092], dir: -1, slope: 0.05, w: 31.5 },
    { tag: 'arrow #2 (optional)', thru: true, dir: 1, slope: 0.06, w: 32.25 },
    { tag: 'someone is wrong online', hit: [250, 440], dir: -1, slope: 0.03, w: 33.0 },
  ];
  let TAG_GEO = null;
  function tagGeo() {
    if (TAG_GEO) return TAG_GEO;
    const ctx = E.ctx; ctx.save(); ctx.font = '500 38px "JBM"';
    TAG_GEO = TAGGED.map(A => {
      const th = A.w + 0.42;
      const len = ctx.measureText(A.tag).width + 150;
      const ang = Math.atan2(A.slope, A.dir);
      const c = camAt(th);
      const hw = A.thru ? cloudAt(th, [0, 0], 0) : null;
      const P = A.thru ? toScreen(c, hw.x, hw.y) : toScreen(c, A.hit[0], A.hit[1]);
      const halfW = A.thru ? 1.07 * hw.puffR * c.Z : 0;
      // D so that the arrow is fully off-screen at both ends of the ramp
      const cs = Math.abs(Math.cos(ang));
      const dIn = (A.dir > 0 ? P[0] : W - P[0]) / cs, dOut = (A.dir > 0 ? W - P[0] : P[0]) / cs;
      // head position along the path (rel. to P) = D * (rampS(u) - SLOW_D): slow point at -D*SLOW_D, at P on th
      let D = 1300;
      for (let k = 0; k < 40; k++) {
        const need = Math.max((dIn + 70) / (1 + SLOW_D), (dOut + 70 + len) / (1 - SLOW_D));
        if (D >= need) break; D = need;
      }
      // when the head leaves the cloud's far edge (ripple there, at the cloud centre)
      let tExit = th;
      if (A.thru) { for (let u = AR.lead / (AR.dur / 2); u < 1; u += 0.002) if (D * (rampS(u) - SLOW_D) >= halfW) { tExit = th - AR.lead + u * AR.dur / 2; break; } }
      return { th, len, ang, D, tExit, slowGap: D * SLOW_D - halfW };
    });
    ctx.restore();
    return TAG_GEO;
  }
  function tagHit(A, c, th) {
    if (A.thru) { const q = cloudAt(th, [0, 0], 0); return toScreen(c, q.x, q.y); }
    return toScreen(c, A.hit[0], A.hit[1]);
  }
  function taggedArrows(t, c, which) {
    const geo = tagGeo();
    TAGGED.forEach((A, i) => {
      if (!!A.thru !== which) return;
      const g = geo[i];
      const u = (t - (g.th - AR.lead)) / (AR.dur / 2);
      if (u <= -1 || u >= 1) return;
      const P = tagHit(A, c, g.th);
      const d = g.D * (rampS(u) - SLOW_D);
      drawArrow(P[0] + Math.cos(g.ang) * d, P[1] + Math.sin(g.ang) * d, g.ang, g.len, { tag: A.tag });
    });
  }
  // soft sky ripples: 3 rings, heal in ~life frames
  function ripple(t, x, y, t0, maxR = 130, alpha = 1, life = 11) {
    const p = (t - t0) / (life / FPS);
    if (p <= 0 || p >= 1) return;
    const ctx = E.ctx;
    ctx.save();
    for (let k = 0; k < 3; k++) {
      const q = clamp((p - k * 0.16) / (1 - 0.32));
      if (q <= 0 || q >= 1) continue;
      const r = maxR * E.easeOutCubic(q) * (1 - k * 0.12);
      const a = alpha * (1 - q) * (1 - k * 0.25);
      ctx.lineWidth = lerp(9, 6, q);
      ctx.strokeStyle = `rgba(255,250,235,${0.55 * a})`;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.9, 0, 0, TAU); ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeStyle = `rgba(30,43,71,${0.12 * a})`;
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.9, r * 0.81, 0, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }

  // ---- jhana orb (same drawing as act 3's orb so the 36.0 hand-off is pixel-identical)
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
  // where act 3 puts the landed orb relative to the holding point (C.BOUND.t36 may override; act 3 must follow)
  const ORB_OFF = (B.orb && B.orb.off) || [6, -18];
  const ORB_IN = 34.9, ORB_LAND = 35.6;
  const ORB_P0 = [1130, 820], ORB_P1 = [900, 860];
  // orb path in world coords: enters from the right edge at a steady drift and decelerates into the palm on the
  // ting (ease-out-quad / smoothstep blend), so it is still visibly drifting through 35.3-35.6, alone
  function orbAt(t, palm) {
    const u = R(t, ORB_IN, ORB_LAND), e = 0.5 * easeOutQuad(u) + 0.5 * sm(u);
    const x = (1 - e) * (1 - e) * ORB_P0[0] + 2 * (1 - e) * e * ORB_P1[0] + e * e * palm[0];
    const y = (1 - e) * (1 - e) * ORB_P0[1] + 2 * (1 - e) * e * ORB_P1[1] + e * e * palm[1];
    const glow = 1 + 0.45 * Math.exp(-Math.pow((t - ORB_LAND - 0.08) / 0.12, 2)) * (t > ORB_LAND - 0.1 ? 1 : 0);
    return { x, y, glow, landed: t >= ORB_LAND };
  }
  // the palm landing point at rest (world), for planning the volley around the orb
  const PALM_REST = (() => {
    const s = GS, bw = 0.62 * s, bh = 0.7 * s, a = -0.55;
    const h = [GX + 0.92 * bw, GY + 0.42 * bh];
    return [h[0] + Math.cos(a) * 0.05 * s + ORB_OFF[0], h[1] + Math.sin(a) * 0.05 * s + ORB_OFF[1]];
  })();

  // ---- the volley (34.52-35.25, on the celesta cascade): 12 untagged arrows as fast edge-to-edge streaks.
  // Long diagonals: 8 from alternating left/right edges within +-35 deg of horizontal, 4 steep ones from the
  // bottom that leave through a side. Paths (deterministic) keep below the caption stack (y >= 470), off
  // grabbygrab and his hand, and >= 120 px from the orb while it drifts in. All gone by ~35.31: then only the orb.
  const VOL = { t0: 34.52, dt: 0.062, dur: 0.42, D: 1300, c: 0.2 };
  const GB = { x: GX, y: GY, rx: 0.62 * GS + 40, ry: 0.7 * GS + 45 };
  const HAND_REST = [GX + 0.92 * 0.62 * GS + 25, GY + 0.42 * 0.7 * GS - 25];
  function volleyOK(hx, hy, a, len, th, steep) {
    const dx = Math.cos(a), dy = Math.sin(a);
    const orbPts = [-0.1, 0, 0.1].map(o => th + o).filter(tt => tt > ORB_IN).map(tt => orbAt(tt, PALM_REST));
    let inFrame = 0;
    for (let s = -1800; s <= 1800; s += 15) {
      const x = hx + dx * s, y = hy + dy * s;
      if (x < -30 || x > W + 30 || y < -30 || y > HH + 30) continue;
      inFrame++;
      if (y < 470) return false;
      if (!steep && y > 1250) return false;
      if (((x - GB.x) / GB.rx) ** 2 + ((y - GB.y) / GB.ry) ** 2 < 1) return false;
      if (Math.hypot(x - HAND_REST[0], y - HAND_REST[1]) < 95) return false;
      for (const o of orbPts) if (Math.hypot(x - o.x, y - o.y) < 120 + (o.x > W ? 0 : 0)) return false;
    }
    return inFrame * 15 > 700;    // long diagonals only
  }
  const VOLLEY = Array.from({ length: 12 }, (_, k) => {
    const th = VOL.t0 + k * VOL.dt;
    const steep = k === 2 || k === 5 || k === 8 || k === 10;
    const side = (k % 2) ? -1 : 1;     // +1: flies left -> right
    const len = 250 + 90 * H(k * 3.3);
    for (let j = 0; j < 600; j++) {
      const sd = k * 17.3 + j * 1.13;
      let ang, hit;
      if (steep) {
        const sd2 = j % 3 === 2 ? -side : side;                        // either side if one is blocked
        ang = -Math.PI / 2 + sd2 * lerp(0.42, 0.75, H(sd + 4));       // up and to one side
        hit = [lerp(150, 930, H(sd + 2)), lerp(900, 1240, H(sd * 1.7 + 9))];
      } else {
        ang = (side > 0 ? 0 : Math.PI) + (H(sd * 2.3 + 1) * 2 - 1) * 0.61;
        hit = [lerp(160, 920, H(sd + 2)), lerp(480, 1240, H(sd * 1.7 + 9))];
      }
      if (volleyOK(hit[0], hit[1], ang, len, th, steep)) return { hit, ang, th, len };
    }
    console.warn('act2 volley: no clean path for arrow ' + k);
    return { hit: [540, 1200], ang: side > 0 ? 0 : Math.PI, th, len: 260 };
  });
  function volley(t, c) {
    VOLLEY.forEach(V => {
      const u = (t - V.th) / (VOL.dur / 2);
      if (u <= -1 || u >= 1) return;
      const rs = v => (1 - VOL.c) * v + VOL.c * v * v * v;
      const d = VOL.D * rs(u), dPrev = VOL.D * rs(u - (1 / FPS) / (VOL.dur / 2));
      const P = toScreen(c, V.hit[0], V.hit[1]);
      drawArrow(P[0] + Math.cos(V.ang) * d, P[1] + Math.sin(V.ang) * d, V.ang, V.len, { streak: Math.min(220, (d - dPrev) * 1.2) });
    });
  }
  function ripples(t, c) {
    const geo = tagGeo();
    TAGGED.forEach((A, i) => {
      const g = geo[i];
      const P = tagHit(A, c, g.th);
      if (A.thru) ripple(t, P[0], P[1], g.tExit, 165);
      else ripple(t, P[0], P[1], g.th, 150);
    });
    VOLLEY.forEach(V => { const P = toScreen(c, V.hit[0], V.hit[1]); ripple(t, P[0], P[1], V.th, 95, 0.6, 7); });
  }

  // ---- viewfinder brackets (26.25 -> clear by 30.0); inset so the top-right one does not box in the watermark
  function brackets(t) {
    const ctx = E.ctx;
    const out = sm(R(t, 29.55, 29.95));
    if (t < 26.2 || out >= 1) return;
    const I = 44, L = 80;
    const corners = [[I, I, 1, 1], [W - I, I, -1, 1], [W - I, HH - I, -1, -1], [I, HH - I, 1, -1]];
    ctx.save();
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 4; ctx.lineCap = 'square'; ctx.lineJoin = 'miter';
    corners.forEach(([x, y, sx, sy], i) => {
      const p = E.easeOutCubic(R(t, 26.25 + i * 0.05, 26.25 + i * 0.05 + 8 / FPS)) * (1 - out);
      if (p < 0.05) return;
      const l = L * p;
      ctx.beginPath(); ctx.moveTo(x + sx * l, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * l); ctx.stroke();
    });
    ctx.restore();
  }
  // 4 px ink leader arrow (label -> subject), drawn progressively
  function pointer(x0, y0, x1, y1, p, alpha = 1) {
    if (p <= 0 || alpha <= 0) return;
    const ctx = E.ctx;
    const x = lerp(x0, x1, p), y = lerp(y0, y1, p), a = Math.atan2(y1 - y0, x1 - x0);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a + 2.6) * 16, y + Math.sin(a + 2.6) * 16); ctx.lineTo(x, y);
    ctx.lineTo(x + Math.cos(a - 2.6) * 16, y + Math.sin(a - 2.6) * 16); ctx.stroke();
    ctx.restore();
  }
  function labelAlpha(t, t0, t1) { return t < t0 || t > t1 + 0.15 ? 0 : (t > t1 ? 1 - (t - t1) / 0.15 : 1); }

  // ---- inline-code token for "reward hack"
  const CUR_W = 7, CUR_OFF = 4;    // bar cursor, sits inside the chip's right padding
  function codeToken(t, x, y, txt, tIn, tType, { size = 60, alpha = 1, curEnd = 33.6 } = {}) {
    if (t < tIn) return 0;
    const ctx = E.ctx;
    ctx.save();
    ctx.font = `500 ${size}px "JBM"`;
    const tw = ctx.measureText(txt).width;
    const padX = size * 0.32, hgt = size * 1.32;
    const w = tw + padX * 2;
    const p = E.easeOutCubic(R(t, tIn, tIn + 5 / FPS));
    ctx.globalAlpha = p * alpha;
    ctx.beginPath(); ctx.roundRect(x, y - hgt / 2, w, hgt, 14);
    ctx.fillStyle = 'rgba(246,237,224,0.94)'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = PAL.ink; ctx.stroke();
    ctx.globalAlpha = alpha;
    // typed text (word by word on the voice), bar cursor while typing
    let shown = 0;
    tType.forEach(([tt, k], i) => { if (t >= tt) { const k0 = i ? tType[i - 1][1] : 0; shown = Math.max(shown, Math.min(k, k0 + Math.floor((t - tt) * 50))); } });
    ctx.fillStyle = PAL.navy; ctx.textBaseline = 'middle';
    ctx.fillText(txt.slice(0, shown), x + padX, y + 2);
    const curOn = t < curEnd && Math.floor(t * 4) % 2 === 0;
    if (curOn && p >= 1) {
      const cx = x + padX + ctx.measureText(txt.slice(0, shown)).width + CUR_OFF;
      ctx.fillStyle = PAL.ink; ctx.fillRect(cx, y - size * 0.4, CUR_W, size * 0.82);
    }
    ctx.restore();
    return w;
  }

  function skyPose(t) {
    // arm at rest, palm up (== act 3 at 36.0: {ext 0, open 1, ang -0.55}); one twitch toward the 2014 arrow
    const tw = Math.max(0, Math.min(1, (t - 31.8) / 0.12)) * (1 - sm(R(t, 32.0, 32.45)));
    const arm = { ext: 0.22 * tw, tx: 700, ty: 1040, open: 1 - 0.55 * tw, ang: -0.55 + 0.7 * tw };
    let eyes = 'happy', mouth;
    if (tw > 0.05) { eyes = 'dots'; mouth = 'flat'; }
    if (t >= ORB_LAND) { eyes = 'dots'; mouth = t < 35.86 ? 'o' : undefined; }
    return { arm, eyes, mouth };
  }

  function sceneSky(t) {
    const ctx = E.ctx;
    const c = camAt(t);
    const ow = inkOw(c.Z);
    const ps = pose(t), sp = skyPose(t);
    const bob = ps.bob;
    const arm = t < 24.3 ? Object.assign({}, ps.arm) : sp.arm;
    const hand = handPos(t, GX, GY, GS, arm, bob);
    const cl = cloudAt(t, hand, arm.ang);
    const cs = toScreen(c, cl.x, cl.y);
    // fog planes need their own shader render: do it before the sky background
    const layers = planeLayers(t, cs);
    C.skyBG(skyParams(t));
    layers.forEach(L => { ctx.save(); ctx.globalAlpha = L.a; ctx.drawImage(L.c, 0, 0, W, HH); ctx.restore(); });
    // arrows that pass THROUGH the little cloud go behind it (in one side, out the other, unharmed); the volley
    // too (its paths never cross grabbygrab or the orb, so behind the world == behind the cloud)
    taggedArrows(t, c, true);
    volley(t, c);
    // world
    const grey = clamp(0.42 * (1 - (cl.lift - 0.7) / 0.3), 0, 1);
    // holding point for the orb == act 3's: hand + dir(ang) * 0.05 s, then + ORB_OFF
    const hp = [hand[0] + Math.cos(arm.ang) * 0.05 * GS + ORB_OFF[0], hand[1] + Math.sin(arm.ang) * 0.05 * GS + ORB_OFF[1]];
    const ob = t >= ORB_IN ? orbAt(t, hp) : null;
    const orbFront = !!(B.orb && B.orb.front);
    ctx.save();
    applyCam(ctx, c);
    C.puff(cl.x, cl.y, cl.puffR, { t, grey, ow });
    // contact shadow: fade in our own copy of grabby's exact shadow, then hand it to grabby (identical pixels)
    const shK = sm(R(t, 24.0, 25.0));
    const ownShadow = t >= 26.0;
    if (!ownShadow && shK > 0) {
      ctx.fillStyle = `rgba(0,0,0,${0.16 * shK})`;
      ctx.beginPath(); ctx.ellipse(GX, GY + 0.74 * GS, 0.48 * GS, 0.07 * GS, 0, 0, TAU); ctx.fill();
    }
    // the orb rides behind the mitten (as act 3 draws it at 36.0) the whole way, so it never pops layers
    G.grabby(t, GX, GY, GS, {
      eyes: t < 24.3 ? ps.eyes : sp.eyes, mouth: t < 24.3 ? ps.mouth : sp.mouth, bob, ow, arm, shadow: ownShadow,
      holding: ob && !orbFront ? () => orb(ob.x, ob.y, B.orb.r, ob.glow) : null,
    });
    if (ob && orbFront) orb(ob.x, ob.y, B.orb.r, ob.glow);
    ctx.restore();
    // sky reacts
    ripples(t, c); taggedArrows(t, c, false);
    // labels (viewfinder layer)
    brackets(t);
    const aYou = labelAlpha(t, 26.4, 29.8);
    if (aYou > 0) {
      C.mono(t, 'you (all of this)', 96, 140, { size: 40, color: PAL.navy, t0: 26.4, t1: 29.8 });
      pointer(520, 150, 580, 214, E.easeOutCubic(R(t, 26.45, 26.45 + 6 / FPS)), aYou);
    }
    const gS = toScreen(c, GX, GY);
    const aG = labelAlpha(t, 27.2, 29.8);
    if (aG > 0) {
      // left of him (the cloud owns the space up-right); leader ends ~20 px off his head outline
      const o = [gS[0] - 0.6 * 0.62 * GS * c.Z, gS[1] - 0.8 * 0.7 * GS * c.Z];   // upper-left of his head outline
      const end = [o[0] - 0.6 * 22, o[1] - 0.8 * 22];
      const lx = end[0] - 70, ly = end[1] - 120;
      C.mono(t, 'grabbygrab\n(off duty)', lx, ly, { size: 38, color: PAL.navy, align: 'right', t0: 27.2, t1: 29.8 });
      pointer(lx + 12, ly + 50, end[0], end[1], E.easeOutCubic(R(t, 27.25, 27.25 + 6 / FPS)), aG);
    }
    if (ob && t < 35.97) {
      const os = toScreen(c, ob.x, ob.y);
      const la = 1 - sm(R(t, 35.75, 35.95));
      // ride beside the orb, but stay inside the safe area (x <= 1000): lift above it while clamped
      const lw = 144, lx = Math.min(os[0] + 64, 1000 - lw), lift = clamp((os[0] + 64 - lx) / 60);
      if (os[0] < W - 20) C.mono(t, 'jhana?', lx, os[1] - 44 - 34 * lift, { size: 40, color: PAL.navy, alpha: la, t0: ORB_IN });
    }
    // ---- words
    const wt = C.wordTimes('C3', 4, 0.08);
    lyric(t, wt);
    capt(t, { text: 'the cloud can stay.', id: 'V16', style: 'serif', y: 1100, size: 90, t1: 30.0 });
    // V17 + V18 read as one couplet (top band, deepest sky); warm white with a soft navy shadow
    capt(t, { text: 'arrows pass through.', id: 'V17', style: 'serifRoman', y: 218, size: 90, t1: 32.3, shadow: true });
    capt(t, { text: "the sky doesn't mind.", id: 'V18', style: 'serif', y: 322, size: 96, color: PAL.warmWhite, t1: 32.75, shadow: true });
    rewardHack(t);
    capt(t, { text: "don't close, | not even for this.", id: 'V20', style: 'serifRoman', y: 356, size: 88, t1: 35.5, shadow: true });
  }

  // "you are the sky": one word per sung syllable; 'sky' widens its tracking while held (left-anchored; the line
  // is laid out for the FINAL tracking so the right edge never leaves the safe area)
  const SKY_TRACK = 22, LY_SIZE = 146;
  let LY = null;
  function lyric(t, wt) {
    const ctx = E.ctx;
    if (!LY) {
      ctx.save(); ctx.font = `italic 500 ${LY_SIZE}px "EB Garamond"`;
      const a = ctx.measureText('you are the').width, sp = ctx.measureText(' ').width, b = ctx.measureText('sky').width;
      ctx.restore();
      const extra = 2 * SKY_TRACK * LY_SIZE / 100;
      const x0 = Math.min(W / 2 - (a + sp + b) / 2, 1000 - extra - (a + sp + b));
      LY = { right: x0 + a, skyL: x0 + a + sp, x0, w: a + sp + b + extra };
    }
    capt(t, { text: 'you are the', style: 'serif', times: wt.slice(0, 3), x: LY.right, align: 'right', y: 420, size: LY_SIZE, t1: 28.4 });
    const track = SKY_TRACK * sm(R(t, 25.9, 28.4));
    capt(t, { text: 'sky', style: 'serif', times: [wt[3]], x: LY.skyL, align: 'left', y: 420, size: LY_SIZE, t1: 28.4, emph: { sky: { spacing: track } } });
  }

  // "the `reward hack`:"  (text leads the voice: 'the' -0.10, chip -0.14, typing -0.12, colon -0.08)
  let RH = null;
  const RH_GAP = 16;
  function rewardHack(t) {
    const L = C.line('V19');
    if (!L || t < L.word_t[0] - 0.1 || t > 35.95) return;
    const ctx = E.ctx;
    if (!RH) {
      ctx.save();
      ctx.font = 'normal 500 88px "EB Garamond"'; const a = ctx.measureText('the').width, sp = ctx.measureText(' ').width, colon = ctx.measureText(':').width;
      ctx.font = '500 60px "JBM"'; const tw = ctx.measureText('reward hack').width + 60 * 0.64;
      ctx.restore();
      const total = a + sp + tw + RH_GAP + colon;
      RH = { x0: W / 2 - total / 2, a, sp, tw, colon };
    }
    const y = 194, t1 = 35.5;
    const exitA = 1 - sm(R(t, t1, t1 + 0.4));
    const wt = L.word_t;
    capt(t, { text: 'the', style: 'serifRoman', times: [wt[0] - 0.10], x: RH.x0, align: 'left', y, size: 88, t1, shadow: true });
    ctx.save(); ctx.translate(0, -10 * (1 - exitA));
    codeToken(t, RH.x0 + RH.a + RH.sp, y, 'reward hack', wt[1] - 0.14, [[wt[1] - 0.12, 6], [wt[2] - 0.12, 11]], { alpha: exitA, curEnd: 33.6 });
    ctx.restore();
    capt(t, { text: ':', style: 'serifRoman', times: [wt[2] - 0.08], x: RH.x0 + RH.a + RH.sp + RH.tw + RH_GAP, align: 'left', y, size: 88, t1, shadow: true });
  }

  SCN.add(18.0, 24.0, 'act2-look-unclench', (t) => sceneDark(t));
  SCN.add(24.0, 36.0, 'act2-sky', (t) => sceneSky(t));
})();
