"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/**
 * Log in / Sign up, or "Go to dashboard" if the visitor already has a session.
 * Checked in the browser after load, so the landing page itself stays static.
 * This only changes which button is shown. It grants no access: /app/* is
 * still protected by the proxy and by server-side checks.
 */
export function NavAuthButtons() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setLoggedIn(Boolean(data.session)));
  }, []);

  if (loggedIn) {
    return (
      <Button asChild size="lg" variant="contrast" className="px-3.5">
        <Link href="/app/dashboard">
          Go to dashboard <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button asChild variant="ghost" size="lg" className="hidden md:inline-flex">
        <Link href="/login">Log in</Link>
      </Button>
      <Button asChild size="lg" variant="contrast" className="px-3.5">
        <Link href="/signup">Sign up</Link>
      </Button>
    </>
  );
}
