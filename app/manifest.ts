import type { MetadataRoute } from "next";
import { BRANCH } from "@/lib/branches/pos1";
import { branchManifest } from "@/lib/branches/manifest";

// Served at /manifest.webmanifest — Branch 1 (Matthew Sports).
// Branch 2 has its own at /pos2/manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return branchManifest(BRANCH);
}
