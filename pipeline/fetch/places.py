"""CDC PLACES 2025 release, county data (Socrata).

Dataset (resolved dynamically at recon and pinned here):
  https://data.cdc.gov/resource/swc5-untb.json   "PLACES: Local Data for Better
  Health, County Data, 2025 release" (BRFSS 2023 for 35 measures, 2022 for 5).

Long format: one row per (locationid, measureid, data_value_type, year).
We keep **crude prevalence** (age-adjusted prevalence is also present) and label
everything as "area health context": these are model-based estimates for all
adults 18+, not seniors and not individuals. This is never used for individual
eligibility (ADR-006, R7).
"""

from __future__ import annotations

import httpx
import polars as pl

from pipeline.fetch.http import Manifest

RESOURCE = "https://data.cdc.gov/resource/swc5-untb.json"

CHRONIC_MEASURES = ("CHD", "DIABETES", "BPHIGH", "CANCER", "COPD")
RISK_MEASURES = ("OBESITY", "CSMOKING", "LPA")
CONTEXT_MEASURES = ("MHLTH", "PHLTH")
ALL_MEASURES = CHRONIC_MEASURES + RISK_MEASURES + CONTEXT_MEASURES


def _query(measure_ids: tuple[str, ...]) -> list[dict]:
    params = {
        "$select": "locationid,measureid,data_value,data_value_type,year,totalpop18plus",
        "$where": "measureid in('" + "','".join(measure_ids) + "')",
        "$limit": "50000",
    }
    with httpx.Client(timeout=httpx.Timeout(180.0, connect=30.0)) as client:
        resp = client.get(RESOURCE, params=params)
        resp.raise_for_status()
        return resp.json()


def fetch_places(manifest: Manifest) -> pl.DataFrame:
    """Return one row per county with crude prevalence for each measure.

    Columns: fips, chd, diabetes, bphigh, cancer, copd, obesity, csmoking, lpa,
    mhlth, phlth, pop_18plus, places_year.
    """
    records = _query(ALL_MEASURES)
    manifest.record(
        "places_2025",
        {
            "url": RESOURCE,
            "status": "ok",
            "source": "places",
            "vintage": "2025",
            "rows": len(records),
            "measures": list(ALL_MEASURES),
            "value_type": "Crude prevalence",
            "note": "Model-based estimates for adults 18+; area health context only",
        },
    )
    df = pl.DataFrame(records)
    # locationid is the 5-digit county FIPS in this dataset.
    df = df.filter(pl.col("data_value_type") == "Crude prevalence").with_columns(
        fips=pl.col("locationid").cast(pl.Utf8).str.zfill(5),
        value=pl.col("data_value").cast(pl.Float64, strict=False),
        year=pl.col("year").cast(pl.Utf8, strict=False),
    )
    wide = df.pivot(values="value", index="fips", on="measureid", aggregate_function="first")
    present = {m: m.lower() for m in ALL_MEASURES if m in wide.columns}
    wide = wide.rename(present)
    for measure in ALL_MEASURES:
        col = measure.lower()
        if col not in wide.columns:
            wide = wide.with_columns(pl.lit(None, dtype=pl.Float64).alias(col))
    year_col = (
        df.group_by("fips").agg(pl.col("year").max().alias("places_year"))
    )
    wide = wide.join(year_col, on="fips", how="left")
    return wide
