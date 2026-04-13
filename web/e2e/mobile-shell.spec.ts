import { expect, test } from "@playwright/test";

test("mobile shell supports drawer navigation, settings, buddy, research, chat, and file preview", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto("/");

  await expect(page.getByRole("button", { name: "Open sidebar" })).toBeVisible();
  await expect(page.getByLabel("Open settings").first()).toBeVisible();
  await expect(page.getByLabel("Open buddy panel").first()).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();

  await page.getByLabel("Open settings").first().click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.getByRole("button", { name: "Close settings" }).click();

  await page.getByLabel("Open buddy panel").first().click();
  await expect(page.getByText("Visible advisory companion")).toBeVisible();
  await page.getByRole("button", { name: "Close buddy panel" }).click();

  await page.getByRole("button", { name: "Open sidebar" }).click();
  const drawer = page.getByRole("dialog", { name: "Navigation" });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("button", { name: "Research tools" }).click();
  await expect(page.getByRole("heading", { name: "Research Workbench" })).toBeVisible();
  await page.getByRole("button", { name: "Close research workbench" }).click();

  await page.getByRole("button", { name: "Open sidebar" }).click();
  await drawer.getByRole("button", { name: "Files" }).click();
  await expect(drawer.getByText("Workspace root", { exact: true })).toBeVisible();
  await expect(page.getByText(/Loading files/)).not.toBeVisible({ timeout: 10000 });
  await expect(drawer.getByRole("button", { name: "buddy", exact: true })).toBeVisible({ timeout: 10000 });
  await drawer.getByRole("button", { name: "buddy", exact: true }).click();
  await drawer.getByRole("button", { name: "companion.ts" }).click();
  await expect(page.getByRole("dialog", { name: "companion.ts" })).toBeVisible();
  await expect(page.getByText("companionUserId")).toBeVisible();
  await page.getByRole("button", { name: "Close file viewer" }).click();

  await page.getByRole("textbox", { name: "Message" }).fill("mobile buddy status");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("button", { name: "Stop generation" })).not.toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/AG-Claw research reply via .*: mobile buddy status/)).toBeVisible();
});