"""Generate ``data/qa_report.md`` - the human-readable data-quality audit.

Checks are deliberately assertive: the build fails loudly if any invariant is
violated (contribution sums, forbidden fields for rule R7, metric coverage
floors, out-of-range values, county-universe integrity). Soft findings
(imputed rows, shrunk rows, min/max) are reported for review.
"""

from __future__ import annotations

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
    "race",
    "ethnic",
    "hispanic",
    "latino",
    "origin",
    "ancestry",
    "religio",
    "disab",
    "black",
    "white",
    "asian",
    "native",
]

# Units that are bounded above by 1. A value outside the bound is a bug, not
# an outlier, and must fail the build.
BOUNDED_UNITS = {"share", "percent"}
# Units that cannot be negative. "index" and "growth_rate" are deliberately
# absent: a z-score index and a growth rate can both be negative.
NON_NEGATIVE_UNITS = {
    "share",
    "percent",
    "people",
    "usd",
    "density",
    "rate",
    "households",
}


def _find_forbidden(columns: list[str]) -> list[str]:
    hits = []
    for col in columns:
        low = col.lower()
        for bad in R7_FORBIDDEN_SUBSTRINGS:
            if bad in low:
                hits.append(col)
                break
    return hits


def _weight_problems(cfg) -> list[str]:
    """Every lens must distribute exactly 1.0 across each sub-score.

    The scorer renormalises anyway, so a wrong total silently rescales the
    metric weights. A config whose weights do not add up is a documentation
    bug: the file is the record of which metric the model actually trusts.
    """
    problems: list[str] = []
    for lens_id in cfg.lenses:
        for sub in cfg.sub_score_ids():
            ids = [m for m in cfg.scored_metrics if m.subscore == sub]
            total = sum(float(getattr(m.lens_weights, lens_id)) for m in ids)
            if ids and abs(total - 1.0) > 1e-9:
                problems.append(
                    f"lens '{lens_id}' sub-score '{sub}' weights sum to {total:.4f}, not 1.0"
                )
    return problems


def _out_of_range(cfg, df: pl.DataFrame) -> list[tuple[str, str, int]]:
    """Metrics whose values fall outside what their unit can physically be."""
    problems: list[tuple[str, str, int]] = []
    for m in cfg.metrics:
        if m.id not in df.columns:
            problems.append((m.id, "missing from the metric matrix", df.height))
            continue
        col = df[m.id].cast(pl.Float64, strict=False)
        if m.unit in BOUNDED_UNITS:
            bad = int(((col < 0.0) | (col > 1.0)).sum())
            if bad:
                problems.append((m.id, f"outside [0, 1] for unit '{m.unit}'", bad))
        elif m.unit in NON_NEGATIVE_UNITS:
            bad = int((col < 0.0).sum())
            if bad:
                problems.append((m.id, f"negative value for unit '{m.unit}'", bad))
    return problems


def generate() -> str:
    cfg = load_config()
    manifest = Manifest()
    df = build_metric_matrix(manifest, cfg)
    n = df.height

    fips = df["fips"].to_list()
    fips_ok = (
        len(fips) == len(set(fips))
        and all(len(str(f).strip()) == cfg.geography.fips_length for f in fips)
        and all(str(f).strip().isdigit() for f in fips)
    )

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
    w(
        f"Every metric must be present for at least "
        f"**{cfg.params.min_metric_coverage:.0%}** of counties "
        f"(per-metric overrides are listed in the `floor` column). "
        f"Scored metrics below their floor fail the build."
    )
    w("")
    w("| metric | sub-score | scored | nulls | coverage | floor | min | p50 | max | status |")
    w("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
    scored = {m.id for m in cfg.scored_metrics}
    coverage_failures: list[tuple[str, float, float]] = []
    for m in cfg.metrics:
        floor = cfg.coverage_floor(m)
        if m.id not in df.columns:
            w(
                f"| {m.id} | {m.subscore} | {'yes' if m.id in scored else 'no'} | "
                f"MISSING | 0% | {floor:.0%} |  |  |  | FAIL |"
            )
            coverage_failures.append((m.id, 0.0, floor))
            continue
        col = df[m.id].cast(pl.Float64, strict=False)
        nulls = col.null_count()
        finite = col.drop_nulls().to_numpy()
        cov = 100.0 * (n - nulls) / n if n else 0.0
        failed = (cov / 100.0) < floor
        status = "FAIL" if failed else "ok"
        if failed:
            coverage_failures.append((m.id, cov / 100.0, floor))
        if finite.size:
            w(
                f"| {m.id} | {m.subscore} | {'yes' if m.id in scored else 'no'} | "
                f"{nulls} | {cov:.1f}% | {floor:.0%} | {np.nanmin(finite):.4g} | "
                f"{np.nanmedian(finite):.4g} | {np.nanmax(finite):.4g} | {status} |"
            )
        else:
            w(
                f"| {m.id} | {m.subscore} | {'yes' if m.id in scored else 'no'} | "
                f"{nulls} | 0% | {floor:.0%} |  |  |  | {status} |"
            )
    w("")

    # ---- County universe --------------------------------------------------
    expected = int(cfg.params.expected_counties)
    tolerance = float(cfg.params.county_count_tolerance)
    allowed = max(1, int(round(expected * tolerance)))
    count_ok = abs(n - expected) <= allowed
    w("## County universe")
    w("")
    w(
        f"- Counties in the metric matrix: **{n:,}** "
        f"(expected {expected:,}, tolerance +/-{allowed:,})"
    )
    w(f"- FIPS codes are {cfg.geography.fips_length} characters and unique: "
      f"**{'yes' if fips_ok else 'NO'}**")
    w(f"- Status: **{'PASS' if count_ok and fips_ok else 'FAIL'}**")
    w("")

    # ---- Value ranges -----------------------------------------------------
    range_problems = _out_of_range(cfg, df)
    w("## Value ranges")
    w("")
    if not range_problems:
        w("_No metric violates its unit bounds._")
    else:
        w("| metric | problem | rows |")
        w("| --- | --- | --- |")
        for mid, problem, count in range_problems:
            w(f"| {mid} | {problem} | {count} |")
    w("")

    # ---- Weights ----------------------------------------------------------
    weight_problems = _weight_problems(cfg)
    w("## Model weights")
    w("")
    if not weight_problems:
        w(
            "Every lens distributes 1.0 across each sub-score. The lens weights "
            "themselves are documented priors, not measurements."
        )
    else:
        for p in weight_problems:
            w(f"- **FAIL** {p}")
    w("")

    # ---- Source coverage --------------------------------------------------
    w("## Source coverage")
    w("")
    w("Every source in the config, the metrics it feeds and the share of counties")
    w("those metrics cover. A source that silently stopped covering counties is")
    w("a join failure, not a data quirk.")
    w("")
    w("| source | metrics | min coverage |")
    w("| --- | --- | --- |")
    for sid in sorted(cfg.sources):
        ids = [m.id for m in cfg.metrics if m.source == sid]
        covs = []
        for mid in ids:
            if mid not in df.columns:
                continue
            nulls = df[mid].cast(pl.Float64, strict=False).null_count()
            covs.append(100.0 * (n - nulls) / n if n else 0.0)
        best = min(covs) if covs else 0.0
        w(f"| {sid} | {', '.join(ids) if ids else '(not used by any metric)'} | {best:.1f}% |")
    w("")

    # ---- Outliers ---------------------------------------------------------
    w("## Outliers")
    w("")
    w(
        "Values outside the 1st/99th percentile of their own metric. These are "
        "reported, not rejected: a real outlier is information, and the scorer "
        "ranks on percentiles, which are already outlier-resistant."
    )
    w("")
    w("| metric | below p01 | above p99 |")
    w("| --- | --- | --- |")
    for m in cfg.metrics:
        if m.id not in df.columns:
            continue
        finite = df[m.id].cast(pl.Float64, strict=False).drop_nulls().to_numpy()
        if finite.size < 20:
            continue
        lo, hi = np.nanpercentile(finite, [1, 99])
        below = int((finite < lo).sum())
        above = int((finite > hi).sum())
        w(f"| {m.id} | {below} | {above} |")
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

    # ---- SSA OASDI cross-check --------------------------------------------
    w("## SSA OASDI cross-check")
    w("")
    w(
        "SSA publishes the share of the 65+ population receiving benefits for "
        "every state. The county table is summed back to the state and "
        "compared with that published share, which is an independent check on "
        "the parse: the fetch fails the build when the two drift more than 1%."
    )
    w("")
    ssa_problems: list[str] = []
    if "beneficiaries_65plus" in df.columns:
        w(
            "| state | counties | beneficiaries 65+ | SSA 65+ population "
            "| SSA published share | implied | drift |"
        )
        w("| --- | --- | --- | --- | --- | --- | --- |")
        worst = 0.0
        per_state = df.group_by("state_fips").agg(
            pl.len().alias("counties"),
            pl.col("beneficiaries_65plus").sum().alias("counted"),
            pl.col("ssa_population_65plus").first().alias("ssa_pop"),
            pl.col("ssa_pct_65plus_receiving_benefits").first().alias("ssa_pct"),
            pl.col("stname").first().alias("state_name"),
        )
        for r in per_state.sort("state_fips").iter_rows(named=True):
            if r["ssa_pop"] is None or r["ssa_pct"] is None:
                continue
            implied = r["ssa_pop"] * r["ssa_pct"] / 100.0
            drift = abs(r["counted"] - implied) / implied if implied else 0.0
            worst = max(worst, drift)
            if drift > 0.01:
                ssa_problems.append(f"{r['state_name']} ({drift:.2%})")
            w(
                f"| {r['state_name']} | {r['counties']} | {r['counted']:,} | "
                f"{r['ssa_pop']:,} | {r['ssa_pct']:.1f}% | {implied:,.0f} | "
                f"{drift:.3%} |"
            )
        w("")
        w(f"Worst state drift: **{worst:.3%}** (tolerance 1%).")
    else:
        w("_SSA data is not present in the metric matrix._")
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
    columns = {
        m.id: df[m.id].to_numpy().astype(float) for m in cfg.scored_metrics if m.id in df.columns
    }
    max_err = 0.0
    for lens_id in cfg.lenses:
        res = score_matrix(
            fips=df["fips"].to_list(),
            columns=columns,
            cfg=cfg,
            lens_id=lens_id,
            eligibility_pop=pop,
        )
        total_from_contrib = np.sum(list(res.contributions.values()), axis=0)
        err = float(np.nanmax(np.abs(total_from_contrib - res.total)))
        max_err = max(max_err, err)
        w(f"- `{lens_id}`: max |sum(contributions) - total| = {err:.3e}")
    w("")
    status = "PASSED" if max_err <= 1e-9 else "FAILED"
    w(f"**Invariant {status}** (tolerance 1e-9, observed {max_err:.3e}).")
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
    res = score_matrix(
        fips=df["fips"].to_list(), columns=columns, cfg=cfg, lens_id="volume", eligibility_pop=pop
    )
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
    if coverage_failures:
        detail = ", ".join(
            f"{mid} ({cov:.1%} < {floor:.0%})" for mid, cov, floor in coverage_failures
        )
        raise SystemExit(f"metric coverage below the configured floor: {detail}")
    if range_problems:
        detail = ", ".join(
            f"{mid}: {problem} ({count} rows)" for mid, problem, count in range_problems
        )
        raise SystemExit(f"metric values outside their unit bounds: {detail}")
    if not count_ok:
        raise SystemExit(
            f"county universe changed: {n} rows, expected {expected} (+/-{allowed})"
        )
    if not fips_ok:
        raise SystemExit("FIPS integrity check failed: codes must be unique 5-digit strings")
    if weight_problems:
        raise SystemExit("; ".join(weight_problems))
    if ssa_problems:
        raise SystemExit(
            "SSA OASDI county counts disagree with the published state share: "
            + ", ".join(ssa_problems)
        )
    return report


if __name__ == "__main__":
    text = generate()
    print(text)
