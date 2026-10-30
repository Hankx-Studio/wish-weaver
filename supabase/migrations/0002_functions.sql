-- 0002: money/XP writes ONLY through these SECURITY DEFINER functions.
-- Simplifications vs full spec (valid for H0 contest volumes):
-- O/H computed as ledger sums (no per-hold linkage); J = 0 (single-txn reserve).
-- Duplicate event_id / idempotency_key returns the ORIGINAL result with code DUPLICATE_EVENT.
-- Only service_role may execute these functions (server-side Route Handlers per TECH_STACK §10);
-- anon/authenticated have no direct money-write path (TECH_STACK §4.1).

-- user available units in a campaign
create or replace function wallet_available(p_campaign uuid, p_user uuid)
returns bigint language sql stable set search_path = public as $$
  select coalesce(sum(case
    when kind in ('GRANT','RELEASE') then units
    when kind in ('HOLD','REDEEM_BURN') then -units
    else units end), 0)
  from ledger_events where campaign_id = p_campaign and user_id = p_user;
$$;

create or replace function grant_ritual_reward(
  p_event uuid, p_user uuid, p_spirit uuid, p_category text,
  p_campaign uuid, p_day date, p_is_simulated boolean, p_is_demo boolean, p_key text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_xp int := 0; v_cat_n int; v_day_xp int; v_grants_n int;
  v_k bigint; v_h numeric; v_o bigint; v_hh bigint; v_b bigint;
  v_ox int; v_ocoin bigint;
begin
  -- Serialize per user+day so XP caps and the daily coin count are exact under concurrency.
  perform pg_advisory_xact_lock(hashtext('grant:' || p_user::text || ':' || p_day::text));

  -- Idempotent replay: the same event returns the ORIGINAL result.
  if exists (select 1 from interactions where event_id = p_event) then
    select coalesce((select xp from xp_receipts where event_id = p_event), 0),
           coalesce((select units from ledger_events
                     where kind = 'GRANT' and ref_id = p_event limit 1), 0)
      into v_ox, v_ocoin;
    return jsonb_build_object('code','DUPLICATE_EVENT','xp',v_ox,'coin_units',v_ocoin);
  end if;
  insert into interactions (event_id, user_id, category, source, day_key, is_demo)
  values (p_event, p_user, p_category, 'local_rule', p_day, p_is_demo);

  -- XP by category with daily caps (ritual 10x3, care 5x3, social 15x1, day 60)
  select count(*) into v_cat_n from xp_receipts r
    join interactions i on i.event_id = r.event_id
    where i.user_id = p_user and i.day_key = p_day and i.category = p_category;
  select coalesce(sum(r.xp),0) into v_day_xp from xp_receipts r
    join interactions i on i.event_id = r.event_id
    where i.user_id = p_user and i.day_key = p_day;
  v_xp := case p_category
    when 'ritual' then case when v_cat_n < 3 then 10 else 0 end
    when 'care' then case when v_cat_n < 3 then 5 else 0 end
    when 'social' then case when v_cat_n < 1 and not p_is_simulated then 15 else 0 end
    else 0 end;
  if v_day_xp + v_xp > 60 then v_xp := greatest(0, 60 - v_day_xp); end if;
  if v_xp > 0 then
    insert into xp_receipts (event_id, spirit_id, category, xp, day_key)
    values (p_event, p_spirit, p_category, v_xp, p_day);
    update spirits set xp = xp + v_xp where id = p_spirit;
  end if;

  -- coins: ritual/social only, no sim/demo, max 3/day (15 pts).
  -- Daily count joins interactions.day_key (client day), not created_at::date (server TZ).
  if p_category not in ('ritual','social') or p_is_simulated or p_is_demo then
    return jsonb_build_object('xp',v_xp,'coin_units',0);
  end if;
  select count(*) into v_grants_n from ledger_events l
    join interactions i on i.event_id = l.ref_id
    where l.campaign_id = p_campaign and l.user_id = p_user and l.kind = 'GRANT'
      and i.day_key = p_day;
  if v_grants_n >= 3 then
    return jsonb_build_object('xp',v_xp,'coin_units',0);
  end if;
  perform pg_advisory_xact_lock(hashtext(p_campaign::text));
  select committed_units, buffer_fraction into v_k, v_h from campaigns where id = p_campaign;
  if not found then return jsonb_build_object('xp',v_xp,'coin_units',0); end if;
  v_k := coalesce(v_k, 0);
  v_h := coalesce(v_h, 0.2);
  select coalesce(sum(case when kind='GRANT' then units when kind='REDEEM_BURN' then -units else 0 end),0) into v_o
    from ledger_events where campaign_id = p_campaign;
  select coalesce(sum(case when kind='HOLD' then units when kind='RELEASE' then -units else 0 end),0) into v_hh
    from ledger_events where campaign_id = p_campaign;
  v_b := greatest(0, floor((1 - v_h) * v_k)::bigint - v_o - v_hh);
  if v_b < 50 then
    return jsonb_build_object('xp',v_xp,'coin_units',0,'code','SUPPLY_BUDGET_EXHAUSTED');
  end if;
  insert into ledger_events (campaign_id, user_id, kind, units, ref_id, idempotency_key, rule_version)
  values (p_campaign, p_user, 'GRANT', 50, p_event, p_key, 'h0');
  return jsonb_build_object('xp',v_xp,'coin_units',50);
exception when unique_violation then
  -- Concurrent duplicate: return the ORIGINAL result once the first txn commits.
  if exists (select 1 from interactions where event_id = p_event) then
    select coalesce((select xp from xp_receipts where event_id = p_event), 0),
           coalesce((select units from ledger_events
                     where kind = 'GRANT' and ref_id = p_event limit 1), 0)
      into v_ox, v_ocoin;
    return jsonb_build_object('code','DUPLICATE_EVENT','xp',v_ox,'coin_units',v_ocoin);
  end if;
  raise;
end; $$;

create or replace function reserve_item(
  p_lot uuid, p_user uuid, p_mode text, p_key text, p_token_hash text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_lot stock_lots%rowtype; v_camp campaigns%rowtype; v_bal bigint; v_res uuid;
begin
  -- Idempotent replay: the same key returns the ORIGINAL reservation.
  select id into v_res from reservations where idempotency_key = p_key;
  if found then
    return jsonb_build_object('code','DUPLICATE_EVENT','reservation_id', v_res);
  end if;

  select * into v_lot from stock_lots where id = p_lot for update;
  if not found or v_lot.free_stock < 1 then
    return jsonb_build_object('code','OUT_OF_STOCK');
  end if;
  select * into v_camp from campaigns where id = v_lot.campaign_id;
  -- Only ACTIVE campaigns accept reservations (PAUSED/ENDED/unknown all map to
  -- CAMPAIGN_PAUSED, the sole code TECH_STACK §4.2/§5 defines for this path).
  if v_camp.status is distinct from 'ACTIVE' then
    return jsonb_build_object('code','CAMPAIGN_PAUSED');
  end if;

  -- Recheck after acquiring the lot lock: a concurrent duplicate may have committed.
  select id into v_res from reservations where idempotency_key = p_key;
  if found then
    return jsonb_build_object('code','DUPLICATE_EVENT','reservation_id', v_res);
  end if;

  -- Serialize per user+campaign so the balance check and HOLD are exact under concurrency.
  perform pg_advisory_xact_lock(hashtext(p_user::text || ':' || v_lot.campaign_id::text));
  v_bal := wallet_available(v_lot.campaign_id, p_user);
  if v_bal < v_lot.price_units then return jsonb_build_object('code','POINTS_INSUFFICIENT'); end if;
  update stock_lots set free_stock = free_stock - 1, reserved_stock = reserved_stock + 1 where id = p_lot;
  insert into reservations (lot_id, user_id, units_held, mode, status, idempotency_key)
  values (p_lot, p_user, v_lot.price_units, p_mode, 'HELD', p_key) returning id into v_res;
  insert into ledger_events (campaign_id, user_id, kind, units, ref_id, idempotency_key, rule_version)
  values (v_lot.campaign_id, p_user, 'HOLD', v_lot.price_units, v_res, p_key || ':hold', 'h0');
  insert into vouchers (reservation_id, holder_id, token_hash, state)
  values (v_res, p_user, p_token_hash, 'ISSUED');
  return jsonb_build_object('reservation_id', v_res);
exception when unique_violation then
  -- Concurrent duplicate: return the ORIGINAL reservation once the first txn commits.
  select id into v_res from reservations where idempotency_key = p_key;
  if found then
    return jsonb_build_object('code','DUPLICATE_EVENT','reservation_id', v_res);
  end if;
  raise;
end; $$;

create or replace function claim_voucher(p_token_hash text, p_user uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_v vouchers%rowtype;
begin
  -- NOTE: p_key is accepted for API uniformity; replay is keyed on (voucher, holder):
  -- the current holder re-claiming gets the ORIGINAL success (H0 simplification, no claim ledger).
  select * into v_v from vouchers where token_hash = p_token_hash for update;
  if not found then return jsonb_build_object('code','VOUCHER_EXPIRED'); end if;
  if v_v.expires_at is not null and v_v.expires_at < now() then
    return jsonb_build_object('code','VOUCHER_EXPIRED');
  end if;
  if v_v.state = 'CLAIMED' and v_v.holder_id is not distinct from p_user then
    return jsonb_build_object('code','DUPLICATE_EVENT','voucher_id', v_v.id);
  end if;
  if v_v.state != 'SHARED' then return jsonb_build_object('code','ALREADY_CLAIMED'); end if;
  update vouchers set holder_id = p_user, state = 'CLAIMED' where id = v_v.id;
  return jsonb_build_object('voucher_id', v_v.id);
end; $$;

-- v2: added p_key (TECH_STACK §4.2: every function takes idempotency_key).
-- CREATE OR REPLACE cannot change a signature, so drop the old (token, staff) form first.
drop function if exists redeem_voucher(text, uuid);
create or replace function redeem_voucher(p_token_hash text, p_staff uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_v vouchers%rowtype; v_r reservations%rowtype; v_lot stock_lots%rowtype; v_staff profiles%rowtype;
  v_prior uuid;
begin
  -- Idempotent replay: the same key returns the ORIGINAL success.
  select ref_id into v_prior from ledger_events
    where idempotency_key = p_key and kind = 'REDEEM_BURN';
  if found then
    return jsonb_build_object('ok', true, 'code', 'DUPLICATE_EVENT', 'reservation_id', v_prior);
  end if;

  select * into v_v from vouchers where token_hash = p_token_hash for update;
  if not found then return jsonb_build_object('code','ALREADY_REDEEMED'); end if;
  if v_v.state = 'REDEEMED' then return jsonb_build_object('code','ALREADY_REDEEMED'); end if;
  select * into v_r from reservations where id = v_v.reservation_id;
  select * into v_lot from stock_lots where id = v_r.lot_id;
  select * into v_staff from profiles where id = p_staff;
  -- NULL-safe: unknown staff, non-staff role, and wrong merchant are all denied.
  if v_staff.id is null
     or v_staff.role is distinct from 'merchant_staff'
     or v_staff.merchant_id is distinct from v_lot.merchant_id then
    return jsonb_build_object('code','PERMISSION_DENIED');
  end if;
  insert into redemptions (reservation_id, merchant_id, staff_id)
  values (v_r.id, v_lot.merchant_id, p_staff);
  insert into ledger_events (campaign_id, user_id, kind, units, ref_id, idempotency_key, rule_version)
  values (v_lot.campaign_id, v_r.user_id, 'REDEEM_BURN', v_r.units_held, v_r.id, p_key, 'h0');
  update stock_lots set reserved_stock = reserved_stock - 1 where id = v_lot.id;
  update campaigns set committed_units = committed_units - v_r.units_held where id = v_lot.campaign_id;
  update vouchers set state = 'REDEEMED' where id = v_v.id;
  update reservations set status = 'REDEEMED' where id = v_r.id;
  return jsonb_build_object('ok', true, 'reservation_id', v_r.id);
exception when unique_violation then
  -- Same-key retry that raced the first commit replays success; a genuinely
  -- second redemption (different key) surfaces as ALREADY_REDEEMED.
  select ref_id into v_prior from ledger_events
    where idempotency_key = p_key and kind = 'REDEEM_BURN';
  if found then
    return jsonb_build_object('ok', true, 'code', 'DUPLICATE_EVENT', 'reservation_id', v_prior);
  end if;
  return jsonb_build_object('code','ALREADY_REDEEMED');
end; $$;

-- Execution grants: only the server (service_role) may call the money functions.
-- Table RLS already denies direct writes (§4.1); this closes the RPC path for anon/authenticated.
revoke all on function grant_ritual_reward(uuid, uuid, uuid, text, uuid, date, boolean, boolean, text) from public, anon, authenticated;
revoke all on function reserve_item(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function claim_voucher(text, uuid, text) from public, anon, authenticated;
revoke all on function redeem_voucher(text, uuid, text) from public, anon, authenticated;
grant execute on function grant_ritual_reward(uuid, uuid, uuid, text, uuid, date, boolean, boolean, text) to service_role;
grant execute on function reserve_item(uuid, uuid, text, text, text) to service_role;
grant execute on function claim_voucher(text, uuid, text) to service_role;
grant execute on function redeem_voucher(text, uuid, text) to service_role;
