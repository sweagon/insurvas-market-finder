import { useMemo } from "react";
import type { EChartsCoreOption } from "echarts/core";
import { EChart } from "./echarts";
import { axisStyle, chartTokens } from "./echartsTheme";
import { withAlpha } from "./color";
import { binValues, type HistogramBin } from "./binValues";

/** Distribution of a metric with the selected area marked (design §D.4). */
export function Histogram({
  values,
  selected,
  bins = 20,
  height = 180,
  color = "var(--accent)",
  ariaLabel,
  format = (v: number) => v.toFixed(0),
}: {
  values: number[];
  selected?: number;
  bins?: number;
  height?: number;
  color?: string;
  ariaLabel: string;
  format?: (value: number) => string;
}) {
  const data = useMemo(() => binValues(values, bins), [values, bins]);
  const option = useMemo<EChartsCoreOption>(() => {
    const t = chartTokens();
    return {
      legend: { show: false },
      grid: { left: 4, right: 12, top: 12, bottom: 4, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: unknown) => {
          const rows = Array.isArray(params) ? params : [params];
          const p = rows[0] as { dataIndex: number };
          const bin = data[p.dataIndex];
          return `${format(bin.start)} – ${format(bin.end)}<br/>${bin.count.toLocaleString()} areas`;
        },
      },
      xAxis: {
        type: "category",
        data: data.map((b) => format(b.start)),
        ...axisStyle(),
        axisLabel: { ...axisStyle().axisLabel, interval: Math.ceil(data.length / 6) - 1 },
      },
      yAxis: { type: "value", ...axisStyle(), splitNumber: 3 },
      series: [
        {
          type: "bar",
          data: data.map((b) => b.count),
          barCategoryGap: "8%",
          itemStyle: { color: withAlpha(color, 0.55), borderRadius: [2, 2, 0, 0] },
          markLine:
            selected !== undefined && Number.isFinite(selected)
              ? {
                  symbol: "none",
                  silent: true,
                  lineStyle: { color: t.text, width: 1.5, type: "solid" },
                  label: {
                    formatter: format(selected),
                    color: t.text,
                    fontSize: 10,
                    position: "insideEndTop",
                  },
                  data: [{ xAxis: data.findIndex((b) => selected >= b.start && selected <= b.end) }],
                }
              : undefined,
        },
      ],
    };
  }, [data, selected, color, format]);

  return <EChart option={option} height={height} ariaLabel={ariaLabel} />;
}

export function HistogramTable({ bins, format = (v: number) => v.toFixed(0) }: { bins: HistogramBin[]; format?: (v: number) => string }) {
  return (
    <table className="w-full text-left text-body-sm">
      <caption className="sr-only">Histogram bins and counts</caption>
      <thead>
        <tr className="border-b border-subtle text-caption text-tertiary">
          <th scope="col" className="py-2 pr-3 font-medium">Range</th>
          <th scope="col" className="py-2 text-right font-medium">Areas</th>
        </tr>
      </thead>
      <tbody>
        {bins.map((b) => (
          <tr key={`${b.start}-${b.end}`} className="border-b border-subtle last:border-0">
            <th scope="row" className="py-1.5 pr-3 font-normal text-secondary">{format(b.start)} – {format(b.end)}</th>
            <td className="py-1.5 text-right font-mono text-mono text-primary">{b.count.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
