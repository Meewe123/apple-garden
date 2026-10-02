import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const PREFIX = "/apple-garden/";

// Use an already installed Chromium when one is provided (e.g. in a sandbox
// without network access); otherwise Playwright's own browser is used.
const executablePath = process.env.CHROMIUM_PATH;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}${PREFIX}`,
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile-360",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 360, height: 740 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `node scripts/serve.mjs --port ${PORT} --prefix ${PREFIX}`,
    url: `http://localhost:${PORT}${PREFIX}`,
    reuseExistingServer: !process.env.CI,
  },
});
