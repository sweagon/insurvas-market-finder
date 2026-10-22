import { useStore } from "../../state/store";
import { dataFreshness, STALE_AFTER_DAYS } from "../../state/freshness";

/**
 * Honest staleness signal. A config/data mismatch is an error (definitions
 * disagree); an old-but-matching build is a caution (vintages may have moved).
 * Neither state is allowed to fail silently.
 */
export function StaleDataBanner() {
  const catalog = useStore((s) => s.catalog);
  const f = dataFreshness(catalog?.meta);
  if (!f.stale) return null;

  const config = f.configStale
    ? `This page was built for config ${catalog?.meta.config_hash ?? "?"} but the data uses a different model config. Rankings may mix definitions.`
    : `The dataset is ${Math.round(f.ageDays)} days old (limit ${STALE_AFTER_DAYS}). Check the latest source vintages before relying on it.`;

  return (
    <div
      role="status"
      className={
        f.configStale
          ? "sticky top-0 z-sticky border-b border-negative/40 bg-negativesubtle px-4 py-2 text-body-sm text-negative"
          : "sticky top-0 z-sticky border-b border-warning/40 bg-warningsubtle px-4 py-2 text-body-sm text-warning"
      }
    >
      <strong className="font-medium">{f.configStale ? "Model config mismatch." : "Data may be stale."}</strong>{" "}
      {config}
    </div>
  );
}
