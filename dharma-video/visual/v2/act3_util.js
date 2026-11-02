// ACT 3 helpers (shared by act3_drop.js, act3_lap.js, act3_rest.js). Namespace window.a3_NS. Pure functions of t.
(function () {
  const V2 = window.V2, U = V2.U;
  const { clamp, lerp, hash, TAU } = U;
  const NS = window.a3_NS = window.a3_NS || {};
  NS.R = (t, a, b) => clamp((t - a) / (b - a));
  NS.dbg = () => window.a3_DBG || {};   // dev-only profiling switches (noGL, noType, noLines, noGrab); never set in shipped code
  NS.E = {
    smooth: U.smooth, smoother: U.smoother, outCubic: U.outCubic, inCubic: U.inCubic, inOutCubic: U.inOutCubic, outExpo: U.outExpo,
    inOutSine: U.inOutSine, outBack: U.outBack,
    outQuad: x => { x = clamp(x); return 1 - (1 - x) * (1 - x); },
  };
  NS.lin = V2.lin;
  // a beat click: 0 at the beat, eases to 1 over `dur` s (the rest of the beat holds)
  NS.click = (t, dur = 0.1) => { const b = V2.beat(t); return b.i + U.smooth(clamp(b.ph * 0.75 / dur)); };
  // world -> screen camera {k, ox, oy}: screen = world * k + o
  NS.cam = (k, wx, wy, sx, sy) => ({ k, ox: sx - wx * k, oy: sy - wy * k });
  NS.toS = (c, p) => [p[0] * c.k + c.ox, p[1] * c.k + c.oy];
  NS.mat = c => [c.k, 0, 0, c.k, c.ox, c.oy];
  // the pane transform for a camera (pane is 540x675, callers draw in 1080 units)
  NS.paneCam = (g, c) => g.setTransform(0.5 * c.k, 0, 0, 0.5 * c.k, 0.5 * c.ox, 0.5 * c.oy);
  // snap a number for a cache key
  NS.snap = (x, q = 512) => Math.round(x * q) / q;

  // mono readout with a dark outline (reads on light and dark grounds alike); o: {size, weight, col, outline, a, align, t0, cps, cursor}
  NS.monoOutlined = function (ctx, t, text, x, y, o = {}) {
    const size = Math.max(36, o.size ?? 40), A = o.a ?? 1;
    if (A <= 0) return null;
    const n = o.t0 === undefined ? text.length : Math.min(text.length, Math.floor((t - o.t0) * (o.cps ?? 40) + 1e-6));
    if (n <= 0 && !o.cursor) return null;
    const s = Array.from(text).slice(0, Math.max(0, n)).join('');
    const f = `${o.weight || '600'} ${size}px "JBM"`;
    ctx.save(); ctx.font = f; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    const full = ctx.measureText(text).width, wNow = ctx.measureText(s).width;
    const x0 = o.align === 'right' ? x - full : o.align === 'center' ? x - full / 2 : x;
    const yb = y + size * 0.30;
    if (o.pane && wNow > 0) { const pw = Math.min(full, Math.ceil(wNow / 48) * 48); ctx.restore(); V2.shade(ctx, [x0 - size * 0.7, yb - size * 1.45, x0 + pw + size * 0.7, yb + size * 0.9], o.pane, (o.paneA ?? 0.6) * A, { feather: 44, r: 28 }); ctx.save(); ctx.font = f; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; }
    ctx.globalAlpha = A * (o.outlineA ?? 0.9); ctx.strokeStyle = o.outline || '#0B1F5C'; ctx.lineWidth = size * 0.22; ctx.strokeText(s, x0, yb);
    ctx.globalAlpha = A; ctx.fillStyle = o.col || '#FFFFFF'; ctx.fillText(s, x0, yb);
    if (o.cursor && o.t0 !== undefined) {
      const since = (t - o.t0) - text.length / (o.cps ?? 40);
      const on = since < 0 || (since < 1.2 && Math.floor(since / 0.25) % 2 === 0);
      if (on) { ctx.globalAlpha = A * 0.9; ctx.fillRect(x0 + wNow + size * 0.08, yb - size * 0.74, size * 0.52, size * 0.86); }
    }
    if (V2.QA && V2.QA.on && s.length) V2.QA.words.push({ w: s, box: [x0, yb - size * 0.78, x0 + wNow, yb + size * 0.24], core: o.col || '#FFFFFF', a: A, size, mono: true });
    ctx.restore();
    return [x0, yb - size * 0.78, x0 + full, yb + size * 0.24];
  };

  // a cached word sprite drawn with fillText (core) + a quarter-res halo sprite into the glow queue (no shadowBlur)
  const wordCache = new Map();
  NS.wordSprite = function (text, font, core, halo, o = {}) {
    const key = text + '|' + font + '|' + core + '|' + halo + '|' + (o.haloW || 0) + '|' + (o.haloFill ?? 1);
    let c = wordCache.get(key);
    if (c) return c;
    const mc = document.createElement('canvas').getContext('2d'); mc.font = font;
    const m = mc.measureText(text), size = o.size || 100;
    const pad = Math.ceil(size * 0.45), w = Math.ceil(m.width + 2 * pad + size * 0.3), h = Math.ceil(size * 1.6 + 2 * pad);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d'); g.font = font; g.textBaseline = 'alphabetic'; g.fillStyle = core; g.fillText(text, pad, pad + size * 1.1);
    const k = 0.25, hv = document.createElement('canvas'); hv.width = Math.ceil(w * k); hv.height = Math.ceil(h * k);
    const hg = hv.getContext('2d'); hg.scale(k, k); hg.font = font; hg.textBaseline = 'alphabetic'; hg.lineJoin = 'round';
    hg.fillStyle = halo; hg.strokeStyle = halo; hg.globalAlpha = o.haloFill ?? 1; hg.fillText(text, pad, pad + size * 1.1);
    hg.globalAlpha = 1; hg.lineWidth = size * (o.haloW ?? 0.12); hg.strokeText(text, pad, pad + size * 1.1);
    c = { cv, hv, w, h, dx: -pad, dy: -(pad + size * 1.1), width: m.width };
    wordCache.set(key, c); if (wordCache.size > 40) wordCache.delete(wordCache.keys().next().value);
    return c;
  };
  // draw a word sprite with its baseline-left at (x, y)
  NS.putWord = function (ctx, sp, x, y, a = 1, haloA = 1) {
    if (a <= 0) return;
    if (haloA > 0) V2.glow(g => { g.globalAlpha = Math.min(1, haloA * a); g.drawImage(sp.hv, x + sp.dx, y + sp.dy, sp.w, sp.h); });
    ctx.save(); ctx.globalAlpha = a; ctx.drawImage(sp.cv, Math.round(x + sp.dx), Math.round(y + sp.dy)); ctx.restore();
  };

  // a tiny ray glint (4 to 6 tapered rays from a point): a SPARK that lives for a while (twinkle 0..1)
  NS.glint = function (ctx, x, y, r, a, o = {}) {
    if (a <= 0.01) return;
    const n = o.n || 4, rot = o.rot || 0;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = o.col || '#FFFFFF'; ctx.globalAlpha = a;
    for (let i = 0; i < n; i++) {
      const an = rot + i / n * TAU, L = r * (i % 2 ? 0.55 : 1);
      ctx.fill(V2.fx.brush([[x, y], [x + Math.cos(an) * L * 0.5, y + Math.sin(an) * L * 0.5], [x + Math.cos(an) * L, y + Math.sin(an) * L]], o.w || 3, { taper: [0.15, 0.9, 0.7, 0.0] }));
    }
    ctx.restore();
    if (o.halo) V2.glow(g => { g.globalAlpha = a * 0.7; g.fillStyle = o.halo; g.beginPath(); g.arc(x, y, r * 0.45, 0, TAU); g.fill(); });
  };

  // a loop-free deterministic jitter in [-1, 1]
  NS.jit = (s) => hash(s) * 2 - 1;
})();
