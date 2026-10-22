import { useMemo } from "react";
import type { EChartsCoreOption } from "echarts/core";
import { EChart } from "./echarts";
import { axisStyle, chartTokens } from "./echartsTheme";

export interface BumpSeries {
  id: string;
  label: string;
  color: string;
  ranks: number[];
}

/** Rank movement of the top 15 as weights change (design §D.4). */
export function BumpChart({
  steps,
  series,
  height = 340,
  ariaLabel,
}: {
  steps: string[];
  series: BumpSeries[];
  height?: number;
  ariaLabel: string;
}) {
  const option = useMemo<EChartsCoreOption>(() => {
    const t = chartTokens();
    return {
      legend: {
        show: true,
        type: "scroll",
        top: 0,
        textStyle: { color: t.secondary, fontSize: 10, fontFamily: t.font },
      },
      grid: { left: 8, right: 72, top: 36, bottom: 8, containLabel: true },
      tooltip: {
        trigger: "item",
        formatter: (p: unknown) => {
          const point = (Array.isArray(p) ? p[0] : p) as { seriesName: string; value: [string, number] };
          return `<strong>${point.seriesName}</strong><br/>${point.value[0]} · rank ${point.value[1]}`;
        },
      },
      xAxis: { type: "category", data: steps, boundaryGap: false, ...axisStyle(), splitLine: { show: false } },
      yAxis: {
        type: "value",
        inverse: true,
        min: 1,
        max: Math.max(1, ...series.map((s) => s.ranks.length)),
        ...axisStyle(),
        splitNumber: 5,
      },
      series: series.map((s) => ({
        type: "line",
        name: s.label,
        data: s.ranks,
        smooth: 0.25,
        symbol: "circle",
        symbolSize: 5,
        lineStyle: { width: 2, color: s.color },
        itemStyle: { color: s.color },
        emphasis: { focus: "series" },
        endLabel: {
          show: true,
          formatter: s.label,
          color: s.color,
          fontSize: 10,
          fontFamily: t.font,
          distance: 6,
        },
      })),
    };
  }, [steps, series]);

  return <EChart option={option} height={height} ariaLabel={ariaLabel} />;
}
