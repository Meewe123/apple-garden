// Captures the README screenshots from the built site (run `npm run build` first):
//
//   npm run screenshots
//
// The clock is frozen at noon in Tashkent so the live status always reads «Открыто».

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const PORT = 4174;
const URL = `http://localhost:${PORT}/apple-garden/`;
const OUT = "docs/screenshots";
const NOON_IN_TASHKENT = new Date("2026-10-05T12:00:00+05:00");

const shots = [
  { name: "desktop-light", width: 1440, height: 900, colorScheme: "light", fullPage: false },
  { name: "desktop-dark", width: 1440, height: 900, colorScheme: "dark", fullPage: false },
  { name: "desktop-full", width: 1440, height: 900, colorScheme: "light", fullPage: true },
  { name: "mobile-light", width: 360, height: 740, colorScheme: "light", fullPage: false },
  { name: "mobile-menu", width: 360, height: 740, colorScheme: "light", fullPage: false, openMenu: true },
  { name: "mobile-dark", width: 360, height: 740, colorScheme: "dark", fullPage: false },
];

const server = spawn("node", ["scripts/serve.mjs", "--port", String(PORT)], {
  stdio: ["ignore", "pipe", "inherit"],
});
await new Promise((resolve) => server.stdout.once("data", resolve));

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
try {
  await mkdir(OUT, { recursive: true });
  for (const shot of shots) {
    const page = await browser.newPage({
      viewport: { width: shot.width, height: shot.height },
      colorScheme: shot.colorScheme,
      deviceScaleFactor: shot.width < 600 ? 2 : 1,
    });
    await page.clock.setFixedTime(NOON_IN_TASHKENT);
    await page.goto(URL, { waitUntil: "networkidle" });
    if (shot.openMenu) {
      await page.getByRole("button", { name: "Разделы страницы" }).click();
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: shot.fullPage });
    await page.close();
    console.log(`Wrote ${OUT}/${shot.name}.png`);
  }
} finally {
  await browser.close();
  server.kill();
}
