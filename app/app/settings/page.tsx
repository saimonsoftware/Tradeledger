import { Settings } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <ComingSoon
      icon={Settings}
      title="Settings are on the way"
      body="Profile, timezone, password and two-factor settings will live here."
    />
  );
}
