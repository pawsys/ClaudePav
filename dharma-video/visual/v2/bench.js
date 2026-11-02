// Pipeline-faithful timing (copy of lookdev/glass/bench.js, pointed at v2): wall time of evaluate(renderFrame) + JPEG
// screenshot, exactly what render.js pays per frame. Median of N consecutive frames starting at each time.
// usage (from visual/): node v2/bench.js [--page v2/index.html] [--times 0,12.5,...] [--regrab] [--n 8] [--out file.json]
//   --regrab adds the regrab frames the act 3 gate must include: 59.25 59.267 59.3 59.333 59.367 59.4 59.6 59.7 (each
//   timed as a run of consecutive frames, like a render worker; the first frame of the run pays the frozen under-scene)
// Each time is warmed with the two frames before it (T - 2/30, T - 1/30), so caches are what a sequential worker has.
// Times whose scene is still a core stub are labelled "stub" and the mean is also given without them.
// Note the machine load (printed): raw timings swing up to 2x when another Chromium is rendering.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => { if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return a; }, []));
const URL = 'file://' + path.resolve(__dirname, '..', args.page || 'v2/index.html');
const times = String(args.times || '0,12.5,22.2,26.5,36.6,46.5,57').split(',').map(Number).concat(args.regrab ? [59.25, 59.267, 59.3, 59.333, 59.367, 59.4, 59.6, 59.7] : []);
const N = +(args.n || 8);
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
(async () => {
  const load0 = os.loadavg();
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  p.on('pageerror', e => console.log('[pageerror]', e.message));
  await p.goto(URL); await p.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  await p.evaluate(() => { window._blank = () => { const c = document.getElementById('c').getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, 1080, 1350); }; });
  const base = [];
  for (let i = 0; i < 6; i++) { const t0 = Date.now(); await p.evaluate(() => window._blank()); await p.screenshot({ type: 'jpeg', quality: 95 }); base.push(Date.now() - t0); }
  const out = { page: args.page || 'v2/index.html', blank: med(base), frames: {}, max: {} };
  out.scene = {};
  for (const T of times) {
    out.scene[T] = await p.evaluate(t => (V2.sceneAt(t) || {}).name || '', T);
    for (const w of [T - 2 / 30, T - 1 / 30]) { await p.evaluate(t => window.renderFrame(t), (w + 60) % 60); await p.screenshot({ type: 'jpeg', quality: 95 }); }
    const r = [];
    for (let i = 0; i < N; i++) {
      const t0 = Date.now();
      await p.evaluate(t => window.renderFrame(t), T + i / 30);
      await p.screenshot({ type: 'jpeg', quality: 95 });
      r.push(Date.now() - t0);
    }
    out.frames[T] = med(r); out.max[T] = Math.max(...r);
    console.log('t=' + T, 'median ms/frame', med(r), 'min', Math.min(...r), 'max', Math.max(...r), /stub/.test(out.scene[T]) ? '(stub: ' + out.scene[T] + ')' : out.scene[T]);
  }
  const v = Object.values(out.frames);
  out.mean = Math.round(v.reduce((a, c) => a + c, 0) / v.length);
  const real = times.filter(T => !/stub/.test(out.scene[T])).map(T => out.frames[T]);
  out.meanNoStubs = real.length ? Math.round(real.reduce((a, c) => a + c, 0) / real.length) : null;
  out.stubTimes = times.filter(T => /stub/.test(out.scene[T]));
  out.worst = Math.max(...Object.values(out.max));
  out.load = { before: load0.map(x => +x.toFixed(2)), after: os.loadavg().map(x => +x.toFixed(2)), cpus: os.cpus().length };
  // gate (LOOK 5.4): mean <= 480 ms, any frame <= 800 ms (the 59.25..59.9 double pass <= 900 ms). Under load the
  // numbers swing up to 2x: read the load figures before calling a fail.
  const cap = T => (T >= 59.25 && T < 59.9) ? 900 : 800;
  out.gate = { meanLimit: 480, meanPass: out.mean <= 480, frames: Object.fromEntries(times.map(T => [T, { median: out.frames[T], max: out.max[T], limit: cap(T), pass: out.max[T] <= cap(T) }])) };
  out.pass = out.gate.meanPass && Object.values(out.gate.frames).every(f => f.pass);
  times.forEach(T => { const g = out.gate.frames[T]; if (!g.pass) console.log(`  t=${T}: max ${g.max} ms > ${g.limit} ms`); });
  if (out.stubTimes.length) console.log(`(${out.stubTimes.length} of ${times.length} times are core stubs; mean without them ${out.meanNoStubs} ms)`);
  console.log(`mean ${out.mean} ms (<= 480) ${out.gate.meanPass ? 'ok' : 'FAIL'}; worst ${out.worst} ms; load ${out.load.before.join('/')} -> ${out.load.after.join('/')}  ->  ${out.pass ? 'PASS' : 'FAIL'}`);
  console.log(JSON.stringify(out));
  if (args.out) fs.writeFileSync(path.resolve(args.out), JSON.stringify(out, null, 1));
  await b.close();
})();
