import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { VerifyCodeForm } from "@/components/auth/verify-code-form";
import { Button } from "@/components/ui/button";
import { logOut } from "@/lib/auth/actions";
import { requirePasswordSession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Two-factor verification" };

async function Gate() {
  const user = await requirePasswordSession();
  // Already verified (or 2FA isn't on): nothing to do here.
  if (!user.mfaPending) redirect("/app/dashboard");
  return <VerifyCodeForm />;
}

export default function VerifyPage() {
  return (
    <AuthCard
      title="Two-factor verification"
      description="Enter the 6-digit code from your authenticator app."
      footer={
        <form action={logOut}>
          <Button type="submit" variant="link" className="h-auto p-0 text-muted-foreground">
            Use a different account
          </Button>
        </form>
      }
    >
      <Suspense fallback={<div className="h-32" />}>
        <Gate />
      </Suspense>
    </AuthCard>
  );
}
