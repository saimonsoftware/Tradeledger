"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AccountInput } from "@/lib/validation/accounts";

import { AccountForm } from "./account-form";

/** Add (no accountId) or edit (with accountId) an account in a dialog. */
export function AccountDialog({
  open,
  onOpenChange,
  trigger,
  accountId,
  defaultValues,
  currencyLocked,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  accountId?: string;
  defaultValues?: Partial<AccountInput>;
  currencyLocked?: boolean;
}) {
  const router = useRouter();
  const editing = Boolean(accountId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit account" : "Add a trading account"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update this account's details."
              : "Add a broker or prop firm account to start tracking it."}
          </DialogDescription>
        </DialogHeader>
        <AccountForm
          accountId={accountId}
          defaultValues={defaultValues}
          currencyLocked={currencyLocked}
          onDone={({ id }) => {
            onOpenChange?.(false);
            toast.success(editing ? "Account updated" : "Account added");
            if (!editing && id) router.push(`/app/accounts/${id}`);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
