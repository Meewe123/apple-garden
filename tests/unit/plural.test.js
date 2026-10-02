import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pluralRu } from "../../lib/plural.js";

describe("pluralRu", () => {
  const reviews = ["отзыв", "отзыва", "отзывов"];

  it("chooses the right form for the number", () => {
    const cases = { 1: "отзыв", 2: "отзыва", 4: "отзыва", 5: "отзывов", 11: "отзывов", 12: "отзывов" };
    for (const [count, form] of Object.entries(cases)) {
      assert.equal(pluralRu(Number(count), reviews), form, count);
    }
  });

  it("follows the last digits, not the size", () => {
    assert.equal(pluralRu(21, reviews), "отзыв");
    assert.equal(pluralRu(22, reviews), "отзыва");
    assert.equal(pluralRu(111, reviews), "отзывов");
  });

  it("works for «больше N лет»", () => {
    const years = ["года", "лет", "лет"];
    assert.equal(pluralRu(12, years), "лет");
    assert.equal(pluralRu(21, years), "года");
  });
});
