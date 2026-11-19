"use client";

import { passwordStrength } from "@/lib/auth/password-strength";
import { cn } from "@/lib/utils";

const barColour = ["bg-loss", "bg-loss", "bg-chart-5", "bg-profit", "bg-profit"];

export function PasswordStrengthMeter({ password, id }: { password: string; id: string }) {
  const { score, label, hint } = passwordStrength(password);
  if (!password) return null;
  return (
    <div id={id} className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full bg-muted transition-colors",
              score >= i && barColour[score],
              score === 0 && i === 1 && "bg-loss/60",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Strength: <span className="font-medium text-foreground">{label}</span>
        {hint && <> · {hint}</>}
      </p>
    </div>
  );
}
