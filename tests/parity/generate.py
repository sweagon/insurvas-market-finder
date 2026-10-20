"""Generate the Python<->TypeScript scoring parity golden file.

Writes ``tests/parity/inputs.json`` (a small synthetic county matrix) and
``tests/parity/expected.json`` (score_matrix output for every lens). The
TypeScript port in ``web/src/score/score.ts`` is asserted against the same files
by ``web/src/score/score.test.ts`` to <= 1e-9.
"""

from __future__ import annotations

import json

import numpy as np

from pipeline import paths
from pipeline.config import load_config
from pipeline.score.reference import score_matrix

OUT = paths.ROOT / "tests" / "parity"


def _synthetic(n: int = 40, seed: int = 7) -> dict[str, list[float]]:
    rng = np.random.default_rng(seed)
    cfg = load_config()
    data: dict[str, list[float]] = {}
    for m in cfg.scored_metrics:
        # Mix of scales so log/winsor paths are exercised.
        base = rng.lognormal(mean=6.0, sigma=1.2, size=n)
        if m.unit in ("share", "rate", "percent"):
            base = np.clip(base / np.max(base), 0.0, 1.0)
        # Inject ties at the extremes to exercise tie-breaking.
        base[0] = np.max(base)
        base[1] = np.max(base)
        base[-1] = np.min(base)
        base[-2] = np.min(base)
        data[m.id] = [float(x) for x in base]
    return data


def generate() -> None:
    cfg = load_config()
    n = 40
    columns = _synthetic(n)
    fips = [f"{i:05d}" for i in range(n)]
    pop = [5000.0 + 1000.0 * i for i in range(n)]

    expected: dict[str, dict[str, list[float]]] = {}
    for lens_id in cfg.lenses:
        res = score_matrix(
            fips=fips,
            columns={k: np.array(v) for k, v in columns.items()},
            cfg=cfg,
            lens_id=lens_id,
            eligibility_pop=np.array(pop),
        )
        expected[lens_id] = {
            "total": [float(x) for x in res.total],
            "subscores": {s: [float(x) for x in arr] for s, arr in res.subscores.items()},
            "contributions": {m: [float(x) for x in arr] for m, arr in res.contributions.items()},
            "eligibility": [bool(x) for x in res.eligibility],
        }

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "inputs.json").write_text(
        json.dumps({"fips": fips, "columns": columns, "pop": pop}), encoding="utf-8"
    )
    (OUT / "expected.json").write_text(
        json.dumps({"lens_order": list(cfg.lenses.keys()), "expected": expected}), encoding="utf-8"
    )
    _export_scoring_config(cfg)


def _export_scoring_config(cfg) -> None:
    """Emit the scoring-relevant slice of config/metrics.yaml for the TS port."""
    out = {
        "version": cfg.version,
        "params": {
            "winsor_lower": cfg.params.winsor_lower,
            "winsor_upper": cfg.params.winsor_upper,
            "eligibility_min_60plus": cfg.params.eligibility_min_60plus,
        },
        "default_lens": cfg.default_lens_id,
        "subscores": cfg.sub_score_ids(),
        "lenses": {
            lid: {
                "label": lens.label,
                "description": lens.description,
                "weights": lens.weights.as_dict(),
                "flip_insurance_sign": lens.flip_insurance_sign,
            }
            for lid, lens in cfg.lenses.items()
        },
        "metrics": [
            {
                "id": m.id,
                "subscore": m.subscore,
                "direction": m.direction,
                "transform": m.transform,
                "scored": m.scored,
                "lens_weights": m.lens_weights.model_dump(),
            }
            for m in cfg.metrics
        ],
    }
    target = paths.WEB / "src" / "score" / "config.generated.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(out, indent=2), encoding="utf-8")


if __name__ == "__main__":
    generate()
    print(f"wrote {OUT}/inputs.json and {OUT}/expected.json")
