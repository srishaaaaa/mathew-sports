import type { Metadata, Viewport } from "next";
import { BRANCH } from "@/lib/branches/pos2";
import { getShopProfile } from "@/lib/shop";
import { resolveTheme, themeCss } from "@/lib/branches/types";

// Everything under /pos2 is Branch 2 (Vybe Girl): this overrides the root
// (Branch 1) metadata, theme and installed-app manifest.
const defaultTheme = resolveTheme(BRANCH);

// Titles follow this branch's Settings → Store details.
export async function generateMetadata(): Promise<Metadata> {
  const shop = await getShopProfile("pos2");
  return {
    title: `${shop.shopName} POS`,
    description: shop.tagline,
    applicationName: `${shop.shopName} POS`,
    manifest: "/pos2/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: shop.shopName,
      statusBarStyle: "black-translucent",
    },
    icons: {
      icon: BRANCH.icons.icon192,
      apple: BRANCH.icons.apple,
    },
  };
}

export const viewport: Viewport = {
  themeColor: defaultTheme.colors.primary,
};

export default function POS2Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* Branch 2 default theme; the saved Settings choice is applied on top. */}
      <style>{themeCss(defaultTheme)}</style>
      {children}
    </>
  );
}
