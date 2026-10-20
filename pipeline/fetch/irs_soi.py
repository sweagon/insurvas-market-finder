"""IRS Statistics of Income, county income data (tax year 2023).

Source (verified live 2026-10-20):
  https://www.irs.gov/pub/irs-soi/23incyallagi.csv   (all states, all AGI stubs)
  https://www.irs.gov/pub/irs-soi/23incydocguide.docx (record layout)

Field codes confirmed from the record-layout table in the doc guide:
  N1      number of returns
  ELDERLY number of elderly returns
  A00100  adjusted gross income
  A00300  taxable interest
  A00600  ordinary dividends
  A01400  taxable IRA distributions
  A01700  taxable pensions and annuities
  A02500  taxable Social Security benefits

Caveats baked into the metric (rule R1 / honesty):
* Counties are assigned from the ZIP code on the return, so a return is placed
  in one county even if the filer moved.
* Items with fewer than 20 returns are suppressed (published as 0 by IRS).
* AGI brackets top out at "$200,000 or more", so the file cannot resolve the
  very top of the wealth distribution.
"""

from __future__ import annotations

import polars as pl

from pipeline.fetch.http import Manifest, fetch_bytes

URL = "https://www.irs.gov/pub/irs-soi/23incyallagi.csv"
DOC_URL = "https://www.irs.gov/pub/irs-soi/23incydocguide.docx"

KEEP = [
    "STATEFIPS",
    "COUNTYFIPS",
    "COUNTYNAME",
    "N1",
    "ELDERLY",
    "A00100",
    "A00300",
    "A00600",
    "A01400",
    "A01700",
    "A02500",
]


def fetch_irs(manifest: Manifest) -> pl.DataFrame:
    """Return one row per county with investment + retirement income per return.

    Columns: fips, stname (from FIPS), returns, elderly_returns,
    inv_ret_income, inv_ret_income_per_return, agi_per_return, ss_income_per_return.
    """
    result = fetch_bytes(URL, suffix=".csv")
    manifest.record(
        "irs_county_ty2023",
        result.manifest_entry(vintage="TY2023", source="irs", geography="county"),
    )
    doc = fetch_bytes(DOC_URL, suffix=".docx")
    manifest.record(
        "irs_field_layout_ty2023",
        doc.manifest_entry(vintage="TY2023", source="irs", kind="documentation"),
    )

    assert result.path is not None
    df = pl.read_csv(result.path, infer_schema_length=5000)
    df = df.with_columns(
        fips=(
            pl.col("STATEFIPS").cast(pl.Utf8).str.zfill(2)
            + pl.col("COUNTYFIPS").cast(pl.Utf8).str.zfill(3)
        ),
    )
    # The all-AGI file is already aggregated across AGI stubs per county.
    agg = df.group_by("fips").agg(
        pl.col("N1").sum().alias("returns"),
        pl.col("ELDERLY").sum().alias("elderly_returns"),
        pl.col("A00100").sum().alias("agi"),
        pl.col("A00300").sum().alias("interest"),
        pl.col("A00600").sum().alias("dividends"),
        pl.col("A01400").sum().alias("ira"),
        pl.col("A01700").sum().alias("pensions"),
        pl.col("A02500").sum().alias("social_security"),
    )
    out = agg.with_columns(
        inv_ret_income=(
            pl.col("interest") + pl.col("dividends") + pl.col("ira") + pl.col("pensions")
        )
        * 1000.0,  # SOI reports money amounts in thousands of dollars
    ).with_columns(
        inv_ret_income_per_return=pl.when(pl.col("returns") > 0)
        .then(pl.col("inv_ret_income") / pl.col("returns"))
        .otherwise(None),
        agi_per_return=pl.when(pl.col("returns") > 0)
        .then(pl.col("agi") / pl.col("returns") * 1000.0)
        .otherwise(None),
        ss_income_per_return=pl.when(pl.col("returns") > 0)
        .then(pl.col("social_security") / pl.col("returns") * 1000.0)
        .otherwise(None),
    )
    return out.select(
        "fips",
        "returns",
        "elderly_returns",
        "inv_ret_income",
        "inv_ret_income_per_return",
        "agi_per_return",
        "ss_income_per_return",
    )
