import { expect, test } from "@playwright/test";
import { command } from "../helpers/stations";

test("a stale device can keep its apartment or explicitly restore the newer backup", async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto("/");
  await expect(page.locator("#progression strong")).toBeVisible();
  await command(page, "kavian", "station.cleaning", "dishes");
  await expect(page.locator("#household")).toContainText("ظرف کثیف ۱", {
    timeout: 19000,
  });
  await page.getByRole("button", { name: "ذخیرهٔ پشتیبان" }).click();
  const panel = page.getByRole("region", { name: "پشتیبان آپارتمان" });
  await expect(panel).toContainText("نسخهٔ ۱");
  const device = await browser.newContext({ baseURL });
  try {
    // Supply the same development principal without sharing IndexedDB.
    await device.addCookies(await page.context().cookies());
    const second = await device.newPage();
    await second.goto("/");
    const other = second.getByRole("region", { name: "پشتیبان آپارتمان" });
    await other.getByRole("button", { name: "ذخیرهٔ پشتیبان" }).click();
    await expect(other).toContainText("پشتیبان تازه‌تری");
    await other.getByRole("button", { name: "بازیابی پشتیبان" }).click();
    await other
      .getByRole("button", { name: "نگه داشتن آپارتمان این دستگاه" })
      .click();
    await expect(second.locator("#household")).toContainText("ظرف کثیف ۲");
    await other.getByRole("button", { name: "بازیابی پشتیبان" }).click();
    await other
      .getByRole("button", { name: "جایگزینی آپارتمان این دستگاه" })
      .click();
    await expect(other).toContainText("پشتیبان نسخهٔ ۱ بازیابی شد");
    await expect(second.locator("#household")).toContainText("ظرف کثیف ۱");
    await other.getByRole("button", { name: "ذخیرهٔ پشتیبان" }).click();
    await expect(other).toContainText("نسخهٔ ۲");
    await panel.getByRole("button", { name: "ذخیرهٔ پشتیبان" }).click();
    await expect(panel).toContainText("پشتیبان تازه‌تری");
  } finally {
    await device.close();
  }
});
