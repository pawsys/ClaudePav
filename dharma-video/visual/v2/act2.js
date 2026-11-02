// ACT 2 (18 to 36): the look and the release. LOOK.md 4 (ACT 2), 2.7, 2.9, 4.1. Helpers: act2_util.js, act2_look.js,
// act2_sky.js (loaded in the ACT 2 HELPERS block of v2/index.html). Scene names and GL program keys are a2_ prefixed.
(function () {
  const V2 = window.V2, A = window.a2_NS;
  V2.add(18.0, 24.0, 'a2_look', (t, ctx) => A.look.draw(t, ctx));
  V2.add(24.0, 36.0, 'a2_sky', (t, ctx) => A.sky.draw(t, ctx));
})();
