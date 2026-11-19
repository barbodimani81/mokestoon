import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  use: {
    baseURL: "http://127.0.0.1:4173",
    launchOptions: { executablePath: process.env.CHROME_BIN },
  },
  webServer: {
    command:
      "npm exec -- vite preview --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
  },
});
