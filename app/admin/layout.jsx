import { redirect } from "next/navigation";
import { verifySession, getCurrentUser } from "@/lib/dal";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { InlineScript } from "@/components/InlineScript";
import { THEME_BOOTSTRAP } from "@/lib/dashboardTheme";
import { isAdminRole } from "@/lib/roles";
import "./admin.css";

const NAV = [
  {
    label: "Overview",
    items: [{ href: "/admin", icon: "📊", text: "Dashboard", title: "Dashboard" }],
  },
  {
    label: "Manage",
    items: [
      { href: "/admin/orders", icon: "💳", text: "Orders", title: "Orders" },
      { href: "/admin/products", icon: "💰", text: "Products", title: "Products" },
      { href: "/admin/tags", icon: "🏷️", text: "Tags", title: "Tags" },
      { href: "/admin/requests", icon: "📥", text: "Tag requests", title: "Tag requests" },
      { href: "/admin/fulfillment", icon: "📦", text: "Fulfillment", title: "Fulfillment" },
      { href: "/admin/users", icon: "👥", text: "Users", title: "Users" },
    ],
  },
  {
    label: "Configure",
    items: [{ href: "/admin/settings", icon: "⚙️", text: "Settings", title: "Settings" }],
  },
];

// Shown only to super admins. The page re-checks the role itself — this just
// keeps a link out of the sidebar for admins who would only be redirected.
const SUPERADMIN_NAV = {
  label: "Oversight",
  items: [
    { href: "/admin/visitors", icon: "👣", text: "Visitors", title: "Visitors" },
    { href: "/admin/activity", icon: "📜", text: "Activity log", title: "Activity log" },
  ],
};

// Guards every /admin route. The proxy already redirects non-admins, but this is
// the check that actually reads the session server-side — the proxy is only a
// first pass and must not be the sole gate.
export default async function AdminLayout({ children }) {
  const session = await verifySession();
  if (!isAdminRole(session.role)) redirect("/");

  const user = await getCurrentUser();
  const nav = session.role === "SUPERADMIN" ? [...NAV, SUPERADMIN_NAV] : NAV;

  return (
    <>
      <DashboardShell
        user={user}
        nav={nav}
        rootHref="/admin"
        searchHref="/admin/tags"
        searchPlaceholder="Search tags by code, name, phone…"
        statusText="Signed in as admin"
        areaLabel="Reach-Out admin"
      >
        {children}
      </DashboardShell>
      <InlineScript html={THEME_BOOTSTRAP} />
    </>
  );
}
