// V2 core: the light stack (LOOK.md 2.1, 2.6, 5.3).
//   pane (Canvas2D 540x675, callers draw in 1080x1350 units)  ->  one scene GL program (built from chunks) into an
//   HDR target  ->  bloom (dual Kawase, 5 levels)  ->  composite (hue-keeping soft shoulder, saturation, beat pulse,
//   tape-stop lean, tinted vignette, luminance grain)  ->  present (upscaled into the 1080x1350 2D canvas).
// No uber-shader: chunks are GLSL strings with dependencies; V2.L.program(key, chunks, main) builds a short program.
// Every uniform a program declares is set on every pass (defaults are parsed from the source), so a frame never
// depends on what an earlier frame left in a program's uniform state (determinism across workers).
(function () {
  const V2 = window.V2 = window.V2 || {};
  const L = V2.L = {};
  const GW = 540, GH = 675;
  L.GW = GW; L.GH = GH;

  const HEAD = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform vec2 uRes;
`;

  // =====================================================================================================  CHUNKS
  const CH = L.CH = {};
  const chunk = (name, deps, src) => { CH[name] = { name, deps, src }; };

  chunk('COMMON', [], `
uniform float uT, uF, uPx;          // time (s, 0..60), frame (0..1799), canvas px per light px (2)
#define TAU 6.28318530718
#define PI 3.14159265359
const vec2 CV=vec2(1080.,1350.);
vec2 canvasPx(vec2 uv){ return vec2(uv.x,1.-uv.y)*CV; }       // GL uv (y up) -> canvas px (y down)
vec2 toUV(vec2 P){ return vec2(P.x/CV.x,1.-P.y/CV.y); }
float h11(float p){ p=fract(p*.1031); p*=p+33.33; p*=p+p; return fract(p); }
float h12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2 h22(vec2 p){ vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h12(i),h12(i+vec2(1,0)),f.x),mix(h12(i+vec2(0,1)),h12(i+1.),f.x),f.y); }
vec3 HX(float r,float g,float b){ return pow(vec3(r,g,b)/255.,vec3(2.2)); }   // sRGB 0..255 -> linear
float lum(vec3 c){ return dot(c,vec3(.2126,.7152,.0722)); }
vec3 hue(float x){ x=fract(x); return clamp(vec3(abs(x*6.-3.)-1.,2.-abs(x*6.-2.),2.-abs(x*6.-4.)),0.,1.); }
vec3 spec(float x){                                              // prism spectrum: 0 red .. 1 violet, dark at the ends
  x=clamp(x,0.,1.);
  vec3 c=vec3(smoothstep(.45,.0,abs(x-.05))+smoothstep(.25,.0,abs(x-.95))*.7, smoothstep(.32,.0,abs(x-.42)), smoothstep(.32,.0,abs(x-.80)));
  return c*1.25; }
float sdEll(vec2 p, vec2 r){ float k0=length(p/r); float k1=length(p/(r*r)); return k0*(k0-1.)/max(k1,1e-4); }
float sdCap(vec2 p, vec2 a, vec2 b, float r){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-4),0.,1.); return length(pa-ba*h)-r; }
float sdRBox(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.))+min(max(q.x,q.y),0.)-r; }
float lph(float n){ return TAU*n*uT/60.; }                       // loop-safe phase: n whole cycles per 60 s
float cover(float d){ return clamp(.5-d/uPx,0.,1.); }            // AA coverage of a signed distance (canvas px, inside < 0)
vec3 screen(vec3 c, vec3 f){ return c+f*(1.-min(c,vec3(1.))); }    // HDR-safe screen blend
`);

  chunk('PANE', ['COMMON'], `
uniform sampler2D uPane;
vec3 dec(vec3 c){ return c*c*(c*.35+.65); }                      // cheap sRGB -> linear
vec3 pane(vec2 P){ return dec(texture(uPane,toUV(P)).rgb); }
`);

  chunk('LENS', ['COMMON', 'PANE'], `
uniform vec4 uBody; uniform float uLens;     // body ellipse cx,cy,bw,bh (canvas px), refraction strength
uniform vec4 uBody2; uniform float uLens2;   // second lens (cloud, jewel)
uniform vec2 uDispC; uniform float uDisp;    // global chromatic dispersion around a light centre
float lensQ(vec2 P, vec4 B){ vec2 q=(P-B.xy)/max(B.zw,vec2(1.)); return dot(q,q); }     // < 1 inside
// refracted sample position for channel k (0 r, 1 g, 2 b): magnified centre, compressed rim, per-channel bend
vec2 lensPos(vec2 P, vec4 B, float Ls, float k){
  float d2=lensQ(P,B); float h=sqrt(max(1.-d2,0.));
  float mag=1.-Ls*.42*h, bend=Ls*.30*pow(1.-h,1.5);
  float kk=k<.5?1.10:(k<1.5?1.0:.86);
  return B.xy+(P-B.xy)*(mag+bend*kk-(k>1.5?.03*Ls:0.)); }
vec3 lensPane(vec2 P){
  if(uLens>0. && lensQ(P,uBody)<1.) return vec3(pane(lensPos(P,uBody,uLens,0.)).r, pane(lensPos(P,uBody,uLens,1.)).g, pane(lensPos(P,uBody,uLens,2.)).b);
  if(uLens2>0. && lensQ(P,uBody2)<1.) return vec3(pane(lensPos(P,uBody2,uLens2,0.)).r, pane(lensPos(P,uBody2,uLens2,1.)).g, pane(lensPos(P,uBody2,uLens2,2.)).b);
  if(uDisp>0.){ vec2 d=P-uDispC; return vec3(pane(uDispC+d*(1.+uDisp)).r, pane(P).g, pane(uDispC+d*(1.-uDisp)).b); }
  return pane(P); }
`);

  chunk('BODY', ['COMMON', 'LENS', 'RAYS'], `
// grabbygrab's glass in GL: filter (the world through the fill hue, hue^density) -> the glass's own colour (opacity)
// with a luminance floor in it (never grey or brown) -> screen (clear glass brighter than the sky) -> lobes as
// coloured filters (translucent films) -> hue-keeping saturation lift -> caustic, fresnel rim, ray fibres. Apply after the lens:
// c = bodyGlass(P, c). Uniforms come from V2.grab.uniforms(G, mood).
uniform vec4 uBodyFill;      // filter transmission rgb (linear: nhue(fill)^density, computed by V2.grab.uniforms), density
uniform vec4 uBodyE;         // glass colour rgb (linear), opacity (mix toward it; also sets a luminance floor)
uniform vec4 uBodyK;         // lobe strength, fresnel rim, caustic, screen amount
uniform vec3 uBodyLobe[3];   // lobe transmissions (linear, nhue(lobe)^.6 x 1.15)
uniform vec4 uBodyF;         // fibre focus x,y (canvas px), fibre alpha, saturation lift
uniform vec4 uBodyV;         // show-through: amount, low (value where the world behind is dark), high (where it is bright),
                             // unused. 0 = off. The world's structure (blade boundaries, leads) shows inside him: over a
                             // bright world his glass brightens, over a dark one it turns to its DEEP hue (uBodyD, an
                             // analogous darker hue at the same luminance), never to a darker amber (that is brown)
uniform vec3 uBodyD;         // deep glass colour (linear; V2.grab.uniforms: V2.deepHex(glow, .5))
vec3 nhue(vec3 c){ return c/max(max(c.r,c.g),max(c.b,1e-3)); }
vec3 bodyGlass(vec2 P, vec3 c){
  vec2 q=(P-uBody.xy)/max(uBody.zw,vec2(1.)); float d2=dot(q,q);
  if(d2>=1.03) return c;
  float d=sqrt(d2);
  float wl=sqrt(max(lum(c),0.));                                              // the world seen through him (refracted)
  vec2 lq=(P-uBody.xy)/max(uBody.z,1.);
  float th=mix(.9,1.3,smoothstep(.6,1.,d));                                  // thicker glass toward the rim
  float lit=1.-.25*smoothstep(.2,1.3,length(q-vec2(-.30,-.34)));               // lit from the upper left
  vec3 o2=c*uBodyFill.rgb*mix(vec3(1.),uBodyFill.rgb,clamp(th-.9,0.,.4)*uBodyFill.w);   // 1 filter: transmission (hue^density, from JS), deeper at the rim
  vec3 eh=uBodyE.rgb; float op=clamp(uBodyE.w*th,0.,.9);
  o2=mix(o2,eh*lit,op);                                                        // 2 the glass's own colour (scattered
  o2+=eh*max(op*.9*lit-lum(o2),0.)/max(lum(eh),1e-3);                          //   light) + a luminance floor in it
  o2=screen(o2,eh*uBodyK.w*lit);                                               // 3 clear glass (brighter than the sky)
  float ar=uBody.w/uBody.z;                                                    // 4 lobes: coloured filters
  float m0=smoothstep(.62,.08,length(lq-vec2(-.34,.30*ar))), m1=smoothstep(.58,.08,length(lq-vec2(.32,.14*ar))), m2=smoothstep(.55,.08,length(lq-vec2(.02,-.40*ar)));
  o2*=mix(vec3(1.),uBodyLobe[0],m0*uBodyK.x);                                 //   (lobe transmissions from JS)
  o2*=mix(vec3(1.),uBodyLobe[1],m1*uBodyK.x);
  o2*=mix(vec3(1.),uBodyLobe[2],m2*uBodyK.x);
  float l=lum(o2); o2=max(mix(vec3(l),o2,uBodyF.w),0.);                        // 5 saturation lift
  if(uBodyV.x>0.){                                                             // 6 show-through
    float tw=clamp(wl/.72,0.,1.5), kk=uBodyV.x*smoothstep(.98,.80,d);
    vec3 dp=uBodyD*lum(o2)/max(lum(uBodyD),1e-3);
    o2=mix(o2,dp*mix(uBodyV.y,1.,tw),kk*(1.-min(tw,1.)));
    o2*=1.+(uBodyV.z-1.)*kk*clamp((tw-.55)/.6,0.,1.); }
  vec2 cq=(q-vec2(.10,.64))/vec2(.60,.22);                                      // caustic crescent (#FFF3C4)
  o2+=HX(255.,243.,196.)*.22*uBodyK.z*smoothstep(1.,0.,length(cq));
  o2+=mix(eh,vec3(1.),.35)*uBodyK.y*smoothstep(.82,1.,d)*.8;                    // fresnel rim
  if(uBodyF.z>0.){ vec2 fd=P-uBodyF.xy; float fr=length(fd);
    vec2 h=hair(fr,atan(fd.y,fd.x),30.,4.,4000.,4001.,2.6);
    o2+=mix(eh,vec3(1.),.5)*h.x*uBodyF.z*smoothstep(.99,.85,d)*smoothstep(20.,80.,fr); }
  return mix(c,o2,smoothstep(1.03,.99,d2)); }
`);

  chunk('HAND_SDF', ['COMMON'], `
uniform vec4 uPalm;      // palm centre x,y, half extents along / across the hand (canvas px)
uniform vec4 uPalmR;     // cos(ang), sin(ang), corner radius, on (0/1)
uniform vec4 uFingA[6];  // capsules a.xy, b.xy: thumb, index, middle, ring, pinky, spare
uniform float uFingR[6]; // capsule radii (0 = off)
float sdHand(vec2 P){
  if(uPalmR.w<.5) return 1e5;
  vec2 d=P-uPalm.xy; vec2 l=vec2(dot(d,uPalmR.xy), dot(d,vec2(-uPalmR.y,uPalmR.x)));
  float s=sdRBox(l,uPalm.zw,uPalmR.z);
  for(int i=0;i<6;i++){ if(uFingR[i]>0.) s=min(s,sdCap(P,uFingA[i].xy,uFingA[i].zw,uFingR[i])); }
  return s; }
`);

  chunk('RAYS', ['COMMON'], `
uniform float uTint;     // how strongly light takes the colour of the glass it crosses (LOOK 2.1 LIGHT)
// light that crosses a pane takes its hue: ray * mix(1, paneColour*1.6, uTint)
vec3 tintBy(vec3 ray, vec3 glass){ return ray*mix(vec3(1.),glass*1.6,uTint); }
// hairline rays from a source: N angular bins, one jittered ray per bin, CONSTANT canvas-px width (wpx).
// returns vec2(intensity, colour hash). Read-carrying rays: wpx >= 5 (2.5 light px).
vec2 hair(float r, float a, float N, float seed, float len0, float len1, float wpx){
  float u=a/TAU*N+seed; float id=floor(u); float f=fract(u)-.5;
  float h1=h11(id+seed*7.13), h2=h11(id*1.71+seed*3.1), h3=h11(id*2.31+seed*11.7), h4=h11(id*3.17+seed*5.3);
  float binPx=TAU*r/N;
  float dpx=abs(f-(h1-.5)*.55)*binPx;
  float w=max(wpx*(.75+.7*h2), uPx*.6);                       // .75x to 1.45x of wpx (mean 1.1x): wpx 5 never falls under a 3.7 px core
  float prof=exp(-dpx*dpx/(w*w));
  prof*=smoothstep(.8*uPx, 3.*uPx, binPx);
  float len=mix(len0,len1,h3*h3);
  float I=(.25+.75*h4)*smoothstep(len,len*.25,r);
  I*=.6+.4*sin(lph(floor(10.+24.*h1))+h2*20.);
  return vec2(prof*I, fract(h4*7.31+h1*3.71)); }
// parallel rays along direction dir (unit): spacing px, constant width; returns vec2(intensity, hash)
vec2 hairPar(vec2 P, vec2 dir, float spacing, float seed, float wpx){
  vec2 nrm=vec2(-dir.y,dir.x); float x=dot(P,nrm)/spacing+seed; float id=floor(x); float f=fract(x)-.5;
  float h1=h11(id*1.37+seed), h2=h11(id*2.91+seed*1.7), h4=h11(id*4.13+seed*.3);
  float dpx=abs(f-(h1-.5)*.6)*spacing; float w=max(wpx*(.5+1.1*h2), uPx*.6);
  float I=(.3+.7*h4)*(.65+.35*sin(lph(floor(6.+12.*h1))+h2*17.));
  return vec2(exp(-dpx*dpx/(w*w))*I, fract(h4*5.13+h1)); }
// soft wedge beams with angular width: K bins, duty = lit fraction
vec2 beams(float a, float K, float seed, float duty, float soft){
  float u=a/TAU*K+seed; float id=floor(u); float f=fract(u);
  float h=h11(id*3.31+seed), h2=h11(id*7.17+seed*1.3);
  float w=duty*(.55+.9*h); float d=abs(f-.5-(h2-.5)*.3)*2.;
  return vec2(smoothstep(w+soft,w-soft,d)*(.35+.65*h2), h11(id*5.7+seed*2.1)); }
// crisp-edged sunburst wedge (duty = lit fraction of each bin, soft edge in px)
float wedge(float a, float r, float K, float rot, float duty, float softPx){
  float f=fract((a+rot)/TAU*K)-.5; float dpx=abs(f)*TAU*r/K, hw=duty*.5*TAU*r/K;
  return smoothstep(hw+softPx,hw-softPx,dpx); }
`);

  chunk('DASHES', ['COMMON', 'RAYS'], `
// along-ray dashes moving in (dir=+1) or out (dir=-1); n = whole cycles per 60 s (loop-safe)
// (n is rounded to a whole number inside, so any speed is loop-safe)
float dashes(float r, float k, float n, float dir, float ph, float duty){
  float s=.5+.5*sin(r*k+dir*lph(floor(n+.5))+ph); return smoothstep(1.-duty-.15,1.-duty+.15,s); }
// cold dashes streaming INTO C (a vortex drain). R: inner radius (nothing inside), spd: cycles per 60 s (integer),
// twist: vortex amount, reach: falloff px, boil: jitter seed, dens: density. Returns linear rgb (untinted, x intensity)
vec3 inflow(vec2 P, vec2 C, float R, float spd, float twist, float reach, float boil, float dens){
  vec2 kd=P-C; float kr=length(kd), ka=atan(kd.y,kd.x);
  float tw=twist*(1.3*exp(-kr/270.)+.14*exp(-kr/1100.));
  float a=ka+tw+.010*sin(kr*.011+h11(boil)*TAU)+.006*sin(kr*.029-h11(boil+1.)*TAU);
  float lr=log(max(kr,1.));
  // fewer, crisper dashes: one family of read-carrying hairlines (core >= 5 canvas px), no fine decorative family
  vec2 r1=hair(kr,a,floor(64.*dens),3.,700.,1900.,6.8);
  float d1=dashes(lr,16.,spd,1.,r1.y*TAU,.5);
  float rim=smoothstep(R*.97,R*1.10,kr);
  float near=(.06+1.25*exp(-kr/reach)+.9*exp(-max(kr-R,0.)/(.45*R)))*rim;     // brightest right at the edge it falls into
  vec3 c1=r1.y<.4?HX(232.,247.,255.):(r1.y<.7?HX(61.,245.,255.):HX(198.,163.,255.));
  return c1*r1.x*(.06+.94*d1)*.95*near; }
// dashes streaming OUT of C (bursts, dawn): same parameters
vec3 outflow(vec2 P, vec2 C, float R, float spd, float reach, float seed, float dens){
  vec2 kd=P-C; float kr=length(kd), ka=atan(kd.y,kd.x);
  vec2 r1=hair(kr,ka,floor(80.*dens),seed,800.,1900.,6.);
  float d1=dashes(kr,.014,spd,-1.,r1.y*TAU,.6);
  float rim=smoothstep(R,R*1.3,kr);
  return vec3(1.)*r1.x*(.12+.88*d1)*(.1+exp(-kr/reach))*rim; }
`);

  chunk('SQUIGGLE', ['COMMON'], `
// Hockney pool squiggles: iso-lines of a domain-warped sine field (smooth, rounded; never Voronoi).
uniform vec4 uSq;      // scale px (sky preset 320), line width px, cycles per 60 s (rounded: loop-safe), second-family scale ratio
uniform vec4 uSqI;     // family A intensity, family B intensity (sky preset .6), white-core strength, unused
uniform vec4 uSqRev;   // family A reveal 0..1, family B reveal 0..1, reveal origin x, y (draws on outward)
uniform vec3 uSqA0, uSqA1, uSqB0, uSqB1;   // A: white / lemon, B: pink / lilac (linear)
// every time term is a whole multiple of one loop-safe base phase (ph, -ph, 2ph): the field repeats exactly every 60 s
float sqF(vec2 q, float sc, float ph, float seed){
  vec2 p=q/sc+seed;
  p+=.42*vec2(sin(p.y*1.7+ph+seed), sin(p.x*1.9-ph));
  p+=.22*vec2(sin(p.y*3.1-2.*ph), sin(p.x*2.7+ph+seed*.5));
  return sin(2.*p.x)+sin(2.6*p.y+sin(1.4*p.x+seed)); }
// one family: soft coloured line, width 0.5x..1.5x along its length, white core. Returns rgb (linear).
vec3 sqFam(vec2 P, float sc, float ph, float seed, float wpx, vec3 c0, vec3 c1, float coreK){
  float f=sqF(P,sc,ph,seed);
  float g=length(vec2(dFdx(f),dFdy(f)))/uPx+1e-4;
  float d=abs(f)/g;
  float wv=wpx*(.5+1.0*vn(P/260.+seed*3.));
  float prof=exp(-d*d/(wv*wv)*1.4);
  float core=smoothstep(wv*.42,wv*.12,d);
  vec3 col=mix(c0,c1,smoothstep(.35,.65,vn(P/340.+seed*7.)));
  return col*prof+vec3(1.)*core*coreK; }
float sqReveal(vec2 P, float k){ float R=k*1900.; return smoothstep(R+90.,R-90.,length(P-uSqRev.zw)); }
vec3 squiggles(vec2 P){
  float ph=lph(floor(uSq.z+.5));
  vec3 a=sqFam(P,uSq.x,ph,1.7,uSq.y,uSqA0,uSqA1,uSqI.z)*uSqI.x*sqReveal(P,uSqRev.x);
  vec3 b=sqFam(P+vec2(137.,-61.),uSq.x*uSq.w,1.3-ph,5.3,uSq.y*.8,uSqB0,uSqB1,uSqI.z*.8)*uSqI.y*sqReveal(P,uSqRev.y);
  return a+b; }
`);

  chunk('IRIS', ['COMMON'], `
// colour-glass iris: 9 tangent blades around an aperture, stacked like a camera iris (each blade over the next), so
// every blade's leading edge is visible from the aperture out to the frame: a spiral pinwheel of flat luminous glass.
// Each blade is brightest along its leading edge and toward the aperture (the light is being pulled in).
uniform vec4 uIris;      // centre x,y, aperture inradius R (px), twist (rad)
uniform vec4 uIrisB;     // blade back length L (px), alpha (glass over ground), lift (brightness), tight darken 0..1
uniform vec4 uIrisC;     // edge light, aperture-edge glow, body brightness, edge band width px
uniform vec3 uIrisCol[9];
uniform vec4 uIrisC2;    // overlap: strength, band width px, band softness px, GL lead came width px (0 = none)
uniform vec3 uIrisOv[9]; // overlap colour per top blade (V2.L.irisOv(cols))
uniform vec4 uIrisD;     // value falloff: distance px, amount (0 = flat blades), leading-edge band px, aperture glow reach px (140)
uniform vec3 uIrisDeep[9];  // per-blade deep colour (analogous darker hue, V2.L.irisDeep(cols)); never a mix to black
uniform vec3 uIrisOvD[9];   // deep overlap colours (V2.L.irisOv(V2.L.irisDeepHex(cols)))
uniform vec2 uIrisN[9];  // blade normals (cos, sin of twist + i*TAU/9), precomputed by V2.L.irisN(twist)
// returns coverage (0 inside the aperture). col: blade light (linear). topCol: the top blade colour (tints the rays).
// After a call, irisAlpha holds the glass opacity to blend the blade over its ground with: uIrisB.y near the aperture,
// denser (up to .92) toward the frame edges where the colour deepens, so the deep hues never wash out to salmon.
//   glass = mix(ground, col, irisAlpha); c = mix(apertureGround, glass, coverage)
float irisAlpha;
float iris(vec2 P, out vec3 col, out vec3 topCol){
  irisAlpha=uIrisB.y;
  // closed form (no loop): the top blade is the one whose leading edge is the next one ahead in angle.
  // With A = acos(R/r), blade k covers P iff its angle offset al = th - twist - k*W lies in (max(-A, -asin(L/r)), A];
  // the top blade has the largest such al: k = ceil((th - twist - A) / W).
  col=vec3(0.); topCol=vec3(0.);
  vec2 d=P-uIris.xy; float r=length(d);
  if(r<=uIris.z-uPx) return 0.;
  float th=atan(d.y,d.x), W=TAU/9.;
  float A=acos(clamp(uIris.z/max(r,1e-3),0.,1.));
  float k=ceil((th-uIris.w-A)/W);
  float al=th-uIris.w-k*W;
  float lim=-asin(clamp(uIrisB.x/max(r,1e-3),0.,1.));
  if(al<lim) return 0.;
  int top=int(mod(k,9.)+.5); if(top>8) top=0;
  float topDn=r*cos(al)-uIris.z, best=r*sin(al);
  // translucency makes the shapes: blade k+1 lies under the top blade; along a band behind the top blade's leading
  // edge the two filters act in series (top x under, normalised to the top blade's brightness): stained glass held
  // to the light, a saturated third colour, never mud and never pastel (uIrisOv[k], precomputed by V2.L.irisOv)
  float ov=uIrisC2.x*smoothstep(uIrisC2.y+uIrisC2.z,uIrisC2.y-uIrisC2.z,topDn)*step(lim,al-W);
  vec3 ct=mix(uIrisCol[top],uIrisOv[top],ov);
  vec3 cd=mix(uIrisDeep[top],uIrisOvD[top],ov);
  // light through glass: each blade is lit from the aperture. Full value at the aperture and along its leading edge,
  // falling off toward the frame edges and the blade's back by an ANALOGOUS hue shift (lemon -> cadmium, cerulean ->
  // ultramarine, magenta -> violet ...), never by a mix toward black or the ground (that is what makes olive).
  float ra=max(r-uIris.z,0.);
  float nearA=exp(-ra/max(uIrisD.x,1.));
  float edg=exp(-max(topDn,0.)/max(uIrisD.z,1.));
  float lv=clamp(max(nearA,edg*mix(.25,.95,nearA)),0.,1.);
  vec3 base=mix(ct,mix(cd,ct,lv),clamp(uIrisD.y,0.,1.));
  irisAlpha=mix(uIrisB.y,max(uIrisB.y,.92),(1.-lv)*clamp(uIrisD.y,0.,1.));
  float b=(uIrisC.z+.14*exp(-r/900.))*(1.+uIrisB.z);
  b+=uIrisC.x*exp(-max(topDn,0.)/max(uIrisC.w,1.));                 // light along the leading edge
  b+=uIrisC.y*exp(-ra/(uIrisD.w>0.?uIrisD.w:140.));                 // hot toward the aperture (the light source)
  b*=.94+.06*sin(best*.019+topDn*.013+float(top)*1.7);              // faint glass streaks
  col=base*b;
  // tight (buzz): near the aperture the blades darken to ~0.45 and lean violet, so the dashes and the knot's neon pop
  float dk=clamp(uIrisB.w,0.,1.)*(1.-smoothstep(0.,700.,ra));
  col*=mix(vec3(1.),vec3(.34,.26,.62),dk);
  // GL lead came on each leading edge (seen bent through his lens; the crisp 2D lead covers it elsewhere), then the
  // bright lip just behind it
  float lw=uIrisC2.w;
  col+=mix(base,vec3(1.),.6)*exp(-max(topDn-lw,0.)/5.)*.45*(lw>0.?step(lw,topDn+.5*uPx):1.);
  if(lw>0.) col=mix(HX(14.,8.,48.)*.6,col,smoothstep(lw-uPx,lw+uPx,topDn));
  topCol=ct;
  return clamp(topDn/uPx+.5,0.,1.); }
`);

  chunk('WINDOW', ['COMMON', 'PANE', 'RAYS'], `
// the stained-glass window (panes are drawn into the pane canvas by V2.window): emission, light shafts,
// floor projections in the window's own colours (parallel projection), and the moon behind it.
uniform vec4 uWin;       // arch: centre x, apex y, half width, bottom y
uniform vec4 uWinK;      // emission gain, shaft k, floor k, floor y
uniform vec4 uWinP;      // projection: shear (dx per px of floor depth), depth scale, x offset, shaft line y
uniform vec4 uWinS;      // air shafts: strength (0 = one continuous wash), band spacing px, band duty, seed
uniform vec4 uMoon;      // x, y, r, strength
uniform vec4 uMoonK;     // spokes k, spoke rotation (rad), halo k, pane glow k
float archD(vec2 P){
  float cx=uWin.x, w=uWin.z; float a=.22*w, r=w+a; float ys=uWin.y+sqrt(r*r-a*a);
  float dx=P.x-cx;
  float top=max(length(vec2(dx-a,P.y-ys))-r, length(vec2(dx+a,P.y-ys))-r);
  float d=P.y<ys?top:abs(dx)-w;
  return max(d,P.y-uWin.w); }
vec3 moonGlow(vec2 P){
  if(uMoon.w<=0.) return vec3(0.);
  vec2 d=P-uMoon.xy; float r=length(d), a=atan(d.y,d.x)+uMoonK.y;
  vec3 pearl=HX(244.,239.,216.), lil=HX(159.,180.,255.), spk=HX(220.,230.,255.);
  vec3 c=pearl*pow(smoothstep(uMoon.z*1.15,0.,r),1.6)*.62;                 // soft pearl, no hard edge
  c+=mix(lil,pearl,.3)*exp(-r/(uMoon.z*1.9))*.42*uMoonK.z+lil*.09*exp(-r/560.)*uMoonK.z;
  vec2 h=hair(r,a,140.,5.,uMoon.z*1.4,uMoon.z*3.4,3.);
  c+=mix(pearl,spk,h.y)*h.x*.55*smoothstep(uMoon.z*.55,uMoon.z*1.0,r)*uMoonK.x;
  return c*uMoon.w; }
vec3 windowLight(vec2 P, vec3 c){
  float d=archD(P);
  vec3 mg=moonGlow(P);
  if(d<0.){
    vec3 g=pane(P);
    float lift=uWinK.x+uMoonK.w*lum(mg)*2.2;
    c=g*lift+mg*.35;
  } else {
    c+=mg*.45;
    // floor: the window's own panes projected by parallel light
    if(P.y>uWinK.w && uWinK.z>0.){
      float dep=P.y-uWinK.w;
      vec2 W=vec2(P.x-uWinP.x*dep+uWinP.z, uWin.w-dep*uWinP.y);
      float m=smoothstep(8.,-14.,archD(W));                                     // soft-edged cast light
      c+=pane(W)*m*uWinK.z*(1.-smoothstep(0.,420.,dep)*.55);
    }
  }
  // shafts in the air (in front of the lower window and over the floor): trace back along the light to the shaft line;
  // with uWinS the light falls in 3 to 5 discrete shafts (bands along the window), each in the colours it passed through
  if(uWinK.y>0. && P.y>uWinP.w){
    float dep=P.y-uWinP.w;
    vec2 W=vec2(P.x-uWinP.x*dep*1.15+uWinP.z*.5, uWinP.w);
    float m=smoothstep(1.,-2.,archD(W))*exp(-dep/520.)*(P.y<uWinK.w?1.:.4);
    if(uWinS.x>0.){ float u=W.x/uWinS.y+uWinS.w; float id=floor(u), f=fract(u)-.5;
      float w=uWinS.z*(.55+.9*h11(id*3.1+uWinS.w)); float on=step(.38,h11(id*1.7+uWinS.w*2.3));
      m*=on*smoothstep(.5*w,.5*w-.22,abs(f))*uWinS.x*(.75+.5*h11(id*5.3)); }
    c+=pane(W)*m*uWinK.y*(d<0.?.55:1.);
  }
  return c; }
`);

  chunk('BURST', ['COMMON'], `
// beat hits: capped whiteout, dispersive prism rays, shockwave ring, small prism ring, anamorphic streak, leaks.
// Implode mode (uBurstK3.y = 1, the 59.30 inverse): rings travel inward and everything is white light (converging
// streaks); no spectral colour in the open sky. The prism ring can follow the iris spiral (uBurstS).
uniform vec4 uBurst;     // centre x,y, age (s), amount (envelope, 0 = off)
uniform vec4 uBurstK;    // whiteout, shockwave, prism ring, rays
uniform vec4 uBurstK2;   // streak, leaks, ring speed (px/s), hot core
uniform vec4 uBurstK3;   // ring start radius, implode (1 = rings travel inward), tint mix, ray dispersion (1)
uniform vec4 uBurstS;    // prism ring: spiral twist rate px (0 = plain), twist (rad), lobes (9), white-hot core strength
uniform vec3 uBurstTint;
vec3 burst(vec2 P, vec3 c){
  float A=uBurst.w; if(A<=0.) return c;
  vec2 d=P-uBurst.xy; float r=length(d)+1e-3, a=atan(d.y,d.x), age=max(uBurst.z,0.);
  bool imp=uBurstK3.y>.5;
  float edge=clamp(max(abs(P.x-540.)/540.,abs(P.y-675.)/675.),0.,1.);              // 1 at the mid-edges and corners
  c=mix(c,vec3(1.,.97,.9)*1.2,clamp(uBurstK.x*A,0.,1.)*mix(.85,.40,edge));          // whiteout, capped 0.85 -> 0.40
  float Rs=imp? max(uBurstK3.x-age*uBurstK2.z,0.) : uBurstK3.x+age*uBurstK2.z;
  if(uBurstK.w>0.){
    vec3 rc; float ds=.012*uBurstK3.w;
    int nch=uBurstK3.w>0.?3:1;                     // no dispersion (implode): one channel, a third of the cost
    for(int ch=0;ch<3;ch++){ if(ch>=nch) break; float aa=a+(float(ch)-1.)*ds*(1.+r/500.);
      rc[ch]=pow(max(0.,sin(aa*13.+1.3)),24.)*.9+pow(max(0.,sin(aa*21.-.7)),40.)*.7+pow(max(0.,sin(aa*8.+2.1)),60.)+pow(max(0.,sin(aa*34.)),90.)*.5; }
    if(nch==1) rc=vec3(rc.r);
    float env=imp? exp(-pow((r-Rs)/260.,2.))*1.6 : (exp(-r/480.)*1.1+60./(r+60.)*.3);   // implode: a converging band of streaks
    c+=rc*env*mix(vec3(1.,.9,.8),uBurstTint,uBurstK3.z)*uBurstK.w*A; }
  c+=mix(vec3(1.,.93,.8),uBurstTint,uBurstK3.z)*exp(-r*r/(2.*90.*90.))*1.3*uBurstK2.w*A;
  vec3 shc=imp? vec3(1.,.97,.92)*1.2 : spec(.5+(r-Rs)/80.);
  c+=shc*exp(-pow((r-Rs)/34.,2.))*uBurstK.y*A;
  if(uBurstK.z>0.){
    float Rp=imp? max(uBurstK3.x*.7-age*uBurstK2.z*.6,0.) : uBurstK3.x*.6+age*uBurstK2.z*.55;
    float x=r-Rp;
    vec3 pc;
    if(imp) pc=vec3(1.,.98,.94)*exp(-pow(x/5.,2.))*max(uBurstS.w,1.);
    else {
      // a ROUND ring: a 12 px spectral band (magenta inside to cyan outside) around a 4 px white-hot core. Its
      // brightness turns with the iris spiral as it grows (uBurstS: twist rate px, twist, lobes): a gentle spiral twist
      float tw=uBurstS.x!=0.? .74+.26*sin(uBurstS.z*(a-uBurstS.y)-Rp/uBurstS.x) : 1.;
      vec3 band=mix(HX(255.,46.,151.),HX(61.,245.,255.),smoothstep(-7.,7.,x));
      pc=(band*exp(-pow(x/7.,2.))*2.2+vec3(1.,.98,.95)*exp(-pow(x/2.4,2.))*uBurstS.w)*tw;
    }
    c+=pc*uBurstK.z*A; }
  c+=vec3(.35,.6,1.)*exp(-abs(d.y)/5.)*exp(-abs(d.x)/620.)*1.2*uBurstK2.x*A;
  if(uBurstK2.y>0.){
    vec2 l1=vec2(60.,180.), l2=vec2(1080.,1150.);
    c+=(vec3(1.,.42,.1)*exp(-dot(P-l1,P-l1)/(2.*330.*330.))+vec3(1.,.12,.62)*exp(-dot(P-l2,P-l2)/(2.*300.*300.)))*.8*uBurstK2.y*A; }
  return c; }
`);

  chunk('CALM', ['COMMON'], `
// calm-zone mask: ray / squiggle / dash intensity x floor inside caption boxes (+feather) and character ellipses
uniform vec4 uCalmR[3];  // rects x0,y0,x1,y1 (canvas px; x1<=x0 = off)
uniform vec4 uCalmE[2];  // ellipses cx,cy,rx,ry (rx<=0 = off)
uniform vec4 uCalmK;     // rect floor (0.15), feather px (40), ellipse floor, unused
float calm(vec2 P){
  float m=1.;
  for(int i=0;i<3;i++){ vec4 R=uCalmR[i]; if(R.z>R.x){ vec2 c=(R.xy+R.zw)*.5, h=(R.zw-R.xy)*.5;
    float d=sdRBox(P-c,h,min(40.,min(h.x,h.y))); m=min(m,mix(uCalmK.x,1.,smoothstep(0.,uCalmK.y,d))); } }
  for(int i=0;i<2;i++){ vec4 E=uCalmE[i]; if(E.z>0.){ float d=(length((P-E.xy)/E.zw)-1.)*min(E.z,E.w);
    m=min(m,mix(uCalmK.z,1.,smoothstep(0.,uCalmK.y*1.5,d))); } }
  return m; }
`);

  chunk('KAL', ['COMMON'], `
// kaleidoscope rose: two rings of 12 DIAMOND facets (pointed at both ends), the outer ring offset half a facet and
// counter-rotating, overlapping the inner ring radially: where two facets overlap the colour is the two filters in
// series (a saturated new colour, never grey), elsewhere a facet's own Hockney colour; ultramarine shows between the
// diamonds. AA edges, a fold line and a thin white glint on each facet edge (light, not a lilac gap glow).
// Returns vec4(colour, alpha): apply c = mix(c, k.rgb, k.a).
uniform vec4 uKal;       // centre x,y, rotation (rad, + inner ring, -1.2x outer ring), scale (1 = radii 300 / 620 px)
uniform vec4 uKalK;      // alpha (.88: a single facet; lemon under ~.85 over ultramarine goes olive), inner radius (300), outer radius (620), gap (.08)
uniform vec3 uKalCol[6];
float kalFacet(float r, float a, float r0, float r1, float rot, float off, out float id, out float dpx, out float fold){
  id=0.; dpx=-1e3; fold=0.;
  float t=(r-r0)/(r1-r0); if(t<=0.||t>=1.) return 0.;
  float u=(a+rot)*12./TAU+off; id=floor(u); float fu=fract(u)-.5; float f=abs(fu); fold=step(0.,fu);
  float hw=(.5-uKalK.w*.5)*pow(sin(PI*t),.7);                      // a diamond: widest mid-ring, pointed at both ends
  dpx=(hw-f)*max(r,1.)*TAU/12.*.8;                                   // px inside the facet (slanted edge: x .8)
  return clamp(dpx/uPx+.5,0.,1.); }
vec4 kal(vec2 P){
  vec2 d=(P-uKal.xy)/max(uKal.w,.01); float r=length(d), a=atan(d.y,d.x);
  float i1,i2,d1,d2,f1,f2;
  float c1=kalFacet(r,a,uKalK.y*.10,uKalK.y,uKal.z,0.,i1,d1,f1);
  float c2=kalFacet(r,a,uKalK.y*.58,uKalK.z,-uKal.z*1.2,.5,i2,d2,f2);
  float cov=c1+c2-c1*c2; if(cov<=0.) return vec4(0.);
  vec3 A=uKalCol[int(mod(i1,6.))]*mix(1.,.84,f1), B=uKalCol[int(mod(i2+3.,6.))]*mix(1.,.84,f2);
  vec3 pr=A*B; float mA=max(A.r,max(A.g,A.b)), mB=max(B.r,max(B.g,B.b));
  vec3 ov=pr/max(max(pr.r,max(pr.g,pr.b)),1e-4)*min(mA,mB)*.92;      // two filters in series, normalised
  float both=c1*c2;
  vec3 col=(A*c1*(1.-c2)+B*c2*(1.-c1)+ov*both)/max(cov,1e-4);
  float gl=max(c1*exp(-max(d1,0.)/1.6),c2*exp(-max(d2,0.)/1.6));    // thin white glint on the facet edges
  col=mix(col,vec3(1.,.98,.95),gl*.55);
  return vec4(col,cov*uKalK.x); }
`);

  chunk('ROSE', ['COMMON'], `
// af Klint rosette: 1 centre + 6 translucent glass circles. One circle: its own colour. Where circles overlap, the
// glass acts as filters in SERIES (the product of the colours, normalised): a petal is MORE saturated, never whiter;
// the alpha of the stack is capped (no screen build-up). 2 px white edges at 50%.
// Returns vec4(colour, alpha): apply source-over, c = mix(c, r.rgb, r.a).
uniform vec4 uRose;      // centre x,y, ring distance, circle radius
uniform float uRoseRot;
uniform vec3 uRoseCol[7];
uniform float uRoseOpen[7];  // per circle 0..1 (opening one at a time)
uniform float uRoseK;        // glass strength (alpha of a single circle, .55)
vec4 rose(vec2 P){
  vec3 sum=vec3(0.), prod=vec3(1.); float n=0., rim=0.;
  for(int i=0;i<7;i++){
    float op=uRoseOpen[i]; if(op<=0.) continue;
    vec2 c=uRose.xy;
    if(i>0){ float ph=uRoseRot+float(i-1)*TAU/6.; c+=uRose.z*op*vec2(cos(ph),sin(ph)); }
    float dd=length(P-c)-uRose.w*mix(.6,1.,op);
    float ins=cover(dd)*op;
    sum+=uRoseCol[i]*ins; n+=ins; prod*=mix(vec3(1.),uRoseCol[i],ins); rim+=exp(-dd*dd/2.)*op;
  }
  if(n<=0.) return vec4(0.);
  vec3 one=sum/max(n,1e-3);
  one=max(mix(vec3(lum(one)),one,1.35),0.);                         // single glass a little richer than its pastel hex
  float m1=max(one.r,max(one.g,one.b));
  vec3 ser=prod/max(max(prod.r,max(prod.g,prod.b)),1e-4)*m1;       // the filters in series, at the circles' brightness
  float ov=smoothstep(1.,2.,n);
  vec3 col=mix(one,ser,ov);
  col=mix(col,vec3(1.,.98,.95),min(rim,1.)*.5);
  return vec4(col,clamp(min(n,1.)*uRoseK+ov*.25+min(rim,1.)*.5,0.,.9)); }
`);

  chunk('ENSO', ['COMMON'], `
// the gold dry-brush enso: 17 bristles of light, loaded at the start (white-hot head), #FFC23D body, splitting into
// #FF9A1F dry strands at the tail; the gap stays open; a #7A1240 shadow-halo (about 20%) under the stroke keeps it
// readable on the rose ground. Returns vec4(colour, alpha) with the halo composited in: c = mix(c, e.rgb, e.a).
uniform vec4 uEnso;      // centre x,y, radius, draw 0..1
uniform vec4 uEnsoW;     // width at start, width at end, start angle (rad), span (fraction of a turn)
vec4 enso(vec2 P){
  if(uEnso.w<=0.) return vec4(0.);
  vec2 e=P-uEnso.xy; float er=length(e), ea=atan(e.y,e.x);
  float span=TAU*uEnsoW.w;
  float sp=fract((ea-uEnsoW.z)/TAU)*TAU/span;
  float wbr=mix(uEnsoW.x,uEnsoW.y,smoothstep(0.,1.,sp))*(1.+.12*sin(sp*5.));
  float wob=7.*sin(sp*7.+1.)+4.*sin(sp*17.);
  float rr=(er-uEnso.z-wob)/wbr;
  float nb=17.; float u=(rr+.5)*nb; float bi=floor(u); float bf=fract(u)-.5;
  float hb=h11(bi*3.7+1.), hb2=h11(bi*7.3+2.);
  float bpx=wbr/nb;
  float prof=exp(-pow(bf*bpx/(1.1+1.9*hb),2.));
  float endS=.80+.2*hb-.3*abs(rr), startS=.035*hb2;
  float drawn=smoothstep(uEnso.w,uEnso.w-.015,sp);
  float along=smoothstep(startS,startS+.025,sp)*smoothstep(endS,endS-.05,sp)*drawn;
  float inside=step(abs(rr),.5);
  float load=smoothstep(.75,.15,sp);                                   // loaded with ink at the start
  float inkB=smoothstep(.5,.3,abs(rr))*mix(.3,1.,load);
  // (the gold is set a little deeper than #FFC23D / #FF9A1F: the composite's shoulder and bloom lift it back to them)
  vec3 gold=HX(255.,178.,38.), tip=HX(255.,246.,230.), dry=HX(250.,128.,18.), shade=HX(122.,18.,64.);
  float cv=clamp(prof*along*inside*2.2+.8*inkB*along,0.,1.);
  vec3 col=mix(dry,gold,mix(smoothstep(.0,.45,prof),1.,load*.6));
  col=mix(col,tip,smoothstep(.14,.0,sp)*smoothstep(.3,.8,prof)*.85);  // the white-hot loaded head (first ~10% only)
  float sh=.30*smoothstep(1.45,.5,abs(rr))*smoothstep(.02,.06,sp)*smoothstep(.95,.85,sp)*drawn*(1.-cv);
  float al=cv+sh;
  return vec4((col*cv+shade*sh)/max(al,1e-4),al); }
`);

  // =====================================================================================================  COMPOSITE
  const COMP_FS = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D uHdr, uBloom;
uniform float uBloomK, uExpo, uGrain, uSeed, uSat, uBleed, uVig, uLeanK, uBloomSat;
uniform vec3 uVigCol, uLeanCol;
uniform vec4 uGlassE, uGlassF;      // the character's glass (ellipse in canvas px; filter hue, density): bloom that
                                    // lands on his body passes through his glass and takes its hue
float h12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float sh(float x){ const float k=.72; return x<k? x : k+(1.-k)*(1.-exp(-(x-k)/(1.-k))); }
void main(){
  vec3 bl=texture(uBloom,vUv).rgb;
  bl=max(mix(vec3(dot(bl,vec3(.2126,.7152,.0722))),bl,uBloomSat),0.);
  if(uGlassF.w>0.){ vec2 q=(vec2(vUv.x,1.-vUv.y)*vec2(1080.,1350.)-uGlassE.xy)/max(uGlassE.zw,vec2(1.));
    bl*=mix(vec3(1.),uGlassF.rgb,smoothstep(1.03,.95,dot(q,q))); }
  vec3 c=(texture(uHdr,vUv).rgb+bl*uBloomK)*uExpo;
  c=max(c,0.);
  float m=max(c.r,max(c.g,c.b));
  vec3 y=m>1e-5? c*(sh(m)/m) : c;                                   // hue-keeping soft shoulder (scale by max channel),
  y=mix(y,vec3(sh(c.r),sh(c.g),sh(c.b)),.35);                        // a third per-channel: over-bright amber warms toward gold
  float lm=dot(c,vec3(.2126,.7152,.0722));
  y=mix(y,vec3(1.),clamp((lm-.9)*uBleed*1.6,0.,.85));               // over-bright light bleeds toward white-hot (by luminance:
                                                                     // saturated glass with one channel over 1 keeps its hue)
  float l=dot(y,vec3(.2126,.7152,.0722));
  y=max(mix(vec3(l),y,uSat),0.);
  y=mix(y,uLeanCol*(.35+l*1.6),uLeanK);                              // tape-stop lean
  vec2 q=vUv-.5; float v=smoothstep(.85,.22,length(q*vec2(1.,1.12)));
  y*=mix(uVigCol,vec3(1.),mix(1.,v,uVig));                           // tinted vignette (never black)
  y=pow(clamp(y,0.,1.),vec3(1./2.2));
  float g=(h12(gl_FragCoord.xy+uSeed)-.5)*uGrain;                    // luminance grain
  y+=g*(.6+.8*dot(y,vec3(.33)));
  o=vec4(y,1.);
}`;

  // =====================================================================================================  BUILDER
  const progs = {};          // key -> {key, src, prog, defaults}
  const queue = [];
  let inited = false, COMP = null;

  function resolve(names) {
    const out = [], seen = {};
    const visit = n => {
      if (seen[n]) return; seen[n] = true;
      const c = CH[n]; if (!c) throw new Error('V2.L: unknown chunk ' + n);
      c.deps.forEach(visit); out.push(n);
    };
    ['COMMON', ...names].forEach(visit);
    return out;
  }
  // parse "uniform <type> a, b[3];" -> defaults (zeros) so every declared uniform is set on every pass
  // (precision qualifiers, int/bool/ivec/mat types and arrays are all handled; the setter in lx.js picks the GL call
  //  from the program's active uniform type, so a default only has to have the right number of components)
  const SIZE = { float: 1, vec2: 2, vec3: 3, vec4: 4, int: 1, bool: 1, ivec2: 2, ivec3: 3, ivec4: 4, mat2: 4, mat3: 9, mat4: 16 };
  function parseDefaults(src) {
    const d = {};
    const re = /uniform\s+(?:(?:lowp|mediump|highp)\s+)?(float|int|bool|vec[234]|ivec[234]|mat[234]|sampler2D)\s+([^;]+);/g;
    let m;
    while ((m = re.exec(src))) {
      const type = m[1];
      m[2].split(',').forEach(raw => {
        const s = raw.trim(); const am = s.match(/^(\w+)\s*\[\s*(\d+)\s*\]$/);
        const name = am ? am[1] : s, n = am ? +am[2] : 0;
        if (type === 'sampler2D' || name === 'uRes' || !name) return;
        const k = SIZE[type];
        if (n) d[name] = new Float32Array(n * k);
        else d[name] = k === 1 ? 0 : new Array(k).fill(0);
      });
    }
    return d;
  }
  // chunk-level defaults that are not zero
  L.DEF = {
    uTint: 0.6, uIrisB: [60, 0.7, 0, 0], uIrisC: [0.45, 0.55, 0.55, 110], uIrisC2: [0.5, 115, 28, 0],
    uSq: [320, 5, 2, 1.27], uSqI: [1, 0.6, 0.9, 0], uSqRev: [1, 1, 540, 675],
    uCalmK: [0.15, 40, 0.35, 0], uRoseK: 0.55, uKal: [540, 675, 0, 1], uKalK: [0.88, 300, 620, 0.08], uIrisD: [650, 0, 220, 0], uBodyV: [0, 0.6, 1.2, 0], uEnsoW: [86, 40, 2.15, 0.885],
    uDispC: [540, 675], uBody: [0, 0, 1, 1], uBody2: [0, 0, 1, 1], uBurstTint: [1, 1, 1], uBurstK3: [0, 0, 0, 1], uBurstS: [0, 0, 9, 0],
    uWinK: [1.4, 0, 0, 2000], uWinP: [0.4, 1.2, 0, 2000], uBodyK: [0.3, 0.22, 0.8, 0], uBodyF: [0, 0, 0, 1],
    // squiggle families (2.4 SQUIGGLE): A white / lemon, B pink / lilac (linear)
    uSqA0: [1, 1, 1], uSqA1: [1, 0.899, 0.389], uSqB0: [1, 0.330, 0.605], uSqB1: [0.573, 0.374, 1],
  };
  // the sky preset for the SQUIGGLE chunk (LOOK 2.4: 6 to 10 lines across the frame width, width 0.5x to 1.5x, family B
  // at 0.6): about 6 to 8 crossings at 1080 px. Pass both arrays (they are also the chunk defaults).
  L.SKY_SQ = Object.freeze({ uSq: Object.freeze([320, 5, 2, 1.27]), uSqI: Object.freeze([1, 0.6, 0.9, 0]) });
  function compile(P) {
    P.prog = LX.prog(P.src);
  }
  // register (and compile once GL is up) a scene program built from chunks + its own main()
  L.program = function (key, chunks, main) {
    const names = resolve(chunks || []);
    const src = HEAD + names.map(n => CH[n].src).join('\n') + '\n' + main;
    if (progs[key]) {
      if (progs[key].src !== src) throw new Error('V2.L.program: key "' + key + '" is already registered with a different source (prefix keys with your act: a1_, a2_, a3_)');
      return progs[key];
    }
    if (inited) console.warn('V2.L.program: "' + key + '" registered after V2.init: it compiles now, inside a frame (register at load time)');
    const defaults = Object.assign(parseDefaults(src), {});
    for (const k in L.DEF) if (k in defaults) defaults[k] = L.DEF[k];
    const P = progs[key] = { key, src, chunks: names, defaults, prog: null };
    collect(main);
    if (inited) compile(P); else queue.push(P);
    return P;
  };
  // every uniform name declared by any chunk or program (dev check: a key no program knows is a typo)
  const KNOWN = new Set();
  const collect = src => { for (const k in parseDefaults(src)) KNOWN.add(k); };
  for (const n in CH) collect(CH[n].src);
  const warned = new Set();
  const warnOnce = (id, msg) => { if (warned.has(id)) return; warned.add(id); console.warn(msg); };
  L.warnOnce = warnOnce;
  L.has = key => !!progs[key];
  L.MAX = 16;
  L.keys = () => Object.keys(progs);
  L.count = () => Object.keys(progs).length;

  // =====================================================================================================  INIT
  L.init = function () {
    LX.initGL();
    COMP = LX.prog(COMP_FS);
    inited = true;
    while (queue.length) compile(queue.shift());
    if (L.count() > L.MAX) console.warn('V2.L: ' + L.count() + ' programs registered, budget is ' + L.MAX + ' (LOOK 5.3)');
    // warm every program once so the first real frame of a worker is not penalised
    const hdr = LX.target('v2hdr', GW, GH, 'f16');
    for (const k in progs) LX.pass(progs[k].prog, Object.assign({}, progs[k].defaults, { uPane: LX.white }), hdr);
    LX.bloom(hdr, 5, 0.8);
  };

  // =====================================================================================================  PANE
  // V2.L.pane(bg) -> g : clears the 540x675 pane and returns its context in 1080x1350 units.
  // V2.L.pane(bg, key) -> g or null : if key equals the cached key the pane (and its GL texture) are reused and null
  // is returned (skip drawing). bg: css colour, a section key ('hook', 'sky', ...), or fn(g).
  // On a cache hit L.g is set to null and L.hit to true, so helpers that default to V2.L.g (V2.window.draw) skip
  // drawing into a pane that will not be re-uploaded (drawing into it would freeze the stale texture in a sequential
  // render while fresh stills look right). On a miss L.hit is false and L.g is the fresh pane context.
  // Two cached slots (LRU): a frame that draws two scenes (the 59.25 regrab: the rest scene under the hook) keeps both
  // panes cached instead of evicting each other every frame.
  const slots = [{ key: null, used: 0, dirty: true, tex: null }, { key: null, used: 0, dirty: true, tex: null }];
  let cur = 0, clock = 0;
  L.hit = false; L.g = null;
  L.pane = function (bg, key) {
    clock++;
    const hasKey = key !== undefined && key !== null;
    const hit = hasKey ? slots.findIndex(sl => sl.key === key) : -1;
    if (hit >= 0) { cur = hit; slots[hit].used = clock; L.g = null; L.hit = true; return null; }
    cur = slots[0].used <= slots[1].used ? 0 : 1;
    const sl = slots[cur]; sl.key = hasKey ? key : null; sl.used = clock; sl.dirty = true; L.hit = false;
    const [c, g] = LX.scratch('v2pane' + cur, GW, GH);
    g.setTransform(0.5, 0, 0, 0.5, 0, 0);
    if (typeof bg === 'function') bg(g);
    else if (typeof bg === 'string' && V2.PAL[bg]) V2.ground(g, bg);
    else { g.fillStyle = bg || '#000'; g.fillRect(0, 0, 1080, 1350); }
    L.g = g; L.paneCanvas = c; sl.canvas = c;
    return g;
  };
  L.paneTexture = function () {
    const sl = slots[cur];
    if (sl.dirty || !sl.tex) { sl.tex = LX.canvasTex('v2pane' + cur, sl.canvas); sl.dirty = false; }
    return sl.tex;
  };

  // =====================================================================================================  PULSE
  // downbeat exposure pulse (LOOK 2.10): expo *= 1 + A*exp(-(t-tBar)/0.15) (+ beat term at the drop)
  V2.pulseA = function (t) {
    if (t < 6) return [0, 0];
    if (t < 17.55) return (t >= 9 && t < 10.5) ? [0, 0] : [0.06, 0];
    if (t < 27) return [0, 0];
    if (t < 36) return [0.05, 0];
    if (t < 42.75) return [0.08, 0.04];
    if (t < 49.5) return [0.04, 0];
    return [0, 0];
  };
  V2.pulse = function (t) {
    t = V2.wrap(t);
    const [A, B] = V2.pulseA(t);
    if (!A && !B) return 1;
    const tb = t - Math.floor(t / 3 + 1e-9) * 3, tq = t - Math.floor(t / 0.75 + 1e-9) * 0.75;
    return 1 + A * Math.exp(-tb / 0.15) + B * Math.exp(-tq / 0.15);
  };

  // =====================================================================================================  RENDER
  // V2.L.render(key, uniforms, comp): scene pass -> bloom -> composite -> present into V2.ctx.
  // comp: {bloomK .38, thresh .75, levels 5, expo 1, pulse true, sat 1.08, vig .30, vigCol hex|[r,g,b], grain .02,
  //        bleed .25, bloomSat 1.15, glassBloom true (filter bloom on his body by uBodyFill), lean hex, leanK 0,
  //        present true, op 'source-over', alpha 1, ctx, clip (Path2D, screen px: present only inside it), t, grainF}
  L.render = function (key, u = {}, comp = {}) {
    const P = progs[key];
    if (!P || !P.prog) throw new Error('V2.L.render: program not compiled: ' + key);
    const t = comp.t ?? V2.T ?? 0;
    const f = V2.frame(t);
    if (V2.DEV) for (const k in u) if (!(k in P.defaults) && !KNOWN.has(k)) warnOnce('uniform:' + k, 'V2.L.render(' + key + '): uniform "' + k + '" is not declared by any chunk or program (typo?)');
    const hdr = LX.target('v2hdr', GW, GH, 'f16');
    const uu = Object.assign({}, P.defaults, u, { uPane: L.paneTexture(), uT: V2.wrap(t), uF: f, uPx: 1080 / GW });
    LX.pass(P.prog, uu, hdr);
    const levels = comp.levels ?? 5;
    const bl = levels > 0 ? LX.bloom(hdr, levels, comp.thresh ?? 0.75) : null;
    const sec = V2.PAL[V2.section(t)];
    const vc = comp.vigCol || (sec && sec.vig) || (sec && sec.ground && sec.ground[sec.ground.length - 1]) || '#120A3E';
    const vcl = typeof vc === 'string' ? V2.rgb01(vc).map(x => Math.min(1, x * 1.6 + 0.08)) : vc;
    const lean = comp.lean ? V2.rgb01(comp.lean) : [0, 0, 0];
    LX.pass(COMP, {
      uHdr: hdr, uBloom: bl || hdr, uBloomK: bl ? (comp.bloomK ?? 0.38) : 0,
      uExpo: (comp.expo ?? 1) * (comp.pulse === false ? 1 : V2.pulse(t)),
      uGrain: comp.grain ?? 0.02, uSeed: ((comp.grainF ?? f) % 1800) * 7.31 % 997, uSat: comp.sat ?? 1.08, uBleed: comp.bleed ?? 0.25,
      uVig: comp.vig ?? 0.30, uVigCol: vcl, uLeanCol: lean, uLeanK: comp.leanK ?? 0, uBloomSat: comp.bloomSat ?? 1.15,
      // light through his glass: if the scene passed his body uniforms, bloom on his body is filtered by his glass
      uGlassE: u.uBody || [0, 0, 1, 1], uGlassF: (u.uBodyFill && comp.glassBloom !== false) ? [u.uBodyFill[0], u.uBodyFill[1], u.uBodyFill[2], 1] : [1, 1, 1, 0],
    }, null, { vp: [0, 0, GW, GH] });
    if (comp.present !== false) {
      const pc = comp.ctx || V2.ctx;
      if (comp.clip) { pc.save(); pc.setTransform(1, 0, 0, 1, 0, 0); pc.clip(comp.clip); LX.present(pc, GW, GH, comp.op || 'source-over', comp.alpha ?? 1); pc.restore(); }
      else LX.present(pc, GW, GH, comp.op || 'source-over', comp.alpha ?? 1);
    }
    return hdr;
  };
  // the composited light image (540x675, already presented or not) as a canvas region for 2D masking
  L.grab = function (key = 'v2grab') {
    const [c, g] = LX.scratch(key, GW, GH);
    g.clearRect(0, 0, GW, GH);
    g.drawImage(LX.glc, 0, LX.glc.height - GH, GW, GH, 0, 0, GW, GH);
    return [c, g];
  };

  // overlap colours for the IRIS chunk: blade k over blade k+1 = the hue of the two filters in series (k x k+1,
  // normalised to blade k's brightness). cols: 9 hexes -> {v3}
  L.irisOv = function (cols) {
    const a = new Float32Array(27);
    for (let k = 0; k < 9; k++) {
      const t = V2.lin(cols[k]), u = V2.lin(cols[(k + 1) % 9]), pr = t.map((v, i) => v * u[i]);
      const m = Math.max(1e-4, ...pr), b = Math.max(...t);
      a.set(pr.map(v => v / m * b), k * 3);
    }
    return { v3: a };
  };
  // deep (analogous, darker) blade colours for the IRIS value falloff: hex list -> hex list (V2.deepHex each)
  L.irisDeepHex = cols => cols.map(c => V2.deepHex(c));
  L.irisDeep = cols => V2.linArr(L.irisDeepHex(cols));
  // iris blade normals for a twist (IRIS chunk)
  L.irisN = function (tw) { const a = new Float32Array(18); for (let i = 0; i < 9; i++) { const ph = tw + i * Math.PI * 2 / 9; a[i * 2] = Math.cos(ph); a[i * 2 + 1] = Math.sin(ph); } return { v2: a }; };
  // calm-zone uniforms from a list: [{rect:[x0,y0,x1,y1]}, {ell:[cx,cy,rx,ry]}], o: {floor .15, feather 40, ellFloor .35}
  L.calm = function (zones = [], o = {}) {
    const R = new Float32Array(12), E = new Float32Array(8);
    let ri = 0, ei = 0;
    for (const z of zones) {
      if (z.rect && ri < 3) { const r = z.rect; R.set([r[0] - (z.pad ?? 40), r[1] - (z.pad ?? 40), r[2] + (z.pad ?? 40), r[3] + (z.pad ?? 40)], ri * 4); ri++; }
      else if (z.ell && ei < 2) { E.set(z.ell, ei * 4); ei++; }
      else if (V2.DEV) warnOnce('calm', 'V2.L.calm: more than 3 rects or 2 ellipses: the extra zone is dropped');
    }
    return { uCalmR: { v4: R }, uCalmE: { v4: E }, uCalmK: [o.floor ?? 0.15, o.feather ?? 40, o.ellFloor ?? 0.35, 0] };
  };
})();
