"""Mix stems -> master. Exports out/unclench_audio.wav (60.000 s loop, second cycle)."""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import pedalboard as P
from lib import *

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
OUT = os.path.join(HERE, "..", "out")
os.makedirs(OUT, exist_ok=True)
CYC = 60.0


def L(name):
    p = os.path.join(BUILD, f"stem_{name}.npy")
    return np.load(p) if os.path.exists(p) else None


S = {k: L(k) for k in ["piano", "rhodes", "pad", "strings", "sub", "drums", "perc", "buzz", "tanpura", "bells", "sfx",
                       "oohs", "musicbox", "harp", "crackle", "voice_narr", "voice_guide", "choir", "choir_aahs2"]}
N = len(S["pad"])
t = np.arange(N) / SR
tc = t % CYC
kicks = np.load(os.path.join(BUILD, "kick_times.npy"))
gmask = np.load(os.path.join(BUILD, "groove_mask.npy"))[:N]


def smooth01(x):
    x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)


def env_from(points):
    """piecewise-linear gain (linear amplitude) vs cycle time; points [(t, g)]"""
    ts = [p[0] for p in points]; gs = [p[1] for p in points]
    return np.interp(tc, ts, gs).astype(np.float32)[:, None]


sc = sidechain_curve(N, kicks, depth=0.35, release=0.22)
sc = 1 - (1 - sc) * gmask[:, None]

# ---------------------------------------------------------------- per-stem processing
rh = S["rhodes"]
rh_w = tape_wobble(rh, depth_ms=2.0, rate=0.6)
wob_mix = env_from([(0, 1), (26.8, 1), (27.2, 0), (59.9, 0), (60, 1)])
rh = rh_w * wob_mix + rh * (1 - wob_mix)
rh = pb_chain(rh, [P.Chorus(rate_hz=0.7, depth=0.2, mix=0.35), P.LowpassFilter(6000), P.Compressor(-20, 2.5, 10, 120)])
rh = saturate(rh * 3, 1.3) / 3
# outro subtraction: rhodes out at 51
rh *= env_from([(0, 1), (51.7, 1), (51.85, 0), (59.99, 0), (60, 1)])

piano = lp(S["piano"], 2600)  # muted / felt
pad = lp(S["pad"], 3000) * env_from([(0, 1), (42.5, 1), (42.7, 0.55), (44.9, 0.55), (45.2, 1), (60, 1)])
strings = lp(S["strings"], 6000) * env_from([(0, 1), (52.45, 1), (52.7, 0), (60, 0)])
sub = lp(S["sub"], 180) * env_from([(0, 1), (50.95, 1), (51.1, 0), (59.9, 0), (60, 1)])
drums = hp(S["drums"], 30)
drums = pb_chain(drums, [P.Compressor(-18, 3, 5, 80), P.LowpassFilter(9000)])
perc = S["perc"]
# sub harmonics so the low end survives phone speakers
sub_h = lp(hp(saturate(S["sub"] * 4, 2.5), 140), 1000) * env_from([(0, 1), (50.95, 1), (51.1, 0), (59.9, 0), (60, 1)])
oohs = S["oohs"] * env_from([(0, 1), (52.45, 1), (52.6, 0.55), (54.0, 0.5), (56.0, 0.0), (60, 0)])
musicbox = S["musicbox"] * env_from([(0, 1), (46.3, 1), (46.7, 0), (60, 0)])
bells = S["bells"]
harp = S["harp"]
tan = S["tanpura"]
buzz = S["buzz"]
crackle = S["crackle"]
sfx = S["sfx"]
aahs = S["choir_aahs2"] if S["choir_aahs2"] is not None else np.zeros_like(pad)

# ---------------------------------------------------------------- vocals
narr = S["voice_narr"]
narr = pb_chain(narr, [P.HighpassFilter(90), P.PeakFilter(3500, 2.0, 1.0), P.LowShelfFilter(200, -1.5),
                       P.Compressor(-22, 3.0, 4, 90), P.Gain(4)])
# unclenched narrator from 30 s gets a light plate
narr_wet = reverb(narr, 1.2, wet=1.0, dry=0.0, predelay=0.02, seed=3)
narr = narr + narr_wet * env_from([(0, 0.05), (29.9, 0.05), (30.0, 0.12), (59.9, 0.12), (60, 0.05)])
guide = S["voice_guide"]
guide = pb_chain(guide, [P.HighpassFilter(80), P.HighShelfFilter(7000, 2.0), P.Compressor(-22, 2.5, 6, 120), P.Gain(4)])
guide = guide * env_from([(0, 1), (53.9, 1), (54.0, db(-5)), (55.4, db(-5)), (55.45, db(-3)), (58.4, db(-3)), (58.5, 1), (60, 1)])
g_wet = reverb(guide, 1.8, wet=1.0, dry=0.0, predelay=0.04, seed=4)
guide = guide + g_wet * env_from([(0, 0.0), (21.0, 0.0), (28.0, 0.16), (55.9, 0.16), (56.1, 0.03), (60, 0.0)])

choir = S["choir"]
choir = pb_chain(choir, [P.Chorus(rate_hz=0.4, depth=0.15, mix=0.3), P.Compressor(-20, 2, 10, 150)])
# comic chop gets slapback + small room; sacred gets big hall
choir_hall = reverb(choir, 4.5, wet=1.0, dry=0.0, predelay=0.04, seed=6)
choir_room = delay(choir, 0.11, fb=0.15, wet=0.35, pingpong=False)
is_comic = env_from([(0, 1), (1.6, 1), (1.7, 0), (13.0, 0), (13.1, 1), (15.5, 1), (15.6, 0), (59.1, 0), (59.2, 1), (60, 1)])
choir = choir_room * is_comic + (choir + choir_hall * 0.55) * (1 - is_comic)
aahs = reverb(aahs, 3.5, wet=0.5)

voice_bus = narr + guide
voice_bus = voice_bus * env_from([(0, 1), (29.9, 1), (30.0, db(-2.5)), (35.9, db(-2.5)), (36.0, 1), (60, 1)])
# speech-bus ducking of the bed (3 dB)
venv = envelope_follow(voice_bus[::8], attack=0.01, release=0.25)
venv = np.repeat(venv, 8)[:N]
duck = (1 - 0.3 * np.clip(venv / (venv.max() + 1e-9) * 4, 0, 1))[:, None]

# ---------------------------------------------------------------- gains (linear) -> bed
G = dict(piano=1.6, rhodes=2.2, pad=0.55, strings=0.65, sub=0.17, drums=1.4, perc=2.0, buzz=1.0, tanpura=1.0,
         bells=0.9, harp=0.9, oohs=1.5, musicbox=0.9, crackle=0.9, sfx=1.0, aahs=2.2)
hard_duck = (1 - 0.55 * np.clip(venv / (venv.max() + 1e-9) * 4, 0, 1))[:, None]
musicbox = musicbox * hard_duck
musicbox = musicbox * env_from([(0, 1), (37.4, 1), (37.5, db(-5)), (39.0, db(-5)), (39.1, 1), (60, 1)])
bells = bells * hard_duck
bed = (piano * G["piano"] + rh * G["rhodes"] * sc + pad * G["pad"] * sc + strings * G["strings"] + sub * G["sub"] * sc
       + drums * G["drums"] + perc * G["perc"] + buzz * G["buzz"] + tan * G["tanpura"] + bells * G["bells"]
       + harp * G["harp"] + oohs * G["oohs"] + musicbox * G["musicbox"] + aahs * G["aahs"] + sub_h * 0.06 * sc)
bed = reverb(bed, 2.2, wet=0.12, seed=8)
# 5.25 duck -8 dB 'That one.'
bed *= env_from([(0, 1), (5.2, 1), (5.25, db(-8)), (5.95, db(-8)), (6.0, 1), (60, 1)])
# drums duck -4 dB under the choir chop
bed = bed * duck
lift = env_from([(0, 1), (35.98, 1), (36.0, db(3)), (42.5, db(3)), (42.75, 1), (60, 1)])
bed = bed * lift
# piano stab ducked under the first words of the hook
stab_duck = env_from([(0, 1), (0.10, 1), (0.14, db(-4)), (0.6, db(-4)), (0.9, 1), (60, 1)])
mix = bed * stab_duck + sfx * G["sfx"] * (0.4 + 0.6 * duck) + crackle * G["crackle"] + voice_bus * 1.7 + choir * 1.1 * (0.55 + 0.45 * duck) * lift

# ---------------------------------------------------------------- tape stop 17.55-18.0 (each cycle) + silence to 18.4
for off in [0.0, CYC]:
    a, b = int((off + 17.55) * SR), int((off + 18.0) * SR)
    seg = mix[a:b].copy()
    pre = mix[:a]
    ts = tape_stop(np.concatenate([mix[a - int(0.6 * SR):a], seg]), 0.45)[-len(seg):]
    mix[a:b] = ts
    # 18.0-18.4: nearly silent except crackle (crackle is re-added below)
    c0, c1 = b, int((off + 18.4) * SR)
    mix[c0:c1] *= 0.0
    mix[c0:c1] += (crackle * G["crackle"])[c0:c1]

np.save(os.path.join(BUILD, 'premix.npy'), mix[int(CYC*SR):int(2*CYC*SR)])
np.save(os.path.join(BUILD, 'prevoice.npy'), (voice_bus * 1.7)[int(CYC*SR):int(2*CYC*SR)])
# ---------------------------------------------------------------- master & export second cycle
seg = mix[int(CYC * SR): int(2 * CYC * SR)]
pre_lufs = lufs(seg)
m = master2(seg, target_lufs=-14.0, ceiling_db=-1.0)
write(os.path.join(OUT, "unclench_audio.wav"), m)
print("pre-master LUFS", round(pre_lufs, 2), "-> master LUFS", round(lufs(m), 2), "TP", round(true_peak_db(m), 2))

# stem diagnostics: RMS (dBFS) of each bus over its active region in the exported cycle
def act_rms(x):
    x = mono(x[int(CYC * SR): int(2 * CYC * SR)])
    e = np.abs(x)
    m_ = e > 1e-4
    return round(float(20 * np.log10(np.sqrt((x[m_] ** 2).mean()) + 1e-9)), 1) if m_.any() else None
diag = {k: act_rms(v) for k, v in dict(voice=voice_bus, choir=choir, bed=bed, sfx=sfx, crackle=crackle).items()}
print("bus active RMS:", diag)
# loudness per 3s bar
bars = [round(float(20 * np.log10(np.sqrt((mono(m[i * 3 * SR:(i + 1) * 3 * SR]) ** 2).mean()) + 1e-9)), 1) for i in range(20)]
print("RMS per bar:", bars)
