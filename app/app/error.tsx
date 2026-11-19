"use client"; // Error boundaries must be Client Components

import { ErrorView } from "@/components/common/error-view";

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorView error={error} retry={retry} homeHref="/app/dashboard" />;
}
