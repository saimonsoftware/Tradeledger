-- =============================================================================
-- DEMO SEED DATA: LOCAL DEVELOPMENT ONLY
--
-- Runs automatically on `supabase db reset` against a LOCAL database (Docker).
-- Never run this against production: it creates a user with a known password.
--
--   Demo login:  demo@tradeledger.local  /  demo-password-123
--
-- Creates 3 accounts, a few deposits/withdrawals, and ~6 weeks of trades ending
-- today (so the dashboard's "this week" always has data). Uses a fixed random
-- seed, so the data is the same every time.
-- =============================================================================

do $$
declare
  demo_id constant uuid := 'd0d0d0d0-0000-4000-8000-000000000001';
  acc_prop constant uuid := 'd0d0d0d0-0000-4000-8000-0000000000a1';
  acc_futures constant uuid := 'd0d0d0d0-0000-4000-8000-0000000000a2';
  acc_crypto constant uuid := 'd0d0d0d0-0000-4000-8000-0000000000a3';
  d date;
  i int;
  n int;
  sym text;
  cls text;
  acc uuid;
  mult numeric;
  qty numeric;
  entry_px numeric;
  move numeric;
  stop_dist numeric;
  dir text;
  t_in timestamptz;
  t_out timestamptz;
  strategies text[] := array['ORB', 'VWAP reclaim', 'Pullback', 'Breakout', 'Mean reversion'];
  tag_pool text[] := array['A+ setup', 'FOMO', 'followed plan', 'revenge', 'news', 'patient'];
  base_px numeric;
begin
  if exists (select 1 from auth.users where id = demo_id) then
    raise notice 'Demo user already exists, skipping seed.';
    return;
  end if;

  perform setseed(0.42);  -- fixed seed: same demo data every time

  -- ---- Demo user (auth.users + email identity). The profile row is created by
  -- the on_auth_user_created trigger.
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    demo_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'demo@tradeledger.local', extensions.crypt('demo-password-123', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Demo Trader","timezone":"Europe/Dublin"}',
    now() - interval '60 days', now(), '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), demo_id, demo_id::text, 'email',
    jsonb_build_object('sub', demo_id::text, 'email', 'demo@tradeledger.local', 'email_verified', true),
    now(), now(), now()
  );

  -- ---- Accounts
  insert into public.trading_accounts (id, user_id, name, broker, account_type, currency, starting_balance, start_date)
  values
    (acc_prop, demo_id, 'Prop 100k Challenge', 'FTMO', 'prop_challenge', 'USD', 100000, current_date - 45),
    (acc_futures, demo_id, 'Futures Main', 'Interactive Brokers', 'live', 'USD', 25000, current_date - 60),
    (acc_crypto, demo_id, 'Crypto Swing', 'Kraken', 'live', 'EUR', 5000, current_date - 60);

  insert into public.account_transactions (user_id, account_id, type, amount, occurred_at, note) values
    (demo_id, acc_futures, 'deposit', 5000, now() - interval '30 days', 'Monthly top-up'),
    (demo_id, acc_futures, 'withdrawal', 1500, now() - interval '8 days', 'Paid myself'),
    (demo_id, acc_crypto, 'deposit', 1000, now() - interval '20 days', null);

  -- ---- Trades: weekdays over the last ~6 weeks, 1–3 per day.
  for d in select gs::date from generate_series(current_date - 42, current_date, interval '1 day') gs loop
    continue when extract(isodow from d) > 5;
    n := 1 + floor(random()::numeric * 3)::int;
    for i in 1..n loop
      -- Only EURUSD and NQ can be logged. Size/multiplier are used here just to make
      -- realistic P&L amounts (the app stores the P&L itself).
      if random()::numeric < 0.5 then
        sym := 'NQ';     cls := 'future'; acc := acc_futures; mult := 20; qty := 1;                                          base_px := 21000;
      else
        sym := 'EURUSD'; cls := 'forex';  acc := acc_prop;    mult := 1;  qty := 100000 * (1 + floor(random()::numeric * 3)); base_px := 1.08;
      end if;

      dir := case when random()::numeric < 0.6 then 'long' else 'short' end;
      entry_px := round(base_px * (1 + (random()::numeric - 0.5) * 0.04), case when cls = 'forex' then 5 else 2 end);
      -- Futures have large multipliers, so use tighter stops for realistic $ risk.
      stop_dist := round(
        entry_px * case when cls = 'future' then 0.0008 + random()::numeric * 0.0012
                        else 0.002 + random()::numeric * 0.004 end,
        case when cls = 'forex' then 5 else 2 end);
      -- ~55% winners; winners run 0.5–2.5R, losers lose 0.3–1R.
      move := case when random()::numeric < 0.55
                then stop_dist * (0.5 + random()::numeric * 2)
                else -stop_dist * (0.3 + random()::numeric * 0.7) end;
      t_in := (d + time '14:30') at time zone 'UTC' + (random() * interval '5 hours');
      t_out := t_in + (5 + random() * 120) * interval '1 minute';

      -- The most recent trade today stays open.
      if d = current_date and i = n then
        t_out := null;
      end if;

      insert into public.trades (
        user_id, account_id, symbol, direction,
        entry_time, entry_price, exit_price, net_pnl, stop_loss, strategy, tags, rating, notes
      ) values (
        demo_id, acc, sym, dir,
        t_in, entry_px,
        case when t_out is null then null
             else round(case when dir = 'long' then entry_px + move else entry_px - move end,
                        case when cls = 'forex' then 5 else 2 end) end,
        -- P&L after fees (null = still open)
        case when t_out is null then null
             else round(move * qty * mult - (2 + random()::numeric * 8), 2) end,
        case when dir = 'long' then entry_px - stop_dist else entry_px + stop_dist end,
        strategies[1 + floor(random()::numeric * array_length(strategies, 1))::int],
        array[tag_pool[1 + floor(random()::numeric * array_length(tag_pool, 1))::int]],
        1 + floor(random()::numeric * 5)::int,
        case when random()::numeric < 0.3 then 'Waited for confirmation before entering.' end
      );
    end loop;
  end loop;
end $$;
