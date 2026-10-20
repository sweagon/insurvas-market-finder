"""BEA CAINC4 county personal income, line 46 (Dividends, interest, and rent).

Source (verified live 2026-10-20):
  https://apps.bea.gov/regional/zip/CAINC4.zip
  CAINC4__ALL_AREAS_1969_2024.csv, money amounts in thousands of dollars.

Line code 46 "Plus: Dividends, interest, and rent" is the wealth-composition
proxy. It is a total, so the pipeline divides by population (from the Census
Population Estimates) to obtain a per-capita value.
"""

from __future__ import annotations

import io
import zipfile

import polars as pl

from pipeline.fetch.http import Manifest, fetch_bytes

URL = "https://apps.bea.gov/regional/zip/CAINC4.zip"
DIVIDENDS_INTEREST_RENT = "46"
LATEST_YEAR = "2024"


def fetch_bea(manifest: Manifest) -> pl.DataFrame:
    """Return one row per county: fips, dir_total (dollars in latest year)."""
    result = fetch_bytes(URL, suffix=".zip")
    manifest.record(
        "bea_cainc4", result.manifest_entry(vintage="2024", source="bea", geography="county")
    )
    assert result.path is not None
    with (
        zipfile.ZipFile(io.BytesIO(result.path.read_bytes())) as zf,
        zf.open("CAINC4__ALL_AREAS_1969_2024.csv") as fh,
    ):
        text = fh.read().decode("latin-1")
        df = pl.read_csv(
            io.BytesIO(text.encode("utf-8")),
            columns=["GeoFIPS", "GeoName", "LineCode", LATEST_YEAR],
            infer_schema_length=5000,
        )
    df = df.with_columns(
        geofips=pl.col("GeoFIPS").cast(pl.Utf8).str.replace_all('"', "").str.strip_chars(),
        linecode=pl.col("LineCode").cast(pl.Utf8).str.strip_chars(),
    )
    counties = df.filter(
        (pl.col("linecode") == DIVIDENDS_INTEREST_RENT)
        & (pl.col("geofips").str.len_chars() == 5)
        & (pl.col("geofips").str.slice(2, 3) != "000")  # drop state-level rows
        & (pl.col("geofips").str.slice(0, 2).cast(pl.Int64, strict=False) < 60)
    )
    out = counties.select(
        fips=pl.col("geofips"),
        dir_total=pl.col(LATEST_YEAR).cast(pl.Float64, strict=False) * 1000.0,
    )
    return out.filter(pl.col("fips").str.len_chars() == 5)
