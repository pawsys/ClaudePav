// Sections 6-60 for the rays lookdev. Each section: one light shader (ground + ray systems, with shapes
// defined as places where the rays change: lantern body, lens body, glass lobes, wedges, brush bristles)
// + crisp Canvas2D (light-pen character, captions) + one shared glow pass.
(function () {
  const { add, lightPass, flushGlow, watermark, prog, P, lp, boilF, buzzTicks } = RS;
  const E = ENGINE, TAU = Math.PI * 2, W = 1080, H = 1350;
  const serif = s => `italic 400 ${s}px "Fraunces"`;
  const anton = s => `400 ${s}px "Anton"`;
  const litOf = (t, id, o) => TY.lit(t, TY.line(id).word_t, o);
  const U = G => [G.cx, G.cy, G.bw, G.bh];

  // ================================================================== 6-18  "it's this little guy."
  // A grand sunburst reveal for a tiny anxious guy: crisp translucent wedges of cadmium orange and hot
  // magenta (their overlaps make coral strips) + gold hairlines, a specimen ring with ticks (the field
  // guide begins). The wedges pass through his lantern body.
  const GUY_FS = `
uniform vec4 uBody; uniform vec3 uKnot; uniform float uBoil;
void main(){
  vec2 q=canvasPx(vUv);
  vec2 C=uBody.xy;
  vec2 d=q-C; float r=length(d), a=atan(d.y,d.x);
  vec3 col=mix(HX(30.,46.,168.), HX(16.,22.,100.), smoothstep(250.,1250.,r));
  float rot=lph(1.);
  float fade=smoothstep(1500.,500.,r)*(1.-.55*smoothstep(500.,120.,q.y));
  float wA=wedge(a,r,18.,rot,.30,2.);
  float wB=wedge(a,r,18.,rot+TAU/36.,.30,2.);
  vec3 orng=HX(255.,124.,10.), mag=HX(240.,30.,140.);
  col=mix(col,orng*.92,wA*fade*.88);
  col=mix(col,mag*.82,wB*fade*.85);
  vec2 h1=hair(r,a-rot*.5,170.,5.,520.,1350.,2.4);
  vec3 hc=h1.y<.55?HX(255.,214.,90.):h1.y<.8?vec3(1.):HX(255.,190.,110.);
  col+=hc*h1.x*.30*smoothstep(1350.,250.,r)*smoothstep(uBody.w*.9,uBody.w*1.3,r);
  float R0=uBody.w*1.3;
  col=mix(col,HX(18.,26.,110.),smoothstep(R0+3.,R0-3.,r)*(1.-smoothstep(uBody.w*1.02,uBody.w*.98,r))*.55);
  col+=HX(255.,240.,220.)*.7*exp(-abs(r-R0)/1.5);
  float tu=a/TAU*72.+.5; float ft=fract(tu)-.5; float tid=floor(tu);
  float tl=mod(tid,6.)<.5?32.:14.;
  col+=HX(255.,240.,220.)*.6*smoothstep(1.8,.4,abs(ft)*TAU*r/72.)*step(R0,r)*step(r,R0+tl);
  vec2 bm=bodyMask(q,uBody);
  vec2 hb=q-(uBody.xy+vec2(-.1,-.15)*uBody.zw); float br=length(hb), ba=atan(hb.y,hb.x);
  vec2 hh=hair(br,ba,120.,3.,200.,420.,2.6);
  float lan=exp(-length((q-uBody.xy-vec2(-.2,-.3)*uBody.zw)/uBody.zw)*1.7);
  vec3 inner=HX(230.,90.,22.)*.48+HX(255.,175.,60.)*.40*lan+(hh.y<.6?HX(255.,214.,90.):HX(255.,120.,90.))*hh.x*.55;
  inner+=HX(255.,170.,90.)*.32*smoothstep(-60.,0.,bm.x)*smoothstep(4.,-2.,bm.x);
  col=mix(col, inner, bm.y);
  col=knotShade(col,q,uKnot,uBoil,0.,bm.y);
  o=vec4(col,1.);
}`;
  add(6, 18, (t, ctx) => {
    const G = CH.pose(t, {
      cx: 520, cy: 935, s: 350, boil: boilF(t, 2), amp: 1.8,
      arm: { ext: 1, tx: 690, ty: 1050, open: 0.08, sag: 0.02, ang: -0.75 },
      eyes: 'worried', mouth: 'wobble', sweat: 1, look: [0.2, 0.15],
    });
    const knot = [770, 975, 94];
    lightPass(t, P.guy, { uBody: U(G), uKnot: knot, uBoil: boilF(t, 2) }, { bloomK: 0.26, bleed: 0.25, thresh: 0.7, sat: 1.08 });
    const Q = [];
    const st = { line: '#ffe9cc', halo: '#ff7a1a', fill: ['#ff9a3c', 0], lw: 6.5, ink: '#2a0b3c', handFill: '#ff9a40', handHalo: '#ff6a2a', handAlpha: 0.3, glowW: 2.5, handScale: 1.1 };
    const Hh = CH.draw(ctx, G, st, Q);
    buzzTicks(ctx, t, knot, Q, 1);
    CH.drawHand(ctx, Hh, st, Q);
    const L = TY.line('V09');
    const lit = TY.lit(t, L.word_t);
    const sz = TY.fit(ctx, ["IT'S THIS"], anton, 190, 900);
    const words = TY.layout(ctx, [
      { words: ["IT'S", 'THIS'], size: sz, y: 110 + sz * 0.86 },
      { words: ['LITTLE', 'GUY.'], size: sz, y: 110 + sz * 0.86 + sz * 0.98 },
    ], anton);
    TY.pane(ctx, 540, 300, 640, 260, '#0a0f50', 0.6);
    TY.neon(ctx, words, lit, Q, { core: '#fff7fb', halo: '#ff2f9e', edge: '#ff3ea5', split: 0.03, haloA: 0.7, glass: '#ffb0dc', glassA: 0.7 });
    flushGlow(ctx, Q, { alpha: 0.95 });
    CH.face(ctx, G, st, null);
    watermark(ctx);
  });

  // ================================================================== 18-24  the fist opens, sung "un-clench"
  // Macro of his mitten. Each finger is a translucent capsule (overlaps glow at the knuckles); a dawn
  // burst streams OUT of the opening palm (dashes travel outward) and the knot unravels into rays.
  const UNC_FS = `
uniform vec2 uPalm; uniform float uOpen, uBoil;
uniform vec4 uPalmE; uniform vec4 uCapA[4]; uniform float uCapR[4]; uniform vec4 uWrist;
void main(){
  vec2 q=canvasPx(vUv); float vy=q.y/1350.;
  vec3 col=mix(HX(26.,12.,78.), HX(92.,30.,124.), smoothstep(.05,1.,vy));
  col=mix(col,HX(200.,40.,90.),smoothstep(.55,.85,vy)*.5);
  col=mix(col,HX(230.,80.,30.),smoothstep(.8,1.,vy)*.5);
  vec2 d=q-uPalm; float r=length(d), a=atan(d.y,d.x);
  float op=uOpen;
  col+=HX(255.,90.,30.)*.10*exp(-length((q-uPalm)/vec2(700.,380.)))*op;
  vec2 b1=beams(a,13.,2.,.30,.10);
  vec2 h1=hair(r,a,150.,7.,800.,1800.,3.);
  vec2 h2=hair(r,a+.02,330.,13.,450.,1200.,1.6);
  float d1=dashes(r,.014,60.,-1.,h1.y*TAU,.62);
  vec3 c1=h1.y<.22?HX(255.,226.,90.):h1.y<.42?HX(255.,150.,50.):h1.y<.62?HX(255.,70.,150.):h1.y<.8?HX(190.,110.,255.):HX(90.,220.,255.);
  vec3 cb=b1.y<.25?HX(255.,200.,70.):b1.y<.5?HX(255.,100.,60.):b1.y<.75?HX(255.,60.,150.):HX(150.,90.,255.);
  float up=smoothstep(.45,-.25,sin(a));
  float fall=smoothstep(1800.,120.,r)*smoothstep(150.,330.,r);
  col+=cb*b1.x*.20*fall*up*op;
  col+=c1*h1.x*(.15+.85*d1)*.8*fall*(.25+.75*up)*op;
  col+=HX(255.,240.,220.)*h2.x*.18*fall*up*op;
  col+=HX(255.,210.,150.)*.42*exp(-r/120.)*op+HX(255.,110.,80.)*.16*exp(-r/330.)*op;
  // the hand, backlit: rays pass through the flesh tinted coral; thin edges glow (subsurface);
  // each extra overlapping layer (knuckles, thumb over palm) is denser glass
  float dE=sdEll(q-uPalmE.xy,uPalmE.zw);
  float dm=dE, cnt=smoothstep(1.5,-1.5,dE);
  for(int i=0;i<4;i++){ float dc=sdCap(q,uCapA[i].xy,uCapA[i].zw,uCapR[i]); dm=min(dm,dc); cnt+=smoothstep(1.5,-1.5,dc); }
  float dw=sdCap(q,uWrist.xy,uWrist.zw,uWrist.x>0.?132.:0.);
  dm=min(dm,dw); cnt=max(cnt,smoothstep(1.5,-1.5,dw));
  float inH=smoothstep(1.5,-1.5,dm);
  vec3 flesh=col*vec3(.55,.22,.30)+HX(170.,30.,70.)*.10+HX(255.,120.,70.)*.42*smoothstep(-34.,0.,dm)+HX(255.,190.,120.)*.25*smoothstep(-10.,0.,dm);
  flesh+=(c1*h1.x*(.15+.85*d1)*.55*fall*op)*vec3(1.,.55,.5);
  flesh*=pow(.68,max(cnt-1.,0.));
  col=mix(col,flesh,inH);
  o=vec4(col,1.);
}`;
  function strands(ctx, palm, t, open, Q) {
    // the knot unravelling: a neon tangle in the palm whose threads straighten into dawn rays
    const N = 8, neon = ['#ff2f9e', '#c6ff3d', '#3df5ff'], dawn = ['#ffe66b', '#ff9f43', '#ff5fa2', '#c77dff', '#6fe3ff', '#fff3d6'];
    const segs = [];
    for (let i = 0; i < N; i++) {
      const th = -Math.PI + 0.5 + (i / (N - 1)) * (Math.PI - 1.0) + 0.08 * Math.sin(i * 7.1);
      const L = (560 + 380 * LX.hash(i * 3.7)) * E.easeOutCubic(open);
      const A = 46 + 30 * LX.hash(i * 1.3), ph = i * 2.3 + lp(t, 6);
      const pts = [];
      for (let k = 0; k <= 60; k++) {
        const u = k / 60, rr = 10 + u * L;
        const tang = Math.pow(Math.max(0, 1 - u / 0.3), 1.6) * A;
        const px = palm[0] + Math.cos(th) * rr - Math.sin(th) * tang * Math.sin(u * 60 + ph) + Math.cos(th) * tang * 0.8 * Math.cos(u * 60 + ph);
        const py = palm[1] + Math.sin(th) * rr + Math.cos(th) * tang * Math.sin(u * 60 + ph) + Math.sin(th) * tang * 0.8 * Math.cos(u * 60 + ph);
        pts.push([px, py]);
      }
      segs.push({ pts, c0: neon[i % 3], c1: dawn[i % 6] });
    }
    Q.push(g => { g.lineWidth = 12; segs.forEach(sg => { g.strokeStyle = sg.c1; g.stroke(CH.poly(sg.pts.slice(18))); g.strokeStyle = sg.c0; g.stroke(CH.poly(sg.pts.slice(0, 20))); }); });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    segs.forEach(sg => {
      ctx.strokeStyle = sg.c0; ctx.lineWidth = 4.5; ctx.stroke(CH.poly(sg.pts.slice(0, 20)));
      const ray = sg.pts.slice(17);
      const grd = ctx.createLinearGradient(ray[0][0], ray[0][1], ray[ray.length - 1][0], ray[ray.length - 1][1]);
      grd.addColorStop(0, sg.c0); grd.addColorStop(0.25, sg.c1); grd.addColorStop(0.75, sg.c1); grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd; ctx.fill(CH.brush(ray, 11, 0, 0.15, 0.08));
    });
    ctx.restore();
  }
  add(18, 24, (t, ctx) => {
    const open = E.smoother(E.range(t, 21.0, 22.7));
    const palm = [540, 1075], hsz = 640;
    const hshapes = CH.mittenShapes(palm[0], palm[1], -Math.PI / 2, hsz, open, 0.1);
    const capA = new Float32Array(16), capR = new Float32Array(4);
    hshapes.slice(1).forEach((c, i) => { capA.set([c.a[0], c.a[1], c.b[0], c.b[1]], i * 4); capR[i] = c.r; });
    lightPass(t, P.unc, {
      uPalm: [palm[0], palm[1] - 40], uOpen: 0.25 + 0.75 * E.smooth(E.range(t, 20.9, 22.0)), uBoil: boilF(t, 2),
      uPalmE: [palm[0], palm[1], hshapes[0].ry, hshapes[0].rx], uCapA: { v4: capA }, uCapR: { v1: capR }, uWrist: [palm[0], palm[1] + 200, palm[0], H + 300],
    }, { bloomK: 0.4, bleed: 0.25, thresh: 0.6 });
    const Q = [];
    // wrist: a translucent tube of light coming up from the bottom edge
    const wl = [[palm[0] - 132, palm[1] + 200], [palm[0] - 132, H + 40]];
    const wr = [[palm[0] + 132, palm[1] + 200], [palm[0] + 132, H + 40]];
    const wf = new Path2D(); [...wl, ...wr.slice().reverse()].forEach((p, i) => i ? wf.lineTo(p[0], p[1]) : wf.moveTo(p[0], p[1])); wf.closePath();
    const shapes = CH.mittenShapes(palm[0], palm[1], -Math.PI / 2, hsz, open, 0.1);
    const paths = shapes.map(sh => CH.shapePath(sh));
    paths.push(wf);
    const bb = CH.shapesBBox(shapes); bb[3] = H + 30; bb[0] = Math.min(bb[0], palm[0] - 200); bb[2] = Math.max(bb[2], palm[0] + 200);
    // backlit flesh: translucent coral glass, darker where capsules overlap (knuckles), warm subsurface rim
    const wcap = new Path2D(); wcap.arc(palm[0], palm[1] + 200, 132, Math.PI, 0); wcap.lineTo(palm[0] + 132, H + 40); wcap.lineTo(palm[0] - 132, H + 40); wcap.closePath();
    paths[paths.length - 1] = wcap;
    CH.silhouette(ctx, paths, bb, { line: '#fff0de', lw: 6, inner: 0.22, halo: true, haloA: 0.5 }, Q);
    strands(ctx, [palm[0], palm[1] - 30], t, open, Q);
    // caption: sung "un-clench" written in light (two syllables, one word)
    const C = TY.line('C2');
    const lit = TY.lit(t, C.word_t);
    const words = TY.layout(ctx, [{ words: ['un', 'clench.'], size: 210, y: 330, space: 0 }], serif);
    TY.pane(ctx, 540, 270, 560, 190, '#1a0838', 0.35);
    TY.light(ctx, words, lit, Q, { core: '#fff3e6', halo: '#ff5fa2', glass: '#ffc0e0' });
    flushGlow(ctx, Q, { alpha: 0.7 });
    watermark(ctx);
  });

  // ================================================================== 24-36  "you are the sky"
  // A Hockney pool sky: flat saturated blue, a net of wobbly light lines (white/yellow + pink/lilac).
  // The sky's light radiates FROM him: a fan of wedges whose lit half shows the net brighter and the
  // blue lighter. His body is a lens: the net bends and turns gold inside him. The released knot is now a
  // glass cloud made only of overlapping translucent lobes.
  const SKY_FS = `
uniform vec4 uBody; uniform vec3 uCloud;
void main(){
  vec2 q=canvasPx(vUv); float vy=q.y/1350.;
  vec3 top=HX(10.,58.,182.), mid=HX(20.,128.,220.), bot=HX(70.,192.,236.);
  vec3 g=mix(top,mid,smoothstep(0.,.62,vy)); g=mix(g,bot,smoothstep(.62,1.,vy));
  vec2 S=uBody.xy+vec2(0.,-uBody.w*.25);
  vec2 d=q-S; float r=length(d), a=atan(d.y,d.x);
  float rot=.06*sin(lph(1.));
  float w=wedge(a,r,28.,rot,.5,2.5);
  float up=smoothstep(.3,-.1,sin(a));
  float beam=w*up*smoothstep(1800.,150.,r);
  vec3 col=mix(g*vec3(.62,.62,.95), g*1.08, beam);
  float ph=lph(6.);
  vec2 bm=bodyMask(q,uBody);
  vec2 ql=mix(q, uBody.xy+(q-uBody.xy)*.7, bm.y);
  float n1=hockLines(ql,118.,ph,3.6,0.);
  float n2=hockLines(ql+vec2(37.,23.),151.,ph+1.7,3.0,3.1);
  float calm=clamp(smoothstep(0.,uBody.z*.3,bm.x)+bm.y,0.,1.);
  float vis=(.40+.60*beam)*calm;
  vec3 lA=mix(vec3(1.),HX(255.,243.,166.),step(.55,vn(q/230.)));
  vec3 lB=mix(HX(255.,140.,200.),HX(190.,150.,255.),step(.5,vn(q/280.+7.)));
  col+=(lA*n1*.62+lB*n2*.55)*vis*(1.-bm.y);
  float lan=exp(-length((q-uBody.xy-vec2(-.2,-.3)*uBody.zw)/uBody.zw)*1.6);
  vec3 inner=col*.10+HX(255.,150.,100.)*.34+HX(255.,200.,150.)*.22*lan+HX(255.,226.,110.)*n1*.9+HX(255.,90.,120.)*n2*.6;
  inner+=HX(255.,236.,210.)*.30*smoothstep(-55.,0.,bm.x)*smoothstep(4.,-2.,bm.x);
  col=mix(col,inner,bm.y);
  vec2 cc=uCloud.xy; float cs=uCloud.z;
  vec3 lb[5]; lb[0]=vec3(-.62,.12,.46); lb[1]=vec3(-.2,-.2,.6); lb[2]=vec3(.28,-.12,.54); lb[3]=vec3(.66,.14,.4); lb[4]=vec3(.02,.2,.5);
  vec3 lc[5]; lc[0]=HX(255.,120.,190.); lc[1]=HX(255.,236.,180.); lc[2]=HX(170.,140.,255.); lc[3]=HX(120.,255.,220.); lc[4]=HX(255.,170.,120.);
  for(int i=0;i<5;i++){
    float dd=length(q-cc-lb[i].xy*cs*1.3)-lb[i].z*cs;
    float inside=smoothstep(1.5,-1.5,dd);
    col+=lc[i]*.24*inside+vec3(1.)*.5*exp(-abs(dd)/1.3)+lc[i]*.06*exp(-abs(dd)/8.);
  }
  o=vec4(col,1.);
}`;
  add(24, 36, (t, ctx) => {
    const G = CH.pose(t, {
      cx: 540, cy: 1030, s: 300, boil: boilF(t, 4), amp: 1.0,
      arm: { ext: 1, tx: 760, ty: 860, open: 1, sag: 0.02, ang: -1.15 },
      eyes: 'happy', mouth: 'smile', look: [0.1, -0.3],
    });
    const cloud = [800, 680, 92];
    lightPass(t, P.sky, { uBody: U(G), uCloud: cloud }, { bloomK: 0.25, bleed: 0.2, thresh: 0.85 });
    const Q = [];
    const st = { line: '#fffaf0', halo: '#ff9a6a', fill: ['#ffc9a3', 0], lw: 6, ink: '#13206b', handFill: '#ffc9a3', handHalo: '#ff9a6a', handAlpha: 0.35, glowW: 2, op: 'source-over' };
    const Hh = CH.draw(ctx, G, st, Q);
    CH.drawHand(ctx, Hh, st, Q);
    const C = TY.line('C3');
    const lit = TY.lit(t, C.word_t);
    const ssz = TY.fit(ctx, ['you are the sky'], serif, 150, 900);
    const words = TY.layout(ctx, [{ words: ['you', 'are', 'the', 'sky'], size: ssz, y: 330 }], serif);
    TY.pane(ctx, 540, 290, 600, 170, '#08206e', 0.75);
    TY.light(ctx, words, lit, Q, { core: '#ffffff', halo: '#ff6fb5', glass: '#ffffff', glassA: 0.6, haloA: 0.55 });
    flushGlow(ctx, Q, { alpha: 0.6, wideA: 0.6 });
    CH.face(ctx, G, st, null);
    watermark(ctx);
  });

  // ================================================================== 36-42.75  the drop: "turns out the joy was free."
  // He IS the sun: a full-spectrum radial explosion from his body, a prism halo, light confetti on 16ths.
  // Below the horizon Hockney fields in reverse perspective: their furrows converge on the viewer (the
  // vanishing point is in you) and open out as they recede.
  const DROP_FS = `
uniform vec4 uBody; uniform float uBurst, uLt;
vec3 fieldCol(float id){
  float m=mod(id,7.);
  if(m<.5) return HX(122.,43.,209.);
  if(m<1.5) return HX(182.,240.,60.);
  if(m<2.5) return HX(255.,111.,181.);
  if(m<3.5) return HX(255.,122.,26.);
  if(m<4.5) return HX(54.,201.,90.);
  if(m<5.5) return HX(232.,65.,43.);
  return HX(255.,214.,63.);
}
void main(){
  vec2 q=canvasPx(vUv);
  vec2 S=uBody.xy;
  vec2 d=q-S; float r=length(d), a=atan(d.y,d.x);
  float hz=1095.;
  vec3 col=mix(HX(34.,51.,214.), HX(76.,32.,200.), smoothstep(300.,1150.,r));
  float B=uBurst;
  float rot=lph(2.);
  float edge=uBody.w*.95;
  // full-spectrum sunburst: flat saturated wedges (each its own hue), born at his edge
  float K=20.; float u=(a+rot*.25)/TAU*K; float wid=floor(u);
  float w=wedge(a,r,K,rot*.25,.5,2.);
  vec3 wc=spec(fract(wid/K*1.0+.08));
  wc=mix(wc,vec3(1.),.06);
  float rv=edge*1.1+1800.*(1.-pow(1.-clamp(uLt/.4,0.,1.),3.));       // the sunburst shoots out on the downbeat
  float st=smoothstep(edge*1.15,edge*1.6,r)*smoothstep(rv+40.,rv-40.,r);
  float capz=1.-.85*smoothstep(470.,330.,q.y)*smoothstep(560.,380.,abs(q.x-540.)+120.);   // caption calm zone
  col=mix(col,wc*.85,w*st*(.55+.4*B)*capz);
  vec2 h1=hair(r,a+rot*.3,180.,11.,900.,1900.,3.);
  vec2 h2=hair(r,a-rot*.2,360.,23.,500.,1500.,1.7);
  float dd1=dashes(r,.012,90.,-1.,h1.y*TAU,.7);
  float fall=smoothstep(1900.,300.,r)*smoothstep(edge,edge*1.3,r);
  col+=(HX(255.,250.,225.)*h1.x*(.3+.7*dd1)*.55*fall+HX(255.,236.,120.)*h2.x*.25*fall)*(.35+.65*capz);
  float R0=uBody.w*1.42+60.*(1.-B);
  col+=spec(clamp((r-R0)/70.+.5,0.,1.))*exp(-pow((r-R0)/30.,2.))*.7;
  col+=HX(255.,236.,170.)*.32*exp(-max(r-edge,0.)/28.)+HX(255.,210.,60.)*.08*exp(-r/380.);
  float Rs=edge+1500.*(1.-exp(-uLt*3.2));                               // prism shockwave
  col+=spec(clamp((r-Rs)/90.+.5,0.,1.))*exp(-pow((r-Rs)/40.,2.))*.9*clamp(1.-uLt/1.,0.,1.);
  if(q.y>hz){
    vec2 v=q-vec2(540.,1980.); float fa=atan(v.x,-v.y); float fr=length(v);
    float uu=fa/1.6*9.+4.5;
    float id=floor(uu+.18*sin(fr*.006+floor(uu)*1.7));
    if(abs(id-4.)<.5) id=3.;
    col=fieldCol(id)*.7;
    col*=.78+.22*smoothstep(hz,1350.,q.y);
    vec2 fh=hair(fr,atan(v.y,v.x),150.,31.,3000.,3001.,2.2);
    col+=mix(col,vec3(1.),.35)*fh.x*.8;
    col+=HX(255.,240.,200.)*.9*exp(-(q.y-hz)/2.5);
  }
  vec2 bm=bodyMask(q,uBody);
  float lan=exp(-length((q-uBody.xy-vec2(-.15,-.25)*uBody.zw)/uBody.zw)*1.4);
  vec2 hb=q-(uBody.xy+vec2(0.,.1)*uBody.zw); float br=length(hb), ba=atan(hb.y,hb.x);
  vec2 hh=hair(br,ba+rot,120.,7.,260.,420.,2.4);
  vec3 inner=HX(255.,196.,60.)*.50+HX(255.,250.,225.)*.45*lan+spec(hh.y)*hh.x*.35;
  inner+=HX(255.,255.,240.)*.45*smoothstep(-40.,0.,bm.x)*smoothstep(4.,-2.,bm.x);
  col=mix(col,inner,bm.y);
  float fl=exp(-uLt*9.)*step(0.,uLt);                                   // sun-flare whiteout into the drop
  col=mix(col,HX(255.,250.,235.)*1.4,fl*.85*smoothstep(2200.,0.,r));
  o=vec4(col,1.);
}`;
  function confetti(ctx, t, S, Q, amt) {
    // light confetti: short spectral dashes thrown outward, a new volley on every 16th (0.1875 s)
    const cols = ['#ffe600', '#ff8a00', '#ff3d9a', '#b6ff3b', '#3de7ff', '#ffffff', '#9b5cff'];
    const n16 = Math.floor((t - 36) / 0.1875), p = new Path2D(), groups = cols.map(() => new Path2D());
    for (let v = Math.max(0, n16 - 4); v <= n16; v++) {
      const age = (t - 36) - v * 0.1875;
      for (let i = 0; i < 9; i++) {
        const sd = v * 31.7 + i * 7.13, a = LX.hash(sd) * TAU;
        const r = 230 + age * (900 + 700 * LX.hash(sd + 1)), len = 26 + 30 * LX.hash(sd + 2);
        const g = groups[i % cols.length];
        g.moveTo(S[0] + Math.cos(a) * r, S[1] + Math.sin(a) * r); g.lineTo(S[0] + Math.cos(a) * (r + len), S[1] + Math.sin(a) * (r + len));
      }
    }
    Q.push(g => { g.lineWidth = 16; groups.forEach((gp, i) => { g.strokeStyle = cols[i]; g.stroke(gp); }); });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.globalAlpha = amt;
    ctx.lineWidth = 6; groups.forEach((gp, i) => { ctx.strokeStyle = cols[i]; ctx.stroke(gp); });
    ctx.restore();
  }
  add(36, 42.75, (t, ctx) => {
    const lt = t - 36;
    const burst = lt < 0 ? 0 : Math.max(Math.exp(-2.5 * lt) * 1.0, 0.62) * (lt < 1 / 30 ? 0.6 : 1);
    const G = CH.pose(t, {
      cx: 540, cy: 760, s: 300, squash: -0.04 - 0.1 * Math.exp(-lt * 7) * Math.cos(lt * 18), boil: boilF(t, 2), amp: 1.4,
      arm: { ext: 1, tx: 775, ty: 545, open: 1, sag: -0.05, ang: -1.0 },
      eyes: 'happy', mouth: 'grin', blush: 0.6,
    });
 lightPass(t, P.drop, { uBody: U(G), uBurst: burst, uLt: lt }, { bloomK: 0.3, bleed: 0.2, sat: 1.05, thresh: 0.95 });
    const Q = [];
    confetti(ctx, t, [G.cx, G.cy], Q, 1);
    const st = { line: '#fffdf2', halo: '#ff8a00', fill: ['#ffffff', 0], lw: 7, ink: '#1d1a7a', handFill: '#ffd86b', handHalo: '#ff8a00', handAlpha: 0.45, glowW: 2.2, blushCol: '#ff3d9a', op: 'source-over' };
    const Hh = CH.draw(ctx, G, st, Q);
    CH.drawHand(ctx, Hh, st, Q);
    const L = TY.line('V22');
    // the line is written in light on the downbeat (36.0) and each word blazes when spoken (37.5-38.6)
    const lit = TY.lit(t, L.word_t, { pre: 0.0 });
    const words = TY.layout(ctx, [
      { words: ['turns', 'out'], size: 118, y: 205 },
      { words: ['the', 'joy', 'was', 'free.'], size: 118, y: 340 },
    ], serif);
    TY.pane(ctx, 540, 262, 640, 230, '#100a5e', 0.45 * (1 - Math.exp(-lt * 9)));
    const free = words.pop();
    TY.light(ctx, words, lit, Q, { core: '#ffffff', halo: '#3de7ff', glass: '#ffffff', glassA: 0.75, glassFill: 0.55, haloA: 0.9 });
    TY.neon(ctx, [free], lit, Q, { core: '#fff6fb', halo: '#ff2f9e', edge: '#ff3d9a', split: 0.02, haloA: 1, glass: '#ffffff', glassA: 0.8 });
    flushGlow(ctx, Q, { alpha: 0.5, wideA: 0.5 });
    CH.face(ctx, G, st, null);
    watermark(ctx);
  });

  // ================================================================== 42.75-49.5  metta: "love him open."
  // Raspberry dusk. An open ensō drawn with a dry brush whose every bristle is a line of gold light;
  // soft rays curl out of his chest into petals; an af Klint rosette of overlapping translucent circles
  // (the vesica petals exist only where the circles overlap). He hugs the knot, which is calmer now.
  const METTA_FS = `
uniform vec4 uBody; uniform vec3 uEnso; uniform vec2 uHeart; uniform vec3 uKnot; uniform float uDraw, uBoil;
void main(){
  vec2 q=canvasPx(vUv); float vy=q.y/1350.;
  vec3 col=mix(HX(52.,10.,70.), HX(128.,24.,88.), smoothstep(.0,.95,vy));
  col=mix(col,HX(190.,48.,92.),smoothstep(.75,1.,vy)*.6);
  vec2 d=q-uHeart; float r=length(d), a=atan(d.y,d.x);
  float curl=.42*sin(r*.0065-lph(2.));
  vec2 h1=hair(r,a+curl,130.,3.,520.,1100.,2.8);
  vec3 hc=h1.y<.5?HX(255.,190.,60.):h1.y<.8?HX(255.,110.,160.):HX(255.,236.,180.);
  col+=hc*h1.x*.30*smoothstep(1000.,60.,r)*smoothstep(uBody.w*.8,uBody.w*1.2,length(q-uBody.xy));
  col+=HX(255.,110.,90.)*.12*exp(-r/430.);
  vec2 e=q-uEnso.xy; float er=length(e), ea=atan(e.y,e.x);
  float a0=2.15, span=TAU*.885;
  float sp=fract((ea-a0)/TAU)*TAU/span;
  float wbr=mix(120.,50.,smoothstep(0.,1.,sp))*(1.+.12*sin(sp*5.));
  float wob=7.*sin(sp*7.+1.)+4.*sin(sp*17.);
  float rr=(er-uEnso.z-wob)/wbr;
  float nb=17.; float u=(rr+.5)*nb; float bi=floor(u); float bf=fract(u)-.5;
  float hb=h11(bi*3.7+1.), hb2=h11(bi*7.3+2.);
  float bpx=wbr/nb;
  float prof=exp(-pow(bf*bpx/(.9+1.7*hb),2.));
  float endS=.80+.2*hb-.3*abs(rr);
  float startS=.035*hb2;
  float along=smoothstep(startS,startS+.025,sp)*smoothstep(endS,endS-.05,sp)*smoothstep(uDraw,uDraw-.015,sp);
  float inside=step(abs(rr),.5);
  float inkB=smoothstep(.5,.3,abs(rr))*smoothstep(endS-.02,endS-.3,sp);
  vec3 gold=HX(255.,190.,50.), cream=HX(255.,240.,190.);
  vec3 enso=(mix(gold,cream,hb*hb)*prof*1.0+HX(255.,150.,30.)*.20*inkB)*along*inside;
  enso+=HX(255.,120.,40.)*.12*exp(-abs(rr)*2.)*along*smoothstep(.9,.45,abs(rr));
  col+=enso;
  vec2 bm=bodyMask(q,uBody);
  float lan=exp(-length((q-uBody.xy-vec2(-.15,-.25)*uBody.zw)/uBody.zw)*1.6);
  vec2 hb3=q-uHeart; float br=length(hb3), ba=atan(hb3.y,hb3.x);
  vec2 hh=hair(br,ba+.3*sin(br*.02),110.,9.,180.,330.,2.4);
  vec3 inner=HX(200.,52.,100.)*.44+HX(255.,130.,160.)*.28*lan+HX(255.,200.,90.)*hh.x*.55;
  inner+=HX(255.,180.,200.)*.28*smoothstep(-55.,0.,bm.x)*smoothstep(4.,-2.,bm.x);
  col=mix(col,inner,bm.y);
  float cnt=0., rim=0.;
  for(int i=0;i<6;i++){ float th=float(i)/6.*TAU+lph(1.)*.5; vec2 c=uHeart+vec2(cos(th),sin(th))*30.;
    float dd=length(q-c)-44.; cnt+=smoothstep(1.2,-1.2,dd); rim+=exp(-abs(dd)/1.3); }
  col+=HX(255.,110.,170.)*.10*min(cnt,1.)+HX(255.,190.,60.)*.16*clamp(cnt-1.,0.,1.)+HX(255.,240.,200.)*.16*clamp(cnt-2.,0.,2.)+HX(255.,226.,236.)*rim*.12*bm.y;
  col=knotShade(col,q,uKnot,uBoil,.6,bm.y);
  o=vec4(col,1.);
}`;
  add(42.75, 49.5, (t, ctx) => {
    const G = CH.pose(t, {
      cx: 520, cy: 915, s: 280, boil: boilF(t, 4), amp: 0.9,
      arm: { ext: 1, tx: 640, ty: 1010, open: 0.35, sag: 0.0, ang: -0.95 },
      eyes: 'closed', mouth: 'smile', blush: 0.9,
    });
    const knot = [690, 960, 66];
    const heart = [G.cx - 10, G.cy + 55];
    const draw = E.easeOutCubic(E.range(t, 43.2, 46.2)) * 1.0;
    lightPass(t, P.metta, { uBody: U(G), uEnso: [540, 880, 380], uHeart: heart, uKnot: knot, uDraw: draw, uBoil: boilF(t, 3) }, { bloomK: 0.36, bleed: 0.25, thresh: 0.6 });
    const Q = [];
    const st = { line: '#fff0f4', halo: '#ff5f9f', fill: ['#ff8fb1', 0], lw: 6, ink: '#3a0b3a', handFill: '#ff9fc0', handHalo: '#ff8fb1', handAlpha: 0.3, glowW: 2, blushCol: '#ff5fa2', op: 'source-over' };
    const Hh = CH.draw(ctx, G, st, Q);
    CH.drawHand(ctx, Hh, st, Q);
    const C = TY.line('C6');
    const lit = TY.lit(t, C.word_t);
    const words = TY.layout(ctx, [{ words: ['love', 'him', 'o', 'pen.'], size: 138, y: 300 }], serif);
    // join "o" + "pen." (one word, two sung syllables)
    const shift = words[3].x - (words[2].x + words[2].width); words[3].x -= shift; words.forEach((w, i) => { if (i < 4) w.x += shift / 2; });
    TY.pane(ctx, 540, 255, 560, 140, '#2a0630', 0.4);
    TY.light(ctx, words, lit, Q, { core: '#fff3c4', halo: '#ff6f9f', glass: '#ffd6e4', glassA: 0.7, glassFill: 0.2 });
    flushGlow(ctx, Q, { alpha: 0.6 });
    CH.face(ctx, G, st, null);
    watermark(ctx);
  });

  // ================================================================== 49.5-60  rest: "just come back."
  // Moon Room night: a pearl moon made of fine slowly turning rays, a sparse pool-line reflection column,
  // grabbygrab as a pearl outline, eyes closed, the knot now a small pearl light resting in his open palm.
  const REST_FS = `
uniform vec4 uBody; uniform vec3 uMoon; uniform vec3 uOrb; uniform float uRot;
void main(){
  vec2 q=canvasPx(vUv); float vy=q.y/1350.;
  vec3 col=mix(HX(12.,18.,66.), HX(26.,36.,118.), smoothstep(0.,1.,vy));
  vec2 d=q-uMoon.xy; float r=length(d), a=atan(d.y,d.x)+uRot;
  vec3 pearl=HX(244.,239.,216.), lil=HX(159.,180.,255.);
  vec2 h=hair(r,a,170.,5.,uMoon.z*.9,uMoon.z*1.7,2.4);
  col+=mix(pearl,lil,h.y)*h.x*.75*smoothstep(uMoon.z*.4,uMoon.z*.55,r);
  vec2 h3=hair(r,a+.01,90.,29.,uMoon.z*1.4,uMoon.z*2.6,3.);
  col+=mix(lil,pearl,h3.y)*h3.x*.35*smoothstep(uMoon.z*.45,uMoon.z*.7,r);
  vec2 hl=hair(r,a,36.,17.,1100.,1900.,2.);
  col+=lil*hl.x*.06*smoothstep(uMoon.z*.6,uMoon.z*1.4,r);
  col+=pearl*.62*smoothstep(uMoon.z*.5,uMoon.z*.47,r)*(.9+.1*vn(d/18.));
  col+=lil*.16*exp(-max(r-uMoon.z*.5,0.)/70.)+HX(60.,80.,200.)*.12*exp(-r/520.);
  float hz=1105.;
  if(q.y>hz){
    col=mix(col,HX(14.,30.,96.),.6);
    float n=hockLines(vec2(q.x*.8,q.y*1.4),40.,lph(3.),2.2,2.);
    float colm=exp(-abs(q.x-uMoon.x)/110.);
    col+=mix(lil,pearl,colm)*n*(.07+.6*colm)*smoothstep(hz,hz+30.,q.y);
    col+=pearl*.45*exp(-(q.y-hz)/2.);
  }
  vec2 bm=bodyMask(q,uBody);
  vec2 hb=q-(uBody.xy+vec2(0.,uBody.w*.15)); float br=length(hb), ba=atan(hb.y,hb.x);
  vec2 hh=hair(br,ba+uRot*.5,110.,9.,300.,600.,2.2);
  float lan=exp(-length((q-uBody.xy-vec2(-.15,-.25)*uBody.zw)/uBody.zw)*1.5);
  vec3 inner=HX(40.,50.,140.)*.6+HX(159.,180.,255.)*.16*lan+mix(pearl,lil,hh.y)*hh.x*.38;
  inner+=pearl*.20*smoothstep(-50.,0.,bm.x)*smoothstep(4.,-2.,bm.x);
  col=mix(col,inner,bm.y);
  vec2 od=q-uOrb.xy; float orr=length(od);
  col+=pearl*1.0*smoothstep(uOrb.z,uOrb.z*.8,orr)+HX(255.,190.,215.)*.30*exp(-orr/(uOrb.z*1.5))+lil*.18*exp(-orr/(uOrb.z*4.));
  o=vec4(col,1.);
}`;
  add(49.5, 60, (t, ctx) => {
    const G = CH.pose(t, {
      cx: 430, cy: 905, s: 290, boil: 0, amp: 0.7,
      arm: { ext: 1, tx: 640, ty: 1012, open: 0.85, sag: 0.08, ang: -0.55 },
      eyes: 'closed', mouth: 'smile',
    });
    const orb = [G.hand[0] + 34, G.hand[1] - 34, 24];
    const rot = (t - 49.5) * 1.5 * Math.PI / 180;
    lightPass(t, P.rest, { uBody: U(G), uMoon: [790, 290, 120], uOrb: orb, uRot: rot }, { bloomK: 0.4, bleed: 0.25, thresh: 0.5 });
    const Q = [];
    const st = { line: '#f4efd8', halo: '#7f9cff', fill: ['#9fb4ff', 0], lw: 5.5, ink: '#0e1450', handFill: '#9fb4ff', handHalo: '#9fb4ff', handAlpha: 0.22, glowW: 2, op: 'source-over' };
    const Hh = CH.draw(ctx, G, st, Q);
    CH.drawHand(ctx, Hh, st, Q);
    const L = TY.line('V33');
    const lit = TY.lit(t, L.word_t, { lead: 0.1 });
    const words = TY.layout(ctx, [{ words: ['just', 'come', 'back.'], size: TY.fit(ctx, ['just come back.'], serif, 132, 880), y: 600 }], serif);
    TY.light(ctx, words, lit, Q, { core: '#f4efd8', halo: '#7f9cff', glass: '#c9d4ff', glassA: 0.7, glassFill: 0.25 });
    flushGlow(ctx, Q, { alpha: 0.65 });
    CH.face(ctx, G, st, null);
    watermark(ctx, 'rgba(244,239,216,0.5)');
  });

  RS.onInit(() => {
    P.guy = prog(GUY_FS); P.unc = prog(UNC_FS); P.sky = prog(SKY_FS); P.drop = prog(DROP_FS); P.metta = prog(METTA_FS); P.rest = prog(REST_FS);
  });
})();
