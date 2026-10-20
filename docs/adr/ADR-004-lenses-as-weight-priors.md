# ADR-004: Lenses as documented weight priors, with insurability sign flip

- Status: Accepted
- Date: 2026-10-20
- Owners: Insurvas data team

## Context

Different products (final expense / guaranteed issue, simplified-issue whole
life, term, IUL) and different decisions (media spend, recruiting, product
focus) imply different trade-offs. Encoding one "true" weighting would hide that
judgement inside the code.

## Decision

1. Four+ switchable lenses are declared in `config/metrics.yaml` as sub-score
   weight presets: `volume` (default), `balanced`, `final_expense`,
   `legacy_wealth`, `spouse_protection`. Each lens's weights sum to exactly 1.0
   and are documented as **priors, not truths**.
2. The `final_expense` lens sets `flip_insurance_sign: true`. For
   guaranteed-issue products there is no underwriting, so higher area disease
   burden is neutral-to-positive (larger need) rather than a negative. The
   insurability sub-score is sign-flipped for that lens only.
3. The sensitivity view lets users move sub-score and metric weights live and
   re-ranks, so the priors can be stress-tested in front of an audience.
4. Every contribution is reported, and contributions sum exactly to the total
   (rule R5).

## Consequences

- Lens choice changes ranks, sometimes materially. This is a feature: it makes
  the assumption visible instead of burying it. The sensitivity view and the
  Monte Carlo rank bands quantify how much the choice matters.
- A `final_expense` flip means the same county can be penalised under
  `balanced` and rewarded under `final_expense` for the same health context.
  The UI must therefore always show which lens produced a rank.
- New lenses are a config edit, not a code change; the scorer reads the lens
  map generically, and a test asserts weights sum to 1.0.
