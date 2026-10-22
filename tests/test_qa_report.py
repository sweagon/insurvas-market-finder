"""The QA report is a gate, not a document.

A check that only warns is a check that will be ignored. These tests pin the
behaviour of each gate: a metric below its coverage floor must fail, a value
outside its unit must fail, and a lens whose weights do not add up must fail.
"""

from __future__ import annotations

import polars as pl
import pytest

from pipeline.config import load_config
from pipeline.qa.report import _find_forbidden, _out_of_range, _weight_problems


@pytest.fixture(scope="module")
def cfg():
    return load_config()


def test_shipped_config_has_no_weight_problems(cfg) -> None:
    assert _weight_problems(cfg) == []


def test_weight_problem_is_detected(cfg) -> None:
    target = next(m for m in cfg.metrics if m.subscore == "size")
    broken_target = target.model_copy(
        update={"lens_weights": {**target.lens_weights, "volume": 0.9}}
    )
    metrics = tuple(broken_target if m.id == target.id else m for m in cfg.metrics)
    problems = _weight_problems(cfg.model_copy(update={"metrics": metrics}))
    assert problems
    assert "size" in problems[0]


def _all_metrics_frame(cfg, value: float = 0.5) -> pl.DataFrame:
    """A frame with every catalogued metric, so the check is not confused by
    metrics that are simply absent."""
    return pl.DataFrame({m.id: [value] for m in cfg.metrics})


def test_shipped_metrics_stay_inside_their_unit_bounds(cfg) -> None:
    assert _out_of_range(cfg, _all_metrics_frame(cfg)) == []


def test_share_above_one_is_a_problem(cfg) -> None:
    first = next(m for m in cfg.metrics if m.unit == "share")
    df = _all_metrics_frame(cfg).with_columns(pl.lit(1.5).alias(first.id))
    problems = _out_of_range(cfg, df)
    assert any(p[0] == first.id for p in problems)


def test_negative_index_is_allowed(cfg) -> None:
    """A z-score index and a growth rate can be negative; that is not a bug."""
    df = _all_metrics_frame(cfg)
    for m in cfg.metrics:
        if m.unit in {"index", "growth_rate"}:
            df = df.with_columns(pl.lit(-2.0).alias(m.id))
    assert _out_of_range(cfg, df) == []


def test_a_metric_missing_from_the_matrix_is_a_problem(cfg) -> None:
    df = _all_metrics_frame(cfg).drop(next(m.id for m in cfg.metrics))
    problems = _out_of_range(cfg, df)
    assert any(p[1] == "missing from the metric matrix" for p in problems)


def test_coverage_floor_prefers_the_metric_override(cfg) -> None:
    assert cfg.coverage_floor(cfg.metrics[0]) == pytest.approx(cfg.params.min_metric_coverage)
    places = next(m for m in cfg.metrics if m.source == "places")
    assert places.min_coverage is not None
    assert cfg.coverage_floor(places) == places.min_coverage


def test_r7_audit_finds_nothing_in_the_metric_matrix(cfg) -> None:
    assert _find_forbidden([m.id for m in cfg.metrics]) == []
    assert _find_forbidden(["share_by_race", "disability_rate"]) != []
