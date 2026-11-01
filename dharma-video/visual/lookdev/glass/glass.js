// GLASS lookdev: pipeline + shaders + helpers.
// Frame = (1) soft "light through glass" pane layer drawn in Canvas2D at 540x675 (ground, translucent planes,
// colour films, light pools), (2) one GL pass that refracts / disperses / adds stained glass + prism light into an
// HDR target, (3) bloom + soft-shoulder tonemap, presented into the 1080x1350 canvas, (4) crisp Canvas2D line
// drawing, character and type at full res on top (one shared 1/4-res glow pass).
(function () {
  const W = 1080, H = 1350, TAU = Math.PI * 2;
  const G = {};
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  G.clamp = clamp; G.lerp = lerp; G.smooth = smooth; G.hash = hash; G.TAU = TAU;
  G.easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
  G.easeOutExpo = t => (t = clamp(t)) === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  // loop-safe oscillator: k integer cycles per 60 s
  G.osc = (t, k, ph = 0) => Math.sin(TAU * k * t / 60 + ph);
  G.hex = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  G.rgba = (h, a) => { const c = G.hex(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
  G.mixHex = (a, b, t) => { const A = G.hex(a), B = G.hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join(''); };

  // ------------------------------------------------------------------ GL light pass
  const GLASS_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uPane;
uniform float uT;
uniform vec4 uBody; uniform float uLens;           // character lens: cx,cy,bw,bh (canvas px)
uniform vec4 uBody2; uniform float uLens2;         // second lens (cloud / jewel)
uniform vec2 uDispC; uniform float uDisp;          // global chromatic dispersion around a light centre
uniform vec3 uWinTint; uniform float uWinCore; uniform float uWin; uniform vec4 uArch; uniform vec2 uHaloC; uniform float uCell; uniform float uWinLight;
uniform float uBurst; uniform vec2 uBurstC; uniform float uBurstR;
uniform float uFan; uniform vec2 uFanC; uniform float uFanDir, uFanW, uFanLen;
uniform float uCaus; uniform vec4 uCausBox; uniform vec3 uCausCol;
uniform float uMoon; uniform vec3 uMoonC;
uniform float uRain; uniform vec2 uRainC; uniform float uRainR, uRainW;
uniform float uKal; uniform vec2 uKalC; uniform float uKalRot, uKalS;
uniform float uRose; uniform vec2 uRoseC; uniform float uRoseD, uRoseR, uRoseRot; uniform vec3 uRoseCol[7];
uniform float uIris; uniform vec2 uIrisC; uniform float uIrisR, uIrisTw, uIrisL; uniform vec3 uIrisCol[9]; uniform float uIrisLift;
const vec2 CV=vec2(1080.,1350.);
const float TAU=6.2831853;
vec2 toUV(vec2 P){ return vec2(P.x/CV.x, 1.-P.y/CV.y); }
vec3 lin(vec3 c){ return c*c*(c*.35+.65); }           // cheap ~gamma 2.2 decode
vec3 pane(vec2 P){ return lin(texture(uPane,toUV(P)).rgb); }
float h12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2 h22(vec2 p){ vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
vec3 hue(float h){ vec3 c=clamp(abs(fract(h+vec3(0.,2./3.,1./3.))*6.-3.)-1.,0.,1.); return c*c*(3.-2.*c); }
vec3 spec(float x){ // smooth spectrum 0 red .. 1 violet
  x=clamp(x,0.,1.);
  vec3 c=vec3(smoothstep(.45,.0,abs(x-.05))+smoothstep(.25,.0,abs(x-.95))*.7,
              smoothstep(.32,.0,abs(x-.42)),
              smoothstep(.32,.0,abs(x-.80)));
  return c*1.25; }
// ---------- lens: per-channel refraction inside an ellipse
vec3 lensSample(vec2 P, vec4 B, float L, out float inside){
  vec2 q=(P-B.xy)/B.zw; float d2=dot(q,q); inside=step(d2,1.);
  if(d2>=1.||L<=0.) return vec3(-1.);
  float h=sqrt(1.-d2);
  vec2 dir=q*B.zw;
  float mag=1.-L*.42*h;                      // magnified centre
  float bend=L*.30*pow(1.-h,1.5);            // edge compression
  vec3 c;
  c.r=pane(B.xy+dir*(mag+bend*1.10)).r;
  c.g=pane(B.xy+dir*(mag+bend*1.00)).g;
  c.b=pane(B.xy+dir*(mag+bend*0.86-.03*L)).b;
  return c; }
// ---------- stained glass window (Voronoi panes + rose geometry around a halo)
vec4 voro(vec2 x){
  vec2 n=floor(x), f=fract(x); float md=8.; vec2 mr=vec2(0), mg=vec2(0);
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g=vec2(i,j); vec2 oo=.15+.7*h22(n+g); vec2 r=g+oo-f; float d=dot(r,r); if(d<md){md=d;mr=r;mg=g;} }
  float ed=8.;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g=mg+vec2(i,j); vec2 oo=.15+.7*h22(n+g); vec2 r=g+oo-f; vec2 dd=r-mr; if(dot(dd,dd)>1e-5) ed=min(ed,dot(.5*(mr+r),normalize(dd))); }
  return vec4(sqrt(md),ed,n+mg); }
float archD(vec2 P){ // pointed arch: cx, apex y, half width, bottom y ; springing line derived
  float cx=uArch.x, w=uArch.z; float a=.22*w, r=w+a; float ys=uArch.y+sqrt(r*r-a*a);
  float dx=P.x-cx;
  float top=max(length(vec2(dx-a,P.y-ys))-r, length(vec2(dx+a,P.y-ys))-r);
  float d=P.y<ys? top : abs(dx)-w;
  return max(d, P.y-uArch.w); }
vec3 palQ(float h, float k){ // Queen's-window-ish glass palette (linear-ish values)
  vec3 c[8]; c[0]=vec3(1.,.16,.45); c[1]=vec3(1.,.72,.08); c[2]=vec3(.10,.55,1.); c[3]=vec3(.20,.85,.42);
  c[4]=vec3(.55,.20,1.); c[5]=vec3(1.,.42,.10); c[6]=vec3(.10,.85,.90); c[7]=vec3(1.,.55,.75);
  int i=int(floor(h*8.)); return c[i]; }
vec3 windowCol(vec2 P, out float mask){
  float d=archD(P); mask=step(d,0.);
  if(d>40.) { mask=0.; return vec3(0.); }
  vec2 rel=P-uHaloC; float r=length(rel*vec2(1.,.86)); float ang=atan(rel.y,rel.x);
  vec3 col; float lead;
  float bright=1.;
  if(r<330.){ // rose / mandorla around the figure: rings x sectors
    float ring=r<150.?0.:(r<240.?1.:2.);
    float ns=ring==0.?12.:(ring==1.?24.:36.);
    float u=(ang/TAU+.5)*ns + (ring==1.?.5:0.);
    float sid=floor(u), fu=fract(u);
    float rb=ring==0.?150.:(ring==1.?240.:330.), ra=ring==0.?0.:(ring==1.?150.:240.);
    float le=min(min(fu,1.-fu)*(TAU*r/ns), min(abs(r-ra),abs(r-rb)));
    lead=ring==0.? abs(r-150.) : le;
    float hh=h12(vec2(sid,ring+3.));
    if(ring==0.) col=mix(vec3(1.,.86,.42),vec3(1.,.97,.8),smoothstep(150.,0.,r));
    if(ring==0.) col=mix(col, vec3(.25,.42,1.4), 1.-uWinCore);
    else if(ring==1.) col=mod(sid,2.)<1.? vec3(1.,.18,.52): vec3(1.,.62,.10);
    else col=mod(sid,3.)<1.? vec3(.12,.40,1.): (mod(sid,3.)<2.? vec3(.45,.16,.95): vec3(.08,.80,.88));
    bright=ring==0.?1.15*uWinCore:(.86+.16*hh)*(.82+.3*smoothstep(ra,rb,r));
  } else {
    vec4 v=voro(P/uCell);
    float hh=h12(v.zw);
    lead=v.y*uCell;
    // colour zones: blossom pinks + golds high, greens/blues low (hawthorn in a lane)
    float yy=P.y/CV.y;
    float hsel=fract(hh*7.13+floor(yy*3.)*.37);
    col=palQ(hsel,0.);
    if(hh<.18) col=vec3(1.,.95,.85);
    bright=.80+.35*h12(v.zw+7.);
    // in-pane thickness gradient
    bright*=.85+.3*smoothstep(0.,1.,v.x);
  }
  // glass texture: seedy streaks
  float st=.93+.07*sin(P.x*.045+P.y*.021+3.*sin(P.y*.013+P.x*.007));
  vec3 c=col*bright*st*uWinTint;
  // backlight: brightest behind the figure
  float bl=uWinLight*(.62+.42*exp(-pow(length(rel)/380.,2.)));
  c*=bl;
  // lead came
  float lw=4.2;
  float leadM=smoothstep(lw+1.2,lw-.6,lead);
  c=mix(c, vec3(.018,.010,.035), leadM);
  // frame border
  float fr=smoothstep(-26.,-20.,d);
  c=mix(c, vec3(.03,.02,.05), fr);
  c+=vec3(.9,.7,1.)*.12*exp(-pow((d+23.)/3.,2.));
  return c; }
// ---------- prism burst: dispersive radial rays + spectral ring
vec3 burst(vec2 P){
  vec2 d=P-uBurstC; float r=length(d)+1e-3; float a=atan(d.y,d.x);
  vec3 c=vec3(0.);
  for(int ch=0; ch<3; ch++){
    float off=(float(ch)-1.)*.018;
    float aa=a+off;
    float s=pow(.5+.5*sin(aa*23.+1.3+uT*.1),22.)*.9 + pow(.5+.5*sin(aa*37.-.7),40.)*.7 + pow(.5+.5*sin(aa*61.+2.1),60.)*.5;
    s+=.25*pow(.5+.5*sin(aa*9.+.4),6.);
    c[ch]=s; }
  float fall=uBurstR/(r+uBurstR*.25); fall=fall*fall*.25;
  vec3 col=c*fall*vec3(1.,.9,1.05);
  float rr=(r-uBurstR*1.05)/(uBurstR*.18);
  col+=spec(.5+rr*.4)*exp(-rr*rr)*.6;
  col+=vec3(1.,.92,.75)*exp(-r*r/(uBurstR*uBurstR*.12))*.55;
  return col*uBurst; }
// ---------- spectrum fan (prism dispersion of a beam)
vec3 fan(vec2 P){
  vec2 d=P-uFanC; float r=length(d); float a=atan(d.y,d.x);
  float x=(mod(a-uFanDir+3.14159,TAU)-3.14159)/uFanW;
  if(abs(x)>1.25) return vec3(0.);
  vec3 c=spec(.5+.5*x)*smoothstep(1.2,.85,abs(x));
  c+=vec3(1.,.95,.9)*.35*exp(-x*x*30.);
  float streak=.65+.35*sin(a*180.+h12(vec2(floor(a*60.),1.))*6.)*.6;
  float fall=smoothstep(0.,uFanLen*.12,r)*exp(-r/uFanLen);
  return c*streak*fall*uFan; }
// ---------- colour-glass iris: N tangent blades; each pixel shows the top blade (smallest forward distance)
vec4 irisCol(vec2 P){
  vec2 d=P-uIrisC; float best=1e9; int top=-1; float cnt=0.; float ed=1e9; float topDist=0.;
  for(int i=0;i<9;i++){
    float ph=uIrisTw+float(i)*TAU/9.;
    vec2 n=vec2(cos(ph),sin(ph)), t=vec2(-n.y,n.x);
    float dn=dot(d,n)-uIrisR; float s=dot(d,t);
    if(dn>0. && s>-uIrisL){ cnt+=1.; if(s<best){best=s; top=i; topDist=dn;} }
  }
  if(top<0) return vec4(0.);
  vec3 col=uIrisCol[top];
  // light: brightest right at the aperture edge (the light is being pulled in), deeper with distance
  float edge=exp(-topDist/110.);
  float b=(.42+.30*exp(-topDist/650.))*(1.+uIrisLift*.6)+.55*edge;
  b*=pow(.82,cnt-1.);
  // glass: faint streaks along the blade + thickness ripple
  b*=.9+.1*sin(best*.035+topDist*.011+float(top)*1.7)*sin(best*.011-float(top));
  vec3 c=col*b;
  c+=mix(col,vec3(1.),.5)*smoothstep(5.,0.,topDist)*.8;
  return vec4(c,1.); }
vec3 irisDisp(vec2 P){ // per-channel sampling -> rainbow fringes at every blade boundary
  vec2 d=(P-uIrisC); float k=.012;
  vec4 r=irisCol(uIrisC+d*(1.+k)), g=irisCol(P), b=irisCol(uIrisC+d*(1.-k));
  return vec3(r.r,g.g,b.b)*max(max(r.a,g.a),b.a); }
float irisA(vec2 P){ return irisCol(P).a; }
// ---------- rainbow arc (crisp spectral bands + supernumeraries; sky brighter inside the bow)
vec3 rainbow(vec3 c, vec2 P){
  float r=length(P-uRainC); float x=(r-uRainR)/uRainW;
  float m=smoothstep(1.12,.92,abs(x));
  vec3 sp=hue(clamp(.5-.5*x,0.,1.)*.78)*mix(1.,.8,step(.6,.5-.5*x));
  float sup=smoothstep(.3,0.,abs(x+1.55))*.35+smoothstep(.25,0.,abs(x+2.15))*.2;
  c*=1.+.18*smoothstep(-1.,-1.4,x)*smoothstep(-9.,-3.,x)*uRain;
  c=mix(c, sp*1.1, m*.6*uRain);
  c+=vec3(.6,1.,.75)*sup*uRain*.12;
  // secondary bow (reversed, fainter) + Alexander's dark band between the bows
  float x2=(r-uRainR*1.22)/(uRainW*1.35);
  c*=1.-.22*uRain*smoothstep(1.,1.6,x)*smoothstep(-1.,-1.6,x2);
  c=mix(c, hue(clamp(.5+.5*x2,0.,1.)*.78), smoothstep(1.12,.9,abs(x2))*.2*uRain);
  return c; }
// ---------- kaleidoscope rose: star-shaped rings of spectral glass shards (12-fold), alternate rotation
vec4 kal(vec2 P){
  vec2 d=(P-uKalC)/uKalS; float r=length(d); float a=atan(d.y,d.x);
  float N=12.; float base[6]; base[0]=95.; base[1]=190.; base[2]=310.; base[3]=470.; base[4]=680.; base[5]=980.;
  int ring=6; float f=0., wid=0., seam=1e9;
  for(int k=0;k<6;k++){
    float rk=uKalRot*(k%2==0?1.:-1.25)*(1.+.15*float(k))+float(k)*.13;
    float u=(a+rk)*N/TAU; float ff=abs(fract(u)-.5)*2.;
    float Rk=base[k]*(1.+.26*(1.-ff));
    seam=min(seam,abs(r-Rk));
    if(r<Rk){ ring=k; f=ff; wid=floor(u); seam=min(seam,(1.-ff)*r*TAU/N*.5); break; }
  }
  if(ring>5) return vec4(0.);
  float k=float(ring);
  float half_=step(.5,f);
  float hue_=fract(wid/N*2.+k*.19+half_*.08);
  vec3 col=hue(hue_)*.9+.05;
  float b=mix(1.05,.78,k/5.)*(half_>.5?1.:.84);
  col*=b;
  col+=vec3(1.,.97,.9)*smoothstep(2.5,0.,seam)*.55;
  if(ring==0) col=mix(vec3(1.,.95,.75),vec3(1.,1.,.95),smoothstep(95.,0.,r))*1.15;
  return vec4(col,1.); }
// ---------- af Klint rosette: 7 circles, additive glass; vesica petals appear where they overlap
vec4 rose(vec2 P){
  vec3 acc=vec3(0.); float cnt=0., rim=0.;
  for(int i=0;i<7;i++){
    vec2 c=uRoseC;
    if(i>0){ float ph=uRoseRot+float(i-1)*TAU/6.; c+=uRoseD*vec2(cos(ph),sin(ph)); }
    float dd=length(P-c)-uRoseR;
    float ins=smoothstep(1.5,-1.5,dd);
    acc+=uRoseCol[i]*ins; cnt+=ins; rim+=exp(-dd*dd/4.);
  }
  vec3 col=acc/max(cnt,1e-3)*(.50+.15*min(cnt,3.));
  col+=vec3(1.,.96,.9)*min(rim,1.)*.5;
  return vec4(col,clamp(cnt,0.,1.)); }
// ---------- caustic net (slow, loop-safe), used on floors / pools of light
float caus(vec2 P){
  vec2 q=P/150.; float t=uT*TAU/60.;
  q+=.32*vec2(sin(q.y*1.7+t*2.),sin(q.x*1.9-t*3.));
  q+=.18*vec2(sin(q.y*3.1-t*4.),sin(q.x*2.7+t*2.));
  float f=sin(2.*q.x)+sin(2.6*q.y+sin(1.4*q.x));
  return smoothstep(.16,0.,abs(f)); }
void main(){
  vec2 P=vec2(vUv.x,1.-vUv.y)*CV;
  float in1, in2;
  vec3 c=lensSample(P,uBody,uLens,in1);
  if(in1<.5){
    vec3 c2=lensSample(P,uBody2,uLens2,in2);
    if(in2>.5) c=c2;
    else {
      vec2 d=P-uDispC; float k=uDisp;
      c=vec3(pane(uDispC+d*(1.+k)).r, pane(P).g, pane(uDispC+d*(1.-k)).b);
    }
  }
  if(uRain>0.) c=rainbow(c,P);
  if(uKal>0.){ vec2 dk=P-uKalC; float k2=.014;
    vec2 e=vec2(1.,-.5);   // 2-tap supersample (half-res light layer) to smooth the shard edges
    vec4 kr=(kal(uKalC+dk*(1.+k2)+e)+kal(uKalC+dk*(1.+k2)-e))*.5, kg=(kal(P+e)+kal(P-e))*.5, kb=(kal(uKalC+dk*(1.-k2)+e)+kal(uKalC+dk*(1.-k2)-e))*.5;
    vec3 kc=vec3(kr.r,kg.g,kb.b); float ka=max(kr.a,max(kg.a,kb.a)); c=mix(c, c*.15+kc, ka*uKal); }
  if(uRose>0.){ vec4 ro=rose(P); c=mix(c, ro.rgb, ro.a*uRose); }
  if(uIris>0.){ vec3 ir=irisDisp(P); float a=step(1e-4,ir.r+ir.g+ir.b); c=mix(c, c*.2+ir, a*uIris); }
  if(uWin>0.){ float m; vec3 w=windowCol(P,m); c=mix(c,w,m*uWin); }
  if(uCaus>0.){
    vec2 b=(P-uCausBox.xy)/uCausBox.zw; float m=exp(-dot(b,b)*2.2);
    c+=uCausCol*caus(P)*m*uCaus;
  }
  if(uBurst>0.) c+=burst(P);
  if(uFan>0.) c+=fan(P);
  if(uMoon>0.){ float r=length(P-uMoonC.xy); c+=vec3(.95,.93,1.)*(smoothstep(uMoonC.z+2.,uMoonC.z-2.,r)*1.5+exp(-pow(r/(uMoonC.z*2.2),2.))*.3)*uMoon;
    float hr=(r-uMoonC.z*2.6)/(uMoonC.z*.55); c+=spec(.5+hr*.45)*exp(-hr*hr*1.5)*.22*uMoon; }
  o=vec4(c,1.);
}`;

  const COMP_FS = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D uHdr, uBloom; uniform float uBloomK, uExpo, uGrain, uSeed, uSat, uVig; uniform vec3 uVigCol;
float h12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float sh(float x){ return x<.72? x : .72+.28*(1.-exp(-(x-.72)/.28)); }
void main(){
  vec3 c=texture(uHdr,vUv).rgb + texture(uBloom,vUv).rgb*uBloomK;
  c*=uExpo;
  float m=max(c.r,max(c.g,c.b));
  c+=max(m-1.,0.)*.22;                       // over-exposed light bleeds to white like real light
  c=vec3(sh(c.r),sh(c.g),sh(c.b));
  float l=dot(c,vec3(.2126,.7152,.0722)); c=max(mix(vec3(l),c,uSat),0.);
  vec2 q=vUv-.5; float v=smoothstep(.85,.25,length(q*vec2(1.,1.1)));
  c*=mix(uVigCol,vec3(1.),mix(1.,v,uVig));
  c=pow(c,vec3(1./2.2));
  c+=(h12(gl_FragCoord.xy+uSeed)-.5)*uGrain;
  o=vec4(c,1.); }`;

  let PG, PC;
  G.init = function () {
    LX.initGL();
    PG = LX.prog(GLASS_FS); PC = LX.prog(COMP_FS);
    const [c] = LX.scratch('pane', 540, 675);
    G.paneCanvas = c;
  };

  // pane layer: 540x675 canvas, callers draw in 1080x1350 units
  G.paneBegin = function (bg) {
    const [c, g] = LX.scratch('pane', 540, 675);
    g.setTransform(0.5, 0, 0, 0.5, 0, 0);
    if (typeof bg === 'function') bg(g); else { g.fillStyle = bg || '#000'; g.fillRect(0, 0, W, H); }
    return g;
  };

  G.DEF = {
    uBody: [0, 0, 1, 1], uLens: 0, uBody2: [0, 0, 1, 1], uLens2: 0, uDispC: [540, 675], uDisp: 0.004,
    uWinTint: [1, 1, 1], uWinCore: 1, uWin: 0, uArch: [540, 300, 400, 1300], uHaloC: [540, 800], uCell: 46, uWinLight: 1,
    uBurst: 0, uBurstC: [540, 675], uBurstR: 300, uFan: 0, uFanC: [540, 675], uFanDir: 0, uFanW: 0.4, uFanLen: 600,
    uCaus: 0, uCausBox: [540, 1200, 400, 100], uCausCol: [1, 1, 1], uMoon: 0, uMoonC: [0, 0, 50],
    uRain: 0, uRainC: [540, 1400], uRainR: 700, uRainW: 60,
    uKal: 0, uKalC: [540, 700], uKalRot: 0, uKalS: 1,
    uRose: 0, uRoseC: [540, 800], uRoseD: 200, uRoseR: 200, uRoseRot: 0, uRoseCol: { v3: new Float32Array(21) },
    uIris: 0, uIrisC: [540, 675], uIrisR: 200, uIrisTw: 0, uIrisL: 60, uIrisLift: 0,
    uIrisCol: { v3: new Float32Array(27) },
  };
  // run the GL light pass + bloom + composite, then present into ctx
  G.light = function (ctx, t, u = {}, comp = {}) {
    const pane = LX.canvasTex('pane', G.paneCanvas);
    const hdr = LX.target('ghdr', 540, 675, 'f16');
    LX.pass(PG, Object.assign({}, G.DEF, u, { uPane: pane, uT: t }), hdr);
    const bl = LX.bloom(hdr, 5, comp.thresh ?? 0.85);
    LX.pass(PC, {
      uHdr: hdr, uBloom: bl, uBloomK: comp.bloomK ?? 0.35, uExpo: comp.expo ?? 1, uGrain: comp.grain ?? 0.022,
      uSeed: (Math.floor(t * 30) % 64) * 13.1, uSat: comp.sat ?? 1.08, uVig: comp.vig ?? 0.35, uVigCol: comp.vigCol || [0.55, 0.45, 0.85],
    }, null, { vp: [0, 0, 540, 675] });
    LX.present(ctx, 540, 675);
  };

  // ------------------------------------------------------------------ pane primitives (draw on pane ctx g, 1080 units)
  G.disc = function (g, x, y, r, col, a, op = 'lighter', hard = 0) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, G.rgba(col, a)); gr.addColorStop(clamp(hard), G.rgba(col, a)); gr.addColorStop(1, G.rgba(col, 0));
    g.save(); g.globalCompositeOperation = op; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore();
  };
  // flat colour film with a crisp-ish edge (Eliasson colour circle / dichroic disc)
  G.film = function (g, x, y, r, col, a, op = 'lighter', edge = 0.06) {
    const gr = g.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
    gr.addColorStop(0, G.rgba(col, a * 1.0)); gr.addColorStop(1 - edge * 2, G.rgba(col, a * 0.78)); gr.addColorStop(1 - edge, G.rgba(col, a * 0.95)); gr.addColorStop(1, G.rgba(col, 0));
    g.save(); g.globalCompositeOperation = op; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore();
  };
  G.poly = function (g, pts, col, a, op = 'lighter', fade = 0.45) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, G.rgba(col, a)); gr.addColorStop(1, G.rgba(col, a * fade));
    g.save(); g.globalCompositeOperation = op; g.fillStyle = gr; g.beginPath();
    pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); g.restore();
  };
  // beam / light shaft from (x0,y0) to (x1,y1), widths w0 -> w1, alpha a0 -> a1
  G.beam = function (g, x0, y0, x1, y1, w0, w1, col, a0, a1 = 0, op = 'lighter') {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, G.rgba(col, a0)); gr.addColorStop(1, G.rgba(col, a1));
    g.save(); g.globalCompositeOperation = op; g.fillStyle = gr; g.beginPath();
    g.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2); g.lineTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2);
    g.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2); g.lineTo(x0 - nx * w0 / 2, y0 - ny * w0 / 2); g.closePath(); g.fill(); g.restore();
  };
  G.vgrad = function (g, stops, x0 = 0, y0 = 0, x1 = 0, y1 = H) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([p, c]) => gr.addColorStop(p, c));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  };

  // ------------------------------------------------------------------ glow (one 1/4-res pass, two blur radii)
  G.glowJobs = [];
  G.glow = (fn) => G.glowJobs.push(fn);
  G.flushGlow = function (ctx, o = {}) {
    if (!G.glowJobs.length) return;
    const k = 0.25, w = 270, h = 338;
    const [c1, g1] = LX.scratch('gA', w, h);
    g1.clearRect(0, 0, w, h); g1.setTransform(k, 0, 0, k, 0, 0); g1.lineCap = 'round'; g1.lineJoin = 'round';
    for (const f of G.glowJobs) { g1.save(); f(g1); g1.restore(); }
    G.glowJobs = [];
    const [c2, g2] = LX.scratch('gB', w, h);
    g2.clearRect(0, 0, w, h); g2.globalCompositeOperation = 'lighter';
    g2.filter = `blur(${o.blur1 ?? 2.2}px)`; g2.globalAlpha = o.a1 ?? 0.75; g2.drawImage(c1, 0, 0);
    g2.filter = `blur(${o.blur2 ?? 9}px)`; g2.globalAlpha = o.a2 ?? 0.55; g2.drawImage(c1, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(c2, 0, 0, W, H);
    ctx.restore();
  };
  // dark soft halo (for type legibility) on its own 1/4 res canvas, drawn source-over / multiply
  G.shade = function (ctx, fn, o = {}) {
    const k = 0.25, w = 270, h = 338;
    const [c1, g1] = LX.scratch('sA', w, h);
    g1.clearRect(0, 0, w, h); g1.setTransform(k, 0, 0, k, 0, 0); fn(g1);
    const [c2, g2] = LX.scratch('sB', w, h);
    g2.clearRect(0, 0, w, h); g2.filter = `blur(${o.blur ?? 8}px)`; g2.drawImage(c1, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = o.op || 'source-over'; ctx.globalAlpha = o.alpha ?? 1;
    const r = o.rect || [0, 0, W, H];   // only composite the region that holds the shade
    ctx.drawImage(c2, r[0] * k, r[1] * k, r[2] * k, r[3] * k, r[0], r[1], r[2], r[3]); ctx.restore();
  };

  // ------------------------------------------------------------------ crisp line helpers
  G.path = function (pts, closed) { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); if (closed) p.closePath(); return p; };
  // light line: white-hot core + coloured halo (halo via glow pass) + optional prism fringe
  G.lightLine = function (ctx, path, o = {}) {
    const col = o.col || '#ffffff', w = o.w ?? 3.5, halo = o.halo || col;
    if (o.glow !== false) G.glow(g => { g.strokeStyle = halo; g.lineWidth = (o.gw ?? 14); g.globalAlpha = o.ga ?? 0.9; g.stroke(path); });
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (o.fringe) {
      ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = w * 0.8; ctx.globalAlpha = o.fa ?? 0.75;
      ctx.strokeStyle = o.f1 || '#ff2bd6'; ctx.save(); ctx.translate(-o.fringe, -o.fringe * 0.4); ctx.stroke(path); ctx.restore();
      ctx.strokeStyle = o.f2 || '#22e8ff'; ctx.save(); ctx.translate(o.fringe, o.fringe * 0.4); ctx.stroke(path); ctx.restore();
    }
    ctx.globalCompositeOperation = o.op || 'source-over'; ctx.globalAlpha = o.a ?? 1;
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(path);
    ctx.restore();
  };

  // ------------------------------------------------------------------ type
  G.font = (size, fam, weight = '400', style = 'normal') => `${style} ${weight} ${size}px "${fam}"`;
  // lay out words of one line, centred at x; returns [{w, x, word}]
  G.layout = function (ctx, words, x, font, spacing = 0.26) {
    ctx.font = font;
    const sp = ctx.measureText(' ').width * (spacing / 0.26);
    const ws = words.map(w => ctx.measureText(w).width);
    const tot = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
    let cx = x - tot / 2; const out = [];
    words.forEach((w, i) => { out.push({ word: w, x: cx, w: ws[i] }); cx += ws[i] + sp; });
    return out;
  };
  // word light level from timing: 0 unlit glass, 1 fully lit. lead = caption lead time.
  G.lit = (t, wt, lead = 0.1, dur = 0.16) => clamp((t - (wt - lead)) / dur);

  // prism type: each lit word = magenta/cyan fringe + warm white core + glow; unlit = dim glass outline
  G.prismWord = function (ctx, word, x, y, font, lv, o = {}) {
    ctx.save(); ctx.font = font; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    const core = o.core || '#FFF8EA', f1 = o.f1 || '#FF2E9A', f2 = o.f2 || '#1FE4FF', fr = o.fringe ?? 5;
    // unlit glass
    const ul = 1 - lv;
    if (ul > 0.001) {
      ctx.globalAlpha = ul * (o.unlitA ?? 0.30); ctx.fillStyle = o.unlitFill || '#C9B8FF'; ctx.fillText(word, x, y);
      ctx.globalAlpha = ul * 0.75; ctx.lineWidth = o.unlitLine ?? 2.2; ctx.strokeStyle = o.unlitStroke || 'rgba(235,225,255,0.85)'; ctx.strokeText(word, x, y);
    }
    if (lv > 0.001) {
      if (o.glow !== false) G.glow(g => { g.font = font; g.textBaseline = 'alphabetic'; g.globalAlpha = lv * (o.ga ?? 0.85); g.fillStyle = o.halo || '#FF9A3D'; g.fillText(word, x, y); });
      if (o.back) { ctx.globalAlpha = lv * (o.backA ?? 0.85); ctx.lineJoin = 'round'; ctx.lineWidth = o.backW ?? 10; ctx.strokeStyle = o.back; ctx.strokeText(word, x, y + 2); }
      ctx.globalCompositeOperation = o.fop || 'lighter'; ctx.globalAlpha = lv * (o.fa ?? 0.95);
      ctx.fillStyle = f1; ctx.fillText(word, x - fr, y - fr * 0.25);
      ctx.fillStyle = f2; ctx.fillText(word, x + fr, y + fr * 0.25);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = lv;
      ctx.fillStyle = core; ctx.fillText(word, x, y);
      if (o.edge) { ctx.globalAlpha = lv * 0.9; ctx.lineWidth = o.edgeW || 1.6; ctx.strokeStyle = o.edge; ctx.strokeText(word, x, y); }
    }
    ctx.restore();
  };
  // a caption line made of {word, wt} with per-word lighting
  G.captionLine = function (ctx, t, items, x, y, font, o = {}) {
    const L = G.layout(ctx, items.map(i => i.word), x, font, o.spacing ?? 0.26);
    L.forEach((l, i) => {
      const it = items[i];
      const lv = it.lv !== undefined ? it.lv : G.lit(t, it.wt, o.lead ?? 0.1);
      G.prismWord(ctx, l.word, l.x, y, font, lv, Object.assign({}, o, it.style || {}));
    });
    return L;
  };
  // pull word times from TIMING
  G.words = function (id, choir) {
    const T = window.TIMING; const arr = choir ? T.choir : T.lines;
    const L = arr.find(l => l.id === id); if (!L) return [];
    return L.words.map((w, i) => ({ word: w, wt: L.word_t[i] }));
  };

  G.watermark = function (ctx, col = 'rgba(255,255,255,0.55)') {
    ctx.save(); ctx.font = '500 22px "JBM"'; ctx.textAlign = 'right'; ctx.fillStyle = col; ctx.fillText('pawel.world', W - 34, 50); ctx.restore();
  };

  window.G = G;
})();
