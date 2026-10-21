"""Geography helpers: FIPS normalisation and Connecticut reconciliation.

Canonical universe: 50 states + DC, county-equivalents as used by the 2024
cartographic boundary file and by ACS/PEP 2022+ (which means the **nine
Connecticut planning regions**, FIPS 09110-09190).

IRS SOI (and historically BEA) publish Connecticut on the **eight legacy
counties** (09001..09015). Legacy CT counties do not nest inside planning
regions, so a town-level crosswalk is required to split them. Until that
crosswalk exists, CT tax-based metrics are imputed from the state aggregate and
flagged (ADR-005).
"""

from __future__ import annotations

import polars as pl

STATE_FIPS_TO_USPS = {
    "01": "AL",
    "02": "AK",
    "04": "AZ",
    "05": "AR",
    "06": "CA",
    "08": "CO",
    "09": "CT",
    "10": "DE",
    "11": "DC",
    "12": "FL",
    "13": "GA",
    "15": "HI",
    "16": "ID",
    "17": "IL",
    "18": "IN",
    "19": "IA",
    "20": "KS",
    "21": "KY",
    "22": "LA",
    "23": "ME",
    "24": "MD",
    "25": "MA",
    "26": "MI",
    "27": "MN",
    "28": "MS",
    "29": "MO",
    "30": "MT",
    "31": "NE",
    "32": "NV",
    "33": "NH",
    "34": "NJ",
    "35": "NM",
    "36": "NY",
    "37": "NC",
    "38": "ND",
    "39": "OH",
    "40": "OK",
    "41": "OR",
    "42": "PA",
    "44": "RI",
    "45": "SC",
    "46": "SD",
    "47": "TN",
    "48": "TX",
    "49": "UT",
    "50": "VT",
    "51": "VA",
    "53": "WA",
    "54": "WV",
    "55": "WI",
    "56": "WY",
}

STATE_FIPS_50_DC = {
    "01",
    "02",
    "04",
    "05",
    "06",
    "08",
    "09",
    "10",
    "11",
    "12",
    "13",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "21",
    "22",
    "23",
    "24",
    "25",
    "26",
    "27",
    "28",
    "29",
    "30",
    "31",
    "32",
    "33",
    "34",
    "35",
    "36",
    "37",
    "38",
    "39",
    "40",
    "41",
    "42",
    "44",
    "45",
    "46",
    "47",
    "48",
    "49",
    "50",
    "51",
    "53",
    "54",
    "55",
    "56",
}

CT_LEGACY_FIPS = {"09001", "09003", "09005", "09007", "09009", "09011", "09013", "09015"}
CT_PLANNING_REGIONS = {
    "09110",
    "09120",
    "09130",
    "09140",
    "09150",
    "09160",
    "09170",
    "09180",
    "09190",
}


def as_fips(expr: pl.Expr) -> pl.Expr:
    """Coerce a numeric or string column to a 5-character zero-padded FIPS."""
    return expr.cast(pl.Utf8).str.replace_all('"', "").str.strip_chars().str.zfill(5)


STATE_ABBR: dict[str, str] = {
    "01": "AL",
    "02": "AK",
    "04": "AZ",
    "05": "AR",
    "06": "CA",
    "08": "CO",
    "09": "CT",
    "10": "DE",
    "11": "DC",
    "12": "FL",
    "13": "GA",
    "15": "HI",
    "16": "ID",
    "17": "IL",
    "18": "IN",
    "19": "IA",
    "20": "KS",
    "21": "KY",
    "22": "LA",
    "23": "ME",
    "24": "MD",
    "25": "MA",
    "26": "MI",
    "27": "MN",
    "28": "MS",
    "29": "MO",
    "30": "MT",
    "31": "NE",
    "32": "NV",
    "33": "NH",
    "34": "NJ",
    "35": "NM",
    "36": "NY",
    "37": "NC",
    "38": "ND",
    "39": "OH",
    "40": "OK",
    "41": "OR",
    "42": "PA",
    "44": "RI",
    "45": "SC",
    "46": "SD",
    "47": "TN",
    "48": "TX",
    "49": "UT",
    "50": "VT",
    "51": "VA",
    "53": "WA",
    "54": "WV",
    "55": "WI",
    "56": "WY",
}


def state_abbr(fips: str) -> str:
    return STATE_ABBR.get(fips[:2], fips[:2])


def filter_to_universe(df: pl.DataFrame, *, fips_col: str = "fips") -> pl.DataFrame:
    """Keep only 50 states + DC county-equivalents."""
    return df.filter(pl.col(fips_col).str.slice(0, 2).is_in(list(STATE_FIPS_50_DC)))


def impute_ct_state_mean(
    df: pl.DataFrame,
    value_col: str,
    fips_col: str = "fips",
    *,
    out_col: str | None = None,
) -> pl.DataFrame:
    """Fill missing CT planning-region values with the state-of-CT mean.

    Used for tax-based metrics that arrive on legacy CT counties. Adds an
    ``imputed_{out_col}`` boolean column so nothing is imputed silently (R6).
    """
    out_col = out_col or value_col
    ct_mask = pl.col(fips_col).is_in(list(CT_PLANNING_REGIONS))
    state_mean = (
        df.filter(ct_mask & pl.col(value_col).is_not_null()).select(pl.col(value_col).mean()).item()
    )
    return df.with_columns(
        pl.when(ct_mask & pl.col(value_col).is_null())
        .then(pl.lit(state_mean))
        .otherwise(pl.col(value_col))
        .alias(out_col),
        (ct_mask & pl.col(value_col).is_null()).alias(f"imputed_{out_col}"),
    )
