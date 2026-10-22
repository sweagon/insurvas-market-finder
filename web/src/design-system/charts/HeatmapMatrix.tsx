import { useMemo } from "react";
import type { EChartsCoreOption } from "echarts/core";
import { EChart } from "./echarts";
import { axisStyle, chartTokens } from "./echartsTheme";
import { withAlpha } from "./color";

export interface HeatmapCell {
  row: string;
  col: string;
  value: number;
}

/** Rows are top areas, columns are lenses, cell is P(top 50) (R5, §D.4). */
export function HeatmapMatrix({
  rows,
  cols,
  cells,
  height = 360,
  ariaLabel,
  format = (v: number) => `${Math.round(v * 100)}%`,
}: {
  rows: string[];
  cols: string[];
  cells: HeatmapCell[];
  height?: number;
  ariaLabel: string;
  format?: (value: number) => string;
}) {
  const option = useMemo<EChartsCoreOption>(() => {
    const t = chartTokens();
    const lookup = new Map(cells.map((c) => [`${c.row}|${c.col}`, c.value]));
    const data: [number, number, number][] = [];
    rows.forEach((row, y) => {
      cols.forEach((col, x) => {
        const v = lookup.get(`${row}|${col}`);
        data.push([x, y, Number.isFinite(v) ? (v as number) : 0]);
      });
    });
    return {
      legend: { show: false },
      grid: { left: 8, right: 8, top: 8, bottom: 36, containLabel: true },
      tooltip: {
        position: "top",
        formatter: (p: unknown) => {
          const point = (Array.isArray(p) ? p[0] : p) as { data: [number, number, number] };
          const [x, y, v] = point.data;
          return `<strong>${rows[y]}</strong><br/>${cols[x]} · ${format(v)}`;
        },
      },
      xAxis: {
        type: "category",
        data: cols,
        ...axisStyle(),
        splitLine: { show: false },
        axisLabel: { ...axisStyle().axisLabel, rotate: 0 },
      },
      yAxis: {
        type: "category",
        data: rows,
        ...axisStyle(),
        splitLine: { show: false },
        axisLabel: { ...axisStyle().axisLabel, width: 120, overflow: "truncate" },
      },
      visualMap: {
        min: 0,
        max: 1,
        show: false,
        inRange: {
          color: [withAlpha(t.accent, 0.08), withAlpha(t.accent, 0.35), t.accent],
        },
      },
      series: [
        {
          type: "heatmap",
          data,
          itemStyle: { borderColor: t.surface, borderWidth: 2, borderRadius: 2 },
          label: {
            show: true,
            color: t.text,
            fontSize: 9,
            fontFamily: t.font,
            formatter: (p: { data: [number, number, number] }) => format(p.data[2]),
          },
          emphasis: { itemStyle: { borderColor: t.text, borderWidth: 1 } },
        },
      ],
    };
  }, [rows, cols, cells, format]);

  return <EChart option={option} height={height} ariaLabel={ariaLabel} />;
}
