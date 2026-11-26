import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdvanceOrder } from "@/lib/advance";
import { getShopProfile } from "@/lib/shop";
import { getThemeId } from "@/lib/settings";
import { BRANCH } from "@/lib/branches/pos2";
import { resolveTheme, themeCss } from "@/lib/branches/types";
import AdvanceReceipt, { parseFormat } from "@/app/_receipts/advance-receipt";

// Vybe Girl (POS 2) advance receipt / final bill. ?format=a4|a5|thermal58|thermal80
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Advance ${id}` };
}

export default async function AdvanceReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ format?: string }>;
}) {
  const [{ id }, { format }] = await Promise.all([params, searchParams]);
  const [order, shop, themeId] = await Promise.all([getAdvanceOrder("pos2", id), getShopProfile("pos2"), getThemeId("pos2")]);
  if (!order) notFound();
  return (
    <>
      <style>{themeCss(resolveTheme(BRANCH, themeId))}</style>
      <AdvanceReceipt order={order} shop={shop} format={parseFormat(format)} invoiceBase="/pos2/invoice" />
    </>
  );
}
