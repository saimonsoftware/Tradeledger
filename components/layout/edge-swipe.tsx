"use client";

import { useEffect, useRef } from "react";

import { useSidebar } from "@/components/ui/sidebar";

// Swipe in from the left edge → open the side panel (instead of going back a page).
//
// iPhone home-screen apps (and Safari) treat a swipe from the left edge as "Back".
// The only way a web page can stop that is to cancel the touch the moment it starts
// (`preventDefault()` on touchstart, which needs a non-passive listener). So for
// touches that START in a thin strip along the left edge we:
//   1. cancel the browser's gesture (no more accidental "Back"),
//   2. follow the finger ourselves and open the sidebar once it has moved right,
//   3. replay a plain tap as a click, because cancelling touchstart also cancels the
//      click that would normally follow (so buttons near the edge still work).
// Touches anywhere else are untouched: normal scrolling, taps and swipes everywhere.
// Android's system Back gesture belongs to the phone itself and can't be changed
// by a website.

const EDGE_PX = 24; // width of the strip along the left edge
const OPEN_AFTER_PX = 40; // how far right the finger moves before the panel opens
const TAP_SLOP_PX = 10; // smaller movements count as a tap

export function EdgeSwipe() {
  const { isMobile, openMobile, setOpenMobile, open, setOpen } = useSidebar();

  // The listeners are added once; they read the latest sidebar state from this ref.
  const latest = useRef({ isMobile, openMobile, setOpenMobile, open, setOpen });
  useEffect(() => {
    latest.current = { isMobile, openMobile, setOpenMobile, open, setOpen };
  });

  useEffect(() => {
    let tracking: { id: number; x: number; y: number; moved: boolean } | null = null;

    const onStart = (e: TouchEvent) => {
      tracking = null;
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.clientX > EDGE_PX) return;
      e.preventDefault(); // stops the browser's "swipe back"
      tracking = { id: t.identifier, x: t.clientX, y: t.clientY, moved: false };
    };

    const find = (list: TouchList) =>
      tracking ? Array.from(list).find((t) => t.identifier === tracking?.id) : undefined;

    const onMove = (e: TouchEvent) => {
      const t = find(e.changedTouches);
      if (!tracking || !t) return;
      const dx = t.clientX - tracking.x;
      const dy = t.clientY - tracking.y;
      if (Math.abs(dx) > TAP_SLOP_PX || Math.abs(dy) > TAP_SLOP_PX) tracking.moved = true;
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > TAP_SLOP_PX) {
        tracking = null; // mostly vertical: not a sidebar swipe
        return;
      }
      if (dx >= OPEN_AFTER_PX) {
        tracking = null;
        const s = latest.current;
        if (s.isMobile) {
          if (!s.openMobile) s.setOpenMobile(true);
        } else if (!s.open) {
          s.setOpen(true); // tablets wide enough for the desktop sidebar
        }
      }
    };

    const onEnd = (e: TouchEvent) => {
      const t = find(e.changedTouches);
      const wasTap = tracking && t && !tracking.moved;
      tracking = null;
      if (!wasTap || !t) return;
      // Replay the tap that preventDefault() swallowed.
      const target = document.elementFromPoint(t.clientX, t.clientY);
      if (!(target instanceof HTMLElement)) return;
      const focusable = target.closest<HTMLElement>(
        "input, textarea, select, [contenteditable='true']",
      );
      if (focusable) focusable.focus();
      target.click();
    };

    const onCancel = () => {
      tracking = null;
    };

    const opts = { passive: false, capture: true } as const;
    document.addEventListener("touchstart", onStart, opts);
    document.addEventListener("touchmove", onMove, opts);
    document.addEventListener("touchend", onEnd, opts);
    document.addEventListener("touchcancel", onCancel, opts);
    return () => {
      document.removeEventListener("touchstart", onStart, opts);
      document.removeEventListener("touchmove", onMove, opts);
      document.removeEventListener("touchend", onEnd, opts);
      document.removeEventListener("touchcancel", onCancel, opts);
    };
  }, []);

  return null;
}
