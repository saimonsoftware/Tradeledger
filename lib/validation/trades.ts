import { z } from "zod";

import { checkLevel, suggestedRr } from "@/lib/calculations/rr";
import { DIRECTIONS, MAX_TAGS, PNL_SIDES, SYMBOLS } from "@/lib/trades/constants";

// Prices: up to 10 integer digits and 8 decimals (numeric(18,8)).
// Kept as STRINGS end-to-end and sent to Postgres as text, so even values with
// 18 significant digits (beyond a JS number's precision) are stored exactly.
const DECIMAL_18_8 = /^\d{1,10}(\.\d{1,8})?$/;
const MONEY_18_2 = /^\d{1,13}(\.\d{1,2})?$/;
// Trade RR (result in R): up to 3 integer digits and 2 decimals (numeric(8,2), < 1000).
const RR = /^\d{1,3}(\.\d{1,2})?$/;

const clean = (s: string) => s.trim().replace(/,/g, "");

/** "125.50" + "loss" → "-125.50". Zero is always "0" (breakeven), never "-0". */
export function signedMoney(amount: string, side: (typeof PNL_SIDES)[number]): string {
  if (Number(amount) === 0) return "0";
  return side === "loss" ? `-${amount}` : amount;
}

const positiveDecimal = (label: string) =>
  z
    .string()
    .transform(clean)
    .pipe(
      z
        .string()
        .min(1, `Enter the ${label}`)
        .regex(DECIMAL_18_8, `Enter a valid ${label}`)
        .refine(
          (s) => Number(s) > 0,
          `${label[0].toUpperCase()}${label.slice(1)} must be greater than 0`,
        ),
    );

const optionalPositiveDecimal = (label: string) =>
  z
    .string()
    .optional()
    .transform((s) => (s ? clean(s) : ""))
    .pipe(
      z.union([
        z.literal("").transform(() => null),
        z
          .string()
          .regex(DECIMAL_18_8, `Enter a valid ${label}`)
          .refine(
            (s) => Number(s) > 0,
            `${label[0].toUpperCase()}${label.slice(1)} must be greater than 0`,
          ),
      ]),
    );

// "2026-11-19T14:30" from <input type="datetime-local">: a wall-clock time in
// the user's profile timezone. The server converts it to UTC.
const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
const localDateTime = z.string().regex(LOCAL_DATETIME, "Enter a valid date and time");
const normaliseLocal = (s: string) => (s.length === 16 ? `${s}:00` : s);

export const tradeSchema = z
  .object({
    accountId: z.uuid("Choose an account"),
    symbol: z.enum(SYMBOLS, { message: "Choose a symbol" }),
    direction: z.enum(DIRECTIONS),
    entryTime: localDateTime,
    entryPrice: positiveDecimal("entry price"),
    // The P&L is typed as a positive amount plus a Profit/Loss choice (phone number
    // keypads often have no minus key). Empty = the trade is still open.
    pnlAmount: z
      .string()
      .optional()
      .transform((s) => (s ? clean(s) : ""))
      .pipe(
        z.union([
          z.literal("").transform(() => null),
          z.string().regex(MONEY_18_2, "Enter an amount like 125.50"),
        ]),
      ),
    pnlSide: z.enum(PNL_SIDES),
    // The trade's result in R, typed without a sign: it follows Profit/Loss.
    rr: z
      .string()
      .optional()
      .transform((s) => (s ? clean(s).replace(/r$/i, "").trim() : ""))
      .pipe(
        z.union([
          z.literal("").transform(() => null),
          z.string().regex(RR, "Enter the RR like 2 or 1.5"),
        ]),
      ),
    stopLoss: optionalPositiveDecimal("SL price"),
    takeProfit: optionalPositiveDecimal("TP price"),
    strategy: z
      .string()
      .trim()
      .max(100, "Keep the strategy under 100 characters")
      .optional()
      .transform((s) => s || null),
    tags: z
      .string()
      .max(1000)
      .optional()
      .transform((s) =>
        Array.from(
          new Set(
            (s ?? "")
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
          ),
        ),
      )
      .pipe(
        z
          .array(z.string().max(30, "Each tag must be 30 characters or fewer"))
          .max(MAX_TAGS, `Use at most ${MAX_TAGS} tags`),
      ),
    notes: z
      .string()
      .max(5000, "Notes are limited to 5,000 characters")
      .optional()
      .transform((s) => (s?.trim() ? s : null)),
    rating: z
      .string()
      .optional()
      .transform((s) => (s ? Number(s) : null))
      .pipe(z.union([z.null(), z.number().int().min(1).max(5)])),
  })
  .superRefine((t, ctx) => {
    // The stop must be on the losing side of the entry, the target on the winning side.
    const levels = [
      ["sl", "stopLoss", t.stopLoss],
      ["tp", "takeProfit", t.takeProfit],
    ] as const;
    for (const [kind, path, price] of levels) {
      const check = checkLevel(kind, t.direction, t.entryPrice, price);
      const name = kind === "sl" ? "SL" : "TP";
      const side = (kind === "tp") === (t.direction === "long") ? "above" : "below";
      if (check === "at-entry") {
        ctx.addIssue({
          code: "custom",
          path: [path],
          message: `${name} can't equal the entry price`,
        });
      } else if (check === "wrong-side") {
        ctx.addIssue({
          code: "custom",
          path: [path],
          message: `For a ${t.direction}, the ${name} must be ${side} the entry price`,
        });
      }
    }

    if (t.rr === null) return;
    if (t.pnlAmount === null) {
      ctx.addIssue({ code: "custom", path: ["rr"], message: "Add the profit or loss first" });
    } else if (Number(t.pnlAmount) === 0 && Number(t.rr) !== 0) {
      ctx.addIssue({ code: "custom", path: ["rr"], message: "A breakeven trade is 0R" });
    } else if (Number(t.pnlAmount) !== 0 && Number(t.rr) === 0) {
      ctx.addIssue({ code: "custom", path: ["rr"], message: "Only a breakeven trade is 0R" });
    }
  })
  .transform(({ pnlAmount, pnlSide, rr, ...rest }) => {
    // The RR the trader typed (or that the form filled in); if empty, the server
    // works it out the same way: TP hit on a win, SL hit (−1R) on a loss.
    const rrValue =
      rr ??
      suggestedRr({
        direction: rest.direction,
        entryPrice: rest.entryPrice,
        stopLoss: rest.stopLoss,
        takeProfit: rest.takeProfit,
        pnlSide,
        pnlAmount,
      });
    return {
      ...rest,
      /** Signed P&L as an exact decimal string ("-125.50"), or null while open. */
      netPnl: pnlAmount === null ? null : signedMoney(pnlAmount, pnlSide),
      /** Signed result in R, same sign as the P&L. Null if unknown or the trade is open. */
      rMultiple: pnlAmount === null || rrValue === null ? null : signedMoney(rrValue, pnlSide),
    };
  });

export type TradeInput = z.input<typeof tradeSchema>;
export type TradeOutput = z.output<typeof tradeSchema>;
export { normaliseLocal };
