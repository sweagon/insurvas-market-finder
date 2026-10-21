/**
 * Number, label and vintage formatting (Part G.2). Every number the UI shows
 * goes through this file so formats stay consistent and testable.
 */

const NUM = new Intl.NumberFormat("en-US");
const NUM1 = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Full population with separators: 1,204,331 */
export function pop(n: number | null | undefined): string {
  if (n == null) return "—";
  return NUM.format(Math.round(n));
}

/** Compact population for cards: 1.2M, 48.3K */
export function popCompact(n: number | null | undefined): string {
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${NUM1.format(n / 1e9)}B`;
  if (abs >= 1e6) return `${NUM1.format(n / 1e6)}M`;
  if (abs >= 1e3) return `${NUM1.format(n / 1e3)}K`;
  return NUM.format(n);
}

/** Compact currency for pools: $4.8B; full for per-unit: $72,400 */
export function usd(n: number | null | undefined, compact = false): string {
  if (n == null) return "—";
  if (compact && Math.abs(n) >= 1e6) {
    const abs = Math.abs(n);
    const units: [number, string][] = [
      [1e12, "T"],
      [1e9, "B"],
      [1e6, "M"],
    ];
    for (const [d, s] of units) {
      if (abs >= d) return `$${NUM1.format(n / d)}${s}`;
    }
  }
  return `$${NUM.format(Math.round(n))}`;
}

/** Percent, one decimal: 18.4%. Differences in points: +2.1 pts */
export function pct(n: number | null | undefined, opts?: { signed?: boolean }): string {
  if (n == null) return "—";
  const v = n * 100;
  const sign = opts?.signed && v > 0 ? "+" : "";
  return `${sign}${NUM1.format(v)}%`;
}

export function pts(n: number | null | undefined): string {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${NUM1.format(n)} pts`;
}

/** Index with context: 112 (US = 100) */
export function index(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${NUM.format(Math.round(n))} (US = 100)`;
}

/** Score is an integer 0 to 100 */
export function score(n: number | null | undefined): string {
  if (n == null) return "—";
  return NUM.format(Math.round(n));
}

/** Rank: #12 of 3,098 (range #8–#19) */
export function rank(
  r: number | null | undefined,
  total?: number,
  range?: [number, number] | null,
): string {
  if (r == null) return "Not ranked";
  const base = total != null ? `#${NUM.format(r)} of ${NUM.format(total)}` : `#${NUM.format(r)}`;
  if (range) return `${base} (range #${NUM.format(range[0])}–#${NUM.format(range[1])})`;
  return base;
}

export function rankRange(p05: number, p95: number): string {
  return `#${NUM.format(Math.round(p05))}–#${NUM.format(Math.round(p95))}`;
}

/** Vintage with an en dash for ranges: ACS 2020–2024 */
export function vintage(label: string, value: string | number): string {
  const v = String(value).replace(/(\d{4})-(\d{4})/, "$1–$2");
  return `${label} ${v}`;
}

/** Missing value: em dash with a tooltip in the component */
export const MISSING = "—";

const UNIT_FORMATTERS: Record<string, (n: number | null | undefined) => string> = {
  people: pop,
  households: pop,
  usd: usd,
  share: pct,
  percent: pct,
  density: (n) => (n == null ? MISSING : `${NUM1.format(n)}/sq mi`),
  rate: (n) => (n == null ? MISSING : NUM1.format(n)),
  index: (n) => (n == null ? MISSING : NUM1.format(n)),
};

/** Format any metric value by its declared unit. */
export function metricValue(
  unit: string,
  n: number | null | undefined,
  opts?: { compact?: boolean },
): string {
  if (n == null) return MISSING;
  if (unit === "usd" && opts?.compact) return usd(n, true);
  const f = UNIT_FORMATTERS[unit] ?? ((x: number | null | undefined) => (x == null ? MISSING : NUM1.format(x)));
  return f(n);
}

export function dateLong(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

const STATE_ABBR: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", "District of Columbia": "DC",
  Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL",
  Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA",
  Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN",
  Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK",
  Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
};

/** Two-letter postal abbreviation from a full state name or abbreviation. */
export function stateAbbr(name: string | null | undefined): string {
  if (!name) return "—";
  if (name.length === 2) return name.toUpperCase();
  return STATE_ABBR[name] ?? name.slice(0, 2).toUpperCase();
}
