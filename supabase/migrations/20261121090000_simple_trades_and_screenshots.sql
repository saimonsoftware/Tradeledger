-- =============================================================================
-- Simpler trades + trade screenshots.
--
-- 1. Trades: the trader now types the profit/loss amount themselves.
--    * Removed: asset_class, quantity, multiplier, fees, gross_pnl, r_multiple.
--    * net_pnl becomes a normal column (existing values are kept as they were).
--    * A trade is CLOSED once net_pnl is filled in. It then counts on its entry
--      date: exit_time is now computed by the database as "entry_time when closed",
--      so the dashboard, weekly P&L and AI Coach keep working unchanged.
--    * New symbols are limited to EURUSD and NQ (older rows are left as they are).
-- 2. Screenshots: a PRIVATE Storage bucket. Files live at
--    <user_id>/<trade_id>/<file>, and Storage RLS only lets a user touch files
--    inside their own folder, for trades they own (plus the 2FA rule).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Trades
-- -----------------------------------------------------------------------------

-- The balance view reads status/net_pnl, so it is rebuilt around the change.
drop view public.account_balances;

alter table public.trades
  drop constraint trades_exit_complete,
  drop constraint trades_exit_after_entry;

-- Keep each existing trade's P&L, but stop calculating it: it is entered now.
alter table public.trades alter column net_pnl drop expression;
-- (This must happen before the columns its old formula used are dropped.)

alter table public.trades
  drop column gross_pnl,
  drop column r_multiple,
  drop column status,
  drop column asset_class,
  drop column quantity,
  drop column multiplier,
  drop column fees;

alter table public.trades
  add constraint trades_net_pnl_range check (net_pnl is null or abs(net_pnl) < 1e13);

-- exit_time / status are derived from net_pnl, so they can never disagree with it
-- and the client can't set them.
alter table public.trades drop column exit_time; -- also drops its index
alter table public.trades
  add column exit_time timestamptz
    generated always as (case when net_pnl is null then null else entry_time end) stored,
  add column status text
    generated always as (case when net_pnl is null then 'open' else 'closed' end) stored;

comment on column public.trades.exit_time is
  'When the trade counts as closed: its entry_time once a P&L is entered (null while open). Computed.';
comment on column public.trades.net_pnl is 'Profit (+) or loss (-) entered by the trader. Null = open.';

create index trades_user_exit_time_idx on public.trades (user_id, exit_time);

-- Only these symbols for new or edited trades (NOT VALID: older rows are not re-checked).
alter table public.trades
  add constraint trades_symbol_allowed check (symbol in ('EURUSD', 'NQ')) not valid;

comment on table public.trades is 'Individual trades. P&L is entered by the trader. RLS: owner only.';

-- Same view as before (one place for balance logic), recreated.
create view public.account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.currency,
  a.starting_balance,
  coalesce(tx.deposits, 0)::numeric(18, 2) as total_deposits,
  coalesce(tx.withdrawals, 0)::numeric(18, 2) as total_withdrawals,
  coalesce(t.realized_pnl, 0)::numeric(18, 2) as realized_pnl,
  (a.starting_balance
    + coalesce(tx.deposits, 0)
    - coalesce(tx.withdrawals, 0)
    + coalesce(t.realized_pnl, 0))::numeric(18, 2) as current_balance
from public.trading_accounts a
left join lateral (
  select
    sum(amount) filter (where type = 'deposit') as deposits,
    sum(amount) filter (where type = 'withdrawal') as withdrawals
  from public.account_transactions
  where account_id = a.id
) tx on true
left join lateral (
  select sum(net_pnl) as realized_pnl
  from public.trades
  where account_id = a.id and status = 'closed'
) t on true;

comment on view public.account_balances is 'Current balance per account. security_invoker: respects RLS.';

revoke all on public.account_balances from anon, authenticated;
grant select on public.account_balances to authenticated;


-- -----------------------------------------------------------------------------
-- 2. Screenshots bucket (private: files are only reachable through short-lived
--    signed links created for the owner).
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trade-screenshots',
  'trade-screenshots',
  false,
  5242880, -- 5 MB
  array['image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Path rule: <auth.uid()>/<trade id>/<file name>
create policy "Owner can view trade screenshots" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'trade-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Upload: own folder and a trade the user owns. (The 6-per-trade limit is added in
-- 20261121100000_screenshot_upload_check.sql.)
create policy "Owner can add trade screenshots" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'trade-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 2
    and exists (
      select 1 from public.trades t
      where t.id::text = (storage.foldername(name))[2]
        and t.user_id = (select auth.uid())
    )
  );

-- Delete: own folder only (no UPDATE policy: screenshots are never overwritten).
create policy "Owner can delete trade screenshots" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'trade-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Same 2FA rule as every user-data table (only affects this bucket).
create policy "Require 2FA for trade screenshots" on storage.objects
  as restrictive for all to authenticated
  using (bucket_id <> 'trade-screenshots' or (select public.mfa_satisfied()))
  with check (bucket_id <> 'trade-screenshots' or (select public.mfa_satisfied()));
