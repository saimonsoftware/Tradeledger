"use client";

import { useLayoutEffect } from "react";

/**
 * Plays the launch intro when the app opens right after a login that didn't load a
 * new page (Server Action → client navigation, so the <head> script didn't run).
 * useLayoutEffect runs before the browser paints, so the dashboard never flashes first.
 */
export function PostLoginIntro() {
  useLayoutEffect(() => {
    if (!document.cookie.split("; ").includes("tl-intro=1")) return;
    document.cookie = "tl-intro=; Max-Age=0; Path=/";
    const root = document.documentElement;
    root.classList.add("tl-launch");
    window.setTimeout(() => root.classList.remove("tl-launch"), 2600);
  }, []);
  return null;
}
