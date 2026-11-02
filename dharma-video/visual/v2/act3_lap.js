// ACT 3, 39.0 to 54.0: HEADLESS (Douglas Harding), METTA, TILOPA. One world, one camera. LOOK.md 4 (ACT 3), 2.7, 2.9, 4.1.
// 39.0 the camera pulls back from 1.65 (anchored on the sun, matched to the drop's sun at the cut) and he drifts down out
// of the sun into the cupped hands of a huge seated figure in dark glass with a gold light contour; "free." rides the
// cut and lets go by 39.35. Above the collarbones there is no head: only the brightest sky, the concentric sun rising on
// a horizon of fields that fan out from the neck (the viewer) in reverse perspective, the road's dashes streaming toward
// you, sunburst wedges clicking half a wedge per beat, light travelling up the rays that rise from below.
// 42.75 the camera pushes into the lap and the heart space opens out of his heart (a disc of deep plum with a gold edge,
// under a soft rose-gold bloom). af Klint glass circles open one at a time as jewel glass on the dark heart (petals glow
// only where circles overlap), the gold dry-brush ensō draws itself in bristles of light 45.00 to 47.25 with its gap left
// open, rays curl, gold rings pulse out on every beat, the heart glows rose-gold on "pen". 48.75 the heart space closes
// back into the rosette as the camera eases out to the lap.
// 49.5 to 54.0 Tilopa: one material of the film's language leaves on every beat (readouts and rings; coloured glass;
// lines; the ensō and the lens; then the sun folds into one white beam from the head-space down to him).
(function () {
  const V2 = window.V2, U = V2.U, NS = window.a3_NS;
  const { clamp, lerp, hash, TAU } = U;
  const { R, E } = NS;
  const L = NS.lap = {};

  // ------------------------------------------------------------------ the world (k = 1 = the headless framing)
  const SUN = [540, 452], SUNU = 82;                 // sun centre and unit radius (rings at 1.05 .. 1.9 of it)
  const HZ = 548;                                    // the head-space horizon
  const NECK = [540, 800];                           // the viewer: the neck, where the head would be
  // (final pass) the fields fan from a point hidden behind the dark glass below the neck, so they already span the neck
  // (about 170 px wide there, fading out at the neckline) and widen toward the frame edges: the head-space reads as a
  // window onto a landscape, not a cone with
  // the sun on it like a scoop of ice cream
  const FANO = [540, 868];
  const HIM = [540, 1090], HS = 92;                  // him in the cupped hands
  const ORB = [622, 1124], ORBR = 15;
  const CLOUD = [910, 430], CLOUDSC = 0.58;
  const KM = 2.2, MY = 750;                          // the metta push-in: scale, his screen y
  const ROSE_D = 72, ROSE_R = 74, ENSO_R = 160;      // rosette ring distance and circle radius, ensō radius (world)
  const hzW = x => HZ + 8 * Math.sin(x * 0.012 + 0.7) + 5 * Math.sin(x * 0.027 + 2.1);   // mirror of hzL in a3_lap
  L.HIM = HIM; L.HS = HS;
  // the sun rises about 20 px while the headless view holds (40.6 to 42.75), so the frame keeps breathing
  const sunW = t => [SUN[0], SUN[1] - (t < 42.75 ? 20 * E.inOutSine(R(t, 40.6, 42.75)) : 0)];

  // ------------------------------------------------------------------ the camera
  // 39.0..40.6 pull back 1.65 -> 1 anchored on the sun (sun at screen y 780 at 39.0: the drop's sun); 42.75..43.05 push into
  // the lap (k 2.2), drifting to 2.32 by 48.75; 48.75..49.5 ease back out; 49.5..52.5 a slow push toward him at a steady
  // speed that stops dead at 52.5 ("don't control.")
  const tilPush = u => { const f = u <= 0.2 ? u * u / 0.4 : u - 0.1; return f / 0.9; };
  L.cam = function (t) {
    if (t < 42.75) { const e = E.inOutCubic(R(t, 39.0, 40.6)); const k = lerp(1.65, 1, e); return NS.cam(k, SUN[0], SUN[1], 540, lerp(780, SUN[1], e)); }
    if (t < 48.75) { const e = E.outCubic(R(t, 42.75, 43.05)); const k = lerp(1, KM, e) * (1 + 0.055 * E.inOutSine(R(t, 43.05, 48.75))); return NS.cam(k, HIM[0], HIM[1], 540, lerp(HIM[1], MY, e)); }
    if (t < 49.5) { const e = E.inOutCubic(R(t, 48.75, 49.5)); const k = lerp(KM * 1.055, 1, e); return NS.cam(k, HIM[0], HIM[1], 540, lerp(MY, HIM[1], e)); }
    const e = tilPush(R(t, 49.5, 52.5)); return NS.cam(1 + 0.06 * e, HIM[0], HIM[1], 540, HIM[1] + 40 * e);
  };
  // the heart space (GL disc): radius (screen px), mask amount, gold edge amount. Opens out of his heart at 42.75 under the
  // soft bloom, covers the frame through metta, closes back into the rosette 48.75..49.4 and fades by 49.5
  function heartState(t, k) {
    if (t < 42.75 || t >= 49.5) return { r: 0, m: 0, ring: 0, full: false };
    if (t < 48.75) { const u = E.outCubic(R(t, 42.75, 42.88)); return { r: 120 + 1520 * u, m: 1, ring: 1.0 * (1 - R(t, 42.75, 43.0)), full: u >= 1 }; }
    const u = E.inOutCubic(R(t, 48.75, 49.35));
    return { r: lerp(1640, ENSO_R * k * 1.12, u), m: 1 - E.smooth(R(t, 49.2, 49.5)), ring: 0.8 * E.smooth(R(t, 48.75, 48.9)) * (1 - E.smooth(R(t, 49.25, 49.5))), full: u <= 0.001 };
  }

  // ------------------------------------------------------------------ the seated figure (dark glass, gold light contour)
  // the meditator's seated pose from the front (LOOK 3.4), no head: a neck that dissolves into light, square shoulders,
  // arms hanging to the elbows and folding into the lap, knees out to the frame edges, shins crossed in front.
  // (final pass) a short neck and a sloped trapezius into rounder shoulders (a flat shoulder line read as a bell or a pawn)
  const LEFT = [[494, 752], [490, 782], [478, 804], [440, 816], [384, 832], [318, 850], [266, 870], [238, 902], [228, 950], [224, 1000],
    [218, 1056], [210, 1092], [196, 1124], [160, 1156], [104, 1186], [56, 1214], [26, 1244], [14, 1276], [20, 1306], [40, 1330], [52, 1360], [54, 1440]];
  const mir = p => [1080 - p[0], p[1]];
  const SM = pts => LX.smoothPts(pts, 6);
  const LS = SM(LEFT), RS = LS.map(mir);
  const SIL = (() => { const p = new Path2D(); LS.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.lineTo(54, 1440); p.lineTo(1026, 1440);
    for (let i = RS.length - 1; i >= 0; i--) p.lineTo(RS[i][0], RS[i][1]); p.closePath(); return p; })();
  // light-pen lines: the outer contour (from the neck base down, tapering in at the neck), the arms, the hands, the legs
  const CONT = (() => { const k0 = LS.findIndex(q => q[1] > 803); const pts = LS.slice(k0); return [pts, pts.map(mir)]; })();
  const ARM = (() => { const a = SM([[332, 900], [314, 960], [296, 1030], [284, 1076], [318, 1106], [378, 1127], [434, 1141]]); return [a, a.map(mir)]; })();
  const FORE = (() => { const a = SM([[220, 1104], [298, 1148], [376, 1170], [440, 1180]]); return [a, a.map(mir)]; })();
  // crossed shins (lotus): each shin runs from its knee across to the far side, the two crossing in front of the lap
  const SHIN = (() => { const a = SM([[44, 1262], [220, 1286], [430, 1304], [640, 1318], [800, 1330]]); return [a, a.map(mir)]; })();
  // the cupped hands: two light-pen curves under him, overlapping at the middle, thumb tips touching above
  const HANDS = (() => { const a = SM([[424, 1124], [440, 1150], [478, 1172], [530, 1180], [578, 1172]]); return [a, a.map(mir)]; })();
  const THUMBS = SM([[452, 1128], [492, 1112], [540, 1108], [588, 1112], [628, 1128]]);

  // ------------------------------------------------------------------ the pane
  // two panes: 'head' (the headless sky, the fields from the neck, the figure) up to 48.75, and 'met' (the heart-space
  // gradient as the sky over the lap) from 48.75 (switched while the heart disc covers the frame). The figure's opacity
  // is written into the pane's alpha for the GL absorption. Dusk is applied in GL (no pane rebuilds for it).
  const FA = [-0.92, -0.60, -0.31, -0.075, 0.075, 0.31, 0.60, 0.92];
  const FC = ['#FF2E97', '#B6F03C', '#7A2BD1', '#FF7A1A', '#1FAE7A', '#FFE45C', '#FF2E97'];
  const FMARK = { 0: ['dot', '#FF8CC6'], 1: ['dash', '#5FB01E'], 2: ['dot', '#B98CFF'], 4: ['dash', '#0E7A52'], 6: ['dot', '#FF8CC6'] };
  const dirOf = th => [Math.sin(th), -Math.cos(th)];
  function hitH(th) { const d = dirOf(th); let s = (FANO[1] - HZ) / Math.max(0.05, Math.cos(th)); for (let i = 0; i < 6; i++) { const x = FANO[0] + d[0] * s, y = FANO[1] + d[1] * s; s += (y - hzW(x)) / Math.max(0.12, Math.cos(th)); } return [FANO[0] + d[0] * s, FANO[1] + d[1] * s, s]; }
  const belowHz = (() => { const p = new Path2D(); p.moveTo(-400, 1500); for (let x = -400; x <= 1480; x += 20) p.lineTo(x, hzW(x)); p.lineTo(1480, 1500); p.closePath(); return p; })();
  const SKY = [[0, '#1038AA'], [0.22, '#1C5ED6'], [0.30, '#3DB4FF'], [0.37, '#86D4FF'], [0.42, '#FFD98C'], [0.60, '#FFB86B']];          // headless (stops over y 0..1350)
  const MET = [[0, '#B3245E'], [0.5, '#F2789E'], [1, '#F6A68D']];
  const DUSK = [[0, '#2A1F5C'], [1, '#14123A']];
  function paneDraw(g, P) {
    g.setTransform(0.5, 0, 0, 0.5, 0, 0);
    const sg = g.createLinearGradient(0, 0, 0, 1350); (P.dusk ? DUSK : P.met ? MET : SKY).forEach(([u, col]) => sg.addColorStop(u, col)); g.fillStyle = sg; g.fillRect(0, 0, 1080, 1350);
    // a warm pool around the sun (the brightest sky)
    if (!P.dusk) V2.P.disc(g, SUN[0], HZ - 10, 330, '#FFE9B0', P.met ? 0.12 : 0.32);
    // the fields: flat glass, fanning up from the neck, melting at "don't imagine"
    if (P.fields > 0) {
      g.save(); g.clip(belowHz); g.globalAlpha = P.fields;
      for (let i = 0; i < FC.length; i++) {
        const a = dirOf(FA[i]), b = dirOf(FA[i + 1]), Ln = 1200;
        const fg = g.createLinearGradient(0, NECK[1] - 14, 0, NECK[1] + 26); fg.addColorStop(0, FC[i]); fg.addColorStop(1, V2.rgba(FC[i], 0));   // ends at the neckline
        g.fillStyle = fg; g.beginPath(); g.moveTo(FANO[0], FANO[1]); g.lineTo(FANO[0] + a[0] * Ln, FANO[1] + a[1] * Ln); g.lineTo(FANO[0] + b[0] * Ln, FANO[1] + b[1] * Ln); g.closePath(); g.fill();
        const mk = FMARK[i]; if (!mk) continue;
        g.fillStyle = mk[1]; g.strokeStyle = mk[1]; g.lineCap = 'round';
        const mid = (FA[i] + FA[i + 1]) / 2, sh = hitH(mid)[2];
        for (let r = 0; r < 5; r++) {
          const sN = (FANO[1] - NECK[1] + 10) / Math.cos(mid), s0 = lerp(sN, sh, Math.pow((r + 0.6) / 5.4, 0.85)), sc = (s0 - sN + 70) / 210;
          for (let cc = 0; cc < 2; cc++) {
            const th = lerp(FA[i], FA[i + 1], (cc + 0.5 + 0.15 * Math.sin(r * 2.1 + cc)) / 2), d = dirOf(th);
            const x = FANO[0] + d[0] * s0, y = FANO[1] + d[1] * s0;
            if (mk[0] === 'dash') { g.lineWidth = 5 * sc; g.beginPath(); g.moveTo(x - d[0] * 11 * sc, y - d[1] * 11 * sc); g.lineTo(x + d[0] * 11 * sc, y + d[1] * 11 * sc); g.stroke(); }
            else { g.beginPath(); g.arc(x, y, 4 * sc, 0, TAU); g.fill(); }
          }
        }
      }
      const lg = g.createLinearGradient(0, HZ - 10, 0, HZ + 90); lg.addColorStop(0, 'rgba(255,240,200,0.30)'); lg.addColorStop(1, 'rgba(255,240,200,0)');
      g.globalCompositeOperation = 'screen'; g.fillStyle = lg; g.fillRect(-400, HZ - 30, 1900, 160);
      g.restore();
    }
    // the seated figure: dark glass at 88%, no head (its top fades over 160 px at the neck), a lilac rim of sky light on
    // the shoulders, the lap warmed by him
    if (P.sil > 0) {
      const A = P.sil;
      const fade = (a0, col) => { const gr = g.createRadialGradient(NECK[0], NECK[1] - 36, 28, NECK[0], NECK[1] - 36, 170); gr.addColorStop(0, V2.rgba(col, 0)); gr.addColorStop(1, V2.rgba(col, a0)); return gr; };
      g.save(); g.fillStyle = fade(0.88 * A, P.silCol); g.fill(SIL);
      g.clip(SIL);
      g.globalCompositeOperation = 'screen'; g.globalAlpha = A;
      g.strokeStyle = fade(0.42, '#6F5CE0'); g.lineWidth = 46; g.stroke(SIL);
      V2.P.disc(g, HIM[0], HIM[1] + 30, 230, '#FF9A3D', 0.30, 'screen');
      g.restore();
      g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = fade(0.5 * A, '#000000'); g.fill(SIL); g.restore();
    }
  }

  // ------------------------------------------------------------------ him, the orb, the cloud
  const MJOY = Object.assign({}, V2.grab.MOODS.joy, { emit: 0.5, scr: 0.42, fibreA: 0.18 });
  L.mood = function (t) {
    if (t < 42.75) return MJOY;
    if (t < 43.0) return V2.grab.mixMood(MJOY, 'metta', Math.round(R(t, 42.75, 43.0) * 8) / 8);
    if (t < 50.25) return 'metta';
    return V2.grab.mixMood('metta', 'asleep', Math.round(E.smooth(R(t, 50.25, 52.8)) * 16) / 16);
  };
  // a small happy hop on every beat while the headless view holds (lands on the beat, squash on landing)
  function hop(t) {
    if (t < 40.5 || t >= 42.75) return { y: 0, sq: 0 };
    const A = E.smooth(R(t, 40.5, 40.9)) * (1 - E.smooth(R(t, 42.4, 42.75)));
    const ph = V2.beat(t).ph;
    if (ph < 0.08) return { y: 0, sq: 0.07 * (1 - ph / 0.08) * A };
    const u = (ph - 0.08) / 0.92; return { y: -9 * Math.sin(Math.PI * u) * A, sq: -0.025 * Math.sin(Math.PI * u) * A };
  }
  L.geo = function (t) {
    // 39.0..40.45: he drifts down out of the sun (where the drop left him, its white-hot core) into the cupped hands
    const d = E.inOutCubic(R(t, 39.0, 40.45));
    const sw = sunW(t), hp = hop(t);
    const x = lerp(sw[0], HIM[0], d) + 46 * Math.sin(Math.PI * d) * (1 - d), y = lerp(sw[1], HIM[1], d) + hp.y, s = lerp(280 / 1.65, HS, d);
    const bob = t < 49.5 ? 0.6 : 0.4 * (1 - R(t, 51.75, 52.5));
    let arm;
    if (t < 40.6) { const w = 0.36 * V2.osc(t, 80, 0.9); arm = { ext: 1 - E.smooth(R(t, 40.0, 40.6)), tx: x + 0.62 * s * 1.02 + 46 * s / 280 * 1.65, ty: y - 0.7 * s * 0.62, ang: lerp(-1.12 + w, -0.5, E.smooth(R(t, 40.0, 40.6))), open: 1, sag: 0.05 }; }
    else if (t >= 46.4 && t < 47.6) {     // metta: a small shy open-handed wave (waving is the opposite of grabbing)
      const u = E.smooth(R(t, 46.4, 46.6)) * (1 - E.smooth(R(t, 47.4, 47.6)));
      arm = { ext: u, tx: x + 0.62 * s + 0.30 * s, ty: y - 0.38 * s, ang: lerp(-0.5, -1.25 + 0.22 * V2.osc(t, 160, 0.4), u), open: 1, sag: 0.05 };
    } else arm = { ext: 0, open: t < 50.25 ? 1 : 1 - 0.35 * R(t, 52.5, 53.2), ang: -0.5 };
    return V2.grab.geo(t, x, y, s, { bob, squash: hp.sq, arm, look: t < 42.75 ? [0, -0.4] : [0, -0.2], cam: L.cam(t).k });
  };
  function face(t) {
    if (t < 39.6) return { eyes: 'happy', mouth: 'open', blush: 0.25 };
    if (t < 42.75) return { eyes: 'happy', mouth: 'smile', blush: 0.25 };
    if (t < 44.0) return { eyes: 'dots', brows: 'worried', mouth: 'o' };
    if (t < 52.5) return { eyes: 'happy', mouth: 'smile', blush: lerp(0.3, 0.75, E.smooth(R(t, 45.4, 46.0))) };
    return { eyes: 'closed', mouth: 'smile', blush: 0.5 * (1 - R(t, 52.5, 53.5)) };
  }

  // ------------------------------------------------------------------ type
  const C5 = V2.line('C5'), V24 = V2.line('V24'), V24b = V2.line('V24b'), C6 = V2.line('C6');
  const c5Spec = () => ({ words: ['you', 'are', 'the', 'sky.'], word_t: C5.word_t.slice(), rows: [{ n: 2, size: 128, y: 124 }, { n: 2, size: 128, y: 242 }], kind: 'sung' });
  const v24Spec = () => ({ words: ["don't", 'fight', 'him.'], word_t: V24.word_t.slice(), rows: [{ n: 3, size: 100, y: 300 }], kind: 'light' });
  const v24bSpec = () => ({ words: ["he's", 'just', 'scared.'], word_t: V24b.word_t.slice(), rows: [{ n: 3, size: 100, y: 300 }], kind: 'light' });
  const TIL = [[49.5, ["don't", 'recall.'], 120], [50.25, ["don't", 'imagine.'], 110], [51.0, ["don't", 'think.'], 104], [51.75, ["don't", 'examine.'], 96], [52.5, ["don't", 'control.'], 88]];
  const TIL_HALO = ['#FFC23D', '#F2C98A', '#D8C8C0', '#B9BEEA', '#9FB4FF'];
  const DEEP = '#1B2A8C';
  // the watermark: pearl on the deep head-space sky (the core styles 'headless' as a light ground; CORE_REQUESTS A3-6)
  const wmPrev = V2.watermarkOverride;
  V2.watermarkOverride = t => (t >= 39.0 && t < 42.75) ? { col: '#F4EFD8', a: 0.5 } : (wmPrev ? wmPrev(t) : V2.watermarkStyle(t));

  // ------------------------------------------------------------------ the frame
  L.draw = function (t, ctx) {
    const c = L.cam(t), k = c.k, toS = p => NS.toS(c, p);
    // Tilopa's subtractions (each leaves on its beat, 0 -> 1)
    const sImag = E.smooth(R(t, 50.19, 50.6)), sThink = E.smooth(R(t, 50.94, 51.2)), sExam = E.smooth(R(t, 51.69, 52.3)), sCtrl = E.smooth(R(t, 52.44, 52.9));
    const fieldsA = t < 49.5 ? 1 : 1 - sImag;
    const silA = t < 52.44 ? 1 : 1 - E.smooth(R(t, 52.44, 53.4));
    const dusk = t < 50.2 ? 0 : E.smooth(R(t, 50.2, 52.6));      // dusk has arrived by "don't control."
    const G = L.geo(t), M = L.mood(t);
    const Gs = [G.cx * k + c.ox, G.cy * k + c.oy, G.bw * k, G.bh * k];
    const heart = [Gs[0], Gs[1] + Gs[3] * 0.12];
    const roseC = [Gs[0], Gs[1] - Gs[3] * 0.05];
    const HT = heartState(t, k);
    const covered = HT.m >= 0.999 && HT.full;      // the heart disc covers the whole frame: the lap world is not drawn in 2D
    // the pane is drawn in world space (camera = identity) and the GL maps screen -> pane, so camera moves never rebuild it
    const met = t >= 48.75;
    const P = { met, fields: met ? NS.snap(fieldsA, 6) : 1, sil: met ? NS.snap(silA, 12) : 1, silCol: met ? '#2A1458' : '#1E1458' };
    P.dusk = met && P.sil < 1;          // while the figure dissolves its glass shows the dusk sky (never the pink: no mauve mud)
    V2.L.pane(g => paneDraw(g, P), 'a3_lap|' + (met ? 'met' : 'head') + '|' + P.fields + '|' + P.sil + (P.dusk ? '|dusk' : ''));
    const paneT = [1 / k, -c.ox / k, -c.oy / k, 0];
    // ---- the cloud lens, captions measured first (calm zones)
    const cloudA = (t < 42.75 ? 1 : t < 48.75 ? 0 : 1) * (1 - sImag) * (covered ? 0 : 1);
    const cloudMelt = t < 50.19 ? 0 : Math.round(sImag * 8) / 8;     // 8 cached melt steps (the cloud sprite is keyed by it)
    const cl = cloudA > 0.01 ? V2.grab.cloudLens(toS(CLOUD)[0], toS(CLOUD)[1], CLOUDSC * k, { alpha: cloudA, melt: cloudMelt, lens: 0.16 }) : { uBody2: [0, 0, 1, 1], uLens2: 0 };
    const capBoxes = [];
    if (t < 42.6) capBoxes.push(V2.type.measure(ctx, t, c5Spec()).box);
    else if (t < 43.7) capBoxes.push(V2.type.measure(ctx, t, v24Spec()).box);
    else if (t < 44.9) capBoxes.push(V2.type.measure(ctx, t, v24bSpec()).box);
    else if (t < 48.6) capBoxes.push([140, 160, 940, 300]);
    else if (Math.round(t * 30) >= Math.round(49.44 * 30)) capBoxes.push([170, 140, 910, 280]);
    // ---- GL uniforms
    const sw = sunW(t), sunS = toS(sw);
    const fold = t < 52.44 ? 0 : E.outCubic(R(t, 52.44, 53.1));            // the sun folds into the beam's hot spot (visible on the 52.50 beat frame)
    const whiten = t < 52.44 ? 0 : E.smooth(R(t, 52.44, 52.8));
    const sunK = (t < 40.6 ? lerp(1.366, 1, E.inOutCubic(R(t, 39.0, 40.6))) : 1) * k * (1 - fold);
    const pulse = 1 + 0.03 * Math.exp(-(V2.beat(t).ph * 0.75) / 0.12) * (t < 49.5 ? 1 : 0);
    const ringR = [1.05, 1.25, 1.55, 1.90].map(m => m * SUNU * sunK * pulse);
    const sunCols = ['#FFFFFF', '#FFE45C', '#FF8A1F', '#FF6FB5', '#22E4FF'].map(h => V2.mixHex(h, '#FFFFFF', whiten));
    // the rosette (around his body; opening on the music-box notes and the sung words)
    const ROPEN = [47.25, 42.75, 43.5, 44.25, 45.0, 45.75, 46.5];
    const op = new Float32Array(7);
    // (final pass) the opening starts one frame early, so the note frame already shows about 40% (outBack): the circle
    // reads ON the music-box plink, not two frames after it
    for (let i = 0; i < 7; i++) op[i] = t < ROPEN[i] - 1 / 30 ? 0 : E.outBack(R(t, ROPEN[i] - 1 / 30, ROPEN[i] + 0.27), 1.6) * (1 - sImag);
    // the centre circle (his heart) opens on "pen" but is already a soft glass behind him from 45.0
    op[0] = Math.max(op[0], t >= 45.0 ? 0.55 * E.smooth(R(t, 45.0, 45.4)) * (1 - sImag) : 0);
    const roseOn = t >= 42.75 && sImag < 1;
    const bt = V2.beat(t), bAge = bt.ph * 0.75;
    const ringsOn = t >= 42.75 && t < 49.5;
    const penAge = t - 47.25;
    const penGlow = t >= 47.25 && t < 49.5 ? V2.env(t, 47.25, 1, 0.28) : 0;
    const wRot = TAU / 32 * NS.click(t, 0.1) + 0.05 + 0.07 * (t - 39);             // half a wedge per beat + a slow turn
    const wedgeA = t < 42.75 ? 1 : t < 49.5 ? 0.45 : 0.40 * (1 - 0.35 * sImag) * (1 - fold);
    const riseA = t < 42.75 ? 0.8 : 0;          // (the rising rays belong to the headless view)
    const curlA = t < 42.75 ? 0 : t < 48.75 ? 0.85 : 0;
    const beamA = E.smooth(R(t, 52.44, 52.8)) * (1 + 0.25 * E.smooth(R(t, 53.4, 54.0)));
    const rise0 = toS([540, 1720]);
    const u = Object.assign({
      uCamL: [k, c.ox, c.oy, HZ], uSunL: [sunS[0], sunS[1], fold < 0.999 ? 1 : 0, 1],
      uSunR: ringR, uSunP: [ringR[3] + 7 * sunK, Math.max(0.5, 3.6 * sunK), 1.8 * sunK, 1.25], uSunCol: V2.linArr(sunCols),
      uWedge: [wedgeA, wRot, 16, fieldsA],
      uRise: [riseA, rise0[0], rise0[1], 0.04 * Math.floor(V2.frame(t) / 4) * 4 / 30], uRiseK: [4.0 * (t - 39), 0, 0, 0],
      uCurl: [curlA, heart[0], heart[1], (t - 42.75) * 0.9],
      uRingG: [heart[0], heart[1], 40 + bAge * 560, ringsOn ? 0.85 * Math.exp(-bAge / 0.30) : 0],
      uRingP: [50 + Math.max(0, penAge) * 620, penAge >= 0 && penAge < 1.4 && t < 49.5 ? 1.3 * Math.exp(-penAge / 0.36) : 0, 20, 0],
      uSoft: [heart[0], heart[1], HT.r, t >= 42.75 && t < 44 ? V2.env(t, 42.75, 1, 0.45) : 0],
      uHeartM: [heart[0], heart[1], HT.r, 26], uHeartK: [HT.ring, HT.m, 0, 0], uDusk: [dusk, 0, 0, 0],
      uRose: [roseC[0], roseC[1], ROSE_D * k, ROSE_R * k], uRoseRot: -Math.PI / 2 + 0.07 * (t - 42.75), uRoseCol: V2.linArr(['#FFF3C4', '#FF8FB1', '#FFC94D', '#B9A3FF', '#FF9E7A', '#7FF0E0', '#FF6FB5']),
      uRoseOpen: { v1: roseOn ? op : new Float32Array(7) }, uRoseQ: [0.62, 0.22, penGlow * 1.2, 0],
      uLens: t < 42.75 ? 0.3 : t < 49.5 ? 0.15 : t < 51.69 ? 0.3 : 0.3 * (1 - sExam), uTint: 0.6, uPaneT: paneT,
    }, V2.grab.uniforms(G, M, { k, ox: c.ox, oy: c.oy }), cl,
    V2.L.calm(capBoxes.map(b => ({ rect: b, pad: t < 42.75 ? 96 : 40 })).concat([{ ell: [Gs[0], Gs[1], Gs[2] * 1.3, Gs[3] * 1.25] }]), { floor: 0.14, ellFloor: 0.45 }));
    if (!NS.dbg().noGL) V2.L.render(NS.LAPKEY(t), u, { bloomK: 0.22 + 0.10 * (t >= 42.75 && t < 49.5 ? 1 : 0) + 0.10 * beamA, thresh: 0.80, levels: 4, sat: 1.10, vig: 0.26, bleed: 0.14, vigCol: t < 42.75 ? '#1B2A8C' : (t < 49.5 ? '#3A0830' : '#14123A') });

    // ---- crisp: the lap world (outside the heart disc), world space
    const outside = () => { if (HT.m <= 0.001) return; const p = new Path2D(); p.rect(-10, -10, 1100, 1370); p.moveTo(heart[0] + HT.r, heart[1]); p.arc(heart[0], heart[1], HT.r, 0, TAU); ctx.clip(p, 'evenodd'); };
    // the figure's light lines leave as the heart opens (their halos are not clipped) and return as it closes
    const cA = silA * (t < 42.75 ? 1 : t < 48.75 ? 1 - E.smooth(R(t, 42.75, 42.81)) : E.smooth(R(t, 48.95, 49.35)));
    ctx.save(); V2.camera(ctx, null); outside();
    V2.camera(ctx, NS.mat(c));
    if (cA > 0.01 && !covered && !NS.dbg().noLines) {
      const gold = { core: '#FFE6A8', halo: '#FFC23D', w: 4.6, taper: [0.10, 0.0, 0.06, 0.5], gw: 13, ga: 0.55, alpha: cA };
      CONT.forEach(pts => V2.lightLine(ctx, pts, gold));
      const inner = Object.assign({}, gold, { w: 3.4, taper: [0.15, 0.2, 0.2, 0.2], ga: 0.35, alpha: cA * 0.85 });
      ARM.forEach(pts => V2.lightLine(ctx, pts, inner));
      FORE.forEach(pts => V2.lightLine(ctx, pts, Object.assign({}, inner, { alpha: cA * 0.7 })));
      SHIN.forEach(pts => V2.lightLine(ctx, pts, Object.assign({}, inner, { alpha: cA * 0.75, taper: [0.25, 0.1, 0.35, 0.1] })));
      HANDS.forEach(pts => V2.lightLine(ctx, pts, Object.assign({}, inner, { w: 4, alpha: cA * 0.95, taper: [0.3, 0.1, 0.3, 0.2] })));
      V2.lightLine(ctx, THUMBS, Object.assign({}, inner, { w: 3, alpha: cA * 0.8 }));
      // the head-space horizon, the field edges and the road (its dashes streaming toward you), drawn in light
      if (fieldsA > 0.02) {
        const hL = hitH(FA[0])[0], hR = hitH(FA[FA.length - 1])[0]; const hp = []; for (let x = hL; x <= hR + 1; x += (hR - hL) / 20) hp.push([x, hzW(x) - 0.5]);
        V2.lightLine(ctx, hp, { core: '#FFF6DA', halo: '#FFE45C', w: 2.6, taper: [0.06, 0.2, 0.06, 0.2], gw: 10, ga: 0.35, alpha: 0.8 * fieldsA, op: 'lighter' });
        roadDashes(ctx, t, fieldsA);
        for (let i = 0; i < FA.length; i++) { const h = hitH(FA[i]); const d = dirOf(FA[i]); const sN = (FANO[1] - NECK[1] + 10) / Math.cos(FA[i]), p0 = [FANO[0] + d[0] * sN, FANO[1] + d[1] * sN]; const edge = i === 0 || i === FA.length - 1;
          V2.lightLine(ctx, [p0, [lerp(p0[0], h[0], 0.5), lerp(p0[1], h[1], 0.5)], [h[0], h[1]]], { core: '#FFF8E8', halo: edge ? '#FFC23D' : '#FFF3C4', w: edge ? 3.6 : 2.6, taper: [0.5, 0.0, 0.2, 0.6], gw: edge ? 12 : 6, ga: edge ? 0.45 : 0.18, alpha: (edge ? 0.9 : 0.5) * fieldsA, op: 'lighter' }); }
      }
    }
    // the cloud (it can stay; it melts on "don't imagine.")
    if (cloudA > 0.01) V2.grab.cloud(ctx, t, CLOUD[0], CLOUD[1], CLOUDSC, { alpha: cloudA, melt: cloudMelt, lens: 0.16 });
    V2.camera(ctx, null);
    ctx.restore();
    if (beamA > 0.01) beam2d(ctx, sunS, Gs, beamA, 30 + 10 * E.smooth(R(t, 53.3, 54.0)));
    // ---- the rosette's glints and the ensō (screen space, over the heart)
    if (roseOn && !NS.dbg().noLines) roseGlints(ctx, t, op, roseC, k, Gs, sImag);
    const ensoDraw = t < 45.0 ? 0 : E.outCubic(R(t, 45.0, 47.25)) * (1 - E.inOutSine(R(t, 51.75, 52.35)));
    if (ensoDraw > 0.002 && !NS.dbg().noLines) enso(ctx, t, roseC, ENSO_R * k, k / KM, ensoDraw, t < 47.4);
    // motes of light in the head-space and the heart space (the line layer: gone on "don't think.")
    V2.camera(ctx, NS.mat(c));
    const moteA = (t < 49.5 ? 1 : 1 - sThink);
    if (moteA > 0.01) motes(ctx, t, moteA, t >= 42.75 && t < 49.5);
    // the silhouette dissolves into slow rising motes (don't control)
    if (t >= 52.44) dissolve(ctx, t);
    // him: in the cupped hands (the orb beside him like a tiny sun)
    const Mdraw = t >= 50.94 ? Object.assign({}, typeof M === 'string' ? V2.grab.MOODS[M] : M, { off: 'rgba(0,0,0,0)' }) : M;
    const hm = t < 42.75 ? MJOY : t < 50.25 ? 'metta' : V2.grab.mixMood('metta', 'asleep', Math.round(E.smooth(R(t, 50.25, 52.8)) * 4) / 4);
    if (!NS.dbg().noGrab) V2.grab.draw(ctx, G, Mdraw, face(t), { glass: 'gl', handMood: hm, fringe: t < 50.94 ? 2.5 : 0 });
    const orbA = (t < 39.9 ? E.smooth(R(t, 39.3, 39.9)) : 1) * (1 - E.smooth(R(t, 50.94, 51.4)));
    if (orbA > 0.01) { const ob = [ORB[0] + 3 * V2.osc(t, 40), ORB[1] + 3 * V2.osc(t, 20, 1) + (t < 42.75 ? hop(t).y * 0.6 : 0)]; V2.post(cx => { cx.save(); cx.setTransform(k, 0, 0, k, c.ox, c.oy); V2.grab.orb(cx, t, ob[0], ob[1], ORBR, { alpha: orbA, lit: 1.1 }); cx.restore(); }); }
    V2.camera(ctx, null);

    // ---- type
    if (NS.dbg().noType) return;
    if (t < 42.6) c5Type(ctx, t);
    // "free." rides the 39.0 cut on the sun (scaled with the pull-back) and lets go by 39.35
    if (t < 39.35 && NS.drop) {
      const s = k / 1.65, m = [s, 0, 0, s, sunS[0] - NS.drop.C[0] * s, sunS[1] - NS.drop.C[1] * s];
      V2.camera(ctx, m); NS.drop.drawFree(ctx, t, 1 - E.smooth(R(t, 39.18, 39.35))); V2.camera(ctx, null);
    }
    // PLATE 02 / ON HAVING / NO HEAD: the headless joke. (final pass) It leaves on the 42.75 cut to metta and does not
    // come back with the ease-out (it read as a leftover over the rosette); TILOPA'S is the only readout from 49.5.
    if (t >= 39.9 && t < 42.75) {
      const a = 1;
      if (a > 0.01) {
        // (integration: contrast) one dark glass chip behind the whole block instead of a soft slab per line, so the
        // readout reads on the bright head-space (1.4:1 before) without stacked-slab banding
        const nl = t >= 40.55 ? 3 : t >= 40.2 ? 2 : 1;
        V2.shade(ctx, [64, 524, 92 + 9 * 21.7 + 30, 568 + 44 * (nl - 1) + 40], '#14104A', 0.88 * a, { feather: 16, r: 16 });
        const mo = { size: 36, weight: '600', col: '#E8F7FF', outline: '#14104A', cps: 30, a };
        NS.monoOutlined(ctx, t, 'PLATE 02', 92, 568, Object.assign({ t0: 39.9 }, mo));
        if (t >= 40.2) NS.monoOutlined(ctx, t, 'ON HAVING', 92, 612, Object.assign({ t0: 40.2 }, mo));
        if (t >= 40.55) NS.monoOutlined(ctx, t, 'NO HEAD', 92, 656, Object.assign({ t0: 40.55, cursor: t < 48.75 }, mo));
      }
    }
    // metta captions: white on the raspberry top of the heart space, a light pane and a tight deep shadow-halo
    const metType = { core: '#FFF6EE', halo: '#7A1240', haloMode: 'shadow', shadowA: 0.92 };
    const early = t < 42.87;
    // (final pass) the first frames after the cut sit on the warm bloom: a saturated deep rose there (#5A0E36 at 0.92 read
    // as a brown slab), easing to the section pane
    const metPane = (words, a, pad) => V2.shade(ctx, V2.type.box(words, pad), early ? '#7A1046' : '#5A0E36', (early ? 0.86 : 0.30) * a, { feather: early ? 80 : 110 });
    if (t >= 42.75 && t < 43.68) { const a = 1 - R(t, 43.6, 43.68); const sp = v24Spec(); metPane(V2.type.measure(ctx, t, sp).words, a, 96); V2.type.light(ctx, t, Object.assign(sp, metType, { alpha: a, lit: V2.lit(t, { word_t: sp.word_t }, 'prelit-blaze', { pre: early ? 0.9 : 0.75 }) })); }
    if (t >= 43.88 && t < 44.84) { const a = 1 - R(t, 44.76, 44.84); const sp = v24bSpec(); metPane(V2.type.measure(ctx, t, sp).words, a, 96); V2.type.light(ctx, t, Object.assign(sp, metType, { alpha: a, lit: V2.lit(t, { word_t: sp.word_t }, 'prelit-blaze', { pre: 0.75 }) })); }
    if (t >= 45.0 && t < 48.5) loveHimOpen(ctx, t, metType, metPane);
    if (t >= 47.0 && t < 48.7) NS.monoOutlined(ctx, t, '(may you be happy. even you.)', 540, 1192, { size: 40, weight: '500', col: '#FFF6EE', outline: '#3E0826', pane: '#3E0826', paneA: 0.5, t0: 47.0, cps: 40, align: 'center', a: 1 - R(t, 48.6, 48.7) });
    if (Math.round(t * 30) >= Math.round(49.44 * 30)) tilopaType(ctx, t);
  };

  // C5 "you are / the sky." on the deep head-space sky: pre-lit at 0.6, each sung word blazes with a gold bloom. Row 2
  // waits until "free." has let go (39.25 to 39.4); its first word is at 40.5.
  function c5Type(ctx, t) {
    const a = 1 - R(t, 42.5, 42.6);
    const sp = c5Spec(); const ws = V2.type.measure(ctx, t, sp).words;
    const a2 = E.smooth(R(t, 39.25, 39.4));
    V2.shade(ctx, V2.type.box(a2 > 0.01 ? ws : ws.slice(0, 2), 112), DEEP, 0.68 * a);
    const lv = V2.lit(t, { word_t: sp.word_t }, 'prelit-blaze', { pre: 0.6 });
    const r1 = { words: sp.words.slice(0, 2), word_t: sp.word_t.slice(0, 2), rows: [sp.rows[0]], kind: 'sung' };
    const r2 = { words: sp.words.slice(2), word_t: sp.word_t.slice(2), rows: [sp.rows[1]], kind: 'sung' };
    const lv1 = lv.slice(0, 2), lv2 = lv.slice(2); lv1.halo = lv.halo.slice(0, 2); lv2.halo = lv.halo.slice(2);
    const st = { core: '#FFFFFF', halo: DEEP, haloMode: 'shadow', shadowA: 0.95 };
    const w1 = V2.type.light(ctx, t, Object.assign(r1, st, { alpha: a, lit: lv1 }));
    V2.type.blazeWide(w1, lv1, lv1.halo, '#FFC23D', a);
    if (a2 > 0.01) { const w2 = V2.type.light(ctx, t, Object.assign(r2, st, { alpha: a * a2, lit: lv2 })); V2.type.blazeWide(w2, lv2, lv2.halo, '#FFC23D', a * a2); }
    // 41.25 celesta A6: a spark on "sky"
    const sky = ws[3]; V2.fx.sparks(ctx, t, 41.25, sky.x + sky.width * 0.9, sky.y - sky.size * 0.72, ['#FFFFFF', '#FFE45C'], { r: 74, n: 6 });
  }
  // "love him open." (C6: love, him, o, pen): "open." blazes on "o" and pulses on "pen", its tracking growing 46.5 to 48.0
  function loveHimOpen(ctx, t, st, pane) {
    const a = 1 - R(t, 48.4, 48.5), size = 124, y = 240;
    const tr = 22 * E.outCubic(R(t, 46.5, 48.0)) / 4;
    ctx.save(); ctx.font = V2.type.font('sung', size);
    const wA = ctx.measureText('love him').width + ctx.measureText(' ').width, wB = ctx.measureText('open.').width + tr * 4;
    ctx.restore();
    let sz = size; const tot = wA + wB; if (tot > 940) sz = size * 940 / tot;
    const x0 = 540 - (wA + wB) * (sz / size) / 2;
    const rowsA = { words: ['love', 'him'], word_t: [C6.word_t[0], C6.word_t[1]], rows: [{ n: 2, size: sz, y, x: x0, align: 'left' }], kind: 'sung' };
    const rowsB = { words: ['open.'], word_t: [C6.word_t[2]], rows: [{ n: 1, size: sz, y, x: x0 + wA * (sz / size), align: 'left', track: tr }], kind: 'sung' };
    const wsA = V2.type.measure(ctx, t, rowsA).words, wsB = V2.type.measure(ctx, t, rowsB).words;
    pane(wsA.concat(wsB), a, 110);
    const lvA = V2.lit(t, { word_t: rowsA.word_t }, 'prelit-blaze', { pre: 0.75 });
    V2.type.light(ctx, t, Object.assign(rowsA, st, { alpha: a, lit: lvA }));
    V2.type.blazeWide(wsA, lvA, lvA.halo, '#FFC23D', a);
    const lv = V2.lit(t, { word_t: rowsB.word_t }, 'prelit-blaze', { pre: 0.75 });
    const kk = Math.round(t * 30) - Math.round(C6.word_t[3] * 30); if (kk >= 0 && kk < 4) lv.halo[0] = 1.3 - 0.3 * kk / 4;
    const wB2 = V2.type.light(ctx, t, Object.assign(rowsB, st, { alpha: a, lit: lv }));
    V2.type.blazeWide(wB2, lv, lv.halo, '#FFC23D', a);
  }
  // Tilopa's words: each pops in on its beat (shown 0.06 s early, on the same frame as its level), replaces the last,
  // smaller each time; the halo steps from gold to pearl
  function tilopaType(ctx, t) {
    const f = Math.round(t * 30);
    let i = -1; for (let j = 0; j < TIL.length; j++) if (f >= Math.round((TIL[j][0] - 0.06) * 30)) i = j;
    if (i < 0) return;
    const [t0, words, size] = TIL[i];
    const age = t - (t0 - 0.06);
    const pop = 1 + 0.10 * (1 - E.outBack(R(age, 0, 0.16), 2.2));
    const spec = { words, word_t: [t0, t0], rows: [{ n: 2, size: size * pop, y: 212 }], kind: 'light' };
    const ws = V2.type.measure(ctx, t, spec).words;
    // on the pink sky (the first two words) the gold halo stays small and the pane a little denser: a gold bloom on pink
    // would eat the contrast; the pop (scale 1.1 -> 1) is the event there
    V2.shade(ctx, V2.type.box(ws, 124), i < 2 ? '#5A0E36' : '#14123A', i < 2 ? 0.52 : 0.40, { feather: 110 });
    const lv = V2.lit(t, { word_t: [t0, t0] }, 'prelit-blaze', { lead: 0.06, pre: 0 });
    if (i < 2) lv.halo = lv.halo.map(h => Math.min(h, 1.08));
    V2.type.shadowHalo(ctx, ws, lv, i < 2 ? '#5A0E36' : '#0E0C2A', 0.95);
    V2.type.light(ctx, t, Object.assign(spec, { core: '#F4EFD8', halo: TIL_HALO[i], haloMode: 'glow', haloA: i < 2 ? 0.26 : 0.40, lit: lv }));
    if (t < 51.6) {
      const a = E.smooth(R(t, 49.5, 49.6)) * (1 - R(t, 51.5, 51.6));
      V2.shade(ctx, [64, 524, 92 + 9 * 21.7 + 30, 568 + 44 * (t >= 49.8 ? 1 : 0) + 40], '#2A0E3A', 0.88 * a, { feather: 16, r: 16 });   // (integration: one chip)
      NS.monoOutlined(ctx, t, "TILOPA'S", 92, 568, { size: 36, weight: '600', col: '#F4EFD8', outline: '#2A0E3A', a, t0: 49.5, cps: 30 });
      NS.monoOutlined(ctx, t, 'SIX WORDS', 92, 612, { size: 36, weight: '600', col: '#F4EFD8', outline: '#2A0E3A', a, t0: 49.8, cps: 30 });
    }
  }
  // the road's lemon centre line as dashes of light streaming from the horizon toward the neck (toward you), bigger and
  // farther apart near the horizon (reverse perspective)
  function roadDashes(ctx, t, A) {
    const h0 = hitH(0), y0 = NECK[1] - 40, y1 = h0[1] + 4;
    const p = [];
    for (let j = 0; j < 9; j++) {
      const w = ((j + (t - 39) * 0.9) % 9 + 9) % 9 / 9;          // 0 at the horizon -> 1 at the neck: moves toward you
      const v = Math.pow(w, 1.35), ya = lerp(y1, y0, v), len = lerp(30, 9, v), wd = lerp(7, 2.6, v);
      if (ya + len > y0) continue;
      p.push([[540, ya], [540, Math.min(y0, ya + len)], wd, Math.min(1, w * 8) * Math.min(1, (1 - w) * 6)]);
    }
    p.forEach(([a, b, wd, al]) => V2.lightLine(ctx, [a, [540, (a[1] + b[1]) / 2], b], { core: '#FFF3A6', halo: '#FF9A1F', w: wd, taper: [0.2, 0.3, 0.2, 0.3], gw: wd * 3, ga: 0.5, alpha: A * al, op: 'lighter' }));
  }
  // the rosette's 2 px white glints (full res) on each open circle's upper-left, light-facing edge; never across his body
  function roseGlints(ctx, t, op, rc, k, Gs, sImag) {
    const p = new Path2D(); let any = false;
    const rot = -Math.PI / 2 + 0.07 * (t - 42.75);
    for (let i = 0; i < 7; i++) {
      const o = op[i]; if (o < 0.05) continue;
      let cx = rc[0], cy = rc[1];
      if (i > 0) { const ph = rot + (i - 1) * TAU / 6; cx += ROSE_D * k * o * Math.cos(ph); cy += ROSE_D * k * o * Math.sin(ph); }
      const r = ROSE_R * k * lerp(0.6, 1, Math.min(1, o)) - 1.5;
      p.moveTo(cx + Math.cos(Math.PI * 1.02) * r, cy + Math.sin(Math.PI * 1.02) * r); p.arc(cx, cy, r, Math.PI * 1.02, Math.PI * 1.62); any = true;
    }
    if (!any) return;
    const A = 0.7 * (1 - sImag);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const clip = new Path2D(); clip.rect(0, 0, 1080, 1350); clip.ellipse(Gs[0], Gs[1], Gs[2] * 1.08, Gs[3] * 1.06, 0, 0, TAU); ctx.clip(clip, 'evenodd');
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.globalAlpha = A; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke(p);
    ctx.restore();
    V2.glow(g => { g.globalAlpha = 0.4 * A; g.strokeStyle = '#FFE0EC'; g.lineWidth = 6; g.stroke(p); });
  }
  // the gold dry-brush ensō: 28 bristles of light (LOOK 2.4 BRISTLE STROKE), loaded at the head (white-hot, wide), the
  // body #FFC23D with cream cores and orange dry hairs, splitting into dry strands over the last quarter; the gap stays
  // open at the top right. Drawn additively at full res; draw 0..1 (drawing on, and un-painting from the tail in Tilopa).
  const ENSO_A0 = -0.52, ENSO_SPAN = 0.925 * TAU, NB = 28;
  const BR = (() => { const out = []; for (let i = 0; i < NB; i++) { const o = (i + 0.5) / NB - 0.5 + (hash(i * 3.3) - 0.5) * 0.3 / NB; const h3 = hash(i * 7.7);
    out.push({ o, s0: 0.03 * hash(i * 1.7), s1: Math.min(1, 0.80 + 0.2 * hash(i * 5.1) - 0.32 * Math.abs(o) * 2 * hash(i * 9.3)), col: h3 < 0.26 ? '#FFF3C4' : h3 < 0.80 ? '#FFC23D' : '#FF9A1F', w: 1.7 + 1.5 * hash(i * 2.9), a: 0.62 + 0.3 * hash(i * 4.4) }); } return out; })();
  // the bristles are drawn once into a cached sprite per scale bucket (metta close-up / the lap framing) and revealed with
  // an angular clip up to `draw` (s <= draw is exactly angle <= a0 + draw * span), so drawing on and un-painting cost one
  // clipped image per frame instead of 28 long strokes
  const ensoCache = new Map();
  function ensoSprite(kRef) {
    let c = ensoCache.get(kRef); if (c) return c;
    const sc = kRef / KM, Rr = ENSO_R * kRef, half = Math.ceil(Rr + 80 * Math.max(sc, 0.5) + 20);
    const cv = document.createElement('canvas'); cv.width = cv.height = 2 * half;
    const g = cv.getContext('2d'), C = [half, half], N = 132, wd = Math.max(0.7, sc);
    const W = s => lerp(92, 34, U.smooth(s)) * (1 + 0.12 * Math.sin(s * 5)) * sc;
    const wob = s => (7 * Math.sin(s * 7 + 1) + 4 * Math.sin(s * 17)) * sc;
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    BR.forEach((b, i) => {
      const p = new Path2D(); let pen = false;
      for (let j = 0; j <= N; j++) {
        const sv = lerp(b.s0, b.s1, j / N);
        const dry = U.smooth(clamp((sv - 0.62) / 0.38));
        if (hash(Math.floor(sv * 46) * 1.3 + i * 13.7) < dry * 0.6) { pen = false; continue; }   // the brush runs dry: broken hairs
        const a = ENSO_A0 + sv * ENSO_SPAN, r = Rr + wob(sv) + b.o * W(sv), x = C[0] + Math.cos(a) * r, y = C[1] + Math.sin(a) * r;
        if (!pen) { p.moveTo(x, y); pen = true; } else p.lineTo(x, y);
      }
      g.strokeStyle = b.col; g.globalAlpha = b.a; g.lineWidth = b.w * wd; g.stroke(p);
    });
    c = { cv, half, kRef }; ensoCache.set(kRef, c);
    return c;
  }
  function enso(ctx, t, C, Rr, sc, draw, drawing) {
    const k = sc * KM, sp = ensoSprite(k >= 1.5 ? 2.32 : 1.03), f = k / sp.kRef;
    const W = s => lerp(92, 34, U.smooth(s)) * (1 + 0.12 * Math.sin(s * 5)) * sc;
    const wob = s => (7 * Math.sin(s * 7 + 1) + 4 * Math.sin(s * 17)) * sc;
    const at = (s, off) => { const a = ENSO_A0 + s * ENSO_SPAN, r = Rr + wob(s) + off * W(s); return [C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r]; };
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (draw < 0.999) { const cl = new Path2D(); cl.moveTo(C[0], C[1]); cl.arc(C[0], C[1], sp.half * f * 1.5, ENSO_A0 - 0.06, ENSO_A0 + draw * ENSO_SPAN); cl.closePath(); ctx.clip(cl); }
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(sp.cv, C[0] - sp.half * f, C[1] - sp.half * f, 2 * sp.half * f, 2 * sp.half * f);
    ctx.restore();
    // the soft gold light of the stroke (one wide halo along its centre line, wider where the brush was loaded)
    const hp1 = new Path2D(), hp2 = new Path2D(), sEnd = Math.min(draw, 0.98); let s2 = false;
    for (let j = 0; j <= 60; j++) { const s = sEnd * j / 60, q = at(s, 0); if (s <= 0.45) { if (j === 0) hp1.moveTo(q[0], q[1]); else hp1.lineTo(q[0], q[1]); } if (s >= 0.43) { if (!s2) { hp2.moveTo(q[0], q[1]); s2 = true; } else hp2.lineTo(q[0], q[1]); } }
    V2.glow(g => { g.lineCap = 'butt'; g.strokeStyle = '#FF9A1F'; g.globalAlpha = 0.40; g.lineWidth = 64 * sc; g.stroke(hp1); g.globalAlpha = 0.32; g.lineWidth = 36 * sc; g.stroke(hp2); });
    // the moving brush: a gold glint where the hairs touch, fading as the brush runs dry
    if (drawing && draw < 0.995) { const q = at(draw, 0), wet = 1 - U.smooth(clamp((draw - 0.3) / 0.6)); V2.glow(g => { g.globalAlpha = 0.6 * wet + 0.15; g.fillStyle = '#FFC23D'; g.beginPath(); g.arc(q[0], q[1], 22 * sc, 0, TAU); g.fill(); });
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.65 * wet; ctx.fillStyle = '#FFF3C4'; ctx.beginPath(); ctx.ellipse(q[0], q[1], 6 * sc, 12 * sc, ENSO_A0 + draw * ENSO_SPAN, 0, TAU); ctx.fill(); ctx.restore(); }
  }
  // Tilopa's one white beam (2D, screen space): a thin hot core inside a soft body, fading in from the head-space above;
  // a cached sprite (the camera is stopped dead from 52.5, so the geometry is fixed; the width is snapped)
  const beamCache = new Map();
  function beamSprite(w, h) {
    const key = w + 'x' + h; let c = beamCache.get(key); if (c) return c;
    const W = Math.ceil(w * 5), cv = document.createElement('canvas'); cv.width = W; cv.height = h;
    const g = cv.getContext('2d'), x = W / 2;
    const hg = g.createLinearGradient(0, 0, W, 0);
    [[0, 0], [0.18, 0.05], [0.32, 0.20], [0.42, 0.50], [0.47, 0.85], [0.5, 1], [0.53, 0.85], [0.58, 0.50], [0.68, 0.20], [0.82, 0.05], [1, 0]].forEach(([u, a]) => hg.addColorStop(u, `rgba(236,240,255,${a * 0.55})`));
    g.fillStyle = hg; g.fillRect(0, 0, W, h);
    const cg = g.createLinearGradient(x - w * 0.16, 0, x + w * 0.16, 0); cg.addColorStop(0, 'rgba(255,255,255,0)'); cg.addColorStop(0.5, 'rgba(255,255,255,1)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = cg; g.fillRect(x - w * 0.16, 0, w * 0.32, h);
    g.globalCompositeOperation = 'destination-in';
    const vg = g.createLinearGradient(0, 0, 0, h); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.22, 'rgba(0,0,0,1)'); vg.addColorStop(0.94, 'rgba(0,0,0,1)'); vg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = vg; g.fillRect(0, 0, W, h);
    c = { cv, W }; beamCache.set(key, c); if (beamCache.size > 24) beamCache.delete(beamCache.keys().next().value);
    return c;
  }
  function beam2d(ctx, sunS, Gs, A, w) {
    w = Math.round(w); const x = Gs[0], y0 = Math.round(sunS[1] - 230), y1 = Math.round(Gs[1] + 30), h = y1 - y0;
    const sp = beamSprite(w, h);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, A);
    ctx.drawImage(sp.cv, x - sp.W / 2, y0);
    ctx.restore();
    V2.glow(g => { g.globalAlpha = 0.55 * Math.min(1, A); g.drawImage(sp.cv, x - sp.W, y0, sp.W * 2, h); }, { wide: true });
  }
  // motes: small dots of light drifting up (head-space gold and white; in the heart space rose and gold)
  function motes(ctx, t, A, heartSpace) {
    const p = new Path2D(), cols = heartSpace ? ['#FFD27A', '#FFF3C4'] : ['#FFF3C4', '#FFFFFF'];
    for (let i = 0; i < 22; i++) {
      const sp = 0.05 + 0.04 * hash(i * 3.3), ph = hash(i * 7.1);
      const u = ((t * sp + ph) % 1 + 1) % 1;
      const x = HIM[0] + (hash(i * 1.9) - 0.5) * 760 + 30 * Math.sin(t * 0.6 + i), y = HIM[1] + 120 - u * 900;
      const r = 2.5 + 3 * hash(i * 5.7);
      p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU);
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7 * A; ctx.fillStyle = cols[1]; ctx.fill(p); ctx.restore();
    V2.glow(g => { g.globalAlpha = 0.6 * A; g.fillStyle = cols[0]; g.fill(p); });
  }
  // 52.5: the figure dissolves into slow motes rising from its contour
  const DIS = (() => { const out = []; const all = CONT[0].concat(CONT[1]); for (let i = 0; i < 46; i++) { const q = all[Math.floor(hash(i * 2.7) * all.length)]; out.push([q[0] + (hash(i * 4.1) - 0.5) * 40, q[1] + (hash(i * 6.3) - 0.5) * 40, hash(i * 9.9)]); } return out; })();
  function dissolve(ctx, t) {
    const u = t - 52.44, p = new Path2D(); let A = E.smooth(R(u, 0, 0.3)) * (1 - E.smooth(R(t, 53.5, 54.0)));
    if (A <= 0.01) return;
    DIS.forEach(([x, y, h], i) => { const born = h * 0.6; if (u < born) return; const a = u - born; const yy = y - a * (40 + 50 * h), xx = x + 12 * Math.sin(a * 1.3 + i); const r = 2.5 + 2.5 * h; p.moveTo(xx + r, yy); p.arc(xx, yy, r, 0, TAU); });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85 * A; ctx.fillStyle = '#FFE6A8'; ctx.fill(p); ctx.restore();
    V2.glow(g => { g.globalAlpha = 0.6 * A; g.fillStyle = '#FFC23D'; g.fill(p); });
  }
})();
