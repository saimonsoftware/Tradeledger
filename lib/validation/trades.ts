import { z } from "zod";

import { stopLossPrice, tradeRr } from "@/lib/calculations/rr";
import { DIRECTIONS, MAX_TAGS, PNL_SIDES, SYMBOLS, type TradeSymbol } from "@/lib/trades/constants";

// Prices: up to 10 integer digits and 8 decimals (numeric(18,8)).
// Kept as STRINGS end-to-end and sent to Postgres as text, so even values with
// 18 significant digits (beyond a JS number's precision) are stored exactly.
const DECIMAL_18_8 = /^\d{1,10}(\.\d{1,8})?$/;
const MONEY_18_2 = /^\d{1,13}(\.\d{1,2})?$/;
// SL size in pips/points: up to 5 integer digits and 2 decimals.
const SL_SIZE = /^\d{1,5}(\.\d{1,2})?$/;
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
    exitPrice: optionalPositiveDecimal("exit price"),
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
    // Stop-loss size: pips for EURUSD, points for NQ. The stop PRICE is derived from it.
    slSize: z
      .string()
      .optional()
      .transform((s) => (s ? clean(s) : ""))
      .pipe(
        z.union([
          z.literal("").transform(() => null),
          z
            .string()
            .regex(SL_SIZE, "Enter the SL size like 10 or 12.5")
            .refine((s) => Number(s) > 0, "SL size must be greater than 0"),
        ]),
      ),
    takeProfit: optionalPositiveDecimal("take profit"),
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
    const d = derive(t);
    if (t.slSize !== null && d.stopLoss === null) {
      ctx.addIssue({
        code: "custom",
        path: ["slSize"],
        message: "That SL size puts the stop below zero. Check the size.",
      });
    }
    if (d.autoRr !== null) {
      // Calculated RR: it must agree with the Profit/Loss choice.
      const pnl = t.pnlAmount === null ? null : Number(t.pnlAmount);
      const rr = Number(d.autoRr);
      const chosenSign = t.pnlSide === "loss" ? -1 : 1;
      if (pnl !== null && pnl !== 0 && rr !== 0 && Math.sign(rr) !== chosenSign) {
        ctx.addIssue({
          code: "custom",
          path: ["pnlSide"],
          message: `Your prices show a ${rr > 0 ? "win" : "loss"} (${rr > 0 ? "+" : ""}${d.autoRr}R) but you chose ${t.pnlSide === "loss" ? "Loss" : "Profit"}.`,
        });
      }
      return;
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
  .transform(({ pnlAmount, pnlSide, rr, slSize, ...rest }) => {
    const d = derive({ ...rest, slSize });
    const netPnl = pnlAmount === null ? null : signedMoney(pnlAmount, pnlSide);
    return {
      ...rest,
      /** Signed P&L as an exact decimal string ("-125.50"), or null while open. */
      netPnl,
      /** Stop price derived from the SL size (null when no SL size). */
      stopLoss: d.stopLoss,
      /**
       * Signed result in R. Calculated from entry/exit/SL size when all are given
       * (null for an open or breakeven trade), otherwise the RR the trader typed.
       */
      rMultiple:
        d.autoRr !== null
          ? netPnl === null || Number(netPnl) === 0
            ? null
            : d.autoRr
          : rr === null
            ? null
            : signedMoney(rr, pnlSide),
    };
  });

/** Stop price and calculated RR from the (already validated) fields. */
function derive(t: {
  symbol: TradeSymbol;
  direction: "long" | "short";
  entryPrice: string;
  exitPrice: string | null;
  slSize: string | null;
}) {
  if (t.slSize === null) return { stopLoss: null, autoRr: null };
  return {
    stopLoss: stopLossPrice(t.symbol, t.direction, t.entryPrice, t.slSize),
    autoRr: t.exitPrice
      ? tradeRr(t.symbol, t.direction, t.entryPrice, t.exitPrice, t.slSize)
      : null,
  };
}

export type TradeInput = z.input<typeof tradeSchema>;
export type TradeOutput = z.output<typeof tradeSchema>;
export { normaliseLocal };
