# Production Checklist

- [ ] `web/dist/` rebuilt and committed or built in image
- [ ] `data/market.duckdb` present
- [ ] `npm test -- --run` passes
- [ ] `npx tsc -b` passes
- [ ] `npm run lint` passes
- [ ] `npm run size` passes
- [ ] Playwright E2E passes (or acceptable)
- [ ] `docker build` succeeds locally
- [ ] `docker run` serves app and `/api/health` returns OK
- [ ] No secrets in repo
- [ ] CSP/cache headers verified
- [ ] Healthcheck configured
