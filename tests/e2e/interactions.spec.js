import { expect, test } from "@playwright/test";

test.describe("mobile navigation", () => {
  test.skip(({ isMobile }) => !isMobile, "the menu button exists only on narrow screens");

  test("opens, closes with Escape and returns focus", async ({ page }) => {
    await page.goto("./");
    const toggle = page.getByRole("button", { name: "Разделы страницы" });
    const nav = page.getByRole("navigation", { name: "Разделы страницы" });

    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(nav.getByRole("link", { name: "Отзывы" })).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(nav.getByRole("link", { name: "Отзывы" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
  });

  test("closes after choosing a section", async ({ page }) => {
    await page.goto("./");
    const toggle = page.getByRole("button", { name: "Разделы страницы" });
    await toggle.click();
    await page.getByRole("navigation").getByRole("link", { name: "Как добраться" }).click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page).toHaveURL(/#visit$/);
  });

  test("closes on a tap outside", async ({ page }) => {
    await page.goto("./");
    const toggle = page.getByRole("button", { name: "Разделы страницы" });
    await toggle.click();
    await page.locator("#kitchen-title").click({ force: true });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("map", () => {
  const MAP_URL = /^https:\/\/www\.google\.com\/maps/;

  test("loads only after the visitor asks", async ({ page }) => {
    const mapRequests = [];
    await page.route(MAP_URL, (route) => {
      mapRequests.push(route.request().url());
      return route.fulfill({ contentType: "text/html", body: "<p>map</p>" });
    });
    await page.goto("./");
    await page.waitForLoadState("networkidle");
    expect(mapRequests).toEqual([]);

    await page.getByRole("button", { name: "Показать карту" }).click();
    await expect(page.locator("iframe.map__frame")).toHaveAttribute("title", /на карте Google/);
    await expect(page.locator("[data-map]")).toHaveAttribute("data-map-state", "loaded");
    expect(mapRequests).toHaveLength(1);
  });

  test("shows an error with a retry when the map never arrives", async ({ page }) => {
    await page.clock.install();
    await page.route(MAP_URL, () => {
      /* never answer */
    });
    await page.goto("./");

    await page.getByRole("button", { name: "Показать карту" }).click();
    await expect(page.locator("[data-map-skeleton]")).toBeVisible();

    await page.clock.runFor(16_000);
    await expect(page.getByRole("alert")).toContainText("Карта не загрузилась");
    await expect(page.getByRole("button", { name: "Попробовать ещё раз" })).toBeFocused();
    await expect(page.locator("iframe.map__frame")).toHaveCount(0);
  });
});

test.describe("copy address", () => {
  test("copies the address with coordinates", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "clipboard permissions are Chromium-only");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("./");

    await page.getByRole("button", { name: /Скопировать адрес/ }).click();
    await expect(page.locator("[data-copy-status]")).toHaveText(/Скопировано/);
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("8JHF98MQ+JC");
    expect(copied).toContain("41.38406, 69.33856");
  });

  test("shows the text when copying is not allowed", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: () => Promise.reject(new Error("denied")) },
      });
    });
    await page.goto("./");
    await page.getByRole("button", { name: /Скопировать адрес/ }).click();
    await expect(page.locator("[data-copy-status]")).toHaveText(/Не получилось скопировать.*8JHF98MQ\+JC/);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("everything important is still there", async ({ page }) => {
    await page.goto("./");
    const nav = page.getByRole("navigation", { name: "Разделы страницы" });
    await expect(nav.getByRole("link", { name: "Отзывы" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Разделы страницы" })).toBeHidden();
    await expect(page.locator(".info-card [data-open-status]")).toHaveText("Ежедневно, 09:00–23:00");
    await expect(page.getByRole("link", { name: /Открыть в Google Maps/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Показать карту" })).toBeHidden();
  });
});
