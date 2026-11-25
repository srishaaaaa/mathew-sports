import type { MetadataRoute } from "next";
import { resolveTheme, type BranchConfig } from "./types";

// Installed-app manifest for a branch: its own name, start page, colours and icons.
export function branchManifest(branch: BranchConfig): MetadataRoute.Manifest {
  const theme = resolveTheme(branch);
  return {
    name: `${branch.shopName} POS`,
    short_name: branch.shortName,
    description: `Billing terminal and order dashboard for ${branch.shopName}, ${branch.tagline}.`,
    id: branch.homePath,
    start_url: branch.homePath,
    // Scope "/" so login and invoices stay inside the installed app.
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: theme.colors.background,
    theme_color: theme.colors.primary,
    categories: ["business", "productivity", "shopping"],
    icons: [
      { src: branch.icons.icon192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: branch.icons.icon512, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: branch.icons.maskable512, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
