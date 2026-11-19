import "server-only";

import Anthropic from "@anthropic-ai/sdk";

// Server-only: the API key must never reach the browser (no NEXT_PUBLIC_ prefix).
// Read lazily at request time so the app still builds where the key isn't set yet.
let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AiNotConfiguredError();
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set");
  }
}

/** The model used for the AI Coach (current default Claude model). */
export const COACH_MODEL = "claude-opus-5-5";

/** Refusal fallbacks: if the model declines, the API re-runs on a fallback model. */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";
