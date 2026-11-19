"use client";

import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

import type { Database } from "./database.types";

/**
 * Supabase client for Client Components (runs in the browser).
 * Uses the publishable key, which is safe to expose: Row Level Security in the
 * database decides what it can read or write. The session lives in cookies
 * (managed by @supabase/ssr), never in localStorage.
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
