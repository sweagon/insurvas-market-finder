# ADR-006: Inaccessible sources are skipped explicitly, not faked

- Status: Accepted
- Date: 2026-10-20
- Owners: Insurvas data team

## Context

Rule R1 (public data only, respect ToS) and rule R2 (never invent identifiers;
verify live) collide with reality: several sources actively block automated
access. Verified live during recon (Oct 20, 2026):

| Source | Result | Notes |
| --- | --- | --- |
| SSA OASDI by state and county (PDFs) | HTTP 403 | Akamai bot protection on `ssa.gov` |
| Elder Index (UMass Boston) | API key required | Site returns "Missing Key" |
| CDC WONDER mortality | HTTP 403 | Bot protection |
| FCC National Broadband Map | HTTP 403 | Bot protection |
| BLS Consumer Expenditure Survey | HTTP 403 | Bot protection |
| Census CBP/NES **API** | Missing/invalid key | ACS API works unkeyed; CBP/NES API requires a key |
| Nonemployer Statistics file paths | HTTP 404 | Redirected structure, file not located |
| IRS county income | **200** | `23incyallagi.csv` + doc guide verified |
| CBP 2023 | **200** | `cbp23co.zip` verified |
| CDC PLACES 2025 | **200** | Socrata `swc5-untb` verified |
| BEA CAINC4 | **200** | 21 MB archive verified |

## Decision

1. We do **not** bypass bot protection, spoof browser sessions, or invent
   alternate mirrors for blocked government sources. Rule R1 wins.
2. Every blocked source is **skipped with an ADR and a manifest entry** of the
   form `{"status": "skipped", "reason": ..., "status_code": ...}`, and is
   counted in `qa_report.md`.
3. Fetch modules for skipped sources are still written against the verified
   canonical URL, so that access appearing later (or a valid key being supplied)
   turns the source on with no code change. They are guarded by a `try/except`
   that records the skip instead of failing the build.
4. The score remains defensible without those sources:
   - SSA benefit receipt -> not included; affordability keeps ACS income,
     $75k+ share, IRS investment income and home equity.
   - Elder Index headroom -> not included; documented as next-month work.
   - CDC WONDER deaths -> replaced by CDC PLACES chronic-condition context,
     clearly labelled "area health context".
   - FCC broadband -> reachability keeps ACS internet subscription and density.
   - BLS CE premium pool -> synthetic ownership/coverage gap shipped; premium
     pool omitted and labelled as not included rather than estimated.
   - Nonemployer agencies -> whitespace uses CBP estabs only, with a caveat.

## Consequences

- Four of the six sub-scores keep at least two metrics; none becomes empty.
- Honest coverage gaps are visible in the QA report and on the methodology page
  instead of being hidden behind imputation.
- If a valid Census API key is supplied, CBP/NES API paths and any key-gated
  sources can be enabled by setting `CENSUS_API_KEY`.
