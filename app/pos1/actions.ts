"use server";

// Server actions for Matthew Sports (pos1). Every call is checked against the
// signed-in account: staff of this branch, or an admin.
import { requireBranch, requireAdmin, endSession } from "@/lib/session";
import * as db from "@/lib/db";
import type { StoredProduct, StoredOrder } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getThemeId, setThemeId } from "@/lib/settings";
import { BRANCH } from "@/lib/branches/pos1";
import * as adv from "@/lib/advance";
import * as shop from "@/lib/shop";

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

// ── Advance orders (partial-payment holds) ────────────────────────
// Staff can book, mark ready and collect balances; only admins cancel or delete.
export async function listAdvanceOrdersAction() {
  await requireStaff();
  return adv.listAdvanceOrders("pos1");
}

export async function createAdvanceOrderAction(input: adv.CreateAdvanceInput) {
  await requireStaff();
  return adv.createAdvanceOrder("pos1", input);
}

export async function setAdvanceStatusAction(id: string, status: "PENDING" | "READY") {
  await requireStaff();
  await adv.setAdvanceStatus("pos1", id, status);
}

export async function finalizeAdvanceOrderAction(id: string, input: adv.FinalizeInput) {
  await requireStaff();
  const result = await adv.finalizeAdvanceOrder("pos1", id, input);
  revalidatePath(`/advance/${id}`);
  return result;
}

export async function cancelAdvanceOrderAction(id: string) {
  await requireAdmin();
  await adv.cancelAdvanceOrder("pos1", id);
}

export async function deleteAdvanceOrderAction(id: string) {
  await requireAdmin();
  await adv.deleteAdvanceOrder("pos1", id);
}

// ── Store details (Settings → Store details) ──────────────────────
export async function getShopProfileAction() {
  return shop.getShopProfile("pos1");
}

export async function getShopOverridesAction() {
  await requireAdmin();
  return shop.getProfileOverrides("pos1");
}

export async function saveShopProfileAction(overrides: shop.ProfileOverrides) {
  await requireAdmin();
  await shop.saveProfileOverrides("pos1", overrides);
  revalidatePath("/", "layout");
  return shop.getShopProfile("pos1");
}
