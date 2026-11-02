# Colourful share per still (LOOK.md 1.3, 5.7): fraction of pixels with S >= 0.25 and V >= 0.15 on a 32x32 downsample.
# Gate: every still >= 0.45; stills in 17.55..18.6 >= 0.20; median >= 0.70; black and neutral grey <= 2% each.
# usage: python3 -I colour.py <dir of still_SSS.SS.png> [--json out.json]
import sys, os, re, json
import numpy as np
from PIL import Image
# --swatch <png>: the 2D-vs-GL glass check on core_test page 19 (CLENCHED in GL glass at (300,640) and in 2D glass at
# (780,640), s 230, on the hook ground): body means must agree within 14 degrees of hue and 0.15 saturation, both S >= .6
if sys.argv[1] == '--swatch':
    import colorsys
    a = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(float)
    H, W, _ = a.shape; yy, xx = np.mgrid[0:H, 0:W]; res = []
    for cx in (300, 780):
        m = ((xx - cx) / (0.62 * 230 * 0.8)) ** 2 + ((yy - 640) / (0.70 * 230 * 0.8)) ** 2 < 1
        mean = a[m].mean(0); h, s_, v = colorsys.rgb_to_hsv(*(mean / 255)); res.append((mean.round(), h * 360, s_, v))
    dh = abs((res[0][1] - res[1][1] + 180) % 360 - 180); ds = abs(res[0][2] - res[1][2])
    ok = dh <= 14 and ds <= 0.15 and min(res[0][2], res[1][2]) >= 0.6
    print(f"GL body {res[0][0]} hue {res[0][1]:.0f} S {res[0][2]:.2f}   2D body {res[1][0]} hue {res[1][1]:.0f} S {res[1][2]:.2f}   dhue {dh:.0f} dS {ds:.2f}  ->  {'PASS' if ok else 'FAIL'}")
    sys.exit(0 if ok else 1)
d = sys.argv[1]
# Also the 'no pure black ground, no neutral grey' gate (5.7): on the same 32x32 downsample, black = V < 0.06,
# neutral grey = S < 0.08 with 0.15 < V < 0.85 (white type and light cores are not grey). Each above 2% fails.
def share(path):
    a = np.asarray(Image.open(path).convert('RGB').resize((32, 32), Image.BILINEAR)).astype(float) / 255
    mx = a.max(2); mn = a.min(2); s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    col = float(((s >= 0.25) & (mx >= 0.15)).mean())
    black = float((mx < 0.06).mean()); grey = float(((s < 0.08) & (mx > 0.15) & (mx < 0.85)).mean())
    return col, black, grey
rows = []
for f in sorted(os.listdir(d)):
    m = re.match(r'still_(\d+\.\d+)\.png$', f)
    if not m: continue
    t = float(m.group(1)); v, bk, gy = share(os.path.join(d, f))
    lim = 0.20 if 17.55 <= t < 18.6 else 0.45
    rows.append({'t': t, 'share': round(v, 3), 'min': lim, 'black': round(bk, 3), 'grey': round(gy, 3), 'pass': v >= lim and bk <= 0.02 and gy <= 0.02})
vals = [r['share'] for r in rows]
medv = float(np.median(vals)) if vals else 0
ok = all(r['pass'] for r in rows) and medv >= 0.70
for r in rows: print(f"{r['t']:7.3f}  {r['share']:.3f}  (>= {r['min']:.2f})  black {r['black']:.3f} grey {r['grey']:.3f} (<= 0.02)  {'ok' if r['pass'] else 'FAIL'}")
print(f"median {medv:.3f} (>= 0.70)  ->  {'PASS' if ok else 'FAIL'}")
if '--json' in sys.argv: json.dump({'rows': rows, 'median': medv, 'pass': ok}, open(sys.argv[sys.argv.index('--json') + 1], 'w'), indent=1)
sys.exit(0 if ok else 1)
