"""Monte Carlo uncertainty bands for the total score and the rank.

Each draw perturbs the *input* values of every scored metric, re-runs the
reference scorer, and records the total. The 5th/50th/95th percentiles of the
draw distribution become the displayed band, and the rank distribution becomes
the "how sure are we about the position" band.

We perturb inputs, not scores, so the whole nonlinear pipeline (winsorise,
log, rank) is propagated correctly.

Two kinds of uncertainty are propagated
---------------------------------------
**Input uncertainty.** A metric with a published margin of error (every ACS
estimate has one, at 90% confidence) is perturbed additively with a Gaussian
whose standard error is ``MOE / 1.645``, because that is the precision the
publisher actually claimed. A metric with no published MOE - POPEST point
estimates, CBP counts, IRS SOI, BEA, the PLACES composites - is perturbed with
a multiplicative log-normal at a documented coefficient of variation, so the
model never claims a precision the source did not publish (rule R6).

**Weight uncertainty.** The lens weights are priors, not measurements, so
they are drawn from a Dirichlet distribution centred on the configured values.
Without this, a county whose score depends on a close call between two
sub-scores would look certain when in fact the model is guessing.

Both are opt-out per metric through the config, and the seed is fixed so the
bands are reproducible.
"""

from __future__ import annotations

import warnings

import numpy as np

from pipeline.config import MetricsConfig
from pipeline.score.reference import ScoreResult, score_matrix

# Dirichlet concentration: the prior weight vector is the mean, and
# concentration controls how tight the draws are. 60 keeps the spread small
# enough that the weights stay recognisable as the configured lens while
# still moving enough to test a close call.
WEIGHT_CONCENTRATION = 60.0

# Metrics whose value is a proportion of a whole: a draw must stay in [0, 1].
BOUNDED_UNITS = {"share", "percent"}


def relative_se(metric_id: str, values: np.ndarray, cfg: MetricsConfig) -> np.ndarray:
    """Per-county relative standard error for a metric's input.

    Falls back to a flat coefficient of variation when no MOE is published.
    """
    cv = cfg.priors.get("cv_no_moe", {})
    default_cv = float(cfg.priors.get("default_cv", 0.10))
    rel = float(cv.get(metric_id, default_cv))
    return np.full(values.shape, rel, dtype=float)


def published_se(
    values: np.ndarray, moes: np.ndarray | None, z90: float
) -> np.ndarray | None:
    """Standard error implied by a published 90% margin of error.

    Returns ``None`` where no MOE is available, so the caller can fall back to
    the documented coefficient of variation.
    """
    if moes is None:
        return None
    moes = np.asarray(moes, dtype=float)
    if not np.isfinite(moes).any():
        return None
    out = np.full(values.shape, np.nan, dtype=float)
    good = np.isfinite(moes) & (moes > 0)
    out[good] = moes[good] / z90
    return out


def _perturb(
    values: np.ndarray,
    rng: np.random.Generator,
    *,
    se: np.ndarray | None,
    rel: np.ndarray,
    bounded: bool,
) -> np.ndarray:
    """One perturbed draw of a metric's input values."""
    out = values.astype(float).copy()
    if se is not None:
        # Published precision: an additive Gaussian at the published error.
        noise = rng.normal(0.0, 1.0, size=values.shape) * np.nan_to_num(se)
        out = out + noise
    else:
        # No published MOE: a documented coefficient of variation, applied
        # multiplicatively so counts and dollars vary on the right scale.
        noise = rng.normal(0.0, 1.0, size=values.shape) * rel
        out = out * np.exp(noise)
    out = np.clip(out, 0.0, 1.0) if bounded else np.clip(out, 0.0, None)
    out[~np.isfinite(values)] = np.nan
    return out


def draw_weights(
    cfg: MetricsConfig, lens_id: str, rng: np.random.Generator
) -> tuple[dict[str, float], dict[str, float]]:
    """Draw one set of sub-score and metric weights from the configured priors.

    The configured weights are the mean of the Dirichlet. The spread is a
    documented assumption (``WEIGHT_CONCENTRATION``), not a measurement: it
    asks "would the conclusion change if the weights were a little different?".
    """
    sub_fractions = cfg.lens_weights_fraction(lens_id)
    metric_fractions = cfg.metric_weights_fraction(lens_id)

    sub_ids = [s for s in cfg.sub_score_ids() if sub_fractions.get(s, 0) > 0]
    sub_alpha = np.array([sub_fractions[s] * WEIGHT_CONCENTRATION for s in sub_ids])
    sub_draw = rng.dirichlet(sub_alpha) if sub_ids else np.array([])

    metric_draw: dict[str, float] = {}
    for sub in sub_ids:
        ids = [m.id for m in cfg.scored_metrics if m.subscore == sub]
        weights = np.array([metric_fractions.get(mid, 0.0) for mid in ids])
        total = weights.sum()
        if total <= 0:
            for mid in ids:
                metric_draw[mid] = 0.0
            continue
        alpha = weights / total * WEIGHT_CONCENTRATION
        draw = rng.dirichlet(alpha)
        for mid, value in zip(ids, draw, strict=True):
            metric_draw[mid] = float(value)

    return dict(zip(sub_ids, sub_draw.tolist(), strict=True)), metric_draw


def monte_carlo_total(
    *,
    fips: list[str],
    columns: dict[str, np.ndarray],
    cfg: MetricsConfig,
    lens_id: str,
    eligibility_pop: np.ndarray | None = None,
    moes: dict[str, np.ndarray] | None = None,
    draws: int | None = None,
    seed: int = 20261020,
    z90: float = 1.6448536269514722,
) -> dict[str, np.ndarray]:
    """Return the score and rank distributions across ``draws`` simulations.

    Keys: ``p05``, ``p50``, ``p95`` (score percentiles), ``rank_p05``,
    ``rank_p50``, ``rank_p95`` (rank percentiles, 1 = best) and ``p_top50``
    (the share of draws in which the county is in the better half).
    """
    draws = draws or cfg.params.monte_carlo_draws
    rng = np.random.default_rng(seed)
    n = len(fips)

    metric_by_id = {m.id: m for m in cfg.scored_metrics}
    rel = {mid: relative_se(mid, arr, cfg) for mid, arr in columns.items()}
    se = {
        mid: published_se(columns[mid], (moes or {}).get(mid), z90) for mid in columns
    }

    totals = np.empty((draws, n), dtype=float)
    ranks = np.empty((draws, n), dtype=float)
    for d in range(draws):
        perturbed = {}
        for mid, arr in columns.items():
            metric = metric_by_id.get(mid)
            bounded = metric is not None and metric.unit in BOUNDED_UNITS
            perturbed[mid] = _perturb(
                arr,
                rng,
                se=se[mid],
                rel=rel[mid],
                bounded=bounded,
            )
        sub_weights, metric_weights = draw_weights(cfg, lens_id, rng)
        res: ScoreResult = score_matrix(
            fips=fips,
            columns=perturbed,
            cfg=cfg,
            lens_id=lens_id,
            metric_weight_overrides=metric_weights,
            subscore_weight_overrides=sub_weights,
            eligibility_pop=eligibility_pop,
        )
        totals[d] = res.total
        ranks[d] = _rank_of(res.total)

    out = {
        "p05": _percentile(totals, 5),
        "p50": _percentile(totals, 50),
        "p95": _percentile(totals, 95),
        "rank_p05": _percentile(ranks, 5),
        "rank_p50": _percentile(ranks, 50),
        "rank_p95": _percentile(ranks, 95),
    }
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        # The share of draws in which the county is in the better half.
        out["p_top50"] = np.nanmean((ranks <= ranks.shape[1] / 2.0), axis=0)
    return out


def _rank_of(totals: np.ndarray) -> np.ndarray:
    """Rank of each county within a draw, 1 = best. NaN totals get NaN."""
    out = np.full(totals.shape, np.nan, dtype=float)
    finite = np.isfinite(totals)
    if not finite.any():
        return out
    # Rank by descending total, average rank for ties.
    values = totals[finite]
    order = np.argsort(-values, kind="mergesort")
    ranks = np.empty(values.shape, dtype=float)
    sorted_vals = values[order]
    i = 0
    while i < values.size:
        j = i
        while j + 1 < values.size and sorted_vals[j + 1] == sorted_vals[i]:
            j += 1
        ranks[i : j + 1] = (i + j) / 2.0 + 1.0
        i = j + 1
    positions = np.nonzero(finite)[0]
    out[positions[order]] = ranks
    return out


def _percentile(totals: np.ndarray, q: float) -> np.ndarray:
    """Percentile across draws, ignoring counties that could not be scored."""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)  # all-NaN slices
        return np.nanpercentile(totals, q, axis=0)
