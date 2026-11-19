import "server-only";

import { cache } from "react";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/** The user's profile settings (timezone drives all date logic). Cached per request. */
export const getProfile = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, timezone, default_currency")
    .eq("id", user.id)
    .maybeSingle();
  return {
    displayName: data?.display_name ?? null,
    timezone: data?.timezone ?? "UTC",
    defaultCurrency: data?.default_currency ?? "EUR",
  };
});
