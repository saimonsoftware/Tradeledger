"use client";

import { Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFieldIds } from "@/lib/use-field-ids";
import { cn } from "@/lib/utils";

import { ChatText } from "./chat-text";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Which setup should I focus on next month?",
  "Why do my losing trades lose more than my winners make?",
  "What should I change about when I trade?",
];

/** Follow-up chat about one report. Answers stream in from /api/coach/[id]/chat. */
export function CoachChat({
  reportId,
  initial,
  chatsLeft,
}: {
  reportId: string;
  initial: Msg[];
  chatsLeft: number;
}) {
  const f = useFieldIds();
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(chatsLeft);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [
      ...m,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);
    const append = (chunk: string) =>
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: copy[copy.length - 1].content + chunk,
        };
        return copy;
      });

    try {
      const res = await fetch(`/api/coach/${reportId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Something went wrong." }));
        append(err.error ?? "Something went wrong.");
        return;
      }
      setLeft((n) => Math.max(0, n - 1));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        append(decoder.decode(value, { stream: true }));
      }
    } catch {
      append("Couldn't reach the coach. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="chat-title" className="rounded-2xl surface">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 id="chat-title" className="font-semibold">
          Ask your coach
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {left} messages left today
        </span>
      </div>

      <div className="max-h-[32rem] space-y-4 overflow-y-auto p-5" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Ask anything about this report. For example:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={busy || left === 0}
                  className="rounded-full border bg-background px-3 py-1.5 text-left text-xs text-foreground/90 transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                m.role === "user" && "whitespace-pre-wrap",
                m.role === "user" ? "bg-foreground text-background" : "border bg-background",
              )}
            >
              {/* Never rendered as HTML. Replies get safe bold and list formatting via ChatText. */}
              {m.content ? (
                m.role === "assistant" ? (
                  <ChatText text={m.content} />
                ) : (
                  m.content
                )
              ) : busy && i === messages.length - 1 ? (
                <Loader2
                  className="size-4 animate-spin text-muted-foreground"
                  aria-label="Thinking"
                />
              ) : null}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 border-t p-3"
      >
        <label htmlFor={f("msg")} className="sr-only">
          Your question
        </label>
        <Textarea
          id={f("msg")}
          rows={1}
          maxLength={2000}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={left === 0 ? "Daily message limit reached" : "Ask about your trading…"}
          disabled={busy || left === 0}
          className="max-h-32 min-h-10 resize-none"
        />
        <Button
          type="submit"
          variant="contrast"
          size="icon"
          className="size-10 shrink-0"
          disabled={busy || !input.trim() || left === 0}
          aria-label="Send"
        >
          {busy ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </form>
    </section>
  );
}
