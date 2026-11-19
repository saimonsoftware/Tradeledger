"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/dal";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  logInSchema,
  resetPasswordSchema,
  signUpSchema,
  type ForgotPasswordInput,
  type LogInInput,
  type ResetPasswordInput,
  type SignUpInput,
} from "@/lib/validation/auth";

// Server Actions are public HTTP endpoints: anyone can call them with any data.
// So every action validates its input with Zod here, even though the form already did.

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

// Deliberately vague messages, so the forms can't be used to discover which
// email addresses have accounts ("account enumeration").
const INVALID_LOGIN = "Invalid email or password.";
const CHECK_INBOX = "If that email is valid, check your inbox.";
const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";
const GENERIC = "Something went wrong. Please try again.";

type AuthErrorLike = { code?: string; status?: number } | null;

const isRateLimited = (e: AuthErrorLike) =>
  e?.status === 429 ||
  e?.code === "over_request_rate_limit" ||
  e?.code === "over_email_send_rate_limit";

const callbackUrl = (next: string) =>
  `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`;

export async function signUp(input: SignUpInput, captchaToken?: string): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC };
  const { email, password, displayName, timezone } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl("/app/dashboard"),
      // Stored on the auth user; the database trigger copies (and re-validates) these
      // into the user's `profiles` row.
      data: { display_name: displayName || null, timezone: timezone ?? "UTC" },
      captchaToken,
    },
  });

  if (error) {
    if (isRateLimited(error)) return { ok: false, error: TOO_MANY };
    // Leaked/weak password: about the password itself, so safe and useful to say.
    if (error.code === "weak_password") {
      return {
        ok: false,
        error:
          "That password has appeared in a known data breach or is too weak. Please choose a different one.",
      };
    }
    if (error.code === "captcha_failed")
      return { ok: false, error: "Please complete the security check." };
    // Anything else (including "user already exists"): stay neutral.
    console.error("signUp failed:", error.code ?? error.message);
  }

  // Same outcome whether or not the email was already registered.
  redirect("/check-email");
}

export async function logIn(input: LogInInput, captchaToken?: string): Promise<ActionResult> {
  const parsed = logInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID_LOGIN };
  const { email, password, next } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken },
  });

  if (error) {
    if (isRateLimited(error)) return { ok: false, error: TOO_MANY };
    if (error.code === "captcha_failed")
      return { ok: false, error: "Please complete the security check." };
    // Only reachable with the correct password, so it reveals nothing to an attacker.
    if (error.code === "email_not_confirmed") {
      return { ok: false, error: "Please verify your email first. Check your inbox for the link." };
    }
    return { ok: false, error: INVALID_LOGIN };
  }

  // Accounts with 2FA must also enter an authenticator code.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
    redirect(`/login/verify?next=${encodeURIComponent(safeRedirectPath(next))}`);
  }

  redirect(safeRedirectPath(next));
}

export async function logOut(): Promise<void> {
  const supabase = await createClient();
  // Clears the session cookie and revokes this session's refresh token server-side.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

export async function requestPasswordReset(
  input: ForgotPasswordInput,
  captchaToken?: string,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl("/reset-password"),
    captchaToken,
  });

  if (error) {
    if (isRateLimited(error)) return { ok: false, error: TOO_MANY };
    if (error.code === "captcha_failed")
      return { ok: false, error: "Please complete the security check." };
    console.error("resetPasswordForEmail failed:", error.code ?? error.message);
  }
  // Always the same answer, whether or not the account exists.
  return { ok: true, message: CHECK_INBOX };
}

export async function updatePassword(input: ResetPasswordInput): Promise<ActionResult> {
  // The reset link signed the user in with a short-lived recovery session.
  await requireUser();

  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "weak_password") {
      return {
        ok: false,
        error:
          "That password has appeared in a known data breach or is too weak. Please choose a different one.",
      };
    }
    if (error.code === "same_password") {
      return { ok: false, error: "Choose a password you haven't used for this account." };
    }
    if (error.code === "reauthentication_needed" || error.code === "session_expired") {
      return { ok: false, error: "This reset link has expired. Please request a new one." };
    }
    return { ok: false, error: GENERIC };
  }

  // Sign out every OTHER device, in case the old password was compromised.
  await supabase.auth.signOut({ scope: "others" });
  redirect("/app/dashboard");
}
