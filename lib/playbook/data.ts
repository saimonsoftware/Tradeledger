import "server-only";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export async function listRules({ archived = false } = {}) {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trading_rules")
    .select("id, title, description, category, source, position, is_archived, created_at")
    .eq("is_archived", archived)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error("Could not load rules");
  return data;
}

export type Rule = Awaited<ReturnType<typeof listRules>>[number];
