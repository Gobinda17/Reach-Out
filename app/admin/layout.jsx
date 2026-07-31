import { redirect } from "next/navigation";
import { verifySession, getCurrentUser } from "@/lib/dal";
import { AdminShell } from "@/components/admin/AdminShell";
import "./admin.css";

// Guards every /admin route. The proxy already redirects non-admins, but this is
// the check that actually reads the session server-side — the proxy is only a
// first pass and must not be the sole gate.
export default async function AdminLayout({ children }) {
  const session = await verifySession();
  if (session.role !== "ADMIN") redirect("/");

  const user = await getCurrentUser();

  return <AdminShell user={user}>{children}</AdminShell>;
}
