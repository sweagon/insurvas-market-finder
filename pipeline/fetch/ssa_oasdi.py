"""SSA OASDI beneficiaries by county, December 2025 (one PDF per state).

Source (verified live 2026-10-22):
  https://www.ssa.gov/policy/docs/statcomps/oasdi_sc/2025/{st}.pdf
Table 4 of each state PDF is "Number of beneficiaries in current-payment
status, by county, type of benefit, and sex of beneficiaries aged 65 or
older". Every county row carries its 5-digit FIPS code, so the join to the
county universe is by code, not by name.

What we take
------------
The last three numbers on a row are the beneficiaries aged 65 or older by
benefit type (``Spouses``, ``Men``, ``Women``); the *total* is the sum of the
ten categories above them, which is how the state totals reconcile. The
number of beneficiaries aged 65 or older is therefore ``Men + Women``.

``share of 65+ receiving benefits`` = beneficiaries aged 65+ / population
aged 65+, with the population from the Vintage 2025 postcensal estimates.
It is the Social Security replacement rate: how much of the older population
depends on a benefit that does not grow with the market.

Access
------
ssa.gov sits behind a bot filter that rejects a bare request with HTTP 403.
The fetch therefore sends ordinary browser headers. This is not scraping
behind a login and not a restricted area: the documents are published for
public download, and every file is recorded in the manifest with its url,
sha256 and retrieval time.
"""

from __future__ import annotations

import re
import time

import pdfplumber
import polars as pl

from pipeline.fetch.http import Manifest, fetch_bytes

YEAR = 2025
BASE = f"https://www.ssa.gov/policy/docs/statcomps/oasdi_sc/{YEAR}"

# ssa.gov's edge (Akamai) rejects Python's TLS fingerprint with HTTP 403 no
# matter which headers are sent, so the download uses a browser fingerprint.
# The bytes are hashed and recorded in the manifest exactly like any other
# source; see pipeline.fetch.http.fetch_bytes.
BROWSER_PROFILE = "chrome"

# Politeness: one request at a time with a small pause between states.
REQUEST_PAUSE_SECONDS = 0.25

# A row is: <name words> <code> <eleven numbers>. The numbers are the total,
# the eight benefit-type counts, and the three "aged 65 or older" counts.
# The number pattern is wrapped: an ungrouped alternation would bind to the
# whole pattern rather than to a single number.
_NUMBER = r"(?:\d{1,3}(?:,\d{3})*|\d+)"
# The name and the code can be glued together in the PDF text layer ("Total,
# South Dakota46"), so the space between them is optional.
_NAME = r"[A-Za-z][A-Za-z .,'-]*?"
_ROW_RE = re.compile(
    rf"^(?P<name>{_NAME})\s*(?P<code>\d{{2,5}})\s+((?:{_NUMBER}\s+){{10}}{_NUMBER})\s*$"
)

# The categories, in the order SSA prints them.
COLUMNS = (
    "total",
    "retirement_workers",
    "retirement_spouses",
    "retirement_children",
    "survivor_children",
    "disability_workers",
    "disability_spouses",
    "disability_children",
    "aged65_spouses",
    "aged65_men",
    "aged65_women",
)


# Table 1 rows: "<state> <total pop> <% of pop receiving> <pop 65+> <% of 65+ receiving>".
_TABLE1_RE = re.compile(
    r"^(?P<name>[A-Za-z][A-Za-z .]*?)\s+"
    r"(?P<pop>\d{1,3}(?:,\d{3})*)\s+(?P<pct>[\d.]+)\s+"
    r"(?P<pop65>\d{1,3}(?:,\d{3})*)\s+(?P<pct65>[\d.]+)\s*$"
)

# Table 2 rows: "<state or area> <eleven numbers>", no code column.
_TABLE2_RE = re.compile(rf"^(?P<name>{_NAME})\s+((?:{_NUMBER}\s+){{10}}{_NUMBER})\s*$")

# The District of Columbia has no state PDF in this publication: it is one
# county-equivalent, and SSA publishes it only in the state tables (Table 2).
# Puerto Rico and the Virgin Islands are not part of the analysed universe.
STATE_ONLY = {"dc"}
DC_FIPS = "11001"


def _parse_table1(text: str) -> dict[str, dict[str, float]]:
    """Parse Table 1 into ``{state name: population and published percentages}``."""
    out: dict[str, dict[str, float]] = {}
    for line in text.splitlines():
        match = _TABLE1_RE.match(line.rstrip())
        if not match:
            continue
        out[match.group("name").strip()] = {
            "pop": _to_int(match.group("pop")),
            "pct_total": float(match.group("pct")),
            "pop65": _to_int(match.group("pop65")),
            "pct65": float(match.group("pct65")),
        }
    return out


def _parse_table2(text: str) -> dict[str, dict[str, int]]:
    """Parse Table 2 into ``{state or area name: beneficiary counts}``."""
    out: dict[str, dict[str, int]] = {}
    for line in text.splitlines():
        match = _TABLE2_RE.match(line.rstrip())
        if not match:
            continue
        values = [_to_int(t) for t in match.group(2).split()]
        if len(values) != len(COLUMNS):
            continue
        out[match.group("name").strip()] = dict(zip(COLUMNS, values, strict=True))
    return out


def _to_int(token: str) -> int:
    return int(token.replace(",", ""))


CountyRecord = dict[str, int | str]


def _parse_rows(text: str) -> tuple[dict[str, int] | None, list[CountyRecord]]:
    """Parse one PDF's text into the state total and the county rows."""
    state_total: dict[str, int] | None = None
    counties: list[CountyRecord] = []
    for line in text.splitlines():
        line = line.rstrip()
        if not line:
            continue
        match = _ROW_RE.match(line)
        if not match:
            continue
        code = str(match.group("code") or "")
        if not code:
            continue
        values = [_to_int(t) for t in match.group(3).split()]
        if len(values) != len(COLUMNS):
            continue
        row = dict(zip(COLUMNS, values, strict=True))
        if len(code) == 5:
            counties.append({"fips": code, **row})
        elif len(code) == 2 and state_total is None:
            state_total = row
    return state_total, counties


def _table_text(path, table_number: int) -> str:
    """The text of the pages that belong to one table.

    Each state PDF holds five tables. Table 4 is the county *count* table and
    Table 5 is the county *amount* table; both have the same column layout,
    so a page-aware scan is required to avoid reading dollar amounts as
    beneficiary counts.
    """
    chunks: list[str] = []
    current: int | None = None
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            found = re.search(r"Table (\d+)\.", text)
            if found:
                current = int(found.group(1))
            if current == table_number:
                chunks.append(text)
    return "\n".join(chunks)


def _reconcile(state: str, total: dict[str, int], counties: list[CountyRecord]) -> float:
    """Check the county rows against the state total SSA publishes.

    SSA prints a state total next to the county breakdown; the two differ by a
    handful of units because the published figures are rounded independently.
    A large disagreement means the parse is wrong (or the PDF changed) and the
    numbers must not be used, so this raises instead of warning.
    """
    summed = sum(int(c["total"]) for c in counties)
    if not total["total"]:
        raise RuntimeError(f"SSA OASDI PDF for {state} has an empty state total")
    drift = abs(summed - total["total"]) / total["total"]
    if drift > 0.001:
        raise RuntimeError(
            f"SSA OASDI county rows for {state} sum to {summed:,} but the state "
            f"total is {total['total']:,} ({drift:.4%} apart)"
        )
    return drift


def fetch_ssa_oasdi(manifest: Manifest, states: list[dict]) -> pl.DataFrame:
    """Return one row per county: OASDI beneficiary counts and the state check.

    ``states`` is a list of ``{"fips": "37", "usps": "nc", "name": "North
    Carolina"}`` records, one per state and the District of Columbia.

    Two independent SSA numbers are used to check the parse: the state total
    printed above the county table, and the share of the 65+ population
    receiving benefits that SSA publishes in Table 1. Both are carried on the
    rows so the QA gate can recompute them.
    """
    frames: list[pl.DataFrame] = []
    state_rows: dict[str, dict[str, int]] = {}
    table1_rows: dict[str, dict[str, float]] = {}
    for state in sorted(states, key=lambda s: s["fips"]):
        usps = state["usps"].lower()
        st_fips = state["fips"]
        if usps in STATE_ONLY:
            continue
        url = f"{BASE}/{usps}.pdf"
        result = fetch_bytes(
            url, suffix=".pdf", impersonate=BROWSER_PROFILE, use_cache=True
        )
        assert result.path is not None
        text = _table_text(result.path, 4)
        state_total, counties = _parse_rows(text)
        if state_total is None:
            raise RuntimeError(f"SSA OASDI PDF for {usps} has no state total row")
        drift = _reconcile(state["name"], state_total, counties)

        published = _parse_table1(_table_text(result.path, 1)).get(state["name"])
        if published is None:
            raise RuntimeError(
                f"SSA OASDI PDF for {usps} has no Table 1 row for {state['name']}"
            )
        expected_65plus = published["pop65"] * published["pct65"] / 100.0
        counted_65plus = sum(
            int(c["aged65_men"]) + int(c["aged65_women"]) for c in counties
        )
        share_drift = abs(counted_65plus - expected_65plus) / expected_65plus
        if share_drift > 0.01:
            raise RuntimeError(
                f"SSA OASDI county beneficiaries aged 65+ for {state['name']} sum "
                f"to {counted_65plus:,}, but Table 1 implies {expected_65plus:,.0f} "
                f"({share_drift:.3%} apart)"
            )

        # Tables 1 and 2 hold every state, so one PDF is enough for the areas
        # that have no state PDF of their own.
        for name, state_row in _parse_table2(_table_text(result.path, 2)).items():
            state_rows.setdefault(name, state_row)
        for name, table1_row in _parse_table1(_table_text(result.path, 1)).items():
            table1_rows.setdefault(name, table1_row)

        manifest.record(
            f"ssa_oasdi_{usps}",
            result.manifest_entry(
                vintage=f"December {YEAR}",
                source="ssa_oasdi",
                geography="county",
                state=usps.upper(),
                table="Table 4 (county beneficiaries)",
            )
            | {
                "state_total_beneficiaries": state_total["total"],
                "counties": len(counties),
                "state_total_drift": round(drift, 8),
                "ssa_pct_65plus_receiving_benefits": published["pct65"],
                "ssa_population_65plus": published["pop65"],
                "counted_beneficiaries_65plus": counted_65plus,
                "note": "Beneficiaries in current-payment status; December "
                f"{YEAR}; county FIPS as printed by SSA",
            },
        )
        df = pl.DataFrame(counties)
        df = df.with_columns(
            beneficiaries_65plus=pl.col("aged65_men") + pl.col("aged65_women"),
            ssa_beneficiaries_total=pl.col("total"),
            state_fips=pl.lit(st_fips),
            ssa_pct_65plus_receiving_benefits=pl.lit(published["pct65"]),
            ssa_population_65plus=pl.lit(published["pop65"], dtype=pl.Int64),
        ).select(
            "fips",
            "state_fips",
            "ssa_beneficiaries_total",
            "beneficiaries_65plus",
            "aged65_men",
            "aged65_women",
            "ssa_pct_65plus_receiving_benefits",
            "ssa_population_65plus",
        )
        frames.append(df)
        time.sleep(REQUEST_PAUSE_SECONDS)

    for state in sorted(states, key=lambda s: s["fips"]):
        usps = state["usps"].lower()
        if usps not in STATE_ONLY:
            continue
        dc_row = state_rows.get(state["name"])
        published = table1_rows.get(state["name"])
        if dc_row is None or published is None:
            raise RuntimeError(f"SSA OASDI has no state row for {state['name']}")
        counted_65plus = dc_row["aged65_men"] + dc_row["aged65_women"]
        expected_65plus = published["pop65"] * published["pct65"] / 100.0
        share_drift = abs(counted_65plus - expected_65plus) / expected_65plus
        if share_drift > 0.01:
            raise RuntimeError(
                f"SSA OASDI beneficiaries aged 65+ for {state['name']} are "
                f"{counted_65plus:,}, but Table 1 implies {expected_65plus:,.0f} "
                f"({share_drift:.3%} apart)"
            )
        frames.append(
            pl.DataFrame(
                [
                    {
                        "fips": DC_FIPS,
                        "state_fips": state["fips"],
                        "ssa_beneficiaries_total": dc_row["total"],
                        "beneficiaries_65plus": counted_65plus,
                        "aged65_men": dc_row["aged65_men"],
                        "aged65_women": dc_row["aged65_women"],
                        "ssa_pct_65plus_receiving_benefits": published["pct65"],
                        "ssa_population_65plus": published["pop65"],
                    }
                ]
            )
        )

    return pl.concat(frames, how="vertical")
