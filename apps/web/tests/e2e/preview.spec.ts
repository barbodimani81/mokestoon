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
  await expect(page.locator("[data-friend]").first()).toBeVisible();
  await page.getByRole("link", { name: "نمایش شخصیت‌ها" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByRole("heading", { name: "باربد" })).toBeVisible();
  await expect(page.getByText("در دسترس نیست", { exact: true })).toBeVisible();
  const select = page.getByRole("button", { name: "پرهام" });
  if (isMobile) await select.tap();
  else {
    await select.focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByRole("heading", { name: "پرهام" })).toBeVisible();
  await expect(page.getByText("تصویر موقت شخصیت")).toBeVisible();
  const pose = page.getByRole("combobox", { name: "حالت بدن" });
  await pose.selectOption({ label: "واکنش · جنوب" });
  await expect(pose).toHaveValue("parham.react.south");
  await expect(select).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  available = true;
  await page.getByRole("button", { name: "بررسی اتصال" }).click();
  await expect(page.getByText("آماده", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("reduced motion displays a still gesture in the character preview", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/characters.html");
  await expect(page.getByRole("heading", { name: "باربد" })).toBeVisible();
  const canvas = page.locator("#stage canvas");
  const capture = () =>
    canvas.evaluate(async (node) => {
      await new Promise(requestAnimationFrame);
      return (node as HTMLCanvasElement).toDataURL();
    });
  const idle = await capture();
  await page
    .getByRole("combobox", { name: "حالت بدن" })
    .selectOption("barbod.dance.south");
  await expect.poll(async () => (await capture()) !== idle).toBe(true);
  const dance = await capture();
  // Cover more than two dance-frame intervals at the authored 185 ms cadence.
  await page.evaluate(
    () => new Promise((resolve) => window.setTimeout(resolve, 450)),
  );
  expect((await capture()) === dance).toBe(true);
});
