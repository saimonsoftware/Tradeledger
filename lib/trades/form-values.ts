import { formatInTimeZone } from "date-fns-tz";

import type { TradeInput } from "@/lib/validation/trades";

type TradeLike = {
  account_id: string;
  symbol: string;
  direction: string;
  entry_time: string;
  entry_price: number;
  net_pnl: number | null;
  r_multiple: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  strategy: string | null;
  tags: string[];
  notes: string | null;
  rating: number | null;
};

const str = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
const local = (iso: string, tz: string) => formatInTimeZone(iso, tz, "yyyy-MM-dd'T'HH:mm");

export function emptyTradeValues(nowLocal: string, accountId = ""): TradeInput {
  return {
    accountId,
    symbol: "EURUSD",
    direction: "long",
    entryTime: nowLocal,
    entryPrice: "",
    pnlAmount: "",
    pnlSide: "profit",
    rr: "",
    stopLoss: "",
    takeProfit: "",
    strategy: "",
    tags: "",
    notes: "",
    rating: "",
  };
}

/** Existing trade → form values (times shown in the user's timezone). */
export function tradeToFormValues(t: TradeLike, tz: string): TradeInput {
  const pnl = t.net_pnl === null ? null : String(t.net_pnl);
  return {
    accountId: t.account_id,
    // Older trades may use a symbol that's no longer offered; the form asks to pick one.
    symbol: t.symbol as TradeInput["symbol"],
    direction: t.direction as TradeInput["direction"],
    entryTime: local(t.entry_time, tz),
    entryPrice: str(t.entry_price),
    pnlAmount: pnl === null ? "" : pnl.replace(/^-/, ""),
    pnlSide: pnl?.startsWith("-") ? "loss" : "profit",
    rr: t.r_multiple === null ? "" : String(Math.abs(Number(t.r_multiple))),
    stopLoss: str(t.stop_loss),
    takeProfit: str(t.take_profit),
    strategy: t.strategy ?? "",
    tags: t.tags.join(", "),
    notes: t.notes ?? "",
    rating: str(t.rating),
  };
}
