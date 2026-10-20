"""County Business Patterns 2023, NAICS 524210 (insurance agencies and brokerages).

Source (verified live 2026-10-20):
  https://www2.census.gov/programs-surveys/cbp/datasets/2023/cbp23co.zip
Contains a single pipe... actually a comma-quoted ``cbp23co.txt`` with columns
fipstate, fipscty, naics, emp, est, ... The NAICS field is hierarchical and
padded with dashes; we keep only the exact 6-digit code ``524210``.
"""

from __future__ import annotations

import io
import zipfile

import polars as pl

from pipeline.fetch.http import Manifest, fetch_bytes

URL = "https://www2.census.gov/programs-surveys/cbp/datasets/2023/cbp23co.zip"
NAICS_INSURANCE_AGENCIES = "524210"


def fetch_cbp(manifest: Manifest, *, naics: str = NAICS_INSURANCE_AGENCIES) -> pl.DataFrame:
    """Return one row per county: fips, estabs, employees for the NAICS code."""
    result = fetch_bytes(URL, suffix=".zip")
    manifest.record("cbp_2023", result.manifest_entry(vintage="2023", source="cbp", geography="county"))
    assert result.path is not None
    with zipfile.ZipFile(io.BytesIO(result.path.read_bytes())) as zf:
        name = next(n for n in zf.namelist() if n.endswith(".txt"))
        raw = zf.read(name)
    df = pl.read_csv(io.BytesIO(raw), infer_schema_length=5000, truncate_ragged_lines=True)
    df = df.with_columns(
        fips=(pl.col("fipstate").cast(pl.Utf8).str.zfill(2) + pl.col("fipscty").cast(pl.Utf8).str.zfill(3)),
        naics_clean=pl.col("naics").cast(pl.Utf8),
    ).filter(pl.col("naics_clean") == naics)
    # est is the establishment count; suppress flags are encoded as letters in
    # some columns but est is numeric in this release.
    out = df.select(
        "fips",
        estabs=pl.col("est").cast(pl.Int64, strict=False),
        employees=pl.col("emp").cast(pl.Int64, strict=False),
    )
    return out
