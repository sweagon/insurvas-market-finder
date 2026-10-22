import { useMemo } from "react";
import type { EChartsCoreOption } from "echarts/core";
import { EChart } from "./echarts";
import { axisStyle, chartTokens } from "./echartsTheme";
import { withAlpha } from "./color";

export interface WaterfallItem {
  id: string;
  label: string;
  value: number;
  color: string;
}

/**
 * Horizontal contribution bars whose values sum exactly to the total. Bars
 * share a zero baseline and keep sub-score colours (design §D.4).
 */
export function Waterfall({
  items,
  height = 260,
  ariaLabel,
  format = (v) => v.toFixed(1),
}: {
  items: WaterfallItem[];
  height?: number;
  ariaLabel: string;
  format?: (value: number) => string;
}) {
  const option = useMemo<EChartsCoreOption>(() => {
    const t = chartTokens();
    return {
      legend: { show: false },
      grid: { left: 8, right: 44, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: withAlpha(t.text, 0.04) } },
        formatter: (params: unknown) => {
          const rows = Array.isArray(params) ? params : [params];
          const p = rows[0] as { dataIndex: number };
          const item = items[p.dataIndex];
          return `<strong>${item.label}</strong><br/>${format(item.value)} points`;
        },
      },
      xAxis: { type: "value", ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => format(v) } },
      yAxis: {
        type: "category",
        data: items.map((i) => i.label),
        ...axisStyle(),
        axisLabel: { ...axisStyle().axisLabel, width: 108, overflow: "truncate" },
        splitLine: { show: false },
      },
      series: [
        {
          type: "bar",
          data: items.map((i) => ({
            value: i.value,
            itemStyle: { color: i.color, borderRadius: [0, 3, 3, 0] },
          })),
          barMaxWidth: 18,
          label: {
            show: true,
            position: "right",
            color: t.secondary,
            fontSize: 10,
            fontFamily: t.font,
            formatter: (p: { value: number }) => format(p.value),
          },
        },
      ],
    };
  }, [items, format]);

  return <EChart option={option} height={height} ariaLabel={ariaLabel} />;
}
