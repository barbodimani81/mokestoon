import { expect, test } from "@playwright/test";

test("the rankings panel paginates, recovers from changed standings and explains a lost connection", async ({
  page,
}) => {
  // UI contract fixtures only. Cross-account sharing is disabled on the playtest.
  await page.route("**/api/v1/catalog/unlocks", (route) =>
    route.fulfill({
      json: { development: true, email_accounts: true, unlocks: [] },
    }),
  );
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({
      json: {
        player_id: "00000000-0000-4000-b000-000000000001",
        email: "friend@example.test",
        display_name: "Friend",
      },
    }),
  );
  let state: "first" | "changed" | "fresh" | "empty" | "offline" = "first";
  await page.route("**/api/v1/leaderboard?**", (route) => {
    const cursor = new URL(route.request().url()).searchParams.get("cursor");
    if (state === "offline") return route.abort();
    if (state === "changed" && cursor)
      return route.fulfill({
        status: 409,
        json: {
          error: {
            code: "RANKINGS_CHANGED",
            message: "Standings changed. Refresh to see the latest ranks.",
          },
        },
      });
    if (state === "empty") return route.fulfill({ json: { entries: [] } });
    if (cursor)
      return route.fulfill({
        json: { entries: [{ rank: 2, display_name: null, f7_score: 6 }] },
      });
    return route.fulfill({
      json: {
        entries: [
          {
            rank: 1,
            display_name: "Friend",
            f7_score: state === "fresh" ? 12 : 9,
          },
        ],
        next_cursor: "next",
      },
    });
  });
  await page.goto("/account.html");
  const panel = page.locator("#rankings"),
    toggle = panel.locator("summary");
  await toggle.click();
  await expect(
    panel.getByRole("cell", { name: "۹", exact: true }),
  ).toBeVisible();
  state = "changed";
  await panel.getByRole("button", { name: "رتبه‌های بیشتر" }).click();
  await expect(panel).toContainText("رتبه‌ها تغییر کردند");
  await expect(panel.getByRole("table")).toBeHidden();
  state = "fresh";
  await panel.getByRole("button", { name: "به‌روزرسانی رتبه‌ها" }).click();
  await panel.getByRole("button", { name: "رتبه‌های بیشتر" }).click();
  await expect(panel.getByRole("row")).toHaveCount(3);
  await expect(panel.getByRole("cell", { name: "بازیکن بی‌نام" })).toBeVisible();
  await toggle.click();
  state = "empty";
  await toggle.click();
  await expect(panel).toContainText("هنوز بازیکنی");
  await toggle.click();
  state = "offline";
  await toggle.click();
  await expect(panel).toContainText("به اینترنت وصل شو");
});
