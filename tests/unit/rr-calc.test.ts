import { describe, expect, it } from "vitest";

import { slSizeFromStop, stopLossPrice, tradeRr } from "@/lib/calculations/rr";

describe("stopLossPrice", () => {
  it.each([
    ["EURUSD", "long", "1.0852", "10", "1.0842"],
    ["EURUSD", "short", "1.0852", "12.5", "1.08645"],
    ["NQ", "long", "21480.25", "20", "21460.25"],
    ["NQ", "short", "21480", "7.5", "21487.5"],
  ] as const)("%s %s @ %s, SL %s → %s", (sym, dir, entry, sl, expected) => {
    expect(stopLossPrice(sym, dir, entry, sl)).toBe(expected);
  });

  it("returns null for a stop at or below zero, or bad input", () => {
    expect(stopLossPrice("EURUSD", "long", "1.0852", "10852")).toBeNull();
    expect(stopLossPrice("NQ", "long", "abc", "20")).toBeNull();
    expect(stopLossPrice("NQ", "long", "21480", "0")).toBeNull();
  });
});

describe("tradeRr (exact decimal maths)", () => {
  it.each([
    ["NQ", "long", "21480", "21520", "20", "2.00"],
    ["NQ", "long", "21480", "21470", "20", "-0.50"],
    ["NQ", "short", "21480", "21440", "20", "2.00"],
    ["EURUSD", "long", "1.0852", "1.0877", "10", "2.50"],
    ["EURUSD", "short", "1.0852", "1.0862", "10", "-1.00"],
    // Rounds half away from zero: 1/3 → 0.33, 2/3 → 0.67, 0.125 → 0.13
    ["NQ", "long", "100", "101", "3", "0.33"],
    ["NQ", "long", "100", "102", "3", "0.67"],
    ["NQ", "long", "100", "101", "8", "0.13"],
    ["NQ", "long", "100", "99", "8", "-0.13"],
    ["NQ", "long", "100", "100", "8", "0.00"],
  ] as const)("%s %s %s → %s, SL %s = %sR", (sym, dir, entry, exit, sl, expected) => {
    expect(tradeRr(sym, dir, entry, exit, sl)).toBe(expected);
  });

  it("is exact where floating point is not (0.1 + 0.2 style prices)", () => {
    // (1.0855 − 1.0852) / 0.0003 is exactly 1, but floats give 0.99999…
    expect(tradeRr("EURUSD", "long", "1.0852", "1.0855", "3")).toBe("1.00");
  });
});

describe("slSizeFromStop (edit form)", () => {
  it("turns a stored stop price back into pips/points", () => {
    expect(slSizeFromStop("EURUSD", "1.0852", "1.0842")).toBe("10");
    expect(slSizeFromStop("EURUSD", "1.0852", "1.08645")).toBe("12.5");
    expect(slSizeFromStop("NQ", "21480", "21460")).toBe("20");
    expect(slSizeFromStop("NQ", "21480", null)).toBe("");
    expect(slSizeFromStop("AAPL", "100", "99")).toBe("");
  });
});
