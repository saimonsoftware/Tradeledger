import { describe, expect, it } from "vitest";

import { tradeSchema, type TradeInput } from "@/lib/validation/trades";

const base: TradeInput = {
  accountId: "6f1c1f3e-8f7a-4d0b-9a6e-2f1b3c4d5e6f",
  symbol: " nq ",
  assetClass: "future",
  direction: "long",
  entryTime: "2026-11-16T14:30",
  entryPrice: "21,480",
  quantity: "2",
  multiplier: "20",
  exitTime: "2026-11-16T15:00",
  exitPrice: "21500",
  fees: "",
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
    expect(r.fees).toBe("0");
    expect(r.stopLoss).toBeNull();
    expect(r.strategy).toBe("ORB");
    expect(r.tags).toEqual(["A+ setup", "patient"]);
    expect(r.notes).toBeNull();
    expect(r.rating).toBe(4);
  });

  it("keeps high-precision values as exact strings", () => {
    const r = tradeSchema.parse({
      ...base,
      entryPrice: "1234567890.12345678",
      exitTime: "",
      exitPrice: "",
    });
    expect(r.entryPrice).toBe("1234567890.12345678");
  });

  it("accepts an open trade (no exit)", () => {
    const r = tradeSchema.parse({ ...base, exitTime: "", exitPrice: "" });
    expect(r.exitTime).toBeNull();
    expect(r.exitPrice).toBeNull();
  });

  it("requires exit price and exit time together", () => {
    const a = tradeSchema.safeParse({ ...base, exitPrice: "" });
    const b = tradeSchema.safeParse({ ...base, exitTime: "" });
    expect(!a.success && a.error.issues[0].path).toEqual(["exitPrice"]);
    expect(!b.success && b.error.issues[0].path).toEqual(["exitTime"]);
  });

  it("rejects exit before entry", () => {
    const r = tradeSchema.safeParse({ ...base, exitTime: "2026-11-16T14:00" });
    expect(!r.success && r.error.issues[0].message).toMatch(/before entry/);
  });

  it.each([
    ["entryPrice", "0"],
    ["entryPrice", "-5"],
    ["quantity", "abc"],
    ["multiplier", "0"],
    ["fees", "-1"],
    ["symbol", "NQ!"],
    ["rating", "6"],
    ["assetClass", "bond"],
  ] as const)("rejects %s = %j", (field, value) => {
    expect(tradeSchema.safeParse({ ...base, [field]: value }).success).toBe(false);
  });

  it("limits tags and notes", () => {
    const tags = Array.from({ length: 21 }, (_, i) => `t${i}`).join(",");
    expect(tradeSchema.safeParse({ ...base, tags }).success).toBe(false);
    expect(tradeSchema.safeParse({ ...base, notes: "x".repeat(5001) }).success).toBe(false);
  });
});
