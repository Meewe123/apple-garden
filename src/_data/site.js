/**
 * Site-wide settings. Values can be overridden with environment variables
 * (see .env.example), e.g. when deploying somewhere other than GitHub Pages.
 */
const url = (process.env.SITE_URL ?? "https://meewe123.github.io/apple-garden").replace(/\/+$/, "");

export default {
  url,
  lang: "ru",
  locale: "ru_RU",
  repository: "https://github.com/Meewe123/apple-garden",
  buildYear: new Date().getFullYear(),
};
