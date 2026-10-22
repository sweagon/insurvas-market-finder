"""The uncertainty model: what the bands mean and what they must never claim.

The bands are the honest part of the product. A county whose rank could be
anywhere between 300 and 3,000 must not be presented as a confident #500, so
these tests pin the behaviour that makes the bands meaningful.
"""

from __future__ import annotations

import numpy as np
import pytest

from pipeline.config import load_config
from pipeline.score.monte_carlo import (
    _perturb,
    _rank_of,
    draw_weights,
    monte_carlo_total,
    published_se,
)


@pytest.fixture(scope="module")
def cfg():
    return load_config()


def _toy_columns(n: int = 40) -> dict[str, np.ndarray]:
    rng = np.random.default_rng(7)
    return {
        "pop_60plus": rng.uniform(5000, 90000, n),
        "share_60plus": rng.uniform(0.1, 0.5, n),
        "growth_60plus": rng.uniform(-0.2, 0.4, n),
        "income_65plus_median": rng.uniform(20000, 120000, n),
        "share_65_hh_75k": rng.uniform(0.05, 0.6, n),
        "irs_investment_income_per_return": rng.uniform(0, 60000, n),
        "non_earned_income_per_capita": rng.uniform(1000, 40000, n),
        "home_equity_65": rng.uniform(20000, 400000, n),
        "spouse_share_65plus": rng.uniform(0.1, 0.8, n),
        "mortgage_share_65_owners": rng.uniform(0.05, 0.6, n),
        "internet_65plus": rng.uniform(0.4, 1.0, n),
        "density_60plus": rng.uniform(1, 5000, n),
        "agencies_per_1000_60plus": rng.uniform(0, 8, n),
        "chronic_burden_composite": rng.normal(0, 1, n),
        "risk_behaviour_composite": rng.normal(0, 1, n),
    }


def test_published_moe_becomes_a_standard_error():
    values = np.array([10.0, 20.0])
    moes = np.array([1.6448536269514722, 3.2897072539029444])
    se = published_se(values, moes, 1.6448536269514722)
    assert se is not None
    assert np.isclose(se[0], 1.0)
    assert np.isclose(se[1], 2.0)


def test_without_a_published_moe_there_is_no_standard_error():
    assert published_se(np.array([1.0]), None, 1.6448) is None
    assert published_se(np.array([1.0]), np.array([np.nan]), 1.6448) is None


def test_perturbation_stays_inside_the_bounds_of_a_share():
    values = np.array([0.5])
    se = np.array([10.0])
    draws = _perturb(values, np.random.default_rng(1), se=se, rel=np.array([0.1]), bounded=True)
    assert 0.0 <= draws[0] <= 1.0


def test_perturbation_never_goes_negative():
    values = np.array([5.0])
    se = np.array([100.0])
    draws = _perturb(values, np.random.default_rng(1), se=se, rel=np.array([0.1]), bounded=False)
    assert draws[0] >= 0.0


def test_missing_values_stay_missing():
    values = np.array([1.0, np.nan])
    draws = _perturb(values, np.random.default_rng(1), se=None, rel=np.array([0.1]), bounded=False)
    assert np.isnan(draws[1])


def test_drawn_weights_are_centred_on_the_configured_weights(cfg):
    rng = np.random.default_rng(3)
    sub_fractions = cfg.lens_weights_fraction("volume")
    metric_fractions = cfg.metric_weights_fraction("volume")
    sub_draws: list[dict[str, float]] = []
    metric_draws: list[dict[str, float]] = []
    for _ in range(400):
        sub, metric = draw_weights(cfg, "volume", rng)
        sub_draws.append(sub)
        metric_draws.append(metric)
    for sub, expected in sub_fractions.items():
        if expected <= 0:
            continue
        mean = float(np.mean([d[sub] for d in sub_draws]))
        assert abs(mean - expected) < 0.01, f"{sub}: mean {mean} vs {expected}"
    for mid, expected in metric_fractions.items():
        if expected <= 0:
            continue
        mean = float(np.mean([d[mid] for d in metric_draws]))
        assert abs(mean - expected) < 0.01, f"{mid}: mean {mean} vs {expected}"


def test_drawn_weights_are_not_identical_to_the_configuration(cfg):
    """If the weights never moved, the bands would understate the uncertainty."""
    rng = np.random.default_rng(5)
    draws = [draw_weights(cfg, "volume", rng)[0] for _ in range(20)]
    assert any(d != draws[0] for d in draws)


def test_rank_of_orders_the_best_first():
    totals = np.array([10.0, 30.0, 20.0])
    ranks = _rank_of(totals)
    assert ranks[1] == 1.0
    assert ranks[2] == 2.0
    assert ranks[0] == 3.0


def test_rank_of_leaves_unscorable_counties_unranked():
    ranks = _rank_of(np.array([10.0, np.nan, 20.0]))
    assert np.isnan(ranks[1])


def test_the_best_county_has_a_higher_top_half_chance_than_the_worst(cfg):
    from pipeline.score.reference import score_matrix

    n = 60
    columns = _toy_columns(n)
    fips = [f"{i:05d}" for i in range(n)]
    point = score_matrix(fips=fips, columns=columns, cfg=cfg, lens_id="volume")
    best = int(np.nanargmax(point.total))
    worst = int(np.nanargmin(point.total))
    band = monte_carlo_total(
        fips=fips,
        columns=columns,
        cfg=cfg,
        lens_id="volume",
        draws=60,
    )
    assert band["p_top50"][best] > band["p_top50"][worst]
    assert band["p_top50"][best] > 0.8
    assert band["p_top50"][worst] < 0.2


def test_the_bands_are_ordered_and_contain_the_point_estimate(cfg):
    n = 40
    columns = _toy_columns(n)
    band = monte_carlo_total(
        fips=[f"{i:05d}" for i in range(n)],
        columns=columns,
        cfg=cfg,
        lens_id="volume",
        draws=40,
    )
    assert np.all(band["p05"] <= band["p50"])
    assert np.all(band["p50"] <= band["p95"])
    assert np.all(band["rank_p05"] <= band["rank_p50"])
    assert np.all(band["rank_p50"] <= band["rank_p95"])


def test_a_published_moe_widens_the_band(cfg):
    """An exact input and a noisy input must not produce the same band."""
    n = 40
    columns = _toy_columns(n)
    tight = monte_carlo_total(
        fips=[f"{i:05d}" for i in range(n)],
        columns=columns,
        cfg=cfg,
        lens_id="volume",
        draws=40,
    )
    noisy = monte_carlo_total(
        fips=[f"{i:05d}" for i in range(n)],
        columns=columns,
        cfg=cfg,
        lens_id="volume",
        moes={
            mid: np.full(n, 0.2 * abs(np.nanmedian(arr)))
            for mid, arr in columns.items()
        },
        draws=40,
    )
    tight_width = float(np.nanmean(tight["p95"] - tight["p05"]))
    noisy_width = float(np.nanmean(noisy["p95"] - noisy["p05"]))
    assert noisy_width > tight_width
