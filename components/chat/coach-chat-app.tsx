"use client";

import { Loader2, MessageSquarePlus, PanelLeft, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { ChatText } from "@/components/coach/chat-text";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { RuleProposal } from "@/lib/ai/assistant-tools";
import { deleteConversation } from "@/lib/chat/actions";
import { useFieldIds } from "@/lib/use-field-ids";
import { cn } from "@/lib/utils";

import { ProposalCard } from "./proposal-card";

type Bubble = { role: "user" | "assistant"; text: string; proposals: RuleProposal[] };
type Conversation = { id: string; title: string; updated_at: string };

const STARTERS = [
  "What's my biggest weakness right now?",
  "Help me write 3 rules for my Playbook",
  "Am I improving since my last coach report?",
  "Which setup should I focus on?",
];

export function CoachChatApp({
  conversationId,
  conversations,
  initial,
  messagesLeft,
  existingRuleTitles,
}: {
  conversationId: string | null;
  conversations: Conversation[];
  initial: Bubble[];
  messagesLeft: number;
  existingRuleTitles: string[];
}) {
  const f = useFieldIds();
  const router = useRouter();
  const [bubbles, setBubbles] = useState<Bubble[]>(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [left, setLeft] = useState(messagesLeft);
  const [currentId, setCurrentId] = useState(conversationId);
  const [deleting, startDelete] = useTransition();
  const [convos, setConvos] = useState(conversations);
  const [listOpen, setListOpen] = useState(false);
  // Set when the coach pauses to look something up; the next text starts a new paragraph.
  const breakBeforeNextText = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const known = new Set(existingRuleTitles);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [bubbles, status]);

  const updateLast = (fn: (b: Bubble) => Bubble) =>
    setBubbles((all) => {
      const copy = [...all];
      copy[copy.length - 1] = fn(copy[copy.length - 1]);
      return copy;
    });

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    setStatus("Thinking…");
    setBubbles((b) => [
      ...b,
      { role: "user", text: message, proposals: [] },
      { role: "assistant", text: "", proposals: [] },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: currentId ?? undefined, message }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Something went wrong." }));
        updateLast((b) => ({ ...b, text: err.error ?? "Something went wrong." }));
        return;
      }
      setLeft((n) => Math.max(0, n - 1));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as { t: string; v?: unknown; conversationId?: string };
          if (ev.t === "text") {
            setStatus(null);
            const brk = breakBeforeNextText.current;
            breakBeforeNextText.current = false;
            updateLast((b) => ({
              ...b,
              text: b.text + (brk && b.text ? "\n\n" : "") + (ev.v as string),
            }));
          } else if (ev.t === "status") {
            breakBeforeNextText.current = true;
            setStatus(ev.v as string);
          } else if (ev.t === "proposal") {
            updateLast((b) => ({ ...b, proposals: [...b.proposals, ev.v as RuleProposal] }));
          } else if (ev.t === "error") {
            updateLast((b) => ({ ...b, text: b.text + (b.text ? "\n\n" : "") + (ev.v as string) }));
          } else if (ev.t === "done" && ev.conversationId && !currentId) {
            setCurrentId(ev.conversationId);
            const title = message.length > 60 ? `${message.slice(0, 57)}…` : message;
            setConvos((c) => [
              { id: ev.conversationId!, title, updated_at: new Date().toISOString() },
              ...c,
            ]);
            // Show the new conversation in the URL and the list, without losing this view.
            window.history.replaceState(null, "", `/app/chat/${ev.conversationId}`);
            router.refresh();
          }
        }
      }
    } catch {
      updateLast((b) => ({
        ...b,
        text: b.text || "Couldn't reach the coach. Check your connection and try again.",
      }));
    } finally {
      setBusy(false);
      setStatus(null);
    }
  };

  const remove = (id: string) =>
    startDelete(async () => {
      const r = await deleteConversation(id);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Conversation deleted");
      setConvos((c) => c.filter((x) => x.id !== id));
      if (id === currentId) router.push("/app/chat");
    });

  const list = (
    <ConversationList
      convos={convos}
      currentId={currentId}
      deleting={deleting}
      onDelete={remove}
      onNavigate={() => setListOpen(false)}
    />
  );

  // Full screen: fills the app content area below the top bar (cancelling its padding).
  return (
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] min-h-0 sm:-mx-6 sm:-my-8">
      {/* Desktop: conversations in a full-height column */}
      <aside aria-label="Conversations" className="hidden w-64 shrink-0 flex-col border-r lg:flex">
        {list}
      </aside>

      <section aria-label="Coach chat" className="flex min-w-0 flex-1 flex-col">
        {/* Phone/tablet: conversations slide out from the left */}
        <div className="flex items-center gap-2 border-b px-3 py-2 lg:hidden">
          <Sheet open={listOpen} onOpenChange={setListOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <PanelLeft data-icon="inline-start" /> Chats
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 gap-0 p-0">
              <SheetHeader className="border-b">
                <SheetTitle>Conversations</SheetTitle>
              </SheetHeader>
              {list}
            </SheetContent>
          </Sheet>
          <Button asChild variant="ghost" size="sm" className="ml-auto h-8">
            <Link href="/app/chat">
              <MessageSquarePlus data-icon="inline-start" /> New chat
            </Link>
          </Button>
        </div>

        {/* Focusable so keyboard users can scroll the messages. */}
        <div
          className="min-h-0 flex-1 overflow-y-auto outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
          aria-live="polite"
          aria-label="Messages"
          role="log"
          tabIndex={0}
        >
          <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 sm:px-6">
            {bubbles.length === 0 && (
              <div className="py-6 text-center">
                <h2 className="text-lg font-semibold">Ask your coach anything</h2>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  It looks up your stats, past coach reports and Playbook as needed, and can suggest
                  rules you can add with one click.
                </p>
                <div className="mx-auto mt-5 flex max-w-lg flex-wrap justify-center gap-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      disabled={busy || left === 0}
                      className="rounded-full border bg-background px-3 py-1.5 text-xs text-foreground/90 transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {bubbles.map((b, i) => (
              <div
                key={i}
                className={cn("flex", b.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[80%]",
                    b.role === "user"
                      ? "bg-foreground whitespace-pre-wrap text-background"
                      : "border bg-background",
                  )}
                >
                  {b.role === "user" ? b.text : b.text ? <ChatText text={b.text} /> : null}
                  {b.role === "assistant" && busy && i === bubbles.length - 1 && status && (
                    <p
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                      role="status"
                    >
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> {status}
                    </p>
                  )}
                  {b.proposals.map((p, j) => (
                    <ProposalCard
                      key={j}
                      proposal={p}
                      alreadyInPlaybook={known.has(p.title.trim().toLowerCase())}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </div>

        <div className="border-t">
          <div className="mx-auto w-full max-w-3xl px-3 pt-3 sm:px-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2"
            >
              <label htmlFor={f("msg")} className="sr-only">
                Message your coach
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
                placeholder={
                  left === 0
                    ? "Daily message limit reached"
                    : "Ask about your trading, or for rules…"
                }
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
            <p className="py-2 text-[11px] text-muted-foreground tabular-nums">
              {left} of 30 messages left today · Not financial advice
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/** New chat button + the saved conversations (desktop column and phone slide-out). */
function ConversationList({
  convos,
  currentId,
  deleting,
  onDelete,
  onNavigate,
}: {
  convos: Conversation[];
  currentId: string | null;
  deleting: boolean;
  onDelete: (id: string) => void;
  onNavigate: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col p-2">
      <Button asChild variant="contrast" size="sm" className="mb-2 h-8 w-full">
        <Link href="/app/chat" onClick={onNavigate}>
          <MessageSquarePlus data-icon="inline-start" /> New chat
        </Link>
      </Button>
      {convos.length === 0 ? (
        <p className="px-2 py-3 text-xs text-muted-foreground">
          Your conversations will appear here.
        </p>
      ) : (
        <ul
          aria-label="Saved conversations"
          tabIndex={0}
          className="min-h-0 flex-1 space-y-0.5 overflow-y-auto rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {convos.map((c) => (
            <li key={c.id} className="group flex items-center">
              <Link
                href={`/app/chat/${c.id}`}
                onClick={onNavigate}
                aria-current={c.id === currentId ? "page" : undefined}
                className={cn(
                  "min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-sm",
                  c.id === currentId
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                {c.title}
              </Link>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Delete conversation "${c.title}"`}
                disabled={deleting}
                onClick={() => onDelete(c.id)}
                className="opacity-60 group-hover:opacity-100"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
