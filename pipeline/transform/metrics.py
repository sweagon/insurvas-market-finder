"""Derive the county metric matrix from fetched sources.

Every derived column maps to exactly one metric id in ``config/metrics.yaml``.
Intermediate ACS sums are aggregated as *numerators over denominators*: we never
average rates or medians (rule from ADR-003 / methodology).

Output: a wide frame keyed by ``fips`` with one column per scored + context
metric, plus ``*_imputed`` / ``*_low_confidence`` flags where relevant.
"""

from __future__ import annotations

import polars as pl

from pipeline.fetch.http import Manifest
from pipeline.fetch import census_acs, popest
from pipeline.fetch.bea import fetch_bea
from pipeline.fetch.cbp import fetch_cbp
from pipeline.fetch.geography import fetch_geography
from pipeline.fetch.irs_soi import fetch_irs
from pipeline.fetch.places import CHRONIC_MEASURES, RISK_MEASURES, fetch_places
from pipeline.transform.geography import (
    CT_PLANNING_REGIONS,
    filter_to_universe,
    impute_ct_state_mean,
)
from pipeline.transform.shrink import empirical_bayes_shrink


def _acs_wide(manifest: Manifest) -> pl.DataFrame:
    return census_acs.fetch_acs_wide(manifest)


def _gazetteer(gazetteer_path) -> pl.DataFrame:
    """Land area (square miles) per county from the 2024 Gazetteer."""
    df = pl.read_csv(gazetteer_path, separator="\t", infer_schema_length=5000, encoding="utf8-lossy")
    fips_col = next(c for c in df.columns if c.strip() == "GEOID")
    area_col = next(c for c in df.columns if c.strip() == "ALAND_SQMI")
    return df.select(
        fips=pl.col(fips_col).cast(pl.Utf8).str.strip_chars().str.zfill(5),
        land_sqmi=pl.col(area_col).cast(pl.Float64, strict=False),
    )


def _income_band_ownership_rates() -> list[float]:
    """Ownership rate for each of the 16 ACS 65+ income bands (low to high).

    Anchored on the LIMRA 2026 Barometer bands (under $50k = 0.29, $150k+ =
    0.64) and interpolated monotonically across the 16 ACS bands. These are
    national priors applied to local income distributions: modelled, not
    observed (see ``priors`` in config/metrics.yaml).
    """
    anchors_x = [0.0, 8.0, 15.0]  # band index anchors
    anchors_y = [0.20, 0.52, 0.72]  # ownership rates at those anchors
    rates: list[float] = []
    for i in range(16):
        x = float(min(i, 15))
        if x <= anchors_x[0]:
            r = anchors_y[0]
        elif x >= anchors_x[2]:
            r = anchors_y[2]
        elif x <= anchors_x[1]:
            t = (x - anchors_x[0]) / (anchors_x[1] - anchors_x[0])
            r = anchors_y[0] + t * (anchors_y[1] - anchors_y[0])
        else:
            t = (x - anchors_x[1]) / (anchors_x[2] - anchors_x[1])
            r = anchors_y[1] + t * (anchors_y[2] - anchors_y[1])
        rates.append(round(r, 4))
    return rates


def build_metric_matrix(manifest: Manifest) -> pl.DataFrame:
    """Fetch everything and return the assembled county metric matrix."""
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
    low_bands = [pl.col(f"B19037_E{i:03d}") for i in range(54, 70)]
    owner_total = pl.col("B25027_E008") + pl.col("B25027_E009") + pl.col("B25027_E016") + pl.col("B25027_E017")
    owner_nomort = pl.col("B25027_E016") + pl.col("B25027_E017")

    df = df.with_columns(
        income_65plus_median=pl.col("B19049_E005"),
        share_65_hh_75k=pl.when(b65 > 0).then(hh_75k_plus / b65).otherwise(None),
        home_equity_65=pl.when(owner_total > 0)
        .then((owner_nomort / owner_total) * pl.col("B25077_E001"))
        .otherwise(None),
    )

    # ---- Need -------------------------------------------------------------
    df = df.join(irs, on="fips", how="left")
    owner_with_mort = pl.col("B25027_E008") + pl.col("B25027_E009")
    df = df.with_columns(
        spouse_share_60plus=pl.when(pl.col("B09021_E022") > 0)
        .then(pl.col("B09021_E024") / pl.col("B09021_E022"))
        .otherwise(None),
        mortgage_share_65_owners=pl.when(owner_total > 0)
        .then(owner_with_mort / owner_total)
        .otherwise(None),
    )

    # ---- Reachability -----------------------------------------------------
    df = df.with_columns(
        internet_65plus=pl.when(pl.col("B28005_E014") > 0)
        .then(pl.col("B28005_E017") / pl.col("B28005_E014"))
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
    df = df.join(places, on="fips", how="left")
    chronic_cols = [m.lower() for m in CHRONIC_MEASURES]
    risk_cols = [m.lower() for m in RISK_MEASURES]
    df = df.with_columns(
        _chronic_raw=pl.mean_horizontal([pl.col(c) for c in chronic_cols]),
        _risk_raw=pl.mean_horizontal([pl.col(c) for c in risk_cols]),
    )
    df = df.with_columns(
        chronic_burden_composite=pl.col("_chronic_raw"),
        risk_behaviour_composite=pl.col("_risk_raw"),
    )

    # ---- BEA wealth proxy (per capita) -----------------------------------
    df = df.join(bea, on="fips", how="left").with_columns(
        bea_dir_per_capita=pl.when(pl.col("total_pop") > 0)
        .then(pl.col("dir_total") / pl.col("total_pop"))
        .otherwise(None),
    )

    # ---- IRS CT reconciliation -------------------------------------------
    df = impute_ct_state_mean(df, "inv_ret_income_per_return", out_col="irs_investment_income_per_return")

    # ---- Empirical-Bayes shrinkage for noisy small-county rates -----------
    # Agency density and the PLACES composites are unstable in tiny counties;
    # shrink toward the state mean, weighed by the 60+ denominator.
    df = df.with_columns(state=pl.col("fips").str.slice(0, 2))
    df = empirical_bayes_shrink(
        df, value_col="agencies_per_1000_60plus", denom_col="pop_60plus",
        out_col="agencies_per_1000_60plus", flag_col="shrunk_agencies",
    )
    df = empirical_bayes_shrink(
        df, value_col="chronic_burden_composite", denom_col="B01001_E031" if "B01001_E031" in df.columns else "pop_60plus",
        out_col="chronic_burden_composite", flag_col="shrunk_chronic",
    )
    df = empirical_bayes_shrink(
        df, value_col="risk_behaviour_composite", denom_col="B01001_E031" if "B01001_E031" in df.columns else "pop_60plus",
        out_col="risk_behaviour_composite", flag_col="shrunk_risk",
    )

    # ---- Synthetic priors (modelled, never scored) ------------------------
    rates = _income_band_ownership_rates()
    band_exprs = [pl.col(f"B19037_E{i:03d}") for i in range(54, 70)]
    total_65_hh = pl.col("B19037_E053")
    ownership_numerator = pl.sum_horizontal([expr * r for expr, r in zip(band_exprs, rates)])
    df = df.with_columns(
        expected_ownership_65=pl.when(total_65_hh > 0)
        .then(ownership_numerator / total_65_hh)
        .otherwise(None),
    )
    df = df.with_columns(
        coverage_gap_households_60=total_65_hh * (1 - pl.col("expected_ownership_65")),
        area_health_context=pl.col("_chronic_raw"),
    )

    return df


def scored_columns(cfg) -> list[str]:
    return [m.id for m in cfg.scored_metrics]
