# UI live-change playbook

The complete checklist for changing the model or the interface without leaving
the two out of sync. If a change touches identity (lens, sub-score, metric,
unit, flag), it is a **model change**: follow the checklists here, not just the
component edit.

Companion documents:

- [`docs/LIVE_CHANGE_PLAYBOOK.md`](../LIVE_CHANGE_PLAYBOOK.md) — pipeline and
  source recipes (age floor, ACS vintage, API filters).
- [`docs/DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) — binding visual rules.
- [`docs/design/DEVIATIONS.md`](DEVIATIONS.md) — accepted departures and why.

---

## 1. The contract

Identity is generated, never hand-written. One YAML file feeds four artefacts:

| File | Written by | Consumed by | Contains |
| --- | --- | --- | --- |
| `config/metrics.yaml` | humans | everything | the only editable definition |
| `web/src/data/catalog.generated.json` | `tests/parity/generate.py` | SPA at compile time | lens/sub-score ids and order, labels, default lens, weights, units, flags, metric→sub-score→flags, config hash |
| `web/src/score/config.generated.json` | `tests/parity/generate.py` | TS scorer + parity test | scoring transforms and weights |
| `web/public/data/meta.json` | `pipeline.build` | SPA at runtime | labels, descriptions, sources, vintages, params, build stamp |
| `web/public/data/counties.json` | `pipeline.build` | SPA at runtime | the metric matrix and estimate flags |

The SPA derives `LensId` and `SubScoreId` from the generated catalogue, so a new
id is a compile-time literal with no union to edit. `CATALOG_CONFIG_HASH` is
compared with `meta.meta.config_hash` at runtime; a mismatch shows the red
staleness banner.

**Never edit a `*.generated.json` file by hand, and never add a lens or metric id
literal to `web/src`.** If you need a value that is not in the catalogue, add it
to the exporter.

Commands:

```bash
make build-data   # pipeline + QA + parity + catalogue
make build        # the above + map topology
make web          # compile the SPA against the new catalogue
make test lint
```

A model change is not live until **both** `make build-data`/`make build` and
`make web` have run and the new image serves both.

---

## 2. Checklists

### A. Add a metric

- [ ] Add the block under `metrics:` in `config/metrics.yaml`; include `id`,
      `label`, `description`, `subscore`, `source`, `unit`, `vintage`,
      `direction`, `transform`, `moe`, `scored`, `lens_weights`, `caveats`.
- [ ] If the source is new, add it under `sources:` with URL, licence and
      attribution.
- [ ] Implement the column in `pipeline/transform/metrics.py` with the metric id
      as the column name.
- [ ] If the value can be imputed/shrunk, add the flag to `pipeline/flags.py`
      (`FLAG_COLS`, `FLAG_DESCRIPTION`, `METRIC_FLAGS`). The export and build read
      that one file.
- [ ] Add a formatter branch in `web/src/state/format.ts` if the unit is new.
      `web/src/data/catalog.test.ts` fails until every catalogue unit formats.
- [ ] If the metric belongs in the area summary or compare table, add its id to
      `HIGHLIGHT_METRICS` (`web/src/views/AreaPage.tsx`) or `KEY_METRICS`
      (`web/src/views/Compare.tsx`). These lists skip unknown ids by design.
- [ ] Run `make build-data && make web`, then `make test lint`.
- [ ] Check `data/qa_report.md` coverage, the area drawer tooltip, the compare
      table and the Methodology dictionary.

### B. Retire a metric

- [ ] Delete the metric block, its derivation and any flags in
      `pipeline/flags.py`.
- [ ] Remove stale ids from `HIGHLIGHT_METRICS`/`KEY_METRICS`.
- [ ] Rebuild and run the full suite. An orphan `lens_weights` key fails
      validation; a served column with no catalogue entry fails the contract test.

### C. Add a lens

- [ ] Add `label`, `short_label`, `description` and **all** configured sub-score
      weights under `lenses:` (sum exactly 100).
- [ ] Add a positive weight to each metric that should score in it.
- [ ] Optional: add an explicit colour in `web/src/state/lensMeta.ts`. Without
      one, the next colourblind-safe fallback is used.
- [ ] Rebuild data and web. Verify the switcher, Methodology weights table,
      `/api/meta`, and every `?lens=` route.
- [ ] Run `web/src/data/catalog.test.ts`: it fails if lens ids and labels drift
      or if two lenses share a colour.

### D. Add, rename or retire a sub-score

- [ ] Add/rename under `subscores:` with `label`, `short_label`, `description`.
- [ ] Use the id in a `lens.weights` map and in every metric's `subscore`.
- [ ] Rebuild. The switcher, radar, table headers, compare rows and sensitivity
      sliders follow the generated order.
- [ ] Known exception: the radar is fixed at six axes by design
      ([R9](DEVIATIONS.md#1-radar-is-fixed-at-six-axes)). A seventh sub-score is
      scored but not drawn on the radar; record it if it is user-visible.

### E. Change weights

- [ ] Sub-score weights: per lens, must sum to 100 across the configured
      sub-scores; validation fails otherwise.
- [ ] Metric weights: per metric, non-negative; each scored metric needs a
      positive weight in at least one lens. A scored metric with no weight is
      omitted from that lens's sub-score and raises the coverage warning path.
- [ ] Rebuild data and web; confirm the parity test uses the new
      `config.generated.json` (it is regenerated, not hand-edited).

### F. Change a source or vintage

- [ ] Update `vintages.<source>` and/or the metric's `vintage` in
      `config/metrics.yaml`, plus the fetcher constant (e.g. `YEAR`).
- [ ] Rebuild with network access and confirm `data/manifest.json` has fresh
      `sha256`, `retrieved_at` and the expected `vintage` for every file.
- [ ] Check `data/qa_report.md`; a moved distribution is a review item even when
      the gate passes.
- [ ] The UI shows `vintages` from `meta.json`; no component change is needed.

### G. Change a unit or direction

- [ ] Update `unit`/`direction` in `config/metrics.yaml`.
- [ ] Add a formatter if the unit is new; run the catalogue test.
- [ ] Unit bounds are gated: `share`/`percent` must stay in [0, 1], and
      `index`/`growth_rate` may be negative. A wrong unit fails the build in QA.

### H. Change only presentation (colour, copy, layout, route)

- [ ] Colours come from `web/src/design-system/tokens/tokens.css` and the
      Tailwind preset; never use a raw hex in a component.
- [ ] Lens/sub-score colours live in `web/src/state/lensMeta.ts`; keep the
      distinct-colour test green.
- [ ] Route changes: update `web/src/App.tsx`, `web/src/state/url.ts`, the
      sidebar/top bar/tab bar, the command palette and the API SPA fallback.
- [ ] Copy: metric labels/descriptions come from config; UI-only copy is fine in
      the component.
- [ ] `make web`, then check dark and light themes, reduced motion, print and
      320 px width.

---

## 3. Verification matrix

| Change | Must pass |
| --- | --- |
| Any model change | `make build-data`, `make web`, `make test`, `make lint` |
| Metric added/removed | `tests/test_web_contract.py`, `web/src/data/catalog.test.ts`, QA coverage |
| Lens/sub-score added | catalogue test, Methodology weights table, `/api/meta` |
| Unit added | `UNIT_FORMATTERS` test in `catalog.test.ts` |
| Flag added | `estimate.test.ts`, area drawer badge, compare dot, tooltip text |
| Scoring/weights | `tests/parity/*` + `web/src/score/parity.test.ts` at ≤ 1e-9 |
| Data rebuild only | staleness banner absent (`config_hash` match), `built_at` recent |
| Frontend deployed without data | red banner: config hash mismatch |

Useful spot checks:

```bash
python3 -c "import json;d=json.load(open('web/src/data/catalog.generated.json'));print(d['lens_order'],d['subscore_order'],len(d['metrics']))"
python3 -c "import json;m=json.load(open('web/public/data/meta.json'));print(m['meta']['config_hash'],m['meta']['built_at'])"
cd web && npm run size
```

---

## 4. Anti-patterns

- Hard-coding `"volume"` or `"size"` in a component. Import `DEFAULT_LENS` or
  iterate `LENS_ORDER`/`SUBSCORE_ORDER`.
- Copying label/description/unit text into TSX. It belongs in `config/metrics.yaml`.
- Editing `catalog.generated.json` or `config.generated.json`. The next build
  overwrites them and the parity/contract tests will disagree.
- Shipping a data rebuild without `make web` (or the reverse). The staleness
  banner exists because this happens; do not rely on it as the process.
- Adding a lens colour by typing a hex in the switcher. Add it to `lensMeta.ts`
  so the distinct-colour test can see it.
- Treating a missing sub-score as zero in a view. Use the `null` partial path
  and say “unavailable”.

---

## 5. Definition of done

- [ ] `make build-data && make web` run in that order.
- [ ] `make test` and `make lint` green.
- [ ] `data/qa_report.md` reviewed; no new imputation/shape warning unexplained.
- [ ] `web/public/data/meta.json` `config_hash` equals
      `catalog.generated.json` `config_hash`.
- [ ] The new field is visible where a user would look for it, with a tooltip,
      unit and (if applicable) estimate badge.
- [ ] `docs/design/DEVIATIONS.md` updated if the change adds a known limit.
