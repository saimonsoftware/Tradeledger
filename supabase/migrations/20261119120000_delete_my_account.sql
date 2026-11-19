-- =============================================================================
-- delete_my_account(): lets a logged-in user permanently delete THEIR OWN account.
--
-- Why a function: deleting from auth.users needs elevated rights. Rather than
-- giving the app the all-powerful service_role key (CLAUDE.md rule 2), this one
-- narrowly scoped SECURITY DEFINER function does exactly one thing:
--   * it takes NO arguments, so a caller can't name someone else's id;
--   * it deletes only auth.uid(), the id in the caller's verified session token;
--   * ON DELETE CASCADE then removes their profile, accounts, transactions and trades.
-- The Server Action additionally re-checks the user's password before calling it.
-- =============================================================================

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
  delete from auth.users where id = uid;
end;
$$;

comment on function public.delete_my_account() is
  'Deletes the CALLER''s own account (auth.uid()) and, via cascades, all their data.';

-- Only logged-in users may call it; logged-out visitors cannot.
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
