import { describe, expect, it } from "vitest";

import {
  computeInsightStats,
  groupStats,
  type GroupStats,
  holdingBucket,
  MIN_SAMPLE,
  sessionOf,
  type StatTrade,
} from "@/lib/insights/stats";

const t = (over: Partial<StatTrade>): StatTrade => ({
  symbol: "NQ",
  direction: "long",
  assetClass: "future",
  strategy: "ORB",
  tags: [],
  rating: null,
  entryTime: "2026-11-16T14:30:00Z", // Monday
  exitTime: "2026-11-16T14:45:00Z",
  netPnl: 100,
  rMultiple: 1,
  currency: "USD",
  ...over,
});

describe("groupStats", () => {
  it("counts wins/losses/breakeven, win rate and average R", () => {
    const g = groupStats("x", [
      t({ netPnl: 200, rMultiple: 2 }),
      t({ netPnl: -100, rMultiple: -1 }),
      t({ netPnl: 0, rMultiple: 0 }),
      t({ netPnl: 50, rMultiple: null }),
    ]);
    expect(g).toMatchObject({
      trades: 4,
      wins: 2,
      losses: 1,
      breakeven: 1,
      winRate: 0.5,
      avgR: 0.33,
      rCount: 3,
    });
  });

  it("sums money per currency in cents (no float drift, no mixing currencies)", () => {
    const g = groupStats("x", [
      t({ netPnl: 0.1 }),
      t({ netPnl: 0.2 }),
      t({ netPnl: 10, currency: "EUR" }),
    ]);
    expect(g.netByCurrency).toEqual({ USD: 0.3, EUR: 10 });
  });

  it(`flags groups under ${MIN_SAMPLE} trades as small samples`, () => {
    expect(groupStats("x", [t({}), t({})]).smallSample).toBe(true);
    expect(
      groupStats(
        "x",
        Array.from({ length: MIN_SAMPLE }, () => t({})),
      ).smallSample,
    ).toBe(false);
  });
});

describe("holdingBucket", () => {
  it.each([
    ["2026-11-16T14:30:00Z", "2026-11-16T14:32:00Z", "under 5 min"],
    ["2026-11-16T14:30:00Z", "2026-11-16T14:50:00Z", "5–30 min"],
    ["2026-11-16T14:30:00Z", "2026-11-16T15:45:00Z", "30 min–2 h"],
    ["2026-11-16T14:30:00Z", "2026-11-16T20:00:00Z", "2 h–1 day"],
    ["2026-11-16T14:30:00Z", "2026-11-18T14:30:00Z", "over 1 day"],
  ])("%s → %s = %s", (a, b, expected) => {
    expect(holdingBucket(a, b)).toBe(expected);
  });

  it("skips trades without a real exit time (exit = entry)", () => {
    expect(holdingBucket("2026-11-16T14:30:00Z", "2026-11-16T14:30:00Z")).toBeNull();
    const s = computeInsightStats(
      [t({ exitTime: "2026-11-16T14:30:00Z" }), t({ exitTime: "2026-11-16T14:30:00Z" })],
      "UTC",
    );
    expect(s.byHoldingTime).toEqual([]);
  });
});

describe("sessionOf (New York time, daylight saving aware)", () => {
  it.each([
    // November: New York is UTC-5
    ["2026-11-16T14:30:00Z", "New York AM"], // 09:30 NY
    ["2026-11-16T18:00:00Z", "New York PM"], // 13:00 NY
    ["2026-11-16T09:00:00Z", "London"], // 04:00 NY
    ["2026-11-16T03:00:00Z", "Asia"], // 22:00 NY
    ["2026-11-16T22:30:00Z", "After hours"], // 17:30 NY
    // July: New York is UTC-4, so 13:30 UTC is still 09:30 NY
    ["2026-07-13T13:30:00Z", "New York AM"],
  ])("%s → %s", (iso, expected) => {
    expect(sessionOf(iso)).toBe(expected);
  });
});

describe("strategy combinations", () => {
  it("shows where and when each setup works", () => {
    const s = computeInsightStats(
      [
        t({ strategy: "ORB", symbol: "NQ", netPnl: 200, rMultiple: 2 }),
        t({ strategy: "ORB", symbol: "NQ", netPnl: 100, rMultiple: 1 }),
        t({ strategy: "ORB", symbol: "EURUSD", netPnl: -50, rMultiple: -1, direction: "short" }),
        t({ strategy: null, symbol: "EURUSD", netPnl: 10, entryTime: "2026-11-16T09:00:00Z" }),
      ],
      "UTC",
    );
    const key = (g: GroupStats[]) => Object.fromEntries(g.map((x) => [x.key, x]));
    const bySym = key(s.byStrategySymbol);
    expect(bySym["ORB · NQ"]).toMatchObject({ trades: 2, wins: 2, avgR: 1.5 });
    expect(bySym["ORB · EURUSD"]).toMatchObject({ trades: 1, losses: 1, avgR: -1 });
    expect(bySym["(no strategy) · EURUSD"].trades).toBe(1);
    expect(key(s.byStrategyDirection)["ORB · short"].trades).toBe(1);
    expect(key(s.byStrategySession)["ORB · New York AM"].trades).toBe(3);
    expect(s.bySession.map((g) => g.key)).toEqual(["London", "New York AM"]);
    expect(s.definitions.sessions).toMatch(/New York time/);
  });
});

describe("computeInsightStats", () => {
  const trades: StatTrade[] = [
    t({
      strategy: "ORB",
      tags: ["A+ setup"],
      netPnl: 300,
      rMultiple: 3,
      entryTime: "2026-11-16T14:30:00Z",
      exitTime: "2026-11-16T15:00:00Z",
      rating: 5,
    }),
    t({
      strategy: "ORB",
      tags: ["A+ setup", "patient"],
      netPnl: 200,
      rMultiple: 2,
      entryTime: "2026-11-17T14:30:00Z",
      exitTime: "2026-11-17T15:00:00Z",
      rating: 4,
    }),
    t({
      strategy: "VWAP",
      tags: ["FOMO"],
      netPnl: -100,
      rMultiple: -1,
      entryTime: "2026-11-20T15:00:00Z",
      exitTime: "2026-11-20T15:10:00Z",
      rating: 2,
    }),
    // Taken right after the VWAP loss: the "revenge" pattern
    t({
      strategy: "VWAP",
      tags: ["revenge"],
      netPnl: -150,
      rMultiple: -1.5,
      entryTime: "2026-11-20T15:20:00Z",
      exitTime: "2026-11-20T15:25:00Z",
      rating: 1,
    }),
    t({
      strategy: null,
      direction: "short",
      currency: "EUR",
      netPnl: 50,
      rMultiple: null,
      entryTime: "2026-11-21T09:00:00Z",
      exitTime: "2026-11-21T09:30:00Z",
    }),
  ];
  const s = computeInsightStats(trades, "America/New_York");

  it("overall numbers", () => {
    expect(s.overall).toMatchObject({
      trades: 5,
      wins: 3,
      losses: 2,
      winRate: 0.6,
      avgWinR: 2.5,
      avgLossR: -1.25,
    });
    expect(s.overall.netByCurrency).toEqual({ USD: 250, EUR: 50 });
    expect(s.overall.profitFactorByCurrency).toEqual({ USD: 2, EUR: null }); // 500 / 250; EUR has no losses
    expect(s.overall).toMatchObject({ longestWinStreak: 2, longestLossStreak: 2 });
  });

  it("groups by strategy, with trades lacking one labelled", () => {
    const orb = s.byStrategy.find((g) => g.key === "ORB")!;
    const vwap = s.byStrategy.find((g) => g.key === "VWAP")!;
    expect(orb).toMatchObject({ trades: 2, winRate: 1, avgR: 2.5 });
    expect(vwap).toMatchObject({ trades: 2, winRate: 0, avgR: -1.25 });
    expect(s.byStrategy.some((g) => g.key === "(no strategy)")).toBe(true);
  });

  it("counts a trade once per tag (a trade can have several)", () => {
    expect(s.byTag.find((g) => g.key === "A+ setup")).toMatchObject({ trades: 2, avgR: 2.5 });
    expect(s.byTag.find((g) => g.key === "patient")).toMatchObject({ trades: 1 });
  });

  it("weekday and hour use the user's timezone, in calendar order", () => {
    // 2026-11-21T09:00Z is Saturday 04:00 in New York
    expect(s.byWeekday.map((g) => g.key)).toEqual(["Mon", "Tue", "Fri", "Sat"]);
    expect(s.byHour.map((g) => g.key)).toContain("04:00");
  });

  it("detects how trades after a loss perform", () => {
    // After the VWAP loss → the revenge trade (loss); after the revenge loss → the EUR trade (win, no R).
    expect(s.afterLoss).toMatchObject({ trades: 2, wins: 1, losses: 1, avgR: -1.5, rCount: 1 });
    expect(s.afterWin).toMatchObject({ trades: 2 }); // after ORB #1 → ORB #2; after ORB #2 → VWAP loss
  });

  it("execution rating vs results", () => {
    expect(s.byRating.find((g) => g.key === "5★")).toMatchObject({ winRate: 1 });
    expect(s.byRating.find((g) => g.key === "1★")).toMatchObject({ winRate: 0 });
  });

  it("handles no trades", () => {
    const empty = computeInsightStats([], "UTC");
    expect(empty.overall).toMatchObject({ trades: 0, winRate: 0, avgR: null });
    expect(empty.afterLoss).toBeNull();
  });
});
