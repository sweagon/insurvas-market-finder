/**
 * Immutable map geometry. TopoJSON is converted once, then every feature is
 * converted to a Path2D, centroid and projected bounds. Pan/zoom never parses
 * SVG path strings or runs d3-geo projection code.
 */
import { geoIdentity, geoPath } from "d3-geo";
import type { MapFeature } from "./geometry";

export interface PreparedFeature {
  fips: string;
  name: string;
  state: string;
  path: Path2D | null;
  pathData: string;
  centroid: [number, number];
  bounds: [[number, number], [number, number]];
}

export interface PreparedMap {
  counties: PreparedFeature[];
  statePath: Path2D | null;
  statePathData: string;
  countyStrokePath: Path2D | null;
  countyStrokePathData: string;
  byFips: Map<string, PreparedFeature>;
  bbox: [number, number, number, number];
  width: number;
  height: number;
}

function featureFips(feature: MapFeature): string {
  return String(feature.id ?? feature.properties.fips);
}

export function prepareGeometry(
  counties: MapFeature[],
  states: MapFeature[],
  bbox: [number, number, number, number],
): PreparedMap {
  const projection = geoIdentity().reflectY(false);
  const path = geoPath(projection);
  const canPath = typeof Path2D !== "undefined";
  let statePathData = "";
  let countyStrokePathData = "";
  const prepared: PreparedFeature[] = [];

  for (const feature of counties) {
    const pathData = path(feature) ?? "";
    if (!pathData) continue;
    const centroid = path.centroid(feature);
    const bounds = path.bounds(feature);
    prepared.push({
      fips: featureFips(feature),
      name: feature.properties.name,
      state: feature.properties.state ?? "",
      pathData,
      path: canPath ? new Path2D(pathData) : null,
      centroid: [
        Number.isFinite(centroid[0]) ? centroid[0] : 0,
        Number.isFinite(centroid[1]) ? centroid[1] : 0,
      ],
      bounds: [
        [bounds[0][0], bounds[0][1]],
        [bounds[1][0], bounds[1][1]],
      ],
    });
    countyStrokePathData += pathData;
  }

  for (const feature of states) {
    statePathData += path(feature) ?? "";
  }

  return {
    counties: prepared,
    statePath: canPath && statePathData ? new Path2D(statePathData) : null,
    statePathData,
    countyStrokePath: canPath && countyStrokePathData ? new Path2D(countyStrokePathData) : null,
    countyStrokePathData,
    byFips: new Map(prepared.map((feature) => [feature.fips, feature])),
    bbox,
    width: bbox[2] - bbox[0],
    height: bbox[3] - bbox[1],
  };
}
