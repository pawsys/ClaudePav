// V2 core: grabbygrab built from glass and light (LOOK.md 3.1 to 3.3), his hand, and the knot family
// (knot, cracking, jewel, cloud, orb, wisp).
// Geometry: body half-width bw = 0.62 s, half-height bh = 0.70 s; s = 300 gives a body about 420 px tall.
// Material back to front: GL lens (scene program, V2.grab.uniforms) -> mood fill -> inner lobes -> ray fibres ->
// caustic crescent -> lead rim (clenched half) -> prism fringe -> light-pen contour (overshoots its start) ->
// off-register second line -> specular streak -> arm -> hand (union silhouette) -> face (ink, after the glow flush).
(function () {
  const V2 = window.V2;
  const { clamp, lerp, hash, TAU } = V2.U;
  const smoother = V2.U.smoother;
  const rgba = V2.rgba, mixHex = V2.mixHex;
  const W = 1080, H = 1350;
  const GR = V2.grab = {};

  // ------------------------------------------------------------------ moods (materials) and faces per state (3.2)
  // fill/fillA: translucent mood glass (op 'screen' on dark grounds, 'multiply' on light), core: light-pen contour,
  // halo: contour glow, off: off-register line, lead: lead rim amount (clenched half), lobes: inner colour lobes,
  // fibres: 'fist' (converge on the hand) | 'out' (radial, he is the sun) | 'soft' | 'none', div: boil divisor
  // (2 = 15 fps, 4 = 7.5 fps, 0 = frozen), wob: boil amplitude px at s 300, hand: hand glass fill.
  // Glass model (GL BODY chunk and the 2D sprite share it): the world seen through the body is FILTERED by the fill
  // hue (fill, filt), then lifted to a luminance FLOOR in the emission colour (glow, emit: the glass glows its own
  // colour even over dark grounds, so it never goes grey, olive or brown), the inner LOBES act as coloured filters
  // (translucent films overlapping into new colours), clear glass gets a SCREEN of the glow colour (scr: brighter than
  // the sky), and the interior gets a hue-keeping SATURATION lift (sat).
  // core: light-pen contour, halo: contour glow, off: off-register line, lead: lead rim (clenched half),
  // fibres: 'fist' | 'out' | 'soft' | 'none', div: boil divisor (2 = 15 fps, 4 = 7.5 fps, 0 = frozen), wob: boil px at
  // s 300, hand / handHi / handA: hand glass (luminous, never tan).
  // body: the apparent body colour the 2D path paints (what the GL glass reads as on its ground: amber is about
  // (243,154,48)); op2d / blend2d: its opacity and blend in 2D ('screen' for clear glass); thru / thruLo / thruHi: GL
  // show-through (the refracted world's light modulates his value, hue kept); haloW: contour halo width x lw.
  // hand / handHi / handA: hand glass (the body's own glass, at most 10% lighter, never tan or beige).
  GR.MOODS = {
    clench: { fill: '#FF9A3A', filt: 0.42, glow: '#FFBE5C', emit: 0.30, scr: 0.08, thru: 1.0, thruLo: 0.85, thruHi: 1.25, body: '#F39A30', op2d: 0.84, core: '#FFE2B0', halo: '#FF9A3D', off: '#2EE6FF', lead: 1, lobes: ['#FF2E97', '#FF5A3A', '#FF5A1A'], lobeA: 0.50, sat: 1.0, fibres: 'fist', fibreA: 0.12, div: 2, wob: 2.0, hand: '#F7962C', handHi: '#FFAE48', handA: 0.95 },
    worried: { fill: '#FF6B57', filt: 0.50, glow: '#FF8A62', emit: 0.22, scr: 0, thru: 0.8, body: '#F2744E', op2d: 0.82, core: '#FFE2B0', halo: '#FF9A3D', off: '#2EE6FF', lead: 1, lobes: ['#FF2E97', '#FF4A6A', '#9B5CFF'], lobeA: 0.36, sat: 1.2, fibres: 'fist', fibreA: 0.14, div: 2, wob: 1.5, hand: '#F5764E', handHi: '#FF8E66', handA: 0.95 },
    squeeze: { fill: '#FF4A2A', filt: 0.55, glow: '#FF7034', emit: 0.26, scr: 0, thru: 0.8, body: '#F0602C', op2d: 0.84, core: '#FFE2B0', halo: '#FF7A3D', off: '#2EE6FF', lead: 1, lobes: ['#FF2E97', '#FF4A6A', '#FF3A1A'], lobeA: 0.40, sat: 1.25, fibres: 'fist', fibreA: 0.24, div: 2, wob: 2.5, hand: '#F2642E', handHi: '#FF7E46', handA: 0.95 },
    look: { fill: '#FFB45C', filt: 0.40, glow: '#FFB848', emit: 0.26, scr: 0.10, thru: 0.6, body: '#F7A444', op2d: 0.80, core: '#FFD9A0', halo: '#FFB45C', off: '#FF6A3D', lead: 1, lobes: ['#FF6A3D', '#FF3D7A', '#FFB45C'], lobeA: 0.30, sat: 1.2, fibres: 'fist', fibreA: 0.10, div: 4, wob: 1.0, hand: '#F7A040', handHi: '#FFB85A', handA: 0.85 },
    open: { fill: '#FF8FC0', filt: 0.45, glow: '#FF8AC2', emit: 0.36, scr: 0.10, thru: 0.5, body: '#FF86B8', op2d: 0.74, core: '#FFFFFF', halo: '#FF8FC0', off: '#FFE66B', lead: 0, lobes: ['#FFE66B', '#FF5FA2', '#6FE3FF'], lobeA: 0.45, sat: 1.25, fibres: 'out', fibreA: 0.16, div: 2, wob: 1.4, hand: '#FF86B8', handHi: '#FF9FC8', handA: 0.88 },
    happy: { fill: '#FFE7C2', filt: 0.06, glow: '#FFE7C2', emit: 0.04, scr: 0.25, thru: 0, body: '#FFE7C2', op2d: 0.25, blend2d: 'screen', core: '#FFFFFF', halo: '#7FD8FF', off: '#FF9ACB', lead: 0, lobes: ['#FF8AC4', '#FFE05A', '#B18CFF'], lobeA: 0.20, sat: 1.25, fibres: 'soft', fibreA: 0.08, div: 4, wob: 1.0, haloW: 1.8, hand: '#FFB2D0', handHi: '#FFC6DC', handA: 0.72 },
    joy: { fill: '#FFF3C4', filt: 0.15, glow: '#FFE680', emit: 0.40, scr: 0.40, thru: 0, body: '#FFF0B0', op2d: 0.55, blend2d: 'screen', core: '#FFFFFF', halo: '#FFE600', off: '#FF2E97', lead: 0, lobes: ['#FFE600', '#FF3D9A', '#3DE7FF'], lobeA: 0.40, sat: 1.2, fibres: 'out', fibreA: 0.24, div: 2, wob: 1.4, hand: '#FFE066', handHi: '#FFEC8C', handA: 0.85 },
    metta: { fill: '#FF8FB1', filt: 0.50, glow: '#FF9ABA', emit: 0.36, scr: 0.10, thru: 0.4, body: '#FF86AA', op2d: 0.72, core: '#FFFFFF', halo: '#FFC94D', off: '#9FF2D0', lead: 0, lobes: ['#FFC94D', '#FF6FA0', '#B9A3FF'], lobeA: 0.38, sat: 1.2, fibres: 'soft', fibreA: 0.10, div: 4, wob: 0.9, heart: 1, hand: '#FF86AA', handHi: '#FF9EBC', handA: 0.88 },
    asleep: { fill: '#A9A0FF', filt: 0.45, glow: '#A99CFF', emit: 0.4, scr: 0.06, thru: 0.3, body: '#AFA4FF', op2d: 0.64, core: '#F4EFD8', halo: '#9FB4FF', off: '#C6A3FF', lead: 0, lobes: ['#C6A3FF', '#7FA0FF', '#FFC4E0'], lobeA: 0.5, sat: 1.35, fibres: 'none', fibreA: 0, div: 0, wob: 0.6, hand: '#AFA8FF', handHi: '#C2BCFF', handA: 0.82 },
  };
  // the 8 states (LOOK 3.2) -> mood + default face
  GR.STATES = {
    CLENCHED: ['clench', { eyes: 'squeeze', mouth: 'zigzag', sweat: 1 }],
    WORRIED: ['worried', { eyes: 'dots', brows: 'worried', mouth: 'o', sweat: 1 }],
    SQUEEZING: ['squeeze', { eyes: 'squeeze', brows: 'worried', mouth: 'zigzag', sweat: 1 }],
    LOOKING: ['look', { eyes: 'dots', mouth: 'flat' }],
    OPENING: ['open', { eyes: 'line', mouth: 'o' }],
    HAPPY: ['happy', { eyes: 'happy', mouth: 'smile' }],
    ASLEEP: ['asleep', { eyes: 'closed', mouth: 'smile' }],
    REGRAB: ['clench', { eyes: 'squeeze', mouth: 'zigzag' }],
  };
  // mood interpolation (pearl -> amber at the regrab, amber -> rose while opening)
  GR.mixMood = function (a, b, u) {
    const A = typeof a === 'string' ? GR.MOODS[a] : a, B = typeof b === 'string' ? GR.MOODS[b] : b;
    u = clamp(u);
    const m = {};
    for (const k in B) {
      const va = A[k] ?? B[k], vb = B[k];
      if (k === 'div') m[k] = u < 0.5 ? va : vb;                     // the boil cadence is discrete (a divisor of 1800)
      else if (typeof vb === 'number') m[k] = lerp(va, vb, u);
      else if (typeof vb === 'string' && vb[0] === '#') m[k] = V2.mixHexSat(va, vb, u);
      else if (Array.isArray(vb)) m[k] = vb.map((c, i) => (typeof c === 'string' && c[0] === '#') ? V2.mixHexSat(va[i] || c, c, u) : c);
      else m[k] = u < 0.5 ? va : vb;
    }
    return m;
  };
  const moodOf = m => typeof m === 'string' ? (GR.MOODS[m] || GR.MOODS.clench) : m;

  // ------------------------------------------------------------------ hand geometry (3.1 "the hand, redrawn")
  // local frame: +x points along the hand (away from the wrist), -y is the index side.
  // levels: [thumb, index, middle, ring, pinky] 0 (curled) .. 1 (open). mode 'hand' | 'mitten' (s under 160).
  const KNUCK_Y = [-0.165, -0.055, 0.055, 0.165];
  const OPEN_Y = [-0.15, -0.05, 0.05, 0.14], OPEN_A = [-0.55, -0.18, 0.18, 0.52], OPEN_L = [0.42, 0.48, 0.45, 0.36], OPEN_R = [0.078, 0.082, 0.077, 0.066];
  GR.handGeo = function (x, y, ang, hs, levels, mode = 'hand', raw = false) {
    hs = Math.round(hs * 4) / 4; ang = Math.round(ang * 512) / 512;              // snapped: the sprite cache key is exact
    const lv = raw ? levels.slice() : (levels || [0, 0, 0, 0, 0]).map(v => Math.round(smoother(clamp(v)) * 256) / 256);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const T = (lx, ly) => [x + (lx * ca - ly * sa) * hs, y + (lx * sa + ly * ca) * hs];
    const fo = (lv[1] + lv[2] + lv[3] + lv[4]) / 4;
    const palm = { c: T(-0.02, 0), hx: lerp(0.20, 0.21, fo) * hs, hy: lerp(0.23, 0.22, fo) * hs, r: lerp(0.16, 0.17, fo) * hs, ang };
    const caps = [];
    // thumb: across the front over the index knuckle (closed) -> splayed at -1.25 rad, length 0.32 hs (open)
    {
      const e = lv[0];
      // closed mitten: the thumb wraps across the front of the block (never sticking up: a thumbs-up)
      // closed mitten: the thumb lies along the index side, its tip forward, so the silhouette has a real notch
      // between the thumb lobe and the finger block (a hand, never a bell or a nub)
      const ca0 = mode === 'mitten' ? [-0.05, -0.19] : [-0.05, -0.25], cb0 = mode === 'mitten' ? [0.15, -0.28] : [0.03, 0.06];
      const oa = [0.02, -0.19], ob = [oa[0] + Math.cos(-1.25) * 0.32 * 0.82, oa[1] + Math.sin(-1.25) * 0.32 * 0.82];
      const a = [lerp(ca0[0], oa[0], e), lerp(ca0[1], oa[1], e)], b = [lerp(cb0[0], ob[0], e), lerp(cb0[1], ob[1], e)];
      caps.push({ a: T(...a), b: T(...b), r: lerp(0.088, 0.08, e) * hs, la: a, lb: b, e, k: 'thumb' });
    }
    if (mode === 'mitten') {
      const e = fo;
      const a0 = [0.17, -0.05], b0 = [0.19, 0.14], a1 = [0.16, 0.02], b1 = [0.16 + Math.cos(-0.06) * 0.26, 0.02 + Math.sin(-0.06) * 0.26];
      const a = [lerp(a0[0], a1[0], e), lerp(a0[1], a1[1], e)], b = [lerp(b0[0], b1[0], e), lerp(b0[1], b1[1], e)];
      caps.push({ a: T(...a), b: T(...b), r: lerp(0.13, 0.20, e) * hs, la: a, lb: b, e, k: 'block' });
    } else {
      for (let i = 0; i < 4; i++) {
        const e = lv[i + 1];
        const c0 = [0.19, KNUCK_Y[i]], base = [0.14, OPEN_Y[i]];
        const a = [lerp(c0[0], base[0], e), lerp(c0[1], base[1], e)];
        const th = OPEN_A[i] * e, len = OPEN_L[i] * 0.82 * e;
        const b = [a[0] + Math.cos(th) * len, a[1] + Math.sin(th) * len];
        caps.push({ a: T(...a), b: T(...b), r: lerp(0.11, OPEN_R[i], e) * hs, la: a, lb: b, e, k: 'f' + i });
      }
    }
    // crease between thumb and fingers: along the thumb's edge that faces the knuckles (fades as the thumb opens)
    const th = caps[0];
    const dx = th.lb[0] - th.la[0], dy = th.lb[1] - th.la[1], dl = Math.hypot(dx, dy) || 1;
    let nx = -dy / dl, ny = dx / dl; if (nx < 0) { nx = -nx; ny = -ny; }
    const off = (th.r / hs) * 0.92;
    const crease = [T(th.la[0] + dx * 0.18 + nx * off, th.la[1] + dy * 0.18 + ny * off), T(th.la[0] + dx * 0.92 + nx * off, th.la[1] + dy * 0.92 + ny * off)];
    const creaseA = mode === 'mitten' ? 1 : 1 - th.e;
    return { x, y, ang, hs, mode, lv, palm, caps, crease, creaseA, T, open: fo };
  };
  // Path2Ds of the hand parts (canvas coords)
  GR.handPaths = function (h) {
    const out = [];
    const p = new Path2D();
    const M = new DOMMatrix().translate(h.palm.c[0], h.palm.c[1]).rotate(h.ang * 180 / Math.PI);
    const pr = new Path2D(); pr.roundRect(-h.palm.hx, -h.palm.hy, 2 * h.palm.hx, 2 * h.palm.hy, h.palm.r);
    p.addPath(pr, M); out.push(p);
    for (const c of h.caps) {
      const q = new Path2D();
      const dx = c.b[0] - c.a[0], dy = c.b[1] - c.a[1], an = Math.atan2(dy, dx);
      if (Math.hypot(dx, dy) < 0.5) q.arc(c.a[0], c.a[1], c.r, 0, TAU);
      else { q.arc(c.a[0], c.a[1], c.r, an + Math.PI / 2, an + Math.PI * 1.5); q.arc(c.b[0], c.b[1], c.r, an - Math.PI / 2, an + Math.PI / 2); q.closePath(); }
      out.push(q);
    }
    return out;
  };

  // ------------------------------------------------------------------ union silhouette cache (per pose key)
  // one canvas: glass fill + inner knuckle light + outer light-pen outline (+ lead rim). Built in a local box and
  // cached by the pose (position excluded, so tremble is free). LRU of 40.
  // The sprite is built in the hand's LOCAL frame (angle 0, centred), and drawn rotated: a waving or rotating hand
  // reuses one sprite per finger pose. Luminous glass (a light-amber body, brighter upper left, a lit thumb lobe), so
  // the fist reads as glowing glass, never tan or brown.
  const silCache = new Map();
  function silhouette(h, M, lw, rimW, alpha) {
    const key = [h.hs, h.mode, ...h.lv, M.hand, M.handHi || '', M.core, M.halo, (+M.handA).toFixed(3), lw.toFixed(3), rimW.toFixed(3)].join('|');
    let c = silCache.get(key);
    if (c) { silCache.delete(key); silCache.set(key, c); return c; }
    const h0 = GR.handGeo(0, 0, 0, h.hs, h.lv, h.mode, true);
    const ext = h.hs * 1.05 + lw * 2 + rimW * 2 + 6;
    const S = Math.ceil(ext * 2);
    const mk = () => { const cv = document.createElement('canvas'); cv.width = S; cv.height = S; const g = cv.getContext('2d'); g.translate(S / 2, S / 2); g.lineJoin = 'round'; g.lineCap = 'round'; return [cv, g]; };
    const parts = GR.handPaths(h0);
    const U = new Path2D(); parts.forEach(p => U.addPath(p));
    // outline only (for the glow): union outline in the halo colour
    const [ol, go] = mk();
    go.strokeStyle = M.halo; go.lineWidth = 2 * lw * 1.5; parts.forEach(p => go.stroke(p));
    go.globalCompositeOperation = 'destination-out'; go.fillStyle = '#000'; parts.forEach(p => go.fill(p));
    // the hand: (lead rim) + light-pen outline, interiors punched, then glass fill behind
    const [cv, g] = mk();
    if (rimW > 0) { g.strokeStyle = rgba(V2.INK, 0.6); g.lineWidth = 2 * (lw + rimW); parts.forEach(p => g.stroke(p)); }
    g.strokeStyle = M.core; g.lineWidth = 2 * lw; parts.forEach(p => g.stroke(p));
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; parts.forEach(p => g.fill(p));
    // the curled thumb lies in front: its own light-pen outline stays visible across the palm (no lighter fill)
    const te = h0.caps[0].e;
    if (te < 0.6) { g.globalCompositeOperation = 'source-over'; g.globalAlpha = 0.85 * (1 - te / 0.6); g.strokeStyle = M.core; g.lineWidth = lw * 0.8; g.stroke(parts[1]); g.globalAlpha = 1; }
    g.globalCompositeOperation = 'destination-over';
    // the body's own glass: the hand colour lit a little (at most ~10% lighter) at the upper left, the first lobe's
    // hue as a coloured film toward the rim. The thumb has no separate lighter fill: it is drawn by the light-pen
    // contour and the one ink crease only (a lighter thumb read as a band-aid).
    const hi = M.handHi || V2.mixHexSat(M.hand, '#FFFFFF', 0.10);
    const grd = g.createRadialGradient(-h.hs * 0.10, -h.hs * 0.14, h.hs * 0.03, 0, 0, h.hs * 0.66);
    grd.addColorStop(0, rgba(hi, M.handA)); grd.addColorStop(0.5, rgba(M.hand, M.handA));
    grd.addColorStop(1, rgba(V2.mixHexSat(M.hand, M.lobes ? M.lobes[0] : M.hand, 0.22), M.handA));
    g.fillStyle = grd; g.fill(U);
    c = { cv, ol, S };
    silCache.set(key, c);
    if (silCache.size > 40) silCache.delete(silCache.keys().next().value);
    return c;
  }

  // ------------------------------------------------------------------ geometry
  // o: {squash, bob (0..1 amplitude of the 80 bpm bob), div, wob (boil px at s 300), boilT (clock for the boil seed,
  //     e.g. V2.tapeWarp(t)), arm {ext 0..1, tx, ty, ang, sag, open 0..1 | fingers [5], side 'right'|'left', hscale},
  //     mitten (true/false, default s*cam < 160), look [x,y], cam (scale of any outer camera, for the mitten switch)}
  GR.geo = function (t, x, y, s, o = {}) {
    const sq = o.squash || 0;
    const bob = (o.bob ?? 0) * V2.osc(t, 80) * 0.02 * s;
    const bw = 0.62 * s * (1 + sq), bh = 0.70 * s * (1 - sq);
    const cx = x, cy = y + bob + 0.70 * s * sq;
    const rr = a => 1 - 0.035 * Math.cos(2 * (a + 0.5)) + 0.015 * Math.sin(3 * a + 1);
    const bodyAt = (a, k = 1) => { const r = rr(a) * k; return [cx + Math.cos(a) * bw * r, cy + Math.sin(a) * bh * r * (Math.sin(a) > 0 ? 0.97 : 1)]; };
    const feet = [[-0.22, 0.665], [0.22, 0.665]].map(([fx, fy]) => ({ c: [x + fx * s, y + fy * s], rx: 0.125 * s, ry: 0.07 * s }));
    const arm = o.arm || { ext: 0, open: 0 };
    const sd = arm.side === 'left' ? -1 : 1;
    const sh = bodyAt(sd > 0 ? 0.25 : Math.PI - 0.25, 0.92);
    const rest = [cx + sd * 0.95 * bw, cy + 0.42 * bh];
    const e = clamp(arm.ext ?? 0);
    const hx = lerp(rest[0], arm.tx ?? rest[0], e), hy = lerp(rest[1], arm.ty ?? rest[1], e);
    const hang = arm.ang ?? Math.atan2(hy - sh[1], hx - sh[0]);
    const dist = Math.hypot(hx - sh[0], hy - sh[1]);
    const sag = (arm.sag ?? ((1 - e) * 0.25 + 0.1)) * s;
    const p1 = [sh[0] + (hx - sh[0]) * 0.33, sh[1] + (hy - sh[1]) * 0.33 + sag];
    const p2 = [hx - Math.cos(hang) * dist * 0.32, hy - Math.sin(hang) * dist * 0.32 + sag * 0.5];
    const armPts = [];
    for (let i = 0; i <= 24; i++) { const u = i / 24, v = 1 - u; armPts.push([v * v * v * sh[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * hx, v * v * v * sh[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * hy]); }
    const levels = arm.fingers || (() => { const v = arm.open ?? 0; return [v, v, v, v, v]; })();
    const mitten = o.mitten ?? (s * (o.cam ?? 1) < 160);
    const hs = 0.55 * s * (arm.hscale || 1);
    const hand = GR.handGeo(hx, hy, hang, hs, levels, mitten ? 'mitten' : 'hand');
    const lk = o.look || [0, 0];
    const div = o.div ?? null;
    return { t, s, x, y, cx, cy, bw, bh, bodyAt, feet, sh, armPts, armW: 0.11 * s, hand, hang, side: sd,
      ex: cx + lk[0] * 0.08 * s, ey: cy - 0.12 * s + lk[1] * 0.06 * s, o, div };
  };

  // GL uniforms: body lens ellipse + hand SDF (HAND_SDF chunk)
  GR.uniforms = function (G, mood, o = {}) {
    const h = G.hand, A = new Float32Array(24), R = new Float32Array(6);
    const M = moodOf(mood || 'clench'), k = o.k ?? 1, ox = o.ox ?? 0, oy = o.oy ?? 0;   // optional camera (screen = world*k + o)
    let F = [G.cx, G.cy];
    if (M.fibres === 'fist') F = [lerp(G.cx, G.hand.x, 0.55), lerp(G.cy, G.hand.y, 0.55)];
    const al = o.alpha ?? 1;
    // transmissions are computed here once (hue^density), so the shader does no per-pixel pow()
    const trans = (h, d) => { const L = V2.lin(h), m = Math.max(1e-3, ...L); return L.map(v => Math.pow(Math.max(v / m, 1e-3), d)); };
    const lobeT = { v3: new Float32Array([].concat(...M.lobes.map(h => trans(h, 0.6).map(v => Math.min(1.15, v * 1.15))))) };
    const glass = {
      uBodyFill: [...trans(M.fill, (M.filt ?? 0.4) * al), (M.filt ?? 0.4) * al], uBodyE: [...V2.lin(M.glow || M.fill), (M.emit ?? 0.3) * al],
      uBodyK: [(M.lobeA ?? 0.3) * al, 0.22 * al, 0.8 * al, (M.scr ?? 0) * al],
      uBodyLobe: lobeT, uBodyF: [F[0] * k + ox, F[1] * k + oy, (M.fibres && M.fibres !== 'none' ? M.fibreA * 1.6 : 0) * al, lerp(1, M.sat ?? 1.15, al)],
      uBodyV: [(M.thru ?? 0) * al, M.thruLo ?? 0.85, M.thruHi ?? 1.25, 0], uBodyD: V2.lin(V2.deepHex(M.glow || M.fill, 0.55)),
    };
    h.caps.forEach((c, i) => { A.set([c.a[0], c.a[1], c.b[0], c.b[1]], i * 4); R[i] = c.r; });
    return Object.assign(glass, {
      uBody: [G.cx * k + ox, G.cy * k + oy, G.bw * k, G.bh * k],
      uPalm: [h.palm.c[0] * k + ox, h.palm.c[1] * k + oy, h.palm.hx * k, h.palm.hy * k], uPalmR: [Math.cos(h.ang), Math.sin(h.ang), h.palm.r * k, 1],
      uFingA: { v4: A.map((v, i) => v * k + (i % 2 ? oy : ox)) }, uFingR: { v1: R.map(v => v * k) },
    });
  };

  // ------------------------------------------------------------------ the light-pen contour (pool contourStrokes)
  // smooth boil: a sum of 3 low-frequency sines along the line (2 to 7 cycles per turn), phases re-seeded per boil
  // frame, so the whole line breathes like a hand-drawn stroke instead of fraying per vertex. The tail drifts out past
  // the start so the overshoot (1.07 turns, about 25 degrees past its own start) reads as a drawn line.
  function contourPts(G, M, seedF, a0 = -2.2, turns = 1.07, n = 150, k0 = 1) {
    const wob = (M.wob ?? 1.5) * 1.1 * G.s / 300;
    const f = [2 + Math.floor(hash(seedF * 1.37 + 0.5) * 2), 4 + Math.floor(hash(seedF * 2.11 + 1.5) * 2), 6 + Math.floor(hash(seedF * 3.07 + 2.5) * 2)];
    const ph = [hash(seedF * 1.13 + 3) * TAU, hash(seedF * 1.71 + 4) * TAU, hash(seedF * 2.39 + 5) * TAU];
    const am = [1, 0.6, 0.35];
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, a = a0 + u * turns * TAU;
      const tail = u > 0.88 ? Math.pow((u - 0.88) / 0.12, 1.6) * 0.05 : 0, head = u < 0.06 ? (0.06 - u) / 0.06 * 0.018 : 0;
      const k = k0 + 0.010 * Math.sin(u * 9 + 1) + tail - head;
      const p = G.bodyAt(a, k);
      let w = 0; for (let j = 0; j < 3; j++) w += am[j] * Math.sin(f[j] * a + ph[j]);
      const nx = p[0] - G.cx, ny = p[1] - G.cy, nl = Math.hypot(nx, ny) || 1;
      pts.push([p[0] + nx / nl * w * wob, p[1] + ny / nl * w * wob]);
    }
    return pts;
  }
  function ellPath(G, k = 1) { const p = new Path2D(); const n = 96; for (let i = 0; i <= n; i++) { const q = G.bodyAt(i / n * TAU, k); i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]); } p.closePath(); return p; }
  GR.bodyPath = ellPath;
  // 2D glass (the GL BODY model in two cached half-res sprites per (mood, size, focus)):
  //   filter sprite (multiply): the fill hue, deeper at the rim, lobes as coloured films  -> the world takes the hue
  //   light sprite (screen): the emission colour (flat, a little brighter upper left), lobes, fibres, caustic, fresnel rim
  // Screen over a filtered dark ground gives luminous saturated glass (amber over indigo is amber, never brown).
  const glassCache = new Map();
  const nhue = h => { const c = V2.hex(h); const m = Math.max(1, ...c); return '#' + c.map(v => Math.round(v * 255 / m).toString(16).padStart(2, '0')).join(''); };
  // Beer-Lambert filter colour (as the GL BODY chunk): linear hue^density, back to sRGB
  const filterHex = (h, d) => { const L = V2.lin(h); const m = Math.max(1e-3, ...L); return '#' + L.map(v => Math.round(255 * Math.pow(Math.pow(Math.max(v / m, 1e-3), d), 1 / 2.2)).toString(16).padStart(2, '0')).join(''); };
  GR.filterHex = filterHex;
  function glass2D(ctx, G, M, A) {
    let F = [G.cx, G.cy];
    if (M.fibres === 'fist') F = [lerp(G.cx, G.hand.x, 0.55), lerp(G.cy, G.hand.y, 0.55)];
    const fx = Math.round((F[0] - G.cx) / 8), fy = Math.round((F[1] - G.cy) / 8);
    const bwq = Math.round(G.bw * 2) / 2, bhq = Math.round(G.bh * 2) / 2;
    G = Object.assign({}, G, { bw: bwq, bh: bhq });
    const body0 = M.body || M.glow || M.fill;
    const key = [M.fill, body0, (+M.filt).toFixed(3), (+(M.op2d ?? 0.7)).toFixed(3), M.blend2d || 'over', (+(M.scr || 0)).toFixed(3), M.lobes.join(), (+(M.lobeA ?? 0.3)).toFixed(3), M.fibres, (+M.fibreA).toFixed(3), M.core, M.glow, bwq, bhq, fx, fy, (+(M.heart || 0)).toFixed(2)].join('|');
    let c = glassCache.get(key);
    if (!c) {
      const k = 0.5, pw = Math.ceil(G.bw * 2 + 8), ph = Math.ceil(G.bh * 2 + 8);
      const mk = () => { const cv = document.createElement('canvas'); cv.width = Math.ceil(pw * k); cv.height = Math.ceil(ph * k); const g = cv.getContext('2d'); g.scale(k, k); g.translate(pw / 2, ph / 2); return [cv, g]; };
      const L = { bodyAt: (a, kk = 1) => { const p = G.bodyAt(a, kk); return [p[0] - G.cx, p[1] - G.cy]; } };
      const body = new Path2D(); const n = 96; for (let i = 0; i <= n; i++) { const q = L.bodyAt(i / n * TAU); i ? body.lineTo(q[0], q[1]) : body.moveTo(q[0], q[1]); } body.closePath();
      const r = Math.max(G.bw, G.bh);
      const LOB = [[-0.34, 0.30, 0.62], [0.32, 0.14, 0.58], [0.02, -0.40, 0.55]];
      // ---- 1 filter (multiply): the world through the fill hue (Beer-Lambert, deeper at the rim), as the GL BODY chunk
      const [fcv, fg] = mk();
      const ft = clamp(M.filt ?? 0.4) * (M.blend2d === 'screen' ? 0.5 : 1);
      const fr = fg.createRadialGradient(-G.bw * 0.28, -G.bh * 0.32, r * 0.05, 0, 0, r * 1.04);
      fr.addColorStop(0, filterHex(M.fill, ft * 0.85)); fr.addColorStop(0.7, filterHex(M.fill, ft)); fr.addColorStop(1, filterHex(M.fill, ft * 1.3));
      fg.fillStyle = fr; fg.fill(body);
      // ---- 2 the glass's own light (source-over at op2d, or screen for clear glass): the body colour, lit upper left
      //      (at most +12% value), deeper and denser at the rim, with the caustic, fresnel rim and fibres painted in
      const [lcv, g] = mk();
      const op = clamp(M.op2d ?? 0.7);
      const hiC = V2.mixHexSat(body0, '#FFFFFF', 0.12), loC = V2.mixHexSat(body0, M.lobes[0], 0.18);
      const gr = g.createRadialGradient(-G.bw * 0.30, -G.bh * 0.34, r * 0.04, 0, 0, r * 1.04);
      gr.addColorStop(0, rgba(hiC, op * 0.92)); gr.addColorStop(0.55, rgba(body0, op)); gr.addColorStop(0.9, rgba(body0, Math.min(1, op * 1.06))); gr.addColorStop(1, rgba(loC, Math.min(1, op * 1.12)));
      g.fillStyle = gr; g.fill(body);
      g.save(); g.clip(body);
      if (M.fibres && M.fibres !== 'none' && M.fibreA > 0) {
        const Fx = fx * 8, Fy = fy * 8, nn = M.fibres === 'soft' ? 16 : 26;
        g.globalCompositeOperation = 'lighter'; g.strokeStyle = mixHex(M.core, '#FFFFFF', 0.3); g.lineWidth = Math.max(1.4, 1.5 * G.s / 300);
        [[0.22, 0.60, 1], [0.60, 0.74, 0.5], [0.74, 0.85, 0.2]].forEach(([k0, k1, aa]) => {
          const p = new Path2D();
          for (let i = 0; i < nn; i++) { const a = (i + hash(i * 3.7) * 0.6) / nn * TAU, E = L.bodyAt(a, 1); p.moveTo(lerp(Fx, E[0], k0), lerp(Fy, E[1], k0)); p.lineTo(lerp(Fx, E[0], k1), lerp(Fy, E[1], k1)); }
          g.globalAlpha = M.fibreA * aa; g.stroke(p);
        });
        g.globalAlpha = 1;
      }
      g.globalCompositeOperation = 'lighter';
      const kx = G.bw * 0.10, ky = G.bh * 0.64;
      const cg = g.createRadialGradient(kx, ky, 0, kx, ky, G.bw * 0.6); cg.addColorStop(0, rgba('#FFF3C4', 0.26)); cg.addColorStop(1, rgba('#FFF3C4', 0));
      g.fillStyle = cg; g.beginPath(); g.ellipse(kx, ky, G.bw * 0.60, G.bh * 0.22, 0, 0, TAU); g.fill();
      g.strokeStyle = rgba(mixHex(M.glow || body0, '#FFFFFF', 0.35), 0.28); g.lineWidth = G.bw * 0.12; g.stroke(body);
      if (M.heart) { const hg = g.createRadialGradient(0, G.bh * 0.12, 0, 0, G.bh * 0.12, G.bw * 0.4); hg.addColorStop(0, rgba('#FFC94D', 0.45 * M.heart)); hg.addColorStop(1, rgba('#FFC94D', 0)); g.fillStyle = hg; g.fillRect(-G.bw, -G.bh, 2 * G.bw, 2 * G.bh); }
      g.restore();
      // ---- 3 lobe films (multiply): coloured filters inside him (translucency makes shapes); never screened (that made
      //      mustard and caramel), never more than lobeA
      const [bcv, bg] = mk();
      bg.fillStyle = '#FFFFFF'; bg.fillRect(-pw, -ph, 2 * pw, 2 * ph);
      bg.save(); bg.clip(body); bg.globalCompositeOperation = 'multiply';
      LOB.forEach(([dx, dy, rr], i) => {
        const x = dx * G.bw, y = dy * G.bh, R = rr * G.bw, la = clamp((M.lobeA ?? 0.3) * 0.9, 0, 0.8);
        const lg = bg.createRadialGradient(x, y, 0, x, y, R);
        lg.addColorStop(0, filterHex(M.lobes[i], la)); lg.addColorStop(1, '#FFFFFF');
        bg.fillStyle = lg; bg.fillRect(x - R, y - R, 2 * R, 2 * R);
      });
      bg.restore();
      c = { fcv, lcv, bcv, pw, ph, scr: M.blend2d === 'screen' };
      glassCache.set(key, c);
      if (glassCache.size > 48) glassCache.delete(glassCache.keys().next().value);
    }
    ctx.save();
    const x0 = G.cx - c.pw / 2, y0 = G.cy - c.ph / 2;
    ctx.globalAlpha = A; ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(c.fcv, x0, y0, c.pw, c.ph);
    ctx.globalCompositeOperation = c.scr ? 'screen' : 'source-over'; ctx.drawImage(c.lcv, x0, y0, c.pw, c.ph);
    ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(c.bcv, x0, y0, c.pw, c.ph);
    ctx.restore();
  }

  // ------------------------------------------------------------------ draw
  // GR.draw(ctx, G, mood, face, o): o {hand (true) | false, beforeHand(ctx) (e.g. the knot, between body and hand),
  //   faceNow (draw the face immediately instead of after the glow), alpha, ghost (lines only), lens (true: the GL
  //   lens shows through, keep the fill light), fringe px (2.5), noArm}
  GR.draw = function (ctx, G, mood, face = {}, o = {}) {
    const M = moodOf(mood);
    const s = G.s, sc = s / 300;
    const div = G.div ?? M.div ?? 2;
    const seedF = V2.boil(G.o.boilT ?? G.t, div);
    const lw = Math.max(3, 0.021 * s);                // contour core 6 to 8 px at hero size
    const body = ellPath(G);
    const A = o.alpha ?? 1;
    const leadA = (M.lead ?? 0) * (o.lead ?? 1);
    ctx.save(); ctx.globalAlpha = A; ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // ---- feet: only the part below the body (clipped by a local box minus the body), one light-line outline,
    // mood-glass fill. No ink ring (rings stacked behind a translucent body read as donuts or glasses).
    const feetP = G.feet.map(f => { const p = new Path2D(); p.ellipse(f.c[0], f.c[1], f.rx, f.ry, 0, 0, TAU); return p; });
    if (!o.ghost) {
      const fb = G.feet; const bx0 = fb[0].c[0] - fb[0].rx - lw * 2, bx1 = fb[1].c[0] + fb[1].rx + lw * 2, by0 = fb[0].c[1] - fb[0].ry - lw * 2, by1 = fb[0].c[1] + fb[0].ry + lw * 2;
      const clip = new Path2D(); clip.rect(bx0, by0, bx1 - bx0, by1 - by0); clip.addPath(ellPath(G, 1.0));
      ctx.save(); ctx.clip(clip, 'evenodd');
      feetP.forEach(p => { ctx.fillStyle = rgba(M.hand || M.body || M.fill, Math.min(0.9, M.handA ?? 0.85)); ctx.fill(p); });
      ctx.globalCompositeOperation = 'screen'; feetP.forEach(p => { ctx.fillStyle = rgba(M.lobes[0], 0.18); ctx.fill(p); });
      ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = M.core; ctx.lineWidth = lw * 0.75; feetP.forEach(p => ctx.stroke(p));
      ctx.restore();
    }

    // ---- body glass (o.glass === 'gl': the scene's GL pass draws it with the BODY chunk; else a cached half-res sprite)
    if (!o.ghost && o.glass !== 'gl') glass2D(ctx, G, M, A);
    // ---- lead rim (clenched half): 5 px indigo at 60% just outside the contour
    if (leadA > 0 && !o.ghost) { ctx.save(); ctx.strokeStyle = rgba(V2.INK, 0.6 * leadA); ctx.lineWidth = 5 * Math.max(0.6, sc * 0.9); ctx.stroke(ellPath(G, 1 + (lw * 0.5 + 2.5 * sc) / Math.min(G.bw, G.bh))); ctx.restore(); }

    // ---- contour: prism fringe, light-pen line (overshoots its start), off-register second line
    if ((V2.DBG || {}).noContour) { ctx.restore(); return {}; }
    const cpts = contourPts(G, M, seedF);
    const cbody = V2.fx.brush(cpts, lw, { taper: [0.06, 0.35, 0.08, 0.2] });
    const fr = (o.fringe ?? 2.5) * Math.max(0.5, sc);
    if (fr > 0 && !o.ghost) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.75 * A;
      ctx.fillStyle = '#FF2BD6'; ctx.translate(-fr, -fr * 0.5); ctx.fill(cbody); ctx.translate(2 * fr, fr);
      ctx.fillStyle = '#22E8FF'; ctx.fill(cbody); ctx.restore();
    }
    ctx.fillStyle = M.core; ctx.fill(cbody);
    const offK = sc;
    const opts = contourPts(G, M, seedF + 101, -1.3, 0.62, 70, 1.0).map(p => [p[0] + 6 * offK, p[1] + 4 * offK]);
    ctx.save(); ctx.globalAlpha = 0.9 * A; ctx.fillStyle = M.off; ctx.fill(V2.fx.brush(opts, lw * 0.45, { taper: [0.15, 0.2, 0.2, 0.1] })); ctx.restore();
    // specular streak (upper left, ~100 degrees) + dot
    if (!o.ghost) {
      const sp = []; for (let i = 0; i <= 24; i++) { const a = Math.PI * 1.06 + i / 24 * 1.745 * 0.62; sp.push([G.cx + Math.cos(a) * G.bw * 0.80, G.cy + Math.sin(a) * G.bh * 0.82]); }
      ctx.save(); ctx.globalAlpha = 0.7 * A; ctx.fillStyle = '#FFFFFF'; ctx.fill(V2.fx.brush(sp, 0.05 * s, { taper: [0.3, 0.2, 0.3, 0.2] }));
      ctx.restore();
    }

    // ---- arm: tapered glass noodle with light-pen sides (clipped outside the body)
    let armSides = null;
    if (!o.noArm) {
      const aw = G.armW;
      const side = k => G.armPts.map((p, i) => {
        const a = G.armPts[Math.max(0, i - 1)], b = G.armPts[Math.min(G.armPts.length - 1, i + 1)];
        let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1;
        const w = aw * 0.5 * (1 - 0.18 * i / G.armPts.length);
        return [p[0] - dy / l * w * k, p[1] + dx / l * w * k];
      });
      const inBody = q => { const dx = (q[0] - G.cx) / (G.bw * 1.0), dy = (q[1] - G.cy) / (G.bh * 1.0); return dx * dx + dy * dy < 1; };
      const L1 = side(1).filter(q => !inBody(q)), L2 = side(-1).filter(q => !inBody(q));
      const fillP = new Path2D(); L1.forEach((q, i) => i ? fillP.lineTo(q[0], q[1]) : fillP.moveTo(q[0], q[1])); for (let i = L2.length - 1; i >= 0; i--) fillP.lineTo(L2[i][0], L2[i][1]); fillP.closePath();
      ctx.save();
      if (!o.ghost && L1.length > 1 && L2.length > 1) {
        // lead rim as an outline just outside each side (never a fat stroke under the translucent fill)
        if (leadA > 0) {
          const ko = 1 + (lw * 0.5 + 2.5 * sc) / (aw * 0.5);
          const O1 = side(ko).filter(q => !inBody(q)), O2 = side(-ko).filter(q => !inBody(q));
          ctx.strokeStyle = rgba(V2.INK, 0.6 * leadA); ctx.lineWidth = 5 * Math.max(0.6, sc * 0.9);
          if (O1.length > 1) ctx.stroke(V2.P.path(O1)); if (O2.length > 1) ctx.stroke(V2.P.path(O2));
        }
        const ag = ctx.createLinearGradient(G.armPts[0][0], G.armPts[0][1], G.hand.x, G.hand.y);
        ag.addColorStop(0, rgba(M.hand, Math.min(1, M.handA * 0.85) * A)); ag.addColorStop(1, rgba(mixHex(M.hand, M.handHi || M.hand, 0.35), Math.min(1, M.handA * 0.95) * A));
        ctx.fillStyle = ag; ctx.fill(fillP);
      }
      ctx.lineWidth = Math.max(2.5, lw * 0.75); ctx.strokeStyle = M.core;
      if (L1.length > 1) ctx.stroke(V2.P.path(L1)); if (L2.length > 1) ctx.stroke(V2.P.path(L2));
      ctx.restore();
      armSides = [L1, L2];
    }

    // ---- halos (one glow flush per frame)
    const hp = new Path2D(); cpts.forEach((q, i) => i ? hp.lineTo(q[0], q[1]) : hp.moveTo(q[0], q[1]));
    if (!o.ghost) V2.glow(g => {
      g.globalAlpha = (o.glowA ?? 0.55) * A; g.strokeStyle = M.halo; g.lineWidth = lw * (M.haloW ?? 2.6); g.stroke(hp);
      g.globalAlpha = 0.35 * A; feetP.forEach(p => { g.lineWidth = lw * 1.8; g.stroke(p); }); g.globalAlpha = (o.glowA ?? 0.55) * A;
      if (armSides) { g.lineWidth = lw * 2.4; g.stroke(V2.P.path(armSides[0])); g.stroke(V2.P.path(armSides[1])); }
      g.globalAlpha = 0.45 * A; g.strokeStyle = '#FFFFFF'; g.lineWidth = 0.06 * s;
      g.beginPath(); g.ellipse(G.cx, G.cy, G.bw * 0.80, G.bh * 0.82, 0, Math.PI * 1.06, Math.PI * 1.06 + 1.08); g.stroke();
    });
    ctx.restore();

    // ---- hand (the knot sits between body and hand)
    const DB = V2.DBG || {};
    if (o.beforeHand && !DB.noKnot) { ctx.save(); o.beforeHand(ctx); ctx.restore(); }
    if (o.hand !== false && !o.noArm && !DB.noHand) GR.drawHand(ctx, G, o.handMood ? moodOf(o.handMood) : M, { alpha: A, lead: leadA, ghost: o.ghost });

    // ---- face (ink; drawn after the glow flush so halos never wash it out)
    if (face && !o.ghost) {
      const F = Object.assign({}, face);
      if (o.faceNow) { ctx.save(); GR.face(ctx, G, F); ctx.restore(); }
      else V2.post(c => GR.face(c, G, F));
    }
    return { lw, body, contour: cpts };
  };

  // the hand alone (union silhouette, crease, halo). o: {alpha, lead, ghost}
  GR.drawHand = function (ctx, G, mood, o = {}) {
    const M = moodOf(mood);
    const h = G.hand, s = G.s, sc = s / 300;
    const lw = Math.round(Math.max(2.5, 0.021 * s * 0.8) * 8) / 8;
    const rimW = (o.lead ?? M.lead ?? 0) > 0 ? 4 * Math.max(0.6, sc) : 0;
    const A = o.alpha ?? 1;
    const sil = silhouette(h, M, lw, rimW, A);
    const put = (c, img) => { c.translate(h.x, h.y); if (h.ang) c.rotate(h.ang); c.drawImage(img, -sil.S / 2, -sil.S / 2); };
    ctx.save(); ctx.globalAlpha = A * (o.ghost ? 0.6 : 1);
    ctx.save(); put(ctx, sil.cv); ctx.restore();
    // ink: the crease between thumb and fingers, and short notches between the curled fingers (fist reads at 270 px)
    if (!o.ghost) {
      const iw = Math.max(2, 0.010 * s);
      ctx.strokeStyle = V2.INK; ctx.lineCap = 'round';
      if (h.creaseA > 0.02) {
        ctx.globalAlpha = A * h.creaseA; ctx.lineWidth = Math.max(3, iw * (h.mode === 'mitten' ? 1.6 : 1.3));
        ctx.beginPath(); ctx.moveTo(h.crease[0][0], h.crease[0][1]); ctx.lineTo(h.crease[1][0], h.crease[1][1]); ctx.stroke();
      }
      if (h.mode === 'hand') {
        ctx.lineWidth = iw;
        const th = h.caps[0];
        for (let i = 0; i < 3; i++) {
          const a = h.caps[i + 1], b = h.caps[i + 2];
          const cl = Math.min(1 - a.e, 1 - b.e); if (cl <= 0.05) continue;
          const y = (a.la[1] + b.la[1]) / 2, x0 = Math.max(a.la[0], b.la[0]) + 0.06;
          // stop at the thumb's upper edge when the thumb is curled across, else run a third of the way down
          const ty = (y - th.la[1]) / ((th.lb[1] - th.la[1]) || 1);
          const thX = ty >= -0.1 && ty <= 1.1 ? lerp(th.la[0], th.lb[0], clamp(ty)) + th.r / h.hs + 0.012 : -1;
          const x1 = Math.max(thX, x0 - 0.15) * (1 - th.e) + (x0 - 0.12) * th.e;
          const P0 = h.T(x0, y), P1 = h.T(x1, y);
          ctx.globalAlpha = A * cl * 0.9; ctx.beginPath(); ctx.moveTo(P0[0], P0[1]); ctx.lineTo(P1[0], P1[1]); ctx.stroke();
        }
      }
    }
    ctx.restore();
    V2.glow(g => { g.globalAlpha = 0.75 * A; put(g, sil.ol); });
  };

  // ------------------------------------------------------------------ face (deep indigo ink, the darkest marks on screen)
  // f: {eyes 'squeeze'|'dots'|'big'|'happy'|'closed'|'line'|'one'|'side', mouth 'zigzag'|'o'|'smile'|'open'|'flat'|'wobble'|'none',
  //     brows 'worried', sweat 0..1, blush 0..1, look [x,y] (pupils), ink, blink 0..1 (lids close)}
  GR.face = function (ctx, G, f = {}) {
    // small characters get proportionally bigger features (cuter, and they read at phone size)
    const s = G.s * (G.s < 200 ? 1 + 0.25 * clamp((200 - G.s) / 103) : 1);
    const ink = f.ink || V2.INK;
    const lw = Math.max(4.5, 0.036 * s);
    const ex = G.ex, ey = G.ey;
    const eyes = f.eyes || 'dots';
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = lw;
    const lk = f.look || [0, 0];
    const blink = clamp(f.blink ?? 0);
    [-1, 1].forEach(sd => {
      const x = ex + sd * 0.2 * s;
      let e = eyes;
      if (e === 'one') e = sd < 0 ? 'closed' : 'dots';
      if (blink > 0.6 && (e === 'dots' || e === 'big' || e === 'side')) e = 'line';
      ctx.beginPath();
      if (e === 'squeeze') {
        const w = 0.06 * s, h = 0.058 * s;
        ctx.moveTo(x + sd * w, ey - h); ctx.lineTo(x - sd * w * 0.9, ey); ctx.lineTo(x + sd * w, ey + h); ctx.stroke();
      } else if (e === 'happy') {
        ctx.arc(x, ey + 0.035 * s, 0.062 * s, 1.12 * Math.PI, 1.88 * Math.PI); ctx.stroke();
      } else if (e === 'closed') {
        ctx.arc(x, ey - 0.025 * s, 0.058 * s, 0.14 * Math.PI, 0.86 * Math.PI); ctx.stroke();
      } else if (e === 'line') {
        ctx.moveTo(x - 0.05 * s, ey); ctx.lineTo(x + 0.05 * s, ey); ctx.stroke();
      } else {
        const r = (e === 'big' ? 0.062 : 0.048) * s * (1 - blink * 0.7);
        const px = lk[0] * r * 0.45, py = lk[1] * r * 0.4;
        ctx.ellipse(x + px, ey + py, r * 0.86, r * 1.16 * (1 - blink * 0.5), 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x + px - r * 0.3, ey + py - r * 0.42, Math.max(1.5, 0.016 * s), 0, TAU); ctx.fill(); ctx.fillStyle = ink;
        if (e === 'side') { ctx.beginPath(); ctx.moveTo(x - r * 1.3, ey - r * 0.25); ctx.lineTo(x + r * 1.3, ey - r * 0.45); ctx.stroke(); }
      }
      if (f.brows === 'worried') { ctx.beginPath(); ctx.moveTo(x + sd * 0.10 * s, ey - 0.115 * s); ctx.lineTo(x - sd * 0.035 * s, ey - 0.165 * s); ctx.stroke(); }
    });
    // blush: two soft rose ellipses
    const bl = f.blush ?? 0;
    if (bl > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'source-over';
      [-1, 1].forEach(sd => { const x = ex + sd * 0.34 * s, y = ey + 0.10 * s; const rg = ctx.createRadialGradient(x, y, 0, x, y, 0.085 * s);
        rg.addColorStop(0, rgba('#FF5E8A', 0.35 * bl * 2)); rg.addColorStop(1, rgba('#FF5E8A', 0)); ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(x, y, 0.085 * s, 0.05 * s, 0, 0, TAU); ctx.fill(); });
      ctx.restore();
    }
    const mouth = f.mouth || 'smile', my = ey + 0.15 * s;
    ctx.lineWidth = lw * 0.9; ctx.beginPath();
    if (mouth === 'zigzag') { const w = 0.07 * s; ctx.moveTo(ex - w, my); for (let k = 1; k <= 4; k++) ctx.lineTo(ex - w + k * w / 2, my + (k % 2 ? -0.026 : 0.026) * s); ctx.stroke(); }
    else if (mouth === 'o') { ctx.ellipse(ex, my, 0.032 * s, 0.042 * s, 0, 0, TAU); ctx.fill(); }
    else if (mouth === 'smile') { ctx.arc(ex, my - 0.05 * s, 0.06 * s, 0.18 * Math.PI, 0.82 * Math.PI); ctx.stroke(); }
    else if (mouth === 'open') {
      ctx.moveTo(ex - 0.08 * s, my - 0.04 * s); ctx.quadraticCurveTo(ex, my - 0.055 * s, ex + 0.08 * s, my - 0.04 * s);
      ctx.quadraticCurveTo(ex + 0.065 * s, my + 0.085 * s, ex, my + 0.085 * s); ctx.quadraticCurveTo(ex - 0.065 * s, my + 0.085 * s, ex - 0.08 * s, my - 0.04 * s); ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = '#FF6FB5'; ctx.beginPath(); ctx.ellipse(ex, my + 0.07 * s, 0.045 * s, 0.03 * s, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
    else if (mouth === 'flat') { ctx.moveTo(ex - 0.045 * s, my - 0.01 * s); ctx.lineTo(ex + 0.045 * s, my - 0.01 * s); ctx.stroke(); }
    else if (mouth === 'wobble') { ctx.moveTo(ex - 0.06 * s, my); ctx.bezierCurveTo(ex - 0.03 * s, my - 0.03 * s, ex, my + 0.03 * s, ex + 0.06 * s, my - 0.01 * s); ctx.stroke(); }
    // sweat: a cyan light tear with a white core
    const sw = f.sweat ?? 0;
    if (sw > 0) {
      const dx = G.cx - 0.56 * G.bw, dy = G.cy - 0.40 * G.bh;
      const p = new Path2D(); p.moveTo(dx, dy - 0.10 * s); p.quadraticCurveTo(dx + 0.06 * s, dy, dx, dy + 0.045 * s); p.quadraticCurveTo(dx - 0.06 * s, dy, dx, dy - 0.10 * s);
      ctx.globalAlpha = sw; ctx.fillStyle = '#48E5FF'; ctx.fill(p);
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(dx - 0.012 * s, dy - 0.01 * s, 0.014 * s, 0.026 * s, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#E8FEFF'; ctx.lineWidth = Math.max(2, 0.008 * s); ctx.stroke(p);
    }
    ctx.restore();
  };

  // ------------------------------------------------------------------ the knot (dukkha): the one opaque thing (3.3)
  // 18 tangled lead-came strands (unit coordinates), the scribble of clenching
  const SCRIB = (() => {
    const out = [];
    for (let L = 0; L < 18; L++) {
      const pts = []; let a = hash(L * 9.1) * TAU;
      const n = 5 + Math.floor(hash(L * 3.3) * 4);
      for (let i = 0; i < n; i++) { a += 0.9 + hash(L * 31 + i * 7.7) * 2.0; const r = 0.12 + 0.80 * Math.pow(hash(L * 17 + i * 3.1 + 1), 0.6); pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
      out.push(pts);
    }
    return out;
  })();
  // boundary: low-frequency lobes (3, 4, 5 per turn) re-phased by the 12 Hz seed (+-8 to 10% at jit 1: the blob
  // visibly vibrates), a fixed lumpiness (never a ball), a jagged crust of high-frequency bumps (+-3%, 41 and 53 per
  // turn) and 3 or 4 notches bitten into it, all re-seeded at 12 Hz
  function knotBoundary(seed, x, y, R, jit, n = 120) {
    const h1 = hash(seed * 1.3) * TAU, h2 = hash(seed * 2.7 + 4) * TAU, h3 = hash(seed * 5.1 + 9) * TAU, h4 = hash(seed * 7.9 + 2) * TAU;
    const h5 = hash(seed * 3.3 + 7) * TAU, h6 = hash(seed * 6.1 + 3) * TAU;
    const nn = 3 + (hash(seed * 0.77 + 5) > 0.5 ? 1 : 0);
    const notch = Array.from({ length: nn }, (_, i) => [hash(seed * 1.9 + i * 3.7) * TAU, 0.06 + 0.05 * hash(seed * 2.3 + i * 5.1), 0.10 + 0.06 * hash(seed * 4.1 + i)]);
    const jj = Math.min(1.6, jit);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU;
      let r = 1 + jit * (0.045 * Math.sin(3 * a + h1) + 0.032 * Math.sin(4 * a + h2) + 0.018 * Math.sin(5 * a + h3) + 0.008 * Math.sin(9 * a + h4)) + 0.035 * Math.sin(3 * a + 1) + 0.02 * Math.sin(2 * a + 2.2);
      r += (0.4 + 0.6 * jj) * (0.020 * Math.sin(41 * a + h5) + 0.013 * Math.sin(53 * a + h6) + 0.008 * Math.sin(29 * a + 1.3));
      for (const [na, dep, w] of notch) { let d = Math.abs(((a - na + Math.PI) % TAU + TAU) % TAU - Math.PI); if (d < w) r -= dep * (0.5 + 0.5 * jj) * (1 - d / w); }
      pts.push([x + Math.cos(a) * R * r, y + Math.sin(a) * R * r]);
    }
    return pts;
  }
  // the shell sprite is drawn at a reference radius (32, 64, 128, 256) and scaled, so an animated R (the regrab, the
  // +15% grow at 4.5) never rebuilds it: the cache key is (seed, reference radius, jit snapped to 1/16)
  const shellCache = new Map();
  function shell(seed, R, jit) {
    const Rr = R <= 40 ? 32 : R <= 80 ? 64 : R <= 150 ? 128 : 256;
    jit = Math.round(jit * 16) / 16;
    const key = seed + '_' + Rr + '_' + jit;
    let c = shellCache.get(key);
    if (c) return c;
    const k = 0.6, S = Math.ceil(Rr * 2.6 * k);
    const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const g = cv.getContext('2d'); g.setTransform(k, 0, 0, k, S / 2, S / 2);
    const bp = V2.P.path(knotBoundary(seed, 0, 0, Rr, jit), true);
    // flat dark crust (#140A2A) with a faint violet bloom inside: the one opaque thing in the film
    const gr = g.createRadialGradient(-Rr * 0.2, -Rr * 0.25, Rr * 0.1, 0, 0, Rr * 1.05);
    gr.addColorStop(0, '#1E0F3C'); gr.addColorStop(0.6, V2.KNOT.crust); gr.addColorStop(1, '#0E0620');
    g.fillStyle = gr; g.fill(bp);
    g.save(); g.clip(bp); g.lineCap = 'round'; g.lineJoin = 'round';
    const jx = i => (hash(i * 1.7 + seed * 0.37) - 0.5) * 0.10 * Math.min(1.5, jit);
    const lw = Math.max(2.4, Rr * 0.042);
    SCRIB.forEach((pts, L) => {
      const sp = LX.smoothPts(pts.map((p, i) => [(p[0] + jx(i + L * 13)) * Rr, (p[1] + jx(i + L * 13 + 99)) * Rr]), 6);
      const P = V2.P.path(sp);
      g.strokeStyle = L % 3 === 0 ? '#4A2690' : V2.KNOT.tangle; g.lineWidth = lw; g.stroke(P);   // flat lead came #3A1C6E
    });
    g.restore();
    c = { cv, S, k, Rr };
    shellCache.set(key, c);
    if (shellCache.size > 40) shellCache.delete(shellCache.keys().next().value);
    return c;
  }
  // GR.knot(ctx, t, x, y, R, o): o {jit 1 (0 calm .. 2 buzz), seed (12 Hz seed; default from the frame), crack 0..1 (shards
  //   fly), cracks 0..1 (hairline gold light leaks), alpha 1, edge 1 (neon edge level), flash 0..1 (lead flash),
  //   form 0..1 (crust coverage, regrab: creeps from the edge inward), halo 1 (dark violet halo)}
  GR.knot = function (ctx, t, x, y, R, o = {}) {
    const A = o.alpha ?? 1; if (A <= 0 || R < 2) return null;
    const jit = o.jit ?? 1, crack = clamp(o.crack ?? 0), form = clamp(o.form ?? 1);
    const fr = V2.frame(t);
    const seed = o.seed ?? Math.floor(fr * 0.4);           // 12 Hz (720 cycles per 60 s)
    const swap = (Math.floor(fr / 2) % 2) === 1;           // which neon edge is on top, every 2 frames
    const sc = R / 111;
    const sh = shell(seed, R, jit);
    const bpts = knotBoundary(seed, x, y, R, Math.round(jit * 16) / 16);
    const bp = V2.P.path(bpts, true);
    ctx.save(); ctx.globalAlpha = A;
    // a crisp dark-violet halo hugging the crust (an object, not a black hole; its glow is dark, not light)
    if ((o.halo ?? 1) > 0 && crack < 1) {
      const ha = (o.halo ?? 1) * (1 - crack);
      const hg = ctx.createRadialGradient(x, y, R * 0.9, x, y, R * 1.30);
      hg.addColorStop(0, rgba('#1E0A3A', 0.85 * ha)); hg.addColorStop(0.5, rgba('#1E0A3A', 0.70 * ha)); hg.addColorStop(0.62, rgba('#2A1050', 0.30 * ha)); hg.addColorStop(1, rgba('#2A1050', 0));
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(x, y, R * 1.32, 0, TAU); ctx.fill();
    }
    const ks = R / sh.Rr;
    const drawShell = c => { const w = sh.S / sh.k * ks; c.drawImage(sh.cv, x - w / 2, y - w / 2, w, w); };
    if (crack <= 0.001) {
      if (form >= 0.999) drawShell(ctx);
      else if (form > 0) {     // crust creeping inward over what it grabbed
        ctx.save(); const cl = new Path2D(); cl.arc(x, y, R * 1.3, 0, TAU); cl.arc(x, y, Math.max(0.1, R * (1 - form) * 1.02), 0, TAU, true); ctx.clip(cl, 'evenodd'); drawShell(ctx); ctx.restore();
      }
    } else {
      // 12 shards fly outward: dark outer faces with white/gold glint edges (glass, not dirt)
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a0 = (i + hash(i) * 0.25) / n * TAU, a1 = (i + 1 + hash(i + 1) * 0.25) / n * TAU, am = (a0 + a1) / 2;
        const d = crack * R * (0.7 + 1.6 * hash(i * 9.1)), rot = (hash(i * 4.3) - 0.5) * 1.6 * crack;
        const sca = 1 - 0.35 * crack;
        ctx.save();
        const fx0 = x + Math.cos(am) * R * 0.62, fy0 = y + Math.sin(am) * R * 0.62;
        ctx.translate(fx0 + Math.cos(am) * d, fy0 + Math.sin(am) * d); ctx.rotate(rot); ctx.scale(sca, sca); ctx.translate(-fx0, -fy0);
        const sec = new Path2D(); sec.moveTo(x + Math.cos(am) * R * (0.25 + 0.2 * hash(i * 2.2)), y + Math.sin(am) * R * (0.25 + 0.2 * hash(i * 2.2)));
        sec.lineTo(x + Math.cos(a0 + 0.03) * R * 1.3, y + Math.sin(a0 + 0.03) * R * 1.3); sec.lineTo(x + Math.cos(a1 - 0.03) * R * 1.3, y + Math.sin(a1 - 0.03) * R * 1.3); sec.closePath();
        ctx.save(); ctx.clip(sec); ctx.globalAlpha = A * clamp(1.3 - crack); drawShell(ctx); ctx.restore();
        ctx.globalAlpha = A * clamp(1.2 - crack) * 0.95; ctx.strokeStyle = i % 3 ? '#FFFFFF' : '#FFE3A3'; ctx.lineWidth = 2.5 * Math.max(0.6, sc);
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a0 + 0.05) * R * 0.98, y + Math.sin(a0 + 0.05) * R * 0.98); ctx.lineTo(x + Math.cos(am) * R * 1.0, y + Math.sin(am) * R * 1.0); ctx.stroke();
        ctx.restore();
      }
    }
    // hairline cracks leaking gold light (the luminous mind inside)
    const ck = clamp(o.cracks ?? 0);
    if (ck > 0 && crack < 0.3) {
      const p = new Path2D();
      for (let i = 0; i < 6; i++) {
        const a = hash(i * 7.31) * TAU; let px = x + Math.cos(a) * R * 0.15, py = y + Math.sin(a) * R * 0.15; p.moveTo(px, py);
        const L = R * (0.4 + 0.65 * hash(i * 2.9)) * ck;
        for (let k = 1; k <= 5; k++) { const aa = a + (hash(i * 11 + k) - 0.5) * 0.9; px += Math.cos(aa) * L / 5; py += Math.sin(aa) * L / 5; p.lineTo(px, py); }
      }
      ctx.save(); ctx.clip(bp); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#FFE3A3'; ctx.lineWidth = 2.2 * Math.max(0.7, sc); ctx.lineCap = 'round'; ctx.globalAlpha = A * Math.min(1, ck * 2); ctx.stroke(p); ctx.restore();
      V2.glow(g => { g.globalAlpha = A * ck; g.strokeStyle = '#FFB45C'; g.lineWidth = 9 * sc; g.stroke(p); });
    }
    // split neon edge: #FF2E97 at (+3,-2), #1FA352 at (-3,+2), 5 px each, swapping on top every 2 frames
    const ea = A * (o.edge ?? 1) * (1 - crack * 1.6) * (form >= 1 ? 1 : form);
    if (ea > 0.01) {
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2.5, 5 * sc);
      const m = () => { ctx.save(); ctx.translate(3 * sc, -2 * sc); ctx.globalAlpha = ea; ctx.strokeStyle = V2.KNOT.edgeA; ctx.stroke(bp); ctx.restore(); };
      const gn = () => { ctx.save(); ctx.translate(-3 * sc, 2 * sc); ctx.globalAlpha = ea; ctx.strokeStyle = V2.KNOT.edgeB; ctx.stroke(bp); ctx.restore(); };
      if (swap) { m(); gn(); } else { gn(); m(); }
      const fl = clamp(o.flash ?? 0);
      // lead flash: a crisp white core line ON the split edge, drawn after the glow flush (never a fuzzy white ring)
      if (fl > 0) V2.post(c => { c.save(); c.globalAlpha = fl * A; c.strokeStyle = '#FFFFFF'; c.lineJoin = 'round'; c.lineWidth = Math.max(1.5, 2.6 * sc); c.stroke(bp); c.restore(); });
      // 3 to 5 spark ticks re-seeded at 12 Hz
      ctx.lineCap = 'round';
      const ns = 3 + Math.floor(hash(seed * 0.71) * 3);
      for (let i = 0; i < ns; i++) {
        const a = hash(i * 5.7 + seed * 0.13) * TAU, r0 = R * 1.12, L = R * (0.12 + 0.22 * hash(i * 1.3 + seed));
        ctx.strokeStyle = V2.KNOT.spark[(i + seed) % 4]; ctx.lineWidth = Math.max(2, 3.6 * sc); ctx.globalAlpha = ea;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * (r0 + L), y + Math.sin(a) * (r0 + L)); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
    return { bp, pts: bpts };
  };

  // ------------------------------------------------------------------ the jewel: a white-hot light source (22.25)
  // The luminous mind under the crust (AN 1.49): a LIGHT SOURCE, never a gem drawing. A core with no rim (white to
  // 0.35 R, #FFF6E6 to 0.7 R, gold #FFC23D at about 0.6 at 1.0 R, fading out by 1.8 R through the glow queue); facets
  // as 6 to 8 tapered light lines (white core, gold halo) radiating from a slightly off-centre point (no closed
  // polygon); dispersion lives in the optional 6-band spectral fan; a 6-ray tapered sparkle turning slowly
  // (V2.osc(t, 40)) instead of a "+". Add a BURST 'jewel' in GL for the 22.25 hit (the GL star carries the burst).
  // o: {alpha, rot, n 7, hot 1, halo '#FFC23D', fan 0, fanAng (-PI/2), fanSpread 0.9, fanLen (6 R), sparkle 1}
  GR.jewel = function (ctx, t, x, y, R, o = {}) {
    const A = o.alpha ?? 1; if (A <= 0) return;
    const n = o.n ?? 7, rot = (o.rot ?? 0), hot = clamp(o.hot ?? 1);
    const fan = clamp(o.fan ?? 0);
    if (fan > 0) {          // spectral fan: 6 bands leaving the jewel, saturated, soft-edged light (lighter)
      const a0 = o.fanAng ?? -Math.PI / 2, sp = o.fanSpread ?? 0.9, Lf = (o.fanLen ?? 6) * R * (0.6 + 0.4 * fan);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      V2.SPEC6.forEach((col, i) => {
        const b0 = a0 - sp / 2 + sp * i / 6, b1 = b0 + sp / 6;
        const gr = ctx.createRadialGradient(x, y, R * 0.5, x, y, Lf);
        gr.addColorStop(0, rgba(col, 0.75 * fan * A)); gr.addColorStop(0.5, rgba(col, 0.40 * fan * A)); gr.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, Lf, b0, b1); ctx.closePath(); ctx.fill();
      });
      ctx.restore();
    }
    const halo = o.halo || '#FFC23D';
    // the soft light around it (glow queue): gold, gone by 1.8 R
    V2.glow(g => {
      g.globalAlpha = A * hot;
      const hg = g.createRadialGradient(x, y, R * 0.3, x, y, R * 1.8); hg.addColorStop(0, rgba('#FFF6E6', 0.9)); hg.addColorStop(0.45, rgba(halo, 0.6)); hg.addColorStop(1, rgba(halo, 0));
      g.fillStyle = hg; g.beginPath(); g.arc(x, y, R * 1.8, 0, TAU); g.fill();
    });
    // the core: a light, no rim
    ctx.save(); ctx.globalAlpha = A;
    const cg = ctx.createRadialGradient(x, y, 0, x, y, R * 1.25);
    cg.addColorStop(0, '#FFFFFF'); cg.addColorStop(0.28, '#FFFFFF'); cg.addColorStop(0.56, '#FFF6E6'); cg.addColorStop(0.8, rgba(halo, 0.6 * hot)); cg.addColorStop(1, rgba(halo, 0));
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(x, y, R * 1.25, 0, TAU); ctx.fill();
    ctx.restore();
    // facets: tapered light lines from an off-centre point (after the glow flush, so the halo never washes them out)
    const fx0 = x - R * 0.16, fy0 = y - R * 0.12, fac = [];
    for (let i = 0; i < n; i++) {
      const a = rot + (i + 0.3 * hash(i * 3.3 + 1)) / n * TAU, Lr = R * (0.72 + 0.28 * hash(i * 7.1 + 2));
      const p0 = [fx0 + Math.cos(a) * R * 0.10, fy0 + Math.sin(a) * R * 0.10], p1 = [x + Math.cos(a) * Lr, y + Math.sin(a) * Lr];
      fac.push([p0, [lerp(p0[0], p1[0], 0.5), lerp(p0[1], p1[1], 0.5)], p1]);
    }
    const sw = (o.sparkle ?? 1) > 0;
    const spk = [];
    if (sw) {
      const sr = rot * 0.5 + 0.35 * V2.osc(t, 40), sL = R * 0.95;
      for (let i = 0; i < 6; i++) { const a = sr + i / 6 * TAU, L2 = sL * (i % 2 ? 0.55 : 1); spk.push([[x + Math.cos(a) * R * 0.9, y + Math.sin(a) * R * 0.9], [x + Math.cos(a) * (R * 0.9 + L2 * 0.5), y + Math.sin(a) * (R * 0.9 + L2 * 0.5)], [x + Math.cos(a) * (R * 0.9 + L2), y + Math.sin(a) * (R * 0.9 + L2)]]); }
    }
    const fw = Math.max(2, R * 0.045);
    V2.glow(g => { g.globalAlpha = A * 0.8 * hot; g.strokeStyle = halo; g.lineCap = 'round'; g.lineWidth = fw * 4; fac.forEach(f => { g.beginPath(); g.moveTo(f[0][0], f[0][1]); g.lineTo(f[2][0], f[2][1]); g.stroke(); }); });
    V2.post(c => {
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = '#FFFFFF';
      c.globalAlpha = A * 0.9 * hot; fac.forEach(f => c.fill(V2.fx.brush(f, fw, { taper: [0.3, 0.3, 0.5, 0.0] })));
      if (sw) { c.globalAlpha = A * 0.95; spk.forEach(f => c.fill(V2.fx.brush(f, fw * 1.3, { taper: [0.2, 0.6, 0.7, 0.0] }))); }
      c.restore();
    });
  };

  // ------------------------------------------------------------------ the cloud: what is left of the knot (24 to 49.5)
  // ONE glass silhouette: 5 asymmetric lobes over a gently convex base (a wide flat ellipse), tilted a little. Each lobe
  // is its own translucent film (white / #FFD6EC at about 0.3), so where lobes overlap the glass is brighter: 3 or 4
  // internal value shifts read as volume; a #CBB8FF underside gradient; a 2 px glint rim on the OUTER outline only
  // (it stops at the silhouette: no base line, no stick). Translucent enough that the GL second lens (uLens2) shows the
  // squiggles bending inside it. Cached sprite per (scale, melt).
  // V2.grab.cloudLens(x, y, sc, o) is pure (no drawing): call it before the GL pass for the LENS uniforms.
  const LOBES = [[-0.80, 0.14, 0.50], [-0.30, -0.24, 0.70], [0.34, -0.36, 0.62], [0.78, -0.02, 0.56], [0.18, 0.10, 0.64]];
  const CBASE = [0.02, 0.34, 1.30, 0.34];                 // base ellipse cx, cy, rx, ry (units of k)
  const CTILT = -0.07;
  GR.cloudLens = function (x, y, sc, o = {}) {
    const A = (o.alpha ?? 1) * (1 - clamp(o.melt ?? 0));
    const k = 100 * sc * (1 - 0.35 * clamp(o.melt ?? 0));
    return { uBody2: [x, y - k * 0.05, k * 1.42, k * 0.82], uLens2: A > 0 ? (o.lens ?? 0.15) * A : 0 };
  };
  const cloudCache = new Map();
  GR.cloud = function (ctx, t, x, y, sc, o = {}) {
    const lens = GR.cloudLens(x, y, sc, o);
    const A = (o.alpha ?? 1) * (1 - clamp(o.melt ?? 0)); if (A <= 0) return lens;
    const k = Math.round(100 * sc * (1 - 0.35 * clamp(o.melt ?? 0)) * 4) / 4;
    const key = k.toFixed(2);
    let c = cloudCache.get(key);
    if (!c) {
      const pad = 16, w = Math.ceil(k * 3.4) + 2 * pad, h = Math.ceil(k * 2.5) + 2 * pad, ox = w / 2, oy = h * 0.52;
      const mkc = () => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.translate(ox, oy); g.rotate(CTILT); return [cv, g]; };
      const shapes = LOBES.map(([dx, dy, r]) => { const p = new Path2D(); p.arc(dx * k, dy * k, r * k, 0, TAU); return p; });
      const base = new Path2D(); base.ellipse(CBASE[0] * k, CBASE[1] * k, CBASE[2] * k, CBASE[3] * k, 0, 0, TAU);
      shapes.push(base);
      const U = new Path2D(); shapes.forEach(p => U.addPath(p));
      const [cv, g] = mkc();
      // one even film over the whole silhouette (no internal base edge), then each upper lobe as a soft film of its own:
      // where lobes overlap the glass is brighter (volume), lobes alternate white and #FFD6EC
      g.fillStyle = rgba('#FFF4FA', 0.26); g.fill(U, 'nonzero');
      const films = ['#FFFFFF', '#FFD6EC', '#FFFFFF', '#FFE6F3', '#FFD6EC'];
      LOBES.forEach(([dx, dy, r], i) => { const rg = g.createRadialGradient(dx * k, (dy - 0.1) * k, r * k * 0.2, dx * k, dy * k, r * k);
        rg.addColorStop(0, rgba(films[i], 0.26)); rg.addColorStop(0.8, rgba(films[i], 0.20)); rg.addColorStop(1, rgba(films[i], 0.06));
        g.save(); g.clip(U, 'nonzero'); g.fillStyle = rg; g.fill(shapes[i]); g.restore(); });
      // underside: lilac toward the base; a lit top
      g.save(); g.globalCompositeOperation = 'source-atop';
      const lg = g.createLinearGradient(0, -k * 0.2, 0, k * 0.68);
      lg.addColorStop(0, rgba('#CBB8FF', 0)); lg.addColorStop(0.6, rgba('#CBB8FF', 0.28)); lg.addColorStop(1, rgba('#B9A3FF', 0.42));
      g.fillStyle = lg; g.fillRect(-k * 2, -k * 1.4, k * 4, k * 2.4);
      const p2 = g.createRadialGradient(-k * 0.25, -k * 0.6, 0, -k * 0.25, -k * 0.6, k * 0.9); p2.addColorStop(0, rgba('#FFFFFF', 0.35)); p2.addColorStop(1, rgba('#FFFFFF', 0));
      g.fillStyle = p2; g.fillRect(-k * 2, -k * 1.6, k * 4, k * 3);
      g.restore();
      // outer outline only: stroke every shape, punch the union interior
      const [ol, go] = mkc();
      go.strokeStyle = '#FFFFFF'; go.lineWidth = 4; shapes.forEach(p => go.stroke(p));
      go.globalCompositeOperation = 'destination-out'; shapes.forEach(p => go.fill(p));
      c = { cv, ol, w, h, ox, oy };
      cloudCache.set(key, c); if (cloudCache.size > 12) cloudCache.delete(cloudCache.keys().next().value);
    }
    ctx.save(); ctx.globalAlpha = A;
    ctx.drawImage(c.cv, x - c.ox, y - c.oy);
    // o.boost: a second pass of the films (denser glass, a deeper lilac underside: reads at 360 px on a bright sky)
    if (o.boost) { ctx.globalAlpha = A * o.boost; ctx.drawImage(c.cv, x - c.ox, y - c.oy); }
    ctx.globalAlpha = A * 0.9; ctx.drawImage(c.ol, x - c.ox, y - c.oy);
    if (o.boost) { ctx.globalAlpha = A * 0.5 * o.boost; ctx.drawImage(c.ol, x - c.ox, y - c.oy); }
    ctx.restore();
    V2.glow(gg => { gg.globalAlpha = 0.5 * A; gg.drawImage(c.ol, x - c.ox, y - c.oy); });
    return lens;
  };

  // ------------------------------------------------------------------ the orb (jhana?): gold glass sphere
  // #FFC861 glass body (lit from the upper left, deeper gold at the rim), #FFF3C4 inner core, a fresnel rim of light,
  // a white specular arc, a caustic crescent, 4-point sparkles; halo at most 1.4 r. crust 0..1 goes out under the
  // knot's #140A2A crust (never brown). o: {alpha, lit 0..1+ (brightness), crust 0..1, spark true}
  GR.orb = function (ctx, t, x, y, r, o = {}) {
    const A = o.alpha ?? 1; if (A <= 0) return;
    const lit = o.lit ?? 1, cr = clamp(o.crust ?? 0);
    ctx.save(); ctx.globalAlpha = A;
    V2.glow(g => { g.globalAlpha = Math.min(1, 0.75 * lit * (1 - cr)) * A; const hg = g.createRadialGradient(x, y, r * 0.6, x, y, r * 1.4); hg.addColorStop(0, '#FFC861'); hg.addColorStop(1, 'rgba(255,200,97,0)'); g.fillStyle = hg; g.beginPath(); g.arc(x, y, r * 1.4, 0, TAU); g.fill(); });
    const vis = 1 - clamp((cr - 0.5) / 0.4);           // the glass is covered by the crust from cr 0.5 to 0.9
    if (vis > 0) {
      ctx.globalAlpha = A * vis;
      const gr = ctx.createRadialGradient(x - r * 0.32, y - r * 0.36, r * 0.05, x, y, r);
      gr.addColorStop(0, '#FFF3C4'); gr.addColorStop(0.35, '#FFD77A'); gr.addColorStop(0.75, '#FFC861'); gr.addColorStop(1, '#FF9A1F');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = A * vis * 0.5 * Math.min(1, lit);
      const kg = ctx.createRadialGradient(x + r * 0.25, y + r * 0.45, 0, x + r * 0.25, y + r * 0.45, r * 0.5); kg.addColorStop(0, '#FFF3C4'); kg.addColorStop(1, 'rgba(255,243,196,0)');
      ctx.fillStyle = kg; ctx.beginPath(); ctx.ellipse(x + r * 0.2, y + r * 0.5, r * 0.55, r * 0.25, -0.3, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = A * vis * 0.95;
      ctx.strokeStyle = '#FFE9A0'; ctx.lineWidth = Math.max(1.5, r * 0.06); ctx.beginPath(); ctx.arc(x, y, r * 0.96, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2, r * 0.11);
      ctx.beginPath(); ctx.arc(x, y, r * 0.68, Math.PI * 1.08, Math.PI * 1.42); ctx.stroke();
      if (o.spark !== false && lit > 0.3) {   // glints: tapered rays of light (thin at the tips, never a '+' of even lines)
        [[0.92, -0.84, 0.50], [-1.05, 0.62, 0.30]].forEach(([dx, dy, kk], j) => {
          const sx = x + dx * r, sy = y + dy * r, L = r * kk * (0.8 + 0.2 * V2.osc(t, 40, dx)), rt = 0.3 + 0.25 * V2.osc(t, 20, j);
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#FFFFFF';
          for (let i = 0; i < 6; i++) { const a = rt + i / 6 * TAU, LL = L * (i % 3 === 0 ? 1 : 0.5);
            ctx.fill(V2.fx.brush([[sx, sy], [sx + Math.cos(a) * LL * 0.5, sy + Math.sin(a) * LL * 0.5], [sx + Math.cos(a) * LL, sy + Math.sin(a) * LL]], Math.max(1.6, r * 0.07), { taper: [0.2, 0.9, 0.7, 0.0] })); }
          ctx.restore();
        });
      }
    }
    if (cr > 0) {            // the crust closes over it from the edge (#140A2A, lead-came tangle, knot edge)
      ctx.globalAlpha = A * clamp(cr * 1.6); ctx.globalCompositeOperation = 'source-over';
      const ri = r * (1.04 - clamp(cr) * 0.0), inner = r * (1 - clamp(cr * 1.25));
      const cp = new Path2D(); cp.arc(x, y, ri, 0, TAU); if (inner > 1) cp.arc(x, y, inner, 0, TAU, true);
      ctx.fillStyle = V2.KNOT.crust; ctx.fill(cp, 'evenodd');
      ctx.save(); ctx.clip(cp, 'evenodd'); ctx.strokeStyle = V2.KNOT.tangle; ctx.lineWidth = Math.max(2, r * 0.09); ctx.beginPath(); ctx.arc(x - r * 0.2, y, r * 0.45, 0.4, 4.2); ctx.moveTo(x + r * 0.5, y - r * 0.3); ctx.arc(x + r * 0.1, y + r * 0.1, r * 0.5, -0.8, 2.6); ctx.stroke(); ctx.restore();
      ctx.lineWidth = Math.max(2, r * 0.07); ctx.strokeStyle = V2.KNOT.edgeA; ctx.globalAlpha = A * clamp(cr * 1.6) * 0.8; ctx.beginPath(); ctx.arc(x + 1.5, y - 1, ri, 0, TAU); ctx.stroke();
      ctx.strokeStyle = V2.KNOT.edgeB; ctx.beginPath(); ctx.arc(x - 1.5, y + 1, ri, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  };

  // ------------------------------------------------------------------ the wisp (58.5 to 59.25): one small pearl lobe
  GR.wisp = function (ctx, t, x, y, r, o = {}) {
    const A = o.alpha ?? 1; if (A <= 0) return;
    ctx.save(); ctx.globalAlpha = A;
    const gr = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
    gr.addColorStop(0, rgba('#FFFFFF', 0.55)); gr.addColorStop(0.6, rgba('#F4EFD8', 0.40)); gr.addColorStop(1, rgba('#F4EFD8', 0.12));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.78, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r * 0.55, y + r * 0.12, r * 0.6, r * 0.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba('#FFFFFF', 0.7); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.78, 0, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
    ctx.restore();
    V2.glow(g => { g.globalAlpha = 0.6 * A; g.fillStyle = '#C9D6FF'; g.beginPath(); g.ellipse(x, y, r * 1.3, r, 0, 0, TAU); g.fill(); });
  };
})();
