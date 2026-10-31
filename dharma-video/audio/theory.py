"""Chord symbols -> MIDI voicings with simple voice leading."""
import re
from itertools import product

PC = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6,
      "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}

QUAL = {
    "": [0, 4, 7], "maj": [0, 4, 7], "m": [0, 3, 7], "min": [0, 3, 7],
    "5": [0, 7], "sus2": [0, 2, 7], "sus4": [0, 5, 7], "sus": [0, 5, 7],
    "add9": [0, 4, 7, 14], "madd9": [0, 3, 7, 14], "6": [0, 4, 7, 9], "m6": [0, 3, 7, 9],
    "6/9": [0, 4, 7, 9, 14], "69": [0, 4, 7, 9, 14],
    "7": [0, 4, 7, 10], "maj7": [0, 4, 7, 11], "m7": [0, 3, 7, 10], "m7b5": [0, 3, 6, 10],
    "maj9": [0, 4, 7, 11, 14], "m9": [0, 3, 7, 10, 14], "9": [0, 4, 7, 10, 14],
    "m11": [0, 3, 7, 10, 14, 17], "11": [0, 4, 7, 10, 14, 17], "maj13": [0, 4, 7, 11, 14, 21],
    "13": [0, 4, 7, 10, 14, 21], "7sus4": [0, 5, 7, 10], "9sus4": [0, 5, 7, 10, 14],
    "13sus": [0, 5, 7, 10, 14, 21], "13sus4": [0, 5, 7, 10, 14, 21], "maj7#11": [0, 4, 7, 11, 18],
    "add11": [0, 4, 7, 17], "sus2add13": [0, 2, 7, 9],
}


def parse(sym):
    """'Gmaj9' -> (root_pc, intervals, bass_pc)"""
    sym = sym.strip()
    bass = None
    if "/" in sym and not sym.endswith("6/9"):
        sym, b = sym.rsplit("/", 1)
        bass = PC[b]
    m = re.match(r"^([A-G][#b]?)(.*)$", sym)
    root = PC[m.group(1)]
    q = m.group(2)
    if q not in QUAL:
        raise ValueError(f"unknown chord quality {q!r} in {sym}")
    return root, QUAL[q], (bass if bass is not None else root)


def voicing(sym, low=55, high=79, prev=None, max_notes=5, drop_root=True):
    """Upper-structure voicing in [low, high] (no bass). Chooses the voicing
    closest to prev (sum of abs movement) for smooth voice leading."""
    root, ivs, _ = parse(sym)
    pcs = []
    for iv in ivs:
        pc = (root + iv) % 12
        if pc not in pcs:
            pcs.append(pc)
    if drop_root and len(pcs) >= 4:
        pcs = [p for p in pcs if p != root % 12] or pcs
    pcs = pcs[:max_notes]
    # candidate octave placements
    cands = []
    for pc in pcs:
        opts = [n for n in range(low, high + 1) if n % 12 == pc]
        cands.append(opts)
    best = None
    best_cost = 1e9
    for combo in product(*cands):
        notes = sorted(combo)
        span = notes[-1] - notes[0]
        if span > 19:
            continue
        # avoid minor 2nd clusters at the bottom
        gaps = [b - a for a, b in zip(notes, notes[1:])]
        if any(g == 0 for g in gaps):
            continue
        cost = 0.0
        if prev:
            # match by sorted order
            pv = sorted(prev)
            k = min(len(pv), len(notes))
            cost += sum(abs(a - b) for a, b in zip(notes[:k], pv[:k]))
            cost += abs(len(notes) - len(pv)) * 2
        else:
            center = (low + high) / 2
            cost += abs(sum(notes) / len(notes) - center) * 2
        cost += sum(3 for g in gaps if g == 1) + span * 0.15
        if cost < best_cost:
            best_cost, best = cost, notes
    return best


def bass_note(sym, low=34, high=50):
    root, ivs, bass = parse(sym)
    n = low + ((bass - low) % 12)
    if n > high:
        n -= 12
    return n


def progression(syms, low=55, high=79, max_notes=5):
    out = []
    prev = None
    for s in syms:
        v = voicing(s, low, high, prev, max_notes)
        out.append(v)
        prev = v
    return out


if __name__ == "__main__":
    for s in ["Dadd9", "Gmaj9", "D/F#", "Bm11", "Asus2", "Em9", "A7sus4", "F#m7", "G6/9"]:
        print(s, parse(s), bass_note(s))
    print(progression(["Gmaj9", "F#m7", "Em9", "A7sus4", "Dadd9"]))
