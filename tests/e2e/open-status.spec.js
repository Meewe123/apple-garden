import { expect, test } from "@playwright/test";

// Wall-clock moments in Tashkent (UTC+5). 2026-10-05 is a Monday.
const at = (isoLocal) => new Date(`${isoLocal}+05:00`);

const cases = [
  { time: "2026-10-05T12:00:00", text: "Открыто до 23:00", state: "open" },
  { time: "2026-10-05T22:15:00", text: "Скоро закроется — в 23:00", state: "closing-soon" },
  { time: "2026-10-05T23:30:00", text: "Закрыто, откроется завтра в 09:00", state: "closed" },
  { time: "2026-10-05T06:00:00", text: "Закрыто, откроется в 09:00", state: "closed" },
];

for (const { time, text, state } of cases) {
  test(`shows «${text}» at ${time.slice(11, 16)} Tashkent time`, async ({ page }) => {
    await page.clock.setFixedTime(at(time));
    await page.goto("./");
    const status = page.locator(".info-card [data-open-status]");
    await expect(status).toHaveText(text);
    await expect(status).toHaveAttribute("data-state", state);
  });
}

test("uses Tashkent time even when the visitor is elsewhere", async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: "America/New_York" });
  const page = await context.newPage();
  // 03:00 in New York is 12:00 in Tashkent.
  await page.clock.setFixedTime(new Date("2026-10-05T07:00:00Z"));
  await page.goto("./");
  await expect(page.locator(".info-card [data-open-status]")).toHaveText("Открыто до 23:00");
  await context.close();
});

test("updates when the minute changes", async ({ page }) => {
  await page.clock.install({ time: at("2026-10-05T21:59:30") });
  await page.goto("./");
  const status = page.locator(".info-card [data-open-status]");
  await expect(status).toHaveText("Открыто до 23:00");
  await page.clock.runFor(60_000);
  await expect(status).toHaveText("Скоро закроется — в 23:00");
});
