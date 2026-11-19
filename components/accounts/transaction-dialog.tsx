"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FieldError, FormMessage } from "@/components/common/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTransaction } from "@/lib/accounts/actions";
import { cn } from "@/lib/utils";
import { useFieldIds } from "@/lib/use-field-ids";
import {
  transactionSchema,
  type TransactionInput,
  type TransactionOutput,
} from "@/lib/validation/accounts";

export function TransactionDialog({
  open,
  onOpenChange,
  accountId,
  accountName,
  currency,
  defaultType = "deposit",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
  currency: string;
  defaultType?: "deposit" | "withdrawal";
}) {
  const f = useFieldIds();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<TransactionInput, unknown, TransactionOutput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      accountId,
      type: defaultType,
      amount: "",
      date: format(new Date(), "yyyy-MM-dd"),
      note: "",
    },
  });

  const onSubmit = async () => {
    setServerError(null);
    const values = getValues();
    const result = await createTransaction(values);
    if (!result.ok) return setServerError(result.error);
    toast.success(values.type === "deposit" ? "Deposit recorded" : "Withdrawal recorded");
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deposit or withdrawal</DialogTitle>
          <DialogDescription>
            Record money moving in or out of <span className="text-foreground">{accountName}</span>{" "}
            so its balance stays accurate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {serverError && <FormMessage type="error">{serverError}</FormMessage>}

          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <div
                role="radiogroup"
                aria-label="Type"
                className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
              >
                {(["deposit", "withdrawal"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={field.value === t}
                    onClick={() => field.onChange(t)}
                    className={cn(
                      "h-8 rounded-md text-sm font-medium capitalize transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      field.value === t
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={f("amount")}>Amount ({currency})</Label>
              <Input
                id={f("amount")}
                inputMode="decimal"
                placeholder="500.00"
                className="tabular-nums"
                aria-invalid={!!errors.amount}
                {...register("amount")}
              />
              <FieldError id={f("amount-error")} message={errors.amount?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={f("date")}>Date</Label>
              <Input
                id={f("date")}
                type="date"
                aria-invalid={!!errors.date}
                {...register("date")}
              />
              <FieldError id={f("date-error")} message={errors.date?.message} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={f("note")}>
              Note <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea id={f("note")} rows={2} maxLength={500} {...register("note")} />
            <FieldError id={f("note-error")} message={errors.note?.message} />
          </div>

          <Button type="submit" variant="contrast" className="h-10 w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
