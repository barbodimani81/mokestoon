import { expect, test } from "@playwright/test";
import { characterIds } from "../../src/game/config/character-assets";
import { Movement } from "../../src/game/systems/movement";
import { command } from "../helpers/stations";

test("all five resident names are painted at readable size and can be selected on the map", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  for (const id of characterIds) {
    const tag = page.locator(`[data-friend="${id}"]`);
    await expect(tag).toBeVisible();
    if (isMobile) await tag.tap();
    else await tag.click();
    await expect(tag).toHaveAttribute("aria-pressed", "true");
    expect((await tag.boundingBox())?.width).toBeGreaterThanOrEqual(42);
  }
});

const coats = {
  barbod: 0xb72e39,
  kavian: 0x526f8a,
  mahan: 0xbbc0c5,
  parsa: 0x798b57,
  parham: 0x393841,
};

test("five painted bodies are directly selectable and the request and furniture icons focus their actions", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  const canvas = page.locator("#apartment canvas");
  await expect(page.locator("[data-friend]").first()).toBeVisible();
  const tap = (x: number, y: number) =>
    isMobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
  const movement = new Movement();
  for (const actor of movement.actors) {
    // Count each outfit's actual painted pixels near its spawn. Neither a
    // nameplate, an invisible sprite nor an unplaced atlas can satisfy this.
    const body = await canvas.evaluate(
      (node, { position, color }) => {
        const c = node as HTMLCanvasElement,
          ctx = c.getContext("2d");
        if (!ctx) throw new Error("Missing canvas");
        const box = c.getBoundingClientRect(),
          scale = box.width / c.width;
        const x = Math.max(0, Math.floor(position.x - 19 / scale)),
          y = Math.max(0, Math.floor(position.y - 58 / scale));
        const w = Math.min(c.width - x, Math.ceil(38 / scale));
        const h = Math.min(
          c.height - y,
          Math.ceil(position.y - y + 10 / scale),
        );
        const { data } = ctx.getImageData(x, y, w, h);
        // Indexed PNG antialiasing may shift a swatch by a few RGB levels.
        const near = (i: number, r: number, g: number, b: number) =>
          Math.abs(data[i] - r) <= 4 &&
          Math.abs(data[i + 1] - g) <= 4 &&
          Math.abs(data[i + 2] - b) <= 4;
        let coat = 0,
          sumX = 0,
          sumY = 0,
          top = h,
          bottom = 0;
        for (let i = 0; i < data.length; i += 4) {
          const u = (i / 4) % w,
            v = Math.floor(i / (4 * w));
          if (near(i, color >> 16, (color >> 8) & 255, color & 255)) {
            coat++;
            sumX += u;
            sumY += v;
          }
          if (near(i, 255, 242, 212)) {
            top = Math.min(top, v);
            bottom = Math.max(bottom, v);
          }
        }
        return {
          area: coat * scale * scale,
          height: (bottom - top) * scale,
          x: box.x + (x + sumX / coat) * scale,
          y: box.y + (y + sumY / coat) * scale,
        };
      },
      { position: actor.position, color: coats[actor.id] },
    );
    expect(body.area, actor.id).toBeGreaterThan(8);
    expect(body.height, actor.id).toBeGreaterThan(35);
    await tap(body.x, body.y);
    await expect(page.locator(`[data-friend="${actor.id}"]`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }

  await page.locator('[data-station="station.sleep"]').click();
  await expect(page.locator('[data-action="rest"] svg')).toBeVisible();
});

test("dancing changes the painted figure at the hall anchor", async ({
  page,
}) => {
  await page.goto("/");
  await command(page, "barbod", "station.entertainment", "dance");
  const canvas = page.locator("#apartment canvas");
  const pose = () =>
    canvas.evaluate((node, position) => {
      const c = node as HTMLCanvasElement,
        ctx = c.getContext("2d");
      if (!ctx) throw new Error("Missing canvas");
      const scale = c.getBoundingClientRect().width / c.width;
      const w = Math.ceil(44 / scale),
        h = Math.ceil(66 / scale);
      const { data } = ctx.getImageData(
        Math.floor(position.x - w / 2),
        Math.floor(position.y - h),
        w,
        h,
      );
      let total = 0,
        pixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (
          Math.abs(data[i] - 0xb7) <= 4 &&
          Math.abs(data[i + 1] - 0x2e) <= 4 &&
          Math.abs(data[i + 2] - 0x39) <= 4
        ) {
          total += (i / 4) % w;
          pixels++;
        }
      }
      return pixels ? (total * scale) / pixels : 0;
    }, new Movement().actor("barbod").position);
  const start = await pose();
  expect(start).toBeGreaterThan(0);
  await expect
    .poll(async () => Math.abs((await pose()) - start), {
      intervals: [80, 100, 125],
      timeout: 3000,
    })
    .toBeGreaterThan(1.1);
});
