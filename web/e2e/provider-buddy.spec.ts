import { test, expect } from "@playwright/test";

test.describe("Provider switching and Buddy panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.goto("/");
  });

  test("switch provider updates model default", async ({ page }) => {
    await page.getByRole("banner").getByRole("button", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.getByRole("button", { name: "API & Auth" }).click();
    await page.getByRole("combobox", { name: "Provider" }).selectOption("openai");
    await expect(page.getByText("Direct hosted OpenAI chat-completions endpoint")).toBeVisible();
    await expect(page.getByRole("banner").getByRole("combobox", { name: "Model" })).toHaveValue(
      "gpt-4.1-mini"
    );
  });

  test("open buddy panel and insert risk check", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Chat" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open buddy panel" })).toBeVisible();
    await page.getByRole("button", { name: "Open buddy panel" }).first().click();
    await expect(page.getByText("Visible advisory companion")).toBeVisible();
    await page.locator("div.fixed.inset-0").getByRole("button", { name: /Risk check/ }).click();
    await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue(
      /top 3 operational risks/i
    );
  });
});
