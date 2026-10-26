import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2022",
    manifest: true,
    // ECharts is ~206 kB gzipped and only loads with the chart routes; the
    // 500 kB default would warn on a deliberately lazy chunk.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // tslib is shared by the app shell (Radix scroll lock) and ECharts.
        // Without its own chunk Rollup parks it inside the ECharts vendor
        // chunk, which would make the entry statically import all of
        // ECharts (~203 kB gzip extra on first paint).
        manualChunks: (id) =>
          id.includes("/node_modules/tslib/")
            ? "tslib"
            : id.includes("/node_modules/echarts/") || id.includes("/node_modules/zrender/")
              ? "echarts"
              : undefined,
      },
    },
  },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8000" },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
    // e2e specs are Playwright's, not Vitest's; keep the two runners apart.
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
