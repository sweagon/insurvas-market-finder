# Live-change playbook

Step-by-step recipes for the changes someone is most likely to ask for on a live
call. Every recipe touches **one config file** (`config/metrics.yaml`) unless noted,
then rebuilds. Assume a clean checkout with `make setup` already run.

Rebuild is two commands, and for config-only changes you can skip the web rebuild:

```bash
make build-data   # fetch (cached) + transform + score + QA + parity goldens
make web          # only needed if you changed the UI
uv run uvicorn api.main:app --port 8000   # or just `make demo`
```

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
4. Rebuild: `make build-data`.

**Verify**: `uv run python -c "from pipeline.fetch.http import Manifest; from
pipeline.transform.metrics import build_metric_matrix; print(build_metric_matrix(Manifest()).select('pop_60plus').sum())"`
- the sum should drop, because 60-64 is no longer counted.

---

## Recipe 2 - Change a weight, or a whole lens

All weights are plain numbers in `config/metrics.yaml`. Sub-score weights are per
lens and **must sum to 100** (the loader raises otherwise).

**Change one sub-score weight in a lens**:

1. Under `lenses.volume.weights`, edit the number, e.g. `size: 40` -> `size: 45`, and
   reduce another so the six still sum to 100 (e.g. `whitespace: 10` -> `5`).
2. Rebuild: `make build-data`.

**Change a metric's weight inside its sub-score** (per lens):

1. Find the metric, edit `lens_weights`, e.g.
   `lens_weights: {volume: 0.60, ...}` -> `{volume: 0.70, ...}`. These are normalised
   per sub-score, so they need not sum to anything specific.
2. Rebuild: `make build-data`.

**Add a brand-new lens** (e.g. "annuity"):

1. Under `lenses`, add the block (weights must sum to 100):
   ```yaml
   annuity:
     label: Annuity
     description: "Wealth-transfer oriented"
     weights: {size: 20, affordability: 35, need: 10, reachability: 10, whitespace: 10, insurability: 15}
   ```
2. Add a per-lens weight to **every** metric you want scored in it, e.g.
   append `annuity: 0.5` to each `lens_weights` map. (Metrics without an entry default
   to 0 and drop out.)
3. Regenerate the SPA config and rebuild:
   `make build-data` then `make web`.

**Verify**: the new lens appears in `/api/meta` and in the UI lens switcher.

---

## Recipe 3 - Add a metric

1. Add a block under `metrics:` in `config/metrics.yaml`:
   ```yaml
   - id: broadband_65plus
     label: Broadband availability (65+ households)
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
2. Produce the column in the pipeline: add its derivation in
   `pipeline/transform/metrics.py` using the **metric id as the column name**.
3. If it needs a new source, add a fetcher under `pipeline/fetch/` and register it.
4. Rebuild: `make build-data`.

**Verify**: `data/qa_report.md` lists the metric with its coverage; the county drawer
shows its contribution.

---

## Recipe 4 - Swap the ACS vintage

1. Bump `vintages.acs` in `config/metrics.yaml` (e.g. `2020-2024` -> `2021-2025`).
2. In `pipeline/fetch/census_acs.py`, set `YEAR = 2025` (the Summary File path uses
   it).
3. Rebuild with a network connection: `make build-data`.

**Verify**: `data/manifest.json` shows the new ACS files with fresh sha256 values, and
`data/qa_report.md` coverage stays at ~100%.

---

## Recipe 5 - Add a state filter or a column

**Filter** (API + UI):

1. The API already supports `?state=XX` on `/api/rankings`. For a new filter (e.g. by
   sub-score threshold), add a query param in `api/main.py`'s `rankings()` and extend
   the `WHERE` clause.
2. In the SPA, add the control in `web/src/App.tsx` and pass it through.

**Column** (ranking table):

1. Add the field in `web/src/components/RankingsTable.tsx` (the county record already
   carries `scores[lens].sub`).
2. `make web`.

**Verify**: the new filter/column behaves after `make demo`.

---

## Recipe 6 - Exclude (or include) PR and DC

- **Puerto Rico**: `geography.include_pr: true` in `config/metrics.yaml`. Then extend
  the fetch universe (PR FIPS start with `72`) and remove the PR skip in
  `pipeline/fetch/popest.py`. PR uses municipios, not counties - expect schema work.
- **DC**: DC (`11`) is included with the 50 states. To exclude it, drop `"11"` from
  `STATE_FIPS_50_DC` in `pipeline/transform/geography.py` and from `KEEP_STATE_FIPS`
  in `web/scripts/build-topo.mjs`, then `make build-data && make web`.

**Verify**: county counts change in `data/qa_report.md` and the map.

---

## Recipe 7 - Change the colour scale

The choropleth palette is defined once, in `web/src/components/CountyMap.tsx` in
`colorFor()`. It maps a rank fraction `[0,1]` to a colour.

1. Edit the `hue` / `light` formulas (or return a fixed colourblind-safe ramp).
2. `make web`, then reload.

**Verify**: the map recolours without changing any scores (colour is presentation
only).

---

## Always finish with

```bash
make test    # Python + web parity tests
make lint    # ruff + mypy + eslint + tsc
```

If any recipe changed scoring behaviour, the parity golden files are regenerated by
`make build-data` (they are produced by `tests/parity/generate.py`); the web parity
test must stay green.
