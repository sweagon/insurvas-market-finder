# Insurvas Market Finder - developer entry points.
#
# `make demo` is the headline target: build the data, build the SPA, then run a
# single FastAPI process that serves both on http://localhost:8000.

SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help
PORT ?= 8000

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

.PHONY: setup
setup: ## Install Python (uv) and web (npm) dependencies
	uv sync --all-extras
	cd web && npm install

.PHONY: fetch
fetch: ## Download/refresh all source data (cached)
	uv run python -m pipeline.fetch

.PHONY: build
build: ## Build the scored dataset, QA report and SPA snapshots
	uv run python -m pipeline.build
	uv run python -m pipeline.qa.report
	uv run python -m tests.parity.generate
	cd web && npm run topo

.PHONY: build-data
build-data: ## Build data, QA and the generated web catalogue (no topo)
	uv run python -m pipeline.build
	uv run python -m pipeline.qa.report
	uv run python -m tests.parity.generate

.PHONY: web
web: ## Build the production SPA bundle
	cd web && npm run build

.PHONY: demo
demo: build web ## Build everything and serve the app on http://localhost:$(PORT)
	@echo "Serving on http://localhost:$(PORT)"
	uv run uvicorn api.main:app --port $(PORT)

.PHONY: dev
dev: ## Run API (hot) and Vite dev server together
	@echo "API on :8000, Vite on :5173"
	uv run uvicorn api.main:app --reload --port 8000 & \
	cd web && npm run dev

.PHONY: test
test: test-py test-web ## Run all tests

.PHONY: test-py
test-py: ## Run Python tests
	uv run pytest -q

.PHONY: test-web
test-web: ## Run web unit + parity tests
	cd web && npm run test

.PHONY: parity
parity: ## Regenerate parity goldens and run the TS parity test
	uv run python -m tests.parity.generate
	cd web && npm run parity

.PHONY: lint
lint: lint-py lint-web ## Lint Python and web code

.PHONY: lint-py
lint-py: ## Ruff + mypy
	uv run ruff check .
	uv run mypy pipeline api

.PHONY: lint-web
lint-web: ## ESLint + tsc
	cd web && npm run lint && npx tsc -b

.PHONY: fmt
fmt: ## Auto-format Python
	uv run ruff format .
	uv run ruff check --fix .

.PHONY: refresh
refresh: ## Rebuild the dataset in place (same as the protected admin endpoint)
	uv run python -m pipeline.build

.PHONY: clean
clean: ## Remove build artefacts (keeps data/cache)
	rm -rf web/dist web/public/data/rankings.json data/market.duckdb data/processed/*
