# Senior Life Insurance Market Finder: Analysis, Blueprint and Master Prompt

Prepared October 20, 2026. Source statuses were checked against public releases on this date; items marked “verify” come from general knowledge and must be confirmed in the pipeline. Source links are listed at the end.

## Key findings that shape the plan

- **ACS vintage.** The 2020-2024 ACS 5-year estimates (released January 29, 2026) are the latest county-complete vintage. The 2025 ACS 1-year release is scheduled for October 29, 2026 after a delay, the 5-year release date is still TBD, and the 1-year only covers geographies of 65,000+ people, so it cannot rank counties. Freeze 2020-2024 and make the vintage a config parameter.
- **Fresh calibration data.** The Federal Reserve published the 2025 Survey of Consumer Finances on October 9, 2026. Few submissions will use it.
- **Closest commercial analogue.** Esri’s Market Potential data includes a “Currently Carry Life Insurance” index, built by combining the MRI-Simmons consumer survey with Tapestry segmentation. That is synthetic estimation (national survey rates applied to local demographics), and it can be replicated openly.

## 1. What this task is really testing

The brief is underspecified on purpose: “best is up to you”, questions due in 48 hours, “explain and change every line”, and “where AI got it wrong”. The rubric is almost certainly:

1. **Framing.** Which questions you ask and how you define “best”.
2. **Data judgment.** Right sources, right vintages, honest limits.
3. **A defensible, explainable score.**
4. **Engineering hygiene**, visible in the commit history.
5. **Communication.** The video and the one-pager.
6. **Ownership under live change.**

A plain app with a sharp model and mutable code beats a flashy map with an opaque score. Optimize for four things: an answer-first UI, transparent methodology, uncertainty-aware ranking, and code you can change in five minutes.

## 2. Questions to send now (48-hour window)

Each question has a default, so you can proceed and state the assumption in the write-up if they do not answer.

| # | Question | Default if unanswered |
| --- | --- | --- |
| 1 | Is “over 60” 60+ or 65+? Is there an upper bound, such as 80+, for insurability? | 60+ for size, 65+ for economic profiling (most ACS tables bin householders as 65+) |
| 2 | Which products matter most (final expense/guaranteed issue, simplified-issue whole life, term, IUL)? | All four, as switchable “lenses” |
| 3 | What decision does this drive: media spend, agent licensing/recruiting, or product focus? | Marketing allocation |
| 4 | Do you want volume (biggest pools) or efficiency (best prospects per dollar), or both? | Both, as a toggle |
| 5 | Which states are you licensed in? Any exclusions, DC or PR? | 50 states + DC |
| 6 | What is the channel mix (digital, direct mail, TV, phone, field agents)? | Mixed; reachability is a weighted component |
| 7 | Is competitor density a negative (saturation) or a positive (proof of demand)? | Negative, with a toggle |
| 8 | Do you have aggregated, non-PII performance by state or county to calibrate against? | No; ship a calibration hook |
| 9 | May demographic proxies such as race, ethnicity or language be used? | Excluded from scoring (unfair-discrimination risk), shown as context only |
| 10 | Is a static snapshot acceptable, or should it refresh automatically? | Static, vintage-pinned, refresh-ready |
| 11 | Who is the audience: marketing managers or analysts? | Marketing lead, with analyst drill-down |
| 12 | Any hosting, stack or format constraints for the write-up and video? | Public static URL, PDF one-pager |

## 3. Research design

### 3.1 Definition of “best”

Opportunity is the expected value of a marketing dollar in an area, not the number of older people. Conceptually:

**Opportunity = Market size × Ability to pay × Need × Reachability × Whitespace, adjusted for insurability.**

Implement it as a transparent weighted sum of sub-scores so every line can be explained live:

`Score = 100 · Σ w_k(lens) · S_k`

| Sub-score | Candidate metrics (verify table IDs via `variables.json`) | Default weight (Balanced) |
| --- | --- | --- |
| **Size** | log(60+ pop), 60+ share, 2020 to 2025 growth of 60+ | 30 |
| **Affordability** | 65+ householder median income ÷ Elder Index cost, share of 65+ households at or above $75k, IRS interest + dividends + IRA/pension per return, SSA average benefit, share of 65+ owners with no mortgage × median home value | 25 |
| **Need** | Share of 60+ living with a spouse, share of 65+ owners with a mortgage, deaths per 1,000 aged 65+ (CDC WONDER) | 15 |
| **Reachability** | 65+ internet subscription, broadband availability, English proficiency, 60+ per square mile | 15 |
| **Whitespace** | (Employer agencies NAICS 524210 + nonemployer agencies) per 1,000 aged 60+, inverted | 10 |
| **Insurability** | Chronic-condition burden (PLACES), disability share; lower is better in underwritten lenses | 5 |

**Lenses** are four weight presets: Balanced, Final Expense, Legacy/Wealth, and Spouse/Mortgage Protection. Insurability flips sign by lens: for guaranteed-issue final expense, higher disease burden is neutral or positive because there is no underwriting. Treat all weights as priors, not truths; the sensitivity analysis shows how much they matter.

### 3.2 Scaling and aggregation

- **Scaling.** Winsorize at 1–99%, log-transform heavy-tailed variables, then take percentile rank (v1). Offer robust z-score as a toggle and record the choice in an ADR. Min-max on raw values lets Los Angeles County dominate.
- **Rates.** Aggregate numerators and denominators, never the percentages. Never average medians to a state; recompute them or weight them explicitly.
- **States.** Roll up from counties using population-weighted sub-scores plus “depth” (the share of 60+ residents living in top-tier counties). Show two state views, Volume (total pool) and Efficiency (quality per resident), with a quadrant scatter: Scale & Quality, Niche Gems, Big but Thin, Skip.
- **Eligibility.** Default to counties with at least 2,000 residents aged 60+. Counties below that are shown but flagged and unranked.

### 3.3 Uncertainty and sensitivity

- **ACS margins of error (MOE).** Use the Census formulas: the square root of summed squared MOEs for sums, and the proportion formula, falling back to the ratio formula when the radicand goes negative.
- **Monte Carlo.** Offline, about 500 draws. Each samples ACS metrics from Normal(estimate, MOE/1.645), since ACS MOEs are at 90% confidence, and perturbs the weights with a Dirichlet around the defaults, then recomputes ranks. Ship `rank_p05`, `rank_p50`, `rank_p95` and `p_top50`.
- **UI.** Show rank whiskers and a “robust pick” badge when P(top-50) is at least 0.8.
- **Small counties.** Apply empirical-Bayes shrinkage toward the state mean for noisy rates. Flag shrunk and imputed values; never impute silently.

### 3.4 Synthetic estimation

- **Expected ownership.** Apply national ownership by income band to each county’s income distribution. LIMRA’s 2026 Barometer shows ownership rising sharply with income: 29% for households under $50K, and one summary reports 64% at $150K+. Overall ownership is 52%, and the survey covers adults 18 to 75, so use the SCF (or HRS) for older ages.
- **Coverage-gap households** = households aged 60+ × (1 − expected ownership).
- **Premium pool.** Take BLS Consumer Expenditure Survey spend on “life and other personal insurance” by age and income, and apply it to local households. Esri’s Consumer Spending product follows the same logic, built from Consumer Expenditure Surveys.
- **Labeling.** Label all of these “modeled prior, not observed”.

### 3.5 Validation without sales data

1. Check qualitative behavior. The Villages (Sumter County, FL) should score high on affordability and low on whitespace. Mississippi Delta counties should score low on affordability. LA and Cook should be large but thin on efficiency.
2. Run property tests: more income never lowers the score, and weight scaling is invariant.
3. Run leave-one-metric-out and compare against naive baselines (60+ population only) using Spearman or Kendall τ. This shows the model adds something.
4. Ship `calibrate.py`: if the company supplies aggregated conversion or premium by state, fit weights (constrained regression) and report the lift.

### 3.6 Guardrails

- Exclude protected-class variables from scoring and filtering.
- State explicitly that this is a prioritization tool, not an eligibility tool.
- Mention that insurers face unfair-discrimination rules, senior-protection rules and AI-governance expectations (from general knowledge; verify current status).

## 4. Data sources

### Tier 1: backbone

| Source | Use | Verified status |
| --- | --- | --- |
| **Census Population Estimates, Vintage 2025** (CC-EST2025-AGESEX, CC-EST2025-SYASEX) | 60+ counts and growth. Single-year-of-age lets you cut 60+, 65+, 70+, 75+ freely. | Released June 25, 2026, covering April 2020 to July 2025. County files include the selected-age-group and single-year-of-age datasets. |
| **ACS 2020-2024 5-year** (API, `variables.json`) | Income, tenure, mortgage, poverty, internet, household type, language, MOEs | Released January 29, 2026; available in data.census.gov, the API and the Summary File. |
| **us-atlas / TIGER** | `counties-albers-10m.json` (pre-projected, with Alaska/Hawaii insets, no tile server); land area for density | Stable |

Candidate ACS tables, all to be verified against `variables.json`: B01001 (sex by age), B19037/B19049 (income by age of householder), B17001 (poverty by age), B25007 (tenure by age of householder), B25077 (median home value), B25093 (owner costs as a share of income), B28005 (internet by age), B11007 (households with someone 65+), B09021 (living arrangements), B16004 (language by age), B18101 (disability). Note that 60–64 appears in B01001 and B25007, but most economic tables bin householders as 65+, so handle this deliberately. S0102 (“Population 60 Years and Over”) existed in older vintages, but its availability for the current vintage was not confirmed, so do not depend on it.

### Tier 2: differentiators (the “hidden 1%”)

| Source | Why it is special | Notes |
| --- | --- | --- |
| **SSA OASDI Beneficiaries by State and County** | Actual benefit receipt by county, including the share of 65+ residents receiving benefits | The 2025 edition reports December 2025 data, one PDF per state (`ssa.gov/policy/docs/statcomps/oasdi_sc/2025/{st}.pdf`). Parse with pdfplumber and reconcile to state totals. Few people bother. |
| **Elder Index (UMass Boston)** | Basic cost of living for older adults by county. Income ÷ Elder Index gives “headroom”, a better affordability measure than raw income. | 18 scenarios, 3,144 counties and equivalents, updated annually at elderindex.org. Check download or API terms. |
| **IRS SOI county data** | Interest, dividend, IRA, pension and taxable Social Security income: wealth-composition signals | Tax Year 2023 is available. Counties are assigned from the ZIP on the return, items with fewer than 20 returns are suppressed, and the top AGI bracket is $200,000 or more. |
| **County Business Patterns + Nonemployer Statistics, NAICS 524210** | Competitor density. Nonemployer data matters because many independent agents are self-employed and CBP undercounts them. | CBP 2023 was released June 26, 2025 on 2017 NAICS. Check whether 2024 is out. |
| **CDC WONDER (underlying cause of death)** | Deaths among 65+ per county: a final-expense event rate | Suppresses small counts and flags unreliable rates (verify exact rules). |
| **BEA CAINC4** | Dividends, interest and rent per capita: a wealth proxy | From general knowledge; verify the latest vintage. |
| **CDC PLACES** | Health context (insurability) | The 2025 release uses BRFSS 2023 for 35 measures and 2022 for 5. Release year is not data year. Estimates describe the county’s adults, not seniors specifically, so label them “area health context”. Resolve the latest release dynamically. |
| **FCC National Broadband Map** | County-level broadband availability | Verify the current release |

### Priors and calibration (national, not local)

- **LIMRA/Life Happens Insurance Barometer 2026.** Attribution is required on all uses of their toolkit: “Source: 2026 Insurance Barometer Study, LIMRA and Life Happens.” Put that line on the methodology page. It also finds that 43% of consumers research life insurance online but ultimately buy in person, which is useful for the channel discussion.
- **SCF 2025.** Wealth and holdings by age, including 75+, which the Barometer lacks.
- **HRS.** Believed to have life-insurance questions for ages 50+ (verify the module).
- **BLS Consumer Expenditure Survey.** Spend by age and income.

### Optional context

- **AHRQ SDOH database.** A pre-joined county table; a copy of county SDOH data is archived on openICPSR, which is useful when federal sites change. Use it to cross-check your own joins, not as your sole source.
- County Health Rankings, CDC SVI, USDA Rural-Urban Continuum Codes, IRS county-to-county migration (retiree inflow as a leading indicator), and CMS Medicare Geographic Variation (verify availability).

### Do not count on

- State-level premium and market-share data (NAIC, S&P) is mostly paid.
- Consumer lists (Data Axle and similar) violate the no-PII rule.

### Data traps (each is a good “AI got it wrong” story)

1. **Connecticut.** The 2022 ACS products replaced CT’s eight counties with nine planning regions as county-equivalents, while other sources such as IRS data may still use legacy counties. Both geographies are town-based, so you can crosswalk by summing town data. Comparison profiles for CT will not be consistent until the 2027 ACS release.
2. **FIPS handling.** Keep codes as 5-character strings. Watch Virginia’s independent cities, Alaska’s changed boroughs, and renamed counties such as Oglala Lakota (SD) and Kusilvak (AK).
3. **ACS sentinels.** Values like `-666666666` are annotations, not numbers. Controlled estimates have no MOE.
4. **Ecological fallacy.** Aggregate numerators and denominators, not rates or medians.
5. **Vintage mixing.** ACS 5-year covers 2020–2024, population estimates are July 2025, IRS is TY2023, and SSA is December 2025. Show the vintage per metric and do not imply they align.
6. **Territories.** Decide on Puerto Rico municipios (default: excluded, supported).
7. **Modifiable areal unit.** Counties range from Loving, TX to Los Angeles County. Mention DMA/CBSA roll-up as next-month work.

## 5. Stack and architecture

**Decision: a Python data pipeline that precomputes everything, plus a static React app. No backend.** With about 3,144 rows, interactivity (weights, lenses, filters) runs in the browser in under 5 ms. This minimizes failure modes in a live demo and makes the live change trivial.

| Layer | Choice | Why |
| --- | --- | --- |
| Pipeline | Python 3.12, `uv`, DuckDB + Polars, `httpx` with a cache, `pandera`, `pdfplumber` | SQL transforms are explainable; schema contracts catch drift |
| Reproducibility | `data/manifest.json` (URL, sha256, retrieved\_at, vintage), Makefile or `just` | “Rebuild from scratch” is one command |
| Scoring | Python reference implementation plus a TypeScript port, with a golden-file parity test | One source of truth in `config/metrics.yaml` |
| Frontend | Vite + React + TypeScript, Tailwind + shadcn/ui, TanStack Table/Virtual, Zustand or nuqs for URL state | Fastest to build and mutate; shareable URLs. Pick Next.js only if you want server-rendered OG images. |
| Map | d3-geo on `<canvas>` with a quadtree for hit-testing, using pre-projected us-atlas | No basemap tiles, no API keys, about 60 fps, every line explainable |
| Charts | ECharts (tree-shaken) or visx; pick one | Brush, tooltips and canvas scatter for 3k points out of the box |
| Hosting | Vercel or Cloudflare Pages (static) | Zero ops |
| CI | GitHub Actions: ruff, mypy, pytest, vitest, Playwright smoke, Lighthouse CI + size-limit | Visible quality |

**Do not over-engineer.** DuckDB-WASM, PMTiles and tract-level drill-down are justified only for the “next month” section.

### Repo layout

```
.
├── config/metrics.yaml          # single source of truth: id, source, table, vintage, direction, transform, lens weights, MOE method
├── pipeline/
│   ├── fetch/                   # one module per source (census_acs.py, popest.py, ssa_pdf.py, irs_soi.py, ...)
│   ├── transform/               # geography.py (FIPS, CT crosswalk), metrics.py, moe.py, shrink.py
│   ├── score/                   # reference scoring, lenses, montecarlo.py
│   ├── qa/                      # pandera schemas, coverage report
│   └── build.py
├── data/                        # raw gitignored; manifest.json committed
├── web/
│   ├── public/data/             # counties.json (columnar), states.json, meta.json, topo.json
│   └── src/                     # score.ts, workers/, views/, charts/
├── tests/                       # pipeline, parity, property-based
├── docs/                        # adr/, METHODOLOGY.md, ONE_PAGER.md, DEMO_SCRIPT.md, AI_LOG.md, LIVE_CHANGE_PLAYBOOK.md
└── Makefile                     # make data | build | web | test | demo
```

### Performance tricks

- **Data shape.** Ship columnar, typed-array-friendly JSON: about 400 KB raw and under 100 KB with brotli. Preload it.
- **Scoring.** Compute in a Web Worker on typed arrays (under 5 ms for 3k rows). Drive sliders with `requestAnimationFrame` and `useDeferredValue`.
- **Rendering.** Paint the choropleth to an offscreen canvas and redraw only the fill on score change. Keep the hit-test geometry static.
- **Table.** Virtualize it. Code-split heavy charts. Subset the variable font with `font-display: swap`.
- **Budgets.** LCP under 1.5 s on 4G, TBT under 100 ms, initial JS under 250 KB gzipped, enforced in CI.

### Testing

- **Pipeline:** FIPS uniqueness, expected row count (about 3,144 county-equivalents; DC included), value ranges, MOE unit tests, and golden values for a few known counties.
- **Scoring:** parity test (Python vs TypeScript to 1e-9), plus property tests (monotonicity, permutation invariance, weight-scale invariance).
- **UI:** a Playwright smoke test (load, change lens, open a county).

### Git discipline

Aim for 60+ small commits in Conventional Commits format, with no squash and no force-push. Add ADRs for the key decisions: target age, scaling method, lens design, no-backend. Commit the manifest and QA reports. Log AI mistakes in `AI_LOG.md` as they happen.
