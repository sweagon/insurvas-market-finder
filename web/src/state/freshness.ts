import { CATALOG_CONFIG_HASH, type BuildMeta } from "../data/types";

/** How long a build may serve before the UI warns that vintages have aged. */
export const STALE_AFTER_DAYS = 45;

export interface Freshness {
  stale: boolean;
  configStale: boolean;
  aged: boolean;
  ageDays: number;
  builtAt: Date | null;
}

/**
 * Compare the served dataset with the config the SPA was compiled with.
 *
 * `catalog.generated.json` carries the hash of config/metrics.yaml at export
 * time. If the data was built from a different config, the deployed frontend
 * and dataset disagree: show a banner instead of silently mixing definitions.
 */
export function dataFreshness(meta: BuildMeta | null | undefined): Freshness {
  const built = meta?.built_at ? new Date(meta.built_at) : null;
  const valid = built != null && Number.isFinite(built.getTime());
  const ageDays = valid ? (Date.now() - built.getTime()) / 86_400_000 : 0;
  const configStale = !!meta?.config_hash && meta.config_hash !== CATALOG_CONFIG_HASH;
  const aged = valid && ageDays > STALE_AFTER_DAYS;
  return { stale: configStale || aged, configStale, aged, ageDays, builtAt: valid ? built : null };
}
