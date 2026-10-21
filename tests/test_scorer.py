"""Scorer invariants: contributions sum to the total, direction handling, ties."""

import numpy as np
import pytest

from pipeline.config import load_config
from pipeline.score.reference import percentile_rank, score_matrix, transform_metric


@pytest.fixture(scope="module")
def cfg():
    return load_config()


def _synthetic(cfg, n=30, seed=3):
    rng = np.random.default_rng(seed)
    cols = {}
    for m in cfg.scored_metrics:
        cols[m.id] = rng.lognormal(6, 1, size=n)
    pop = np.linspace(1000, 50000, n)
    fips = [f"{i:05d}" for i in range(n)]
    return fips, cols, pop


def test_contributions_sum_to_total(cfg):
    fips, cols, pop = _synthetic(cfg)
    for lens in cfg.lenses:
        res = score_matrix(fips=fips, columns=cols, cfg=cfg, lens_id=lens, eligibility_pop=pop)
        total = np.sum(list(res.contributions.values()), axis=0)
        assert np.max(np.abs(total - res.total)) < 1e-9


def test_scores_bounded(cfg):
    fips, cols, pop = _synthetic(cfg)
    res = score_matrix(fips=fips, columns=cols, cfg=cfg, lens_id="volume", eligibility_pop=pop)
    assert np.all(res.total >= -1e-9)
    assert np.all(res.total <= 100 + 1e-9)


def test_eligibility_threshold(cfg):
    fips, cols, pop = _synthetic(cfg)
    pop = pop.copy()
    pop[0] = cfg.params.eligibility_min_60plus - 1
    res = score_matrix(fips=fips, columns=cols, cfg=cfg, lens_id="volume", eligibility_pop=pop)
    assert res.eligibility[0] == False  # noqa: E712
    assert res.eligibility[1]


def test_percentile_rank_direction():
    vals = np.array([1.0, 2.0, 3.0, 4.0])
    higher = percentile_rank(vals, "higher_is_better")
    lower = percentile_rank(vals, "lower_is_better")
    assert np.isclose(higher[-1], 1.0)
    assert np.isclose(lower[-1], 0.0)
    assert np.allclose(higher + lower, 1.0)


def test_percentile_rank_nan_preserved():
    vals = np.array([1.0, np.nan, 3.0])
    out = percentile_rank(vals, "higher_is_better")
    assert np.isnan(out[1])
    assert np.isfinite(out[0]) and np.isfinite(out[2])


def test_cap_ties_broken_by_value(cfg):
    # Two values share the winsorisation cap but differ pre-cap: no tie.
    metric = cfg.metric("pop_60plus")
    vals = np.array([1.0, 2.0, 3.0, 100.0, 200.0] + [3.0] * 20)
    out = transform_metric(vals, metric, cfg)
    assert out[4] > out[3]  # 200 ranks above 100 despite equal winsor caps


def _with_missing(cfg, n=30, seed=3, drop_subscore="insurability"):
    """Synthetic matrix whose rows all lack one sub-score."""
    fips, cols, pop = _synthetic(cfg, n=n, seed=seed)
    for metric in cfg.scored_metrics:
        if metric.subscore == drop_subscore:
            cols[metric.id] = np.full(n, np.nan)
    return fips, cols, pop


def test_missing_subscore_is_unavailable_not_zero(cfg):
    fips, cols, pop = _with_missing(cfg)
    res = score_matrix(fips=fips, columns=cols, cfg=cfg, lens_id="volume", eligibility_pop=pop)
    assert np.all(np.isnan(res.subscores["insurability"]))
    # Every other sub-score is still computed.
    assert np.all(np.isfinite(res.subscores["size"]))


def test_missing_subscore_is_not_penalised(cfg):
    """A county without a sub-score is scored on what it has, not ranked last."""
    fips, cols, pop = _synthetic(cfg)
    full = score_matrix(fips=fips, columns=cols, cfg=cfg, lens_id="volume", eligibility_pop=pop)

    dropped = dict(cols)
    for metric in cfg.scored_metrics:
        if metric.subscore == "insurability":
            dropped[metric.id] = np.full(len(fips), np.nan)
    partial = score_matrix(
        fips=fips, columns=dropped, cfg=cfg, lens_id="volume", eligibility_pop=pop
    )

    assert np.all(partial.coverage < 1.0)
    assert np.all(partial.partial)

    # The old behaviour scored the missing sub-score as 0, so the total was the
    # sum of the available sub-scores with no renormalisation.
    sub_weights = cfg.lens_weights_fraction("volume")
    available = [s for s in cfg.sub_score_ids() if s != "insurability"]
    unnormalised = sum(
        full.subscores[s] * sub_weights[s] * 100.0 for s in available
    )
    assert np.all(partial.total > unnormalised)

    # The renormalised total puts the available sub-scores back on 0-100.
    expected = unnormalised / sum(sub_weights[s] for s in available)
    assert np.allclose(partial.total, expected)


def test_coverage_is_one_when_nothing_is_missing(cfg):
    fips, cols, pop = _synthetic(cfg)
    res = score_matrix(fips=fips, columns=cols, cfg=cfg, lens_id="volume", eligibility_pop=pop)
    assert np.allclose(res.coverage, 1.0)
    assert not np.any(res.partial)


def test_contributions_still_sum_with_missing_data(cfg):
    fips, cols, pop = _with_missing(cfg, drop_subscore="affordability")
    res = score_matrix(fips=fips, columns=cols, cfg=cfg, lens_id="volume", eligibility_pop=pop)
    total_from_contrib = np.sum(list(res.contributions.values()), axis=0)
    assert np.max(np.abs(total_from_contrib - res.total)) < 1e-9


def test_total_is_nan_when_no_subscore_is_available(cfg):
    fips, cols, pop = _synthetic(cfg)
    empty = {mid: np.full(len(fips), np.nan) for mid in cols}
    res = score_matrix(fips=fips, columns=empty, cfg=cfg, lens_id="volume", eligibility_pop=pop)
    assert np.all(np.isnan(res.total))
    assert np.all(res.coverage == 0.0)
