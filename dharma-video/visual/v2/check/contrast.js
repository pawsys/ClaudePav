// Local type contrast gate (LOOK.md 2.11, 5.7): >= 4.5:1 between the type core and the ground right around it.
// Renders each time with ?qa=1 (type.js records every drawn word box in V2.QA.words), screenshots it, and measures in
// contrast.py: core = 90th percentile luma inside the word box, ground = median luma of a ring 0.35 to 0.8 type
// sizes outside it (past the halo; other word boxes excluded), restricted to the caption pane the word sits on (V2.shade
// records its pane rects with ?qa=1): the pane-darkened ground LOOK 2.11 means. WCAG (L1 + .05) / (L2 + .05).
// Targets: lit words 4.5:1; pre-lit / pulsing words (level 0.5 to 0.95) 3.0:1; unlit and flicker frames are skipped.
// usage (from visual/): node v2/check/contrast.js [--page v2/index.html] [--times 0,2.4,...] [--out ../out/v2/contrast]
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => { if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return a; }, []));
const page = args.page || 'v2/index.html';
const url = 'file://' + path.resolve(__dirname, '..', '..', page.split('?')[0]) + '?qa=1' + (page.includes('?') ? '&' + page.split('?')[1] : '');
const outdir = path.resolve(__dirname, '..', '..', args.out || '../out/v2/contrast');
const TIMES = String(args.times || '0,1.6,2.4,4.55,5.4,6.2,7.5,9.5,11.2,12.6,14.3,16.6,19.6,22.3,26.5,29,31.95,33.6,34.9,36.6,38.7,40.9,44.5,46.5,50.4,52.6,55,57.2,59.967').split(',').map(Number);
(async () => {
  fs.mkdirSync(outdir, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  p.on('pageerror', e => console.log('[pageerror]', e.message));
  await p.goto(url); await p.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  const jobs = [];
  for (const t of TIMES) {
    const qa = await p.evaluate(t => { window.renderFrame(t); return { words: (V2.QA && V2.QA.words) || [], panes: (V2.QA && V2.QA.panes) || [], exclude: (V2.QA && V2.QA.exclude) || [] }; }, t);
    const f = path.join(outdir, `qa_${t.toFixed(3)}.png`);
    await p.screenshot({ path: f });
    jobs.push({ t, file: f, words: qa.words, panes: qa.panes, exclude: qa.exclude });
  }
  await b.close();
  fs.writeFileSync(path.join(outdir, 'qa_words.json'), JSON.stringify(jobs));
  const out = execFileSync('python3', ['-I', path.join(__dirname, 'contrast.py'), path.join(outdir, 'qa_words.json')]).toString();
  process.stdout.write(out);
  process.exit(/\bFAIL\b\s*$/.test(out.trim()) ? 1 : 0);
})();
