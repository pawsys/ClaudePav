#!/usr/bin/env python3
"""Build therapy-space/data/points.json from the anchors, dimensions and scores.

Usage (from the repository root):
  python3 -B therapy-space/scripts/build_points.py [--anchors DIR] [--dimensions FILE]
      [--scores FILE] [--out FILE]

Every pair of established practices (a before b in canonical order) defines one line,
210 lines in all. With t measured along the line (A at t = 0, B at t = 1), each line
has five evenly spaced points: t = -0.5 (point 1, beyond A, away from B), 0 (point 2,
A itself), 0.5 (point 3, the midpoint), 1 (point 4, B itself) and 1.5 (point 5, beyond
B, away from A). Points 2 and 4 are the established practices, so each line adds three
generated points: 630 in total, with ids "<a>__<b>__1", "<a>__<b>__3", "<a>__<b>__5".

Raw coordinates of points 1 and 5 can fall outside 0 to 10. They are kept as "raw"
and also stored clamped to 0..10 and rounded to 0.1 as "coords"; "clampedDims" lists
the dimensions that needed clamping, and "nearest" (the 3 closest established
practices, Euclidean distance) uses the clamped coordinates.

The overview map is a PCA of the established practices' raw scores (centered, not
scaled). Generated points are projected from their raw, unclamped coordinates with
the same axes, so the five points of every line stay on one straight line in the map
and stay evenly spaced. Each axis has a fixed sign (see SIGN_REFERENCE), so reruns
give the same picture, and the same inputs always give the same output file.

The name, shortName and family of each established point come from its anchor file, so
all 21 anchor files must be present.
"""
import argparse
import json
import sys
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"

# Canonical order and fixed ids of the 21 established practices.
CANONICAL_IDS = [
    "ipf", "ifs", "cbt", "act", "coherence", "tre", "focusing", "aletheia", "do-nothing",
    "metta-jhana", "vipassana", "hiit", "team-sport", "endurance", "strength", "animal",
    "qigong", "socializing", "nature", "sensory", "music",
]

# Points added on every line: (index on the line, t, position name).
LINE_POINTS = [
    (1, Decimal("-0.5"), "beyond-a"),
    (3, Decimal("0.5"), "midpoint"),
    (5, Decimal("1.5"), "beyond-b"),
]

# Fixed sign convention: axis 1 is flipped if needed so that this dimension loads
# positively on it, and the same for axis 2.
SIGN_REFERENCE = ("exertion", "structure")
SIGN_TEXT = ("Each axis is flipped if needed so that a reference dimension loads positively: "
             "exertion on axis 1, structure on axis 2.")

XY_DECIMALS = 12  # far below the 1e-9 line checks, and hides last-bit noise between machines


class BuildError(Exception):
    """An input problem that stops the build."""


def load_json(path):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        raise BuildError(f"file not found: {path}") from None
    except json.JSONDecodeError as exc:
        raise BuildError(f"{path} is not valid JSON: {exc}") from None


def load_anchor_meta(anchors_dir):
    """Return {id: {name, shortName, family}} read from the 21 anchor files."""
    anchors_dir = Path(anchors_dir)
    meta = {}
    for aid in CANONICAL_IDS:
        path = anchors_dir / f"{aid}.json"
        if not path.is_file():
            raise BuildError(f"missing anchor file {path}")
        doc = load_json(path)
        if not isinstance(doc, dict) or doc.get("id") != aid:
            raise BuildError(f"{path} does not hold an anchor with id {aid!r}")
        try:
            meta[aid] = {key: doc[key] for key in ("name", "shortName", "family")}
        except KeyError as exc:
            raise BuildError(f"{path} has no {exc.args[0]!r} key") from None
    return meta


def dimension_ids(dimensions_doc):
    try:
        ids = [d["id"] for d in dimensions_doc["dimensions"]]
    except (KeyError, TypeError):
        raise BuildError("dimensions.json must hold {\"dimensions\": [{\"id\": ...}, ...]}") from None
    if len(set(ids)) != len(ids):
        raise BuildError("dimensions.json has duplicate dimension ids")
    for ref in SIGN_REFERENCE:
        if ref not in ids:
            raise BuildError(f"sign reference dimension {ref!r} is not in dimensions.json")
    return ids


def score_table(scores_doc, dim_ids):
    """Scores as Decimals, {anchorId: {dimId: Decimal}}, read through str() so 3.5 stays 3.5."""
    table = {}
    try:
        scores = scores_doc["scores"]
    except (KeyError, TypeError):
        raise BuildError("scores.json must hold {\"scores\": {...}}") from None
    for aid in CANONICAL_IDS:
        row = scores.get(aid)
        if not isinstance(row, dict):
            raise BuildError(f"scores.json has no scores for {aid!r}")
        table[aid] = {}
        for dim in dim_ids:
            entry = row.get(dim)
            value = entry.get("score") if isinstance(entry, dict) else None
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise BuildError(f"scores.json: {aid}.{dim}.score is missing or not a number")
            if not 0 <= value <= 10:
                raise BuildError(f"scores.json: {aid}.{dim}.score {value} is outside 0 to 10")
            table[aid][dim] = Decimal(str(value))
    return table


def pca_axes(matrix, dim_ids):
    """Center the rows, take the first two principal axes and apply the sign convention."""
    center = matrix.mean(axis=0)
    _, singular, vt = np.linalg.svd(matrix - center, full_matrices=False)
    variance = singular ** 2
    explained = variance[:2] / variance.sum()
    axes = vt[:2].copy()
    for k, ref in enumerate(SIGN_REFERENCE):
        if axes[k, dim_ids.index(ref)] < 0:
            axes[k] = -axes[k]
    return center, axes, explained


def clamp_round(value):
    """Clamp a Decimal to 0..10 and round it half up to one decimal."""
    clamped = min(max(value, Decimal(0)), Decimal(10))
    return float(clamped.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


def build(dimensions_doc, scores_doc, anchor_meta):
    """Return the points document as a dict (pure function, no file access)."""
    dim_ids = dimension_ids(dimensions_doc)
    table = score_table(scores_doc, dim_ids)
    matrix = np.array([[float(table[aid][d]) for d in dim_ids] for aid in CANONICAL_IDS])
    center, axes, explained = pca_axes(matrix, dim_ids)

    def project(vector):
        xy = (np.asarray(vector, dtype=float) - center) @ axes.T
        return [round(float(v), XY_DECIMALS) for v in xy]

    established = []
    for k, aid in enumerate(CANONICAL_IDS):
        meta = anchor_meta[aid]
        established.append({
            "id": aid,
            "name": meta["name"],
            "shortName": meta["shortName"],
            "family": meta["family"],
            "coords": {d: float(table[aid][d]) for d in dim_ids},
            "xy": project(matrix[k]),
        })

    generated = []
    for i, a in enumerate(CANONICAL_IDS):
        for b in CANONICAL_IDS[i + 1:]:
            for index, t, position in LINE_POINTS:
                raw = {d: table[a][d] + t * (table[b][d] - table[a][d]) for d in dim_ids}
                coords = {d: clamp_round(raw[d]) for d in dim_ids}
                point = np.array([coords[d] for d in dim_ids])
                distances = np.sqrt(((matrix - point) ** 2).sum(axis=1))
                order = sorted(range(len(CANONICAL_IDS)),
                               key=lambda n: (round(float(distances[n]), 9), n))[:3]
                generated.append({
                    "id": f"{a}__{b}__{index}",
                    "a": a,
                    "b": b,
                    "index": index,
                    "position": position,
                    "t": float(t),
                    "raw": {d: float(raw[d]) for d in dim_ids},
                    "coords": coords,
                    "clampedDims": [d for d in dim_ids if raw[d] < 0 or raw[d] > 10],
                    "nearest": [{"id": CANONICAL_IDS[n], "distance": round(float(distances[n]), 3)}
                                for n in order],
                    "xy": project([float(raw[d]) for d in dim_ids]),
                })

    projection = {
        "method": f"PCA on the {len(CANONICAL_IDS)} established practices' raw scores, centered, not scaled",
        "explained": [round(float(e), 6) for e in explained],
        "axes": [{"loadings": {d: round(float(w), XY_DECIMALS) for d, w in zip(dim_ids, axes[k])}}
                 for k in range(2)],
        "center": {d: round(float(c), XY_DECIMALS) for d, c in zip(dim_ids, center)},
        "signConvention": SIGN_TEXT,
    }
    return {
        "version": 1,
        "dimensionIds": dim_ids,
        "projection": projection,
        "established": established,
        "generated": generated,
    }


def dumps_points(doc):
    """JSON text with one line per point, so the file stays small and diffs stay readable."""
    def one(obj):
        return json.dumps(obj, ensure_ascii=False, separators=(", ", ": "))

    projection = json.dumps(doc["projection"], ensure_ascii=False, indent=2).replace("\n", "\n  ")
    lines = [
        "{",
        f'  "version": {one(doc["version"])},',
        f'  "dimensionIds": {one(doc["dimensionIds"])},',
        f'  "projection": {projection},',
    ]
    for key, closing in (("established", "  ],"), ("generated", "  ]")):
        items = doc[key]
        lines.append(f'  "{key}": [')
        lines.extend(f"    {one(item)}{',' if n < len(items) - 1 else ''}" for n, item in enumerate(items))
        lines.append(closing)
    lines.append("}")
    text = "\n".join(lines) + "\n"
    if json.loads(text) != doc:  # the hand-made layout must round-trip exactly
        raise BuildError("internal error: points.json layout does not round-trip")
    return text


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--anchors", type=Path, default=DATA_DIR / "anchors",
                        help="folder of anchor files (default: therapy-space/data/anchors)")
    parser.add_argument("--dimensions", type=Path, default=DATA_DIR / "dimensions.json")
    parser.add_argument("--scores", type=Path, default=DATA_DIR / "scores.json")
    parser.add_argument("--out", type=Path, default=DATA_DIR / "points.json")
    args = parser.parse_args(argv)

    try:
        dimensions_doc = load_json(args.dimensions)
        scores_doc = load_json(args.scores)
        meta = load_anchor_meta(args.anchors)
        doc = build(dimensions_doc, scores_doc, meta)
        text = dumps_points(doc)
    except BuildError as exc:
        print(f"build_points: error: {exc}", file=sys.stderr)
        return 1

    args.out.write_text(text, encoding="utf-8")
    proj = doc["projection"]
    clamped = sum(1 for g in doc["generated"] if g["clampedDims"])
    print(f"build_points: wrote {args.out} ({len(text.encode('utf-8'))} bytes)")
    print(f"  established: {len(doc['established'])}, generated: {len(doc['generated'])}, "
          f"lines: {len(doc['generated']) // len(LINE_POINTS)}, "
          f"generated points with clamped dimensions: {clamped}")
    print(f"  PCA explained variance: axis 1 {proj['explained'][0]:.3f}, axis 2 {proj['explained'][1]:.3f}")
    for k, ref in enumerate(SIGN_REFERENCE):
        weight = proj["axes"][k]["loadings"][ref]
        note = "  WARNING: small, so the axis sign may be unstable" if abs(weight) < 0.15 else ""
        print(f"  axis {k + 1} sign reference {ref}: loading {weight:+.3f}{note}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
