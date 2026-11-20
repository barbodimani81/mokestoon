import { expect, test } from "@playwright/test";
import { apartment } from "../../src/game/map/apartment";

test("the fixed camera keeps the full drawing on screen after rotation", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  const button = page.getByRole("button", { name: "جزئیات نقشه" });
  await expect(button).toBeEnabled();
  if (isMobile) await button.tap();
  else {
    await button.focus();
    await button.press("Space");
  }
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("درگاه‌ها", { exact: true })).toBeVisible();

  for (const viewport of [
    { width: 375, height: 667 },
    { width: 667, height: 375 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(async () => {
        const canvas = await page.locator("#apartment canvas").boundingBox();
        const stage = await page.locator("#apartment").boundingBox();
        if (!canvas || !stage) return false;
        const scale = Math.min(
          stage.width / apartment.width,
          stage.height / apartment.height,
        );
        return (
          Math.abs(canvas.width - scale * apartment.width) < 2 &&
          Math.abs(canvas.height - scale * apartment.height) < 2 &&
          canvas.x >= stage.x - 1 &&
          canvas.y >= stage.y - 1 &&
          canvas.x + canvas.width <= stage.x + stage.width + 1 &&
          canvas.y + canvas.height <= stage.y + stage.height + 1 &&
          stage.x >= 0 &&
          stage.x + stage.width <= viewport.width &&
          stage.y + stage.height <= viewport.height
        );
      })
      .toBe(true);
  }
});

test("a missing runtime image displays a recoverable error", async ({
  page,
}) => {
  await page.route("**/*.webp", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("#map-status")).toContainText("بارگذاری نشد");
  await expect(
    page.getByRole("button", { name: "جزئیات نقشه" }),
  ).toBeDisabled();
  await page.unroute("**/*.webp");
  await page.reload();
  await expect(page.getByRole("button", { name: "جزئیات نقشه" })).toBeEnabled();
});
