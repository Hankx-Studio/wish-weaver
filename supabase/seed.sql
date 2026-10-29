-- Demo seed: one campaign + one merchant lot (bread, 15 pts = 150 units).
-- Run after 0001. Demo merchant id is fixed for seed idempotency.

insert into campaigns (id, name, region, status, committed_units, buffer_fraction, is_demo)
values ('00000000-0000-0000-0000-000000000001', 'Demo Bakery Week', 'demo', 'ACTIVE', 15000, 0.2, true)
on conflict (id) do update set status = 'ACTIVE', committed_units = 15000;

insert into stock_lots (id, campaign_id, merchant_id, product, allergens, price_units, free_stock, reserved_stock, is_demo)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  'Demo sourdough loaf', array['wheat'], 150, 100, 0, true
)
on conflict (id) do update set free_stock = 100, reserved_stock = 0;
