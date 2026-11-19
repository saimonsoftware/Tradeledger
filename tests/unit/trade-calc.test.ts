import { describe, expect, it } from "vitest";

import { calcTrade, roundHalfAwayFromZero } from "@/lib/calculations/trade";

describe("calcTrade", () => {
  it("long trade: (exit − entry) × qty", () => {
    const r = calcTrade({ direction: "long", entryPrice: 100, exitPrice: 110, quantity: 10 });
    expect(r).toMatchObject({ status: "closed", grossPnl: 100, netPnl: 100, result: "win" });
  });

  it("short trade: (entry − exit) × qty", () => {
    const r = calcTrade({
      direction: "short",
      entryPrice: 200,
      exitPrice: 205,
      quantity: 100,
      fees: 1,
    });
    expect(r).toMatchObject({ grossPnl: -500, netPnl: -501, result: "loss" });
  });

  it("short trade that wins", () => {
    const r = calcTrade({ direction: "short", entryPrice: 50, exitPrice: 45, quantity: 20 });
    expect(r.netPnl).toBe(100);
  });

  it("fees are subtracted from gross", () => {
    const r = calcTrade({
      direction: "long",
      entryPrice: 10,
      exitPrice: 11,
      quantity: 100,
      fees: 2.5,
    });
    expect(r).toMatchObject({ grossPnl: 100, netPnl: 97.5 });
  });

  it("fees can turn a gross win into a net loss", () => {
    const r = calcTrade({
      direction: "long",
      entryPrice: 10,
      exitPrice: 10.01,
      quantity: 100,
      fees: 2,
    });
    expect(r).toMatchObject({ grossPnl: 1, netPnl: -1, result: "loss" });
  });

  it("futures multiplier (NQ = $20/point), matches the database test case", () => {
    const r = calcTrade({
      direction: "long",
      entryPrice: 21480,
      exitPrice: 21500,
      quantity: 2,
      multiplier: 20,
      fees: 8.4,
      stopLoss: 21470,
    });
    expect(r).toMatchObject({ grossPnl: 800, netPnl: 791.6, risk: 400, rMultiple: 1.98 });
  });

  it("R-multiple for a short: risk is |entry − stop|", () => {
    const r = calcTrade({
      direction: "short",
      entryPrice: 100,
      exitPrice: 94,
      quantity: 10,
      stopLoss: 102,
    });
    expect(r).toMatchObject({ netPnl: 60, risk: 20, rMultiple: 3 });
  });

  it("losing trade stopped out at exactly −1R (after zero fees)", () => {
    const r = calcTrade({
      direction: "long",
      entryPrice: 50,
      exitPrice: 48,
      quantity: 5,
      stopLoss: 48,
    });
    expect(r.rMultiple).toBe(-1);
  });

  it("no R-multiple without a stop, or when stop equals entry", () => {
    expect(
      calcTrade({ direction: "long", entryPrice: 1, exitPrice: 2, quantity: 1 }).rMultiple,
    ).toBeNull();
    expect(
      calcTrade({ direction: "long", entryPrice: 1, exitPrice: 2, quantity: 1, stopLoss: 1 })
        .rMultiple,
    ).toBeNull();
  });

  it("breakeven", () => {
    const r = calcTrade({
      direction: "long",
      entryPrice: 1.085,
      exitPrice: 1.085,
      quantity: 100000,
    });
    expect(r).toMatchObject({ netPnl: 0, result: "breakeven" });
  });

  it("open trade (no exit): no P&L, but risk is still shown", () => {
    const r = calcTrade({ direction: "long", entryPrice: 100, quantity: 10, stopLoss: 95 });
    expect(r).toMatchObject({
      status: "open",
      grossPnl: null,
      netPnl: null,
      result: null,
      risk: 50,
    });
  });

  it("forex decimals don't produce float noise", () => {
    // (1.0870 − 1.0850) × 100,000 = 200.00 exactly
    const r = calcTrade({
      direction: "long",
      entryPrice: 1.085,
      exitPrice: 1.087,
      quantity: 100000,
    });
    expect(r.netPnl).toBe(200);
  });

  it("crypto fractional quantities", () => {
    const r = calcTrade({
      direction: "long",
      entryPrice: 90000,
      exitPrice: 91234.56,
      quantity: 0.05,
      fees: 3.1,
    });
    expect(r.netPnl).toBe(58.63); // 61.728 − 3.10 = 58.628 → 58.63
  });
});

describe("roundHalfAwayFromZero (matches Postgres numeric rounding)", () => {
  it.each([
    [1.005, 1.01],
    [-1.005, -1.01],
    [2.675, 2.68],
    [-0.005, -0.01],
    [0.004, 0],
  ])("%d → %d", (input, expected) => {
    expect(roundHalfAwayFromZero(input)).toBe(expected);
  });
});
