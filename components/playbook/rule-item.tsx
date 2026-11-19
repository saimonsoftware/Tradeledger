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
    <li className="flex items-start gap-3 px-5 py-4">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs tabular-nums">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {rule.title}
          {rule.source === "ai" && (
            <span
              className="ml-2 inline-flex items-center gap-0.5 align-middle text-[11px] font-normal text-primary"
              title="Suggested by your AI coach"
            >
              <Sparkles className="size-3" aria-hidden="true" /> AI
            </span>
          )}
        </p>
        {rule.description && (
          <p className="mt-0.5 text-sm whitespace-pre-wrap text-muted-foreground">
            {rule.description}
          </p>
        )}
      </div>
      {!rule.is_archived && (
        <div className="flex shrink-0">
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
