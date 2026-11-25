-- ── POS 2: a fully separate set of tables ─────────────────────────
-- Mirrors 0001_init.sql with a `pos2_` prefix. POS 1 and POS 2 share no
-- rows: products, orders, order items and invoices are all independent.

create table if not exists pos2_products (
  id            text primary key default gen_random_uuid()::text,
  name          text not null,
  description   text not null default '',
  default_price numeric(12,2) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists pos2_orders (
  id             text primary key,                 -- INV-<year>-XXXXX
  customer_name  text not null default 'Guest',
  customer_phone text not null default '',
  source         text not null check (source in ('ONLINE','OFFLINE')),
  status         text not null check (status in ('COMPLETED','PENDING')),
  subtotal        numeric(12,2) not null default 0,
  discount_type   text not null default 'FIXED' check (discount_type in ('PERCENT','FIXED')),
  discount_value  numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  delivery_fee    numeric(12,2) not null default 0,
  grand_total     numeric(12,2) not null default 0,
  cash_received   numeric(12,2) not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists pos2_order_items (
  id             bigserial primary key,
  order_id       text not null references pos2_orders(id) on delete cascade,
  position       int  not null,
  snapshot_name  text not null,
  snapshot_desc  text not null default '',
  snapshot_price numeric(12,2) not null,
  quantity       int  not null
);

create index if not exists idx_pos2_order_items_order_id on pos2_order_items(order_id);
create index if not exists idx_pos2_orders_created_at    on pos2_orders(created_at desc);
create index if not exists idx_pos2_orders_phone         on pos2_orders(customer_phone);

-- RLS ON + no policies => the publishable/anon key can touch nothing.
-- The server uses the secret key, which bypasses RLS.
alter table pos2_products    enable row level security;
alter table pos2_orders      enable row level security;
alter table pos2_order_items enable row level security;

-- ── Atomic order write for POS 2 (order + items in one transaction) ──
create or replace function pos2_create_order(payload jsonb)
returns void
language plpgsql
as $$
declare
  item jsonb;
  idx  int := 0;
begin
  insert into pos2_orders (id, customer_name, customer_phone, source, status,
        subtotal, discount_type, discount_value, discount_amount,
        delivery_fee, grand_total, cash_received, created_at)
  values (
    payload->>'id',
    coalesce(payload->>'customer_name','Guest'),
    coalesce(payload->>'customer_phone',''),
    payload->>'source',
    payload->>'status',
    (payload->>'subtotal')::numeric,
    payload->>'discount_type',
    (payload->>'discount_value')::numeric,
    (payload->>'discount_amount')::numeric,
    (payload->>'delivery_fee')::numeric,
    (payload->>'grand_total')::numeric,
    (payload->>'cash_received')::numeric,
    coalesce((payload->>'created_at')::timestamptz, now())
  )
  on conflict (id) do update set
    customer_name=excluded.customer_name, customer_phone=excluded.customer_phone,
    source=excluded.source, status=excluded.status, subtotal=excluded.subtotal,
    discount_type=excluded.discount_type, discount_value=excluded.discount_value,
    discount_amount=excluded.discount_amount, delivery_fee=excluded.delivery_fee,
    grand_total=excluded.grand_total, cash_received=excluded.cash_received;

  delete from pos2_order_items where order_id = payload->>'id';

  for item in select * from jsonb_array_elements(payload->'order_items')
  loop
    insert into pos2_order_items (order_id, position, snapshot_name, snapshot_desc, snapshot_price, quantity)
    values (payload->>'id', idx, item->>'snapshot_name',
            coalesce(item->>'snapshot_desc',''),
            (item->>'snapshot_price')::numeric, (item->>'quantity')::int);
    idx := idx + 1;
  end loop;
end;
$$;
