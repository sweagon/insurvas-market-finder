# Production Cleanup Checklist

## Before Deployment
- [x] All tests pass (unit + parity)
- [x] TypeScript compiles cleanly
- [x] Lint passes
- [x] Size budgets pass
- [x] E2E tests pass (or acceptable failures documented)
- [x] Build artifacts fresh in `web/dist/`
- [x] Data artifacts present (`data/market.duckdb`)
- [x] Favicons updated to logo mark
- [x] CSP allows same-origin framing
- [x] No `.bak` files in source/public/dist
- [x] Deployment configs added (Dockerfile, render.yaml, .dockerignore)

## Security
- [x] No secrets committed
- [x] Admin endpoint token-gated
- [x] Security headers configured (CSP, X-Content-Type-Options, etc.)
- [x] No protected attributes used (R7 enforced)
- [x] Public data only

## Performance
- [x] Bundle sizes within budgets
- [x] Data precomputed
- [x] Assets hashed
- [x] Proper cache headers

## Documentation
- [x] README up to date
- [x] PITCH_SCRIPT.md created
- [x] ENGINEER_HANDOFF.md created
- [x] USER_MANUAL.md created
- [x] DEPLOYMENT.md created
- [x] PRODUCTION_CHECKLIST.md exists

## Post-Deploy Verification
- [ ] App loads at deployed URL
- [ ] `/api/health` returns 200
- [ ] Map renders correctly
- [ ] Can navigate all routes
- [ ] Compare works
- [ ] Brief preview works (iframe)
- [ ] No console errors
