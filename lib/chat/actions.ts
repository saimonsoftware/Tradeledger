"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export async function deleteConversation(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Conversation not found." };
  const supabase = await createClient();
  // Its messages are removed with it (ON DELETE CASCADE).
  const { data, error } = await supabase
    .from("coach_conversations")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: "Something went wrong. Please try again." };
  if (!data.length) return { ok: false, error: "Conversation not found." };
  refresh();
  return { ok: true };
}
