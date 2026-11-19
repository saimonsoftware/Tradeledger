import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl surface px-6 py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl border bg-background text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-lg font-semibold">{title}</h1>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
