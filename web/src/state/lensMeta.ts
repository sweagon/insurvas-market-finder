import type { LensId, SubScoreId } from "../data/types";

export const LENS_ORDER: LensId[] = [
  "volume",
  "balanced",
  "final_expense",
  "legacy_wealth",
  "spouse_protection",
];

export const LENS_COLOR: Record<LensId, string> = {
  volume: "var(--lens-volume)",
  balanced: "var(--lens-balanced)",
  final_expense: "var(--lens-final_expense)",
  legacy_wealth: "var(--lens-legacy_wealth)",
  spouse_protection: "var(--lens-spouse_protection)",
};

export const SUBSCORE_ORDER: SubScoreId[] = [
  "size",
  "affordability",
  "need",
  "reachability",
  "whitespace",
  "insurability",
];

export const SUBSCORE_COLOR: Record<SubScoreId, string> = {
  size: "var(--sub-size)",
  affordability: "var(--sub-affordability)",
  need: "var(--sub-need)",
  reachability: "var(--sub-reachability)",
  whitespace: "var(--sub-whitespace)",
  insurability: "var(--sub-insurability)",
};

export const SUBSCORE_LABEL: Record<SubScoreId, string> = {
  size: "Size",
  affordability: "Affordability",
  need: "Need",
  reachability: "Reachability",
  whitespace: "Whitespace",
  insurability: "Insurability",
};
