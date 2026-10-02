import { existsSync } from "node:fs";
import path from "node:path";
import { HtmlBasePlugin } from "@11ty/eleventy";
import browserslist from "browserslist";
import { browserslistToTargets, bundle } from "lightningcss";

import { summarizeHours } from "./src/assets/js/lib/hours.js";
import { addressForCopy, buildLinks } from "./lib/links.js";
import { orchard } from "./lib/orchard.js";
import { pluralRu } from "./lib/plural.js";
import { jsonForScript, restaurantJsonLd } from "./lib/structured-data.js";
import { validateRestaurant } from "./lib/validate-restaurant.js";

if (existsSync(".env")) process.loadEnvFile(".env");

const cssTargets = browserslistToTargets(browserslist());

const FONT_FILES = [
  "@fontsource-variable/alegreya/files/alegreya-cyrillic-wght-normal.woff2",
  "@fontsource-variable/alegreya/files/alegreya-latin-wght-normal.woff2",
  "@fontsource-variable/alegreya/files/alegreya-cyrillic-wght-italic.woff2",
  "@fontsource-variable/alegreya/files/alegreya-latin-wght-italic.woff2",
  "@fontsource/alegreya-sans/files/alegreya-sans-cyrillic-400-normal.woff2",
  "@fontsource/alegreya-sans/files/alegreya-sans-latin-400-normal.woff2",
  "@fontsource/alegreya-sans/files/alegreya-sans-cyrillic-500-normal.woff2",
  "@fontsource/alegreya-sans/files/alegreya-sans-latin-500-normal.woff2",
  "@fontsource/alegreya-sans/files/alegreya-sans-cyrillic-700-normal.woff2",
  "@fontsource/alegreya-sans/files/alegreya-sans-latin-700-normal.woff2",
];

/** @param {import("@11ty/eleventy").UserConfig} config */
export default function (config) {
  config.addPlugin(HtmlBasePlugin);

  // Fail the build on broken restaurant data instead of publishing it.
  config.on("eleventy.before", async () => {
    const { default: restaurant } = await import("./src/_data/restaurant.json", { with: { type: "json" } });
    const problems = validateRestaurant(restaurant);
    if (problems.length > 0) {
      throw new Error(`src/_data/restaurant.json содержит ошибки:\n  - ${problems.join("\n  - ")}`);
    }
  });

  for (const file of FONT_FILES) {
    config.addPassthroughCopy({ [`node_modules/${file}`]: `assets/fonts/${path.basename(file)}` });
  }
  config.addPassthroughCopy("src/assets/js");
  config.addPassthroughCopy("src/assets/img");

  // CSS: bundle @imports, add prefixes for our browserslist and minify.
  // Files starting with "_" are partials and are not written on their own.
  config.addTemplateFormats("css");
  config.addExtension("css", {
    outputFileExtension: "css",
    compile(_content, inputPath) {
      if (path.basename(inputPath).startsWith("_")) return;
      return () => {
        const { code } = bundle({ filename: inputPath, minify: true, targets: cssTargets });
        return code.toString();
      };
    },
  });

  config.addGlobalData("links", async () => {
    const { default: restaurant } = await import("./src/_data/restaurant.json", { with: { type: "json" } });
    return buildLinks(restaurant);
  });

  config.addFilter("hoursSummary", summarizeHours);
  config.addFilter("addressForCopy", addressForCopy);
  config.addFilter("jsonForScript", jsonForScript);
  config.addFilter("restaurantJsonLd", restaurantJsonLd);
  config.addFilter("ratingPercent", (value, best) => `${Math.round((value / best) * 1000) / 10}%`);
  config.addFilter("decimalRu", (value) => String(value).replace(".", ","));
  config.addFilter("plural", (count, one, few, many) => `${count}\u00a0${pluralRu(count, [one, few, many])}`);
  // Phone numbers must not break across lines.
  config.addFilter("nbsp", (value) => String(value).replaceAll(" ", "\u00a0"));
  config.addShortcode("orchard", (options = {}) => orchard(options).svg);

  config.setServerOptions({ port: 8080, showVersion: false });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    pathPrefix: process.env.PATH_PREFIX ?? "/apple-garden/",
    templateFormats: ["njk", "css"],
    htmlTemplateEngine: "njk",
  };
}
