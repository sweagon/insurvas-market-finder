# ADR-005: Connecticut planning regions and FIPS integrity

- Status: Accepted
- Date: 2026-10-20
- Owners: Insurvas data team

## Context

Connecticut is the classic cross-vintage trap. Since the 2022 ACS products,
Connecticut's eight legacy counties have been replaced by **nine planning
regions** as county equivalents. Verified live during recon:

- Census PEP Vintage 2025 already emits the nine planning regions (FIPS
  `09110`-`09190`).
- ACS 2024 5-year emits the same nine planning regions.
- `us-atlas@3` `counties-10m` still contains the **eight legacy** CT counties
  (`09001`..`09015`) and only 3,231 counties overall.
- IRS SOI county files are published on legacy county boundaries for CT.

Joining these silently would either drop Connecticut or, worse, mis-assign
values. Other traps verified in the same class: Virginia independent cities,
renamed Alaska boroughs (Kusilvak), and Oglala Lakota, SD.

## Decision

1. **FIPS is always a 5-character zero-padded string**, never an integer.
2. **Geometry** is built from the Census 2024 cartographic boundary county file
   (5m), which already contains the nine CT planning regions, then projected and
   simplified to a pre-projected Albers `topo.json`. `us-atlas` is not used as
   the boundary source because it predates the CT change.
3. **CT ACS/PEP/CBP/PLACES** join directly on the nine planning-region FIPS.
4. **CT IRS** (legacy counties) cannot be split into planning regions without
   town-level allocation. CT IRS-derived metrics are therefore imputed from the
   state aggregate, flagged `imputed_irs_ct` and `low_confidence`, and counted
   in `qa_report.md`. No silent imputation (rule R6).
5. A dedicated integrity test asserts: unique 5-char FIPS, the expected count of
   county-equivalents, the presence of exactly nine `09xxx` planning regions,
   and no orphan geometries or orphan metrics.

## Consequences

- Connecticut is ranked on a consistent geography across the core sources, with
  one explicitly-flagged imputation for tax-based metrics.
- Building our own topojson costs a small Node pre-processing step but removes a
  whole class of silent geographic error and gives us state outlines for free.
- The town-based crosswalk remains future work (documented in the playbook)
  for anyone who wants true CT IRS values.
