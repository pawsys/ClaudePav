// POOL light stack: one MRT fragment pass at 540x675 writes (ground + light) and (light only),
// bloom on light only, then a hue-keeping soft-shoulder tonemap into the default framebuffer.
// Inputs: FIELD (flat Hockney color planes, 540x675 canvas), MASK A (R body, G lens dome, B knot), MASK B (R calm, G shade, B sun glass).
(function () {
  const W = 1080, H = 1350, GW = 540, GH = 675;
  const PL = {};

  const POOL_FS = `#version 300 es
precision highp float;
in vec2 vUv;
layout(location=0) out vec4 o0;
layout(location=1) out vec4 o1;
uniform vec2 uRes;
uniform sampler2D uField, uMaskA, uMaskB, uGlow;
uniform float uGlowK; uniform vec4 uEnso; uniform float uEnsoA0, uEnsoSweep, uEnsoW;
uniform float uPh, uScale, uAniso, uDarkI, uWarp, uLineW, uLineI, uFineI, uGlowI, uBreak, uCalmK, uShadeK;
uniform vec2 uFlow;
uniform vec3 uCA, uCB, uCC, uCD, uCX;
uniform vec4 uDrain;           // x,y px, strength, radius px
uniform vec4 uRip;             // x,y px, front radius px, amp px
uniform float uRipI, uRipW; uniform vec3 uRipC;
uniform vec4 uSun;             // x,y px, intensity, disk radius px
uniform float uRayLen, uRayRot, uRayN, uRayW, uPrism, uStreak, uRayStart, uRayOff, uRaySpan;
uniform float uLens, uBodyLineK, uBodyLineI, uBodyGlow; uniform vec3 uBodyLine, uPullCol;
uniform vec3 uKnotBase, uKnotA, uKnotB, uKnotC; uniform float uKnotI, uKnotSeed, uKnotDark, uKnotScale;
uniform float uTiles, uTileSize; uniform vec3 uTileC;
uniform float uIsoI, uIsoScale, uIsoW, uBodyBlock, uIsoAniso, uIsoGate; uniform vec3 uIA, uIB, uIC, uID;
uniform float uRings, uRingSp; uniform vec2 uRingC; uniform vec3 uRingCol;
uniform float uPersp; uniform vec2 uPerspC; uniform vec3 uPerspCol;

float h11(float p){ p=fract(p*.1031); p*=p+33.33; p*=p+p; return fract(p); }
vec2 h22(vec2 p){ vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h22(i).x,h22(i+vec2(1,0)).x,f.x),mix(h22(i+vec2(0,1)).x,h22(i+vec2(1,1)).x,f.x),f.y); }
vec4 h44(vec2 p){ vec4 p4=fract(vec4(p.xyxy)*vec4(.1031,.1030,.0973,.1099)); p4+=dot(p4,p4.wzxy+33.33); return fract((p4.xxyz+p4.yzzw)*p4.zywx); }
vec4 vn4(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h44(i),h44(i+vec2(1,0)),f.x),mix(h44(i+vec2(0,1)),h44(i+vec2(1,1)),f.x),f.y); }
vec3 spec(float x){ x=clamp(x,0.,1.); return clamp(vec3(abs(x*6.-3.)-1.,2.-abs(x*6.-2.),2.-abs(x*6.-4.)),0.,1.); }
vec3 toLin(vec3 c){ return pow(max(c,0.),vec3(2.2)); }
float caus(vec2 x, float ph){
  vec2 n=floor(x), f=fract(x); float F1=9., F2=9.;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 g=vec2(float(i),float(j)); vec2 r=h22(n+g);
    vec2 pt=g+.5+.38*sin(ph+6.2831*r)-f; float d=length(pt);
    if(d<F1){F2=F1;F1=d;} else if(d<F2){F2=d;}
  }
  return F2-F1;
}
// Hockney sun: few, fat, tapered, hand-cut rays in spectrum colors
vec3 sunRays(float r, float a, float N, float seed, float L0, float L1, float wid){
  float u=a/6.2831853*N+seed; float id=floor(u); float f=fract(u)-.5;
  float h1=h11(id+seed*3.1), h2=h11(id*1.7+seed*5.), h3=h11(id*2.3+seed*7.);
  float len=mix(L0,L1,h3*h3);
  float s=r/len;
  float hw=wid*(.45+.55*h2)*(1.-s*.85);
  float d=abs(f-(h1-.5)*.25);
  float prof=smoothstep(hw,hw*.55,d)*smoothstep(1.,.85,s);
  vec3 col=spec(fract(uRayOff+uRaySpan*fract(id/N*2.+h1*.15)));
  col=mix(col,vec3(1.,.95,.8),.06);
  return col*prof*(1.15-s)*(.75+.5*h2);
}
void main(){
  vec2 q=vec2(vUv.x,1.-vUv.y)*vec2(1080.,1350.);
  vec3 ground=toLin(texture(uField,vUv).rgb);
  vec4 mA=texture(uMaskA,vUv), mB=texture(uMaskB,vUv);
  float body=mA.r, knot=mA.b, calm=mB.r, shade=mB.g;
  // ---- lens: dome height in mA.g refracts the water behind him
  vec2 tx=vec2(1.5/270.,1.5/337.5);
  float gx=texture(uMaskA,vUv+vec2(tx.x,0.)).g-texture(uMaskA,vUv-vec2(tx.x,0.)).g;
  float gy=texture(uMaskA,vUv-vec2(0.,tx.y)).g-texture(uMaskA,vUv+vec2(0.,tx.y)).g;
  vec2 qt=q+vec2(gx,gy)*uLens;
  // ---- drain: the grab pulls the pool's light into a spiral (converging = grasping)
  float pull=0.;
  if(uDrain.z>0.){
    vec2 p=qt-uDrain.xy; float r=length(p);
    pull=uDrain.z*exp(-r/uDrain.w);
    float a=atan(p.y,p.x)+pull*2.8;
    float rt=r*(1.+pull*2.2);
    qt=uDrain.xy+rt*vec2(cos(a),sin(a));
  }
  // ---- ripple rings (the splash of letting go)
  float ringL=0.;
  if(uRip.w>0.){
    vec2 p=qt-uRip.xy; float r=length(p); float a=atan(p.y,p.x);
    float rw=r+7.*sin(a*5.+r*.012)+5.*sin(a*9.-1.3);
    float inside=smoothstep(uRip.z+40.,uRip.z-80.,rw)*smoothstep(30.,160.,rw);
    float fade=exp(-max(0.,uRip.z-rw)/520.);
    float ph=(rw-uRip.z)/uRipW*6.2831853;
    qt+=p/max(r,1.)*sin(ph)*uRip.w*inside*fade;
    ringL=smoothstep(.8,1.,cos(ph))*inside*fade;
  }
  // ---- the pool net: two interlocking families of wobbly lines, drawn thick-thin with breaks, cells stretched
  //      horizontally (water seen at an angle); family B is half light, half darker "painted" water tone
  vec2 cs=vec2(cos(uPh),sin(uPh));
  float dim=(1.-calm*uCalmK)*(1.-shade*uShadeK);
  vec3 net=vec3(0.); float lum=0.;
  if(uLineI>0.){
    vec2 x=(qt+uFlow)/vec2(uScale*uAniso,uScale);
    x+=uWarp*(.45*vec2(sin(x.y*1.3+uPh),cos(x.x*1.1-uPh))+.18*vec2(sin(x.y*3.1-2.*uPh),cos(x.x*2.7+uPh)));
    float e1=caus(x,uPh);
    float e2=caus(x*1.58+vec2(3.1,7.7),2.*uPh+1.);
    vec4 nA=vn4(x*1.05+cs*.5+vec2(7.,2.));      // wob, brk, w2, brk2 from one lattice
    vec4 nB=vn4(x*.4+cs*.22+vec2(17.,3.));      // sel, cm, cB, spare
    float wob=nA.x;
    float w1=uLineW*(.25+1.5*wob*wob);
    float brk=smoothstep(uBreak,uBreak+.16,nA.y);
    float l1=smoothstep(w1,w1*.35,e1)*brk;
    float g1=exp(-e1*e1/(w1*w1*4.))*brk;
    float w2=uLineW*.7*(.35+nA.z);
    float brk2=smoothstep(uBreak+.05,uBreak+.25,nA.w);
    float l2=smoothstep(w2,w2*.3,e2)*brk2;
    float g2=exp(-e2*e2/(w2*w2*4.))*brk2;
    float sel=nB.x;
    float lit2=smoothstep(.42,.58,sel), drk2=1.-lit2;
    float cm=nB.y;
    vec3 cA=mix(uCA,uCB,smoothstep(.38,.62,cm));
    vec3 cB=mix(uCC,uCD,smoothstep(.4,.6,nB.z));
    // painted darker water lines (a cooler, deeper tone of the ground, never grey): soft and broad
    float dl=smoothstep(w2*1.8,w2*.5,e2)*brk2*drk2;
    ground*=1.-dl*uDarkI*(1.-calm*.8)*(1.-body)*(1.-shade*.9);
    net=(cA*(l1+g1*uGlowI)+cB*(l2+g2*uGlowI*.7)*lit2*uFineI)*uLineI;
    net+=uCX*pow(l1*l2*lit2,1.2)*uLineI*.9;                  // sparkles where the two families cross
    lum=(l1+g1*uGlowI+(l2+g2*uGlowI*.7)*lit2*uFineI)*uLineI;
  }
  // Hockney squiggles: iso-lines of a warped sine field, constant pixel width, two interlocking families
  if(uIsoI>0.){
    vec2 iq=(qt+uFlow)/vec2(uIsoScale*uIsoAniso,uIsoScale);
    iq+=.35*vec2(sin(iq.y*1.7+uPh),sin(iq.x*1.9-uPh))+.2*vec2(sin(iq.y*3.1-2.*uPh),sin(iq.x*2.7+uPh));
    float f1=sin(2.*iq.x)+sin(2.6*iq.y+sin(1.4*iq.x));
    float f2=sin(2.3*iq.x+1.7+sin(1.1*iq.y-uPh))+sin(2.1*iq.y-.6+cos(1.3*iq.x));
    float d1=abs(f1)/max(length(vec2(dFdx(f1),dFdy(f1))),1e-4);
    float d2=abs(f2)/max(length(vec2(dFdx(f2),dFdy(f2))),1e-4);
    vec4 nI=vn4(iq*.85+cs*.25+3.);
    vec4 nJ=vn4(iq*.32+2.);
    float wv=uIsoW*(.35+1.2*nI.x);
    float i1=smoothstep(wv,wv*.3,d1)*smoothstep(uIsoGate,uIsoGate+.16,nI.y);
    float i2=smoothstep(wv*.75,wv*.22,d2)*smoothstep(uIsoGate+.08,uIsoGate+.24,nI.z);
    float ig1=exp(-d1*d1/(wv*wv*6.)), ig2=exp(-d2*d2/(wv*wv*6.));
    vec3 ic=mix(uIA,uIB,smoothstep(.4,.6,nJ.x));
    vec3 ic2=mix(uIC,uID,smoothstep(.4,.6,nJ.y));
    net+=(ic*(i1+ig1*.25*i1)+ic2*(i2+ig2*.25*i2))*uIsoI;
    lum+=(i1+i2)*uIsoI;
  }
  net=mix(net,uBodyLine*lum*uBodyLineI,body*uBodyLineK);
  net*=dim;
  // pull-zone: lines crowd into the drain; keep energy per area roughly constant, tint toward the knot color
  net*=1./(1.+pull*1.2);
  net=mix(net,net*uPullCol*1.6,smoothstep(.15,.9,pull));
  vec3 light=net;
  // pool floor tiles (refracted grid)
  if(uTiles>0.){
    vec2 tg=(qt+18.*vec2(sin(qt.y/71.+uPh),cos(qt.x/83.-uPh)))/uTileSize;
    vec2 d=abs(fract(tg+.5)-.5);
    float gl=smoothstep(.035,.0,min(d.x,d.y));
    light+=uTileC*gl*uTiles*dim;
  }
  // ripple crest lines
  light+=uRipC*ringL*uRipI*dim;
  // concentric petal rings (metta): a slow pulse of rings from a center, wobbly
  if(uRings>0.){
    vec2 p=qt-uRingC; float r=length(p); float a=atan(p.y,p.x);
    float rr=r*(1.+.06*sin(a*6.)+.02*sin(a*11.+1.));
    float k=fract(rr/uRingSp-uPh/6.2831853);
    float rl=smoothstep(.09,.0,abs(k-.5)-.0)*smoothstep(80.,260.,r)*exp(-r/900.);
    light+=uRingCol*rl*uRings*dim;
  }
  // reverse-perspective light lines: converge on the viewer (bottom edge), fan out upward
  if(uPersp>0.){
    vec2 p=q-uPerspC; float a=atan(p.x,-p.y); float r=length(p);
    float u=a*13.;
    float f=abs(fract(u)-.5);
    float pl=smoothstep(.06,.0,f-.0)*smoothstep(1400.,200.,r);
    light+=uPerspCol*pl*uPersp;
  }
  // ---- the knot (dukkha): one dense, chromatically split neon clot of tangled light
  if(knot>.003){
    float sd=uKnotSeed;
    vec2 k=q/uKnotScale+h22(vec2(sd,3.))*40.;
    k+=1.25*vec2(sin(k.y*1.7+sd),cos(k.x*1.9-sd*1.3));
    float k1=caus(k,sd*1.7);
    float k2=caus(k+vec2(.14,.09),sd*1.7);
    vec3 kl=uKnotA*smoothstep(.075,.015,k1)+uKnotB*smoothstep(.06,.012,k2)*.75;
    float km=smoothstep(.0,.5,knot);
    ground=mix(ground,toLin(uKnotBase),km*uKnotDark);
    light*=1.-km*.95;
    float core=smoothstep(.35,.95,knot);
    light+=kl*uKnotI*core;
    light+=uKnotC*.35*uKnotI*smoothstep(.0,.25,knot)*(1.-core);   // UV haze at the rim
  }
  // ---- sun: hand-cut spectrum rays + white disk + spectral halo + anamorphic streak
  if(uSun.z>0.){
    vec2 p=q-uSun.xy; float r=length(p); float a=atan(p.y,p.x)+uRayRot;
    vec3 rays=sunRays(r,a,uRayN,1.3,uRayLen*.5,uRayLen,uRayW)+sunRays(r,a+.07,uRayN*1.9,4.7,uRayLen*.35,uRayLen*.8,uRayW*.6)*.55;
    rays*=smoothstep(uRayStart*.92,uRayStart*1.1,r);
    float disk=smoothstep(uSun.w+2.,uSun.w-2.,r);
    vec3 sun=rays*1.25+vec3(1.,.97,.88)*disk*1.3+vec3(1.,.85,.55)*exp(-r/(uSun.w*.7))*.5;
    float ring=(r-uRayStart*1.15)/(uSun.w*.7);
    sun+=spec(.5+ring*.4)*exp(-ring*ring*2.5)*uPrism;
    sun+=vec3(1.,.55,.85)*exp(-abs(p.y)/5.)*exp(-abs(p.x)/380.)*uStreak;
    light+=sun*uSun.z*(1.-calm*.6)*(1.-body*uBodyBlock);
  }
  // ---- open enso: one loaded brush of light bristles (dense head, dry split tail), analytic
  if(uEnso.w>0.){
    vec2 p=q-uEnso.xy; float r=length(p);
    if(abs(r-uEnso.z)<uEnsoW*1.6+40.){
      float a=atan(p.y,p.x); float u=mod(a-uEnsoA0,6.2831853)/uEnsoSweep;   // 0..1 along the stroke
      if(u<uEnso.w){
        float wd=uEnsoW*(1.-.62*u)+uEnsoW*.4*exp(-u*18.);
        float rc=uEnso.z+7.*sin(u*6.+6.)+14.*sin(u*3.14159);
        float v=(r-rc)/wd;                                          // -.5..5 across the brush
        float inb=smoothstep(.55,.42,abs(v))*smoothstep(0.,.015,u)*smoothstep(uEnso.w,uEnso.w-.06,u);
        float bi=floor((v+.5)*11.); float bf=fract((v+.5)*11.);
        float bh=h11(bi*7.3+3.);
        float dry=step(1.12-u*.6,h11(bi*13.1+floor(u*22.)))*step(.5,u);
        float br=smoothstep(.5,.05,abs(bf-.5))*(1.-dry)*step(u,.74+.26*bh)*(.55+.45*bh);
        float body=smoothstep(.62,.0,u)*.6;                         // the loaded head reads as one band
        vec3 gold=mix(vec3(1.,.42,.08),vec3(1.,.72,.12),bh); gold=mix(gold,vec3(1.,.93,.7),step(.86,bh));
        light+=pow(gold,vec3(2.2))*inb*(br*1.25+body)*1.5;
      }
    }
  }
  // 2D glow shapes feed the bloom (soft halos) and add only a faint core of their own
  vec3 gl2=pow(texture(uGlow,vUv).rgb,vec3(2.2))*uGlowK;
  o0=vec4(ground+light,1.);
  o1=vec4(light+gl2,1.);
}`;

  const COMP_FS = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D uHdr, uBloom; uniform float uBloomK, uExpo, uGrain, uSeed, uSat, uVig; uniform vec3 uVigCol;
float h12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec3 sh(vec3 x){ vec3 k=vec3(.8); return mix(x,k+(1.-k)*(1.-exp(-(x-k)/(1.-k))),step(k,x)); }
void main(){
  vec3 c=texture(uHdr,vUv).rgb*uExpo+texture(uBloom,vUv).rgb*uBloomK;
  // white-hot cores: energy above 1 in one channel bleeds into the others
  float m=max(c.r,max(c.g,c.b)); c+=vec3(max(0.,m-1.2)*.25);
  c=sh(c);
  float l=dot(c,vec3(.2126,.7152,.0722)); c=max(mix(vec3(l),c,uSat),0.);
  float v=smoothstep(1.25,.4,length((vUv-.5)*vec2(1.,1.15)));
  c=mix(c*uVigCol,c,mix(1.-uVig,1.,v));
  c=pow(c,vec3(1./2.2));
  c+=(h12(gl_FragCoord.xy+uSeed)-.5)*uGrain;
  o=vec4(c,1.);
}`;

  let gl, POOL, COMP, mrt;
  PL.init = function () {
    gl = LX.gl;
    POOL = LX.prog(POOL_FS);
    COMP = LX.prog(COMP_FS);
    // MRT target: attachment 0 = ground+light (HDR), 1 = light only (bloom source)
    const mk = () => {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, GW, GH, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    const t0 = mk(), t1 = mk();
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t0, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, t1, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    mrt = { fb, w: GW, h: GH, A: { tex: t0, w: GW, h: GH }, B: { tex: t1, w: GW, h: GH } };
  };

  const hex = LX.hex;
  const lin = h => LX.lin(h);
  PL.DEF = {
    uScale: 150, uAniso: 1.45, uDarkI: .32, uWarp: 1, uLineW: .06, uLineI: 1.0, uFineI: .7, uGlowI: .3, uBreak: .3, uCalmK: .85, uShadeK: .55,
    uCA: '#FFFFFF', uCB: '#FFF3A6', uCC: '#FF9ACB', uCD: '#C6A3FF', uCX: '#FFFFFF',
    uDrain: [0, 0, 0, 1], uRip: [0, 0, 0, 0], uRipI: 0, uRipW: 60, uRipC: '#FFFFFF',
    uSun: [0, 0, 0, 1], uRayLen: 900, uRayRot: 0, uRayN: 34, uRayW: .32, uPrism: 0, uStreak: 0, uRayStart: 120, uRayOff: 0, uRaySpan: 1,
    uLens: 650, uBodyLineK: .9, uBodyLineI: .55, uBodyLine: '#FFD27A', uBodyGlow: 0, uPullCol: '#FFFFFF',
    uKnotBase: '#1A0838', uKnotA: '#FF2EA6', uKnotB: '#B8FF2C', uKnotC: '#9B5CFF', uKnotI: 1.3, uKnotSeed: 0, uKnotDark: .95, uKnotScale: 30,
    uTiles: 0, uTileSize: 90, uTileC: '#9FD8FF',
    uIsoI: 0, uIsoScale: 80, uIsoW: 2.2, uBodyBlock: 0, uIsoAniso: 1.6, uIsoGate: .4, uIA: '#FFFFFF', uIB: '#FFF3A6', uIC: '#FF9ACB', uID: '#C6A3FF',
    uRings: 0, uRingSp: 70, uRingC: [540, 700], uRingCol: '#FFC94D',
    uPersp: 0, uPerspC: [540, 1450], uPerspCol: '#FFFFFF',
    uEnso: [540, 850, 430, 0], uEnsoA0: -0.78, uEnsoSweep: 5.5, uEnsoW: 70,
  };
  const COLOR_KEYS = new Set(['uCA', 'uCB', 'uCC', 'uCD', 'uCX', 'uRipC', 'uBodyLine', 'uPullCol', 'uKnotA', 'uKnotB', 'uKnotC', 'uTileC', 'uRingCol', 'uPerspCol', 'uIA', 'uIB', 'uIC', 'uID']);
  // the knot base is mixed in linear space from an sRGB triple
  const SRGB_KEYS = new Set(['uKnotBase']);

  PL.render = function (ctx, fieldC, maskA, maskB, U, comp = {}, glowC = null) {
    const fT = LX.canvasTex('field', fieldC), aT = LX.canvasTex('maskA', maskA), bT = LX.canvasTex('maskB', maskB);
    const u = { uField: fT, uMaskA: aT, uMaskB: bT, uGlow: glowC ? LX.canvasTex('glow', glowC) : LX.white, uGlowK: glowC ? (comp.glowK ?? 1.1) : 0 };
    const P = Object.assign({}, PL.DEF, U);
    for (const k in P) {
      const v = P[k];
      if (COLOR_KEYS.has(k)) u[k] = typeof v === 'string' ? lin(v) : v;
      else if (SRGB_KEYS.has(k)) u[k] = typeof v === 'string' ? hex(v) : v;
      else u[k] = v;
    }
    LX.pass(POOL, u, mrt);
    const bl = LX.bloom(mrt.B, comp.levels ?? 4, 0);
    LX.pass(COMP, {
      uHdr: mrt.A, uBloom: bl, uBloomK: (comp.bloomK ?? 1) * 0.16, uExpo: comp.expo ?? 1, uGrain: comp.grain ?? .018, uSeed: comp.seed ?? 0,
      uSat: comp.sat ?? 1, uVig: comp.vig ?? .25, uVigCol: comp.vigCol ? hex(comp.vigCol) : [0.35, 0.2, 0.6],
    }, null, { vp: [0, 0, GW, GH] });
    LX.present(ctx, GW, GH);
  };

  window.PL = PL;
})();
