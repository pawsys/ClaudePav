# UNCLENCH v2: techniques for "shapes made of translucency and rays of light" (hands-on, measured)

Research agent: tech. Date: 2026-11-01. Everything below was built and timed in this repo's own pipeline:
headless Chromium, WebGL2 on SwiftShader (software GL, 4 cores), Canvas2D at 1080x1350, captured by `render.js`.

- Test page: `visual/lookdev/tech/index.html` (+ `lib.js`, `tech.js`, `micro.js`, `bench.js`, `bench_numbers.js`)
- Stills (full-res GL): `out/lookdev/tech/still_000.00.png` ... `still_012.00.png`, contact sheet `out/lookdev/tech/contact.png`
- Stills with the GL light layer at half res: `out/lookdev/tech/half/still_{000,003,010,011,012}.00.png`
- 3 s real-time motion clips (half-res GL): `out/lookdev/tech/motion/slot{0,3,7,11}.mp4`
- Raw numbers: `out/lookdev/tech/bench.json` (two runs, micro ops, 4-worker contention tests)

Re-render: `cd visual && node render.js --stills 0,1,2,3,4,5,6,7,8,9,10,11,12 --outdir ../out/lookdev/tech --page lookdev/tech/index.html`
(each slot k shows technique k. Add `?scale=0.5` to the page for a half-res GL light layer, or `?slot=k` with `--start/--end` for a real-time clip.)
Re-bench: `cd visual && node lookdev/tech/bench.js [--only 0,3] [--par 4 --park 11 --pars 0.5]`

---

## TL;DR

1. **Everything here is affordable.** All 13 techniques render at 195 to 465 ms per frame at full res, including about 97 ms of fixed screenshot capture. A full hero frame that stacks three light layers, bloom, and crisp type (slot 11) costs **340 ms at half-res GL**. The 600 ms budget leaves room for about two heavy light layers plus a 2D layer in every frame.
2. **Build the light in one GL "light stack" at half res (540x675), and draw crisp things in Canvas2D at full res on top.** All analytic light layers (ray fields, caustics, prism bursts, glass) are added into one HDR target. Then one bloom, one ACES tonemap, and one `drawImage` into the 2D canvas. Type, faces and ink lines are drawn after that at 1080x1350. At feed size, half-res light looks almost the same as full res (`out/lookdev/tech/half/`) and costs about half as much.
3. **Draw rays analytically in a shader, not as geometry.** An angular "ray field" (`rayLayer()` in tech.js) gives thousands of hairline rays, each with its own width, length, color and twinkle, at a fixed per-pixel cost: 60 ms with tonemap at half res. Masking it with the character SDF makes **the shape exist only as rays** (slot 0). Instanced GL lines look similar but cost 2 to 4x more because SwiftShader fill rate is low. Keep them only for rays that must be animated one by one (slot 12).
4. **The two most Hockney techniques are the pool caustic net (slot 3) and the glass body (slot 10).** In both, translucency makes the shape. In slot 3 the character is a lens in pool water: the caustic lines bend and turn gold through him. In slot 10 he is a glass bead that refracts and splits a ray field. Each costs about 110 to 130 ms net at half res.
5. **Bursts of color are a shader-only beat hit (slot 7).** It combines dispersive rays, a spectral halo, an anamorphic streak and orange/magenta light leaks: about 55 to 75 ms net at half res (slot 7 minus its 2D base scene), added with `lighter`. Use an envelope of 1 frame attack and exp(-2.5 t) decay, and only on drops and downbeats.
6. **Letterforms built from light (slot 9):** draw the caption into a 1/4-res mask, run a 2 x 16-tap jittered radial blur (60 ms), tint by distance, then draw the crisp type on top. Use it for the sung lines ("un-clench", "you are the sky") and for Tilopa's six words.
7. **Neon and glow in Canvas2D: never use multipass wide strokes.** Five passes of wide `lighter` strokes on one loop cost **378 ms**. Draw the glow shapes into one 1/4-res canvas, blur it once, and add it back (`LX.glow2d`, about 50 to 70 ms per call). Batch every glow in a frame into **one** call.
8. **Biggest traps (measured):** RGBA16F additive blending is 2.3x slower than RGBA32F. One Path2D holding 1000 overlapping subpaths is 4x slower than 1000 separate strokes. Uploading a full-res canvas as a texture costs 101 ms; at 540x675 it costs 14 ms. Radial blur at half res costs 158 ms; at 1/4 res, 60 ms. In-page `performance.now()` timing is meaningless here, because `renderFrame` returns in under 10 ms and the real cost lands in the screenshot.
9. **Parallel workers barely help GL-heavy frames.** SwiftShader already uses every core: 4 workers give 1.13x the throughput of 1. Canvas-heavy frames get 1.5x. Plan wall time from single-worker numbers: **total render ≈ 1800 x single-worker ms x ~0.9**. At 340 ms average that is about 9.5 min, and at 600 ms about 16 min. Both fit the 40 min limit.
10. **Make every time term loop-safe.** Use only frequencies with an integer number of cycles per 60 s (`sin(2π·k·t/60)`). The ray twinkle and rotation in slot 0 already do this. The caustics use a 6 s period.

---

## How it was measured (read this before trusting any number)

- **Pipeline-faithful timing** (the only reliable number): `bench.js` opens a fresh page and times `page.evaluate(renderFrame(t))` plus `page.screenshot({type:'jpeg', quality:95})`, exactly as `render.js` does. It takes the median of 6 warm frames after 2 warm-up frames. **A blank frame costs 97 to 99 ms.** That is the capture floor, and every "total" below includes it. "Net" means total minus 99.
- Why not in-page timers: Chrome defers both Canvas2D raster and GL execution, so `renderFrame` returns in 3 to 13 ms whatever it draws. In-page numbers taken after a forced readback (`getImageData`, `readPixels`) are only rough. `readPixels` on the default framebuffer does **not** wait for work in other FBOs, so synced "stage marks" can be assigned to the wrong stage. bench.json keeps them as `insync.marks` for orientation only.
- Run-to-run noise is about ±15% (two full runs were averaged). The 4-worker contention tests are in `bench.json -> contention, contention_extra`.
- I tried forcing the 2D canvas onto Skia's CPU rasterizer (`getContext('2d', {willReadFrequently:true})`, page flag `?cpu=1`). It was **not faster** overall (slower for neon, see `bench_cpu.json`), so keep the default canvas.
- Colorfulness uses the metric from research_viral.md: HSV S >= 0.25 and V >= 0.15 on a 32x32 downsample, label bar excluded.

## Frame budget math

| Situation | Measured |
|---|---|
| Capture floor (blank frame, evaluate + JPEG screenshot) | 97 to 99 ms |
| 4 workers in parallel, blank frame | about 195 ms per frame per worker (throughput 2.0x) |
| 4 workers, canvas-heavy frame (slot 8, 316 ms single) | about 825 ms per frame per worker (1.5x) |
| 4 workers, GL-heavy hero frame (slot 11 half-res, 340 ms single) | about 1250 ms per frame per worker (1.13x) |
| Real clip: 90 frames of slot 0 / 11 at half res, `--workers 4` | 32 s / 36 s, so 1800 frames ≈ 11 to 12 min |

Rule of thumb: aim for **an average of 450 ms or less, with no frame over about 700 ms** (single worker, as measured by bench.js). At that level a full 60 s render takes about 12 to 15 minutes.

---

## Technique catalog

All costs are pipeline-faithful ms per frame on a single worker, including about 99 ms capture. "Half" means the GL light layer is at 540x675 and Canvas2D stays at full res.

| Slot | Technique | Full | Half | Net (best) | Colorful | Verdict |
|---:|---|---:|---:|---:|---:|---|
| 0 | Rays fill the shape (analytic sunburst x SDF, buzzing blob) | 464 | **256** | 157 | 0.90 | **Core look.** Hero for "made of light" |
| 1 | Translucent light planes, additive (`lighter`/`screen`) | 210 | n/a | 111 | 0.81 | Cheap colorful backgrounds and ray fans |
| 2 | Translucent washes on paper (`multiply`), brush ink | 218 | n/a | 119 | 0.73 | **Hockney iPad / daylight acts** |
| 3 | Pool caustics + translucent lens body (GLSL) | 460 | **225** | 126 | 1.00 | **Hockney pool, signature look** |
| 4 | Neon line drawing + chromatic fringe (Canvas2D, 1 glow pass) | 286 | n/a | 187 | 0.36 | Accents, clenched moments, hook type |
| 5 | Bloom: GL dual-Kawase on a downscaled 2D scene | 283 | n/a | 184 | 0.90 | Fine, but prefer bloom inside the light stack |
| 6 | Bloom: Canvas2D only (blurred 1/4 + 1/16 screens) | 279 | n/a | 180 | 0.92 | No-GL fallback; washes the background |
| 7 | Prism burst + light leaks (beat hit, GLSL half res) | 264 | (half) | 165 | 0.88 | **Beat hits and drops** |
| 8 | Luminous brush line + off-register translucent fills | 316 | n/a | 217 | 0.85 | **Painterly (Dufy/Hockney/Matisse) acts** |
| 9 | Letterforms built from light (1/4-res radial blur) | 195 | (1/4) | 96 | 0.64 | **Sung captions, Tilopa words** |
| 10 | Glass body refracting a ray field (dispersion, GLSL) | 402 | **210** | 111 | 0.93 | **Translucency makes the shape** |
| 11 | Combo: slot 0 + type rays + prism in one HDR stack, crisp type | 673 | **340** | 241 | 0.66 | **Realistic hero-frame budget** |
| 12 | Reference: rays as 1200 instanced HDR lines (RGBA32F) | 456 | 266 | 167 | 0.93 | Use only for per-ray animation |

### 0. Rays fill the shape (analytic): the core look
- **How:** `RAYF_FS` in `visual/lookdev/tech/tech.js` (around line 90) sums 3 layers of `rayLayer()` (around line 19). Each layer has N angular bins (260, 470, 820) with one jittered ray per bin. The ray has a constant **pixel** width (`dpx = |f-off| * 2πr/N`), a Gaussian profile, a random length, palette and twinkle. Below 2 px per bin it fades to the bin's average energy, so the hot core shows no moiré. The ray field is multiplied by the body SDF (`LX.GLSL_GRABBY`, lib.js about line 377): full strength inside, 9% outside, so the whole frame is faintly made of rays. A faint luminous rim is added. The **blob (dukkha)** is two sets of contour lines of a noise field, re-seeded every frame (`uFrame`), so it buzzes in acid green and cyan like a scribble. Then a 5-level bloom and ACES. The face is drawn as dark ink in 2D, and the arm as a glowing 2D line.
- **Look:** a sunburst in the shape of the bean, made of hairline rays in gold, coral, white and rare magenta and cyan. It reads at feed size, and the buzzing neon blob next to the calm rays is the whole dharma point in one frame. At half res the rays soften a little but stay luminous (`half/still_000.00.png`).
- **Tune:** palette per act (`col=` line in `rayLayer`), ray density N, outside level (`mix(.09,1.,body)`), and exposure `expo` in `LX.composite`. The ray origin `uC` can move: put it at the heart for metta, or at the clutching hand during the hook.

```glsl
vec3 rayLayer(float r, float a, float N, float seed, float t, float lenMin, float lenMax){
  float u=a/6.2831853*N+seed; float id=floor(u); float f=fract(u)-.5;
  float h1=h11(id+seed*7.13), h2=h11(id*1.71+seed*3.1), h3=h11(id*2.31+seed*11.7), h4=h11(id*3.17+seed*5.3);
  float binPx=6.2831853*r/N, dpx=abs(f-(h1-.5)*.5)*binPx, w=.45+1.5*h2;
  float prof=mix(w*1.77/max(binPx,1e-3)*.5, exp(-dpx*dpx/(w*w)), smoothstep(1.,3.,binPx));
  float I=(.25+.75*h4)*smoothstep(lenMin+(lenMax-lenMin)*h3*h3,0.,r);
  I*=.55+.45*sin(6.2831853*floor(12.+30.*h1)*t/60.+h2*20.);   // integer cycles / 60 s = loop-safe
  return palette(h4)*prof*I; }
```

### 1. Translucent light planes (additive)
- **How:** Canvas2D only. 28 long triangles fan out from behind the character, each filled with a linear gradient from 26% alpha to 0 and drawn with `lighter`. The body is three radial-gradient copies of the body path (pink, cyan, gold) drawn with `screen`, offset and slowly drifting. Where they overlap they become new pastel colors and white. Off-register 2.5 px white contour, spinning translucent shards for the blob, 4-point sparkles.
- **Look:** clean, colorful stage light. On its own it is closer to a generic vector wallpaper than to art. Best as a background for 2D scenes, or for the "arrows pass through" sky. Cost about 110 ms net, and most of it is the 28 large gradient fills (49 ms).

### 2. Translucent washes on paper (multiply): Hockney iPad and cut paper
- **How:** warm paper `#fbf1df` with flat, slightly wobbly planes drawn with `multiply`. Overlaps make new colors: lemon over pink gives orange, green over pool blue gives teal. The body is a lemon wash plus a pink wash offset onto it, which overlap to orange. Pool light is white and pale-blue tapered brush squiggles (`LX.brushPath`). The drawing is ultramarine tapered brush ink. The sun's rays are orange and lemon brush marks.
- **Look:** the most literally Hockney frame: daylight, flat saturated planes, joyful. **Avoid pairs that mud:** v1 of this frame had lemon over sky blue (olive sun) and green over pink (brown). Pick overlaps on purpose: yellow+pink, yellow+cyan, pink+cyan, green+blue. Cost about 120 ms net.

### 3. Pool caustics + translucent body (GLSL): Hockney's pool lines
- **How:** `CAUSTIC_FS` (tech.js around line 232). Two domain-warped Voronoi edge nets (`F2-F1`, 3x3 cells), each animated with a 6 s period. The bright line width varies (`wob`), a second finer net is laid over, and the second net's band is reused as dark "painted" squiggles. White sparkles appear where the two nets cross. The character is a **lens**: inside the SDF the water coordinates are magnified up to 30%, so lines bend at his edge, and they turn gold over a warm translucent tint. His rim is a bright line. The blob is violet glass with fast jittery cells.
- **Look:** the strongest Hockney reference ("A Bigger Splash", "Portrait of an Artist"), and the character exists only as a change in the light. It animates well (`motion/slot3.mp4`). Half and full res look almost the same (`half/still_003.00.png`). Cost 126 ms net at half res, against 361 ms at full res, so **always use half**.
- **Tune:** cell size (`qr/118.`), warp amplitudes, line palette. To make the character a "pool you look into", put a sky gradient where the net is sparse.

### 4. Neon line drawing + chromatic fringe
- **How:** `neonPaths()` (tech.js around line 289). One `LX.glow2d` call (lib.js around line 399) strokes every path wide in its color into a **1/4-res** canvas, with red and blue copies offset for chromatic fringing. The neon type's glow goes into the same pass. That canvas is blurred once (`filter: blur(4px)`) and drawn back upscaled with `lighter`. Then crisp cores go on at full res: a colored stroke and a white-hot inner line.
- **Look:** a punchy neon-sign look. It is the right accent for the clench (hook, "it buzzes, so he squeezes") and for a neon caption. Colorfulness is low (0.36) on black, so never let neon carry a whole frame. Put it over color. Cost 187 ms net. My first version with five wide `lighter` passes cost about 280 ms net, and a single loop drawn that way costs 378 ms.

### 5 and 6. Bloom post-process: GL vs Canvas-only
- **GL (5):** downscale the finished 2D canvas into 540x675 (`drawImage`), upload it (14 ms), run a dual-Kawase bloom of 5 down and 4 up passes with a soft threshold, add chromatic aberration, and draw it back with `lighter` (`LX.bloom`, lib.js around line 228). The threshold keeps the dark sky from glowing.
- **Canvas (6):** blur(3px) into 270x338, then blur(3px) into 68x85, and `screen` both back. Same cost (about 180 ms net including the scene), but with no threshold the whole background lifts and washes out.
- **Recommendation:** do not post-process the whole canvas. Put bloom **inside the GL light stack**, so only light blooms (about 40 ms at half res). Keep crisp 2D type and ink out of the bloom.

### 7. Prism burst + light leaks (beat hit)
- **How:** `PRISM_FS` (tech.js around line 364) at half res, added with `lighter`. Per-channel angular offsets give rainbow edges on 4 octaves of sharp `pow(sin)` rays. Also: a white-gold core, a spectral halo ring, an anamorphic horizontal streak, two big drifting light leaks (orange top-left, magenta bottom-right) and 3 spectral ghost discs on the axis through the center. A uniform `uE` sets the envelope.
- **Look:** a full "bursts of color, neon at some moments" hit (`motion/slot7.mp4`: attack, then decay over about 0.5 s). Cost about 55 to 75 ms net for the burst itself. **Use it sparingly**: the drop at 36.0 s, "turns out the joy was free", maybe the 18 s tape-stop release. In the combo (slot 11) it runs at `uE=0.18` as a constant glow, which also works.

### 8. Luminous brush line + off-register translucent fills (Dufy / Matisse / Hockney iPad)
- **How:** color washes drawn with `screen` (lemon body, coral inner, cyan blob, orange sun, green field) and deliberately **misregistered** from the drawing by 25 to 40 px. The drawing is tapered, pressure-wobbled brush strokes (`LX.brushPath`) filled warm white, with one 1/4-res glow pass under them. Neon accent dashes in pink, acid green and cyan.
- **Look:** the most "painterly joy" of the 2D options, and very Hockney iPad. Lines and color are separate layers, and each is luminous. Cost about 220 ms net, and the brush strokes cost more than the washes. Batch strokes into one `Path2D` per color (done here).

### 9. Letterforms built from light
- **How:** caption text goes into a 270x338 mask, with channel R for the display word and G for the italic line. `LX.radial` (lib.js around line 253) runs two cascaded 16-tap passes. The first pass's start is **jittered per pixel**, which turns banding into noise that the second pass smooths. Without the jitter the copies of the letters stepped visibly. The result is tinted by distance from the light center (gold to magenta, cyan to violet) and soft-tonemapped. The crisp type is drawn on top with a small glow: Archivo 900 for "UNCLENCH", and for the italic, an 82% fill with luminous hatch lines.
- **Look:** god rays streaming from the words. It turns captions into light while staying readable. Cost 96 ms net. At half-res mask the radial blur costs 158 ms, so stay at 1/4.
- **Readability:** rays must not cross the crisp type. Put the light center between or behind lines, keep `uK` modest, and if the rays are bright, add a dark soft halo behind the type, as slot 11 does with `glow2d` and `op:'source-over'`.

### 10. Glass body refracting a ray field (dispersion)
- **How:** `GLASS_FS` (tech.js around line 489). The background is two `rayLayer`s from an off-screen sun plus soft Hockney color fields (an orange pool of light, a cyan pool, an ultramarine-to-magenta gradient). Inside the SDF, a dome height comes from the distance (`sqrt(1-(1-x)^2)`) and a normal from 2 extra SDF samples. The background is re-sampled with refraction offsets **per channel** (R 0.8x, G 1x, B 1.25x) for prism dispersion at the edges. Then a specular highlight, a Fresnel rim, and light focused onto the floor under him. The blob is frosted green glass with fast jitter.
- **Look:** he is made only of how he bends the light: "translucency that creates the shapes", and very "the sky doesn't mind / arrows pass through". It looks the same at half res (`half/still_010.00.png`). Cost 111 ms net at half res.
- **Tune:** the effect needs **contrast and detail behind the glass** to read: dense rays, the pool caustic net, or the type. A plain gradient behind glass reads as a soap bubble.

### 11. Combo (realistic hero frame)
- **How:** `TECH[0].light()` writes the ray body into the HDR target. Then the caption mask goes through the 1/4-res radial blur and is added in with `LX.pass(..., {blend:'add'})`. Then the prism shader is added at low gain. Then **one** bloom, **one** composite and **one** present, followed by a 2D face, arm, and caption with a dark soft halo.
- **Cost:** 340 ms at half res and 673 ms at full res. **This is the architecture to copy.**

### 12. Reference: instanced HDR lines
- **How:** `LX.lines` (lib.js around line 189). Instanced quads with a Gaussian cross-section and a per-line intensity ramp and end caps, an optional screen-space mask texture, and additive blend into an **RGBA32F** target. RGBA16F blending is 2.3x slower on SwiftShader.
- **Look:** slightly softer and more painterly than slot 0. Cost 167 ms net for 1200 rays at half res. **Use it only when individual rays must move**: grow out on a beat, sweep, get "drawn" stroke by stroke, or fly as arrows through the sky.

---

## Primitive costs (pipeline-faithful, net ms over a blank frame)

| Op | Net ms |
|---|---:|
| 2d: 10 full-frame alpha fillRects | 51 (5 each) |
| 2d: full-frame radial gradient fill | 40 |
| 2d: 28 big gradient triangles, `lighter` | 49 |
| 2d: 3 `screen` radial-gradient body fills | 19 |
| 2d: 200 / 1000 2px `lighter` lines, separate `stroke()` calls | 19 / 93 |
| 2d: 1000 2px `lighter` lines in **one** path | **404** |
| 2d: neon by 5 wide `lighter` strokes (one loop) | **378** |
| 2d: shadowBlur 30 stroke (one loop) | 66 |
| 2d: `LX.glow2d` (1/4-res blur) + core (one loop) | 69 |
| 2d: filter blur(20px) full-res drawImage | 57 |
| 2d: canvas bloom (1/4 + 1/16) | 43 |
| 2d: 60 brush strokes as one Path2D | 42 |
| 2d: 3 lines of 120 px italic text | 14 |
| gl: flat pass + present (full / half) | 7 / 6 |
| gl: 6-octave warped fbm (v1 sky-like) full / half | 88 / 25 |
| gl: analytic ray field + ACES + present, half / full | **60** / 200 |
| gl: same + 5-level bloom (half) | 101 |
| gl: radial blur 2x16 taps, 1/4-res / 1/2-res mask | **60** / 158 |
| gl: 500 long HDR lines full res, RGBA16F / RGBA32F / RGBA8 | 211 / **91** / 99 |
| gl: 2000 long HDR lines half res, RGBA32F | 118 |
| gl: upload canvas as texture, 1080x1350 / 540x675 | **101** / 14 |

Read-outs: GL→2D `drawImage` (present) is cheap (about 7 ms), and GL fill rate is the scarce resource (about 25 to 40 Mfrag/s for additive geometry). Full-screen fragment work at half res costs a quarter of full res. The 2D side is cheap for fills and text but expensive for wide or overlapping strokes.

---

## Recommended v2 render architecture

```js
// per frame (one scene):
const k = 0.5;                                      // light layer resolution
const hdr = LX.target('hdr', 1080*k, 1350*k);       // RGBA16F, written by full-screen passes (no blending needed for the first)
LX.pass(P.rayField, {uT:t, uC:[...]}, hdr);          // 1st light layer overwrites
LX.pass(P.caustics, {...}, hdr, {blend:'add'});      // more analytic layers ADD (each ~25-60 ms at half res)
LX.pass(P.prism, {uE: env(t)}, hdr, {blend:'add'});  // beat hits: env from TIMING / beat grid (0.75 s)
// text light: 1/4-res mask -> LX.radial -> add into hdr
const bl = LX.bloom(hdr, 5);                         // ~40 ms
LX.composite(hdr, bl, {w:540, h:675, bgTop, bgBot, expo, bloomK, ca, grain});   // ACES + grain + CA
LX.present(ctx, 540, 675);                           // ~7 ms, upscales into the 1080x1350 2D canvas
// crisp layer at full res: face ink, brush lines, neon cores, captions (C.caption), watermark
LX.glow2d(ctx, g => { /* every glow shape of this frame, once */ }, {blur: 4});
```

- Keep `lib.js` as the engine piece for v2: copy it to a v2 path and do not edit v1 files. It already provides `target`, `pass`, `lines`, `bloom`, `radial`, `composite`, `present`, `glow2d`, `brushPath`, `smoothPts`, `grabby` (Path2D) and `GLSL_GRABBY` (matching SDF). The production grabbygrab must have **both** a Path2D and a GLSL SDF, so that shaders can use him as a mask, lens or glass.
- **Budget recipe per frame:** capture 99 + light stack 120 to 200 (2 to 3 analytic layers, bloom, composite) + 2D crisp layer 40 to 120 (text, ink, one glow pass) = **about 260 to 420 ms**. That leaves headroom for one heavier layer at a drop.
- **Color:** the techniques measure 0.64 to 1.00 colorful share, except pure neon on black (0.36), against the target of 0.45 median and 0.35 or more in 0 to 6 s. Dark saturated grounds (ultramarine, violet, magenta) count as colorful. Pure black and grey do not.

### Where each technique could sit in the beat sheet (suggestion for the scene agents)
- **0 to 6 s hook (muted):** slot 0, the clenched ray-body with the buzzing neon blob, plus the hook caption in crisp type with a small glow. It is luminous and colorful from frame 0 and the blob reads as "something is wrong" without sound.
- **6 to 18 s "cause of all suffering" / field-guide plate:** slot 2, the paper and ink plate in Hockney-iPad style, or slot 8. On "it buzzes, so he squeezes", the neon blob and small prism ticks on beats. At the 17.55 tape-stop, the light layer can collapse (expo to 0) in a few frames.
- **18 to 36 s "don't let go, just look", sung "un-clench", "you are the sky":** slot 9 for the sung words. Slot 10: as he unclenches he turns to glass and the sky shows through him ("the cloud can stay, arrows pass through": slot-12 rays flying through the glass). Jhana orb = slot 0 ray field with no body mask.
- **36 to 42.75 s drop "turns out the joy was free":** slot 7 burst on the downbeat at 36.0, then the slot 11 stack. For the headless view, the ray field replaces the head.
- **42.75 to 49.5 s metta "love him open":** slot 3, the warm pool, with him as a lens of gold caustic lines, or slot 8 washes.
- **49.5 to 54 s Tilopa's six words:** slot 9, one word of light per beat with no voice.
- **54 to 59.25 s rest / come back, then the regrab:** daylight slot 2 or 8 calm. The regrab returns to the slot 0 clench so the loop seam matches frame 0.

---

## Gotchas found while building this

1. **Sampler feedback loop:** an unset sampler defaults to texture unit 0. If unit 0 holds the texture you are rendering into, WebGL raises INVALID_OPERATION and **silently draws nothing**. That gave fake "1 ms" line timings until I fixed it. `LX.lines` now binds `LX.white`. Bind every sampler explicitly.
2. **Additive geometry: use RGBA32F, not RGBA16F** (91 vs 211 ms for the same 500 lines). Bloom passes with blending off are fine in RGBA16F.
3. **Wide Canvas2D strokes are the hidden cost.** Use `glow2d` (1/4-res blur), not multipass wide strokes, and do not hold 1000s of overlapping subpaths in one path.
4. **Never upload a full-res canvas.** Downscale to 540x675 first (101 vs 14 ms).
5. **Radial blur:** use a 1/4-res mask and jitter the first pass, or the copies of the letters will step.
6. **Loop safety:** use `sin(2π·k·t/60)` with integer k and periodic noise offsets (v1's sky already does `R·cos(2πt/60)`). The caustics use a 6 s period. The canvas demos in slots 1, 2 and 8 still use non-periodic `sin(tau*x)` because they are demos, so fix them when porting.
7. **Captions stay crisp 2D.** Bloom and rays sit under the type, never over it, and a dark soft halo (`glow2d` with `op:'source-over'`) keeps italic captions readable over bright light.
8. The page loads `engine.js` for fonts through `<base href="../../">`. Make the same base or path fix in any page placed below `visual/`.
