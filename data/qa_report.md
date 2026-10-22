# Data QA report

Generated: 2026-10-22T09:23:10.267261+00:00
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
| ssa_beneficiary_share_65plus | need | yes | 0 | 100.0% | 90% | 0.6861 | 0.9011 | 0.9918 | ok |
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
| ssa_oasdi | ssa_beneficiary_share_65plus | 100.0% |

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
| ssa_beneficiary_share_65plus | 32 | 32 |
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
| imputed_ssa_share | 101 | 3.21% |
| shrunk_ssa_share | 245 | 7.79% |
| imputed_irs_investment_income_per_return | 0 | 0.00% |
| shrunk_agencies | 65 | 2.07% |
| shrunk_chronic | 252 | 8.02% |
| shrunk_risk | 252 | 8.02% |

## SSA OASDI cross-check

SSA publishes the share of the 65+ population receiving benefits for every state. The county table is summed back to the state and compared with that published share, which is an independent check on the parse: the fetch fails the build when the two drift more than 1%.

| state | counties | beneficiaries 65+ | SSA 65+ population | SSA published share | implied | drift |
| --- | --- | --- | --- | --- | --- | --- |
| Alabama | 67 | 902,540 | 1,009,814 | 89.4% | 902,774 | 0.026% |
| Alaska | 30 | 100,050 | 116,192 | 86.1% | 100,041 | 0.009% |
| Arizona | 15 | 1,313,870 | 1,571,773 | 83.6% | 1,314,002 | 0.010% |
| Arkansas | 75 | 545,090 | 591,966 | 92.1% | 545,201 | 0.020% |
| California | 58 | 5,775,470 | 6,901,168 | 83.7% | 5,776,278 | 0.014% |
| Colorado | 64 | 884,780 | 1,029,188 | 86.0% | 885,102 | 0.036% |
| Connecticut | 9 | 644,380 | 751,845 | 85.7% | 644,331 | 0.008% |
| Delaware | 3 | 214,075 | 241,321 | 88.7% | 214,052 | 0.011% |
| District of Columbia | 1 | 71,031 | 94,423 | 75.2% | 71,006 | 0.035% |
| Florida | 67 | 4,402,390 | 5,346,788 | 82.3% | 4,400,407 | 0.045% |
| Georgia | 159 | 1,631,310 | 1,884,140 | 86.6% | 1,631,665 | 0.022% |
| Hawaii | 5 | 268,660 | 324,150 | 82.9% | 268,720 | 0.022% |
| Idaho | 44 | 346,060 | 379,157 | 91.3% | 346,170 | 0.032% |
| Illinois | 102 | 2,027,445 | 2,379,145 | 85.2% | 2,027,032 | 0.020% |
| Indiana | 92 | 1,165,700 | 1,284,435 | 90.8% | 1,166,267 | 0.049% |
| Iowa | 99 | 589,295 | 649,656 | 90.7% | 589,238 | 0.010% |
| Kansas | 105 | 501,105 | 561,319 | 89.3% | 501,258 | 0.030% |
| Kentucky | 120 | 787,720 | 868,019 | 90.7% | 787,293 | 0.054% |
| Louisiana | 64 | 758,375 | 868,225 | 87.3% | 757,960 | 0.055% |
| Maine | 16 | 313,655 | 347,617 | 90.2% | 313,551 | 0.033% |
| Maryland | 24 | 940,970 | 1,149,859 | 81.8% | 940,585 | 0.041% |
| Massachusetts | 14 | 1,167,530 | 1,421,793 | 82.1% | 1,167,292 | 0.020% |
| Michigan | 83 | 1,889,465 | 2,076,467 | 91.0% | 1,889,585 | 0.006% |
| Minnesota | 87 | 990,580 | 1,113,573 | 89.0% | 991,080 | 0.050% |
| Mississippi | 82 | 520,730 | 571,344 | 91.1% | 520,494 | 0.045% |
| Missouri | 115 | 1,109,035 | 1,230,134 | 90.2% | 1,109,581 | 0.049% |
| Montana | 56 | 226,295 | 253,772 | 89.2% | 226,365 | 0.031% |
| Nebraska | 93 | 322,080 | 368,331 | 87.4% | 321,921 | 0.049% |
| Nevada | 17 | 520,595 | 599,211 | 86.9% | 520,714 | 0.023% |
| New Hampshire | 10 | 289,905 | 325,383 | 89.1% | 289,916 | 0.004% |
| New Jersey | 21 | 1,494,140 | 1,767,250 | 84.5% | 1,493,326 | 0.054% |
| New Mexico | 33 | 388,515 | 448,253 | 86.7% | 388,635 | 0.031% |
| New York | 62 | 3,201,775 | 3,860,551 | 82.9% | 3,200,397 | 0.043% |
| North Carolina | 100 | 1,894,470 | 2,119,438 | 89.4% | 1,894,778 | 0.016% |
| North Dakota | 53 | 127,690 | 143,139 | 89.2% | 127,680 | 0.008% |
| Ohio | 88 | 2,098,705 | 2,398,129 | 87.5% | 2,098,363 | 0.016% |
| Oklahoma | 77 | 668,060 | 741,085 | 90.1% | 667,718 | 0.051% |
| Oregon | 36 | 809,325 | 898,568 | 90.1% | 809,610 | 0.035% |
| Pennsylvania | 67 | 2,470,285 | 2,799,790 | 88.2% | 2,469,415 | 0.035% |
| Rhode Island | 5 | 200,755 | 233,061 | 86.1% | 200,666 | 0.045% |
| South Carolina | 46 | 1,058,995 | 1,173,259 | 90.3% | 1,059,453 | 0.043% |
| South Dakota | 66 | 172,310 | 181,082 | 95.2% | 172,390 | 0.046% |
| Tennessee | 95 | 1,232,290 | 1,360,588 | 90.6% | 1,232,693 | 0.033% |
| Texas | 254 | 4,047,560 | 4,711,381 | 85.9% | 4,047,076 | 0.012% |
| Utah | 29 | 400,455 | 460,179 | 87.0% | 400,356 | 0.025% |
| Vermont | 14 | 138,135 | 155,289 | 89.0% | 138,207 | 0.052% |
| Virginia | 133 | 1,414,905 | 1,633,891 | 86.6% | 1,414,950 | 0.003% |
| Washington | 39 | 1,285,540 | 1,460,563 | 88.0% | 1,285,295 | 0.019% |
| West Virginia | 55 | 365,035 | 398,189 | 91.7% | 365,139 | 0.029% |
| Wisconsin | 72 | 1,143,975 | 1,241,547 | 92.1% | 1,143,465 | 0.045% |
| Wyoming | 23 | 109,850 | 121,648 | 90.3% | 109,848 | 0.002% |

Worst state drift: **0.055%** (tolerance 1%).

## Eligibility

- Minimum 60+ population for ranking: **2,000**
- Eligible counties: **2680** of 3144 (85.2%)
- Excluded (below threshold): 464

## Contribution invariant (rule R5)

- `volume`: max |sum(contributions) - total| = 4.263e-14
- `balanced`: max |sum(contributions) - total| = 4.263e-14
- `final_expense`: max |sum(contributions) - total| = 4.263e-14
- `legacy_wealth`: max |sum(contributions) - total| = 4.263e-14
- `spouse_protection`: max |sum(contributions) - total| = 4.263e-14

**Invariant PASSED** (tolerance 1e-9, observed 4.263e-14).

## Rule R7 audit (protected attributes)

Protected-attribute columns present in the metric matrix: **0**

English-proficiency fields are stored as context only and are excluded from
scoring (see config `rule_R7`). No race/ethnicity/origin/religion/disability
field is read, scored, used as a filter, or displayed.

## Ranking sanity check (volume lens)

Top 5:

1. Sumter County, Florida - 90.35 (60+: 103,924)
1. Brunswick County, North Carolina - 90.20 (60+: 81,193)
1. Sussex County, Delaware - 89.82 (60+: 116,101)
1. Washington County, Rhode Island - 88.79 (60+: 46,645)
1. Beaufort County, South Carolina - 88.49 (60+: 80,215)

Bottom 5 (eligible):

1. Desha County, Arkansas - 18.56 (60+: 3,004)
1. Lincoln County, Arkansas - 18.16 (60+: 2,946)
1. Tunica County, Mississippi - 17.96 (60+: 2,003)
1. Dawson County, Texas - 16.64 (60+: 2,693)
1. Winn Parish, Louisiana - 16.39 (60+: 3,351)

