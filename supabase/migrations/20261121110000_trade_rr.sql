-- =============================================================================
-- Trade RR: the result of a trade in R (multiples of the amount risked),
-- typed by the trader, e.g. +2.5 for a win of 2.5x the risk, -1 for a full loss.
-- Only for closed trades, and its sign must match the P&L.
-- =============================================================================
alter table public.trades
  add column r_multiple numeric(8, 2),
  add constraint trades_r_multiple_range
    check (r_multiple is null or abs(r_multiple) < 1000),
  add constraint trades_r_multiple_closed_only
    check (r_multiple is null or net_pnl is not null),
  add constraint trades_r_multiple_sign
    check (r_multiple is null or sign(r_multiple) = sign(net_pnl));

comment on column public.trades.r_multiple is
  'Result in R entered by the trader (+ win, - loss). Null if not recorded or the trade is open.';
