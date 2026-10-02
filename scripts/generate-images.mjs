// Renders the social preview (og.png, 1200×630) and the iOS home-screen icon
// (apple-touch-icon.png, 180×180) from HTML, using the site's own fonts,
// colours and orchard drawing. Run after changing the name or the design:
//
//   npm run images
//
// The PNGs are committed, so a normal build doesn't need a browser.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

import { orchard } from "../lib/orchard.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, "src/assets/img");
const restaurant = JSON.parse(await readFile(path.join(root, "src/_data/restaurant.json"), "utf8"));

// Fonts are inlined as data URLs: a page created with setContent() can't read local files.
const font = async (pkg, file) =>
  `data:font/woff2;base64,${(await readFile(path.join(root, "node_modules", pkg, "files", file))).toString("base64")}`;
const appleMark = await readFile(path.join(root, "src/_includes/partials/apple-mark.njk"), "utf8");

const styles = `
  @font-face { font-family: Alegreya; font-weight: 400 900;
    src: url(${await font("@fontsource-variable/alegreya", "alegreya-cyrillic-wght-normal.woff2")}); unicode-range: U+0400-045F; }
  @font-face { font-family: Alegreya; font-weight: 400 900;
    src: url(${await font("@fontsource-variable/alegreya", "alegreya-latin-wght-normal.woff2")}); }
  @font-face { font-family: Alegreya; font-style: italic; font-weight: 400 900;
    src: url(${await font("@fontsource-variable/alegreya", "alegreya-cyrillic-wght-italic.woff2")}); unicode-range: U+0400-045F; }
  @font-face { font-family: Alegreya; font-style: italic; font-weight: 400 900;
    src: url(${await font("@fontsource-variable/alegreya", "alegreya-latin-wght-italic.woff2")}); }
  * { margin: 0; box-sizing: border-box; }
  body { background: #f4efe3; color: #1c2a1f; font-family: Alegreya, serif; }
  .apple-mark__fruit { fill: #b03a2e; }
  .apple-mark__leaf { fill: #1c2a1f; }
  .orchard { display: block; width: 100%; height: 100%; }
  .orchard__crowns { fill: #dfe2cc; stroke: #a9b48f; stroke-width: 1; }
  .orchard__trunks { fill: #a9b48f; }
  .orchard__apples { fill: #b03a2e; }
`;

const og = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>${styles}
  .card { position: relative; width: 1200px; height: 630px; overflow: hidden; padding: 72px 80px; }
  .kicker { font-style: italic; font-size: 36px; color: #4c584e; }
  h1 { margin-top: 20px; font-size: 156px; font-weight: 520; line-height: 0.9; letter-spacing: -0.02em; }
  h1 span { display: block; }
  h1 span + span { padding-left: 1.1em; }
  .mark { position: absolute; top: 64px; right: 80px; width: 88px; height: 88px; }
  .mark svg { width: 100%; height: 100%; }
  .band { position: absolute; left: 0; right: 0; bottom: 0; height: 150px; }
</style></head><body>
  <div class="card">
    <p class="kicker">${restaurant.kind} ${restaurant.address.localityIn}</p>
    <h1><span>Apple</span><span>Garden</span></h1>
    <div class="mark">${appleMark}</div>
    <div class="band">${orchard({ cols: 26, rows: 3, seed: 2014 }).svg}</div>
  </div>
</body></html>`;

const icon = `<!doctype html><html><head><meta charset="utf-8"><style>${styles}
  .icon { width: 180px; height: 180px; display: grid; place-items: center; background: #f4efe3; }
  .icon svg { width: 120px; height: 120px; }
</style></head><body><div class="icon">${appleMark}</div></body></html>`;

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
try {
  for (const [name, html, width, height] of [
    ["og.png", og, 1200, 630],
    ["apple-touch-icon.png", icon, 180, 180],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, name) });
    await page.close();
    console.log(`Wrote src/assets/img/${name}`);
  }
} finally {
  await browser.close();
}
