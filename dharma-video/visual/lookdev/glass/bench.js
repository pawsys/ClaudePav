// Pipeline-faithful timing for the glass lookdev page: wall time of evaluate(renderFrame) + JPEG screenshot
// (what render.js pays per frame), median of N consecutive frames starting at each style-frame time.
// usage (from visual/): node lookdev/glass/bench.js [--times 0,12.5,...] [--n 8]
const { chromium } = require('playwright');
const path = require('path');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => { if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return a; }, []));
const URL = 'file://' + path.resolve(__dirname, 'index.html');
const times = String(args.times || '0,12.5,22.2,26.5,36.6,46.5,57').split(',').map(Number);
const N = +(args.n || 8);
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  p.on('pageerror', e => console.log('[pageerror]', e.message));
  await p.goto(URL); await p.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  // blank baseline
  await p.evaluate(() => { window._blank = () => { const c = ENGINE.ctx; c.fillStyle = '#000'; c.fillRect(0, 0, 1080, 1350); }; });
  const base = [];
  for (let i = 0; i < 6; i++) { const t0 = Date.now(); await p.evaluate(() => window._blank()); await p.screenshot({ type: 'jpeg', quality: 95 }); base.push(Date.now() - t0); }
  const out = { blank: med(base), frames: {} };
  for (const T of times) {
    for (let i = 0; i < 2; i++) { await p.evaluate(t => window.renderFrame(t), T); await p.screenshot({ type: 'jpeg', quality: 95 }); }
    const r = [];
    for (let i = 0; i < N; i++) {
      const t0 = Date.now();
      await p.evaluate(t => window.renderFrame(t), T + i / 30);
      await p.screenshot({ type: 'jpeg', quality: 95 });
      r.push(Date.now() - t0);
    }
    out.frames[T] = med(r);
    console.log('t=' + T, 'median ms/frame', med(r), 'min', Math.min(...r), 'max', Math.max(...r));
  }
  const v = Object.values(out.frames);
  out.mean = Math.round(v.reduce((a, b) => a + b, 0) / v.length);
  console.log(JSON.stringify(out));
  await b.close();
})();
