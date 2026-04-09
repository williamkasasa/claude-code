import { expect, test } from "@playwright/test";

test.describe("Research workbench flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Research tools" }).click();
    await expect(page.getByRole("heading", { name: "Research Workbench" })).toBeVisible();
  });

  test("retrieve, orchestrate, and reopen persisted history", async ({ page }) => {
    await page.getByRole("button", { name: "ISA-95 Retrieval" }).click();
    await page.getByRole("button", { name: "Retrieve research" }).click();
    await expect(page.getByText("Material genealogy and traceability")).toBeVisible();

    await page.getByRole("button", { name: "Orchestrate" }).click();
    await page.getByRole("button", { name: "Run orchestration" }).click();
    await expect(page.getByText("Recent orchestration runs")).toBeVisible();
    await expect(page.getByText("Prepared 3 research roles for model qwen2.5-coder:7b.").first()).toBeVisible();

    await page.getByRole("button", { name: "Close research workbench" }).click();
    await page.getByRole("button", { name: "Research tools" }).click();
    await page.getByRole("button", { name: "Orchestrate" }).click();
    await expect(page.getByText("Recent orchestration runs")).toBeVisible();
    await page.getByRole("button", { name: /Review the MES release flow for operator approvals and genealogy capture./ }).first().click();
    await expect(page.getByText("Persisted orchestration detail")).toBeVisible();
    await expect(page.getByText("Select provider adapter implementation.")).toBeVisible();
  });

  test("log slimming and heuristic HMI review stay advisory-only", async ({ page }) => {
    await page.getByRole("button", { name: "Log Slimming" }).click();
    await page.getByRole("button", { name: "Slim log" }).click();
    await expect(page.getByText("Batch=42 started by operator=anne")).toBeVisible();

    await page.getByRole("button", { name: "HMI Review" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "mixer-release-screen.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+lm3sAAAAASUVORK5CYII=",
        "base64"
      ),
    });
    await page.getByRole("button", { name: "Interpret screen" }).click();
    await expect(page.getByText("Adapter: heuristic")).toBeVisible();
    await expect(page.getByText("Do not recommend overrides or forced run actions while alarm context is incomplete.")).toBeVisible();
  });
});