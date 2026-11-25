import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AdminPanel from "./admin-panel";

export const metadata: Metadata = {
  title: "Admin Panel · Matthew Sports & Vybe Girl",
};

export default async function AdminPage() {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/login?mode=admin");
  return <AdminPanel adminName={session.display_name || session.id} />;
}
