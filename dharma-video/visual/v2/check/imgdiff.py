# Image differences for seam.js (decoded from the same screenshots render.js would capture, not from getImageData).
# usage: python3 -I imgdiff.py pairs <a.png> <b.png> [<a2.png> <b2.png> ...]  -> JSON list of
#        {mean (mean abs diff, 8-bit, all channels), max (max channel diff), over2 (pixels with any channel off by > 2),
#         over0 (pixels that differ at all)}
import sys, json
import numpy as np
from PIL import Image
args = sys.argv[2:]
out = []
for i in range(0, len(args), 2):
    a = np.asarray(Image.open(args[i]).convert('RGB')).astype(np.int16)
    b = np.asarray(Image.open(args[i + 1]).convert('RGB')).astype(np.int16)
    d = np.abs(a - b)
    out.append({'mean': round(float(d.mean()), 3), 'max': int(d.max()), 'over2': int((d.max(2) > 2).sum()), 'over0': int((d.max(2) > 0).sum())})
print(json.dumps(out))
