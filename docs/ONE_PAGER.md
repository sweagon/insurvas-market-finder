# Insurvas Market Finder - one page

**Question.** We sell life insurance to people over 60. There are 3,144 US counties
and roughly 85.7 million residents aged 60+; we cannot work them all. This tool ranks
every county by the size and quality of its 60+ opportunity, so a sales team can point
at the top 50 and defend why.

## Sources, and why these

We use **public data only**, each source chosen for a reason:

- **Census Population Estimates 2025** - county-complete counts of 60+/65+/70+/75+
  residents and 2020-2025 growth. It defines *size*.
- **ACS 2020-2024 5-year** - income, housing equity, living arrangements and internet
  access: the only county-complete source for affordability, need and reachability.
- **IRS SOI TY2023** - dividends, interest and IRA/pension income per return: a wealth
  signal the ACS median cannot see.
- **BEA CAINC4 2024** - dividends, interest and rent per capita, as a cross-check.
- **County Business Patterns 2023** - insurance agencies (NAICS 524210): the only
  public proxy for local competition, so it defines *whitespace*.
- **CDC PLACES 2025** - area chronic-condition and risk prevalence, used as health
  *context*, never as individual eligibility.

Sources that block automated access (SSA, Elder Index, CDC WONDER, FCC, BLS CE) are
**skipped with a written ADR, never faked**.

## Scoring method

Each metric is winsorised 1-99%, log-transformed where heavy-tailed, then
**percentile-ranked** so higher always means better. Ranks aggregate into six
sub-scores - **Size, Affordability, Need, Reachability, Whitespace, Insurability** -
combined with lens weights. The headline lens is **Volume** (biggest pools first);
four other lenses re-weight the same metrics for different plays. Every score
**decomposes exactly** into per-metric contributions (a tested invariant), and a
90% band from 500 Monte Carlo draws sits next to every number. Counties under 2,000
residents aged 60+ are shown but not ranked.

Hard line: **race, ethnicity, national origin, religion and disability are never used
in scoring or filtering**; the QA report fails the build if such a column appears
(rule R7).

## What we found

Volume puts Brunswick County NC, Beaufort SC and Sumter FL (The Villages) at the top -
retiree magnets, exactly what a sane model should surface. Final Expense moves the
ranking toward affordable, high-burden markets; Legacy Wealth toward wealthy metros.

## Next month

1. Request an ACS API key or roll the vintage forward to 2021-2025 (one-line recipe).
2. Build the Connecticut town crosswalk so tax-based metrics are measured, not imputed.
3. Add calibrated weights if any aggregated sales outcome is supplied (`calibrate.py`).
4. Deploy the container to a hosting URL (needs a Render/Fly token - the one open
   external blocker).

## Where AI helped / where it failed

**Helped:** scaffolding the pipeline fast; writing the Census MOE arithmetic; and
producing a TypeScript port of the scorer from the Python reference.

**Failed (all caught and logged in `docs/AI_LOG.md`):** the first scorer ranked
counties by row index because ranks were never scattered back after sorting; parity
silently broke for the one lens with a sign-flip flag; and the fetchers tripped over
latin-1 encoding, Puerto Rico's schema and quoted FIPS. Each was found by a sanity
check or a test, not by trust - which is the point. The parity test and the
contribution-sum invariant are the two guards that turned "looks plausible" into
"provably correct".
