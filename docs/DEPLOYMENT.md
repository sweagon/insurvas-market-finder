# Deployment Guide

This app ships as a single-container FastAPI service that serves the built SPA from `web/dist` and data from DuckDB/JSON. Free hosting options below.

## Prerequisites
- Built artifacts present: `web/dist/`, `data/market.duckdb`, `data/manifest.json` (and `web/public/data/` if used)
- Tests pass, size budgets pass
- Docker installed for local verification

## Local production test
```bash
docker build -t insurvas-market-finder:local .
docker run --rm -p 8000:8000 insurvas-market-finder:local
# open http://localhost:8000
curl http://localhost:8000/api/health
```

## Render (free, recommended)
1. Push repo to GitHub/GitLab
2. Go to [render.com](https://render.com) → New → Web Service → connect repo
3. Environment: Docker. Render will use `Dockerfile` and `render.yaml` if present
4. Health check path: `/api/health`
5. Deploy. Free tier may sleep after inactivity.

## Fly.io (free allowances)
1. Install [flyctl](https://fly.io/docs/hands-on/install-flyctl/)
2. `fly auth login`
3. `fly launch --no-deploy` (uses `fly.toml`)
4. `fly deploy`
5. `fly open`

## Railway
1. Go to [railway.app](https://railway.app) → New Project → Deploy from Git repo
2. Select repo, Railway auto-detects Dockerfile
3. Set healthcheck to `/api/health` if needed
4. Deploy

## Environment variables
- `INSURVAS_ADMIN_TOKEN` (optional): protects `POST /api/admin/refresh`. Leave unset to disable.
- `PORT` (default 8000): set by platform

## Notes
- The API serves static files with strict CSP and cache headers
- Data is read-only; no runtime DB writes except admin refresh
- Healthcheck returns 200/503 appropriately
