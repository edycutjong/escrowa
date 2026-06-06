import { test, expect, Page } from "@playwright/test";

// Continuous, narrated-paced walkthrough that produces ONE demo video plus
// numbered screenshots for the YouTube demo. Output paths are absolute (DemoStudio
// convention — see DemoStudio/AGENTS.md: recording scripts use hardcoded paths).

const SHOTS = "/Users/edycu/Projects/DemoStudio/017_Escrowa/screenshots";

// Dwell helper so the camera lingers long enough for the voiceover.
const beat = (page: Page, ms = 1500) => page.waitForTimeout(ms);
const shot = (page: Page, name: string) =>
  page.screenshot({ path: `${SHOTS}/${name}.png` });

test("Escrowa — full demo walkthrough (video + screenshots)", async ({ page }) => {
  // ── Scene 1: The dashboard / identity ───────────────────────────────
  await page.goto("/");
  await expect(page.locator("header").getByText("Escrowa", { exact: true })).toBeVisible();
  await beat(page, 2500);
  await shot(page, "01-hero-dashboard");

  // ── Scene 2: Seed the deterministic scenarios ──────────────────────
  await page.getByRole("button", { name: /Seed/ }).click();
  await expect(page.locator("span").getByText("m1-happy", { exact: true })).toBeVisible();
  await beat(page, 2500);
  await shot(page, "02-seeded-scenarios");

  // ── Scene 3: Happy path — dual attestation → release (the money shot) ─
  await page.locator("span").getByText("m1-happy", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Approve Payment" })).toBeVisible();
  await beat(page, 2500);
  await shot(page, "03-m1-execution-timeline");

  await page.getByRole("button", { name: "Approve Payment" }).click();
  await expect(page.getByText("Milestone Released!")).toBeVisible({ timeout: 15000 });
  await beat(page, 1800);
  await shot(page, "04-releasevault-moneyshot");
  await beat(page, 2500);
  await dismissVault(page);

  // ── Scene 4: Ghost path — deadline fallback auto-release ────────────
  await page.locator("span").getByText("m2-ghost", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Resolve Deadline (Release)" })).toBeVisible();
  await beat(page, 2000);
  await shot(page, "05-m2-deadline-fallback");
  await page.getByRole("button", { name: "Resolve Deadline (Release)" }).click();
  await expect(page.getByText("Milestone Released!")).toBeVisible({ timeout: 15000 });
  await beat(page, 2200);
  await shot(page, "06-deadline-release");
  await dismissVault(page);

  // ── Scene 5: Dispute path — arbiter refund (tokens back to client) ──
  await page.locator("span").getByText("m3-dispute", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Arbiter Refund" })).toBeVisible();
  await beat(page, 2000);
  await shot(page, "07-m3-dispute");
  await page.getByRole("button", { name: "Arbiter Refund" }).click();
  await expect(page.locator("span").getByText("m3-dispute", { exact: true })).toBeVisible();
  await beat(page, 2200);
  await shot(page, "08-arbiter-refund-settled");

  // ── Scene 6: Final dashboard state (payouts settled) ───────────────
  await page.mouse.move(960, 0); // move cursor out of the way
  await beat(page, 2000);
  await shot(page, "09-final-dashboard");
  await beat(page, 1500);
});

// The ReleaseVault takeover auto-dismisses after ~6s; click "Back to Dashboard"
// if it's still up so the next scene starts clean.
async function dismissVault(page: Page) {
  const back = page.getByRole("button", { name: "Back to Dashboard" });
  if (await back.isVisible().catch(() => false)) {
    await back.click();
  }
  await expect(page.getByText("Milestone Released!")).toBeHidden();
  await page.waitForTimeout(800);
}
