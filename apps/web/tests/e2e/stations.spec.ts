import { expect, test } from "@playwright/test";
import { stationIds } from "../../src/game/config/stations";
import { stationNames } from "../../src/i18n/game";
import { command } from "../helpers/stations";

test("all seven stations have contextual Persian popups; WC releases on stop and the music task keeps alerts available", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-friend=barbod]").click();
  await page.getByRole("button", { name: "مکث", exact: true }).click();
  for (const id of stationIds) {
    await page.locator(`[data-station="${id}"]`).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toHaveAccessibleName("باربد · " + stationNames[id]);
    await expect(
      modal.locator("button[data-action]:enabled").first(),
    ).toBeVisible();
    await modal.getByRole("button", { name: "بازگشت", exact: true }).click();
  }
  await page.getByRole("button", { name: "ادامهٔ بازی" }).click();
  await command(page, "parham", "station.wc", "guest_wc");
  await page.locator("[data-friend=barbod]").click();
  await expect(page.locator('[data-station="station.wc"]')).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.locator("[data-friend=parham]").click();
  await page.getByRole("button", { name: "توقف کار" }).click();
  await page.locator("[data-friend=barbod]").click();
  await expect(page.locator('[data-station="station.wc"]')).toHaveAttribute(
    "aria-disabled",
    "false",
  );
  await command(page, "barbod", "station.music", "music_quiet");
  await expect(page.locator("#command-status")).toContainText("قطع موسیقی");
  await expect(page.locator("#command-status")).not.toContainText(
    "قطع موسیقی",
    { timeout: 10000 },
  );
  await page.getByLabel("تنظیمات صدا").click();
  await expect(
    page.getByRole("slider", { name: "بلندی هشدارها" }),
  ).toBeVisible();
});
