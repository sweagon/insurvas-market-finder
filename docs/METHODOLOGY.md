# Methodology

This is the full, honest description of how the Insurvas Market Finder turns public
statistics into a 0-100 opportunity score for each US county. Everything here is
generated from, or enforced by, [`config/metrics.yaml`](../config/metrics.yaml).

The one-line version: **each metric is ranked across counties, aggregated into six
sub-scores, and combined with lens weights; every score decomposes exactly into its
parts, and uncertainty is shown rather than hidden.**

## 1. What we are ranking

- **Geography**: 50 states + DC, ~3,144 county-equivalents. Puerto Rico is excluded
  by default (`geography.include_pr: false`).
- **Target age**: 60+ defines the *size* of the opportunity. Where a 60-64 table is
  not published (ACS householder tables), we profile economics with **65+**
  householder data and say so on the metric (see caveats in the config).
- **Connecticut**: ACS/PEP 2022+ publish the **nine planning regions** (FIPS
  09110-09190), not the eight legacy counties. We score the planning regions. IRS
  SOI still publishes legacy counties; where reconciliation is needed we impute the
  state mean and flag it (`imputed_irs_investment_income_per_return`). Details in
  [ADR-005](adr/ADR-005-connecticut-and-fips.md).

## 2. The six sub-scores

| Sub-score | Question it answers |
| --- | --- |
| **Size** | How many 60+ residents, and how fast is the pool growing? |
| **Affordability** | Can 65+ households pay for coverage (income, wealth mix, housing equity)? |
| **Need** | Life-stage signals: spouse present, mortgage still on the home. |
| **Reachability** | Can the pool be reached efficiently (internet access, density)? |
| **Whitespace** | Inverse competition: insurance agencies per 1,000 residents 60+. |
| **Insurability (context)** | Area-level chronic-condition burden, adults 18+. Not individual eligibility. |

Metric-level definitions, units, directions, transforms, sources, vintages and
per-lens weights are all in `config/metrics.yaml`. Nothing is hard-coded elsewhere.

### The two PLACES composites

`chronic_burden_composite` and `risk_behaviour_composite` are **standardised
indices**, not prevalences. Each CDC PLACES measure in the group is z-scored
across the counties in the build universe, and the composite is the mean of
those z-scores. Z-scoring matters: raw crude prevalences differ by an order of
magnitude across the group (BPHIGH is roughly four times CANCER), so a plain
mean of percentages would be a measure of scale rather than of burden. A county
that is missing any constituent measure gets **no** composite at all, rather
than a partial one.

`area_health_context` is a separate, unscored context metric: the mean of the
PLACES `MHLTH` (poor mental health) and `PHLTH` (poor physical health) crude
prevalences, reported as a percentage.

### Living arrangements

`spouse_share_65plus` uses ACS table B09021 for the **65-and-over** block:
people aged 65+ who are a spouse of, or living with, a spouse, over all people
aged 65+ in households. It is a household-coupling proxy, not marital status.

## 3. Turning metrics into a score (rule R4)

For every scored metric, in this order:

1. **Winsorise** at the 1st and 99th percentiles (`params.winsor_lower/upper`).
2. **Log-transform** when the metric is flagged heavy-tailed (`transform: log`).
3. **Percentile-rank** to `[0, 1]`, using the **average-rank** convention. Direction
   is applied after ranking, so *higher percentile always means better*. Ties at the
   winsorisation cap are broken by the pre-cap magnitude so the extreme counties
   stay ordered (see [ADR-003](adr/ADR-003-percentile-rank-scaling.md)).

Then, per lens:

4. Within each sub-score, combine metric percentiles with **weights normalised to
   sum to 1** (from the lens's `lens_weights`). Missing metrics drop out and the
   remaining weights renormalise - no metric is silently treated as zero.
5. Combine the six sub-scores with the lens's sub-score weights (normalised to sum
   to 1), scaled by 100.

**Why percentile ranks**: bounded, monotone, robust to outliers, and explainable
("this county is at the 91st percentile for 60+ population"). The trade-off is that
rank distance discards magnitude - so volume levels are always shown next to the
score, never inferred from it.

### Contributions (rule R5)

Each sub-score's contribution to the total is split across its metrics in proportion
to their normalised weights, so the per-metric contributions **sum exactly to the
total**. The QA report and the county drawer assert this to `<= 1e-9`.

### Eligibility

Counties with fewer than **2,000 residents aged 60+** (`eligibility_min_60plus`) are
shown but **not ranked**. Only eligible counties receive a rank.

## 4. Lenses are weight presets, not truths

Each lens re-weights the same six sub-scores. The default is **Volume** because the
stakeholder prioritised biggest pools. All lens weights are documented priors
([ADR-004](adr/ADR-004-lenses-as-weight-priors.md)); none is presented as objective
truth. For **Final Expense / Guaranteed Issue**, the Insurability sub-score sign is
flipped (`flip_insurance_sign`), because higher disease burden is a *positive* signal
for guaranteed-issue products.

## 5. Uncertainty

- **Census MOE formulas** (`pipeline/transform/moe.py`): sums use
  `sqrt(MOE1^2 + MOE2^2)`; proportions and ratios use the documented formulas with the
  ratio fallback when a radicand goes negative.
- **Empirical-Bayes shrinkage** for noisy small-county rates (agency density, the
  PLACES composites). Shrunk rows carry `shrunk_*` flags; counts appear in the QA
  report. No silent smoothing.
- **Monte Carlo** (500 draws for the default lens): each metric's inputs are
  perturbed by its standard error and the whole pipeline is re-run, so the
  nonlinear transforms propagate. Where a source publishes no MOE (POPEST point
  estimates, CBP counts) we use a **documented coefficient of variation**
  (`priors.default_cv`, `priors.cv_no_moe`) rather than pretending precision. The
  result is a 90% band (`p05`-`p95`) shown next to every score.

## 6. Synthetic ("modeled") quantities

`expected_ownership_65` and `coverage_gap_households_60` are **modeled priors**, not
observations. They apply national ownership-by-income-band rates
([LIMRA/Life Happens 2026 Insurance Barometer](https://www.limra.com/)) to each
county's local 65+ income distribution. They are labelled `modeled: true`, are
**never scored**, and exist only to give a sense of coverage gap. Attribution:
"Source: 2026 Insurance Barometer Study, LIMRA and Life Happens"; the survey covers
adults 18-75 and has a margin of error of +/- 3 percentage points.

**How the prior is built.** The barometer publishes two *household-level* anchors
- 29% of households under $50K and 64% of households at $150K or more - and a
*person-level* headline of 52% of adults aged 18-75. Those are different
weightings of the same survey, so the 52% figure is **not** used to fit a
household income curve. We fit a logistic curve in log(income) across the 16
ACS B19037 65+ householder income bands, solving for the curve's two parameters
so that the two household-level anchors are reproduced as group averages when
weighted by the national 65+ household distribution. The curve is monotone in
income by construction. Applying it to a county's own income mix gives that
county's modelled ownership rate; `coverage_gap_households_60` is the number of
households with a 65+ householder times one minus that rate.

These are national priors applied to local distributions. They are not
observations, they do not know anything about any individual's coverage, and
they are never scored.

## 7. Rule R7 - protected attributes (non-negotiable)

**We never use race, ethnicity, national origin, religion or disability status in
scoring, filtering, ranking or display.** The pipeline does not read any such field
into the metric matrix, and `pipeline/qa/report.py` scans every column and **fails
the build** if a protected-attribute column appears. English-proficiency fields are
retained as *context only* and are excluded from scoring. Area-level CDC PLACES
chronic/risk measures are used as **health context**, never as a proxy for disability
or individual eligibility.

## 8. Data sources and honesty

Public data only; each source's license, attribution and caveats are recorded in
`config/metrics.yaml`. Every download's URL, final URL, status, sha256 and retrieval
time are recorded in `data/manifest.json` (rule R2). Sources that block automated
access (SSA, Elder Index, CDC WONDER, FCC, BLS CE) are **skipped explicitly with an
ADR**, never faked ([ADR-006](adr/ADR-006-inaccessible-sources.md)). The ACS API became
key-gated during the build; we use the table-based Summary File instead
([ADR-007](adr/ADR-007-acs-summary-file-fallback.md)).

## 9. Reproducibility and known limits

- **Vintage drift**: adding or removing counties changes all percentile ranks. The
  universe is fixed in config and stated in the UI.
- **Suppression**: IRS suppresses counties with fewer than ~20 returns and ZIP-based
  assignment introduces noise; CBP excludes most self-employed agents, so agency
  density is understated in independent-agent states.
- **No causal claims**: this ranks *observable pool characteristics*, not sales
  outcomes. It is a prioritisation aid, not a forecast.

## 10. Configuration reference

The single source of truth is `config/metrics.yaml`. Loaded and validated by
`pipeline/config.py` (weights must sum to 100; no negative weights). To change a
weight, a lens, a metric or a vintage, follow
[`docs/LIVE_CHANGE_PLAYBOOK.md`](LIVE_CHANGE_PLAYBOOK.md).
