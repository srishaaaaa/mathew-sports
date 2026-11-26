"use client";

import { X } from "lucide-react";
import { cgstSgst, describePayment, type PaymentMode } from "@/lib/payments";

export type DetailsOrder = {
  id: string;
  customerName: string;
  customerPhone: string;
  source: "ONLINE" | "OFFLINE";
  items: { name: string; desc?: string; price: number; qty: number }[];
  subtotal: number;
  discount: number;
  discountType?: "PERCENT" | "FIXED";
  discountValue?: number;
  deliveryFee: number;
  grandTotal: number;
  paymentMethod?: PaymentMode;
  splitCash?: number;
  splitGpay?: number;
  splitCard?: number;
  advanceOrderId?: string | null;
  date: string;
};

const inr = (v: number) => "₹" + (v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Order History → eye button: everything about one bill. */
export default function OrderDetailsModal({ order: o, onClose }: { order: DetailsOrder; onClose: () => void }) {
  const gstLine = o.items.find((i) => i.name.startsWith("GST ("));
  const products = o.items.filter((i) => !i.name.startsWith("GST ("));
  const gstAmount = gstLine ? gstLine.price * gstLine.qty : 0;
  const gstRate = gstLine ? parseFloat(gstLine.name.replace(/[^0-9.]/g, "")) || 0 : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-black/10 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-[#000000] tracking-tight">Order Details</h3>
            <p className="text-[11px] font-bold text-[var(--brand-primary-dark)] font-mono">#{o.id}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-black/5 hover:bg-black/10 rounded-lg cursor-pointer" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-5 mb-6">
            <Field label="Customer name">{o.customerName || "Guest"}</Field>
            <Field label="Phone number">{o.customerPhone || "N/A"}</Field>
            <Field label="Order source">{o.source}</Field>
            <Field label="Bill type">
              <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded ${gstLine ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary-dark)]" : "bg-black/5 text-[#111827]"}`}>
                {gstLine ? "GST Invoice" : "Non-GST Bill"}
              </span>
            </Field>
            <Field label="Date & time">{new Date(o.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</Field>
            <Field label="Payment">
              {describePayment({ mode: o.paymentMethod ?? "CASH", cash: o.splitCash ?? 0, gpay: o.splitGpay ?? 0, card: o.splitCard ?? 0 })}
            </Field>
            {o.advanceOrderId && <Field label="Advance order">{o.advanceOrderId}</Field>}
          </div>

          <div className="mb-4 text-[11px] font-bold text-[#000000] uppercase tracking-[0.1em] border-b border-black/10 pb-2">Order items</div>
          <div className="space-y-3 mb-8">
            {products.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-bold text-[#000000]">{item.name}</div>
                  {item.desc && <div className="text-[10px] text-[#000000] font-medium">{item.desc}</div>}
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[#000000]">{inr(item.price * item.qty)}</div>
                  <div className="text-[10px] text-[#000000] font-medium">{item.qty} x {inr(item.price)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-black/10 pt-4 space-y-2">
            <Row k="Subtotal" v={inr(o.subtotal)} />
            {o.discount > 0 && (
              <Row k={`Discount${o.discountType === "PERCENT" ? ` (${o.discountValue}%)` : ""}`} v={`-${inr(o.discount)}`} />
            )}
            {gstLine && (
              <>
                <Row k={`CGST (${gstRate / 2}%)`} v={inr(cgstSgst(gstRate, gstAmount).cgst)} />
                <Row k={`SGST (${gstRate / 2}%)`} v={inr(cgstSgst(gstRate, gstAmount).sgst)} />
              </>
            )}
            {o.deliveryFee > 0 && <Row k="Delivery fee" v={inr(o.deliveryFee)} />}
            <div className="flex justify-between text-lg pt-2 mt-2">
              <span className="text-[#000000] font-black uppercase tracking-tight">Total</span>
              <span className="text-[var(--brand-primary)] font-black">{inr(o.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[#000000] font-semibold">{k}</span>
      <span className="text-[#000000] font-bold">{v}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-[#000000] uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm font-semibold text-[#000000]">{children}</div>
    </div>
  );
}
