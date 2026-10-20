# MASTER BUILD PROMPT: "Senior Life Insurance Market Finder"

## 0. Role and mission

You are a principal-level data + full-stack engineer pairing with two senior engineers. Build, test, document and deploy a tool that finds and ranks the best US states and counties for selling life insurance to people over 60, using public data only. We must be able to explain and modify every line live in a 30-minute call. Quality bar: professional, reproducible, fast, and honest about uncertainty.

Required deliverables (all must exist at the end):

1. Working static web app (deployable URL) plus `make demo` locally.
2. Git repo with granular history (Conventional Commits, 60+ commits, no squash/force-push, ADRs in docs/adr/).
3. docs/ONE_PAGER.md (~450 words: sources and why, scoring method, next month, where AI helped/failed) plus PDF export.
4. docs/DEMO_SCRIPT.md (timed, 5:00 max), docs/AI_LOG.md, docs/LIVE_CHANGE_PLAYBOOK.md, docs/METHODOLOGY.md.

## 1. Parameters (override with the interviewer's answers if I provide them)

TARGET_AGE_MIN=60 (size); economic profiling uses 65+ householder tables where 60-64 is unavailable. GEOGRAPHY=50 states + DC, ~3,144 county-equivalents; PR supported but excluded by default. LENSES=[balanced, final_expense, legacy_wealth, spouse_protection]. ACS_VINTAGE=latest county-complete 5-year (2020-2024 as of Oct 2026; the 2025 1-year is scheduled Oct 29, 2026 and the 5-year is TBD, so freeze 2020-2024 and make it a config value). POPEST_VINTAGE=2025.

## 2. Non-negotiable rules

R1 Public data only. No PII, no scraping behind logins, respect ToS and rate limits, record each source's license/attribution.
R2 NEVER invent identifiers. Every API variable, dataset ID, URL and column name must be verified live (metadata endpoint or file header) and recorded in data/manifest.json (url, sha256, retrieved*at, vintage). If the network is blocked, stop and tell me exactly which files to download manually.
R3 All metrics live in config/metrics.yaml (id, label, source, table/field, vintage, geography, direction, transform, per-lens weight, MOE method, unit, caveats). Pipeline, scoring, UI and docs derive from it.
R4 Scoring is a pure function. Provide a Python reference implementation and a TypeScript port with a golden-file parity test (<=1e-9).
R5 Every score decomposes into per-metric contributions that sum exactly to the total.
R6 No silent imputation: add imputed*\* and low_confidence flags and report counts in the QA output.
R7 Never use race, ethnicity, national origin, religion or disability status in scoring or filtering. State this in METHODOLOGY.md.
R8 Boring, explainable code: small functions (<=60 lines), type hints, tests, no clever metaprogramming.
R9 Log every AI/tooling mistake you catch (what happened, how detected, fix) in docs/AI_LOG.md as it happens.
R10 Pin exact dependency versions; install the latest stable and check release dates (avoid releases under 14 days old).

## 3. Phases (finish each with a status report: done, verified, risks, next; ask me only if blocked, otherwise decide and write an ADR)

### Phase 0: Recon and scaffold

Verify network access and each source below. Scaffold: Python 3.12 + uv, DuckDB, Polars, httpx with caching, pandera, pdfplumber, pytest, ruff, mypy, Makefile (data|build|web|test|demo), Vite + React + TypeScript + Tailwind + shadcn/ui, TanStack Table/Virtual, Zustand/nuqs, ECharts (tree-shaken), d3-geo, GitHub Actions CI. Commit the scaffold and ADR-001 (target definition).

### Phase 1: Backbone data

- Census Population Estimates Vintage 2025 county files (CC-EST2025-AGESEX and SYASEX): 60+/65+/70+/75+ counts, 2020->2025 growth.
- ACS 2020-2024 5-year via API. Resolve variables from variables.json. Candidate tables to confirm: B01001, B19037, B19049, B17001, B25007, B25077, B25093, B28005, B11007, B09021, B16004, B18101. Pull estimates AND margins of error. Handle sentinel values (-666666666 etc.) as NULL with a reason code.
- Geography: us-atlas counties-albers-10m for the map, Census land area for density.
- Geography traps: keep FIPS as 5-char strings; Connecticut uses 9 planning regions in ACS 2022+ while other sources (e.g., IRS) may use legacy counties, so build a town-based crosswalk and document it; handle Virginia independent cities and renamed counties (e.g., Oglala Lakota SD, Kusilvak AK).

### Phase 2: Differentiator data

- SSA OASDI Beneficiaries by State and County 2025 (one PDF per state at ssa.gov/policy/docs/statcomps/oasdi_sc/2025/{st}.pdf): parse with pdfplumber, reconcile sums to state totals, extract beneficiaries and share of 65+ receiving benefits.
- IRS SOI county data (latest tax year; check the documentation guide for field codes): AGI, interest, dividends, IRA distributions, pensions, taxable Social Security by county. Note ZIP-based assignment, <20-return suppression and the $200k+ top bracket.
- Elder Index (elderindex.org): county basic-cost values for the relevant household scenarios; compute income/Elder Index headroom. Check download/API terms.
- County Business Patterns (latest) and Nonemployer Statistics for NAICS 524210: agencies per 1,000 aged 60+.
- CDC PLACES county data (resolve the latest release dynamically; release year != data year; adults 18+, label as area health context).
- CDC WONDER deaths aged 65+ per 1,000 (handle suppression of counts <10; flag unreliable rates).
- BEA CAINC4 dividends/interest/rent per capita; FCC broadband availability (county). Verify each; skip with an ADR if inaccessible.
- Priors (national, not local): LIMRA/Life Happens 2026 Insurance Barometer (ownership by income band; attribution line "Source: 2026 Insurance Barometer Study, LIMRA and Life Happens" on the methodology page; the survey covers ages 18-75), SCF 2025 public data (verify variable names for life insurance holdings), BLS Consumer Expenditure Survey (life and other personal insurance by age/income).
- Produce data/qa_report.md: row counts (~3,144 county-equivalents), missingness per metric, outliers, joins that failed, imputation counts.

### Phase 3: Scoring engine

- Transforms: winsorize 1-99%, log for heavy tails, percentile rank (robust-z as a toggle). Aggregate numerators/denominators, never rates or medians.
- Sub-scores: Size, Affordability, Need, Reachability, Whitespace, Insurability, with the metrics and default weights in metrics.yaml. Balanced weights: 30/25/15/15/10/5. Provide the other lenses (insurability flips sign for guaranteed-issue final expense). Document every weight as a prior.
- Eligibility: default >=2,000 residents aged 60+; below that, show but do not rank.
- State rollup: population-weighted sub-scores + "depth" (share of 60+ residents in top-tier counties); two views, Volume and Efficiency.
- Synthetic estimation: expected ownership from income-band rates, coverage-gap households, premium pool; labeled "modeled prior".
- Uncertainty: derived-estimate MOEs via Census formulas; empirical-Bayes shrinkage for noisy rates (flagged); Monte Carlo (500 draws: sample metrics from Normal(est, MOE/1.645), perturb weights with a Dirichlet) -> rank_p05, rank_p50, rank_p95, p_top50.
- Validation: naive-baseline comparison (Kendall tau), leave-one-metric-out, property tests (monotonicity, permutation and weight-scale invariance), qualitative sanity cases (The Villages FL, Mississippi Delta, LA/Cook).
- calibrate.py: fits weights if aggregated outcomes are supplied (constrained regression). Document it as unused without data.

### Phase 4: Web app

Views: (1) answer-first home with top 10 states/counties, lens switch, map; (2) virtualized ranking table with score bars, rank whiskers, confidence badges, CSV export; (3) county drawer ("Why this score?": exact contribution waterfall, percentile bars vs state and nation, age pyramid, 60+ growth sparkline, lookalike counties, confidence, printable market brief); (4) volume-vs-efficiency scatter with quadrants; (5) compare view (2-4 areas); (6) sensitivity view with live weight sliders; (7) methodology and data-lineage page generated from metrics.yaml. Show "Index (US=100)" for metrics.
Map: d3-geo on canvas, pre-projected us-atlas, quadtree hit-testing, colorblind-safe sequential palette. Scoring in a Web Worker on typed arrays; URL-encoded state; dark/light mode; WCAG 2.2 AA (keyboard, table equivalents for charts); responsive.

### Phase 5: Performance, tests, CI

Budgets: LCP <1.5s on 4G, TBT <100ms, initial JS <250KB gzipped, data <100KB brotli; enforce with Lighthouse CI + size-limit. Tests: pipeline schemas, FIPS integrity, MOE unit tests, golden county values, Python<->TS parity, property tests, Playwright smoke (load, change lens, open a county).

### Phase 6: Docs and live-change readiness

README (one-command setup), METHODOLOGY.md, ONE_PAGER.md + PDF, DEMO_SCRIPT.md (0:00-5:00 timed), AI_LOG.md, LIVE_CHANGE_PLAYBOOK.md with step-by-step recipes for: change 60->65, change a weight/lens, add a metric, swap the ACS vintage, add a state filter/column, exclude PR/DC, change the color scale. Verify each recipe works in <5 minutes from a clean checkout.

## 4. Definition of done

All tests green; `make data && make build && make web` works from scratch; manifest complete; QA report reviewed; budgets met; every metric documented; ONE_PAGER and DEMO_SCRIPT written; AI_LOG has real entries; tag v1.0. Never mark a phase done without running its tests.
