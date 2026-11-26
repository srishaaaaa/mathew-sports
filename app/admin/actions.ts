"use server";

import { supabaseAdmin as sb } from "@/lib/supabase";
import { requireAdmin } from "@/lib/session";
import {
  createAccount,
  deleteAccount,
  freeIdFrom,
  passcodeInUse,
  listAccounts,
  normalizeId,
  setPassword,
  validatePassword,
  type Account,
  type Role,
} from "@/lib/accounts";
import { getThemeId } from "@/lib/settings";
import { getShopProfile } from "@/lib/shop";
import { BRANCH as POS1 } from "@/lib/branches/pos1";
import { BRANCH as POS2 } from "@/lib/branches/pos2";
import { resolveTheme, type BranchConfig, type BranchId, type ThemeColors } from "@/lib/branches/types";

// ── Overview ──────────────────────────────────────────────────────
export type DayPoint = { date: string; label: string; sales: number; bills: number };
export type RecentInvoice = { id: string; customer: string; total: number; createdAt: string; online: boolean };

export type BranchOverview = {
  id: BranchId;
  shopName: string;
  tagline: string;
  logo: string;
  logoBg: string;
  home: string;
  invoiceBase: string;
  colors: ThemeColors;
  todaySales: number;
  todayBills: number;
  monthSales: number;
  monthBills: number;
  totalBills: number;
  products: number;
  /** Open advance orders: count, balance still due, deposits held (not yet revenue). */
  advanceOpen: number;
  advanceDue: number;
  advanceHeld: number;
  last7: DayPoint[];
  recent: RecentInvoice[];
};

// Shop days run on India time (UTC+5:30, no daylight saving).
const IST_MS = 5.5 * 60 * 60 * 1000;
const istDayKey = (d: Date) => new Date(d.getTime() + IST_MS).toISOString().slice(0, 10);
const istMidnightUtc = (key: string) => new Date(new Date(`${key}T00:00:00Z`).getTime() - IST_MS);

async function branchOverview(branch: BranchConfig, prefix: string, invoiceBase: string): Promise<BranchOverview> {
  const now = new Date();
  const todayKey = istDayKey(now);
  const monthKey = todayKey.slice(0, 8) + "01";
  const sevenAgoKey = istDayKey(new Date(istMidnightUtc(todayKey).getTime() + IST_MS - 6 * 86400000));
  const since = istMidnightUtc(monthKey < sevenAgoKey ? monthKey : sevenAgoKey).toISOString();

  const [recentQ, windowQ, totalQ, productsQ, themeId, shop, advanceQ] = await Promise.all([
    sb.from(`${prefix}orders`).select("id, customer_name, grand_total, created_at, source").order("created_at", { ascending: false }).limit(6),
    sb.from(`${prefix}orders`).select("grand_total, created_at").gte("created_at", since),
    sb.from(`${prefix}orders`).select("id", { count: "exact", head: true }),
    sb.from(`${prefix}products`).select("id", { count: "exact", head: true }),
    getThemeId(branch.id),
    getShopProfile(branch.id),
    sb.from(`${prefix}advance_orders`).select("total_amount, deposit_amount").in("status", ["PENDING", "READY"]),
  ]);
  for (const q of [recentQ, windowQ, totalQ, productsQ, advanceQ]) if (q.error) throw q.error;
  const advance = advanceQ.data ?? [];

  const days = new Map<string, DayPoint>();
  for (let i = 6; i >= 0; i--) {
    const key = istDayKey(new Date(now.getTime() - i * 86400000));
    const label = new Date(`${key}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" });
    days.set(key, { date: key, label, sales: 0, bills: 0 });
  }

  let todaySales = 0, todayBills = 0, monthSales = 0, monthBills = 0;
  for (const o of windowQ.data ?? []) {
    const key = istDayKey(new Date(o.created_at));
    const total = Number(o.grand_total) || 0;
    if (key === todayKey) { todaySales += total; todayBills++; }
    if (key >= monthKey) { monthSales += total; monthBills++; }
    const d = days.get(key);
    if (d) { d.sales += total; d.bills++; }
  }

  return {
    id: branch.id,
    shopName: shop.shopName,
    tagline: shop.tagline,
    logo: shop.logoMark,
    logoBg: shop.logoBackground,
    advanceOpen: advance.length,
    advanceDue: advance.reduce((t, a) => t + Math.max(0, Number(a.total_amount) - Number(a.deposit_amount)), 0),
    advanceHeld: advance.reduce((t, a) => t + (Number(a.deposit_amount) || 0), 0),
    home: branch.homePath,
    invoiceBase,
    colors: resolveTheme(branch, themeId).colors,
    todaySales, todayBills, monthSales, monthBills,
    totalBills: totalQ.count ?? 0,
    products: productsQ.count ?? 0,
    last7: [...days.values()],
    recent: (recentQ.data ?? []).map((o) => ({
      id: o.id,
      customer: o.customer_name || "Guest",
      total: Number(o.grand_total) || 0,
      createdAt: o.created_at,
      online: o.source === "ONLINE",
    })),
  };
}

export async function overviewAction(): Promise<BranchOverview[]> {
  await requireAdmin();
  return Promise.all([branchOverview(POS1, "", "/invoice"), branchOverview(POS2, "pos2_", "/pos2/invoice")]);
}

// ── Staff & memberships ───────────────────────────────────────────
type Result = { ok: true } | { ok: false; error: string };
const fail = (e: unknown): Result => ({ ok: false, error: e instanceof Error ? e.message : "Something went wrong." });

export async function listAccountsAction(): Promise<{ me: string; accounts: Account[] }> {
  const me = await requireAdmin();
  return { me: me.id, accounts: await listAccounts() };
}

export async function createAccountAction(input: {
  displayName: string;
  role: Role;
  branch: BranchId | null;
  password: string;
}): Promise<Result> {
  await requireAdmin();
  const pwError = validatePassword(input.password);
  if (pwError) return { ok: false, error: pwError };
  if (!input.displayName.trim()) return { ok: false, error: "Enter a name." };
  if (input.role === "staff" && input.branch !== "pos1" && input.branch !== "pos2") {
    return { ok: false, error: "Choose the branch this staff member works at." };
  }
  const branch = input.role === "staff" ? input.branch : null;
  // Login is by passcode alone, so it must be unique within the branch (or among admins).
  if (await passcodeInUse(input.role, branch, input.password)) {
    return { ok: false, error: "Someone else already uses that passcode here. Choose a different one." };
  }
  try {
    const id = await freeIdFrom(input.displayName, input.role === "admin" ? "admin" : "staff");
    await createAccount({ id, display_name: input.displayName, role: input.role, branch, password: input.password });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function changePasswordAction(id: string, password: string): Promise<Result> {
  await requireAdmin();
  const pwError = validatePassword(password);
  if (pwError) return { ok: false, error: pwError };
  const acc = (await listAccounts()).find((a) => a.id === normalizeId(id));
  if (!acc) return { ok: false, error: "Account not found." };
  if (await passcodeInUse(acc.role, acc.branch, password, acc.id)) {
    return { ok: false, error: "Someone else already uses that passcode here. Choose a different one." };
  }
  try {
    await setPassword(id, password);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteAccountAction(id: string): Promise<Result> {
  const me = await requireAdmin();
  const target = normalizeId(id);
  if (target === me.id) return { ok: false, error: "You can't remove the account you're signed in with." };
  const accounts = await listAccounts();
  const acc = accounts.find((a) => a.id === target);
  if (!acc) return { ok: false, error: "Account not found." };
  if (acc.role === "admin" && accounts.filter((a) => a.role === "admin").length <= 1) {
    return { ok: false, error: "Keep at least one admin account." };
  }
  try {
    await deleteAccount(target);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function adminLogoutAction() {
  const { endSession } = await import("@/lib/session");
  await endSession();
}
