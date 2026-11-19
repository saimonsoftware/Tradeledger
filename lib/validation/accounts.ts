import { z } from "zod";

import { ACCOUNT_TYPES, CURRENCIES, TRANSACTION_TYPES } from "@/lib/accounts/constants";

import { moneyString } from "./money";

const isoDate = z.iso.date("Enter a valid date");

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .optional()
    .transform((s) => (s ? s : null));

export const accountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the account a name")
    .max(100, "Keep the name under 100 characters"),
  broker: optionalText(100, "Broker"),
  accountType: z.enum(ACCOUNT_TYPES, { message: "Choose an account type" }),
  currency: z.enum(CURRENCIES, { message: "Choose a currency" }),
  startingBalance: moneyString,
  startDate: isoDate.refine((d) => d >= "1990-01-01", "Enter a date after 1990"),
});

export const transactionSchema = z.object({
  accountId: z.uuid(),
  type: z.enum(TRANSACTION_TYPES),
  amount: moneyString.refine((s) => Number(s) > 0, "Amount must be greater than zero"),
  date: isoDate,
  note: optionalText(500, "Note"),
});

export const idSchema = z.uuid();

export type AccountInput = z.input<typeof accountSchema>;
export type TransactionInput = z.input<typeof transactionSchema>;
export type AccountOutput = z.output<typeof accountSchema>;
export type TransactionOutput = z.output<typeof transactionSchema>;
