# AI log

Real, chronological entries of mistakes made by the AI/tooling during this build,
how each was detected, and the fix (rule R9). Written as they happened.

---

## 2026-10-20 - Ranked scores were identical across counties

- **What happened**: After wiring the scorer to real data, the top 15 volume-lens
  counties were all in Wyoming, in sequential FIPS order, with scores stepping by
  ~0.02. Every sub-score for a given county was identical (`size == affordability ==
  need == reachability`), which is impossible.
- **How it was detected**: A "does this look right?" sanity print of the top 15 and a
  per-county sub-score dump. The tell was FIPS-ordered dominance and equal sub-scores.
- **Root cause**: `percentile_rank` computed ranks in *sorted* order but assigned them
  back to the original positions with `out[mask] = pct` without inverting the sort
  permutation. So every county got the rank of its row index.
- **Fix**: Scatter ranks back through the permutation: `positions[order] = pct`. Added
  `test_percentile_rank_direction` and the parity golden test to catch regressions.
- **Lesson**: Rank/scatter bugs are silent and produce plausible-looking numbers.
  Always check that a *largest-by-construction* county (Los Angeles) ranks at the top.

## 2026-10-20 - Winsorisation created ties that hid the true top of the ranking

- **What happened**: After fixing the scatter bug, the top ~15 counties again shared
  identical scores (`83.664`). Winsorising at the 99th percentile clips many outliers
  to the same cap, and average-rank gives them all the same percentile.
- **How it was detected**: Inspecting the distribution of percentile values showed a
  repeated max tied across dozens of counties.
- **Fix**: Pad the rank with a tie-break on the **pre-winsorisation** value, mirroring
  `np.lexsort((tiebreak, values))`. Genuinely equal inputs still tie; clipped outliers
  keep their real order. Mirrored in the TS port.
- **Lesson**: Winsorise-then-rank is only safe if you keep the pre-clip magnitude for
  tie-breaking.

## 2026-10-20 - Python<->TS parity failed for one lens only

- **What happened**: The parity test passed for 4 of 5 lenses but failed
  `final_expense` with a `6.64` difference.
- **How it was detected**: The golden-file parity test localised it to exactly one
  lens.
- **Root cause**: The `final_expense` lens sets `flip_insurance_sign: true` in config.
  The Python scorer flips `lower_is_better` metrics inside the Insurability sub-score;
  the TS port did not implement the flip at all.
- **Fix**: Ported `flipIfInsurability` to TS and applied it in both the sub-score and
  contribution paths.
- **Lesson**: Feature-flagged behaviour (a `true` in one lens) is exactly where a port
  silently drifts. The parity test earned its place here.

## 2026-10-20 - `np.quantile` / encoding / schema traps in the fetchers

- **What happened**: Three fetcher failures in sequence:
  1. BEA CAINC4 CSV raised `invalid utf-8 sequence` in Polars.
  2. POPEST `cc-est2025-agesex-72` (Puerto Rico) had a different schema
     (`MUNICIPIO`/`NAME`, no `STATE`), crashing the state loop.
  3. BEA GeoFIPS values arrive as ` "06037"` (leading space + quotes); a naive
     `slice(1,5)` produced 4-char FIPS and dropped every row.
- **How it was detected**: Each raised a concrete error (`ComputeError`, `ColumnNotFound`,
  and an empty result frame respectively). The BEA one was caught by asserting row
  count and checking a known FIPS.
- **Fix**: Latin-1 decode before parsing; skip PR (state 72) explicitly; normalise FIPS
  with `strip_chars` + `zfill(5)` and drop state-level rows by `slice(2,3) != "000"`.
- **Lesson**: "Verified live" (rule R2) means verifying the *file's* quirks too, not
  just that the URL returns 200.

## 2026-10-20 - Directory path assumptions in `size-limit` and the fetch entry point

- **What happened**: `size-limit` referenced `web/public/data/counties.json`, which
  never existed, and `make fetch` called `python -m pipeline.fetch`, which had no
  `__main__`.
- **How it was detected**: Running the tools (it is easy to write config that is never
  executed).
- **Fix**: Corrected paths and budgets to the real artefacts, and added
  `pipeline/fetch/__main__.py`.
- **Lesson**: Every Makefile target and config block must be run at least once before
  it is claimed to work.

## 2026-10-20 - Stakeholder-supplied ACS API key was invalid

- **What happened**: The provided Census key validated as invalid, and the ACS API had
  become key-gated (an HTML `missing_key.html` response).
- **How it was detected**: A live request returned the error page rather than JSON.
- **Fix**: Switched to the table-based Summary File (fully public, no key), documented
  in [ADR-007](adr/ADR-007-acs-summary-file-fallback.md). No secret is stored.
- **Lesson**: Do not block an unattended build on a human-supplied secret when a public
  bulk download gives identical data.
