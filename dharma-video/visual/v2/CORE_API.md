# UNCLENCH v2 core API (FROZEN after fixing round 2)

Owner: the core builder. Act builders code against this file and never edit `core/`. Change requests go in
`visual/v2/CORE_REQUESTS.md` (who, what, why). The look rules live in `visual/LOOK.md`; this file is the how.
Round 2 changes are marked **(r2)**; everything else is unchanged from round 1.
Phase 2 (integration) merged A1-6 (`V2.P.cutSegs` drops zero-length segments), A2-5 (`irisCrisp` `lips`), A3-6 (watermark
pearl in the head-space) and the contrast-gate requests (A2-6 `V2.QA.exclude`, A2-7 / A3-3 tight-pane rings); see CORE_REQUESTS.md.

```
visual/v2/
  index.html  core/{lx,clock,pal,light,pane,fx,type,glyphs,grab,window,hook,seq}.js  act1.js act2.js act3.js
  core_test.html  bench.js  check/{seam.js, imgdiff.py, contrast.js, contrast.py, colour.py, poster.py, phone.py, edges.py,
  flash.py, text_lint.js, sheet.py}   tools/glyphs.js (build-time glyph outlines)
```

## 0. Rules that bite

- **Coordinates.** Everything public is in canvas px, 1080x1350, y down. GL programs run at 540x675 but their
  code also works in canvas px (`P = canvasPx(vUv)`); `uPx` = 2 canvas px per light px.
- **Pure function of t.** No `Math.random`, no `performance.now`, no state between frames. Hash with `V2.U.hash(n)`.
  Oscillate with `V2.osc(t, k)` (k integer cycles per 60 s) or GLSL `lph(n)`. Boil seeds with `V2.boil(t, div)`.
  Caches are fine only if keyed by every parameter that changes their pixels (snap continuous inputs first).
  `node v2/check/seam.js` renders every act key still in three histories (after a far frame, sequentially after
  t - 1/30, after another act's frame) plus the core recipes on `core_test.html` (animated window pane key, frozen
  regrab under-scene) and **(r2)** fails on any channel more than 3 levels off (raster noise is at most 1).
- **(r2) Dev checks (warn once, `?dev=0` turns them off):** a uniform key that no chunk or program declares (a typo
  such as `uPaen`), a 4th calm rect or 3rd calm ellipse, `V2.osc` with a non-integer k, `V2.boil` with a div that does
  not divide 1800. A warning in the render log is a bug in your scene.
- **Uniforms.** The program builder parses every uniform declaration (precision qualifiers, float/int/bool,
  vec/ivec/mat, arrays) and fills zeros (plus the chunk defaults in `V2.L.DEF`) for anything you do not pass, so
  stale program state can never leak between frames. The setter picks the GL call from the program's active
  uniform type, so a value may be a number, a plain array, a typed array (`Float32Array`), `{v1..v4: array}` or
  `{i: n}`; ints and bools are set with `uniform*iv`. A value it cannot map, or a wrong component count, **throws**.
- **One `world()` call site per program.** SwiftShader runs inlined branch bodies eagerly: calling an expensive
  function from two branches roughly doubles the shader cost even if only one branch is taken. Compute the sample
  position first (e.g. `Q = mix(P, lensPos(...), inL)`), then call `world(Q)` once.
- **No per-pixel `pow()` on uniform colours.** Precompute in JS (the core does this for the glass transmissions,
  the iris overlap and deep colours, and the bloom glass filter). No dynamic indexing into a uniform array you can avoid.
- **No full-frame even-odd clips** in per-frame paths (each one is a full-canvas mask). Cut segments analytically
  with `V2.P.cutSegs` (lead lines, glints, the window `cut` option). No `shadowBlur`, no multipass wide strokes:
  halos go through `V2.glow` (one flush).
- **Every full-frame image draw costs about 45 ms** (the GL present, the glow flush, a cached full-frame canvas). A
  frame has a budget of about 4 of them. Clip a present you only need in part (`comp.clip`).
- **Never upload a full-res canvas to GL.** The pane is 540x675 and cached by key (two slots, section 3).
- **Names.** Prefix every global, scene name and GL program key with your act: `a1_`, `a2_`, `a3_`. At most 16
  programs in the film; the core registers 3 (`core_trivial`, `core_hook`, `core_stub_window`), so the acts share 13.
  `V2.L.program` **throws** if a key is reused with a different source, **warns** if called after `V2.init` (it would
  compile inside a frame: register at load time), and `V2.init` warns if the total exceeds 16.
- **Read-only shared data.** `V2.PAL`, `V2.hook.K`, `V2.hook.RAYS`, `V2.KNOT`, `V2.BOUND`, `V2.grab.MOODS`,
  `V2.grab.STATES`, `V2.window.PRESETS`, `V2.window.COLS / NIGHT`, `V2.L.SKY_SQ` and every `V2.line(id)` result are
  frozen at `V2.init`. To tune a mood, copy it: `const M = Object.assign({}, V2.grab.MOODS.happy, { scr: 0.3 })`
  (moods are plain data; every grab call accepts an object). Do not mutate the typed arrays the core returns.
- **Helper files.** Add your `actN_*.js` helpers ONLY inside your marked block in `v2/index.html`
  (`<!-- ===== ACT N HELPERS ... -->`). Nothing else in `index.html` is yours.
- **No em or en dashes (and no U+2212 minus sign) in any string you draw.** `node v2/check/text_lint.js` checks source
  strings and every string actually drawn.

## 1. Clock (`core/clock.js`)

```js
V2.W, V2.H, V2.FPS, V2.NF                 // 1080, 1350, 30, 1800
V2.U                                      // clamp lerp fract smooth smoother range hash outCubic inCubic inOutCubic
                                          // outExpo inOutSine outBack outElastic dist rot TAU
V2.wrap(t)                                // t mod 60 in [0, 60)
V2.frame(t)                               // Math.round(t*30) mod 1800
V2.osc(t, k, ph = 0)                      // sin(2 pi k t / 60 + ph), k integer (80 beat, 20 bar, 10 = 6 s, 720 = 12 Hz)
V2.beat(t), V2.bar(t), V2.s16(t)          // {i, ph}: 0.75 s, 3.0 s, 0.1875 s grids, ph in [0,1)
V2.hit(t, t0, decay = 0.3)                // 0 before t0's frame, 1 on it, exp decay (s). Frame-snapped.
V2.env(t, t0, att = 1, decay = 0.3)       // linear attack over `att` frames, then exp decay
V2.boil(t, div = 2)                       // floor(frame / div); div 0 = frozen (0); div must divide 1800
V2.tapeWarp(t)                            // animation clock: identity < 17.55, eases to a stop at 17.70
V2.line(id)                               // {id, words, word_t, t, end, voice, choir} from TIMING (frozen)
V2.lit(t, id | line | {word_t}, mode, o)  // per-word levels (array) + .halo (multipliers) + .state
   // 'unlit-ignite' (clenched half): 0 until onset-0.06, flicker 0.6, 1.0, 0.35, 1.0, then 1
   // 'prelit-blaze' (open half): o.pre (0.55) until the onset, then 1 with a 4-frame halo bloom 1.3 -> 1.0
   // 'poster' (V01): lit; a pop on onsets (halo 1.9x -> 1.15x and scale 1.07 -> 1.006 over 4 frames, in .halo and
   // .scale; V2.type.neon applies .scale about each word's centre); frames 1796..1799 = 0.6, 1.0, 0.35, 1.0 (final pass)
   // 'lit'. o.lead (s) shifts every onset earlier (Tilopa: lead 0.06). ?preview=1 sets V2.PREVIEW and lights everything.
V2.DEV, V2.warnOnce(id, msg)              // (r2) dev checks
```

## 2. Palettes and colour (`core/pal.js`)

```js
V2.PAL[key]   // keys: hook guy all same saint plate buzz tape look unclench sky arrows hack drop headless metta tilopa rest regrab
              // {t0, t1, name, ground: [hex...], radial?, glass: [...], light: [...], fig: {...},
              //  type: {core, halo, pane, paneA, mode: 'glow'|'shadow'}, + section extras (land, sun, fields, chip ...)}
V2.section(t) -> key       V2.ground(g, key, {c, r, linear})   // fill a context with a section ground
V2.hex(h) -> [r,g,b] 0..255   V2.rgb01(h)   V2.lin(h) -> linear   V2.rgba(h, a)   V2.mixHex(a, b, t)   V2.luma(h)
V2.mixHexSat(a, b, t)         // saturation-keeping mix: crossfades between complements never pass through grey or beige
V2.toHsv(h) -> [H deg, S, V]  V2.fromHsv(H, S, V) -> hex                                     // (r2)
V2.deepHex(h, k = 1)          // (r2) the DEEP version of a glass colour: an analogous hue shift (lemon -> cadmium red,
                              // orange -> crimson, magenta -> violet, cerulean -> ultramarine, lime -> viridian) with
                              // saturation kept high and warm hues kept bright. Darken glass with this, never with black.
V2.linArr(cols) -> {v3}       // vec3 uniform arrays
V2.INK '#1B1240'  V2.LEAD '#0E0830'  V2.KNOT {crust, tangle, edgeA, edgeB, spark[]}  V2.SPEC6  V2.HOCKNEY6
V2.BOUND                      // (r2) boundary contracts, frozen (section 10)
```

## 3. The light stack (`core/light.js`)

Per frame: **pane** (2D, 540x675) -> **one scene GL program** -> bloom -> composite -> **present** into the
1080x1350 canvas -> your crisp 2D -> glow flush -> post queue (faces, jewel facets, knot flash) -> watermark (the last
three are automatic in `V2.draw`).

```js
V2.L.pane(bg, key?) -> g | null
   // bg: section key ('sky'), css colour, or fn(g). g draws in 1080x1350 units. TWO cached slots (LRU): with a key that
   // is cached, the pane and its GL texture are reused, null is returned, V2.L.g = null and V2.L.hit = true. Put
   // EVERYTHING that draws into the pane inside fn, and put every parameter that changes it into the key
   // (snap continuous values).
V2.L.program(key, chunks, main)    // register once at load time (compiled in V2.init, before READY)
V2.L.render(key, uniforms, comp)   // pass -> bloom -> composite -> present. Returns the HDR target.
   // comp: {bloomK .38, thresh .75, levels 5, expo 1, pulse true (2.10 beat pulse), sat 1.08, vig .30,
   //        vigCol hex (default: the section's deep ground), grain .02, bleed .25, bloomSat 1.15,
   //        glassBloom true, lean hex, leanK 0, present true, op, alpha, ctx, t,
   //        clip (r2: Path2D in screen px, present only inside it), grainF (r2: the frame the grain is seeded with,
   //        default frame(t): pass the real frame while t is frozen, so the grain keeps running)}
V2.L.calm(zones, o) -> uniforms    // [{rect:[x0,y0,x1,y1], pad 40}, {ell:[cx,cy,rx,ry]}] (max 3 rects, 2 ellipses),
                                   // o {floor .15, feather 40, ellFloor .35}
V2.L.SKY_SQ                        // (r2) the squiggle sky preset {uSq: [320, 5, 2, 1.27], uSqI: [1, .6, .9, 0]} (frozen)
V2.L.irisN(twist) -> {v2}          // blade normals (JS mirror)
V2.L.irisOv(cols9) -> {v3}         // IRIS overlap colours (blade k over k+1: the two filters in series)
V2.L.irisDeepHex(cols9), V2.L.irisDeep(cols9) -> {v3}   // (r2) deep blade colours (V2.deepHex each)
V2.L.grab() -> [canvas, g]         // the composited light image (540x675) after a render with present:false
V2.L.keys(), V2.L.count(), V2.L.MAX (16), V2.L.DEF (chunk defaults)
V2.pulse(t)                        // the 2.10 exposure pulse multiplier (applied by render unless comp.pulse === false)
```

**Bloom note.** The bloom sums up to 5 levels, so `bloomK` 0.38 is strong: it washes saturated grounds toward grey. The
hook uses bloomK 0.28 at thresh 0.80 with 4 levels (3 when tight). Prefer 0.18 to 0.30 unless the frame is meant to glow.

### The pre-pass recipe (anything the GL pass needs that you also draw in 2D)

Calm zones, caption panes and the cloud's second lens are known before drawing. Measure first, render, then draw:

```js
const cap = V2.type.measure(ctx, t, { id: 'C3', rows: [{ n: 4, size: 150, y: 420 }], kind: 'sung' });   // no drawing
const cl = V2.grab.cloudLens(cx, cy, sc);                                // pure: {uBody2, uLens2}
const G = V2.grab.geo(t, 300, 1000, 160, {...});
V2.L.render('a2_sky', Object.assign({ uLens: 0.5 }, V2.L.SKY_SQ, cl, V2.grab.uniforms(G, 'happy'),
  V2.L.calm([{ rect: cap.box }, { ell: [G.cx, G.cy, G.bw * 1.3, G.bh * 1.3] }])), { bloomK: 0.3 });
V2.grab.cloud(ctx, t, cx, cy, sc);                                       // the 2D cloud (returns the same lens uniforms)
V2.grab.draw(ctx, G, 'happy', { eyes: 'happy', mouth: 'smile' }, { glass: 'gl' });   // GL already drew his glass
V2.type.light(ctx, t, { id: 'C3', rows: [{ n: 4, size: 150, y: 420 }], kind: 'sung', pane: true });
```

### Writing a scene program (this is core_test page 14, which runs as written)

```js
V2.L.program('a2_sky', ['PANE', 'LENS', 'BODY', 'SQUIGGLE', 'CALM'], `
vec3 world(vec2 P, float cm){ return pane(P)+squiggles(P)*cm; }
void main(){ vec2 P=canvasPx(vUv); float cm=calm(P);
  float in1=step(lensQ(P,uBody),1.)*step(0.,uLens), in2=(1.-in1)*step(lensQ(P,uBody2),1.)*step(1e-4,uLens2);
  vec2 Q=in1>0.?lensPos(P,uBody,uLens,1.):(in2>0.?lensPos(P,uBody2,uLens2,1.):P);   // ONE world() call site
  vec3 c=world(Q,cm);
  if(in1>0.) c=bodyGlass(P,c);                         // his glass (BODY chunk, uniforms from V2.grab.uniforms)
  o=vec4(c,1.); }`);
```

### Chunks (pass names to `V2.L.program`; dependencies resolve automatically)

| Chunk | Provides | Uniforms |
|---|---|---|
| COMMON (always) | `canvasPx toUV h11 h12 h22 vn HX lum hue spec sdEll sdCap sdRBox lph cover screen`, `TAU PI CV` | `uT uF uPx` |
| PANE | `pane(P)` (linear) `dec()` | `uPane` (bound by render) |
| LENS | `lensQ(P,B)` (<1 inside) `lensPos(P,B,L,ch)` `lensPane(P)` | `uBody uLens uBody2 uLens2 uDispC uDisp` |
| BODY | `bodyGlass(P,c)`: filter -> the glass's own colour with a luminance floor -> screen -> lobes as coloured filters -> saturation lift -> **(r2) show-through**: the refracted world's structure shows inside him (over a bright world his glass brightens, over a dark one it turns to its DEEP hue at the same luminance: never a darker amber, which is brown) -> caustic, fresnel rim, ray fibres | `uBodyFill uBodyE uBodyK uBodyLobe[3] uBodyF uBodyV uBodyD` (all from `V2.grab.uniforms`) |
| HAND_SDF | `sdHand(P)` (palm + thumb + 4 fingers union) | `uPalm uPalmR uFingA[6] uFingR[6]` (from `V2.grab.uniforms`) |
| RAYS | `hair(r,a,N,seed,len0,len1,wpx)` (core width 0.75x to 1.45x wpx) `hairPar(P,dir,spacing,seed,wpx)` `beams()` `wedge()` `tintBy(ray, glass)` | `uTint` (.6) |
| DASHES | `dashes(r,k,n,dir,ph,duty)` (r2: n is rounded inside: any speed is loop-safe) `inflow(P,C,R,spd,twist,reach,boil,dens)` (r2: one family of read-carrying dashes, crisper) `outflow(P,C,R,spd,reach,seed,dens)` | none |
| SQUIGGLE | `squiggles(P)` (two families, drawn-on reveal, r2: every time term a whole multiple of one loop-safe phase; `uSq.z` rounded; width 0.5x to 1.5x) `sqFam()` `sqF()` | `uSq [scale, width, cycles/60s, ratio] uSqI uSqRev [revA, revB, ox, oy] uSqA0 uSqA1 uSqB0 uSqB1`. Defaults = **the sky preset** `V2.L.SKY_SQ` (about 6 to 8 lines across the frame; LOOK 2.4) |
| IRIS | `iris(P, out col, out topCol)` -> coverage; then **(r2) `irisAlpha`** (a global set by the call) is the glass opacity to blend with: `glass = mix(ground, col, irisAlpha); c = mix(apertureGround, glass, cov)`. (r2) Lit from the aperture: full value at the aperture and along each leading edge, falling to the blade's deep (analogous) hue toward the frame edges and the blade's back, denser glass there; a strip of the series overlap colour behind every leading edge; optional GL lead came on the edge (seen bent through his lens); tight darkening (x0.45 + violet near the aperture) | `uIris [cx,cy,R,twist] uIrisB [L, alpha, lift, darken] uIrisC [edge, apGlow, body, edgeW] uIrisC2 [overlap, band px, soft px, GL lead px] uIrisD [falloff px, deep 0..1, edge band px, aperture glow reach px] uIrisCol[9] uIrisOv[9] uIrisDeep[9] uIrisOvD[9] uIrisN[9]`. **Build them with `V2.hook.irisUniforms`** (section 8). |
| WINDOW | `archD(P)` `moonGlow(P)` `windowLight(P,c)` (r2: soft-edged floor cast, discrete air shafts) | `uWin uWinK uWinP uWinS uMoon uMoonK` (from `V2.window.draw`) |
| BURST | `burst(P,c)`: capped whiteout (r2: 0.85 at the centre to 0.40 at the mid-edges and corners), rays (r2: implode mode computes one channel: a third of the cost), shockwave, prism ring (r2: ROUND, a 12 px spectral band magenta inside to cyan outside around a 4 px white-hot core, its brightness turning with the iris spiral), streak, leaks | `uBurst uBurstK uBurstK2 uBurstK3 uBurstS uBurstTint` (from `V2.fx.burst`) |
| CALM | `calm(P)` multiplier | `uCalmR[3] uCalmE[2] uCalmK` (from `V2.L.calm`) |
| KAL | `kal(P)` -> vec4. (r2) Two rings of 12 DIAMOND facets (pointed at both ends), the outer ring offset half a facet and counter-rotating and overlapping the inner one radially: overlaps are the two filters in series (new saturated colours), ultramarine shows between the diamonds, AA edges, thin white glints on the facet edges. Apply `c = mix(c, k.rgb, k.a)` | `uKal [cx,cy,rot,scale] uKalK [alpha .88, r1 300, r2 620, gap .08] uKalCol[6]` |
| ROSE | `rose(P)` -> vec4. (r2) A single circle in its own colour (a little richer than its pastel hex); where circles overlap the glass acts as filters in SERIES (more saturated, never whiter); the stack's alpha is capped at .9; 2 px white edges at 50%. Apply `c = mix(c, r.rgb, r.a)` | `uRose [cx,cy,d,r] uRoseRot uRoseCol[7] uRoseOpen[7] uRoseK (.55)` |
| ENSO | `enso(P)` -> vec4. (r2) Gold dry brush (#FFC23D body, #FF9A1F dry strands at the tail, white-hot loaded head over the first ~10%), gap open, a #7A1240 shadow-halo (about 30%) composited in under the stroke. Apply `c = mix(c, e.rgb, e.a)` on any ground | `uEnso [cx,cy,R,draw] uEnsoW [w0 86, w1 40, start, span]` |

Light that crosses glass takes its hue: `c += tintBy(rays, paneColour)`. Read-carrying rays: `wpx >= 5`.
Calm zones: rays/squiggles/dashes x 0.15 in caption boxes (+40 px), x ~0.35 in the character's ellipse.
Do not set KAL's alpha under ~0.85 over ultramarine: lemon at 55% over #2233D6 is grey-olive (rule 2.5.1); the
diamonds let the ultramarine through between them instead.

## 4. Pane and crisp edges (`core/pane.js`)

```js
V2.P.disc(g,x,y,r,col,a,op='lighter',hard)  V2.P.film(...)  V2.P.poly(g,pts,col,a,op,fade)
V2.P.beam(g,x0,y0,x1,y1,w0,w1,col,a0,a1,op)  V2.P.vgrad(g,stops)  V2.P.rgrad(g,x,y,r,stops,op)
V2.P.glass(g, pts|Path2D, col, a, {op 'screen', rim 18, rimA, rimCol})   V2.P.shard(cx,cy,ang,len,wid,skew) -> pts
V2.P.path(pts, closed)
V2.P.glints(ctx, segs, {a, w, col, cut: [ellipses]})     // segs: [{p:[[x,y],[x,y]], a, w}]  2 px white, lighter
V2.P.lead(ctx, segs | Path2D, {w 6, col V2.LEAD, a, cut})
V2.P.cutSegs(segs, ellipses)                              // keep the parts outside [cx,cy,rx,ry] ellipses
```

## 5. fx, glow queue, caption pane (`core/fx.js`)

```js
V2.glow(fn, {wide})      // fn(g): draw halo shapes in 1080 units on the 1/4-res glow canvas. Flushed once per frame.
                         // {wide: true}: only into the wide (1/16-res) layer: a soft bloom that never fills counters
V2.flushGlow(ctx, o)     // manual flush (automatic at the end of V2.draw). o: {a1 .85 tight, a2 .75 wide, blur1 2}
V2.post(fn)              // drawn after the glow flush (faces, jewel facets, the knot's flash core). V2.grab.draw queues faces here.
V2.camera(ctx, m | null) // set a 2D camera matrix [a,b,c,d,e,f]; glow and post jobs queued meanwhile use it too
V2.camMat(k, wx, wy, sx, sy)   // world (wx,wy) -> screen (sx,sy) at scale k
V2.shade(ctx, [x0,y0,x1,y1], hex, a, {feather 85, r 60})   // the caption pane: feathered slab, source-over, cached
                                                           // (r2: recorded in V2.QA.panes for the contrast gate)
V2.lightLine(ctx, pts, {core, halo, w 4, taper [.06,.35,.08,.2], gw, ga, alpha, op, boil, seed, progress, overshoot})
V2.fx.brush(pts, w, {taper, press, seed}) -> Path2D      // tapered stroke polygon
V2.fx.burst(t, t0, {kind, x, y, amt, decay, att, K, K2, K3, S, tint}) -> BURST uniforms
   // kinds: ring (0.12, 38.6: 4-frame attack, gone in 0.5 s), drop (36.0), shock (36.75), jewel (22.25), soft (42.75),
   //        inverse (59.30: converging white streaks, no spectral colour in the sky)
   // K3 [ring start radius (the prism ring starts at 0.6 of it), implode, tint mix, ray dispersion]
   // S  (r2) [spiral twist rate px (0 = plain), twist, lobes 9, white-hot ring core]: the round ring's brightness
   //     turns with the iris spiral as it grows (hook: [70, twist, 9, 1.0])
   // While a whiteout is above about 0.3, captions use haloMode 'shadow' (a glow halo on white is a white blob).
V2.fx.sparks(ctx, t, t0, x, y, cols, {n, r 70, w 5, rot})   // 4-6 rays, born in 2 frames, gone in 8
V2.fx.confetti(ctx, t, box, {t0, origin, cols, n, avoid: [rects], alpha})   // dashes of light on 16ths
V2.fx.trail(n, fn(i, alpha))   // long-exposure ghosts: evaluate your pose at t - i/30 inside fn. Keep ghosts cheap
                               // (light silhouettes, as the regrab arm does), never a full V2.grab.draw.
V2.fx.leadFlash(t, times)      // 1 for 2 frames, then a 6-frame decay
V2.fx.flash(t, events, {gap .34, cap})   // flash guard: drops events closer than 1/3 s
```

## 6. Type (`core/type.js`)

Row `y` is the optical centre line (Anton: cap centre); pass `base: true` for a baseline. Every row is fitted to
940 px. Word cores and (r2) tight halos are cached sprites (cheap); halos go to the glow queue (dark grounds) or a
shadow-halo (light grounds). The blaze / pulse halo multiplier (> 1) goes ONLY into the wide glow layer, **(r2) in the
halo hue at full saturation** (bigger and more saturated, never whiter: counters stay dark at 360 px).

```js
V2.type.neon(ctx, t, {id:'V03' | words+word_t, rows:[{n:3, size:160, y:250}], mode 'unlit-ignite'|'poster'|'lit',
                       upper true, core '#FFF8F2', halo (section), lit (override levels), alpha, pane: true|{rect, hex, a},
                       rim (r2: tube rim, default the halo hue at half saturation), rimW (.10 em, blurred inside the glyph),
                       unlit / unlitCore (r2: default the halo hue, tinted), haloW (.11 em), haloFill (.85)})
   // (r2) lit Anton is a neon TUBE: white-hot core with a soft coloured rim just inside the glyph edge; unlit glass is
   //      tinted toward the halo hue (core 30% + 3 px outline 70%), never grey lavender
V2.type.light(ctx, t, {id | words+word_t, rows:[{n, size, y, kind?, track?, align?, x?}], kind 'light'|'roman'|'sung'|'payoff',
                       mode 'prelit-blaze', core, halo, haloMode 'glow'|'shadow' (section), pane, lower, lit})
   // both return the laid-out words; V2.type.box(words, pad) -> [x0,y0,x1,y1] for calm zones and panes
V2.type.measure(ctx, t, spec, kind?) -> {words, box}   // the same layout, NO drawing (pre-pass; kind 'neon' upper-cases)
V2.type.mono(ctx, t, text, x, y, {size 40 (min 36), weight '500'|'600', col, a, align, t0 (types on), cps 40,
                                   cursor, t1 (hard cut), halo, ga})
V2.type.glyphWrite(ctx, 'unclench'|'free', x, y, size, prog 0..1, {core, halo, w, fill 0..1, align})
V2.type.layout(ctx, rows, o)  V2.type.fit(ctx, lines, kind, size, maxW)  V2.type.font(kind, size)
V2.type.shadowHalo(ctx, words, levels, hex, a)   V2.type.rowsFrom(id, counts, specs, upper)   V2.type.haloSprite(W, col, fill, wem)
V2.QA.words, V2.QA.panes     // with ?qa=1: every drawn word box {w, box, core, a, size} and caption pane {rect, fe, a} this frame
V2.QA.exclude                 // (integration) [x0,y0,x1,y1] rects of non-word UI (chips, badges) the contrast ring must ignore; push only if V2.QA
```

**(r2) Display text that is not the TIMING words.** `neon`, `light` and `measure` take `words` + `word_t` instead
of `id` (`rows[].n` counts into `words`); `lit` overrides the levels; `V2.lit` takes `{word_t}` and `o.lead`:

```js
// C4: TIMING has 'un','clench'; the screen shows one word, pre-lit, blazing on the first onset
const L4 = V2.line('C4');
const lv = V2.lit(t, { word_t: [L4.word_t[0]] }, 'prelit-blaze');
V2.type.light(ctx, t, { words: ['unclench.'], word_t: [L4.word_t[0]], rows: [{ n: 1, size: 140, y: 330 }], kind: 'sung', lit: lv });
// Tilopa (not in TIMING): shown 0.06 s before its beat
V2.type.light(ctx, t, { words: ["don't", 'recall.'], word_t: [49.5, 49.5], rows: [{ n: 2, size: 120, y: 255 }],
  lit: V2.lit(t, { word_t: [49.5, 49.5] }, 'prelit-blaze', { lead: 0.06, pre: 0 }) });
```

Captions example (open half, a pane in the section's deep colour, strict sync):

```js
const words = V2.type.light(ctx, t, { id: 'V17', rows: [{ n: 3, size: 90, y: 218 }], kind: 'roman', pane: true });
```

## 7. grabbygrab (`core/grab.js`)

```js
const G = V2.grab.geo(t, x, y, s, {squash, bob 0..1, div, wob, boilT, look:[x,y], mitten (auto s*cam<160), cam,
                                   arm: {ext 0..1, tx, ty, ang, sag, open 0..1 | fingers:[thumb,index,middle,ring,pinky], hscale, side}})
V2.grab.draw(ctx, G, mood, face, {glass: 'gl' (GL drew the glass) | '2d' (cached half-res sprites), beforeHand(ctx),
                                  hand true|false, handMood (r2: a mood for the hand sprite only, e.g. quantised while the
                                  body mood animates), faceNow, alpha, lead, fringe 2.5, ghost, noArm, glowA .55})
V2.grab.drawHand(ctx, G, mood, {alpha, lead, ghost})
V2.grab.face(ctx, G, {eyes, mouth, brows, sweat, blush, look, blink, ink})
   // eyes: squeeze (> <) dots big happy (^ ^) closed line (- -) one side;  mouth: zigzag o smile open (tongue) flat wobble none
V2.grab.uniforms(G, mood, {k, ox, oy, alpha}) -> {uBody, BODY uniforms, HAND_SDF uniforms}   // k/ox/oy: a 2D camera
V2.grab.handGeo(x, y, ang, hs, levels, 'hand'|'mitten')   V2.grab.handPaths(h)   V2.grab.bodyPath(G)
V2.grab.MOODS: clench worried squeeze look open happy joy metta asleep     V2.grab.mixMood(a, b, u)   (saturation-keeping;
                                                                           // r2: div is discrete, never a fraction)
V2.grab.STATES: CLENCHED WORRIED SQUEEZING LOOKING OPENING HAPPY ASLEEP REGRAB -> [mood, default face]
V2.grab.filterHex(hex, density)      // the 2D equivalent of the GL glass filter (hue^density, sRGB)
```

**The glass model (one model in GL and in 2D).** A mood is data:
`{fill, filt, glow, emit, scr, thru, thruLo, thruHi, body, op2d, blend2d, lobes[3], lobeA, sat, core, halo, haloW, off,
lead, fibres, fibreA, div, wob, hand, handHi, handA}`.
- `fill`/`filt`: the world through his body is filtered by `fill`'s hue at density `filt` (Beer-Lambert). `glow`/`emit`:
  the glass's own colour at opacity `emit`, plus a luminance floor (never grey or brown). `scr`: a screen of `glow`
  (clear glass). `lobes`/`lobeA`: three coloured filter films. `sat`: hue-keeping saturation.
- **(r2) `thru` / `thruLo` / `thruHi`:** show-through in GL: the blades, leads and rays behind him bend inside his
  body as a value and hue change (bright world: up to `thruHi`; dark world: his deep hue at `thruLo`). Clench: 1 / .85 / 1.25.
- **(r2) 2D (`glass: '2d'`):** filter (multiply) -> the apparent body colour `body` at `op2d` (source-over; `blend2d:
  'screen'` for clear glass such as happy) with the caustic, fresnel rim and fibres -> lobe films (multiply, never
  screened). Measured on the hook ground (core_test page 19, `colour.py --swatch`): CLENCHED GL (227,97,39) vs 2D
  (219,118,54), S .83 / .75, 5 degrees of hue apart.
- **(r2) HAPPY** is clear glass: fill #FFE7C2 at 25% screen, lobes .20, contour halo lw x 1.8; brighter than the sky by its
  white contour, streak and caustic, so the squiggles show bending inside him.
- **(r2) Hands** are the body's own glass (`hand` = the body colour, `handHi` at most ~10% lighter, the first lobe's hue at
  the rim). The curled thumb is drawn by its light-pen outline and one ink crease (no lighter fill). The closed mitten
  (s under 160) has a real notch between the thumb lobe and the finger block, crease at least 3 px.
- **Cost.** A GL-glass hero (`glass: 'gl'`) costs about 10 ms of 2D. A 2D-glass character costs about 45 to 60 ms
  each in the pipeline even with every sprite cached; keep 2D-glass characters to about 4 per frame.
- The contour boils smoothly and overshoots its start by about 25 degrees. Feet are drawn only below the body.

Opening order (3.1): **(r2)** `fingers = [0, .12, .24, .36, .48].map(d => V2.U.clamp((t - t0 - d) / 0.25))` (thumb
first; 0.25 s per finger, so the hand opens as one wave and never holds a count pose). Wave: `arm.ang` +-0.35 rad on
the beat. Size: s = 300 gives a body about 420 px tall; mitten below s 160.

The knot family (all opaque or light-emitting; draw the knot between body and hand with `beforeHand`):

```js
V2.grab.knot(ctx, t, x, y, R, {jit 1, seed (default 12 Hz from frame(t)), crack 0..1, cracks 0..1, alpha, edge,
                                flash, form 0..1 (regrab crust), halo})       // R = 0.30 s
   // (r2) a jagged crust: low lobes (+-8 to 10% at jit 1) + high-frequency bumps (+-3%, 41 and 53 per turn) + 3 or 4
   // notches, all re-seeded at 12 Hz; a crisp dark-violet halo hugging it; split #FF2E97 / #1FA352 edge 5 px swapping
   // every 2 frames; the lead flash is a crisp white core line on the edge (post queue). The shell sprite is drawn at a
   // reference radius and scaled, so an animated R costs nothing. t drives the seed and the swap: pass a frozen clock
   // to freeze it.
V2.grab.jewel(ctx, t, x, y, R, {alpha, rot, n 7, hot, halo '#FFC23D', fan 0..1, fanAng, fanSpread, fanLen, sparkle 1})
   // (r2) a LIGHT SOURCE: core with no rim (white to 0.35 R, #FFF6E6 to 0.7 R, gold to 1.0 R, out by 1.8 R through the
   // glow), facets as 7 tapered light lines from an off-centre point (white core, gold halo; no polygon), dispersion only
   // in the spectral fan, a 6-ray tapered sparkle turning with V2.osc(t, 40). Add a BURST 'jewel' in GL for the hit.
V2.grab.cloudLens(x, y, sc, {alpha, melt, lens .15}) -> {uBody2, uLens2}      // pure, for the pre-pass
V2.grab.cloud(ctx, t, x, y, sc, {alpha, melt, lens, boost}) -> {uBody2, uLens2}   // boost 0..1: a second film pass (denser glass on a bright sky; final pass)
   // (r2) one silhouette: 5 asymmetric lobes on a gently convex base, tilted; an even film plus soft lobe films
   // (brighter where lobes overlap), a #CBB8FF underside, a glint rim on the OUTER outline only; translucent enough for
   // the second lens to show the squiggles inside it
V2.grab.orb(ctx, t, x, y, r, {alpha, lit, crust, spark})   // gold glass sphere, halo <= 1.4 r; (r2) glints are tapered rays
V2.grab.wisp(ctx, t, x, y, r, {alpha})
```

## 8. The hook rig (`core/hook.js`): the poster, the seam, and the shared iris

```js
V2.hook.frame(t, o)   // draws the whole hook frame. Frame 0 = V2.hook.frame(0, {}).
  // o: {caption 'lit'|'off', captionPane, tight 0..1 (15-17.55), dashSpeed (90; 180 from 16.5), dash, notch,
  //     punch (zoom about the centre, 2.25: 1.08 -> 1.0), twist, lift, cam {k, sx, sy}, mood, face, pose, knotR,
  //     jit, lean/leanK/sat (tape-stop), burst (override), flashes [times], comp (composite overrides),
  //     extras(ctx, {G, knotC, knotR, M}) (drawn in rig world space after the character),
  //     (r2) animT: the animation clock. Everything (iris sway and twist pulses, dashes, rays' dashes, knot seed and
  //          edge swap, tremble, boil, squash, the prism ring) runs on animT; the grain keeps running on t. Freeze at 5.25
  //          with V2.hook.frame(t, {animT: 5.25, ...}); the tape-stop with {animT: V2.tapeWarp(t)}.
  //     (r2) jitT: the knot jitter / tremble / boil clock only (default animT). knotSeed: a fixed knot shell seed.
  //     (r2) iris {..}: overrides for irisUniforms; crisp {..}: overrides for irisCrisp; pane fn + paneKey: another pane.
  //     (r2) underScene {key, draw(T, ctx)}: the regrab's frozen scene underneath (below)}
  // returns {G, M (camera), knot [x,y,R screen], iris [x,y,R,twist], body}
V2.hook.regrab(t, {wisp [x,y] screen at 59.25, rest [x, y, s]}) -> o for V2.hook.frame (59.25..60)
V2.hook.K           // frame-0 constants (char, knot, hand, caption rows 166 / 326 / 486, pane rect [40,84,1040,636],
                    // tight {k 1.30, sx 252, sy 940, knot 1.08}) (frozen)
V2.hook.edges(C, R, twist, L)   V2.hook.aperture(C, R, twist, rev)   V2.hook.topBlade(C, R, twist, L, x, y)
V2.hook.blades()   V2.hook.pane(g)   V2.hook.RAYS (frozen)   V2.hook.irisCols(cols) -> {col, ov, deep, ovd, deepHex}
```

**(r2) The iris, shared.** Act 2 builds the 21.0 opening and the 32.9 reward-hack iris from the same two calls the rig
uses, so all three irises stay one design:

```js
V2.hook.irisUniforms(C, R, twist, {cols (9 hexes, default the hook blades), alpha (.72 at flood 1), flood, lift,
   darken 0..1 (tight), k (camera scale), L (.35 R), ov .6, band 200 px, deep 1, falloff 360 px, edgeBand 220 px,
   glowReach 200 px, glLead 3 px, C [edge .30, apGlow .9, body .62, edgeW 120]}) -> IRIS uniforms (include 'IRIS')
V2.hook.irisCrisp(ctx, C, R, twist, {k, flood, flash, leadW 5 (10 tight), leadA, cut [[cx,cy,rx,ry]] (his body),
   stop [[x0,y0,x1,y1]] (caption panes: light lines end there), flashCut [ellipses], cols, t, dashSpeed 90,
   lines true, lips (= lines; integration: lips without the long rays), dashes true, glints true, rays (screen angles, default V2.hook.RAYS), L}) -> {edges, lines, lips}
   // lead came on every leading edge; a short lit lip on the light side of each edge at the aperture; 5 to 7 long rays
   // of light (5 px core, a halo in the colour of the blade they cross, 450 to 720 px) leaving the aperture across the
   // blades with dashes travelling inward on them (dashSpeed / 3 cycles per 60 s); thin glints; the lead flash
// a scene program that wants the iris: ['PANE', 'IRIS', ...] and in main:
//   vec3 ic, top; float cov = iris(P, ic, top); vec3 glass = mix(pane(P), ic, irisAlpha); c = mix(ground, glass, cov);
```

- **Frame 0 (r2):** the blades are glass lit from the aperture: full value at the aperture and along each leading edge,
  deep analogous hues toward the frame edges (vignette #1B1466 at .45), violet and ultramarine behind the caption; a
  warm light pool behind the aperture shows through every blade near it; overlap strips 200 px; long rays of light
  with dashes travelling in; the knot a jagged crust with a crisp dark-violet halo; him in amber glass with the blades
  and leads bending inside him; V01 as neon tubes. Poster metrics (`check/poster.py`, 270 px): V>.85 0.51, V<.5 0.13,
  colourful 0.87; type contrast 8.7:1 (row 3).
- 0.12: a round prism ring leaves the knot's halo (spectral band round a white core), turning with the iris spiral,
  peak +3 frames, gone by 0.62. 0.40 / 1.60: lead flashes (edges become white rays; the flash glow is kept off the
  caption, the aperture ring, his body and the fist; the knot's edge gets a crisp white core line).
- **tight (15 to 17.55, r2):** the camera moves in to k 1.30 with him on the left (body about 50% of the frame height,
  cropped by the frame edge) and the knot 1.4x larger near frame centre; the blades darken near the aperture to about
  0.45 with a violet lean so the dashes and the knot's neon pop; lead 5 -> 10 px; bloom 3 levels. Mood and knot jitter
  use tight quantised to 1/8.

**(r2) The regrab, recommended path: a frozen scene underneath.** Act 3 hands the rig a function that draws its rest
scene; the rig renders it ONCE at `V2.hook.UNDER_T` (59.25) into an offscreen full-res canvas (its own GL pass,
crisp layers, halos and faces included), caches it by key, and shows it through the closing aperture on every regrab
frame (behind a closing iris nothing in the rest scene needs to move for 0.65 s). His body is never composited over
the scene underneath (no seam through him). The pearl -> amber crossfade goes through peach.

```js
V2.add(59.25, 60, 'a3_regrab', (t, ctx) => {
  const R = V2.hook.regrab(t, { wisp: [wx, wy], rest: [330, 1090, 150] });
  R.underScene = { key: 'a3_rest', draw: (T, c) => drawRest(T, c, { noCharacter: true, noWisp: true }) };
  V2.hook.frame(t, R);
});
```

`draw(T, c)` must draw on `c` (the core points `V2.ctx` at it while it runs, so `V2.L.render` presents there) and must
not draw grabbygrab or his wisp (the rig does). The legacy path still works (draw the rest scene yourself while
`R.needsUnder`, with `comp: R.underComp` which now includes a `clip` of the aperture, `R.underLite`, `R.underClip`).

**Cost (r2)** (pipeline-faithful bench incl. JPEG capture, single worker, 4 cores, load 0.3 -> 2.5 from the bench itself;
`out/v2/core/bench_index.json`): frame 0 479 ms median, 1.0 503, 2.5 459, tight 16.6 493; regrab with the frozen
under-scene 59.25..59.7: 477 to 660 median, worst single frame 705 (cap 900). The frozen under-scene is built in
`V2.init` (a warm-up regrab frame before READY), so no worker pays it inside a frame. The act 3 gate:
`node v2/bench.js --regrab` (adds 59.25 59.267 59.3 59.333 59.367 59.4 59.6 59.7). Act 1 has about 0 to 40 ms per hook
frame for its own captions and props before 480 ms on those frames; the 480 ms target is the mean of the 21 QA stills,
and most of them are lighter than the hook.

## 9. The window (`core/window.js`)

```js
const win = V2.window.draw(t, {mode 'day'|'night', arch [cx, apexY, halfW, bottomY], rose [x,y,R], build 0..1,
                              value, gain, shaft, shafts [k, spacing, duty, seed], floor, floorY,
                              proj [shear, depth, offX, shaftY], moon [x,y,r], moonK [spokes, rot, halo, paneGlow],
                              moonFall 0..1, g (pane ctx), alpha})
V2.window.paneState(o)       // (r2) every field the pane paint reads, snapped (build 1/240, value 1/1000, moonFall 1/64)
V2.window.paneKey(o)         // the pane-cache key: built from paneState, so it can never miss a parameter (moonFall too)
win.uniforms                  // include 'WINDOW' in your program: c = windowLight(P, c)
win.crisp(ctx, {leadW, leadA, frameA, cut: [[cx,cy,rx,ry], ...]})   // leads, glints, arch frame; cut = his body
// day = saint window [540, 300, 400, 1080], rose [540, 760, 300]: (r2) each pane backlit (centre +25%), lead at 70%,
//   discrete air shafts falling down-right in the colours they passed through, the floor cast as a skewed soft
//   projection. night = Moon Room window right, moon behind the rose, pane value falls off with the distance to the
//   moon (moonFall); (r2) re-hued for moonlight (lemon -> apricot, orange -> rose, lime -> mint, warm value floors):
//   never olive, khaki or brown.
```

**The pane recipe** (the panes live in the pane canvas, so they must be drawn inside the pane function and keyed):

```js
const wo = { mode: 'day', build: V2.U.range(t, 12.0, 12.7) };
V2.L.pane(g => { V2.ground(g, 'saint'); V2.window.draw(t, Object.assign({}, wo, { g })); }, 'a1_saint|' + V2.window.paneKey(wo));
const win = V2.window.draw(t, Object.assign({}, wo, { g: null }));   // uniforms + crisp only
V2.L.render('a1_saint', Object.assign(u, win.uniforms), comp);
win.crisp(ctx, { cut: [[G.cx, G.cy, G.bw * 1.04, G.bh * 1.04]] });
```

(`V2.window.draw` without `g` draws into the current pane only if it was freshly cleared this frame, never into a
cached one.)

## 10. Sequencer, boundaries, page, checks

```js
V2.add(t0, t1, name, fn(t, ctx, scene))   // register in your act window only (warns otherwise, and on overlap with
                                          // another act's scene); the most recent registration covering t wins
V2.draw(t)                                // renderFrame. V2.T = t during the frame.
V2.init()                                 // (index.html) GL + programs compiled, shared data frozen, frame 0 warmed
V2.watermark(ctx, t)  V2.watermarkStyle(t)  V2.watermarkOverride = t => ({col, a}) | null
V2.stubLabel(ctx, t, a, b)                // placeholder label (stubs only)
V2.BOUND                                  // (r2) frozen boundary contracts:
   // t18: {t: 18.0, cut: true, knot: {look: 'V2.grab.knot', crust, edge}}  (hard cut; act 1 ends frozen in the tape-stop)
   // t36: {t: 35.967, char: [540, 860, 300], mood: 'happy', face: {eyes: 'happy', mouth: 'smile'},
   //       arm: {ext: 0, open: 1, ang: -0.55}, orb: {r: 28, inPalm: true}, pal: 'arrows', blades: 0}
   // t60: {t: 59.967, rig: 'V2.hook.frame'}
```

```bash
cd visual
node render.js --page v2/index.html --stills 0,6.2,9.5 --outdir ../out/v2/stills     # ?label=1 / ?preview=1 via --page "v2/index.html?label=1"
node v2/bench.js --times 0,12.5,22.2 [--regrab] [--page v2/core_test.html] [--out file.json]   # pass/fail vs 5.4; stub times labelled
node v2/check/seam.js [--quick] [--times a,b] [--out dir]   # seam + 3-history determinism (max 3 levels) + core recipes
node v2/check/contrast.js [--times ...]                      # >= 4.5:1 lit (3.0:1 pre-lit), ground sampled on the word's pane
python3 -I v2/check/colour.py ../out/v2/stills     # colourful share + black / neutral grey <= 2%
python3 -I v2/check/colour.py --swatch <core_test page 19 png>   # (r2) 2D glass vs GL glass agree
python3 -I v2/check/poster.py <png>...             # (r2) value spread: V>.85 <= .55, V<.5 >= .10, colourful >= .85, edges
python3 -I v2/check/edges.py ../out/v2/stills      python3 -I v2/check/phone.py ../out/v2/stills
python3 -I v2/check/flash.py ../out/v2/video_noaudio.mp4   # flashes = opposing transition pairs per 1 s
node v2/check/text_lint.js                python3 -I v2/check/sheet.py <dir> <out.png> [cell_w] [cols]
```

`core_test.html`: renderFrame(t) shows page floor(t): 0 frame 0, 1-6 the 8 states at s 370/300/150/97, 7 hands,
8 knot family, 9 type states, 10 light-writing, 11 bursts, 12-13 window day/night (pane recipe, `cut`), 14 squiggles
(sky preset, the GL pre-pass recipe, BODY happy), 15 rays, 16 kaleidoscope / rosette / enso, 17 regrab at 59.6 (frozen
under-scene recipe), 18 animated window (value and moonFall ramp with the sub-page time), 19 2D glass vs GL glass.
Bench a primitive with `--page v2/core_test.html --times <page>`.

## 11. Profiling flags (development only)

`window.V2.DBG = {noGL, noGrab, noCap, noGlow, glowNoBlur, glowNoDraw, noKnot, noHand, noContour, noDash, noLens,
trivial, nobloom}` switches stages off inside the hook rig and the core so a pipeline-faithful bench can attribute
cost (set it from `page.evaluate`, then time evaluate + screenshot as bench.js does). Never set it in shipped code.
Stage costs do not add up: SwiftShader GL and Canvas2D overlap, and the present synchronises them. Bench whole frames.
