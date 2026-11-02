// Text lint (LOOK.md 5.7): no em or en dashes (or other dash look-alikes) in any on-screen string.
// 1. static: every string literal in visual/v2/**/*.js and the TIMING words
// 2. runtime: patches fillText/strokeText, renders t = 0..60 every --step s (default 0.25) and checks every string drawn
// usage (from visual/): node v2/check/text_lint.js [--page v2/index.html] [--step 0.25] [--static-only]
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => { if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return a; }, []));
const BAD = /[‒–—―⸺⸻﹘﹣－−]/;          // figure, en, em, horizontal bar, two/three-em, small/fullwidth hyphen-minus, MINUS SIGN (U+2212)
const root = path.resolve(__dirname, '..');
let bad = [];
// static
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (e.name === 'tools' ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);
for (const f of walk(root).filter(f => f.endsWith('.js') && !f.endsWith('glyphs.js'))) {
  fs.readFileSync(f, 'utf8').split('\n').forEach((ln, i) => {
    const strs = ln.match(/(['"`])(?:\\.|(?!\1).)*\1/g) || [];
    strs.forEach(s => { if (BAD.test(s)) bad.push(`${path.relative(root, f)}:${i + 1}  ${s}`); });
  });
}
global.window = {}; require(path.resolve(root, '..', 'timing.js'));
for (const L of [...window.TIMING.lines, ...window.TIMING.choir]) L.words.forEach(w => { if (BAD.test(w)) bad.push(`TIMING ${L.id}: ${w}`); });
console.log(`static: ${bad.length} problem(s)`); bad.forEach(b => console.log('  ' + b));
if (args['static-only']) process.exit(bad.length ? 1 : 0);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.addInitScript(() => {
    window.__TXT = new Set();
    for (const fn of ['fillText', 'strokeText']) { const o = CanvasRenderingContext2D.prototype[fn]; CanvasRenderingContext2D.prototype[fn] = function (s, ...r) { window.__TXT.add(String(s)); return o.call(this, s, ...r); }; }
  });
  await p.goto('file://' + path.resolve(root, '..', args.page || 'v2/index.html')); await p.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  const step = +(args.step || 0.25);
  const strs = await p.evaluate(step => { for (let t = 0; t < 60; t += step) window.renderFrame(+t.toFixed(4)); return [...window.__TXT]; }, step);
  await b.close();
  const rb = strs.filter(s => BAD.test(s));
  console.log(`runtime: ${strs.length} distinct strings drawn, ${rb.length} with a dash`); rb.forEach(s => console.log('  ' + s));
  const ok = !bad.length && !rb.length;
  console.log(ok ? 'PASS' : 'FAIL'); process.exit(ok ? 0 : 1);
})();
