"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logIn } from "@/lib/auth/actions";
import { logInSchema, type LogInInput } from "@/lib/validation/auth";
import { useFieldIds } from "@/lib/use-field-ids";

import { FieldError, FormMessage } from "@/components/common/form-message";
import { PasswordInput } from "./password-input";

const LINK_ERROR = "That link is invalid or has expired. Please request a new one.";

export function LoginForm() {
  const f = useFieldIds();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? undefined;
  const [serverError, setServerError] = useState<string | null>(
    searchParams.get("error") === "link" ? LINK_ERROR : null,
  );
  const accountDeleted = searchParams.get("deleted") === "1";

  const form = useForm<LogInInput>({
    resolver: zodResolver(logInSchema),
    defaultValues: { email: "", password: "", next },
  });
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  // Wipe the password if this page is hidden (Next keeps visited pages alive in the background).
  useEffect(() => () => setValue("password", ""), [setValue]);

  const onSubmit = async (values: LogInInput) => {
    setServerError(null);
    const result = await logIn({ ...values, next });
    setValue("password", "");
    if (result && !result.ok) setServerError(result.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && <FormMessage type="error">{serverError}</FormMessage>}
      {accountDeleted && !serverError && (
        <FormMessage type="success">
          Your account and all of its data have been deleted.
        </FormMessage>
      )}

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
        <div className="flex items-center justify-between">
          <Label htmlFor={f("password")}>Password</Label>
          <Link
            href="/forgot-password"
            className="text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id={f("password")}
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? f("password-error") : undefined}
          {...register("password")}
        />
        <FieldError id={f("password-error")} message={errors.password?.message} />
      </div>

      <Button type="submit" variant="contrast" className="h-10 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
