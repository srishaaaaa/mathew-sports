import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canUseBranch, getSession, homeFor } from "@/lib/session";
import { getThemeId } from "@/lib/settings";
import { getShopProfile, type ShopProfile } from "@/lib/shop";
import { BRANCH as POS1 } from "@/lib/branches/pos1";
import { BRANCH as POS2 } from "@/lib/branches/pos2";
import { resolveTheme } from "@/lib/branches/types";
import LoginForm, { type LoginBranch } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const [a, b] = await Promise.all([getShopProfile("pos1"), getShopProfile("pos2")]);
  return { title: `Sign in · ${a.shopName} & ${b.shopName}` };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; mode?: string }>;
}) {
  const [session, { branch, mode }] = await Promise.all([getSession(), searchParams]);

  // Already signed in:
  //  - plain /login → straight to your own home;
  //  - asked for a branch (or admin) you can already open → go there;
  //  - asked for a branch you can't open (e.g. Matthew Sports staff opening
  //    Vybe Girl) → show the login form so you can switch accounts.
  if (session) {
    const wanted = branch === "pos1" || branch === "pos2" ? branch : null;
    if (!wanted && mode !== "admin") redirect(homeFor(session));
    if (wanted && canUseBranch(session, wanted)) redirect(wanted === "pos2" ? "/pos2" : "/pos1");
    if (mode === "admin" && session.role === "admin") redirect("/admin");
  }
  const [t1, t2, s1, s2] = await Promise.all([getThemeId("pos1"), getThemeId("pos2"), getShopProfile("pos1"), getShopProfile("pos2")]);

  const branches: LoginBranch[] = [
    { ...pick("pos1", s1), colors: resolveTheme(POS1, t1).colors },
    { ...pick("pos2", s2), colors: resolveTheme(POS2, t2).colors },
  ];

  return (
    <LoginForm
      branches={branches}
      initialBranch={branch === "pos2" ? "pos2" : "pos1"}
      initialMode={mode === "admin" ? "admin" : "staff"}
    />
  );
}

// Each branch as saved in its Settings → Store details.
const pick = (id: "pos1" | "pos2", p: ShopProfile) => ({
  id,
  shopName: p.shopName,
  tagline: p.tagline,
  address: p.address,
  logo: p.logoMark,
  logoBg: p.logoBackground,
});
