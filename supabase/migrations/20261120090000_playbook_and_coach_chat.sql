-- =============================================================================
-- Playbook (the user's trading rules) and Coach chat (saved conversations).
-- Same security model as every user-data table: owner-only RLS, the restrictive
-- 2FA policy, and explicit grants (nothing is granted by default here).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- trading_rules: the Playbook
-- -----------------------------------------------------------------------------
create table public.trading_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  category text not null default 'other'
    check (category in ('entry', 'exit', 'risk', 'discipline', 'schedule', 'other')),
  -- 'ai' = proposed by the coach and approved by the user; 'manual' = written by the user.
  source text not null default 'manual' check (source in ('manual', 'ai')),
  position integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trading_rules_user_idx on public.trading_rules (user_id, is_archived, position);

create trigger trading_rules_set_updated_at
  before update on public.trading_rules
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- coach_conversations + coach_messages
-- Messages are APPEND-ONLY and store the exact content blocks the API returned
-- (including thinking and tool calls), so each conversation is replayed to the
-- model unchanged. Editing earlier turns would invalidate the model's thinking.
-- -----------------------------------------------------------------------------
create table public.coach_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index coach_conversations_user_idx on public.coach_conversations (user_id, updated_at desc);

create trigger coach_conversations_set_updated_at
  before update on public.coach_conversations
  for each row execute function public.set_updated_at();

create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  conversation_id uuid not null,
  -- API role. Tool results are sent back as role 'user' with no display_text.
  role text not null check (role in ('user', 'assistant')),
  -- Exact Messages API content (string or array of content blocks).
  content jsonb not null,
  -- What the UI shows (null for internal tool-result turns).
  display_text text check (display_text is null or char_length(display_text) <= 40000),
  -- Rule proposals made in this turn (shown as cards; saved only if approved).
  proposals jsonb not null default '[]'::jsonb,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),
  foreign key (conversation_id, user_id)
    references public.coach_conversations (id, user_id) on delete cascade
);

create index coach_messages_conversation_idx on public.coach_messages (conversation_id, created_at);
create index coach_messages_user_idx on public.coach_messages (user_id);


-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.trading_rules enable row level security;
alter table public.coach_conversations enable row level security;
alter table public.coach_messages enable row level security;

create policy "Owner can view rules" on public.trading_rules
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can create rules" on public.trading_rules
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can update rules" on public.trading_rules
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete rules" on public.trading_rules
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Owner can view conversations" on public.coach_conversations
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can create conversations" on public.coach_conversations
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can update conversations" on public.coach_conversations
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete conversations" on public.coach_conversations
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Messages: read and append only (no update/delete; they go with their conversation).
create policy "Owner can view coach messages" on public.coach_messages
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add coach messages" on public.coach_messages
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Require 2FA when enabled" on public.trading_rules
  as restrictive for all to authenticated
  using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()));
create policy "Require 2FA when enabled" on public.coach_conversations
  as restrictive for all to authenticated
  using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()));
create policy "Require 2FA when enabled" on public.coach_messages
  as restrictive for all to authenticated
  using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()));


-- -----------------------------------------------------------------------------
-- Table privileges
-- -----------------------------------------------------------------------------
revoke all on public.trading_rules, public.coach_conversations, public.coach_messages from anon, authenticated;
grant select, insert, update, delete on public.trading_rules, public.coach_conversations to authenticated;
grant select, insert on public.coach_messages to authenticated;


-- -----------------------------------------------------------------------------
-- Usage limit for the new chat: its own 30 messages per rolling 24 hours.
-- -----------------------------------------------------------------------------
alter table public.ai_usage drop constraint ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check check (kind in ('report', 'chat', 'assistant'));

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

  max_uses := case p_kind when 'report' then 5 when 'chat' then 30 when 'assistant' then 30 end;
  if max_uses is null then
    raise exception 'Unknown usage kind' using errcode = '22023';
  end if;

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
  'Records one AI use for the caller if under the rolling 24h limit (report: 5, chat: 30, assistant: 30).';
