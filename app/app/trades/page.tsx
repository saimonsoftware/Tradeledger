import { BookOpen } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Trades" };

export default function TradesPage() {
  return (
    <ComingSoon
      icon={BookOpen}
      title="Trade logging is next"
      body="Logging, filtering and reviewing trades arrives in the next build phase."
    />
  );
}
