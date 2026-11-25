"use server";

// Server actions for Matthew Sports (pos1). Every call is checked against the
// signed-in account: staff of this branch, or an admin.
import { requireBranch, requireAdmin, endSession } from "@/lib/session";
import * as db from "@/lib/db";
import type { StoredProduct, StoredOrder } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getThemeId, setThemeId } from "@/lib/settings";
import { BRANCH } from "@/lib/branches/pos1";

const requireStaff = () => requireBranch("pos1");

export async function logoutAction() {
  await endSession();
}

export async function listProductsAction() {
  await requireStaff();
  return db.getProducts();
}

export async function listOrdersAction() {
  await requireStaff();
  return db.getOrders();
}

export async function orderExistsAction(id: string) {
  await requireStaff();
  return db.orderExists(id);
}

export async function createProductAction(input: Omit<StoredProduct, "id">) {
  await requireAdmin();
  return db.addProduct(input);
}

export async function updateProductAction(id: string, input: Omit<StoredProduct, "id">) {
  await requireAdmin();
  return db.updateProduct(id, input);
}

export async function deleteProductAction(id: string) {
  await requireAdmin();
  return db.deleteProduct(id);
}

export async function createOrderAction(order: StoredOrder) {
  await requireStaff();
  await db.saveOrder(order);
  revalidatePath(`/invoice/${order.id}`);
}

export async function deleteOrderAction(id: string) {
  await requireAdmin();
  await db.deleteOrder(id);
  revalidatePath(`/invoice/${id}`);
}

// ── Branch settings (theme) ───────────────────────────────────────
// Reading is open: the theme also colours public invoices.
export async function getThemeAction() {
  return getThemeId("pos1");
}

export async function saveThemeAction(themeId: string) {
  await requireAdmin();
  if (!BRANCH.themes.some((t) => t.id === themeId)) throw new Error("Unknown theme");
  await setThemeId("pos1", themeId);
  revalidatePath("/", "layout");
}
