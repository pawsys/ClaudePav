// V2 core: sequencer. Scene registry, the per-frame driver, watermark, debug labels.
//   V2.add(t0, t1, name, fn)  fn(t, ctx, scene) draws one frame; t in [t0, t1) of the 60 s loop.
//   V2.draw(t)                renderFrame(t): resets state, runs the scene, flushes the glow, the post queue (faces),
//                             draws the watermark. Pure function of t.
(function () {
  const V2 = window.V2;
  const { clamp } = V2.U;
  const SC = V2.scenes = [];

  // act windows (LOOK 5.6): a registration outside its act's window, or overlapping another act's scene, warns
  const ACTS = { a1: [0, 18], a2: [18, 36], a3: [36, 60] };
  let seqNo = 0;
  V2.add = function (t0, t1, name, fn) {
    const pre = (name || '').slice(0, 2), win = ACTS[pre];
    if (win && (t0 < win[0] - 1e-6 || t1 > win[1] + 1e-6)) console.warn(`V2.add: ${name} [${t0}, ${t1}) is outside act window ${pre} [${win[0]}, ${win[1]})`);
    for (const o of SC) if (o.name.slice(0, 2) !== pre && t0 < o.t1 && o.t0 < t1 && ACTS[o.name.slice(0, 2)]) console.warn(`V2.add: ${name} [${t0}, ${t1}) overlaps ${o.name} [${o.t0}, ${o.t1}) of another act`);
    SC.push({ t0, t1, name, fn, seq: seqNo++ });
    SC.sort((a, b) => a.t0 - b.t0 || a.seq - b.seq);
  };
  // the scene at t: of all scenes whose window contains t, the most recently registered wins (so an act file that
  // re-registers a stub's window replaces it, whatever the t0 ordering)
  V2.sceneAt = function (t) {
    t = V2.wrap(t);
    let best = null;
    for (const s of SC) if (t >= s.t0 && t < s.t1 && (!best || s.seq > best.seq)) best = s;
    return best;
  };

  // ------------------------------------------------------------------ watermark (LOOK 2.11)
  // 'pawel.world', JBM 600 30 px, right-aligned at (1000, 78). Pearl at 45% on dark grounds, #0B2A7A at 70% on the
  // light grounds. Lets go on "don't control." (fades 52.5 to 53.0) and returns at 54.0. Present on both sides of the seam.
  // (integration, A3-6) headless dropped: its head-space top is deep blue, so the pearl style reads there
  const LIGHT = { sky: 1, arrows: 1, hack: 1 };
  V2.watermarkStyle = function (t) {
    const sec = V2.section(t);
    let a = 1;
    if (t >= 52.5 && t < 54.0) a = clamp(1 - (t - 52.5) / 0.5);
    return LIGHT[sec] ? { col: '#0B2A7A', a: 0.70 * a } : { col: '#F4EFD8', a: 0.45 * a };
  };
  V2.watermark = function (ctx, t) {
    const st = V2.watermarkOverride ? V2.watermarkOverride(t) : V2.watermarkStyle(t);
    if (!st || st.a <= 0) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = st.a;
    ctx.font = '600 30px "JBM"'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = st.col;
    ctx.fillText('pawel.world', 1000, 78);
    ctx.restore();
  };

  // ------------------------------------------------------------------ debug label (?label=1)
  V2.label = function (ctx, t, text) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(10,6,24,0.6)'; ctx.fillRect(0, 1290, 1080, 60);
    ctx.fillStyle = '#FFFFFF'; ctx.font = '600 28px "JBM"'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(text, 24, 1320);
    ctx.restore();
  };

  // ------------------------------------------------------------------ the frame
  V2.draw = function (t) {
    t = V2.wrap(t);
    V2.T = t;
    const ctx = V2.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    V2.glowJobs = []; V2.glowWideJobs = []; V2.postJobs = []; V2.camM = null;
    if (V2.QA) { V2.QA.words = []; V2.QA.panes = []; V2.QA.exclude = []; }   // exclude: non-word UI rects (A2-6)
    const sc = V2.sceneAt(t);
    if (!sc) { ctx.fillStyle = '#3A0F4A'; ctx.fillRect(0, 0, 1080, 1350); V2.label(ctx, t, 'no scene at ' + t.toFixed(3)); return; }
    ctx.save();
    sc.fn(t, ctx, sc);
    ctx.restore();
    V2.camera(ctx, null);
    V2.flushGlow(ctx);
    V2.flushPost(ctx);
    V2.watermark(ctx, t);
    if (V2.LABEL) V2.label(ctx, t, `${t.toFixed(3)}  f${V2.frame(t)}  ${sc.name}  [${V2.section(t)}]`);
  };

  // ------------------------------------------------------------------ boundary contracts between acts (LOOK 4, 5.6)
  // Read-only shared data (frozen at init): both builders on either side of a boundary code against these values.
  V2.BOUND = {
    // 18.0: a hard cut. Act 1 ends frozen in the tape-stop (jitter, boil, dashes stopped by V2.tapeWarp); act 2 starts
    // in the dark macro. They share only the knot's look (V2.grab.knot, V2.KNOT colours).
    t18: { t: 18.0, cut: true, knot: { look: 'V2.grab.knot', crust: '#140A2A', edge: ['#FF2E97', '#1FA352'] } },
    // 35.967 (frame 1079): the last frame of act 2. Act 3's 36.0 whiteout starts from exactly this.
    t36: { t: 35.967, char: [540, 860, 300], mood: 'happy', face: { eyes: 'happy', mouth: 'smile' }, arm: { ext: 0, open: 1, ang: -0.55 },
      orb: { r: 28, inPalm: true }, pal: 'arrows', blades: 0 },
    // 59.967 -> 0.0: the core hook rig on both sides (V2.hook.frame, V2.hook.K)
    t60: { t: 59.967, rig: 'V2.hook.frame' },
  };
  // ------------------------------------------------------------------ init (called by index.html after fonts)
  V2.init = function () {
    ENGINE.init2d();
    V2.ctx = ENGINE.ctx;
    LX.ctx = V2.ctx;
    V2.L.init();
    // shared constants are read-only (one act mutating them would leak into every later frame)
    const deep = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deep); } return o; };
    deep(V2.PAL); deep(V2.hook.K); deep(V2.hook.RAYS); deep(V2.KNOT); deep(V2.BOUND); deep(V2.window.COLS); deep(V2.window.NIGHT); deep(V2.grab.MOODS); deep(V2.grab.STATES); deep(V2.window.PRESETS);
    // warm the sprite / font / program caches with frame 0 (render workers pay the first-use cost before READY)
    // and with a regrab frame: the frozen under-scene (V2.hook.underImage) is built here, before READY, so no worker pays
    // it inside a frame
    try { V2.draw(0); V2.draw(59.3); } catch (e) { console.warn('V2.init warm-up frame failed: ' + e.message); }
    const c = V2.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 1080, 1350);
  };
})();
// stub label for placeholder scenes (small, bottom-left; kept out of the watermark and caption zones)
(function () {
  V2.stubLabel = function (ctx, t, a, b) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 0.8; ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 30px "JBM"'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillText(a, 48, 1180);
    ctx.font = '500 26px "JBM"'; ctx.globalAlpha = 0.6; ctx.fillText((b || '') + '  t=' + t.toFixed(2), 48, 1218);
    ctx.restore();
  };
  // generic program for stubs and the core test page: pane + window + calm (one program, shared)
  V2.L.program('core_stub_window', ['PANE', 'WINDOW'], `
void main(){ vec2 P=canvasPx(vUv); vec3 c=pane(P); c=windowLight(P,c); o=vec4(c,1.); }`);
})();
