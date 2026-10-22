/**
 * The route table. Paths are the shareable contract: `/area/:fips` and
 * `/print/:fips` carry identity, query params carry lens/filters/compare.
 */
export type ViewId =
  | "explore"
  | "rankings"
  | "compare"
  | "scatter"
  | "sensitivity"
  | "methodology"
  | "area"
  | "print"
  | "design";

export const VIEW_PATHS: Record<Exclude<ViewId, "area" | "print">, string> = {
  explore: "/",
  rankings: "/rankings",
  compare: "/compare",
  scatter: "/scatter",
  sensitivity: "/sensitivity",
  methodology: "/methodology",
  design: "/design",
};

export function pathFor(view: ViewId): string | null {
  if (view === "area" || view === "print") return null;
  return VIEW_PATHS[view];
}

export function viewFromPath(pathname: string): ViewId {
  if (pathname.startsWith("/area/")) return "area";
  if (pathname.startsWith("/print/")) return "print";
  const clean = pathname.replace(/\/+$/, "") || "/";
  const hit = (Object.entries(VIEW_PATHS) as [ViewId, string][]).find(
    ([, path]) => path === clean,
  );
  return hit?.[0] ?? "explore";
}

/** FIPS encoded in `/area/:fips` or `/print/:fips`, if any. */
export function fipsFromPath(pathname: string): string | null {
  return pathname.match(/^\/(?:area|print)\/(\d{5})$/)?.[1] ?? null;
}
