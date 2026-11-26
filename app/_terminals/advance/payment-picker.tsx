"use client";

import { Check } from "lucide-react";
import { PAY_MODES, modeLabel, round2, type PayMode, type PaymentMode } from "@/lib/payments";

export type PayState = {
  mode: PaymentMode;
  /** Modes ticked for a split payment (2 or 3). */
  splitModes: PayMode[];
  split: Record<PayMode, number>;
};

export const initialPayState = (): PayState => ({
  mode: "CASH",
  splitModes: ["CASH", "GPAY"],
  split: { CASH: 0, GPAY: 0, CARD: 0 },
});

export const splitTotal = (p: PayState) => round2(p.splitModes.reduce((t, m) => t + (p.split[m] || 0), 0));

/**
 * The split parts actually kept for `amount`. If more was handed over than
 * was due, the change is returned out of the cash part.
 */
export function splitParts(p: PayState, amount: number): Partial<Record<PayMode, number>> {
  const parts: Partial<Record<PayMode, number>> = Object.fromEntries(p.splitModes.map((m) => [m, p.split[m] || 0]));
  const change = round2(splitTotal(p) - amount);
  if (change > 0 && parts.CASH !== undefined) parts.CASH = round2(Math.max(0, parts.CASH - change));
  return parts;
}

/** Empty string when the payment is valid for `amount`, otherwise the problem. */
export function payStateError(p: PayState, amount: number): string {
  if (p.mode !== "SPLIT") return "";
  if (p.splitModes.length < 2) return "Pick at least two payment modes to split between.";
  const diff = round2(splitTotal(p) - amount);
  if (diff < -0.01) return `₹${Math.abs(diff).toFixed(2)} balance remaining.`;
  if (diff > 0.01 && diff > (p.splitModes.includes("CASH") ? p.split.CASH || 0 : 0) + 0.01) {
    return "Change can only be returned from the cash part — reduce the UPI/card amount.";
  }
  return "";
}

const fmt = (v: number) => "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Cash / QR-GPay / Card / Split selector (IGMOLS "Financial Option").
 * part="buttons" renders only the mode buttons, part="split" only the split
 * box, so a screen can place them separately.
 */
export default function PaymentPicker({
  value,
  onChange,
  amount,
  label = "Financial option",
  part = "all",
}: {
  value: PayState;
  onChange: (next: PayState) => void;
  amount: number;
  label?: string;
  part?: "all" | "buttons" | "split";
}) {
  const set = (patch: Partial<PayState>) => onChange({ ...value, ...patch });
  const total = splitTotal(value);

  const toggleSplitMode = (m: PayMode) => {
    const on = value.splitModes.includes(m);
    if (on && value.splitModes.length <= 2) return; // a split always needs at least two
    const splitModes = on ? value.splitModes.filter((x) => x !== m) : PAY_MODES.filter((x) => x === m || value.splitModes.includes(x));
    set({ splitModes, split: on ? { ...value.split, [m]: 0 } : value.split });
  };

  // Typing in one box fills the other (when splitting two ways) with what's left.
  const setPart = (m: PayMode, v: number) => {
    const next = { ...value.split, [m]: v };
    const others = value.splitModes.filter((x) => x !== m);
    if (others.length === 1) next[others[0]] = round2(Math.max(0, amount - v));
    set({ split: next });
  };

  const buttons = (
    <div className="space-y-1.5">
      <span className="block text-[9px] font-bold text-[#000000] uppercase tracking-wider">{label}</span>
      <div className="grid grid-cols-4 gap-1.5">
        {(["CASH", "GPAY", "CARD", "SPLIT"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              if (m === "SPLIT" && value.mode !== "SPLIT") {
                const first = value.splitModes[0];
                set({ mode: m, split: { CASH: 0, GPAY: 0, CARD: 0, [first]: round2(amount) } });
              } else set({ mode: m });
            }}
            className={`py-1.5 px-1 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer border ${
              value.mode === m
                ? "bg-[var(--brand-primary)] text-[var(--brand-on-primary)] border-[var(--brand-primary)] shadow-sm"
                : "bg-white text-[#000000] border-black/10 hover:border-[var(--brand-primary)]"
            }`}
          >
            {modeLabel(m)}
          </button>
        ))}
      </div>
    </div>
  );

  const splitBox = value.mode === "SPLIT" && (
    <div className="bg-[#FFFFFF]/40 border border-black/10 rounded-xl p-4 mt-2 space-y-3 animate-in fade-in duration-200">
      <div>
        <span className="block text-[9px] font-bold text-[#000000] uppercase tracking-wider mb-1.5">Split between (pick 2 or 3)</span>
        <div className="grid grid-cols-3 gap-1.5">
          {PAY_MODES.map((m) => {
            const on = value.splitModes.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleSplitMode(m)}
                aria-pressed={on}
                className={`py-1.5 px-1 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer border flex items-center justify-center gap-1 ${
                  on
                    ? "bg-[var(--brand-tint)] text-[var(--brand-primary-dark)] border-[var(--brand-primary)]"
                    : "bg-white text-[#000000]/50 border-black/10 hover:border-[var(--brand-primary)]"
                }`}
              >
                {on && <Check className="w-3 h-3" />}
                {modeLabel(m)}
              </button>
            );
          })}
        </div>
      </div>
      <div className={`grid gap-2 ${value.splitModes.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {value.splitModes.map((m) => (
          <div key={m}>
            <label className="block text-[10px] font-bold text-[#000000] mb-1.5">{modeLabel(m)} (₹)</label>
            <input
              type="number"
              min={0}
              value={value.split[m] || ""}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => setPart(m, parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full bg-white border border-black/10 focus:border-[var(--brand-primary)] rounded-lg px-3 py-2 text-base font-bold text-[#000000] placeholder:text-[#000000]/40 focus:outline-none transition-colors"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center text-xs pt-1 border-t border-black/10">
        <span className="font-bold text-[#000000] uppercase tracking-[0.05em]">Total received</span>
        <span className="font-black text-sm text-[var(--brand-primary)]">{fmt(total)}</span>
      </div>
      {total < amount - 0.001 ? (
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-[#000000] uppercase tracking-[0.05em]">Balance remaining</span>
          <span className="font-black text-sm text-[#DC2626]">{fmt(amount - total)}</span>
        </div>
      ) : (
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-[#000000] uppercase tracking-[0.05em]">Change to return</span>
          <span className="font-black text-sm text-[#00A86B]">{fmt(total - amount)}</span>
        </div>
      )}
    </div>
  );

  if (part === "buttons") return buttons;
  if (part === "split") return <>{splitBox}</>;
  return (
    <div>
      {buttons}
      {splitBox}
    </div>
  );
}
