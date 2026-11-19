import { describe, expect, it } from "vitest";

import { checkLevel, pipsBetween, savedTradeResult, tradeResult } from "@/lib/calculations/rr";

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
  it("SL on the losing side, TP on the winning side", () => {
    expect(checkLevel("sl", "long", "100", "95")).toBe("ok");
    expect(checkLevel("sl", "long", "100", "105")).toBe("wrong-side");
    expect(checkLevel("tp", "long", "100", "110")).toBe("ok");
    expect(checkLevel("tp", "long", "100", "90")).toBe("wrong-side");
    expect(checkLevel("sl", "short", "100", "105")).toBe("ok");
    expect(checkLevel("tp", "short", "100", "90")).toBe("ok");
    expect(checkLevel("tp", "short", "100", "100")).toBe("at-entry");
    expect(checkLevel("sl", "long", "100", null)).toBe("missing");
  });
});

describe("tradeResult (win = out at TP, loss = out at SL)", () => {
  const nq = {
    symbol: "NQ",
    direction: "long" as const,
    entryPrice: "21480",
    stopLoss: "21460", // 20 points
    takeProfit: "21530", // 50 points
    pnlSide: "profit" as const,
    pnlAmount: "500",
  };

  it("win: RR = TP distance ÷ SL distance, pips = +TP", () => {
    expect(tradeResult(nq)).toEqual({ rr: "2.50", pips: "50" });
  });

  it("loss: −1R, pips = −SL", () => {
    expect(tradeResult({ ...nq, pnlSide: "loss" })).toEqual({ rr: "-1.00", pips: "-20" });
    // The TP isn't needed for a loss.
    expect(tradeResult({ ...nq, pnlSide: "loss", takeProfit: null })).toEqual({
      rr: "-1.00",
      pips: "-20",
    });
  });

  it("EURUSD short in pips", () => {
    expect(
      tradeResult({
        ...nq,
        symbol: "EURUSD",
        direction: "short",
        entryPrice: "1.0852",
        stopLoss: "1.0862",
        takeProfit: "1.0827",
      }),
    ).toEqual({ rr: "2.50", pips: "25" });
  });

  it("breakeven = 0R, 0 pips; open = nothing", () => {
    expect(tradeResult({ ...nq, pnlAmount: "0" })).toEqual({ rr: "0.00", pips: "0" });
    expect(tradeResult({ ...nq, pnlAmount: "" })).toEqual({ rr: null, pips: null });
  });

  it("needs valid levels (the trader can type the RR otherwise)", () => {
    expect(tradeResult({ ...nq, takeProfit: null }).rr).toBeNull();
    expect(tradeResult({ ...nq, stopLoss: null })).toEqual({ rr: null, pips: "50" });
    expect(tradeResult({ ...nq, stopLoss: "21500" }).rr).toBeNull(); // SL on the wrong side
  });

  it("rounds exactly (no floating-point drift)", () => {
    expect(tradeResult({ ...nq, entryPrice: "100", stopLoss: "97", takeProfit: "101" }).rr).toBe(
      "0.33",
    );
    expect(tradeResult({ ...nq, entryPrice: "100", stopLoss: "97", takeProfit: "102" }).rr).toBe(
      "0.67",
    );
    // (1.0855 − 1.0852) ÷ (1.0852 − 1.0851): floats give 2.9999…, exact maths gives 3.
    expect(
      tradeResult({
        ...nq,
        symbol: "EURUSD",
        entryPrice: "1.0852",
        stopLoss: "1.0851",
        takeProfit: "1.0855",
      }),
    ).toEqual({ rr: "3.00", pips: "3" });
  });
});

describe("savedTradeResult (from database rows)", () => {
  it("uses the sign of the saved P&L", () => {
    const row = {
      symbol: "NQ",
      direction: "long",
      entry_price: 21480,
      stop_loss: 21460,
      take_profit: 21530,
    };
    expect(savedTradeResult({ ...row, net_pnl: 500 })).toEqual({ rr: "2.50", pips: "50" });
    expect(savedTradeResult({ ...row, net_pnl: -200 })).toEqual({ rr: "-1.00", pips: "-20" });
    expect(savedTradeResult({ ...row, net_pnl: null })).toEqual({ rr: null, pips: null });
  });
});
