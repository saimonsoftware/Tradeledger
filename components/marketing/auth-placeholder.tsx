import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

// Temporary stand-in so the landing page buttons have somewhere to go.
// Replaced by the real forms in Phase 2.
export function AuthPlaceholder({ title }: { title: string }) {
  return (
    <div className="w-full max-w-sm rounded-2xl surface p-8 text-center shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Accounts are coming soon. This page will be ready in the next build phase.
      </p>
      <Button asChild variant="outline" size="lg" className="mt-6">
        <Link href="/">
          <ArrowLeft data-icon="inline-start" /> Back to home
        </Link>
      </Button>
    </div>
  );
}
