/**
 * Map geometry helpers. topo.json is already projected to screen coordinates
 * by d3-geo Albers USA (with AK/HI insets) at build time, so at runtime we only
 * convert TopoJSON to GeoJSON and read the bbox. No d3-geo projection work on
 * the main thread.
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

export async function loadTopology(url = "/data/topo.json"): Promise<MapGeometry> {
  const topo = (await (await fetch(url)).json()) as unknown as Topology;
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
}
