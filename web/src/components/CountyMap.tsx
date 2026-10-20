/**
 * National county choropleth.
 *
 * The bundled topology is already projected to Albers-USA screen coordinates by
 * `scripts/build-topo.mjs`, so we render with an identity path generator (no
 * projection) inside an SVG viewBox that we fit to the data bounds.
 */

import { useEffect, useMemo, useState } from "react";
import { geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";
import type { CountyRecord, LensId } from "../data/types";

export interface MapProps {
  counties: CountyRecord[];
  lens: LensId;
  onSelect: (c: CountyRecord | null) => void;
  selected: CountyRecord | null;
  eligibleOnly: boolean;
}

function colorFor(rankPct: number, eligible: boolean): string {
  if (!eligible) return "#1e293b";
  // 0 (best) -> warm amber, 1 (worst) -> deep slate-blue.
  const t = Math.max(0, Math.min(1, rankPct));
  const hue = 28 + t * 180;
  const light = 30 + (1 - t) * 30;
  return `hsl(${hue}, 65%, ${light}%)`;
}

export function CountyMap({ counties, lens, onSelect, selected, eligibleOnly }: MapProps) {
  const [topo, setTopo] = useState<Topology | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; county?: CountyRecord }>({ x: 0, y: 0 });

  useEffect(() => {
    fetch("/data/topo.json")
      .then((r) => r.json())
      .then(setTopo)
      .catch(() => setTopo(null));
  }, []);

  const byFips = useMemo(() => {
    const m = new Map<string, CountyRecord>();
    for (const c of counties) m.set(c.fips, c);
    return m;
  }, [counties]);

  const rankRange = useMemo(() => {
    const eligible = counties.filter((c) => c.scores[lens].eligible);
    const ranks = eligible.map((c) => c.scores[lens].rank ?? 0).filter((r) => r > 0);
    return { min: 1, max: Math.max(1, ...ranks) };
  }, [counties, lens]);

  const { fc, path, bounds } = useMemo(() => {
    if (!topo) return { fc: null, path: geoPath(), bounds: null };
    const countiesGeo = feature(
      topo,
      topo.objects.counties as GeometryCollection
    ) as unknown as FeatureCollection<Geometry, { fips: string }>;
    const p = geoPath();
    const b = p.bounds(countiesGeo);
    return { fc: countiesGeo, path: p, bounds: b };
  }, [topo]);

  if (!fc || !bounds) {
    return <div className="flex h-full items-center justify-center text-slate-500">Loading map...</div>;
  }

  const [x0, y0] = bounds;
  const pad = 8;
  const width = x0[0] === Number.POSITIVE_INFINITY ? 960 : x0[1] - x0[0];
  const height = y0[0] === Number.POSITIVE_INFINITY ? 600 : y0[1] - y0[0];
  const viewBox = `${x0[0] - pad} ${y0[0] - pad} ${width + pad * 2} ${height + pad * 2}`;

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox={viewBox}
        className="h-full w-full"
        onMouseLeave={() => setHover({ x: 0, y: 0 })}
      >
        <g>
          {fc.features.map((f) => {
            const fips = String(f.id ?? f.properties?.fips);
            const c = byFips.get(fips);
            const score = c?.scores[lens];
            const eligible = score?.eligible ?? false;
            const span = rankRange.max - rankRange.min || 1;
            const rankPct = score?.rank ? (score.rank - rankRange.min) / span : 1;
            const isSelected = selected?.fips === fips;
            const dim = eligibleOnly && !eligible;
            return (
              <path
                key={fips}
                d={path(f) ?? undefined}
                fill={colorFor(rankPct, eligible)}
                opacity={dim ? 0.25 : 1}
                stroke={isSelected ? "#f8fafc" : "#0f172a"}
                strokeWidth={isSelected ? 1.5 : 0.25}
                vectorEffect="non-scaling-stroke"
                className="cursor-pointer transition-[opacity] hover:opacity-80"
                onMouseMove={(e) => {
                  const rect = (e.target as SVGPathElement).ownerSVGElement!.getBoundingClientRect();
                  setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, county: c });
                }}
                onClick={() => onSelect(c ?? null)}
              />
            );
          })}
        </g>
      </svg>
      {hover.county && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <div className="font-medium text-slate-100">
            {hover.county.name}, {hover.county.state}
          </div>
          <div className="text-slate-400">
            Score {hover.county.scores[lens].total.toFixed(1)}
            {hover.county.scores[lens].rank ? ` - rank #${hover.county.scores[lens].rank}` : ""}
          </div>
          <div className="text-slate-500">
            60+: {hover.county.pop60.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
