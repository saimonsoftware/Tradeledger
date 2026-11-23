/** The only symbols that can be logged. The database enforces the same list. */
export const SYMBOLS = ["EURUSD", "NQ"] as const;
export type TradeSymbol = (typeof SYMBOLS)[number];

/** Used by the AI Coach's asset-class breakdown. Older trades may have other symbols. */
export const SYMBOL_ASSET_CLASS: Record<string, string> = { EURUSD: "forex", NQ: "future" };

/** Setups the trader can pick in the trade form (optional). */
export const STRATEGIES = ["FBOs", "Mitigation"] as const;
export type Strategy = (typeof STRATEGIES)[number];

export const DIRECTIONS = ["long", "short"] as const;
/** Trade with ("pro") or against ("counter") the trader's bias. Optional; the DB checks the same list. */
export const BIASES = ["pro", "counter"] as const;
export type Bias = (typeof BIASES)[number];
export const BIAS_LABELS: Record<string, string> = { pro: "Pro bias", counter: "Counter bias" };
export const RESULTS = ["win", "loss", "breakeven"] as const;
export const STATUSES = ["open", "closed"] as const;
/** Whether the P&L amount the trader typed is a profit or a loss. */
export const PNL_SIDES = ["profit", "loss"] as const;

export const TRADES_PAGE_SIZE = 25;
/** Confluences per trade (stored in `trades.tags`). */
export const MAX_TAGS = 20;
export const MAX_CONFLUENCE_CHARS = 30;

/**
 * Starter confluences offered in the trade form. Traders add their own too: any
 * confluence used on a trade is offered again next time (no separate list to manage).
 */
export const DEFAULT_CONFLUENCES = [
  "Liquidity sweep",
  "Fair value gap",
  "Order block",
  "Break of structure",
  "Change of character",
  "HTF bias",
  "Premium / discount",
  "Session open",
  "SMT divergence",
  "Killzone",
] as const;

/** Screenshots per trade (the Storage policy enforces the same number). */
export const MAX_SCREENSHOTS = 6;
