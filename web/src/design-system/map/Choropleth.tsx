import { useEffect, useMemo, useRef, useState } from "react";
import { geoPath, geoIdentity } from "d3-geo";
import { quadtree } from "d3-quadtree";
import { zoom as d3zoom, zoomIdentity, type ZoomTransform } from "d3-zoom";
import { select } from "d3-selection";
import type { MapFeature } from "./geometry";
import { opportunityColor } from "./ramp";

export interface ChoroplethProps {
  counties: MapFeature[];
  states: MapFeature[];
  bbox: [number, number, number, number];
  /** fips -> value in [0,1] used to colour the fill, or null for no-data. */
  value: (fips: string) => number | null;
  /** fips -> true renders hatched and dimmed (ineligible / low confidence). */
  flagged?: (fips: string) => boolean;
  selectedFips: string | null;
  compareFips: string[];
  onHover: (fips: string | null, x: number, y: number) => void;
  onSelect: (fips: string) => void;
  onShiftSelect: (fips: string) => void;
  theme: "dark" | "light";
  colorblind: boolean;
  hiddenSummary: { fips: string; label: string }[];
}

/** Canvas choropleth with pan/zoom, quadtree hit-testing and offscreen layers. */
export function Choropleth({
  counties,
  states,
  bbox,
  value,
  flagged,
  selectedFips,
  compareFips,
  onHover,
  onSelect,
  onShiftSelect,
  theme,
  colorblind,
  hiddenSummary,
}: ChoroplethProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 960, h: 600 });
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const boundsRef = useRef<{ scale: number; tx: number; ty: number }>({ scale: 1, tx: 0, ty: 0 });

  const path = useMemo(() => {
    const identity = geoIdentity().reflectY(false);
    return geoPath(identity);
  }, []);

  // Fit geometry into the canvas once we know its size.
  const fit = useMemo(() => {
    const bw = bbox[2] - bbox[0];
    const bh = bbox[3] - bbox[1];
    const scale = Math.min(size.w / bw, size.h / bh) * 0.96;
    const tx = (size.w - bw * scale) / 2 - bbox[0] * scale;
    const ty = (size.h - bh * scale) / 2 - bbox[1] * scale;
    return { scale, tx, ty };
  }, [bbox, size]);
  boundsRef.current = fit;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Draw on every relevant change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.save();
    ctx.translate(fit.tx, fit.ty);
    ctx.scale(fit.scale, fit.scale);
    const z = transform;
    ctx.translate(z.x / fit.scale, z.y / fit.scale);
    ctx.scale(z.k, z.k);

    const stroke = getComputedStyle(document.documentElement).getPropertyValue("--map-stroke").trim();
    const gridline = getComputedStyle(document.documentElement).getPropertyValue("--grid-line").trim();

    // County fills.
    ctx.lineJoin = "round";
    for (const f of counties) {
      const fips = String(f.id ?? f.properties.fips);
      const v = value(fips);
      ctx.beginPath();
      const p = path(f);
      if (p) {
        const path2d = new Path2D(p);
        if (v == null) {
          ctx.fillStyle = "rgba(255,255,255,0.03)";
        } else {
          ctx.fillStyle = opportunityColor(v, { theme, colorblind });
        }
        ctx.fill(path2d);
        if (flagged?.(fips)) {
          ctx.save();
          ctx.clip(path2d);
          ctx.globalAlpha = 0.2;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 0.6;
          for (let x = bbox[0]; x < bbox[2]; x += 4) {
            ctx.beginPath();
            ctx.moveTo(x, bbox[1]);
            ctx.lineTo(x + (bbox[3] - bbox[1]), bbox[3]);
            ctx.stroke();
          }
          ctx.restore();
        }
        ctx.strokeStyle = stroke || "rgba(0,0,0,0.5)";
        ctx.lineWidth = 0.35 / (z.k || 1);
        ctx.stroke(path2d);
      }
    }

    // State outlines.
    ctx.strokeStyle = gridline || "rgba(255,255,255,0.4)";
    ctx.lineWidth = 0.8 / (z.k || 1);
    for (const f of states) {
      const p = path(f);
      if (p) ctx.stroke(new Path2D(p));
    }

    // Selection + compare rings.
    const ring = (fips: string, color: string, dashed: boolean, width: number) => {
      const f = counties.find((c) => String(c.id ?? c.properties.fips) === fips);
      if (!f) return;
      const p = path(f);
      if (!p) return;
      ctx.save();
      ctx.setLineDash(dashed ? [4 / (z.k || 1), 3 / (z.k || 1)] : []);
      ctx.strokeStyle = color;
      ctx.lineWidth = width / (z.k || 1);
      ctx.stroke(new Path2D(p));
      ctx.restore();
    };
    for (const f of compareFips) ring(f, "#ffffff", true, 1.4);
    if (selectedFips) ring(selectedFips, getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(), false, 2);

    ctx.restore();
  }, [counties, states, bbox, value, flagged, selectedFips, compareFips, size, fit, transform, theme, colorblind, path]);

  // Quadtree over feature centroids for hit-testing.
  const tree = useMemo(() => {
    const pts: { x: number; y: number; f: MapFeature }[] = [];
    for (const f of counties) {
      const c = path.centroid(f);
      if (Number.isFinite(c[0])) pts.push({ x: c[0], y: c[1], f });
    }
    return quadtree<{ x: number; y: number; f: MapFeature }>()
      .x((d) => d.x)
      .y((d) => d.y)
      .addAll(pts);
  }, [counties, path]);

  // Pan/zoom via d3-zoom on a transparent overlay div.
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const behavior = d3zoom<HTMLDivElement, unknown>()
      .scaleExtent([1, 8])
      .on("zoom", (event) => setTransform(event.transform));
    select(el).call(behavior);
    return () => {
      select(el).on(".zoom", null);
    };
  }, []);

  const toGeo = (clientX: number, clientY: number) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const x = (sx - fit.tx - transform.x) / (fit.scale * transform.k);
    const y = (sy - fit.ty - transform.y) / (fit.scale * transform.k);
    return { x, y };
  };

  const hit = (clientX: number, clientY: number): MapFeature | null => {
    const { x, y } = toGeo(clientX, clientY);
    const found = tree.find(x, y, 18 / (fit.scale * transform.k));
    return found?.f ?? null;
  };

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <canvas ref={canvasRef} style={{ width: size.w, height: size.h }} aria-hidden />
      <div
        ref={overlayRef}
        className="absolute inset-0 cursor-pointer"
        role="application"
        aria-label="US county map. Use arrow keys to pan, plus and minus to zoom, Enter to select the nearest county."
        tabIndex={0}
        onMouseMove={(e) => {
          const f = hit(e.clientX, e.clientY);
          onHover(f ? String(f.id ?? f.properties.fips) : null, e.clientX, e.clientY);
        }}
        onMouseLeave={() => onHover(null, 0, 0)}
        onClick={(e) => {
          const f = hit(e.clientX, e.clientY);
          if (!f) return;
          const fips = String(f.id ?? f.properties.fips);
          if (e.shiftKey) onShiftSelect(fips);
          else onSelect(fips);
        }}
      />
      {/* Visually hidden ranked list mirrors what the map shows (F.2). */}
      <ul className="sr-only" aria-label="Ranked areas shown on the map">
        {hiddenSummary.slice(0, 50).map((s) => (
          <li key={s.fips}>{s.label}</li>
        ))}
      </ul>
    </div>
  );
}
