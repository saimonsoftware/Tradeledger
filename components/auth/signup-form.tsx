"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/auth/actions";
import { PASSWORD_MIN, signUpSchema, type SignUpInput } from "@/lib/validation/auth";
import { useFieldIds } from "@/lib/use-field-ids";

import { FieldError, FormMessage } from "@/components/common/form-message";
import { PasswordInput } from "./password-input";
import { PasswordStrengthMeter } from "./password-strength-meter";

export function SignupForm() {
  const f = useFieldIds();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", confirmPassword: "", displayName: "" },
  });
  const password = useWatch({ control, name: "password" }) ?? "";

  const clearPasswords = () => {
    setValue("password", "");
    setValue("confirmPassword", "");
  };
  // Wipe passwords if this page is hidden (Next keeps visited pages alive in the background).
  useEffect(() => () => clearPasswords(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (values: SignUpInput) => {
    setServerError(null);
    // The browser's timezone becomes the default for "this week" calculations.
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const result = await signUp({ ...values, timezone });
    clearPasswords();
    if (result && !result.ok) setServerError(result.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && <FormMessage type="error">{serverError}</FormMessage>}

      <div className="space-y-2">
        <Label htmlFor={f("displayName")}>
          Name <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input id={f("displayName")} autoComplete="name" {...register("displayName")} />
        <FieldError id={f("displayName-error")} message={errors.displayName?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={f("email")}>Email</Label>
        <Input
          id={f("email")}
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? f("email-error") : undefined}
          {...register("email")}
        />
        <FieldError id={f("email-error")} message={errors.email?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={f("password")}>Password</Label>
        <PasswordInput
          id={f("password")}
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby={`${f("password-hint")} ${f("password-strength")}`}
          {...register("password")}
        />
        <p id={f("password-hint")} className="text-xs text-muted-foreground">
          At least {PASSWORD_MIN} characters. A short phrase is easy to remember and hard to guess.
        </p>
        <PasswordStrengthMeter id={f("password-strength")} password={password} />
        <FieldError id={f("password-error")} message={errors.password?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={f("confirmPassword")}>Confirm password</Label>
        <PasswordInput
          id={f("confirmPassword")}
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={errors.confirmPassword ? f("confirmPassword-error") : undefined}
          {...register("confirmPassword")}
        />
        <FieldError id={f("confirmPassword-error")} message={errors.confirmPassword?.message} />
      </div>

      <Button type="submit" variant="contrast" className="h-10 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
