// Pipeline-faithful timing for the pool lookdev page: wall time of evaluate(renderFrame) + JPEG screenshot,
// exactly what render.js pays per frame. usage (from visual/): node lookdev/pool/bench.js [--times 0,12.5,...] [--n 6]
const { chromium } = require('playwright');
const path = require('path');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => { if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return a; }, []));
const URL = 'file://' + path.resolve(__dirname, 'index.html') + (args.q ? '?' + args.q : '');
const times = String(args.times || '0,12.5,22.2,26.5,36.6,46.5,57').split(',').map(Number);
const N = +(args.n || 6);
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  p.on('pageerror', e => console.log('[pageerror]', e.message));
  await p.goto(URL); await p.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  const out = {};
  for (const t of times) {
    for (let i = 0; i < 2; i++) { await p.evaluate(t => window.renderFrame(t), t); await p.screenshot({ type: 'jpeg', quality: 95 }); }
    const r = [];
    for (let i = 0; i < N; i++) {
      const t0 = Date.now();
      await p.evaluate(t => window.renderFrame(t), t + i / 30);
      await p.screenshot({ type: 'jpeg', quality: 95 });
      r.push(Date.now() - t0);
    }
    out[t] = med(r);
    console.log(`t=${t}: median ${out[t]} ms (min ${Math.min(...r)}, max ${Math.max(...r)})`);
  }
  // calibration against the tech research reference (measured clean: blank 97-99 ms, slot 11 half-res hero 340 ms)
  if (!args.nocal) {
    const q = await b.newPage({ viewport: { width: 1080, height: 1350 } });
    await q.goto('file://' + path.resolve(__dirname, '../tech/index.html') + '?scale=0.5'); await q.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
    await q.evaluate(() => { window.NO_LABEL = true; window.NO_SYNC = true; });
    const cal = async (k) => { const r = []; for (let i = 0; i < N + 2; i++) { const t0 = Date.now(); await q.evaluate(t => window.renderFrame(t), k + 0.3 + i * 0.01); await q.screenshot({ type: 'jpeg', quality: 95 }); if (i >= 2) r.push(Date.now() - t0); } return med(r); };
    const blank = await cal(99), hero = await cal(11);
    out.cal = { blank, techHero: hero, factor: +(hero / 340).toFixed(2) };
    console.log(`calibration: blank ${blank} ms (clean 98), tech hero slot 11 ${hero} ms (clean 340) -> machine factor ${out.cal.factor}`);
  }
  const v = Object.values(out).filter(x => typeof x === 'number');
  const mean = Math.round(v.reduce((a, b) => a + b, 0) / v.length);
  console.log('mean of medians', mean, 'ms; max', Math.max(...v), 'ms');
  if (out.cal) console.log('clean-machine estimate (divide by factor): mean', Math.round(mean / out.cal.factor), 'ms; max', Math.round(Math.max(...v) / out.cal.factor), 'ms');
  console.log(JSON.stringify(out));
  await b.close();
})();
