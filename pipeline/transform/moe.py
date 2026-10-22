"""Census margin-of-error arithmetic.

ACS MOEs are published at 90% confidence, so a standard error is
``MOE / 1.645``. Aggregating ACS cells requires the documented formulas, not
naive addition (this is one of the classic traps; ADR-003 / methodology).

Formulas implemented (Census "Understanding and Using ACS Data"):
  * sum of two estimates:      MOE = sqrt(MOE1^2 + MOE2^2)
  * proportion P = X / Y:      MOE = sqrt(MOE_X^2 - P^2 * MOE_Y^2) / Y
                               falling back to the ratio formula when the
                               radicand is negative
  * ratio R = X / Y:           MOE = sqrt(MOE_X^2 + R^2 * MOE_Y^2) / Y
  * derived median difference: MOE = sqrt(MOE1^2 + MOE2^2)
  * product A * B:             MOE = sqrt((A * MOE_B)^2 + (B * MOE_A)^2)

The pure-Python functions below are the reference implementation. The
``*_expr`` functions are the vectorised equivalents used in the pipeline, and
they propagate a null as soon as any input is missing.
"""

from __future__ import annotations

import math

import polars as pl

Z90 = 1.6448536269514722  # 90% two-sided z


def moe_sum(moes: list[float | None]) -> float | None:
    """MOE of a sum of independent estimates."""
    vals = [m for m in moes if m is not None and not math.isnan(m)]
    if not vals:
        return None
    return math.sqrt(sum(m * m for m in vals))


def moe_proportion(
    estimate: float | None,
    numerator_moe: float | None,
    denominator: float | None,
    denominator_moe: float | None,
) -> float | None:
    """MOE of a proportion X/Y, with the documented ratio fallback."""
    if estimate is None or numerator_moe is None or denominator is None or denominator_moe is None:
        return None
    if denominator == 0:
        return None
    radicand = numerator_moe**2 - (estimate**2) * (denominator_moe**2)
    if radicand >= 0:
        return math.sqrt(radicand) / denominator
    # Fallback: ratio formula (when the proportion formula goes negative).
    return moe_ratio(estimate, numerator_moe, denominator, denominator_moe)


def moe_ratio(
    ratio: float | None,
    numerator_moe: float | None,
    denominator: float | None,
    denominator_moe: float | None,
) -> float | None:
    """MOE of a ratio X/Y."""
    if ratio is None or numerator_moe is None or denominator is None or denominator_moe is None:
        return None
    if denominator == 0:
        return None
    return math.sqrt(numerator_moe**2 + (ratio**2) * (denominator_moe**2)) / denominator


def moe_to_se(moe: float | None) -> float | None:
    """Convert a 90% MOE to a standard error."""
    if moe is None:
        return None
    return moe / Z90


def moe_product(
    a: float | None, moe_a: float | None, b: float | None, moe_b: float | None
) -> float | None:
    """MOE of the product of two independent estimates."""
    if a is None or moe_a is None or b is None or moe_b is None:
        return None
    return math.sqrt((a * moe_b) ** 2 + (b * moe_a) ** 2)


# ---------------------------------------------------------------------------
# Vectorised forms, used by the pipeline.
# ---------------------------------------------------------------------------


def _all_present(cols: list[str]) -> pl.Expr:
    return pl.all_horizontal([pl.col(c).is_not_null() for c in cols]) if cols else pl.lit(True)


def moe_sum_expr(cols: list[str]) -> pl.Expr:
    """MOE of a sum of independent estimates, as a polars expression."""
    total = pl.sum_horizontal([pl.col(c) ** 2 for c in cols])
    return pl.when(_all_present(cols)).then(total.sqrt()).otherwise(None)


def moe_proportion_expr(
    estimate: pl.Expr,
    numerator_moe: pl.Expr,
    denominator: pl.Expr,
    denominator_moe: pl.Expr,
) -> pl.Expr:
    """MOE of a proportion X/Y, with the documented ratio fallback."""
    radicand = numerator_moe**2 - estimate**2 * denominator_moe**2
    proportion_form = radicand.clip(lower_bound=0.0).sqrt() / denominator
    ratio_form = (numerator_moe**2 + estimate**2 * denominator_moe**2).sqrt() / denominator
    return pl.when(radicand >= 0).then(proportion_form).otherwise(ratio_form)


def moe_product_expr(
    a: pl.Expr, moe_a: pl.Expr, b: pl.Expr, moe_b: pl.Expr
) -> pl.Expr:
    """MOE of the product of two independent estimates."""
    return ((a * moe_b) ** 2 + (b * moe_a) ** 2).sqrt()

