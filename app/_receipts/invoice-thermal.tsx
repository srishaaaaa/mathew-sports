import type { StoredOrder } from "@/lib/db";
import type { ShopProfile } from "@/lib/shop";
import { cgstSgst, describePayment } from "@/lib/payments";
import ReceiptToolbar from "./receipt-toolbar";
import type { ReceiptFormat } from "./advance-receipt";

const inr = (v: number) => "₹" + (v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** A normal bill on a 58 mm / 80 mm thermal roll. */
export default function InvoiceThermal({ order: o, shop, format }: { order: StoredOrder; shop: ShopProfile; format: ReceiptFormat }) {
  const gstLine = o.order_items.find((i) => i.snapshot_name.startsWith("GST ("));
  const items = o.order_items.filter((i) => !i.snapshot_name.startsWith("GST ("));
  const gstAmount = gstLine ? gstLine.snapshot_price * gstLine.quantity : 0;
  const gstRate = gstLine ? parseFloat(gstLine.snapshot_name.replace(/[^0-9.]/g, "")) || 0 : 0;
  const g = cgstSgst(gstRate, gstAmount);
  const phone = o.customer_phone.split("_")[0];
  const width = format === "thermal58" ? "w-[58mm] text-[10px]" : "w-[80mm] text-[11px]";
  const when = new Date(o.created_at);
  const contacts = [shop.shopPhone, shop.phone, shop.email, shop.instagram && `@${shop.instagram.replace(/^@/, "")}`].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#F4F4F2] print:bg-white py-8 print:py-0 px-4 print:px-0 flex flex-col items-center font-mono">
      <style>{`@media print { @page { size: ${format === "thermal58" ? "58mm" : "80mm"} auto; margin: 0; } body { background: #fff !important; } }`}</style>
      <ReceiptToolbar format={format} />
      <div className={`${width} bg-white text-black p-3 print:p-2 shadow-lg print:shadow-none leading-snug`}>
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shop.logoMark} alt="" className="w-14 h-14 mx-auto object-contain grayscale" />
          <p className="font-bold text-[1.25em] uppercase mt-1">{shop.shopName}</p>
          {shop.address && <p>{shop.address}</p>}
          {contacts.map((c) => <p key={c as string}>{c}</p>)}
        </div>
        <Dash />
        <p className="text-center font-bold uppercase">{gstLine ? "Tax Invoice" : "Invoice"}</p>
        <p className="text-center">#{o.id}</p>
        <p>Date: {when.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} {when.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
        <p>Customer: {o.customer_name}{phone ? ` (${phone})` : ""}</p>
        {o.advance_order_id && <p>Advance order: {o.advance_order_id}</p>}
        <Dash />
        {items.map((i, k) => (
          <div key={k}>
            <p className="font-bold">{i.snapshot_name}</p>
            <Row l={`  ${i.quantity} x ${inr(i.snapshot_price)}`} r={inr(i.snapshot_price * i.quantity)} />
          </div>
        ))}
        <Dash />
        <Row l="Subtotal" r={inr(o.subtotal)} />
        {o.discount_amount > 0 && <Row l={`Discount${o.discount_type === "PERCENT" ? ` (${o.discount_value}%)` : ""}`} r={`- ${inr(o.discount_amount)}`} />}
        {gstLine && (
          <>
            <Row l={`CGST @ ${g.rate}%`} r={inr(g.cgst)} />
            <Row l={`SGST @ ${g.rate}%`} r={inr(g.sgst)} />
          </>
        )}
        {o.delivery_fee > 0 && <Row l="Delivery" r={inr(o.delivery_fee)} />}
        <Row l="TOTAL" r={inr(o.grand_total)} bold />
        <Dash />
        {(o.advance_paid ?? 0) > 0 && (
          <>
            <Row l="Advance paid" r={inr(o.advance_paid ?? 0)} />
            <Row l="Balance paid" r={inr(o.grand_total - (o.advance_paid ?? 0))} />
          </>
        )}
        <p>Paid by: {describePayment({ mode: o.payment_mode ?? "CASH", cash: o.split_cash ?? 0, gpay: o.split_gpay ?? 0, card: o.split_card ?? 0 })}</p>
        <Dash />
        <p className="text-center">Thank you for shopping!</p>
      </div>
    </div>
  );
}

const Dash = () => <div className="border-t border-dashed border-black my-1.5" />;

function Row({ l, r, bold }: { l: string; r: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? "font-bold" : ""}`}>
      <span className="min-w-0">{l}</span>
      <span className="whitespace-nowrap">{r}</span>
    </div>
  );
}
