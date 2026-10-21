export type LensId =
  | "volume"
  | "balanced"
  | "final_expense"
  | "legacy_wealth"
  | "spouse_protection";

export type SubScoreId =
  | "size"
  | "affordability"
  | "need"
  | "reachability"
  | "whitespace"
  | "insurability";

export const SUB_SCORE_IDS: readonly SubScoreId[] = [
  "size",
  "affordability",
  "need",
  "reachability",
  "whitespace",
  "insurability",
];

export interface LensInfo {
  label: string;
  description: string;
  default?: boolean;
  weights?: Partial<Record<SubScoreId, number>>;
}

export interface MetricMeta {
  id: string;
  label: string;
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
  caveats: string;
}

export interface SubScoreMeta {
  label: string;
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
  total: number;
  p05: number;
  p95: number;
  rank: number | null;
  eligible: boolean;
  sub: Record<string, number>;
  rank_p05?: number | null;
  rank_p50?: number | null;
  rank_p95?: number | null;
  p_top50?: number | null;
  partial?: boolean;
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
  total: number;
  p05: number;
  p95: number;
  rank: number | null;
  eligible: boolean;
  /** Sub-scores scaled to 0-100. */
  subscores: Record<SubScoreId, number>;
  rank_p05: number | null;
  rank_p50: number | null;
  rank_p95: number | null;
  /** Probability the county lands in the top 50 under this lens. */
  p_top50: number | null;
  /** True when at least one sub-score could not be computed for this county. */
  partial: boolean;
}

/** A county row as held in the store: identity + metric matrix + scores. */
export interface CountyRow {
  fips: string;
  name: string;
  state: string;
  abbr: string;
  pop60: number;
  metrics: Record<string, number | string | null>;
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
