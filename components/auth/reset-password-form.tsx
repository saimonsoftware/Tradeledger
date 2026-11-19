"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updatePassword } from "@/lib/auth/actions";
import { PASSWORD_MIN, resetPasswordSchema, type ResetPasswordInput } from "@/lib/validation/auth";

import { FieldError, FormMessage } from "./form-message";
import { PasswordInput } from "./password-input";
import { PasswordStrengthMeter } from "./password-strength-meter";

export function ResetPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const password = useWatch({ control, name: "password" }) ?? "";

  const clearPasswords = () => {
    setValue("password", "");
    setValue("confirmPassword", "");
  };
  useEffect(() => () => clearPasswords(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (values: ResetPasswordInput) => {
    setServerError(null);
    const result = await updatePassword(values);
    clearPasswords();
    if (result && !result.ok) setServerError(result.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && <FormMessage type="error">{serverError}</FormMessage>}

      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby="password-hint password-strength"
          {...register("password")}
        />
        <p id="password-hint" className="text-xs text-muted-foreground">
          At least {PASSWORD_MIN} characters.
        </p>
        <PasswordStrengthMeter id="password-strength" password={password} />
        <FieldError id="password-error" message={errors.password?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
        <FieldError id="confirmPassword-error" message={errors.confirmPassword?.message} />
      </div>

      <Button type="submit" variant="contrast" className="h-10 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
