-- =============================================================================
-- session_is_active(): is the caller's session still valid server-side?
--
-- Supabase access tokens (JWTs) stay cryptographically valid until they expire
-- (up to 1 hour), even after "sign out everywhere" or a password change revokes
-- the session. This function lets the app reject revoked sessions IMMEDIATELY.
--
-- Safe by construction: no arguments; it only looks up the session id from the
-- caller's own verified token (auth.jwt()), and returns a single boolean.
-- =============================================================================

create or replace function public.session_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.sessions s
    where s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and s.user_id = auth.uid()
  );
$$;

comment on function public.session_is_active() is
  'True if the caller''s session (from their JWT) has not been revoked.';

revoke execute on function public.session_is_active() from public, anon;
grant execute on function public.session_is_active() to authenticated;
