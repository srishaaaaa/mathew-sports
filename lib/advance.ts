import "server-only";
import { supabaseAdmin as sb } from "@/lib/supabase";
import { BRANCH as POS1 } from "@/lib/branches/pos1";
import { BRANCH as POS2 } from "@/lib/branches/pos2";
import type { BranchId } from "@/lib/branches/types";
import { findCoupon } from "@/lib/coupons";
import {
  balanceDiscount,
  balanceDue,
  makePayment,
  round2,
  sumPayments,
  type AdvanceItem,
  type AdvanceOrder,
  type AdvancePayment,
  type AdvanceStatus,
  type PayMode,
  type PaymentMode,
} from "@/lib/payments";

// Advance orders: partial-payment holds, one table per branch. Deposits are
// not revenue; collecting the balance creates one normal invoice in that
// branch's orders table, which is when the sale counts in analytics.

const CFG = {
  pos1: { advance: "advance_orders", orders: "orders", rpc: "create_order", branch: POS1 },
  pos2: { advance: "pos2_advance_orders", orders: "pos2_orders", rpc: "pos2_create_order", branch: POS2 },
} as const;

const n = (v: unknown) => Number(v ?? 0) || 0;

function mapAdvance(r: Record<string, unknown>): AdvanceOrder {
  const payments = (Array.isArray(r.payments) ? r.payments : []) as AdvancePayment[];
  return {
    id: String(r.id),
    customer_name: String(r.customer_name || "Guest"),
    customer_phone: String(r.customer_phone || ""),
    source: r.source === "ONLINE" ? "ONLINE" : "OFFLINE",
    status: r.status as AdvanceStatus,
    items: ((Array.isArray(r.items) ? r.items : []) as AdvanceItem[]).map((i) => ({
      name: String(i.name),
      desc: String(i.desc || ""),
      price: n(i.price),
      qty: n(i.qty),
    })),
    subtotal: n(r.subtotal),
    discount_type: r.discount_type === "PERCENT" ? "PERCENT" : "FIXED",
    discount_value: n(r.discount_value),
    discount_amount: n(r.discount_amount),
    coupon_code: (r.coupon_code as string) ?? null,
    is_gst: Boolean(r.is_gst),
    gst_percentage: n(r.gst_percentage),
    gst_amount: n(r.gst_amount),
    delivery_fee: n(r.delivery_fee),
    total_amount: n(r.total_amount),
    deposit_amount: n(r.deposit_amount),
    payments: payments.map((p) => ({
      ...p,
      cash: n(p.cash),
      gpay: n(p.gpay),
      card: n(p.card),
      amount: n(p.amount),
      manual_discount: n(p.manual_discount),
      coupon_discount: n(p.coupon_discount),
    })),
    delivery_date: (r.delivery_date as string) ?? null,
    notes: (r.notes as string) ?? null,
    finalized_order_id: (r.finalized_order_id as string) ?? null,
    finalized_at: (r.finalized_at as string) ?? null,
    cancelled_at: (r.cancelled_at as string) ?? null,
    created_at: new Date(String(r.created_at)).toISOString(),
  };
}

export async function listAdvanceOrders(branch: BranchId): Promise<AdvanceOrder[]> {
  const { data, error } = await sb.from(CFG[branch].advance).select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapAdvance);
}

export async function getAdvanceOrder(branch: BranchId, id: string): Promise<AdvanceOrder | null> {
  const { data, error } = await sb.from(CFG[branch].advance).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapAdvance(data) : null;
}

const pad = (v: number, len: number) => String(v).padStart(len, "0");

async function newAdvanceId(branch: BranchId): Promise<string> {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000); // India date
  const day = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1, 2)}${pad(d.getUTCDate(), 2)}`;
  for (let i = 0; i < 20; i++) {
    const id = `${CFG[branch].branch.invoicePrefix}-DEP-${day}-${pad(Math.floor(Math.random() * 10000), 4)}`;
    const { data } = await sb.from(CFG[branch].advance).select("id").eq("id", id).maybeSingle();
    if (!data) return id;
  }
  throw new Error("Could not allocate an advance order number. Try again.");
}

async function newInvoiceId(branch: BranchId): Promise<string> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const year = new Date().getFullYear();
  for (let i = 0; i < 20; i++) {
    let s = "";
    for (let k = 0; k < 5; k++) s += chars[Math.floor(Math.random() * chars.length)];
    const id = `${CFG[branch].branch.invoicePrefix}-${year}-${s}`;
    const { data } = await sb.from(CFG[branch].orders).select("id").eq("id", id).maybeSingle();
    if (!data) return id;
  }
  throw new Error("Could not allocate an invoice number. Try again.");
}

export type CreateAdvanceInput = {
  customerName: string;
  customerPhone: string;
  source: "ONLINE" | "OFFLINE";
  items: AdvanceItem[];
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  couponCode: string | null;
  isGst: boolean;
  gstPercentage: number;
  deliveryFee: number;
  deposit: { mode: PaymentMode; split?: Partial<Record<PayMode, number>>; amount: number };
  deliveryDate: string | null;
  notes: string | null;
};

/** Books an advance order. All totals are recalculated here from the cart. */
export async function createAdvanceOrder(branch: BranchId, input: CreateAdvanceInput): Promise<AdvanceOrder> {
  const items = input.items
    .filter((i) => i.name?.trim() && n(i.price) > 0 && n(i.qty) > 0)
    .map((i) => ({ name: i.name.trim(), desc: (i.desc || "").trim(), price: round2(n(i.price)), qty: Math.round(n(i.qty)) }));
  if (items.length === 0) throw new Error("Add at least one item with a name and price.");

  const subtotal = round2(items.reduce((t, i) => t + i.price * i.qty, 0));
  const discountValue = Math.max(0, n(input.discountValue));
  const discountAmount = round2(
    Math.min(subtotal, input.discountType === "PERCENT" ? (subtotal * discountValue) / 100 : discountValue),
  );
  const taxable = Math.max(0, subtotal - discountAmount);
  const gstPct = input.isGst ? Math.max(0, n(input.gstPercentage)) : 0;
  const gstAmount = round2((taxable * gstPct) / 100);
  const deliveryFee = round2(Math.max(0, n(input.deliveryFee)));
  const total = round2(taxable + gstAmount + deliveryFee);

  const depositAmt = round2(n(input.deposit.amount));
  if (depositAmt <= 0) throw new Error("Deposit amount must be more than ₹0.");
  if (depositAmt > total) throw new Error("Deposit can't be more than the order total.");
  const payment = makePayment(input.deposit.mode, depositAmt, input.deposit.split);
  if (input.deposit.mode === "SPLIT" && Math.abs(payment.amount - depositAmt) > 0.01) {
    throw new Error("Split amounts must add up to the deposit.");
  }

  const id = await newAdvanceId(branch);
  const row = {
    id,
    customer_name: input.customerName.trim() || "Guest",
    customer_phone: input.customerPhone.replace(/\D/g, "").slice(0, 10),
    source: input.source,
    status: "PENDING",
    items,
    subtotal,
    discount_type: input.discountType,
    discount_value: discountValue,
    discount_amount: discountAmount,
    coupon_code: findCoupon(input.couponCode)?.code ?? null,
    is_gst: input.isGst,
    gst_percentage: gstPct,
    gst_amount: gstAmount,
    delivery_fee: deliveryFee,
    total_amount: total,
    deposit_amount: depositAmt,
    payments: [
      { ...payment, amount: depositAmt, kind: "DEPOSIT", at: new Date().toISOString(), manual_discount: 0, coupon_code: null, coupon_discount: 0 },
    ],
    delivery_date: input.deliveryDate || null,
    notes: input.notes?.trim() || null,
  };
  const { data, error } = await sb.from(CFG[branch].advance).insert(row).select("*").single();
  if (error) throw error;
  return mapAdvance(data);
}

export async function setAdvanceStatus(branch: BranchId, id: string, status: "PENDING" | "READY"): Promise<void> {
  const { error } = await sb.from(CFG[branch].advance).update({ status }).eq("id", id).in("status", ["PENDING", "READY"]);
  if (error) throw error;
}

export async function cancelAdvanceOrder(branch: BranchId, id: string): Promise<void> {
  const { error } = await sb
    .from(CFG[branch].advance)
    .update({ status: "CANCELLED", cancelled_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["PENDING", "READY"]);
  if (error) throw error;
}

export async function deleteAdvanceOrder(branch: BranchId, id: string): Promise<void> {
  const { error } = await sb.from(CFG[branch].advance).delete().eq("id", id);
  if (error) throw error;
}

export type FinalizeInput = {
  manual: { type: "PERCENT" | "FIXED"; value: number };
  couponCode: string | null;
  payment: { mode: PaymentMode; split?: Partial<Record<PayMode, number>> };
};

/**
 * Collects the balance: applies any discount given now, records the payment,
 * and creates the official invoice for the whole order (revenue = everything
 * actually collected: deposit + this payment).
 */
export async function finalizeAdvanceOrder(branch: BranchId, id: string, input: FinalizeInput) {
  const cfg = CFG[branch];
  const adv = await getAdvanceOrder(branch, id);
  if (!adv) throw new Error("Advance order not found.");
  if (adv.status === "COMPLETED" || adv.finalized_order_id) throw new Error("This advance order is already completed.");
  if (adv.status === "CANCELLED") throw new Error("This advance order was cancelled.");

  const due = balanceDue(adv);
  const coupon = findCoupon(input.couponCode);
  const disc = balanceDiscount(due, { type: input.manual.type, value: Math.max(0, n(input.manual.value)) }, coupon);
  const payment = makePayment(input.payment.mode, disc.payable, input.payment.split);
  if (input.payment.mode === "SPLIT" && Math.abs(payment.amount - disc.payable) > 0.01) {
    throw new Error("Split amounts must add up to the amount being collected.");
  }

  const balancePayment: AdvancePayment = {
    ...payment,
    amount: disc.payable,
    kind: "BALANCE",
    at: new Date().toISOString(),
    manual_discount: disc.manualAmt,
    coupon_code: coupon?.code ?? null,
    coupon_discount: disc.couponAmt,
  };
  const allPayments = [...adv.payments, balancePayment];
  const paid = sumPayments(allPayments);

  // Invoice figures. A discount given at collection comes off a GST-inclusive
  // amount, so its taxable part is total ÷ (1 + GST%).
  const gstRate = adv.is_gst ? adv.gst_percentage : 0;
  const balDisc = round2(disc.manualAmt + disc.couponAmt);
  const totalDiscount = round2(adv.discount_amount + balDisc / (1 + gstRate / 100));
  const taxable = round2(Math.max(0, adv.subtotal - totalDiscount));
  const grandTotal = round2(adv.deposit_amount + disc.payable); // what was actually collected
  const gstAmount = adv.is_gst ? round2(Math.max(0, grandTotal - adv.delivery_fee - taxable)) : 0;

  const modesUsed = (["cash", "gpay", "card"] as const).filter((k) => paid[k] > 0);
  const paymentMode: PaymentMode =
    modesUsed.length > 1 ? "SPLIT" : modesUsed[0] === "gpay" ? "GPAY" : modesUsed[0] === "card" ? "CARD" : "CASH";
  const discountIsPercent = balDisc === 0 && adv.discount_type === "PERCENT";

  const orderId = await newInvoiceId(branch);
  const { error: rpcError } = await sb.rpc(cfg.rpc, {
    payload: {
      id: orderId,
      customer_name: adv.customer_name,
      customer_phone: adv.customer_phone ? `${adv.customer_phone}_${paymentMode}` : `_${paymentMode}`,
      source: adv.source,
      status: "COMPLETED",
      subtotal: adv.subtotal,
      discount_type: discountIsPercent ? "PERCENT" : "FIXED",
      discount_value: discountIsPercent ? adv.discount_value : totalDiscount,
      discount_amount: totalDiscount,
      delivery_fee: adv.delivery_fee,
      grand_total: grandTotal,
      cash_received: grandTotal,
      created_at: balancePayment.at,
      payment_mode: paymentMode,
      split_cash: paid.cash,
      split_gpay: paid.gpay,
      split_card: paid.card,
      coupon_code: coupon?.code ?? adv.coupon_code,
      advance_order_id: adv.id,
      advance_paid: adv.deposit_amount,
      order_items: [
        ...adv.items.map((i) => ({ snapshot_name: i.name, snapshot_desc: i.desc, snapshot_price: i.price, quantity: i.qty })),
        ...(adv.is_gst && gstAmount > 0
          ? [{ snapshot_name: `GST (${adv.gst_percentage}%)`, snapshot_desc: "", snapshot_price: gstAmount, quantity: 1 }]
          : []),
      ],
    },
  });
  if (rpcError) throw rpcError;

  const { error } = await sb
    .from(cfg.advance)
    .update({ status: "COMPLETED", payments: allPayments, finalized_order_id: orderId, finalized_at: balancePayment.at })
    .eq("id", id)
    .is("finalized_order_id", null);
  if (error) throw error;

  return { orderId, amountCollected: disc.payable };
}
