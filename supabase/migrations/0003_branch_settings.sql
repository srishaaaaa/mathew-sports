-- ── Per-branch settings (theme choice, etc.) ──────────────────────
-- One row per branch ('pos1' = Matthew Sports, 'pos2' = Vybe Girl).
-- Read/written only by the server with the secret key.

create table if not exists branch_settings (
  branch     text primary key check (branch in ('pos1','pos2')),
  theme_id   text,
  updated_at timestamptz not null default now()
);

alter table branch_settings enable row level security;
