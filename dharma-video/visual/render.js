// Deterministic frame renderer: loads index.html, calls window.renderFrame(t)
// for each frame and pipes JPEG/PNG frames into ffmpeg.
// usage: node render.js --out ../out/video_noaudio.mp4 [--fps 30] [--start 0] [--end 60] [--workers 3] [--stills 1,5.5,12]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => {
  if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return a;
}, []));
const FPS = +(args.fps || 30);
const W = 1080, H = 1350;
const page_url = 'file://' + path.resolve(__dirname, args.page || 'index.html');

async function openPage(browser) {
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  p.on('pageerror', e => console.log('[pageerror]', e.message));
  await p.goto(page_url);
  await p.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  return p;
}

async function stills(times, outdir) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await openPage(browser);
  fs.mkdirSync(outdir, { recursive: true });
  for (const t of times) {
    await p.evaluate(t => window.renderFrame(t), t);
    await p.screenshot({ path: path.join(outdir, `still_${t.toFixed(2).padStart(6, '0')}.png`) });
  }
  await browser.close();
}

async function segment(start, end, out, quality) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await openPage(browser);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', out]);
  const f0 = Math.round(start * FPS), f1 = Math.round(end * FPS);
  for (let f = f0; f < f1; f++) {
    await p.evaluate(t => window.renderFrame(t), f / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 150 === 0) console.log(`seg ${start}-${end}: frame ${f}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
}

(async () => {
  if (args.stills) {
    await stills(String(args.stills).split(',').map(Number), path.resolve(__dirname, args.outdir || '../out/stills'));
    return;
  }
  const start = +(args.start || 0), end = +(args.end || 60);
  const workers = +(args.workers || 3);
  const quality = +(args.quality || 95);
  const out = path.resolve(__dirname, args.out || '../out/video_noaudio.mp4');
  const tmp = path.join(path.dirname(out), 'segs');
  fs.mkdirSync(tmp, { recursive: true });
  // split on whole frames
  const totalF = Math.round((end - start) * FPS);
  const per = Math.ceil(totalF / workers);
  const jobs = [];
  const files = [];
  for (let w = 0; w < workers; w++) {
    const a = start + (w * per) / FPS;
    const b = Math.min(end, start + ((w + 1) * per) / FPS);
    if (b <= a) break;
    const f = path.join(tmp, `seg${w}.mp4`);
    files.push(f);
    jobs.push(segment(a, b, f, quality));
  }
  const t0 = Date.now();
  await Promise.all(jobs);
  fs.writeFileSync(path.join(tmp, 'list.txt'), files.map(f => `file '${f}'`).join('\n'));
  await new Promise(r => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy', out], { stdio: 'inherit' }).on('close', r));
  console.log('done', out, ((Date.now() - t0) / 1000).toFixed(1) + 's');
})();
