# Insurvas Market Finder

Find and rank the best US counties and states for selling life insurance to people
aged 60+, using **public data only**. One-command demo, fully reproducible, honest
about uncertainty.

> Not advice. A prioritisation tool built on public statistics. See
> [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) for every assumption.

## Quick start

```bash
make setup   # install Python (uv) and web (npm) dependencies
make demo    # build data + web, serve on http://localhost:8000
```

Then open <http://localhost:8000>.

`make demo` runs the whole pipeline (fetch -> transform -> score -> QA), builds the
React SPA, and serves both from a single FastAPI process.

### Common targets

| Target | What it does |
| --- | --- |
| `make setup` | Install Python and web dependencies |
| `make build` | Build the dataset, QA report, parity goldens and map topology |
| `make demo` | `build` + SPA bundle + serve on :8000 |
| `make dev` | API on :8000 with reload, Vite dev server on :5173 |
| `make test` | Python + web tests |
| `make lint` | ruff + mypy + eslint + tsc |
| `make parity` | Regenerate Python<->TS goldens and run the parity test |
| `make refresh` | Rebuild the dataset in place (same as the admin endpoint) |

## What it answers

The headline view is **volume-first**: where the biggest 60+ pools are. Switch the
strategy **lens** to re-weight the same metrics for a different play:

- **Volume** (default) - biggest 60+ pools.
- **Balanced** - equal-footing trade-off across all six sub-scores.
- **Final Expense / Guaranteed Issue** - affordability and insurability matter more.
- **Legacy Wealth** - wealth and transfer-oriented signals.
- **Spouse Protection** - household-coupling signals.

Every lens reuses the same six sub-scores: **Size, Affordability, Need,
Reachability, Whitespace, Insurability**. Weights are documented priors, not truths
(see [`config/metrics.yaml`](config/metrics.yaml) and ADR-004).

## How it works

```
public sources ──fetch──▶ data/cache ──transform──▶ metric matrix
                                                   │
                                       score (pure function)
                                                   │
                        ┌──────────────────────────┼──────────────────────────┐
                        ▼                          ▼                          ▼
                 data/market.duckdb        rankings.json (SPA)        data/qa_report.md
```

- **Python reference scorer** in `pipeline/score/reference.py`; a line-by-line
  **TypeScript port** in `web/src/score/score.ts`; a golden-file parity test pins
  them together to `<= 1e-9` (rule R4).
- Every score **decomposes exactly** into per-metric contributions (rule R5).
- No silent imputation: `imputed_*` / `shrunk_*` flags are counted in the QA report
  (rule R6).
- **Rule R7**: race, ethnicity, national origin, religion and disability are never
  used in scoring or filtering. The QA report asserts zero such columns.

## Repository layout

```
config/metrics.yaml       single source of truth for every metric, weight and lens
pipeline/fetch/           one module per verified public source
pipeline/transform/       derivations, MOE arithmetic, CT handling, shrinkage
pipeline/score/           reference scorer + Monte Carlo
pipeline/qa/              QA report generator
pipeline/build.py         orchestrates the build and writes DuckDB + SPA JSON
api/main.py               FastAPI read model + protected refresh + SPA mount
web/                      React + TypeScript + Tailwind SPA
docs/                     ADRs, methodology, one-pager, demo script, playbook
tests/                    Python tests + parity goldens
```

## Data sources

Population (Census PEP 2025), ACS 2020-2024 5-year (table-based Summary File), IRS
SOI TY2023, County Business Patterns 2023, CDC PLACES 2025, BEA CAINC4 2024, Census
2024 Gazetteer and cartographic boundaries. Every source's license, attribution and
caveats live in `config/metrics.yaml`; blocked sources are skipped with an ADR
(see [`docs/adr/ADR-006`](docs/adr/ADR-006-inaccessible-sources.md)).

## Configuration & reproducibility

- Dependencies are pinned in `pyproject.toml` and `web/package.json` (rule R10).
- Downloads are cached and recorded with sha256 in `data/manifest.json` (rule R2).
- Vintages are pinned in `config/metrics.yaml`; bumping one is a documented recipe
  in [`docs/LIVE_CHANGE_PLAYBOOK.md`](docs/LIVE_CHANGE_PLAYBOOK.md).

## License

MIT.
