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
    expect(r.stopLoss).toBeNull();
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
    // Breakeven is always 0R (a typed RR is ignored).
    expect(tradeSchema.parse({ ...base, pnlAmount: "0", rr: "2" }).rMultiple).toBe("0");
    expect(issue({ rr: "0" })?.message).toMatch(/Only a breakeven/);
    expect(issue({ rr: "-2" })?.path).toEqual(["rr"]);
    expect(issue({ rr: "1000" })?.path).toEqual(["rr"]);
  });

  describe("SL and TP prices (win = out at TP, loss = out at SL)", () => {
    // NQ long at 21480, SL 21460 (20 points), TP 21530 (50 points)
    const withLevels = { ...base, stopLoss: "21460", takeProfit: "21530", rr: "" };

    it("calculates the RR from the prices, ignoring a typed RR", () => {
      const win = tradeSchema.parse({ ...withLevels, rr: "9" });
      expect(win.stopLoss).toBe("21460");
      expect(win.takeProfit).toBe("21530");
      expect(win.rMultiple).toBe("2.50");
      expect(tradeSchema.parse({ ...withLevels, pnlSide: "loss" }).rMultiple).toBe("-1.00");
    });

    it("uses a typed RR when the prices can't give one", () => {
      expect(tradeSchema.parse({ ...withLevels, takeProfit: "", rr: "1.2" }).rMultiple).toBe("1.2");
    });

    it("no RR for an open trade", () => {
      expect(tradeSchema.parse({ ...withLevels, pnlAmount: "" }).rMultiple).toBeNull();
    });

    it.each([
      ["long", "stopLoss", "21500", /SL must be below/],
      ["long", "takeProfit", "21400", /TP must be above/],
      ["short", "stopLoss", "21400", /SL must be above/],
      ["short", "takeProfit", "21500", /TP must be below/],
      ["long", "stopLoss", "21480", /can't equal/],
    ] as const)("%s: rejects %s at %s", (direction, field, value, message) => {
      const r = tradeSchema.safeParse({
        ...withLevels,
        direction,
        ...(direction === "short" ? { stopLoss: "21500", takeProfit: "21430" } : {}),
        [field]: value,
      });
      expect(!r.success && r.error.issues[0].path).toEqual([field]);
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
