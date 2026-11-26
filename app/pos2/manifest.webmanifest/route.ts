import { BRANCH } from "@/lib/branches/pos2";
import { branchManifest } from "@/lib/branches/manifest";
import { getShopProfile } from "@/lib/shop";

// Web app manifest for Branch 2 (Vybe Girl), served at /pos2/manifest.webmanifest.
// Separate from app/manifest.ts so an installed POS 2 opens /pos2 — never POS 1.
export async function GET() {
  return Response.json(branchManifest(BRANCH, await getShopProfile("pos2")), {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
