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
"""

from __future__ import annotations

import math

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
