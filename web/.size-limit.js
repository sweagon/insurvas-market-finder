import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * size-limit configuration.
 *
 * The "initial JS" budget is measured from the Vite build manifest rather
 * than a filename glob: Rollup names shared chunks after the module they
 * contain, so a glob like `dist/assets/index-*.js` also matches chunks that
 * are only fetched on demand (lazy dialogs, sliders) and would overstate
 * what a first-time visitor downloads.
 */

const MANIFEST = "dist/.vite/manifest.json";

/**
 * Every JS chunk the browser must download to render the first page: the
 * entry chunk plus its transitive static imports. Dynamic imports are
 * excluded because they are fetched on interaction, not on first paint.
 */
function initialJsChunks() {
  const manifestPath = resolve(MANIFEST);
  if (!existsSync(manifestPath)) {
    throw new Error(
      `size-limit: ${MANIFEST} not found. Run \`npm run build\` before \`npm run size\`.`,
    );
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const entryKey = Object.keys(manifest).find(
    (key) => manifest[key].isEntry && manifest[key].file.endsWith(".js"),
  );
  if (!entryKey) {
    throw new Error("size-limit: no JS entry chunk found in the Vite manifest.");
  }
  const seen = new Set();
  const visit = (key) => {
    if (seen.has(key)) return;
    seen.add(key);
    for (const dependency of manifest[key]?.imports ?? []) visit(dependency);
  };
  visit(entryKey);
  return [...seen].map((key) => `dist/${manifest[key].file}`);
}

export default [
  {
    name: "initial JS (gzip)",
    path: initialJsChunks(),
    limit: "100 kB",
    gzip: true,
  },
  {
    name: "rankings payload (gzip)",
    path: "public/data/rankings.json",
    limit: "600 kB",
    gzip: true,
  },
  {
    name: "map topology (gzip)",
    path: "public/data/topo.json",
    limit: "500 kB",
    gzip: true,
  },
];
