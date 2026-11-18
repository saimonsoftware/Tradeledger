"use client";

// Wraps next-themes so the rest of the app can import it from one place.
// next-themes injects a tiny inline script that applies the saved theme
// *before* the page is painted, so users never see a flash of the wrong theme.
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props} />;
}
