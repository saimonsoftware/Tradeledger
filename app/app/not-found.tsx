import Link from "next/link";

import { StatusPage } from "@/components/common/status-page";
import { Button } from "@/components/ui/button";

// Shown inside the app shell, e.g. for a trade or account that doesn't exist
// (or belongs to someone else: RLS makes those indistinguishable, by design).
export default function AppNotFound() {
  return (
    <StatusPage
      code="404"
      title="Not found"
      body="We couldn't find that page. It may have been deleted."
      actions={
        <>
          <Button asChild variant="contrast" className="h-10 px-4">
            <Link href="/app/dashboard">Back to dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="h-10 px-4">
            <Link href="/app/trades">View trades</Link>
          </Button>
        </>
      }
    />
  );
}
