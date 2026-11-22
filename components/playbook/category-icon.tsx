import { Brain, Clock, LogIn, LogOut, Shapes, ShieldAlert, type LucideIcon } from "lucide-react";

import type { RuleCategory } from "@/lib/validation/rules";

export const CATEGORY_ICONS: Record<RuleCategory, LucideIcon> = {
  entry: LogIn,
  exit: LogOut,
  risk: ShieldAlert,
  discipline: Brain,
  schedule: Clock,
  other: Shapes,
};
