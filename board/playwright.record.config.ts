import { defineConfig, devices } from "@playwright/test";

// Dedicated config for producing the YouTube demo recording + screenshots.
// Kept separate from playwright.config.ts so `npm run e2e` (the test suite) is untouched.
// Run with:  npm run demo:record
// Outputs video to /Users/edycu/Projects/DemoStudio/017_Escrowa/recordings
// and screenshots to .../017_Escrowa/screenshots (written by the spec itself).

const DEMO_OUT = "/Users/edycu/Projects/DemoStudio/017_Escrowa/recordings";

export default defineConfig({
  testDir: "./demo",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 180_000,
  outputDir: DEMO_OUT,
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    video: { mode: "on", size: { width: 1920, height: 1080 } },
    launchOptions: { slowMo: 350 }, // make interactions readable on camera
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Record against the dev server (reliable in-memory state); the Next.js dev
  // indicator is hidden via `devIndicators: false` in next.config.ts.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
