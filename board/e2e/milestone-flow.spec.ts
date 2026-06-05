import { test, expect } from "@playwright/test";

test.describe("Escrowa Milestone Settlement Flow", () => {
  test("submits client approval and triggers the enclave ReleaseVault takeover", async ({ page }) => {
    await page.goto("/");

    // 1. Reset and seed scenarios
    const seedBtn = page.getByRole("button", { name: "Reset & Seed Scenarios" });
    await expect(seedBtn).toBeVisible();
    await seedBtn.click();

    // 2. Select m1-happy milestone card
    const milestoneCard = page.getByText("m1-happy");
    await expect(milestoneCard).toBeVisible();
    await milestoneCard.click();

    // 3. Locate and click the Approve Payment button
    const approveBtn = page.getByRole("button", { name: "Attest Delivery" });
    // In m1-happy, freelancer has already attested, so we click "Approve Payment"
    const approvePaymentBtn = page.getByRole("button", { name: "Approve Payment" });
    await expect(approvePaymentBtn).toBeVisible();
    await approvePaymentBtn.click();

    // 4. Verify that the ReleaseVault modal is displayed
    const modalHeader = page.getByText("Milestone Released!");
    await expect(modalHeader).toBeVisible();

    const amountText = page.getByText("4,200 T3");
    await expect(amountText).toBeVisible();

    // 5. Dismiss the modal
    const backBtn = page.getByRole("button", { name: "Back to Dashboard" });
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // 6. Verify modal is closed
    await expect(modalHeader).not.toBeVisible();
  });
});
