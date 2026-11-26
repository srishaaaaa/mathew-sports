import { AtSign, Mail, MapPin, Phone, Store } from "lucide-react";
import { balanceDue, cgstSgst, modeLabel, sumPayments, type AdvanceOrder } from "@/lib/payments";
import type { ShopProfile } from "@/lib/shop";
import ReceiptToolbar from "./receipt-toolbar";

export type ReceiptFormat = "a4" | "a5" | "thermal58" | "thermal80";

export const parseFormat = (v: string | undefined): ReceiptFormat =>
  v === "a5" || v === "thermal58" || v === "thermal80" ? v : "a4";

const inr = (v: number) => "₹" + (v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (iso: string | null) =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const PAGE: Record<ReceiptFormat, { page: string; width: string }> = {
  a4: { page: "size: A4; margin: 12mm;", width: "max-w-[800px]" },
  a5: { page: "size: A5; margin: 8mm;", width: "max-w-[560px]" },
  thermal80: { page: "size: 80mm auto; margin: 0;", width: "w-[80mm]" },
  thermal58: { page: "size: 58mm auto; margin: 0;", width: "w-[58mm]" },
};

/** Advance receipt (deposit) — or, once paid in full, the final advance-order bill. */
export default function AdvanceReceipt({
  order: o,
  shop,
  format,
  invoiceBase,
}: {
  order: AdvanceOrder;
  shop: ShopProfile;
  format: ReceiptFormat;
  invoiceBase: string;
}) {
  const completed = o.status === "COMPLETED";
  const cancelled = o.status === "CANCELLED";
  const title = completed ? "Advance Order Bill" : cancelled ? "Cancelled Advance Order" : "Advance Receipt";
  const paid = sumPayments(o.payments);
  const balDiscounts = o.payments.reduce((t, p) => t + p.manual_discount + p.coupon_discount, 0);
  const due = completed || cancelled ? 0 : balanceDue(o);
  const g = cgstSgst(o.gst_percentage, o.gst_amount);
  const thermal = format.startsWith("thermal");

  const totals: [string, string][] = [
    ["Subtotal", inr(o.subtotal)],
    ...(o.discount_amount > 0
      ? [[o.coupon_code ? `Coupon ${o.coupon_code}` : `Discount${o.discount_type === "PERCENT" ? ` (${o.discount_value}%)` : ""}`, `− ${inr(o.discount_amount)}`] as [string, string]]
      : []),
    ...(o.is_gst
      ? ([
          [`CGST @ ${g.rate}%`, inr(g.amount)],
          [`SGST @ ${g.rate}%`, inr(g.amount)],
        ] as [string, string][])
      : []),
    ...(o.delivery_fee > 0 ? [["Delivery", inr(o.delivery_fee)] as [string, string]] : []),
  ];
  // [label, amount, detail line] — a split payment lists its parts underneath.
  const paymentLines: [string, string, string?][] = o.payments.flatMap((p) => {
    const rows: [string, string, string?][] = [];
    if (p.kind === "BALANCE") {
      if (p.manual_discount > 0) rows.push(["Discount at collection", `− ${inr(p.manual_discount)}`]);
      if (p.coupon_discount > 0) rows.push([`Coupon ${p.coupon_code}`, `− ${inr(p.coupon_discount)}`]);
    }
    const parts = [p.cash && `Cash ${inr(p.cash)}`, p.gpay && `UPI ${inr(p.gpay)}`, p.card && `Card ${inr(p.card)}`].filter(Boolean).join(" + ");
    rows.push([
      `${p.kind === "DEPOSIT" ? "Advance paid" : "Balance paid"} · ${modeLabel(p.mode)}`,
      inr(p.amount),
      p.mode === "SPLIT" ? parts : undefined,
    ]);
    return rows;
  });

  const contacts = [
    shop.shopPhone && { icon: <Store className="w-3 h-3" />, text: shop.shopPhone },
    shop.phone && { icon: <Phone className="w-3 h-3" />, text: shop.phone },
    shop.email && { icon: <Mail className="w-3 h-3" />, text: shop.email },
    shop.instagram && { icon: <AtSign className="w-3 h-3" />, text: shop.instagram.replace(/^@/, "") },
  ].filter(Boolean) as { icon: React.ReactNode; text: string }[];

  return (
    <div className={`min-h-screen bg-[#F4F4F2] print:bg-white py-8 print:py-0 px-4 print:px-0 flex flex-col items-center ${thermal ? "font-mono" : "font-sans"}`}>
      <style>{`@media print { @page { ${PAGE[format].page} } body { background: #fff !important; } }`}</style>
      <ReceiptToolbar format={format} />

      {thermal ? (
        /* ── Thermal roll ─────────────────────────────── */
        <div className={`${PAGE[format].width} bg-white text-black p-3 print:p-2 shadow-lg print:shadow-none ${format === "thermal58" ? "text-[10px]" : "text-[11px]"} leading-snug`}>
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shop.logoMark} alt="" className="w-14 h-14 mx-auto object-contain grayscale" />
            <p className="font-bold text-[1.25em] uppercase mt-1">{shop.shopName}</p>
            {shop.address && <p>{shop.address}</p>}
            {contacts.map((c) => <p key={c.text}>{c.text}</p>)}
          </div>
          <Dash />
          <p className="text-center font-bold uppercase">{title}</p>
          <p className="text-center">#{o.id}</p>
          <p>Date: {day(o.created_at)}</p>
          {o.delivery_date && <p>Delivery: {day(o.delivery_date)}</p>}
          <p>Status: {o.status}</p>
          <p>Customer: {o.customer_name}{o.customer_phone ? ` (${o.customer_phone})` : ""}</p>
          <Dash />
          {o.items.map((i, k) => (
            <div key={k}>
              <p className="font-bold">{i.name}</p>
              <TRow l={`  ${i.qty} x ${inr(i.price)}`} r={inr(i.price * i.qty)} />
            </div>
          ))}
          <Dash />
          {totals.map(([l, r]) => <TRow key={l} l={l} r={r} />)}
          <TRow l="ORDER TOTAL" r={inr(o.total_amount)} bold />
          <Dash />
          {paymentLines.map(([l, r, d], k) => <TRow key={k} l={l} r={r} d={d} />)}
          <TRow l={completed ? "TOTAL PAID" : "TOTAL PAID SO FAR"} r={inr(paid.amount)} bold />
          {!cancelled && <TRow l="BALANCE DUE" r={inr(due)} bold />}
          <Dash />
          {completed && o.finalized_order_id && <p className="text-center">Final invoice #{o.finalized_order_id}</p>}
          {!completed && !cancelled && <p className="text-center">Advance receipt — not a tax invoice. Balance payable on delivery.</p>}
          <p className="text-center mt-1">Thank you for shopping!</p>
        </div>
      ) : (
        /* ── A4 / A5 sheet ───────────────────────────── */
        <div className={`w-full ${PAGE[format].width} bg-white text-black rounded-2xl print:rounded-none border border-black/10 print:border-0 shadow-xl print:shadow-none ${format === "a5" ? "p-6 text-[11px]" : "p-10 text-sm"}`}>
          <div className="flex flex-wrap items-start justify-between gap-6 pb-5 border-b-2 border-[var(--brand-primary)]">
            <div className="flex items-start gap-4 min-w-0">
              <div className={`${format === "a5" ? "w-14 h-14" : "w-20 h-20"} rounded-xl overflow-hidden shrink-0 border border-black/10 print:[print-color-adjust:exact]`} style={{ backgroundColor: shop.logoBackground }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shop.logoMark} alt={`${shop.shopName} logo`} className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <h1 className={`${format === "a5" ? "text-lg" : "text-2xl"} font-black text-[var(--brand-primary-dark)] uppercase tracking-tight`}>{shop.shopName}</h1>
                {shop.ownerName && <p className="font-semibold text-black/70">{shop.ownerName}</p>}
                {shop.address && <p className="flex items-start gap-1 text-black/60 mt-0.5"><MapPin className="w-3 h-3 mt-0.5 shrink-0" />{shop.address}</p>}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-black/70">
                  {contacts.map((c) => (
                    <span key={c.text} className="flex items-center gap-1">{c.icon}{c.text}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className={`${format === "a5" ? "text-base" : "text-xl"} font-black uppercase text-[var(--brand-primary-dark)]`}>{title}</p>
              <p className="font-mono text-black/60">#{o.id}</p>
              <p className="mt-2 text-black/60">Date: <b className="text-black">{day(o.created_at)}</b></p>
              <p className="text-black/60">Status: <b className="text-black">{o.status}</b></p>
              {o.delivery_date && <p className="text-black/60">Delivery: <b className="text-black">{day(o.delivery_date)}</b></p>}
            </div>
          </div>

          <div className="py-4 border-b border-black/10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-black/45">Customer</p>
            <p className="font-bold">{o.customer_name}</p>
            {o.customer_phone && <p className="text-black/60">+91 {o.customer_phone}</p>}
          </div>

          <table className="w-full my-4">
            <thead>
              <tr className="border-b border-black/10 text-[10px] uppercase tracking-wider text-black/50">
                <th className="py-2 text-left w-8">#</th>
                <th className="py-2 text-left">Item description</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Rate (₹)</th>
                <th className="py-2 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((i, k) => (
                <tr key={k} className="border-b border-black/5">
                  <td className="py-2 text-black/50">{k + 1}</td>
                  <td className="py-2 font-semibold">
                    {i.name}
                    {i.desc && <span className="block text-[0.85em] font-normal text-black/50">{i.desc}</span>}
                  </td>
                  <td className="py-2 text-center">{i.qty}</td>
                  <td className="py-2 text-right font-mono">{i.price.toFixed(2)}</td>
                  <td className="py-2 text-right font-mono font-bold">{(i.price * i.qty).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-wrap justify-between gap-6 pt-2">
            <div className="flex-1 min-w-[200px] text-black/60">
              <p className="font-bold text-black/70">Please note:</p>
              {completed ? (
                <>
                  <p>• This advance order has been delivered and paid in full.</p>
                  {o.finalized_order_id && <p>• Final invoice: <a href={`${invoiceBase}/${o.finalized_order_id}`} className="underline">#{o.finalized_order_id}</a></p>}
                </>
              ) : cancelled ? (
                <p>• This advance order was cancelled.</p>
              ) : (
                <>
                  <p>• This is an advance-order deposit receipt, not a final tax invoice.</p>
                  <p>• The balance is payable on or before delivery/collection.</p>
                </>
              )}
              {o.notes && <p className="mt-2">Notes: {o.notes}</p>}
            </div>
            <div className="w-full sm:w-80 space-y-1.5">
              {totals.map(([l, r]) => <SRow key={l} l={l} r={r} />)}
              <SRow l="Order total" r={inr(o.total_amount)} bold />
              <div className="border-t border-black/10 my-1" />
              {paymentLines.map(([l, r, d], k) => <SRow key={k} l={l} r={r} d={d} />)}
              <div className="border-t-2 border-[var(--brand-primary)] pt-2 mt-2">
                {completed ? (
                  <>
                    <SRow l="TOTAL PAID" r={inr(paid.amount)} big />
                    {balDiscounts > 0 && <SRow l="Saved at collection" r={inr(balDiscounts)} />}
                    <SRow l="Balance due" r={inr(0)} />
                  </>
                ) : (
                  <SRow l={cancelled ? "Deposit received" : "BALANCE DUE"} r={inr(cancelled ? paid.amount : due)} big />
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-end mt-10 pt-4 border-t border-black/10 text-black/50">
            <p>Thank you for your visit! • {shop.shopName}</p>
            <div className="text-right">
              <div className="w-40 border-t border-black/30 mb-1" />
              <p className="font-bold text-black/70">Authorised signatory</p>
              <p>For {shop.shopName}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Dash = () => <div className="border-t border-dashed border-black my-1.5" />;

function TRow({ l, r, d, bold }: { l: string; r: string; d?: string; bold?: boolean }) {
  return (
    <div className={bold ? "font-bold" : ""}>
      <div className="flex justify-between gap-2">
        <span className="min-w-0">{l}</span>
        <span className="whitespace-nowrap">{r}</span>
      </div>
      {d && <p className="pl-2 text-[0.9em]">({d})</p>}
    </div>
  );
}

function SRow({ l, r, d, bold, big }: { l: string; r: string; d?: string; bold?: boolean; big?: boolean }) {
  return (
    <div className={big ? "text-lg font-black text-[var(--brand-primary-dark)]" : bold ? "font-black" : "text-black/70"}>
      <div className="flex justify-between items-baseline gap-3">
        <span>{l}</span>
        <span className="font-mono whitespace-nowrap">{r}</span>
      </div>
      {d && <p className="text-[0.82em] text-black/45 -mt-0.5">{d}</p>}
    </div>
  );
}
