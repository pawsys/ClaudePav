"""UNCLENCH (you are the sky) - music bed + sfx.

Renders two 60 s cycles (120 s) so tails spill over the loop seam;
the final export takes 60-120 s. All times below are cycle-relative.
"""
import sys, json, os
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import pedalboard as P
from lib import *
from theory import voicing, bass_note

BPM = 80
BEAT = 60 / BPM          # 0.75
BAR = 4 * BEAT           # 3.0
S16 = BEAT / 4           # 0.1875
SWING = 0.56
CYC = 60.0
TOTAL = 2 * CYC + 4.0    # extra tail room
OFFS = [0.0, CYC]
N = int(TOTAL * SR)
BUILD = os.path.join(os.path.dirname(__file__), "build")
os.makedirs(BUILD, exist_ok=True)


def bar_t(b, beat=0.0):
    """1-based bar -> seconds."""
    return (b - 1) * BAR + beat * BEAT


def swing16(i):
    """time offset of 16th index i within a beat grid with swing on odd 16ths"""
    t = i * S16
    if i % 2 == 1:
        t += (SWING - 0.5) * 2 * S16
    return t


def swing8(i):
    t = i * BEAT / 2
    if i % 2 == 1:
        t += (SWING - 0.5) * BEAT
    return t


def buf():
    return np.zeros((N, 2), np.float32)


rng = np.random.default_rng(7)
sf = SF()

# ------------------------------------------------------------------ chords
CHORDS = {1: "Bm9", 2: "Gmaj9", 3: "D/F#", 4: "Asus4", 5: "Bm9", 6: "Gmaj9", 7: None, 8: "Dadd9",
          9: "Gmaj9", 10: "D/F#", 11: "Bm9", 12: "Gmaj9", 13: "Dadd9", 14: "Gmaj9", 15: "Bm11",
          16: "D/F#", 17: "Gmaj9", 18: "Asus4", 19: "Dadd9", 20: "Asus4"}
# half-bar changes (bar, beat, chord)
SPLITS = {10: (2, "Asus4"), 12: (2, "A13sus")}


def chord_events(bars, low=50, high=74, max_notes=5):
    """yields (t0, dur, symbol, upper_notes, bass_midi) with voice leading"""
    out = []
    prev = None
    for b in bars:
        sym = CHORDS.get(b)
        if not sym:
            continue
        segs = [(0, 4, sym)]
        if b in SPLITS:
            beat, s2 = SPLITS[b]
            segs = [(0, beat, sym), (beat, 4 - beat, s2)]
        for (bt, nb, s) in segs:
            v = voicing(s, low, high, prev, max_notes)
            prev = v
            out.append((bar_t(b, bt), nb * BEAT, s, v, bass_note(s, 33, 45)))
    return out


# ------------------------------------------------------------------ stems
stems = {k: buf() for k in ["piano", "rhodes", "pad", "strings", "sub", "drums", "perc", "buzz", "tanpura",
                            "bells", "sfx", "choir_aahs", "oohs", "musicbox", "harp", "crackle"]}
kick_times = []          # for sidechain (absolute)
groove_mask = np.zeros(N, np.float32)  # 1 where pad/rhodes sidechain is active


def add(stem, x, t, g=1.0):
    place(stems[stem], x, t, g)


def sfr(notes, program, bank=0, drums=False, tail=4.0, dur=None):
    """render soundfont notes (absolute times) into an array of length N"""
    if not notes:
        return buf()
    x = sf.render(notes, TOTAL - 0.01, program=program, bank=bank, drums=drums, tail=0)
    out = buf()
    out[: len(x)] = x[:N]
    return out


for off in OFFS:
    # ============================================================== HOOK 0-6
    # 0.00 sub thump B1 + muted grand Bm(add9) cluster stab
    add("sub", sub_bass([(off + 0.0, 1.4, nm("B1"), 120)], 2.0, drive=2.0) * np.linspace(1, 0, int(2.0 * SR))[:, None] ** 2, 0)
    add("drums", kick(1.0, tone=46, decay=0.6), off + 0.0, 0.9)
# piano stab notes collected per cycle below (soundfont render once)
piano_notes, rhodes_notes, pad_notes, string_notes, aah_notes, ooh_notes = [], [], [], [], [], []
mbox_notes, celesta_notes, kalimba_notes, harp_notes, marimba_notes, felt_notes, glock_notes = [], [], [], [], [], [], []
gm_drums, brush_drums = [], []
sub_notes = []

for off in OFFS:
    o = off
    # ---- HOOK
    for n in ["B2", "F#3", "C#4", "D4"]:
        piano_notes.append((o + 0.0, 2.6, nm(n), 52))
    # 3.00 piano G2 + soft Rhodes Gmaj9 swell
    piano_notes.append((o + 3.0, 2.6, nm("G2"), 55))
    for n in voicing("Gmaj9", 52, 74):
        rhodes_notes.append((o + 3.0, 2.9, n, 38))
    # 4.50 kalimba grab motif B4-D5-F#5 16ths
    for i, n in enumerate(["B4", "D5", "F#5"]):
        kalimba_notes.append((o + 4.5 + i * S16, 0.3, nm(n), 92))

    # ---- VERSE 1 groove 6.0-17.55 (stop-time 9.0-10.5)
    for (t0, d, s, v, bn) in chord_events(range(3, 7)):
        tt = o + t0
        if 9.0 <= t0 < 10.5:
            # stop-time: only re-enter at 10.5 resolving to A major
            continue
        for n in v:
            rhodes_notes.append((tt + rng.uniform(0, 0.015), d * 0.96, n, 50 + rng.integers(-4, 5)))
            pad_notes.append((tt, d, n, 46))
        sub_notes.append((tt, d * 0.55, bn, 105))
        sub_notes.append((tt + 3 * BEAT, BEAT * 0.9, bn, 85))
    # bar 4 resolution at 10.5 to A major
    for n in ["A2", "C#3", "E3", "A3"]:
        rhodes_notes.append((o + 10.5, 1.45, nm(n), 52))
    sub_notes.append((o + 10.5, 1.3, nm("A1"), 100))

    def boombap(b0, b1, hats16_from=None, skip=None):
        for b in range(b0, b1):
            for i in range(16):
                t = bar_t(b) + (i // 4) * BEAT + swing16(i % 4)
                if skip and skip[0] <= t < skip[1]:
                    continue
                if t >= 17.55:
                    continue
                v = int(np.clip(80 + rng.integers(-12, 13), 40, 127))
                if i in (0, 6) or (i == 10 and b % 2 == 0):
                    gm_drums.append((o + t, 0.2, 36, 110))
                    kick_times.append(o + t)
                    add("drums", kick(0.7, tone=50, decay=0.35), o + t, 0.55)
                if i in (4, 12):
                    gm_drums.append((o + t, 0.2, 38, 96))
                    gm_drums.append((o + t, 0.2, 37, 70))
                use16 = hats16_from is not None and t >= hats16_from
                if (i % 2 == 0) or use16:
                    gm_drums.append((o + t, 0.1, 42, v if i % 2 == 0 else int(v * 0.7)))
    boombap(3, 7, hats16_from=16.5, skip=(9.0, 10.5))
    # 10.5 one-beat rim fill on A
    for k in range(4):
        gm_drums.append((o + 10.5 + k * S16, 0.1, 37, 70 + 10 * k))
    groove_mask[int((o + 6.0) * SR): int((o + 17.55) * SR)] = 1

    # ---- 12.90 marimba blink tick; 13.5 grab motif doubling choir chop
    marimba_notes.append((o + 12.9, 0.2, nm("F#6"), 70))
    for i, n in enumerate(["B4", "D5", "F#5"]):
        kalimba_notes.append((o + 13.5 + i * 0.375, 0.3, nm(n), 80))

    # ---- CHORUS 1 21-30
    for (t0, d, s, v, bn) in chord_events(range(8, 11), low=50, high=76):
        for n in v:
            pad_notes.append((o + t0, d, n, 58))
        sub_notes.append((o + t0, d * 0.9, bn, 80))
    # strings swell at 24 over Gmaj9 (bar 9) through bar 10
    for n in voicing("Gmaj9", 55, 79, max_notes=5):
        string_notes.append((o + 24.0, 3.0, n, 60))
    for n in voicing("D/F#", 55, 79, max_notes=4):
        string_notes.append((o + 27.0, 3.0, n, 56))
    celesta_notes += [(o + 22.5, 0.6, nm("A5"), 70), (o + 23.25, 0.6, nm("F#5"), 66), (o + 26.25, 1.2, nm("A6"), 72)]
    # harp glissando up D major pentatonic 23.6-24.0
    rs_src = sf.render([(0, 1.2, n, 70) for n in voicing("Gmaj9", 55, 79)], 1.5, program=89, tail=0)
    add("sfx", reverse_swell(rs_src, 1.0, 2.5) * 1.6, o + 23.0)
    # Rhodes clean from 27
    for (t0, d, s, v, bn) in chord_events([10]):
        for n in v:
            rhodes_notes.append((o + t0 + rng.uniform(0, 0.012), d * 0.95, n, 46))
    # 27 brush kit 60%
    for b in [10]:
        for i in range(16):
            t = bar_t(b) + (i // 4) * BEAT + swing16(i % 4)
            if i == 0:
                brush_drums.append((o + t, 0.2, 36, 72)); kick_times.append(o + t)
            if i in (4, 12):
                brush_drums.append((o + t, 0.3, 38, 66))
            brush_drums.append((o + t, 0.1, 70, 36 + (12 if i % 4 == 0 else 0)))
    groove_mask[int((o + 27.0) * SR): int((o + 30.0) * SR)] = 0.5

    # ---- VERSE 2 30-36 half-time
    for (t0, d, s, v, bn) in chord_events([11, 12]):
        for n in v:
            rhodes_notes.append((o + t0 + rng.uniform(0, 0.012), d * 0.95, n, 48))
            pad_notes.append((o + t0, d, n, 40))
        sub_notes.append((o + t0, d * 0.7, bn, 95))
    for b in [11, 12]:
        for i in range(16):
            t = bar_t(b) + (i // 4) * BEAT + swing16(i % 4)
            if i == 0 or (i == 7 and b == 12):
                brush_drums.append((o + t, 0.2, 36, 92)); kick_times.append(o + t)
                add("drums", kick(0.6, tone=48, decay=0.4), o + t, 0.4)
            if i == 8:
                brush_drums.append((o + t, 0.3, 38, 84))
            if i % 2 == 0:
                brush_drums.append((o + t, 0.1, 70, 40 + rng.integers(0, 14)))
    # brush roll 35.25 (16th-ish roll)
    for k in range(10):
        brush_drums.append((o + 35.25 + k * 0.075, 0.1, 38, 40 + 5 * k))
    groove_mask[int((o + 30.0) * SR): int((o + 36.0) * SR)] = 0.6
    # arrows celesta notes in place of impacts
    for t, n in [(30.75 + 0.42, "D6"), (31.5 + 0.42, "F#6"), (32.25 + 0.42, "A6"), (33.0 + 0.42, "E6")]:
        celesta_notes.append((o + t, 0.8, nm(n), 74))
    # 33.0 kalimba unlock blip
    kalimba_notes += [(o + 33.0, 0.2, nm("A5"), 80), (o + 33.0 + S16, 0.4, nm("D6"), 86)]
    # volley 34.5-35.4 celesta 16th cascade (pentatonic descending)
    casc = [nm(x) for x in ["D7", "B6", "A6", "F#6", "E6", "D6", "B5", "A5"]]
    for k, n in enumerate(casc):
        celesta_notes.append((o + 34.5 + k * 0.11, 0.6, n, 46 - k * 2))
    # 35.6 glass ting
    glock_notes.append((o + 35.6, 1.0, nm("A6"), 60))

    # ---- CHORUS 2 DROP 36-42.75
    for (t0, d, s, v, bn) in chord_events([13, 14]):
        for n in v:
            rhodes_notes.append((o + t0 + rng.uniform(0, 0.012), d * 0.95, n, 54))
            pad_notes.append((o + t0, d, n, 50))
        sub_notes.append((o + t0, d * 0.55, bn, 110))
        sub_notes.append((o + t0 + 3 * BEAT, BEAT * 0.9, bn, 90))
    for n in voicing("Dadd9", 55, 81, max_notes=5):
        string_notes.append((o + 36.0, 3.0, n, 64))
    for n in voicing("Gmaj9", 55, 81, max_notes=5):
        string_notes.append((o + 39.0, 3.75, n, 70))
    for b in [13, 14]:
        for i in range(16):
            t = bar_t(b) + (i // 4) * BEAT + swing16(i % 4)
            if i in (0, 6):
                brush_drums.append((o + t, 0.2, 36, 110)); kick_times.append(o + t)
                add("drums", kick(0.85, tone=50, decay=0.4), o + t, 0.6)
            if i in (4, 12):
                brush_drums.append((o + t, 0.3, 38, 100))
                gm_drums.append((o + t, 0.2, 39, 64))  # soft clap
            brush_drums.append((o + t, 0.1, 70, 46 + rng.integers(0, 16)))
    # music box + celesta 16th arpeggios D major pentatonic
    arp = [nm(x) for x in ["D5", "F#5", "A5", "B5", "A5", "F#5", "E5", "A5"]]
    for k in range(int(6.75 / S16)):
        t = 36.0 + k * S16
        mbox_notes.append((o + t, 0.3, arp[k % len(arp)] + (12 if (k // 16) % 2 else 0), 54 + (8 if k % 4 == 0 else 0)))
    # harp arpeggio at 39
    for i, n in enumerate([nm(x) for x in ["G3", "D4", "F#4", "A4", "B4", "D5", "F#5", "A5"]]):
        harp_notes.append((o + 39.0 + i * S16, 2.0, n, 66))
    celesta_notes.append((o + 41.25, 1.4, nm("A6"), 72))
    # choir aahs double (36 and 39) handled with choir; here soft pad of aahs during drop
    groove_mask[int((o + 36.0) * SR): int((o + 42.75) * SR)] = 1.0

    # ---- METTA 42.75-46.5: Bm11 (bar 15) -> D/F# (bar 16 from 45)
    for (t0, d, s, v, bn) in chord_events([15, 16, 17, 18]):
        # rhodes until 51 (don't examine), pad continues
        for n in v:
            if t0 < 51.75:
                rhodes_notes.append((o + t0 + rng.uniform(0, 0.012), min(d, 51.75 - t0) * 0.95, n, 40))
            pad_notes.append((o + t0, d, n, 44))
        if t0 < 51.0:
            sub_notes.append((o + t0, min(d, 51.0 - t0) * 0.8, bn, 80))
    for (t0, d, s, v, bn) in chord_events([15, 16]):
        for n in v:
            string_notes.append((o + t0, d, n, 46))
    for n in voicing("Gmaj9", 55, 79, max_notes=4):
        string_notes.append((o + 48.0, 3.0, n, 40))
    for n in voicing("Asus4", 55, 79, max_notes=4):
        string_notes.append((o + 51.0, 1.5, n, 34))
    # music box lullaby B4 D5 F#5 D5 B4 quarter notes at 42.75
    for k, n in enumerate(["B4", "D5", "F#5"]):
        mbox_notes.append((o + 42.75 + k * BEAT, 0.7, nm(n), 36))
    # kick + shaker 42.75-48 (shaker out at 46.5)
    for b in [15, 16, 17]:
        for i in range(16):
            t = bar_t(b) + (i // 4) * BEAT + swing16(i % 4)
            if t < 42.75 or t >= 50.25:
                continue
            if i in (0, 6):
                brush_drums.append((o + t, 0.2, 36, 84))
            if t < 49.5:
                brush_drums.append((o + t, 0.1, 70, 34 + rng.integers(0, 10)))
    # voice oohs cluster D4 E4 F#4 A4 from 45, thinning to F#4 at 52.5, fading 54-56
    for n in ["D4", "E4", "A4"]:
        ooh_notes.append((o + 48.6, 3.9, nm(n), 56))
    ooh_notes.append((o + 48.6, 7.4, nm("F#4"), 58))

    # ---- REST 54-60
    felt_notes += [(o + 57.0, 3.2, nm(n), 34) for n in ["A2", "D3", "E3"]]
    for n in voicing("Asus4", 50, 72, max_notes=4):
        pad_notes.append((o + 58.5, 1.45, n, 46))
    # 59.25 grab motif
    for i, n in enumerate(["B4", "D5", "F#5"]):
        kalimba_notes.append((o + 59.25 + i * S16, 0.3, nm(n), 86))

# ------------------------------------------------------------------ render soundfont stems
print("rendering soundfont stems...")
stems["piano"] += sfr(piano_notes, 0)
stems["rhodes"] += sfr(rhodes_notes, 4)
stems["pad"] += sfr(pad_notes, 89)
stems["strings"] += sfr(string_notes, 49)
stems["oohs"] += sfr(ooh_notes, 53)
stems["musicbox"] += sfr(mbox_notes, 10)
stems["bells"] += sfr(celesta_notes, 8) + sfr(kalimba_notes, 108) * 0.9 + sfr(marimba_notes, 12) * 0.6 + sfr(glock_notes, 9) * 0.5
stems["harp"] += sfr(harp_notes, 46)
stems["piano"] += sfr(felt_notes, 0) * 0.9
stems["drums"] += sfr(gm_drums, 0, bank=128, drums=True)
stems["perc"] += sfr(brush_drums, 40, bank=128, drums=True)
stems["sub"] += sub_bass(sub_notes, TOTAL)[:N]

# ------------------------------------------------------------------ buzz <-> tanpura drone mirror
print("drone...")
t = np.arange(N) / SR
tc = t % CYC  # cycle-relative
# frequency curve (Hz): A1 buzz, glide to D2 over 21-22.5, back to A1 over 59.25-60
def smooth01(x):
    x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)
semis = np.where(tc < 21.0, 0.0, np.where(tc < 22.5, 5 * smooth01((tc - 21.0) / 1.5), np.where(tc < 59.25, 5.0, 5 - 5 * smooth01((tc - 59.25) / 0.7))))
f = midi_hz(nm("A1") + semis)
# "buzziness" 1 = evil buzz, 0 = clean tanpura
buzzy = np.where(tc < 21.0, 1.0, np.where(tc < 22.5, 1 - smooth01((tc - 21.0) / 1.5), np.where(tc < 59.25, 0.0, smooth01((tc - 59.25) / 0.7))))
trem_rate = np.where(tc < 15.0, 11.0, np.where(tc < 17.55, 11 + 5 * smooth01((tc - 15.0) / 2.55), 11.0))
# level (dB) for buzz
lvl_db = np.full(N, -26.0)
lvl_db = np.where((tc >= 15.0) & (tc < 17.55), -26 + 12 * smooth01((tc - 15.0) / 2.55), lvl_db)
lvl_db = np.where((tc >= 17.55) & (tc < 18.4), -80.0, lvl_db)
lvl_db = np.where((tc >= 18.4) & (tc < 21.0), -20.0, lvl_db)
lvl_db = np.where((tc >= 21.0), -22.0 - 14.0 * smooth01((tc - 21.5) / 2.0), lvl_db)
lvl_db = np.where((tc >= 59.25), -36.0 + 14.0 * smooth01((tc - 59.25) / 0.6), lvl_db)
lvl_db = np.where((tc >= 4.5) & (tc < 6.0), lvl_db + 3, lvl_db)
level = db(lvl_db)
level = np.convolve(level, np.ones(480) / 480, "same")
ph = 2 * np.pi * np.cumsum(f) / SR
ph2 = 2 * np.pi * np.cumsum(f * 2 ** (9 / 1200 * buzzy)) / SR
saw1 = 2 * ((ph / (2 * np.pi)) % 1) - 1
saw2 = 2 * ((ph2 / (2 * np.pi)) % 1) - 1
sine = np.sin(ph)
trem_ph = 2 * np.pi * np.cumsum(trem_rate) / SR
trem = 1 - 0.6 * buzzy * (0.5 + 0.5 * np.sign(np.sin(trem_ph)) * 0.8 + 0.5 * 0.2 * np.sin(trem_ph))
buzz_raw = (sine * 0.6 + (saw1 + saw2) * 0.35 * buzzy)
buzz_raw = lp(buzz_raw.astype(np.float32), 400)
# bitcrush blend
crushed = np.round(buzz_raw * 512) / 512
buzz_sig = (buzz_raw * (1 - buzzy) + crushed * buzzy) * trem
stems["buzz"] += to_stereo(buzz_sig * level * 2.2)
# tanpura: D2/A2 drone with bright jawari-ish harmonics, active 21-59.5 cycle time
tan_env = smooth01((tc - 21.0) / 2.0) * (1 - smooth01((tc - 59.0) / 0.8)) * (1 - 0.45 * smooth01((tc - 53.0) / 2.0))
tan = np.zeros(N, np.float32)
for base, amp in [(nm("D2"), 1.0), (nm("A2"), 0.8), (nm("D3"), 0.5)]:
    fr = midi_hz(base)
    for h in range(1, 12):
        shimmer = 1 + 0.35 * np.sin(2 * np.pi * (0.3 + 0.07 * h) * t + h)
        tan += (amp / h ** 0.9) * shimmer * np.sin(2 * np.pi * fr * h * t + h * 1.7)
tan = lp(tan, 2600)
stems["tanpura"] += pan(tan * tan_env * 0.03, 0.0)
# subtle stereo widen tanpura
stems["tanpura"] = delay(stems["tanpura"], 0.013, fb=0.0, wet=0.4, pingpong=True)

# ------------------------------------------------------------------ SFX
print("sfx...")
for off in OFFS:
    o = off
    # lightning crackles 0.40 / 1.60 (+ 60 Hz thump)
    for tl in [0.40, 1.60, 9.40, 17.0]:
        n_ = int(0.25 * SR)
        tt = np.arange(n_) / SR
        cr = bp(np.random.default_rng(int(tl * 100)).standard_normal((n_, 2)).astype(np.float32), 800, 7000) * np.exp(-tt / 0.03)[:, None]
        th = to_stereo(np.sin(2 * np.pi * 60 * tt) * np.exp(-tt / 0.12))
        add("sfx", cr * 0.2 + th * 0.3, o + tl)
        add("sfx", lp(thunder(3.0, seed=int(tl * 10), dist=0.7), 250), o + tl + 0.05, 0.4)
    # 4.50 thwip + bubble pop
    add("sfx", thwip(), o + 4.5, 0.8)
    pop_n = int(0.06 * SR); tt = np.arange(pop_n) / SR
    add("sfx", to_stereo(np.sin(2 * np.pi * (900 - 6000 * tt) * tt) * np.exp(-tt / 0.012)), o + 4.62, 0.4)
    # 5.25 marker squeak x2
    for k in range(2):
        sq_n = int(0.22 * SR); tt = np.arange(sq_n) / SR
        sq = bp(np.random.default_rng(k).standard_normal(sq_n).astype(np.float32), 2500, 6000) * np.sin(np.pi * tt / 0.22) * (0.6 + 0.4 * np.sin(2 * np.pi * 38 * tt))
        add("sfx", to_stereo(sq * 0.1), o + 5.3 + k * 0.22)
    # 5.40-6.00 reverse snare swell
    sn = snare(1.0)
    add("sfx", reverse_swell(sn, 0.6, 1.8) * 0.8, o + 5.4)
    # 9.0 reversed piano swell peaking at 9.00 + sub drop on ALL
    rev = sf.render([(0, 1.5, nm(n), 70) for n in ["A2", "D3", "E3", "A3"]], 2.0, program=0, tail=0)
    rv = reverb(rev, 2.5, wet=0.8)[::-1].copy()
    rv = fade(rv[-int(1.5 * SR):], 1.0, 0.01)
    add("sfx", rv * 0.9, o + 9.0 - 1.5)
    sd_n = int(1.3 * SR); tt = np.arange(sd_n) / SR
    fdrop = 55 * (30 / 55) ** (tt / 1.2)
    add("sub", to_stereo(np.sin(2 * np.pi * np.cumsum(fdrop) / SR) * np.exp(-tt / 0.9) * 0.6), o + 9.15)
    # paper slide 13.5, paper tear 15.0
    ps_n = int(0.35 * SR); tt = np.arange(ps_n) / SR
    add("sfx", to_stereo(bp(np.random.default_rng(3).standard_normal(ps_n).astype(np.float32), 1500, 7000) * np.sin(np.pi * tt / 0.35) * 0.12), o + 13.35)
    pt_n = int(0.4 * SR); tt = np.arange(pt_n) / SR
    tear = bp(np.random.default_rng(5).standard_normal(pt_n).astype(np.float32), 900, 8000) * (0.5 + 0.5 * (np.random.default_rng(6).random(pt_n) > 0.7)) * np.exp(-tt / 0.18)
    add("sfx", to_stereo(tear * 0.3), o + 15.0)
    # 16.5 noise riser to tape stop
    add("sfx", noise_riser(1.05, 300, 8000, peak=1.0), o + 16.5, 0.5)
    # 20.25 reverse swell into the chorus (done with choir later); harp gliss + reverse cymbal 23.6-24
    rc = noise_riser(0.4, 2000, 12000, peak=0.6, seed=9)
    add("sfx", rc, o + 23.6, 0.6)
    # singing bowls
    add("sfx", singing_bowl(midi_hz(nm("D4")), 9.0, 0.9, seed=1), o + 22.25, 0.8)
    add("sfx", singing_bowl(midi_hz(nm("D4")), 10.0, 1.0, seed=2), o + 54.0, 0.6)
    # arrows whooshes 30.75, 31.5, 32.25, 33.0 (L->R alternating)
    for k, ta in enumerate([30.75, 31.5, 32.25, 33.0]):
        add("sfx", whoosh(0.7, -1 if k % 2 == 0 else 1, 1 if k % 2 == 0 else -1, seed=20 + k), o + ta, 0.7)
    for k in range(12):
        ta = 34.5 + k * 0.075
        add("sfx", whoosh(0.5, -1 + 2 * ((k * 7) % 5) / 4, 1 - 2 * ((k * 3) % 5) / 4, f0=600, f1=4000, seed=40 + k), o + ta, 0.16)
    add("sfx", noise_riser(0.25, 800, 9000, peak=0.6, seed=11), o + 35.75, 0.4)
    # reverse cymbal into seam 59.25-59.97 (peaks at 59.97)
    add("sfx", noise_riser(0.72, 1500, 12000, peak=0.9, seed=13), o + 59.25, 0.65)
    # 59.25 thwip + 'hup'
    add("sfx", thwip(), o + 59.25, 0.8)

# vinyl crackle bed throughout (stronger in clenched sections)
cr = vinyl(TOTAL, crackle=1.0, hiss=0.7)[:N]
crack_lvl = np.where(tc < 21.0, 1.0, np.where(tc < 54.0, 0.55, 0.8))
stems["crackle"] += cr * crack_lvl[:, None] * 1.4

# thought-chatter bed 15.0-17.55 (six voices murmuring fragments)
print("chatter...")
frags = ["am i doing this right", "reply to him", "is this jhana", "i should be calmer by now", "did i lock it", "what if they", "rent"]
voices = ["af_bella", "af_nicole", "bf_emma", "am_puck", "af_sky", "am_michael"]
chat = buf()
for off in OFFS:
    for k, (fr_, vv) in enumerate(zip(frags, voices + voices[:1])):
        a = speak(fr_, vv, 1.05)
        a = bp(a, 300, 3000)
        st = off + 15.0 + k * 0.33
        g = db(-24 + 8 * (k / 6))
        place(chat, pan(a, -0.9 + 1.8 * ((k * 5) % 7) / 6) * g * 1.4, st)
stems["sfx"] += reverb(chat, 1.2, wet=0.3)

np.save(os.path.join(BUILD, "kick_times.npy"), np.array(kick_times))
np.save(os.path.join(BUILD, "groove_mask.npy"), groove_mask)
for k, v in stems.items():
    np.save(os.path.join(BUILD, f"stem_{k}.npy"), v)
print("stems:", {k: round(float(20 * np.log10(np.sqrt((v ** 2).mean()) + 1e-9)), 1) for k, v in stems.items()})
