"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { deleteTrade } from "@/lib/trades/actions";

/** Delete with confirmation. Used on the detail page and in table row menus. */
export function DeleteTradeDialog({
  tradeId,
  label,
  open,
  onOpenChange,
  redirectTo,
}: {
  tradeId: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await deleteTrade(tradeId);
      onOpenChange(false);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Trade deleted");
      if (redirectTo) router.push(redirectTo);
    });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this {label} trade?</AlertDialogTitle>
          <AlertDialogDescription>
            It will be removed from your journal and your account balance will be recalculated. This
            can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              confirm();
            }}
          >
            {pending ? "Deleting…" : "Delete trade"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteTradeButton({ tradeId, label }: { tradeId: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className="h-8" onClick={() => setOpen(true)}>
        <Trash2 data-icon="inline-start" /> Delete
      </Button>
      <DeleteTradeDialog
        tradeId={tradeId}
        label={label}
        open={open}
        onOpenChange={setOpen}
        redirectTo="/app/trades"
      />
    </>
  );
}
