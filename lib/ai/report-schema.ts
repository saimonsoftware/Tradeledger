import { z } from "zod";

// The exact shape the AI must return (enforced by structured outputs).
const Insight = z.object({
  title: z.string().describe("Short, specific headline, e.g. 'ORB is your edge'"),
  detail: z.string().describe("2-4 sentences explaining the pattern and why it matters"),
  evidence: z
    .string()
    .describe("The exact figures from STATS that support this, including the number of trades"),
});

export const coachReportSchema = z.object({
  headline: z.string().describe("One or two sentences summarising the period"),
  best_setup: Insight.nullable().describe(
    "The trader's strongest setup: the strategy (and the symbol/direction/session where it works best) with the highest totalR and avgR on a reasonable sample. null if no setup has enough trades to judge",
  ),
  whats_working: z.array(Insight).describe("Strengths to keep doing (1-4 items)"),
  whats_costing_you: z.array(Insight).describe("Leaks and weaknesses (1-4 items)"),
  patterns: z
    .array(Insight)
    .describe("Behavioural patterns from timing, tags, ratings and notes (1-4 items)"),
  action_plan: z
    .array(z.object({ title: z.string(), detail: z.string() }))
    .describe("3-5 concrete, measurable process changes for the next period"),
  caveats: z
    .array(z.string())
    .describe("Data limitations, e.g. small samples or missing stop losses"),
});

export type CoachReport = z.infer<typeof coachReportSchema>;
