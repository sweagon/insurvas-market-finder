/**
 * Data-visualisation ramps (B.3). Stops are sampled from ColorBrewer/perceptual
 * schemes and trimmed so the low end never disappears into the canvas. Values
 * are interpolated in sRGB for cheapness; the schemes are near-perceptually
 * uniform already.
 */

type RGB = [number, number, number];

function hex(h: string): RGB {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Magma, trimmed to the 0.18–0.96 range (dark theme opportunity ramp).
const MAGMA: RGB[] = [
  "#1c1047", "#3b0f70", "#641a80", "#8c2981", "#b73779", "#de4968",
  "#f66e5c", "#fe9f6d", "#fecf92", "#fcfdbf",
].map(hex);

// YlOrRd (ColorBrewer) for the light theme, low = light, high = deep.
const YLORRD: RGB[] = [
  "#ffffcc", "#ffeda0", "#fed976", "#feb24c", "#fd8d3c", "#fc4e2a", "#e31a1c", "#b10026",
].map(hex);

// Cividis, colorblind-safe. Reversed for light theme (high = dark).
const CIVIDIS: RGB[] = [
  "#00224e", "#123570", "#3b496c", "#575d6d", "#707173", "#8a8678",
  "#a59c74", "#c3b369", "#e1cc55", "#fee838",
].map(hex);

function sample(stops: RGB[], t: number): string {
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = stops[i];
  const b = stops[Math.min(stops.length - 1, i + 1)];
  const c = [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

export interface RampOptions {
  theme: "dark" | "light";
  colorblind?: boolean;
}

/** Sequential opportunity ramp for score and size. */
export function opportunityColor(t: number, opts: RampOptions): string {
  if (opts.colorblind) {
    const stops = opts.theme === "dark" ? CIVIDIS : [...CIVIDIS].reverse();
    return sample(stops, t);
  }
  return sample(opts.theme === "dark" ? MAGMA : YLORRD, t);
}

export function rampStops(opts: RampOptions, n = 9): string[] {
  return Array.from({ length: n }, (_, i) => opportunityColor(i / (n - 1), opts));
}

/** No-data fill: surface-3 with a dotted border, never a ramp color. */
export const NO_DATA = "var(--bg-surface-3)";
