// Coupon codes offered at billing and when collecting an advance-order balance.
export type Coupon = { code: string; label: string; type: "PERCENT" | "FIXED"; value: number };

export const COUPONS: Coupon[] = [
  { code: "WELCOME10", label: "WELCOME10 (10% Off)", type: "PERCENT", value: 10 },
  { code: "SUPERPOS", label: "SUPERPOS (₹100 Off)", type: "FIXED", value: 100 },
  { code: "FESTIVE15", label: "FESTIVE15 (15% Off)", type: "PERCENT", value: 15 },
];

export const findCoupon = (code: string | null | undefined) =>
  code ? COUPONS.find((c) => c.code === code) ?? null : null;
