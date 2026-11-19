-- =============================================================================
-- AI Coach: saved reports, follow-up chat, usage limits, and AI opt-in.
-- Same security model as every other user-data table: owner-only RLS, the
-- restrictive 2FA policy, and explicit grants (this project grants nothing by default).
-- =============================================================================

-- Opt-in: AI analysis sends trade data to Anthropic, so each user consents first.
alter table public.profiles add column ai_consent_at timestamptz;


-- -----------------------------------------------------------------------------
-- ai_reports: one saved analysis
-- -----------------------------------------------------------------------------
create table public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Optional filter: one account, or all accounts when null.
  account_id uuid,
  period_from date,
  period_to date,
  trade_count integer not null check (trade_count >= 0),
  -- Snapshot of the exact numbers the AI was given (computed by our code).
  stats jsonb not null,
  -- The AI's structured report.
  report jsonb not null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  -- If an account filter is used, it must be the same user's account.
  foreign key (account_id, user_id)
    references public.trading_accounts (id, user_id) on delete cascade
);

create index ai_reports_user_created_idx on public.ai_reports (user_id, created_at desc);

create trigger ai_reports_set_updated_at
  before update on public.ai_reports
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- ai_messages: follow-up chat about one report
-- -----------------------------------------------------------------------------
create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  report_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 20000),
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The report must belong to the same user.
  foreign key (report_id, user_id)
    references public.ai_reports (id, user_id) on delete cascade
);

create index ai_messages_report_idx on public.ai_messages (report_id, created_at);
create index ai_messages_user_idx on public.ai_messages (user_id);

create trigger ai_messages_set_updated_at
  before update on public.ai_messages
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- ai_usage: append-only log of AI calls, used for daily limits.
-- Users can READ their own rows, but cannot insert, edit or delete them:
-- rows are written only through ai_try_consume() below, so deleting reports
-- or chats never resets the limit.
-- -----------------------------------------------------------------------------
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('report', 'chat')),
  created_at timestamptz not null default now()
);

create index ai_usage_user_kind_created_idx on public.ai_usage (user_id, kind, created_at desc);


-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.ai_reports enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_usage enable row level security;

create policy "Owner can view reports" on public.ai_reports
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can create reports" on public.ai_reports
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can update reports" on public.ai_reports
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete reports" on public.ai_reports
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Owner can view messages" on public.ai_messages
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can create messages" on public.ai_messages
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can update messages" on public.ai_messages
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete messages" on public.ai_messages
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Usage: read-only for the owner (writes happen only inside ai_try_consume()).
create policy "Owner can view usage" on public.ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);

-- 2FA enforcement, as on every other user-data table.
create policy "Require 2FA when enabled" on public.ai_reports
  as restrictive for all to authenticated
  using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()));
create policy "Require 2FA when enabled" on public.ai_messages
  as restrictive for all to authenticated
  using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()));
create policy "Require 2FA when enabled" on public.ai_usage
  as restrictive for all to authenticated
  using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()));


-- -----------------------------------------------------------------------------
-- Table privileges (nothing is granted by default in this project)
-- -----------------------------------------------------------------------------
revoke all on public.ai_reports, public.ai_messages, public.ai_usage from anon, authenticated;
grant select, insert, update, delete on public.ai_reports, public.ai_messages to authenticated;
grant select on public.ai_usage to authenticated;


-- -----------------------------------------------------------------------------
-- ai_try_consume(kind): atomically check the rolling 24-hour limit and record one use.
-- Returns true if allowed (and recorded), false if the limit is reached.
--   * Limits are fixed HERE (5 reports, 30 chat messages per 24h) so a caller
--     can't pass a bigger number.
--   * A per-user transaction lock stops two simultaneous requests both
--     slipping under the limit.
--   * Only ever acts on the caller (auth.uid()), and respects 2FA.
-- -----------------------------------------------------------------------------
create or replace function public.ai_try_consume(p_kind text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  max_uses integer;
  used integer;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not public.mfa_satisfied() then
    raise exception 'Two-factor verification required' using errcode = '42501';
  end if;

  max_uses := case p_kind when 'report' then 5 when 'chat' then 30 end;
  if max_uses is null then
    raise exception 'Unknown usage kind' using errcode = '22023';
  end if;

  -- Serialise concurrent calls for this user (released at transaction end).
  perform pg_advisory_xact_lock(hashtextextended(uid::text || ':ai', 0));

  select count(*) into used
  from public.ai_usage u
  where u.user_id = uid and u.kind = p_kind and u.created_at > now() - interval '24 hours';

  if used >= max_uses then
    return false;
  end if;

  insert into public.ai_usage (user_id, kind) values (uid, p_kind);
  return true;
end;
$$;

comment on function public.ai_try_consume(text) is
  'Records one AI use for the caller if under the rolling 24h limit (report: 5, chat: 30).';

revoke execute on function public.ai_try_consume(text) from public, anon;
grant execute on function public.ai_try_consume(text) to authenticated;
