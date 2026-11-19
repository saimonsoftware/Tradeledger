"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/dal";
import { removeAllScreenshots } from "@/lib/screenshots/storage";
import { createClient } from "@/lib/supabase/server";
import { verifyPassword } from "@/lib/supabase/verify-password";
import {
  changePasswordSchema,
  deleteAccountSchema,
  profileSchema,
  type ChangePasswordInput,
  type DeleteAccountInput,
  type ProfileInput,
} from "@/lib/validation/settings";

export type SettingsResult = { ok: true } | { ok: false; error: string; field?: string };

const GENERIC = "Something went wrong. Please try again.";
const first = (e: { issues: { message: string; path: PropertyKey[] }[] }): SettingsResult => ({
  ok: false,
  error: e.issues[0]?.message ?? GENERIC,
  field: e.issues[0]?.path[0]?.toString(),
});

export async function updateProfile(input: ProfileInput): Promise<SettingsResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return first(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      timezone: parsed.data.timezone,
      default_currency: parsed.data.defaultCurrency,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: GENERIC };

  refresh();
  return { ok: true };
}

export async function changePassword(input: ChangePasswordInput): Promise<SettingsResult> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return first(parsed.error);

  // Prove it's really them (e.g. not someone at an unlocked laptop).
  if (!(await verifyPassword(user.email, parsed.data.currentPassword))) {
    return { ok: false, error: "Your current password is incorrect.", field: "currentPassword" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) {
    if (error.code === "weak_password") {
      return {
        ok: false,
        error: "That password has appeared in a data breach or is too weak. Choose another.",
        field: "newPassword",
      };
    }
    return { ok: false, error: GENERIC };
  }

  // Keep this device signed in; sign out every other device.
  await supabase.auth.signOut({ scope: "others" });
  return { ok: true };
}

export async function signOutEverywhere(): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  // Revokes every refresh token for this user: all devices and browsers.
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}

export async function deleteAccount(input: DeleteAccountInput): Promise<SettingsResult> {
  const user = await requireUser();
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) return first(parsed.error);

  if (!(await verifyPassword(user.email, parsed.data.password))) {
    return { ok: false, error: "Your password is incorrect.", field: "password" };
  }

  const supabase = await createClient();
  // Screenshot files first (Storage isn't covered by the database cascade).
  await removeAllScreenshots(supabase, user.id);
  // Deletes ONLY the caller (auth.uid()) and, by cascade, all of their data.
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { ok: false, error: GENERIC };

  // The user no longer exists; clear this browser's session cookie.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?deleted=1");
}
