-- ── Editable store details per branch ─────────────────────────────
-- Admin → Settings → Store details. Values here override the defaults in
-- lib/branches/pos1.ts / pos2.ts for that branch only:
-- { shopName, ownerName, phone, shopPhone, email, address, instagram, tagline,
--   logo (data URL), logoBackground }
alter table branch_settings add column if not exists profile jsonb not null default '{}';
