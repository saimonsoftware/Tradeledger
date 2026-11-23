-- =============================================================================
-- Trade bias: was the trade WITH the trader's higher-timeframe bias ("pro") or
-- AGAINST it ("counter")? Optional (older trades have none).
-- The table's existing RLS policies, 2FA policy and grants cover the new column.
-- =============================================================================
alter table public.trades
  add column bias text,
  add constraint trades_bias_allowed check (bias is null or bias in ('pro', 'counter'));

comment on column public.trades.bias is
  'pro = with the trader''s bias, counter = against it; null if not recorded.';
