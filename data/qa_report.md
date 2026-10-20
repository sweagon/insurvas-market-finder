# Data QA report

Generated: 2026-10-20T13:39:00.040065+00:00
Config version: 3  |  Counties: 3144

## Metric coverage

| metric | sub-score | scored | nulls | coverage | min | p50 | max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pop_60plus | size | yes | 0 | 100.0% | 9 | 7564 | 2.232e+06 |
| share_60plus | size | yes | 0 | 100.0% | 0.08383 | 0.2884 | 0.6587 |
| growth_60plus | size | yes | 0 | 100.0% | -0.4375 | 0.07536 | 0.963 |
| income_65plus_median | affordability | yes | 1 | 100.0% | 1.743e+04 | 4.972e+04 | 1.371e+05 |
| share_65_hh_75k | affordability | yes | 0 | 100.0% | 0.04167 | 0.3076 | 0.8173 |
| irs_investment_income_per_return | affordability | yes | 1 | 100.0% | 0 | 9949 | 1.379e+05 |
| home_equity_65 | affordability | yes | 5 | 99.8% | 4.403e+04 | 1.368e+05 | 1.15e+06 |
| spouse_share_60plus | need | yes | 0 | 100.0% | 0 | 0.5637 | 0.8327 |
| mortgage_share_65_owners | need | yes | 2 | 99.9% | 0 | 0.2765 | 0.6405 |
| internet_65plus | reachability | yes | 0 | 100.0% | 0.364 | 0.7922 | 1 |
| density_60plus | reachability | yes | 0 | 100.0% | 0.008452 | 12.97 | 1.774e+04 |
| agencies_per_1000_60plus | whitespace | yes | 0 | 100.0% | 0 | 1.29 | 9.957 |
| chronic_burden_composite | insurability | yes | 187 | 94.1% | 6.6 | 15.4 | 24 |
| risk_behaviour_composite | insurability | yes | 187 | 94.1% | 10.3 | 24.45 | 41.3 |
| expected_ownership_65 | size | no | 0 | 100.0% | 0.3581 | 0.4837 | 0.6304 |
| coverage_gap_households_60 | size | no | 0 | 100.0% | 3.949 | 1708 | 4.013e+05 |
| area_health_context | insurability | no | 188 | 94.0% | 6.6 | 15.46 | 24 |

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

1. Brunswick County, North Carolina - 91.42 (60+: 81,193)
1. Beaufort County, South Carolina - 90.51 (60+: 80,215)
1. Sumter County, Florida - 90.41 (60+: 103,924)
1. Washington County, Rhode Island - 90.40 (60+: 46,645)
1. Sussex County, Delaware - 89.81 (60+: 116,101)

Bottom 5 (eligible):

1. Desha County, Arkansas - 16.84 (60+: 3,004)
1. Reeves County, Texas - 16.57 (60+: 2,514)
1. Winn Parish, Louisiana - 15.41 (60+: 3,351)
1. Tunica County, Mississippi - 15.40 (60+: 2,003)
1. Dawson County, Texas - 15.13 (60+: 2,693)

