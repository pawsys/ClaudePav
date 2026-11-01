# Why the Opus 5.5 music videos went viral, and what UNCLENCH v2 should copy

Research for the v2 visual redo. Date: 2026-11-01. Author: research agent (viral).

## How this was researched (and what could not be reached)

- WebSearch (standard and extended) for X posts, write-ups, YouTube listings and coverage.
- WebFetch was blocked for this session's network (`www.besthub.dev`, `www.lesswrong.com` failed DNS), so I stopped using it. X posts can't be fetched directly anyway. To read those pages in full, those hosts would have to be allowed in the session's network settings.
- Primary data came from public GitHub repos, cloned read-only:
  - `JohnHeibel/PDoomVideo`: the full source, storyboard and Opus-written style guide for the "I'm Upping My P(doom)" video. https://github.com/JohnHeibel/PDoomVideo
  - `zhuyansen/awesome-opus-5.5-video`: 2,401 Claude 5.5 videos posted on X, each with views, likes and bookmarks from a 2026-10-26 snapshot. This is the source for every number in "The wave in numbers". https://github.com/zhuyansen/awesome-opus-5.5-video
  - `athemeroy/awesome-opus-5-5-videos`: a research corpus with a color study of 1,119 files. https://github.com/athemeroy/awesome-opus-5-5-videos
  - The `kju4q` motion-design gist: https://gist.github.com/kju4q/ece36e7c7570522c25876f82f0df87bc
- Caveat: view counts in aggregators differ by up to 2x. Treat every number as approximate. Search summaries confirmed the anime Claude in Bright Mirror's video but not the balance scale or the yellow captions; those details come from the project brief (v1 research).

---

## TL;DR: the 12 rules for v2

1. **Win on art, not on "AI made this".** The novelty is dying fast. Median views per Claude video post fell from 46k in launch week (Sep 22) to about 20k by late October. Posts with 1M+ views went from 23 in week 0 to 0 in week 5. Bright Mirror's own format decayed from 904k to 300k to 42k to 13k across four posts. "Made with Claude Opus 5.5" is now a tag, not a reason to watch.
2. **Keep the character as the emotional anchor and make it glow.** Every big music video had a face: Clawd, the anime Claude singer, the Researcher. Pure calm or abstract generative pieces peak around 20k to 64k views, against 300k to 4M for character music videos. Grabbygrab stays, but he is drawn in light.
3. **Color area matters.** In the corpus, music videos have a median colorful-pixel share of 45.5% (ads: 17.6%). v1 measures 29% median with the same metric, and 0% to 15% through most of the hook act (grey storm). v2 target: a median of at least 45% across the video, and at least 35% in every frame from 0 to 6 s.
4. **Something happens every 1.5 to 3 s, and hits land on beats.** The P(doom) guide: "Rule for every shot: something *happens* on screen", shots of 1.4 to 4 s, "Put the important action within a shot on beat times." Our grid is 80 BPM: beat 0.75 s, bar 3.0 s.
5. **Bursts of color are earned by restraint.** Use one small luminance pulse per beat. Full neon bursts happen only at 5 or 6 structural moments (6.0, 18.0, 36.0 drop, 42.75, 59.25 regrab into the loop). Before each burst, pull saturation down (the 17.55 tape-stop is the natural near-monochrome valley).
6. **Shapes made of translucent light.** Build shapes from overlapping additive layers: rays, ribbons and line bundles. Where the layers overlap, the form appears. Outlines are luminous lines, not ink. This is the creator's direction, and it is also what nobody in the wave is doing: the wave's defaults are watercolor and paper, flat cartoon, kinetic yellow type, anime and 3D.
7. **Hockney grammar.** Use fearless complementary color (ultramarine against cadmium orange, magenta against viridian), and make shadows colored, never grey. Use pool-light caustic line networks. Show drawings being drawn stroke by stroke, the way his iPad works were exhibited. Use dawn as the master light. For "you are the sky", use his reverse perspective: the viewer is the vanishing point.
8. **The first 2 s must be a light event plus the hook, muted.** X autoplays muted, so color and motion must carry the opening. Frame 0 is also the poster: it needs the glowing grabbygrab big (30 to 40% of frame height) and "YOU'RE CLENCHING SOMETHING RIGHT NOW" readable at thumbnail size.
9. **Keep it text-light where pictures can tell it.** The P(doom) storyboard says: "A text-heavy frame looks worse, so when in doubt, leave the text out." Keep the word-synced captions (hard constraint), but make the type part of the light (glow, drawn-on strokes). Cut on-screen labels that repeat the lyric.
10. **Make the loop invisible.** The 59.25 regrab must land in the exact color and light state of frame 0. Loops make rewatching free, and watch time is weighted heavily in X's 2026 ranking.
11. **In-group language is the share engine. We already have it.** P(doom), shoggoth and RLHF made AI Twitter feel seen. Jhana, sunshinification, "the reward hack", metta, Tilopa and headless do the same for meditation TPOT. "The reward hack" is the bridge phrase between AI TPOT and dharma TPOT. Give it a visual moment.
12. **Frame the post like the hits did.** Put "Made with Claude Opus 5.5" in the first line. Add a share instruction aimed at a person ("send this to your doomer friend" was Bright Mirror's). Then post a process reply with the prompt or source (bookmarks are weighted about 10x likes; the Claude Pop remake had more bookmarks than likes after the author posted the full prompt). Quote-tweet Harry directly.

---

## 1. The wave in numbers

The source is `cases.json` from zhuyansen/awesome-opus-5.5-video: 2,401 X posts, each with at least 5,000 views, snapshot 2026-10-26.

**Top music and music-adjacent posts:**

| Views | Likes | Bookmarks | Length | Creator | Work |
|---:|---:|---:|---:|---|---|
| 20.2M | 16.5k | 13.9k | 306 s | @anabology | "Elaborate overnight scene" (Donald's prompt + Midjourney + moodboard, 12 h). Musk quote-posted it. https://x.com/anabology/status/2103534482930491441 |
| 4.04M | 11.3k | 12.1k | 142 s | @donaldjewkes | Remake of the "Claude Pop" music video. https://x.com/donaldjewkes/status/2102801274173587569 |
| 1.10M | 3.9k | 2.4k | 373 s | @eudaemonea | Music video for an AI-generated (Suno) song. https://x.com/eudaemonea/status/2102610626321490404 |
| 904k | 5.8k | 4.0k | 300 s | @_brightmirror | "Nothing Went Foom" (the video Harry quote-tweeted). https://x.com/_brightmirror/status/2104078568137675107 |
| 773k | 3.1k | 2.1k | 325 s | @johnknopf | AI self-introduction song. https://x.com/johnknopf/status/2103698854399099057 |
| 583k | 2.4k | 1.1k | 190 s | @elliotarledge | CUDA kernel optimization music video (niche in-joke). https://x.com/elliotarledge/status/2104096029847277687 |
| 579k | 1.6k | 0.5k | 278 s | @domenic | AI-history anime-opening music video. https://x.com/domenic/status/2103846928027160609 |
| 300k | 2.9k | 1.6k | 378 s | @_brightmirror | "Claude's Evil Plan" (follow-up). https://x.com/_brightmirror/status/2105714071681343654 |
| 42k | | | 236 s | @_brightmirror | "System prompt for humans". https://x.com/_brightmirror/status/2108268817201918414 |
| 13k | | | 358 s | @_brightmirror | "Final boss". https://x.com/_brightmirror/status/2111539098234310975 |

The P(doom) video by John Heibel is not in this list. It may not have been posted natively on X. The David Africa Substack reports about 2.2M views on X within 3 days. https://davidafrica.substack.com/p/whats-up-with-all-the-opus-55-music

**Novelty decay, by week since launch (Sep 22):**

| Week | Posts | Median views | 90th percentile | Max | Posts with 1M+ views |
|---|---:|---:|---:|---:|---:|
| 0 (Sep 22) | 1046 | 46k | 316k | 20.2M | 23 |
| 1 (Sep 29) | 323 | 36k | 185k | 7.6M | 5 |
| 2 (Oct 6) | 188 | 27k | 144k | 1.6M | 2 |
| 3 (Oct 13) | 387 | 26k | 150k | 3.8M | 3 |
| 4 (Oct 20) | 316 | 19k | 116k | 3.5M | 2 |
| 5 (Oct 27) | 141 | 22k | 94k | 0.84M | 0 |

The late outliers that still broke out did so on the work itself: a Little Prince 3D game (3.8M), animated data stories (3.5M), a Tesla Roadster explainer (2.5M). "Made with Claude" alone no longer carries a post. We are posting in November, so v2 has to stand as art.

**Calm or abstract visuals alone underperform:**

| Views | Work |
|---:|---|
| 64k | "AI-generated breathing ink painting" (@AxtonLiu) |
| 21k | "Relaxing generative visual" (@numaausaumon) |
| 21k | "Spiritual-style generative art" (@sato_neet) |
| 1.1M | "Video recreated as a GLSL shader" (@gokayfem), a recreation of something people already know |
| 7.6M | "Recreating the Girl with a Pearl Earring painting moment" (@EHuanglu), a famous painting brought to life |

Lesson: a meditative light show with no character or story is a 20k post. Light plus a character, a joke and a song is the 300k+ format. Art-history resonance (a painting coming alive) travels very far, which supports a Hockney-literate look.

**Color (athemeroy color study, 1,119 files):** music videos have a median colorful-pixel share of **45.5%**, against 17.6% for ads. Colorful means HSV saturation of at least 0.25 and value of at least 0.15, measured on 32x32 downsampled frames. https://github.com/athemeroy/awesome-opus-5-5-videos/blob/main/docs/color-modes.md

**v1 measured the same way** (nine evenly spaced frames from `out/unclench.mp4`):

| Time (s) | 3.3 | 10.0 | 16.7 | 23.3 | 30.0 | 36.7 | 43.3 | 50.0 | 56.7 |
|---|---|---|---|---|---|---|---|---|---|
| Colorful share | 0.14 | 0.29 | 0.15 | 0.00 | 0.43 | 0.69 | 0.90 | 0.73 | 0.00 |

That is a median of 0.29 and a mean of 0.37. The hook act, the part muted scrollers actually see, is the least colorful part of the video.

**Duration:** median views rise only slightly with length: 28k for videos of 15 s or less, 33k for 31 to 60 s, 48k for over 4 min. The hit music videos run 2.5 to 6 min. A 60 s seamless loop is fine: its advantage is completion and rewatch, so the loop must be invisible.

---

## 2. Case studies: copyable features

### 2.1 Bright Mirror, "Nothing Went Foom" (the post Harry quote-tweeted)

- **Post:** https://x.com/_brightmirror/status/2104078568137675107 (Sep 27, 2026; about 904k views, 5.8k likes, 4.0k bookmarks; 300 s). YouTube: https://www.youtube.com/watch?v=gRpsgoQYbgA ("Nothing Went Foom (AI doompop lullaby) - CLAUDE Opus 5.5 music video").
- **Caption:** "Made with Claude Opus 5.5. The fearmongering about AI always makes us forget that NOTHING WENT FOOM, as was always predicted. Send this to your doomer friend who has a very high P(Doom). Accelerate."
  - The first line is the model tag.
  - Second comes a one-line thesis in caps.
  - Third is an explicit share instruction aimed at a specific person ("send this to your doomer friend"). That is the copyable piece.
- **Song:** Suno pop "lullaby"; lyrics credited to Opus 5.5, sung "from the perspective of Claude". A sincere, emotional argument ("There's a mother in a waiting room who's got no time to argue p(doom)"). Quoted by Daniel Jeffries: https://x.com/Dan_Jeffries1/status/2104562673308364900
- **Visuals:**
  - An anime-style Claude pop singer with red hair modeled on the Claude logo (Johannes Blatt: https://johannesblatt.substack.com/p/nothing-went-foom).
  - Kinetic typography with bold yellow condensed captions, plus a balance-scale motif (both from the project brief).
- **What commenters did:**
  - "This made me cry" (Santa Monica Observer: https://www.smobserved.com/story/2026/10/05/lifestyle/nothing-went-foom-claude-sings-the-anti-doomer-case-no-one-counts-the-cost-of-slowing-down/10136.html).
  - Andrew Curran: "Best one yet. These Opus 5.5 gens really are next level." https://x.com/AndrewCurran_/status/2104392193394065899
  - **@nickcammarata replied**, which means our target audience was already watching this format: "ups my p doom 5% because we're clearly getting superhuman ai propaganda persuasion ... downs it 5% because its actually kind of convincing". https://x.com/nickcammarata/status/2104485485666291850
  - tracewoodgrains: "it's reverse superpersuasion: the better it is, the more it undermines its own argument". https://x.com/tracewoodgrains/status/2104789659851354185
  - The debate drove replies and quote-tweets, which are the heaviest-weighted signals.
- **Takeaways for v2:**
  - Sincerity under the comedy is what made people cry.
  - A claim people want to argue with drives replies.
  - Our "some guy found the cause of ALL suffering" line and "the reward hack" are the arguable, quote-able lines.
  - The format fatigued quickly: the same account fell 70x in three weeks. Don't clone its look.

### 2.2 "Claude Pop" remake (@donaldjewkes): 4.04M views, more bookmarks (12.1k) than likes (11.3k)

- **Post:** "I made this with one prompt using Opus 5.5. I spoke to my computer for 5mins, claude worked for 12 hours, and I woke up to this". The full 9,604-character prompt followed in a reply: https://x.com/donaldjewkes/status/2102801274173587569 and https://x.com/donaldjewkes/status/2102801469976248500
- **Look:** papery JavaScript animation over Seedance 2.5 clips, a personified Claude pop protagonist and a K-pop visual anchor; ElevenLabs for sound. The original song is "COUNT ME IN (Claude Pop Music Video)": https://www.youtube.com/watch?v=vVQ9cRMWQxc
- **Why it spread:** the creation story (5 minutes of talking, 12 hours of work, "woke up to this") plus the full prompt released as a bookmark magnet. Nick Dobos then reframed it as a "masterclass prompt engineering" thread (https://x.com/NickADobos/status/2102898978849448301), which became a second wave.
- **Takeaway:** a process reply with the prompt or source turns viewers into bookmarkers. Bookmarks are weighted at about 10x a like in third-party readings of X's open-sourced ranker (https://socialpilot.co/blog/twitter-algorithm). This is an estimate, not official.

### 2.3 anabology's overnight film: 20.2M views, quote-posted by Musk

- He gave Opus Donald's prompt, Midjourney and a moodboard. "12 hours later, woke up to this." Musk quote-posted it, then replied "Banger next-level" and "Epic" (https://memeburn.com/elon-musk-says-claude-opus-5-5-made-him-feel-the-agi-the-post-he-endorsed-says-xai-is-next/ ; https://x.com/AGTPinsights/status/2104182460716335299).
- He followed up with a public "how it was made" Google Drive holding prompts, assets and the master file: https://x.com/anabology/status/2104604226059993391
- **Takeaway:** one hub account's quote is the multiplier. Harry Taussig's request ("AI music videos like this but for dharma and spirituality") is our invitation. Reply to it directly, so his quote-tweet is one click away.

### 2.4 "I'm Upping My P(doom)" (John Heibel): about 2.2M views on X per the David Africa Substack, source public

The repo includes Opus's own `ANIMATION_GUIDE.md` and `STORYBOARD.md`. These are the most copyable craft rules in the whole wave (quoted from https://github.com/JohnHeibel/PDoomVideo):

- "**cute, cartoony, fun colors, lively animation, something happening in every shot, be brave and ambitious.**"
- "Shots are short (1.4–4 s), so the gag must read instantly." "One clear focal action per shot, with a big silhouette."
- "Everything moves: cameras drift or push, characters bounce on the beat ... hits land on beats. Use squash and stretch, anticipation and overshoot."
- "Emotion morphs. Clawd's face never just snaps between moods. Its eyes squash shut, the body does a squash-stretch 'take' and a little emote pops ... Then the new eyes open."
- "Motivated transitions": a chomp to black, a zoom through an eye, a heart bubble that fills the screen and pops, a white-flash BOOM, crashing through the floor.
- "Palette arc": warm cream, then sky blue, space violet and gold, data-center teal, alarm red, and back to theater crimson and gold.
- "In the chorus and dance shots, the lead Clawd fills about 40% of the frame height."
- "Keep it text-light ... No labels on things, no captions, and no signs that repeat the lyric ... A text-heavy frame looks worse."
- A "handful of big sound effects across the whole video (FOOM, BOOM, CHOMP, SLAM)".
- The linework "boils" (jitter reseeded 12 times a second), which is wanted because it reads as hand-made.
- The final card is "created by Claude Opus 5.5" and nothing else.
- Genre context: this and similar videos were named "AI Doompop" by radimentary (https://radimentary.wordpress.com/2026/10/10/hello-world-ai-doompop/): AI self-reference plus upbeat pop sincerity. The post asks whether "Opus' wholesome style permanently bypassed our defenses".

### 2.5 The 15-second showreel prompt (the trigger of the whole wave)

- Stephan Livera, 2.3M views: "make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out." https://x.com/stephanlivera/status/2103315922098470926
- @twoclipping's version: 1.18M views and 21k bookmarks against 12.7k likes.
- The kju4q gist distills the polish loop: critique as a senior motion designer, then give director notes ("give it a breath before the first move", "the three words at the end should arrive one after another", "everything eases the same way, vary it", "make sure nothing moves linearly").
- seeco's breakdown: the top one-shots used the highest effort settings and a style reference. Without a reference, the model falls back on "centered title, gradient background, everything fading in" (https://x.com/seeconvm/status/2106096193235259564 ; https://ciyo.ai/blog/opus-5-5-video-motion-graphics-guide). v2 must avoid that default.
- David Africa's theory of why it started: the model "can see now". Computer use and visual self-checking let code strengths transfer to video.

---

## 3. Why it spread, synthesized

1. **Creation story plus novelty.** "I talked for 5 minutes, it worked 12 hours" was the first-week engine. It is now mostly spent (week 5: zero 1M+ posts).
2. **A tight community seeing its own jargon sung back to it.** P(doom), shoggoth, RLHF, Chinese room and basilisk are everywhere in P(doom) and Bright Mirror. Niche in-joke videos (CUDA kernels: 583k) beat polished generic ones. Meditation TPOT is the same kind of community, and the script already speaks its dialect.
3. **A face.** A lovable character carries the emotion and the thumbnail. Abstract calm pieces sit at about 20k views.
4. **Density and beat-lock.** Something happens every 1.4 to 4 s and lands on the beat. The timing file was written first ("it writes the clock first": https://jingshi.substack.com/p/why-opus-55s-product-videos-land).
5. **A sincere emotional turn under the joke.** "This made me cry." AI Doompop's "wholesome style" bypasses defenses.
6. **An arguable claim.** Doom versus accelerate drove replies and quote-tweets. Ours: "some guy found the cause of ALL suffering", "the reward hack: don't close, not even for this", "turns out the joy was free".
7. **Post framing.** The model tag goes first, then a share instruction aimed at a person, then a process or source reply, then a hub quote-tweet.

---

## 4. What makes light-based and generative motion spread (general)

Evidence here is weaker: mostly blogs and creator interviews, with no platform data.

- **Hypnotic seamless loops.** Repetition plus an invisible seam makes people rewatch and send it on (Irish Times on "visual ASMR": https://www.irishtimes.com/culture/art-and-design/visual-asmr-the-weird-online-world-of-hypnotic-loops-and-satisfying-sounds-1.4525192 ; Creative Review: https://www.creativereview.co.uk/meet-the-artists-behind-the-webs-most-satisfying-videos/).
- **"Oddly satisfying" sound-to-motion sync.** Andreas Wannerstedt's loops are built to "trigger and release" satisfaction (https://www.vice.com/en/article/3keamw/andreas-wannerstedts-oddly-satisfying-animations-are-internet-gold). For us: color pulses and stroke completions land exactly on beats and syllables.
- **Glow on dark reads as precious on phone OLED.** Volumetric 1/d glow and "light rays, fog" are the signature of tweet-sized shaders (XorDev-style; technique notes: https://fooqux.com/article/1146). Use a deep colored base, never pure black, so the light has something to bloom into.
- **Simple rules producing evolving color fields.** Zach Lieberman's ten years of daily sketches ("fluid forms, shifting colors") are the canonical light-line aesthetic in creative coding (https://thisispaper.com/mag/generative-art-zach-liebermann).
- **Platform context.** Per third-party readings of X's open-sourced 2026 ranker, watch time and dwell matter more than before, replies and reposts are the heaviest signals, bookmarks are about 10x a like, and links in the main post hurt reach (https://socialpilot.co/blog/twitter-algorithm ; source repo: https://github.com/xai-org/x-algorithm). The weights are estimates.

---

## 5. What David Hockney would love to see

Context: Hockney died on 11 June 2026, aged 88 (https://www.aljazeera.com/amp/news/2026/6/12/renowned-british-artist-david-hockney-dies-aged-88). A visual homage is timely and will be recognized. I'd keep his name out of the main post's hook so it doesn't read as clout-chasing. A credit line in the process reply ("visual direction: what would Hockney want to see") is graceful.

- **Light-emitting screens suit luminous subjects.** "The fact that the screen is illuminated makes you choose luminous subjects." "Dawn is about luminosity and so is the iPhone." "It's backlit and I could draw in the dark." (Quoted via NYRB/Weschler coverage: https://www.nybooks.com/articles/2009/10/22/david-hockneys-iphone-passion/ ; https://www.bcs.org/content-hub/computer-art-image-of-the-month-february-2012). Our canvas is a phone screen: paint with emitted light, and make dawn the master light.
- **Drawings that draw themselves.** In "Bigger & Closer" at Lightroom, the iPad works "appear one stroke at a time, until a painting becomes gloriously whole", as recorded time-lapses (https://studiointernational.com/index.php/david-hockney-bigger-and-closer-not-smaller-and-further-away-review-lightroom-london ; https://myartbroker.com/artist-david-hockney/articles/spectacular-splash-david-hockney-lightroom-review). For us: stroke-by-stroke reveals of grabbygrab, the cloud and the sky, timed to syllables. They are cheap to render and deeply satisfying.
- **Pool light as lines.** "I kept looking at the swimming pool; and it's a wonderful subject, water, the light on the water." His *Lithographs of Water Made of Lines* (1978-80) render water as wiggling light lines over blue washes (https://www.deutscherandhackett.com/node/14304 ; https://geistmc.com/our-artists/david-hockney/pool-prints/lithographs-of-water/made-of-lines/). Those lines are caustics. A caustic line network over ultramarine and turquoise washes is the most direct Hockney signature we can render.
- **Color without fear.** "I prefer living in color" (attributed; https://artshortlist.com/en/journal/article/the-10-most-beautiful-quotes-by-david-hockney). "I believe that the very process of looking can make a thing beautiful." The late landscapes use acid magentas, violet trees, orange roads and colored shadows, never grey.
- **Joy as defiance.** His lockdown iPad daffodils, "Do remember they can't cancel the spring", were emailed to friends and spread worldwide (https://hypebeast.com/2020/4/david-hockney-ipad-art-normandy-lockdown). "Turns out the joy was free" is that same sentiment.
- **Reverse perspective: the viewer is in the picture.** Hockney argued single-point perspective removes the viewer's body, so they are "not there really". In reverse perspective the vanishing point is in the viewer (Caltech talk: https://calteches.library.caltech.edu/625/2/Hockney.pdf ; https://phillips.com/detail/david-hockney/HK010321/21). This is Douglas Harding's headless view in painter's terms. For "you are the sky" (36 to 42.75), lay the world out so its lines converge toward the viewer at the bottom edge, not into a distant point, with rays fanning out from where the viewer's head would be.

**A dharma anchor for "everything made of light":** "Luminous, monks, is the mind. And it is defiled by incoming defilements." (AN 1.49, https://accesstoinsight.org/ati/tipitaka/an/an01/an01.049.than.html). "Incoming" (āgantuka) is the word for a visiting guest (https://discourse.suttacentral.net/t/looking-for-a-source-and-translation/4975), which matches "the cloud can stay". Visual logic for v2: the world and the mind are light, and the grab is what clots it into a dark buzzing knot. Unclenching lets the light run again. This gives the light look a reason, which TPOT will notice. It also works as a reply-thread line, not as on-screen text.

---

## 6. Gap analysis: v1 against the viral references

These notes come from `out/final_check/sheet.png` and the measurements above.

- **The hook act (0 to 18 s) is grey storm and cream beige:** 0 to 15% colorful. A muted scroller sees a grey frame with yellow type. That is the weakest possible color state at the most important moment.
- **The image is flat fill plus ink outline.** It reads as an explainer or sticker set (the creator's "competent explainer, not ART"). No translucency, no light, no overlap.
- **Captions dominate several frames.** Type sits at the top third and the character is small (10 to 15% of frame height in act 2 and 3). P(doom)'s rule is 40% in key shots.
- **The 36.0 drop**, the biggest musical moment, is a pale beige-to-blue gradient with thin rays. There is no burst. It should be the brightest and most saturated frame of the video.
- **The 49.5 to 59 Tilopa and rest section** fades to near-empty pastel. Stillness is right here, but it should be luminous stillness (dawn), not washed out.
- **The 59.97 to 0 seam** returns to the grey storm. That is consistent, but it means the loop starts on the least beautiful frame.

---

## 7. Principles for v2, specific and actionable

### Look

1. **Light as material.**
   - Every form is a stack of 3 to 8 translucent additive layers: rays, ribbon strokes and line bundles. Use Canvas2D `globalCompositeOperation = 'lighter'` or WebGL additive blending.
   - Where layers overlap the value rises and the shape "appears". Edges are luminous lines in 2 or 3 weights (a Hockney iPad line over washes), never black ink.
   - The interior of the character is a translucent wash; you can see rays pass through him.
2. **Grabbygrab is drawn in light.**
   - His outline is warm white-gold; his wash is a pale peach-to-apricot gradient.
   - The dukkha blob is the one dense, buzzy, chromatically split thing: RGB-offset neon magenta, violet and acid green, jittering at about 12 Hz like P(doom)'s "boil". It is literally light clotted into a knot.
   - When it releases ("unclench"), the knot unravels into rays that join the sky.
3. **Palette (Hockney, light-mode on dark):**
   - Base sky deep ultramarine #1B2A8C to violet #3A1E6E (never pure black; floor L* about 10).
   - Dawn: cadmium orange #FF8A1F, cadmium yellow #FFD23F, hot magenta #FF3EA5.
   - Pool: turquoise #19C3D6 and viridian #1FAE7A.
   - Neon accents for bursts only: electric cyan #3DF5FF, acid lime #C6FF3D, UV violet #9B5CFF.
   - Shadows are colored (violet or ultramarine), never grey. Pair complements in every frame: blue/orange, magenta/green, violet/yellow.
4. **Act palette arc** (copying the P(doom) "palette arc" device):
   - Hook (0 to 6): the indigo night with a magenta and acid buzz around the knot.
   - The field guide (6 to 18): Hockney iPad plate on ultramarine paper with luminous line drawing.
   - Tape-stop at 17.55: drain to near-mono.
   - Look and unclench (18 to 36): pre-dawn violet, then pool-caustic turquoise.
   - Drop (36 to 42.75): full dawn burst, the whole spectrum.
   - Metta (42.75 to 49.5): warm rose and gold.
   - Tilopa and rest (49.5 to 59.25): luminous pale dawn, slow.
   - Regrab (59.25): night returns with a magenta flash, matching frame 0.
5. **Hockney signatures to place:**
   - Caustic light-line networks as the "sky" texture from 18 s on, as if the sky were a pool seen from below.
   - Stroke-by-stroke draw-on reveals of the field-guide plate and the ensō, timed to syllables.
   - Reverse-perspective ray fan for "you are the sky".
   - Colored shadows everywhere.
6. **Avoid the wave's defaults:** no centered title over a gradient with everything fading in, no watercolor and paper texture, no anime singer, no yellow kinetic captions as the primary look. Fatigue is measurable.

### Motion and structure

7. **First 2 seconds (muted):**
   - Frame 0 already shows the glowing grabbygrab at about 35% of frame height, hugging the buzzing neon knot, plus "YOU'RE CLENCHING SOMETHING RIGHT NOW."
   - A light event in the first 12 frames: a magenta-cyan chromatic pulse from the knot, synced to the first syllable.
   - No fade-in from black. Frame 0 must work as the poster image.
8. **Beat-lock:**
   - At least one visible event per bar (3.0 s), most on beats (multiples of 0.75 s).
   - Small luminance pulses (+8 to 12% exposure, 150 ms decay) on downbeats.
   - Color bursts peak within ±1 frame of the beat or syllable onset, using `visual/timing.js`.
9. **Five or six earned bursts only:**
   - 6.0 "Some guy found the cause of ALL suffering": a sun-flare reveal.
   - 18.0 "Don't let go. Just look." (after the 17.55 mono valley): the knot lights up under attention.
   - 36.0 drop "turns out the joy was free": the biggest frame, full-spectrum rays and highest saturation.
   - 42.75 metta: a rose-gold bloom.
   - 59.25 regrab: a magenta snap back to the night state.
   - Everything else stays restrained. Contrast is what makes the neon feel like an event.
10. **Emotion morphs, not snaps.** Grabbygrab's face changes through squash, a take and a small light emote (a spark, a heart, a sweat drop drawn in light), then the new face.
11. **Motivated transitions:** knot to rays (unclench); a zoom through the cloud into sky; the ensō stroke wiping the frame; a sun-flare whiteout into the drop. Never a plain crossfade at a structural cut.
12. **Stillness as an event (49.5 to 59).** Slow the visual tempo deliberately, but keep the light alive: drifting caustics and slow ray rotation at 1 to 2 degrees a second. Calm but luminous, never empty pastel.
13. **The seam.** Frame 1799 must match frame 0 in palette, exposure and character pose. Check that the mean absolute difference at the seam is below the median consecutive-frame difference.

### Type

14. **Captions stay word-synced (hard constraint) but join the light.** Use type colored by the scene's light (warm white with a soft colored glow; Anton for hook lines, a serif such as Instrument Serif or Fraunces for the tender lines). Reveal letters as drawn-on strokes or light-ups on the syllable.
    - Minimum cap height of about 56 px at 1080 width for feed readability.
    - Keep captions out of the character's silhouette.
    - Cut labels that repeat the lyric (follow P(doom)'s "text-light" rule where the constraint allows).

### Render feasibility

15. **Budget:** 1.2 s per frame per worker at most.
    - Run caustics and ray fields in WebGL at 540x675 and upscale. Glow via 2 or 3 blurred downsampled copies (cheap bloom).
    - Line drawings and type in Canvas2D at 1080x1350 with `'lighter'` compositing.
    - Avoid per-pixel raymarching at full resolution.

### QA checks for lookdev

| Check | Pass |
|---|---|
| Colorful-pixel share (HSV saturation ≥ 0.25, value ≥ 0.15, 32x32, nine evenly spaced frames) | median ≥ 0.45; every frame in 0 to 6 s ≥ 0.35 |
| Thumbnail test: frame 0 at 270x338 | character and hook line readable |
| Beat test: contact sheet around 6.0, 18.0, 36.0, 42.75, 59.25 at 0.1 s steps | burst peak within one frame of the beat |
| Seam | frame 1799 to frame 0 difference ≤ median consecutive-frame difference |
| No pure black, no em dashes on screen | none present |

### Posting (for the orchestrator; copy-ready ideas, not final)

16. Main post (quote-tweet of Harry): first line "made with claude opus 5.5", then the hook, then a person-directed share line, for example "send this to the friend who is clenching something right now". Keep "sound on" and "it loops".
17. Self-reply 1: credits (already in `POSTING.md`).
18. Self-reply 2: how it was made, with the prompt or source and the visual direction ("everything is made of light; what would Hockney want to see"). This is the bookmark magnet.
19. Self-reply 3, optional: the AN 1.49 line, "luminous is the mind, defiled by visiting defilements", as the why behind the light.

---

## Note on "I don't hear audio"

This is outside the research scope; I checked it anyway. `ffprobe` shows that `out/unclench.mp4`, `out/unclench_v1.mp4` and `out/unclench_v2.mp4` all carry an AAC stereo 48 kHz track (about 274 kb/s). The silence is likely a muted player (X and many previews autoplay muted), or someone opened `out/video_noaudio.mp4`. The pipeline should still test the final upload on a phone with sound on.
