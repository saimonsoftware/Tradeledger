import { Badge } from "@/components/ui/badge";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/accounts/constants";

export function AccountTypeBadge({ type }: { type: string }) {
  const label = ACCOUNT_TYPE_LABELS[type as AccountType] ?? type;
  return (
    <Badge variant="outline" className="font-normal text-muted-foreground">
      {label}
    </Badge>
  );
}
