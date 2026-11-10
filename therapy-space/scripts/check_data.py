#!/usr/bin/env python3
"""Validate the therapy-space map data and print a quality report.

Usage (from the repository root):
  python3 -B therapy-space/scripts/check_data.py [--anchors DIR] [--allow-missing-anchors]
      [--table] [--strict-quality] [--dimensions FILE] [--scores FILE] [--points FILE]
(the paths default to therapy-space/data/anchors, dimensions.json, scores.json, points.json)

What it checks:
  anchors          each file: exact contract keys and types, enum values, id equal to the
                   file name and one of the 21 canonical ids, no em or en dash in any string
  dimensions.json  8 or 9 dimensions with every field, field lengths, example ids that
                   really score low (3 or less) and high (7 or more)
  scores.json      all 21 anchors x every dimension, scores 0 to 10 with at most one
                   decimal, one-sentence reasons, no dashes
  points.json      21 established points in canonical order matching the scores and anchors,
                   630 unique generated ids, every pair once with indexes 1, 3 and 5, the line
                   formula, clamping and rounding, nearest anchors, the projection, and the 5
                   points of each line collinear and evenly spaced in xy (within 1e-9); also
                   that the file equals a fresh build_points.py build, so it is not stale

The quality report lists each dimension's spread across the anchors, the most correlated
dimension pairs (Pearson r) and the 10 closest anchor pairs, against these targets: spread
of at least 6, no |r| above 0.8, every two anchors at least 2.0 apart. Missed targets are
reported but only fail the run with --strict-quality.

--allow-missing-anchors accepts the anchors still being researched (focusing, qigong,
nature) as missing, with a warning, and expects their provisional metadata in points.json.
--table prints a Markdown table of all scores.

Exit code 0 when every check passes, 1 on any failure.
"""
import argparse
import itertools
import json
import math
import re
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_points as bp  # noqa: E402  (shared canonical ids and the reference build)

ANCHOR_KEYS = ["id", "name", "shortName", "family", "alsoKnownAs", "origin", "summary",
               "theoryOfChange", "whatYouDo", "typicalDose", "keyTechniques", "evidence",
               "goodFitFor", "cautions", "namingNote", "sources"]
ANCHOR_STRING_KEYS = ["id", "name", "shortName", "family", "origin", "summary", "theoryOfChange",
                      "whatYouDo", "typicalDose", "goodFitFor", "cautions", "namingNote"]
FAMILIES = {"psychotherapy", "coaching", "somatic", "meditation", "movement", "relational",
            "nature", "arts", "animal"}
EVIDENCE_LEVELS = {"strong", "moderate", "emerging", "limited"}
SOURCE_KINDS = {"primary", "review", "trial", "book", "org"}

DIMENSION_KEYS = ["id", "name", "question", "lowLabel", "highLabel", "lowMeans", "highMeans",
                  "description", "whyItMatters", "examplesLow", "examplesHigh"]
EXAMPLE_LOW_MAX = 3.0
EXAMPLE_HIGH_MIN = 7.0

GENERATED_KEYS = ["id", "a", "b", "index", "position", "t", "raw", "coords", "clampedDims",
                  "nearest", "xy"]
ESTABLISHED_KEYS = ["id", "name", "shortName", "family", "coords", "xy"]
PROJECTION_REQUIRED = {"method", "explained", "axes"}
PROJECTION_OPTIONAL = {"center", "signConvention"}
POSITION_OF_INDEX = {1: ("beyond-a", -0.5), 3: ("midpoint", 0.5), 5: ("beyond-b", 1.5)}

LINE_TOLERANCE = 1e-9
MAX_SHOWN_PER_SECTION = 25
TARGET_SPREAD = 6.0
TARGET_MAX_R = 0.8
TARGET_MIN_DISTANCE = 2.0

# Em and en dashes are banned everywhere; the look-alikes are banned with them.
DASHES = {
    "\U00002013": "en dash U+2013", "\U00002014": "em dash U+2014", "\U00002012": "figure dash U+2012",
    "\U00002015": "horizontal bar U+2015", "\U00002E3A": "two-em dash U+2E3A",
    "\U00002E3B": "three-em dash U+2E3B", "\U0000FE31": "vertical em dash U+FE31",
    "\U0000FE32": "vertical en dash U+FE32", "\U0000FE58": "small em dash U+FE58",
}

# ---------------------------------------------------------------- text helpers
# (check_generated.py imports these, so both checkers count the same way)

ABBREVIATIONS = {"e.g", "i.e", "etc", "vs", "dr", "mr", "mrs", "ms", "prof", "approx", "cf", "al",
                 "jr", "sr"}
_BOUNDARY = re.compile(r"([.!?])[\"')\]\U00002019\U0000201D]*\s+(?=[\"'(\[\U00002018\U0000201C]?[A-Z0-9])")


def count_sentences(text):
    """Approximate sentence count: a boundary is . ! or ? then space then a capital or digit,
    except after common abbreviations (e.g., Dr., vs.) and initials (U.S.)."""
    text = " ".join(str(text).split())
    if not text:
        return 0
    count = 1
    for match in _BOUNDARY.finditer(text):
        if match.group(1) == ".":
            tail = re.search(r"([A-Za-z.]+)$", text[:match.start()])
            token = tail.group(1).lower() if tail else ""
            if (token in ABBREVIATIONS or (len(token) == 1 and token.isalpha())
                    or re.fullmatch(r"(?:[a-z]\.)+[a-z]", token)):
                continue
        count += 1
    return count


def count_words(text):
    return len([w for w in str(text).split() if re.search(r"\w", w)])


def iter_strings(obj, path="$"):
    """Yield (path, text) for every string in obj, including object keys."""
    if isinstance(obj, str):
        yield path, obj
    elif isinstance(obj, dict):
        for key, value in obj.items():
            yield f"{path}.{key} (key)", key
            yield from iter_strings(value, f"{path}.{key}")
    elif isinstance(obj, list):
        for n, value in enumerate(obj):
            yield from iter_strings(value, f"{path}[{n}]")


def find_dashes(obj):
    """Yield (path, dash name) for every banned dash in any string of obj."""
    for path, text in iter_strings(obj):
        for char, label in DASHES.items():
            if char in text:
                yield path, label


def nonempty_str(value):
    return isinstance(value, str) and value.strip() != ""


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def decimals_ok(value, places):
    scaled = value * 10 ** places
    return abs(scaled - round(scaled)) < 1e-6


# ---------------------------------------------------------------- reporting

class Report:
    def __init__(self):
        self.failures = []
        self.warnings = []

    def fail(self, section, message):
        self.failures.append((section, message))

    def warn(self, section, message):
        self.warnings.append((section, message))

    def count(self, section):
        return sum(1 for s, _ in self.failures if s == section)


def load(path, section, rep):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        rep.fail(section, f"file not found: {path}")
    except json.JSONDecodeError as exc:
        rep.fail(section, f"{path} is not valid JSON: {exc}")
    return None


# ---------------------------------------------------------------- anchors

def check_anchor(doc, aid, rep):
    sec, where = "anchors", f"{aid}.json"
    if not isinstance(doc, dict):
        rep.fail(sec, f"{where}: top level is not an object")
        return
    missing = [k for k in ANCHOR_KEYS if k not in doc]
    extra = [k for k in doc if k not in ANCHOR_KEYS]
    if missing or extra:
        rep.fail(sec, f"{where}: keys differ from the contract (missing {missing}, extra {extra})")
    for key in ANCHOR_STRING_KEYS:
        if key in doc and not nonempty_str(doc[key]):
            rep.fail(sec, f"{where}: {key} must be a non-empty string")
    if doc.get("id") != aid:
        rep.fail(sec, f"{where}: id {doc.get('id')!r} does not match the file name")
    if "family" in doc and doc["family"] not in FAMILIES:
        rep.fail(sec, f"{where}: family {doc['family']!r} is not one of {sorted(FAMILIES)}")
    aka = doc.get("alsoKnownAs")
    if "alsoKnownAs" in doc and not (isinstance(aka, list) and all(nonempty_str(x) for x in aka)):
        rep.fail(sec, f"{where}: alsoKnownAs must be a list of non-empty strings")
    techniques = doc.get("keyTechniques")
    if "keyTechniques" in doc and not (isinstance(techniques, list) and techniques
                                       and all(nonempty_str(x) for x in techniques)):
        rep.fail(sec, f"{where}: keyTechniques must be a non-empty list of non-empty strings")
    evidence = doc.get("evidence")
    if "evidence" in doc:
        if not (isinstance(evidence, dict) and set(evidence) == {"level", "summary"}):
            rep.fail(sec, f"{where}: evidence must be an object with exactly level and summary")
        else:
            if evidence["level"] not in EVIDENCE_LEVELS:
                rep.fail(sec, f"{where}: evidence.level {evidence['level']!r} is not one of "
                              f"{sorted(EVIDENCE_LEVELS)}")
            if not nonempty_str(evidence["summary"]):
                rep.fail(sec, f"{where}: evidence.summary must be a non-empty string")
    sources = doc.get("sources")
    if "sources" in doc:
        if not (isinstance(sources, list) and sources):
            rep.fail(sec, f"{where}: sources must be a non-empty list")
        else:
            for n, src in enumerate(sources):
                if not (isinstance(src, dict) and set(src) == {"title", "url", "kind"}):
                    rep.fail(sec, f"{where}: sources[{n}] must have exactly title, url and kind")
                    continue
                if not all(nonempty_str(src[k]) for k in ("title", "url", "kind")):
                    rep.fail(sec, f"{where}: sources[{n}] has an empty or non-string field")
                    continue
                if src["kind"] not in SOURCE_KINDS:
                    rep.fail(sec, f"{where}: sources[{n}].kind {src['kind']!r} is not one of "
                                  f"{sorted(SOURCE_KINDS)}")
                if not src["url"].startswith(("https://", "http://")):
                    rep.fail(sec, f"{where}: sources[{n}].url is not an http(s) URL")
    for path, label in find_dashes(doc):
        rep.fail(sec, f"{where}: {label} in {path}")


def check_anchors(anchors_dir, allow_missing, rep):
    """Return {id: anchor doc} for the anchor files found."""
    found = {}
    if not anchors_dir.is_dir():
        rep.fail("anchors", f"anchors folder not found: {anchors_dir}")
        return found
    for path in sorted(anchors_dir.glob("*.json")):
        if path.stem not in bp.CANONICAL_IDS:
            rep.fail("anchors", f"{path.name}: not one of the 21 canonical ids")
            continue
        doc = load(path, "anchors", rep)
        if doc is None:
            continue
        check_anchor(doc, path.stem, rep)
        found[path.stem] = doc
    for aid in bp.CANONICAL_IDS:
        if aid in found:
            continue
        if allow_missing and aid in bp.PROVISIONAL_META:
            rep.warn("anchors", f"{aid}.json is missing (allowed: still being researched, "
                                f"provisional metadata used)")
        else:
            rep.fail("anchors", f"{aid}.json is missing")
    return found


def anchor_meta(found):
    """Metadata as build_points would use it, or None when something is unusable."""
    meta = {}
    for aid in bp.CANONICAL_IDS:
        doc = found.get(aid)
        if doc is None:
            if aid not in bp.PROVISIONAL_META:
                return None
            meta[aid] = dict(bp.PROVISIONAL_META[aid])
        elif all(isinstance(doc.get(k), str) for k in ("name", "shortName", "family")):
            meta[aid] = {k: doc[k] for k in ("name", "shortName", "family")}
        else:
            return None
    return meta


# ---------------------------------------------------------------- dimensions

def check_dimensions(doc, rep):
    """Return the list of dimension dicts, or None if unusable."""
    sec = "dimensions"
    if not isinstance(doc, dict) or set(doc) != {"version", "dimensions"}:
        rep.fail(sec, "top level must be an object with exactly version and dimensions")
        return None
    if doc["version"] != 1:
        rep.fail(sec, f"version must be 1, not {doc['version']!r}")
    dims = doc["dimensions"]
    if not isinstance(dims, list) or not 8 <= len(dims) <= 9:
        rep.fail(sec, "dimensions must be a list of 8 or 9 entries")
        return None
    seen = set()
    for n, dim in enumerate(dims):
        if not isinstance(dim, dict):
            rep.fail(sec, f"dimensions[{n}] is not an object")
            return None
        name = dim.get("id", f"dimensions[{n}]")
        missing = [k for k in DIMENSION_KEYS if k not in dim]
        extra = [k for k in dim if k not in DIMENSION_KEYS]
        if missing or extra:
            rep.fail(sec, f"{name}: keys differ (missing {missing}, extra {extra})")
            continue
        did = dim["id"]
        if not (isinstance(did, str) and re.fullmatch(r"[a-z]{2,12}", did)):
            rep.fail(sec, f"{name}: id must be 2 to 12 lowercase letters")
        if did in seen:
            rep.fail(sec, f"{name}: duplicate id")
        seen.add(did)
        for key in DIMENSION_KEYS[1:9]:
            if not nonempty_str(dim[key]):
                rep.fail(sec, f"{name}: {key} must be a non-empty string")
        if any(not nonempty_str(dim[k]) for k in DIMENSION_KEYS[1:9]):
            continue
        ranges = {"name": ("words", 2, 4), "lowLabel": ("words", 1, 3), "highLabel": ("words", 1, 3),
                  "lowMeans": ("sentences", 1, 1), "highMeans": ("sentences", 1, 1),
                  "description": ("sentences", 2, 4), "whyItMatters": ("sentences", 2, 3)}
        for key, (unit, lo, hi) in ranges.items():
            value = count_words(dim[key]) if unit == "words" else count_sentences(dim[key])
            if not lo <= value <= hi:
                want = f"{lo}" if lo == hi else f"{lo} to {hi}"
                rep.fail(sec, f"{name}: {key} has {value} {unit[:-1]}(s), expected {want}")
        if not dim["question"].strip().endswith("?"):
            rep.fail(sec, f"{name}: question should end with a question mark")
        for key in ("examplesLow", "examplesHigh"):
            ex = dim[key]
            if not (isinstance(ex, list) and 2 <= len(ex) <= 3 and len(set(ex)) == len(ex)
                    and all(x in bp.CANONICAL_IDS for x in ex)):
                rep.fail(sec, f"{name}: {key} must list 2 to 3 distinct established ids")
        if isinstance(dim["examplesLow"], list) and isinstance(dim["examplesHigh"], list):
            overlap = set(dim["examplesLow"]) & set(dim["examplesHigh"])
            if overlap:
                rep.fail(sec, f"{name}: {sorted(overlap)} in both examplesLow and examplesHigh")
    for path, label in find_dashes(doc):
        rep.fail(sec, f"{label} in {path}")
    return dims


# ---------------------------------------------------------------- scores

def check_scores(doc, dims, rep):
    """Return {anchorId: {dimId: score}} or None if unusable."""
    sec = "scores"
    dim_ids = [d["id"] for d in dims]
    if not isinstance(doc, dict) or set(doc) != {"version", "scores"}:
        rep.fail(sec, "top level must be an object with exactly version and scores")
        return None
    if doc["version"] != 1:
        rep.fail(sec, f"version must be 1, not {doc['version']!r}")
    scores = doc["scores"]
    if not isinstance(scores, dict):
        rep.fail(sec, "scores must be an object")
        return None
    missing = [a for a in bp.CANONICAL_IDS if a not in scores]
    extra = [a for a in scores if a not in bp.CANONICAL_IDS]
    if missing or extra:
        rep.fail(sec, f"anchors differ from the canonical 21 (missing {missing}, extra {extra})")
    table = {}
    for aid in bp.CANONICAL_IDS:
        row = scores.get(aid)
        if not isinstance(row, dict):
            continue
        dmissing = [d for d in dim_ids if d not in row]
        dextra = [d for d in row if d not in dim_ids]
        if dmissing or dextra:
            rep.fail(sec, f"{aid}: dimensions differ (missing {dmissing}, extra {dextra})")
        table[aid] = {}
        for did in dim_ids:
            entry = row.get(did)
            where = f"{aid}.{did}"
            if not (isinstance(entry, dict) and set(entry) == {"score", "why"}):
                rep.fail(sec, f"{where}: must be an object with exactly score and why")
                continue
            score, why = entry["score"], entry["why"]
            if not is_number(score) or not 0 <= score <= 10:
                rep.fail(sec, f"{where}: score {score!r} must be a number from 0 to 10")
                continue
            if not decimals_ok(score, 1):
                rep.fail(sec, f"{where}: score {score} has more than one decimal")
            table[aid][did] = float(score)
            if not nonempty_str(why):
                rep.fail(sec, f"{where}: why must be a non-empty string")
            elif count_sentences(why) != 1 or not why.rstrip().endswith("."):
                rep.fail(sec, f"{where}: why must be exactly one sentence ending in a period")
    for path, label in find_dashes(doc):
        rep.fail(sec, f"{label} in {path}")
    complete = all(len(table.get(a, {})) == len(dim_ids) for a in bp.CANONICAL_IDS)
    return table if complete else None


def check_examples(dims, table, rep):
    for dim in dims:
        did = dim["id"]
        for aid in dim.get("examplesLow", []):
            if aid in table and table[aid].get(did, 0) > EXAMPLE_LOW_MAX:
                rep.fail("dimensions", f"{did}: low example {aid} scores {table[aid][did]}, "
                                       f"above {EXAMPLE_LOW_MAX}")
        for aid in dim.get("examplesHigh", []):
            if aid in table and table[aid].get(did, 10) < EXAMPLE_HIGH_MIN:
                rep.fail("dimensions", f"{did}: high example {aid} scores {table[aid][did]}, "
                                       f"below {EXAMPLE_HIGH_MIN}")


# ---------------------------------------------------------------- points

def expected_coord(raw):
    """Independent re-implementation of the clamp and half-up rounding to 0.1."""
    clamped = min(max(raw, 0.0), 10.0)
    return math.floor(clamped * 10 + 0.5 + 1e-9) / 10


def xy_ok(value):
    return isinstance(value, list) and len(value) == 2 and all(is_number(v) for v in value)


def check_projection(proj, dim_ids, rep):
    sec = "points"
    if not isinstance(proj, dict):
        rep.fail(sec, "projection must be an object")
        return None
    keys = set(proj)
    if not PROJECTION_REQUIRED <= keys or keys - PROJECTION_REQUIRED - PROJECTION_OPTIONAL:
        rep.fail(sec, f"projection keys must be {sorted(PROJECTION_REQUIRED)} plus optionally "
                      f"{sorted(PROJECTION_OPTIONAL)}, got {sorted(keys)}")
        return None
    if not nonempty_str(proj["method"]):
        rep.fail(sec, "projection.method must be a non-empty string")
    explained = proj["explained"]
    if not (isinstance(explained, list) and len(explained) == 2
            and all(is_number(e) and 0 < e <= 1 for e in explained)
            and explained[0] >= explained[1] and sum(explained) <= 1 + 1e-9):
        rep.fail(sec, "projection.explained must be two descending fractions summing to 1 or less")
    axes = proj["axes"]
    if not (isinstance(axes, list) and len(axes) == 2 and all(
            isinstance(ax, dict) and set(ax) == {"loadings"} and isinstance(ax["loadings"], dict)
            and list(ax["loadings"]) == dim_ids and all(is_number(w) for w in ax["loadings"].values())
            for ax in axes)):
        rep.fail(sec, "projection.axes must be two {loadings: {dimId: weight}} in dimension order")
        return None
    w = np.array([[ax["loadings"][d] for d in dim_ids] for ax in axes])
    if np.abs(w @ w.T - np.eye(2)).max() > 1e-6:
        rep.fail(sec, "projection axes are not orthonormal")
    center = proj.get("center")
    if center is not None:
        if not (isinstance(center, dict) and list(center) == dim_ids
                and all(is_number(c) for c in center.values())):
            rep.fail(sec, "projection.center must map every dimension id to a number")
            return None
        return np.array([center[d] for d in dim_ids]), w
    return None


def check_points(doc, dims, table, meta, rep):
    sec = "points"
    dim_ids = [d["id"] for d in dims]
    top = ["version", "dimensionIds", "projection", "established", "generated"]
    if not isinstance(doc, dict) or set(doc) != set(top):
        rep.fail(sec, f"top level must have exactly {top}")
        return
    if doc["version"] != 1:
        rep.fail(sec, f"version must be 1, not {doc['version']!r}")
    if doc["dimensionIds"] != dim_ids:
        rep.fail(sec, "dimensionIds differ from dimensions.json")
        return
    projection = check_projection(doc["projection"], dim_ids, rep)

    # Established points.
    est = doc["established"]
    if not (isinstance(est, list) and [e.get("id") if isinstance(e, dict) else None for e in est]
            == bp.CANONICAL_IDS):
        rep.fail(sec, "established must list the 21 practices in canonical order")
        return
    est_xy = {}
    for entry in est:
        aid = entry["id"]
        if list(entry) != ESTABLISHED_KEYS:
            rep.fail(sec, f"established {aid}: keys must be {ESTABLISHED_KEYS}")
            continue
        if entry["coords"] != table[aid]:
            rep.fail(sec, f"established {aid}: coords differ from scores.json")
        if meta is not None:
            want = meta[aid]
            got = {k: entry[k] for k in ("name", "shortName", "family")}
            if got != want:
                rep.fail(sec, f"established {aid}: name, shortName or family differ from the "
                              f"anchor ({got} vs {want})")
        if entry["family"] not in FAMILIES:
            rep.fail(sec, f"established {aid}: bad family {entry['family']!r}")
        if not xy_ok(entry["xy"]):
            rep.fail(sec, f"established {aid}: xy must be two numbers")
            continue
        est_xy[aid] = np.array(entry["xy"], dtype=float)
        if projection is not None:
            center, w = projection
            want_xy = (np.array([table[aid][d] for d in dim_ids]) - center) @ w.T
            if np.abs(want_xy - est_xy[aid]).max() > 1e-6:
                rep.fail(sec, f"established {aid}: xy does not match the stored projection")

    # Generated points.
    gen = doc["generated"]
    if not isinstance(gen, list):
        rep.fail(sec, "generated must be a list")
        return
    pairs = list(itertools.combinations(bp.CANONICAL_IDS, 2))
    expected_ids = [f"{a}__{b}__{k}" for a, b in pairs for k in (1, 3, 5)]
    ids = [g.get("id") if isinstance(g, dict) else None for g in gen]
    if len(gen) != len(expected_ids):
        rep.fail(sec, f"generated has {len(gen)} entries, expected {len(expected_ids)}")
    if len(set(ids)) != len(ids):
        rep.fail(sec, f"generated ids are not unique ({len(ids) - len(set(ids))} repeats)")
    if set(ids) != set(expected_ids):
        missing = sorted(set(expected_ids) - set(ids))
        extra = sorted(set(ids) - set(expected_ids), key=str)
        rep.fail(sec, f"generated ids differ: {len(missing)} missing (e.g. {missing[:3]}), "
                      f"{len(extra)} unexpected (e.g. {extra[:3]})")
    elif ids != expected_ids:
        rep.fail(sec, "generated entries are not in pair order then index order")

    est_matrix = np.array([[table[a][d] for d in dim_ids] for a in bp.CANONICAL_IDS])
    by_id = {}
    for g in gen:
        if not isinstance(g, dict) or list(g) != GENERATED_KEYS:
            rep.fail(sec, f"generated {g.get('id') if isinstance(g, dict) else g!r}: keys must be "
                          f"{GENERATED_KEYS}")
            continue
        gid, a, b, index = g["id"], g["a"], g["b"], g["index"]
        where = f"generated {gid}"
        if a not in bp.CANONICAL_IDS or b not in bp.CANONICAL_IDS or \
                bp.CANONICAL_IDS.index(a) >= bp.CANONICAL_IDS.index(b):
            rep.fail(sec, f"{where}: a and b must be established ids with a before b")
            continue
        if index not in POSITION_OF_INDEX or gid != f"{a}__{b}__{index}":
            rep.fail(sec, f"{where}: id must be <a>__<b>__<index> with index 1, 3 or 5")
            continue
        position, t = POSITION_OF_INDEX[index]
        if g["position"] != position or g["t"] != t:
            rep.fail(sec, f"{where}: index {index} needs position {position!r} and t {t}")
        raw, coords = g["raw"], g["coords"]
        if not (isinstance(raw, dict) and list(raw) == dim_ids and all(is_number(v) for v in raw.values())
                and isinstance(coords, dict) and list(coords) == dim_ids
                and all(is_number(v) for v in coords.values())):
            rep.fail(sec, f"{where}: raw and coords must map every dimension, in order, to a number")
            continue
        for d in dim_ids:
            want = table[a][d] + t * (table[b][d] - table[a][d])
            if abs(raw[d] - want) > 1e-9 or not decimals_ok(raw[d], 2):
                rep.fail(sec, f"{where}: raw {d} is {raw[d]}, expected {want:.2f}")
            if not 0 <= coords[d] <= 10:
                rep.fail(sec, f"{where}: coords {d} {coords[d]} is outside 0 to 10")
            elif abs(coords[d] - expected_coord(raw[d])) > 1e-9:
                rep.fail(sec, f"{where}: coords {d} is {coords[d]}, expected {expected_coord(raw[d])}")
        want_clamped = [d for d in dim_ids if raw[d] < 0 or raw[d] > 10]
        if g["clampedDims"] != want_clamped:
            rep.fail(sec, f"{where}: clampedDims {g['clampedDims']} should be {want_clamped}")
        point = np.array([coords[d] for d in dim_ids])
        dist = np.sqrt(((est_matrix - point) ** 2).sum(axis=1))
        nearest = g["nearest"]
        if not (isinstance(nearest, list) and len(nearest) == 3 and all(
                isinstance(n, dict) and set(n) == {"id", "distance"} and n["id"] in bp.CANONICAL_IDS
                and is_number(n["distance"]) for n in nearest)):
            rep.fail(sec, f"{where}: nearest must be 3 {{id, distance}} entries")
        else:
            got = [(n["id"], n["distance"]) for n in nearest]
            distances = [n["distance"] for n in nearest]
            ranked = sorted(dist)[:3]
            if len({n["id"] for n in nearest}) != 3 or distances != sorted(distances):
                rep.fail(sec, f"{where}: nearest must be 3 distinct ids in ascending distance")
            for (nid, nd), best in zip(got, ranked):
                actual = dist[bp.CANONICAL_IDS.index(nid)]
                if abs(nd - actual) > 1e-3 or abs(actual - best) > 1e-9:
                    rep.fail(sec, f"{where}: nearest {nid} at {nd} is not among the 3 closest "
                                  f"or its distance is wrong")
                    break
        if not xy_ok(g["xy"]):
            rep.fail(sec, f"{where}: xy must be two numbers")
            continue
        by_id[gid] = np.array(g["xy"], dtype=float)
        if projection is not None:
            center, w = projection
            want_xy = (np.array([raw[d] for d in dim_ids]) - center) @ w.T
            if np.abs(want_xy - by_id[gid]).max() > 1e-6:
                rep.fail(sec, f"{where}: xy does not match the stored projection of raw")

    # Lines: 5 points per pair, collinear and evenly spaced in xy.
    worst_spacing = worst_cross = 0.0
    lines_checked = 0
    for a, b in pairs:
        keys = [f"{a}__{b}__1", a, f"{a}__{b}__3", b, f"{a}__{b}__5"]
        if not all(k in by_id for k in keys[0::2]) or a not in est_xy or b not in est_xy:
            rep.fail(sec, f"line {a} to {b}: missing points, cannot check it")
            continue
        pts = [by_id[keys[0]], est_xy[a], by_id[keys[2]], est_xy[b], by_id[keys[4]]]
        steps = [pts[n + 1] - pts[n] for n in range(4)]
        spacing = max(float(np.abs(s - steps[0]).max()) for s in steps[1:])
        direction = pts[3] - pts[1]
        cross = max(abs(float(direction[0] * (p - pts[1])[1] - direction[1] * (p - pts[1])[0]))
                    for p in pts)
        worst_spacing, worst_cross = max(worst_spacing, spacing), max(worst_cross, cross)
        lines_checked += 1
        if spacing > LINE_TOLERANCE:
            rep.fail(sec, f"line {a} to {b}: points not evenly spaced (off by {spacing:.3g})")
        if cross > LINE_TOLERANCE:
            rep.fail(sec, f"line {a} to {b}: points not collinear (cross product {cross:.3g})")
    return {"lines": lines_checked, "worst_spacing": worst_spacing, "worst_cross": worst_cross,
            "generated": len(gen),
            "clamped": sum(1 for g in gen if isinstance(g, dict) and g.get("clampedDims"))}


def floats_equal(x, y, tol=1e-9):
    if isinstance(x, bool) or isinstance(y, bool):
        return x == y
    if isinstance(x, (int, float)) and isinstance(y, (int, float)):
        return abs(x - y) <= tol
    if isinstance(x, dict) and isinstance(y, dict):
        return list(x) == list(y) and all(floats_equal(x[k], y[k], tol) for k in x)
    if isinstance(x, list) and isinstance(y, list):
        return len(x) == len(y) and all(floats_equal(p, q, tol) for p, q in zip(x, y))
    return x == y


# ---------------------------------------------------------------- quality report

def quality_report(dims, table, points_doc, strict, rep):
    dim_ids = [d["id"] for d in dims]
    ids = bp.CANONICAL_IDS
    x = np.array([[table[a][d] for d in dim_ids] for a in ids])
    missed = []
    print("\nQUALITY REPORT")
    print(f"  spread per dimension (max minus min across the {len(ids)} anchors; "
          f"target {TARGET_SPREAD:g} or more)")
    for j, d in enumerate(dim_ids):
        col = x[:, j]
        lo, hi = int(np.argmin(col)), int(np.argmax(col))
        spread = float(col.max() - col.min())
        flag = "" if spread >= TARGET_SPREAD else "   <-- below target"
        if spread < TARGET_SPREAD:
            missed.append(f"spread of {d} is {spread:g}")
        print(f"    {d:<11} {spread:4.1f}   min {col.min():4.1f} ({ids[lo]}), max {col.max():4.1f} "
              f"({ids[hi]}), mean {col.mean():.2f}{flag}")
    with np.errstate(invalid="ignore", divide="ignore"):
        r = np.corrcoef(x.T)
    corr = sorted(((float(r[i, j]), dim_ids[i], dim_ids[j])
                   for i, j in itertools.combinations(range(len(dim_ids)), 2)),
                  key=lambda c: -abs(c[0]) if math.isfinite(c[0]) else 0)
    print(f"  most correlated dimension pairs (Pearson r across anchors; "
          f"target |r| {TARGET_MAX_R:g} or less)")
    for value, d1, d2 in corr[:8]:
        flag = "" if abs(value) <= TARGET_MAX_R else "   <-- above target"
        print(f"    {d1:<11} {d2:<11} r = {value:+.3f}{flag}")
    over = [c for c in corr if not math.isfinite(c[0]) or abs(c[0]) > TARGET_MAX_R]
    missed.extend(f"|r| of {d1} and {d2} is {abs(v):.3f}" for v, d1, d2 in over)
    dist = sorted((float(np.linalg.norm(x[i] - x[j])), ids[i], ids[j])
                  for i, j in itertools.combinations(range(len(ids)), 2))
    print(f"  10 closest anchor pairs (Euclidean distance over all {len(dim_ids)} dimensions; "
          f"target {TARGET_MIN_DISTANCE:g} or more)")
    for value, a, b in dist[:10]:
        flag = "" if value >= TARGET_MIN_DISTANCE else "   <-- below target"
        print(f"    {value:5.2f}  {a} and {b}{flag}")
    missed.extend(f"{a} and {b} are {v:.2f} apart" for v, a, b in dist if v < TARGET_MIN_DISTANCE)
    if isinstance(points_doc, dict) and isinstance(points_doc.get("projection"), dict):
        proj = points_doc["projection"]
        try:
            print(f"  map projection: axis 1 explains {proj['explained'][0]:.1%}, "
                  f"axis 2 {proj['explained'][1]:.1%} of the variance")
            for k, ax in enumerate(proj["axes"]):
                top = sorted(ax["loadings"].items(), key=lambda kv: -abs(kv[1]))[:4]
                print(f"    axis {k + 1} strongest loadings: "
                      + ", ".join(f"{d} {w:+.2f}" for d, w in top))
        except (KeyError, TypeError, IndexError):
            pass
    if missed:
        print("  QUALITY TARGETS MISSED: " + "; ".join(missed))
        if strict:
            for m in missed:
                rep.fail("quality", m)
    else:
        print("  QUALITY TARGETS: all met (spread, correlation, distance)")


def print_table(dims, table):
    dim_ids = [d["id"] for d in dims]
    print("\n| Anchor | " + " | ".join(dim_ids) + " |")
    print("|---|" + "---:|" * len(dim_ids))
    for aid in bp.CANONICAL_IDS:
        print(f"| {aid} | " + " | ".join(f"{table[aid][d]:g}" for d in dim_ids) + " |")


# ---------------------------------------------------------------- main

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--anchors", type=Path, default=bp.DATA_DIR / "anchors",
                        help="folder of anchor files (default: therapy-space/data/anchors)")
    parser.add_argument("--dimensions", type=Path, default=bp.DATA_DIR / "dimensions.json")
    parser.add_argument("--scores", type=Path, default=bp.DATA_DIR / "scores.json")
    parser.add_argument("--points", type=Path, default=bp.DATA_DIR / "points.json")
    parser.add_argument("--allow-missing-anchors", action="store_true",
                        help="accept focusing, qigong and nature as not yet written")
    parser.add_argument("--table", action="store_true", help="print a Markdown table of the scores")
    parser.add_argument("--strict-quality", action="store_true",
                        help="treat missed quality targets as failures")
    args = parser.parse_args(argv)
    rep = Report()

    print(f"check_data: anchors {args.anchors}")
    found = check_anchors(args.anchors, args.allow_missing_anchors, rep)
    print(f"  [anchors]    {len(found)} of {len(bp.CANONICAL_IDS)} files checked, "
          f"{rep.count('anchors')} failures")

    dims_doc = load(args.dimensions, "dimensions", rep)
    dims = check_dimensions(dims_doc, rep) if dims_doc is not None else None
    table = None
    if dims is not None:
        scores_doc = load(args.scores, "scores", rep)
        table = check_scores(scores_doc, dims, rep) if scores_doc is not None else None
        if table is not None:
            check_examples(dims, table, rep)
        print(f"  [dimensions] {len(dims)} dimensions, {rep.count('dimensions')} failures")
        print(f"  [scores]     {len(bp.CANONICAL_IDS)} anchors x {len(dims)} dimensions, "
              f"{rep.count('scores')} failures")

    points_doc = None
    if table is not None:
        points_doc = load(args.points, "points", rep)
        meta = anchor_meta(found)
        if points_doc is not None:
            if meta is not None:  # staleness first: it is the usual root cause of other failures
                try:
                    fresh = bp.build(dims_doc, scores_doc, meta)
                    if not floats_equal(fresh, points_doc):
                        rep.fail("points", "points.json differs from a fresh build: run "
                                           "build_points.py again")
                except bp.BuildError as exc:
                    rep.fail("points", f"fresh build failed: {exc}")
            stats = check_points(points_doc, dims, table, meta, rep)
            if stats:
                print(f"  [points]     {len(points_doc.get('established', []))} established, "
                      f"{stats['generated']} generated ({stats['clamped']} with clamped dimensions), "
                      f"{stats['lines']} lines checked; worst spacing error {stats['worst_spacing']:.1e}, "
                      f"worst collinearity error {stats['worst_cross']:.1e}; "
                      f"{rep.count('points')} failures")
        quality_report(dims, table, points_doc, args.strict_quality, rep)
        if args.table:
            print_table(dims, table)
    else:
        section = "scores" if dims is not None else "dimensions"
        rep.fail(section, f"{section} could not be read completely, so points and quality were skipped")

    print()
    for section, message in rep.warnings:
        print(f"WARN [{section}] {message}")
    shown = {}
    for section, message in rep.failures:
        shown[section] = shown.get(section, 0) + 1
        if shown[section] <= MAX_SHOWN_PER_SECTION:
            print(f"FAIL [{section}] {message}")
    for section, count in shown.items():
        if count > MAX_SHOWN_PER_SECTION:
            print(f"FAIL [{section}] ... and {count - MAX_SHOWN_PER_SECTION} more failures")
    if rep.failures:
        print(f"RESULT: FAIL ({len(rep.failures)} failures, {len(rep.warnings)} warnings)")
        return 1
    print(f"RESULT: PASS ({len(rep.warnings)} warnings)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
