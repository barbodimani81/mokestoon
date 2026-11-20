import { expect, test } from "@playwright/test";
import { balcony, jelly } from "../helpers/stations";

test("jelly survives a cooling reload and a second command; Mahan chooses IQOS at the balcony", async ({
  page,
}) => {
  await page.goto("/");
  await jelly(page, true);
  await balcony(page);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  expect(
    await page.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.check("14px Vazirmatn", "پارسا");
    }),
  ).toBe(true);
});
