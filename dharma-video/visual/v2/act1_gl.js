// ACT 1 (0 to 18): GL scene programs, built from core chunks plus a short main() each (LOOK.md 5.3).
// Four programs (the hook frames 0..6 and 15..17.55 run on the core rig, the plate on core_trivial):
//   a1_guy   6..9     sunburst wedges of orange and magenta glass behind the meditator, inside a tall ultramarine
//                     glass panel (light that crosses the panel takes its hue), gold hairline rays, the 6.0 burst
//   a1_all   9..10.5  the void; ALL in stained glass (panes live in the pane), light pouring out of the letters as god
//                     rays (a short march toward the light behind them, tinted by the glass it left), the 9.40 crack
//   a1_join  10.5..12 the Hockney joiner: four tilted glass windows, each a window into the SAME hook world (one iris,
//                     one knot, one clenched glass body seen four times, mapped per cell; one world() call site)
//   a1_win   12..13.3 the saint window (core WINDOW chunk) refracted through his coral glass body (LENS + BODY)
(function () {
  const V2 = window.V2;

  // ------------------------------------------------------------------ a1_guy
  V2.L.program('a1_guy', ['PANE', 'RAYS', 'BURST', 'CALM'], `
uniform vec4 uGuy;      // sunburst centre x,y, reveal radius px, rotation (rad)
uniform vec4 uGuyK;     // snare pulse 0..1, whip 0..1, hairline ray intensity, halo glow
uniform vec4 uPanel;    // tall glass panel: centre x, apex y, half width, bottom y
uniform vec4 uGuyZ;     // push-in: centre x,y (screen px), scale, unused
uniform vec4 uGuyO;     // the field outside the panel: wedge alpha, mix toward the ultramarine ground, unused, unused
uniform vec4 uGuyF;     // the meditator's ground point x,y, shadow amount, unused
uniform vec3 uWA, uWB, uWS;   // wedge glass A (orange), B (magenta), the two in series (linear)
float panelD(vec2 P){
  float yc=uPanel.y+uPanel.z;
  float d=P.y<yc? length(vec2(P.x-uPanel.x,P.y-yc))-uPanel.z : abs(P.x-uPanel.x)-uPanel.z;
  return max(d,P.y-uPanel.w); }
void main(){
  vec2 S=canvasPx(vUv);
  float cm=calm(S);
  vec2 P=uGuyZ.xy+(S-uGuyZ.xy)/uGuyZ.z;                  // the slow push-in on the meditator
  vec3 c=pane(P);
  float pd=panelD(P);
  float inP=clamp(.5-pd*uGuyZ.z/uPx,0.,1.);
  float nearP=max(inP,.55*smoothstep(150.,0.,pd));       // inside, or just behind the panel (a 150 px aura round it)
  vec2 d=P-uGuy.xy; float r=length(d), a=atan(d.y,d.x);
  float rev=smoothstep(uGuy.z+90.,uGuy.z-90.,r);
  float fade=smoothstep(1500.,240.,r)*rev*(1.-.86*smoothstep(600.,150.,P.y));    // fading out under the caption
  // two families of 12 glass wedges with soft edges, offset so each orange wedge overlaps the next magenta one on one
  // side (a strip of the two filters in series: a third, saturated colour) and leaves ultramarine showing on the other
  // (final pass) crisper glass edges in the panel (7 px, was 9; the edge-density gate holds) and a glint, soft outside (11 px, the calm field): they read as airbrushed gradients)
  float sf=mix(11.,7.,nearP);
  float wA=wedge(a,r,12.,uGuy.w,.36,sf), wB=wedge(a,r,12.,uGuy.w+TAU/12.*.31,.36,sf);
  float both=wA*wB, cov=max(wA+wB-both,1e-3);
  vec3 gc=(uWA*wA*(1.-wB)+uWB*wB*(1.-wA)+uWS*both)/cov;
  gc*=mix(vec3(1.),vec3(.92,.86,.95),wB*(1.-wA));
  // the panel is the one event: full-strength glass inside it; outside, a calm field settling toward the ground
  vec3 gOut=mix(gc,HX(27.,42.,140.),uGuyO.y);
  vec3 wc=mix(gOut,gc,nearP)*(1.+.22*uGuyK.x);
  float al=max(wA,wB)*fade*mix(uGuyO.x,.88+.12*uGuyK.x,nearP);
  c=mix(c,wc,al);
  // a 2 px white glint on each wedge's leading edge, inside the panel only (light caught on the edge of the glass)
  { float fA=fract((a+uGuy.w)/TAU*12.)-.5, fB=fract((a+uGuy.w+TAU/12.*.31)/TAU*12.)-.5, hw=.18*TAU*r/12.;
    float gA=exp(-pow((fA*TAU*r/12.-hw)/2.2,2.)), gB=exp(-pow((fB*TAU*r/12.-hw)/2.2,2.));
    c+=vec3(1.,.96,.9)*max(gA,gB)*.10*fade*inP*cm*smoothstep(90.,260.,r); }
  // the figure's coloured shadow: a soft ultramarine silhouette behind the light drawing (head, body, cushion), so the
  // white line reads on the bright glass (LOOK 2.5: shadows are a cooler hue, never grey)
  vec2 F=uGuyF.xy;
  float fd=min(min(length(P-(F+vec2(0.,-268.)))-52., sdEll(P-(F+vec2(0.,-138.)),vec2(170.,150.))), sdEll(P-(F+vec2(0.,-34.)),vec2(185.,52.)));
  float fm=smoothstep(80.,-30.,fd)*uGuyF.z;
  c=mix(c,HX(36.,30.,128.)+c*.10,fm*.85);
  // gold hairline rays from the centre (60), tinted by the glass they cross; in and just behind the panel only
  vec2 h=hair(r,a-uGuy.w*.5,60.,5.,520.,1500.,8.);
  vec3 hc=mix(HX(255.,226.,150.),vec3(1.),step(.7,h.y));
  c+=tintBy(hc,al>.3?gc:HX(127.,216.,255.))*h.x*uGuyK.z*fade*cm*nearP*(1.+.6*uGuyK.x)*smoothstep(70.,240.,r)*(1.-.8*fm);
  // the warm light behind his head (the source of the burst): a deep gold aura, never a white disc
  c+=HX(255.,150.,40.)*(exp(-r/90.)*.10+exp(-r/460.)*.05)*rev*uGuyK.w;
  c=burst(S,c);
  o=vec4(c,1.); }`);

  // ------------------------------------------------------------------ a1_all
  V2.L.program('a1_all', ['PANE', 'RAYS'], `
uniform vec4 uAll;      // light centre x,y (behind the letters), ray level (dims with the sub drop), ray gain
uniform vec4 uAllT;     // tremor x,y (px), ray shimmer phase, crack amount 0..1
uniform vec4 uLet[3];   // the three letters: centre x,y, half width, half height (canvas px): a hot spot behind each
uniform vec2 uCrack[8]; // the 9.40 crack polyline (canvas px)
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-4),0.,1.); return length(pa-ba*h); }
void main(){
  vec2 P=canvasPx(vUv);
  vec2 Q=P-uAllT.xy;
  vec3 g=pane(Q);
  float glass=smoothstep(.03,.12,lum(g));                     // where the lit letters are
  // backlit glass, the brightest thing on screen: a hot spot behind each letter (1.25 at its core, .85 at its edges),
  // seedy-glass value noise (+-8%), in HDR so the bloom catches the panes (not the rays)
  float hot=0.;
  for(int i=0;i<3;i++){ vec2 q=(Q-uLet[i].xy)/max(uLet[i].zw,vec2(1.)); hot=max(hot,exp(-dot(q,q)*1.2)); }
  float seedy=1.+.10*(vn(Q/95.+3.1)*2.-1.)+.05*(vn(Q/29.+7.3)*2.-1.)
            +.07*sin((Q.x*.55+Q.y)*.05+vn(Q/70.)*5.);          // cathedral-glass striations
  vec3 lit=g*mix(.85,1.25,hot)*seedy*1.22;
  // god rays: march from this pixel toward the light behind the letters; the light that escaped past (or through)
  // the glass streams outward in the glass's own colours, as a few wide shafts that die out fast (the void stays void)
  vec2 C=uAll.xy, dd=Q-C;
  float j=h12(gl_FragCoord.xy+vec2(uF*.37,uF*.11));
  vec3 acc=vec3(0.); float w=1., ws=0.;
  for(int i=0;i<12;i++){ float f=(float(i)+j)/12.; vec3 s=pane(C+dd*(1.-f*.70)); acc+=max(s-vec3(.035),vec3(0.))*w; ws+=w; w*=.90; }
  acc/=ws;
  float r=length(dd), a=atan(dd.y,dd.x);
  vec2 bm=beams(a+uAllT.z*.02,12.,3.,.40,.30);
  float streak=.30+.95*bm.x;
  float fall=exp(-max(r-400.,0.)/230.);
  vec3 rays=acc*vec3(1.,.55,.32)*streak*uAll.w*fall*smoothstep(40.,260.,r);
  vec3 c=g*mix(1.,mix(.85,1.25,hot)*seedy*1.22,glass)+rays*(1.-.85*glass)*uAll.z;
  // the crack: one neon-white line splitting the void BEHIND the letters
  if(uAllT.w>0.){
    float dm=1e5; for(int i=0;i<7;i++) dm=min(dm,sdSeg(P,uCrack[i],uCrack[i+1]));
    vec3 cr=vec3(1.)*exp(-dm*dm/(2.*2.2*2.2))*1.6+HX(72.,229.,255.)*(exp(-dm/14.)*.9+exp(-dm/70.)*.25);
    c+=cr*uAllT.w*(1.-glass);
  }
  o=vec4(c,1.); }`);

  // ------------------------------------------------------------------ a1_join
  V2.L.program('a1_join', ['PANE', 'LENS', 'BODY', 'IRIS', 'DASHES', 'CALM'], `
uniform vec4 uCell[4];  // screen centre x,y, rotation (rad), world scale k (screen px per world px)
uniform vec4 uCellH[4]; // half width, half height (screen px), pop scale (0 = not yet in), slam flash
uniform vec3 uCellT[4]; // panel glass tint (linear)
uniform vec4 uCellS[4]; // the mini's squeeze in this window: squash, pivot x,y (world px), unused
uniform vec4 uJoinV;    // world point at every cell centre x,y; ground lift; unused
uniform vec4 uKnot;     // knot (world px) x,y,R, aperture glow
uniform vec4 uHookK;    // dash intensity, dash speed (cycles / 60 s), unused, boil seed
vec3 world(vec2 P){
  vec3 g=pane(P);
  vec3 ic, top; float cov=iris(P,ic,top);
  vec3 c=mix(g*mix(.30,1.,smoothstep(uKnot.z,uKnot.z*1.35,length(P-uKnot.xy))),mix(g,ic,irisAlpha),cov);
  vec3 d=inflow(P,uKnot.xy,uKnot.z*.98,uHookK.y,1.,300.,uHookK.w,.8);
  d=tintBy(d,cov>.5?top:HX(198.,163.,255.));
  c+=d*uHookK.x*mix(.35,1.,smoothstep(uKnot.z*1.05,uIris.z*1.12,length(P-uKnot.xy)));
  return c; }
void main(){
  vec2 P=canvasPx(vUv);
  float cm=calm(P);
  // the ground between the windows: deep indigo glass, a little lighter toward the centre
  vec3 bg=mix(HX(27.,20.,102.),HX(36.,26.,112.),exp(-length(P-vec2(540.,640.))/700.))*(1.+uJoinV.z);
  float n=0., topCov=0., k=1., kw=1., fl=0., rim=0.; vec2 lp=vec2(0.); vec3 tint=vec3(0.), tint2=vec3(0.); vec4 sq=vec4(0.); bool hit=false;
  for(int i=0;i<4;i++){
    vec4 C=uCell[i], H=uCellH[i];
    if(H.z<=0.) continue;
    vec2 q=P-C.xy; float cs=cos(C.z), sn=sin(C.z);
    vec2 l=vec2(cs*q.x+sn*q.y,-sn*q.x+cs*q.y)/H.z;
    float dd=sdRBox(l,H.xy,8.);
    float cv=clamp(.5-dd*H.z/uPx,0.,1.);
    if(cv>0.){ n+=cv; tint2=tint; tint=uCellT[i]; topCov=cv; lp=l; kw=C.w; k=C.w*H.z; fl=H.w; sq=uCellS[i]; rim=smoothstep(-30.,-3.,dd*H.z); hit=true; }
  }
  if(!hit){ o=vec4(bg,1.); return; }
  vec2 Pw=uJoinV.xy+lp/kw;
  // the mini squeezes: his glass is evaluated in unsquashed space (a squash about the bottom of his body)
  vec2 Pb=sq.yz+(Pw-sq.yz)/vec2(1.+.5*sq.x,1.-sq.x);
  float lq=lensQ(Pb,uBody); float aw=3.*uPx/max(min(uBody.z,uBody.w)*k,1.);
  float inL=smoothstep(1.+aw,1.-aw,lq)*step(0.,uLens);
  vec2 Q=mix(Pw,lensPos(Pb,uBody,uLens,1.),inL);
  vec3 c=world(Q);
  if(inL>0.) c=bodyGlass(Pb,c);
  // each window is a sheet of glass, tinted lightly (8%) so the blades keep their saturation; the tint gathers at the
  // window's rim, and where two windows overlap the light passes both: the seam glows
  c=screen(c,tint*(.08+.45*rim))*(1.+.9*fl);
  c+=(tint+tint2)*.32*clamp(n-1.,0.,1.);
  // a thin bright rim inside each window's edge (glass catching the light)
  c=mix(bg,c,topCov);
  o=vec4(c,1.); }`);

  // ------------------------------------------------------------------ a1_win
  V2.L.program('a1_win', ['PANE', 'LENS', 'BODY', 'WINDOW', 'CALM'], `
uniform vec4 uWinX;     // halo glow centre x,y, strength, lens blur radius (px)
uniform vec3 uLensTint; // inside his body the window is only a hint: blurred and mixed toward his glass (linear)
void main(){
  vec2 P=canvasPx(vUv);
  float lq=lensQ(P,uBody); float aw=3.*uPx/max(min(uBody.z,uBody.w),1.);
  float inL=smoothstep(1.+aw,1.-aw,lq)*step(0.,uLens);
  vec2 Q=mix(P,lensPos(P,uBody,uLens,1.),inL);
  vec3 c=windowLight(Q,pane(Q));
  if(inL>0.){
    // a soft 9-tap sample of the panes (the hero stays a glass body, not a pinwheel of stripes; the rose's centre and
    // its lead point blur away), then 40% toward his coral glass
    float br=uWinX.w; vec3 b=vec3(0.);
    for(int i=-1;i<=1;i++) for(int j=-1;j<=1;j++) b+=pane(Q+vec2(float(i),float(j))*br);
    b*=uWinK.x/9.;
    b=mix(b,uLensTint*max(lum(b),.04)/max(lum(uLensTint),1e-3),.4);
    c=mix(c,b,inL);
  }
  c+=HX(255.,194.,61.)*exp(-length((P-uWinX.xy)/vec2(1.,.55))/70.)*uWinX.z;
  if(inL>0.) c=bodyGlass(P,c);
  o=vec4(c,1.); }`);
})();
