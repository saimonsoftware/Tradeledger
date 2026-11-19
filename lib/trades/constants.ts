export const ASSET_CLASSES = [
  "stock",
  "option",
  "future",
  "forex",
  "crypto",
  "cfd",
  "other",
] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  stock: "Stock",
  option: "Option",
  future: "Future",
  forex: "Forex",
  crypto: "Crypto",
  cfd: "CFD",
  other: "Other",
};

export const DIRECTIONS = ["long", "short"] as const;
export const RESULTS = ["win", "loss", "breakeven"] as const;
export const STATUSES = ["open", "closed"] as const;

export const TRADES_PAGE_SIZE = 25;
export const MAX_TAGS = 20;
