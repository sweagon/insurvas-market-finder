import { create } from "zustand";
import type { CountyRow, LensId, MetaCatalog, StateRow, SubScoreId } from "../data/types";
import type { Source } from "../data/load";

export type ViewId =
  | "explore"
  | "rankings"
  | "compare"
  | "scatter"
  | "sensitivity"
  | "methodology"
  | "area"
  | "design";

export interface ChartMode {
  profile: "radar" | "bars";
  data: "chart" | "table";
}

export interface Filters {
  states: string[];
  minPop60: number;
  minScore: number;
  query: string;
  category: string;
}

export type SubScoreWeights = Record<SubScoreId, number>;

interface State {
  source: Source;
  catalog: MetaCatalog | null;
  counties: CountyRow[];
  states: StateRow[];
  lens: LensId;
  weights: SubScoreWeights;
  view: ViewId;
  selectedFips: string | null;
  compare: string[];
  filters: Filters;
  chart: ChartMode;
  loaded: boolean;
  loadError: string | null;

  setData: (data: {
    source: Source;
    catalog: MetaCatalog | null;
    counties: CountyRow[];
    states: StateRow[];
  }) => void;
  setLoadError: (msg: string | null) => void;
  setLens: (l: LensId) => void;
  setView: (v: ViewId) => void;
  setWeights: (w: SubScoreWeights) => void;
  select: (fips: string | null) => void;
  toggleCompare: (fips: string) => void;
  clearCompare: () => void;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  clearFilters: () => void;
  setChart: (patch: Partial<ChartMode>) => void;
}

/** Maximum number of counties that can be compared side by side. */
export const MAX_COMPARE = 4;

/**
 * Fallback sub-score weights.
 *
 * These are only a placeholder for the moment before the metric catalogue
 * arrives. Every configured lens ships its own weights in `meta.json`, and
 * `setData`/`setLens` overwrite these wholesale - see `weightsFor`.
 */
export const DEFAULT_WEIGHTS: SubScoreWeights = {
  size: 25,
  affordability: 20,
  need: 15,
  reachability: 15,
  whitespace: 15,
  insurability: 10,
};

/**
 * Resolve the effective sub-score weights for a lens.
 *
 * Configured lens weights are a partial override on top of `DEFAULT_WEIGHTS`,
 * so a lens that only tunes two sub-scores still scores all six.
 */
export function weightsFor(
  catalog: MetaCatalog | null,
  lens: LensId,
): SubScoreWeights {
  const lensWeights = catalog?.lenses?.[lens]?.weights;
  if (!lensWeights) return { ...DEFAULT_WEIGHTS };
  return { ...DEFAULT_WEIGHTS, ...lensWeights } as SubScoreWeights;
}

export const useStore = create<State>((set, get) => ({
  source: "snapshot",
  catalog: null,
  counties: [],
  states: [],
  lens: "volume",
  weights: { ...DEFAULT_WEIGHTS },
  view: "explore",
  selectedFips: null,
  compare: [],
  filters: { states: [], minPop60: 2000, minScore: 0, query: "", category: "all" },
  chart: { profile: "radar", data: "chart" },
  loaded: false,
  loadError: null,
  setData: ({ source, catalog, counties, states }) => {
    const lens = get().lens;
    set({
      source,
      catalog,
      counties,
      states,
      loaded: true,
      loadError: null,
      weights: weightsFor(catalog, lens),
    });
  },
  setLoadError: (loadError) => set({ loadError }),
  setLens: (lens) =>
    set({ lens, weights: weightsFor(get().catalog, lens) }),
  setView: (view) => set({ view }),
  setWeights: (weights) => set({ weights }),
  select: (selectedFips) => set({ selectedFips }),
  toggleCompare: (fips) =>
    set((s) => ({
      compare: s.compare.includes(fips)
        ? s.compare.filter((f) => f !== fips)
        : s.compare.length >= MAX_COMPARE
          ? s.compare
          : [...s.compare, fips],
    })),
  clearCompare: () => set({ compare: [] }),
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),
  clearFilters: () =>
    set({
      filters: {
        states: [],
        minPop60: 2000,
        minScore: 0,
        query: "",
        category: "all",
      },
    }),
  setChart: (patch) => set((s) => ({ chart: { ...s.chart, ...patch } })),
}));
