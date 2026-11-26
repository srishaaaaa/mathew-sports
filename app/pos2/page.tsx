import { redirect } from "next/navigation";
import { canUseBranch, getSession } from "@/lib/session";
import TerminalLoader from "@/app/_terminals/loader";
import { getShopProfile } from "@/lib/shop";

// Vybe Girl billing terminal. Staff of this branch or an admin only.
export default async function POS2Page() {
  const session = await getSession();
  if (!canUseBranch(session, "pos2")) redirect("/login?branch=pos2");
  const shop = await getShopProfile("pos2");
  return (
    <TerminalLoader branch="pos2" role={session!.role} userName={session!.display_name || session!.id} shop={shop} />
  );
}
