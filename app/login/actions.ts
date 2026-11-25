"use server";

import { findByPasscode } from "@/lib/accounts";
import { startSession, homeFor } from "@/lib/session";
import type { BranchId } from "@/lib/branches/types";

export type LoginInput =
  | { mode: "staff"; branch: BranchId; passcode: string }
  | { mode: "admin"; passcode: string };

export type LoginResult = { ok: true; redirect: string } | { ok: false; error: string };

const fail = async (error: string): Promise<LoginResult> => {
  // Slow down passcode guessing a little.
  await new Promise((r) => setTimeout(r, 600));
  return { ok: false, error };
};

export async function loginAction(input: LoginInput): Promise<LoginResult> {
  const passcode = input.passcode.trim();
  if (!passcode) return { ok: false, error: "Enter your passcode." };

  if (input.mode === "admin") {
    const admin = await findByPasscode("admin", null, passcode);
    if (!admin) return fail("Incorrect admin passcode.");
    await startSession(admin);
    return { ok: true, redirect: "/admin" };
  }

  // Staff of the chosen branch — or an admin, who may open either terminal.
  const staff = await findByPasscode("staff", input.branch, passcode);
  if (staff) {
    await startSession(staff);
    return { ok: true, redirect: homeFor(staff) };
  }
  const admin = await findByPasscode("admin", null, passcode);
  if (admin) {
    await startSession(admin);
    return { ok: true, redirect: input.branch === "pos2" ? "/pos2" : "/pos1" };
  }
  return fail("Incorrect passcode for this branch.");
}
