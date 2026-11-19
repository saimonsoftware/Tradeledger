import { describe, expect, it } from "vitest";

import {
  checkStop,
  movePips,
  pipsBetween,
  suggestedRr,
  tradeRrFromPrices,
} from "@/lib/calculations/rr";

describe("pipsBetween (EURUSD pips, NQ points)", () => {
  it.each([
    ["EURUSD", "1.0852", "1.0842", "10"],
    ["EURUSD", "1.0852", "1.08645", "12.5"],
    ["EURUSD", "1.0852", "1.08773", "25.3"],
    ["NQ", "21480", "21460", "20"],
    ["NQ", "21480.25", "21520", "39.75"],
  ])("%s %s ↔ %s = %s", (sym, a, b, expected) => {
    expect(pipsBetween(sym, a, b)).toBe(expected);
  });

  it("is null for unknown symbols or bad prices", () => {
    expect(pipsBetween("AAPL", "100", "99")).toBeNull();
    expect(pipsBetween("NQ", "abc", "99")).toBeNull();
    expect(pipsBetween("NQ", "100", null)).toBeNull();
  });
});

describe("movePips (signed: + in the trade's favour)", () => {
  it.each([
    ["EURUSD", "short", "1.0852", "1.0827", "25"],
    ["EURUSD", "short", "1.0852", "1.0857", "-5"],
    ["NQ", "long", "21480", "21520", "40"],
    ["NQ", "long", "21480", "21470.5", "-9.5"],
    ["NQ", "long", "21480", "21480", "0"],
  ] as const)("%s %s %s → %s = %s", (sym, dir, entry, exit, expected) => {
    expect(movePips(sym, dir, entry, exit)).toBe(expected);
  });
});

describe("checkStop", () => {
  it("long: SL below the entry; short: above", () => {
    expect(checkStop("long", "100", "95")).toBe("ok");
    expect(checkStop("long", "100", "105")).toBe("wrong-side");
    expect(checkStop("short", "100", "105")).toBe("ok");
    expect(checkStop("short", "100", "100")).toBe("at-entry");
    expect(checkStop("long", "100", null)).toBe("missing");
  });
});

describe("tradeRrFromPrices (TP = exit, exact decimal maths)", () => {
  it.each([
    ["long", "21480", "21460", "21530", "2.50"],
    ["short", "1.0852", "1.0862", "1.0827", "2.50"],
    ["short", "1.0852", "1.0862", "1.0857", "-0.50"],
    ["long", "21480", "21460", "21460", "-1.00"],
    ["long", "100", "97", "101", "0.33"],
    ["long", "100", "97", "102", "0.67"],
    ["long", "100", "92", "99", "-0.13"],
    // Floats would give 2.9999…; exact maths gives 3.
    ["long", "1.0852", "1.0851", "1.0855", "3.00"],
  ] as const)("%s entry %s SL %s TP %s = %sR", (dir, entry, sl, tp, expected) => {
    expect(tradeRrFromPrices(dir, entry, sl, tp)).toBe(expected);
  });

  it("is null without a valid SL and TP", () => {
    expect(tradeRrFromPrices("long", "100", null, "110")).toBeNull();
    expect(tradeRrFromPrices("long", "100", "105", "110")).toBeNull();
    expect(tradeRrFromPrices("long", "100", "95", null)).toBeNull();
  });
});

describe("suggestedRr (unsigned; Profit/Loss gives the sign)", () => {
  const base = {
    direction: "long" as const,
    entryPrice: "21480",
    stopLoss: "21460",
    takeProfit: "21530",
    pnlSide: "profit" as const,
    pnlAmount: "500",
  };

  it("uses the TP (exit) price when given", () => {
    expect(suggestedRr(base)).toBe("2.50");
    expect(suggestedRr({ ...base, takeProfit: "21470", pnlSide: "loss" })).toBe("0.50");
  });

  it("loss with no TP = SL hit; breakeven = 0; otherwise unknown", () => {
    expect(suggestedRr({ ...base, takeProfit: null, pnlSide: "loss" })).toBe("1.00");
    expect(suggestedRr({ ...base, pnlAmount: "0" })).toBe("0");
    expect(suggestedRr({ ...base, takeProfit: null })).toBeNull();
    expect(suggestedRr({ ...base, pnlAmount: "" })).toBeNull();
    expect(suggestedRr({ ...base, stopLoss: null, takeProfit: null, pnlSide: "loss" })).toBeNull();
  });
});
