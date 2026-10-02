// @ts-check
/**
 * Click-to-load Google map. Nothing is requested from Google until the visitor
 * asks for the map. Shows a skeleton while loading and an error with a retry
 * button if the map hasn't loaded in time.
 */

export const MAP_TIMEOUT_MS = 15_000;

/** @param {Document} doc */
export function initMap(doc) {
  for (const root of doc.querySelectorAll("[data-map]")) {
    if (root instanceof HTMLElement) setUpMap(root, doc);
  }
}

/**
 * @param {HTMLElement} root
 * @param {Document} doc
 */
function setUpMap(root, doc) {
  const src = root.dataset.mapSrc;
  const placeholder = root.querySelector("[data-map-placeholder]");
  const skeleton = root.querySelector("[data-map-skeleton]");
  const error = root.querySelector("[data-map-error]");
  const loadButton = root.querySelector("[data-map-load]");
  const retryButton = root.querySelector("[data-map-retry]");
  if (
    !src ||
    !(placeholder instanceof HTMLElement) ||
    !(skeleton instanceof HTMLElement) ||
    !(error instanceof HTMLElement)
  ) {
    return;
  }

  /** @param {"idle" | "loading" | "loaded" | "error"} state */
  const show = (state) => {
    root.dataset.mapState = state;
    placeholder.hidden = state !== "idle";
    skeleton.hidden = state !== "loading";
    error.hidden = state !== "error";
  };

  const load = () => {
    root.querySelector("iframe")?.remove();
    show("loading");

    const frame = doc.createElement("iframe");
    frame.className = "map__frame";
    frame.title = root.dataset.mapTitle ?? "Карта";
    frame.src = src;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.allowFullscreen = true;

    const timeout = setTimeout(() => {
      frame.remove();
      show("error");
      if (retryButton instanceof HTMLElement) retryButton.focus();
    }, MAP_TIMEOUT_MS);

    frame.addEventListener(
      "load",
      () => {
        clearTimeout(timeout);
        show("loaded");
      },
      { once: true },
    );

    root.append(frame);
    // Keep keyboard focus in the map area instead of losing it with the hidden button.
    frame.focus({ preventScroll: true });
  };

  show("idle");
  loadButton?.addEventListener("click", load);
  retryButton?.addEventListener("click", load);
}
