import { expect, type Page, test } from "@playwright/test";
import { jelly } from "../helpers/stations";

// Observe the real master output and scheduled voices without substituting a
// player. Both decoding a silent file and only updating the HUD would fail.
declare global {
  interface Window {
    audioProbe: {
      meter?: AnalyserNode;
      peak: number;
      loops: number;
      notes: number[];
    };
  }
}
async function meter(page: Page) {
  await page.addInitScript(() => {
    const probe: Window["audioProbe"] = { peak: 0, loops: 0, notes: [] };
    window.audioProbe = probe;
    AudioNode.prototype.connect = new Proxy(AudioNode.prototype.connect, {
      apply(fn, source, args) {
        if (!(args[0] instanceof AudioDestinationNode))
          return Reflect.apply(fn, source, args);
        const analyser = source.context.createAnalyser() as AnalyserNode;
        probe.meter = analyser;
        Reflect.apply(fn, source, [analyser]);
        const samples = new Uint8Array(analyser.fftSize);
        function measure() {
          analyser.getByteTimeDomainData(samples);
          for (const v of samples)
            probe.peak = Math.max(probe.peak, Math.abs(v - 128));
          requestAnimationFrame(measure);
        }
        requestAnimationFrame(measure);
        return Reflect.apply(fn, analyser, args);
      },
    });
    AudioBufferSourceNode.prototype.start = new Proxy(
      AudioBufferSourceNode.prototype.start,
      {
        apply(fn, src, args) {
          if (src.loop && src.buffer?.duration > 30) probe.loops++;
          return Reflect.apply(fn, src, args);
        },
      },
    );
    OscillatorNode.prototype.start = new Proxy(OscillatorNode.prototype.start, {
      apply(fn, src, args) {
        probe.notes.push(Math.round(src.frequency.value));
        return Reflect.apply(fn, src, args);
      },
    });
  });
}
test("a gameplay gesture starts one music loop, the tab suspends and mute survives reload", async ({
  page,
}) => {
  await meter(page);
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes(".mp3")) requests.push(r.url());
  });
  await page.goto("/");
  const settings = page.getByLabel("تنظیمات صدا");
  await expect(settings).toBeVisible();
  expect(requests).toHaveLength(0);
  await page.locator("#apartment canvas").click();
  await settings.click();
  await expect(page.getByText("در حال پخش", { exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.peak))
    .toBeGreaterThan(1);
  expect(await page.evaluate(() => window.audioProbe.loops)).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.meter?.context.state))
    .toBe("suspended");
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.meter?.context.state))
    .toBe("running");
  const volume = page.getByRole("slider", { name: "بلندی موسیقی" });
  await volume.focus();
  await volume.press("Home");
  await expect(page.getByText("بلندی موسیقی صفر است")).toBeVisible();
  await page.getByRole("button", { name: "قطع صدا", exact: true }).click();
  await page.reload();
  await page.locator("#apartment canvas").click();
  await settings.click();
  await expect(page.getByText("صدا قطع است", { exact: true })).toBeVisible();
  await expect(volume).toHaveValue("0");
  expect(requests).toHaveLength(1);
  await page.getByRole("button", { name: "وصل کردن صدا", exact: true }).click();
  await expect(page.getByText("بلندی موسیقی صفر است")).toBeVisible();
  expect(await page.evaluate(() => window.audioProbe.loops)).toBe(0);
});

test("request chimes play with a missing music file and the track can be retried", async ({
  page,
}) => {
  await meter(page);
  await page.route("**/*.mp3", (r) => r.abort());
  await page.goto("/");
  const accept = page.locator(".request-bubble[data-state=pending]");
  await expect(accept).toBeVisible();
  const settings = page.getByLabel("تنظیمات صدا");
  await settings.click();
  await page.getByRole("button", { name: "فعال کردن صدا" }).click();
  await expect(page.getByText("موسیقی بارگذاری نشد.")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.peak))
    .toBeGreaterThan(1);
  expect(await page.evaluate(() => window.audioProbe.notes)).toEqual([
    659, 880,
  ]);
  await settings.click();
  await jelly(page);
  await expect(page.locator("#request-detail")).toContainText("انجام شد", {
    timeout: 20000,
  });
  expect(await page.evaluate(() => window.audioProbe.notes)).toEqual([
    659, 880, 523, 659, 784,
  ]);
  await page.unroute("**/*.mp3");
  await settings.click();
  await page.getByRole("button", { name: "تلاش دوباره برای پخش" }).click();
  await expect(page.getByText("در حال پخش", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.audioProbe.loops)).toBe(1);
});
