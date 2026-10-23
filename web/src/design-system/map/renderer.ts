/**
 * Canvas map renderer. Everything expensive happens outside the frame:
 * geometry is already Path2D, colours are classed strings, and only the
 * visible viewport is filled. Pan/zoom work is coalesced by the caller.
 */
import type { PreparedFeature, PreparedMap } from "./prepare";
import { classIndex } from "./breaks";

export type MapFlag = "ineligible" | "partial" | null;

export interface RenderTransform {
  x: number;
  y: number;
  k: number;
}

export interface RenderView {
  width: number;
  height: number;
  dpr: number;
  fit: { scale: number; tx: number; ty: number };
  transform: RenderTransform;
  colors: string[];
  breaks: number[];
  values: ReadonlyMap<string, number | null>;
  flags: ReadonlyMap<string, MapFlag>;
  selectedFips: string | null;
  compareFips: readonly string[];
  hoveredFips: string | null;
  noDataFill: string;
  countyStroke: string;
  stateStroke: string;
  ineligibleHatch: string;
  partialHatch: string;
  ring: string;
}

function intersects(
  bounds: [[number, number], [number, number]],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): boolean {
  return bounds[1][0] >= x0 && bounds[0][0] <= x1 && bounds[1][1] >= y0 && bounds[0][1] <= y1;
}

export class MapRenderer {
  private canvas: HTMLCanvasElement;
  private prepared: PreparedMap | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  setPrepared(prepared: PreparedMap): void {
    this.prepared = prepared;
  }

  draw(view: RenderView): void {
    const prepared = this.prepared;
    const ctx = this.canvas.getContext("2d");
    if (!prepared || !ctx) return;

    const pixelWidth = Math.max(1, Math.round(view.width * view.dpr));
    const pixelHeight = Math.max(1, Math.round(view.height * view.dpr));
    if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth;
    if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight;
    this.canvas.style.width = `${view.width}px`;
    this.canvas.style.height = `${view.height}px`;

    const { fit, transform } = view;
    const scale = fit.scale * transform.k;
    const tx = fit.tx + transform.x;
    const ty = fit.ty + transform.y;

    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.clearRect(0, 0, view.width, view.height);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(scale, scale);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // World-space viewport, used to skip off-screen counties at high zoom.
    const wx0 = (0 - tx) / scale;
    const wy0 = (0 - ty) / scale;
    const wx1 = (view.width - tx) / scale;
    const wy1 = (view.height - ty) / scale;

    const visible: PreparedFeature[] = [];
    const ineligiblePath = typeof Path2D !== "undefined" ? new Path2D() : null;
    const partialPath = typeof Path2D !== "undefined" ? new Path2D() : null;

    for (const feature of prepared.counties) {
      if (!feature.path) continue;
      if (!intersects(feature.bounds, wx0, wy0, wx1, wy1)) continue;
      visible.push(feature);
      const value = view.values.get(feature.fips);
      ctx.fillStyle =
        value == null
          ? view.noDataFill
          : view.colors[classIndex(value, view.breaks)] ?? view.colors[view.colors.length - 1];
      ctx.fill(feature.path);

      const flag = view.flags.get(feature.fips);
      if (flag === "ineligible" && ineligiblePath) ineligiblePath.addPath(feature.path);
      else if (flag === "partial" && partialPath) partialPath.addPath(feature.path);
    }

    // County borders are one combined path rather than 3,144 strokes.
    if (prepared.countyStrokePath) {
      ctx.strokeStyle = view.countyStroke;
      ctx.lineWidth = 0.45 / Math.max(0.35, transform.k);
      ctx.stroke(prepared.countyStrokePath);
    }

    // One clip per hatch group, then evenly spaced screen-space lines. At
    // 1x this is a few hundred strokes instead of ~100k per flagged county.
    const hatch = (path: Path2D | null, color: string, spacing: number, direction: 1 | -1) => {
      if (!path) return;
      ctx.save();
      ctx.clip(path);
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.8 / Math.max(0.35, transform.k);
      const step = spacing / scale;
      const xStart = Math.floor(wx0 / step) * step - step;
      const xEnd = wx1 + step;
      const span = wy1 - wy0 + Math.abs(wx1 - wx0);
      for (let x = xStart; x <= xEnd; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, wy0);
        ctx.lineTo(x + span * direction, wy1);
        ctx.stroke();
      }
      ctx.restore();
    };
    hatch(ineligiblePath, view.ineligibleHatch, 5, 1);
    hatch(partialPath, view.partialHatch, 7, -1);

    if (prepared.statePath) {
      ctx.strokeStyle = view.stateStroke;
      ctx.lineWidth = 1 / Math.max(0.5, transform.k);
      ctx.stroke(prepared.statePath);
    }

    const ring = (fips: string, color: string, dashed: boolean, width: number) => {
      const feature = prepared.byFips.get(fips);
      if (!feature?.path) return;
      ctx.save();
      ctx.setLineDash(dashed ? [4 / Math.max(1, transform.k), 3 / Math.max(1, transform.k)] : []);
      ctx.strokeStyle = color;
      ctx.lineWidth = width / Math.max(0.7, transform.k);
      ctx.stroke(feature.path);
      ctx.restore();
    };

    for (const fips of view.compareFips) ring(fips, "#ffffff", true, 1.4);
    if (view.hoveredFips && view.hoveredFips !== view.selectedFips) {
      ring(view.hoveredFips, view.ring, false, 1.2);
    }
    if (view.selectedFips) ring(view.selectedFips, view.ring, false, 2.2);

    ctx.restore();
  }
}
