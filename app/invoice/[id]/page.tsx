import { getOrder } from "@/lib/db";
import { notFound } from "next/navigation";
import { MapPin, Phone, Mail, Store, AtSign } from "lucide-react";
import InvoiceActions from "./invoice-actions";
import type { Metadata } from "next";
import { BRANCH } from "@/lib/branches/pos1";
import { resolveTheme, themeCss } from "@/lib/branches/types";
import { getThemeId } from "@/lib/settings";
import { getShopProfile } from "@/lib/shop";
import { describePayment } from "@/lib/payments";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Invoice - ${id} · ${(await getShopProfile("pos1")).shopName}`,
  };
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, savedThemeId, shop] = await Promise.all([getOrder(id), getThemeId("pos1"), getShopProfile("pos1")]);
  const theme = resolveTheme(BRANCH, savedThemeId);

  if (!order) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] text-[#000000] font-sans py-12 px-4 print:p-0 print:bg-white flex flex-col items-center">
      <style>{`
        @media print {
          @page {
            margin: 10mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* Top Navigation / Action Bar (Hidden when printing) */}
      <InvoiceActions />

      {/* This branch's saved theme (Settings → Theme). */}
      <style>{themeCss(theme)}</style>

      {/* The Invoice Document */}
      <div className="w-full max-w-3xl bg-white border border-[var(--brand-border)] rounded-2xl shadow-xl print:shadow-none print:border-none print:rounded-none overflow-hidden">
        {/* Header Section */}
        <div className="bg-[var(--brand-surface)] border-b border-[var(--brand-border)] p-8 sm:p-12 print:p-6 flex flex-col items-center text-center">
          <div
            className="h-24 w-full max-w-[280px] rounded-2xl overflow-hidden flex items-center justify-center mb-4 print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]"
            style={{ backgroundColor: shop.logoBackground }}
          >
            <img
              src={shop.logo}
              alt={`${shop.shopName} Logo`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-black text-[var(--brand-primary)] tracking-tight">
            {shop.shopName}
          </h1>
          {shop.ownerName && (
            <p className="text-sm text-[var(--brand-text-soft)] font-semibold mt-1">
              {shop.ownerName}
            </p>
          )}
          <p className="mt-2 text-sm font-black tracking-[0.2em] text-[var(--brand-primary-dark)] uppercase">
            {order.order_items.some((i) => i.snapshot_name.startsWith("GST (")) ? "Tax Invoice" : "Invoice"}
          </p>
          <p className="text-xs text-[var(--brand-text-muted)] font-bold tracking-wider mt-0.5 mb-4">
            NO: {order.id}
            {order.advance_order_id && <> · ADVANCE ORDER {order.advance_order_id}</>}
          </p>

          <div className="flex flex-col items-center gap-2 text-sm text-[var(--brand-text-soft)] font-semibold">
            {shop.address && (
              <div className="text-center max-w-md leading-relaxed">
                <span className="inline-block text-[var(--brand-primary)] mr-1.5 align-middle -mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                </span>
                <span>{shop.address}</span>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
              {shop.shopPhone && (
                <span className="flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                  {shop.shopPhone}
                </span>
              )}
              {shop.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                  {shop.phone}
                </span>
              )}
              {shop.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                  {shop.email}
                </span>
              )}
              {shop.instagram && (
                <span className="flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                  {shop.instagram}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Meta Data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 p-8 sm:p-12 print:p-6 border-b border-[var(--brand-border)]/50">
          <div>
            <h3 className="text-[10px] font-bold text-[var(--brand-text-muted)] uppercase tracking-[0.2em] mb-3">
              Billed To
            </h3>
            <p className="text-base font-bold text-[var(--brand-primary)]">
              {order.customer_name || "Guest Customer"}
            </p>
            {order.customer_phone && order.customer_phone.split('_')[0] && (
              <p className="text-sm text-[var(--brand-text-soft)] font-semibold mt-1">
                +91 {order.customer_phone.split('_')[0]}
              </p>
            )}
          </div>
          <div className="sm:text-right flex flex-col sm:items-end">
            <h3 className="text-[10px] font-bold text-[var(--brand-text-muted)] uppercase tracking-[0.2em] mb-3 self-start sm:self-auto">
              Order Details
            </h3>
            <div className="inline-block text-left text-sm space-y-1">
              <div className="flex gap-2">
                <span className="text-[var(--brand-text-muted)] font-bold w-12 text-left sm:text-right">
                  Date:
                </span>
                <span className="text-[#000000] font-black">
                  {new Date(order.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-[var(--brand-text-muted)] font-bold w-12 text-left sm:text-right">
                  Time:
                </span>
                <span className="text-[#000000] font-black">
                  {new Date(order.created_at).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-[var(--brand-text-muted)] font-bold w-12 text-left sm:text-right">
                  Type:
                </span>
                <span className="text-[#000000] font-black uppercase">
                  {order.source} SALE
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-[var(--brand-text-muted)] font-bold w-12 text-left sm:text-right">
                  Pay:
                </span>
                <span className="text-[#000000] font-black uppercase">
                  {order.customer_phone?.includes("_")
                    ? order.customer_phone.split("_")[1]
                    : "CASH"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="p-8 sm:p-12 print:py-4 print:px-6">
          <div className="w-full overflow-x-auto scrollbar-thin pb-2">
            <table className="w-full text-left border-collapse min-w-[400px]">
              <thead>
                <tr className="border-b-2 border-[var(--brand-border)]">
                  <th className="py-4 text-[11px] font-bold text-[var(--brand-text-muted)] uppercase tracking-wider">
                    Item Description
                  </th>
                  <th className="py-4 text-[11px] font-bold text-[var(--brand-text-muted)] uppercase tracking-wider text-center">
                    Qty
                  </th>
                  <th className="py-4 text-[11px] font-bold text-[var(--brand-text-muted)] uppercase tracking-wider text-right">
                    Price
                  </th>
                  <th className="py-4 text-[11px] font-bold text-[var(--brand-text-muted)] uppercase tracking-wider text-right">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-border)]/40">
                {order.order_items
                  .filter((i) => !i.snapshot_name.startsWith("GST ("))
                  .map((item, index) => (
                    <tr key={index} className="group">
                      <td className="py-6 pr-4 print:py-3">
                        <p className="text-sm font-bold text-[var(--brand-primary)]">
                          {item.snapshot_name}
                        </p>
                      </td>
                      <td className="py-6 px-4 print:py-3 text-center text-sm font-bold text-[var(--brand-text-soft)]">
                        {item.quantity}
                      </td>
                      <td className="py-6 pl-4 print:py-3 text-right text-sm font-bold text-[var(--brand-text-soft)]">
                        ₹
                        {item.snapshot_price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-6 pl-4 print:py-3 text-right text-sm font-black text-[var(--brand-primary)]">
                        ₹
                        {(item.snapshot_price * item.quantity).toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2 },
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Section */}
        <div className="bg-[var(--brand-surface)] border-t border-[var(--brand-border)] p-8 sm:p-12 print:p-6 flex justify-end">
          {/* Calculations */}
          <div className="w-full sm:w-1/2 space-y-3">
            {(() => {
              const gstItem = order.order_items?.find((i) =>
                i.snapshot_name.startsWith("GST ("),
              );
              const showSubtotal =
                order.discount_amount > 0 ||
                order.delivery_fee > 0 ||
                !!gstItem;
              return (
                <>
                  {showSubtotal && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--brand-text-muted)] font-bold uppercase tracking-wider">
                        Subtotal
                      </span>
                      <span className="font-bold text-[#000000]">
                        ₹
                        {order.subtotal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}

                  {order.discount_amount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--brand-text-muted)] font-bold uppercase tracking-wider">
                        Discount{" "}
                        {order.discount_type === "PERCENT"
                          ? `(${order.discount_value}%)`
                          : ""}
                      </span>
                      <span className="font-bold text-[var(--brand-primary)]">
                        -₹
                        {order.discount_amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}

                  {gstItem && (() => {
                    // Shown as CGST + SGST, half each.
                    const rate = parseFloat(gstItem.snapshot_name.replace(/[^0-9.]/g, "")) || 0;
                    const half = (gstItem.snapshot_price * gstItem.quantity) / 2;
                    return (["CGST", "SGST"] as const).map((k) => (
                      <div key={k} className="flex justify-between items-center text-sm">
                        <span className="text-[var(--brand-text-muted)] font-bold uppercase tracking-wider">
                          {k} @ {rate / 2}%
                        </span>
                        <span className="font-bold text-[#000000]">
                          ₹{half.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ));
                  })()}

                  {order.delivery_fee > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--brand-text-muted)] font-bold uppercase tracking-wider">
                        Delivery Fee
                      </span>
                      <span className="font-bold text-[#000000]">
                        ₹
                        {order.delivery_fee.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                </>
              );
            })()}

            <div className="border-t border-[var(--brand-border)] pt-4 mt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2">
              <span className="text-sm font-black text-[#1A1A1A] uppercase tracking-widest shrink-0">
                Total Amount
              </span>
              <span className="text-[28px] sm:text-3xl font-black text-[var(--brand-primary)] self-end sm:self-auto leading-none mt-1 sm:mt-0">
                ₹
                {order.grand_total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>

            {/* How it was paid */}
            <div className="pt-3 mt-1 border-t border-dashed border-[var(--brand-border)] space-y-1 text-xs">
              {(order.advance_paid ?? 0) > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-text-muted)] font-bold">Advance paid earlier{order.advance_order_id ? ` (${order.advance_order_id})` : ""}</span>
                    <span className="font-bold">₹{(order.advance_paid ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-text-muted)] font-bold">Balance paid</span>
                    <span className="font-bold">₹{(order.grand_total - (order.advance_paid ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--brand-text-muted)] font-bold">Paid by</span>
                <span className="font-bold text-right">
                  {describePayment({
                    mode: order.payment_mode ?? "CASH",
                    cash: order.split_cash ?? 0,
                    gpay: order.split_gpay ?? 0,
                    card: order.split_card ?? 0,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--brand-border)]/60 p-6 print:p-4 text-center bg-[var(--brand-bg)] flex flex-col items-center justify-center gap-1.5">
          <p className="text-xs font-bold text-[var(--brand-primary)] tracking-wider uppercase">
            Thank you for shopping!
          </p>
          <p className="text-[9px] font-bold text-[var(--brand-text-muted)]/80 uppercase tracking-[0.15em]">
            Powered by cenexa system @2026
          </p>
        </div>
      </div>
    </div>
  );
}
