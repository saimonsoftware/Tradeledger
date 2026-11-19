import { describe, expect, it } from "vitest";

import { accountSchema, transactionSchema } from "@/lib/validation/accounts";
import { moneyString, moneyToNumber } from "@/lib/validation/money";

describe("moneyString", () => {
  it.each([
    ["1000", "1000"],
    ["1,250.50", "1250.50"],
    [" 0.5 ", "0.5"],
    ["9999999999999.99", "9999999999999.99"],
  ])("accepts %j", (input, expected) => {
    expect(moneyString.parse(input)).toBe(expected);
  });

  it.each(["", "-5", "1.234", "abc", "1e5", "12345678901234"])("rejects %j", (input) => {
    expect(moneyString.safeParse(input).success).toBe(false);
  });

  it("converts the largest allowed values exactly (no float drift)", () => {
    for (const s of ["9999999999999.99", "1234567890123.45", "0.01", "100000.10"]) {
      expect(moneyToNumber(s).toFixed(2)).toBe(Number(s).toFixed(2));
      expect(moneyToNumber(s).toFixed(2)).toBe(
        s.includes(".") ? s.padEnd(s.indexOf(".") + 3, "0") : s + ".00",
      );
    }
  });
});

describe("accountSchema", () => {
  const valid = {
    name: "  FTMO 100k ",
    broker: "",
    accountType: "prop_challenge",
    currency: "USD",
    startingBalance: "100,000",
    startDate: "2026-11-01",
  };

  it("accepts and normalises a valid account", () => {
    const r = accountSchema.parse(valid);
    expect(r.name).toBe("FTMO 100k");
    expect(r.broker).toBeNull();
    expect(r.startingBalance).toBe("100000");
  });

  it("rejects unknown account types and currencies", () => {
    expect(accountSchema.safeParse({ ...valid, accountType: "margin" }).success).toBe(false);
    expect(accountSchema.safeParse({ ...valid, currency: "XYZ" }).success).toBe(false);
  });

  it("rejects bad dates", () => {
    expect(accountSchema.safeParse({ ...valid, startDate: "2026-13-01" }).success).toBe(false);
    expect(accountSchema.safeParse({ ...valid, startDate: "1980-01-01" }).success).toBe(false);
  });
});

describe("transactionSchema", () => {
  const valid = {
    accountId: "6f1c1f3e-8f7a-4d0b-9a6e-2f1b3c4d5e6f",
    type: "deposit",
    amount: "500",
    date: "2026-11-19",
  };

  it("accepts a valid deposit", () => {
    expect(transactionSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects zero amounts and invalid account ids", () => {
    expect(transactionSchema.safeParse({ ...valid, amount: "0" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...valid, accountId: "not-a-uuid" }).success).toBe(false);
  });
});
