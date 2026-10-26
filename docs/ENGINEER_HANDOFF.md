# Engineer Handoff Guide

## Architecture Overview
```
config/metrics.yaml      # Single source of truth (metrics, weights, lenses)
pipeline/                # Data pipeline (fetch → transform → score)
├── fetch/               # One module per public data source
├── transform/           # Derivations, MOE, shrinkage, CT handling
└── score/               # Reference scorer + Monte Carlo

api/                     # FastAPI - serves data + SPA
data/                    # Built artifacts (market.duckdb, rankings.json)
web/                     # React + Vite SPA
└── src/
    ├── score/           # TypeScript port (must stay in parity with Python)
    ├── state/           # Store, URL sync, lens logic
    └── design-system/   # Components, tokens, patterns
```

## Running Locally

### Quick Start
```bash
make setup   # Install dependencies
make dev     # API on :8000 with reload, Vite on :5173
```

### Full Build & Demo
```bash
make build   # Fetch/transform/score/QA
make demo    # Build + serve on http://localhost:8000
```

### Just Serve Built App
```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory web/dist
```

## Key Files To Modify

| Task | Files | Notes |
|------|-------|-------|
| Change lens weights | `config/metrics.yaml` | Edit weights per lens. Regenerate with `make build`. |
| Add/modify metric | `config/metrics.yaml`, `pipeline/transform/*`, `pipeline/score/*` | Must update both Python and TS scorers. |
| Change scoring logic | `pipeline/score/reference.py`, `web/src/score/score.ts` | **Must stay in parity** - tested to ≤ 1e-9 |
| Change UI/text | `web/src/views/*`, `web/src/design-system/*` | Follow existing patterns |
| Change API endpoints | `api/main.py` | Read-only except POST /api/admin/refresh (token-gated) |
| Change routes | `web/src/routes.ts`, `web/src/App.tsx` | SPA routes |

## Testing

```bash
make test                    # Python + web tests
npm test -- --run            # Web unit tests only
npm run lint                 # ESLint
npx tsc -b                   # TypeScript check
npm run size                 # Check bundle budgets
npx playwright test          # E2E tests (needs chromium)
```

**Playwright:** Set `PLAYWRIGHT_CHROMIUM_PATH` if needed.

## Data Pipeline

```bash
make fetch      # Download sources to data/cache
make transform  # Derive metrics
make score      # Compute scores + uncertainty
make qa         # Generate QA report
make build      # Run full pipeline
```

## Hard Constraints (Never Violate)
- **R1:** Public data only
- **R2:** Full provenance (manifest with checksums)
- **R3:** Config-declared metrics
- **R4:** Deterministic scoring, Python/TS parity
- **R5:** Exact contribution sums
- **R6:** Honest uncertainty, track imputation
- **R7:** No protected attributes (race/ethnicity/national origin/religion/disability)

## Debugging Tips
- **DuckDB missing:** Run `make build` or check `data/market.duckdb` exists
- **Parity failures:** Check both scorers produce same results to 1e-9
- **Size budget failures:** Check chunk sizes in `web/.size-limit.js`
- **CSP issues:** Check `api/main.py` middleware
- **Iframe blocked:** Ensure `frame-ancestors` allows same-origin

## Deployment
See `docs/DEPLOYMENT.md`. Single Docker container serves everything. Free hosting on Render recommended.
