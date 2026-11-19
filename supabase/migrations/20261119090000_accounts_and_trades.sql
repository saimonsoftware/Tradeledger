-- =============================================================================
-- Trading accounts, deposits/withdrawals, trades, and the balance view.
--
-- Security model (applies to every table below):
--   * Every row has user_id, defaulting to the logged-in user (auth.uid()).
--   * Row Level Security (RLS) is ON: users can only SELECT/INSERT/UPDATE/DELETE
--     rows where user_id = their own id. The database enforces this, so even a
--     bug in the app can't expose another user's data.
--   * Logged-out visitors (anon role) get no access at all.
--   * Child rows (transactions, trades) reference their account through a
--     composite foreign key (account_id, user_id), so a row can only ever point
--     at an account owned by the SAME user, enforced by the table structure itself.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- trading_accounts
-- -----------------------------------------------------------------------------
create table public.trading_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  broker text check (broker is null or char_length(broker) <= 100),
  account_type text not null check (account_type in ('live', 'demo', 'prop_challenge', 'prop_funded')),
  currency char(3) not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  starting_balance numeric(18, 2) not null check (starting_balance >= 0),
  start_date date not null,
  is_archived boolean not null default false,
  -- Reserved for future broker sync (Release 2+).
  external_provider text,
  external_account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Target for the composite foreign keys below.
  unique (id, user_id)
);

comment on table public.trading_accounts is 'A user''s broker / prop firm accounts. RLS: owner only.';

create index trading_accounts_user_id_idx on public.trading_accounts (user_id);

create trigger trading_accounts_set_updated_at
  before update on public.trading_accounts
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- account_transactions (deposits & withdrawals)
-- -----------------------------------------------------------------------------
create table public.account_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null,
  type text not null check (type in ('deposit', 'withdrawal')),
  amount numeric(18, 2) not null check (amount > 0),
  occurred_at timestamptz not null default now(),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The account must belong to the same user as this row.
  foreign key (account_id, user_id)
    references public.trading_accounts (id, user_id) on delete cascade
);

comment on table public.account_transactions is 'Deposits and withdrawals per account. RLS: owner only.';

create index account_transactions_account_id_idx on public.account_transactions (account_id);
create index account_transactions_user_id_idx on public.account_transactions (user_id);

create trigger account_transactions_set_updated_at
  before update on public.account_transactions
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- trades
-- -----------------------------------------------------------------------------
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null,

  symbol text not null check (symbol ~ '^[A-Z0-9.:/_-]{1,20}$'),
  asset_class text not null check (asset_class in ('stock', 'option', 'future', 'forex', 'crypto', 'cfd', 'other')),
  direction text not null check (direction in ('long', 'short')),

  entry_time timestamptz not null,
  entry_price numeric(18, 8) not null check (entry_price > 0),
  quantity numeric(18, 8) not null check (quantity > 0),
  multiplier numeric(18, 8) not null default 1 check (multiplier > 0),

  exit_time timestamptz,
  exit_price numeric(18, 8) check (exit_price is null or exit_price > 0),
  fees numeric(18, 2) not null default 0 check (fees >= 0),

  stop_loss numeric(18, 8) check (stop_loss is null or stop_loss > 0),
  take_profit numeric(18, 8) check (take_profit is null or take_profit > 0),

  strategy text check (strategy is null or char_length(strategy) <= 100),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  notes text check (notes is null or char_length(notes) <= 5000),
  rating smallint check (rating between 1 and 5),

  -- ---- Computed by the database (always consistent, never sent by the client) ----
  -- Gross P&L: (exit - entry) * qty * multiplier for longs; reversed for shorts.
  gross_pnl numeric(18, 2) generated always as (
    case
      when exit_price is null then null
      when direction = 'long' then (exit_price - entry_price) * quantity * multiplier
      else (entry_price - exit_price) * quantity * multiplier
    end
  ) stored,
  -- Net P&L: gross minus fees. (A generated column can't reference another one,
  -- so the gross formula is repeated.)
  net_pnl numeric(18, 2) generated always as (
    case
      when exit_price is null then null
      when direction = 'long' then (exit_price - entry_price) * quantity * multiplier - fees
      else (entry_price - exit_price) * quantity * multiplier - fees
    end
  ) stored,
  -- R-multiple: net P&L divided by the amount risked (distance to stop).
  r_multiple numeric(12, 2) generated always as (
    case
      when exit_price is null or stop_loss is null or stop_loss = entry_price then null
      when direction = 'long' then
        ((exit_price - entry_price) * quantity * multiplier - fees)
          / (abs(entry_price - stop_loss) * quantity * multiplier)
      else
        ((entry_price - exit_price) * quantity * multiplier - fees)
          / (abs(entry_price - stop_loss) * quantity * multiplier)
    end
  ) stored,
  status text generated always as (case when exit_time is null then 'open' else 'closed' end) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Exit time and exit price go together: both set (closed) or both empty (open).
  constraint trades_exit_complete check ((exit_time is null) = (exit_price is null)),
  constraint trades_exit_after_entry check (exit_time is null or exit_time >= entry_time),
  -- The account must belong to the same user as this trade.
  foreign key (account_id, user_id)
    references public.trading_accounts (id, user_id) on delete cascade
);

comment on table public.trades is 'Individual trades. P&L columns are computed by the database. RLS: owner only.';

create index trades_user_exit_time_idx on public.trades (user_id, exit_time);
create index trades_user_account_idx on public.trades (user_id, account_id);
create index trades_account_id_idx on public.trades (account_id);

create trigger trades_set_updated_at
  before update on public.trades
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- Row Level Security: owner-only access on every table
-- -----------------------------------------------------------------------------
alter table public.trading_accounts enable row level security;
alter table public.account_transactions enable row level security;
alter table public.trades enable row level security;

-- trading_accounts
create policy "Owner can view accounts" on public.trading_accounts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can create accounts" on public.trading_accounts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can update accounts" on public.trading_accounts
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete accounts" on public.trading_accounts
  for delete to authenticated using ((select auth.uid()) = user_id);

-- account_transactions
create policy "Owner can view transactions" on public.account_transactions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can create transactions" on public.account_transactions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can update transactions" on public.account_transactions
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete transactions" on public.account_transactions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- trades
create policy "Owner can view trades" on public.trades
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can create trades" on public.trades
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can update trades" on public.trades
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete trades" on public.trades
  for delete to authenticated using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- Table privileges
-- RLS decides WHICH rows a user can touch; GRANTs decide WHAT they can do to the
-- table at all. This project's defaults don't grant SELECT/INSERT/UPDATE, and do
-- grant TRUNCATE (which bypasses RLS), so privileges are set explicitly here.
-- -----------------------------------------------------------------------------
-- Logged-out visitors get nothing.
revoke all on public.trading_accounts, public.account_transactions, public.trades from anon;
-- Logged-in users get exactly the four row operations (filtered by RLS), nothing else.
revoke all on public.trading_accounts, public.account_transactions, public.trades from authenticated;
grant select, insert, update, delete
  on public.trading_accounts, public.account_transactions, public.trades
  to authenticated;


-- -----------------------------------------------------------------------------
-- account_balances: the ONE place balance logic lives
--   current_balance = starting_balance + deposits - withdrawals + closed trades' net P&L
-- security_invoker = true: the view runs with the CALLER's permissions, so RLS on
-- the underlying tables still applies (each user only sees their own balances).
-- -----------------------------------------------------------------------------
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
