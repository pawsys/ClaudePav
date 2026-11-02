// ACT 3 (36 to 60): GL scene programs, built from core chunks plus a short main() each (LOOK.md 5.3).
// Five programs (the 59.25 regrab runs on the core rig):
//   a3_drop  36..39     HE IS THE SUN: a flat concentric Hockney sun around him (white, lemon, orange, pink, a thin cyan
//                       prism ring), a kaleidoscope of crisp glass KITES in Hockney's six behind it (two counter-rotating
//                       rings whose overlaps are new colours: the glass makes the shapes), coloured rays exploding out of
//                       the sun and taking the hue of the facets they cross, the 36.0 radial whiteout from the orb (0.85 at
//                       the orb, saturated edges), the 36.0 / 36.75 / 38.6 bursts, his white-hot glass (LENS + BODY)
//   a3_head  39..42.75, 52.44..54   the headless view: the head-space (sky, the sun rising on a horizon of fields that fan
//                       out from the neck, sunburst wedges, rays rising from the viewer and travelling up through the
//                       dark-glass body), the cloud lens; Tilopa's dusk (in GL: the pane is never rebuilt for it)
//   a3_metta 42.75..48.75  the heart space (in GL, opening out of his heart as a disc with a gold edge at 42.75), the af
//                       Klint rosette as jewel glass on the deep heart (petals glow where circles overlap, the centre glows
//                       rose-gold on "pen"), curling rays, gold beat rings, the soft rose-gold bloom
//   a3_til   48.75..52.44  the heart space contracting back into the rosette (48.75..49.5) over the lap, then Tilopa:
//                       sun, wedges, rosette, dusk; each layer leaves on its beat (the ensō is drawn in 2D)
//   a3_rest  54..59.25  the Moon Room: the core night window (WINDOW: panes, floor cast, moon), a pearl halo and long fine
//                       spokes spilling past the arch, the floor cast wobbling like light on water, and Tilopa's beam
//                       sliding across and gathering into the moon at 54.0 (pearl-blue, never neutral grey)
(function () {
  const V2 = window.V2;
  const NS = window.a3_NS = window.a3_NS || {};

  // the flat sun (shared by a3_drop and a3_lap): rings as flat glass lit from inside, a hand-cut edge, a thin cyan ring
  const SUN = `
uniform vec4 uSunR;      // outer radii of the white, lemon, orange and pink rings (screen px)
uniform vec4 uSunP;      // prism ring radius, prism ring width, edge wobble px, white core gain
uniform vec3 uSunCol[5]; // white, lemon, orange, pink, cyan (linear)
vec3 sunCol(float r, float a, out float cov){
  float wob=uSunP.z*(.55*sin(a*5.+1.)+.35*sin(a*9.+2.)+.22*sin(a*14.+.3));   // a hand-cut edge, never a compass circle
  float rr=r+wob;
  cov=cover(rr-uSunR.w);
  vec3 c=uSunCol[3]*(1.+.22*smoothstep(uSunR.w,uSunR.z,rr));
  c=mix(c,uSunCol[2]*(1.+.20*smoothstep(uSunR.z,uSunR.y,rr)),cover(rr-uSunR.z));
  c=mix(c,uSunCol[1]*(1.+.18*smoothstep(uSunR.y,uSunR.x,rr)),cover(rr-uSunR.y));
  c=mix(c,uSunCol[0]*uSunP.w,cover(rr-uSunR.x));
  return c; }
vec3 sunPrism(float r){ float x=r-uSunP.x; return uSunCol[4]*exp(-x*x/(uSunP.y*uSunP.y))*1.15+vec3(1.)*exp(-x*x/(uSunP.y*uSunP.y*.12))*.35; }
`;

  // the kaleidoscope of glass kites (a3_drop): two rings of 12 kites (pointed at both ends, widest a third of the way
  // out, a fold line down the middle), the outer ring offset half a facet and counter-rotating; where two kites overlap the
  // colour is the two filters in series (a new saturated colour); ultramarine shows BETWEEN the kites (never through a
  // lemon kite: that is olive). The crisp 2 px glints on the sun-facing edges are drawn in 2D (act3_drop.js kiteGlints).
  const KITE = `
uniform vec4 uKal;       // centre x,y, rotation (rad: inner ring +, outer ring -1.2x), scale
uniform vec4 uKalK;      // alpha, waist position along the kite (0..1), half width at the waist (fraction of a bin), unused
uniform vec4 uKalR;      // inner ring r0, r1, outer ring r0, r1 (px at scale 1)
uniform vec3 uKalCol[6];
float kiteF(float r, float a, float r0, float r1, float rot, float off, out float id, out float fold, out float edge){
  id=0.; fold=0.; edge=1e3;
  float t=(r-r0)/(r1-r0); if(t<=0.||t>=1.) return 0.;
  float u=(a+rot)*12./TAU+off; id=floor(u); float fu=fract(u)-.5; fold=step(0.,fu);
  float tm=uKalK.y; float w=t<tm? t/tm : (1.-t)/(1.-tm);
  float hw=uKalK.z*w;
  float dpx=(hw-abs(fu))*max(r,1.)*TAU/12.*.72;
  edge=dpx;
  return clamp(dpx/uPx+.5,0.,1.); }
vec4 kites(vec2 P){
  vec2 d=(P-uKal.xy)/max(uKal.w,.01); float r=length(d), a=atan(d.y,d.x);
  float i1,i2,f1,f2,e1,e2;
  float c1=kiteF(r,a,uKalR.x,uKalR.y,uKal.z,0.,i1,f1,e1);
  float c2=kiteF(r,a,uKalR.z,uKalR.w,-uKal.z*1.2,.5,i2,f2,e2);
  float cov=c1+c2-c1*c2; if(cov<=0.) return vec4(0.);
  vec3 A=uKalCol[int(mod(i1,6.))]*mix(1.08,.80,f1), B=uKalCol[int(mod(i2+3.,6.))]*mix(1.08,.80,f2);
  vec3 pr=A*B; float mA=max(A.r,max(A.g,A.b)), mB=max(B.r,max(B.g,B.b));
  vec3 ov=pr/max(max(pr.r,max(pr.g,pr.b)),1e-4)*min(mA,mB)*.95;      // two filters in series, normalised
  float both=c1*c2;
  vec3 col=(A*c1*(1.-c2)+B*c2*(1.-c1)+ov*both)/max(cov,1e-4);
  float gl=max(c1*exp(-max(e1,0.)/2.2),c2*exp(-max(e2,0.)/2.2))*.35;   // the soft part of the edge glint (crisp in 2D)
  col=mix(col,vec3(1.,.98,.95),gl);
  return vec4(col,cov*uKalK.x); }
`;

  // ------------------------------------------------------------------ a3_drop
  V2.L.program('a3_drop', ['PANE', 'LENS', 'BODY', 'RAYS', 'BURST', 'CALM'], SUN + KITE + `
uniform vec4 uSunC;      // sun centre x,y (screen), unused, unused
uniform vec4 uRay;       // ray amount, ray front radius px, ray rotation (rad), colour cycle offset (beat index)
uniform vec4 uDropK;     // unused, kite amount, unused, kite floor behind the captions
uniform vec4 uCamD;      // camera k, camera centre x, y, horizon world y
uniform vec4 uWhite;     // the 36.0 radial whiteout: centre x,y (the orb), amount (0.85 cap at the centre), radius px
uniform vec3 uRayCol[6];
uniform vec4 uPaneT;     // screen -> pane (the pane is drawn once at k 1; the camera punch is free)
float hzS(float xs){ float xw=uCamD.y+(xs-uCamD.y)/uCamD.x; float hw=uCamD.w+9.*sin(xw*.0105+1.3)+5.*sin(xw*.023+.4); return uCamD.z+(hw-uCamD.z)*uCamD.x; }
vec3 world(vec2 P, float cm){
  vec3 g=pane(P*uPaneT.x+uPaneT.yz);
  float hy=hzS(P.x);
  float sky=smoothstep(hy+uPx,hy-uPx,P.y);
  vec3 c=g;
  // the glass kites behind the sun (sky only)
  vec4 k=kites(P); float ka=k.a*sky*uDropK.y*mix(uDropK.w,1.,smoothstep(.12,.6,cm));   // glass thins behind the captions
  c=mix(c,k.rgb,ka);
  // the sun's rays: a radial explosion, colours cycling on the beat; light that crosses a kite takes its hue
  vec2 d=P-uSunC.xy; float r=length(d), a=atan(d.y,d.x);
  if(uRay.x>0.){
    vec2 h1=hair(r,a+uRay.z,36.,3.,900.,1900.,7.);
    int ci=int(mod(floor(h1.y*6.)+uRay.w,6.));
    vec3 rc=uRayCol[ci]*h1.x*1.5;
    vec2 h2=hair(r,a-uRay.z*.7,76.,17.,480.,1200.,2.6);
    rc+=vec3(1.,.96,.88)*h2.x*.12;
    float m=smoothstep(uSunR.w*.97,uSunR.w*1.14,r)*smoothstep(uRay.y+70.,uRay.y-70.,r)*sky;
    rc=mix(rc,tintBy(rc,k.rgb),ka);
    c+=rc*m*uRay.x*mix(.22,1.,cm);
  }
  // the flat concentric Hockney sun, rising behind the fields
  float cv; vec3 s=sunCol(r,a,cv);
  c=mix(c,s,cv*sky);
  c+=sunPrism(r)*sky;
  return c; }
void main(){
  vec2 P=canvasPx(vUv); float cm=calm(P);
  float lq=lensQ(P,uBody); float aw=3.*uPx/max(min(uBody.z,uBody.w),1.);
  float inL=smoothstep(1.+aw,1.-aw,lq)*step(0.,uLens);
  vec2 Q=mix(P,lensPos(P,uBody,uLens,1.),inL);
  vec3 c=world(Q,cm);
  // 36.0: the whiteout comes OUT OF THE ORB (0.85 at the orb, about 0.2 by 500 px, the frame edges keep their colour)
  if(uWhite.z>0.){ vec2 w=P-uWhite.xy; c=mix(c,vec3(1.,.97,.92)*1.15,uWhite.z*exp(-dot(w,w)/(uWhite.w*uWhite.w))); }
  c=burst(P,c);                    // a burst passing behind him is seen through his glass
  if(inL>0.) c=bodyGlass(P,c);
  o=vec4(c,1.); }`);

  // ------------------------------------------------------------------ a3_head, a3_metta, a3_til (one world, three variants)
  // SwiftShader evaluates every branch (a feature gated by a uniform still costs), so each section compiles only the
  // features it uses.
  const LAP = f => `
uniform vec4 uCamL;      // camera k, ox, oy (screen = world*k + o), horizon world y
uniform vec4 uSunL;      // sun centre x,y (screen), sun amount, dark-glass absorption (1 = on)
uniform vec4 uWedge;     // amount, rotation (rad), count, fields alpha (1: the wedges keep to the sky above the fields)
uniform vec4 uRise;      // rising rays: amount, origin x, y (screen), rotation
uniform vec4 uRiseK;     // rising rays: travel phase (rad), unused...
uniform vec4 uCurl;      // curling rays: amount, centre x, y (screen), phase
uniform vec4 uRingG;     // gold beat ring: centre x, y, radius px, amp
uniform vec4 uRingP;     // the 47.25 heart ring: radius px, amp, width px, unused
uniform vec4 uSoft;      // the 42.75 soft rose-gold bloom: centre x, y, ring radius px, amount
uniform vec4 uHeartM;    // the heart space: centre x, y (screen), radius px (the disc it covers), feather px
uniform vec4 uHeartK;    // gold edge ring amount, mask amount (0..1), unused, unused
uniform vec4 uDusk;      // Tilopa's dusk: amount, unused...
uniform vec4 uPaneT;     // screen -> pane: pane = P * x + (y, z) (the pane is drawn once in world space; camera moves are free)
uniform vec4 uRose;      // centre x,y, ring distance, circle radius
uniform float uRoseRot;
uniform vec3 uRoseCol[7];
uniform float uRoseOpen[7];
uniform vec4 uRoseQ;     // glass alpha (.62), petal glow, "pen" glow (47.25), unused
float hzL(float xs){ float xw=(xs-uCamL.y)/uCamL.x; return (uCamL.w+8.*sin(xw*.012+.7)+5.*sin(xw*.027+2.1))*uCamL.x+uCamL.z; }
// the heart space: deep plum at his heart, raspberry out toward the frame edges (the rosette needs a dark ground to be
// jewel glass: screen and light on dark), a little rose and apricot warmth in the far corners
vec3 heartCol(vec2 P){
  float r=length(P-uHeartM.xy);
  vec3 c=mix(HX(70.,9.,48.),HX(98.,15.,58.),smoothstep(0.,380.,r));
  c=mix(c,HX(146.,26.,82.),smoothstep(260.,720.,r));
  c=mix(c,HX(179.,36.,94.),smoothstep(620.,960.,r));
  c=mix(c,HX(236.,104.,146.),smoothstep(860.,1200.,r)*.75);
  c=mix(c,HX(242.,120.,158.),smoothstep(1150.,1420.,P.y)*smoothstep(420.,860.,r)*.45);
  return c; }
float heartMask(vec2 P){ float r=length(P-uHeartM.xy); return smoothstep(uHeartM.z+uHeartM.w,uHeartM.z-uHeartM.w,r)*uHeartK.y; }
${f.ROSE ? `// af Klint rosette on the heart space (a copy of the core ROSE recipe, plus light): one circle = its own colour, richer;
// where circles overlap the glass acts as filters in series AND the petal glows; "pen" lights the centre rose-gold
vec4 rose2(vec2 P, out vec3 glow){
  vec3 sum=vec3(0.), prod=vec3(1.); float n=0., rim=0., c0=0.;
  glow=vec3(0.);
  for(int i=0;i<7;i++){
    float op=uRoseOpen[i]; if(op<=0.) continue;
    vec2 c=uRose.xy;
    if(i>0){ float ph=uRoseRot+float(i-1)*TAU/6.; c+=uRose.z*op*vec2(cos(ph),sin(ph)); }
    float dd=length(P-c)-uRose.w*mix(.6,1.,op);
    float ins=cover(dd)*op;
    if(i==0) c0=ins;
    sum+=uRoseCol[i]*ins; n+=ins; prod*=mix(vec3(1.),uRoseCol[i],ins); rim+=exp(-dd*dd/2.)*op;
  }
  if(n<=0.) return vec4(0.);
  vec3 one=sum/max(n,1e-3);
  one=max(mix(vec3(lum(one)),one,1.45),0.);
  float m1=max(one.r,max(one.g,one.b));
  vec3 ser=prod/max(max(prod.r,max(prod.g,prod.b)),1e-4)*m1;
  float ov=smoothstep(1.,2.,n);
  vec3 col=mix(one,ser,ov);
  col=mix(col,vec3(1.,.98,.95),min(rim,1.)*.45);
  vec3 gold=HX(255.,196.,96.);
  glow=ser*ov*uRoseQ.y+(HX(255.,168.,40.)*.75*ov+HX(255.,120.,96.)*.9*c0)*uRoseQ.z;      // petals glow; "pen": heart rose-gold, petals gold
  return vec4(col,clamp(min(n,1.)*uRoseQ.x+ov*.25+min(rim,1.)*.45,0.,.92)); }` : ''}
vec3 world(vec2 P, float cm){
  vec2 PP=P*uPaneT.x+uPaneT.yz;
  vec3 g=pane(PP);
  ${f.SIL ? `float sil=clamp((1.-texture(uPane,toUV(PP)).a)*2.,0.,1.)*uSunL.w;   // the dark-glass figure (marked in the pane's alpha)` : `float sil=0.;`}
  ${f.DUSK ? `if(uDusk.x>0.){   // (final pass) a quadratic path through saturated violet: a straight mix passed through grey mauve
    float dk=uDusk.x*(1.-sil), yy=clamp(P.y/1350.,0.,1.);
    vec3 tg=mix(HX(42.,31.,92.),HX(20.,18.,58.),yy), md=mix(HX(118.,28.,146.),HX(72.,22.,124.),yy);
    g=(1.-dk)*(1.-dk)*g+2.*dk*(1.-dk)*md+dk*dk*tg; }` : ''}
  ${f.HEART ? `float hm=heartMask(P); g=mix(g,heartCol(P),hm); sil*=1.-hm;` : `float hm=0.;`}
  vec3 c=g;
  float dark=1.-.86*sil;                                             // the dark glass absorbs the light behind it
  ${f.SIL ? `float hy=hzL(P.x);
  float sky=smoothstep(hy+uPx,hy-uPx,P.y);
  vec2 d=P-uSunL.xy; float r=length(d), a=atan(d.y,d.x);` : ''}
  ${f.WEDGE ? `{ float skyM=mix(1.,sky,uWedge.w)*dark*(1.-hm);
    float w=wedge(a,r,uWedge.z,uWedge.y,.5,1.6);
    float m=smoothstep(uSunR.w*.96,uSunR.w*1.3,r)*smoothstep(1500.,240.,r)*skyM;
    c=screen(c,HX(255.,246.,214.)*w*m*uWedge.x*.36*mix(.12,1.,cm)); }` : ''}
  ${f.RISE ? `{ vec2 v=P-uRise.yz; float vr=length(v);
    vec2 h=hair(vr,atan(v.y,v.x)+uRise.w,120.,9.,1500.,2400.,5.);
    float tr=.45+.55*pow(.5+.5*sin(vr*.0105-uRiseK.x+h.y*6.),3.);     // light travelling up the rays, away from the viewer
    c+=tintBy(HX(255.,240.,200.),g)*h.x*tr*.5*uRise.x*mix(dark,1.,.22)*mix(.30,1.,cm); }` : ''}
  ${f.CURL ? `{ vec2 e=P-uCurl.yz; float er=length(e);
    float ea=atan(e.y,e.x)+.42*sin(er*.0062-uCurl.w);
    vec2 h=hair(er,ea,64.,3.,420.,900.,5.);
    vec3 hc=h.y<.5?HX(255.,194.,61.):(h.y<.8?HX(255.,120.,170.):HX(255.,238.,190.));
    c+=hc*h.x*.42*uCurl.x*smoothstep(900.,90.,er)*mix(.25,1.,cm)*dark; }` : ''}
  ${f.SUN ? `{ float cv; vec3 s=sunCol(r,a,cv);
    float sm=mix(1.,sky,uWedge.w)*(1.-hm);
    c=mix(c,s,cv*sm*min(uSunL.z,1.)*dark);
    c+=sunPrism(r)*sm*uSunL.z*dark; }` : ''}
  ${f.ROSE ? `{ vec3 gw; vec4 ro=rose2(P,gw); float inB=smoothstep(1.15,.75,lensQ(P,uBody));   // softer behind his glass (no pinwheel in him)
    c=mix(c,ro.rgb,ro.a*(1.-.6*inB)); c+=gw*(1.-.5*inB); }` : ''}
  ${f.RINGS ? `if(uRingG.w>0.){ float x=length(P-uRingG.xy)-uRingG.z; c+=HX(255.,210.,122.)*(exp(-x*x/80.)*.85+exp(-x*x/900.)*.30)*uRingG.w; }
  if(uRingP.y>0.){ float x=length(P-uCurl.yz)-uRingP.x; c+=(HX(255.,194.,61.)*exp(-x*x/(uRingP.z*uRingP.z))*1.3+HX(255.,236.,200.)*exp(-x*x/70.)*.45)*uRingP.y; }` : ''}
  ${f.HEART ? `if(uHeartK.x>0.){ float x=length(P-uHeartM.xy)-uHeartM.z; c+=HX(255.,200.,110.)*(exp(-x*x/160.)*1.1+exp(-x*x/5000.)*.30)*uHeartK.x; }` : ''}
  return c; }
void main(){
  vec2 P=canvasPx(vUv); float cm=calm(P);
  float lq=lensQ(P,uBody); float aw=3.*uPx/max(min(uBody.z,uBody.w),1.);
  float in1=smoothstep(1.+aw,1.-aw,lq)*step(0.,uLens);
  ${f.LENS2 ? `float in2=(1.-step(.5,in1))*step(lensQ(P,uBody2),1.)*step(1e-4,uLens2);
  vec2 Q=in1>0.?mix(P,lensPos(P,uBody,uLens,1.),in1):(in2>0.?lensPos(P,uBody2,uLens2,1.):P);` : `vec2 Q=mix(P,lensPos(P,uBody,uLens,1.),in1);`}
  vec3 c=world(Q,cm);
  ${f.SOFT ? `if(uSoft.w>0.){ float rs=length(P-uSoft.xy); vec3 wm=HX(255.,178.,150.);
    c=mix(c,wm*1.1,.10*uSoft.w); c+=wm*exp(-rs*rs/(2.*150.*150.))*1.3*uSoft.w+HX(255.,130.,170.)*exp(-rs/420.)*.35*uSoft.w; }` : ''}
  if(in1>0.) c=bodyGlass(P,c);
  o=vec4(c,1.); }`;
  const lapChunks = () => ['PANE', 'LENS', 'BODY', 'RAYS', 'CALM'];
  const VAR = {
    a3_head: { SIL: 1, SUN: 1, WEDGE: 1, RISE: 1, LENS2: 1, DUSK: 1 },
    a3_metta: { HEART: 1, ROSE: 1, CURL: 1, RINGS: 1, SOFT: 1 },
    a3_til: { SIL: 1, SUN: 1, WEDGE: 1, LENS2: 1, ROSE: 1, HEART: 1, DUSK: 1 },
  };
  for (const k in VAR) V2.L.program(k, lapChunks(VAR[k]), SUN + LAP(VAR[k]));
  // once the rosette, the heart and the cloud have gone (50.6) Tilopa runs on the lighter a3_head
  NS.LAPKEY = t => t < 42.75 ? 'a3_head' : t < 48.75 ? 'a3_metta' : t < 50.6 ? 'a3_til' : 'a3_head';

  // ------------------------------------------------------------------ a3_rest
  V2.L.program('a3_rest', ['PANE', 'LENS', 'BODY', 'WINDOW', 'RAYS', 'CALM'], `
uniform vec4 uFloor;     // floor y (screen), water wobble amount, unused, window amount (fade in)
uniform vec4 uRBeam;     // the 54.0 beam: amount, x, top y, bottom y (screen)
uniform vec4 uRBeamK;    // beam width px, unused...
uniform vec4 uMoonX;     // the moon's light past the window: halo amount, spokes amount, spoke rotation, inside boost
void main(){
  vec2 P=canvasPx(vUv);
  float lq=lensQ(P,uBody); float aw=3.*uPx/max(min(uBody.z,uBody.w),1.);
  float inL=smoothstep(1.+aw,1.-aw,lq)*step(0.,uLens);
  vec2 Q=mix(P,lensPos(P,uBody,uLens,1.),inL);
  // the floor is a still water of light: the cast wobbles a little (rest never reaches the seam; free-running is fine)
  float fl=smoothstep(uFloor.x,uFloor.x+60.,Q.y)*uFloor.y;
  vec2 Qw=Q+fl*vec2(5.*sin(Q.y*.045+uT*1.7)+3.*sin(Q.y*.11-uT*2.3+Q.x*.004),0.);
  vec3 c=pane(Qw);
  c=mix(c,windowLight(Qw,c),uFloor.w);
  if(fl>0.){ float z=max(Q.y-uFloor.x,0.);
    vec2 q=vec2((Q.x-560.)/(52.+.75*z), 6.2*log(1.+z/55.));
    q+=.34*vec2(sin(q.y*1.7+uT*2.1),sin(q.x*1.9-uT*2.3)); q+=.18*vec2(sin(q.y*3.1-uT*2.9),sin(q.x*2.7+uT*2.2));
    float f=sin(2.*q.x)+sin(2.6*q.y+sin(1.4*q.x)); float cs=smoothstep(.22,0.,abs(f));
    c+=mix(HX(159.,180.,255.),HX(244.,239.,216.),.4)*cs*.12*fl*smoothstep(0.,50.,z); }
  // the moon: a pearl disc behind the rose, its blue halo and fine spokes spilling past the arch (light, not paint)
  if(uMoonX.x>0.){
    vec2 d=P-uMoon.xy; float r=length(d), a=atan(d.y,d.x)+uMoonX.z;
    float outA=smoothstep(-2.,10.,archD(P));
    vec3 lil=HX(159.,180.,255.), pearl=HX(244.,239.,216.), spk=HX(220.,230.,255.);
    c+=lil*exp(-r/170.)*.70*uMoonX.x*mix(.55,1.,outA)+lil*exp(-r/420.)*.12*uMoonX.x;
    c+=pearl*pow(smoothstep(uMoon.z*1.05,uMoon.z*.2,r),1.4)*uMoonX.w;
    vec2 h=hair(r,a,96.,7.,uMoon.z*3.,uMoon.z*7.,3.);
    c+=mix(spk,lil,h.y)*h.x*.32*uMoonX.y*smoothstep(uMoon.z*1.6,uMoon.z*2.6,r)*mix(.35,1.,outA);
  }
  float x=P.x-uRBeam.y, w=max(uRBeamK.x,1.);
  float vm=smoothstep(uRBeam.z-20.,uRBeam.z+190.,P.y)*smoothstep(uRBeam.w+20.,uRBeam.w-60.,P.y);   // fades in below the caption
  c+=(vec3(1.)*exp(-x*x/(w*w*.05))*1.1+HX(220.,230.,255.)*exp(-x*x/(w*w))*.5+HX(159.,180.,255.)*exp(-abs(x)/(w*1.6))*.25)*vm*uRBeam.x;
  if(inL>0.) c=bodyGlass(P,c);
  o=vec4(c,1.); }`);
})();
