// V2 core: clock. Pure functions of t only (LOOK.md 5.5). Frame grid, loop-safe oscillators, beat and bar grids,
// hit envelopes, boil seeds, the tape-stop warp, TIMING lookups and per-word lit levels.
// Everything here is deterministic: no Math.random, no performance.now, no state between frames.
(function () {
  const V2 = window.V2 = window.V2 || {};
  const TAU = Math.PI * 2;
  V2.W = 1080; V2.H = 1350; V2.FPS = 30; V2.DUR = 60; V2.NF = 1800; V2.TAU = TAU;

  // ------------------------------------------------------------------ math utils (V2.U)
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const U = {
    clamp, lerp, TAU,
    fract: x => x - Math.floor(x),
    smooth: t => { t = clamp(t); return t * t * (3 - 2 * t); },
    smoother: t => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); },
    range: (t, a, b) => clamp((t - a) / (b - a)),
    // deterministic hash in [0,1)
    hash: n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); },
    outCubic: t => 1 - Math.pow(1 - clamp(t), 3),
    inCubic: t => Math.pow(clamp(t), 3),
    inOutCubic: t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    outExpo: t => (t = clamp(t)) === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    inOutSine: t => -(Math.cos(Math.PI * clamp(t)) - 1) / 2,
    outBack: (t, s = 1.7) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; },
    outElastic: t => { t = clamp(t); if (t === 0 || t === 1) return t; return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * TAU / 3) + 1; },
    // point / polyline helpers
    dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]),
    rot: (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)],
  };
  V2.U = U;

  // ------------------------------------------------------------------ frame grid
  V2.wrap = t => ((t % 60) + 60) % 60;
  V2.frame = t => ((Math.round(t * 30) % 1800) + 1800) % 1800;
  // loop-safe oscillator: k whole cycles per 60 s (beat 80, bar 20, 6 s period 10, 12 Hz 720)
  const warned = new Set();
  V2.warnOnce = (id, msg) => { if (!V2.DEV || warned.has(id)) return; warned.add(id); console.warn(msg); };
  V2.osc = (t, k, ph = 0) => { if (k !== Math.round(k)) V2.warnOnce('osc' + k, 'V2.osc: k = ' + k + ' is not a whole number of cycles per 60 s (not loop-safe)'); return Math.sin(TAU * k * t / 60 + ph); };
  // beat (0.75 s) and bar (3.0 s) grids. ph in [0,1).
  V2.beat = t => { const x = t / 0.75 + 1e-9; const i = Math.floor(x); return { i, ph: x - i }; };
  V2.bar = t => { const x = t / 3.0 + 1e-9; const i = Math.floor(x); return { i, ph: x - i }; };
  V2.s16 = t => { const x = t / 0.1875 + 1e-9; const i = Math.floor(x); return { i, ph: x - i }; };
  // hit envelope: 0 before t0, full on t0's frame (1-frame attack), exp decay with time constant `decay` (s).
  // Frame-snapped so the peak lands exactly on the event's frame.
  V2.hit = function (t, t0, decay = 0.3) {
    const k = Math.round(t * 30) - Math.round(t0 * 30);
    if (k < 0) return 0;
    return Math.exp(-(k / 30) / decay);
  };
  // general envelope: linear attack over `att` frames (att=1 means full on the event frame), then exp decay
  V2.env = function (t, t0, att = 1, decay = 0.3) {
    const k = Math.round(t * 30) - Math.round(t0 * 30);
    if (k < 0) return 0;
    if (k < att - 1) return (k + 1) / att;
    return Math.exp(-((k - (att - 1)) / 30) / decay);
  };
  // boil seed: floor(frame / div); div in {2 (15 fps), 4 (7.5 fps)}; div = 0 means frozen (seed 0).
  // Feed it V2.tapeWarp(t) to freeze it with the tape-stop.
  V2.boil = (t, div = 2) => { if (div && 1800 % div) V2.warnOnce('boil' + div, 'V2.boil: div = ' + div + ' does not divide 1800 (the boil seed jumps at the seam)'); return div ? Math.floor(V2.frame(t) / div) : 0; };
  // tape-stop animation clock (17.55 to 18.0): identity before 17.55, eases to a stop at 17.70.
  V2.tapeWarp = function (t) {
    if (t < 17.55) return t;
    const u = clamp((t - 17.55) / 0.45);
    return 17.55 + 0.15 * (1 - Math.pow(1 - u, 3));
  };

  // ------------------------------------------------------------------ TIMING lookups
  const lineCache = {};
  V2.line = function (id) {
    if (lineCache[id]) return lineCache[id];
    const T = window.TIMING || { lines: [], choir: [] };
    let L = T.lines.find(l => l.id === id), choir = false;
    if (!L) { L = T.choir.find(l => l.id === id); choir = !!L; }
    if (!L) throw new Error('V2.line: unknown id ' + id);
    const out = { id, words: Object.freeze(L.words.slice()), word_t: Object.freeze(L.word_t.slice()), t: L.t, end: L.end, voice: L.voice || (choir ? 'choir' : ''), choir };
    return (lineCache[id] = Object.freeze(out));                    // read-only: shared by every caller
  };

  // ------------------------------------------------------------------ per-word lit levels (LOOK.md 2.11)
  // Returns an array of core levels (0..1) with parallel arrays .halo (halo multiplier) and .state.
  // modes:
  //  'unlit-ignite' : unlit glass (0) until onset-0.06, then a 4-frame neon flicker 0.6, 1.0, 0.35, 1.0, then 1.
  //  'prelit-blaze' : pre-lit 0.55 until the onset, then 1.0 with a 4-frame bloom (halo 1.3x, easing to 1.0).
  //  'poster'       : V01 rule: fully lit; a pop on each onset (halo 1.9x and scale 1.07, decaying over 4 frames,
  //                   in .halo and .scale); re-ignites at 59.85 (frames
  //                   1796..1799 = 0.6, 1.0, 0.35, 1.0), frame 0 = 1.0.
  //  'lit'          : everything 1.
  // o.lead shifts every onset earlier (s). V2.PREVIEW (?preview=1) lights everything.
  const FLICK = [0.6, 1.0, 0.35, 1.0];
  const POP_H = [1.9, 1.6, 1.35, 1.15], POP_S = [1.07, 1.045, 1.022, 1.006];
  V2.lit = function (t, id, mode = 'unlit-ignite', o = {}) {
    const L = typeof id === 'string' ? V2.line(id) : id;
    const wt = L.word_t || L;
    const f = Math.round(t * 30);
    const lv = [], halo = [], state = [], scale = [];
    wt.forEach((w0, i) => {
      let a = 1, h = 1, s = 'lit', sc = 1;
      if (V2.PREVIEW || mode === 'lit') { /* lit */ }
      else if (mode === 'poster') {
        const fr = V2.frame(t);
        if (fr >= 1796) { a = FLICK[fr - 1796]; s = 'ignite'; }
        const k = f - Math.round(w0 * 30);
        // (final pass) a visible pop on each onset: halo 1.9x -> 1.15x and a 7% scale pop, both decaying over 4 frames
        // (a +25% halo measured +0.001 luma: no word sync could be seen). Frames 0..3 have no onset: the poster holds.
        if (k >= 0 && k < 4) { h = POP_H[k]; sc = POP_S[k]; s = 'pulse'; }
      } else if (mode === 'prelit-blaze') {
        const k = f - Math.round((w0 - (o.lead || 0)) * 30);
        if (k < 0) { a = o.pre ?? 0.55; h = a; s = 'prelit'; }
        else if (k < 4) { a = 1; h = 1.3 - 0.3 * (k / 4); s = 'blaze'; }
      } else {
        const k = f - Math.round((w0 - 0.06 - (o.lead || 0)) * 30);
        if (k < 0) { a = 0; h = 0; s = 'unlit'; }
        else if (k < 4) { a = FLICK[k]; h = a; s = 'ignite'; }
      }
      lv.push(a); halo.push(h); state.push(s); scale.push(sc);
    });
    lv.halo = halo; lv.state = state; lv.scale = scale;
    return lv;
  };

  // URL flags (read once): ?preview=1 lights every line (lookdev stills only), ?label=1 draws scene labels
  try {
    const q = new URLSearchParams(location.search);
    V2.PREVIEW = q.get('preview') === '1';
    V2.LABEL = q.get('label') === '1';
    V2.QUERY = q;
    V2.DEV = q.get('dev') !== '0';          // warn-once dev checks (uniform typos, calm overflow, osc / boil cadence)
  } catch (e) { V2.PREVIEW = false; V2.LABEL = false; V2.DEV = true; }
})();
