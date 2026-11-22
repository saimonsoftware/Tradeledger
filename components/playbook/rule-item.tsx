"use client";

import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  MoreHorizontal,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteRule, moveRule, setRuleArchived } from "@/lib/playbook/actions";
import type { Rule } from "@/lib/playbook/data";
import type { RuleCategory } from "@/lib/validation/rules";

import { RuleDialog } from "./rule-dialog";

export function RuleItem({ rule, index, total }: { rule: Rule; index: number; total: number }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) =>
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error ?? "Something went wrong.");
      if (success) toast.success(success);
    });

  return (
    <li className="group flex items-start gap-3 px-4 py-4 transition-colors hover:bg-muted/30 sm:px-5">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border bg-linear-to-b from-muted to-background font-mono text-xs font-semibold tabular-nums">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
          <span className="min-w-0 break-words">{rule.title}</span>
          {rule.source === "ai" && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
              title="Suggested by your AI coach"
            >
              <Sparkles className="size-3" aria-hidden="true" /> Coach
            </span>
          )}
        </p>
        {rule.description && (
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {rule.description}
          </p>
        )}
      </div>
      {!rule.is_archived && total > 1 && (
        // Always visible on touch screens; on desktop they appear on hover/focus.
        <div className="-my-1 flex shrink-0 flex-col transition-opacity sm:my-0 sm:flex-row [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Move "${rule.title}" up`}
            disabled={pending || index === 0}
            onClick={() => run(() => moveRule(rule.id, "up"))}
          >
            <ArrowUp />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Move "${rule.title}" down`}
            disabled={pending || index === total - 1}
            onClick={() => run(() => moveRule(rule.id, "down"))}
          >
            <ArrowDown />
          </Button>
        </div>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for "${rule.title}"`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              run(
                () => setRuleArchived(rule.id, !rule.is_archived),
                rule.is_archived ? "Rule restored" : "Rule archived",
              )
            }
          >
            {rule.is_archived ? <ArchiveRestore /> : <Archive />}
            {rule.is_archived ? "Restore" : "Archive"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RuleDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        ruleId={rule.id}
        defaultValues={{
          title: rule.title,
          description: rule.description ?? "",
          category: rule.category as RuleCategory,
        }}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this rule?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{rule.title}&rdquo; will be removed. Archive it instead if you might want it
              back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                run(async () => {
                  const r = await deleteRule(rule.id);
                  setDeleteOpen(false);
                  return r;
                }, "Rule deleted");
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
