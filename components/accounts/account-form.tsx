"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { FieldError, FormMessage } from "@/components/common/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAccount, updateAccount } from "@/lib/accounts/actions";
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES, CURRENCIES } from "@/lib/accounts/constants";
import { accountSchema, type AccountInput, type AccountOutput } from "@/lib/validation/accounts";
import { useFieldIds } from "@/lib/use-field-ids";

export function AccountForm({
  accountId,
  defaultValues,
  currencyLocked = false,
  onDone,
}: {
  accountId?: string;
  defaultValues?: Partial<AccountInput>;
  currencyLocked?: boolean;
  onDone: (result: { id?: string }) => void;
}) {
  const f = useFieldIds();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<AccountInput, unknown, AccountOutput>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      broker: "",
      accountType: "live",
      currency: "EUR",
      startingBalance: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      ...defaultValues,
    },
  });

  // Runs only after browser validation passes. The server re-validates the raw
  // values itself, so we send exactly what the user typed.
  const onSubmit = async () => {
    setServerError(null);
    const values = getValues();
    const result = accountId ? await updateAccount(accountId, values) : await createAccount(values);
    if (!result.ok) return setServerError(result.error);
    onDone({ id: "data" in result ? result.data?.id : accountId });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && <FormMessage type="error">{serverError}</FormMessage>}

      <div className="space-y-2">
        <Label htmlFor={f("name")}>Account name</Label>
        <Input
          id={f("name")}
          placeholder="e.g. FTMO 100k Challenge"
          aria-invalid={!!errors.name}
          {...register("name")}
        />
        <FieldError id={f("name-error")} message={errors.name?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={f("broker")}>
          Broker / prop firm <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input id={f("broker")} placeholder="e.g. Interactive Brokers" {...register("broker")} />
        <FieldError id={f("broker-error")} message={errors.broker?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={f("accountType")}>Type</Label>
          <Controller
            control={control}
            name="accountType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={f("accountType")} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ACCOUNT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={f("currency")}>Currency</Label>
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={currencyLocked}>
                <SelectTrigger
                  id={f("currency")}
                  className="w-full"
                  aria-describedby={`${f("currency-hint")}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {currencyLocked && (
            <p id={f("currency-hint")} className="text-xs text-muted-foreground">
              Locked: this account already has activity.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={f("startingBalance")}>Starting balance</Label>
          <Input
            id={f("startingBalance")}
            inputMode="decimal"
            placeholder="10000.00"
            className="tabular-nums"
            aria-invalid={!!errors.startingBalance}
            {...register("startingBalance")}
          />
          <FieldError id={f("startingBalance-error")} message={errors.startingBalance?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={f("startDate")}>Start date</Label>
          <Input
            id={f("startDate")}
            type="date"
            aria-invalid={!!errors.startDate}
            {...register("startDate")}
          />
          <FieldError id={f("startDate-error")} message={errors.startDate?.message} />
        </div>
      </div>

      <Button type="submit" variant="contrast" className="h-10 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : accountId ? "Save changes" : "Add account"}
      </Button>
    </form>
  );
}
