import { randomUUID } from "node:crypto";
import { type APIRequestContext, expect, test } from "@playwright/test";
import { balcony, jelly, ownedTV, purchaseTV } from "../helpers/stations";

async function linkFromInbox(
  http: APIRequestContext,
  email: string,
  purpose: string,
) {
  const inbox = process.env.F7_TEST_INBOX;
  if (!inbox) throw new Error("The account test requires the local SMTP inbox");
  let link = "";
  await expect
    .poll(async () => {
      const list = await http.get(`${inbox}/api/v1/messages?limit=100`);
      const { messages } = (await list.json()) as {
        messages: { ID: string; To: { Address: string }[] }[];
      };
      for (const m of messages.filter((m) =>
        m.To.some((t) => t.Address === email),
      )) {
        const detail = await http.get(`${inbox}/api/v1/message/${m.ID}`);
        const { Text } = (await detail.json()) as { Text: string };
        link =
          Text.split(/\s+/).find((word) =>
            word.includes(`/account.html#${purpose}=`),
          ) ?? "";
        if (link) break;
      }
      return Boolean(link);
    })
    .toBe(true);
  return link;
}
test("verified sign-in restores guest progress on a clean browser and recovery revokes old sessions", async ({
  page,
  browser,
  baseURL,
  request,
}) => {
  const email = `${randomUUID()}@example.test`,
    password = randomUUID(),
    changed = randomUUID();
  await page.goto("/");
  await expect(page.locator("#progression strong")).toBeVisible();
  await jelly(page);
  const shop = page.getByRole("region", { name: "پیشرفت" });
  await expect(shop).toContainText("فاز ۵ · امتیاز F7 ۳", { timeout: 25000 });
  await balcony(page);
  await expect(shop).toContainText("فاز ۱۰ · امتیاز F7 ۶", { timeout: 25000 });
  await purchaseTV(page);
  await expect(shop).toContainText("فاز ۰ · امتیاز F7 ۶");
  await page.getByRole("button", { name: "ذخیرهٔ پشتیبان" }).click();
  await expect(
    page.getByRole("region", { name: "پشتیبان آپارتمان" }),
  ).toContainText("نسخهٔ ۱");
  await page.getByRole("link", { name: "حساب کاربری", exact: true }).click();
  await page.getByRole("button", { name: "ایجاد حساب جدید" }).click();
  await page.getByLabel("ایمیل", { exact: true }).fill(email);
  await page.getByRole("button", { name: "ارسال ایمیل تأیید" }).click();
  await expect(page.getByRole("status")).toContainText("پیوند تأیید");
  await page.goto(await linkFromInbox(request, email, "verify"));
  await page.getByLabel("رمز عبور", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ساخت حساب", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(email);
  await page.getByText("رتبه‌بندی دوستان", { exact: true }).click();
  await expect(page.locator("#rankings")).toContainText(
    "رتبه‌بندی دوستان فعال نیست",
  );
  for (const scope of ["group", "global"]) {
    const blocked = await page.request.get(
      `/api/v1/leaderboard?scope=${scope}`,
    );
    expect(blocked.status()).toBe(403);
    expect(await blocked.json()).not.toHaveProperty("entries");
  }
  await page.getByText("رتبه‌بندی دوستان", { exact: true }).click();
  const nickname = `Friend ${randomUUID().slice(0, 8)}`;
  await page.getByLabel("نام نمایشی").fill(nickname);
  await page.getByRole("button", { name: "ذخیرهٔ نام نمایشی" }).click();
  await expect(page.getByRole("status")).toContainText("نام نمایشی ذخیره شد");
  await page.getByRole("link", { name: "ورود به آپارتمان" }).click();
  await expect(shop).toContainText("فاز ۰ · امتیاز F7 ۶");
  const fresh = await browser.newContext({ baseURL });
  try {
    const second = await fresh.newPage();
    await second.goto("/account.html");
    await second.getByLabel("ایمیل", { exact: true }).fill(email);
    await second.getByLabel("رمز عبور", { exact: true }).fill(password);
    await second.getByRole("button", { name: "ورود", exact: true }).click();
    await expect(second.getByLabel("نام نمایشی")).toHaveValue(nickname);
    // An expired access cookie must recover via this browser's refresh session.
    await fresh.clearCookies({ name: "f7_access" });
    await second.getByRole("link", { name: "ورود به آپارتمان" }).click();
    await expect(second.getByRole("region", { name: "پیشرفت" })).toContainText(
      "فاز ۰ · امتیاز F7 ۶",
    );
    await ownedTV(second);
    await second.getByRole("button", { name: "بازیابی پشتیبان" }).click();
    await second
      .getByRole("button", { name: "جایگزینی آپارتمان این دستگاه" })
      .click();
    await expect(
      second.getByRole("region", { name: "پشتیبان آپارتمان" }),
    ).toContainText("پشتیبان نسخهٔ ۱ بازیابی شد");
    await second
      .getByRole("link", { name: "حساب کاربری", exact: true })
      .click();
    await second
      .getByRole("button", { name: "خروج از حساب", exact: true })
      .click();
    await second.getByRole("button", { name: "فراموشی رمز عبور" }).click();
    await second.getByLabel("ایمیل", { exact: true }).fill(email);
    await second.getByRole("button", { name: "ارسال ایمیل بازیابی" }).click();
    await second.goto(await linkFromInbox(request, email, "reset"));
    await second.getByLabel("رمز عبور", { exact: true }).fill(changed);
    await second.getByRole("button", { name: "ثبت رمز جدید" }).click();
    await expect(second.getByRole("status")).toContainText(email);
    await page.goto("/account.html");
    await expect(
      page.getByRole("button", { name: "ورود", exact: true }),
    ).toBeVisible();
  } finally {
    await fresh.close();
  }
});
