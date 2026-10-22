import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, HeatmapChart, LineChart, RadarChart, ScatterChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  RadarComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsCoreOption } from "echarts/core";
import { baseChartOption } from "./echartsTheme";
import { usePreferences } from "../providers/PreferencesProvider";

echarts.use([
  BarChart,
  LineChart,
  RadarChart,
  HeatmapChart,
  ScatterChart,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  RadarComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

/** Canvas chart bound to tokens, theme and reduced-motion preferences. */
export function EChart({
  option,
  height = 240,
  ariaLabel,
  className,
}: {
  option: EChartsCoreOption;
  height?: number;
  ariaLabel: string;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const { theme, reduceMotion } = usePreferences();

  useEffect(() => {
    if (!host.current) return;
    const instance = echarts.init(host.current, undefined, { renderer: "canvas" });
    chart.current = instance;
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(host.current);
    return () => {
      observer.disconnect();
      instance.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = chart.current;
    if (!instance) return;
    // Parent effects apply the theme attribute after child effects, so read
    // tokens on the next frame rather than in this commit.
    const frame = requestAnimationFrame(() => {
      instance.setOption(
        { ...baseChartOption(), animation: !reduceMotion, ...option },
        { notMerge: true },
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [option, theme, reduceMotion]);

  return (
    <div
      ref={host}
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{ height }}
    />
  );
}
