"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setAiConsent } from "@/lib/coach/actions";

export function AiCoachSetting({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const toggle = () =>
    startTransition(async () => {
      const r = await setAiConsent(!enabled);
      if (!r.ok) return void toast.error(r.error);
      toast.success(enabled ? "AI Coach turned off" : "AI Coach turned on");
    });
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm">
        <span className="font-medium">{enabled ? "On." : "Off."}</span>{" "}
        <span className="text-muted-foreground">
          {enabled
            ? "Your statistics and trade notes are sent to Anthropic only when you run an analysis or ask a question."
            : "Nothing is sent to Anthropic."}
        </span>
      </p>
      <Button
        variant={enabled ? "outline" : "contrast"}
        size="sm"
        className="h-8"
        onClick={toggle}
        disabled={pending}
      >
        {pending ? "Saving…" : enabled ? "Turn off" : "Turn on"}
      </Button>
    </div>
  );
}
