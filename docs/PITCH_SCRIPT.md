# Pitch Script (For Engineers & Hiring Teams)

**Time:** 2-2.5 minutes  
**Audience:** Engineering team, hiring panel, or technical stakeholders  
**Goal:** Show a production-ready, constraint-driven app that demonstrates data engineering + full-stack skills

## 1) Hook (10-15 seconds)
*"Insurvas Market Finder ranks every US county for senior life insurance opportunity using only public data. It's built for prioritization, not prediction - with full transparency, uncertainty bands, and hard constraints baked in."*

## 2) Problem & Approach (15-20 seconds)
- **Problem:** Agents need to know where to focus for 60+ markets without relying on expensive proprietary datasets
- **Approach:** Combine ACS 2020-2024, Census PEP 2025, IRS SOI, CBP, CDC PLACES, BEA, and Census boundaries
- **Differentiator:** Every score decomposes to contributions, shows uncertainty (P5-P95), and has zero protected attributes

## 3) Live Demo Flow (60-90 seconds)
Do this in order:

1. **Explore (/)** (20s) - "This is the choropleth view. By default it's Volume-first - biggest 60+ pools. I can switch lenses in the top bar. Click any county to see details."
2. **County Detail (Drawer)** (15s) - "Here's the full picture: opportunity score, sub-scores, key metrics, uncertainty ranges, and rank. Everything links to sources."
3. **Rankings (/rankings)** (15s) - "For building a call list, I can sort/filter the full table or cards view."
4. **Compare (/compare)** (15s) - "Let me add a couple counties side by side. The radar shows tradeoffs across all six sub-scores."
5. **Methodology (/methodology)** (10s) - "Full transparency - every metric, weight, source, and constraint is documented here."

## 4) Technical Highlights (30 seconds)
- **Data Pipeline:** Python fetch/transform/score with DuckDB for fast queries
- **Parity:** Python reference scorer and TypeScript port are golden-tested to ≤ 1e-9
- **Architecture:** FastAPI serves data + built SPA as a single Docker container
- **Constraints:** R1-R7 enforced (public data only, full provenance, config-declared metrics, deterministic scoring, exact contributions, honest uncertainty, no protected attributes)
- **Performance:** Size budgets enforced in CI, precomputed data for instant loads

## 5) Q&A Prep

| Question | Answer |
|----------|--------|
| "Is this real or mock data?" | 100% public data with vintages in config/metrics.yaml. DuckDB contains the built dataset. |
| "How do you ensure fairness?" | Rule R7 - race, ethnicity, national origin, religion, disability never used. QA asserts zero such columns. |
| "Are Python and JS scores identical?" | Yes, parity tested via golden files. Any change to scoring logic requires updating both. |
| "Can weights be changed?" | Yes, in config/metrics.yaml. Regenerate with `make build`. All changes documented. |
| "Is it deployable?" | Single Docker container, healthchecks, strict CSP, deployed-ready for Render/Fly.io. |
| "How do you handle uncertainty?" | Monte Carlo (500 draws) gives P5-P95 ranges and top-half probability shown throughout. |

## 6) Closing (10 seconds)
*"The whole thing is reproducible with `make build && make demo`, fully tested, and deployed as a single container. Happy to walk through the codebase or make changes live."*

## Tips
- Keep it conversational, don't read every detail
- Let the UI speak - click through naturally
- Emphasize "transparency" and "constraints" as differentiators
- If short on time, focus on Explore → Compare → Methodology
