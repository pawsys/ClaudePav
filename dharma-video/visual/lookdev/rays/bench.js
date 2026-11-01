// Pipeline-faithful timing for the rays lookdev (same cost model as render.js: evaluate(renderFrame) + JPEG screenshot).
// usage: node lookdev/rays/bench.js [--times 0,12.5,...] [--reps 6]
const { chromium } = require('playwright');
const path = require('path');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => { if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1]]); return a; }, []));
const times = (args.times || '0,12.5,22.2,26.5,36.6,46.5,57').split(',').map(Number);
const reps = +(args.reps || 6);
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.goto('file://' + path.resolve(__dirname, 'index.html') + (args.q ? '?' + args.q : ''));
  await p.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  const out = {};
  for (const t of times) {
    const ms = [];
    for (let k = 0; k < reps + 2; k++) {
      const tt = t + k / 30;                       // consecutive frames, like a real render
      const t0 = Date.now();
      await p.evaluate(x => window.renderFrame(x), tt);
      await p.screenshot({ type: 'jpeg', quality: 95 });
      if (k >= 2) ms.push(Date.now() - t0);
    }
    ms.sort((a, b) => a - b);
    out[t] = ms[ms.length >> 1];
  }
  // blank capture floor
  await p.evaluate(() => { const c = document.getElementById('c').getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, 1080, 1350); });
  const fl = []; for (let k = 0; k < 5; k++) { const t0 = Date.now(); await p.screenshot({ type: 'jpeg', quality: 95 }); fl.push(Date.now() - t0); }
  fl.sort((a, b) => a - b);
  console.log(JSON.stringify({ ms_per_frame: out, capture_floor_ms: fl[2], mean: Math.round(Object.values(out).reduce((a, b) => a + b, 0) / times.length) }));
  await browser.close();
})();
