import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/session";

// Send everyone to the right place: admins to the admin panel, staff to
// their branch's terminal, everyone else to the login page.
export default async function Home() {
  const session = await getSession();
  redirect(session ? homeFor(session) : "/login");
}
