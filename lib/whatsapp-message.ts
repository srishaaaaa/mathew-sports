// WhatsApp message text for bills and advance orders — the full split-up:
// items, subtotal, manual discount, GST % and amount with CGST/SGST,
// delivery, total, and how it was paid (each part of a split).
import { balanceDue, cgstSgst, modeLabel, sumPayments, type AdvanceOrder, type PaymentMode } from "@/lib/payments";

const E = {
  shop: "✨",
  check: "✅",
  bill: "🧾",
  bag: "🛍️",
  money: "💰",
  card: "💳",
  link: "📦",
  clock: "⏳",
  cal: "📅",
};

const rs = (v: number) => "₹" + (v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Item = { name: string; qty: number; price: number };

function chargesBlock(c: {
  items: Item[];
  subtotal: number;
  discount: number;
  discountType?: "PERCENT" | "FIXED";
  discountValue?: number;
  gstPercentage: number;
  gstAmount: number;
  deliveryFee: number;
}): string[] {
  const lines = [`${E.bag} *Items*`];
  for (const i of c.items) lines.push(`• ${i.name} × ${i.qty} — ${rs(i.price * i.qty)}`);
  lines.push("", `*Subtotal:* ${rs(c.subtotal)}`);
  if (c.discount > 0) {
    lines.push(`*Manual Discount${c.discountType === "PERCENT" && c.discountValue ? ` (${c.discountValue}%)` : ""}:* -${rs(c.discount)}`);
  }
  if (c.gstAmount > 0) {
    const g = cgstSgst(c.gstPercentage, c.gstAmount);
    lines.push(`*GST (${c.gstPercentage}%):* ${rs(c.gstAmount)}`);
    lines.push(`   • CGST (${g.rate}%): ${rs(g.cgst)}`);
    lines.push(`   • SGST (${g.rate}%): ${rs(g.sgst)}`);
  }
  if (c.deliveryFee > 0) lines.push(`*Delivery Charges:* ${rs(c.deliveryFee)}`);
  return lines;
}

function paymentLines(p: { mode: PaymentMode; cash: number; gpay: number; card: number }, label = "Payment Mode"): string[] {
  const lines = [`${E.card} *${label}:* ${modeLabel(p.mode)}`];
  if (p.mode === "SPLIT") {
    if (p.cash) lines.push(`   • Cash: ${rs(p.cash)}`);
    if (p.gpay) lines.push(`   • QR / GPay (UPI): ${rs(p.gpay)}`);
    if (p.card) lines.push(`   • Card: ${rs(p.card)}`);
  }
  return lines;
}

/** A completed bill (sale, or the invoice that completed an advance order). */
export function billMessage(b: {
  shopName: string;
  id: string;
  isGst: boolean;
  items: Item[];
  subtotal: number;
  discount: number;
  discountType?: "PERCENT" | "FIXED";
  discountValue?: number;
  gstPercentage: number;
  gstAmount: number;
  deliveryFee: number;
  grandTotal: number;
  paymentMode: PaymentMode;
  split?: { cash: number; gpay: number; card: number };
  /** Cash handed over (shows change returned when more than the total). */
  amountReceived?: number;
  advancePaid?: number;
  advanceOrderId?: string | null;
  link: string;
}): string {
  const lines = [
    `${E.shop} *${b.shopName}* ${E.shop}`,
    "",
    `${E.check} Here are your ${b.isGst ? "GST invoice" : "bill"} details!`,
    `${E.bill} *${b.isGst ? "Tax Invoice" : "Invoice"}:* ${b.id}`,
    "",
    ...chargesBlock(b),
    "",
    `${E.money} *Total Amount:* ${rs(b.grandTotal)}`,
    "",
  ];
  if (b.advancePaid && b.advancePaid > 0) {
    lines.push(`*Advance Paid Earlier${b.advanceOrderId ? ` (${b.advanceOrderId})` : ""}:* ${rs(b.advancePaid)}`);
    lines.push(`*Balance Paid:* ${rs(b.grandTotal - b.advancePaid)}`);
  }
  const split = b.split ?? { cash: 0, gpay: 0, card: 0 };
  lines.push(...paymentLines({ mode: b.paymentMode, ...split }));
  if (b.paymentMode === "CASH" && b.amountReceived && b.amountReceived > b.grandTotal) {
    lines.push(`   • Amount Received: ${rs(b.amountReceived)}`, `   • Change Returned: ${rs(b.amountReceived - b.grandTotal)}`);
  }
  lines.push("", `${E.link} View and download your detailed digital receipt here:`, b.link);
  return lines.join("\n");
}

/** An advance order: booked (deposit) or completed (paid in full). */
export function advanceMessage(o: AdvanceOrder, shopName: string, link: string, invoiceId?: string | null): string {
  const completed = o.status === "COMPLETED" || Boolean(invoiceId);
  const paid = sumPayments(o.payments);
  const lines = [
    `${E.shop} *${shopName}* ${E.shop}`,
    "",
    completed
      ? `${E.check} Your advance order is paid in full. Thank you!`
      : `${E.check} Your advance order is confirmed!`,
    `${E.bill} *Advance Order:* ${o.id}`,
  ];
  if (invoiceId ?? o.finalized_order_id) lines.push(`${E.bill} *Invoice:* ${invoiceId ?? o.finalized_order_id}`);
  if (o.delivery_date) lines.push(`${E.cal} *Delivery:* ${new Date(`${o.delivery_date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`);
  lines.push(
    "",
    ...chargesBlock({
      items: o.items,
      subtotal: o.subtotal,
      discount: o.discount_amount,
      discountType: o.discount_type,
      discountValue: o.discount_value,
      gstPercentage: o.is_gst ? o.gst_percentage : 0,
      gstAmount: o.is_gst ? o.gst_amount : 0,
      deliveryFee: o.delivery_fee,
    }),
    "",
    `${E.money} *Order Total:* ${rs(o.total_amount)}`,
    "",
  );
  for (const p of o.payments) {
    if (p.kind === "BALANCE" && p.manual_discount > 0) lines.push(`*Discount at Collection:* -${rs(p.manual_discount)}`);
    lines.push(`*${p.kind === "DEPOSIT" ? "Advance Paid" : "Balance Paid"}:* ${rs(p.amount)}`);
    lines.push(...paymentLines(p, "Paid By").map((l) => "   " + l));
  }
  lines.push(`*Total Paid:* ${rs(paid.amount)}`);
  if (!completed && o.status !== "CANCELLED") lines.push(`${E.clock} *Balance Due:* ${rs(balanceDue(o))}`);
  lines.push("", `${E.link} View your receipt here:`, link);
  return lines.join("\n");
}
