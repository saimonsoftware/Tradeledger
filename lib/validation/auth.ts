import { z } from "zod";

// Shared by the browser (instant feedback) and the server (actual enforcement).
// The server ALWAYS re-validates: browser checks can be bypassed.

export const PASSWORD_MIN = 12;
// Supabase (bcrypt) only uses the first 72 bytes of a password; longer ones are rejected.
export const PASSWORD_MAX = 72;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address")
  .max(254, "That email address is too long")
  .pipe(z.email("Enter a valid email address"));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .refine((p) => new TextEncoder().encode(p).length <= PASSWORD_MAX, {
    message: `Use at most ${PASSWORD_MAX} characters`,
  });

const isValidTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    displayName: z.string().trim().max(50, "Keep your name under 50 characters").optional(),
    // Detected in the browser; validated here and again by the database trigger.
    timezone: z.string().max(64).refine(isValidTimeZone).optional().catch(undefined),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });

export const logInSchema = z.object({
  email: emailSchema,
  // Don't apply the length policy at login: just require something.
  password: z
    .string()
    .min(1, "Enter your password")
    .max(PASSWORD_MAX * 4),
  next: z.string().optional(),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });

export type SignUpInput = z.input<typeof signUpSchema>;
export type LogInInput = z.input<typeof logInSchema>;
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
