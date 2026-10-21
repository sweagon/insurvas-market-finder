# Design brief: Senior Life Insurance Market Finder

Phase 0 deliverable (Part I, §1). One page. What we take from each reference,
our token decisions, and the risks we are accepting.

## What this UI is

A premium command center for ranking US counties and states as markets for life
insurance sold to people aged 60+. Primary views: Explore (full-bleed map),
Rankings (virtualized table), Area detail (drawer and full page), Compare,
Scatter Explorer, Sensitivity Lab, Methodology. Dark-first with a full-parity
light theme. Every number is explainable and every uncertainty is visible.

## Reference-to-take map (structure, not branding)

| Ref | Take into the product |
| --- | --- |
| **R1** | Drawer anatomy: header band with name + FIPS + rank + score, panel tabs, in-panel anchor nav with scroll-spy and an active pointer, `micro` label / value rows, double-rule section headers, sticky footer actions. |
| **R2** | Sidebar structure (wordmark, primary CTA + square icon button, grouped nav with an active accent bar, user footer); cascading searchable filter menu with a key hint; personality in empty states; layered glass menus; segmented control. |
| **R3** | Pill sub-navigation, tinted percent pills, KPI grid with hairline dividers, table rows grouped by state, light-theme restraint, sun/moon theme toggle. |
| **R4** | The hero: full-bleed map with floating glass panels, list-to-map linked selection, flow arcs with pill labels, KPI card with big numerals and delta chips, Share/Export in the header. |
| **R5** | Dark-sidebar / light-canvas hybrid for the light theme, hatched bands for low-confidence and ineligible areas, toggle legends, contribution heatmap, ring stats, KPI cards with corner links. |
| **R6** | Detail metadata strip, translucent six-axis radar styling, polar idea for contributions, hover rows. |
| **R7** | Two views of one dataset, sentence-style filter chips, status icon + count headers, severity dots. |
| **R8** | Stepper, dense table with inline bars, bulk selection bar, the live status sentence under the title, dark-ink-on-bright-button contrast. |

## Token decisions

- **Accent:** forest green `#5D8647` (project override of the source doc's
  ember). Derived and contrast-verified: hover `#6E9A54` (dark) / `#4E7539`
  (light); pressed `#4C7139` / `#3F6630`; `--text-on-accent: #0A0E05` (4.6:1);
  `--accent-text: #3F6630` on white (6.7:1); `--accent-subtle` at 14% dark /
  10% light.
- **Semantics unchanged:** lime = positive/robust, red = negative/error,
  amber = caution/low confidence, blue = info. Status is always icon + label +
  color. Hatch = uncertainty or ineligible, and the legend says so.
- **Surfaces:** flat tonal layers separated by 1px low-contrast borders, not
  shadows. Glass only on floating overlays (max three blurred elements). Canvas
  gets an optional 48px grid, disabled in print and reduced-transparency.
- **Type:** Geist Sans / Geist Mono, self-hosted and subset. Tabular numerals
  everywhere. Minimum rendered size 12px. `micro` uppercase labels drive data
  hierarchy.
- **Data ramps:** opportunity ramp from magma (dark) / YlOrRd (light); a
  colorblind-safe cividis toggle; PuOr diverging for index-vs-US. Lenses and
  sub-scores use the fixed Okabe-Ito subset from B.3, in a fixed order.
- **Density:** Comfortable by default, Compact hidden below `lg`. All spacing
  and radius from the 4px scale and the fixed radius ladder.

## Risks and how we hold them

1. **Uncertainty could get lost in a beautiful map.** Mitigation: hatch overlay,
   rank whiskers in the table, confidence badges and a rank-range in the answer
   card are all required, not optional.
2. **3,144-row table + full map performance.** Mitigation: virtualize the table,
   canvas-render the map, score in a worker, animate only transform/opacity.
   Budgets: initial JS < 250KB gzip, recolor < 16ms, 60fps pan.
3. **Explainability vs. density.** Mitigation: drawer sections in the fixed
   order (Summary, Why, Profile, People, Economy, Competition, Lookalikes,
   Sources) with a double-rule header each, plus a lineage diagram generated
   from `metrics.yaml`.
4. **Design-system drift.** Mitigation: tokens only, a lint rule that fails on
   raw hex / arbitrary values, and a `/design` gallery as the single review
   surface.
5. **Contrast of the new accent.** `#5D8647` is mid-luminance, so dark ink on it
   is only ~4.6:1. Mitigation: never place light text on the accent fill, and
   run the token-pair contrast test in CI.
6. **Reference fidelity without copying.** References inform structure and
   polish only. No reference branding, colors, logos or copy ships.
