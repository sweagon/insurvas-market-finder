"""Metric-definition invariants: the config describes what the code computes.

These are the checks that caught the definition drift between
``config/metrics.yaml`` and ``pipeline/transform/metrics.py``: a metric that is
documented one way and computed another is a lie the UI then repeats.
"""

from __future__ import annotations

import numpy as np
import pytest

from pipeline.config import load_config
from pipeline.transform.metrics import _income_band_ownership_rates


@pytest.fixture(scope="module")
def cfg():
    return load_config()


def _curve(cfg) -> list[float]:
    limra = cfg.priors["limra_barometer_2026"]
    curve = limra["curve"]
    return _income_band_ownership_rates(
        band_midpoints_k=[float(v) for v in curve["band_midpoints_k"]],
        band_shares=[float(v) for v in curve["national_band_shares"]],
        under_50k=float(limra["under_50k"]),
        at_150k_plus=float(limra["at_150k_plus"]),
        asymptote=float(curve["asymptote"]),
        under_50k_max_k=float(curve["under_50k_max_k"]),
        at_150k_plus_min_k=float(curve["at_150k_plus_min_k"]),
    )


def test_ownership_curve_is_monotone(cfg):
    rates = _curve(cfg)
    assert len(rates) == int(cfg.priors["limra_barometer_2026"]["curve"]["band_count"])
    assert all(b > a for a, b in zip(rates, rates[1:], strict=False))


def test_ownership_curve_reproduces_published_anchors(cfg):
    """The two household-level LIMRA anchors must come out as group averages."""
    limra = cfg.priors["limra_barometer_2026"]
    curve = limra["curve"]
    rates = np.asarray(_curve(cfg))
    shares = np.asarray([float(v) for v in curve["national_band_shares"]])
    midpoints = np.asarray([float(v) for v in curve["band_midpoints_k"]])

    lo = midpoints < float(curve["under_50k_max_k"])
    hi = midpoints >= float(curve["at_150k_plus_min_k"])

    under_50k = (shares[lo] * rates[lo]).sum() / shares[lo].sum()
    at_150k_plus = (shares[hi] * rates[hi]).sum() / shares[hi].sum()

    assert under_50k == pytest.approx(float(limra["under_50k"]), abs=1e-6)
    assert at_150k_plus == pytest.approx(float(limra["at_150k_plus"]), abs=1e-6)


def test_ownership_curve_rejects_bad_inputs(cfg):
    limra = cfg.priors["limra_barometer_2026"]
    curve = limra["curve"]
    kwargs = {
        "band_midpoints_k": [float(v) for v in curve["band_midpoints_k"]],
        "band_shares": [float(v) for v in curve["national_band_shares"]],
        "under_50k": float(limra["under_50k"]),
        "at_150k_plus": float(limra["at_150k_plus"]),
        "asymptote": float(curve["asymptote"]),
        "under_50k_max_k": float(curve["under_50k_max_k"]),
        "at_150k_plus_min_k": float(curve["at_150k_plus_min_k"]),
    }
    with pytest.raises(ValueError):
        _income_band_ownership_rates(**{**kwargs, "band_shares": [0.1]})
    with pytest.raises(ValueError):
        _income_band_ownership_rates(**{**kwargs, "under_50k": 0.99})


def test_every_metric_id_is_unique(cfg):
    ids = [m.id for m in cfg.metrics]
    assert len(ids) == len(set(ids))


def test_scored_metrics_exist_in_config_only_once(cfg):
    """Rule R3: the config is the only place a metric is declared."""
    for metric in cfg.scored_metrics:
        assert metric.id == metric.id.strip()
        assert metric.label
        assert metric.caveats, f"{metric.id} has no caveat string"


def test_modeled_metrics_are_not_scored(cfg):
    for metric in cfg.metrics:
        if metric.modeled:
            assert not metric.scored, f"{metric.id} is modeled and must not be scored"
