/**
 * Build a pre-projected TopoJSON of US counties and state outlines.
 *
 * Why this exists: us-atlas@3 still ships the 8 legacy Connecticut counties,
 * while ACS/PEP/CBP 2022+ use the 9 Connecticut planning regions. The Census
 * 2024 cartographic boundary file already contains the planning regions, so we
 * project it ourselves with d3-geo (Albers USA, AK/HI insets) and simplify.
 *
 * Inputs (verified live 2026-10-20):
 *   https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_county_5m.zip
 *   https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_5m.zip
 * Downloaded into data/raw/geo/ by the Python geometry fetcher.
 *
 * Output: web/public/data/topo.json (fast LOD) and topo-detail.json (zoom LOD).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as shapefile from "shapefile";
import { geoAlbersUsa } from "d3-geo";
import { topology } from "topojson-server";
import { presimplify, simplify } from "topojson-simplify";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const RAW = resolve(ROOT, "data", "raw", "geo");
const OUT_DIR = resolve(ROOT, "web", "public", "data");
const OUT = resolve(OUT_DIR, "topo.json");
const DETAIL = resolve(OUT_DIR, "topo-detail.json");

const COUNTY_SHP = resolve(RAW, "cb_2024_us_county_5m", "cb_2024_us_county_5m.shp");
const STATE_SHP = resolve(RAW, "cb_2024_us_state_5m", "cb_2024_us_state_5m.shp");

// Exclude territories except DC: keep 50 states + DC (state FIPS 01..56).
const KEEP_STATE_FIPS = new Set([
  "01","02","04","05","06","08","09","10","11","12","13","15","16","17","18","19",
  "20","21","22","23","24","25","26","27","28","29","30","31","32","33","34","35",
  "36","37","38","39","40","41","42","44","45","46","47","48","49","50","51","53",
  "54","55","56",
]);

const projection = geoAlbersUsa();

function projectGeometry(geom) {
  return {
    type: geom.type,
    coordinates: projectCoords(geom.type, geom.coordinates),
  };
}

function projectCoords(type, coords) {
  if (type === "Polygon") return coords.map(ring => ring.map(projectPoint).filter(Boolean));
  if (type === "MultiPolygon") return coords.map(poly => poly.map(ring => ring.map(projectPoint).filter(Boolean)));
  throw new Error(`Unsupported geometry: ${type}`);
}

function projectPoint([lon, lat]) {
  const p = projection([lon, lat]);
  return p ? [round(p[0]), round(p[1])] : null;
}

const round = (n) => Math.round(n * 100) / 100;

function featureCollection(reader, filterFn) {
  return shapefile
    .read(reader, { type: "name" })
    .then((res) => res)
    .catch(() => null);
}

async function readFeatures(shpPath, filterFn) {
  const result = await shapefile.read(shpPath);
  const features = [];
  for (const f of result.features) {
    if (!filterFn(f)) continue;
    features.push({
      type: "Feature",
      id: f.properties.GEOID ?? f.properties.STATEFP,
      properties: {
        fips: f.properties.GEOID ?? f.properties.STATEFP,
        name: f.properties.NAME,
        state: f.properties.STATEFP,
      },
      geometry: projectGeometry(f.geometry),
    });
  }
  return features;
}

async function main() {
  const counties = await readFeatures(
    COUNTY_SHP,
    (f) => KEEP_STATE_FIPS.has(String(f.properties.STATEFP))
  );
  const states = await readFeatures(
    STATE_SHP,
    (f) => KEEP_STATE_FIPS.has(String(f.properties.STATEFP))
  );

  const topo = topology(
    { counties: { type: "FeatureCollection", features: counties },
      states: { type: "FeatureCollection", features: states } },
    1e4
  );

  // Two LODs share the same quantised topology. The browser renders the fast
  // one first, then swaps in the detail mesh while idle for crisp deep zoom.
  mkdirSync(OUT_DIR, { recursive: true });
  const base = presimplify(topo);
  const lowSimplify = Number(process.env.TOPO_SIMPLIFY ?? 0.62);
  const low = simplify(base, lowSimplify);
  writeFileSync(OUT, JSON.stringify(low));
  const high = simplify(presimplify(topo), 0.1);
  writeFileSync(DETAIL, JSON.stringify(high));

  const count = low.objects.counties.geometries.length;
  const ct = low.objects.counties.geometries.filter(g => String(g.id).startsWith("09")).length;
  console.log(`wrote ${OUT} (${(JSON.stringify(low).length / 1024).toFixed(0)} KB)`);
  console.log(`wrote ${DETAIL} (${(JSON.stringify(high).length / 1024).toFixed(0)} KB)`);
  console.log(`counties: ${count} (CT regions: ${ct}), states: ${low.objects.states.geometries.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
