import { useEffect, useRef } from "react";
import { useStore } from "./store";
import { LENS_ORDER } from "./lensMeta";
import type { LensId } from "../data/types";

/**
 * Two-way URL state (design §8): lens, area, compare set and the 60+ floor are
 * encoded in the query string so every view is shareable. We keep this small
 * and dependency-light rather than pulling in a full serializer.
 */
export function useUrlSync(): void {
  const { lens, selectedFips, compare, filters, setLens, select, setFilter, toggleCompare } =
    useStore();
  const hydrated = useRef(false);

  // Hydrate once from the URL.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const q = new URLSearchParams(window.location.search);
    const l = q.get("lens");
    if (l && (LENS_ORDER as string[]).includes(l)) setLens(l as LensId);
    const area = q.get("area");
    if (area) select(area);
    const states = q.get("states");
    if (states) setFilter("states", states.split(",").filter(Boolean));
    const floor = q.get("floor");
    if (floor && !Number.isNaN(Number(floor))) setFilter("minPop60", Number(floor));
    const cmp = q.get("compare");
    if (cmp) {
      for (const f of cmp.split(",").filter(Boolean)) toggleCompare(f);
    }
    const minScore = q.get("score");
    if (minScore && !Number.isNaN(Number(minScore))) setFilter("minScore", Number(minScore));
  }, [setLens, select, setFilter, toggleCompare]);

  // Reflect state back into the URL.
  useEffect(() => {
    const q = new URLSearchParams();
    if (lens !== "volume") q.set("lens", lens);
    if (selectedFips) q.set("area", selectedFips);
    if (compare.length) q.set("compare", compare.join(","));
    if (filters.states.length) q.set("states", filters.states.join(","));
    if (filters.minPop60 !== 2000) q.set("floor", String(filters.minPop60));
    if (filters.minScore > 0) q.set("score", String(filters.minScore));
    const qs = q.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, "", next);
    }
  }, [lens, selectedFips, compare, filters.states, filters.minPop60, filters.minScore]);
}
