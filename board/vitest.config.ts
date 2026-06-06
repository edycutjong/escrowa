import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
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
        "src/wasm/escrow_contract.js",
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

