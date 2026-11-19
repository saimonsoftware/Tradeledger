import type { Metadata } from "next";
import { Suspense } from "react";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

async function Welcome() {
  // Checked again here (not just in the proxy): defence in depth.
  const user = await requireUser();
  // Row Level Security means this query can only ever return the user's own profile.
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, timezone")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <p className="mt-2 text-muted-foreground">
      {profile?.display_name ? `Welcome, ${profile.display_name}. ` : ""}
      You&apos;re signed in as <span className="font-medium text-foreground">{user.email}</span>
      {profile && (
        <>
          {" "}
          · Timezone <span className="font-medium text-foreground">{profile.timezone}</span>
        </>
      )}
      .
    </p>
  );
}

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <Suspense fallback={<p className="mt-2 h-6 w-64 animate-pulse rounded bg-muted" />}>
        <Welcome />
      </Suspense>
      <div className="mt-8 rounded-2xl surface p-6 text-sm text-muted-foreground">
        Your accounts, weekly P&amp;L and recent trades will appear here.
      </div>
    </div>
  );
}
