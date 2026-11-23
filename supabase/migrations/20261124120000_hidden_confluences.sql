-- =============================================================================
-- Confluences the trader removed from their trade-form dropdown (starter ones or
-- their own). Trades that already use them keep them; they're just not offered.
-- Lives on the trader's own profile row: the existing owner-only RLS policies,
-- 2FA policy and grants (select/insert/update) cover the new column.
-- =============================================================================
alter table public.profiles
  add column hidden_confluences text[] not null default '{}',
  add constraint profiles_hidden_confluences_size check (cardinality(hidden_confluences) <= 200);

comment on column public.profiles.hidden_confluences is
  'Confluences hidden from the trade form dropdown (trades keep the ones they use).';
