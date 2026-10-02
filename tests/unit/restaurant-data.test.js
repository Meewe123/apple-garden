import assert from "node:assert/strict";
import { describe, it } from "node:test";

import restaurant from "../../src/_data/restaurant.json" with { type: "json" };
import { validateRestaurant } from "../../lib/validate-restaurant.js";

/** Deep copy with a change applied, so each test starts from valid data. */
const withChange = (change) => {
  const copy = structuredClone(restaurant);
  change(copy);
  return copy;
};

describe("validateRestaurant", () => {
  it("accepts the real data file", () => {
    assert.deepEqual(validateRestaurant(restaurant), []);
  });

  it("rejects a phone number in the wrong format", () => {
    const problems = validateRestaurant(withChange((d) => (d.phone.e164 = "99 440 02 02")));
    assert.ok(
      problems.some((p) => p.startsWith("phone.e164")),
      problems.join("\n"),
    );
  });

  it("notices when the displayed and dialled numbers differ", () => {
    const problems = validateRestaurant(withChange((d) => (d.phone.display = "+998 99 440-02-03")));
    assert.ok(problems.some((p) => p.includes("разные номера")));
  });

  it("rejects malformed opening hours", () => {
    const problems = validateRestaurant(withChange((d) => (d.hours[0].closes = "11pm")));
    assert.ok(problems.includes("hours[0].closes: время в формате ЧЧ:ММ"));
  });

  it("rejects weekdays outside 1–7", () => {
    const problems = validateRestaurant(withChange((d) => (d.hours[0].days = [0, 1])));
    assert.ok(problems.some((p) => p.startsWith("hours[0].days")));
  });

  it("catches swapped latitude and longitude", () => {
    const problems = validateRestaurant(withChange((d) => ([d.geo.lat, d.geo.lng] = [d.geo.lng, d.geo.lat])));
    assert.ok(problems.some((p) => p.startsWith("geo.lat")));
  });

  it("requires the short plus code to match the full one", () => {
    const problems = validateRestaurant(withChange((d) => (d.address.plusCodeFull = "8JHF98MQ+JX")));
    assert.ok(problems.some((p) => p.startsWith("address.plusCodeFull")));
  });

  it("rejects a rating above the maximum and a review without text", () => {
    const problems = validateRestaurant(
      withChange((d) => {
        d.rating.value = 6;
        d.reviews[0].text = " ";
      }),
    );
    assert.ok(problems.some((p) => p.startsWith("rating.value")));
    assert.ok(problems.some((p) => p.startsWith("reviews[0]")));
  });

  it("accepts only Google Maps links as googleMapsUrl", () => {
    assert.deepEqual(
      validateRestaurant(withChange((d) => (d.googleMapsUrl = "https://maps.app.goo.gl/abc"))),
      [],
    );
    const problems = validateRestaurant(withChange((d) => (d.googleMapsUrl = "http://example.com")));
    assert.ok(problems.some((p) => p.startsWith("googleMapsUrl")));
  });

  it("allows an empty review list (the page shows an empty state)", () => {
    assert.deepEqual(validateRestaurant(withChange((d) => (d.reviews = []))), []);
  });

  it("does not crash on completely wrong input", () => {
    for (const input of [null, undefined, 42, "text", []]) {
      assert.ok(validateRestaurant(input).length > 0);
    }
  });
});
