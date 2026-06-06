import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import path from "path";

describe("Verification Scripts E2E", () => {
  it("executes verify_release.ts successfully", () => {
    const scriptPath = path.resolve(__dirname, "../../../scripts/verify_release.ts");
    const output = execSync(`npx vite-node "${scriptPath}"`, { encoding: "utf8" });
    expect(output).toContain("Success: Milestone released");
    expect(output).toContain("Security Audit: 0 keys leaked");
  });

  it("executes verify_no_unilateral.ts successfully", () => {
    const scriptPath = path.resolve(__dirname, "../../../scripts/verify_no_unilateral.ts");
    const output = execSync(`npx vite-node "${scriptPath}"`, { encoding: "utf8" });
    expect(output).toContain("Success: Unilateral release verification passed");
  });
});
