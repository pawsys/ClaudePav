// V2 core: type (LOOK.md 2.11). Voice decides the type:
//   neon  : Anton caps as neon signs (narrator, clenched half 0..18): white-hot core, halo in the glow pass.
//   light : Fraunces written in light (open half): 'light' 400 italic (guide), 'roman' 400 (narrator after 18),
//           'sung' 700 italic (choir), 'payoff' 900 italic ("free.").
//   mono  : JetBrains Mono readouts (500, labels 600), typed on with a block cursor.
// Word states come from V2.lit (unlit -> ignite, pre-lit -> blaze, poster). No chromatic split on any caption.
// Row y is the optical centre line of the text (cap centre for Anton), not the baseline (row.base = true for baseline).
(function () {
  const V2 = window.V2;
  const { clamp, lerp, TAU } = V2.U;
  const rgba = V2.rgba;
  const T = V2.type = {};

  T.FONTS = {
    neon: ['Anton', '400', 'normal', 0.36],
    light: ['Fraunces', '400', 'italic', 0.27],
    roman: ['Fraunces', '400', 'normal', 0.27],
    sung: ['Fraunces', '700', 'italic', 0.27],
    payoff: ['Fraunces', '900', 'italic', 0.27],
    mono: ['JBM', '500', 'normal', 0.30],
    label: ['JBM', '600', 'normal', 0.30],
  };
  T.font = (kind, size) => { const f = T.FONTS[kind] || T.FONTS.light; return `${f[2]} ${f[1]} ${size.toFixed(1)}px "${f[0]}"`; };
  T.baseOff = (kind, size) => (T.FONTS[kind] || T.FONTS.light)[3] * size;

  // largest size <= size so the widest line fits maxW
  T.fit = function (ctx, lines, kind, size, maxW = 940, track = 0) {
    ctx.save(); ctx.font = T.font(kind, size);
    const w = Math.max(...lines.map(l => ctx.measureText(l).width + track * Math.max(0, l.length - 1)));
    ctx.restore();
    return w > maxW ? size * maxW / w : size;
  };

  // rows: [{words:[..], size, y, x (540), align 'center'|'left'|'right', kind, track (px per letter), fit (true), base}]
  // returns words [{w, x, y (baseline), cy (centre), size, font, kind, i, width, row}]
  T.layout = function (ctx, rows, o = {}) {
    const out = []; let i = 0;
    ctx.save();
    rows.forEach((R, ri) => {
      const kind = R.kind || o.kind || 'light';
      const track = R.track || 0;
      let size = R.size;
      if (R.fit !== false && o.fit !== false) size = T.fit(ctx, [R.words.join(' ')], kind, size, R.maxW || o.maxW || 940, track);
      const f = T.font(kind, size);
      ctx.font = f;
      const sp = ctx.measureText(' ').width * (R.space ?? 1);
      const ws = R.words.map(w => ctx.measureText(w).width + track * Math.max(0, w.length - 1));
      const tot = ws.reduce((a, b) => a + b, 0) + sp * (R.words.length - 1);
      const ax = R.x ?? o.x ?? 540, al = R.align || o.align || 'center';
      let x = al === 'left' ? ax : al === 'right' ? ax - tot : ax - tot / 2;
      const yb = R.base ? R.y : R.y + T.baseOff(kind, size);
      R.words.forEach((w, k) => { out.push({ w, x, y: yb, cy: R.base ? R.y - T.baseOff(kind, size) : R.y, size, font: f, kind, i: i++, width: ws[k], row: ri, track }); x += ws[k] + sp; });
    });
    ctx.restore();
    return out;
  };
  // bounding box of laid-out words [x0,y0,x1,y1] (approx glyph extents)
  T.box = function (words, pad = 0) {
    let b = [1e9, 1e9, -1e9, -1e9];
    words.forEach(W => { const asc = W.kind === 'neon' ? 0.74 : 0.78, desc = W.kind === 'neon' ? 0.02 : 0.24;
      b = [Math.min(b[0], W.x), Math.min(b[1], W.y - W.size * asc), Math.max(b[2], W.x + W.width), Math.max(b[3], W.y + W.size * desc)]; });
    return [b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad];
  };
  // draw one word with optional per-letter tracking
  function textAt(g, W, fn) {
    if (!W.track) { g[fn](W.w, W.x, W.y); return; }
    let x = W.x;
    for (const ch of W.w) { g[fn](ch, x, W.y); x += g.measureText(ch).width + W.track; }
  }
  T.textAt = textAt;
  // cached word sprites: the crisp core of a word (fill + optional stroke) rendered once per (word, font, style)
  const spriteCache = new Map();
  T.sprite = function (W, style) {
    const key = W.w + '|' + W.font + '|' + (W.track || 0) + '|' + style.key;
    let c = spriteCache.get(key);
    if (c) return c;
    const pad = Math.ceil(W.size * 0.25);
    const cv = document.createElement('canvas');
    const asc = Math.ceil(W.size * 1.05), desc = Math.ceil(W.size * 0.35);
    cv.width = Math.ceil(W.width + 2 * pad); cv.height = asc + desc + 2 * pad;
    const g = cv.getContext('2d'); g.font = W.font; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
    const L = Object.assign({}, W, { x: pad, y: pad + asc });
    style.draw(g, L);
    c = { cv, dx: -pad, dy: -(pad + asc) };
    spriteCache.set(key, c);
    if (spriteCache.size > 300) spriteCache.delete(spriteCache.keys().next().value);
    return c;
  };
  T.putSprite = (ctx, W, sp) => ctx.drawImage(sp.cv, Math.round(W.x + sp.dx), Math.round(W.y + sp.dy));
  // quarter-res halo sprite of a word (fill at haloFill + stroke haloW em, in the halo colour), for the glow queue
  const haloCache = new Map();
  T.haloSprite = function (W, col, fill, wem) {
    const key = W.w + '|' + W.font + '|' + (W.track || 0) + '|' + col + '|' + fill + '|' + wem;
    let c = haloCache.get(key);
    if (c) return c;
    const k = 0.25, pad = Math.ceil(W.size * 0.3), asc = Math.ceil(W.size * 1.05), desc = Math.ceil(W.size * 0.35);
    const w = W.width + 2 * pad, h = asc + desc + 2 * pad;
    const cv = document.createElement('canvas'); cv.width = Math.ceil(w * k); cv.height = Math.ceil(h * k);
    const g = cv.getContext('2d'); g.scale(k, k); g.font = W.font; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
    const L = Object.assign({}, W, { x: pad, y: pad + asc });
    g.fillStyle = col; g.strokeStyle = col; g.globalAlpha = fill; textAt(g, L, 'fillText'); g.globalAlpha = 1; g.lineWidth = W.size * wem; textAt(g, L, 'strokeText');
    c = { cv, dx: -pad, dy: -(pad + asc), w: cv.width / k, h: cv.height / k };
    haloCache.set(key, c);
    if (haloCache.size > 300) haloCache.delete(haloCache.keys().next().value);
    return c;
  };

  // words from a TIMING line split into rows by counts: rowsOf('V01', [2,1,2], [{size,y},...], upper)
  T.rowsFrom = function (id, counts, specs, upper) {
    const L = typeof id === 'string' ? V2.line(id) : id;
    let k = 0;
    return counts.map((n, r) => { const ws = L.words.slice(k, k + n).map(w => upper ? w.toUpperCase() : w); k += n; return Object.assign({ words: ws }, specs[r]); });
  };

  // ------------------------------------------------------------------ measure (pre-pass, no drawing)
  // V2.type.measure(ctx, t, spec, kind) -> {words, box}: the same layout neon/light would draw (upper-casing for neon,
  // per-row kinds, fitting), without drawing. Use it before the GL pass for calm zones and caption panes.
  // kind: 'neon' | 'light' (default from spec.kind: neon if it is 'neon', else light)
  T.measure = function (ctx, t, spec, kind) {
    const isNeon = (kind || spec.kind) === 'neon';
    const L = spec.id ? V2.line(spec.id) : { words: spec.words, word_t: spec.word_t || spec.words.map(() => 0) };
    const upper = isNeon ? spec.upper !== false : false;
    let k = 0;
    const rows = spec.rows.map(R => {
      const n = R.n ?? (R.words ? R.words.length : L.words.length - k);
      const ws = R.words || L.words.slice(k, k + n).map(w => upper ? w.toUpperCase() : (spec.lower ? w.toLowerCase() : w));
      k += n;
      return Object.assign({ kind: isNeon ? 'neon' : (spec.kind || 'light') }, R, { words: ws });
    });
    const words = T.layout(ctx, rows, { maxW: spec.maxW || 940 });
    return { words, box: T.box(words) };
  };
  // QA (?qa=1): every drawn word box with its core colour and level, per frame (check/contrast.js reads V2.QA.words)
  V2.QA = { on: !!(V2.QUERY && V2.QUERY.get('qa') === '1'), words: [], panes: [] };
  const qaRec = (words, lit, core, A) => { if (!V2.QA.on) return; const m = ctx0 => ctx0; words.forEach(W => { const a = Math.min(1, (lit[W.i] ?? 1)) * A; if (a <= 0.05) return; const b = T.box([W]); V2.QA.words.push({ w: W.w, box: b, core, a, size: W.size }); }); };
  T.qaRec = qaRec;

  // ------------------------------------------------------------------ dark shadow-halo (light grounds)
  // deep colour halo drawn source-over BEHIND the core (blurred at 1/4 res). levels: per word 0..1
  T.shadowHalo = function (ctx, words, levels, col, a = 0.8, o = {}) {
    const b = T.box(words, 60);
    const k = 0.25, x0 = Math.floor(b[0]), y0 = Math.floor(b[1]);
    const w = Math.ceil((b[2] - b[0]) * k) + 2, h = Math.ceil((b[3] - b[1]) * k) + 2;
    const [c1, g1] = LX.scratch('v2shA', w, h); g1.clearRect(0, 0, w, h);
    g1.setTransform(k, 0, 0, k, -x0 * k, -y0 * k); g1.lineJoin = 'round';
    g1.fillStyle = col; g1.strokeStyle = col;
    words.forEach(W => { const lv = levels[W.i] ?? 1; if (lv <= 0) return; g1.globalAlpha = lv; g1.font = W.font; g1.lineWidth = W.size * (o.sw ?? 0.10); textAt(g1, W, 'fillText'); textAt(g1, W, 'strokeText'); });
    const [c2, g2] = LX.scratch('v2shB', w, h); g2.clearRect(0, 0, w, h);
    g2.filter = `blur(${o.blur ?? 3}px)`; g2.drawImage(c1, 0, 0); g2.filter = 'none';
    ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
    ctx.drawImage(c2, 0, 0, w, h, x0, y0, w / k, h / k);
    ctx.globalAlpha = a * 0.6; ctx.drawImage(c2, 0, 0, w, h, x0, y0, w / k, h / k);
    ctx.restore();
  };

  // blaze / pulse (halo multiplier > 1): the extra goes only into the WIDE glow layer as a soft bloom around the word,
  // in the halo hue at full saturation (its white component clamped): the halo grows bigger and more saturated, never
  // whiter, so the counters stay dark and the letters never merge into a white smear at 360 px
  function blazeWide(words, lit, hl, halo, A) {
    const extra = words.filter(W => (hl[W.i] ?? 1) > 1 && lit[W.i] > 0);
    if (!extra.length) return;
    const hv = V2.toHsv(halo), sat = V2.fromHsv(hv[0], Math.max(0.92, hv[1]), Math.min(1, hv[2]) * 0.9);
    V2.glow(g => {
      g.lineJoin = 'round';
      extra.forEach(W => { const k = ((hl[W.i] ?? 1) - 1) / 0.3; g.font = W.font; g.globalAlpha = Math.min(1, k * 0.45 * A); g.strokeStyle = sat;
        g.lineWidth = W.size * 0.34; textAt(g, W, 'strokeText'); });
    }, { wide: true });
  }
  T.blazeWide = blazeWide;

  // ------------------------------------------------------------------ neon (Anton)
  // spec: {id (TIMING line) | words+word_t, rows:[{n | words, size, y, x, align, track}], mode ('unlit-ignite'|'poster'|'lit'),
  //        upper (true), core '#FFF8F2', halo '#FF2E97', rim (tube rim, default the halo hue at half saturation), unlit
  //        (outline, default the halo hue tinted), unlitCore, lit (array override), alpha, haloA (1),
  //        pane: true (section pane behind the block) | {rect, hex, a} | false, maxW 940}
  // returns the laid-out words (use T.box(words) for calm zones)
  T.neon = function (ctx, t, spec) {
    const sec = V2.PAL[V2.section(t)] || V2.PAL.hook;
    const st = sec.type || V2.PAL.hook.type;
    const L = spec.id ? V2.line(spec.id) : { words: spec.words, word_t: spec.word_t || spec.words.map(() => 0) };
    const upper = spec.upper !== false;
    let k = 0;
    const rows = spec.rows.map(R => {
      const n = R.n ?? (R.words ? R.words.length : L.words.length - k);
      const ws = R.words || L.words.slice(k, k + n).map(w => upper ? w.toUpperCase() : w);
      k += n;
      return Object.assign({ kind: 'neon' }, R, { words: ws });
    });
    const words = T.layout(ctx, rows, { maxW: spec.maxW || 940 });
    const lit = spec.lit || V2.lit(t, L, spec.mode || 'unlit-ignite');
    const halo = spec.halo || st.halo, core = spec.core || st.core || '#FFF8F2';
    const A = spec.alpha ?? 1;
    if (A <= 0) return words;
    if (spec.pane) {
      const pn = spec.pane === true ? {} : spec.pane;
      const r = pn.rect || T.box(words, 70);
      V2.shade(ctx, r, pn.hex || st.pane, (pn.a ?? st.paneA) * A, pn);
    }
    const hl = lit.halo || lit;
    // the tight halo of each word is a cached quarter-res sprite (the glow canvas is quarter res): a static caption
    // costs one small image draw per word per frame, not a text raster into the glow canvas
    const hf = spec.haloFill ?? 0.85, hw = spec.haloW ?? 0.11;
    V2.glow(g => {
      words.forEach(W => {
        const a = Math.min(1, lit[W.i] * Math.min(1, hl[W.i] ?? 1) * (spec.haloA ?? 1) * A); if (a <= 0) return;
        const hs = T.haloSprite(W, halo, hf, hw), sc = (lit.scale && lit.scale[W.i]) || 1;
        g.globalAlpha = a;
        if (sc !== 1) { const cx = W.x + W.width / 2, cy = W.y - W.size * 0.36; g.drawImage(hs.cv, cx + (W.x + hs.dx - cx) * sc, cy + (W.y + hs.dy - cy) * sc, hs.w * sc, hs.h * sc); }
        else g.drawImage(hs.cv, W.x + hs.dx, W.y + hs.dy, hs.w, hs.h);
      });
    });
    blazeWide(words, lit, hl, halo, A * (spec.haloA ?? 1));
    ctx.save();
    // lit: a neon tube. White-hot core, a coloured tube rim just inside the glyph edge (the glass of the tube), the
    // halo outside it in the glow pass. Unlit: tinted glass toward the halo hue (core 30% + 3 px outline 70%).
    const hh = V2.toHsv(halo), rim = spec.rim || V2.fromHsv(hh[0], hh[1] * 0.5, 1);
    const stLit = { key: 'neonL' + core + rim + (spec.rimW ?? 0.10), draw: (g, L) => {
      g.fillStyle = core; textAt(g, L, 'fillText');
      // the rim is soft (blurred, cached in the sprite): pink at the glyph edge fading to the white core, so the letter
      // reads as a lit tube, not an outline font, and its edge stays soft against the halo
      const tc = document.createElement('canvas'); tc.width = g.canvas.width; tc.height = g.canvas.height;
      const tg = tc.getContext('2d'); tg.font = L.font; tg.textBaseline = 'alphabetic'; tg.lineJoin = 'round';
      tg.strokeStyle = rim; tg.lineWidth = L.size * (spec.rimW ?? 0.10); textAt(tg, L, 'strokeText');
      g.save(); g.globalCompositeOperation = 'source-atop'; g.filter = `blur(${(L.size * 0.022).toFixed(1)}px)`; g.drawImage(tc, 0, 0); g.restore(); } };
    qaRec(words, lit.map(v => Math.max(v, 0.3)), core, A);
    const ucore = spec.unlitCore || V2.fromHsv(hh[0], hh[1] * 0.24, 0.95), uline = spec.unlit || V2.fromHsv(hh[0], hh[1] * 0.32, 1);
    const stUnlit = { key: 'neonU' + ucore + uline, draw: (g, L) => { g.globalAlpha = 0.30 / 0.75; g.fillStyle = ucore; textAt(g, L, 'fillText'); g.globalAlpha = 0.70 / 0.75; g.strokeStyle = uline; g.lineWidth = 3; textAt(g, L, 'strokeText'); } };
    words.forEach(W => {
      const a = clamp(lit[W.i]);
      if (a < 1) { ctx.globalAlpha = (1 - a) * 0.75 * A; T.putSprite(ctx, W, T.sprite(W, stUnlit)); }   // unlit glass: core 30% + 3 px outline 75%
      const sc = (lit.scale && lit.scale[W.i]) || 1;     // the poster pop (V2.lit 'poster'): scale about the word's centre
      if (a > 0 && sc !== 1) { const sp = T.sprite(W, stLit), cx = W.x + W.width / 2, cy = W.y - W.size * 0.36; ctx.globalAlpha = a * A; ctx.drawImage(sp.cv, cx + (W.x + sp.dx - cx) * sc, cy + (W.y + sp.dy - cy) * sc, sp.cv.width * sc, sp.cv.height * sc); }
      else if (a > 0) { ctx.globalAlpha = a * A; T.putSprite(ctx, W, T.sprite(W, stLit)); }
    });
    ctx.restore();
    return words;
  };

  // ------------------------------------------------------------------ light (Fraunces)
  // spec: {id | words+word_t, rows, kind ('light'|'roman'|'sung'|'payoff', per row too), mode ('prelit-blaze'), core, halo,
  //        haloMode ('glow'|'shadow', from the section), lit, alpha, pane, words hidden before line start is the caller's job}
  T.light = function (ctx, t, spec) {
    const sec = V2.PAL[V2.section(t)] || V2.PAL.hook;
    const st = sec.type || {};
    const L = spec.id ? V2.line(spec.id) : { words: spec.words, word_t: spec.word_t || spec.words.map(() => 0) };
    let k = 0;
    const rows = spec.rows.map(R => {
      const n = R.n ?? (R.words ? R.words.length : L.words.length - k);
      const ws = R.words || L.words.slice(k, k + n).map(w => spec.lower ? w.toLowerCase() : w);
      k += n;
      return Object.assign({ kind: spec.kind || 'light' }, R, { words: ws });
    });
    const words = T.layout(ctx, rows, { maxW: spec.maxW || 940 });
    const lit = spec.lit || V2.lit(t, L, spec.mode || 'prelit-blaze');
    const hl = lit.halo || lit;
    const core = spec.core || st.core || '#FFF6E6', halo = spec.halo || st.halo || '#FF8FC0';
    const mode = spec.haloMode || st.mode || 'glow';
    const A = spec.alpha ?? 1;
    if (A <= 0) return words;
    if (spec.pane) {
      const pn = spec.pane === true ? {} : spec.pane;
      V2.shade(ctx, pn.rect || T.box(words, 70), pn.hex || st.pane, (pn.a ?? st.paneA ?? 0.4) * A, pn);
    }
    if (mode === 'shadow') T.shadowHalo(ctx, words, lit.map(v => v * A), halo, spec.shadowA ?? 0.85);
    else {
      V2.glow(g => {
        g.lineJoin = 'round';
        words.forEach(W => { const a = Math.min(1, lit[W.i] * Math.min(1, hl[W.i] ?? 1) * (spec.haloA ?? 0.9) * A); if (a <= 0) return;
          g.font = W.font; g.fillStyle = halo; g.strokeStyle = halo;
          g.globalAlpha = a * 0.6; textAt(g, W, 'fillText');           // light fill: counters keep their contrast
          g.globalAlpha = a; g.lineWidth = W.size * 0.06; textAt(g, W, 'strokeText'); });
      });
      blazeWide(words, lit, hl, halo, A * (spec.haloA ?? 0.9));
    }
    // the core is always drawn at its lit level (never extra brightness on the blaze: the word stays legible)
    qaRec(words, lit, core, A);
    ctx.save();
    const stL = { key: 'light' + core, draw: (g, L) => { g.fillStyle = core; textAt(g, L, 'fillText'); } };
    words.forEach(W => {
      const a = clamp(lit[W.i]) * A; if (a <= 0) return;
      ctx.globalAlpha = a; T.putSprite(ctx, W, T.sprite(W, stL));
    });
    ctx.restore();
    return words;
  };

  // ------------------------------------------------------------------ mono readouts
  // o: {size 40, weight '500'|'600', col, a 1, align 'left', t0 (typing start; undefined = fully shown), cps 40,
  //     cursor (true = block cursor while typing and blinking 1.2 s after), t1 (hard cut), halo, ga 0.5, track}
  T.mono = function (ctx, t, text, x, y, o = {}) {
    if (o.t1 !== undefined && t >= o.t1) return null;
    if (o.t0 !== undefined && t < o.t0) return null;
    const size = Math.max(36, o.size ?? 40);
    const kind = o.weight === '600' || o.label ? 'label' : 'mono';
    const f = T.font(kind, size);
    const n = o.t0 === undefined ? text.length : Math.min(text.length, Math.floor((t - o.t0) * (o.cps ?? 40) + 1e-6));
    const s = Array.from(text).slice(0, n).join('');
    const yb = y + T.baseOff(kind, size);
    const col = o.col || '#E8F7FF', A = o.a ?? 1;
    ctx.save(); ctx.font = f; ctx.textBaseline = 'alphabetic';
    const full = ctx.measureText(text).width, wNow = ctx.measureText(s).width;
    const x0 = o.align === 'right' ? x - full : o.align === 'center' ? x - full / 2 : x;
    if (o.halo) V2.glow(g => { g.font = f; g.globalAlpha = (o.ga ?? 0.5) * A; g.fillStyle = o.halo; g.strokeStyle = o.halo; g.lineWidth = size * 0.1; g.fillText(s, x0, yb); g.strokeText(s, x0, yb); });
    ctx.globalAlpha = A; ctx.fillStyle = col; ctx.fillText(s, x0, yb);
    if (V2.QA.on && s.length) V2.QA.words.push({ w: s, box: [x0, yb - size * 0.78, x0 + wNow, yb + size * 0.24], core: col, a: A, size, mono: true });
    if (o.cursor && o.t0 !== undefined) {
      const since = (t - o.t0) - text.length / (o.cps ?? 40);
      const on = since < 0 || (since < (o.blinkFor ?? 1.2) && Math.floor(since / 0.25) % 2 === 0);
      if (on) { ctx.globalAlpha = A * 0.9; ctx.fillRect(x0 + wNow + size * 0.08, yb - size * 0.74, size * 0.52, size * 0.86); }
    }
    ctx.restore();
    return [x0, yb - size * 0.78, x0 + full, yb + size * 0.24];
  };

  // ------------------------------------------------------------------ light-writing (glyph outlines drawn stroke by stroke)
  // data: V2.GLYPHS (core/glyphs.js): {key: {text, size, bbox, total, contours:[{pts, L}]}} at `size` px, baseline 0.
  // prog 0..1 draws the outlines; o.fill 0..1 fills the glyphs (4 to 6 frames after the outline closes).
  // x,y: centre of the word's bbox (o.align 'left' for baseline-left). Costs 130 to 205 ms: one word at a time.
  T.glyphWrite = function (ctx, key, x, y, size, prog, o = {}) {
    const G = (V2.GLYPHS || {})[key]; if (!G) return;
    const sc = size / G.size;
    const bx = o.align === 'left' ? x : x - (G.bbox[0] + G.bbox[2]) / 2 * sc;
    const by = o.align === 'left' ? y : y - (G.bbox[1] + G.bbox[3]) / 2 * sc;
    let budget = G.total * clamp(prog);
    const out = new Path2D(); let pen = null;
    for (const c of G.contours) {
      if (budget <= 0) break; const p = c.pts;
      out.moveTo(bx + p[0][0] * sc, by + p[0][1] * sc);
      for (let i = 1; i < p.length; i++) {
        const Lg = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
        if (budget < Lg) { const f = budget / Lg; pen = [bx + (p[i - 1][0] + (p[i][0] - p[i - 1][0]) * f) * sc, by + (p[i - 1][1] + (p[i][1] - p[i - 1][1]) * f) * sc]; out.lineTo(pen[0], pen[1]); budget = 0; break; }
        budget -= Lg; out.lineTo(bx + p[i][0] * sc, by + p[i][1] * sc);
      }
    }
    const core = o.core || '#FFF6E6', halo = o.halo || '#FF8FC0', w = o.w ?? 3.2, A = o.alpha ?? 1;
    const fill = clamp(o.fill ?? 0);
    let full = null;
    if (fill > 0) { full = new Path2D(); for (const c of G.contours) { const p = c.pts; full.moveTo(bx + p[0][0] * sc, by + p[0][1] * sc); for (let i = 1; i < p.length; i++) full.lineTo(bx + p[i][0] * sc, by + p[i][1] * sc); full.closePath(); } }
    V2.glow(g => { g.globalAlpha = A; g.strokeStyle = halo; g.lineWidth = w * 4; g.stroke(out); if (full) { g.fillStyle = halo; g.globalAlpha = A * fill * 0.8; g.fill(full, 'nonzero'); } });
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (full) { ctx.globalAlpha = A * fill; ctx.fillStyle = core; ctx.fill(full, 'nonzero'); }
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = A; ctx.strokeStyle = core; ctx.lineWidth = w; ctx.stroke(out);
    if (pen && prog < 1) { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(pen[0], pen[1], w * 2.2, 0, TAU); ctx.fill(); V2.glow(g => { g.fillStyle = halo; g.beginPath(); g.arc(pen[0], pen[1], w * 7, 0, TAU); g.fill(); }); }
    ctx.restore();
    return { bbox: [bx + G.bbox[0] * sc, by + G.bbox[1] * sc, bx + G.bbox[2] * sc, by + G.bbox[3] * sc], pen };
  };
})();
