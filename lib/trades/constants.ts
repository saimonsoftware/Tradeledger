/** The only symbols that can be logged. The database enforces the same list. */
export const SYMBOLS = ["EURUSD", "NQ"] as const;
export type TradeSymbol = (typeof SYMBOLS)[number];

/** Used by the AI Coach's asset-class breakdown. Older trades may have other symbols. */
export const SYMBOL_ASSET_CLASS: Record<string, string> = { EURUSD: "forex", NQ: "future" };

export const DIRECTIONS = ["long", "short"] as const;
export const RESULTS = ["win", "loss", "breakeven"] as const;
export const STATUSES = ["open", "closed"] as const;
/** Whether the P&L amount the trader typed is a profit or a loss. */
export const PNL_SIDES = ["profit", "loss"] as const;

export const TRADES_PAGE_SIZE = 25;
export const MAX_TAGS = 20;

/** Screenshots per trade (the Storage policy enforces the same number). */
export const MAX_SCREENSHOTS = 6;
