const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve('/home/user/ClaudePav/dharma-video/visual/lookdev/glass/index.html');
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const all2d = `GG.outline = (k)=>{ const [c]=LX.scratch('dummy',2,2); return {c,x:0,y:0}; }; G.flushGlow = ()=>{ G.glowJobs=[]; }; G.shade = ()=>{}; GG.draw = ()=>{}; GG.knot=()=>[]; GG.jewel=()=>{}; G.captionLine = ()=>[{x:0,w:0},{x:0,w:0},{x:0,w:0}]; G.prismWord=()=>{};`;
  const variants = {
    base: '',
    noKnot: `GG.knot=()=>[];`,
    noGlow: `G.flushGlow = ()=>{ G.glowJobs=[]; };`,
    noShade: `G.shade = ()=>{};`,
    noChar: `GG.draw = ()=>{};`,
    noText: `G.prismWord=()=>{};`,
  };
  for (const [name, patch] of Object.entries(variants)) {
    const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
    await p.goto(URL); await p.waitForFunction(() => window.READY === true);
    if (patch) await p.evaluate(patch);
    const row = [];
    for (const T of [0, 22.2, 36.6]) {
      for (let i = 0; i < 2; i++) { await p.evaluate(t => window.renderFrame(t), T); await p.screenshot({ type: 'jpeg', quality: 95 }); }
      const r = [];
      for (let i = 0; i < 5; i++) { const t0 = Date.now(); await p.evaluate(t => window.renderFrame(t), T + i / 30); await p.screenshot({ type: 'jpeg', quality: 95 }); r.push(Date.now() - t0); }
      row.push(T + ':' + med(r));
    }
    console.log(name.padEnd(10), row.join('  '));
    await p.close();
  }
  await b.close();
})();
