import { expect, test } from "@playwright/test";

test.describe("home page", () => {
  test("loads without errors and shows the essentials", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));

    const response = await page.goto("./");
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/Apple Garden/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Apple\s+Garden/);
    await expect(page.locator(".hero").getByRole("link", { name: /Позвонить/ })).toHaveAttribute(
      "href",
      "tel:+998994400202",
    );
    for (const name of ["Кухня", "Сад и праздники", "Отзывы в Google", "Как добраться"]) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test("has exactly one h1 and no skipped heading levels", async ({ page }) => {
    await page.goto("./");
    const levels = await page.locator("h1, h2, h3, h4, h5, h6").evaluateAll((els) =>
      els.map((el) => Number(el.tagName[1])),
    );
    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    levels.reduce((previous, level) => {
      expect(level - previous, `h${previous} followed by h${level}`).toBeLessThanOrEqual(1);
      return level;
    });
  });

  test("every in-page link points at an existing section", async ({ page }) => {
    await page.goto("./");
    const targets = await page.locator('a[href*="#"]').evaluateAll((links) =>
      links
        .map((a) => new URL(a.href))
        .filter((url) => url.origin === location.origin && url.pathname === location.pathname)
        .map((url) => url.hash.slice(1)),
    );
    expect(targets.length).toBeGreaterThan(0);
    for (const id of new Set(targets)) {
      await expect(page.locator(`[id="${id}"]`), `#${id}`).toHaveCount(1);
    }
  });

  test("links that open a new tab are safe and announced", async ({ page }) => {
    await page.goto("./");
    const links = await page.locator('a[target="_blank"]').evaluateAll((els) =>
      els.map((a) => ({ rel: a.rel, text: a.textContent ?? "" })),
    );
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.rel).toContain("noopener");
      expect(link.text).toContain("откроется в новой вкладке");
    }
  });

  test("has search and social preview metadata", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{50,}/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https:\/\//);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^https:\/\/.+\.png$/);

    const jsonLd = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    expect(jsonLd["@type"]).toBe("Restaurant");
    expect(jsonLd.telephone).toBe("+998994400202");
  });

  test("never scrolls sideways", async ({ page }) => {
    await page.goto("./");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("the skip link moves focus to the content", async ({ page }) => {
    await page.goto("./");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Перейти к содержанию" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
  });

  test("shows the rating honestly, as a number", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator(".rating__value")).toHaveText("3,6");
    await expect(page.locator(".rating .stars")).toHaveAttribute("aria-hidden", "true");
  });
});

test.describe("404 page", () => {
  test("answers unknown addresses with a real 404 and a way back", async ({ page }) => {
    const response = await page.goto("./no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Такой страницы нет");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");

    await page.getByRole("link", { name: "На главную" }).click();
    await expect(page).toHaveURL(/\/apple-garden\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Apple\s+Garden/);
  });
});
