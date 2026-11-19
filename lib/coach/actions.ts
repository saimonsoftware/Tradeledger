"use server";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { refresh } from "next/cache";
import { z } from "zod";

import { AiNotConfiguredError, COACH_MODEL, FALLBACK_BETA, getAnthropic } from "@/lib/ai/client";
import { COACH_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { coachReportSchema } from "@/lib/ai/report-schema";
import { requireUser } from "@/lib/auth/dal";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

import {
  buildCoachInput,
  MIN_TRADES_FOR_REPORT,
  PERIODS,
  renderCoachContext,
  type PeriodKey,
} from "./data";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const GENERIC = "Something went wrong. Please try again.";

/** Turns AI Coach on/off for this user (records consent to send trade data to Anthropic). */
export async function setAiConsent(enabled: boolean): Promise<Result> {
  const user = await requireUser();
  if (typeof enabled !== "boolean") return { ok: false, error: GENERIC };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ai_consent_at: enabled ? new Date().toISOString() : null })
    .eq("id", user.id);
  if (error) return { ok: false, error: GENERIC };
  refresh();
  return { ok: true };
}

const reportInputSchema = z.object({
  period: z.enum(Object.keys(PERIODS) as [PeriodKey, ...PeriodKey[]]),
  accountId: z.uuid().nullable(),
});

/** Friendly message for an Anthropic API failure (typed errors, never string matching). */
function aiErrorMessage(e: unknown): string {
  if (e instanceof AiNotConfiguredError) return "The AI Coach isn't configured on this server yet.";
  if (e instanceof Anthropic.RateLimitError)
    return "The AI service is busy right now. Please try again in a minute.";
  if (e instanceof Anthropic.APIConnectionError)
    return "Couldn't reach the AI service. Please try again.";
  if (e instanceof Anthropic.APIError && (e.status ?? 0) >= 500) {
    return "The AI service had a problem. Please try again shortly.";
  }
  return GENERIC;
}

export async function generateReport(
  input: z.input<typeof reportInputSchema>,
): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const parsed = reportInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a valid period and account." };
  const { period, accountId } = parsed.data;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_consent_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.ai_consent_at) return { ok: false, error: "Turn on the AI Coach first." };

  if (accountId) {
    // RLS returns nothing for other users' accounts.
    const { data: acc } = await supabase
      .from("trading_accounts")
      .select("id")
      .eq("id", accountId)
      .maybeSingle();
    if (!acc) return { ok: false, error: "Account not found." };
  }

  const input_ = await buildCoachInput(period, accountId);
  if (input_.tradeCount < MIN_TRADES_FOR_REPORT) {
    return {
      ok: false,
      error: `You need at least ${MIN_TRADES_FOR_REPORT} closed trades in this period for a useful analysis (found ${input_.tradeCount}).`,
    };
  }

  // Count the use BEFORE calling the model, atomically in the database.
  const { data: allowed, error: quotaError } = await supabase.rpc("ai_try_consume", {
    p_kind: "report",
  });
  if (quotaError) return { ok: false, error: GENERIC };
  if (!allowed)
    return {
      ok: false,
      error: "You've used your 5 analyses for the last 24 hours. Try again later.",
    };

  let message;
  try {
    message = await getAnthropic().beta.messages.parse({
      model: COACH_MODEL,
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      // Analysis quality matters here, and it runs at most a few times a day.
      output_config: { effort: "high", format: betaZodOutputFormat(coachReportSchema) },
      system: COACH_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analyse my trading journal for ${
            input_.from ? `the period from ${input_.from} to today` : "all time"
          }${accountId ? " (one account)" : " (all accounts)"}. ${input_.tradeCount} closed trades. My timezone: ${input_.timezone}.\n\n${renderCoachContext(input_)}`,
        },
      ],
    });
  } catch (e) {
    console.error(
      "AI report failed:",
      e instanceof Anthropic.APIError ? `${e.status} ${e.name}` : e,
    );
    return { ok: false, error: aiErrorMessage(e) };
  }

  if (message.stop_reason === "refusal") {
    return {
      ok: false,
      error: "The AI couldn't produce an analysis for this data. Please try a different period.",
    };
  }
  if (!message.parsed_output) {
    return { ok: false, error: "The analysis came back incomplete. Please try again." };
  }

  const { data: saved, error } = await supabase
    .from("ai_reports")
    .insert({
      account_id: accountId,
      period_from: input_.from,
      period_to: input_.stats.period.to,
      trade_count: input_.tradeCount,
      stats: input_.stats as unknown as Json,
      report: message.parsed_output as unknown as Json,
      model: message.model,
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: GENERIC };

  refresh();
  return { ok: true, data: { id: saved.id } };
}

export async function deleteReport(id: string): Promise<Result> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Report not found." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("ai_reports").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: GENERIC };
  if (!data.length) return { ok: false, error: "Report not found." };
  refresh();
  return { ok: true };
}
