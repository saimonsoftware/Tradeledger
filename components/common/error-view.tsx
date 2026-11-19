"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

import { StatusPage } from "./status-page";

/**
 * Friendly error screen. Server errors arrive with a generic message plus a
 * `digest` id (Next.js hides details so nothing sensitive leaks); we show the id
 * so it can be matched to the server logs.
 */
export function ErrorView({
  error,
  retry,
  homeHref,
}: {
  error: unknown;
  retry: () => void;
  homeHref: string;
}) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      code="ERROR"
      title="Something went wrong"
      body={
        <>
          <p>An unexpected error stopped this page from loading. Your data is safe.</p>
          {digest && <p className="mt-2 font-mono text-xs">Reference: {digest}</p>}
        </>
      }
      actions={
        <>
          <Button variant="contrast" className="h-10 px-4" onClick={() => retry()}>
            Try again
          </Button>
          <Button asChild variant="outline" className="h-10 px-4">
            <a href={homeHref}>Go back</a>
          </Button>
        </>
      }
    />
  );
}
