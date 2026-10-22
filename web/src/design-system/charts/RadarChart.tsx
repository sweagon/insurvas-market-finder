import { useMemo } from "react";
import type { EChartsCoreOption } from "echarts/core";
import { EChart } from "./echarts";
import { chartTokens } from "./echartsTheme";
import { withAlpha } from "./color";
import { cn } from "../cn";

export interface RadarAxis {
  id: string;
  label: string;
}

export interface RadarSeries {
  id: string;
  label: string;
  color: string;
  values: number[];
}

/** Six fixed sub-score axes, 0–100, never more than three series (R6, R9). */
export function RadarChart({
  axes,
  series,
  height = 280,
  ariaLabel,
}: {
  axes: RadarAxis[];
  series: RadarSeries[];
  height?: number;
  ariaLabel: string;
}) {
  const option = useMemo<EChartsCoreOption>(() => {
    const t = chartTokens();
    return {
      legend: { show: false },
      tooltip: { trigger: "item" },
      radar: {
        center: ["50%", "52%"],
        radius: "66%",
        splitNumber: 4,
        indicator: axes.map((a) => ({ name: a.label, max: 100, min: 0 })),
        axisName: { color: t.tertiary, fontSize: 11 },
        axisLine: { lineStyle: { color: t.grid } },
        splitLine: { lineStyle: { color: t.grid } },
        splitArea: { show: false },
      },
      series: series.map((s) => ({
        type: "radar",
        name: s.label,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { width: 2, color: s.color },
        itemStyle: { color: s.color },
        emphasis: { lineStyle: { width: 3 } },
        data: [{ value: s.values, name: s.label }],
        areaStyle: { color: withAlpha(s.color, 0.18) },
      })),
    };
  }, [axes, series]);

  return <EChart option={option} height={height} ariaLabel={ariaLabel} />;
}

/** Accessible twin for the radar: one row per axis, one bar per series. */
export function SubScoreBars({
  axes,
  series,
  className,
}: {
  axes: RadarAxis[];
  series: RadarSeries[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {axes.map((axis, i) => (
        <div key={axis.id}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="text-caption text-secondary">{axis.label}</span>
            <span className="font-mono text-mono text-primary">
              {series.map((s) => (Number.isFinite(s.values[i]) ? s.values[i].toFixed(0) : "—")).join(" / ")}
            </span>
          </div>
          <div className="space-y-1">
            {series.map((s) => {
              const value = s.values[i];
              const pct = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
              return (
                <div key={s.id} className="flex items-center gap-2" title={`${s.label}: ${Number.isFinite(value) ? value.toFixed(1) : "not available"}`}>
                  <span className="w-16 shrink-0 truncate text-micro text-tertiary">{s.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-pill bg-surface3">
                    <div
                      className="h-full rounded-pill"
                      style={{ width: `${pct}%`, background: s.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Table twin for ChartFrame. */
export function SubScoreTable({
  axes,
  series,
}: {
  axes: RadarAxis[];
  series: RadarSeries[];
}) {
  return (
    <table className="w-full text-left text-body-sm">
      <caption className="sr-only">Sub-scores by series (0–100 percentile)</caption>
      <thead>
        <tr className="border-b border-subtle text-caption text-tertiary">
          <th scope="col" className="py-2 pr-3 font-medium">Sub-score</th>
          {series.map((s) => (
            <th key={s.id} scope="col" className="py-2 pr-3 text-right font-medium">{s.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {axes.map((axis, i) => (
          <tr key={axis.id} className="border-b border-subtle last:border-0">
            <th scope="row" className="py-2 pr-3 font-normal text-secondary">{axis.label}</th>
            {series.map((s) => (
              <td key={s.id} className="py-2 pr-3 text-right font-mono text-mono text-primary">
                {Number.isFinite(s.values[i]) ? s.values[i].toFixed(1) : "—"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
