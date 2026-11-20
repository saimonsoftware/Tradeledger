"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

// A thin glowing line along the top of the window while a page is loading.
//
// The App Router has no global "navigation started" event, so this starts on a
// click on an internal link (or browser back/forward) and finishes when the URL
// has changed. It only appears if loading takes longer than SHOW_AFTER_MS, so
// instant (prefetched) page switches don't flicker. State lives on the element's
// data-state attribute (no React re-renders); the look is `.nav-progress` in
// globals.css.

const SHOW_AFTER_MS = 120;
const GIVE_UP_MS = 10_000;

function Bar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const bar = useRef<HTMLDivElement>(null);
  const showTimer = useRef<number | undefined>(undefined);
  const giveUpTimer = useRef<number | undefined>(undefined);
  const pending = useRef(false);

  // The URL changed: the new page has arrived.
  useEffect(() => {
    if (!pending.current) return;
    pending.current = false;
    window.clearTimeout(showTimer.current);
    window.clearTimeout(giveUpTimer.current);
    const el = bar.current;
    if (el?.dataset.state === "loading") {
      el.dataset.state = "done";
      window.setTimeout(() => {
        if (el.dataset.state === "done") el.dataset.state = "idle";
      }, 450);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const start = () => {
      pending.current = true;
      window.clearTimeout(showTimer.current);
      window.clearTimeout(giveUpTimer.current);
      showTimer.current = window.setTimeout(() => {
        if (pending.current && bar.current) bar.current.dataset.state = "loading";
      }, SHOW_AFTER_MS);
      // Never leave the line hanging (e.g. a navigation that was cancelled).
      giveUpTimer.current = window.setTimeout(() => {
        pending.current = false;
        if (bar.current) bar.current.dataset.state = "idle";
      }, GIVE_UP_MS);
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // new tab/window
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || (a.target && a.target !== "_self") || a.hasAttribute("download")) {
        return;
      }
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page (or just a #section on it): nothing will load.
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", start);
      window.clearTimeout(showTimer.current);
      window.clearTimeout(giveUpTimer.current);
    };
  }, []);

  return <div ref={bar} className="nav-progress" data-state="idle" aria-hidden="true" />;
}

export function NavProgress() {
  // Reading the URL needs a Suspense boundary (Cache Components rule).
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
