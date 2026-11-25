import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "./service-worker-register";
import { BRANCH } from "@/lib/branches/pos1";
import { resolveTheme, themeCss } from "@/lib/branches/types";

// The root layout is Branch 1 (Matthew Sports). Branch 2 overrides all of
// this in app/pos2/layout.tsx.
const defaultTheme = resolveTheme(BRANCH);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${BRANCH.shopName} POS`,
  description: BRANCH.tagline,
  applicationName: `${BRANCH.shopName} POS`,
  // iOS ignores the web manifest, so the standalone behaviour and home-screen
  // title have to be declared separately here.
  appleWebApp: {
    capable: true,
    title: BRANCH.shortName,
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: BRANCH.icons.icon192,
    apple: BRANCH.icons.apple,
  },
  formatDetection: {
    // Stops iOS turning invoice numbers and totals into tappable phone links.
    telephone: false,
  },
  other: {
    // Next emits the standard `mobile-web-app-capable`; iOS versions before 17
    // only honour Apple's legacy name, so declare it too for older shop phones.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: defaultTheme.colors.primary,
  width: "device-width",
  initialScale: 1,
  // The POS has small numeric inputs; leave pinch-zoom available.
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Branch 1 default theme; the saved Settings choice is applied on top. */}
        <style>{themeCss(defaultTheme)}</style>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
