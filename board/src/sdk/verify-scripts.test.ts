import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import path from "path";

describe("Verification Scripts E2E", () => {
  it("executes verify_release.ts successfully", () => {
    const scriptPath = path.resolve(__dirname, "../../../scripts/verify_release.ts");
    // Clear NODE_V8_COVERAGE to prevent the child process from interfering with Vitest's coverage collection
    const cleanEnv = { ...process.env };
    delete cleanEnv.NODE_V8_COVERAGE;
    const output = execSync(`npx --yes vite-node "${scriptPath}"`, {
      encoding: "utf8",
      env: cleanEnv,
    });
    expect(output).toContain("Success: Milestone released");
    expect(output).toContain("Security Audit: 0 keys leaked");
  });

  it("executes verify_no_unilateral.ts successfully", () => {
    const scriptPath = path.resolve(__dirname, "../../../scripts/verify_no_unilateral.ts");
    const cleanEnv = { ...process.env };
    delete cleanEnv.NODE_V8_COVERAGE;
    const output = execSync(`npx --yes vite-node "${scriptPath}"`, {
      encoding: "utf8",
      env: cleanEnv,
    });
    expect(output).toContain("Success: Unilateral release verification passed");
  });
});
