import { expect, test } from "@playwright/test";

test("preview loads without music, supports selection and recovers a connection", async ({
  page,
  isMobile,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let available = false;
  await page.route("**/api/v1/health/ready", (route) =>
    route.fulfill({
      status: available ? 200 : 503,
      json: { status: available ? "ready" : "unavailable" },
    }),
  );
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Barbod" })).toBeVisible();
  await expect(page.getByText("Unavailable", { exact: true })).toBeVisible();
  const select = page.getByRole("button", { name: "Parham" });
  if (isMobile) await select.tap();
  else {
    await select.focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByRole("heading", { name: "Parham" })).toBeVisible();
  await expect(select).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  available = true;
  await page.getByRole("button", { name: "Check connection" }).click();
  await expect(page.getByText("Ready", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
