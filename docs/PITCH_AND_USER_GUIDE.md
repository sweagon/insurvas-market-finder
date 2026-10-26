# Insurvas Market Finder - Pitch, User Guide & Modification Checklist

## Elevator Pitch (30 seconds)
"Insurvas Market Finder ranks every US county (3,144 county-equivalents) for senior life insurance opportunity using only public data (ACS 2020-2024, POPEST 2025). With strategy lenses, uncertainty bands, and full provenance, agents can prioritize the biggest pools with confidence - without guesswork or protected attributes."

## Demo Flow (2-3 minutes)
1. **Start on Explore** (`/`) - See the choropleth of opportunity scores by county. Toggle between lenses (Volume/Balanced/Final Expense/Legacy/Spouse Protection) using the control in the top bar.
2. **Drill down** - Click any county to open the side panel with full details, sub-scores, key metrics, and uncertainty.
3. **Rankings** (`/rankings`) - Sort/filter the full table or cards view by population, score, and other criteria.
4. **Compare** (`/compare`) - Add up to 4 counties side-by-side to compare sub-scores and metrics with distinct color-coding.
5. **Methodology** (`/methodology`) - Show transparency: sources, weights, uncertainty, and the explicit constraints (public data only, no protected attributes).

## User Guide

### Navigation
- **Explore (/)**: Interactive map with county-level scores
- **Rankings (/rankings)**: Sortable/filterable table of all counties
- **Compare (/compare)**: Side-by-side comparison (max 4 counties)
- **Scatter (/scatter)**: Plot relationships between metrics
- **Sensitivity (/sensitivity)**: See how scores respond to changes
- **Methodology (/methodology)**: Full transparency on data and scoring
- **Area details (/area/:fips)**: Deep dive for a specific county

### Key Features
- **Strategy lenses**: Re-weight the same 6 sub-scores (Size, Affordability, Need, Reachability, Whitespace, Insurability) for different sales strategies
- **Uncertainty bands**: Monte Carlo-derived ranges show confidence in rankings
- **Full transparency**: Every score decomposes to metric contributions; all sources cited
- **Public data only**: No carrier data, no protected attributes (race/ethnicity/religion/disability) ever used
- **Responsive design**: Works on desktop and mobile

### Tips for Users
- Use **Volume lens** for largest 60+ populations
- Use **Final Expense/Guaranteed Issue** lens when affordability matters more
- Check uncertainty bands (P5-P95 ranges) - wide bands mean less certainty
- Compare similar counties to find expansion markets
- Use the print brief for client meetings

## Quick Modification Checklist

### When changing values/weights
| What to change | Where | Notes |
|---|---|---|
| Lens weights | `config/metrics.yaml` | Weights per lens; must sum appropriately. Regenerate data. |
| Metric definitions | `config/metrics.yaml` | Add/remove/modify metrics. Affects scoring. |
| Scoring logic | `pipeline/score/reference.py` + `web/src/score/score.ts` | Must keep in parity (tested by parity tests). |
| Uncertainty parameters | `pipeline/score/` | Monte Carlo settings affect bands. |

### When changing filters/UI
| What to change | Where | Notes |
|---|---|---|
| Default filters | `web/src/state/url.ts`, `web/src/state/store.ts` | URL state drives filters; check sync logic. |
| Eligibility floor | `config/metrics.yaml` or `pipeline/transform/` | Currently 2000 residents 60+. |
| Map layers | `web/src/state/store.ts` (MapLayer), `web/src/views/Explore.tsx` | Sub-scores and opportunity score. |
| Table columns | `web/src/views/Rankings.tsx` | DataTable configuration. |

### When changing design/elements
| What to change | Where | Notes |
|---|---|---|
| Colors/theme | `web/src/design-system/tokens/tokens.css` | Design tokens; affects all components. |
| Logo/branding | `web/src/design-system/patterns/Brand.tsx`, `web/public/assets/` | Update assets and component. |
| Navigation | `web/src/design-system/patterns/Sidebar.tsx`, `web/src/design-system/patterns/TopBar.tsx` | Routes defined in `web/src/routes.ts`. |
| Typography/spacing | `web/tailwind.preset.js`, tokens.css | Follow existing scale. |

### When changing backend/API
| What to change | Where | Notes |
|---|---|---|
| API endpoints | `api/main.py` | FastAPI routes; maintains read-only contract except admin. |
| Data source | `pipeline/fetch/` | One module per source; update config and tests. |
| Data schema | `pipeline/transform/`, `web/src/data/types.ts` | Keep types in sync. |
| Static serving | `api/main.py` (`_mount_spa`) | Serves web/dist in production. |

### Testing after changes
1. `cd web && npx tsc -b` - Type check
2. `cd web && npm run lint` - Lint
3. `cd web && npm test -- --run` - Unit tests
4. `make test` or run Python tests - Full test suite
5. `cd web && npm run build && npm run size` - Build and size budgets
6. `cd web && npx playwright test` - E2E tests
