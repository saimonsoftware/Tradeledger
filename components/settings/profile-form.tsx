"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FieldError, FormMessage } from "@/components/common/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENCIES } from "@/lib/accounts/constants";
import { updateProfile } from "@/lib/settings/actions";
import { useFieldIds } from "@/lib/use-field-ids";
import { profileSchema, type ProfileInput, type ProfileOutput } from "@/lib/validation/settings";
import { useState } from "react";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2 text-base md:text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ProfileForm({
  defaultValues,
  timezones,
}: {
  defaultValues: ProfileInput;
  timezones: string[];
}) {
  const f = useFieldIds();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileInput, unknown, ProfileOutput>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  const onSubmit = async () => {
    setServerError(null);
    const values = getValues();
    const r = await updateProfile(values);
    if (!r.ok) return setServerError(r.error);
    reset(values); // new baseline, so "Save" disables again
    toast.success("Profile saved");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && <FormMessage type="error">{serverError}</FormMessage>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={f("displayName")}>Display name</Label>
          <Input id={f("displayName")} autoComplete="name" {...register("displayName")} />
          <FieldError id={f("displayName-error")} message={errors.displayName?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={f("timezone")}>Timezone</Label>
          {/* Native select: ~400 options, with built-in type-to-search and full accessibility. */}
          <select
            id={f("timezone")}
            className={selectClass}
            aria-describedby={f("timezone-hint")}
            {...register("timezone")}
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <p id={f("timezone-hint")} className="text-xs text-muted-foreground">
            Defines your trading week (Monday–Sunday) and how times are shown.
          </p>
          <FieldError id={f("timezone-error")} message={errors.timezone?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={f("defaultCurrency")}>Default currency</Label>
          <select
            id={f("defaultCurrency")}
            className={selectClass}
            aria-describedby={f("currency-hint")}
            {...register("defaultCurrency")}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <p id={f("currency-hint")} className="text-xs text-muted-foreground">
            Shown first on the dashboard chart.
          </p>
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="contrast"
          size="sm"
          className="h-8 px-4"
          disabled={isSubmitting || !isDirty}
        >
          {isSubmitting ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
