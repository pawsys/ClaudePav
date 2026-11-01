# UNCLENCH v2: a visual grammar of translucent light (Hockney + light art)

Research for the v2 visual redo. Every rule here is meant to be implementable in our engine (WebGL2 background at 540x675 + Canvas2D 1080x1350, headless SwiftShader). Hex values, blend modes, line weights and measured render costs are included.

Companion files (all under `out/lookdev/research/`):
- `grammar_sheet.png`: the palettes below plus six mark/blend demos rendered in our pipeline.
- `bench_frame.png`, `tools/bench.js`: measured per-technique cost in the real render path.
- `grammar.html`: the demo page (self-contained, `renderFrame(0)` = sheet, `renderFrame(1)` = bench). It has working reference code for `ray()` (tapered additive ray), sprite rays, `tube()` (3-pass neon without shadowBlur), `poolLines()` (Hockney water net via iso-lines), `grabbyLight()` (light-pen character), `glyphWrite()` (letters written with light), and quarter-res bloom.
- `glyphs.js` + `tools/glyphs.js` + `fonts_ttf/` + `lib/opentype.min.js`: build step that turns words into glyph outlines (polylines with lengths), so letters can be drawn stroke by stroke. Re-run with `node out/lookdev/research/tools/glyphs.js` after editing its `jobs` list.

Render the sheet: `cd visual && node render.js --page ../out/lookdev/research/grammar.html --stills 0 --outdir ../out/lookdev/research`.

---

## 0. The principles (short version)

1. **Looking is the subject.** Hockney's creed, "The world is very, very beautiful if you look at it, but most people don't look," is the dharma line "Don't let go. Just look." Color arrives because of attention. Before the look the world is dark and dissonant; after it, the world is drawn in light.
2. **Everything is built from one atom: the ray.** A ray is a tapered, translucent, additive line. Clouds, hands, rain, arrows, the sun, the ensō and even letters are bundles of rays or lines of light. Nothing has a black outline or a grey shadow.
3. **Grasping converges, releasing radiates.** The *direction* of the rays is the state of mind. When he clenches, light is sucked inward to the fist. Looking turns it into one parallel beam. Unclenching makes it burst outward. In the sky it relaxes into wobbly water lines, at the drop it explodes in full spectrum, in metta it curves into petals, in Tilopa it straightens and folds into one beam, and at rest it is a single glow. The regrab snaps it inward again.
4. **Color is tuned like the music.** The buzz-to-drone arc becomes a color arc. Clenched color is a dissonant complementary pair at near-equal luminance, red #FF2A68 against green #1FA352, which visibly vibrates. Released color is analogous with clear luminance steps, which reads as consonant. Joy is the full spectrum. Rest is one hue.
5. **Translucency makes the shapes.** Forms are not drawn as outline plus fill. They appear where 2 to 6 translucent lobes, bands or panes overlap, and the overlaps glow. Use additive light on dark grounds and multiply glass on pastel grounds.
6. **Hockney's water net.** Moving light is drawn as interlocking wobbly lines in white, pale yellow, pink and lilac over flat saturated blue, as in *Peter Getting Out of Nick's Pool*. Generate it in the shader (cheap), never as thousands of Canvas2D strokes (measured at 3 s per frame).
7. **"What colour is the road?" Local color is a choice.** Use complementary flat fields: purple trees, orange road, lime and pink fields, an ultramarine sky. Use one dominant hue per section with a single complementary accent, the way Hockney staged *Tristan*: a blue world with a red accent.
8. **No shadows, only temperature.** Hockney admired Chinese scrolls and the Bayeux Tapestry because they have no shadows. The shaded side of anything is a cooler hue (violet or blue at 20-40% multiply), and the lit side is warmer. Never use grey.
9. **The vanishing point is in you** (reverse perspective). At "you are the sky" the road starts narrow at the viewer's body and widens as it recedes into the head-space. The world opens out from you, which is the visual form of Douglas Harding's headless view.
10. **Drawing at the speed of seeing.** Marks are born by being drawn, like the Brushes stroke playback Hockney exhibited. Each mark takes 3-8 frames, with a 1-frame stagger, and bursts are quantized to 16ths (0.1875 s). Line boil (a new wobble seed every 2 frames) keeps every line hand-made and alive.
11. **Neon is a spice.** Hot 3-pass tubes are used only at about 7 moments (0.0 caption, 0.4/1.6 lightning, 5.25 ring, 9.0 ALL, 22.25 bowl burst, 36.0 drop, 59.85 caption re-ignite). Everything else glows through one shared quarter-res bloom pass.
12. **A cute character made of light.** He keeps the same bean, noodle arm and mitten. He is drawn as one continuous light-pen line (Picasso, 1949) and filled with a 15-25% translucent mood color. His eyes are the thickest, brightest marks on screen. A calm zone with no background texture within 1.3x his radius keeps him readable.
13. **Letters can be written with light.** Hook captions are neon signs: yellow Anton, the viral-caption formula. After the unclench, key words are written as glowing glyph outlines in Fraunces italic and then fill with light. Readability always wins over effect.
14. **Detail lives in luminance, color lives in halos.** X re-encodes at 4:2:0 chroma, so thin saturated lines smear. Every important line needs a white-hot core of at least 3 px, with color carried in the 8-24 px halo. Add 1.5-3% grain to dark gradients to prevent banding.
15. **Homage, not imitation.** Hockney died on 11 June 2026. This video lands five months later in a feed that loves him, so evoke his vocabulary (pool lines, radiating suns, wiggly roads, purple trees) and never copy a composition or use his name or hand on screen.

---

## 1. Context and caveats

- **Hockney died on 11 June 2026, aged 88, at home in London** ([WTOP/AP](https://wtop.com/world/2026/06/david-hockney-an-icon-of-20th-century-art-has-died-at-age-88-his-publicist-says/), [The National](https://www.thenationalnews.com/news/uk/2026/06/12/david-hockney-artist-who-drew-light-into-british-art-has-died/)). Coverage framed him as the artist "who drew light into British art" and remembered him for pools and iPad drawings. In November 2026 a luminous, Hockney-spirited loop will read as a quiet homage, which helps it travel. It is also a reason to stay tasteful: no name on screen, no faked handwriting, no recreated paintings.
- **Network:** this session's proxy blocks direct page fetches from royalacademy.org.uk, artic.edu, en.wikipedia.org, tate.org.uk, christies.com, theguardian.com and olafureliasson.net (403 policy denials). The research therefore relies on web-search results plus well-established art-historical knowledge. Quotes are marked with how well they are verified. The ones we might put on screen ("the world is very, very beautiful...") are widely sourced, but we do not plan to put any on screen.

---

## 2. What Hockney does, and what we take

### 2.1 Pool water as lines (1966-1978)
- *Peter Getting Out of Nick's Pool* (1966) uses "white, yellow, pink and purple squiggles to suggest the movement of the water" over flat blue ([Wikipedia summary](https://en.wikipedia.org/wiki/Peter_Getting_Out_of_Nick%27s_Pool)). *Portrait of an Artist (Pool with Two Figures)* (1972) uses "wavy white lines cutting through the blue and patchwork shadows" ([Wikipedia summary](https://en.wikipedia.org/wiki/Portrait_of_an_Artist_(Pool_with_Two_Figures))).
- *A Bigger Splash* (1967) is flat blocks of color, with the splash alone painted in small brushes and little lines over about two weeks ([analyses](https://artincontext.org/?p=56005)). It is a quiet field plus one explosive line-drawn event.
- On the subject itself (Stangos, *Paper Pools*, 1980, quoted by Christie's): pool water's look is "controllable," its color can be man-made, and "its dancing rhythms reflect the sky and, because of transparency, the depth of the water." Elsewhere: water "can be any colour and it has no set visual description" ([Artlyst](https://artlyst.com/?p=176042), primary unverified).
- *Paper Pools* (1978) were made of dyed paper pulp: translucent dye fields with wavy marks over overlapping darker shapes ([NGA Australia PDF](https://nga.gov.au/media/dd/documents/hockneypaperpools.a3b7979.pdf), [Phillips](https://phillips.com/detail/david-hockney/103556)).

**Take:** the sky in our film is a Hockney pool seen from inside. Flat saturated blue carries an interlocking net of wobbly light lines (white #FFFFFF, pale yellow #FFF3A6, pink #FF9ACB, lilac #C6A3FF). Line weight varies 0.5x to 1.6x along the net, and the net drifts slowly. When an arrow passes through, the lines ripple and heal. That is "the sky doesn't mind" made literal. Keep the field flat and calm, and let the line-drawn events (splash, burst) be the excitement.

### 2.2 The iPad drawings: a luminous medium (2010-2026)
- "The fact that the screen is illuminated makes you choose luminous subjects" (Hockney to Martin Gayford, 2010; [BCS](https://www.bcs.org/content-hub/computer-art-image-of-the-month-february-2012), [Richard Gray press](https://richardgraygallery.com/attachment/en/5761760584184e24248b4568/Press/5761762284184e24248b589f)). On paper you need light; on the iPad you can draw in the dark because it is backlit. He drew the 2020 full moons with the house lights off ([Pace, The Moon Room](https://www.pacegallery.com/exhibitions/david-hockney-the-moon-room/)).
- In watercolor about three layers is the maximum before it gets muddy, but on the screen "anything can go on anything," for example "a bright, bright blue on top of an intense yellow" (same Gayford 2010 piece). **Light colors over dark, saturated over saturated, never mud.**
- *The Arrival of Spring, Normandy, 2020*: 116 drawings made between February and July 2020 in a Brushes app modified to his specifications, with "more brushes, more textures, more colors, more layers" than in 2011 ([RA](https://www.royalacademy.org.uk/article/article-david-hockney-ipad-painting-during-lockdown)). He insisted drawing needs "a certain speed."
- **Stroke playback:** Brushes records every stroke, and Hockney exhibited animations of drawings building up from the first mark. The RA show opened with two animated works, one of rain and one showing how the works are built ([Studio International](https://studiointernational.com/index.php/david-hockney-bigger-and-closer-not-smaller-and-further-away-review-lightroom-london), [Designboom](https://www.designboom.com/art/david-hockney-me-draw-on-ipad/), [Country Life](https://www.countrylife.co.uk/luxury/art-and-antiques/in-focus-how-david-hockney-chronicled-the-first-spring-of-covid-19-with-ipad-art-225741)). The 2023-26 *Bigger & Closer* Lightroom show turned this into wall-scale animation.
- Normandy suns: Hockney drew the sun as a disc with radiating hand-drawn lines. One critic called the lines "more like hairs than majestic rays" (search summary, source unverified). **Lesson:** our rays must taper, have a white-hot base, and vary in length and color, or they read as hairs. Pace's 2021 sunrise iPad prints were framed as symbols of hope ([Pace](https://www.pacegallery.com/exhibitions/david-hockney-ma-normandie/)).
- Mark vocabulary, shared with Van Gogh (*Hockney - Van Gogh: The Joy of Nature*, 2019): dots, dashes, swirls, hatching, flat swathes ([Brooklyn Rail](https://brooklynrail.org/2019/04/artseen/HockneyVan-Gogh-The-Joy-of-Nature/), [MFAH](https://www.mfah.org/art/exhibitions/hockney-van-gogh-joy-of-nature)).

**Take:** our medium is literally a backlit screen, so build every frame as light on a dark or saturated ground. Animate by drawing. Marks appear stroke by stroke on the beat, the way his playback films do. This is also the single best answer to "make it feel like art, not an explainer." Explainers tween shapes; artists lay down marks.

### 2.3 Color: "What colour is the road?"
- The Art Newspaper (2020) ran a piece titled "What colour is the road? David Hockney tells us to take a closer look" ([TAN](https://www.theartnewspaper.com/2020/10/09/what-colour-is-the-road-david-hockney-tells-us-to-take-a-closer-look)). *The Road Across the Wolds* (1997) has a blue road, and the 2017 *Garrowby Hill* is known as "the purple road version" ([Wikipedia summary](https://en.wikipedia.org/wiki/Garrowby_Hill_(painting))). *Nichols Canyon* (1980) has Fauvist, Matisse-like color and "wiggly lines" of road ([Phillips](https://www.phillips.com/article/66763926/david-hockney-martin-gayford-new-york-twentieth-century-and-contemporary-art-auction)). *A Bigger Grand Canyon* (1998) is "almost painfully, and almost comically, intense" in wet-clay golds, sunset reds and desert pinks ([summaries](https://wikiwand.com/en/A_Bigger_Grand_Canyon)).
- "I prefer living in colour" ([Centre Pompidou album](https://editions.centrepompidou.fr/en/exhibition-albums/david-hockney-exhibition-album/1061.html), [Art Shortlist](https://artshortlist.com/en/journal/article/the-10-most-beautiful-quotes-by-david-hockney)).
- Opera: *Tristan und Isolde* (LA Opera 1987) is a blue world in which Isolde's red pops, and red returns "at key moments." He designed lighting from the start, with miniature sets ([LA Opera](https://www.laopera.org/Discover-LA-Opera/Explore/blog/the-fantastical-sets-of-david-hockney), [MyArtBroker](https://www.myartbroker.com/artist-david-hockney/articles/david-hockney-love-affair-with-opera)).

**Take:** commit each section to one dominant ground hue and one complementary accent (section 5). At the joy peak, break the rule completely: a full-spectrum sun over complementary flat fields (purple trees #7A2BD1, orange road #FF7A1A, lime #B6F03C, pink #FF6FB5, green #36C95A, red earth #E8412B) under ultramarine #2233D6.

### 2.4 No shadows
- Hockney loved the Bayeux Tapestry for its panoramic length and "the absence of shadows" ([Spectator review of *Spring Cannot Be Cancelled*](https://spectator.com/article/a-new-blossoming-david-hockney-paints-normandy/)), and repeatedly said Chinese, Japanese, Indian and Persian art never has shadows ([quote compilations](https://www.csmonitor.com/1993/1210/10131.html)).

**Take:** light comes from everywhere. Shade with temperature: the cool side is #3B2A8C to #2B4BFF at 20-40% multiply on light grounds or a lower-alpha violet on dark, and the warm side gets a screen of #FFC9A3 to #FFE29A. There is no grey anywhere in v2. The v1 grey storm is replaced by violet and indigo.

### 2.5 Reverse perspective: the viewer is the vanishing point
- In a 1994 Caltech interview Hockney said that in ordinary perspective the viewer and the infinite can never meet, while reverse perspective lets them connect. A Chinese scroll cannot have a vanishing point, because that would mean the viewer had stopped moving ([Caltech E&S PDF](https://calteches.library.caltech.edu/625/2/Hockney.pdf)). His 2017 reverse-perspective canvases revisit Garrowby Hill, Nichols Canyon and the Grand Canyon on hexagonal supports.

**Take, at the 39 s headless view:** draw the landscape seen "in" the head-space with lines that widen as they recede. The road is narrowest at the bottom edge, at your body, and fans open toward the head-space and sky. Rays also originate at the viewer (bottom-center, just off-frame). The picture says "the world opens out from you," which is Harding's headless experience.

### 2.6 Joiners: many moments in one picture
- The photo-collages (1982-86; *Pearblossom Highway* 1986) layer time, space and narrative. "The camera sees geometrically, but we see psychologically" ([h2g2](https://www.h2g2.com/A449921), [Halcyon](https://www.halcyongallery.com/news/208-david-hockneys-photocollages-five-things-to-know/)).

**Take:** the 3x3 "same cause" grid becomes a joiner of nine translucent light panels. Each is rotated 1-3 degrees and overlaps its neighbors by 6-12 px. Each has a different neon tint at 18% screen, so the overlaps glow, and a thin 2 px white edge. Every panel is a different "moment" of grabbing.

### 2.7 The Weather Series (1973)
- Six lithographs (Rain, Snow, Wind, Mist, Sun, Lightning) inspired by Japanese stylizations of weather. *Sun* lays gold beams of light across a small plant at a table's edge, and *Lightning* turns a storm into a line drawing ([V&A](https://collections.vam.ac.uk/item/O148035), [NGA](https://www.nga.gov/features/the-serial-impulse/david-hockney/hockney_at_gemini.html), [Apollo](https://apollo-magazine.com/hockney-printmaker-dulwich-picture-gallery/)).

**Take:** our storm is stylized weather, not a photographic cloud. Rain is diagonal lavender dashes (#6D5BD0 at 35%), lightning is one neon zigzag line (white core, cyan #48E5FF halo), and mist is translucent violet veils.

### 2.8 The joy of looking
- "The world is very, very beautiful if you look at it, but most people don't look," and "they don't really look at things with an intensity; I do" (Louisiana Channel interview, 2019; [MetaFilter](https://metafilter.com/194454/I-Think-the-World-is-Beautiful-to-Look-At-but-Most-People-Dont-See-It), [Klof](https://klofmag.com/2020/05/david-hockney-offers-optimism-in-interview-the-world-is-beautiful)). "Do remember they can't cancel the spring" (April 2020, written on a daffodil iPad drawing; [RA shop](https://shop.royalacademy.org.uk/reading/bookshop/hockney-220-for-2020)).

**Take:** this is the film's thesis made visual. 18.4 s ("just look") is the moment the light arrives, and 21-24 s is when the color arrives.

---

## 3. Light art that maps to code

| Source | What it does | Our use | How in code |
|---|---|---|---|
| **James Turrell**, Skyspaces / Ganzfelds | A framed aperture onto the sky whose color you perceive through the color of the interior light. Ganzfeld: edgeless color with no objects. "We are not aware that we ourselves give the sky its color" ([Cool Hunting](https://coolhunting.com/culture/james-turrell-see-colour/), [Ekeberg](https://ekebergparken.com/en/node/411)). | The headless head-space at 39 s is a Skyspace aperture. Rest at 54 s is a Ganzfeld. | Fill the aperture with a clean sky gradient and set the surrounding body/frame to the complement (warm around a blue aperture), so simultaneous contrast deepens the blue. Ganzfeld: 2-stop radial gradient, no edges, hue drifting at most 4 degrees over 5 s. |
| **Olafur Eliasson**, *The weather project* (2003), *Beauty* (1993), *Your rainbow panorama* (2011), *The Living Lighthouse* (2023) | Mono-frequency yellow light collapses the world to duotone. A spotlight in mist makes a rainbow that depends on where you stand. Dichroic panes overlap to create "tones not present in their pure forms" ([QAGOMA](https://www.qagoma.qld.gov.au/stories/olafur-eliasson-beauty-1993-gallery-of-modern-art-brisbane), [Archdaily](https://www.archdaily.com/469611/your-rainbow-panorama-olafur-eliasson), [Living Lighthouse](https://olafureliasson.net/artwork/the-living-lighthouse-2023/)) | The LOOK beam is mono-frequency: inside it everything is one warm hue, because attention narrows the spectrum. The unclench restores the spectrum. *Beauty*'s rainbow-in-mist makes the drop's spectral halo. | Inside the beam, multiply the scene by #FFB45C and add #FFE3A3 light. For dichroic panes on light grounds use multiply, on dark grounds use screen. |
| **Picasso and Gjon Mili, light drawings (1949)** | A centaur and other figures drawn in the air with a flashlight, caught by long exposure ([LIFE/Time](https://time.com/3746330/behind-the-picture-picasso-draws-with-light)) | Grabbygrab as one continuous light-pen line. Entrances draw him on, and fast moves leave a long-exposure trail. | `grabbyLight()` in grammar.html. Trail: keep the previous 4-6 arm positions as fading strokes. |
| **Dan Flavin / Keith Sonnier**, neon and fluorescent | Commercial light colors (pink, yellow, blue, green, daylight). Sonnier: single gestural neon lines ([Chinati on Flavin's colors](https://chinati.org/related_reading/pink-yellow-blue-green-other-colors-in-the-work-of-dan-flavin-by-marianne-stockebrand/), [ARTnews](https://www.artnews.com/art-news/news/keith-sonnier-neon-light-sculptor-dead-1202694802)) | Neon accents: the hook captions, the 5.25 ring, ALL, the gold ensō. Real neon "ignites" with a flicker. | `tube()`: 3 passes (18 px at 0.10, 8 px at 0.30, 3 px core at 0.95, all `lighter`). Ignition: alpha 0, 1, 0.35, 1 over 3 frames. |
| **Dichroic glass** | Thin-film interference: color shifts with angle, and overlapping panes make new colors ([Colossal, Chris Wood](https://www.thisiscolossal.com/2022/06/chris-wood-dichroic-glass-installation/)) | "Translucency that creates the shapes": clouds, petals and joiner panels. | Overlap 3-6 translucent lobes and shift the hue of each lobe slowly with t (plus or minus 12 degrees). |
| **Caustics** | Light focused by a wavy surface into a bright net | The same thing as Hockney's pool lines. | GLSL iso-lines of a domain-warped sine field: `smoothstep(w,0.,abs(f))` (grammar.html bench shader, +17-69 ms). Write our own; Shadertoy code defaults to CC BY-NC-SA ([godotshaders note](https://godotshaders.com/shader/water-caustic/)). |
| **Chromatic dispersion / prism** | White light split into bands ([Filament SPECGEN](https://google.github.io/filament/dup/specgen.html)) | Tilopa: the spectrum folds back into one white beam (Newton's recombination). Bursts get rainbow fringes. | Cheap fringe: draw the stroke 3 times in `lighter` at plus or minus 2-4 px along the normal in #FF3B3B / #3DEB7A / #3B8BFF. The prism is just six band rays. |
| **Hilma af Klint**, *The Ten Largest* (1907) | Pastel grounds (blue for childhood, orange for youth, purple for adulthood, ochre for old age). Symmetric spirals, almond (vesica) shapes from overlapping circles, blue and yellow for two principles united ([Guggenheim Bilbao](https://pro.guggenheim-bilbao.eus/en/exhibition/the-ten-largest-1907), [Moderna Museet](https://guide.modernamuseet.se/stockholm/en/collection/hilma-af-klint/alderdomen-grupp-iv/)) | Metta: a symmetric rosette of translucent circles in the chest. The overlaps form vesica petals, which is translucency literally creating the shape. | 6 circles of r=46 at 34 px offsets, `screen` at 0.45 (sheet tile 5). |
| **God rays / radial line fields** | Volumetric shafts | The LOOK beam and the drop sun. | Sprite rays (below), plus one radial gradient core. |

---

## 4. The master rule: ray behavior = state of mind

| Section (t) | Ray direction | Coherence | Length / width | Boil | Color harmony | Blend |
|---|---|---|---|---|---|---|
| Storm / clench 0-17.55 | **Inward** to the fist (converging) | Low, tangled | Short 60-250 px / 2-5 px | 15 fps, amp 1.5 px, rising to 2.5 px 15-17.5 | Dissonant complementary (red vs green at near-equal luminance) inside violet | `lighter` rays; blob `source-over` |
| Tape-stop 17.55-18 | Freeze (warp clock) | n/a | n/a | Stops | Desaturate 40% toward warm grey-violet | n/a |
| Look 18-21 | **Parallel**, one beam from the top (the viewer's eyes) | Total | Beam-long 1350 px / 1-3 px hairlines, 60-120 of them | 7.5 fps | Monochrome warm (Eliasson mono-frequency) | `lighter` |
| Unclench 21-24 | **Outward** burst from the opening palm, one fan per finger (120 ms stagger) | Medium | 120-700 px / 4-14 px | 15 to 7.5 fps | Analogous dawn (lemon, apricot, rose, orchid, sky cyan) | `lighter` |
| Sky 24-36 | Horizontal **wobbly water lines** (the pool net); arrows are single straight rays | Soft | Net lines 2.5-6 px | Net drifts continuously (0.05 cycles/s; loop-safe, see section 10) | Hockney pool: blue ground plus white, yellow, pink, lilac lines | `lighter` |
| Joy drop 36-42.75 | **Radial explosion**, 360 degrees, plus reverse-perspective field lines opening toward the viewer | High, symmetric | 200-900 px / 5-16 px | 15 fps on rays, fields still | Full spectrum over complementary flat fields | `lighter` rays, `source-over` fields |
| Metta 42.75-46.5 | Rays **curve into loops**: petals, spiral, open ensō | Symmetric | Petals r 40-120 | 7.5 fps | Pastel af Klint ground, rose/gold/lilac glass, gold ring | `screen` petals, `lighter` ring |
| Tilopa 46.5-54 | Rays **straighten into 6 parallel spectral bands**, then fold one by one into a single white beam | Increasing | Bands 330-900 px | Slowing: 7.5 fps, 3.75 fps, frozen at 'don't control' (52.5) | Spectrum subtracted toward white | `lighter` |
| Rest 54-59.25 | **One soft glow**, no rays (or 3-5 very faint long ones) | n/a | n/a | Frozen | Monochrome night blue plus pearl | `screen` |
| Regrab 59.25-60 | Snaps **inward** again (8 frames) | Collapses | Shrinks | Jumps to 15 fps | Dissonance returns | as storm |

The audience does not need to know the rule; they feel it. It also gives every scene agent the same lever, which keeps v2 coherent.

---

## 5. Palettes per section (hex)

Each palette is **ground** (what light sits on), **light** (rays/lines), **accent** (at most 1-2 neon), **figure** (grabbygrab's mood), **type**, and **blend**. Forbidden everywhere: neutral grey, pure #000 ground (use #050409 or deeper colored darks), cream flat fills, black outlines.

**STORM / CLENCH (0-17.55) "electric bruise"**
- Ground: radial #1A1035 center to #0B0820 edge.
- Veils (mist): #2A1458, #4B1F7A, #1B2A6B as large ellipses, `screen` at 25-40%, drifting on a 60 s circle.
- Rain: #6D5BD0 diagonal dashes at 35% (Weather Series).
- Lightning (0.40, 1.60, 9.40, 17.00): white core #FFFFFF, halo #48E5FF, plus a frame-wide violet lift #4B1F7A at 30% for 2 frames, decaying over 6 frames.
- Blob (dukkha): tight scribble alternating **#FF2A68 / #1FA352**. These are near-equal relative luminance (0.24 / 0.27), so the edge optically vibrates. Add acid-lime sparks #B8FF2C. Draw it `source-over`: our test showed additive mixes red and green into yellow-white and kills the vibration.
- Figure: amber light-pen #FF7A1A halo, core #FFE2B0, fill #FF7A1A at 20%.
- Type: neon yellow. Fill #FFF7C2, glow #FFE14A / #FFB800 halos.

**ALL (9.0-10.5)** Ground #050409. 'ALL' is a neon yellow sign (outline tubes plus a faint fill). Crack: white #FFFFFF with cyan #48E5FF.

**PLATE 01 (13.5-15) "cyanotype lightbox"** A cyanotype is a photograph made by sunlight, so the specimen plate is a sun-print. Ground #0E2C6E to #163E8C with a paper-grain variation of 3%. Lines #E8F7FF (main), #9FD8FF (secondary, hatching at 30%). Mono labels #E8F7FF. Only color: the blob red #FF2A68. 'GRABBYGRAB' stamps as #FFE14A neon.

**LOOK (18-21) "one wavelength"**
- Ground #040308. Outside the beam: #1A0F1F at most.
- Beam: core #FFE3A3, body #FFB45C, edge #FF6A3D at 15%, motes #FFF4D6.
- Fist: lines #FFD9A0 (inside the beam only; the hand exists only where it is lit).
- Blob in beam: #8F1D3F with the green #1FA352 fringe dimming. Vibration frequency decays toward 0 as the look holds.
- Type: Fraunces italic #FFF4D6, small, warm.

**UNCLENCH (21-24) "dawn burst, first full color"**
- Ground: #0B0820, then #2B1550, then #6B3FA0 over 3 s, then dissolving into the SKY ground.
- Burst rays: #FFE66B, #FF9F43, #FF5FA2, #C77DFF, #6FE3FF, with a #FFF6E6 white core at sources.
- Cloud (the released blob): glass lobes #FFFFFF at 42% and #FFD6EC at 42% (`screen`), underside #CBB8FF at 35%.
- Figure: rose halo #FF8FC0, white core, peach fill #FFC9A3.
- Type: #FFF6E6 with #FF8FC0 halo (glyph light-writing).

**SKY (24-36) "Hockney pool sky"**
- Ground: #0F5FC4 (top), #1E9BE6 (60%), #63D2F0 (bottom).
- Water/air lines: #FFFFFF, #FFF3A6, #FF9ACB, #C6A3FF.
- Clouds: white lobes with #FFC9E3 rims and #C6A3FF undersides.
- Arrows: coral #FF6B57 with white core. No impact; instead a 6-ray spark in the celesta color: D6 #FFF3A6, F#6 #FF9ACB, A6 #FFFFFF, E6 #A6FFE9.
- Figure: white core, cyan halo #7FD8FF, peach fill #FFC9A3.
- Type: #FFFFFF on a dark-glass ellipse #0A3F8F at 35% `multiply` (no box, no drop shadow).

**JOY DROP (36-42.75) "Grand Canyon x Normandy"**
- Ground: ultramarine #2233D6, edges #5B2BD9.
- Sun: core #FFFFFF, disc #FFE600. Rays cycle #FFE600, #FF8A00, #FF3D9A, #B6FF3B, #3DE7FF, #FFFFFF.
- Fields (headless world, 39-42.75): trees #7A2BD1, road #FF7A1A, fields #36C95A / #B6F03C / #FF6FB5, earth #E8412B, field shadows #2B4BFF.
- Headless figure: #1E1458 at 85-92% (dark glass you can just see the world through).
- Accents: hot pink #FF2E97, cyan #22E4FF, lime #A8FF2E.
- Type: 'free' as a neon pink #FF3D9A tube with white core.

**METTA (42.75-46.5) "af Klint tenderness"**
- Ground (sky in head-space): #F2B8D8 to #F6A68D.
- Body: #1E1458.
- Petals (`screen` on the body): #FF8FB1, #FFC94D, #B9A3FF, #FF9E7A, #9FF2D0, each at about 45%. They open on the music-box notes at 42.75 (B4 D5 F#5 D5 B4).
- Ensō: gold tube #FFC23D, core #FFF3C4, **open** (about a 25-degree gap). It rhymes with the closed 5.25 ring.
- Figure: rose #FF8FB1 halo, with a small gold heart spark #FFC94D.
- Type: #FFF3C4 over the body, or #1E1458 over the pastel sky.

**TILOPA (46.5-54) "the spectrum folds home"**
- Ground #2A1F5C to #14123A.
- Bands: #FF3B3B, #FF9A1F, #FFE53B, #3DEB7A, #3B8BFF, #9B5BFF.
- Beam #FFFFFF, getting wider as bands fold in.
- Type: #F4EFD8.

**REST (54-59.25) "Moon Room / Ganzfeld"**
- Ground #0E1838 to #1B2A5C, field glow #2E3F7A.
- Light: pearl #F4EFD8, halo #9FB4FF.
- Optional moon-shadow grass dashes #2C5C6B at 30%.
- Figure: pearl outline, eyes closed.
- Type: pearl #F4EFD8 with blue halo.
- This is chosen over a pale Ganzfeld because a dark rest keeps luminance continuity into the regrab and frame 0. Hockney's 2020 *Moon Room* drawings sanction a luminous night.

**REGRAB (59.25-60)** Arm: amber ray #FFB23F. The pearl turns into the blob (#FF2A68/#1FA352). Veils #4B1F7A flood in from the edges. The caption re-ignites in #FFE14A.

All of these are swatched in `out/lookdev/research/grammar_sheet.png`.

**The color arc in one line:** dissonant complementary, then monochrome, then analogous dawn, then Hockney blue plus tinted lines, then full spectrum plus complementary fields, then pastel and gold, then spectrum subtracting to white, then monochrome night, then dissonance again. This mirrors the audio exactly (buzz, then exposed buzz, then drone glide, then sky drone, then full band, then lullaby, then layer subtraction, then tanpura and bowl, then detune).

---

## 6. Mark-making rules

### 6.1 Vocabulary (the only 8 marks in the film)
1. **RAY**: tapered wedge, base 4-14 px to 0, length 60-900 px, gradient from alpha 0.35-0.8 at the base to 0 at the tip, white-hot base for sources. Draw it as a sprite (section 9).
2. **POOL LINE**: wobbly iso-line, 2.5-6 px, weight varying along its length, in 2 interlocking families (white/yellow and pink/lilac). Shader only.
3. **DASH / DOT**: 8-20 px dashes along a flow field and 3-8 px dots (Van Gogh/Hockney stipple). Used for rain, grass, motes and the drop's confetti of light.
4. **SWATHE / GLASS LOBE**: broad translucent ellipse or band, 40-300 px, 18-45% alpha. Overlaps create the form.
5. **SCRIBBLE**: tight looping zigzag. **Reserved for the blob and the 5.25 ring only.** It is the mark of clenching.
6. **NEON TUBE**: 3-pass glow line, at most about 12 hero paths per frame.
7. **SPARK**: 4-6 short rays from a point, born in 2 frames and gone in 8. Used for celesta, piti and impacts that do not happen.
8. **LIGHT-PEN CONTOUR**: the character line (section 7).

### 6.2 Line weights at 1080x1350
On a phone the feed shows this at about 0.35x, so a 3 px line becomes about 1 pt.
- Decorative hairline: 2 px, static or slow only.
- Detail (pool lines, hatching, dashes, beam hairlines): 3-4 px.
- Contour (character, hand, key objects): core 6-8 px plus bloom.
- Accent tube: core 4-6 px, halos 9-12 px and 18-24 px.
- Rays: base 4-16 px.
- Never let an important line drop below 3 px of luminance core.

### 6.3 Translucency and blend
- **Dark ground** (luminance under 0.15): `lighter` for rays, lines and tubes; `screen` for lobes and swathes (screen cannot clip as harshly).
- **Pastel or saturated-light ground** (metta, the sky's lower half): colored glass in `multiply`, highlights in `screen`. `lighter` washes out on light grounds.
- **Complementary vibration**: `source-over` (opaque), or the vibration turns into yellow.
- **White is earned.** Plan at most 3 additive overlaps before white. Reserve white for sources (sun, beam core, palm burst, eyes, the sky in the head-space).
- **Bloom ties it together.** Draw cores crisp, then add one quarter-res blur of the whole 2D canvas back with `lighter` at 0.5-0.8 (section 9). This is what makes it look like light rather than vector art.
- **No grey shading** (2.4). Shadow is a cool hue; light is a warm hue.
- **Grain**: 1.5-3% luminance grain on dark gradients (anti-banding after X re-encode). It does not need to be stronger: the line boil supplies the hand-made texture.

### 6.4 Density and the calm zone
- Busy fields (pool net, dash fields, ray fans) must thin to near 0 within 1.3x the radius of the character, and within the caption box plus 40 px. Measured lesson: in our sheet's SKY tile the light-pen character disappeared into an uncalmed pool net until a radial calm zone was added.
- Composition: 1 event at a time. Like *A Bigger Splash*, a calm flat field plus one line-drawn event beats texture everywhere.

### 6.5 Motion: drawing in time (80 BPM)
- One beat is 0.75 s (22.5 frames), an 8th is 0.375 s (11.25 frames), a 16th is 0.1875 s (5.625 frames; alternate 5 and 6 frames).
- **Birth by drawing:** marks reveal along their length (dash or length budget, as in `glyphWrite()`) over 3-8 frames (ease-out-expo), with a 1-frame stagger between marks. Bursts start exactly on the musical event.
- **Decay:** additive alpha decays exponentially over 20-40 frames. Nothing pops out except in the clenched half, which keeps hard cuts and punch-ins.
- **Boil:** re-seed wobble noise from `floor(frame/2)` (15 fps) when tense, `floor(frame/4)` (7.5 fps) when calm, frozen at rest. 1800 is divisible by 2 and 4, so the boil loops perfectly.
- **Photosensitivity** (X audiences, viral reach): no more than 3 full-frame luminance flashes per second (each lightning is 1 flash with a 6-frame decay, fine). Never strobe saturated red at large area. The blob's red/green vibration is a hue alternation at equal luminance, kept under 10% of frame area, and alternates at most every 2 frames.

---

## 7. A character made of light that stays cute and readable

- **Identity unchanged:** the same bean, one noodle arm, mitten and eye states as v1, so the joke and the continuity survive. Only the material changes, from cream fill and ink outline to light.
- **One continuous light-pen contour** (Picasso/Mili): core 6-8 px at hero size (about 330 px wide), white-ish core, mood-colored halo from bloom plus a 9-12 px halo pass.
- **Translucent body:** an interior swathe of mood color at 15-25% (`screen` on dark, `multiply` on pastel). He reads as a solid shape against anything, and when he overlaps light (the cloud, the orb) the overlap glows. That is "translucency that creates the shape" applied to him.
- **Eyes are king:** the thickest, brightest marks on screen (at least 3% of body width, so 10 px at 330 px), pure white core, no halo color. Expressions keep the v1 shapes: '> <' squeeze, '^ ^' content, dots, closed arcs, one-eye-open, worried. A sweat drop is a cyan #48E5FF tear of light.
- **Emotion through the line itself:** tension means faster boil (15 fps), wobble amplitude 2-2.5 px, tighter curvature at the mitten, warm amber. Ease means slow boil, 0.8 px amplitude, rounder line, cooler and whiter. At rest the line is frozen and pearl.
- **The arm is a ray.** When he grabs, the arm line shoots out (5-frame smear, long-exposure trail of 4-6 fading copies), and light converges to the mitten. When he releases, the mitten opens and the line radiates.
- **Mood colors:** clench #FF7A1A / #FFE2B0; look #FFB45C; unclench #FF8FC0 + white; sky #7FD8FF halo, white core, #FFC9A3 fill; drop white plus #FFE600 halo; metta #FF8FB1 plus gold heart spark #FFC94D; rest #F4EFD8 with #9FB4FF halo; regrab amber.
- **Size floors:** at least 120 px body width with a core of at least 4 px (joiner grid); never below 90 px. The hero size for the hook (frame 0) is about 330 px.
- **Calm zone** always (6.4). He must be the clearest thing in his part of the frame.
- **Do not** give him glossy 3D shading, a gradient body, a black outline or particles inside his body (it reads as "VFX blob", not as a character).

The macro fist (18-24 s) uses the same rules. Each finger is a translucent capsule, and the capsules overlap at the knuckles, so the knuckles glow. White-knuckle tension is drawn as short bright hatch rays at the joints. When the fingers open, each releases its own fan of rays.

---

## 8. Typography

Available locally: Anton, Bebas Neue, Archivo 100-900 (+italics), Fraunces 100-900 (+italics), Instrument Serif, Cormorant Garamond, Newsreader, EB Garamond, Playfair Display, DM Serif Display, Young Serif, Instrument Sans, Space Grotesk, Caveat, JetBrains Mono. Only a subset is registered in `engine.js` FONTS; add new weights there or load them per page.

- **Clenched half (0-18): Anton caps as neon signs.** This keeps the bold-yellow-condensed-caption formula of the viral Opus videos (Bright Mirror's) and v1's continuity, but makes it light. Recipe (`neonText()`): `strokeText` at 22 px width, #FFB800 at 0.10; `strokeText` at 9 px width at 0.28; then fill #FFF7C2. Words ignite in sync with timing.js using the neon flicker (0, 1, 0.35, 1 over 3 frames). Hook cap height at least 96 px.
- **'ALL'** (9.0): Anton at about 600 px as an outline-tube sign (stroke the glyph outlines as tubes plus a 25% fill), which is more beautiful than a flat fill. It could use `glyphWrite` with an Anton outline, generated like the THAT ONE sample in glyphs.js.
- **Open half (21+): Fraunces italic 400.** It is soft and slightly wonky, it feels hand-made, and its hairlines survive compression better than Instrument Serif's at caption sizes. Key words are **written with light**: their glyph outlines are drawn stroke by stroke (`glyphWrite()`, data from `glyphs.js`), then the letter **fills with light** 4-6 frames after its outline closes, so readability is not sacrificed. Sample words already generated: 'unclench.', 'you are the sky', 'free', 'rest.', and Anton 'THAT ONE.'. Instrument Serif italic is fine at 70 px and above.
- **Field-guide labels:** JetBrains Mono 500, at least 24 px, light #E8F7FF (on cyanotype) or #FFF4D6 (in the beam). They read as instrument readouts made of light.
- **Avoid:** Caveat (generic and cute, fights the art direction), faking Hockney's handwriting, and outline-only text for full sentences.
- **Readability rules:** captions stay in the top third (y 170-560) as in v1. Local contrast of at least 4.5:1. On bright fields use a dark-glass ellipse in the field's deep complement at 30-45% `multiply` behind the words. Caption areas are calm zones. Minimum cap height is 48 px in the open half and 80 px in the hook. No em dashes on screen.
- **The type unclenches** (v1 idea, kept): neon Anton 'UNCLENCH', then the letters drift apart and the tubes go out one by one, then the same word re-writes itself as Fraunces light outline 'unclench.' and fills.

---

## 9. Implementation recipes and measured costs

Measured in this sandbox with the real path (renderFrame plus a JPEG screenshot, median of 4, minus a clear-only baseline of about 100-136 ms; `tools/bench.js`). Numbers vary plus or minus 40 ms between runs.

| Technique | Added cost | Verdict |
|---|---|---|
| 400 rays, per-ray `createLinearGradient` | +164 to +193 ms | OK for at most 150 rays |
| **400 rays as pre-rendered sprites** (one 256x16 tapered gradient per color, `setTransform` + `drawImage`) | **+69 ms** | **Use this** |
| 100 neon tubes, 3-pass, per path | +176 ms | Hero paths only |
| 100 neon tubes, 3-pass, batched into one Path2D per pass | +149 ms | Cost is stroke *area*, so keep wide passes rare |
| `shadowBlur` on 100 short strokes | +186 to +232 ms | **Avoid** |
| **Quarter-res bloom** (drawImage to 270x338, `filter='blur(6px)'`, draw back `lighter` at 0.6) | **+0 to +28 ms** | **Use on every frame** |
| Full-res blur 12 px | +60 to +121 ms | Avoid |
| Pool-line net in Canvas2D (13.5k segments), even batched | **+2.6 to +3.2 s** | **Never** |
| **Pool-line net in GLSL at 540x675**, upscaled | **+17 to +69 ms** | **Use this** |
| Glyph-outline light writing ('unclench.', 3 passes) | +130 to +205 ms | 1-2 words at a time; fill plus bloom for longer lines |

Frame budget proposal: GL background (ground gradient, veils, pool net, beam) at most 150 ms; 2D marks (sprite rays, character, captions, a few tubes) at most 250 ms; bloom about 30 ms; screenshot about 100 ms. That totals about 0.5 s per frame per worker, well inside the 1.2 s cap.

Recipes (working code in `grammar.html`):
- **Sprite ray:** `ctx.setTransform(cos*L/256, sin*L/256, -sin*w/16, cos*w/16, x, y); ctx.globalAlpha=a; ctx.drawImage(sprite[col], 0, -8)`. Reset the transform afterward.
- **Hockney net shader:** `q += .35*vec2(sin(q.y*1.7+t), sin(q.x*1.9-.8*t)); q += .2*vec2(sin(q.y*3.1-1.3*t), sin(q.x*2.7+t)); f = sin(2q.x)+sin(2.6q.y+sin(1.4q.x)); line = smoothstep(.11,0.,abs(f))`. Add a second field at `q*1.13 + offset` for the pink/lilac family. Vary width with low-frequency noise. Use loop-safe `t` (section 10).
- **Bloom:** one shared offscreen 270x338 canvas, reused every frame.
- **Chromatic fringe:** redraw a stroke 3 times with `lighter` in R/G/B tints, offset by plus or minus 2-4 px along the normal.
- **Light-writing:** `glyphWrite(key, x, y, scale, progress, haloColor, coreColor, coreWidth)`, with progress 0-1 mapped to timing.js word onsets.
- **Calm zone:** after drawing a texture field, paint a radial gradient of the local ground color (alpha 1 at 0.55R to 0 at R) at the character and caption centers. Better still, multiply the net by a mask uniform in the shader.

---

## 10. Loop and seam notes

- Every continuous oscillation must complete a whole number of cycles in 60 s: `f = n/60` Hz. The 0.3 Hz tanpura shimmer is 18 cycles; the 11 Hz buzz jitter is 660; beat-locked motion at 80/60 Hz is 80; the 60 s veil-drift circle is 1. Drive the pool net with `t_loop = 2*PI*t/60` inside sin/cos, or with integer multiples of it.
- Boil seeds come from `floor(frame/k)` with k dividing 1800.
- **Seam device:** frame 0 shows the neon caption fully lit, the storm veils, and the squeezing light-pen grabby with the vibrating blob. So at 59.25 the arm ray shoots out and grabs the pearl light (rays converge inward), the pearl becomes the red/green scribble, violet veils flood in from the edges, and at 59.85-59.97 the caption tubes ignite with the neon flicker so they are steady at 0.000. Real neon ignites like that, so the seam reads as a natural event.
- Muted-autoplay hook (first 2 s): frame 0 must already be the most striking frame. It has a lit neon caption, saturated violet, a vibrating complementary blob and a glowing character, with the 0.40 s lightning as a second hook.

---

## 11. Shot notes in this grammar (summary for the scene agents)

- **0-6 hook:** violet storm veils, Weather-Series rain dashes, neon Anton captions igniting word by word, light-pen grabby squeezing the red/green scribble blob with lime sparks, and inward-converging rays. 3.75: the thought bubble is a cyan-white light outline holding the word 'later'. 4.50: he grabs it, the arm ray smears with a long-exposure trail, and the bubble's light is sucked into the blob. 5.25: freeze; 'THAT ONE.' written in light (Anton outline); a **closed** neon yellow ring scribbles twice around the blob.
- **6-9 some guy:** a whip-smear made of streaked rays. A line-art meditator drawn in a single cool-white light line under a five-stroke bodhi tree whose leaves are dashes. Captions are neon.
- **9-10.5 ALL:** a black-violet void, the 'ALL' neon sign, and a cyan-white crack.
- **10.5-12 same cause:** a 3x3 joiner of tinted light panels, each with a tiny light grabby clutching a different-colored knot. The jhanas cell holds a gold orb that turns grey-violet when squeezed.
- **12-15 plate:** cyanotype sun-print plate with white line drawing and mono readouts, plus a neon 'GRABBYGRAB' stamp per syllable.
- **15-18 buzz:** converging rays tighten, boil speeds up, the blob scribble densifies, and thought fragments float as small mono light labels at three depths. 17.55: the tape-stop freezes the rays mid-flight and desaturates them.
- **18-21 look:** a mono-frequency warm beam of 60-120 hairline rays from the top edge (the viewer's eyes) with motes. The fist exists only where the light is. The vibration slows.
- **21-24 unclench:** five finger fans (120 ms stagger), the bowl burst at 22.25, the scribble untangling into glass lobes (the cloud), the beam widening into the whole sky, and the type unclenching into light-written 'unclench.'.
- **24-30 sky:** Hockney pool-sky net, glass clouds, and 'you are the sky' written in light with 'sky' widening. 27.0: the brush kit enters and the net's drift picks up slightly.
- **30-36 arrows:** coral ray-arrows pass through the cloud, the net ripples and heals, and celesta sparks appear where impacts would be. 34.5: a volley of rays and a cascade of sparks. 35.6: the gold orb drifts into the open palm.
- **36-39 drop:** the palm becomes the sun, with a full-spectrum radial ray explosion, 'free' as a neon pink tube, and light confetti dashes on 16ths.
- **39-42.75 headless:** a dark-glass seated figure. The head-space is a Turrell aperture onto the brightest sky, with a reverse-perspective Hockney landscape (purple trees, orange road widening away from you, lime and pink fields) and rays rising from the viewer.
- **42.75-46.5 metta:** af Klint glass rosette in the chest opening on music-box notes, an open gold ensō drawn as a tube, and rose grabby.
- **46.5-54 Tilopa:** the rosette's rays straighten into six bands. Each instruction folds one band into the white beam **and removes one mark type**: recall removes labels and text; imagine removes glass lobes; think removes dashes, dots and motes; examine removes the pool net; control freezes motion and dissolves the silhouette; rest folds the last band into one soft light.
- **54-59.25 rest:** Moon Room night blue with a pearl glow. Grabby is a pearl outline with closed eyes. Captions are written in pearl light.
- **59.25-60 regrab:** see section 10.

---

## 12. Sources

Hockney:
- [AP via WTOP: Hockney dies at 88](https://wtop.com/world/2026/06/david-hockney-an-icon-of-20th-century-art-has-died-at-age-88-his-publicist-says/); [The National](https://www.thenationalnews.com/news/uk/2026/06/12/david-hockney-artist-who-drew-light-into-british-art-has-died/)
- [Peter Getting Out of Nick's Pool](https://en.wikipedia.org/wiki/Peter_Getting_Out_of_Nick%27s_Pool); [Portrait of an Artist](https://en.wikipedia.org/wiki/Portrait_of_an_Artist_(Pool_with_Two_Figures)); [A Bigger Splash analysis](https://artincontext.org/?p=56005); [Artlyst on The Splash](https://artlyst.com/?p=176042)
- [NGA Australia: Paper Pools PDF](https://nga.gov.au/media/dd/documents/hockneypaperpools.a3b7979.pdf); [Phillips: Paper Pools](https://phillips.com/detail/david-hockney/103556)
- [RA: "I love drawing"](https://www.royalacademy.org.uk/article/article-david-hockney-ipad-painting-during-lockdown); [BCS: iPad image of the month](https://www.bcs.org/content-hub/computer-art-image-of-the-month-february-2012); [Richard Gray: Gayford 2010](https://richardgraygallery.com/attachment/en/5761760584184e24248b4568/Press/5761762284184e24248b589f); [Country Life](https://www.countrylife.co.uk/luxury/art-and-antiques/in-focus-how-david-hockney-chronicled-the-first-spring-of-covid-19-with-ipad-art-225741)
- [Studio International: Bigger & Closer](https://studiointernational.com/index.php/david-hockney-bigger-and-closer-not-smaller-and-further-away-review-lightroom-london); [Designboom: me draw on iPad](https://www.designboom.com/art/david-hockney-me-draw-on-ipad/)
- [Pace: The Moon Room](https://www.pacegallery.com/exhibitions/david-hockney-the-moon-room/); [Pace: Ma Normandie](https://www.pacegallery.com/exhibitions/david-hockney-ma-normandie/); [Spectator: A new blossoming](https://spectator.com/article/a-new-blossoming-david-hockney-paints-normandy/)
- [The Art Newspaper: What colour is the road?](https://www.theartnewspaper.com/2020/10/09/what-colour-is-the-road-david-hockney-tells-us-to-take-a-closer-look); [Garrowby Hill](https://en.wikipedia.org/wiki/Garrowby_Hill_(painting)); [Phillips: Wiggly Lanes](https://www.phillips.com/article/66763926/david-hockney-martin-gayford-new-york-twentieth-century-and-contemporary-art-auction); [A Bigger Grand Canyon](https://wikiwand.com/en/A_Bigger_Grand_Canyon)
- [Caltech E&S interview 1994 (reverse perspective)](https://calteches.library.caltech.edu/625/2/Hockney.pdf); [Artnet on perspective](https://news.artnet.com/art-world/david-hockney-on-virtual-reality-photography-and-the-imperialism-of-european-perspective-1154810)
- [h2g2: Photocollage](https://www.h2g2.com/A449921); [Halcyon: Photocollages](https://www.halcyongallery.com/news/208-david-hockneys-photocollages-five-things-to-know/)
- [V&A: Weather Series Sun](https://collections.vam.ac.uk/item/O148035); [NGA: Hockney at Gemini](https://www.nga.gov/features/the-serial-impulse/david-hockney/hockney_at_gemini.html)
- [LA Opera: the fantastical sets](https://www.laopera.org/Discover-LA-Opera/Explore/blog/the-fantastical-sets-of-david-hockney); [MyArtBroker: Hockney and opera](https://www.myartbroker.com/artist-david-hockney/articles/david-hockney-love-affair-with-opera)
- [Brooklyn Rail: Hockney - Van Gogh](https://brooklynrail.org/2019/04/artseen/HockneyVan-Gogh-The-Joy-of-Nature/); [MFAH](https://www.mfah.org/art/exhibitions/hockney-van-gogh-joy-of-nature)
- [MetaFilter: the world is beautiful](https://metafilter.com/194454/I-Think-the-World-is-Beautiful-to-Look-At-but-Most-People-Dont-See-It); [Klof](https://klofmag.com/2020/05/david-hockney-offers-optimism-in-interview-the-world-is-beautiful); [Centre Pompidou album](https://editions.centrepompidou.fr/en/exhibition-albums/david-hockney-exhibition-album/1061.html)

Light art and technique:
- [Cool Hunting: Turrell, See Colour](https://coolhunting.com/culture/james-turrell-see-colour/); [Ekeberg Skyspace](https://ekebergparken.com/en/node/411)
- [QAGOMA: Eliasson, Beauty](https://www.qagoma.qld.gov.au/stories/olafur-eliasson-beauty-1993-gallery-of-modern-art-brisbane); [Archdaily: Your rainbow panorama](https://www.archdaily.com/469611/your-rainbow-panorama-olafur-eliasson); [The Living Lighthouse](https://olafureliasson.net/artwork/the-living-lighthouse-2023/)
- [Time/LIFE: Picasso draws with light](https://time.com/3746330/behind-the-picture-picasso-draws-with-light)
- [Chinati: Flavin's colors](https://chinati.org/related_reading/pink-yellow-blue-green-other-colors-in-the-work-of-dan-flavin-by-marianne-stockebrand/); [ARTnews: Sonnier](https://www.artnews.com/art-news/news/keith-sonnier-neon-light-sculptor-dead-1202694802)
- [Colossal: Chris Wood dichroic glass](https://www.thisiscolossal.com/2022/06/chris-wood-dichroic-glass-installation/)
- [Guggenheim Bilbao: The Ten Largest](https://pro.guggenheim-bilbao.eus/en/exhibition/the-ten-largest-1907); [Moderna Museet guide](https://guide.modernamuseet.se/stockholm/en/collection/hilma-af-klint/alderdomen-grupp-iv/)
- [godotshaders: water caustic (license note)](https://godotshaders.com/shader/water-caustic/); [Filament SPECGEN (dispersion)](https://google.github.io/filament/dup/specgen.html)
