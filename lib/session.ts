import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getAccount, type Account } from "@/lib/accounts";
import type { BranchId } from "@/lib/branches/types";

// Signed session cookie: `<payload b64url>.<HMAC-SHA256 b64url>`.
// The payload can't be forged without SESSION_SECRET, and every request
// re-checks the account in the database — so deleting an account or
// changing its password signs it out everywhere.

const COOKIE = "pos_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type Session = Account;

type Payload = { uid: string; pwd: string; exp: number };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (32+ characters).");
  return s;
}

const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

function encode(p: Payload): string {
  const body = Buffer.from(JSON.stringify(p)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(token: string): Payload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    return p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
}

async function isSecureRequest(): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return false;
  try {
    const h = await headers();
    const host = h.get("host") || "";
    if (h.get("x-forwarded-proto") === "http") return false;
    if (/^(localhost|127\.0\.0\.1|192\.168\.|10\.)/.test(host)) return false;
  } catch {}
  return true;
}

export async function startSession(account: Account): Promise<void> {
  const token = encode({ uid: account.id, pwd: account.password_changed_at, exp: Date.now() + MAX_AGE * 1000 });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: await isSecureRequest(),
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const payload = decode(token);
  if (!payload) return null;
  const account = await getAccount(payload.uid);
  if (!account) return null;
  // Password changed since this session started → session is void.
  if (new Date(account.password_changed_at).getTime() !== new Date(payload.pwd).getTime()) return null;
  return account;
}

export const canUseBranch = (s: Session | null, branch: BranchId) =>
  !!s && (s.role === "admin" || s.branch === branch);

/** Staff of this branch, or an admin. */
export async function requireBranch(branch: BranchId): Promise<Session> {
  const s = await getSession();
  if (!canUseBranch(s, branch)) throw new Error("Unauthorized");
  return s!;
}

export async function requireAdmin(): Promise<Session> {
  const s = await getSession();
  if (s?.role !== "admin") throw new Error("Unauthorized: admin only");
  return s;
}

/** Where a signed-in account lands after login. */
export const homeFor = (s: Session) => (s.role === "admin" ? "/admin" : s.branch === "pos2" ? "/pos2" : "/pos1");
