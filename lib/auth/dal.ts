import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * Data Access Layer: the ONE place that decides who the current user is.
 *
 * Uses supabase.auth.getUser(), which re-validates the session with Supabase on
 * every call. Unlike getSession() (which trusts whatever is in the cookie), this
 * catches revoked sessions, e.g. after "sign out everywhere" or a password reset.
 *
 * Wrapped in React's cache() so several components in one request share one lookup.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
});

/** For pages and Server Actions that require a logged-in user. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
