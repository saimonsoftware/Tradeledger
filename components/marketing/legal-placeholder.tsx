export function LegalPlaceholder({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-4 text-muted-foreground">
        This page is a placeholder. The full {title.toLowerCase()} will be published before
        TradeLedger launches publicly.
      </p>
    </div>
  );
}
