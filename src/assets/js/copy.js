// @ts-check
/**
 * "Copy address" button with a spoken and visible result.
 * If the clipboard is unavailable, the text is shown so it can be copied by hand.
 * @param {Document} doc
 */
export function initCopy(doc) {
  for (const root of doc.querySelectorAll("[data-copy]")) {
    const button = root.querySelector("[data-copy-button]");
    const status = root.querySelector("[data-copy-status]");
    if (!(button instanceof HTMLButtonElement) || !(status instanceof HTMLElement)) continue;

    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let reset;

    button.addEventListener("click", async () => {
      const text = button.dataset.copyText ?? "";
      clearTimeout(reset);
      try {
        await navigator.clipboard.writeText(text);
        status.dataset.state = "success";
        status.textContent = "Скопировано. Вставьте в мессенджер или приложение такси.";
        reset = setTimeout(() => {
          status.textContent = "";
          delete status.dataset.state;
        }, 6000);
      } catch {
        status.dataset.state = "error";
        status.textContent = `Не получилось скопировать автоматически. Адрес: ${text}`;
      }
    });
  }
}
