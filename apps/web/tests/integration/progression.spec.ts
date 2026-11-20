import { expect, test } from "@playwright/test";
import { balcony, jelly, ownedTV, purchaseTV } from "../helpers/stations";

test("an offline completion syncs once and a purchase survives reload", async ({
  page,
}) => {
  await page.goto("/");
  const shop = page.getByRole("region", { name: "پیشرفت" });
  await expect(page.locator("#progression strong")).toBeVisible();
  await expect(shop).toContainText("فاز ۰ · امتیاز F7 ۰");

  await page.getByRole("button", { name: "فروشگاه" }).click();
  await page.locator('[data-unlock="object.tv"]').click();
  await expect(page.getByRole("dialog")).toContainText("فاز کافی نداری");
  await expect(
    page.getByRole("button", { name: "تأیید خرید با فاز" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "بستن", exact: true }).click();
  await page.route("**/api/v1/game-events/batch", (r) => r.abort());
  await jelly(page);
  await expect(shop).toContainText("۱ در انتظار تأیید", { timeout: 20000 });
  await page.unroute("**/api/v1/game-events/batch");
  await shop.getByRole("button", { name: "همگام‌سازی", exact: true }).click();
  await expect(shop).toContainText("فاز ۵ · امتیاز F7 ۳ · ۰ در انتظار تأیید");
  await expect(shop).toContainText("پاداش تأیید شد · ۵ فاز");
  await balcony(page);
  await expect(shop).toContainText("فاز ۱۰ · امتیاز F7 ۶", { timeout: 25000 });
  await purchaseTV(page);
  await expect(shop).toContainText("فاز ۰ · امتیاز F7 ۶");
  await page.reload();
  await ownedTV(page);
  await expect(shop).toContainText("فاز ۰ · امتیاز F7 ۶ · ۰ در انتظار تأیید");
});
