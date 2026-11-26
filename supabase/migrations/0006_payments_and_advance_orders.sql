-- ── Payment details on bills + advance orders (both branches) ───────
-- Bills now record how they were paid (incl. split amounts) and the coupon
-- used. Advance orders are partial-payment holds: deposits are tracked on the
-- advance order and only become revenue when the balance is collected, which
-- turns the hold into one normal invoice (a row in orders).

-- ── 1. Payment columns on bills ────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['orders', 'pos2_orders'] loop
    execute format('alter table %I add column if not exists payment_mode text not null default ''CASH''', t);
    execute format('alter table %I add column if not exists split_cash numeric(12,2) not null default 0', t);
    execute format('alter table %I add column if not exists split_gpay numeric(12,2) not null default 0', t);
    execute format('alter table %I add column if not exists split_card numeric(12,2) not null default 0', t);
    execute format('alter table %I add column if not exists coupon_code text', t);
    execute format('alter table %I add column if not exists advance_order_id text', t);
    execute format('alter table %I add column if not exists advance_paid numeric(12,2) not null default 0', t);
  end loop;
end $$;

-- Older bills stored the payment mode as a suffix on the phone ("98…_GPAY").
update orders      set payment_mode = split_part(customer_phone, '_', 2)
  where customer_phone like '%\_%' and split_part(customer_phone, '_', 2) in ('CASH','CARD','GPAY');
update pos2_orders set payment_mode = split_part(customer_phone, '_', 2)
  where customer_phone like '%\_%' and split_part(customer_phone, '_', 2) in ('CASH','CARD','GPAY');

-- ── 2. Atomic bill writes now include the payment columns ──────────
create or replace function create_order(payload jsonb)
returns void language plpgsql as $$
declare item jsonb; idx int := 0;
begin
  insert into orders (id, customer_name, customer_phone, source, status,
        subtotal, discount_type, discount_value, discount_amount,
        delivery_fee, grand_total, cash_received, created_at,
        payment_mode, split_cash, split_gpay, split_card, coupon_code,
        advance_order_id, advance_paid)
  values (
    payload->>'id', coalesce(payload->>'customer_name','Guest'), coalesce(payload->>'customer_phone',''),
    payload->>'source', payload->>'status',
    (payload->>'subtotal')::numeric, payload->>'discount_type', (payload->>'discount_value')::numeric,
    (payload->>'discount_amount')::numeric, (payload->>'delivery_fee')::numeric,
    (payload->>'grand_total')::numeric, (payload->>'cash_received')::numeric,
    coalesce((payload->>'created_at')::timestamptz, now()),
    coalesce(payload->>'payment_mode','CASH'),
    coalesce((payload->>'split_cash')::numeric,0), coalesce((payload->>'split_gpay')::numeric,0),
    coalesce((payload->>'split_card')::numeric,0), nullif(payload->>'coupon_code',''),
    nullif(payload->>'advance_order_id',''), coalesce((payload->>'advance_paid')::numeric,0)
  )
  on conflict (id) do update set
    customer_name=excluded.customer_name, customer_phone=excluded.customer_phone,
    source=excluded.source, status=excluded.status, subtotal=excluded.subtotal,
    discount_type=excluded.discount_type, discount_value=excluded.discount_value,
    discount_amount=excluded.discount_amount, delivery_fee=excluded.delivery_fee,
    grand_total=excluded.grand_total, cash_received=excluded.cash_received,
    payment_mode=excluded.payment_mode, split_cash=excluded.split_cash,
    split_gpay=excluded.split_gpay, split_card=excluded.split_card,
    coupon_code=excluded.coupon_code, advance_order_id=excluded.advance_order_id,
    advance_paid=excluded.advance_paid;

  delete from order_items where order_id = payload->>'id';
  for item in select * from jsonb_array_elements(payload->'order_items') loop
    insert into order_items (order_id, position, snapshot_name, snapshot_desc, snapshot_price, quantity)
    values (payload->>'id', idx, item->>'snapshot_name', coalesce(item->>'snapshot_desc',''),
            (item->>'snapshot_price')::numeric, (item->>'quantity')::int);
    idx := idx + 1;
  end loop;
end; $$;

create or replace function pos2_create_order(payload jsonb)
returns void language plpgsql as $$
declare item jsonb; idx int := 0;
begin
  insert into pos2_orders (id, customer_name, customer_phone, source, status,
        subtotal, discount_type, discount_value, discount_amount,
        delivery_fee, grand_total, cash_received, created_at,
        payment_mode, split_cash, split_gpay, split_card, coupon_code,
        advance_order_id, advance_paid)
  values (
    payload->>'id', coalesce(payload->>'customer_name','Guest'), coalesce(payload->>'customer_phone',''),
    payload->>'source', payload->>'status',
    (payload->>'subtotal')::numeric, payload->>'discount_type', (payload->>'discount_value')::numeric,
    (payload->>'discount_amount')::numeric, (payload->>'delivery_fee')::numeric,
    (payload->>'grand_total')::numeric, (payload->>'cash_received')::numeric,
    coalesce((payload->>'created_at')::timestamptz, now()),
    coalesce(payload->>'payment_mode','CASH'),
    coalesce((payload->>'split_cash')::numeric,0), coalesce((payload->>'split_gpay')::numeric,0),
    coalesce((payload->>'split_card')::numeric,0), nullif(payload->>'coupon_code',''),
    nullif(payload->>'advance_order_id',''), coalesce((payload->>'advance_paid')::numeric,0)
  )
  on conflict (id) do update set
    customer_name=excluded.customer_name, customer_phone=excluded.customer_phone,
    source=excluded.source, status=excluded.status, subtotal=excluded.subtotal,
    discount_type=excluded.discount_type, discount_value=excluded.discount_value,
    discount_amount=excluded.discount_amount, delivery_fee=excluded.delivery_fee,
    grand_total=excluded.grand_total, cash_received=excluded.cash_received,
    payment_mode=excluded.payment_mode, split_cash=excluded.split_cash,
    split_gpay=excluded.split_gpay, split_card=excluded.split_card,
    coupon_code=excluded.coupon_code, advance_order_id=excluded.advance_order_id,
    advance_paid=excluded.advance_paid;

  delete from pos2_order_items where order_id = payload->>'id';
  for item in select * from jsonb_array_elements(payload->'order_items') loop
    insert into pos2_order_items (order_id, position, snapshot_name, snapshot_desc, snapshot_price, quantity)
    values (payload->>'id', idx, item->>'snapshot_name', coalesce(item->>'snapshot_desc',''),
            (item->>'snapshot_price')::numeric, (item->>'quantity')::int);
    idx := idx + 1;
  end loop;
end; $$;

-- ── 3. Advance orders (one table per branch) ───────────────────────
-- items:    [{ name, desc, price, qty }]
-- payments: [{ kind: DEPOSIT|BALANCE, at, mode: CASH|GPAY|CARD|SPLIT,
--              cash, gpay, card, amount,
--              manual_discount, coupon_code, coupon_discount }]
do $$
declare p text;
begin
  foreach p in array array['', 'pos2_'] loop
    execute format($f$
      create table if not exists %1$sadvance_orders (
        id               text primary key,
        customer_name    text not null default 'Guest',
        customer_phone   text not null default '',
        source           text not null default 'OFFLINE' check (source in ('ONLINE','OFFLINE')),
        status           text not null default 'PENDING' check (status in ('PENDING','READY','COMPLETED','CANCELLED')),
        items            jsonb not null default '[]',
        subtotal         numeric(12,2) not null default 0,
        discount_type    text not null default 'FIXED' check (discount_type in ('PERCENT','FIXED')),
        discount_value   numeric(12,2) not null default 0,
        discount_amount  numeric(12,2) not null default 0,
        coupon_code      text,
        is_gst           boolean not null default false,
        gst_percentage   numeric(5,2) not null default 0,
        gst_amount       numeric(12,2) not null default 0,
        delivery_fee     numeric(12,2) not null default 0,
        total_amount     numeric(12,2) not null default 0,
        deposit_amount   numeric(12,2) not null default 0,
        payments         jsonb not null default '[]',
        delivery_date    date,
        notes            text,
        finalized_order_id text,
        finalized_at     timestamptz,
        cancelled_at     timestamptz,
        created_at       timestamptz not null default now()
      )$f$, p);
    execute format('create index if not exists idx_%1$sadvance_status on %1$sadvance_orders(status)', p);
    execute format('create index if not exists idx_%1$sadvance_created on %1$sadvance_orders(created_at desc)', p);
    execute format('alter table %1$sadvance_orders enable row level security', p);
    execute format('grant select, insert, update, delete on %1$sadvance_orders to service_role', p);
  end loop;
end $$;
