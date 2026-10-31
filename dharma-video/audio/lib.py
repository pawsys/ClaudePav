"""Audio toolkit for the dharma music video.

Everything renders to float32 stereo arrays shaped (n, 2) at SR.
"""
import numpy as np
import soundfile as sf
import soxr
import pyworld as pw
import tinysoundfont
from scipy import signal

SR = 48000
SF2 = "/tmp/dl/gugs/GeneralUser-GS.sf2"
KOKORO_MODEL = "/tmp/dl/kokoro-v1.0.onnx"
KOKORO_VOICES = "/tmp/dl/voices-v1.0.bin"

_kokoro = None


def kokoro():
    global _kokoro
    if _kokoro is None:
        from kokoro_onnx import Kokoro
        _kokoro = Kokoro(KOKORO_MODEL, KOKORO_VOICES)
    return _kokoro


# ----------------------------------------------------------------- utils
def silence(sec):
    return np.zeros((int(round(sec * SR)), 2), np.float32)


def to_stereo(x):
    x = np.asarray(x, np.float32)
    if x.ndim == 1:
        return np.stack([x, x], 1)
    return x


def mono(x):
    return x.mean(1) if x.ndim == 2 else x


def db(x):
    return 10 ** (x / 20)


def place(dst, src, t, gain=1.0):
    """Add src into dst at time t (sec). Grows nothing; clips at end."""
    i = int(round(t * SR))
    if i >= len(dst):
        return dst
    src = to_stereo(src)
    if i < 0:
        src = src[-i:]
        i = 0
    n = min(len(src), len(dst) - i)
    dst[i:i + n] += src[:n] * gain
    return dst


def pan(x, p):
    """p in [-1,1], constant power."""
    x = mono(x)
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1).astype(np.float32)


def fade(x, fin=0.0, fout=0.0):
    x = x.copy()
    n = len(x)
    if fin > 0:
        k = min(n, int(fin * SR))
        x[:k] *= np.linspace(0, 1, k)[:, None] if x.ndim == 2 else np.linspace(0, 1, k)
    if fout > 0:
        k = min(n, int(fout * SR))
        x[n - k:] *= np.linspace(1, 0, k)[:, None] if x.ndim == 2 else np.linspace(1, 0, k)
    return x


def resample(x, sr_in, sr_out=SR):
    if sr_in == sr_out:
        return x
    return soxr.resample(x, sr_in, sr_out).astype(np.float32)


def write(path, x):
    sf.write(path, np.clip(x, -1, 1), SR, subtype="PCM_24")


def lp(x, fc, order=2):
    sos = signal.butter(order, fc, "low", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0).astype(np.float32)


def hp(x, fc, order=2):
    sos = signal.butter(order, fc, "high", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0).astype(np.float32)


def bp(x, f1, f2, order=2):
    sos = signal.butter(order, [f1, f2], "band", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0).astype(np.float32)


def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}
NOTE.update({"Db": 1, "Eb": 3, "Gb": 6, "Ab": 8, "Bb": 10})


def nm(name):
    """'D4' -> 62, 'F#3' -> 54"""
    p = name[:-1]
    o = int(name[-1])
    return 12 * (o + 1) + NOTE[p]


# ----------------------------------------------------------------- reverb
def make_ir(sec=3.0, predelay=0.02, damp=6000, seed=1, bright_decay=None):
    """Synthetic stereo hall IR: decorrelated exponentially-decaying noise with
    frequency-dependent decay (highs die faster)."""
    rng = np.random.default_rng(seed)
    n = int(sec * SR)
    t = np.arange(n) / SR
    out = []
    for ch in range(2):
        noise = rng.standard_normal(n).astype(np.float32)
        lo = lp(noise, 1200)
        mid = bp(noise, 1200, damp)
        hi = hp(noise, damp)
        env_lo = np.exp(-6.9 * t / sec)
        env_mid = np.exp(-6.9 * t / (sec * 0.7))
        env_hi = np.exp(-6.9 * t / (sec * (bright_decay or 0.35)))
        ir = lo * env_lo + mid * env_mid * 0.8 + hi * env_hi * 0.5
        ir *= np.minimum(1, t / 0.01)  # soft attack
        out.append(ir)
    ir = np.stack(out, 1)
    pd = int(predelay * SR)
    ir = np.concatenate([np.zeros((pd, 2), np.float32), ir])
    ir /= np.sqrt((ir ** 2).sum(0, keepdims=True))
    return ir.astype(np.float32)


_IR_CACHE = {}


def reverb(x, sec=3.0, wet=0.3, dry=1.0, predelay=0.02, damp=6000, hp_wet=150, seed=1):
    key = (sec, predelay, damp, seed)
    if key not in _IR_CACHE:
        _IR_CACHE[key] = make_ir(sec, predelay, damp, seed)
    ir = _IR_CACHE[key]
    x = to_stereo(x)
    y = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    if hp_wet:
        y = hp(y, hp_wet)
    return (x * dry + y * wet).astype(np.float32)


def delay(x, t, fb=0.35, wet=0.25, lp_fc=4000, pingpong=True):
    x = to_stereo(x)
    d = int(t * SR)
    y = np.zeros_like(x)
    tap = x.copy()
    g = 1.0
    for k in range(1, 8):
        g *= fb
        tap = lp(tap, lp_fc, 1)
        shifted = np.zeros_like(x)
        shifted[d * k:] = tap[: len(x) - d * k]
        if pingpong:
            shifted = shifted[:, ::-1] if k % 2 else shifted
        y += shifted * g
    return x + y * wet


# ----------------------------------------------------------------- soundfont
class SF:
    def __init__(self):
        self.synth = tinysoundfont.Synth(samplerate=SR, gain=-3)
        self.sfid = self.synth.sfload(SF2)

    def render(self, notes, dur, program=0, bank=0, drums=False, tail=0.0, cc=None):
        """notes: list of (t, dur, midi, vel). returns (n,2) float32."""
        s = tinysoundfont.Synth(samplerate=SR, gain=-3)
        sfid = s.sfload(SF2)
        s.program_select(0, sfid, bank, program, is_drums=drums)
        for k, v in (cc or {}).items():
            s.control_change(0, k, v)
        ev = []
        for (t, d, m, v) in notes:
            ev.append((t, 1, int(m), int(v)))
            ev.append((t + d, 0, int(m), 0))
        ev.sort(key=lambda e: (e[0], e[1]))
        total = int((dur + tail) * SR)
        out = np.zeros((total, 2), np.float32)
        pos = 0
        for (t, on, m, v) in ev:
            i = min(total, int(round(t * SR)))
            if i > pos:
                buf = s.generate(i - pos)
                out[pos:i] = np.frombuffer(buf, np.float32).reshape(-1, 2)
                pos = i
            if on:
                s.noteon(0, m, v)
            else:
                s.noteoff(0, m)
        if pos < total:
            buf = s.generate(total - pos)
            out[pos:] = np.frombuffer(buf, np.float32).reshape(-1, 2)
        return out


# ----------------------------------------------------------------- synths
def singing_bowl(f0=220.0, dur=8.0, vel=1.0, seed=0, bright=1.0):
    """Inharmonic struck bowl with beating partial pairs."""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    ratios = [1.0, 2.76, 5.40, 8.93, 13.34]
    amps = [1.0, 0.55 * bright, 0.28 * bright, 0.12 * bright, 0.05 * bright]
    decays = [dur * 0.9, dur * 0.55, dur * 0.3, dur * 0.18, dur * 0.1]
    L = np.zeros(n)
    R = np.zeros(n)
    for r, a, dcy in zip(ratios, amps, decays):
        f = f0 * r
        beat = rng.uniform(0.6, 2.2)  # Hz difference for beating
        ph1, ph2 = rng.uniform(0, 2 * np.pi, 2)
        env = np.exp(-t / (dcy / 4.6))
        s1 = np.sin(2 * np.pi * f * t + ph1)
        s2 = np.sin(2 * np.pi * (f + beat) * t + ph2)
        L += a * env * (s1 * 0.6 + s2 * 0.4)
        R += a * env * (s1 * 0.4 + s2 * 0.6)
    att = np.minimum(1, t / 0.004)
    # mallet thump
    thump = np.exp(-t / 0.02) * np.sin(2 * np.pi * f0 * 0.5 * t) * 0.3
    out = np.stack([(L + thump) * att, (R + thump) * att], 1) * 0.25 * vel
    return out.astype(np.float32)


def sub_bass(notes, dur, drive=1.5):
    """notes: (t, d, midi, vel). sine sub with gentle saturation."""
    n = int(dur * SR)
    out = np.zeros(n, np.float32)
    for (t, d, m, v) in notes:
        f = midi_hz(m)
        k = int(d * SR)
        tt = np.arange(k) / SR
        env = np.minimum(1, tt / 0.01) * np.minimum(1, (d - tt) / 0.06).clip(0, 1)
        x = np.sin(2 * np.pi * f * tt) + 0.15 * np.sin(4 * np.pi * f * tt)
        x = np.tanh(x * drive) / np.tanh(drive)
        i = int(t * SR)
        j = min(n, i + k)
        out[i:j] += (x * env * v / 127)[: j - i]
    return to_stereo(out * 0.5)


def pad_saw(notes, dur, voices=5, detune=0.12, cutoff=1800, seed=3):
    """Warm detuned supersaw pad (filtered), stereo spread."""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    L = np.zeros(n, np.float32)
    R = np.zeros(n, np.float32)
    for (t, d, m, v) in notes:
        k = int((d + 1.5) * SR)
        tt = np.arange(k) / SR
        env = np.minimum(1, tt / 0.8) * np.clip((d + 1.5 - tt) / 1.5, 0, 1) ** 1.5
        for vi in range(voices):
            cents = (vi - (voices - 1) / 2) / ((voices - 1) / 2 + 1e-9) * detune * 100
            f = midi_hz(m) * 2 ** (cents / 1200)
            ph = rng.uniform(0, 1)
            saw = 2 * ((f * tt + ph) % 1) - 1
            p = (vi / (voices - 1)) * 2 - 1 if voices > 1 else 0
            a = (p + 1) * np.pi / 4
            i = int(t * SR)
            j = min(n, i + k)
            s = (saw * env * v / 127 / voices)[: j - i]
            L[i:j] += s * np.cos(a)
            R[i:j] += s * np.sin(a)
    out = np.stack([L, R], 1)
    out = lp(out, cutoff, 2)
    out = lp(out, cutoff * 1.5, 1)
    return out * 0.6


def noise_riser(dur, f_start=300, f_end=8000, peak=1.0, rev=False, seed=5):
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    x = rng.standard_normal((n, 2)).astype(np.float32)
    # sweep bandpass by chunked filtering
    out = np.zeros_like(x)
    chunks = 64
    for c in range(chunks):
        a = c * n // chunks
        b = (c + 1) * n // chunks
        fr = c / (chunks - 1)
        fc = f_start * (f_end / f_start) ** fr
        out[a:b] = bp(x[a:b], max(30, fc * 0.6), min(SR / 2 - 100, fc * 1.6), 1)
    env = (np.linspace(0, 1, n) ** 2.5)[:, None]
    out = out * env * peak * 0.3
    return out[::-1].copy() if rev else out


def vinyl(dur, crackle=1.0, hiss=1.0, seed=7):
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    h = hp(lp(rng.standard_normal((n, 2)).astype(np.float32), 9000), 1500) * 0.004 * hiss
    c = np.zeros((n, 2), np.float32)
    k = int(dur * 18 * crackle)
    idx = rng.integers(0, n - 200, k)
    for i in idx:
        amp = rng.uniform(0.02, 0.12) * (rng.random() < 0.15 and 2.5 or 1)
        L = rng.integers(8, 60)
        burst = rng.standard_normal(L) * np.exp(-np.arange(L) / (L / 4))
        ch = rng.integers(0, 2)
        c[i:i + L, ch] += burst * amp
        c[i:i + L, 1 - ch] += burst * amp * 0.4
    c = hp(c, 800)
    return (h + c * 0.35).astype(np.float32)


# ---------------------------------------------------------------- drums (synth)
def kick(vel=1.0, tone=52, decay=0.42, click=0.6):
    d = decay + 0.1
    n = int(d * SR)
    t = np.arange(n) / SR
    f = tone + (tone * 3.2) * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / (decay / 3.2))
    clk = hp(np.random.default_rng(1).standard_normal(n).astype(np.float32), 2500) * np.exp(-t / 0.004) * 0.25 * click
    x = np.tanh((body + clk) * 1.6) * vel
    return to_stereo(x * 0.8)


def snare(vel=1.0, tone=190, decay=0.18, seed=2, lofi=True):
    n = int((decay + 0.25) * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    nz = rng.standard_normal(n).astype(np.float32)
    nz = bp(nz, 1500, 9000) * np.exp(-t / (decay / 2.5))
    body = np.sin(2 * np.pi * tone * t) * np.exp(-t / 0.04) * 0.6
    x = (nz * 0.9 + body) * vel
    if lofi:
        x = lp(x, 6500)
    return to_stereo(x * 0.5)


def rim(vel=1.0):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 1650 * t) * 0.5 + np.sin(2 * np.pi * 820 * t)) * np.exp(-t / 0.012)
    x += hp(np.random.default_rng(4).standard_normal(n).astype(np.float32), 3000) * np.exp(-t / 0.006) * 0.4
    return to_stereo(x * 0.35 * vel)


def hat(vel=1.0, open_=False, seed=3):
    d = 0.35 if open_ else 0.06
    n = int((d + 0.05) * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    x = hp(rng.standard_normal(n).astype(np.float32), 7000)
    # metallic partials
    for f in [3527, 5145, 6211, 8434]:
        x += 0.15 * np.sign(np.sin(2 * np.pi * f * t))
    x = hp(x, 6000) * np.exp(-t / (d / 3))
    return to_stereo(x * 0.18 * vel)


def shaker(vel=1.0, seed=9):
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    env = (t / 0.025).clip(0, 1) * np.exp(-np.maximum(0, t - 0.025) / 0.018)
    x = bp(rng.standard_normal(n).astype(np.float32), 4000, 12000) * env
    return to_stereo(x * 0.12 * vel)


# ----------------------------------------------------------------- TTS
def tts(text, voice="af_heart", speed=1.0, lang="en-us"):
    a, sr = kokoro().create(text, voice=voice, speed=speed, lang=lang)
    a = np.asarray(a, np.float32)
    return a, sr


def trim(x, thresh_db=-45, pad=0.02, sr=SR):
    m = np.abs(mono(x)) if x.ndim == 2 else np.abs(x)
    win = max(1, int(0.01 * sr))
    env = np.convolve(m, np.ones(win) / win, "same")
    th = db(thresh_db) * env.max() / db(0) if env.max() > 0 else 0
    th = max(th, db(thresh_db))
    idx = np.where(env > th)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(pad * sr))
    b = min(len(x), idx[-1] + int(pad * sr))
    return x[a:b]


def speak(text, voice="af_heart", speed=1.0):
    """TTS -> trimmed mono float at SR."""
    a, sr = tts(text, voice, speed)
    a = resample(a, sr, SR)
    a = trim(a)
    return a.astype(np.float32)


# ----------------------------------------------------------------- vocoder choir
def world_analyze(x, fs):
    x = x.astype(np.float64)
    f0, t = pw.harvest(x, fs, f0_floor=70, f0_ceil=500, frame_period=5.0)
    sp = pw.cheaptrick(x, f0, t, fs)
    ap = pw.d4c(x, f0, t, fs)
    return f0, sp, ap


def voiced_segments(f0, min_len=6, merge_gap=4):
    v = f0 > 0
    segs = []
    i = 0
    n = len(v)
    while i < n:
        if v[i]:
            j = i
            while j < n and v[j]:
                j += 1
            segs.append([i, j])
            i = j
        else:
            i += 1
    merged = []
    for s in segs:
        if merged and s[0] - merged[-1][1] <= merge_gap:
            merged[-1][1] = s[1]
        else:
            merged.append(s)
    return [s for s in merged if s[1] - s[0] >= min_len]


def choir_phrase(text, notes, voice="af_heart", speed=0.8, harmony=(0,), fs_tts=24000,
                 vibrato=0.25, breath=0.35, seed=11, syllable_map=None, return_info=False,
                 formant_shift=1.0):
    """Vocoder choir.

    notes: list of (duration_sec, midi) for each voiced segment (syllable) in order.
           If fewer notes than segments, the last note is reused.
    harmony: semitone offsets (relative to each melody note) OR list of lists per note.
    Consonants keep their natural timing; voiced segments are stretched to the
    note durations (minus the preceding consonant time).
    Returns stereo float32 at SR.
    """
    rng = np.random.default_rng(seed)
    a, sr = tts(text, voice, speed)
    a = trim(a, sr=sr)
    f0, sp, ap = world_analyze(a, sr)
    segs = voiced_segments(f0)
    if syllable_map:
        segs = [segs[i] for i in syllable_map]
    fp = 0.005
    # build output frame index map
    idx = []
    pitch = []  # midi per output frame or nan for unvoiced
    seg_note = []
    cursor = 0
    k = 0
    note_times = []
    for si, (s0, s1) in enumerate(segs):
        # consonant/unvoiced region before this segment keeps natural length
        pre = list(range(cursor, s0))
        idx += pre
        pitch += [np.nan] * len(pre)
        dur, m = notes[min(si, len(notes) - 1)]
        out_frames = max(int(dur / fp) - len(pre), s1 - s0)
        src = np.linspace(s0, s1 - 1, out_frames)
        note_times.append(len(idx) * fp)
        idx += list(src)
        pitch += [m] * out_frames
        cursor = s1
    tail = list(range(cursor, len(f0)))
    idx += tail[: int(0.25 / fp)]
    pitch += [np.nan] * len(tail[: int(0.25 / fp)])
    idx = np.array(idx)
    pitch = np.array(pitch, float)
    i0 = np.floor(idx).astype(int).clip(0, len(f0) - 1)
    i1 = (i0 + 1).clip(0, len(f0) - 1)
    w = (idx - i0)[:, None]
    sp2 = sp[i0] * (1 - w) + sp[i1] * w
    ap2 = ap[i0] * (1 - w) + ap[i1] * w
    if formant_shift != 1.0:
        # shift spectral envelope along frequency axis
        nb = sp2.shape[1]
        src_bins = np.arange(nb) / formant_shift
        sp2 = np.stack([np.interp(src_bins, np.arange(nb), row) for row in sp2])
        ap2 = np.stack([np.interp(src_bins, np.arange(nb), row) for row in ap2])
    voiced = ~np.isnan(pitch)
    # smooth pitch transitions (portamento) in log domain
    pm = pitch.copy()
    # fill nan with nearest for smoothing
    if voiced.any():
        last = pm[voiced][0]
        for i in range(len(pm)):
            if np.isnan(pm[i]):
                pm[i] = last
            else:
                last = pm[i]
    ker = np.hanning(9)
    ker /= ker.sum()
    pm = np.convolve(np.pad(pm, 4, mode="edge"), ker, "valid")
    T = np.arange(len(pm)) * fp
    outs = []
    harm_list = harmony if isinstance(harmony[0], (list, tuple)) else None
    nvoices = len(harm_list[0]) if harm_list else len(harmony)
    for v in range(nvoices):
        off = np.zeros(len(pm))
        if harm_list:
            # per-note harmony offsets
            seg_id = np.zeros(len(pm), int)
            # map frames to note index by note_times
            nt = np.array(note_times + [1e9])
            seg_id = np.searchsorted(nt, T, side="right") - 1
            seg_id = seg_id.clip(0, len(harm_list) - 1)
            off = np.array([harm_list[s][v] for s in seg_id], float)
            off = np.convolve(np.pad(off, 4, mode="edge"), ker, "valid")
        else:
            off[:] = harmony[v]
        drift = np.cumsum(rng.standard_normal(len(pm))) * 0.004
        drift -= np.convolve(drift, np.ones(80) / 80, "same")
        vib_rate = rng.uniform(4.6, 5.6)
        vib_onset = np.zeros(len(pm))
        # vibrato fades in within each long note
        for nt0 in note_times:
            j = int(nt0 / fp)
            ramp = np.clip((np.arange(len(pm)) - j - 40) / 60, 0, 1)
            vib_onset = np.maximum(vib_onset * (np.arange(len(pm)) < j), ramp)
        vib = vibrato * np.sin(2 * np.pi * vib_rate * T + rng.uniform(0, 6.28)) * vib_onset
        midi = pm + off + drift * 10 + vib + rng.uniform(-0.06, 0.06)
        f0v = np.where(voiced, midi_hz(midi), 0.0)
        apv = ap2.copy()
        apv[voiced] = np.clip(apv[voiced] * breath, 0, 1)
        y = pw.synthesize(f0v.astype(np.float64), np.ascontiguousarray(sp2), np.ascontiguousarray(apv), sr, frame_period=5.0)
        y = resample(y.astype(np.float32), sr, SR)
        d = int(rng.uniform(0, 0.018) * SR)
        y = np.concatenate([np.zeros(d, np.float32), y])
        p = (v / (nvoices - 1) * 2 - 1) * 0.7 if nvoices > 1 else 0.0
        outs.append(pan(y, p))
    L = max(len(o) for o in outs)
    mix = np.zeros((L, 2), np.float32)
    for o in outs:
        mix[: len(o)] += o
    mix /= max(1.0, np.sqrt(nvoices))
    if return_info:
        return mix, {"note_times": note_times, "segments": len(segs)}
    return mix


# ----------------------------------------------------------------- dynamics
def envelope_follow(x, attack=0.005, release=0.12):
    m = np.abs(mono(x))
    a = np.exp(-1 / (attack * SR))
    r = np.exp(-1 / (release * SR))
    env = np.zeros_like(m)
    e = 0.0
    for i in range(0, len(m)):
        v = m[i]
        e = a * e + (1 - a) * v if v > e else r * e + (1 - r) * v
        env[i] = e
    return env


def sidechain_curve(n, hits, depth=0.5, release=0.22, attack=0.004):
    """Gain curve ducking at given hit times (sec)."""
    g = np.ones(n, np.float32)
    rl = int((release + 0.05) * SR)
    t = np.arange(rl) / SR
    shape = 1 - depth * np.exp(-np.maximum(0, t - attack) / (release / 3)) * np.minimum(1, t / attack + 0.0001)
    for h in hits:
        i = int(h * SR)
        if i >= n:
            continue
        j = min(n, i + rl)
        g[i:j] = np.minimum(g[i:j], shape[: j - i])
    return g[:, None]


def lufs(x):
    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    return meter.integrated_loudness(x.astype(np.float64))


# ----------------------------------------------------------------- word-based choir
_WORD_CACHE = {}


def _word_world(word, voice, speed):
    key = (word, voice, speed)
    if key not in _WORD_CACHE:
        a, sr = tts(word, voice, speed)
        a = trim(a, thresh_db=-40, pad=0.01, sr=sr)
        f0, sp, ap = world_analyze(a, sr)
        _WORD_CACHE[key] = (f0, sp, ap, sr)
    return _WORD_CACHE[key]


def choir_words(items, voice="af_heart", speed=0.85, harmony=(0, -5, -9, -12), vibrato=0.22,
                breath=0.3, seed=11, lead_gain=1.0, spread=0.75, humanize=0.015, formant=1.0,
                tail=0.35):
    """items: list of (word, dur_sec, midi) — or (word, dur_sec, midi, harmony_offsets_tuple).
    Each word: natural-length onset consonants, voiced core stretched to fill dur,
    natural coda. Returns (stereo, onsets) where onsets are word start times (s)."""
    rng = np.random.default_rng(seed)
    fp = 0.005
    seqs = []  # per word: (sp, ap, voiced_mask, base_f0_or_nan)
    F_sp, F_ap, F_v, F_m, F_h = [], [], [], [], []
    onsets = []
    t_cursor = 0
    sr_ref = None
    for it in items:
        word, dur, m = it[0], it[1], it[2]
        harm = it[3] if len(it) > 3 else harmony
        f0, sp, ap, sr = _word_world(word, voice, speed)
        sr_ref = sr
        v = f0 > 0
        vi = np.where(v)[0]
        if len(vi) == 0:
            a0, a1 = 0, len(f0)
        else:
            a0, a1 = vi[0], vi[-1] + 1
        pre = np.arange(0, a0)
        post = np.arange(a1, len(f0))
        core = np.arange(a0, a1)
        core_v = v[a0:a1]
        target = max(int(dur / fp) - len(pre) - len(post), len(core))
        n_unv = int((~core_v).sum())
        n_v = max(1, int(core_v.sum()))
        need_v = max(n_v, target - n_unv)
        # build fractional indices: voiced frames stretched by factor, unvoiced kept
        fac = need_v / n_v
        src = []
        acc = 0.0
        for j, isv in enumerate(core_v):
            step = fac if isv else 1.0
            k0 = int(round(acc))
            acc += step
            k1 = int(round(acc))
            cnt = k1 - k0
            if cnt > 0:
                src += list(a0 + j + np.linspace(0, 1, cnt, endpoint=False))
        idx = np.concatenate([pre.astype(float), np.array(src), post.astype(float)])
        i0 = np.floor(idx).astype(int).clip(0, len(f0) - 1)
        i1 = (i0 + 1).clip(0, len(f0) - 1)
        w = (idx - i0)[:, None]
        sp2 = sp[i0] * (1 - w) + sp[i1] * w
        ap2 = ap[i0] * (1 - w) + ap[i1] * w
        vv = (f0[i0] > 0) | (f0[i1] > 0)
        onsets.append(t_cursor * fp)
        t_cursor += len(idx)
        # pad/truncate to exactly dur so the grid stays locked
        want = int(round(dur / fp))
        if len(idx) < want:
            padn = want - len(idx)
            sp2 = np.concatenate([sp2, np.repeat(sp2[-1:], padn, 0) * 1e-6])
            ap2 = np.concatenate([ap2, np.ones((padn, ap2.shape[1]))])
            vv = np.concatenate([vv, np.zeros(padn, bool)])
            t_cursor += padn
        F_sp.append(sp2); F_ap.append(ap2); F_v.append(vv)
        F_m.append(np.full(len(vv), float(m)))
        F_h.append(np.tile(np.array(harm, float), (len(vv), 1)))
    tailn = int(tail / fp)
    sp = np.concatenate(F_sp + [np.repeat(F_sp[-1][-1:], tailn, 0) * 1e-6])
    ap = np.concatenate(F_ap + [np.ones((tailn, F_ap[-1].shape[1]))])
    vmask = np.concatenate(F_v + [np.zeros(tailn, bool)])
    mid = np.concatenate(F_m + [np.full(tailn, F_m[-1][-1])])
    H = np.concatenate(F_h + [np.repeat(F_h[-1][-1:], tailn, 0)])
    if formant != 1.0:
        nb = sp.shape[1]
        src_bins = np.arange(nb) / formant
        sp = np.stack([np.interp(src_bins, np.arange(nb), r) for r in sp])
    ker = np.hanning(11); ker /= ker.sum()
    sm = lambda a: np.convolve(np.pad(a, 5, mode="edge"), ker, "valid")
    mid_s = sm(mid)
    T = np.arange(len(mid)) * fp
    # vibrato envelope: ramps in during each word after 0.25s
    vib_env = np.zeros(len(mid))
    for o in onsets:
        j = int(o / fp)
        r = np.clip((np.arange(len(mid)) - j - 50) / 70, 0, 1)
        vib_env = np.where(np.arange(len(mid)) >= j, r, vib_env)
    nvoices = H.shape[1]
    outs = []
    for v in range(nvoices):
        off = sm(H[:, v])
        drift = np.cumsum(rng.standard_normal(len(mid))) * 0.003
        drift -= np.convolve(drift, np.ones(100) / 100, "same")
        vib = vibrato * np.sin(2 * np.pi * rng.uniform(4.7, 5.5) * T + rng.uniform(0, 6.28)) * vib_env
        midi = mid_s + off + drift * 8 + vib + rng.uniform(-0.05, 0.05)
        f0v = np.where(vmask, midi_hz(midi), 0.0)
        apv = ap.copy()
        apv[vmask] = np.clip(apv[vmask] * breath, 0, 1)
        y = pw.synthesize(f0v.astype(np.float64), np.ascontiguousarray(sp), np.ascontiguousarray(apv), sr_ref, frame_period=fp * 1000)
        y = resample(y.astype(np.float32), sr_ref, SR)
        d = int(rng.uniform(0, humanize) * SR)
        y = np.concatenate([np.zeros(d, np.float32), y])
        g = lead_gain if v == 0 else 1.0
        p = 0.0 if v == 0 else ((v - 1) / max(1, nvoices - 2) * 2 - 1) * spread
        outs.append(pan(y, p) * g)
    L = max(len(o) for o in outs)
    mix = np.zeros((L, 2), np.float32)
    for o in outs:
        mix[: len(o)] += o
    mix /= np.sqrt(nvoices)
    return mix, onsets


# ----------------------------------------------------------------- tape / master
def tape_wobble(x, depth_ms=2.0, rate=0.6, flutter_ms=0.15, flutter_rate=7.0, seed=0):
    """Time-varying delay (wow + flutter) for lo-fi pitch drift."""
    rng = np.random.default_rng(seed)
    n = len(x)
    t = np.arange(n) / SR
    d = depth_ms / 1000 * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t + rng.uniform(0, 6)))
    d += flutter_ms / 1000 * np.sin(2 * np.pi * flutter_rate * t)
    src = np.arange(n) - d * SR
    src = np.clip(src, 0, n - 1)
    i0 = np.floor(src).astype(int)
    i1 = np.minimum(i0 + 1, n - 1)
    w = (src - i0)[:, None] if x.ndim == 2 else (src - i0)
    return (x[i0] * (1 - w) + x[i1] * w).astype(np.float32)


def saturate(x, drive=1.5):
    return (np.tanh(x * drive) / np.tanh(drive)).astype(np.float32)


def pb_chain(x, plugins):
    import pedalboard as P
    board = P.Pedalboard(plugins)
    y = board(to_stereo(x).T.copy(), SR)
    return y.T.astype(np.float32)


def master(x, target_lufs=-14.0, ceiling_db=-1.0):
    import pedalboard as P
    y = pb_chain(x, [
        P.HighpassFilter(28),
        P.Compressor(threshold_db=-16, ratio=1.8, attack_ms=25, release_ms=200),
        P.HighShelfFilter(cutoff_frequency_hz=9000, gain_db=1.0),
    ])
    cur = lufs(y)
    y = y * db(target_lufs - cur)
    # true-peak-ish limiter: oversample 4x, limit, downsample
    up = soxr.resample(y, SR, SR * 4)
    lim = P.Pedalboard([P.Limiter(threshold_db=ceiling_db - 0.3, release_ms=120)])
    up = lim(up.T.copy(), SR * 4).T
    y = soxr.resample(up, SR * 4, SR).astype(np.float32)
    y = np.clip(y, -db(ceiling_db), db(ceiling_db))
    return y


def true_peak_db(x):
    up = soxr.resample(x, SR, SR * 4)
    return 20 * np.log10(np.abs(up).max() + 1e-12)


def limiter(x, ceiling_db=-1.0, lookahead=0.005, release=0.15, sr=SR):
    """Lookahead brickwall-ish peak limiter (numpy). x: (n,2)."""
    from scipy.ndimage import maximum_filter1d, minimum_filter1d
    c = db(ceiling_db)
    peak = np.abs(x).max(1)
    la = max(1, int(lookahead * sr))
    # peak over the upcoming window
    pk = maximum_filter1d(peak, size=2 * la + 1, origin=0)
    g = np.minimum(1.0, c / np.maximum(pk, 1e-9))
    # smooth: instant-ish attack via min filter, exponential release
    g = minimum_filter1d(g, size=la, origin=0)
    r = np.exp(-1 / (release * sr))
    out = np.empty_like(g)
    e = 1.0
    for i in range(len(g)):  # numba-free loop on decimated gain for speed
        pass
    # decimated release smoothing for speed
    dec = 32
    gd = g[::dec]
    sm = np.empty_like(gd)
    e = 1.0
    rd = r ** dec
    for i, v in enumerate(gd):
        e = v if v < e else rd * e + (1 - rd) * v
        sm[i] = e
    sm = np.repeat(sm, dec)[: len(g)]
    gg = np.minimum(g, sm)
    # smooth tiny steps
    k = np.hanning(2 * la + 1); k /= k.sum()
    gg = np.convolve(np.pad(gg, la, mode='edge'), k, 'valid')
    gg = np.minimum(gg, 1.0)
    return (x * gg[:, None]).astype(np.float32)


def master2(x, target_lufs=-14.0, ceiling_db=-1.0, glue=True):
    import pedalboard as P
    y = to_stereo(x)
    if glue:
        y = pb_chain(y, [P.HighpassFilter(28), P.Compressor(threshold_db=-18, ratio=1.6, attack_ms=30, release_ms=250)])
    for _ in range(3):
        y = y * db(target_lufs - lufs(y))
        up = soxr.resample(y, SR, SR * 4).astype(np.float32)
        up = limiter(up, ceiling_db - 0.2, sr=SR * 4)
        y2 = soxr.resample(up, SR * 4, SR).astype(np.float32)
        if abs(lufs(y2) - target_lufs) < 0.2:
            y = y2
            break
        y = y2
    return y


# ----------------------------------------------------------------- timed speech
def _phon_weight(word):
    k = kokoro()
    try:
        ph = k.tokenizer.phonemize(word, "en-us")
    except Exception:
        ph = word
    ph = [c for c in ph if c not in "ˈˌː "]
    return max(1, len(ph))


def speak_timed(text, voice="af_heart", speed=1.0):
    """Returns (mono audio at SR, [word start times], [words]).
    Word starts estimated by phoneme-count proportion, snapped to energy valleys."""
    import re
    a = speak(text, voice, speed)
    words = [w for w in re.split(r"\s+", text.strip()) if w]
    weights = []
    for w in words:
        core = re.sub(r"[^\w']", "", w)
        wt = _phon_weight(core) if core else 1
        # punctuation pause after word
        pause = 0
        if re.search(r"[,;:]$", w):
            pause = 4
        elif re.search(r"[.!?…]$", w):
            pause = 7
        elif re.search(r"(—|-)$", w):
            pause = 3
        weights.append((wt, pause))
    total = sum(w + p for w, p in weights)
    dur = len(a) / SR
    # energy envelope for snapping
    hop = int(0.005 * SR)
    e = np.sqrt(np.convolve(a ** 2, np.ones(hop * 4) / (hop * 4), "same"))[::hop]
    starts = []
    acc = 0
    for i, (w, p) in enumerate(weights):
        t = acc / total * dur
        if i > 0:
            # snap to min energy within +-70ms
            j = int(t / 0.005)
            lo, hi = max(0, j - 14), min(len(e) - 1, j + 14)
            if hi > lo:
                jm = lo + int(np.argmin(e[lo:hi]))
                t = jm * 0.005
        starts.append(max(0.0, t))
        acc += w + p
    starts[0] = 0.0
    return a, starts, words
