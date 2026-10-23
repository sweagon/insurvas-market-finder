/**
 * Map geometry helpers. topo.json is already projected to screen coordinates
 * by d3-geo Albers USA (with AK/HI insets) at build time, so at runtime we only
 * convert TopoJSON to GeoJSON and read the bbox. The parsed promises are
 * cached so navigating away and back never refetches the geometry.
 */
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry } from "geojson";

export interface AreaProps {
  fips: string;
  name: string;
  state?: string;
}

export type MapFeature = Feature<Geometry, AreaProps>;

export interface MapGeometry {
  counties: MapFeature[];
  states: MapFeature[];
  bbox: [number, number, number, number];
  width: number;
  height: number;
}

const cache = new Map<string, Promise<MapGeometry>>();
const TIMEOUT_MS = 12_000;

async function fetchTopology(url: string): Promise<MapGeometry> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Map geometry failed (${response.status})`);
      const topo = (await response.json()) as unknown as Topology;
      const countiesObj = topo.objects.counties as GeometryCollection<AreaProps>;
      const statesObj = topo.objects.states as GeometryCollection<AreaProps>;
      const countiesFC = feature(topo, countiesObj) as FeatureCollection<Geometry, AreaProps>;
      const statesFC = feature(topo, statesObj) as FeatureCollection<Geometry, AreaProps>;
      const bbox = (topo.bbox as [number, number, number, number]) ?? [0, 0, 960, 600];
      return {
        counties: countiesFC.features,
        states: statesFC.features,
        bbox,
        width: bbox[2] - bbox[0],
        height: bbox[3] - bbox[1],
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("The map geometry could not be loaded.");
}

export function loadTopology(url = "/data/topo.json"): Promise<MapGeometry> {
  const existing = cache.get(url);
  if (existing) return existing;
  const promise = fetchTopology(url).catch((error) => {
    cache.delete(url);
    throw error;
  });
  cache.set(url, promise);
  return promise;
}

/** Test helper: forget the cached geometry. */
export function clearTopologyCache(): void {
  cache.clear();
}
