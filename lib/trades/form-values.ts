import { formatInTimeZone } from "date-fns-tz";

import type { TradeInput } from "@/lib/validation/trades";

type TradeLike = {
  account_id: string;
  symbol: string;
  asset_class: string;
  direction: string;
  entry_time: string;
  entry_price: number;
  quantity: number;
  multiplier: number;
  exit_time: string | null;
  exit_price: number | null;
  fees: number;
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
    symbol: "",
    assetClass: "stock",
    direction: "long",
    entryTime: nowLocal,
    entryPrice: "",
    quantity: "",
    multiplier: "1",
    exitTime: "",
    exitPrice: "",
    fees: "",
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
  return {
    accountId: t.account_id,
    symbol: t.symbol,
    assetClass: t.asset_class as TradeInput["assetClass"],
    direction: t.direction as TradeInput["direction"],
    entryTime: local(t.entry_time, tz),
    entryPrice: str(t.entry_price),
    quantity: str(t.quantity),
    multiplier: str(t.multiplier),
    exitTime: t.exit_time ? local(t.exit_time, tz) : "",
    exitPrice: str(t.exit_price),
    fees: str(t.fees),
    stopLoss: str(t.stop_loss),
    takeProfit: str(t.take_profit),
    strategy: t.strategy ?? "",
    tags: t.tags.join(", "),
    notes: t.notes ?? "",
    rating: str(t.rating),
  };
}
