import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "./store";
import { LENS_ORDER } from "./lensMeta";
import { DEFAULT_LENS, type LensId } from "../data/types";
import { fipsFromPath } from "../routes";

/**
 * Two-way URL state (design §8): lens, area, compare set and the 60+ floor are
 * encoded in the query string so every view is shareable. Identity lives in the
 * path (`/area/:fips`); this hook only owns the query string.
 */
export function useUrlSync(): void {
  const { lens, selectedFips, compare, filters, setLens, select, setFilter, toggleCompare } =
    useStore();
  const [params, setParams] = useSearchParams();
  const hydrated = useRef(false);
  const [ready, setReady] = useState(false);

  // Hydrate once from the URL.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const l = params.get("lens");
    if (l && (LENS_ORDER as readonly string[]).includes(l)) setLens(l as LensId);

    const pathFips = fipsFromPath(window.location.pathname);
    const area = pathFips ?? params.get("area");
    if (area) select(area);

    const states = params.get("states");
    if (states) setFilter("states", states.split(",").filter(Boolean));
    const floor = params.get("floor");
    if (floor && !Number.isNaN(Number(floor))) setFilter("minPop60", Number(floor));
    const cmp = params.get("compare");
    if (cmp) {
      for (const f of cmp.split(",").filter(Boolean)) toggleCompare(f);
    }
    const minScore = params.get("score");
    if (minScore && !Number.isNaN(Number(minScore))) setFilter("minScore", Number(minScore));
    // Reflect only after the hydrated values have rendered, otherwise this
    // commit would write the pre-hydration defaults back over the URL.
    setReady(true);
  }, [params, setLens, select, setFilter, toggleCompare]);

  // Reflect state back into the URL. A path route already carries the FIPS, so
  // do not duplicate it as ?area=.
  useEffect(() => {
    if (!ready) return;
    const next = new URLSearchParams();
    if (lens !== DEFAULT_LENS) next.set("lens", lens);
    if (selectedFips && !fipsFromPath(window.location.pathname)) next.set("area", selectedFips);
    if (compare.length) next.set("compare", compare.join(","));
    if (filters.states.length) next.set("states", filters.states.join(","));
    if (filters.minPop60 !== 2000) next.set("floor", String(filters.minPop60));
    if (filters.minScore > 0) next.set("score", String(filters.minScore));
    if (next.toString() !== params.toString()) {
      setParams(next, { replace: true });
    }
  }, [ready, lens, selectedFips, compare, filters, params, setParams]);
}
