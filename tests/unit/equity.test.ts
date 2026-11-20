import { describe, expect, it } from "vitest";

import { buildEquityCurve, daysBetween, type EquityAccount } from "@/lib/calculations/equity";

describe("daysBetween", () => {
  it("lists every day inclusive, across month ends", () => {
    expect(daysBetween("2026-10-30", "2026-11-02")).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
    expect(daysBetween("2026-11-02", "2026-11-01")).toEqual([]);
  });
});

describe("buildEquityCurve", () => {
  // Started with 10,000.00 on Nov 1: +500 trade on the 2nd, +1,000 deposit on the 3rd,
  // −300 trade on the 4th, +100 trade on the 5th → current balance 11,300.00.
  const account: EquityAccount = {
    currentCents: 1_130_000,
    startDate: "2026-11-01",
    changes: [
      { day: "2026-11-02", cents: 50_000, kind: "trade" },
      { day: "2026-11-03", cents: 100_000, kind: "flow" },
      { day: "2026-11-04", cents: -30_000, kind: "trade" },
      { day: "2026-11-05", cents: 10_000, kind: "trade" },
    ],
  };
  const days = daysBetween("2026-11-01", "2026-11-05");

  it("rebuilds the balance at the end of each day", () => {
    const { points } = buildEquityCurve(days, [account]);
    expect(points.map((p) => p.balanceCents)).toEqual([
      1_000_000, 1_050_000, 1_150_000, 1_120_000, 1_130_000,
    ]);
    expect(points[1]).toMatchObject({ pnlCents: 50_000, trades: 1, flowCents: 0 });
    expect(points[2]).toMatchObject({ pnlCents: 0, trades: 0, flowCents: 100_000 });
  });

  it("knows the balance before the first day, so day one draws a line", () => {
    // Account started today with 10,000 and a +500 trade today → current 10,500.
    const today: EquityAccount = {
      currentCents: 1_050_000,
      startDate: "2026-11-20",
      changes: [{ day: "2026-11-20", cents: 50_000, kind: "trade" }],
    };
    const curve = buildEquityCurve(["2026-11-20"], [today]);
    expect(curve.startBalanceCents).toBe(1_000_000);
    expect(curve.points[0].balanceCents).toBe(1_050_000);
    // Mid-history range: start = balance at the end of the day before.
    expect(buildEquityCurve(days.slice(2), [account]).startBalanceCents).toBe(1_050_000);
  });

  it("P&L and drawdown ignore deposits and withdrawals", () => {
    const curve = buildEquityCurve(days, [account]);
    expect(curve.pnlCents).toBe(30_000); // +500 − 300 + 100
    expect(curve.maxDrawdownCents).toBe(30_000); // peak +500 → +200
  });

  it("only counts an account from its start date, and adds accounts together", () => {
    const second: EquityAccount = { currentCents: 200_000, startDate: "2026-11-04", changes: [] };
    const { points } = buildEquityCurve(days, [account, second]);
    expect(points[2].balanceCents).toBe(1_150_000);
    expect(points[3].balanceCents).toBe(1_120_000 + 200_000);
  });

  it("no drawdown when P&L only rises; empty input is safe", () => {
    const up: EquityAccount = {
      currentCents: 300,
      startDate: "2026-11-01",
      changes: [
        { day: "2026-11-02", cents: 100, kind: "trade" },
        { day: "2026-11-03", cents: 200, kind: "trade" },
      ],
    };
    expect(buildEquityCurve(days, [up]).maxDrawdownCents).toBe(0);
    expect(buildEquityCurve([], [up])).toEqual({
      points: [],
      startBalanceCents: 0,
      pnlCents: 0,
      maxDrawdownCents: 0,
    });
  });
});

describe("niceTicks (evenly spaced axis values)", () => {
  it("uses round, even steps that cover the data", async () => {
    const { niceTicks } = await import("@/components/dashboard/equity-chart");
    expect(niceTicks(9200, 12700)).toEqual([9000, 10000, 11000, 12000, 13000]);
    expect(niceTicks(10000, 10123)).toEqual([10000, 10050, 10100, 10150]);
    // A flat line sits in the middle, between distinct ticks.
    const flat = niceTicks(10000, 10000);
    expect(flat).toEqual([9500, 10000, 10500]);
    expect(new Set(flat).size).toBe(flat.length);
    expect(flat[0]).toBeLessThan(10000);
    expect(flat[flat.length - 1]).toBeGreaterThan(10000);
  });
});
