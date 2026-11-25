-- ── Table access for the server key ───────────────────────────────
-- Newer Supabase projects no longer grant read/write on new tables to the
-- API roles automatically. The app only talks to the database from the
-- server with the secret (service_role) key, so grant that role — and only
-- that role. anon/authenticated (the publishable key) stay locked out.

grant usage on schema public to service_role;

grant select, insert, update, delete on
  products, orders, order_items,
  pos2_products, pos2_orders, pos2_order_items,
  branch_settings
to service_role;

grant usage, select on sequence order_items_id_seq, pos2_order_items_id_seq to service_role;

grant execute on function create_order(jsonb), pos2_create_order(jsonb) to service_role;
revoke execute on function create_order(jsonb), pos2_create_order(jsonb) from public, anon, authenticated;
