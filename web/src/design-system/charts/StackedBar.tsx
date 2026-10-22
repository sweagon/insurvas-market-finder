import { useMemo } from "react";
import type { EChartsCoreOption } from "echarts/core";
import { EChart } from "./echarts";
import { axisStyle, chartTokens } from "./echartsTheme";
import { readableText } from "./color";

export interface StackSegment {
  id: string;
  label: string;
  color: string;
  value: number;
}

/** One horizontal stacked bar (income distribution of 65+ households). */
export function StackedBar({
  segments,
  height = 44,
  ariaLabel,
  format = (v: number) => `${Math.round(v * 100)}%`,
}: {
  segments: StackSegment[];
  height?: number;
  ariaLabel: string;
  format?: (value: number) => string;
}) {
  const option = useMemo<EChartsCoreOption>(() => {
    const t = chartTokens();
    return {
      legend: { show: false },
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      tooltip: {
        trigger: "item",
        formatter: (p: unknown) => {
          const point = (Array.isArray(p) ? p[0] : p) as { seriesName: string; value: number };
          return `<strong>${point.seriesName}</strong><br/>${format(point.value)}`;
        },
      },
      xAxis: { type: "value", show: false, max: segments.reduce((sum, s) => sum + s.value, 0) || 1 },
      yAxis: { type: "category", data: [""], show: false, ...axisStyle() },
      series: segments.map((s, i) => ({
        type: "bar",
        name: s.label,
        stack: "total",
        data: [s.value],
        barWidth: height - 8,
        itemStyle: {
          color: s.color,
          borderRadius:
            i === 0
              ? [3, 0, 0, 3]
              : i === segments.length - 1
                ? [0, 3, 3, 0]
                : 0,
        },
        label: {
          show: s.value >= 0.08,
          position: "inside",
          color: readableText(s.color),
          fontSize: 10,
          fontFamily: t.font,
          formatter: () => format(s.value),
        },
      })),
    };
  }, [segments, format, height]);

  return <EChart option={option} height={height} ariaLabel={ariaLabel} />;
}
