import { expect, test } from "@playwright/test";

test("request station restrictions, modal cancellation and keyboard selection recover", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "ژله می‌خوام", exact: true }).click();
  const food = page.locator('[data-station="station.food"]');
  await expect(page.locator("[data-available=true]")).toHaveCount(1);
  await expect(page.locator('[data-station="station.sleep"]')).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await food.focus();
  await food.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("پارسا · خوراکی");
  await expect(dialog.locator("[data-action]")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "لغو انتخاب" }).click();
  await expect(page.locator("[data-available=true]")).toHaveCount(0);
  await expect(page.locator(".request-bubble")).toHaveAttribute(
    "data-state",
    "pending",
  );
});
