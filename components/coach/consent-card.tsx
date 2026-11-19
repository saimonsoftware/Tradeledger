"use client";

import { Sparkles } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setAiConsent } from "@/lib/coach/actions";

/** Opt-in: the AI Coach sends trade data to Anthropic, so the user agrees first. */
export function ConsentCard() {
  const [pending, startTransition] = useTransition();
  return (
    <div className="mx-auto max-w-2xl rounded-2xl surface card-glow p-6 sm:p-8">
      <span className="flex size-11 items-center justify-center rounded-xl border bg-background text-primary">
        <Sparkles className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-xl font-semibold tracking-tight">Meet your AI trading coach</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        It reviews your closed trades and finds what&apos;s working, what&apos;s costing you, and
        patterns in your timing, setups, tags and notes, then suggests concrete changes. You can ask
        follow-up questions about every report.
      </p>
      <div className="mt-5 space-y-2 rounded-xl border bg-background/50 p-4 text-sm">
        <p className="font-medium">Before you turn it on</p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            TradeLedger calculates your statistics itself. To write the analysis, those statistics
            and your recent trade notes are sent to{" "}
            <span className="text-foreground">Anthropic</span> (the maker of Claude).
          </li>
          <li>
            Nothing is sent until you click Analyse. You can turn the coach off any time in Settings
            or here.
          </li>
          <li>It&apos;s a journaling aid, not financial advice.</li>
        </ul>
      </div>
      <Button
        variant="contrast"
        className="mt-6 h-10 px-4"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await setAiConsent(true);
            if (!r.ok) toast.error(r.error);
          })
        }
      >
        <Sparkles data-icon="inline-start" /> {pending ? "Turning on…" : "Turn on AI Coach"}
      </Button>
    </div>
  );
}
