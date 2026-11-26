import { redirect } from "next/navigation";
import { canUseBranch, getSession } from "@/lib/session";
import TerminalLoader from "@/app/_terminals/loader";
import { getShopProfile } from "@/lib/shop";

// Matthew Sports billing terminal. Staff of this branch or an admin only.
export default async function POS1Page() {
  const session = await getSession();
  if (!canUseBranch(session, "pos1")) redirect("/login?branch=pos1");
  const shop = await getShopProfile("pos1");
  return (
    <TerminalLoader branch="pos1" role={session!.role} userName={session!.display_name || session!.id} shop={shop} />
  );
}
