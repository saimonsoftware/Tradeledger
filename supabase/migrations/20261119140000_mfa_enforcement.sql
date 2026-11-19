-- =============================================================================
-- Two-factor authentication enforced by the DATABASE (defence in depth).
--
-- If a user has a verified authenticator (TOTP) factor, their data is readable
-- and writable ONLY from a session that completed the 2FA step (aal2). A user
-- who has typed their password but not their code (aal1) sees nothing, even if
-- every check in the app were bypassed. Users without 2FA are unaffected.
--
-- RESTRICTIVE policies are AND-ed with the existing owner-only (permissive)
-- policies: a row must pass both.
-- =============================================================================

-- SECURITY DEFINER because the `authenticated` role can't read auth.mfa_factors.
-- No arguments: it only ever evaluates the caller (auth.uid() / auth.jwt()).
create or replace function public.mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    or not exists (
      select 1
      from auth.mfa_factors f
      where f.user_id = auth.uid()
        and f.status = 'verified'
    );
$$;

comment on function public.mfa_satisfied() is
  'True if the caller has no verified 2FA factor, or their session completed 2FA (aal2).';

revoke execute on function public.mfa_satisfied() from public, anon;
grant execute on function public.mfa_satisfied() to authenticated;

create policy "Require 2FA when enabled" on public.profiles
  as restrictive for all to authenticated
  using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()));

create policy "Require 2FA when enabled" on public.trading_accounts
  as restrictive for all to authenticated
  using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()));

create policy "Require 2FA when enabled" on public.account_transactions
  as restrictive for all to authenticated
  using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()));

create policy "Require 2FA when enabled" on public.trades
  as restrictive for all to authenticated
  using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()));

-- Deleting your account also needs 2FA when it's enabled.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not public.mfa_satisfied() then
    raise exception 'Two-factor verification required' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end;
$$;
