import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { quadtree } from "d3-quadtree";
import { select, type Selection } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import type { MapFeature } from "./geometry";
import { prepareGeometry } from "./prepare";
import { MapRenderer, type MapFlag } from "./renderer";

export interface ChoroplethHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  focusFips: (fips: string) => void;
}

export interface HoverCard {
  title: string;
  detail: string;
}

export interface ChoroplethProps {
  counties: MapFeature[];
  states: MapFeature[];
  bbox: [number, number, number, number];
  /** fips -> value in [0,100] used to colour the fill, or null for no-data. */
  values: ReadonlyMap<string, number | null>;
  /** fips -> hatch reason. */
  flags: ReadonlyMap<string, MapFlag>;
  /** Seven class colours, low to high. */
  colors: string[];
  /** Six internal class breaks. */
  breaks: number[];
  selectedFips: string | null;
  compareFips: string[];
  theme: "dark" | "light";
  onSelect: (fips: string) => void;
  onShiftSelect: (fips: string) => void;
  hoverCard: (fips: string) => HoverCard;
  hiddenSummary: { fips: string; label: string }[];
}

interface StyleTokens {
  ring: string;
  countyStroke: string;
  stateStroke: string;
  noDataFill: string;
  ineligibleHatch: string;
  partialHatch: string;
}

function readTokens(theme: "dark" | "light"): StyleTokens {
  if (typeof document === "undefined") {
    return {
      ring: theme === "dark" ? "#8fb872" : "#3f6630",
      countyStroke: "rgba(0,0,0,0.5)",
      stateStroke: "rgba(255,255,255,0.4)",
      noDataFill: "rgba(255,255,255,0.04)",
      ineligibleHatch: "rgba(255,255,255,0.28)",
      partialHatch: "rgba(143,184,114,0.55)",
    };
  }
  const css = getComputedStyle(document.documentElement);
  return {
    ring: css.getPropertyValue("--accent-text").trim() || "#8fb872",
    countyStroke: css.getPropertyValue("--map-stroke").trim() || "rgba(0,0,0,0.5)",
    stateStroke: css.getPropertyValue("--border-strong").trim() || "rgba(255,255,255,0.4)",
    noDataFill: theme === "dark" ? "rgba(255,244,230,0.05)" : "rgba(20,17,12,0.04)",
    ineligibleHatch: theme === "dark" ? "rgba(255,244,230,0.30)" : "rgba(20,17,12,0.28)",
    partialHatch: theme === "dark" ? "rgba(143,184,114,0.55)" : "rgba(63,102,48,0.45)",
  };
}

/**
 * Full-bleed canvas choropleth. Geometry is prepared once, fills are classed,
 * hatches are single clipped line passes, and pan/zoom writes no React state.
 */
export const Choropleth = forwardRef<ChoroplethHandle, ChoroplethProps>(function Choropleth(
  {
    counties,
    states,
    bbox,
    values,
    flags,
    colors,
    breaks,
    selectedFips,
    compareFips,
    theme,
    onSelect,
    onShiftSelect,
    hoverCard,
    hiddenSummary,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipTitle = useRef<HTMLSpanElement>(null);
  const tooltipDetail = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const prepared = useMemo(() => prepareGeometry(counties, states, bbox), [counties, states, bbox]);
  const renderer = useRef<MapRenderer | null>(null);
  const transform = useRef<ZoomTransform>(zoomIdentity);
  const behaviorRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const raf = useRef(0);
  const hovered = useRef<string | null>(null);
  const lastPointer = useRef({ x: -1, y: -1 });
  const tokens = useMemo(() => readTokens(theme), [theme]);

  const fit = useMemo(() => {
    if (!size.w || !size.h) return { scale: 1, tx: 0, ty: 0 };
    const bw = bbox[2] - bbox[0];
    const bh = bbox[3] - bbox[1];
    const scale = Math.min(size.w / bw, size.h / bh) * 0.96;
    return {
      scale,
      tx: (size.w - bw * scale) / 2 - bbox[0] * scale,
      ty: (size.h - bh * scale) / 2 - bbox[1] * scale,
    };
  }, [bbox, size]);

  const live = useRef({ prepared, values, flags, colors, breaks, selectedFips, compareFips, fit, size, tokens });

  const drawRef = useRef<() => void>(() => {});

  const draw = useCallback(() => {
    raf.current = 0;
    const canvas = canvasRef.current;
    const state = live.current;
    if (!canvas || !state.prepared.counties.length) return;
    // The wrap can be measured as 0x0 when a parent is still laying out; fall
    // back to the element box on the next paint instead of silently skipping
    // the draw (which would leave a blank canvas).
    let w = state.size.w;
    let h = state.size.h;
    if (!w || !h) {
      const rect = wrapRef.current?.getBoundingClientRect();
      w = rect?.width ?? 0;
      h = rect?.height ?? 0;
      if (!w || !h) {
        raf.current = requestAnimationFrame(drawRef.current);
        return;
      }
      setSize({ w, h });
    }
    if (!renderer.current) renderer.current = new MapRenderer(canvas);
    renderer.current.setPrepared(state.prepared);
    renderer.current.draw({
      width: w,
      height: h,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
      fit: state.fit,
      transform: transform.current,
      colors: state.colors,
      breaks: state.breaks,
      values: state.values,
      flags: state.flags,
      selectedFips: state.selectedFips,
      compareFips: state.compareFips,
      hoveredFips: null,
      noDataFill: state.tokens.noDataFill,
      countyStroke: state.tokens.countyStroke,
      stateStroke: state.tokens.stateStroke,
      ineligibleHatch: state.tokens.ineligibleHatch,
      partialHatch: state.tokens.partialHatch,
      ring: state.tokens.ring,
    });
  }, []);

  const requestDraw = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(drawRef.current);
  }, []);

  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  useEffect(() => {
    requestDraw();
  }, [prepared, requestDraw]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box) return;
      setSize((previous) =>
        Math.abs(previous.w - box.width) < 1 && Math.abs(previous.h - box.height) < 1
          ? previous
          : { w: box.width, h: box.height },
      );
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    live.current = { prepared, values, flags, colors, breaks, selectedFips, compareFips, fit, size, tokens };
    requestDraw();
  }, [prepared, values, flags, colors, breaks, selectedFips, compareFips, fit, size, tokens, requestDraw]);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const behavior = d3zoom<HTMLDivElement, unknown>()
      .scaleExtent([1, 8])
      .filter((event) => {
        // Keep the map operable with touch while letting the page scroll on
        // one finger outside the map; d3 handles pinch and wheel natively.
        return !event.ctrlKey || event.type === "wheel";
      })
      .on("zoom", (event) => {
        transform.current = event.transform;
        requestDraw();
      });
    behaviorRef.current = behavior;
    select(el).call(behavior);
    return () => {
      behaviorRef.current = null;
      select(el).on(".zoom", null);
    };
  }, [requestDraw]);

  const applyZoom = (
    fn: (
      behavior: ZoomBehavior<HTMLDivElement, unknown>,
      selection: Selection<HTMLDivElement, unknown, null, undefined>,
    ) => void,
  ) => {
    const el = overlayRef.current;
    const behavior = behaviorRef.current;
    if (!el || !behavior) return;
    const selection = select<HTMLDivElement, unknown>(el);
    fn(behavior, selection);
  };

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => applyZoom((behavior, selection) => selection.call(behavior.scaleBy, 1.45)),
      zoomOut: () => applyZoom((behavior, selection) => selection.call(behavior.scaleBy, 1 / 1.45)),
      reset: () => applyZoom((behavior, selection) => selection.call(behavior.transform, zoomIdentity)),
      focusFips: (fips: string) => {
        const feature = prepared.byFips.get(fips);
        if (!feature || !size.w || !size.h) return;
        const k = 3;
        const [cx, cy] = feature.centroid;
        const localX = cx * fit.scale;
        const localY = cy * fit.scale;
        const next = zoomIdentity
          .translate(size.w / 2, size.h / 2)
          .scale(k)
          .translate(-localX, -localY);
        applyZoom((behavior, selection) => selection.call(behavior.transform, next));
      },
    }),
    [prepared, size, fit],
  );

  const tree = useMemo(
    () =>
      quadtree<{ x: number; y: number; fips: string }>()
        .x((d) => d.x)
        .y((d) => d.y)
        .addAll(prepared.counties.map((feature) => ({ x: feature.centroid[0], y: feature.centroid[1], fips: feature.fips }))),
    [prepared],
  );

  const hit = (clientX: number, clientY: number): string | null => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const scale = fit.scale * transform.current.k;
    const x =
      (clientX - rect.left - fit.tx - transform.current.x) / scale;
    const y =
      (clientY - rect.top - fit.ty - transform.current.y) / scale;
    return tree.find(x, y, 18 / scale)?.fips ?? null;
  };

  const hideTooltip = () => {
    hovered.current = null;
    if (tooltipRef.current) tooltipRef.current.style.visibility = "hidden";
  };

  const moveTooltip = (fips: string | null, clientX: number, clientY: number) => {
    const tip = tooltipRef.current;
    if (!tip) return;
    if (!fips) {
      hideTooltip();
      return;
    }
    if (hovered.current !== fips) {
      hovered.current = fips;
      const card = hoverCard(fips);
      if (tooltipTitle.current) tooltipTitle.current.textContent = card.title;
      if (tooltipDetail.current) tooltipDetail.current.textContent = card.detail;
    }
    const rect = wrapRef.current?.getBoundingClientRect();
    const x = clientX - (rect?.left ?? 0) + 14;
    const y = clientY - (rect?.top ?? 0) + 14;
    lastPointer.current = { x, y };
    tip.style.visibility = "visible";
    tip.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden" style={{ touchAction: "none" }}>
      <canvas ref={canvasRef} aria-hidden />
      <div
        ref={overlayRef}
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        role="application"
        aria-label="US county map. Use arrow keys to pan, plus and minus to zoom, 0 to reset, Enter to select the county nearest the centre."
        tabIndex={0}
        onPointerMove={(event) => {
          if (event.pointerType === "touch" && event.buttons === 0) return;
          const fips = hit(event.clientX, event.clientY);
          moveTooltip(fips, event.clientX, event.clientY);
        }}
        onPointerLeave={hideTooltip}
        onBlur={hideTooltip}
        onClick={(event) => {
          const fips = hit(event.clientX, event.clientY);
          if (!fips) return;
          if (event.shiftKey) onShiftSelect(fips);
          else onSelect(fips);
        }}
        onKeyDown={(event) => {
          const step = 60;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            const dx = event.key === "ArrowLeft" ? step : event.key === "ArrowRight" ? -step : 0;
            const dy = event.key === "ArrowUp" ? step : event.key === "ArrowDown" ? -step : 0;
            applyZoom((behavior, selection) => selection.call(behavior.translateBy, dx, dy));
          } else if (event.key === "+" || event.key === "=") {
            event.preventDefault();
            applyZoom((behavior, selection) => selection.call(behavior.scaleBy, 1.4));
          } else if (event.key === "-" || event.key === "_") {
            event.preventDefault();
            applyZoom((behavior, selection) => selection.call(behavior.scaleBy, 1 / 1.4));
          } else if (event.key === "0") {
            event.preventDefault();
            applyZoom((behavior, selection) => selection.call(behavior.transform, zoomIdentity));
          } else if (event.key === "Enter" && size.w) {
            event.preventDefault();
            const scale = fit.scale * transform.current.k;
            const cx = (size.w / 2 - fit.tx - transform.current.x) / scale;
            const cy = (size.h / 2 - fit.ty - transform.current.y) / scale;
            const nearest = tree.find(cx, cy, 80 / scale);
            if (nearest) onSelect(nearest.fips);
          }
        }}
      />
      <div
        ref={tooltipRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-tooltip max-w-64 rounded-control border border-default bg-surface1 px-2.5 py-2 text-caption shadow-l3"
        style={{ visibility: "hidden", willChange: "transform" }}
      >
        <span ref={tooltipTitle} className="block text-body-sm font-medium text-primary" />
        <span ref={tooltipDetail} className="mt-0.5 block text-tertiary" />
      </div>
      <ul className="sr-only" aria-label="Ranked areas shown on the map">
        {hiddenSummary.slice(0, 50).map((item) => (
          <li key={item.fips}>{item.label}</li>
        ))}
      </ul>
    </div>
  );
});
