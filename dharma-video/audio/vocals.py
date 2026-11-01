"""Spoken vocals + vocoder choir for UNCLENCH. Reads ../script.json.
Writes build/stem_voice_*.npy, build/stem_choir.npy and ../visual/timing.js."""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import pedalboard as P
from lib import *

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
SCRIPT = json.load(open(os.path.join(HERE, "..", "script.json")))
CYC = 60.0
TOTAL = 2 * CYC + 4.0
N = int(TOTAL * SR)
OFFS = [0.0, CYC]

VOICE = {"narrator": ("am_michael", 0.95), "narrator_soft": ("am_michael", 0.92), "guide": ("af_heart", 0.88),
         "guide_slow": ("af_heart", 0.85), "whisper": ("af_heart", 0.84)}

narr = np.zeros((N, 2), np.float32)
guide = np.zeros((N, 2), np.float32)
timing = {"lines": [], "choir": []}
MEASURED = json.load(open(os.path.join(HERE, "word_onsets.json"))) if os.path.exists(os.path.join(HERE, "word_onsets.json")) else {}

for ln in SCRIPT["spoken"]:
    v, spd = VOICE[ln["voice"]]
    spd = ln.get("speed", spd)
    a, starts, words = speak_timed(ln["text"], v, spd)
    if ln.get("whisper"):
        a = whisperize(a, ln["whisper"])
    a = a * db(ln.get("gain_db", 0.0))
    t0 = ln["t"]
    dur = len(a) / SR
    # word onsets measured by forced alignment on the rendered stems (audio/word_onsets.json) override the
    # phoneme-count estimates when the line's words are unchanged (TTS is deterministic)
    m = MEASURED.get(ln["id"])
    if m and m["words"] == words:
        starts = m["offsets"]
    timing["lines"].append({"id": ln["id"], "t": t0, "end": t0 + dur, "words": words,
                            "word_t": [t0 + s for s in starts], "voice": ln["voice"]})
    for off in OFFS:
        if ln["voice"].startswith("narrator"):
            place(narr, to_stereo(a), off + t0)
        else:
            place(guide, to_stereo(a), off + t0)
    print(f"{ln['id']:>4} {t0:6.2f}-{t0+dur:6.2f} {ln['text']}")

# ------------------------------------------------------------------ choir
choir = np.zeros((N, 2), np.float32)
aah_notes = []
for c in SCRIPT["choir"]:
    items = c["items"]  # [word, dur, midi_name, offsets]
    sp_ = c.get("split", 2)
    top = [(w, d, nm(m), tuple(o[:sp_])) for (w, d, m, o) in items]
    low = [(w, d, nm(m), tuple(o[sp_:])) for (w, d, m, o) in items]
    hi_mix, onsets = choir_words(top, voice="af_heart", speed=0.85, vibrato=c.get("vibrato", 0.22), breath=0.3, seed=11)
    lo_mix, _ = choir_words(low, voice="am_michael", speed=0.85, vibrato=c.get("vibrato", 0.2), breath=0.3, seed=29)
    L = max(len(hi_mix), len(lo_mix))
    mix = np.zeros((L, 2), np.float32)
    mix[: len(hi_mix)] += hi_mix
    mix[: len(lo_mix)] += lo_mix * 0.85
    mix = lp(mix, 7500)
    mix = hp(mix, 120)
    g = db(c.get("gain_db", 0.0))
    for off in OFFS:
        place(choir, mix * g, off + c["t"])
    acc = c["t"]
    word_t = []
    for (w, d, m, o) in items:
        word_t.append(acc)
        if c.get("oohs", False):
            for semi in o:
                for off in OFFS:
                    aah_notes.append((off + acc, d * 0.98, nm(m) + semi, 50))
        acc += d
    timing["choir"].append({"id": c["id"], "t": c["t"], "words": [i[0] for i in items], "word_t": word_t, "end": acc})
    print(f"choir {c['id']} at {c['t']}: {[i[0] for i in items]}")

# soundfont choir aahs doubling
if aah_notes:
    sfx = SF()
    aahs = sfx.render(aah_notes, TOTAL - 0.01, program=53, tail=0)
    a2 = np.zeros((N, 2), np.float32)
    a2[: len(aahs)] = aahs[:N]
    np.save(os.path.join(BUILD, "stem_choir_aahs2.npy"), a2)

np.save(os.path.join(BUILD, "stem_voice_narr.npy"), narr)
np.save(os.path.join(BUILD, "stem_voice_guide.npy"), guide)
np.save(os.path.join(BUILD, "stem_choir.npy"), choir)
with open(os.path.join(HERE, "..", "visual", "timing.js"), "w") as f:
    f.write("window.TIMING = " + json.dumps(timing, indent=1) + ";\n")
print("ok")
