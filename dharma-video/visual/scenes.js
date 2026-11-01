// Scene dispatcher. Scene files call SCN.add(t0, t1, name, fn). Exactly one scene draws per frame:
// the one whose [t0, t1) contains t. Each scene draws its own background.
(function () {
  const list = [];
  window.SCN = {
    add(t0, t1, name, fn) { list.push({ t0, t1, name, fn }); list.sort((a, b) => a.t0 - b.t0); },
    list,
  };
  window.DRAW = function (t) {
    const E = window.ENGINE;
    const ctx = E.ctx;
    t = ((t % 60) + 60) % 60;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.filter = 'none';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, E.W, E.H);
    const s = list.find(s => t >= s.t0 && t < s.t1);
    if (s) {
      ctx.save();
      s.fn(t, t - s.t0);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ff00ff'; ctx.fillRect(0, 0, E.W, E.H);
      ctx.fillStyle = '#000'; ctx.font = '60px "JBM"'; ctx.fillText('NO SCENE ' + t.toFixed(2), 100, 600);
    }
    ctx.restore();
    // watermark (let go on "don't control", returns with the regrab)
    const wm = window.WATERMARK ? window.WATERMARK(t) : { color: 'rgba(255,246,224,0.45)' };
    if (wm) {
      ctx.save();
      ctx.font = '500 28px "JBM"'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillStyle = wm.color; ctx.fillText('pawel.world', 1000, 78);
      ctx.restore();
    }
    // global finishing: grain (scenes may override via window.GRAIN_AMT)
    C.finish(t, window.GRAIN_AMT_FN ? window.GRAIN_AMT_FN(t) : 0.03);
  };
})();
