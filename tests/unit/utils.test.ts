import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

// Sanity test proving the test runner and "@/..." imports work.
// Real tests (P&L maths, week boundaries, data isolation) arrive in later phases.
describe("cn", () => {
  it("merges class names and resolves Tailwind conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", false && "hidden", "font-medium")).toBe("text-sm font-medium");
  });
});
