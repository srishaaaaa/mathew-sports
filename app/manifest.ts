import type { MetadataRoute } from "next";
import { BRANCH } from "@/lib/branches/pos1";
import { branchManifest } from "@/lib/branches/manifest";
import { getShopProfile } from "@/lib/shop";

// Served at /manifest.webmanifest — Branch 1 (Matthew Sports).
// Branch 2 has its own at /pos2/manifest.webmanifest.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  return branchManifest(BRANCH, await getShopProfile("pos1"));
}
