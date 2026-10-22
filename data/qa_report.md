# Data QA report

Generated: 2026-10-22T00:27:15.131279+00:00
Config version: 3  |  Counties: 3144

## Metric coverage

Every metric must be present for at least **90%** of counties (per-metric overrides are listed in the `floor` column). Scored metrics below their floor fail the build.

| metric | sub-score | scored | nulls | coverage | floor | min | p50 | max | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pop_60plus | size | yes | 0 | 100.0% | 90% | 9 | 7564 | 2.232e+06 | ok |
| share_60plus | size | yes | 0 | 100.0% | 90% | 0.08383 | 0.2884 | 0.6587 | ok |
| growth_60plus | size | yes | 0 | 100.0% | 90% | -0.4375 | 0.07536 | 0.963 | ok |
| income_65plus_median | affordability | yes | 1 | 100.0% | 90% | 1.743e+04 | 4.972e+04 | 1.371e+05 | ok |
| share_65_hh_75k | affordability | yes | 0 | 100.0% | 90% | 0.04167 | 0.3076 | 0.8173 | ok |
| irs_investment_income_per_return | affordability | yes | 1 | 100.0% | 90% | 0 | 9949 | 1.379e+05 | ok |
| non_earned_income_per_capita | affordability | yes | 53 | 98.3% | 90% | 2424 | 9178 | 4.104e+05 | ok |
| home_equity_65 | affordability | yes | 5 | 99.8% | 90% | 4.403e+04 | 1.368e+05 | 1.15e+06 | ok |
| spouse_share_65plus | need | yes | 0 | 100.0% | 90% | 0 | 0.5637 | 0.8327 | ok |
| mortgage_share_65_owners | need | yes | 2 | 99.9% | 90% | 0 | 0.2765 | 0.6405 | ok |
| internet_65plus | reachability | yes | 0 | 100.0% | 90% | 0.364 | 0.7969 | 1 | ok |
| density_60plus | reachability | yes | 0 | 100.0% | 90% | 0.008452 | 12.97 | 1.774e+04 | ok |
| agencies_per_1000_60plus | whitespace | yes | 0 | 100.0% | 90% | 0 | 1.29 | 9.957 | ok |
| chronic_burden_composite | insurability | yes | 187 | 94.1% | 93% | -3.141 | -0.01032 | 2.776 | ok |
| risk_behaviour_composite | insurability | yes | 187 | 94.1% | 93% | -3.11 | 0.005547 | 3.672 | ok |
| expected_ownership_65 | size | no | 0 | 100.0% | 90% | 0.2956 | 0.4099 | 0.5556 | ok |
| coverage_gap_households_60 | size | no | 0 | 100.0% | 90% | 4.35 | 1942 | 4.605e+05 | ok |
| area_health_context | insurability | no | 188 | 94.0% | 93% | 0.108 | 0.16 | 0.241 | ok |

## County universe

- Counties in the metric matrix: **3,144** (expected 3,144, tolerance +/-31)
- FIPS codes are 5 characters and unique: **yes**
- Status: **PASS**

## Value ranges

_No metric violates its unit bounds._

## Model weights

Every lens distributes 1.0 across each sub-score. The lens weights themselves are documented priors, not measurements.

## Source coverage

Every source in the config, the metrics it feeds and the share of counties
those metrics cover. A source that silently stopped covering counties is
a join failure, not a data quirk.

| source | metrics | min coverage |
| --- | --- | --- |
| acs | income_65plus_median, share_65_hh_75k, home_equity_65, spouse_share_65plus, mortgage_share_65_owners, internet_65plus, expected_ownership_65, coverage_gap_households_60 | 99.8% |
| bea | non_earned_income_per_capita | 98.3% |
| cb | (not used by any metric) | 0.0% |
| cbp | agencies_per_1000_60plus | 100.0% |
| gazetteer | (not used by any metric) | 0.0% |
| irs | irs_investment_income_per_return | 100.0% |
| places | chronic_burden_composite, risk_behaviour_composite, area_health_context | 94.0% |
| popest | pop_60plus, share_60plus, growth_60plus, density_60plus | 100.0% |

## Outliers

Values outside the 1st/99th percentile of their own metric. These are reported, not rejected: a real outlier is information, and the scorer ranks on percentiles, which are already outlier-resistant.

| metric | below p01 | above p99 |
| --- | --- | --- |
| pop_60plus | 31 | 32 |
| share_60plus | 32 | 32 |
| growth_60plus | 32 | 32 |
| income_65plus_median | 32 | 32 |
| share_65_hh_75k | 32 | 32 |
| irs_investment_income_per_return | 32 | 32 |
| non_earned_income_per_capita | 31 | 31 |
| home_equity_65 | 32 | 32 |
| spouse_share_65plus | 32 | 32 |
| mortgage_share_65_owners | 32 | 32 |
| internet_65plus | 32 | 32 |
| density_60plus | 32 | 32 |
| agencies_per_1000_60plus | 0 | 32 |
| chronic_burden_composite | 30 | 30 |
| risk_behaviour_composite | 30 | 30 |
| expected_ownership_65 | 32 | 32 |
| coverage_gap_households_60 | 32 | 32 |
| area_health_context | 30 | 29 |

## Imputation and shrinkage flags

| flag | rows | share |
| --- | --- | --- |
| imputed_irs_investment_income_per_return | 0 | 0.00% |
| shrunk_agencies | 65 | 2.07% |
| shrunk_chronic | 252 | 8.02% |
| shrunk_risk | 252 | 8.02% |

## Eligibility

- Minimum 60+ population for ranking: **2,000**
- Eligible counties: **2680** of 3144 (85.2%)
- Excluded (below threshold): 464

## Contribution invariant (rule R5)

- `volume`: max |sum(contributions) - total| = 4.263e-14
- `balanced`: max |sum(contributions) - total| = 4.263e-14
- `final_expense`: max |sum(contributions) - total| = 4.263e-14
- `legacy_wealth`: max |sum(contributions) - total| = 4.263e-14
- `spouse_protection`: max |sum(contributions) - total| = 2.842e-14

**Invariant PASSED** (tolerance 1e-9, observed 4.263e-14).

## Rule R7 audit (protected attributes)

Protected-attribute columns present in the metric matrix: **0**

English-proficiency fields are stored as context only and are excluded from
scoring (see config `rule_R7`). No race/ethnicity/origin/religion/disability
field is read, scored, used as a filter, or displayed.

## Ranking sanity check (volume lens)

Top 5:

1. Sumter County, Florida - 91.09 (60+: 103,924)
1. Brunswick County, North Carolina - 91.03 (60+: 81,193)
1. Beaufort County, South Carolina - 90.47 (60+: 80,215)
1. Sussex County, Delaware - 90.46 (60+: 116,101)
1. Washington County, Rhode Island - 90.21 (60+: 46,645)

Bottom 5 (eligible):

1. Monroe County, Arkansas - 17.71 (60+: 2,161)
1. Desha County, Arkansas - 16.99 (60+: 3,004)
1. Tunica County, Mississippi - 16.19 (60+: 2,003)
1. Dawson County, Texas - 16.11 (60+: 2,693)
1. Winn Parish, Louisiana - 15.27 (60+: 3,351)

