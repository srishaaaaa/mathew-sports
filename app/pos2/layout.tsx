import type { Metadata, Viewport } from "next";
import { BRANCH } from "@/lib/branches/pos2";
import { resolveTheme, themeCss } from "@/lib/branches/types";

// Everything under /pos2 is Branch 2 (Vybe Girl): this overrides the root
// (Branch 1) metadata, theme and installed-app manifest.
const defaultTheme = resolveTheme(BRANCH);

export const metadata: Metadata = {
  title: `${BRANCH.shopName} POS`,
  description: BRANCH.tagline,
  applicationName: `${BRANCH.shopName} POS`,
  manifest: "/pos2/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: BRANCH.shortName,
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: BRANCH.icons.icon192,
    apple: BRANCH.icons.apple,
  },
};

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
