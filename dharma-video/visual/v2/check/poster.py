# Poster depth metrics (core review r2): value distribution of a frame at 270 px wide, so "light through glass" is
# measurable, not only colourful. Targets for frame 0 (the glass lookdev floor measured V>.85 0.44, V<.5 0.13):
#   V > 0.85 share <= 0.55, V < 0.5 share >= 0.10, colourful share (S >= .25, V >= .15, 32x32) >= 0.85, edges <= 0.14
# usage: python3 -I poster.py <png> [<png> ...]
import sys, os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from edges import density   # noqa: E402  (edges.py only runs its CLI when given a directory)
def metrics(path):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im.resize((270, 338), Image.LANCZOS)).astype(float) / 255
    v = a.max(2)
    s = np.where(v > 0, (v - a.min(2)) / np.maximum(v, 1e-6), 0)
    b = np.asarray(im.resize((32, 32), Image.BILINEAR)).astype(float) / 255
    bv = b.max(2); bs = np.where(bv > 0, (bv - b.min(2)) / np.maximum(bv, 1e-6), 0)
    return {'hi': float((v > 0.85).mean()), 'lo': float((v < 0.5).mean()), 'col': float(((bs >= 0.25) & (bv >= 0.15)).mean()),
            'edges': density(path), 'meanS': float(s.mean())}
ok = True
for f in sys.argv[1:]:
    m = metrics(f)
    p = m['hi'] <= 0.55 and m['lo'] >= 0.10 and m['col'] >= 0.85 and m['edges'] <= 0.14
    ok &= p
    print(f"{os.path.basename(f)}  V>.85 {m['hi']:.3f} (<=.55)  V<.5 {m['lo']:.3f} (>=.10)  colourful {m['col']:.3f} (>=.85)  edges {m['edges']:.3f} (<=.14)  meanS {m['meanS']:.2f}  {'ok' if p else 'FAIL'}")
print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
