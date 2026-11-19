import "server-only";

import type { RuleProposal } from "@/lib/ai/assistant-tools";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export type ChatBubble = { role: "user" | "assistant"; text: string; proposals: RuleProposal[] };

export async function getChatSidebar() {
  const user = await requireUser();
  const supabase = await createClient();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [{ data: profile }, { data: conversations }, used, { data: rules }] = await Promise.all([
    supabase.from("profiles").select("ai_consent_at").eq("id", user.id).maybeSingle(),
    supabase
      .from("coach_conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("kind", "assistant")
      .gt("created_at", since),
    supabase.from("trading_rules").select("title").eq("is_archived", false),
  ]);
  return {
    consented: Boolean(profile?.ai_consent_at),
    conversations: conversations ?? [],
    messagesLeft: Math.max(0, 30 - (used.count ?? 0)),
    existingRuleTitles: (rules ?? []).map((r) => r.title.trim().toLowerCase()),
  };
}

/**
 * Turns the stored API messages into chat bubbles: the user's own messages, and
 * one assistant bubble per reply (its text plus any rule proposals). Internal
 * tool-call/tool-result turns have no display text and are folded in.
 */
export async function getConversationBubbles(id: string): Promise<ChatBubble[] | null> {
  await requireUser();
  const supabase = await createClient();
  const { data: conv } = await supabase
    .from("coach_conversations")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!conv) return null;
  const { data: rows } = await supabase
    .from("coach_messages")
    .select("role, display_text, proposals")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  const bubbles: ChatBubble[] = [];
  for (const row of rows ?? []) {
    const proposals = (row.proposals as RuleProposal[] | null) ?? [];
    if (row.role === "user" && row.display_text) {
      bubbles.push({ role: "user", text: row.display_text, proposals: [] });
      continue;
    }
    let last = bubbles[bubbles.length - 1];
    if (!last || last.role !== "assistant") {
      last = { role: "assistant", text: "", proposals: [] };
      bubbles.push(last);
    }
    if (row.role === "assistant" && row.display_text)
      last.text += (last.text ? "\n\n" : "") + row.display_text;
    last.proposals.push(...proposals);
  }
  return bubbles.filter((b) => b.text || b.proposals.length);
}
