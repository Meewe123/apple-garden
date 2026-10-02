// @ts-check
import { describeStatus, getOpenStatus } from "./lib/hours.js";

/**
 * Replaces the static opening hours with a live status in the restaurant's
 * time zone: «Открыто до 23:00», «Закрыто, откроется завтра в 09:00».
 * The visitor's own time zone does not matter.
 * @param {Document} doc
 */
export function initOpenStatus(doc) {
  const targets = [...doc.querySelectorAll("[data-open-status]")];
  const source = doc.getElementById("hours-data");
  if (targets.length === 0 || !source) return;

  /** @type {{ timeZone: string, hours: import("./lib/hours.js").HoursRule[] }} */
  const config = JSON.parse(source.textContent ?? "");

  const render = () => {
    const status = getOpenStatus(new Date(), config.hours, { timeZone: config.timeZone });
    const text = describeStatus(status);
    if (!text) return;
    for (const target of targets) {
      if (!(target instanceof HTMLElement)) continue;
      const label = target.querySelector("[data-open-status-text]");
      if (label) label.textContent = text;
      target.dataset.state = status.state;
      target.hidden = false;
    }
  };

  render();

  // Re-check at the start of every minute, and when the tab comes back into view.
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(
      () => {
        render();
        schedule();
      },
      60_000 - (Date.now() % 60_000) + 50,
    );
  };
  schedule();
  doc.addEventListener("visibilitychange", () => {
    if (doc.visibilityState === "visible") {
      render();
      schedule();
    }
  });
}
