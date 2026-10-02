import assert from "node:assert/strict";
import { describe, it } from "node:test";

import restaurant from "../../src/_data/restaurant.json" with { type: "json" };
import { addressForCopy, buildLinks } from "../../lib/links.js";
import { jsonForScript, restaurantJsonLd } from "../../lib/structured-data.js";

describe("buildLinks", () => {
  const links = buildLinks(restaurant);
  const coords = `${restaurant.geo.lat},${restaurant.geo.lng}`;

  it("dials the number in international format", () => {
    assert.equal(links.tel, "tel:+998994400202");
  });

  it("points every map service at the same coordinates", () => {
    assert.ok(links.googleDirections.endsWith(`destination=${coords}`));
    assert.ok(links.yandexDirections.includes(`rtext=~${coords}`));
    assert.ok(links.googleEmbed.includes(`q=${coords}`));
  });

  it("searches Google Maps by name and full plus code, URL-encoded", () => {
    const url = new URL(links.googlePlace);
    assert.equal(url.searchParams.get("query"), "Apple Garden, 8JHF98MQ+JC");
    assert.ok(!links.googlePlace.includes(" "));
  });

  it("uses HTTPS everywhere", () => {
    for (const [name, href] of Object.entries(links)) {
      if (name !== "tel") assert.ok(href.startsWith("https://"), name);
    }
  });
});

describe("addressForCopy", () => {
  it("includes everything a driver needs", () => {
    const text = addressForCopy(restaurant);
    for (const part of ["Apple Garden", "Салар", "8JHF98MQ+JC", String(restaurant.geo.lat)]) {
      assert.ok(text.includes(part), part);
    }
  });
});

describe("restaurantJsonLd", () => {
  const data = restaurantJsonLd(restaurant, { imageUrl: "https://example.com/og.png", mapUrl: "https://maps" });

  it("describes a schema.org Restaurant", () => {
    assert.equal(data["@type"], "Restaurant");
    assert.equal(data.telephone, "+998994400202");
    assert.equal(data.geo.latitude, restaurant.geo.lat);
  });

  it("lists opening hours with schema.org day names", () => {
    assert.equal(data.openingHoursSpecification[0].dayOfWeek.length, 7);
    assert.equal(data.openingHoursSpecification[0].dayOfWeek[0], "https://schema.org/Monday");
  });

  it("does not republish Google's rating as the site's own", () => {
    assert.equal("aggregateRating" in data, false);
  });
});

describe("jsonForScript", () => {
  it("cannot be used to close the surrounding <script> tag", () => {
    const json = jsonForScript({ text: "</script><script>alert(1)</script>" });
    assert.ok(!json.includes("</script>"));
    assert.deepEqual(JSON.parse(json), { text: "</script><script>alert(1)</script>" });
  });
});
