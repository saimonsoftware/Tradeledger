import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { AiNotConfiguredError, COACH_MODEL, FALLBACK_BETA, getAnthropic } from "@/lib/ai/client";
import {
  assistantTools,
  runTool,
  TOOL_STATUS,
  toolSchemas,
  type RuleProposal,
  type ToolName,
} from "@/lib/ai/assistant-tools";
import { ASSISTANT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { getCurrentUser } from "@/lib/auth/dal";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

// Coach chat: a general conversation with tools. Streams newline-delimited JSON
// events to the browser: {t:"text"|"status"|"proposal"|"error"|"done", ...}.
export const maxDuration = 120;

const MAX_TOOL_ROUNDS = 6;
const MAX_STORED_MESSAGES = 120; // long conversations: suggest starting a new one

const bodySchema = z.object({
  conversationId: z.uuid().optional(),
  message: z.string().trim().min(1).max(2000),
});
const json = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  // Route Handlers check auth themselves (the proxy alone is not enough).
  const user = await getCurrentUser();
  if (!user || user.mfaPending) return json(401, "Please log in again.");

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return json(400, "Write a message of up to 2,000 characters.");
  const { message } = body.data;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_consent_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.ai_consent_at)
    return json(403, "Turn on the AI Coach first (AI Coach page or Settings).");

  // Existing conversation (RLS: only the user's own) or a new one.
  let conversationId = body.data.conversationId;
  let history: { role: "user" | "assistant"; content: Json }[] = [];
  if (conversationId) {
    const { data: conv } = await supabase
      .from("coach_conversations")
      .select("id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv) return json(404, "Conversation not found.");
    const { data: rows } = await supabase
      .from("coach_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    history = (rows ?? []) as typeof history;
    if (history.length >= MAX_STORED_MESSAGES) {
      return json(400, "This conversation is very long. Start a new one to keep answers fast.");
    }
  }

  const { data: allowed, error: quotaError } = await supabase.rpc("ai_try_consume", {
    p_kind: "assistant",
  });
  if (quotaError) return json(500, "Something went wrong. Please try again.");
  if (!allowed) return json(429, "You've used your 30 coach chat messages for the last 24 hours.");

  if (!conversationId) {
    const title = message.length > 60 ? `${message.slice(0, 57)}…` : message;
    const { data: conv, error } = await supabase
      .from("coach_conversations")
      .insert({ title })
      .select("id")
      .single();
    if (error) return json(500, "Something went wrong. Please try again.");
    conversationId = conv.id;
  }

  let anthropic: Anthropic;
  try {
    anthropic = getAnthropic();
  } catch (e) {
    return json(
      503,
      e instanceof AiNotConfiguredError ? "The AI Coach isn't configured yet." : "Unavailable.",
    );
  }

  // Append-only: every message is stored exactly as sent to / returned by the API.
  const save = (
    role: "user" | "assistant",
    content: unknown,
    extra: Record<string, unknown> = {},
  ) =>
    supabase
      .from("coach_messages")
      .insert({ conversation_id: conversationId!, role, content: content as Json, ...extra });

  await save("user", message, { display_text: message });
  // Move this conversation to the top of the list.
  await supabase
    .from("coach_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    // Replayed exactly as stored (it was saved exactly as the API returned it).
    ...history.map((m) => m as unknown as Anthropic.Beta.BetaMessageParam),
    { role: "user", content: message },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      let wroteText = false;
      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const aiStream = anthropic.beta.messages.stream({
            model: COACH_MODEL,
            max_tokens: 8000,
            betas: [FALLBACK_BETA],
            fallbacks: "default",
            thinking: { type: "adaptive" },
            output_config: { effort: "medium" },
            cache_control: { type: "ephemeral" },
            system: ASSISTANT_SYSTEM_PROMPT,
            tools: assistantTools,
            messages,
          });

          for await (const event of aiStream) {
            if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
              const name = event.content_block.name as ToolName;
              send({ t: "status", v: TOOL_STATUS[name] ?? "Working…" });
            } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              wroteText = true;
              send({ t: "text", v: event.delta.text });
            }
          }
          const final = await aiStream.finalMessage();
          const text = final.content
            .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
            .map((b) => b.text)
            .join("");

          // Save the assistant turn exactly as returned (thinking and tool calls included).
          await save("assistant", final.content, {
            display_text: text || null,
            input_tokens: final.usage.input_tokens,
            output_tokens: final.usage.output_tokens,
          });
          messages.push({ role: "assistant", content: final.content });

          const toolUses = final.content.filter(
            (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
          );
          if (final.stop_reason === "refusal") {
            if (!wroteText)
              send({
                t: "text",
                v: "I can't help with that one. Try asking about your setups, timing or risk.",
              });
            break;
          }
          if (toolUses.length === 0 || final.stop_reason === "end_turn") break;
          // A tool input cut off at max_tokens can look valid; never run it.
          if (final.stop_reason === "max_tokens") {
            send({
              t: "text",
              v: "\n\n[That answer ran too long. Please ask a narrower question.]",
            });
            break;
          }

          // Run each tool (validated first). All results go back in ONE user message.
          const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
          const proposals: RuleProposal[] = [];
          for (const tu of toolUses) {
            const schema = toolSchemas[tu.name as ToolName];
            const parsed = schema?.safeParse(tu.input);
            if (!schema || !parsed?.success) {
              results.push({
                type: "tool_result",
                tool_use_id: tu.id,
                is_error: true,
                content: JSON.stringify({ INVALID_INPUT: JSON.stringify(tu.input) }),
              });
              continue;
            }
            if (tu.name === "propose_rule") {
              const p = parsed.data as RuleProposal;
              proposals.push(p);
              send({ t: "proposal", v: p });
            }
            try {
              results.push({
                type: "tool_result",
                tool_use_id: tu.id,
                content: await runTool(tu.name as ToolName, parsed.data as never),
              });
            } catch {
              results.push({
                type: "tool_result",
                tool_use_id: tu.id,
                is_error: true,
                content: "Lookup failed.",
              });
            }
          }
          await save("user", results, { proposals: proposals as unknown as Json });
          messages.push({ role: "user", content: results });
        }
      } catch (e) {
        console.error(
          "Coach chat failed:",
          e instanceof Anthropic.APIError ? `${e.status} ${e.name}` : e,
        );
        send({
          t: "error",
          v:
            e instanceof Anthropic.RateLimitError
              ? "The AI service is busy. Please try again in a minute."
              : "Sorry, the coach couldn't answer right now. Please try again.",
        });
      } finally {
        send({ t: "done", conversationId });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
