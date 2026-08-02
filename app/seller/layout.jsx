import { redirect } from "next/navigation";
import { verifySession, getCurrentUser } from "@/lib/dal";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { InlineScript } from "@/components/InlineScript";
import { THEME_BOOTSTRAP } from "@/lib/dashboardTheme";
// The seller dashboard is the same design system as admin, not Tailwind — see
// the note at the top of admin.css.
import "../admin/admin.css";

const NAV = [
  {
    label: "Overview",
    items: [{ href: "/seller", icon: "📊", text: "Dashboard", title: "Dashboard" }],
  },
  {
    label: "My stock",
    items: [
      { href: "/seller/tags", icon: "🏷️", text: "My tags", title: "My tags" },
      { href: "/seller/requests", icon: "📥", text: "Tag requests", title: "Tag requests" },
    ],
  },
];

// Guards every /seller route. Same double-check as the admin layout: the proxy
// is a first pass only, and Server Actions bypass it entirely.
export default async function SellerLayout({ children }) {
  const session = await verifySession();
  if (session.role !== "SALES") redirect("/");

  const user = await getCurrentUser();

  return (
    <>
      <DashboardShell
        user={user}
        nav={NAV}
        rootHref="/seller"
        searchHref="/seller/tags"
        searchPlaceholder="Search your tags by code…"
        statusText="Signed in as seller"
        areaLabel="Reach-Out seller"
      >
        {children}
      </DashboardShell>
      <InlineScript html={THEME_BOOTSTRAP} />
    </>
  );
}
