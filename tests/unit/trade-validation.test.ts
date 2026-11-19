import { describe, expect, it } from "vitest";

import { signedMoney, tradeSchema, type TradeInput } from "@/lib/validation/trades";

const base: TradeInput = {
  accountId: "6f1c1f3e-8f7a-4d0b-9a6e-2f1b3c4d5e6f",
  symbol: "NQ",
  direction: "long",
  entryTime: "2026-11-16T14:30",
  entryPrice: "21,480",
  pnlAmount: "391.60",
  pnlSide: "profit",
  rr: "2.5",
  stopLoss: "",
  takeProfit: "",
  strategy: " ORB ",
  tags: "A+ setup, patient, A+ setup,",
  notes: "",
  rating: "4",
};

describe("tradeSchema", () => {
  it("normalises a valid closed trade", () => {
    const r = tradeSchema.parse(base);
    expect(r.symbol).toBe("NQ");
    expect(r.entryPrice).toBe("21480");
    expect(r.netPnl).toBe("391.60");
    expect(r.stopLoss).toBeNull(); // no SL size
    expect(r.strategy).toBe("ORB");
    expect(r.tags).toEqual(["A+ setup", "patient"]);
    expect(r.notes).toBeNull();
    expect(r.rating).toBe(4);
    // The form-only fields don't reach the server row.
    expect(r).not.toHaveProperty("pnlAmount");
    expect(r).not.toHaveProperty("pnlSide");
  });

  it("turns a loss into a negative amount", () => {
    expect(tradeSchema.parse({ ...base, pnlAmount: "1,250.5", pnlSide: "loss" }).netPnl).toBe(
      "-1250.5",
    );
  });

  it("signs the Trade RR like the P&L", () => {
    expect(tradeSchema.parse(base).rMultiple).toBe("2.5");
    expect(tradeSchema.parse({ ...base, pnlSide: "loss", rr: "1" }).rMultiple).toBe("-1");
    expect(tradeSchema.parse({ ...base, rr: " 1.5R " }).rMultiple).toBe("1.5");
    expect(tradeSchema.parse({ ...base, rr: "" }).rMultiple).toBeNull();
  });

  it("rejects a Trade RR that doesn't fit the result", () => {
    const issue = (v: Partial<TradeInput>) => {
      const r = tradeSchema.safeParse({ ...base, ...v });
      return r.success ? null : r.error.issues[0];
    };
    expect(issue({ pnlAmount: "" })?.message).toMatch(/profit or loss first/);
    expect(issue({ pnlAmount: "0", rr: "2" })?.message).toMatch(/breakeven trade is 0R/);
    expect(issue({ rr: "0" })?.message).toMatch(/Only a breakeven/);
    expect(issue({ rr: "-2" })?.path).toEqual(["rr"]);
    expect(issue({ rr: "1000" })?.path).toEqual(["rr"]);
  });

  describe("SL and TP (exit) prices", () => {
    // NQ long at 21480, SL 21460 (20 points), out at TP 21530 (+50 points) = +2.5R
    const withLevels = { ...base, stopLoss: "21460", takeProfit: "21530", rr: "" };

    it("works out the RR from the prices when none is typed", () => {
      const win = tradeSchema.parse(withLevels);
      expect(win.stopLoss).toBe("21460");
      expect(win.takeProfit).toBe("21530");
      expect(win.rMultiple).toBe("2.50");
      // Out below the entry: a partial loss.
      const loss = tradeSchema.parse({ ...withLevels, takeProfit: "21470", pnlSide: "loss" });
      expect(loss.rMultiple).toBe("-0.50");
    });

    it("loss without a TP = SL hit (−1R)", () => {
      const r = tradeSchema.parse({ ...withLevels, takeProfit: "", pnlSide: "loss" });
      expect(r.rMultiple).toBe("-1.00");
    });

    it("keeps a typed RR", () => {
      expect(tradeSchema.parse({ ...withLevels, rr: "1.2" }).rMultiple).toBe("1.2");
    });

    it("flags a TP that disagrees with the Profit/Loss choice", () => {
      const r = tradeSchema.safeParse({ ...withLevels, pnlSide: "loss" });
      expect(!r.success && r.error.issues[0].path).toEqual(["pnlSide"]);
      expect(!r.success && r.error.issues[0].message).toMatch(/win \(\+2.50R\)/);
    });

    it.each([
      ["long", "21500", /must be below/],
      ["short", "21400", /must be above/],
      ["long", "21480", /can't equal/],
    ] as const)("%s: rejects the SL at %s", (direction, stopLoss, message) => {
      const r = tradeSchema.safeParse({
        ...withLevels,
        direction,
        takeProfit: "",
        stopLoss,
      });
      expect(!r.success && r.error.issues[0].path).toEqual(["stopLoss"]);
      expect(!r.success && r.error.issues[0].message).toMatch(message);
    });
  });

  it("treats zero as breakeven, never -0", () => {
    expect(tradeSchema.parse({ ...base, pnlAmount: "0.00", pnlSide: "loss", rr: "" }).netPnl).toBe(
      "0",
    );
    expect(signedMoney("0", "loss")).toBe("0");
  });

  it("accepts an open trade (no P&L)", () => {
    const r = tradeSchema.parse({ ...base, pnlAmount: "", rr: "" });
    expect(r.netPnl).toBeNull();
  });

  it("keeps high-precision prices as exact strings", () => {
    const r = tradeSchema.parse({ ...base, entryPrice: "1.08765432" });
    expect(r.entryPrice).toBe("1.08765432");
  });

  it.each([
    ["symbol", "AAPL"],
    ["symbol", "nq"],
    ["entryPrice", "0"],
    ["entryPrice", "-5"],
    ["stopLoss", "abc"],
    ["takeProfit", "-1"],
    ["pnlAmount", "-20"],
    ["pnlAmount", "12.345"],
    ["pnlAmount", "abc"],
    ["pnlSide", "maybe"],
    ["rating", "6"],
  ] as const)("rejects %s = %j", (field, value) => {
    expect(tradeSchema.safeParse({ ...base, [field]: value }).success).toBe(false);
  });

  it("limits tags and notes", () => {
    const tags = Array.from({ length: 21 }, (_, i) => `t${i}`).join(",");
    expect(tradeSchema.safeParse({ ...base, tags }).success).toBe(false);
    expect(tradeSchema.safeParse({ ...base, notes: "x".repeat(5001) }).success).toBe(false);
  });
});
