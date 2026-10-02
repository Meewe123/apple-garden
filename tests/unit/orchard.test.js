import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { orchard } from "../../lib/orchard.js";

describe("orchard", () => {
  it("draws the same picture for the same seed", () => {
    assert.equal(orchard({ seed: 7 }).svg, orchard({ seed: 7 }).svg);
    assert.notEqual(orchard({ seed: 7 }).svg, orchard({ seed: 8 }).svg);
  });

  it("plants one tree per grid cell, minus the empty spots", () => {
    assert.equal(orchard({ cols: 10, rows: 3 }).trees, 30);
    assert.equal(
      orchard({
        cols: 10,
        rows: 3,
        empty: [
          [1, 4],
          [2, 9],
        ],
      }).trees,
      28,
    );
  });

  it("outlines empty spots instead of drawing trees", () => {
    const { svg } = orchard({ cols: 4, rows: 2, empty: [[0, 0]] });
    assert.match(svg, /class="orchard__holes"/);
    assert.equal(orchard({ cols: 4, rows: 2 }).svg.includes("orchard__holes"), false);
  });

  it("can draw a tree without apples", () => {
    assert.equal(orchard({ appleChance: 0 }).apples, 0);
  });

  it("is decorative and hidden from assistive technology", () => {
    assert.match(orchard().svg, /^<svg [^>]*aria-hidden="true"/);
  });

  it("adds a modifier class only when asked", () => {
    assert.match(orchard({ modifier: "map" }).svg, /class="orchard orchard--map"/);
    assert.match(orchard().svg, /class="orchard"/);
  });
});
