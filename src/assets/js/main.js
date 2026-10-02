// @ts-check
// Progressive enhancement: the page is complete without JavaScript.
// Each module finds its own markup and does nothing if it is absent.
import { initCopy } from "./copy.js";
import { initMap } from "./map.js";
import { initNav } from "./nav.js";
import { initOpenStatus } from "./open-status.js";

for (const init of [initNav, initOpenStatus, initMap, initCopy]) {
  try {
    init(document);
  } catch (error) {
    // One broken enhancement must not take the others down.
    console.error(`[apple-garden] ${init.name} failed`, error);
  }
}
