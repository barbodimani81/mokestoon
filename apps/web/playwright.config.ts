import { defineConfig, devices } from "@playwright/test";

const chromium = { executablePath: process.env.CHROME_BIN };

export default defineConfig({
  timeout: 90000,
  workers: 3,
  testDir: "./tests/e2e",
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"], launchOptions: chromium } },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], launchOptions: chromium },
    },
    { name: "iphone", use: { ...devices["iPhone 13"] } },
  ],
  use: {
    baseURL: "http://127.0.0.1:4173",
  },
  webServer: {
    command:
      "npm exec -- vite preview --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
  },
});
