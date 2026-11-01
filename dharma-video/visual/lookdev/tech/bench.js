// Bench for the technique page. usage (from visual/): node lookdev/tech/bench.js [--only 0,3] [--par 4] [--out ../out/lookdev/tech/bench.json]
// A) pipeline-faithful: fresh page, no in-page sync, wall time of evaluate(renderFrame)+jpeg screenshot (what render.js pays per frame)
// B) in-page synced time + per-stage marks + micro-benchmarks (separate browser so readbacks can't change A)
// C) contention: N browsers in parallel rendering the same technique (render.js --workers N situation)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => { if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return a; }, []));
const URL = 'file://' + path.resolve(__dirname, 'index.html') + (args.cpu ? '?cpu=1' : '');
const LAUNCH = { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
const med = a => { const s = [...a].sort((x, y) => x - y); return +s[Math.floor(s.length / 2)].toFixed(0); };
async function open(b) {
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  p.on('pageerror', e => console.log('[pageerror]', e.message));
  await p.goto(URL); await p.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  await p.evaluate(() => { window.NO_LABEL = true; });
  return p;
}
async function pipe(p, k, scale, n = 6) {
  await p.evaluate(s => { LX.scale = s; }, scale);
  for (let i = 0; i < 2; i++) { await p.evaluate(t => window.renderFrame(t), k + 0.3 + i * 0.01); await p.screenshot({ type: 'jpeg', quality: 95 }); }
  const r = [], ev = [];
  for (let i = 0; i < n; i++) {
    const t0 = Date.now();
    await p.evaluate(t => window.renderFrame(t), k + i / 30 / 8);
    const t1 = Date.now();
    await p.screenshot({ type: 'jpeg', quality: 95 });
    r.push(Date.now() - t0); ev.push(t1 - t0);
  }
  return { total: med(r), evaluate: med(ev) };
}
(async () => {
  const out = path.resolve(process.cwd(), args.out || '../out/lookdev/tech/bench.json');
  const nT = await (async () => { const b = await chromium.launch(LAUNCH); const p = await open(b); const n = await p.evaluate(() => TECH.length); await b.close(); return n; })();
  const only = args.only ? String(args.only).split(',').map(Number) : [...Array(nT).keys()];
  const res = { techniques: {}, micro: null, contention: null };
  // A
  {
    const b = await chromium.launch(LAUNCH); const p = await open(b);
    await p.evaluate(() => { window.NO_SYNC = true; });
    res.baseline_blank_frame = await pipe(p, 99, 1);
    for (const k of only) {
      const info = await p.evaluate(k => ({ name: TECH[k].name, gl: !!TECH[k].gl, scalable: !!TECH[k].scalable }), k);
      const e = res.techniques[k] = { name: info.name, pipeline: {} };
      for (const s of (info.scalable ? [1, 0.5] : [1])) e.pipeline['scale' + s] = await pipe(p, k, s);
      console.log(k, info.name, JSON.stringify(e.pipeline));
    }
    await b.close();
  }
  // A2: micro ops, pipeline-faithful
  if (!args.only || args.micro) {
    const b = await chromium.launch(LAUNCH); const p = await open(b);
    await p.evaluate(() => { window.NO_SYNC = true; });
    const n = await p.evaluate(() => MICRO_OPS.length);
    res.micro_pipeline = {};
    let base = null;
    for (let i = 0; i < n; i++) {
      const name = await p.evaluate(i => MICRO_OPS[i][0], i);
      const r = await pipe(p, 100 + i, 1, 6);
      if (i === 0) base = r.total;
      res.micro_pipeline[name] = { total: r.total, net: r.total - base };
      console.log('micro', name, r.total, r.total - base);
    }
    await b.close();
  }
  // B
  {
    const b = await chromium.launch(LAUNCH); const p = await open(b);
    for (const k of only) {
      const scales = Object.keys(res.techniques[k].pipeline).map(s => +s.slice(5));
      res.techniques[k].insync = {};
      for (const s of scales) {
        const r = await p.evaluate(([k, s]) => { LX.scale = s; LX.profile = false; const a = []; window.renderFrame(k + .3); for (let i = 0; i < 5; i++) a.push(window.renderFrame(k + i / 240)); LX.profile = true; window.renderFrame(k + .1); LX.profile = false; a.sort((x, y) => x - y); return { ms: +a[2].toFixed(0), marks: window.LAST_MARKS }; }, [k, s]);
        res.techniques[k].insync['scale' + s] = r;
      }
      console.log(k, JSON.stringify(res.techniques[k].insync));
    }
    if (args.insyncmicro) { res.micro_insync = await p.evaluate(() => MICRO()); console.log(JSON.stringify(res.micro_insync, null, 1)); }
    await b.close();
  }
  // C
  if (args.par) {
    const N = +args.par, k = +(args.park || 11), s = +(args.pars || 1);
    const bs = await Promise.all([...Array(N)].map(() => chromium.launch(LAUNCH)));
    const ps = await Promise.all(bs.map(open));
    const rs = await Promise.all(ps.map(p => pipe(p, k, s, 8)));
    res.contention = { workers: N, technique: k, scale: s, per_worker: rs };
    console.log('contention', JSON.stringify(res.contention));
    await Promise.all(bs.map(b => b.close()));
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  let prev = {}; try { prev = JSON.parse(fs.readFileSync(out)); } catch (e) {}
  if (args.only) { prev.techniques = Object.assign(prev.techniques || {}, res.techniques); if (res.contention) prev.contention = res.contention; fs.writeFileSync(out, JSON.stringify(prev, null, 1)); }
  else fs.writeFileSync(out, JSON.stringify(res, null, 1));
  console.log('wrote', out);
})();
