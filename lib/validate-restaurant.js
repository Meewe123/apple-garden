// @ts-check
import { parseTime } from "../src/assets/js/lib/hours.js";

/**
 * Checks src/_data/restaurant.json before the site is built, so a typo
 * in a phone number or opening hours fails the build instead of going live.
 *
 * @param {any} data parsed restaurant.json
 * @returns {string[]} human-readable problems; empty when the data is valid
 */
export function validateRestaurant(data) {
  /** @type {string[]} */
  const problems = [];
  /** @param {boolean} ok @param {string} message */
  const check = (ok, message) => {
    if (!ok) problems.push(message);
  };
  /** @param {unknown} value */
  const isText = (value) => typeof value === "string" && value.trim().length > 0;

  check(isText(data?.name), "name: нужно название");
  check(Number.isInteger(data?.yearsOpen) && data.yearsOpen > 0, "yearsOpen: целое число лет работы");
  check(/^\+998\d{9}$/.test(data?.phone?.e164 ?? ""), "phone.e164: формат +998XXXXXXXXX");
  check(isText(data?.phone?.display), "phone.display: нужен номер для показа");
  check(
    data?.phone?.display?.replace(/\D/g, "") === data?.phone?.e164?.replace(/\D/g, ""),
    "phone.display и phone.e164 — разные номера",
  );
  check(isText(data?.address?.locality), "address.locality: нужен населённый пункт");
  check(isText(data?.address?.region), "address.region: нужна область");
  check(
    /^[23456789CFGHJMPQRVWX]{4}\+[23456789CFGHJMPQRVWX]{2,3}$/.test(data?.address?.plusCode ?? ""),
    "address.plusCode: короткий plus code вида 98MQ+JC",
  );
  check(
    typeof data?.address?.plusCodeFull === "string" &&
      data.address.plusCodeFull.endsWith(data?.address?.plusCode),
    "address.plusCodeFull должен заканчиваться на address.plusCode",
  );
  // Rough bounding box of Tashkent Region: catches swapped lat/lng and typos.
  check(data?.geo?.lat > 40 && data?.geo?.lat < 42.5, "geo.lat вне Ташкентской области");
  check(data?.geo?.lng > 68.5 && data?.geo?.lng < 71, "geo.lng вне Ташкентской области");
  check(isText(data?.timeZone), "timeZone: нужен часовой пояс, например Asia/Tashkent");

  if (!Array.isArray(data?.hours) || data.hours.length === 0) {
    problems.push("hours: нужен хотя бы один интервал");
  } else {
    data.hours.forEach((/** @type {any} */ rule, /** @type {number} */ i) => {
      for (const key of ["opens", "closes"]) {
        try {
          parseTime(rule?.[key]);
        } catch {
          problems.push(`hours[${i}].${key}: время в формате ЧЧ:ММ`);
        }
      }
      const daysOk =
        Array.isArray(rule?.days) &&
        rule.days.length > 0 &&
        rule.days.every(
          (/** @type {unknown} */ d) => Number.isInteger(d) && Number(d) >= 1 && Number(d) <= 7,
        );
      check(daysOk, `hours[${i}].days: дни недели числами 1–7 (1 — понедельник)`);
    });
  }

  for (const list of ["kitchen", "features"]) {
    const items = data?.[list];
    check(Array.isArray(items), `${list}: нужен список`);
    (Array.isArray(items) ? items : []).forEach((/** @type {any} */ item, /** @type {number} */ i) => {
      check(isText(item?.title) && isText(item?.text), `${list}[${i}]: нужны title и text`);
    });
  }

  const rating = data?.rating;
  if (rating) {
    check(rating.value >= 0 && rating.value <= rating.best, "rating.value вне диапазона 0…best");
    check(Number.isInteger(rating.count) && rating.count >= 0, "rating.count: целое число отзывов");
    check(isText(rating.source), "rating.source: откуда рейтинг");
  }

  (Array.isArray(data?.reviews) ? data.reviews : []).forEach(
    (/** @type {any} */ review, /** @type {number} */ i) => {
      check(isText(review?.author) && isText(review?.text), `reviews[${i}]: нужны author и text`);
      check(
        Number.isInteger(review?.rating) && review.rating >= 1 && review.rating <= 5,
        `reviews[${i}].rating: целое 1–5`,
      );
    },
  );

  return problems;
}
