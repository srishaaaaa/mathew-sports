"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Printer } from "lucide-react";
import type { ReceiptFormat } from "./advance-receipt";

const LABEL: Record<ReceiptFormat, string> = { a4: "A4", a5: "A5", thermal80: "Thermal 80 mm", thermal58: "Thermal 58 mm" };

/** Format switcher, copy link and print — hidden when printing. Auto-prints with ?print=1. */
export default function ReceiptToolbar({ format }: { format: ReceiptFormat }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("print") === "1") {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const go = (f: ReceiptFormat) => {
    const u = new URL(window.location.href);
    u.searchParams.set("format", f);
    u.searchParams.delete("print");
    window.location.assign(u.toString());
  };

  const copy = () => {
    const u = new URL(window.location.href);
    u.searchParams.delete("print");
    navigator.clipboard.writeText(u.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-[800px] flex flex-wrap justify-between items-center gap-3 mb-6 print:hidden font-sans">
      <div className="flex bg-white rounded-xl border border-black/10 p-1 shadow-sm">
        {(Object.keys(LABEL) as ReceiptFormat[]).map((f) => (
          <button
            key={f}
            onClick={() => go(f)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${format === f ? "bg-black text-white" : "text-black/60 hover:text-black"}`}
          >
            {LABEL[f]}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={copy} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-black/10 text-xs font-bold shadow-sm cursor-pointer">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Copied" : "Copy link"}
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--brand-primary)] text-[var(--brand-on-primary)] text-xs font-bold shadow-sm cursor-pointer">
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>
    </div>
  );
}
