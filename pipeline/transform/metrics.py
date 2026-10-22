"""Derive the county metric matrix from fetched sources.

Every derived column maps to exactly one metric id in ``config/metrics.yaml``.
Intermediate ACS sums are aggregated as *numerators over denominators*: we never
average rates or medians (rule from ADR-003 / methodology).

Output: a wide frame keyed by ``fips`` with one column per scored + context
metric, plus ``*_imputed`` / ``*_low_confidence`` flags where relevant.
"""

from __future__ import annotations

import math

import numpy as np
import polars as pl
from scipy.optimize import least_squares

from pipeline.config import load_config
from pipeline.fetch import census_acs, popest
from pipeline.fetch.bea import fetch_bea
from pipeline.fetch.cbp import fetch_cbp
from pipeline.fetch.geography import fetch_geography
from pipeline.fetch.http import Manifest
from pipeline.fetch.irs_soi import fetch_irs
from pipeline.fetch.places import CHRONIC_MEASURES, RISK_MEASURES, fetch_places
from pipeline.transform import moe
from pipeline.transform.geography import (
    impute_ct_state_mean,
)
from pipeline.transform.shrink import empirical_bayes_shrink


def _acs_wide(manifest: Manifest) -> pl.DataFrame:
    return census_acs.fetch_acs_wide(manifest)


def _gazetteer(gazetteer_path) -> pl.DataFrame:
    """Land area (square miles) per county from the 2024 Gazetteer."""
    df = pl.read_csv(
        gazetteer_path, separator="\t", infer_schema_length=5000, encoding="utf8-lossy"
    )
    fips_col = next(c for c in df.columns if c.strip() == "GEOID")
    area_col = next(c for c in df.columns if c.strip() == "ALAND_SQMI")
    return df.select(
        fips=pl.col(fips_col).cast(pl.Utf8).str.strip_chars().str.zfill(5),
        land_sqmi=pl.col(area_col).cast(pl.Float64, strict=False),
    )


def _logit(p: float) -> float:
    return math.log(p / (1.0 - p))


def _income_band_ownership_rates(
    *,
    band_midpoints_k: list[float],
    band_shares: list[float],
    under_50k: float,
    at_150k_plus: float,
    asymptote: float,
    under_50k_max_k: float,
    at_150k_plus_min_k: float,
) -> list[float]:
    """Ownership rate for each of the 16 ACS 65+ income bands (low to high).

    The LIMRA 2026 Barometer publishes two *household-level* ownership anchors:
    29% of households under $50K and 64% of households at $150K+. Its 52%
    headline is a *person-level* figure (share of adults 18-75 who own a
    policy), a different weighting of the same survey, so it cannot be used to
    calibrate a household income curve and is not used here.

    We fit a logistic in log(income),
    ``r(m) = L / (1 + exp(-(log10(m) - c) / s))``,
    and solve for ``(c, s)`` so that the two published anchors are reproduced as
    group averages of the fitted curve when weighted by the national 65+
    household distribution. The curve is monotone in income by construction.

    These are national priors applied to local income distributions: modelled,
    never observed (see ``priors`` in config/metrics.yaml).
    """
    if not (0 < under_50k < asymptote and 0 < at_150k_plus < asymptote):
        raise ValueError("LIMRA anchors must lie inside (0, asymptote)")
    n = len(band_midpoints_k)
    if len(band_shares) != n:
        raise ValueError("band_shares and band_midpoints_k must have the same length")

    shares = np.asarray(band_shares, dtype=float)
    midpoints = np.asarray(band_midpoints_k, dtype=float)
    if not np.isfinite(shares).all() or shares.sum() <= 0:
        raise ValueError("band_shares must be finite and sum to a positive number")
    shares = shares / shares.sum()

    lo = np.flatnonzero(midpoints < under_50k_max_k)
    hi = np.flatnonzero(midpoints >= at_150k_plus_min_k)
    if lo.size == 0 or hi.size == 0:
        raise ValueError("could not split the income bands into the two anchored groups")

    x = np.log10(midpoints)
    z_lo, z_hi = _logit(under_50k / asymptote), _logit(at_150k_plus / asymptote)
    # Initial guess: place the logistic's two anchor points at the income
    # centroids of the two anchored groups.
    x_lo = float((shares[lo] * midpoints[lo]).sum() / shares[lo].sum())
    x_hi = float((shares[hi] * midpoints[hi]).sum() / shares[hi].sum())
    s0 = (math.log10(x_hi) - math.log10(x_lo)) / (z_hi - z_lo)
    c0 = math.log10(x_lo) - z_lo * s0

    def curve(params: np.ndarray) -> np.ndarray:
        c, s = params
        return asymptote / (1.0 + np.exp(-(x - c) / s))

    def residuals(params: np.ndarray) -> np.ndarray:
        rates = curve(params)
        return np.array(
            [
                (shares[lo] * rates[lo]).sum() / shares[lo].sum() - under_50k,
                (shares[hi] * rates[hi]).sum() / shares[hi].sum() - at_150k_plus,
            ]
        )

    solution = least_squares(residuals, x0=np.array([c0, s0]), xtol=1e-14, ftol=1e-14)
    rates = curve(solution.x)
    if float(np.max(np.abs(residuals(solution.x)))) > 1e-9:
        raise ValueError(
            f"ownership curve did not reproduce the LIMRA anchors: {residuals(solution.x)}"
        )
    if not np.all(np.diff(rates) > 0):
        raise ValueError("ownership curve is not monotone in income")
    return [round(float(r), 6) for r in rates]


def _zscore(column: str) -> pl.Expr:
    """Standardise a column across counties (mean 0, sample sd 1)."""
    return (pl.col(column) - pl.col(column).mean()) / pl.col(column).std()


def build_metric_matrix(manifest: Manifest, cfg=None) -> pl.DataFrame:
    """Fetch everything and return the assembled county metric matrix."""
    if cfg is None:
        cfg = load_config()
    pep = popest.fetch_popest(manifest)
    acs = _acs_wide(manifest)
    geo = fetch_geography(manifest)
    gaz = _gazetteer(geo["gazetteer"])
    irs = fetch_irs(manifest)
    cbp = fetch_cbp(manifest)
    places = fetch_places(manifest)
    bea = fetch_bea(manifest)

    df = pep.join(acs, on="fips", how="left").join(gaz, on="fips", how="left")

    # ---- Size -------------------------------------------------------------
    df = df.with_columns(share_60plus=pl.col("pop_60plus") / pl.col("total_pop"))

    # ---- Affordability ----------------------------------------------------
    b65 = pl.col("B19037_E053")
    hh_75k_plus = pl.sum_horizontal([pl.col(f"B19037_E{i:03d}") for i in range(65, 70)])
    owner_total = (
        pl.col("B25027_E008")
        + pl.col("B25027_E009")
        + pl.col("B25027_E016")
        + pl.col("B25027_E017")
    )
    owner_nomort = pl.col("B25027_E016") + pl.col("B25027_E017")
    owner_with_mort = pl.col("B25027_E008") + pl.col("B25027_E009")

    df = df.with_columns(
        income_65plus_median=pl.col("B19049_E005"),
        share_65_hh_75k=pl.when(b65 > 0).then(hh_75k_plus / b65).otherwise(None),
        home_equity_65=pl.when(owner_total > 0)
        .then((owner_nomort / owner_total) * pl.col("B25077_E001"))
        .otherwise(None),
    )
    # ---- Published margins of error for the ACS-derived metrics -----------
    # ACS publishes 90% MOEs for every estimate in the table-based Summary
    # File. They are propagated with the documented Census formulas, not by
    # naive addition (see pipeline/transform/moe.py). A metric with a null
    # MOE is one whose inputs were missing, which is different from a metric
    # with no published MOE: the latter falls back to a documented CV.
    hh_75k_moe = moe.moe_sum_expr([f"B19037_M{i:03d}" for i in range(65, 70)])
    owner_total_moe = moe.moe_sum_expr(
        ["B25027_M008", "B25027_M009", "B25027_M016", "B25027_M017"]
    )
    owner_nomort_moe = moe.moe_sum_expr(["B25027_M016", "B25027_M017"])
    owner_with_mort_moe = moe.moe_sum_expr(["B25027_M008", "B25027_M009"])
    p_owner_nomort = pl.when(owner_total > 0).then(owner_nomort / owner_total).otherwise(None)
    p_owner_mort = pl.when(owner_total > 0).then(owner_with_mort / owner_total).otherwise(None)
    p_75k = pl.when(b65 > 0).then(hh_75k_plus / b65).otherwise(None)
    p_spouse = (
        pl.when(pl.col("B09021_E022") > 0)
        .then(pl.col("B09021_E024") / pl.col("B09021_E022"))
        .otherwise(None)
    )
    p_internet = (
        pl.when(pl.col("B28005_E014") > 0)
        .then((pl.col("B28005_E016") + pl.col("B28005_E017")) / pl.col("B28005_E014"))
        .otherwise(None)
    )
    moe_owner_nomort_prop = moe.moe_proportion_expr(
        p_owner_nomort, owner_nomort_moe, owner_total, owner_total_moe
    )
    moe_owner_mort_prop = moe.moe_proportion_expr(
        p_owner_mort, owner_with_mort_moe, owner_total, owner_total_moe
    )

    df = df.with_columns(
        share_65_hh_75k_moe=moe.moe_proportion_expr(
            p_75k, hh_75k_moe, pl.col("B19037_E053"), pl.col("B19037_M053")
        ),
        home_equity_65_moe=moe.moe_product_expr(
            p_owner_nomort,
            moe_owner_nomort_prop,
            pl.col("B25077_E001"),
            pl.col("B25077_M001"),
        ),
        mortgage_share_65_owners_moe=moe_owner_mort_prop,
        spouse_share_65plus_moe=moe.moe_proportion_expr(
            p_spouse, pl.col("B09021_M024"), pl.col("B09021_E022"), pl.col("B09021_M022")
        ),
        internet_65plus_moe=moe.moe_proportion_expr(
            p_internet,
            moe.moe_sum_expr(["B28005_M016", "B28005_M017"]),
            pl.col("B28005_E014"),
            pl.col("B28005_M014"),
        ),
        income_65plus_median_moe=pl.col("B19049_M005"),
    )

    # ---- Need -------------------------------------------------------------
    df = df.join(irs, on="fips", how="left")
    df = df.with_columns(
        spouse_share_65plus=pl.when(pl.col("B09021_E022") > 0)
        .then(pl.col("B09021_E024") / pl.col("B09021_E022"))
        .otherwise(None),
        mortgage_share_65_owners=pl.when(owner_total > 0)
        .then(owner_with_mort / owner_total)
        .otherwise(None),
    )

    # ---- Reachability -----------------------------------------------------
    # "With an internet subscription" = dial-up alone + broadband (B28005_016
    # and _017 for the 65+ block).
    df = df.with_columns(
        internet_65plus=pl.when(pl.col("B28005_E014") > 0)
        .then(
            (pl.col("B28005_E016") + pl.col("B28005_E017")) / pl.col("B28005_E014"),
        )
        .otherwise(None),
        density_60plus=pl.when(pl.col("land_sqmi") > 0)
        .then(pl.col("pop_60plus") / pl.col("land_sqmi"))
        .otherwise(None),
    )

    # ---- Whitespace -------------------------------------------------------
    df = df.join(cbp, on="fips", how="left").with_columns(
        agencies_per_1000_60plus=pl.when(pl.col("pop_60plus") > 0)
        .then(pl.col("estabs").fill_null(0) / pl.col("pop_60plus") * 1000.0)
        .otherwise(None),
    )

    # ---- Insurability (PLACES crude prevalence composites) ----------------
    # Each composite is the mean of per-measure z-scores across counties, so a
    # high-prevalence measure (BPHIGH) does not outweigh a low-prevalence one
    # (CANCER) purely because of its scale. A county missing any constituent
    # measure gets no composite at all rather than a partial one.
    df = df.join(places, on="fips", how="left")
    chronic_cols = [m.lower() for m in CHRONIC_MEASURES]
    risk_cols = [m.lower() for m in RISK_MEASURES]
    df = df.with_columns(
        _chronic_z=pl.mean_horizontal([_zscore(c) for c in chronic_cols], ignore_nulls=False),
        _risk_z=pl.mean_horizontal([_zscore(c) for c in risk_cols], ignore_nulls=False),
    )
    df = df.with_columns(
        chronic_burden_composite=pl.col("_chronic_z"),
        risk_behaviour_composite=pl.col("_risk_z"),
    )

    # ---- BEA wealth proxy (per capita) -----------------------------------
    df = df.join(bea, on="fips", how="left").with_columns(
        bea_dir_per_capita=pl.when(pl.col("total_pop") > 0)
        .then(pl.col("dir_total") / pl.col("total_pop"))
        .otherwise(None),
    )
    # The scored metric is the same per-capita series under its catalogue id.
    df = df.with_columns(non_earned_income_per_capita=pl.col("bea_dir_per_capita"))

    # ---- IRS CT reconciliation -------------------------------------------
    df = impute_ct_state_mean(
        df, "inv_ret_income_per_return", out_col="irs_investment_income_per_return"
    )

    # ---- Empirical-Bayes shrinkage for noisy small-county rates -----------
    # Agency density and the PLACES composites are unstable in tiny counties;
    # shrink toward the state mean, weighed by the 60+ denominator.
    df = df.with_columns(state=pl.col("fips").str.slice(0, 2))
    df = empirical_bayes_shrink(
        df,
        value_col="agencies_per_1000_60plus",
        denom_col="pop_60plus",
        out_col="agencies_per_1000_60plus",
        flag_col="shrunk_agencies",
    )
    df = empirical_bayes_shrink(
        df,
        value_col="chronic_burden_composite",
        denom_col="B01001_E031" if "B01001_E031" in df.columns else "pop_60plus",
        out_col="chronic_burden_composite",
        flag_col="shrunk_chronic",
    )
    df = empirical_bayes_shrink(
        df,
        value_col="risk_behaviour_composite",
        denom_col="B01001_E031" if "B01001_E031" in df.columns else "pop_60plus",
        out_col="risk_behaviour_composite",
        flag_col="shrunk_risk",
    )

    # ---- Synthetic priors (modelled, never scored) ------------------------
    limra = cfg.priors["limra_barometer_2026"]
    curve = limra["curve"]
    rates = _income_band_ownership_rates(
        band_midpoints_k=[float(v) for v in curve["band_midpoints_k"]],
        band_shares=[float(v) for v in curve["national_band_shares"]],
        under_50k=float(limra["under_50k"]),
        at_150k_plus=float(limra["at_150k_plus"]),
        asymptote=float(curve["asymptote"]),
        under_50k_max_k=float(curve["under_50k_max_k"]),
        at_150k_plus_min_k=float(curve["at_150k_plus_min_k"]),
    )
    band_exprs = [pl.col(f"B19037_E{i:03d}") for i in range(54, 70)]
    total_65_hh = pl.col("B19037_E053")
    ownership_numerator = pl.sum_horizontal(
        [expr * r for expr, r in zip(band_exprs, rates, strict=True)]
    )
    df = df.with_columns(
        expected_ownership_65=pl.when(total_65_hh > 0)
        .then(ownership_numerator / total_65_hh)
        .otherwise(None),
    )
    df = df.with_columns(
        coverage_gap_households_60=total_65_hh * (1 - pl.col("expected_ownership_65")),
        # Context only: self-reported poor physical or mental health, 18+.
        # PLACES publishes prevalence in percent; the metric is stored as a
        # fraction like every other share in the catalogue.
        area_health_context=pl.mean_horizontal(
            [pl.col("mhlth"), pl.col("phlth")], ignore_nulls=False
        )
        / 100.0,
    )

    return df


def scored_columns(cfg) -> list[str]:
    return [m.id for m in cfg.scored_metrics]
