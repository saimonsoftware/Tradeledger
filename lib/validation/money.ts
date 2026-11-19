import { z } from "zod";

// Money is validated as TEXT ("1250.50"), never parsed as a float first.
// Max 13 integer digits + 2 decimals: every such value converts to a JS number
// and back to Postgres numeric(18,2) exactly (doubles hold 15+ significant digits).
const MONEY_PATTERN = /^\d{1,13}(\.\d{1,2})?$/;

/** Accepts "1,250.50", "1250.5", "1250"; rejects negatives, letters, 3+ decimals. */
export const moneyString = z
  .string()
  .trim()
  .min(1, "Enter an amount")
  .transform((s) => s.replace(/,/g, ""))
  .pipe(z.string().regex(MONEY_PATTERN, "Enter an amount like 1000 or 1000.50"));

/** Converts a validated money string to a number for the database client. */
export const moneyToNumber = (s: string) => Number(s);
