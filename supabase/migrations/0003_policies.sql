-- 0003: RLS policies. Principles (TECH_STACK §4.1):
-- users read own rows; money tables have NO direct write for anon/authenticated;
-- service_role bypasses RLS and is the only writer besides SECURITY DEFINER funcs.

-- profiles: owner reads/updates self
create policy p_profiles_self on profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- spirits + assets + interactions + receipts: owner reads
create policy p_spirits_self on spirits for select to authenticated using (owner_id = auth.uid());
create policy p_assets_self on spirit_assets for select to authenticated using (
  spirit_id in (select id from spirits where owner_id = auth.uid()));
create policy p_inter_self on interactions for select to authenticated using (user_id = auth.uid());
create policy p_receipts_self on xp_receipts for select to authenticated using (
  event_id in (select event_id from interactions where user_id = auth.uid()));

-- campaigns + lots: any logged-in user may list (needed for goods pages)
create policy p_campaigns_read on campaigns for select to authenticated using (true);
create policy p_lots_read on stock_lots for select to authenticated using (true);

-- ledger: owner reads own events (wallet reconciles from these); no direct writes
create policy p_ledger_self on ledger_events for select to authenticated using (user_id = auth.uid());

-- reservations + vouchers: owner reads; vouchers readable by holder
create policy p_res_self on reservations for select to authenticated using (user_id = auth.uid());
create policy p_vou_self on vouchers for select to authenticated using (holder_id = auth.uid());

-- redemptions: staff reads own merchant's
create policy p_red_staff on redemptions for select to authenticated using (
  merchant_id in (select merchant_id from profiles where id = auth.uid()));

-- rooms: host + members read
create policy p_room_member on rooms for select to authenticated using (
  host_id = auth.uid() or id in (select room_id from room_members where user_id = auth.uid()));
create policy p_roomm_member on room_members for select to authenticated using (
  user_id = auth.uid() or room_id in (select id from rooms where host_id = auth.uid()));

-- appeals: owner inserts + reads own
create policy p_appeal_self on appeals for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ai_usage + app_events: no policies => only service_role (operators via admin API).
