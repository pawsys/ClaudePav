# UNCLENCH (you are the sky) — scene builder brief

60 s, 1080x1350 (4:5), 30 fps, perfect loop. A lo-fi dharma music video for meditation-TPOT on X.
The mascot is **grabbygrab** (taṇhā), a cream bean creature with one noodle arm and a mitten hand, who
squeezes a cloud until it becomes the **evil vibrating blob** (dukkha). First half is CLENCHED (yellow Anton
caps, storm, deadpan field-guide jokes). Second half UNCLENCHES (sky, EB Garamond italic, ink-cartoon light).

Authoritative files (read them):
- `../script.json` — FINAL spoken lines + choir parts (overrides the bible's older line list).
- `timing.js` — real word timestamps for every spoken line / choir word (`C.line('V09')`, `C.wordTimes(id, n)`).
- `../bible.json` — the original production bible (sections, visual_motifs, palette). Use for intent/detail,
  but where it conflicts with this BRIEF or script.json, THIS BRIEF WINS (it already folds in two critics).

## Engine API (read the source; it is short)
- `engine.js`: `ENGINE` (W,H, easing: smooth/smoother/easeOutCubic/easeOutExpo/easeOutBack/range/clamp/lerp/hash,
  `sky(params)` WebGL sky/storm shader -> use `C.skyBG(params)`), grain is applied globally (3%).
- `common.js` (`C`): `PAL` palette, `caption(t, spec)` kinetic captions (styles `anton`, `antonWhite`, `serif`
  (EB Garamond italic), `serifRoman`, `mono`), `mono(t, text, x, y, opts)` labels (with `chip`, `typed`, `cursor`),
  `leader()`, `markerLoop()`, `stormBG()`, `flashEnv()`, `camera()`, `hookBase()` (frame-0 composition),
  `puff()` flat ink cloud, `SKY_MORNING`, `BOUND` (hand-off states), `line()`, `wordTimes()`.
- `grabby.js` (`GRABBY.grabby(t, x, y, size, opts)`; eyes: dots/squeeze(> <)/happy(^ ^)/closed/one/big/worried;
  mouth: smile/zigzag/o/flat; sweat, blush, look, pupil, arm:{tx,ty,ext,open,ang,stagger,tremble}, holding(x,y) cb;
  `GRABBY.mitten(ctx,x,y,ang,size,open,{stagger,tremble,t})` for the macro fist).
- `prims.js` (`PRIM`): rain, bolt, motes, stars, godrays, blob(jitter,warm,dissolve,squash), arrow, ripple,
  seated (line-art meditator; head 0..1 dashed), hand, thoughts (flying mono fragments), enso(brush circle).
- `scenes.js`: register with `SCN.add(t0, t1, name, (t, local) => {...})`. Exactly one scene draws per frame and
  must draw its own background. Scenes must not overlap in time within your act.

Render stills to check your work (each frame ~0.2-0.5 s):
`cd /home/user/ClaudePav/dharma-video/visual && node render.js --stills 0,0.5,1.0 --outdir ../out/<your_dir>`
then look at the PNGs with the Read tool (make contact sheets with python PIL to save tokens). Check motion by
rendering consecutive frames (e.g. 4.500, 4.533, 4.567). Page errors print as `[pageerror]`.

## Global rules (from two critics; non-negotiable)
- Deterministic in t only. No Math.random / Date. Use `ENGINE.hash(n)`.
- Safe area: all text inside x 80–1000, y 120–1150. Max 3 lines of main caption at once.
- READABLE on a phone (video shown at ~0.3x): mono text meant to be read >= 38–40 px; punchlines 44 px;
  28–32 px only for pure texture (thought swarm). Every readable aside stays up >= 1.5 s + 0.25 s/word,
  or it gets cut. Fewer, bigger labels beat many small ones.
- Lines that must read: >= 6 px (arrows 7 px, leaders 4 px, brackets 4 px, meditator 6 px). Tremors are 4–6 px or
  nothing. No 1–2 px jitter (it reads as compression noise).
- Clenched captions: `C.caption(..., {style:'anton'})` yellow #FFD23F with ink stroke, word pops 1.08→1.0 over 2
  frames, hard cuts (no crossfades). Unclenched captions: EB Garamond italic (`serif`) navy #1E2B47 on sky,
  warm white #FFF6E0 with soft navy shadow on dark/deep sky; enter = 8-frame rise 12 px + blur 10→0; exit vapor.
- Text should LEAD the voice by 3–10 frames for muted viewers (`C.caption` lead defaults to 0.08 s).
- Style: flat ink cartoon (cream #F6EDE0 fills, ink #23202B outlines ~5 px scaled). Avoid stock looks:
  no sparkle sprites, no ease-out-back bounces on paper, no particle "ascension", no glow except where stated.
- Performance: keep a frame under ~250 ms (avoid dozens of ctx.filter blurs per frame).
- Only edit your own act file. Act 1 owner may also tune `C.hookBase` / `C.STORM` in common.js (frame 0 must
  stay identical to what the loop seam uses — the seam calls `C.hookBase(t)` with default opts).

---------------------------------------------------------------------------------------------------
## ACT 1 — `scenes/act1.js`, 0.0–18.0 s (CLENCHED). Lines: V01 V03 V04 V05 V06 V07a V07b V08 V09 V11, choir C1.
Music: no drums until 6.0 (boom-bap drops at 6.0), stop-time 9.0–10.5, slam back 10.5, tape-stop 17.55–18.0.

- **0–2.25 HOOK (frame 0 = poster, no fade-in).** `C.hookBase(t, {flash: C.flashEnv(t,[0.40,1.60])})` storm +
  grabbygrab squeezing the jittering blob ('> <', sweat). Top third: Anton yellow, fully visible from frame 0:
  `YOU'RE CLENCHING / SOMETHING / RIGHT NOW.` (3 lines, ~150 px, must fit x 80–1000), then a 4th smaller line
  `(NOT YOUR JAW.)` in warm-white Anton (~80 px). Spoken words pop at their timestamps (V01). Camera push 1.00→1.03
  from 1.0 s. Squeeze pulse + sweat drip on "right now" (~1.4 s). Lightning at 0.40 and 1.60 (warm-white).
- **2.25–3.75** hard cut: `NOT YOUR JAW.` Anton punch-in (V03). At 3.0 `(ok, also your jaw)` pops INSTANTLY,
  mono 40 px; it hard-cuts out at 3.75 with the caption.
- **3.75–5.25** `A THOUGHT / ABOUT LATER.` (V04). ~3.9 a white line-art thought bubble pops above him with a tiny
  calendar glyph (no word inside). 4.50: his arm shoots out (5-frame smear), snatches the bubble, squishes it into
  the blob; blob +15% size, darker, more jitter.
- **5.25–6.0** FREEZE-FRAME (all motion stops; grain runs). `THAT ONE.` Anton ~170 px (V05). A tight wobbly yellow
  marker loop scribbles TWICE around the blob (`C.markerLoop`, ~6 frames per loop, 10 px). He slowly side-eyes the
  camera (guilty).
- **6.0–9.0** 6-frame horizontal whip-pan smear. `SOME GUY / FOUND THE CAUSE OF` (V06) Anton word by word.
  Center: a minimal cream line-art meditator WITH a plain oval head (this is "some guy"), >= 6 px stroke, under a
  five-stroke bodhi-tree line drawing, ~280 px tall. 6.6: mono tag `~500 BCE · n=1 · still replicates` (40 px).
  Hold for suspense after "of" (the music leaves a gap).
- **9.0–10.5 STOP-TIME.** Cut to near-black #0E0D12. `OF` small (~90 px) top, `ALL` yellow Anton ~600 px tall
  filling ~90% width with a 6 px tremor (V07a at 9.0), `SUFFERING.` ~90 px below (V07b 9.6). 9.40: one jagged
  warm-white lightning crack behind ALL.
- **10.5–12.0** beat slams back. 2x2 grid of grabbygrabs (~300 px cells), each clutching its own jittering blob
  (jitter in time with the hats). Labels 40 px mono under each, popping one per 8th note from 10.5:
  `money` / `being right` / `jhanas` / `this video doing numbers`. Caption `SAME CAUSE.` (V08) Anton on a charcoal
  band across the middle. Jhanas cell: he squeezes a gold orb (~90 px) that pops to a grey blob at 11.1 (pff).
  Aside `(not how jhana works)` 40 px, 10.95–12.0.
- **12.0–13.5** the `this video doing numbers` cell scales up into the hero (~420 px), still clutching his blob,
  blinking slowly, deadpan, at the camera. `IT'S THIS / LITTLE GUY.` (V09) Anton top.
- **13.5–15.0 PLATE 01.** A cream paper plate (#F3EBDD, ink double border, faint paper texture) slides up
  (ease-out-cubic + 1-frame settle; no bounce) to ~86% of the frame, already fully printed:
  header `FIELD GUIDE TO THE MIND · PLATE 01` (mono 600, ~34–36 px), hatched ink line-art grabbygrab on the left,
  fields (mono 38–40 px, ink): `pali: taṇhā (lit. thirst)` / `diet: whatever's next` /
  `lifespan: one moment. respawns.` On the choir notes (13.500 / 13.875 / 14.250) stamp `GRAB` `BY` `GRAB` in ink
  Anton, each with a 3-frame 4–6 px shake.
- **15.0–18.0** plate rips away diagonally (paper-tear edge) back to the storm. He squeezes harder; blob darkens
  #4A4556→#121117, jitter doubles. Caption (V11) `IT BUZZES. / SO HE SQUEEZES. / SO IT BUZZES.` Anton, words on
  timestamps. Thought fragments (`PRIM.thoughts`, texture 28–32 px) only 15.0–16.5: am i doing this right /
  reply to him / did i lock it / i should be calmer by now / what if they / rent. 16.5: a 4 px leader line from the
  blob to `EVIL VIBRATING BLOB` (mono 600, 44 px) + `(was a perfectly nice cloud)` (38 px). 17.0: frame shake 5 px
  + lightning. **17.55–18.0 TAPE-STOP:** warp the animation clock to a freeze (motion decelerates to zero),
  desaturate ~40%; the label stays readable through the freeze. 18.0 is a hard cut to act 2.

---------------------------------------------------------------------------------------------------
## ACT 2 — `scenes/act2.js`, 18.0–36.0 s (THE UNCLENCH). Lines: V13 V16 V17 V18 V19 V20, choir C2 C3.

- **18.0–21.0 LOOK.** Hard cut to a macro: grabbygrab's own mitten (`GRABBY.mitten`, ~700 px, same 3 fingers +
  thumb, cream/ink) clenched around the blob, noodle arm entering from the frame edge, crease lines, 3–4 px tremble.
  Dimly lit from 18.0 (do NOT show near-black empty frames). 18.25: a warm attention-flashlight cone switches on
  from the top edge (soft additive gradient ~20° wide, a few dust motes) and lands on the fist; outside falls to
  near-black. 18.4: the first serif in the film: `don't let go. / just look.` (V13) EB Garamond italic warm white.
  19.4–21.0: aside, mono 40 px warm white ~75%: `attention is overpowered.` / `evolution can't patch it.`
  Nothing pries the fingers; the tremble just decreases.
- **21.0–24.0 UN-CLENCH** (choir 'un' 21.00, 'clench' 21.75 held to 23.25). On 'clench' the fingers open one at a
  time (120 ms stagger, ease-out) — they open because they are SEEN. The blob's jitter decays to 0, it lifts from
  charcoal → dove grey → white and rises out of the open palm as a small fluffy cloud (`C.puff`).
  THE TYPE UNCLENCHES, center frame: `UNCLENCH` tight jittering yellow Anton at 21.0; 21.75–22.75 each glyph does a
  STEPPED swap Anton → Archivo 900 → 600 → 300 → 200 (3 frames per step, staggered left→right, each glyph centered on
  its own advance; never cross-fade two letterforms), tracking 0 → +0.3 em, colour yellow → warm white, jitter → 0,
  no horizontal stretch beyond 1.04; 22.75–23.25 it dissolves into EB Garamond italic `unclench.`
  The flashlight cone widens until it fills the frame (narrow attention → open awareness); black warms to dove-grey
  fog; camera pulls back to his whole body: palm open, eyes '> <' → '^ ^'.
- **24.0–27.0 SKY REVEAL.** 24.0–25.2 fast dolly-out (ease-out-expo) bursting out through 3–4 parallax fog planes
  (separate layers, each its own scale/zoom rate, alpha-masked toward the edges — not a flat zoom into noise) into an
  immense dawn sky (zenith #5B8FCB, mid #A9CBE8, horizon #F4EFE6 with peach #F9DDB1). The storm we were inside is
  now ONE small grey-white cloud mid-frame (`C.puff`); grabbygrab is tiny, floating beside it, palm open, '^ ^'.
  Lyric (choir C3: you 24.00 / are 24.75 / the 25.50 / sky 25.875, held to 27.75): EB Garamond italic ~150 px navy,
  one word per syllable, centered y≈420; 'sky' slowly widens its tracking while held; HOLD the lyric until 28.4 so it
  hands straight off to V16. 26.25: thin ink viewfinder corner brackets (4 px) draw in at the four corners (60 px
  inset) with `you (all of this) ↘` mono 40 px navy top-left, pointing into the frame.
- **27.0–30.0** gentle sideways drift; the little cloud just stays, nobody fixes it. Grabbygrab floats palm-up with
  `↙ grabbygrab (off duty)` mono 38 px navy. 28.5 `the cloud can stay.` (V16) EB Garamond italic ~96 px navy below
  centre. Brackets + labels clear by 30.0.
- **30.0–33.0 ARROWS.** Sky deepens a touch (zenith #3F78C0) so cream arrows read. Cream line-art arrows (7 px,
  ink fletching, `PRIM.arrow`) fly in from the edges, each taking 1.2–1.5 s to cross, overlapping, routed above/below
  the caption band, with 38 px mono tags riding the shaft: `am i doing this right` (exact callback of the 15 s
  fragment) / `what you said in 2014` / `arrow #2 (optional)` / `someone is wrong online`. Each passes straight
  through the sky and the little cloud; the sky ripples (2–3 soft rings, `PRIM.ripple`) and heals in ~10 frames —
  no impact, no mark. Captions: `arrows pass through.` (V17, narrator → `serifRoman`, warm white + navy shadow) and
  `the sky doesn't mind.` (V18, `serif` italic, no special emphasis on 'mind'). As the '2014' arrow passes,
  grabbygrab's fingers twitch toward it once, then relax open.
- **33.0–36.0 THE REWARD HACK.** V19 `the reward hack:` — 'the' in EB Garamond + `reward hack` as an inline-code
  token (JBM 500 ~60 px inside a thin 4 px rounded rectangle). 33.9–34.6: a volley of ~12 untagged arrows from every
  direction; the sky ripples and heals; grabbygrab stays palm-up. V20 (34.05) `don't close, / not even for this.`
  (serifRoman, warm white). Then everything goes still: a gold jhana orb (flat gold disk #FFC861 with a soft 2-stop
  glow, ~60 px; `jhana?` 40 px mono navy beside it) drifts in alone 34.8–35.6 and settles into his open palm at
  35.6, glowing a little brighter. **End state at 35.999 must equal `C.BOUND.t36`:** grabby at (540, 880) size 170,
  palm up (open 1, arm resting), orb r≈30 in the palm, one white `C.puff` at (760, 560) r 120,
  sky `C.SKY_MORNING`. Act 3 starts from exactly that frame.
