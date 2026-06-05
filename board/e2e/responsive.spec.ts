import { test, expect } from "@playwright/test";

test.describe("Escrowa Responsive Layout Tests", () => {
  const viewports = [
    { name: "Mobile", width: 375, height: 667 },
    { name: "Tablet", width: 768, height: 1024 },
    { name: "Desktop", width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`loads correctly on ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");

      // Verify header branding matches viewport
      const brand = page.locator("header").getByText("Escrowa");
      await expect(brand).toBeVisible();

      // Check if there is any horizontal scrollbar
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(overflow).toBe(false);
    });
  }
});
