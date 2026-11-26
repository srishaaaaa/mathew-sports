"use client";

import { useState } from "react";
import { Check, Eye, Plus, Printer, Send } from "lucide-react";
import { modeLabel, type PaymentMode } from "@/lib/payments";

export type GeneratedBill = {
  id: string;
  isGst: boolean;
  paymentMethod: PaymentMode;
  grandTotal: number;
  /** What the customer handed over (cash tendered, or the split total). */
  amountReceived: number;
  split?: { cash: number; gpay: number; card: number };
  items: { name: string; qty: number; price: number }[];
  customerPhone: string;
};

const inr = (v: number) => "₹" + (v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const WhatsAppIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.012c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

/** "Bill Generated" — shown after Complete Sale. */
export default function BillGeneratedModal({
  bill,
  onPrint,
  onView,
  onWhatsApp,
  onNewSale,
  note,
  newSaleLabel = "New sale",
}: {
  bill: GeneratedBill;
  onPrint: () => void;
  onView: () => void;
  /** Sends the invoice to this 10-digit number. */
  onWhatsApp: (phone: string) => void;
  onNewSale: () => void;
  /** Extra line under the receipt (e.g. advance already paid). */
  note?: string;
  newSaleLabel?: string;
}) {
  const [askPhone, setAskPhone] = useState(false);
  const [phone, setPhone] = useState(bill.customerPhone || "");
  const balance = Math.max(0, bill.amountReceived - bill.grandTotal);
  const hasPhone = /^\d{10}$/.test(bill.customerPhone || "");

  const whatsapp = () => {
    if (hasPhone) onWhatsApp(bill.customerPhone);
    else setAskPhone(true);
  };

  const splitParts = bill.split
    ? [
        bill.split.cash ? `Cash ${inr(bill.split.cash)}` : "",
        bill.split.gpay ? `UPI ${inr(bill.split.gpay)}` : "",
        bill.split.card ? `Card ${inr(bill.split.card)}` : "",
      ].filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[740px] max-h-[92vh] overflow-y-auto p-6 sm:p-8 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-black/10">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-[28px] font-black text-black tracking-tight leading-none">Bill Generated</h2>
              <span className="px-2.5 py-1 rounded-md bg-black/[0.06] text-[10px] font-black uppercase tracking-wider text-black">
                {bill.isGst ? "GST" : "Non-GST"}
              </span>
            </div>
            <p className="mt-2 font-mono text-xs font-bold text-[var(--brand-primary-dark)]">#{bill.id}</p>
          </div>
          <button onClick={onNewSale} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-black text-white text-[11px] font-black uppercase tracking-wider cursor-pointer hover:bg-black/85">
            {newSaleLabel === "New sale" ? <Plus className="w-4 h-4" /> : <Check className="w-4 h-4" />} {newSaleLabel}
          </button>
        </div>

        {/* Payment receipt */}
        <div className="mt-5 rounded-2xl border border-black/10 p-6">
          <div className="flex items-center justify-between pb-3 border-b border-black/5">
            <p className="text-[11px] font-black uppercase tracking-[0.15em] text-black/45">Payment receipt</p>
            <span className="px-2.5 py-1 rounded-md bg-[var(--brand-tint)] text-[10px] font-black uppercase tracking-wider text-[var(--brand-primary-dark)]">
              {modeLabel(bill.paymentMethod)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-4">
            <span className="text-sm font-semibold text-black/70">Grand Total</span>
            <span className="text-2xl font-black text-black">{inr(bill.grandTotal)}</span>
          </div>
          <div className="flex justify-between items-center mt-3">
            <span className="text-sm font-semibold text-black/70">Amount Received</span>
            <span className="text-lg font-black text-black">{inr(bill.amountReceived)}</span>
          </div>
          {splitParts.length > 0 && <p className="text-right text-[11px] font-semibold text-black/45 mt-0.5">{splitParts.join(" + ")}</p>}
          <div className="flex justify-between items-center mt-4 rounded-xl bg-black/[0.04] border border-black/10 px-4 py-5">
            <span className="text-sm font-bold text-[#991B1B]">Balance Returned</span>
            <span className="text-2xl font-black text-[#991B1B]">{inr(balance)}</span>
          </div>
          {note && <p className="mt-3 text-xs font-semibold text-black/55">{note}</p>}
        </div>

        {/* Actions */}
        <div className="grid sm:grid-cols-3 gap-3 mt-5">
          <button onClick={onPrint} className="h-11 rounded-xl border border-black/15 bg-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-black/[0.03] cursor-pointer">
            <Printer className="w-4 h-4 text-[var(--brand-primary-dark)]" /> Print receipt
          </button>
          <button onClick={onView} className="h-11 rounded-xl border border-black/15 bg-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-black/[0.03] cursor-pointer">
            <Eye className="w-4 h-4 text-[var(--brand-primary-dark)]" /> View
          </button>
          <button onClick={whatsapp} className="h-11 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer">
            <WhatsAppIcon /> WhatsApp invoice
          </button>
          <button onClick={onNewSale} className="h-11 rounded-xl bg-black hover:bg-black/85 text-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer">
            {newSaleLabel === "New sale" ? <Plus className="w-4 h-4" /> : <Check className="w-4 h-4" />} {newSaleLabel}
          </button>
        </div>

        {askPhone && (
          <div className="mt-4 flex gap-2 items-center rounded-xl border border-[#10B981]/40 bg-[#10B981]/5 p-3 animate-in fade-in duration-150">
            <span className="text-sm font-bold text-black/60 pl-1">+91</span>
            <input
              autoFocus
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="Customer's 10-digit WhatsApp number"
              className="flex-1 h-10 px-3 rounded-lg border border-black/10 text-sm font-bold outline-none focus:border-[#10B981] bg-white"
            />
            <button
              onClick={() => /^\d{10}$/.test(phone) && onWhatsApp(phone)}
              disabled={!/^\d{10}$/.test(phone)}
              className="h-10 px-4 rounded-lg bg-[#10B981] text-white text-xs font-black uppercase flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" /> Send
            </button>
          </div>
        )}

        {/* Items sold */}
        <div className="mt-5 rounded-2xl border border-black/10 p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.15em] text-black/45 pb-3 border-b border-black/5">Items sold</p>
          <div className="mt-3 space-y-2.5">
            {bill.items.map((i, k) => (
              <div key={k} className="flex justify-between items-center text-sm">
                <span className="font-semibold text-black">
                  {i.name} <span className="text-[11px] font-semibold text-black/40">× {i.qty} {i.qty === 1 ? "piece" : "pieces"}</span>
                </span>
                <span className="font-bold text-black">{inr(i.price * i.qty)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
