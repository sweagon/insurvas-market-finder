# ADR-001: Target definition and default lens (Volume)

- Status: Accepted
- Date: 2026-10-20
- Owners: Insurvas data team

## Context

The brief is deliberately under-specified. "Best" depends on the decision the
ranking drives: media spend, agent licensing/recruiting, or product focus. The
stakeholder answered the 48-hour questionnaire directly:

- Volume ("biggest pools") over efficiency when forced to choose.
- All channels (digital, direct mail, TV, phone, field), so no single channel
  may dominate reachability.
- Dynamic, refreshable data rather than a frozen snapshot.
- No hosting or stack constraints.

## Decision

1. **Target age.** Size is framed on residents aged **60+** (rule in brief).
   Economic profiling uses **65+** householder tables because the ACS bins most
   economic tables at 65+ and 60-64 is not available in those tables.
2. **Default lens = `volume`.** The home page answers "where are the biggest
   60+ pools?" first. Efficiency (quality per resident) remains a first-class
   toggle and quadrant view, not the default.
3. **Six sub-scores** (size, affordability, need, reachability, whitespace,
   insurability) as a transparent weighted sum, so every rank is explainable.
4. **Eligibility.** Counties with fewer than 2,000 residents aged 60+ are shown
   but not ranked (below that, estimates are dominated by noise).
5. **Reachability is multi-channel.** It uses internet subscription (digital)
   and 60+ density (mail/field/TV economics). It does not encode a single
   channel, honouring "all channels".
6. **Dynamic, not frozen.** The pipeline is refreshable; the app reads a live
   backend that can rebuild from sources on a schedule or on demand.

## Consequences

- Volume can reward Los Angeles County simply because it is huge. That is
  intended for a marketing-allocation question, and it is why efficiency and
  rank-uncertainty are always visible next to every volume rank.
- Using 60+ for size and 65+ for economics is a deliberate, documented mismatch
  rather than a silent one; the vintage and age basis are shown per metric.
- Because Volume is the default, the composite emphasises `size` (40%). The
  other four lenses rebalance without changing the underlying metric set.
