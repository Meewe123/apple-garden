// @ts-check
/**
 * Opening-hours logic shared by the build (Node) and the browser.
 *
 * Times are "HH:MM" strings in the restaurant's local time zone.
 * Days are ISO weekdays: 1 = Monday … 7 = Sunday.
 * A rule whose closing time is earlier than its opening time runs past midnight.
 * A rule with equal opening and closing times means open around the clock.
 */

/** @typedef {{ days: number[], opens: string, closes: string }} HoursRule */
/**
 * @typedef {(
 *   | { state: "open" | "closing-soon", closesAt: string }
 *   | { state: "closed", opensAt: string, inDays: number, weekday: number }
 *   | { state: "unknown" }
 * )} OpenStatus
 */

const DAY = 24 * 60;
const WEEK = 7 * DAY;

/** @type {Record<string, number>} */
const WEEKDAY_NUMBERS = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

const SHORT_DAY_NAMES = ["", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
/** Accusative case, as in «откроется в понедельник». */
const DAY_NAMES_ACCUSATIVE = [
  "",
  "в понедельник",
  "во вторник",
  "в среду",
  "в четверг",
  "в пятницу",
  "в субботу",
  "в воскресенье",
];

/**
 * @param {string} value "HH:MM", 24-hour clock
 * @returns {number} minutes since midnight
 */
export function parseTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) throw new RangeError(`Invalid time "${value}", expected HH:MM`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * @param {number} minutes minutes since midnight (any integer, wrapped to one day)
 * @returns {string} "HH:MM"
 */
export function formatTime(minutes) {
  const m = ((minutes % DAY) + DAY) % DAY;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/**
 * Weekday and wall-clock time of `date` as seen in `timeZone`.
 * @param {Date} date
 * @param {string} timeZone IANA name, e.g. "Asia/Tashkent"
 * @returns {{ weekday: number, minutes: number }}
 */
export function zonedClock(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  /** @param {string} type */
  const part = (type) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = WEEKDAY_NUMBERS[part("weekday")];
  if (!weekday) throw new RangeError(`Cannot read weekday for time zone "${timeZone}"`);
  return { weekday, minutes: Number(part("hour")) * 60 + Number(part("minute")) };
}

/**
 * Turns rules into sorted, merged intervals in "minutes since Monday 00:00".
 * An interval may end after the end of the week (Sunday night into Monday).
 * @param {HoursRule[]} rules
 * @returns {Array<[number, number]>}
 */
export function weeklyIntervals(rules) {
  /** @type {Array<[number, number]>} */
  const intervals = [];
  for (const rule of rules) {
    const opens = parseTime(rule.opens);
    const closes = parseTime(rule.closes);
    const length = closes > opens ? closes - opens : closes + DAY - opens;
    for (const day of rule.days) {
      if (!Number.isInteger(day) || day < 1 || day > 7) {
        throw new RangeError(`Invalid weekday ${day}, expected 1–7`);
      }
      const start = (day - 1) * DAY + opens;
      intervals.push([start, start + length]);
    }
  }
  intervals.sort((a, b) => a[0] - b[0]);

  /** @type {Array<[number, number]>} */
  const merged = [];
  for (const [start, end] of intervals) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

/**
 * @param {Date} date
 * @param {HoursRule[]} rules
 * @param {{ timeZone: string, soonMinutes?: number }} options
 * @returns {OpenStatus}
 */
export function getOpenStatus(date, rules, { timeZone, soonMinutes = 60 }) {
  const intervals = weeklyIntervals(rules);
  if (intervals.length === 0) return { state: "unknown" };

  const clock = zonedClock(date, timeZone);
  const now = (clock.weekday - 1) * DAY + clock.minutes;

  // Look at this week and the previous one, so that Sunday-night hours
  // that spill into Monday are found too.
  for (const [start, end] of intervals) {
    for (const shift of [0, -WEEK]) {
      if (now >= start + shift && now < end + shift) {
        const left = end + shift - now;
        const closesAt = formatTime(end);
        return left <= soonMinutes ? { state: "closing-soon", closesAt } : { state: "open", closesAt };
      }
    }
  }

  const next = intervals.find(([start]) => start > now) ?? [intervals[0][0] + WEEK];
  const inDays = Math.floor(next[0] / DAY) - Math.floor(now / DAY);
  return {
    state: "closed",
    opensAt: formatTime(next[0]),
    inDays,
    weekday: ((clock.weekday - 1 + inDays) % 7) + 1,
  };
}

/**
 * Human-readable status in Russian. Returns null when there is nothing reliable to say.
 * @param {OpenStatus} status
 * @returns {string | null}
 */
export function describeStatus(status) {
  switch (status.state) {
    case "open":
      return `Открыто до ${status.closesAt}`;
    case "closing-soon":
      return `Скоро закроется — в ${status.closesAt}`;
    case "closed": {
      const when =
        status.inDays === 0
          ? ""
          : status.inDays === 1
            ? "завтра "
            : `${DAY_NAMES_ACCUSATIVE[status.weekday]} `;
      return `Закрыто, откроется ${when}в ${status.opensAt}`;
    }
    default:
      return null;
  }
}

/**
 * Groups days with identical hours for display: "Ежедневно", "Пн–Пт", "Сб, Вс".
 * @param {HoursRule[]} rules
 * @returns {Array<{ days: string, time: string }>}
 */
export function summarizeHours(rules) {
  /** @type {Map<string, number[]>} */
  const byTime = new Map();
  for (const rule of rules) {
    parseTime(rule.opens);
    parseTime(rule.closes);
    const time = `${rule.opens}–${rule.closes}`;
    byTime.set(time, [...(byTime.get(time) ?? []), ...rule.days]);
  }

  return [...byTime].map(([time, days]) => {
    const sorted = [...new Set(days)].sort((a, b) => a - b);
    return { days: formatDayRange(sorted), time };
  });
}

/**
 * @param {number[]} days sorted unique ISO weekdays
 * @returns {string}
 */
function formatDayRange(days) {
  if (days.length === 7) return "Ежедневно";

  /** @type {number[][]} */
  const runs = [];
  for (const day of days) {
    const run = runs.at(-1);
    if (run && day === (run.at(-1) ?? 0) + 1) run.push(day);
    else runs.push([day]);
  }
  return runs
    .map((run) =>
      run.length >= 3
        ? `${SHORT_DAY_NAMES[run[0]]}–${SHORT_DAY_NAMES[run.at(-1) ?? run[0]]}`
        : run.map((d) => SHORT_DAY_NAMES[d]).join(", "),
    )
    .join(", ");
}
