import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const check = async (page) => {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const summary = violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(summary).toEqual([]);
};

for (const colorScheme of ["light", "dark"]) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test("home page passes WCAG 2.2 AA checks", async ({ page }) => {
      await page.goto("./");
      await check(page);
    });

    test("404 page passes WCAG 2.2 AA checks", async ({ page }) => {
      await page.goto("./missing");
      await check(page);
    });
  });
}

test("open mobile menu passes WCAG 2.2 AA checks", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("./");
  await page.getByRole("button", { name: "Разделы страницы" }).click();
  await check(page);
});

test("map error state passes WCAG 2.2 AA checks", async ({ page }) => {
  await page.clock.install();
  await page.route(/^https:\/\/www\.google\.com\/maps/, () => {});
  await page.goto("./");
  await page.getByRole("button", { name: "Показать карту" }).click();
  await page.clock.runFor(16_000);
  await expect(page.getByRole("alert")).toBeVisible();
  await check(page);
});

test("interactive elements are at least 24×24 px", async ({ page }) => {
  await page.goto("./");
  const small = await page.locator("a, button").evaluateAll((els) =>
    els
      .filter((el) => el.offsetParent !== null && !el.closest("p, dd, li:not(.site-nav li)"))
      .map((el) => ({ text: el.textContent?.trim(), box: el.getBoundingClientRect() }))
      .filter(({ box }) => box.width < 24 || box.height < 24)
      .map(({ text }) => text),
  );
  expect(small).toEqual([]);
});
