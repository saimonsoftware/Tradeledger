import { describe, expect, it } from "vitest";

import { checkLevel, pipsBetween, plannedRr, suggestedRr } from "@/lib/calculations/rr";

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

describe("checkLevel", () => {
  it("long: SL below, TP above; short: the reverse", () => {
    expect(checkLevel("sl", "long", "100", "95")).toBe("ok");
    expect(checkLevel("sl", "long", "100", "105")).toBe("wrong-side");
    expect(checkLevel("tp", "long", "100", "110")).toBe("ok");
    expect(checkLevel("sl", "short", "100", "105")).toBe("ok");
    expect(checkLevel("tp", "short", "100", "110")).toBe("wrong-side");
    expect(checkLevel("tp", "short", "100", "100")).toBe("at-entry");
    expect(checkLevel("sl", "long", "100", null)).toBe("missing");
  });
});

describe("plannedRr (exact decimal maths)", () => {
  it.each([
    ["long", "21480", "21460", "21530", "2.50"],
    ["short", "1.0852", "1.0862", "1.0822", "3.00"],
    ["long", "100", "97", "101", "0.33"],
    ["long", "100", "97", "102", "0.67"],
    // Floats would give 2.9999…; exact maths gives 3.
    ["long", "1.0852", "1.0851", "1.0855", "3.00"],
  ] as const)("%s entry %s SL %s TP %s = 1:%s", (dir, entry, sl, tp, expected) => {
    expect(plannedRr(dir, entry, sl, tp)).toBe(expected);
  });

  it("is null when a level is missing or on the wrong side", () => {
    expect(plannedRr("long", "100", null, "110")).toBeNull();
    expect(plannedRr("long", "100", "105", "110")).toBeNull();
  });
});

describe("suggestedRr", () => {
  const base = {
    direction: "long" as const,
    entryPrice: "21480",
    stopLoss: "21460",
    takeProfit: "21530",
    pnlSide: "profit" as const,
    pnlAmount: "500",
  };

  it("profit = TP hit → planned RR; loss = SL hit → 1; breakeven → 0", () => {
    expect(suggestedRr(base)).toBe("2.50");
    expect(suggestedRr({ ...base, pnlSide: "loss" })).toBe("1.00");
    expect(suggestedRr({ ...base, pnlAmount: "0" })).toBe("0");
  });

  it("needs the P&L, and the levels it uses", () => {
    expect(suggestedRr({ ...base, pnlAmount: "" })).toBeNull();
    expect(suggestedRr({ ...base, takeProfit: null })).toBeNull();
    expect(suggestedRr({ ...base, takeProfit: null, pnlSide: "loss" })).toBe("1.00");
    expect(suggestedRr({ ...base, stopLoss: null, pnlSide: "loss" })).toBeNull();
  });
});
