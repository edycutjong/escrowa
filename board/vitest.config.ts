import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    exclude: ["**/node_modules/**", "**/e2e/**", "**/demo/**"],
    coverage: {
      provider: "v8",
      exclude: [
        "**/node_modules/**",
        "**/e2e/**",
        "**/demo/**",
        ".next/**",
        "out/**",
        "build/**",
        "eslint.config.mjs",
        "vitest.config.ts",
        "next.config.ts",
        "playwright.config.ts",
        "playwright.record.config.ts",
        "postcss.config.mjs",
        "src/app/providers.tsx",
        "src/wasm/escrow_contract.js",
        "src/app/globals.css",
        "**/*.d.ts",
        "**/*.test.ts",
        "**/*.test.tsx",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

