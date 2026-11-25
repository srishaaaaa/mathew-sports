import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/session";
import { getThemeId } from "@/lib/settings";
import { BRANCH as POS1 } from "@/lib/branches/pos1";
import { BRANCH as POS2 } from "@/lib/branches/pos2";
import { resolveTheme } from "@/lib/branches/types";
import LoginForm, { type LoginBranch } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · Matthew Sports & Vybe Girl",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; mode?: string }>;
}) {
  const session = await getSession();
  if (session) redirect(homeFor(session));

  const { branch, mode } = await searchParams;
  const [t1, t2] = await Promise.all([getThemeId("pos1"), getThemeId("pos2")]);

  const branches: LoginBranch[] = [
    { ...pick(POS1), colors: resolveTheme(POS1, t1).colors },
    { ...pick(POS2), colors: resolveTheme(POS2, t2).colors },
  ];

  return (
    <LoginForm
      branches={branches}
      initialBranch={branch === "pos2" ? "pos2" : "pos1"}
      initialMode={mode === "admin" ? "admin" : "staff"}
    />
  );
}

const pick = (b: typeof POS1) => ({
  id: b.id,
  shopName: b.shopName,
  tagline: b.tagline,
  address: b.address,
  logo: b.logoMark,
  logoBg: b.logoBackground,
});
