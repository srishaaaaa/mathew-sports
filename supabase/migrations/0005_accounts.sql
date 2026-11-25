-- ── Login accounts ────────────────────────────────────────────────
-- admin  → both branches + the admin panel (branch is null)
-- staff  → one branch's billing terminal only
-- Passwords are stored as scrypt hashes, never in plain text.

create table if not exists pos_accounts (
  id                  text primary key check (id = lower(id) and id ~ '^[a-z0-9._-]{3,32}$'),
  display_name        text not null default '',
  role                text not null check (role in ('admin','staff')),
  branch              text check (branch in ('pos1','pos2')),
  password_hash       text not null,
  password_changed_at timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  constraint pos_accounts_branch_matches_role check (
    (role = 'admin' and branch is null) or (role = 'staff' and branch is not null)
  )
);

alter table pos_accounts enable row level security;

grant select, insert, update, delete on pos_accounts to service_role;
