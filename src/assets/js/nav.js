// @ts-check
/**
 * Mobile navigation: a disclosure button that shows and hides the section links.
 * Closes on Escape (focus returns to the button), on a click outside,
 * after choosing a link, and when the screen becomes wide enough for the full menu.
 * @param {Document} doc
 */
export function initNav(doc) {
  const header = doc.querySelector("[data-site-header]");
  const toggle = doc.querySelector("[data-nav-toggle]");
  const nav = toggle && doc.getElementById(toggle.getAttribute("aria-controls") ?? "");
  if (!(header instanceof HTMLElement) || !(toggle instanceof HTMLButtonElement) || !nav) return;

  const isOpen = () => toggle.getAttribute("aria-expanded") === "true";

  /** @param {boolean} open */
  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    header.toggleAttribute("data-nav-open", open);
  };

  toggle.addEventListener("click", () => setOpen(!isOpen()));

  nav.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
  });

  doc.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  doc.addEventListener("click", (event) => {
    if (isOpen() && event.target instanceof Node && !header.contains(event.target)) setOpen(false);
  });

  // The toggle is hidden on wide screens; don't leave the menu "open" behind it.
  const wide = doc.defaultView?.matchMedia("(min-width: 60rem)");
  wide?.addEventListener("change", (event) => {
    if (event.matches) setOpen(false);
  });
}
