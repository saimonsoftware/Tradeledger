"use client";

import { useId } from "react";

/**
 * Unique, stable element ids for a form instance: f("email") → ":r1:-email".
 * Needed because Next keeps previously visited pages alive (hidden). Fixed ids
 * like id="email" would then exist twice, and <label htmlFor> would point at the
 * hidden copy instead of the visible field.
 */
export function useFieldIds() {
  const uid = useId();
  return (name: string) => `${uid}-${name}`;
}
