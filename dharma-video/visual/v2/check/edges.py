# Edge density (LOOK.md 2.12): fraction of pixels whose Sobel gradient magnitude (luma, 270 px wide) exceeds a threshold.
# Gate: <= 0.14 on every frame, <= 0.10 in metta (42.75..49.5) and rest (54..59.25).
# Threshold 0.18 (luma 0..1, Sobel normalised by 4) is calibrated so the lookdev stills land where the judges measured
# them (glass median 0.08, range 0.05..0.16; pool median 0.16): run with --calibrate to print the lookdev numbers.
# usage: python3 -I edges.py <dir> [--thresh 0.25] [--calibrate <repo root>]
import sys, os, re
import numpy as np
from PIL import Image
TH = float(sys.argv[sys.argv.index("--thresh") + 1]) if "--thresh" in sys.argv else 0.18
def density(path, th=TH):
    im = Image.open(path).convert('RGB').resize((270, 338), Image.LANCZOS)
    a = np.asarray(im).astype(float) / 255
    y = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    p = np.pad(y, 1, mode='edge')
    gx = (p[:-2, 2:] + 2 * p[1:-1, 2:] + p[2:, 2:]) - (p[:-2, :-2] + 2 * p[1:-1, :-2] + p[2:, :-2])
    gy = (p[2:, :-2] + 2 * p[2:, 1:-1] + p[2:, 2:]) - (p[:-2, :-2] + 2 * p[:-2, 1:-1] + p[:-2, 2:])
    g = np.hypot(gx, gy) / 4
    return float((g > th).mean())
if __name__ == '__main__':
    if '--calibrate' in sys.argv:
        root = sys.argv[sys.argv.index('--calibrate') + 1]
        for k in ['glass', 'pool', 'rays']:
            dd = os.path.join(root, 'out/lookdev', k)
            v = [density(os.path.join(dd, f)) for f in sorted(os.listdir(dd)) if f.startswith('still_')]
            print(k, ' '.join(f'{x:.3f}' for x in v))
        sys.exit(0)
    d = sys.argv[1]; ok = True
    for f in sorted(os.listdir(d)):
        m = re.match(r'still_(\d+\.\d+)\.png$', f)
        if not m: continue
        t = float(m.group(1)); v = density(os.path.join(d, f))
        lim = 0.10 if (42.75 <= t < 49.5 or 54 <= t < 59.25) else 0.14
        ok &= v <= lim
        print(f'{t:7.3f}  {v:.3f}  (<= {lim:.2f})  {"ok" if v <= lim else "FAIL"}')
    print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
