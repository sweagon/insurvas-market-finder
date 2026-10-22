import catalog from "./catalog.generated.json";

/**
 * Identity comes from `catalog.generated.json`, which the pipeline writes from
 * config/metrics.yaml. Adding a lens, sub-score or metric is a config change:
 * the unions, order and labels follow automatically (see
 * docs/design/UI_LIVE_CHANGE_PLAYBOOK.md).
 */
export type LensId = keyof typeof catalog.lenses;
export type SubScoreId = keyof typeof catalog.subscores;

export const CATALOG_CONFIG_HASH = catalog.config_hash;
export const FLAG_DESCRIPTIONS: Record<string, string> = catalog.flag_descriptions;
export const DEFAULT_LENS = catalog.default_lens as LensId;
export const LENS_IDS = catalog.lens_order as readonly LensId[];
export const SUB_SCORE_IDS = catalog.subscore_order as readonly SubScoreId[];
/** Column names in counties.json that are booleans, not metrics. */
export const FLAG_COLUMNS: readonly string[] = catalog.flags;
/** Every unit the catalogue declares; format.ts must handle each one. */
export const CATALOG_UNITS: readonly string[] = catalog.units;

export interface LensInfo {
  label: string;
  long_label?: string;
  description: string;
  default?: boolean;
  weights?: Record<string, number>;
  flip_insurance_sign?: boolean;
}

export interface MetricMeta {
  id: string;
  label: string;
  /** Plain-English explanation for the metric tooltip (Part G.1). */
  description: string;
  subscore: SubScoreId;
  source: string;
  table_field: string;
  vintage: string;
  unit: string;
  direction: "higher_is_better" | "lower_is_better";
  transform: string;
  moe: string;
  scored: boolean;
  modeled: boolean;
  /** County flags that mark this metric as imputed or shrunk. */
  flags: string[];
  caveats: string;
}

export interface SubScoreMeta {
  label: string;
  long_label?: string;
  description: string;
}

export interface BuildMeta {
  built_at: string;
  config_version: number;
  config_hash: string;
  vintages: Record<string, string | number>;
  counties: number;
  eligible: number;
  lenses: LensId[];
  mc_draws: number;
  [key: string]: unknown;
}

export interface BuildParams {
  target_age_min: number;
  econ_age_min: number;
  eligibility_min_60plus: number;
  winsor_lower: number;
  winsor_upper: number;
  monte_carlo_draws: number;
  monte_carlo_moe_confidence: number;
  shrinkage: string;
}

export interface SourceMeta {
  name: string;
  url: string;
  license: string;
  attribution: string;
  caveats?: string;
}

/** The metric catalogue emitted by the build into `meta.json`. */
export interface MetaCatalog {
  meta: BuildMeta;
  vintages: Record<string, string | number>;
  params: BuildParams;
  default_lens: LensId;
  subscore_order: SubScoreId[];
  lens_order: LensId[];
  flags: string[];
  units: string[];
  subscores: Record<SubScoreId, SubScoreMeta>;
  lenses: Record<LensId, LensInfo>;
  metrics: MetricMeta[];
  sources: Record<string, SourceMeta>;
  rule_R7: string;
}

/**
 * Score bundle for one county under one lens, as served by the build.
 *
 * `p05`/`p95` are percentiles of the **total score**. `rank_p05`/`rank_p95`
 * are percentiles of the **rank** and are the only values that may be
 * presented to a user as a rank range.
 */
export interface ApiLensScore {
  total: number | null;
  p05: number | null;
  p95: number | null;
  rank: number | null;
  eligible: boolean;
  sub: Record<string, number | null>;
  rank_p05?: number | null;
  rank_p50?: number | null;
  rank_p95?: number | null;
  p_top50?: number | null;
  partial?: boolean;
  /** Share of the sub-score weight that could be computed for this county. */
  coverage?: number | null;
}

/** A county as served in `rankings.json`. */
export interface CountyRanking {
  fips: string;
  name: string;
  state: string;
  pop60: number;
  scores: Record<LensId, ApiLensScore>;
}

export interface RankingsPayload {
  meta: BuildMeta;
  lenses: Record<LensId, LensInfo>;
  counties: CountyRanking[];
}

/** Score bundle after the SPA has normalised sub-scores to a 0-100 scale. */
export interface LensScore {
  total: number | null;
  p05: number | null;
  p95: number | null;
  rank: number | null;
  eligible: boolean;
  /** Sub-scores scaled to 0-100; `null` when the sub-score was unavailable. */
  subscores: Record<SubScoreId, number | null>;
  rank_p05: number | null;
  rank_p50: number | null;
  rank_p95: number | null;
  /** Probability the county lands in the top 50 under this lens. */
  p_top50: number | null;
  /** True when at least one sub-score could not be computed for this county. */
  partial: boolean;
  /** Share of the sub-score weight that could be computed (1 = complete). */
  coverage: number | null;
}

/** A county row as held in the store: identity + metric matrix + scores. */
export interface CountyRow {
  fips: string;
  name: string;
  state: string;
  abbr: string;
  pop60: number;
  metrics: Record<string, string | number | boolean | null>;
  scores: Record<LensId, LensScore>;
}

export interface StateRow {
  state_fips: string;
  name: string;
  abbr: string;
  counties: number;
  pop60: number;
  [key: string]: unknown;
}
