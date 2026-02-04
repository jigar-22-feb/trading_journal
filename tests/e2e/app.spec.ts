import { expect, test } from "@playwright/test";

test("loads the trading journal dashboard", async ({ page }) => {
  page.on("pageerror", (err) => console.log("pageerror:", err.message));
  page.on("console", (msg) => console.log("console:", msg.type(), msg.text()));
  page.on("requestfailed", (req) =>
    console.log("requestfailed:", req.url(), req.failure()?.errorText)
  );
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "tests/e2e/artifacts/debug-dashboard.png", fullPage: true });
  await expect(
    page.getByRole("heading", { name: "Trading Journal" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "New Trade" })
  ).toBeVisible();
  await page.screenshot({ path: "tests/e2e/artifacts/dashboard.png", fullPage: true });
});

test("captures new trade form", async ({ page }) => {
  page.on("pageerror", (err) => console.log("pageerror:", err.message));
  page.on("console", (msg) => console.log("console:", msg.type(), msg.text()));
  page.on("requestfailed", (req) =>
    console.log("requestfailed:", req.url(), req.failure()?.errorText)
  );
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "tests/e2e/artifacts/debug-new-trade.png", fullPage: true });
  await page.getByRole("button", { name: "New Trade" }).click();
  await expect(
    page.locator("form").getByRole("button", { name: "Save Trade" }).first()
  ).toBeVisible();
  await page.screenshot({ path: "tests/e2e/artifacts/new-trade.png", fullPage: true });
});
