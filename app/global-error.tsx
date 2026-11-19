"use client"; // Replaces the root layout when it fails, so it brings its own <html>/<body>.

import "./globals.css";

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center text-foreground">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">
          TradeLedger couldn&apos;t load. Your data is safe.
        </p>
        <button
          onClick={() => retry()}
          className="mt-6 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
