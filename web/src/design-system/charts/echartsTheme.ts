import type { EChartsCoreOption } from "echarts/core";

/** Concrete colours for canvas, read from the live token set. */
export function chartTokens() {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback = "") => css.getPropertyValue(name).trim() || fallback;
  return {
    text: v("--text-primary", "#e8e1d5"),
    secondary: v("--text-secondary", "#b5ad9f"),
    tertiary: v("--text-tertiary", "#8a8378"),
    grid: v("--grid-line", "rgba(255,244,230,0.06)"),
    surface: v("--surface-1", "#1c1914"),
    border: v("--border-subtle", "rgba(255,244,230,0.08)"),
    accent: v("--accent", "#5d8647"),
    font: '"Geist Sans", system-ui, sans-serif',
  };
}

const FONT_SIZE = 11;

export function baseChartOption(): EChartsCoreOption {
  const t = chartTokens();
  return {
    animationEasing: "cubicOut",
    animationDuration: 420,
    animationDurationUpdate: 240,
    textStyle: { fontFamily: t.font, fontSize: FONT_SIZE, color: t.secondary },
    grid: { left: 6, right: 12, top: 18, bottom: 6, containLabel: true },
    tooltip: {
      backgroundColor: t.surface,
      borderColor: t.border,
      borderWidth: 1,
      padding: [8, 10],
      textStyle: { color: t.text, fontFamily: t.font, fontSize: 12 },
      extraCssText:
        "backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 10px; box-shadow: var(--shadow-3);",
    },
    legend: {
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: t.secondary, fontSize: FONT_SIZE, fontFamily: t.font },
    },
  };
}

export function axisStyle() {
  const t = chartTokens();
  return {
    axisLine: { lineStyle: { color: t.grid } },
    axisTick: { show: false },
    axisLabel: { color: t.tertiary, fontSize: FONT_SIZE, fontFamily: t.font },
    splitLine: { lineStyle: { color: t.grid } },
  };
}
