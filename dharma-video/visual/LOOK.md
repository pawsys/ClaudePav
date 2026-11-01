# UNCLENCH v2: LOOK BIBLE, "Light through glass"

Art director's rules for rebuilding all 60 seconds. Builders follow this file. Where it is silent, follow
`/tmp/wf/v2_brief.md`, then the research reports in `out/lookdev/research_*.md`. Timing truth is
`visual/timing.js` (word onsets), `script.json`, `audio/song.py` (SFX and note times) and the v1 scene files.
`bible.json` is out of date in places: `sky` is at 25.875, not 26.25; "when he grabs again" is at 55.5, not 56.25;
Tilopa is voiceless at 49.5 to 52.5, not 46.5. Where they disagree, timing.js and the v1 scenes win.

No em dashes or en dashes anywhere on screen. This file avoids them too.

---

## 0. The decision

**Winner: `glass`** ("Translucent glass and prism"). Two of three judges picked it, and it has the best mean score
(glass 7.78, rays 7.11, pool 6.25 across beauty, Hockney, viral, phone legibility, character and story). It answers
the creator's literal ask, "translucency that creates the shapes", and has the most quotable dharma images: the
church-window saint, the knot that turns out to be a jewel (AN 1.49), the af Klint flower, and the window that
returns at night.

**What glass lacked comes from `rays`.** The creator asked for "everything made out of rays" and "lines in the
drawings", and glass was mostly fills. The rays direction has the best light, the only drop with real impact,
the gold dry-brush ensō, the pearl moon and the cleanest caption treatment. **`pool`** gives Hockney's flat
vocabulary: the concentric sun, the landscape strip, the reverse-perspective fields, the hand-drawn light arrow,
the off-register contour, the moon drawn as broken pearl ripples, and a type hierarchy with a huge "free.".

**The v2 language in one sentence:** the world is coloured glass, light passes through it as rays, and a hand
draws it in lines of light. Grasping makes lead lines, closes the aperture and pulls the rays inward. Letting go
opens the glass and lets the light out.

**The dharma reason, never shown on screen:** "Luminous, monks, is the mind. And it is defiled by incoming
defilements" (AN 1.49). The knot is the one opaque thing in the film. It is a dark crust on a jewel of light.

---

## 1. What we follow from the viral research (and why)

From `out/lookdev/research_viral.md`:

1. **Win on art.** "Made with Claude Opus 5.5" no longer carries a post on its own (median views fell from 46k to
   about 20k by week 5). The frame has to be beautiful enough to screenshot.
2. **A face carries it.** Character music videos reach 300k to 4M views; abstract calm pieces stall around 20k. So
   grabbygrab stays cute and readable in every scene, at 35 to 45% of frame height in the key shots.
3. **Colour area.** Hit music videos have a median colourful-pixel share of 45.5%; v1 measured 29%. v2 targets
   **0.45 or more on every frame** (S ≥ 0.25 and V ≥ 0.15 on a 32x32 downsample). The only allowed exception is
   the 17.55 to 18.6 valley, which must still be at least 0.20.
4. **Something happens every 1.5 to 3 s, and hits land on beats.** The grid is 80 BPM: beat 0.75 s, bar 3.0 s,
   16th 0.1875 s.
5. **Bursts are earned by restraint.** There are 9 hits in the film (section 2.9). Everything else is calm.
6. **Translucent light shapes.** Nobody else in the wave does this, and the creator asked for it.
7. **Hockney grammar:** fearless complementary flat colour, coloured shadows, drawings that draw themselves,
   pool light as lines, reverse perspective.
8. **The first 2 s must work muted.** Frame 0 is the poster. It needs the glowing character, the knot and
   "YOU'RE CLENCHING SOMETHING RIGHT NOW." readable at 270x338.
9. **Text-light.** Keep the word-synced captions, which are a hard constraint. Mono asides stay short and few.
10. **Invisible loop.** Frame 1799 flows into frame 0.
11. **In-group language gets a visual moment:** jhana, the reward hack, headless, metta, Tilopa.
12. **Don't clone Bright Mirror.** No yellow condensed captions as the main look, and no RGB-split type.

---

## 2. The visual language

### 2.1 The material stack

Every frame is built from these layers, back to front. Nothing else is allowed.

| # | Layer | What it is | Where it renders | Blend |
|---|---|---|---|---|
| 1 | **GROUND** | Deep, saturated flat colour, at most 2 or 3 gradient stops. Never black, never grey: V ≥ 0.15 and S ≥ 0.4, except the ALL void. | pane canvas 540x675 | source-over |
| 2 | **GLASS** | Translucent coloured planes: iris blades, window panes, joiner panels, lobes, af Klint circles, kaleidoscope facets, landscape fields. Overlaps create the new colours and the shapes. | pane canvas, plus GL for refraction | `screen` on dark grounds, `multiply` on light grounds, 35 to 75% alpha |
| 3 | **LIGHT** | Rays, shafts, Hockney squiggles, bursts, glows. Light that passes through a pane takes the pane's hue: ray intensity × `mix(1, paneColor*1.6, uTint)`. This is the graft that makes glass and rays one language. | GL at 540x675, HDR | additive |
| 4 | **LINE** | Drawn light: the character's light-pen contour, off-register second lines, glint edges on glass, lead lines, light arrows, specimen drawings. Drawn stroke by stroke where possible. | Canvas2D 1080x1350 | `lighter` for light lines, source-over for lead |
| 5 | **INK** | The only darks: faces (deep indigo "lead came" #1B1240), the knot's crust, lead lines. | Canvas2D 1080x1350 | source-over |
| 6 | **TYPE** | Captions and mono readouts on a caption pane, with the shared glow pass. | Canvas2D 1080x1350 | see 2.11 |

**Lead lines mean grasping.** They are thick in the clench (6 to 10 px, #0E0830), crack and fall away at
21.75 to 22.25, are absent in the sky, flicker back faintly in the reward hack, and return thin (3 px, at 60%)
around the moonlit window at rest: the structure is still there, but the light passes.

### 2.2 Ray direction is the state of mind (from rays)

| Time | Rays do this | Coherence | Boil | Colour harmony |
|---|---|---|---|---|
| 0 to 6 hook | **Converge**: cold dashes stream inward through the iris into the knot | tangled | 15 fps | complementary, dissonant |
| 6 to 9 some guy | a small **sunburst** of wedges shoots out behind the meditator (comic reveal) | high | 7.5 fps | orange and magenta on ultramarine |
| 15 to 17.55 buzz | converge faster and tighter | tangled | 15 fps, wobble +50% | darkening toward the knot |
| 17.55 to 18 tape-stop | **freeze** mid-flight | n/a | stops | desaturate to 0.2 |
| 18.4 to 21 look | **parallel**: one warm beam from the top (the viewer's eyes) | total | 7.5 fps | monochrome warm |
| 21 to 24 unclench | **burst** out of the opening palm, one fan per finger | medium | 15 to 7.5 fps | analogous dawn |
| 24 to 30 sky | **radiate softly** from him; Hockney squiggles drift | soft | 7.5 fps | Hockney pool blue plus tinted lines |
| 30 to 33 arrows | single straight coral rays cross the frame | n/a | none | coral on blue |
| 32.9 to 35.4 reward hack | the iris tries to **close** and the rays bend inward again, then snap open on "this." | collapsing, then open | 15 fps during the close | knot colours creep in |
| 36 to 39 drop | **radial explosion**: he is the sun | symmetric | 15 fps on rays | full Hockney spectrum |
| 39 to 42.75 headless | rays **rise from the viewer** at the bottom edge | high | 7.5 fps | as the drop |
| 42.75 to 49.5 metta | rays **curl** into petals and the ensō | symmetric | 7.5 fps | rose, gold, lilac |
| 49.5 to 54 Tilopa | rays **fold into one white beam** | increasing | slowing, frozen at 52.5 | spectrum subtracts to white |
| 54 to 59.25 rest | **one slow pearl moon** of fine rays | still | frozen | monochrome night plus the window's colours |
| 59.25 to 60 regrab | **snap inward** in 8 frames | collapses | jumps to 15 fps | dissonance returns |

### 2.3 Line language arc (from pool, fixed)

- **Tense:** lead lines, plus the knot's scribble tangle.
- **Opening:** cracks with light leaking out of them (18.4 to 22.25).
- **Released:** ripple rings and rays (22.25 to 24).
- **At ease:** Hockney's smooth, rounded squiggles (24 to 36). Use **iso-lines of a domain-warped sine field**, not
  Voronoi. Voronoi reads as electric cracks or a plasma ball (all three judges) and is allowed only as the 20%
  crack during the reward hack and the 59.25 regrab.
- **Resting:** sparse, slow water lines and floor caustics (54 to 59.25).

### 2.4 Mark vocabulary (the only marks in the film)

Weights are at 1080x1350. The feed shows the video at about 0.33x, so a 3 px line becomes 1 px.

| Mark | Spec | Used for |
|---|---|---|
| **RAY** | Tapered wedge, base 4 to 16 px, white-hot base at sources, colour in the halo. GL analytic ray field (`hair()` in `lookdev/rays/glsl.js`) or sprite rays. **Minimum core 2.5 light px (5 canvas px) for any ray that carries the read.** Decorative hairlines may be 1.5 light px, at 35% alpha at most. | everywhere |
| **SQUIGGLE** | Smooth iso-line, 4 to 6 px with a 2 px white core, width varying 0.6x to 1.4x along its length. Two families: white/lemon (#FFFFFF, #FFF3A6) and pink/lilac (#FF9ACB, #C6A3FF). At most 6 to 10 lines crossing the frame width. | sky, rest (sparse) |
| **DASH / DOT** | 8 to 20 px dashes along a flow, 3 to 8 px dots. | hook vortex, confetti on 16ths, motes |
| **GLASS PANE / LOBE** | Translucent plane, 35 to 75% alpha, with a 2 px white glint on its light-facing edge (full-res 2D). | all glass |
| **LEAD LINE** | Indigo came, 3 to 10 px, #0E0830 to #1B1240. Never #000. | grasping, the window |
| **SCRIBBLE** | Tight looping tangle. **Reserved for the knot and the 5.25 ring.** It is the mark of clenching. | knot, ring |
| **NEON TUBE** | White-hot core 4 to 6 px, coloured halo through the shared glow pass. At most about 12 hero paths per frame. | hook type, 5.25 ring, stamps, "free." |
| **SPARK** | 4 to 6 short rays from a point: born in 2 frames, gone in 8. | celesta notes, impacts that do not happen |
| **LIGHT-PEN CONTOUR** | The character line (3.1). | grabbygrab, hands, cloud, specimen, meditator |
| **BRISTLE STROKE** | A dry brush made of 20 to 40 parallel lines of light that split into strands where the brush dries (`METTA_FS` in `lookdev/rays/scenes2.js`, lines 362 to 392). | the ensō only |

**Rule: never let an important line fall below a 3 px luminance core.** X re-encodes at 4:2:0 chroma, so detail
lives in luminance and colour lives in the halo.

### 2.5 Translucency rules

1. A form appears where 2 to 6 translucent planes overlap. Plan the overlap colours on purpose: yellow + pink,
   yellow + cyan, pink + cyan, green + blue and orange + ultramarine all work. **Never** lemon over sky blue (olive)
   or green over pink (brown).
2. Use at most 3 additive overlaps before white. **White is reserved** for light sources (sun, beam core, jewel,
   moon), the cores of lines and type, and glints.
3. Shadows are a cooler hue (violet or ultramarine at 20 to 40%), never grey.
4. **Glass needs something behind it to bend.** A glass body over a plain gradient reads as a soap bubble. Put
   squiggles, rays, blades or panes behind every refracting shape.
5. Rainbow (spectral dispersion) appears only *inside* glass (his body, the cloud, the jewel) and in the jewel's
   fan. Never as a literal rainbow arc in the sky, and never as ROYGBIV stripe fields.

### 2.6 Glow, bloom, tonemap

- **One shared glow pass per frame in 2D:** draw every halo (type, contours, tubes, sparks) into one 1/4-res
  canvas, blur it once, and add it back with `lighter` (`G.glow`/`G.flushGlow` in `lookdev/glass/glass.js`, lines
  364 to 372, or `LX.glow2d`). Never use `shadowBlur`, and never stack multipass wide strokes.
- **GL bloom** inside the light stack: 5 levels (4 if over budget), threshold 0.6 to 0.85, `bloomK` 0.30 to 0.45,
  up to 0.6 at the drop. Crisp 2D type and ink never go through bloom.
- **Tonemap:** hue-keeping soft shoulder (`RG.COMP` in `lookdev/rays/glsl.js`), saturation 1.05 to 1.10, a tinted
  vignette (deep complement of the ground, never black) at 0.25 to 0.35, luminance grain at 1.5 to 2.5% seeded by
  `frame % 1800`.

### 2.7 Palettes per section (hex)

Columns: **ground** (top to bottom), **glass** (planes), **light** (rays and lines), **figure** (grabbygrab fill /
contour core / halo / off-register line), **type** (core / halo / caption pane at alpha). Each section has one
dominant hue and one complementary accent (Hockney's *Tristan* rule), except the drop, which breaks the rule on
purpose.

| Section | Ground | Glass | Light | Figure | Type |
|---|---|---|---|---|---|
| **HOOK 0-6** "closing aperture" | #1B1466 centre to #120A3E edge | 9 iris blades in complementary order: #2233D6 ultramarine, #FF7A1A cadmium orange, #1FAE7A viridian, #FF2E97 magenta, #FFE45C lemon, #7A2BD1 violet, #1E9BE6 cerulean, #E8412B vermilion, #B6F03C lime; alpha 0.55 to 0.75; lead #0E0830 | inward dashes #E8F7FF, #3DF5FF, #C6A3FF, tinted by the blade they cross | amber glass #FF7A1A at 30% / #FFE2B0 / #FF9A3D / off-register #2EE6FF; outer lead rim #1B1240 at 60% | #FFF8F2 / #FF2E97 / #140C4A at 0.50 |
| **SOME GUY 6-9** | #1B2A8C | sunburst wedges alternating #FF8A1F, #FF2E97 and ultramarine; window panel #2B4BFF at 25% | meditator line #E8F7FF, halo #7FD8FF; bodhi leaves #B6F03C, #1FAE7A | (he is off screen) | #FFF8F2 / #FF2E97 / #120A3E at 0.45 |
| **ALL 9-10.5** | void #0A0618 | ALL letters as stained glass: #FFE45C, #FF7A1A, #E8412B panes, lead #0E0830 | light pouring through the letters #FFF3C4; crack #FFFFFF core, #48E5FF halo | n/a | "OF", "SUFFERING." #FFF8F2 / #FF2E97 |
| **SAME CAUSE 10.5-12** | #1B1466 | 4 joiner panels over #241A70, tinted #1E4FD8, #FF2E97, #1FAE7A, #FF7A1A at 18% `screen`; overlaps glow; 2 px white edges | dashes into each mini knot | mini amber glass | #FFF8F2 / #FF2E97 / band #140C4A at 0.55 |
| **SAINT 12-13.3** | #2A1A7A to #1B1466 | window panes, backlit: #FFE45C, #FF8A1F, #FF2E97, #19C3D6, #B6F03C, #2B4BFF, #9B5CFF; per-pane value ±20%; lead #120A30 | transmitted shafts in the pane colours; floor spill in the same colours; halo #FFC23D; light arrow #FFE45C core #FFFFFF | coral glass #FF6B57 at 30% / #FFE2B0 / #FF9A3D / #2EE6FF | #FFF8F2 / #2EE6FF (cyan on the warm window) / #140C4A at 0.50 |
| **PLATE 13.3-15** "cyanotype lightbox" | #0E2C6E to #163E8C, milky glass grain 3% | none (one sheet of backlit glass) | drawing #E8F7FF, hatch #9FD8FF at 30% | specimen in #E8F7FF line only; the knot is the only colour | mono #E8F7FF; stamps #FFF8F2 core / #FF2E97 halo |
| **BUZZ 15-17.55** | #0C0730 | hook blades at 0.8x to 0.5x alpha (darkening toward the knot), lead lines 6 to 10 px | dashes 2x speed | amber shifting to #FF4A2A | #FFF8F2 / #FF2E97 / #120A3E at 0.55; mono #E8E4FF at 50 to 80% |
| **TAPE-STOP 17.55-18** | as buzz, saturation 1.0 to 0.2, expo 1.0 to 0.6, lean to #2A2350 | | | | |
| **LOOK 18-21** "one wavelength" | #0E0838 (deep indigo, still counts as colour), outside the beam #140C2A at most | the fist's glass rims | beam core #FFE3A3, body #FFB45C, edge #FF6A3D at 15%, motes #FFF4D6 | fist rims #FFD9A0; knot crust #2A0F2E, its neon edge dimming | #FFF4D6 / #FF9A3D / none; mono #FFF4D6 at 70% |
| **UNCLENCH 21-24** "dawn burst" | #0B0820, then #2B1550, then #6B3FA0, then white at 23.8 | iris blades open and turn analogous: #FFE66B, #FF9F43, #FF5FA2, #C77DFF, #6FE3FF | palm rays in the same five; source core #FFF6E6; jewel fan #FF3B3B #FF9A1F #FFE53B #3DEB7A #3B8BFF #9B5BFF | hand rose glass #FF8FC0 halo, #FFC9A3 fill, white core | #FFF6E6 / #FF8FC0 / #2B1550 at 0.40 |
| **SKY 24-30** "Hockney pool sky" | #0F5FC4 top, #1E9BE6 at 60%, #63D2F0 bottom | cloud lobes #FFFFFF at 42%, #FFD6EC at 42%, underside #CBB8FF at 35%; landscape strip: trees #7A2BD1 (1 in 5 #36C95A), fields #FF6FB5 / #B6F03C / #36C95A, road #FF7A1A with #FFE45C centre line, earth #E8412B | squiggles #FFFFFF, #FFF3A6, #FF9ACB, #C6A3FF; beams from him #FFF3C4 at 12% | clear sky glass, fill #FFE7C2 at 25% `screen` / #FFFFFF / #7FD8FF / #FF9ACB; brighter than the sky behind him | #FFFFFF / deep shadow-halo #0B2A7A / #0A3F8F at 0.40 |
| **ARROWS 30-32.9** | deeper: #0B4FB0 to #3FA5E8 | as sky | arrows #FFFFFF core, #FF6B57 halo; celesta sparks D6 #FFF3A6, F#6 #FF9ACB, A6 #FFFFFF, E6 #A6FFE9 | as sky | as sky; tags mono #FFFFFF |
| **REWARD HACK 32.9-36** | as arrows | the hook's 9 blades return at 45%, tinted toward the sky | squiggles crack at junctions in #FF2E97 / #1FA352 (the knot's colours); orb #FFC861 core #FFF3C4 | as sky | chip: fill #0B1F5C at 70%, edge #3DF5FF, text #E8F7FF; "[exploit found]" #39FF88 |
| **DROP 36-39** "he is the sun" | ultramarine #2233D6, edges #5B2BD9 | concentric sun around him: #FFFFFF, #FFE45C, #FF8A1F, #FF6FB5, thin prism ring #22E4FF; kaleidoscope rose, 12 bold facets in Hockney's six: #2B4BFF, #FF2E97, #FF7A1A, #FFE45C, #B6F03C, #7A2BD1; fields fanning from below the frame, alternating complements: #FF2E97, #B6F03C, #FF7A1A, #2233D6, #FFE45C, #1FAE7A; at most 4 trees #7A2BD1 with #FF6FB5 shadows | rays cycle #FFE600, #FF8A00, #FF3D9A, #B6FF3B, #3DE7FF, #FFFFFF; confetti #FFFFFF, #FFE45C, #22E4FF | white-hot: fill #FFF3C4 at 35% / #FFFFFF / #FFE600 / #FF2E97 | "unclench." #FFFFFF / #FFC23D; "turns out the joy was" #FFFFFF / #1B2A8C; "free." #FFFFFF core in a #FF3D9A tube |
| **HEADLESS 39-42.75** | aperture sky #3DB4FF to #FFF3C4; around it the dark-glass silhouette #1E1458 at 88% with a thin gold light contour #FFC23D | fields as the drop, inside the aperture | rays rising from the bottom edge #FFF3C4; wedges click per beat | happy glass, s 92, in the cupped hands | #FFFFFF / #1B2A8C; mono #E8F7FF |
| **METTA 42.75-49.5** "af Klint tenderness" | raspberry #B3245E top, rose #F2789E, apricot #F6A68D bottom | 6 af Klint circles at about 45% `screen`: #FF8FB1, #FFC94D, #B9A3FF, #FF9E7A, #9FF2D0, #FF6FB5; centre #FFF3C4; 2 px white edges at 50% | ensō bristles #FFC23D, tips #FFF3C4, dry strands #FF9A1F; beat rings #FFD27A | rose glass #FF8FB1 / #FFFFFF / #FFC94D heart spark / #9FF2D0; blush #FF5E8A at 35% | #FFF6EE / #7A1240 (deep shadow-halo) / #5A0E36 at 0.35 |
| **TILOPA 49.5-54** "the spectrum folds home" | metta ground to #2A1F5C to #14123A by 53.5 | layers leave one by one (section 4) | one white beam #FFFFFF, body #F4EFD8 | rose, then pearl | #F4EFD8; halo steps from gold #FFC23D to pearl #9FB4FF |
| **REST 54-59.25** "Moon Room" | #0E1838 to #1B2A5C, room glow #2E3F7A | the 12.5 window at night: same pane hues at 55% value; lead #120A30 at 60%, 3 px; floor projections in the **same** hues at 30% `screen`, as parallelogram shafts cast from the moon's position | moon pearl #F4EFD8 core, halo #9FB4FF, spokes #DCE6FF; floor water lines #9FB4FF / #F4EFD8; reflection: broken pearl ripples #F4EFD8 | pearl glass, fill #F4EFD8 at 20% / #F4EFD8 / #9FB4FF / #C6A3FF | #F4EFD8 / #4A6BFF / none (the ground is dark enough) |
| **REGRAB 59.25-60** | the hook ground floods in from the edges | the hook blades slide in | dashes snap inward | arm #FFB23F; crust #140A2A forms | hook type re-ignites |

**The knot, everywhere it appears:** crust #140A2A, tangle #3A1C6E, split edge **#FF2E97 / #1FA352** (near-equal
luminance, 0.25 and 0.27, so the edge optically vibrates), sparks #B8FF2C. Always drawn source-over.

**Forbidden everywhere:** pure #000 grounds, neutral grey, cream flat fills, black outlines, brown or olive from
multiply, pastel candy palettes, ROYGBIV stripe fields, synthwave violet-magenta as a ground (keep the hook
ultramarine and cadmium, with magenta only as one blade and the halo).

### 2.8 Hockney test and kitsch guardrails

Before a section ships, its key still must pass all of these:

1. Is the colour fearless and flat where it can be?
2. Are the shadows coloured?
3. Is there a drawn line in the frame (something a hand made)?
4. Is there one event, with calm everywhere else (*A Bigger Splash*: a quiet field plus one line-drawn event)?
5. Is the light emitted, not painted on?
6. At the drop and the headless view, does the viewer's own space take part (reverse perspective)?
7. Is the lens vocabulary (anamorphic streak, warp-speed streaks) kept to the drop, and used once?

**Never:** soap bubbles, a literal double rainbow, a cloud on a stick, clip-art gems, pastel shards everywhere,
more than 4 lollipop trees in a frame, Hockney's name or handwriting, a copied composition, or a diving board
near the splash. Everything is evoked vocabulary (pool squiggles, concentric sun, purple trees, wiggly road, a
window), never a recreated painting.

### 2.9 Bursts, neon and every hit, tied to the audio

Times come from `timing.js` and `audio/song.py`. The visual peak lands within ±1 frame of the event.
**Burst** means a GL prism or ray burst with a 1-frame attack and an exp decay. The full bursts are 0.12 (small),
6.0, 9.0, 22.25, 36.0, 36.75 (small), 38.60 (small), 42.75 (soft) and 59.25 (inverse).

| t (s) | Audio | Visual hit |
|---|---|---|
| 0.00 | sub thump + Bm9 stab (the loop downbeat) | poster, steady. Nothing animates in. |
| 0.12 | "You're" | a chromatic prism ring fires out of the knot along the iris spiral (4-frame attack, 0.5 s decay, small) |
| 0.40, 1.60 | lightning crackle | **lead flash**: blade edges and the knot's split edge flash white for 2 frames with a 6-frame decay, +8% exposure (not a full-frame white) |
| 2.25 | "Not your jaw" | hard cut, punch-in 1.08 to 1.00 over 2 frames, iris twists one notch |
| 3.00 | piano G2 + Rhodes swell | the mono aside types on; blade saturation lifts 10% |
| 3.75 | "A thought" | cyan glass thought bubble pops with a 4-frame overshoot |
| 4.50 (+4.62 pop) | kalimba grab motif + thwip | the arm smears out and grabs; the bubble's light is sucked through the iris into the knot; knot +15% |
| 5.25, 5.30, 5.52 | duck, two marker squeaks | freeze (grain keeps running); a closed lemon neon ring scribbles around the knot, one loop per squeak |
| 5.40 to 6.00 | reverse snare swell | the iris tightens; exposure dips 10% into 6.0 |
| 6.00 | the beat drops | 6-frame whip smear, then the sunburst reveal behind the meditator |
| 9.00 | stop-time, reversed piano peak, sub drop | cut to the void; light pours through the ALL glass letters (radial light, not a flash); the light dims with the sub drop |
| 9.40 | lightning | one neon-white crack behind ALL (2 frames, 8-frame decay) |
| 10.50 | beat slams back, rim fill | joiner panels slam in on the beat (2-frame overshoot, 1/16 stagger) |
| 11.10 | (pff) | the jhana orb's light goes out under a crust |
| 12.00 to 12.70 | | zoom into the hero cell; the window lights pane by pane on 16ths |
| 12.45 to 12.74 | "little guy." | the light arrow draws itself and points at him |
| 12.90 | marimba blink tick | a slow deadpan blink |
| 13.35 | paper slide | the window's lead lines straighten into the plate border |
| 13.50, 13.875, 14.25 | choir "grab, by, grab" + kalimba | GRAB / BY / GRAB neon stamps with a 3-frame, 4 px shake |
| 15.00 | paper tear | the plate's glass cracks along a diagonal and falls away |
| 16.50 | hats in 16ths + riser | dashes double speed; the leader line draws to the label |
| 17.00 | lightning | lead flash + 4 px shake |
| 17.55 to 18.00 | tape-stop | the clock warps to a freeze; saturation 0.2; exposure 0.6 |
| 18.40 | the buzz returns alone | the beam switches on in 1 frame |
| 20.25 | reverse swell of "un" | beam +20%; hairline light leaks appear in the crust |
| 21.00 | choir "un" + drone glide | thumb and index open; the iris starts to open; first crack in the crust |
| 21.75 | "clench" | the other fingers open (120 ms stagger); the crust cracks and shards fly, catching glints |
| 22.25 | singing bowl | **JEWEL BURST**: white-hot core, spectrum fan, dawn rays out of the palm, a ripple ring at 900 px/s |
| 22.50, 23.25 | celesta | sparks on the jewel |
| 23.60 to 24.00 | harp glissando + reverse cymbal | fly into the jewel; its core fills the frame at 23.8 |
| 24.00 | choir "you" | open into the sky from white; the squiggles start to draw |
| 24.75, 25.50, 25.875 | "are", "the", "sky" | each squiggle family draws on with a syllable; the beams from him extend |
| 26.25 | celesta A6 | a spark on "sky"; the light-line viewfinder brackets draw in |
| 27.00 | brush kit enters | the squiggles drift a little faster; the beams breathe on beats |
| 30.75 / 31.50 / 32.25 / 33.00 (celesta at +0.42) | arrow whooshes, then celesta instead of an impact | an arrow passes through and bends inside the glass; a ripple ring where it crosses the squiggles; a spark at +0.42 |
| 33.00 | kalimba unlock blip | the "[exploit found]" badge pops in with a cursor |
| 32.90 to 34.05 | "The reward hack:" | the hook's iris blades slide in from the edges; the squiggles crack 20% |
| 34.52 to 35.25 | volley + celesta cascade | 12 ray streaks pass through the half-closed blades; one spark per celesta note |
| 35.41 | "this." | the iris snaps open (blades fly out with glints) |
| 35.60 | glass ting | the orb lands in his open palm by itself; a spark |
| 35.75 | riser | the orb brightens; exposure ramps up |
| **36.00** | **THE DROP** | whiteout from the orb, capped at 0.85; ray shoot-out; prism shockwave; 0.3 s decay; the concentric sun appears; confetti starts on 16ths |
| 36.75 | "clench" | a second, smaller shockwave |
| 37.50 to 38.37 | "Turns out the joy was" | words blaze on their onsets |
| **38.60** | "free." | its own hit: the pink tube ignites + a small prism ring + 6 sparks |
| 39.00 | everything in + harp arpeggio | pull back to the headless view; wedges click half a facet per beat |
| 41.25 | celesta A6 + descant | a spark in the head-space on "sky" |
| 42.75 | metta + music box B4 | a soft rose-gold bloom (0.5 s) + the first af Klint circle |
| 43.50, 44.25 | music box D5, F#5 | circles 2 and 3 |
| 45.00, 45.75, 46.50 | "love", "him", "o" (oohs enter at 45) | circles 4, 5, 6; the ensō draws 45.00 to 47.25 |
| 47.25 | "pen" | the centre circle (his heart) glows; a gold ring pulses out |
| 49.50, 50.25, 51.00, 51.75, 52.50 | (voiceless Tilopa; layers drop out of the mix) | one layer of the image pops out on each beat |
| 54.00 | singing bowl + "Rest." | the last beam softens into the moon; the night window fades in |
| 56.25 | | one eye opens, 2-frame micro-zoom 1.00 to 1.03 |
| 57.00 | felt piano | the moon's ripple reflection brightens a little |
| 58.50 | pad swell | a tiny pearl wisp drifts in |
| **59.25** | kalimba grab motif + thwip; the tanpura detunes | the arm shoots out; the crust forms; the rays snap inward; the iris closes from the edges |
| 59.85 to 59.97 | reverse cymbal peak | the hook caption tubes ignite (flicker) and are steady by frame 0 |

### 2.10 Beat pulse and photosensitivity

- **Downbeat exposure pulse:** `expo *= 1 + A * exp(-(t - tBar) / 0.15)`, where tBar is the last multiple of 3.0 s.
  A = 0 for 0 to 6 (no drums), 0.06 for 6 to 17.55 (0 during 9.0 to 10.5), 0 for 18 to 27, 0.05 for 27 to 36,
  0.08 for 36 to 42.75 (plus 0.04 on every beat), 0.04 for 42.75 to 49.5, and 0 from 49.5.
- **Flashes:** at most 3 per second, counted as a rise then a fall of at least 0.10 in mean luminance. The 36.0
  whiteout is capped at a 0.85 white mix at the centre, falling to 0.40 at the frame edges, so the edges keep
  their colour. Lightning frames are lead-line flashes, not full-frame whites. The knot's vibration is a hue
  alternation at equal luminance, under 10% of the frame area, switching at most every 2 frames. Never strobe
  saturated red over a large area.

### 2.11 Typography

**Voice decides the type.** This rule keeps 60 s of captions coherent:

| Voice | Font | Look |
|---|---|---|
| narrator (bm_george) in the clenched half, 0 to 18 | **Anton** 400 caps | neon signs: white-hot fill #FFF8F2, a 0.035 em inner stroke in #FFFFFF, the halo in the glow pass (stroke 0.08 em + fill in the halo colour). **No yellow, no RGB split.** |
| narrator after 18 (arrows, reward hack, don't close) | **Fraunces 400 roman** | light-written, upright, deadpan |
| guide (af_heart): look, cloud, sky doesn't mind, joy, metta, rest | **Fraunces 400 italic** | light-written |
| choir (sung) | **Fraunces 700 italic** (payoff word "free." in 900 italic) | bigger, written in light |
| field-guide readouts and asides | **JetBrains Mono** ("JBM") 500, labels 600 | instrument readouts made of light |

Load the extra Fraunces faces in the v2 page with `FontFace` from `visual/fonts/`: `fraunces-latin-400-normal`,
`fraunces-latin-600-italic`, `fraunces-latin-700-italic`, `fraunces-latin-900-italic` (as the glass page did for DM
Serif). `ENGINE.loadFonts` already provides Anton, Fraunces 400 italic and JBM.

**Word states** (word-synced through `window.TIMING`):

- **Clenched half: unlit glass, then ignite.** Before its onset a word is unlit glass: core colour at 30% plus a
  3 px outline at 75% (#E8E4FF). It must read at 360 px wide; the lookdevs' hairline unlit words did not. At the
  onset minus 0.06 s it ignites with a neon flicker over 4 frames (0.6, 1.0, 0.35, 1.0), then holds.
  **Exception:** V01 is fully lit from frame 0 (poster rule). Its words pulse (+25% halo for 4 frames) on their
  onsets instead of igniting, and its tubes re-ignite at 59.85 (section 5.5).
- **Open half: pre-lit, then blaze.** At line start every word appears "pre-lit" at 0.55 (backlit glass, readable).
  Each word blazes to 1.0 at its onset with a 4-frame bloom (halo 1.3x, then 1.0). This fixes "57.0 reads dim"
  while keeping strict sync.
- **Light-writing** (glyph outlines drawn stroke by stroke, then filled 4 to 6 frames after the outline closes) is
  used for two words only: "unclench." (22.3 to 22.98) and "free." (38.60). Glyph data:
  `out/lookdev/research/glyphs.js`, `glyphWrite()` in `out/lookdev/research/grammar.html`. It costs 130 to 205 ms
  per word, so never more than one word at a time.
- **No chromatic split on any caption.** Prism fringes belong only to glass edges and the character's contour.
- **Strict sync is the default.** `?preview=1` lights every line fully, for lookdev stills only.

**Halo rule:** on dark grounds (local luma under 0.45) the halo is a complementary neon (magenta on cool grounds,
cyan on warm ones). On light grounds the halo is a **deep shadow-halo** in the ground's darkest complement
(#0B2A7A on the sky, #7A1240 in metta), so white type stays readable on bright light.

**Caption pane:** a feathered rounded slab (feather 80 to 90 px) in the section's deep colour (the pane hex in
2.7), source-over at 0.35 to 0.55. It is never a multiply of a warm colour, which made the lookdevs' brown blobs.
The GL light layers take a **calm-zone mask**: ray, squiggle and dash intensity × 0.15 inside every caption box
plus 40 px, and inside 1.3x the character's radius.

**Sizes and minimums:** Anton cap height at least 90 px for the hook and at least 80 px for the rest of the
clenched half; Fraunces at least 76 px in the open half; mono at least 36 px (40 px preferred). Fit every line to
at most 940 px wide (`TY.fit`). Anton's cap height is about
0.72 em. Captions live in the top third (y 90 to 600) unless the beat table says otherwise. Keep x > 820 with
y < 110 clear for the watermark. Keep key content above y 1215, where X's player controls sit.

**Local contrast:** at least 4.5:1 between the type core and the pane-darkened ground behind it, checked by
sampling around the glyph boxes in QA.

**Watermark:** `pawel.world`, JBM 600, 30 px, right-aligned at (1000, 78), #F4EFD8 at 45% on dark grounds and #0B2A7A
at 70% on the sky. It lets go on "don't control." (fades 52.5 to 53.0) and returns at 54.0.

### 2.12 Composition and framing

The lookdevs put a centred bean under a top caption in every frame. v2 varies scale and framing on purpose.

| Time | Framing | grabbygrab size (body height / frame) |
|---|---|---|
| 0 to 6 | hero, low centre-left; the knot right of him; the caption on top | **40 to 45%** |
| 6 to 9 | small figure (the meditator) in a tall light panel, lower half | meditator about 280 px tall |
| 9 to 10.5 | full-bleed type | none |
| 10.5 to 12 | 2x2 joiner, minis | about 15% each, body width at least 120 px |
| 12 to 13.3 | hero inside the window arch | about 35% |
| 13.3 to 15 | plate, specimen on the left | specimen about 30% |
| 15 to 17.55 | closer and off-centre right; the knot nearer camera | about 50% |
| 18 to 24 | **macro**: the fist fills the frame | the hand is about 700 px |
| 24 to 30 | **tiny figure in a vast sky** | 12 to 18% |
| 30 to 36 | medium, left third; arrows cross wide | about 22% |
| 36 to 39 | hero centre, inside the sun | about 31% |
| 39 to 42.75 | huge seated silhouette fills the bottom 45%; him tiny in the lap | about 7% |
| 42.75 to 49.5 | push in to the lap, then ease back out | about 22% at the push-in |
| 49.5 to 54 | back to the poster framing | about 7 to 10% |
| 54 to 59.25 | small, low-left, **low horizon**, the window right | about 16% |
| 59.25 to 60 | zoom to the frame-0 framing | 16% to 40% |

**Edge density** (Sobel at 270 px wide): at most 0.14 on every frame, at most 0.10 in metta and rest. Glass
measured 0.06 to 0.13 and pool 0.16 to 0.19, which was too busy.

---

## 3. Characters

### 3.1 grabbygrab, built from glass and light

He keeps his identity: the bean body, one noodle arm, a mitten, comedy faces. Only the material changes.

**Geometry** (from `GG.geo` in `lookdev/glass/grab.js`, line 13): body ellipse half-width `bw = 0.62 s`,
half-height `bh = 0.70 s`, two oval feet at `cy + 0.665 s`, shoulder at the right of the body, arm as a bezier,
bob of 0.02 s on the 80 BPM beat (loop-safe: 80 cycles per 60 s). `s` is the size parameter: s = 300 gives a body
about 420 px tall.

**Material, back to front:**

1. **Lens** (GL): the world behind him is refracted inside his ellipse, with per-channel dispersion at the edge
   (`lensSample` in `GLASS_FS`, `lookdev/glass/glass.js`, line 23 onward). Strength `uLens`: hook 0.35, sky 0.5
   (the squiggles visibly bend and turn gold inside him), drop 0.2, rest 0.4.
2. **Mood fill:** flat translucent mood colour at 15 to 35% (`screen` on dark grounds, `multiply` on light ones).
3. **Inner lobes:** 2 or 3 overlapping colour lobes (`screen`). Translucency makes the shape.
4. **Ray fibres** (from rays): straight radial hairlines inside the body, at most 25% alpha, fading to 0 within
   15% of the contour. Converging toward the fist when clenched, radial outward at the drop, almost none at rest.
   **Never swirled.** The rays metta frame read as "furry" because of a swirl.
5. **Specular streak:** a curved white arc at the upper left (about 100 degrees of arc, 0.05 s wide, 70%), plus a
   soft caustic crescent at the bottom (#FFF3C4 at 30%).
6. **Light-pen contour** (from pool, `contourStrokes` in `lookdev/pool/grab.js`, line 171): one hand-drawn
   tapered line that starts at -2.2 rad and runs 1.07 turns, so it **overshoots its own start**. Core 6 to 8 px
   at hero size (scale with s), white-hot. Taper from 0.35 to 1.0 over the first 6% and from 1.0 to 0.2 over the
   last 8%. Boil re-seeded from `floor(frame / div)`.
7. **Off-register second line:** 45% width, 0.62 of a turn, offset (+6, +4) px × s/300, in the mood's
   complementary colour. It is the iPad-drawing feel against the perfect rim.
8. **Prism fringe** on the contour only: magenta/cyan, 2 to 3 px.
9. **Lead rim (clenched half only):** a 5 px #1B1240 line at 60% just outside the contour. It keeps his
   silhouette readable over warm blades while they rotate, and it says that grasping puts him inside the leaded
   world. It cracks away with the knot's crust at 21.75 and never returns, except during the 59.25 regrab.
10. **Face** in deep-indigo ink #1B1240, the darkest marks on screen. Stroke at least 0.035 s, so faces read at
    270 px.

**Face shapes:** squeeze `> <` (chevrons 0.12 s wide); dots (r 0.045 s, white catchlight r 0.015 s); happy
`^ ^`; closed (sleep arcs); one eye open; worried brows (two slanted strokes). Mouths: zigzag (clench), small
"o" (worried), smile arc, open smile with a #FF6FB5 tongue (drop), flat (deadpan). Sweat drop: a cyan light tear #48E5FF
with a white core. Blush: two soft #FF5E8A ellipses at 35% (metta onward, 25% at the drop).

**The hand, redrawn (must-fix from all three judges):**

- **Closed fist** (0 to 21, and 59.4 onward): one union silhouette with no internal construction edges. It is a
  rounded palm (0.46 x 0.40 of the hand size `hs = 0.55 s`, corner radius 0.16 hs), 4 knuckle bumps (circles of
  r 0.11 hs overlapping 30% along the top), and a thumb capsule wrapped across the front over the index knuckle.
  Add one indigo crease line between thumb and fingers (3 px at hero size). It must clutch the knot (the knot sits
  inside the curl, partly hidden) and read at 270 px.
- **Open hand** (21 onward): palm + **four** finger capsules splayed at -0.55, -0.18, 0.18 and 0.52 rad from the
  arm direction (lengths 0.42, 0.48, 0.45 and 0.36 hs) + a thumb at -1.25 rad (length 0.32 hs). All in the same
  glass material, thumb included; the lookdevs' grey pill thumb is gone. **Opening order:** thumb at t0, then
  index +0.12 s, middle +0.24, ring +0.36, pinky +0.48. All are out by +0.48 s, so it never holds a 3-finger "W",
  "three" or peace-sign pose. Waving: rotate the open hand ±0.35 rad on the beat.
- **Small sizes** (s under 160): a two-lobe mitten (fingers as one rounded shape + the thumb) with one ink gap
  crease, so it does not melt into a pale blob.
- **Construction:** one SDF union for GL (extend `LX.GLSL_GRABBY` in `lookdev/tech/lib.js`, line 377, with the hand
  capsules) and one matching Path2D outline for 2D, built by the union-outline trick (stroke every part, then
  erase the interiors with `destination-out`) and **cached per pose key** while the pose is static.

**The arm is a ray:** a tapered glass noodle with a light-pen contour. When it shoots (4.50, 59.25) it uses a
5-frame smear plus a long-exposure trail of 4 to 6 fading copies.

### 3.2 States

| State | When | Face | Glass and line | Motion |
|---|---|---|---|---|
| **CLENCHED** | 0 to 6, 59.97 | `> <`, zigzag mouth, sweat drop | amber #FF7A1A at 30%, core #FFE2B0, halo #FF9A3D, off-register #2EE6FF, lead rim on; fibres converge on the fist | boil 15 fps, wobble 2 px; squash 0.04 on every beat (2-frame attack); fist trembles 1 px |
| **WORRIED** (saint and plate) | 12 to 15 | dots + worried brows, small "o", sweat drop | coral #FF6B57 | slow deadpan blink at 12.90 |
| **SQUEEZING** | 15 to 17.55 | tighter `> <` + brows | amber to red-orange #FF4A2A; boil amplitude 2.5 px | squash on every 8th; tremble 1 to 2 px at 15 fps; frozen by the tape-stop |
| **LOOKING** | 18 to 21 (the macro fist) | (face off screen) | only what the beam lights exists: rims #FFD9A0 | boil 7.5 fps; tremble decays to 0 by 21.0 |
| **OPENING** | 21 to 24 | `> <` to `- -` (21.75) to `^ ^` (22.4) | amber to rose #FF8FC0 with a white core; the lead rim cracks off with the crust | fingers stagger open; boil 15 to 7.5 fps |
| **HAPPY** | 24 to 49.5 | `^ ^`, smile; at the drop an open smile with tongue; in metta, blush | sky: clear glass, fill #FFE7C2 at 25%, brighter than the sky; drop: white-hot core, #FFE600 halo, radial fibres (he is the sun); metta: rose #FF8FB1 with a gold heart spark | sky: drifts, waves past the cloud; drop: hops on beats (2-frame anticipation, squash on landing), waving; metta: shy open-handed wave 46.4 to 47.6 |
| **ASLEEP** | 54 to 59.25 | closed arcs, smile; one eye open from 56.25 to 57.45 (flat mouth) | pearl glass, fill #F4EFD8 at 20%, halo #9FB4FF, off-register #C6A3FF | boil frozen; breathing 0.01 s at 12 cycles per 60 s |
| **REGRAB** | 59.25 to 60 | eyes snap to `> <` at 59.42 | pearl crossfades to amber by 59.8; the lead rim returns | arm shoots (5-frame smear); boil jumps to 15 fps; he scales to the hook rig |

Extras: the guilty side-eye to camera at 5.25 to 6.0; fingers twitch once toward the "2014" arrow at 31.9, then
relax open.

### 3.3 The blob and how it transforms

The knot is the only opaque thing in the film. Its story is AN 1.49: a dark crust on a jewel of light.

| Phase | Time | Look |
|---|---|---|
| **KNOT** | 0 to 17.55 | radius R = 0.30 s. Crust #140A2A: a 72-point boundary whose radius jitters ±6% at 12 Hz (seed `floor(t*12)`, 720 cycles per 60 s, loop-safe). Inside: 14 to 20 tangled lead-came scribble lines in #3A1C6E. **Split neon edge:** #FF2E97 at (+3, -2) px and #1FA352 at (-3, +2) px, 5 px each, source-over, swapping which is on top every 2 frames. 3 to 5 spark ticks (#FF2E97, #1FA352, #B8FF2C, white) re-seeded at 12 Hz. Its glow is a dark violet halo, not light. Reuse `GG.knot` and its cached shell (`lookdev/glass/grab.js`, lines 267 to 357). +15% size at 4.50. Jitter doubles from 15.0 and freezes at 17.55. |
| **SEEN** | 18.4 to 21.75 | under the beam its jitter decays to 30% by 21.0. From 20.25, hairline white-gold cracks (#FFE3A3) leak light: the luminous mind inside. |
| **CRACKING** | 21.75 to 22.25 | the crust breaks into 10 to 14 shards that fly outward over about 20 frames. Each shard is dark on its outer face with a white or gold glint on its edges, so they read as glass, not dirt specks. |
| **JEWEL** | 22.25 to 23.8 | a **white-hot light source** (core #FFFFFF, r 0.18 s, bloomed) with 7 to 9 pale gold facet lines. It emits the 6-band spectrum fan and the dawn rays. Not a pastel clip-art gem: rework `GG.jewel` (line 358). |
| **CLOUD** | 24 to 49.5 | what is left of the knot is a small **glass cloud**: 4 to 6 overlapping lobes (#FFFFFF at 42%, #FFD6EC at 42%, underside #CBB8FF at 35%), 2 px white glint rims. It refracts the squiggles (second lens). It drifts free, never on a stick, never held. It melts on "don't imagine." (50.25). |
| **ORB** (jhana) | 10.5 to 11.1 in the grid; 34.5 to 52.5 | a gold glass sphere #FFC861 with a #FFF3C4 core, white specular and 4-point sparkles. Labelled "jhana?". In the grid it goes out under a crust at 11.10. At 35.60 it lands in the open palm by itself; at 36.0 it becomes the sun; from 39 it sits beside him in the lap like a tiny sun; it fades on "don't think." (51.0). |
| **WISP** | 58.5 to 59.25 | one small pearl lobe #F4EFD8 at 40% drifting in from the right. |
| **REGRAB** | 59.25 to 59.9 | the mitten snaps shut on the wisp. The crust creeps over it from the edge inward (59.25 to 59.45), the neon edge sparks on, jitter goes from 0 to 1 by 59.45, and R grows to the hook value by 59.9: the jewel-to-crust reverse of 22.25. |

### 3.4 Secondary figures

- **The meditator (6 to 9):** faceless, seated, drawn in **one continuous light-pen line** (the Picasso light
  drawing), cool white #E8F7FF with a #7FD8FF halo, under a five-stroke bodhi tree whose leaves are dashes of lime
  and viridian. The same seated pose returns huge and headless at 39.
- **Joiner minis (10.5 to 12):** full grabbygrabs with s at least 97 (body width at least 120 px), mitten mode,
  each with its own knot.
- **Specimen (13.3 to 15):** grabbygrab drawn as a white light-line drawing on the cyanotype plate, with 45-degree
  light hatching at 30% in the lower body. The knot in full colour is the only colour.
- **Headless silhouette (39 to 54):** the seated meditator pose, filled with dark glass #1E1458 at 88% (the
  fields show faintly through it at 12%), outlined with a thin gold light-pen line #FFC23D. Above the collarbones
  is the aperture: no hard cut, the silhouette's top fades over 160 px.

---

## 4. Beat-by-beat, 0 to 60 s

Scene boundaries follow v1 (`visual/scenes/act1.js`, `act2.js`, `act3.js`). Times in brackets are word onsets
from `timing.js`.

### ACT 1 (0 to 18): the clench

**0.00 to 2.25 HOOK A: the poster.** Core hook rig (5.3).
- Frame: 9-blade colour-glass iris whose aperture closes on the knot at about (770, 985), blades extending past
  the frame edges and overlapping into new colours; their edges carry 2 px white glints and lead lines. Cold
  dashes stream inward through the blades into the knot, each tinted by the blade it crosses. grabbygrab CLENCHED,
  s = 370 at (455, 965), about 40% of frame height, arm bent and fist clutching the knot (R about 111).
- Caption V01 "YOU'RE CLENCHING | SOMETHING | RIGHT NOW." in Anton: 134 px at y 160, 196 px at y 318, 150 px at
  y 470 (each fitted to at most 940 px wide), fully lit from frame 0, on a #140C4A pane at 0.50 (x 70 to 1010, y 70 to 560).
- Motion: no camera push (the seam needs frame 0 static; any motion must be loop-safe). Iris sway
  `0.06 rad * osc(t, 20)`, one sway per bar, with no net rotation. Beat twist pulses. Prism ring at 0.12. Lead
  flashes at 0.40 and 1.60. Word pulses at [0.12, 0.25, 0.78, 1.25, 1.51].

**2.25 to 3.75 HOOK B: not your jaw.** Hard cut + punch-in (1.08 to 1.00 over 2 frames); the iris twists one
notch. "NOT YOUR JAW." Anton 160 at y 250, igniting at [2.26, 2.56, 2.77]. 3.00: mono "(ok, also your jaw)", 48
px at (540, 372), types on at 40 characters per second with a block cursor.

**3.75 to 5.25 a thought about later.** "A THOUGHT | ABOUT LATER." Anton 150 at y 285 [3.76 to 4.60]. 3.75: a cyan
glass thought bubble (light-pen outline #3DF5FF, glass fill at 25%) pops above him holding the mono word "later".
4.50: the arm shoots (5-frame smear + trail) and snatches it; its light is sucked through the iris into the knot
(the dashes surge inward for 6 frames); the knot grows 15%.

**5.25 to 6.00 THAT ONE.** "THAT ONE." Anton 170 at y 270 [5.25, 5.59]. Freeze, with the grain still running. A
closed lemon neon ring (#FFE45C halo, white core, 10 px wobbly scribble) circles the knot twice, one loop per
marker squeak (5.30, 5.52). It is tight and closed, the opposite of the open ensō at 45. The iris snaps one notch
tighter. He side-eyes the camera, guilty.

**6.00 to 9.00 SOME GUY.** 6.00: a 6-frame whip smear made of streaked dashes, then a tall window panel of
ultramarine glass where **sunburst wedges** (alternating #FF8A1F and #FF2E97 on ultramarine, from `GUY_FS` in
`lookdev/rays/scenes2.js`, line 16) shoot out behind a small meditator: the comic "grand reveal" staging. The
meditator and bodhi tree **draw themselves stroke by stroke** on 16ths from 6.0 to 7.5. Wedges pulse on snares
(beats 2 and 4). Caption "SOME GUY | FOUND THE CAUSE OF" Anton 118 at y 250 [6.01 to 7.44]. 6.6: mono
"~500 BCE · n=1 · still replicates", 40 px at (540, 1118), typed at 60 characters per second. After "of", the
1.5 s instrumental gap holds still: suspense.

**9.00 to 10.50 ALL.** Hard cut to the void #0A0618. "OF" Anton 90 at y 226 (lit at 9.0). **ALL** Anton about 712
px at y 772, about 90% of the frame width, built as **stained-glass letters**: lemon, orange and vermilion panes
with lead lines, lit from behind, light pouring out as radial god rays (`LX.radial` on a 1/4-res mask, tech slot
9, about +60 ms), 2 px tremor. The light inside dims from 1.0 to 0.75 with the sub drop. 9.40: one neon-white crack
splits the void behind the letters. "SUFFERING." Anton 90 at y 1120 ignites at 9.61.

**10.50 to 12.00 SAME CAUSE: the joiner.** A Hockney joiner of **4 small glass windows** (2x2, centres at
(262, 288), (762, 288), (262, 905), (762, 905), cell size 195), each rotated 1 to 3 degrees and overlapping its
neighbours by 6 to 12 px so the overlaps glow. Each holds a tiny clenched grabbygrab with his own knot, the
knots' jitter locked to the hi-hats. Mono labels, 40 px, under each cell in reading order: **money** (10.50),
**jhanas** (10.92), **being right** (11.25), **this video doing numbers** (11.67, two lines). In the jhanas cell
he squeezes the gold orb and **its light goes out under a crust at 11.10**. 10.95: mono "(not how jhana works) ↗",
44 px, right-aligned at (1000, 724). In the "doing numbers" cell a tiny acid-green sparkline (#39FF88) pokes out
of his knot like a rising chart. Caption "SAME CAUSE." Anton 132 at y 622 on a #140C4A band at 0.55 [10.51,
10.85]. Panels slam in on the beat at 10.50 with a 1/16 stagger.

**12.00 to 13.30 IT'S THIS LITTLE GUY: the saint.** Zoom into the "doing numbers" cell (the other cells shrink
away, the label rides along and drops). He becomes the hero, WORRIED, inside a **church-window arch** that builds
pane by pane on 16ths (12.0 to 12.7). The panes are **backlit light**, not a sticker: per-pane glow variation,
glints, bloom through the glass, and the window's own colours spill as shafts onto the floor (the floor stripes
are the window's light). A thin gold neon halo (#FFC23D) hovers over his sweating head. **12.45 to 12.74 ("little
guy."):** a hand-drawn tapered light arrow (lemon, white core) draws itself in one stroke and points at him (pool
arrow, `lookdev/pool/scenes.js`, line 282). 12.90: a slow deadpan blink. Caption "IT'S THIS | LITTLE GUY." Anton
150 at y 290 [12.00, 12.21, 12.45, 12.74], halo cyan #2EE6FF over the warm window.

**13.30 to 15.00 PLATE 01: the field guide.** 13.35: the window's lead lines straighten into the plate's double
border (a motivated transition) and the coloured light flattens into a **cyanotype lightbox**: one sheet of
backlit milky glass (#0E2C6E to #163E8C) drawn in white light lines. Mono header "FIELD GUIDE TO THE MIND · PLATE
01" (JBM 600, 35 px, at (56, 82) inside the plate) with a light rule under it. On the left the specimen drawing
draws itself stroke by stroke on 16ths (13.35 to 14.6); "fig. 1". Rows typed at 60 characters per second, JBM 40
px: "pali: taṇhā (lit. thirst)", "diet: whatever's next", "lifespan: one moment. respawns." (check that ṇ and ā
render in JBM; fall back to "tanha"). **GRAB / BY / GRAB** neon stamps (Anton 168, white core, magenta halo,
rotations -0.05, 0.035, -0.02 rad) slam on 13.50, 13.875 and 14.25 with a 3-frame, 4 px shake (v1 positions
(690, 268), (676, 430), (694, 592) in plate space). The knot in the specimen is the only colour on the plate.

**15.00 to 17.55 IT BUZZES: the tightening.** 15.00: the plate cracks along a diagonal and its glass halves fall
away, revealing the hook iris world, tighter (core hook rig, variant `tight` 0 to 1). The camera is closer and
off-centre: him on the right at about 50% height, the knot nearer the camera. Lead lines thicken from 6 to 10 px;
the blades darken toward the knot; the dashes speed up (2x from 16.5); he squeezes on every 8th. Mono thought
fragments pop in every 0.25 s at three depths (36 to 44 px, #E8E4FF at 50 to 80%): "am i doing this right",
"reply to him", "is this jhana?", "i should be calmer by now", "did i lock it", "what if they", "rent". 16.50: a
light leader line (4 px, 6 px dot terminal inside the knot) draws to the right-aligned label "EVIL VIBRATING BLOB"
(JBM 600, 44 px, at (1000, 596)) and "(was a perfectly nice cloud)" (42 px at (1000, 646)) 3 frames later. 17.00:
lead flash + 4 px shake. Caption "IT BUZZES. | SO HE SQUEEZES. | SO IT BUZZES." Anton 132 at y 330 [15.00 to
17.08].

**17.55 to 18.00 TAPE-STOP.** Animation time warps to a freeze (`V2.tapeWarp`, 5.3): dashes, jitter, boil and
fragments all slow to a stop. Saturation goes 1.0 to 0.2, exposure 1.0 to 0.6, with the hue leaning to #2A2350.
The fragments are gone by 18.0. This is the deliberate near-mono valley before the light arrives.

### ACT 2 (18 to 36): the look and the release

**18.00 to 21.00 LOOK.** Hard cut to the **macro fist** (about 700 px, a closed fist with the knot inside the
curl, its crust visible between the fingers) on deep indigo #0E0838. From 18.00 to 18.40 it is near dark: only
the knot's neon edge at 20% and a few rim glints. **18.40: the beam switches on in one frame**: a warm
mono-frequency beam from the top edge (the viewer's eyes), about 20 degrees wide, built from 60 to 120 parallel
hairline rays plus a soft body, with dust motes. The fist exists only where it is lit: glass rims catch #FFD9A0,
while the shadow side stays dark violet. The knot's jitter decays; at 20.25 hairline cracks leak gold light.
Nothing pries the fingers. Caption "don't let go. | just look." Fraunces italic 92 px ("look." in 700 italic) at
y 222, #FFF4D6 with a #FF9A3D halo [18.76 to 19.98], ending 20.48. Mono asides, 40 px at 70% (#FFF4D6) at (90,
1080) and (90, 1132): "attention is overpowered." (19.25), "evolution can't patch it." (19.50). They hard-cut at
21.75.

**21.00 to 24.00 UN-CLENCH.**
- 21.00 ("un"): thumb and index open; behind the hand the dark turns out to be the **closed iris**, and its
  blades start to retract outward, crisp and supersampled, revealing dawn bands (lemon, apricot, rose, orchid,
  sky cyan). The beam widens from 20 to 70 degrees: narrow attention becoming open awareness.
- 21.75 ("clench"): the middle, ring and pinky fingers open (120 ms stagger). The crust cracks and the shards fly
  with glints. Eyes go to `- -`.
- 22.25 (singing bowl): **the jewel blazes**: white-hot core, spectrum fan through it, dawn rays bursting out of
  the palm (one fan per finger, from `UNC_FS` in `lookdev/rays/scenes2.js`, line 79), and a ripple ring
  expanding at 900 px/s. The knot's threads straighten into rays. By 22.5 the blades are fully off-frame, so the
  top third is a clean dawn gradient for the type (the glass lookdev's muddy blurred blades are gone).
- Celesta sparks on the jewel at 22.50 and 23.25.
- **The type unclenches:** "UN" ignites as a neon Anton tube at 21.0 and "CLENCH" at 21.75. From 21.9 to 22.6
  the letters drift apart (+0.3 em) and the tubes go dark one by one, left to right, 40 ms apart, while
  "unclench." **writes itself in light** in Fraunces italic (glyph outlines 22.3 to 22.98, filled at 22.98), 132
  px at y 250, #FFF6E6 with a #FF8FC0 halo. It ends at 23.75.
- 22.5 to 24.0: the camera pushes into the jewel (motivated transition). At 23.6 the harp glissando starts, at
  23.8 the white core fills the frame, and at 24.0 it opens into the sky.

**24.00 to 28.40 YOU ARE THE SKY.** The camera settles from 1.45 to 1.0 (ease-out-expo over 1.6 s) in an immense
**Hockney pool sky**: flat ultramarine to cerulean, sparse smooth squiggles of light (two families) that **draw
themselves on** with the syllables, and soft beams radiating from him (12% alpha). He is tiny (12 to 18% of frame
height), HAPPY, clear glass brighter than the sky, the squiggles bending and turning gold inside him. Rainbow
appears only as refraction inside his body and the cloud. Far below, a flat **Hockney landscape strip** across the
bottom 12% (y 1190 to 1350): purple lollipop trees, pink and lime field bands, an orange wiggly road narrowing as it
winds (pool, `lookdev/pool/scenes.js`, lines 405 to 450). The small glass cloud floats free nearby. Caption: "you
are the" right-aligned and "sky" left-aligned on one line at y 420, Fraunces 700 italic about 150 px, white with a #0B2A7A
shadow-halo, on a #0A3F8F pane at 0.40 [24.00, 24.75, 25.50, 25.875]. "sky" slowly widens its tracking
while it holds. Ends 28.40. 26.25 (celesta A6): a spark, and **four light-line viewfinder brackets** draw in at the
frame corners (60 px inset) with mono "you (all of this)" (40 px at (96, 140), 26.4 to 29.8). 27.2: mono
"grabbygrab | (off duty)" (38 px, right-aligned beside him, to 29.8). 27.00: the brush kit enters; the squiggles
drift a little faster and the beams breathe on beats.

**28.50 to 30.00 THE CLOUD CAN STAY.** He drifts sideways and **waves past the cloud** with the open four-finger
hand. The cloud stays where it is, detached, and nobody fixes it. "the cloud can stay." Fraunces italic 90 px at
y 1080, above the landscape strip [28.50 to 29.18].

**30.00 to 32.90 ARROWS.** The sky deepens (#0B4FB0 to #3FA5E8) so the arrows read. Arrows are single straight
**coral rays** (white core, #FF6B57 halo, 7 px) with a mono tag (38 px) riding the shaft: "am i doing this right"
(30.75, through the cloud), "what you said in 2014" (31.50), "arrow #2 (optional)" (32.25, through the cloud),
"someone is wrong online" (33.00). Paths follow the v1 `TAGGED` table in `act2.js` (around line 744). Where an
arrow passes through glass (him or the cloud) it **bends** (a visible refraction kink) and nothing breaks. Where it
crosses the squiggles a ripple ring spreads and heals within 10 frames. At +0.42 s a celesta spark appears where
the impact should be (D6, F#6, A6, E6 colours). His fingers twitch toward the 2014 arrow once, then relax open.
Captions: "arrows pass through." Fraunces 400 roman 90 at y 218 [30.00 to 30.80], to 32.3; "the sky doesn't
mind." Fraunces italic 96 at y 322 [31.50 to 32.25], to 32.75.

**32.90 to 36.00 THE REWARD HACK.** The bridge image between AI TPOT and dharma TPOT.
- "the `reward hack`:" Fraunces 400 roman 88 at y about 250, with "reward hack" set as an **inline-code chip**:
  JBM 500, 60 px, inside a rounded glass chip (fill #0B1F5C at 70%, #3DF5FF light edge), typed on with a cursor
  [32.90, 32.99, 33.50]. 33.00 (kalimba unlock): mono badge "[exploit found]" in #39FF88 with a blinking block
  cursor pops under it.
- 32.90 to 34.05: **the iris tries to close.** The hook's 9 blades slide in from the frame edges (at 45%, tinted
  toward the sky), twisting about 20%, toward the gold orb drifting in from the left (34.5, labelled "jhana?").
  The rays bend inward and the squiggles start to crack at their junctions in the knot's magenta and green.
- 34.05 ("don't close,"): the blades halt and tremble. 34.52 to 35.25: the volley of 12 ray streaks passes
  straight through the half-closed blades, which don't break; one spark per celesta note.
- **35.41 ("this."): the iris snaps open.** The blades fly back out past the frame edges with glints, and the
  cracks heal into squiggles.
- 35.60 (glass ting): the orb drifts into his open palm **by itself**; a spark. 35.75: the orb brightens into the
  drop. Callback: in the grid at 11.10, when he squeezed it, it went out.
- Caption "don't close, | not even for this." Fraunces 400 roman 88 at y 356 [34.05 to 35.41], to 35.7.
- **BOUND.t36** (contract with act 3): at 35.967 grabbygrab is at (540, 860), s = 300, HAPPY, arm
  `{ext: 0, open: 1, ang: -0.55}`, the orb (r 28) in the palm; SKY/ARROWS palette; no blades on screen.

### ACT 3 (36 to 60): joy, love, subtraction, rest, regrab

**36.00 to 39.00 THE DROP: he is the sun.**
- 36.00: **whiteout from the orb** (capped at a 0.85 white mix, edges keep their colour), a ray shoot-out and a
  prism shockwave ring, decaying over 0.3 s (`DROP_FS` in `lookdev/rays/scenes2.js`: whiteout at line 306,
  shockwave at line 286). Within 0.3 s the light settles into the **flat concentric Hockney sun centred on him**:
  rings at 1.05 (white), 1.25 (lemon), 1.55 (orange) and 1.9 (pink) of his body radius, plus a thin cyan prism
  ring. His body is white-hot glass with radial fibres, so he reads as the sun's core. One focal disc.
- Behind the sun, a **kaleidoscope rose** of 12 bold facets in Hockney's six colours at 55% (ultramarine shows
  through) clicks half a facet per beat; the alternate ring counter-rotates.
- Below, a **reverse-perspective fan of flat complementary fields** from a vanishing point below the frame (about
  (540, 1700)) up to a horizon at y about 905 (pool, `lookdev/pool/scenes.js`, lines 455 to 520), with **full-res
  light-line edges** drawn in 2D on every field boundary (this removes the aliased GL wedge edges and the pasted
  rectangle). At most 4 purple trees, on the fan's outer edges.
- 36.75 ("clench"): a second, smaller shockwave. Confetti dashes of light fall on 16ths (the music-box arpeggio).
  He hops on beats and waves with the open hand.
- Type: 36.00 to 37.28, "unclench." Fraunces 700 italic 140 at y 330, white with a #FFC23D halo, tracking widening
  by 15 px [36.00, 36.75]. 36.00 to 37.42, the mono meter "sunshinification ▓▓▓▓▓▓▓░░ 78%" (JBM 600, 40 px, at
  (540, 205)) fills from 0 to 78%. 37.50: "turns out the joy was" Fraunces italic 76 on one line at y 210
  [37.50 to 38.37]. **38.60: "free." Fraunces 900 italic, about 240 px, at y 360**: light-written, a white core in
  a #FF3D9A tube, with its own small prism ring and 6 sparks. It is the biggest word on screen. Line ends 39.25.

**39.00 to 42.75 HEADLESS (Douglas Harding).** A pull-back from 1.65 to 1.0 (39.0 to 40.6), anchored on the head
window, reveals a huge seated silhouette (the meditator's pose) in dark glass filling the bottom 45%, with a gold
light contour. Above the collarbones there is no head, only a **Turrell aperture** onto the brightest sky: the
concentric sun and the fields, now in **reverse perspective inside the head-space**, with the road narrow at the
neck (the viewer) and widening upward. Rays rise from the bottom edge, where the viewer is. The ray wedges in the
aperture click half a facet per beat, so the section keeps pulsing after the burst. grabbygrab (s 92, HAPPY) sits
in the cupped hands with the orb beside him like a tiny sun. Caption "you are | the sky." Fraunces 700 italic 128
at y 255 in the head-space [39.00, 39.75, 40.50, 40.875], to 42.6. 39.9: mono "PLATE 02 | ON HAVING | NO HEAD"
(JBM 600, 36 px, at (92, 560)). 41.25: a celesta spark on "sky".

**42.75 to 49.50 METTA.**
- 42.75: push in to the lap (scale 1.0 to 1.85 over 0.3 s). The ground becomes the heart-space gradient
  (raspberry to rose to apricot) with a soft rose-gold bloom.
- **af Klint rosette:** 6 translucent glass circles open around him one at a time, so **petals exist only where
  circles overlap**, which is literally "translucency that creates the shapes". Circles 1 to 3 open on the
  music-box notes (42.75, 43.50, 44.25), circles 4 to 6 on "love", "him", "o" (45.00, 45.75, 46.50). On "pen"
  (47.25) the centre circle (his chest) glows rose-gold and a gold ring pulses out. Gold rings also pulse out on
  every beat (soft).
- **The gold dry-brush ensō** of bristle light (rays, `METTA_FS`) draws itself around the rosette from 45.00 to
  47.25 (`uEnso.w` 0 to 1, ease-out), loaded at the start, splitting into dry strands at the tail. **The gap stays
  open** (about 25 to 30 degrees at the top right). It answers the closed 5.25 ring.
- He: dots (worried) until 44.0, then `^ ^`; blush 45.4 to 46.0; a small shy open-handed wave 46.4 to 47.6
  (waving is the opposite of grabbing).
- Captions, Fraunces italic, #FFF6EE with a #7A1240 shadow-halo, on a #5A0E36 pane at 0.35: "don't fight him." 100
  at y 300 [42.76 to 43.37], to 43.68; "he's just scared." 100 at y 300 [43.88 to 44.35], to 44.84; "love him
  open." Fraunces 700 italic 124 at y 240 [45.00, 45.75, 46.50 "o", 47.25 "pen"], to 48.5, with "open." tracking
  growing by 22 px from 46.5 to 48.0. Mono "(may you be happy. even you.)" 40 px at (540, 1167), 47.0 to 48.7.
- 48.75 to 49.50: ease back out to the poster framing (the silhouette's lap), keeping the rosette and the ensō.

**49.50 to 54.00 TILOPA: subtraction (voiceless).** Each instruction pops in **on the beat** (text shown at the
time minus 0.06 s), replaces the previous one, shrinks, and **removes one material of the film's language**, in
roughly the reverse order they arrived. Fraunces italic at y 255: "don't recall." 120, "don't imagine." 110, "don't
think." 104, "don't examine." 96, "don't control." 88. Mono "TILOPA'S | SIX WORDS" (36 px at (92, 560)), 49.5 to
51.6.
- **49.50 don't recall.:** every mono readout, plate number and aside pops out, and the beat rings stop.
- **50.25 don't imagine.:** all coloured glass goes clear: the af Klint circles, the stained aperture fields and
  the cloud melt.
- **51.00 don't think.:** the line layer goes: confetti, sparks, the off-register line and the motes. The orb
  fades.
- **51.75 don't examine.:** the ensō un-paints from tail to head (0.6 s), and his lens stops bending the world.
- **52.50 don't control.:** all rays **fold into one soft vertical white beam** from the head-space down to him
  (the spectrum folds home); camera motion stops dead; the silhouette dissolves into slow motes rising; the
  watermark lets go. The ground drifts to dusk (#2A1F5C to #14123A).
- The caption halo steps from gold to pearl as the colour leaves the type too. He closes his eyes at 52.5.

**54.00 to 59.25 REST: the Moon Room.**
- 54.00 (singing bowl, "Rest."): the white beam narrows into the **moon's glow**, and the **night window** (the
  12.0 saint window, now moonlit: the bookend) fades in around the moon (54.0 to 54.75) on the right (x 620 to
  1000, y 540 to 1060), below the caption zone.
- The moon (centre about (810, 780), behind the window) is pearl and cooler, with a soft halo and fine pearl ray
  spokes, **not a hard white disc** (the rays 57.0 moon read as a sun). The spokes turn slowly, 1.5 degrees per
  second. Rest never touches the seam (everything in it is covered by 59.9), so this term need not be periodic.
- Moonlight through the window lays **the window's own pane colours** on the floor (y over 1060) as soft
  parallelogram shafts consistent with the moon's position. Sparse drawn water and caustic lines drift on the
  floor next to them (6 s period). The moon's reflection is drawn as **broken pearl ripples**. No "+" stars;
  at most 3 or 4 tiny pearl ray glints in the sky.
- grabbygrab ASLEEP, small (s 150) at (330, 1090), low-left, lying in the light on the floor; low horizon.
- Captions, Fraunces italic, pearl #F4EFD8 with a #4A6BFF halo: "rest." 120 at y 300 [54.01], to 56.8; "when he
  grabs again," 76 at y 430 [55.51 to 56.15], to 56.8. 56.25 to 57.45: one eye opens with a 2-frame micro-zoom
  (1.00 to 1.03); 56.6 to 57.9: mono "(i will.)" 44 px beside the open eye with a tiny 2 px speech tick (the
  creature's deadpan confession). 57.00: "just come back." **112 px** at y 340 [57.05, 57.33, 57.53], to 59.2. The
  open eye closes; small smile.
- 58.50: a tiny pearl wisp drifts in from the right.

**59.25 to 60.00 REGRAB and the seam.** See 5.5 for the exact choreography. In short: the arm shoots, the mitten
snaps on the wisp, the crust forms, the rays snap inward, the hook iris closes from the edges and floods the
frame, the camera reaches the frame-0 framing, and the caption tubes ignite at 59.85 so frame 1799 equals frame 0.

### 4.1 Caption and readout schedule (quick reference)

| Id | Text on screen | Font, size | y | On (onsets) | Off |
|---|---|---|---|---|---|
| V01 | YOU'RE CLENCHING / SOMETHING / RIGHT NOW. | Anton 134 / 196 / 150 | 160 / 318 / 470 | lit from 0.00; pulses at 0.12 0.25 0.78 1.25 1.51; re-ignites 59.85 | 2.25 |
| V03 | NOT YOUR JAW. | Anton 160 | 250 | 2.26 2.56 2.77 | 3.75 |
| aside | (ok, also your jaw) | JBM 48 | 372 | types 3.00 | 3.75 |
| V04 | A THOUGHT / ABOUT LATER. | Anton 150 | 285 | 3.76 3.82 4.26 4.60 | 5.25 |
| V05 | THAT ONE. | Anton 170 | 270 | 5.25 5.59 | 6.00 |
| V06 | SOME GUY / FOUND THE CAUSE OF | Anton 118 | 250 | 6.01 6.30 6.61 6.89 6.95 7.44 | 9.00 |
| aside | ~500 BCE · n=1 · still replicates | JBM 40 | 1118 | types 6.60 | 9.00 |
| V07 | OF / ALL / SUFFERING. | Anton 90 / 712 / 90 | 226 / 772 / 1120 | 9.00 / 9.00 / 9.61 | 10.50 |
| V08 | SAME CAUSE. | Anton 132 | 622 | 10.51 10.85 | 12.00 |
| labels | money / jhanas / being right / this video doing numbers | JBM 40 | under cells | 10.50 10.92 11.25 11.67 | 12.0 (the hero label rides the zoom) |
| aside | (not how jhana works) ↗ | JBM 44 | 724 | 10.95 | 12.00 |
| V09 | IT'S THIS / LITTLE GUY. | Anton 150 | 290 | 12.00 12.21 12.45 12.74 | 13.37 |
| plate | FIELD GUIDE TO THE MIND · PLATE 01; fig. 1; 3 rows; GRAB / BY / GRAB | JBM 35/28/40; Anton 168 | plate | 13.35; stamps 13.50 13.875 14.25 | 15.00 |
| V11 | IT BUZZES. / SO HE SQUEEZES. / SO IT BUZZES. | Anton 132 | 330 | 15.00 15.12 15.60 15.81 15.89 16.82 17.01 17.08 | 18.00 (frozen) |
| label | EVIL VIBRATING BLOB / (was a perfectly nice cloud) | JBM 44 (600) / 42 | 596 / 646 | 16.50 / 16.60 | 18.00 |
| V13 | don't let go. / just look. | Fraunces italic 92 | 222 | 18.76 18.99 19.13 19.71 19.98 | 20.48 |
| asides | attention is overpowered. / evolution can't patch it. | JBM 40 | 1080 / 1132 | 19.25 / 19.50 | 21.75 |
| C2 | UN / CLENCH (neon), then unclench. (written in light) | Anton, then Fraunces italic 132 | 250 | 21.00 21.75; written 22.3 to 22.98 | 23.75 |
| C3 | you are the sky | Fraunces 700 italic about 150 | 420 | 24.00 24.75 25.50 25.875 | 28.40 |
| readouts | you (all of this) / grabbygrab (off duty) | JBM 40 / 38 | corner / beside him | 26.40 / 27.20 | 29.80 |
| V16 | the cloud can stay. | Fraunces italic 90 | 1080 | 28.50 28.59 28.98 29.18 | 30.00 |
| V17 | arrows pass through. | Fraunces roman 90 | 218 | 30.00 30.39 30.80 | 32.30 |
| tags | am i doing this right / what you said in 2014 / arrow #2 (optional) / someone is wrong online | JBM 38 | on the arrows | 30.75 31.50 32.25 33.00 | leave the frame with their arrow |
| V18 | the sky doesn't mind. | Fraunces italic 96 | 322 | 31.50 31.57 31.98 32.25 | 32.75 |
| V19 | the reward hack: (chip) | Fraunces roman 88 + JBM 60 chip | about 250 | 32.90 32.99 33.50 | 33.90 |
| badge | [exploit found] | JBM 40 | under the chip | 33.00 | 36.00 |
| label | jhana? | JBM 40 | beside the orb | 34.50 | 35.90 |
| V20 | don't close, / not even for this. | Fraunces roman 88 | 356 | 34.05 34.23 34.80 35.03 35.27 35.41 | 35.70 |
| C4 | unclench. | Fraunces 700 italic 140 | 330 | 36.00 36.75 | 37.28 |
| meter | sunshinification ▓▓▓▓▓▓▓░░ 78% | JBM 600 40 | 205 | 36.00 | 37.42 |
| V22 | turns out the joy was / free. | Fraunces italic 76 / 900 italic 240 | 210 / 360 | 37.50 37.82 37.98 38.06 38.37 / 38.60 | 39.25 |
| C5 | you are / the sky. | Fraunces 700 italic 128 | 255 | 39.00 39.75 40.50 40.875 | 42.60 |
| plate | PLATE 02 / ON HAVING / NO HEAD | JBM 600 36 | (92, 560) | 39.90 | 49.50 |
| V24 | don't fight him. | Fraunces italic 100 | 300 | 42.76 43.02 43.37 | 43.68 |
| V24b | he's just scared. | Fraunces italic 100 | 300 | 43.88 44.13 44.35 | 44.84 |
| C6 | love him open. | Fraunces 700 italic 124 | 240 | 45.00 45.75 46.50 47.25 | 48.50 |
| aside | (may you be happy. even you.) | JBM 40 | 1167 | 47.00 | 48.70 |
| Tilopa | don't recall. / don't imagine. / don't think. / don't examine. / don't control. | Fraunces italic 120 / 110 / 104 / 96 / 88 | 255 | 49.44 50.19 50.94 51.69 52.44 | each replaces the last; the last ends 54.00 |
| plate | TILOPA'S / SIX WORDS | JBM 600 36 | (92, 560) | 49.50 | 51.60 |
| V31 | rest. | Fraunces italic 120 | 300 | 54.01 | 56.80 |
| V32 | when he grabs again, | Fraunces italic 76 | 430 | 55.51 55.65 55.74 56.15 | 56.80 |
| aside | (i will.) | JBM 44 | beside the eye | 56.60 | 57.90 |
| V33 | just come back. | Fraunces italic 112 | 340 | 57.05 57.33 57.53 | 59.20 |

---

## 5. Technical architecture

### 5.1 Where v2 lives

- New page: **`visual/v2/index.html`** with `<base href="../">`, so `engine.js`, `timing.js` and `fonts/` resolve
  exactly as in the lookdev pages. Render with `cd visual && node render.js --page v2/index.html ...`.
- v2 never edits v1 files (`visual/scenes/*`, `common.js`, `grabby.js`, `prims.js`, `engine.js`, `scenes.js`,
  `index.html`). It uses `engine.js` only for `ENGINE.loadFonts()` and `ENGINE.init2d()`.
- Lookdev folders are read-only references. Copy code into `visual/v2/`, never import across folders.

```
visual/v2/
  index.html          page: fonts, init, renderFrame(t) = V2.draw(t), READY after every GL program is compiled
  core/lx.js          copy of lookdev/tech/lib.js (identical to every lookdev's lx.js), plus explicit sampler binds
  core/clock.js       frame(t), osc(t,k), beat/bar, hit envelopes, boil seeds, tapeWarp, TIMING lookups, lit levels
  core/pal.js         section palettes from 2.7 as data, hex/linear helpers, mixHex
  core/light.js       the light stack: pane canvas, GLSL chunk library, program builder, bloom, composite, present
  core/pane.js        pane primitives (disc, film, poly, beam, vgrad), glass planes, glint edges, lead lines
  core/grab.js        grabbygrab: geometry, hand (fist/open/mitten), contour, glass, faces, SDF uniforms;
                      knot, jewel, cloud, orb, wisp
  core/type.js        neon (Anton), light (Fraunces), mono readouts, unlit/pre-lit/ignite, caption pane, glyphWrite
  core/fx.js          bursts (whiteout, shockwave, prism ring), sparks, confetti, smear trails, glow queue, flash guard
  core/hook.js        THE FRAME-0 RIG: iris + dashes + knot + clenched grabbygrab + V01 caption (used by acts 1 and 3)
  core/window.js      the stained-glass window, day (backlit, 12.0) and night (moonlit, 54.0), with floor projections
  core/seq.js         scene registry V2.add(t0, t1, name, fn), V2.draw(t), beat pulse, watermark, debug flags
  act1.js             0 to 18 scenes (+ optional act1_*.js helpers)
  act2.js             18 to 36 scenes (+ act2_*.js)
  act3.js             36 to 60 scenes (+ act3_*.js)
  core_test.html      contact page for the core: every primitive, every state, both window modes, the hook rig
  bench.js            pipeline-faithful timing (copy of lookdev/glass/bench.js, pointed at v2)
  check/              colour.py, seam.js, flash.py, phone.py, edges.py, text_lint.js (see 5.7)
```

### 5.2 Reuse map (copy, then adapt)

| Need | Take from | Change |
|---|---|---|
| GL plumbing (`target`, `pass`, `bloom`, `radial`, `composite`, `present`, `glow2d`, `brushPath`, `GLSL_GRABBY`) | `lookdev/tech/lib.js` | bind every sampler explicitly (unit 0 feedback trap) |
| Light pipeline: pane canvas, GL pass, bloom, composite | `lookdev/glass/glass.js` (`G.light` line 316, `COMP_FS` line 270) | split the uber-shader into chunks (5.3) |
| Lens and dispersion, iris, window, kaleidoscope, rose, caustic, moon | `GLASS_FS` in `lookdev/glass/glass.js` | one chunk each; 2-tap or `fwidth` AA on every hard edge (iris and window included) |
| Pane primitives, glow queue, caption shade, light lines, layout | `lookdev/glass/glass.js` lines 329 to 465 | caption shade uses the section's deep hex, source-over |
| Constant-pixel-width ray fields, spectrum, SDFs, loop-safe phase `lph` | `RG.COMMON` in `lookdev/rays/glsl.js` | minimum core width 2.5 light px for read-carrying rays |
| Hue-keeping tonemap | `RG.COMP` in `lookdev/rays/glsl.js` | add uniforms for the beat pulse and tape-stop saturation |
| Hook vortex dashes | `HOOK_FS` in `lookdev/rays/scenes.js` (line 76) | tint by the pane colour under each dash |
| Sunburst reveal | `GUY_FS` in `lookdev/rays/scenes2.js` (line 16) | 6.0 staging |
| Palm dawn burst + strands | `UNC_FS` (line 79) and `strands()` (line 116) in `lookdev/rays/scenes2.js` | rays leave through the jewel |
| Drop whiteout + shockwave envelope, confetti | `DROP_FS` (lines 248 to 306) and `confetti()` (line 310) in `lookdev/rays/scenes2.js` | cap the whiteout at 0.85 |
| Bristle ensō | `METTA_FS` in `lookdev/rays/scenes2.js` (lines 362 to 392, `uEnso`, `uDraw`) | draw over 45.00 to 47.25; keep the gap |
| Pearl moon + water lines | `REST_FS` in `lookdev/rays/scenes2.js` (line 436) | softer halo, no hard disc; behind the window |
| Word lit levels, neon words, light words | `TY.lit`, `TY.neon`, `TY.light` in `lookdev/rays/type.js` | unlit at 30% + 3 px outline; pre-lit 0.55 in the open half |
| Tapered brush, offsets, union silhouettes | `CH.brush`, `CH.offset`, `CH.silhouette` in `lookdev/rays/char.js` | |
| Character glass, faces, knot, jewel | `lookdev/glass/grab.js` (`GG.geo`, `drawGlass`, `drawLines`, `face`, `knot`, `jewel`) | new hand (3.1); the jewel becomes a white-hot source |
| Light-pen contour with overshoot + off-register line; union stroke | `contourStrokes`, `GR.unionStroke` in `lookdev/pool/grab.js` | |
| Light arrow, landscape strip, concentric sun, fields fan | `lookdev/pool/scenes.js` lines 282, 405 to 450, 455 to 520 | full-res light-line edges on the fields |
| Iris blades, hook staging, iris opening + shards, rosette, Moon Room window + floor panes | `lookdev/glass/scenes.js` (`iris` 27, `irisU` 43, `hook` 48, `unclench` 162, `metta` 368, `rest` 414) | remove bubbles, double rainbow, the brown multiply; floor panes match the window |
| Hockney squiggle field (GLSL) | the bench shader in `out/lookdev/research/grammar.html` (around line 224) and the recipe in `research_hockney.md` section 9 | drive phases with `2πkt/60`; add width variation and calm-zone masks |
| Prism burst + anamorphic streak + leaks | `PRISM_FS` in `lookdev/tech/tech.js` (line 364) | streak only at 36.0 |
| Glyph light-writing | `glyphWrite()` in `grammar.html`, data in `out/lookdev/research/glyphs.js` (regenerate with `tools/glyphs.js` for "unclench." and "free." in Fraunces) | |
| Pipeline-faithful bench | `lookdev/glass/bench.js` | point at `v2/index.html` |

### 5.3 The frame pipeline and the core API

**Per frame** (one scene draws; the core does the rest):

1. **Pane** (Canvas2D 540x675, callers draw in 1080 units through `setTransform(0.5, ...)`): ground, glass planes,
   landscape, fields. Cache static panes by a parameter key.
2. **Light** (GL, 540x675, HDR RGBA16F, additive): one scene program samples the pane (refraction, dispersion) and
   adds ray fields, squiggles, shafts and bursts. Then bloom (5 levels), composite (tonemap, saturation, beat pulse,
   tape-stop saturation, tinted vignette, grain), and present (upscale into the 1080x1350 canvas, about 7 ms).
   At most **one** scene light pass per frame, except at the 59.25 to 59.9 regrab (two passes for 20 frames).
3. **Crisp 2D** at 1080x1350: lead lines, glints, field edges, light-pen contours, faces, hands, the knot, type,
   mono, sparks. Halos go into **one** glow flush.
4. **Finish** (core): watermark, debug overlays.

**No uber-shader.** The core provides GLSL chunks (strings) and a program builder. Each scene program is a short
`main()` built from chunks, compiled once at init and cached by key. Budget: at most 16 programs total.

Core chunks: `COMMON` (hashes, `spec()`, `hue()`, `sdEll`, `sdCap`, `lph`), `PANE` (pane sampling, linear decode),
`LENS` (body ellipse + second lens, per-channel refraction), `HAND_SDF` (fist and open-hand capsule union), `RAYS`
(`hair()` bins, tinted by the pane), `SQUIGGLE` (warped iso-lines, two families, width variation), `DASHES` (inward
or outward flow), `IRIS` (9 blades, twist, aperture, AA edges), `WINDOW` (arch, panes, lead, shafts), `BURST`
(whiteout, shockwave, prism ring, streak, leaks), `CALM` (rect and ellipse masks), `KAL` (kaleidoscope),
`ROSE` (af Klint circles), `ENSO` (bristle brush).

**Core API** (frozen at the end of phase 0; changes go through the core owner):

```js
V2.W, V2.H, V2.FPS                               // 1080, 1350, 30
V2.frame(t)                                      // Math.round(t*30) mod 1800
V2.osc(t, k, ph)                                 // sin(2πk t/60 + ph), k integer
V2.beat(t) -> {i, ph}; V2.bar(t) -> {i, ph}       // 0.75 s and 3.0 s grids
V2.hit(t, t0, decay)                             // 0 before t0, 1-frame attack, exp decay (s)
V2.boil(t, div)                                  // floor(frame/div), div in {2, 4}; frozen when div = 0
V2.tapeWarp(t)                                   // animation time: identity before 17.55; 17.55 + 0.15*(1-(1-u)^3) after, u = (t-17.55)/0.45
V2.line(id) -> {words, word_t, t, end}           // from window.TIMING (lines and choir)
V2.lit(t, id, mode)                              // per-word levels: 'unlit-ignite' | 'prelit-blaze' | 'poster'
V2.PAL[section]                                  // palettes from 2.7
V2.L.pane(bg) -> g; V2.L.program(key, chunks, main); V2.L.render(key, uniforms, comp)
V2.glow(fn); V2.flushGlow(ctx); V2.shade(ctx, rect, hex, a)      // glow queue and caption pane
V2.lightLine(ctx, pts, {core, halo, w, taper, overshoot, boil})
V2.grab.geo(t, x, y, s, o); V2.grab.draw(ctx, geo, mood, face); V2.grab.uniforms(geo)  // uBody, uHand[]
V2.grab.knot(ctx, t, x, y, R, o); .jewel(...); .cloud(...); .orb(...); .wisp(...)
V2.type.neon(ctx, t, spec); V2.type.light(ctx, t, spec); V2.type.mono(ctx, t, text, x, y, o)
V2.fx.burst(t, t0, o) -> uniforms; V2.fx.sparks(ctx, t, t0, x, y, cols); V2.fx.confetti(ctx, t, box)
V2.hook.frame(t, o)       // o: {tight 0..1, close 0..1 (iris), flood 0..1, cam {k, x, y}, caption: 'lit'|'off'|'ignite', pose}
V2.window.draw(t, o)      // o: {mode: 'day'|'night', build 0..1 (pane-by-pane), shafts, floor, moon}
V2.add(t0, t1, name, fn); V2.draw(t)
```

### 5.4 Render cost targets

Measured with `node v2/bench.js` (evaluate + JPEG screenshot, single worker, median of 8 frames per time, on a
quiet machine: no other Chromium running; raw timings swing up to 2x under load).

| Target | Value |
|---|---|
| Mean over the 21 QA stills | **≤ 480 ms per frame** |
| Any single frame | ≤ 800 ms (the 59.25 to 59.9 double pass ≤ 900 ms) |
| Full 1800-frame render, 4 workers | ≤ 20 min (estimate: 1800 × mean × 0.9 for GL-bound frames) |

Budget per frame: capture about 100 ms; pane ≤ 40; GL light pass + bloom + composite ≤ 180; crisp 2D ≤ 150
(including one glow flush of about 50 to 70); total about 470.

Cost rules (all measured in `research_tech.md`):
- GL at 540x675 only. Never upload a full-res canvas (101 ms vs 14 ms at half res).
- Additive instanced lines into RGBA32F, not RGBA16F (2.3x slower).
- No `shadowBlur`; no multipass wide strokes (378 ms for one loop); no single Path2D with thousands of
  overlapping subpaths.
- Never draw the squiggle field in Canvas2D (2.6 to 3.2 s). GL only.
- Cache: the knot shell per jitter seed (bounded LRU), union outlines per pose key, glyph outlines, static panes.
- `LX.radial` only on a 1/4-res mask.
- Compile every program in `init`, before `READY`, so workers that start mid-video are not penalized.
- Drop to 4 bloom levels if a section's mean goes over 520 ms.

### 5.5 Determinism and the seam

`renderFrame(t)` is a pure function of t. Workers start mid-video and frames render in any order.

1. **No state.** No `Math.random`, no `performance.now`, no frame-to-frame accumulation. Randomness is
   `hash(seed)`. Caches are keyed only by deterministic parameters.
2. **Loop-safe time.** Every oscillation completes a whole number of cycles in 60 s: use `V2.osc(t, k)` with
   integer k (beat-locked is 80, bar-locked is 20, 6 s periods are 10, 12 Hz jitter is 720), or `lph(n)` in GLSL.
   Boil seeds come from `floor(frame/div)` with div dividing 1800. Grain is seeded by `frame % 1800`.
3. **Anything visible from 59.25 to 60 must be loop-safe.** The rest scene may use free-running terms only if they
   are fully hidden by 59.9.
4. **The hook rig is one pure function** (`core/hook.js`), used by act 1 for 0 to 6 and (variant `tight`) 15 to
   17.55, and by act 3 for 59.25 to 60. At t = 60 all its blend parameters reach exactly their frame-0 values.
5. **Regrab choreography (act 3 with the core rig):**
   - 59.25: the arm shoots (5-frame smear + trail) and the mitten snaps shut on the wisp.
   - 59.25 to 59.45: the crust forms over the wisp; its jitter goes 0 to 1.
   - 59.30 to 59.57: the rays snap inward (8 frames) and the dashes start.
   - 59.25 to 59.90: the iris closes from the edges (`close` 0 to 1). The blades slide in from beyond the frame,
     carrying the hook ground with them (`flood`), so the rest scene is covered from the outside in.
   - 59.25 to 59.967: the camera eases (ease-in cubic) from the rest framing (him at (330, 1090), s 150) to the
     frame-0 framing (him at (455, 965), s 370); the knot grows to R 111; pearl crossfades to amber; the lead rim
     returns; eyes snap to `> <` at 59.42.
   - 59.85 to 59.967: the V01 tubes ignite. Frame levels: 1796 (59.867) 0.6, 1797 (59.900) 1.0, 1798 (59.933)
     0.35, **1799 (59.967) 1.0**, frame 0 1.0.
   - The watermark is present on both sides.
6. **Seam test** (`v2/check/seam.js`): render 59.867, 59.900, 59.933, 59.967, 0.000, 0.033 and 0.067. Pass if the
   mean absolute difference (8-bit) from 59.967 to 0.000 is at most the median of the other consecutive pairs, and
   at most 6.0. The glass lookdev already measured 3.5 against 4.9 to 6.0.
7. Export exactly 1800 frames (`--start 0 --end 60`). The audio is exactly 60.000 s.

### 5.6 Build plan: core first, then three acts in parallel

**Phase 0: CORE (one builder, first, blocking).** Delivers everything in `visual/v2/core/`, `index.html`,
`core_test.html`, `bench.js` and `check/`, plus **stub scenes for the whole 60 s** (each stub draws its section's
ground and a label) so the page renders end to end from day one. The core owns the **frame-0 poster** (the hook
rig) and the **window**, because both are shared across acts and the seam depends on them.

Phase 0 gate (all required before act builders start):
- `core_test.html` contact sheet: grabbygrab in all 8 states at s 370, 300, 150 and 97; fist, open hand (mid-open
  and full) and mitten at 270 px; knot, cracking, jewel, cloud, orb, wisp; neon, light and mono type in every word
  state; a burst envelope strip; the window in day and night modes; a squiggle field; a ray field.
- Frame 0 rendered for real and passing the 270x338 thumbnail test and the colour test.
- Seam test passing on the stubs (hook rig at 59.967 vs 0.000).
- Bench numbers for the core primitives; the API in 5.3 frozen.

**Phase 1: ACTS (three builders in parallel).**

| Builder | Owns | Must build | Hardest beats |
|---|---|---|---|
| Act 1 | `v2/act1.js` (+ `act1_*.js`) | 0 to 18: hook timeline on the core rig, some guy, ALL, joiner, saint (core window, day), plate, buzz, tape-stop | the plate's light-drawing, ALL's glass letters, the joiner |
| Act 2 | `v2/act2.js` (+ `act2_*.js`) | 18 to 36: look beam, unclench (iris open, crust crack, jewel burst, type unclenching, fly-through), sky, cloud, arrows, reward-hack iris | the jewel burst and the reward-hack iris |
| Act 3 | `v2/act3.js` (+ `act3_*.js`) | 36 to 60: drop, headless, metta, Tilopa, rest (core window, night), regrab on the core rig | the drop impact and the seam |

Rules for act builders:
- Register scenes only inside your window with `V2.add(t0, t1, ...)`. Prefix every global and every GL program key
  with your act (`a1_`, `a2_`, `a3_`).
- Never edit `core/`. Put change requests in `visual/v2/CORE_REQUESTS.md` (who, what, why); the core owner merges
  them and re-freezes.
- Build scene shaders only from core chunks plus your own `main()`.
- Boundary contracts: **18.0** is a hard cut (act 1 ends frozen in the tape-stop; act 2 starts in the dark macro;
  they share only the knot's look through `V2.grab.knot`). **36.0** is covered by the whiteout, and act 2 must end
  exactly on `BOUND.t36` (section 4, end of the reward hack). **0/60** is the core hook rig.
- Each act delivers: stills at its key times, a 360-px phone sheet, a motion strip (10 frames at 0.1 s) around its
  main hit, `bench.js` numbers, and the QA results from 5.7.

Key stills per act:
- Act 1: 0.00, 1.60, 2.40, 4.55, 5.40, 6.20, 7.50, 9.50, 11.20, 12.60, 14.30, 16.60, 17.80.
- Act 2: 18.20, 19.60, 21.80, 22.30, 23.00, 24.40, 26.50, 29.00, 31.95, 33.60, 34.90, 35.70.
- Act 3: 36.00, 36.20, 36.60, 38.70, 40.90, 44.50, 46.50, 47.30, 50.40, 52.60, 55.00, 57.20, 59.40, 59.70, 59.967.
- Motion strips: act 1 at 0.0 to 0.9 and 13.5 to 14.4; act 2 at 22.0 to 22.9 and 35.2 to 36.1; act 3 at 36.0 to
  36.9 and 59.2 to 60.0.

**Phase 2: INTEGRATION (core owner).** Load all three acts, render the full stills sheet at 0.5 s steps, run every
QA gate, fix the boundaries, render the full video, mux the audio, deliver.

### 5.7 QA gates and commands

```bash
cd visual
node render.js --page v2/index.html --stills 0,6.2,9.5,11.2,12.6,14.3,16.6,19.6,22.3,26.5,31.95,34.9,36.6,38.7,40.9,46.5,50.4,52.6,57.2,59.7,59.967 --outdir ../out/v2/stills
node v2/bench.js --times 0,12.5,22.2,26.5,36.6,46.5,57
node v2/check/seam.js
python3 -I v2/check/colour.py ../out/v2/stills       # colourful share per frame
python3 -I v2/check/phone.py ../out/v2/stills        # 360-px sheets + 270x338 thumbnail of frame 0
python3 -I v2/check/edges.py ../out/v2/stills        # edge density at 270 px
python3 -I v2/check/flash.py ../out/v2/video_noaudio.mp4   # flashes per second, from mean luminance
node v2/check/text_lint.js                           # every on-screen string: no em or en dashes
```

| Gate | Pass |
|---|---|
| Colourful share (S ≥ 0.25, V ≥ 0.15, 32x32) | every still ≥ 0.45; 17.55 to 18.6 ≥ 0.20; median ≥ 0.70 |
| Thumbnail | frame 0 at 270x338: the character, the knot and the hook line all read |
| Phone | every caption reads at 360 px wide, including unlit and pre-lit words and "just come back." |
| Beat | every hit in 2.9 peaks within ±1 frame of its time (contact strips at 0.1 s around 0.12, 6.0, 9.0, 22.25, 36.0, 38.6, 59.25) |
| Seam | as 5.5 |
| Flash | ≤ 3 flashes per second anywhere |
| Edge density | ≤ 0.14 everywhere; ≤ 0.10 in metta and rest |
| Local type contrast | ≥ 4.5:1 |
| No pure black ground, no neutral grey | none |
| No em or en dashes on screen | none |
| Render cost | as 5.4 |
| Hockney test (2.8) | every section's key still, judged by eye |

### 5.8 Delivery (and the "no audio" note)

The creator said "I don't hear audio". v1's `out/unclench.mp4` does carry an AAC track, so the likely cause is a
muted player (X autoplays muted). Even so, v2 delivery must prove the audio is there:

```bash
cd visual && node render.js --page v2/index.html --out ../out/v2/video_noaudio.mp4 --start 0 --end 60 --workers 4 --quality 96
cd .. && ffmpeg -y -i out/v2/video_noaudio.mp4 -i out/unclench_audio.wav \
  -c:v libx264 -preset slow -crf 16 -tune animation -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest out/v2/unclench.mp4
ffprobe -v error -show_entries stream=codec_type,codec_name,sample_rate,channels -of compact out/v2/unclench.mp4
```

The ffprobe output must list both a video stream and an audio stream (aac, 48000, 2 channels). Then check that the
audio is not silent (`ffmpeg -i out/v2/unclench.mp4 -af volumedetect -f null -`, mean volume above -30 dB), and
play it once on a phone with the sound on. The post copy should say "sound on" (already in `POSTING.md`).

---

## 6. Must-fix traceability (judges' lists, and where each is solved)

| Must-fix | Solved in |
|---|---|
| Hands: closed mitten reads as beads; open 3-finger "W", "three" or peace sign; grey pill thumb; construction circles showing | 3.1 (fist silhouette with crease, four fingers + thumb in one glass, opening stagger, SDF union, cached outline) |
| Hook type is yellow Anton with an RGB split, plus a brown multiply blob | 2.11 (white-hot neon with a magenta halo, no split), 2.7 (#140C4A pane), 4 hook |
| Chromatic fringing on Fraunces captions | 2.11 (no split on any caption) |
| 26.5 kitsch: bubbles, double rainbow, cloud on a stick, grey rainbow band | 2.5 rule 5, 2.8, 3.3 CLOUD, 4 sky (squiggles + landscape strip) |
| 36.6 overload: ROYGBIV, pastel kaleidoscope, Lisa Frank | 2.7 DROP (Hockney's six, 12 bold facets, one focal sun), 4 drop |
| The drop has no impact | 2.9 (36.0 whiteout + shockwave, 36.75 second shockwave, 38.60 "free." hit), 4 drop |
| Add lines and rays everywhere | 2.1 LIGHT and LINE layers, 2.2, 2.3, 2.4; every beat in 4 names its lines |
| 12.5 window looks like a printed sticker | 4 saint (backlit panes, bloom, floor spill from the window's own light) |
| 22.2 muddy blurred blades in the top third | 4 unclench (crisp supersampled iris, blades out by 22.5, rays carry the energy) |
| Unlit words too dim at 360 px | 2.11 word states (unlit 30% + 3 px outline; pre-lit 0.55 in the open half) |
| Warm body over warm blades | 3.1 item 9 (lead rim + white contour + prism fringe) |
| Unbuilt beats: just-look beam, plate, reward-hack iris, headless, Tilopa, regrab seam | 4 (all specified), 5.5 (seam), 5.6 (owners) |
| 26.5 body is muddy copper (basketball, planet) | 2.7 SKY figure, 3.2 HAPPY (clear glass brighter than the sky) |
| 36.6 fields aliased, pasted rectangle | 4 drop (fan from below the frame, full-res light-line edges) |
| Drop caption sync (choir at 36.0, "free." at 38.6) | 4 drop, 4.1 (C4 "unclench." carries 36.0 to 37.28; "free." has its own hit) |
| Flash safety | 2.10 |
| Composition monotony | 2.12 |
| Hook: dead zone, character too small, synthwave palette | 4 hook (blades fill the frame, him at 40 to 45%), 2.7 HOOK (ultramarine and cadmium) |
| 57 moon reads as a sun | 4 rest (pearl, soft halo, spokes, behind the window) |
| Fine rays shimmer and smear under 4:2:0 | 2.4 RAY (5 canvas px minimum core), 2.4 rule |
| Per-line caption switching; dim lit-share frames | 4.1 schedule, 2.11 pre-lit rule |
| Render cost | 5.4 |
| Rest floor panes don't match the window; generic stars | 2.7 REST, 4 rest (same hues, cast from the moon; no "+" stars) |
| Caption shade blobs (0.0 top, 46.5) | 2.11 caption pane (hue-matched deep colour, feathered, source-over) |
| One big uber-shader | 5.3 (chunks + per-scene programs, at most 16) |
| The "furry" fibre texture (rays 46.5) | 3.1 item 4 (straight, ≤ 25%, never swirled) |
