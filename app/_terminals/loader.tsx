"use client";

import dynamic from "next/dynamic";
import type { BranchId } from "@/lib/branches/types";
import type { TerminalProps } from "./pos1-terminal";

// The terminals are large, browser-only screens: load them client-side.
const Splash = () => <div className="min-h-screen bg-[var(--brand-bg)]" />;

const POS1 = dynamic(() => import("./pos1-terminal"), { ssr: false, loading: Splash });
const POS2 = dynamic(() => import("./pos2-terminal"), { ssr: false, loading: Splash });

export default function TerminalLoader({ branch, ...props }: TerminalProps & { branch: BranchId }) {
  return branch === "pos2" ? <POS2 {...props} /> : <POS1 {...props} />;
}
