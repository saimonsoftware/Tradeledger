import type { ReactNode } from "react";

/** Shared layout for 404 and error screens. */
export function StatusPage({
  code,
  title,
  body,
  actions,
}: {
  code: string;
  title: string;
  body: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <p className="font-mono text-sm tracking-[0.2em] text-primary">{code}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <div className="mt-3 max-w-md text-muted-foreground">{body}</div>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{actions}</div>
    </div>
  );
}
