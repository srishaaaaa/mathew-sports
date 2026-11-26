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

/** Split parts limited to the ticked modes. */
export const splitParts = (p: PayState): Partial<Record<PayMode, number>> =>
  Object.fromEntries(p.splitModes.map((m) => [m, p.split[m] || 0]));

export const splitTotal = (p: PayState) => round2(p.splitModes.reduce((t, m) => t + (p.split[m] || 0), 0));

/** Empty string when the payment is valid for `amount`, otherwise the problem. */
export function payStateError(p: PayState, amount: number): string {
  if (p.mode !== "SPLIT") return "";
  if (p.splitModes.length < 2) return "Pick at least two payment modes to split between.";
  const diff = round2(splitTotal(p) - amount);
  if (Math.abs(diff) > 0.01) {
    return diff < 0 ? `₹${Math.abs(diff).toFixed(2)} still to allocate.` : `₹${diff.toFixed(2)} more than the amount due.`;
  }
  return "";
}

const fmt = (v: number) => "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PaymentPicker({
  value,
  onChange,
  amount,
  label = "Payment mode",
}: {
  value: PayState;
  onChange: (next: PayState) => void;
  /** Amount this payment must cover (used to guide split amounts). */
  amount: number;
  label?: string;
}) {
  const set = (patch: Partial<PayState>) => onChange({ ...value, ...patch });
  const total = splitTotal(value);
  const remaining = round2(amount - total);

  const toggleSplitMode = (m: PayMode) => {
    const on = value.splitModes.includes(m);
    if (on && value.splitModes.length <= 2) return; // need at least two
    const splitModes = on ? value.splitModes.filter((x) => x !== m) : PAY_MODES.filter((x) => x === m || value.splitModes.includes(x));
    set({ splitModes, split: on ? { ...value.split, [m]: 0 } : value.split });
  };

  // Typing in one box auto-fills the last box with whatever is left.
  const setPart = (m: PayMode, v: number) => {
    const next = { ...value.split, [m]: v };
    const others = value.splitModes.filter((x) => x !== m);
    if (others.length === 1) {
      next[others[0]] = round2(Math.max(0, amount - v));
    }
    set({ split: next });
  };

  return (
    <div>
      <span className="block text-[10px] font-bold text-[var(--brand-text-muted)] uppercase tracking-wider mb-2">{label}</span>
      <div className="grid grid-cols-4 gap-1.5">
        {(["CASH", "GPAY", "CARD", "SPLIT"] as const).map((m) => {
          const active = value.mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => {
                if (m === "SPLIT" && value.mode !== "SPLIT") {
                  // start the split with the whole amount in the first box
                  const first = value.splitModes[0];
                  set({ mode: m, split: { CASH: 0, GPAY: 0, CARD: 0, [first]: round2(amount) } });
                } else set({ mode: m });
              }}
              className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                active
                  ? "bg-[var(--brand-primary)] text-[var(--brand-on-primary)] border-[var(--brand-primary)] shadow-sm"
                  : "bg-white text-black border-black/10 hover:border-black/25"
              }`}
            >
              {modeLabel(m)}
            </button>
          );
        })}
      </div>

      {value.mode === "SPLIT" && (
        <div className="mt-3 rounded-xl border border-[var(--brand-primary)]/30 bg-[var(--brand-tint)]/40 p-3 space-y-3 animate-in fade-in duration-200">
          <p className="text-[10px] font-bold uppercase tracking-wider text-black/60">Split between (pick 2 or 3)</p>
          <div className="grid grid-cols-3 gap-1.5">
            {PAY_MODES.map((m) => {
              const on = value.splitModes.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleSplitMode(m)}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold uppercase border cursor-pointer ${
                    on ? "border-[var(--brand-primary)] text-[var(--brand-primary-dark)] bg-white" : "border-black/10 text-black/40 bg-white/60"
                  }`}
                >
                  {on && <Check className="w-3 h-3" />} {modeLabel(m)}
                </button>
              );
            })}
          </div>
          <div className={`grid gap-2 ${value.splitModes.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {value.splitModes.map((m) => (
              <label key={m} className="block">
                <span className="block text-[10px] font-bold text-black/60 mb-1">{modeLabel(m)} (₹)</span>
                <input
                  type="number"
                  min={0}
                  value={value.split[m] || ""}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setPart(m, parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-white border border-black/10 rounded-lg px-2.5 py-2 text-sm font-bold focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </label>
            ))}
          </div>
          <div className="flex justify-between text-xs font-bold pt-1 border-t border-black/10">
            <span className="uppercase tracking-wider text-black/70">Total received</span>
            <span className={Math.abs(remaining) <= 0.01 ? "text-emerald-700" : "text-[var(--brand-primary-dark)]"}>{fmt(total)}</span>
          </div>
          {Math.abs(remaining) > 0.01 && (
            <p className="text-[10px] font-semibold text-[var(--brand-primary-dark)]">
              {remaining > 0 ? `${fmt(remaining)} still to allocate` : `${fmt(-remaining)} more than due`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
