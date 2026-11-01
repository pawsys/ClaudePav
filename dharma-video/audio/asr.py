import sys; sys.path.insert(0, '.')
import numpy as np, soxr, re
from pocketsphinx import Decoder
SR = 48000
_d = None
def asr(a, sr=SR):
    global _d
    if _d is None: _d = Decoder(samprate=16000)
    x = soxr.resample(a, sr, 16000); x = (np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()
    _d.start_utt(); _d.process_raw(x, full_utt=True); _d.end_utt(); h = _d.hyp()
    return h.hypstr if h else ''
def norm(s):
    return re.sub(r"[^a-z' ]", ' ', s.lower().replace('-', ' ')).split()
def wer(ref, hyp):
    r, h = norm(ref), norm(hyp)
    D = np.zeros((len(r) + 1, len(h) + 1), int); D[:, 0] = range(len(r) + 1); D[0, :] = range(len(h) + 1)
    for i in range(1, len(r) + 1):
        for j in range(1, len(h) + 1):
            D[i, j] = min(D[i-1, j] + 1, D[i, j-1] + 1, D[i-1, j-1] + (r[i-1] != h[j-1]))
    return D[-1, -1] / max(1, len(r))
