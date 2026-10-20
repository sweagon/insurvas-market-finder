# Demo script (5:00 max)

Timed script for a live walkthrough. Open with `make demo` already running and the
browser at <http://localhost:8000>. Speak counts are approximate.

## 0:00-0:30 - The question

> "We sell life insurance to people over 60. There are 3,144 counties and we cannot
> work them all. The question is simple: where are the biggest pools of 60+ residents
> with the ability and need to buy - and how confident are we?"

Show the **home view**: national map + ranked table + lens switcher. The subtitle
reads "2,680 eligible counties".

## 0:30-1:15 - The default answer (Volume lens)

> "By default we answer the stakeholder's question - biggest pools first. That's
> Brunswick County, North Carolina; Beaufort, South Carolina; Sumter, Florida - The
> Villages. These are the retiree magnets we'd expect, which is a good sign the model
> is sane before we trust the surprises."

Point at the top of the table. Hover a county on the map to show the tooltip.

## 1:15-2:00 - Change the strategy live

Click through the lens buttons: **Balanced**, **Final Expense**, **Legacy Wealth**,
**Spouse Protection**.

> "The same six sub-scores, re-weighted. Final Expense flips the insurability sign -
> higher chronic-condition burden becomes a *positive* signal, because guaranteed-issue
> products sell into it. Volume favours big, dense markets; Legacy Wealth favours
> wealthy ones."

Note the ranking reshuffles in front of them.

## 2:00-2:45 - "Why this score?" (the differentiator)

Click **Sumter County, Florida** to open the drawer.

> "Every score decomposes exactly. Here's the waterfall: size and reachability carry
> it, whitespace pulls it down because The Villages is saturated with agents. The
> per-metric contributions sum to the total - not approximately, exactly. That's a
> tested invariant."

Point at the contribution bars and the 90% band on the score.

## 2:45-3:30 - Uncertainty, honestly

> "We don't hide noise. The band comes from 500 Monte Carlo draws that perturb each
> metric by its published margin of error and re-run the whole pipeline. Where a
> source has no margin of error, we use a documented coefficient of variation and say
> so - we never pretend precision we don't have."

Point at `p05-p95` and at the "live/snapshot" badge in the header.

## 3:30-4:15 - Config is the source of truth

Open `config/metrics.yaml` on screen.

> "Every metric, weight, lens and vintage lives here - one file. Nothing is hard-coded
> in the pipeline, the API or the UI. Want a weight changed? One number, rebuild.
> Want the ACS vintage bumped? One line. That's the live-change playbook."

Optional: run `make build-data` to show a rebuild end-to-end.

## 4:15-4:45 - Rule R7 and the honesty checks

> "One hard line: we never use race, ethnicity, national origin, religion or
> disability in scoring or filtering. The QA report scans every column and *fails the
> build* if one appears. Sources that block us - SSA, Elder Index, CDC WONDER - are
> skipped with a written ADR, never faked."

Show `data/qa_report.md`: coverage, imputed/shrunk counts, R7 audit = 0 columns.

## 4:45-5:00 - Close

> "Public data only, fully reproducible, every score explainable and every assumption
> documented. Python and TypeScript scorers are pinned together to 1e-9, so the number
> on the map is the number we can defend live."

---

### Backup talking points (if asked)

- **Python <-> TS parity**: `make parity` - golden files, `<= 1e-9` across all five
  lenses.
- **Connecticut**: planning regions, not legacy counties; town crosswalk in ADR-005.
- **Reproducibility**: `make setup && make demo` from a clean checkout; sources hashed
  in `data/manifest.json`.
- **Performance**: initial JS ~68 KB gzip; the ranking payload is a static snapshot
  with a live API and a graceful fallback.
