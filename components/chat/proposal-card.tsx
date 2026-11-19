"use client";

import { Check, NotebookTabs, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { RuleProposal } from "@/lib/ai/assistant-tools";
import { createRule } from "@/lib/playbook/actions";
import { RULE_CATEGORY_LABELS } from "@/lib/validation/rules";

/** A rule the coach suggested. Saved to the Playbook only when the user clicks Add. */
export function ProposalCard({
  proposal,
  alreadyInPlaybook,
}: {
  proposal: RuleProposal;
  alreadyInPlaybook: boolean;
}) {
  const [added, setAdded] = useState(alreadyInPlaybook);
  const [pending, startTransition] = useTransition();
  const add = () =>
    startTransition(async () => {
      const r = await createRule(
        { title: proposal.title, description: proposal.description, category: proposal.category },
        "ai",
      );
      if (!r.ok) return void toast.error(r.error);
      setAdded(true);
      toast.success("Added to your Playbook");
    });

  return (
    <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wider text-primary uppercase">
        <NotebookTabs className="size-3.5" aria-hidden="true" /> Suggested rule ·{" "}
        {RULE_CATEGORY_LABELS[proposal.category]}
      </p>
      <p className="mt-1.5 font-medium text-foreground">{proposal.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{proposal.description}</p>
      <div className="mt-3">
        {added ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-profit">
            <Check className="size-3.5" aria-hidden="true" /> In your Playbook
          </span>
        ) : (
          <Button size="sm" variant="contrast" className="h-7" onClick={add} disabled={pending}>
            <Plus data-icon="inline-start" /> {pending ? "Adding…" : "Add to my rules"}
          </Button>
        )}
      </div>
    </div>
  );
}
