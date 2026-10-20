"""ACS 2020-2024 5-year county pull, from the table-based Summary File.

Why the Summary File instead of the API
---------------------------------------
During recon the ACS API worked unkeyed, but by build time every
``api.census.gov/data/2024/acs/acs5`` query returned HTTP 302 to
``missing_key.html``: the API now requires a key for all requests, and the key
supplied by the stakeholder validated as invalid. The table-based Summary File
is a fully public bulk alternative with no key, so it is used here (see
ADR-007). The API path remains available via ``CENSUS_API_KEY`` once a valid
key exists.

File format (verified live)
---------------------------
``acsdt5y2024-{table}.dat`` is a pipe-delimited file whose first line is a
header of ``GEO_ID`` plus ``{TABLE}_E###`` / ``{TABLE}_M###`` columns. County
rows have ``GEO_ID`` of the form ``0500000US01001`` -> FIPS ``01001``.
Missing / annotation cells are non-numeric (``-``, ``(X)``, ``.``, empty).
"""

from __future__ import annotations

import io
import re

import polars as pl

from pipeline.fetch.http import FetchResult, Manifest, fetch_bytes

YEAR = 2024
BASE = f"https://www2.census.gov/programs-surveys/acs/summary_file/{YEAR}/table-based-SF/data/5YRData"
COUNTY_GEO_PREFIX = "0500000US"

# Tables we need, with the variables we keep and a human note for the manifest.
TABLES: dict[str, tuple[str, ...]] = {
    "b19049": ("B19049_E005", "B19049_M005"),
    "b19037": ("B19037_E053", *(f"B19037_E{i:03d}" for i in range(54, 70))),
    "b25027": ("B25027_E007", "B25027_E008", "B25027_E009", "B25027_E015", "B25027_E016", "B25027_E017"),
    "b25077": ("B25077_E001", "B25077_M001"),
    "b28005": ("B28005_E014", "B28005_E017", "B28005_E018"),
    "b09021": ("B09021_E022", "B09021_E024"),
}

_NUM_RE = re.compile(r"^-?\d+(\.\d+)?$")


def _parse_number(raw: str) -> tuple[float | None, str | None]:
    raw = raw.strip()
    if raw == "" or raw in {"-", ".", "(X)", "N", "null"}:
        return None, "missing"
    if not _NUM_RE.match(raw):
        return None, "annotation"
    value = float(raw)
    # ACS uses large negative sentinels / jam values for annotations.
    if value <= -100000000:
        return None, "sentinel"
    if value < 0:
        return None, "negative"
    return value, None


def _download_table(table: str, manifest: Manifest) -> pl.DataFrame:
    url = f"{BASE}/acsdt5y2024-{table}.dat"
    result: FetchResult = fetch_bytes(url, suffix=".dat")
    assert result.path is not None
    manifest.record(
        f"acs_{table}",
        result.manifest_entry(vintage="2020-2024", source="acs", geography="county", table=table),
    )
    # Filter to county rows while reading to keep memory bounded.
    df = pl.read_csv(
        io.BytesIO(result.path.read_bytes()),
        separator="|",
        has_header=True,
        infer_schema_length=0,
        quote_char=None,
    )
    return df.filter(pl.col("GEO_ID").str.starts_with(COUNTY_GEO_PREFIX))


def _parse_struct(raw: str) -> dict[str, object]:
    value, reason = _parse_number(raw)
    return {"value": value, "reason_code": reason}


def fetch_acs(manifest: Manifest, *, include_pr: bool = False) -> pl.DataFrame:
    """Return long-form ACS estimates: fips, variable, value, reason_code."""
    frames: list[pl.DataFrame] = []
    for table, variables in TABLES.items():
        raw = _download_table(table, manifest)
        present = [v for v in variables if v in raw.columns]
        raw = raw.select(["GEO_ID", *present]).with_columns(
            fips=pl.col("GEO_ID").str.slice(len(COUNTY_GEO_PREFIX))
        )
        long = raw.melt(
            id_vars=["fips"],
            value_vars=present,
            variable_name="variable",
            value_name="raw",
        )
        parsed = long.with_columns(
            pl.col("raw").cast(pl.Utf8).map_elements(
                lambda x: _parse_struct(x if x is not None else ""),
                return_dtype=pl.Struct({"value": pl.Float64, "reason_code": pl.Utf8}),
            ).alias("parsed")
        ).unnest("parsed")
        parsed = parsed.select("fips", "variable", "value", "reason_code")
        if not include_pr:
            parsed = parsed.filter(~pl.col("fips").str.starts_with("72"))
        frames.append(parsed)
    return pl.concat(frames, how="vertical")


def fetch_acs_wide(manifest: Manifest, *, include_pr: bool = False) -> pl.DataFrame:
    """One row per county, one column per variable."""
    long = fetch_acs(manifest, include_pr=include_pr)
    return long.pivot(values="value", index="fips", on="variable", aggregate_function="first")


if __name__ == "__main__":  # pragma: no cover - manual smoke test
    m = Manifest()
    wide = fetch_acs_wide(m)
    print(wide.shape)
