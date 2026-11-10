#!/usr/bin/env python3
"""Validate the generated modality files written by the generation lanes.

Each lane writes therapy-space/data/generated/<lane>.json:
  {"lane": "<lane id>", "modalities": [{"id", "name", "tagline", "whatItIs", "coreIdea",
   "whatYouDo", "whoItsFor", "cautions", "tweet"}, ...]}

Usage (from the repository root):
  python3 -B therapy-space/scripts/check_generated.py              all files in the folder
  python3 -B therapy-space/scripts/check_generated.py --only lane-03 lane-04
                                                                  just these files (lane ids or paths)
  python3 -B therapy-space/scripts/check_generated.py --complete   also require all 630 ids
  python3 -B therapy-space/scripts/check_generated.py --self-test  fixture test of this checker
Options: --generated DIR (default therapy-space/data/generated), --points FILE (default
therapy-space/data/points.json), --anchors DIR (default therapy-space/data/anchors; used
for alsoKnownAs names when present).

Rules, each with the problem code it reports:
  json, keys, type   valid JSON; {"lane", "modalities"} at the top; exactly the nine keys per
                     modality, every value a non-empty string
  lane               "lane" equals the file name without .json, lowercase letters, digits, hyphens
  id-unknown         id is a generated id in points.json
  id-duplicate       each id appears once across all checked files
  name-words         name has 2 to 5 words
  name-duplicate     names are unique across all checked files (case and punctuation ignored)
  name-taken         name differs from every established name, shortName and alsoKnownAs,
                     and from a list of well-known existing therapies and practices
  name-acronym       name does not contain the acronym of an established or well-known method
  tagline-words      tagline has at most 12 words
  sentences          whatItIs 2 to 3, coreIdea 1 to 2, whatYouDo 2 to 3, whoItsFor 1 to 2,
                     cautions 1 to 2 sentences (counted approximately)
  tweet-length       at most 260 by X's weighted count (twitter-text v3: code points in
                     U+0000-10FF, U+2000-200D, U+2010-201F, U+2032-2037 count 1, everything else
                     2, each emoji sequence 2, each URL 23; text NFC-normalized first; the
                     copyright and registered signs count 2, as twitter-text treats them as emoji)
  tweet-hashtags     at most one hashtag
  tweet-emoji        at most one emoji (a ZWJ sequence, flag or keycap counts as one)
  tweet-new          the tweet signals a new concept (new, novel, concept, idea, invented,
                     imagined, proposed, speculative, experimental, untested, prototype,
                     hypothetical or thought experiment)
  tweet-claim        no claim that it treats or cures anything (cure, treat, heal, fix, remedy,
                     clinically, proven, guaranteed, eliminate, eradicate), unless negated by a
                     word such as not, no or never just before it
  dash               no em or en dash (or look-alike) in any string, keys included

Exit code 0 when every checked file passes, 1 on any problem (or when no files are found).
"""
import argparse
import json
import re
import sys
import tempfile
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_points as bp  # noqa: E402
from check_data import count_sentences, count_words, find_dashes  # noqa: E402

MODALITY_KEYS = ["id", "name", "tagline", "whatItIs", "coreIdea", "whatYouDo", "whoItsFor",
                 "cautions", "tweet"]
SENTENCE_RANGES = {"whatItIs": (2, 3), "coreIdea": (1, 2), "whatYouDo": (2, 3),
                   "whoItsFor": (1, 2), "cautions": (1, 2)}
NAME_WORDS = (2, 5)
TAGLINE_MAX_WORDS = 12
TWEET_MAX = 260
LANE_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")

# Well-known existing therapies and practices a generated name must not reuse. Not complete:
# it backs up the rule that names are original, alongside the established names.
KNOWN_PRACTICES = [
    "Internal Family Systems", "Ideal Parent Figure", "Ideal Parent Figure Protocol",
    "Cognitive Behavioral Therapy", "Cognitive Behavioural Therapy", "Cognitive Therapy",
    "Acceptance and Commitment Therapy", "Coherence Therapy", "Depth-Oriented Brief Therapy",
    "Focusing", "Focusing-Oriented Therapy", "Aletheia Coaching", "Integral Coaching",
    "Eye Movement Desensitization and Reprocessing", "Dialectical Behavior Therapy",
    "Mindfulness-Based Stress Reduction", "Mindfulness-Based Cognitive Therapy",
    "Compassion Focused Therapy", "Compassion-Focused Therapy", "Emotionally Focused Therapy",
    "Emotion-Focused Therapy", "Schema Therapy", "Somatic Experiencing",
    "Sensorimotor Psychotherapy", "Hakomi", "Hakomi Method", "Brainspotting",
    "Accelerated Experiential Dynamic Psychotherapy", "Psychodynamic Therapy", "Psychoanalysis",
    "Gestalt Therapy", "Narrative Therapy", "Solution-Focused Brief Therapy",
    "Motivational Interviewing", "Interpersonal Psychotherapy", "Exposure and Response Prevention",
    "Prolonged Exposure", "Cognitive Processing Therapy", "Imagery Rescripting",
    "Rational Emotive Behavior Therapy", "Logotherapy", "Existential Therapy",
    "Person-Centered Therapy", "Client-Centered Therapy", "Art Therapy", "Dance Movement Therapy",
    "Drama Therapy", "Psychodrama", "Music Therapy", "Play Therapy", "Sandplay Therapy",
    "Ecotherapy", "Forest Bathing", "Shinrin-yoku", "Wilderness Therapy", "Adventure Therapy",
    "Horticultural Therapy", "Equine-Assisted Psychotherapy", "Equine Therapy", "Pet Therapy",
    "Animal-Assisted Therapy", "Yoga", "Yoga Nidra", "Tai Chi", "Qigong", "Baduanjin", "Pilates",
    "Feldenkrais Method", "Alexander Technique", "Rolfing", "Holotropic Breathwork",
    "Wim Hof Method", "Transcendental Meditation", "Zazen", "Shikantaza", "Mindful Self-Compassion",
    "Loving-Kindness Meditation", "Body Scan", "Progressive Muscle Relaxation",
    "Autogenic Training", "Biofeedback", "Neurofeedback", "Laughter Yoga", "Ecstatic Dance",
    "5Rhythms", "Authentic Movement", "Nonviolent Communication", "Circling", "Authentic Relating",
    "Voice Dialogue", "Family Constellations", "Safe and Sound Protocol",
    "Trauma Releasing Exercises", "Tension and Trauma Releasing Exercises", "Social Prescribing",
    "Guided Imagery and Music", "Bonny Method", "See Hear Feel", "Sensory Awareness",
    "Do Nothing", "Metta", "Vipassana", "Jhana", "Tabata", "CrossFit", "Parkrun",
    "High-Intensity Interval Training", "Interval Training", "Strength Training",
    "Resistance Training", "Endurance Training", "Running Therapy", "Nature Therapy",
]
KNOWN_ACRONYMS = ["EMDR", "DBT", "MBSR", "MBCT", "CFT", "EFT", "IPT", "ERP", "CPT", "AEDP",
                  "ISTDP", "REBT", "SFBT", "NVC", "MSC", "PMR", "GIM", "AAT", "MICT", "DOBT",
                  "ACT", "CBT", "IFS", "IPF", "TRE", "HIIT", "HIT", "MBT"]

# twitter-text v3 weights.
WEIGHT_ONE_RANGES = [(0x0000, 0x10FF), (0x2000, 0x200D), (0x2010, 0x201F), (0x2032, 0x2037)]
URL_WEIGHT = 23
EMOJI_WEIGHT = 2

# Emoji data (Unicode emoji-data): BMP characters shown as emoji by default, and BMP
# characters that become emoji only with U+FE0F or a skin-tone modifier after them.
EMOJI_PRESENTATION_BMP = [
    (0x231A, 0x231B), (0x23E9, 0x23EC), (0x23F0, 0x23F0), (0x23F3, 0x23F3), (0x25FD, 0x25FE),
    (0x2614, 0x2615), (0x2648, 0x2653), (0x267F, 0x267F), (0x2693, 0x2693), (0x26A1, 0x26A1),
    (0x26AA, 0x26AB), (0x26BD, 0x26BE), (0x26C4, 0x26C5), (0x26CE, 0x26CE), (0x26D4, 0x26D4),
    (0x26EA, 0x26EA), (0x26F2, 0x26F3), (0x26F5, 0x26F5), (0x26FA, 0x26FA), (0x26FD, 0x26FD),
    (0x2705, 0x2705), (0x270A, 0x270B), (0x2728, 0x2728), (0x274C, 0x274C), (0x274E, 0x274E),
    (0x2753, 0x2755), (0x2757, 0x2757), (0x2795, 0x2797), (0x27B0, 0x27B0), (0x27BF, 0x27BF),
    (0x2B1B, 0x2B1C), (0x2B50, 0x2B50), (0x2B55, 0x2B55),
]
EMOJI_TEXT_DEFAULT_BMP = [
    (0x00A9, 0x00A9), (0x00AE, 0x00AE), (0x203C, 0x203C), (0x2049, 0x2049), (0x2122, 0x2122),
    (0x2139, 0x2139), (0x2194, 0x2199), (0x21A9, 0x21AA), (0x2328, 0x2328), (0x23CF, 0x23CF),
    (0x23ED, 0x23EF), (0x23F1, 0x23F2), (0x23F8, 0x23FA), (0x24C2, 0x24C2), (0x25AA, 0x25AB),
    (0x25B6, 0x25B6), (0x25C0, 0x25C0), (0x25FB, 0x25FC), (0x2600, 0x2604), (0x260E, 0x260E),
    (0x2611, 0x2611), (0x2618, 0x2618), (0x261D, 0x261D), (0x2620, 0x2620), (0x2622, 0x2623),
    (0x2626, 0x2626), (0x262A, 0x262A), (0x262E, 0x262F), (0x2638, 0x263A), (0x2640, 0x2640),
    (0x2642, 0x2642), (0x265F, 0x2660), (0x2663, 0x2663), (0x2665, 0x2666), (0x2668, 0x2668),
    (0x267B, 0x267B), (0x267E, 0x267E), (0x2692, 0x2692), (0x2694, 0x2697), (0x2699, 0x2699),
    (0x269B, 0x269C), (0x26A0, 0x26A0), (0x26A7, 0x26A7), (0x26B0, 0x26B1), (0x26C8, 0x26C8),
    (0x26CF, 0x26CF), (0x26D1, 0x26D1), (0x26D3, 0x26D3), (0x26E9, 0x26E9), (0x26F0, 0x26F1),
    (0x26F4, 0x26F4), (0x26F7, 0x26F9), (0x2702, 0x2702), (0x2708, 0x2709), (0x270C, 0x270D),
    (0x270F, 0x270F), (0x2712, 0x2712), (0x2714, 0x2714), (0x2716, 0x2716), (0x271D, 0x271D),
    (0x2721, 0x2721), (0x2733, 0x2734), (0x2744, 0x2744), (0x2747, 0x2747), (0x2763, 0x2764),
    (0x27A1, 0x27A1), (0x2934, 0x2935), (0x2B05, 0x2B07), (0x3030, 0x3030), (0x303D, 0x303D),
    (0x3297, 0x3297), (0x3299, 0x3299),
]
PICTOGRAPHIC_SMP = (0x1F000, 0x1FAFF)
VS15, VS16, ZWJ, KEYCAP = 0xFE0E, 0xFE0F, 0x200D, 0x20E3
KEYCAP_BASES = {ord(c) for c in "0123456789#*"}

URL_RE = re.compile(
    r"(?i)(?<![\w@.])(?:https?://\S+|www\.\S+|"
    r"(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+"
    r"(?:com|org|net|edu|gov|io|co|ai|app|dev|me|info|ly|so|xyz|uk)\b(?:/\S*)?)")
URL_TRAILING = ".,;:!?)]}'\"\U00002019\U0000201D"
HASHTAG_RE = re.compile(r"(?<![\w&])[#\U0000FF03](?![\U0000FE0F\U000020E3])(\w+)")
NOVELTY_RE = re.compile(
    r"(?i)\b(?:new|novel|concepts?|ideas?|invented|imagined|proposed|proposal|speculative|"
    r"experimental|untested|prototype|hypothetical|thought experiment)\b")
CLAIM_RE = re.compile(
    r"(?i)\b(?:cures?|cured|curing|curative|treats?|treated|treating|treatments?|heals?|healed|"
    r"healing|fix|fixes|remedy|remedies|clinically|proven|guarantee[sd]?|eliminates?|eradicates?)\b")
NEGATIONS = {"not", "no", "never", "isn't", "isnt", "doesn't", "doesnt", "without", "nor",
             "won't", "wont", "can't", "cannot", "neither", "zero", "aren't", "arent"}


# ---------------------------------------------------------------- tweet measures

def _in(cp, ranges):
    return any(lo <= cp <= hi for lo, hi in ranges)


def _emoji_element(cps, i):
    """Length in code points of the emoji element starting at i, or 0 if there is none."""
    cp = cps[i]
    nxt = cps[i + 1] if i + 1 < len(cps) else None
    if 0x1F1E6 <= cp <= 0x1F1FF:  # regional indicators pair into flags
        return 2 if nxt is not None and 0x1F1E6 <= nxt <= 0x1F1FF else 1
    if cp in KEYCAP_BASES:
        if nxt == VS16 and i + 2 < len(cps) and cps[i + 2] == KEYCAP:
            return 3
        return 2 if nxt == KEYCAP else 0
    if PICTOGRAPHIC_SMP[0] <= cp <= PICTOGRAPHIC_SMP[1] or _in(cp, EMOJI_PRESENTATION_BMP):
        if nxt == VS15:
            return 0
    elif _in(cp, EMOJI_TEXT_DEFAULT_BMP):
        if not (nxt == VS16 or (nxt is not None and 0x1F3FB <= nxt <= 0x1F3FF)):
            return 0
    else:
        return 0
    j = i + 1
    if j < len(cps) and cps[j] == VS16:
        j += 1
    if j < len(cps) and 0x1F3FB <= cps[j] <= 0x1F3FF:
        j += 1
    while j < len(cps) and 0xE0020 <= cps[j] <= 0xE007F:  # tag sequences (subdivision flags)
        j += 1
    return j - i


def emoji_spans(text):
    """[(start, end)] of each emoji sequence, ZWJ sequences joined, in code point indexes."""
    cps = [ord(c) for c in text]
    spans, i = [], 0
    while i < len(cps):
        n = _emoji_element(cps, i)
        if n == 0:
            i += 1
            continue
        j = i + n
        while j + 1 < len(cps) and cps[j] == ZWJ:
            m = _emoji_element(cps, j + 1)
            if m == 0:
                break
            j += 1 + m
        spans.append((i, j))
        i = j
    return spans


def url_spans(text):
    spans = []
    for match in URL_RE.finditer(text):
        start, end = match.span()
        while end > start and text[end - 1] in URL_TRAILING:
            end -= 1
        spans.append((start, end))
    return spans


def _char_weight(char):
    cp = ord(char)
    if cp in (0x00A9, 0x00AE):  # twitter-text's emoji regex takes these even without U+FE0F
        return EMOJI_WEIGHT
    return 1 if _in(cp, WEIGHT_ONE_RANGES) else 2


def _plain_weight(text):
    total, pos = 0, 0
    for start, end in emoji_spans(text) + [(len(text), len(text))]:
        total += sum(_char_weight(c) for c in text[pos:start])
        if end > start:
            total += EMOJI_WEIGHT
        pos = end
    return total


def weighted_length(text):
    text = unicodedata.normalize("NFC", text)
    total, pos = 0, 0
    for start, end in url_spans(text):
        total += _plain_weight(text[pos:start]) + URL_WEIGHT
        pos = end
    return total + _plain_weight(text[pos:])


def hashtags(text):
    return [m.group(1) for m in HASHTAG_RE.finditer(text) if re.search(r"[^\W\d_]", m.group(1))]


def claims(text):
    found = []
    text = text.replace("\U00002019", "'")
    for match in CLAIM_RE.finditer(text):
        before = re.findall(r"[\w']+", text[:match.start()].lower())[-3:]
        if not any(word in NEGATIONS for word in before):
            found.append(match.group(0))
    return found


def name_key(name):
    text = unicodedata.normalize("NFKD", name).lower()
    return " ".join(re.sub(r"[^a-z0-9]+", " ", text).split())


# ---------------------------------------------------------------- checking

def reference_names(points_doc, anchors_dir):
    """Names a generated modality may not take, and acronyms it may not contain."""
    taken = {name_key(n): n for n in KNOWN_PRACTICES}
    acronyms = set(KNOWN_ACRONYMS)
    for entry in points_doc.get("established", []):
        for key in ("name", "shortName"):
            value = entry.get(key)
            if isinstance(value, str):
                taken[name_key(value)] = value
        short = entry.get("shortName")
        if isinstance(short, str) and re.fullmatch(r"[A-Z]{2,6}", short):
            acronyms.add(short)
        if anchors_dir is not None:
            path = Path(anchors_dir) / f"{entry.get('id')}.json"
            if path.is_file():
                try:
                    doc = json.loads(path.read_text(encoding="utf-8"))
                    for alias in doc.get("alsoKnownAs", []):
                        if isinstance(alias, str):
                            taken[name_key(alias)] = alias
                except (json.JSONDecodeError, AttributeError):
                    pass
    taken.pop("", None)
    return taken, acronyms


def check_files(paths, points_doc, anchors_dir=None):
    """Check lane files. Returns (problems, stats); a problem is (file, item, code, message)."""
    problems = []
    valid_ids = {g.get("id") for g in points_doc.get("generated", []) if isinstance(g, dict)}
    taken, acronyms = reference_names(points_doc, anchors_dir)
    seen_ids, seen_names = {}, {}
    stats = {"files": {}, "ids": set(), "tweet_lengths": []}

    for path in paths:
        path = Path(path)
        fname = path.name

        def problem(item, code, message):
            problems.append((fname, item, code, message))

        stats["files"][fname] = 0
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            problem("-", "json", f"file not found: {path}")
            continue
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            problem("-", "json", f"not valid JSON: {exc}")
            continue
        if not isinstance(doc, dict) or set(doc) != {"lane", "modalities"}:
            problem("-", "keys", 'top level must be an object with exactly "lane" and "modalities"')
            continue
        lane = doc["lane"]
        if not isinstance(lane, str) or not LANE_RE.fullmatch(lane) or lane != path.stem:
            problem("-", "lane", f"lane {lane!r} must be the file name without .json "
                                 f"({path.stem!r}), in lowercase letters, digits and hyphens")
        for where, label in find_dashes(doc):
            problem("-", "dash", f"{label} in {where}")
        modalities = doc["modalities"]
        if not isinstance(modalities, list) or not modalities:
            problem("-", "type", "modalities must be a non-empty list")
            continue
        stats["files"][fname] = len(modalities)

        for n, mod in enumerate(modalities):
            if not isinstance(mod, dict):
                problem(f"#{n}", "type", "each modality must be an object")
                continue
            mid = mod.get("id")
            item = mid if isinstance(mid, str) else f"#{n}"
            missing = [k for k in MODALITY_KEYS if k not in mod]
            extra = [k for k in mod if k not in MODALITY_KEYS]
            if missing or extra:
                problem(item, "keys", f"keys differ (missing {missing}, extra {extra})")
            bad_types = [k for k in MODALITY_KEYS if k in mod and
                         not (isinstance(mod[k], str) and mod[k].strip())]
            if bad_types:
                problem(item, "type", f"must be non-empty strings: {bad_types}")
            text = {k: mod[k] for k in MODALITY_KEYS if k in mod and k not in bad_types}

            if "id" in text:
                if mid not in valid_ids:
                    problem(item, "id-unknown", f"id {mid!r} is not a generated id in points.json")
                elif mid in seen_ids:
                    problem(item, "id-duplicate", f"id also used in {seen_ids[mid]}")
                else:
                    seen_ids[mid] = fname
                    stats["ids"].add(mid)

            if "name" in text:
                name = text["name"]
                words = count_words(name)
                if not NAME_WORDS[0] <= words <= NAME_WORDS[1]:
                    problem(item, "name-words", f"name {name!r} has {words} word(s), expected "
                                                f"{NAME_WORDS[0]} to {NAME_WORDS[1]}")
                key = name_key(name)
                if key in taken:
                    problem(item, "name-taken", f"name {name!r} is the name of an existing "
                                                f"practice ({taken[key]!r})")
                if key in seen_names:
                    problem(item, "name-duplicate", f"name {name!r} also used in {seen_names[key]}")
                else:
                    seen_names[key] = f"{fname} ({item})"
                used = sorted(a for a in acronyms if re.search(rf"(?<![A-Za-z]){a}(?![A-Za-z])", name))
                if used:
                    problem(item, "name-acronym", f"name {name!r} contains the acronym of an "
                                                  f"existing method: {used}")

            if "tagline" in text and count_words(text["tagline"]) > TAGLINE_MAX_WORDS:
                problem(item, "tagline-words", f"tagline has {count_words(text['tagline'])} words, "
                                               f"at most {TAGLINE_MAX_WORDS} allowed")
            for key, (lo, hi) in SENTENCE_RANGES.items():
                if key in text:
                    count = count_sentences(text[key])
                    if not lo <= count <= hi:
                        problem(item, "sentences", f"{key} has about {count} sentences, "
                                                   f"expected {lo} to {hi}")

            if "tweet" in text:
                tweet = text["tweet"]
                length = weighted_length(tweet)
                stats["tweet_lengths"].append(length)
                if length > TWEET_MAX:
                    problem(item, "tweet-length", f"tweet weighted length {length} is over {TWEET_MAX}")
                tags = hashtags(tweet)
                if len(tags) > 1:
                    problem(item, "tweet-hashtags", f"tweet has {len(tags)} hashtags {tags}, at most 1")
                emojis = emoji_spans(unicodedata.normalize("NFC", tweet))
                if len(emojis) > 1:
                    problem(item, "tweet-emoji", f"tweet has {len(emojis)} emoji, at most 1")
                if not NOVELTY_RE.search(tweet):
                    problem(item, "tweet-new", "tweet does not signal that this is a new concept "
                                               "(say new, novel, concept, idea, untested and so on)")
                said = claims(tweet)
                if said:
                    problem(item, "tweet-claim", f"tweet claims a treatment effect: {said}")
    return problems, stats


def print_summary(paths, problems, stats, total_ids, complete):
    by_file = {}
    for fname, *_ in problems:
        by_file[fname] = by_file.get(fname, 0) + 1
    for path in paths:
        fname = Path(path).name
        count = by_file.get(fname, 0)
        status = "OK" if count == 0 else f"{count} problem{'s' if count != 1 else ''}"
        print(f"  {fname}: {stats['files'].get(fname, 0)} modalities, {status}")
    covered = len(stats["ids"])
    note = "" if complete or covered == total_ids else f" ({total_ids - covered} not written yet)"
    print(f"  ids covered: {covered} of {total_ids}{note}")
    if stats["tweet_lengths"]:
        lengths = stats["tweet_lengths"]
        print(f"  tweet weighted length: max {max(lengths)}, mean {sum(lengths) / len(lengths):.1f} "
              f"(limit {TWEET_MAX})")
    for fname, item, code, message in problems:
        print(f"FAIL {fname} [{item}] {code}: {message}")


# ---------------------------------------------------------------- self-test

def _fixture_modality(mid, name, **changes):
    mod = {
        "id": mid,
        "name": name,
        "tagline": "A slow walk that pairs breath with open attention.",
        "whatItIs": f"{name} is a new concept for a slow outdoor walk. It pairs steady breathing "
                    "with open, curious attention to sound.",
        "coreIdea": "Gentle movement can make room for whatever you feel.",
        "whatYouDo": "You walk slowly for twenty minutes and match your steps to your breath. "
                     "Every few minutes you pause and name one thing you can hear.",
        "whoItsFor": "People who want a calm, simple practice they can do alone, e.g. on a lunch break.",
        "cautions": "It is an untested idea, so stop if it feels unpleasant and keep any care you "
                    "already have.",
        "tweet": f"New concept: {name}, a slow walk that pairs breath with open attention. Not a "
                 "treatment, just an idea to try on a quiet afternoon \U0001F30A #SlowWalk",
    }
    mod.update(changes)
    return mod


def self_test():
    """Run the checker on tiny fixture files and confirm it passes the good one and catches
    every rule in the bad one. Returns 0 when the checker behaves as expected."""
    failures = []

    weight_cases = [
        # Latin letters count 1.
        ("a" * 260, 260),
        # U+00E9 and the curly quotes U+201C/D count 1; the ellipsis U+2026 counts 2.
        ("caf\U000000E9 \U0000201Cquotes\U0000201D \U00002026", 16),
        # CJK characters count 2 each.
        ("\U000065E5\U0000672C", 4),
        # A URL counts 23 however long it is; the final period is not part of it.
        ("see https://example.com/a/very/long/path/that/keeps/going.", 4 + 23 + 1),
        # One ZWJ family emoji, a heart with U+FE0F and a flag each count 2.
        ("\U0001F468\U0000200D\U0001F469\U0000200D\U0001F467", 2),
        ("\U00002764\U0000FE0F", 2),
        ("\U0001F1F5\U0001F1F1", 2),
        # The copyright sign counts 2, as in twitter-text.
        ("\U000000A9 2026", 7),
    ]
    for text, want in weight_cases:
        got = weighted_length(text)
        if got != want:
            failures.append(f"weighted_length({text[:20]!r}...) = {got}, expected {want}")
    two_emoji = "\U0001F30A and \U00002600\U0000FE0F"
    no_emoji = "\U000000A9 \U00002600 ok"  # text-style signs without U+FE0F are not emoji
    if len(emoji_spans(two_emoji)) != 2 or emoji_spans(no_emoji):
        failures.append("emoji counting is wrong")
    if hashtags("one #Calm and #two and a#nottag and #123") != ["Calm", "two"]:
        failures.append("hashtag detection is wrong")
    if claims("This is not a cure.") or not claims("It cures stress."):
        failures.append("claim detection is wrong")
    print(f"self-test: tweet measures {'ok' if not failures else 'FAILED'} "
          f"({len(weight_cases)} weighted-length cases, emoji, hashtags, claims)")

    points = {
        "version": 1,
        "established": [
            {"id": "alpha", "name": "Alpha Practice", "shortName": "APX"},
            {"id": "beta", "name": "Beta Method", "shortName": "Beta"},
        ],
        "generated": [{"id": f"alpha__beta__{k}"} for k in (1, 3, 5)],
    }
    good = {"lane": "good", "modalities": [
        _fixture_modality("alpha__beta__1", "Quiet Harbor Walk"),
        _fixture_modality("alpha__beta__3", "Lantern Step Practice"),
    ]}
    long_tweet = "A new idea for slow mornings. " + "Breathe, notice, rest. " * 12
    bad = {"lane": "not-the-file-name", "modalities": [
        _fixture_modality("alpha__beta__1", "Beta Method", extra="not allowed"),   # id-duplicate with good
        _fixture_modality("alpha__gamma__9", "Walk",                              # unknown id, 1 word
                          tagline="This tagline keeps going well past the twelve word limit that "
                                  "the contract sets for it"),
        _fixture_modality("alpha__beta__5", "APX Breath Loop",
                          whatItIs="One. Two. Three. Four. Five.",
                          coreIdea="Rest \U00002014 then move.",
                          tweet=long_tweet + "It cures stress fast. \U0001F30A\U0001F31E #One #Two"),
        _fixture_modality("alpha__beta__3", "quiet harbor WALK!", cautions=7,     # name dup, type
                          tweet="Try this walk today, it heals everything."),     # no new, claim
    ]}
    expected_bad = {"keys", "lane", "id-unknown", "name-words", "name-taken", "name-acronym",
                    "tagline-words", "sentences", "tweet-length", "tweet-hashtags", "tweet-emoji",
                    "tweet-new", "tweet-claim", "dash", "type"}

    with tempfile.TemporaryDirectory(prefix="check-generated-") as tmp:
        folder = Path(tmp)
        good_path, bad_path = folder / "good.json", folder / "bad.json"
        good_path.write_text(json.dumps(good, ensure_ascii=False, indent=2), encoding="utf-8")
        bad_path.write_text(json.dumps(bad, ensure_ascii=False, indent=2), encoding="utf-8")

        problems, _ = check_files([good_path], points)
        print(f"self-test: good fixture alone: {len(problems)} problems (expected 0)")
        for p in problems:
            failures.append(f"false alarm on the good fixture: {p}")

        problems, _ = check_files([bad_path], points)
        codes = {p[2] for p in problems}
        missed = expected_bad - codes
        print(f"self-test: bad fixture alone: {len(problems)} problems, codes caught: "
              f"{', '.join(sorted(codes))}")
        if missed:
            failures.append(f"bad fixture: rules not caught: {sorted(missed)}")

        problems, _ = check_files([good_path, bad_path], points)
        codes = {p[2] for p in problems}
        cross = {"id-duplicate", "name-duplicate"}
        print(f"self-test: good and bad together: cross-file codes caught: "
              f"{', '.join(sorted(codes & cross)) or 'none'}")
        if not cross <= codes:
            failures.append(f"cross-file duplicates not caught: {sorted(cross - codes)}")

        broken = folder / "broken.json"
        broken.write_text('{"lane": "broken", "modalities": [', encoding="utf-8")
        problems, _ = check_files([broken], points)
        if {p[2] for p in problems} != {"json"}:
            failures.append("invalid JSON was not reported as a json problem")
        print("self-test: invalid JSON file reported as json problem: "
              f"{'yes' if {p[2] for p in problems} == {'json'} else 'no'}")

    for message in failures:
        print(f"SELF-TEST FAIL: {message}")
    print("SELF-TEST PASSED" if not failures else f"SELF-TEST FAILED ({len(failures)} failures)")
    return 0 if not failures else 1


# ---------------------------------------------------------------- main

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--generated", type=Path, default=bp.DATA_DIR / "generated")
    parser.add_argument("--points", type=Path, default=bp.DATA_DIR / "points.json")
    parser.add_argument("--anchors", type=Path, default=bp.DATA_DIR / "anchors")
    parser.add_argument("--only", nargs="+", metavar="LANE_OR_FILE",
                        help="check only these files: lane ids (file names without .json) or paths")
    parser.add_argument("--complete", action="store_true",
                        help="also fail unless all generated ids in points.json are covered")
    parser.add_argument("--self-test", action="store_true", help="run the fixture test and exit")
    args = parser.parse_args(argv)

    if args.self_test:
        return self_test()

    try:
        points_doc = json.loads(args.points.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"check_generated: cannot read points file {args.points}: {exc}")
        return 1
    if args.only:
        paths = []
        for item in args.only:
            candidate = Path(item)
            if candidate.suffix != ".json":
                candidate = args.generated / f"{item}.json"
            paths.append(candidate)
    else:
        paths = sorted(args.generated.glob("*.json")) if args.generated.is_dir() else []
    if not paths:
        print(f"check_generated: no generated files found in {args.generated}")
        return 1

    anchors = args.anchors if args.anchors.is_dir() else None
    problems, stats = check_files(paths, points_doc, anchors)
    total_ids = sum(1 for g in points_doc.get("generated", []) if isinstance(g, dict))
    scope = f"subset of {len(paths)}" if args.only else f"all {len(paths)}"
    print(f"check_generated: {scope} file(s) in {args.generated}, "
          f"{sum(stats['files'].values())} modalities")
    if args.complete and len(stats["ids"]) < total_ids:
        missing = sorted({g["id"] for g in points_doc["generated"]} - stats["ids"])
        problems.append(("-", "-", "incomplete", f"{len(missing)} generated ids have no modality, "
                                                 f"for example {missing[:3]}"))
    print_summary(paths, problems, stats, total_ids, args.complete)
    print("RESULT: PASS" if not problems else f"RESULT: FAIL ({len(problems)} problems)")
    return 0 if not problems else 1


if __name__ == "__main__":
    sys.exit(main())
