# ADR-003: Percentile-rank scaling after winsorisation

- Status: Accepted
- Date: 2026-10-20
- Owners: Insurvas data team

## Context

Metrics have wildly different units and distributions: population counts span
six orders of magnitude (Loving, TX versus Los Angeles, CA), incomes are heavy
tailed, and shares are bounded. Any linear combination needs a common scale.

Candidates considered:

1. **Min-max on raw values.** Trivially lets Los Angeles dominate every metric
   and makes every score a function of one or two extreme counties.
2. **Robust z-score.** Better, but still unbounded and hard to explain live
   ("why is this county 6.2 sigmas?").
3. **Percentile rank.** Bounded in [0, 1], monotone, robust to outliers, and
   trivially explainable: "this county is at the 91st percentile for 60+
   population".

## Decision

For v1, every scored metric is:

1. winsorised at the 1st and 99th percentiles (`params.winsor_*`),
2. log-transformed when flagged heavy-tailed (`transform: log`), then
3. converted to a **percentile rank** in [0, 1].

Direction is applied after ranking: for `lower_is_better` metrics the rank is
reversed so that higher always means better. The robust z-score remains an
available transform and is recorded here as the documented alternative.

## Consequences

- Scores are cardinal in rank space, not in the original units. A one-point
  score difference is a percentile difference, which is easy to explain and
  hard to misread as a dollar figure.
- Percentile rank discards the magnitude of gaps (the top two counties are
  adjacent even if their populations differ by millions). Volume levels are
  therefore shown alongside, not inferred from the score.
- Winsorisation bounds the influence of outliers but is a deliberate data
  modification; it is listed in `qa_report.md` and in the methodology page.
- Because ranks are computed over the eligible universe, adding or removing
  counties shifts all scores. The universe (50 states + DC, >= 2,000 aged 60+)
  is fixed in config and stated in the UI.
