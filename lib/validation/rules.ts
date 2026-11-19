import { z } from "zod";

export const RULE_CATEGORIES = [
  "entry",
  "exit",
  "risk",
  "discipline",
  "schedule",
  "other",
] as const;
export type RuleCategory = (typeof RULE_CATEGORIES)[number];

export const RULE_CATEGORY_LABELS: Record<RuleCategory, string> = {
  entry: "Entry",
  exit: "Exit",
  risk: "Risk",
  discipline: "Discipline",
  schedule: "Schedule",
  other: "Other",
};

export const ruleSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the rule a short title")
    .max(120, "Keep the title under 120 characters"),
  description: z
    .string()
    .trim()
    .max(1000, "Keep the description under 1,000 characters")
    .optional()
    .transform((s) => s || null),
  category: z.enum(RULE_CATEGORIES, { message: "Choose a category" }),
});

export type RuleInput = z.input<typeof ruleSchema>;
export type RuleOutput = z.output<typeof ruleSchema>;
