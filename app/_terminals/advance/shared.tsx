"use client";

import { useState } from "react";
import { Printer, X } from "lucide-react";
import type { AdvanceOrder } from "@/lib/payments";
import type { CreateAdvanceInput, FinalizeInput } from "@/lib/advance";

/** Server actions a terminal hands to the advance-order screens (bound to its branch). */
export type AdvanceActions = {
  list: () => Promise<AdvanceOrder[]>;
  create: (input: CreateAdvanceInput) => Promise<AdvanceOrder>;
  setStatus: (id: string, status: "PENDING" | "READY") => Promise<void>;
  finalize: (id: string, input: FinalizeInput) => Promise<{ orderId: string; amountCollected: number }>;
  cancel: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

export type AdvanceBranch = {
  shopName: string;
  /** e.g. "/advance" or "/pos2/advance" */
  receiptBase: string;
  /** e.g. "/invoice" or "/pos2/invoice" */
  invoiceBase: string;
};

export const inr = (v: number) => "₹" + (v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtDate = (iso: string | null) =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export type PrintFormat = "thermal58" | "thermal80" | "a4" | "a5";

function Opt({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer ${
        active ? "border-[var(--brand-primary)] bg-[var(--brand-tint)] text-[var(--brand-primary-dark)]" : "border-black/10 text-black/60 hover:border-black/25"
      }`}
    >
      {children}
    </button>
  );
}

/** Printer choice → opens the receipt in that format and prints it. */
export function PrintSettingsModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [kind, setKind] = useState<"thermal" | "sheet">(() =>
    typeof window !== "undefined" && localStorage.getItem("print_kind") === "sheet" ? "sheet" : "thermal",
  );
  const [size, setSize] = useState<PrintFormat>(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem("print_format") as PrintFormat | null) : null;
    return saved ?? "thermal80";
  });
  const effective: PrintFormat = kind === "thermal" ? (size === "thermal58" ? "thermal58" : "thermal80") : size === "a5" ? "a5" : "a4";

  const print = () => {
    localStorage.setItem("print_kind", kind);
    localStorage.setItem("print_format", effective);
    window.open(`${url}${url.includes("?") ? "&" : "?"}format=${effective}&print=1`, "_blank");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 bg-[#141414] text-white">
          <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
            <Printer className="w-4 h-4" /> Print settings
          </p>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider mb-2">Printer type</p>
            <div className="flex gap-3">
              <Opt active={kind === "thermal"} onClick={() => { setKind("thermal"); setSize("thermal80"); }}>Thermal roll</Opt>
              <Opt active={kind === "sheet"} onClick={() => { setKind("sheet"); setSize("a4"); }}>Sheet (A4/A5)</Opt>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider mb-2">Paper size</p>
            <div className="flex gap-3">
              {kind === "thermal" ? (
                <>
                  <Opt active={effective === "thermal58"} onClick={() => setSize("thermal58")}>58 mm</Opt>
                  <Opt active={effective === "thermal80"} onClick={() => setSize("thermal80")}>80 mm</Opt>
                </>
              ) : (
                <>
                  <Opt active={effective === "a4"} onClick={() => setSize("a4")}>A4</Opt>
                  <Opt active={effective === "a5"} onClick={() => setSize("a5")}>A5</Opt>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-black/5 bg-black/[0.02]">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-black/60 hover:bg-black/5 cursor-pointer">
            Cancel
          </button>
          <button
            onClick={print}
            className="px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-[var(--brand-on-primary)] text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print now
          </button>
        </div>
      </div>
    </div>
  );
}

/** Opens WhatsApp with a short receipt message and link. */
export function shareOnWhatsApp(phone: string, lines: string[]) {
  const clean = phone.replace(/\D/g, "").slice(-10);
  if (clean.length !== 10) {
    alert("This customer has no valid 10-digit mobile number.");
    return;
  }
  const url = `https://api.whatsapp.com/send/?phone=91${clean}&text=${encodeURIComponent(lines.join("\n"))}`;
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) window.location.href = url;
  else window.open(url, "_blank");
}
