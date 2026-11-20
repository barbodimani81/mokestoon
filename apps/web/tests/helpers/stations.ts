import { expect, type Page } from "@playwright/test";
import type { ActivityId } from "../../src/game/config/activities";
import type { CharacterId } from "../../src/game/config/character-assets";
import type { StationId } from "../../src/game/config/stations";

export async function command(
  page: Page,
  friend: CharacterId,
  station: StationId,
  action: ActivityId,
) {
  await page.locator(`[data-friend="${friend}"]`).click();
  await page.locator(`[data-station="${station}"]`).click();
  await page.getByRole("dialog").locator(`[data-action="${action}"]`).click();
}
export async function jelly(page: Page, reload = false) {
  await expect(page.locator(".request-bubble")).toHaveText("ژله می‌خوام");
  await command(page, "parsa", "station.food", "jelly_prepare");
  await expect(page.locator(".request-bubble")).toHaveAttribute(
    "data-state",
    "cooling",
    { timeout: 45000 },
  );
  if (reload) await page.reload();
  await expect(page.locator('[data-station="station.food"]')).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 15000 },
  );
  await command(page, "parsa", "station.food", "jelly_eat");
  await expect(page.locator(".request-bubble")).toHaveAttribute(
    "data-state",
    "completed",
    { timeout: 15000 },
  );
}
export async function balcony(page: Page) {
  await expect(page.locator("#request-detail")).toContainText("سیگار", {
    timeout: 25000,
  });
  await command(page, "mahan", "station.balcony", "iqos");
  await expect(page.locator(".request-bubble")).toHaveAttribute(
    "data-state",
    "in_progress",
    { timeout: 25000 },
  );
  await expect(page.locator(".request-bubble")).toHaveAttribute(
    "data-state",
    "completed",
    { timeout: 15000 },
  );
}
export async function purchaseTV(page: Page) {
  await page.getByRole("button", { name: "فروشگاه" }).click();
  await page.locator('[data-unlock="object.tv"]').click();
  await page.getByRole("button", { name: "تأیید خرید با فاز" }).click();
}
export async function ownedTV(page: Page) {
  await page.getByRole("button", { name: "فروشگاه" }).click();
  await expect(page.locator('[data-unlock="object.tv"]')).toContainText(
    "خریداری شده",
  );
  await page.getByRole("button", { name: "بستن", exact: true }).click();
}
