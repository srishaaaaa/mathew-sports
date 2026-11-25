// Writes the passcodes from .env into the database:
//   ADMIN_PASSCODE   → account "admin"  (both branches + admin panel)
//   STAFF1_PASSCODE  → account "staff1" (Matthew Sports / pos1)
//   STAFF2_PASSCODE  → account "staff2" (Vybe Girl / pos2)
//
//   npm run accounts
//
// Each account is created if missing; otherwise its passcode is reset to
// match .env (which signs it out everywhere). Blank values are skipped.
import { createClient } from "@supabase/supabase-js";
import { randomBytes, scryptSync } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

// Same format as lib/accounts.ts: scrypt$<salt b64>$<hash b64>
const hash = (pw) => {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64")}$${scryptSync(pw, salt, 64).toString("base64")}`;
};

const wanted = [
  { env: "ADMIN_PASSCODE", id: "admin", role: "admin", branch: null, name: "Administrator" },
  { env: "STAFF1_PASSCODE", id: "staff1", role: "staff", branch: "pos1", name: "Matthew Sports Staff" },
  { env: "STAFF2_PASSCODE", id: "staff2", role: "staff", branch: "pos2", name: "Vybe Girl Staff" },
];

let failed = false;
for (const w of wanted) {
  const id = w.id;
  const password = process.env[w.env]?.trim();
  if (!password) {
    console.log(`skip    ${w.env} (not set in .env)`);
    continue;
  }
  if (password.length < 4) {
    console.error(`error   ${w.env}: passcode must be at least 4 characters`);
    failed = true;
    continue;
  }
  const { data: existing } = await sb.from("pos_accounts").select("id, display_name").eq("id", id).maybeSingle();
  const { error } = await sb.from("pos_accounts").upsert({
    id,
    display_name: existing?.display_name || w.name,
    role: w.role,
    branch: w.branch,
    password_hash: hash(password),
    password_changed_at: new Date().toISOString(),
  });
  if (error) {
    console.error(`error   ${id}: ${error.message}`);
    failed = true;
  } else {
    console.log(`${existing ? "updated" : "created"} ${id.padEnd(10)} ${w.role.padEnd(6)} ${w.branch ?? "all branches"}`);
  }
}
process.exit(failed ? 1 : 0);
