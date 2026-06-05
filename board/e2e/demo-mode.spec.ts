import { test, expect } from "@playwright/test";

test.describe("Escrowa Smoke Tests", () => {
  test("successfully loads home page and checks title metadata", async ({ page }) => {
    await page.goto("/");
    
    // Validate title tag
    await expect(page).toHaveTitle(/Escrowa/);
    
    // Check that branding logo is present
    const logo = page.locator("header").getByText("Escrowa");
    await expect(logo).toBeVisible();

    // Check that TEE Enclave badge exists
    const badge = page.getByText("did:t3n:escrowa_enclave");
    await expect(badge).toBeVisible();
  });
});
