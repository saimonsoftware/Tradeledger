import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { describe, expect, it } from "vitest";

import { coachReportSchema } from "@/lib/ai/report-schema";

describe("coach report schema", () => {
  it("converts to a structured-output JSON schema with the best_setup section", () => {
    const format = betaZodOutputFormat(coachReportSchema);
    const json = JSON.stringify(format);
    expect(json).toContain("best_setup");
    // Nullable: older-style "nothing to judge yet" is allowed.
    expect(json).toMatch(/"null"/);
  });

  it("accepts a report with or without a best setup", () => {
    const base = {
      headline: "h",
      whats_working: [],
      whats_costing_you: [],
      patterns: [],
      action_plan: [],
      caveats: [],
    };
    expect(coachReportSchema.safeParse({ ...base, best_setup: null }).success).toBe(true);
    expect(
      coachReportSchema.safeParse({
        ...base,
        best_setup: { title: "ORB on NQ, New York AM", detail: "d", evidence: "e" },
      }).success,
    ).toBe(true);
  });
});
