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

  // ---------------------------------------------------------------- camera
  // cam = {Z, cx, cy}: world point (cx, cy) sits at the frame centre, zoom Z.
  const FIST = { x: 700, y: 712 };       // where the clenched fist is held (world)
  const ANG_MACRO = -2.0;                // fingers point up-left, forearm leaves frame bottom-right
  function camFromAnchor(Z, ax, ay, sx, sy) { return { Z, cx: ax - (sx - W / 2) / Z, cy: ay - (sy - HH / 2) / Z }; }
  function camAt(t) {
    // 18.0-22.3 macro on the fist, very slow push-in (attention)
    const zMacro = lerp(7.0, 7.35, sm(R(t, 18.0, 22.3)));
    const S_MACRO = [762, 868];
    if (t < 22.3) return camFromAnchor(zMacro, FIST.x, FIST.y, S_MACRO[0], S_MACRO[1]);
    // 22.3-24.0 pull back to his whole body (anchored on the fist point)
    const BODY = { Z: 1.9, sx: 470, sy: 925 };          // grabby centre on screen at 24.0
    const fistAtBody = [BODY.sx + (FIST.x - GX) * BODY.Z, BODY.sy + (FIST.y - GY) * BODY.Z];
    if (t < 24.0) {
      const k = easeInOut(R(t, 22.3, 24.0));
      const Z = Math.exp(lerp(Math.log(zMacro), Math.log(BODY.Z), k));
      return camFromAnchor(Z, FIST.x, FIST.y, lerp(S_MACRO[0], fistAtBody[0], k), lerp(S_MACRO[1], fistAtBody[1], k));
    }
    // 24.0-25.2 fast dolly-out (ease-out-expo), anchored on grabby
    const SKY = { Z: 1.1, sx: 505, sy: 905 };
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
  // ink weight: lines thicken a little under zoom, but not linearly (a 7x macro must not get 35 px outlines)
  const inkOw = Z => 5 * Math.pow(Z, -0.55);   // world-units 'ow' to pass to grabby / puff (== 5 at Z 1)

  // ---------------------------------------------------------------- grabby pose
  // finger opening: on 'clench' (21.75) one finger at a time, 120 ms stagger, ease-out; thumb last
  const OPEN_T0 = 21.76, STG = 0.12, FING = 0.36;   // finger i opens over [OPEN_T0 + i*STG, +FING]
  const OPEN_DONE = OPEN_T0 + 3 * STG + FING;
  const fingerP = (t, i) => E.easeOutCubic(R(t, OPEN_T0 + i * STG, OPEN_T0 + i * STG + FING));
  function pose(t) {
    const relax = easeInOut(R(t, 22.5, 24.2));          // arm comes home to rest
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
    let eyes = 'squeeze', mouth = undefined, sweat = 1 - sm(R(t, 22.4, 23.0));
    if (t >= 22.95 && t < 23.05) eyes = 'closed';
    else if (t >= 23.05) eyes = 'happy';
    if (t >= 22.95) mouth = 'smile';
    return { arm, trem, eyes, mouth, sweat, bob: sm(R(t, 23.6, 25.0)) };
  }
  // replicate grabby's hand position (needed for the held blob and the strain marks)
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
      const k = 1 - sm(R(f.p, 0, 0.45));
      if (k <= 0) return;
      ctx.save(); ctx.globalAlpha *= k;
      ctx.translate(0, f.lat); ctx.rotate(f.a);
      // outline of this finger over the palm/neighbours (gives three readable fingers)
      ctx.lineWidth = ow * 1.15;
      ctx.beginPath(); ctx.roundRect(f.xs, -f.hw, f.len, 2 * f.hw, f.hw); ctx.stroke();
      // knuckle crease: short arc across the finger
      ctx.lineWidth = ow * 0.9;
      const kx = f.xs + f.len * 0.58;
      ctx.beginPath(); ctx.arc(kx - f.hw * 1.6, 0, f.hw * 1.7, -0.42, 0.42); ctx.stroke();
      ctx.restore();
    });
    // thumb drawn on top with its own outline while it is across the fingers
    const kt = 1 - sm(R(pt, 0, 0.5));
    if (kt > 0) {
      ctx.save(); ctx.globalAlpha *= kt;
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
  // cartoon strain marks around the clenched fist (screen space, 7 px cream, fade with the tremble)
  function strain(t, sx, sy, amt) {
    if (amt <= 0) return;
    const ctx = E.ctx;
    const k = Math.floor(t * 10);
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = PAL.warmWhite; ctx.lineWidth = 7; ctx.globalAlpha = 0.85 * amt;
    [[-2.9, 300], [-2.55, 330], [0.15, 290], [0.45, 300]].forEach(([a, rr], i) => {
      if (H(k * 3.3 + i) < 0.3) return;
      const r0 = rr + 8 * H(k + i * 7), r1 = r0 + 46;
      ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * r0, sy + Math.sin(a) * r0); ctx.lineTo(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1); ctx.stroke();
    });
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
  // lift: 0 charcoal blob .. 1 white. m: 0 blob outline .. 1 puff outline (exact C.puff silhouette).
  function cloudColor(lift) {
    const stops = [[0, [34, 32, 41]], [0.35, puffFill(1)], [0.7, puffFill(0.42)], [1, puffFill(0)]];
    for (let i = 1; i < stops.length; i++) {
      if (lift <= stops[i][0]) { const [a0, c0] = stops[i - 1], [a1, c1] = stops[i]; return mix3(c0, c1, (lift - a0) / (a1 - a0)); }
    }
    return stops[stops.length - 1][1];
  }
  function blobCloud(t, x, y, r, { m = 0, lift = 0, jitter = 0, ow = 5, rim = 0, seed = 5, puffR = r, ticks = 0, Z = 1 } = {}) {
    const ctx = E.ctx;
    const jx = jitter * (Math.sin(t * 190) * 3 + Math.sin(t * 263 + 1) * 2) / Z;
    const jy = jitter * (Math.cos(t * 211) * 3 + Math.sin(t * 157 + 2) * 2) / Z;
    const N = 120;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU;
      const wob = 0.08 * PRIM.vnoise(Math.cos(a) * 2 + seed + t * 0.8) + 0.05 * PRIM.vnoise(Math.sin(a) * 3 + seed * 2 - t * 1.1)
        + jitter * 0.03 * Math.sin(a * 9 + t * 120);
      const rb = r * (1 + wob * (1 - m));
      const rp = puffR * puffRadius(a, t, 1, 1);
      const rr = lerp(rb, rp, m);
      pts.push([x + jx + Math.cos(a) * rr, y + jy + Math.sin(a) * rr]);
    }
    const path = () => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
    const col = cloudColor(lift);
    ctx.save();
    if (m > 0.001) { path(); ctx.lineJoin = 'round'; ctx.strokeStyle = PAL.ink; ctx.lineWidth = ow * 2 * sm(m); ctx.stroke(); }
    path();
    const hi = mix3(col, [255, 255, 255], 0.22 * (1 - m));
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.1);
    g.addColorStop(0, rgba(hi)); g.addColorStop(1, rgba(col));
    ctx.fillStyle = g; ctx.fill();
    // warm rim where the attention-light catches the top edge (separates dark blob from dark storm)
    if (rim > 0) {
      ctx.save(); path(); ctx.clip();
      ctx.lineWidth = 40 / Z; ctx.strokeStyle = `rgba(255,214,150,${0.16 * rim})`;
      ctx.filter = `blur(${(10).toFixed(0)}px)`;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const a = i / N * TAU;
        if (a < Math.PI * 1.05 || a > Math.PI * 1.95) continue;
        const p = pts[i]; i && a > Math.PI * 1.05 + 0.06 ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke();
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
  function cloudAt(t, hand, ang) {
    const lift = sm(R(t, 21.9, 23.6)) * 0.86 + 0.14 * sm(R(t, 25.0, 33.5));
    const m = sm(R(t, 22.45, 23.2));
    const jitter = (1 - sm(R(t, 21.75, 22.6))) * 1.0;
    // held (behind the palm) until the fingers are open, then it rises and drifts to its spot
    const held = [hand[0] + Math.cos(ang) * 37, hand[1] + Math.sin(ang) * 37];
    const rise = sm(R(t, 22.35, 24.6));
    const spot0 = [722, 640];
    const drift = sm(R(t, 25.0, 35.2));
    const spot = [lerp(spot0[0], B.cloud.x, drift), lerp(spot0[1], B.cloud.y, drift)];
    // the rise follows a soft arc (up first, then over)
    const ax = lerp(held[0], spot[0], E.easeInCubic(rise) * 0.6 + rise * 0.4);
    const ay = lerp(held[1], spot[1], E.easeOutCubic(rise));
    const r = lerp(30, 64, sm(R(t, 22.4, 23.4)));
    // condenses the storm (24.0-25.2): grows as the fog contracts into it
    const pr = lerp(r, lerp(64, 104, E.easeOutExpo(R(t, 24.0, 25.4))), 1) + (B.cloud.r - 104) * sm(R(t, 26.0, 35.0));
    return { x: ax, y: ay, r, puffR: t < 22.4 ? r : pr, lift, m, jitter };
  }

  // ---------------------------------------------------------------- attention light (18.25-23.8)
  function lightPass(t, L) {
    const ctx = E.ctx;
    const c = cv('light'); const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = rgba(L.amb.map(v => v * 255)); g.fillRect(0, 0, W, HH);
    g.globalCompositeOperation = 'lighter';
    if (L.cone > 0) {
      const phi = Math.atan2(L.ty - L.ay, L.tx - L.ax);
      const cg = g.createConicGradient(phi - Math.PI, L.ax, L.ay);
      const h0 = L.half / TAU, s0 = L.soft / TAU;
      const lc = L.col.map(v => v * 255);
      const st = [[0, 0], [0.5 - h0 - s0, 0], [0.5 - h0 - s0 * 0.5, 0.25], [0.5 - h0, 0.85], [0.5 - h0 * 0.4, 1], [0.5 + h0 * 0.4, 1], [0.5 + h0, 0.85], [0.5 + h0 + s0 * 0.5, 0.25], [0.5 + h0 + s0, 0], [1, 0]];
      st.forEach(([o, a]) => cg.addColorStop(clamp(o), rgba(lc, a * L.cone)));
      g.fillStyle = cg; g.fillRect(0, 0, W, HH);
      // pool where it lands
      if (L.pool) {
        const pg = g.createRadialGradient(L.tx, L.ty, 0, L.tx, L.ty, L.pool);
        pg.addColorStop(0, rgba(lc, 0.35 * L.cone)); pg.addColorStop(1, rgba(lc, 0));
        g.fillStyle = pg; g.fillRect(0, 0, W, HH);
      }
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(c, 0, 0);
    ctx.restore();
    // the beam itself in the air (faint), + dust motes
    if (L.cone > 0 && L.beam > 0) {
      const b = cv('beam'); const bg = b.getContext('2d');
      bg.setTransform(1, 0, 0, 1, 0, 0);
      bg.globalCompositeOperation = 'source-over'; bg.clearRect(0, 0, W, HH);
      const phi = Math.atan2(L.ty - L.ay, L.tx - L.ax);
      const cg = bg.createConicGradient(phi - Math.PI, L.ax, L.ay);
      const h0 = (L.half * 0.8) / TAU, s0 = L.soft / TAU;
      [[0, 0], [0.5 - h0 - s0, 0], [0.5 - h0, 1], [0.5 + h0, 1], [0.5 + h0 + s0, 0], [1, 0]].forEach(([o, a]) => cg.addColorStop(clamp(o), `rgba(255,226,180,${a})`));
      bg.fillStyle = cg; bg.fillRect(0, 0, W, HH);
      bg.globalCompositeOperation = 'destination-in';
      const lg = bg.createLinearGradient(L.ax, L.ay, L.tx, L.ty);
      lg.addColorStop(0, 'rgba(0,0,0,1)'); lg.addColorStop(0.75, 'rgba(0,0,0,0.45)'); lg.addColorStop(1, 'rgba(0,0,0,0.0)');
      bg.fillStyle = lg; bg.fillRect(0, 0, W, HH);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = L.beam * L.cone; ctx.drawImage(b, 0, 0);
      ctx.restore();
      dust(t, L);
    }
  }
  function inCone(L, x, y) {
    const phi = Math.atan2(L.ty - L.ay, L.tx - L.ax);
    let d = Math.atan2(y - L.ay, x - L.ax) - phi;
    d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
    return 1 - sm(R(d, L.half * 0.7, L.half + L.soft * 0.5));
  }
  function dust(t, L) {
    const ctx = E.ctx;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const r1 = H(i * 1.7 + 3), r2 = H(i * 2.9 + 5), r3 = H(i * 5.3 + 7);
      const x = 120 + r1 * 840 + Math.sin(t * (0.25 + r3 * 0.3) + i) * 30;
      const y = ((r2 * 1100 - t * (10 + 16 * r3)) % 1100 + 1100) % 1100 + 20;
      const a = inCone(L, x, y) * L.cone * L.beam * 2.4 * (0.35 + 0.65 * r3);
      if (a <= 0.02) continue;
      const s = 2.2 + r3 * 2.8;
      const gg = ctx.createRadialGradient(x, y, 0, x, y, s * 3);
      gg.addColorStop(0, `rgba(255,236,200,${0.55 * a})`); gg.addColorStop(1, 'rgba(255,236,200,0)');
      ctx.fillStyle = gg; ctx.fillRect(x - s * 3, y - s * 3, s * 6, s * 6);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- background: storm interior -> dove-grey fog
  function fogParams(t) {
    const f = sm(R(t, 22.5, 23.9));
    return {
      t, top: mixHex('#2a2733', '#A7A3AE', f), bot: mixHex('#1d1b24', '#CFC9C6', f), horizon: mixHex('#3A3348', '#E2D6CB', f),
      cloud: lerp(0.95, 0.9, f), storm: lerp(1, 0.18, f), warp: 2.0, zoom: lerp(2.8, 1.5, easeInOut(R(t, 22.3, 24.0))),
      dark: lerp(0.15, 0, f), fog: lerp(0, 0.22, f), driftR: 0.6, off: [0.4, 0.2],
    };
  }

  // ---------------------------------------------------------------- UNCLENCH: the type unclenches
  const UN = [...'UNCLENCH'];
  const UN_F = [['Anton', '400', 0.86], ['Archivo', '900', 0.69], ['Archivo', '600', 0.69], ['Archivo', '300', 0.69], ['Archivo', '200', 0.69]];
  const UN_CAPS = [118, 104, 94, 87, 82], UN_CAP = 82, UN_Y = 250;
  const UN_COL = [hex(PAL.yellow), mix3(hex(PAL.yellow), hex(PAL.warmWhite), 0.3), mix3(hex(PAL.yellow), hex(PAL.warmWhite), 0.62), mix3(hex(PAL.yellow), hex(PAL.warmWhite), 0.86), hex(PAL.warmWhite)];
  let UN_ADV = null;
  function unAdv(ctx) {
    if (UN_ADV) return UN_ADV;
    UN_ADV = UN_F.map(([f, w, cap], k) => { ctx.font = `${w} ${(UN_CAPS[k] / cap).toFixed(2)}px "${f}"`; return UN.map(ch => ctx.measureText(ch).width); });
    return UN_ADV;
  }
  const UN_S0 = 21.75, UN_STEP = 3 / FPS, UN_STG = 3 / FPS;
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
      const out = R(t, 22.78 + i * 0.03, 22.78 + i * 0.03 + 0.24);   // dissolve
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
      if (q.out > 0) ctx.filter = `blur(${(6 * q.out).toFixed(1)}px)`;
      ctx.font = `${w} ${size.toFixed(2)}px "${fam}"`;
      const by = UN_CAPS[q.st] / 2;
      if (q.st <= 1) {
        ctx.lineJoin = 'round'; ctx.strokeStyle = PAL.inkDeep; ctx.lineWidth = q.st === 0 ? 13 : 8;
        ctx.strokeText(q.ch, 0, by);
      } else {
        ctx.shadowColor = 'rgba(14,12,20,0.7)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 2;
      }
      ctx.fillStyle = rgba(UN_COL[q.st]);
      ctx.fillText(q.ch, 0, by);
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
    // world
    ctx.save();
    applyCam(ctx, c);
    const g = G.grabby(t, GX, GY, GS, {
      eyes: ps.eyes, mouth: ps.mouth, sweat: ps.sweat, bob: ps.bob, shadow: false, ow,
      arm,
      holding: () => {
        blobCloud(t, cl.x, cl.y, cl.r, { m: cl.m, lift: cl.lift, jitter: cl.jitter, ow, puffR: cl.puffR, Z: c.Z,
          rim: (1 - cl.m) * sm(R(t, 18.25, 18.6)), ticks: cl.jitter * (t < 21.75 ? 1 : 0.6) });
      },
    });
    fistOverlay(t, g.hand[0], g.hand[1], g.ang, 0.55 * GS, owW);
    ctx.restore();
    const handS = toScreen(c, g.hand[0], g.hand[1]);
    // attention light
    const fistS = toScreen(c, FIST.x - 30, FIST.y - 40);
    const on = t >= 18.25 ? 1 : 0;
    const wide = sm(R(t, 22.2, 23.75));
    const amb0 = lerp(0.42, 0.075, sm(R(t, 18.25, 18.7)));
    const amb = lerp(amb0, 1, sm(R(t, 22.6, 23.8)));
    if (amb < 0.999) {
      lightPass(t, {
        ax: 600, ay: -560, tx: fistS[0], ty: fistS[1],
        half: lerp(11, 70, wide) * Math.PI / 180, soft: lerp(9, 40, wide) * Math.PI / 180,
        amb: [amb * 0.92, amb * 0.9, amb], col: [1, 0.93, 0.8], cone: on, pool: 440, beam: 0.16 * (1 - wide),
      });
    }
    // ---- words
    C.caption(t, { text: "don't let go. | just look.", id: 'V13', style: 'serif', lead: 0.22, y: 222, size: 92,
      color: PAL.warmWhite, shadow: 'rgba(14,12,20,0.85)', t1: 20.62 });
    C.mono(t, 'attention is overpowered.', 90, 1080, { size: 40, color: PAL.warmWhite, alpha: 0.8, t0: 19.4, t1: 22.25 });
    C.mono(t, "evolution can't patch it.", 90, 1132, { size: 40, color: PAL.warmWhite, alpha: 0.8, t0: 19.95, t1: 22.25 });
    unclenchType(t);
    C.caption(t, { text: 'unclench.', style: 'serif', times: [22.86], y: UN_Y - 10, size: 132, t1: 23.62,
      color: PAL.navy });
  }

  // ---------------------------------------------------------------- 24.0-36.0 SKY (placeholder pass)
  function sceneSky(t) {
    const ctx = E.ctx;
    const c = camAt(t);
    C.skyBG(Object.assign({ t }, C.SKY_MORNING, { top: PAL.zenith }));
    const ps = pose(t);
    const ow = inkOw(c.Z);
    const hand = handPos(t, GX, GY, GS, ps.arm, ps.bob);
    const cl = cloudAt(t, hand, ps.arm.ang);
    ctx.save();
    applyCam(ctx, c);
    C.puff(cl.x, cl.y, cl.puffR, { t, grey: 1 - (cl.lift - 0.7) / 0.3 * 1, ow });
    G.grabby(t, GX, GY, GS, { eyes: 'happy', bob: ps.bob, ow, arm: { ext: 0, open: 1, ang: -0.55 } });
    ctx.restore();
    C.caption(t, { text: 'you are the sky', id: 'C3', style: 'serif', y: 420, size: 150, t1: 28.4 });
  }

  SCN.add(18.0, 24.0, 'act2-look-unclench', (t) => sceneDark(t));
  SCN.add(24.0, 36.0, 'act2-sky', (t) => sceneSky(t));
})();
