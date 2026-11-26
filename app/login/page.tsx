import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/session";
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
  const session = await getSession();
  if (session) redirect(homeFor(session));

  const { branch, mode } = await searchParams;
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
