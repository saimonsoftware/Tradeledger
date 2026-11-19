-- =============================================================================
-- Fix: the screenshot upload policy counted existing files by querying
-- storage.objects from inside a policy ON storage.objects, which Postgres rejects
-- as "infinite recursion in policy". The checks now live in a function.
-- =============================================================================

-- True if the CALLER may add a screenshot to this trade: it's their trade and it
-- has fewer than 6 screenshots. SECURITY DEFINER so it can count files without
-- re-entering the storage.objects policies; it only ever looks at auth.uid()'s folder.
create or replace function public.can_add_trade_screenshot(p_trade_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and exists (
      select 1 from public.trades t
      where t.id::text = p_trade_id and t.user_id = auth.uid()
    )
    and (
      select count(*) from storage.objects o
      where o.bucket_id = 'trade-screenshots'
        and o.name like auth.uid()::text || '/' || p_trade_id || '/%'
    ) < 6;
$$;

comment on function public.can_add_trade_screenshot(text) is
  'Storage policy helper: caller owns the trade and it has fewer than 6 screenshots.';

revoke execute on function public.can_add_trade_screenshot(text) from public, anon;
grant execute on function public.can_add_trade_screenshot(text) to authenticated;

drop policy "Owner can add trade screenshots" on storage.objects;

create policy "Owner can add trade screenshots" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'trade-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 2
    and public.can_add_trade_screenshot((storage.foldername(name))[2])
  );
