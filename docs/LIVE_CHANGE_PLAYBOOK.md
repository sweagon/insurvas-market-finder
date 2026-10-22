# Live-change playbook

Step-by-step recipes for the changes someone is most likely to ask for on a live
call. Every recipe touches **one config file** (`config/metrics.yaml`) unless noted,
then rebuilds. Assume a clean checkout with `make setup` already run.

For UI-specific changes (routes, charts, colours, components) use
[`docs/design/UI_LIVE_CHANGE_PLAYBOOK.md`](design/UI_LIVE_CHANGE_PLAYBOOK.md).

Rebuild is one command. `make build` runs the pipeline, QA, parity goldens, the
generated web catalogue and the map topology; `make build-data` does the same
without topology (use it when only metrics change):

```bash
make build-data                     # fetch (cached) + transform + score + QA + catalogue
make web                            # only needed when you changed UI code
uv run uvicorn api.main:app --port 8000   # or just `make demo`
```

`make build-data` rewrites both `web/src/data/catalog.generated.json` and
`web/src/score/config.generated.json`. The SPA imports those at compile time, so
**run `make web` (or `make demo`) after a model change** — a data-only rebuild
leaves the deployed bundle pointing at the old contract.

> Golden rule: **never edit a metric definition anywhere except `config/metrics.yaml`**
> (rule R3). The pipeline, scorer, API and UI all derive from it.

---

## Recipe 1 - Change the target age from 60 to 65

The age floor appears in two places: the metric definition that *marks* 60+, and the
eligibility threshold parameter.

1. In `config/metrics.yaml`, under `params`, set `target_age_min: 65`.
2. Update the size metrics to read 65+ columns. In the `pop_60plus` and
   `share_60plus` metric `table_field`s, replace the `AGE60xx` terms with the 65+
   terms (the POPEST `agesex` file already carries `AGE6569`, `AGE7074`, ...).
3. Optionally rename the eligibility floor: `eligibility_min_60plus: 2000`.
4. Rebuild: `make build-data && make web`.

**Verify**: `uv run python -c "from pipeline.fetch.http import Manifest; from
pipeline.transform.metrics import build_metric_matrix; print(build_metric_matrix(Manifest()).select('pop_60plus').sum())"`
- the sum should drop, because 60-64 is no longer counted.

---

## Recipe 2 - Change a weight, or a whole lens

All weights are plain numbers in `config/metrics.yaml`. Sub-score weights are per
lens and **must sum to 100 across every configured sub-score** (the loader raises
otherwise). Metric weights are normalised inside their sub-score, so they need not
sum to anything specific.

**Change one sub-score weight in a lens**:

1. Under `lenses.volume.weights`, edit the number, e.g. `size: 40` -> `size: 45`, and
   reduce another so the configured weights still sum to 100 (e.g.
   `whitespace: 10` -> `5`).
2. Rebuild: `make build-data && make web`.

**Change a metric's weight inside its sub-score** (per lens):

1. Find the metric, edit `lens_weights`, e.g.
   `lens_weights: {volume: 0.60, ...}` -> `{volume: 0.70, ...}`.
2. Rebuild: `make build-data && make web`.

**Add a brand-new lens** (e.g. "annuity"):

1. Under `lenses`, add the block. `label`, `description` and (optionally)
   `short_label` are required; every configured sub-score needs a weight and the
   weights must sum to 100:
   ```yaml
   annuity:
     label: Annuity
     short_label: Annuity
     description: "Wealth-transfer oriented"
     weights: {size: 20, affordability: 35, need: 10, reachability: 10, whitespace: 10, insurability: 15}
   ```
2. Add a per-lens weight to **every** metric you want scored in it, e.g.
   append `annuity: 0.5` to each `lens_weights` map. (Metrics without an entry default
   to 0 and drop out.) A scored metric with no positive weight in any lens fails
   validation.
3. Rebuild: `make build-data && make web`.
4. Optional: add an explicit palette entry in
   `web/src/state/lensMeta.ts`. Without one, the lens takes the next colourblind-safe
   fallback, and the catalogue test fails if two lenses end up the same colour.

**Verify**: the new lens appears in `/api/meta`, the lens switcher, the Methodology
weights table and the routes that accept `?lens=`. `web/src/data/catalog.test.ts`
and `tests/test_web_contract.py` must stay green.

---

## Recipe 3 - Add a metric

1. Add a block under `metrics:` in `config/metrics.yaml`. `description` is required
   and is shown in every tooltip:
   ```yaml
   - id: broadband_65plus
     label: Broadband availability (65+ households)
     description: "Share of 65+ households with a fixed broadband subscription."
     subscore: reachability
     source: fcc                 # must be a key under `sources:`
     table_field: "FCC county availability / households"
     vintage: "2024"
     unit: share
     direction: higher_is_better
     transform: none
     moe: none
     scored: true
     lens_weights: {volume: 0.10, balanced: 0.10, final_expense: 0.05, legacy_wealth: 0.05, spouse_protection: 0.05}
     caveats: "Availability is not adoption."
   ```
2. If the value is imputed or shrunk, add the flag to `pipeline/flags.py`
   (`FLAG_COLS`, `FLAG_DESCRIPTION` and `METRIC_FLAGS`) so the UI can badge it.
   The build writes the flag column and both catalogues carry the mapping.
3. Produce the column in the pipeline: add its derivation in
   `pipeline/transform/metrics.py` using the **metric id as the column name**.
4. If it needs a new source, add a fetcher under `pipeline/fetch/` and register it in
   `pipeline/fetch/__init__.py`, then add it under `sources:`.
5. Rebuild: `make build-data && make web`.

**Verify**: `data/qa_report.md` lists the metric with its coverage; the area drawer
shows it with a definition tooltip; `web/src/state/format.ts` has a formatter for the
unit (the catalogue test fails otherwise); `tests/test_web_contract.py` passes.

**Retiring a metric**: delete its block, remove its derivation and any flags, then
rebuild. Nothing in the SPA names metrics individually except `HIGHLIGHT_METRICS` and
`KEY_METRICS`; both silently skip a missing id, so remove stale ids there too.

---

## Recipe 4 - Swap the ACS vintage

1. Bump `vintages.acs` in `config/metrics.yaml` (e.g. `2020-2024` -> `2021-2025`).
2. In `pipeline/fetch/census_acs.py`, set `YEAR = 2025` (the Summary File path uses
   it).
3. Rebuild with a network connection: `make build-data && make web`.

**Verify**: `data/manifest.json` shows the new ACS files with fresh sha256 values, and
`data/qa_report.md` coverage stays at ~100%.

---

## Recipe 5 - Add a state filter or a column

**Filter** (API + UI):

1. The API already supports `?state=XX` on `/api/rankings`. For a new filter (e.g. by
   sub-score threshold), add a query param in `api/main.py`'s `rankings()` and extend
   the `WHERE` clause.
2. In the SPA, add the control in `web/src/views/Explore.tsx` or
   `web/src/views/Rankings.tsx` and persist it through `web/src/state/url.ts`.

**Column** (ranking table):

1. Add the field in `web/src/views/Rankings.tsx` (the county record already carries
   `scores[lens].sub` and the raw `metrics` matrix).
2. `make web`.

**Verify**: the new filter/column behaves after `make demo`.

---

## Recipe 6 - Exclude (or include) PR and DC

- **Puerto Rico**: `geography.include_pr: true` in `config/metrics.yaml`. Then extend
  the fetch universe (PR FIPS start with `72`) and remove the PR skip in
  `pipeline/fetch/popest.py`. PR uses municipios, not counties - expect schema work.
- **DC**: DC (`11`) is included with the 50 states. To exclude it, drop `"11"` from
  `STATE_FIPS_50_DC` in `pipeline/transform/geography.py` and from `KEEP_STATE_FIPS`
  in `web/scripts/build-topo.mjs`, then `make build && make web`.

**Verify**: county counts change in `data/qa_report.md` and the map.

---

## Recipe 7 - Change the colour scale

The choropleth ramp is defined once, in `web/src/design-system/map/ramp.ts`
(`opportunityColor()` and the legend stops); `Choropleth.tsx` only consumes it. It
maps a percentile to a colour and must stay sequential and colourblind-safe.

1. Edit the ramp stops (or the `theme`/`palette` branches).
2. `make web`, then reload.

**Verify**: the map recolours without changing any scores (colour is presentation
only); the cividis toggle still reads as a different ramp.

---

## Always finish with

```bash
make test    # Python + web parity/contract tests
make lint    # ruff + mypy + eslint + tsc
```

If any recipe changed scoring behaviour, the parity golden files are regenerated by
`make build-data` (they are produced by `tests/parity/generate.py`); the web parity
test must stay green. If a recipe changed a label, weight, unit or flag, the
generated catalogue changes too and `make web` is mandatory.
