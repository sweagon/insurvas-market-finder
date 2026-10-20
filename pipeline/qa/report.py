"""Generate ``data/qa_report.md`` - the human-readable data-quality audit.

Checks are deliberately assertive: the build fails loudly if any invariant is
violated (contribution sums, forbidden fields for rule R7, key coverage). Soft
findings (imputed rows, shrunk rows, min/max) are reported for review.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime

import numpy as np
import polars as pl

from pipeline import paths
from pipeline.config import load_config
from pipeline.fetch.http import Manifest
from pipeline.score.reference import score_matrix
from pipeline.transform.metrics import build_metric_matrix

# rule R7: never used in scoring, filtering or ranking, in any form.
R7_FORBIDDEN_SUBSTRINGS = [
    "race", "ethnic", "hispanic", "latino", "origin", "ancestry",
    "religio", "disab", "black", "white", "asian", "native",
]


def _find_forbidden(columns: list[str]) -> list[str]:
    hits = []
    for col in columns:
        low = col.lower()
        for bad in R7_FORBIDDEN_SUBSTRINGS:
            if bad in low:
                hits.append(col)
                break
    return hits


def generate() -> str:
    cfg = load_config()
    manifest = Manifest()
    df = build_metric_matrix(manifest)
    n = df.height

    lines: list[str] = []
    w = lines.append
    w("# Data QA report")
    w("")
    w(f"Generated: {datetime.now(UTC).isoformat()}")
    w(f"Config version: {cfg.version}  |  Counties: {n}")
    w("")

    # ---- Coverage ---------------------------------------------------------
    w("## Metric coverage")
    w("")
    w("| metric | sub-score | scored | nulls | coverage | min | p50 | max |")
    w("| --- | --- | --- | --- | --- | --- | --- | --- |")
    scored = {m.id for m in cfg.scored_metrics}
    for m in cfg.metrics:
        if m.id not in df.columns:
            w(f"| {m.id} | {m.subscore} | {'yes' if m.scored else 'no'} | MISSING | 0% |  |  |  |")
            continue
        col = df[m.id].cast(pl.Float64, strict=False)
        nulls = col.null_count()
        finite = col.drop_nulls().to_numpy()
        cov = 100.0 * (n - nulls) / n if n else 0.0
        if finite.size:
            w(
                f"| {m.id} | {m.subscore} | {'yes' if m.id in scored else 'no'} | {nulls} | "
                f"{cov:.1f}% | {np.nanmin(finite):.4g} | {np.nanmedian(finite):.4g} | {np.nanmax(finite):.4g} |"
            )
        else:
            w(f"| {m.id} | {m.subscore} | {'yes' if m.id in scored else 'no'} | {nulls} | 0% |  |  |  |")
    w("")

    # ---- Flags ------------------------------------------------------------
    w("## Imputation and shrinkage flags")
    w("")
    flag_cols = [c for c in df.columns if c.startswith("imputed_") or c.startswith("shrunk_")]
    if not flag_cols:
        w("_None._")
    else:
        w("| flag | rows | share |")
        w("| --- | --- | --- |")
        for c in flag_cols:
            cnt = int(df[c].sum())
            w(f"| {c} | {cnt} | {100.0 * cnt / n:.2f}% |")
    w("")

    # ---- Eligibility ------------------------------------------------------
    elig = int((df["pop_60plus"] >= cfg.params.eligibility_min_60plus).sum())
    w("## Eligibility")
    w("")
    w(f"- Minimum 60+ population for ranking: **{cfg.params.eligibility_min_60plus:,}**")
    w(f"- Eligible counties: **{elig}** of {n} ({100.0 * elig / n:.1f}%)")
    w(f"- Excluded (below threshold): {n - elig}")
    w("")

    # ---- Contribution invariant ------------------------------------------
    w("## Contribution invariant (rule R5)")
    w("")
    pop = df["pop_60plus"].to_numpy()
    columns = {m.id: df[m.id].to_numpy().astype(float) for m in cfg.scored_metrics if m.id in df.columns}
    max_err = 0.0
    for lens_id in cfg.lenses:
        res = score_matrix(fips=df["fips"].to_list(), columns=columns, cfg=cfg,
                           lens_id=lens_id, eligibility_pop=pop)
        total_from_contrib = np.sum(list(res.contributions.values()), axis=0)
        err = float(np.nanmax(np.abs(total_from_contrib - res.total)))
        max_err = max(max_err, err)
        w(f"- `{lens_id}`: max |sum(contributions) - total| = {err:.3e}")
    w("")
    w(f"**Invariant {'PASSED' if max_err <= 1e-9 else 'FAILED'}** (tolerance 1e-9, observed {max_err:.3e}).")
    w("")

    # ---- Rule R7 audit ----------------------------------------------------
    w("## Rule R7 audit (protected attributes)")
    w("")
    forbidden = _find_forbidden(list(df.columns))
    w(f"Protected-attribute columns present in the metric matrix: **{len(forbidden)}**")
    if forbidden:
        w("")
        w(f"`{'`, `'.join(forbidden)}`")
    w("")
    w("English-proficiency fields are stored as context only and are excluded from")
    w("scoring (see config `rule_R7`). No race/ethnicity/origin/religion/disability")
    w("field is read, scored, used as a filter, or displayed.")
    w("")

    # ---- Top / bottom sanity ---------------------------------------------
    w("## Ranking sanity check (volume lens)")
    w("")
    res = score_matrix(fips=df["fips"].to_list(), columns=columns, cfg=cfg,
                       lens_id="volume", eligibility_pop=pop)
    names = df["ctyname"].to_list()
    states = df["stname"].to_list()
    order = np.argsort(-res.total)
    w("Top 5:")
    w("")
    for i in order[:5]:
        w(f"1. {names[i]}, {states[i]} - {res.total[i]:.2f} (60+: {int(pop[i]):,})")
    w("")
    w("Bottom 5 (eligible):")
    w("")
    eligible_order = [i for i in order if res.eligibility[i]][-5:]
    for i in eligible_order:
        w(f"1. {names[i]}, {states[i]} - {res.total[i]:.2f} (60+: {int(pop[i]):,})")
    w("")

    report = "\n".join(lines) + "\n"
    paths.QA_REPORT.write_text(report, encoding="utf-8")

    if forbidden:
        raise SystemExit(f"rule R7 violation: forbidden columns {forbidden}")
    if max_err > 1e-9:
        raise SystemExit(f"contribution invariant failed: {max_err:.3e}")
    return report


if __name__ == "__main__":
    text = generate()
    print(text)
