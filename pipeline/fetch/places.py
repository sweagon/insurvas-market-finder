"""CDC PLACES 2025 release, county data (Socrata).

Dataset (resolved dynamically at recon and pinned here):
  https://data.cdc.gov/resource/swc5-untb.json   "PLACES: Local Data for Better
  Health, County Data, 2025 release" (BRFSS 2023 for 35 measures, 2022 for 5).

Long format: one row per (locationid, measureid, data_value_type, year).
We keep **crude prevalence** (age-adjusted prevalence is also present) and label
everything as "area health context": these are model-based estimates for all
adults 18+, not seniors and not individuals. This is never used for individual
eligibility (ADR-006, R7).

Paging
------
A single Socrata response is capped at 50,000 rows. The county extract for
these ten measures is larger than that, so an unpaged request silently drops
the tail of the alphabet (the high-FIPS states) and those counties end up
scored as if their health context were "average". We therefore ask the server
for ``count(*)`` first, page with ``$offset`` until the offset passes that
count, and fail the build if the number of rows we assembled does not match
the server-side total exactly.
"""

from __future__ import annotations

import httpx
import polars as pl

from pipeline.fetch.http import Manifest

RESOURCE = "https://data.cdc.gov/resource/swc5-untb.json"
VALUE_TYPE = "Crude prevalence"

CHRONIC_MEASURES = ("CHD", "DIABETES", "BPHIGH", "CANCER", "COPD")
RISK_MEASURES = ("OBESITY", "CSMOKING", "LPA")
CONTEXT_MEASURES = ("MHLTH", "PHLTH")
ALL_MEASURES = CHRONIC_MEASURES + RISK_MEASURES + CONTEXT_MEASURES

# Socrata's hard per-response row cap.
PAGE_SIZE = 50_000
# Safety net: 32 pages x 50k rows is 1.6M rows, far above any plausible size.
MAX_PAGES = 32
# A measure that reaches fewer than this fraction of the best-covered measure
# means the extract is broken, not that the source is sparse.
MIN_COVERAGE_RATIO = 0.80


def _where(measure_ids: tuple[str, ...]) -> str:
    ids = "','".join(measure_ids)
    return f"measureid in('{ids}') and data_value_type='{VALUE_TYPE}'"


def _server_count(client: httpx.Client, where: str) -> int:
    resp = client.get(RESOURCE, params={"$select": "count(*)", "$where": where})
    resp.raise_for_status()
    payload = resp.json()
    if not payload or "count" not in payload[0]:
        raise RuntimeError(f"PLACES count(*) returned no count: {payload!r}")
    return int(payload[0]["count"])


def _fetch_all(client: httpx.Client, where: str) -> tuple[list[dict], int]:
    """Page the whole extract and verify it against the server-side count."""
    expected = _server_count(client, where)
    records: list[dict] = []
    offset = 0
    for _ in range(MAX_PAGES):
        if offset >= expected:
            break
        params = {
            "$select": "locationid,measureid,data_value,data_value_type,year,totalpop18plus",
            "$where": where,
            "$order": "locationid,measureid,year",
            "$limit": str(PAGE_SIZE),
            "$offset": str(offset),
        }
        resp = client.get(RESOURCE, params=params)
        resp.raise_for_status()
        batch = resp.json()
        if not batch:
            break
        records.extend(batch)
        offset += len(batch)
        if len(batch) < PAGE_SIZE:
            break
    else:
        raise RuntimeError(f"PLACES pagination did not finish within {MAX_PAGES} pages")

    if len(records) != expected:
        raise RuntimeError(
            f"PLACES download incomplete: assembled {len(records)} rows, server reports {expected}"
        )
    return records, expected


def fetch_places(manifest: Manifest) -> pl.DataFrame:
    """Return one row per county with crude prevalence for each measure.

    Columns: fips, chd, diabetes, bphigh, cancer, copd, obesity, csmoking, lpa,
    mhlth, phlth, pop_18plus, places_year.
    """
    where = _where(ALL_MEASURES)
    with httpx.Client(timeout=httpx.Timeout(180.0, connect=30.0)) as client:
        records, total_rows = _fetch_all(client, where)

    df = pl.DataFrame(records)
    # locationid is the 5-digit county FIPS in this dataset.
    df = df.with_columns(
        fips=pl.col("locationid").cast(pl.Utf8).str.zfill(5),
        value=pl.col("data_value").cast(pl.Float64, strict=False),
        year=pl.col("year").cast(pl.Int64, strict=False),
    )
    # Keep the most recent observation per (county, measure).
    df = df.sort(["fips", "measureid", "year"]).unique(
        subset=["fips", "measureid"], keep="last"
    )

    per_measure = {
        m: df.filter(pl.col("measureid") == m) for m in ALL_MEASURES
    }
    coverage = {m: frame.height for m, frame in per_measure.items()}
    measure_years = {
        m: (frame["year"].drop_nulls().max() if frame.height else None)
        for m, frame in per_measure.items()
    }
    best = max(coverage.values()) if coverage else 0
    if best == 0:
        raise RuntimeError("PLACES extract returned no rows at all")
    thin = {m: c for m, c in coverage.items() if c < MIN_COVERAGE_RATIO * best}
    if thin:
        raise RuntimeError(
            f"PLACES measure coverage below {MIN_COVERAGE_RATIO:.0%} of the best measure: {thin}"
        )

    manifest.record(
        "places_2025",
        {
            "url": RESOURCE,
            "status": "ok",
            "source": "places",
            "vintage": "2025",
            "rows": total_rows,
            "measures": list(ALL_MEASURES),
            "value_type": VALUE_TYPE,
            "coverage_counties": coverage,
            "measure_years": measure_years,
            "note": "Model-based estimates for adults 18+; area health context only",
        },
    )

    wide = df.pivot(values="value", index="fips", on="measureid", aggregate_function="first")
    present = {m: m.lower() for m in ALL_MEASURES if m in wide.columns}
    wide = wide.rename(present)
    for measure in ALL_MEASURES:
        col = measure.lower()
        if col not in wide.columns:
            wide = wide.with_columns(pl.lit(None, dtype=pl.Float64).alias(col))
    year_col = df.group_by("fips").agg(pl.col("year").max().alias("places_year"))
    wide = wide.join(year_col, on="fips", how="left")
    return wide
