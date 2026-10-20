"""Census Population Estimates, Vintage 2025, county single-year-of-age files.

Source layout (verified live 2026-10-20):
  https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/counties/asrh/
    cc-est2025-agesex-{ss}.csv   -> broad age groups per county (wide)
    cc-est2025-syasex-{ss}.csv   -> single year of age per county (long, AGE column)

  ``{ss}`` is a two-digit state FIPS; 56 = Wyoming.

Year codes are 1..7:
  1 = April 1, 2020 (estimates base), 2 = July 1, 2020, 3 = 2021, ... 7 = 2025.
We use July 2020 (2) -> July 2025 (7) for growth and July 2025 (7) for levels.

In the syasex long file ``AGE`` runs 0..85 where 85 means "85 and over".
"""

from __future__ import annotations

import io

import polars as pl

from pipeline.fetch.http import FetchResult, Manifest, fetch_bytes

BASE = "https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/counties/asrh"

STATE_FIPS: dict[str, str] = {
    "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO",
    "09": "CT", "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI",
    "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
    "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
    "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
    "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
    "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
    "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
    "54": "WV", "55": "WI", "56": "WY", "72": "PR",
}

YEAR_2020 = 2
YEAR_LATEST = 7


def _download(state_fips: str, kind: str, manifest: Manifest) -> pl.DataFrame:
    url = f"{BASE}/cc-est2025-{kind}-{state_fips}.csv"
    result: FetchResult = fetch_bytes(url, suffix=".csv")
    manifest.record(
        f"popest_{kind}_{state_fips}",
        result.manifest_entry(vintage="2025", source="popest", geography="county"),
    )
    assert result.path is not None
    return pl.read_csv(io.BytesIO(result.path.read_bytes()))


def _fips_expr() -> pl.Expr:
    return pl.col("STATE").cast(pl.Utf8).str.zfill(2) + pl.col("COUNTY").cast(pl.Utf8).str.zfill(3)


def _age_cut(syasex: pl.DataFrame, year: int, lower: int, upper: int | None = None) -> pl.DataFrame:
    """Sum TOT_POP over single years in [lower, upper] for one year, per county."""
    age = pl.col("AGE")
    cond = age >= lower
    if upper is not None:
        cond = cond & (age <= upper)
    return (
        syasex.filter((pl.col("YEAR") == year) & cond)
        .with_columns(fips=_fips_expr())
        .group_by("fips")
        .agg(pl.col("TOT_POP").sum().alias(f"pop_{lower}{'_' + str(upper) if upper else ''}"))
    )


def fetch_popest(manifest: Manifest, *, states: list[str] | None = None) -> pl.DataFrame:
    """Return one row per county with 60+/65+/70+/75+ levels and 2020->2025 growth.

    Output columns: fips, state, stname, ctyname, total_pop, pop_60plus,
    pop_65plus, pop_70plus, pop_75plus, pop_60plus_2020, growth_60plus.
    """
    wanted = states or list(STATE_FIPS)
    frames: list[pl.DataFrame] = []
    for ss in wanted:
        agesex = _download(ss, "agesex", manifest)
        syasex = _download(ss, "syasex", manifest)

        levels = (
            agesex.filter(pl.col("YEAR") == YEAR_LATEST)
            .with_columns(fips=_fips_expr())
            .filter(pl.col("COUNTY").cast(pl.Utf8) != "000")
            .select(
                "fips",
                total_pop=pl.col("POPESTIMATE"),
                pop_65plus=pl.col("AGE65PLUS_TOT"),
                stname=pl.col("STNAME"),
                ctyname=pl.col("CTYNAME"),
            )
        )

        latest = (
            _age_cut(syasex, YEAR_LATEST, 60)
            .rename({"pop_60": "pop_60plus"})
            .join(_age_cut(syasex, YEAR_LATEST, 70).rename({"pop_70": "pop_70plus"}), on="fips", how="left")
            .join(_age_cut(syasex, YEAR_LATEST, 75).rename({"pop_75": "pop_75plus"}), on="fips", how="left")
        )
        base = _age_cut(syasex, YEAR_2020, 60).rename({"pop_60": "pop_60plus_2020"})

        joined = levels.join(latest, on="fips", how="left").join(base, on="fips", how="left")
        frames.append(joined)

    out = pl.concat(frames, how="vertical")
    out = out.with_columns(
        growth_60plus=pl.col("pop_60plus") / pl.col("pop_60plus_2020") - 1.0,
        state=pl.col("fips").str.slice(0, 2),
    )
    return out.select(
        "fips",
        "state",
        "stname",
        "ctyname",
        "total_pop",
        "pop_60plus",
        "pop_65plus",
        "pop_70plus",
        "pop_75plus",
        "pop_60plus_2020",
        "growth_60plus",
    )


def count_counties(df: pl.DataFrame) -> int:
    return df.select(pl.col("fips").n_unique()).item()


__all__ = ["fetch_popest", "STATE_FIPS", "count_counties"]
