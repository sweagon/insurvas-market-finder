# User Manual

## Getting Started
Navigate to http://localhost:8000 (or your deployed URL). The app opens to **Explore** by default.

## Views & When To Use Them

| View | Purpose | Best For |
|------|---------|----------|
| **Explore (/)** | Interactive choropleth map | Geographic patterns, finding clusters, quick overview |
| **Rankings (/rankings)** | Sortable table/cards of all counties | Building a call list, scanning top markets |
| **Compare (/compare)** | Side-by-side comparison (max 4) | Choosing between finalists, seeing tradeoffs |
| **Scatter (/scatter)** | Plot two metrics against each other | Finding correlations, spotting outliers |
| **Sensitivity (/sensitivity)** | Test how rankings change | Stress testing, understanding robustness |
| **Methodology (/methodology)** | Full documentation | Due diligence, answering methodology questions |
| **Area (/area/:fips)** | Deep dive on one county | Researching a specific market thoroughly |
| **Print (/print/:fips)** | Clean paper brief | Client meetings, taking notes offline |

## Strategy Lenses
Switch in the top bar to re-weight the same 6 sub-scores:

| Lens | Best For | Focus |
|------|----------|-------|
| **Volume** (default) | Largest markets | Biggest 60+ populations |
| **Balanced** | Diversified approach | Equal weight across all factors |
| **Final Expense / Guaranteed Issue** | Affordability-focused sales | Affordability + insurability matter more |
| **Legacy Wealth** | Wealth transfer | Wealth and transfer-oriented signals |
| **Spouse Protection** | Household sales | Household-coupling signals |

## The 6 Sub-Scores
Every lens uses: **Size**, **Affordability**, **Need**, **Reachability**, **Whitespace**, **Insurability**

## Visualizations Guide

| Visualization | What It Shows | When To Use |
|---------------|---------------|-------------|
| **Choropleth Map** | Color-coded counties by score/layer | See geographic distribution at a glance |
| **Rankings Table** | Sortable columns with scores/ranks | Build ordered prospect lists |
| **Radar Chart** | 6 sub-scores on axes (2-4 areas) | Compare overall profiles quickly |
| **Bar Chart (Compare)** | Side-by-side sub-score bars | Read exact differences clearly |
| **Scatter Plot** | X/Y correlation between any metrics | Find relationships or unusual markets |
| **Waterfall Chart** | Score decomposition to contributions | Understand why a county scored as it did |
| **Uncertainty Bands (P5-P95)** | Monte Carlo range | Gauge confidence in rankings |

## Key Features

- **Uncertainty:** Every score shows ranges (P5-P95) and chance of top-half finish
- **Full Provenance:** Click any metric to see source, vintage, and definition
- **Compare Limit:** Max 4 counties at once
- **URL State:** Shareable links preserve lens, filters, and selections
- **Print Brief:** Clean, paper-friendly version for meetings
- **Responsive:** Works on desktop and mobile

## Tips
1. Start with **Volume** lens to find biggest pools
2. Use **Compare** to evaluate finalists side-by-side
3. Check uncertainty bands - wide ranges mean less certainty
4. Use **Print brief** for client discussions
5. Click "Full page" from drawer for complete details

## FAQ
**Q: Why are some counties not ranked?**  
A: Must have ≥2,000 residents aged 60+ (eligibility floor).

**Q: Can I trust these scores?**  
A: They're for prioritization using public data. Always verify with your own criteria.

**Q: Are protected attributes used?**  
A: No. Race, ethnicity, national origin, religion, disability are never used (enforced by R7).
