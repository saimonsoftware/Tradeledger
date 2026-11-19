"use client";

import { formatInTimeZone } from "date-fns-tz";
import { Trash2 } from "lucide-react";
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
import { deleteTransaction } from "@/lib/accounts/actions";
import { formatCurrency } from "@/lib/format/currency";

type Tx = {
  id: string;
  type: string;
  amount: number;
  occurred_at: string;
  note: string | null;
};

export function TransactionList({
  transactions,
  currency,
}: {
  transactions: Tx[];
  currency: string;
}) {
  const [toDelete, setToDelete] = useState<Tx | null>(null);
  const [pending, startTransition] = useTransition();

  if (!transactions.length) {
    return (
      <p className="px-5 py-10 text-center text-sm text-muted-foreground">
        No deposits or withdrawals yet.
      </p>
    );
  }

  const confirmDelete = () =>
    startTransition(async () => {
      if (!toDelete) return;
      const result = await deleteTransaction(toDelete.id);
      setToDelete(null);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Transaction deleted");
    });

  return (
    <>
      <ul className="divide-y">
        {transactions.map((tx) => {
          const isDeposit = tx.type === "deposit";
          return (
            <li key={tx.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{isDeposit ? "Deposit" : "Withdrawal"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {/* Stored at 12:00 UTC, so the UTC date is the date the user picked. */}
                  {formatInTimeZone(tx.occurred_at, "UTC", "d MMM yyyy")}
                  {tx.note ? ` · ${tx.note}` : ""}
                </p>
              </div>
              <p
                className={`text-sm font-medium tabular-nums ${isDeposit ? "text-profit" : "text-foreground"}`}
              >
                {isDeposit ? "+" : "−"}
                {formatCurrency(Number(tx.amount), currency)}
              </p>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${tx.type} of ${formatCurrency(Number(tx.amount), currency)}`}
                onClick={() => setToDelete(tx)}
              >
                <Trash2 />
              </Button>
            </li>
          );
        })}
      </ul>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {toDelete?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              The account balance will be recalculated. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {pending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
