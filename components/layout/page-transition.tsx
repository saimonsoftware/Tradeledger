import { ViewTransition } from "react";

/**
 * Page-switch animation. Used in the `template.tsx` files, which Next.js creates
 * fresh on every navigation, so the old page fades out and the new one rises in
 * (CSS: `.page-enter` / `.page-exit` in globals.css). Navigations are React
 * transitions, so this runs on the browser's View Transitions API automatically;
 * browsers without it just switch pages instantly.
 * The top bar and sidebar live in layouts, outside this, so they stay still.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}
