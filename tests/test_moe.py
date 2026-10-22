"""Unit tests for the Census MOE arithmetic (documented formulas)."""

import math

import polars as pl

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


def test_moe_product_matches_the_reference_formula():
    got = moe.moe_product(3.0, 0.5, 10.0, 2.0)
    expected = math.sqrt((3.0 * 2.0) ** 2 + (10.0 * 0.5) ** 2)
    assert math.isclose(got, expected, rel_tol=1e-12)


def test_expr_forms_agree_with_the_reference_implementation():
    df = pl.DataFrame(
        {
            "num": [10.0, 20.0],
            "num_moe": [2.0, 3.0],
            "den": [100.0, 200.0],
            "den_moe": [5.0, 6.0],
        }
    )
    out = df.with_columns(
        p=pl.col("num") / pl.col("den"),
        p_moe=moe.moe_proportion_expr(
            pl.col("num") / pl.col("den"),
            pl.col("num_moe"),
            pl.col("den"),
            pl.col("den_moe"),
        ),
    )
    for i in range(df.height):
        expected = moe.moe_proportion(
            float(out["p"][i]),
            float(out["num_moe"][i]),
            float(out["den"][i]),
            float(out["den_moe"][i]),
        )
        assert math.isclose(float(out["p_moe"][i]), expected, rel_tol=1e-12)


def test_sum_expr_is_null_when_an_input_is_missing():
    df = pl.DataFrame({"a": [3.0, None], "b": [4.0, 4.0]})
    out = df.with_columns(total=moe.moe_sum_expr(["a", "b"]))
    assert out["total"][0] == 5.0
    assert out["total"][1] is None


def test_proportion_expr_falls_back_to_the_ratio_form():
    # A denominator MOE that large makes the proportion radicand negative.
    df = pl.DataFrame({"p": [0.9], "n": [1.0], "d": [100.0], "dm": [50.0]})
    out = df.with_columns(
        p_moe=moe.moe_proportion_expr(
            pl.col("p"), pl.col("n"), pl.col("d"), pl.col("dm")
        )
    )
    expected = math.sqrt(1.0**2 + 0.9**2 * 50.0**2) / 100.0
    assert math.isclose(float(out["p_moe"][0]), expected, rel_tol=1e-12)
