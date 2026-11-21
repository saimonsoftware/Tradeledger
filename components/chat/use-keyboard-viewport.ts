"use client";

import { useEffect } from "react";

// Phones: keep the chat screen still when the on-screen keyboard opens.
//
// On iPhone, focusing the message box makes Safari slide the WHOLE page up so the
// box isn't hidden behind the keyboard (the top bar and the first messages vanish).
// The visualViewport API tells us exactly which part of the screen is still
// visible above the keyboard. While the chat page is open on a phone we:
//   - add `chat-lock` to <html>: the app area (top bar + chat) becomes fixed and is
//     sized/positioned to that visible part (CSS in globals.css), so nothing slides;
//   - add `chat-kb` while the keyboard is open (no home-indicator padding, and the
//     small disclaimer line hides to save space);
//   - undo any page scroll Safari still makes.
// Result: the top bar stays put, the messages shrink, and the message box sits
// right on top of the keyboard. Tablets/desktops (≥768px) are left alone.

const PHONE = "(max-width: 767px)";
const KEYBOARD_MIN_PX = 120; // smaller height changes are browser bars, not a keyboard

export function useKeyboardViewport() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const phone = window.matchMedia(PHONE);
    let frame = 0;

    const apply = () => {
      frame = 0;
      if (!phone.matches) {
        root.classList.remove("chat-lock", "chat-kb");
        return;
      }
      root.classList.add("chat-lock");
      root.style.setProperty("--vv-height", `${Math.round(vv.height)}px`);
      root.style.setProperty("--vv-top", `${Math.round(vv.offsetTop)}px`);
      root.classList.toggle("chat-kb", window.innerHeight - vv.height > KEYBOARD_MIN_PX);
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    vv.addEventListener("resize", schedule);
    vv.addEventListener("scroll", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    phone.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", schedule);
      vv.removeEventListener("scroll", schedule);
      window.removeEventListener("scroll", schedule);
      phone.removeEventListener("change", schedule);
      root.classList.remove("chat-lock", "chat-kb");
      root.style.removeProperty("--vv-height");
      root.style.removeProperty("--vv-top");
    };
  }, []);
}
