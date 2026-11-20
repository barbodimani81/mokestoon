import { expect, test } from "@playwright/test";
import { command } from "../helpers/stations";

test("a completed dishwashing task and household state survive reload", async ({
  page,
}) => {
  await page.goto("/");
  await command(page, "kavian", "station.cleaning", "dishes");
  await expect(page.locator("#household")).toContainText("ظرف کثیف ۱", {
    timeout: 19000,
  });
  await page.reload();
  await expect(page.locator("#household")).toContainText("ظرف کثیف ۱");
});
