// Shared GLSL for the "everything made of rays" lookdev.
// All scene shaders work in canvas pixels (1080x1350, y down) via q = canvasPx(vUv).
// The light layer renders at 540x675 (uPx = 2 canvas px per fragment) and is upscaled.
(function () {
  const RG = {};
  RG.HEAD = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform vec2 uRes; uniform float uT, uF, uPx;
#define TAU 6.28318530718
`;
  RG.COMMON = `
float h11(float p){ p=fract(p*.1031); p*=p+33.33; p*=p+p; return fract(p); }
float h12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2 h22(vec2 p){ vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h12(i),h12(i+vec2(1,0)),f.x),mix(h12(i+vec2(0,1)),h12(i+1.),f.x),f.y); }
vec3 L(vec3 c){ return pow(c,vec3(2.2)); }                    // sRGB -> linear
vec3 HX(float r,float g,float b){ return pow(vec3(r,g,b)/255.,vec3(2.2)); }
vec3 spec(float x){ x=fract(x); return clamp(vec3(abs(x*6.-3.)-1.,2.-abs(x*6.-2.),2.-abs(x*6.-4.)),0.,1.); }
float sdEll(vec2 p, vec2 r){ float k0=length(p/r); float k1=length(p/(r*r)); return k0*(k0-1.)/max(k1,1e-4); }
float sdCap(vec2 p, vec2 a, vec2 b, float r){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-r; }
vec2 canvasPx(vec2 uv){ return vec2(uv.x,1.-uv.y)*vec2(1080.,1350.); }
float lph(float n){ return TAU*n*uT/60.; }                     // loop-safe phase: n whole cycles per 60 s

// Hairline rays from a source: N angular bins, one jittered ray per bin, CONSTANT pixel width.
// returns vec2(intensity, colour-hash). Below ~1 fragment per bin it averages (no moire at the hot core).
vec2 hair(float r, float a, float N, float seed, float len0, float len1, float wpx){
  float u=a/TAU*N+seed; float id=floor(u); float f=fract(u)-.5;
  float h1=h11(id+seed*7.13), h2=h11(id*1.71+seed*3.1), h3=h11(id*2.31+seed*11.7), h4=h11(id*3.17+seed*5.3);
  float binPx=TAU*r/N;
  float dpx=abs(f-(h1-.5)*.55)*binPx;
  float w=max(wpx*(.45+1.3*h2), uPx*.6);
  float prof=exp(-dpx*dpx/(w*w));
  prof*=smoothstep(.8*uPx, 3.*uPx, binPx);                       // rays thin out near the source instead of merging into a white disc
  float len=mix(len0,len1,h3*h3);
  float I=(.25+.75*h4)*smoothstep(len,len*.25,r);
  I*=.6+.4*sin(lph(floor(10.+24.*h1))+h2*20.);                  // loop-safe twinkle
  return vec2(prof*I, fract(h4*7.31+h1*3.71));
}
// soft wedge beams (god-ray shafts with angular width): K bins, duty = lit fraction
vec2 beams(float a, float K, float seed, float duty, float soft){
  float u=a/TAU*K+seed; float id=floor(u); float f=fract(u);
  float h=h11(id*3.31+seed), h2=h11(id*7.17+seed*1.3);
  float w=duty*(.55+.9*h);
  float d=abs(f-.5-(h2-.5)*.3)*2.;
  return vec2(smoothstep(w+soft,w-soft,d)*(.35+.65*h2), h11(id*5.7+seed*2.1));
}
// along-ray dashes moving in (dir=+1) or out (dir=-1); n = whole cycles per 60 s
float dashes(float r, float k, float n, float dir, float ph, float duty){
  float s=.5+.5*sin(r*k+dir*lph(n)+ph);
  return smoothstep(1.-duty-.15,1.-duty+.15,s);
}
// Hockney pool-light net: iso-lines of a domain-warped sine field, constant pixel width.
float poolLine(vec2 q, float sc, float ph, float wpx, float seed){
  vec2 p=q/sc+seed;
  p+=.42*vec2(sin(p.y*1.7+ph+seed), sin(p.x*1.9-.8*ph));
  p+=.22*vec2(sin(p.y*3.1-1.3*ph), sin(p.x*2.7+ph+seed*.5));
  float f=sin(2.*p.x)+sin(2.6*p.y+sin(1.4*p.x+seed));
  float g=length(vec2(dFdx(f),dFdy(f)))/uPx+1e-4;              // per canvas px
  float d=abs(f)/g;
  float wv=wpx*(.55+.9*vn(q/180.+seed*3.));                      // line weight varies along the net
  return smoothstep(wv,wv*.25,d);
}
// neon scribble knot (dukkha): contour lines of re-seeded noise fields; returns rgb
vec3 knotLines(vec2 q, vec2 c, float F, float wpx, float calm){
  vec2 p=q-c; float s1=h11(F)*40., s2=h11(F+3.7)*40.;
  float n1=sin(p.x*.052+2.6*sin(p.y*.031+s1))+sin(p.y*.047+2.6*sin(p.x*.037-s1*1.3));
  float n2=sin(p.x*.041-2.2*sin(p.y*.05+s2*.7))+sin(p.y*.063+2.0*sin(p.x*.045+s2));
  float n3=sin(p.x*.07+1.8*sin(p.y*.06-s1))*sin(p.y*.058+1.8*sin(p.x*.033+s2));
  float g1=length(vec2(dFdx(n1),dFdy(n1)))/uPx+1e-4, g2=length(vec2(dFdx(n2),dFdy(n2)))/uPx+1e-4, g3=length(vec2(dFdx(n3),dFdy(n3)))/uPx+1e-4;
  float l1=smoothstep(wpx,0.,abs(n1)/g1), l2=smoothstep(wpx,0.,abs(n2)/g2), l3=smoothstep(wpx*.8,0.,abs(n3)/g3);
  vec3 mag=HX(255.,30.,150.), lime=HX(190.,255.,40.), cyan=HX(40.,235.,255.);
  return mag*l1+lime*l2*(1.-calm)+cyan*l3*.8;
}

// grabbygrab body mask (matches CH.pose contour): returns vec2(signed distance px, inside 0..1)
vec2 bodyMask(vec2 q, vec4 B){
  vec2 bp=q-B.xy; float ba=atan(bp.y/B.w,bp.x/B.z);
  vec2 rr=B.zw*(1.+.025*cos(2.*ba+.4)); rr.y*=bp.y>0.?.985:1.;
  float bd=sdEll(bp,rr); return vec2(bd, smoothstep(2.5,-2.5,bd));
}
// the dukkha knot over col. K=(x,y,R). calm 0 = full buzz, 1 = settled.
vec3 knotShade(vec3 col, vec2 q, vec3 K, float F, float calm, float inB){
  vec2 kd=q-K.xy; float kr=length(kd), ang=atan(kd.y,kd.x);
  float wob=1.-calm*.75;
  float Rw=K.z*(1.+wob*(.075*sin(5.*ang+F*1.3)+.05*sin(9.*ang-F*2.1)+.03*sin(14.*ang+F*.7)));
  float kdd=kr-Rw, inK=smoothstep(2.,-2.,kdd);
  vec3 kin=HX(30.,4.,40.)+knotLines(q,K.xy,F,2.4,calm)*.85+knotLines(q+vec2(6.,-4.),K.xy,F,2.,calm)*vec3(.35,0.,.5)*(1.-calm);
  kin*=.55+.45*smoothstep(K.z*.95,K.z*.3,kr);
  col=mix(col,kin,inK);
  col+=HX(255.,40.,160.)*.85*exp(-abs(kdd-6.)/4.)+HX(61.,245.,255.)*.75*exp(-abs(kdd+3.)/3.)*(1.-inB);
  col+=HX(198.,255.,61.)*.7*exp(-abs(kdd-13.)/3.)*step(.55,h11(floor(ang*6.)+F))*(1.-calm);
  col+=HX(255.,62.,165.)*.18*exp(-max(kdd,0.)/60.)*(1.-inB);
  return col;
}
// crisp-edged sunburst wedge (duty = lit fraction of each bin, soft edge in px)
float wedge(float a, float r, float K, float rot, float duty, float softPx){
  float f=fract((a+rot)/TAU*K)-.5;
  float dpx=abs(f)*TAU*r/K, hw=duty*.5*TAU*r/K;
  return smoothstep(hw+softPx, hw-softPx, dpx);
}

// Hockney water lines: stacked wavy lines that wobble, pinch and interlock (Lithographs of Water Made of Lines)
float hockLines(vec2 q, float sp, float ph, float wpx, float seed){
  float y=q.y/sp+.55*sin(q.x/97.+ph+seed)+.33*sin(q.x/41.-ph*1.3+q.y/150.+seed*2.)+.16*sin(q.x/47.+q.y/70.+ph*.7+seed)
         +.9*(vn(q/260.+seed*3.)-.5);
  float f=sin(y*3.14159265);
  float g=length(vec2(dFdx(f),dFdy(f)))/uPx+1e-4;
  float wv=wpx*(.35+1.2*vn(q/120.+seed*5.));
  float brk=smoothstep(.22,.34,vn(q/70.+seed*9.));               // the line breaks now and then, like a brush lifting
  return smoothstep(wv,wv*.3,abs(f)/g)*brk;
}
`;

  // Composite: HDR light + bloom -> hue-keeping soft shoulder (keeps saturated grounds saturated) -> sRGB
  RG.COMP = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D uHdr, uBloom; uniform float uBloomK, uExpo, uGrain, uSeed, uSat, uCA, uBleed;
float h12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec3 sh(vec3 x){ const float k=.72; return mix(x, k+(1.-k)*(1.-exp(-(x-k)/(1.-k))), step(k,x)); }
void main(){
  vec2 dc=(vUv-.5)*uCA;
  vec3 b=vec3(texture(uBloom,vUv+dc).r, texture(uBloom,vUv).g, texture(uBloom,vUv-dc).b);
  vec3 c=(texture(uHdr,vUv).rgb+b*uBloomK)*uExpo;
  float m=max(c.r,max(c.g,c.b));
  vec3 y=sh(max(c,0.));
  y=mix(y,vec3(1.),clamp((m-1.)*uBleed,0.,.85));                // over-bright light bleeds to white-hot
  float l=dot(y,vec3(.2126,.7152,.0722)); y=max(mix(vec3(l),y,uSat),0.);
  y=pow(clamp(y,0.,1.),vec3(1./2.2));
  y+=(h12(gl_FragCoord.xy+uSeed)-.5)*uGrain;
  o=vec4(y,1.);
}`;
  window.RG = RG;
})();
