export type LensId =
  | "volume"
  | "balanced"
  | "final_expense"
  | "legacy_wealth"
  | "spouse_protection";

export interface LensInfo {
  label: string;
  description: string;
  default?: boolean;
}

export interface CountyRecord {
  fips: string;
  name: string;
  state: string;
  pop60: number;
  scores: Record<
    LensId,
    {
      total: number;
      p05: number;
      p95: number;
      rank: number | null;
      eligible: boolean;
      sub: Record<string, number>;
    }
  >;
}

export interface RankingsPayload {
  meta: {
    built_at: string;
    config_version: number;
    config_hash: string;
    vintages: Record<string, string | number>;
    counties: number;
    eligible: number;
    lenses: string[];
    mc_draws: number;
  };
  lenses: Record<LensId, LensInfo>;
  counties: CountyRecord[];
}

export interface ApiRankingRow {
  fips: string;
  name: string;
  state: string;
  total_pop: number;
  pop_60plus: number;
  total: number;
  p05: number;
  p95: number;
  rank: number;
  eligible: boolean;
  size: number;
  affordability: number;
  need: number;
  reachability: number;
  whitespace: number;
  insurability: number;
}
