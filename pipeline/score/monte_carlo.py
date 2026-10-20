"""Monte Carlo uncertainty bands for the total score.

Each draw perturbs the *input* values of every scored metric by a standard error,
re-runs the reference scorer, and records the total. The 5th/50th/95th
percentiles of the draw distribution become the displayed band.

We perturb inputs, not scores, so the whole nonlinear pipeline (winsorise, log,
rank) is propagated correctly. For metrics with no published MOE (POPEST point
estimates, CBP counts) we use a documented coefficient of variation from
``params`` rather than pretending they are exact (rule R6: no silent precision).
"""

from __future__ import annotations

import numpy as np

from pipeline.config import MetricsConfig
from pipeline.score.reference import ScoreResult, score_matrix


def relative_se(metric_id: str, values: np.ndarray, cfg: MetricsConfig) -> np.ndarray:
    """Per-county relative standard error for a metric's input.

    Falls back to a flat coefficient of variation when no MOE is published.
    """
    cv = cfg.priors.get("cv_no_moe", {})
    default_cv = float(cfg.priors.get("default_cv", 0.10))
    rel = float(cv.get(metric_id, default_cv))
    return np.full(values.shape, rel, dtype=float)


def monte_carlo_total(
    *,
    fips: list[str],
    columns: dict[str, np.ndarray],
    cfg: MetricsConfig,
    lens_id: str,
    eligibility_pop: np.ndarray | None = None,
    draws: int | None = None,
    seed: int = 20261020,
) -> dict[str, np.ndarray]:
    """Return {'p05','p50','p95'} of the total score across ``draws`` simulations."""
    draws = draws or cfg.params.monte_carlo_draws
    rng = np.random.default_rng(seed)
    n = len(fips)

    rel_se = {mid: relative_se(mid, arr, cfg) for mid, arr in columns.items()}
    totals = np.empty((draws, n), dtype=float)
    for d in range(draws):
        perturbed = {}
        for mid, arr in columns.items():
            # Multiplicative log-normal perturbation keeps shares non-negative
            # and lets count-like metrics vary on the right scale.
            noise = rng.normal(0.0, rel_se[mid])
            perturbed[mid] = arr * np.exp(noise)
        res: ScoreResult = score_matrix(
            fips=fips,
            columns=perturbed,
            cfg=cfg,
            lens_id=lens_id,
            eligibility_pop=eligibility_pop,
        )
        totals[d] = res.total
    return {
        "p05": np.percentile(totals, 5, axis=0),
        "p50": np.percentile(totals, 50, axis=0),
        "p95": np.percentile(totals, 95, axis=0),
    }
