import { create } from "zustand";
import type { CountyRecord, LensId, RankingsPayload } from "./data/types";
import type { Source } from "./data/load";

interface State {
  payload: RankingsPayload | null;
  source: Source;
  lens: LensId;
  selected: CountyRecord | null;
  query: string;
  setPayload: (p: RankingsPayload, source: Source) => void;
  setLens: (l: LensId) => void;
  select: (c: CountyRecord | null) => void;
  setQuery: (q: string) => void;
}

export const useStore = create<State>((set) => ({
  payload: null,
  source: "snapshot",
  lens: "volume",
  selected: null,
  query: "",
  setPayload: (payload, source) => set({ payload, source }),
  setLens: (lens) => set({ lens, selected: null }),
  select: (selected) => set({ selected }),
  setQuery: (query) => set({ query }),
}));
