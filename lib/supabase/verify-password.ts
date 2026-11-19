import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

/**
 * Re-authentication for sensitive actions (change password, delete account).
 * Checks the password with a SEPARATE, throwaway client (no cookies), so the
 * user's real session is never touched, then immediately revokes the temporary
 * session it created.
 */
export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const client = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) return false;
  await client.auth.signOut({ scope: "local" });
  return true;
}
