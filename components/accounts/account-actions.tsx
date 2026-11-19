"use client";

import { Archive, ArchiveRestore, ArrowLeftRight, MoreHorizontal, Pencil } from "lucide-react";
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
import { setAccountArchived } from "@/lib/accounts/actions";
import type { AccountType, Currency } from "@/lib/accounts/constants";

import { AccountDialog } from "./account-dialog";
import { TransactionDialog } from "./transaction-dialog";

export type AccountActionsProps = {
  account: {
    id: string;
    name: string;
    broker: string | null;
    account_type: string;
    currency: string;
    starting_balance: number;
    start_date: string;
    is_archived: boolean;
  };
  hasActivity: boolean;
  variant?: "icon" | "buttons";
};

export function AccountActions({ account, hasActivity, variant = "icon" }: AccountActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const toggleArchive = () =>
    startTransition(async () => {
      const result = await setAccountArchived(account.id, !account.is_archived);
      setArchiveOpen(false);
      if (!result.ok) return void toast.error(result.error);
      toast.success(account.is_archived ? "Account restored" : "Account archived");
    });

  return (
    <>
      {variant === "buttons" ? (
        <div className="flex flex-wrap gap-2">
          {!account.is_archived && (
            <Button variant="contrast" size="sm" className="h-8" onClick={() => setTxOpen(true)}>
              <ArrowLeftRight data-icon="inline-start" /> Deposit / withdraw
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8" onClick={() => setEditOpen(true)}>
            <Pencil data-icon="inline-start" /> Edit
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setArchiveOpen(true)}>
            {account.is_archived ? (
              <ArchiveRestore data-icon="inline-start" />
            ) : (
              <Archive data-icon="inline-start" />
            )}
            {account.is_archived ? "Restore" : "Archive"}
          </Button>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${account.name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil /> Edit
            </DropdownMenuItem>
            {!account.is_archived && (
              <DropdownMenuItem onSelect={() => setTxOpen(true)}>
                <ArrowLeftRight /> Deposit / withdraw
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setArchiveOpen(true)}>
              {account.is_archived ? <ArchiveRestore /> : <Archive />}
              {account.is_archived ? "Restore" : "Archive"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <AccountDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        accountId={account.id}
        currencyLocked={hasActivity}
        defaultValues={{
          name: account.name,
          broker: account.broker ?? "",
          accountType: account.account_type as AccountType,
          currency: account.currency as Currency,
          startingBalance: String(account.starting_balance),
          startDate: account.start_date,
        }}
      />

      <TransactionDialog
        open={txOpen}
        onOpenChange={setTxOpen}
        accountId={account.id}
        accountName={account.name}
        currency={account.currency}
      />

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {account.is_archived ? `Restore ${account.name}?` : `Archive ${account.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {account.is_archived
                ? "It will appear in your active accounts and dashboard again."
                : "It will be hidden from your dashboard and trade form. Its trades and history are kept, and you can restore it any time."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                toggleArchive();
              }}
            >
              {pending ? "Saving…" : account.is_archived ? "Restore" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
