import { create } from "zustand";
import catalog from "../data/catalog.generated.json";
import {
  DEFAULT_LENS,
  type CountyRow,
  type LensId,
  type LensScore,
  type MetaCatalog,
  type StateRow,
  type SubScoreId,
} from "../data/types";
import type { Source } from "../data/load";

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

/** Map fill: the overall opportunity score, or one sub-score. */
export type MapLayer = "score" | SubScoreId;

interface State {
  source: Source;
  catalog: MetaCatalog | null;
  counties: CountyRow[];
  states: StateRow[];
  lens: LensId;
  weights: SubScoreWeights;
  selectedFips: string | null;
  compare: string[];
  filters: Filters;
  chart: ChartMode;
  mapLayer: MapLayer;
  loaded: boolean;
  loadError: string | null;
  loadedLenses: LensId[];
  rankingsLoaded: boolean;

  setData: (data: {
    source: Source;
    catalog: MetaCatalog | null;
    counties: CountyRow[];
    states: StateRow[];
    loadedLenses?: LensId[];
    rankingsLoaded?: boolean;
  }) => void;
  mergeLensScores: (lens: LensId, scores: Map<string, LensScore>, source?: Source) => void;
  mergeAllScores: (
    scores: Map<string, Record<LensId, LensScore>>,
    lensIds: LensId[],
    source?: Source,
  ) => void;
  setLoadError: (msg: string | null) => void;
  setLens: (l: LensId) => void;
  setWeights: (w: SubScoreWeights) => void;
  select: (fips: string | null) => void;
  toggleCompare: (fips: string) => void;
  clearCompare: () => void;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  clearFilters: () => void;
  setChart: (patch: Partial<ChartMode>) => void;
  setMapLayer: (layer: MapLayer) => void;
}

/** Maximum number of counties that can be compared side by side. */
export const MAX_COMPARE = 4;

/**
 * Sub-score weights come from the generated catalogue, never from a literal
 * in this file. `DEFAULT_WEIGHTS` is the default lens; `weightsFor(lens)` is
 * the live value used by the mixer and the worker.
 */
export const DEFAULT_WEIGHTS: SubScoreWeights = {
  ...(catalog.lenses[DEFAULT_LENS].weights as Record<SubScoreId, number>),
};

export function weightsFor(lens: LensId): SubScoreWeights {
  return {
    ...(catalog.lenses[lens].weights as Record<SubScoreId, number>),
  };
}

export const useStore = create<State>((set, get) => ({
  source: "snapshot",
  catalog: null,
  counties: [],
  states: [],
  lens: DEFAULT_LENS,
  weights: { ...DEFAULT_WEIGHTS },
  selectedFips: null,
  compare: [],
  filters: { states: [], minPop60: 2000, minScore: 0, query: "", category: "all" },
  chart: { profile: "radar", data: "chart" },
  mapLayer: "score",
  loaded: false,
  loadError: null,
  loadedLenses: [],
  rankingsLoaded: false,
  setData: ({ source, catalog, counties, states, loadedLenses = [], rankingsLoaded = false }) => {
    const lens = get().lens;
    set({
      source,
      catalog,
      counties,
      states,
      loaded: true,
      loadError: null,
      loadedLenses,
      rankingsLoaded,
      weights: weightsFor(lens),
    });
  },
  mergeLensScores: (lens, scores, source) =>
    set((s) => ({
      counties: s.counties.map((county) =>
        scores.has(county.fips)
          ? { ...county, scores: { ...county.scores, [lens]: scores.get(county.fips)! } }
          : county,
      ),
      loadedLenses: s.loadedLenses.includes(lens) ? s.loadedLenses : [...s.loadedLenses, lens],
      ...(source ? { source } : {}),
    })),
  mergeAllScores: (scores, lensIds, source) =>
    set((s) => ({
      counties: s.counties.map((county) => {
        const next = scores.get(county.fips);
        return next ? { ...county, scores: next } : county;
      }),
      loadedLenses: Array.from(new Set([...s.loadedLenses, ...lensIds])),
      rankingsLoaded: true,
      ...(source ? { source } : {}),
    })),
  setLoadError: (loadError) => set({ loadError }),
  setLens: (lens) =>
    set({ lens, weights: weightsFor(lens) }),
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
  setMapLayer: (mapLayer) => set({ mapLayer }),
}));
