import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  describeStatus,
  formatTime,
  getOpenStatus,
  parseTime,
  summarizeHours,
  weeklyIntervals,
  zonedClock,
} from "../../src/assets/js/lib/hours.js";

const TZ = "Asia/Tashkent"; // UTC+5, no daylight saving time
const DAILY = [{ days: [1, 2, 3, 4, 5, 6, 7], opens: "09:00", closes: "23:00" }];

/** A moment given as Tashkent wall-clock time. 2026-10-05 is a Monday. */
const tashkent = (isoLocal) => new Date(`${isoLocal}+05:00`);
const status = (isoLocal, rules = DAILY, options = {}) =>
  getOpenStatus(tashkent(isoLocal), rules, { timeZone: TZ, ...options });

describe("parseTime / formatTime", () => {
  it("parses HH:MM into minutes since midnight", () => {
    assert.equal(parseTime("00:00"), 0);
    assert.equal(parseTime("09:30"), 570);
    assert.equal(parseTime("23:59"), 1439);
  });

  it("rejects malformed times", () => {
    for (const bad of ["9:00", "24:00", "12:60", "noon", "", "12-00"]) {
      assert.throws(() => parseTime(bad), RangeError, bad);
    }
  });

  it("formats minutes back, wrapping past midnight", () => {
    assert.equal(formatTime(570), "09:30");
    assert.equal(formatTime(1440 + 120), "02:00");
    assert.equal(formatTime(-60), "23:00");
  });
});

describe("zonedClock", () => {
  it("reads weekday and time in the restaurant's zone, not the machine's", () => {
    // 20:30 UTC on Sunday is 01:30 on Monday in Tashkent.
    assert.deepEqual(zonedClock(new Date("2026-10-04T20:30:00Z"), TZ), { weekday: 1, minutes: 90 });
  });

  it("fails loudly on an unknown time zone", () => {
    assert.throws(() => zonedClock(new Date(), "Mars/Olympus"), RangeError);
  });
});

describe("weeklyIntervals", () => {
  it("merges back-to-back intervals", () => {
    const rules = [
      { days: [1], opens: "09:00", closes: "14:00" },
      { days: [1], opens: "14:00", closes: "18:00" },
    ];
    assert.deepEqual(weeklyIntervals(rules), [[540, 1080]]);
  });

  it("treats equal open and close times as open around the clock", () => {
    assert.deepEqual(weeklyIntervals([{ days: [3], opens: "00:00", closes: "00:00" }]), [[2880, 4320]]);
  });

  it("rejects weekdays outside 1–7", () => {
    assert.throws(() => weeklyIntervals([{ days: [0], opens: "09:00", closes: "18:00" }]), RangeError);
  });
});

describe("getOpenStatus — daily 09:00–23:00", () => {
  it("is open in the middle of the day", () => {
    assert.deepEqual(status("2026-10-05T12:00:00"), { state: "open", closesAt: "23:00" });
  });

  it("opens exactly at the opening time", () => {
    assert.equal(status("2026-10-05T09:00:00").state, "open");
  });

  it("warns during the last hour", () => {
    assert.deepEqual(status("2026-10-05T22:00:00"), { state: "closing-soon", closesAt: "23:00" });
    assert.equal(status("2026-10-05T21:59:00").state, "open");
  });

  it("respects a custom warning window", () => {
    assert.equal(status("2026-10-05T22:00:00", DAILY, { soonMinutes: 30 }).state, "open");
  });

  it("is closed exactly at the closing time and opens tomorrow", () => {
    assert.deepEqual(status("2026-10-05T23:00:00"), {
      state: "closed",
      opensAt: "09:00",
      inDays: 1,
      weekday: 2,
    });
  });

  it("is closed early in the morning and opens later today", () => {
    assert.deepEqual(status("2026-10-05T07:15:00"), {
      state: "closed",
      opensAt: "09:00",
      inDays: 0,
      weekday: 1,
    });
  });

  it("wraps from Sunday night to Monday morning", () => {
    assert.deepEqual(status("2026-10-11T23:30:00"), {
      state: "closed",
      opensAt: "09:00",
      inDays: 1,
      weekday: 1,
    });
  });
});

describe("getOpenStatus — other schedules", () => {
  it("handles hours that run past midnight", () => {
    const late = [{ days: [5], opens: "18:00", closes: "02:00" }]; // Friday night
    assert.deepEqual(status("2026-10-10T01:00:00", late), { state: "closing-soon", closesAt: "02:00" }); // Saturday
    assert.deepEqual(status("2026-10-09T23:00:00", late), { state: "open", closesAt: "02:00" });
  });

  it("handles Sunday hours that spill into Monday", () => {
    const sunday = [{ days: [7], opens: "20:00", closes: "03:00" }];
    assert.deepEqual(status("2026-10-05T01:00:00", sunday), { state: "open", closesAt: "03:00" });
  });

  it("names the weekday when the next opening is days away", () => {
    const weekend = [{ days: [6, 7], opens: "10:00", closes: "20:00" }];
    const result = status("2026-10-06T12:00:00", weekend); // Tuesday
    assert.deepEqual(result, { state: "closed", opensAt: "10:00", inDays: 4, weekday: 6 });
    assert.equal(describeStatus(result), "Закрыто, откроется в субботу в 10:00");
  });

  it("returns unknown when there are no hours at all", () => {
    assert.deepEqual(status("2026-10-05T12:00:00", []), { state: "unknown" });
  });
});

describe("describeStatus", () => {
  it("phrases every state in Russian", () => {
    assert.equal(describeStatus({ state: "open", closesAt: "23:00" }), "Открыто до 23:00");
    assert.equal(describeStatus({ state: "closing-soon", closesAt: "23:00" }), "Скоро закроется — в 23:00");
    assert.equal(
      describeStatus({ state: "closed", opensAt: "09:00", inDays: 0, weekday: 1 }),
      "Закрыто, откроется в 09:00",
    );
    assert.equal(
      describeStatus({ state: "closed", opensAt: "09:00", inDays: 1, weekday: 2 }),
      "Закрыто, откроется завтра в 09:00",
    );
    assert.equal(
      describeStatus({ state: "closed", opensAt: "09:00", inDays: 2, weekday: 2 }),
      "Закрыто, откроется во вторник в 09:00",
    );
  });

  it("says nothing when the status is unknown", () => {
    assert.equal(describeStatus({ state: "unknown" }), null);
  });
});

describe("summarizeHours", () => {
  it("says «Ежедневно» for the same hours every day", () => {
    assert.deepEqual(summarizeHours(DAILY), [{ days: "Ежедневно", time: "09:00–23:00" }]);
  });

  it("groups runs of days and lists short ones", () => {
    const rules = [
      { days: [1, 2, 3, 4, 5], opens: "10:00", closes: "22:00" },
      { days: [6, 7], opens: "09:00", closes: "23:00" },
    ];
    assert.deepEqual(summarizeHours(rules), [
      { days: "Пн–Пт", time: "10:00–22:00" },
      { days: "Сб, Вс", time: "09:00–23:00" },
    ]);
  });

  it("merges rules with the same hours and handles gaps", () => {
    const rules = [
      { days: [1, 2, 3], opens: "10:00", closes: "22:00" },
      { days: [5], opens: "10:00", closes: "22:00" },
    ];
    assert.deepEqual(summarizeHours(rules), [{ days: "Пн–Ср, Пт", time: "10:00–22:00" }]);
  });
});
