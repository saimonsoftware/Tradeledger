export const ACCOUNT_TYPES = ["live", "demo", "prop_challenge", "prop_funded"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  live: "Live",
  demo: "Demo",
  prop_challenge: "Prop challenge",
  prop_funded: "Prop funded",
};

export const CURRENCIES = [
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "CAD",
  "AUD",
  "NZD",
  "JPY",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "SGD",
  "HKD",
] as const;
export type Currency = (typeof CURRENCIES)[number];

export const TRANSACTION_TYPES = ["deposit", "withdrawal"] as const;
