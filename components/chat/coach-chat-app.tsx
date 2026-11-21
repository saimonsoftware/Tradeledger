"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Crosshair,
  Loader2,
  MessageSquarePlus,
  NotebookTabs,
  PanelLeft,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { LogoMark } from "@/components/brand/logo";
import { ChatText } from "@/components/coach/chat-text";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { RuleProposal } from "@/lib/ai/assistant-tools";
import { deleteConversation } from "@/lib/chat/actions";
import { useFieldIds } from "@/lib/use-field-ids";
import { cn } from "@/lib/utils";

import { ProposalCard } from "./proposal-card";

type Bubble = { role: "user" | "assistant"; text: string; proposals: RuleProposal[] };
type Conversation = { id: string; title: string; updated_at: string };

const DAILY_LIMIT = 30;

const STARTERS = [
  { icon: Target, title: "Find my weakness", prompt: "What's my biggest weakness right now?" },
  {
    icon: NotebookTabs,
    title: "Write Playbook rules",
    prompt: "Help me write 3 rules for my Playbook",
  },
  {
    icon: TrendingUp,
    title: "Check my progress",
    prompt: "Am I improving since my last coach report?",
  },
  { icon: Crosshair, title: "Pick a setup", prompt: "Which setup should I focus on?" },
];

/** How far from the bottom (px) still counts as "at the latest message". */
const NEAR_BOTTOM_PX = 120;

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
  const [atBottom, setAtBottom] = useState(true);
  // Set when the coach pauses to look something up; the next text starts a new paragraph.
  const breakBeforeNextText = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const followRef = useRef(true); // keep following new text while the reader is at the bottom
  const known = new Set(existingRuleTitles);
  const title = convos.find((c) => c.id === currentId)?.title ?? "New chat";

  const scrollToBottom = useCallback((smooth: boolean) => {
    const el = scrollRef.current;
    // An empty chat (greeting + suggestions) always starts at the top.
    if (el && el.dataset.empty !== "true")
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Open an existing conversation at its latest message.
  useLayoutEffect(() => scrollToBottom(false), [scrollToBottom]);

  // Follow the reply as it streams in, unless the reader has scrolled up to read.
  useEffect(() => {
    if (followRef.current) scrollToBottom(false);
  }, [bubbles, status, scrollToBottom]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    followRef.current = near;
    setAtBottom(near);
  };

  // The message box grows with its text (up to a limit, then it scrolls).
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

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
    setStatus("Thinking");
    followRef.current = true;
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
            setStatus(String(ev.v).replace(/…$/, ""));
          } else if (ev.t === "proposal") {
            updateLast((b) => ({ ...b, proposals: [...b.proposals, ev.v as RuleProposal] }));
          } else if (ev.t === "error") {
            updateLast((b) => ({ ...b, text: b.text + (b.text ? "\n\n" : "") + (ev.v as string) }));
          } else if (ev.t === "done" && ev.conversationId && !currentId) {
            setCurrentId(ev.conversationId);
            const newTitle = message.length > 60 ? `${message.slice(0, 57)}…` : message;
            setConvos((c) => [
              { id: ev.conversationId!, title: newTitle, updated_at: new Date().toISOString() },
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
      left={left}
      onDelete={remove}
      onNavigate={() => setListOpen(false)}
    />
  );

  const empty = bubbles.length === 0;
  const limitReached = left === 0;

  // Full screen: fills the app content area below the top bar (cancelling its padding).
  return (
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] min-h-0 sm:-mx-6 sm:-my-8">
      {/* Desktop: conversations in a full-height column */}
      <aside
        aria-label="Conversations"
        className="hidden w-68 shrink-0 flex-col border-r bg-sidebar/40 lg:flex"
      >
        {list}
      </aside>

      <section aria-label="Coach chat" className="relative flex min-w-0 flex-1 flex-col">
        {/* Header: the conversation's name; on phones also the conversations button. */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
          <Sheet open={listOpen} onOpenChange={setListOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Chats">
                <PanelLeft />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-76 gap-0 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Conversations</SheetTitle>
              </SheetHeader>
              {list}
            </SheetContent>
          </Sheet>
          <h2 className="min-w-0 flex-1 truncate text-sm font-medium">{title}</h2>
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            aria-label="New chat"
          >
            <Link href="/app/chat">
              <MessageSquarePlus />
            </Link>
          </Button>
        </header>

        {/* Focusable so keyboard users can scroll the messages. */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          data-empty={bubbles.length === 0}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
          aria-live="polite"
          aria-label="Messages"
          role="log"
          tabIndex={0}
        >
          {empty ? (
            <EmptyState disabled={busy || limitReached} onPick={send} />
          ) : (
            <div className="mx-auto w-full max-w-3xl space-y-7 px-4 pt-6 pb-10 sm:px-6">
              {bubbles.map((b, i) => {
                const last = i === bubbles.length - 1;
                const streaming = busy && last;
                return b.role === "user" ? (
                  <div key={i} className="chat-in flex justify-end">
                    <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-muted px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-foreground sm:max-w-[75%] sm:text-sm">
                      {b.text}
                    </p>
                  </div>
                ) : (
                  <div key={i} className="chat-in flex gap-3">
                    <LogoMark className="mt-0.5 size-7" />
                    <div className="min-w-0 flex-1">
                      <p className="sr-only">Coach:</p>
                      {b.text && (
                        <div className="text-[15px] leading-relaxed text-foreground sm:text-sm">
                          <ChatText text={b.text} />
                        </div>
                      )}
                      {streaming && status && <Thinking label={status} hasText={!!b.text} />}
                      {b.proposals.map((p, j) => (
                        <ProposalCard
                          key={j}
                          proposal={p}
                          alreadyInPlaybook={known.has(p.title.trim().toLowerCase())}
                        />
                      ))}
                      {!streaming && b.text && <CopyButton text={b.text} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Back to the latest message (shown when scrolled up). */}
        {!empty && !atBottom && (
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Scroll to latest message"
            onClick={() => {
              followRef.current = true;
              scrollToBottom(true);
            }}
            className="absolute bottom-28 left-1/2 z-10 -translate-x-1/2 rounded-full bg-background shadow-md"
          >
            <ArrowDown />
          </Button>
        )}

        {/* Composer: floats over the bottom of the messages, which fade out behind it. */}
        <div className="relative shrink-0 px-3 pb-2 sm:px-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-linear-to-t from-background to-transparent"
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-3xl surface p-2 pl-4 shadow-lg transition-[box-shadow,border-color] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30"
          >
            <label htmlFor={f("msg")} className="sr-only">
              Message your coach
            </label>
            <textarea
              ref={inputRef}
              id={f("msg")}
              rows={1}
              maxLength={2000}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends; Shift+Enter (and Enter while composing, e.g. Japanese input) doesn't.
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={
                limitReached ? "Daily message limit reached" : "Ask your coach anything…"
              }
              disabled={busy || limitReached}
              className="max-h-50 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-base leading-6 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60 md:text-sm"
            />
            <Button
              type="submit"
              variant="contrast"
              size="icon"
              className="size-9 shrink-0 rounded-full"
              disabled={busy || !input.trim() || limitReached}
              aria-label="Send"
            >
              {busy ? <Loader2 className="animate-spin" /> : <ArrowUp />}
            </Button>
          </form>
          <p className="mx-auto max-w-3xl pt-2 text-center text-[11px] text-muted-foreground">
            {left <= 5 && (
              <span className="tabular-nums">
                {left} message{left === 1 ? "" : "s"} left today ·{" "}
              </span>
            )}
            The coach can make mistakes · Not financial advice
          </p>
        </div>
      </section>
    </div>
  );
}

/** First screen of a new chat: a greeting and four one-tap starters. */
function EmptyState({ disabled, onPick }: { disabled: boolean; onPick: (prompt: string) => void }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-4 py-10 sm:px-6">
      <div className="chat-in text-center">
        <div className="chat-mark-glow mx-auto w-fit rounded-[14px]">
          <LogoMark className="size-12" />
        </div>
        <h2 className="mt-5 text-silver text-2xl font-semibold tracking-tight text-glow sm:text-3xl">
          What do you want to work on?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Your coach looks up your stats, past reports and Playbook as needed, and can suggest rules
          you add with one tap.
        </p>
      </div>
      <ul className="chat-in mt-6 grid grid-cols-2 gap-2.5 sm:mt-8" aria-label="Suggestions">
        {STARTERS.map(({ icon: Icon, title, prompt }) => (
          <li key={title}>
            <button
              type="button"
              onClick={() => onPick(prompt)}
              disabled={disabled}
              className="group flex h-full w-full items-start gap-3 rounded-2xl surface card-glow p-3.5 text-left transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors group-hover:text-foreground">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{title}</span>
                <span className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
                  {prompt}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "Thinking" / "Looking up your stats": three pulsing dots and shimmering text. */
function Thinking({ label, hasText }: { label: string; hasText: boolean }) {
  return (
    <p role="status" className={cn("flex items-center gap-2 text-sm", hasText ? "mt-3" : "h-7")}>
      <span className="chat-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="chat-shimmer">{label}…</span>
    </p>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-1.5 -ml-1.5 flex">
      <Button
        variant="ghost"
        size="icon-xs"
        className="text-muted-foreground hover:text-foreground"
        aria-label={copied ? "Copied" : "Copy reply"}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text.replace(/\*\*/g, ""));
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          } catch {
            toast.error("Couldn't copy");
          }
        }}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  );
}

/** Today / Yesterday / Previous 7 days / Older. */
function groupByDay(convos: Conversation[]) {
  const now = new Date();
  const groups: { label: string; items: Conversation[] }[] = [];
  for (const c of convos) {
    const days = differenceInCalendarDays(now, parseISO(c.updated_at));
    const label =
      days <= 0 ? "Today" : days === 1 ? "Yesterday" : days <= 7 ? "Previous 7 days" : "Older";
    const g = groups.find((x) => x.label === label);
    if (g) g.items.push(c);
    else groups.push({ label, items: [c] });
  }
  return groups;
}

/** New chat button, saved conversations by date, and today's message allowance. */
function ConversationList({
  convos,
  currentId,
  deleting,
  left,
  onDelete,
  onNavigate,
}: {
  convos: Conversation[];
  currentId: string | null;
  deleting: boolean;
  left: number;
  onDelete: (id: string) => void;
  onNavigate: () => void;
}) {
  const used = DAILY_LIMIT - left;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <LogoMark className="size-6" />
        <span className="text-sm font-semibold">Coach</span>
      </div>
      <div className="p-2">
        <Button asChild variant="contrast" size="sm" className="h-9 w-full rounded-xl">
          <Link href="/app/chat" onClick={onNavigate}>
            <MessageSquarePlus data-icon="inline-start" /> New chat
          </Link>
        </Button>
      </div>
      {convos.length === 0 ? (
        <p className="px-4 py-3 text-xs text-muted-foreground">
          Your conversations will appear here.
        </p>
      ) : (
        <nav
          aria-label="Saved conversations"
          tabIndex={0}
          className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
        >
          {groupByDay(convos).map((g) => (
            <div key={g.label} className="mt-3 first:mt-1">
              <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {g.label}
              </p>
              <ul className="space-y-0.5">
                {g.items.map((c) => {
                  const active = c.id === currentId;
                  return (
                    <li
                      key={c.id}
                      className={cn(
                        "group relative flex items-center rounded-lg transition-colors",
                        active ? "bg-muted" : "hover:bg-muted/50",
                      )}
                    >
                      {active && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-foreground"
                        />
                      )}
                      <Link
                        href={`/app/chat/${c.id}`}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "min-w-0 flex-1 truncate rounded-lg py-2 pr-1 pl-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                          active
                            ? "text-foreground"
                            : "text-muted-foreground group-hover:text-foreground",
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
                        className="mr-1 text-muted-foreground opacity-100 hover:text-foreground [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100"
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      )}
      {/* Today's allowance */}
      <div className="shrink-0 border-t px-4 py-3">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">Messages today</span>
          <span className="font-medium text-foreground tabular-nums">
            {left} of {DAILY_LIMIT} left
          </span>
        </div>
        <div
          className="mt-2 h-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Messages used today"
          aria-valuemin={0}
          aria-valuemax={DAILY_LIMIT}
          aria-valuenow={used}
        >
          <div
            className="h-full rounded-full bg-foreground transition-[width] duration-500"
            style={{ width: `${(used / DAILY_LIMIT) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
