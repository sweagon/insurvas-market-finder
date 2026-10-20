"""Empirical-Bayes shrinkage for noisy small-county rates.

Small counties produce unstable rates (e.g. one agency in a 900-person county).
We shrink each county's rate toward its state mean, with weight determined by
the county's denominator. This is a deliberate, flagged transform: shrunk cells
carry a ``shrunk`` flag and the QA report counts them.
"""

from __future__ import annotations

import polars as pl


def empirical_bayes_shrink(
    df: pl.DataFrame,
    *,
    value_col: str,
    denom_col: str,
    group_col: str = "state",
    out_col: str | None = None,
    flag_col: str | None = None,
    min_denom: float = 500.0,
) -> pl.DataFrame:
    """Shrink ``value_col`` toward the group mean using a simple EB weight.

    Weight w = n / (n + k) where n is the local denominator and k is the median
    denominator in the group. Counties with n >= min_denom are left untouched to
    avoid over-smoothing large, reliable geographies.
    """
    out_col = out_col or f"{value_col}_shrunk"
    flag_col = flag_col or f"shrunk_{value_col}"

    group_stats = df.group_by(group_col).agg(
        group_mean=pl.col(value_col).mean(),
        k=pl.col(denom_col).median().fill_null(0.0),
    )
    joined = df.join(group_stats, on=group_col, how="left").with_columns(
        _w=pl.when(pl.col(denom_col) > 0)
        .then(pl.col(denom_col) / (pl.col(denom_col) + pl.col("k")))
        .otherwise(pl.lit(0.0)),
    )
    shrunk = pl.col("_w") * pl.col(value_col).fill_null(pl.col("group_mean")) + (
        1 - pl.col("_w")
    ) * pl.col("group_mean")
    joined = joined.with_columns(
        pl.when(pl.col(value_col).is_null() | (pl.col(denom_col) < min_denom))
        .then(shrunk)
        .otherwise(pl.col(value_col))
        .alias(out_col),
        (pl.col(value_col).is_null() | (pl.col(denom_col) < min_denom)).alias(flag_col),
    )
    return joined.drop("group_mean", "k", "_w")
