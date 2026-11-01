// Captions made of light. Word-synced through window.TIMING (visual/timing.js).
// - neon(): Anton caps as neon signs. Each word ignites at its onset with a real neon flicker
//   (1, .35, 1 over three frames). Words not yet spoken are visible as unlit glass tubes.
// - light(): italic serif written in light: warm core, coloured halo (via the shared glow pass),
//   optional dark-glass pane behind for contrast over bright fields.
(function () {
  const TY = {};
  const FPS = 30;

  // lit level per word: 0 before onset, flicker on ignition, 1 after
  TY.lit = function (t, word_t, opts = {}) {
    return word_t.map(w0 => {
      if (opts.allLit) return 1;
      const k = Math.floor((t - w0 + (opts.lead || 0)) * FPS + 1e-6);
      if (k < 0) return opts.pre ?? 0;
      if (k === 0) return 0.7;
      if (k === 2) return 0.45;
      return 1;
    });
  };
  TY.line = function (id) {
    const T = window.TIMING;
    return T.lines.find(l => l.id === id) || T.choir.find(l => l.id === id);
  };

  // lay out words over lines. spec: [{words:[..], size, y}], returns [{w,x,y,size,font,i}]
  TY.layout = function (ctx, spec, fontFn, cx = 540, spacing = 0.26) {
    const out = []; let i = 0;
    spec.forEach(L => {
      const f = fontFn(L.size);
      ctx.font = f;
      const sp = ctx.measureText(' ').width * (L.space ?? 1) + L.size * spacing * 0;
      const ws = L.words.map(w => ctx.measureText(w).width);
      const tot = ws.reduce((a, b) => a + b, 0) + sp * (L.words.length - 1);
      let x = (L.x ?? cx) - (L.align === 'left' ? 0 : tot / 2);
      L.words.forEach((w, k) => { out.push({ w, x, y: L.y, size: L.size, font: f, i: i++, width: ws[k] }); x += ws[k] + sp; });
    });
    return out;
  };
  // fit a font size so the widest line is <= maxW
  TY.fit = function (ctx, lines, fontFn, size, maxW) {
    ctx.font = fontFn(size);
    const w = Math.max(...lines.map(l => ctx.measureText(l).width));
    return w > maxW ? size * maxW / w : size;
  };

  // neon sign words. st: {core, halo, ghostA, ghostB, glass}
  TY.neon = function (ctx, words, lit, glowQ, st = {}) {
    if (window.DBG_NOTEXT) return;
    const core = st.core || '#fff6fb', halo = st.halo || '#ff3ea5';
    glowQ.push(g => {
      words.forEach(W => {
        const a = lit[W.i]; if (a <= 0) return;
        g.font = W.font; g.globalAlpha = a * (st.haloA ?? 1);
        g.fillStyle = halo; g.fillText(W.w, W.x, W.y);
        g.strokeStyle = halo; g.lineWidth = W.size * 0.08; g.strokeText(W.w, W.x, W.y);
      });
      g.globalAlpha = 1;
    });
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    words.forEach(W => {
      const a = lit[W.i];
      ctx.font = W.font;
      if (a < 1) { // unlit glass tube
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (1 - a) * (st.glassA ?? 0.5);
        ctx.strokeStyle = st.glass || '#b9a3ff'; ctx.lineWidth = Math.max(2, W.size * 0.02);
        ctx.strokeText(W.w, W.x, W.y);
      }
      if (a <= 0) return;
      const d = W.size * (st.split ?? 0.025);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a * 0.75;
      ctx.fillStyle = st.ghostA || '#3df5ff'; ctx.fillText(W.w, W.x - d, W.y + d * 0.3);
      ctx.fillStyle = st.ghostB || '#ff3ea5'; ctx.fillText(W.w, W.x + d, W.y - d * 0.3);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a;
      if (st.edge) { ctx.lineJoin = 'round'; ctx.strokeStyle = st.edge; ctx.lineWidth = W.size * 0.05; ctx.strokeText(W.w, W.x, W.y); }
      ctx.fillStyle = core; ctx.fillText(W.w, W.x, W.y);
    });
    ctx.restore();
  };

  // light-written serif words. st: {core, halo, pane:[colour, alpha], glass}
  TY.light = function (ctx, words, lit, glowQ, st = {}) {
    if (window.DBG_NOTEXT) return;
    const core = st.core || '#fff6e6', halo = st.halo || '#ff8fc0';
    glowQ.push(g => {
      words.forEach(W => {
        const a = lit[W.i]; if (a <= 0) return;
        g.font = W.font; g.globalAlpha = a * (st.haloA ?? 1);
        g.fillStyle = halo; g.fillText(W.w, W.x, W.y);
        g.strokeStyle = halo; g.lineWidth = W.size * 0.06; g.strokeText(W.w, W.x, W.y);
      });
      g.globalAlpha = 1;
    });
    ctx.save();
    words.forEach(W => {
      const a = lit[W.i];
      ctx.font = W.font;
      if (a < 1) {
        ctx.globalCompositeOperation = st.glassOp || 'lighter';
        ctx.globalAlpha = (1 - a) * (st.glassA ?? 0.55);
        ctx.strokeStyle = st.glass || '#ffd6ec'; ctx.lineWidth = Math.max(1.5, W.size * 0.012);
        ctx.strokeText(W.w, W.x, W.y);
        ctx.globalAlpha = (1 - a) * (st.glassFill ?? 0.1); ctx.fillStyle = st.glass || '#ffd6ec'; ctx.fillText(W.w, W.x, W.y);
      }
      if (a <= 0) return;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a;
      ctx.fillStyle = core; ctx.fillText(W.w, W.x, W.y);
    });
    ctx.restore();
  };
  // soft dark-glass pane (multiply) behind a caption block, coloured never grey
  TY.pane = function (ctx, x, y, rx, ry, col, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.translate(x, y); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, LX.rgba(col, alpha)); g.addColorStop(0.55, LX.rgba(col, alpha * 0.8)); g.addColorStop(1, LX.rgba(col, 0));
    ctx.fillStyle = g; ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx);
    ctx.restore();
  };
  window.TY = TY;
})();
