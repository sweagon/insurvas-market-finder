# Accepted deviations

Where the implementation knowingly differs from `docs/DESIGN_SYSTEM.md`, the
brief or a "100% config-driven" claim. Each entry states the limit, the reason,
the user-visible impact and how it is contained. Revisit these when the
referenced constraint changes; do not silently "fix" one without updating this
file.

Last reviewed: 2026-10-22.

---

## 1. Radar is fixed at six axes

**Rule:** R9 fixes the radar at six sub-score axes.
**Model:** sub-scores are config-driven and may be added or removed.

A seventh sub-score is scored, weighted and listed everywhere else, but it is
not drawn on the radar. Six labelled axes is the readability constraint the
design system chose; a dynamically sized radar becomes unreadable and unstable
when labels change.

**Contained by:** `SUBSCORE_ORDER` drives the table, compare and sensitivity
views; the radar uses the first six axes in catalogue order. If a seventh
sub-score is added, record it in the release note and consider a second chart
rather than shrinking the radar.

---

## 2. Lens palette defines four colours, the product ships five

**Rule:** B.3 names Okabe-Ito colours for Balanced, Final Expense, Legacy and
Spouse (`#56B4E9`, `#E69F00`, `#CC79A7`, `#009E73`).
**Model:** the default lens is Volume, which B.3 did not name.

Volume uses `#0072B2` (the Okabe-Ito blue, distinct from Balanced's sky blue).
Any further lens takes the next fallback slot in `web/src/state/lensMeta.ts`.
The distinct-colour test fails if two ids collide.

**Contained by:** the colour map is presentation-only. Scores and identity do
not depend on it; swapping a colour is a one-line change with no pipeline run.

---

## 3. Data payload exceeds the 600 kB gzip budget

**Measured:** `web/public/data/rankings.json` is ~720.9 kB gzip (3,144 counties
× five lenses × uncertainty bands). The repo's own `size-limit` target is
600 kB; the original brief's `<100 kB` target predates the uncertainty fields.

This is a payload-shape issue, not a scoring bug. The full county × lens ×
percentile matrix is what makes rank ranges and top-half probabilities
inspectable offline. Dropping bands would make the UI look more certain than
the model is, which R6 forbids.

**Contained by:** the map and table load `counties.json` (metric matrix) and
`rankings.json` once; there is no per-interaction refetch. Budget enforcement
and precompression are handled in the performance pass; the budget number is
raised to the measured size with the reason recorded, rather than deleting
honest uncertainty to fit a stale number.

**Open:** re-measure after precompression; if the compressed payload can meet a
lower bound without dropping `p05/p95` or `p_top50`, lower the budget.

---

## 4. SSA beneficiary share is state-sourced for small counties

**Source:** SSA OASDI State and County Statistics, December 2025, Table 4
(Table 2 for DC). The county beneficiary count is reliable, but the ratio to the
65+ population is unstable in small counties and SSA publishes no county MOE.

- 101 of 3,144 counties (3.21%) fall outside the plausible share range. Their
  raw value is replaced by the published **state** share and flagged
  `imputed_ssa_share`.
- 245 counties (7.79%) have a small beneficiary count. Their value is shrunk
  toward the state share (`w = n / (n + 1000)`) and flagged `shrunk_ssa_share`.
- The UI badges both cases as **Estimate** with the exact treatment in the
  tooltip; the QA report records the counts.

This is a deliberate use of a coarser prior instead of a noisy county point
estimate. It is not a claim that every county has the state's true share.

---

## 5. Connecticut uses nine planning regions

Connecticut retired its eight legacy counties; the build serves the nine
Census planning regions (FIPS 09110–09190) so the map, ACS and POPEST join
consistently. Any external list keyed to the old eight counties will not match.

**Contained by:** the Methodology limitations and the county FIPS in
`counties.json`; no synthetic mapping back to the legacy counties is offered.

---

## 6. Puerto Rico is excluded by default

The served universe is 50 states + DC (3,144 county-equivalents). PR uses
municipios, and several sources (SSA state PDFs, PLACES, CBP) do not share the
county schema. `geography.include_pr` exists in config and the pipeline supports
the flag, but enabling it requires fetch and schema work.

**Contained by:** eligibility and county counts state the universe explicitly;
the Methodology page says "within-US percentile", not "within-US and PR".

---

## 7. Three metrics are context, not score inputs

`expected_ownership_65`, `coverage_gap_households_60` and
`area_health_context` are modeled or context-only (`scored: false`). They appear
in the metric dictionary and (where listed) the area summary, but contribute no
weight.

**Why:** expected ownership and coverage gap are modelled from ACS aggregates;
area health context is a PLACES area estimate, not an individual underwriting
signal. Scoring them would launder model assumptions into the ranking.

**Contained by:** the Methodology dictionary labels them **context**; the
scorer only ingests `scored: true` metrics.

---

## 8. Agency density is a competition proxy

`agencies_per_1000_60plus` comes from County Business Patterns (2023) and counts
establishments, not carrier appetite, commissions or product availability. It is
smoothed for small counties (`shrunk_agencies`) and badged as an estimate.

**Impact:** a county with many agencies can still be a poor market for a
specific product. The white-space sub-score is a starting point for
prioritisation, not a sales forecast.

---

## 9. Uncertainty is model-based, not a confidence interval for the truth

Bands come from a Monte Carlo over input noise and Dirichlet weight draws
(500 draws by default), using ACS MOE/1.645 where available and CV/lognormal
perturbations elsewhere. They express sensitivity to the named inputs, not
sampling error in the county's true market, and they do not include source
coverage bias.

**Contained by:** the Methodology page, the "Chance of a top-half finish"
wording, and the rank-range (not score-range) display rule.

---

## 10. No carrier or underwriting data

The product ranks areas from public data only (R1). It cannot see a carrier's
in-force book, claims, agent capacity, state filings or underwriting rules. Any
"opportunity" is a public-data prior that a carrier must join to its own data.

**Contained by:** the footer/attribution and the Methodology limitations. The
score is never presented as a revenue forecast or a compliance determination.

---

## Resolved during the UI hardening pass

These were real gaps, now fixed; kept here so the history is auditable.

| Gap | Resolution |
| --- | --- |
| Lens/sub-score ids and order hard-coded in `types.ts`, `lensMeta.ts`, `store.ts` | Generated `catalog.generated.json`; unions derived from config |
| Pipeline had `SubScoreId`/`LensId` literals and fixed weight models that silently dropped unknown lenses | Dynamic dicts + graph validation in `pipeline/config.py` |
| Metric catalogue had no UI description (G.1 unsatisfiable) | `description` required on every metric; surfaced in tooltips |
| Imputation/shrinkage flags emitted but never shown | Metric→flag map, Estimate badges, tooltips, compare dots |
| No staleness signal | `config_hash` in catalogue + data, red/amber banner |
| Old playbook pointed at deleted components | Paths corrected; this playbook added |
| Duplicate `--lens-volume`/`--lens-balanced` colour | Volume moved to `#0072B2`; distinct-colour test |
