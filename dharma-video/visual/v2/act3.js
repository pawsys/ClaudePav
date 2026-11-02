// ACT 3 (36 to 60): joy, love, subtraction, rest, regrab. LOOK.md 4 (ACT 3), 2.7, 2.9, 4.1, 5.5.
// Helpers (loaded in the ACT 3 HELPERS block of v2/index.html): act3_util.js, act3_gl.js (programs a3_drop, a3_lap,
// a3_rest), act3_drop.js (36 to 39), act3_lap.js (39 to 54: headless, metta, Tilopa in one world), act3_rest.js (54 to
// 59.25 and the 59.25 regrab on the core hook rig). Scene names and GL program keys are a3_ prefixed.
(function () {
  const V2 = window.V2, NS = window.a3_NS;
  V2.add(36.0, 39.0, 'a3_drop', (t, ctx) => NS.drop.draw(t, ctx));
  if (NS.lap) {
    V2.add(39.0, 54.0, 'a3_lap', (t, ctx) => NS.lap.draw(t, ctx));
  } else {
    const stub = (t0, t1, key, note) => V2.add(t0, t1, 'a3_stub_' + key, (t, ctx) => { V2.ground(ctx, key); V2.stubLabel(ctx, t, 'ACT 3 STUB  ' + V2.PAL[key].name, note); });
    stub(39.0, 42.75, 'headless', 'Harding headless view');
    stub(42.75, 49.5, 'metta', 'af Klint rosette, enso');
    stub(49.5, 54.0, 'tilopa', 'subtraction');
  }
  if (NS.rest) {
    V2.add(54.0, 59.25, 'a3_rest', (t, ctx) => NS.rest.draw(t, ctx));
    V2.add(59.25, 60.0, 'a3_regrab', (t, ctx) => NS.rest.regrab(t, ctx));
  } else {
    const rest = (t, ctx, comp = {}) => {
      const wo = { mode: 'night' };
      V2.L.pane(g => { V2.ground(g, 'rest'); V2.window.draw(t, Object.assign({}, wo, { g })); }, 'a3stub_rest|' + V2.window.paneKey(wo));
      const win = V2.window.draw(t, Object.assign({}, wo, { g: null }));
      V2.L.render('core_stub_window', win.uniforms, Object.assign({ t }, comp));
      win.crisp(ctx);
    };
    V2.add(54.0, 59.25, 'a3_stub_rest', (t, ctx) => { rest(t, ctx); V2.stubLabel(ctx, t, 'ACT 3 STUB  REST', 'core window, night'); });
    V2.add(59.25, 60.0, 'a3_regrab_core', (t, ctx) => {
      const R = V2.hook.regrab(t, { wisp: [560, 1010], rest: [330, 1090, 150] });
      R.underScene = { key: 'a3stub_rest', draw: (T, c) => rest(T, c, { grain: 0 }) };
      V2.hook.frame(t, R);
    });
  }
})();
