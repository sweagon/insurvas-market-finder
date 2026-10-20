"""Reference scoring engine (pure function).

``score_matrix`` takes a county matrix, a lens id, optional weight overrides and
the validated config, and returns per-county sub-scores, a total score and exact
per-metric contributions.

Parity contract
---------------
``web/src/score/score.ts`` is a line-by-line TypeScript port of this module. The
golden-file parity test asserts agreement to <= 1e-9. Any numerical change here
MUST be mirrored there.

Numerics
--------
Percentile ranks use the *average* rank / (n - 1) convention (matching
``scipy.stats.rankdata`` "average" and the JS implementation), computed over
non-null values only. Ties receive the same rank. Direction is applied after
ranking so that higher always means better.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from pipeline.config import MetricsConfig, Metric


@dataclass
class ScoreResult:
    fips: list[str]
    total: np.ndarray
    subscores: dict[str, np.ndarray]
    contributions: dict[str, np.ndarray]  # metric id -> contribution to total
    subscore_contributions: dict[str, np.ndarray]  # subscore -> contribution
    eligibility: np.ndarray  # bool
    used_metrics: list[str] = field(default_factory=list)


def winsorize(values: np.ndarray, lower: float, upper: float) -> np.ndarray:
    finite = values[np.isfinite(values)]
    if finite.size == 0:
        return values
    lo = np.quantile(finite, lower)
    hi = np.quantile(finite, upper)
    out = values.copy()
    mask = np.isfinite(out)
    out[mask] = np.clip(out[mask], lo, hi)
    return out


def percentile_rank(values: np.ndarray, direction: str, tiebreak: np.ndarray | None = None) -> np.ndarray:
    """Average-rank percentile in [0, 1]; NaN stays NaN. Higher is always better.

    When winsorisation clips outliers to a common cap they would otherwise share
    an average rank. Passing the pre-winsorisation values as ``tiebreak``
    resolves those ties by the underlying magnitude so the extreme counties stay
    ordered; genuinely equal inputs still receive the same rank.
    """
    out = np.full(values.shape, np.nan, dtype=float)
    mask = np.isfinite(values)
    n = int(mask.sum())
    if n == 0:
        return out
    vals = values[mask]
    if tiebreak is not None:
        tb = tiebreak[mask]
        order = np.lexsort((tb, vals))
        sorted_vals = vals[order]
        sorted_tb = tb[order]
    else:
        order = np.argsort(vals, kind="mergesort")
        sorted_vals = vals[order]
        sorted_tb = None
    ranks = np.empty(n, dtype=float)
    i = 0
    # Average rank for genuine ties (equal value AND equal tiebreak).
    while i < n:
        j = i
        while j + 1 < n and sorted_vals[j + 1] == sorted_vals[i] and (
            sorted_tb is None or sorted_tb[j + 1] == sorted_tb[i]
        ):
            j += 1
        avg_rank = (i + j) / 2.0
        ranks[i : j + 1] = avg_rank
        i = j + 1
    if n == 1:
        pct = np.array([1.0])
    else:
        pct = ranks / (n - 1)
    if direction == "lower_is_better":
        pct = 1.0 - pct
    # `ranks` is in sorted order; scatter back to the original positions.
    positions = np.nonzero(mask)[0]
    out[positions[order]] = pct
    return out


def transform_metric(values: np.ndarray, metric: Metric, cfg: MetricsConfig) -> np.ndarray:
    raw = values.astype(float).copy()
    transformed = raw.copy()
    if metric.transform in ("log", "winsor_log"):
        # log1p on non-negative values; negatives (rare) are clipped at 0.
        transformed = np.log1p(np.clip(transformed, 0, None))
    wins = winsorize(transformed, cfg.params.winsor_lower, cfg.params.winsor_upper)
    # Rank on the winsorised values but break cap ties by the transformed value.
    return percentile_rank(wins, metric.direction, tiebreak=transformed)


def metric_percentiles(df_columns: dict[str, np.ndarray], cfg: MetricsConfig) -> dict[str, np.ndarray]:
    """Return {metric_id: percentile rank} for every scored metric."""
    out: dict[str, np.ndarray] = {}
    for metric in cfg.scored_metrics:
        if metric.id not in df_columns:
            continue
        out[metric.id] = transform_metric(df_columns[metric.id], metric, cfg)
    return out


def score_matrix(
    *,
    fips: list[str],
    columns: dict[str, np.ndarray],
    cfg: MetricsConfig,
    lens_id: str | None = None,
    metric_weight_overrides: dict[str, float] | None = None,
    subscore_weight_overrides: dict[str, float] | None = None,
    eligibility_pop: np.ndarray | None = None,
    flip_insurance_sign: bool | None = None,
) -> ScoreResult:
    """Score every row. Contributions sum exactly to the total (rule R5)."""
    lens_id = lens_id or cfg.default_lens_id
    lens = cfg.lenses[lens_id]

    pct = metric_percentiles(columns, cfg)
    metric_weights = cfg.metric_weights_fraction(lens_id)
    if metric_weight_overrides:
        metric_weights = dict(metric_weights)
        metric_weights.update(metric_weight_overrides)

    sub_weights = cfg.lens_weights_fraction(lens_id)
    if subscore_weight_overrides:
        sub_weights = dict(sub_weights)
        sub_weights.update(subscore_weight_overrides)

    n = len(fips)

    def metric_weight(metric: Metric) -> float:
        return float(metric_weights.get(metric.id, 0.0))

    # Sign flip for guaranteed-issue lenses: higher disease burden is positive.
    flip = lens.flip_insurance_sign if flip_insurance_sign is None else flip_insurance_sign

    subscores: dict[str, np.ndarray] = {}
    subscore_contributions: dict[str, np.ndarray] = {}
    contributions: dict[str, np.ndarray] = {}
    used: list[str] = []

    for sub in cfg.sub_score_ids():
        metrics = [m for m in cfg.scored_metrics if m.subscore == sub]
        weight_sum = np.zeros(n)
        acc = np.zeros(n)
        for metric in metrics:
            mw = metric_weight(metric)
            if mw <= 0 or metric.id not in pct:
                continue
            arr = pct[metric.id].copy()
            if sub == "insurability" and flip and metric.direction == "lower_is_better":
                arr = 1.0 - arr
            valid = np.isfinite(arr)
            acc = acc + np.where(valid, arr * mw, 0.0)
            weight_sum = weight_sum + np.where(valid, mw, 0.0)
            used.append(metric.id)
        with np.errstate(invalid="ignore", divide="ignore"):
            sub_score = np.where(weight_sum > 0, acc / weight_sum, 0.0)
        subscores[sub] = sub_score

        sw = float(sub_weights.get(sub, 0.0))
        sub_contrib = sub_score * sw * 100.0
        subscore_contributions[sub] = sub_contrib
        # Distribute the sub-score contribution to each metric proportionally.
        for metric in metrics:
            mw = metric_weight(metric)
            if mw <= 0 or metric.id not in pct:
                contributions[metric.id] = np.zeros(n)
                continue
            arr = pct[metric.id].copy()
            if sub == "insurability" and flip and metric.direction == "lower_is_better":
                arr = 1.0 - arr
            valid = np.isfinite(arr)
            denom = np.where(weight_sum > 0, weight_sum, 1.0)
            share = np.where(valid, mw / denom, 0.0)
            contributions[metric.id] = sub_contrib * share

    total = np.sum([subscore_contributions[s] for s in cfg.sub_score_ids()], axis=0)

    if eligibility_pop is None:
        eligibility = np.ones(n, dtype=bool)
    else:
        eligibility = eligibility_pop >= cfg.params.eligibility_min_60plus

    return ScoreResult(
        fips=fips,
        total=total,
        subscores=subscores,
        contributions=contributions,
        subscore_contributions=subscore_contributions,
        eligibility=eligibility,
        used_metrics=sorted(set(used)),
    )
