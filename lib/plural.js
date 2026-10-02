// @ts-check
const rules = new Intl.PluralRules("ru");

/**
 * Picks the Russian word form for a number: 1 отзыв, 3 отзыва, 12 отзывов, 21 отзыв.
 * @param {number} count
 * @param {[one: string, few: string, many: string]} forms
 * @returns {string}
 */
export function pluralRu(count, [one, few, many]) {
  switch (rules.select(count)) {
    case "one":
      return one;
    case "few":
      return few;
    default:
      return many;
  }
}
