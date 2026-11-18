import { describe, expect, it } from "vitest";

import { formatCurrency, formatSignedCurrency, formatSignedPercent } from "@/lib/format/currency";

describe("formatCurrency", () => {
  it("formats euros with two decimals and thousands separators", () => {
    expect(formatCurrency(104382.2)).toBe("€104,382.20");
  });

  it("uses the account's currency", () => {
    expect(formatCurrency(50, "USD")).toBe("US$50.00");
    expect(formatCurrency(50, "GBP")).toBe("£50.00");
  });
});

describe("formatSignedCurrency", () => {
  it("prefixes gains with + and losses with a true minus sign", () => {
    expect(formatSignedCurrency(1240.5)).toBe("+€1,240.50");
    expect(formatSignedCurrency(-310)).toBe("−€310.00");
  });

  it("shows breakeven without a sign", () => {
    expect(formatSignedCurrency(0)).toBe("€0.00");
  });
});

describe("formatSignedPercent", () => {
  it("formats signed percentages", () => {
    expect(formatSignedPercent(1.836)).toBe("+1.84%");
    expect(formatSignedPercent(-0.5)).toBe("−0.50%");
    expect(formatSignedPercent(0)).toBe("0.00%");
  });
});
