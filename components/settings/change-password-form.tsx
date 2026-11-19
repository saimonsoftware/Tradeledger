"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter";
import { FieldError, FormMessage } from "@/components/common/form-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/lib/settings/actions";
import { useFieldIds } from "@/lib/use-field-ids";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validation/settings";

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function ChangePasswordForm() {
  const f = useFieldIds();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  });
  const newPassword = useWatch({ control, name: "newPassword" }) ?? "";

  // Never leave passwords sitting in a hidden page.
  useEffect(() => () => reset(EMPTY), [reset]);

  const onSubmit = async () => {
    setServerError(null);
    const r = await changePassword(getValues());
    reset(EMPTY);
    if (!r.ok) {
      if (r.field) setError(r.field as keyof ChangePasswordInput, { message: r.error });
      return setServerError(r.error);
    }
    toast.success("Password changed. Other devices have been signed out.");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 sm:max-w-md">
      {serverError && <FormMessage type="error">{serverError}</FormMessage>}
      <div className="space-y-2">
        <Label htmlFor={f("currentPassword")}>Current password</Label>
        <PasswordInput
          id={f("currentPassword")}
          autoComplete="current-password"
          aria-invalid={!!errors.currentPassword}
          {...register("currentPassword")}
        />
        <FieldError id={f("currentPassword-error")} message={errors.currentPassword?.message} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={f("newPassword")}>New password</Label>
        <PasswordInput
          id={f("newPassword")}
          autoComplete="new-password"
          aria-invalid={!!errors.newPassword}
          aria-describedby={f("strength")}
          {...register("newPassword")}
        />
        <PasswordStrengthMeter id={f("strength")} password={newPassword} />
        <FieldError id={f("newPassword-error")} message={errors.newPassword?.message} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={f("confirmPassword")}>Confirm new password</Label>
        <PasswordInput
          id={f("confirmPassword")}
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
        <FieldError id={f("confirmPassword-error")} message={errors.confirmPassword?.message} />
      </div>
      <Button
        type="submit"
        variant="contrast"
        size="sm"
        className="h-8 px-4"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}
