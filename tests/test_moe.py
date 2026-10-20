"""Unit tests for the Census MOE arithmetic (documented formulas)."""

import math

from pipeline.transform import moe


def test_moe_sum_of_two():
    assert math.isclose(moe.moe_sum([3.0, 4.0]), 5.0)


def test_moe_sum_ignores_none():
    assert math.isclose(moe.moe_sum([3.0, None, 4.0]), 5.0)


def test_moe_sum_empty_is_none():
    assert moe.moe_sum([None, None]) is None


def test_moe_proportion_falls_back_when_radicand_negative():
    # Large denominator MOE relative to numerator forces the fallback path.
    val = moe.moe_proportion(
        estimate=0.9, numerator_moe=1.0, denominator=100.0, denominator_moe=50.0
    )
    assert val is not None and val >= 0


def test_moe_proportion_basic():
    val = moe.moe_proportion(
        estimate=0.5, numerator_moe=10.0, denominator=200.0, denominator_moe=10.0
    )
    assert val is not None
    expected = math.sqrt(10**2 - 0.5**2 * 10**2) / 200
    assert math.isclose(val, expected, rel_tol=1e-12)


def test_moe_ratio_basic():
    val = moe.moe_ratio(ratio=2.0, numerator_moe=3.0, denominator=100.0, denominator_moe=4.0)
    assert val is not None
    expected = math.sqrt(3**2 + 2**2 * 4**2) / 100
    assert math.isclose(val, expected, rel_tol=1e-12)


def test_moe_to_se():
    assert math.isclose(moe.moe_to_se(1.6448536269514722), 1.0, rel_tol=1e-9)
    assert moe.moe_to_se(None) is None
