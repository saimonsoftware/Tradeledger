"use server";

import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { MAX_CONFLUENCE_CHARS } from "@/lib/trades/constants";

// Confluences the trader removed from their dropdown live on their own profile row
// (RLS: a user can only ever read/update their own). Trades keep what they use.

type Result = { ok: true; hidden: string[] } | { ok: false; error: string };
const GENERIC = "Couldn't update your confluences. Please try again.";
const MAX_HIDDEN = 200; // the database checks the same limit
const nameSchema = z.string().trim().min(1).max(MAX_CONFLUENCE_CHARS);

async function readHidden(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("hidden_confluences")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return { supabase, hidden: data.hidden_confluences };
}

/** Remove a confluence (starter or custom) from the trader's dropdown. */
export async function hideConfluence(name: unknown): Promise<Result> {
  const user = await requireUser();
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: GENERIC };
  const current = await readHidden(user.id);
  if (!current) return { ok: false, error: GENERIC };

  const lower = parsed.data.toLowerCase();
  if (current.hidden.some((h) => h.toLowerCase() === lower)) {
    return { ok: true, hidden: current.hidden };
  }
  const hidden = [...current.hidden, parsed.data].slice(-MAX_HIDDEN);
  const { error } = await current.supabase
    .from("profiles")
    .update({ hidden_confluences: hidden })
    .eq("id", user.id);
  return error ? { ok: false, error: GENERIC } : { ok: true, hidden };
}

/** Bring back every confluence the trader removed. */
export async function restoreConfluences(): Promise<Result> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ hidden_confluences: [] })
    .eq("id", user.id);
  return error ? { ok: false, error: GENERIC } : { ok: true, hidden: [] };
}

/** Offer a removed confluence again (e.g. the trader typed it back in). */
export async function showConfluence(name: unknown): Promise<Result> {
  const user = await requireUser();
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: GENERIC };
  const current = await readHidden(user.id);
  if (!current) return { ok: false, error: GENERIC };
  const lower = parsed.data.toLowerCase();
  const hidden = current.hidden.filter((h) => h.toLowerCase() !== lower);
  if (hidden.length === current.hidden.length) return { ok: true, hidden };
  const { error } = await current.supabase
    .from("profiles")
    .update({ hidden_confluences: hidden })
    .eq("id", user.id);
  return error ? { ok: false, error: GENERIC } : { ok: true, hidden };
}
