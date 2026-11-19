import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { AiNotConfiguredError, COACH_MODEL, FALLBACK_BETA, getAnthropic } from "@/lib/ai/client";
import { CHAT_SYSTEM_SUFFIX, COACH_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { getCurrentUser } from "@/lib/auth/dal";
import { renderCoachContext } from "@/lib/coach/data";
import { createClient } from "@/lib/supabase/server";

// Follow-up chat about one saved report. Streams the answer as plain text.
export const maxDuration = 120;

const MAX_HISTORY = 20;
const bodySchema = z.object({ message: z.string().trim().min(1).max(2000) });

const json = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  // Route Handlers check auth themselves (the proxy alone is not enough).
  const user = await getCurrentUser();
  if (!user || user.mfaPending) return json(401, "Please log in again.");

  const { reportId } = await params;
  if (!z.uuid().safeParse(reportId).success) return json(404, "Report not found.");

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return json(400, "Write a message of up to 2,000 characters.");

  const supabase = await createClient();
  const [{ data: profile }, { data: report }, { data: history }] = await Promise.all([
    supabase.from("profiles").select("ai_consent_at").eq("id", user.id).maybeSingle(),
    // RLS: only the user's own report can be found.
    supabase.from("ai_reports").select("id, stats, report").eq("id", reportId).maybeSingle(),
    supabase
      .from("ai_messages")
      .select("role, content")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORY),
  ]);
  if (!report) return json(404, "Report not found.");
  if (!profile?.ai_consent_at) return json(403, "Turn on the AI Coach first.");

  const { data: allowed, error: quotaError } = await supabase.rpc("ai_try_consume", {
    p_kind: "chat",
  });
  if (quotaError) return json(500, "Something went wrong. Please try again.");
  if (!allowed) return json(429, "You've used your 30 coach messages for the last 24 hours.");

  // Save the question first so it's never lost.
  await supabase
    .from("ai_messages")
    .insert({ report_id: reportId, role: "user", content: body.data.message });

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...(history ?? [])
      .reverse()
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: body.data.message },
  ];

  let anthropic: Anthropic;
  try {
    anthropic = getAnthropic();
  } catch (e) {
    return json(
      503,
      e instanceof AiNotConfiguredError ? "The AI Coach isn't configured yet." : "Unavailable.",
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let answer = "";
      try {
        const aiStream = anthropic.beta.messages.stream({
          model: COACH_MODEL,
          max_tokens: 4000,
          betas: [FALLBACK_BETA],
          fallbacks: "default",
          thinking: { type: "adaptive" },
          output_config: { effort: "medium" },
          system: [
            { type: "text", text: COACH_SYSTEM_PROMPT + CHAT_SYSTEM_SUFFIX },
            {
              type: "text",
              // Stable for the whole conversation, so it's cached after the first message.
              text: `<report>\n${JSON.stringify(report.report)}\n</report>\n\n${renderCoachContext({ stats: report.stats, notes: [] })}`,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages,
        });

        for await (const event of aiStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            answer += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await aiStream.finalMessage();
        if (final.stop_reason === "refusal" && !answer) {
          answer =
            "I can't help with that one. Try asking about your setups, timing or risk management.";
          controller.enqueue(encoder.encode(answer));
        }
        if (answer.trim()) {
          await supabase.from("ai_messages").insert({
            report_id: reportId,
            role: "assistant",
            content: answer.slice(0, 20000),
            input_tokens: final.usage.input_tokens,
            output_tokens: final.usage.output_tokens,
          });
        }
      } catch (e) {
        console.error(
          "AI chat failed:",
          e instanceof Anthropic.APIError ? `${e.status} ${e.name}` : e,
        );
        controller.enqueue(
          encoder.encode(
            answer
              ? "\n\n[The answer was interrupted. Please try again.]"
              : "Sorry, the coach couldn't answer right now. Please try again.",
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
