"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ruleSchema, type RuleInput } from "@/lib/validation/rules";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
const GENERIC = "Something went wrong. Please try again.";
const idSchema = z.uuid();

/** source "ai" is only used when the user approves a coach proposal. */
export async function createRule(
  input: RuleInput,
  source: "manual" | "ai" = "manual",
): Promise<Result<{ id: string }>> {
  await requireUser();
  const parsed = ruleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC };
  if (source !== "manual" && source !== "ai") return { ok: false, error: GENERIC };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("trading_rules")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("trading_rules")
    .insert({ ...parsed.data, source, position: (last?.position ?? 0) + 1 })
    .select("id")
    .single();
  if (error) return { ok: false, error: GENERIC };
  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function updateRule(id: string, input: RuleInput): Promise<Result> {
  await requireUser();
  const parsed = ruleSchema.safeParse(input);
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Rule not found." };
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trading_rules")
    .update(parsed.data)
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: GENERIC };
  if (!data.length) return { ok: false, error: "Rule not found." };
  refresh();
  return { ok: true };
}

export async function setRuleArchived(id: string, archived: boolean): Promise<Result> {
  await requireUser();
  if (!idSchema.safeParse(id).success || typeof archived !== "boolean")
    return { ok: false, error: "Rule not found." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trading_rules")
    .update({ is_archived: archived })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: GENERIC };
  if (!data.length) return { ok: false, error: "Rule not found." };
  refresh();
  return { ok: true };
}

export async function deleteRule(id: string): Promise<Result> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Rule not found." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("trading_rules").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: GENERIC };
  if (!data.length) return { ok: false, error: "Rule not found." };
  refresh();
  return { ok: true };
}

/** Moves a rule one place up or down by swapping positions with its neighbour. */
export async function moveRule(id: string, direction: "up" | "down"): Promise<Result> {
  await requireUser();
  if (!idSchema.safeParse(id).success || !["up", "down"].includes(direction))
    return { ok: false, error: GENERIC };
  const supabase = await createClient();
  const { data: rules, error } = await supabase
    .from("trading_rules")
    .select("id, position")
    .eq("is_archived", false)
    .order("position")
    .order("created_at");
  if (error) return { ok: false, error: GENERIC };
  const i = rules.findIndex((r) => r.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rules.length) return { ok: true };
  // Re-number everything so positions stay unique, with the two rules swapped.
  const order = rules.map((r) => r.id);
  [order[i], order[j]] = [order[j], order[i]];
  for (let k = 0; k < order.length; k++) {
    if (rules[k].id !== order[k] || rules[k].position !== k + 1) {
      await supabase
        .from("trading_rules")
        .update({ position: k + 1 })
        .eq("id", order[k]);
    }
  }
  refresh();
  return { ok: true };
}
