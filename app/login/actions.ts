"use server";

import { checkCredentials } from "@/lib/accounts";
import { startSession, homeFor } from "@/lib/session";
import type { BranchId } from "@/lib/branches/types";

export type LoginInput =
  | { mode: "staff"; branch: BranchId; id: string; password: string }
  | { mode: "admin"; id: string; password: string };

export type LoginResult = { ok: true; redirect: string } | { ok: false; error: string };

const fail = async (error: string): Promise<LoginResult> => {
  // Slow down password guessing a little.
  await new Promise((r) => setTimeout(r, 600));
  return { ok: false, error };
};

export async function loginAction(input: LoginInput): Promise<LoginResult> {
  if (!input.id.trim() || !input.password) return { ok: false, error: "Enter your ID and password." };

  const account = await checkCredentials(input.id, input.password);
  if (!account) return fail("Incorrect ID or password.");

  if (input.mode === "admin") {
    if (account.role !== "admin") return fail("This account isn't an admin. Use Staff POS Login.");
    await startSession(account);
    return { ok: true, redirect: "/admin" };
  }

  // Staff login: the account must belong to the chosen branch (admins may open any branch).
  if (account.role === "staff" && account.branch !== input.branch) {
    return fail("This staff ID belongs to the other branch.");
  }
  await startSession(account);
  return { ok: true, redirect: account.role === "admin" ? (input.branch === "pos2" ? "/pos2" : "/pos1") : homeFor(account) };
}
