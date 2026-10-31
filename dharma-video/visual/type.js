// Kinetic typography system.
// A "caption" = { t0, t1, lines: [[{w, t, emph}]], style, x, y, size, color, align }
// Words appear at their own time t (seconds), with style-dependent entrance.
(function () {
  const E = window.ENGINE;

  const STYLES = {
    // elegant serif, words rise + unblur
    serif: { fam: 'Instrument Serif', weight: '400', style: 'normal', emphFam: 'Instrument Serif', emphStyle: 'italic', size: 96, lead: 1.05, color: '#ffffff', shadow: 'rgba(20,20,40,0.35)', enter: 0.45, exit: 0.4, rise: 26, blur: 14, spacing: 0, upper: false },
    // punchy meme captions (reference video energy)
    punch: { fam: 'Anton', weight: '400', style: 'normal', emphFam: 'Anton', emphStyle: 'normal', size: 120, lead: 1.0, color: '#FFE45C', emphColor: '#ffffff', stroke: '#141018', strokeW: 10, shadow: 'rgba(0,0,0,0.35)', enter: 0.16, exit: 0.2, rise: 0, blur: 0, pop: 0.35, spacing: 2, upper: true },
    // quiet whisper caption
    whisper: { fam: 'Space Grotesk', weight: '500', style: 'normal', emphFam: 'Space Grotesk', emphStyle: 'normal', size: 40, lead: 1.25, color: 'rgba(255,255,255,0.92)', shadow: 'rgba(0,0,0,0.25)', enter: 0.5, exit: 0.5, rise: 10, blur: 8, spacing: 3, upper: false },
    // big italic serif for sung hook
    hook: { fam: 'Instrument Serif', weight: '400', style: 'italic', emphFam: 'Instrument Serif', emphStyle: 'italic', size: 150, lead: 0.95, color: '#ffffff', shadow: 'rgba(30,30,60,0.35)', enter: 0.7, exit: 0.6, rise: 30, blur: 22, spacing: -1, upper: false },
    // mono label (terminal-ish, nerdy TPOT)
    mono: { fam: 'Space Grotesk', weight: '700', style: 'normal', emphFam: 'Space Grotesk', emphStyle: 'normal', size: 44, lead: 1.2, color: '#ffffff', shadow: null, enter: 0.05, exit: 0.15, rise: 0, blur: 0, spacing: 4, upper: true, typewriter: true },
  };

  function drawCaption(t, cap) {
    if (t < cap.t0 - 0.01 || t > cap.t1 + 1.0) return;
    const S = Object.assign({}, STYLES[cap.style || 'serif'], cap.overrides || {});
    const ctx = E.ctx;
    const size = cap.size || S.size;
    const lead = size * S.lead;
    const lines = cap.lines;
    const x = cap.x ?? E.W / 2;
    const y0 = (cap.y ?? E.H / 2) - (lines.length - 1) * lead / 2;
    const exitA = 1 - E.smooth(E.range(t, cap.t1, cap.t1 + S.exit));
    if (exitA <= 0) return;
    ctx.save();
    ctx.textBaseline = 'middle';
    lines.forEach((line, li) => {
      // measure line
      const fonts = line.map(wd => E.font(size * (wd.scale || 1), wd.emph ? S.emphFam : S.fam, S.weight, wd.emph ? S.emphStyle : S.style));
      const texts = line.map(wd => S.upper ? wd.w.toUpperCase() : wd.w);
      ctx.font = fonts[0];
      const spaceW = ctx.measureText(' ').width * (S.upper ? 0.9 : 1);
      const widths = texts.map((tx, i) => E.measure(tx, fonts[i], S.spacing));
      const total = widths.reduce((a, b) => a + b, 0) + spaceW * (texts.length - 1);
      let cx = (cap.align === 'left') ? x : (cap.align === 'right' ? x - total : x - total / 2);
      const ly = y0 + li * lead;
      line.forEach((wd, i) => {
        const p = E.range(t, wd.t, wd.t + S.enter);
        if (p <= 0) { cx += widths[i] + spaceW; return; }
        const e = E.easeOutCubic(p);
        let a = e * exitA * (cap.alpha ?? 1);
        let sc = 1;
        if (S.pop) sc = 1 + S.pop * (1 - E.easeOutBack(p, 2.5)) * -1 + 0; // pop handled below
        if (S.pop) sc = E.lerp(1.0 + S.pop, 1.0, E.easeOutCubic(p));
        const dy = S.rise * (1 - e) + (1 - exitA) * -S.rise * 0.6;
        const bl = S.blur * (1 - e) + (1 - exitA) * S.blur * 0.8;
        ctx.save();
        ctx.globalAlpha = a;
        const wx = cx + widths[i] / 2, wy = ly + dy;
        ctx.translate(wx, wy);
        if (wd.rot) ctx.rotate(wd.rot);
        ctx.scale(sc, sc);
        ctx.font = fonts[i];
        if (bl > 0.3) ctx.filter = `blur(${bl.toFixed(1)}px)`;
        const col = wd.emph && S.emphColor ? S.emphColor : (wd.color || cap.color || S.color);
        drawSpaced(ctx, texts[i], -widths[i] / 2, 0, S, col, wd, t);
        ctx.restore();
        cx += widths[i] + spaceW;
      });
    });
    ctx.restore();
  }

  function drawSpaced(ctx, str, x, y, S, col, wd, t) {
    const chars = S.spacing ? [...str] : [str];
    let cx = x;
    for (const ch of chars) {
      const w = ctx.measureText(ch).width;
      if (S.shadow) { ctx.shadowColor = S.shadow; ctx.shadowBlur = 24; ctx.shadowOffsetY = 4; }
      if (S.stroke) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = S.strokeW;
        ctx.strokeStyle = S.stroke;
        ctx.strokeText(ch, cx, y);
        ctx.shadowColor = 'transparent';
      }
      ctx.fillStyle = col;
      ctx.fillText(ch, cx, y);
      ctx.shadowColor = 'transparent';
      cx += w + (S.spacing || 0);
    }
  }

  // Build caption from a string + word times. "|" splits lines, *word* = emphasis.
  function caption(text, times, opts = {}) {
    const rawLines = text.split('|').map(s => s.trim());
    let k = 0;
    const lines = rawLines.map(l => l.split(/\s+/).filter(Boolean).map(w => {
      const emph = /^\*.*\*$/.test(w);
      const word = emph ? w.slice(1, -1) : w;
      const tt = times[Math.min(k, times.length - 1)];
      k++;
      return { w: word, t: tt, emph };
    }));
    return Object.assign({ lines, t0: times[0], t1: opts.t1 ?? times[times.length - 1] + 1.5 }, opts);
  }

  window.TYPE = { STYLES, drawCaption, caption };
})();
