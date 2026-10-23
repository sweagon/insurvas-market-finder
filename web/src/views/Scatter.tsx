import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { PageHeader } from "../design-system/patterns/PageHeader";
import { Card } from "../design-system/primitives/Card";
import { SegmentedControl } from "../design-system/primitives/tabs";
import { usePreferences } from "../design-system/providers/PreferencesProvider";
import { opportunityColor } from "../design-system/map/ramp";
import { popCompact, score, stateAbbr } from "../state/format";
import { SUBSCORE_LABEL, SUBSCORE_ORDER } from "../state/lensMeta";
import type { CountyRow, LensId, SubScoreId } from "../data/types";

type AxisId = "pop60" | "total" | SubScoreId;

const AXES: { id: AxisId; label: string; log?: boolean }[] = [
  { id: "pop60", label: "60+ population", log: true },
  { id: "total", label: "Opportunity score" },
  ...SUBSCORE_ORDER.map((id) => ({ id, label: SUBSCORE_LABEL[id] })),
];

/** Value for one axis, or null when the sub-score was unavailable. */
function valueOf(c: CountyRow, lens: LensId, axis: AxisId): number | null {
  if (axis === "pop60") return c.pop60;
  if (axis === "total") return c.scores[lens].total;
  return c.scores[lens].subscores?.[axis] ?? null;
}

const W = 1000;
const H = 520;
const PAD = { l: 64, r: 24, t: 24, b: 48 };

export default function Scatter() {
  const { counties, lens, select, selectedFips, compare, toggleCompare } = useStore();
  const { theme, palette } = usePreferences();
  const [xAxis, setXAxis] = useState<AxisId>("pop60");
  const [yAxis, setYAxis] = useState<AxisId>("total");
  const [hover, setHover] = useState<{ fips: string; x: number; y: number } | null>(null);
  const [mode, setMode] = useState<"chart" | "table">("chart");

  // A county is only plottable when both axes have a value; counties with an
  // unavailable sub-score are left out rather than drawn at zero.
  const list = useMemo(
    () =>
      counties.filter(
        (c) =>
          c.scores?.[lens]?.eligible &&
          valueOf(c, lens, xAxis) != null &&
          valueOf(c, lens, yAxis) != null,
      ),
    [counties, lens, xAxis, yAxis],
  );
  const xMeta = AXES.find((a) => a.id === xAxis)!;
  const yMeta = AXES.find((a) => a.id === yAxis)!;

  const domain = (axis: AxisId, meta: { log?: boolean }) => {
    const vals = list
      .map((c) => valueOf(c, lens, axis))
      .filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    if (meta.log) return [Math.log10(Math.max(1, lo)), Math.log10(Math.max(10, hi))] as const;
    return [Math.max(0, Math.floor(lo / 10) * 10), Math.ceil(hi / 10) * 10] as const;
  };
  const [x0, x1] = domain(xAxis, xMeta);
  const [y0, y1] = domain(yAxis, yMeta);
  const sx = (v: number) => PAD.l + ((xMeta.log ? Math.log10(Math.max(1, v)) : v) - x0) / (x1 - x0 || 1) * (W - PAD.l - PAD.r);
  const sy = (v: number) => H - PAD.b - ((yMeta.log ? Math.log10(Math.max(1, v)) : v) - y0) / (y1 - y0 || 1) * (H - PAD.t - PAD.b);
  const color = (s: number) => opportunityColor(s / 100, { theme, colorblind: palette === "colorblind" });
  const median = (axis: AxisId) => {
    const values = list
      .map((c) => valueOf(c, lens, axis))
      .filter((v): v is number => v != null && Number.isFinite(v))
      .sort((a, b) => a - b);
    return values.length ? values[Math.floor(values.length / 2)] : 0;
  };
  const xMid = median(xAxis);
  const yMid = median(yAxis);

  const xTicks = Array.from({ length: 5 }, (_, i) => x0 + (i / 4) * (x1 - x0));
  const yTicks = Array.from({ length: 5 }, (_, i) => y0 + (i / 4) * (y1 - y0));
  const fmt = (v: number, meta: { log?: boolean; id: AxisId }) => {
    const raw = meta.log ? Math.pow(10, v) : v;
    return meta.id === "pop60" ? popCompact(raw) : score(raw);
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Scatter Explorer"
        description="Each dot is an eligible county. Find big pools with weak competition, or high-need areas with low coverage."
        actions={
          <SegmentedControl
            value={mode}
            onValueChange={(v) => setMode(v as "chart" | "table")}
            options={[{ value: "chart", label: "Chart" }, { value: "table", label: "Table" }]}
          />
        }
      />
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-caption text-tertiary">X</span>
            <select value={xAxis} onChange={(e) => setXAxis(e.target.value as AxisId)} className="h-9 rounded-control border border-default bg-surface1 px-2 text-body-sm text-primary">
              {AXES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-caption text-tertiary">Y</span>
            <select value={yAxis} onChange={(e) => setYAxis(e.target.value as AxisId)} className="h-9 rounded-control border border-default bg-surface1 px-2 text-body-sm text-primary">
              {AXES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-caption text-tertiary">Colour</span>
            <SegmentedControl value="score" onValueChange={() => {}} options={[{ value: "score", label: "Score" }]} />
          </div>
        </div>

        {mode === "table" ? (
          <Card title="Plotted counties">
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full text-left text-body-sm">
                <thead className="sticky top-0 bg-surface1">
                  <tr className="border-b border-subtle text-micro uppercase text-tertiary">
                    <th className="py-2 pr-3 font-medium">Area</th>
                    <th className="py-2 pr-3 text-right font-medium">{xMeta.label}</th>
                    <th className="py-2 pr-3 text-right font-medium">{yMeta.label}</th>
                    <th className="py-2 text-right font-medium">Compare</th>
                  </tr>
                </thead>
                <tbody>
                  {list.slice(0, 250).map((c) => (
                    <tr key={c.fips} className="border-b border-subtle last:border-0">
                      <th scope="row" className="py-1.5 pr-3 font-normal text-secondary">
                        <button type="button" onClick={() => select(c.fips)} className="hover:text-primary">{c.name}, {c.state}</button>
                      </th>
                      <td className="num py-1.5 pr-3 text-right text-secondary">{xAxis === "pop60" ? popCompact(valueOf(c, lens, xAxis)) : score(valueOf(c, lens, xAxis))}</td>
                      <td className="num py-1.5 pr-3 text-right text-secondary">{yAxis === "pop60" ? popCompact(valueOf(c, lens, yAxis)) : score(valueOf(c, lens, yAxis))}</td>
                      <td className="py-1.5 text-right"><button type="button" onClick={() => toggleCompare(c.fips)} className="text-caption text-accenttext">{compare.includes(c.fips) ? "Remove" : "Add"}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-caption text-tertiary">Showing the first 250 of {list.length.toLocaleString()} counties. Narrow the axes to focus the set.</p>
          </Card>
        ) : (
        <Card bodyClassName="p-2">
          <div className="relative">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${yMeta.label} against ${xMeta.label} for eligible counties`}>
              {yTicks.map((t, i) => (
                <g key={`y${i}`}>
                  <line x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} stroke="var(--border-subtle)" />
                  <text x={PAD.l - 8} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-tertiary)">{fmt(t, yMeta)}</text>
                </g>
              ))}
              {xTicks.map((t, i) => (
                <g key={`x${i}`}>
                  <line x1={sx(t)} x2={sx(t)} y1={PAD.t} y2={H - PAD.b} stroke="var(--border-subtle)" />
                  <text x={sx(t)} y={H - PAD.b + 16} textAnchor="middle" fontSize="11" fill="var(--text-tertiary)">{fmt(t, xMeta)}</text>
                </g>
              ))}
              <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="var(--border-strong)" />
              <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} stroke="var(--border-strong)" />
              <text x={(W + PAD.l) / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--text-secondary)">{xMeta.label}</text>
              <text x={14} y={(H - PAD.b + PAD.t) / 2} textAnchor="middle" fontSize="12" fill="var(--text-secondary)" transform={`rotate(-90 14 ${(H - PAD.b + PAD.t) / 2})`}>{yMeta.label}</text>

              <line x1={sx(xMid)} x2={sx(xMid)} y1={PAD.t} y2={H - PAD.b} stroke="var(--text-tertiary)" strokeDasharray="4 4" opacity={0.6} />
              <line x1={PAD.l} x2={W - PAD.r} y1={sy(yMid)} y2={sy(yMid)} stroke="var(--text-tertiary)" strokeDasharray="4 4" opacity={0.6} />
              {[
                ["Scale & quality", W - PAD.r - 8, PAD.t + 16, "end"],
                ["Niche gems", PAD.l + 8, PAD.t + 16, "start"],
                ["Big but thin", W - PAD.r - 8, H - PAD.b - 10, "end"],
                ["Skip", PAD.l + 8, H - PAD.b - 10, "start"],
              ].map(([label, x, y, anchor]) => (
                <text key={String(label)} x={Number(x)} y={Number(y)} textAnchor={anchor as "start" | "end"} fontSize="10" fill="var(--text-tertiary)" opacity={0.8}>{label}</text>
              ))}

              {list.map((c) => {
                const s = c.scores[lens];
                const isSel = selectedFips === c.fips;
                const xv = valueOf(c, lens, xAxis) ?? 0;
                const yv = valueOf(c, lens, yAxis) ?? 0;
                return (
                  <circle
                    key={c.fips}
                    cx={sx(xv)}
                    cy={sy(yv)}
                    r={isSel ? 5 : 2.4}
                    fill={isSel ? "var(--text-primary)" : color(s.total ?? 0)}
                    stroke={isSel ? "var(--accent)" : "none"}
                    strokeWidth={isSel ? 2 : 0}
                    opacity={isSel ? 1 : 0.75}
                    className="cursor-pointer"
                    onMouseEnter={(e) => {
                      const box = (e.target as SVGCircleElement).ownerSVGElement?.getBoundingClientRect();
                      setHover({ fips: c.fips, x: e.clientX - (box?.left ?? 0), y: e.clientY - (box?.top ?? 0) });
                    }}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => select(c.fips)}
                  />
                );
              })}
            </svg>
            {hover && (() => {
              const c = counties.find((x) => x.fips === hover.fips)!;
              return (
                <div className="pointer-events-none absolute z-tooltip rounded-control border border-default bg-surface1 px-2 py-1 text-caption shadow-l3" style={{ left: hover.x + 12, top: hover.y + 12 }}>
                  <div className="text-primary">{c.name}, {stateAbbr(c.state)}</div>
                  <div className="text-tertiary">{xMeta.label} {xAxis === "pop60" ? popCompact(valueOf(c, lens, xAxis)) : score(valueOf(c, lens, xAxis))} · score {score(c.scores[lens].total)}</div>
                </div>
              );
            })()}
          </div>
        </Card>
        )}
        <p className="text-caption text-tertiary">{list.length.toLocaleString()} eligible counties plotted. Quadrant lines sit at the medians of the plotted values. Click a dot to open its profile.</p>
      </div>
    </div>
  );
}
