"use client";

import { TriangleAlert } from "lucide-react";
import { useState, useTransition } from "react";

import { PasswordInput } from "@/components/auth/password-input";
import { FormMessage } from "@/components/common/form-message";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccount } from "@/lib/settings/actions";
import { useFieldIds } from "@/lib/use-field-ids";

export function DeleteAccount() {
  const f = useFieldIds();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = (o: boolean) => {
    setOpen(o);
    if (!o) {
      setConfirmation("");
      setPassword("");
      setError(null);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await deleteAccount({ confirmation, password });
      // On success the action redirects; we only get here on failure.
      setPassword("");
      if (r && !r.ok) setError(r.error);
    });
  };

  return (
    <>
      <Button variant="destructive" size="sm" className="h-8" onClick={() => setOpen(true)}>
        Delete my account
      </Button>
      <AlertDialog open={open} onOpenChange={close}>
        <AlertDialogContent>
          <form onSubmit={submit} className="space-y-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <TriangleAlert className="size-5 text-destructive" aria-hidden="true" /> Delete your
                account?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes your account and <strong>all</strong> of your trading
                accounts, deposits, withdrawals and trades. It can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {error && <FormMessage type="error">{error}</FormMessage>}
            <div className="space-y-2">
              <Label htmlFor={f("confirmation")}>
                Type <span className="font-mono font-semibold">DELETE</span> to confirm
              </Label>
              <Input
                id={f("confirmation")}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={f("password")}>Your password</Label>
              <PasswordInput
                id={f("password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel type="button" disabled={pending}>
                Cancel
              </AlertDialogCancel>
              <Button
                type="submit"
                variant="destructive"
                disabled={pending || confirmation !== "DELETE" || !password}
              >
                {pending ? "Deleting…" : "Permanently delete"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
