-- =============================================================================
-- Explicit table privileges for `profiles`.
--
-- This project's default privileges do NOT give the `authenticated` role
-- SELECT/INSERT/UPDATE on new tables (only DELETE/TRUNCATE/REFERENCES/TRIGGER).
-- RLS decides WHICH rows a user can touch; these GRANTs decide WHAT a user can
-- do to the table at all. Both are needed.
--
-- TRUNCATE is removed because it bypasses Row Level Security entirely.
-- =============================================================================

revoke all on public.profiles from authenticated;
grant select, insert, update on public.profiles to authenticated;
-- No DELETE: profiles are removed only via ON DELETE CASCADE from auth.users.
