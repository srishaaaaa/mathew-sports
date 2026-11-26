import "server-only";
import { supabaseAdmin as sb } from "@/lib/supabase";
// POS 2 data layer — identical to lib/db.ts but reads/writes only the pos2_* tables.

// ── Types ─────────────────────────────────────────────────────────
export type StoredProduct = {
  id: string;
  name: string;
  description: string;
  default_price: number;
};

export type StoredOrderItem = {
  snapshot_name: string;
  snapshot_desc: string;
  snapshot_price: number;
  quantity: number;
};

export type StoredOrder = {
  id: string;
  customer_name: string;
  customer_phone: string;
  source: "ONLINE" | "OFFLINE";
  status: "COMPLETED" | "PENDING";
  subtotal: number;
  discount_type: "PERCENT" | "FIXED";
  discount_value: number;
  discount_amount: number;
  delivery_fee: number;
  grand_total: number;
  cash_received: number;
  created_at: string;
  order_items: StoredOrderItem[];
  // How it was paid (SPLIT spreads it across the split_* amounts).
  payment_mode?: "CASH" | "GPAY" | "CARD" | "SPLIT";
  split_cash?: number;
  split_gpay?: number;
  split_card?: number;
  coupon_code?: string | null;
  /** Set when this bill finalised an advance order; advance_paid = deposit taken earlier. */
  advance_order_id?: string | null;
  advance_paid?: number;
};

const num = (v: unknown) => Number(v ?? 0); // defensive: coerce numeric/int8 to JS number

// ── Products ──────────────────────────────────────────────────────
export async function getProducts(): Promise<StoredProduct[]> {
  const { data, error } = await sb
    .from("pos2_products")
    .select("id, name, description, default_price")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Error fetching products from DB:", error);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    default_price: num(r.default_price),
  }));
}

export async function addProduct(input: Omit<StoredProduct, "id">): Promise<StoredProduct> {
  const { data, error } = await sb
    .from("pos2_products")
    .insert({
      name: input.name,
      description: input.description,
      default_price: input.default_price,
    })
    .select("id, name, description, default_price")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    default_price: num(data.default_price),
  };
}

export async function updateProduct(
  id: string,
  input: Omit<StoredProduct, "id">,
): Promise<StoredProduct | null> {
  const { data, error } = await sb
    .from("pos2_products")
    .update({
      name: input.name,
      description: input.description,
      default_price: input.default_price,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, name, description, default_price")
    .maybeSingle();
  if (error) throw error;
  return data
    ? {
        id: data.id,
        name: data.name,
        description: data.description,
        default_price: num(data.default_price),
      }
    : null;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await sb.from("pos2_products").delete().eq("id", id);
  if (error) throw error;
}

// ── Orders ────────────────────────────────────────────────────────
const ORDER_SELECT = `
  id, customer_name, customer_phone, source, status, subtotal,
  discount_type, discount_value, discount_amount, delivery_fee,
  grand_total, cash_received, created_at,
  payment_mode, split_cash, split_gpay, split_card, coupon_code, advance_order_id, advance_paid,
  order_items:pos2_order_items ( snapshot_name, snapshot_desc, snapshot_price, quantity, position )`;

const mapOrder = (o: any): StoredOrder => ({
  id: o.id,
  customer_name: o.customer_name || "Guest",
  customer_phone: o.customer_phone || "",
  source: o.source,
  status: o.status,
  subtotal: num(o.subtotal),
  discount_type: o.discount_type,
  discount_value: num(o.discount_value),
  discount_amount: num(o.discount_amount),
  delivery_fee: num(o.delivery_fee),
  grand_total: num(o.grand_total),
  cash_received: num(o.cash_received),
  created_at: new Date(o.created_at).toISOString(),
  payment_mode: o.payment_mode || "CASH",
  split_cash: num(o.split_cash),
  split_gpay: num(o.split_gpay),
  split_card: num(o.split_card),
  coupon_code: o.coupon_code ?? null,
  advance_order_id: o.advance_order_id ?? null,
  advance_paid: num(o.advance_paid),
  order_items: [...(o.order_items ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((i: any) => ({
      snapshot_name: i.snapshot_name,
      snapshot_desc: i.snapshot_desc || "",
      snapshot_price: num(i.snapshot_price),
      quantity: Number(i.quantity),
    })),
});

export async function getOrders(): Promise<StoredOrder[]> {
  const { data, error } = await sb
    .from("pos2_orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching orders from DB:", error);
    return [];
  }
  return (data ?? []).map(mapOrder);
}

export async function getOrder(id: string): Promise<StoredOrder | null> {
  const { data, error } = await sb
    .from("pos2_orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error(`Error fetching order ${id} from DB:`, error);
    return null;
  }
  return data ? mapOrder(data) : null;
}

export async function orderExists(id: string): Promise<boolean> {
  const { data, error } = await sb
    .from("pos2_orders")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

export async function saveOrder(order: StoredOrder): Promise<void> {
  // Atomic via the SQL RPC function (order + items in one transaction).
  const { error } = await sb.rpc("pos2_create_order", { payload: order });
  if (error) throw error;
}

export async function deleteOrder(id: string): Promise<void> {
  // order_items is ON DELETE CASCADE, so this clears the invoice everywhere.
  const { error } = await sb.from("pos2_orders").delete().eq("id", id);
  if (error) throw error;
}
