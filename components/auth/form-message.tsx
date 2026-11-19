import { CircleAlert, CircleCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/** Form-level error/success banner. role="alert" makes screen readers announce it. */
export function FormMessage({ type, children }: { type: "error" | "success"; children: string }) {
  const Icon = type === "error" ? CircleAlert : CircleCheck;
  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
        type === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-profit/30 bg-profit-muted text-profit",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-[13px] text-destructive">
      {message}
    </p>
  );
}
