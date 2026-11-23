"use client";

import { useRouter } from "next/navigation";

import { useFieldIds } from "@/lib/use-field-ids";

/** Account filter: switches the view as soon as an account is chosen. */
export function AccountPicker({
  accounts,
  value,
  hrefFor,
}: {
  accounts: { id: string; name: string }[];
  value: string | undefined;
  /** URL for each choice ("" = all accounts), built on the server. */
  hrefFor: Record<string, string>;
}) {
  const router = useRouter();
  const f = useFieldIds();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={f("account")} className="text-xs text-muted-foreground">
        Account
      </label>
      <select
        id={f("account")}
        value={value ?? ""}
        onChange={(e) => router.push(hrefFor[e.target.value] ?? hrefFor[""])}
        className="h-8 max-w-48 rounded-xl border border-input bg-background px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
      >
        <option value="">All accounts</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </div>
  );
}
