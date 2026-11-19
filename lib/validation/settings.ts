import { z } from "zod";

import { CURRENCIES } from "@/lib/accounts/constants";

import { PASSWORD_MAX, passwordSchema } from "./auth";

export const isValidTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(50, "Keep your name under 50 characters")
    .optional()
    .transform((s) => s || null),
  // Checked here AND by the database trigger (pg_timezone_names).
  timezone: z.string().max(64).refine(isValidTimeZone, "Choose a valid timezone"),
  defaultCurrency: z.enum(CURRENCIES, { message: "Choose a currency" }),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Enter your current password")
      .max(PASSWORD_MAX * 4),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ["newPassword"],
    message: "Choose a different password from your current one",
  });

export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE", { message: "Type DELETE (in capitals) to confirm" }),
  password: z
    .string()
    .min(1, "Enter your password")
    .max(PASSWORD_MAX * 4),
});

export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileOutput = z.output<typeof profileSchema>;
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
// Typed loosely: whatever the user typed is sent, and the server checks it's exactly "DELETE".
export type DeleteAccountInput = { confirmation: string; password: string };
