import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["_site/", "test-results/", "playwright-report/"] },
  js.configs.recommended,
  {
    rules: {
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/assets/js/**/*.js"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["*.js", "lib/**/*.js", "scripts/**/*.mjs", "src/_data/**/*.js", "tests/**/*.js"],
    languageOptions: { globals: globals.node },
  },
  {
    // Code passed to page.evaluate() runs in the browser.
    files: ["tests/e2e/**/*.js", "scripts/generate-images.mjs", "scripts/screenshots.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
