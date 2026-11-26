"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Loader2, MessageCircle, Plus, Printer, X } from "lucide-react";
import { balanceDue, describePayment, round2, type AdvanceItem, type AdvanceOrder } from "@/lib/payments";
import PaymentPicker, { initialPayState, payStateError, splitParts, type PayState } from "./payment-picker";
import { PrintSettingsModal, fmtDate, inr, shareOnWhatsApp, type AdvanceActions, type AdvanceBranch } from "./shared";

export type AdvanceCart = {
  customerName: string;
  customerPhone: string;
  source: "ONLINE" | "OFFLINE";
  items: AdvanceItem[];
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  isGst: boolean;
  gstPercentage: number;
  deliveryFee: number;
  // figures as shown on the billing panel
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  total: number;
};

/** "Save as Advance Order": takes a deposit for the current cart. */
export default function CreateAdvanceModal({
  cart,
  branch,
  actions,
  onClose,
  onSaved,
}: {
  cart: AdvanceCart;
  branch: AdvanceBranch;
  actions: AdvanceActions;
  onClose: () => void;
  /** Called once the order is stored (the terminal clears the cart). */
  onSaved: (order: AdvanceOrder) => void;
}) {
  const [deposit, setDeposit] = useState<number | "">("");
  const [pay, setPay] = useState<PayState>(initialPayState);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<AdvanceOrder | null>(null);
  const [printing, setPrinting] = useState(false);

  const amount = Number(deposit) || 0;
  const payError = payStateError(pay, amount);

  const confirm = async () => {
    setError("");
    if (amount <= 0) return setError("Enter the deposit amount.");
    if (amount > cart.total + 0.001) return setError("Deposit can't be more than the order total. Use Complete Sale for full payment.");
    if (payError) return setError(payError);
    setBusy(true);
    try {
      const order = await actions.create({
        customerName: cart.customerName,
        customerPhone: cart.customerPhone,
        source: cart.source,
        items: cart.items,
        discountType: cart.discountType,
        discountValue: cart.discountValue,
        isGst: cart.isGst,
        gstPercentage: cart.gstPercentage,
        deliveryFee: cart.deliveryFee,
        deposit: { mode: pay.mode, split: pay.mode === "SPLIT" ? splitParts(pay, amount) : undefined, amount },
        deliveryDate: deliveryDate || null,
        notes: notes || null,
      });
      setSaved(order);
      onSaved(order);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Could not save the advance order.");
    } finally {
      setBusy(false);
    }
  };

  const receiptUrl = saved ? `${branch.receiptBase}/${saved.id}` : "";

  const whatsapp = () => {
    if (!saved) return;
    shareOnWhatsApp(saved.customer_phone, [
      `✨ *${branch.shopName}* ✨`,
      "",
      `Advance order *${saved.id}* confirmed.`,
      `Order total: ${inr(saved.total_amount)}`,
      `Deposit paid: ${inr(saved.deposit_amount)} (${describePayment(saved.payments[0])})`,
      `*Balance due: ${inr(balanceDue(saved))}*`,
      saved.delivery_date ? `Delivery: ${fmtDate(saved.delivery_date)}` : "",
      "",
      `Receipt: ${window.location.origin}${receiptUrl}`,
    ].filter((l, i, a) => l !== "" || a[i - 1] !== ""));
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={saved ? onClose : undefined}>
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        {!saved ? (
          <>
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-black/5">
              <div>
                <h2 className="text-xl font-black tracking-tight">Save as Advance Order</h2>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand-primary-dark)] mt-0.5">Not counted as revenue until fully paid</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center cursor-pointer" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* What's being booked */}
              <div className="rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-tint)]/50 p-4 text-xs space-y-1.5">
                <Row k={`Subtotal (${cart.items.reduce((t, i) => t + i.qty, 0)} items)`} v={inr(cart.subtotal)} />
                {cart.discountAmount > 0 && (
                  <Row k={`Discount${cart.discountType === "PERCENT" ? ` (${cart.discountValue}%)` : ""}`} v={`− ${inr(cart.discountAmount)}`} />
                )}
                {cart.isGst && (
                  <>
                    <Row k={`CGST (${round2(cart.gstPercentage / 2)}%)`} v={inr(cart.gstAmount / 2)} />
                    <Row k={`SGST (${round2(cart.gstPercentage / 2)}%)`} v={inr(cart.gstAmount / 2)} />
                  </>
                )}
                {cart.deliveryFee > 0 && <Row k="Delivery" v={inr(cart.deliveryFee)} />}
                <div className="flex justify-between pt-2 mt-1 border-t border-black/10 text-sm font-black">
                  <span className="uppercase tracking-wider">Order total</span>
                  <span>{inr(cart.total)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-black/70 mb-1.5">Deposit amount (₹) *</label>
                <input
                  type="number"
                  autoFocus
                  value={deposit}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => {
                    const v = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0);
                    setDeposit(v);
                    // keep a split in step with the new deposit
                    if (pay.mode === "SPLIT") setPay({ ...pay, split: { CASH: 0, GPAY: 0, CARD: 0, [pay.splitModes[0]]: Number(v) || 0 } });
                  }}
                  placeholder="0.00"
                  className="w-full h-12 px-4 rounded-xl border-2 border-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] text-lg font-black outline-none"
                />
                {amount > 0 && amount <= cart.total && (
                  <p className="mt-1.5 text-xs font-bold text-black/60">
                    Balance due after deposit: <span className="text-[var(--brand-primary-dark)]">{inr(cart.total - amount)}</span>
                  </p>
                )}
              </div>

              <PaymentPicker value={pay} onChange={setPay} amount={amount} label="Deposit payment mode" />

              <label className="block">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-black/70 mb-1.5">Expected delivery date</span>
                <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-black/10 text-sm font-bold outline-none focus:border-[var(--brand-primary)]" />
              </label>

              <label className="block">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-black/70 mb-1.5">Notes (optional)</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Size preference, follow-up needed…" className="w-full px-3 py-2.5 rounded-xl border border-black/10 text-sm outline-none focus:border-[var(--brand-primary)] resize-none" />
              </label>

              {error && <p className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{error}</p>}

              <button
                onClick={confirm}
                disabled={busy}
                className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2 shadow-md disabled:opacity-60 cursor-pointer"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                Confirm advance order
              </button>
            </div>
          </>
        ) : (
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" /> Advance order saved
                </h2>
                <p className="mt-1 font-mono text-xs font-bold text-[var(--brand-primary-dark)]">#{saved.id}</p>
              </div>
              <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider">Deposit</span>
            </div>
            <div className="rounded-2xl border border-black/10 p-5 space-y-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-black/45">Advance receipt — {saved.customer_name}</p>
              <Row k="Order total" v={inr(saved.total_amount)} big />
              <Row k={`Deposit paid · ${describePayment(saved.payments[0])}`} v={inr(saved.deposit_amount)} green />
              <div className="flex justify-between items-center rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <span className="text-sm font-bold text-red-800">Balance due</span>
                <span className="text-xl font-black text-red-800">{inr(balanceDue(saved))}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setPrinting(true)} className="h-11 rounded-xl border border-black/15 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-black/5 cursor-pointer">
                <Printer className="w-4 h-4" /> Print
              </button>
              <button onClick={whatsapp} className="h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>
              <button onClick={onClose} className="h-11 rounded-xl bg-black text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer">
                <Plus className="w-4 h-4" /> New sale
              </button>
            </div>
          </div>
        )}
      </div>
      {printing && saved && <PrintSettingsModal url={receiptUrl} onClose={() => setPrinting(false)} />}
    </div>
  );
}

function Row({ k, v, big, green }: { k: string; v: string; big?: boolean; green?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className={`${big ? "text-sm" : "text-xs"} font-semibold text-black/70`}>{k}</span>
      <span className={`${big ? "text-lg" : "text-xs"} font-black ${green ? "text-emerald-700" : ""}`}>{v}</span>
    </div>
  );
}
