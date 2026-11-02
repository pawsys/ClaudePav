// V2 core: palettes (LOOK.md 2.7) as data, plus colour helpers.
// Each section: t0..t1, ground stops (top to bottom, or centre to edge for the hook), glass, light, figure, type.
// Builders read V2.PAL[key]; never hard-code a section's hexes twice.
(function () {
  const V2 = window.V2 = window.V2 || {};
  const { clamp, lerp } = V2.U;

  // ------------------------------------------------------------------ helpers
  const hex = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  V2.hex = hex;                                                   // '#RRGGBB' -> [r,g,b] 0..255
  V2.rgb01 = h => hex(h).map(v => v / 255);                       // -> [r,g,b] 0..1 (sRGB)
  V2.lin = h => hex(h).map(v => Math.pow(v / 255, 2.2));          // -> linear 0..1 (for GL uniforms)
  V2.rgba = (h, a = 1) => { const c = hex(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
  V2.mixHex = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(t))).toString(16).padStart(2, '0')).join(''); };
  // array of hexes -> {v3: Float32Array} of linear colours (for uniform vec3 arrays)
  V2.linArr = (cols, n = cols.length) => { const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const c = V2.lin(cols[i % cols.length]); a.set(c, i * 3); } return { v3: a }; };
  // saturation-keeping mix: lerp in linear light, then restore the saturation (and value) lerped between the ends,
  // so a crossfade between complements (pearl lilac -> amber) never passes through grey or beige
  V2.mixHexSat = (a, b, t) => {
    t = clamp(t); if (t <= 0) return a; if (t >= 1) return b;
    const A = hex(a).map(v => v / 255), B = hex(b).map(v => v / 255);
    const sv = c => { const M = Math.max(...c), m = Math.min(...c); return [M > 0 ? (M - m) / M : 0, M]; };
    const [sA, vA] = sv(A), [sB, vB] = sv(B);
    const L = A.map((v, i) => Math.pow(lerp(Math.pow(v, 2.2), Math.pow(B[i], 2.2), t), 1 / 2.2));
    const M = Math.max(...L, 1e-4), m = Math.min(...L), s0 = (M - m) / M, s1 = lerp(sA, sB, t), v1 = lerp(vA, vB, t);
    const k = s0 > 1e-4 ? s1 / s0 : 0;
    const out = L.map(v => { const x = M - (M - v) * k; return clamp(x / M * v1); });
    return '#' + out.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  };
  V2.luma = h => { const c = V2.rgb01(h); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  // hsv helpers (h in degrees)
  V2.toHsv = h => { const [r, g, b] = V2.rgb01(h); const M = Math.max(r, g, b), m = Math.min(r, g, b), d = M - m;
    let H = 0; if (d > 1e-6) { H = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4; H *= 60; if (H < 0) H += 360; }
    return [H, M > 0 ? d / M : 0, M]; };
  V2.fromHsv = (H, S, Vv) => { H = ((H % 360) + 360) % 360; const c = Vv * S, x = c * (1 - Math.abs((H / 60) % 2 - 1)), m = Vv - c;
    const [r, g, b] = H < 60 ? [c, x, 0] : H < 120 ? [x, c, 0] : H < 180 ? [0, c, x] : H < 240 ? [0, x, c] : H < 300 ? [x, 0, c] : [c, 0, x];
    return '#' + [r, g, b].map(v => Math.round(clamp(v + m) * 255).toString(16).padStart(2, '0')).join(''); };
  // the deep version of a glass colour: an ANALOGOUS hue shift toward the cool / crimson side plus a value drop, with
  // saturation kept high (lemon -> cadmium, orange -> vermilion, red -> crimson, magenta -> violet, cerulean ->
  // ultramarine, lime -> viridian, viridian -> teal). Warm hues turn toward crimson and keep a high value (dark orange
  // is brown).
  // Used by the IRIS value falloff (glass lit from the aperture, deep toward the frame edges). k scales the value drop.
  V2.deepHex = (h, k = 1) => {
    const [H, S, Vv] = V2.toHsv(h);
    let dh, v;
    if (S < 0.12) return V2.fromHsv(240, 0.35, Vv * (1 - 0.35 * k));          // near-white glass: toward pearl lilac
    if (H >= 35 && H < 75) { dh = -40; v = 0.84; }                            // yellow -> cadmium red (stays bright: dark orange is brown)
    else if (H >= 15 && H < 35) { dh = -32; v = 0.80; }                       // orange -> crimson
    else if (H >= 345 || H < 15) { dh = -16; v = 0.72; }                      // red -> crimson magenta
    else if (H >= 280) { dh = -26; v = 0.66; }                                // magenta / pink -> violet
    else if (H >= 240) { dh = 6; v = 0.58; }                                  // violet -> deep violet
    else if (H >= 190) { dh = Math.min(22, 236 - H); v = 0.66; }              // cerulean / blue -> ultramarine
    else if (H >= 140) { dh = 16; v = 0.56; }                                 // viridian / teal -> deep teal
    else { dh = 0.7 * (152 - H); v = 0.58; }                                  // lime / green -> viridian
    return V2.fromHsv(H + dh * k, Math.max(S, 0.85), Vv * (1 - (1 - v) * k));
  };

  // ------------------------------------------------------------------ fixed colours used everywhere
  V2.INK = '#1B1240';          // faces: deep indigo "lead came"
  V2.LEAD = '#0E0830';         // lead lines (never #000)
  V2.KNOT = { crust: '#140A2A', tangle: '#3A1C6E', edgeA: '#FF2E97', edgeB: '#1FA352', spark: ['#FF2E97', '#1FA352', '#B8FF2C', '#FFFFFF'] };
  V2.SPEC6 = ['#FF3B3B', '#FF9A1F', '#FFE53B', '#3DEB7A', '#3B8BFF', '#9B5BFF'];   // jewel fan
  V2.HOCKNEY6 = ['#2B4BFF', '#FF2E97', '#FF7A1A', '#FFE45C', '#B6F03C', '#7A2BD1'];

  // ------------------------------------------------------------------ sections (2.7)
  // fig: grabbygrab material {fill, fillA, core, halo, off}; type: {core, halo, pane, paneA, mode}
  // type.mode: 'glow' = complementary neon halo (dark grounds), 'shadow' = deep shadow-halo (light grounds)
  V2.PAL = {
    hook: {
      t0: 0, t1: 6, name: 'HOOK', ground: ['#1B1466', '#120A3E'], radial: true,
      glass: ['#2233D6', '#FF7A1A', '#1FAE7A', '#FF2E97', '#FFE45C', '#7A2BD1', '#1E9BE6', '#E8412B', '#B6F03C'], glassA: [0.55, 0.75], lead: '#0E0830',
      light: ['#E8F7FF', '#3DF5FF', '#C6A3FF'],
      fig: { fill: '#FF7A1A', fillA: 0.30, core: '#FFE2B0', halo: '#FF9A3D', off: '#2EE6FF', rim: '#1B1240' },
      type: { core: '#FFF8F2', halo: '#FF2E97', pane: '#140C4A', paneA: 0.50, mode: 'glow' },
    },
    guy: {
      t0: 6, t1: 9, name: 'SOME GUY', ground: ['#1B2A8C', '#1B2A8C'],
      glass: ['#FF8A1F', '#FF2E97', '#2233D6', '#2B4BFF'], light: ['#E8F7FF', '#7FD8FF', '#B6F03C', '#1FAE7A'],
      fig: { fill: '#E8F7FF', fillA: 0.0, core: '#E8F7FF', halo: '#7FD8FF', off: '#FF2E97' },
      type: { core: '#FFF8F2', halo: '#FF2E97', pane: '#120A3E', paneA: 0.45, mode: 'glow' },
    },
    all: {
      t0: 9, t1: 10.5, name: 'ALL', ground: ['#0A0618', '#0A0618'],
      glass: ['#FFE45C', '#FF7A1A', '#E8412B'], lead: '#0E0830', light: ['#FFF3C4', '#FFFFFF', '#48E5FF'],
      type: { core: '#FFF8F2', halo: '#FF2E97', pane: '#0A0618', paneA: 0, mode: 'glow' },
    },
    same: {
      t0: 10.5, t1: 12, name: 'SAME CAUSE', ground: ['#1B1466', '#1B1466'],
      glass: ['#1E4FD8', '#FF2E97', '#1FAE7A', '#FF7A1A'], panel: '#241A70', light: ['#E8F7FF', '#3DF5FF', '#C6A3FF'],
      fig: { fill: '#FF7A1A', fillA: 0.30, core: '#FFE2B0', halo: '#FF9A3D', off: '#2EE6FF', rim: '#1B1240' },
      type: { core: '#FFF8F2', halo: '#FF2E97', pane: '#140C4A', paneA: 0.55, mode: 'glow' },
    },
    saint: {
      t0: 12, t1: 13.3, name: 'SAINT', ground: ['#2A1A7A', '#1B1466'],
      glass: ['#FFE45C', '#FF8A1F', '#FF2E97', '#19C3D6', '#B6F03C', '#2B4BFF', '#9B5CFF'], lead: '#120A30',
      light: ['#FFC23D', '#FFE45C', '#FFFFFF'],
      fig: { fill: '#FF6B57', fillA: 0.30, core: '#FFE2B0', halo: '#FF9A3D', off: '#2EE6FF', rim: '#1B1240' },
      type: { core: '#FFF8F2', halo: '#2EE6FF', pane: '#140C4A', paneA: 0.50, mode: 'glow' },
    },
    plate: {
      t0: 13.3, t1: 15, name: 'PLATE 01', ground: ['#0E2C6E', '#163E8C'],
      glass: [], light: ['#E8F7FF', '#9FD8FF'],
      fig: { fill: '#E8F7FF', fillA: 0.0, core: '#E8F7FF', halo: '#9FD8FF', off: '#9FD8FF' },
      type: { core: '#FFF8F2', halo: '#FF2E97', pane: '#0E2C6E', paneA: 0, mode: 'glow', mono: '#E8F7FF' },
    },
    buzz: {
      t0: 15, t1: 17.55, name: 'IT BUZZES', ground: ['#0C0730', '#0C0730'], radial: true,
      glass: ['#2233D6', '#FF7A1A', '#1FAE7A', '#FF2E97', '#FFE45C', '#7A2BD1', '#1E9BE6', '#E8412B', '#B6F03C'], lead: '#0E0830',
      light: ['#E8F7FF', '#3DF5FF', '#C6A3FF'],
      fig: { fill: '#FF4A2A', fillA: 0.34, core: '#FFE2B0', halo: '#FF7A3D', off: '#2EE6FF', rim: '#1B1240' },
      type: { core: '#FFF8F2', halo: '#FF2E97', pane: '#120A3E', paneA: 0.55, mode: 'glow', mono: '#E8E4FF' },
    },
    tape: {
      t0: 17.55, t1: 18, name: 'TAPE-STOP', ground: ['#0C0730', '#2A2350'], lean: '#2A2350',
      type: { core: '#FFF8F2', halo: '#FF2E97', pane: '#120A3E', paneA: 0.55, mode: 'glow' },
    },
    look: {
      t0: 18, t1: 21, name: 'LOOK', ground: ['#0E0838', '#140C2A'],
      glass: ['#FFD9A0'], light: ['#FFE3A3', '#FFB45C', '#FF6A3D', '#FFF4D6'],
      fig: { fill: '#FFD9A0', fillA: 0.16, core: '#FFD9A0', halo: '#FFB45C', off: '#FF6A3D', rim: '#1B1240' },
      type: { core: '#FFF4D6', halo: '#FF9A3D', pane: '#0E0838', paneA: 0, mode: 'glow', mono: '#FFF4D6' },
    },
    unclench: {
      t0: 21, t1: 24, name: 'UN-CLENCH', ground: ['#0B0820', '#2B1550', '#6B3FA0'],
      glass: ['#FFE66B', '#FF9F43', '#FF5FA2', '#C77DFF', '#6FE3FF'], light: ['#FFE66B', '#FF9F43', '#FF5FA2', '#C77DFF', '#6FE3FF', '#FFF6E6'],
      fan: ['#FF3B3B', '#FF9A1F', '#FFE53B', '#3DEB7A', '#3B8BFF', '#9B5BFF'],
      fig: { fill: '#FFC9A3', fillA: 0.30, core: '#FFFFFF', halo: '#FF8FC0', off: '#FFE66B' },
      type: { core: '#FFF6E6', halo: '#FF8FC0', pane: '#2B1550', paneA: 0.40, mode: 'glow' },
    },
    sky: {
      t0: 24, t1: 30, name: 'YOU ARE THE SKY', ground: ['#0F5FC4', '#1E9BE6', '#63D2F0'], stops: [0, 0.6, 1],
      glass: ['#FFFFFF', '#FFD6EC', '#CBB8FF'], land: { trees: '#7A2BD1', tree2: '#36C95A', fields: ['#FF6FB5', '#B6F03C', '#36C95A'], road: '#FF7A1A', roadLine: '#FFE45C', earth: '#E8412B' },
      light: ['#FFFFFF', '#FFF3A6', '#FF9ACB', '#C6A3FF', '#FFF3C4'],
      fig: { fill: '#FFE7C2', fillA: 0.25, core: '#FFFFFF', halo: '#7FD8FF', off: '#FF9ACB' },
      type: { core: '#FFFFFF', halo: '#0B2A7A', pane: '#0A3F8F', paneA: 0.40, mode: 'shadow' },
    },
    arrows: {
      t0: 30, t1: 32.9, name: 'ARROWS', ground: ['#0B4FB0', '#3FA5E8'],
      glass: ['#FFFFFF', '#FFD6EC', '#CBB8FF'], light: ['#FFFFFF', '#FF6B57', '#FFF3A6', '#FF9ACB', '#A6FFE9'],
      fig: { fill: '#FFE7C2', fillA: 0.25, core: '#FFFFFF', halo: '#7FD8FF', off: '#FF9ACB' },
      type: { core: '#FFFFFF', halo: '#0B2A7A', pane: '#0A3F8F', paneA: 0.40, mode: 'shadow', mono: '#FFFFFF' },
    },
    hack: {
      t0: 32.9, t1: 36, name: 'REWARD HACK', ground: ['#0B4FB0', '#3FA5E8'],
      glass: ['#2233D6', '#FF7A1A', '#1FAE7A', '#FF2E97', '#FFE45C', '#7A2BD1', '#1E9BE6', '#E8412B', '#B6F03C'], glassA: [0.45, 0.45],
      light: ['#FF2E97', '#1FA352', '#FFC861', '#FFF3C4'], chip: { fill: '#0B1F5C', fillA: 0.7, edge: '#3DF5FF', text: '#E8F7FF' }, badge: '#39FF88',
      fig: { fill: '#FFE7C2', fillA: 0.25, core: '#FFFFFF', halo: '#7FD8FF', off: '#FF9ACB' },
      type: { core: '#FFFFFF', halo: '#0B2A7A', pane: '#0A3F8F', paneA: 0.40, mode: 'shadow' },
    },
    drop: {
      t0: 36, t1: 39, name: 'THE DROP', ground: ['#2233D6', '#5B2BD9'], radial: true,
      sun: ['#FFFFFF', '#FFE45C', '#FF8A1F', '#FF6FB5'], prism: '#22E4FF',
      glass: ['#2B4BFF', '#FF2E97', '#FF7A1A', '#FFE45C', '#B6F03C', '#7A2BD1'],
      fields: ['#FF2E97', '#B6F03C', '#FF7A1A', '#2233D6', '#FFE45C', '#1FAE7A'], trees: '#7A2BD1', treeShadow: '#FF6FB5',
      light: ['#FFE600', '#FF8A00', '#FF3D9A', '#B6FF3B', '#3DE7FF', '#FFFFFF'], confetti: ['#FFFFFF', '#FFE45C', '#22E4FF'],
      fig: { fill: '#FFF3C4', fillA: 0.35, core: '#FFFFFF', halo: '#FFE600', off: '#FF2E97' },
      type: { core: '#FFFFFF', halo: '#FFC23D', pane: '#1B2A8C', paneA: 0.35, mode: 'glow', free: '#FF3D9A' },
    },
    headless: {
      t0: 39, t1: 42.75, name: 'HEADLESS', ground: ['#3DB4FF', '#FFF3C4'], silhouette: '#1E1458', silA: 0.88, contour: '#FFC23D',
      glass: ['#FF2E97', '#B6F03C', '#FF7A1A', '#2233D6', '#FFE45C', '#1FAE7A'], light: ['#FFF3C4'],
      fig: { fill: '#FFF3C4', fillA: 0.30, core: '#FFFFFF', halo: '#FFE600', off: '#FF2E97' },
      type: { core: '#FFFFFF', halo: '#1B2A8C', pane: '#1B2A8C', paneA: 0.35, mode: 'shadow', mono: '#E8F7FF' },
    },
    metta: {
      t0: 42.75, t1: 49.5, name: 'METTA', ground: ['#B3245E', '#F2789E', '#F6A68D'],
      glass: ['#FF8FB1', '#FFC94D', '#B9A3FF', '#FF9E7A', '#9FF2D0', '#FF6FB5'], centre: '#FFF3C4',
      light: ['#FFC23D', '#FFF3C4', '#FF9A1F', '#FFD27A'],
      fig: { fill: '#FF8FB1', fillA: 0.30, core: '#FFFFFF', halo: '#FFC94D', off: '#9FF2D0', blush: '#FF5E8A' },
      type: { core: '#FFF6EE', halo: '#7A1240', pane: '#5A0E36', paneA: 0.35, mode: 'shadow' },
    },
    tilopa: {
      t0: 49.5, t1: 54, name: 'TILOPA', ground: ['#2A1F5C', '#14123A'],
      light: ['#FFFFFF', '#F4EFD8'],
      fig: { fill: '#F4EFD8', fillA: 0.20, core: '#F4EFD8', halo: '#9FB4FF', off: '#C6A3FF' },
      type: { core: '#F4EFD8', halo: '#FFC23D', halo2: '#9FB4FF', pane: '#14123A', paneA: 0, mode: 'glow' },
    },
    rest: {
      t0: 54, t1: 59.25, name: 'REST', ground: ['#0E1838', '#1B2A5C'], room: '#2E3F7A',
      glass: ['#FFE45C', '#FF8A1F', '#FF2E97', '#19C3D6', '#B6F03C', '#2B4BFF', '#9B5CFF'], lead: '#120A30',
      light: ['#F4EFD8', '#9FB4FF', '#DCE6FF'],
      fig: { fill: '#F4EFD8', fillA: 0.20, core: '#F4EFD8', halo: '#9FB4FF', off: '#C6A3FF' },
      type: { core: '#F4EFD8', halo: '#4A6BFF', pane: '#0E1838', paneA: 0, mode: 'glow' },
    },
    regrab: {
      t0: 59.25, t1: 60, name: 'REGRAB', ground: ['#1B1466', '#120A3E'], radial: true,
      fig: { fill: '#FF7A1A', fillA: 0.30, core: '#FFE2B0', halo: '#FF9A3D', off: '#2EE6FF', rim: '#1B1240', arm: '#FFB23F' },
      type: { core: '#FFF8F2', halo: '#FF2E97', pane: '#140C4A', paneA: 0.50, mode: 'glow' },
    },
  };
  V2.PAL_ORDER = ['hook', 'guy', 'all', 'same', 'saint', 'plate', 'buzz', 'tape', 'look', 'unclench', 'sky', 'arrows', 'hack', 'drop', 'headless', 'metta', 'tilopa', 'rest', 'regrab'];
  V2.section = function (t) {
    t = V2.wrap(t);
    for (const k of V2.PAL_ORDER) { const p = V2.PAL[k]; if (t >= p.t0 && t < p.t1) return k; }
    return 'hook';
  };
  // fill a 2D context with a section ground (linear top->bottom, or radial centre->edge when pal.radial)
  V2.ground = function (g, key, o = {}) {
    const p = typeof key === 'string' ? V2.PAL[key] : key;
    const st = p.ground, W = 1080, H = 1350;
    let gr;
    if (p.radial && !o.linear) {
      const c = o.c || [540, 760];
      gr = g.createRadialGradient(c[0], c[1], 0, c[0], c[1], o.r || 1000);
    } else gr = g.createLinearGradient(0, 0, 0, H);
    st.forEach((c, i) => gr.addColorStop(p.stops ? p.stops[i] : (st.length === 1 ? 0 : i / (st.length - 1)), c));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  };
})();
