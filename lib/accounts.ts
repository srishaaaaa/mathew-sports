import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { supabaseAdmin as sb } from "@/lib/supabase";
import type { BranchId } from "@/lib/branches/types";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export type Role = "admin" | "staff";

export type Account = {
  id: string;
  display_name: string;
  role: Role;
  branch: BranchId | null;
  password_changed_at: string;
  created_at: string;
};

const PUBLIC_COLS = "id, display_name, role, branch, password_changed_at, created_at";

// ── Password hashing (scrypt, random salt) ────────────────────────
// Stored as `scrypt$<salt b64>$<hash b64>`.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

export const normalizeId = (id: string) => id.trim().toLowerCase();

export function validatePassword(password: string): string | null {
  if (password.length < 4) return "Passcode must be at least 4 characters.";
  if (password.length > 128) return "Passcode is too long.";
  return null;
}

/** Accounts a passcode can sign into: admins, or staff of one branch. */
async function candidates(role: Role, branch: BranchId | null) {
  let q = sb.from("pos_accounts").select(`${PUBLIC_COLS}, password_hash`).eq("role", role);
  if (role === "staff") q = q.eq("branch", branch);
  const { data, error } = await q.order("created_at");
  if (error) throw error;
  return data ?? [];
}

/**
 * Passcode-only login: the account (admin, or staff of `branch`) whose
 * passcode matches. Passcodes are unique within that group, so at most one does.
 */
export async function findByPasscode(role: Role, branch: BranchId | null, passcode: string): Promise<Account | null> {
  for (const row of await candidates(role, branch)) {
    if (await verifyPassword(passcode, row.password_hash)) {
      const { password_hash: _omit, ...account } = row;
      void _omit;
      return account as Account;
    }
  }
  return null;
}

/** Is this passcode already used by another admin / another staff member of the branch? */
export async function passcodeInUse(role: Role, branch: BranchId | null, passcode: string, exceptId?: string) {
  for (const row of await candidates(role, branch)) {
    if (row.id !== exceptId && (await verifyPassword(passcode, row.password_hash))) return true;
  }
  return false;
}

/** A free login ID derived from a display name, e.g. "Anu Mathew" → "anu-mathew". */
export async function freeIdFrom(name: string, fallback: string): Promise<string> {
  const base = (name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || fallback).padEnd(3, "x");
  for (let n = 1; n < 100; n++) {
    const id = n === 1 ? base : `${base}-${n}`;
    if (!(await getAccount(id))) return id;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// ── Queries ───────────────────────────────────────────────────────
export async function getAccount(id: string): Promise<Account | null> {
  const { data, error } = await sb.from("pos_accounts").select(PUBLIC_COLS).eq("id", normalizeId(id)).maybeSingle();
  if (error) {
    console.error("Error reading account:", error);
    return null;
  }
  return (data as Account) ?? null;
}

/** Returns the account when the password matches, otherwise null. */
export async function checkCredentials(id: string, password: string): Promise<Account | null> {
  const { data, error } = await sb
    .from("pos_accounts")
    .select(`${PUBLIC_COLS}, password_hash`)
    .eq("id", normalizeId(id))
    .maybeSingle();
  if (error) {
    console.error("Error reading account:", error);
    return null;
  }
  if (!data || !(await verifyPassword(password, data.password_hash))) return null;
  const { password_hash: _omit, ...account } = data;
  void _omit;
  return account as Account;
}

export async function listAccounts(): Promise<Account[]> {
  const { data, error } = await sb.from("pos_accounts").select(PUBLIC_COLS).order("role").order("id");
  if (error) throw error;
  return (data ?? []) as Account[];
}

export async function createAccount(input: {
  id: string;
  display_name: string;
  role: Role;
  branch: BranchId | null;
  password: string;
}): Promise<void> {
  const { error } = await sb.from("pos_accounts").insert({
    id: normalizeId(input.id),
    display_name: input.display_name.trim(),
    role: input.role,
    branch: input.role === "admin" ? null : input.branch,
    password_hash: await hashPassword(input.password),
  });
  if (error) {
    if (error.code === "23505") throw new Error("That login ID is already taken.");
    if (error.code === "23514") throw new Error("Login ID must be 3–32 characters: letters, numbers, . _ -");
    throw error;
  }
}

export async function setPassword(id: string, password: string): Promise<void> {
  const { error, count } = await sb
    .from("pos_accounts")
    .update(
      { password_hash: await hashPassword(password), password_changed_at: new Date().toISOString() },
      { count: "exact" },
    )
    .eq("id", normalizeId(id));
  if (error) throw error;
  if (!count) throw new Error("Account not found.");
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await sb.from("pos_accounts").delete().eq("id", normalizeId(id));
  if (error) throw error;
}
