// Seam + determinism gate (LOOK.md 5.5.6, 5.7). Everything is measured on page.screenshot PNGs (the capture path
// render.js uses), decoded by check/imgdiff.py.
// SEAM: render 59.867, 59.900, 59.933, 59.967, 0.000, 0.033, 0.067 in order. PASS if meanAbsDiff(59.967 -> 0.000)
//   <= the true median of the other 5 consecutive pairs, <= max(0.000 -> 0.033, 0.033 -> 0.067) (the steady
//   state of the hook), and <= 6.0.
// DETERMINISM: every probe time is rendered in three histories: A after a far-away frame (t + 30), B sequentially
//   (t - 1/30 then t, what a render worker does), C after a frame of another act (t + 17). B and C must match A:
//   FAIL if any channel differs by more than 3 levels (raster noise measured at most 1 level; a stale sprite or pane
//   is far more). The count of differing pixels (over0) is reported too.
//   A second pass runs on core_test.html: the animated window (page 18: value and moonFall ramps, pane recipe) and the
//   frozen regrab under-scene (page 17), so the documented recipes are guarded even before the acts use them.
// usage (from visual/): node v2/check/seam.js [--page v2/index.html] [--out ../out/v2/core/seam] [--quick] [--times a,b,c]
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => { if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return a; }, []));
const page_url = 'file://' + path.resolve(__dirname, '..', '..', args.page || 'v2/index.html');
const outdir = path.resolve(__dirname, '..', '..', args.out || '../out/v2/core/seam');
const TIMES = [59.867, 59.900, 59.933, 59.967, 0.000, 0.033, 0.067];
// one probe per scene family + every act key still (LOOK 5.6)
const KEY = [0, 1.6, 2.4, 4.55, 5.4, 6.2, 7.5, 9.5, 11.2, 12.3, 12.6, 14.3, 16.6, 17.8, 18.2, 19.6, 21.8, 22.3, 23.0, 24.4, 26.5, 29.0, 31.95, 33.6,
  34.9, 35.7, 36.0, 36.2, 36.6, 38.7, 40.9, 44.5, 46.5, 47.3, 50.4, 52.6, 54.3, 55.0, 57.2, 59.4, 59.7, 59.967];
const PROBES = args.times ? String(args.times).split(',').map(Number) : (args.quick ? [0, 1.6, 12.6, 16.6, 54.3, 57.2, 59.4, 59.967] : KEY);
const diff = files => JSON.parse(execFileSync('python3', ['-I', path.join(__dirname, 'imgdiff.py'), 'pairs', ...files]).toString());
(async () => {
  fs.mkdirSync(outdir, { recursive: true });
  const tmp = path.join(outdir, 'det'); fs.mkdirSync(tmp, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  p.on('pageerror', e => console.log('[pageerror]', e.message));
  await p.goto(page_url); await p.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  const shot = async (t, f) => { await p.evaluate(t => window.renderFrame(t), t); await p.screenshot({ path: f }); return f; };
  const render = t => p.evaluate(t => window.renderFrame(t), t);
  // ---- seam
  const sf = [];
  for (const t of TIMES) sf.push(await shot(t, path.join(outdir, `seam_${t.toFixed(3)}.png`)));
  const pd = diff(sf.slice(0, -1).flatMap((f, i) => [f, sf[i + 1]]));
  const pairs = TIMES.slice(1).map((t, i) => [TIMES[i], t, pd[i].mean]);
  const seam = pairs[3][2];
  const others = pairs.filter((_, i) => i !== 3).map(q => q[2]).sort((a, c) => a - c);
  const med = others[2];                                            // the true median of 5
  const steady = Math.max(pairs[4][2], pairs[5][2]);
  const seamPass = seam <= med && seam <= steady && seam <= 6.0;
  // ---- determinism
  const det = [];
  for (const t of PROBES) {
    const w = x => ((x % 60) + 60) % 60;
    await render(w(t + 30)); const A = await shot(t, path.join(tmp, `A_${t.toFixed(3)}.png`));
    await render(w(t - 1 / 30)); const B = await shot(t, path.join(tmp, `B_${t.toFixed(3)}.png`));
    await render(w(t + 17)); const C = await shot(t, path.join(tmp, `C_${t.toFixed(3)}.png`));
    const [ab, ac] = diff([A, B, A, C]);
    const ok = [ab, ac].every(d => d.max <= 3);
    det.push({ t, seq: ab, other: ac, pass: ok });
    if (ok) { fs.unlinkSync(B); fs.unlinkSync(C); fs.unlinkSync(A); }
  }
  // ---- recipes on the core test page (animated window pane key, frozen under-scene)
  const tp = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  tp.on('pageerror', e => console.log('[pageerror test]', e.message));
  await tp.goto('file://' + path.resolve(__dirname, '..', '..', 'v2/core_test.html')); await tp.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  const tshot = async (t, f) => { await tp.evaluate(t => window.renderFrame(t), t); await tp.screenshot({ path: f }); return f; };
  for (const t of (args.quick ? [18.5] : [18.2, 18.5, 18.8, 17.0])) {
    await tp.evaluate(() => window.renderFrame(18.95)); const A = await tshot(t, path.join(tmp, `TA_${t.toFixed(3)}.png`));
    await tp.evaluate(() => { for (const x of [18.05, 18.4, 18.62, 18.33, 18.77]) window.renderFrame(x); }); const B = await tshot(t, path.join(tmp, `TB_${t.toFixed(3)}.png`));
    await tp.evaluate(() => window.renderFrame(12)); const C = await tshot(t, path.join(tmp, `TC_${t.toFixed(3)}.png`));
    const [ab, ac] = diff([A, B, A, C]);
    const ok = [ab, ac].every(d => d.max <= 3);
    det.push({ t: 'core_test ' + t, seq: ab, other: ac, pass: ok });
    if (ok) { fs.unlinkSync(B); fs.unlinkSync(C); fs.unlinkSync(A); }
  }
  await b.close();
  // strip of the seam frames (python, from the screenshots)
  execFileSync('python3', ['-I', '-c', `import sys\nfrom PIL import Image\nfs=sys.argv[2:]\nS=Image.new('RGB',(216*len(fs),270))\nfor i,f in enumerate(fs): S.paste(Image.open(f).convert('RGB').resize((216,270)),(216*i,0))\nS.save(sys.argv[1])`, path.join(outdir, 'seam_strip.png'), ...sf]);
  const detPass = det.every(d => d.pass);
  const pass = seamPass && detPass;
  const rep = { pairs, seam, medianOthers: med, steadyState: steady, seamPass, determinism: det, detPass, pass, page: args.page || 'v2/index.html', when: new Date().toISOString() };
  fs.writeFileSync(path.join(outdir, 'seam_report.json'), JSON.stringify(rep, null, 1));
  pairs.forEach(([a, c, d]) => console.log(`${a.toFixed(3)} -> ${c.toFixed(3)}  mean abs diff ${d.toFixed(3)}${a === 59.967 ? '   <- seam' : ''}`));
  console.log(`seam ${seam.toFixed(3)}  median of others ${med.toFixed(3)}  steady state ${steady.toFixed(3)}  limit 6.0  ->  ${seamPass ? 'PASS' : 'FAIL'}`);
  det.forEach(d => { if (!d.pass) console.log(`  determinism FAIL at ${d.t}: sequential ${JSON.stringify(d.seq)}  other-act ${JSON.stringify(d.other)}  (kept in ${tmp})`); });
  const worst = det.reduce((m, d) => Math.max(m, d.seq.max, d.other.max), 0), worstPx = det.reduce((m, d) => Math.max(m, d.seq.over2, d.other.over2), 0);
  const worst0 = det.reduce((m, d) => Math.max(m, d.seq.over0, d.other.over0), 0), exact = det.filter(d => !d.seq.over0 && !d.other.over0).length;
  console.log(`determinism: ${det.length} probes x 3 histories, worst channel diff ${worst} (limit 3), worst px over 2 levels ${worstPx}, worst px differing at all ${worst0}, byte-identical probes ${exact}/${det.length}  ->  ${detPass ? 'PASS' : 'FAIL'}`);
  console.log(pass ? 'PASS' : 'FAIL');
  process.exit(pass ? 0 : 1);
})();
