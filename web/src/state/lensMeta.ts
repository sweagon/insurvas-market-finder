import catalog from "../data/catalog.generated.json";
import { LENS_IDS, SUB_SCORE_IDS, type LensId, type SubScoreId } from "../data/types";

/**
 * Identity, order and labels are generated from config/metrics.yaml; only the
 * presentation palette lives here. A new lens or sub-score picks up the next
 * Okabe-Ito slot automatically, and `lensMeta.test.ts` fails if two ids within
 * one dimension share a colour.
 */
export const LENS_ORDER: LensId[] = [...LENS_IDS];
export const SUBSCORE_ORDER: SubScoreId[] = [...SUB_SCORE_IDS];

const LENS_COLOR_KNOWN: Record<string, string> = {
  volume: "#0072b2",
  balanced: "#56b4e9",
  final_expense: "#e69f00",
  legacy_wealth: "#cc79a7",
  spouse_protection: "#009e73",
};

const SUBSCORE_COLOR_KNOWN: Record<string, string> = {
  size: "#56b4e9",
  affordability: "#e69f00",
  need: "#cc79a7",
  reachability: "#009e73",
  whitespace: "#0072b2",
  insurability: "#f0e442",
};

/** Colourblind-safe fallback for ids added after this file was written. */
const PALETTE = [
  "#0072b2",
  "#56b4e9",
  "#e69f00",
  "#cc79a7",
  "#009e73",
  "#f0e442",
  "#b8a800",
  "#d55e00",
];

function colourMap(
  ids: readonly string[],
  known: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    ids.map((id, i) => [id, known[id] ?? PALETTE[i % PALETTE.length]]),
  );
}

export const LENS_COLOR = colourMap(LENS_ORDER, LENS_COLOR_KNOWN) as Record<
  LensId,
  string
>;
export const SUBSCORE_COLOR = colourMap(
  SUBSCORE_ORDER,
  SUBSCORE_COLOR_KNOWN,
) as Record<SubScoreId, string>;

export const SUBSCORE_LABEL = Object.fromEntries(
  SUBSCORE_ORDER.map((id) => [id, catalog.subscores[id].label]),
) as Record<SubScoreId, string>;

export const LENS_LABEL = Object.fromEntries(
  LENS_ORDER.map((id) => [id, catalog.lenses[id].label]),
) as Record<LensId, string>;
