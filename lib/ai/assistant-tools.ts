import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { buildCoachInput, PERIODS, type PeriodKey } from "@/lib/coach/data";
import { createClient } from "@/lib/supabase/server";
import { RULE_CATEGORIES } from "@/lib/validation/rules";

// Tools the Coach chat can call. All are READ-ONLY lookups that run on our server
// with the user's own session (so RLS applies), except propose_rule, which only
// shows a card in the chat: nothing is saved until the user clicks "Add".

const periodKeys = Object.keys(PERIODS) as [PeriodKey, ...PeriodKey[]];

export const toolSchemas = {
  get_trading_stats: z.object({
    period: z.enum(periodKeys),
    account_id: z.uuid().nullable().optional(),
  }),
  list_accounts: z.object({}),
  get_coach_reports: z.object({ limit: z.number().int().min(1).max(5).optional() }),
  get_playbook_rules: z.object({}),
  propose_rule: z.object({
    title: z.string().trim().min(3).max(120),
    category: z.enum(RULE_CATEGORIES),
    description: z.string().trim().max(1000),
  }),
} as const;

export type ToolName = keyof typeof toolSchemas;
export type RuleProposal = z.infer<(typeof toolSchemas)["propose_rule"]>;

// Streaming requests with client tools use eager_input_streaming (inputs are then
// validated here with Zod before anything runs).
export const assistantTools: Anthropic.Beta.BetaTool[] = [
  {
    name: "get_trading_stats",
    description:
      "Compute the trader's performance statistics for a period: overall results, and breakdowns by strategy, tag, symbol, direction, asset class, weekday and hour (by entry time, trader's timezone), holding time, self-rating, and trades after a loss/win. Also returns recent trade notes. Use this before citing ANY number.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: periodKeys,
          description: "Days back from today: 30, 90, 365, or all",
        },
        account_id: {
          type: ["string", "null"],
          description: "Optional account id from list_accounts; omit or null for all accounts",
        },
      },
      required: ["period"],
      additionalProperties: false,
    },
  },
  {
    name: "list_accounts",
    description: "List the trader's trading accounts (id, name, currency, type, archived).",
    eager_input_streaming: true,
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_coach_reports",
    description:
      "Get the trader's most recent saved AI Coach reports (newest first): date, period, headline, what's costing them, and action plan. Use to track progress or recall earlier advice.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 5,
          description: "How many reports (default 3)",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_playbook_rules",
    description:
      "Get the trader's current Playbook rules (their written trading rules). Check these before proposing new rules.",
    eager_input_streaming: true,
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "propose_rule",
    description:
      "Propose ONE new trading rule to the trader. It is shown as a card they can approve; it is NOT saved unless they click Add. Rules must be specific and checkable, and grounded in their data.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description:
            "The rule itself, short and imperative, e.g. 'Stop trading after 2 losses in a day'",
        },
        category: { type: "string", enum: [...RULE_CATEGORIES] },
        description: {
          type: "string",
          description: "Why this rule, citing the evidence from their stats (1-3 sentences)",
        },
      },
      required: ["title", "category", "description"],
      additionalProperties: false,
    },
  },
];

const MAX_NOTES_IN_TOOL = 30;

/** Runs a validated tool call. Returns JSON text for the tool_result. */
export async function runTool<N extends ToolName>(
  name: N,
  input: z.infer<(typeof toolSchemas)[N]>,
): Promise<string> {
  const supabase = await createClient();
  switch (name) {
    case "get_trading_stats": {
      const i = input as z.infer<(typeof toolSchemas)["get_trading_stats"]>;
      const data = await buildCoachInput(i.period, i.account_id ?? null);
      return JSON.stringify({
        period: i.period,
        account_id: i.account_id ?? null,
        closed_trades: data.tradeCount,
        stats: data.stats,
        recent_trade_notes: data.notes.slice(0, MAX_NOTES_IN_TOOL),
      });
    }
    case "list_accounts": {
      const { data } = await supabase
        .from("trading_accounts")
        .select("id, name, currency, account_type, is_archived")
        .order("created_at");
      return JSON.stringify(data ?? []);
    }
    case "get_coach_reports": {
      const i = input as z.infer<(typeof toolSchemas)["get_coach_reports"]>;
      const { data } = await supabase
        .from("ai_reports")
        .select("created_at, period_from, period_to, trade_count, report")
        .order("created_at", { ascending: false })
        .limit(i.limit ?? 3);
      return JSON.stringify(
        (data ?? []).map((r) => {
          const rep = r.report as {
            headline?: string;
            whats_costing_you?: unknown;
            action_plan?: unknown;
          };
          return {
            created: r.created_at.slice(0, 10),
            period: r.period_from ? `${r.period_from} to ${r.period_to}` : "all time",
            trades: r.trade_count,
            headline: rep.headline,
            whats_costing_you: rep.whats_costing_you,
            action_plan: rep.action_plan,
          };
        }),
      );
    }
    case "get_playbook_rules": {
      const { data } = await supabase
        .from("trading_rules")
        .select("title, category, description")
        .eq("is_archived", false)
        .order("position");
      return JSON.stringify(data ?? []);
    }
    case "propose_rule":
      return "Shown to the trader as a proposal card. It is NOT saved unless they click Add.";
    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

export const TOOL_STATUS: Record<ToolName, string> = {
  get_trading_stats: "Checking your stats…",
  list_accounts: "Looking at your accounts…",
  get_coach_reports: "Reading your coach reports…",
  get_playbook_rules: "Reading your Playbook…",
  propose_rule: "Drafting a rule…",
};
