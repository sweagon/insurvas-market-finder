import { cn } from "../cn";

export interface PercentileItem {
  id: string;
  label: string;
  /** Area percentile, 0–100. NaN renders as unavailable. */
  value: number;
  stateValue?: number;
  usValue?: number;
  color?: string;
}

/**
 * Area marker plus state and US ticks on a 0–100 track (design §D.4). This is
 * the default profile view because it reads without colour or hover.
 */
export function PercentileBars({
  items,
  className,
}: {
  items: PercentileItem[];
  className?: string;
}) {
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item) => {
        const pct = Number.isFinite(item.value) ? Math.max(0, Math.min(100, item.value)) : null;
        return (
          <li key={item.id}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="text-caption text-secondary">{item.label}</span>
              <span className="font-mono text-mono text-primary">
                {pct === null ? "—" : `${pct.toFixed(0)}th`}
              </span>
            </div>
            <div
              className="relative h-3 rounded-pill bg-surface3"
              role="img"
              aria-label={`${item.label}: ${pct === null ? "not available" : `${pct.toFixed(0)}th percentile`}${
                item.stateValue !== undefined ? `, state ${item.stateValue.toFixed(0)}` : ""
              }`}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-pill opacity-30"
                style={{
                  width: pct === null ? 0 : `${pct}%`,
                  background: item.color ?? "var(--accent)",
                }}
              />
              {item.usValue !== undefined && Number.isFinite(item.usValue) && (
                <span
                  className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-tertiary"
                  style={{ left: `${Math.max(0, Math.min(100, item.usValue))}%` }}
                  title={`US ${item.usValue.toFixed(0)}`}
                />
              )}
              {item.stateValue !== undefined && Number.isFinite(item.stateValue) && (
                <span
                  className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-surface1 bg-secondary"
                  style={{ left: `${Math.max(0, Math.min(100, item.stateValue))}%` }}
                  title={`State ${item.stateValue.toFixed(0)}`}
                />
              )}
              {pct !== null && (
                <span
                  className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface1"
                  style={{ left: `${pct}%`, background: item.color ?? "var(--accent)" }}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function PercentileTable({ items }: { items: PercentileItem[] }) {
  return (
    <table className="w-full text-left text-body-sm">
      <caption className="sr-only">Percentiles with state and US markers</caption>
      <thead>
        <tr className="border-b border-subtle text-caption text-tertiary">
          <th scope="col" className="py-2 pr-3 font-medium">Metric</th>
          <th scope="col" className="py-2 pr-3 text-right font-medium">Area</th>
          <th scope="col" className="py-2 pr-3 text-right font-medium">State</th>
          <th scope="col" className="py-2 text-right font-medium">US</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-subtle last:border-0">
            <th scope="row" className="py-2 pr-3 font-normal text-secondary">{item.label}</th>
            <td className="py-2 pr-3 text-right font-mono text-mono text-primary">
              {Number.isFinite(item.value) ? item.value.toFixed(0) : "—"}
            </td>
            <td className="py-2 pr-3 text-right font-mono text-mono text-tertiary">
              {item.stateValue !== undefined && Number.isFinite(item.stateValue) ? item.stateValue.toFixed(0) : "—"}
            </td>
            <td className="py-2 text-right font-mono text-mono text-tertiary">
              {item.usValue !== undefined && Number.isFinite(item.usValue) ? item.usValue.toFixed(0) : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
