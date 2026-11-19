/**
 * Revoked sessions are rejected immediately (not only when the token expires).
 * Uses test user B through the public API. Nothing persistent is changed.
 */
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.ISOLATION_USER_B_EMAIL;
const password = process.env.ISOLATION_USER_B_PASSWORD;
const configured = Boolean(url && key && email && password);

const device = () =>
  createClient<Database>(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });

describe.skipIf(!configured)("session revocation", () => {
  it("'sign out everywhere' makes other devices' still-valid tokens fail session_is_active()", async () => {
    const laptop = device();
    const phone = device();
    expect(
      (await laptop.auth.signInWithPassword({ email: email!, password: password! })).error,
    ).toBeNull();
    expect(
      (await phone.auth.signInWithPassword({ email: email!, password: password! })).error,
    ).toBeNull();

    expect((await phone.rpc("session_is_active")).data).toBe(true);

    // Sign out everywhere from the laptop.
    expect((await laptop.auth.signOut({ scope: "global" })).error).toBeNull();

    // The phone's access token is still cryptographically valid, but its session is gone.
    const { data } = await phone.rpc("session_is_active");
    expect(data).toBe(false);
  });

  it("a logged-out visitor cannot call session_is_active()", async () => {
    const { error } = await device().rpc("session_is_active");
    expect(error).not.toBeNull();
  });
});
