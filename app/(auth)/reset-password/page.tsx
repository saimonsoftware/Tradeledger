import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Choose a new password" };

// The reset email link signs the user in (via /auth/callback) and lands here.
async function ResetPasswordContent() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>This reset link is invalid or has expired.</p>
        <Button asChild variant="contrast" className="h-10 w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }
  return <ResetPasswordForm />;
}

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a new password" description="You'll stay signed in on this device.">
      <Suspense fallback={<div className="h-56" />}>
        <ResetPasswordContent />
      </Suspense>
    </AuthCard>
  );
}
