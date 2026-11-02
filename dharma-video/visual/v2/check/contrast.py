# measures contrast.js jobs: python3 -I contrast.py qa_words.json
# core = 90th percentile luma inside the word box; ground = median luma of a ring 0.35 to 0.8 type sizes outside it,
# with every word box of the frame (padded 0.3 size) excluded. Words whose ring is fully covered by other words are skipped.
import sys, json
import numpy as np
from PIL import Image
jobs = json.load(open(sys.argv[1])); ok = True; rows = []
def lin(a): return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
for j in jobs:
    im = np.asarray(Image.open(j['file']).convert('RGB')).astype(float) / 255
    L = lin(im) @ np.array([0.2126, 0.7152, 0.0722]); H, W = L.shape
    worst = None; skipped = []
    for w in j['words']:
        x0, y0, x1, y1 = [int(round(v)) for v in w['box']]
        x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
        if x1 - x0 < 4 or y1 - y0 < 4: continue
        core = np.percentile(L[y0:y1, x0:x1], 90)
        # the ground behind the type: a ring past the halo (0.35 to 0.8 of the type size out), excluding every
        # word box of the frame (neighbouring rows and their halos are not the ground)
        r0, r1 = int(0.35 * w['size']), int(0.8 * w['size'])
        X0, Y0, X1, Y1 = max(0, x0 - r1), max(0, y0 - r1), min(W, x1 + r1), min(H, y1 + r1)
        m = np.ones((Y1 - Y0, X1 - X0), bool); m[max(0, y0 - r0 - Y0):max(0, y1 + r0 - Y0), max(0, x0 - r0 - X0):max(0, x1 + r0 - X0)] = False
        for o in j['words']:
            a0, b0, a1, b1 = [int(round(v)) for v in o['box']]; pd = int(0.3 * o['size'])
            m[max(0, b0 - pd - Y0):max(0, b1 + pd - Y0), max(0, a0 - pd - X0):max(0, a1 + pd - X0)] = False
        # non-word UI recorded by a scene (V2.QA.exclude rects: chips, badges) is not the ground either (A2-6)
        for e in j.get('exclude', []):
            a0, b0, a1, b1 = [int(round(v)) for v in e]
            m[max(0, b0 - Y0):max(0, b1 - Y0), max(0, a0 - X0):max(0, a1 - X0)] = False
        # restrict the ring to the caption pane the word sits on (its inner region, where the pane is at full strength)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        m_free = m.copy(); tag = ''; m_pane = None
        for pn in j.get('panes', []):
            r, fe = pn['rect'], pn['fe']
            if r[0] <= cx <= r[2] and r[1] <= cy <= r[3]:
                ins = 0.35 * fe
                yy, xx = np.mgrid[Y0:Y1, X0:X1]
                m_pane = m & (xx >= r[0]) & (xx <= r[2]) & (yy >= r[1]) & (yy <= r[3])
                m &= (xx >= r[0] + ins) & (xx <= r[2] - ins) & (yy >= r[1] + ins) & (yy <= r[3] - ins)
                break
        ring = L[Y0:Y1, X0:X1][m]
        # (integration, A3-3 / A2-7) a tight pane: measure the ring on the whole pane rect (its feather included), and
        # only if that is empty too, the free ring past the pane (the conservative number, tagged)
        if ring.size < 50 and m_pane is not None:
            ring = L[Y0:Y1, X0:X1][m_pane]; tag = ' [ring on the pane edge]'
        if ring.size < 50:
            ring = L[Y0:Y1, X0:X1][m_free]; tag = ' [ring past the pane]'
        if ring.size < 50: skipped.append(w['w']); continue
        a = w.get('a', 1)
        if a < 0.5: continue                       # unlit glass and flicker frames are not gated
        need = 4.5 if a >= 0.95 else 3.0           # pre-lit 0.55 (open half) and pulse frames: their own target
        g = np.median(ring)
        hi, lo = max(core, g), min(core, g)
        ratio = (hi + 0.05) / (lo + 0.05)
        if worst is None or ratio / need < worst[0] / worst[3]: worst = (ratio, w['w'] + tag, a, need)
    if skipped: print(f"{j['t']:7.3f}  SKIPPED (no ground ring): {' '.join(skipped)}")
    if worst is None: continue
    p = worst[0] >= worst[3]
    ok &= p
    print(f"{j['t']:7.3f}  worst word '{worst[1]}' (level {worst[2]:.2f}, needs {worst[3]:.1f})  {worst[0]:.2f}:1  {'ok' if p else 'FAIL'}")
print('PASS' if ok else 'FAIL')
