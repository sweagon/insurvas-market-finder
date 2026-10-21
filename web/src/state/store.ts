import { create } from "zustand";
import type {
  County,
  LensId,
  MetaCatalog,
  Source,
  StateRecord,
  SubScoreId,
} from "../data/types";

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

interface State {
  source: Source;
  catalog: MetaCatalog | null;
  counties: County[];
  states: StateRecord[];
  lens: LensId;
  weights: Record<SubScoreId, number>;
  view: ViewId;
  selectedFips: string | null;
  compare: string[];
  filters: Filters;
  chart: ChartMode;
  loaded: boolean;
  loadError: string | null;

  setData: (data: {
    source: Source;
    catalog: MetaCatalog;
    counties: County[];
    states: StateRecord[];
  }) => void;
  setLoadError: (msg: string | null) => void;
  setLens: (l: LensId) => void;
  setView: (v: ViewId) => void;
  setWeights: (w: Record<SubScoreId, number>) => void;
  select: (fips: string | null) => void;
  toggleCompare: (fips: string) => void;
  clearCompare: () => void;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  clearFilters: () => void;
  setChart: (patch: Partial<ChartMode>) => void;
}

export const DEFAULT_WEIGHTS: Record<SubScoreId, number> = {
  size: 25,
  affordability: 20,
  need: 15,
  reachability: 15,
  whitespace: 15,
  insurability: 10,
};

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

  setData: ({ source, catalog, counties, states }) =>
    set({ source, catalog, counties, states, loaded: true, loadError: null }),
  setLoadError: (loadError) => set({ loadError }),
  setLens: (lens) => {
    const catalog = get().catalog;
    const weights = catalog
      ? { ...(catalog.lenses[lens].weights as Record<SubScoreId, number>) }
      : { ...DEFAULT_WEIGHTS };
    set({ lens, weights });
  },
  setView: (view) => set({ view }),
  setWeights: (weights) => set({ weights }),
  select: (selectedFips) => set({ selectedFips }),
  toggleCompare: (fips) =>
    set((s) => ({
      compare: s.compare.includes(fips)
        ? s.compare.filter((f) => f !== fips)
        : s.compare.length >= 4
          ? s.compare
          : [...s.compare, fips],
    })),
  clearCompare: () => set({ compare: [] }),
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),
  clearFilters: () =>
    set({ filters: { states: [], minPop60: 2000, minScore: 0, query: "", category: "all" } }),
  setChart: (patch) => set((s) => ({ chart: { ...s.chart, ...patch } })),
}));

export function selectedCounty(): County | null {
  const { counties, selectedFips } = useStore.getState();
  if (!selectedFips) return null;
  return counties.find((c) => c.fips === selectedFips) ?? null;
}
