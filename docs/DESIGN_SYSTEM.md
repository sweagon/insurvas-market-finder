# Frontend Design System and Master Prompt: Senior Life Insurance Market Finder

Prepared October 20, 2026 from the eight reference screenshots supplied. References are numbered in upload order: **R1** patient snapshot slide-over (blue/white), **R2** CY·FOCUS findings with filter menu (dark/orange, iPad), **R3** Taskflow overview (light/orange), **R4** GeoSales territory map (dark/lime), **R5** Datonix database monitoring (light canvas, dark sidebar, purple), **R6** CY·FOCUS incident details (dark/orange, laptop), **R7** CY·FOCUS findings kanban and list, **R8** Group Optimizer (dark/lime, desktop app).

> **Palette override (project decision, 2026-10-21).** The single accent is
> **forest green `#5D8647`**, not the ember orange in the original source
> document. All accent tokens in B.2 have been re-derived from `#5D8647` and
> re-verified for contrast (dark ink `--text-on-accent: #0A0E05` at 4.6:1;
> `--accent-text: #3F6630` on white at 6.7:1). Every binding rule that referred
> to "ember" now reads "forest". Lime stays reserved for positive and robust,
> red for error, amber for caution. No purple or blue accents.

## 0. How to use this document

Save this as `docs/DESIGN_SYSTEM.md` in the repo and give it, plus the eight images in `docs/design/references/` (named `r1.webp` to `r8.webp`), to the frontend AI. Part A explains what the references do and what we take from each. Parts B to H are the binding design system. Part I is the master prompt. If the prompt ever conflicts with Parts B to H, Parts B to H win.

The product the UI serves: a county and state ranking tool for life-insurance marketing to people over 60. Primary views are Explore (map), Rankings (table), Detail drawer, Compare, Scatter Explorer, Sensitivity Lab and Methodology. Every design decision below is tuned to that: dense data, a map, a ranking, a score that must be explainable, and uncertainty that must be visible.

## A. Reference analysis

### A.1 Reference by reference

| Ref | What it shows | Steal | Leave behind |
| --- | --- | --- | --- |
| **R1** | Right slide-over detail panel over a dimmed card grid. Solid-color header band with name and ID, tab row, dark chart card, uppercase micro-label / value pairs, icon + count chip row, in-panel anchor nav with an active-section pointer. | Drawer anatomy: header band, tabs, scroll-spy section nav, micro-labels, summary chips, double-rule section headers. | The saturated blue, small low-contrast tab text on navy, an Edit pill on every section. |
| **R2** | Dark app shell: sidebar with wordmark, primary CTA plus square icon button, nav with active accent bar, user footer. Breadcrumb, title, list/grid toggle, Export. Cascading filter menu with search and a keyboard hint. Wireframe-globe empty state with witty copy. Default/Advanced segmented control. | Filter-builder menu, personality in empty states, keyboard hints, layered glass menus, segmented control, sidebar structure. | Orange on near-black for everything (alert fatigue). White text on the orange button (about 3:1 contrast, fails AA). |
| **R3** | Light dashboard. Pill top nav (active item is a black pill), notification badge, sun/moon theme toggle, AI Search CTA, underline sub-tabs, time-grouped table, 4x2 KPI grid with hairline dividers, tinted percent pills, horizontal bars with a left marker. | Pill style for sub-navigation, tinted percent pills, KPI grid with hairlines, grouped-row table (we group by state), light-theme restraint. | Top nav as primary navigation (we use a sidebar), 11px light-gray cell text. |
| **R4** | Full-bleed dark map with floating glass panels. Region list with rank badges, selected row tied to the map with a green gradient, curved flow arcs with pill labels, bottom-right KPI card with large numerals and delta chips. | Floating glass over a full-bleed map (our hero layout), list-to-map linking, flow arcs, KPI card with delta chips, Share and Export in the header. | Low-contrast map labels, photo avatars (we use state monograms). |
| **R5** | Light canvas with a dark rounded sidebar, grouped nav with badges, subtitle under the title, time-range segmented control, KPI cards with delta and corner link, area chart with hatched state bands and a toggle legend, status-pill list, ring stats, contribution heatmap. | Dark-sidebar / light-canvas hybrid for the light theme, hatched bands for low-confidence and ineligible, toggle legend, heatmap, ring stats. | Photographic page background (distracting, heavy), purple (off-brand). |
| **R6** | Dark detail page. Breadcrumb, header metadata strip with status and priority dropdowns, tabs, key-value info panel, overlapping translucent radar, polar chart, entities table with hover row. | Metadata strip, translucent radar for the six sub-scores, polar idea for contributions, hover rows. | Radar for anything other than fixed ordinal axes. Saturated fills that hide overlaps. |
| **R7** | The same data as a kanban board and as a list. Column headers with status icon and count, cards with ID, severity dot, date and initials avatar. Sentence-style filter chip: Team is Cyfocus primary. | Two views of one dataset, sentence-style filter chips, status icon plus count headers, severity dots. | The kanban itself. We use a Compare tray instead. |
| **R8** | Dark tool UI with lime accent. Stepper header with completion checks, back arrow + title + live status sentence, primary CTA, toolbar with Filter and dropdowns, dense table with checkboxes, per-row progress bars colored by state, row actions. | Stepper pattern, the status sentence under the title, dense table with inline bars, bulk selection, black text on a bright button for contrast. | Desktop window chrome, 11px gray sublabels. |

### A.2 Patterns all eight share

1. **Tonal layering.** Canvas, surface and raised surface are separated by a 1px low-contrast border, not heavy shadows (R2, R4, R6, R8).
2. **Generous radius.** About 12 to 16px on cards, 8px on controls, full pills for status and primary calls to action (all).
3. **One dominant accent per product,** used sparingly for the primary action, selection and progress.
4. **Hierarchy by type, not color.** Small muted or uppercase labels above large values (R1, R3, R5, R8).
5. **Status is icon + text + color,** never color alone: half-filled circles, dots, check circles (R3, R7, R8).
6. **Persistent header actions:** Export, Share, view toggle, theme toggle (R2 to R5).
7. **Information scent:** breadcrumbs, counts in tabs and column headers, and a sentence describing the current state (R2, R6, R8).
8. **Two views of the same data:** list/grid, table/kanban (R2, R7).
9. **Dense tables with micro-visuals** inline: bars, avatars, status (R3, R6, R8).
10. **Delight at the edges:** empty states, a hero wireframe object, animated arcs (R2, R4).

### A.3 UX practices to adopt

1. Open details in a **slide-over drawer** so the list and map stay in view (R1).
2. Give the drawer an **in-panel section nav with scroll-spy** (R1).
3. Build filters as a **searchable, cascading menu with a keyboard hint**, then show applied filters as **sentence chips** (R2, R7).
4. Put a **sentence under the page title** that states what is on screen right now, for example the vintage and count (R5, R8).
5. Show **counts in headers and tabs** so users never open an empty view (R7).
6. Pair every KPI with a **delta chip and arrow**, never color alone (R4, R5).
7. Put **inline bars in table cells** so ranking is scannable without opening anything (R8).
8. Let **legends toggle series** (R5).
9. Use **hatching to mean uncertainty or ineligible** (R5), and say so in a legend.
10. Offer **list/grid and table/chart toggles** on the same dataset (R2, R7).
11. Link **list and map selection** both ways (R4).
12. Give **empty states** a reason, a next step and a little personality (R2).
13. Show **theme toggle and Export/Share in the header**, not buried in settings (R3 to R5).

### A.4 Wow-factor inventory and how we adapt each

| Wow element | Source | Our adaptation | Cost / risk |
| --- | --- | --- | --- |
| Floating glass panels over a full-bleed map | R4 | Explore screen: ranking panel left, KPI card bottom-right, legend top-center | Low. Limit `backdrop-filter` to 3 elements. |
| Wireframe or dot-matrix hero object | R2 | Dot-matrix US map that scans in on first load; the same motif in empty states | Low. Generate procedurally in canvas or SVG. |
| Curved flow arcs with pill labels | R4 | Retiree migration flows (IRS county-to-county) and lookalike-county links | Medium. Arcs for the top 10 flows only. |
| Cascading filter menu with a key hint | R2 | Filter builder on F and command palette on Cmd/Ctrl+K | Medium. |
| Big numerals with delta chips and count-up | R4, R5 | KPI card and KPI strip with a 600 ms count-up | Low. |
| Translucent overlapping radar | R6 | Six-axis sub-score profile for the selected area vs state vs US, with a Bars toggle | Low. |
| Hatched bands | R5 | Hatch low-confidence and ineligible areas on the map, in charts and in the table | Low. |
| Contribution heatmap | R5 | Rank-stability matrix: top 25 areas by lens, cell = probability of staying in the top 50 | Medium. |
| Slide-over with scroll-spy | R1 | County drawer | Medium. |
| Witty empty state | R2 | No-match and error states with a clear next step | Low. |
| Stepper | R8 | Optional first-run Build your lens wizard (3 steps) | Stretch. |
| Inline progress bars in rows | R8 | Score bars with rank whiskers in the Rankings table | Low. |
| AI Search CTA | R3 | Ask the map: a deterministic natural-language filter parser (no LLM), for example counties in Texas with 60+ over 50k | Stretch. |

### A.5 Where the references conflict, and our decisions

| Question | Decision |
| --- | --- |
| Dark or light? | **Dark-first** (Obsidian) with a **full-parity light theme** (Daylight). Default follows `prefers-color-scheme`. The printed market brief is always light. |
| Which accent? | **Forest green** `#5D8647` for actions, selection and focus. **Lime** is reserved for positive and robust signals. No purple or blue accents. |
| Glass? | Only for floating overlays (map panels, menus, tooltips). Never on cards, tables or the sidebar. |
| Radar? | Allowed for the six fixed sub-score axes (0 to 100 percentile). Always paired with a Bars toggle and a data table. Never for arbitrary metrics. |
| Navigation? | Left sidebar from the lg breakpoint, bottom tab bar on phones. Pill style is used for sub-tabs and segmented controls. |
| Density? | Comfortable by default, Compact toggle for analysts. |
| Backgrounds? | Flat tonal surfaces plus a very subtle grid or noise on the canvas. No photographs. |
| Avatars? | Two-letter state monograms (TX, FL) in a rounded square. No photos. |

## B. Design direction and tokens

### B.1 Concept: a command center for market intelligence

Quiet chrome, loud data. Eight principles:

1. **Answer first.** Every screen opens with a conclusion, not a control panel.
2. **Quiet chrome, loud data.** Neutral surfaces. Color is for data and the single accent.
3. **One accent, strict semantics.** Forest means act or selected. Lime means good or robust. Red means bad or error. Amber means caution or low confidence.
4. **Show the why.** Every number can be traced to a driver and a source in at most two clicks.
5. **Uncertainty is visible.** Whiskers, confidence badges and hatching are part of the visual language, not footnotes.
6. **Dense but breathable.** 4px grid, hairline borders, 16 to 24px gutters.
7. **Fast feels premium.** Feedback within 100 ms, zero layout shift, no spinner where a skeleton fits.
8. **Accessible by default.** WCAG 2.2 AA is a floor, not a stretch goal.

### B.2 Color tokens

Implement as CSS variables on `:root[data-theme]`, mapped into Tailwind. Components never use raw hex.

```css
:root[data-theme='dark'] {
  --bg-canvas: #0C0B0A;
  --bg-surface-1: #141311;
  --bg-surface-2: #1B1A17;
  --bg-surface-3: #24221E;
  --scrim: rgba(12, 11, 10, 0.72);
  --glass-bg: rgba(20, 19, 17, 0.62);
  --glass-border: rgba(255, 244, 230, 0.10);
  --border-subtle: rgba(255, 244, 230, 0.08);
  --border-default: rgba(255, 244, 230, 0.14);
  --border-strong: rgba(255, 244, 230, 0.26);
  --text-primary: #F5F1EA;
  --text-secondary: #B9B2A7;
  --text-tertiary: #8A8378;      /* non-essential text, on surface-1 and surface-2 only */
  --text-on-accent: #0A0E05;     /* dark ink on forest: about 4.6:1 */
  --accent: #5D8647;
  --accent-hover: #6E9A54;
  --accent-pressed: #4C7139;
  --accent-subtle: rgba(93, 134, 71, 0.14);
  --accent-border: rgba(93, 134, 71, 0.45);
  --positive: #B6F23A;  --positive-subtle: rgba(182, 242, 58, 0.14);
  --negative: #FF6B6B;  --negative-subtle: rgba(255, 107, 107, 0.14);
  --warning: #FFB020;   --warning-subtle: rgba(255, 176, 32, 0.14);
  --info: #5AA9FF;      --info-subtle: rgba(90, 169, 255, 0.14);
  --focus-ring: #FFD2BF;
  --grid-line: rgba(255, 244, 230, 0.06);
  --map-stroke: rgba(12, 11, 10, 0.85);
}
:root[data-theme='light'] {
  --bg-canvas: #F2F0EC;
  --bg-surface-1: #FFFFFF;
  --bg-surface-2: #FAF8F5;
  --bg-surface-3: #F0EDE8;
  --scrim: rgba(20, 17, 12, 0.40);
  --glass-bg: rgba(255, 255, 255, 0.72);
  --glass-border: rgba(20, 17, 12, 0.08);
  --border-subtle: rgba(20, 17, 12, 0.07);
  --border-default: rgba(20, 17, 12, 0.13);
  --border-strong: rgba(20, 17, 12, 0.28);
  --text-primary: #17140F;
  --text-secondary: #5C554B;     /* about 7.4:1 on white */
  --text-tertiary: #766F64;
  --text-on-accent: #0A0E05;
  --accent: #5D8647;
  --accent-text: #3F6630;        /* forest as text or link on light: about 6.7:1 */
  --accent-hover: #4E7539;
  --accent-pressed: #3F6630;
  --accent-subtle: rgba(93, 134, 71, 0.10);
  --accent-border: rgba(63, 102, 48, 0.45);
  --positive: #3F7D0B;  --positive-subtle: rgba(63, 125, 11, 0.10);
  --negative: #C62828;  --negative-subtle: rgba(198, 40, 40, 0.10);
  --warning: #9A6200;   --warning-subtle: rgba(154, 98, 0, 0.10);
  --info: #1F5FBF;      --info-subtle: rgba(31, 95, 191, 0.10);
  --focus-ring: #17140F;
  --grid-line: rgba(20, 17, 12, 0.06);
  --map-stroke: rgba(255, 255, 255, 0.9);
}
```

Rules: verify every text/background pair with an automated contrast check in CI. `--text-tertiary` is for non-essential captions only and is never used on `--bg-surface-3`. Light theme keeps the dark sidebar from R5 as an option (`data-sidebar='dark'`), which gives it more character.

### B.3 Data-visualization palettes

| Role | Dark theme | Light theme | Notes |
| --- | --- | --- | --- |
| **Opportunity ramp** (sequential, score and size) | Magma, trimmed to the 0.18 to 0.96 range so the low end never disappears into the canvas | YlOrRd (ColorBrewer), low = light, high = deep | Perceptually uniform. Ties to the forest brand. Use 7 to 9 steps for classed maps, continuous for legends. |
| **Colorblind-safe alternative** | Cividis | Cividis, reversed so high = dark | Settings toggle: Palette > Colorblind-safe. |
| **Diverging** (index vs US = 100, delta vs state) | PuOr, orange = above average, purple = below | Same | Midpoint is a neutral gray, never white. |
| **Lenses** | Balanced `#56B4E9`, Final Expense `#E69F00`, Legacy/Wealth `#CC79A7`, Spouse Protection `#009E73` | Same | Okabe-Ito subset. Always paired with a text label. |
| **Sub-scores** (waterfall, radar) | Size `#56B4E9`, Affordability `#E69F00`, Need `#CC79A7`, Reachability `#009E73`, Whitespace `#0072B2`, Insurability `#F0E442` | Same, with Insurability darkened to `#B8A800` | Fixed order everywhere. |
| **Status** | Positive `--positive`, Caution `--warning`, Negative `--negative`, Neutral `--text-secondary` | Light equivalents | Always icon + label + color. |
| **Uncertainty** | 45-degree hatch at 20% opacity over the fill | Same | Legend entry required: Hatched = low confidence or ineligible. |
| **No-data** | `--bg-surface-3` with a dotted border | Same | Never a ramp color. |

### B.4 Typography

Primary **Geist Sans**, mono **Geist Mono** (SIL Open Font License; self-host the variable files, subset to Latin, `font-display: swap`). Fallbacks: Inter, system-ui, sans-serif. Turn on `font-variant-numeric: tabular-nums` for every number, and slashed zero for mono.

| Token | Size / line | Weight | Tracking | Use |
| --- | --- | --- | --- | --- |
| `display` | 40 / 44 | 600 | -0.02em | Answer headline |
| `h1` | 28 / 34 | 600 | -0.015em | Page titles |
| `h2` | 20 / 28 | 600 | -0.01em | Section titles |
| `h3` | 16 / 24 | 600 | 0 | Card titles |
| `body` | 14 / 22 | 400 | 0 | Default text |
| `body-sm` | 13 / 20 | 400 | 0 | Compact table cells |
| `caption` | 12 / 16 | 400 | 0.005em | Helper text, axis labels |
| `micro` | 11 / 14 | 600 | 0.08em, uppercase | Field labels, table headers (R1 style) |
| `num-xl` | 40 / 44 | 500 | -0.02em | KPI hero numerals |
| `num-lg` | 28 / 32 | 500 | -0.01em | KPI card numerals |
| `num-md` | 18 / 24 | 500 | 0 | Inline emphasis |
| `mono` | 12 / 16 | 450 | 0 | FIPS codes, IDs, formulas |

Minimum rendered size anywhere is 12px. Body line length is capped at 72 characters.

### B.5 Spacing, radius, elevation, glass, borders

- **Spacing** (4px base): 0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80. Card padding 16 (compact) / 20 (default) / 24 (hero). Grid gaps 16 / 24.
- **Radius:** 6 chips and tags, 8 inputs and buttons, 12 cards, 16 panels and drawers, 24 modals and hero cards, 999 pills and segmented controls.
- **Borders:** 1px `--border-subtle` between sibling surfaces, 1px `--border-default` on controls, 1px `--border-strong` on focus-adjacent and selected states.
- **Elevation:** L0 canvas. L1 `--bg-surface-1` + subtle border. L2 `--bg-surface-2` + inner top highlight `inset 0 1px 0 rgba(255,255,255,0.04)`. L3 floating glass: `backdrop-filter: blur(16px) saturate(140%)`, glass background and border, shadow `0 12px 32px rgba(0,0,0,0.45)`. L4 modal: scrim plus shadow `0 24px 64px rgba(0,0,0,0.55)`. Light theme shadows use 8 to 12% opacity.
- **Z-index:** base 0, sticky 10, map controls 20, floating panels 30, drawer 40, modal 50, popover 60, toast 70, tooltip 80.
- **Canvas texture:** a 1px grid at `--grid-line` every 48px, masked to fade out toward the edges. Optional and disabled in print and reduced-transparency modes.

### B.6 Iconography and imagery

- **Lucide** icons, 1.5px stroke, sizes 16 / 20 / 24. Active navigation items use the filled or duotone variant (R2, R8).
- Status icons follow R3 and R7: circle (open), half circle (in progress), check circle (done), dashed circle (draft), triangle (warning).
- No emoji in the UI. No stock photos. No photo avatars.
- **Brand motifs** (R2): the dot-matrix US map, a wireframe icosphere and a perspective grid, all generated procedurally as SVG or canvas, theme-aware and under 15 KB combined.

### B.7 Motion tokens

| Token | Value | Use |
| --- | --- | --- |
| `--dur-fast` | 120 ms | Hover, press, toggles |
| `--dur-base` | 180 ms | Menus, tooltips, tab underline |
| `--dur-slow` | 280 ms | Drawer, sheet, panel slide |
| `--dur-hero` | 600 ms | Count-up, dot-matrix scan, first load |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Most transitions |
| `--ease-emphasized` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Entrances |
| Spring | stiffness 300, damping 30 | Sheets and drawers |

Animate only `transform` and `opacity`. List entrances stagger at 24 ms and cap at 12 items. Map recolor is a 300 ms crossfade. `prefers-reduced-motion` replaces motion with a 100 ms opacity fade and disables the scan, count-up and arc animation.

### B.8 Density modes

| Property | Comfortable (default) | Compact |
| --- | --- | --- |
| Table row height | 44 px | 32 px |
| Control height | 40 px | 32 px |
| Card padding | 20 px | 16 px |
| Table cell type | `body` 14 | `body-sm` 13 |
| Touch devices | Always Comfortable. Compact is hidden below the lg breakpoint. |  |

## C. Layout and responsiveness

### C.1 App shell anatomy

- **Sidebar** (R2, R5, R8): 248 px expanded, 72 px rail. Wordmark on top, then a primary CTA with a square icon button beside it (New comparison, +). Groups use `micro` headers: **Explore** (Map, Rankings, Compare), **Analyze** (Scatter, Sensitivity Lab), **Reference** (Methodology, Data sources). Footer: Help and shortcuts, Settings, theme toggle, vintage chip (ACS 2020–2024).
- **Top bar**, 56 px: breadcrumb, lens switcher, search with a `Cmd/Ctrl+K` hint, Share, Export, theme toggle, settings.
- **Page header** (R5, R8): H1, then one sentence stating what is on screen, for example *3,098 counties ranked for Balanced, ACS 2020–2024, 60+ population of at least 2,000.*
- **Content region:** fluid, 24 px padding, maximum 1680 px on table pages. The Explore map is full-bleed.
- **Docked inspector:** from 1536 px the detail drawer can pin beside the content instead of overlaying it.

### C.2 Breakpoints

| Name | Range | Device class | Shell |
| --- | --- | --- | --- |
| `xs` | 0–479 | Phone portrait | Bottom tab bar |
| `sm` | 480–767 | Large phone, phone landscape | Bottom tab bar (landscape: rail) |
| `md` | 768–1023 | Tablet portrait | 72 px rail |
| `lg` | 1024–1279 | Tablet landscape, small laptop | 72 px rail, expandable as overlay |
| `xl` | 1280–1535 | Laptop, desktop | 248 px sidebar |
| `2xl` | 1536–1919 | Large desktop | Sidebar plus docked inspector |
| `3xl` | 1920+ | Ultrawide | Content capped at 1920 px, extra column for compare or inspector |

Use **container queries** for components (KPI strip, cards, table toolbar, charts) so they adapt to the space they get, not the viewport. Use media queries only for the shell.

### C.3 What changes at each size

| Element | Phone (under 768) | Tablet (768–1279) | Desktop (1280+) |
| --- | --- | --- | --- |
| Navigation | Bottom tab bar, 5 items: Explore, Rankings, Compare, Insights, More | 72 px icon rail, expands as an overlay | 248 px sidebar, collapsible |
| Top bar | Logo, lens chip, search icon. Share and Export in an overflow menu | Adds search field and Share/Export icons | Breadcrumb, lens switcher, search, Share, Export, theme, settings |
| Explore layout | Full-bleed map. Ranking list is a bottom sheet with snap points peek 96 px, half 50%, full 92%. Legend collapses to a chip | Map with left glass panel (320). KPI card is a bottom sheet in portrait, floating in landscape | Map, left panel (340), KPI card (420), top-center legend. Docked inspector from 2xl |
| Filters | Full-height sheet with sticky Apply and Reset | Popover cascading menu | Cascading menu plus a sentence-chip row |
| Rankings table | Card list: rank, name, score bar, two key metrics, confidence. Tap opens the drawer. Sort in a sheet | Table, first two columns sticky, horizontal scroll, about 6 columns visible | Full table, column picker, density toggle, pinned columns |
| Detail drawer | Full-screen sheet, sticky section chips, swipe down to close | 70% width slide-over (max 560), anchor nav as chips | 480–640 right slide-over with scroll-spy nav (R1). Docked at 2xl |
| Charts | Fewer ticks, labels on tap, radar defaults to bars, scatter labels only top 10 | Standard | Full, with brush and crosshair |
| Compare | 2 areas, swipeable columns | 3 areas | 4 areas plus parallel coordinates |
| Tooltips | Tap to pin, details in a bottom info bar | Hover or tap | Hover with 80 ms delay, identical content on focus |
| Modals | Become bottom sheets | Centered, max 560 | Centered |
| Sensitivity Lab | Sliders stacked above results | Two columns | Two panes with a resizable divider |
| Type | Body stays 14. H1 24. `num-xl` 32 | Standard | Standard |

### C.4 Touch and input modality

- Touch targets are at least 44 x 44 px on coarse pointers (24 x 24 px is the absolute floor from WCAG 2.2). Use `@media (pointer: coarse)` to enlarge.
- Never depend on hover. Everything that appears on hover also appears on focus and on tap.
- Bottom sheets and drawers respond to a drag handle only, so they never fight map panning. The map takes one-finger pan and two-finger pinch.
- Respect safe areas (`env(safe-area-inset-*)`) on the bottom tab bar, sheets and sticky footers. Keep the focused input visible when the on-screen keyboard opens.
- Phone landscape swaps the bottom bar for the rail and hides Compact density.

### C.5 Grid and scroll rules

- 12-column grid. Gutters 16 (sm), 24 (lg and up). Page margins 16 / 24 / 32.
- One vertical scroll per view. Tables scroll inside their own container with a sticky header and sticky first column. No nested scroll traps, no scroll hijacking.
- Reserve space for every async region (skeletons match final dimensions) to keep cumulative layout shift near zero.
- Truncate county names with an ellipsis after two lines on phones, one line in tables, with the full name in a title and tooltip. Compact large numbers on narrow widths (1.2M, $4.8B).

## D. Component inventory

Every component ships with: default, hover, focus-visible, pressed, selected (where relevant), disabled, loading (where relevant), error (where relevant), dark and light themes, both densities, and keyboard behavior. Build all of them as a documented gallery route (`/design`) so the design can be reviewed in one place.

### D.1 Shell and navigation

| Component | Spec |
| --- | --- |
| Sidebar | Surface-1, 1px right border. Expanded 248 / rail 72 / hidden on phone. Optional dark variant in light theme (R5). |
| Nav item | 40 px high, radius 8, 20 px icon. Active: surface-3 background, 2 px left accent bar, filled icon (R2, R8). Badge slot for counts and BETA (R5). Tooltip in rail mode. |
| Sidebar group | `micro` header, collapsible chevron, remembers state. |
| Sidebar CTA | Primary button plus square icon button (R2). |
| Top bar | 56 px, blurred surface only when content scrolls beneath it. |
| Breadcrumb | Home icon, chevrons, last item is the page. Truncates in the middle (R2, R6). |
| Lens switcher | Segmented control with four lens colors as dots. `[` and `]` cycle lenses. On phones it is a chip that opens a sheet. |
| Tabs, underline | R3 sub-tabs. 2 px accent underline slides between tabs. |
| Tabs, pill | R5 time-range style. Pill track in surface-2, selected pill in surface-3 with border. |
| Tabs, panel | R1/R6 style for the drawer: the active tab is a raised tile that merges with the content. |
| Segmented control | R2 Default / Advanced. Used for Counties / States, Radar / Bars, Chart / Table. |
| Stepper | R8. Completed steps get a check, the active step is highlighted, chevron separators. Used by the optional Build your lens wizard. |
| Command palette | See D.5. |
| Theme toggle | Sun and moon pair as in R3 to R5, with the active one filled. |
| Settings popover | Theme, density, palette (Default / Colorblind-safe), units, reduce motion, reset. |
| Bottom tab bar | Phone only. 56 px plus safe area, 5 items, filled icon when active, badge dot for unread banners. |
| Skip links, landmarks | Skip to content and Skip to results. Use `header`, `nav`, `main`, `aside`. |
| Footer bar | Slim: data vintage, Methodology link and the required LIMRA attribution line. |

### D.2 Controls and inputs

| Component | Spec |
| --- | --- |
| Button | Variants: primary (forest fill, dark ink text), secondary (surface-2 plus border), ghost, destructive (rare), link. Sizes: 32 / 40 / 48. Icon-only buttons are square with a tooltip. Split button for Export (CSV, PNG, PDF brief). Loading replaces the icon with a spinner and keeps its width. |
| Switch, checkbox, radio | Checkbox supports indeterminate (R8). 20 px visual size, 44 px touch area. |
| Text and search input | Left icon, optional keyboard hint badge such as F (R2), clear button, 40 px high. Error text sits below with an icon. |
| Number input | Stepper buttons, unit suffix, min/max clamping. |
| Select and combobox | Searchable, virtualized for 3,144 counties, keyboard type-ahead. Multi-select shows removable chips. |
| Slider | Single and range. Value bubble on drag. Range variant shows a histogram behind the track (min 60+ population). |
| Weight slider | Numeric input, lock toggle, reset to default with a tick mark showing the default position. |
| Weight mixer | Six weight sliders that always sum to 100. Moving one rebalances the unlocked others proportionally. A stacked bar above shows the mix in sub-score colors. Presets: the four lenses plus Custom. |
| Filter builder menu | R2. Opens with `F`. Search box at top. Groups with dividers: Geography, Size, Economics, Need, Reach, Competition, Data quality. Choosing a field opens a submenu to the right (bottom sheet on phones) with operators and values. |
| Filter chips | R7 sentence form: State is Texas, 60+ population at least 50,000. Each chip is removable. Clear all at the end. |
| Toggle group | List/grid and table/chart pairs (R2, R7). |
| Menus | Dropdown, kebab and context menus with icons, keyboard hints and dividers (R8). |
| Vintage chip | Date-chip styling from R3: ACS 2020–2024. Click opens a popover that lists the vintage of each source. |
| Copy button | Copies FIPS, links and CSV. Shows a check for 1.5 s and announces it politely. |
| Tooltip | 12 px, glass surface, 80 ms open delay, never holds interactive content. |
| Popover | Anchored, focus-managed, closes on Esc and outside click. |

### D.3 Data display

| Component | Spec |
| --- | --- |
| Card | Surface-1, radius 12, 1px border. Header: title, info icon, optional corner arrow link (R5). |
| KPI card | Icon + micro label + info icon on top, `num-lg` value, delta chip, optional sparkline, corner arrow (R4, R5). |
| KPI strip | 4 cells with hairline dividers (R3). Wraps 4, 2, 1 by container width. |
| Hero answer card | `display` headline, for example **Top pick for Balanced: Collin County, TX**, score ring, rank range, confidence badge, one-line reason, dismissible. |
| Delta chip | Arrow glyph plus value plus context (vs US). Positive lime, negative red, neutral gray. The arrow carries the meaning, the color reinforces it. |
| Status pill | Icon, label, tinted background (R3, R5). |
| Confidence badge | Three-bar icon plus High / Medium / Low. Low uses amber and the hatch pattern. |
| Robust pick badge | Lime outline, check icon. Shown when P(top 50) is at least 0.8. |
| Rank badge | Numeric in a rounded square. Ranks 1 to 3 use an forest-tinted fill (R4 pattern). |
| Score chip | 0 to 100 number with a 4 px bar underneath. |
| Percent pill | Tinted accent, tabular numbers (R3). |
| Monogram | Two-letter state code in a rounded square, color derived from the lens, never from the state. |
| Imputed marker | Small dotted-underline marker with a tooltip explaining the imputation. |
| Key-value list | R1 layout. `micro` label on the left, value on the right, hairline dividers. Values link to their source tooltip. |
| Section header | R1 double rule: title in `micro` uppercase, optional action, a 2 px rule underneath. |
| Data table | See D.3.1. |
| Ranking card | Phone version of a table row: rank, monogram, name, score bar, two metrics, confidence. |
| List row | R4 region-list pattern: monogram, name, subtitle, metric, two icon actions. Selected row gets a left accent bar and a faint forest gradient. |
| Progress bar and ring | 4 or 8 px bars. State colors (R8): forest active, lime complete, red failed, gray waiting. Rings follow R5. |
| Accordion, divider, timeline | Timeline lists data releases and vintages. |
| Skeleton | Matches final layout. Shimmer 1.4 s, disabled under reduced motion. |

#### D.3.1 Data table

Virtualized (TanStack Table + Virtual). Features:

- Sticky header and sticky first two columns, horizontal scroll with edge shadows.
- Header cells: `micro` label, sort indicator, resize handle, column menu (hide, pin, sort).
- Cell types: rank, area (monogram + name + state), score bar (R8), rank whisker (p05 to p95, median dot), mini sparkline, confidence badge, number with delta, index (US = 100), link, actions.
- Row states: hover highlight (R6), selected (accent-subtle plus left bar), focused (focus ring), disabled for ineligible (hatched, dimmed to 60%, not rankable).
- Selection: checkbox column (R8). Shift-click ranges. A bulk bar appears on selection: Compare, Export, Clear.
- Grouping: optional group rows by state with a collapse chevron and aggregate values (R3).
- Footer: row count, selected count, column totals or medians, density toggle, Export.
- Keyboard: arrows move the active cell, Enter opens the drawer, Space toggles selection, `C` adds to compare.
- Empty: the filter empty state (D.6). Loading: skeleton rows at the current density.

### D.4 Charts and maps

| Chart | Encoding | Interactions | Notes |
| --- | --- | --- | --- |
| **Choropleth** (state and county) | Opportunity ramp, canvas-rendered, pre-projected Albers with Alaska and Hawaii insets | Hover tooltip, click select (2 px forest outline), Shift-click adds to compare (dashed outline), zoom 1 to 8x, pan, reset, keyboard pan | Hatch overlay for low confidence and ineligible. Legend shows a histogram and draggable class breaks. |
| **Dot-matrix hero** | Dots sampled inside the US shape, brightness by score | One-time scan animation, then static | Brand motif from R2. Falls back to a static image under reduced motion. |
| **Flow arcs** | Great-circle-style curves with pill labels (R4) | Hover highlights a flow, click opens the origin or destination | Top 10 flows only. Solid for inbound, dashed for outbound. Layer toggle. |
| **Bubble scatter** | x and y by chosen metric, size = 60+ population, color by lens or region | Brush select, lasso optional, zoom, quadrant labels, outlier annotations | Quadrants: Scale and Quality, Niche Gems, Big but Thin, Skip. Chart/Table toggle. |
| **Rank whisker** | Median dot with p05 to p95 line | Hover shows probabilities | Used in the table and the drawer. |
| **Contribution waterfall** | Horizontal bars in sub-score colors that sum exactly to the total | Hover shows the metric-level breakdown, click jumps to the metric | The flagship Why this score view. Count-up on open. |
| **Percentile bullet bars** | Area marker plus state and US ticks on a 0 to 100 track | Hover shows value, percentile and index | Default profile view for accessibility. |
| **Radar** | Six fixed axes, 0 to 100, gridlines at 25, 50, 75, 100, translucent 18% fills with 2 px strokes (R6) | Series toggle in the legend | Area vs state vs US. Radar/Bars segmented toggle. Never more than three series. |
| **Age pyramid** | Bars by age band 60–64 through 85+, two tones for sex | Hover shows count and share | Highlights the 65+ boundary. |
| **Sparkline** | 60+ growth 2020 to 2025 | Hover shows the value | Inline in tables and KPI cards. |
| **Heatmap matrix** | Rows are the top 25 areas, columns are lenses, cell is P(top 50) (R5 pattern) | Hover and click to open | Rank-stability view in the Sensitivity Lab. |
| **Histogram** | Distribution of a metric with the selected area marked | Brushable | Used in the legend and the filter slider. |
| **Stacked bar** | Income distribution of 65+ households | Hover per bracket | Sequential ramp. |
| **Horizontal bar with marker** | R3 service-type pattern | Hover | Competition density vs the US value. |
| **Parallel coordinates** | One polyline per area, six sub-score axes | Brush per axis | Compare view only. |
| **Bump chart** | Rank movement of the top 15 as weights change | Hover highlights a line | Sensitivity Lab. |

Chart rules:

- Zero baseline for bars. No pie charts. No 3D. No dual axes. At most six colors per chart.
- Direct labels beat legends. Legends are toggles (R5), and the hatch swatch is always explained.
- Axis text uses `caption` in `--text-secondary`. Gridlines use `--grid-line`. Tooltips are glass L3 with a header, rows and a footer line (Click to open).
- Every chart has a **View as table** twin, an accessible name and a one-sentence text summary.
- Every chart footer shows the vintage chip. Empty and error states are defined per chart.

### D.5 Overlays

| Component | Spec |
| --- | --- |
| **Slide-over drawer** (R1) | Right-anchored, 480 / 560 / 640 px by breakpoint. Header band with area name, FIPS in mono, rank and score, close button. Panel tabs, in-panel anchor nav with scroll-spy and active pointer (R1), sticky footer with Compare, Share, Brief. Focus trap, Esc closes, focus returns to the trigger. URL-synced (`?area=48085`). Dims the content with the scrim but keeps the map visible. |
| **Modal dialog** | Max 560 px, radius 24, scrim, focus trap. For export options, share, shortcuts and destructive confirmation. Becomes a bottom sheet on phones. |
| **Bottom sheet** | Snap points 96 px / 50% / 92%, drag handle only, spring motion. Used for the ranking list, filters and detail on phones. |
| **Command palette** | 640 px wide, opens with `Cmd/Ctrl+K`. Groups: Areas (fuzzy search over 3,144 counties), Actions (Compare, Export, Share), Views, Settings. Shows recent items and key hints. |
| **Hovercard on map** | Compact: name, score, rank, confidence, Click to open. Glass L3. |
| **Toast** | Bottom-right (bottom-center on phones), 4 s, maximum 3, undo where relevant, polite live region. |
| **Banner** | Top of the content region. Data-vintage notice, stale-data warning, offline. Dismissal persisted in `localStorage`, wrapped in try/catch. |
| **Coachmark tour** | Stretch: four steps (map, lens, drawer, Sensitivity Lab). Skippable, never repeats. |
| **Brief preview** | Modal with the print layout (E.9), Download PDF and Print actions. |
| **Share dialog** | Copy link, shows exactly what state is encoded (lens, filters, selection). |

### D.6 Feedback and states

| State | Spec |
| --- | --- |
| Loading | Skeletons matching the final layout, a 2 px forest progress line at the top of the viewport. No full-page spinner. |
| Empty (no results) | R2 pattern: wireframe motif, headline with personality, the reason, one primary action. Example: **Nothing matches these filters.** Loosen the 60+ population floor or clear a filter. |
| Error | What failed, what the user can do, Retry, collapsible technical details. Never a raw stack trace. |
| Partial data | Hatched cells plus a banner: 4 metrics unavailable for this county; score uses state medians (flagged). |
| Offline | Banner plus cached data still usable. |
| Success | Toast plus inline check, never a modal. |
| Validation | Inline under the field with an icon and text, announced to screen readers. |
| 404 | Wireframe motif, link back to Explore, search box. |

### D.7 Domain-specific components

| Component | Purpose |
| --- | --- |
| Why-this-score card | Waterfall plus the three biggest drivers in plain English. |
| Confidence explainer | Popover: margin-of-error summary, share of imputed metrics, rank range. |
| Lookalikes list | Five nearest counties with similarity score, a mini arc map and a Compare action. |
| Compare tray | Sticky bottom tray that holds up to four selected areas as monogram chips with Compare and Clear. |
| Saved views menu | Named combinations of lens, filters and selection, stored in `localStorage`. |
| Eligibility control | 60+ population floor slider with histogram and a live count of areas that remain. |
| Source card | Source, table ID, vintage, geography, license or attribution, and caveats. |
| Metric row | Name, direction arrow, weight, source, vintage, margin-of-error handling. |
| Lineage diagram | Source to transform to metric to sub-score to score, as inline SVG. |
| Data freshness chip | Shows the oldest vintage in the current view. |
| Shortcut cheatsheet | Modal opened with `?`. |
| Ask the map (stretch) | Deterministic natural-language filter parser that turns a sentence into filter chips. No LLM. |

## E. Screen blueprints

Names in examples are illustrative placeholders. Never hard-code area names or numbers; everything comes from the data files.

### E.1 Explore (home)

The hero screen. It combines R4 (map plus floating glass) with R2 (shell, filters, wow motif).

```
+--------+-------------------------------------------------------------+
|Sidebar | Crumb | [Balanced|Final Exp|Legacy|Spouse] | Search  Share Export|
| 248    +-------------------------------------------------------------+
|        | [Answer card: Top pick for <lens>]      [Legend + histogram] |
|        | +-----------+                                                |
|        | | Top areas |        FULL-BLEED MAP (canvas, Albers)         |
|        | | glass 340 |                                                |
|        | | tabs, list|                         +----------------------+ |
|        | |           |                         | KPI card 420 (R4)    | |
|        | +-----------+  [zoom][reset][layers]  +----------------------+ |
|        |            [ Compare tray ]                                  |
+--------+-------------------------------------------------------------+
```

- **Answer card** (top-left, above the panel on first load): one headline sentence, score ring, rank range, confidence, and the single strongest reason. Dismissible, remembered.
- **Top areas panel** (glass, 340 px): Counties / States segmented control, search, filter icon that opens the filter menu, then 10 list rows (rank, monogram, name, score bar, confidence). Scroll for more. Hovering a row highlights the area on the map, and selecting an area on the map scrolls the list (R4 linking).
- **KPI card** (bottom-right, 420 px): for the selected area or, with no selection, the national summary. Four numerals with delta chips: Score, 60+ population, Estimated premium pool, Coverage-gap households. Corner arrow opens the drawer.
- **Legend** (top-center): ramp with histogram, draggable class breaks, hatch swatch, vintage chip.
- **Map controls** (bottom-left): zoom in and out, reset, layer menu (Score, Size, Affordability, Need, Reach, Whitespace), flow-arc toggle.
- **First load:** the dot-matrix map scans in over 600 ms and resolves into the choropleth. Skipped under reduced motion.

### E.2 Rankings

- **Header:** H1, the status sentence, then a toolbar row: Filter menu button, lens switcher, State multi-select, eligibility slider, column picker, density toggle, Export split button.
- **Chips row:** sentence-style filter chips (R7).
- **KPI strip** (R3): Areas ranked, 60+ residents covered, median score, share flagged low confidence.
- **Table:** per D.3.1. Default columns: Rank, Area, Score (bar), Rank range (whisker), Size, Affordability, Need, Reach, Whitespace, Confidence, 60+ population, 60+ growth (sparkline), Premium pool. Optional state grouping.
- **Selection bar:** appears when rows are checked: N selected, Compare, Export, Clear.

### E.3 Detail drawer and full page

The drawer is the product's signature interaction (R1). The same content is available as a full page at `/area/:fips` for sharing and print.

```
+---------------------------------------------+
| [TX] Area name, ST        #1   91    [x]    |  header band
| FIPS 48085  ACS 2020-2024  [High confidence]|
+---------------------------------------------+
| Overview | Drivers | People | Economy | Sources |  panel tabs
+----------------------------------+----------+
| SUMMARY =======================  | Summary  |
|  KPI trio + confidence           | Why      |
| WHY THIS SCORE ================  | Profile  |
|  contribution waterfall          | People   |
| PROFILE =======================  | Economy  |
|  Radar / Bars toggle             | Compete  |
| ...                              | Lookalike|
+----------------------------------+----------+
| [Compare]   [Share]   [Brief]    sticky foot |
+---------------------------------------------+
```

Sections, in order, each with a double-rule header and `micro` field labels:

1. **Summary:** score, rank and rank range, confidence badge, robust-pick badge, three plain-English driver sentences.
2. **Why this score:** contribution waterfall with count-up and metric-level hover.
3. **Profile:** radar (default on desktop) or percentile bars (default on phones), for area vs state vs US.
4. **People:** age pyramid, 60+ growth sparkline, household type, living arrangement.
5. **Economy:** income distribution of 65+ households, Social Security receipt, Elder Index headroom, home equity proxy.
6. **Competition and reach:** agents per 1,000 aged 60+ (bar with US marker), internet and broadband.
7. **Lookalikes:** five similar areas, similarity score, mini arc map, Compare buttons.
8. **Data and sources:** per-metric table with vintage, margin-of-error flag and imputation flag; source cards.

Polish: header band color is surface-3 with a 2 px forest top border, numerals are tabular, the active anchor in the right nav has the R1 pointer, and the footer actions stay visible while scrolling.

### E.4 Compare

Up to four columns. Sticky header cards (monogram, name, score ring, remove). Below: parallel-coordinates plot (six sub-score axes), then a delta table where the best value in each row is marked with a lime check and the worst with an amber dot, then a radar overlay (three series maximum, with a Bars toggle). Add-area search at the end of the header row.

### E.5 Scatter Explorer

Axis selectors at top (any numeric metric or sub-score), size = 60+ population, color = lens or region. Quadrant overlay with labels and adjustable thresholds (default medians). Brush a region to populate a side list with Compare and Export. Outliers are annotated automatically. Chart/Table toggle.

### E.6 Sensitivity Lab

Left pane: the weight mixer (D.2) with lens presets and a Reset. Right pane, stacked: bump chart (top 15 rank movement vs defaults), the rank-stability heatmap, and a Robust picks list with P(top 50). Everything recomputes live in under 16 ms of scoring time, with a polite live-region announcement of the new top three.

### E.7 Methodology and lineage

Sticky table of contents on the left. Content: the scoring formula as a typeset card, the metric catalog (searchable table: metric, direction, weight, source, vintage, margin-of-error handling), the lineage diagram, source cards with licenses and the required LIMRA attribution line, known limitations, the data-trap notes (Connecticut planning regions and so on), change log, and downloads for the CSV and `metrics.yaml`. Everything is generated from the same config as the pipeline.

### E.8 Print and PDF market brief

Always light theme. A4 and Letter safe. Layout: header with area name, lens, vintage and date; KPI row; static map thumbnail with the area highlighted; waterfall; percentile bars; competition; five-row lookalike table; sources and attribution footer. No animation, no glass, no gradients. Use print CSS with `break-inside: avoid` on every card.

### E.9 First run, empty, error and edge cases

- First run shows the answer card and, optionally, the four-step coachmark tour.
- A filter that removes everything shows the empty state with the primary action Clear filters.
- A failed data load shows the error state with Retry and keeps the shell usable.
- Areas below the eligibility floor render hatched and unranked, with a tooltip explaining why.
- Connecticut shows a small info marker explaining the planning-region geography.

## F. Interaction, motion, accessibility and performance

### F.1 Keyboard map

| Key | Action |
| --- | --- |
| `Cmd/Ctrl+K` | Command palette |
| `/` | Focus search |
| `F` | Open filter menu |
| `[` and `]` | Previous and next lens |
| Arrow keys | Move through list rows, table cells, or pan the map when it has focus |
| `Enter` | Open the drawer for the focused item |
| `Space` | Toggle selection |
| `C` | Add focused area to Compare |
| `Esc` | Close the top-most layer |
| `?` | Shortcut cheatsheet |
| `G` then `E` / `R` / `C` | Go to Explore / Rankings / Compare |
| `T` | Toggle theme |
| `D` | Toggle density |

### F.2 Map interaction

Hover shows the hovercard on pointer devices. Click selects and syncs the list and the drawer. Shift-click adds to compare. Scroll or pinch zooms 1 to 8x, drag pans, double-click zooms in, `0` resets. The cursor changes by state (pointer over areas, grab while panning). The map is operable by keyboard: Tab focuses the map, arrows pan, `+` and `-` zoom, and Enter selects the area nearest the center. A visually hidden ranked list mirrors what the map shows for screen readers.

### F.3 Motion behaviors

| Interaction | Behavior |
| --- | --- |
| Hover on rows and cards | Surface lifts one step, 120 ms |
| Press | Scale 0.98, 80 ms |
| Drawer | Slides in with the spring, scrim fades, 280 ms |
| Tab underline | Slides between tabs, 180 ms |
| Map recolor | 300 ms crossfade |
| Score and KPI numerals | Count up over 600 ms, once per open |
| Waterfall | Bars grow left to right in sub-score order, 24 ms stagger |
| Weight sliders | Live recolor with no easing on the numerals (they must stay legible) |
| Toasts | Rise 8 px and fade, 180 ms |

Under `prefers-reduced-motion` all of the above become a 100 ms fade or an instant change.

### F.4 Accessibility (WCAG 2.2 AA is the floor)

- Contrast: 4.5:1 for text, 3:1 for icons, chart marks and focus rings. Checked in CI with axe plus a token-pair contrast test.
- Focus: a visible 2 px ring with a 2 px offset on every interactive element. Focus is never hidden behind sticky bars (WCAG 2.2 focus-not-obscured).
- Target size: 44 px on touch, never below 24 px.
- Meaning is never color-only: status uses icon plus text, deltas use arrows, hatch means uncertainty, ranks use numbers.
- Charts: accessible name, one-sentence summary, a View as table twin, keyboard-reachable marks.
- Live regions: polite announcements for score recompute, filter result counts and toasts.
- Dialogs and drawers: focus trap, Esc, focus returns to the trigger, `aria-modal`.
- Landmarks and skip links on every page. Logical tab order. No keyboard traps.
- Reflow at 400% zoom without two-dimensional scrolling (except data tables and the map). Support `prefers-contrast` and `forced-colors`. Set `lang`.
- Provide the Colorblind-safe palette toggle and test the default ramp with a simulator.

### F.5 Performance rules for the UI layer

- Initial JavaScript under 250 KB gzipped. Route-level code splitting. Load charts and the map lazily after first paint.
- Animate only `transform` and `opacity`. No layout-thrashing animations.
- Use `backdrop-filter` on at most three elements at once, and drop it when `prefers-reduced-transparency` is set or the device is low-power.
- Virtualize any list over 100 rows. Canvas for the map and the scatter. SVG for small charts.
- Reserve space for async content. Preload the two fonts and the data file. Subset fonts.
- Scoring in a Web Worker. Debounce slider input with `requestAnimationFrame`. Use `useDeferredValue` for the table.
- Target LCP under 1.5 s on 4G, TBT under 100 ms, CLS under 0.02. Enforce with Lighthouse CI and size-limit.

## G. Content and microcopy

### G.1 Voice

Precise, confident, plain. Say what the number is and why it matters. Prefer margin of error to MOE. Sentence case everywhere except `micro` labels. No exclamation marks except the rare witty empty state. Explain every metric in a tooltip written for a marketing manager.

### G.2 Number and label formats

| Type | Format | Example |
| --- | --- | --- |
| Population | Compact in cards, full with separators in tables | 1.2M / 1,204,331 |
| Currency | Compact for pools, full for per-unit | $4.8B / $72,400 |
| Percent | One decimal, differences in points | 18.4% / +2.1 pts |
| Index | Integer plus context | 112 (US = 100) |
| Score | Integer 0 to 100 | 91 |
| Rank | Position and total, plus range | #12 of 3,098 (range #8–#19) |
| Vintage | En dash for ranges | ACS 2020–2024, Pop. est. July 2025 |
| Missing | Em dash with tooltip | — Not available for this area |
| Imputed | Value with a dotted marker | 41.2% with a marker: filled with the state median |

### G.3 Microcopy examples

| Where | Copy |
| --- | --- |
| Page subtitle | 3,098 counties ranked for Balanced. ACS 2020–2024, at least 2,000 residents aged 60+. |
| Empty results | Nothing matches these filters. Loosen the 60+ population floor or clear a filter. |
| Low confidence | Low confidence: this county has few residents aged 60+, so its estimates are noisy. Its rank could move by up to 140 places. |
| Robust pick | Robust pick: stays in the top 50 in 8 of 10 simulations. |
| Error | We could not load the data. Check your connection and try again. |
| Imputed tooltip | This value was missing, so the state median was used. |
| Ineligible | Not ranked: fewer than 2,000 residents aged 60+. |

## H. Do and don't, and design QA

### H.1 Do

- Use tokens for every color, radius, space, shadow and duration.
- Lead each screen with the answer, then the controls.
- Pair color with an icon, label or pattern.
- Keep one accent. Keep chrome quiet and data loud.
- Show vintage, confidence and source wherever a number appears.
- Build every state: loading, empty, error, partial, disabled.
- Keep tables dense, scannable and keyboard-operable.

### H.2 Don't

- No gradients on controls, no neon glows on data, no glass on tables or cards.
- No raw hex in components. No arbitrary spacing values.
- No pie charts, 3D charts or dual-axis charts. No radar beyond the six fixed axes.
- No photographs, stock avatars or emoji.
- No hover-only information. No color-only status. No text below 12 px.
- No modal for success. No full-page spinners. No layout shift.
- No lorem ipsum and no hard-coded sample numbers in shipped screens.

### H.3 Design QA checklist (run per component and per screen)

1. Uses only tokens. Passes lint for raw colors and off-scale spacing.
2. Verified in dark and light themes, comfortable and compact densities.
3. Verified at 375, 768, 1024, 1280, 1536 and 1920 px wide, plus phone landscape.
4. All states present: default, hover, focus-visible, pressed, selected, disabled, loading, empty, error.
5. Keyboard path complete, focus order logical, focus ring visible.
6. Screen reader name, role and state correct. Live regions fire.
7. Contrast checks pass. Colorblind simulation reviewed.
8. Reduced-motion and reduced-transparency behavior verified.
9. Performance budgets met. No layout shift. No dropped frames while dragging sliders.
10. Visual comparison against the matching reference (R1 to R8) for structure and polish, not for copying.

## I. Master frontend prompt

### I.1 How to feed it

Give the AI three things: this document saved as `docs/DESIGN_SYSTEM.md`, the eight images in `docs/design/references/`, and the prompt below. If the tool has a small context window, feed one phase at a time (each phase block is self-contained) and keep Sections 1 to 3 in every message.

```text
# MASTER FRONTEND PROMPT: Senior Life Insurance Market Finder UI

## 0. Role and mission
You are a principal product designer-engineer (senior UI/UX plus senior frontend). Build the complete frontend for a county and state ranking tool for life-insurance marketing to people over 60. The UI must feel like a premium command center: dark-first, data-dense but breathable, fast, accessible, and explainable. Two senior engineers must be able to read, explain and change every line in a live 30-minute call.

## 1. Sources of truth (read before writing any code)
1. docs/DESIGN_SYSTEM.md. Parts B to H are BINDING (tokens, type, motion, layout, components, screens, interaction, content, QA). If this prompt conflicts with them, they win.
2. docs/design/references/r1.webp to r8.webp. View every image. Study structure, hierarchy, spacing, state design and polish. Do NOT copy their branding, colors, logos or copy.
3. Data contract: web/public/data/counties.json (columnar), states.json, meta.json, topo.json (us-atlas Albers), plus config/metrics.yaml for metric labels, directions, weights, sources and vintages. The scoring worker (web/src/workers/score.worker.ts) already returns scores; never recompute scores on the main thread.
Before Phase 0, write docs/design/DESIGN_BRIEF.md (one page): what you take from each reference (R1 to R8), your token decisions, risks. Then build.

## 2. Stack and constraints
Vite + React + TypeScript (strict), Tailwind mapped to CSS-variable tokens, shadcn/ui and Radix primitives restyled to our tokens, TanStack Table + Virtual, ECharts (tree-shaken) for non-map charts, d3-geo + canvas for the map, Zustand for state, nuqs for URL state, Lucide icons, Geist Sans and Geist Mono self-hosted and subset. No other UI kits or icon packs. Static hosting only. No external network requests at runtime (fonts are self-hosted). Any localStorage use is wrapped in try/catch and has an empty-state fallback. Pin exact versions, install latest stable, avoid releases under 14 days old.

## 3. Non-negotiable rules
R1 Tokens only. Add a lint rule (stylelint or eslint plugin) that fails on raw hex, rgb(), and arbitrary Tailwind spacing or color values in components.
R2 Dark and light themes AND comfortable and compact densities from day one. Default theme follows prefers-color-scheme, with a visible toggle. Printed brief is always light.
R3 Every component ships with ALL states (default, hover, focus-visible, pressed, selected, disabled, loading, empty, error as applicable), both themes, both densities, keyboard behavior, and an entry in the /design gallery route.
R4 WCAG 2.2 AA is a floor. axe runs in Playwright on every screen. Meaning is never color-only. Charts have a View as table twin, an accessible name and a text summary.
R5 Responsive exactly per Part C: verify at 375, 768, 1024, 1280, 1536 and 1920 px plus phone landscape. Use container queries for components.
R6 Performance budgets: initial JS under 250 KB gzipped, LCP under 1.5 s on 4G, TBT under 100 ms, CLS under 0.02, 60 fps while dragging sliders and panning the map. Enforce with Lighthouse CI and size-limit.
R7 Never hard-code area names, numbers or rankings. Everything comes from the data files. If a field is missing, say so in DEVIATIONS.md and render the partial-data state; do not fake it.
R8 One accent (forest). Lime is reserved for positive and robust. Glass only on floating overlays (max 3 blurred elements at once). Hatch means uncertainty or ineligible, and the legend must say so.
R9 No pie charts, 3D charts, dual axes or photos. Radar only for the six fixed sub-score axes, always with a Bars toggle.
R10 Copy follows Part G (sentence case, margin of error not MOE, vintage shown, numbers via a single format.ts).
R11 Explainable code: components under about 150 lines, composition over configuration, comments only where logic is non-obvious, no clever metaprogramming. Conventional Commits, one component or feature per commit.
R12 Never mark a phase done without screenshots and passing tests. Record any departure from the design system in docs/design/DEVIATIONS.md with the reason.

## 4. Folder layout
web/src/
  design-system/  tokens/ (tokens.css, tailwind.preset.ts, motion.ts)  primitives/  patterns/ (KpiCard, DataTable, Drawer, FilterBuilder, ...)  charts/ (ChartFrame, echarts-theme.ts, ...)  map/ (ChoroplethCanvas, layers/, Legend, Hero)  gallery/
  views/ (Explore, Rankings, Area, Compare, Scatter, Sensitivity, Methodology, PrintBrief)
  state/ (store.ts, url.ts, format.ts)
  workers/ (score.worker.ts)

## 5. Reference-to-component map (consult the image before building each)
r1: Drawer, KeyValueList, SectionHeader double rule, in-panel anchor nav with scroll-spy, summary chips, panel tabs.
r2: Sidebar, sidebar CTA, FilterBuilder menu with key hint, EmptyState with wireframe motif, SegmentedControl, Breadcrumb, glass menus.
r3: Pill sub-tabs, KPI strip with hairlines, percent pills, bar-with-marker, theme toggle, grouped table rows.
r4: Explore layout (full-bleed map plus glass panels), list row with linked selection, KPI card with delta chips, flow arcs.
r5: Light-theme dark sidebar option, toggle legends, hatched bands, heatmap, ring stats, KPI cards with corner links.
r6: Detail header metadata strip, radar styling, polar idea, hover rows.
r7: Sentence filter chips, status headers with counts, two views of one dataset, severity dots.
r8: Stepper, DataTable inline bars, bulk selection bar, live status sentence under the title, dark-ink-on-bright-button contrast.

## 6. Phases (finish each with a status report: components built, screenshots at 3 widths and 2 themes, test results, deviations, next)

### Phase 0: Foundations
tokens.css for both themes exactly as in B.2, Tailwind preset mapping, Geist fonts, ThemeProvider and DensityProvider (try/catch persistence), motion utilities (B.7) with reduced-motion handling, breakpoints and container-query helpers, Lucide wrapper, the lint rule from R1, a /design gallery shell with token swatches, type scale, elevation and a contrast test of every text/background token pair. Acceptance: gallery renders in both themes; contrast test passes.

### Phase 1: Primitives
Button (primary, secondary, ghost, destructive, link, icon, split), Input, SearchInput with key hint, NumberInput, Select and Combobox (virtualized for 3,144 items), Checkbox (indeterminate), Switch, Radio, Slider (single, range with histogram, weight slider with lock and default tick), Tabs (underline, pill, panel), SegmentedControl, Chip, FilterChip (sentence form), Badge family (status, confidence, robust pick, rank, lens, vintage, imputed), Tooltip, Popover, DropdownMenu, ContextMenu, Toast. Acceptance: all states, keyboard, axe clean, gallery entries.

### Phase 2: Shell
Sidebar (expanded, rail, hidden), TopBar, Breadcrumb, BottomTabBar, LensSwitcher with [ and ] keys, ThemeToggle, SettingsPopover (theme, density, palette, units, reduce motion), CommandPalette (Cmd/Ctrl+K, fuzzy search over areas, actions, views), Banner, FooterBar with LIMRA attribution, route skeletons. Acceptance: shell behaves per C.3 at every breakpoint.

### Phase 3: Data display
Card, KpiCard, KpiStrip, HeroAnswerCard, DeltaChip, ScoreChip, Monogram, KeyValueList, SectionHeader, ProgressBar, ProgressRing, ListRow, RankingCard, Skeletons, EmptyState (with the wireframe motif), ErrorState, DataTable (every feature in D.3.1). Acceptance: 3,144-row table scrolls at 60 fps, keyboard path complete.

### Phase 4: Chart kit
ChartFrame (title, subtitle, vintage chip, View as table, summary text, loading, empty, error), an ECharts theme generated from tokens, then Waterfall, Radar/Bars toggle, PercentileBars, RankWhisker, Sparkline, AgePyramid, Histogram, StackedBar, BarWithMarker, Scatter (quadrants, brush), HeatmapMatrix, BumpChart, ParallelCoordinates, Legend (toggle, hatch swatch), ChartTooltip (glass). Acceptance: every chart has all three states and a table twin; no chart exceeds 6 colors.

### Phase 5: Map
Canvas choropleth from pre-projected us-atlas with Alaska and Hawaii insets, quadtree hit-testing, offscreen layers (fill, hatch, strokes, selection and compare rings), d3-zoom pan and zoom 1 to 8x, hovercard, legend with histogram and draggable class breaks, dot-matrix hero with the 600 ms scan, flow-arc layer (top 10 flows), keyboard navigation, a visually hidden ranked list mirror. Acceptance: recolor in under 16 ms for 3,144 polygons, 60 fps pan and zoom, selection syncs with list and URL.

### Phase 6: Overlays
Drawer (slide-over on desktop, bottom sheet on phones, spring motion, focus trap, URL-synced), Modal (becomes a sheet on phones), BottomSheet with snap points 96 px, 50% and 92%, ShareDialog, BriefPreview. Acceptance: focus returns to trigger, Esc closes the top layer, no scroll lock bugs on iOS Safari.

### Phase 7: Screens
Build each exactly per Part E: Explore, Rankings, Area detail (drawer and /area/:fips page), Compare, Scatter Explorer, Sensitivity Lab (weight mixer rebalancing to sum 100, live bump chart and heatmap), Methodology and lineage (generated from metrics.yaml), PrintBrief (light only, A4 and Letter). Acceptance: every screen works at all breakpoints and in both themes, with loading, empty, error and partial-data states.

### Phase 8: Wow and polish
Hero scan, count-ups, waterfall growth stagger, glass tuning, empty-state motif, micro-interactions, tooltips and hover choreography. Reduced-motion and reduced-transparency fallbacks. Acceptance: side-by-side review against r1 to r8 for hierarchy and polish; Lighthouse budgets met.

### Phase 9: QA and handoff
Playwright screenshots (Explore, Rankings, Area drawer, Compare, Sensitivity Lab, Methodology) at 6 widths x 2 themes x 2 densities, axe on every screen, keyboard walkthrough tests, contrast test, Lighthouse CI, size-limit, visual-regression baseline. Write docs/design/DESIGN_QA.md using the checklist in H.3, and a docs/design/UI_LIVE_CHANGE_PLAYBOOK.md with recipes for: change the accent color, add a table column, add a lens, change a chart palette, add a filter field, change the default density, add a KPI card. Verify each recipe takes under 5 minutes.

## 7. Component API conventions
Props: variant, size, plus explicit state flags. Support asChild via Radix where appropriate. Merge classNames with a cn helper. Style state through data-state attributes and aria-* (not extra classes). Controlled and uncontrolled modes. No inline styles except dynamic CSS variables. Each component exports a typed props interface and has a gallery entry.

## 8. State and data
Zustand store: lens, weights, filters, selection, compare set, theme, density, palette. nuqs syncs lens, weights (compact hash), filters, area and compare to the URL so every view is shareable. Scores arrive from the worker as Float32Array. All numbers and labels go through format.ts following G.2. Areas below the eligibility floor render hatched and unranked.

## 9. Working agreement
Before each phase list the components, the reference that informs each, and any decision you need to make. After each phase, report screenshots, test results and deviations. Ask me only if blocked; otherwise decide and note it. Never skip a state, a theme, a breakpoint or an accessibility check to save time. Start now with the design brief, then Phase 0.

## 10. Definition of done
All phases complete. Gallery documents every component. Every screen verified at 6 widths, 2 themes, 2 densities. axe clean. Contrast tests pass. Budgets met. DESIGN_QA.md, DEVIATIONS.md and UI_LIVE_CHANGE_PLAYBOOK.md written. No raw hex, no hard-coded data, no lorem ipsum anywhere.
```

### I.2 Sources and notes

- Design analysis is drawn from the eight reference screenshots provided. Color-contrast figures in B.2 were computed from the stated hex values and should be re-verified by the CI contrast test.
- Font choices (Geist) and icon set (Lucide) are recommendations from general knowledge. Confirm current licenses and availability before adopting, and keep a fallback stack.
- The technical stack and performance budgets are consistent with the data and engineering plan in the earlier blueprint document for this project.
