"use client"; // Error boundaries must be Client Components

import { ErrorView } from "@/components/common/error-view";

export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <main id="main" className="flex flex-1 flex-col">
      <ErrorView error={error} retry={retry} homeHref="/" />
    </main>
  );
}
