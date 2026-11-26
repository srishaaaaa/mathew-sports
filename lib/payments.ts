// Payment modes, split payments and advance-order maths. Shared by the
// server and the terminals (no server-only imports).

export type PayMode = "CASH" | "GPAY" | "CARD";
export type PaymentMode = PayMode | "SPLIT";

export const PAY_MODES: PayMode[] = ["CASH", "GPAY", "CARD"];

export const modeLabel = (m: PaymentMode | string) =>
  m === "GPAY" ? "QR / GPay" : m === "CARD" ? "Card" : m === "SPLIT" ? "Split" : "Cash";

/** One payment, possibly spread across several modes. */
export type Payment = {
  mode: PaymentMode;
  cash: number;
  gpay: number;
  card: number;
  /** Amount actually applied to the bill (never more than what was due). */
  amount: number;
};

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Builds a Payment for `due` from a single mode or split parts. */
export function makePayment(mode: PaymentMode, due: number, split?: Partial<Record<PayMode, number>>): Payment {
  if (mode !== "SPLIT") {
    return {
      mode,
      cash: mode === "CASH" ? due : 0,
      gpay: mode === "GPAY" ? due : 0,
      card: mode === "CARD" ? due : 0,
      amount: round2(due),
    };
  }
  const cash = round2(Math.max(0, split?.CASH ?? 0));
  const gpay = round2(Math.max(0, split?.GPAY ?? 0));
  const card = round2(Math.max(0, split?.CARD ?? 0));
  return { mode, cash, gpay, card, amount: round2(cash + gpay + card) };
}

export function describePayment(p: Pick<Payment, "mode" | "cash" | "gpay" | "card">): string {
  if (p.mode !== "SPLIT") return modeLabel(p.mode);
  const parts = [
    p.cash ? `Cash ₹${p.cash.toFixed(2)}` : "",
    p.gpay ? `UPI ₹${p.gpay.toFixed(2)}` : "",
    p.card ? `Card ₹${p.card.toFixed(2)}` : "",
  ].filter(Boolean);
  return `Split (${parts.join(" + ")})`;
}

// ── Advance orders ─────────────────────────────────────────────────
export type AdvanceStatus = "PENDING" | "READY" | "COMPLETED" | "CANCELLED";

export type AdvanceItem = { name: string; desc: string; price: number; qty: number };

export type AdvancePayment = Payment & {
  kind: "DEPOSIT" | "BALANCE";
  at: string;
  /** Discount given when this payment was taken (balance only). */
  manual_discount: number;
};

export type AdvanceOrder = {
  id: string;
  customer_name: string;
  customer_phone: string;
  source: "ONLINE" | "OFFLINE";
  status: AdvanceStatus;
  items: AdvanceItem[];
  subtotal: number;
  discount_type: "PERCENT" | "FIXED";
  discount_value: number;
  discount_amount: number;
  is_gst: boolean;
  gst_percentage: number;
  gst_amount: number;
  delivery_fee: number;
  total_amount: number;
  deposit_amount: number;
  payments: AdvancePayment[];
  delivery_date: string | null;
  notes: string | null;
  finalized_order_id: string | null;
  finalized_at: string | null;
  cancelled_at: string | null;
  created_at: string;
};

export const balanceDue = (a: Pick<AdvanceOrder, "total_amount" | "deposit_amount">) =>
  round2(Math.max(0, a.total_amount - a.deposit_amount));

/** Manual discount given at balance time, applied to the amount still payable. */
export function balanceDiscount(due: number, manual: { type: "PERCENT" | "FIXED"; value: number }) {
  const manualAmt = Math.max(0, round2(Math.min(due, manual.type === "PERCENT" ? (due * manual.value) / 100 : manual.value)));
  return { manualAmt, payable: round2(Math.max(0, due - manualAmt)) };
}

/** Totals across all payments on an advance order, per mode. */
export function sumPayments(payments: Pick<Payment, "cash" | "gpay" | "card" | "amount">[]) {
  return payments.reduce(
    (t, p) => ({
      cash: round2(t.cash + p.cash),
      gpay: round2(t.gpay + p.gpay),
      card: round2(t.card + p.card),
      amount: round2(t.amount + p.amount),
    }),
    { cash: 0, gpay: 0, card: 0, amount: 0 },
  );
}

/**
 * CGST/SGST split of a GST amount: half the rate each; CGST is rounded and
 * SGST takes the remainder so the two always add up to the GST total.
 */
export const cgstSgst = (gstPercentage: number, gstAmount: number) => {
  const cgst = round2(gstAmount / 2);
  return { rate: round2(gstPercentage / 2), cgst, sgst: round2(gstAmount - cgst) };
};
