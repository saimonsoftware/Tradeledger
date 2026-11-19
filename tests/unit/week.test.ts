import { describe, expect, it } from "vitest";

import { isInWeek, lastNDays, localDateKey, weekRange } from "@/lib/calculations/week";

const at = (iso: string) => new Date(iso);

describe("weekRange: Monday 00:00 → next Monday 00:00 in the user's timezone", () => {
  it("Dublin in winter (UTC+0)", () => {
    const w = weekRange(at("2026-11-19T12:00:00Z"), "Europe/Dublin"); // Thursday
    expect(w.days).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
    ]);
    expect(w.start.toISOString()).toBe("2026-11-16T00:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-11-23T00:00:00.000Z");
  });

  it("New York (UTC−5): local midnight is 05:00 UTC", () => {
    const w = weekRange(at("2026-11-19T12:00:00Z"), "America/New_York");
    expect(w.start.toISOString()).toBe("2026-11-16T05:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-11-23T05:00:00.000Z");
  });

  it("Auckland (UTC+13): the week starts on Sunday in UTC terms", () => {
    const w = weekRange(at("2026-11-19T12:00:00Z"), "Pacific/Auckland");
    expect(w.days[0]).toBe("2026-11-16");
    expect(w.start.toISOString()).toBe("2026-11-15T11:00:00.000Z");
  });

  it("uses the LOCAL date, not the UTC date, to find 'this week'", () => {
    // Monday 16 Nov 02:00 UTC is still Sunday 15 Nov evening in New York.
    const w = weekRange(at("2026-11-16T02:00:00Z"), "America/New_York");
    expect(w.days[0]).toBe("2026-11-09");
  });

  it("Sunday 23:59 is still this week; Monday 00:00 starts the next", () => {
    expect(weekRange(at("2026-11-22T23:59:59Z"), "Europe/Dublin").days[0]).toBe("2026-11-16");
    expect(weekRange(at("2026-11-23T00:00:00Z"), "Europe/Dublin").days[0]).toBe("2026-11-23");
  });

  it("offset −1 gives the previous week", () => {
    const w = weekRange(at("2026-11-19T12:00:00Z"), "Europe/Dublin", -1);
    expect(w.days[0]).toBe("2026-11-09");
    expect(w.end.toISOString()).toBe("2026-11-16T00:00:00.000Z");
  });

  it("is 169 hours long in the week clocks go back (Dublin, 25 Oct 2026)", () => {
    const w = weekRange(at("2026-10-21T12:00:00Z"), "Europe/Dublin");
    expect(w.start.toISOString()).toBe("2026-10-18T23:00:00.000Z"); // Mon 00:00 IST (UTC+1)
    expect(w.end.toISOString()).toBe("2026-10-26T00:00:00.000Z"); // Mon 00:00 GMT (UTC+0)
    expect((w.end.getTime() - w.start.getTime()) / 3_600_000).toBe(169);
  });

  it("is 167 hours long in the week clocks go forward (New York, 8 Mar 2026)", () => {
    const w = weekRange(at("2026-03-04T12:00:00Z"), "America/New_York");
    expect((w.end.getTime() - w.start.getTime()) / 3_600_000).toBe(167);
  });
});

describe("a trade closed late on Sunday night", () => {
  const thisWeekDublin = weekRange(at("2026-11-19T12:00:00Z"), "Europe/Dublin");
  const thisWeekNY = weekRange(at("2026-11-19T12:00:00Z"), "America/New_York");

  it("Sunday 23:30 Dublin belongs to that week", () => {
    expect(isInWeek("2026-11-22T23:30:00Z", thisWeekDublin)).toBe(true);
  });

  it("the same instant in New York (Sunday 18:30) is also that week", () => {
    expect(isInWeek("2026-11-22T23:30:00Z", thisWeekNY)).toBe(true);
  });

  it("Sunday 22:30 in New York = Monday 03:30 UTC: this week for NY, NEXT week for Dublin", () => {
    const exit = "2026-11-23T03:30:00Z";
    expect(localDateKey(exit, "America/New_York")).toBe("2026-11-22");
    expect(isInWeek(exit, thisWeekNY)).toBe(true);
    expect(isInWeek(exit, thisWeekDublin)).toBe(false);
  });

  it("the end boundary is exclusive (Monday 00:00:00 exactly is next week)", () => {
    expect(isInWeek("2026-11-23T00:00:00Z", thisWeekDublin)).toBe(false);
    expect(isInWeek("2026-11-16T00:00:00Z", thisWeekDublin)).toBe(true);
  });
});

describe("lastNDays", () => {
  it("returns the last 30 local dates, oldest first, ending today", () => {
    const d = lastNDays(at("2026-11-19T12:00:00Z"), "Europe/Dublin", 30);
    expect(d).toHaveLength(30);
    expect(d[0]).toBe("2026-10-21");
    expect(d[29]).toBe("2026-11-19");
  });
});
