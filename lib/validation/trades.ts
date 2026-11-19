import { z } from "zod";

import { ASSET_CLASSES, DIRECTIONS, MAX_TAGS } from "@/lib/trades/constants";

// Prices/quantities: up to 10 integer digits and 8 decimals (numeric(18,8)).
// Kept as STRINGS end-to-end and sent to Postgres as text, so even values with
// 18 significant digits (beyond a JS number's precision) are stored exactly.
const DECIMAL_18_8 = /^\d{1,10}(\.\d{1,8})?$/;
const MONEY_18_2 = /^\d{1,13}(\.\d{1,2})?$/;

const clean = (s: string) => s.trim().replace(/,/g, "");

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
    symbol: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, "Enter a symbol")
      .max(20, "Symbols are at most 20 characters")
      .regex(/^[A-Z0-9.:/_-]+$/, "Use letters, numbers and . : / _ - only"),
    assetClass: z.enum(ASSET_CLASSES, { message: "Choose an asset class" }),
    direction: z.enum(DIRECTIONS),
    entryTime: localDateTime,
    entryPrice: positiveDecimal("entry price"),
    quantity: positiveDecimal("quantity"),
    multiplier: positiveDecimal("multiplier"),
    exitTime: z
      .string()
      .optional()
      .transform((s) => s || "")
      .pipe(z.union([z.literal("").transform(() => null), localDateTime])),
    exitPrice: optionalPositiveDecimal("exit price"),
    fees: z
      .string()
      .optional()
      .transform((s) => (s ? clean(s) : "0"))
      .pipe(z.string().regex(MONEY_18_2, "Enter fees like 4.20 (0 or more)")),
    stopLoss: optionalPositiveDecimal("stop loss"),
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
    if (t.exitTime && !t.exitPrice) {
      ctx.addIssue({
        code: "custom",
        path: ["exitPrice"],
        message: "Add the exit price (or clear the exit time)",
      });
    }
    if (t.exitPrice && !t.exitTime) {
      ctx.addIssue({
        code: "custom",
        path: ["exitTime"],
        message: "Add the exit time (or clear the exit price)",
      });
    }
    if (t.exitTime && normaliseLocal(t.exitTime) < normaliseLocal(t.entryTime)) {
      ctx.addIssue({ code: "custom", path: ["exitTime"], message: "Exit can't be before entry" });
    }
  });

export type TradeInput = z.input<typeof tradeSchema>;
export type TradeOutput = z.output<typeof tradeSchema>;
export { normaliseLocal };
