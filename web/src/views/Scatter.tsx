import { useEffect, useMemo, useRef, useState } from "react";
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

export default function Scatter() {
  const { counties, lens, select, selectedFips, compare, toggleCompare } = useStore();
  const { theme, palette } = usePreferences();
  const [xAxis, setXAxis] = useState<AxisId>("pop60");
  const [yAxis, setYAxis] = useState<AxisId>("total");
  const [hover, setHover] = useState<{ fips: string; x: number; y: number } | null>(null);
  const [mode, setMode] = useState<"chart" | "table">("chart");
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(260, entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  const W = width;
  const H = Math.round(Math.min(520, Math.max(340, width * 0.9)));
  const compact = W < 520;
  const PAD = { l: compact ? 46 : 64, r: compact ? 14 : 24, t: 18, b: 42 };

  const domain = (axis: AxisId, meta: { log?: boolean }) => {
    const vals = list
      .map((c) => valueOf(c, lens, axis))
      .filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
    if (!vals.length) return [0, 1] as const;
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    if (meta.log) return [Math.log10(Math.max(1, lo)), Math.log10(Math.max(10, hi))] as const;
    return [Math.max(0, Math.floor(lo / 10) * 10), Math.ceil(hi / 10) * 10] as const;
  };
  const [x0, x1] = domain(xAxis, xMeta);
  const [y0, y1] = domain(yAxis, yMeta);
  const sx = (v: number) =>
    PAD.l + (((xMeta.log ? Math.log10(Math.max(1, v)) : v) - x0) / (x1 - x0 || 1)) * (W - PAD.l - PAD.r);
  const sy = (v: number) =>
    H - PAD.b - (((yMeta.log ? Math.log10(Math.max(1, v)) : v) - y0) / (y1 - y0 || 1)) * (H - PAD.t - PAD.b);
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

  const tickCount = compact ? 3 : 5;
  const xTicks = Array.from({ length: tickCount }, (_, i) => x0 + (i / (tickCount - 1)) * (x1 - x0));
  const yTicks = Array.from({ length: compact ? 4 : 5 }, (_, i) => y0 + (i / (compact ? 3 : 4)) * (y1 - y0));
  const fmt = (v: number, meta: { log?: boolean; id: AxisId }) => {
    const raw = meta.log ? Math.pow(10, v) : v;
    return meta.id === "pop60" ? popCompact(raw) : score(raw);
  };

  const plotted = list.map((c) => ({
    c,
    x: sx(valueOf(c, lens, xAxis) ?? 0),
    y: sy(valueOf(c, lens, yAxis) ?? 0),
  }));

  const pick = (clientX: number, clientY: number, touch = false) => {
    const el = wrap.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const px = clientX - box.left;
    const py = clientY - box.top;
    let best: { fips: string; x: number; y: number; d: number } | null = null;
    for (const p of plotted) {
      const d = Math.hypot(p.x - px, p.y - py);
      if (!best || d < best.d) best = { fips: p.c.fips, x: p.x, y: p.y, d };
    }
    if (best && best.d <= (touch ? 28 : 18)) setHover({ fips: best.fips, x: best.x, y: best.y });
    else setHover(null);
  };

  const hovered = hover ? counties.find((c) => c.fips === hover.fips) : null;

  const axisSelect = (
    value: AxisId,
    onChange: (v: AxisId) => void,
    label: string,
  ) => (
    <label className="flex w-full items-center gap-2 sm:w-auto">
      <span className="text-caption text-tertiary">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AxisId)}
        className="h-control min-w-0 flex-1 rounded-control border border-default bg-surface1 px-2 text-body-sm text-primary sm:w-auto sm:flex-none"
      >
        {AXES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
      </select>
    </label>
  );

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
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          {axisSelect(xAxis, (v) => { setHover(null); setXAxis(v); }, "X")}
          {axisSelect(yAxis, (v) => { setHover(null); setYAxis(v); }, "Y")}
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-caption text-tertiary">Colour</span>
            <SegmentedControl value="score" onValueChange={() => {}} options={[{ value: "score", label: "Score" }]} />
          </div>
        </div>

        {mode === "table" ? (
          <Card title="Plotted counties">
            <div className="max-h-[min(520px,62dvh)] overflow-auto">
              <table className="w-full min-w-[520px] text-left text-body-sm">
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
                      <th scope="row" className="py-2 pr-3 font-normal text-secondary">
                        <button type="button" onClick={() => select(c.fips)} className="min-h-8 text-left hover:text-primary">{c.name}, {c.state}</button>
                      </th>
                      <td className="num py-2 pr-3 text-right text-secondary">{xAxis === "pop60" ? popCompact(valueOf(c, lens, xAxis)) : score(valueOf(c, lens, xAxis))}</td>
                      <td className="num py-2 pr-3 text-right text-secondary">{yAxis === "pop60" ? popCompact(valueOf(c, lens, yAxis)) : score(valueOf(c, lens, yAxis))}</td>
                      <td className="py-2 text-right"><button type="button" onClick={() => toggleCompare(c.fips)} className="min-h-8 px-2 text-caption text-accenttext">{compare.includes(c.fips) ? "Remove" : "Add"}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-caption text-tertiary">Showing the first 250 of {list.length.toLocaleString()} counties. Narrow the axes to focus the set.</p>
          </Card>
        ) : (
        <Card bodyClassName="p-2">
          <div ref={wrap} className="relative w-full overflow-hidden">
            <svg
              width={W}
              height={H}
              className="block max-w-full touch-pan-y"
              role="img"
              aria-label={`${yMeta.label} against ${xMeta.label} for eligible counties`}
              onPointerMove={(e) => pick(e.clientX, e.clientY, e.pointerType !== "mouse")}
              onPointerLeave={(e) => { if (e.pointerType === "mouse") setHover(null); }}
              onClick={() => { if (hover) select(hover.fips); }}
            >
              {yTicks.map((t, i) => (
                <g key={`y${i}`}>
                  <line x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} stroke="var(--border-subtle)" />
                  <text x={PAD.l - 6} y={sy(t) + 4} textAnchor="end" fontSize="10" fill="var(--text-tertiary)">{fmt(t, yMeta)}</text>
                </g>
              ))}
              {xTicks.map((t, i) => (
                <g key={`x${i}`}>
                  <line x1={sx(t)} x2={sx(t)} y1={PAD.t} y2={H - PAD.b} stroke="var(--border-subtle)" />
                  <text x={sx(t)} y={H - PAD.b + 15} textAnchor="middle" fontSize="10" fill="var(--text-tertiary)">{fmt(t, xMeta)}</text>
                </g>
              ))}
              <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="var(--border-strong)" />
              <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} stroke="var(--border-strong)" />
              <text x={(W + PAD.l) / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text-secondary)">{xMeta.label}</text>
              <text x={12} y={(H - PAD.b + PAD.t) / 2} textAnchor="middle" fontSize="11" fill="var(--text-secondary)" transform={`rotate(-90 12 ${(H - PAD.b + PAD.t) / 2})`}>{yMeta.label}</text>

              <line x1={sx(xMid)} x2={sx(xMid)} y1={PAD.t} y2={H - PAD.b} stroke="var(--text-tertiary)" strokeDasharray="4 4" opacity={0.6} />
              <line x1={PAD.l} x2={W - PAD.r} y1={sy(yMid)} y2={sy(yMid)} stroke="var(--text-tertiary)" strokeDasharray="4 4" opacity={0.6} />
              {!compact && ([
                ["Scale & quality", W - PAD.r - 8, PAD.t + 16, "end"],
                ["Niche gems", PAD.l + 8, PAD.t + 16, "start"],
                ["Big but thin", W - PAD.r - 8, H - PAD.b - 10, "end"],
                ["Skip", PAD.l + 8, H - PAD.b - 10, "start"],
              ] as const).map(([label, x, y, anchor]) => (
                <text key={label} x={x} y={y} textAnchor={anchor} fontSize="10" fill="var(--text-tertiary)" opacity={0.8}>{label}</text>
              ))}

              {plotted.map(({ c, x, y }) => {
                const s = c.scores[lens];
                const isSel = selectedFips === c.fips;
                return (
                  <circle
                    key={c.fips}
                    cx={x}
                    cy={y}
                    r={isSel ? (compact ? 5.5 : 5) : compact ? 2.2 : 2.6}
                    fill={isSel ? "var(--text-primary)" : color(s.total ?? 0)}
                    stroke={isSel ? "var(--accent)" : "none"}
                    strokeWidth={isSel ? 2 : 0}
                    opacity={isSel || hover?.fips === c.fips ? 1 : 0.75}
                  >
                    <title>{`${c.name}, ${stateAbbr(c.state)} · ${score(s.total)}`}</title>
                  </circle>
                );
              })}
            </svg>
            {hover && hovered && (() => {
              const left = Math.min(hover.x + 12, Math.max(8, W - 220));
              const top = Math.max(8, Math.min(hover.y - 12, H - 90));
              return (
                <div className="pointer-events-none absolute z-tooltip w-[210px] rounded-control border border-default bg-surface1 px-2 py-1.5 text-caption shadow-l3" style={{ left, top }}>
                  <div className="truncate text-primary">{hovered.name}, {stateAbbr(hovered.state)}</div>
                  <div className="text-tertiary">{xMeta.label} {xAxis === "pop60" ? popCompact(valueOf(hovered, lens, xAxis)) : score(valueOf(hovered, lens, xAxis))} · score {score(hovered.scores[lens].total)}</div>
                  <div className="mt-0.5 text-accenttext">Tap to open profile</div>
                </div>
              );
            })()}
          </div>
        </Card>
        )}
        <p className="text-caption text-tertiary">{list.length.toLocaleString()} eligible counties plotted. Quadrant lines sit at the medians of the plotted values. Select a dot to open its profile.</p>
      </div>
    </div>
  );
}
