import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = { title: "Check your email" };

// Shown after every sign-up attempt, whether or not the email was already
// registered, so the form can't be used to discover existing accounts.
export default function CheckEmailPage() {
  return (
    <AuthCard
      title="Check your email"
      footer={
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to log in
        </Link>
      }
    >
      <div className="space-y-4 text-sm text-muted-foreground">
        <span className="flex size-10 items-center justify-center rounded-lg bg-profit-muted text-profit">
          <MailCheck className="size-5" aria-hidden="true" />
        </span>
        <p>
          If that email is valid, we&apos;ve sent you a link to verify your address. Click it to
          finish creating your account.
        </p>
        <p>Can&apos;t find it? Check your spam folder. The link expires after 24 hours.</p>
      </div>
    </AuthCard>
  );
}
